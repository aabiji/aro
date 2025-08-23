package main

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// server and routes
type Server struct {
	db      *gorm.DB
	secrets map[string]string
}

func NewServer() (Server, error) {
	var err error
	server := Server{}
	server.secrets, err = loadEnvVars(".env")

	server.db, err = gorm.Open(sqlite.Open("database.db"), &gorm.Config{})
	if err != nil {
		return Server{}, err
	}

	err = server.db.AutoMigrate(&User{}, &Workout{}, &Exercise{},
		&Settings{}, &Tag{}, &TaggedDate{})
	if err != nil {
		return Server{}, err
	}

	return server, err
}

type AuthInfo struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (s *Server) GetUser(id uint64) *User {
	var user User
	result := s.db.First(&user, id)
	if result.Error != nil {
		return nil
	}
	return &user
}

func (s *Server) Login(c *gin.Context) {
	var req AuthInfo
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user User
	result := s.db.Where(&User{Email: req.Email, Password: req.Password}).First(&user)
	if result.Error != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Account not found"})
		return
	}

	token, err := createToken(fmt.Sprintf("%d", user.ID), s.secrets["JWT_SECRET"])
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Couldn't create the jwt"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"jwt": token})
}

func (s *Server) Signup(c *gin.Context) {
	var req AuthInfo
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var existing User
	result := s.db.Where(&User{Email: req.Email}).First(&existing)
	if result.Error == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Account already exists"})
		return
	}

	user := User{Email: req.Email, Password: req.Password}
	if result := s.db.Create(&user); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creating user"})
		return
	}

	settings := Settings{UserID: user.ID, ImperialUnits: true}
	if err := s.db.Create(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creating settings"})
		return
	}

	token, err := createToken(fmt.Sprintf("%d", user.ID), s.secrets["JWT_SECRET"])
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Coudln't create the JWT"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"jwt": token})
}

func (s *Server) GetUserInfo(c *gin.Context) {
	var fullUser User
	user := c.MustGet("user").(*User)

	r := s.db.Preload("Settings").
		Preload("Workouts.Exercises").
		Preload("TaggedDates.Tags").
		First(&fullUser, user.ID)
	if r.Error != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to get user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": fullUser})
}

type SettingsInfo struct {
	ImperialUnits bool `json:"use_imperial"`
}

func (s *Server) UpdateUserSettings(c *gin.Context) {
	var req SettingsInfo
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var fullUser User
	user := c.MustGet("user").(*User)
	if s.db.Preload("Settings").First(&fullUser, user.ID).Error != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to get user"})
		return
	}

	fullUser.Settings.ImperialUnits = req.ImperialUnits
	if err := s.db.Save(&fullUser.Settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update settings"})
		return
	}

	c.JSON(http.StatusOK, gin.H{})
}

func (s *Server) DeleteUser(c *gin.Context) {
	user := c.MustGet("user").(*User)

	// get all workout ids
	subQuery := s.db.Model(&Workout{}).Select("id").Where("user_id = ?", user.ID)

	if err := s.db.Where("workout_id IN (?)", subQuery).Delete(&Exercise{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete exercises"})
		return
	}

	if err := s.db.Where(&Workout{UserID: user.ID}).Delete(&Workout{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete workouts"})
		return
	}

	if err := s.db.Where(&Settings{UserID: user.ID}).Delete(&Settings{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete settings"})
		return
	}

	if err := s.db.Delete(&User{}, user.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{})
}

type ExerciseInfo struct {
	Id           int    `json:"id,omitempty"`
	Name         string `json:"name"`
	ExerciseType int    `json:"exercise_type"`
	Reps         []int  `json:"reps,omitempty"`
	Weight       int    `json:"weight,omitempty"`
	Distance     int    `json:"distance,omitempty"`
	Duration     int    `json:"duration,omitempty"`
}

type WorkoutInfo struct {
	Id        int            `json:"id,omitempty"`
	Exercises []ExerciseInfo `json:"exercises"`
	Template  bool           `json:"isTemplate"`
	Tag       string         `json:"tag"`
}

func (s *Server) CreateWorkout(c *gin.Context) {
	var req WorkoutInfo
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user := c.MustGet("user").(*User)
	workout := Workout{UserID: user.ID, Template: req.Template, Tag: req.Tag}

	for _, exercise := range req.Exercises {
		workout.Exercises = append(workout.Exercises, Exercise{
			Name:         exercise.Name,
			ExerciseType: exercise.ExerciseType,
			Weight:       exercise.Weight,
			Duration:     exercise.Duration,
			Distance:     exercise.Distance,
			Reps:         datatypes.NewJSONSlice(exercise.Reps),
		})
	}

	if result := s.db.Create(&workout); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creating workout"})
		return
	}

	var fullWorkout Workout
	if err := s.db.Preload("Exercises").First(&fullWorkout, workout.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load workout"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"workout": fullWorkout})
}

func (s *Server) DeleteWorkout(c *gin.Context) {
	idInt, err := strconv.ParseUint(c.Param("id"), 10, strconv.IntSize)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workout id"})
		return
	}
	id := uint(idInt)
	user := c.MustGet("user").(*User)

	// verify workout exists and belongs to the user
	var workout Workout
	if err := s.db.Where("id = ? AND user_id = ?", id, user.ID).First(&workout).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workout not found"})
		return
	}

	// delete exercises
	if err := s.db.Where("workout_id = ?", workout.ID).Delete(&Exercise{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error deleting exercises"})
		return
	}

	// delete workout
	if err := s.db.Delete(&workout).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error deleting workout"})
		return
	}

	c.JSON(http.StatusOK, gin.H{})
}

type TagInfo struct {
	Id    int    `json:"id,omitempty"`
	Name  string `json:"name"`
	Color string `json:"color"`
}

func (s *Server) SetTag(c *gin.Context) {
	var req TagInfo
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user := c.MustGet("user").(*User)
	tag := Tag{
		BaseModel: BaseModel{ID: uint(req.Id)},
		UserID:    user.ID, Name: req.Name, Color: req.Color}

	if result := s.db.Save(&tag); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creating/updating tag"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tag": tag})
}

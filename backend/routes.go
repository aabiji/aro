package main

import (
	"fmt"
	"strconv"

	"net/http"

	"github.com/gin-gonic/gin"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// database models
type User struct {
	gorm.Model
	Email    string
	Password string
	Settings Settings
	Workouts []Workout
}

type Workout struct {
	gorm.Model
	UserId    uint
	Template  bool
	Tag       string // name or date
	Exercises []Exercise
}

type Exercise struct {
	gorm.Model
	Name         string
	ExerciseType int
	Reps         []int
	Weight       int
	Duration     int
	Distance     int
}

type Settings struct {
	gorm.Model
	ImperialUnits bool
}

// server and routes
type Server struct {
	db      *gorm.DB
	secrets map[string]string
}

func NewServer() (Server, error) {
	var err error
	server := Server{}

	server.db, err = gorm.Open(sqlite.Open("database.db"), &gorm.Config{})
	if err != nil {
		return Server{}, err
	}

	server.db.AutoMigrate(&User{}, &Workout{}, &Exercise{}, &Settings{})

	server.secrets, err = loadEnvVars(".env")
	return server, err
}

type AuthInfo struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (s *Server) GetUser(query *User) *User {
	var user *User
	result := s.db.Where(query).First(user)
	if result.Error != nil {
		return nil
	}
	return user
}

func (s *Server) HandleLogin(c *gin.Context) {
	var req AuthInfo
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user := s.GetUser(&User{Email: req.Email, Password: req.Password})
	if user == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User not found"})
		return
	}

	token, err := createToken(fmt.Sprintf("%d", user.ID), s.secrets["JWT_SECRET"])
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Coudln't create the JWT"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"jwt": token})
}

func (s *Server) HandleSignup(c *gin.Context) {
	var req AuthInfo
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user := User{
		Email:    req.Email,
		Password: req.Password,
		Settings: Settings{ImperialUnits: true},
		Workouts: []Workout{},
	}
	if result := s.db.Create(&user); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error creating user"})
		return
	}

	token, err := createToken(fmt.Sprintf("%d", user.ID), s.secrets["JWT_SECRET"])
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Coudln't create the JWT"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"jwt": token})
}

type ExerciseInfo struct {
	Id           int    `json:"id,omitempty"`
	Name         string `json:"name"`
	ExerciseType int    `json:"exercise_type"`
	Reps         []int  `json:"reps,omitempty"`
	Weight       int    `json:"weight,omitempty"`
	Distance     int    `json:"distance"`
	Duration     int    `json:"duration"`
}

type WorkoutInfo struct {
	Id        int            `json:"id,omitempty"`
	Exercises []ExerciseInfo `json:"exercises"`
	Template  bool           `json:"is_template"`
	Tag       string         `json:"tag"`
}

func (s *Server) HandleCreateWorkout(c *gin.Context) {
	userId, _ := c.Get("userId")

	var req WorkoutInfo
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	workout := Workout{UserId: userId.(uint), Template: req.Template, Tag: req.Tag}
	for _, exercise := range req.Exercises {
		workout.Exercises = append(workout.Exercises, Exercise{
			Name: exercise.Name, ExerciseType: exercise.ExerciseType,
			Reps: exercise.Reps, Weight: exercise.Weight,
			Duration: exercise.Duration, Distance: exercise.Distance,
		})
	}

	if result := s.db.Create(&workout); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error creating workout"})
		return
	}

	// TODO: respond with json {"workout": workout}
}

func (s *Server) HandleDeleteWorkout(c *gin.Context) {
	userId, _ := c.Get("userId")

	id, err := strconv.Atoi(c.Params.ByName("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid workout id"})
		return
	}

	query := &Workout{UserId: userId.(uint), ID: id}
	if result := s.db.Delete(query); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error deleting workout"})
		return
	}

	c.JSON(http.StatusOK, gin.H{})
}

//var workout Workout
//db.Preload("Exercises").First(&workout, workoutID)

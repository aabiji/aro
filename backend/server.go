package main

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/driver/postgres"
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
	if err != nil {
		return Server{}, err
	}

	dsn := "host=localhost user=todo password=todo dbname=todo port=todo"
	server.db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return Server{}, err
	}

	err = server.db.AutoMigrate(&User{}, &Workout{}, &Exercise{},
		&Settings{}, &Tag{}, &TaggedDate{}, &Nutrient{}, &Food{})
	if err != nil {
		return Server{}, err
	}

	return server, err
}

func (s *Server) SearchFood(c *gin.Context) {
	query := strings.TrimSpace(c.Query("query"))
	os := strings.TrimSpace(c.Query("os"))
	barcodeFlag := strings.TrimSpace(c.Query("barcode"))

	if len(os) == 0 || len(query) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request params"})
		return
	}

	productInfos, err := GetProducts(query, os, barcodeFlag == "1")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Food not found"})
		return
	}

	results := []Food{}
	for _, info := range productInfos {
		food, err := ParseProductInfo(info)
		if err != nil {
			continue
		}
		results = append(results, food)
	}

	// TODO: openfoodfacts pagination when searching by text
	// search layer = elasticsearch?
	c.JSON(http.StatusOK, gin.H{"results": results})
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

type UserInfoOptions struct {
	Page               int  `json:"page"`
	IncludeSettings    bool `json:"includeSettings,omitempty"`
	IncludeWorkouts    bool `json:"includeWorkouts,omitempty"`
	IncludeTemplates   bool `json:"includeTemplates,omitempty"`
	IncludeTags        bool `json:"includeTags,omitempty"`
	IncludeTaggedDates bool `json:"includeTaggedDates,omitempty"`
}

func (s *Server) GetUserInfo(c *gin.Context) {
	var fullUser User
	user := c.MustGet("user").(*User)

	var req UserInfoOptions
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	limit := 10
	query := s.db
	for i, value := range []bool{req.IncludeTemplates, req.IncludeWorkouts} {
		if value {
			query = query.Preload("Workouts", func(db *gorm.DB) *gorm.DB {
				return db.Where("workouts.template = ?", i == 0).
					Offset(req.Page * limit).
					Limit(limit + 1).
					Order("workouts.created_at DESC") // newest to oldest
			}).Preload("Workouts.Exercises")
		}
	}
	if req.IncludeSettings {
		query = query.Preload("Settings")
	}
	if req.IncludeTags {
		query = query.Preload("Tags")
	}
	if req.IncludeTaggedDates {
		query = query.Preload("TaggedDates", func(db *gorm.DB) *gorm.DB {
			return db.Offset(req.Page * limit).Limit(limit + 1).Order("tagged_dates.created_at DESC")
		})
	}

	r := query.First(&fullUser, user.ID)
	if r.Error != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to get user"})
		return
	}

	templatesCount := 0
	workoutsCount := 0
	for _, w := range fullUser.Workouts {
		if w.Template {
			templatesCount += 1
		} else {
			workoutsCount += 1
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"user":            fullUser,
		"moreTemplates":   templatesCount > limit,
		"moreWorkouts":    workoutsCount > limit,
		"moreTaggedDates": len(fullUser.TaggedDates) > limit,
	})
}

type SettingsInfo struct {
	ImperialUnits bool `json:"useImperial"`
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

	err := s.db.Transaction(func(tx *gorm.DB) error {
		// get all workout ids
		subQuery := tx.Model(&Workout{}).Select("id").Where("user_id = ?", user.ID)

		if err := tx.Where("workout_id IN (?)", subQuery).Delete(&Exercise{}).Error; err != nil {
			return fmt.Errorf("Failed to delete exercises")
		}

		if err := tx.Where(&Workout{UserID: user.ID}).Delete(&Workout{}).Error; err != nil {
			return fmt.Errorf("Failed to delete workouts")
		}

		if err := tx.Where(&Settings{UserID: user.ID}).Delete(&Settings{}).Error; err != nil {
			return fmt.Errorf("Failed to delete settings")
		}

		if err := tx.Delete(&User{}, user.ID).Error; err != nil {
			return fmt.Errorf("Failed to delete user")
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{})
}

type ExerciseInfo struct {
	Id           int    `json:"id,omitempty"`
	Name         string `json:"name"`
	ExerciseType int    `json:"exerciseType"`
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

type BatchedWorkoutInfo struct {
	Workouts []Workout `json:"workouts"`
}

func (s *Server) CreateWorkout(c *gin.Context) {
	var req BatchedWorkoutInfo
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user := c.MustGet("user").(*User)
	arr := []Workout{}
	err := s.db.Transaction(func(tx *gorm.DB) error {
		for _, w := range req.Workouts {
			workout := Workout{UserID: user.ID, Template: w.Template, Tag: w.Tag}

			for _, exercise := range w.Exercises {
				workout.Exercises = append(workout.Exercises, Exercise{
					Name:         exercise.Name,
					ExerciseType: exercise.ExerciseType,
					Weight:       exercise.Weight,
					Duration:     exercise.Duration,
					Distance:     exercise.Distance,
					Reps:         datatypes.NewJSONSlice(exercise.Reps),
				})
			}

			if result := tx.Create(&workout); result.Error != nil {
				return fmt.Errorf("Error creating workout")
			}

			var full Workout
			if err := tx.Preload("Exercises").First(&full, workout.ID).Error; err != nil {
				return fmt.Errorf("Failed to load workout")
			}
			arr = append(arr, full)
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"workouts": arr})
}

type DeleteWorkoutInfo struct {
	Ids []int `json:"ids"`
}

func (s *Server) DeleteWorkout(c *gin.Context) {
	var req DeleteWorkoutInfo
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user := c.MustGet("user").(*User)
	err := s.db.Transaction(func(tx *gorm.DB) error {
		for _, id := range req.Ids {
			// verify workout exists and belongs to the user
			var workout Workout
			if err := tx.Where("id = ? AND user_id = ?", id, user.ID).First(&workout).Error; err != nil {
				return fmt.Errorf("Workout not found")
			}

			// delete exercises
			if err := tx.Where("workout_id = ?", workout.ID).Delete(&Exercise{}).Error; err != nil {
				return fmt.Errorf("Error deleting exercises")
			}

			// delete workout
			if err := tx.Delete(&workout).Error; err != nil {
				return fmt.Errorf("Error deleting workout")
			}
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{})
}

type TagInfo struct {
	Id    int    `json:"id,omitempty"`
	Name  string `json:"name"`
	Color string `json:"color"`
}

type BatchedTagInfo struct {
	Tags []TagInfo `json:"tags"`
}

func (s *Server) SetTag(c *gin.Context) {
	var req BatchedTagInfo
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	arr := []Tag{}
	user := c.MustGet("user").(*User)

	err := s.db.Transaction(func(tx *gorm.DB) error {
		for _, t := range req.Tags {
			tag := Tag{
				BaseModel: BaseModel{ID: uint(t.Id)},
				UserID:    user.ID, Name: t.Name, Color: t.Color}

			if result := tx.Save(&tag); result.Error != nil {
				return fmt.Errorf("Error creating/updating tag")
			}
			arr = append(arr, tag)
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"tags": arr})
}

func (s *Server) DeleteTag(c *gin.Context) {
	idInt, err := strconv.ParseUint(c.Query("id"), 10, strconv.IntSize)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tag id"})
		return
	}
	id := uint(idInt)
	user := c.MustGet("user").(*User)

	var tag Tag
	if err := s.db.Where("id = ? AND user_id = ?", id, user.ID).First(&tag).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tag not found"})
		return
	}

	if err := s.db.Delete(&tag).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error deleting tag"})
		return
	}

	c.JSON(http.StatusOK, gin.H{})
}

type TaggedDatesInfo struct {
	Dates map[string][]int `json:"taggedDates"`
}

func (s *Server) UpdateTaggedDates(c *gin.Context) {
	var req TaggedDatesInfo
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	user := c.MustGet("user").(*User)

	err := s.db.Transaction(func(tx *gorm.DB) error {
		for date, tags := range req.Dates {
			// insert/update the row or remove it when the date no longer has any corresponding tags
			if len(tags) == 0 {
				clause := &TaggedDate{UserID: user.ID, Date: date}
				if err := tx.Where(clause).Delete(&TaggedDate{}).Error; err != nil {
					return fmt.Errorf("Failed to delete tagged date")
				}
			} else {
				row := TaggedDate{UserID: user.ID, Date: date, Tags: datatypes.NewJSONSlice(tags)}
				if result := tx.Save(&row); result.Error != nil {
					return fmt.Errorf("Error creating/updating tagged date")
				}
			}
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{})
}

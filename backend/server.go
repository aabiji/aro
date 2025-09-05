package main

import (
	"errors"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/argon2"
	"gorm.io/datatypes"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// server and routes
type Server struct{ db *gorm.DB }

func NewServer() (Server, error) {
	var err error
	server := Server{}

	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s",
		os.Getenv("POSTGRES_HOSTNAME"),
		os.Getenv("POSTGRES_USER"),
		os.Getenv("POSTGRES_PASSWORD"),
		os.Getenv("POSTGRES_DB"),
		os.Getenv("DB_PORT"),
	)
	server.db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return Server{}, err
	}

	err = server.db.AutoMigrate(&User{}, &Workout{}, &Exercise{},
		&Settings{}, &Record{}, &Food{}, &Nutrient{})
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
	result := s.db.Where(&User{Email: req.Email}).First(&user)
	if result.Error != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Account not found"})
		return
	}

	salt := []byte(os.Getenv("PASSWORD_SALT"))
	hash := argon2.IDKey([]byte(req.Password), salt, 1, 64*1024, 4, 64)
	if string(hash) != user.Password {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Wrong password"})
		return
	}

	token, err := createToken(fmt.Sprintf("%d", user.ID), os.Getenv("JWT_SECRET"))
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

	salt := []byte(os.Getenv("PASSWORD_SALT"))
	hash := argon2.IDKey([]byte(req.Password), salt, 1, 64*1024, 4, 64)
	user := User{Email: req.Email, Password: string(hash)}

	if result := s.db.Create(&user); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creating user"})
		return
	}

	settings := Settings{UserID: user.ID, ImperialUnits: true}
	if err := s.db.Create(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creating settings"})
		return
	}

	token, err := createToken(fmt.Sprintf("%d", user.ID), os.Getenv("JWT_SECRET"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Coudln't create the JWT"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"jwt": token})
}

type UserInfoOptions struct {
	Page             int  `json:"page"`
	GetSettings      bool `json:"getSettings,omitempty"`
	GetWorkouts      bool `json:"getWorkouts,omitempty"`
	GetTemplates     bool `json:"getTemplates,omitempty"`
	GetPeriodDays    bool `json:"getPeriodDays,omitempty"`
	GetWeightEntries bool `json:"getWeightEntries,omitempty"`
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
	for i, value := range []bool{req.GetTemplates, req.GetWorkouts} {
		if value {
			query = query.Preload("Workouts", func(db *gorm.DB) *gorm.DB {
				return db.Where("workouts.template = ?", i == 0).
					Offset(req.Page * limit).
					Limit(limit + 1).
					Order("workouts.created_at DESC") // newest to oldest
			}).Preload("Workouts.Exercises")
		}
	}
	if req.GetSettings {
		query = query.Preload("Settings")
	}
	if req.GetPeriodDays {
		query = query.Preload("PeriodDays", func(db *gorm.DB) *gorm.DB {
			return db.Offset(req.Page * limit).Limit(limit + 1).Order("period_days.created_at DESC")
		})
	}
	if req.GetWeightEntries {
		query = query.Preload("WeightEntries", func(db *gorm.DB) *gorm.DB {
			return db.Offset(req.Page * limit).Limit(limit + 1).Order("weight_entries.created_at DESC")
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
		"user":              fullUser,
		"moreTemplates":     templatesCount > limit,
		"moreWorkouts":      workoutsCount > limit,
		"morePeriodDays":    len(fullUser.PeriodDays) > limit,
		"moreWeightEntries": len(fullUser.WeightEntries) > limit,
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

		if err := tx.Where(&Record{UserID: user.ID}).Delete(&Record{}).Error; err != nil {
			return fmt.Errorf("Failed to delete records")
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

func (s *Server) TogglePeriodDate(c *gin.Context) {
	user := c.MustGet("user").(*User)
	date, exists := c.GetQuery("date")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	row := &Record{UserID: user.ID, Type: "period", Date: date}
	var existing Record

	// insert/delete the row
	result := s.db.Where(row).First(&existing)
	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		if err := s.db.Create(row).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "couldn't insert period date"})
			return
		}
	} else if result.Error == nil {
		if err := s.db.Delete(&existing).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "couldn't delete period date"})
			return
		}
	} else {
		if err := s.db.Delete(&existing).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "couldn't query database"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{})
}

func (s *Server) SetCurrentWeight(c *gin.Context) {
	user := c.MustGet("user").(*User)

	// asking for the date current for the user
	// (and not just formatting on our side),
	// because they might have a difference locale
	date, dateExists := c.GetQuery("date")
	weightStr, weightExists := c.GetQuery("weight")
	if !dateExists || !weightExists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	weight, err := strconv.ParseUint(weightStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// upsert the row
	row := Record{UserID: user.ID, Type: "weight", Date: date, Value: weight}
	s.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "user_id"}, {Name: "type"}, {Name: "date"}},
		DoUpdates: clause.AssignmentColumns([]string{"value"}),
	}).Create(&row)

	c.JSON(http.StatusOK, gin.H{})
}

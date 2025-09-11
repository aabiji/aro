package main

import (
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

// data models
type User struct {
	ID       uint   `json:"-"`
	Email    string `json:"-"`
	Password string `json:"-"`

	UseImperial bool `json:"useImperial"`

	Workouts   []Workout `json:"workouts"`
	PeriodDays []Record  `json:"periodDays"`
	WeightIns  []Record  `json:"weightEntries"`
}

func getUser(s *Server, by string, value any) (*User, error) {
	sql := fmt.Sprintf(`
		select ID, Email, Password, UseImperial from Users
		where %s = $1 and Deleted = false`, by)

	var user User
	err := s.db.QueryRow(s.ctx, sql, value).Scan(&user.ID, &user.Email,
		&user.Password, &user.UseImperial)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	} else if err != nil {
		return nil, err
	}

	return &user, nil
}

func createUser(s *Server, email string, password string) (uint, error) {
	var userId uint
	sql1 := `
		insert into Users
		(LastModified, Deleted, Email, Password, UseImperial)
		values ($1, $2, $3, $4, $5) returning ID;
	`
	err := s.db.QueryRow(s.ctx, sql1, time.Now(), false, email, password, true).Scan(&userId)
	if err != nil {
		return 0, err
	}

	return userId, err
}

// api endpoints
type AuthRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (s *Server) LoginEndpoint(c *gin.Context) {
	var req AuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := getUser(s, "Email", req.Email)
	if err != nil {
		c.JSON(StatusInternalServerError, gin.H{"error": "Coudln't query database"})
		return
	}

	if user == nil {
		c.JSON(StatusBadRequest, gin.H{"error": "Account not found"})
		return
	}

	correctPassword, err := verifyPassword(req.Password, user.Password)
	if err != nil {
		c.JSON(StatusInternalServerError, gin.H{"error": "Coudln't verify password"})
		return
	}

	if !correctPassword {
		c.JSON(StatusBadRequest, gin.H{"error": "Wrong password"})
		return
	}

	token, err := createToken(fmt.Sprintf("%d", user.ID), os.Getenv("JWT_SECRET"))
	if err != nil {
		c.JSON(StatusInternalServerError, gin.H{"error": "Couldn't create the jwt"})
		return
	}

	c.JSON(StatusOK, gin.H{"jwt": token})
}

func (s *Server) SignupEndpoint(c *gin.Context) {
	var req AuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := getUser(s, "Email", req.Email)
	if err != nil {
		c.JSON(StatusInternalServerError, gin.H{"error": "Coudln't query database"})
		return
	}

	if user != nil {
		c.JSON(StatusBadRequest, gin.H{"error": "Account already exists"})
		return
	}

	password, err := hashPassword(req.Password)
	if err != nil {
		c.JSON(StatusInternalServerError, gin.H{"error": "Error hashing password"})
		return
	}

	userID, err := createUser(s, req.Email, password)
	if err != nil {
		c.JSON(StatusInternalServerError, gin.H{"error": "Error creating user"})
		return
	}

	token, err := createToken(fmt.Sprintf("%d", userID), os.Getenv("JWT_SECRET"))
	if err != nil {
		c.JSON(StatusInternalServerError, gin.H{"error": "Coudln't create the JWT"})
		return
	}

	c.JSON(StatusOK, gin.H{"jwt": token})
}

func (s *Server) UpdateSettingsEndpoint(c *gin.Context) {
	user := c.MustGet("user").(*User)

	imperial := c.Query("imperial")
	if imperial == "true" || imperial == "false" {
		sql := "update Users set UseImperial = $1 where UserID = $2;"
		_, err := s.db.Exec(s.ctx, sql, imperial == "true", user.ID)
		if err != nil {
			c.JSON(StatusInternalServerError, gin.H{"error": "Couldn't update user settings"})
		}
	}

	c.JSON(StatusOK, gin.H{})
}

func (s *Server) DeleteUserEndpoint(c *gin.Context) {
	user := c.MustGet("user").(*User)

	sql := "update Users set Deleted = true where ID = $1;"
	_, err := s.db.Exec(s.ctx, sql, user.ID)
	if err != nil {
		c.JSON(StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := deleteRecords(s, user.ID); err != nil {
		c.JSON(StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := deleteWorkouts(s, user.ID); err != nil {
		c.JSON(StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(StatusOK, gin.H{})
}

type InfoRequest struct {
	Page           int   `json:"page"`
	LastUpdateTime int64 `json:"unixTimestamp"`
	GetSettings    bool  `json:"getSettings,omitempty"`
	GetWorkouts    bool  `json:"getWorkouts,omitempty"`
	GetTemplates   bool  `json:"getTemplates,omitempty"`
	GetPeriodDays  bool  `json:"getPeriodDays,omitempty"`
	GetWeighIns    bool  `json:"getWeightEntries,omitempty"`
}

func (s *Server) UserInfoEndpoint(c *gin.Context) {
	var req InfoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user := c.MustGet("user").(*User)
	options := FetchOptions{
		page: req.Page, userID: user.ID, limit: 10,
		timestamp: time.Unix(req.LastUpdateTime, 0),
	}

	var templatesCount, workoutsCount int
	info := User{UseImperial: user.UseImperial}

	if req.GetWorkouts {
		workouts, err := getWorkouts(s, false, options)
		if err != nil {
			c.JSON(StatusInternalServerError, gin.H{"error": "Couldn't fetch workouts"})
			return
		}
		info.Workouts = append(user.Workouts, workouts...)
		workoutsCount = len(workouts)
	}

	if req.GetTemplates {
		templates, err := getWorkouts(s, true, options)
		if err != nil {
			c.JSON(StatusInternalServerError, gin.H{"error": "Couldn't fetch templates"})
			return
		}
		info.Workouts = append(user.Workouts, templates...)
		templatesCount = len(templates)
	}

	if req.GetPeriodDays {
		records, err := getRecords(s, "period", options)
		if err != nil {
			c.JSON(StatusInternalServerError, gin.H{"error": "Couldn't fetch period days"})
			return
		}
		info.PeriodDays = records
	}

	if req.GetWeighIns {
		records, err := getRecords(s, "weight", options)
		if err != nil {
			c.JSON(StatusInternalServerError, gin.H{"error": "Couldn't fetch weight ins"})
			return
		}
		info.WeightIns = records
	}

	c.JSON(StatusOK, gin.H{
		"user":              info,
		"moreWorkouts":      workoutsCount > options.limit,
		"moreTemplates":     templatesCount > options.limit,
		"morePeriodDays":    len(info.PeriodDays) > options.limit,
		"moreWeightEntries": len(info.WeightIns) > options.limit,
	})
}

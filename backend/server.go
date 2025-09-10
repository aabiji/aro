package main

import (
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// server and routes
type Server struct{ db Database }

func NewServer() (Server, error) {
	var err error
	server := Server{}

	server.db, err = NewDatabase()
	if err != nil {
		return Server{}, err
	}

	return server, err
}

func (s *Server) Cleanup() { s.db.Close() }

// Get info from a food by id, text search or barcode number
func (s *Server) SearchFood(c *gin.Context) {
	query := strings.TrimSpace(c.Query("query"))
	queryType := strings.TrimSpace(c.Query("queryType"))
	os := strings.TrimSpace(c.Query("os"))

	if len(os) == 0 || len(query) == 0 || len(queryType) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request params"})
		return
	}

	if queryType == "foodID" {
		id, err := strconv.ParseUint(query, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request params"})
			return
		}
		food, err := s.db.GetFood(uint(id))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Couldn't get food info"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"results": []any{food}})
		return
	}

	productInfos, err := GetProducts(query, os, queryType == "barcode")
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

	c.JSON(http.StatusOK, gin.H{"results": results})
}

type AuthRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (s *Server) Login(c *gin.Context) {
	var req AuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := s.db.GetUser("Email", req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Coudln't query database"})
		return
	}

	if user == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Account not found"})
		return
	}

	correctPassword, err := verifyPassword(req.Password, user.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Coudln't verify password"})
		return
	}

	if !correctPassword {
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
	var req AuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := s.db.GetUser("Email", req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Coudln't query database"})
		return
	}

	if user != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Account already exists"})
		return
	}

	password, err := hashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error hashing password"})
		return
	}

	userID, err := s.db.CreateUser(req.Email, password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creating user"})
		return
	}

	token, err := createToken(fmt.Sprintf("%d", userID), os.Getenv("JWT_SECRET"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Coudln't create the JWT"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"jwt": token})
}

type InfoRequest struct {
	Page             int   `json:"page"`
	LastUpdateTime   int64 `json:"unixTimestamp"`
	GetSettings      bool  `json:"getSettings,omitempty"`
	GetWorkouts      bool  `json:"getWorkouts,omitempty"`
	GetTemplates     bool  `json:"getTemplates,omitempty"`
	GetPeriodDays    bool  `json:"getPeriodDays,omitempty"`
	GetWeightEntries bool  `json:"getWeightEntries,omitempty"`
}

func (s *Server) GetUserInfo(c *gin.Context) {
	var req InfoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	user := c.MustGet("user").(*User)

	pageSize := 10
	info, err := s.db.GetUserInfo(user.ID, pageSize, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user info"})
		return
	}

	templatesCount := 0
	workoutsCount := 0
	for _, w := range info.Workouts {
		if w.Template {
			templatesCount += 1
		} else {
			workoutsCount += 1
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"user":              info,
		"moreTemplates":     templatesCount > pageSize,
		"moreWorkouts":      workoutsCount > pageSize,
		"morePeriodDays":    len(info.PeriodDays) > pageSize,
		"moreWeightEntries": len(info.WeightEntries) > pageSize,
	})
}

func (s *Server) UpdateUserSettings(c *gin.Context) {
	user := c.MustGet("user").(*User)

	imperial := c.Query("imperial")
	if imperial == "true" || imperial == "false" {
		s.db.UpdateSettings(user.ID, imperial == "true")
	}

	c.JSON(http.StatusOK, gin.H{})
}

func (s *Server) DeleteUser(c *gin.Context) {
	user := c.MustGet("user").(*User)
	if err := s.db.DeleteUser(user.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{})
}

func (s *Server) CreateWorkout(c *gin.Context) {
	var req Workout
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user := c.MustGet("user").(*User)
	workoutId, err := s.db.CreateWorkout(user.ID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create workout"})
		return
	}

	req.ID = workoutId
	c.JSON(http.StatusOK, gin.H{"workout": req})
}

func (s *Server) DeleteWorkout(c *gin.Context) {
	idStr, exists := c.GetQuery("id")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	user := c.MustGet("user").(*User)
	if err := s.db.DeleteWorkout(user.ID, uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error deleting workout"})
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

	if err := s.db.ToggleRecord(user.ID, "period", date); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Couldn't toggle date"})
		return
	}

	c.JSON(http.StatusOK, gin.H{})
}

func (s *Server) SetWeightEntry(c *gin.Context) {
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

	if err := s.db.UpsertRecord(user.ID, "weight", date, int(weight)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Coudln't upsert workout"})
		return
	}

	c.JSON(http.StatusOK, gin.H{})
}

package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

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

func ParseRequest[T any](r *http.Request) (T, error) {
	var value T
	decoder := json.NewDecoder(r.Body)
	err := decoder.Decode(&value)
	return value, err
}

type AuthRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (s *Server) HandleLogin(writer http.ResponseWriter, r *http.Request) {
	w, _ := writer.(*JSONResponseWriter)
	request, err := ParseRequest[AuthRequest](r)
	if err != nil {
		w.Respond(http.StatusBadRequest, fmt.Errorf("bad request"))
		return
	}

	var user User
	result := s.db.Where(&User{Email: request.Email, Password: request.Password}).First(&user)

	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		w.Respond(http.StatusBadRequest, fmt.Errorf("user not found"))
		return
	} else if result.Error != nil {
		w.Respond(http.StatusInternalServerError, fmt.Errorf("error querying db"))
		return
	}

	token, err := createToken(fmt.Sprintf("%d", user.ID), s.secrets["JWT_SECRET"])
	if err != nil {
		w.Respond(http.StatusInternalServerError, fmt.Errorf("couldn't create jwt"))
		return
	}

	w.Respond(http.StatusOK, map[string]any{"jwt": token})
}

func (s *Server) HandleSignup(writer http.ResponseWriter, r *http.Request) {
	w, _ := writer.(*JSONResponseWriter)
	request, err := ParseRequest[AuthRequest](r)
	if err != nil {
		w.Respond(http.StatusBadRequest, fmt.Errorf("bad request"))
		return
	}

	user := User{
		Email:    request.Email,
		Password: request.Password,
		Settings: Settings{ImperialUnits: true},
		Workouts: []Workout{},
	}
	if result := s.db.Create(&user); result.Error != nil {
		w.Respond(http.StatusInternalServerError, fmt.Errorf("error creating user"))
		return
	}

	token, err := createToken(fmt.Sprintf("%d", user.ID), s.secrets["JWT_SECRET"])
	if err != nil {
		w.Respond(http.StatusInternalServerError, fmt.Errorf("couldn't create jwt"))
		return
	}

	w.Respond(http.StatusOK, map[string]any{"jwt": token})
}

//var workout Workout
//db.Preload("Exercises").First(&workout, workoutID)

package main

import (
	"gorm.io/datatypes"
	"time"
)

// the same as gorm.Model, just with no json output
type BaseModel struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `json:"-"`
	UpdatedAt time.Time `json:"-"`
}

// database models
type User struct {
	BaseModel
	Email       string       `gorm:"uniqueIndex" json:"-"`
	Password    string       `json:"-"`
	Settings    Settings     `json:"settings" gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	Workouts    []Workout    `json:"workouts" gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	TaggedDates []TaggedDate `json:"taggedDates" gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	Tags        []Tag        `json:"tags" gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
}

type Workout struct {
	BaseModel
	UserID    uint       `json:"-"`
	Template  bool       `json:"isTemplate"`
	Tag       string     `json:"tag"` // name or date
	Exercises []Exercise `json:"exercises" gorm:"foreignKey:WorkoutID;constraint:OnDelete:CASCADE"`
}

type Exercise struct {
	BaseModel
	WorkoutID    uint                     `json:"-"`
	Name         string                   `json:"name"`
	ExerciseType int                      `json:"exercise_type"`
	Reps         datatypes.JSONSlice[int] `gorm:"type:json" json:"reps"`
	Weight       int                      `json:"weight"`
	Duration     int                      `json:"duration"`
	Distance     int                      `json:"distance"`
}

type Tag struct {
	BaseModel
	UserID uint   `gorm:"uniqueIndex" json:"-"`
	Name   string `json:"name"`
	Color  string `json:"color"`
}

type TaggedDate struct {
	BaseModel
	UserID uint                        `gorm:"uniqueIndex" json:"-"`
	Date   string                      `json:"date"`
	Tags   datatypes.JSONSlice[string] `gorm:"type:json" json:"tagNames"`
}

type Settings struct {
	BaseModel
	UserID        uint `gorm:"uniqueIndex" json:"-"`
	ImperialUnits bool `json:"useImperial"`
}

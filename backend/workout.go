package main

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

type Workout struct {
	ID        uint       `json:"id,omitempty"`
	Deleted   bool       `json:"deleted,omitempty"`
	Template  bool       `json:"isTemplate"`
	Tag       string     `json:"tag"` // name or date
	Exercises []Exercise `json:"exercises"`
}

type Exercise struct {
	Name         string  `json:"name"`
	ExerciseType int     `json:"exerciseType"`
	Reps         []int32 `json:"reps"`
	Weight       int     `json:"weight"`
	Duration     int     `json:"duration"`
	Distance     int     `json:"distance"`
}

func createWorkout(s *Server, userId uint, workout Workout) (uint, error) {
	tx, err := s.db.Begin(s.ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(s.ctx)

	sql := `
		insert into Workouts (LastModified, Deleted, UserID, IsTemplate, Tag)
		values ($1, $2, $3, $4, $5)
		returning ID;
	`
	var workoutId uint
	if err := tx.QueryRow(s.ctx, sql, time.Now(), false, userId,
		workout.Template, workout.Tag).Scan(&workoutId); err != nil {
		return 0, err
	}

	sql = `
		insert into Exercises
		(LastModified, Deleted, WorkoutID, Name, ExerciseType, Reps,
		Weight, Duration, Distance)
		values ($1, $2, $3, $4, $5, $6, $7, $8, $9);
	`
	for _, e := range workout.Exercises {
		if _, err := tx.Exec(s.ctx, sql, time.Now(), false, workoutId, e.Name,
			e.ExerciseType, e.Reps, e.Weight, e.Duration, e.Distance); err != nil {
			return 0, err
		}
	}

	err = tx.Commit(s.ctx)
	return workoutId, err
}

func deleteWorkout(s *Server, userId uint, workoutId uint) error {
	tx, err := s.db.Begin(s.ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(s.ctx)

	sql := `
		update Workouts
		set Deleted = true, LastModified = $1
		where UserID = $2 and ID = $3;`
	_, err = tx.Exec(s.ctx, sql, time.Now(), userId, workoutId)
	if err != nil {
		return err
	}

	sql = `update Exercises set Deleted = true, LastModified = $1 where ID = $2;`
	_, err = tx.Exec(s.ctx, sql, time.Now(), workoutId)
	if err != nil {
		return err
	}

	return tx.Commit(s.ctx)
}

func deleteWorkouts(s *Server, userID uint) error {
	sql := `
		update Workouts set Deleted = true, LastModified = $1
		where UserID = $2 returning ID;`
	rows, err := s.db.Query(s.ctx, sql, time.Now(), userID)
	if err != nil {
		return err
	}

	for rows.Next() {
		var workoutID uint
		if err := rows.Scan(&workoutID); err != nil {
			return err
		}

		sql = `update Exercises set Deleted = true, LastModified = $1 where WorkoutID = $2;`
		_, err := s.db.Exec(s.ctx, sql, time.Now(), workoutID)
		if err != nil {
			return err
		}
	}

	return nil
}

func getWorkouts(s *Server, isTemplate bool, options FetchOptions) ([]Workout, error) {
	scanWorkout := func(rows pgx.Rows) (Workout, error) {
		var w Workout
		err := rows.Scan(&w.ID, &w.Deleted, &w.Template, &w.Tag)
		return w, err
	}

	scanExercise := func(rows pgx.Rows) (Exercise, error) {
		var e Exercise
		err := rows.Scan(&e.Name, &e.ExerciseType, &e.Reps, &e.Weight, &e.Duration, &e.Distance)
		return e, err
	}

	sql := `
		select ID, Deleted, IsTemplate, Tag from Workouts
		where UserID = $1 and Workouts.IsTemplate = $2 and LastModified >= $3
		order by Workouts.LastModified desc
		limit $4 offset $5;
	`

	workouts, err := fetchRows(s, sql, scanWorkout, options.userID, isTemplate,
		options.timestamp, options.limit, options.page)
	if err != nil {
		return nil, err
	}

	for j := range workouts {
		sql := `
				select Name, ExerciseType, Reps, Weight, Duration, Distance from Exercises
				where WorkoutID = $1;`
		exercises, err := fetchRows(s, sql, scanExercise, workouts[j].ID)
		if err != nil {
			return nil, err
		}
		workouts[j].Exercises = exercises
	}

	return workouts, nil
}

// api endpoints
func (s *Server) CreateWorkout(c *gin.Context) {
	var req Workout
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user := c.MustGet("user").(*User)
	workoutId, err := createWorkout(s, user.ID, req)
	if err != nil {
		c.JSON(StatusInternalServerError, gin.H{"error": "Failed to create workout"})
		return
	}

	req.ID = workoutId
	c.JSON(StatusOK, gin.H{"workout": req})
}

func (s *Server) DeleteWorkout(c *gin.Context) {
	idStr, exists := c.GetQuery("id")
	if !exists {
		c.JSON(StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	user := c.MustGet("user").(*User)
	if err := deleteWorkout(s, user.ID, uint(id)); err != nil {
		c.JSON(StatusInternalServerError, gin.H{"error": "Error deleting workout"})
		return
	}

	c.JSON(StatusOK, gin.H{})
}

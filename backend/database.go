package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type User struct {
	ID            uint      `json:"-"`
	Email         string    `json:"-"`
	Password      string    `json:"-"`
	Settings      Settings  `json:"settings"`
	Workouts      []Workout `json:"workouts"`
	PeriodDays    []Record  `json:"periodDays"`
	WeightEntries []Record  `json:"weightEntries"`
}

type Workout struct {
	ID        uint       `json:"id,omitempty"`
	Template  bool       `json:"isTemplate"`
	Tag       string     `json:"tag"` // name or date
	Exercises []Exercise `json:"exercises"`
}

type Exercise struct {
	Name         string `json:"name"`
	ExerciseType int    `json:"exerciseType"`
	Reps         []int  `json:"reps"`
	Weight       int    `json:"weight"`
	Duration     int    `json:"duration"`
	Distance     int    `json:"distance"`
}

type Record struct {
	Date  string `json:"date"`
	Value uint64 `json:"value"`
}

type Settings struct {
	ImperialUnits bool `json:"useImperial"`
}

type Food struct {
	Name        string     `json:"name"`
	ServingSize int        `json:"serving_size"`
	ServingUnit string     `json:"serving_unit"`
	Nutrients   []Nutrient `json:"nutrients"`
}

type Nutrient struct {
	FoodID uint    `json:"-"`
	Name   string  `json:"name"`
	Unit   string  `json:"unit"`
	Value  float64 `json:"value"`
}

type Database struct {
	pool *pgxpool.Pool
	ctx  context.Context
}

func NewDatabase() (Database, error) {
	ctx := context.Background()

	url := fmt.Sprintf(
		"postgresql://%s:%s@%s:%s/%s",
		os.Getenv("POSTGRES_USER"),
		os.Getenv("POSTGRES_PASSWORD"),
		os.Getenv("POSTGRES_HOSTNAME"),
		os.Getenv("DB_PORT"),
		os.Getenv("POSTGRES_DB"))

	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		return Database{}, err
	}

	schema, err := os.ReadFile("tables.sql")
	if err != nil {
		return Database{}, err
	}
	if _, err := pool.Exec(ctx, string(schema)); err != nil {
		return Database{}, err
	}

	return Database{pool, ctx}, nil
}

func (d *Database) Close() { d.pool.Close() }

func (d *Database) CreateUser(email string, password string) (uint, error) {
	tx, err := d.pool.Begin(d.ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(d.ctx)

	var userId uint
	sql1 := "insert into Users (Email, Password) values ($1, $2) returning ID;"
	err = tx.QueryRow(d.ctx, sql1, email, password).Scan(&userId)
	if err != nil {
		return 0, err
	}

	sql2 := "insert into Settings (UserID, UseImperial) values ($1, $2);"
	_, err = tx.Exec(d.ctx, sql2, userId, true)
	if err != nil {
		return 0, err
	}

	err = tx.Commit(d.ctx)
	return userId, err
}

func (d *Database) GetUser(valueName string, value any) (*User, error) {
	sql := fmt.Sprintf("select ID, Email, Password from Users where %s = $1", valueName)

	var user User
	err := d.pool.QueryRow(d.ctx, sql, value).Scan(&user.ID, &user.Email, &user.Password)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	} else if err != nil {
		return nil, err
	}

	return &user, nil
}

func (d *Database) DeleteUser(id uint) error {
	_, err := d.pool.Exec(d.ctx, "delete from Users where ID = $1;", id)
	return err
}

func fetchRows[T any](
	d *Database, sql string,
	scanRow func(pgx.Rows) (T, error),
	args ...any) ([]T, error) {
	rows, err := d.pool.Query(d.ctx, sql, args)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var values []T
	for rows.Next() {
		value, err := scanRow(rows)
		if err != nil {
			return nil, err
		}
		values = append(values, value)
	}

	return values, nil
}

func (d *Database) GetUserInfo(id uint, limit int, options UserInfoOptions) (User, error) {
	scanWorkout := func(rows pgx.Rows) (Workout, error) {
		var w Workout
		err := rows.Scan(&w.ID, &w.Template, &w.Tag)
		return w, err
	}

	scanExercise := func(rows pgx.Rows) (Exercise, error) {
		var e Exercise
		err := rows.Scan(&e.Name, &e.ExerciseType, &e.Reps, &e.Weight, &e.Duration, &e.Distance)
		return e, err
	}

	scanRecord := func(rows pgx.Rows) (Record, error) {
		var r Record
		err := rows.Scan(&r.Date, &r.Value)
		return r, err
	}

	var user User

	sql := `
		select ID, Template, Tag from Workouts
		where UserID = $1 and Workouts.IsTemplate = $2
		order by Workouts.CreatedAt desc
		limit $3 offset $4;
	`
	bools := []bool{options.GetTemplates, options.GetWorkouts}
	for i, get := range bools {
		if !get {
			continue
		}

		workouts, err := fetchRows(d, sql, scanWorkout, id, i == 0, limit, options.Page)
		if err != nil {
			return User{}, err
		}

		for j := range workouts {
			sql := "select Name, ExerciseType, Reps, Weight, Duration, Distance from Exercises where WorkoutID = $1;"
			exercises, err := fetchRows(d, sql, scanExercise, workouts[j].ID)
			if err != nil {
				return User{}, err
			}
			workouts[j].Exercises = exercises
		}

		user.Workouts = append(user.Workouts, workouts...)
	}

	sql = "select UseImperial from Settings where UserID = $1;"
	if options.GetSettings {
		if err := d.pool.QueryRow(d.ctx, sql, id).Scan(&user.Settings.ImperialUnits); err != nil {
			return User{}, err
		}
	}

	if options.GetPeriodDays {
		sql = `select Date, Value from Records where UserID = $1 and Type = $2 limit $3 offset $4;`
		records, err := fetchRows(d, sql, scanRecord, id, "period", limit, options.Page)
		if err != nil {
			return User{}, err
		}
		user.PeriodDays = records
	}

	if options.GetWeightEntries {
		sql = `select * from Records where UserID = $1 and Type = $2 limit $3 offset $4;`
		records, err := fetchRows(d, sql, scanRecord, id, "weight", limit, options.Page)
		if err != nil {
			return User{}, err
		}
		user.WeightEntries = records
	}

	return user, nil
}

func (d *Database) UpdateSettings(id uint, useImperial bool) error {
	sql := "update Settings set UseImperial = $1 where UserID = $2;"
	_, err := d.pool.Exec(d.ctx, sql, useImperial, id)
	return err
}

func (d *Database) DeleteWorkout(userId uint, workoutId uint) error {
	sql := "delete from Workouts where UserID = $1 and ID = $2;"
	_, err := d.pool.Exec(d.ctx, sql, userId, workoutId)
	return err

}

func (d *Database) CreateWorkout(userId uint, workout Workout) (uint, error) {
	tx, err := d.pool.Begin(d.ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(d.ctx)

	sql := `
		insert into Workouts (CreatedAt, UserID, IsTemplate, Tag)
		values ($1, $2, $3, $4)
		returning ID;
	`
	now := time.Now().Unix()
	var workoutId uint
	if err := tx.QueryRow(d.ctx, sql, now, userId, workout.Template, workout.Tag).Scan(&workoutId); err != nil {
		return 0, err
	}

	sql = `
		insert into Exercises (WorkoutID, Name, ExerciseType, Reps, Weight, Duration, Distance)
		values ($1, $2, $3, $4, $5, $6, $7);
	`
	for _, e := range workout.Exercises {
		if _, err := tx.Exec(d.ctx, sql, workoutId, e.Name,
			e.ExerciseType, e.Reps, e.Weight, e.Duration, e.Distance); err != nil {
			return 0, err
		}
	}

	err = tx.Commit(d.ctx)
	return workoutId, err
}

func (d *Database) UpsertRecord(userId uint, recordType string, date string, value int) error {
	sql := `
		insert into Records (UserID, Type, Date, Value)
		values ($1, $2, $3, $4)
		on conflict(UserID, Type, Date)
		do update set Value = excluded.Value;
	`
	_, err := d.pool.Exec(d.ctx, sql, userId, recordType, date, value)
	return err
}

func (d *Database) ToggleRecord(userId uint, recordType, date string) error {
	sql := `
		select exists (
			select 1 from Records
			where UserID = $1 and Type = $2 and Date = $3
		);
	`
	exists := false
	err := d.pool.QueryRow(d.ctx, sql, userId, recordType, date).Scan(&exists)
	if err != nil {
		return err
	}

	if exists {
		sql := "delete from Records where UserID = $1 and Type = $2 and Date = $3;"
		if _, err := d.pool.Exec(d.ctx, sql, userId, recordType, date); err != nil {
			return err
		}
	} else {
		if err := d.UpsertRecord(userId, recordType, date, 0); err != nil {
			return err
		}
	}

	return nil
}

package main

import (
	"errors"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

// generic structure that can encode many different things,
// like period dates or daily weigh ins
type Record struct {
	Deleted bool   `json:"deleted,omitempty"`
	Date    string `json:"date"`
	Value   int    `json:"value"`
}

func togglePeriodDate(s *Server, userId uint, date string) error {
	sql := `
		select Deleted from Records
		where Deleted = false and UserID = $1 and Type = $2 and Date = $3`
	deleted := true
	err := s.db.QueryRow(s.ctx, sql, userId, "period", date).Scan(&deleted)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}

	if errors.Is(err, pgx.ErrNoRows) {
		sql := `
			insert into Records (LastModified, Deleted, UserID, Type, Date)
			values ($1, $2, $3, $4, $5, $6)`
		if _, err := s.db.Exec(s.ctx, sql, time.Now(), false, userId, "period", date); err != nil {
			return err
		}
	} else {
		sql = `
			update Records set Deleted = $1, LastModified = $2
			where UserID = $3 and Type = $4 and Date = $5;`
		if _, err := s.db.Exec(s.ctx, sql, !deleted, time.Now(),
			userId, "period", date); err != nil {
			return err
		}
	}

	return nil
}

func createWeightIn(s *Server, userID uint, date string, value int) error {
	sql := `
		insert into Records (LastModified, Deleted, UserID, Type, Date, Value)
		values ($1, $2, $3, $4, $5, $6)
		on conflict(UserID, Type, Date)
		do update set Value = excluded.Value, LastModified = excluded.LastModified;
	`
	_, err := s.db.Exec(s.ctx, sql, time.Now(), false, userID, "weight", date, value)
	return err
}

func getRecords(s *Server, recordType string, options FetchOptions) ([]Record, error) {
	scanRecord := func(rows pgx.Rows) (Record, error) {
		var r Record
		err := rows.Scan(&r.Deleted, &r.Date, &r.Value)
		return r, err
	}

	sql := `
			select Deleted, Date, Value from Records
			where UserID = $1 and Type = $2 and LastModified >= $3
			limit $4 offset $5;`
	records, err := fetchRows(s, sql, scanRecord, options.userID,
		recordType, options.timestamp, options.limit, options.page)
	if err != nil {
		return nil, err
	}

	return records, nil
}

func deleteRecords(s *Server, userID uint) error {
	sql := "update Records set Deleted = true, LastModified = $1 where UserID = $2;"
	_, err := s.db.Exec(s.ctx, sql, time.Now(), userID)
	return err
}

func (s *Server) MarkPeriod(c *gin.Context) {
	user := c.MustGet("user").(*User)
	date, exists := c.GetQuery("date")
	if !exists {
		c.JSON(StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if err := togglePeriodDate(s, user.ID, date); err != nil {
		c.JSON(StatusInternalServerError, gin.H{"error": "Couldn't toggle date"})
		return
	}

	c.JSON(StatusOK, gin.H{})
}

func (s *Server) SetWeight(c *gin.Context) {
	user := c.MustGet("user").(*User)

	// asking for the date current for the user
	// (and not just formatting on our side),
	// because they might have a difference locale
	date, dateExists := c.GetQuery("date")
	weightStr, weightExists := c.GetQuery("weight")
	if !dateExists || !weightExists {
		c.JSON(StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	weight, err := strconv.ParseUint(weightStr, 10, 64)
	if err != nil {
		c.JSON(StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if err := createWeightIn(s, user.ID, date, int(weight)); err != nil {
		c.JSON(StatusInternalServerError, gin.H{"error": "Coudln't upsert workout"})
		return
	}

	c.JSON(StatusOK, gin.H{})
}

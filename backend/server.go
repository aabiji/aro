package main

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type FetchOptions struct {
	userID    uint
	limit     int
	page      int
	timestamp time.Time
}

type RowScanner[T any] = func(pgx.Rows) (T, error)

func fetchRows[T any](s *Server, sql string, scanRow RowScanner[T], args ...any) ([]T, error) {
	rows, err := s.db.Query(s.ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	values := []T{}
	for rows.Next() {
		value, err := scanRow(rows)
		if err != nil {
			return nil, err
		}
		values = append(values, value)
	}
	return values, nil
}

const (
	StatusOK                  = 200
	StatusNoContent           = 204
	StatusBadRequest          = 400
	StatusUnauthorized        = 401
	StatusInternalServerError = 500
)

// enable cors for the frontend
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		allowed := []string{"http://localhost:8081"}
		if slices.Contains(allowed, origin) {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		}

		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(StatusNoContent)
			return
		}

		c.Next()
	}
}

// verify the json web token in the authorization header
// pass in the user to all subsequent routes if the user the jwt is refering to exists
func AuthMiddleware(s *Server) gin.HandlerFunc {
	return func(c *gin.Context) {
		parts := strings.Split(c.GetHeader("Authorization"), " ")
		if len(parts) != 2 && parts[0] != "Bearer" {
			c.AbortWithStatusJSON(StatusUnauthorized, gin.H{"error": "Invalid auth header"})
			return
		}

		token, err := verifyToken(parts[1], os.Getenv("JWT_SECRET"))
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(StatusUnauthorized, gin.H{"error": "Invalid jwt"})
			return
		}

		userId, err := token.Claims.GetSubject()
		if err != nil {
			c.AbortWithStatusJSON(StatusUnauthorized, gin.H{"error": "Invalid jwt"})
			return
		}

		id, err := strconv.ParseUint(userId, 10, strconv.IntSize)
		if err != nil {
			c.AbortWithStatusJSON(StatusUnauthorized, gin.H{"error": "Invalid user id"})
			return
		}

		user, err := getUser(s, "ID", id)
		if user == nil || err != nil {
			c.AbortWithStatusJSON(StatusUnauthorized, gin.H{"error": "Invalid user id"})
			return
		}

		c.Set("user", user)
		c.Next()
	}
}

type Server struct {
	db  *pgxpool.Pool
	ctx context.Context
}

func NewServer() (Server, error) {
	ctx := context.Background()

	url := fmt.Sprintf(
		"postgresql://%s:%s@%s:%s/%s",
		url.QueryEscape(os.Getenv("POSTGRES_USER")),
		url.QueryEscape(os.Getenv("POSTGRES_PASSWORD")),
		url.QueryEscape(os.Getenv("POSTGRES_HOSTNAME")),
		url.QueryEscape(os.Getenv("DB_PORT")),
		url.QueryEscape(os.Getenv("POSTGRES_DB")))

	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		return Server{}, err
	}

	schema, err := os.ReadFile("tables.sql")
	if err != nil {
		return Server{}, err
	}
	if _, err := pool.Exec(ctx, string(schema)); err != nil {
		return Server{}, err
	}

	return Server{db: pool, ctx: ctx}, nil
}

func (s *Server) Cleanup() { s.db.Close() }

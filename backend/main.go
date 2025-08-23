package main

import (
	"fmt"
	"net/http"
	"slices"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

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
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func AuthMiddleware(s *Server) gin.HandlerFunc {
	return func(c *gin.Context) {
		parts := strings.Split(c.GetHeader("Authorization"), " ")
		if len(parts) != 2 && parts[0] != "Bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid auth header"})
			return
		}

		token, err := verifyToken(parts[1], s.secrets["JWT_SECRET"])
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid auth header"})
			return
		}

		userId, err := token.Claims.GetSubject()
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid auth header"})
			return
		}

		id, err := strconv.Atoi(userId)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid auth header"})
			return
		}

		if user := s.GetUser(&User{ID: id}); user == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid auth header"})
			return
		}

		c.Set("userId", id)
		c.Next()
	}
}

func main() {
	server, err := NewServer()
	if err != nil {
		panic(err)
	}

	r := gin.Default()
	r.POST("/login", server.HandleLogin)
	r.POST("/signup", server.HandleSignup)

	auth := r.Group("/auth")
	auth.Use(AuthMiddleware(&server))

	auth.POST("/workout", server.HandleCreateWorkout)
	auth.DELETE("/workout", server.HandleDeleteWorkout)

	fmt.Println("Server running on http://localhost:8080")
	r.Run(":8080")
}

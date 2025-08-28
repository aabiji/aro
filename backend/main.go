package main

import (
	"net/http"
	"slices"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
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
			c.AbortWithStatus(http.StatusNoContent)
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
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid auth header"})
			return
		}

		token, err := verifyToken(parts[1], s.secrets["JWT_SECRET"])
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid jwt"})
			return
		}

		userId, err := token.Claims.GetSubject()
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid jwt"})
			return
		}

		id, err := strconv.ParseUint(userId, 10, strconv.IntSize)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid user id"})
			return
		}

		user := s.GetUser(id)
		if user == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid user id"})
			return
		}

		c.Set("user", user)
		c.Next()
	}
}

func main() {
	/*
		server, err := NewServer()
		if err != nil {
			panic(err)
		}

		r := gin.Default()
		r.Use(CORSMiddleware())

		auth := r.Group("/auth")
		auth.Use(AuthMiddleware(&server))

		r.POST("/login", server.Login)
		r.POST("/signup", server.Signup)

		auth.POST("/userInfo", server.GetUserInfo)
		auth.POST("/user", server.UpdateUserSettings)
		auth.DELETE("/user", server.DeleteUser)

		auth.POST("/workout", server.CreateWorkout)
		auth.DELETE("/workout", server.DeleteWorkout)

		auth.POST("/tag", server.SetTag)
		auth.DELETE("/tag/:id", server.DeleteTag)
		auth.POST("/taggedDates", server.UpdateTaggedDates)

		gin.SetMode(gin.DebugMode)
		r.Run(":8080")
	*/
	paths := []string{
		"/home/aabiji/Downloads/train/20149482_2_jpg.rf.7310026d202343bdc2b84114d5e2aa54.jpg",
		"/home/aabiji/Downloads/train/11888560_3_jpg.rf.ade4e15fc7688cb95f43e71424a1dfd8.jpg",
		"/home/aabiji/Downloads/train/00287678_2_jpg.rf.7b5aadcaa92a588562b480142acef813.jpg",
		"/home/aabiji/Downloads/train/20083014_4_jpg.rf.3c881f5d781659ee6e0caa958628011d.jpg",
		"/home/aabiji/Downloads/train/20004163_5_jpg.rf.fc90c2cf88d7c1951c22de0c345f5404.jpg",
	}
	if err := RunScanner(paths[1]); err != nil {
		panic(err)
	}
}

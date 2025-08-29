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
	server, err := NewServer()
	if err != nil {
		panic(err)
	}

	r := gin.Default()
	r.MaxMultipartMemory = 8 << 20 // max form size = 8 megabytes
	r.Use(CORSMiddleware())

	auth := r.Group("/auth")
	auth.Use(AuthMiddleware(&server))

	r.POST("/login", server.Login)
	r.POST("/signup", server.Signup)
	r.POST("/nutrition/barcode", server.ProcessFoodBarcode)

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
}

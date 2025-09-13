package main

import (
	"github.com/gin-gonic/gin"
)

func main() {
	server, err := NewServer()
	if err != nil {
		panic(err)
	}

	gin.SetMode(gin.DebugMode)
	r := gin.Default()
	r.Use(CORSMiddleware())

	auth := r.Group("/auth")
	auth.Use(AuthMiddleware(&server))

	r.POST("/login", server.Login)
	r.POST("/signup", server.Signup)
	auth.POST("/user", server.UserInfo)
	auth.DELETE("/user", server.DeleteUser)
	auth.POST("/settings", server.UpdateSettings)

	auth.POST("/workout", server.CreateWorkout)
	auth.DELETE("/workout", server.DeleteWorkout)

	auth.POST("/period", server.MarkPeriod)

	auth.POST("/weight", server.SetWeight)

	auth.POST("/food", server.CreateFood)
	auth.GET("/food/search", server.FindFood)
	auth.GET("/food/id", server.GetFoodByID)

	auth.POST("/meal/date", server.CreateFoodLog)
	auth.POST("/meal", server.CreateMeal)
	auth.DELETE("/meal", server.DeleteMeal)

	r.Run("0.0.0.0:8080")
	server.Cleanup()
}

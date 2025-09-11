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

	r.POST("/login", server.LoginEndpoint)
	r.POST("/signup", server.SignupEndpoint)
	auth.POST("/user", server.UserInfoEndpoint)
	auth.DELETE("/user", server.DeleteUserEndpoint)
	auth.POST("/settings", server.UpdateSettingsEndpoint)

	auth.POST("/workout", server.CreateWorkoutEndpoint)
	auth.DELETE("/workout", server.DeleteWorkoutEndpoint)

	auth.POST("/period", server.MarkPeriodEndpoint)

	auth.POST("/weight", server.SetWeightEndpoint)

	r.Run("0.0.0.0:8080")
	server.Cleanup()
}

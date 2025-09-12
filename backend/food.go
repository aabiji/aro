package main

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

type Food struct {
	ID               string    `json:"id,omitempty"`
	Name             string    `json:"name"`
	ServingSizes     []float64 `json:"servingSizes"`
	ServingSizeUnits []string  `json:"servingUnits"`

	// per 1 g, TODO: include more macro/micro nutrients
	Calories      float64 `json:"calories"`
	Protein       float64 `json:"protein"`
	Carbohydrates float64 `json:"carbohydrates"`
	Fat           float64 `json:"fat"`
	Cholesterol   float64 `json:"cholesterol"`
	Calcium       float64 `json:"calcium"`
	Sodium        float64 `json:"sodium"`
	Magnesium     float64 `json:"magnesium"`
	Potassium     float64 `json:"potassium"`
}

type Meal struct {
	ID           int    `json:"id,omitempty"`
	Name         string `json:"name,omitempty"`
	Date         string `json:"date,omitempty"`
	Children     []int  `json:"children,omitempty"`
	FoodID       int    `json:"foodID,omitempty"`
	Servings     int    `json:"servings,omitempty"`
	ServingIndex int    `json:"servingIndex,omitempty"`
}

func createMeal(meal Meal) (uint, error) {
	return 0, nil
}

func (s *Server) CreateFood(c *gin.Context) {
	var req Food
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
}

func (s *Server) SearchForFood(c *gin.Context) {
	_, exists := c.GetQuery("query")
	if !exists {
		c.JSON(StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	c.JSON(StatusOK, gin.H{"results": []Food{}})
}

func (s *Server) CreateMeal(c *gin.Context) {
	var req Meal
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(StatusOK, gin.H{"id": 0})
}

func (s *Server) CreateMealsForDay(c *gin.Context) {
	date, exists := c.GetQuery("date")
	if !exists {
		c.JSON(StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	user := c.MustGet("user").(*User)

	ids := []uint{}
	for _, name := range user.ScheuledMeals {
		id, err := createMeal(Meal{Name: name, Date: date})
		if err != nil {
			c.JSON(StatusInternalServerError, gin.H{"error": "Coudln't create meals"})
			return
		}
		ids = append(ids, id)
	}

	c.JSON(StatusOK, gin.H{"ids": ids})
}

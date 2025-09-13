package main

import (
	"strconv"
	"time"

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
	ID       uint   `json:"id,omitempty"`
	ParentID uint   `json:"parentID,omitempty"`
	FoodID   uint   `json:"foodID"`
	Children []Meal `json:"children"`

	Name        string `json:"name"`
	Servings    int    `json:"servings,omitempty"`
	ServingSize int    `json:"servingSize,omitempty"`
	ServingUnit string `json:"servingUnit,omitempty"`
}

type DailyFoodLog struct {
	Date    string `json:"date"`
	MealIDs []uint `json:"meals"`
}

func createMeal(s *Server, meal Meal, userID, parentID uint) (Meal, error) {
	sql := `
		insert into Meals
		(LastModified, Deleted, UserID, ParentID, FoodID,
		 Name, Servings, ServingSize, ServingUnit)
		values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		returning ID;`

	temp := meal
	err := s.db.QueryRow(s.ctx, sql, time.Now(), false, userID, meal.ParentID,
		meal.FoodID, meal.Name, meal.Servings, meal.ServingSize, meal.ServingUnit).Scan(&temp.ID)
	if err != nil {
		return Meal{}, err
	}

	for i, child := range meal.Children {
		tempChild, err := createMeal(s, child, userID, temp.ID)
		if err != nil {
			return Meal{}, err
		}
		temp.Children[i].ID = tempChild.ID
	}

	return temp, nil
}

// NOTE: Users will not be allowed to delete scheduled
// meals or the meals that make up the daily food logs
func deleteMeal(s *Server, meal Meal, userID uint) error {
	sql := `update Meals set Deleted = true, LastModified = $1 where UserID = $2 and ID = $3;`
	if _, err := s.db.Exec(s.ctx, sql, time.Now(), userID, meal.ID); err != nil {
		return err
	}

	for _, child := range meal.Children {
		if err := deleteMeal(s, child, userID); err != nil {
			return err
		}
	}
	return nil
}

func getFoodLogs(s *Server, options FetchOptions) ([]DailyFoodLog, error) {
	scanLog := func(rows pgx.Rows) (DailyFoodLog, error) {
		var l DailyFoodLog
		err := rows.Scan(&l.Date, &l.MealIDs)
		return l, err
	}

	sql := `select Deleted, Date, MealIDs from DailyFoodLogs
			where UserID = $1  and LastModified >= $2
			order by DailyFoodLogs.Date desc
			limit $3 offset $4;`
	logs, err := fetchRows(s, sql, scanLog, options.userID,
		options.timestamp, options.limit, options.page)
	if err != nil {
		return nil, err
	}

	return logs, nil
}

func (s *Server) CreateFood(c *gin.Context) {
	var req Food
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	sql := `
		insert into Foods
		(LastModified, Name, ServingSizes, ServingSizeUnits, Calories,
		 Protein, Carbohydrates, Fat, Cholesterol, Calcium, Sodium, Magnesium, Potassium)
		values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		returning ID;`

	var foodID uint
	err := s.db.QueryRow(s.ctx, sql, time.Now(), req.Name, req.ServingSizes,
		req.ServingSizeUnits, req.Calories, req.Protein, req.Carbohydrates, req.Fat,
		req.Cholesterol, req.Calcium, req.Sodium, req.Magnesium, req.Potassium)
	if err != nil {
		c.JSON(StatusInternalServerError, gin.H{"error": "Coudln't create food"})
		return
	}

	c.JSON(StatusOK, gin.H{"foodID": foodID})
}

// TODO!
func (s *Server) FindFood(c *gin.Context) {
	_, exists := c.GetQuery("query")
	if !exists {
		c.JSON(StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	c.JSON(StatusOK, gin.H{"results": []Food{}})
}

func (s *Server) GetFoodByID(c *gin.Context) {
	idStr, exists := c.GetQuery("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if !exists || err != nil {
		c.JSON(StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	scanFood := func(rows pgx.Rows) (Food, error) {
		var f Food
		err := rows.Scan(&f.Name, &f.ServingSizes, &f.ServingSizeUnits, &f.Calories,
			&f.Protein, &f.Carbohydrates, &f.Fat, &f.Cholesterol, &f.Calcium,
			&f.Sodium, &f.Magnesium, &f.Potassium)
		return f, err
	}

	sql := `
		select Name, ServingSizes, ServingSizeUnits, Calories,
		 Protein, Carbohydrates, Fat, Cholesterol, Calcium, Sodium, Magnesium, Potassium
		from Foods where ID = $1;`
	foods, err := fetchRows(s, sql, scanFood, id)
	if err != nil {
		c.JSON(StatusInternalServerError, gin.H{"error": "Couldn't find food"})
		return
	}

	c.JSON(StatusOK, gin.H{"food": foods[0]})
}

func (s *Server) CreateMeal(c *gin.Context) {
	var req Meal
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	user := c.MustGet("user").(*User)

	meal, err := createMeal(s, req, user.ID, req.ParentID)
	if err != nil {
		c.JSON(StatusInternalServerError, gin.H{"error": "Couldn't create meal"})
		return
	}

	c.JSON(StatusOK, gin.H{"updatedMeal": meal})
}

func (s *Server) DeleteMeal(c *gin.Context) {
	var req Meal
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	user := c.MustGet("user").(*User)

	if err := deleteMeal(s, req, user.ID); err != nil {
		c.JSON(StatusInternalServerError, gin.H{"error": "Couldn't delete meal"})
		return
	}

	c.JSON(StatusOK, gin.H{})
}

func (s *Server) CreateFoodLog(c *gin.Context) {
	date, exists := c.GetQuery("date")
	if !exists {
		c.JSON(StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	user := c.MustGet("user").(*User)

	ids := []uint{}
	for _, name := range user.ScheuledMeals {
		meal, err := createMeal(s, Meal{Name: name, Children: []Meal{}}, user.ID, 0)
		if err != nil {
			c.JSON(StatusInternalServerError, gin.H{"error": "Couldn't create meal"})
			return
		}
		ids = append(ids, meal.ID)
	}

	sql := `
		insert into DailyFoodLogs
		(LastModified, Deleted, UserID, Date, MealIDs)
		values ($1, $2, $3, $4, $5) returning ID;`
	_, err := s.db.Exec(s.ctx, sql, time.Now(), false, user.ID, date, ids)
	if err != nil {
		c.JSON(StatusInternalServerError, gin.H{"error": "Coudln't create food log"})
		return
	}

	c.JSON(StatusOK, gin.H{"mealIDs": ids})
}

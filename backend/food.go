package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
)

// query the OpenFoodFacts api, either searching by term or by barcode
// return a list product info objects
func GetProducts(value, mobileOS string, valueIsBarcode bool) ([]map[string]any, error) {
	// either for searching by term or for searching by barcode
	base := "https://world.openfoodfacts.org/cgi/search.pl?search_terms=%s&search_simple=1&action=process&json=1"
	if valueIsBarcode {
		base = "https://world.openfoodfacts.org/api/v2/product/%s"
	}

	request, err := http.NewRequest("GET", fmt.Sprintf(base, value), nil)
	if err != nil {
		return nil, err
	}
	request.Header.Add("User-Agent", fmt.Sprintf("aro - %s - Version 2.1 - https://aro.com - scan", mobileOS))

	client := &http.Client{}
	response, err := client.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.StatusCode != 200 {
		return nil, fmt.Errorf("failed to query OpenFoodFacts")
	}

	body, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, err
	}

	data := map[string]any{}
	err = json.Unmarshal(body, &data)
	if err != nil {
		return nil, err
	}

	// searching by barcode returns 1 product
	if valueIsBarcode {
		info, ok := data["product"].(map[string]any)
		if !ok {
			return nil, fmt.Errorf("'product' key not found")
		}
		return []map[string]any{info}, nil
	}

	// searching by search terms return many products
	list := []map[string]any{}
	products, ok := data["products"].([]any)
	if !ok {
		return nil, fmt.Errorf("'products' key not found")
	}
	for _, obj := range products {
		info, ok := obj.(map[string]any)
		if !ok {
			return nil, fmt.Errorf("invalid response format")
		}
		list = append(list, info)
	}

	return list, err
}

func ParseProductInfo(info map[string]any) (Food, error) {
	var err error
	food, ok := Food{}, true

	food.Name, ok = info["product_name"].(string)
	if !ok {
		return food, fmt.Errorf("couldn't get product name")
	}

	sizeStr, ok := info["serving_quantity"].(string)
	if !ok {
		return food, fmt.Errorf("couldn't get serving size")
	}
	food.ServingSize, err = strconv.Atoi(sizeStr)
	if err != nil {
		return food, fmt.Errorf("couldn't get serving size")
	}

	food.ServingUnit, ok = info["serving_quantity_unit"].(string)
	if !ok {
		return food, fmt.Errorf("couldn't get serving size unit")
	}

	nutrients, ok := info["nutrients"].(map[string]any)
	if !ok {
		return food, fmt.Errorf("couldn't get nutrients")
	}

	for n := range nutrients {
		haveRequiredKeys := true
		for _, s := range []string{"_unit", "_serving"} {
			if _, ok := nutrients[fmt.Sprintf("%s%s", n, s)]; !ok {
				haveRequiredKeys = false
			}
		}

		if len(strings.Split(n, "_")) == 1 && haveRequiredKeys {
			food.Nutrients = append(food.Nutrients, Nutrient{
				Name:  strings.ToLower(n),
				Unit:  nutrients[fmt.Sprintf("%s_unit", n)].(string),
				Value: nutrients[fmt.Sprintf("%s_serving", n)].(float64),
			})
		}
	}

	return food, nil
}

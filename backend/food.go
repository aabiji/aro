package main

import (
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/Jeffail/gabs"
)

type Nutriment struct {
	Name            string  `json:"name"`
	Unit            string  `json:"unit"`
	ValuePer100g    float64 `json:"per_100g"`
	ValuePerServing float64 `json:"per_serving"`
}

type Food struct {
	Name       string      `json:"name"`
	Nutriments []Nutriment `json:"nutriments"`
}

func queryOpenFoodFacts(barcode, mobileOS string) (*gabs.Container, error) {
	url := fmt.Sprintf("https://world.openfoodfacts.org/api/v2/product/%s", barcode)
	request, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	request.Header.Add("Content-Type", "application/json")
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

	json, err := gabs.ParseJSON(body)
	return json, err
}

func getFoodInfo(barcode, mobileOS string) (Food, error) {
	// parse the openfoodfacts json response
	json, err := queryOpenFoodFacts(barcode, mobileOS)
	if err != nil {
		return Food{}, err
	}

	name, ok := json.Path("product.product_name").Data().(string)
	if !ok {
		return Food{}, fmt.Errorf("couldn't get product name")
	}

	info, ok := json.Path("product.nutriments").Data().(map[string]any)
	if !ok {
		fmt.Println("couldn't get nutriments")
	}

	nutrimentNames := []string{}
	for key, _ := range info {
		if len(strings.Split(key, "_")) == 1 {
			nutrimentNames = append(nutrimentNames, key)
		}
	}

	nutriments := []Nutriment{}
	for _, n := range nutrimentNames {
		nutriment := Nutriment{
			Name:            strings.ToLower(n),
			Unit:            info[fmt.Sprintf("%s_unit", n)].(string),
			ValuePer100g:    info[fmt.Sprintf("%s_100g", n)].(float64),
			ValuePerServing: info[fmt.Sprintf("%s_serving", n)].(float64),
		}
		nutriments = append(nutriments, nutriment)
	}

	return Food{Name: name, Nutriments: nutriments}, nil
}

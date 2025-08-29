package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

func queryOpenFoodFacts() error {
	barcode, mobileOS := "065633226180", "android"

	url := fmt.Sprintf("https://world.openfoodfacts.org/api/v2/product/%s", barcode)
	request, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return err
	}
	request.Header.Add("Content-Type", "application/json")
	request.Header.Add("User-Agent", fmt.Sprintf("aro - %s - Version 2.1 - https://aro.com - scan", mobileOS))

	client := &http.Client{}
	resp, err := client.Do(request)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("failed to query OpenFoodFacts")
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	response := map[string]any{}
	err = json.Unmarshal(body, &response)
	if err != nil {
		return err
	}

	fmt.Println(response)

	return nil
}

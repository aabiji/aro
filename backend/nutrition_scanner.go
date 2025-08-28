package main

import (
	"fmt"

	"github.com/otiai10/gosseract/v2"
)

// TODO: find a better model...tesseract is trash
func RunScanner() {
	client := gosseract.NewClient()
	defer client.Close()

	path := "/home/aabiji/Downloads/train/20608231_2_jpg.rf.c3e5d53d735364214cc7f20aab7b8ebf.jpg"
	client.SetPageSegMode(11) // sparse text
	client.SetImage(path)
	text, _ := client.Text()
	fmt.Println(text)
}

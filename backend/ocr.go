package main

import (
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/jpeg"
	"log"
	"os"
	"os/exec"
	"strconv"
	"strings"
)

func runEasyOCR(imagePath string) (string, error) {
	// run the easyocr command, installing it if needed, and return the output
	commands := []string{
		"python3", "-m venv .venv",
		"pip", "install easyocr",
		"./.venv/bin/easyocr", fmt.Sprintf("-l en -f %s", imagePath),
	}

	start := 4
	if _, err := os.Stat("./.venv/bin/easyocr"); os.IsNotExist(err) {
		start = 0
	} else if err != nil {
		return "", err
	}

	output := ""
	for i := start; i < len(commands); i += 2 {
		cmd := exec.Command(commands[i], strings.Split(commands[i+1], " ")...)
		stdout, err := cmd.Output()
		if err != nil {
			return "", err
		}
		output += string(stdout)
	}

	return output, nil
}

func parseEasyOcrResult(line string) (string, float64, []float64, error) {
	// parse the list of coordinates for the bounding box
	// example input: [[a, b], [c, d], [e, f], [g, h]]
	list := line[strings.Index(line, "["):strings.LastIndex(line, "]")]

	ignored := []string{"np.int32(", "np.float32(", "np.float64(", ")", "[", "]"}
	for _, ignore := range ignored {
		list = strings.ReplaceAll(list, ignore, "")
	}

	boundingBox := []float64{}
	for _, numStr := range strings.Split(list, ", ") {
		n, err := strconv.ParseFloat(numStr, 64)
		if err != nil {
			return "", -1, nil, err
		}
		boundingBox = append(boundingBox, n)
	}

	// parse the detected text, example input: 'example'
	ending := line[strings.LastIndex(line, "]")+2:]
	parts := strings.Split(ending, ",")

	text := strings.TrimSpace(parts[0])
	text = text[1 : len(text)-1] // remove quotes

	// parse the confidence level, example input: ', np.float32(1.10101))'
	numStr := parts[1][strings.Index(parts[1], "(")+1 : len(parts[1])-2]
	confidence, err := strconv.ParseFloat(numStr, 64)
	if err != nil {
		return "", -1, nil, err
	}

	return text, confidence, boundingBox, nil
}

func drawRect(img draw.Image, c color.RGBA, thickness int,
	topLeftX, topLeftY, topRightX, bottomLeftY int) {
	// draw top and bottom sides
	for x := topLeftX; x <= topRightX; x++ {
		for i := 0; i < thickness; i++ {
			img.Set(x, topLeftY+i, c)
			img.Set(x, bottomLeftY-i, c)
		}
	}
	// draw left and right sides
	for y := topLeftY; y <= bottomLeftY; y++ {
		for i := 0; i < thickness; i++ {
			img.Set(topLeftX+i, y, c)
			img.Set(topRightX-i, y, c)
		}
	}
}

func visualizeImage(inputImage string, outputImage string, boundingBoxes [][]float64) error {
	reader, err := os.Open(inputImage)
	if err != nil {
		return err
	}
	defer reader.Close()
	original, err := jpeg.Decode(reader)
	if err != nil {
		return err
	}

	img := image.NewRGBA(original.Bounds())
	draw.Draw(img, img.Bounds(), original, image.Point{}, draw.Src)

	for _, boundingBox := range boundingBoxes {
		drawRect(img, color.RGBA{0, 255, 0, 255}, 1, int(boundingBox[0]),
			int(boundingBox[1]), int(boundingBox[2]), int(boundingBox[7]))
	}

	output, err := os.Create(outputImage)
	if err != nil {
		return err
	}
	defer output.Close()
	return jpeg.Encode(output, img, nil)
}

// TODO: how to map nutrient info to value -- what are some good general heuristics?
func RunScanner(imagePath string) error {
	result, err := runEasyOCR(imagePath)
	if err != nil {
		return err
	}

	boundingBoxes := [][]float64{}
	rows := map[int][]string{}

	for _, line := range strings.Split(strings.TrimSpace(result), "\n") {
		text, confidence, box, err := parseEasyOcrResult(line)
		if err != nil {
			log.Printf("Failed to parse EasyOCR result: %s\n", err.Error())
			continue
		}
		if confidence < 0.1 {
			continue
		}
		boundingBoxes = append(boundingBoxes, box)

		topLeft := int(box[1])
		rounded := topLeft - (topLeft % 10)

		existing, ok := rows[rounded]
		if !ok {
			rows[rounded] = []string{text}
		} else {
			existing = append(existing, text)
			rows[rounded] = existing
		}
	}

	for topLeft, texts := range rows {
		log.Println("Row Y:", topLeft, "Values:", texts)
	}
	return visualizeImage(imagePath, "output.jpg", boundingBoxes)
}

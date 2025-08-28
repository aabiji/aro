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
	"sort"
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

type Detection struct {
	Text       string
	MinX, MaxX float64
	MinY, MaxY float64
	CenterY    float64
}

func getDetections(imagePath string) ([]Detection, error) {
	result, err := runEasyOCR(imagePath)
	if err != nil {
		return nil, err
	}
	detections := []Detection{}

	for _, line := range strings.Split(strings.TrimSpace(result), "\n") {
		text, confidence, box, err := parseEasyOcrResult(line)
		if err != nil {
			log.Printf("Failed to parse EasyOCR result: %s\n", err.Error())
			continue
		}
		if confidence < 0.1 {
			continue
		}
		// box order: top left, top right, bottom right, bottom left
		detections = append(detections, Detection{
			Text: text, MinX: box[0], MaxX: box[2],
			MinY: box[1], MaxY: box[5],
			CenterY: (box[1] + box[7]) / 2,
		})
	}
	return detections, nil
}

func visualizeDetections(inputImage string, outputImage string, detections []Detection) error {
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

	// draw bounding boxes
	c := color.RGBA{0, 255, 0, 255}
	for _, d := range detections {
		// draw top and bottom sides
		for x := d.MinX; x <= d.MaxX; x++ {
			img.Set(int(x), int(d.MinY), c)
			img.Set(int(x), int(d.MaxY), c)
		}
		// draw left and right sides
		for y := d.MinY; y <= d.MaxY; y++ {
			img.Set(int(d.MinX), int(y), c)
			img.Set(int(d.MaxX), int(y), c)
		}
	}

	output, err := os.Create(outputImage)
	if err != nil {
		return err
	}
	defer output.Close()
	return jpeg.Encode(output, img, nil)
}

func getDetectionRows(detections []Detection) [][]int {
	sort.Slice(detections, func(i, j int) bool { // sort top to bottom
		return detections[i].CenterY < detections[j].CenterY
	})

	// assign detections to rows that they vertically overlap with
	rows := [][]int{}
	row := []int{0}
	rowTop, rowBottom := detections[0].MinY, detections[0].MaxY

	for i := 1; i < len(detections); i++ {
		// check if the detection overlaps with the row
		top, bottom := detections[i].MinY, detections[i].MaxY
		yOverlap := min(rowBottom, bottom) - max(rowTop, top)
		threshold := min(rowBottom-rowTop, bottom-top) * 0.5

		if yOverlap >= threshold {
			// same row
			rowTop, rowBottom = min(rowTop, top), max(rowBottom, bottom)
			row = append(row, i)
		} else {
			// new row
			rowTop, rowBottom = top, bottom
			sort.Slice(row, func(i, j int) bool { // sort left to right
				return detections[row[i]].MinX < detections[row[j]].MinX
			})
			rows = append(rows, row)
			row = []int{i}
		}
	}

	rows = append(rows, row)
	return rows
}

func RunScanner(inputImage, outputImage string) error {
	detections, err := getDetections(inputImage)
	if err != nil {
		return err
	}
	rows := getDetectionRows(detections)

	for _, row := range rows {
		for _, j := range row {
			fmt.Printf("%s ", detections[j].Text)
		}
		fmt.Printf("\n")
	}
	if err := visualizeDetections(inputImage, outputImage, detections); err != nil {
		return err
	}

	return nil
}

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
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

func runOCR(imagePath string) (string, error) {
	base := filepath.Base(imagePath)
	extension := filepath.Ext(imagePath)[1:]
	tempFile1 := fmt.Sprintf("/tmp/%s-1.%s", base, extension)
	tempFile2 := fmt.Sprintf("/tmp/%s-2.%s", base, extension)

	// preprocess the image using imagemagick,
	// run the easyocr command, installing it if needed, and return the output
	commands := []string{
		"python3", "-m venv .venv",
		"pip", "install easyocr",
		"magick", fmt.Sprintf("%s -colorspace Gray %s", imagePath, tempFile1),
		"magick", fmt.Sprintf("%s -despeckle %s", tempFile1, tempFile2),
		"./.venv/bin/easyocr", fmt.Sprintf("-l en -f %s", tempFile2),
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

	if err := os.Remove(tempFile1); err != nil {
		return "", err
	}
	if err := os.Remove(tempFile2); err != nil {
		return "", err
	}

	return output, nil
}

func parseEasyOcrResult(line string) (string, float64, []float64, error) {
	// parse the list of coordinates for the bounding box
	// example input: [[a, b], [c, d], [e, f], [g, h]]
	list := line[strings.Index(line, "["):strings.LastIndex(line, "]]")]

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
	comma := strings.LastIndex(ending, ",")

	textPart := strings.ReplaceAll(strings.ReplaceAll(ending[:comma], "'", ""), `"`, "")
	text := strings.TrimSpace(textPart)

	// parse the confidence level, example input: ', np.float32(1.10101))'
	numStr := ending[strings.LastIndex(ending, "(")+1 : len(ending)-2]
	confidence, err := strconv.ParseFloat(numStr, 64)
	if err != nil {
		return "", -1, nil, err
	}

	return text, confidence, boundingBox, nil
}

type detection struct {
	text       string
	minx, maxX float64
	minY, maxY float64
	centerY    float64
}

func getDetections(imagePath string) ([]detection, error) {
	result, err := runOCR(imagePath)
	if err != nil {
		return nil, err
	}
	detections := []detection{}

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
		detections = append(detections, detection{
			text: text, minx: box[0], maxX: box[2],
			minY: box[1], maxY: box[5],
			centerY: (box[1] + box[7]) / 2,
		})
	}
	return detections, nil
}

func getDetectionRows(detections []detection) [][]int {
	sort.Slice(detections, func(i, j int) bool { // sort top to bottom
		return detections[i].centerY < detections[j].centerY
	})

	// assign detections to rows that they vertically overlap with
	rows := [][]int{}
	row := []int{0}
	rowTop, rowBottom := detections[0].minY, detections[0].maxY

	for i := 1; i < len(detections); i++ {
		// check if the detection overlaps with the row
		top, bottom := detections[i].minY, detections[i].maxY
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
				return detections[row[i]].minx < detections[row[j]].minx
			})
			rows = append(rows, row)
			row = []int{i}
		}
	}

	rows = append(rows, row)
	return rows
}

// NOTE: will eventually remove the 2 following functions
func visualizeDetections(inputImage string, outputImage string, detections []detection) error {
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
		for x := d.minx; x <= d.maxX; x++ {
			img.Set(int(x), int(d.minY), c)
			img.Set(int(x), int(d.maxY), c)
		}
		// draw left and right sides
		for y := d.minY; y <= d.maxY; y++ {
			img.Set(int(d.minx), int(y), c)
			img.Set(int(d.maxX), int(y), c)
		}
	}

	output, err := os.Create(outputImage)
	if err != nil {
		return err
	}
	defer output.Close()
	return jpeg.Encode(output, img, nil)
}

func RunScanner(inputPath, outputPath string) error {
	detections, err := getDetections(inputPath)
	if err != nil {
		return err
	}
	rows := getDetectionRows(detections)

	for _, row := range rows {
		for _, i := range row {
			item := strings.ToLower(detections[i].text)
			fmt.Println(item)
		}
	}

	// for now we'll need:
	// serving size ("per x"), calories, lipids, carbs, protein
	// (will fill out the rest later)

	if err := visualizeDetections(inputPath, outputPath, detections); err != nil {
		return err
	}

	return nil
}

func ExtractnutritionalInfo(imagePath string) (map[string]int, error) {
	detections, err := getDetections(imagePath)
	if err != nil {
		return nil, err
	}
	_ = getDetectionRows(detections)

	// TODO: parse the rows!
	results := map[string]int{"calories": 100}
	return results, nil
}

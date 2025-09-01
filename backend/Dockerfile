# stage 1: build the app
FROM golang:1.24 AS builder

WORKDIR /app

# cache depende .ncies, copy the rest of the source and build
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

# stage 2: run the app
FROM debian:bullseye-slim

# get ca certificates
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/server .

CMD ["./server"]

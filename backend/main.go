package main

import (
	"encoding/json"
	"fmt"
	"net/http"
)

// http response middleware
type JSONResponseWriter struct {
	http.ResponseWriter
	responseStatus int
	response       any
}

func (w *JSONResponseWriter) Respond(status int, response any) {
	w.responseStatus = status
	w.response = response
}

func JSONResponseHandler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		writer := &JSONResponseWriter{ResponseWriter: w}
		next.ServeHTTP(writer, r)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(writer.responseStatus)

		if err := json.NewEncoder(w).Encode(writer.response); err != nil {
			http.Error(w, "error encoding json", http.StatusInternalServerError)
		}
	})
}

// CORS middleware
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		allowedOrigins := []string{"https://localhost:8081"}
		for _, allowed := range allowedOrigins {
			if origin == allowed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			}
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	server, err := NewServer()
	if err != nil {
		panic(err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/login", server.HandleLogin)
	mux.HandleFunc("/signup", server.HandleSignup)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
		}
	})

	fmt.Println("Starting the server on port :8080")
	handler := CORS(JSONResponseHandler(mux))
	http.ListenAndServe(":8080", handler)
}

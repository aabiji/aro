package main

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func createToken(userId string, secret string) (string, error) {
	expiry := time.Now().AddDate(0, 0, 100) // 100 days out
	claims := jwt.MapClaims{"sub": userId, "exp": expiry.Unix()}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func verifyToken(tokenStr string, secret string) (*jwt.Token, error) {
	return jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})
}

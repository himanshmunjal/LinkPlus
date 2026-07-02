package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"os"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims is the JWT payload embedded in every access token.
type Claims struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

var (
	ErrInvalidToken = errors.New("token is invalid")
	ErrExpiredToken = errors.New("token has expired")
)

func jwtSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		panic("JWT_SECRET environment variable is not set")
	}
	return []byte(secret)
}

func jwtTTL() time.Duration {
	if raw := os.Getenv("JWT_TTL_HOURS"); raw != "" {
		if hours, err := strconv.Atoi(raw); err == nil && hours > 0 {
			return time.Duration(hours) * time.Hour
		}
	}
	return 24 * time.Hour
}

// GenerateToken creates a signed JWT for the given user including their role.
func GenerateToken(userID uint, username, email, role string) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID:   userID,
		Username: username,
		Email:    email,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   strconv.FormatUint(uint64(userID), 10),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(jwtTTL())),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret())
}

// ParseToken validates a raw token string and returns its claims.
func ParseToken(raw string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(raw, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return jwtSecret(), nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

func GenerateRefreshToken() (raw string, hash string, err error) {
    b := make([]byte, 32)
    if _, err = rand.Read(b); err != nil {
        return
    }
    raw = base64.URLEncoding.EncodeToString(b)
    h := sha256.Sum256([]byte(raw))
    hash = hex.EncodeToString(h[:])
    return
}

func HashToken(raw string) string {
    h := sha256.Sum256([]byte(raw))
    return hex.EncodeToString(h[:])
}
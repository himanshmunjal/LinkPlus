package middleware

import (
	"backend/internals/auth"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const (
	ContextUserID   = "userID"
	ContextUsername = "username"
	ContextEmail    = "userEmail"
	ContextRole     = "userRole"
)

// RequireAuth validates the Bearer token and injects user claims into context.
func RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "authorization header is required",
			})
			return
		}

		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "authorization header format must be: Bearer <token>",
			})
			return
		}

		claims, err := auth.ParseToken(parts[1])
		if err != nil {
			msg := "invalid token"
			if err == auth.ErrExpiredToken {
				msg = "token has expired"
			}
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": msg})
			return
		}

		c.Set(ContextUserID, claims.UserID)
		c.Set(ContextUsername, claims.Username)
		c.Set(ContextEmail, claims.Email)
		c.Set(ContextRole, claims.Role)

		c.Next()
	}
}

// RequireAdmin builds on RequireAuth — it first validates the token then
// checks that the caller has the "admin" role. Non-admins get 403.
func RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, _ := c.Get(ContextRole)
		if role != "admin" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "admin access required",
			})
			return
		}
		c.Next()
	}
}

// CurrentUserID reads the authenticated user's ID from context.
func CurrentUserID(c *gin.Context) uint {
	id, _ := c.Get(ContextUserID)
	userID, _ := id.(uint)
	return userID
}

// CurrentRole reads the authenticated user's role from context.
func CurrentRole(c *gin.Context) string {
	role, _ := c.Get(ContextRole)
	r, _ := role.(string)
	return r
}

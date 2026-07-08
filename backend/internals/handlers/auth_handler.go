package handlers

import (
	"backend/internals/middleware"
	"backend/internals/service"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService *service.AuthService
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

type signupBody struct {
	Username string `json:"username" binding:"required,min=3,max=30"`
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

type loginBody struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// POST /api/v1/auth/signup
func (h *AuthHandler) Signup(c *gin.Context) {
	var body signupBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.authService.Signup(service.SignupRequest{
		Username: body.Username,
		Email:    body.Email,
		Password: body.Password,
	})
	if err != nil {
		status := conflictOrInternal(err)
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, resp)
}

// POST /api/v1/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var body loginBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.authService.Login(service.LoginRequest{
		Email:    body.Email,
		Password: body.Password,
	})
	if err != nil {
		status := http.StatusUnauthorized
		if !errors.Is(err, service.ErrInvalidCreds) {
			status = http.StatusInternalServerError
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// GET /api/v1/auth/me  (protected)
func (h *AuthHandler) Me(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"user_id":  middleware.CurrentUserID(c),
		"username": c.GetString(middleware.ContextUsername),
		"email":    c.GetString(middleware.ContextEmail),
		"role":     middleware.CurrentRole(c),
	})
}

func conflictOrInternal(err error) int {
	if errors.Is(err, service.ErrEmailTaken) ||
		errors.Is(err, service.ErrUsernameTaken) ||
		errors.Is(err, service.ErrWeakPassword) {
		return http.StatusConflict
	}
	return http.StatusInternalServerError
}

// POST /api/v1/auth/refresh
func(h *AuthHandler) Refresh(c *gin.Context){
	var req struct{
		RefreshToken string `json:"refresh_token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err!=nil{
		c.JSON(http.StatusBadRequest, gin.H{"error": "refresh_token required"})
        return
	}
	
	newAccess, newRefresh, err := h.authService.Rotate(req.RefreshToken)
	if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
        return
    }
	c.JSON(http.StatusOK, gin.H{
        "access_token":  newAccess,
        "refresh_token": newRefresh,
    })
}
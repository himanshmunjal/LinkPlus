package handlers

import (
	"backend/internals/middleware"
	"backend/internals/service"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type CreateURLRequest struct {
	URL string `json:"url" binding:"required,url"`
	ExpiresIn int    `json:"expires_in"`
}

type URLHandler struct {
	URLService       *service.URLService
	AnalyticsService *service.URLAnalytics
}

func NewURLHandler(urlService *service.URLService, analyticsService *service.URLAnalytics) *URLHandler {
	return &URLHandler{
		URLService:       urlService,
		AnalyticsService: analyticsService,
	}
}

// POST /api/v1/url
func (h *URLHandler) CreateShortURL(c *gin.Context) {
	var req CreateURLRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// User ID comes from the validated JWT — no more hardcoded 1
	userID := middleware.CurrentUserID(c)

	var expiresAt *time.Time
    if req.ExpiresIn > 0 {
        t := time.Now().Add(time.Duration(req.ExpiresIn) * time.Hour)
        expiresAt = &t
    }

	res, err := h.URLService.CreateShortURL(req.URL, int(userID), expiresAt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
	}

	c.JSON(http.StatusCreated, gin.H{
		"original_url": res.OriginalURL,
		"short_code":   res.ShortCode,
		"click_count":  res.ClickCount,
	})
}

// GET /r/:code  (public)
func (h *URLHandler) RedirectURL(c *gin.Context) {
	shortCode := c.Param("code")
	if shortCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "short code is required"})
		return
	}

	originalURL, err := h.URLService.Resolve(shortCode)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "short code not found"})
		return
	}

	// go h.URLService.IncrementClickCount(shortCode)
	go h.AnalyticsService.RecordClick(shortCode, c.Request.UserAgent(), c.ClientIP())

	c.Redirect(http.StatusFound, originalURL)
}

// GET /api/v1/url  (protected — returns URLs owned by the logged-in user)
func (h *URLHandler) GetMyURLs(c *gin.Context) {
	userID := middleware.CurrentUserID(c)
	urls, err := h.URLService.GetURLsByUserID(int(userID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, urls)
}

// DELETE /api/v1/url/:code  (protected)
func (h *URLHandler) DeleteURL(c *gin.Context) {
	shortCode := c.Param("code")
	if shortCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "short code is required"})
		return
	}
	if err := h.URLService.DeleteURL(shortCode); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

// func(h *URLHandler) CreateShortURL(c *gin.Context){
// 	var req CreateURLRequest

// 	if err := c.ShouldBindJSON(&req); err != nil {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
// 		return
// 	}

// 	res, err := h.URLService.CreateShortURL(req.URL, 1)
// 	if err!= nil{
// 		c.JSON(http.StatusInternalServerError, gin.H{
// 			"error": err.Error(),
// 		})
// 		return
// 	}

// 	c.JSON(http.StatusCreated, gin.H{
// 		"original_url": res.OriginalURL,
// 		"short_code": res.ShortCode,
// 		"click_count":res.ClickCount,
// 	})
// }

// func(h *URLHandler) RedirectURL(c *gin.Context){
// 	shortCode := c.Param("code")

// 	if shortCode==""{
// 		c.JSON(http.StatusBadRequest, gin.H{
// 			"error":"Short code is required",
// 		})
// 		return
// 	}

// 	originalURL, err := h.URLService.Resolve(shortCode)
	
// 	if err != nil{
// 		c.JSON(http.StatusNotFound, gin.H{"error": "short code not found"})
// 		return
	
// 	}
// 	go h.URLService.IncrementClickCount(shortCode)

// 	userAgent := c.Request.UserAgent()
// 	h.AnalyticsService.RecordClick(shortCode, userAgent)
// 	fmt.Println("Redirecting to:", originalURL)

// 	c.Redirect(http.StatusFound, originalURL)
// }

// func(h *URLHandler) GetMyURLs(c *gin.Context){
// 	userID := c.Param("user_id")
// 	if userID == "" {
// 		c.JSON(http.StatusUnauthorized, gin.H{
// 			"error":"unauthorized",
// 		})
// 		return
// 	}

// 	uid, err := strconv.Atoi(userID)
// 	if err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid user identity token structure"})
// 		return
// 	}

// 	urls, err := h.URLService.GetURLsByUserID(uid)
// 	if err != nil{
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 		return
// 	}

// 	c.JSON(http.StatusOK, urls)
// }

// func (h *URLHandler) DeleteURL(c *gin.Context) {
// 	shortCode := c.Param("code")
// 	if shortCode == "" {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": "short code is required"})
// 		return
// 	}
 
// 	if err := h.URLService.DeleteURL(shortCode); err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 		return
// 	}
 
// 	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
// }

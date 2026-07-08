// package handlers

// import (
// 	"backend/internals/middleware"
// 	"backend/internals/service"
// 	"encoding/base64"
// 	"net/http"
// 	"strconv"

// 	"github.com/gin-gonic/gin"
// )

// type QRHandler struct{
// 	QRService *service.QRService
// }

// func NewQRHandler(qrService *service.QRService) *QRHandler {
// 	return &QRHandler{QRService: qrService}
// }

// type CreateQRRequest struct {
// 	URL   string `json:"url" binding:"required,url"`
// 	Label string `json:"label"`
// }

// // POST /api/v1/qr  — create a new QR code and return base64 PNG inline.
// func (h *QRHandler) CreateQR(c *gin.Context) {
// 	var req CreateQRRequest
// 	if err := c.ShouldBindJSON(&req); err != nil {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
// 		return
// 	}
 
// 	userID := middleware.CurrentUserID(c)
// 	qr, png, err := h.QRService.CreateQR(req.URL, req.Label, uint(userID))
// 	if err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 		return
// 	}
 
// 	// Return both the metadata and the PNG as a base64 data URI so the
// 	// frontend can display / download it immediately without a second request.
// 	dataURI := "data:image/png;base64," + base64.StdEncoding.EncodeToString(png)
 
// 	c.JSON(http.StatusCreated, gin.H{
// 		"id":           qr.ID,
// 		"original_url": qr.OriginalURL,
// 		"label":        qr.Label,
// 		"image_b64":    dataURI,
// 		"expires_at":   qr.ExpiresAt,
// 	})
// }

// // GET /api/v1/qr  — list all QR codes owned by the logged-in user.
// func (h *QRHandler) ListQRs(c *gin.Context) {
// 	userID := middleware.CurrentUserID(c)
// 	list, err := h.QRService.GetByUser(uint(userID))
// 	if err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 		return
// 	}
// 	c.JSON(http.StatusOK, list)
// }

// func (h *QRHandler) GetMyQRs(c *gin.Context) {
// 	userID := middleware.CurrentUserID(c)
// 	urls, err := h.QRService.GetByUser((userID))
// 	if err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 		return
// 	}
// 	c.JSON(http.StatusOK, urls)
// }

// // GET /api/v1/qr/:id/image  — download or re-render the PNG.
// func (h *QRHandler) GetQRImage(c *gin.Context) {
// 	id, err := parseUintParam(c, "id")
// 	if err != nil {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
// 		return
// 	}
 
// 	_, png, err := h.QRService.GetQRImage(id)
// 	if err != nil {
// 		c.JSON(http.StatusNotFound, gin.H{"error": "qr not found"})
// 		return
// 	}
 
// 	c.Header("Content-Disposition", "attachment; filename=qrcode.png")
// 	c.Data(http.StatusOK, "image/png", png)
// }

// // GET /api/v1/qr/:id/base64  — return base64 data URI.
// func (h *QRHandler) GetQRBase64(c *gin.Context) {
// 	id, err := parseUintParam(c, "id")
// 	if err != nil {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
// 		return
// 	}
 
// 	b64, qr, err := h.QRService.GetQRBase64(id)
// 	if err != nil {
// 		c.JSON(http.StatusNotFound, gin.H{"error": "qr not found"})
// 		return
// 	}
 
// 	c.JSON(http.StatusOK, gin.H{
// 		"id":           qr.ID,
// 		"original_url": qr.OriginalURL,
// 		"label":        qr.Label,
// 		"image_b64":    b64,
// 	})
// }

// // DELETE /api/v1/qr/:id
// func (h *QRHandler) DeleteQR(c *gin.Context) {
// 	id, err := parseUintParam(c, "id")
// 	if err != nil {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
// 		return
// 	}
// 	userID := middleware.CurrentUserID(c)
// 	if err := h.QRService.Delete(id, uint(userID)); err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 		return
// 	}
// 	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
// }

// // --- QR Analytics ---

// // GET /api/v1/qr/analytics/daily  — daily scans for all QR codes of this user.
// func (h *QRHandler) GetDailyScans(c *gin.Context) {
// 	userID := middleware.CurrentUserID(c)
// 	data, err := h.QRService.GetDailyScansByUser(uint(userID))
// 	if err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 		return
// 	}
// 	c.JSON(http.StatusOK, data)
// }

// // GET /api/v1/qr/analytics/daily/:id  — daily scans for a specific QR code.
// func (h *QRHandler) GetDailyScansByQR(c *gin.Context) {
// 	id, err := parseUintParam(c, "id")
// 	if err != nil {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
// 		return
// 	}
// 	data, err := h.QRService.GetDailyScansByQR(id)
// 	if err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 		return
// 	}
// 	c.JSON(http.StatusOK, data)
// }

// // GET /api/v1/qr/analytics/devices  — device breakdown for this user's QR codes.
// func (h *QRHandler) GetDeviceBreakdown(c *gin.Context) {
// 	userID := middleware.CurrentUserID(c)
// 	data, err := h.QRService.GetDeviceBreakdown(uint(userID))
// 	if err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 		return
// 	}
// 	c.JSON(http.StatusOK, data)
// }

// // GET /api/v1/qr/analytics/total  — total scans across this user's QR codes.
// func (h *QRHandler) GetTotalScans(c *gin.Context) {
// 	userID := middleware.CurrentUserID(c)
// 	total, err := h.QRService.GetTotalScans(uint(userID))
// 	if err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 		return
// 	}
// 	c.JSON(http.StatusOK, gin.H{"total_scans": total})
// }

// // --- helpers ---
 
// func parseUintParam(c *gin.Context, key string) (uint, error) {
// 	raw := c.Param(key)
// 	n, err := strconv.ParseUint(raw, 10, 64)
// 	return uint(n), err
// }

package handlers

import (
	"backend/internals/middleware"
	"backend/internals/service"
	"encoding/base64"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type QRHandler struct{
	QRService *service.QRService
}

func NewQRHandler(qrService *service.QRService) *QRHandler {
	return &QRHandler{QRService: qrService}
}

type CreateQRRequest struct {
	URL   string `json:"url" binding:"required,url"`
	Label string `json:"label"`
}

// POST /api/v1/qr  — create a new QR code and return base64 PNG inline.
func (h *QRHandler) CreateQR(c *gin.Context) {
	var req CreateQRRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
 
	userID := middleware.CurrentUserID(c)
	qr, png, err := h.QRService.CreateQR(req.URL, req.Label, uint(userID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
 
	// Return both the metadata and the PNG as a base64 data URI so the
	// frontend can display / download it immediately without a second request.
	dataURI := "data:image/png;base64," + base64.StdEncoding.EncodeToString(png)
 
	c.JSON(http.StatusCreated, gin.H{
		"id":           qr.ID,
		"original_url": qr.OriginalURL,
		"label":        qr.Label,
		"image_b64":    dataURI,
		"expires_at":   qr.ExpiresAt,
	})
}

// GET /api/v1/qr  — list all QR codes owned by the logged-in user.
func (h *QRHandler) ListQRs(c *gin.Context) {
	userID := middleware.CurrentUserID(c)
	list, err := h.QRService.GetByUser(uint(userID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *QRHandler) GetMyQRs(c *gin.Context) {
	userID := middleware.CurrentUserID(c)
	urls, err := h.QRService.GetByUser((userID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, urls)
}

// GET /api/v1/qr/:id/image  — download or re-render the PNG.
func (h *QRHandler) GetQRImage(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
 
	_, png, err := h.QRService.GetQRImage(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "qr not found"})
		return
	}
 
	c.Header("Content-Disposition", "attachment; filename=qrcode.png")
	c.Data(http.StatusOK, "image/png", png)
}

// GET /api/v1/qr/:id/base64  — return base64 data URI.
func (h *QRHandler) GetQRBase64(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
 
	b64, qr, err := h.QRService.GetQRBase64(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "qr not found"})
		return
	}
 
	c.JSON(http.StatusOK, gin.H{
		"id":           qr.ID,
		"original_url": qr.OriginalURL,
		"label":        qr.Label,
		"image_b64":    b64,
	})
}

// DELETE /api/v1/qr/:id
func (h *QRHandler) DeleteQR(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	userID := middleware.CurrentUserID(c)
	if err := h.QRService.Delete(id, uint(userID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

// --- QR Analytics ---

// GET /api/v1/qr/analytics/daily  — daily scans for all QR codes of this user.
func (h *QRHandler) GetDailyScans(c *gin.Context) {
	userID := middleware.CurrentUserID(c)
	data, err := h.QRService.GetDailyScansByUser(uint(userID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

// GET /api/v1/qr/analytics/daily/:id  — daily scans for a specific QR code.
func (h *QRHandler) GetDailyScansByQR(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	data, err := h.QRService.GetDailyScansByQR(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

// GET /api/v1/qr/analytics/devices  — device breakdown for this user's QR codes.
func (h *QRHandler) GetDeviceBreakdown(c *gin.Context) {
	userID := middleware.CurrentUserID(c)
	data, err := h.QRService.GetDeviceBreakdown(uint(userID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

// GET /api/v1/qr/analytics/total  — total scans across this user's QR codes.
func (h *QRHandler) GetTotalScans(c *gin.Context) {
	userID := middleware.CurrentUserID(c)
	total, err := h.QRService.GetTotalScans(uint(userID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"total_scans": total})
}

// --- helpers ---
 
func parseUintParam(c *gin.Context, key string) (uint, error) {
	raw := c.Param(key)
	n, err := strconv.ParseUint(raw, 10, 64)
	return uint(n), err
}
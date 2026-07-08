package service

import (
	"backend/internals/geo"
	"backend/internals/repository"
	"backend/model"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	goqr "github.com/skip2/go-qrcode"
)

const qrExpiryDuration = 6 * time.Hour

type QRService struct {
	repo       *repository.QRRepository
	urlService *URLService
	baseURL    string
}
func NewQRService(repo *repository.QRRepository, urlService *URLService, baseURL string) *QRService {
    return &QRService{repo: repo, urlService: urlService, baseURL: baseURL}
}

func (s *QRService) CreateQR(originalURL string, label string, userID uint) (*model.QRCode, []byte, error) {
    expiresAt := time.Now().Add(qrExpiryDuration)

    // Step 1: create a short URL — this is what gets encoded into the QR.
    // Every scan hits /r/SHORTCODE which logs device, country, city automatically.
    urlModel, err := s.urlService.CreateQRShortCode(originalURL, int(userID), &expiresAt)
    if err != nil {
        return nil, nil, fmt.Errorf("create short url: %w", err)
    }

    // Step 2: save the QR record, linking it to the short code for analytics queries.
    qr := &model.QRCode{
        UserID:      userID,
        ShortCode:   urlModel.ShortCode, // stored so analytics can JOIN on it
        OriginalURL: originalURL,
        Label:       label,
        ExpiresAt:   &expiresAt,
    }
    if err := s.repo.Save(qr); err != nil {
        return nil, nil, fmt.Errorf("save qr: %w", err)
    }

    // Step 3: encode the redirect URL into the PNG — not the original URL.
    redirectURL := s.baseURL + "/r/" + urlModel.ShortCode
    png, err := generateQRPNG(redirectURL, 256)
    if err != nil {
        return nil, nil, fmt.Errorf("generate qr png: %w", err)
    }

    // Step 4: write PNG to disk.
    imagePath := fmt.Sprintf("qr/%d.png", qr.ID)
    if err := os.MkdirAll("qr", 0755); err != nil {
        return nil, nil, fmt.Errorf("create qr dir: %w", err)
    }
    if err := os.WriteFile(imagePath, png, 0644); err != nil {
        return nil, nil, fmt.Errorf("write png: %w", err)
    }

    qr.ImagePath = imagePath
    if err := s.repo.UpdateImagePath(qr.ID, imagePath); err != nil {
        return nil, nil, fmt.Errorf("update image path: %w", err)
    }

    return qr, png, nil
}

// GetQRImage returns the stored PNG bytes for an existing, non-expired QR code.
func (s *QRService) GetQRImage(id uint) (*model.QRCode, []byte, error) {
	qr, err := s.repo.FindByID(id)
	if err != nil {
		return nil, nil, err
	}

	if qr.ExpiresAt != nil && time.Now().After(*qr.ExpiresAt) {
		return nil, nil, fmt.Errorf("qr code expired at %s — generate a new one", qr.ExpiresAt.Format(time.RFC3339))
	}

	png, err := os.ReadFile(qr.ImagePath)
	if err != nil {
		return nil, nil, fmt.Errorf("image file missing: %w", err)
	}

	return qr, png, nil
}

// GetQRBase64 returns a data-URI-ready base64 PNG string the frontend can
// drop straight into an <img src="..."> tag.
func (s *QRService) GetQRBase64(id uint) (string, *model.QRCode, error) {
	qr, png, err := s.GetQRImage(id)
	if err != nil {
		return "", nil, err
	}
	encoded := base64.StdEncoding.EncodeToString(png)
	return "data:image/png;base64," + encoded, qr, nil
}

func (s *QRService) GetByUser(userID uint) ([]model.QRCode, error) {
	return s.repo.FindByUserID(userID)
}

func (s *QRService) Delete(qrID uint, userID uint) error {
	qr, err := s.repo.FindByID(qrID)
	if err != nil {
		return fmt.Errorf("qr code not found")
	}
	if qr.UserID != userID {
		return fmt.Errorf("qr code not found")
	}
	if err := s.repo.Delete(qrID, userID); err!=nil{
		return err
	}
	if qr.ImagePath != "" {
		if err := os.Remove(qr.ImagePath); err != nil && !os.IsNotExist(err) {
			log.Printf("[qr-delete] failed to remove image file %s: %v", qr.ImagePath, err)
		}
	}
	return nil
}

// RecordScan logs a scan event asynchronously so the redirect/response is never delayed.
func (s *QRService) RecordScan(qrID uint, userAgent string, clientIP string) {
	go func() {
		deviceType := parseDevice(userAgent)
		ipHash := hashIPQR(clientIP)
		loc := geo.Resolve(clientIP)

		scan := &model.QRScan{
			QRID:      qrID,
			Device:    deviceType,
			IPHash:    ipHash,
			ScannedAt: time.Now(),
			Country:   loc.Country,
			City:      loc.City,
			Region:    loc.Region, // was loc.City — region now stores the actual region
		}
		_ = s.repo.LogScan(scan)
	}()
}

// CleanupExpired deletes expired QR rows and their on-disk PNGs.
// Call this from a periodic worker (e.g. every 15 minutes).
func (s *QRService) CleanupExpired() (int, error) {
	expired, err := s.repo.FindExpired()
	if err != nil {
		return 0, err
	}
	for _, qr := range expired {
		if qr.ImagePath != "" {
			_ = os.Remove(qr.ImagePath)
		}
	}
	if err := s.repo.DeleteExpired(); err != nil {
		return 0, err
	}
	return len(expired), nil
}

// --- Analytics pass-throughs ---

func (s *QRService) GetDailyScansByUser(userID uint) ([]model.QRScansByDayResult, error) {
	return s.repo.GetDailyScansByUser(userID)
}

func (s *QRService) GetDailyScansByQR(qrID uint) ([]model.QRScansByDayResult, error) {
	return s.repo.GetDailyScansByQR(qrID)
}

func (s *QRService) GetDeviceBreakdown(userID uint) ([]model.QRDeviceResult, error) {
	return s.repo.GetDeviceBreakdownByUser(userID)
}

func (s *QRService) GetTotalScans(userID uint) (int64, error) {
	return s.repo.GetTotalScansByUser(userID)
}

// --- helpers ---

func generateQRPNG(originalURL string, size int) ([]byte, error) {
	png, err := goqr.Encode(originalURL, goqr.Medium, size)
	if err != nil {
		return nil, err
	}
	return png, nil
}

func parseDevice(userAgent string) string {
	ua := strings.ToLower(userAgent)
	switch {
	case strings.Contains(ua, "android"):
		return "Android"
	case strings.Contains(ua, "iphone"):
		return "iPhone"
	case strings.Contains(ua, "ipad"):
		return "iPad"
	case strings.Contains(ua, "mobile"):
		return "Mobile"
	case strings.Contains(ua, "tablet"):
		return "Tablet"
	default:
		return "Desktop"
	}
}

func hashIPQR(ip string) string {
	h := sha256.Sum256([]byte(ip))
	return hex.EncodeToString(h[:])[:16]
}
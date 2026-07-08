package service

import (
	"backend/internals/geo"
	"backend/internals/repository"
	"backend/model"
	"crypto/sha256"
	"encoding/hex"
	"log"
	"strings"
	"time"
)

type URLAnalytics struct {
	repo *repository.URLRepository
}

func NewURLAnalyticsService(repo *repository.URLRepository) *URLAnalytics {
	return &URLAnalytics{repo: repo}
}

func (s *URLAnalytics) RecordClick(shortCode string, userAgent string, clientIP string) {
	// Execute tracking inside a separate thread so client browser redirects are instant
	go func() {
		// 1. Look up the URL details in the database to fetch the true record ID
		urlRecord, err := s.repo.FindURLbyShortCode(shortCode)
		if err != nil {
			return // Shortcode doesn't exist or was deleted, abort tracking
		}

		// 2. Simple helper logic to parse basic client user agent strings
		deviceType := "Desktop"
		ua := strings.ToLower(userAgent)
		if strings.Contains(ua, "android") {
			deviceType = "Android"
		} else if strings.Contains(ua, "iphone") || strings.Contains(ua, "ipad") {
			deviceType = "iOS"
		} else if strings.Contains(ua, "mobile") {
			deviceType = "Mobile"
		}

		// 3. Construct your custom model instance layout
		// clickEvent := &model.Clicks{
		// 	URLID:     urlRecord.ID, // Dynamically maps '8' based on your payload example
		// 	ShortCode: shortCode,
		// 	Device:    deviceType,
		// 	ClickedAt: time.Now(),
		// }

		// loc := geo.Resolve("clientIP")          // ← geo lookup (async, already in goroutine)
		ipHash := hashIP(clientIP) // ← SHA-256 first 16 chars

		// ip := c.ClientIP()
		loc := geo.Resolve(ipHash)
		log.Printf("IP = %s", ipHash)
		log.Printf("Geo Response: %+v\n", loc)

		clickEvent := &model.Clicks{
			URLID:     urlRecord.ID,
			ShortCode: shortCode,
			Device:    (deviceType),
			ClickedAt: time.Now(),
			Country:   loc.Country,
			City:      loc.City,
			Region:    loc.Region,
			IPHash:    ipHash,
		}

		_ = s.repo.LogClick(clickEvent)
	}()
}

// func parseDevice(userAgent string) string {
// 	return userAgent // Replace with actual parsing logic if needed
// }

func hashIP(ip string) string {
	h := sha256.Sum256([]byte(ip))
	return hex.EncodeToString(h[:])[:16]
}

func (s *URLAnalytics) GetClicksByDay(shortCode string) ([]model.ClicksByDayResult, error) {
	return s.repo.FindClicksByDate(shortCode)
}

func (s *URLAnalytics) GetTopLinks(limit int) ([]model.TopLinksResult, error) {
	if limit <= 0 {
		limit = 5
	}
	return s.repo.FindTopLinks(limit)
}

func (s *URLAnalytics) GetTopLinksByUser(userID uint, limit int) ([]model.TopLinksResult, error) {
	if limit <= 0 {
		limit = 10
	}
	return s.repo.FindTopLinksByUser(userID, limit)
}

func (s *URLAnalytics) GetTotalClicks() (int64, error) {
	return s.repo.SumAllClicks()
}

func (s *URLAnalytics) GetTotalClicksByUser(userID uint) (int64, error) {
	return s.repo.SumClicksByUser(userID)
}

func (s *URLAnalytics) GetDailyClicksByUser(userID uint) ([]model.ClicksByDayResult, error) {
	return s.repo.GetDailyClicksByUser(userID)
}

func (s *URLAnalytics) GetDeviceBreakdown(userID uint) ([]model.URLDeviceResult, error) {
	return s.repo.GetDeviceBreakdown(userID)
}

func (s *URLAnalytics) GetCountryBreakdown(userID uint) ([]model.URLCountryResult, error) {
	return s.repo.GetCountryBreakdownByUser(userID)
}

package service

import (
	"backend/internals/geo"
	"backend/internals/repository"
	"backend/model"
	"crypto/sha256"
	"encoding/hex"
	"log"
	"time"
)

type URLAnalytics struct {
	repo   *repository.URLRepository
	qrRepo *repository.QRRepository
}

func NewURLAnalyticsService(repo *repository.URLRepository, qrRepo *repository.QRRepository) *URLAnalytics {
	return &URLAnalytics{repo: repo, qrRepo: qrRepo}
}

// RecordClick logs one redirect event. The handler calls it in a goroutine so
// the redirect response is never delayed by the DB write or GeoIP lookup.
// QR-backed short codes (is_qr = true) are logged as QR scans instead of
// link clicks, so each lands in its own analytics view.
func (s *URLAnalytics) RecordClick(shortCode string, userAgent string, clientIP string) {
	urlRecord, err := s.repo.FindURLbyShortCode(shortCode)
	if err != nil {
		return // Shortcode doesn't exist or was deleted, abort tracking
	}

	deviceType := parseDevice(userAgent)
	ipHash := hashIP(clientIP)
	loc := geo.Resolve(clientIP) // resolve the raw IP; only the hash is persisted

	if urlRecord.IsQR {
		qr, err := s.qrRepo.FindByShortCode(shortCode)
		if err != nil {
			log.Printf("[analytics] qr lookup failed for %s: %v", shortCode, err)
			return
		}
		scan := &model.QRScan{
			QRID:      qr.ID,
			Device:    deviceType,
			ScannedAt: time.Now(),
			Country:   loc.Country,
			Region:    loc.Region,
			City:      loc.City,
			IPHash:    ipHash,
		}
		if err := s.qrRepo.LogScan(scan); err != nil {
			log.Printf("[analytics] log scan failed for %s: %v", shortCode, err)
		}
		return
	}

	clickEvent := &model.Clicks{
		URLID:     urlRecord.ID,
		ShortCode: shortCode,
		Device:    deviceType,
		ClickedAt: time.Now(),
		Country:   loc.Country,
		City:      loc.City,
		Region:    loc.Region,
		IPHash:    ipHash,
	}
	if err := s.repo.LogClick(clickEvent); err != nil {
		log.Printf("[analytics] log click failed for %s: %v", shortCode, err)
	}
}

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

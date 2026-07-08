package model

import (
	"time"

	"gorm.io/gorm"
)

// QRCode represents a QR code entry that points directly to an original URL.
// No short-code is generated — the QR image encodes the original URL itself.
// PNGs are written to disk (qr/<id>.png) on creation and read back on every
// fetch — never regenerated. Each code expires 6 hours after creation.
//
// NOTE: gorm.Model's embedded ID/CreatedAt/UpdatedAt/DeletedAt fields carry
// NO json tags, so Go's default marshaling would emit "ID" (capital), not
// "id". The frontend reads qr.id (lowercase) — so the ID/timestamp fields
// are declared explicitly here (instead of embedding gorm.Model) with
// lowercase json tags, while keeping ImagePath and ExpiresAt that the
// service/repository layers depend on.
type QRCode struct {
	ID        uint           `json:"id" gorm:"primarykey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID      uint       `json:"user_id"`
	ShortCode   string     `json:"short_code" gorm:"not null"`
	OriginalURL string     `gorm:"not null" json:"original_url"`
	Label       string     `json:"label"`                                 // optional friendly name
	ImagePath   string     `gorm:"not null;default:''" json:"image_path"` // e.g. "qr/42.png"
	ExpiresAt   *time.Time `gorm:"index" json:"expires_at"`               // 6 hours after creation
	ScanCount   int64      `gorm:"-" json:"scan_count"`                   // populated via subquery in FindByUserID
}

// QRScan records every scan event for analytics — same pattern as Clicks.
type QRScan struct {
	ID        uint           `json:"id" gorm:"primarykey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	QRID      uint      `json:"qr_id" gorm:"constraint:OnDelete:CASCADE;"`
	Device    string    `json:"device"`
	ScannedAt time.Time `json:"scanned_at"`
	Country   string    `json:"country"`
	Region    string    `json:"region"`
	City      string    `json:"city"`
	IPHash    string    `json:"ip_hash"`
}

// QRScansByDayResult is a projection for the daily-scans chart.
type QRScansByDayResult struct {
	Date  string `json:"date"`
	Scans int64  `json:"scans"`
}

// QRDeviceResult holds per-device scan counts.
type QRDeviceResult struct {
	Device string `json:"device"`
	Count  int64  `json:"count"`
}

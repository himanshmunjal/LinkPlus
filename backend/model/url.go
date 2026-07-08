package model

import (
	"time"

	"gorm.io/gorm"
)

type URL struct {
	gorm.Model

	UserID      uint
	OriginalURL string `gorm:"not null" json:"original_url"`
	ShortCode   string `gorm:"uniqueIndex;not null" json:"short_code"`

	ClickCount uint64     `gorm:"index" json:"click_count"`
	ExpiresAt  *time.Time `gorm:"index" json:"expires_at,omitempty"`
	IsQR       bool       `gorm:"default:false" json:"-"`
}

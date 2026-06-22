package model

import (
	"time"

	"gorm.io/gorm"
)

type Clicks struct {
	gorm.Model

	URLID     uint      `json:"url_id" gorm:"constraint:OnDelete:CASCADE;"`
	ShortCode string    `json:"short_code"`
	Device    string    `json:"device"`
	ClickedAt time.Time `json:"clickedat"`
	Country   string    `json:"country"`
	Region    string    `json:"region"`
	City      string    `json:"city"`
	IPHash    string    `json:"ip_hash"`
}

type ClicksByDayResult struct {
	Date   string `json:"date"`
	Clicks int64  `json:"clicks"`
}

type TopLinksResult struct {
	ShortCode   string `json:"short_code"`
	OriginalURL string `json:"original_url"`
	Clicks      int64  `json:"Clicks" gorm:"column:click_count"`
}

type URLDeviceResult struct {
	Device string `json:"device"`
	Count  int64  `json:"count"`
}

type URLCountryResult struct {
	Country string `json:"country"`
	Count   int64  `json:"count"`
}
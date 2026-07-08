package geo

import (
	"log"
	"net"

	"github.com/oschwald/geoip2-golang"
)

type Location struct {
	Country string `json:"country"`
	City    string `json:"city"`
	Region  string `json:"region"`
}

var db *geoip2.Reader

func init() {
	var err error
	db, err = geoip2.Open("geoip/GeoLite2-City.mmdb")
	if err != nil {
		log.Printf("geo: failed to open GeoLite2 DB: %v", err)
	}
}

func Close() {
	if db != nil {
		db.Close()
	}
}

func Resolve(ip string) Location {
	if db == nil {
		return Location{}
	}

	parsed := net.ParseIP(ip)
	if parsed == nil {
		return Location{}
	}

	record, err := db.City(parsed)
	if err != nil {
		return Location{}
	}

	city := ""
	if len(record.City.Names) > 0 {
		city = record.City.Names["en"]
	}

	country := ""
	if len(record.Country.Names) > 0 {
		country = record.Country.Names["en"]
	}

	region := ""
	if len(record.Subdivisions) > 0 {
		region = record.Subdivisions[0].Names["en"]
	}

	return Location{Country: country, City: city, Region: region}
}

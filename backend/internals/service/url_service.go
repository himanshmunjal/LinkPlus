package service

import (
	"backend/internals/repository"
	"backend/model"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"time"
)

type URLService struct{
	repo *repository.URLRepository
	cache *CacheService
}

func NewURLService(repo *repository.URLRepository, cache *CacheService,) *URLService {
	return &URLService{
        repo: repo,
        cache: cache,
    }
}

func(s *URLService) CreateShortURL(originalURL string, userID int, expiresAt *time.Time) (*model.URL, error){
	if originalURL == ""{
		return nil, errors.New("url cannot be empty")
	}
	shortCode, err := generateRandomCode(7)
	if err!= nil{
		return nil, err
	}
	urlModel := &model.URL{
		UserID:      uint(userID),
		OriginalURL: originalURL,
		ShortCode:   shortCode, // shortCode is now of type string
		ExpiresAt:   expiresAt,
	}
	err = s.repo.Save(urlModel)
	if err!=nil{
		return nil, err
	}
	cacheTTL := 3600 // default 1 hour
    if expiresAt != nil {
        ttl := int(time.Until(*expiresAt).Seconds())
        if ttl <= 0 {
            return nil, errors.New("expiry time is already in the past")
        }
        cacheTTL = ttl
    }
    err = s.cache.Put(shortCode, originalURL, cacheTTL)
	if err!=nil{
		return nil, err
	}
	return urlModel, err
}

func (s *URLService) CreateQRShortCode(originalURL string, userID int, expiresAt *time.Time) (*model.URL, error) {
    shortCode, err := generateRandomCode(7)
    if err != nil {
        return nil, err
    }

    urlModel := &model.URL{
        UserID:      uint(userID),
        OriginalURL: originalURL,
        ShortCode:   shortCode,
        ExpiresAt:   expiresAt,
        IsQR:        true, // ← this is the only difference from CreateShortURL
    }

    if err := s.repo.Save(urlModel); err != nil {
        return nil, err
    }

    cacheTTL := 3600
    if expiresAt != nil {
        ttl := int(time.Until(*expiresAt).Seconds())
        if ttl <= 0 {
            return nil, errors.New("expiry time is already in the past")
        }
        cacheTTL = ttl
    }

    if err := s.cache.Put(shortCode, originalURL, cacheTTL); err != nil {
        return nil, err
    }

    return urlModel, nil
}

func(s *URLService) DeleteURL(shortCode string) error{
	return s.repo.Delete(shortCode)
}

func(s *URLService) GetURLsByUserID(userID int) ([]model.URL ,error){
	return s.repo.FindByUser(userID)
}

func (s *URLService) IncrementClickCount(shortCode string) error {
    return s.repo.IncrementClickCount(shortCode)
}

func(s *URLService) GetOriginalURL(shortCode string) (*model.URL, error){
	if shortCode == ""{
		return nil, errors.New("shortCode cannot be empty")
	}

	fmt.Println("Looking for:", shortCode)
	
	return s.repo.FindURLbyShortCode(shortCode)
}

func generateRandomCode(i int) (string, error) {
	// Implement the logic to generate a random string of length i
	buffer := make([]byte, i)

	if _, err:= rand.Read(buffer); err != nil {
		return "", err
	}

	str := base64.URLEncoding.EncodeToString(buffer)
	str = strings.ReplaceAll(str, "_", "")
	str = strings.ReplaceAll(str, "-", "")
	if len(str) < i {
		return str, nil
	}
	return str[:i], nil
}

func (s *URLService) Resolve(shortCode string) (string, error) {

    if url, found, err := s.cache.Get(shortCode); err == nil && found {
        fmt.Println("CACHE HIT:", shortCode)
        return url, nil
    }

    fmt.Println("CACHE MISS:", shortCode)

    urlRecord, err := s.repo.GetWithExpiry(shortCode)
    if err != nil {
        return "", err
    }

	if urlRecord.ExpiresAt != nil && time.Now().After(*urlRecord.ExpiresAt) {
        _ = s.cache.Delete(shortCode)
        return "", errors.New("link has expired")
    }

    err = s.cache.Put(shortCode, urlRecord.OriginalURL, 3600)
    if err != nil {
        fmt.Println("CACHE PUT FAILED:", err)
    } else {
        fmt.Println("CACHE PUT SUCCESS:", shortCode)
    }

    return urlRecord.OriginalURL, nil
}
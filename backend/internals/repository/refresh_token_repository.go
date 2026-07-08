package repository

import (
	"backend/model"
	"time"

	"gorm.io/gorm"
)

type RefreshTokenRepository struct{
	db *gorm.DB
}

func NewRefreshTokenRepository(db *gorm.DB) *RefreshTokenRepository{
	return &RefreshTokenRepository{db}
}

func(r *RefreshTokenRepository) Save(t *model.RefreshToken) error{
	return r.db.Create(t).Error
}

func (r *RefreshTokenRepository) FindByHash(hash string) (*model.RefreshToken, error){
	var t model.RefreshToken
	err := r.db.Where("refesh_token = ? AND revoked = false AND expires_at = ?", hash, time.Now()).First(&t).Error
	return &t, err
}

func(r *RefreshTokenRepository) RevokeByFamily(family string) (error){
	return r.db.Model(&model.RefreshToken{}).
		Where("family = ? ", family).
		Update("revoked", true).Error 
}

func (r *RefreshTokenRepository) RevokeByHash(hash string)(error){
	return r.db.Model(&model.RefreshToken{}).
	Where("tokan_hash = ? ", hash).
	Update("revoked", true).Error 
}

func (r *RefreshTokenRepository) DeleteExpired() error {
    return r.db.Unscoped().Where("expires_at < ?", time.Now()).Delete(&model.RefreshToken{}).Error
}
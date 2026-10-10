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
	err := r.db.Where("token_hash = ? AND revoked = false AND expires_at > ?", hash, time.Now()).First(&t).Error
	return &t, err
}

func(r *RefreshTokenRepository) RevokeByFamily(family string) (error){
	return r.db.Model(&model.RefreshToken{}).
		Where("family = ? ", family).
		Update("revoked", true).Error 
}

// FindRevokedByHash finds a token that was already used or revoked, to detect reuse.
func (r *RefreshTokenRepository) FindRevokedByHash(hash string) (*model.RefreshToken, error){
	var t model.RefreshToken
	err := r.db.Where("token_hash = ? AND revoked = true", hash).First(&t).Error
	return &t, err
}

// RevokeByHash revokes an active token and reports whether this call did it, so
// two concurrent refreshes with the same token cannot both succeed.
func (r *RefreshTokenRepository) RevokeByHash(hash string)(bool, error){
	res := r.db.Model(&model.RefreshToken{}).
	Where("token_hash = ? AND revoked = false", hash).
	Update("revoked", true)
	return res.RowsAffected == 1, res.Error
}

func (r *RefreshTokenRepository) DeleteExpired() error {
    return r.db.Unscoped().Where("expires_at < ?", time.Now()).Delete(&model.RefreshToken{}).Error
}
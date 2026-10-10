// package repository

// import (
// 	"backend/model"
// 	"time"

// 	"gorm.io/gorm"
// )

// type QRRepository struct {
// 	db *gorm.DB
// }

// func NewQRRepository(db *gorm.DB) *QRRepository {
// 	return &QRRepository{db: db}
// }

// func (r *QRRepository) Save(qr *model.QRCode) error {
// 	return r.db.Create(qr).Error
// }

// func (r *QRRepository) FindByID(id uint) (*model.QRCode, error) {
// 	var qr model.QRCode
// 	err := r.db.First(&qr, id).Error
// 	return &qr, err
// }

// func (r *QRRepository) FindByUserID(userID uint) ([]model.QRCode, error) {
//     var list []model.QRCode
//     err := r.db.Where("user_id = ?", userID).
//         Order("created_at DESC").  // ← was scan_count DESC, column no longer exists
//         Find(&list).Error
//     return list, err
// }

// func (r *QRRepository) Delete(id uint, userID uint) error {
// 	return r.db.Unscoped().Where("id = ? AND user_id = ?", id, userID).Delete(&model.QRCode{}).Error
// }

// // UpdateImagePath persists the on-disk path of the generated PNG after creation.
// func (r *QRRepository) UpdateImagePath(id uint, path string) error {
// 	return r.db.Model(&model.QRCode{}).
// 		Where("id = ?", id).
// 		Update("image_path", path).Error
// }

// // LogScan records one scan event and increments the counter atomically.
// func (r *QRRepository) LogScan(scan *model.QRScan) error {
// 	return r.db.Transaction(func(tx *gorm.DB) error {
// 		if err := tx.Create(scan).Error; err != nil {
// 			return err
// 		}
// 		return tx.Model(&model.QRCode{}).
// 			Where("id = ?", scan.QRID).
// 			UpdateColumn("scan_count", gorm.Expr("scan_count + 1")).Error
// 	})
// }

// // --- Expiry (6-hour TTL) ---

// func (r *QRRepository) FindExpired() ([]model.QRCode, error) {
// 	var list []model.QRCode
// 	err := r.db.Where("expires_at IS NOT NULL AND expires_at < ?", time.Now()).Find(&list).Error
// 	return list, err
// }

// func (r *QRRepository) DeleteExpired() error {
// 	return r.db.Unscoped().
// 		Where("expires_at IS NOT NULL AND expires_at < ?", time.Now()).
// 		Delete(&model.QRCode{}).Error
// }

// // --- Analytics queries ---

// // Daily scan trend
// func (r *QRRepository) GetDailyScansByUser(userID uint) ([]model.QRScansByDayResult, error) {
//     var result []model.QRScansByDayResult
//     err := r.db.Model(&model.Clicks{}).
//         Select("DATE(clicks.clicked_at) as date, COUNT(*) as scans").
//         Joins("JOIN qr_codes ON qr_codes.short_code = clicks.short_code").
//         Where("qr_codes.user_id = ? AND qr_codes.deleted_at IS NULL", userID).
//         Group("DATE(clicks.clicked_at)").
//         Order("DATE(clicks.clicked_at) ASC").
//         Scan(&result).Error
//     return result, err
// }

// func (r *QRRepository) GetDailyScansByQR(qrID uint) ([]model.QRScansByDayResult, error) {
// 	var result []model.QRScansByDayResult
// 	err := r.db.Model(&model.QRScan{}).
// 		Select("DATE(scanned_at) as date, COUNT(*) as scans").
// 		Where("qr_id = ? AND deleted_at IS NULL", qrID).
// 		Group("DATE(scanned_at)").
// 		Order("DATE(scanned_at) ASC").
// 		Scan(&result).Error
// 	return result, err
// }

// // Device breakdown
// func (r *QRRepository) GetDeviceBreakdownByUser(userID uint) ([]model.QRDeviceResult, error) {
//     var result []model.QRDeviceResult
//     err := r.db.Model(&model.Clicks{}).
//         Select("clicks.device, COUNT(*) as count").
//         Joins("JOIN qr_codes ON qr_codes.short_code = clicks.short_code").
//         Where("qr_codes.user_id = ? AND qr_codes.deleted_at IS NULL", userID).
//         Group("clicks.device").
//         Scan(&result).Error
//     return result, err
// }

// // Total scans for a user's QR codes
// func (r *QRRepository) GetTotalScansByUser(userID uint) (int64, error) {
//     var total int64
//     err := r.db.Model(&model.Clicks{}).
//         Joins("JOIN qr_codes ON qr_codes.short_code = clicks.short_code").
//         Where("qr_codes.user_id = ? AND qr_codes.deleted_at IS NULL", userID).
//         Count(&total).Error
//     return total, err
// }

// // Country breakdown
// func (r *QRRepository) GetCountryBreakdownByUser(userID uint) ([]model.URLCountryResult, error) {
//     var result []model.URLCountryResult
//     err := r.db.Model(&model.Clicks{}).
//         Select("COALESCE(NULLIF(clicks.country, ''), 'Unknown') as country, COUNT(*) as count").
//         Joins("JOIN qr_codes ON qr_codes.short_code = clicks.short_code").
//         Where("qr_codes.user_id = ? AND qr_codes.deleted_at IS NULL", userID).
//         Group("clicks.country").
//         Order("count DESC").
//         Limit(10).
//         Scan(&result).Error
//     return result, err
// }

package repository

import (
	"backend/model"
	"time"

	"gorm.io/gorm"
)

type QRRepository struct {
	db *gorm.DB
}

func NewQRRepository(db *gorm.DB) *QRRepository {
	return &QRRepository{db: db}
}

func (r *QRRepository) Save(qr *model.QRCode) error {
	return r.db.Create(qr).Error
}

func (r *QRRepository) FindByID(id uint) (*model.QRCode, error) {
	var qr model.QRCode
	err := r.db.First(&qr, id).Error
	return &qr, err
}

func (r *QRRepository) FindByUserID(userID uint) ([]model.QRCode, error) {
	var list []model.QRCode
	err := r.db.
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&list).Error
	return list, err
}

// FindByShortCode resolves the hidden short code a QR image encodes back to its QR row.
func (r *QRRepository) FindByShortCode(shortCode string) (*model.QRCode, error) {
	var qr model.QRCode
	err := r.db.Where("short_code = ?", shortCode).First(&qr).Error
	if err != nil {
		return nil, err
	}
	return &qr, nil
}

func (r *QRRepository) Delete(id uint, userID uint) error {
	return r.db.Unscoped().Where("id = ? AND user_id = ?", id, userID).Delete(&model.QRCode{}).Error
}

// UpdateImagePath persists the on-disk path of the generated PNG after creation.
func (r *QRRepository) UpdateImagePath(id uint, path string) error {
	return r.db.Model(&model.QRCode{}).
		Where("id = ?", id).
		Update("image_path", path).Error
}

// LogScan records one scan event and increments the counter atomically.
func (r *QRRepository) LogScan(scan *model.QRScan) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(scan).Error; err != nil {
			return err
		}
		return tx.Model(&model.QRCode{}).
			Where("id = ?", scan.QRID).
			UpdateColumn("scan_count", gorm.Expr("scan_count + 1")).Error
	})
}

// --- Expiry (6-hour TTL) ---

func (r *QRRepository) FindExpired() ([]model.QRCode, error) {
	var list []model.QRCode
	err := r.db.Where("expires_at IS NOT NULL AND expires_at < ?", time.Now()).Find(&list).Error
	return list, err
}

func (r *QRRepository) DeleteExpired() error {
	return r.db.Unscoped().
		Where("expires_at IS NOT NULL AND expires_at < ?", time.Now()).
		Delete(&model.QRCode{}).Error
}

// --- Analytics queries ---

// // Daily scan trend
// func (r *QRRepository) GetDailyScansByUser(userID uint) ([]model.QRScansByDayResult, error) {
//     var result []model.QRScansByDayResult
//     err := r.db.Model(&model.QRScan{}).
//         Select("DATE(qr_scans.scanned_at) as date, COUNT(*) as scans").
//         Joins("JOIN qr_codes ON qr_codes.id = qr_scans.qr_id").
//         Where("qr_codes.user_id = ? AND qr_codes.deleted_at IS NULL AND qr_scans.deleted_at IS NULL AND qr_id = true", userID).
//         Group("DATE(qr_scans.scanned_at)").
//         Order("DATE(qr_scans.scanned_at) ASC").
//         Scan(&result).Error
//     return result, err
// }

// Daily scan trend
func (r *QRRepository) GetDailyScansByUser(userID uint) ([]model.QRScansByDayResult, error) {
    var result []model.QRScansByDayResult
    err := r.db.Model(&model.QRScan{}).
        Select("DATE(qr_scans.scanned_at) as date, COUNT(*) as scans").
        Joins("JOIN qr_codes ON qr_codes.id = qr_scans.qr_id").
        Where("qr_codes.user_id = ? AND qr_codes.deleted_at IS NULL AND qr_scans.deleted_at IS NULL", userID).
        Group("DATE(qr_scans.scanned_at)").
        Order("DATE(qr_scans.scanned_at) ASC").
        Scan(&result).Error
    return result, err
}

func (r *QRRepository) GetDailyScansByQR(qrID uint, userID uint) ([]model.QRScansByDayResult, error) {
	var result []model.QRScansByDayResult
	err := r.db.Model(&model.QRScan{}).
		Select("DATE(qr_scans.scanned_at) as date, COUNT(*) as scans").
		Joins("JOIN qr_codes ON qr_codes.id = qr_scans.qr_id").
		Where("qr_scans.qr_id = ? AND qr_codes.user_id = ? AND qr_codes.deleted_at IS NULL AND qr_scans.deleted_at IS NULL", qrID, userID).
		Group("DATE(qr_scans.scanned_at)").
		Order("DATE(qr_scans.scanned_at) ASC").
		Scan(&result).Error
	return result, err
}

// // Device breakdown
// func (r *QRRepository) GetDeviceBreakdownByUser(userID uint) ([]model.QRDeviceResult, error) {
//     var result []model.QRDeviceResult
//     err := r.db.Model(&model.QRScan{}).
//         Select("qr_scans.device, COUNT(*) as count").
//         Joins("JOIN qr_codes ON qr_codes.id = qr_scans.qr_id").
//         Where("qr_codes.user_id = ? AND qr_codes.deleted_at IS NULL AND qr_scans.deleted_at IS NULL AND qr_id = true", userID).
//         Group("qr_scans.device").
//         Scan(&result).Error
//     return result, err
// }

// Device breakdown
func (r *QRRepository) GetDeviceBreakdownByUser(userID uint) ([]model.QRDeviceResult, error) {
    var result []model.QRDeviceResult
    err := r.db.Model(&model.QRScan{}).
        Select("qr_scans.device, COUNT(*) as count").
        Joins("JOIN qr_codes ON qr_codes.id = qr_scans.qr_id").
        Where("qr_codes.user_id = ? AND qr_codes.deleted_at IS NULL AND qr_scans.deleted_at IS NULL", userID).
        Group("qr_scans.device").
        Scan(&result).Error
    return result, err
}

// // Total scans for a user's QR codes
// func (r *QRRepository) GetTotalScansByUser(userID uint) (int64, error) {
//     var total int64
//     err := r.db.Model(&model.QRScan{}).
//         Joins("JOIN qr_codes ON qr_codes.id = qr_scans.qr_id").
//         Where("qr_codes.user_id = ? AND qr_codes.deleted_at IS NULL AND qr_scans.deleted_at IS NULL AND qr_id = true", userID).
//         Count(&total).Error
//     return total, err
// }

// Total scans for a user's QR codes
func (r *QRRepository) GetTotalScansByUser(userID uint) (int64, error) {
    var total int64
    err := r.db.Model(&model.QRScan{}).
        Joins("JOIN qr_codes ON qr_codes.id = qr_scans.qr_id").
        Where("qr_codes.user_id = ? AND qr_codes.deleted_at IS NULL AND qr_scans.deleted_at IS NULL", userID).
        Count(&total).Error
    return total, err
}

// Country breakdown
func (r *QRRepository) GetCountryBreakdownByUser(userID uint) ([]model.URLCountryResult, error) {
    var result []model.URLCountryResult
    err := r.db.Model(&model.QRScan{}).
        Select("COALESCE(NULLIF(qr_scans.country, ''), 'Unknown') as country, COUNT(*) as count").
        Joins("JOIN qr_codes ON qr_codes.id = qr_scans.qr_id").
        Where("qr_codes.user_id = ? AND qr_codes.deleted_at IS NULL AND qr_scans.deleted_at IS NULL", userID).
        Group("qr_scans.country").
        Order("count DESC").
        Limit(10).
        Scan(&result).Error
    return result, err
}
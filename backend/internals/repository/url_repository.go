package repository

import (
	"backend/model"
	"time"

	"gorm.io/gorm"
)


type URLRepository struct{
	db *gorm.DB
}

type URLExpiryTime struct {
    OriginalURL string
    ExpiresAt   *time.Time
}

type URLDeviceResult struct {
	Device string `json:"device"`
	Count  int64  `json:"count"`
}

func NewURLRepository (db *gorm.DB) *URLRepository{
	return &URLRepository{db: db}
}

func(r *URLRepository) Save(url *model.URL) error{
	return r.db.Create(url).Error
}

func(r *URLRepository) FindURLbyShortCode(shortCode string) (*model.URL, error){
	var url model.URL
	err := r.db.Model(&model.URL{}).Where("short_code = ?", shortCode).First(&url).Error
	if err!=nil{
		return nil, err
	}
	return &url, nil
}

func (r *URLRepository) IncrementClickCount(shortCode string) error {
    return r.db.Model(&model.URL{}).
        Where("short_code = ?", shortCode).
        UpdateColumn("click_count", gorm.Expr("click_count + 1")).
        Error
}

// Delete removes a link owned by userID and reports whether one was removed.
func(r *URLRepository) Delete(shortCode string, userID uint) (bool, error){
	res := r.db.Unscoped().Where("short_code = ? AND user_id = ?", shortCode, userID).Delete(&model.URL{})
	return res.RowsAffected > 0, res.Error
}

func (r *URLRepository) FindByUser(userID int) ([]model.URL, error) {
	var urls []model.URL
	err := r.db.Where("user_id = ? AND is_qr = false", userID).Order("click_count DESC").Find(&urls).Error
	if err != nil {
		return nil, err
	}
	return urls, nil
}

func(r *URLRepository) FindByCode(short_code string)(string, error){
	var OriginalURL string
	err := r.db.Model(&model.URL{}).Select("original_url").Where("short_code = ?", short_code).Scan(&OriginalURL).Error
	if(err!=nil){
		return "", err
	}
	return OriginalURL, err
}

func(r *URLRepository) FindClicksByDate(short_code string)([]model.ClicksByDayResult, error){
	var results []model.ClicksByDayResult
	err := r.db.Model(&model.Clicks{}).
			Select("DATE(clicked_at) as Date, count(id) as Clicks").
			Where("short_code = ?", short_code).
			Group("DATE(clicked_at)").
			Order("date ASC").
			Scan(&results).Error
	return results, err
}

func(r *URLRepository) FindTopLinks(limit int)([]model.TopLinksResult, error){
	var results []model.TopLinksResult

	err := r.db.Model(&model.URL{}).
			Select("short_code, original_url, click_count").
			Order("click_count DESC").
			Limit(limit).
			Scan(&results).Error

	return results, err
}

func(r *URLRepository) FindTopLinksByUser(userID uint, limit int)([]model.TopLinksResult, error){
	var results []model.TopLinksResult

	err := r.db.Model(&model.URL{}).
			Select("short_code, original_url, click_count").
			Where("user_id = ? AND is_qr = false AND deleted_at IS NULL", userID).
			Order("click_count DESC").
			Limit(limit).
			Scan(&results).Error

	return results, err
}

func (r *URLRepository) LogClick(click *model.Clicks) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// 1. Write the explicit click event row tracking device metrics
		if err := tx.Create(click).Error; err != nil {
			return err
		}

		// 2. Safely increment the 'click_count' property column on the URLs table
		return tx.Model(&model.URL{}).
			Where("id = ?", click.URLID).
			UpdateColumn("click_count", gorm.Expr("click_count + ?", 1)).Error
	})
}

func (r *URLRepository) SumAllClicks() (int64, error) {
	var total int64
	err := r.db.Model(&model.URL{}).Select("COALESCE(SUM(click_count), 0)").Where("is_qr = false").Scan(&total).Error
	return total, err
}

func (r *URLRepository) SumClicksByUser(userID uint) (int64, error) {
	var total int64
	err := r.db.Model(&model.Clicks{}).
		Joins("JOIN urls ON urls.id = clicks.url_id").
		Where("urls.user_id = ? AND urls.deleted_at IS NULL AND clicks.deleted_at IS NULL AND is_qr = false", userID).
		Count(&total).Error
	return total, err
}

func (r *URLRepository) GetDailyClicksByUser(userID uint) ([]model.ClicksByDayResult, error) {
    var result []model.ClicksByDayResult

    err := r.db.Model(&model.Clicks{}).
        Select("DATE(clicks.clicked_at) as date, COUNT(*) as clicks").
        Joins("JOIN urls ON urls.id = clicks.url_id").
        Where(
            "urls.user_id = ? AND urls.deleted_at IS NULL AND clicks.deleted_at IS NULL AND is_qr = false",
            userID,
        ).
        Group("DATE(clicks.clicked_at)").
        Order("DATE(clicks.clicked_at) ASC").
        Scan(&result).Error

    return result, err
}

func (r *URLRepository) FindExpiredURLs() ([]model.URL, error) {
    var urls []model.URL
    err := r.db.Where("expires_at IS NOT NULL AND expires_at < ?", time.Now()).Find(&urls).Error
    return urls, err
}

func (r *URLRepository) DeleteExpiredURLs() error {
    return r.db.Unscoped().
        Where("expires_at IS NOT NULL AND expires_at < ?", time.Now()).
        Delete(&model.URL{}).Error
}

func (r *URLRepository) GetWithExpiry(shortCode string) (*URLExpiryTime, error) {
    var result URLExpiryTime
    
    err := r.db.Model(&model.URL{}).
        Select("original_url, expires_at").
        Where("short_code = ?", shortCode).
        Scan(&result).Error
        
    if err != nil {
        return nil, err
    }
    return &result, nil
}

func(r *URLRepository) GetDeviceBreakdown(userID uint)([]model.URLDeviceResult, error){
	var result []model.URLDeviceResult
	err := r.db.Model(&model.Clicks{}).
	Select("device, COUNT(*) AS count").
	Joins("JOIN urls ON urls.id = clicks.url_id").
	Where("urls.user_id = ? AND urls.deleted_at IS NULL AND clicks.deleted_at IS NULL AND is_qr = false", userID).
	Group("device").
	Order("count DESC").
	Scan(&result).Error

	return result, err
}

func(r *URLRepository) GetCountryBreakdownByUser(userID uint)([]model.URLCountryResult, error){
	var result []model.URLCountryResult
	err := r.db.Model(&model.Clicks{}).
		Select("COALESCE(NULLIF(country, ''), 'Unknown') as country, COUNT(*) as count").
		Joins("JOIN urls ON urls.id = clicks.url_id").
		Where("urls.user_id = ? AND urls.deleted_at IS NULL AND clicks.deleted_at IS NULL AND is_qr = false", userID).
		Group("country").
		Order("count DESC").
		Limit(10).
		Scan(&result).Error
	return result, err
}
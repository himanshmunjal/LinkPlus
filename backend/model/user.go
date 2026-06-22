package model

import "gorm.io/gorm"

type Role string

const (
	RoleUser  Role = "user"
	RoleAdmin Role = "admin"
)

type User struct {
	gorm.Model

	Username     string `gorm:"unique;not null"         json:"username"`
	Email        string `gorm:"unique;not null"         json:"email"`
	PasswordHash string `gorm:"not null"                json:"-"`
	Role         Role   `gorm:"not null;default:'user'" json:"role"`
}

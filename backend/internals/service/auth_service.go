package service

import (
	"backend/internals/auth"
	"backend/internals/repository"
	"backend/model"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"strings"
	"time"
	"unicode"

	"golang.org/x/crypto/bcrypt"
)

var (
	ErrEmailTaken    = errors.New("an account with this email already exists")
	ErrUsernameTaken = errors.New("this username is already taken")
	ErrInvalidCreds  = errors.New("incorrect email or password")
	ErrWeakPassword  = errors.New("password must be at least 8 characters and contain a number")
)

type SignupRequest struct {
	Username string
	Email    string
	Password string
}

type LoginRequest struct {
	Email    string
	Password string
}

type AuthResponse struct {
	Token string     `json:"token"`
	RefreshToken string     `json:"refresh_token"`
	User  PublicUser `json:"user"`
}

// PublicUser is the subset of model.User safe to send to the client.
type PublicUser struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Role     string `json:"role"`
}

type AuthService struct {
	userRepo *repository.UserRepository
	refreshRepo *repository.RefreshTokenRepository
}

func NewAuthService(userRepo *repository.UserRepository, refreshRepo *repository.RefreshTokenRepository) *AuthService {
	return &AuthService{userRepo: userRepo, refreshRepo: refreshRepo}
}

// Signup creates a new user account (role defaults to "user") and returns a JWT.
func (s *AuthService) Signup(req SignupRequest) (*AuthResponse, error) {
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.Username = strings.TrimSpace(req.Username)

	if !isStrongPassword(req.Password) {
		return nil, ErrWeakPassword
	}

	existing, err := s.userRepo.FindByEmail(req.Email)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, ErrEmailTaken
	}

	takenByUsername, err := s.userRepo.FindByUsername(req.Username)
	if err != nil {
		return nil, err
	}
	if takenByUsername != nil {
		return nil, ErrUsernameTaken
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	
	user := &model.User{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: string(hash),
		Role:         model.RoleUser, // new users are always "user"
	}
	if err := s.userRepo.CreateUser(user); err != nil {
		return nil, err
	}
	
	refreshToken, err := s.issueRefreshToken(user.ID, newFamily())
	if err != nil {
		return nil, err
	}

	token, err := auth.GenerateToken(user.ID, user.Username, user.Email, string(user.Role))
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		Token: token,
		RefreshToken: refreshToken,
		User:  toPublicUser(user),
	}, nil
}

// Login verifies credentials and returns a signed JWT carrying the user's role.
func (s *AuthService) Login(req LoginRequest) (*AuthResponse, error) {
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	user, err := s.userRepo.FindByEmail(req.Email)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, ErrInvalidCreds
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCreds
	}

	token, err := auth.GenerateToken(user.ID, user.Username, user.Email, string(user.Role))
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.issueRefreshToken(user.ID, newFamily())

	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		Token: token,
		RefreshToken : refreshToken,
		User:  toPublicUser(user),
	}, nil
}

func newFamily() string {
    b := make([]byte, 8)
    if _, err := rand.Read(b); err != nil {
        panic(err)
    }
    return hex.EncodeToString(b)
}

func (s *AuthService) issueRefreshToken(userID uint, family string) (string, error) {
    raw, hash, err := auth.GenerateRefreshToken()
    if err != nil {
        return "", err
    }

    expiry := time.Now().Add(30 * 24 * time.Hour) // 30 days
    if err := s.refreshRepo.Save(&model.RefreshToken{
        UserID:    userID,
        TokenHash: hash,
        ExpiresAt: expiry,
        Family:    family,
    }); err != nil {
        return "", err
    }
    return raw, nil
}

// ── Helpers ────────────────────────────────────────────────────────────────────

func toPublicUser(u *model.User) PublicUser {
	return PublicUser{
		ID:       u.ID,
		Username: u.Username,
		Email:    u.Email,
		Role:     string(u.Role),
	}
}

func isStrongPassword(p string) bool {
	if len(p) < 8 {
		return false
	}
	for _, r := range p {
		if unicode.IsDigit(r) {
			return true
		}
	}
	return false
}

// Rotate: revoke old token, issue new access + refresh token pair
func (s *AuthService) Rotate(rawRefreshToken string) (newAccess, newRefresh string, err error) {
    hash := auth.HashToken(rawRefreshToken)
    stored, err := s.refreshRepo.FindByHash(hash)
    if err != nil {
        // Token not found or expired — possible reuse attack
        // If family exists, revoke all tokens in that family
        return "", "", errors.New("invalid or expired refresh token")
    }

    // Revoke the used token
    if err = s.refreshRepo.RevokeByHash(hash); err != nil {
        return
    }

    // Fetch user for new claims
    user, err := s.userRepo.FindByID(stored.UserID)
    if err != nil {
        return
    }

    newAccess, err = auth.GenerateToken(user.ID, user.Username, user.Email, string(user.Role))
    if err != nil {
        return
    }

    // Issue new refresh token in same family (rotation)
    newRefresh, err = s.issueRefreshToken(user.ID, stored.Family)
    return
}
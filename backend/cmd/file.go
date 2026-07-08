package main

// import (
// 	"context"
// 	"fmt"
// 	"log"
// 	"net/http"
// 	"os"
// 	"os/signal"
// 	"syscall"
// 	"time"

// 	"backend/internals/cache"
// 	"backend/internals/handlers"
// 	"backend/internals/middleware"
// 	"backend/internals/repository"
// 	"backend/internals/service"
// 	"backend/internals/worker"

// 	"github.com/gin-contrib/cors"
// 	"github.com/gin-gonic/gin"
// 	"github.com/joho/godotenv"
// )

// func main1() {
// 	_ = godotenv.Load()

// 	if os.Getenv("GIN_MODE") == "release" {
// 		gin.SetMode(gin.ReleaseMode)
// 	}

// 	fmt.Println("Starting LinkPlus V3 API Server...")

// 	db := repository.DBConnect()

// 	jcacheHost := getEnv("JCACHE_HOST", "localhost")
// 	jcachePort := getEnvInt("JCACHE_PORT", 6379)

// 	jcacheClient, err := cache.NewJCacheClient(jcacheHost, jcachePort)
// 	if err != nil {
// 		log.Fatalf("Fatal: Failed to connect to JCache: %v", err)
// 	}
// 	defer jcacheClient.Close()

// 	// ── Repositories ─────────────────────────────────────────────────────────
// 	urlRep     := repository.NewURLRepository(db)
// 	userRep    := repository.NewUserRepository(db)
// 	refreshRep := repository.NewRefreshTokenRepository(db)
// 	qrRep      := repository.NewQRRepository(db)

// 	// ── Services ──────────────────────────────────────────────────────────────
// 	cacheService     := service.NewCacheService(jcacheClient)
// 	urlService       := service.NewURLService(urlRep, cacheService)
// 	analyticsService := service.NewURLAnalyticsService(urlRep)
// 	authService      := service.NewAuthService(userRep, refreshRep)
// 	qrService        := service.NewQRService(qrRep)

// 	// ── Handlers ──────────────────────────────────────────────────────────────
// 	urlHandler   := handlers.NewURLHandler(urlService, analyticsService)
// 	authHandler  := handlers.NewAuthHandler(authService)
// 	cacheHandler := handlers.NewCacheHandler(jcacheClient)
// 	qrHandler    := handlers.NewQRHandler(qrService)

// 	// ── Background worker ─────────────────────────────────────────────────────
// 	ctx1, cancel := context.WithCancel(context.Background())
// 	defer cancel()
// 	expiryWorker := worker.NewExpiryWorker(urlRep, cacheService)
// 	go expiryWorker.Run(ctx1)

// 	// ── Router ────────────────────────────────────────────────────────────────
// 	r := gin.New()
// 	r.Use(gin.Logger())
// 	r.Use(gin.Recovery())

// 	r.Use(cors.New(cors.Config{
// 		AllowOrigins:     []string{getEnv("FRONTEND_ORIGIN", "http://localhost:5173")},
// 		AllowMethods:     []string{"GET", "POST", "DELETE", "OPTIONS"},
// 		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
// 		AllowCredentials: true,
// 		MaxAge:           12 * time.Hour,
// 	}))

// 	// Public redirect
// 	r.GET("/r/:code", urlHandler.RedirectURL)
// 	r.HEAD("/r/:code", urlHandler.RedirectURL)

// 	api := r.Group("/api/v1")

// 	// ── Auth (public) ─────────────────────────────────────────────────────────
// 	auth := api.Group("/auth")
// 	{
// 		auth.POST("/signup", authHandler.Signup)
// 		auth.POST("/login", authHandler.Login)
// 		auth.POST("/refresh", authHandler.Refresh)
// 	}

// 	// ── Protected routes ──────────────────────────────────────────────────────
// 	protected := api.Group("/")
// 	protected.Use(middleware.RequireAuth())
// 	{
// 		protected.GET("/auth/me", authHandler.Me)

// 		// Short URL CRUD
// 		protected.POST("/url", urlHandler.CreateShortURL)
// 		protected.GET("/url", urlHandler.GetMyURLs)
// 		protected.DELETE("/url/:code", urlHandler.DeleteURL)

// 		// Short URL analytics
// 		protected.GET("/analytics/top", func(c *gin.Context) {
// 			topLinks, err := analyticsService.GetTopLinks(10)
// 			if err != nil {
// 				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 				return
// 			}
// 			c.JSON(http.StatusOK, topLinks)
// 		})
// 		protected.GET("/analytics/daily/:code", func(c *gin.Context) {
// 			clicks, err := analyticsService.GetClicksByDay(c.Param("code"))
// 			if err != nil {
// 				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 				return
// 			}
// 			c.JSON(http.StatusOK, clicks)
// 		})
// 		protected.GET("/analytics/daily", func(c *gin.Context) {
// 			userID := middleware.CurrentUserID(c)
// 			data, err := analyticsService.GetDailyClicksByUser(userID)
// 			if err != nil {
// 				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 				return
// 			}
// 			c.JSON(http.StatusOK, data)
// 		})
// 		protected.GET("/analytics/total", func(c *gin.Context) {
// 			total, err := analyticsService.GetTotalClicks()
// 			if err != nil {
// 				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 				return
// 			}
// 			c.JSON(http.StatusOK, gin.H{"total_clicks": total})
// 		})
// 		protected.GET("/analytics/total/me", func(c *gin.Context) {
// 			userID := middleware.CurrentUserID(c)
// 			total, err := analyticsService.GetTotalClicksByUser(userID)
// 			if err != nil {
// 				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 				return
// 			}
// 			c.JSON(http.StatusOK, gin.H{"total_clicks": total})
// 		})
// 		// NEW: device and country breakdown for short URLs
// 		protected.GET("/analytics/devices", func(c *gin.Context) {
// 			userID := middleware.CurrentUserID(c)
// 			data, err := analyticsService.GetDeviceBreakdown(userID)
// 			if err != nil {
// 				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 				return
// 			}
// 			c.JSON(http.StatusOK, data)
// 		})
// 		protected.GET("/analytics/countries", func(c *gin.Context) {
// 			userID := middleware.CurrentUserID(c)
// 			data, err := analyticsService.GetCountryBreakdown(userID)
// 			if err != nil {
// 				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 				return
// 			}
// 			c.JSON(http.StatusOK, data)
// 		})

// 		// ── QR Code CRUD ──────────────────────────────────────────────────────
// 		protected.POST("/qr", qrHandler.CreateQR)
// 		protected.GET("/qr", qrHandler.ListQRs)
// 		protected.GET("/qr/:id/image", qrHandler.GetQRImage)
// 		protected.GET("/qr/:id/base64", qrHandler.GetQRBase64)
// 		protected.DELETE("/qr/:id", qrHandler.DeleteQR)

// 		// ── QR Analytics ──────────────────────────────────────────────────────
// 		protected.GET("/qr/analytics/daily", qrHandler.GetDailyScans)
// 		protected.GET("/qr/analytics/daily/:id", qrHandler.GetDailyScansByQR)
// 		protected.GET("/qr/analytics/devices", qrHandler.GetDeviceBreakdown)
// 		protected.GET("/qr/analytics/total", qrHandler.GetTotalScans)
// 	}

// 	// ── Admin-only routes ─────────────────────────────────────────────────────
// 	admin := api.Group("/admin")
// 	admin.Use(middleware.RequireAuth(), middleware.RequireAdmin())
// 	{
// 		admin.GET("/cache/stats", cacheHandler.GetCacheStats)
// 	}

// 	// ── Graceful shutdown ─────────────────────────────────────────────────────
// 	port := getEnv("PORT", "8080")
// 	srv := &http.Server{
// 		Addr:         ":" + port,
// 		Handler:      r,
// 		ReadTimeout:  10 * time.Second,
// 		WriteTimeout: 10 * time.Second,
// 		IdleTimeout:  60 * time.Second,
// 	}

// 	go func() {
// 		fmt.Printf("Server listening on http://localhost:%s\n", port)
// 		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
// 			log.Fatalf("Fatal: %v", err)
// 		}
// 	}()

// 	quit := make(chan os.Signal, 1)
// 	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
// 	<-quit

// 	log.Println("Shutting down server...")
// 	ctx, cancel2 := context.WithTimeout(context.Background(), 10*time.Second)
// 	defer cancel2()

// 	if err := srv.Shutdown(ctx); err != nil {
// 		log.Fatalf("Server forced to shutdown: %v", err)
// 	}
// 	log.Println("Server exited cleanly.")
// }

// func getEnv(key, fallback string) string {
// 	if v := os.Getenv(key); v != "" {
// 		return v
// 	}
// 	return fallback
// }

// func getEnvInt(key string, fallback int) int {
// 	if v := os.Getenv(key); v != "" {
// 		var n int
// 		if _, err := fmt.Sscanf(v, "%d", &n); err == nil {
// 			return n
// 		}
// 	}
// 	return fallback
// }
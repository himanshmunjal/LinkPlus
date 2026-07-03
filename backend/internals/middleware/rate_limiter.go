package middleware

import (
	"backend/internals/cache"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// Limit returns a Gin middleware that enforces a sliding-window rate limit
// using Redis. Each unique IP gets its own counter scoped by `name` so that
// different routes never share state.
//
// Usage:
//   r.POST("/auth/login",  middleware.Limit(redisClient, "login",    5,  60))
//   r.GET("/r/:code",      middleware.Limit(redisClient, "redirect", 60, 60))
//   r.POST("/url",         middleware.Limit(redisClient, "url",      10, 60))
//   r.POST("/qr",          middleware.Limit(redisClient, "qr",       5,  60))
func Limit(redis *cache.RedisClient, name string, maxRequests int, windowSeconds int) gin.HandlerFunc {
	return func(c *gin.Context) {
		// "rl:login:192.168.1.1" — prefix + name + IP keeps keys readable in Redis.
		key := fmt.Sprintf("rl:%s:%s", name, c.ClientIP())

		allowed, current, err := redis.RateLimit(key, maxRequests, windowSeconds)
		if err != nil {
			// Redis is down — fail open so a cache outage doesn't take down the
			// whole API. Log it but let the request through.
			c.Header("X-RateLimit-Error", "cache unavailable")
			c.Next()
			return
		}

		c.Header("X-RateLimit-Limit",     strconv.Itoa(maxRequests))
		c.Header("X-RateLimit-Remaining", strconv.Itoa(max(0, maxRequests-current)))

		if !allowed {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": fmt.Sprintf(
					"too many requests — max %d per %ds, try again later",
					maxRequests, windowSeconds,
				),
			})
			return
		}

		c.Next()
	}
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
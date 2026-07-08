package handlers

import (
	"backend/internals/cache"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type CacheHandler struct {
	jcache *cache.JCacheClient
}

func NewCacheHandler(jcache *cache.JCacheClient) *CacheHandler {
	return &CacheHandler{jcache: jcache}
}

// GET /cache/stats
// Calls STATS on JCache and returns parsed metrics as JSON.
func (h *CacheHandler) GetCacheStats(c *gin.Context) {
	raw, err := h.jcache.Stats()
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "cache unavailable: " + err.Error(),
		})
		return
	}

	// Parse the STATS response.
	// Expected format from JCache (one key:value per line, or space-delimited):
	//   hits:1200 misses:300 evictions:45 size:512
	// Adapt the parsing below if your JCache uses a different delimiter.
	stats := parseStats(raw)

	hits, _ := strconv.ParseInt(stats["hits"], 10, 64)
	misses, _ := strconv.ParseInt(stats["misses"], 10, 64)
	evictions, _ := strconv.ParseInt(stats["evictions"], 10, 64)
	size, _ := strconv.ParseInt(stats["size"], 10, 64)

	total := hits + misses
	var hitRate, missRate float64
	if total > 0 {
		hitRate = float64(hits) / float64(total) * 100
		missRate = float64(misses) / float64(total) * 100
	}

	c.JSON(http.StatusOK, gin.H{
		"hits":      hits,
		"misses":    misses,
		"evictions": evictions,
		"size":      size,
		"hit_rate":  hitRate,
		"miss_rate": missRate,
		"raw":       raw, // surface raw string for debugging
	})
}

// parseStats converts "key:value key:value ..." or "key:value\nkey:value\n..."
// into a map[string]string. Extend if JCache emits a different format.
func parseStats(raw string) map[string]string {
	result := make(map[string]string)
	// Normalise both newline and space-delimited formats.
	raw = strings.ReplaceAll(raw, "\n", " ")
	raw = strings.ReplaceAll(raw, "\r", "")
	for _, token := range strings.Fields(raw) {
		parts := strings.SplitN(token, ":", 2)
		if len(parts) == 2 {
			result[strings.ToLower(parts[0])] = strings.TrimSpace(parts[1])
		}
	}
	return result
}
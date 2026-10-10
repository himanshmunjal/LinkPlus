package cache

import (
	"context"
	"fmt"
	"hash/fnv"
	"net"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

// JCacheClient talks to a JCache server over RESP, which JCache serves on the
// same port as its text protocol. It has the same methods as RedisClient, so
// either one satisfies service.Cache.
type JCacheClient struct {
	client *redis.Client
	ctx    context.Context

	// JCache has no scripts or sorted sets, so RateLimit reads and rewrites
	// a key under one of these locks to make the check atomic.
	locks [64]sync.Mutex
}

func NewJCacheClient(host string, port int) (*JCacheClient, error) {

	rdb := redis.NewClient(&redis.Options{
		Addr:         net.JoinHostPort(host, strconv.Itoa(port)),
		PoolSize:     10,
		MinIdleConns: 2,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
		// JCache speaks RESP2 and has no CLIENT SETINFO; skip both on connect.
		Protocol:        2,
		DisableIdentity: true,
	})

	c := &JCacheClient{
		client: rdb,
		ctx:    context.Background(),
	}

	if err := c.Ping(); err != nil {
		rdb.Close()
		return nil, fmt.Errorf("jcache: connect to %s: %w", rdb.Options().Addr, err)
	}

	return c, nil
}

func (c *JCacheClient) Get(key string) (string, bool, error) {

	val, err := c.client.Get(
		c.ctx,
		key,
	).Result()

	if err == redis.Nil {
		return "", false, nil
	}

	if err != nil {
		return "", false, err
	}

	return val, true, nil
}

// Put stores a value; ttlSeconds <= 0 means no expiry. (go-redis would turn a
// negative TTL into KEEPTTL, which JCache does not support.)
func (c *JCacheClient) Put(
	key string,
	value string,
	ttlSeconds int,
) error {

	if ttlSeconds < 0 {
		ttlSeconds = 0
	}

	return c.client.Set(
		c.ctx,
		key,
		value,
		time.Duration(ttlSeconds)*time.Second,
	).Err()
}

func (c *JCacheClient) Delete(key string) error {

	return c.client.Del(
		c.ctx,
		key,
	).Err()
}

func (c *JCacheClient) Ping() error {

	return c.client.Ping(
		c.ctx,
	).Err()
}

// Stats returns JCache's STATS line: "hits:1200 misses:300 evictions:45 ...".
func (c *JCacheClient) Stats() (string, error) {

	return c.client.Do(
		c.ctx,
		"STATS",
	).Text()
}

func (c *JCacheClient) Close() error {

	return c.client.Close()
}

// RateLimit checks whether the caller identified by key has exceeded
// maxRequests in the trailing windowSeconds (sliding window, not fixed buckets).
//
// It keeps the same sliding-window log as RedisClient.RateLimit, stored as
// comma-separated request timestamps (ms) in one key that expires with the
// window. The lock makes trim + count + add atomic within this process only:
// with several backend replicas sharing one JCache, concurrent requests from
// the same IP can each be admitted, so the limit is approximate there.
//
// Returns:
//
//	allowed  — false means the caller should receive a 429
//	current  — requests counted in the current window
//	err      — only set on a JCache failure, not on a breach
//
// Key naming convention: callers should prefix by route to keep counters
// isolated, e.g. "rl:login:192.168.1.1", "rl:redirect:192.168.1.1".
func (c *JCacheClient) RateLimit(key string, maxRequests int, windowSeconds int) (allowed bool, current int, err error) {
	if windowSeconds <= 0 {
		return false, 0, fmt.Errorf("jcache: rate limit window must be positive, got %d", windowSeconds)
	}

	lock := c.lockFor(key)
	lock.Lock()
	defer lock.Unlock()

	raw, err := c.client.Get(c.ctx, key).Result()
	if err != nil && err != redis.Nil {
		return false, 0, fmt.Errorf("jcache: rate limit read: %w", err)
	}

	now := time.Now().UnixMilli()
	stamps := requestsSince(raw, now-int64(windowSeconds)*1000)
	if len(stamps) >= maxRequests {
		return false, len(stamps), nil
	}

	stamps = append(stamps, strconv.FormatInt(now, 10))
	err = c.client.Set(
		c.ctx,
		key,
		strings.Join(stamps, ","),
		time.Duration(windowSeconds)*time.Second,
	).Err()
	if err != nil {
		return false, 0, fmt.Errorf("jcache: rate limit write: %w", err)
	}

	return true, len(stamps), nil
}

func (c *JCacheClient) lockFor(key string) *sync.Mutex {
	h := fnv.New32a()
	h.Write([]byte(key))
	return &c.locks[h.Sum32()%uint32(len(c.locks))]
}

// requestsSince keeps the timestamps in raw that are newer than cutoff, the
// same entries the Redis script keeps after ZREMRANGEBYSCORE 0 cutoff.
func requestsSince(raw string, cutoff int64) []string {
	var kept []string
	for _, s := range strings.Split(raw, ",") {
		ts, err := strconv.ParseInt(s, 10, 64)
		if err == nil && ts > cutoff {
			kept = append(kept, s)
		}
	}
	return kept
}

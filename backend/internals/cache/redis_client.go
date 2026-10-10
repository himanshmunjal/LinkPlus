package cache

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisClient struct {
	client *redis.Client
	ctx    context.Context
}

func NewRedisClient(addr string) (*RedisClient, error) {

	rdb := redis.NewClient(&redis.Options{
		Addr:           addr,
		PoolSize:     10,
		MinIdleConns: 2,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
	})

	return &RedisClient{
		client: rdb,
		ctx:    context.Background(),
	}, nil
}

func (r *RedisClient) Get(key string) (string, bool, error) {

	val, err := r.client.Get(
		r.ctx,
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

func (r *RedisClient) Put(
	key string,
	value string,
	ttlSeconds int,
) error {

	return r.client.Set(
		r.ctx,
		key,
		value,
		time.Duration(ttlSeconds)*time.Second,
	).Err()
}

func (r *RedisClient) Delete(key string) error {

	return r.client.Del(
		r.ctx,
		key,
	).Err()
}

func (r *RedisClient) Ping() error {

	return r.client.Ping(
		r.ctx,
	).Err()
}

func (r *RedisClient) Close() error {

	return r.client.Close()
}

// rateLimitScript implements a sliding-window log: each request is a member of
// a sorted set scored by its timestamp (ms). Entries older than the window are
// trimmed, and the request is admitted only if fewer than the limit remain.
// Running it as one Lua script keeps trim + count + add atomic across replicas.
var rateLimitScript = redis.NewScript(`
	local key    = KEYS[1]
	local now    = tonumber(ARGV[1])
	local window = tonumber(ARGV[2])
	local limit  = tonumber(ARGV[3])
	local member = ARGV[4]

	redis.call("ZREMRANGEBYSCORE", key, 0, now - window)
	local count = redis.call("ZCARD", key)
	if count < limit then
		redis.call("ZADD", key, now, member)
		redis.call("PEXPIRE", key, window)
		return {1, count + 1}
	end
	return {0, count}
`)

// RateLimit checks whether the caller identified by key has exceeded
// maxRequests in the trailing windowSeconds (sliding window, not fixed buckets).
//
// Returns:
//   allowed  — false means the caller should receive a 429
//   current  — requests counted in the current window
//   err      — only set on a Redis failure, not on a breach
//
// Key naming convention: callers should prefix by route to keep counters
// isolated, e.g. "rl:login:192.168.1.1", "rl:redirect:192.168.1.1".
func (r *RedisClient) RateLimit(key string, maxRequests int, windowSeconds int) (allowed bool, current int, err error) {
	now := time.Now()
	member := fmt.Sprintf("%d-%d", now.UnixNano(), rand.Int63())

	res, err := rateLimitScript.Run(
		r.ctx,
		r.client,
		[]string{key},
		now.UnixMilli(),
		windowSeconds*1000,
		maxRequests,
		member,
	).Int64Slice()
	if err != nil {
		return false, 0, fmt.Errorf("redis: rate limit script: %w", err)
	}

	return res[0] == 1, int(res[1]), nil
}

package cache

import (
	"context"
	"fmt"
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

var rateLimitScript = redis.NewScript(`
	local count = redis.call("INCR", KEYS[1])
	if count == 1 then
		redis.call("EXPIRE", KEYS[1], ARGV[1])
	end
	return count
`)

// RateLimit checks whether the IP identified by key has exceeded maxRequests
// in the last windowSeconds.
//
// Returns:
//   allowed  — false means the caller should receive a 429
//   current  — requests made in this window (use for X-RateLimit-Remaining)
//   err      — only set on a Redis failure, not on a breach
//
// Key naming convention: callers should prefix by route to keep counters
// isolated, e.g. "rl:login:192.168.1.1", "rl:redirect:192.168.1.1".
func (r *RedisClient) RateLimit(key string, maxRequests int, windowSeconds int) (allowed bool, current int, err error) {
	result, err := rateLimitScript.Run(
		r.ctx,
		r.client,
		[]string{key},
		windowSeconds,
	).Int()

	if err != nil {
		return false, 0, fmt.Errorf("redis: rate limit script: %w", err)
	}

	return result <= maxRequests, result, nil
}
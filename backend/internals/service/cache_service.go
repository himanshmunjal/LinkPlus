package service

// Cache is the interface both RedisClient (and any future cache) must satisfy.
type Cache interface {
	Get(key string) (string, bool, error)
	Put(key string, value string, ttlSeconds int) error
	Delete(key string) error
	Ping() error
	Close() error
}

type CacheService struct {
	cache Cache
}

func NewCacheService(cache Cache) *CacheService {
	return &CacheService{cache: cache}
}

func (c *CacheService) Get(key string) (string, bool, error) {
	return c.cache.Get(key)
}

func (c *CacheService) Put(key string, value string, ttl int) error {
	return c.cache.Put(key, value, ttl)
}

func (c *CacheService) Delete(key string) error {
	return c.cache.Delete(key)
}
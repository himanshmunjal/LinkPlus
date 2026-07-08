package worker

import (
    "backend/internals/repository"
    "backend/internals/service"
    "context"
    "log"
    "time"
)

type ExpiryWorker struct {
    repo  *repository.URLRepository
    cache *service.CacheService
}

func NewExpiryWorker(repo *repository.URLRepository, cache *service.CacheService) *ExpiryWorker {
    return &ExpiryWorker{repo: repo, cache: cache}
}

// Run starts the ticker goroutine. Call it with `go worker.Run(ctx)`.
func (w *ExpiryWorker) Run(ctx context.Context) {
    ticker := time.NewTicker(5 * time.Minute) // tune as needed
    defer ticker.Stop()

    log.Println("[ExpiryWorker] started")

    for {
        select {
        case <-ticker.C:
            w.sweep()
        case <-ctx.Done():
            log.Println("[ExpiryWorker] stopped")
            return
        }
    }
}

func (w *ExpiryWorker) sweep() {
    expired, err := w.repo.FindExpiredURLs()
    if err != nil {
        log.Printf("[ExpiryWorker] db error: %v", err)
        return
    }

    for _, u := range expired {
        _ = w.cache.Delete(u.ShortCode)  // evict from JCache/Redis
    }

    if len(expired) > 0 {
        if err := w.repo.DeleteExpiredURLs(); err != nil {
            log.Printf("[ExpiryWorker] delete error: %v", err)
            return
        }
        log.Printf("[ExpiryWorker] cleaned %d expired URLs", len(expired))
    }
}
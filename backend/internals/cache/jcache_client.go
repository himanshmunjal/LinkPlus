package cache

import (
	"bufio"
	"errors"
	"fmt"
	"net"
	"net/url"
	"strings"
	"sync"
	"time"
)

var ErrCacheMiss = errors.New("jcache: key not found")

type JCacheClient struct {
	host string
	port int

	conn   net.Conn
	reader *bufio.Reader
	mu     sync.Mutex

	dialTimeout time.Duration
	opTimeout   time.Duration
}

func NewJCacheClient(host string, port int) (*JCacheClient, error) {
	c := &JCacheClient{
		host:        host,
		port:        port,
		dialTimeout: 5 * time.Second,
		opTimeout:   2 * time.Second,
	}

	if err := c.connect(); err != nil {
		return nil, err
	}

	return c, nil
}

func (c *JCacheClient) connect() error {
	address := net.JoinHostPort(c.host, fmt.Sprintf("%d", c.port))
	conn, err := net.DialTimeout("tcp", address, c.dialTimeout)
	if err != nil {
		return err
	}

	c.conn = conn
	c.reader = bufio.NewReader(conn)
	return nil
}

func (c *JCacheClient) sendCommand(cmd string) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.conn == nil {
		if err := c.connect(); err != nil {
			return "", fmt.Errorf("jcache: reconnect failed: %w", err)
		}
	}

	if err := c.conn.SetDeadline(time.Now().Add(c.opTimeout)); err != nil {
		return "", err
	}

	_, err := c.conn.Write([]byte(cmd + "\r\n"))
	if err != nil {
		c.conn.Close()
		c.conn = nil
		return "", fmt.Errorf("jcache: write failed: %w", err)
	}

	response, err := c.reader.ReadString('\n')
	if err != nil {
		c.conn.Close()
		c.conn = nil
		return "", fmt.Errorf("jcache: read failed: %w", err)
	}

	return strings.TrimRight(response, "\r\n"), nil
}

func (c *JCacheClient) Get(key string) (string, bool, error) {
	resp, err := c.sendCommand(fmt.Sprintf("GET %s", key))
	if err != nil {
		return "", false, err
	}

	if strings.HasPrefix(resp, "-ERR") {
		if strings.Contains(resp, "key not found") || strings.Contains(resp, "not found") {
			return "", false, nil // Safe cache miss
		}
		return "", false, fmt.Errorf("jcache protocol error: %s", resp)
	}

	cleanValue := strings.TrimPrefix(resp, "+")
	decodedValue, err := url.QueryUnescape(cleanValue)

	if err != nil {
		return "", false, err
	}

	return decodedValue, true, nil
}

func (c *JCacheClient) Put(key string, value string, ttlSeconds int) error {
	var cmd string
	encodedValue := url.QueryEscape(value)
	if ttlSeconds > 0 {
		cmd = fmt.Sprintf(
			"PUT %s %s %d", key, encodedValue, ttlSeconds,)
	} else {
		cmd = fmt.Sprintf("PUT %s %s", key, encodedValue)
	}

	resp, err := c.sendCommand(cmd)
	if err != nil {
		return err
	}

	if resp != "+OK" {
		return fmt.Errorf("jcache: put failed: %s", resp)
	}
	return nil
}

func (c *JCacheClient) Delete(key string) error {
	resp, err := c.sendCommand(fmt.Sprintf("DELETE %s", key))
	if err != nil {
		return err
	}

	if resp != "+OK" {
		return fmt.Errorf("jcache: delete failed: %s", resp)
	}
	return nil
}

func (c *JCacheClient) Stats() (string, error) {
	resp, err := c.sendCommand("STATS")
	if err != nil {
		return "", err
	}

	if strings.HasPrefix(resp, "-ERR") {
		return "", fmt.Errorf("jcache: %s", strings.TrimPrefix(resp, "-ERR "))
	}

	return strings.TrimPrefix(resp, "+"), nil
}

func (c *JCacheClient) Ping() error {
	resp, err := c.sendCommand("PING")
	if err != nil {
		return err
	}

	if resp != "+PONG" {
		return fmt.Errorf("jcache: unexpected ping response: %s", resp)
	}
	return nil
}

func (c *JCacheClient) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.conn == nil {
		return nil
	}
	err := c.conn.Close()
	c.conn = nil
	return err
}

	// if strings.HasPrefix(resp, "+") {
	// 	return strings.TrimPrefix(resp, "+"), true, nil
	// }

	// if strings.HasPrefix(resp, "-ERR") {
	// 	if strings.Contains(resp, "key not found") {
	// 		return "", false, nil
	// 	}
	// 	return "", false, fmt.Errorf("jcache: %s", strings.TrimPrefix(resp, "-ERR "))
	// }

	// return "", false, fmt.Errorf("jcache: unexpected response: %s", resp)
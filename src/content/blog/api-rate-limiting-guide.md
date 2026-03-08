---
title: 'APIレートリミティング実装ガイド2026'
description: 'APIレートリミティングの実装を完全解説。トークンバケット、スライディングウィンドウ、Redis実装、Express/Hono対応まで実践的に紹介。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。'
pubDate: '2026-02-05'
tags: ['API', 'セキュリティ', 'Redis', 'Node.js', 'インフラ']
heroImage: '../../assets/thumbnails/api-rate-limiting-guide.jpg'
---

APIレートリミティングは、サービスの安定性とセキュリティに不可欠です。本記事では、主要なアルゴリズムと実装方法を徹底解説します。

## 目次

1. レートリミティングの基本
2. アルゴリズム比較
3. トークンバケット実装
4. スライディングウィンドウ実装
5. Redis実装
6. Express対応
7. Hono対応
8. 分散環境での実装
9. ベストプラクティス

## レートリミティングの基本

### なぜ必要か

```typescript
// レートリミティングが必要な理由
// 1. DDoS攻撃の防止
// 2. APIの公平な利用
// 3. サーバーリソースの保護
// 4. コストの最適化
// 5. サービス品質の維持
```

### レート制限の種類

```typescript
// ユーザーごと
const USER_RATE_LIMIT = {
  requests: 100,
  window: '1m', // 1分間に100リクエスト
}

// IPアドレスごと
const IP_RATE_LIMIT = {
  requests: 1000,
  window: '1h', // 1時間に1000リクエスト
}

// APIキーごと
const API_KEY_RATE_LIMIT = {
  free: { requests: 100, window: '1d' },
  pro: { requests: 10000, window: '1d' },
  enterprise: { requests: 1000000, window: '1d' },
}
```

### レスポンスヘッダー

```typescript
// 標準的なレートリミットヘッダー
const headers = {
  'X-RateLimit-Limit': '100', // 制限値
  'X-RateLimit-Remaining': '95', // 残り回数
  'X-RateLimit-Reset': '1640995200', // リセット時刻（UNIX timestamp）
  'Retry-After': '60', // 再試行までの秒数
}
```

## アルゴリズム比較

### 固定ウィンドウ

```typescript
// シンプルだが境界問題がある
class FixedWindowLimiter {
  private counts = new Map<string, { count: number; resetAt: number }>()

  isAllowed(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now()
    const data = this.counts.get(key)

    if (!data || now >= data.resetAt) {
      // 新しいウィンドウ
      this.counts.set(key, {
        count: 1,
        resetAt: now + windowMs,
      })
      return true
    }

    if (data.count < limit) {
      data.count++
      return true
    }

    return false
  }

  getInfo(key: string, limit: number) {
    const data = this.counts.get(key)
    if (!data) {
      return {
        remaining: limit,
        resetAt: Date.now() + 60000,
      }
    }

    return {
      remaining: Math.max(0, limit - data.count),
      resetAt: data.resetAt,
    }
  }
}
```

### スライディングウィンドウ

```typescript
// より正確だが計算コストが高い
class SlidingWindowLimiter {
  private requests = new Map<string, number[]>()

  isAllowed(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now()
    const timestamps = this.requests.get(key) || []

    // 古いタイムスタンプを削除
    const validTimestamps = timestamps.filter(ts => now - ts < windowMs)

    if (validTimestamps.length < limit) {
      validTimestamps.push(now)
      this.requests.set(key, validTimestamps)
      return true
    }

    this.requests.set(key, validTimestamps)
    return false
  }

  getInfo(key: string, limit: number, windowMs: number) {
    const now = Date.now()
    const timestamps = this.requests.get(key) || []
    const validTimestamps = timestamps.filter(ts => now - ts < windowMs)

    return {
      remaining: Math.max(0, limit - validTimestamps.length),
      resetAt: validTimestamps[0] ? validTimestamps[0] + windowMs : now + windowMs,
    }
  }
}
```

### トークンバケット

```typescript
// 柔軟でバースト対応可能
class TokenBucketLimiter {
  private buckets = new Map<string, {
    tokens: number
    lastRefill: number
  }>()

  isAllowed(
    key: string,
    capacity: number,
    refillRate: number, // tokens per second
    cost: number = 1
  ): boolean {
    const now = Date.now()
    const bucket = this.buckets.get(key) || {
      tokens: capacity,
      lastRefill: now,
    }

    // トークンを補充
    const timePassed = (now - bucket.lastRefill) / 1000
    const tokensToAdd = timePassed * refillRate
    bucket.tokens = Math.min(capacity, bucket.tokens + tokensToAdd)
    bucket.lastRefill = now

    if (bucket.tokens >= cost) {
      bucket.tokens -= cost
      this.buckets.set(key, bucket)
      return true
    }

    this.buckets.set(key, bucket)
    return false
  }

  getInfo(key: string, capacity: number, refillRate: number) {
    const now = Date.now()
    const bucket = this.buckets.get(key)

    if (!bucket) {
      return {
        remaining: capacity,
        resetAt: now,
      }
    }

    const timePassed = (now - bucket.lastRefill) / 1000
    const tokensToAdd = timePassed * refillRate
    const currentTokens = Math.min(capacity, bucket.tokens + tokensToAdd)

    return {
      remaining: Math.floor(currentTokens),
      resetAt: bucket.lastRefill + ((capacity - bucket.tokens) / refillRate) * 1000,
    }
  }
}
```

### リーキーバケット

```typescript
// 一定のレートで処理
class LeakyBucketLimiter {
  private queues = new Map<string, {
    queue: number[]
    lastLeak: number
  }>()

  isAllowed(
    key: string,
    capacity: number,
    leakRate: number // requests per second
  ): boolean {
    const now = Date.now()
    const data = this.queues.get(key) || {
      queue: [],
      lastLeak: now,
    }

    // リークを処理
    const timePassed = (now - data.lastLeak) / 1000
    const requestsToLeak = Math.floor(timePassed * leakRate)

    if (requestsToLeak > 0) {
      data.queue = data.queue.slice(requestsToLeak)
      data.lastLeak = now
    }

    // キューに追加
    if (data.queue.length < capacity) {
      data.queue.push(now)
      this.queues.set(key, data)
      return true
    }

    this.queues.set(key, data)
    return false
  }
}
```

## トークンバケット実装

### 基本実装

```typescript
// token-bucket.ts
export class TokenBucket {
  private tokens: number
  private lastRefill: number

  constructor(
    private capacity: number,
    private refillRate: number // tokens per second
  ) {
    this.tokens = capacity
    this.lastRefill = Date.now()
  }

  consume(tokens: number = 1): boolean {
    this.refill()

    if (this.tokens >= tokens) {
      this.tokens -= tokens
      return true
    }

    return false
  }

  private refill() {
    const now = Date.now()
    const timePassed = (now - this.lastRefill) / 1000
    const tokensToAdd = timePassed * this.refillRate

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd)
    this.lastRefill = now
  }

  getTokens(): number {
    this.refill()
    return Math.floor(this.tokens)
  }

  getWaitTime(tokens: number = 1): number {
    this.refill()

    if (this.tokens >= tokens) {
      return 0
    }

    const deficit = tokens - this.tokens
    return Math.ceil((deficit / this.refillRate) * 1000)
  }
}
```

### 階層型レート制限

```typescript
// tiered-rate-limiter.ts
type Tier = 'free' | 'pro' | 'enterprise'

const TIER_LIMITS = {
  free: { capacity: 100, refillRate: 100 / 3600 }, // 100 per hour
  pro: { capacity: 1000, refillRate: 1000 / 3600 }, // 1000 per hour
  enterprise: { capacity: 10000, refillRate: 10000 / 3600 }, // 10000 per hour
}

export class TieredRateLimiter {
  private buckets = new Map<string, TokenBucket>()

  isAllowed(userId: string, tier: Tier, cost: number = 1): boolean {
    const key = `${userId}:${tier}`
    let bucket = this.buckets.get(key)

    if (!bucket) {
      const config = TIER_LIMITS[tier]
      bucket = new TokenBucket(config.capacity, config.refillRate)
      this.buckets.set(key, bucket)
    }

    return bucket.consume(cost)
  }

  getInfo(userId: string, tier: Tier) {
    const key = `${userId}:${tier}`
    const bucket = this.buckets.get(key)
    const config = TIER_LIMITS[tier]

    if (!bucket) {
      return {
        limit: config.capacity,
        remaining: config.capacity,
        resetAt: Date.now() + 3600000,
      }
    }

    return {
      limit: config.capacity,
      remaining: bucket.getTokens(),
      resetAt: Date.now() + bucket.getWaitTime(1),
    }
  }
}
```

## スライディングウィンドウ実装

### メモリベース

```typescript
// sliding-window.ts
export class SlidingWindowLimiter {
  private windows = new Map<string, number[]>()

  isAllowed(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now()
    const requests = this.windows.get(key) || []

    // ウィンドウ外のリクエストを削除
    const validRequests = requests.filter(timestamp => now - timestamp < windowMs)

    if (validRequests.length < limit) {
      validRequests.push(now)
      this.windows.set(key, validRequests)
      return true
    }

    this.windows.set(key, validRequests)
    return false
  }

  getInfo(key: string, limit: number, windowMs: number) {
    const now = Date.now()
    const requests = this.windows.get(key) || []
    const validRequests = requests.filter(timestamp => now - timestamp < windowMs)

    const oldestRequest = validRequests[0] || now
    const resetAt = oldestRequest + windowMs

    return {
      limit,
      remaining: Math.max(0, limit - validRequests.length),
      resetAt,
      retryAfter: validRequests.length >= limit
        ? Math.ceil((resetAt - now) / 1000)
        : 0,
    }
  }

  // 定期的にクリーンアップ
  cleanup(maxAge: number = 3600000) {
    const now = Date.now()
    for (const [key, requests] of this.windows.entries()) {
      const validRequests = requests.filter(timestamp => now - timestamp < maxAge)
      if (validRequests.length === 0) {
        this.windows.delete(key)
      } else {
        this.windows.set(key, validRequests)
      }
    }
  }
}
```

### スライディングウィンドウログ

```typescript
// sliding-window-log.ts
type RequestLog = {
  timestamp: number
  cost: number
}

export class SlidingWindowLog {
  private logs = new Map<string, RequestLog[]>()

  isAllowed(
    key: string,
    limit: number,
    windowMs: number,
    cost: number = 1
  ): boolean {
    const now = Date.now()
    const requests = this.logs.get(key) || []

    // ウィンドウ外のリクエストを削除
    const validRequests = requests.filter(
      req => now - req.timestamp < windowMs
    )

    // コストの合計を計算
    const totalCost = validRequests.reduce((sum, req) => sum + req.cost, 0)

    if (totalCost + cost <= limit) {
      validRequests.push({ timestamp: now, cost })
      this.logs.set(key, validRequests)
      return true
    }

    this.logs.set(key, validRequests)
    return false
  }

  getInfo(key: string, limit: number, windowMs: number) {
    const now = Date.now()
    const requests = this.logs.get(key) || []
    const validRequests = requests.filter(
      req => now - req.timestamp < windowMs
    )

    const totalCost = validRequests.reduce((sum, req) => sum + req.cost, 0)
    const oldestRequest = validRequests[0]?.timestamp || now

    return {
      limit,
      used: totalCost,
      remaining: Math.max(0, limit - totalCost),
      resetAt: oldestRequest + windowMs,
    }
  }
}
```

## Redis実装

### Redisベーストークンバケット

```typescript
// redis-token-bucket.ts
import { Redis } from 'ioredis'

export class RedisTokenBucket {
  constructor(private redis: Redis) {}

  async isAllowed(
    key: string,
    capacity: number,
    refillRate: number, // tokens per second
    cost: number = 1
  ): Promise<boolean> {
    const now = Date.now()
    const bucketKey = `rate:${key}`

    // Luaスクリプトでアトミックに処理
    const script = `
      local key = KEYS[1]
      local capacity = tonumber(ARGV[1])
      local refillRate = tonumber(ARGV[2])
      local cost = tonumber(ARGV[3])
      local now = tonumber(ARGV[4])

      local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
      local tokens = tonumber(bucket[1]) or capacity
      local lastRefill = tonumber(bucket[2]) or now

      -- トークンを補充
      local timePassed = (now - lastRefill) / 1000
      local tokensToAdd = timePassed * refillRate
      tokens = math.min(capacity, tokens + tokensToAdd)

      -- トークンを消費
      if tokens >= cost then
        tokens = tokens - cost
        redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
        redis.call('EXPIRE', key, 3600)
        return {1, tokens}
      else
        redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
        redis.call('EXPIRE', key, 3600)
        return {0, tokens}
      end
    `

    const result = await this.redis.eval(
      script,
      1,
      bucketKey,
      capacity,
      refillRate,
      cost,
      now
    ) as [number, number]

    return result[0] === 1
  }

  async getInfo(key: string, capacity: number, refillRate: number) {
    const now = Date.now()
    const bucketKey = `rate:${key}`

    const bucket = await this.redis.hmget(bucketKey, 'tokens', 'lastRefill')
    const tokens = parseFloat(bucket[0] || capacity.toString())
    const lastRefill = parseFloat(bucket[1] || now.toString())

    // トークンを補充（読み取りのみ）
    const timePassed = (now - lastRefill) / 1000
    const tokensToAdd = timePassed * refillRate
    const currentTokens = Math.min(capacity, tokens + tokensToAdd)

    return {
      limit: capacity,
      remaining: Math.floor(currentTokens),
      resetAt: lastRefill + ((capacity - tokens) / refillRate) * 1000,
    }
  }
}
```

### Redisスライディングウィンドウ

```typescript
// redis-sliding-window.ts
import { Redis } from 'ioredis'

export class RedisSlidingWindow {
  constructor(private redis: Redis) {}

  async isAllowed(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<boolean> {
    const now = Date.now()
    const windowKey = `rate:${key}`
    const windowStart = now - windowMs

    // Luaスクリプトでアトミックに処理
    const script = `
      local key = KEYS[1]
      local limit = tonumber(ARGV[1])
      local windowStart = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])

      -- 古いエントリを削除
      redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)

      -- 現在のカウントを取得
      local count = redis.call('ZCARD', key)

      if count < limit then
        redis.call('ZADD', key, now, now)
        redis.call('EXPIRE', key, 3600)
        return 1
      else
        return 0
      end
    `

    const result = await this.redis.eval(
      script,
      1,
      windowKey,
      limit,
      windowStart,
      now
    )

    return result === 1
  }

  async getInfo(key: string, limit: number, windowMs: number) {
    const now = Date.now()
    const windowKey = `rate:${key}`
    const windowStart = now - windowMs

    // 古いエントリを削除
    await this.redis.zremrangebyscore(windowKey, 0, windowStart)

    // 現在のカウントを取得
    const count = await this.redis.zcard(windowKey)

    // 最も古いエントリのタイムスタンプを取得
    const oldest = await this.redis.zrange(windowKey, 0, 0, 'WITHSCORES')
    const oldestTimestamp = oldest[1] ? parseFloat(oldest[1]) : now

    return {
      limit,
      remaining: Math.max(0, limit - count),
      resetAt: oldestTimestamp + windowMs,
      retryAfter: count >= limit
        ? Math.ceil((oldestTimestamp + windowMs - now) / 1000)
        : 0,
    }
  }
}
```

## Express対応

### ミドルウェア実装

```typescript
// express-rate-limit.ts
import { Request, Response, NextFunction } from 'express'
import { Redis } from 'ioredis'
import { RedisSlidingWindow } from './redis-sliding-window'

type RateLimitConfig = {
  windowMs: number
  max: number
  message?: string
  statusCode?: number
  keyGenerator?: (req: Request) => string
  skip?: (req: Request) => boolean
  handler?: (req: Request, res: Response) => void
}

export function createRateLimiter(
  redis: Redis,
  config: RateLimitConfig
) {
  const limiter = new RedisSlidingWindow(redis)

  const {
    windowMs,
    max,
    message = 'Too many requests',
    statusCode = 429,
    keyGenerator = (req) => req.ip,
    skip = () => false,
    handler,
  } = config

  return async (req: Request, res: Response, next: NextFunction) => {
    if (skip(req)) {
      return next()
    }

    const key = keyGenerator(req)
    const allowed = await limiter.isAllowed(key, max, windowMs)
    const info = await limiter.getInfo(key, max, windowMs)

    // レートリミットヘッダーを設定
    res.setHeader('X-RateLimit-Limit', info.limit)
    res.setHeader('X-RateLimit-Remaining', info.remaining)
    res.setHeader('X-RateLimit-Reset', Math.ceil(info.resetAt / 1000))

    if (!allowed) {
      res.setHeader('Retry-After', info.retryAfter)

      if (handler) {
        return handler(req, res)
      }

      return res.status(statusCode).json({
        error: message,
        retryAfter: info.retryAfter,
      })
    }

    next()
  }
}
```

### 使用例

```typescript
// app.ts
import express from 'express'
import { Redis } from 'ioredis'
import { createRateLimiter } from './express-rate-limit'

const app = express()
const redis = new Redis()

// グローバルレート制限
app.use(createRateLimiter(redis, {
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 100リクエスト
}))

// API固有のレート制限
const apiLimiter = createRateLimiter(redis, {
  windowMs: 60 * 1000, // 1分
  max: 10, // 10リクエスト
  keyGenerator: (req) => req.user?.id || req.ip,
  skip: (req) => req.user?.tier === 'enterprise',
})

app.use('/api/', apiLimiter)

// エンドポイント固有のレート制限
const strictLimiter = createRateLimiter(redis, {
  windowMs: 60 * 1000, // 1分
  max: 5, // 5リクエスト
  message: 'Too many login attempts',
})

app.post('/api/login', strictLimiter, (req, res) => {
  // ログイン処理
})
```

## Hono対応

### Honoミドルウェア

```typescript
// hono-rate-limit.ts
import { Context, Next } from 'hono'
import { Redis } from 'ioredis'
import { RedisSlidingWindow } from './redis-sliding-window'

type HonoRateLimitConfig = {
  windowMs: number
  max: number
  message?: string
  statusCode?: number
  keyGenerator?: (c: Context) => string
  skip?: (c: Context) => boolean
}

export function rateLimiter(
  redis: Redis,
  config: HonoRateLimitConfig
) {
  const limiter = new RedisSlidingWindow(redis)

  const {
    windowMs,
    max,
    message = 'Too many requests',
    statusCode = 429,
    keyGenerator = (c) => c.req.header('x-forwarded-for') || 'unknown',
    skip = () => false,
  } = config

  return async (c: Context, next: Next) => {
    if (skip(c)) {
      return next()
    }

    const key = keyGenerator(c)
    const allowed = await limiter.isAllowed(key, max, windowMs)
    const info = await limiter.getInfo(key, max, windowMs)

    // レートリミットヘッダーを設定
    c.header('X-RateLimit-Limit', info.limit.toString())
    c.header('X-RateLimit-Remaining', info.remaining.toString())
    c.header('X-RateLimit-Reset', Math.ceil(info.resetAt / 1000).toString())

    if (!allowed) {
      c.header('Retry-After', info.retryAfter.toString())
      return c.json({
        error: message,
        retryAfter: info.retryAfter,
      }, statusCode)
    }

    await next()
  }
}
```

### Hono使用例

```typescript
// app.ts
import { Hono } from 'hono'
import { Redis } from 'ioredis'
import { rateLimiter } from './hono-rate-limit'

const app = new Hono()
const redis = new Redis()

// グローバルレート制限
app.use('*', rateLimiter(redis, {
  windowMs: 15 * 60 * 1000,
  max: 100,
}))

// API固有のレート制限
app.use('/api/*', rateLimiter(redis, {
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (c) => c.get('userId') || c.req.header('x-forwarded-for') || 'unknown',
}))

// エンドポイント固有のレート制限
const strictLimiter = rateLimiter(redis, {
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many login attempts',
})

app.post('/api/login', strictLimiter, async (c) => {
  // ログイン処理
  return c.json({ message: 'Login successful' })
})

export default app
```

## 分散環境での実装

### Redisクラスター対応

```typescript
// distributed-rate-limiter.ts
import { Cluster } from 'ioredis'

export class DistributedRateLimiter {
  constructor(private cluster: Cluster) {}

  async isAllowed(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<boolean> {
    const now = Date.now()
    const windowKey = `rate:${key}`
    const windowStart = now - windowMs

    // ハッシュタグを使用して同じスロットに配置
    const slotKey = `{${key}}`

    const script = `
      local key = KEYS[1]
      local limit = tonumber(ARGV[1])
      local windowStart = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])

      redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)
      local count = redis.call('ZCARD', key)

      if count < limit then
        redis.call('ZADD', key, now, now)
        redis.call('EXPIRE', key, 3600)
        return 1
      else
        return 0
      end
    `

    const result = await this.cluster.eval(
      script,
      1,
      `${slotKey}:${windowKey}`,
      limit,
      windowStart,
      now
    )

    return result === 1
  }
}
```

### マルチリージョン対応

```typescript
// multi-region-limiter.ts
import { Redis } from 'ioredis'

export class MultiRegionLimiter {
  constructor(
    private primaryRedis: Redis,
    private replicaRedis: Redis
  ) {}

  async isAllowed(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<boolean> {
    try {
      // プライマリで書き込み
      return await this.checkLimit(this.primaryRedis, key, limit, windowMs)
    } catch (error) {
      console.error('Primary Redis error:', error)
      // フェイルオーバー
      return await this.checkLimit(this.replicaRedis, key, limit, windowMs)
    }
  }

  private async checkLimit(
    redis: Redis,
    key: string,
    limit: number,
    windowMs: number
  ): Promise<boolean> {
    const now = Date.now()
    const windowKey = `rate:${key}`
    const windowStart = now - windowMs

    const script = `
      local key = KEYS[1]
      local limit = tonumber(ARGV[1])
      local windowStart = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])

      redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)
      local count = redis.call('ZCARD', key)

      if count < limit then
        redis.call('ZADD', key, now, now)
        redis.call('EXPIRE', key, 3600)
        return 1
      else
        return 0
      end
    `

    const result = await redis.eval(
      script,
      1,
      windowKey,
      limit,
      windowStart,
      now
    )

    return result === 1
  }
}
```

## ベストプラクティス

### レート制限の設計

```typescript
// rate-limit-config.ts
export const RATE_LIMITS = {
  // グローバル制限
  global: {
    windowMs: 15 * 60 * 1000, // 15分
    max: 1000,
  },

  // 認証エンドポイント
  auth: {
    windowMs: 60 * 1000, // 1分
    max: 5,
  },

  // API階層別
  tiers: {
    free: {
      windowMs: 60 * 60 * 1000, // 1時間
      max: 100,
    },
    pro: {
      windowMs: 60 * 60 * 1000,
      max: 1000,
    },
    enterprise: {
      windowMs: 60 * 60 * 1000,
      max: 10000,
    },
  },

  // コストベース
  costs: {
    read: 1,
    write: 5,
    search: 10,
    export: 50,
  },
}
```

### エラーハンドリング

```typescript
// error-handling.ts
export function handleRateLimitError(
  remaining: number,
  resetAt: number,
  retryAfter: number
) {
  return {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Rate limit exceeded',
      details: {
        limit: 'Request limit has been exceeded',
        remaining,
        resetAt: new Date(resetAt).toISOString(),
        retryAfter,
      },
    },
  }
}
```

### モニタリング

```typescript
// monitoring.ts
export async function trackRateLimit(
  key: string,
  allowed: boolean,
  info: {
    limit: number
    remaining: number
    resetAt: number
  }
) {
  // メトリクスを記録
  await metrics.increment('rate_limit.requests', {
    key,
    allowed: allowed.toString(),
  })

  if (!allowed) {
    await metrics.increment('rate_limit.exceeded', { key })
  }

  // 使用率を記録
  const usage = ((info.limit - info.remaining) / info.limit) * 100
  await metrics.gauge('rate_limit.usage', usage, { key })
}
```

## まとめ

APIレートリミティングは、サービスの安定性とセキュリティに不可欠な機能です。

**主要なアルゴリズム**:

1. **固定ウィンドウ**: シンプルだが境界問題あり
2. **スライディングウィンドウ**: 正確だが計算コスト高
3. **トークンバケット**: 柔軟でバースト対応
4. **リーキーバケット**: 一定レートで処理

**2026年のベストプラクティス**:

- Redisで分散環境対応
- 適切なアルゴリズム選択
- 階層型レート制限
- レスポンスヘッダーの設定
- モニタリングとアラート

適切なレートリミティングを実装して、安定したAPIサービスを提供しましょう。

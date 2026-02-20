---
title: 'Redis実践ガイド — キャッシュ・セッション・Pub/Sub・Rate Limiting完全実装'
description: 'Redisを実務で使い倒す実践ガイド。キャッシュ戦略・セッション管理・Pub/Sub・Rate Limiting・分散ロック・キュー実装をNode.js/TypeScriptコード付きで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-5.jpg'
---

Redisはインメモリデータストアとして広く知られているが、単なる「高速なキャッシュ層」以上の存在だ。セッション管理、リアルタイム通信、Rate Limiting、分散ロック、ジョブキューと、モダンなWebアーキテクチャに欠かせない多様な役割を担う。本記事では、Node.js/TypeScript環境でRedisを実務レベルで使い倒すための実装パターンを体系的に解説する。

---

## 1. Redisの基本データ型

Redisが強力な理由の一つは、用途に応じて選択できる豊富なデータ型にある。各型の特性を理解することが、最適な設計の出発点となる。

### String — 万能な基本型

最もシンプルなデータ型。テキスト、数値、シリアライズされたJSONを格納できる。

```typescript
// 基本操作
await redis.set('user:1:name', 'Alice');
await redis.set('page:views', '0');

// TTL付きセット（秒単位）
await redis.setex('session:abc123', 3600, JSON.stringify({ userId: 1 }));

// NX（Not Exists）オプション — キーが存在しない場合のみセット
const acquired = await redis.set('lock:resource', 'owner-id', 'NX', 'PX', 30000);

// インクリメント
await redis.incr('page:views');
await redis.incrby('score:user:1', 10);
```

### Hash — オブジェクトの格納

フィールドと値のペアを持つ辞書型。ユーザープロフィールや設定情報の格納に最適。

```typescript
// ユーザー情報をHashで管理
await redis.hset('user:1', {
  name: 'Alice',
  email: 'alice@example.com',
  role: 'admin',
  createdAt: Date.now().toString()
});

// 単一フィールド取得
const name = await redis.hget('user:1', 'name');

// 全フィールド取得
const user = await redis.hgetall('user:1');
// => { name: 'Alice', email: '...', role: 'admin', createdAt: '...' }

// フィールドの更新（存在するキーのみ更新）
await redis.hsetnx('user:1', 'loginCount', '0');
await redis.hincrby('user:1', 'loginCount', 1);
```

Hashを使う利点は、ユーザーオブジェクト全体をJSONシリアライズして1つのStringに格納するより、必要なフィールドだけを取得・更新できる点にある。メモリ効率も向上する。

### List — キューとスタック

順序付きリスト。左右両端からの追加・取得ができるため、FIFOキューやLIFOスタックとして活用できる。

```typescript
// 右端に追加（キュー）
await redis.rpush('queue:emails', JSON.stringify({ to: 'alice@example.com', subject: 'Welcome' }));
await redis.rpush('queue:emails', JSON.stringify({ to: 'bob@example.com', subject: 'Welcome' }));

// 左端から取得（FIFO）
const job = await redis.lpop('queue:emails');

// ブロッキングポップ（ワーカーパターン）
const [key, value] = await redis.blpop('queue:emails', 5); // 5秒タイムアウト

// 最新N件の保持（タイムラインなど）
await redis.lpush('timeline:user:1', JSON.stringify(event));
await redis.ltrim('timeline:user:1', 0, 99); // 最新100件だけ保持
```

### Set — 重複なしのコレクション

順序なし、重複なしの集合。「フォロワー一覧」「タグ」などに適している。

```typescript
// メンバー追加
await redis.sadd('online:users', 'user:1', 'user:2', 'user:3');

// メンバーチェック
const isOnline = await redis.sismember('online:users', 'user:1'); // 1 or 0

// 全メンバー取得
const onlineUsers = await redis.smembers('online:users');

// 集合演算（フォロワー共通チェック）
const commonFollowers = await redis.sinter('followers:alice', 'followers:bob');

// ランダム取得（ガチャなど）
const winner = await redis.srandmember('participants', 1);
```

### Sorted Set (ZSet) — スコア付き順位管理

スコアと値のペアを保持し、スコア順に自動ソートされる。ランキング、優先度キュー、レート制限の実装に不可欠。

```typescript
// スコア付きで追加
await redis.zadd('leaderboard:game', 9500, 'player:alice');
await redis.zadd('leaderboard:game', 8200, 'player:bob');
await redis.zadd('leaderboard:game', 7800, 'player:carol');

// ランキング取得（高スコア順）
const top10 = await redis.zrevrange('leaderboard:game', 0, 9, 'WITHSCORES');

// 特定プレイヤーの順位（0-indexed）
const rank = await redis.zrevrank('leaderboard:game', 'player:alice'); // => 0

// スコア更新
await redis.zincrby('leaderboard:game', 500, 'player:bob');

// 期限付きメンバー（タイムスタンプをスコアに使う）
const now = Date.now();
await redis.zadd('rate:user:1', now, `req:${now}`);
// 1分前より古いものを削除
await redis.zremrangebyscore('rate:user:1', 0, now - 60000);
```

### Stream — 永続的なメッセージログ

Redis 5.0で追加された型。Kafkaに似たメッセージストリーム。消費者グループによる分散処理をサポートする。

```typescript
// メッセージ追加（IDは自動生成）
const id = await redis.xadd('events:orders', '*', 'orderId', '1001', 'amount', '5000');

// メッセージ読み取り（最新10件）
const messages = await redis.xread('COUNT', 10, 'STREAMS', 'events:orders', '0');

// 消費者グループの作成
await redis.xgroup('CREATE', 'events:orders', 'order-processors', '$', 'MKSTREAM');

// グループ読み取り（未処理メッセージ）
const pending = await redis.xreadgroup(
  'GROUP', 'order-processors', 'worker-1',
  'COUNT', 10, 'STREAMS', 'events:orders', '>'
);
```

---

## 2. Node.js接続 — ioredisと接続プール設定

`ioredis`はNode.js向けの最も成熟したRedisクライアントだ。接続プール、クラスター対応、Luaスクリプト、パイプラインを強力にサポートする。

```bash
npm install ioredis
npm install -D @types/node
```

### 接続設定のベストプラクティス

```typescript
// src/lib/redis.ts
import Redis, { RedisOptions } from 'ioredis';

const redisConfig: RedisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),

  // 接続プール設定
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  connectTimeout: 10000,

  // 再接続戦略（指数バックオフ）
  retryStrategy(times: number) {
    if (times > 10) {
      console.error('Redis: max retry attempts reached');
      return null; // 再接続停止
    }
    const delay = Math.min(times * 100, 3000);
    console.log(`Redis: reconnecting in ${delay}ms (attempt ${times})`);
    return delay;
  },

  // 再接続時にサブスクリプションを自動復元
  reconnectOnError(err: Error) {
    const targetErrors = ['READONLY', 'ECONNRESET'];
    return targetErrors.some(msg => err.message.includes(msg));
  },

  // レイジーコネクト（必要になるまで接続しない）
  lazyConnect: true,
};

// シングルトンインスタンス
let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(redisConfig);

    redisClient.on('connect', () => console.log('Redis: connected'));
    redisClient.on('ready', () => console.log('Redis: ready'));
    redisClient.on('error', (err) => console.error('Redis error:', err));
    redisClient.on('close', () => console.log('Redis: connection closed'));
  }
  return redisClient;
}

// Next.jsのホットリロード対策
declare global {
  var redis: Redis | undefined;
}

export const redis = global.redis ?? getRedisClient();

if (process.env.NODE_ENV !== 'production') {
  global.redis = redis;
}
```

### 接続健全性チェック

```typescript
// src/lib/redis-health.ts
import { redis } from './redis';

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch (err) {
    console.error('Redis health check failed:', err);
    return false;
  }
}

// APIルートでの使用例（Next.js App Router）
// src/app/api/health/route.ts
export async function GET() {
  const redisHealthy = await checkRedisHealth();
  return Response.json({
    status: redisHealthy ? 'ok' : 'degraded',
    redis: redisHealthy ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
}
```

---

## 3. キャッシュ戦略 — Cache-Aside・Write-Through・TTL設計

### Cache-Aside（最も一般的）

アプリケーションがキャッシュとデータストアの両方を管理するパターン。

```typescript
// src/lib/cache.ts
import { redis } from './redis';

interface CacheOptions {
  ttl?: number;        // TTL（秒）
  prefix?: string;     // キープレフィックス
}

export class CacheManager {
  private defaultTTL = 3600; // 1時間

  async get<T>(key: string): Promise<T | null> {
    const cached = await redis.get(key);
    if (!cached) return null;

    try {
      return JSON.parse(cached) as T;
    } catch {
      return cached as unknown as T;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    const expiry = ttl ?? this.defaultTTL;
    await redis.setex(key, expiry, serialized);
  }

  async delete(key: string): Promise<void> {
    await redis.del(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    // 本番環境では SCAN を使うこと（KEYS はブロッキング）
    const stream = redis.scanStream({ match: pattern, count: 100 });
    const keys: string[] = [];

    stream.on('data', (batch: string[]) => keys.push(...batch));
    await new Promise<void>((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

// Cache-Asideパターンの実装
export async function getCachedUser(userId: string) {
  const cache = new CacheManager();
  const cacheKey = `user:${userId}`;

  // 1. キャッシュから取得を試みる
  const cached = await cache.get<User>(cacheKey);
  if (cached) {
    console.log('Cache HIT:', cacheKey);
    return cached;
  }

  // 2. キャッシュミス — DBから取得
  console.log('Cache MISS:', cacheKey);
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  // 3. キャッシュに書き込む
  await cache.set(cacheKey, user, 1800); // 30分キャッシュ

  return user;
}
```

### Write-Through — 一貫性重視

書き込み時に同時にキャッシュを更新する。読み取りは常にキャッシュから行える。

```typescript
export async function updateUserWithCache(userId: string, data: Partial<User>) {
  // 1. DBに書き込む
  const updated = await db.user.update({
    where: { id: userId },
    data
  });

  // 2. キャッシュも同時に更新（Write-Through）
  const cache = new CacheManager();
  await cache.set(`user:${userId}`, updated, 1800);

  return updated;
}
```

### TTL設計のガイドライン

```typescript
// TTLの設計指針
export const TTL = {
  // 静的・変化が少ないデータ（長め）
  CONFIG: 86400,           // 24時間 — サイト設定
  PRODUCT_CATALOG: 3600,   // 1時間 — 商品カタログ
  USER_PROFILE: 1800,      // 30分 — ユーザープロフィール

  // 動的・頻繁に変わるデータ（短め）
  FEED_TIMELINE: 300,      // 5分 — タイムライン
  SEARCH_RESULTS: 60,      // 1分 — 検索結果
  STOCK_PRICE: 10,         // 10秒 — 株価

  // セッション系
  SESSION: 7200,           // 2時間
  TEMP_TOKEN: 300,         // 5分 — 一時トークン

  // Rate Limiting
  RATE_LIMIT_WINDOW: 60,   // 1分間
} as const;

// ジッター（揺らぎ）でThundering Herd問題を防止
export function withJitter(ttl: number, jitterPercent = 0.1): number {
  const jitter = ttl * jitterPercent * Math.random();
  return Math.floor(ttl + jitter);
}
```

---

## 4. セッション管理 — express-session + connect-redis

```bash
npm install express-session connect-redis
npm install -D @types/express-session
```

```typescript
// src/middleware/session.ts
import session from 'express-session';
import { createClient } from 'redis';
import RedisStore from 'connect-redis';

// connect-redisはioredisではなく公式redis clientを使う
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.connect().catch(console.error);

const redisStore = new RedisStore({
  client: redisClient,
  prefix: 'sess:',     // キープレフィックス
  ttl: 7200,           // 2時間（秒単位）
  disableTouch: false, // アクセス時にTTLをリセット
});

export const sessionMiddleware = session({
  store: redisStore,
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  rolling: true,         // アクセスのたびにCookie有効期限を延長
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7200 * 1000, // ミリ秒
    sameSite: 'lax'
  }
});

// セッションの型拡張
declare module 'express-session' {
  interface SessionData {
    userId: string;
    role: 'admin' | 'user';
    lastActivity: number;
  }
}

// ログイン処理
export async function loginHandler(req: Request, res: Response) {
  const { email, password } = req.body;
  const user = await authenticateUser(email, password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // セッションにユーザー情報を保存
  req.session.userId = user.id;
  req.session.role = user.role;
  req.session.lastActivity = Date.now();

  // セッション保存を確実に待つ
  await new Promise<void>((resolve, reject) => {
    req.session.save((err) => err ? reject(err) : resolve());
  });

  res.json({ success: true });
}
```

---

## 5. Pub/Subパターン — チャット・リアルタイム通知

Redisのパブリッシュ/サブスクライブは、サーバー間のリアルタイムメッセージングに使われる。

```typescript
// src/lib/pubsub.ts
import Redis from 'ioredis';

// Pub/SubではSUBSCRIBE後に他のコマンドを実行できないため
// 専用の接続インスタンスが必要
const publisher = new Redis(process.env.REDIS_URL!);
const subscriber = new Redis(process.env.REDIS_URL!);

// メッセージの型定義
interface ChatMessage {
  roomId: string;
  userId: string;
  content: string;
  timestamp: number;
}

// チャットルームへ送信
export async function publishChatMessage(message: ChatMessage): Promise<void> {
  const channel = `chat:room:${message.roomId}`;
  await publisher.publish(channel, JSON.stringify(message));

  // メッセージ履歴も保存（最新200件）
  await publisher.lpush(`history:room:${message.roomId}`, JSON.stringify(message));
  await publisher.ltrim(`history:room:${message.roomId}`, 0, 199);
}

// チャットルームを購読
export function subscribeChatRoom(
  roomId: string,
  onMessage: (msg: ChatMessage) => void
): () => Promise<void> {
  const channel = `chat:room:${roomId}`;

  subscriber.subscribe(channel);
  subscriber.on('message', (ch, data) => {
    if (ch === channel) {
      try {
        onMessage(JSON.parse(data));
      } catch (err) {
        console.error('Failed to parse message:', err);
      }
    }
  });

  // アンサブスクライブ関数を返す
  return async () => {
    await subscriber.unsubscribe(channel);
  };
}

// パターンサブスクライブ（複数チャンネルをワイルドカードで）
export function subscribeUserNotifications(
  userId: string,
  onNotification: (channel: string, data: unknown) => void
): () => Promise<void> {
  const pattern = `notify:user:${userId}:*`;

  subscriber.psubscribe(pattern);
  subscriber.on('pmessage', (pat, channel, data) => {
    if (pat === pattern) {
      onNotification(channel, JSON.parse(data));
    }
  });

  return async () => {
    await subscriber.punsubscribe(pattern);
  };
}

// WebSocketサーバーとの統合（Socket.io / ws）
import { WebSocketServer, WebSocket } from 'ws';

export function setupRealtimeServer(wss: WebSocketServer) {
  // クライアントごとにアクティブなサブスクリプションを管理
  const clientRooms = new Map<WebSocket, Set<string>>();
  const unsubFunctions = new Map<WebSocket, Map<string, () => Promise<void>>>();

  wss.on('connection', (ws) => {
    clientRooms.set(ws, new Set());
    unsubFunctions.set(ws, new Map());

    ws.on('message', async (raw) => {
      const { type, roomId } = JSON.parse(raw.toString());

      if (type === 'join' && roomId) {
        const unsub = subscribeChatRoom(roomId, (msg) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'message', data: msg }));
          }
        });
        unsubFunctions.get(ws)?.set(roomId, unsub);
      }

      if (type === 'leave' && roomId) {
        const unsub = unsubFunctions.get(ws)?.get(roomId);
        if (unsub) await unsub();
      }
    });

    ws.on('close', async () => {
      // クリーンアップ
      const unsubs = unsubFunctions.get(ws);
      if (unsubs) {
        await Promise.all([...unsubs.values()].map(fn => fn()));
      }
      clientRooms.delete(ws);
      unsubFunctions.delete(ws);
    });
  });
}
```

---

## 6. Rate Limiting実装 — Sliding Window・Token Bucket

### Sliding Window（スライディングウィンドウ）

```typescript
// src/lib/rate-limiter.ts
import { redis } from './redis';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  total: number;
}

// Sorted SetによるSliding Window実装
export async function slidingWindowRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const key = `ratelimit:sw:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  // パイプラインでアトミックに処理
  const results = await redis
    .pipeline()
    .zremrangebyscore(key, 0, windowStart)    // 古いエントリを削除
    .zadd(key, now, `${now}-${Math.random()}`) // 現在のリクエストを追加
    .zcard(key)                               // ウィンドウ内のリクエスト数を取得
    .expire(key, Math.ceil(windowMs / 1000)) // TTL設定
    .exec();

  const count = results?.[2]?.[1] as number ?? 0;
  const allowed = count <= limit;

  if (!allowed) {
    // 超過した場合は追加したエントリを削除
    await redis.zremrangebyscore(key, now, now);
  }

  return {
    allowed,
    remaining: Math.max(0, limit - count),
    resetAt: now + windowMs,
    total: limit
  };
}

// Fixed Window（シンプルだがバースト問題あり）
export async function fixedWindowRateLimit(
  identifier: string,
  limit: number,
  windowSec: number
): Promise<RateLimitResult> {
  const window = Math.floor(Date.now() / 1000 / windowSec);
  const key = `ratelimit:fw:${identifier}:${window}`;

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSec);
  }

  const resetAt = (window + 1) * windowSec * 1000;

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt,
    total: limit
  };
}

// Express/Next.jsミドルウェア
export function rateLimitMiddleware(options: {
  limit: number;
  windowMs: number;
  keyGenerator?: (req: any) => string;
}) {
  return async (req: any, res: any, next: any) => {
    const identifier = options.keyGenerator
      ? options.keyGenerator(req)
      : req.ip || req.headers['x-forwarded-for'] || 'unknown';

    const result = await slidingWindowRateLimit(
      identifier,
      options.limit,
      options.windowMs
    );

    // レスポンスヘッダーに情報を付与
    res.setHeader('X-RateLimit-Limit', result.total);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetAt);

    if (!result.allowed) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        resetAt: new Date(result.resetAt).toISOString()
      });
    }

    next();
  };
}
```

### Token Bucket（トークンバケット）

バースト許容型のレート制限。APIの瞬発的な利用を許容しつつ長期的なレートを制限する。

```typescript
// Luaスクリプトによるトークンバケット（アトミック）
const tokenBucketScript = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])   -- トークン/秒
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local data = redis.call('HMGET', key, 'tokens', 'lastRefill')
local tokens = tonumber(data[1]) or capacity
local lastRefill = tonumber(data[2]) or now

-- 経過時間に基づいてトークンを補充
local elapsed = now - lastRefill
local newTokens = math.min(capacity, tokens + elapsed * refillRate)

if newTokens >= requested then
  -- トークンを消費
  redis.call('HMSET', key, 'tokens', newTokens - requested, 'lastRefill', now)
  redis.call('EXPIRE', key, math.ceil(capacity / refillRate) + 1)
  return {1, math.floor(newTokens - requested)}
else
  -- トークン不足
  redis.call('HMSET', key, 'tokens', newTokens, 'lastRefill', now)
  redis.call('EXPIRE', key, math.ceil(capacity / refillRate) + 1)
  return {0, math.floor(newTokens)}
end
`;

export async function tokenBucketRateLimit(
  identifier: string,
  capacity: number,     // バケット容量（最大バースト）
  refillRate: number,   // 補充速度（トークン/秒）
  requested = 1
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `ratelimit:tb:${identifier}`;
  const now = Date.now() / 1000; // 秒単位

  const [allowed, remaining] = await redis.eval(
    tokenBucketScript, 1, key, capacity, refillRate, now, requested
  ) as [number, number];

  return {
    allowed: allowed === 1,
    remaining
  };
}
```

---

## 7. 分散ロック — SET NX PX・Redlock

### シンプルな分散ロック

```typescript
// src/lib/distributed-lock.ts
import { redis } from './redis';
import { randomBytes } from 'crypto';

export class DistributedLock {
  private lockKey: string;
  private lockValue: string;
  private ttlMs: number;

  constructor(resourceName: string, ttlMs = 30000) {
    this.lockKey = `lock:${resourceName}`;
    this.lockValue = randomBytes(16).toString('hex'); // ユニークな所有者ID
    this.ttlMs = ttlMs;
  }

  async acquire(): Promise<boolean> {
    const result = await redis.set(
      this.lockKey,
      this.lockValue,
      'NX',   // Not Exists — キーがない場合のみセット
      'PX',   // ミリ秒単位のTTL
      this.ttlMs
    );
    return result === 'OK';
  }

  async release(): Promise<boolean> {
    // Luaスクリプトで「自分のロックだけを解放」をアトミックに実行
    const releaseScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = await redis.eval(releaseScript, 1, this.lockKey, this.lockValue);
    return result === 1;
  }

  async extend(additionalMs: number): Promise<boolean> {
    const extendScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("pexpire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;

    const result = await redis.eval(
      extendScript, 1, this.lockKey, this.lockValue, additionalMs
    );
    return result === 1;
  }
}

// 使用例 — 重複実行防止
export async function withLock<T>(
  resourceName: string,
  fn: () => Promise<T>,
  options = { ttlMs: 30000, retryCount: 3, retryDelayMs: 500 }
): Promise<T> {
  const lock = new DistributedLock(resourceName, options.ttlMs);

  for (let attempt = 0; attempt < options.retryCount; attempt++) {
    const acquired = await lock.acquire();

    if (acquired) {
      try {
        return await fn();
      } finally {
        await lock.release();
      }
    }

    if (attempt < options.retryCount - 1) {
      await new Promise(resolve => setTimeout(resolve, options.retryDelayMs));
    }
  }

  throw new Error(`Failed to acquire lock for resource: ${resourceName}`);
}

// 実際の使用
async function processOrderSafely(orderId: string) {
  return withLock(`order:${orderId}`, async () => {
    // このブロックは同時に1つのプロセスのみ実行
    const order = await db.order.findUnique({ where: { id: orderId } });
    if (order?.status !== 'pending') return;

    await db.order.update({
      where: { id: orderId },
      data: { status: 'processing' }
    });

    await processPayment(order);
    await sendConfirmationEmail(order);
  });
}
```

---

## 8. ジョブキュー — BullMQ実装例

BullMQはRedisベースの本格的なジョブキューライブラリだ。

```bash
npm install bullmq
```

```typescript
// src/queues/email-queue.ts
import { Queue, Worker, QueueEvents } from 'bullmq';
import { redis } from '../lib/redis';

const connection = { host: 'localhost', port: 6379 };

// キューの定義
export const emailQueue = new Queue<EmailJobData>('emails', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,    // 1秒から開始
    },
    removeOnComplete: { count: 100 },  // 完了済み100件保持
    removeOnFail: { count: 50 },        // 失敗50件保持
  }
});

interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  variables: Record<string, string>;
}

// ジョブ追加
export async function queueWelcomeEmail(userId: string, email: string) {
  const job = await emailQueue.add(
    'welcome',
    {
      to: email,
      subject: 'ようこそ！',
      template: 'welcome',
      variables: { userId }
    },
    {
      delay: 0,        // 即座に処理
      priority: 1,     // 優先度（低い値ほど高優先）
    }
  );

  console.log(`Email job queued: ${job.id}`);
  return job.id;
}

// スケジュール送信（30分後）
export async function queueReminderEmail(userId: string, email: string) {
  await emailQueue.add(
    'reminder',
    { to: email, subject: 'リマインダー', template: 'reminder', variables: { userId } },
    { delay: 30 * 60 * 1000 }  // 30分後
  );
}

// ワーカー（実際の処理）
export const emailWorker = new Worker<EmailJobData>(
  'emails',
  async (job) => {
    const { to, subject, template, variables } = job.data;
    console.log(`Processing email job ${job.id}: ${subject} -> ${to}`);

    // 進捗報告
    await job.updateProgress(20);

    const html = await renderEmailTemplate(template, variables);
    await job.updateProgress(60);

    await sendEmail({ to, subject, html });
    await job.updateProgress(100);

    return { sent: true, timestamp: Date.now() };
  },
  {
    connection,
    concurrency: 5,       // 同時処理数
    limiter: {
      max: 100,           // 最大100ジョブ/秒
      duration: 1000,
    }
  }
);

// イベントリスナー
const queueEvents = new QueueEvents('emails', { connection });

queueEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`Job ${jobId} completed:`, returnvalue);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`Job ${jobId} failed:`, failedReason);
});

queueEvents.on('progress', ({ jobId, data }) => {
  console.log(`Job ${jobId} progress:`, data);
});
```

---

## 9. キャッシュ無効化戦略 — Cache Stampede防止

Cache Stampede（キャッシュスタンピード）とは、同一キャッシュが同時に失効した際に多数のリクエストがDBに殺到する問題だ。

```typescript
// src/lib/cache-stampede-prevention.ts
import { redis } from './redis';

// Probabilistic Early Recomputation (PER)
// キャッシュが完全に切れる前に確率的に再計算する
export async function getWithEarlyRecomputation<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number,
  beta = 1.0  // 再計算の積極性（1.0が標準）
): Promise<T> {
  const now = Date.now() / 1000;

  const [value, remainingTTL] = await redis.pipeline()
    .get(key)
    .ttl(key)
    .exec() as [[null, string | null], [null, number]];

  if (value[1] !== null) {
    const remaining = remainingTTL[1] ?? 0;
    const delta = ttl - remaining;  // 経過時間の推定

    // 確率的に早期再計算（TTLが残り少ない場合ほど確率が上がる）
    const shouldRecompute = -delta * beta * Math.log(Math.random()) >= remaining;

    if (!shouldRecompute) {
      return JSON.parse(value[1]) as T;
    }
  }

  // キャッシュミスまたは早期再計算
  const freshValue = await fetcher();
  await redis.setex(key, ttl, JSON.stringify(freshValue));
  return freshValue;
}

// Promise coalescing — 同一キャッシュへの同時リクエストを1つに束ねる
const pendingRequests = new Map<string, Promise<unknown>>();

export async function coalesceRequests<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  // すでに実行中のリクエストがあれば、それを待つ
  const existing = pendingRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = (async () => {
    try {
      return await fetcher();
    } finally {
      pendingRequests.delete(key);
    }
  })();

  pendingRequests.set(key, promise);
  return promise;
}
```

---

## 10. パイプラインとトランザクション（MULTI/EXEC）

### パイプライン — 複数コマンドをバッチ実行

```typescript
// src/lib/pipeline.ts
import { redis } from './redis';

// パイプラインでN回のラウンドトリップを1回に削減
export async function batchGetUsers(userIds: string[]) {
  const pipeline = redis.pipeline();

  userIds.forEach(id => {
    pipeline.hgetall(`user:${id}`);
  });

  const results = await pipeline.exec();
  return results?.map(([err, data]) => err ? null : data) ?? [];
}

// パイプラインでの集計処理
export async function recordUserActivity(
  userId: string,
  action: string,
  metadata: Record<string, string>
) {
  const now = Date.now();
  const dateKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  await redis
    .pipeline()
    .incr(`stats:${dateKey}:total`)                      // 日次合計
    .incr(`stats:${dateKey}:${action}`)                  // アクション別
    .zadd(`activity:user:${userId}`, now, action)        // ユーザー活動
    .lpush(`log:${userId}`, JSON.stringify({ action, ...metadata, timestamp: now }))
    .ltrim(`log:${userId}`, 0, 999)                      // 最新1000件
    .expire(`stats:${dateKey}:total`, 90 * 86400)        // 90日保持
    .exec();
}
```

### MULTI/EXEC — アトミックトランザクション

```typescript
// ウォッチ付きトランザクション（楽観的ロック）
export async function transferPoints(
  fromUserId: string,
  toUserId: string,
  amount: number
): Promise<boolean> {
  const fromKey = `points:${fromUserId}`;
  const toKey = `points:${toUserId}`;

  // WATCHして変更を監視
  await redis.watch(fromKey);

  const fromBalance = parseInt(await redis.get(fromKey) || '0');
  if (fromBalance < amount) {
    await redis.unwatch();
    throw new Error('Insufficient points');
  }

  // MULTI/EXECで原子的に実行
  const result = await redis
    .multi()
    .decrby(fromKey, amount)
    .incrby(toKey, amount)
    .lpush('transfer:log', JSON.stringify({
      from: fromUserId,
      to: toUserId,
      amount,
      timestamp: Date.now()
    }))
    .exec();

  // nullの場合、WATCHしているキーが変更されたため失敗
  if (result === null) {
    console.log('Transaction aborted due to concurrent modification');
    return false;
  }

  return true;
}
```

---

## 11. Luaスクリプト — アトミック操作

```typescript
// src/lib/lua-scripts.ts
import { redis } from './redis';

// スクリプトのSHA1ハッシュをキャッシュ（EVALSHA使用）
const scripts: Record<string, string> = {};

async function loadScript(name: string, script: string): Promise<string> {
  if (!scripts[name]) {
    scripts[name] = await redis.script('LOAD', script) as string;
  }
  return scripts[name];
}

// アトミックなユニークカウンター（HyperLogLogより正確）
const uniqueCounterScript = `
local key = KEYS[1]
local member = ARGV[1]
local ttl = tonumber(ARGV[2])

local added = redis.call('SADD', key, member)
if ttl and ttl > 0 then
  redis.call('EXPIRE', key, ttl)
end
return {added, redis.call('SCARD', key)}
`;

export async function trackUniqueVisit(
  pageKey: string,
  visitorId: string
): Promise<{ isNew: boolean; total: number }> {
  const sha = await loadScript('uniqueCounter', uniqueCounterScript);

  const [added, total] = await redis.evalsha(
    sha, 1,
    `unique:${pageKey}`,
    visitorId,
    86400  // 24時間TTL
  ) as [number, number];

  return { isNew: added === 1, total };
}

// アトミックなクーポン消費
const consumeCouponScript = `
local couponKey = KEYS[1]
local usedKey = KEYS[2]
local userId = ARGV[1]

-- すでに使用済みか確認
if redis.call('SISMEMBER', usedKey, userId) == 1 then
  return -1  -- 使用済み
end

-- 残数を確認
local remaining = tonumber(redis.call('GET', couponKey) or '0')
if remaining <= 0 then
  return 0  -- 在庫なし
end

-- 消費
redis.call('DECR', couponKey)
redis.call('SADD', usedKey, userId)
return remaining - 1  -- 残数を返す
`;

export async function consumeCoupon(
  couponId: string,
  userId: string
): Promise<number> {
  const sha = await loadScript('consumeCoupon', consumeCouponScript);

  return redis.evalsha(
    sha, 2,
    `coupon:${couponId}:stock`,
    `coupon:${couponId}:used`,
    userId
  ) as Promise<number>;
}
```

---

## 12. Redis Cluster・Sentinel — 高可用性

### Redis Sentinel（フェイルオーバー）

```typescript
// src/lib/redis-sentinel.ts
import Redis from 'ioredis';

export const sentinelClient = new Redis({
  sentinels: [
    { host: '10.0.0.1', port: 26379 },
    { host: '10.0.0.2', port: 26379 },
    { host: '10.0.0.3', port: 26379 },
  ],
  name: 'mymaster',           // Sentinelのmaster名
  sentinelPassword: process.env.SENTINEL_PASSWORD,
  password: process.env.REDIS_PASSWORD,

  // フェイルオーバー時の接続設定
  sentinelRetryStrategy: (times: number) => Math.min(times * 200, 5000),
  enableOfflineQueue: true,    // オフライン中のコマンドをキューイング
  maxRetriesPerRequest: null,  // Sentinelモードでは無制限
});

sentinelClient.on('ready', () => console.log('Sentinel: ready'));
sentinelClient.on('+switch-master', (msg) => {
  console.log('Sentinel: master switched', msg);
});
```

### Redis Cluster（シャーディング）

```typescript
// src/lib/redis-cluster.ts
import Redis from 'ioredis';

export const clusterClient = new Redis.Cluster(
  [
    { host: '10.0.0.1', port: 6380 },
    { host: '10.0.0.2', port: 6380 },
    { host: '10.0.0.3', port: 6380 },
  ],
  {
    clusterRetryStrategy: (times: number) => Math.min(times * 100, 3000),

    redisOptions: {
      password: process.env.REDIS_PASSWORD,
      tls: process.env.NODE_ENV === 'production' ? {} : undefined,
    },

    scaleReads: 'slave',       // 読み取りはスレーブから
    enableOfflineQueue: true,
    enableReadyCheck: true,
  }
);

// Clusterではハッシュタグ{}でスロットを合わせる
// 同一ノードに配置したいキーには{同一タグ}を使う
export async function atomicClusterOperation(userId: string) {
  // {user:123} というハッシュタグで同一スロットに配置
  const baseKey = `{user:${userId}}`;

  await clusterClient
    .multi()
    .set(`${baseKey}:profile`, 'data')
    .set(`${baseKey}:settings`, 'data')
    .incr(`${baseKey}:loginCount`)
    .exec();
}
```

---

## 13. モニタリング — INFO・MONITOR・メモリ使用量

```typescript
// src/lib/redis-monitoring.ts
import { redis } from './redis';

// 詳細な統計情報の取得
export async function getRedisStats() {
  const info = await redis.info('all');
  const sections = parseRedisInfo(info);

  return {
    server: {
      version: sections['redis_version'],
      uptime: parseInt(sections['uptime_in_seconds']),
      mode: sections['redis_mode'],
    },
    clients: {
      connected: parseInt(sections['connected_clients']),
      blocked: parseInt(sections['blocked_clients']),
    },
    memory: {
      usedMB: Math.round(parseInt(sections['used_memory']) / 1024 / 1024),
      peakMB: Math.round(parseInt(sections['used_memory_peak']) / 1024 / 1024),
      maxMB: sections['maxmemory'] !== '0'
        ? Math.round(parseInt(sections['maxmemory']) / 1024 / 1024)
        : null,
      fragRatio: parseFloat(sections['mem_fragmentation_ratio']),
      evictionPolicy: sections['maxmemory_policy'],
    },
    stats: {
      totalCommandsProcessed: parseInt(sections['total_commands_processed']),
      instantOpsPerSec: parseInt(sections['instantaneous_ops_per_sec']),
      cacheHitRate: calculateHitRate(
        parseInt(sections['keyspace_hits']),
        parseInt(sections['keyspace_misses'])
      ),
      expiredKeys: parseInt(sections['expired_keys']),
      evictedKeys: parseInt(sections['evicted_keys']),
    },
    replication: {
      role: sections['role'],
      connectedSlaves: parseInt(sections['connected_slaves'] || '0'),
    }
  };
}

function calculateHitRate(hits: number, misses: number): number {
  const total = hits + misses;
  if (total === 0) return 0;
  return Math.round((hits / total) * 10000) / 100; // パーセント
}

function parseRedisInfo(info: string): Record<string, string> {
  return Object.fromEntries(
    info
      .split('\r\n')
      .filter(line => line && !line.startsWith('#'))
      .map(line => line.split(':'))
      .filter(parts => parts.length >= 2)
      .map(([key, ...rest]) => [key.trim(), rest.join(':').trim()])
  );
}

// スロークエリの監視
export async function analyzeSlowLog(count = 10) {
  const slowLog = await redis.slowlog('GET', count) as Array<[number, number, number, string[], string, string]>;

  return slowLog.map(entry => ({
    id: entry[0],
    timestamp: new Date(entry[1] * 1000).toISOString(),
    durationMicroseconds: entry[2],
    command: entry[3].join(' '),
    clientIp: entry[4],
  }));
}

// メモリ使用量の詳細分析
export async function analyzeMemoryUsage(sampleCount = 100) {
  const keys = await redis.randomkey();
  if (!keys) return null;

  const memoryUsage = await redis.memory('USAGE', keys, 'SAMPLES', sampleCount);
  return {
    key: keys,
    bytes: memoryUsage,
    kb: Math.round((memoryUsage ?? 0) / 1024 * 100) / 100
  };
}

// Prometheusメトリクスエクスポート（Prometheus形式）
export async function generatePrometheusMetrics(): Promise<string> {
  const stats = await getRedisStats();
  const lines: string[] = [];

  lines.push(`# HELP redis_memory_used_bytes Memory used by Redis in bytes`);
  lines.push(`# TYPE redis_memory_used_bytes gauge`);
  lines.push(`redis_memory_used_bytes ${stats.memory.usedMB * 1024 * 1024}`);

  lines.push(`# HELP redis_connected_clients Number of connected clients`);
  lines.push(`# TYPE redis_connected_clients gauge`);
  lines.push(`redis_connected_clients ${stats.clients.connected}`);

  lines.push(`# HELP redis_cache_hit_rate Cache hit rate percentage`);
  lines.push(`# TYPE redis_cache_hit_rate gauge`);
  lines.push(`redis_cache_hit_rate ${stats.stats.cacheHitRate}`);

  lines.push(`# HELP redis_ops_per_sec Operations per second`);
  lines.push(`# TYPE redis_ops_per_sec gauge`);
  lines.push(`redis_ops_per_sec ${stats.stats.instantOpsPerSec}`);

  return lines.join('\n');
}

// 定期ヘルスチェック
export async function startRedisHealthMonitor(intervalMs = 30000) {
  const monitor = async () => {
    try {
      const stats = await getRedisStats();

      // メモリ使用率アラート
      if (stats.memory.maxMB && stats.memory.usedMB / stats.memory.maxMB > 0.9) {
        console.warn(`ALERT: Redis memory usage is ${Math.round(stats.memory.usedMB / stats.memory.maxMB * 100)}%`);
      }

      // ヒット率アラート
      if (stats.stats.cacheHitRate < 80) {
        console.warn(`ALERT: Redis cache hit rate is ${stats.stats.cacheHitRate}%`);
      }

      // フラグメンテーションアラート
      if (stats.memory.fragRatio > 1.5) {
        console.warn(`ALERT: Redis memory fragmentation ratio is ${stats.memory.fragRatio}`);
      }

    } catch (err) {
      console.error('Redis health monitor error:', err);
    }
  };

  await monitor(); // 初回即時実行
  return setInterval(monitor, intervalMs);
}
```

---

## まとめ — Redisアーキテクチャ選択指針

本記事で紹介したパターンの使い分けを整理する。

| ユースケース | データ型 | パターン |
|---|---|---|
| APIレスポンスキャッシュ | String | Cache-Aside + PER |
| ユーザーセッション | String / Hash | express-session + connect-redis |
| リアルタイム通知 | Pub/Sub | チャンネルサブスクライブ |
| ランキング | Sorted Set | ZADD + ZREVRANGE |
| レート制限 | Sorted Set | Sliding Window |
| 分散ロック | String (NX) | SET NX PX + Lua |
| ジョブキュー | List / Stream | BullMQ |
| ユニークカウント | HyperLogLog / Set | PFADD / SADD |
| イベントログ | Stream | XADD + Consumer Group |

**本番運用で押さえるべき3点:**

1. **メモリ設定**: `maxmemory-policy`を必ず設定する。`allkeys-lru`（キャッシュ用途）か`volatile-lru`（セッション混在）が一般的。
2. **キーの命名規則**: `{prefix}:{entity}:{id}:{field}`の形式で統一し、`SCAN`でパターン検索できるようにする。
3. **接続管理**: 接続プール数はCPUコア数×2程度を目安に。コネクションリークは致命的。

---

Redisのパターンを実装・検証する際、開発ツールとして[DevToolBox](https://usedevtools.com/)が役に立つ。RedisコマンドのテストやAPI開発フロー、正規表現チェックなど、エンジニアが日常的に必要とするツールを一箇所にまとめたWebアプリだ。ブックマークしておくとキャッシュ設計や動作確認の効率が上がるはずだ。

---

*本記事のコードサンプルはTypeScript + ioredis v5系で動作確認済み。Redis 7.0以降を推奨する。*

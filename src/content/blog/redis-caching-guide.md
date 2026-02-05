---
title: "Redis完全ガイド2026 — キャッシュからメッセージキューまで"
description: "Redisの基本データ構造からキャッシュパターン、Pub/Sub、Redis Stackまで。高速なインメモリデータベースを使いこなすための実践的ガイド。"
pubDate: "2026-02-05"
tags: ["Redis", "キャッシュ", "データベース", "パフォーマンス", "インフラ"]
---

Redisは世界で最も人気のあるインメモリデータストアの1つです。キャッシュ、セッション管理、リアルタイムアプリケーション、メッセージキューなど、様々な用途で活用されています。本記事では、2026年版のRedis完全ガイドとして、基本から実践的な活用法まで解説します。

## Redisとは

Redisは「Remote Dictionary Server」の略で、オープンソースのインメモリデータ構造ストアです。主な特徴は以下の通りです。

- **高速**: すべてのデータをメモリに保持するため、読み書きが極めて高速
- **多様なデータ構造**: 文字列、リスト、セット、ハッシュなど豊富なデータ型
- **永続化**: メモリベースでありながら、データの永続化も可能
- **レプリケーション**: マスター/スレーブ構成でデータの冗長化
- **クラスタリング**: 水平スケーリングに対応

### なぜRedisを使うのか

- **パフォーマンス向上**: データベースへの負荷を軽減し、応答速度を劇的に改善
- **セッション管理**: 分散システムでのセッション共有
- **リアルタイム処理**: Pub/Subやストリームを活用したイベント駆動アーキテクチャ
- **ランキング機能**: Sorted Setを使った効率的なランキング実装
- **レート制限**: API呼び出し回数の制限など

## Redisの基本データ構造

Redisは単純なKey-Valueストアではなく、複数のデータ構造をサポートしています。

### 1. String（文字列）

最もシンプルなデータ型。テキストだけでなく、バイナリデータも格納可能です。

```redis
# 基本的な操作
SET user:1000:name "Alice"
GET user:1000:name
# => "Alice"

# 有効期限付き設定（60秒後に自動削除）
SETEX session:abc123 60 "user_data"

# 数値の増減
SET page:views 0
INCR page:views
# => 1
INCRBY page:views 10
# => 11

# 複数のキーを一度に操作
MSET key1 "value1" key2 "value2"
MGET key1 key2
```

**実用例: カウンター**

```javascript
// Node.jsでのページビューカウンター
const redis = require('redis');
const client = redis.createClient();

async function incrementPageView(pageId) {
  await client.incr(`page:${pageId}:views`);
  const views = await client.get(`page:${pageId}:views`);
  return parseInt(views);
}
```

### 2. List（リスト）

順序付きの文字列コレクション。キューやスタックとして利用できます。

```redis
# 左側（先頭）に追加
LPUSH tasks "task1"
LPUSH tasks "task2"

# 右側（末尾）に追加
RPUSH tasks "task3"

# 左側から取り出し
LPOP tasks
# => "task2"

# 範囲取得
LRANGE tasks 0 -1
# => すべての要素

# 長さ取得
LLEN tasks
```

**実用例: タスクキュー**

```javascript
// タスクキューの実装
class RedisQueue {
  constructor(client, queueName) {
    this.client = client;
    this.queueName = queueName;
  }

  async enqueue(task) {
    await this.client.rPush(this.queueName, JSON.stringify(task));
  }

  async dequeue() {
    const task = await this.client.lPop(this.queueName);
    return task ? JSON.parse(task) : null;
  }

  async size() {
    return await this.client.lLen(this.queueName);
  }
}
```

### 3. Set（セット）

重複のない文字列の集合。メンバーシップテストや集合演算が高速です。

```redis
# 追加
SADD tags:post1 "javascript" "redis" "nodejs"

# メンバー確認
SISMEMBER tags:post1 "redis"
# => 1 (存在する)

# すべてのメンバー取得
SMEMBERS tags:post1

# 集合演算
SADD tags:post2 "python" "redis"
SINTER tags:post1 tags:post2
# => "redis" (共通要素)

SUNION tags:post1 tags:post2
# => すべてのタグ

# 削除
SREM tags:post1 "nodejs"
```

**実用例: ユニークビジター追跡**

```javascript
// 日次のユニークビジター追跡
async function trackVisitor(date, userId) {
  const key = `visitors:${date}`;
  await client.sAdd(key, userId);
  // 1日後に自動削除
  await client.expire(key, 86400);
}

async function getUniqueVisitors(date) {
  const key = `visitors:${date}`;
  return await client.sCard(key); // セットのサイズ
}
```

### 4. Hash（ハッシュ）

フィールド-値のペアを持つオブジェクト。構造化されたデータの保存に最適です。

```redis
# フィールド設定
HSET user:1000 name "Alice" email "alice@example.com" age 30

# フィールド取得
HGET user:1000 name
# => "Alice"

# すべてのフィールド取得
HGETALL user:1000

# 複数フィールド設定
HMSET user:1001 name "Bob" email "bob@example.com"

# 数値フィールドの増減
HINCRBY user:1000 age 1

# フィールド削除
HDEL user:1000 age
```

**実用例: ユーザープロファイル**

```javascript
// ユーザープロファイルの管理
class UserProfile {
  constructor(client, userId) {
    this.client = client;
    this.key = `user:${userId}`;
  }

  async set(data) {
    await this.client.hSet(this.key, data);
  }

  async get(field) {
    if (field) {
      return await this.client.hGet(this.key, field);
    }
    return await this.client.hGetAll(this.key);
  }

  async update(field, value) {
    await this.client.hSet(this.key, field, value);
  }

  async incrementField(field, amount = 1) {
    return await this.client.hIncrBy(this.key, field, amount);
  }
}
```

### 5. Sorted Set（ソート済みセット）

スコアを持つ順序付きセット。ランキングやリーダーボードに最適です。

```redis
# スコア付きで追加
ZADD leaderboard 100 "player1"
ZADD leaderboard 200 "player2"
ZADD leaderboard 150 "player3"

# ランキング取得（降順）
ZREVRANGE leaderboard 0 2 WITHSCORES
# => "player2", 200, "player3", 150, "player1", 100

# スコア範囲で検索
ZRANGEBYSCORE leaderboard 100 150

# スコア増加
ZINCRBY leaderboard 50 "player1"

# ランク取得（0始まり）
ZREVRANK leaderboard "player2"
# => 0 (1位)
```

**実用例: ゲームランキング**

```javascript
// ゲームのランキングシステム
class Leaderboard {
  constructor(client, gameId) {
    this.client = client;
    this.key = `leaderboard:${gameId}`;
  }

  async addScore(playerId, score) {
    await this.client.zAdd(this.key, {
      score: score,
      value: playerId
    });
  }

  async incrementScore(playerId, points) {
    return await this.client.zIncrBy(this.key, points, playerId);
  }

  async getTopPlayers(count = 10) {
    const players = await this.client.zRangeWithScores(
      this.key,
      0,
      count - 1,
      { REV: true }
    );
    return players.map((p, i) => ({
      rank: i + 1,
      playerId: p.value,
      score: p.score
    }));
  }

  async getPlayerRank(playerId) {
    const rank = await this.client.zRevRank(this.key, playerId);
    return rank !== null ? rank + 1 : null;
  }
}
```

## キャッシュパターン

Redisの最も一般的な用途はキャッシュです。効果的なキャッシュ戦略を理解しましょう。

### 1. Cache-Aside（Lazy Loading）

最も一般的なパターン。アプリケーションがキャッシュを明示的に管理します。

```javascript
async function getUser(userId) {
  const cacheKey = `user:${userId}`;

  // 1. キャッシュを確認
  let user = await redis.get(cacheKey);

  if (user) {
    console.log('Cache hit');
    return JSON.parse(user);
  }

  // 2. キャッシュミスならDBから取得
  console.log('Cache miss');
  user = await db.users.findById(userId);

  // 3. キャッシュに保存（5分間）
  await redis.setEx(cacheKey, 300, JSON.stringify(user));

  return user;
}
```

**利点**: シンプルで理解しやすい、必要なデータだけキャッシュ
**欠点**: キャッシュミス時のレイテンシ、キャッシュとDBの不整合の可能性

### 2. Write-Through

データを書き込む際、同時にキャッシュも更新します。

```javascript
async function updateUser(userId, data) {
  const cacheKey = `user:${userId}`;

  // 1. DBを更新
  const updatedUser = await db.users.update(userId, data);

  // 2. 同時にキャッシュも更新
  await redis.setEx(cacheKey, 300, JSON.stringify(updatedUser));

  return updatedUser;
}
```

**利点**: キャッシュとDBの整合性が高い、読み取り時のレイテンシが低い
**欠点**: 書き込み時のレイテンシが増加、使われないデータもキャッシュされる可能性

### 3. Write-Behind（Write-Back）

キャッシュを先に更新し、非同期でDBに反映します。

```javascript
async function updateUserScore(userId, score) {
  const cacheKey = `user:${userId}:score`;

  // 1. キャッシュを即座に更新
  await redis.set(cacheKey, score);

  // 2. 更新フラグを立てる
  await redis.sAdd('dirty:users', userId);

  // 3. バックグラウンドで定期的にDBに反映
  // （別プロセスで処理）
}

// 定期実行プロセス
async function syncToDatabase() {
  const dirtyUsers = await redis.sMembers('dirty:users');

  for (const userId of dirtyUsers) {
    const score = await redis.get(`user:${userId}:score`);
    await db.users.update(userId, { score: parseInt(score) });
    await redis.sRem('dirty:users', userId);
  }
}
```

**利点**: 書き込みパフォーマンスが高い
**欠点**: 実装が複雑、障害時のデータロストリスク

### キャッシュ戦略のベストプラクティス

```javascript
class CacheManager {
  constructor(redis, db, options = {}) {
    this.redis = redis;
    this.db = db;
    this.ttl = options.ttl || 300; // デフォルト5分
    this.prefix = options.prefix || 'cache';
  }

  generateKey(...parts) {
    return `${this.prefix}:${parts.join(':')}`;
  }

  async get(key, fetchFn) {
    const cacheKey = this.generateKey(key);

    // キャッシュを確認
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // データを取得
    const data = await fetchFn();

    // キャッシュに保存
    if (data !== null && data !== undefined) {
      await this.redis.setEx(
        cacheKey,
        this.ttl,
        JSON.stringify(data)
      );
    }

    return data;
  }

  async invalidate(key) {
    const cacheKey = this.generateKey(key);
    await this.redis.del(cacheKey);
  }

  async invalidatePattern(pattern) {
    const keys = await this.redis.keys(`${this.prefix}:${pattern}`);
    if (keys.length > 0) {
      await this.redis.del(keys);
    }
  }
}

// 使用例
const cache = new CacheManager(redis, db);

// データ取得
const user = await cache.get(`user:${userId}`, async () => {
  return await db.users.findById(userId);
});

// キャッシュ無効化
await cache.invalidate(`user:${userId}`);

// パターンマッチで無効化
await cache.invalidatePattern('user:*');
```

## セッション管理

分散システムでのセッション共有にRedisは理想的です。

### Express + Redis Session

```javascript
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');

const app = express();
const redisClient = createClient();
redisClient.connect();

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 24時間
  }
}));

app.get('/login', (req, res) => {
  req.session.userId = '12345';
  req.session.username = 'Alice';
  res.send('Logged in');
});

app.get('/profile', (req, res) => {
  if (req.session.userId) {
    res.json({ userId: req.session.userId, username: req.session.username });
  } else {
    res.status(401).send('Not authenticated');
  }
});
```

### カスタムセッションマネージャー

```javascript
class SessionManager {
  constructor(redis, options = {}) {
    this.redis = redis;
    this.ttl = options.ttl || 3600; // 1時間
    this.prefix = 'session';
  }

  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async create(userId, data = {}) {
    const sessionId = this.generateSessionId();
    const key = `${this.prefix}:${sessionId}`;

    const sessionData = {
      userId,
      createdAt: Date.now(),
      ...data
    };

    await this.redis.setEx(key, this.ttl, JSON.stringify(sessionData));
    return sessionId;
  }

  async get(sessionId) {
    const key = `${this.prefix}:${sessionId}`;
    const data = await this.redis.get(key);

    if (!data) return null;

    // TTLを延長
    await this.redis.expire(key, this.ttl);

    return JSON.parse(data);
  }

  async update(sessionId, data) {
    const key = `${this.prefix}:${sessionId}`;
    const existing = await this.get(sessionId);

    if (!existing) {
      throw new Error('Session not found');
    }

    const updated = { ...existing, ...data };
    await this.redis.setEx(key, this.ttl, JSON.stringify(updated));
  }

  async destroy(sessionId) {
    const key = `${this.prefix}:${sessionId}`;
    await this.redis.del(key);
  }

  async destroyAll(userId) {
    const pattern = `${this.prefix}:*`;
    const keys = await this.redis.keys(pattern);

    for (const key of keys) {
      const data = await this.redis.get(key);
      const session = JSON.parse(data);

      if (session.userId === userId) {
        await this.redis.del(key);
      }
    }
  }
}
```

## Pub/Sub（パブリッシュ/サブスクライブ）

リアルタイムメッセージングやイベント駆動アーキテクチャに使用します。

### 基本的な使い方

```javascript
const { createClient } = require('redis');

// パブリッシャー
const publisher = createClient();
await publisher.connect();

// サブスクライバー
const subscriber = createClient();
await subscriber.connect();

// メッセージを購読
await subscriber.subscribe('notifications', (message) => {
  console.log('Received:', message);
});

// メッセージを発行
await publisher.publish('notifications', 'Hello, World!');
```

### チャットアプリケーション

```javascript
class ChatRoom {
  constructor(roomId) {
    this.roomId = roomId;
    this.channel = `chat:${roomId}`;
    this.publisher = createClient();
    this.subscriber = createClient();
  }

  async connect() {
    await this.publisher.connect();
    await this.subscriber.connect();
  }

  async join(userId, onMessage) {
    await this.subscriber.subscribe(this.channel, (message) => {
      const data = JSON.parse(message);
      onMessage(data);
    });

    await this.sendMessage('system', `${userId} joined the room`);
  }

  async sendMessage(userId, text) {
    const message = {
      userId,
      text,
      timestamp: Date.now()
    };

    await this.publisher.publish(this.channel, JSON.stringify(message));
  }

  async leave(userId) {
    await this.sendMessage('system', `${userId} left the room`);
    await this.subscriber.unsubscribe(this.channel);
  }
}

// 使用例
const room = new ChatRoom('general');
await room.connect();

await room.join('Alice', (message) => {
  console.log(`[${message.userId}]: ${message.text}`);
});

await room.sendMessage('Alice', 'Hello everyone!');
```

## Redis Streams

Pub/Subより高度なメッセージング機能を提供します。

```javascript
// ストリームにメッセージ追加
async function addToStream(streamKey, data) {
  const id = await redis.xAdd(streamKey, '*', data);
  return id;
}

// ストリームから読み取り（コンシューマーグループ）
async function consumeStream(streamKey, groupName, consumerName) {
  // グループ作成（初回のみ）
  try {
    await redis.xGroupCreate(streamKey, groupName, '0', {
      MKSTREAM: true
    });
  } catch (e) {
    // グループが既に存在する場合は無視
  }

  while (true) {
    // メッセージを読み取り
    const messages = await redis.xReadGroup(
      groupName,
      consumerName,
      { key: streamKey, id: '>' },
      { COUNT: 10, BLOCK: 5000 }
    );

    if (messages && messages.length > 0) {
      for (const [stream, msgs] of messages) {
        for (const msg of msgs) {
          console.log('Processing:', msg.message);

          // 処理完了を確認
          await redis.xAck(streamKey, groupName, msg.id);
        }
      }
    }
  }
}

// 使用例
await addToStream('events', {
  type: 'user_registered',
  userId: '12345',
  timestamp: Date.now().toString()
});

consumeStream('events', 'processors', 'worker-1');
```

## Redis Stack

Redis 7以降では、追加モジュールを使った拡張機能が利用可能です。

### RediSearch（全文検索）

```javascript
// インデックス作成
await redis.ft.create('idx:products', {
  name: 'TEXT',
  description: 'TEXT',
  price: 'NUMERIC',
  category: 'TAG'
}, {
  ON: 'HASH',
  PREFIX: 'product:'
});

// 商品追加
await redis.hSet('product:1', {
  name: 'Redis Book',
  description: 'Complete guide to Redis',
  price: '2980',
  category: 'books'
});

// 検索
const results = await redis.ft.search('idx:products', 'guide', {
  LIMIT: { from: 0, size: 10 }
});
```

### RedisJSON

```javascript
// JSONオブジェクトを保存
await redis.json.set('user:1000', '$', {
  name: 'Alice',
  age: 30,
  address: {
    city: 'Tokyo',
    country: 'Japan'
  },
  tags: ['developer', 'blogger']
});

// 特定のパスを取得
const name = await redis.json.get('user:1000', { path: '$.name' });

// 配列に要素追加
await redis.json.arrAppend('user:1000', '$.tags', 'writer');

// 数値を増加
await redis.json.numIncrBy('user:1000', '$.age', 1);
```

## パフォーマンス最適化

### 1. パイプライン

複数のコマンドをまとめて送信し、ネットワークラウンドトリップを削減します。

```javascript
const pipeline = redis.pipeline();

pipeline.set('key1', 'value1');
pipeline.set('key2', 'value2');
pipeline.get('key1');
pipeline.incr('counter');

const results = await pipeline.exec();
```

### 2. トランザクション

複数の操作をアトミックに実行します。

```javascript
async function transferPoints(fromUser, toUser, points) {
  const multi = redis.multi();

  multi.decrBy(`user:${fromUser}:points`, points);
  multi.incrBy(`user:${toUser}:points`, points);

  const results = await multi.exec();
  return results;
}
```

### 3. Lua スクリプト

複雑なロジックをRedis内で実行し、ネットワークオーバーヘッドを削減します。

```javascript
// レート制限スクリプト
const rateLimitScript = `
  local key = KEYS[1]
  local limit = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])

  local current = redis.call('INCR', key)

  if current == 1 then
    redis.call('EXPIRE', key, window)
  end

  if current > limit then
    return 0
  else
    return 1
  end
`;

async function checkRateLimit(userId, limit = 100, window = 60) {
  const key = `ratelimit:${userId}`;
  const allowed = await redis.eval(rateLimitScript, {
    keys: [key],
    arguments: [limit.toString(), window.toString()]
  });

  return allowed === 1;
}
```

## まとめ

Redisは単なるキャッシュではなく、多様なデータ構造とパターンを提供する強力なツールです。

**重要なポイント**:
- データ構造を適切に選択する（String, List, Set, Hash, Sorted Set）
- キャッシュパターンを理解し、用途に応じて使い分ける
- セッション管理やPub/Subで分散システムを構築
- パイプラインやLuaスクリプトでパフォーマンスを最適化
- Redis Stackで全文検索やJSON操作などの高度な機能を活用

Redisを正しく活用することで、アプリケーションのパフォーマンスを大幅に向上させることができます。本記事を参考に、効果的なRedis活用を実践してください。

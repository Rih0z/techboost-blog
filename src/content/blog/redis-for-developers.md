---
title: "開発者のためのRedis実践ガイド — キャッシュからメッセージキューまで"
description: "Redisの基本データ型からキャッシュパターン、Pub/Sub、Streams、セッション管理まで実践的に解説。Upstashを活用したサーバーレス環境での利用方法も紹介します。"
pubDate: "2026-02-05"
tags: ["Redis", "キャッシュ", "データベース", "Upstash", "パフォーマンス"]
---

Redisは高速なインメモリデータストアで、キャッシュ、セッション管理、メッセージキューなど幅広い用途で使われています。この記事では、開発者が実践で使えるRedisの活用方法を解説します。

## Redisとは

Redisは「Remote Dictionary Server」の略で、キーバリューストア型のNoSQLデータベースです。

**主な特徴:**

- **高速**: すべてのデータをメモリに保持
- **多様なデータ型**: 文字列、リスト、セット、ソート済みセット、ハッシュなど
- **永続化**: スナップショット、AOF（Append Only File）
- **Pub/Sub**: リアルタイムメッセージング
- **Lua スクリプト**: アトミックな複合操作

## セットアップ

Node.jsでRedisを使用するには、`ioredis`または`redis`パッケージを使用します。

```bash
npm install ioredis
```

```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: 'localhost',
  port: 6379,
  password: process.env.REDIS_PASSWORD,
});

// 接続確認
await redis.ping(); // "PONG"
```

## 基本データ型と操作

### 文字列（String）

最も基本的なデータ型です。

```typescript
// セット
await redis.set('user:1:name', 'Alice');

// ゲット
const name = await redis.get('user:1:name'); // "Alice"

// 有効期限付きセット（秒）
await redis.setex('session:abc123', 3600, 'user-data');

// インクリメント
await redis.incr('page:views'); // 1
await redis.incr('page:views'); // 2

// 複数操作
await redis.mset('key1', 'value1', 'key2', 'value2');
const values = await redis.mget('key1', 'key2'); // ["value1", "value2"]
```

### ハッシュ（Hash）

オブジェクトのようなデータ構造です。

```typescript
// ユーザー情報をハッシュで保存
await redis.hset('user:1', {
  name: 'Alice',
  email: 'alice@example.com',
  age: '25',
});

// 特定フィールドを取得
const email = await redis.hget('user:1', 'email');

// 全フィールドを取得
const user = await redis.hgetall('user:1');
// { name: 'Alice', email: 'alice@example.com', age: '25' }

// フィールドの存在確認
const exists = await redis.hexists('user:1', 'name'); // 1

// 数値フィールドのインクリメント
await redis.hincrby('user:1', 'age', 1); // 26
```

### リスト（List）

順序付きのコレクションです。

```typescript
// 左から追加
await redis.lpush('queue:tasks', 'task1', 'task2');

// 右から追加
await redis.rpush('queue:tasks', 'task3');

// 左から取得
const task = await redis.lpop('queue:tasks'); // "task2"

// 範囲取得
const tasks = await redis.lrange('queue:tasks', 0, -1);

// ブロッキング pop（タイムアウト秒）
const item = await redis.blpop('queue:tasks', 0);
```

### セット（Set）

重複のない集合です。

```typescript
// メンバー追加
await redis.sadd('tags:post:1', 'javascript', 'typescript', 'react');

// メンバー存在確認
const isMember = await redis.sismember('tags:post:1', 'typescript'); // 1

// 全メンバー取得
const tags = await redis.smembers('tags:post:1');

// 集合演算
await redis.sadd('tags:post:2', 'typescript', 'node', 'express');
const common = await redis.sinter('tags:post:1', 'tags:post:2'); // ["typescript"]
const all = await redis.sunion('tags:post:1', 'tags:post:2');
```

### ソート済みセット（Sorted Set）

スコア付きの順序集合です。

```typescript
// ランキング
await redis.zadd('leaderboard', 100, 'player1');
await redis.zadd('leaderboard', 200, 'player2');
await redis.zadd('leaderboard', 150, 'player3');

// スコア順に取得（降順）
const top3 = await redis.zrevrange('leaderboard', 0, 2, 'WITHSCORES');
// ["player2", "200", "player3", "150", "player1", "100"]

// ランク取得（0始まり）
const rank = await redis.zrevrank('leaderboard', 'player1'); // 2

// スコア範囲検索
const players = await redis.zrangebyscore('leaderboard', 100, 180);
```

## キャッシュパターン

### Cache-Aside（Lazy Loading）

最も一般的なパターンです。

```typescript
async function getUser(userId: string) {
  const cacheKey = `user:${userId}`;

  // キャッシュを確認
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // DBから取得
  const user = await db.user.findUnique({ where: { id: userId } });

  // キャッシュに保存（1時間）
  await redis.setex(cacheKey, 3600, JSON.stringify(user));

  return user;
}
```

### Write-Through

データを書き込む際に同時にキャッシュも更新します。

```typescript
async function updateUser(userId: string, data: UpdateData) {
  // DBを更新
  const user = await db.user.update({
    where: { id: userId },
    data,
  });

  // キャッシュを更新
  const cacheKey = `user:${userId}`;
  await redis.setex(cacheKey, 3600, JSON.stringify(user));

  return user;
}
```

### Cache Invalidation

関連キャッシュを削除します。

```typescript
async function deletePost(postId: string) {
  await db.post.delete({ where: { id: postId } });

  // 関連キャッシュを削除
  const keys = await redis.keys(`post:${postId}:*`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }

  // リストキャッシュも削除
  await redis.del('posts:list');
}
```

## セッション管理

Redisは高速なセッションストアとして最適です。

```typescript
import { randomUUID } from 'crypto';

class SessionStore {
  private redis: Redis;
  private prefix = 'session:';
  private ttl = 86400; // 24時間

  async create(userId: string, data: any) {
    const sessionId = randomUUID();
    const key = this.prefix + sessionId;

    await this.redis.setex(
      key,
      this.ttl,
      JSON.stringify({ userId, ...data })
    );

    return sessionId;
  }

  async get(sessionId: string) {
    const data = await this.redis.get(this.prefix + sessionId);
    return data ? JSON.parse(data) : null;
  }

  async refresh(sessionId: string) {
    await this.redis.expire(this.prefix + sessionId, this.ttl);
  }

  async destroy(sessionId: string) {
    await this.redis.del(this.prefix + sessionId);
  }
}
```

## Pub/Sub（メッセージング）

リアルタイム通信に使用できます。

```typescript
// Publisher
const publisher = new Redis();
await publisher.publish('notifications', JSON.stringify({
  type: 'NEW_MESSAGE',
  userId: '123',
  message: 'Hello!',
}));

// Subscriber
const subscriber = new Redis();
await subscriber.subscribe('notifications');

subscriber.on('message', (channel, message) => {
  const data = JSON.parse(message);
  console.log(`Channel: ${channel}, Data:`, data);
});
```

## Redis Streams

より高度なメッセージキューです。

```typescript
// メッセージ追加
await redis.xadd('events', '*', 'type', 'USER_REGISTERED', 'userId', '123');

// 消費者グループ作成
await redis.xgroup('CREATE', 'events', 'processors', '0', 'MKSTREAM');

// メッセージ読み取り
const messages = await redis.xreadgroup(
  'GROUP', 'processors', 'worker1',
  'COUNT', 10,
  'BLOCK', 5000,
  'STREAMS', 'events', '>'
);

// ACK（処理完了を通知）
await redis.xack('events', 'processors', messageId);
```

## Upstashでサーバーレス利用

Upstashは、サーバーレス環境で使いやすいHTTPベースのRedisです。

```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Edge Functionsでも動作
export async function GET(request: Request) {
  const views = await redis.incr('page:views');
  return new Response(JSON.stringify({ views }));
}
```

## パフォーマンス最適化

### パイプライン

複数コマンドを一度に送信します。

```typescript
const pipeline = redis.pipeline();
pipeline.set('key1', 'value1');
pipeline.set('key2', 'value2');
pipeline.get('key1');
const results = await pipeline.exec();
```

### Lua スクリプト

アトミックな複合操作を実行します。

```typescript
const script = `
  local current = redis.call('GET', KEYS[1])
  if current == false then
    redis.call('SET', KEYS[1], ARGV[1])
    return 1
  end
  return 0
`;

const result = await redis.eval(script, 1, 'lock:resource', 'locked');
```

## まとめ

Redisは単なるキャッシュ以上の機能を持つ強力なツールです。

**使い分けの目安:**
- **キャッシュ**: 頻繁にアクセスされるデータ
- **セッション**: ユーザーのログイン状態
- **ランキング**: リーダーボード、人気記事
- **リアルタイム**: チャット、通知
- **キュー**: 非同期タスク処理

適切に活用することで、アプリケーションのパフォーマンスを大幅に向上させることができます。

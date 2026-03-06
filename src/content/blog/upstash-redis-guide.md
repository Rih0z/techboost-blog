---
title: 'Upstash Redisでサーバーレスキャッシュ構築 - Next.js/Vercel完全対応'
description: 'Upstash Redisを使ったサーバーレス環境でのキャッシュ実装ガイド。Next.js App Router、Vercel Edge Functions、Rate Limitingまで実践的に解説します。現場で使える知識を体系的にまとめました。'
pubDate: 'Feb 05 2026'
tags: ['Upstash', 'Redis', 'Next.js', 'Vercel', 'サーバーレス', 'キャッシュ', 'インフラ']
---
Upstash Redisは、サーバーレス環境に最適化されたRedisサービスです。従量課金制で、Vercel、Cloudflare Workers、AWS Lambdaなどと完璧に統合できます。この記事では、Next.jsアプリでUpstashを活用する方法を解説します。

## Upstash Redisとは？

Upstashは、サーバーレス・エッジコンピューティング向けに設計されたデータプラットフォームです。

### 従来のRedis（AWS ElastiCache等）との違い

| 項目 | Upstash Redis | 従来のRedis |
|------|---------------|-------------|
| 料金体系 | 従量課金（リクエスト数） | 時間課金（常時稼働） |
| 最小料金 | $0（無料枠あり） | 月$15〜 |
| コールドスタート | なし | なし |
| サーバーレス対応 | 完全対応 | 要設定 |
| REST API | あり | なし（TCP必須） |
| グローバルレプリケーション | あり | 要設定 |

### 主な特徴

- **完全サーバーレス** - インスタンス管理不要
- **HTTP/REST API** - TCP接続不要（Edge対応）
- **従量課金** - 使った分だけ支払い
- **無料枠** - 月10,000リクエストまで無料
- **グローバル対応** - 世界中にレプリケーション可能
- **Vercel統合** - 数クリックで統合完了

## セットアップ

### アカウント作成とデータベース作成

1. https://console.upstash.com でアカウント作成
2. 「Create Database」をクリック
3. データベース名を入力（例: `my-app-cache`）
4. リージョンを選択（東京リージョン推奨）
5. 「Create」をクリック

### 環境変数の取得

作成したデータベースのダッシュボードから、以下の情報をコピーします。

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

### Next.jsプロジェクトでのセットアップ

```bash
npm install @upstash/redis
```

`.env.local`に環境変数を追加します。

```env
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

## 基本的な使い方

### Redisクライアントの初期化

`lib/redis.ts`

```typescript
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
```

### 基本操作

```typescript
import { redis } from '@/lib/redis';

// 文字列の保存
await redis.set('key', 'value');

// 取得
const value = await redis.get('key');
console.log(value); // "value"

// 有効期限付きで保存（秒単位）
await redis.set('session:123', 'user-data', { ex: 3600 }); // 1時間後に自動削除

// 削除
await redis.del('key');

// 存在確認
const exists = await redis.exists('key');
console.log(exists); // 1 (存在) or 0 (存在しない)
```

## 実践的な使用例

### 1. APIレスポンスのキャッシュ

外部APIの結果をキャッシュして、レスポンス速度を向上させます。

`app/api/weather/route.ts`

```typescript
import { redis } from '@/lib/redis';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city');

  if (!city) {
    return NextResponse.json({ error: 'City required' }, { status: 400 });
  }

  const cacheKey = `weather:${city}`;

  // キャッシュチェック
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log('Cache hit');
    return NextResponse.json({ data: cached, cached: true });
  }

  // 外部APIを呼び出し
  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.WEATHER_API_KEY}`
  );
  const data = await response.json();

  // 5分間キャッシュ
  await redis.set(cacheKey, JSON.stringify(data), { ex: 300 });

  return NextResponse.json({ data, cached: false });
}
```

### 2. セッション管理

```typescript
import { redis } from '@/lib/redis';
import { nanoid } from 'nanoid';

// セッション作成
export async function createSession(userId: string) {
  const sessionId = nanoid();
  const sessionData = {
    userId,
    createdAt: Date.now(),
  };

  // 7日間有効なセッション
  await redis.set(`session:${sessionId}`, JSON.stringify(sessionData), {
    ex: 60 * 60 * 24 * 7,
  });

  return sessionId;
}

// セッション取得
export async function getSession(sessionId: string) {
  const data = await redis.get(`session:${sessionId}`);
  if (!data) return null;
  return JSON.parse(data as string);
}

// セッション削除
export async function deleteSession(sessionId: string) {
  await redis.del(`session:${sessionId}`);
}
```

### 3. 閲覧数カウンター

```typescript
import { redis } from '@/lib/redis';

export async function incrementPageView(slug: string) {
  const key = `pageviews:${slug}`;
  const views = await redis.incr(key);
  return views;
}

export async function getPageViews(slug: string) {
  const views = await redis.get(`pageviews:${slug}`);
  return views || 0;
}
```

### 4. いいね機能（セット操作）

```typescript
import { redis } from '@/lib/redis';

// いいねを追加
export async function likePost(postId: string, userId: string) {
  await redis.sadd(`likes:${postId}`, userId);
  return await redis.scard(`likes:${postId}`); // いいね数を返す
}

// いいねを解除
export async function unlikePost(postId: string, userId: string) {
  await redis.srem(`likes:${postId}`, userId);
  return await redis.scard(`likes:${postId}`);
}

// ユーザーがいいねしているか確認
export async function hasLiked(postId: string, userId: string) {
  const isMember = await redis.sismember(`likes:${postId}`, userId);
  return isMember === 1;
}

// いいね数を取得
export async function getLikeCount(postId: string) {
  return await redis.scard(`likes:${postId}`);
}
```

## Rate Limiting（レート制限）

Upstash Redisを使ってAPIのレート制限を実装できます。

### @upstash/ratelimitの使用

```bash
npm install @upstash/ratelimit
```

`lib/ratelimit.ts`

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './redis';

// 10リクエスト/10秒の制限
export const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
});
```

### API RouteでRate Limitingを実装

`app/api/protected/route.ts`

```typescript
import { ratelimit } from '@/lib/ratelimit';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';

  const { success, limit, reset, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      }
    );
  }

  return NextResponse.json({ data: 'Success' });
}
```

### ユーザーごとのRate Limiting

```typescript
import { ratelimit } from '@/lib/ratelimit';
import { auth } from '@/auth';

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const identifier = `user:${session.user.id}`;
  const { success } = await ratelimit.limit(identifier);

  if (!success) {
    return NextResponse.json(
      { error: 'レート制限に達しました。しばらく待ってから再試行してください。' },
      { status: 429 }
    );
  }

  // 処理を続行
  return NextResponse.json({ success: true });
}
```

## Vercel Edge FunctionsでUpstashを使う

Upstash RedisはREST APIベースなので、Edge Runtimeで完全に動作します。

`app/api/edge-cache/route.ts`

```typescript
import { redis } from '@/lib/redis';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  const value = await redis.get('edge-key');

  if (!value) {
    await redis.set('edge-key', 'Edge value', { ex: 60 });
    return NextResponse.json({ data: 'Edge value', cached: false });
  }

  return NextResponse.json({ data: value, cached: true });
}
```

## パイプライン（複数コマンドの一括実行）

複数のRedisコマンドを一度に実行して、レイテンシを削減できます。

```typescript
import { redis } from '@/lib/redis';

const pipeline = redis.pipeline();

pipeline.set('key1', 'value1');
pipeline.set('key2', 'value2');
pipeline.incr('counter');
pipeline.get('key1');

const results = await pipeline.exec();
console.log(results); // 各コマンドの結果が配列で返される
```

## パフォーマンス最適化のヒント

### 1. 適切なTTL（有効期限）の設定

```typescript
// 頻繁に変わるデータ: 短いTTL
await redis.set('stock-price', price, { ex: 60 }); // 1分

// あまり変わらないデータ: 長いTTL
await redis.set('user-profile', profile, { ex: 86400 }); // 24時間
```

### 2. パイプラインの活用

複数の操作を一度に実行することで、ネットワークラウンドトリップを削減できます。

### 3. データ構造の選択

- **文字列**: シンプルな値
- **ハッシュ**: オブジェクト（例: ユーザープロフィール）
- **セット**: 重複のないリスト（例: いいねしたユーザーID）
- **ソート済みセット**: スコア付きリスト（例: ランキング）

## 料金体系

Upstashは従量課金制です（2026年2月時点）。

- **無料枠**: 10,000リクエスト/月
- **有料**: $0.2 / 100,000リクエスト

月100万リクエストでも約$2です。従来のRedisサービス（月$15〜）と比べて圧倒的に安価です。

## まとめ

Upstash Redisは、Next.jsやVercelなどのモダンなスタックに最適なサーバーレスRedisです。

**主要な利点:**
- サーバーレス環境に完全対応
- HTTP/REST APIでEdge対応
- 従量課金で低コスト
- セットアップが簡単
- Rate Limitingが組み込み

公式ドキュメント: https://docs.upstash.com/redis

キャッシュ、セッション、Rate Limitingなど、あらゆる用途でUpstash Redisを活用しましょう。無料枠から始められるので、今すぐ試してみてください。

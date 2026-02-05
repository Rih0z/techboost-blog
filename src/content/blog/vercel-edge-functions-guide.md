---
title: 'Vercel Edge Functions完全ガイド - グローバル分散APIで超高速レスポンス'
description: 'Vercel Edge Functionsを使った高速API構築ガイド。Edge Runtime、ミドルウェア、地理情報取得、A/Bテストまで実践的に解説。Next.js 15対応。'
pubDate: 'Feb 05 2026'
tags: ['Vercel', 'Edge Functions', 'Next.js', 'サーバーレス', 'パフォーマンス']
---

Vercel Edge Functionsは、世界中に分散されたエッジネットワークで実行されるサーバーレス関数です。従来のサーバーレス関数（AWS Lambda等）と比べて圧倒的に高速で、グローバルなユーザーに低レイテンシでコンテンツを配信できます。

## Edge Functionsとは？

Edge Functionsは、ユーザーに最も近いエッジロケーション（CDNノード）で実行される軽量な関数です。

### 従来のサーバーレス関数との違い

| 項目 | Edge Functions | 従来のサーバーレス |
|------|----------------|-------------------|
| 実行場所 | 世界中のエッジ（300+拠点） | 特定リージョン |
| コールドスタート | ほぼゼロ（<1ms） | 50-500ms |
| レスポンス時間 | 10-100ms | 100-1000ms |
| ランタイム | Edge Runtime | Node.js |
| メモリ制限 | 128MB | 最大10GB |
| 実行時間制限 | 30秒 | 15分 |

### いつEdge Functionsを使うべきか?

**Edge Functions向き:**
- 認証・認可チェック
- A/Bテスト・機能フラグ
- リダイレクト・リライト
- 地理情報ベースのコンテンツ配信
- Rate Limiting
- 軽量なAPI（JSONレスポンス等）

**Node.js Runtime向き:**
- 重い計算処理
- ファイルシステムアクセス
- ネイティブNode.jsモジュール使用
- 大量のメモリが必要な処理

## Next.jsでのEdge Functions

### Route HandlerでEdge Runtimeを使用

`app/api/hello/route.ts`

```typescript
export const runtime = 'edge';

export async function GET() {
  return Response.json({ message: 'Hello from Edge!' });
}
```

たったこれだけで、このAPIはEdge Functionsとして実行されます。

### リクエスト情報の取得

Edge Functionsでは、リクエストの地理情報やIPアドレスを簡単に取得できます。

```typescript
export const runtime = 'edge';

export async function GET(request: Request) {
  // 地理情報
  const geo = request.headers.get('x-vercel-ip-country');
  const city = request.headers.get('x-vercel-ip-city');
  const region = request.headers.get('x-vercel-ip-country-region');
  const latitude = request.headers.get('x-vercel-ip-latitude');
  const longitude = request.headers.get('x-vercel-ip-longitude');

  // IPアドレス
  const ip = request.headers.get('x-forwarded-for');

  return Response.json({
    country: geo,
    city: decodeURIComponent(city || ''),
    region,
    latitude,
    longitude,
    ip,
  });
}
```

### TypeScript型定義

`types/edge.d.ts`

```typescript
declare global {
  interface Request {
    geo?: {
      city?: string;
      country?: string;
      region?: string;
      latitude?: string;
      longitude?: string;
    };
  }
}

export {};
```

## 実用的なユースケース

### 1. 地理情報ベースのコンテンツ配信

ユーザーの国に応じて異なるコンテンツを返します。

`app/api/content/route.ts`

```typescript
export const runtime = 'edge';

export async function GET(request: Request) {
  const country = request.headers.get('x-vercel-ip-country') || 'US';

  const content = {
    JP: {
      title: 'ようこそ',
      message: '日本からのアクセスを検出しました',
      currency: 'JPY',
    },
    US: {
      title: 'Welcome',
      message: 'Access from United States detected',
      currency: 'USD',
    },
    default: {
      title: 'Welcome',
      message: 'Welcome to our service',
      currency: 'USD',
    },
  };

  return Response.json(content[country as keyof typeof content] || content.default);
}
```

### 2. A/Bテスト

ユーザーをランダムに振り分けて異なるバージョンを表示します。

`middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: '/',
};

export function middleware(request: NextRequest) {
  // 既存のバリアントをチェック
  const currentVariant = request.cookies.get('ab-test-variant');

  if (currentVariant) {
    return NextResponse.next();
  }

  // ランダムに振り分け（50/50）
  const variant = Math.random() < 0.5 ? 'A' : 'B';

  const response = NextResponse.rewrite(
    new URL(variant === 'A' ? '/variant-a' : '/variant-b', request.url)
  );

  // Cookieに保存（30日間）
  response.cookies.set('ab-test-variant', variant, {
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
```

### 3. 認証チェック

ログインが必要なページへのアクセスをチェックします。

`middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*'],
};

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // トークンの検証（簡易版）
  try {
    // JWTの検証などをここで実行
    const isValid = await verifyToken(token);

    if (!isValid) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

async function verifyToken(token: string): Promise<boolean> {
  // 実際のトークン検証ロジック
  return true;
}
```

### 4. Rate Limiting

Upstash Redisと組み合わせてレート制限を実装します。

```bash
npm install @upstash/ratelimit @upstash/redis
```

`app/api/limited/route.ts`

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const runtime = 'edge';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10リクエスト/10秒
});

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous';
  const { success, limit, reset, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return Response.json(
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

  return Response.json({ message: 'Success', remaining });
}
```

### 5. カスタムリダイレクト

国や言語に応じたリダイレクトを実装します。

`middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const country = request.headers.get('x-vercel-ip-country');
  const { pathname } = request.nextUrl;

  // ルートパスの場合のみ処理
  if (pathname !== '/') {
    return NextResponse.next();
  }

  // 日本からのアクセスは /ja にリダイレクト
  if (country === 'JP') {
    return NextResponse.redirect(new URL('/ja', request.url));
  }

  // アメリカからのアクセスは /en にリダイレクト
  if (country === 'US') {
    return NextResponse.redirect(new URL('/en', request.url));
  }

  return NextResponse.next();
}
```

### 6. Bot検出

ボットアクセスを検出してブロックまたは特別な処理を行います。

`middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BOT_USER_AGENTS = [
  'googlebot',
  'bingbot',
  'slurp',
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'facebookexternalhit',
  'twitterbot',
];

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';

  const isBot = BOT_USER_AGENTS.some((bot) => userAgent.includes(bot));

  if (isBot) {
    // ボット専用のレスポンスを返す
    return NextResponse.rewrite(new URL('/bot-version', request.url));
  }

  return NextResponse.next();
}
```

## Edge Functionでの外部API呼び出し

Edge RuntimeではNode.jsの一部機能が制限されていますが、fetchは完全にサポートされています。

```typescript
export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city') || 'Tokyo';

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.WEATHER_API_KEY}`,
      {
        next: { revalidate: 600 }, // 10分間キャッシュ
      }
    );

    const data = await response.json();

    return Response.json({
      city: data.name,
      temperature: data.main.temp,
      weather: data.weather[0].description,
    });
  } catch (error) {
    return Response.json(
      { error: 'Failed to fetch weather data' },
      { status: 500 }
    );
  }
}
```

## レスポンスのストリーミング

大きなデータをストリーミングで返すことができます。

```typescript
export const runtime = 'edge';

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < 10; i++) {
        const message = `データ ${i + 1}\n`;
        controller.enqueue(encoder.encode(message));
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
```

## パフォーマンス最適化

### 1. レスポンスのキャッシュ

```typescript
export const runtime = 'edge';

export async function GET() {
  const data = await fetchData();

  return Response.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    },
  });
}
```

### 2. コードの最小化

Edge Functionsではバンドルサイズが重要です。必要最小限のコードのみをインポートしましょう。

```typescript
// 悪い例: 全体をインポート
import _ from 'lodash';

// 良い例: 必要な関数のみインポート
import chunk from 'lodash/chunk';
```

### 3. 軽量なライブラリを選択

Edge Runtime対応の軽量ライブラリを選びましょう。

- **日時処理**: `date-fns`（軽量）より`dayjs`
- **UUID**: `nanoid`（軽量）
- **バリデーション**: `zod`（Edge対応）

## デバッグとモニタリング

### ログの確認

```typescript
export const runtime = 'edge';

export async function GET(request: Request) {
  console.log('Edge function called from:', request.headers.get('x-vercel-ip-country'));

  return Response.json({ success: true });
}
```

Vercelダッシュボードの「Logs」タブでログを確認できます。

### エラーハンドリング

```typescript
export const runtime = 'edge';

export async function GET() {
  try {
    const data = await riskyOperation();
    return Response.json(data);
  } catch (error) {
    console.error('Error in edge function:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## まとめ

Vercel Edge Functionsは、グローバルなアプリケーションに不可欠な技術です。

**主要な利点:**
- 世界中のユーザーに低レイテンシでレスポンス
- コールドスタートがほぼゼロ
- 地理情報の簡単な取得
- Next.jsとのシームレスな統合
- 従量課金で低コスト

公式ドキュメント: https://vercel.com/docs/functions/edge-functions

グローバル展開を考えているなら、Edge Functionsは必須の選択肢です。今すぐNext.jsアプリに統合して、世界中のユーザーに高速な体験を提供しましょう。

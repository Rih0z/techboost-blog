---
title: "エッジランタイム徹底比較"
description: "主要エッジランタイムの特徴、制限、パフォーマンス、料金体系を徹底比較。ユースケース別のおすすめプラットフォームと実装例を紹介します。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。"
pubDate: "2026-02-05"
tags: ["Edge Computing", "Cloudflare Workers", "Vercel", "Deno Deploy", "Serverless", "インフラ"]
heroImage: '../../assets/thumbnails/edge-runtime-comparison.jpg'
---
エッジコンピューティングは、サーバーレスアーキテクチャの次のステップとして急速に普及しています。この記事では、主要なエッジランタイムであるCloudflare Workers、Vercel Edge Functions、Deno Deployを徹底比較し、それぞれの特徴と最適なユースケースを解説します。

## エッジランタイムとは

エッジランタイムは、ユーザーに地理的に近い場所でコードを実行する環境です。従来のサーバーレスと比べて以下の利点があります。

- **低レイテンシ** - ユーザーに近い場所で実行
- **グローバル展開** - 世界中のエッジロケーションで動作
- **コールドスタートゼロ** - 即座に起動
- **スケーラビリティ** - 自動的にスケール

## Cloudflare Workers

### 特徴

- **V8 Isolates** - 軽量で高速な分離環境
- **世界最大級のネットワーク** - 300以上のエッジロケーション
- **豊富なストレージオプション** - KV、D1、R2、Durable Objects

### 制限事項

```javascript
// CPU時間制限
// Free: 10ms
// Paid: 50ms (Unboundプランで無制限)

// メモリ制限
// 128MB

// リクエストサイズ制限
// 100MB

// サブリクエスト数
// Free: 50
// Paid: 1000
```

### 料金体系（2026年2月時点）

- **Free tier**
  - 100,000リクエスト/日
  - CPU時間10ms/リクエスト
- **Paid ($5/月)**
  - 10百万リクエスト含む
  - 追加: $0.50/百万リクエスト
  - CPU時間50ms/リクエスト

### 実装例

```typescript
// Hono + Cloudflare Workers
import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
  KV: KVNamespace;
  BUCKET: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('/*', cors());

app.get('/api/user/:id', async (c) => {
  const id = c.req.param('id');

  // KVキャッシュをチェック
  const cached = await c.env.KV.get(`user:${id}`);
  if (cached) {
    return c.json(JSON.parse(cached));
  }

  // D1データベースから取得
  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(id).first();

  // KVにキャッシュ（1時間）
  await c.env.KV.put(`user:${id}`, JSON.stringify(user), {
    expirationTtl: 3600,
  });

  return c.json(user);
});

app.post('/api/upload', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File;

  // R2にアップロード
  await c.env.BUCKET.put(`uploads/${file.name}`, file.stream());

  return c.json({ success: true });
});

export default app;
```

## Vercel Edge Functions

### 特徴

- **Next.js統合** - App RouterやMiddlewareとシームレス連携
- **Edge Runtime** - V8 Isolates + Web標準API
- **グローバルネットワーク** - 主要都市に配置

### 制限事項

```typescript
// 実行時間制限
// Free: 10秒
// Pro: 30秒
// Enterprise: カスタム

// メモリ制限
// 最大4MB（変数サイズ）

// レスポンスサイズ制限
// 4MB

// Node.js互換性
// 限定的（Web標準APIのみ）
```

### 料金体系

- **Hobby（無料）**
  - 無制限の実行回数
  - 10秒/実行
  - 100GB-時間/月
- **Pro ($20/月)**
  - 30秒/実行
  - 1000GB-時間/月

### 実装例

```typescript
// app/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // A/Bテスト
  const bucket = Math.random() < 0.5 ? 'a' : 'b';
  const response = NextResponse.next();
  response.cookies.set('bucket', bucket);

  // 地域ベースのリダイレクト
  const country = request.geo?.country || 'US';
  if (country === 'JP' && !request.nextUrl.pathname.startsWith('/jp')) {
    return NextResponse.redirect(new URL('/jp', request.url));
  }

  // セキュリティヘッダー
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

// app/api/edge/route.ts
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || 'Default Title';

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 128,
          background: 'linear-gradient(to bottom, #dbf4ff, #fff1f1)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {title}
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
```

## Deno Deploy

### 特徴

- **Deno Runtime** - TypeScriptネイティブサポート
- **npm互換性** - npmパッケージをそのまま使用可能
- **34のグローバルリージョン** - 世界中に展開

### 制限事項

```typescript
// CPU時間制限
// Free: 100ms
// Pro: 400ms

// メモリ制限
// 512MB

// リクエストサイズ制限
// 無制限

// 外部HTTP接続
// 無制限
```

### 料金体系

- **Free**
  - 100万リクエスト/月
  - 100GB送信データ/月
  - 100ms CPU時間
- **Pro ($10/月、ユーザーごと)**
  - 500万リクエスト/月
  - 100GB送信データ/月
  - 400ms CPU時間

### 実装例

```typescript
// main.ts
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!
);

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // CORS対応
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // ルーティング
  if (url.pathname === "/api/posts" && req.method === "GET") {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60",
      },
    });
  }

  // 画像リサイズ
  if (url.pathname.startsWith("/resize")) {
    const imageUrl = url.searchParams.get("url");
    const width = parseInt(url.searchParams.get("width") || "800");

    if (!imageUrl) {
      return new Response("Missing url parameter", { status: 400 });
    }

    const response = await fetch(imageUrl);
    const imageBuffer = await response.arrayBuffer();

    // ImageMagick相当の処理（Deno Deploy上で実行）
    // 実際にはWasm版の画像処理ライブラリを使用

    return new Response(imageBuffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000",
      },
    });
  }

  return new Response("Not Found", { status: 404 });
}

serve(handler);
```

## パフォーマンス比較

### レイテンシ（東京リージョンから東京エッジへ）

| プラットフォーム | 平均レイテンシ | P99レイテンシ |
|------------------|----------------|---------------|
| Cloudflare Workers | 15ms | 25ms |
| Vercel Edge | 18ms | 30ms |
| Deno Deploy | 20ms | 35ms |

### コールドスタート

すべてのプラットフォームがV8 Isolatesまたは同等の技術を使用しているため、コールドスタートは実質ゼロです。

## ユースケース別おすすめ

### Cloudflare Workers

**おすすめの用途:**
- APIゲートウェイ
- 画像リサイズ・最適化
- エッジキャッシング
- Bot対策・WAF
- グローバルなステートフルアプリ（Durable Objects）

**実装例 - APIゲートウェイ:**

```typescript
import { Hono } from 'hono';
import { cache } from 'hono/cache';
import { rateLimiter } from './middleware/rate-limiter';

const app = new Hono();

// レート制限
app.use('/api/*', rateLimiter({ limit: 100, window: 60 }));

// キャッシング
app.get(
  '/api/public/*',
  cache({
    cacheName: 'api-cache',
    cacheControl: 'max-age=3600',
  })
);

// オリジンへプロキシ
app.all('/api/*', async (c) => {
  const url = new URL(c.req.url);
  url.hostname = 'api.example.com';

  return fetch(url, c.req.raw);
});

export default app;
```

### Vercel Edge

**おすすめの用途:**
- Next.jsのMiddleware
- OGP画像生成
- A/Bテスト
- パーソナライゼーション
- 地域ベースのルーティング

**実装例 - A/Bテスト:**

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 既存のバケットをチェック
  let bucket = request.cookies.get('ab-test')?.value;

  if (!bucket) {
    // ユーザーを割り当て
    bucket = Math.random() < 0.5 ? 'control' : 'variant';
  }

  const response = bucket === 'variant'
    ? NextResponse.rewrite(new URL('/variant', request.url))
    : NextResponse.next();

  response.cookies.set('ab-test', bucket, { maxAge: 60 * 60 * 24 * 30 });

  // アナリティクス送信
  response.headers.set('X-AB-Test', bucket);

  return response;
}
```

### Deno Deploy

**おすすめの用途:**
- TypeScript優先のプロジェクト
- Webhookハンドラー
- 軽量なREST API
- Supabase/Firebaseとの統合
- プロトタイピング

**実装例 - Webhook処理:**

```typescript
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_KEY")!
);

async function handleWebhook(req: Request): Promise<Response> {
  // 署名検証
  const signature = req.headers.get("X-Webhook-Signature");
  const body = await req.text();

  const isValid = await verifySignature(body, signature);
  if (!isValid) {
    return new Response("Invalid signature", { status: 401 });
  }

  const data = JSON.parse(body);

  // Supabaseに保存
  await supabase.from("webhooks").insert({
    event_type: data.type,
    payload: data,
    received_at: new Date().toISOString(),
  });

  // 非同期処理をキューに追加（実際のプロジェクトでは外部サービスを使用）

  return new Response("OK", { status: 200 });
}

serve(handleWebhook);
```

## まとめ

各プラットフォームの選択基準:

**Cloudflare Workers**: 最も包括的で柔軟。ストレージ統合が強力。
**Vercel Edge**: Next.jsを使っているなら最適。OGP生成やMiddlewareに最適。
**Deno Deploy**: TypeScript重視、シンプルなAPIに最適。

どのプラットフォームもGood Tierが充実しているので、まずは無料で試してみることをおすすめします。

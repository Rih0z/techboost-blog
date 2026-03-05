---
title: "エッジコンピューティング入門2026 - Cloudflare Workers実践ガイド"
description: "エッジコンピューティングの基礎から、Cloudflare Workers、Deno Deploy、Vercel Edge Functionsの比較、実装例まで徹底解説。2026年のエッジ開発完全ガイドです。"
pubDate: "2026-02-05"
tags: ["エッジコンピューティング", "Cloudflare Workers", "サーバーレス", "パフォーマンス", "プログラミング"]
---

## はじめに

**エッジコンピューティング**は、2026年のWeb開発における最も重要なトレンドの1つです。

従来のサーバーレス（AWS Lambda等）がリージョン単位で実行されるのに対し、エッジコンピューティングは**世界中のCDNエッジサーバーで実行**され、ユーザーに最も近い場所で処理を行います。

### エッジコンピューティングの利点

- **低レイテンシ**: ユーザーから物理的に近い場所で実行（50ms以下）
- **高速な初回起動**: コールドスタートほぼゼロ
- **グローバルスケール**: 自動的に世界中に配信
- **コスト効率**: 無料枠が充実、従量課金も安価

この記事では、主要なエッジプラットフォームの比較と、**Cloudflare Workers**を中心とした実装例を解説します。

## エッジコンピューティングとは？

### 従来のアーキテクチャ

```
ユーザー（東京） → [インターネット] → サーバー（米国西海岸）
                      ~150ms              処理 ~50ms

合計レイテンシ: 約200ms+
```

### エッジアーキテクチャ

```
ユーザー（東京） → [エッジサーバー（東京）]
                      ~10ms      処理 ~5ms

合計レイテンシ: 約15ms
```

### エッジで実行できる処理

- **API エンドポイント**: REST/GraphQL API
- **認証/認可**: JWT検証、セッション管理
- **A/Bテスト**: リクエストベースの分岐
- **リダイレクト**: 地域・デバイス別のルーティング
- **HTMLリライト**: 動的なコンテンツ挿入
- **画像最適化**: リサイズ、フォーマット変換
- **キャッシュ制御**: カスタムキャッシュロジック

### エッジで実行できない処理

- **長時間実行**: 通常30秒〜50秒の制限
- **大量メモリ**: 通常128MB程度の制限
- **ファイルシステムアクセス**: ステートレス環境
- **WebSocket（一部可能）**: プラットフォームによる

## 主要プラットフォーム比較

### 1. Cloudflare Workers

**最大の特徴: V8 Isolateによる超高速起動**

#### スペック
- **実行環境**: V8 Isolate（Node.js互換ランタイム）
- **ロケーション数**: 300+
- **CPU時間制限**: 50ms（無料）、50秒（有料）
- **メモリ**: 128MB
- **コールドスタート**: ほぼゼロ（<1ms）

#### 料金（2026年2月）
- **無料枠**: 100,000リクエスト/日
- **有料プラン**: $5/月で1,000万リクエスト、追加$0.50/100万リクエスト

#### 統合サービス
- **Workers KV**: グローバルKey-Valueストア
- **D1**: SQLiteベースのデータベース
- **R2**: S3互換オブジェクトストレージ
- **Durable Objects**: ステートフルコンピューティング
- **Queues**: メッセージキュー

### 2. Deno Deploy

**最大の特徴: Deno標準、TypeScript First**

#### スペック
- **実行環境**: Deno Runtime
- **ロケーション数**: 30+
- **CPU時間制限**: 50ms（無料）、制限なし（有料）
- **メモリ**: 512MB
- **コールドスタート**: 超高速

#### 料金
- **無料枠**: 100万リクエスト/月、100GB転送
- **有料プラン**: $10/月で1,000万リクエスト

#### 利点
- Denoの強力な標準ライブラリ
- npmパッケージ直接import
- TypeScriptネイティブ

### 3. Vercel Edge Functions

**最大の特徴: Next.jsとの統合**

#### スペック
- **実行環境**: V8 Isolate（Vercel Edge Runtime）
- **ロケーション数**: 非公開（主要リージョンカバー）
- **CPU時間制限**: 30秒
- **メモリ**: 128MB

#### 料金
- **無料枠**: 100,000実行/日、500KBデプロイサイズ
- **Pro**: $20/月で500,000実行/日、1MBデプロイサイズ

#### 利点
- Next.jsのミドルウェアとして簡単に利用
- ISR（Incremental Static Regeneration）との連携

### 比較表

| | Cloudflare Workers | Deno Deploy | Vercel Edge |
|---|---|---|---|
| **起動速度** | ◎（<1ms） | ◎（超高速） | ○（速い） |
| **ロケーション数** | ◎（300+） | ○（30+） | ○（主要） |
| **実行環境** | V8 Isolate | Deno | V8 Isolate |
| **CPU時間** | 50ms/50s | 50ms/無制限 | 30s |
| **メモリ** | 128MB | 512MB | 128MB |
| **DB統合** | KV/D1 | KV | Vercel KV |
| **無料枠** | 10万req/日 | 100万req/月 | 10万実行/日 |
| **TypeScript** | ○ | ◎（ネイティブ） | ○ |
| **npm互換** | ○（node_compat） | ◎ | ○ |
| **学習曲線** | 中 | 易 | 易（Next.js） |

**総合推奨:**
- **汎用的なAPI・エッジ処理 → Cloudflare Workers**
- **Deno好き、TypeScript重視 → Deno Deploy**
- **Next.jsプロジェクト → Vercel Edge Functions**

## Cloudflare Workers実装例

### 1. 基本的なAPI

```typescript
// src/index.ts
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // ルーティング
    if (url.pathname === '/api/hello') {
      return new Response(
        JSON.stringify({ message: 'Hello, World!' }),
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (url.pathname === '/api/geo') {
      // Cloudflare固有: 地理情報
      const country = request.cf?.country || 'Unknown';
      const city = request.cf?.city || 'Unknown';

      return new Response(
        JSON.stringify({
          country,
          city,
          timezone: request.cf?.timezone,
          latitude: request.cf?.latitude,
          longitude: request.cf?.longitude,
        }),
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response('Not Found', { status: 404 });
  },
};

interface Env {
  // 環境変数・Bindingsの型定義
}
```

**デプロイ:**

```bash
npm create cloudflare@latest my-worker
cd my-worker
npm run deploy
```

### 2. Workers KV（Key-Valueストレージ）

```typescript
export interface Env {
  MY_KV: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // GET /api/cache/:key
    if (request.method === 'GET' && url.pathname.startsWith('/api/cache/')) {
      const key = url.pathname.split('/').pop()!;
      const value = await env.MY_KV.get(key);

      if (value === null) {
        return new Response('Not Found', { status: 404 });
      }

      return new Response(value, {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // POST /api/cache
    if (request.method === 'POST' && url.pathname === '/api/cache') {
      const { key, value, ttl } = await request.json();

      // KVに保存（TTL指定可能）
      await env.MY_KV.put(key, JSON.stringify(value), {
        expirationTtl: ttl || 3600, // デフォルト1時間
      });

      return new Response('OK', { status: 201 });
    }

    // DELETE /api/cache/:key
    if (request.method === 'DELETE' && url.pathname.startsWith('/api/cache/')) {
      const key = url.pathname.split('/').pop()!;
      await env.MY_KV.delete(key);
      return new Response('Deleted', { status: 204 });
    }

    return new Response('Not Found', { status: 404 });
  },
};
```

**wrangler.toml設定:**

```toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "MY_KV"
id = "your_kv_namespace_id"
```

### 3. D1（SQLiteデータベース）

```typescript
export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // GET /api/users
    if (request.method === 'GET' && url.pathname === '/api/users') {
      const { results } = await env.DB.prepare(
        'SELECT * FROM users LIMIT 10'
      ).all();

      return new Response(JSON.stringify(results), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // GET /api/users/:id
    if (request.method === 'GET' && url.pathname.startsWith('/api/users/')) {
      const id = parseInt(url.pathname.split('/').pop()!);

      const user = await env.DB.prepare(
        'SELECT * FROM users WHERE id = ?'
      ).bind(id).first();

      if (!user) {
        return new Response('Not Found', { status: 404 });
      }

      return new Response(JSON.stringify(user), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // POST /api/users
    if (request.method === 'POST' && url.pathname === '/api/users') {
      const { name, email } = await request.json();

      const result = await env.DB.prepare(
        'INSERT INTO users (name, email) VALUES (?, ?)'
      ).bind(name, email).run();

      return new Response(
        JSON.stringify({ id: result.meta.last_row_id }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response('Not Found', { status: 404 });
  },
};
```

**マイグレーション（schema.sql）:**

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
```

**適用:**

```bash
wrangler d1 execute my-db --file=./schema.sql
```

### 4. R2（オブジェクトストレージ）

```typescript
export interface Env {
  MY_BUCKET: R2Bucket;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // GET /files/:key
    if (request.method === 'GET' && url.pathname.startsWith('/files/')) {
      const key = url.pathname.slice('/files/'.length);
      const object = await env.MY_BUCKET.get(key);

      if (object === null) {
        return new Response('Not Found', { status: 404 });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);

      return new Response(object.body, {
        headers,
      });
    }

    // PUT /files/:key
    if (request.method === 'PUT' && url.pathname.startsWith('/files/')) {
      const key = url.pathname.slice('/files/'.length);

      await env.MY_BUCKET.put(key, request.body, {
        httpMetadata: {
          contentType: request.headers.get('Content-Type') || 'application/octet-stream',
        },
      });

      return new Response('Uploaded', { status: 201 });
    }

    // DELETE /files/:key
    if (request.method === 'DELETE' && url.pathname.startsWith('/files/')) {
      const key = url.pathname.slice('/files/'.length);
      await env.MY_BUCKET.delete(key);
      return new Response('Deleted', { status: 204 });
    }

    return new Response('Not Found', { status: 404 });
  },
};
```

### 5. 認証（JWT検証）

```typescript
import { jwtVerify, importSPKI } from 'jose';

export interface Env {
  JWT_PUBLIC_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }

    const token = authHeader.slice(7);

    try {
      const publicKey = await importSPKI(env.JWT_PUBLIC_KEY, 'RS256');

      const { payload } = await jwtVerify(token, publicKey, {
        issuer: 'your-issuer',
        audience: 'your-audience',
      });

      // ユーザー情報を取得
      const userId = payload.sub;

      return new Response(
        JSON.stringify({
          message: 'Authenticated',
          userId,
        }),
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (err) {
      return new Response('Invalid Token', { status: 403 });
    }
  },
};
```

### 6. CORS対応

```typescript
function corsHeaders(origin?: string) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request: Request): Promise<Response> {
    const origin = request.headers.get('Origin');

    // プリフライトリクエスト
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(origin || undefined),
      });
    }

    // 実際の処理
    const response = await handleRequest(request);

    // CORSヘッダーを追加
    const headers = new Headers(response.headers);
    Object.entries(corsHeaders(origin || undefined)).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  },
};

async function handleRequest(request: Request): Promise<Response> {
  return new Response(JSON.stringify({ message: 'Hello' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### 7. キャッシュ制御

```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // キャッシュキー生成
    const cacheKey = new Request(url.toString(), request);
    const cache = caches.default;

    // キャッシュから取得
    let response = await cache.match(cacheKey);

    if (!response) {
      // キャッシュミス: 新しいレスポンス生成
      const data = await fetchDataFromOrigin(url.pathname);

      response = new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600', // 1時間キャッシュ
        },
      });

      // キャッシュに保存（非同期）
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;
  },
};

async function fetchDataFromOrigin(path: string) {
  // オリジンサーバーからデータ取得
  return { path, timestamp: new Date().toISOString() };
}
```

### 8. リダイレクト・A/Bテスト

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 地域ベースのリダイレクト
    const country = request.cf?.country || 'US';

    if (url.pathname === '/') {
      if (country === 'JP') {
        return Response.redirect('https://example.jp', 302);
      } else if (country === 'CN') {
        return Response.redirect('https://example.cn', 302);
      }
    }

    // A/Bテスト（50/50）
    if (url.pathname === '/experiment') {
      const variant = Math.random() < 0.5 ? 'A' : 'B';

      return new Response(
        `<h1>Variant ${variant}</h1>`,
        {
          headers: {
            'Content-Type': 'text/html',
            'Set-Cookie': `ab_test=${variant}; Path=/; Max-Age=2592000`, // 30日
          }
        }
      );
    }

    return new Response('Not Found', { status: 404 });
  },
};
```

## パフォーマンス最適化

### 1. Cache API活用

```typescript
// エッジキャッシュを最大限活用
const response = new Response(body, {
  headers: {
    'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    'CDN-Cache-Control': 'max-age=86400', // Cloudflare専用
  },
});
```

### 2. KVキャッシュパターン

```typescript
async function getCachedData(key: string, kv: KVNamespace, fetcher: () => Promise<any>) {
  // KVから取得試行
  const cached = await kv.get(key, 'json');
  if (cached) {
    return cached;
  }

  // キャッシュミス: データ取得
  const fresh = await fetcher();

  // KVに保存（非同期）
  await kv.put(key, JSON.stringify(fresh), { expirationTtl: 3600 });

  return fresh;
}

// 使用例
const data = await getCachedData('api:users:list', env.MY_KV, async () => {
  return await env.DB.prepare('SELECT * FROM users').all();
});
```

### 3. 並列処理

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // 複数のAPIを並列呼び出し
    const [users, posts, comments] = await Promise.all([
      env.DB.prepare('SELECT * FROM users LIMIT 10').all(),
      env.DB.prepare('SELECT * FROM posts LIMIT 10').all(),
      env.DB.prepare('SELECT * FROM comments LIMIT 10').all(),
    ]);

    return new Response(
      JSON.stringify({ users: users.results, posts: posts.results, comments: comments.results }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  },
};
```

### 4. ストリーミングレスポンス

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // 非同期でデータを書き込み
    (async () => {
      const encoder = new TextEncoder();

      writer.write(encoder.encode('{"users":['));

      const users = await env.DB.prepare('SELECT * FROM users').all();

      users.results.forEach((user, i) => {
        writer.write(encoder.encode(JSON.stringify(user)));
        if (i < users.results.length - 1) {
          writer.write(encoder.encode(','));
        }
      });

      writer.write(encoder.encode(']}'));
      writer.close();
    })();

    return new Response(readable, {
      headers: { 'Content-Type': 'application/json' }
    });
  },
};
```

## ローカル開発・テスト

### Wrangler CLI

```bash
# インストール
npm install -g wrangler

# ログイン
wrangler login

# ローカル開発サーバー
wrangler dev

# デプロイ
wrangler deploy

# ログ確認
wrangler tail

# KV操作
wrangler kv:key put --binding=MY_KV "key" "value"
wrangler kv:key get --binding=MY_KV "key"

# D1操作
wrangler d1 execute my-db --command="SELECT * FROM users"
```

### ユニットテスト（Vitest）

```typescript
// src/index.test.ts
import { describe, it, expect } from 'vitest';
import worker from './index';

describe('Worker', () => {
  it('should return hello', async () => {
    const request = new Request('https://example.com/api/hello');
    const env = {} as any;
    const ctx = {} as any;

    const response = await worker.fetch(request, env, ctx);
    const data = await response.json();

    expect(data).toEqual({ message: 'Hello, World!' });
  });

  it('should return 404', async () => {
    const request = new Request('https://example.com/not-found');
    const env = {} as any;
    const ctx = {} as any;

    const response = await worker.fetch(request, env, ctx);

    expect(response.status).toBe(404);
  });
});
```

## まとめ

### エッジコンピューティングが適している用途

- **API Gateway**: 認証、レート制限、ルーティング
- **パーソナライゼーション**: 地域・デバイス別のコンテンツ配信
- **セキュリティ**: DDoS対策、Bot検出
- **画像最適化**: リサイズ、WebP変換
- **SSR（Server-Side Rendering）**: 動的HTML生成
- **A/Bテスト**: リアルタイム実験

### Cloudflare Workers推奨ユースケース

1. **グローバルAPI**: 低レイテンシが重要
2. **認証プロキシ**: JWT検証、セッション管理
3. **コンテンツ変換**: 画像最適化、HTMLリライト
4. **マイクロサービスゲートウェイ**: バックエンド統合
5. **リアルタイムデータ**: KV/D1と組み合わせ

### 参考リソース

- **Cloudflare Workers Docs**: https://developers.cloudflare.com/workers/
- **Deno Deploy**: https://deno.com/deploy
- **Vercel Edge Functions**: https://vercel.com/docs/functions/edge-functions

エッジコンピューティングは、パフォーマンスとグローバルスケールを両立する現代的なアーキテクチャです。この記事を参考に、ぜひエッジ開発を始めてみてください！

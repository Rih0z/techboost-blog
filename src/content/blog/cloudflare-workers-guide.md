---
title: 'Cloudflare Workersでサーバーレス開発 - エッジコンピューティング入門'
description: 'Cloudflare Workersの基本からAPI構築、D1データベース、KVストレージの使い方まで徹底解説。Wranglerでのデプロイ、パフォーマンス最適化、実践的なサンプルコード付き。'
pubDate: 'Feb 05 2026'
tags: ['Cloudflare Workers', 'Serverless', 'Edge Computing']
---

# Cloudflare Workersでサーバーレス開発 - エッジコンピューティング入門

Cloudflare Workersは、世界中のエッジロケーション（300以上の都市）でJavaScript/TypeScriptコードを実行できるサーバーレスプラットフォームです。低レイテンシ、高可用性、そして無料枠の充実が特徴です。

## Cloudflare Workersの特徴

### 従来のサーバーレスとの違い

| 特徴 | Cloudflare Workers | AWS Lambda | Vercel Functions |
|------|-------------------|------------|------------------|
| 起動時間 | 0ms（コールドスタートなし） | 数百ms～数秒 | 数百ms～数秒 |
| 実行環境 | V8 Isolate | コンテナ | コンテナ |
| 実行場所 | エッジ（300+拠点） | リージョン | リージョン |
| 無料枠 | 100,000 req/日 | 100万 req/月 | 100 GB-hr/月 |
| 最大実行時間 | CPU 10ms～50ms | 15分 | 10秒～60秒 |

### ユースケース

- REST/GraphQL API
- リバースプロキシ・リライト
- A/Bテスト・パーソナライゼーション
- 画像最適化・リサイズ
- 認証・認可ゲートウェイ
- Webhookハンドラー

## セットアップ

### 1. Wranglerのインストール

```bash
# Wrangler CLI（Cloudflare Workers開発ツール）
npm install -g wrangler

# ログイン
wrangler login

# バージョン確認
wrangler --version
```

### 2. 新規プロジェクト作成

```bash
# テンプレートから作成
wrangler init my-worker

# 対話式で選択:
# - TypeScript: Yes
# - Git: Yes
# - Dependencies: Yes

cd my-worker
```

### 3. プロジェクト構成

```
my-worker/
├── src/
│   └── index.ts          # エントリポイント
├── wrangler.toml         # 設定ファイル
├── package.json
└── tsconfig.json
```

## 基本的なWorkerの実装

### Hello World

```typescript
// src/index.ts
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return new Response("Hello from Cloudflare Workers!", {
      headers: { "content-type": "text/plain" }
    });
  }
};
```

```bash
# ローカルで実行
wrangler dev

# ブラウザで http://localhost:8787 にアクセス
```

### REST APIの構築

```typescript
// src/index.ts
interface Env {
  // 環境変数の型定義
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // ルーティング
    if (path === "/api/hello" && method === "GET") {
      return new Response(JSON.stringify({ message: "Hello API" }), {
        headers: { "content-type": "application/json" }
      });
    }

    if (path.startsWith("/api/users/") && method === "GET") {
      const userId = path.split("/").pop();
      return new Response(JSON.stringify({ userId, name: "Test User" }), {
        headers: { "content-type": "application/json" }
      });
    }

    if (path === "/api/users" && method === "POST") {
      const body = await request.json();
      return new Response(JSON.stringify({ created: true, data: body }), {
        status: 201,
        headers: { "content-type": "application/json" }
      });
    }

    return new Response("Not Found", { status: 404 });
  }
};
```

### ルーター（Hono使用）

Honoは、Cloudflare Workers向けの軽量Webフレームワークです。

```bash
npm install hono
```

```typescript
// src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

const app = new Hono();

// ミドルウェア
app.use('*', logger());
app.use('/api/*', cors());

// ルート定義
app.get('/', (c) => c.text('Hello Hono!'));

app.get('/api/users/:id', (c) => {
  const id = c.req.param('id');
  return c.json({ userId: id, name: 'John Doe' });
});

app.post('/api/users', async (c) => {
  const body = await c.req.json();
  return c.json({ created: true, data: body }, 201);
});

app.notFound((c) => c.json({ error: 'Not Found' }, 404));

export default app;
```

## データストレージ

### KV（Key-Value Store）

高速な読み取り、グローバル分散KVストア。

```toml
# wrangler.toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2026-01-01"

[[kv_namespaces]]
binding = "MY_KV"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

```bash
# KV namespaceを作成
wrangler kv:namespace create "MY_KV"
```

```typescript
// src/index.ts
interface Env {
  MY_KV: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 書き込み
    if (url.pathname === "/set") {
      await env.MY_KV.put("myKey", "myValue", {
        expirationTtl: 3600 // 1時間後に自動削除
      });
      return new Response("Saved!");
    }

    // 読み取り
    if (url.pathname === "/get") {
      const value = await env.MY_KV.get("myKey");
      return new Response(value || "Not found");
    }

    // JSON保存
    if (url.pathname === "/set-json") {
      await env.MY_KV.put("user:123", JSON.stringify({
        id: 123,
        name: "Alice"
      }));
      return new Response("JSON saved!");
    }

    // JSON取得
    if (url.pathname === "/get-json") {
      const userData = await env.MY_KV.get("user:123", "json");
      return new Response(JSON.stringify(userData));
    }

    return new Response("Not Found", { status: 404 });
  }
};
```

### D1（SQLデータベース）

Cloudflareが提供するサーバーレスSQLデータベース（SQLiteベース）。

```bash
# D1データベース作成
wrangler d1 create my-database
```

```toml
# wrangler.toml
[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

```sql
-- schema.sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

```bash
# マイグレーション実行
wrangler d1 execute my-database --file=./schema.sql
```

```typescript
// src/index.ts
import { Hono } from 'hono';

interface Env {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

// ユーザー一覧
app.get('/api/users', async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM users ORDER BY created_at DESC"
  ).all();
  return c.json(results);
});

// ユーザー作成
app.post('/api/users', async (c) => {
  const { email, name } = await c.req.json();

  const result = await c.env.DB.prepare(
    "INSERT INTO users (email, name) VALUES (?, ?)"
  ).bind(email, name).run();

  return c.json({ id: result.meta.last_row_id }, 201);
});

// ユーザー取得
app.get('/api/users/:id', async (c) => {
  const id = c.req.param('id');

  const user = await c.env.DB.prepare(
    "SELECT * FROM users WHERE id = ?"
  ).bind(id).first();

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json(user);
});

export default app;
```

### R2（オブジェクトストレージ）

S3互換のオブジェクトストレージ。

```toml
# wrangler.toml
[[r2_buckets]]
binding = "MY_BUCKET"
bucket_name = "my-bucket"
```

```typescript
interface Env {
  MY_BUCKET: R2Bucket;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ファイルアップロード
    if (url.pathname === "/upload" && request.method === "PUT") {
      const file = await request.arrayBuffer();
      await env.MY_BUCKET.put("file.txt", file, {
        httpMetadata: {
          contentType: "text/plain"
        }
      });
      return new Response("Uploaded!");
    }

    // ファイル取得
    if (url.pathname === "/download") {
      const object = await env.MY_BUCKET.get("file.txt");
      if (!object) {
        return new Response("Not found", { status: 404 });
      }
      return new Response(object.body, {
        headers: {
          "content-type": object.httpMetadata?.contentType || "application/octet-stream"
        }
      });
    }

    return new Response("Not Found", { status: 404 });
  }
};
```

## 実践的なパターン

### 環境変数の使用

```toml
# wrangler.toml
[vars]
ENVIRONMENT = "production"
API_BASE_URL = "https://api.example.com"

# シークレット（暗号化）
# wrangler secret put API_KEY
```

```typescript
interface Env {
  ENVIRONMENT: string;
  API_BASE_URL: string;
  API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const response = await fetch(`${env.API_BASE_URL}/data`, {
      headers: {
        "Authorization": `Bearer ${env.API_KEY}`
      }
    });
    return response;
  }
};
```

### CORSとセキュリティヘッダー

```typescript
function setCorsHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  headers.set("Access-Control-Allow-Headers", "Content-Type");

  return new Response(response.body, {
    status: response.status,
    headers
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    // OPTIONSリクエスト（プリフライト）
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    const response = new Response("Hello!");
    return setCorsHeaders(response);
  }
};
```

### レート制限

```typescript
interface Env {
  RATE_LIMITER: KVNamespace;
}

async function rateLimit(ip: string, env: Env): Promise<boolean> {
  const key = `ratelimit:${ip}`;
  const current = await env.RATE_LIMITER.get(key);

  if (current && parseInt(current) > 100) {
    return false; // レート制限超過
  }

  const newCount = current ? parseInt(current) + 1 : 1;
  await env.RATE_LIMITER.put(key, newCount.toString(), {
    expirationTtl: 60 // 1分間
  });

  return true;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";

    if (!await rateLimit(ip, env)) {
      return new Response("Too Many Requests", { status: 429 });
    }

    return new Response("OK");
  }
};
```

## デプロイ

```bash
# プロダクションにデプロイ
wrangler deploy

# 特定の環境にデプロイ
wrangler deploy --env staging

# ログの確認
wrangler tail

# リアルタイムログ
wrangler tail --format pretty
```

## まとめ

Cloudflare Workersは以下の点で優れています:

1. **グローバルな低レイテンシ** - エッジでの実行
2. **コールドスタートゼロ** - 常に高速
3. **充実した無料枠** - 小規模プロジェクトなら無料
4. **モダンなDX** - TypeScript完全サポート
5. **統合されたエコシステム** - KV、D1、R2などシームレス

APIサーバー、リバースプロキシ、認証ゲートウェイなど、幅広い用途で活用できます。

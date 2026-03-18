---
title: "Hono完全ガイド — 軽量・高速WebフレームワークのEdge時代の選択肢"
description: "Cloudflare Workers、Deno、Bun、Node.jsで動作する超軽量WebフレームワークHonoの完全ガイド。Edge Runtimeでの高速API開発からミドルウェア、バリデーション、型安全なルーティングまで徹底解説します。"
pubDate: "2026-02-06"
tags: ["Hono", "Edge Computing", "Cloudflare Workers", "TypeScript", "Web API"]
---

Honoは、Edge Runtimeに最適化された超軽量・高速なWebフレームワークです。Cloudflare Workers、Deno、Bun、Node.jsなど、あらゆるJavaScriptランタイムで動作し、Express.jsのようなシンプルなAPIを提供しながら、圧倒的なパフォーマンスを実現します。この記事では、Honoの基本から実践的な使い方まで徹底的に解説します。

## Honoとは

Honoは「炎」を意味する日本語から名付けられた、超高速なWebフレームワークです。主な特徴は以下の通りです。

- **超軽量** - 依存関係ゼロ、わずか13KB（gzip後）
- **超高速** - RegExpベースのルーターで最速クラスの性能
- **マルチランタイム対応** - Cloudflare Workers、Deno、Bun、Node.js、Fastly Compute@Edge、Vercel Edge Functions
- **型安全** - TypeScriptファーストで完全な型推論
- **ミドルウェア豊富** - 認証、CORS、キャッシュ、圧縮など標準装備
- **Express互換API** - 学習コストが低い

## 基本的な使い方

### インストールとセットアップ

```bash
# Cloudflare Workers向け
npm create hono@latest my-app
cd my-app
npm install

# または手動インストール
npm install hono
```

### 最小構成のAPI

```typescript
// src/index.ts
import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => {
  return c.text('Hello Hono!');
});

app.get('/json', (c) => {
  return c.json({ message: 'Hello JSON!' });
});

app.get('/html', (c) => {
  return c.html('<h1>Hello HTML!</h1>');
});

export default app;
```

Cloudflare Workersで実行:

```bash
npm run dev
# http://localhost:8787 でアクセス可能
```

### 基本的なルーティング

```typescript
import { Hono } from 'hono';

const app = new Hono();

// GETリクエスト
app.get('/users', (c) => c.json({ users: [] }));

// POSTリクエスト
app.post('/users', async (c) => {
  const body = await c.req.json();
  return c.json({ created: body }, 201);
});

// PUTリクエスト
app.put('/users/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  return c.json({ id, updated: body });
});

// DELETEリクエスト
app.delete('/users/:id', (c) => {
  const id = c.req.param('id');
  return c.json({ deleted: id }, 204);
});

// PATCHリクエスト
app.patch('/users/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  return c.json({ id, patched: body });
});

export default app;
```

## パスパラメータとクエリパラメータ

### パスパラメータ

```typescript
// 単一パラメータ
app.get('/users/:id', (c) => {
  const id = c.req.param('id');
  return c.json({ userId: id });
});

// 複数パラメータ
app.get('/posts/:postId/comments/:commentId', (c) => {
  const postId = c.req.param('postId');
  const commentId = c.req.param('commentId');
  return c.json({ postId, commentId });
});

// ワイルドカード
app.get('/files/*', (c) => {
  const path = c.req.param('*');
  return c.text(`File path: ${path}`);
});

// 正規表現パターン
app.get('/posts/:id{[0-9]+}', (c) => {
  const id = c.req.param('id'); // 数字のみマッチ
  return c.json({ postId: id });
});
```

### クエリパラメータ

```typescript
app.get('/search', (c) => {
  // 単一パラメータ
  const q = c.req.query('q');

  // 複数パラメータ
  const page = c.req.query('page') || '1';
  const limit = c.req.query('limit') || '10';

  // 配列パラメータ（?tags=js&tags=ts）
  const tags = c.req.queries('tags');

  return c.json({
    query: q,
    page: parseInt(page),
    limit: parseInt(limit),
    tags,
  });
});
```

## リクエストボディの処理

```typescript
// JSONボディ
app.post('/api/users', async (c) => {
  const body = await c.req.json();
  return c.json({ received: body });
});

// テキストボディ
app.post('/api/text', async (c) => {
  const text = await c.req.text();
  return c.text(`Received: ${text}`);
});

// FormData
app.post('/api/upload', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file');
  const name = formData.get('name');
  return c.json({ fileName: file?.name, name });
});

// ArrayBuffer
app.post('/api/binary', async (c) => {
  const buffer = await c.req.arrayBuffer();
  return c.json({ size: buffer.byteLength });
});

// Raw Request
app.post('/api/raw', async (c) => {
  const req = c.req.raw;
  const contentType = req.headers.get('content-type');
  return c.json({ contentType });
});
```

## 型安全なルーティング

Honoの最大の特徴の一つが、完全な型推論です。

```typescript
import { Hono } from 'hono';

// 型定義
type User = {
  id: number;
  name: string;
  email: string;
};

type CreateUserInput = Omit<User, 'id'>;

const app = new Hono();

// 型安全なレスポンス
app.get('/users/:id', (c) => {
  const id = c.req.param('id');

  const user: User = {
    id: parseInt(id),
    name: 'John Doe',
    email: 'john@example.com',
  };

  // cは型推論される
  return c.json(user);
});

// 型安全なリクエスト
app.post('/users', async (c) => {
  const input: CreateUserInput = await c.req.json();

  const user: User = {
    id: Date.now(),
    ...input,
  };

  return c.json(user, 201);
});

export default app;
```

### Zodによるバリデーション

```typescript
import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const app = new Hono();

// スキーマ定義
const userSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150).optional(),
});

// バリデーションミドルウェア
app.post('/users', zValidator('json', userSchema), async (c) => {
  // バリデーション済みのデータを取得
  const data = c.req.valid('json');

  // ここでdataは型安全に扱える
  return c.json({
    message: 'User created',
    user: data,
  }, 201);
});

// クエリパラメータのバリデーション
const searchSchema = z.object({
  q: z.string().min(1),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

app.get('/search', zValidator('query', searchSchema), (c) => {
  const { q, page = 1, limit = 10 } = c.req.valid('query');

  return c.json({
    query: q,
    page,
    limit,
    results: [],
  });
});

export default app;
```

## ミドルウェアの活用

### 組み込みミドルウェア

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { etag } from 'hono/etag';
import { compress } from 'hono/compress';

const app = new Hono();

// CORSミドルウェア
app.use('/*', cors({
  origin: ['https://example.com'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
  credentials: true,
}));

// ロガー
app.use('*', logger());

// 整形されたJSON出力（開発時のみ）
app.use('*', prettyJSON());

// ETag生成
app.use('/api/*', etag());

// レスポンス圧縮
app.use('*', compress());

export default app;
```

### カスタムミドルウェア

```typescript
import { Hono } from 'hono';
import type { Context, Next } from 'hono';

const app = new Hono();

// リクエストIDミドルウェア
const requestId = () => {
  return async (c: Context, next: Next) => {
    const id = crypto.randomUUID();
    c.set('requestId', id);
    c.header('X-Request-ID', id);
    await next();
  };
};

// タイミングミドルウェア
const timing = () => {
  return async (c: Context, next: Next) => {
    const start = Date.now();
    await next();
    const duration = Date.now() - start;
    c.header('X-Response-Time', `${duration}ms`);
  };
};

// 認証ミドルウェア
const auth = () => {
  return async (c: Context, next: Next) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // トークン検証（簡易版）
    if (token !== 'secret-token') {
      return c.json({ error: 'Invalid token' }, 401);
    }

    c.set('userId', 'user-123');
    await next();
  };
};

// グローバルに適用
app.use('*', requestId());
app.use('*', timing());

// 特定のルートのみ
app.use('/api/*', auth());

app.get('/api/me', (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId');
  return c.json({ userId, requestId });
});

export default app;
```

## JWT認証の実装

```typescript
import { Hono } from 'hono';
import { jwt, sign } from 'hono/jwt';

const app = new Hono();

const SECRET = 'your-secret-key';

// ログインエンドポイント
app.post('/login', async (c) => {
  const { username, password } = await c.req.json();

  // 認証ロジック（簡易版）
  if (username === 'admin' && password === 'password') {
    const payload = {
      sub: username,
      role: 'admin',
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1時間
    };

    const token = await sign(payload, SECRET);
    return c.json({ token });
  }

  return c.json({ error: 'Invalid credentials' }, 401);
});

// JWT認証が必要なルート
app.use('/api/*', jwt({ secret: SECRET }));

app.get('/api/profile', (c) => {
  const payload = c.get('jwtPayload');
  return c.json({
    username: payload.sub,
    role: payload.role,
  });
});

export default app;
```

## エラーハンドリング

```typescript
import { Hono } from 'hono';
import type { ErrorHandler } from 'hono';

const app = new Hono();

// カスタムエラークラス
class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// グローバルエラーハンドラ
const errorHandler: ErrorHandler = (err, c) => {
  console.error(`[Error] ${err.message}`);

  if (err instanceof AppError) {
    return c.json({
      error: err.message,
      code: err.code,
    }, err.statusCode);
  }

  return c.json({
    error: 'Internal Server Error',
  }, 500);
};

app.onError(errorHandler);

// エラーを投げる例
app.get('/users/:id', async (c) => {
  const id = c.req.param('id');

  if (!id.match(/^\d+$/)) {
    throw new AppError('Invalid user ID', 400, 'INVALID_ID');
  }

  // ユーザー取得ロジック
  const user = null; // 仮

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  return c.json({ user });
});

// 404ハンドラ
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    path: c.req.path,
  }, 404);
});

export default app;
```

## データベース統合

### Cloudflare D1（SQLite）

```typescript
import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// ユーザー一覧取得
app.get('/users', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM users ORDER BY created_at DESC'
  ).all();

  return c.json({ users: results });
});

// ユーザー作成
app.post('/users', async (c) => {
  const { name, email } = await c.req.json();

  const { success } = await c.env.DB.prepare(
    'INSERT INTO users (name, email) VALUES (?, ?)'
  ).bind(name, email).run();

  if (success) {
    return c.json({ message: 'User created' }, 201);
  }

  return c.json({ error: 'Failed to create user' }, 500);
});

// ユーザー取得
app.get('/users/:id', async (c) => {
  const id = c.req.param('id');

  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(id).first();

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({ user });
});

export default app;
```

### Prisma統合（Node.js/Bun）

```typescript
import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = new Hono();

app.get('/posts', async (c) => {
  const posts = await prisma.post.findMany({
    include: {
      author: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return c.json({ posts });
});

app.post('/posts', async (c) => {
  const { title, content, authorId } = await c.req.json();

  const post = await prisma.post.create({
    data: {
      title,
      content,
      authorId,
    },
  });

  return c.json({ post }, 201);
});

app.get('/posts/:id', async (c) => {
  const id = parseInt(c.req.param('id'));

  const post = await prisma.post.findUnique({
    where: { id },
    include: { author: true },
  });

  if (!post) {
    return c.json({ error: 'Post not found' }, 404);
  }

  return c.json({ post });
});

export default app;
```

## キャッシング戦略

```typescript
import { Hono } from 'hono';
import { cache } from 'hono/cache';

const app = new Hono();

// 静的キャッシュ（1時間）
app.get(
  '/api/static',
  cache({
    cacheName: 'my-app',
    cacheControl: 'max-age=3600',
  }),
  (c) => {
    return c.json({
      timestamp: Date.now(),
      data: 'This is cached',
    });
  }
);

// Cloudflare KVを使ったカスタムキャッシュ
type Bindings = {
  CACHE: KVNamespace;
};

const appWithKV = new Hono<{ Bindings: Bindings }>();

appWithKV.get('/api/data/:id', async (c) => {
  const id = c.req.param('id');
  const cacheKey = `data:${id}`;

  // キャッシュチェック
  const cached = await c.env.CACHE.get(cacheKey, 'json');
  if (cached) {
    return c.json({ ...cached, cached: true });
  }

  // データ取得（重い処理を想定）
  const data = {
    id,
    value: Math.random(),
    timestamp: Date.now(),
  };

  // キャッシュに保存（1時間）
  await c.env.CACHE.put(cacheKey, JSON.stringify(data), {
    expirationTtl: 3600,
  });

  return c.json({ ...data, cached: false });
});

export default appWithKV;
```

## ファイルアップロード

```typescript
import { Hono } from 'hono';

type Bindings = {
  BUCKET: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

// Cloudflare R2へのファイルアップロード
app.post('/upload', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return c.json({ error: 'No file provided' }, 400);
  }

  // ファイルサイズチェック（10MB制限）
  if (file.size > 10 * 1024 * 1024) {
    return c.json({ error: 'File too large' }, 400);
  }

  // ファイルタイプチェック
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: 'Invalid file type' }, 400);
  }

  // ファイル名生成
  const fileName = `${crypto.randomUUID()}-${file.name}`;

  // R2にアップロード
  await c.env.BUCKET.put(fileName, file.stream(), {
    httpMetadata: {
      contentType: file.type,
    },
  });

  return c.json({
    message: 'File uploaded',
    fileName,
    url: `/files/${fileName}`,
  }, 201);
});

// ファイル取得
app.get('/files/:name', async (c) => {
  const name = c.req.param('name');

  const object = await c.env.BUCKET.get(name);

  if (!object) {
    return c.json({ error: 'File not found' }, 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=31536000');

  return new Response(object.body, { headers });
});

export default app;
```

## ルートグルーピング

```typescript
import { Hono } from 'hono';

const app = new Hono();

// APIルートグループ
const api = new Hono();

api.get('/users', (c) => c.json({ users: [] }));
api.post('/users', async (c) => {
  const body = await c.req.json();
  return c.json({ created: body }, 201);
});

// 管理者ルートグループ
const admin = new Hono();

admin.use('*', async (c, next) => {
  // 認証チェック
  const isAdmin = c.req.header('X-Admin-Token') === 'secret';
  if (!isAdmin) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  await next();
});

admin.get('/stats', (c) => c.json({ stats: {} }));
admin.delete('/users/:id', (c) => {
  const id = c.req.param('id');
  return c.json({ deleted: id });
});

// グループをマウント
app.route('/api', api);
app.route('/admin', admin);

export default app;
```

## WebSocketサポート（Cloudflare Workers）

```typescript
import { Hono } from 'hono';

const app = new Hono();

app.get('/ws', async (c) => {
  const upgradeHeader = c.req.header('Upgrade');

  if (upgradeHeader !== 'websocket') {
    return c.text('Expected Upgrade: websocket', 426);
  }

  const webSocketPair = new WebSocketPair();
  const [client, server] = Object.values(webSocketPair);

  server.accept();

  server.addEventListener('message', (event) => {
    console.log('Received:', event.data);
    server.send(`Echo: ${event.data}`);
  });

  server.addEventListener('close', () => {
    console.log('WebSocket closed');
  });

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
});

export default app;
```

## テスト

```typescript
// test/index.test.ts
import { describe, it, expect } from 'vitest';
import app from '../src/index';

describe('API Tests', () => {
  it('GET / should return hello message', async () => {
    const res = await app.request('http://localhost/');
    expect(res.status).toBe(200);

    const text = await res.text();
    expect(text).toBe('Hello Hono!');
  });

  it('POST /users should create user', async () => {
    const res = await app.request('http://localhost/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com',
      }),
    });

    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.created.name).toBe('John Doe');
  });

  it('GET /api/me should require authentication', async () => {
    const res = await app.request('http://localhost/api/me');
    expect(res.status).toBe(401);
  });
});
```

## デプロイ

### Cloudflare Workers

```bash
# wrangler.tomlの設定
npm run deploy
```

```toml
# wrangler.toml
name = "my-hono-app"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[env.production]
vars = { ENVIRONMENT = "production" }
```

### Vercel Edge Functions

```typescript
// api/index.ts
import { Hono } from 'hono';
import { handle } from 'hono/vercel';

const app = new Hono().basePath('/api');

app.get('/hello', (c) => c.json({ message: 'Hello from Vercel!' }));

export const GET = handle(app);
export const POST = handle(app);
```

### Deno Deploy

```typescript
// main.ts
import { Hono } from 'https://deno.land/x/hono/mod.ts';

const app = new Hono();

app.get('/', (c) => c.text('Hello Deno!'));

Deno.serve(app.fetch);
```

## パフォーマンス最適化

```typescript
import { Hono } from 'hono';
import { compress } from 'hono/compress';
import { etag } from 'hono/etag';

const app = new Hono();

// レスポンス圧縮
app.use('*', compress());

// ETag生成
app.use('*', etag());

// ストリーミングレスポンス
app.get('/stream', (c) => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue('chunk1\n');
      controller.enqueue('chunk2\n');
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain',
      'Transfer-Encoding': 'chunked',
    },
  });
});

export default app;
```

## まとめ

Honoは、Edge Computing時代の理想的なWebフレームワークです。

**主な利点:**
- 超軽量で高速なパフォーマンス
- あらゆるランタイムで動作するポータビリティ
- TypeScriptファーストの型安全性
- 豊富なミドルウェアエコシステム
- Express互換の学習しやすいAPI

Cloudflare Workers、Deno Deploy、Vercel Edge FunctionsなどのEdge Runtimeで高速なAPIを構築したい場合、Honoは最高の選択肢の一つです。軽量でありながら、本格的なアプリケーション開発に必要な機能が全て揃っています。

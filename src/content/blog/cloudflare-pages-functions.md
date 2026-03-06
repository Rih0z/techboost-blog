---
title: 'Cloudflare Pages Functions実践: フルスタックアプリのエッジデプロイ'
description: 'Cloudflare Pages Functionsを使ったフルスタックアプリケーション開発ガイド。Next.js、Remix、Astroとの統合、D1データベース、R2ストレージの活用方法を実践的に解説します。サンプルコード付きで実践的に解説。'
pubDate: '2025-12-01'
updatedDate: '2025-12-01'
tags: ['Cloudflare', 'Pages Functions', 'Serverless', 'Edge Computing', 'フルスタック', 'インフラ']
---
Cloudflare Pages Functionsは、静的サイトホスティングとサーバーレス関数を統合したプラットフォームです。既存のCloudflare Workersガイドでは基本的なAPI構築を紹介しましたが、本記事ではフルスタックアプリケーションの構築に焦点を当てます。

## Cloudflare Pages Functionsとは

### Workersとの違い

| 項目 | Workers | Pages Functions |
|------|---------|-----------------|
| 用途 | API/マイクロサービス | フルスタックアプリ |
| 静的ファイル | 手動管理 | 自動ホスティング |
| ルーティング | 手動実装 | ファイルベース |
| デプロイ | wrangler CLI | Git連携 |
| フレームワーク統合 | 手動設定 | ネイティブサポート |

### アーキテクチャ

```
/
├── /public/              # 静的ファイル（自動配信）
├── /functions/           # サーバーレス関数（エッジ実行）
│   ├── api/
│   │   ├── users.ts      # /api/users
│   │   ├── posts/
│   │   │   └── [id].ts   # /api/posts/[id]
│   │   └── _middleware.ts # ミドルウェア
│   └── hello.ts          # /hello
└── /src/                 # フロントエンドコード
```

## セットアップ

### 1. プロジェクト作成

```bash
# Next.jsプロジェクト（推奨）
npx create-next-app@latest my-app --typescript

cd my-app

# Cloudflare Pages対応の設定
npm install --save-dev @cloudflare/next-on-pages
```

### 2. 設定ファイル

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloudflare Pages用の設定
  output: 'export', // 静的エクスポート

  // 画像最適化の無効化（Cloudflareで処理）
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
```

```toml
# wrangler.toml
name = "my-app"
compatibility_date = "2025-12-01"
pages_build_output_dir = ".vercel/output/static"

# KVバインディング
[[kv_namespaces]]
binding = "MY_KV"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# D1データベース
[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# R2バケット
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "my-bucket"

# 環境変数
[vars]
ENVIRONMENT = "production"
```

## ファイルベースルーティング

### 基本的なAPI

```typescript
// functions/api/hello.ts
export async function onRequest(context) {
  return new Response(JSON.stringify({
    message: 'Hello from Cloudflare Pages!',
    timestamp: new Date().toISOString(),
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### HTTPメソッド別のハンドラー

```typescript
// functions/api/users.ts
interface Env {
  DB: D1Database;
}

// GET /api/users
export async function onRequestGet(context: EventContext<Env, any, any>) {
  const { results } = await context.env.DB.prepare(
    'SELECT id, name, email FROM users'
  ).all();

  return Response.json(results);
}

// POST /api/users
export async function onRequestPost(context: EventContext<Env, any, any>) {
  const { name, email } = await context.request.json();

  const result = await context.env.DB.prepare(
    'INSERT INTO users (name, email) VALUES (?, ?)'
  ).bind(name, email).run();

  return Response.json(
    { id: result.meta.last_row_id, name, email },
    { status: 201 }
  );
}

// PUT /api/users
export async function onRequestPut(context: EventContext<Env, any, any>) {
  const { id, name, email } = await context.request.json();

  await context.env.DB.prepare(
    'UPDATE users SET name = ?, email = ? WHERE id = ?'
  ).bind(name, email, id).run();

  return Response.json({ success: true });
}

// DELETE /api/users
export async function onRequestDelete(context: EventContext<Env, any, any>) {
  const url = new URL(context.request.url);
  const id = url.searchParams.get('id');

  await context.env.DB.prepare(
    'DELETE FROM users WHERE id = ?'
  ).bind(id).run();

  return Response.json({ success: true });
}
```

### 動的ルート

```typescript
// functions/api/posts/[id].ts
interface Env {
  DB: D1Database;
}

export async function onRequestGet(context: EventContext<Env, string, any>) {
  const { id } = context.params;

  const post = await context.env.DB.prepare(
    'SELECT * FROM posts WHERE id = ?'
  ).bind(id).first();

  if (!post) {
    return Response.json({ error: 'Post not found' }, { status: 404 });
  }

  return Response.json(post);
}

// functions/api/posts/[id]/comments.ts
export async function onRequestGet(context: EventContext<Env, string, any>) {
  const { id } = context.params;

  const { results } = await context.env.DB.prepare(
    'SELECT * FROM comments WHERE post_id = ? ORDER BY created_at DESC'
  ).bind(id).all();

  return Response.json(results);
}
```

### キャッチオールルート

```typescript
// functions/api/[...path].ts
export async function onRequest(context) {
  const path = context.params.path;

  return Response.json({
    message: 'Catch-all route',
    path: path,
    url: context.request.url,
  });
}
```

## ミドルウェア

### 認証ミドルウェア

```typescript
// functions/_middleware.ts
interface Env {
  DB: D1Database;
}

export async function onRequest(context: EventContext<Env, any, any>) {
  const url = new URL(context.request.url);

  // /api/admin/* は認証必須
  if (url.pathname.startsWith('/api/admin')) {
    const authHeader = context.request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // トークン検証
    const session = await context.env.DB.prepare(
      'SELECT * FROM sessions WHERE token = ? AND expires_at > ?'
    ).bind(token, Date.now()).first();

    if (!session) {
      return Response.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // コンテキストにユーザー情報を追加
    context.data.userId = session.user_id;
  }

  // 次のミドルウェア/ハンドラーへ
  return context.next();
}
```

### CORSミドルウェア

```typescript
// functions/api/_middleware.ts
export async function onRequest(context) {
  // プリフライトリクエスト
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // 実際のリクエスト処理
  const response = await context.next();

  // CORSヘッダーを追加
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
```

### レート制限ミドルウェア

```typescript
// functions/api/_middleware.ts
interface Env {
  RATE_LIMITER: KVNamespace;
}

export async function onRequest(context: EventContext<Env, any, any>) {
  const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown';
  const key = `ratelimit:${ip}`;

  // 現在のカウントを取得
  const current = await context.env.RATE_LIMITER.get(key);
  const count = current ? parseInt(current) : 0;

  // レート制限チェック（1分間に100リクエスト）
  if (count >= 100) {
    return Response.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
        },
      }
    );
  }

  // カウント更新
  await context.env.RATE_LIMITER.put(
    key,
    (count + 1).toString(),
    { expirationTtl: 60 }
  );

  const response = await context.next();

  // レート制限情報をヘッダーに追加
  const headers = new Headers(response.headers);
  headers.set('X-RateLimit-Limit', '100');
  headers.set('X-RateLimit-Remaining', (99 - count).toString());

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}
```

## データベース統合（D1）

### スキーマ定義

```sql
-- schema.sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  published BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_published ON posts(published);
CREATE INDEX idx_comments_post_id ON comments(post_id);
```

```bash
# マイグレーション実行
wrangler d1 execute my-database --file=./schema.sql
```

### トランザクション

```typescript
// functions/api/posts/create.ts
interface Env {
  DB: D1Database;
}

export async function onRequestPost(context: EventContext<Env, any, any>) {
  const { title, content, tags } = await context.request.json();
  const userId = context.data.userId; // 認証ミドルウェアで設定

  // トランザクション開始
  const result = await context.env.DB.batch([
    // 投稿作成
    context.env.DB.prepare(
      'INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)'
    ).bind(userId, title, content),

    // タグ作成（複数）
    ...tags.map((tag: string) =>
      context.env.DB.prepare(
        'INSERT INTO post_tags (post_id, tag) VALUES (last_insert_rowid(), ?)'
      ).bind(tag)
    ),
  ]);

  return Response.json({
    id: result[0].meta.last_row_id,
    success: true,
  }, { status: 201 });
}
```

## ファイルアップロード（R2）

```typescript
// functions/api/upload.ts
interface Env {
  BUCKET: R2Bucket;
}

export async function onRequestPost(context: EventContext<Env, any, any>) {
  const formData = await context.request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return Response.json({ error: 'No file provided' }, { status: 400 });
  }

  // ファイルサイズチェック（10MB制限）
  if (file.size > 10 * 1024 * 1024) {
    return Response.json(
      { error: 'File too large (max 10MB)' },
      { status: 400 }
    );
  }

  // MIMEタイプチェック
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return Response.json(
      { error: 'Invalid file type' },
      { status: 400 }
    );
  }

  // ファイル名生成（UUID + 拡張子）
  const ext = file.name.split('.').pop();
  const filename = `${crypto.randomUUID()}.${ext}`;

  // R2にアップロード
  await context.env.BUCKET.put(filename, file.stream(), {
    httpMetadata: {
      contentType: file.type,
    },
  });

  return Response.json({
    filename,
    url: `/files/${filename}`,
    size: file.size,
  });
}

// ファイル取得
// functions/files/[filename].ts
export async function onRequestGet(context: EventContext<Env, string, any>) {
  const { filename } = context.params;

  const object = await context.env.BUCKET.get(filename);

  if (!object) {
    return Response.json({ error: 'File not found' }, { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
```

## 認証の実装

```typescript
// functions/api/auth/register.ts
import { hash } from 'bcryptjs';

interface Env {
  DB: D1Database;
}

export async function onRequestPost(context: EventContext<Env, any, any>) {
  const { email, password, name } = await context.request.json();

  // バリデーション
  if (!email || !password || !name) {
    return Response.json({ error: 'Missing fields' }, { status: 400 });
  }

  if (password.length < 8) {
    return Response.json({ error: 'Password too short' }, { status: 400 });
  }

  // 重複チェック
  const existing = await context.env.DB.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).bind(email).first();

  if (existing) {
    return Response.json({ error: 'Email already exists' }, { status: 400 });
  }

  // パスワードハッシュ化
  const passwordHash = await hash(password, 10);

  // ユーザー作成
  const result = await context.env.DB.prepare(
    'INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)'
  ).bind(email, name, passwordHash).run();

  return Response.json({
    id: result.meta.last_row_id,
    email,
    name,
  }, { status: 201 });
}
```

```typescript
// functions/api/auth/login.ts
import { compare } from 'bcryptjs';

export async function onRequestPost(context: EventContext<Env, any, any>) {
  const { email, password } = await context.request.json();

  // ユーザー検索
  const user = await context.env.DB.prepare(
    'SELECT * FROM users WHERE email = ?'
  ).bind(email).first();

  if (!user) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // パスワード検証
  const valid = await compare(password, user.password_hash);

  if (!valid) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // セッショントークン生成
  const token = crypto.randomUUID();
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30日

  // セッション保存
  await context.env.DB.prepare(
    'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)'
  ).bind(user.id, token, expiresAt).run();

  return Response.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });
}
```

## デプロイ

### Git連携デプロイ

```bash
# Cloudflareダッシュボードで設定
# 1. Pages > Create a project
# 2. Connect to Git
# 3. リポジトリ選択
# 4. ビルド設定:
#    - Build command: npm run build
#    - Build output directory: .vercel/output/static
```

### CLI デプロイ

```bash
# ビルド
npm run build

# デプロイ
npx wrangler pages deploy .vercel/output/static --project-name=my-app

# プロダクションデプロイ
npx wrangler pages deploy .vercel/output/static --project-name=my-app --branch=main
```

### 環境変数設定

```bash
# 環境変数設定
wrangler pages secret put API_KEY --project-name=my-app

# KVバインディング追加
wrangler pages deployment create --project-name=my-app --kv MY_KV=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## パフォーマンス最適化

### キャッシング戦略

```typescript
// functions/api/posts/[id].ts
export async function onRequestGet(context: EventContext<Env, string, any>) {
  const { id } = context.params;

  // Cloudflare Cacheを利用
  const cacheKey = new Request(context.request.url);
  const cache = caches.default;

  // キャッシュチェック
  let response = await cache.match(cacheKey);

  if (!response) {
    // データベースから取得
    const post = await context.env.DB.prepare(
      'SELECT * FROM posts WHERE id = ?'
    ).bind(id).first();

    response = Response.json(post, {
      headers: {
        'Cache-Control': 'public, max-age=3600', // 1時間キャッシュ
      },
    });

    // キャッシュに保存
    context.waitUntil(cache.put(cacheKey, response.clone()));
  }

  return response;
}
```

## まとめ

Cloudflare Pages Functionsの主な利点：

1. **統合開発体験** - 静的サイト + サーバーレス
2. **グローバルエッジ** - 300+拠点での低レイテンシ
3. **無料枠が充実** - 小規模プロジェクトなら無料
4. **フレームワーク統合** - Next.js、Remix、Astroネイティブサポート
5. **データベース統合** - D1、KV、R2がシームレス

VercelやNetlifyと比較して、エッジでの実行と充実した無料枠が強みです。

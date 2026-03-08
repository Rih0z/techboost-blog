---
title: "Cloudflare Workersフルスタック開発ガイド - D1・R2・KV活用"
description: "Cloudflare WorkersでフルスタックWebアプリを構築する実践ガイド。D1データベース、R2ストレージ、KVストア、Durable Objectsを活用したエッジコンピューティング開発を徹底解説します。具体的なコード例とともに詳しく紹介します。"
pubDate: "2025-02-06"
tags: ["Cloudflare Workers", "D1", "R2", "KV", "エッジコンピューティング"]
heroImage: '../../assets/thumbnails/cloudflare-workers-fullstack.jpg'
---

Cloudflare Workersは、CDNのエッジネットワーク上でコードを実行できる革新的なプラットフォームです。従来のサーバーレスプラットフォームと比較して、グローバルに分散されたエッジロケーションで瞬時にレスポンスを返すことができ、レイテンシの大幅な改善とコスト削減を実現します。

本記事では、Cloudflare WorkersとD1（SQLデータベース）、R2（オブジェクトストレージ）、KV（キーバリューストア）を組み合わせたフルスタック開発の実践方法を徹底解説します。

## Cloudflare Workersの特徴

### エッジコンピューティングのメリット

```typescript
// 世界中のエッジロケーションで実行される
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // ユーザーに最も近いエッジで処理
    const location = request.cf?.colo // エッジロケーション
    return new Response(`Hello from ${location}!`)
  }
}
```

### V8 Isolateアーキテクチャ

従来のコンテナ型サーバーレスと異なり、V8 Isolateを使用することで以下の利点があります。

- **コールドスタート0ms**: 瞬時に起動
- **メモリ効率**: 1つのプロセスで複数のリクエストを処理
- **無限スケール**: 自動的に世界中のエッジにデプロイ

### 料金体系

```typescript
// 無料枠（Free Plan）
// - 100,000リクエスト/日
// - CPU時間: 10ms/リクエスト
// - KV: 100,000読み取り/日、1,000書き込み/日
// - D1: 5GB/月、5M行読み取り/日

// Paid Plan: $5/月〜
// - 10Mリクエスト/月
// - CPU時間: 50ms/リクエスト
// - KV: 10M読み取り/月、1M書き込み/月
// - D1: 25GB/月
```

## プロジェクトセットアップ

### Wranglerのインストール

```bash
# Wrangler CLI（Cloudflare Workers開発ツール）
npm install -g wrangler

# ログイン
wrangler login

# 新規プロジェクト作成
npm create cloudflare@latest my-app
```

### プロジェクト構造

```
my-app/
├── src/
│   ├── index.ts       # エントリーポイント
│   ├── routes/        # ルート定義
│   ├── db/            # D1スキーマとマイグレーション
│   └── utils/         # ユーティリティ
├── wrangler.toml      # Cloudflare設定
├── schema.sql         # D1スキーマ
└── package.json
```

### wrangler.toml設定

```toml
name = "my-app"
main = "src/index.ts"
compatibility_date = "2025-01-01"

# D1データベース
[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "your-database-id"

# KVネームスペース
[[kv_namespaces]]
binding = "KV"
id = "your-kv-id"

# R2バケット
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "my-bucket"

# 環境変数
[vars]
ENVIRONMENT = "production"
API_VERSION = "v1"

# シークレット（wrangler secret put で設定）
# JWT_SECRET
# DATABASE_URL
```

## D1データベース（SQLite）

### D1の特徴

D1は、Cloudflareが提供するSQLiteベースの分散データベースです。

```typescript
// エッジで実行されるSQLデータベース
// - グローバルに分散
// - 自動レプリケーション
// - SQLiteベースで使いやすい
```

### データベース作成

```bash
# D1データベース作成
wrangler d1 create my-database

# データベースID取得（wrangler.tomlに追加）
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### スキーマ定義

```sql
-- schema.sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  published BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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

### マイグレーション実行

```bash
# ローカル環境でマイグレーション
wrangler d1 execute my-database --local --file=./schema.sql

# 本番環境でマイグレーション
wrangler d1 execute my-database --file=./schema.sql
```

### D1クエリの実行

```typescript
// src/db/queries.ts
import { D1Database } from '@cloudflare/workers-types'

export interface User {
  id: number
  email: string
  name: string
  created_at: string
}

export interface Post {
  id: number
  user_id: number
  title: string
  content: string
  published: boolean
  created_at: string
}

// ユーザー作成
export async function createUser(
  db: D1Database,
  email: string,
  name: string
): Promise<User> {
  const result = await db
    .prepare('INSERT INTO users (email, name) VALUES (?, ?) RETURNING *')
    .bind(email, name)
    .first<User>()

  if (!result) throw new Error('Failed to create user')
  return result
}

// ユーザー取得
export async function getUser(db: D1Database, id: number): Promise<User | null> {
  return await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(id)
    .first<User>()
}

// 投稿一覧取得
export async function getPosts(
  db: D1Database,
  limit = 10,
  offset = 0
): Promise<Post[]> {
  const { results } = await db
    .prepare('SELECT * FROM posts WHERE published = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .bind(limit, offset)
    .all<Post>()

  return results
}

// 投稿作成
export async function createPost(
  db: D1Database,
  userId: number,
  title: string,
  content: string
): Promise<Post> {
  const result = await db
    .prepare(
      'INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?) RETURNING *'
    )
    .bind(userId, title, content)
    .first<Post>()

  if (!result) throw new Error('Failed to create post')
  return result
}

// バッチクエリ（トランザクション）
export async function createUserWithPost(
  db: D1Database,
  email: string,
  name: string,
  postTitle: string,
  postContent: string
): Promise<{ user: User; post: Post }> {
  // バッチで複数クエリを実行（トランザクション的）
  const [userResult, postResult] = await db.batch([
    db.prepare('INSERT INTO users (email, name) VALUES (?, ?) RETURNING *')
      .bind(email, name),
    db.prepare('INSERT INTO posts (user_id, title, content) VALUES (last_insert_rowid(), ?, ?) RETURNING *')
      .bind(postTitle, postContent),
  ])

  const user = userResult.results[0] as User
  const post = postResult.results[0] as Post

  return { user, post }
}
```

### D1とDrizzle ORMの統合

```typescript
// src/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  content: text('content').notNull(),
  published: integer('published', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})
```

```typescript
// src/index.ts
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import * as schema from './db/schema'

export interface Env {
  DB: D1Database
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const db = drizzle(env.DB, { schema })

    // Drizzle ORMでクエリ
    const allUsers = await db.select().from(schema.users)

    return Response.json(allUsers)
  },
}
```

## KV（キーバリューストア）

### KVの特徴

```typescript
// KVは低レイテンシのキーバリューストア
// - エッジでのキャッシング
// - 最終的整合性（eventually consistent）
// - 大量の読み取りに最適
// - TTL（有効期限）設定可能
```

### KVネームスペース作成

```bash
# KVネームスペース作成
wrangler kv:namespace create "KV"

# プレビュー用（開発環境）
wrangler kv:namespace create "KV" --preview
```

### KV基本操作

```typescript
// src/cache/kv.ts
export async function getCachedUser(
  kv: KVNamespace,
  userId: number
): Promise<User | null> {
  const cached = await kv.get(`user:${userId}`, 'json')
  return cached as User | null
}

export async function setCachedUser(
  kv: KVNamespace,
  userId: number,
  user: User,
  ttl = 3600 // 1時間
): Promise<void> {
  await kv.put(
    `user:${userId}`,
    JSON.stringify(user),
    { expirationTtl: ttl }
  )
}

export async function deleteCachedUser(
  kv: KVNamespace,
  userId: number
): Promise<void> {
  await kv.delete(`user:${userId}`)
}
```

### KVを使ったキャッシング戦略

```typescript
// キャッシュアサイドパターン
export async function getUserWithCache(
  db: D1Database,
  kv: KVNamespace,
  userId: number
): Promise<User | null> {
  // 1. KVキャッシュから取得試行
  const cached = await getCachedUser(kv, userId)
  if (cached) {
    console.log('Cache hit')
    return cached
  }

  // 2. キャッシュミス → DBから取得
  console.log('Cache miss')
  const user = await getUser(db, userId)

  if (user) {
    // 3. KVにキャッシュ
    await setCachedUser(kv, userId, user)
  }

  return user
}

// ライトスルーキャッシュ
export async function updateUser(
  db: D1Database,
  kv: KVNamespace,
  userId: number,
  updates: Partial<User>
): Promise<User> {
  // 1. DBを更新
  const result = await db
    .prepare('UPDATE users SET name = ? WHERE id = ? RETURNING *')
    .bind(updates.name, userId)
    .first<User>()

  if (!result) throw new Error('User not found')

  // 2. キャッシュを更新
  await setCachedUser(kv, userId, result)

  return result
}
```

### セッション管理

```typescript
// src/auth/session.ts
import { nanoid } from 'nanoid'

export interface Session {
  userId: number
  email: string
  createdAt: number
}

export async function createSession(
  kv: KVNamespace,
  userId: number,
  email: string
): Promise<string> {
  const sessionId = nanoid()
  const session: Session = {
    userId,
    email,
    createdAt: Date.now(),
  }

  // 24時間有効なセッション
  await kv.put(`session:${sessionId}`, JSON.stringify(session), {
    expirationTtl: 86400,
  })

  return sessionId
}

export async function getSession(
  kv: KVNamespace,
  sessionId: string
): Promise<Session | null> {
  const session = await kv.get(`session:${sessionId}`, 'json')
  return session as Session | null
}

export async function deleteSession(
  kv: KVNamespace,
  sessionId: string
): Promise<void> {
  await kv.delete(`session:${sessionId}`)
}
```

## R2オブジェクトストレージ

### R2の特徴

```typescript
// R2はS3互換のオブジェクトストレージ
// - 転送料金なし（egress free）
// - S3 APIと互換性
// - 画像、動画、ファイルストレージに最適
```

### R2バケット作成

```bash
# R2バケット作成
wrangler r2 bucket create my-bucket
```

### R2基本操作

```typescript
// src/storage/r2.ts
export async function uploadFile(
  bucket: R2Bucket,
  key: string,
  file: File | Blob
): Promise<void> {
  await bucket.put(key, file, {
    httpMetadata: {
      contentType: file.type,
    },
  })
}

export async function getFile(
  bucket: R2Bucket,
  key: string
): Promise<R2ObjectBody | null> {
  return await bucket.get(key)
}

export async function deleteFile(
  bucket: R2Bucket,
  key: string
): Promise<void> {
  await bucket.delete(key)
}

export async function listFiles(
  bucket: R2Bucket,
  prefix?: string
): Promise<R2Objects> {
  return await bucket.list({ prefix })
}
```

### 画像アップロードAPI

```typescript
// src/routes/upload.ts
import { nanoid } from 'nanoid'

export interface Env {
  BUCKET: R2Bucket
  DB: D1Database
}

export async function handleUpload(
  request: Request,
  env: Env
): Promise<Response> {
  // マルチパートフォームデータを解析
  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file) {
    return Response.json({ error: 'No file uploaded' }, { status: 400 })
  }

  // ファイル検証
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    return Response.json({ error: 'File too large' }, { status: 400 })
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return Response.json({ error: 'Invalid file type' }, { status: 400 })
  }

  // ユニークなファイル名生成
  const ext = file.name.split('.').pop()
  const key = `uploads/${nanoid()}.${ext}`

  // R2にアップロード
  await env.BUCKET.put(key, file, {
    httpMetadata: {
      contentType: file.type,
    },
    customMetadata: {
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
    },
  })

  // DBに記録
  await env.DB
    .prepare('INSERT INTO files (key, name, size, type) VALUES (?, ?, ?, ?)')
    .bind(key, file.name, file.size, file.type)
    .run()

  return Response.json({
    success: true,
    key,
    url: `/api/files/${key}`,
  })
}

// ファイル取得
export async function handleGetFile(
  request: Request,
  env: Env,
  key: string
): Promise<Response> {
  const object = await env.BUCKET.get(key)

  if (!object) {
    return new Response('File not found', { status: 404 })
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000',
      'ETag': object.etag,
    },
  })
}
```

### 画像リサイズ（Image Resizing）

```typescript
// Cloudflare Image Resizingを使用
export async function handleResizedImage(
  request: Request,
  env: Env,
  key: string
): Promise<Response> {
  const url = new URL(request.url)
  const width = url.searchParams.get('w') || '800'
  const quality = url.searchParams.get('q') || '85'

  // R2からオリジナル画像取得
  const object = await env.BUCKET.get(key)
  if (!object) {
    return new Response('Image not found', { status: 404 })
  }

  // Image Resizing（Cloudflare有料プラン）
  const resizedImage = await fetch(`https://example.com/cdn-cgi/image/width=${width},quality=${quality}/${key}`)

  return new Response(resizedImage.body, {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000',
    },
  })
}
```

## ルーティングとAPI設計

### Honoフレームワークの統合

```bash
npm install hono
```

```typescript
// src/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './db/schema'

export interface Env {
  DB: D1Database
  KV: KVNamespace
  BUCKET: R2Bucket
}

const app = new Hono<{ Bindings: Env }>()

// ミドルウェア
app.use('*', logger())
app.use('*', cors())

// ヘルスチェック
app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

// ユーザーAPI
app.get('/api/users', async (c) => {
  const db = drizzle(c.env.DB, { schema })
  const users = await db.select().from(schema.users)
  return c.json(users)
})

app.get('/api/users/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const db = drizzle(c.env.DB, { schema })

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))

  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  return c.json(user)
})

app.post('/api/users', async (c) => {
  const body = await c.req.json()
  const db = drizzle(c.env.DB, { schema })

  const [user] = await db
    .insert(schema.users)
    .values({
      email: body.email,
      name: body.name,
    })
    .returning()

  return c.json(user, 201)
})

// 投稿API
app.get('/api/posts', async (c) => {
  const db = drizzle(c.env.DB, { schema })
  const limit = parseInt(c.req.query('limit') || '10')
  const offset = parseInt(c.req.query('offset') || '0')

  const posts = await db
    .select()
    .from(schema.posts)
    .where(eq(schema.posts.published, true))
    .limit(limit)
    .offset(offset)

  return c.json(posts)
})

// ファイルアップロード
app.post('/api/upload', async (c) => {
  const formData = await c.req.formData()
  const file = formData.get('file') as File

  if (!file) {
    return c.json({ error: 'No file uploaded' }, 400)
  }

  const key = `uploads/${Date.now()}-${file.name}`
  await c.env.BUCKET.put(key, file)

  return c.json({ key, url: `/api/files/${key}` })
})

// ファイル取得
app.get('/api/files/*', async (c) => {
  const key = c.req.path.replace('/api/files/', '')
  const object = await c.env.BUCKET.get(key)

  if (!object) {
    return c.json({ error: 'File not found' }, 404)
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
    },
  })
})

export default app
```

## 認証とセキュリティ

### JWT認証

```bash
npm install hono jose
```

```typescript
// src/auth/jwt.ts
import { SignJWT, jwtVerify } from 'jose'

export async function createToken(
  payload: { userId: number; email: string },
  secret: string
): Promise<string> {
  const encoder = new TextEncoder()
  const secretKey = encoder.encode(secret)

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secretKey)
}

export async function verifyToken(
  token: string,
  secret: string
): Promise<{ userId: number; email: string } | null> {
  try {
    const encoder = new TextEncoder()
    const secretKey = encoder.encode(secret)

    const { payload } = await jwtVerify(token, secretKey)
    return payload as { userId: number; email: string }
  } catch {
    return null
  }
}
```

```typescript
// src/middleware/auth.ts
import { Context, Next } from 'hono'
import { verifyToken } from '../auth/jwt'

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = authHeader.substring(7)
  const payload = await verifyToken(token, c.env.JWT_SECRET)

  if (!payload) {
    return c.json({ error: 'Invalid token' }, 401)
  }

  c.set('userId', payload.userId)
  c.set('userEmail', payload.email)

  await next()
}

// 使用例
app.get('/api/protected', authMiddleware, async (c) => {
  const userId = c.get('userId')
  return c.json({ message: `Hello user ${userId}` })
})
```

### レート制限

```typescript
// src/middleware/rateLimit.ts
export async function rateLimitMiddleware(
  c: Context,
  next: Next,
  limit = 100, // 100リクエスト
  window = 60 // 60秒
) {
  const ip = c.req.header('CF-Connecting-IP') || 'unknown'
  const key = `ratelimit:${ip}`

  const current = await c.env.KV.get(key)
  const count = current ? parseInt(current) : 0

  if (count >= limit) {
    return c.json({ error: 'Rate limit exceeded' }, 429)
  }

  await c.env.KV.put(key, (count + 1).toString(), {
    expirationTtl: window,
  })

  await next()
}
```

## デプロイとモニタリング

### デプロイ

```bash
# 本番環境にデプロイ
wrangler deploy

# ステージング環境にデプロイ
wrangler deploy --env staging
```

### 環境変数とシークレット

```bash
# シークレットの設定
wrangler secret put JWT_SECRET
wrangler secret put DATABASE_URL

# 環境変数の確認
wrangler secret list
```

### ログとモニタリング

```typescript
// src/middleware/logging.ts
export async function loggingMiddleware(c: Context, next: Next) {
  const start = Date.now()

  await next()

  const duration = Date.now() - start
  console.log({
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration,
    ip: c.req.header('CF-Connecting-IP'),
    userAgent: c.req.header('User-Agent'),
  })
}

app.use('*', loggingMiddleware)
```

## パフォーマンス最適化

### キャッシュ戦略

```typescript
// Cache APIを使用
export async function handleWithCache(request: Request): Promise<Response> {
  const cache = caches.default

  // キャッシュから取得試行
  let response = await cache.match(request)

  if (response) {
    console.log('Cache hit')
    return response
  }

  // キャッシュミス → 生成
  console.log('Cache miss')
  response = new Response('Hello World', {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  })

  // キャッシュに保存
  c.executionCtx.waitUntil(cache.put(request, response.clone()))

  return response
}
```

### 並列処理

```typescript
// 複数のクエリを並列実行
export async function getDashboardData(env: Env): Promise<DashboardData> {
  const [users, posts, comments] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) as count FROM users').first(),
    env.DB.prepare('SELECT COUNT(*) as count FROM posts').first(),
    env.DB.prepare('SELECT COUNT(*) as count FROM comments').first(),
  ])

  return {
    usersCount: users.count,
    postsCount: posts.count,
    commentsCount: comments.count,
  }
}
```

## まとめ

Cloudflare Workersを使ったフルスタック開発では、以下のような利点があります。

- **グローバルエッジデプロイ**: 世界中のユーザーに低レイテンシで配信
- **コスト効率**: 無料枠が大きく、従量課金も安価
- **スケーラビリティ**: 自動スケールで無限に拡張可能
- **統合されたエコシステム**: D1、KV、R2、Durable Objectsを統合

従来のサーバーレスプラットフォームと比較して、コールドスタートがなく、レイテンシが低いため、ユーザー体験の向上とコスト削減を両立できます。エッジコンピューティングの恩恵を活かし、次世代のWebアプリケーションを構築しましょう。

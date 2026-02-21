---
title: 'Cloudflare Pages + D1 + KV 完全ガイド — 無料枠でフルスタックアプリを構築'
description: 'Cloudflare Pages, D1 (SQLite), KV Storageを組み合わせたフルスタックアプリの構築方法。Hono.js + TypeScript で本番運用まで。無料枠で月間100万リクエスト対応。'
pubDate: '2026-02-21'
heroImage: '../../assets/blog-placeholder-5.jpg'
tags: ['Cloudflare', 'Edge', 'Serverless', 'TypeScript', 'Database']
---

Cloudflare Pagesは静的サイトホスティングにとどまらず、D1（SQLiteデータベース）・KV Storage・Durable Objectsを組み合わせることで本格的なフルスタックアプリケーションを構築できるプラットフォームだ。しかも無料枠だけで月間100万リクエスト以上に対応できる。本記事ではHono.js + TypeScriptを用いて、実際にAPIサーバー・キャッシュ層・認証まで実装する方法を徹底的に解説する。

---

## 1. Cloudflare Pages の概要と無料枠

### Cloudflare Pagesとは何か

Cloudflare Pagesは静的ファイルホスティング＋サーバーサイド処理（Functions）を統合したプラットフォームだ。従来のJAMstackとは異なり、Cloudflareの世界330拠点以上のエッジネットワーク上でコードが実行されるため、グローバルなユーザーに対して均一な低レイテンシを提供できる。

重要なのは「Pages Functions」の存在だ。`functions/`ディレクトリにTypeScriptファイルを配置するだけで、そのファイルがEdge Functionとして動作する。Vercelのサーバーレスに相当するが、実行モデルはV8 Isolateベースのため、コールドスタートがほぼゼロという優位性がある。

### 無料枠の詳細と実際のコスト計算

| リソース | 無料枠 | 有料（$5/月〜） |
|---------|--------|----------------|
| リクエスト数 | 100,000件/日 | 1,000万件/月 + 超過分$0.50/100万件 |
| ビルド数 | 500件/月 | 5,000件/月 |
| 帯域幅 | 無制限 | 無制限 |
| サイト数 | 無制限 | 無制限 |
| カスタムドメイン | 無制限 | 無制限 |
| D1（後述） | 5GB / 500万行読み込み/日 | 25億クエリ/月 |
| KV Storage | 100,000操作/日 | 1,000万操作/月 |

**実際のコスト試算例**:

中規模のWebアプリケーション（MAU 1万人）を想定する。

- デイリーアクティブユーザー: 約500人
- 1ユーザーあたりページビュー: 10
- APIリクエスト: ページビューの3倍 = 15,000リクエスト/日
- D1クエリ: APIリクエストの2倍 = 30,000クエリ/日
- KV読み取り: キャッシュヒット込みで20,000操作/日

この規模であれば**無料枠で完全に収まる**。月次コスト$0だ。MAUが10万人規模になって初めて有料プランを検討する必要が出てくる。

### Vercel vs Cloudflare Pages の選択指針

| 判断軸 | Vercel有利 | Cloudflare Pages有利 |
|--------|-----------|---------------------|
| Next.js最適化 | App Router・ISR・Image Optimization | Vercelに軍配 |
| グローバル低レイテンシ | リージョン選択が必要 | エッジ全拠点で均一 |
| データベース | Neon・PlanetScale連携が豊富 | D1（SQLite）の制約あり |
| コスト（大規模） | 帯域課金あり | 帯域無制限 |
| リアルタイム機能 | 非対応 | Durable Objects対応 |
| 既存Node.jsアプリ移行 | そのまま動くケース多 | Node.js API制限に注意 |

---

## 2. D1 (SQLite) データベースの基本と制限

### D1の技術的背景

D1はCloudflareが提供するサーバーレスSQLiteデータベースだ。「SQLite?」と驚く人もいるかもしれないが、これはアーキテクチャ上の大きな優位性がある。SQLiteはファイルベースのため読み取り操作がきわめて高速で、特にリード負荷が高いアプリケーションで真価を発揮する。

Cloudflareはこれを「分散SQLite」として実装した。プライマリーリードではD1のプライマリーに問い合わせるが、読み取りクエリはエッジにキャッシュされた複製から応答されるため、地理的に分散したユーザーに対しても低レイテンシを維持できる。

### D1の制限事項

```
無料枠:
- ストレージ: 5GB（データベースあたり2GB）
- 行読み込み: 500万行/日
- 行書き込み: 10万行/日
- データベース数: 10個

有料（Workers Paid $5/月）:
- ストレージ: 25GB（データベースあたり2GB）
- 行読み込み: 250億行/月
- 行書き込み: 5,000万行/月
- データベース数: 50,000個
```

**重要な制限**:
- 1クエリの最大実行時間: 30秒
- バルクインポート: 最大100MBのSQLファイル
- トランザクション: 対応しているが1リクエスト内に限定
- `ALTER TABLE`の一部制限（SQLiteの制約を継承）
- 全文検索（FTS）は非対応（別途KVやVectorizeで補完する）

### SQLiteとPostgreSQLの主な違い

D1（SQLite）を採用する際に注意すべき差異を把握しておく。

```sql
-- PostgreSQLで使えるがD1で動かない例
-- 配列型
CREATE TABLE users (
  tags TEXT[] -- D1では使用不可
);

-- D1での代替（JSON文字列として格納）
CREATE TABLE users (
  tags TEXT DEFAULT '[]' -- JSON文字列で管理
);

-- RETURNING句（D1は対応）
INSERT INTO users (name, email) VALUES ('太郎', 'taro@example.com')
RETURNING id, name;

-- JSON関数（D1はSQLite 3.38+の関数をサポート）
SELECT json_extract(metadata, '$.role') as role FROM users;
```

---

## 3. KV Storage の特徴と使いどころ

### KVとは何か

Cloudflare KV（Key-Value Storage）はグローバルに分散したキーバリューストアだ。データを書き込むとCloudflareの全拠点に複製され、最終的には任意のエッジロケーションから低レイテンシで読み取れる。

ただし**結果整合性（Eventual Consistency）**のモデルを採用している。書き込み後、全拠点への同期は最大60秒かかる場合がある。このためKVは「よく読まれるが、あまり書き変わらないデータ」に適している。

### KVの主なユースケース

**1. APIレスポンスのキャッシュ**
外部APIの結果やDBの集計クエリ結果をKVにキャッシュし、D1への負荷を軽減する。

**2. セッション管理**
JWTトークンの有効/無効リスト（ブラックリスト方式）をKVで管理する。

**3. レート制限**
IPアドレスごとのリクエスト数をKVでカウントする。ただし厳密なレート制限にはDurable Objectsが適している。

**4. フィーチャーフラグ**
アプリケーション全体の機能フラグをKVで管理し、デプロイなしでON/OFFを切り替える。

**5. 静的コンテンツのメタデータ**
ブログ記事一覧・商品カタログなど、定期的に更新される静的データのキャッシュ。

### KVの制限

```
無料枠:
- 読み取り: 100,000回/日
- 書き込み: 1,000回/日
- 削除: 1,000回/日
- リスト操作: 1,000回/日
- ストレージ: 1GB
- 最大値サイズ: 25MB/キー

有料（Workers Paid）:
- 読み取り: 1,000万回/月（超過分$0.50/100万回）
- 書き込み: 100万回/月（超過分$5/100万回）
```

---

## 4. プロジェクトセットアップ — Wrangler CLI・TypeScript設定

### 必要なツールのインストール

```bash
# Wrangler CLIのインストール
npm install -g wrangler

# バージョン確認
wrangler --version
# Wrangler 3.x.x

# Cloudflareアカウントへのログイン
wrangler login
# ブラウザが開き、OAuthでログイン
```

### プロジェクト初期化

```bash
# Cloudflare Pagesプロジェクトを作成
# Hono.jsテンプレートを使用
npm create cloudflare@latest my-fullstack-app -- --template=hono

cd my-fullstack-app

# 依存パッケージのインストール
npm install
```

Hono.jsテンプレートを使わない場合は手動でセットアップする。

```bash
mkdir my-app && cd my-app
npm init -y

npm install hono
npm install -D wrangler typescript @cloudflare/workers-types
npm install drizzle-orm
npm install -D drizzle-kit
```

### `wrangler.toml` の設定

```toml
# wrangler.toml
name = "my-fullstack-app"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = "./dist"

# D1データベースのバインディング
[[d1_databases]]
binding = "DB"
database_name = "my-app-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # wrangler d1 create で取得

# KV Namespaceのバインディング
[[kv_namespaces]]
binding = "KV"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # wrangler kv namespace create で取得
preview_id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # ローカル開発用

# 環境変数（非シークレット）
[vars]
ENVIRONMENT = "production"
APP_NAME = "MyApp"

# ローカル開発環境用オーバーライド
[env.local]
[env.local.vars]
ENVIRONMENT = "development"
```

### `tsconfig.json` の設定

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noEmit": true,
    "allowSyntheticDefaultImports": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "functions/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Cloudflareリソースの作成

```bash
# D1データベースの作成
wrangler d1 create my-app-db
# 出力されるdatabase_idをwrangler.tomlに貼り付ける

# KV Namespaceの作成
wrangler kv namespace create "CACHE"
wrangler kv namespace create "CACHE" --preview
# 出力されるidとpreview_idをwrangler.tomlに貼り付ける
```

---

## 5. Hono.js でAPIルーティング実装

### Hono.jsとは

Hono.jsはEdge Computing向けに設計された超軽量Webフレームワークだ。Cloudflare Workers・Pages Functions・Deno・Bun・Node.jsすべてで動作する。Express.jsに近いAPIを持ちながら、バンドルサイズが小さくTypeScriptファーストで設計されている。

### 型定義の設定

```typescript
// src/types.ts
export type Env = {
  DB: D1Database;
  KV: KVNamespace;
  JWT_SECRET: string;
  ENVIRONMENT: string;
};

export type Variables = {
  userId: string;
  userEmail: string;
};
```

### メインアプリケーションの構築

```typescript
// src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { usersRouter } from './routes/users';
import { postsRouter } from './routes/posts';
import { authRouter } from './routes/auth';
import { authMiddleware } from './middleware/auth';
import type { Env, Variables } from './types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// グローバルミドルウェア
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: ['https://my-app.pages.dev', 'http://localhost:5173'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// ヘルスチェック
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  });
});

// 認証不要ルート
app.route('/api/auth', authRouter);

// 認証必要ルート（ミドルウェアを適用）
app.use('/api/*', authMiddleware);
app.route('/api/users', usersRouter);
app.route('/api/posts', postsRouter);

// 404ハンドラー
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// エラーハンドラー
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

export default app;
```

### ルーターの実装例

```typescript
// src/routes/posts.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, Variables } from '../types';
import { getPostsFromDB, createPostInDB } from '../services/posts';
import { getCachedPosts, setCachedPosts } from '../services/cache';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  published: z.boolean().default(false),
});

// 投稿一覧の取得（KVキャッシュ付き）
app.get('/', async (c) => {
  const page = Number(c.req.query('page') ?? '1');
  const limit = Number(c.req.query('limit') ?? '10');
  const cacheKey = `posts:page:${page}:limit:${limit}`;

  // KVキャッシュを確認
  const cached = await getCachedPosts(c.env.KV, cacheKey);
  if (cached) {
    return c.json(cached, 200, {
      'X-Cache': 'HIT',
    });
  }

  // DBから取得
  const posts = await getPostsFromDB(c.env.DB, page, limit);

  // KVにキャッシュ（60秒間）
  await setCachedPosts(c.env.KV, cacheKey, posts, 60);

  return c.json(posts, 200, {
    'X-Cache': 'MISS',
  });
});

// 投稿の作成
app.post('/', zValidator('json', createPostSchema), async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');

  const post = await createPostInDB(c.env.DB, {
    ...body,
    authorId: userId,
  });

  // キャッシュを無効化（新規投稿後）
  await invalidatePostsCache(c.env.KV);

  return c.json(post, 201);
});

// 投稿の詳細取得
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const cacheKey = `post:${id}`;

  const cached = await c.env.KV.get(cacheKey, 'json');
  if (cached) {
    return c.json(cached, 200, { 'X-Cache': 'HIT' });
  }

  const result = await c.env.DB.prepare(
    'SELECT p.*, u.name as author_name FROM posts p JOIN users u ON p.author_id = u.id WHERE p.id = ?'
  ).bind(id).first();

  if (!result) {
    return c.json({ error: 'Post not found' }, 404);
  }

  await c.env.KV.put(cacheKey, JSON.stringify(result), {
    expirationTtl: 300, // 5分
  });

  return c.json(result, 200, { 'X-Cache': 'MISS' });
});

async function invalidatePostsCache(kv: KVNamespace) {
  // リスト操作でpost:page:*のキーを全削除
  const keys = await kv.list({ prefix: 'posts:page:' });
  await Promise.all(keys.keys.map((key) => kv.delete(key.name)));
}

export { app as postsRouter };
```

---

## 6. D1でのCRUD操作 — Drizzle ORM連携

### スキーマ定義

```typescript
// src/db/schema.ts
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['user', 'admin'] }).default('user').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const posts = sqliteTable('posts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  content: text('content').notNull(),
  published: integer('published', { mode: 'boolean' }).default(false).notNull(),
  authorId: text('author_id').notNull().references(() => users.id),
  tags: text('tags').default('[]').notNull(), // JSON文字列
  viewCount: integer('view_count').default(0).notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const comments = sqliteTable('comments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  content: text('content').notNull(),
  authorId: text('author_id').notNull().references(() => users.id),
  postId: text('post_id').notNull().references(() => posts.id),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});
```

### Drizzle設定ファイル

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.DATABASE_ID!,
    token: process.env.CLOUDFLARE_API_TOKEN!,
  },
});
```

### マイグレーションの生成と適用

```bash
# マイグレーションSQLの生成
npx drizzle-kit generate

# ローカルD1にマイグレーション適用
wrangler d1 migrations apply my-app-db --local

# 本番D1にマイグレーション適用
wrangler d1 migrations apply my-app-db --remote
```

### DBクライアントのセットアップ

```typescript
// src/db/client.ts
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export function createDB(d1: D1Database) {
  return drizzle(d1, { schema, logger: process.env.ENVIRONMENT === 'development' });
}
```

### サービス層の実装

```typescript
// src/services/posts.ts
import { eq, desc, and, count } from 'drizzle-orm';
import { createDB } from '../db/client';
import { posts, users } from '../db/schema';

interface PostsResult {
  data: typeof posts.$inferSelect[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getPostsFromDB(
  d1: D1Database,
  page: number,
  limit: number
): Promise<PostsResult> {
  const db = createDB(d1);
  const offset = (page - 1) * limit;

  // 総件数を取得
  const [{ value: total }] = await db
    .select({ value: count() })
    .from(posts)
    .where(eq(posts.published, true));

  // ページネーション付きデータ取得
  const data = await db
    .select({
      id: posts.id,
      title: posts.title,
      content: posts.content,
      tags: posts.tags,
      viewCount: posts.viewCount,
      createdAt: posts.createdAt,
      authorName: users.name,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.published, true))
    .orderBy(desc(posts.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    data: data.map((post) => ({
      ...post,
      tags: JSON.parse(post.tags as string),
    })) as unknown as typeof posts.$inferSelect[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function createPostInDB(
  d1: D1Database,
  input: {
    title: string;
    content: string;
    published: boolean;
    authorId: string;
    tags?: string[];
  }
) {
  const db = createDB(d1);

  const [post] = await db
    .insert(posts)
    .values({
      title: input.title,
      content: input.content,
      published: input.published,
      authorId: input.authorId,
      tags: JSON.stringify(input.tags ?? []),
    })
    .returning();

  return post;
}

export async function updatePostInDB(
  d1: D1Database,
  id: string,
  userId: string,
  updates: Partial<{
    title: string;
    content: string;
    published: boolean;
    tags: string[];
  }>
) {
  const db = createDB(d1);

  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.content !== undefined) updateData.content = updates.content;
  if (updates.published !== undefined) updateData.published = updates.published;
  if (updates.tags !== undefined) updateData.tags = JSON.stringify(updates.tags);

  const [post] = await db
    .update(posts)
    .set(updateData)
    .where(and(eq(posts.id, id), eq(posts.authorId, userId)))
    .returning();

  if (!post) {
    throw new Error('Post not found or unauthorized');
  }

  return post;
}
```

---

## 7. KVでのキャッシュ実装

### キャッシュサービスの実装

```typescript
// src/services/cache.ts
interface CacheOptions {
  ttl?: number; // 秒単位
  metadata?: Record<string, string>;
}

export class KVCache {
  constructor(private kv: KVNamespace) {}

  async get<T>(key: string): Promise<T | null> {
    const result = await this.kv.get<T>(key, 'json');
    return result;
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const { ttl = 300, metadata } = options;
    await this.kv.put(key, JSON.stringify(value), {
      expirationTtl: ttl,
      metadata,
    });
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(key);
  }

  async invalidateByPrefix(prefix: string): Promise<void> {
    const listed = await this.kv.list({ prefix });
    if (listed.keys.length === 0) return;
    await Promise.all(listed.keys.map((key) => this.kv.delete(key.name)));
  }

  // キャッシュスタンピード防止付きのget-or-set
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await fetcher();
    await this.set(key, value, options);
    return value;
  }
}

// ページキャッシュユーティリティ
export async function getCachedPosts(
  kv: KVNamespace,
  cacheKey: string
): Promise<unknown | null> {
  return kv.get(cacheKey, 'json');
}

export async function setCachedPosts(
  kv: KVNamespace,
  cacheKey: string,
  data: unknown,
  ttlSeconds: number
): Promise<void> {
  await kv.put(cacheKey, JSON.stringify(data), {
    expirationTtl: ttlSeconds,
  });
}
```

### レート制限の実装

```typescript
// src/middleware/rateLimit.ts
import { createMiddleware } from 'hono/factory';
import type { Env } from '../types';

interface RateLimitOptions {
  limit: number;     // リクエスト数の上限
  windowSeconds: number; // 時間ウィンドウ（秒）
  keyPrefix?: string;
}

export function rateLimit(options: RateLimitOptions) {
  const { limit, windowSeconds, keyPrefix = 'ratelimit' } = options;

  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
    const key = `${keyPrefix}:${ip}`;

    // 現在のカウントを取得
    const current = await c.env.KV.get(key);
    const count = current ? parseInt(current, 10) : 0;

    if (count >= limit) {
      return c.json(
        {
          error: 'Too Many Requests',
          retryAfter: windowSeconds,
        },
        429,
        {
          'Retry-After': String(windowSeconds),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
        }
      );
    }

    // カウントをインクリメント
    if (count === 0) {
      // 初回リクエスト: TTL付きで新規作成
      await c.env.KV.put(key, '1', { expirationTtl: windowSeconds });
    } else {
      // 既存カウント: KVはアトミックなインクリメント非対応のため上書き
      // ※ 厳密なレート制限にはDurable Objectsを使うこと
      await c.env.KV.put(key, String(count + 1), {
        expirationTtl: windowSeconds,
      });
    }

    await next();

    c.res.headers.set('X-RateLimit-Limit', String(limit));
    c.res.headers.set('X-RateLimit-Remaining', String(limit - count - 1));
  });
}
```

---

## 8. 認証 — JWT実装

### JWTミドルウェアの実装

CloudflareのV8環境ではWeb Crypto APIが利用できる。これを使ってJWTを実装する。

```typescript
// src/lib/jwt.ts
const ALGORITHM = { name: 'HMAC', hash: 'SHA-256' };

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    ALGORITHM,
    false,
    ['sign', 'verify']
  );
}

function base64url(input: ArrayBuffer | string): string {
  const bytes =
    typeof input === 'string'
      ? new TextEncoder().encode(input)
      : new Uint8Array(input);
  return btoa(String.fromCharCode(...bytes))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function decodeBase64url(input: string): Uint8Array {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  return new Uint8Array([...binary].map((c) => c.charCodeAt(0)));
}

export interface JWTPayload {
  sub: string;   // ユーザーID
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export async function signJWT(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  secret: string,
  expiresInSeconds = 3600
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(fullPayload));
  const signingInput = `${header}.${body}`;

  const key = await getKey(secret);
  const signature = await crypto.subtle.sign(
    ALGORITHM,
    key,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${base64url(signature)}`;
}

export async function verifyJWT(
  token: string,
  secret: string
): Promise<JWTPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');

  const [header, body, signature] = parts;
  const signingInput = `${header}.${body}`;

  const key = await getKey(secret);
  const isValid = await crypto.subtle.verify(
    ALGORITHM,
    key,
    decodeBase64url(signature),
    new TextEncoder().encode(signingInput)
  );

  if (!isValid) throw new Error('Invalid signature');

  const payload: JWTPayload = JSON.parse(
    new TextDecoder().decode(decodeBase64url(body))
  );

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }

  return payload;
}
```

### 認証ミドルウェア

```typescript
// src/middleware/auth.ts
import { createMiddleware } from 'hono/factory';
import { verifyJWT } from '../lib/jwt';
import type { Env, Variables } from '../types';

export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: Variables;
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyJWT(token, c.env.JWT_SECRET);

    // リボーク確認（KVのブラックリストをチェック）
    const isRevoked = await c.env.KV.get(`revoked:${token.slice(-16)}`);
    if (isRevoked) {
      return c.json({ error: 'Token revoked' }, 401);
    }

    c.set('userId', payload.sub);
    c.set('userEmail', payload.email);

    await next();
  } catch (err) {
    return c.json({ error: 'Invalid token' }, 401);
  }
});
```

### 認証ルートの実装

```typescript
// src/routes/auth.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { signJWT } from '../lib/jwt';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

app.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');

  // ユーザーをDBから取得
  const user = await c.env.DB.prepare(
    'SELECT id, email, password_hash, role FROM users WHERE email = ?'
  )
    .bind(email)
    .first<{ id: string; email: string; password_hash: string; role: string }>();

  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  // パスワード検証（bcryptの代わりにWeb Crypto APIを使用）
  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const token = await signJWT(
    { sub: user.id, email: user.email, role: user.role },
    c.env.JWT_SECRET,
    86400 // 24時間
  );

  return c.json({ token, expiresIn: 86400 });
});

app.post('/logout', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'No token provided' }, 400);
  }

  const token = authHeader.slice(7);
  const tokenSuffix = token.slice(-16);

  // KVのブラックリストに追加（24時間後に自動削除）
  await c.env.KV.put(`revoked:${tokenSuffix}`, '1', {
    expirationTtl: 86400,
  });

  return c.json({ message: 'Logged out successfully' });
});

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // 本番ではより安全なハッシュアルゴリズムを使用すること
  // Cloudflare Workers環境ではbcryptは動作しないため、
  // argon2-cloudflare等のWASMベースのライブラリを検討する
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex === hash;
}

export { app as authRouter };
```

---

## 9. 環境変数・シークレット管理

### 非シークレット変数の管理

`wrangler.toml`の`[vars]`セクションで管理する。ただしここに書いた値はGitリポジトリに含まれるため、パスワードやトークンは**絶対に書かない**。

```toml
[vars]
ENVIRONMENT = "production"
APP_NAME = "MyApp"
API_VERSION = "v1"
```

### シークレットの登録

```bash
# シークレットをCloudflareダッシュボードに登録
wrangler secret put JWT_SECRET
# プロンプトが表示されるので値を入力（echo等でパイプするのは非推奨）

wrangler secret put DATABASE_ENCRYPTION_KEY

# 登録済みシークレットの確認
wrangler secret list
```

### ローカル開発でのシークレット管理

```bash
# .dev.vars ファイルを作成（.gitignoreに必ず追加する）
cat << 'EOF' > .dev.vars
JWT_SECRET=local-dev-secret-key-minimum-32-chars
DATABASE_ENCRYPTION_KEY=local-dev-encryption-key
EOF
```

`.gitignore`に追加する。

```gitignore
.dev.vars
.env
.env.local
*.secret
```

TypeScriptでの型安全なアクセス。

```typescript
// src/types.ts
export type Env = {
  // バインディング
  DB: D1Database;
  KV: KVNamespace;

  // vars（wrangler.toml）
  ENVIRONMENT: string;
  APP_NAME: string;

  // secrets（wrangler secret put）
  JWT_SECRET: string;
  DATABASE_ENCRYPTION_KEY: string;
};
```

---

## 10. ローカル開発環境 — wrangler dev

### ローカルD1のセットアップ

```bash
# ローカルD1にSQLを直接実行
wrangler d1 execute my-app-db --local --command="
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
"

# SQLファイルから実行
wrangler d1 execute my-app-db --local --file=./migrations/0001_initial.sql

# マイグレーションを一括適用
wrangler d1 migrations apply my-app-db --local
```

### 開発サーバーの起動

```bash
# Cloudflare Pagesのローカル開発
wrangler pages dev ./dist --port 8788 --local

# Honoアプリをビルドしながら開発する場合
npm run build:watch &
wrangler pages dev ./dist --port 8788

# または package.json にスクリプトを追加
{
  "scripts": {
    "dev": "wrangler pages dev ./dist --port 8788 --local",
    "build": "tsc && esbuild src/index.ts --bundle --outfile=dist/_worker.js --format=esm",
    "build:watch": "nodemon --watch src --ext ts --exec npm run build"
  }
}
```

### `package.json` の推奨設定

```json
{
  "scripts": {
    "dev": "wrangler pages dev --port 8788",
    "build": "npm run build:worker && npm run build:frontend",
    "build:worker": "esbuild src/index.ts --bundle --outfile=dist/_worker.js --format=esm --external:node:*",
    "build:frontend": "vite build --outDir dist",
    "deploy": "npm run build && wrangler pages deploy dist",
    "db:generate": "drizzle-kit generate",
    "db:migrate:local": "wrangler d1 migrations apply my-app-db --local",
    "db:migrate:remote": "wrangler d1 migrations apply my-app-db --remote",
    "db:studio": "drizzle-kit studio",
    "type-check": "tsc --noEmit"
  }
}
```

---

## 11. GitHub Actionsでの自動デプロイ

### ワークフローファイルの作成

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
      pull-requests: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Build
        run: npm run build
        env:
          NODE_ENV: production

      - name: Run database migrations (production)
        if: github.ref == 'refs/heads/main'
        run: npm run db:migrate:remote
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: my-fullstack-app
          directory: dist
          # PRの場合はプレビューURLを生成
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
          wranglerVersion: '3'
```

### GitHub Secretsの設定

Cloudflareダッシュボードで以下を取得してGitHub Secretsに登録する。

```
CLOUDFLARE_API_TOKEN: APIトークン（Edit Cloudflare Workers権限）
CLOUDFLARE_ACCOUNT_ID: アカウントID（Cloudflare右サイドバー）
```

### PRプレビューデプロイ

上記設定でPull Requestを作成すると、自動的にプレビューURLが生成される。`my-app-abc123.pages.dev`のような形式でデプロイされ、マージ前にステージング確認が可能だ。

---

## 12. パフォーマンス最適化 — Edge Network活用

### キャッシュヘッダーの設計

```typescript
// src/middleware/cache.ts
import { createMiddleware } from 'hono/factory';
import type { Env } from '../types';

interface CacheConfig {
  maxAge: number;          // ブラウザキャッシュ秒数
  sMaxAge?: number;        // CDNキャッシュ秒数
  staleWhileRevalidate?: number;
}

export function cacheControl(config: CacheConfig) {
  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
    await next();

    if (c.res.status === 200) {
      const { maxAge, sMaxAge, staleWhileRevalidate } = config;
      let value = `public, max-age=${maxAge}`;
      if (sMaxAge !== undefined) value += `, s-maxage=${sMaxAge}`;
      if (staleWhileRevalidate !== undefined) {
        value += `, stale-while-revalidate=${staleWhileRevalidate}`;
      }
      c.res.headers.set('Cache-Control', value);
    }
  });
}

// 使用例: 投稿一覧は1分間CDNキャッシュ
app.get('/api/posts', cacheControl({ maxAge: 0, sMaxAge: 60, staleWhileRevalidate: 300 }), async (c) => {
  // ...
});
```

### Cloudflare Cache APIの活用

```typescript
// src/lib/cfCache.ts
// Cloudflareのエッジキャッシュを直接操作する
export async function withCFCache(
  request: Request,
  handler: () => Promise<Response>,
  ttlSeconds = 60
): Promise<Response> {
  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: 'GET' });

  // キャッシュを確認
  const cached = await cache.match(cacheKey);
  if (cached) {
    const response = new Response(cached.body, cached);
    response.headers.set('X-CF-Cache', 'HIT');
    return response;
  }

  // ハンドラーを実行
  const response = await handler();

  // レスポンスをキャッシュに保存
  if (response.status === 200) {
    const responseToCache = new Response(response.clone().body, {
      status: response.status,
      headers: {
        ...Object.fromEntries(response.headers),
        'Cache-Control': `public, max-age=${ttlSeconds}`,
      },
    });
    // キャッシュへの書き込みはawaitせずに続行
    c.executionCtx.waitUntil(cache.put(cacheKey, responseToCache));
  }

  response.headers.set('X-CF-Cache', 'MISS');
  return response;
}
```

### D1クエリの最適化

```typescript
// 悪い例: N+1クエリ
const posts = await db.select().from(postsTable).all();
for (const post of posts) {
  const author = await db.select().from(users).where(eq(users.id, post.authorId)).get();
  // ...
}

// 良い例: JOINで一度に取得
const postsWithAuthors = await db
  .select({
    postId: postsTable.id,
    postTitle: postsTable.title,
    authorName: users.name,
    authorEmail: users.email,
  })
  .from(postsTable)
  .innerJoin(users, eq(postsTable.authorId, users.id))
  .where(eq(postsTable.published, true))
  .all();

// バルク操作: D1のbatch APIを活用
const statements = userIds.map((id) =>
  db.select().from(users).where(eq(users.id, id))
);
const results = await c.env.DB.batch(statements.map((s) => s.toSQL()));
```

---

## 13. 制限事項とアーキテクチャ判断基準

### Cloudflare Pagesが適しているケース

- グローバルユーザー向けのAPI（低レイテンシが必須）
- リード負荷が高くライト負荷が低いアプリケーション
- Webhookハンドラー（GitHub・Stripe・Slack等）
- 静的サイト + 動的API（SSG + Functions）
- 小〜中規模のCRUDアプリ
- 帯域コストを抑えたい大規模トラフィックサイト

### Cloudflare Pagesが不向きなケース

- **長時間バッチ処理**: CPU時間が30秒に制限（有料プランでも上限あり）
- **ファイルシステム操作**: `fs`モジュールが使えない。R2 Storageで代替
- **Node.js依存ライブラリ**: `nodejs_compat`フラグで多くは動くが、一部非対応
- **大規模トランザクション**: D1は複雑な多テーブルトランザクションが苦手
- **全文検索**: D1はFTSをサポートしない。Vectorize or 外部検索エンジン必要
- **WebSocket（ステートフル）**: KVやDurable Objectsが別途必要

### D1 vs PostgreSQL（Neon/Supabase）選択基準

| 判断軸 | D1を選ぶ | PostgreSQL系を選ぶ |
|--------|---------|-------------------|
| データ量 | 5GB以内 | 数十GB以上 |
| クエリの複雑さ | 単純なCRUD | 複雑なJOIN・集計 |
| 全文検索 | 不要 | 必要（pg_vector等） |
| 外部キー | シンプルな構造 | 複雑なリレーション |
| チームのSQLスキル | SQLite慣れ | PostgreSQL慣れ |
| レイテンシ | 最優先（エッジ実行） | 許容可能（リージョン） |

### 現実的なアーキテクチャ例

実際のプロダクションでは以下のようなハイブリッド構成が多い。

```
フロントエンド（静的）
        |
Cloudflare Pages（エッジ）
        |
   ┌────┴────┐
   |         |
D1 (KV)   外部API
（読取）   （書込）
            |
      PostgreSQL (Neon)
      （マスターDB）
```

軽量な読み取りはD1・KVで返し、書き込みや複雑なクエリは外部のPostgreSQLに委譲する構成だ。

---

## 14. Vercel vs Cloudflare 選択ガイド

最終的な判断のためのフローチャートを示す。

```
Next.js App Router を使いたい?
  ├─ Yes → Vercel（最適化されている）
  └─ No → 次へ

グローバルユーザーが主な対象?
  ├─ Yes → Cloudflare Pages（エッジが有利）
  └─ No → どちらでも可

無料枠でコストゼロを目指す?
  ├─ Yes → Cloudflare Pages（帯域無制限・寛大な無料枠）
  └─ No → 次へ

Node.js依存の既存コードがある?
  ├─ Yes → Vercel（移行コスト最小）
  └─ No → Cloudflare Pages検討

リアルタイム機能（WebSocket等）が必要?
  ├─ Yes → Cloudflare（Durable Objects）
  └─ No → どちらでも可
```

### コスト比較（実例）

月間リクエスト数1,000万のAPIサーバーを運用する場合の概算。

| サービス | 月額コスト（概算） |
|---------|-----------------|
| Cloudflare Workers Paid | $5（基本料）+ 超過分 = 約$5〜15 |
| Vercel Pro | $20（基本）+ 帯域超過分 |
| AWS Lambda + CloudFront | $5〜20（リクエスト数次第） |
| Fly.io | $5〜30（インスタンスサイズ次第） |

Cloudflareが最もコスト効率が高いケースが多いが、Vercel ProはNext.jsの開発体験・機能が優れているため、チームの技術スタックで判断するのが正解だ。

---

## まとめ

Cloudflare Pages + D1 + KVの組み合わせは、**低コストで高パフォーマンスなフルスタックアプリ**を構築したい場合に有力な選択肢だ。無料枠だけで月間100万リクエスト以上を処理でき、グローバルなエッジネットワークによる低レイテンシが標準で得られる。

本記事のポイントを振り返る。

- **無料枠**: 100,000リクエスト/日、D1 5GB・500万行読み込み/日、KV 100,000操作/日
- **Hono.js**: Edge Computing向けの超軽量フレームワーク。TypeScriptファーストで開発効率が高い
- **Drizzle ORM**: D1（SQLite）とシームレスに連携し、型安全なクエリを実現する
- **KVキャッシュ**: D1への負荷軽減・レート制限・セッション管理に活用
- **JWT認証**: Web Crypto APIを使ったCloudflare Workers専用の実装が必要
- **GitHub Actions**: プッシュのたびに自動デプロイ。PRプレビュー環境も自動生成
- **制限の把握**: D1はFTS非対応・5GB上限、KVは結果整合性。これを理解した上でアーキテクチャ設計する

まず無料枠で小さく始め、ユーザーが増えてから有料プランに移行するアプローチが最もリスクが低い。本記事のコードをベースに、Hono.js + D1 + KVのフルスタックアプリをぜひ試してみてほしい。

---

## 参考リソース

- [Cloudflare Pages公式ドキュメント](https://developers.cloudflare.com/pages/)
- [D1公式ドキュメント](https://developers.cloudflare.com/d1/)
- [KV Storage公式ドキュメント](https://developers.cloudflare.com/kv/)
- [Hono.js公式サイト](https://hono.dev/)
- [Drizzle ORM + D1連携ガイド](https://orm.drizzle.team/docs/get-started-sqlite#cloudflare-d1)
- [Wrangler CLIリファレンス](https://developers.cloudflare.com/workers/wrangler/commands/)

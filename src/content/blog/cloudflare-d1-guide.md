---
title: 'Cloudflare D1完全ガイド：エッジで動くSQLiteデータベース'
description: 'Cloudflare D1の使い方を徹底解説。Workers連携、Drizzle ORM統合、実践的な開発パターンまで完全網羅。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。初心者から実務レベルまで段階的に学べる内容です。'
pubDate: '2026-02-05'
tags: ['Cloudflare', 'D1', 'SQLite', 'Workers', 'Drizzle ORM']
---

Cloudflare D1は、Cloudflareのグローバルネットワーク上で動作するサーバーレスSQLiteデータベースです。このガイドでは、セットアップから実践的な開発まで徹底解説します。

## Cloudflare D1とは？

D1は、Cloudflareのエッジネットワーク上でSQLiteデータベースを実行できるサービスです。

### 主な特徴

- **エッジ配置**: グローバルに分散されたデータベース
- **低レイテンシ**: ユーザーに最も近いロケーションで実行
- **SQLite互換**: 標準的なSQLiteの構文をサポート
- **Workers統合**: Cloudflare Workersからシームレスにアクセス
- **無料枠**: 月間100,000リード、100,000ライト無料

### ユースケース

- **グローバルアプリ**: 低レイテンシが必要なアプリケーション
- **JAMstack**: 静的サイト + エッジAPI
- **IoT**: センサーデータの収集・集計
- **分析**: リアルタイムアクセス解析
- **キャッシュ**: 頻繁にアクセスするデータの保存

### 制限事項

- **データベースサイズ**: 最大500MB（有料プランで拡張可能）
- **クエリ実行時間**: 最大30秒
- **同時接続**: Workers経由のみ（直接接続不可）
- **トランザクション**: サポート済み（2026年現在）

## セットアップ

### 前提条件

```bash
# Node.js 16以上
node --version

# Wrangler CLI（Cloudflare Workers CLI）
npm install -g wrangler

# ログイン
wrangler login
```

### プロジェクト作成

```bash
# Workers プロジェクト作成
npm create cloudflare@latest my-d1-app
cd my-d1-app

# D1データベース作成
wrangler d1 create my-database
```

出力例：

```
✅ Successfully created DB 'my-database'

[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### wrangler.toml設定

```toml
name = "my-d1-app"
main = "src/index.ts"
compatibility_date = "2026-02-05"

# D1データベースのバインディング
[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# 環境設定
[env.production]
[[env.production.d1_databases]]
binding = "DB"
database_name = "my-database-prod"
database_id = "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
```

## データベース初期化

### マイグレーションファイル作成

```sql
-- migrations/0001_init.sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  published BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_published ON posts(published);
```

### マイグレーション実行

```bash
# ローカル環境
wrangler d1 execute my-database --local --file=./migrations/0001_init.sql

# 本番環境
wrangler d1 execute my-database --file=./migrations/0001_init.sql
```

### データの投入

```bash
# SQLファイルから
wrangler d1 execute my-database --local --file=./seed.sql

# コマンドラインから
wrangler d1 execute my-database --local --command="INSERT INTO users (email, name) VALUES ('user@example.com', 'Test User')"
```

## Workers での基本的な使い方

### TypeScript型定義

```typescript
// src/types.ts
export interface Env {
  DB: D1Database;
}

export interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

export interface Post {
  id: number;
  user_id: number;
  title: string;
  content: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
}
```

### 基本的なCRUD操作

```typescript
// src/index.ts
import { Env, User, Post } from './types';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // ルーティング
    if (path === '/users' && request.method === 'GET') {
      return getUsers(env);
    } else if (path === '/users' && request.method === 'POST') {
      return createUser(request, env);
    } else if (path.startsWith('/users/')) {
      const userId = path.split('/')[2];
      if (request.method === 'GET') {
        return getUser(userId, env);
      } else if (request.method === 'PUT') {
        return updateUser(userId, request, env);
      } else if (request.method === 'DELETE') {
        return deleteUser(userId, env);
      }
    }

    return new Response('Not Found', { status: 404 });
  },
};

// ユーザー一覧取得
async function getUsers(env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(
    'SELECT * FROM users ORDER BY created_at DESC LIMIT 100'
  ).all<User>();

  return Response.json(results);
}

// ユーザー作成
async function createUser(request: Request, env: Env): Promise<Response> {
  const { email, name } = await request.json<{ email: string; name: string }>();

  if (!email || !name) {
    return Response.json({ error: 'Email and name are required' }, { status: 400 });
  }

  try {
    const result = await env.DB.prepare(
      'INSERT INTO users (email, name) VALUES (?, ?) RETURNING *'
    )
      .bind(email, name)
      .first<User>();

    return Response.json(result, { status: 201 });
  } catch (error) {
    return Response.json({ error: 'Email already exists' }, { status: 409 });
  }
}

// ユーザー取得
async function getUser(userId: string, env: Env): Promise<Response> {
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first<User>();

  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  return Response.json(user);
}

// ユーザー更新
async function updateUser(
  userId: string,
  request: Request,
  env: Env
): Promise<Response> {
  const { name } = await request.json<{ name: string }>();

  if (!name) {
    return Response.json({ error: 'Name is required' }, { status: 400 });
  }

  const result = await env.DB.prepare(
    'UPDATE users SET name = ? WHERE id = ? RETURNING *'
  )
    .bind(name, userId)
    .first<User>();

  if (!result) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  return Response.json(result);
}

// ユーザー削除
async function deleteUser(userId: string, env: Env): Promise<Response> {
  const result = await env.DB.prepare('DELETE FROM users WHERE id = ?')
    .bind(userId)
    .run();

  if (result.meta.changes === 0) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  return Response.json({ success: true });
}
```

## 高度なクエリパターン

### バッチクエリ

```typescript
// 複数のクエリを一度に実行
async function getUserWithPosts(userId: string, env: Env) {
  const [user, posts] = await env.DB.batch([
    env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId),
    env.DB.prepare('SELECT * FROM posts WHERE user_id = ?').bind(userId),
  ]);

  return {
    user: user.results[0],
    posts: posts.results,
  };
}
```

### トランザクション

```typescript
// トランザクション（複数の操作を原子的に実行）
async function transferPost(
  postId: string,
  fromUserId: string,
  toUserId: string,
  env: Env
) {
  try {
    await env.DB.batch([
      env.DB.prepare('BEGIN TRANSACTION'),
      env.DB.prepare('UPDATE posts SET user_id = ? WHERE id = ? AND user_id = ?').bind(
        toUserId,
        postId,
        fromUserId
      ),
      env.DB.prepare('COMMIT'),
    ]);

    return { success: true };
  } catch (error) {
    await env.DB.prepare('ROLLBACK').run();
    throw error;
  }
}
```

### JOINクエリ

```typescript
// ユーザーと投稿をJOIN
async function getPostsWithAuthors(env: Env) {
  const { results } = await env.DB.prepare(`
    SELECT
      posts.*,
      users.name as author_name,
      users.email as author_email
    FROM posts
    JOIN users ON posts.user_id = users.id
    WHERE posts.published = 1
    ORDER BY posts.created_at DESC
    LIMIT 20
  `).all();

  return results;
}
```

### 集計クエリ

```typescript
// ユーザーごとの投稿数
async function getUserPostCounts(env: Env) {
  const { results } = await env.DB.prepare(`
    SELECT
      users.id,
      users.name,
      COUNT(posts.id) as post_count
    FROM users
    LEFT JOIN posts ON users.id = posts.user_id
    GROUP BY users.id, users.name
    ORDER BY post_count DESC
  `).all();

  return results;
}

// 日別の投稿数
async function getDailyPostCounts(env: Env) {
  const { results } = await env.DB.prepare(`
    SELECT
      DATE(created_at) as date,
      COUNT(*) as count
    FROM posts
    WHERE created_at >= DATE('now', '-30 days')
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `).all();

  return results;
}
```

### フルテキスト検索

```typescript
// FTS5を使った全文検索
async function setupFullTextSearch(env: Env) {
  await env.DB.prepare(`
    CREATE VIRTUAL TABLE posts_fts USING fts5(title, content, content='posts', content_rowid='id');
  `).run();

  await env.DB.prepare(`
    CREATE TRIGGER posts_fts_insert AFTER INSERT ON posts BEGIN
      INSERT INTO posts_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
    END;
  `).run();

  await env.DB.prepare(`
    CREATE TRIGGER posts_fts_update AFTER UPDATE ON posts BEGIN
      UPDATE posts_fts SET title = new.title, content = new.content WHERE rowid = new.id;
    END;
  `).run();

  await env.DB.prepare(`
    CREATE TRIGGER posts_fts_delete AFTER DELETE ON posts BEGIN
      DELETE FROM posts_fts WHERE rowid = old.id;
    END;
  `).run();
}

// 検索実行
async function searchPosts(query: string, env: Env) {
  const { results } = await env.DB.prepare(`
    SELECT posts.* FROM posts
    JOIN posts_fts ON posts.id = posts_fts.rowid
    WHERE posts_fts MATCH ?
    ORDER BY rank
  `)
    .bind(query)
    .all();

  return results;
}
```

## Drizzle ORMとの統合

### セットアップ

```bash
npm install drizzle-orm
npm install -D drizzle-kit
```

### スキーマ定義

```typescript
// src/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content'),
  published: integer('published', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
```

### Drizzleでのクエリ

```typescript
// src/db.ts
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, and, like } from 'drizzle-orm';
import { users, posts, User, NewUser, Post, NewPost } from './schema';
import { Env } from './types';

export function getDb(env: Env) {
  return drizzle(env.DB);
}

// ユーザー操作
export async function createUser(env: Env, data: NewUser): Promise<User> {
  const db = getDb(env);
  const [user] = await db.insert(users).values(data).returning();
  return user;
}

export async function getUserById(env: Env, id: number): Promise<User | undefined> {
  const db = getDb(env);
  return db.select().from(users).where(eq(users.id, id)).get();
}

export async function getAllUsers(env: Env): Promise<User[]> {
  const db = getDb(env);
  return db.select().from(users).orderBy(desc(users.createdAt)).all();
}

export async function updateUser(
  env: Env,
  id: number,
  data: Partial<NewUser>
): Promise<User | undefined> {
  const db = getDb(env);
  const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
  return updated;
}

export async function deleteUser(env: Env, id: number): Promise<void> {
  const db = getDb(env);
  await db.delete(users).where(eq(users.id, id));
}

// 投稿操作
export async function createPost(env: Env, data: NewPost): Promise<Post> {
  const db = getDb(env);
  const [post] = await db.insert(posts).values(data).returning();
  return post;
}

export async function getPostsByUser(env: Env, userId: number): Promise<Post[]> {
  const db = getDb(env);
  return db
    .select()
    .from(posts)
    .where(eq(posts.userId, userId))
    .orderBy(desc(posts.createdAt))
    .all();
}

export async function getPublishedPosts(env: Env): Promise<Post[]> {
  const db = getDb(env);
  return db
    .select()
    .from(posts)
    .where(eq(posts.published, true))
    .orderBy(desc(posts.createdAt))
    .all();
}

export async function searchPosts(env: Env, query: string): Promise<Post[]> {
  const db = getDb(env);
  return db
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.published, true),
        like(posts.title, `%${query}%`)
      )
    )
    .all();
}

// JOIN操作
export async function getPostsWithAuthors(env: Env) {
  const db = getDb(env);
  return db
    .select({
      post: posts,
      author: users,
    })
    .from(posts)
    .leftJoin(users, eq(posts.userId, users.id))
    .where(eq(posts.published, true))
    .all();
}
```

### Workerでの使用

```typescript
// src/index.ts
import { Env } from './types';
import * as db from './db';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // GET /users
      if (path === '/users' && request.method === 'GET') {
        const users = await db.getAllUsers(env);
        return Response.json(users);
      }

      // POST /users
      if (path === '/users' && request.method === 'POST') {
        const data = await request.json();
        const user = await db.createUser(env, data);
        return Response.json(user, { status: 201 });
      }

      // GET /posts
      if (path === '/posts' && request.method === 'GET') {
        const search = url.searchParams.get('search');
        const posts = search
          ? await db.searchPosts(env, search)
          : await db.getPublishedPosts(env);
        return Response.json(posts);
      }

      // GET /posts/with-authors
      if (path === '/posts/with-authors' && request.method === 'GET') {
        const posts = await db.getPostsWithAuthors(env);
        return Response.json(posts);
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error(error);
      return Response.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  },
};
```

## パフォーマンス最適化

### インデックスの活用

```sql
-- よく検索するカラムにインデックス
CREATE INDEX idx_posts_user_published ON posts(user_id, published);

-- 複合インデックス
CREATE INDEX idx_posts_search ON posts(published, created_at DESC);

-- ユニークインデックス
CREATE UNIQUE INDEX idx_users_email ON users(email);
```

### クエリの最適化

```typescript
// 悪い例: N+1クエリ
async function getPostsWithAuthorsBad(env: Env) {
  const posts = await env.DB.prepare('SELECT * FROM posts').all();

  for (const post of posts.results) {
    const author = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(post.user_id)
      .first();
    post.author = author;
  }

  return posts.results;
}

// 良い例: JOINを使う
async function getPostsWithAuthorsGood(env: Env) {
  const { results } = await env.DB.prepare(`
    SELECT
      posts.*,
      json_object('id', users.id, 'name', users.name, 'email', users.email) as author
    FROM posts
    JOIN users ON posts.user_id = users.id
  `).all();

  return results.map(row => ({
    ...row,
    author: JSON.parse(row.author),
  }));
}
```

### ページネーション

```typescript
// OFFSET/LIMIT方式
async function getPostsPaginated(env: Env, page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;

  const { results } = await env.DB.prepare(`
    SELECT * FROM posts
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `)
    .bind(pageSize, offset)
    .all();

  return results;
}

// カーソルベースページネーション（より効率的）
async function getPostsCursor(env: Env, cursor: number | null, pageSize: number) {
  const query = cursor
    ? 'SELECT * FROM posts WHERE id < ? ORDER BY id DESC LIMIT ?'
    : 'SELECT * FROM posts ORDER BY id DESC LIMIT ?';

  const params = cursor ? [cursor, pageSize] : [pageSize];

  const { results } = await env.DB.prepare(query).bind(...params).all();

  return {
    data: results,
    nextCursor: results.length > 0 ? results[results.length - 1].id : null,
  };
}
```

## デプロイと運用

### ローカル開発

```bash
# ローカルで実行（ローカルD1を使用）
wrangler dev --local

# リモートD1を使用
wrangler dev --remote
```

### デプロイ

```bash
# 本番デプロイ
wrangler deploy

# 環境指定
wrangler deploy --env production
```

### モニタリング

```typescript
// ログの追加
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const start = Date.now();

    try {
      const response = await handleRequest(request, env);

      const duration = Date.now() - start;
      console.log(`Request completed in ${duration}ms`);

      return response;
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  },
};
```

## まとめ

Cloudflare D1は、エッジコンピューティングの世界にSQLiteの力をもたらします。

### 主な利点

- **グローバル低レイテンシ**: ユーザーに近い場所でデータにアクセス
- **シンプル**: SQLiteの使いやすさとWorkersの統合
- **スケーラブル**: Cloudflareのグローバルネットワークで自動スケール
- **コスト効率**: 無料枠で小規模アプリは十分

### 適したユースケース

- JAMstackアプリケーション
- エッジAPI
- グローバルSaaS
- リアルタイム分析

D1を活用して、次世代のエッジアプリケーションを構築しましょう。

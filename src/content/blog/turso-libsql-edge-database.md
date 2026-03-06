---
title: 'Turso + LibSQL：エッジデータベース実践ガイド'
description: 'Turso + LibSQLによるエッジデータベースの完全ガイド。セットアップ、レプリケーション、Drizzle ORM連携の実践的な使い方。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。'
pubDate: 2025-02-05
tags: ['Turso', 'libSQL', 'Edge Database', 'SQLite', 'Drizzle ORM']
---
TursoはLibSQLを基盤とするエッジデータベースサービスで、グローバルに分散されたSQLiteデータベースを提供します。本記事では、Tursoの実践的な使い方について詳しく解説します。

## Turso + LibSQLとは

### LibSQLの特徴

LibSQLは、SQLiteのフォークとして開発されたデータベースエンジンです。

- **SQLite互換**: 既存のSQLite知識を活用可能
- **エッジ最適化**: 低レイテンシーのグローバルアクセス
- **レプリケーション**: マルチリージョンでのデータ同期
- **エンベデッド対応**: サーバーレス環境で直接実行可能

### Tursoの利点

```typescript
// ✅ グローバルに低レイテンシー
const client = createClient({
  url: 'libsql://your-db.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// ✅ エッジファンクションで直接クエリ
export default async function handler(req: Request) {
  const result = await client.execute('SELECT * FROM users WHERE id = ?', [1]);
  return new Response(JSON.stringify(result.rows));
}
```

## セットアップ

### Turso CLIのインストール

```bash
# macOS/Linux
curl -sSfL https://get.tur.so/install.sh | bash

# npm経由
npm install -g @turso/cli

# ログイン
turso auth login
```

### データベースの作成

```bash
# データベースを作成
turso db create my-database

# ロケーションを指定して作成
turso db create my-database --location nrt

# 利用可能なロケーションを確認
turso db locations

# データベース一覧
turso db list

# データベース情報を表示
turso db show my-database
```

### 認証トークンの取得

```bash
# データベースの接続URLを取得
turso db show my-database --url

# 認証トークンを生成
turso db tokens create my-database

# 環境変数に設定
export TURSO_DATABASE_URL="libsql://your-db.turso.io"
export TURSO_AUTH_TOKEN="your-auth-token"
```

## クライアントライブラリの使用

### @libsql/clientのインストール

```bash
npm install @libsql/client
```

### 基本的な接続

```typescript
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// シンプルなクエリ
const result = await client.execute('SELECT * FROM users');
console.log(result.rows);

// パラメータ付きクエリ
const user = await client.execute({
  sql: 'SELECT * FROM users WHERE id = ?',
  args: [1],
});

// 複数のクエリをバッチ実行
const results = await client.batch([
  'SELECT * FROM users',
  'SELECT * FROM posts',
  {
    sql: 'SELECT * FROM comments WHERE user_id = ?',
    args: [1],
  },
]);
```

### トランザクション

```typescript
// トランザクションを使用
const tx = await client.transaction('write');

try {
  await tx.execute({
    sql: 'INSERT INTO users (name, email) VALUES (?, ?)',
    args: ['John Doe', 'john@example.com'],
  });

  await tx.execute({
    sql: 'INSERT INTO profiles (user_id, bio) VALUES (last_insert_rowid(), ?)',
    args: ['Software Developer'],
  });

  await tx.commit();
} catch (error) {
  await tx.rollback();
  throw error;
}
```

## Drizzle ORMとの連携

### セットアップ

```bash
npm install drizzle-orm @libsql/client
npm install -D drizzle-kit
```

### スキーマ定義

```typescript
// db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  title: text('title').notNull(),
  content: text('content').notNull(),
  published: integer('published', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const comments = sqliteTable('comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id')
    .notNull()
    .references(() => posts.id),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});
```

### Drizzle設定

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './db/schema.ts',
  out: './drizzle',
  driver: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
} satisfies Config;
```

### データベース接続

```typescript
// db/index.ts
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export const db = drizzle(client, { schema });
```

### マイグレーション

```bash
# マイグレーションファイルを生成
npx drizzle-kit generate:sqlite

# マイグレーションを実行
npx drizzle-kit push:sqlite
```

### CRUD操作

```typescript
// db/queries.ts
import { db } from './index';
import { users, posts, comments } from './schema';
import { eq, and, desc } from 'drizzle-orm';

// ユーザーの作成
export async function createUser(name: string, email: string) {
  const [user] = await db
    .insert(users)
    .values({ name, email })
    .returning();
  return user;
}

// ユーザーの取得
export async function getUser(id: number) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });
  return user;
}

// ユーザーの更新
export async function updateUser(id: number, data: { name?: string; email?: string }) {
  const [updated] = await db
    .update(users)
    .set(data)
    .where(eq(users.id, id))
    .returning();
  return updated;
}

// ユーザーの削除
export async function deleteUser(id: number) {
  await db.delete(users).where(eq(users.id, id));
}

// リレーションを含むクエリ
export async function getUserWithPosts(userId: number) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      posts: {
        orderBy: [desc(posts.createdAt)],
      },
    },
  });
  return user;
}

// 複雑なクエリ
export async function getPublishedPostsWithComments() {
  const postsWithComments = await db.query.posts.findMany({
    where: eq(posts.published, true),
    with: {
      user: true,
      comments: {
        with: {
          user: true,
        },
        orderBy: [desc(comments.createdAt)],
      },
    },
    orderBy: [desc(posts.createdAt)],
  });
  return postsWithComments;
}
```

## レプリケーション

### マルチリージョン設定

```bash
# プライマリデータベースを作成（東京）
turso db create my-db --location nrt

# レプリカを追加（ニューヨーク）
turso db replicate my-db --location ord

# レプリカを追加（フランクフルト）
turso db replicate my-db --location fra

# レプリケーション状況を確認
turso db show my-db
```

### 読み取りレプリカの使用

```typescript
// プライマリとレプリカの設定
const primaryClient = createClient({
  url: process.env.TURSO_PRIMARY_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const replicaClient = createClient({
  url: process.env.TURSO_REPLICA_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// 書き込みはプライマリへ
export async function createPost(data: { userId: number; title: string; content: string }) {
  const [post] = await drizzle(primaryClient, { schema })
    .insert(posts)
    .values(data)
    .returning();
  return post;
}

// 読み取りはレプリカから
export async function getPosts() {
  const allPosts = await drizzle(replicaClient, { schema }).query.posts.findMany({
    orderBy: [desc(posts.createdAt)],
  });
  return allPosts;
}
```

### エッジ最適化

```typescript
// エッジファンクションでの使用例（Vercel Edge）
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '@/db/schema';

export const runtime = 'edge';

export async function GET(request: Request) {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const db = drizzle(client, { schema });

  const users = await db.query.users.findMany({
    limit: 10,
  });

  return Response.json(users);
}
```

## エンベデッドレプリカ

### ローカルレプリカの使用

```typescript
import { createClient } from '@libsql/client';

// エンベデッドレプリカを使用
const client = createClient({
  url: 'file:local.db',
  syncUrl: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// 定期的に同期
setInterval(async () => {
  await client.sync();
  console.log('Synced with remote database');
}, 60000); // 1分ごと
```

### オフライン対応

```typescript
// オフライン時はローカルDBを使用
const client = createClient({
  url: 'file:local.db',
  syncUrl: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
  syncInterval: 60, // 自動同期（秒）
});

// 手動同期
async function syncDatabase() {
  try {
    await client.sync();
    console.log('Database synced successfully');
  } catch (error) {
    console.error('Sync failed:', error);
    // オフライン時でもローカルデータを使用可能
  }
}
```

## 実践例

### Next.js App Routerでの使用

```typescript
// app/api/users/route.ts
import { db } from '@/db';
import { users } from '@/db/schema';
import { NextResponse } from 'next/server';

export async function GET() {
  const allUsers = await db.query.users.findMany();
  return NextResponse.json(allUsers);
}

export async function POST(request: Request) {
  const body = await request.json();
  const [user] = await db.insert(users).values(body).returning();
  return NextResponse.json(user, { status: 201 });
}
```

### Server Actionsでの使用

```typescript
// app/actions/users.ts
'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { revalidatePath } from 'next/cache';

export async function createUser(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;

  const [user] = await db
    .insert(users)
    .values({ name, email })
    .returning();

  revalidatePath('/users');
  return user;
}
```

### Cloudflare Workersでの使用

```typescript
// worker.ts
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const client = createClient({
      url: env.TURSO_DATABASE_URL,
      authToken: env.TURSO_AUTH_TOKEN,
    });

    const db = drizzle(client, { schema });

    const users = await db.query.users.findMany();

    return Response.json(users);
  },
};
```

## パフォーマンス最適化

### バッチクエリ

```typescript
// 複数のクエリをバッチ実行
const results = await client.batch([
  { sql: 'SELECT * FROM users WHERE id = ?', args: [1] },
  { sql: 'SELECT * FROM posts WHERE user_id = ?', args: [1] },
  { sql: 'SELECT * FROM comments WHERE user_id = ?', args: [1] },
]);

const [userResult, postsResult, commentsResult] = results;
```

### プリペアドステートメント

```typescript
// プリペアドステートメントでパフォーマンス向上
const stmt = await client.prepare('SELECT * FROM users WHERE id = ?');

const user1 = await stmt.execute([1]);
const user2 = await stmt.execute([2]);
const user3 = await stmt.execute([3]);
```

### インデックスの活用

```sql
-- インデックスを作成
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_users_email ON users(email);
```

## まとめ

Turso + LibSQLは、エッジコンピューティング時代のデータベースソリューションです。

- **グローバル分散**: 世界中で低レイテンシーアクセス
- **SQLite互換**: 既存の知識とツールを活用可能
- **エッジ最適化**: サーバーレス環境に最適
- **Drizzle ORM**: 型安全なクエリビルダー
- **レプリケーション**: マルチリージョンでのデータ同期

エッジファンクションとの組み合わせにより、高速でスケーラブルなアプリケーションを構築できます。

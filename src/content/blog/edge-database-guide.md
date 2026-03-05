---
title: 'エッジデータベース完全比較ガイド - Turso、Neon、PlanetScale、D1、Upstashを徹底検証'
description: 'エッジコンピューティング時代のデータベース選定ガイド。Turso、Neon、PlanetScale、Cloudflare D1、Upstash Redisを機能・パフォーマンス・価格で徹底比較。'
pubDate: 'Feb 05 2026'
tags: ['データベース', 'Edge', 'Turso', 'インフラ']
---

# エッジデータベース完全比較ガイド

エッジコンピューティングの普及により、グローバルに分散されたデータベースの重要性が高まっています。この記事では、主要なエッジデータベースサービスを徹底的に比較し、プロジェクトに最適な選択をサポートします。

## エッジデータベースとは

### 従来のデータベースとの違い

```
従来のデータベース:
User (東京) → Application Server (東京) → Database (米国)
レイテンシ: 200-300ms

エッジデータベース:
User (東京) → Edge Server (東京) → Edge DB (東京)
レイテンシ: 10-30ms
```

### エッジDBの特徴

- **低レイテンシ** - ユーザーに近い場所にデータを配置
- **グローバル分散** - 世界中にレプリカを配置
- **自動スケーリング** - トラフィックに応じた自動拡張
- **従量課金** - 使った分だけの支払い

## Turso（SQLite）

### 概要

TursoはlibSQLベースの分散SQLiteデータベースです。エッジでSQLiteを実行できる唯一のソリューションです。

### 主な特徴

```typescript
// Turso クライアント
import { createClient } from '@libsql/client';

const client = createClient({
  url: 'libsql://your-database.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// シンプルなクエリ
const result = await client.execute('SELECT * FROM users WHERE id = ?', [userId]);

// トランザクション
const batch = await client.batch([
  { sql: 'INSERT INTO users (name, email) VALUES (?, ?)', args: ['Alice', 'alice@example.com'] },
  { sql: 'INSERT INTO profiles (user_id, bio) VALUES (?, ?)', args: [1, 'Hello'] },
]);

// Prepared Statement（パフォーマンス向上）
const stmt = await client.prepare('SELECT * FROM users WHERE email = ?');
const users = await stmt.execute(['user@example.com']);
```

### Drizzle ORMとの統合

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
});
```

```typescript
// src/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`),
});

export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id),
  published: integer('published', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`),
});
```

```typescript
// src/db/client.ts
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export const db = drizzle(client, { schema });
```

### 使用例

```typescript
// src/repositories/user.ts
import { db } from '../db/client';
import { users, posts } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function createUser(name: string, email: string) {
  const [user] = await db.insert(users).values({ name, email }).returning();
  return user;
}

export async function getUserWithPosts(userId: number) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      posts: {
        where: eq(posts.published, true),
        orderBy: desc(posts.createdAt),
      },
    },
  });
  return user;
}

export async function updateUser(userId: number, data: { name?: string; email?: string }) {
  const [updated] = await db
    .update(users)
    .set(data)
    .where(eq(users.id, userId))
    .returning();
  return updated;
}
```

### 価格

```
無料プラン:
- 3データベース
- 9GB ストレージ
- 月間500Mリード/書き込み

Pro ($29/月):
- 無制限データベース
- 無制限ストレージ
- 月間25Bリード/書き込み
```

### メリット・デメリット

**メリット:**
- SQLiteの高速性とシンプルさ
- エッジでの実行
- 低コスト
- リレーショナルクエリ対応

**デメリット:**
- 複雑な集約クエリは苦手
- 大規模データには不向き

## Neon（PostgreSQL）

### 概要

NeonはサーバーレスPostgreSQLです。分岐、瞬時のスケーリング、低コストが特徴です。

### セットアップ

```typescript
// @neondatabase/serverless
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// シンプルなクエリ
const users = await sql`SELECT * FROM users WHERE id = ${userId}`;

// パラメータ化クエリ
const posts = await sql`
  SELECT p.*, u.name as author_name
  FROM posts p
  JOIN users u ON p.author_id = u.id
  WHERE p.published = true
  ORDER BY p.created_at DESC
  LIMIT ${limit}
`;

// トランザクション
await sql.transaction([
  sql`INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com')`,
  sql`INSERT INTO audit_log (action, details) VALUES ('user_created', 'Alice')`,
]);
```

### Drizzle ORM統合

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
});
```

```typescript
// src/db/schema.ts
import { pgTable, serial, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id),
  published: boolean('published').default(false),
  viewCount: integer('view_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

```typescript
// src/db/client.ts
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

### ブランチング機能

```bash
# Neon CLIでブランチ作成
neon branches create --name feature/new-schema

# 開発用ブランチのURL取得
neon connection-string feature/new-schema

# ブランチ削除
neon branches delete feature/new-schema
```

```typescript
// 環境ごとに異なるブランチを使用
const getDatabaseUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEON_MAIN_URL;
  }
  if (process.env.BRANCH_NAME) {
    return process.env[`NEON_BRANCH_${process.env.BRANCH_NAME}_URL`];
  }
  return process.env.NEON_DEV_URL;
};

const sql = neon(getDatabaseUrl()!);
```

### 価格

```
無料プラン:
- 0.5GB ストレージ
- 無制限コンピュート時間

Launch ($19/月):
- 10GB ストレージ
- 300時間コンピュート

Scale ($69/月):
- 50GB ストレージ
- 750時間コンピュート
```

### メリット・デメリット

**メリット:**
- フルPostgreSQL互換
- ブランチング機能
- 瞬時のスケーリング
- 優れたDX

**デメリット:**
- Tursoより高価
- コールドスタートあり

## PlanetScale（MySQL）

### 概要

PlanetScaleはサーバーレスMySQLです。Vitessベースで、水平スケーリングが容易です。

### セットアップ

```typescript
// @planetscale/database
import { connect } from '@planetscale/database';

const config = {
  url: process.env.DATABASE_URL,
};

const conn = connect(config);

// クエリ実行
const results = await conn.execute('SELECT * FROM users WHERE id = ?', [userId]);

// トランザクション
await conn.transaction(async (tx) => {
  await tx.execute('INSERT INTO users (name, email) VALUES (?, ?)', ['Bob', 'bob@example.com']);
  await tx.execute('INSERT INTO audit_log (action) VALUES (?)', ['user_created']);
});
```

### Prisma統合

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url = env("DATABASE_URL")
  relationMode = "prisma" // PlanetScale用
}

model User {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String   @db.Text
  published Boolean  @default(false)
  authorId  Int
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([authorId])
  @@index([published])
}
```

```typescript
// src/db/client.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

### ブランチング

```bash
# PlanetScale CLIでブランチ作成
pscale branch create my-database feature-branch

# ローカルでブランチに接続
pscale connect my-database feature-branch --port 3309

# デプロイリクエスト作成
pscale deploy-request create my-database feature-branch

# マージ
pscale deploy-request deploy my-database 1
```

### 価格

```
無料プラン:
- 1データベース
- 5GB ストレージ
- 10億行読み込み/月

Scaler ($29/月):
- 無制限データベース
- 10GB ストレージ
- 100億行読み込み/月
```

### メリット・デメリット

**メリット:**
- MySQL互換
- 優れたスケーラビリティ
- 無制限接続
- ブランチング機能

**デメリット:**
- 外部キー制約なし（アプリ側で管理）
- PostgreSQL機能が使えない

## Cloudflare D1（SQLite）

### 概要

Cloudflare D1はCloudflare Workers上で動作するSQLiteデータベースです。

### セットアップ

```typescript
// wrangler.toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "production-db"
database_id = "xxxx-xxxx-xxxx"
```

```typescript
// src/index.ts
export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // クエリ実行
    const { results } = await env.DB.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).bind(userId).all();

    // バッチ実行
    const batch = [
      env.DB.prepare('INSERT INTO users (name) VALUES (?)').bind('Alice'),
      env.DB.prepare('INSERT INTO users (name) VALUES (?)').bind('Bob'),
    ];
    await env.DB.batch(batch);

    return Response.json({ users: results });
  },
};
```

### Drizzle ORM統合

```typescript
// src/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
});
```

```typescript
// src/index.ts
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './db/schema';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const db = drizzle(env.DB, { schema });

    const users = await db.select().from(schema.users);

    return Response.json({ users });
  },
};
```

### 価格

```
無料プラン:
- 無制限データベース
- 500MB ストレージ
- 月間500万読み取り
- 月間10万書き込み

Paid:
- $0.75/GB ストレージ
- $0.001/百万読み取り
- $1.00/百万書き込み
```

### メリット・デメリット

**メリット:**
- Cloudflare Workersと完全統合
- 無料枠が大きい
- グローバルレプリケーション

**デメリット:**
- Workers専用（他で使えない）
- 機能がまだ限定的

## Upstash Redis

### 概要

Upstash Redisはサーバーレス対応のRedisです。キャッシュやセッション管理に最適です。

### セットアップ

```typescript
// @upstash/redis
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 基本操作
await redis.set('user:1', { name: 'Alice', email: 'alice@example.com' });
const user = await redis.get('user:1');

// TTL設定
await redis.set('session:abc123', { userId: 1 }, { ex: 3600 }); // 1時間

// リスト操作
await redis.lpush('notifications:1', 'New message');
const notifications = await redis.lrange('notifications:1', 0, 9);

// セット操作
await redis.sadd('tags:post:1', 'javascript', 'typescript', 'react');
const tags = await redis.smembers('tags:post:1');

// ソートセット（ランキング）
await redis.zadd('leaderboard', { score: 100, member: 'user:1' });
await redis.zadd('leaderboard', { score: 85, member: 'user:2' });
const topUsers = await redis.zrange('leaderboard', 0, 9, { rev: true });
```

### キャッシュパターン

```typescript
// キャッシュアサイドパターン
async function getUser(id: string) {
  // キャッシュを確認
  const cached = await redis.get(`user:${id}`);
  if (cached) {
    return cached as User;
  }

  // DBから取得
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (user) {
    // キャッシュに保存（1時間）
    await redis.set(`user:${id}`, user, { ex: 3600 });
  }

  return user;
}

// キャッシュ無効化
async function updateUser(id: string, data: Partial<User>) {
  const updated = await db
    .update(users)
    .set(data)
    .where(eq(users.id, id))
    .returning();

  // キャッシュ削除
  await redis.del(`user:${id}`);

  return updated[0];
}
```

### レート制限

```typescript
// スライディングウィンドウレート制限
async function checkRateLimit(userId: string, limit = 10, window = 60) {
  const key = `ratelimit:${userId}`;
  const now = Date.now();
  const windowStart = now - window * 1000;

  // 古いエントリを削除
  await redis.zremrangebyscore(key, 0, windowStart);

  // 現在のカウント取得
  const count = await redis.zcard(key);

  if (count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  // 新しいリクエストを追加
  await redis.zadd(key, { score: now, member: `${now}` });
  await redis.expire(key, window);

  return { allowed: true, remaining: limit - count - 1 };
}
```

### 価格

```
無料プラン:
- 10,000コマンド/日
- 256MB ストレージ

Pay as you go:
- $0.2/100,000コマンド
- $0.25/GB ストレージ
```

### メリット・デメリット

**メリット:**
- 高速（インメモリ）
- RESTful API
- エッジでの実行
- 柔軟なデータ構造

**デメリット:**
- リレーショナルクエリ不可
- プライマリDBには不向き

## 比較表

```
機能              Turso   Neon    PlanetScale  D1      Upstash
------------------------------------------------------------
DB種類            SQLite  Postgres MySQL       SQLite  Redis
エッジ実行         ◎       ○       ○           ◎       ◎
スケーラビリティ    ○       ◎       ◎           ○       ◎
無料プラン         ◎       ○       ○           ◎       ○
ブランチング       ×       ◎       ◎           ×       ×
フルテキスト検索    △       ◎       ○           △       △
複雑なクエリ       △       ◎       ◎           △       ×
コールドスタート    なし     あり     あり         なし     なし
料金              $       $$      $$          $       $
```

## 選択ガイド

### Turso を選ぶべき場合

- エッジでの低レイテンシが重要
- シンプルなスキーマ
- コスト重視
- SQLiteの軽量性を活かしたい

### Neon を選ぶべき場合

- PostgreSQL機能が必要
- 複雑なクエリを実行
- ブランチングワークフロー
- JSONBやフルテキスト検索を使用

### PlanetScale を選ぶべき場合

- MySQL互換が必要
- 大規模スケーリング
- 水平分割が必要
- ブランチングワークフロー

### D1 を選ぶべき場合

- Cloudflare Workers使用
- グローバル分散が重要
- コスト最小化
- シンプルなユースケース

### Upstash Redis を選ぶべき場合

- キャッシング
- セッション管理
- リアルタイムランキング
- レート制限

## まとめ

エッジデータベースは、グローバルアプリケーションに不可欠です。

### 推奨構成

**小規模アプリ:**
- Turso（メインDB） + Upstash（キャッシュ）

**中規模アプリ:**
- Neon（メインDB） + Upstash（キャッシュ）

**大規模アプリ:**
- PlanetScale（メインDB） + Upstash（キャッシュ）

**Cloudflareエコシステム:**
- D1（メインDB） + Upstash（キャッシュ）

プロジェクトの要件に応じて最適なエッジデータベースを選択しましょう。

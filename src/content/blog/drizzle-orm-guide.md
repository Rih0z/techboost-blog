---
title: 'Drizzle ORM完全ガイド - TypeScript-First ORM for SQL'
description: 'Drizzle ORMの完全ガイド。セットアップ、スキーマ定義、クエリビルダー、マイグレーション、Prismaとの比較まで、モダンなデータベース開発を徹底解説'
pubDate: 'Feb 05 2026'
---

# Drizzle ORM完全ガイド

Drizzle ORMは、TypeScript-FirstなSQLデータベースORMです。軽量で高速、そして型安全性に優れており、Prismaの代替として注目を集めています。

本ガイドでは、Drizzle ORMの基本から実践的な使い方、Prismaとの比較まで詳しく解説します。

## Drizzle ORMとは

Drizzle ORMは以下の特徴を持つTypeScript ORMです。

### 主な特徴

1. **TypeScript-First** - 完全な型推論
2. **軽量・高速** - ゼロ依存関係
3. **SQLライク** - SQLに近い直感的なAPI
4. **エッジランタイム対応** - Cloudflare Workers、Vercel Edge対応
5. **マイグレーション** - 自動生成とバージョン管理

### なぜDrizzle ORMなのか

```typescript
// Prisma（従来）
const users = await prisma.user.findMany({
  where: { active: true },
  include: { posts: true }
})

// Drizzle ORM
const users = await db.select().from(usersTable).where(eq(usersTable.active, true))
const posts = await db.select().from(postsTable).where(inArray(postsTable.userId, users.map(u => u.id)))

// 利点:
// - SQLに近い表現
// - 完全な型推論
// - バンドルサイズが小さい
// - エッジランタイムで動作
```

## セットアップ

### 基本的なインストール

```bash
# Drizzle ORM
npm install drizzle-orm

# ドライバー（使用するDBに応じて）
npm install postgres          # PostgreSQL
npm install @libsql/client    # Turso/LibSQL
npm install mysql2            # MySQL
npm install better-sqlite3    # SQLite

# 開発ツール
npm install -D drizzle-kit
```

### プロジェクト構造

```
src/
├── db/
│   ├── schema.ts        # スキーマ定義
│   ├── index.ts         # DB接続
│   └── migrations/      # マイグレーションファイル
├── queries/
│   ├── users.ts         # ユーザー関連クエリ
│   └── posts.ts         # 投稿関連クエリ
└── server.ts
```

### 設定ファイル

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config
```

## スキーマ定義

### 基本的なテーブル定義

```typescript
// src/db/schema.ts
import { pgTable, serial, text, varchar, timestamp, boolean, integer } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  bio: text('bio'),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  published: boolean('published').default(false),
  authorId: integer('author_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  postId: integer('post_id').notNull().references(() => posts.id),
  authorId: integer('author_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
})
```

### リレーション定義

```typescript
import { relations } from 'drizzle-orm'

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
}))

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  comments: many(comments),
}))

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
}))
```

### 複雑なスキーマ例

```typescript
import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  json,
  index,
  unique,
  pgEnum,
} from 'drizzle-orm/pg-core'

// Enum定義
export const roleEnum = pgEnum('role', ['admin', 'user', 'guest'])
export const statusEnum = pgEnum('status', ['draft', 'published', 'archived'])

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  role: roleEnum('role').default('user').notNull(),
  profile: json('profile').$type<{
    avatar?: string
    bio?: string
    social?: {
      twitter?: string
      github?: string
    }
  }>(),
  emailVerified: boolean('email_verified').default(false),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
  roleIdx: index('role_idx').on(table.role),
}))

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  excerpt: text('excerpt'),
  status: statusEnum('status').default('draft').notNull(),
  authorId: integer('author_id').notNull().references(() => users.id, {
    onDelete: 'cascade'
  }),
  viewCount: integer('view_count').default(0).notNull(),
  metadata: json('metadata').$type<{
    tags?: string[]
    category?: string
    readingTime?: number
  }>(),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  slugIdx: index('slug_idx').on(table.slug),
  authorIdx: index('author_idx').on(table.authorId),
  statusIdx: index('status_idx').on(table.status),
  publishedAtIdx: index('published_at_idx').on(table.publishedAt),
}))
```

## データベース接続

### PostgreSQL

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL!

export const client = postgres(connectionString)
export const db = drizzle(client, { schema })

// 型推論されたDB型をエクスポート
export type DB = typeof db
```

### Turso/LibSQL（エッジ対応）

```typescript
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from './schema'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

export const db = drizzle(client, { schema })
```

### SQLite

```typescript
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema'

const sqlite = new Database('sqlite.db')
export const db = drizzle(sqlite, { schema })
```

## クエリビルダー

### 基本的なクエリ

```typescript
import { db } from './db'
import { users, posts } from './db/schema'
import { eq, and, or, like, gt, lt, inArray, isNull, desc, asc } from 'drizzle-orm'

// SELECT - 全件取得
const allUsers = await db.select().from(users)

// SELECT - 特定のカラムのみ
const userNames = await db
  .select({
    id: users.id,
    name: users.name,
  })
  .from(users)

// WHERE - 条件指定
const activeUsers = await db
  .select()
  .from(users)
  .where(eq(users.active, true))

// WHERE - 複数条件（AND）
const adminUsers = await db
  .select()
  .from(users)
  .where(
    and(
      eq(users.role, 'admin'),
      eq(users.active, true)
    )
  )

// WHERE - 複数条件（OR）
const searchUsers = await db
  .select()
  .from(users)
  .where(
    or(
      like(users.name, '%john%'),
      like(users.email, '%john%')
    )
  )

// IN演算子
const specificUsers = await db
  .select()
  .from(users)
  .where(inArray(users.id, [1, 2, 3]))

// ORDER BY
const sortedUsers = await db
  .select()
  .from(users)
  .orderBy(desc(users.createdAt))

// LIMIT & OFFSET
const paginatedUsers = await db
  .select()
  .from(users)
  .limit(10)
  .offset(20)

// 1件取得
const user = await db
  .select()
  .from(users)
  .where(eq(users.id, 1))
  .limit(1)
  .then(rows => rows[0])
```

### INSERT

```typescript
// 1件挿入
const newUser = await db
  .insert(users)
  .values({
    name: 'John Doe',
    email: 'john@example.com',
    password: 'hashed_password',
  })
  .returning()

// 複数件挿入
const newUsers = await db
  .insert(users)
  .values([
    { name: 'User 1', email: 'user1@example.com', password: 'pass1' },
    { name: 'User 2', email: 'user2@example.com', password: 'pass2' },
  ])
  .returning()

// 競合時の処理（upsert）
const upsertedUser = await db
  .insert(users)
  .values({
    email: 'john@example.com',
    name: 'John Updated',
    password: 'new_password',
  })
  .onConflictDoUpdate({
    target: users.email,
    set: {
      name: 'John Updated',
      updatedAt: new Date(),
    },
  })
  .returning()
```

### UPDATE

```typescript
// 更新
const updatedUser = await db
  .update(users)
  .set({
    name: 'Jane Doe',
    updatedAt: new Date(),
  })
  .where(eq(users.id, 1))
  .returning()

// 条件付き更新
const activatedUsers = await db
  .update(users)
  .set({ active: true })
  .where(eq(users.emailVerified, true))
  .returning()
```

### DELETE

```typescript
// 削除
const deletedUser = await db
  .delete(users)
  .where(eq(users.id, 1))
  .returning()

// 条件付き削除
const deletedInactiveUsers = await db
  .delete(users)
  .where(
    and(
      eq(users.active, false),
      lt(users.lastLoginAt, new Date('2025-01-01'))
    )
  )
  .returning()
```

### JOIN

```typescript
// INNER JOIN
const postsWithAuthors = await db
  .select({
    postId: posts.id,
    postTitle: posts.title,
    authorName: users.name,
    authorEmail: users.email,
  })
  .from(posts)
  .innerJoin(users, eq(posts.authorId, users.id))

// LEFT JOIN
const allPostsWithAuthors = await db
  .select({
    postId: posts.id,
    postTitle: posts.title,
    authorName: users.name,
  })
  .from(posts)
  .leftJoin(users, eq(posts.authorId, users.id))

// 複数JOIN
const postsWithDetails = await db
  .select({
    post: posts,
    author: users,
    commentCount: sql<number>`count(${comments.id})`,
  })
  .from(posts)
  .leftJoin(users, eq(posts.authorId, users.id))
  .leftJoin(comments, eq(comments.postId, posts.id))
  .groupBy(posts.id, users.id)
```

### リレーショナルクエリ

```typescript
// Drizzleのリレーショナルクエリ（便利！）
const usersWithPosts = await db.query.users.findMany({
  with: {
    posts: true,
  },
})

// ネストしたリレーション
const usersWithPostsAndComments = await db.query.users.findMany({
  with: {
    posts: {
      with: {
        comments: {
          with: {
            author: true,
          },
        },
      },
    },
  },
})

// 条件付きリレーション
const activeUsersWithPublishedPosts = await db.query.users.findMany({
  where: eq(users.active, true),
  with: {
    posts: {
      where: eq(posts.published, true),
      orderBy: desc(posts.createdAt),
      limit: 5,
    },
  },
})

// 特定のフィールドのみ取得
const userWithPostTitles = await db.query.users.findFirst({
  where: eq(users.id, 1),
  columns: {
    id: true,
    name: true,
  },
  with: {
    posts: {
      columns: {
        id: true,
        title: true,
      },
    },
  },
})
```

## トランザクション

```typescript
// 基本的なトランザクション
await db.transaction(async (tx) => {
  const user = await tx
    .insert(users)
    .values({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashed',
    })
    .returning()
    .then(rows => rows[0])

  await tx
    .insert(posts)
    .values({
      title: 'First Post',
      content: 'Hello World',
      authorId: user.id,
    })
})

// エラー時のロールバック
try {
  await db.transaction(async (tx) => {
    await tx.insert(users).values({...})

    // エラーが発生すると自動的にロールバック
    throw new Error('Something went wrong')

    await tx.insert(posts).values({...})
  })
} catch (error) {
  console.error('Transaction rolled back:', error)
}

// 分離レベル指定
await db.transaction(async (tx) => {
  // トランザクション処理
}, {
  isolationLevel: 'serializable',
})
```

## マイグレーション

### マイグレーション生成

```bash
# スキーマからマイグレーション生成
npx drizzle-kit generate:pg

# カスタムマイグレーション名
npx drizzle-kit generate:pg --name add_user_profile
```

生成されるマイグレーション:

```sql
-- src/db/migrations/0000_init.sql
CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(255) NOT NULL,
  "email" varchar(255) NOT NULL,
  "password" text NOT NULL,
  "active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "posts" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" varchar(255) NOT NULL,
  "content" text NOT NULL,
  "published" boolean DEFAULT false,
  "author_id" integer NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" 
  FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
```

### マイグレーション実行

```typescript
// src/db/migrate.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL!

const sql = postgres(connectionString, { max: 1 })
const db = drizzle(sql)

await migrate(db, { migrationsFolder: './src/db/migrations' })

await sql.end()
```

実行:

```bash
npx tsx src/db/migrate.ts
```

### Drizzle Studio（GUI）

```bash
# Drizzle Studioを起動
npx drizzle-kit studio

# ブラウザで https://local.drizzle.studio が開く
```

## Prismaとの比較

### 構文比較

```typescript
// === Prisma ===
// スキーマ定義（schema.prisma）
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String
  posts     Post[]
  createdAt DateTime @default(now())
}

// クエリ
const users = await prisma.user.findMany({
  where: { active: true },
  include: { posts: true },
})

// === Drizzle ===
// スキーマ定義（TypeScript）
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

// クエリ
const users = await db.query.users.findMany({
  where: eq(users.active, true),
  with: { posts: true },
})
```

### パフォーマンス比較

```typescript
// Drizzleの利点
1. バンドルサイズ: Prisma ~1.5MB, Drizzle ~50KB
2. コールドスタート: Drizzleが高速
3. エッジランタイム: Drizzleは完全対応、Prismaは制限あり
4. 型推論: どちらも優秀だがDrizzleはより柔軟
```

### 選択基準

```typescript
// Prismaを選ぶべき場合:
// - 成熟したエコシステムが必要
// - Prisma Studioが便利
// - チームがPrismaに慣れている

// Drizzleを選ぶべき場合:
// - エッジランタイムで動かしたい
// - バンドルサイズを小さくしたい
// - SQLに近い書き方が好み
// - 完全な型推論が欲しい
```

## まとめ

Drizzle ORMは以下の点で優れています:

1. **TypeScript-First** - 完全な型推論
2. **軽量・高速** - 小さなバンドルサイズ
3. **エッジ対応** - モダンなランタイムで動作
4. **SQLライク** - 直感的なAPI

Prismaの代替として、特にエッジ環境やバンドルサイズを重視するプロジェクトで強力な選択肢となります。

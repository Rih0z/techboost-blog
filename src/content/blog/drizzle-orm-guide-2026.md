---
title: "Drizzle ORM完全ガイド2026 - TypeScript-firstの次世代ORM"
description: "Drizzle ORMの基礎から実践まで徹底解説。Prismaとの比較、スキーマ定義、マイグレーション、CRUD操作、Next.js/Honoとの統合方法を完全網羅。"
pubDate: "2026-02-05"
tags: ["Drizzle", "ORM", "TypeScript", "Database", "Next.js"]
---

## はじめに

2026年、Drizzle ORMは**TypeScript-firstの次世代ORM**として急速に普及しています。

Drizzle ORMとは、**型安全性・パフォーマンス・開発体験**の3つを高次元で実現するORM（Object-Relational Mapping）です。

### Drizzle ORMの特徴

- **完全な型安全性**: TypeScriptの型システムと完全統合
- **軽量**: ランタイムオーバーヘッドが極小（5KB未満）
- **SQL-like API**: SQLに近い直感的な構文
- **複数DB対応**: PostgreSQL、MySQL、SQLite対応
- **ゼロコストAbstraction**: 実行時のパフォーマンス影響なし
- **マイグレーション**: 自動生成・手動編集可能

## Prismaとの比較

### Prisma vs Drizzle

| 項目 | Prisma | Drizzle |
|---|---|---|
| **学習曲線** | やや高い | 低い（SQL知識があれば簡単） |
| **型安全性** | 完全 | 完全 |
| **パフォーマンス** | 普通 | 高速 |
| **バンドルサイズ** | 大（数MB） | 小（5KB未満） |
| **スキーマ定義** | SDL（独自言語） | TypeScript |
| **クエリビルダー** | 独自 | SQL-like |
| **Edge対応** | 限定的 | 完全対応 |
| **学習コスト** | 中〜高 | 低 |

### いつPrismaを選ぶべきか

- GraphQLとの統合が必要
- Prisma Studioを使いたい
- チーム全員がPrisma経験者

### いつDrizzleを選ぶべきか

- Edgeランタイム（Cloudflare Workers等）で使いたい
- バンドルサイズを最小化したい
- SQLに慣れている
- 高速なクエリが必要

## セットアップ

### インストール

```bash
# PostgreSQL用
npm install drizzle-orm pg
npm install -D drizzle-kit @types/pg

# MySQL用
npm install drizzle-orm mysql2
npm install -D drizzle-kit @types/mysql2

# SQLite用
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit @types/better-sqlite3
```

### プロジェクト構造

```
my-app/
├── drizzle/
│   ├── 0000_initial.sql      ← 自動生成されたマイグレーション
│   └── meta/
├── src/
│   ├── db/
│   │   ├── schema.ts          ← スキーマ定義
│   │   └── index.ts           ← DB接続
│   └── app/
└── drizzle.config.ts          ← Drizzle Kit設定
```

### 設定ファイル

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

## スキーマ定義

### 基本的なテーブル定義

```typescript
// src/db/schema.ts
import { pgTable, serial, text, varchar, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  bio: text('bio'),
  age: integer('age'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  published: boolean('published').default(false),
  authorId: integer('author_id')
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  postId: integer('post_id')
    .references(() => posts.id)
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### リレーション定義

```typescript
import { relations } from 'drizzle-orm';

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));
```

### 型のエクスポート

```typescript
// 挿入用の型（IDなし）
export type NewUser = typeof users.$inferInsert;
export type NewPost = typeof posts.$inferInsert;

// 取得用の型（IDあり）
export type User = typeof users.$inferSelect;
export type Post = typeof posts.$inferSelect;
```

## マイグレーション

### マイグレーション生成

```bash
# スキーマからマイグレーションSQLを自動生成
npx drizzle-kit generate:pg
```

生成されたファイル:

```sql
-- drizzle/0000_initial.sql
CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(255) NOT NULL,
  "email" varchar(255) NOT NULL UNIQUE,
  "bio" text,
  "age" integer,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "posts" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" varchar(255) NOT NULL,
  "content" text NOT NULL,
  "published" boolean DEFAULT false,
  "author_id" integer NOT NULL,
  "created_at" timestamp DEFAULT now()
);

ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk"
  FOREIGN KEY ("author_id") REFERENCES "users"("id");
```

### マイグレーション実行

```bash
# 手動でSQLを実行するか、drizzle-kitを使用
npx drizzle-kit push:pg
```

または、プログラムから実行:

```typescript
// migrate.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function main() {
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migration completed');
  await pool.end();
}

main();
```

### スキーマ変更の例

```typescript
// スキーマ更新: usersテーブルにavatar列追加
export const users = pgTable('users', {
  // 既存の列...
  avatar: varchar('avatar', { length: 255 }),
});
```

```bash
# 差分マイグレーション生成
npx drizzle-kit generate:pg
```

## DB接続

### PostgreSQL接続

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
```

### Vercel Postgres（サーバーレス）

```typescript
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import * as schema from './schema';

export const db = drizzle(sql, { schema });
```

### Cloudflare D1（SQLite on Edge）

```typescript
// worker.ts
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export default {
  async fetch(request: Request, env: Env) {
    const db = drizzle(env.DB, { schema });
    // クエリ実行...
  },
};
```

## CRUD操作

### 挿入（Insert）

```typescript
import { db } from './db';
import { users, posts } from './db/schema';

// 単一レコード挿入
const newUser = await db.insert(users).values({
  name: 'Alice',
  email: 'alice@example.com',
  age: 28,
});

// 挿入したデータを返す
const [user] = await db
  .insert(users)
  .values({
    name: 'Bob',
    email: 'bob@example.com',
  })
  .returning();

console.log(user); // { id: 2, name: 'Bob', email: 'bob@...', ... }

// 複数レコード一括挿入
await db.insert(users).values([
  { name: 'Charlie', email: 'charlie@example.com' },
  { name: 'Dave', email: 'dave@example.com' },
]);

// 型安全な挿入
const newPost: NewPost = {
  title: 'Hello Drizzle',
  content: 'This is my first post',
  authorId: user.id,
};
await db.insert(posts).values(newPost);
```

### 取得（Select）

```typescript
import { eq, gt, and, or, like, desc, asc } from 'drizzle-orm';

// 全件取得
const allUsers = await db.select().from(users);

// 条件指定
const activeUsers = await db
  .select()
  .from(users)
  .where(eq(users.isActive, true));

// 複数条件（AND）
const adults = await db
  .select()
  .from(users)
  .where(and(
    gt(users.age, 18),
    eq(users.isActive, true)
  ));

// OR条件
const result = await db
  .select()
  .from(users)
  .where(or(
    like(users.name, '%Alice%'),
    like(users.email, '%@gmail.com')
  ));

// ソート
const sortedUsers = await db
  .select()
  .from(users)
  .orderBy(desc(users.createdAt));

// LIMIT/OFFSET
const paginatedUsers = await db
  .select()
  .from(users)
  .limit(10)
  .offset(20);

// 特定カラムのみ取得
const names = await db
  .select({ name: users.name, email: users.email })
  .from(users);

// 単一レコード取得
const user = await db
  .select()
  .from(users)
  .where(eq(users.id, 1))
  .limit(1)
  .then((rows) => rows[0]);
```

### JOIN

```typescript
// INNER JOIN
const postsWithAuthors = await db
  .select({
    postId: posts.id,
    title: posts.title,
    authorName: users.name,
    authorEmail: users.email,
  })
  .from(posts)
  .innerJoin(users, eq(posts.authorId, users.id));

// LEFT JOIN
const allPostsWithAuthors = await db
  .select()
  .from(posts)
  .leftJoin(users, eq(posts.authorId, users.id));

// リレーション経由（クエリAPI）
import { db } from './db';

const usersWithPosts = await db.query.users.findMany({
  with: {
    posts: true,
  },
});

// ネストしたリレーション
const postsWithDetails = await db.query.posts.findMany({
  with: {
    author: true,
    comments: {
      with: {
        user: true,
      },
    },
  },
});

// 条件付きリレーション
const publishedPostsWithAuthors = await db.query.posts.findMany({
  where: eq(posts.published, true),
  with: {
    author: {
      columns: { name: true, email: true },
    },
  },
});
```

### 更新（Update）

```typescript
// 単一レコード更新
await db
  .update(users)
  .set({ name: 'Alice Updated' })
  .where(eq(users.id, 1));

// 複数カラム更新
await db
  .update(users)
  .set({
    name: 'Bob Updated',
    age: 30,
    updatedAt: new Date(),
  })
  .where(eq(users.id, 2));

// 条件付き更新
await db
  .update(posts)
  .set({ published: true })
  .where(and(
    eq(posts.authorId, 1),
    eq(posts.published, false)
  ));

// 更新結果を返す
const [updatedUser] = await db
  .update(users)
  .set({ age: 35 })
  .where(eq(users.id, 1))
  .returning();
```

### 削除（Delete）

```typescript
// 単一レコード削除
await db.delete(users).where(eq(users.id, 1));

// 条件付き削除
await db.delete(posts).where(eq(posts.published, false));

// 全削除（注意！）
await db.delete(users);

// 削除結果を返す
const deletedUsers = await db
  .delete(users)
  .where(eq(users.isActive, false))
  .returning();
```

## トランザクション

### 基本的なトランザクション

```typescript
await db.transaction(async (tx) => {
  const [user] = await tx
    .insert(users)
    .values({ name: 'Alice', email: 'alice@example.com' })
    .returning();

  await tx.insert(posts).values({
    title: 'First post',
    content: 'Hello!',
    authorId: user.id,
  });

  // エラーが発生するとロールバック
});
```

### エラーハンドリング

```typescript
try {
  await db.transaction(async (tx) => {
    await tx.insert(users).values({ name: 'Bob', email: 'bob@example.com' });

    // 意図的にエラー
    throw new Error('Something went wrong');

    // ここには到達しない
    await tx.insert(posts).values({ title: 'Test' });
  });
} catch (error) {
  console.error('Transaction rolled back:', error);
}
```

### ネストしたトランザクション

```typescript
await db.transaction(async (tx1) => {
  await tx1.insert(users).values({ name: 'Alice' });

  await tx1.transaction(async (tx2) => {
    await tx2.insert(posts).values({ title: 'Nested' });
  });
});
```

## Next.js統合

### App Router（Server Components）

```typescript
// app/users/page.tsx
import { db } from '@/db';
import { users } from '@/db/schema';
import { desc } from 'drizzle-orm';

export default async function UsersPage() {
  const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));

  return (
    <div>
      <h1>Users</h1>
      <ul>
        {allUsers.map((user) => (
          <li key={user.id}>
            {user.name} - {user.email}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Server Actions

```typescript
// app/actions.ts
'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { revalidatePath } from 'next/cache';

export async function createUser(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;

  await db.insert(users).values({ name, email });

  revalidatePath('/users');
}
```

```typescript
// app/users/new/page.tsx
import { createUser } from '@/app/actions';

export default function NewUserPage() {
  return (
    <form action={createUser}>
      <input type="text" name="name" required />
      <input type="email" name="email" required />
      <button type="submit">Create User</button>
    </form>
  );
}
```

### API Routes

```typescript
// app/api/users/route.ts
import { db } from '@/db';
import { users } from '@/db/schema';
import { NextResponse } from 'next/server';

export async function GET() {
  const allUsers = await db.select().from(users);
  return NextResponse.json(allUsers);
}

export async function POST(request: Request) {
  const body = await request.json();
  const [user] = await db.insert(users).values(body).returning();
  return NextResponse.json(user, { status: 201 });
}
```

## Hono統合

### 基本的な統合

```typescript
// worker.ts (Cloudflare Workers)
import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { users, posts } from './schema';
import { eq } from 'drizzle-orm';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/users', async (c) => {
  const db = drizzle(c.env.DB);
  const allUsers = await db.select().from(users);
  return c.json(allUsers);
});

app.get('/users/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const id = parseInt(c.req.param('id'));
  const user = await db.select().from(users).where(eq(users.id, id)).limit(1);

  if (!user.length) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json(user[0]);
});

app.post('/users', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json();
  const [user] = await db.insert(users).values(body).returning();
  return c.json(user, 201);
});

export default app;
```

## まとめ

### Drizzle ORMのメリット

1. **完全な型安全性**: コンパイル時にエラー検出
2. **軽量**: バンドルサイズが小さい
3. **高速**: SQLに近いパフォーマンス
4. **柔軟**: SQL-likeな構文で直感的
5. **Edge対応**: サーバーレス環境で最適

### ベストプラクティス

- スキーマ定義はTypeScriptで一元管理
- リレーションを活用してコード量削減
- トランザクションで整合性保証
- インデックスを適切に設定
- 型定義をエクスポートして再利用

### 次のステップ

- 公式ドキュメント: https://orm.drizzle.team/
- サンプルプロジェクト: https://github.com/drizzle-team/drizzle-orm
- Discord: コミュニティで質問

Drizzle ORMで、型安全かつ高速なデータベース操作を実現しましょう。

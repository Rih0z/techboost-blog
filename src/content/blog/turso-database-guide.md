---
title: "Turso データベース入門ガイド"
description: "Turso（libSQL）の特徴と使い方を解説。エッジで動作する分散SQLiteデータベースを活用した高速なアプリケーション開発"
pubDate: "2025-02-05"
tags: ["Turso", "libSQL", "Database", "SQLite", "Edge"]
---

Tursoは、SQLiteをベースにしたエッジ対応の分散データベースです。libSQLという拡張されたSQLiteフォークを使用し、グローバルに分散されたデータベースをローカルのSQLiteと同じように扱えます。

## Tursoとは

Tursoは、以下の特徴を持つモダンなデータベースプラットフォームです。

### 主な特徴

1. **エッジ対応** - ユーザーに近い場所でデータベースを実行
2. **分散レプリケーション** - 複数のリージョンにデータを自動複製
3. **SQLite互換** - 既存のSQLiteツールとライブラリがそのまま使える
4. **低レイテンシー** - エッジでの実行により高速なレスポンス
5. **従量課金** - 無料プランからスタート可能

### libSQLの拡張機能

libSQLはSQLiteに以下の機能を追加しています。

- **ネットワーク経由のアクセス** - HTTP/WebSocket経由でのクエリ実行
- **レプリケーション** - マルチリージョンでのデータ同期
- **ブランチング** - データベースのブランチ作成（Git風）
- **埋め込みレプリカ** - ローカルキャッシュとしての利用

## セットアップ

### Turso CLIのインストール

```bash
# macOS/Linux
curl -sSfL https://get.tur.so/install.sh | bash

# Windows (PowerShell)
irm get.tur.so/install.ps1 | iex
```

### ログインと初期設定

```bash
# Tursoにログイン
turso auth login

# データベースを作成
turso db create my-database

# 接続情報を取得
turso db show my-database

# データベース一覧
turso db list
```

### 接続URLとトークンの取得

```bash
# データベースURL
turso db show my-database --url

# 認証トークン
turso db tokens create my-database
```

## クライアントライブラリの使用

### TypeScript/JavaScript

```bash
npm install @libsql/client
```

```typescript
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// テーブル作成
await client.execute(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// データ挿入
await client.execute({
  sql: "INSERT INTO users (name, email) VALUES (?, ?)",
  args: ["Alice", "alice@example.com"],
});

// データ取得
const result = await client.execute("SELECT * FROM users");
console.log(result.rows);

// トランザクション
const tx = await client.transaction("write");
try {
  await tx.execute({
    sql: "INSERT INTO users (name, email) VALUES (?, ?)",
    args: ["Bob", "bob@example.com"],
  });
  await tx.execute({
    sql: "UPDATE users SET name = ? WHERE email = ?",
    args: ["Robert", "bob@example.com"],
  });
  await tx.commit();
} catch (error) {
  await tx.rollback();
  throw error;
}
```

### バッチ処理

複数のクエリを効率的に実行できます。

```typescript
const batch = [
  {
    sql: "INSERT INTO users (name, email) VALUES (?, ?)",
    args: ["Charlie", "charlie@example.com"],
  },
  {
    sql: "INSERT INTO users (name, email) VALUES (?, ?)",
    args: ["David", "david@example.com"],
  },
  {
    sql: "UPDATE users SET name = ? WHERE id = ?",
    args: ["Charles", 3],
  },
];

await client.batch(batch);
```

### Prepared Statements

```typescript
const stmt = await client.prepare(
  "SELECT * FROM users WHERE email = ?"
);

const result1 = await stmt.execute(["alice@example.com"]);
const result2 = await stmt.execute(["bob@example.com"]);

// 使用後はクリーンアップ
await stmt.finalize();
```

## Drizzle ORMとの連携

Drizzle ORMを使うことで、型安全なデータベース操作が可能です。

### セットアップ

```bash
npm install drizzle-orm @libsql/client
npm install -D drizzle-kit
```

### スキーマ定義

```typescript
// db/schema.ts
import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`CURRENT_TIMESTAMP`),
});

export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  published: integer("published", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`CURRENT_TIMESTAMP`),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
```

### データベース接続

```typescript
// db/client.ts
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export const db = drizzle(client, { schema });
```

### CRUD操作

```typescript
import { db } from "./db/client";
import { users, posts } from "./db/schema";
import { eq, and, like, desc } from "drizzle-orm";

// 作成 (Create)
const newUser = await db.insert(users).values({
  name: "Alice",
  email: "alice@example.com",
}).returning();

// 読み取り (Read)
const allUsers = await db.select().from(users);

const user = await db.select()
  .from(users)
  .where(eq(users.email, "alice@example.com"))
  .limit(1);

// ユーザーと投稿を結合
const usersWithPosts = await db.select({
  user: users,
  post: posts,
})
  .from(users)
  .leftJoin(posts, eq(users.id, posts.userId))
  .where(eq(users.id, 1));

// 更新 (Update)
await db.update(users)
  .set({ name: "Alice Smith" })
  .where(eq(users.id, 1));

// 削除 (Delete)
await db.delete(users)
  .where(eq(users.id, 1));
```

### 複雑なクエリ

```typescript
// 検索
const searchResults = await db.select()
  .from(posts)
  .where(
    and(
      like(posts.title, "%TypeScript%"),
      eq(posts.published, true)
    )
  )
  .orderBy(desc(posts.createdAt))
  .limit(10);

// 集計
import { count, avg } from "drizzle-orm";

const stats = await db.select({
  userCount: count(),
  avgPostsPerUser: avg(posts.userId),
})
  .from(users)
  .leftJoin(posts, eq(users.id, posts.userId));

// サブクエリ
const activeUsers = db.select({ id: users.id })
  .from(users)
  .where(eq(users.active, true));

const postsFromActiveUsers = await db.select()
  .from(posts)
  .where(inArray(posts.userId, activeUsers));
```

### トランザクション

```typescript
await db.transaction(async (tx) => {
  const user = await tx.insert(users).values({
    name: "Bob",
    email: "bob@example.com",
  }).returning();

  await tx.insert(posts).values({
    title: "First Post",
    content: "Hello World",
    userId: user[0].id,
    published: true,
  });
});
```

## マイグレーション

### Drizzle Kitの設定

```typescript
// drizzle.config.ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./db/schema.ts",
  out: "./drizzle",
  driver: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
} satisfies Config;
```

### マイグレーションの生成と実行

```bash
# マイグレーションファイルを生成
npx drizzle-kit generate:sqlite

# マイグレーションを実行
npx drizzle-kit push:sqlite

# Drizzle Studio（GUIツール）を起動
npx drizzle-kit studio
```

## Next.js との連携

### APIルートでの使用

```typescript
// app/api/users/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { users } from "@/db/schema";

export async function GET() {
  const allUsers = await db.select().from(users);
  return NextResponse.json(allUsers);
}

export async function POST(request: Request) {
  const body = await request.json();

  const newUser = await db.insert(users).values({
    name: body.name,
    email: body.email,
  }).returning();

  return NextResponse.json(newUser[0], { status: 201 });
}
```

### Server Componentsでの使用

```typescript
// app/users/page.tsx
import { db } from "@/db/client";
import { users } from "@/db/schema";

export default async function UsersPage() {
  const allUsers = await db.select().from(users);

  return (
    <div>
      <h1>Users</h1>
      <ul>
        {allUsers.map((user) => (
          <li key={user.id}>
            {user.name} ({user.email})
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Server Actionsでの使用

```typescript
// app/actions.ts
"use server";

import { db } from "@/db/client";
import { users } from "@/db/schema";
import { revalidatePath } from "next/cache";

export async function createUser(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;

  await db.insert(users).values({ name, email });

  revalidatePath("/users");
}
```

## 埋め込みレプリカ

ローカルにSQLiteファイルを持ち、Tursoと同期することでオフライン対応とパフォーマンス向上を実現できます。

```typescript
import { createClient } from "@libsql/client";

const client = createClient({
  url: "file:local.db", // ローカルファイル
  syncUrl: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// 初回同期
await client.sync();

// ローカルで高速にクエリ実行
const users = await client.execute("SELECT * FROM users");

// 定期的に同期
setInterval(async () => {
  await client.sync();
}, 60000); // 1分ごと
```

## データベースブランチ

開発・ステージング・本番環境を簡単に分離できます。

```bash
# ブランチを作成
turso db create my-db-dev --from-db my-db

# ブランチ一覧
turso db list

# ブランチを削除
turso db destroy my-db-dev
```

## パフォーマンス最適化

### 1. インデックスの作成

```typescript
await client.execute(`
  CREATE INDEX idx_users_email ON users(email);
  CREATE INDEX idx_posts_user_id ON posts(user_id);
  CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
`);
```

### 2. クエリの最適化

```typescript
// 悪い例: N+1クエリ
const users = await db.select().from(users);
for (const user of users) {
  const posts = await db.select()
    .from(posts)
    .where(eq(posts.userId, user.id));
}

// 良い例: JOIN使用
const usersWithPosts = await db.select()
  .from(users)
  .leftJoin(posts, eq(users.id, posts.userId));
```

### 3. 接続プール

```typescript
import { createClient } from "@libsql/client";

// 接続プールを設定
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
  connectionPoolSize: 10, // プールサイズ
});
```

### 4. プリペアドステートメントの再利用

```typescript
const stmt = await client.prepare(
  "SELECT * FROM users WHERE id = ?"
);

// 複数回実行
for (const id of [1, 2, 3, 4, 5]) {
  const result = await stmt.execute([id]);
  console.log(result.rows);
}

await stmt.finalize();
```

## セキュリティ

### 1. 環境変数の管理

```typescript
// .env.local
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-secret-token
```

```typescript
// 環境変数のバリデーション
if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  throw new Error("Missing Turso credentials");
}
```

### 2. SQLインジェクション対策

```typescript
// 悪い例: 文字列結合
const email = req.query.email;
await client.execute(`SELECT * FROM users WHERE email = '${email}'`);

// 良い例: プレースホルダー使用
await client.execute({
  sql: "SELECT * FROM users WHERE email = ?",
  args: [email],
});
```

### 3. アクセス制御

```typescript
// 読み取り専用トークンの作成
turso db tokens create my-database --read-only

// アプリケーション側で検証
const isAdmin = await checkUserRole(userId);
if (!isAdmin) {
  throw new Error("Unauthorized");
}
```

## モニタリングとデバッグ

### クエリログ

```typescript
import { drizzle } from "drizzle-orm/libsql";

const db = drizzle(client, {
  schema,
  logger: {
    logQuery(query, params) {
      console.log("Query:", query);
      console.log("Params:", params);
    },
  },
});
```

### データベース統計

```bash
# データベースの使用状況を確認
turso db inspect my-database

# 月間使用量
turso account usage
```

## ベストプラクティス

### 1. スキーマ設計

```typescript
// 正規化されたスキーマ
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
});

export const profiles = sqliteTable("profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  bio: text("bio"),
  avatar: text("avatar"),
});
```

### 2. エラーハンドリング

```typescript
try {
  await db.insert(users).values({
    name: "Alice",
    email: "alice@example.com",
  });
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes("UNIQUE constraint failed")) {
      console.error("Email already exists");
    } else {
      console.error("Database error:", error.message);
    }
  }
  throw error;
}
```

### 3. 型安全性の確保

```typescript
import { InferModel } from "drizzle-orm";

type User = InferModel<typeof users, "select">;
type NewUser = InferModel<typeof users, "insert">;

function createUser(data: NewUser): Promise<User> {
  return db.insert(users).values(data).returning();
}
```

## まとめ

Tursoは、SQLiteの使いやすさとスケーラビリティを兼ね備えたモダンなデータベースソリューションです。

**主な利点:**
- エッジでの高速な実行
- SQLite互換による学習コストの低さ
- 分散レプリケーションによる可用性
- 無料プランからのスタート
- Drizzle ORMなどの充実したエコシステム

特に、グローバルに展開するアプリケーション、低レイテンシーが求められるサービス、Next.jsやRemixなどのモダンフレームワークとの組み合わせに最適です。埋め込みレプリカを使えば、オフライン対応も容易に実現できます。

---
title: "Turso + libSQLで始めるエッジデータベース【2026年完全ガイド】"
description: "Tursoはエッジで動作するSQLiteベースのデータベース。libSQLの特徴、エッジレプリカ、Drizzle ORMとの統合、Next.js/Astroでの活用方法を解説します。Turso・libSQL・Databaseに関する実践情報。"
pubDate: "2026-02-05"
tags: ["Turso", "libSQL", "Database", "Edge Computing", "インフラ"]
---
## Tursoとは

Tursoは、SQLiteをベースにしたエッジデータベースサービスです。世界中の35箇所以上のロケーションにデータベースをレプリケートし、ユーザーに最も近い場所からデータを提供します。

### 主な特徴

- **エッジレプリカ**: グローバルに分散したデータベース
- **低レイテンシ**: 物理的に近いDBから読み取り(<10ms)
- **SQLite互換**: 既存のSQLite知識がそのまま使える
- **無料枠が充実**: 月500MBまで、8GBストレージまで無料
- **スケーラブル**: 自動スケーリング対応

## libSQLとは

libSQLは、SQLiteのオープンソースフォークで、Tursoの基盤技術です。

### SQLiteとの違い

```
SQLite → ローカルファイルベース
libSQL  → ローカル + リモート + エッジレプリカ対応
```

libSQLは以下を追加:

- HTTPプロトコルでのアクセス
- WebSocketによるリアルタイム同期
- エッジでのレプリケーション機能
- ランダムUUID関数などの拡張

## セットアップ

### 1. Tursoアカウント作成

```bash
# Turso CLIインストール (macOS/Linux)
curl -sSfL https://get.tur.so/install.sh | bash

# 認証
turso auth login

# データベース作成
turso db create my-app-db

# 接続情報取得
turso db show my-app-db --url
turso db tokens create my-app-db
```

### 2. プロジェクトへの統合

```bash
npm install @libsql/client
```

```typescript
// lib/db.ts
import { createClient } from "@libsql/client";

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
```

## 基本的な使い方

### クエリ実行

```typescript
import { db } from "./lib/db";

// SELECT
const users = await db.execute("SELECT * FROM users WHERE age > ?", [18]);
console.log(users.rows);

// INSERT
const result = await db.execute(
  "INSERT INTO users (name, email) VALUES (?, ?)",
  ["Alice", "alice@example.com"]
);
console.log("Inserted ID:", result.lastInsertRowid);

// トランザクション
const batch = [
  { sql: "INSERT INTO users (name) VALUES (?)", args: ["Bob"] },
  { sql: "INSERT INTO posts (user_id, title) VALUES (?, ?)", args: [1, "Hello"] },
];

await db.batch(batch);
```

## Drizzle ORMとの統合

Drizzle ORMを使うと、型安全にクエリを書けます。

### セットアップ

```bash
npm install drizzle-orm drizzle-kit
npm install -D @libsql/client
```

```typescript
// drizzle.config.ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./lib/schema.ts",
  out: "./drizzle",
  driver: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
} satisfies Config;
```

### スキーマ定義

```typescript
// lib/schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  content: text("content"),
  publishedAt: integer("published_at", { mode: "timestamp" }),
});
```

### マイグレーション

```bash
# マイグレーションファイル生成
npx drizzle-kit generate:sqlite

# マイグレーション実行
npx drizzle-kit push:sqlite
```

### クエリ実行

```typescript
// lib/db.ts
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export const db = drizzle(client, { schema });
```

```typescript
// app/actions.ts
import { db } from "@/lib/db";
import { users, posts } from "@/lib/schema";
import { eq } from "drizzle-orm";

// SELECT
export async function getUsers() {
  return await db.select().from(users);
}

// INSERT
export async function createUser(name: string, email: string) {
  const [user] = await db
    .insert(users)
    .values({ name, email })
    .returning();
  return user;
}

// JOIN
export async function getUserPosts(userId: number) {
  return await db
    .select()
    .from(posts)
    .innerJoin(users, eq(posts.userId, users.id))
    .where(eq(users.id, userId));
}
```

## Next.js App Routerでの活用

```typescript
// app/users/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";

export async function GET() {
  const allUsers = await db.select().from(users);
  return NextResponse.json(allUsers);
}

export async function POST(request: Request) {
  const { name, email } = await request.json();
  const [newUser] = await db
    .insert(users)
    .values({ name, email })
    .returning();
  return NextResponse.json(newUser, { status: 201 });
}
```

## Astroでの活用

```typescript
// src/pages/api/users.ts
import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";

export const GET: APIRoute = async () => {
  const allUsers = await db.select().from(users);
  return new Response(JSON.stringify(allUsers), {
    headers: { "Content-Type": "application/json" },
  });
};
```

```astro
---
// src/pages/users.astro
import { db } from "@/lib/db";
import { users } from "@/lib/schema";

const allUsers = await db.select().from(users);
---

<html>
  <body>
    <h1>Users</h1>
    <ul>
      {allUsers.map(user => (
        <li>{user.name} ({user.email})</li>
      ))}
    </ul>
  </body>
</html>
```

## エッジレプリカの活用

```bash
# 東京リージョンにレプリカ追加
turso db replicate my-app-db nrt

# レプリカ一覧確認
turso db locations list
```

エッジレプリカにより、以下が実現されます:

- **読み取り**: 最寄りのレプリカから即座に取得(<10ms)
- **書き込み**: プライマリに書き込み後、自動的に全レプリカに伝播

## パフォーマンス比較

| データベース | レイテンシ(東京→米国) |
|------------|----------------------|
| PostgreSQL (米国) | 150-200ms |
| PlanetScale | 80-120ms |
| **Turso (エッジ)** | **5-10ms** |

## まとめ

Turso + libSQLは、エッジコンピューティング時代の理想的なデータベースソリューションです。

- グローバルユーザー向けアプリに最適
- SQLite互換で学習コストが低い
- Drizzle ORMで型安全な開発が可能
- 無料枠が充実しており、スタートアップに最適

次のプロジェクトで、ぜひTursoを試してみてください。

公式サイト: https://turso.tech/

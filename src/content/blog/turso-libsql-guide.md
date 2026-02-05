---
title: 'Turso & LibSQL完全ガイド - エッジDBで高速アプリ開発'
description: 'Tursoの基本からLibSQL、エッジレプリカ、Drizzle ORM連携、Next.jsアプリ構築まで。サーバーレスDBの新定番を徹底解説。'
pubDate: 'Feb 05 2026'
tags: ['Turso', 'LibSQL', 'データベース', 'サーバーレス']
---

# Turso & LibSQL完全ガイド - エッジDBで高速アプリ開発

Tursoは、SQLiteをベースにしたエッジデータベースサービスです。LibSQLというSQLiteのフォークを使い、世界中のエッジロケーションにデータをレプリケーションすることで、超低遅延のデータアクセスを実現します。

## Tursoとは

### 特徴

1. **SQLiteベース** - 軽量で高速、SQLiteの豊富なエコシステムを活用
2. **エッジレプリカ** - 世界中のロケーションにデータを自動複製
3. **組み込みDB** - embedded replicasでローカルにSQLiteファイルを持てる
4. **寛大な無料枠** - 500DBまで、月9GB転送量、8GBストレージ
5. **型安全** - Drizzle ORM等との優れた連携

### LibSQLとは

LibSQLはSQLiteのオープンソースフォークで、以下の機能を追加しています：

- **HTTPアクセス** - REST APIでクエリ実行
- **レプリケーション** - プライマリ→レプリカの自動同期
- **拡張機能** - ALTER TABLE の改善、ランダムROWID等
- **WebSocket** - リアルタイム通信サポート

## セットアップ

### CLIインストール

```bash
# macOS
brew install tursodatabase/tap/turso

# Linux
curl -sSfL https://get.tur.so/install.sh | bash

# 認証
turso auth signup
turso auth login
```

### データベース作成

```bash
# DB作成（最寄りリージョン）
turso db create my-app-db

# リージョン指定
turso db create my-app-db --location nrt  # 東京

# DB一覧
turso db list

# 接続情報
turso db show my-app-db --url
turso db tokens create my-app-db
```

### SQLシェル

```bash
turso db shell my-app-db

# テーブル作成
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id INTEGER REFERENCES users(id),
  published_at TEXT DEFAULT (datetime('now'))
);
```

## TypeScriptクライアント

### インストール

```bash
npm install @libsql/client
```

### 基本的な使い方

```typescript
import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

// クエリ実行
const result = await client.execute('SELECT * FROM users')
console.log(result.rows)

// パラメータ付きクエリ
const user = await client.execute({
  sql: 'SELECT * FROM users WHERE id = ?',
  args: [1],
})

// 挿入
await client.execute({
  sql: 'INSERT INTO users (name, email) VALUES (?, ?)',
  args: ['Alice', 'alice@example.com'],
})
```

### トランザクション

```typescript
const tx = await client.transaction('write')

try {
  await tx.execute({
    sql: 'INSERT INTO users (name, email) VALUES (?, ?)',
    args: ['Bob', 'bob@example.com'],
  })

  const result = await tx.execute('SELECT last_insert_rowid()')
  const userId = result.rows[0][0]

  await tx.execute({
    sql: 'INSERT INTO posts (title, content, author_id) VALUES (?, ?, ?)',
    args: ['First Post', 'Hello World', userId],
  })

  await tx.commit()
} catch (e) {
  await tx.rollback()
  throw e
}
```

### バッチ実行

```typescript
const results = await client.batch([
  {
    sql: 'INSERT INTO users (name, email) VALUES (?, ?)',
    args: ['Charlie', 'charlie@example.com'],
  },
  {
    sql: 'INSERT INTO users (name, email) VALUES (?, ?)',
    args: ['Diana', 'diana@example.com'],
  },
], 'write')
```

## Drizzle ORM連携

### セットアップ

```bash
npm install drizzle-orm @libsql/client
npm install -D drizzle-kit
```

### スキーマ定義

```typescript
// src/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: text('created_at').default('datetime("now")'),
})

export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  authorId: integer('author_id').references(() => users.id),
  publishedAt: text('published_at').default('datetime("now")'),
})
```

### クライアント初期化

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from './schema'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

export const db = drizzle(client, { schema })
```

### CRUD操作

```typescript
import { db } from './db'
import { users, posts } from './db/schema'
import { eq, desc, like } from 'drizzle-orm'

// 全件取得
const allUsers = await db.select().from(users)

// 条件付き取得
const user = await db
  .select()
  .from(users)
  .where(eq(users.id, 1))

// 挿入
const newUser = await db
  .insert(users)
  .values({ name: 'Alice', email: 'alice@example.com' })
  .returning()

// 更新
await db
  .update(users)
  .set({ name: 'Alice Smith' })
  .where(eq(users.id, 1))

// 削除
await db.delete(users).where(eq(users.id, 1))

// JOIN
const postsWithAuthors = await db
  .select({
    postTitle: posts.title,
    authorName: users.name,
  })
  .from(posts)
  .innerJoin(users, eq(posts.authorId, users.id))
  .orderBy(desc(posts.publishedAt))
```

## Embedded Replicas

### ローカルレプリカの活用

```typescript
import { createClient } from '@libsql/client'

const client = createClient({
  url: 'file:local.db',  // ローカルファイル
  syncUrl: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
  syncInterval: 60,  // 60秒ごとに同期
})

// 読み取りはローカルから（超高速）
const users = await client.execute('SELECT * FROM users')

// 書き込みはプライマリに送信
await client.execute({
  sql: 'INSERT INTO users (name, email) VALUES (?, ?)',
  args: ['Local User', 'local@example.com'],
})

// 手動同期
await client.sync()
```

## Next.jsアプリでの実践例

### API Route

```typescript
// app/api/users/route.ts
import { db } from '@/db'
import { users } from '@/db/schema'
import { NextResponse } from 'next/server'

export async function GET() {
  const allUsers = await db.select().from(users)
  return NextResponse.json(allUsers)
}

export async function POST(request: Request) {
  const body = await request.json()
  const newUser = await db
    .insert(users)
    .values(body)
    .returning()
  return NextResponse.json(newUser[0], { status: 201 })
}
```

### Server Component

```typescript
// app/users/page.tsx
import { db } from '@/db'
import { users } from '@/db/schema'

export default async function UsersPage() {
  const allUsers = await db.select().from(users)

  return (
    <div>
      <h1>Users</h1>
      <ul>
        {allUsers.map(user => (
          <li key={user.id}>{user.name} - {user.email}</li>
        ))}
      </ul>
    </div>
  )
}
```

## マイグレーション

### drizzle-kit設定

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
} satisfies Config
```

### マイグレーション実行

```bash
# マイグレーション生成
npx drizzle-kit generate

# マイグレーション適用
npx drizzle-kit push

# Drizzle Studio（GUI）
npx drizzle-kit studio
```

## まとめ

Turso & LibSQLは、SQLiteの使い慣れた操作性にエッジコンピューティングの低遅延を組み合わせた次世代データベースです。寛大な無料枠があり、個人プロジェクトから本番環境まで幅広く活用できます。Drizzle ORMとの組み合わせで、型安全なデータベース操作を実現しましょう。

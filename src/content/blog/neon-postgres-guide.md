---
title: 'Neon PostgreSQL完全ガイド - サーバーレスDBで次世代開発'
description: 'Neon PostgreSQLの基本からブランチング、自動スケーリング、Drizzle ORM連携、Next.jsアプリ構築まで。サーバーレスPostgreSQLを徹底解説。'
pubDate: 'Feb 05 2026'
tags: ['Neon', 'PostgreSQL', 'サーバーレス', 'データベース', 'インフラ']
---

# Neon PostgreSQL完全ガイド - サーバーレスDBで次世代開発

Neonは、サーバーレスアーキテクチャを採用したPostgreSQLサービスです。コンピュートとストレージの分離により、自動スケーリング、ブランチング、ゼロから起動する機能を提供します。

## Neonとは

### 特徴

1. **サーバーレス** - 使わないときは自動停止、アクセス時に即起動
2. **ブランチング** - Gitのようにデータベースをブランチ分岐
3. **自動スケーリング** - 負荷に応じてコンピュートリソースを自動調整
4. **PostgreSQL互換** - 完全なPostgreSQL互換性
5. **寛大な無料枠** - 0.5GBストレージ、月190時間のコンピュート

### 従来のPostgreSQLとの違い

| 項目 | 従来のPostgreSQL | Neon |
|------|-----------------|------|
| 起動時間 | 分単位 | ミリ秒 |
| スケーリング | 手動 | 自動 |
| ブランチ | 不可 | 可能 |
| 課金 | 常時稼働 | 使用分のみ |
| バックアップ | 手動設定 | 自動 |

## セットアップ

### プロジェクト作成

1. [Neon Console](https://console.neon.tech)にサインアップ
2. プロジェクトを作成（リージョン選択可能）
3. 接続文字列を取得

### 接続文字列

```
postgresql://username:password@ep-example-123456.region.aws.neon.tech/neondb?sslmode=require
```

### Node.jsからの接続

```bash
npm install @neondatabase/serverless
```

```typescript
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

// クエリ実行
const users = await sql`SELECT * FROM users`
console.log(users)

// パラメータ付きクエリ
const user = await sql`
  SELECT * FROM users WHERE id = ${userId}
`

// 挿入
await sql`
  INSERT INTO users (name, email)
  VALUES (${name}, ${email})
`
```

### 接続プーリング

```typescript
import { Pool } from '@neondatabase/serverless'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
})

const client = await pool.connect()
try {
  const { rows } = await client.query('SELECT * FROM users')
  return rows
} finally {
  client.release()
}
```

## Drizzle ORM連携

### セットアップ

```bash
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit
```

### スキーマ定義

```typescript
// src/db/schema.ts
import { pgTable, serial, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  published: boolean('published').default(false),
  authorId: integer('author_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})
```

### クライアント初期化

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

const sql = neon(process.env.DATABASE_URL!)

export const db = drizzle(sql, { schema })
```

### CRUD操作

```typescript
import { db } from './db'
import { users, posts } from './db/schema'
import { eq, desc, and, like, count } from 'drizzle-orm'

// 全件取得
const allUsers = await db.select().from(users)

// 条件付き検索
const activeUsers = await db
  .select()
  .from(users)
  .where(like(users.email, '%@example.com'))

// JOIN + ページネーション
const postsWithAuthors = await db
  .select({
    postId: posts.id,
    title: posts.title,
    authorName: users.name,
  })
  .from(posts)
  .innerJoin(users, eq(posts.authorId, users.id))
  .where(eq(posts.published, true))
  .orderBy(desc(posts.createdAt))
  .limit(10)
  .offset(0)

// 集計
const userPostCounts = await db
  .select({
    userId: users.id,
    name: users.name,
    postCount: count(posts.id),
  })
  .from(users)
  .leftJoin(posts, eq(users.id, posts.authorId))
  .groupBy(users.id, users.name)

// 挿入
const [newUser] = await db
  .insert(users)
  .values({ name: 'Alice', email: 'alice@example.com' })
  .returning()

// 更新
await db
  .update(posts)
  .set({ published: true, updatedAt: new Date() })
  .where(eq(posts.id, 1))

// 削除
await db.delete(posts).where(eq(posts.authorId, 1))
```

## ブランチング

### ブランチの概念

Neonのブランチは、Gitのブランチに似た概念です。メインブランチからデータの「スナップショット」を作成し、独立した環境で開発・テストができます。

### CLI操作

```bash
# Neon CLIインストール
npm install -g neonctl

# 認証
neonctl auth

# ブランチ作成
neonctl branches create --name feature-auth --project-id <project-id>

# ブランチ一覧
neonctl branches list --project-id <project-id>

# ブランチの接続情報
neonctl connection-string --branch feature-auth --project-id <project-id>

# ブランチ削除
neonctl branches delete feature-auth --project-id <project-id>
```

### 活用パターン

```bash
# 1. 開発ブランチ
neonctl branches create --name dev --project-id $PROJECT_ID

# 2. テスト用ブランチ（本番データのコピー）
neonctl branches create --name test-migration --parent main

# 3. プレビュー環境（PRごと）
neonctl branches create --name preview-pr-123 --parent main
```

## Next.jsアプリでの実践

### Server Component

```typescript
// app/posts/page.tsx
import { db } from '@/db'
import { posts, users } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

export default async function PostsPage() {
  const allPosts = await db
    .select({
      id: posts.id,
      title: posts.title,
      content: posts.content,
      authorName: users.name,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.published, true))
    .orderBy(desc(posts.createdAt))

  return (
    <div>
      <h1>Blog Posts</h1>
      {allPosts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>By {post.authorName}</p>
          <p>{post.content}</p>
        </article>
      ))}
    </div>
  )
}
```

### Server Action

```typescript
// app/posts/actions.ts
'use server'

import { db } from '@/db'
import { posts } from '@/db/schema'
import { revalidatePath } from 'next/cache'

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string
  const content = formData.get('content') as string

  await db.insert(posts).values({
    title,
    content,
    authorId: 1,
    published: true,
  })

  revalidatePath('/posts')
}
```

### API Route

```typescript
// app/api/posts/route.ts
import { db } from '@/db'
import { posts } from '@/db/schema'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 10

  const allPosts = await db
    .select()
    .from(posts)
    .limit(limit)
    .offset((page - 1) * limit)

  return NextResponse.json(allPosts)
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
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config
```

### マイグレーション実行

```bash
# マイグレーション生成
npx drizzle-kit generate

# マイグレーション適用
npx drizzle-kit push

# GUI管理ツール
npx drizzle-kit studio
```

## パフォーマンス最適化

### コネクション管理

```typescript
// サーバーレス環境でのベストプラクティス
import { neon } from '@neondatabase/serverless'

// HTTPベース（サーバーレス向け）
const sql = neon(process.env.DATABASE_URL!)

// WebSocketプーリング（長時間接続向け）
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
})
```

### インデックス

```typescript
// schema.tsでインデックス定義
import { pgTable, serial, text, index } from 'drizzle-orm/pg-core'

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  authorId: integer('author_id').references(() => users.id),
}, (table) => ({
  authorIdx: index('posts_author_idx').on(table.authorId),
  slugIdx: index('posts_slug_idx').on(table.slug),
}))
```

## まとめ

Neon PostgreSQLの主な利点：

1. **サーバーレス** - ゼロからの起動、自動スケーリング
2. **ブランチング** - 開発・テスト環境を即座に作成
3. **PostgreSQL互換** - 既存の知識とツールをそのまま活用
4. **コスト効率** - 使用分のみの課金

Neonは、Next.jsやVercelなどのサーバーレスプラットフォームと組み合わせることで、真のサーバーレスフルスタックアプリケーションを構築できます。無料枠で十分な容量があるので、個人プロジェクトから始めてみましょう。

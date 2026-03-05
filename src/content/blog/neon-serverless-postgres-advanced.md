---
title: 'Neon Serverless PostgreSQL完全ガイド'
description: 'Neon Serverless PostgreSQLでデータベースを構築。ブランチング、オートスケーリング、エッジ接続、Prisma/Drizzle連携を実例とともに徹底解説'
pubDate: '2025-02-06'
tags: ['Neon', 'PostgreSQL', 'Serverless', 'Database', 'Prisma', 'Drizzle', 'インフラ']
---

# Neon Serverless PostgreSQL完全ガイド

Neonは、サーバーレスアーキテクチャを採用したPostgreSQLサービスです。従来のデータベースとは異なり、コンピュートとストレージを分離し、自動スケーリング、ブランチング、瞬時起動を実現します。

本ガイドでは、Neonの特徴的な機能であるブランチング、エッジ接続、ORMとの統合に焦点を当てて解説します。

## Neonのサーバーレスアーキテクチャ

### コンピュート・ストレージ分離

```
┌─────────────────────────────────┐
│  Neon Compute Layer             │
│  (PostgreSQL Engine)            │
│                                 │
│  ┌──────────────────────────┐  │
│  │  Compute Node 1          │  │
│  │  - SQL処理               │  │
│  │  - キャッシュ             │  │
│  └──────────────────────────┘  │
│                                 │
│  ┌──────────────────────────┐  │
│  │  Compute Node 2          │  │
│  │  - 自動スケール           │  │
│  │  - 使用時のみ起動         │  │
│  └──────────────────────────┘  │
└────────────┬────────────────────┘
             │ Pageserver Protocol
             ▼
┌─────────────────────────────────┐
│  Neon Storage Layer (Pageserver)│
│  - Write-Ahead Log (WAL)        │
│  - ページキャッシュ              │
│  - S3永続化                     │
└─────────────────────────────────┘
```

### 従来のPostgreSQLとの違い

| 特徴 | 従来のPostgreSQL | Neon |
|------|------------------|------|
| 起動時間 | 数分 | ミリ秒 |
| スケーリング | 手動 | 自動（0.25-7 CU） |
| ブランチング | 不可 | Git風の高速ブランチ |
| コールドスタート | なし | 自動スリープ・復帰 |
| ストレージ | ローカルディスク | 分離ストレージ |
| バックアップ | 手動・スケジュール | 継続的・時点復元 |

## プロジェクトセットアップ

### Neonプロジェクト作成

```bash
# Neon CLIインストール
npm install -g neonctl

# ログイン
neonctl auth

# プロジェクト作成
neonctl projects create --name my-app --region aws-us-east-2

# 接続文字列取得
neonctl connection-string --project-id <project-id>
```

### 環境変数設定

```bash
# .env
DATABASE_URL="postgresql://user:password@ep-example-123.us-east-2.aws.neon.tech/neondb?sslmode=require"

# エッジ接続用（WebSocket）
DATABASE_URL_UNPOOLED="postgresql://user:password@ep-example-123.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

## Prismaとの統合

### Prismaセットアップ

```bash
npm install prisma @prisma/client @prisma/adapter-neon @neondatabase/serverless
npx prisma init
```

```prisma
// prisma/schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id        String   @id @default(uuid())
  title     String
  content   String
  published Boolean  @default(false)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([authorId])
  @@index([published])
}
```

```bash
# マイグレーション実行
npx prisma migrate dev --name init
npx prisma generate
```

### Neon Serverless Driverでの使用

```typescript
// src/lib/db.ts
import { Pool, neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'
import ws from 'ws'

// WebSocketを設定（開発環境）
neonConfig.webSocketConstructor = ws

const connectionString = process.env.DATABASE_URL

const pool = new Pool({ connectionString })
const adapter = new PrismaNeon(pool)
const prisma = new PrismaClient({ adapter })

export { prisma }
```

### エッジランタイムでの使用

```typescript
// Vercel Edge Functions / Cloudflare Workers
import { neon } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'

const sql = neon(process.env.DATABASE_URL!)
const adapter = new PrismaNeon(sql)
const prisma = new PrismaClient({ adapter })

export default async function handler(req: Request) {
  const users = await prisma.user.findMany({
    include: {
      posts: true,
    },
  })

  return new Response(JSON.stringify(users), {
    headers: { 'Content-Type': 'application/json' },
  })
}

export const config = {
  runtime: 'edge',
}
```

## Drizzle ORMとの統合

### Drizzleセットアップ

```bash
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit
```

### スキーマ定義

```typescript
// src/db/schema.ts
import { pgTable, serial, text, timestamp, boolean, uuid, integer } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  published: boolean('published').default(false).notNull(),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  viewCount: integer('view_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
```

### Drizzleクライアント初期化

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

const sql = neon(process.env.DATABASE_URL!)

export const db = drizzle(sql, { schema })
```

### マイグレーション

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

```bash
# マイグレーション生成
npx drizzle-kit generate

# マイグレーション適用
npx drizzle-kit migrate

# Drizzle Studio起動
npx drizzle-kit studio
```

### クエリ例

```typescript
import { db } from './db'
import { users, posts } from './db/schema'
import { eq, desc, and, count } from 'drizzle-orm'

// ユーザー作成
const newUser = await db.insert(users).values({
  email: 'alice@example.com',
  name: 'Alice',
}).returning()

// ユーザー取得（投稿含む）
const usersWithPosts = await db
  .select()
  .from(users)
  .leftJoin(posts, eq(users.id, posts.authorId))

// 公開済み投稿を取得
const publishedPosts = await db
  .select({
    id: posts.id,
    title: posts.title,
    authorName: users.name,
    createdAt: posts.createdAt,
  })
  .from(posts)
  .innerJoin(users, eq(posts.authorId, users.id))
  .where(eq(posts.published, true))
  .orderBy(desc(posts.createdAt))
  .limit(10)

// 投稿数集計
const userPostCounts = await db
  .select({
    userId: users.id,
    name: users.name,
    postCount: count(posts.id),
  })
  .from(users)
  .leftJoin(posts, eq(users.id, posts.authorId))
  .groupBy(users.id, users.name)

// トランザクション
await db.transaction(async (tx) => {
  const user = await tx.insert(users).values({
    email: 'bob@example.com',
    name: 'Bob',
  }).returning()

  await tx.insert(posts).values({
    title: 'First Post',
    content: 'Hello World',
    authorId: user[0].id,
  })
})
```

## ブランチング（Database Branching）

### ブランチの概念

Neonのブランチは、Gitのブランチと同様の概念です。親ブランチのデータのコピーを瞬時に作成し、独立した環境として使用できます。

### CLIでのブランチ操作

```bash
# ブランチ作成
neonctl branches create \
  --name feature/auth \
  --project-id <project-id>

# ブランチ一覧
neonctl branches list --project-id <project-id>

# ブランチの接続文字列取得
neonctl connection-string \
  --branch feature/auth \
  --project-id <project-id>

# ブランチ削除
neonctl branches delete feature/auth --project-id <project-id>
```

### CI/CD統合

```yaml
# .github/workflows/pr-preview.yml
name: PR Preview

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Neon CLI
        run: npm install -g neonctl

      - name: Create Preview Branch
        id: create-branch
        env:
          NEON_API_KEY: ${{ secrets.NEON_API_KEY }}
        run: |
          BRANCH_NAME="preview/pr-${{ github.event.pull_request.number }}"
          neonctl branches create \
            --name "$BRANCH_NAME" \
            --project-id ${{ secrets.NEON_PROJECT_ID }}

          CONNECTION_STRING=$(neonctl connection-string \
            --branch "$BRANCH_NAME" \
            --project-id ${{ secrets.NEON_PROJECT_ID }})

          echo "branch_name=$BRANCH_NAME" >> $GITHUB_OUTPUT
          echo "connection_string=$CONNECTION_STRING" >> $GITHUB_OUTPUT

      - name: Run Migrations
        env:
          DATABASE_URL: ${{ steps.create-branch.outputs.connection_string }}
        run: |
          npm install
          npx prisma migrate deploy

      - name: Deploy Preview
        env:
          DATABASE_URL: ${{ steps.create-branch.outputs.connection_string }}
        run: |
          # Vercel / Netlify / Cloudflareへのデプロイ
          vercel deploy --env DATABASE_URL="$DATABASE_URL"

      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `Preview deployed with database branch: ${{ steps.create-branch.outputs.branch_name }}`
            })
```

### ブランチクリーンアップ

```yaml
# .github/workflows/cleanup-preview.yml
name: Cleanup Preview

on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Install Neon CLI
        run: npm install -g neonctl

      - name: Delete Preview Branch
        env:
          NEON_API_KEY: ${{ secrets.NEON_API_KEY }}
        run: |
          BRANCH_NAME="preview/pr-${{ github.event.pull_request.number }}"
          neonctl branches delete "$BRANCH_NAME" \
            --project-id ${{ secrets.NEON_PROJECT_ID }}
```

## オートスケーリング

### コンピュートユニット（CU）設定

```bash
# コンピュート設定
neonctl set-context \
  --project-id <project-id> \
  --compute-min 0.25 \
  --compute-max 4
```

### 自動スケール戦略

```typescript
// src/lib/neon-config.ts
import { Pool, neonConfig } from '@neondatabase/serverless'

// 接続プーリング設定
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // 最大接続数
  idleTimeoutMillis: 30000, // アイドルタイムアウト
  connectionTimeoutMillis: 2000, // 接続タイムアウト
})

// コールドスタート最適化
neonConfig.fetchConnectionCache = true
neonConfig.fetchEndpoint = (host) => {
  const [subdomain] = host.split('.')
  return `https://${subdomain}.neon.tech/sql`
}

export { pool }
```

## エッジコンピューティング統合

### Cloudflare Workersでの使用

```typescript
// workers/api.ts
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const sql = neon(env.DATABASE_URL)
    const db = drizzle(sql, { schema })

    const users = await db.select().from(schema.users).limit(10)

    return new Response(JSON.stringify(users), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  },
}
```

### Vercel Edge Functionsでの使用

```typescript
// pages/api/users.ts
import { neon } from '@neondatabase/serverless'
import type { NextRequest } from 'next/server'

export const config = {
  runtime: 'edge',
}

export default async function handler(req: NextRequest) {
  const sql = neon(process.env.DATABASE_URL!)

  const users = await sql`
    SELECT id, name, email
    FROM users
    ORDER BY created_at DESC
    LIMIT 10
  `

  return new Response(JSON.stringify(users), {
    headers: { 'Content-Type': 'application/json' },
  })
}
```

## パフォーマンス最適化

### 接続プーリング

```typescript
// src/lib/db-pool.ts
import { Pool } from '@neondatabase/serverless'

class DatabasePool {
  private static instance: Pool

  static getInstance(): Pool {
    if (!DatabasePool.instance) {
      DatabasePool.instance = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      })
    }

    return DatabasePool.instance
  }

  static async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const pool = this.getInstance()
    const { rows } = await pool.query(text, params)
    return rows
  }
}

export { DatabasePool }
```

### クエリ最適化

```typescript
// インデックス活用
await db
  .select()
  .from(posts)
  .where(
    and(
      eq(posts.published, true),
      eq(posts.authorId, userId)
    )
  )
  .orderBy(desc(posts.createdAt))

// N+1問題回避
const postsWithAuthors = await db
  .select({
    postId: posts.id,
    postTitle: posts.title,
    authorName: users.name,
  })
  .from(posts)
  .innerJoin(users, eq(posts.authorId, users.id))

// バッチクエリ
await db.transaction(async (tx) => {
  await tx.insert(posts).values([
    { title: 'Post 1', content: 'Content 1', authorId: userId },
    { title: 'Post 2', content: 'Content 2', authorId: userId },
    { title: 'Post 3', content: 'Content 3', authorId: userId },
  ])
})
```

## まとめ

Neon Serverless PostgreSQLは以下を実現します:

1. **サーバーレス** - 自動スケール、ゼロからの起動
2. **ブランチング** - Git風の高速データベースブランチ
3. **エッジ対応** - Cloudflare/Vercel Edgeで動作
4. **ORM統合** - Prisma/Drizzle完全サポート
5. **コスト効率** - 使用分のみ課金

Neonは、モダンなサーバーレスアプリケーションに最適なPostgreSQLサービスです。ブランチングによるプレビュー環境、エッジでの高速アクセス、自動スケーリングにより、開発体験と運用効率を大幅に向上させます。

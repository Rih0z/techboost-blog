---
title: "Neon入門 — サーバーレスPostgreSQLで始めるモダンデータベース"
description: "Neonはサーバーレス設計のPostgreSQLサービス。ブランチング機能、自動スケール、モダンなORMとの統合方法を実践的に解説します。"
pubDate: "2026-02-05"
tags: ["Neon", "PostgreSQL", "Serverless", "Database", "インフラ"]
---

## Neonとは何か

Neonはサーバーレスアーキテクチャを採用した、次世代のPostgreSQLホスティングサービスです。従来のデータベースサービスと異なり、コンピュートとストレージを分離し、使用量に応じて自動的にスケールする設計が特徴です。

### Neonの主な特徴

**1. データベースブランチング**
Gitのようにデータベースをブランチできます。開発・ステージング・本番を簡単に分離し、テストデータを本番に影響させずに扱えます。

**2. 自動スケール**
アクセスがない時はゼロにスケールダウンし、コストを削減。リクエストが来ると瞬時に起動します。

**3. PostgreSQL完全互換**
標準のPostgreSQL 15+をサポートし、既存のツール・ORMがそのまま使えます。

## セットアップ手順

### 1. Neonプロジェクト作成

```bash
# Neon CLIのインストール
npm install -g neonctl

# 認証
neonctl auth

# プロジェクト作成
neonctl projects create --name my-app
```

### 2. 接続情報の取得

```bash
# 接続URLを表示
neonctl connection-string my-app
```

出力例:
```
postgresql://user:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb
```

### 3. 環境変数設定

`.env.local`:
```bash
DATABASE_URL="postgresql://user:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

## Drizzle ORMとの統合

Drizzle ORMはTypeScript-firstで、Neonと相性抜群です。

### インストール

```bash
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit
```

### スキーマ定義

`src/db/schema.ts`:
```typescript
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  authorId: serial('author_id').references(() => users.id),
  publishedAt: timestamp('published_at'),
});
```

### データベース接続

`src/db/index.ts`:
```typescript
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from './schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
```

### マイグレーション

`drizzle.config.ts`:
```typescript
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

実行:
```bash
# マイグレーションファイル生成
npx drizzle-kit generate:pg

# マイグレーション実行
npx drizzle-kit push:pg
```

## Next.js統合

### API Routeでの使用

`app/api/users/route.ts`:
```typescript
import { db } from '@/db';
import { users } from '@/db/schema';
import { NextResponse } from 'next/server';

export async function GET() {
  const allUsers = await db.select().from(users);
  return NextResponse.json(allUsers);
}

export async function POST(request: Request) {
  const { name, email } = await request.json();

  const newUser = await db.insert(users).values({
    name,
    email,
  }).returning();

  return NextResponse.json(newUser[0]);
}
```

### Server Componentでの使用

`app/users/page.tsx`:
```typescript
import { db } from '@/db';
import { users } from '@/db/schema';

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

## ブランチング活用法

### 開発ブランチの作成

```bash
# mainブランチから開発ブランチを作成
neonctl branches create --name dev --parent main

# ブランチの接続URL取得
neonctl connection-string dev
```

### 用途別ブランチ戦略

1. **Feature開発**: 各機能開発用に一時ブランチを作成
2. **テスト**: テストデータを本番から分離
3. **ステージング**: 本番データのコピーで検証

```bash
# テスト用ブランチ（本番データのコピー）
neonctl branches create --name test --parent main

# CI/CD用エフェメラルブランチ
neonctl branches create --name pr-${PR_NUMBER} --parent dev
```

## コスト最適化のベストプラクティス

### 1. 自動スケールダウン設定

```bash
# 5分間アクティビティがない場合に自動停止
neonctl projects update --auto-suspend-delay 300
```

### 2. 接続プーリング

Neonの接続プーラーを使用:
```
postgresql://user:password@ep-cool-name-123456-pooler.us-east-2.aws.neon.tech/neondb
```

### 3. 不要なブランチの削除

```bash
# 古いブランチを定期的に削除
neonctl branches delete old-feature-branch
```

### 4. リードレプリカの活用

読み取り専用クエリをリードレプリカに分散:
```typescript
const replicaPool = new Pool({
  connectionString: process.env.DATABASE_READ_URL
});
const readDb = drizzle(replicaPool);

// 読み取り専用クエリ
const users = await readDb.select().from(usersTable);
```

## Prismaとの統合

Drizzleの代わりにPrismaを使う場合:

```bash
npm install prisma @prisma/client
npx prisma init
```

`schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  createdAt DateTime @default(now())
  posts     Post[]
}

model Post {
  id          Int       @id @default(autoincrement())
  title       String
  content     String?
  authorId    Int
  author      User      @relation(fields: [authorId], references: [id])
  publishedAt DateTime?
}
```

## まとめ

Neonはサーバーレス設計により、開発体験とコストの両面で優れた選択肢です。ブランチング機能は開発フローを大きく改善し、自動スケールは無駄なコストを削減します。

Next.jsやDrizzle/Prismaとの統合も簡単で、モダンなフルスタックアプリケーション開発に最適です。無料枠でも十分な機能が使えるため、個人プロジェクトからスタートアップまで幅広く推奨できます。

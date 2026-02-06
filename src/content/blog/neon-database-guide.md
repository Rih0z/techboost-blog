---
title: "Neon サーバーレスPostgreSQL完全ガイド - 次世代のデータベースプラットフォーム"
description: "Neonの基本から実践的な活用方法まで。サーバーレスPostgreSQLの利点、ブランチング機能、スケーリング、そして実際のアプリケーション開発での使い方を詳しく解説します。"
pubDate: "2025-02-05"
tags: ["Database", "PostgreSQL", "Serverless"]
---

Neon は、従来のデータベースの概念を覆すサーバーレスPostgreSQLプラットフォームです。自動スケーリング、ブランチング、そして完全なPostgreSQL互換性を提供し、現代のアプリケーション開発に最適化されています。

この記事では、Neonの基本から実践的な活用方法まで詳しく解説します。

## Neon とは

Neon は、ストレージとコンピュートを分離したアーキテクチャを採用する、フルマネージドのPostgreSQLサービスです。

### 主な特徴

1. **サーバーレスアーキテクチャ**: 使用した分だけ課金
2. **瞬時のスケーリング**: 0〜無限まで自動スケール
3. **データベースブランチング**: Git風のブランチ作成
4. **完全なPostgreSQL互換**: 標準のPostgreSQLツールが使える
5. **高速なコールドスタート**: 数百ミリ秒で起動

## はじめに

### アカウント作成とプロジェクトセットアップ

```bash
# Neon CLIのインストール
npm install -g neonctl

# ログイン
neonctl auth login

# プロジェクトの作成
neonctl project create --name my-app

# 接続文字列の取得
neonctl connection-string
```

### Web UIでの作成

1. https://neon.tech にアクセス
2. GitHubアカウントでサインイン
3. "New Project" をクリック
4. プロジェクト名とリージョンを選択
5. 接続情報をコピー

## データベース接続

### Node.js での接続

```bash
npm install @neondatabase/serverless
```

```javascript
// serverless.js - エッジ環境対応
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function getUsers() {
  const users = await sql`SELECT * FROM users`;
  return users;
}

// トランザクション
async function createUser(name, email) {
  return await sql.transaction([
    sql`INSERT INTO users (name, email) VALUES (${name}, ${email})`,
    sql`INSERT INTO audit_log (action) VALUES ('user_created')`
  ]);
}
```

### プール接続を使う場合

```javascript
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function queryWithPool() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT NOW()');
    return result.rows[0];
  } finally {
    client.release();
  }
}
```

### Drizzle ORMとの統合

```bash
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit
```

```typescript
// db/schema.ts
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
  userId: serial('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});
```

```typescript
// db/index.ts
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

```typescript
// 使用例
import { db } from './db';
import { users, posts } from './db/schema';
import { eq } from 'drizzle-orm';

// ユーザーの作成
async function createUser(name: string, email: string) {
  const [user] = await db.insert(users)
    .values({ name, email })
    .returning();
  return user;
}

// ユーザーと投稿を取得
async function getUserWithPosts(userId: number) {
  return await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      posts: true,
    },
  });
}
```

### Prisma との統合

```bash
npm install prisma @prisma/client
npx prisma init
```

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  posts     Post[]
  createdAt DateTime @default(now())
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int
  createdAt DateTime @default(now())
}
```

```bash
# マイグレーションの実行
npx prisma migrate dev --name init

# Prisma Clientの生成
npx prisma generate
```

```typescript
// 使用例
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // ユーザーと投稿を同時に作成
  const user = await prisma.user.create({
    data: {
      name: 'Alice',
      email: 'alice@example.com',
      posts: {
        create: [
          { title: 'First Post', content: 'Hello World' },
        ],
      },
    },
    include: {
      posts: true,
    },
  });

  console.log(user);
}
```

## ブランチング機能

Neonの最大の特徴の一つが、データベースのブランチング機能です。

### ブランチの作成

```bash
# 本番環境のブランチを作成
neonctl branch create --name production

# 開発用ブランチを作成（本番のコピー）
neonctl branch create --name dev --parent production

# 機能開発用ブランチ
neonctl branch create --name feature/user-auth --parent dev
```

### プレビュー環境との統合

Vercelなどのプレビュー環境と組み合わせると強力です。

```yaml
# .github/workflows/preview.yml
name: Deploy Preview

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Create Neon Branch
        id: neon
        run: |
          BRANCH_NAME="preview/pr-${{ github.event.pull_request.number }}"
          neonctl branch create --name $BRANCH_NAME --parent main
          CONNECTION_STRING=$(neonctl connection-string $BRANCH_NAME)
          echo "::set-output name=db_url::$CONNECTION_STRING"

      - name: Run Migrations
        env:
          DATABASE_URL: ${{ steps.neon.outputs.db_url }}
        run: |
          npm install
          npx prisma migrate deploy

      - name: Deploy to Vercel
        env:
          DATABASE_URL: ${{ steps.neon.outputs.db_url }}
        run: |
          vercel deploy --env DATABASE_URL="$DATABASE_URL"
```

### ブランチの管理

```bash
# ブランチ一覧
neonctl branch list

# ブランチの削除
neonctl branch delete feature/user-auth

# ブランチのリセット（特定の時点に戻す）
neonctl branch reset --timestamp "2025-02-05 10:00:00"
```

## スケーリングと最適化

### 自動スケーリングの設定

```bash
# コンピュートの設定
neonctl project update --autoscaling-limit-min-cu 0.25 --autoscaling-limit-max-cu 4
```

Neonは使用状況に応じて自動的にスケールします。

- **最小CU (0.25)**: アイドル時のコスト削減
- **最大CU (4)**: トラフィックピーク時の対応

### 接続プーリング

```typescript
// 接続プール設定
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // 最大接続数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### クエリの最適化

```typescript
// ❌ N+1問題
async function getUsersWithPostsWrong() {
  const users = await sql`SELECT * FROM users`;
  for (const user of users) {
    user.posts = await sql`SELECT * FROM posts WHERE user_id = ${user.id}`;
  }
  return users;
}

// ✅ JOINを使う
async function getUsersWithPosts() {
  return await sql`
    SELECT
      users.*,
      json_agg(posts.*) as posts
    FROM users
    LEFT JOIN posts ON posts.user_id = users.id
    GROUP BY users.id
  `;
}

// ✅ ORMを使う場合（Drizzle）
import { db } from './db';
import { users } from './db/schema';

const usersWithPosts = await db.query.users.findMany({
  with: {
    posts: true,
  },
});
```

## セキュリティとアクセス制御

### 環境変数の管理

```bash
# .env
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# 本番環境用
DATABASE_URL_PRODUCTION="postgresql://..."

# 開発環境用
DATABASE_URL_DEV="postgresql://..."
```

### Row Level Security (RLS)

```sql
-- RLSを有効化
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- ポリシーの作成：ユーザーは自分の投稿のみ閲覧可能
CREATE POLICY user_posts_policy ON posts
  FOR SELECT
  USING (auth.uid() = user_id);

-- ポリシーの作成：ユーザーは自分の投稿のみ編集可能
CREATE POLICY user_posts_update_policy ON posts
  FOR UPDATE
  USING (auth.uid() = user_id);
```

### IPアドレス制限

```bash
# Neon CLIでIP制限を設定
neonctl project update --allowed-ips "203.0.113.0/24,198.51.100.0/24"
```

## バックアップと復元

### 自動バックアップ

Neonは自動的にポイントインタイムリカバリ（PITR）をサポートしています。

```bash
# 特定の時点にブランチを作成
neonctl branch create --name recovery --parent main --timestamp "2025-02-05 10:00:00"
```

### 手動バックアップ

```bash
# pg_dumpを使用
pg_dump $DATABASE_URL > backup.sql

# リストア
psql $DATABASE_URL < backup.sql
```

## モニタリングとログ

### クエリのモニタリング

```typescript
// クエリのログ記録
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL, {
  onQuery: (query, params, duration) => {
    console.log({
      query,
      params,
      duration: `${duration}ms`,
    });
  },
});
```

### パフォーマンスメトリクス

Neon Web UIで確認できる項目:
- クエリ実行時間
- 接続数
- データ転送量
- コンピュート使用量

## 実践例: Next.js アプリケーション

```typescript
// app/api/users/route.ts
import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const users = await sql`SELECT * FROM users ORDER BY created_at DESC`;
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name, email } = await request.json();

    const [user] = await sql`
      INSERT INTO users (name, email)
      VALUES (${name}, ${email})
      RETURNING *
    `;

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
```

```typescript
// app/api/users/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = parseInt(params.id);

  const [user] = await sql`
    SELECT * FROM users WHERE id = ${userId}
  `;

  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(user);
}
```

## コスト最適化

### 無料枠の活用

Neonの無料プランには以下が含まれます（2025年2月時点）:
- 0.5 GBのストレージ
- 1つのプロジェクト
- 無制限のブランチ

### コスト削減のヒント

```bash
# 1. 使用していないブランチの削除
neonctl branch list
neonctl branch delete old-branch

# 2. 自動スケーリングの最小値を下げる
neonctl project update --autoscaling-limit-min-cu 0.25

# 3. アイドルタイムアウトの設定
neonctl project update --suspend-timeout-seconds 300
```

### モニタリング

```typescript
// コスト監視のための簡易スクリプト
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function analyzeUsage() {
  const stats = await sql`
    SELECT
      schemaname,
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
    FROM pg_tables
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
  `;

  console.log('Database Usage:');
  console.table(stats);
}
```

## トラブルシューティング

### 接続エラー

```typescript
// リトライロジックの実装
async function queryWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await sql`SELECT * FROM users`;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### パフォーマンス問題

```sql
-- スロークエリの特定
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- インデックスの作成
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_posts_user_id ON posts(user_id);
```

## まとめ

Neon は、以下のような場面で特に威力を発揮します。

1. **プレビュー環境**: PRごとに独立したDBブランチ
2. **スケーラブルなアプリ**: 自動スケーリングで急なトラフィック増にも対応
3. **コスト効率**: 使用した分だけの課金
4. **開発速度**: 瞬時のブランチ作成で開発サイクルを高速化

従来のデータベース管理の煩雑さから解放され、アプリケーション開発に集中できる環境を提供してくれます。

## 参考リンク

- [Neon 公式ドキュメント](https://neon.tech/docs)
- [Neon CLI リファレンス](https://neon.tech/docs/reference/cli)
- [Neon with Vercel](https://neon.tech/docs/guides/vercel)

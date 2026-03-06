---
title: 'データベースマイグレーション戦略ガイド2026｜Prisma・Drizzle・Alembic・ゼロダウンタイム'
description: 'データベースマイグレーションの設計と運用を解説。Prisma Migrate、Drizzle Kit、Alembic、Flyway等のツール比較、ゼロダウンタイム移行、ロールバック戦略まで。'
pubDate: '2026-03-05'
tags: ['データベース', 'マイグレーション', 'DevOps', 'TypeScript', 'バックエンド']
---

## なぜマイグレーション戦略が重要か

データベーススキーマの変更は、アプリケーション開発で最もリスクの高い操作の一つです。テーブル構造の変更、カラムの追加・削除、インデックスの最適化——これらを**安全に、再現可能に、チーム全員で共有**するために、マイグレーションツールが不可欠です。

### マイグレーションなしの世界

```
❌ 手動でALTER TABLE → 本番で忘れる
❌ SQLファイルを共有 → 適用順序が不明
❌ 開発者ごとにスキーマが違う → 「俺の環境では動く」
```

### マイグレーションありの世界

```
✅ コードでスキーマ変更を管理
✅ git管理 → 変更履歴が明確
✅ CI/CDで自動適用
✅ ロールバック可能
```

---

## ツール比較

| ツール | 言語 | アプローチ | 特徴 |
|--------|------|-----------|------|
| **Prisma Migrate** | TypeScript | スキーマファースト | Prismaスキーマから自動生成 |
| **Drizzle Kit** | TypeScript | スキーマファースト | 軽量、SQL直書き可能 |
| **Alembic** | Python | コードファースト | SQLAlchemy連携 |
| **Flyway** | Java/SQL | SQLファースト | SQL直書き、多言語対応 |
| **golang-migrate** | Go | SQLファースト | シンプル、CLI完結 |
| **Knex.js** | JavaScript | コードファースト | クエリビルダー統合 |

---

## Prisma Migrate

### スキーマ定義

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        Int       @id @default(autoincrement())
  email     String    @unique
  name      String
  posts     Post[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([email])
}

model Post {
  id        Int       @id @default(autoincrement())
  title     String
  content   String?
  published Boolean   @default(false)
  author    User      @relation(fields: [authorId], references: [id])
  authorId  Int
  tags      Tag[]
  createdAt DateTime  @default(now())

  @@index([authorId])
  @@index([published, createdAt])
}

model Tag {
  id    Int    @id @default(autoincrement())
  name  String @unique
  posts Post[]
}
```

### マイグレーション操作

```bash
# マイグレーション作成
npx prisma migrate dev --name add_user_table

# 本番適用
npx prisma migrate deploy

# マイグレーション状態確認
npx prisma migrate status

# リセット（開発のみ）
npx prisma migrate reset
```

### 生成されるSQLの例

```sql
-- prisma/migrations/20260305_add_user_table/migration.sql
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
```

---

## Drizzle Kit

### スキーマ定義

```typescript
// drizzle/schema.ts
import { pgTable, serial, text, boolean, timestamp, integer, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
}));

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  published: boolean('published').default(false),
  authorId: integer('author_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  authorIdx: index('posts_author_idx').on(table.authorId),
}));
```

### マイグレーション操作

```bash
# マイグレーション生成
npx drizzle-kit generate

# 適用
npx drizzle-kit migrate

# DBスキーマをプッシュ（開発用、マイグレーションファイルなし）
npx drizzle-kit push

# Drizzle Studioで確認
npx drizzle-kit studio
```

### drizzle.config.ts

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

---

## ゼロダウンタイムマイグレーション

本番環境でサービスを止めずにスキーマを変更するための戦略です。

### 危険な操作と安全な代替

| 操作 | 危険度 | 安全な方法 |
|------|--------|-----------|
| カラム追加 | 低 | そのままADD COLUMN（NULLableで） |
| カラム削除 | **高** | 3段階で実施（後述） |
| カラム名変更 | **高** | 新カラム追加→データコピー→旧カラム削除 |
| テーブル名変更 | **高** | VIEWで互換性維持 |
| NOT NULL追加 | 中 | デフォルト値を設定してから |
| インデックス追加 | 中 | CONCURRENTLY を使用 |

### カラム削除の3段階パターン

```
Step 1: アプリケーションからカラムの参照を削除
        → デプロイ
        → カラムは残っているがアプリは使わない

Step 2: マイグレーションでカラムを削除
        → デプロイ
        → 安全に削除できる
```

```sql
-- Step 2のマイグレーション
ALTER TABLE users DROP COLUMN IF EXISTS legacy_field;
```

### カラム名変更の安全な方法

```sql
-- Step 1: 新カラムを追加
ALTER TABLE users ADD COLUMN display_name TEXT;

-- Step 2: データをコピー
UPDATE users SET display_name = name;

-- Step 3: アプリで新カラムを使用（デプロイ）

-- Step 4: 旧カラムを削除（次のデプロイ）
ALTER TABLE users DROP COLUMN name;
```

### インデックスの安全な追加

```sql
-- ❌ 危険: テーブルロックが発生
CREATE INDEX idx_users_email ON users (email);

-- ✅ 安全: ロックなしで作成（PostgreSQL）
CREATE INDEX CONCURRENTLY idx_users_email ON users (email);
```

---

## ロールバック戦略

### 方法1: Downマイグレーション

```typescript
// Knex.jsの例
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('notifications', (table) => {
    table.increments('id');
    table.integer('user_id').references('users.id');
    table.text('message').notNull();
    table.boolean('read').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notifications');
}
```

### 方法2: 前方互換マイグレーション

```
原則: すべてのマイグレーションは、1つ前のアプリバージョンと互換性を持つ

バージョンN: users テーブルに name カラムがある
バージョンN+1: display_name を追加（nameも残す）
バージョンN+2: name を削除

→ N+1のマイグレーション後、N+1にロールバックしても動く
→ N+2のマイグレーション後、N+1にロールバックしても動く
```

---

## CI/CDとの統合

### GitHub Actions

```yaml
name: Database Migration

on:
  push:
    branches: [main]
    paths:
      - 'prisma/migrations/**'
      - 'prisma/schema.prisma'

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci

      - name: マイグレーション適用
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: マイグレーション確認
        run: npx prisma migrate status
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### PRでのマイグレーション検証

```yaml
  verify:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - run: npm ci

      - name: マイグレーションをテストDBに適用
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test

      - name: シードデータ投入
        run: npx prisma db seed
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test

      - name: テスト実行
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
```

---

## 大規模テーブルのマイグレーション

### バッチ更新

```sql
-- ❌ 危険: 1億行を一度に更新
UPDATE users SET status = 'active' WHERE status IS NULL;

-- ✅ 安全: バッチで更新
DO $$
DECLARE
  batch_size INT := 10000;
  rows_updated INT;
BEGIN
  LOOP
    UPDATE users
    SET status = 'active'
    WHERE id IN (
      SELECT id FROM users
      WHERE status IS NULL
      LIMIT batch_size
      FOR UPDATE SKIP LOCKED
    );

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    EXIT WHEN rows_updated = 0;

    COMMIT;
    PERFORM pg_sleep(0.1); -- 負荷を分散
  END LOOP;
END $$;
```

### gh-ostによるオンラインスキーマ変更（MySQL）

```bash
# テーブルを停止させずにカラム追加
gh-ost \
  --host=db.example.com \
  --database=myapp \
  --table=users \
  --alter="ADD COLUMN phone VARCHAR(20)" \
  --execute
```

---

## ベストプラクティス

### マイグレーション命名規則

```
YYYYMMDDHHMMSS_description.sql

例:
20260305120000_create_users_table.sql
20260305120100_add_email_index_to_users.sql
20260305120200_create_posts_table.sql
20260305120300_add_published_column_to_posts.sql
```

### チェックリスト

```
マイグレーション作成時:
☐ 前方互換性があるか（1つ前のバージョンで動くか）
☐ ロールバック可能か
☐ 大きなテーブルの場合、ロックが長くならないか
☐ インデックスはCONCURRENTLYで作成しているか
☐ NOT NULL制約はデフォルト値付きか

適用前:
☐ ステージング環境でテスト済みか
☐ バックアップを取得したか
☐ 実行時間を見積もったか
☐ ロールバック手順を準備したか
```

---

## まとめ

| ユースケース | おすすめツール |
|------------|-------------|
| TypeScript + SQL生成したい | Prisma Migrate |
| TypeScript + 軽量がいい | Drizzle Kit |
| Python + SQLAlchemy | Alembic |
| SQL直書きしたい | Flyway / golang-migrate |
| Java/Kotlin | Flyway / Liquibase |

マイグレーションは**インフラのバージョン管理**です。コードと同様にgitで管理し、CI/CDで自動適用し、ゼロダウンタイムで運用する——この仕組みを整えることで、スキーマ変更のリスクを最小化できます。

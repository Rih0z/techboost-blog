---
title: 'Drizzle Studio実践ガイド: ブラウザベースのデータベースGUIとスキーマ管理'
description: 'Drizzle Studioを使った視覚的なデータベース管理、ブラウザベースのGUIツール、データ操作、スキーマエディタ、本番環境での活用方法を実践的に解説します。'
pubDate: '2025-08-15'
updatedDate: '2025-08-15'
category: 'データベース'
tags: ['Drizzle', 'Database', 'ORM', 'TypeScript', 'GUI']
---

# Drizzle Studio実践ガイド

Drizzle Studioは、Drizzle ORMに組み込まれたブラウザベースのデータベースGUIツールです。Prisma Studioのような視覚的なデータベース管理機能を提供しながら、軽量で高速に動作します。

本記事では、Drizzle Studioの実践的な使い方、データ操作、スキーマ管理、本番環境での活用まで詳しく解説します。

## Drizzle Studioとは

### 主な機能

1. **ブラウザベースGUI** - Webインターフェースでデータベースを視覚的に管理
2. **データ閲覧・編集** - テーブルデータのCRUD操作
3. **リレーション表示** - テーブル間の関連を視覚化
4. **SQLクエリ実行** - カスタムクエリの実行と結果表示
5. **スキーマビュー** - データベース構造の可視化
6. **複数DB対応** - PostgreSQL、MySQL、SQLite、Tursoをサポート

### 他のGUIツールとの比較

```typescript
// Prisma Studio
// - 機能豊富だが重い
// - Prismaエコシステムに依存
// - バンドルサイズ大

// Drizzle Studio
// - 軽量で高速起動
// - Drizzle ORMに統合
// - エッジ環境でも動作可能
// - 設定ファイル不要

// 従来のGUIツール（TablePlus、DBeaver）
// - インストール必要
// - デスクトップアプリ
// - プロジェクト外のツール
```

## セットアップ

### 基本インストール

```bash
# Drizzle ORMとDrizzle Kit（Studioを含む）
npm install drizzle-orm
npm install -D drizzle-kit

# データベースドライバー
npm install postgres          # PostgreSQL
npm install @libsql/client    # Turso
npm install mysql2            # MySQL
npm install better-sqlite3    # SQLite
```

### Drizzle設定ファイル

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  // Studio用の設定
  verbose: true,
  strict: true,
} satisfies Config
```

### Studio起動

```bash
# デフォルトポート（4983）で起動
npx drizzle-kit studio

# カスタムポート指定
npx drizzle-kit studio --port 5555

# 特定の設定ファイル使用
npx drizzle-kit studio --config drizzle.config.prod.ts

# ブラウザが自動で開きます
# https://local.drizzle.studio
```

## 基本的な使い方

### データベース接続

Drizzle Studioは `drizzle.config.ts` の設定を自動的に読み込みます。

```typescript
// 開発環境
export default {
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
} satisfies Config

// 本番環境（読み取り専用）
export default {
  dbCredentials: {
    connectionString: process.env.DATABASE_URL_READONLY,
  },
} satisfies Config
```

### テーブルビュー

```
┌─────────────────────────────────────────┐
│ Tables                                  │
├─────────────────────────────────────────┤
│ ☐ users          (125 rows)             │
│ ☐ posts          (1,234 rows)           │
│ ☐ comments       (5,678 rows)           │
│ ☐ categories     (12 rows)              │
└─────────────────────────────────────────┘

テーブルをクリックすると、データグリッドが表示されます。
```

### データ閲覧

```
users テーブル
┌────┬──────────┬─────────────────────┬──────────┬──────────────────────┐
│ id │ name     │ email               │ role     │ createdAt            │
├────┼──────────┼─────────────────────┼──────────┼──────────────────────┤
│ 1  │ John Doe │ john@example.com    │ admin    │ 2025-01-01 10:00:00  │
│ 2  │ Jane Doe │ jane@example.com    │ user     │ 2025-01-02 11:30:00  │
│ 3  │ Bob      │ bob@example.com     │ user     │ 2025-01-03 14:20:00  │
└────┴──────────┴─────────────────────┴──────────┴──────────────────────┘

機能:
- フィルタリング
- ソート（カラムヘッダークリック）
- ページネーション
- 検索
- 列の表示/非表示切り替え
```

## データ操作

### データ追加

```
1. テーブルビューで「+ Add Row」をクリック
2. フォームに入力:

   Name: ────────────────────
         Alice Smith

   Email: ───────────────────
          alice@example.com

   Role: ────▼───────────────
         user

   [Cancel]  [Save]

3. 「Save」で新しいレコード作成
```

フォームは、Drizzleスキーマ定義から自動生成されます。

```typescript
// スキーマ定義
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  role: roleEnum('role').default('user').notNull(),
  bio: text('bio'), // optional
  createdAt: timestamp('created_at').defaultNow(),
})

// Studioが自動的に:
// - 必須フィールドをバリデーション（notNull）
// - デフォルト値を設定（default）
// - Enumをドロップダウンで表示（pgEnum）
// - 自動生成フィールドを非表示（serial、defaultNow）
```

### データ編集

```
1. 行をクリックして編集モード

   ┌─────────────────────────────────────┐
   │ Edit User                           │
   ├─────────────────────────────────────┤
   │ Name:    [John Doe              ]   │
   │ Email:   [john@example.com      ]   │
   │ Role:    [admin            ▼]       │
   │ Bio:     [Software engineer     ]   │
   │          [working on web apps   ]   │
   │                                     │
   │ Created: 2025-01-01 10:00:00        │
   │ Updated: 2025-08-15 15:30:00        │
   │                                     │
   │ [Delete]      [Cancel]  [Save]      │
   └─────────────────────────────────────┘

2. フィールドを編集
3. 「Save」で変更を保存
```

### データ削除

```
方法1: 編集モードから
  - 行をクリック → 「Delete」ボタン

方法2: 一括選択
  - 複数行にチェック → 「Delete Selected」
```

### JSONフィールドの編集

```typescript
// スキーマ定義
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  metadata: json('metadata').$type<{
    preferences: {
      theme: 'light' | 'dark'
      language: string
    }
    settings: Record<string, any>
  }>(),
})

// Studioでの編集
┌─────────────────────────────────────────┐
│ Metadata (JSON)                         │
├─────────────────────────────────────────┤
│ {                                       │
│   "preferences": {                      │
│     "theme": "dark",                    │
│     "language": "ja"                    │
│   },                                    │
│   "settings": {                         │
│     "notifications": true,              │
│     "email": "daily"                    │
│   }                                     │
│ }                                       │
├─────────────────────────────────────────┤
│ [Format]  [Validate]  [Collapse All]    │
└─────────────────────────────────────────┘

- シンタックスハイライト
- 自動フォーマット
- JSONバリデーション
```

## リレーション管理

### 1対多のリレーション

```typescript
// スキーマ定義
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
})

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  authorId: integer('author_id').references(() => users.id),
})

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}))

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}))
```

Studioでの表示:

```
users テーブル（id: 1）
┌────────────────────────────────────────┐
│ User Details                           │
├────────────────────────────────────────┤
│ ID:    1                               │
│ Name:  John Doe                        │
│                                        │
│ Posts (3) ▼                            │
│  ┌─────────────────────────────────┐   │
│  │ • My First Post                 │   │
│  │ • Learn Drizzle ORM             │   │
│  │ • Database Management Tips      │   │
│  └─────────────────────────────────┘   │
│                                        │
│ [View Posts in Table]                  │
└────────────────────────────────────────┘

投稿をクリックすると、関連する投稿レコードへジャンプ
```

### 多対多のリレーション

```typescript
// タグシステムの例
export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }),
})

export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }),
})

export const postsToTags = pgTable('posts_to_tags', {
  postId: integer('post_id').references(() => posts.id),
  tagId: integer('tag_id').references(() => tags.id),
})

export const postsRelations = relations(posts, ({ many }) => ({
  postsToTags: many(postsToTags),
}))

export const tagsRelations = relations(tags, ({ many }) => ({
  postsToTags: many(postsToTags),
}))

export const postsToTagsRelations = relations(postsToTags, ({ one }) => ({
  post: one(posts, {
    fields: [postsToTags.postId],
    references: [posts.id],
  }),
  tag: one(tags, {
    fields: [postsToTags.tagId],
    references: [tags.id],
  }),
}))
```

Studioでの表示:

```
posts テーブル（id: 5）
┌────────────────────────────────────────┐
│ Post: "Learn Drizzle ORM"              │
├────────────────────────────────────────┤
│ Tags (3) ▼                             │
│  ┌─────────────────────────────────┐   │
│  │ [×] TypeScript                  │   │
│  │ [×] Database                    │   │
│  │ [×] ORM                         │   │
│  │                                 │   │
│  │ [+ Add Tag]                     │   │
│  └─────────────────────────────────┘   │
└────────────────────────────────────────┘

- タグの追加/削除が可能
- 中間テーブル（postsToTags）は自動管理
```

## フィルタリングとクエリ

### 基本フィルター

```
users テーブル
┌─────────────────────────────────────────┐
│ Filters                                 │
├─────────────────────────────────────────┤
│ Role:      [admin        ▼]             │
│ Status:    [active       ▼]             │
│ Created:   [Last 30 days ▼]             │
│                                         │
│ [Apply]  [Reset]                        │
└─────────────────────────────────────────┘

結果: 3 rows
```

### 高度な検索

```
┌─────────────────────────────────────────┐
│ Advanced Search                         │
├─────────────────────────────────────────┤
│ Field:     [email        ▼]             │
│ Operator:  [contains     ▼]             │
│ Value:     [gmail.com        ]          │
│                                         │
│ [+ Add Condition]                       │
│                                         │
│ AND/OR: [AND ▼]                         │
│                                         │
│ Field:     [role         ▼]             │
│ Operator:  [equals       ▼]             │
│ Value:     [user         ▼]             │
│                                         │
│ [Search]  [Clear]                       │
└─────────────────────────────────────────┘

生成されるSQL:
SELECT * FROM users
WHERE email LIKE '%gmail.com%'
  AND role = 'user';
```

### カスタムSQLクエリ

```sql
-- SQLタブで直接クエリを実行

-- 投稿数の多いユーザーを取得
SELECT
  u.id,
  u.name,
  COUNT(p.id) as post_count
FROM users u
LEFT JOIN posts p ON p.author_id = u.id
GROUP BY u.id, u.name
ORDER BY post_count DESC
LIMIT 10;

結果:
┌────┬──────────┬────────────┐
│ id │ name     │ post_count │
├────┼──────────┼────────────┤
│ 5  │ Alice    │ 45         │
│ 2  │ Jane     │ 32         │
│ 1  │ John     │ 28         │
└────┴──────────┴────────────┘

[Export CSV]  [Export JSON]
```

## スキーマ管理

### スキーマビジュアライザー

```
┌─────────────────────────────────────────┐
│ Database Schema                         │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────┐         ┌──────────┐     │
│  │  users   │────1:N──│  posts   │     │
│  ├──────────┤         ├──────────┤     │
│  │ id       │         │ id       │     │
│  │ name     │         │ title    │     │
│  │ email    │         │ authorId │     │
│  └──────────┘         └──────────┘     │
│       │                     │          │
│      1:N                   M:N         │
│       │                     │          │
│  ┌──────────┐         ┌──────────┐     │
│  │ comments │         │   tags   │     │
│  ├──────────┤         ├──────────┤     │
│  │ id       │         │ id       │     │
│  │ content  │         │ name     │     │
│  │ userId   │         └──────────┘     │
│  │ postId   │                          │
│  └──────────┘                          │
│                                         │
│ [Export Schema]  [Generate Diagram]     │
└─────────────────────────────────────────┘
```

### マイグレーション履歴

```
┌─────────────────────────────────────────┐
│ Migrations                              │
├─────────────────────────────────────────┤
│ ✓ 0001_initial_schema.sql               │
│   Applied: 2025-01-01 10:00:00          │
│                                         │
│ ✓ 0002_add_user_roles.sql               │
│   Applied: 2025-02-15 14:30:00          │
│                                         │
│ ✓ 0003_add_posts_table.sql              │
│   Applied: 2025-05-20 09:15:00          │
│                                         │
│ ⊗ 0004_add_tags_system.sql (pending)    │
│                                         │
│ [Run Pending]  [Rollback]  [Generate]   │
└─────────────────────────────────────────┘
```

## 本番環境での活用

### 読み取り専用モード

```typescript
// drizzle.config.prod.ts
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    // 読み取り専用レプリカを使用
    connectionString: process.env.DATABASE_URL_READONLY!,
  },
  // Studio設定
  studio: {
    readOnly: true, // 編集を無効化
    port: 4983,
  },
} satisfies Config
```

起動:

```bash
# 本番DBを読み取り専用で閲覧
npx drizzle-kit studio --config drizzle.config.prod.ts

# データ閲覧・クエリ実行のみ可能
# INSERT/UPDATE/DELETEは無効化
```

### SSHトンネル経由の接続

```bash
# 本番DBへのSSHトンネルを作成
ssh -L 5432:localhost:5432 user@production-server

# 別ターミナルでStudio起動
DATABASE_URL="postgresql://user:pass@localhost:5432/db" \
  npx drizzle-kit studio
```

### 環境変数による切り替え

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit'

const isDev = process.env.NODE_ENV === 'development'

export default {
  schema: './src/db/schema.ts',
  dbCredentials: {
    connectionString: isDev
      ? process.env.DATABASE_URL_DEV!
      : process.env.DATABASE_URL_READONLY!,
  },
  studio: {
    readOnly: !isDev, // 本番は読み取り専用
  },
} satisfies Config
```

## チーム開発での活用

### ローカル開発

```bash
# 各開発者のローカル環境
npm run db:studio

# package.json
{
  "scripts": {
    "db:studio": "drizzle-kit studio",
    "db:studio:prod": "drizzle-kit studio --config drizzle.config.prod.ts"
  }
}
```

### ステージング環境

```yaml
# docker-compose.yml
version: '3.8'
services:
  db:
    image: postgres:16
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: devpass

  studio:
    image: node:20
    working_dir: /app
    volumes:
      - .:/app
    ports:
      - "4983:4983"
    command: npx drizzle-kit studio --host 0.0.0.0
    depends_on:
      - db
    environment:
      DATABASE_URL: postgresql://dev:devpass@db:5432/myapp
```

起動:

```bash
docker-compose up studio

# チーム全員が http://localhost:4983 でアクセス可能
```

## トラブルシューティング

### 接続エラー

```typescript
// エラー: Could not connect to database

// 解決策1: 接続文字列を確認
console.log(process.env.DATABASE_URL)

// 解決策2: データベースが起動しているか確認
// PostgreSQLの場合
psql -U postgres -c "SELECT version();"

// 解決策3: ファイアウォール・ネットワーク設定
// ローカルDBの場合、localhost or 127.0.0.1を使用
```

### スキーマ同期エラー

```bash
# エラー: Schema out of sync

# 解決策: マイグレーションを実行
npx drizzle-kit push:pg

# または、マイグレーションファイル生成
npx drizzle-kit generate:pg
npx tsx src/db/migrate.ts
```

### パフォーマンス問題

```typescript
// 大量データのテーブルが遅い場合

// 解決策1: ページネーション設定
export default {
  studio: {
    pagination: {
      default: 50, // デフォルト表示件数
      max: 500,    // 最大表示件数
    },
  },
} satisfies Config

// 解決策2: インデックス追加
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
}))
```

## ベストプラクティス

### 1. 開発環境でのみ使用

```typescript
// 本番環境では読み取り専用モードか、完全に無効化
if (process.env.NODE_ENV === 'production') {
  // Studioを起動しない
} else {
  // 開発環境のみ起動
  execSync('drizzle-kit studio')
}
```

### 2. データベース接続の管理

```typescript
// 環境ごとに異なる接続文字列
const configs = {
  development: process.env.DATABASE_URL_DEV,
  staging: process.env.DATABASE_URL_STAGING,
  production: process.env.DATABASE_URL_READONLY, // 読み取り専用
}
```

### 3. スキーマファイルの整理

```typescript
// 大規模プロジェクトではスキーマを分割
// src/db/schema/users.ts
export const users = pgTable('users', {...})
export const usersRelations = relations(users, {...})

// src/db/schema/posts.ts
export const posts = pgTable('posts', {...})
export const postsRelations = relations(posts, {...})

// src/db/schema/index.ts
export * from './users'
export * from './posts'

// drizzle.config.ts
export default {
  schema: './src/db/schema/index.ts',
} satisfies Config
```

## まとめ

Drizzle Studioは、以下の点で優れたデータベースGUIツールです。

### 主な利点

1. **軽量で高速** - Prisma Studioより起動が速い
2. **設定不要** - drizzle.config.tsがあればすぐ使える
3. **統合性** - Drizzle ORMとシームレスに連携
4. **柔軟性** - 開発から本番まで様々な環境で利用可能

### 使い分け

```typescript
// 開発環境
// - フル機能で使用
// - データ作成・編集・削除

// ステージング環境
// - チームでの共有
// - テストデータ確認

// 本番環境
// - 読み取り専用モード
// - デバッグ・調査用途のみ
```

Drizzle Studioを活用することで、データベース操作が視覚的かつ効率的になり、開発体験が大幅に向上します。

## 参考リンク

- [Drizzle Studio公式ドキュメント](https://orm.drizzle.team/drizzle-studio/overview)
- [Drizzle ORM公式サイト](https://orm.drizzle.team/)
- [Drizzle Kit CLI](https://orm.drizzle.team/kit-docs/overview)

---
title: 'Drizzle Studio完全ガイド - データベースを可視化する次世代GUIツール'
description: 'Drizzle Studioの使い方を徹底解説。ブラウザベースのデータベース管理、マイグレーション可視化、クエリビルダー、リアルタイム編集機能の実践的な活用方法を完全網羅。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。'
pubDate: 'Feb 05 2026'
tags: ['Drizzle', 'Database', 'GUI', 'Development Tools', 'TypeScript']
---
# Drizzle Studio完全ガイド

## はじめに

Drizzle Studioは、Drizzle ORMの公式GUIツールとして2024年にリリースされ、2026年現在、データベース管理の標準ツールとして広く採用されています。

### Drizzle Studioとは

Drizzle Studioは、**ブラウザベースのデータベース管理ツール**で、以下の特徴があります。

- **完全無料**: オープンソース、制限なし
- **ローカル実行**: データはローカルに保持、セキュア
- **型安全**: Drizzleスキーマと完全統合
- **リアルタイム編集**: データの直接編集が可能
- **複数DB対応**: PostgreSQL、MySQL、SQLite対応
- **マイグレーション可視化**: スキーマ変更履歴を視覚的に確認
- **クエリビルダー**: SQLを書かずにクエリ作成

### Prisma Studioとの比較

| 項目 | Prisma Studio | Drizzle Studio |
|---|---|---|
| **料金** | 無料（Prisma利用者のみ） | 完全無料 |
| **起動速度** | やや遅い | 高速 |
| **メモリ消費** | 中〜高 | 低 |
| **スキーマ定義** | schema.prisma | TypeScript |
| **クエリ実行** | 限定的 | 柔軟 |
| **マイグレーション** | 別ツール | 統合 |
| **リレーション表示** | 良好 | 優秀 |
| **カスタマイズ** | 限定的 | 高い |

## セットアップ

### インストール

Drizzle Studioは`drizzle-kit`に含まれています。

```bash
# プロジェクトにインストール
npm install -D drizzle-kit

# またはグローバルインストール
npm install -g drizzle-kit
```

### プロジェクト構造

```
my-app/
├── drizzle/
│   ├── 0000_initial.sql
│   ├── 0001_add_users.sql
│   └── meta/
│       └── _journal.json
├── src/
│   └── db/
│       ├── schema.ts
│       └── index.ts
├── drizzle.config.ts
└── package.json
```

### 設定ファイル

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'pg', // 'mysql' | 'better-sqlite' | 'turso'
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

### 環境変数設定

```bash
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
```

## 起動方法

### 基本的な起動

```bash
# デフォルトポート5555で起動
npx drizzle-kit studio

# カスタムポート指定
npx drizzle-kit studio --port 3333

# 特定のホストでリッスン
npx drizzle-kit studio --host 0.0.0.0
```

起動後、ブラウザで`http://localhost:5555`を開きます。

### package.json script

```json
{
  "scripts": {
    "db:studio": "drizzle-kit studio",
    "db:generate": "drizzle-kit generate:pg",
    "db:push": "drizzle-kit push:pg"
  }
}
```

実行:

```bash
npm run db:studio
```

### 複数データベース接続

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    // 環境変数で接続先を切り替え
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

```bash
# 開発環境
DATABASE_URL="postgresql://localhost:5432/dev" npm run db:studio

# ステージング環境
DATABASE_URL="postgresql://staging-db:5432/staging" npm run db:studio
```

## インターフェース概要

### メインビュー

Drizzle Studioのインターフェースは以下の要素で構成されます。

1. **サイドバー**: テーブル一覧
2. **テーブルビュー**: データ表示・編集
3. **クエリビルダー**: フィルタ・ソート
4. **スキーマビュー**: テーブル構造確認
5. **マイグレーション**: 変更履歴

### サイドバー

```
📦 Database
├── 👥 users (125)
├── 📝 posts (342)
├── 💬 comments (1,203)
├── 🏷️ tags (45)
└── 🔗 post_tags (678)
```

- テーブル名横の数字は行数
- クリックでテーブルビューに切り替え

### テーブルビュー

| id | name | email | created_at |
|----|------|-------|------------|
| 1 | Alice | alice@example.com | 2026-01-15 |
| 2 | Bob | bob@example.com | 2026-01-16 |

- セルをダブルクリックで編集開始
- 右クリックメニューでコピー・削除
- ページネーション対応（1000行まで表示）

## データ操作

### データの閲覧

```
1. サイドバーからテーブル選択
2. データが自動的に読み込まれる
3. スクロールで全データ確認
```

### フィルタリング

```
例: usersテーブルで年齢が30以上を抽出

1. "Add Filter"ボタンをクリック
2. カラム: age
3. 演算子: >=
4. 値: 30
5. "Apply"をクリック
```

サポートされる演算子:

- `=` 等しい
- `!=` 等しくない
- `>` より大きい
- `>=` 以上
- `<` より小さい
- `<=` 以下
- `LIKE` パターンマッチ
- `IN` リスト内に存在
- `IS NULL` NULLである
- `IS NOT NULL` NULLでない

### 複数フィルタの組み合わせ

```
例: アクティブで年齢が25-35のユーザー

Filter 1:
  age >= 25

Filter 2:
  age <= 35

Filter 3:
  is_active = true

論理演算子: AND
```

### ソート

```
1. カラムヘッダーをクリック
2. 昇順（↑）または降順（↓）
3. 複数カラムでのソートも可能
```

### データの追加

```
1. "Add Row"ボタンをクリック
2. 各フィールドに値を入力
3. "Save"をクリック
```

例: 新しいユーザーを追加

```
name: Charlie
email: charlie@example.com
age: 27
is_active: true
```

保存すると、自動的にIDが採番され、`created_at`にはデフォルト値が設定されます。

### データの編集

```
1. 編集したいセルをダブルクリック
2. 値を変更
3. Enterキーまたは外側をクリックで保存
```

**一括編集**:

```
1. 複数行を選択（Shiftキー + クリック）
2. 右クリック → "Edit Selected"
3. 共通フィールドを一括変更
```

### データの削除

```
単一行削除:
1. 行を選択
2. 右クリック → "Delete Row"
3. 確認ダイアログで"Delete"

複数行削除:
1. 複数行を選択
2. 右クリック → "Delete Selected Rows"
3. 確認後削除
```

### データのエクスポート

```
1. "Export"ボタンをクリック
2. フォーマット選択:
   - JSON
   - CSV
   - SQL INSERT文
3. "Download"をクリック
```

エクスポート例（JSON）:

```json
[
  {
    "id": 1,
    "name": "Alice",
    "email": "alice@example.com",
    "age": 28,
    "is_active": true,
    "created_at": "2026-01-15T10:30:00Z"
  },
  {
    "id": 2,
    "name": "Bob",
    "email": "bob@example.com",
    "age": 32,
    "is_active": true,
    "created_at": "2026-01-16T14:22:00Z"
  }
]
```

### データのインポート

```
1. "Import"ボタンをクリック
2. ファイル選択（JSON/CSV）
3. カラムマッピング確認
4. "Import"実行
```

CSV例:

```csv
name,email,age
David,david@example.com,29
Eve,eve@example.com,26
```

## リレーション表示

### 外部キーの可視化

スキーマ定義:

```typescript
// src/db/schema.ts
import { pgTable, serial, varchar, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }),
  authorId: integer('author_id').references(() => users.id),
});
```

Drizzle Studioでの表示:

```
posts テーブル:

| id | title | author_id |
|----|-------|-----------|
| 1  | Hello | 🔗 1      |
| 2  | World | 🔗 1      |
| 3  | Test  | 🔗 2      |

🔗 アイコンをクリックすると、usersテーブルの該当行にジャンプ
```

### リレーションデータの表示

```
1. posts テーブルを開く
2. author_id の 🔗 アイコンをクリック
3. users テーブルの該当ユーザーが表示される
```

### 逆リレーション（Reverse Join）

```
1. users テーブルを開く
2. ユーザー行を選択
3. "Show Related" → "posts"
4. そのユーザーの全投稿が表示される
```

### ER図表示

```
1. "Schema" タブをクリック
2. ER図が自動生成される
3. テーブル間のリレーションが線で表示
4. ズーム・パン操作可能
```

ER図例:

```
┌─────────────┐       ┌──────────────┐
│   users     │       │    posts     │
├─────────────┤       ├──────────────┤
│ id (PK)     │◄──────┤ author_id(FK)│
│ name        │       │ title        │
│ email       │       │ content      │
└─────────────┘       └──────────────┘
```

## スキーマビュー

### テーブル構造の確認

```
1. サイドバーでテーブル選択
2. "Schema" タブをクリック
3. カラム定義、制約、インデックスを確認
```

表示内容:

```
Table: users

Columns:
┌────────────┬──────────┬──────────┬─────────┬─────────┐
│ Name       │ Type     │ Nullable │ Default │ Extra   │
├────────────┼──────────┼──────────┼─────────┼─────────┤
│ id         │ serial   │ NO       │ -       │ PK, AI  │
│ name       │ varchar  │ YES      │ NULL    │ -       │
│ email      │ varchar  │ NO       │ -       │ UNIQUE  │
│ created_at │ timestamp│ YES      │ now()   │ -       │
└────────────┴──────────┴──────────┴─────────┴─────────┘

Indexes:
- PRIMARY KEY (id)
- UNIQUE (email)

Foreign Keys:
- None
```

### インデックス情報

```
Indexes on posts:

1. PRIMARY KEY (id)
2. INDEX idx_author (author_id)
3. INDEX idx_created (created_at DESC)
```

インデックスのパフォーマンス影響も確認可能。

### 制約の確認

```
Constraints on users:

1. PRIMARY KEY (id)
2. UNIQUE (email)
3. CHECK (age >= 0)
4. NOT NULL (name, email)
```

### DDL出力

```
1. "Schema" タブ
2. "Show DDL"ボタンをクリック
3. CREATE TABLE文が表示される
```

出力例:

```sql
CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255),
  "email" VARCHAR(255) NOT NULL UNIQUE,
  "age" INTEGER CHECK (age >= 0),
  "created_at" TIMESTAMP DEFAULT NOW()
);
```

## マイグレーション管理

### マイグレーション履歴の表示

```
1. "Migrations" タブをクリック
2. 適用済みマイグレーション一覧が表示
```

表示例:

```
Migrations:

✅ 0000_initial.sql (2026-01-10 10:00)
   - Create users table
   - Create posts table

✅ 0001_add_comments.sql (2026-01-15 14:30)
   - Create comments table
   - Add foreign keys

✅ 0002_add_tags.sql (2026-01-20 09:15)
   - Create tags table
   - Create post_tags junction table

⏳ 0003_add_user_avatar.sql (Pending)
   - Add avatar column to users
```

### マイグレーションの可視化

各マイグレーションをクリックすると詳細が表示されます。

```sql
-- 0001_add_comments.sql

CREATE TABLE "comments" (
  "id" SERIAL PRIMARY KEY,
  "content" TEXT NOT NULL,
  "post_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW()
);

ALTER TABLE "comments"
  ADD CONSTRAINT "comments_post_id_fk"
  FOREIGN KEY ("post_id") REFERENCES "posts"("id");

ALTER TABLE "comments"
  ADD CONSTRAINT "comments_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id");
```

変更内容のサマリー:

```
📊 Changes:
+ 1 table created (comments)
+ 2 foreign keys added
+ 0 indexes added
```

### マイグレーション生成

Drizzle Studioから直接マイグレーション生成も可能です。

```
1. スキーマファイルを編集
2. Drizzle Studioに戻る
3. "Generate Migration"ボタン
4. 差分が自動検出される
5. マイグレーション名を入力
6. "Generate"で生成
```

例: usersテーブルに`avatar`カラム追加

```typescript
// schema.ts
export const users = pgTable('users', {
  // 既存カラム...
  avatar: varchar('avatar', { length: 255 }),
});
```

生成されるマイグレーション:

```sql
-- 0003_add_user_avatar.sql
ALTER TABLE "users" ADD COLUMN "avatar" VARCHAR(255);
```

### マイグレーションの実行

```
1. "Migrations" タブ
2. 未適用マイグレーションを選択
3. "Run Migration"ボタン
4. 確認ダイアログで"Execute"
```

**ロールバック**（SQLiteのみ）:

```
1. 適用済みマイグレーション選択
2. "Rollback"ボタン
3. 確認後実行
```

### マイグレーションの検証

```
1. マイグレーション選択
2. "Validate"ボタン
3. 構文チェック実行
4. エラーがあれば赤色で表示
```

検証例:

```
✅ Syntax: Valid
✅ References: All foreign keys exist
⚠️ Warning: Column 'old_name' not found (drop column)
```

## クエリビルダー

### ビジュアルクエリ作成

```
1. "Query" タブをクリック
2. テーブル選択
3. フィルタ追加
4. ソート設定
5. "Execute"で実行
```

### WHERE句の構築

```
例: 年齢が25-35で、アクティブなユーザー

Table: users

Filters:
  age >= 25 AND
  age <= 35 AND
  is_active = true

Sort:
  created_at DESC

Limit: 50
```

生成されるSQL:

```sql
SELECT * FROM "users"
WHERE "age" >= 25
  AND "age" <= 35
  AND "is_active" = true
ORDER BY "created_at" DESC
LIMIT 50;
```

### JOIN操作

```
例: 投稿とその著者を取得

Table: posts
Join: users ON posts.author_id = users.id

Columns:
  posts.title
  posts.created_at
  users.name AS author_name

Filters:
  posts.published = true

Sort:
  posts.created_at DESC
```

生成されるSQL:

```sql
SELECT
  "posts"."title",
  "posts"."created_at",
  "users"."name" AS "author_name"
FROM "posts"
INNER JOIN "users" ON "posts"."author_id" = "users"."id"
WHERE "posts"."published" = true
ORDER BY "posts"."created_at" DESC;
```

### 集計クエリ

```
例: ユーザーごとの投稿数

Table: posts
Group By: author_id
Aggregation:
  COUNT(*) AS post_count

Join: users ON posts.author_id = users.id

Columns:
  users.name
  COUNT(*) AS post_count

Having:
  COUNT(*) > 5
```

生成されるSQL:

```sql
SELECT
  "users"."name",
  COUNT(*) AS "post_count"
FROM "posts"
INNER JOIN "users" ON "posts"."author_id" = "users"."id"
GROUP BY "posts"."author_id", "users"."name"
HAVING COUNT(*) > 5;
```

### クエリの保存

```
1. クエリを作成
2. "Save Query"ボタン
3. 名前を入力（例: "Active users over 25"）
4. "Save"

保存したクエリは"Saved Queries"から再利用可能
```

### クエリのエクスポート

```
1. クエリを実行
2. "Export Results"
3. フォーマット選択（JSON/CSV/SQL）
4. ダウンロード
```

## 実践的な使い方

### 開発時のデバッグ

```
シナリオ: アプリケーションでデータが正しく保存されない

1. Drizzle Studioを起動
2. 該当テーブルを開く
3. フィルタで問題のあるレコードを検索
4. データの内容を確認
5. 必要に応じて手動修正
6. アプリケーションで再テスト
```

### テストデータの準備

```
1. テーブルを開く
2. "Import"ボタン
3. CSVファイルをアップロード
4. カラムマッピング確認
5. "Import"実行
```

CSVの例:

```csv
name,email,age
Test User 1,test1@example.com,25
Test User 2,test2@example.com,30
Test User 3,test3@example.com,35
```

### スキーマの確認と検証

```
1. "Schema" タブを開く
2. ER図で全体構造を確認
3. テーブルごとにカラム定義をチェック
4. インデックスの有無を確認
5. 外部キー制約を検証
```

### パフォーマンス分析

```
1. "Query" タブでクエリ作成
2. "Explain"ボタンをクリック
3. クエリプラン確認
4. ボトルネックを特定
5. インデックス追加を検討
```

EXPLAIN結果例:

```
Seq Scan on users (cost=0.00..35.50 rows=1250 width=48)
  Filter: (age >= 25)

→ インデックスがないため全件スキャン
→ 改善: CREATE INDEX idx_age ON users(age);
```

### データの一括更新

```
シナリオ: 全ユーザーのis_activeをtrueに設定

1. usersテーブルを開く
2. 全行を選択（Ctrl+A / Cmd+A）
3. 右クリック → "Edit Selected"
4. is_active = true
5. "Save All"
```

### データの一括削除

```
シナリオ: 1年以上古い投稿を削除

1. postsテーブルを開く
2. フィルタ追加:
   created_at < '2025-02-05'
3. フィルタ適用
4. 対象行を全選択
5. 右クリック → "Delete Selected Rows"
6. 確認後削除
```

## トラブルシューティング

### 接続エラー

```
エラー: "Could not connect to database"

解決策:
1. DATABASE_URLが正しいか確認
2. データベースが起動しているか確認
3. ファイアウォール設定を確認
4. SSL設定が必要な場合、接続文字列に追加
   ?sslmode=require
```

### スキーマが表示されない

```
エラー: テーブル一覧が空

解決策:
1. drizzle.config.tsのschema pathを確認
2. マイグレーションが適用されているか確認
3. データベースに実際にテーブルが存在するか確認
   psql -d mydb -c "\dt"
```

### マイグレーションエラー

```
エラー: "Migration failed: column already exists"

解決策:
1. データベースの現状を確認
2. マイグレーション履歴を確認
3. 必要に応じて手動でスキーマ調整
4. マイグレーションファイルを修正
5. 再実行
```

### パフォーマンスが遅い

```
症状: データ読み込みに時間がかかる

解決策:
1. 大量データの場合、フィルタを使用
2. LIMITを設定（デフォルト1000行）
3. 不要なカラムを非表示
4. インデックスを追加
5. データベース側の最適化（VACUUM等）
```

### 編集が保存されない

```
症状: セル編集後に元に戻る

解決策:
1. 制約違反がないか確認（UNIQUE、NOT NULL等）
2. データ型が正しいか確認
3. トリガーやバリデーションを確認
4. ブラウザコンソールでエラー確認
5. Drizzle Studioを再起動
```

## セキュリティ考慮事項

### ローカル開発のみで使用

```
⚠️ 本番環境で公開しない

Drizzle Studioは開発ツールです。
本番DBへの直接接続は避けてください。

推奨:
- ローカル開発環境でのみ使用
- 本番データのコピーをローカルで検証
- VPN経由でステージング環境に接続
```

### アクセス制限

```
# localhost以外からのアクセスを制限
npx drizzle-kit studio --host 127.0.0.1

# デフォルトでは127.0.0.1にバインド
# 0.0.0.0は避ける（LAN内公開になる）
```

### 認証情報の管理

```
# .env.local（Gitにコミットしない）
DATABASE_URL="postgresql://user:pass@localhost:5432/db"

# .gitignore
.env.local
.env
```

### 本番データの扱い

```
本番データを扱う場合:

1. データをダンプしてローカルに取り込む
   pg_dump production_db > dump.sql
   psql local_db < dump.sql

2. 個人情報をマスキング
   UPDATE users SET email = 'masked_' || id || '@example.com';

3. ローカルでDrizzle Studio起動
   DATABASE_URL="postgresql://localhost/local_db" npm run db:studio
```

## まとめ

### Drizzle Studioの強み

1. **完全無料**: オープンソース、制限なし
2. **高速**: 軽量で起動が速い
3. **直感的**: UIがシンプルで使いやすい
4. **型安全**: Drizzle ORMと完全統合
5. **多機能**: データ管理からマイグレーションまで

### ベストプラクティス

- ローカル開発環境でのみ使用
- 定期的にスキーマとマイグレーションを確認
- テストデータの準備に活用
- クエリビルダーでパフォーマンス分析
- ER図でリレーション設計を可視化

### 他のツールとの使い分け

| ツール | 用途 |
|---|---|
| **Drizzle Studio** | 開発時のデータ確認・編集 |
| **pgAdmin / phpMyAdmin** | 本番環境の管理 |
| **DataGrip** | 複雑なクエリ開発 |
| **Prisma Studio** | Prisma利用時 |

### 次のステップ

- Drizzle ORM完全ガイドを読む
- マイグレーション戦略を学ぶ
- 実際のプロジェクトで活用
- コミュニティに参加（Discord）

公式ドキュメント: https://orm.drizzle.team/drizzle-studio/overview

Drizzle Studioで、効率的なデータベース開発を実現しましょう。

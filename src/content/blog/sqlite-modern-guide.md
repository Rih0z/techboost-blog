---
title: 'モダンSQLite活用ガイド2026 - 小規模から中規模まで使える最強DB'
description: 'SQLiteの最新機能と実践的な使い方を解説。Turso、Litestream、SQLite Cloud、CR-SQLiteなど最新エコシステムとベストプラクティスを紹介します。SQLite・データベース・エッジコンピューティングに関する実践情報。'
pubDate: '2026-02-05'
tags: ['SQLite', 'データベース', 'エッジコンピューティング', 'プログラミング']
heroImage: '../../assets/thumbnails/sqlite-modern-guide.jpg'
---
SQLiteは、世界で最も広く使われているデータベースエンジンです。スマホアプリ、ブラウザ、組み込みシステムなど、50億以上のデバイスで動作していると言われています。

2026年現在、SQLiteは単なる「組み込みDB」ではなく、**本格的なアプリケーションの主力データベース**として使える存在になっています。

## SQLiteが再評価される理由

### 従来の誤解

「SQLiteは小規模プロトタイプ用」と思われがちでしたが、実際には:

- **同時書き込み**: WALモードで大幅改善
- **スケール**: 数TB規模のDBも問題なし
- **速度**: 多くのケースでPostgreSQLより高速
- **信頼性**: 航空宇宙産業でも採用される堅牢性

### 2026年のトレンド

- **エッジデプロイ**: Cloudflare D1、Turso等
- **レプリケーション**: Litestream、CR-SQLite
- **クラウドサービス**: SQLite Cloud、Turso
- **ORMサポート**: Drizzle、Prismaの完全対応

## 基本的な使い方

### Node.jsでの利用（better-sqlite3）

```bash
npm install better-sqlite3
npm install -D @types/better-sqlite3
```

```typescript
import Database from "better-sqlite3";

const db = new Database("myapp.db");

// テーブル作成
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )
`);

// 挿入
const insert = db.prepare(`
  INSERT INTO users (email, name, created_at)
  VALUES (?, ?, ?)
`);

insert.run("user@example.com", "田中太郎", Date.now());

// 取得
const getUser = db.prepare("SELECT * FROM users WHERE email = ?");
const user = getUser.get("user@example.com");
console.log(user);

// 複数取得
const getAllUsers = db.prepare("SELECT * FROM users");
const users = getAllUsers.all();
console.log(users);

// トランザクション
const insertMany = db.transaction((users) => {
  for (const user of users) {
    insert.run(user.email, user.name, Date.now());
  }
});

insertMany([
  { email: "a@example.com", name: "User A" },
  { email: "b@example.com", name: "User B" },
]);

db.close();
```

### WALモードの有効化（必須）

Write-Ahead Loggingモードを有効にすると、読み取りと書き込みが同時実行できます。

```typescript
db.pragma("journal_mode = WAL");
```

これは**必ず設定すべき**です。性能が劇的に向上します。

## Drizzle ORMとの連携

```bash
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit
```

```typescript
// schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  publishedAt: integer("published_at", { mode: "timestamp" }),
});
```

```typescript
// db.ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const sqlite = new Database("myapp.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });
```

```typescript
// 使用例
import { db } from "./db";
import { users, posts } from "./schema";
import { eq } from "drizzle-orm";

// 挿入
const newUser = await db.insert(users).values({
  email: "test@example.com",
  name: "テストユーザー",
  createdAt: new Date(),
});

// 取得
const user = await db.query.users.findFirst({
  where: eq(users.email, "test@example.com"),
});

// JOIN
const userWithPosts = await db.query.users.findFirst({
  where: eq(users.id, 1),
  with: {
    posts: true,
  },
});
```

## Turso - グローバル分散SQLite

TursoはlibSQL（SQLiteフォーク）をベースにした、エッジ展開可能なDBサービスです。

### 特徴

- **エッジレプリケーション**: 世界中のエッジロケーションで動作
- **低レイテンシ**: ユーザーに最も近い場所から応答
- **無料枠あり**: 月500MB、10億行読み取りまで無料

### セットアップ

```bash
# Turso CLIインストール
curl -sSfL https://get.tur.so/install.sh | bash

# ログイン
turso auth login

# データベース作成
turso db create my-app

# 接続情報取得
turso db show my-app
```

```bash
npm install @libsql/client
```

```typescript
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const result = await client.execute("SELECT * FROM users");
console.log(result.rows);
```

### Drizzle + Turso

```typescript
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export const db = drizzle(client);
```

## Litestream - 自動バックアップ

LitestreamはSQLiteのリアルタイムバックアップツールです。S3、Azure、GCSに継続的にレプリケーションできます。

### インストール（Mac）

```bash
brew install litestream
```

### 設定ファイル

```yaml
# litestream.yml
dbs:
  - path: /var/lib/myapp.db
    replicas:
      - type: s3
        bucket: my-litestream-backups
        path: myapp
        region: ap-northeast-1
        access-key-id: ${AWS_ACCESS_KEY_ID}
        secret-access-key: ${AWS_SECRET_ACCESS_KEY}
```

### 起動

```bash
litestream replicate -config litestream.yml
```

アプリを起動する際は、Litestreamも同時起動:

```bash
litestream replicate -config litestream.yml -exec "node server.js"
```

サーバーがクラッシュしても、S3から最新状態を復元できます。

## 全文検索（FTS5）

```sql
-- FTS5テーブル作成
CREATE VIRTUAL TABLE posts_fts USING fts5(
  title,
  content,
  tokenize = 'porter unicode61'
);

-- データ挿入
INSERT INTO posts_fts (rowid, title, content)
SELECT id, title, content FROM posts;

-- 検索
SELECT * FROM posts_fts WHERE posts_fts MATCH 'SQLite tutorial';
```

日本語の検索には専用のtokenizerが必要です。

## JSON操作

SQLite 3.38以降はJSON関数が強化されています。

```sql
-- JSONカラム
CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  data JSON NOT NULL
);

INSERT INTO events (data) VALUES (
  '{"type": "click", "user_id": 123, "timestamp": 1234567890}'
);

-- JSON取得
SELECT json_extract(data, '$.user_id') FROM events;

-- JSON配列操作
SELECT json_each.value
FROM events, json_each(data, '$.tags')
WHERE json_extract(data, '$.type') = 'click';
```

## パフォーマンス最適化

### インデックス

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_published_at ON posts(published_at);
```

### EXPLAIN QUERY PLAN

```sql
EXPLAIN QUERY PLAN
SELECT * FROM posts WHERE user_id = 123;
```

インデックスが使われているか確認します。

### VACUUM

定期的にVACUUMで最適化:

```sql
VACUUM;
```

### ANALYZE

統計情報を更新:

```sql
ANALYZE;
```

## Next.jsアプリでの使用例

```typescript
// lib/db.ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

let db: ReturnType<typeof drizzle>;

if (process.env.NODE_ENV === "production") {
  const sqlite = new Database("/data/prod.db");
  sqlite.pragma("journal_mode = WAL");
  db = drizzle(sqlite, { schema });
} else {
  const sqlite = new Database("dev.db");
  sqlite.pragma("journal_mode = WAL");
  db = drizzle(sqlite, { schema });
}

export { db };
```

```typescript
// app/api/posts/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts } from "@/lib/schema";

export async function GET() {
  const allPosts = await db.query.posts.findMany({
    limit: 10,
    orderBy: (posts, { desc }) => [desc(posts.publishedAt)],
  });

  return NextResponse.json(allPosts);
}
```

## 本番環境での注意点

1. **WALモード必須**: `pragma journal_mode = WAL`
2. **定期VACUUM**: ディスク容量を節約
3. **バックアップ**: Litestreamなどで自動化
4. **同時書き込み制限**: 1プロセスのみ書き込み推奨
5. **ファイルシステム**: NFSは避ける（ローカルディスク推奨）

## まとめ

SQLiteは2026年においても、いやむしろ今こそ、最も魅力的な選択肢の一つです。

**SQLiteが適しているケース:**
- 読み取り重視のアプリケーション
- エッジデプロイ（Cloudflare Workers等）
- 中小規模のWebアプリ（〜100万ユーザー）
- セルフホスティングアプリ

**PostgreSQL等が適しているケース:**
- 大量の同時書き込み
- 複数サーバーからの書き込み
- 高度なクエリ最適化が必要
- 超大規模データ

選択肢として、まずSQLiteを検討し、スケール要件に応じて他DBを検討するのがモダンなアプローチです。

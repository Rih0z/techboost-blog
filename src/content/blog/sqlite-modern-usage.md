---
title: "モダンSQLite活用ガイド — サーバーレスからエッジまで"
description: "SQLiteの進化、Litestream・LiteFS・Turso/libSQLによるレプリケーション、better-sqlite3・D1・WALモードの実践的な活用方法を解説します。"
pubDate: "2026-02-05"
tags: ["SQLite", "Database", "Edge Computing", "Serverless", "Turso", "インフラ"]
---

## SQLiteの再評価

SQLiteは「おもちゃのデータベース」と思われがちですが、実は非常に強力です。

### なぜ今SQLiteなのか

- **シンプル**: サーバー不要、単一ファイル
- **高速**: ローカルI/O、ネットワークレイテンシなし
- **信頼性**: ACID準拠、広く使われている（Android、iOSなど）
- **モダン化**: Litestream、Turso、D1などの新ツール
- **エッジコンピューティング**: CDNエッジでデータベースを実行

### 適したユースケース

- **読み取り中心のアプリ**: ブログ、ドキュメント、eコマースカタログ
- **エッジアプリ**: Cloudflare Workers、Vercel Edge
- **組み込み**: モバイルアプリ、デスクトップアプリ
- **ローカルファースト**: オフライン対応アプリ

## Node.jsでのSQLite

### better-sqlite3

最速のSQLiteバインディングです。

```bash
npm install better-sqlite3
npm install -D @types/better-sqlite3
```

```typescript
import Database from 'better-sqlite3'

const db = new Database('app.db')

// テーブル作成
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

// 挿入
const insert = db.prepare(`
  INSERT INTO users (name, email) VALUES (?, ?)
`)

insert.run('Alice', 'alice@example.com')

// トランザクション
const insertMany = db.transaction((users: Array<[string, string]>) => {
  for (const [name, email] of users) {
    insert.run(name, email)
  }
})

insertMany([
  ['Bob', 'bob@example.com'],
  ['Charlie', 'charlie@example.com'],
])

// クエリ
const getUser = db.prepare('SELECT * FROM users WHERE id = ?')
const user = getUser.get(1)

const getAllUsers = db.prepare('SELECT * FROM users')
const users = getAllUsers.all()

// 型安全性
interface User {
  id: number
  name: string
  email: string
  created_at: string
}

const getUserTyped = db.prepare<unknown[], User>('SELECT * FROM users WHERE id = ?')
const typedUser = getUserTyped.get(1)
```

### WALモード

Write-Ahead Logging（WAL）モードは、並行読み取りと書き込みを可能にします。

```typescript
db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')
db.pragma('cache_size = -64000') // 64MB
db.pragma('temp_store = MEMORY')
```

**WALモードのメリット:**
- 読み取りと書き込みがブロックしない
- パフォーマンス向上
- データ整合性

## Drizzle ORMとの統合

```bash
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit
```

```typescript
// schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  authorId: integer('author_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})
```

```typescript
// db.ts
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema'

const sqlite = new Database('app.db')
export const db = drizzle(sqlite, { schema })
```

```typescript
// クエリ
import { db } from './db'
import { users, posts } from './schema'
import { eq } from 'drizzle-orm'

// 挿入
const user = await db.insert(users).values({
  name: 'Alice',
  email: 'alice@example.com',
  createdAt: new Date(),
}).returning()

// クエリ
const allUsers = await db.select().from(users)

const userWithPosts = await db.query.users.findFirst({
  where: eq(users.id, 1),
  with: {
    posts: true,
  },
})
```

## Litestream — バックアップとレプリケーション

Litestreamは、SQLiteをS3などにリアルタイムでレプリケーションします。

### インストール

```bash
# macOS
brew install litestream

# Linux
wget https://github.com/benbjohnson/litestream/releases/download/v0.3.13/litestream-v0.3.13-linux-amd64.tar.gz
tar -xzf litestream-v0.3.13-linux-amd64.tar.gz
sudo mv litestream /usr/local/bin/
```

### 設定

```yaml
# litestream.yml
dbs:
  - path: /var/lib/app.db
    replicas:
      - type: s3
        bucket: my-app-db-backup
        path: app.db
        region: us-east-1
        access-key-id: ${AWS_ACCESS_KEY_ID}
        secret-access-key: ${AWS_SECRET_ACCESS_KEY}
```

### 実行

```bash
# レプリケーション開始
litestream replicate

# アプリと一緒に起動
litestream replicate -exec "node server.js"

# リストア
litestream restore -o /var/lib/app.db s3://my-app-db-backup/app.db
```

### Dockerでの使用

```dockerfile
FROM node:20-slim

RUN apt-get update && apt-get install -y wget \
  && wget https://github.com/benbjohnson/litestream/releases/download/v0.3.13/litestream-v0.3.13-linux-amd64.tar.gz \
  && tar -xzf litestream-v0.3.13-linux-amd64.tar.gz \
  && mv litestream /usr/local/bin/ \
  && rm litestream-v0.3.13-linux-amd64.tar.gz

COPY litestream.yml /etc/litestream.yml
COPY . /app
WORKDIR /app

CMD ["litestream", "replicate", "-exec", "node server.js"]
```

## Turso — エッジSQLite

TursoはlibSQLベースのマネージドSQLiteサービスです。

### 特徴

- **グローバルレプリケーション**: 世界中にデータを配置
- **エッジコンピューティング**: 低レイテンシ
- **HTTP API**: サーバーレス対応
- **無料枠**: 500MBストレージ、10億行読み取り/月

### セットアップ

```bash
# Turso CLIインストール
brew install tursodatabase/tap/turso

# ログイン
turso auth login

# データベース作成
turso db create my-app

# 接続URL取得
turso db show my-app --url
turso db tokens create my-app
```

### Node.jsから接続

```bash
npm install @libsql/client
```

```typescript
import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

// クエリ
const result = await client.execute('SELECT * FROM users')

// プリペアドステートメント
const user = await client.execute({
  sql: 'SELECT * FROM users WHERE id = ?',
  args: [1],
})

// トランザクション
const tx = await client.transaction()
try {
  await tx.execute({
    sql: 'INSERT INTO users (name, email) VALUES (?, ?)',
    args: ['Alice', 'alice@example.com'],
  })
  await tx.execute({
    sql: 'INSERT INTO posts (title, author_id) VALUES (?, ?)',
    args: ['Hello', 1],
  })
  await tx.commit()
} catch (error) {
  await tx.rollback()
  throw error
}
```

### Drizzleとの統合

```typescript
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

export const db = drizzle(client)
```

## Cloudflare D1

Cloudflare WorkersのネイティブSQLiteです。

### データベース作成

```bash
npx wrangler d1 create my-db
```

```toml
# wrangler.toml
[[d1_databases]]
binding = "DB"
database_name = "my-db"
database_id = "your-database-id"
```

### Workerから使用

```typescript
export interface Env {
  DB: D1Database
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { results } = await env.DB.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).bind(1).all()

    return Response.json(results)
  },
}
```

### バッチクエリ

```typescript
const batch = [
  env.DB.prepare('INSERT INTO users (name) VALUES (?)').bind('Alice'),
  env.DB.prepare('INSERT INTO users (name) VALUES (?)').bind('Bob'),
  env.DB.prepare('INSERT INTO users (name) VALUES (?)').bind('Charlie'),
]

await env.DB.batch(batch)
```

## LiteFS — 分散SQLite

LiteFSはFUSEベースの分散ファイルシステムで、SQLiteをクラスターで実行できます。

### 特徴

- **プライマリ/レプリカ**: 自動フェイルオーバー
- **強い整合性**: プライマリで書き込み、レプリカで読み取り
- **Fly.io統合**: Fly.ioで簡単にデプロイ

### 設定例

```yaml
# litefs.yml
fuse:
  dir: "/litefs"

data:
  dir: "/var/lib/litefs"

lease:
  type: "consul"
  advertise-url: "http://${HOSTNAME}.vm.${FLY_APP_NAME}.internal:20202"
  candidate: ${FLY_REGION == PRIMARY_REGION}
  promote: true

  consul:
    url: "${FLY_CONSUL_URL}"
    key: "my-app/primary"
```

## パフォーマンス最適化

### インデックス

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
```

### ANALYZE

```typescript
db.exec('ANALYZE')
```

### 接続プール（複数プロセス）

```typescript
import { Pool } from 'generic-pool'
import Database from 'better-sqlite3'

const pool = Pool.createPool({
  create: () => new Database('app.db'),
  destroy: (db) => db.close(),
}, {
  max: 10,
  min: 2,
})

async function query(sql: string) {
  const db = await pool.acquire()
  try {
    return db.prepare(sql).all()
  } finally {
    await pool.release(db)
  }
}
```

## まとめ

SQLiteは以下のシナリオで最適です。

- **低〜中トラフィック**: 月100万PVまで十分対応
- **読み取り中心**: ブログ、CMS、カタログサイト
- **エッジデプロイ**: Cloudflare Workers、Vercel Edge
- **オフライン対応**: PWA、モバイルアプリ

Litestream、Turso、D1などの新ツールにより、SQLiteはPostgreSQLやMySQLの代替として十分に使える選択肢になっています。

## 参考リンク

- [SQLite公式](https://www.sqlite.org/)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [Litestream](https://litestream.io/)
- [Turso](https://turso.tech/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [LiteFS](https://fly.io/docs/litefs/)

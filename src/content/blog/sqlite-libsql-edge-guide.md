---
title: "libSQL + Edge Runtime完全ガイド - SQLiteをエッジで活用する実践的な方法"
description: "TursoのlibSQLとCloudflare Workers、Vercel Edge、Deno Deployなど各種Edge Runtimeで分散SQLiteを実現する完全ガイド。レプリケーション、マルチリージョン配置、パフォーマンス最適化まで徹底解説。"
pubDate: "2025-07-15"
updatedDate: "2025-07-15"
category: "Database"
tags: ["libSQL", "Edge Runtime", "SQLite", "Turso", "Cloudflare"]
---

## はじめに

libSQLは、SQLiteをベースにした次世代データベースフォークで、エッジコンピューティングに最適化されています。2026年現在、TursoによるホスティングサービスとCloudflare D1、Vercel PostgresなどEdge Runtime統合が進み、グローバル分散アプリケーションの構築が容易になっています。

### libSQLとは

```
libSQLの特徴:
✅ SQLite互換のフォーク
✅ Edge-first設計
✅ レプリケーション対応
✅ マルチリージョン分散
✅ WebSocket接続
✅ HTTP/REST API
✅ 低レイテンシー（<50ms）
✅ 無料枠が充実（Turso）
```

### エッジでSQLiteを使うメリット

```
従来のアーキテクチャ:
ユーザー → CDN → Origin Server → Database（単一リージョン）
└─ レイテンシー: 200-500ms

libSQL + Edge:
ユーザー → Edge Runtime → Local libSQL Replica
└─ レイテンシー: 10-50ms

メリット:
✅ 低レイテンシー（10倍以上高速）
✅ 読み取りスケール無限
✅ オフライン耐性
✅ コスト削減
✅ グローバル展開が容易
```

## Turso + libSQLのセットアップ

### インストールと初期設定

```bash
# Turso CLIインストール
curl -sSfL https://get.tur.so/install.sh | bash

# ログイン
turso auth login

# データベース作成（東京リージョン）
turso db create my-app --location nrt

# 接続URL取得
turso db show my-app

# 認証トークン生成
turso db tokens create my-app
```

### クライアントライブラリセットアップ

```bash
npm install @libsql/client
```

```typescript
// lib/db.ts
import { createClient } from '@libsql/client';

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
```

### 環境変数設定

```bash
# .env.local
TURSO_DATABASE_URL="libsql://my-app-kokiriho.turso.io"
TURSO_AUTH_TOKEN="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9..."
```

## Edge Runtime統合パターン

### パターン1: Cloudflare Workers + D1

```typescript
// worker.ts
import { D1Database } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // SQLite互換クエリ
    const { results } = await env.DB.prepare(
      'SELECT * FROM users WHERE email = ?'
    )
      .bind('user@example.com')
      .all();

    return Response.json({ users: results });
  },
};
```

```toml
# wrangler.toml
name = "my-worker"
main = "src/worker.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "xxxx-xxxx-xxxx"
```

```typescript
// Drizzle ORM統合
import { drizzle } from 'drizzle-orm/d1';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name').notNull(),
});

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const db = drizzle(env.DB);

    const allUsers = await db.select().from(users);

    return Response.json(allUsers);
  },
};
```

### パターン2: Vercel Edge Functions + Turso

```typescript
// app/api/users/route.ts
import { createClient } from '@libsql/client';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export async function GET(request: NextRequest) {
  const { rows } = await db.execute('SELECT * FROM users LIMIT 10');

  return NextResponse.json({ users: rows });
}

export async function POST(request: NextRequest) {
  const { name, email } = await request.json();

  const result = await db.execute({
    sql: 'INSERT INTO users (name, email) VALUES (?, ?)',
    args: [name, email],
  });

  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}
```

### パターン3: Deno Deploy + Turso

```typescript
// main.ts
import { Client } from 'https://esm.sh/@libsql/client@0.4.0';

const db = new Client({
  url: Deno.env.get('TURSO_DATABASE_URL')!,
  authToken: Deno.env.get('TURSO_AUTH_TOKEN')!,
});

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (url.pathname === '/api/users') {
    const { rows } = await db.execute('SELECT * FROM users');
    return Response.json({ users: rows });
  }

  return new Response('Not Found', { status: 404 });
});
```

## レプリケーション戦略

### 組み込みレプリケーション（Embedded Replicas）

```typescript
// lib/db-replica.ts
import { createClient } from '@libsql/client';

// プライマリデータベース
export const primaryDB = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// ローカルレプリカ（読み取り専用）
export const replicaDB = createClient({
  url: 'file:./local-replica.db',
  syncUrl: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
  syncInterval: 60, // 60秒ごとに同期
});

// 使い方
async function getUser(id: string) {
  // 読み取りはレプリカから（高速）
  const result = await replicaDB.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [id],
  });

  return result.rows[0];
}

async function createUser(name: string, email: string) {
  // 書き込みはプライマリへ（一貫性保証）
  const result = await primaryDB.execute({
    sql: 'INSERT INTO users (name, email) VALUES (?, ?)',
    args: [name, email],
  });

  // レプリカを手動同期
  await replicaDB.sync();

  return result.lastInsertRowid;
}
```

### マルチリージョン配置

```bash
# 複数リージョンに配置
turso db create my-app \
  --location nrt \
  --location lax \
  --location fra

# レプリカ追加
turso db replicate my-app --location syd

# 現在の配置確認
turso db locations list
```

```typescript
// lib/multi-region.ts
import { createClient } from '@libsql/client';

// 自動的に最寄りのリージョンに接続
export const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// 特定リージョン指定
export const nrtDB = createClient({
  url: 'libsql://my-app-nrt.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export const laxDB = createClient({
  url: 'libsql://my-app-lax.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
```

### 同期モード選択

```typescript
// 即時同期（強整合性）
const db = createClient({
  url: 'file:./local.db',
  syncUrl: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
  syncMode: 'immediate', // 書き込み後即座に同期
});

// 定期同期（結果整合性）
const db = createClient({
  url: 'file:./local.db',
  syncUrl: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
  syncMode: 'interval',
  syncInterval: 300, // 5分ごと
});

// 手動同期（最大制御）
const db = createClient({
  url: 'file:./local.db',
  syncUrl: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
  syncMode: 'manual',
});

// 明示的に同期実行
await db.sync();
```

## 実践的なアーキテクチャパターン

### パターン1: グローバルEコマースサイト

```typescript
// app/api/products/route.ts
import { createClient } from '@libsql/client';

export const runtime = 'edge';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// 商品一覧取得（読み取り - レプリカから高速）
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  const sql = category
    ? 'SELECT * FROM products WHERE category = ? ORDER BY created_at DESC'
    : 'SELECT * FROM products ORDER BY created_at DESC LIMIT 50';

  const { rows } = await db.execute({
    sql,
    args: category ? [category] : [],
  });

  return Response.json({ products: rows });
}

// 在庫更新（書き込み - プライマリへ）
export async function PATCH(request: Request) {
  const { productId, quantity } = await request.json();

  // トランザクション実行
  await db.batch([
    {
      sql: 'UPDATE products SET stock = stock - ? WHERE id = ?',
      args: [quantity, productId],
    },
    {
      sql: 'INSERT INTO stock_history (product_id, quantity, type) VALUES (?, ?, ?)',
      args: [productId, -quantity, 'sale'],
    },
  ]);

  return Response.json({ success: true });
}
```

### パターン2: リアルタイム分析ダッシュボード

```typescript
// app/api/analytics/route.ts
export const runtime = 'edge';

import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export async function GET() {
  // 並列クエリで複数の集計を実行
  const [dailyStats, topProducts, userGrowth] = await Promise.all([
    db.execute(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as orders,
        SUM(total) as revenue
      FROM orders
      WHERE created_at >= DATE('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `),
    db.execute(`
      SELECT
        p.name,
        COUNT(oi.id) as sold_count,
        SUM(oi.quantity * oi.price) as total_revenue
      FROM products p
      JOIN order_items oi ON p.id = oi.product_id
      WHERE oi.created_at >= DATE('now', '-7 days')
      GROUP BY p.id
      ORDER BY total_revenue DESC
      LIMIT 10
    `),
    db.execute(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as new_users
      FROM users
      WHERE created_at >= DATE('now', '-90 days')
      GROUP BY DATE(created_at)
    `),
  ]);

  return Response.json({
    daily: dailyStats.rows,
    topProducts: topProducts.rows,
    userGrowth: userGrowth.rows,
  });
}
```

### パターン3: セッション管理

```typescript
// lib/session.ts
import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// テーブル初期化
await db.execute(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    data TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  )
`);

await db.execute(`
  CREATE INDEX IF NOT EXISTS idx_sessions_expires
  ON sessions(expires_at)
`);

export async function createSession(userId: number, data: Record<string, any>) {
  const sessionId = crypto.randomUUID();
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7日後

  await db.execute({
    sql: 'INSERT INTO sessions (id, user_id, data, expires_at) VALUES (?, ?, ?, ?)',
    args: [sessionId, userId, JSON.stringify(data), expiresAt],
  });

  return sessionId;
}

export async function getSession(sessionId: string) {
  const result = await db.execute({
    sql: 'SELECT * FROM sessions WHERE id = ? AND expires_at > ?',
    args: [sessionId, Date.now()],
  });

  if (result.rows.length === 0) return null;

  const session = result.rows[0];
  return {
    id: session.id,
    userId: session.user_id,
    data: JSON.parse(session.data as string),
    expiresAt: session.expires_at,
  };
}

export async function deleteSession(sessionId: string) {
  await db.execute({
    sql: 'DELETE FROM sessions WHERE id = ?',
    args: [sessionId],
  });
}

// 期限切れセッション削除（定期実行）
export async function cleanupExpiredSessions() {
  const result = await db.execute({
    sql: 'DELETE FROM sessions WHERE expires_at < ?',
    args: [Date.now()],
  });

  return result.rowsAffected;
}
```

## パフォーマンス最適化

### コネクションプーリング

```typescript
// lib/db-pool.ts
import { createClient, Client } from '@libsql/client';

class DBPool {
  private clients: Client[] = [];
  private readonly maxSize = 10;

  getClient(): Client {
    if (this.clients.length < this.maxSize) {
      const client = createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!,
      });
      this.clients.push(client);
      return client;
    }

    // ラウンドロビンで返す
    const client = this.clients.shift()!;
    this.clients.push(client);
    return client;
  }
}

export const dbPool = new DBPool();
```

### バッチ処理

```typescript
// ❌ 遅い（複数のHTTPリクエスト）
for (const user of users) {
  await db.execute({
    sql: 'INSERT INTO users (name, email) VALUES (?, ?)',
    args: [user.name, user.email],
  });
}

// ✅ 速い（単一バッチリクエスト）
await db.batch(
  users.map((user) => ({
    sql: 'INSERT INTO users (name, email) VALUES (?, ?)',
    args: [user.name, user.email],
  }))
);
```

### プリペアドステートメント

```typescript
// プリペアドステートメント使用
const stmt = await db.prepare('SELECT * FROM users WHERE id = ?');

for (const id of userIds) {
  const result = await stmt.execute([id]);
  console.log(result.rows);
}

// クエリキャッシュが効く
```

### インデックス最適化

```typescript
// 複合インデックス作成
await db.execute(`
  CREATE INDEX IF NOT EXISTS idx_orders_user_date
  ON orders(user_id, created_at DESC)
`);

// カバリングインデックス
await db.execute(`
  CREATE INDEX IF NOT EXISTS idx_products_category_price
  ON products(category, price)
`);

// EXPLAINで確認
const plan = await db.execute('EXPLAIN QUERY PLAN SELECT * FROM users WHERE email = ?');
console.log(plan.rows);
```

## セキュリティベストプラクティス

### 認証トークン管理

```typescript
// ❌ クライアントサイドで直接使わない
const db = createClient({
  url: process.env.NEXT_PUBLIC_TURSO_URL, // 危険
  authToken: process.env.NEXT_PUBLIC_TURSO_TOKEN, // 危険
});

// ✅ Edge Functionsで使う
// app/api/secure/route.ts
export const runtime = 'edge';

import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!, // サーバーサイドのみ
  authToken: process.env.TURSO_AUTH_TOKEN!, // サーバーサイドのみ
});
```

### SQL injection対策

```typescript
// ❌ 危険
const email = request.url.searchParams.get('email');
await db.execute(`SELECT * FROM users WHERE email = '${email}'`);

// ✅ 安全（プレースホルダー使用）
await db.execute({
  sql: 'SELECT * FROM users WHERE email = ?',
  args: [email],
});
```

### Row Level Security（RLS）

```sql
-- Tursoではアプリケーションレベルで実装
CREATE TABLE posts (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title TEXT,
  content TEXT
);

CREATE INDEX idx_posts_user ON posts(user_id);
```

```typescript
// アプリケーション側でフィルタ
export async function getUserPosts(userId: number) {
  const result = await db.execute({
    sql: 'SELECT * FROM posts WHERE user_id = ?',
    args: [userId],
  });

  return result.rows;
}
```

## モニタリングとデバッグ

### クエリログ

```typescript
// lib/db-logger.ts
import { createClient } from '@libsql/client';

export function createLoggedClient() {
  const baseClient = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  return new Proxy(baseClient, {
    get(target, prop) {
      if (prop === 'execute') {
        return async (...args: any[]) => {
          const start = Date.now();
          const result = await target.execute(...args);
          const duration = Date.now() - start;

          console.log('[DB Query]', {
            sql: args[0]?.sql || args[0],
            duration: `${duration}ms`,
            rows: result.rows.length,
          });

          return result;
        };
      }

      return target[prop as keyof typeof target];
    },
  });
}
```

### エラーハンドリング

```typescript
import { LibsqlError } from '@libsql/client';

try {
  await db.execute({
    sql: 'INSERT INTO users (email) VALUES (?)',
    args: [email],
  });
} catch (error) {
  if (error instanceof LibsqlError) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      return Response.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }
  }

  console.error('Database error:', error);
  return Response.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

## まとめ

### libSQL + Edgeの強み

1. **超低レイテンシー**: 10-50msでグローバルアクセス
2. **スケーラビリティ**: 読み取りは無限スケール
3. **コスト効率**: 無料枠が充実（Turso: 500MB/3DB無料）
4. **開発体験**: SQLite互換で学習コスト低

### ベストプラクティス

- 読み取りはレプリカ、書き込みはプライマリ
- バッチ処理でネットワークコスト削減
- インデックスで検索最適化
- Edge Functionsでトークン保護

### いつ使うべきか

**最適な用途**:
- グローバルユーザー向けアプリ
- 低レイテンシーが必須のサービス
- Jamstack / Edge-first アーキテクチャ
- オフライン対応PWA

**不向きな用途**:
- 大規模分析（100GB超）
- 強整合性が必須のトランザクション
- リアルタイムコラボレーション

### 次のステップ

- Turso: https://turso.tech/
- libSQL: https://github.com/tursodatabase/libsql
- Cloudflare D1: https://developers.cloudflare.com/d1/
- Drizzle ORM: https://orm.drizzle.team/

libSQLとEdge Runtimeで、次世代のグローバル分散アプリケーションを構築しましょう。

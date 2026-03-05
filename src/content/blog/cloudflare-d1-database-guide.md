---
title: 'Cloudflare D1データベース実践ガイド: SQLite at Edgeのパフォーマンスとスケーリング戦略'
description: 'Cloudflare D1の高度な使い方を解説。データベース設計、インデックス最適化、バッチ処理、Workers連携パターン、本番運用のベストプラクティスまで実践的に網羅'
pubDate: '2025-02-05'
tags: ['Cloudflare D1', 'SQLite', 'Edge Computing', 'Workers', 'パフォーマンス最適化', 'データベース設計', 'インフラ']
---

# Cloudflare D1データベース実践ガイド: SQLite at Edgeのパフォーマンスとスケーリング戦略

Cloudflare D1は、エッジ環境で動作するサーバーレスSQLiteデータベースです。本記事では、基本を超えた実践的な活用方法、パフォーマンス最適化、スケーリング戦略を解説します。

## D1のアーキテクチャ理解

### エッジでのデータベース配置

D1は、Cloudflareのグローバルネットワーク上に分散配置されます。

```typescript
// wrangler.toml
[[d1_databases]]
binding = "DB"
database_name = "production-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### レプリケーションモデル

```
プライマリ（書き込み） → 自動レプリケーション → リード・レプリカ（世界中）
    ↓
最終的整合性（Eventually Consistent）
```

**重要な特性**:
- 書き込みは単一リージョン
- 読み取りは最寄りのエッジから
- レプリケーション遅延: 通常数秒以内

## 高度なデータベース設計

### インデックス戦略

```sql
-- ユーザーテーブル
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_login_at INTEGER
);

-- 複合インデックス（検索パフォーマンス向上）
CREATE INDEX idx_users_email_created
  ON users(email, created_at DESC);

-- 部分インデックス（アクティブユーザーのみ）
CREATE INDEX idx_active_users
  ON users(last_login_at)
  WHERE last_login_at > strftime('%s', 'now', '-30 days');

-- カバリングインデックス（インデックスのみでクエリ完結）
CREATE INDEX idx_user_summary
  ON users(id, username, email);
```

### パーティショニング戦略

```sql
-- 時系列データの月次テーブル
CREATE TABLE events_2025_01 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE events_2025_02 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- VIEWで統合
CREATE VIEW events AS
  SELECT * FROM events_2025_01
  UNION ALL
  SELECT * FROM events_2025_02;
```

### JSON活用パターン

```sql
-- JSONカラムで柔軟なスキーマ
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  metadata JSON,
  created_at INTEGER NOT NULL
);

-- JSON操作
INSERT INTO products (name, metadata, created_at)
VALUES (
  'Laptop',
  json_object(
    'brand', 'Apple',
    'specs', json_object('cpu', 'M2', 'ram', 16)
  ),
  strftime('%s', 'now')
);

-- JSON検索
SELECT * FROM products
WHERE json_extract(metadata, '$.specs.ram') >= 16;

-- JSONインデックス（仮想カラム）
ALTER TABLE products ADD COLUMN brand TEXT
  GENERATED ALWAYS AS (json_extract(metadata, '$.brand'));

CREATE INDEX idx_products_brand ON products(brand);
```

## Workers連携の実践パターン

### 型安全なクエリビルダー

```typescript
// types/database.ts
export interface Database {
  users: {
    id: number;
    email: string;
    username: string;
    created_at: number;
  };
  posts: {
    id: number;
    user_id: number;
    title: string;
    content: string;
    published_at: number | null;
  };
}

// lib/d1-client.ts
import { D1Database } from '@cloudflare/workers-types';

export class D1Client {
  constructor(private db: D1Database) {}

  async getUser(email: string) {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first<Database['users']>();

    return result;
  }

  async createUser(data: Omit<Database['users'], 'id' | 'created_at'>) {
    const stmt = this.db.prepare(`
      INSERT INTO users (email, username, created_at)
      VALUES (?, ?, ?)
      RETURNING *
    `);

    const result = await stmt
      .bind(data.email, data.username, Math.floor(Date.now() / 1000))
      .first<Database['users']>();

    return result;
  }

  async getUserPosts(userId: number, limit = 20) {
    const stmt = this.db.prepare(`
      SELECT p.*, u.username
      FROM posts p
      INNER JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
      ORDER BY p.published_at DESC
      LIMIT ?
    `);

    const { results } = await stmt
      .bind(userId, limit)
      .all();

    return results;
  }
}
```

### バッチ操作の最適化

```typescript
// worker.ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const db = new D1Client(env.DB);

    // バッチINSERT（パフォーマンス向上）
    const users = [
      { email: 'alice@example.com', username: 'alice' },
      { email: 'bob@example.com', username: 'bob' },
      { email: 'charlie@example.com', username: 'charlie' },
    ];

    // 方法1: トランザクション内で複数INSERT
    const statements = users.map(user =>
      env.DB
        .prepare('INSERT INTO users (email, username, created_at) VALUES (?, ?, ?)')
        .bind(user.email, user.username, Math.floor(Date.now() / 1000))
    );

    const results = await env.DB.batch(statements);

    // 方法2: VALUES句で一括INSERT（より高速）
    const values = users.map(() => '(?, ?, ?)').join(', ');
    const bindings = users.flatMap(u => [
      u.email,
      u.username,
      Math.floor(Date.now() / 1000)
    ]);

    await env.DB
      .prepare(`INSERT INTO users (email, username, created_at) VALUES ${values}`)
      .bind(...bindings)
      .run();

    return new Response('Users created', { status: 201 });
  }
};
```

### トランザクション処理

```typescript
async function transferBalance(
  db: D1Database,
  fromUserId: number,
  toUserId: number,
  amount: number
) {
  // D1はトランザクションをbatch()で実現
  const results = await db.batch([
    db.prepare('UPDATE accounts SET balance = balance - ? WHERE user_id = ?')
      .bind(amount, fromUserId),

    db.prepare('UPDATE accounts SET balance = balance + ? WHERE user_id = ?')
      .bind(amount, toUserId),

    db.prepare(`
      INSERT INTO transactions (from_user_id, to_user_id, amount, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(fromUserId, toUserId, amount, Math.floor(Date.now() / 1000))
  ]);

  // すべての操作が成功したか確認
  const allSuccess = results.every(r => r.success);

  if (!allSuccess) {
    throw new Error('Transaction failed');
  }

  return results;
}
```

## パフォーマンス最適化

### クエリ最適化のベストプラクティス

```typescript
// BAD: N+1クエリ問題
async function getUsersWithPosts_BAD(db: D1Database) {
  const users = await db.prepare('SELECT * FROM users').all();

  for (const user of users.results) {
    const posts = await db
      .prepare('SELECT * FROM posts WHERE user_id = ?')
      .bind(user.id)
      .all();

    // @ts-ignore
    user.posts = posts.results;
  }

  return users.results;
}

// GOOD: JOIN使用
async function getUsersWithPosts_GOOD(db: D1Database) {
  const result = await db.prepare(`
    SELECT
      u.id, u.email, u.username,
      json_group_array(
        json_object(
          'id', p.id,
          'title', p.title,
          'published_at', p.published_at
        )
      ) as posts
    FROM users u
    LEFT JOIN posts p ON u.id = p.user_id
    GROUP BY u.id
  `).all();

  return result.results.map(row => ({
    ...row,
    // @ts-ignore
    posts: JSON.parse(row.posts)
  }));
}
```

### ページネーション戦略

```typescript
// カーソルベースページネーション（推奨）
async function getPosts(
  db: D1Database,
  cursor?: number,
  limit = 20
) {
  const stmt = db.prepare(`
    SELECT * FROM posts
    WHERE id < ?
    ORDER BY id DESC
    LIMIT ?
  `);

  const { results } = await stmt
    .bind(cursor ?? Number.MAX_SAFE_INTEGER, limit + 1)
    .all();

  const hasMore = results.length > limit;
  const posts = hasMore ? results.slice(0, -1) : results;
  const nextCursor = hasMore ? posts[posts.length - 1].id : null;

  return { posts, nextCursor, hasMore };
}

// オフセットベース（小規模データのみ）
async function getPostsOffset(
  db: D1Database,
  page = 1,
  limit = 20
) {
  const offset = (page - 1) * limit;

  const [data, count] = await Promise.all([
    db.prepare('SELECT * FROM posts ORDER BY id DESC LIMIT ? OFFSET ?')
      .bind(limit, offset)
      .all(),

    db.prepare('SELECT COUNT(*) as total FROM posts')
      .first<{ total: number }>()
  ]);

  return {
    posts: data.results,
    totalPages: Math.ceil((count?.total ?? 0) / limit),
    currentPage: page
  };
}
```

### キャッシュ戦略

```typescript
import { D1Database } from '@cloudflare/workers-types';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const cache = caches.default;
    const cacheKey = new Request(request.url, request);

    // キャッシュチェック
    let response = await cache.match(cacheKey);

    if (!response) {
      // DBクエリ
      const result = await env.DB
        .prepare('SELECT * FROM products WHERE category = ?')
        .bind('electronics')
        .all();

      response = new Response(JSON.stringify(result.results), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300' // 5分キャッシュ
        }
      });

      // キャッシュに保存（非同期）
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;
  }
};
```

## マイグレーション管理

### Wranglerでのマイグレーション

```bash
# マイグレーションディレクトリ構造
migrations/
  0001_initial_schema.sql
  0002_add_posts_table.sql
  0003_add_indexes.sql
```

```sql
-- migrations/0001_initial_schema.sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);

INSERT INTO schema_migrations (version, applied_at)
VALUES (1, strftime('%s', 'now'));
```

```bash
# マイグレーション実行
wrangler d1 execute production-db --file=migrations/0001_initial_schema.sql

# 複数マイグレーション適用
wrangler d1 migrations apply production-db
```

### TypeScriptでのマイグレーション管理

```typescript
// scripts/migrate.ts
import { D1Database } from '@cloudflare/workers-types';
import fs from 'fs/promises';
import path from 'path';

async function migrate(db: D1Database) {
  // マイグレーションテーブル確認
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL
    )
  `).run();

  // 適用済みバージョン取得
  const applied = await db
    .prepare('SELECT version FROM schema_migrations ORDER BY version')
    .all<{ version: number }>();

  const appliedVersions = new Set(applied.results.map(r => r.version));

  // マイグレーションファイル読み込み
  const migrationsDir = path.join(__dirname, '../migrations');
  const files = await fs.readdir(migrationsDir);

  for (const file of files.sort()) {
    const match = file.match(/^(\d+)_.*\.sql$/);
    if (!match) continue;

    const version = parseInt(match[1]);
    if (appliedVersions.has(version)) continue;

    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf-8');

    // トランザクション内で適用
    await db.batch([
      db.prepare(sql),
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)')
        .bind(version, Math.floor(Date.now() / 1000))
    ]);

    console.log(`Applied migration ${file}`);
  }
}
```

## 本番運用のベストプラクティス

### モニタリングとロギング

```typescript
import { D1Database } from '@cloudflare/workers-types';

class D1Monitor {
  constructor(private db: D1Database) {}

  async query<T = unknown>(
    sql: string,
    bindings: unknown[] = []
  ): Promise<T[]> {
    const start = Date.now();

    try {
      const stmt = this.db.prepare(sql).bind(...bindings);
      const { results } = await stmt.all<T>();

      const duration = Date.now() - start;

      // スロークエリログ
      if (duration > 100) {
        console.warn('Slow query detected', {
          sql,
          duration,
          bindings
        });
      }

      return results;
    } catch (error) {
      console.error('Query failed', {
        sql,
        bindings,
        error
      });
      throw error;
    }
  }
}
```

### バックアップ戦略

```typescript
// 定期バックアップ（Scheduled Worker）
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // D1のデータをR2にバックアップ
    const tables = ['users', 'posts', 'comments'];

    for (const table of tables) {
      const { results } = await env.DB
        .prepare(`SELECT * FROM ${table}`)
        .all();

      const backup = JSON.stringify(results, null, 2);
      const key = `backups/${table}/${new Date().toISOString()}.json`;

      await env.R2_BUCKET.put(key, backup);
    }

    console.log('Backup completed');
  }
};
```

### エラーハンドリング

```typescript
async function safeQuery<T>(
  db: D1Database,
  sql: string,
  bindings: unknown[] = []
): Promise<{ data: T[] | null; error: Error | null }> {
  try {
    const { results } = await db
      .prepare(sql)
      .bind(...bindings)
      .all<T>();

    return { data: results, error: null };
  } catch (error) {
    if (error instanceof Error) {
      // SQLエラーのパース
      if (error.message.includes('UNIQUE constraint')) {
        return {
          data: null,
          error: new Error('Duplicate entry')
        };
      }

      if (error.message.includes('FOREIGN KEY constraint')) {
        return {
          data: null,
          error: new Error('Invalid reference')
        };
      }
    }

    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}
```

## まとめ

Cloudflare D1を本番環境で効果的に運用するためのポイント:

1. **適切なインデックス設計** - クエリパフォーマンスの鍵
2. **バッチ操作の活用** - 複数クエリを効率的に処理
3. **トランザクションの理解** - データ整合性の確保
4. **キャッシュ戦略** - 読み取り負荷の軽減
5. **マイグレーション管理** - スキーマ変更の追跡
6. **モニタリング** - パフォーマンス問題の早期発見

D1は、エッジ環境でのデータベース運用に新しい可能性をもたらします。適切な設計と運用で、高速かつスケーラブルなアプリケーションを構築できます。

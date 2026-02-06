---
title: "Cloudflare D1データベース活用ガイド"
description: "Cloudflare Workersで動作するサーバーレスSQLiteデータベースD1の基礎から実践的な使い方まで解説します"
pubDate: "2025-02-05"
tags: ["cloudflare", "d1", "database", "serverless", "sqlite"]
---

Cloudflare D1は、Cloudflare Workers上で動作するサーバーレスSQLiteデータベースです。エッジコンピューティング環境でのデータ永続化を実現し、低レイテンシーでスケーラブルなアプリケーション開発が可能になります。本記事では、D1の基礎から実践的な使い方まで詳しく解説します。

## Cloudflare D1とは

D1は、Cloudflareのエッジネットワーク上で動作するSQLiteベースのリレーショナルデータベースサービスです。

### 主な特徴

**1. エッジでのデータ永続化**
- Cloudflare Workers内でSQLを実行
- グローバルに分散されたデータベース

**2. SQLite互換**
- 標準的なSQL構文をサポート
- 既存のSQLite知識を活用可能

**3. サーバーレス**
- インフラ管理不要
- 自動スケーリング

**4. 低コスト**
- 無料枠あり
- 使った分だけの従量課金

## セットアップ

### Wranglerのインストール

```bash
npm install -g wrangler

# ログイン
wrangler login
```

### プロジェクト作成

```bash
# 新規プロジェクト作成
npm create cloudflare@latest my-d1-app

cd my-d1-app
```

### D1データベースの作成

```bash
# データベース作成
wrangler d1 create my-database

# 出力例:
# Created DB with id: xxxx-xxxx-xxxx-xxxx
# [[d1_databases]]
# binding = "DB"
# database_name = "my-database"
# database_id = "xxxx-xxxx-xxxx-xxxx"
```

### wrangler.tomlの設定

```toml
name = "my-d1-app"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "xxxx-xxxx-xxxx-xxxx"
```

## スキーマ定義

### マイグレーションファイルの作成

`schema.sql`:

```sql
-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 投稿テーブル
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

### マイグレーション実行

```bash
# ローカル環境で実行
wrangler d1 execute my-database --local --file=./schema.sql

# 本番環境で実行
wrangler d1 execute my-database --file=./schema.sql
```

## 基本的なクエリ

### Worker内でのD1使用

`src/index.ts`:

```typescript
export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ユーザー一覧取得
    if (url.pathname === "/users" && request.method === "GET") {
      const { results } = await env.DB.prepare(
        "SELECT * FROM users"
      ).all();

      return Response.json(results);
    }

    // ユーザー作成
    if (url.pathname === "/users" && request.method === "POST") {
      const { username, email } = await request.json();

      const result = await env.DB.prepare(
        "INSERT INTO users (username, email) VALUES (?, ?)"
      )
        .bind(username, email)
        .run();

      return Response.json({
        id: result.meta.last_row_id,
        username,
        email
      }, { status: 201 });
    }

    return new Response("Not found", { status: 404 });
  }
};
```

### パラメータバインディング

```typescript
// プレースホルダーを使った安全なクエリ
const getUserByEmail = async (email: string, env: Env) => {
  const result = await env.DB.prepare(
    "SELECT * FROM users WHERE email = ?"
  )
    .bind(email)
    .first();

  return result;
};

// 複数パラメータ
const createPost = async (userId: number, title: string, content: string, env: Env) => {
  const result = await env.DB.prepare(
    "INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)"
  )
    .bind(userId, title, content)
    .run();

  return result.meta.last_row_id;
};
```

## CRUD操作

### Create (作成)

```typescript
async function createUser(
  username: string,
  email: string,
  env: Env
) {
  const result = await env.DB.prepare(
    `INSERT INTO users (username, email)
     VALUES (?, ?)
     RETURNING id, username, email, created_at`
  )
    .bind(username, email)
    .first();

  return result;
}
```

### Read (読取)

```typescript
// 全件取得
async function getAllUsers(env: Env) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM users ORDER BY created_at DESC"
  ).all();

  return results;
}

// 単一レコード取得
async function getUserById(id: number, env: Env) {
  const user = await env.DB.prepare(
    "SELECT * FROM users WHERE id = ?"
  )
    .bind(id)
    .first();

  return user;
}

// ページネーション
async function getUsersPaginated(
  page: number,
  perPage: number,
  env: Env
) {
  const offset = (page - 1) * perPage;

  const { results } = await env.DB.prepare(
    "SELECT * FROM users LIMIT ? OFFSET ?"
  )
    .bind(perPage, offset)
    .all();

  return results;
}
```

### Update (更新)

```typescript
async function updateUser(
  id: number,
  username: string,
  email: string,
  env: Env
) {
  const result = await env.DB.prepare(
    `UPDATE users
     SET username = ?, email = ?
     WHERE id = ?
     RETURNING *`
  )
    .bind(username, email, id)
    .first();

  return result;
}
```

### Delete (削除)

```typescript
async function deleteUser(id: number, env: Env) {
  const result = await env.DB.prepare(
    "DELETE FROM users WHERE id = ?"
  )
    .bind(id)
    .run();

  return result.meta.changes > 0;
}
```

## トランザクション

```typescript
async function transferPost(
  postId: number,
  fromUserId: number,
  toUserId: number,
  env: Env
) {
  const results = await env.DB.batch([
    env.DB.prepare(
      "UPDATE posts SET user_id = ? WHERE id = ? AND user_id = ?"
    ).bind(toUserId, postId, fromUserId),

    env.DB.prepare(
      "INSERT INTO post_transfers (post_id, from_user_id, to_user_id) VALUES (?, ?, ?)"
    ).bind(postId, fromUserId, toUserId),
  ]);

  return results.every(r => r.success);
}
```

## JOIN操作

```typescript
// ユーザーと投稿を結合
async function getUsersWithPosts(env: Env) {
  const { results } = await env.DB.prepare(
    `SELECT
      users.id,
      users.username,
      users.email,
      COUNT(posts.id) as post_count
    FROM users
    LEFT JOIN posts ON users.id = posts.user_id
    GROUP BY users.id
    ORDER BY post_count DESC`
  ).all();

  return results;
}

// 投稿詳細（ユーザー情報含む）
async function getPostWithUser(postId: number, env: Env) {
  const post = await env.DB.prepare(
    `SELECT
      posts.*,
      users.username,
      users.email
    FROM posts
    INNER JOIN users ON posts.user_id = users.id
    WHERE posts.id = ?`
  )
    .bind(postId)
    .first();

  return post;
}
```

## フルCRUD API実装例

```typescript
import { Router } from 'itty-router';

export interface Env {
  DB: D1Database;
}

const router = Router();

// ユーザー一覧
router.get('/api/users', async (request, env: Env) => {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const perPage = parseInt(url.searchParams.get('per_page') || '10');
  const offset = (page - 1) * perPage;

  const [users, count] = await Promise.all([
    env.DB.prepare(
      "SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?"
    )
      .bind(perPage, offset)
      .all(),

    env.DB.prepare("SELECT COUNT(*) as total FROM users")
      .first<{ total: number }>()
  ]);

  return Response.json({
    users: users.results,
    pagination: {
      page,
      per_page: perPage,
      total: count?.total || 0,
      total_pages: Math.ceil((count?.total || 0) / perPage)
    }
  });
});

// ユーザー詳細
router.get('/api/users/:id', async (request, env: Env) => {
  const { id } = request.params;

  const user = await env.DB.prepare(
    "SELECT * FROM users WHERE id = ?"
  )
    .bind(id)
    .first();

  if (!user) {
    return Response.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  return Response.json(user);
});

// ユーザー作成
router.post('/api/users', async (request, env: Env) => {
  try {
    const { username, email } = await request.json();

    if (!username || !email) {
      return Response.json(
        { error: 'Username and email are required' },
        { status: 400 }
      );
    }

    const user = await env.DB.prepare(
      `INSERT INTO users (username, email)
       VALUES (?, ?)
       RETURNING *`
    )
      .bind(username, email)
      .first();

    return Response.json(user, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
});

// ユーザー更新
router.put('/api/users/:id', async (request, env: Env) => {
  const { id } = request.params;
  const { username, email } = await request.json();

  const user = await env.DB.prepare(
    `UPDATE users
     SET username = ?, email = ?
     WHERE id = ?
     RETURNING *`
  )
    .bind(username, email, id)
    .first();

  if (!user) {
    return Response.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  return Response.json(user);
});

// ユーザー削除
router.delete('/api/users/:id', async (request, env: Env) => {
  const { id } = request.params;

  const result = await env.DB.prepare(
    "DELETE FROM users WHERE id = ?"
  )
    .bind(id)
    .run();

  if (result.meta.changes === 0) {
    return Response.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  return new Response(null, { status: 204 });
});

export default {
  fetch: router.handle
};
```

## ローカル開発

```bash
# ローカル開発サーバー起動
wrangler dev --local

# ローカルD1コンソール
wrangler d1 execute my-database --local --command "SELECT * FROM users"
```

## デプロイ

```bash
# 本番環境にデプロイ
wrangler deploy

# マイグレーション実行
wrangler d1 execute my-database --file=./schema.sql
```

## パフォーマンス最適化

### インデックスの活用

```sql
-- 頻繁に検索されるカラムにインデックス
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at);

-- 複合インデックス
CREATE INDEX idx_posts_user_created ON posts(user_id, created_at);
```

### バッチ処理

```typescript
// 効率的な一括挿入
async function bulkInsertUsers(
  users: Array<{ username: string; email: string }>,
  env: Env
) {
  const statements = users.map(user =>
    env.DB.prepare(
      "INSERT INTO users (username, email) VALUES (?, ?)"
    ).bind(user.username, user.email)
  );

  const results = await env.DB.batch(statements);
  return results;
}
```

## まとめ

Cloudflare D1は、エッジコンピューティング環境でデータ永続化を実現する革新的なサービスです。

### 主な利点

- **低レイテンシー**: エッジでのデータアクセス
- **スケーラビリティ**: 自動スケーリング
- **簡単な統合**: Workers との seamless な統合
- **コスト効率**: 無料枠と従量課金

グローバルに分散されたアプリケーションで、高速なデータアクセスが必要な場合、D1は優れた選択肢となるでしょう。

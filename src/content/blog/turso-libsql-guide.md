---
title: "TursoとlibSQLで分散SQLiteデータベース"
description: "TursoとlibSQLを使用して、エッジコンピューティングに最適化された分散SQLiteデータベースを構築する方法を詳しく解説します。"
pubDate: "2025-02-05"
---

SQLiteは長年にわたって信頼性の高い組み込みデータベースとして使用されてきましたが、従来は単一ファイルベースで分散環境には適していませんでした。しかし、**Turso** と **libSQL** の登場により、SQLiteをエッジコンピューティングやグローバル分散アプリケーションで活用できるようになりました。

本記事では、TursoとlibSQLの特徴、セットアップ方法、実用例、そしてベストプラクティスについて詳しく解説します。

## TursoとlibSQLとは

### libSQL

**libSQL** は、SQLiteのオープンソースフォークで、以下の機能を追加しています。

- **レプリケーション**: データの複製と同期
- **WebAssemblyサポート**: ブラウザでの実行
- **拡張機能**: 追加のSQL関数とストレージオプション
- **改善されたパフォーマンス**: 並行処理の最適化

### Turso

**Turso** は、libSQLをベースにしたマネージド分散データベースサービスです。

- **グローバル分散**: 世界中のエッジロケーションにデータベースを配置
- **低レイテンシー**: ユーザーに最も近いロケーションからデータを提供
- **SQLite互換**: 既存のSQLite知識をそのまま活用可能
- **無料枠**: 月50万行リード、月10万行ライトまで無料

## 主な特徴

### 1. エッジファースト

Tursoは世界中のエッジロケーションにデータベースを配置し、ユーザーに最も近い場所からデータを提供します。

```
User in Tokyo → Tokyo Edge (5ms)
User in London → London Edge (8ms)
User in New York → New York Edge (10ms)
```

### 2. SQLite互換

既存のSQLiteコードがそのまま動作します。

```sql
-- 標準的なSQLite構文
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');
SELECT * FROM users WHERE email = 'alice@example.com';
```

### 3. 高速レプリケーション

データは自動的に複数のロケーションに複製され、高可用性を実現します。

### 4. Embedded Replicas

アプリケーション内にローカルレプリカを埋め込み、さらに低レイテンシーなアクセスを実現できます。

## セットアップ

### Turso CLIのインストール

```bash
# macOS/Linux
curl -sSfL https://get.tur.so/install.sh | bash

# Windows (PowerShell)
powershell -c "irm get.tur.so/install.ps1 | iex"

# Homebrewでインストール（macOS）
brew install tursodatabase/tap/turso

# 確認
turso --version
```

### 認証

```bash
# Tursoアカウントにサインアップ/ログイン
turso auth signup
# または
turso auth login
```

### データベースの作成

```bash
# 新しいデータベースを作成
turso db create my-database

# データベース一覧を表示
turso db list

# データベースのURLを取得
turso db show my-database

# データベースに接続
turso db shell my-database
```

### 認証トークンの取得

```bash
# APIトークンを作成
turso db tokens create my-database

# 出力例
# Token: eyJhbGciOiJF...
```

## 基本的な使い方

### Node.js / TypeScriptでの使用

```bash
# libSQLクライアントをインストール
npm install @libsql/client
```

```typescript
// db.ts
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export default client;
```

### 基本的なCRUD操作

```typescript
// create-user.ts
import db from './db';

async function createUser(name: string, email: string) {
  const result = await db.execute({
    sql: 'INSERT INTO users (name, email) VALUES (?, ?)',
    args: [name, email],
  });

  return result.lastInsertRowid;
}

// read-users.ts
async function getUsers() {
  const result = await db.execute('SELECT * FROM users');
  return result.rows;
}

async function getUserById(id: number) {
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [id],
  });

  return result.rows[0];
}

// update-user.ts
async function updateUser(id: number, name: string, email: string) {
  const result = await db.execute({
    sql: 'UPDATE users SET name = ?, email = ? WHERE id = ?',
    args: [name, email, id],
  });

  return result.rowsAffected;
}

// delete-user.ts
async function deleteUser(id: number) {
  const result = await db.execute({
    sql: 'DELETE FROM users WHERE id = ?',
    args: [id],
  });

  return result.rowsAffected;
}
```

### トランザクション

```typescript
async function transferMoney(fromUserId: number, toUserId: number, amount: number) {
  const tx = await db.transaction('write');

  try {
    // 送金元の残高を減らす
    await tx.execute({
      sql: 'UPDATE accounts SET balance = balance - ? WHERE user_id = ?',
      args: [amount, fromUserId],
    });

    // 送金先の残高を増やす
    await tx.execute({
      sql: 'UPDATE accounts SET balance = balance + ? WHERE user_id = ?',
      args: [amount, toUserId],
    });

    // トランザクションをコミット
    await tx.commit();

    return { success: true };
  } catch (error) {
    // エラーが発生したらロールバック
    await tx.rollback();
    throw error;
  }
}
```

### バッチ処理

```typescript
async function insertMultipleUsers(users: Array<{ name: string; email: string }>) {
  const statements = users.map(user => ({
    sql: 'INSERT INTO users (name, email) VALUES (?, ?)',
    args: [user.name, user.email],
  }));

  const results = await db.batch(statements);
  return results;
}
```

## 実践例

### 1. Next.jsアプリケーション

```typescript
// lib/db.ts
import { createClient } from '@libsql/client';

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const result = await db.execute('SELECT * FROM users');
    return NextResponse.json({ users: result.rows });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, email } = await request.json();

    const result = await db.execute({
      sql: 'INSERT INTO users (name, email) VALUES (?, ?)',
      args: [name, email],
    });

    return NextResponse.json(
      { id: result.lastInsertRowid },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

// app/users/page.tsx
'use client';

import { useEffect, useState } from 'react';

export default function UsersPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(data.users));
  }, []);

  return (
    <div>
      <h1>Users</h1>
      <ul>
        {users.map((user: any) => (
          <li key={user.id}>{user.name} - {user.email}</li>
        ))}
      </ul>
    </div>
  );
}
```

### 2. Remix アプリケーション

```typescript
// app/db.server.ts
import { createClient } from '@libsql/client';

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// app/routes/users.tsx
import { json, LoaderFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { db } from '~/db.server';

export const loader: LoaderFunction = async () => {
  const result = await db.execute('SELECT * FROM users');
  return json({ users: result.rows });
};

export default function Users() {
  const { users } = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>Users</h1>
      <ul>
        {users.map((user: any) => (
          <li key={user.id}>{user.name} - {user.email}</li>
        ))}
      </ul>
    </div>
  );
}
```

### 3. Supabase Edge Functions との統合

```typescript
// supabase/functions/get-users/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@libsql/client@0.3.6";

const db = createClient({
  url: Deno.env.get('TURSO_DATABASE_URL')!,
  authToken: Deno.env.get('TURSO_AUTH_TOKEN')!,
});

serve(async (req) => {
  try {
    const result = await db.execute('SELECT * FROM users');

    return new Response(
      JSON.stringify({ users: result.rows }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 },
    );
  }
});
```

### 4. Cloudflare Workers での使用

```typescript
// src/index.ts
import { createClient } from '@libsql/client/web';

export interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const db = createClient({
      url: env.TURSO_DATABASE_URL,
      authToken: env.TURSO_AUTH_TOKEN,
    });

    try {
      const result = await db.execute('SELECT * FROM users');

      return new Response(
        JSON.stringify({ users: result.rows }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500 }
      );
    }
  },
};
```

## Embedded Replicas

Embedded Replicasを使用すると、アプリケーション内にローカルレプリカを作成し、さらに高速なアクセスを実現できます。

```typescript
import { createClient } from '@libsql/client';

const db = createClient({
  url: 'file:local.db', // ローカルファイル
  syncUrl: process.env.TURSO_DATABASE_URL!, // リモートURL
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// 定期的に同期
setInterval(async () => {
  await db.sync();
}, 60000); // 1分ごと

// ローカルから高速に読み取り
const users = await db.execute('SELECT * FROM users');

// 書き込みは自動的にリモートに同期
await db.execute({
  sql: 'INSERT INTO users (name, email) VALUES (?, ?)',
  args: ['Bob', 'bob@example.com'],
});
```

## マイグレーション管理

### SQLファイルでのマイグレーション

```sql
-- migrations/001_create_users.sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- migrations/002_create_posts.sql
CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
```

### TypeScriptでのマイグレーション実行

```typescript
// migrate.ts
import { readFileSync } from 'fs';
import { join } from 'path';
import db from './db';

async function runMigrations() {
  const migrations = [
    '001_create_users.sql',
    '002_create_posts.sql',
  ];

  for (const migration of migrations) {
    const sql = readFileSync(
      join(__dirname, 'migrations', migration),
      'utf-8'
    );

    console.log(`Running migration: ${migration}`);
    await db.executeMultiple(sql);
  }

  console.log('Migrations completed');
}

runMigrations().catch(console.error);
```

## パフォーマンス最適化

### 1. インデックスの作成

```sql
-- よく検索されるカラムにインデックスを作成
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at);

-- 複合インデックス
CREATE INDEX idx_posts_user_created ON posts(user_id, created_at);
```

### 2. プリペアドステートメント

```typescript
// プリペアドステートメントを再利用
const stmt = await db.prepare('SELECT * FROM users WHERE email = ?');

const user1 = await stmt.execute(['alice@example.com']);
const user2 = await stmt.execute(['bob@example.com']);
```

### 3. バッチ処理

```typescript
// 複数のクエリをバッチで実行
const results = await db.batch([
  { sql: 'SELECT * FROM users WHERE id = ?', args: [1] },
  { sql: 'SELECT * FROM posts WHERE user_id = ?', args: [1] },
  { sql: 'SELECT * FROM comments WHERE post_id = ?', args: [1] },
]);
```

## ベストプラクティス

### 1. 環境変数の管理

```env
# .env
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJF...
```

### 2. エラーハンドリング

```typescript
async function safeQuery<T>(query: () => Promise<T>): Promise<T | null> {
  try {
    return await query();
  } catch (error) {
    console.error('Database error:', error);
    return null;
  }
}

// 使用例
const users = await safeQuery(async () => {
  const result = await db.execute('SELECT * FROM users');
  return result.rows;
});
```

### 3. 接続の再利用

```typescript
// シングルトンパターン
let dbInstance: Client | null = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });
  }
  return dbInstance;
}
```

## TursoとPlanetScaleの比較

| 特徴 | Turso | PlanetScale |
|------|-------|-------------|
| ベース | SQLite (libSQL) | MySQL |
| 分散方式 | エッジレプリケーション | グローバルクラスタ |
| 無料枠 | 50万行リード/月 | 10GBストレージ |
| 料金 | 従量課金 | 従量課金 |
| レイテンシー | 極めて低い | 低い |
| エコシステム | 発展途上 | 成熟 |

## まとめ

TursoとlibSQLは、SQLiteの信頼性とシンプルさを保ちながら、グローバル分散環境で使用できる革新的なデータベースソリューションです。エッジコンピューティングに最適化されており、低レイテンシーで高可用性なアプリケーションを構築できます。

**主な利点**:
- SQLite互換で学習コストが低い
- グローバル分散による低レイテンシー
- Embedded Replicasによる極めて高速なアクセス
- 充実した無料枠

**適しているケース**:
- エッジコンピューティング
- グローバルアプリケーション
- 低レイテンシーが求められるサービス
- SQLiteの知識を活かしたい

Tursoを活用して、次世代のグローバル分散アプリケーションを構築してみてください。

## 参考リンク

- [Turso公式サイト](https://turso.tech/)
- [libSQL GitHub](https://github.com/tursodatabase/libsql)
- [Turso Documentation](https://docs.turso.tech/)
- [Turso Examples](https://github.com/tursodatabase/examples)

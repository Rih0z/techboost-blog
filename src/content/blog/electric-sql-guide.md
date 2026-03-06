---
title: 'ElectricSQL完全ガイド - ローカルファーストアプリケーション開発の決定版'
description: 'ElectricSQLの導入方法、SQLiteとPostgresの同期、リアルタイムデータ同期、オフライン対応、競合解決を徹底解説。ローカルファースト開発の最新技術を習得しよう。ElectricSQL・SQLite・Postgresに関する実践情報。'
pubDate: 'Feb 05 2026'
tags: ['ElectricSQL', 'SQLite', 'Postgres', 'LocalFirst', 'プログラミング']
---
# ElectricSQL完全ガイド - ローカルファーストアプリケーション開発の決定版

ElectricSQLは、SQLiteとPostgreSQLを同期し、ローカルファーストなアプリケーションを実現するオープンソースフレームワークです。オフライン対応、リアルタイム同期、自動競合解決を提供します。

## ElectricSQLとは

### 主な特徴

1. **ローカルファーストアーキテクチャ** - SQLiteをローカルDBとして使用
2. **PostgreSQL同期** - サーバー側PostgreSQLと双方向同期
3. **リアルタイム更新** - WebSocket経由で即座に同期
4. **オフライン対応** - ネットワーク断絶時も動作
5. **自動競合解決** - CRDTベースの競合解決機能
6. **TypeScript完全サポート** - 型安全なクエリAPI

### アーキテクチャ

```
┌─────────────────┐
│  クライアント   │
│   (Browser)     │
│  ┌───────────┐  │
│  │ SQLite DB │  │
│  │  (WASM)   │  │
│  └─────┬─────┘  │
│        │        │
│  ┌─────▼─────┐  │
│  │ Electric  │  │
│  │  Client   │  │
│  └─────┬─────┘  │
└────────┼────────┘
         │ WebSocket
         │
┌────────▼────────┐
│  Electric Sync  │
│   Server        │
└────────┬────────┘
         │ Logical Replication
         │
┌────────▼────────┐
│   PostgreSQL    │
│   Database      │
└─────────────────┘
```

## セットアップ

### 1. PostgreSQLの準備

```sql
-- Logical Replicationを有効化
-- postgresql.conf
wal_level = logical
max_replication_slots = 10
max_wal_senders = 10

-- データベース作成
CREATE DATABASE myapp;

-- ElectricSQL拡張を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### 2. Electric Syncサーバーのセットアップ

```bash
# Docker Composeを使用
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    command:
      - "postgres"
      - "-c"
      - "wal_level=logical"
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  electric:
    image: electricsql/electric:latest
    environment:
      DATABASE_URL: "postgresql://postgres:password@postgres:5432/myapp"
      ELECTRIC_WRITE_TO_PG_MODE: "direct_writes"
      AUTH_MODE: "insecure" # 本番環境では変更必須
    ports:
      - "5133:5133"
    depends_on:
      - postgres

volumes:
  postgres_data:
```

```bash
# サーバー起動
docker-compose up -d
```

### 3. クライアントアプリのセットアップ

```bash
# プロジェクト作成
npm create vite@latest my-electric-app -- --template react-ts
cd my-electric-app

# ElectricSQL クライアントインストール
npm install electric-sql @electric-sql/pglite

# 型生成用ツール
npm install -D @electric-sql/prisma-generator
```

### 4. Prismaスキーマ定義

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

generator electric {
  provider = "@electric-sql/prisma-generator"
  output   = "../src/generated/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Todo {
  id          String   @id @default(uuid())
  title       String
  completed   Boolean  @default(false)
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  @@map("todos")
}

model User {
  id         String   @id @default(uuid())
  email      String   @unique
  name       String?
  todos      Todo[]
  created_at DateTime @default(now())

  @@map("users")
}
```

### 5. マイグレーション実行

```bash
# Prismaマイグレーション作成
npx prisma migrate dev --name init

# Electric型生成
npx prisma generate
```

## クライアント実装

### Electric クライアント初期化

```typescript
// src/electric/client.ts
import { Electric, schema } from '../generated/client'
import { makeElectricContext } from 'electric-sql/react'
import { PGlite } from '@electric-sql/pglite'

export const { ElectricProvider, useElectric } = makeElectricContext<Electric>()

export async function initElectric() {
  const config = {
    url: 'http://localhost:5133'
  }

  // ブラウザ内SQLite (WASM)
  const db = new PGlite()

  const electric = await schema.electrify(db, config)

  return electric
}
```

### アプリケーションエントリーポイント

```typescript
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ElectricProvider, initElectric } from './electric/client'

async function bootstrap() {
  const electric = await initElectric()

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ElectricProvider db={electric}>
        <App />
      </ElectricProvider>
    </React.StrictMode>
  )
}

bootstrap()
```

### リアクティブクエリの使用

```typescript
// src/components/TodoList.tsx
import { useElectric } from '../electric/client'
import { useLiveQuery } from 'electric-sql/react'

export function TodoList() {
  const { db } = useElectric()!

  // リアルタイム自動更新されるクエリ
  const { results: todos } = useLiveQuery(
    db.todos.liveMany({
      orderBy: {
        created_at: 'desc'
      }
    })
  )

  const handleToggle = async (id: string, completed: boolean) => {
    await db.todos.update({
      where: { id },
      data: { completed: !completed }
    })
  }

  const handleDelete = async (id: string) => {
    await db.todos.delete({
      where: { id }
    })
  }

  return (
    <div className="todo-list">
      <h2>Todos ({todos?.length ?? 0})</h2>
      <ul>
        {todos?.map((todo) => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => handleToggle(todo.id, todo.completed)}
            />
            <span className={todo.completed ? 'completed' : ''}>
              {todo.title}
            </span>
            <button onClick={() => handleDelete(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

### データの作成

```typescript
// src/components/TodoForm.tsx
import { useState } from 'react'
import { useElectric } from '../electric/client'

export function TodoForm() {
  const [title, setTitle] = useState('')
  const { db } = useElectric()!

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    await db.todos.create({
      data: {
        title: title.trim(),
        completed: false
      }
    })

    setTitle('')
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs to be done?"
      />
      <button type="submit">Add Todo</button>
    </form>
  )
}
```

## シェイプベース同期

### シェイプの定義

```typescript
// src/electric/shapes.ts
import { Electric } from '../generated/client'

export async function syncTodos(db: Electric) {
  // 特定のデータだけを同期（シェイプ）
  const shape = await db.todos.sync({
    where: {
      completed: false
    },
    include: {
      user: true
    }
  })

  return shape
}

export async function syncUserData(db: Electric, userId: string) {
  // ユーザーに関連するデータのみ同期
  const userShape = await db.users.sync({
    where: {
      id: userId
    },
    include: {
      todos: true
    }
  })

  return userShape
}
```

### 条件付き同期

```typescript
// src/hooks/useSync.ts
import { useEffect, useState } from 'react'
import { useElectric } from '../electric/client'

export function useSyncTodos(filter: 'all' | 'active' | 'completed') {
  const { db } = useElectric()!
  const [syncing, setSyncing] = useState(true)

  useEffect(() => {
    let shape: any

    async function setupSync() {
      setSyncing(true)

      const where =
        filter === 'all'
          ? {}
          : filter === 'active'
            ? { completed: false }
            : { completed: true }

      shape = await db.todos.sync({ where })

      setSyncing(false)
    }

    setupSync()

    return () => {
      // クリーンアップ: シェイプの同期を停止
      shape?.unsubscribe()
    }
  }, [filter, db])

  return { syncing }
}
```

## オフライン対応

### 接続状態の監視

```typescript
// src/hooks/useConnectivity.ts
import { useElectric } from '../electric/client'
import { useLiveQuery } from 'electric-sql/react'

export function useConnectivity() {
  const { db } = useElectric()!

  const { results: connectivity } = useLiveQuery(
    db.electric.connectivity.liveStatus()
  )

  return {
    isOnline: connectivity?.status === 'connected',
    status: connectivity?.status
  }
}
```

### 使用例

```typescript
// src/components/SyncStatus.tsx
import { useConnectivity } from '../hooks/useConnectivity'

export function SyncStatus() {
  const { isOnline, status } = useConnectivity()

  return (
    <div className={`sync-status ${isOnline ? 'online' : 'offline'}`}>
      {isOnline ? (
        <span>🟢 Online</span>
      ) : (
        <span>🔴 Offline - Changes will sync when reconnected</span>
      )}
      <small>Status: {status}</small>
    </div>
  )
}
```

### オフライン時の動作

```typescript
// src/components/TodoListWithOffline.tsx
import { useState } from 'react'
import { useElectric } from '../electric/client'
import { useConnectivity } from '../hooks/useConnectivity'
import { useLiveQuery } from 'electric-sql/react'

export function TodoListWithOffline() {
  const { db } = useElectric()!
  const { isOnline } = useConnectivity()
  const [pendingChanges, setPendingChanges] = useState(0)

  const { results: todos } = useLiveQuery(db.todos.liveMany())

  const handleAdd = async (title: string) => {
    try {
      await db.todos.create({
        data: { title, completed: false }
      })

      if (!isOnline) {
        setPendingChanges(prev => prev + 1)
      }
    } catch (error) {
      console.error('Failed to create todo:', error)
    }
  }

  return (
    <div>
      {!isOnline && pendingChanges > 0 && (
        <div className="pending-alert">
          {pendingChanges} changes pending sync
        </div>
      )}
      {/* Todo list UI */}
    </div>
  )
}
```

## 競合解決

### Last-Write-Wins (LWW)

ElectricSQLはデフォルトでLast-Write-Wins戦略を使用します。

```typescript
// 自動的に処理される
// 同じレコードへの複数クライアントからの更新は、
// タイムスタンプに基づいて最新のものが勝つ
await db.todos.update({
  where: { id: '123' },
  data: { title: 'Updated title' }
})
```

### カスタム競合解決

```typescript
// src/electric/conflicts.ts
import { Electric } from '../generated/client'

export async function setupConflictHandlers(db: Electric) {
  // カスタム競合解決ロジック
  db.todos.onConflict((local, remote) => {
    // ローカル変更を優先
    if (local.updated_at > remote.updated_at) {
      return local
    }

    // リモート変更を優先
    return remote
  })
}
```

### マージ戦略

```typescript
// src/utils/merge.ts
interface TodoConflict {
  local: Todo
  remote: Todo
}

export function mergeTodoConflict(conflict: TodoConflict): Todo {
  const { local, remote } = conflict

  // フィールドごとにマージ
  return {
    id: local.id,
    title: local.updated_at > remote.updated_at ? local.title : remote.title,
    completed: local.completed || remote.completed, // OR演算
    created_at: local.created_at,
    updated_at: new Date(
      Math.max(
        new Date(local.updated_at).getTime(),
        new Date(remote.updated_at).getTime()
      )
    )
  }
}
```

## 認証とセキュリティ

### JWT認証の設定

```typescript
// src/electric/auth.ts
import { Electric } from '../generated/client'

export async function initElectricWithAuth(token: string) {
  const config = {
    url: 'http://localhost:5133',
    auth: {
      token: token
    }
  }

  const db = new PGlite()
  const electric = await schema.electrify(db, config)

  return electric
}

export function getAuthToken(): string {
  // 認証プロバイダーからトークン取得
  return localStorage.getItem('auth_token') ?? ''
}
```

### Row Level Security (RLS)

```sql
-- PostgreSQL側でRLSを設定
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のTodoのみアクセス可能
CREATE POLICY todos_user_policy ON todos
  FOR ALL
  USING (user_id = current_user_id());

-- 関数定義
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS uuid AS $$
  SELECT nullif(current_setting('app.user_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;
```

### クライアント側のフィルタリング

```typescript
// src/hooks/useUserTodos.ts
import { useElectric } from '../electric/client'
import { useLiveQuery } from 'electric-sql/react'

export function useUserTodos(userId: string) {
  const { db } = useElectric()!

  const { results: todos } = useLiveQuery(
    db.todos.liveMany({
      where: {
        user_id: userId
      }
    })
  )

  return todos ?? []
}
```

## パフォーマンス最適化

### インデックスの追加

```sql
-- PostgreSQL側
CREATE INDEX idx_todos_user_id ON todos(user_id);
CREATE INDEX idx_todos_completed ON todos(completed);
CREATE INDEX idx_todos_created_at ON todos(created_at DESC);

-- 複合インデックス
CREATE INDEX idx_todos_user_completed
  ON todos(user_id, completed);
```

### バッチ処理

```typescript
// src/utils/batch.ts
import { Electric } from '../generated/client'

export async function batchCreateTodos(
  db: Electric,
  todos: Array<{ title: string }>
) {
  // トランザクションでバッチ作成
  await db.$transaction(
    todos.map(todo =>
      db.todos.create({
        data: {
          title: todo.title,
          completed: false
        }
      })
    )
  )
}

export async function batchUpdateTodos(
  db: Electric,
  ids: string[],
  data: { completed: boolean }
) {
  await db.$transaction(
    ids.map(id =>
      db.todos.update({
        where: { id },
        data
      })
    )
  )
}
```

### ページネーション

```typescript
// src/hooks/usePaginatedTodos.ts
import { useState } from 'react'
import { useElectric } from '../electric/client'
import { useLiveQuery } from 'electric-sql/react'

export function usePaginatedTodos(pageSize: number = 20) {
  const [page, setPage] = useState(0)
  const { db } = useElectric()!

  const { results: todos } = useLiveQuery(
    db.todos.liveMany({
      orderBy: { created_at: 'desc' },
      take: pageSize,
      skip: page * pageSize
    })
  )

  const nextPage = () => setPage(p => p + 1)
  const prevPage = () => setPage(p => Math.max(0, p - 1))

  return {
    todos: todos ?? [],
    page,
    nextPage,
    prevPage,
    hasMore: (todos?.length ?? 0) === pageSize
  }
}
```

## デバッグとモニタリング

### ログ設定

```typescript
// src/electric/client.ts
import { Electric, schema } from '../generated/client'
import { setLogLevel } from 'electric-sql/debug'

// 開発環境でデバッグログを有効化
if (import.meta.env.DEV) {
  setLogLevel('DEBUG')
}

export async function initElectric() {
  const config = {
    url: 'http://localhost:5133',
    debug: import.meta.env.DEV
  }

  const db = new PGlite()
  const electric = await schema.electrify(db, config)

  if (import.meta.env.DEV) {
    // グローバルにデバッグ用に公開
    ;(window as any).electric = electric
  }

  return electric
}
```

### 同期状態の監視

```typescript
// src/components/DebugPanel.tsx
import { useElectric } from '../electric/client'
import { useLiveQuery } from 'electric-sql/react'

export function DebugPanel() {
  const { db } = useElectric()!

  const { results: syncStatus } = useLiveQuery(
    db.electric.sync.liveStatus()
  )

  const { results: shapes } = useLiveQuery(
    db.electric.shapes.liveMany()
  )

  return (
    <div className="debug-panel">
      <h3>Sync Status</h3>
      <pre>{JSON.stringify(syncStatus, null, 2)}</pre>

      <h3>Active Shapes</h3>
      <pre>{JSON.stringify(shapes, null, 2)}</pre>
    </div>
  )
}
```

## 本番環境デプロイ

### 環境変数設定

```bash
# .env.production
VITE_ELECTRIC_URL=https://electric.example.com
VITE_DATABASE_URL=postgresql://user:pass@db.example.com:5432/prod
```

### Docker化

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Nginx設定

```nginx
# nginx.conf
server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  # ElectricSQL WebSocketプロキシ
  location /electric/ {
    proxy_pass http://electric:5133/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
  }
}
```

## テスト

### ユニットテスト

```typescript
// src/__tests__/todos.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { Electric, schema } from '../generated/client'
import { PGlite } from '@electric-sql/pglite'

describe('Todo operations', () => {
  let db: Electric

  beforeEach(async () => {
    db = await schema.electrify(new PGlite(), {
      url: 'http://localhost:5133'
    })
  })

  it('should create a todo', async () => {
    const todo = await db.todos.create({
      data: {
        title: 'Test todo',
        completed: false
      }
    })

    expect(todo.title).toBe('Test todo')
    expect(todo.completed).toBe(false)
  })

  it('should update a todo', async () => {
    const todo = await db.todos.create({
      data: { title: 'Test', completed: false }
    })

    const updated = await db.todos.update({
      where: { id: todo.id },
      data: { completed: true }
    })

    expect(updated.completed).toBe(true)
  })

  it('should delete a todo', async () => {
    const todo = await db.todos.create({
      data: { title: 'Test', completed: false }
    })

    await db.todos.delete({
      where: { id: todo.id }
    })

    const found = await db.todos.findUnique({
      where: { id: todo.id }
    })

    expect(found).toBeNull()
  })
})
```

### 統合テスト

```typescript
// src/__tests__/sync.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Electric, schema } from '../generated/client'
import { PGlite } from '@electric-sql/pglite'

describe('Sync operations', () => {
  let db1: Electric
  let db2: Electric

  beforeAll(async () => {
    db1 = await schema.electrify(new PGlite(), {
      url: 'http://localhost:5133'
    })

    db2 = await schema.electrify(new PGlite(), {
      url: 'http://localhost:5133'
    })

    // 同期開始
    await db1.todos.sync()
    await db2.todos.sync()
  })

  it('should sync data between clients', async () => {
    // クライアント1でTodo作成
    const todo = await db1.todos.create({
      data: { title: 'Sync test', completed: false }
    })

    // 同期待機
    await new Promise(resolve => setTimeout(resolve, 1000))

    // クライアント2で確認
    const synced = await db2.todos.findUnique({
      where: { id: todo.id }
    })

    expect(synced).toBeDefined()
    expect(synced?.title).toBe('Sync test')
  })

  afterAll(async () => {
    await db1.$disconnect()
    await db2.$disconnect()
  })
})
```

## まとめ

ElectricSQLは以下を実現します:

1. **ローカルファースト** - SQLiteベースの高速ローカルデータベース
2. **リアルタイム同期** - PostgreSQLとの双方向同期
3. **オフライン対応** - ネットワーク断絶時も動作
4. **自動競合解決** - CRDTベースの堅牢な同期
5. **型安全** - TypeScriptフル対応
6. **スケーラブル** - エンタープライズグレードのアーキテクチャ

ローカルファーストアプリケーション開発において、ElectricSQLは最も強力な選択肢の一つです。オフライン対応が必須のモバイルアプリ、リアルタイムコラボレーションツール、エッジコンピューティングアプリケーションに最適です。

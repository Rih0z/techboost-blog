---
title: 'ElectricSQL: ローカルファーストアプリケーション同期フレームワーク入門'
description: 'ElectricSQLでローカルファーストアプリを構築。PostgreSQL同期、オフライン対応、CRDT競合解決、リアクティブクエリの実装方法を実例とともに徹底解説'
pubDate: '2025-02-06'
tags: ['ElectricSQL', 'PostgreSQL', 'オフライン', 'CRDT', 'ローカルファースト']
---

# ElectricSQL: ローカルファーストアプリケーション同期フレームワーク入門

ElectricSQLは、ローカルファーストアプリケーション開発のための同期フレームワークです。SQLiteをローカルデータベースとして使用し、PostgreSQLサーバーと双方向で自動同期します。

本ガイドでは、ElectricSQLの核心機能である同期メカニズム、オフライン対応、競合解決に焦点を当てて解説します。

## ElectricSQLの同期アーキテクチャ

### 基本概念

```
┌─────────────────────────────────┐
│   クライアント（ブラウザ）      │
│                                 │
│  ┌──────────────────────────┐  │
│  │  SQLite (wa-sqlite)      │  │
│  │  ローカルデータストア     │  │
│  └─────────┬────────────────┘  │
│            │                    │
│  ┌─────────▼────────────────┐  │
│  │  Electric Client SDK     │  │
│  │  - リアクティブクエリ     │  │
│  │  - シェイプ管理           │  │
│  │  - 競合解決               │  │
│  └─────────┬────────────────┘  │
└────────────┼────────────────────┘
             │ WebSocket (変更ストリーム)
             ▼
┌────────────────────────────────┐
│  Electric Sync Service         │
│  - Logical Replication購読     │
│  - 変更イベント配信            │
│  - クライアント状態管理        │
└────────────┬───────────────────┘
             │ PostgreSQL Logical Replication
             ▼
┌────────────────────────────────┐
│  PostgreSQL Database           │
│  - 真実の単一ソース            │
│  - トランザクション整合性      │
└────────────────────────────────┘
```

## プロジェクトセットアップ

### Docker Composeでの環境構築

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: electric
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    command:
      - "postgres"
      - "-c"
      - "wal_level=logical"
      - "-c"
      - "max_replication_slots=10"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  electric:
    image: electricsql/electric:latest
    environment:
      DATABASE_URL: "postgresql://postgres:password@postgres:5432/electric"
      ELECTRIC_WRITE_TO_PG_MODE: "direct_writes"
      PG_PROXY_PORT: "65432"
      HTTP_PORT: "5133"
    ports:
      - "5133:5133"
      - "65432:65432"
    depends_on:
      - postgres

volumes:
  postgres_data:
```

### クライアントアプリケーション初期化

```bash
npm create vite@latest my-electric-app -- --template react-ts
cd my-electric-app
npm install electric-sql @electric-sql/pglite
npm install -D prisma @electric-sql/prisma-generator
```

### Prismaスキーマ設定

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

model Project {
  id          String   @id @default(uuid())
  name        String
  description String?
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt
  tasks       Task[]

  @@map("projects")
}

model Task {
  id          String   @id @default(uuid())
  title       String
  completed   Boolean  @default(false)
  priority    Int      @default(0)
  project_id  String
  project     Project  @relation(fields: [project_id], references: [id], onDelete: Cascade)
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  @@index([project_id])
  @@index([completed])
  @@map("tasks")
}
```

```bash
# マイグレーション実行
npx prisma migrate dev --name init
npx prisma generate
```

## リアクティブクエリの実装

### Electric クライアント初期化

```typescript
// src/electric/client.ts
import { Electric, schema } from '../generated/client'
import { makeElectricContext } from 'electric-sql/react'
import { PGlite } from '@electric-sql/pglite'

export const { ElectricProvider, useElectric } = makeElectricContext<Electric>()

export async function initElectric() {
  // ブラウザ内SQLite初期化
  const db = new PGlite('idb://my-app')

  // Electric設定
  const config = {
    url: import.meta.env.VITE_ELECTRIC_URL || 'http://localhost:5133',
    timeout: 10000,
  }

  // Electric接続
  const electric = await schema.electrify(db, config)

  console.log('Electric initialized:', electric)

  return electric
}
```

### アプリケーションエントリーポイント

```typescript
// src/main.tsx
import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ElectricProvider, initElectric } from './electric/client'
import type { Electric } from './generated/client'

function Root() {
  const [electric, setElectric] = useState<Electric | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false

    initElectric()
      .then((db) => {
        if (!cancelled) {
          setElectric(db)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return <div>Error initializing Electric: {error.message}</div>
  }

  if (!electric) {
    return <div>Loading Electric...</div>
  }

  return (
    <ElectricProvider db={electric}>
      <App />
    </ElectricProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
```

## シェイプベース同期

### シェイプの定義と管理

```typescript
// src/hooks/useProjectSync.ts
import { useEffect, useState } from 'react'
import { useElectric } from '../electric/client'

export function useProjectSync(projectId?: string) {
  const { db } = useElectric()!
  const [syncing, setSyncing] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let shape: any

    async function setupSync() {
      try {
        setSyncing(true)
        setError(null)

        // プロジェクトとタスクを同期（シェイプ定義）
        if (projectId) {
          // 特定プロジェクトのみ同期
          shape = await db.projects.sync({
            where: {
              id: projectId,
            },
            include: {
              tasks: true,
            },
          })
        } else {
          // 全プロジェクト同期
          shape = await db.projects.sync({
            include: {
              tasks: {
                orderBy: {
                  priority: 'desc',
                },
              },
            },
          })
        }

        console.log('Shape synced:', shape)
        setSyncing(false)
      } catch (err) {
        console.error('Sync error:', err)
        setError(err as Error)
        setSyncing(false)
      }
    }

    setupSync()

    return () => {
      // シェイプの同期を停止
      if (shape?.unsubscribe) {
        shape.unsubscribe()
      }
    }
  }, [db, projectId])

  return { syncing, error }
}
```

### リアクティブクエリでのデータ表示

```typescript
// src/components/ProjectList.tsx
import { useLiveQuery } from 'electric-sql/react'
import { useElectric } from '../electric/client'
import { useProjectSync } from '../hooks/useProjectSync'

export function ProjectList() {
  const { db } = useElectric()!
  const { syncing, error } = useProjectSync()

  // リアルタイム自動更新クエリ
  const { results: projects } = useLiveQuery(
    db.projects.liveMany({
      include: {
        tasks: {
          where: {
            completed: false,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    })
  )

  if (syncing) {
    return <div>Syncing data...</div>
  }

  if (error) {
    return <div>Sync error: {error.message}</div>
  }

  return (
    <div className="project-list">
      <h2>Projects ({projects?.length ?? 0})</h2>
      {projects?.map((project) => (
        <div key={project.id} className="project-card">
          <h3>{project.name}</h3>
          {project.description && <p>{project.description}</p>}
          <div className="task-count">
            Active tasks: {project.tasks.length}
          </div>
        </div>
      ))}
    </div>
  )
}
```

## オフライン対応

### 接続状態の監視

```typescript
// src/hooks/useConnectivity.ts
import { useEffect, useState } from 'react'
import { useElectric } from '../electric/client'

export interface ConnectivityStatus {
  isOnline: boolean
  status: 'connected' | 'disconnected' | 'connecting'
  lastSyncAt?: Date
}

export function useConnectivity() {
  const { db } = useElectric()!
  const [connectivity, setConnectivity] = useState<ConnectivityStatus>({
    isOnline: false,
    status: 'connecting',
  })

  useEffect(() => {
    // 接続状態の監視
    const unsubscribe = db.notifier.subscribeToConnectivityStateChanges(
      (state) => {
        setConnectivity({
          isOnline: state.status === 'connected',
          status: state.status,
          lastSyncAt: state.lastSyncAt ? new Date(state.lastSyncAt) : undefined,
        })
      }
    )

    return () => {
      unsubscribe()
    }
  }, [db])

  return connectivity
}
```

### オフライン UI インジケーター

```typescript
// src/components/SyncStatusBar.tsx
import { useConnectivity } from '../hooks/useConnectivity'

export function SyncStatusBar() {
  const { isOnline, status, lastSyncAt } = useConnectivity()

  return (
    <div className={`sync-status ${status}`}>
      <div className="status-indicator">
        {isOnline ? (
          <span className="status-dot online">●</span>
        ) : (
          <span className="status-dot offline">●</span>
        )}
        <span className="status-text">
          {isOnline ? 'Synced' : 'Offline'}
        </span>
      </div>

      {lastSyncAt && (
        <div className="last-sync">
          Last sync: {formatDistanceToNow(lastSyncAt)} ago
        </div>
      )}

      {!isOnline && (
        <div className="offline-notice">
          Changes will sync when connection is restored
        </div>
      )}
    </div>
  )
}

function formatDistanceToNow(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  return `${Math.floor(seconds / 3600)}h`
}
```

## CRDT競合解決

### Last-Write-Wins（LWW）戦略

ElectricSQLはデフォルトでLWW戦略を使用します。

```typescript
// src/components/TaskEditor.tsx
import { useState } from 'react'
import { useElectric } from '../electric/client'
import type { Task } from '../generated/client'

export function TaskEditor({ task }: { task: Task }) {
  const { db } = useElectric()!
  const [title, setTitle] = useState(task.title)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)

    try {
      // 更新はLWW戦略で自動競合解決
      await db.tasks.update({
        where: { id: task.id },
        data: {
          title,
          updated_at: new Date(), // タイムスタンプで競合解決
        },
      })

      console.log('Task updated:', task.id)
    } catch (error) {
      console.error('Update failed:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="task-editor">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={saving}
      />
      <button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  )
}
```

### カスタム競合解決ロジック

```typescript
// src/utils/conflictResolution.ts
import type { Task } from '../generated/client'

interface ConflictResolution<T> {
  resolve: (local: T, remote: T) => T
}

export const taskConflictResolver: ConflictResolution<Task> = {
  resolve(local, remote) {
    // 優先度の高い方を採用
    if (local.priority !== remote.priority) {
      return local.priority > remote.priority ? local : remote
    }

    // タイムスタンプで判断（LWW）
    const localTime = new Date(local.updated_at).getTime()
    const remoteTime = new Date(remote.updated_at).getTime()

    return localTime > remoteTime ? local : remote
  },
}

// マージ戦略（フィールド単位）
export function mergeTaskConflict(local: Task, remote: Task): Task {
  return {
    id: local.id,
    // 最新のタイトル
    title:
      new Date(local.updated_at) > new Date(remote.updated_at)
        ? local.title
        : remote.title,
    // OR演算（どちらかで完了なら完了）
    completed: local.completed || remote.completed,
    // 高い方の優先度
    priority: Math.max(local.priority, remote.priority),
    project_id: local.project_id,
    created_at: local.created_at,
    updated_at: new Date(
      Math.max(
        new Date(local.updated_at).getTime(),
        new Date(remote.updated_at).getTime()
      )
    ),
  }
}
```

## 楽観的UI更新

```typescript
// src/hooks/useOptimisticTasks.ts
import { useElectric } from '../electric/client'
import { useLiveQuery } from 'electric-sql/react'

export function useOptimisticTasks(projectId: string) {
  const { db } = useElectric()!

  const { results: tasks } = useLiveQuery(
    db.tasks.liveMany({
      where: { project_id: projectId },
      orderBy: { priority: 'desc' },
    })
  )

  const toggleTask = async (taskId: string) => {
    const task = tasks?.find((t) => t.id === taskId)
    if (!task) return

    // 楽観的UI更新（即座にUIを更新）
    await db.tasks.update({
      where: { id: taskId },
      data: {
        completed: !task.completed,
        updated_at: new Date(),
      },
    })

    // バックグラウンドで同期が実行される
  }

  const addTask = async (title: string) => {
    const newTask = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      priority: 0,
      project_id: projectId,
      created_at: new Date(),
      updated_at: new Date(),
    }

    // 楽観的挿入
    await db.tasks.create({
      data: newTask,
    })
  }

  const deleteTask = async (taskId: string) => {
    // 楽観的削除
    await db.tasks.delete({
      where: { id: taskId },
    })
  }

  return {
    tasks: tasks ?? [],
    toggleTask,
    addTask,
    deleteTask,
  }
}
```

## 認証とセキュリティ

### JWT認証の実装

```typescript
// src/electric/auth.ts
import { Electric } from '../generated/client'

export interface AuthConfig {
  url: string
  authToken?: string
}

export async function initElectricWithAuth(
  token: string
): Promise<Electric> {
  const config: AuthConfig = {
    url: import.meta.env.VITE_ELECTRIC_URL || 'http://localhost:5133',
    authToken: token,
  }

  const db = new PGlite('idb://my-app')

  const electric = await schema.electrify(db, config)

  return electric
}

// 認証トークン管理
export class AuthManager {
  private static TOKEN_KEY = 'electric_auth_token'

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY)
  }

  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token)
  }

  static clearToken(): void {
    localStorage.removeItem(this.TOKEN_KEY)
  }
}
```

### PostgreSQL Row Level Security

```sql
-- PostgreSQL側でRLS設定
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のプロジェクトのみアクセス可能
CREATE POLICY projects_user_policy ON projects
  FOR ALL
  USING (user_id = current_user_id());

-- タスクは所属プロジェクトのユーザーのみアクセス可能
CREATE POLICY tasks_user_policy ON tasks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tasks.project_id
      AND projects.user_id = current_user_id()
    )
  );

-- ヘルパー関数
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS uuid AS $$
  SELECT nullif(current_setting('app.user_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;
```

## パフォーマンス最適化

### インデックス最適化

```sql
-- 頻繁に検索されるフィールドにインデックス
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_completed ON tasks(completed);
CREATE INDEX idx_tasks_priority ON tasks(priority DESC);

-- 複合インデックス
CREATE INDEX idx_tasks_project_completed
  ON tasks(project_id, completed);

-- 部分インデックス（未完了タスクのみ）
CREATE INDEX idx_tasks_incomplete
  ON tasks(project_id, priority DESC)
  WHERE completed = false;
```

### シェイプの細分化

```typescript
// src/hooks/useSelectiveSync.ts
import { useEffect, useState } from 'react'
import { useElectric } from '../electric/client'

export function useSelectiveSync(options: {
  includeCompleted?: boolean
  priorityThreshold?: number
}) {
  const { db } = useElectric()!
  const [syncing, setSyncing] = useState(true)

  useEffect(() => {
    let shape: any

    async function setupSync() {
      setSyncing(true)

      // 条件付きシェイプ（必要なデータのみ同期）
      const where: any = {}

      if (!options.includeCompleted) {
        where.completed = false
      }

      if (options.priorityThreshold !== undefined) {
        where.priority = {
          gte: options.priorityThreshold,
        }
      }

      shape = await db.tasks.sync({ where })

      setSyncing(false)
    }

    setupSync()

    return () => {
      shape?.unsubscribe()
    }
  }, [db, options.includeCompleted, options.priorityThreshold])

  return { syncing }
}
```

## まとめ

ElectricSQLは以下を実現します:

1. **リアルタイム同期** - PostgreSQLとSQLiteの双方向同期
2. **オフライン対応** - ネットワーク断絶時も動作
3. **CRDT競合解決** - 自動的な競合解決メカニズム
4. **リアクティブクエリ** - データ変更時の自動UI更新
5. **シェイプベース同期** - 必要なデータのみ同期

ローカルファーストアプリケーションの開発において、ElectricSQLは強力な選択肢です。オフライン対応が必須のモバイルアプリやコラボレーションツールに最適です。

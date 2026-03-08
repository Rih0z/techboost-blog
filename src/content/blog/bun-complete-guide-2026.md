---
title: "Bun完全ガイド2026: JavaScriptランタイム・パッケージマネージャー・ビルドツールの全て"
description: "Bunの全機能を網羅した完全ガイド。高速ランタイム、内蔵パッケージマネージャー、ビルドツール、テストランナーまで、Node.jsとの互換性を保ちながら圧倒的な速度を実現するBunの全てを解説します。Bun・JavaScript・TypeScriptに関する実践情報。"
pubDate: "2026-02-06"
tags: ["Bun", "JavaScript", "TypeScript", "Runtime", "Build Tool"]
heroImage: '../../assets/thumbnails/bun-complete-guide-2026.jpg'
---
BunはJavaScript/TypeScriptランタイム、パッケージマネージャー、ビルドツール、テストランナーを統合した次世代のJavaScriptツールキットです。本記事では、Bunの全機能を実践的なコード例とともに徹底解説します。

## Bunとは

### 概要

Bunは以下の機能を1つのツールで提供します。

- **JavaScriptランタイム**: Node.js互換の高速実行環境
- **パッケージマネージャー**: npm、yarn、pnpmより高速
- **ビルドツール**: webpack、esbuild、Rollupの代替
- **テストランナー**: Jest互換のテストフレームワーク
- **バンドラー**: 内蔵のJavaScript/TypeScriptバンドラー

### Node.jsとの比較

```typescript
// パフォーマンス比較（ベンチマーク結果）
/**
 * npm install: 25秒
 * yarn: 18秒
 * pnpm: 12秒
 * bun install: 0.5秒（50倍高速）
 *
 * Node.js起動時間: 150ms
 * Bun起動時間: 3ms（50倍高速）
 *
 * TypeScript実行（ts-node）: 800ms
 * TypeScript実行（Bun）: 20ms（40倍高速）
 */
```

### 内部技術

```typescript
// Bunの技術スタック
/**
 * ランタイムエンジン: JavaScriptCore（Safari）
 * 言語: Zig（低レベル最適化）
 * パッケージマネージャー: カスタム実装（並列インストール）
 * バンドラー: 内蔵（Zig製）
 * トランスパイラー: 内蔵（TypeScript/JSX対応）
 */
```

## インストールと初期設定

### インストール

```bash
# macOS / Linux
curl -fsSL https://bun.sh/install | bash

# Windows（WSL推奨）
powershell -c "irm bun.sh/install.ps1|iex"

# Homebrewから
brew tap oven-sh/bun
brew install bun

# npmから
npm install -g bun

# バージョン確認
bun --version
# => 1.1.38

# アップグレード
bun upgrade
```

### プロジェクト初期化

```bash
# 新規プロジェクト作成
bun init

# 対話形式で設定
# → package.json、tsconfig.json、.gitignore を自動生成

# テンプレートから作成
bun create next-app my-app    # Next.js
bun create react-app my-app   # React
bun create vite my-app        # Vite
bun create hono my-api        # Hono（軽量フレームワーク）

# 既存のNode.jsプロジェクトをBunに移行
cd existing-project
bun install  # package-lock.json から bun.lockb を生成
```

## パッケージ管理

### 基本コマンド

```bash
# パッケージインストール
bun install                    # すべての依存関係
bun install express           # 個別パッケージ
bun add express               # installのエイリアス

# 開発依存関係
bun add -d typescript @types/node
bun add --dev vitest

# グローバルインストール
bun add -g typescript

# パッケージ削除
bun remove express

# パッケージアップデート
bun update                     # すべて更新
bun update express            # 個別更新

# パッケージ情報
bun pm ls                     # インストール済み一覧
bun pm ls --all              # すべての依存関係（ツリー表示）
bun pm cache                  # キャッシュ情報
bun pm cache rm               # キャッシュクリア
```

### package.jsonスクリプト

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "bun run --hot src/index.ts",
    "build": "bun build src/index.ts --outdir ./dist --target node",
    "start": "bun dist/index.js",
    "test": "bun test",
    "lint": "bun eslint src/"
  },
  "dependencies": {
    "express": "^4.18.2",
    "hono": "^3.11.7"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "typescript": "^5.3.3"
  }
}
```

```bash
# スクリプト実行
bun run dev        # package.jsonのdevスクリプト
bun dev            # "run"は省略可能
bun run build
bun test
```

### ワークスペース（モノレポ）

```json
// package.json（ルート）
{
  "name": "my-monorepo",
  "workspaces": [
    "packages/*",
    "apps/*"
  ]
}
```

```bash
# ワークスペース構造
my-monorepo/
├── package.json
├── bun.lockb
├── packages/
│   ├── shared/
│   │   └── package.json
│   └── ui/
│       └── package.json
└── apps/
    ├── web/
    │   └── package.json
    └── api/
        └── package.json

# ワークスペースでインストール
bun install  # すべてのワークスペースをインストール

# 特定のワークスペースで実行
bun --filter web dev
bun --filter api test

# すべてのワークスペースで実行
bun --filter '*' test
```

## JavaScriptランタイム

### ファイル実行

```bash
# JavaScriptファイル実行
bun index.js

# TypeScriptファイル実行（トランスパイル不要）
bun index.ts

# ホットリロード（開発モード）
bun --hot index.ts

# ウォッチモード
bun --watch index.ts

# 環境変数指定
NODE_ENV=production bun index.ts
```

### TypeScript完全サポート

```typescript
// src/index.ts - トランスパイル不要で直接実行可能

import type { ServerWebSocket } from 'bun'

// TypeScript 5.3の最新機能を全てサポート
type User = {
  id: number
  name: string
  email: string
}

const users: User[] = []

// 装飾的な型注釈
function addUser(user: User): void {
  users.push(user)
}

// Generics
function findById<T extends { id: number }>(items: T[], id: number): T | undefined {
  return items.find(item => item.id === id)
}

// tsconfig.jsonの設定が自動で適用される
console.log(findById(users, 1))
```

```bash
# TypeScriptファイルを直接実行
bun src/index.ts
# => トランスパイル待ち時間なし（3ms程度で起動）
```

### 組み込みAPIとNode.js互換性

```typescript
// Bun独自のAPI + Node.js互換API

// ファイル読み込み（Bun高速API）
const file = Bun.file('data.json')
const content = await file.text()
const json = await file.json()
const buffer = await file.arrayBuffer()

// Node.js互換API
import fs from 'node:fs/promises'
const data = await fs.readFile('data.json', 'utf-8')

// HTTPサーバー（Bun独自の高速サーバー）
const server = Bun.serve({
  port: 3000,
  fetch(req) {
    return new Response('Hello Bun!')
  },
})

console.log(`Server running at http://localhost:${server.port}`)

// Node.js http互換
import { createServer } from 'node:http'

const nodeServer = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Hello Node.js API')
})

nodeServer.listen(3001)
```

### Web標準API

```typescript
// Bunは最新のWeb標準APIをサポート

// Fetch API
const response = await fetch('https://api.example.com/users')
const users = await response.json()

// WebSocket
const ws = new WebSocket('wss://example.com/socket')

ws.onmessage = (event) => {
  console.log('Received:', event.data)
}

ws.send('Hello WebSocket')

// Blob / File
const blob = new Blob(['Hello'], { type: 'text/plain' })
const text = await blob.text()

// URL / URLSearchParams
const url = new URL('https://example.com/search?q=bun')
console.log(url.searchParams.get('q')) // => "bun"

// TextEncoder / TextDecoder
const encoder = new TextEncoder()
const uint8 = encoder.encode('Hello')

const decoder = new TextDecoder()
const str = decoder.decode(uint8)

// crypto（Web Crypto API）
const hash = await crypto.subtle.digest(
  'SHA-256',
  encoder.encode('password')
)

// FormData
const formData = new FormData()
formData.append('name', 'John')
formData.append('file', new Blob(['content']))

// Headers
const headers = new Headers({
  'Content-Type': 'application/json',
  'Authorization': 'Bearer token',
})
```

## HTTPサーバー

### 基本的なサーバー

```typescript
// server.ts - 高速HTTPサーバー

const server = Bun.serve({
  port: 3000,

  fetch(req) {
    const url = new URL(req.url)

    if (url.pathname === '/') {
      return new Response('Hello Bun!', {
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    if (url.pathname === '/json') {
      return Response.json({ message: 'Hello JSON' })
    }

    if (url.pathname === '/users') {
      const users = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]
      return Response.json(users)
    }

    return new Response('Not Found', { status: 404 })
  },

  // エラーハンドリング
  error(error) {
    return new Response(`Error: ${error.message}`, { status: 500 })
  },
})

console.log(`Server running at http://localhost:${server.port}`)
```

### RESTful API

```typescript
// api-server.ts

type User = {
  id: number
  name: string
  email: string
}

const users: User[] = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
]

const server = Bun.serve({
  port: 3000,

  async fetch(req) {
    const url = new URL(req.url)
    const method = req.method

    // CORS設定
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    }

    // GET /api/users - 全ユーザー取得
    if (method === 'GET' && url.pathname === '/api/users') {
      return Response.json(users, { headers })
    }

    // GET /api/users/:id - 個別ユーザー取得
    const userMatch = url.pathname.match(/^\/api\/users\/(\d+)$/)
    if (method === 'GET' && userMatch) {
      const id = parseInt(userMatch[1])
      const user = users.find(u => u.id === id)

      if (!user) {
        return Response.json({ error: 'User not found' }, {
          status: 404,
          headers
        })
      }

      return Response.json(user, { headers })
    }

    // POST /api/users - ユーザー作成
    if (method === 'POST' && url.pathname === '/api/users') {
      const body = await req.json() as Omit<User, 'id'>
      const newUser: User = {
        id: Math.max(...users.map(u => u.id)) + 1,
        ...body,
      }
      users.push(newUser)

      return Response.json(newUser, { status: 201, headers })
    }

    // PUT /api/users/:id - ユーザー更新
    if (method === 'PUT' && userMatch) {
      const id = parseInt(userMatch[1])
      const index = users.findIndex(u => u.id === id)

      if (index === -1) {
        return Response.json({ error: 'User not found' }, {
          status: 404,
          headers
        })
      }

      const body = await req.json() as Partial<User>
      users[index] = { ...users[index], ...body }

      return Response.json(users[index], { headers })
    }

    // DELETE /api/users/:id - ユーザー削除
    if (method === 'DELETE' && userMatch) {
      const id = parseInt(userMatch[1])
      const index = users.findIndex(u => u.id === id)

      if (index === -1) {
        return Response.json({ error: 'User not found' }, {
          status: 404,
          headers
        })
      }

      users.splice(index, 1)

      return new Response(null, { status: 204, headers })
    }

    return Response.json({ error: 'Not found' }, { status: 404, headers })
  },
})

console.log(`API server running at http://localhost:${server.port}`)
```

### WebSocketサーバー

```typescript
// websocket-server.ts

type WebSocketData = {
  username: string
  createdAt: number
}

const server = Bun.serve<WebSocketData>({
  port: 3000,

  fetch(req, server) {
    const url = new URL(req.url)

    // WebSocketアップグレード
    if (url.pathname === '/ws') {
      const username = url.searchParams.get('username') || 'Anonymous'

      const success = server.upgrade(req, {
        data: {
          username,
          createdAt: Date.now(),
        },
      })

      if (success) {
        return undefined // WebSocket接続成功
      }

      return new Response('WebSocket upgrade failed', { status: 500 })
    }

    return new Response('Hello Bun WebSocket Server')
  },

  websocket: {
    // 接続時
    open(ws) {
      console.log(`${ws.data.username} connected`)
      ws.send(`Welcome, ${ws.data.username}!`)

      // 全クライアントに通知
      ws.publish('chat', `${ws.data.username} joined the chat`)
      ws.subscribe('chat')
    },

    // メッセージ受信時
    message(ws, message) {
      console.log(`Received from ${ws.data.username}:`, message)

      // 全クライアントにブロードキャスト
      ws.publish('chat', `${ws.data.username}: ${message}`)
    },

    // 切断時
    close(ws) {
      console.log(`${ws.data.username} disconnected`)
      ws.publish('chat', `${ws.data.username} left the chat`)
    },

    // エラー時
    error(ws, error) {
      console.error('WebSocket error:', error)
    },
  },
})

console.log(`WebSocket server running at ws://localhost:${server.port}/ws`)
```

### ファイル配信

```typescript
// static-server.ts

const server = Bun.serve({
  port: 3000,

  async fetch(req) {
    const url = new URL(req.url)
    let filePath = url.pathname

    // ルートパスは index.html を返す
    if (filePath === '/') {
      filePath = '/index.html'
    }

    // publicディレクトリから配信
    const file = Bun.file(`./public${filePath}`)

    // ファイルが存在するか確認
    const exists = await file.exists()

    if (!exists) {
      return new Response('404 Not Found', { status: 404 })
    }

    // ファイルを返す（Content-Typeは自動設定）
    return new Response(file)
  },
})

console.log(`Static server running at http://localhost:${server.port}`)
```

## ビルドとバンドル

### 基本的なビルド

```bash
# 単一ファイルビルド
bun build src/index.ts --outdir ./dist

# 出力ファイル名指定
bun build src/index.ts --outfile dist/bundle.js

# 複数エントリーポイント
bun build src/index.ts src/worker.ts --outdir ./dist

# minify（圧縮）
bun build src/index.ts --outdir ./dist --minify

# ソースマップ生成
bun build src/index.ts --outdir ./dist --sourcemap

# ターゲット指定
bun build src/index.ts --outdir ./dist --target browser  # ブラウザ用
bun build src/index.ts --outdir ./dist --target node     # Node.js用
bun build src/index.ts --outdir ./dist --target bun      # Bun用
```

### プログラマティックビルド

```typescript
// build.ts

const result = await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'browser',
  minify: true,
  sourcemap: 'external',
  splitting: true, // コード分割

  // 外部パッケージ（バンドルしない）
  external: ['react', 'react-dom'],

  // プラグイン（カスタム処理）
  plugins: [],
})

if (result.success) {
  console.log('Build successful!')
  console.log('Outputs:', result.outputs)
} else {
  console.error('Build failed')
  for (const message of result.logs) {
    console.error(message)
  }
}
```

### React/Vue/Svelteのビルド

```typescript
// React プロジェクトのビルド
const result = await Bun.build({
  entrypoints: ['./src/index.tsx'],
  outdir: './dist',
  target: 'browser',
  minify: true,
  splitting: true,

  // JSXファイルを自動処理
  loader: {
    '.tsx': 'tsx',
    '.jsx': 'jsx',
  },
})

// CSS/画像も含めてバンドル
const fullBuild = await Bun.build({
  entrypoints: ['./src/index.tsx'],
  outdir: './dist',

  loader: {
    '.png': 'file',
    '.jpg': 'file',
    '.css': 'css',
    '.svg': 'dataurl',
  },
})
```

### 環境変数の埋め込み

```typescript
// build-with-env.ts

const result = await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',

  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    'process.env.API_URL': JSON.stringify('https://api.example.com'),
    '__VERSION__': JSON.stringify('1.0.0'),
  },
})
```

```typescript
// src/config.ts - ビルド時に置換される

export const config = {
  env: process.env.NODE_ENV,        // => "production"
  apiUrl: process.env.API_URL,      // => "https://api.example.com"
  version: __VERSION__,             // => "1.0.0"
}
```

## テストランナー

### 基本的なテスト

```typescript
// math.test.ts

import { expect, test, describe } from 'bun:test'

function add(a: number, b: number): number {
  return a + b
}

test('add function', () => {
  expect(add(1, 2)).toBe(3)
  expect(add(-1, 1)).toBe(0)
})

describe('Math operations', () => {
  test('addition', () => {
    expect(1 + 1).toBe(2)
  })

  test('subtraction', () => {
    expect(5 - 3).toBe(2)
  })

  test('multiplication', () => {
    expect(2 * 3).toBe(6)
  })
})
```

```bash
# テスト実行
bun test

# 特定のファイルのみ
bun test math.test.ts

# ウォッチモード
bun test --watch

# カバレッジ
bun test --coverage
```

### 非同期テスト

```typescript
// async.test.ts

import { expect, test } from 'bun:test'

async function fetchUser(id: number) {
  const response = await fetch(`https://api.example.com/users/${id}`)
  return response.json()
}

test('fetch user', async () => {
  const user = await fetchUser(1)
  expect(user).toHaveProperty('id')
  expect(user).toHaveProperty('name')
})

test('async timeout', async () => {
  await new Promise(resolve => setTimeout(resolve, 100))
  expect(true).toBe(true)
}, { timeout: 1000 }) // 1秒タイムアウト
```

### モック

```typescript
// mock.test.ts

import { expect, test, mock, spyOn } from 'bun:test'

test('mock function', () => {
  const mockFn = mock((a: number, b: number) => a + b)

  mockFn(1, 2)
  mockFn(3, 4)

  expect(mockFn).toHaveBeenCalledTimes(2)
  expect(mockFn).toHaveBeenCalledWith(1, 2)
  expect(mockFn).toHaveBeenCalledWith(3, 4)
})

test('spy on method', () => {
  const obj = {
    method: (x: number) => x * 2,
  }

  const spy = spyOn(obj, 'method')

  obj.method(5)

  expect(spy).toHaveBeenCalledWith(5)
  expect(spy).toHaveReturnedWith(10)
})

// fetch のモック
test('mock fetch', async () => {
  globalThis.fetch = mock(async (url: string) => {
    return new Response(JSON.stringify({ id: 1, name: 'Test' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  })

  const response = await fetch('https://api.example.com/users/1')
  const data = await response.json()

  expect(data).toEqual({ id: 1, name: 'Test' })
})
```

### スナップショットテスト

```typescript
// snapshot.test.ts

import { expect, test } from 'bun:test'

test('snapshot', () => {
  const data = {
    id: 1,
    name: 'Alice',
    email: 'alice@example.com',
  }

  expect(data).toMatchSnapshot()
})
```

## パフォーマンス最適化

### ファイル I/O

```typescript
// Bunの高速ファイルAPI

// 方法1: Bun.file（最速）
const file = Bun.file('large-file.json')
const data1 = await file.json()

// 方法2: Node.js fs（互換性のため）
import fs from 'node:fs/promises'
const data2 = JSON.parse(await fs.readFile('large-file.json', 'utf-8'))

// 方法3: Bun.write（ファイル書き込み）
await Bun.write('output.txt', 'Hello Bun!')
await Bun.write('output.json', JSON.stringify({ key: 'value' }))
await Bun.write('output.bin', new Uint8Array([1, 2, 3]))

// ストリーム処理
const response = await fetch('https://example.com/large-file.zip')
await Bun.write('downloaded.zip', response)
```

### パスワードハッシュ

```typescript
// Bunの高速ハッシュAPI

const password = 'my-password'

// bcrypt風のハッシュ化（Bunの組み込み実装）
const hashed = await Bun.password.hash(password)

// 検証
const isValid = await Bun.password.verify(password, hashed)

console.log(isValid) // => true

// アルゴリズム指定
const argon2Hash = await Bun.password.hash(password, {
  algorithm: 'argon2id',
  memoryCost: 65536,
  timeCost: 3,
})
```

### SQLite（内蔵）

```typescript
// Bunの組み込みSQLite

import { Database } from 'bun:sqlite'

// データベース作成/接続
const db = new Database('mydb.sqlite')

// テーブル作成
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
  )
`)

// データ挿入
const insert = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)')
insert.run('Alice', 'alice@example.com')
insert.run('Bob', 'bob@example.com')

// データ取得
const getUser = db.prepare('SELECT * FROM users WHERE id = ?')
const user = getUser.get(1)
console.log(user) // => { id: 1, name: 'Alice', email: 'alice@example.com' }

// 全件取得
const allUsers = db.prepare('SELECT * FROM users').all()
console.log(allUsers)

// トランザクション
const insertMany = db.transaction((users: Array<{ name: string; email: string }>) => {
  const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)')
  for (const user of users) {
    stmt.run(user.name, user.email)
  }
})

insertMany([
  { name: 'Charlie', email: 'charlie@example.com' },
  { name: 'David', email: 'david@example.com' },
])

// クローズ
db.close()
```

## フレームワーク統合

### Express

```typescript
// express-app.ts

import express from 'express'

const app = express()
const port = 3000

app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hello Express on Bun!')
})

app.get('/api/users', (req, res) => {
  res.json([
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ])
})

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})
```

```bash
# 依存関係インストール
bun add express
bun add -d @types/express

# 実行
bun express-app.ts
```

### Hono（Bun最適化フレームワーク）

```typescript
// hono-app.ts

import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono on Bun!')
})

app.get('/api/users', (c) => {
  return c.json([
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ])
})

app.post('/api/users', async (c) => {
  const body = await c.req.json()
  return c.json({ success: true, user: body }, 201)
})

export default app
```

```bash
# 依存関係インストール
bun add hono

# 実行
bun --hot hono-app.ts
```

### Elysia（Bun専用フレームワーク）

```typescript
// elysia-app.ts

import { Elysia } from 'elysia'

const app = new Elysia()
  .get('/', () => 'Hello Elysia!')
  .get('/api/users', () => [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ])
  .post('/api/users', ({ body }) => ({
    success: true,
    user: body,
  }))
  .listen(3000)

console.log(`Server running at http://localhost:${app.server?.port}`)
```

```bash
# 依存関係インストール
bun add elysia

# 実行
bun --hot elysia-app.ts
```

## Docker化

### Dockerfile

```dockerfile
# Dockerfile

FROM oven/bun:1 AS base
WORKDIR /app

# 依存関係インストール
FROM base AS install
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# ビルド
FROM base AS build
COPY --from=install /app/node_modules ./node_modules
COPY . .
RUN bun run build

# 本番環境
FROM base AS production
COPY --from=install /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

USER bun
EXPOSE 3000
ENTRYPOINT ["bun", "dist/index.js"]
```

```bash
# ビルド
docker build -t my-bun-app .

# 実行
docker run -p 3000:3000 my-bun-app
```

### docker-compose.yml

```yaml
# docker-compose.yml

version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/mydb
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: mydb
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

## トラブルシューティング

### よくある問題

```bash
# キャッシュクリア
bun pm cache rm

# 依存関係の再インストール
rm -rf node_modules bun.lockb
bun install

# グローバルパッケージの確認
bun pm ls -g

# Bunのアップグレード
bun upgrade

# デバッグモード
bun --inspect index.ts

# 詳細ログ
bun --verbose install
```

### パフォーマンス計測

```typescript
// benchmark.ts

import { bench, run } from 'mitata'

// 関数のベンチマーク
bench('Array.push', () => {
  const arr = []
  for (let i = 0; i < 1000; i++) {
    arr.push(i)
  }
})

bench('Array spread', () => {
  let arr = []
  for (let i = 0; i < 1000; i++) {
    arr = [...arr, i]
  }
})

await run()
```

## まとめ

Bunは、JavaScript/TypeScript開発者に統合された高速なツールキットを提供します。

**主な利点**
- ランタイム、パッケージマネージャー、ビルダー、テストランナーを統合
- Node.jsより圧倒的に高速（起動時間50倍、パッケージインストール50倍）
- TypeScriptをトランスパイル不要で直接実行
- 組み込みSQLite、WebSocket、HTTPサーバー

**適用場面**
- 新規プロジェクト（制約なし）
- CLIツール・スクリプト開発
- 高速なAPI開発
- テスト実行の高速化

**注意点**
- エコシステムがNode.jsより小さい
- 一部のnpmパッケージが未対応
- プロダクション実績がNode.jsより少ない

2026年現在、Bunは安定版1.1がリリースされ、プロダクション環境での採用事例も増加しています。Node.jsとの高い互換性により、既存プロジェクトからの移行も容易です。

**参考リンク**
- [Bun公式ドキュメント](https://bun.sh/docs)
- [Bun GitHub](https://github.com/oven-sh/bun)
- [Honoフレームワーク](https://hono.dev/)

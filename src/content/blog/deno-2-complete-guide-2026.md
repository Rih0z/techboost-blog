---
title: "Deno 2完全ガイド2026: Node.js互換・npm対応・TypeScript最適化の最新ランタイム"
description: "Deno 2の全機能を徹底解説。Node.js完全互換、npm/package.json対応、TypeScript最適化、セキュアランタイムまで、モダンなJavaScript/TypeScript開発のための最新ランタイムを実践的に紹介します。"
pubDate: "2026-02-06"
tags: ["Deno", "TypeScript", "JavaScript", "Runtime", "Node.js"]
heroImage: '../../assets/thumbnails/deno-2-complete-guide-2026.jpg'
---

Deno 2は、Node.jsの作者が開発した次世代JavaScriptランタイムです。本記事では、Node.js完全互換、npm対応、TypeScript最適化など、Deno 2の全機能を実践的なコード例とともに徹底解説します。

## Deno 2とは

### 概要

Deno 2は、セキュアでモダンなJavaScript/TypeScriptランタイムです。

```typescript
// Deno 2の主な特徴
/**
 * 1. Node.js完全互換 - package.json、node_modules対応
 * 2. npm完全対応 - npm、yarn、pnpmのパッケージを直接使用
 * 3. TypeScript最適化 - トランスパイル不要、高速実行
 * 4. セキュアデフォルト - 明示的な権限管理
 * 5. Web標準API - fetchなどのモダンAPIを標準装備
 * 6. 組み込みツール - linter、formatter、テストランナー
 */
```

### Node.jsとの違い

```typescript
// パフォーマンス比較（ベンチマーク）
/**
 * TypeScript実行速度:
 * - ts-node: 800ms
 * - tsx: 150ms
 * - Deno 2: 50ms（16倍高速）
 *
 * パッケージインストール:
 * - npm install: 25秒
 * - Deno（自動キャッシュ）: 0秒
 *
 * セキュリティ:
 * - Node.js: すべての権限が自動付与
 * - Deno: 明示的な権限が必要
 */
```

### Deno 1 vs Deno 2

```typescript
/**
 * Deno 1の制限:
 * - Node.js互換性が不完全
 * - npm対応が限定的
 * - package.jsonが使えない
 *
 * Deno 2の改善:
 * - Node.js完全互換（99%以上）
 * - npm完全対応
 * - package.json完全サポート
 * - node_modules対応
 * - パフォーマンス大幅向上
 */
```

## インストールとセットアップ

### インストール

```bash
# macOS / Linux
curl -fsSL https://deno.land/install.sh | sh

# Homebrew
brew install deno

# Windows（PowerShell）
irm https://deno.land/install.ps1 | iex

# Windows（Scoop）
scoop install deno

# npmから（グローバル）
npm install -g deno

# バージョン確認
deno --version
# deno 2.1.0

# アップグレード
deno upgrade

# 特定バージョンへのアップグレード
deno upgrade --version 2.0.0
```

### エディタ設定（VS Code）

```bash
# Deno拡張機能インストール
code --install-extension denoland.vscode-deno
```

```json
// .vscode/settings.json

{
  "deno.enable": true,
  "deno.lint": true,
  "deno.unstable": false,
  "deno.suggest.imports.hosts": {
    "https://deno.land": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "denoland.vscode-deno"
  },
  "[javascript]": {
    "editor.defaultFormatter": "denoland.vscode-deno"
  }
}
```

### プロジェクト初期化

```bash
# 新規プロジェクト作成
mkdir my-deno-project
cd my-deno-project

# deno.jsonを作成
deno init

# package.jsonプロジェクト（Node.js互換モード）
deno init --npm
```

```json
// deno.json

{
  "tasks": {
    "dev": "deno run --watch main.ts",
    "start": "deno run --allow-net --allow-read main.ts",
    "test": "deno test --allow-all",
    "lint": "deno lint",
    "fmt": "deno fmt"
  },
  "imports": {
    "@std/": "jsr:@std/",
    "express": "npm:express@^4.18.2"
  },
  "compilerOptions": {
    "lib": ["deno.window"],
    "strict": true
  },
  "fmt": {
    "useTabs": false,
    "lineWidth": 100,
    "indentWidth": 2,
    "semiColons": false,
    "singleQuote": true
  },
  "lint": {
    "rules": {
      "tags": ["recommended"]
    }
  }
}
```

## 基本的な使い方

### ファイル実行

```bash
# TypeScriptファイル実行（トランスパイル不要）
deno run main.ts

# JavaScriptファイル実行
deno run main.js

# URLから直接実行
deno run https://deno.land/std/examples/welcome.ts

# ウォッチモード（ホットリロード）
deno run --watch main.ts

# 権限付与
deno run --allow-net --allow-read main.ts

# すべての権限を付与
deno run --allow-all main.ts

# 環境変数を指定
deno run --env=.env main.ts
```

### 権限管理

```typescript
// main.ts

// ネットワークアクセス（--allow-net が必要）
const response = await fetch('https://api.example.com/data')

// ファイル読み込み（--allow-read が必要）
const text = await Deno.readTextFile('./data.txt')

// ファイル書き込み（--allow-write が必要）
await Deno.writeTextFile('./output.txt', 'Hello Deno')

// 環境変数（--allow-env が必要）
const apiKey = Deno.env.get('API_KEY')

// サブプロセス実行（--allow-run が必要）
const process = new Deno.Command('ls', { args: ['-la'] })
const output = await process.output()
```

```bash
# 詳細な権限指定
deno run \
  --allow-net=api.example.com \
  --allow-read=./data \
  --allow-write=./output \
  --allow-env=API_KEY \
  main.ts

# インタラクティブな権限確認
deno run --prompt main.ts
# → 実行時に権限を確認するプロンプトが表示
```

### TypeScript完全サポート

```typescript
// types.ts - トランスパイル不要で直接実行

// 最新のTypeScript機能をすべてサポート
type User = {
  id: number
  name: string
  email: string
}

// Decorators（Stage 3）
function log(target: any, key: string) {
  console.log(`Called ${key}`)
}

class UserService {
  @log
  async getUser(id: number): Promise<User> {
    const response = await fetch(`https://api.example.com/users/${id}`)
    return response.json()
  }
}

// Type-only imports
import type { ServerOptions } from './server.ts'

// satisfies operator
const config = {
  host: 'localhost',
  port: 3000,
} satisfies ServerOptions

// using declaration（自動リソース管理）
{
  using file = await Deno.open('./data.txt')
  // ブロックを抜けると自動的にファイルがクローズされる
}
```

## npmパッケージの使用

### npm: スキーマ

```typescript
// npm-import.ts

// npmパッケージを直接インポート
import express from 'npm:express@4'
import { z } from 'npm:zod@3'
import chalk from 'npm:chalk@5'

const app = express()

app.get('/', (req, res) => {
  res.send(chalk.blue('Hello from Deno + Express!'))
})

app.listen(3000, () => {
  console.log(chalk.green('Server running on http://localhost:3000'))
})

// Zodでバリデーション
const userSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().min(0),
})

type User = z.infer<typeof userSchema>

const user: User = {
  name: 'Alice',
  email: 'alice@example.com',
  age: 30,
}

console.log(userSchema.parse(user))
```

```bash
# 実行（npmパッケージは自動的にキャッシュされる）
deno run --allow-net --allow-read --allow-env npm-import.ts
```

### package.json対応

```json
// package.json

{
  "name": "my-deno-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "deno run --watch --allow-all src/main.ts",
    "start": "deno run --allow-all src/main.ts",
    "test": "deno test --allow-all"
  },
  "dependencies": {
    "express": "^4.18.2",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/express": "^4.17.21"
  }
}
```

```typescript
// src/main.ts

// package.jsonのdependenciesから自動的にインポート
import express from 'express'
import { z } from 'zod'

const app = express()

app.use(express.json())

const userSchema = z.object({
  name: z.string(),
  email: z.string().email(),
})

app.post('/users', (req, res) => {
  try {
    const user = userSchema.parse(req.body)
    res.json({ success: true, user })
  } catch (error) {
    res.status(400).json({ error: error.errors })
  }
})

app.listen(3000)
```

```bash
# node_modules のインストール（オプション）
deno install

# 実行（package.jsonが自動認識される）
deno task dev
```

### Node.js組み込みモジュール

```typescript
// node-modules.ts

// Node.js標準モジュールを使用
import { readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { join } from 'node:path'
import crypto from 'node:crypto'

// ファイル操作
const data = await readFile('./data.txt', 'utf-8')
await writeFile('./output.txt', data.toUpperCase())

// HTTPサーバー
const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Hello from Node.js HTTP module in Deno!')
})

server.listen(3000)

// 暗号化
const hash = crypto.createHash('sha256')
hash.update('password')
console.log(hash.digest('hex'))

// パス操作
const fullPath = join(import.meta.dirname!, 'data', 'users.json')
console.log(fullPath)
```

## Web標準API

### Fetch API

```typescript
// fetch-api.ts

// GET リクエスト
const response = await fetch('https://api.example.com/users')
const users = await response.json()

// POST リクエスト
const newUser = {
  name: 'Alice',
  email: 'alice@example.com',
}

const createResponse = await fetch('https://api.example.com/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(newUser),
})

const created = await createResponse.json()

// エラーハンドリング
try {
  const response = await fetch('https://api.example.com/data')

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`)
  }

  const data = await response.json()
  console.log(data)
} catch (error) {
  console.error('Fetch error:', error)
}
```

### WebSocket

```typescript
// websocket-client.ts

const ws = new WebSocket('wss://echo.websocket.org')

ws.onopen = () => {
  console.log('Connected')
  ws.send('Hello WebSocket!')
}

ws.onmessage = (event) => {
  console.log('Received:', event.data)
}

ws.onerror = (error) => {
  console.error('WebSocket error:', error)
}

ws.onclose = () => {
  console.log('Disconnected')
}
```

### ファイルシステムAPI

```typescript
// file-system.ts

// ファイル読み込み
const text = await Deno.readTextFile('./data.txt')
const bytes = await Deno.readFile('./image.png')

// ファイル書き込み
await Deno.writeTextFile('./output.txt', 'Hello Deno')
await Deno.writeFile('./copy.png', bytes)

// ディレクトリ操作
await Deno.mkdir('./new-dir', { recursive: true })

// ファイル一覧
for await (const entry of Deno.readDir('./')) {
  console.log(entry.name, entry.isFile ? 'file' : 'directory')
}

// ファイル情報
const fileInfo = await Deno.stat('./data.txt')
console.log('Size:', fileInfo.size)
console.log('Modified:', fileInfo.mtime)

// ファイル削除
await Deno.remove('./temp.txt')
await Deno.remove('./temp-dir', { recursive: true })

// ファイルコピー
await Deno.copyFile('./source.txt', './destination.txt')

// ファイルリネーム
await Deno.rename('./old-name.txt', './new-name.txt')
```

## HTTPサーバー

### 基本的なサーバー

```typescript
// server.ts

Deno.serve({ port: 3000 }, (req) => {
  const url = new URL(req.url)

  if (url.pathname === '/') {
    return new Response('Hello Deno!', {
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
})
```

```bash
# サーバー起動
deno run --allow-net server.ts
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

Deno.serve({ port: 3000 }, async (req) => {
  const url = new URL(req.url)
  const method = req.method

  // CORS設定
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }

  if (method === 'OPTIONS') {
    return new Response(null, { headers })
  }

  // GET /api/users
  if (method === 'GET' && url.pathname === '/api/users') {
    return Response.json(users, { headers })
  }

  // GET /api/users/:id
  const userMatch = url.pathname.match(/^\/api\/users\/(\d+)$/)
  if (method === 'GET' && userMatch) {
    const id = parseInt(userMatch[1])
    const user = users.find((u) => u.id === id)

    if (!user) {
      return Response.json({ error: 'User not found' }, {
        status: 404,
        headers,
      })
    }

    return Response.json(user, { headers })
  }

  // POST /api/users
  if (method === 'POST' && url.pathname === '/api/users') {
    const body = await req.json() as Omit<User, 'id'>
    const newUser: User = {
      id: Math.max(...users.map((u) => u.id)) + 1,
      ...body,
    }
    users.push(newUser)

    return Response.json(newUser, { status: 201, headers })
  }

  // PUT /api/users/:id
  if (method === 'PUT' && userMatch) {
    const id = parseInt(userMatch[1])
    const index = users.findIndex((u) => u.id === id)

    if (index === -1) {
      return Response.json({ error: 'User not found' }, {
        status: 404,
        headers,
      })
    }

    const body = await req.json() as Partial<User>
    users[index] = { ...users[index], ...body }

    return Response.json(users[index], { headers })
  }

  // DELETE /api/users/:id
  if (method === 'DELETE' && userMatch) {
    const id = parseInt(userMatch[1])
    const index = users.findIndex((u) => u.id === id)

    if (index === -1) {
      return Response.json({ error: 'User not found' }, {
        status: 404,
        headers,
      })
    }

    users.splice(index, 1)

    return new Response(null, { status: 204, headers })
  }

  return Response.json({ error: 'Not found' }, { status: 404, headers })
})
```

### WebSocketサーバー

```typescript
// websocket-server.ts

const clients = new Set<WebSocket>()

Deno.serve({ port: 3000 }, (req) => {
  const upgrade = req.headers.get('upgrade') || ''

  if (upgrade.toLowerCase() !== 'websocket') {
    return new Response('Not a websocket request', { status: 400 })
  }

  const { socket, response } = Deno.upgradeWebSocket(req)

  socket.onopen = () => {
    console.log('Client connected')
    clients.add(socket)
  }

  socket.onmessage = (event) => {
    console.log('Received:', event.data)

    // 全クライアントにブロードキャスト
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(`Echo: ${event.data}`)
      }
    }
  }

  socket.onclose = () => {
    console.log('Client disconnected')
    clients.delete(socket)
  }

  socket.onerror = (error) => {
    console.error('WebSocket error:', error)
    clients.delete(socket)
  }

  return response
})
```

### 静的ファイル配信

```typescript
// static-server.ts

import { serveDir } from 'jsr:@std/http/file-server'

Deno.serve({ port: 3000 }, (req) => {
  return serveDir(req, {
    fsRoot: './public',
    urlRoot: '',
    showDirListing: true,
    enableCors: true,
  })
})
```

## データベース

### SQLite

```typescript
// sqlite.ts

import { Database } from 'jsr:@db/sqlite'

// データベース接続
const db = new Database('mydb.sqlite')

// テーブル作成
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

// データ挿入
const insert = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)')
insert.run('Alice', 'alice@example.com')
insert.run('Bob', 'bob@example.com')

// データ取得
const getUser = db.prepare('SELECT * FROM users WHERE id = ?')
const user = getUser.get<{ id: number; name: string; email: string }>(1)
console.log(user)

// 全件取得
const allUsers = db.prepare('SELECT * FROM users').all()
console.log(allUsers)

// トランザクション
db.transaction(() => {
  const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)')
  stmt.run('Charlie', 'charlie@example.com')
  stmt.run('David', 'david@example.com')
})

// クローズ
db.close()
```

### PostgreSQL

```typescript
// postgres.ts

import { Client } from 'https://deno.land/x/postgres/mod.ts'

const client = new Client({
  user: 'postgres',
  password: 'password',
  database: 'mydb',
  hostname: 'localhost',
  port: 5432,
})

await client.connect()

// テーブル作成
await client.queryArray(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
  )
`)

// データ挿入
await client.queryArray(
  'INSERT INTO users (name, email) VALUES ($1, $2)',
  ['Alice', 'alice@example.com']
)

// データ取得
const result = await client.queryObject<{ id: number; name: string; email: string }>(
  'SELECT * FROM users WHERE id = $1',
  [1]
)

console.log(result.rows[0])

// 全件取得
const allUsers = await client.queryObject('SELECT * FROM users')
console.log(allUsers.rows)

await client.end()
```

## テスト

### 基本的なテスト

```typescript
// math.test.ts

import { assertEquals, assertThrows } from 'jsr:@std/assert'

function add(a: number, b: number): number {
  return a + b
}

Deno.test('add function', () => {
  assertEquals(add(1, 2), 3)
  assertEquals(add(-1, 1), 0)
  assertEquals(add(0, 0), 0)
})

Deno.test('add with negative numbers', () => {
  assertEquals(add(-5, -3), -8)
})

function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Division by zero')
  }
  return a / b
}

Deno.test('divide function', () => {
  assertEquals(divide(10, 2), 5)
  assertThrows(() => divide(10, 0), Error, 'Division by zero')
})
```

```bash
# テスト実行
deno test

# 特定のファイルのみ
deno test math.test.ts

# カバレッジ
deno test --coverage=coverage

# カバレッジレポート生成
deno coverage coverage --html
```

### 非同期テスト

```typescript
// async.test.ts

import { assertEquals } from 'jsr:@std/assert'

async function fetchUser(id: number) {
  const response = await fetch(`https://jsonplaceholder.typicode.com/users/${id}`)
  return response.json()
}

Deno.test('fetch user', async () => {
  const user = await fetchUser(1)
  assertEquals(typeof user.name, 'string')
  assertEquals(typeof user.email, 'string')
})

Deno.test({
  name: 'async test with timeout',
  async fn() {
    await new Promise((resolve) => setTimeout(resolve, 100))
    assertEquals(1 + 1, 2)
  },
  sanitizeResources: false,
  sanitizeOps: false,
})
```

### モック

```typescript
// mock.test.ts

import { assertEquals } from 'jsr:@std/assert'
import { stub, spy } from 'jsr:@std/testing/mock'

Deno.test('stub example', () => {
  const obj = {
    method: () => 'original',
  }

  using stubMethod = stub(obj, 'method', () => 'mocked')

  assertEquals(obj.method(), 'mocked')
})

Deno.test('spy example', () => {
  const obj = {
    method: (x: number) => x * 2,
  }

  using spyMethod = spy(obj, 'method')

  obj.method(5)
  obj.method(10)

  assertEquals(spyMethod.calls.length, 2)
  assertEquals(spyMethod.calls[0].args, [5])
  assertEquals(spyMethod.calls[1].args, [10])
})
```

## 組み込みツール

### Linter

```bash
# lint実行
deno lint

# 特定のファイルのみ
deno lint src/

# 自動修正
deno lint --fix

# 設定ファイル
# deno.json
```

```json
{
  "lint": {
    "files": {
      "include": ["src/"],
      "exclude": ["src/generated/"]
    },
    "rules": {
      "tags": ["recommended"],
      "include": ["ban-untagged-todo"],
      "exclude": ["no-unused-vars"]
    }
  }
}
```

### Formatter

```bash
# フォーマット実行
deno fmt

# 特定のファイルのみ
deno fmt src/

# チェックのみ（修正しない）
deno fmt --check

# 設定ファイル
# deno.json
```

```json
{
  "fmt": {
    "files": {
      "include": ["src/"],
      "exclude": ["src/generated/"]
    },
    "options": {
      "useTabs": false,
      "lineWidth": 100,
      "indentWidth": 2,
      "semiColons": false,
      "singleQuote": true,
      "proseWrap": "preserve"
    }
  }
}
```

### ドキュメント生成

```bash
# ドキュメント生成
deno doc main.ts

# HTMLドキュメント生成
deno doc --html --name="My Project" main.ts

# JSONドキュメント生成
deno doc --json main.ts > docs.json
```

## デプロイ

### Deno Deploy

```bash
# Deno Deployにデプロイ
deployctl deploy --project=my-project main.ts

# 環境変数を指定
deployctl deploy --project=my-project --env=.env main.ts
```

```typescript
// main.ts（Deno Deploy用）

Deno.serve((req) => {
  return new Response('Hello from Deno Deploy!')
})
```

### Docker

```dockerfile
# Dockerfile

FROM denoland/deno:latest

WORKDIR /app

# 依存関係をキャッシュ
COPY deno.json deno.lock ./
RUN deno install

# ソースコードをコピー
COPY . .

# アプリケーション実行
CMD ["deno", "run", "--allow-net", "--allow-read", "main.ts"]
```

```bash
# ビルド
docker build -t my-deno-app .

# 実行
docker run -p 3000:3000 my-deno-app
```

### systemd（Linux）

```ini
# /etc/systemd/system/deno-app.service

[Unit]
Description=Deno Application
After=network.target

[Service]
Type=simple
User=deno
WorkingDirectory=/home/deno/app
ExecStart=/home/deno/.deno/bin/deno run --allow-net --allow-read main.ts
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
# サービス有効化
sudo systemctl enable deno-app
sudo systemctl start deno-app

# ステータス確認
sudo systemctl status deno-app
```

## まとめ

Deno 2は、セキュアでモダンなJavaScript/TypeScriptランタイムです。

**主な利点**
- Node.js完全互換（package.json、npm対応）
- TypeScript最適化（トランスパイル不要、高速）
- セキュアデフォルト（明示的な権限管理）
- 組み込みツール（linter、formatter、テストランナー）
- Web標準API（fetch、WebSocketなど）

**適用場面**
- 新規プロジェクト（TypeScript優先）
- セキュリティが重要なアプリケーション
- エッジコンピューティング（Deno Deploy）
- CLIツール・スクリプト

**ベストプラクティス**
- 権限を最小限に（セキュリティ）
- Web標準APIを優先
- TypeScriptを最大限活用
- 組み込みツールを使用（linter、formatter）

2026年現在、Deno 2はNode.js完全互換を実現し、既存のNode.jsプロジェクトからの移行も容易になっています。

**参考リンク**
- [Deno公式ドキュメント](https://deno.com/manual)
- [Deno Deploy](https://deno.com/deploy)
- [JSR（JavaScript Registry）](https://jsr.io/)
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)

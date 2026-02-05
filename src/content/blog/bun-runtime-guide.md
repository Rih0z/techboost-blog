---
title: 'Bun完全ガイド2026 — 高速JavaScriptランタイム & オールインワンツール'
description: 'Bunの完全ガイド。JavaScriptランタイム、パッケージマネージャー、バンドラー、テストランナーの全機能を実践的に解説。'
pubDate: 'Feb 05 2026'
tags: ['Bun', 'JavaScript', 'Runtime', 'Package Manager', 'Bundler']
---

Bunは、2026年現在、最も注目されているJavaScriptランタイムの一つです。Node.jsやDenoの代替として、高速なパッケージマネージャー、バンドラー、テストランナーを統合し、開発体験を大幅に向上させます。この記事では、Bunの全機能を実践的に解説します。

## Bunとは

Bunは、以下の特徴を持つオールインワンJavaScriptツールです。

- **高速ランタイム**: JavaScriptCoreエンジンを使用、Node.jsより3倍高速
- **パッケージマネージャー**: npm/yarn/pnpmより10-100倍高速
- **バンドラー**: esbuild/webpackより高速なビルド
- **テストランナー**: Jest互換のテストフレームワーク
- **TypeScript/JSXサポート**: トランスパイル不要で実行可能
- **Node.js互換**: 既存のnpmパッケージをそのまま使用可能

## インストール

### macOS/Linux

```bash
# インストール
curl -fsSL https://bun.sh/install | bash

# バージョン確認
bun --version
```

### Windows

```powershell
# PowerShellで実行
powershell -c "irm bun.sh/install.ps1 | iex"

# または、WSL経由
wsl curl -fsSL https://bun.sh/install | bash
```

### Dockerで使用

```dockerfile
FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install

COPY . .

CMD ["bun", "run", "index.ts"]
```

## Bunランタイム

### TypeScript/JSXを直接実行

```bash
# TypeScriptファイルを実行（トランスパイル不要）
bun run index.ts

# JSXファイルを実行
bun run app.tsx

# watchモード
bun --watch index.ts

# hotモード（変更時に自動リロード）
bun --hot index.ts
```

### 基本的な使い方

```typescript
// index.ts
console.log('Hello from Bun!');

// TypeScriptの型チェック
const greeting: string = 'Hello';
console.log(greeting);

// トップレベルawait
const response = await fetch('https://api.example.com/data');
const data = await response.json();
console.log(data);
```

実行:

```bash
bun run index.ts
```

### HTTPサーバー

Bunは非常に高速なHTTPサーバーを内蔵しています。

```typescript
// server.ts
const server = Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/') {
      return new Response('Hello Bun!');
    }

    if (url.pathname === '/json') {
      return Response.json({ message: 'Hello', timestamp: Date.now() });
    }

    return new Response('Not Found', { status: 404 });
  },
});

console.log(`Listening on http://localhost:${server.port}`);
```

```bash
bun run server.ts
```

### ファイル操作

Bunは高速なファイルAPIを提供します。

```typescript
// ファイル読み込み
const file = Bun.file('data.json');
const text = await file.text();
const json = await file.json();

// ファイル書き込み
await Bun.write('output.txt', 'Hello Bun!');
await Bun.write('data.json', JSON.stringify({ name: 'Bun' }));

// ストリーム
const stream = Bun.file('large-file.txt').stream();
for await (const chunk of stream) {
  console.log(chunk);
}
```

### 環境変数

```typescript
// .env.local
// API_KEY=secret123

// 環境変数を読み込み（自動）
console.log(Bun.env.API_KEY); // 'secret123'
console.log(process.env.API_KEY); // 'secret123'

// .env.productionを読み込み
import { env } from 'bun';
console.log(env.NODE_ENV);
```

## パッケージマネージャー

### プロジェクト初期化

```bash
# 新しいプロジェクト作成
bun init

# package.jsonが生成される
```

### パッケージインストール

```bash
# package.jsonからインストール
bun install

# パッケージを追加
bun add react react-dom
bun add -d @types/react @types/react-dom

# グローバルインストール
bun add -g typescript

# 特定バージョン
bun add react@18.2.0

# devDependenciesに追加
bun add -d prettier eslint
```

### パッケージ削除

```bash
# パッケージを削除
bun remove react

# 未使用パッケージをクリーンアップ
bun pm cache rm
```

### パッケージアップデート

```bash
# すべてのパッケージを最新に
bun update

# 特定パッケージのみ
bun update react react-dom
```

### 速度比較

```
npm install:     45秒
yarn install:    30秒
pnpm install:    15秒
bun install:     0.5秒（90倍高速）
```

### bun.lockb

Bunは独自のバイナリロックファイル `bun.lockb` を使用します。

```bash
# ロックファイルを更新
bun install --force

# ロックファイルを再生成
rm bun.lockb
bun install
```

## スクリプト実行

### package.jsonのscripts

```json
{
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "build": "bun build src/index.ts --outdir ./dist",
    "test": "bun test",
    "start": "bun run dist/index.js"
  }
}
```

```bash
# スクリプト実行
bun run dev
bun run build
bun test

# または短縮形
bun dev
bun build
```

### 環境変数を渡す

```bash
# 環境変数を設定して実行
NODE_ENV=production bun run start

# .envファイルを指定
bun --env-file=.env.production run start
```

## バンドラー

### 基本的なビルド

```bash
# シングルファイルにバンドル
bun build ./src/index.ts --outdir ./dist

# minify
bun build ./src/index.ts --outdir ./dist --minify

# sourcemap生成
bun build ./src/index.ts --outdir ./dist --sourcemap=external
```

### エントリーポイント複数

```bash
# 複数のエントリーポイント
bun build ./src/index.ts ./src/worker.ts --outdir ./dist
```

### ターゲット指定

```bash
# ブラウザ向け
bun build ./src/index.ts --outdir ./dist --target browser

# Node.js向け
bun build ./src/index.ts --outdir ./dist --target node

# Bun向け
bun build ./src/index.ts --outdir ./dist --target bun
```

### プログラマティックビルド

```typescript
// build.ts
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  minify: true,
  sourcemap: 'external',
  target: 'browser',
  splitting: true, // コード分割
  external: ['react', 'react-dom'], // バンドルから除外
});
```

### React/Next.jsのビルド

```typescript
// React コンポーネント
// App.tsx
import React from 'react';

export default function App() {
  return (
    <div>
      <h1>Hello Bun + React</h1>
    </div>
  );
}
```

```bash
# Reactプロジェクトをビルド
bun build ./src/App.tsx --outdir ./dist --target browser --minify
```

### バンドルサイズの最適化

```typescript
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  minify: {
    whitespace: true,
    identifiers: true,
    syntax: true,
  },
  naming: '[dir]/[name]-[hash].[ext]', // ファイル名にハッシュを追加
});
```

## テストランナー

### 基本的なテスト

```typescript
// math.test.ts
import { expect, test, describe } from 'bun:test';

describe('Math operations', () => {
  test('addition', () => {
    expect(1 + 1).toBe(2);
  });

  test('subtraction', () => {
    expect(5 - 3).toBe(2);
  });

  test('multiplication', () => {
    expect(2 * 3).toBe(6);
  });
});
```

```bash
# テスト実行
bun test

# watchモード
bun test --watch

# 特定ファイルのみ
bun test math.test.ts

# カバレッジ
bun test --coverage
```

### 非同期テスト

```typescript
// async.test.ts
import { expect, test } from 'bun:test';

test('async fetch', async () => {
  const response = await fetch('https://api.example.com/data');
  const data = await response.json();
  expect(data).toBeDefined();
});

test('timeout', async () => {
  await new Promise(resolve => setTimeout(resolve, 100));
  expect(true).toBe(true);
}, { timeout: 200 });
```

### モック

```typescript
// mock.test.ts
import { expect, test, mock } from 'bun:test';

test('mock function', () => {
  const mockFn = mock((a: number, b: number) => a + b);

  mockFn(1, 2);
  mockFn(3, 4);

  expect(mockFn).toHaveBeenCalledTimes(2);
  expect(mockFn).toHaveBeenCalledWith(1, 2);
  expect(mockFn).toHaveBeenCalledWith(3, 4);
});

test('mock module', async () => {
  mock.module('./utils', () => ({
    add: (a: number, b: number) => a + b + 1, // モック実装
  }));

  const { add } = await import('./utils');
  expect(add(1, 2)).toBe(4); // モックされた値
});
```

### スナップショットテスト

```typescript
// snapshot.test.ts
import { expect, test } from 'bun:test';

test('snapshot', () => {
  const data = {
    name: 'Bun',
    version: '1.0.0',
    features: ['fast', 'all-in-one'],
  };

  expect(data).toMatchSnapshot();
});
```

## 実践例

### REST API

```typescript
// api/server.ts
const server = Bun.serve({
  port: 3000,

  async fetch(req) {
    const url = new URL(req.url);

    // CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        },
      });
    }

    // GET /api/users
    if (url.pathname === '/api/users' && req.method === 'GET') {
      const users = await db.getAllUsers();
      return Response.json(users);
    }

    // POST /api/users
    if (url.pathname === '/api/users' && req.method === 'POST') {
      const body = await req.json();
      const user = await db.createUser(body);
      return Response.json(user, { status: 201 });
    }

    // GET /api/users/:id
    const userMatch = url.pathname.match(/^\/api\/users\/(\d+)$/);
    if (userMatch && req.method === 'GET') {
      const userId = parseInt(userMatch[1]);
      const user = await db.getUserById(userId);
      return user ? Response.json(user) : new Response('Not Found', { status: 404 });
    }

    return new Response('Not Found', { status: 404 });
  },
});

console.log(`Server running on http://localhost:${server.port}`);
```

### WebSocketサーバー

```typescript
// websocket.ts
const server = Bun.serve({
  port: 3000,

  fetch(req, server) {
    if (server.upgrade(req)) {
      return; // WebSocketにアップグレード
    }
    return new Response('WebSocket server');
  },

  websocket: {
    open(ws) {
      console.log('Client connected');
      ws.send('Welcome!');
    },

    message(ws, message) {
      console.log('Received:', message);
      ws.send(`Echo: ${message}`);
    },

    close(ws) {
      console.log('Client disconnected');
    },
  },
});

console.log(`WebSocket server running on ws://localhost:${server.port}`);
```

クライアント側:

```typescript
const ws = new WebSocket('ws://localhost:3000');

ws.onopen = () => {
  console.log('Connected');
  ws.send('Hello server!');
};

ws.onmessage = (event) => {
  console.log('Message:', event.data);
};
```

### SQLiteデータベース

```typescript
// db.ts
import { Database } from 'bun:sqlite';

const db = new Database('mydb.sqlite');

// テーブル作成
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// INSERT
const insertStmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
insertStmt.run('John Doe', 'john@example.com');

// SELECT
const selectStmt = db.prepare('SELECT * FROM users WHERE id = ?');
const user = selectStmt.get(1);
console.log(user);

// SELECT ALL
const allUsers = db.query('SELECT * FROM users').all();
console.log(allUsers);

// トランザクション
const transaction = db.transaction(() => {
  insertStmt.run('Alice', 'alice@example.com');
  insertStmt.run('Bob', 'bob@example.com');
});

transaction(); // トランザクション実行

db.close();
```

### ファイルアップロード

```typescript
// upload-server.ts
const server = Bun.serve({
  port: 3000,

  async fetch(req) {
    if (req.method === 'POST' && req.url.endsWith('/upload')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return new Response('No file uploaded', { status: 400 });
      }

      // ファイルを保存
      await Bun.write(`uploads/${file.name}`, file);

      return Response.json({
        message: 'File uploaded successfully',
        filename: file.name,
        size: file.size,
      });
    }

    return new Response('Upload endpoint: POST /upload');
  },
});
```

### スケジューラー（Cron）

```typescript
// scheduler.ts
async function runTask() {
  console.log('Task running at', new Date().toISOString());
  // タスク処理
}

// 10秒ごとに実行
setInterval(runTask, 10000);

// 毎日午前2時に実行（外部ライブラリ使用）
import cron from 'node-cron';

cron.schedule('0 2 * * *', () => {
  console.log('Daily task running');
  runTask();
});
```

## パフォーマンス比較

### ランタイム速度

```
ベンチマーク: HTTP リクエスト処理
Node.js: 50,000 req/s
Deno:    60,000 req/s
Bun:     150,000 req/s (3倍高速)
```

### 起動時間

```
Node.js: 150ms
Deno:    120ms
Bun:     3ms (50倍高速)
```

### パッケージインストール

```
npm:  45秒
yarn: 30秒
pnpm: 15秒
Bun:  0.5秒
```

## 制限事項と注意点

### Node.js互換性

Bunは多くのNode.js APIをサポートしていますが、一部未対応のAPIがあります。

```typescript
// サポートされているAPI
import fs from 'fs';
import path from 'path';
import http from 'http';
import crypto from 'crypto';

// 一部未対応のAPI
// - child_process（一部）
// - clusterモジュール
// - 一部のネイティブモジュール
```

### ブラウザAPIの制限

Bunはサーバーサイドランタイムなので、一部のブラウザAPIは使用できません。

### TypeScript設定

```json
// tsconfig.json
{
  "compilerOptions": {
    "types": ["bun-types"],
    "lib": ["ESNext"],
    "module": "esnext",
    "target": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "strict": true
  }
}
```

## まとめ

Bunの主な特徴:

**利点:**
- 圧倒的な高速性（Node.jsの3倍）
- オールインワンツール（ランタイム + パッケージマネージャー + バンドラー + テストランナー）
- TypeScript/JSXのネイティブサポート
- Node.js互換性
- シンプルなAPI

**適しているケース:**
- 新規プロジェクト
- パフォーマンスが重要なAPI
- 開発効率を重視する場合
- モノレポ環境

**注意点:**
- Node.js完全互換ではない
- エコシステムはまだ発展途上
- 本番環境での実績は少ない

Bunは、2026年現在、最も革新的なJavaScriptツールの一つです。開発体験とパフォーマンスを両立させたい開発者に最適です。

---
title: "Deno 2.0移行ガイド - Node.jsプロジェクトをDenoに移行する実践手順"
description: "既存のNode.jsプロジェクトをDeno 2.0に移行する具体的な手順を解説。互換性レイヤー、npm依存関係、TypeScript設定、テスト移行など、スムーズな移行のためのベストプラクティスを紹介します。"
pubDate: "2025-02-05"
---

## Deno 2.0への移行を検討すべき理由

Deno 2.0は、Node.jsとの互換性を大幅に向上させ、既存のNode.jsエコシステムをそのまま活用できるようになりました。以下のような利点があります:

### Deno 2.0の主な利点

- **npm完全サポート**: package.jsonとnode_modulesがそのまま使える
- **TypeScript標準**: 設定不要でTypeScriptが動く
- **セキュリティ**: デフォルトで権限制御
- **標準ライブラリ**: 高品質な標準ライブラリ
- **Webプラットフォーム互換**: fetch、WebSocket、Web Crypto API
- **パフォーマンス**: V8エンジンの最適化
- **シングルバイナリ**: 依存関係なしで動作

## 移行の前提条件

### Denoのインストール

```bash
# macOS / Linux
curl -fsSL https://deno.land/install.sh | sh

# Homebrew (macOS)
brew install deno

# Windows (PowerShell)
irm https://deno.land/install.ps1 | iex

# バージョン確認
deno --version
```

### Node.jsプロジェクトの評価

移行前に、プロジェクトの状態を確認します:

```bash
# プロジェクトの依存関係を確認
npm list --depth=0

# TypeScript設定を確認
cat tsconfig.json

# ビルド・テストスクリプトを確認
cat package.json | jq '.scripts'
```

## 段階的移行戦略

### フェーズ1: Deno互換性チェック

```bash
# プロジェクトディレクトリで実行
deno check --node-modules-dir src/**/*.ts

# npmパッケージの互換性チェック
deno info npm:express
deno info npm:react
```

### フェーズ2: package.jsonの準備

Deno 2.0では、既存のpackage.jsonをそのまま使用できます。

```json
// package.json

{
  "name": "my-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "deno run --allow-all --node-modules-dir src/server.ts",
    "build": "deno run --allow-all build.ts",
    "test": "deno test --allow-all"
  },
  "dependencies": {
    "express": "^4.18.2",
    "dotenv": "^16.0.3"
  },
  "devDependencies": {
    "@types/express": "^4.17.17",
    "@types/node": "^20.0.0"
  }
}
```

### フェーズ3: deno.jsonの作成

Deno固有の設定を追加します。

```json
// deno.json

{
  "compilerOptions": {
    "allowJs": true,
    "lib": ["deno.window"],
    "strict": true
  },
  "nodeModulesDir": true,
  "imports": {
    "@/": "./src/",
    "@shared/": "./shared/"
  },
  "tasks": {
    "dev": "deno run --allow-all --watch src/server.ts",
    "build": "deno run --allow-all build.ts",
    "test": "deno test --allow-all"
  },
  "lint": {
    "include": ["src/"],
    "rules": {
      "tags": ["recommended"]
    }
  },
  "fmt": {
    "useTabs": false,
    "lineWidth": 100,
    "indentWidth": 2,
    "semiColons": true,
    "singleQuote": true,
    "proseWrap": "preserve"
  }
}
```

## Expressアプリの移行例

### Node.js版 (移行前)

```typescript
// src/server.ts (Node.js)

import express from 'express';
import dotenv from 'dotenv';
import { router } from './routes/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api', router);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Deno 2.0版 (移行後)

```typescript
// src/server.ts (Deno)

import express from 'npm:express@^4.18.2';
import { load } from 'https://deno.land/std@0.224.0/dotenv/mod.ts';
import { router } from './routes/index.ts';

// 環境変数読み込み
const env = await load();
const PORT = Number(env.PORT || 3000);

const app = express();

app.use(express.json());
app.use('/api', router);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

実行:

```bash
# 開発モード（ホットリロード付き）
deno run --allow-net --allow-read --allow-env --watch src/server.ts

# または deno.jsonのタスク使用
deno task dev
```

## npm依存関係の扱い

### 方法1: npm: スキーマ（推奨）

```typescript
// 直接npmから読み込む
import express from 'npm:express@^4.18.2';
import lodash from 'npm:lodash@^4.17.21';

// 型定義も自動解決
const result = lodash.chunk([1, 2, 3, 4], 2);
```

### 方法2: package.jsonを使用

```bash
# node_modulesディレクトリを生成
deno install

# または実行時に生成
deno run --node-modules-dir --allow-all src/server.ts
```

```typescript
// Node.js互換の読み込み
import express from 'express';
import lodash from 'lodash';
```

### 方法3: Import Mapsを使用

```json
// deno.json

{
  "imports": {
    "express": "npm:express@^4.18.2",
    "lodash": "npm:lodash@^4.17.21",
    "@/": "./src/"
  }
}
```

```typescript
// すっきりした読み込み
import express from 'express';
import lodash from 'lodash';
import { config } from '@/config.ts';
```

## データベース接続の移行

### PostgreSQL (Node.js → Deno)

**Node.js版:**

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function query(text: string, params?: any[]) {
  const result = await pool.query(text, params);
  return result.rows;
}
```

**Deno版 (PostgreSQL native):**

```typescript
import { Client } from 'https://deno.land/x/postgres@v0.17.0/mod.ts';

const client = new Client({
  user: Deno.env.get('DB_USER'),
  database: Deno.env.get('DB_NAME'),
  hostname: Deno.env.get('DB_HOST'),
  password: Deno.env.get('DB_PASSWORD'),
  port: Number(Deno.env.get('DB_PORT')),
});

await client.connect();

export async function query(text: string, params?: any[]) {
  const result = await client.queryObject(text, params);
  return result.rows;
}
```

**Deno版 (npm:pg使用):**

```typescript
import pg from 'npm:pg@^8.11.0';

const pool = new pg.Pool({
  connectionString: Deno.env.get('DATABASE_URL'),
});

export async function query(text: string, params?: any[]) {
  const result = await pool.query(text, params);
  return result.rows;
}
```

## ファイルシステム操作の移行

### Node.js版

```typescript
import fs from 'fs/promises';
import path from 'path';

export async function readConfig() {
  const configPath = path.join(__dirname, 'config.json');
  const data = await fs.readFile(configPath, 'utf-8');
  return JSON.parse(data);
}

export async function writeLog(message: string) {
  const logPath = path.join(__dirname, 'logs', 'app.log');
  await fs.appendFile(logPath, `${new Date().toISOString()}: ${message}\n`);
}
```

### Deno版

```typescript
import { join } from 'https://deno.land/std@0.224.0/path/mod.ts';

export async function readConfig() {
  const configPath = join(Deno.cwd(), 'config.json');
  const data = await Deno.readTextFile(configPath);
  return JSON.parse(data);
}

export async function writeLog(message: string) {
  const logPath = join(Deno.cwd(), 'logs', 'app.log');
  const logMessage = `${new Date().toISOString()}: ${message}\n`;
  await Deno.writeTextFile(logPath, logMessage, { append: true });
}
```

## 環境変数の扱い

### Node.js版

```typescript
import dotenv from 'dotenv';

dotenv.config();

const config = {
  port: process.env.PORT || 3000,
  dbUrl: process.env.DATABASE_URL,
  apiKey: process.env.API_KEY,
};
```

### Deno版

```typescript
import { load } from 'https://deno.land/std@0.224.0/dotenv/mod.ts';

const env = await load();

const config = {
  port: Number(env.PORT || 3000),
  dbUrl: env.DATABASE_URL,
  apiKey: env.API_KEY,
};

// または直接Deno.envを使用
const port = Number(Deno.env.get('PORT') || 3000);
```

## テストの移行

### Node.js (Jest)

```typescript
// sum.test.ts

import { sum } from './sum';

describe('sum', () => {
  test('adds 1 + 2 to equal 3', () => {
    expect(sum(1, 2)).toBe(3);
  });
});
```

### Deno Test

```typescript
// sum_test.ts

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { sum } from './sum.ts';

Deno.test('sum adds 1 + 2 to equal 3', () => {
  assertEquals(sum(1, 2), 3);
});

Deno.test({
  name: 'sum with negative numbers',
  fn() {
    assertEquals(sum(-1, -2), -3);
  },
});

// 非同期テスト
Deno.test('async operation', async () => {
  const result = await fetchData();
  assertEquals(result.status, 'success');
});
```

実行:

```bash
# すべてのテストを実行
deno test

# 特定のファイルのみ
deno test src/utils/sum_test.ts

# カバレッジ取得
deno test --coverage=coverage
deno coverage coverage
```

## TypeScript設定の移行

### tsconfig.json (Node.js)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### deno.json (Deno)

Denoではほとんどの設定がデフォルトで適切です。

```json
{
  "compilerOptions": {
    "allowJs": true,
    "lib": ["deno.window"],
    "strict": true
  }
}
```

## ビルド・バンドル

### Node.js (webpack/esbuild)

```bash
npm run build
```

### Deno Bundle

```bash
# 単一ファイルにバンドル
deno bundle src/server.ts dist/server.js

# または deno compile で実行可能バイナリを生成
deno compile --allow-net --allow-read --allow-env --output ./bin/server src/server.ts

# クロスコンパイル
deno compile --target x86_64-unknown-linux-gnu --output ./bin/server-linux src/server.ts
deno compile --target x86_64-pc-windows-msvc --output ./bin/server.exe src/server.ts
deno compile --target aarch64-apple-darwin --output ./bin/server-mac-arm src/server.ts
```

## Docker化

### Dockerfile (Deno)

```dockerfile
# Dockerfile

FROM denoland/deno:1.42.0

WORKDIR /app

# 依存関係のキャッシュ
COPY deno.json deno.lock ./
RUN deno cache src/server.ts

# ソースコードをコピー
COPY . .

# アプリケーションを実行
EXPOSE 3000
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-env", "src/server.ts"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      - PORT=3000
      - DATABASE_URL=postgres://user:pass@db:5432/mydb
    volumes:
      - .:/app
    command: deno run --allow-all --watch src/server.ts

  db:
    image: postgres:15
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: mydb
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## よくある移行の問題と解決策

### 1. __dirname / __filenameが使えない

**問題:**
```typescript
// Node.jsではOK、Denoではエラー
const configPath = path.join(__dirname, 'config.json');
```

**解決策:**
```typescript
import { dirname, fromFileUrl, join } from 'https://deno.land/std@0.224.0/path/mod.ts';

const __dirname = dirname(fromFileUrl(import.meta.url));
const configPath = join(__dirname, 'config.json');
```

### 2. CommonJSモジュールの読み込み

**問題:**
```typescript
// require()は使えない
const express = require('express');
```

**解決策:**
```typescript
// ESMを使用
import express from 'npm:express@^4.18.2';

// またはnpm:プレフィックス
import express from 'npm:express';
```

### 3. グローバルな`process`オブジェクト

**問題:**
```typescript
// Node.jsグローバルは使えない
console.log(process.env.PORT);
```

**解決策:**
```typescript
// Deno.envを使用
console.log(Deno.env.get('PORT'));

// またはNode互換モードで実行
deno run --node-modules-dir --compat script.ts
```

## パフォーマンス比較

簡単なベンチマーク:

```typescript
// benchmark.ts

import { performance } from 'node:perf_hooks';

const iterations = 1000000;

console.time('Array operations');
const arr = Array.from({ length: iterations }, (_, i) => i);
const doubled = arr.map(x => x * 2).filter(x => x % 2 === 0);
console.timeEnd('Array operations');

console.time('File I/O');
for (let i = 0; i < 100; i++) {
  await Deno.writeTextFile(`/tmp/test-${i}.txt`, 'Hello, Deno!');
  await Deno.readTextFile(`/tmp/test-${i}.txt`);
}
console.timeEnd('File I/O');
```

```bash
# Node.jsで実行
node benchmark.ts

# Denoで実行
deno run --allow-read --allow-write benchmark.ts
```

## まとめ

Deno 2.0への移行は、以下の順序で進めるとスムーズです:

1. **互換性チェック**: npm依存関係とコードの確認
2. **段階的移行**: まずは小さなスクリプトから
3. **テスト**: Deno Testへの移行
4. **本番環境**: Dockerまたはバイナリでデプロイ

Deno 2.0の利点:
- ✅ TypeScript標準
- ✅ セキュリティファースト
- ✅ npm完全互換
- ✅ 標準ライブラリ充実
- ✅ シングルバイナリ配布

Node.jsからの移行は思ったより簡単です。ぜひDeno 2.0を試してみてください!

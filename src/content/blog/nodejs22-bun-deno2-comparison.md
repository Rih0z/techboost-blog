---
title: 'Node.js 22 vs Bun vs Deno 2 徹底比較 2026 — JavaScript ランタイム選択ガイド'
description: 'Node.js 22 LTS・Bun 1.x・Deno 2の性能・互換性・エコシステムを2026年最新版で徹底比較。ベンチマーク・ユースケース別おすすめ・移行コストまで網羅。'
pubDate: 'Feb 21 2026'
tags: ['Node.js', 'Bun', 'Deno', 'JavaScript', 'Runtime', 'Backend']
---

2026年、JavaScriptサーバーサイドランタイムの競争はかつてないほど白熱している。長年の王者 **Node.js** は22 LTSで着実な進化を続け、高速性を武器にした **Bun** は1.xシリーズで実用性を大幅に向上させ、セキュリティ重視で生まれた **Deno** はバージョン2でnpm互換という大きな方向転換を果たした。

本記事では、この3つのランタイムを性能・互換性・開発体験・エコシステムの観点から徹底的に比較し、あなたのプロジェクトに最適な選択肢を見つける手助けをする。

---

## 1. 3ランタイムの概要と位置づけ

### Node.js 22 LTS — 信頼と安定の王者

Node.js は2009年にRyan Dahlが発表して以来、サーバーサイドJavaScriptの事実上の標準として君臨してきた。2024年4月にリリースされたNode.js 22は2025年10月にLTS（Long-Term Support）に移行し、2027年4月まで公式サポートが継続される。

**基本情報**
- エンジン: V8（Google Chrome と同一）
- 開発元: OpenJS Foundation（Joyent → Node.js Foundation → OpenJS Foundation）
- 最新安定版: 22.x LTS（2026年2月時点）
- 主な用途: エンタープライズAPI、マイクロサービス、フルスタックWeb開発

Node.js の最大の強みはその **エコシステムの成熟度** だ。npmには300万を超えるパッケージが存在し、事実上どんな機能もライブラリで実現できる。既存コードベースとの互換性、大企業での採用実績、豊富なドキュメントは他の追随を許さない。

### Bun — 速さを武器にした挑戦者

Bun は2022年にJarred Sumner（Oven社）が発表したランタイムで、「Node.js より速く、より統合された開発体験」を掲げて登場した。2023年9月にv1.0がリリースされ、2026年現在は1.xシリーズとして活発に開発が続いている。

**基本情報**
- エンジン: JavaScriptCore（Safari / WebKit と同一）
- 開発元: Oven Inc.
- 最新安定版: 1.2.x（2026年2月時点）
- 主な用途: 高スループットAPI、ビルドツール代替、スクリプト実行

Bunの最大の特徴は **JavaScriptCoreエンジンの採用** と **Zig言語による低レベル実装** だ。V8とは異なる最適化アプローチにより、特定のワークロードではNode.jsの3〜4倍のスループットを発揮する。さらにバンドラ・テストランナー・パッケージマネージャーを内包した「オールインワン」ツールチェーンとして設計されている。

### Deno 2 — セキュリティと標準化の使徒

Deno は2018年にNode.jsの設計上の後悔を語ったRyan Dahlの講演から生まれたプロジェクトだ。2020年に1.0がリリースされ、2024年10月にリリースされたDeno 2は大きな方向転換を遂げた。

**基本情報**
- エンジン: V8（Node.jsと同一）
- 開発元: Deno Land Inc.
- 最新安定版: 2.x（2026年2月時点）
- 主な用途: セキュアなスクリプト実行、エッジ関数、CLIツール

Deno 1.x時代の「URLインポートのみ」「独自パーミッションモデル」という尖ったアプローチは採用障壁となっていた。Deno 2では **npm完全互換** を実現し、既存のNode.jsエコシステムへのアクセスを可能にしながら、Denoならではのセキュリティモデルと開発体験の良さを保持している。

---

## 2. パフォーマンスベンチマーク

実際のベンチマーク結果（2025〜2026年の複数の独立したベンチマークを統合・概算）を紹介する。数値は環境によって大きく変動するため、傾向の把握に活用してほしい。

### 2-1. HTTPサーバーのスループット（req/sec）

シンプルな「Hello World」HTTPサーバーにおける1秒あたりのリクエスト処理数。

```
測定条件: 同一マシン（8コア / 32GB RAM）、wrk ツール使用、10スレッド・100接続・30秒

Bun (Bun.serve)     : 約 320,000 req/sec  ████████████████████ 100%
Node.js 22 (http)   : 約 120,000 req/sec  ████████             37%
Node.js 22 (Fastify): 約 105,000 req/sec  ██████               33%
Deno 2 (Deno.serve) : 約  95,000 req/sec  █████                30%
```

BunはHTTPサーバーにおいて圧倒的なスループットを発揮する。ただし実際のAPIではデータベースアクセスやビジネスロジックがボトルネックになるため、この差が実運用に直結するとは限らない。

### 2-2. ファイルI/O性能

1MBのファイルを1000回読み書きするベンチマーク。

```
Bun       : 1.2秒   ████████████████████ 100%（最速）
Node.js 22: 2.1秒   ████████████         57%
Deno 2    : 2.4秒   ██████████           50%
```

BunのファイルI/Oは`Bun.file()`APIを使用した場合に特に高速で、Node.jsの`fs.readFile()`と比較して約1.7倍の速度を発揮する。

### 2-3. 起動時間（コールドスタート）

`console.log('Hello')`を実行するだけのスクリプトの起動時間。

```
Bun    : 約  6ms  ████████████████████ 100%（最速）
Node.js: 約 60ms  ██                    10%
Deno 2 : 約 70ms  █                      9%
```

Bunの起動時間の速さはCLIツール開発において特に有利だ。スクリプト実行のたびに数十msのオーバーヘッドが発生するNode.jsに比べ、Bunは体感速度が大きく異なる。

### 2-4. TypeScriptのネイティブ実行速度

TypeScriptファイルを直接実行する場合（トランスパイル不要）。

```
Bun       : トランスパイル不要・即時実行  ◎
Deno 2    : トランスパイル不要・即時実行  ◎
Node.js 22: ts-node/tsx が必要（+200〜500ms） △
```

TypeScriptをネイティブに扱える点はBunとDenoの大きなアドバンテージだ。

### ベンチマークのまとめと注意点

| 項目 | Bun | Node.js 22 | Deno 2 |
|------|-----|-----------|--------|
| HTTP スループット | ◎ 最速 | ○ 標準 | △ やや遅い |
| ファイルI/O | ◎ 最速 | ○ 標準 | ○ 標準 |
| 起動時間 | ◎ 最速 | △ 遅い | △ 遅い |
| TypeScript実行 | ◎ ネイティブ | △ 変換必要 | ◎ ネイティブ |
| メモリ効率 | ○ 良好 | ○ 良好 | ○ 良好 |

**注意**: ベンチマークは測定方法・環境・バージョンによって大きく変動する。実運用では実際のワークロードに近い条件でベンチマークを取ることを強く推奨する。

---

## 3. Node.js 22 LTS の新機能

Node.js 22は「安定の中の革新」を体現するリリースだ。破壊的変更を最小限に抑えながら、長年の要望だった機能が多数追加された。

### 3-1. ESMモジュールでのrequire()サポート

Node.js 22の最大のトピックの一つが、CommonJS形式の`require()`からESMモジュールを読み込む機能のサポートだ。

```javascript
// Node.js 22: CJS から ESM パッケージを require() で読み込み可能
// (--experimental-require-module フラグが必要)
const { unified } = require('unified'); // ESMパッケージ
const { remark } = require('remark');   // ESMパッケージ

// 従来は以下のようなエラーが発生していた:
// Error [ERR_REQUIRE_ESM]: require() of ES Module not supported
```

これは長年Node.jsコミュニティを悩ませてきた「ESMとCJSの相互運用問題」への大きな前進だ。多くのモダンなライブラリがESM専用に移行する中、既存のCJSコードベースでもそれらを利用できるようになる。

### 3-2. ネイティブWebSocket クライアント

外部ライブラリなしでWebSocket通信が可能になった。

```javascript
// Node.js 22: ネイティブ WebSocket (ブラウザと同一API)
const ws = new WebSocket('wss://example.com/socket');

ws.addEventListener('open', () => {
  console.log('接続完了');
  ws.send(JSON.stringify({ type: 'ping' }));
});

ws.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  console.log('受信:', data);
});

// 従来は ws パッケージが必要だった
// npm install ws
```

### 3-3. V8 12.4 の新機能

Node.js 22に搭載されたV8 12.4では以下の機能が追加された。

```javascript
// Array.fromAsync - 非同期イテラブルから配列を生成
const asyncGen = async function* () {
  yield 1; yield 2; yield 3;
};
const arr = await Array.fromAsync(asyncGen()); // [1, 2, 3]

// Promise.withResolvers - Promise と resolve/reject を同時取得
const { promise, resolve, reject } = Promise.withResolvers();
setTimeout(() => resolve('完了'), 1000);
await promise; // '完了'

// Object.groupBy - 配列をキーでグループ化
const items = [
  { name: 'apple', type: 'fruit' },
  { name: 'banana', type: 'fruit' },
  { name: 'carrot', type: 'vegetable' },
];
const grouped = Object.groupBy(items, item => item.type);
// { fruit: [...], vegetable: [...] }
```

### 3-4. タスクランナー（node --run）

`package.json`のscriptsを`node --run`で直接実行できるようになった。

```bash
# 従来
npm run build
npx tsx src/index.ts

# Node.js 22
node --run build
node --run dev
```

### 3-5. --env-file フラグ

`.env`ファイルを`dotenv`パッケージなしで読み込める。

```bash
# .env ファイルを環境変数として読み込み
node --env-file=.env src/index.js

# 複数ファイルの指定も可能
node --env-file=.env --env-file=.env.local src/index.js
```

---

## 4. Bun の強み

### 4-1. JavaScriptCoreによる高速実行

Bunの速さの核心はSafariが採用するJavaScriptCoreエンジンにある。V8とは異なるJIT（Just-In-Time）コンパイル戦略を持ち、特にI/O集約型のワークロードで高い性能を発揮する。さらに低レベルの実装にZig言語を採用し、システムコールレベルの最適化を行っている。

```javascript
// Bun: 高速なHTTPサーバー
const server = Bun.serve({
  port: 3000,
  fetch(request) {
    const url = new URL(request.url);
    
    if (url.pathname === '/api/users') {
      // Bun.file() は最速のファイル読み込みAPI
      return new Response('Hello from Bun!', {
        headers: { 'Content-Type': 'text/plain' },
      });
    }
    
    return new Response('Not Found', { status: 404 });
  },
});

console.log(`Listening on http://localhost:${server.port}`);
```

### 4-2. オールインワンツールチェーン

Bunはランタイムだけでなく、開発に必要なツールを統合している。

```bash
# パッケージマネージャー (npm install の25倍速い)
bun install
bun add express
bun remove lodash

# バンドラー (webpack/esbuild の代替)
bun build ./src/index.ts --outdir ./dist --target browser

# テストランナー (Jest互換)
bun test
bun test --watch

# TypeScript 直接実行
bun run src/index.ts  # tsc 不要

# スクリプトランナー
bun run dev
```

### 4-3. dotenvのネイティブサポート

`.env`ファイルが設定なしで自動的に読み込まれる。

```bash
# .env ファイルが自動で読み込まれる
bun run src/app.ts

# 特定の .env ファイルを指定
bun run --env-file .env.production src/app.ts
```

### 4-4. Node.js互換性の向上

Bun 1.xではNode.js APIとの互換性が大幅に向上した。

```javascript
// Node.js のコードがほぼそのまま動作する
import { createServer } from 'http';
import { readFileSync } from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';
import { createHash } from 'crypto';

// npm パッケージも node_modules からそのまま使用可能
import express from 'express';
import { PrismaClient } from '@prisma/client';
```

### 4-5. SQLite ネイティブサポート

Bunには`bun:sqlite`という高速なSQLiteドライバーが内蔵されている。

```javascript
import { Database } from 'bun:sqlite';

const db = new Database('myapp.db');

// テーブル作成
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// データ挿入
const insert = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
insert.run('田中太郎', 'tanaka@example.com');

// クエリ実行
const users = db.query('SELECT * FROM users').all();
console.log(users);
```

---

## 5. Deno 2 の進化

### 5-1. npm互換という大転換

Deno 1.xの大きな制約は「npmエコシステムへのアクセスが困難」という点だった。Deno 2ではこの問題が解決された。

```typescript
// Deno 2: npm パッケージを直接インポート
import express from 'npm:express';
import { z } from 'npm:zod';
import type { Request, Response } from 'npm:@types/express';

const app = express();

app.get('/api/hello', (req: Request, res: Response) => {
  res.json({ message: 'Hello from Deno 2!' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

さらに`deno.json`でimport mapsを設定することで、Node.jsに近い開発体験を実現できる。

```json
// deno.json
{
  "imports": {
    "express": "npm:express@^4.18.0",
    "zod": "npm:zod@^3.22.0",
    "@/": "./src/"
  },
  "tasks": {
    "dev": "deno run --watch --allow-net --allow-read src/main.ts",
    "test": "deno test --allow-all"
  }
}
```

### 5-2. Deno.serve — モダンなHTTPサーバーAPI

```typescript
// Deno 2: Deno.serve APIで高速HTTPサーバー
Deno.serve({ port: 3000 }, async (request: Request) => {
  const url = new URL(request.url);
  
  // ルーティング
  if (request.method === 'GET' && url.pathname === '/api/users') {
    const users = await fetchUsers();
    return Response.json(users);
  }
  
  if (request.method === 'POST' && url.pathname === '/api/users') {
    const body = await request.json();
    const newUser = await createUser(body);
    return Response.json(newUser, { status: 201 });
  }
  
  return new Response('Not Found', { status: 404 });
});
```

### 5-3. JSR — 新しいパッケージレジストリ

Deno 2とともに登場したJSR（JavaScript Registry）は、TypeScriptファーストの新しいパッケージレジストリだ。

```typescript
// JSR からパッケージをインポート
import { encodeBase64 } from 'jsr:@std/encoding/base64';
import { assertEquals } from 'jsr:@std/assert';

// Node.js でも JSR パッケージを使用可能
// package.json
{
  "dependencies": {
    "@std/encoding": "npm:@jsr/std__encoding"
  }
}
```

JSRの主な特徴:
- TypeScript ソースコードをそのまま配布（コンパイル不要）
- 型定義ファイル（.d.ts）を自動生成
- Node.js・Bun・Deno すべてに対応
- スコアシステムによる品質担保

### 5-4. パーミッションモデルの変化

Deno 2では`--allow-net`などのフラグが廃止され、より柔軟な権限管理が可能になった。

```bash
# Deno 2: -A フラグで全権限を許可（開発時）
deno run -A src/main.ts

# 細かい権限指定（本番環境推奨）
deno run \
  --allow-net=api.example.com:443 \
  --allow-read=/tmp,/etc/config \
  --allow-env=DATABASE_URL,API_KEY \
  src/main.ts

# deno.json で権限を固定
// deno.json
{
  "permissions": {
    "net": ["api.example.com"],
    "read": ["/tmp"],
    "env": ["DATABASE_URL"]
  }
}
```

### 5-5. ビルトインツール群

Denoはランタイムに多数のツールを内蔵している。

```bash
# フォーマッター
deno fmt

# リンター
deno lint

# テストランナー
deno test
deno test --coverage

# ドキュメント生成
deno doc src/lib.ts

# バンドラー
deno compile --output=myapp src/main.ts

# Jupyter Notebook サポート
deno jupyter --unstable
```

---

## 6. エコシステム比較

### 6-1. パッケージ互換性

| 機能 | Node.js 22 | Bun 1.x | Deno 2 |
|------|-----------|---------|--------|
| npmパッケージ | ◎ 100% | ◎ 95%+ | ○ 90%+ |
| CJS モジュール | ◎ 完全対応 | ◎ 完全対応 | ○ 対応済み |
| ESM モジュール | ◎ 完全対応 | ◎ 完全対応 | ◎ 完全対応 |
| TypeScript | △ 変換必要 | ◎ ネイティブ | ◎ ネイティブ |
| URLインポート | × 非対応 | × 非対応 | ◎ 対応 |
| JSR | △ 制限あり | △ 制限あり | ◎ ネイティブ |

### 6-2. TypeScript対応の詳細

**Node.js 22のTypeScript実行**

```bash
# tsx（推奨）
npm install -D tsx
npx tsx src/index.ts

# ts-node
npm install -D ts-node
npx ts-node src/index.ts

# Node.js 22.6+: --experimental-strip-types（実験的）
node --experimental-strip-types src/index.ts
# ※型チェックは行われないことに注意
```

**BunのTypeScript実行**

```bash
# 設定不要で直接実行
bun run src/index.ts

# 型チェックは別途 tsc を実行
bunx tsc --noEmit
```

**DenoのTypeScript実行**

```bash
# 型チェック付きで実行
deno run --check src/index.ts

# 型チェックなしで高速実行
deno run --no-check src/index.ts
```

### 6-3. フレームワーク対応状況

**Node.js** — 事実上すべてのフレームワークが対応

- Express 4.x / 5.x
- Fastify 4.x
- NestJS
- Hono（Node.jsアダプター）
- Next.js、Nuxt.js、SvelteKit

**Bun** — Node.js互換により多数のフレームワークが動作

```bash
# Express はそのまま動作
bun add express
bun run src/server.ts  # Node.js コードがそのまま動く

# ElysiaJS: Bun専用の超高速フレームワーク
bun add elysia
```

```typescript
// ElysiaJS: Bun に最適化されたフレームワーク
import { Elysia, t } from 'elysia';

const app = new Elysia()
  .get('/', () => 'Hello World')
  .post('/user', ({ body }) => body, {
    body: t.Object({
      name: t.String(),
      email: t.String(),
    }),
  })
  .listen(3000);

console.log(`Running at http://localhost:${app.server?.port}`);
```

**Deno** — npmエコシステムへのアクセスが可能に

```typescript
// Hono: Deno/Bun/Node.js すべてで動作するフレームワーク
import { Hono } from 'npm:hono';

const app = new Hono();

app.get('/', (c) => c.text('Hello from Deno 2!'));
app.get('/api/users', async (c) => {
  // データベースアクセスなど
  return c.json({ users: [] });
});

Deno.serve(app.fetch);
```

### 6-4. データベースドライバー対応

| ドライバー | Node.js | Bun | Deno |
|-----------|---------|-----|------|
| Prisma | ◎ | ○（実験的） | ○（npm:経由） |
| Drizzle ORM | ◎ | ◎ | ◎ |
| pg (PostgreSQL) | ◎ | ◎ | ◎（npm:経由） |
| mysql2 | ◎ | ◎ | ◎（npm:経由） |
| SQLite | ◎（better-sqlite3） | ◎（ネイティブ） | ◎（ネイティブ） |
| Redis (ioredis) | ◎ | ◎ | ◎（npm:経由） |

---

## 7. ユースケース別選択ガイド

### 7-1. エンタープライズAPIサーバー

**推奨: Node.js 22**

理由:
- 成熟したエコシステムと豊富な実績
- NestJS・Fastifyなどのエンタープライズ向けフレームワーク
- 広範なクラウドサービスのサポート（AWS Lambda、Google Cloud Run、Azure）
- 長期のLTSサポート（2027年まで）
- 大規模チームへのオンボーディングが容易

```bash
# 推奨スタック
npm create fastify@latest myapp
# または
npx @nestjs/cli new myapp
```

### 7-2. 高スループットAPIサーバー（スタートアップ・新規プロジェクト）

**推奨: Bun**

理由:
- Node.jsの2〜3倍のスループット
- ElysiaJSとの組み合わせでさらに高速化
- オールインワンツールチェーンで開発環境構築が簡単
- Node.js互換性により既存知識を活かせる

```bash
# Bun + ElysiaJS のセットアップ
bun create elysia myapp
cd myapp
bun run dev
```

### 7-3. CLIツール・スクリプト

**推奨: Bun**（起動時間重視）または **Deno**（セキュリティ重視）

**Bunを選ぶ場合**:

```typescript
// bin/mytool.ts
#!/usr/bin/env bun
import { parseArgs } from 'util';

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    output: { type: 'string', short: 'o' },
    verbose: { type: 'boolean', short: 'v' },
  },
  strict: true,
  allowPositionals: true,
});

if (values.verbose) {
  console.log('Verbose mode enabled');
}
// 処理...
```

```bash
# bun build でシングルバイナリに
bun build --compile --target=bun ./bin/mytool.ts --outfile mytool
./mytool --help  # 依存関係なしで実行可能
```

**Denoを選ぶ場合**:

```typescript
// main.ts
import { parseArgs } from 'jsr:@std/cli/parse-args';

const args = parseArgs(Deno.args, {
  string: ['output'],
  boolean: ['verbose'],
  alias: { o: 'output', v: 'verbose' },
});
// 処理...
```

```bash
# deno compile でシングルバイナリに
deno compile --allow-read --allow-write main.ts
```

### 7-4. サーバーレス・エッジ関数

**推奨: Deno**（Deno Deployとの親和性）または **Bun**（Cloudflare Workers）

```typescript
// Deno Deploy (グローバルCDNで実行)
// deploy.ts
import { Hono } from 'npm:hono';

const app = new Hono();

app.get('/api/time', (c) => {
  return c.json({
    timestamp: new Date().toISOString(),
    region: Deno.env.get('DENO_REGION') ?? 'unknown',
  });
});

Deno.serve(app.fetch);
```

```typescript
// Cloudflare Workers (Bun互換)
export default {
  async fetch(request: Request): Promise<Response> {
    return new Response('Hello from edge!', {
      headers: { 'Content-Type': 'text/plain' },
    });
  },
};
```

### 7-5. フロントエンドビルドツール

**推奨: Bun**

```bash
# Bun バンドラーで React アプリをビルド
bun build ./src/index.tsx \
  --outdir ./dist \
  --target browser \
  --minify \
  --sourcemap

# 結果: webpack より5〜10倍速いビルド
```

### 7-6. テスト実行

**Bunのテストランナー**:

```typescript
// テストファイル: src/utils.test.ts
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { calculateTax } from './utils';

describe('calculateTax', () => {
  it('消費税10%を正しく計算する', () => {
    expect(calculateTax(1000)).toBe(100);
  });
  
  it('整数を返す', () => {
    expect(Number.isInteger(calculateTax(333))).toBe(true);
  });
});
```

```bash
bun test              # 全テスト実行
bun test --watch      # ウォッチモード
bun test --coverage   # カバレッジレポート
# Jest より2〜3倍速い
```

---

## 8. 移行コストと選択のまとめ

### 8-1. Node.js から Bun への移行

**移行難易度: 低〜中**

```bash
# 1. Bunのインストール
curl -fsSL https://bun.sh/install | bash

# 2. 既存プロジェクトで試す
cd my-nodejs-project
bun install  # node_modules をそのまま活用

# 3. 実行
bun run start    # package.json の scripts を実行
bun run src/index.ts  # TypeScript を直接実行

# 4. 非互換部分のみ修正
# - Node.js固有のAPIで未実装のものは代替を探す
# - bun --bun フラグで Bun ネイティブ API に切り替え
```

**主な注意点**:
- `node_modules`はそのまま使える（npm install も動作）
- ほとんどのExpressアプリは変更なしで動作
- 一部のネイティブモジュール（`node-gyp`ビルド品）は非対応の場合あり
- Worker Threadsのサポートは限定的

### 8-2. Node.js から Deno 2 への移行

**移行難易度: 中**

```bash
# 1. Denoのインストール
curl -fsSL https://deno.land/install.sh | sh

# 2. deno.json を作成
cat > deno.json << 'EOF'
{
  "imports": {},
  "tasks": {
    "dev": "deno run -A --watch src/main.ts",
    "test": "deno test -A"
  },
  "nodeModulesDir": "auto"
}
EOF

# 3. インポートを変換
# 変換前: import express from 'express';
# 変換後: import express from 'npm:express';

# 4. 実行
deno run -A src/main.ts
```

**主な注意点**:
- `require()`は`import`に変換が必要
- `__dirname`/`__filename`は`import.meta.dirname`/`import.meta.filename`に変換
- 環境変数は`Deno.env.get('KEY')`で取得
- パーミッションフラグを設定する必要あり

### 8-3. 最終比較表

| 評価軸 | Node.js 22 | Bun 1.x | Deno 2 |
|--------|-----------|---------|--------|
| **性能** | ★★★ | ★★★★★ | ★★★ |
| **エコシステム** | ★★★★★ | ★★★★ | ★★★★ |
| **TypeScript** | ★★★ | ★★★★★ | ★★★★★ |
| **セキュリティ** | ★★★ | ★★★ | ★★★★★ |
| **学習コスト** | ★★★★★ | ★★★★ | ★★★★ |
| **本番実績** | ★★★★★ | ★★★ | ★★★ |
| **ツール統合** | ★★★ | ★★★★★ | ★★★★★ |
| **エッジ対応** | ★★★ | ★★★★ | ★★★★★ |

### 8-4. 結論：プロジェクトタイプ別の最終推奨

**Node.js 22 LTS を選ぶべき時**:
- 大規模エンタープライズシステムを構築する
- チームメンバーのNode.js経験が豊富
- 既存のエコシステム（NestJS、Prisma等）を最大限活用したい
- 安定性とサポート継続性が最優先
- クラウドサービスとの親和性が必要

**Bun を選ぶべき時**:
- とにかく速いAPIサーバーを作りたい
- CLIツールや高速スクリプトを開発する
- TypeScriptをネイティブに使いたい
- ビルドツール（webpack、Jest等）を置き換えたい
- 新規プロジェクトで開発速度を最大化したい

**Deno 2 を選ぶべき時**:
- セキュリティが最優先要件
- Deno Deploy / エッジ関数を多用する
- URLインポートやJSRエコシステムを活用したい
- スクリプトの権限を細かく制御したい
- TypeScript + 標準ライブラリのみで完結させたい

---

## おわりに

2026年のJavaScriptランタイム戦争に「絶対の正解」はない。Node.js 22は成熟と信頼を武器に王座を守り、Bunは圧倒的な速さで若いプロジェクトに革命をもたらし、Deno 2はセキュリティと標準化という哲学を保ちながら現実路線へ舵を切った。

重要なのは「新しいから移行する」ではなく「自分のユースケースに何が最適か」を判断することだ。既存のNode.jsプロジェクトを無理に移行する必要はないが、新規プロジェクトではBunやDeno 2を試してみる価値は十分にある。

特にBunのオールインワンアプローチは、Node.js + npm + webpack + Jest という複雑なツールチェーンを大幅に簡略化する。TypeScript開発者にとってはトランスパイル不要という体験は一度味わうと戻れなくなるかもしれない。

まずは小さなプロジェクトや社内ツールで試してみることを推奨する。各ランタイムは活発に開発が続いており、2026年中にもさらなる進化が期待される。

---

**参考リンク**

- [Node.js 22 公式リリースノート](https://nodejs.org/en/blog/release/v22.0.0)
- [Bun 1.x 公式ドキュメント](https://bun.sh/docs)
- [Deno 2 公式ドキュメント](https://docs.deno.com)
- [JSR - JavaScript Registry](https://jsr.io)
- [ElysiaJS - Bun Web Framework](https://elysiajs.com)
- [Hono - Multi-runtime Web Framework](https://hono.dev)

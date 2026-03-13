---
title: 'Deno 2の新機能と実践的な使い方ガイド【2026年版】'
description: 'Deno 2の新機能、Node.js互換性の向上、npm packageの使い方、パフォーマンス改善を徹底解説。DenoでWebアプリ開発を始めるための完全ガイド。'
pubDate: '2026-02-05'
tags: ['Deno', 'JavaScript', 'TypeScript']
heroImage: '../../assets/thumbnails/deno-2-guide-2026.jpg'
---

Deno 2は、Node.jsの創設者Ryan Dahlが開発した次世代JavaScriptランタイムの最新メジャーバージョンです。npm互換性の大幅向上、パフォーマンス改善、そして開発者体験の向上が図られています。

## Deno 2の主要な新機能

### 1. npm互換性の完全サポート

Deno 2では、ほぼすべてのnpmパッケージが動作するようになりました。

```typescript
// package.jsonサポート
// package.json
{
  "dependencies": {
    "express": "^4.18.2",
    "zod": "^3.22.4"
  }
}

// main.ts
import express from "express";
import { z } from "zod";

const app = express();
const schema = z.string();

app.get("/", (req, res) => {
  res.send("Hello from Deno 2!");
});

app.listen(3000);
```

### 2. node_modules互換性

```bash
# package.jsonから依存関係をインストール
deno install

# node_modulesが生成される（Node.jsと同じ）
ls node_modules/
```

### 3. workspaceサポート

```json
// deno.json
{
  "workspace": [
    "./apps/web",
    "./packages/shared"
  ]
}
```

### 4. パフォーマンス改善

- HTTPサーバーが最大30%高速化
- TypeScriptの型チェックが50%高速化
- ファイルウォッチャーの改善

## インストールと環境セットアップ

### Denoのインストール

```bash
# macOS/Linux
curl -fsSL https://deno.land/install.sh | sh

# Windows (PowerShell)
irm https://deno.land/install.ps1 | iex

# Homebrew
brew install deno

# バージョン確認
deno --version
```

### エディタ設定（VS Code）

```json
// .vscode/settings.json
{
  "deno.enable": true,
  "deno.lint": true,
  "deno.unstable": false,
  "editor.defaultFormatter": "denoland.vscode-deno"
}
```

拡張機能「Deno」をインストール（公式）。

## プロジェクトの初期化

### 基本的なプロジェクト構造

```bash
# 新規プロジェクト作成
deno init my-project
cd my-project

# 生成されるファイル
# ├── deno.json       # 設定ファイル
# ├── main.ts         # エントリポイント
# └── main_test.ts    # テストファイル
```

### deno.jsonの設定

```json
{
  "compilerOptions": {
    "lib": ["deno.window", "dom"],
    "strict": true
  },
  "imports": {
    "@std/": "https://deno.land/std@0.220.0/",
    "@oak": "https://deno.land/x/oak@v12.6.1/mod.ts"
  },
  "tasks": {
    "dev": "deno run --watch main.ts",
    "start": "deno run --allow-net --allow-read main.ts",
    "test": "deno test --allow-all"
  },
  "fmt": {
    "useTabs": false,
    "lineWidth": 100,
    "indentWidth": 2,
    "semiColons": true,
    "singleQuote": false
  },
  "lint": {
    "rules": {
      "tags": ["recommended"]
    }
  }
}
```

## Web APIサーバーの構築

### 標準ライブラリでHTTPサーバー

```typescript
// server.ts
const handler = (req: Request): Response => {
  const url = new URL(req.url);

  if (url.pathname === "/api/hello") {
    return new Response(JSON.stringify({ message: "Hello Deno 2!" }), {
      headers: { "content-type": "application/json" }
    });
  }

  return new Response("Not Found", { status: 404 });
};

Deno.serve({ port: 8000 }, handler);
console.log("Server running on http://localhost:8000");
```

実行:

```bash
deno run --allow-net server.ts
```

### Oakフレームワーク（Express風）

```typescript
// oak-server.ts
import { Application, Router } from "@oak";

const router = new Router();

router
  .get("/", (ctx) => {
    ctx.response.body = { message: "Welcome to Deno 2 API" };
  })
  .get("/users/:id", (ctx) => {
    const { id } = ctx.params;
    ctx.response.body = { userId: id };
  })
  .post("/users", async (ctx) => {
    const body = await ctx.request.body.json();
    ctx.response.status = 201;
    ctx.response.body = { created: true, data: body };
  });

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

console.log("Oak server running on http://localhost:8000");
await app.listen({ port: 8000 });
```

### ミドルウェアの実装

```typescript
import { Application } from "@oak";

const app = new Application();

// ロガーミドルウェア
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${ctx.request.method} ${ctx.request.url} - ${ms}ms`);
});

// エラーハンドリング
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.response.status = 500;
    ctx.response.body = { error: err.message };
  }
});

// CORS
app.use(async (ctx, next) => {
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  await next();
});

await app.listen({ port: 8000 });
```

## データベース連携

### PostgreSQL（deno-postgres）

```typescript
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const client = new Client({
  user: "user",
  database: "test",
  hostname: "localhost",
  port: 5432,
  password: "password",
});

await client.connect();

// クエリ実行
const result = await client.queryObject`
  SELECT * FROM users WHERE id = ${1}
`;

console.log(result.rows);

await client.end();
```

### SQLite（deno-sqlite）

```typescript
import { DB } from "https://deno.land/x/sqlite@v3.8/mod.ts";

const db = new DB("test.db");

// テーブル作成
db.execute(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT
  )
`);

// INSERT
db.query("INSERT INTO users (name, email) VALUES (?, ?)", ["Alice", "alice@example.com"]);

// SELECT
const users = db.query<[number, string, string]>("SELECT * FROM users");
for (const [id, name, email] of users) {
  console.log({ id, name, email });
}

db.close();
```

## テストとデバッグ

### ユニットテスト

```typescript
// math.ts
export function add(a: number, b: number): number {
  return a + b;
}

// math_test.ts
import { assertEquals } from "@std/assert";
import { add } from "./math.ts";

Deno.test("add function", () => {
  assertEquals(add(2, 3), 5);
  assertEquals(add(-1, 1), 0);
});

Deno.test("add with async", async () => {
  const result = await Promise.resolve(add(5, 5));
  assertEquals(result, 10);
});
```

実行:

```bash
deno test
```

### ベンチマーク

```typescript
// benchmark.ts
Deno.bench("string concatenation", () => {
  let str = "";
  for (let i = 0; i < 1000; i++) {
    str += "a";
  }
});

Deno.bench("array join", () => {
  const arr = [];
  for (let i = 0; i < 1000; i++) {
    arr.push("a");
  }
  arr.join("");
});
```

```bash
deno bench
```

### デバッグ

```bash
# Chrome DevToolsでデバッグ
deno run --inspect-brk main.ts

# VS Codeのlaunch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Deno",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/main.ts",
      "runtimeExecutable": "deno",
      "runtimeArgs": ["run", "--inspect-brk", "--allow-all"],
      "attachSimplePort": 9229
    }
  ]
}
```

## デプロイとプロダクション

### Deno Deploy（推奨）

```bash
# Deno Deployにデプロイ
deno deploy --project=my-project main.ts
```

### Dockerコンテナ化

```dockerfile
# Dockerfile
FROM denoland/deno:2.0.0

WORKDIR /app
COPY . .

RUN deno cache main.ts

EXPOSE 8000
CMD ["run", "--allow-net", "--allow-read", "main.ts"]
```

```bash
docker build -t my-deno-app .
docker run -p 8000:8000 my-deno-app
```

### 実行可能バイナリのコンパイル

```bash
# 単一実行ファイルにコンパイル
deno compile --allow-net --output server server.ts

# クロスコンパイル
deno compile --target x86_64-unknown-linux-gnu --output server-linux server.ts
```

## Node.jsからの移行

### CommonJSモジュール

```typescript
// Node.js (CommonJS)
const express = require("express");
module.exports = { app };

// Deno (ESM)
import express from "npm:express@4";
export { app };
```

### 環境変数

```typescript
// Node.js
const PORT = process.env.PORT || 3000;

// Deno
const PORT = Deno.env.get("PORT") || "3000";
```

### ファイルシステム

```typescript
// Node.js
const fs = require("fs");
const data = fs.readFileSync("file.txt", "utf-8");

// Deno
const data = await Deno.readTextFile("file.txt");
```

### パッケージ管理

```typescript
// Node.js
import { z } from "zod";

// Deno（複数の方法）
import { z } from "npm:zod@3";  // npm:プレフィックス
import { z } from "zod";        // deno.jsonのimportsマップ使用
```

## まとめ

Deno 2は以下の点で優れています:

1. **セキュアなデフォルト** - 明示的な許可が必要
2. **TypeScript標準サポート** - 設定不要
3. **モダンなツールチェイン** - formatter、linter、testerが組み込み
4. **npm互換性** - 既存のエコシステムを活用
5. **Web標準準拠** - fetch、WebSocketなどブラウザAPIと同じ

新規プロジェクトではDeno 2を、既存Node.jsプロジェクトでは段階的な移行を検討する価値があります。特にTypeScriptを使う場合、Denoの開発者体験は非常に快適です。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)

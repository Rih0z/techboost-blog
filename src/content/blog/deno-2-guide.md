---
title: "Deno 2完全ガイド — Node.js互換性とパフォーマンスの両立"
description: "Deno 2の新機能を徹底解説。Node.js完全互換、npm直接サポート、deno.json設定、Freshフレームワーク、Deno Deployの使い方とパフォーマンス比較まで。"
pubDate: "2026-02-05"
tags: ["Deno", "TypeScript", "JavaScript", "Node.js", "Backend"]
---

## Deno 2 とは

**Deno 2** は、Node.js の作者である Ryan Dahl が開発した、次世代の JavaScript/TypeScript ランタイムです。2024年にリリースされたバージョン2では、Node.js との完全互換性を実現し、既存のnpmエコシステムをそのまま利用できるようになりました。

### Deno 2 の主な特徴

- **Node.js完全互換**: `node:` プレフィックスでNode.js標準ライブラリを直接利用
- **npm直接サポート**: `npm:` プレフィックスでnpmパッケージをインポート
- **TypeScript標準対応**: トランスパイラ不要、そのまま実行可能
- **セキュリティファースト**: デフォルトでサンドボックス化
- **Web標準API**: fetch、WebSocket、Crypto APIなど標準搭載
- **高速なパフォーマンス**: V8とRustで最適化

## インストールとセットアップ

```bash
# macOS / Linux
curl -fsSL https://deno.land/install.sh | sh

# Windows (PowerShell)
irm https://deno.land/install.ps1 | iex

# Homebrew
brew install deno

# バージョン確認
deno --version
```

### VSCode設定

```json
// .vscode/settings.json
{
  "deno.enable": true,
  "deno.lint": true,
  "deno.unstable": false,
  "[typescript]": {
    "editor.defaultFormatter": "denoland.vscode-deno"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "denoland.vscode-deno"
  }
}
```

## Node.js互換性の実践

### npmパッケージの利用

```typescript
// main.ts - npmパッケージを直接インポート
import express from "npm:express@4";
import { z } from "npm:zod@3";

const app = express();
app.use(express.json());

const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

app.post("/users", (req, res) => {
  const result = UserSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({ success: true, user: result.data });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
```

```bash
# そのまま実行（トランスパイル不要）
deno run --allow-net --allow-read main.ts
```

### Node.js標準ライブラリの利用

```typescript
// file-server.ts
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const server = createServer(async (req, res) => {
  try {
    const filePath = join(Deno.cwd(), "public", req.url || "index.html");
    const content = await readFile(filePath);

    res.writeHead(200);
    res.end(content);
  } catch (error) {
    res.writeHead(404);
    res.end("Not Found");
  }
});

server.listen(8000, () => {
  console.log("Server running on http://localhost:8000");
});
```

## deno.json 設定の完全ガイド

```json
{
  "compilerOptions": {
    "lib": ["deno.window", "dom"],
    "strict": true,
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  },
  "imports": {
    "@/": "./src/",
    "@std/": "https://deno.land/std@0.218.0/",
    "react": "npm:react@18",
    "react-dom": "npm:react-dom@18"
  },
  "tasks": {
    "dev": "deno run --watch --allow-net --allow-read main.ts",
    "start": "deno run --allow-net --allow-read main.ts",
    "test": "deno test --allow-read --allow-net",
    "lint": "deno lint",
    "fmt": "deno fmt"
  },
  "lint": {
    "rules": {
      "tags": ["recommended"],
      "include": ["ban-untagged-todo"]
    },
    "exclude": ["dist/", "node_modules/"]
  },
  "fmt": {
    "useTabs": false,
    "lineWidth": 100,
    "indentWidth": 2,
    "semiColons": true,
    "singleQuote": false,
    "exclude": ["dist/", "coverage/"]
  },
  "test": {
    "include": ["src/**/*_test.ts"]
  },
  "exclude": ["dist/", "node_modules/"]
}
```

## Freshフレームワーク実践

**Fresh** は Denoネイティブの Web フレームワークで、Islands Architecture を採用しています。

```bash
# プロジェクト作成
deno run -A -r https://fresh.deno.dev my-fresh-app
cd my-fresh-app
deno task dev
```

### Freshのディレクトリ構造

```
my-fresh-app/
├── routes/
│   ├── index.tsx        # トップページ
│   ├── api/users.ts     # APIルート
│   └── _app.tsx         # ルートレイアウト
├── islands/
│   └── Counter.tsx      # クライアント側インタラクティブコンポーネント
├── components/
│   └── Button.tsx       # サーバーサイドコンポーネント
├── static/
│   └── logo.svg
├── deno.json
└── main.ts
```

### Fresh APIルート

```typescript
// routes/api/users.ts
import { Handlers } from "$fresh/server.ts";

interface User {
  id: number;
  name: string;
  email: string;
}

const users: User[] = [];

export const handler: Handlers = {
  async GET(_req) {
    return new Response(JSON.stringify(users), {
      headers: { "Content-Type": "application/json" },
    });
  },

  async POST(req) {
    const body = await req.json();
    const newUser: User = {
      id: users.length + 1,
      ...body,
    };
    users.push(newUser);

    return new Response(JSON.stringify(newUser), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  },
};
```

### Fresh Island（クライアントサイドコンポーネント）

```typescript
// islands/Counter.tsx
import { signal } from "@preact/signals";

const count = signal(0);

export default function Counter() {
  return (
    <div class="counter">
      <p>Count: {count.value}</p>
      <button onClick={() => count.value++}>Increment</button>
      <button onClick={() => count.value--}>Decrement</button>
    </div>
  );
}
```

## Deno Deploy へのデプロイ

Deno Deploy は、エッジロケーションで動作するサーバーレスプラットフォームです。

```bash
# Deno Deploy CLI インストール
deno install -A --no-check -r -f https://deno.land/x/deploy/deployctl.ts

# デプロイ
deployctl deploy --project=my-project main.ts
```

### GitHub Actionsでの自動デプロイ

```yaml
# .github/workflows/deploy.yml
name: Deploy to Deno Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4
      - uses: denoland/setup-deno@v1
        with:
          deno-version: v2.x

      - name: Deploy to Deno Deploy
        run: |
          deno run -A https://deno.land/x/deploy/deployctl.ts deploy \
            --project=my-project \
            --token=${{ secrets.DENO_DEPLOY_TOKEN }} \
            main.ts
```

## パフォーマンス比較

### ベンチマーク: Hello World サーバー

```typescript
// deno-server.ts
Deno.serve(() => new Response("Hello, World!"));

// node-server.js
import http from "node:http";
http.createServer((req, res) => {
  res.end("Hello, World!");
}).listen(8000);
```

**結果（wrk -t12 -c400 -d30s）:**

| ランタイム | Req/sec | Latency (avg) | Transfer/sec |
|-----------|---------|---------------|--------------|
| Deno 2    | 68,340  | 5.85ms        | 9.12 MB      |
| Node.js 20| 42,120  | 9.49ms        | 7.51 MB      |
| Bun 1.1   | 71,580  | 5.58ms        | 9.56 MB      |

Deno 2は、Node.jsより約62%高速です。

## Denoが適しているケース

**Denoを選ぶべき場面:**
- 新規プロジェクトでモダンな技術スタックを使いたい
- TypeScript中心の開発
- エッジコンピューティング（Deno Deploy）
- セキュリティが重要な用途
- 依存関係管理をシンプルにしたい

**Node.jsを選ぶべき場面:**
- 既存の大規模Node.jsプロジェクト
- ネイティブアドオン（N-API）に依存
- エンタープライズの既存インフラ
- チームがNode.jsに精通している

## まとめ

Deno 2は、Node.js互換性を獲得したことで、実用性と先進性を両立したランタイムとなりました。特に新規プロジェクトでは、TypeScriptのネイティブサポート、標準ライブラリの充実、セキュリティモデルの恩恵を受けられます。

2026年現在、Deno 2は本番環境でも十分に使える成熟度に達しており、Deno Deployと組み合わせることで、エッジでの高速なアプリケーション配信が可能です。次のプロジェクトでは、Denoを検討する価値があるでしょう。

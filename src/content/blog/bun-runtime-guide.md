---
title: 'Bun完全ガイド — 超高速JavaScriptランタイム・バンドラー・テストランナー'
description: 'BunによるJavaScript/TypeScript開発を完全解説。Node.js/Deno比較・ビルトインバンドラー・テストランナー・SQLiteサポート・HTTPサーバー・パッケージマネージャー・マイグレーション実践まで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-3.jpg'
tags: ['Bun', 'JavaScript', 'TypeScript', 'ランタイム', 'パフォーマンス']
---

JavaScriptエコシステムは長い間、Node.jsが独占的な地位を占めてきた。しかし2023年、Jarred Sumnerが開発した **Bun** が正式にv1.0をリリースし、そのパフォーマンスの凄まじさがコミュニティを驚かせた。Bunは単なる「別のランタイム」ではない。**ランタイム・パッケージマネージャー・バンドラー・テストランナー** をひとつのバイナリに統合した、まったく新しいJavaScriptツールチェーンだ。

本記事では、Bunの内部アーキテクチャから実践的な移行手順まで、2000語を超える詳細解説でお届けする。Node.js/Denoとの比較・TypeScript実行・HTTPサーバー・SQLiteサポート・本番デプロイまで、実際のコード例とともに網羅する。

---

## 1. Bunとは — Node.js/Denoとのパフォーマンス比較

### Bunが生まれた背景

Node.jsは2009年にRyan Dahlが発表して以来、サーバーサイドJavaScriptの標準として君臨してきた。V8エンジンをベースに、非同期I/Oモデルとnpmエコシステムという強力な武器を持つ。しかし年月を経るにつれ、以下の課題が顕在化してきた。

- **起動時間の遅さ**: V8のJITコンパイルによるウォームアップコスト
- **TypeScriptの非ネイティブ対応**: `ts-node` や `tsx` などの追加ツールが必要
- **パッケージインストールの遅さ**: `npm install` の待ち時間は開発体験を損なう
- **標準ライブラリの貧弱さ**: HTTP・ファイルI/Oなど基本機能にサードパーティ依存が多い
- **分散したツールチェーン**: webpack/esbuild/jest/npmなど複数ツールの管理コスト

Denoは2018年にRyan Dahl自身が「Node.jsへの10の後悔」と題した発表を経て開発した後継ランタイムだ。セキュリティ・TypeScriptネイティブ・標準ライブラリの充実など多くの改善を施したが、Node.jsとの後方互換性のなさがエコシステム移行の壁となった。

**Bunはこれらすべての課題を解決することを目指した。** Apple製の高速JITコンパイラ **JavaScriptCore（JSC）** をエンジンとして採用し、Zig言語で実装されたネイティブバインディングにより、驚異的なパフォーマンスを実現している。

### パフォーマンスベンチマーク

公式ベンチマークおよびコミュニティ計測によると、Bunは主要な指標でNode.jsを大幅に上回る。

| 指標 | Node.js (v20) | Deno (v1.40) | Bun (v1.1) |
|------|--------------|-------------|-----------|
| HTTPリクエスト/秒 | ~82,000 | ~76,000 | ~200,000+ |
| `npm install` 相当 | 基準値 | — | 約25倍高速 |
| 起動時間 | ~50ms | ~35ms | ~5ms |
| SQLiteクエリ/秒 | (~better-sqlite3) | — | ネイティブで最速 |
| TypeScript実行 | ts-node: ~500ms | 標準対応 | ~5ms (トランスパイル不要) |

特にHTTPサーバーのスループットは劇的な差があり、同じ処理をするAPIサーバーでBunはNode.jsの2〜3倍のリクエストを捌ける場合がある。

### なぜ高速なのか — アーキテクチャの秘密

Bunが高速な理由は複数の設計判断の積み重ねだ。

**1. JavaScriptCore (JSC) エンジン**
V8（Node.js・Deno）に対し、BunはAppleのWebKitに含まれるJSCを使用する。JSCはSafariでの使用を想定した最適化が施されており、特に起動時間とメモリ効率でV8を上回るシナリオがある。

**2. Zig言語による実装**
BunのコアはZig言語で書かれている。Zigはメモリ安全性と高パフォーマンスを両立するシステムプログラミング言語で、不要なメモリアロケーションを極限まで削減している。

**3. ネイティブAPIの最大活用**
LinuxではioBuf、macOSではkqueueなど、OSレベルのAPIを直接利用することでオーバーヘッドを最小化している。

**4. 統合ツールチェーン**
バンドラー・テストランナー・パッケージマネージャーを同一プロセス内で動作させることで、プロセス間通信のオーバーヘッドがゼロになる。

---

## 2. インストール・基本コマンド

### インストール

macOS/Linux向けの公式インストール方法は以下の通りだ。

```bash
# macOS / Linux（curlスクリプト）
curl -fsSL https://bun.sh/install | bash

# Homebrew（macOS）
brew install oven-sh/bun/bun

# npm経由（既存Node.js環境から）
npm install -g bun

# Windowsの場合（PowerShell）
powershell -c "irm bun.sh/install.ps1 | iex"

# バージョン確認
bun --version
# 1.1.x
```

インストール後、`~/.bun/bin` にバイナリが配置される。シェルのPATHに追加するよう案内が表示されるので、`.bashrc` または `.zshrc` に追記しよう。

### 基本コマンド一覧

```bash
# JavaScriptファイルを実行
bun run index.js
bun index.js          # runは省略可能

# TypeScriptファイルを直接実行（コンパイル不要）
bun run server.ts
bun server.ts

# REPLを起動
bun repl

# スクリプトを実行（package.json の scripts）
bun run dev
bun run build
bun run test

# パッケージのインストール（後述）
bun install
bun add lodash
bun remove lodash

# バンドルを生成
bun build ./src/index.ts --outdir ./dist

# テストを実行
bun test

# TypeScriptの型チェック（tscを使用）
bun tsc --noEmit
```

### 新規プロジェクトの作成

```bash
# Bunで新規プロジェクトを初期化
mkdir my-bun-app && cd my-bun-app
bun init

# インタラクティブなプロンプトに答えるとpackage.jsonとindex.tsが生成される
# bun init helps you get started with a minimal project and tries to guess sensible defaults.
# Press ^C anytime to quit

# package name (my-bun-app):
# entry point (index.ts):

# Done! A package.json file was saved in the current directory.
#  + index.ts
#  + .gitignore
#  + tsconfig.json (for editor auto-complete)
#  + README.md

# テンプレートから作成
bun create react my-react-app
bun create next my-next-app
bun create hono my-hono-app
```

---

## 3. パッケージマネージャー — bun install / add / remove / update

Bunのパッケージマネージャーはnpm互換でありながら、キャッシュ戦略とハードリンクを活用することで **npm比で最大25倍高速** なインストールを実現している。

### bun install

```bash
# package.jsonの依存関係を全インストール
bun install

# --frozen-lockfileでロックファイルを更新しない（CI向け）
bun install --frozen-lockfile

# --productionで devDependencies を除外
bun install --production

# グローバルインストール
bun install -g typescript
bun install -g @biomejs/biome
```

### bun add — パッケージの追加

```bash
# 通常の依存関係として追加
bun add express
bun add hono
bun add zod

# 開発依存関係として追加
bun add -d @types/express
bun add -d typescript
bun add -d vitest

# 特定バージョンを指定
bun add react@18.2.0
bun add "react@^18.0.0"

# ピア依存関係として追加
bun add -p react

# GitHubリポジトリから直接追加
bun add github:user/repo

# ローカルパッケージのリンク
bun add ../my-local-package
```

### bun remove / bun update

```bash
# パッケージの削除
bun remove express
bun remove -d typescript

# パッケージの更新
bun update                   # 全パッケージを更新
bun update react             # 特定パッケージのみ更新
bun update react react-dom   # 複数指定

# 古いパッケージを確認
bun outdated
```

### bun.lockb — バイナリロックファイル

Bunは `package-lock.json` や `yarn.lock` の代わりにバイナリ形式の `bun.lockb` を使用する。バイナリ形式のため読み取りは困難だが、パースが高速でロックファイルの整合性チェックも高速だ。

```bash
# bun.lockbの内容を人間が読める形式で表示
bun install --lockfile-only  # lockbのみ生成
cat bun.lockb | bun bun      # テキスト表示（開発時確認用）

# npmのpackage-lock.jsonからbun.lockbに移行
bun install  # 既存のpackage-lock.jsonを読み込んでbun.lockbを生成
```

---

## 4. TypeScriptネイティブ実行

Bunの最大の特徴のひとつが **TypeScriptのネイティブ実行** だ。`ts-node` や `tsx` などのツールを一切インストールせずに、`.ts` ファイルを直接実行できる。

```typescript
// server.ts
interface User {
  id: number;
  name: string;
  email: string;
}

const users: User[] = [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" },
];

function findUser(id: number): User | undefined {
  return users.find((u) => u.id === id);
}

const user = findUser(1);
console.log(user?.name); // Alice
```

```bash
# TypeScriptファイルを直接実行（トランスパイル不要）
bun server.ts
# Alice
```

### tsconfig.json との連携

BunはTypeScriptのトランスパイルを行うが、型チェックは行わない点に注意が必要だ。型チェックには引き続き `tsc` を使用する。

```json
// tsconfig.json
{
  "compilerOptions": {
    "lib": ["ESNext"],
    "module": "ESNext",
    "target": "ESNext",
    "moduleResolution": "bundler",
    "moduleDetection": "force",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "composite": false,
    "strict": true,
    "downlevelIteration": true,
    "skipLibCheck": true,
    "jsx": "react-jsx",
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "allowJs": true,
    "types": ["bun-types"]
  }
}
```

`bun-types` パッケージを追加することで、`Bun` グローバルオブジェクトの型定義が利用できるようになる。

```bash
bun add -d @types/bun
# または
bun add -d bun-types
```

### JSX / TSXのサポート

BunはJSX/TSXも標準でサポートしており、ReactコンポーネントをそのままサーバーサイドでSSRする際にも追加設定が不要だ。

```tsx
// component.tsx
function Greeting({ name }: { name: string }) {
  return <h1>Hello, {name}!</h1>;
}

// Bunのサーバーサイドレンダリング例
import { renderToString } from "react-dom/server";

const html = renderToString(<Greeting name="World" />);
console.log(html); // <h1>Hello, World!</h1>
```

---

## 5. Bunバンドラー — bun build・esbuildとの比較

Bunには高速なバンドラーが組み込まれており、`bun build` コマンドで利用できる。内部的にはesbuildと同等のアプローチを取りながら、Bunのネイティブ実装によりさらに高速化されている。

### 基本的な使い方

```bash
# シンプルなバンドル
bun build ./src/index.ts --outdir ./dist

# minify（圧縮）を有効化
bun build ./src/index.ts --outdir ./dist --minify

# ソースマップを生成
bun build ./src/index.ts --outdir ./dist --sourcemap=external

# ターゲット環境を指定
bun build ./src/index.ts --outdir ./dist --target=browser
bun build ./src/index.ts --outdir ./dist --target=node
bun build ./src/index.ts --outdir ./dist --target=bun

# 複数エントリーポイント
bun build ./src/index.ts ./src/worker.ts --outdir ./dist

# ライブラリモード（外部依存をバンドルしない）
bun build ./src/index.ts --outdir ./dist --external react --external react-dom
```

### bunbuild.config.ts による設定

複雑なビルド設定はTypeScriptの設定ファイルで管理できる。

```typescript
// build.ts
import { build } from "bun";

await build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "browser",
  format: "esm",
  minify: {
    whitespace: true,
    identifiers: true,
    syntax: true,
  },
  sourcemap: "external",
  splitting: true,        // コード分割（Dynamic Import対応）
  plugins: [
    // カスタムプラグインを追加可能
  ],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    __VERSION__: JSON.stringify("1.0.0"),
  },
  external: ["react", "react-dom"],
  loader: {
    ".png": "file",
    ".svg": "text",
    ".css": "css",
  },
});

console.log("Build complete!");
```

```bash
bun build.ts  # 設定ファイルを実行してビルド
```

### esbuildとの比較

| 特徴 | esbuild | Bun Bundler |
|------|---------|-------------|
| 言語 | Go | Zig |
| 設定形式 | JS/JSON | TypeScript |
| プラグインAPI | 対応 | 対応 |
| コード分割 | 対応 | 対応 |
| CSSモジュール | 対応 | 対応 |
| バンドルなし実行 | 不可 | Bun自体で実行可能 |
| 統合ツールチェーン | 非対応 | 完全統合 |

Bunバンドラーの最大の強みは「バンドラーだけを独立して使うのではなく、ランタイム・テストランナーと完全に統合されている」点にある。設定ファイル自体をBunで実行できるため、設定のTypeScript型補完も完璧に機能する。

---

## 6. テストランナー — bun test・describe・it・expect・スナップショット

Bunのテストランナーは **Jestと互換性のあるAPI** を提供しながら、実行速度はJestよりはるかに高速だ。追加パッケージのインストールなしで、すぐにテストを書き始められる。

### 基本的なテスト

```typescript
// math.ts
export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}

export function divide(a: number, b: number): number {
  if (b === 0) throw new Error("Division by zero");
  return a / b;
}
```

```typescript
// math.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { add, multiply, divide } from "./math";

describe("数値計算関数のテスト", () => {
  describe("add()", () => {
    it("正の数を加算できる", () => {
      expect(add(1, 2)).toBe(3);
      expect(add(10, 20)).toBe(30);
    });

    it("負の数を加算できる", () => {
      expect(add(-1, -2)).toBe(-3);
      expect(add(-10, 5)).toBe(-5);
    });

    it("ゼロとの加算ができる", () => {
      expect(add(0, 5)).toBe(5);
      expect(add(5, 0)).toBe(5);
    });
  });

  describe("multiply()", () => {
    it("正の数を乗算できる", () => {
      expect(multiply(3, 4)).toBe(12);
    });

    it("ゼロとの乗算はゼロになる", () => {
      expect(multiply(5, 0)).toBe(0);
    });
  });

  describe("divide()", () => {
    it("正常な除算ができる", () => {
      expect(divide(10, 2)).toBe(5);
      expect(divide(9, 3)).toBe(3);
    });

    it("ゼロ除算で例外をスローする", () => {
      expect(() => divide(10, 0)).toThrow("Division by zero");
    });
  });
});
```

```bash
bun test
# bun test v1.1.x (abc123)
#
# math.test.ts:
# ✓ 数値計算関数のテスト > add() > 正の数を加算できる [0.13ms]
# ✓ 数値計算関数のテスト > add() > 負の数を加算できる [0.01ms]
# ✓ 数値計算関数のテスト > add() > ゼロとの加算ができる [0.01ms]
# ✓ 数値計算関数のテスト > multiply() > 正の数を乗算できる [0.01ms]
# ✓ 数値計算関数のテスト > multiply() > ゼロとの乗算はゼロになる [0.01ms]
# ✓ 数値計算関数のテスト > divide() > 正常な除算ができる [0.01ms]
# ✓ 数値計算関数のテスト > divide() > ゼロ除算で例外をスローする [0.01ms]
#
# 7 pass, 0 fail
```

### 非同期テスト・モック・スパイ

```typescript
// api.test.ts
import { describe, it, expect, mock, spyOn, beforeAll, afterAll } from "bun:test";

// 非同期関数のテスト
describe("非同期処理のテスト", () => {
  it("Promiseが正常に解決される", async () => {
    const fetchData = async (): Promise<{ id: number; name: string }> => {
      return { id: 1, name: "Test User" };
    };

    const result = await fetchData();
    expect(result.id).toBe(1);
    expect(result.name).toBe("Test User");
  });

  it("fetchのモック", async () => {
    // グローバルのfetchをモック
    const mockFetch = mock(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: "Hello from mock" }),
      } as Response)
    );

    global.fetch = mockFetch;

    const response = await fetch("https://api.example.com/hello");
    const data = await response.json();

    expect(data.message).toBe("Hello from mock");
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/hello");
  });
});

// スパイ（実装は保持しつつ呼び出しを監視）
describe("スパイのテスト", () => {
  const logger = {
    log: (msg: string) => console.log(msg),
  };

  it("ログ関数が呼ばれることを確認", () => {
    const spy = spyOn(logger, "log");

    logger.log("テストメッセージ");

    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith("テストメッセージ");
  });
});
```

### スナップショットテスト

```typescript
// snapshot.test.ts
import { describe, it, expect } from "bun:test";

interface Product {
  id: number;
  name: string;
  price: number;
  tags: string[];
}

function formatProduct(product: Product): string {
  return `[${product.id}] ${product.name} - ¥${product.price.toLocaleString()}`;
}

describe("スナップショットテスト", () => {
  it("商品フォーマットのスナップショット", () => {
    const product: Product = {
      id: 1,
      name: "TypeScript完全ガイド",
      price: 3800,
      tags: ["book", "programming", "typescript"],
    };

    expect(formatProduct(product)).toMatchSnapshot();
    expect(product).toMatchSnapshot();
  });
});
```

```bash
# 初回実行でスナップショットを生成
bun test
# スナップショットは __snapshots__/snapshot.test.ts.snap に保存される

# スナップショットを更新
bun test --update-snapshots
```

### テストのフィルタリングと設定

```bash
# 特定ファイルのみテスト
bun test src/utils.test.ts

# パターンでフィルタリング
bun test --testNamePattern "add()"

# ウォッチモード（ファイル変更を監視して自動再実行）
bun test --watch

# タイムアウト設定
bun test --timeout 10000

# 並列実行数を制限
bun test --maxConcurrency 4

# カバレッジ（実験的機能）
bun test --coverage
```

---

## 7. HTTPサーバー — Bun.serve・WebSocket

Bunには高性能なHTTPサーバーがビルトインで含まれている。`express` や `fastify` を使わずに、高スループットなAPIサーバーを構築できる。

### 基本的なHTTPサーバー

```typescript
// server.ts
const server = Bun.serve({
  port: 3000,
  hostname: "0.0.0.0",

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // ルーティング
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(
        JSON.stringify({ message: "Hello from Bun!", version: Bun.version }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (url.pathname === "/users" && request.method === "GET") {
      const users = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ];
      return Response.json(users);
    }

    if (url.pathname.startsWith("/users/") && request.method === "GET") {
      const id = parseInt(url.pathname.split("/")[2]);
      if (isNaN(id)) {
        return Response.json({ error: "Invalid user ID" }, { status: 400 });
      }
      return Response.json({ id, name: `User ${id}` });
    }

    if (url.pathname === "/users" && request.method === "POST") {
      const body = await request.json();
      // 実際はDBに保存する処理
      return Response.json({ id: 3, ...body }, { status: 201 });
    }

    return new Response("Not Found", { status: 404 });
  },

  error(error: Error): Response {
    console.error("Server error:", error);
    return new Response("Internal Server Error", { status: 500 });
  },
});

console.log(`Bun server running at http://localhost:${server.port}`);
```

### ミドルウェアパターン

```typescript
// middleware.ts
type Handler = (req: Request) => Promise<Response> | Response;
type Middleware = (req: Request, next: Handler) => Promise<Response> | Response;

function compose(...middlewares: Middleware[]): Handler {
  return async (req: Request): Promise<Response> => {
    let index = -1;

    const dispatch = async (i: number): Promise<Response> => {
      if (i <= index) throw new Error("next() called multiple times");
      index = i;

      const middleware = middlewares[i];
      if (!middleware) return new Response("Not Found", { status: 404 });

      return middleware(req, (r) => dispatch(i + 1));
    };

    return dispatch(0);
  };
}

// ロギングミドルウェア
const logger: Middleware = async (req, next) => {
  const start = Date.now();
  const response = await next(req);
  const duration = Date.now() - start;
  console.log(`${req.method} ${req.url} ${response.status} - ${duration}ms`);
  return response;
};

// CORS ミドルウェア
const cors: Middleware = async (req, next) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  const response = await next(req);
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");

  return new Response(response.body, {
    status: response.status,
    headers,
  });
};

// メインハンドラー
const mainHandler: Middleware = async (req, next) => {
  const url = new URL(req.url);
  if (url.pathname === "/api/health") {
    return Response.json({ status: "ok", timestamp: new Date().toISOString() });
  }
  return next(req);
};

const handler = compose(logger, cors, mainHandler);

Bun.serve({
  port: 3000,
  fetch: handler,
});
```

### WebSocketサポート

```typescript
// websocket-server.ts
interface WebSocketData {
  userId: string;
  roomId: string;
}

const server = Bun.serve<WebSocketData>({
  port: 3001,

  fetch(req, server) {
    const url = new URL(req.url);

    // WebSocketアップグレード
    if (url.pathname === "/ws") {
      const userId = url.searchParams.get("userId") || "anonymous";
      const roomId = url.searchParams.get("roomId") || "general";

      const upgraded = server.upgrade(req, {
        data: { userId, roomId },
      });

      if (upgraded) {
        return undefined; // WebSocketハンドシェイク完了
      }
      return new Response("WebSocket upgrade failed", { status: 500 });
    }

    return new Response("Bun WebSocket Server", { status: 200 });
  },

  websocket: {
    open(ws) {
      const { userId, roomId } = ws.data;
      console.log(`User ${userId} joined room ${roomId}`);

      // ルームに参加（pub/subパターン）
      ws.subscribe(roomId);
      ws.publish(roomId, JSON.stringify({
        type: "join",
        userId,
        message: `${userId} がルームに参加しました`,
        timestamp: new Date().toISOString(),
      }));
    },

    message(ws, message) {
      const { userId, roomId } = ws.data;
      const text = typeof message === "string" ? message : message.toString();

      console.log(`[${roomId}] ${userId}: ${text}`);

      // ルーム内の全員にブロードキャスト
      ws.publish(roomId, JSON.stringify({
        type: "message",
        userId,
        message: text,
        timestamp: new Date().toISOString(),
      }));
    },

    close(ws, code, reason) {
      const { userId, roomId } = ws.data;
      console.log(`User ${userId} left room ${roomId}: ${code} ${reason}`);

      ws.publish(roomId, JSON.stringify({
        type: "leave",
        userId,
        message: `${userId} がルームを退出しました`,
        timestamp: new Date().toISOString(),
      }));
    },

    drain(ws) {
      console.log("WebSocket backpressure relieved");
    },
  },
});

console.log(`WebSocket server running at ws://localhost:${server.port}/ws`);
```

---

## 8. ファイルI/O — Bun.file・Bun.write・高速読み書き

BunのファイルI/OはNode.jsの `fs` モジュールより大幅に高速で、APIも直感的だ。

### ファイル読み込み

```typescript
// file-io.ts

// テキストファイルの読み込み
const textFile = Bun.file("./data.txt");
const text = await textFile.text();
console.log(text);

// JSONファイルの読み込み（型付き）
interface Config {
  host: string;
  port: number;
  debug: boolean;
}
const configFile = Bun.file("./config.json");
const config: Config = await configFile.json();
console.log(config.host);

// バイナリファイルの読み込み
const imageFile = Bun.file("./image.png");
const buffer = await imageFile.arrayBuffer();
console.log(`File size: ${imageFile.size} bytes`);
console.log(`MIME type: ${imageFile.type}`);

// ストリームとして読み込み（大きなファイルに有効）
const largeFile = Bun.file("./large-file.csv");
const stream = largeFile.stream();
const reader = stream.getReader();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  // チャンクを処理
  process(value);
}

function process(chunk: Uint8Array) {
  // チャンク処理ロジック
  console.log(`Processing ${chunk.length} bytes`);
}
```

### ファイル書き込み

```typescript
// ファイルへの書き込み
await Bun.write("./output.txt", "Hello, Bun!");

// JSONの書き込み
const data = { name: "Bun", version: "1.1.0", fast: true };
await Bun.write("./output.json", JSON.stringify(data, null, 2));

// ArrayBufferの書き込み
const bytes = new Uint8Array([72, 101, 108, 108, 111]);
await Bun.write("./bytes.bin", bytes);

// BunFileオブジェクトへの書き込み
const destFile = Bun.file("./destination.txt");
await Bun.write(destFile, "Content to write");

// ファイルのコピー（最速の方法）
await Bun.write(
  Bun.file("./copy.txt"),
  Bun.file("./original.txt")
);

// Responseのbodyを直接ファイルに書き込み
const response = await fetch("https://example.com/data.json");
await Bun.write("./downloaded.json", response);
```

### ファイル存在確認とメタデータ

```typescript
// ファイルの存在確認
const file = Bun.file("./config.json");
const exists = await file.exists();
console.log(`ファイルが存在する: ${exists}`);

// ファイルサイズ（バイト）
console.log(`サイズ: ${file.size}`);

// MIMEタイプ（拡張子から自動判定）
console.log(`MIMEタイプ: ${file.type}`);

// 最終更新日時
const stat = await file.stat();
console.log(`最終更新: ${new Date(stat.mtimeMs)}`);
```

---

## 9. SQLiteサポート — bun:sqlite・パフォーマンス

Bunの最もユニークな機能のひとつが **ネイティブSQLiteサポート** だ。`bun:sqlite` モジュールはネイティブ実装により、`better-sqlite3` よりも高速なパフォーマンスを発揮する。

### 基本的な使い方

```typescript
// database.ts
import { Database } from "bun:sqlite";

// メモリ内DBを作成（テスト向け）
const memDb = new Database(":memory:");

// ファイルDBを作成（永続化）
const db = new Database("./app.sqlite");

// ファイルが存在しない場合は作成、存在する場合は開く
// 読み取り専用で開く
const readOnlyDb = new Database("./app.sqlite", { readonly: true });

// WAL（Write-Ahead Logging）モードを有効化（高パフォーマンス）
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA synchronous = normal;");
db.exec("PRAGMA foreign_keys = ON;");

// テーブル作成
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    published BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

console.log("データベースを初期化しました");
```

### CRUD操作

```typescript
// crud.ts
import { Database } from "bun:sqlite";

const db = new Database("./app.sqlite");

interface User {
  id?: number;
  name: string;
  email: string;
  created_at?: string;
}

// プリペアドステートメント（パフォーマンス向上・SQLインジェクション防止）
const insertUser = db.prepare<User, [string, string]>(
  "INSERT INTO users (name, email) VALUES (?, ?) RETURNING *"
);

const getUserById = db.prepare<User, [number]>(
  "SELECT * FROM users WHERE id = ?"
);

const getAllUsers = db.prepare<User, []>(
  "SELECT * FROM users ORDER BY created_at DESC"
);

const updateUser = db.prepare<User, [string, number]>(
  "UPDATE users SET name = ? WHERE id = ? RETURNING *"
);

const deleteUser = db.prepare<{ changes: number }, [number]>(
  "DELETE FROM users WHERE id = ?"
);

// ユーザーの作成
const newUser = insertUser.get("Alice", "alice@example.com");
console.log("作成:", newUser);
// 作成: { id: 1, name: 'Alice', email: 'alice@example.com', created_at: '...' }

// 全ユーザーの取得
const users = getAllUsers.all();
console.log("全ユーザー:", users);

// IDによる検索
const user = getUserById.get(1);
console.log("取得:", user);

// 更新
const updated = updateUser.get("Alice Smith", 1);
console.log("更新:", updated);

// 削除
deleteUser.run(1);
console.log("削除完了");
```

### トランザクション

```typescript
// transaction.ts
import { Database } from "bun:sqlite";

const db = new Database("./app.sqlite");

// トランザクションで複数操作をアトミックに実行
const transferPoints = db.transaction((fromId: number, toId: number, points: number) => {
  const deduct = db.prepare(
    "UPDATE users SET points = points - ? WHERE id = ? AND points >= ?"
  );
  const add = db.prepare(
    "UPDATE users SET points = points + ? WHERE id = ?"
  );

  const result = deduct.run(points, fromId, points);

  if (result.changes === 0) {
    throw new Error("ポイントが不足しています");
  }

  add.run(points, toId);

  return { success: true, transferred: points };
});

try {
  const result = transferPoints(1, 2, 100);
  console.log(result); // { success: true, transferred: 100 }
} catch (error) {
  console.error("トランザクション失敗:", error);
  // トランザクションは自動的にロールバックされる
}

// バルクインサート（高速）
const insertMany = db.transaction((users: Array<{ name: string; email: string }>) => {
  const stmt = db.prepare("INSERT INTO users (name, email) VALUES (?, ?)");
  for (const user of users) {
    stmt.run(user.name, user.email);
  }
  return users.length;
});

const count = insertMany([
  { name: "Bob", email: "bob@example.com" },
  { name: "Carol", email: "carol@example.com" },
  { name: "Dave", email: "dave@example.com" },
]);
console.log(`${count}件のユーザーを挿入しました`);
```

### パフォーマンス比較

公式ベンチマークによると、`bun:sqlite` は `better-sqlite3` の約3倍、`node:sqlite`（Node.js 22+）の約5倍高速で動作する。特にバルクインサートとプリペアドステートメントの再利用で差が顕著になる。

---

## 10. 環境変数 — .env自動読み込み

Bunは `.env` ファイルを追加パッケージなしで **自動的に読み込む**。`dotenv` パッケージは不要だ。

```bash
# .env ファイル
DATABASE_URL=sqlite:./app.sqlite
JWT_SECRET=my-super-secret-key-change-in-production
PORT=3000
NODE_ENV=development
API_BASE_URL=https://api.example.com

# .env.local（.envより優先）
PORT=4000
DEBUG=true

# .env.production（NODE_ENV=productionのとき）
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host/db
```

```typescript
// env.ts — 環境変数の利用
const port = parseInt(Bun.env.PORT ?? "3000");
const dbUrl = Bun.env.DATABASE_URL ?? ":memory:";
const jwtSecret = Bun.env.JWT_SECRET;
const isDev = Bun.env.NODE_ENV === "development";

if (!jwtSecret) {
  throw new Error("JWT_SECRET environment variable is required");
}

console.log(`Environment: ${Bun.env.NODE_ENV}`);
console.log(`Port: ${port}`);
console.log(`DB: ${dbUrl}`);

// process.env も同様に利用可能（Node.js互換）
const apiUrl = process.env.API_BASE_URL;
```

### 環境変数のバリデーション（Zodを使用）

```typescript
// env-schema.ts
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  API_BASE_URL: z.string().url().optional(),
});

// 型安全な環境変数オブジェクト
export const env = envSchema.parse(Bun.env);
export type Env = z.infer<typeof envSchema>;

// 使用例
import { env } from "./env-schema";
console.log(env.PORT);     // number型として取得
console.log(env.NODE_ENV); // "development" | "production" | "test" 型
```

---

## 11. Node.js互換性

BunはNode.js APIとの高い互換性を持ち、既存のNode.jsコードの多くをそのまま実行できる。

### サポート済みのNode.js API

```typescript
// node-compat.ts

// http/https（Bun.serveの方が推奨だが互換性のため対応）
import http from "node:http";
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Hello World\n");
});
server.listen(3000);

// fs（ファイルシステム）
import fs from "node:fs";
import fsPromises from "node:fs/promises";

const content = fs.readFileSync("./file.txt", "utf8");
const data = await fsPromises.readFile("./file.txt", "utf8");
await fsPromises.writeFile("./output.txt", "Hello");

// path
import path from "node:path";
const fullPath = path.join(__dirname, "src", "index.ts");
const dir = path.dirname(fullPath);
const ext = path.extname("file.ts"); // ".ts"

// crypto
import crypto from "node:crypto";
const hash = crypto.createHash("sha256").update("Hello").digest("hex");
const uuid = crypto.randomUUID();

// os
import os from "node:os";
console.log(os.platform()); // "darwin" / "linux" / "win32"
console.log(os.cpus().length);
console.log(os.freemem());

// stream
import { Readable, Writable, Transform } from "node:stream";

// buffer
import { Buffer } from "node:buffer";
const buf = Buffer.from("Hello, World!");
console.log(buf.toString("hex"));

// child_process
import { execSync, spawn } from "node:child_process";
const output = execSync("ls -la").toString();

// util
import { promisify } from "node:util";
```

### 互換性の制限事項

Node.jsとの互換性は高いが、一部のAPIは未サポートまたは動作が異なる。主な注意点を以下に示す。

```typescript
// 未サポート/制限がある主なAPI（2024年時点）
// - node:cluster（完全対応ではない）
// - node:worker_threads（基本動作は可能）
// - node:vm（スクリプトサンドボックスは部分的対応）
// - 一部のネイティブアドオン（.node拡張子）

// Bunで利用推奨の代替
// node:http → Bun.serve
// fs（同期）→ await Bun.file().text()
// better-sqlite3 → bun:sqlite
```

---

## 12. 既存プロジェクトのBun移行手順

Node.jsプロジェクトをBunに移行する手順を、実際のプロジェクトを例に解説する。

### ステップ1: Bunのインストールと依存関係の再インストール

```bash
# 1. Bunをインストール
curl -fsSL https://bun.sh/install | bash

# 2. プロジェクトディレクトリに移動
cd my-existing-project

# 3. node_modulesを削除
rm -rf node_modules

# 4. bun installで依存関係を再インストール（bun.lockbが生成される）
bun install

# 5. 既存のpackage-lock.jsonはそのまま残しておいてもよい
# （チームメンバーがnpmを使う場合のため）
```

### ステップ2: package.jsonのscriptsを更新

```json
{
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "build": "bun build src/index.ts --outdir dist --target node",
    "start": "bun run dist/index.js",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "lint": "biome lint .",
    "typecheck": "tsc --noEmit"
  }
}
```

### ステップ3: tsconfig.jsonの最適化

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext", "DOM"],
    "types": ["bun-types"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "jsx": "react-jsx"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

### ステップ4: Jestからbun testへの移行

```typescript
// Before: Jest
import { describe, test, expect, jest } from "@jest/globals";
const mockFn = jest.fn();

// After: bun test（import元を変更するだけ）
import { describe, it, expect, mock } from "bun:test";
const mockFn = mock(() => {});
```

```json
// package.jsonからjest関連の設定を削除
{
  "devDependencies": {
    // "jest": "^29.0.0",          ← 削除
    // "@jest/globals": "^29.0.0",  ← 削除
    // "ts-jest": "^29.0.0",        ← 削除
    // "@types/jest": "^29.0.0"     ← 削除
  }
}
```

### ステップ5: dotenvの削除

```typescript
// Before: Node.js + dotenv
import "dotenv/config";
const port = process.env.PORT;

// After: Bun（.envは自動読み込み）
// dotenvのimportは不要！
const port = Bun.env.PORT ?? process.env.PORT;
```

### ステップ6: 動作確認

```bash
# 全テストを実行して移行の成功を確認
bun test

# 開発サーバーを起動
bun run dev

# 本番ビルドを確認
bun run build && bun run start

# パフォーマンス比較（オプション）
time node dist/index.js
time bun dist/index.js
```

---

## 13. 本番デプロイ — Dockerコンテナ・Fly.io

BunはDockerとも完全互換であり、本番デプロイも容易だ。

### Dockerfileの作成

```dockerfile
# Dockerfile
# ===== ビルドステージ =====
FROM oven/bun:1 AS builder

WORKDIR /app

# 依存関係のインストール（キャッシュ活用のため先にコピー）
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# ソースコードのコピーとビルド
COPY . .
RUN bun build ./src/index.ts \
    --outdir ./dist \
    --target bun \
    --minify \
    --sourcemap=external

# ===== 本番ステージ =====
FROM oven/bun:1-slim AS production

WORKDIR /app

# ランタイム依存関係のみインストール
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

# ビルド成果物をコピー
COPY --from=builder /app/dist ./dist

# 環境変数の設定
ENV NODE_ENV=production
ENV PORT=3000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000

# 本番起動コマンド
CMD ["bun", "run", "dist/index.js"]
```

```yaml
# docker-compose.yml
version: "3.8"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=./data/app.sqlite
    volumes:
      - ./data:/app/data  # SQLiteデータ永続化
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

```bash
# ビルドと起動
docker build -t my-bun-app .
docker run -p 3000:3000 my-bun-app

# docker-composeで起動
docker compose up -d

# ログ確認
docker compose logs -f app
```

### Fly.ioへのデプロイ

Fly.ioはBunアプリのデプロイに最適なプラットフォームのひとつだ。無料枠があり、エッジに近いサーバーで低レイテンシを実現できる。

```bash
# Fly CLIのインストール
curl -L https://fly.io/install.sh | sh

# ログイン
fly auth login

# アプリの初期化（fly.tomlが生成される）
fly launch
```

```toml
# fly.toml
app = "my-bun-app"
primary_region = "nrt"  # 東京リージョン

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
  processes = ["app"]

[[vm]]
  memory = "256mb"
  cpu_kind = "shared"
  cpus = 1

[mounts]
  source = "data"
  destination = "/app/data"
```

```bash
# シークレット（環境変数）の設定
fly secrets set JWT_SECRET="$(openssl rand -base64 32)"
fly secrets set DATABASE_URL="./data/app.sqlite"

# デプロイ
fly deploy

# ログ確認
fly logs

# スケールアップ
fly scale vm shared-cpu-2x
fly scale count 2  # 2インスタンスに増やす
```

### Cloudflare Workersへのデプロイ

BunのAPIはWeb標準（Fetch API・ReadableStream・WebCrypto等）に準拠しているため、Cloudflare Workersとも互換性が高い。

```typescript
// worker.ts — Cloudflare Workers向け
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/hello") {
      return Response.json({
        message: "Hello from Cloudflare Workers!",
        region: request.cf?.region,
        country: request.cf?.country,
      });
    }

    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler;
```

```bash
# wranglerでデプロイ
bun add -d wrangler
bun wrangler deploy worker.ts
```

---

## まとめ — BunはJavaScriptエコシステムを変えるか

Bunが登場して以来、JavaScriptコミュニティには大きな変化が起きている。Node.jsも22以降でネイティブTypeScriptサポートを強化し、npmもインストール速度を改善するなど、Bunの影響を受けた改善が相次いでいる。

### Bunを採用すべき場面

- **新規プロジェクト**: 最初からBunで始めることでツールチェーンを簡素化できる
- **CLIツール開発**: 起動時間の短さが体験向上に直結する
- **内部APIサーバー**: 高スループットが必要なマイクロサービス
- **テスト速度の改善**: JestからBun Testへの移行で大幅高速化
- **スクリプト実行**: ts-nodeの代替として即時TypeScript実行

### 慎重に検討すべき場面

- **レガシーシステムとの統合**: native addonに依存するパッケージは動作確認が必要
- **大規模な既存Node.jsプロジェクト**: 段階的移行が現実的
- **Cloudflare Workers以外のエッジ環境**: まだNode.jsエコシステムの方が対応が手厚い

### 今後の展望

Bunはv1.0リリース後も積極的に開発が続いており、Node.jsとの互換性向上・マクロシステム・高度なバンドラー機能など継続的に機能追加されている。すでに多くのプロジェクトで本番環境への採用例が報告されており、今後さらに普及が加速すると予想される。

---

## おすすめツール: DevToolBox

Bun APIの開発中は、APIレスポンスのJSONをリアルタイムで検証・整形する場面が頻繁に発生する。**[DevToolBox](https://usedevtools.com/)** は、JSONフォーマッター・バリデーター・JWTデコーダー・Base64変換・正規表現テスターなど、Webバックエンド開発で日常的に必要なユーティリティを一箇所にまとめたオンラインツールセットだ。

`Bun.serve` で構築したAPIのレスポンスをDevToolBoxのJSONフォーマッターに貼り付けると、ネストされた構造も即座に視覚化されて見やすくなる。特にデータ構造が複雑なREST APIの開発時に、レスポンスの確認・デバッグ作業が大幅に効率化される。`bun:sqlite` のクエリ結果をJSONシリアライズしてDevToolBoxで検証するワークフローは、Bunを使ったバックエンド開発の定番パターンになりつつある。インストール不要でブラウザから即座に使えるため、開発環境を問わず活用できる。

---

## 参考リンク

- [Bun公式ドキュメント](https://bun.sh/docs)
- [Bun GitHubリポジトリ](https://github.com/oven-sh/bun)
- [Bun公式ブログ](https://bun.sh/blog)
- [bun:sqlite API リファレンス](https://bun.sh/docs/api/sqlite)
- [Bun HTTPサーバー API](https://bun.sh/docs/api/http)
- [Bun WebSocket API](https://bun.sh/docs/api/websockets)
- [Bun テストランナー](https://bun.sh/docs/cli/test)
- [Bun バンドラー](https://bun.sh/docs/bundler)
- [DevToolBox — JSON・JWT・開発者ツール](https://usedevtools.com/)

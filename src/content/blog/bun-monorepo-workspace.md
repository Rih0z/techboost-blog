---
title: "Bunワークスペース活用：モノレポプロジェクトの効率的な管理"
description: "Bunのワークスペース機能を使ってモノレポを構築し、複数パッケージを効率的に管理する方法を実践的に解説します。"
pubDate: "2025-02-06"
tags: ['Bun', 'Monorepo', 'workspace', 'パッケージ管理', 'TypeScript']
heroImage: '../../assets/thumbnails/bun-monorepo-workspace.jpg'
---
## Bunワークスペースとは

Bunワークスペースは、単一のリポジトリ内で複数のパッケージを管理するための機能です。npm/yarn/pnpmのワークスペースと互換性がありながら、Bunの高速なパフォーマンスを活かした開発体験を提供します。

### 主な特徴

- **高速インストール**: Bunの高速パッケージマネージャー
- **シンボリックリンク**: ローカルパッケージの自動リンク
- **依存関係の最適化**: 共通依存関係の重複排除
- **TypeScript統合**: パッケージ間の型安全性
- **互換性**: 既存のnpm/yarn/pnpmプロジェクトからの移行が容易

## プロジェクトセットアップ

### 基本構造の作成

```bash
# プロジェクトディレクトリを作成
mkdir my-monorepo && cd my-monorepo
bun init -y

# ワークスペース用のディレクトリ構造
mkdir -p packages/ui packages/utils packages/api apps/web apps/mobile
```

### package.jsonの設定

```json
{
  "name": "my-monorepo",
  "version": "1.0.0",
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "dev": "bun --filter './apps/*' dev",
    "build": "bun --filter './packages/*' build && bun --filter './apps/*' build",
    "test": "bun test",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.3.0"
  }
}
```

## パッケージの作成

### UIコンポーネントライブラリ

```bash
cd packages/ui
bun init -y
```

```json
// packages/ui/package.json
{
  "name": "@my-monorepo/ui",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./button": {
      "import": "./dist/button.js",
      "types": "./dist/button.d.ts"
    }
  },
  "scripts": {
    "build": "bun build src/index.ts --outdir dist --format esm --splitting",
    "dev": "bun build src/index.ts --outdir dist --format esm --watch",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": "^18.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "react": "^18.2.0",
    "typescript": "^5.3.0"
  }
}
```

```typescript
// packages/ui/src/button.tsx
import type { ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const baseStyles = "rounded font-medium transition-colors";
  
  const variantStyles = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-600 text-white hover:bg-gray-700",
    outline: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50"
  };
  
  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg"
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

```typescript
// packages/ui/src/index.ts
export { Button, type ButtonProps } from "./button";
export { Input, type InputProps } from "./input";
export { Card, type CardProps } from "./card";
```

```typescript
// packages/ui/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM"],
    "jsx": "react-jsx",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### ユーティリティパッケージ

```json
// packages/utils/package.json
{
  "name": "@my-monorepo/utils",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./string": "./dist/string.js",
    "./date": "./dist/date.js"
  },
  "scripts": {
    "build": "bun build src/index.ts --outdir dist --format esm",
    "test": "bun test"
  }
}
```

```typescript
// packages/utils/src/string.ts
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}
```

```typescript
// packages/utils/src/date.ts
export function formatDate(date: Date, format: string = "YYYY-MM-DD"): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  
  return format
    .replace("YYYY", String(year))
    .replace("MM", month)
    .replace("DD", day);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function diffDays(date1: Date, date2: Date): number {
  const ms = date2.getTime() - date1.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}
```

```typescript
// packages/utils/src/index.ts
export * from "./string";
export * from "./date";
export * from "./array";
export * from "./object";
```

### APIパッケージ

```json
// packages/api/package.json
{
  "name": "@my-monorepo/api",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "bun build src/index.ts --outdir dist --format esm",
    "dev": "bun --watch src/server.ts",
    "test": "bun test"
  },
  "dependencies": {
    "@my-monorepo/utils": "workspace:*",
    "hono": "^3.12.0"
  },
  "devDependencies": {
    "@types/bun": "latest"
  }
}
```

```typescript
// packages/api/src/client.ts
import type { ApiResponse, User, Post } from "./types";

export class ApiClient {
  constructor(private baseUrl: string) {}

  async get<T>(path: string): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${path}`);
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    return response.json();
  }

  async post<T>(path: string, data: unknown): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    return response.json();
  }

  // ユーザーAPI
  async getUser(id: string): Promise<User> {
    const response = await this.get<User>(`/users/${id}`);
    return response.data;
  }

  async getPosts(): Promise<Post[]> {
    const response = await this.get<Post[]>("/posts");
    return response.data;
  }
}
```

```typescript
// packages/api/src/server.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();

app.use("*", cors());
app.use("*", logger());

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: Date.now() });
});

app.get("/users/:id", (c) => {
  const id = c.req.param("id");
  return c.json({
    data: {
      id,
      name: "John Doe",
      email: "john@example.com"
    }
  });
});

export default app;
```

## アプリケーションの作成

### Webアプリ（React + Vite）

```json
// apps/web/package.json
{
  "name": "web",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@my-monorepo/ui": "workspace:*",
    "@my-monorepo/utils": "workspace:*",
    "@my-monorepo/api": "workspace:*",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0"
  }
}
```

```typescript
// apps/web/src/App.tsx
import { useState, useEffect } from "react";
import { Button } from "@my-monorepo/ui";
import { capitalize, formatDate } from "@my-monorepo/utils";
import { ApiClient } from "@my-monorepo/api";

const api = new ApiClient("http://localhost:3000");

function App() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    api.getUser("123").then(setUser);
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">
        {capitalize("welcome to my app")}
      </h1>
      
      {user && (
        <div className="mb-4">
          <p>User: {user.name}</p>
          <p>Email: {user.email}</p>
          <p>Date: {formatDate(new Date())}</p>
        </div>
      )}

      <div className="space-x-2">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
      </div>
    </div>
  );
}

export default App;
```

```typescript
// apps/web/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  }
});
```

## ワークスペースコマンド

### パッケージのインストール

```bash
# すべてのワークスペースの依存関係をインストール
bun install

# 特定のワークスペースに依存関係を追加
bun add react --cwd packages/ui

# ルートに開発依存関係を追加
bun add -D prettier
```

### ワークスペース間の依存関係

```bash
# apps/webからpackages/uiを参照
cd apps/web
bun add @my-monorepo/ui@workspace:*
```

### スクリプトの実行

```bash
# すべてのワークスペースでビルド
bun run build

# 特定のワークスペースでスクリプト実行
bun --filter @my-monorepo/ui build

# パターンマッチング
bun --filter './packages/*' build
bun --filter './apps/*' dev

# 並列実行
bun --filter './packages/*' --parallel build
```

## 共通設定の管理

### TypeScript設定の共有

```json
// tsconfig.base.json（ルート）
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

```json
// packages/ui/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### ESLint設定の共有

```javascript
// eslint.config.js（ルート）
import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json"
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-explicit-any": "warn"
    }
  }
];
```

## ビルドパイプライン

### ルートレベルのビルドスクリプト

```typescript
// scripts/build.ts
import { $ } from "bun";

const packages = [
  "packages/utils",
  "packages/ui",
  "packages/api"
];

const apps = [
  "apps/web"
];

console.log("Building packages...");
for (const pkg of packages) {
  console.log(`Building ${pkg}...`);
  await $`cd ${pkg} && bun run build`;
}

console.log("\nBuilding apps...");
for (const app of apps) {
  console.log(`Building ${app}...`);
  await $`cd ${app} && bun run build`;
}

console.log("\nBuild completed!");
```

### タスクランナーの統合

```json
// package.json
{
  "scripts": {
    "build": "bun run scripts/build.ts",
    "dev": "bun --filter './apps/*' dev",
    "test": "bun test --recursive",
    "lint": "eslint .",
    "format": "prettier --write .",
    "typecheck": "bun run typecheck:packages && bun run typecheck:apps",
    "typecheck:packages": "bun --filter './packages/*' typecheck",
    "typecheck:apps": "bun --filter './apps/*' typecheck",
    "clean": "bun run clean:packages && bun run clean:apps",
    "clean:packages": "rm -rf packages/*/dist packages/*/node_modules",
    "clean:apps": "rm -rf apps/*/dist apps/*/node_modules"
  }
}
```

## 依存関係の管理

### バージョンの統一

```json
// package.json（ルート）
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "typescript": "^5.3.0",
    "prettier": "^3.1.0",
    "eslint": "^8.56.0"
  }
}
```

### パッケージのホイスティング

```json
// bunfig.toml
[install]
# 共通依存関係をルートにホイスト
hoisting = true

# ピアデペンデンシーの自動インストール
auto-install-peers = true

# キャッシュ設定
cache-dir = ".bun-cache"
```

## テスト戦略

### パッケージごとのテスト

```typescript
// packages/utils/src/string.test.ts
import { describe, test, expect } from "bun:test";
import { capitalize, slugify, truncate } from "./string";

describe("String utilities", () => {
  test("capitalize", () => {
    expect(capitalize("hello")).toBe("Hello");
    expect(capitalize("HELLO")).toBe("HELLO");
    expect(capitalize("")).toBe("");
  });

  test("slugify", () => {
    expect(slugify("Hello World")).toBe("hello-world");
    expect(slugify("Hello  World!")).toBe("hello-world");
    expect(slugify("  Hello World  ")).toBe("hello-world");
  });

  test("truncate", () => {
    expect(truncate("Hello World", 5)).toBe("Hello...");
    expect(truncate("Hello", 10)).toBe("Hello");
  });
});
```

### 統合テスト

```typescript
// tests/integration/api.test.ts
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import app from "@my-monorepo/api/server";

describe("API Integration", () => {
  let server: any;

  beforeAll(() => {
    server = Bun.serve({
      port: 3001,
      fetch: app.fetch
    });
  });

  afterAll(() => {
    server.stop();
  });

  test("GET /health", async () => {
    const response = await fetch("http://localhost:3001/health");
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.status).toBe("ok");
  });

  test("GET /users/:id", async () => {
    const response = await fetch("http://localhost:3001/users/123");
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.data.id).toBe("123");
  });
});
```

## CI/CD設定

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install
      
      - name: Type check
        run: bun run typecheck
      
      - name: Lint
        run: bun run lint
      
      - name: Test
        run: bun test
      
      - name: Build
        run: bun run build
```

## パフォーマンス最適化

### 選択的ビルド

```typescript
// scripts/selective-build.ts
import { $ } from "bun";
import { readFileSync } from "fs";

// 変更されたファイルを検出
const changedFiles = await $`git diff --name-only HEAD~1`.text();
const files = changedFiles.split("\n").filter(Boolean);

// 影響を受けるパッケージを特定
const affectedPackages = new Set<string>();

for (const file of files) {
  if (file.startsWith("packages/")) {
    const pkg = file.split("/")[1];
    affectedPackages.add(`packages/${pkg}`);
  } else if (file.startsWith("apps/")) {
    const app = file.split("/")[1];
    affectedPackages.add(`apps/${app}`);
  }
}

// 影響を受けるパッケージのみビルド
for (const pkg of affectedPackages) {
  console.log(`Building ${pkg}...`);
  await $`cd ${pkg} && bun run build`;
}
```

### キャッシュの活用

```json
// bunfig.toml
[install]
cache-dir = ".bun-cache"

[build]
# ビルドキャッシュを有効化
cache = true
```

## ベストプラクティス

### 1. パッケージの分離原則

- 各パッケージは単一責任を持つ
- 循環依存を避ける
- パブリックAPIを明確に定義

### 2. バージョン管理

```bash
# changesets を使用した自動バージョニング
bun add -D @changesets/cli
bunx changeset init
```

### 3. ドキュメント

各パッケージにREADME.mdを配置:

```markdown
# @my-monorepo/ui

UIコンポーネントライブラリ

## インストール

\`\`\`bash
bun add @my-monorepo/ui
\`\`\`

## 使い方

\`\`\`tsx
import { Button } from "@my-monorepo/ui";

<Button variant="primary">Click me</Button>
\`\`\`
```

## まとめ

Bunワークスペースを使うことで:

- 高速なパッケージ管理とビルド
- 型安全なパッケージ間の連携
- 効率的な依存関係の管理
- 統一された開発環境

適切な構造設計、共通設定の活用、CI/CDの整備により、大規模モノレポでも快適な開発体験を実現できます。

---
title: "Bun vs Node.js 2026年 — 速度・互換性・本番採用の実態比較"
description: "BunとNode.jsの2026年最新比較。ベンチマーク、npm互換性、本番環境での採用状況、移行コスト、ユースケース別の選び方まで実践的に解説します。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。"
pubDate: "2026-03-04"
tags: ["Bun", "Node.js", "JavaScript", "TypeScript", "バックエンド"]
---
## はじめに

**Bun** は2023年に正式版をリリースし、JavaScriptランタイム・バンドラー・テストランナー・パッケージマネージャーをオールインワンで提供するツールキットです。「Node.jsの置き換え」として大きな注目を集めていますが、2026年時点での実態はどうでしょうか。

本記事では、速度・互換性・本番採用の観点からBunとNode.jsを徹底比較します。

## ベンチマーク比較

### HTTP サーバーパフォーマンス

```
HTTP リクエスト処理 (req/sec) - 2026年ベンチマーク

シンプルなHello World API:
Bun:      ~ 250,000 req/sec
Node.js:  ~ 85,000 req/sec
Deno:     ~ 120,000 req/sec

JSON API (読み取り):
Bun:      ~ 180,000 req/sec
Node.js:  ~ 65,000 req/sec

DB クエリ (PostgreSQL):
Bun:      ~ 45,000 req/sec
Node.js:  ~ 38,000 req/sec
```

### 起動時間とファイル操作

| 操作 | Bun | Node.js |
|---|---|---|
| スクリプト起動 | 5ms | 45ms |
| TypeScript実行 | 12ms | 要トランスパイル |
| ファイル読み取り（1MB） | 2ms | 8ms |
| npm install (cold) | 1.2秒 | 8.5秒 |

Bunのパッケージインストールは**Node.js（npm）の約7倍高速**です。これはローカル開発のDXを大きく改善します。

## Bun の主要機能

### TypeScript のネイティブ実行

```typescript
// tsconfig.json 不要・トランスパイル不要
// bun run app.ts で直接実行できる

import { Hono } from 'hono';

const app = new Hono();

interface User {
  id: number;
  name: string;
  email: string;
}

const users: User[] = [
  { id: 1, name: '田中太郎', email: 'tanaka@example.com' },
  { id: 2, name: '佐藤花子', email: 'sato@example.com' },
];

app.get('/users', (c) => c.json(users));

app.get('/users/:id', (c) => {
  const id = parseInt(c.req.param('id'));
  const user = users.find((u) => u.id === id);
  if (!user) return c.json({ error: 'Not Found' }, 404);
  return c.json(user);
});

Bun.serve({
  fetch: app.fetch,
  port: 3000,
});

console.log('サーバー起動: http://localhost:3000');
```

### 組み込みのテストランナー

```typescript
// app.test.ts
import { describe, test, expect, beforeEach, mock } from 'bun:test';

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
  });

  test('ユーザーを作成できる', async () => {
    const user = await userService.create({
      name: '田中太郎',
      email: 'tanaka@example.com',
    });

    expect(user.id).toBeDefined();
    expect(user.name).toBe('田中太郎');
  });

  test('メールが重複するとエラーになる', async () => {
    await userService.create({
      name: '田中太郎',
      email: 'tanaka@example.com',
    });

    expect(async () => {
      await userService.create({
        name: '田中次郎',
        email: 'tanaka@example.com', // 重複
      });
    }).toThrow('Email already exists');
  });

  test('モック関数が呼ばれる', () => {
    const mockFn = mock((x: number) => x * 2);
    expect(mockFn(5)).toBe(10);
    expect(mockFn).toHaveBeenCalledWith(5);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});
```

実行は `bun test` のみ。Jest・Vitestのような追加設定は不要です。

### Bun.file — 高速ファイルI/O

```typescript
// ファイル読み取り
const file = Bun.file('./data.json');
const data = await file.json(); // JSON自動パース

// ファイル書き込み
await Bun.write('./output.json', JSON.stringify(data, null, 2));

// ストリーム処理
const stream = Bun.file('./large-file.csv').stream();
for await (const chunk of stream) {
  // チャンク処理
}

// 環境変数（.envファイル自動読み込み）
const apiKey = process.env.API_KEY; // .envから自動読み込み
// ↑ dotenv不要！
```

## npm 互換性の現状（2026年）

BunはNode.jsとnpmのエコシステムとの互換性を継続的に向上させています。

### 互換性が高いカテゴリ

- **Webフレームワーク**: Express、Hono、Fastify（一部機能制限あり）
- **ORMs**: Prisma、Drizzle ORM
- **テストツール**: Jest（ほぼ互換）、Vitest
- **ユーティリティ**: Lodash、date-fns、zod

### 注意が必要なカテゴリ

```typescript
// Node.js固有のAPIへの依存
import { Worker } from 'worker_threads';  // 部分的にサポート
import { createServer } from 'net';       // 基本的にサポート
import { createInterface } from 'readline'; // サポート

// ネイティブアドオン（.node ファイル）
// → 互換性が低い。Node.js API を使用するネイティブバイナリは要確認

// 例: bcryptjs（Pure JS）は動作する
import bcrypt from 'bcryptjs';
const hash = await bcrypt.hash('password', 10); // OK

// node-gyp を使うネイティブビルドのモジュールは要注意
```

## Node.js が優位なケース

Bunの高速性は魅力的ですが、Node.jsを選ぶべきケースもあります。

1. **大規模なエンタープライズプロジェクト**: Node.jsのエコシステムと運用実績
2. **ネイティブアドオンへの依存**: 特定のnativeモジュール使用
3. **既存CI/CDパイプライン**: Node.js前提のインフラ構成
4. **AWS Lambda / Cloud Run**: BunのDockerイメージはNode.jsより大きい

```dockerfile
# Node.js Alpine（最小構成）
FROM node:22-alpine
# イメージサイズ: ~50MB

# Bun（最小構成）
FROM oven/bun:1-alpine
# イメージサイズ: ~90MB（2026年現在、縮小傾向）
```

## 移行ガイド（Node.js → Bun）

### パッケージマネージャーの移行

```bash
# package.json はそのまま使える
# npm install → bun install
bun install

# npm run dev → bun dev  or  bun run dev
bun dev

# npx → bunx
bunx create-next-app@latest my-app

# Node.js バイナリ実行
bun run server.js  # node server.js と同等
bun run server.ts  # TypeScript直接実行
```

### 環境変数の扱い

```typescript
// .env ファイルは自動読み込み（dotenv不要）
// .env.local, .env.development なども対応

// Node.js
require('dotenv').config(); // 必要
const port = process.env.PORT ?? 3000;

// Bun
// dotenv インポート不要
const port = process.env.PORT ?? 3000; // そのまま動く
```

## まとめ

2026年時点でのBun vs Node.jsの結論です。

| 観点 | Bun | Node.js |
|---|---|---|
| 実行速度 | 2〜3倍高速 | 安定・実績あり |
| TypeScript | ネイティブ対応 | 要設定 |
| npm互換性 | 約95% | 100% |
| エコシステム | 急成長中 | 成熟・豊富 |
| 本番採用 | 増加中 | 主流 |

**新規プロジェクト**：ウェブAPI、スクリプト、CLIツールであればBunの採用を強くお勧めします。開発体験が大幅に向上します。

**既存プロジェクト**：パッケージマネージャーとして `bun install` だけ採用する「段階的移行」から始めるのが現実的です。

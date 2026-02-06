---
title: "Nitro完全ガイド — Nuxt/H3ベースのユニバーサルサーバーエンジンでどこでも動くAPI構築"
description: "あらゆるプラットフォームで動作するユニバーサルサーバーエンジンNitroの完全ガイド。API Routes、Server Middleware、キャッシング、デプロイ戦略まで実践的に解説します。"
pubDate: "2025-02-06"
tags: ["Nitro", "Nuxt", "H3", "Server", "API", "Universal", "Edge Computing"]
---

Nitroは、Nuxt 3のサーバーエンジンとして開発された、ユニバーサルなJavaScriptサーバーフレームワークです。Node.js、Cloudflare Workers、Deno、Vercel、AWS Lambdaなど、あらゆるプラットフォームで同じコードが動作し、高速なAPIとサーバーサイドロジックを構築できます。この記事では、Nitroの基本から実践的な使い方まで徹底的に解説します。

## Nitroとは

Nitroは、UnJSエコシステムの一部として開発された、次世代のサーバーエンジンです。Nuxt 3のバックエンド基盤として誕生しましたが、単独でも使用できる強力なフレームワークです。

### 主な特徴

- **ユニバーサル** - あらゆるプラットフォームで動作（Node.js、Deno、Workers、Lambda等）
- **高速** - H3ベースの高性能HTTPサーバー
- **自動最適化** - プラットフォームごとに最適化されたビルド
- **ファイルベースルーティング** - `server/api/`に配置するだけでAPIが完成
- **ビルトインキャッシュ** - インメモリ、Redis、Cloudflare KVなど複数のストレージ対応
- **HMR対応** - 開発時の高速なホットリロード
- **TypeScript完全対応** - 完全な型安全性
- **ゼロコンフィグ** - 設定なしで即座に利用可能

### Nitroのアーキテクチャ

```
┌─────────────────────────────────────────┐
│         Application Code                │
│  (API Routes, Middleware, Plugins)      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│             Nitro Core                  │
│  (H3, unjs/*, Routing, Caching)        │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│         Platform Adapters               │
│  Node / Workers / Deno / Lambda / ...   │
└─────────────────────────────────────────┘
```

## インストールとセットアップ

### スタンドアロンプロジェクト

```bash
# プロジェクト作成
npm init -y
npm install nitropack

# TypeScript設定（推奨）
npm install -D typescript @types/node

# ディレクトリ構造作成
mkdir -p server/api server/middleware server/plugins
```

### 基本的なディレクトリ構造

```
my-nitro-app/
├── server/
│   ├── api/           # APIルート
│   │   ├── hello.ts
│   │   └── users/
│   │       ├── index.ts
│   │       └── [id].ts
│   ├── routes/        # 通常のルート
│   │   └── health.ts
│   ├── middleware/    # グローバルミドルウェア
│   │   └── auth.ts
│   └── plugins/       # サーバープラグイン
│       └── database.ts
├── nitro.config.ts    # Nitro設定
├── tsconfig.json
└── package.json
```

### 最小構成の設定

```typescript
// nitro.config.ts
export default defineNitroConfig({
  srcDir: 'server',
});
```

```json
// package.json
{
  "scripts": {
    "dev": "nitro dev",
    "build": "nitro build",
    "preview": "node .output/server/index.mjs"
  }
}
```

## API Routesの作成

### 基本的なAPIエンドポイント

```typescript
// server/api/hello.ts
export default defineEventHandler((event) => {
  return {
    message: 'Hello from Nitro!',
    timestamp: new Date().toISOString(),
  };
});
```

アクセス: `GET http://localhost:3000/api/hello`

### パラメータの取得

```typescript
// server/api/users/[id].ts
export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id');

  return {
    userId: id,
    name: 'John Doe',
    email: 'john@example.com',
  };
});
```

### クエリパラメータ

```typescript
// server/api/search.ts
export default defineEventHandler((event) => {
  const query = getQuery(event);

  return {
    query: query.q,
    page: query.page || 1,
    limit: query.limit || 10,
  };
});
```

アクセス: `GET /api/search?q=nitro&page=1&limit=20`

### POSTリクエストの処理

```typescript
// server/api/users/index.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  // バリデーション
  if (!body.name || !body.email) {
    throw createError({
      statusCode: 400,
      message: 'Name and email are required',
    });
  }

  // データベース保存処理（仮）
  const user = {
    id: Date.now(),
    ...body,
    createdAt: new Date().toISOString(),
  };

  return {
    success: true,
    user,
  };
});
```

### RESTful APIの完全実装

```typescript
// server/api/posts/[id].ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const method = event.node.req.method;

  switch (method) {
    case 'GET':
      // 記事取得
      return {
        id,
        title: 'Sample Post',
        content: 'Post content...',
      };

    case 'PUT':
      // 記事更新
      const body = await readBody(event);
      return {
        id,
        ...body,
        updatedAt: new Date().toISOString(),
      };

    case 'DELETE':
      // 記事削除
      return {
        success: true,
        id,
      };

    default:
      throw createError({
        statusCode: 405,
        message: 'Method not allowed',
      });
  }
});
```

## リクエスト/レスポンス処理

### ヘッダーの操作

```typescript
// server/api/with-headers.ts
export default defineEventHandler((event) => {
  // レスポンスヘッダー設定
  setResponseHeaders(event, {
    'X-Custom-Header': 'value',
    'Cache-Control': 'max-age=3600',
  });

  // 個別ヘッダー設定
  setHeader(event, 'X-API-Version', '1.0');

  // リクエストヘッダー取得
  const userAgent = getHeader(event, 'user-agent');
  const auth = getHeader(event, 'authorization');

  return {
    userAgent,
    hasAuth: !!auth,
  };
});
```

### Cookieの操作

```typescript
// server/api/auth/login.post.ts
export default defineEventHandler(async (event) => {
  const { username, password } = await readBody(event);

  // 認証処理（簡易版）
  if (username === 'admin' && password === 'password') {
    const token = 'sample-token-' + Date.now();

    // Cookieを設定
    setCookie(event, 'auth-token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7日間
    });

    return {
      success: true,
      token,
    };
  }

  throw createError({
    statusCode: 401,
    message: 'Invalid credentials',
  });
});
```

```typescript
// server/api/auth/me.ts
export default defineEventHandler((event) => {
  const token = getCookie(event, 'auth-token');

  if (!token) {
    throw createError({
      statusCode: 401,
      message: 'Not authenticated',
    });
  }

  return {
    username: 'admin',
    token,
  };
});
```

### ステータスコードの設定

```typescript
// server/api/status-examples.ts
export default defineEventHandler((event) => {
  const type = getQuery(event).type;

  switch (type) {
    case 'created':
      setResponseStatus(event, 201);
      return { message: 'Resource created' };

    case 'no-content':
      setResponseStatus(event, 204);
      return null;

    case 'redirect':
      return sendRedirect(event, '/api/hello', 302);

    case 'error':
      throw createError({
        statusCode: 500,
        message: 'Something went wrong',
      });

    default:
      return { message: 'OK' };
  }
});
```

## ミドルウェア

### グローバルミドルウェア

```typescript
// server/middleware/logger.ts
export default defineEventHandler((event) => {
  const start = Date.now();

  console.log(`[${new Date().toISOString()}] ${event.node.req.method} ${event.node.req.url}`);

  // レスポンス後の処理
  event.node.res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`  → ${event.node.res.statusCode} (${duration}ms)`);
  });
});
```

### CORS設定

```typescript
// server/middleware/cors.ts
export default defineEventHandler((event) => {
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });

  // OPTIONSリクエスト処理
  if (event.node.req.method === 'OPTIONS') {
    event.node.res.statusCode = 204;
    event.node.res.end();
  }
});
```

### 認証ミドルウェア

```typescript
// server/middleware/auth.ts
export default defineEventHandler((event) => {
  // 認証が不要なパス
  const publicPaths = ['/api/auth/login', '/api/health'];
  if (publicPaths.some((path) => event.node.req.url?.startsWith(path))) {
    return;
  }

  const token = getHeader(event, 'authorization')?.replace('Bearer ', '');

  if (!token) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required',
    });
  }

  // トークン検証（簡易版）
  if (token !== 'valid-token') {
    throw createError({
      statusCode: 401,
      message: 'Invalid token',
    });
  }

  // ユーザー情報をcontextに保存
  event.context.user = {
    id: 'user-123',
    username: 'admin',
  };
});
```

## キャッシング戦略

### ビルトインキャッシュ

```typescript
// server/api/cached-data.ts
export default defineEventHandler(
  cachedEventHandler(
    async (event) => {
      // 重い処理
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return {
        data: 'Expensive data',
        timestamp: Date.now(),
      };
    },
    {
      maxAge: 60 * 60, // 1時間キャッシュ
      name: 'cached-data',
      getKey: (event) => {
        const query = getQuery(event);
        return `data:${query.id}`;
      },
    }
  )
);
```

### ストレージの設定

```typescript
// nitro.config.ts
export default defineNitroConfig({
  storage: {
    cache: {
      driver: 'redis',
      host: 'localhost',
      port: 6379,
    },
    db: {
      driver: 'fs',
      base: './.data/db',
    },
  },
});
```

### ストレージの利用

```typescript
// server/api/storage-example.ts
export default defineEventHandler(async (event) => {
  const storage = useStorage('cache');

  // データ保存
  await storage.setItem('user:123', {
    name: 'John Doe',
    email: 'john@example.com',
  });

  // データ取得
  const user = await storage.getItem('user:123');

  // データ削除
  await storage.removeItem('user:123');

  // キー一覧取得
  const keys = await storage.getKeys('user:');

  return { user, keys };
});
```

### Cloudflare KVの使用

```typescript
// nitro.config.ts
export default defineNitroConfig({
  storage: {
    kv: {
      driver: 'cloudflare-kv-binding',
      binding: 'MY_KV',
    },
  },
});
```

```typescript
// server/api/kv-example.ts
export default defineEventHandler(async (event) => {
  const kv = useStorage('kv');

  await kv.setItem('counter', '0', {
    ttl: 3600, // 1時間
  });

  const counter = await kv.getItem('counter');

  return { counter };
});
```

## データベース統合

### Prismaの統合

```typescript
// server/plugins/database.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default defineNitroPlugin(() => {
  // プラグイン初期化時に実行
  console.log('Database connected');
});

// グローバルに使えるようにする
declare module 'h3' {
  interface H3EventContext {
    prisma: PrismaClient;
  }
}
```

```typescript
// server/utils/db.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const usePrisma = () => prisma;
```

```typescript
// server/api/posts/index.ts
export default defineEventHandler(async (event) => {
  const prisma = usePrisma();

  const posts = await prisma.post.findMany({
    include: {
      author: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  });

  return { posts };
});
```

### Drizzle ORMの使用

```typescript
// server/utils/db.ts
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const sqlite = new Database('sqlite.db');
export const db = drizzle(sqlite);
```

```typescript
// server/api/users/index.ts
import { db } from '~/server/utils/db';
import { users } from '~/server/db/schema';

export default defineEventHandler(async (event) => {
  const allUsers = await db.select().from(users);

  return { users: allUsers };
});
```

## バリデーション

### Zodによるバリデーション

```typescript
// server/api/users/create.post.ts
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150).optional(),
});

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  // バリデーション
  const result = userSchema.safeParse(body);

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Validation failed',
      data: result.error.issues,
    });
  }

  // バリデーション済みデータ
  const validData = result.data;

  return {
    success: true,
    user: validData,
  };
});
```

### カスタムバリデーター

```typescript
// server/utils/validate.ts
export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validateRequired = (value: any, fieldName: string) => {
  if (!value) {
    throw createError({
      statusCode: 400,
      message: `${fieldName} is required`,
    });
  }
};
```

## エラーハンドリング

### グローバルエラーハンドラ

```typescript
// server/middleware/error.ts
export default defineEventHandler((event) => {
  // エラーハンドリング
  event.node.res.on('finish', () => {
    if (event.node.res.statusCode >= 400) {
      console.error(`Error: ${event.node.res.statusCode} ${event.node.req.url}`);
    }
  });
});
```

### カスタムエラーレスポンス

```typescript
// server/api/error-example.ts
export default defineEventHandler((event) => {
  throw createError({
    statusCode: 404,
    statusMessage: 'Not Found',
    message: 'Resource not found',
    data: {
      code: 'RESOURCE_NOT_FOUND',
      timestamp: new Date().toISOString(),
    },
  });
});
```

### エラー境界の実装

```typescript
// server/utils/error.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public data?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const handleError = (error: unknown) => {
  if (error instanceof AppError) {
    return createError({
      statusCode: error.statusCode,
      message: error.message,
      data: {
        code: error.code,
        ...error.data,
      },
    });
  }

  console.error('Unexpected error:', error);

  return createError({
    statusCode: 500,
    message: 'Internal server error',
  });
};
```

## 環境変数とランタイム設定

### ランタイムコンフィグ

```typescript
// nitro.config.ts
export default defineNitroConfig({
  runtimeConfig: {
    // プライベート設定（サーバーのみ）
    databaseUrl: process.env.DATABASE_URL,
    apiSecret: process.env.API_SECRET,
    // パブリック設定（クライアントでも利用可能）
    public: {
      apiBase: process.env.PUBLIC_API_BASE || '/api',
    },
  },
});
```

使用例:

```typescript
// server/api/config-example.ts
export default defineEventHandler((event) => {
  const config = useRuntimeConfig();

  return {
    apiBase: config.public.apiBase,
    // databaseUrlはサーバーのみアクセス可能
    hasDatabase: !!config.databaseUrl,
  };
});
```

## プラットフォーム別デプロイ

### Cloudflare Workersへのデプロイ

```typescript
// nitro.config.ts
export default defineNitroConfig({
  preset: 'cloudflare',
});
```

```bash
npm run build
npx wrangler deploy
```

### Vercelへのデプロイ

```typescript
// nitro.config.ts
export default defineNitroConfig({
  preset: 'vercel',
});
```

```bash
npm run build
vercel deploy
```

### AWS Lambdaへのデプロイ

```typescript
// nitro.config.ts
export default defineNitroConfig({
  preset: 'aws-lambda',
});
```

### Denoへのデプロイ

```typescript
// nitro.config.ts
export default defineNitroConfig({
  preset: 'deno-deploy',
});
```

### Node.jsサーバー

```typescript
// nitro.config.ts
export default defineNitroConfig({
  preset: 'node-server',
});
```

```bash
npm run build
node .output/server/index.mjs
```

## まとめ

Nitroは、モダンなサーバーアプリケーション開発のための理想的なフレームワークです。

**主な利点:**
- あらゆるプラットフォームで動作するユニバーサル性
- ファイルベースルーティングで直感的なAPI構築
- ビルトインキャッシュで高速化が容易
- TypeScript完全対応で型安全
- H3ベースの高性能HTTPサーバー

**こんなプロジェクトに最適:**
- プラットフォーム非依存のAPI開発
- Nuxt 3のバックエンド拡張
- Edge Computingを活用したい
- 高速なAPIサーバーが必要

Nitroは、「どこでも動く」という理念のもと、現代のサーバーレス・Edge Computing時代に最適化されたフレームワークです。

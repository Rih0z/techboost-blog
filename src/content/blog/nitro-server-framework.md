---
title: "Nitroサーバーフレームワーク完全ガイド：ユニバーサルJSサーバー構築"
description: "Nitroを使って高速でスケーラブルなユニバーサルJavaScriptサーバーを構築する方法を解説。Nuxt 3のサーバーエンジンとして生まれた次世代フレームワークの単体活用法を紹介します。"
pubDate: "2025-02-06"
tags: ["Nitro", "サーバーフレームワーク", "フルスタック", "TypeScript", "Nuxt"]
heroImage: '../../assets/thumbnails/nitro-server-framework.jpg'
---
## Nitroとは

Nitroは、UnJSエコシステムの一部として開発された次世代のユニバーサルJavaScriptサーバーフレームワークです。Nuxt 3のサーバーエンジンとして誕生しましたが、単体でも使用できる汎用的なフレームワークとして進化しました。

### 主な特徴

- **ユニバーサルデプロイ**: Vercel、Cloudflare、AWS、Netlify など50以上のプラットフォームに対応
- **ファイルベースルーティング**: 直感的なAPI設計
- **自動型生成**: TypeScriptの完全サポート
- **ホットリロード**: 開発時の高速な反映
- **コード分割**: 最適化されたビルド出力
- **ストレージ抽象化**: 統一されたデータアクセスAPI

## セットアップ

### プロジェクト作成

```bash
# 新規プロジェクト作成
npx giget@latest nitro my-nitro-app
cd my-nitro-app

# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev
```

### プロジェクト構造

```
my-nitro-app/
├── routes/           # APIルート
├── api/             # レガシーAPIルート（非推奨）
├── public/          # 静的ファイル
├── storage/         # ストレージ設定
├── utils/           # ユーティリティ関数
├── plugins/         # サーバープラグイン
├── middleware/      # サーバーミドルウェア
├── nitro.config.ts  # Nitro設定
└── tsconfig.json    # TypeScript設定
```

## ルーティング

### 基本的なルート定義

```typescript
// routes/index.ts
export default defineEventHandler(() => {
  return {
    message: 'Hello from Nitro!',
    timestamp: Date.now()
  };
});
```

```typescript
// routes/hello.get.ts
export default defineEventHandler((event) => {
  return {
    message: 'GET request to /hello'
  };
});
```

```typescript
// routes/hello.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  return {
    message: 'POST request to /hello',
    received: body
  };
});
```

### 動的ルート

```typescript
// routes/users/[id].get.ts
export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id');
  
  return {
    userId: id,
    name: `User ${id}`,
    email: `user${id}@example.com`
  };
});
```

```typescript
// routes/posts/[slug].ts
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug');
  
  // データベースから記事を取得
  const post = await useStorage('posts').getItem(slug);
  
  if (!post) {
    throw createError({
      statusCode: 404,
      message: 'Post not found'
    });
  }
  
  return post;
});
```

### キャッチオールルート

```typescript
// routes/[...slug].ts
export default defineEventHandler((event) => {
  const slug = getRouterParam(event, 'slug');
  
  return {
    path: slug,
    segments: slug?.split('/') || []
  };
});
```

## リクエスト処理

### クエリパラメータの取得

```typescript
// routes/search.get.ts
export default defineEventHandler((event) => {
  const query = getQuery(event);
  
  return {
    q: query.q,
    page: Number(query.page) || 1,
    limit: Number(query.limit) || 10
  };
});
```

### リクエストボディの処理

```typescript
// routes/api/users.post.ts
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(0).optional()
});

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  
  // バリデーション
  const result = userSchema.safeParse(body);
  
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Validation failed',
      data: result.error.errors
    });
  }
  
  const user = result.data;
  
  // データベースに保存
  await useStorage('users').setItem(user.email, user);
  
  return {
    success: true,
    user
  };
});
```

### ヘッダーの操作

```typescript
// routes/api/protected.ts
export default defineEventHandler((event) => {
  const auth = getHeader(event, 'authorization');
  
  if (!auth || !auth.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    });
  }
  
  const token = auth.substring(7);
  
  // レスポンスヘッダーを設定
  setHeader(event, 'X-Custom-Header', 'value');
  
  return { message: 'Protected resource', token };
});
```

### Cookie操作

```typescript
// routes/auth/login.post.ts
export default defineEventHandler(async (event) => {
  const { username, password } = await readBody(event);
  
  // 認証処理
  const user = await authenticateUser(username, password);
  
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Invalid credentials'
    });
  }
  
  // Cookieを設定
  setCookie(event, 'session', user.sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7 // 7日間
  });
  
  return { success: true, user };
});

// routes/auth/logout.post.ts
export default defineEventHandler((event) => {
  // Cookieを削除
  deleteCookie(event, 'session');
  
  return { success: true };
});
```

## ミドルウェア

### グローバルミドルウェア

```typescript
// middleware/logger.ts
export default defineEventHandler((event) => {
  const start = Date.now();
  
  console.log(`[${new Date().toISOString()}] ${event.method} ${event.path}`);
  
  // レスポンス後の処理
  event.node.res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${event.method} ${event.path} - ${duration}ms`);
  });
});
```

### 認証ミドルウェア

```typescript
// middleware/auth.ts
export default defineEventHandler(async (event) => {
  // 公開エンドポイントはスキップ
  if (event.path.startsWith('/public') || event.path === '/auth/login') {
    return;
  }
  
  const session = getCookie(event, 'session');
  
  if (!session) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required'
    });
  }
  
  // セッションを検証
  const user = await validateSession(session);
  
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Invalid session'
    });
  }
  
  // コンテキストにユーザー情報を保存
  event.context.user = user;
});
```

### CORS設定

```typescript
// middleware/cors.ts
export default defineEventHandler((event) => {
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  
  // OPTIONSリクエストの処理
  if (event.method === 'OPTIONS') {
    event.node.res.statusCode = 204;
    event.node.res.end();
    return;
  }
});
```

## ストレージ

### ファイルシステムストレージ

```typescript
// routes/api/cache/[key].get.ts
export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, 'key');
  
  // ストレージから取得
  const value = await useStorage('cache').getItem(key);
  
  if (!value) {
    throw createError({
      statusCode: 404,
      message: 'Key not found'
    });
  }
  
  return { key, value };
});

// routes/api/cache/[key].put.ts
export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, 'key');
  const { value, ttl } = await readBody(event);
  
  // ストレージに保存
  await useStorage('cache').setItem(key, value);
  
  // TTL設定（オプション）
  if (ttl) {
    setTimeout(async () => {
      await useStorage('cache').removeItem(key);
    }, ttl * 1000);
  }
  
  return { success: true, key, value };
});
```

### データベース統合

```typescript
// utils/db.ts
import { createStorage } from 'unstorage';
import redisDriver from 'unstorage/drivers/redis';

export const redisStorage = createStorage({
  driver: redisDriver({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD
  })
});

// routes/api/users/[id].get.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  
  // Redisから取得
  const cached = await redisStorage.getItem(`user:${id}`);
  
  if (cached) {
    return { ...cached, cached: true };
  }
  
  // データベースから取得
  const user = await fetchUserFromDB(id);
  
  // キャッシュに保存
  await redisStorage.setItem(`user:${id}`, user);
  
  return { ...user, cached: false };
});
```

## キャッシング

### ルートキャッシュ

```typescript
// routes/api/expensive.get.ts
export default defineCachedEventHandler(
  async (event) => {
    // 重い処理
    const data = await fetchExpensiveData();
    return data;
  },
  {
    maxAge: 60 * 10, // 10分間キャッシュ
    name: 'expensive-data',
    getKey: (event) => {
      const query = getQuery(event);
      return `expensive-${query.id}`;
    }
  }
);
```

### 条件付きキャッシュ

```typescript
// routes/api/posts.get.ts
export default defineCachedEventHandler(
  async (event) => {
    const posts = await fetchPosts();
    return posts;
  },
  {
    maxAge: 60 * 5,
    shouldBypassCache: (event) => {
      // 管理者はキャッシュをバイパス
      return event.context.user?.role === 'admin';
    }
  }
);
```

## タスクとスケジューリング

```typescript
// tasks/cleanup.ts
export default defineTask({
  meta: {
    name: 'cleanup',
    description: 'Clean up old cache entries'
  },
  async run() {
    const storage = useStorage('cache');
    const keys = await storage.getKeys();
    
    let cleaned = 0;
    
    for (const key of keys) {
      const item = await storage.getItem(key);
      
      if (isExpired(item)) {
        await storage.removeItem(key);
        cleaned++;
      }
    }
    
    return { result: `Cleaned ${cleaned} items` };
  }
});

// nitro.config.ts で定期実行を設定
export default defineNitroConfig({
  scheduledTasks: {
    // 毎日午前3時に実行
    '0 3 * * *': ['cleanup']
  }
});
```

## WebSocket

```typescript
// routes/ws.ts
export default defineWebSocketHandler({
  open(peer) {
    console.log('Client connected:', peer.id);
    peer.send({ type: 'welcome', message: 'Connected to server' });
  },
  
  message(peer, message) {
    console.log('Received:', message);
    
    // 全クライアントにブロードキャスト
    peer.publish('chat', message);
  },
  
  close(peer) {
    console.log('Client disconnected:', peer.id);
  },
  
  error(peer, error) {
    console.error('WebSocket error:', error);
  }
});
```

## サーバーサイドレンダリング

```typescript
// routes/render.get.ts
export default defineEventHandler(async (event) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>SSR Example</title>
      </head>
      <body>
        <h1>Server-Side Rendered Page</h1>
        <p>Generated at: ${new Date().toISOString()}</p>
      </body>
    </html>
  `;
  
  setResponseHeader(event, 'Content-Type', 'text/html');
  return html;
});
```

## デプロイ

### Vercel

```typescript
// nitro.config.ts
export default defineNitroConfig({
  preset: 'vercel'
});
```

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".output"
}
```

### Cloudflare Workers

```typescript
// nitro.config.ts
export default defineNitroConfig({
  preset: 'cloudflare',
  cloudflare: {
    workers: {
      kvNamespaces: ['MY_KV']
    }
  }
});
```

### AWS Lambda

```typescript
// nitro.config.ts
export default defineNitroConfig({
  preset: 'aws-lambda'
});
```

### Netlify

```typescript
// nitro.config.ts
export default defineNitroConfig({
  preset: 'netlify'
});
```

### Docker

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV PORT=3000
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
```

## 環境設定

```typescript
// nitro.config.ts
export default defineNitroConfig({
  runtimeConfig: {
    // プライベート（サーバーサイドのみ）
    dbUrl: process.env.DATABASE_URL,
    apiSecret: process.env.API_SECRET,
    
    // パブリック（クライアントにも露出）
    public: {
      apiBase: process.env.PUBLIC_API_BASE || '/api'
    }
  },
  
  // ルートルール
  routeRules: {
    '/api/**': { cors: true },
    '/public/**': { cache: { maxAge: 60 * 60 } },
    '/admin/**': { ssr: false }
  }
});
```

使用例:

```typescript
// routes/api/config.get.ts
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event);
  
  return {
    // パブリック設定のみ返す
    apiBase: config.public.apiBase,
    // プライベート設定は返さない
  };
});
```

## エラーハンドリング

```typescript
// middleware/error.ts
export default defineEventHandler((event) => {
  event.node.res.on('error', (error) => {
    console.error('Response error:', error);
  });
});

// utils/errors.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// routes/api/example.ts
export default defineEventHandler(async (event) => {
  try {
    const data = await riskyOperation();
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw createError({
        statusCode: error.statusCode,
        message: error.message,
        data: { code: error.code }
      });
    }
    
    // 予期しないエラー
    throw createError({
      statusCode: 500,
      message: 'Internal server error'
    });
  }
});
```

## テスト

```typescript
// tests/api.test.ts
import { describe, it, expect } from 'vitest';
import { $fetch, setup } from '@nuxt/test-utils';

describe('API Tests', async () => {
  await setup({
    server: true
  });

  it('GET /api/hello', async () => {
    const response = await $fetch('/api/hello');
    
    expect(response).toHaveProperty('message');
    expect(response.message).toBe('Hello from Nitro!');
  });

  it('POST /api/users', async () => {
    const response = await $fetch('/api/users', {
      method: 'POST',
      body: {
        name: 'John Doe',
        email: 'john@example.com'
      }
    });
    
    expect(response.success).toBe(true);
    expect(response.user.name).toBe('John Doe');
  });
});
```

## ベストプラクティス

### 1. 型安全性の確保

```typescript
// types/api.ts
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// routes/api/users/[id].get.ts
export default defineEventHandler(async (event): Promise<ApiResponse<User>> => {
  const id = getRouterParam(event, 'id');
  const user = await fetchUser(id);
  
  return {
    success: true,
    data: user
  };
});
```

### 2. エラーハンドリングの一貫性

```typescript
// utils/response.ts
export function successResponse<T>(data: T) {
  return {
    success: true,
    data,
    timestamp: Date.now()
  };
}

export function errorResponse(message: string, code?: string) {
  throw createError({
    statusCode: 400,
    message,
    data: { code }
  });
}
```

### 3. レート制限

```typescript
// middleware/rate-limit.ts
const limits = new Map<string, number[]>();

export default defineEventHandler((event) => {
  const ip = getRequestIP(event);
  const now = Date.now();
  const windowMs = 60 * 1000; // 1分
  const maxRequests = 100;
  
  const requests = limits.get(ip) || [];
  const recentRequests = requests.filter(time => now - time < windowMs);
  
  if (recentRequests.length >= maxRequests) {
    throw createError({
      statusCode: 429,
      message: 'Too many requests'
    });
  }
  
  recentRequests.push(now);
  limits.set(ip, recentRequests);
});
```

## まとめ

Nitroは、モダンなサーバーレス環境に最適化された強力なフレームワークです。主な利点:

- ユニバーサルデプロイメント
- ファイルベースの直感的なAPI設計
- TypeScriptの完全サポート
- 高度なキャッシング機能
- 豊富なプリセット

適切な設計とベストプラクティスにより、スケーラブルで保守性の高いバックエンドを構築できます。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)

---
title: 'Bun + Honoで高速Web API構築ガイド: セットアップからデプロイまで完全解説'
description: 'BunとHonoを使った高速Web API開発の完全ガイド。セットアップ、ルーティング、ミドルウェア、バリデーション、エラーハンドリング、デプロイまで実践的に解説'
pubDate: 2025-02-05
tags: ['Bun', 'Hono', 'API', 'TypeScript', 'バックエンド']
---

# Bun + Honoで高速Web API構築ガイド: セットアップからデプロイまで完全解説

BunとHonoの組み合わせは、超高速で軽量なWeb API開発を実現します。本記事では、プロジェクトのセットアップからルーティング、ミドルウェア、バリデーション、デプロイまで、実践的なAPI開発手法を徹底解説します。

## Bun + Honoの特徴

### Bunの強み

- **超高速起動**: Node.jsの3倍以上の起動速度
- **オールインワン**: ランタイム、バンドラー、パッケージマネージャー、テストランナーを統合
- **Web標準準拠**: Fetch API、WebSocket、Streams完全対応
- **TypeScript標準**: トランスパイル不要で直接実行

### Honoの強み

- **超軽量**: ~12KB（gzip圧縮時）
- **高速ルーティング**: RegExpRouterで最速クラスのパフォーマンス
- **マルチランタイム**: Bun、Deno、Node.js、Cloudflare Workers、Vercel Edge対応
- **豊富なミドルウェア**: 認証、CORS、圧縮、キャッシュなど標準提供

## プロジェクトセットアップ

### Bunのインストール

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows
powershell -c "irm bun.sh/install.ps1 | iex"

# バージョン確認
bun --version
```

### プロジェクト初期化

```bash
# プロジェクト作成
mkdir bun-hono-api
cd bun-hono-api
bun init -y

# Honoインストール
bun add hono

# 開発用依存関係
bun add -d @types/bun
```

### ディレクトリ構成

```
bun-hono-api/
├── src/
│   ├── index.ts          # エントリーポイント
│   ├── routes/           # ルート定義
│   │   ├── users.ts
│   │   └── posts.ts
│   ├── middleware/       # カスタムミドルウェア
│   │   ├── auth.ts
│   │   └── logger.ts
│   ├── validators/       # バリデーション
│   │   └── schemas.ts
│   ├── services/         # ビジネスロジック
│   │   └── userService.ts
│   └── types/            # 型定義
│       └── index.ts
├── package.json
└── tsconfig.json
```

## 基本的なAPIサーバー構築

### シンプルなサーバー

```typescript
// src/index.ts
import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => {
    return c.json({
        message: 'Welcome to Bun + Hono API',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (c) => {
    return c.json({
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

export default {
    port: 3000,
    fetch: app.fetch,
};
```

### サーバー起動

```bash
# 開発モード（ホットリロード）
bun --watch src/index.ts

# 本番モード
bun src/index.ts
```

## ルーティング設計

### RESTful APIの実装

```typescript
// src/routes/users.ts
import { Hono } from 'hono';

export const userRoutes = new Hono();

// ユーザー一覧取得
userRoutes.get('/', (c) => {
    const users = [
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' },
    ];
    return c.json(users);
});

// ユーザー詳細取得
userRoutes.get('/:id', (c) => {
    const id = c.req.param('id');
    const user = { id: parseInt(id), name: 'Alice', email: 'alice@example.com' };
    return c.json(user);
});

// ユーザー作成
userRoutes.post('/', async (c) => {
    const body = await c.req.json();
    return c.json({
        success: true,
        data: { id: 3, ...body }
    }, 201);
});

// ユーザー更新
userRoutes.put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    return c.json({
        success: true,
        data: { id: parseInt(id), ...body }
    });
});

// ユーザー削除
userRoutes.delete('/:id', (c) => {
    const id = c.req.param('id');
    return c.json({
        success: true,
        message: `User ${id} deleted`
    });
});
```

### ルートの統合

```typescript
// src/index.ts
import { Hono } from 'hono';
import { userRoutes } from './routes/users';
import { postRoutes } from './routes/posts';

const app = new Hono();

// APIバージョニング
const v1 = new Hono();

v1.route('/users', userRoutes);
v1.route('/posts', postRoutes);

app.route('/api/v1', v1);

export default {
    port: 3000,
    fetch: app.fetch,
};
```

## ミドルウェアの活用

### 標準ミドルウェア

```typescript
// src/index.ts
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import { compress } from 'hono/compress';
import { etag } from 'hono/etag';
import { timing } from 'hono/timing';

const app = new Hono();

// グローバルミドルウェア
app.use('*', logger());
app.use('*', timing());
app.use('*', prettyJSON());
app.use('*', compress());
app.use('*', etag());

// CORS設定
app.use('/api/*', cors({
    origin: ['http://localhost:3000', 'https://example.com'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 86400,
    credentials: true,
}));
```

### カスタムミドルウェア: リクエストID

```typescript
// src/middleware/requestId.ts
import { Context, Next } from 'hono';
import { v4 as uuidv4 } from 'uuid';

export const requestId = async (c: Context, next: Next) => {
    const id = uuidv4();
    c.set('requestId', id);
    c.header('X-Request-Id', id);
    await next();
};
```

### カスタムミドルウェア: レート制限

```typescript
// src/middleware/rateLimit.ts
import { Context, Next } from 'hono';

const requestCounts = new Map<string, { count: number; resetAt: number }>();

export const rateLimit = (maxRequests: number, windowMs: number) => {
    return async (c: Context, next: Next) => {
        const ip = c.req.header('x-forwarded-for') || 'unknown';
        const now = Date.now();

        const record = requestCounts.get(ip);

        if (!record || now > record.resetAt) {
            requestCounts.set(ip, {
                count: 1,
                resetAt: now + windowMs,
            });
            await next();
            return;
        }

        if (record.count >= maxRequests) {
            return c.json({
                error: 'Too many requests',
                retryAfter: Math.ceil((record.resetAt - now) / 1000)
            }, 429);
        }

        record.count++;
        await next();
    };
};
```

### カスタムミドルウェア: 認証

```typescript
// src/middleware/auth.ts
import { Context, Next } from 'hono';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const auth = async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.substring(7);

    try {
        const decoded = verify(token, JWT_SECRET);
        c.set('user', decoded);
        await next();
    } catch (error) {
        return c.json({ error: 'Invalid token' }, 401);
    }
};
```

## バリデーション

### Zodによる型安全なバリデーション

```bash
bun add zod
```

```typescript
// src/validators/schemas.ts
import { z } from 'zod';

export const createUserSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(50),
    email: z.string().email('Invalid email format'),
    age: z.number().int().positive().min(18).max(120).optional(),
    role: z.enum(['user', 'admin']).default('user'),
});

export const updateUserSchema = createUserSchema.partial();

export const querySchema = z.object({
    page: z.string().transform(Number).pipe(z.number().int().positive()).default('1'),
    limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).default('10'),
    sort: z.enum(['name', 'email', 'createdAt']).default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type QueryParams = z.infer<typeof querySchema>;
```

### バリデーションミドルウェア

```typescript
// src/middleware/validator.ts
import { Context, Next } from 'hono';
import { ZodSchema, ZodError } from 'zod';

export const validateBody = (schema: ZodSchema) => {
    return async (c: Context, next: Next) => {
        try {
            const body = await c.req.json();
            const validated = schema.parse(body);
            c.set('validatedBody', validated);
            await next();
        } catch (error) {
            if (error instanceof ZodError) {
                return c.json({
                    error: 'Validation failed',
                    details: error.errors.map(e => ({
                        field: e.path.join('.'),
                        message: e.message,
                    }))
                }, 400);
            }
            throw error;
        }
    };
};

export const validateQuery = (schema: ZodSchema) => {
    return async (c: Context, next: Next) => {
        try {
            const query = c.req.query();
            const validated = schema.parse(query);
            c.set('validatedQuery', validated);
            await next();
        } catch (error) {
            if (error instanceof ZodError) {
                return c.json({
                    error: 'Invalid query parameters',
                    details: error.errors
                }, 400);
            }
            throw error;
        }
    };
};
```

### バリデーション適用例

```typescript
// src/routes/users.ts
import { Hono } from 'hono';
import { validateBody, validateQuery } from '../middleware/validator';
import { createUserSchema, querySchema } from '../validators/schemas';

export const userRoutes = new Hono();

userRoutes.get('/', validateQuery(querySchema), (c) => {
    const query = c.get('validatedQuery');
    const { page, limit, sort, order } = query;

    // ページネーション処理
    const users = getUsersPaginated(page, limit, sort, order);

    return c.json({
        data: users,
        meta: {
            page,
            limit,
            total: 100,
            totalPages: Math.ceil(100 / limit),
        }
    });
});

userRoutes.post('/', validateBody(createUserSchema), async (c) => {
    const validated = c.get('validatedBody');

    // ユーザー作成処理
    const newUser = await createUser(validated);

    return c.json({
        success: true,
        data: newUser
    }, 201);
});
```

## エラーハンドリング

### グローバルエラーハンドラー

```typescript
// src/index.ts
import { Hono } from 'hono';

const app = new Hono();

// カスタムエラークラス
class AppError extends Error {
    constructor(
        public statusCode: number,
        public message: string,
        public details?: any
    ) {
        super(message);
    }
}

// グローバルエラーハンドラー
app.onError((err, c) => {
    console.error('Error:', err);

    if (err instanceof AppError) {
        return c.json({
            error: err.message,
            details: err.details,
        }, err.statusCode);
    }

    return c.json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    }, 500);
});

// 404ハンドラー
app.notFound((c) => {
    return c.json({
        error: 'Not Found',
        path: c.req.path,
    }, 404);
});
```

### エラー処理の実践例

```typescript
// src/routes/users.ts
userRoutes.get('/:id', async (c) => {
    const id = c.req.param('id');

    const user = await getUserById(id);

    if (!user) {
        throw new AppError(404, 'User not found', { userId: id });
    }

    return c.json(user);
});
```

## 環境変数管理

```typescript
// src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().transform(Number).default('3000'),
    JWT_SECRET: z.string().min(32),
    DATABASE_URL: z.string().url(),
    API_KEY: z.string(),
});

export const env = envSchema.parse(process.env);
```

```typescript
// .env.example
NODE_ENV=development
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
DATABASE_URL=postgres://user:pass@localhost:5432/db
API_KEY=your-api-key
```

## デプロイ

### Cloudflare Workersへのデプロイ

```bash
bun add -d wrangler
```

```toml
# wrangler.toml
name = "bun-hono-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
NODE_ENV = "production"
```

```bash
# デプロイ
bunx wrangler deploy

# ログ確認
bunx wrangler tail
```

### Dockerコンテナ化

```dockerfile
# Dockerfile
FROM oven/bun:1 as base
WORKDIR /app

# 依存関係インストール
FROM base AS install
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# ビルド
FROM base AS build
COPY --from=install /app/node_modules node_modules
COPY . .

# 本番環境
FROM base AS release
COPY --from=install /app/node_modules node_modules
COPY --from=build /app/src src
COPY --from=build /app/package.json .

USER bun
EXPOSE 3000
CMD ["bun", "src/index.ts"]
```

```bash
# ビルド
docker build -t bun-hono-api .

# 実行
docker run -p 3000:3000 bun-hono-api
```

## パフォーマンス最適化

### レスポンスキャッシュ

```typescript
// src/middleware/cache.ts
import { Context, Next } from 'hono';

const cache = new Map<string, { data: any; expiresAt: number }>();

export const cacheMiddleware = (ttl: number = 60000) => {
    return async (c: Context, next: Next) => {
        const key = c.req.url;
        const cached = cache.get(key);

        if (cached && Date.now() < cached.expiresAt) {
            return c.json(cached.data);
        }

        await next();

        const response = await c.res.clone().json();
        cache.set(key, {
            data: response,
            expiresAt: Date.now() + ttl,
        });
    };
};
```

### ストリーミングレスポンス

```typescript
app.get('/stream', (c) => {
    const stream = new ReadableStream({
        async start(controller) {
            for (let i = 0; i < 100; i++) {
                controller.enqueue(`data: ${i}\n\n`);
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            controller.close();
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
});
```

## まとめ

Bun + Honoでの高速Web API開発手法を解説しました。

### キーポイント

- **超高速**: BunとHonoの組み合わせで最高のパフォーマンス
- **型安全**: TypeScript + Zodで完全な型安全性
- **柔軟性**: マルチランタイム対応で様々な環境にデプロイ可能
- **シンプル**: 最小限の構成で強力な機能を実現

### ベストプラクティス

1. **バリデーション**: Zodで入力値を厳密に検証
2. **エラーハンドリング**: グローバルエラーハンドラーで統一的に処理
3. **ミドルウェア**: 共通処理を分離して再利用
4. **環境変数**: 機密情報を安全に管理
5. **テスト**: Bunの組み込みテストランナーで品質保証

Bun + Honoで高速かつ堅牢なWeb APIを構築しましょう。

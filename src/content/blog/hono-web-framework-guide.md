---
title: 'Hono完全ガイド — 超軽量WebフレームワークでEdge/Cloudflare Workers開発'
description: 'Honoフレームワークを完全解説。Cloudflare Workers・Node.js・Bun・Deno対応の超軽量WebフレームワークによるAPI開発。ルーティング・ミドルウェア・バリデーション・RPC・hono/jsx・デプロイまで実装例付きで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-1.jpg'
tags: ['Hono', 'Cloudflare Workers', 'TypeScript', 'Edge', 'API']
---

## はじめに

Web開発の世界では、サーバーレスやEdge Computingが急速に普及しています。その流れの中で、2022年に登場した **Hono**（炎を意味する日本語）は、Cloudflare Workersをはじめとする多様なEdgeランタイムで動作する超軽量Webフレームワークとして、世界中の開発者から注目を集めています。

GitHubスター数は2026年時点で20,000を超え、日本発のオープンソースプロジェクトとして世界規模で採用が広がっています。本記事では、Honoの全機能を実践的なTypeScriptコード例とともに徹底解説します。

---

## 1. Honoとは — Express/Fastifyとの比較・Edge対応の強み

### Honoの概要

HonoはYusuke Wada（`@yusukebe`）氏が開発した、マルチランタイム対応のWebフレームワークです。Web標準APIのみを使用して構築されているため、以下のランタイムすべてで動作します。

- **Cloudflare Workers** / **Cloudflare Pages**
- **Node.js** (v18以上)
- **Bun**
- **Deno**
- **AWS Lambda** (Lambda Web Adapter経由)
- **Vercel Edge Functions**
- **Fastly Compute**
- **Netlify Edge Functions**

### 主要フレームワーク比較

| 項目 | Hono | Express | Fastify | Next.js API Routes |
|------|------|---------|---------|-------------------|
| バンドルサイズ | **~14KB** | ~60KB | ~30KB | 大 |
| Edge対応 | **完全対応** | 非対応 | 非対応 | 一部対応 |
| TypeScript | **ファーストクラス** | 外部型定義 | 一部対応 | 対応 |
| RPC機能 | **あり** | なし | なし | なし |
| JSX/SSR | **あり** | なし | なし | あり |
| ベンチマーク速度 | **最速クラス** | 遅い | 速い | 中 |
| Web標準準拠 | **完全** | 非準拠 | 非準拠 | 一部 |

### なぜHonoがEdgeで強いのか

ExpressやFastifyは`http`や`net`といったNode.js専用モジュールに依存しているため、Cloudflare WorkersやBunのEdge環境では動作しません。Honoは**Web標準のRequest/Response API**のみを使用しているため、どのランタイムでも同じコードが動作します。

```typescript
// Web標準APIのみ使用 — どのランタイムでも動く
app.get('/hello', (c) => {
  return c.json({ message: 'Hello from Edge!' });
});
```

### パフォーマンスの優位性

HonoはRadix Treeベースのルーターを内部に持ち、ルーティング処理が極めて高速です。特に`RegExpRouter`と`SmartRouter`という最適化されたルーターを組み合わせることで、大量のルート定義がある場合でもパフォーマンスが劣化しません。

---

## 2. セットアップ（Cloudflare Workers・Node.js・Bun）

### Cloudflare Workersでのセットアップ

```bash
# Cloudflare Workers用プロジェクト作成
npm create cloudflare@latest my-hono-app -- --template hono

cd my-hono-app
npm install
```

生成されるプロジェクト構造：

```
my-hono-app/
├── src/
│   └── index.ts        # メインエントリポイント
├── wrangler.toml        # Cloudflare Workers設定
├── package.json
└── tsconfig.json
```

`wrangler.toml` の基本設定：

```toml
name = "my-hono-app"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
MY_VAR = "hello"

[[kv_namespaces]]
binding = "MY_KV"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

`src/index.ts` の初期コード：

```typescript
import { Hono } from 'hono';

type Bindings = {
  MY_KV: KVNamespace;
  MY_VAR: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/', (c) => {
  return c.text('Hello Hono on Cloudflare Workers!');
});

export default app;
```

### Node.jsでのセットアップ

```bash
mkdir hono-node-app && cd hono-node-app
npm init -y
npm install hono @hono/node-server
npm install -D typescript @types/node ts-node
```

`src/index.ts`:

```typescript
import { Hono } from 'hono';
import { serve } from '@hono/node-server';

const app = new Hono();

app.get('/', (c) => {
  return c.json({ message: 'Hello Hono on Node.js!' });
});

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
```

起動コマンド：

```bash
npx ts-node src/index.ts
# または
npx tsx src/index.ts
```

### Bunでのセットアップ

```bash
bun create hono my-bun-app
cd my-bun-app
bun install
```

`src/index.ts`:

```typescript
import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => {
  return c.json({ message: 'Hello Hono on Bun!' });
});

export default {
  port: 3000,
  fetch: app.fetch,
};
```

```bash
bun run src/index.ts
```

### Denoでのセットアップ

`main.ts`:

```typescript
import { Hono } from 'npm:hono';
import { serve } from 'https://deno.land/std/http/server.ts';

const app = new Hono();

app.get('/', (c) => {
  return c.json({ message: 'Hello Hono on Deno!' });
});

Deno.serve(app.fetch);
```

```bash
deno run --allow-net main.ts
```

---

## 3. ルーティング（get/post/put/delete・パラメータ・ワイルドカード）

### 基本ルーティング

Honoはすべての主要HTTPメソッドをサポートしています。

```typescript
import { Hono } from 'hono';

const app = new Hono();

// 基本的なルート定義
app.get('/users', (c) => c.json({ users: [] }));
app.post('/users', (c) => c.json({ message: 'Created' }, 201));
app.put('/users/:id', (c) => c.json({ message: 'Updated' }));
app.patch('/users/:id', (c) => c.json({ message: 'Patched' }));
app.delete('/users/:id', (c) => c.json({ message: 'Deleted' }));

// 全メソッド対応
app.all('/health', (c) => c.json({ status: 'ok' }));

// 複数メソッド同時定義
app.on(['GET', 'POST'], '/multi', (c) => {
  return c.json({ method: c.req.method });
});
```

### パスパラメータ

```typescript
// 単一パラメータ
app.get('/users/:id', (c) => {
  const id = c.req.param('id');
  return c.json({ id });
});

// 複数パラメータ
app.get('/posts/:postId/comments/:commentId', (c) => {
  const { postId, commentId } = c.req.param();
  return c.json({ postId, commentId });
});

// オプショナルパラメータ
app.get('/files/:path{.+}', (c) => {
  const path = c.req.param('path');
  return c.json({ path });
});
```

### クエリパラメータ

```typescript
app.get('/search', (c) => {
  const query = c.req.query('q');
  const page = c.req.query('page') ?? '1';
  const limit = c.req.query('limit') ?? '10';

  // 全クエリパラメータを取得
  const allQueries = c.req.queries();

  return c.json({
    query,
    page: parseInt(page),
    limit: parseInt(limit),
    all: allQueries,
  });
});
```

### ワイルドカードルート

```typescript
// ワイルドカード（任意のパスにマッチ）
app.get('/static/*', (c) => {
  const path = c.req.path;
  return c.text(`Static file: ${path}`);
});

// 正規表現ルート
app.get('/posts/:id{[0-9]+}', (c) => {
  const id = c.req.param('id');
  return c.json({ id: parseInt(id) });
});
```

### ルートグループ（basePath）

```typescript
const api = new Hono().basePath('/api');

const v1 = new Hono();
v1.get('/users', (c) => c.json({ version: 'v1', users: [] }));
v1.get('/posts', (c) => c.json({ version: 'v1', posts: [] }));

const v2 = new Hono();
v2.get('/users', (c) => c.json({ version: 'v2', users: [] }));

api.route('/v1', v1);
api.route('/v2', v2);

// 結果: /api/v1/users, /api/v1/posts, /api/v2/users
app.route('/', api);
```

### リクエストボディの取得

```typescript
app.post('/data', async (c) => {
  // JSON
  const body = await c.req.json<{ name: string; email: string }>();

  // フォームデータ
  const formData = await c.req.parseBody();
  const name = formData['name'] as string;

  // テキスト
  const text = await c.req.text();

  // ArrayBuffer
  const buffer = await c.req.arrayBuffer();

  return c.json({ received: body });
});
```

---

## 4. ミドルウェア（組み込みミドルウェア・カスタム作成）

### 組み込みミドルウェア

Honoには豊富な組み込みミドルウェアが含まれています。

```typescript
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { compress } from 'hono/compress';
import { cache } from 'hono/cache';
import { etag } from 'hono/etag';
import { requestId } from 'hono/request-id';
import { timing } from 'hono/timing';
import { poweredBy } from 'hono/powered-by';

const app = new Hono();

// ロガー（リクエスト/レスポンスのログ出力）
app.use('*', logger());

// レスポンスのJSON整形（?pretty クエリで有効化）
app.use('*', prettyJSON());

// Gzip/Brotli圧縮
app.use('*', compress());

// ETagによるキャッシュ制御
app.use('*', etag());

// リクエストIDの自動付与
app.use('*', requestId());

// サーバータイミングAPI
app.use('*', timing());

// X-Powered-Byヘッダー
app.use('*', poweredBy());

// キャッシュ（Cloudflare Cache API）
app.use('/static/*', cache({
  cacheName: 'my-cache',
  cacheControl: 'max-age=3600',
}));

app.get('/', (c) => c.json({ message: 'Hello!' }));
```

### ミドルウェアの適用範囲

```typescript
const app = new Hono();

// 全ルートに適用
app.use('*', logger());

// 特定パスのみに適用
app.use('/api/*', someMiddleware());

// 特定ルートの前にのみ適用
app.use('/admin/*', authMiddleware());
app.get('/admin/dashboard', (c) => c.json({ dashboard: 'data' }));

// ルート定義内でインライン適用
app.get('/protected', authMiddleware(), (c) => {
  return c.json({ secret: 'data' });
});
```

### カスタムミドルウェアの作成

```typescript
import { createMiddleware } from 'hono/factory';

// 型安全なカスタムミドルウェア
const customLogger = createMiddleware(async (c, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${c.req.method} ${c.req.path}`);

  await next();

  const elapsed = Date.now() - start;
  console.log(`  -> ${c.res.status} (${elapsed}ms)`);
});

// コンテキスト変数を設定するミドルウェア
type Variables = {
  userId: string;
  userRole: 'admin' | 'user';
};

const app = new Hono<{ Variables: Variables }>();

const extractUser = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  // ヘッダーからユーザー情報を取得（実際はJWT検証など）
  const userId = c.req.header('X-User-Id') ?? 'anonymous';
  const userRole = c.req.header('X-User-Role') as 'admin' | 'user' ?? 'user';

  c.set('userId', userId);
  c.set('userRole', userRole);

  await next();
});

app.use('*', customLogger);
app.use('/api/*', extractUser);

app.get('/api/profile', (c) => {
  const userId = c.get('userId');
  const userRole = c.get('userRole');
  return c.json({ userId, userRole });
});
```

### エラーハンドリングミドルウェア

```typescript
import { HTTPException } from 'hono/http-exception';

const app = new Hono();

// グローバルエラーハンドラー
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  console.error('Unhandled error:', err);
  return c.json(
    {
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    },
    500
  );
});

// 404ハンドラー
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      path: c.req.path,
    },
    404
  );
});

// HTTPExceptionのスロー
app.get('/resource/:id', async (c) => {
  const id = c.req.param('id');
  const resource = await findResource(id);

  if (!resource) {
    throw new HTTPException(404, {
      message: `Resource with id ${id} not found`,
    });
  }

  return c.json(resource);
});

async function findResource(id: string) {
  // DB検索の模擬
  return null;
}
```

---

## 5. Zod Validatorミドルウェア（リクエストバリデーション）

### セットアップ

```bash
npm install hono zod @hono/zod-validator
```

### 基本的なバリデーション

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono();

// ユーザー作成のスキーマ定義
const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email format'),
  age: z.number().int().min(0).max(150).optional(),
  role: z.enum(['admin', 'user', 'moderator']).default('user'),
});

// JSONボディのバリデーション
app.post(
  '/users',
  zValidator('json', createUserSchema),
  async (c) => {
    const data = c.req.valid('json');
    // data は型安全: { name: string; email: string; age?: number; role: 'admin' | 'user' | 'moderator' }

    const newUser = await createUser(data);
    return c.json(newUser, 201);
  }
);

async function createUser(data: z.infer<typeof createUserSchema>) {
  return { id: '123', ...data };
}
```

### クエリパラメータのバリデーション

```typescript
const searchSchema = z.object({
  q: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['asc', 'desc']).default('asc'),
  category: z.string().optional(),
});

app.get(
  '/search',
  zValidator('query', searchSchema),
  (c) => {
    const { q, page, limit, sort, category } = c.req.valid('query');

    return c.json({
      query: q,
      pagination: { page, limit },
      sort,
      category,
    });
  }
);
```

### パスパラメータのバリデーション

```typescript
const userIdSchema = z.object({
  id: z.string().uuid('Invalid UUID format'),
});

app.get(
  '/users/:id',
  zValidator('param', userIdSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const user = await getUserById(id);

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json(user);
  }
);

async function getUserById(id: string) {
  return { id, name: 'Alice', email: 'alice@example.com' };
}
```

### カスタムエラーレスポンス

```typescript
app.post(
  '/products',
  zValidator('json', z.object({
    name: z.string().min(1),
    price: z.number().positive(),
    stock: z.number().int().min(0),
  }), (result, c) => {
    if (!result.success) {
      const errors = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return c.json(
        {
          error: 'Validation failed',
          details: errors,
        },
        422
      );
    }
  }),
  (c) => {
    const product = c.req.valid('json');
    return c.json({ id: 'prod_123', ...product }, 201);
  }
);
```

### 複合バリデーション

```typescript
const updatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(10).optional(),
  tags: z.array(z.string()).max(10).optional(),
  published: z.boolean().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided' }
);

app.patch(
  '/posts/:id',
  zValidator('param', z.object({ id: z.string() })),
  zValidator('json', updatePostSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const updates = c.req.valid('json');

    return c.json({ id, ...updates, updatedAt: new Date().toISOString() });
  }
);
```

---

## 6. JWT認証ミドルウェア

### セットアップとJWT検証

```bash
npm install hono
# hono/jwt は組み込み — 追加インストール不要
```

```typescript
import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import { sign, verify } from 'hono/jwt';

type JWTPayload = {
  sub: string;
  role: string;
  iat: number;
  exp: number;
};

type Variables = {
  jwtPayload: JWTPayload;
};

const app = new Hono<{ Variables: Variables }>();

const JWT_SECRET = process.env.JWT_SECRET ?? 'your-secret-key';

// ログインエンドポイント — JWTトークン発行
app.post('/auth/login', async (c) => {
  const { email, password } = await c.req.json<{
    email: string;
    password: string;
  }>();

  // 実際はDB検証を行う
  const user = await authenticateUser(email, password);
  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const now = Math.floor(Date.now() / 1000);
  const payload: JWTPayload = {
    sub: user.id,
    role: user.role,
    iat: now,
    exp: now + 60 * 60 * 24, // 24時間有効
  };

  const token = await sign(payload, JWT_SECRET);

  return c.json({ token, expiresIn: 86400 });
});

// JWT検証ミドルウェアを保護ルートに適用
app.use(
  '/api/*',
  jwt({
    secret: JWT_SECRET,
    alg: 'HS256',
  })
);

// 保護されたエンドポイント
app.get('/api/me', (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  return c.json({
    userId: payload.sub,
    role: payload.role,
  });
});

// ロールベースアクセス制御（RBAC）
const requireAdmin = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  const payload = c.get('jwtPayload') as JWTPayload;

  if (payload.role !== 'admin') {
    return c.json({ error: 'Admin access required' }, 403);
  }

  await next();
});

app.get('/api/admin/users', requireAdmin, async (c) => {
  return c.json({ users: [] });
});

async function authenticateUser(email: string, password: string) {
  // 模擬認証
  if (email === 'admin@example.com' && password === 'secret') {
    return { id: 'user_1', role: 'admin' };
  }
  return null;
}

import { createMiddleware } from 'hono/factory';
```

### リフレッシュトークン実装

```typescript
// リフレッシュトークン用エンドポイント
app.post('/auth/refresh', async (c) => {
  const { refreshToken } = await c.req.json<{ refreshToken: string }>();

  let payload: JWTPayload;
  try {
    payload = await verify(refreshToken, JWT_SECRET + '-refresh') as JWTPayload;
  } catch {
    return c.json({ error: 'Invalid refresh token' }, 401);
  }

  const now = Math.floor(Date.now() / 1000);
  const newPayload: JWTPayload = {
    sub: payload.sub,
    role: payload.role,
    iat: now,
    exp: now + 60 * 60 * 24,
  };

  const newAccessToken = await sign(newPayload, JWT_SECRET);

  return c.json({ token: newAccessToken });
});
```

---

## 7. CORS・セキュリティヘッダー設定

### CORS設定

```typescript
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';

const app = new Hono();

// 基本的なCORS設定
app.use(
  '/api/*',
  cors({
    origin: ['https://myapp.com', 'https://staging.myapp.com'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposeHeaders: ['X-Total-Count', 'X-Page'],
    maxAge: 86400,
    credentials: true,
  })
);

// 開発環境では全オリジン許可
if (process.env.NODE_ENV === 'development') {
  app.use('*', cors());
}

// 動的オリジン検証
app.use(
  '*',
  cors({
    origin: (origin, c) => {
      const allowedPatterns = [
        /^https:\/\/.*\.myapp\.com$/,
        /^http:\/\/localhost:\d+$/,
      ];

      if (allowedPatterns.some((pattern) => pattern.test(origin))) {
        return origin;
      }

      return 'https://myapp.com'; // デフォルトオリジン
    },
  })
);
```

### セキュリティヘッダー

```typescript
// secureHeaders — 主要セキュリティヘッダーを自動付与
app.use(
  '*',
  secureHeaders({
    // Content-Security-Policy
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.myapp.com'],
    },
    // その他のセキュリティヘッダー
    xFrameOptions: 'DENY',
    xContentTypeOptions: 'nosniff',
    referrerPolicy: 'strict-origin-when-cross-origin',
    strictTransportSecurity: 'max-age=31536000; includeSubDomains',
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: [],
    },
  })
);
```

### レートリミット

```typescript
import { rateLimiter } from 'hono-rate-limiter';

// IPベースのレートリミット（hono-rate-limiter使用）
app.use(
  '/api/*',
  rateLimiter({
    windowMs: 15 * 60 * 1000, // 15分
    limit: 100, // 100リクエストまで
    standardHeaders: 'draft-6',
    keyGenerator: (c) => {
      // IPアドレスをキーに使用
      return c.req.header('CF-Connecting-IP') ??
        c.req.header('X-Forwarded-For') ??
        'unknown';
    },
    handler: (c) => {
      return c.json(
        {
          error: 'Too Many Requests',
          retryAfter: 900,
        },
        429
      );
    },
  })
);
```

---

## 8. hono/jsx（JSXテンプレート・SSR）

HonoはJSXをサポートしており、サーバーサイドレンダリング（SSR）が可能です。Reactライブラリなしで軽量なHTMLレンダリングが行えます。

### 基本セットアップ

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx"
  }
}
```

### JSXコンポーネント

```tsx
/** @jsxImportSource hono/jsx */
import { Hono } from 'hono';
import { html } from 'hono/html';

const app = new Hono();

// 関数コンポーネント
const Layout = ({ title, children }: { title: string; children: any }) => (
  <html lang="ja">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>{title}</title>
      <link rel="stylesheet" href="/static/style.css" />
    </head>
    <body>
      <header>
        <nav>
          <a href="/">ホーム</a>
          <a href="/about">About</a>
        </nav>
      </header>
      <main>{children}</main>
      <footer>
        <p>&copy; 2026 My App</p>
      </footer>
    </body>
  </html>
);

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

const UserCard = ({ user }: { user: User }) => (
  <div class="user-card">
    <h3>{user.name}</h3>
    <p>
      <a href={`mailto:${user.email}`}>{user.email}</a>
    </p>
    <span class={`badge badge-${user.role}`}>{user.role}</span>
  </div>
);

const UserListPage = ({ users }: { users: User[] }) => (
  <Layout title="ユーザー一覧">
    <h1>ユーザー一覧</h1>
    <div class="user-grid">
      {users.map((user) => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  </Layout>
);

app.get('/users', async (c) => {
  const users: User[] = [
    { id: '1', name: 'Alice', email: 'alice@example.com', role: 'admin' },
    { id: '2', name: 'Bob', email: 'bob@example.com', role: 'user' },
  ];

  return c.html(<UserListPage users={users} />);
});
```

### フォーム処理

```tsx
/** @jsxImportSource hono/jsx */

const ContactForm = ({ error }: { error?: string }) => (
  <Layout title="お問い合わせ">
    <h1>お問い合わせ</h1>
    {error && <div class="error-message">{error}</div>}
    <form method="POST" action="/contact">
      <div class="form-group">
        <label for="name">名前</label>
        <input type="text" id="name" name="name" required />
      </div>
      <div class="form-group">
        <label for="email">メールアドレス</label>
        <input type="email" id="email" name="email" required />
      </div>
      <div class="form-group">
        <label for="message">メッセージ</label>
        <textarea id="message" name="message" rows={5} required></textarea>
      </div>
      <button type="submit">送信</button>
    </form>
  </Layout>
);

app.get('/contact', (c) => c.html(<ContactForm />));

app.post('/contact', async (c) => {
  const body = await c.req.parseBody();
  const { name, email, message } = body as {
    name: string;
    email: string;
    message: string;
  };

  if (!name || !email || !message) {
    return c.html(<ContactForm error="すべての項目を入力してください" />, 422);
  }

  // メール送信処理など
  await sendEmail({ name, email, message });

  return c.redirect('/contact/thanks');
});

async function sendEmail(data: { name: string; email: string; message: string }) {
  console.log('Sending email:', data);
}
```

---

## 9. RPC機能（hono/client・型安全なAPI呼び出し）

HonoのRPC機能は、サーバーとクライアントで型を共有できる強力な機能です。tRPCに似た開発体験を、より軽量な形で提供します。

### サーバー側の実装

```typescript
// server.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const postsRoute = new Hono()
  .get('/', (c) => {
    return c.json({
      posts: [
        { id: '1', title: 'First Post', published: true },
        { id: '2', title: 'Second Post', published: false },
      ],
    });
  })
  .post(
    '/',
    zValidator(
      'json',
      z.object({
        title: z.string().min(1),
        content: z.string().min(10),
        published: z.boolean().default(false),
      })
    ),
    async (c) => {
      const data = c.req.valid('json');
      const newPost = {
        id: Math.random().toString(36).slice(2),
        ...data,
        createdAt: new Date().toISOString(),
      };
      return c.json(newPost, 201);
    }
  )
  .get('/:id', (c) => {
    const id = c.req.param('id');
    return c.json({
      id,
      title: 'Sample Post',
      content: 'Content here...',
      published: true,
    });
  });

const app = new Hono().route('/posts', postsRoute);

// 型エクスポート — クライアントで使用
export type AppType = typeof app;

export default app;
```

### クライアント側の実装

```typescript
// client.ts
import { hc } from 'hono/client';
import type { AppType } from './server';

// 型安全なクライアントの作成
const client = hc<AppType>('https://api.myapp.com');

// 完全な型補完が効く！
async function fetchPosts() {
  const res = await client.posts.$get();
  const data = await res.json();
  // data.posts は自動的に正しい型が付く
  console.log(data.posts);
}

async function createPost() {
  const res = await client.posts.$post({
    json: {
      title: 'New Post',
      content: 'This is the content of the new post.',
      published: true,
    },
  });

  if (res.ok) {
    const post = await res.json();
    console.log('Created:', post);
  }
}

async function getPost(id: string) {
  const res = await client.posts[':id'].$get({
    param: { id },
  });
  const post = await res.json();
  return post;
}
```

### Reactとの統合

```tsx
// hooks/usePosts.ts
import { hc } from 'hono/client';
import type { AppType } from '../server';

const client = hc<AppType>(import.meta.env.VITE_API_URL);

export function usePosts() {
  const [posts, setPosts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetchPosts = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.posts.$get();
      const data = await res.json();
      setPosts(data.posts);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return { posts, loading, refetch: fetchPosts };
}
```

---

## 10. ストリーミングレスポンス（streamText・streamSSE）

### テキストストリーミング

```typescript
import { stream, streamText, streamSSE } from 'hono/streaming';

const app = new Hono();

// 基本的なストリーミング
app.get('/stream', (c) => {
  return stream(c, async (stream) => {
    stream.onAbort(() => {
      console.log('Stream aborted by client');
    });

    for (let i = 0; i < 10; i++) {
      await stream.write(`data chunk ${i}\n`);
      await stream.sleep(500); // 0.5秒待機
    }
  });
});

// テキストストリーミング（Content-Type: text/plain）
app.get('/stream/text', (c) => {
  return streamText(c, async (stream) => {
    const words = ['Hello', ' ', 'World', '!', ' This', ' is', ' streaming.'];
    for (const word of words) {
      await stream.write(word);
      await stream.sleep(200);
    }
  });
});
```

### Server-Sent Events（SSE）

```typescript
// SSEエンドポイント
app.get('/events', (c) => {
  return streamSSE(c, async (stream) => {
    let count = 0;

    // クライアントが切断されるまでイベントを送信
    while (true) {
      const event = {
        type: 'update',
        data: {
          count,
          timestamp: new Date().toISOString(),
          value: Math.random() * 100,
        },
      };

      await stream.writeSSE({
        event: 'update',
        data: JSON.stringify(event.data),
        id: count.toString(),
      });

      count++;
      await stream.sleep(1000); // 1秒ごとに送信
    }
  });
});

// LLMレスポンスのストリーミング（OpenAI APIとの組み合わせ例）
app.post('/chat/stream', async (c) => {
  const { message } = await c.req.json<{ message: string }>();

  return streamText(c, async (stream) => {
    // OpenAI streaming response のシミュレーション
    const tokens = `あなたのメッセージ「${message}」を受け取りました。`.split('');

    for (const token of tokens) {
      await stream.write(token);
      await stream.sleep(50);
    }
  });
});

// クライアントサイドでのSSE受信
/*
const eventSource = new EventSource('/events');

eventSource.addEventListener('update', (e) => {
  const data = JSON.parse(e.data);
  console.log('Received:', data);
});

eventSource.onerror = () => {
  eventSource.close();
};
*/
```

---

## 11. Cloudflare Workers KV・D1・R2連携

### KV（Key-Value Store）

```typescript
import { Hono } from 'hono';

type Bindings = {
  CACHE: KVNamespace;
  SESSION: KVNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

// KVへの読み書き
app.get('/cache/:key', async (c) => {
  const key = c.req.param('key');
  const value = await c.env.CACHE.get(key);

  if (!value) {
    return c.json({ error: 'Key not found' }, 404);
  }

  return c.json({ key, value });
});

app.put('/cache/:key', async (c) => {
  const key = c.req.param('key');
  const { value, ttl } = await c.req.json<{ value: string; ttl?: number }>();

  await c.env.CACHE.put(key, value, {
    expirationTtl: ttl ?? 3600, // デフォルト1時間
  });

  return c.json({ message: 'Cached successfully' });
});

// JSONオブジェクトの保存
app.post('/sessions', async (c) => {
  const sessionData = await c.req.json();
  const sessionId = crypto.randomUUID();

  await c.env.SESSION.put(
    `session:${sessionId}`,
    JSON.stringify(sessionData),
    { expirationTtl: 86400 } // 24時間
  );

  return c.json({ sessionId }, 201);
});

app.get('/sessions/:id', async (c) => {
  const id = c.req.param('id');
  const data = await c.env.SESSION.get(`session:${id}`, 'json');

  if (!data) {
    return c.json({ error: 'Session not found' }, 404);
  }

  return c.json(data);
});
```

### D1（SQLiteデータベース）

```typescript
type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// テーブル初期化
app.get('/setup', async (c) => {
  await c.env.DB.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      user_id TEXT NOT NULL,
      published INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  return c.json({ message: 'Database initialized' });
});

// ユーザー一覧取得
app.get('/users', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM users ORDER BY created_at DESC LIMIT 20'
  ).all<{ id: string; name: string; email: string; created_at: string }>();

  return c.json({ users: results });
});

// ユーザー作成
app.post('/users', async (c) => {
  const { name, email } = await c.req.json<{ name: string; email: string }>();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    'INSERT INTO users (id, name, email, created_at) VALUES (?, ?, ?, ?)'
  )
    .bind(id, name, email, now)
    .run();

  return c.json({ id, name, email, created_at: now }, 201);
});

// ユーザーの投稿一覧（JOIN）
app.get('/users/:id/posts', async (c) => {
  const userId = c.req.param('id');

  const { results } = await c.env.DB.prepare(`
    SELECT p.*, u.name as author_name
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC
  `)
    .bind(userId)
    .all();

  return c.json({ posts: results });
});

// トランザクション
app.post('/posts', async (c) => {
  const { title, content, userId } = await c.req.json<{
    title: string;
    content: string;
    userId: string;
  }>();

  const postId = crypto.randomUUID();
  const now = new Date().toISOString();

  // バッチ実行（トランザクション的）
  const results = await c.env.DB.batch([
    c.env.DB.prepare(
      'INSERT INTO posts (id, title, content, user_id, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(postId, title, content, userId, now),
    c.env.DB.prepare(
      'UPDATE users SET post_count = post_count + 1 WHERE id = ?'
    ).bind(userId),
  ]);

  return c.json({ id: postId, title, content, userId }, 201);
});
```

### R2（オブジェクトストレージ）

```typescript
type Bindings = {
  BUCKET: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

// ファイルアップロード
app.post('/upload', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return c.json({ error: 'No file provided' }, 400);
  }

  const key = `uploads/${Date.now()}-${file.name}`;
  const buffer = await file.arrayBuffer();

  await c.env.BUCKET.put(key, buffer, {
    httpMetadata: {
      contentType: file.type,
    },
    customMetadata: {
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
    },
  });

  return c.json({
    key,
    size: file.size,
    contentType: file.type,
    url: `https://files.myapp.com/${key}`,
  }, 201);
});

// ファイルダウンロード
app.get('/files/:key{.+}', async (c) => {
  const key = c.req.param('key');
  const object = await c.env.BUCKET.get(key);

  if (!object) {
    return c.json({ error: 'File not found' }, 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);

  return new Response(object.body, { headers });
});

// ファイル削除
app.delete('/files/:key{.+}', async (c) => {
  const key = c.req.param('key');
  await c.env.BUCKET.delete(key);
  return c.json({ message: 'File deleted' });
});

// ファイル一覧
app.get('/files', async (c) => {
  const prefix = c.req.query('prefix') ?? '';
  const list = await c.env.BUCKET.list({ prefix, limit: 100 });

  return c.json({
    objects: list.objects.map((obj) => ({
      key: obj.key,
      size: obj.size,
      lastModified: obj.uploaded.toISOString(),
    })),
    truncated: list.truncated,
  });
});
```

---

## 12. テスト（@hono/testing・Vitest）

### テスト環境のセットアップ

```bash
npm install -D vitest @hono/testing
```

`vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
    },
  },
});
```

### 基本的なAPIテスト

```typescript
// src/app.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

export const app = new Hono();

const users = new Map<string, { id: string; name: string; email: string }>();

app.get('/users', (c) => {
  return c.json({ users: Array.from(users.values()) });
});

app.post(
  '/users',
  zValidator(
    'json',
    z.object({
      name: z.string().min(1),
      email: z.string().email(),
    })
  ),
  (c) => {
    const { name, email } = c.req.valid('json');
    const id = crypto.randomUUID();
    const user = { id, name, email };
    users.set(id, user);
    return c.json(user, 201);
  }
);

app.get('/users/:id', (c) => {
  const id = c.req.param('id');
  const user = users.get(id);

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json(user);
});

export default app;
```

```typescript
// src/app.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import app from './app';

describe('Users API', () => {
  // 各テスト前にアプリをリセット
  beforeEach(() => {
    // 実際のアプリではDBのクリアなどを行う
  });

  describe('GET /users', () => {
    it('should return empty array initially', async () => {
      const res = await app.request('/users');

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toHaveProperty('users');
      expect(Array.isArray(body.users)).toBe(true);
    });
  });

  describe('POST /users', () => {
    it('should create a new user with valid data', async () => {
      const res = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Alice Smith',
          email: 'alice@example.com',
        }),
      });

      expect(res.status).toBe(201);

      const user = await res.json();
      expect(user).toMatchObject({
        name: 'Alice Smith',
        email: 'alice@example.com',
      });
      expect(user.id).toBeDefined();
    });

    it('should return 400 for invalid email', async () => {
      const res = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Bob',
          email: 'not-an-email',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should return 400 for empty name', async () => {
      const res = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '',
          email: 'valid@example.com',
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /users/:id', () => {
    it('should return 404 for non-existent user', async () => {
      const res = await app.request('/users/non-existent-id');

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('User not found');
    });
  });
});
```

### ミドルウェアのテスト

```typescript
// middleware.test.ts
import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import { sign } from 'hono/jwt';

describe('JWT Middleware', () => {
  const SECRET = 'test-secret';

  const app = new Hono();
  app.use('/protected/*', jwt({ secret: SECRET }));
  app.get('/protected/resource', (c) => c.json({ data: 'secret' }));

  it('should reject requests without token', async () => {
    const res = await app.request('/protected/resource');
    expect(res.status).toBe(401);
  });

  it('should reject requests with invalid token', async () => {
    const res = await app.request('/protected/resource', {
      headers: { Authorization: 'Bearer invalid.token.here' },
    });
    expect(res.status).toBe(401);
  });

  it('should allow requests with valid token', async () => {
    const payload = {
      sub: 'user_1',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = await sign(payload, SECRET);

    const res = await app.request('/protected/resource', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBe('secret');
  });
});
```

### カバレッジ付きでテスト実行

```bash
# テスト実行
npx vitest run

# ウォッチモード
npx vitest

# カバレッジ付きで実行
npx vitest run --coverage
```

---

## 13. Vercel・Cloudflare Workers・Fly.io デプロイ

### Cloudflare Workersへのデプロイ

```bash
# Wrangler CLIのインストール（未インストールの場合）
npm install -D wrangler

# ローカル開発サーバー起動
npx wrangler dev

# 本番環境へのデプロイ
npx wrangler deploy

# 環境変数（シークレット）の設定
npx wrangler secret put JWT_SECRET
```

`wrangler.toml` の本番設定：

```toml
name = "my-hono-api"
main = "src/index.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[vars]
APP_ENV = "production"
APP_VERSION = "1.0.0"

# KV Namespaces
[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-id-here"

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "your-d1-id-here"

# R2 Bucket
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "my-bucket"

# 本番環境固有設定
[env.production]
name = "my-hono-api-production"

# ステージング環境
[env.staging]
name = "my-hono-api-staging"
```

デプロイ後の確認：

```bash
# ログをリアルタイムで確認
npx wrangler tail

# 特定環境へのデプロイ
npx wrangler deploy --env production
```

### Vercel Edge Functionsへのデプロイ

```bash
npm install @hono/vercel
npm install -D vercel
```

`api/index.ts`:

```typescript
import { Hono } from 'hono';
import { handle } from '@hono/vercel';

export const config = {
  runtime: 'edge',
};

const app = new Hono().basePath('/api');

app.get('/hello', (c) => c.json({ message: 'Hello from Vercel Edge!' }));
app.get('/time', (c) => c.json({ time: new Date().toISOString() }));

export default handle(app);
```

`vercel.json`:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api" }
  ]
}
```

デプロイ：

```bash
# Vercel CLIでデプロイ
npx vercel deploy --prod
```

### Fly.ioへのデプロイ（Node.js）

```bash
# Fly CLIのインストールとサインイン
brew install flyctl
flyctl auth login

# アプリの初期化
flyctl launch
```

`Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

`fly.toml`:

```toml
app = "my-hono-app"
primary_region = "nrt"  # 東京リージョン

[build]

[env]
NODE_ENV = "production"
PORT = "3000"

[http_service]
internal_port = 3000
force_https = true
auto_stop_machines = true
auto_start_machines = true
min_machines_running = 0

[[vm]]
memory = "256mb"
cpu_kind = "shared"
cpus = 1
```

デプロイ：

```bash
# 本番環境へのデプロイ
flyctl deploy

# スケールアップ
flyctl scale count 3

# ログ確認
flyctl logs
```

### GitHub Actionsによる自動デプロイ

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Workers

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
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm test
      - run: npm run type-check

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

---

## まとめ — Honoを使うべき理由

Honoは現代のWeb開発において、以下の理由から特に優れた選択肢です。

**1. マルチランタイム対応の真の意味**
一度書いたコードが、Cloudflare Workers・Node.js・Bun・Denoのどれでも動作します。ランタイムを乗り換えても、コアロジックの書き直しが不要です。

**2. TypeScriptファーストの設計**
型推論が非常に優れており、ミドルウェアで設定したContext変数の型もエンドポイント内で正確に補完されます。`hono/client`のRPC機能を使えば、フロントエンドとバックエンドで型を安全に共有できます。

**3. Edgeコンピューティングへの最適化**
バンドルサイズが14KBという軽量さは、Cold Start時間が課題となるEdge環境では大きなアドバンテージです。Cloudflare Workers上では世界中のPoPで低レイテンシを実現できます。

**4. 充実したエコシステム**
Zod Validator・JWT・CORS・SSEなど、本番運用に必要なミドルウェアが揃っています。サードパーティのミドルウェアも豊富に存在します。

**5. 優れた開発体験**
`app.request()`メソッドによるテストが非常に書きやすく、Vitestとの組み合わせで高速なユニットテストが実現できます。

---

## APIレスポンスのデバッグに DevToolBox

Honoで構築したAPIのレスポンスをデバッグする際は、**[DevToolBox](https://usedevtools.com/)** が役立ちます。

DevToolBoxはブラウザ上で動作するJSON整形・バリデーションツールで、HonoのAPIレスポンスをそのままペーストして構造を確認したり、スキーマとのバリデーションを行うことができます。また、cURLコマンドの生成・JWT Payloadのデコードなど、API開発に必要なツールが一式揃っています。

Cloudflare Workersにデプロイしたホットなエンドポイントのレスポンスを素早く検証したいときに、インストール不要で即座に使えるのが大きな利点です。ぜひ日々のHono開発に役立ててみてください。

---

## 参考リンク

- [Hono 公式ドキュメント](https://hono.dev/)
- [Hono GitHub リポジトリ](https://github.com/honojs/hono)
- [Cloudflare Workers ドキュメント](https://developers.cloudflare.com/workers/)
- [hono/client RPC ガイド](https://hono.dev/docs/guides/rpc)
- [Zod バリデーション](https://zod.dev/)
- [DevToolBox — API開発ツール](https://usedevtools.com/)

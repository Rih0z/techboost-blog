---
title: "REST API設計ベストプラクティス2026"
description: "2026年版REST API設計のベストプラクティスを体系的に解説。URL設計の6原則、HTTPステータスコードの使い分け、JWT/OAuth認証の実装、バージョニング戦略、OpenAPI定義、Zod/Honoでの型安全な実装例まで網羅します。"
pubDate: "2026-03-06"
tags: ['API', 'バックエンド', 'TypeScript', 'career']
heroImage: '../../assets/thumbnails/rest-api-design-best-practices-2026.jpg'
---

REST APIの設計品質は、開発チームの生産性とサービスの保守性に直結する。設計が雑なAPIは後からの修正コストが膨大になり、クライアント側にも負担を強いる。

本記事では、2026年時点のベストプラクティスに基づいたREST API設計の原則を解説する。Express/Hono両方の実装例と、OpenAPI定義、Zodによるバリデーションまで実践的にカバーする。

---

### 1. RESTful設計の6原則

REST（Representational State Transfer）はRoy Fieldingが2000年の博士論文で提唱したアーキテクチャスタイルだ。以下の6つの制約を守ることで、スケーラブルで保守性の高いAPIを設計できる。

出典: Roy Fielding「Architectural Styles and the Design of Network-based Software Architectures」 https://www.ics.uci.edu/~fielding/pubs/dissertation/top.htm

#### 1-1. クライアント・サーバー分離

クライアント（UI）とサーバー（データ・ビジネスロジック）を明確に分離する。これにより、それぞれを独立してスケール・進化させられる。

#### 1-2. ステートレス

各リクエストは完結した情報を含み、サーバーはリクエスト間の状態を保持しない。認証情報はリクエストごとにトークンとして送信する。

#### 1-3. キャッシュ可能

レスポンスにキャッシュの可否を明示する。適切なキャッシュ設計は、サーバー負荷の軽減とレスポンス速度の向上に貢献する。

#### 1-4. 統一インターフェース

URIでリソースを識別し、HTTPメソッドで操作を表現する。レスポンスは自己記述的であり、HATEOASで遷移可能な状態を表現する。

#### 1-5. レイヤードシステム

クライアントは直接サーバーと通信しているか、中間のロードバランサーやキャッシュを経由しているかを意識する必要がない。

#### 1-6. コードオンデマンド（任意）

サーバーがクライアントに実行可能なコードを送信できる。これは任意の制約であり、一般的なREST APIでは使われないことが多い。

---

### 2. URL設計

URLはAPIの「住所」であり、直感的で一貫性のある設計が求められる。

#### 2-1. リソース指向のURL

URLは名詞（リソース）で表現する。動詞は使わない。

```
正しい例:
  GET    /api/v1/users          -- ユーザー一覧
  GET    /api/v1/users/123      -- ユーザー詳細
  POST   /api/v1/users          -- ユーザー作成
  PUT    /api/v1/users/123      -- ユーザー更新（全体）
  PATCH  /api/v1/users/123      -- ユーザー更新（部分）
  DELETE /api/v1/users/123      -- ユーザー削除

誤った例:
  GET    /api/v1/getUsers
  POST   /api/v1/createUser
  POST   /api/v1/updateUser/123
  POST   /api/v1/deleteUser/123
```

#### 2-2. ネストとリレーション

リソース間の関係はURLのネストで表現する。ただし、深いネストは避ける（最大2階層を推奨）。

```
推奨:
  GET /api/v1/users/123/orders          -- ユーザー123の注文一覧
  GET /api/v1/users/123/orders/456      -- ユーザー123の注文456
  GET /api/v1/orders/456                -- 注文456（ユーザー不問）

非推奨（ネストが深すぎる）:
  GET /api/v1/users/123/orders/456/items/789/reviews
```

#### 2-3. 命名規則

```
URL設計の命名規則:
- ケバブケース（kebab-case）を使用: /user-profiles （snake_caseやcamelCaseは非推奨）
- 複数形を使用: /users, /orders （単数形は非推奨）
- 末尾スラッシュなし: /users （/users/ は非推奨）
- ファイル拡張子なし: /users （/users.json は非推奨）
- クエリパラメータはcamelCase: ?sortBy=createdAt&pageSize=20
```

#### 2-4. フィルタリング・ソート・ページネーション

コレクションエンドポイントでは、クエリパラメータでフィルタリング、ソート、ページネーションを提供する。

```
GET /api/v1/users?status=active&role=admin     -- フィルタリング
GET /api/v1/users?sortBy=createdAt&order=desc  -- ソート
GET /api/v1/users?page=2&pageSize=20           -- ページネーション
GET /api/v1/users?fields=id,name,email         -- フィールド選択
GET /api/v1/users?search=tanaka                -- 検索
```

---

### 3. HTTPステータスコード

適切なステータスコードを返すことで、クライアントはレスポンスの意味を正確に理解できる。

#### 3-1. 主要なステータスコード

```
2xx 成功:
  200 OK              -- リクエスト成功（GET, PUT, PATCH, DELETE）
  201 Created         -- リソース作成成功（POST）
  204 No Content      -- 成功だがレスポンスボディなし（DELETE）

3xx リダイレクト:
  301 Moved Permanently  -- 恒久的なURLの変更
  304 Not Modified       -- キャッシュの使用を指示

4xx クライアントエラー:
  400 Bad Request     -- リクエストが不正（バリデーションエラー）
  401 Unauthorized    -- 認証が必要（トークンなし/期限切れ）
  403 Forbidden       -- 認証済みだが権限不足
  404 Not Found       -- リソースが存在しない
  405 Method Not Allowed  -- 許可されていないHTTPメソッド
  409 Conflict        -- リソースの競合（楽観ロック）
  422 Unprocessable Entity -- リクエストは正しいが処理不能
  429 Too Many Requests   -- レート制限超過

5xx サーバーエラー:
  500 Internal Server Error -- サーバー内部エラー
  502 Bad Gateway          -- アップストリームサーバーからの不正なレスポンス
  503 Service Unavailable  -- サービス一時停止（メンテナンス等）
  504 Gateway Timeout      -- アップストリームサーバーのタイムアウト
```

出典: RFC 9110 - HTTP Semantics https://httpwg.org/specs/rfc9110.html

#### 3-2. エラーレスポンスの統一フォーマット

```typescript
// エラーレスポンスの型定義
interface ApiError {
  status: number;
  code: string;        // アプリケーション固有のエラーコード
  message: string;     // 人間が読めるエラーメッセージ
  details?: Array<{    // バリデーションエラーの詳細
    field: string;
    message: string;
    value?: unknown;
  }>;
  timestamp: string;
  path: string;
  traceId?: string;    // デバッグ用のトレースID
}
```

エラーレスポンスの例:

```json
{
  "status": 422,
  "code": "VALIDATION_ERROR",
  "message": "入力値にエラーがあります",
  "details": [
    {
      "field": "email",
      "message": "有効なメールアドレスを入力してください",
      "value": "invalid-email"
    },
    {
      "field": "age",
      "message": "18以上の値を入力してください",
      "value": 15
    }
  ],
  "timestamp": "2026-03-06T10:30:00.000Z",
  "path": "/api/v1/users",
  "traceId": "abc-123-def-456"
}
```

---

### 4. 認証・認可

#### 4-1. JWT（JSON Web Token）認証

JWTはステートレスな認証方式で、RESTful APIに適している。

```typescript
// src/auth/jwt.ts
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

interface TokenPayload extends JWTPayload {
  userId: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-for-dev'
);
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

/** アクセストークンの生成 */
export async function generateAccessToken(
  payload: Omit<TokenPayload, 'iat' | 'exp' | 'iss'>
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .setIssuer('myapp')
    .sign(JWT_SECRET);
}

/** リフレッシュトークンの生成 */
export async function generateRefreshToken(
  userId: string
): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .setIssuer('myapp')
    .sign(JWT_SECRET);
}

/** トークンの検証 */
export async function verifyToken(
  token: string
): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET, {
    issuer: 'myapp',
  });
  return payload as TokenPayload;
}

/** Authorizationヘッダーからトークンを抽出 */
export function extractBearerToken(
  authHeader: string | undefined
): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}
```

出典: RFC 7519 - JSON Web Token https://datatracker.ietf.org/doc/html/rfc7519

#### 4-2. OAuth 2.0フロー

外部サービスとの連携にはOAuth 2.0を使用する。

```typescript
// src/auth/oauth.ts
interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
}

const githubConfig: OAuthConfig = {
  clientId: process.env.GITHUB_CLIENT_ID || '',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  redirectUri: `${process.env.APP_URL}/api/v1/auth/github/callback`,
  authorizationUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  userInfoUrl: 'https://api.github.com/user',
  scopes: ['read:user', 'user:email'],
};

/** 認可URLの生成 */
export function getAuthorizationUrl(
  config: OAuthConfig,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' '),
    state,
    response_type: 'code',
  });
  return `${config.authorizationUrl}?${params.toString()}`;
}

/** アクセストークンの取得 */
export async function exchangeCodeForToken(
  config: OAuthConfig,
  code: string
): Promise<{ accessToken: string; tokenType: string }> {
  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    tokenType: data.token_type,
  };
}

/** ユーザー情報の取得 */
export async function getUserInfo(
  config: OAuthConfig,
  accessToken: string
): Promise<Record<string, unknown>> {
  const response = await fetch(config.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`User info fetch failed: ${response.statusText}`);
  }

  return response.json();
}
```

出典: RFC 6749 - The OAuth 2.0 Authorization Framework https://datatracker.ietf.org/doc/html/rfc6749

#### 4-3. 認証ミドルウェア（Hono）

```typescript
// src/middleware/auth.ts
import type { Context, Next } from 'hono';
import { verifyToken, extractBearerToken } from '../auth/jwt.js';

export async function authMiddleware(c: Context, next: Next) {
  const token = extractBearerToken(c.req.header('Authorization'));

  if (!token) {
    return c.json(
      {
        status: 401,
        code: 'UNAUTHORIZED',
        message: '認証トークンが必要です',
        timestamp: new Date().toISOString(),
        path: c.req.path,
      },
      401
    );
  }

  try {
    const payload = await verifyToken(token);
    c.set('user', payload);
    await next();
  } catch (error) {
    return c.json(
      {
        status: 401,
        code: 'TOKEN_EXPIRED',
        message: '認証トークンが無効または期限切れです',
        timestamp: new Date().toISOString(),
        path: c.req.path,
      },
      401
    );
  }
}

/** ロールベースのアクセス制御 */
export function requireRole(...allowedRoles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    if (!user || !allowedRoles.includes(user.role)) {
      return c.json(
        {
          status: 403,
          code: 'FORBIDDEN',
          message: 'この操作を行う権限がありません',
          timestamp: new Date().toISOString(),
          path: c.req.path,
        },
        403
      );
    }
    await next();
  };
}
```

---

### 5. バージョニング

APIのバージョニング戦略は、後方互換性を維持しながらAPIを進化させるために不可欠だ。

#### 5-1. バージョニング方式の比較

| 方式 | 例 | メリット | デメリット |
|------|-----|---------|-----------|
| URLパスにバージョンを含める | `/api/v1/users` | 直感的、ルーティングが明確 | URLが変わる |
| クエリパラメータ | `/api/users?version=1` | URLが変わらない | 見落としやすい |
| カスタムヘッダー | `X-API-Version: 1` | URLが変わらない | ブラウザテストが面倒 |
| Acceptヘッダー | `Accept: application/vnd.myapp.v1+json` | RESTfulに最も正しい | 実装が複雑 |

**推奨**: URLパスにバージョンを含める方式（`/api/v1/`）。最も直感的で、ドキュメント化やルーティングが容易だ。

#### 5-2. バージョン管理の実装（Hono）

```typescript
// src/routes/index.ts
import { Hono } from 'hono';
import { v1Routes } from './v1/index.js';
import { v2Routes } from './v2/index.js';

const app = new Hono();

// バージョンごとにルーターを分離
app.route('/api/v1', v1Routes);
app.route('/api/v2', v2Routes);

// バージョンなしのアクセスは最新バージョンにリダイレクト
app.get('/api/users*', (c) => {
  const newPath = c.req.path.replace('/api/', '/api/v2/');
  return c.redirect(newPath, 301);
});

export default app;
```

```typescript
// src/routes/v1/users.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const v1Users = new Hono();

// V1: 基本的なユーザーAPI
v1Users.get('/', async (c) => {
  // V1のレスポンス形式
  const users = await getUsersV1();
  return c.json({ data: users });
});

export { v1Users };
```

```typescript
// src/routes/v2/users.ts
import { Hono } from 'hono';

const v2Users = new Hono();

// V2: ページネーション対応、レスポンス形式の拡張
v2Users.get('/', async (c) => {
  const page = parseInt(c.req.query('page') || '1', 10);
  const pageSize = parseInt(c.req.query('pageSize') || '20', 10);

  const { data, total } = await getUsersV2(page, pageSize);

  return c.json({
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasNext: page * pageSize < total,
      hasPrev: page > 1,
    },
    _links: {
      self: `/api/v2/users?page=${page}&pageSize=${pageSize}`,
      next: page * pageSize < total
        ? `/api/v2/users?page=${page + 1}&pageSize=${pageSize}`
        : null,
      prev: page > 1
        ? `/api/v2/users?page=${page - 1}&pageSize=${pageSize}`
        : null,
    },
  });
});

export { v2Users };
```

---

### 6. Zodによるバリデーション

Zodは TypeScript ファーストのスキーマバリデーションライブラリだ。型安全なバリデーションをランタイムで実行できる。

出典: Zod公式ドキュメント https://zod.dev/

#### 6-1. スキーマ定義

```typescript
// src/schemas/user.ts
import { z } from 'zod';

/** ユーザー作成スキーマ */
export const createUserSchema = z.object({
  name: z
    .string()
    .min(1, '名前は必須です')
    .max(100, '名前は100文字以内で入力してください'),
  email: z
    .string()
    .email('有効なメールアドレスを入力してください'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .max(128, 'パスワードは128文字以内で入力してください')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'パスワードは大文字、小文字、数字を含む必要があります'
    ),
  role: z.enum(['admin', 'user', 'viewer']).default('user'),
  profile: z.object({
    bio: z.string().max(500).optional(),
    website: z.string().url().optional(),
    avatarUrl: z.string().url().optional(),
  }).optional(),
});

/** ユーザー更新スキーマ（全フィールドオプショナル） */
export const updateUserSchema = createUserSchema.partial().omit({
  password: true,
});

/** パスワード変更スキーマ */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '現在のパスワードは必須です'),
  newPassword: z
    .string()
    .min(8, '新しいパスワードは8文字以上で入力してください')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      '新しいパスワードは大文字、小文字、数字を含む必要があります'
    ),
  confirmPassword: z.string(),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  }
);

/** クエリパラメータスキーマ */
export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'name', 'email']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  status: z.enum(['active', 'inactive', 'all']).default('all'),
  search: z.string().max(100).optional(),
});

/** 型の導出 */
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
```

#### 6-2. Honoでのバリデーション統合

```typescript
// src/routes/v1/users.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  createUserSchema,
  updateUserSchema,
  listUsersQuerySchema,
} from '../../schemas/user.js';
import { authMiddleware, requireRole } from '../../middleware/auth.js';

const users = new Hono();

// 認証ミドルウェアを全ルートに適用
users.use('/*', authMiddleware);

/** ユーザー一覧 */
users.get(
  '/',
  zValidator('query', listUsersQuerySchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          status: 400,
          code: 'VALIDATION_ERROR',
          message: 'クエリパラメータにエラーがあります',
          details: result.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
          timestamp: new Date().toISOString(),
          path: c.req.path,
        },
        400
      );
    }
  }),
  async (c) => {
    const query = c.req.valid('query');
    // データベースからの取得処理は省略
    return c.json({
      data: [],
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total: 0,
        totalPages: 0,
      },
    });
  }
);

/** ユーザー作成 */
users.post(
  '/',
  requireRole('admin'),
  zValidator('json', createUserSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          status: 422,
          code: 'VALIDATION_ERROR',
          message: '入力値にエラーがあります',
          details: result.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
            value: issue.code === 'too_small' ? undefined : undefined,
          })),
          timestamp: new Date().toISOString(),
          path: c.req.path,
        },
        422
      );
    }
  }),
  async (c) => {
    const body = c.req.valid('json');
    // ユーザー作成処理は省略
    return c.json(
      {
        data: { id: 'new-user-id', ...body, password: undefined },
        message: 'ユーザーを作成しました',
      },
      201
    );
  }
);

/** ユーザー詳細 */
users.get(
  '/:id',
  zValidator(
    'param',
    z.object({ id: z.string().uuid('無効なユーザーIDです') })
  ),
  async (c) => {
    const { id } = c.req.valid('param');
    // ユーザー取得処理は省略
    return c.json({ data: { id } });
  }
);

/** ユーザー更新 */
users.patch(
  '/:id',
  zValidator(
    'param',
    z.object({ id: z.string().uuid() })
  ),
  zValidator('json', updateUserSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');
    // 更新処理は省略
    return c.json({ data: { id, ...body } });
  }
);

/** ユーザー削除 */
users.delete(
  '/:id',
  requireRole('admin'),
  zValidator(
    'param',
    z.object({ id: z.string().uuid() })
  ),
  async (c) => {
    const { id } = c.req.valid('param');
    // 削除処理は省略
    return c.body(null, 204);
  }
);

export { users };
```

---

### 7. Express実装例

Honoと比較するために、Expressでの実装例も掲載する。

```typescript
// src/express/users.ts
import { Router, type Request, type Response, type NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { createUserSchema, listUsersQuerySchema } from '../schemas/user.js';

const router = Router();

/** Zodバリデーションミドルウェア */
function validate(schema: z.ZodSchema, source: 'body' | 'query' | 'params') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = schema.parse(req[source]);
      req[source] = data;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(422).json({
          status: 422,
          code: 'VALIDATION_ERROR',
          message: '入力値にエラーがあります',
          details: error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
          timestamp: new Date().toISOString(),
          path: req.path,
        });
        return;
      }
      next(error);
    }
  };
}

/** ユーザー一覧 */
router.get(
  '/',
  validate(listUsersQuerySchema, 'query'),
  async (req: Request, res: Response) => {
    const query = req.query as z.infer<typeof listUsersQuerySchema>;
    res.json({
      data: [],
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total: 0,
        totalPages: 0,
      },
    });
  }
);

/** ユーザー作成 */
router.post(
  '/',
  validate(createUserSchema, 'body'),
  async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof createUserSchema>;
    res.status(201).json({
      data: { id: 'new-user-id', ...body, password: undefined },
      message: 'ユーザーを作成しました',
    });
  }
);

/** エラーハンドリングミドルウェア */
router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    status: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'サーバー内部エラーが発生しました',
    timestamp: new Date().toISOString(),
  });
});

export { router as userRouter };
```

---

### 8. OpenAPI / Swagger定義

OpenAPI（旧Swagger）は、REST APIの仕様を機械可読な形式で記述するための標準だ。

出典: OpenAPI Specification https://spec.openapis.org/oas/v3.1.0

#### 8-1. OpenAPI定義ファイル

```yaml
## openapi.yaml
openapi: 3.1.0
info:
  title: MyApp API
  description: ユーザー管理API
  version: 1.0.0
  contact:
    name: API Support
    email: support@example.com
  license:
    name: MIT

servers:
  - url: http://localhost:8080/api/v1
    description: 開発環境
  - url: https://staging.example.com/api/v1
    description: ステージング環境
  - url: https://api.example.com/api/v1
    description: 本番環境

tags:
  - name: Users
    description: ユーザー管理
  - name: Auth
    description: 認証

security:
  - bearerAuth: []

paths:
  /users:
    get:
      tags: [Users]
      summary: ユーザー一覧の取得
      operationId: listUsers
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
            default: 1
        - name: pageSize
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
        - name: sortBy
          in: query
          schema:
            type: string
            enum: [createdAt, name, email]
            default: createdAt
        - name: order
          in: query
          schema:
            type: string
            enum: [asc, desc]
            default: desc
        - name: status
          in: query
          schema:
            type: string
            enum: [active, inactive, all]
            default: all
        - name: search
          in: query
          schema:
            type: string
            maxLength: 100
      responses:
        '200':
          description: ユーザー一覧
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/User'
                  pagination:
                    $ref: '#/components/schemas/Pagination'
        '401':
          $ref: '#/components/responses/Unauthorized'

    post:
      tags: [Users]
      summary: ユーザーの作成
      operationId: createUser
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserInput'
      responses:
        '201':
          description: ユーザー作成成功
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    $ref: '#/components/schemas/User'
                  message:
                    type: string
        '422':
          $ref: '#/components/responses/ValidationError'

  /users/{id}:
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
    get:
      tags: [Users]
      summary: ユーザー詳細の取得
      operationId: getUser
      responses:
        '200':
          description: ユーザー詳細
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    $ref: '#/components/schemas/User'
        '404':
          $ref: '#/components/responses/NotFound'

    patch:
      tags: [Users]
      summary: ユーザーの更新
      operationId: updateUser
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateUserInput'
      responses:
        '200':
          description: ユーザー更新成功
        '404':
          $ref: '#/components/responses/NotFound'
        '422':
          $ref: '#/components/responses/ValidationError'

    delete:
      tags: [Users]
      summary: ユーザーの削除
      operationId: deleteUser
      responses:
        '204':
          description: ユーザー削除成功
        '404':
          $ref: '#/components/responses/NotFound'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    User:
      type: object
      required: [id, name, email, role, createdAt]
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        email:
          type: string
          format: email
        role:
          type: string
          enum: [admin, user, viewer]
        profile:
          type: object
          properties:
            bio:
              type: string
            website:
              type: string
              format: uri
            avatarUrl:
              type: string
              format: uri
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    CreateUserInput:
      type: object
      required: [name, email, password]
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 100
        email:
          type: string
          format: email
        password:
          type: string
          minLength: 8
          maxLength: 128
        role:
          type: string
          enum: [admin, user, viewer]
          default: user

    UpdateUserInput:
      type: object
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 100
        email:
          type: string
          format: email
        role:
          type: string
          enum: [admin, user, viewer]

    Pagination:
      type: object
      properties:
        page:
          type: integer
        pageSize:
          type: integer
        total:
          type: integer
        totalPages:
          type: integer
        hasNext:
          type: boolean
        hasPrev:
          type: boolean

    ApiError:
      type: object
      required: [status, code, message, timestamp, path]
      properties:
        status:
          type: integer
        code:
          type: string
        message:
          type: string
        details:
          type: array
          items:
            type: object
            properties:
              field:
                type: string
              message:
                type: string
        timestamp:
          type: string
          format: date-time
        path:
          type: string
        traceId:
          type: string

  responses:
    Unauthorized:
      description: 認証エラー
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ApiError'
    Forbidden:
      description: 権限エラー
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ApiError'
    NotFound:
      description: リソースが見つかりません
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ApiError'
    ValidationError:
      description: バリデーションエラー
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ApiError'
```

#### 8-2. Swagger UIの統合（Hono）

```typescript
// src/swagger.ts
import { Hono } from 'hono';
import { swaggerUI } from '@hono/swagger-ui';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import yaml from 'js-yaml';

export function setupSwagger(app: Hono): void {
  // OpenAPI定義ファイルの読み込み
  const specPath = resolve(process.cwd(), 'openapi.yaml');
  const specContent = readFileSync(specPath, 'utf-8');
  const spec = yaml.load(specContent);

  // OpenAPI JSONエンドポイント
  app.get('/api/openapi.json', (c) => {
    return c.json(spec);
  });

  // Swagger UIの設定
  app.get(
    '/api/docs',
    swaggerUI({
      url: '/api/openapi.json',
    })
  );
}
```

---

### 9. レート制限

APIの過負荷や不正利用を防ぐために、レート制限を実装する。

```typescript
// src/middleware/rate-limit.ts
import type { Context, Next } from 'hono';

interface RateLimitConfig {
  windowMs: number;     // タイムウィンドウ（ミリ秒）
  maxRequests: number;  // ウィンドウ内の最大リクエスト数
}

// インメモリストア（本番ではRedisを推奨）
const store = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(config: RateLimitConfig) {
  return async (c: Context, next: Next) => {
    const key = c.req.header('X-Forwarded-For')
      || c.req.header('X-Real-IP')
      || 'unknown';

    const now = Date.now();
    const record = store.get(key);

    if (!record || now > record.resetAt) {
      store.set(key, { count: 1, resetAt: now + config.windowMs });
      c.header('X-RateLimit-Limit', String(config.maxRequests));
      c.header('X-RateLimit-Remaining', String(config.maxRequests - 1));
      c.header('X-RateLimit-Reset', String(Math.ceil((now + config.windowMs) / 1000)));
      await next();
      return;
    }

    record.count++;

    if (record.count > config.maxRequests) {
      c.header('X-RateLimit-Limit', String(config.maxRequests));
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', String(Math.ceil(record.resetAt / 1000)));
      c.header('Retry-After', String(Math.ceil((record.resetAt - now) / 1000)));

      return c.json(
        {
          status: 429,
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'リクエスト数が制限を超えました。しばらくしてから再試行してください。',
          timestamp: new Date().toISOString(),
          path: c.req.path,
        },
        429
      );
    }

    c.header('X-RateLimit-Limit', String(config.maxRequests));
    c.header('X-RateLimit-Remaining', String(config.maxRequests - record.count));
    c.header('X-RateLimit-Reset', String(Math.ceil(record.resetAt / 1000)));
    await next();
  };
}
```

出典: IETF「RateLimit Header Fields for HTTP」 https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/

---

### 10. CORS設定

```typescript
// src/middleware/cors.ts
import { cors } from 'hono/cors';

export const corsConfig = cors({
  origin: (origin) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://app.example.com',
      'https://staging.example.com',
    ];
    if (allowedOrigins.includes(origin)) {
      return origin;
    }
    return null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposeHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  maxAge: 3600,
  credentials: true,
});
```

出典: MDN「Cross-Origin Resource Sharing (CORS)」 https://developer.mozilla.org/ja/docs/Web/HTTP/CORS

---

### 11. アプリケーション全体の組み立て（Hono）

```typescript
// src/app.ts
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { requestId } from 'hono/request-id';
import { corsConfig } from './middleware/cors.js';
import { rateLimit } from './middleware/rate-limit.js';
import { users } from './routes/v1/users.js';
import { setupSwagger } from './swagger.js';

const app = new Hono();

// --- グローバルミドルウェア ---
app.use('*', requestId());
app.use('*', logger());
app.use('*', secureHeaders());
app.use('/api/*', corsConfig);
app.use('/api/*', rateLimit({ windowMs: 60_000, maxRequests: 100 }));

// --- ヘルスチェック ---
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// --- APIルート ---
app.route('/api/v1/users', users);

// --- Swagger UI ---
setupSwagger(app);

// --- 404ハンドラー ---
app.notFound((c) =>
  c.json(
    {
      status: 404,
      code: 'NOT_FOUND',
      message: 'リクエストされたリソースが見つかりません',
      timestamp: new Date().toISOString(),
      path: c.req.path,
    },
    404
  )
);

// --- エラーハンドラー ---
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json(
    {
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'サーバー内部エラーが発生しました',
      timestamp: new Date().toISOString(),
      path: c.req.path,
    },
    500
  );
});

export default app;
```

```typescript
// src/server.ts
import { serve } from '@hono/node-server';
import app from './app.js';

const port = parseInt(process.env.PORT || '8080', 10);

serve({ fetch: app.fetch, port }, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`API docs: http://localhost:${port}/api/docs`);
});
```

出典: Hono公式ドキュメント https://hono.dev/

---

### まとめ

本記事では、2026年のベストプラクティスに基づいたREST API設計を体系的に解説した。

1. **RESTful設計の6原則**: ステートレス、統一インターフェース、リソース指向
2. **URL設計**: 名詞ベース、ケバブケース、最大2階層のネスト
3. **HTTPステータスコード**: 適切なコードの使い分けと統一エラーレスポンス
4. **認証**: JWT + OAuth 2.0、ロールベースのアクセス制御
5. **バージョニング**: URLパスにバージョンを含める方式を推奨
6. **バリデーション**: Zodによる型安全なランタイムバリデーション
7. **OpenAPI**: 機械可読な仕様定義 + Swagger UIによるドキュメント
8. **レート制限**: X-RateLimit-* ヘッダーによる透明な制限通知
9. **CORS**: オリジン制限によるセキュリティ確保

API設計は一度リリースすると変更が困難だ。本記事を参考に、最初から正しく設計し、クライアントにとって使いやすく、保守性の高いAPIを構築してほしい。

---

**参考文献**

- Roy Fielding「Architectural Styles and the Design of Network-based Software Architectures」 https://www.ics.uci.edu/~fielding/pubs/dissertation/top.htm
- RFC 9110 - HTTP Semantics https://httpwg.org/specs/rfc9110.html
- RFC 7519 - JSON Web Token https://datatracker.ietf.org/doc/html/rfc7519
- RFC 6749 - The OAuth 2.0 Authorization Framework https://datatracker.ietf.org/doc/html/rfc6749
- OpenAPI Specification 3.1.0 https://spec.openapis.org/oas/v3.1.0
- Zod公式ドキュメント https://zod.dev/
- Hono公式ドキュメント https://hono.dev/
- MDN「Cross-Origin Resource Sharing (CORS)」 https://developer.mozilla.org/ja/docs/Web/HTTP/CORS
- IETF「RateLimit Header Fields for HTTP」 https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)

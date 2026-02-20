---
title: 'REST API設計ベストプラクティス — 保守性の高いAPIを設計・実装する完全ガイド'
description: 'RESTful API設計の基本原則から実践的なベストプラクティスまで徹底解説。URLルーティング・HTTPメソッド・ステータスコード・認証・バージョニング・エラーレスポンス・ページネーション・OpenAPI仕様書まで実践コード付き。'
pubDate: '2026-02-20'
heroImage: '../../assets/blog-placeholder-1.jpg'
tags: ['REST API', 'API設計', 'Node.js', 'Express', 'TypeScript']
---

APIはソフトウェアの「インターフェース」だ。内部実装がどれだけ優れていても、APIが使いにくければ開発者体験は損なわれ、保守コストは増大し、バグを生む温床となる。REST APIの設計は、一度リリースしてしまうと後から変更しにくいため、**最初から正しく設計することが重要**だ。

この記事では、REST APIの根本原則から、URLルーティング・HTTPメソッドの使い方・エラーハンドリング・ページネーション・認証・OpenAPI仕様書まで、実際のTypeScript/Expressコードを交えて徹底解説する。

---

## 1. REST APIの基本原則

REST（Representational State Transfer）は2000年にRoy Fieldingの博士論文で提唱されたアーキテクチャスタイルだ。RESTfulなAPIを設計するには、以下の6つの制約を理解する必要がある。

### 1-1. リソース指向

APIは**リソース（名詞）**を中心に設計する。動詞（動作）ではなく名詞（モノ）で表現するのがポイントだ。

```
# 悪い例（動詞ベース）
GET /getUsers
POST /createUser
DELETE /deleteUser?id=123

# 良い例（名詞・リソースベース）
GET /users
POST /users
DELETE /users/123
```

リソースはHTTPメソッド（GET/POST/PUT/PATCH/DELETE）で操作する。URLは「何を操作するか」を示し、HTTPメソッドは「どう操作するか」を示す。

### 1-2. ステートレス

各リクエストは**完全に独立**しており、サーバー側にセッション状態を保持しない。認証情報・コンテキスト情報はすべてリクエストに含める。

```typescript
// 悪い例：サーバー側にセッションを持つ
app.post('/login', (req, res) => {
  req.session.userId = user.id; // サーバー状態に依存
});

// 良い例：トークンをレスポンスで返し、クライアントが保持
app.post('/auth/login', async (req, res) => {
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!);
  res.json({ accessToken: token }); // クライアントが次のリクエストに添付
});
```

### 1-3. 統一インターフェース

すべてのリソースに対して一貫したインターフェースを提供する。これにより、APIを知らなくても直感的に利用できる。

| HTTPメソッド | コレクション (`/users`) | 単一リソース (`/users/123`) |
|-------------|------------------------|---------------------------|
| GET | 一覧取得 | 単一取得 |
| POST | 新規作成 | - |
| PUT | - | 全体置換 |
| PATCH | - | 部分更新 |
| DELETE | - | 削除 |

---

## 2. URLルーティング設計

### 2-1. 名詞・複数形を使う

リソース名は**複数形の名詞**を使う。コレクションと単一リソースの両方に統一感が生まれる。

```
/users          # ユーザーのコレクション
/users/123      # ID=123のユーザー
/articles       # 記事のコレクション
/articles/slug  # 特定の記事
```

### 2-2. 階層構造（ネスト）

リソース間に親子関係がある場合はURLにネスト構造で表現する。ただし、深くなりすぎないよう**最大2階層まで**を推奨する。

```
# 良い例
GET /users/123/posts          # ユーザー123の投稿一覧
GET /users/123/posts/456      # ユーザー123の投稿456
POST /users/123/posts         # ユーザー123に投稿を作成

# 避けるべき例（深すぎる）
GET /users/123/posts/456/comments/789/likes  # 複雑すぎる
```

深いネストが必要な場合は、クエリパラメータで対応する方が実用的なことが多い。

### 2-3. クエリパラメータの使い方

フィルタリング・ソート・ページネーション・フィールド選択はクエリパラメータで行う。

```
GET /users?role=admin&status=active          # フィルタリング
GET /articles?sort=createdAt&order=desc      # ソート
GET /users?page=2&limit=20                   # ページネーション
GET /users?fields=id,name,email              # フィールド選択
GET /articles?search=typescript              # 検索
```

### 2-4. Expressでのルーティング実装

```typescript
import express from 'express';
import { UsersController } from './controllers/users';

const router = express.Router();
const usersController = new UsersController();

// コレクション操作
router.get('/users', usersController.list);
router.post('/users', usersController.create);

// 単一リソース操作
router.get('/users/:id', usersController.findOne);
router.put('/users/:id', usersController.replace);
router.patch('/users/:id', usersController.update);
router.delete('/users/:id', usersController.delete);

// ネストされたリソース
router.get('/users/:userId/posts', usersController.listPosts);
router.post('/users/:userId/posts', usersController.createPost);

export default router;
```

---

## 3. HTTPメソッドの正しい使い方

### 3-1. GET — データ取得（冪等・安全）

GETはデータを取得するだけで、**サーバー状態を変更しない**。冪等かつ安全なメソッドだ。

```typescript
// GET /users — 一覧取得
export const listUsers = async (req: Request, res: Response) => {
  const { page = 1, limit = 20, role, status } = req.query;

  const users = await db.user.findMany({
    where: {
      ...(role && { role: role as string }),
      ...(status && { status: status as string }),
    },
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit),
    select: { id: true, name: true, email: true, role: true },
  });

  res.json({ data: users, meta: { page: Number(page), limit: Number(limit) } });
};

// GET /users/:id — 単一取得
export const getUser = async (req: Request, res: Response) => {
  const user = await db.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ data: user });
};
```

### 3-2. POST — リソース作成（非冪等）

POSTは新しいリソースを作成する。同じリクエストを2回送ると2つのリソースが作成されるため、**非冪等**だ。

```typescript
// POST /users — ユーザー作成
export const createUser = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  // バリデーション
  if (!name || !email || !password) {
    return res.status(400).json({
      type: 'https://example.com/errors/validation',
      title: 'Validation Error',
      status: 400,
      detail: 'name, email, password are required',
    });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await db.user.create({
    data: { name, email, password: hashedPassword },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  // 201 Created + Locationヘッダー
  res.status(201)
    .header('Location', `/users/${user.id}`)
    .json({ data: user });
};
```

### 3-3. PUT — 全体置換（冪等）

PUTはリソース全体を置換する。同じリクエストを何度送っても結果が同じなので**冪等**だ。送信しなかったフィールドはnullまたはデフォルト値になる。

```typescript
// PUT /users/:id — 全体置換
export const replaceUser = async (req: Request, res: Response) => {
  const { name, email, role, status } = req.body;

  // PUTは全フィールド必須
  if (!name || !email || !role || !status) {
    return res.status(400).json({ error: 'All fields required for PUT' });
  }

  const user = await db.user.upsert({
    where: { id: req.params.id },
    update: { name, email, role, status },
    create: { id: req.params.id, name, email, role, status },
  });

  res.json({ data: user });
};
```

### 3-4. PATCH — 部分更新（冪等）

PATCHは送信したフィールドのみ更新する。**部分更新**に使い、PUTよりも柔軟性が高い。

```typescript
// PATCH /users/:id — 部分更新
export const updateUser = async (req: Request, res: Response) => {
  const allowedFields = ['name', 'email', 'role'] as const;
  const updateData: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const user = await db.user.update({
    where: { id: req.params.id },
    data: updateData,
  });

  res.json({ data: user });
};
```

### 3-5. DELETE — リソース削除（冪等）

DELETEはリソースを削除する。冪等なので、存在しないリソースへのDELETEは`404`または`204`どちらでも一貫性があれば良い。

```typescript
// DELETE /users/:id — 削除
export const deleteUser = async (req: Request, res: Response) => {
  const user = await db.user.findUnique({ where: { id: req.params.id } });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  await db.user.delete({ where: { id: req.params.id } });

  res.status(204).send(); // 204 No Content
};
```

---

## 4. HTTPステータスコードの使い分け

適切なステータスコードを返すことで、クライアントはレスポンスの意味をプログラム的に判断できる。

### 4-1. 2xx系（成功）

| コード | 意味 | 使用場面 |
|--------|------|---------|
| `200 OK` | 成功 | GET・PUT・PATCH成功時 |
| `201 Created` | 作成成功 | POST成功時（Locationヘッダー推奨） |
| `204 No Content` | 成功・ボディなし | DELETE成功時、PATCH（ボディ不要時） |

### 4-2. 4xx系（クライアントエラー）

| コード | 意味 | 使用場面 |
|--------|------|---------|
| `400 Bad Request` | 不正なリクエスト | バリデーションエラー・不正な形式 |
| `401 Unauthorized` | 未認証 | 認証情報なし・無効なトークン |
| `403 Forbidden` | 権限なし | 認証済みだが権限不足 |
| `404 Not Found` | 存在しない | リソースが見つからない |
| `409 Conflict` | 競合 | 重複登録・楽観的ロック競合 |
| `422 Unprocessable Entity` | 処理不能 | 意味的バリデーションエラー |
| `429 Too Many Requests` | レート制限 | リクエスト過多 |

### 4-3. 5xx系（サーバーエラー）

| コード | 意味 | 使用場面 |
|--------|------|---------|
| `500 Internal Server Error` | 内部エラー | 予期しないエラー |
| `502 Bad Gateway` | ゲートウェイエラー | 上流サービスのエラー |
| `503 Service Unavailable` | サービス不能 | メンテナンス・過負荷 |

```typescript
// ステータスコードを状況に応じて使い分ける例
export const createUser = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // 401: 未認証
    if (!req.headers.authorization) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // 400: バリデーションエラー
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // 409: 重複
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const user = await db.user.create({ data: req.body });
    return res.status(201).json({ data: user }); // 201: 作成成功

  } catch (error) {
    // 500: 予期しないエラー
    return res.status(500).json({ error: 'Internal server error' });
  }
};
```

---

## 5. リクエスト/レスポンス形式の設計

### 5-1. JSONフォーマットの統一

レスポンスは常に一貫した構造にする。成功時は`data`フィールド、リスト時は`data` + `meta`、エラー時は`error`フィールドを使う。

```typescript
// 成功レスポンスの型定義
interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasNext?: boolean;
  };
}

// エラーレスポンスの型定義（RFC 9457 準拠）
interface ProblemDetail {
  type: string;       // エラーの種類を示すURI
  title: string;      // 人間が読めるエラータイトル
  status: number;     // HTTPステータスコード
  detail?: string;    // 詳細説明
  instance?: string;  // エラーが発生したURI
  errors?: Record<string, string[]>; // フィールドごとのエラー
}
```

### 5-2. 命名規則

JSONのキーは**camelCase**が一般的だ（snake_caseを使う場合もあるが、一貫性を保つことが重要）。

```json
// 良い例（camelCase統一）
{
  "data": {
    "userId": "123",
    "firstName": "太郎",
    "lastName": "山田",
    "emailAddress": "taro@example.com",
    "createdAt": "2026-01-15T09:00:00Z",
    "updatedAt": "2026-02-01T14:30:00Z"
  }
}

// 日時はISO 8601形式（UTC）で統一
// "2026-01-15T09:00:00Z" ← 推奨
// "2026-01-15 09:00:00"  ← 非推奨
```

---

## 6. エラーレスポンスの標準化（RFC 9457）

エラーレスポンスはRFC 9457（Problem Details for HTTP APIs）に準拠することで、クライアントが機械的に処理しやすくなる。

```typescript
// エラーハンドラーミドルウェア
import { Request, Response, NextFunction } from 'express';

export class ApiError extends Error {
  constructor(
    public status: number,
    public title: string,
    public detail?: string,
    public errors?: Record<string, string[]>
  ) {
    super(title);
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      type: `https://api.example.com/errors/${err.title.toLowerCase().replace(/\s+/g, '-')}`,
      title: err.title,
      status: err.status,
      detail: err.detail,
      instance: req.path,
      ...(err.errors && { errors: err.errors }),
    });
  }

  // 予期しないエラーはログに記録して500を返す
  console.error('Unexpected error:', err);
  res.status(500).json({
    type: 'https://api.example.com/errors/internal-server-error',
    title: 'Internal Server Error',
    status: 500,
    detail: 'An unexpected error occurred',
    instance: req.path,
  });
}

// 使用例
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors: Record<string, string[]> = {};

    if (!req.body.name) errors.name = ['Name is required'];
    if (!req.body.email) errors.email = ['Email is required'];

    if (Object.keys(errors).length > 0) {
      throw new ApiError(422, 'Validation Failed', 'Request body failed validation', errors);
    }

    const user = await db.user.create({ data: req.body });
    res.status(201).json({ data: user });

  } catch (error) {
    next(error);
  }
};
```

エラーレスポンスの例:

```json
{
  "type": "https://api.example.com/errors/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "Request body failed validation",
  "instance": "/users",
  "errors": {
    "email": ["Email is required", "Email must be a valid address"],
    "name": ["Name must be at least 2 characters"]
  }
}
```

---

## 7. ページネーション

大量のデータを返す場合は必ずページネーションを実装する。2つの方式がある。

### 7-1. オフセットベース（シンプル・UIフレンドリー）

```typescript
// GET /users?page=2&limit=20
export const listUsersOffset = async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const offset = (page - 1) * limit;

  const [users, total] = await Promise.all([
    db.user.findMany({ skip: offset, take: limit }),
    db.user.count(),
  ]);

  const totalPages = Math.ceil(total / limit);

  res.json({
    data: users,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    links: {
      self: `/users?page=${page}&limit=${limit}`,
      first: `/users?page=1&limit=${limit}`,
      last: `/users?page=${totalPages}&limit=${limit}`,
      ...(page > 1 && { prev: `/users?page=${page - 1}&limit=${limit}` }),
      ...(page < totalPages && { next: `/users?page=${page + 1}&limit=${limit}` }),
    },
  });
};
```

### 7-2. カーソルベース（大量データ・リアルタイム向け）

```typescript
// GET /users?cursor=eyJpZCI6IjEyMyJ9&limit=20
export const listUsersCursor = async (req: Request, res: Response) => {
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const cursor = req.query.cursor as string | undefined;

  // カーソルをデコード
  const cursorId = cursor
    ? JSON.parse(Buffer.from(cursor, 'base64').toString()).id
    : undefined;

  const users = await db.user.findMany({
    take: limit + 1, // 次のページ存在確認のため+1
    ...(cursorId && { cursor: { id: cursorId }, skip: 1 }),
    orderBy: { createdAt: 'desc' },
  });

  const hasNext = users.length > limit;
  const items = hasNext ? users.slice(0, limit) : users;

  // 次のカーソルを生成
  const nextCursor = hasNext
    ? Buffer.from(JSON.stringify({ id: items[items.length - 1].id })).toString('base64')
    : null;

  res.json({
    data: items,
    meta: {
      limit,
      hasNext,
      nextCursor,
    },
  });
};
```

| 比較項目 | オフセットベース | カーソルベース |
|---------|----------------|---------------|
| 実装の簡単さ | 簡単 | やや複雑 |
| ページジャンプ | できる | できない |
| リアルタイムデータ | ズレが生じやすい | 安定 |
| 大量データ性能 | オフセット増加で低下 | 一定 |
| UI適性 | ページ番号UI向き | 無限スクロール向き |

---

## 8. フィルタリング・ソート・フィールド選択

```typescript
// GET /articles?status=published&sort=createdAt&order=desc&fields=id,title,author
export const listArticles = async (req: Request, res: Response) => {
  const {
    status, authorId, search,
    sort = 'createdAt', order = 'desc',
    fields,
  } = req.query;

  // フィールド選択（プロジェクション）
  const allowedFields = ['id', 'title', 'author', 'status', 'createdAt', 'tags'];
  const selectedFields = fields
    ? (fields as string).split(',')
        .filter(f => allowedFields.includes(f))
        .reduce((acc, f) => ({ ...acc, [f]: true }), {} as Record<string, boolean>)
    : undefined;

  // ソートの安全処理（SQLインジェクション防止）
  const allowedSortFields = ['createdAt', 'updatedAt', 'title'];
  const safeSort = allowedSortFields.includes(sort as string) ? sort as string : 'createdAt';
  const safeOrder = order === 'asc' ? 'asc' : 'desc';

  const articles = await db.article.findMany({
    where: {
      ...(status && { status: status as string }),
      ...(authorId && { authorId: authorId as string }),
      ...(search && {
        OR: [
          { title: { contains: search as string, mode: 'insensitive' } },
          { content: { contains: search as string, mode: 'insensitive' } },
        ],
      }),
    },
    orderBy: { [safeSort]: safeOrder },
    ...(selectedFields && { select: selectedFields }),
  });

  res.json({ data: articles });
};
```

---

## 9. バージョニング戦略

APIはリリース後も仕様変更が発生する。**後方互換性を維持しつつ変更を管理する**ためにバージョニングが必要だ。

### 9-1. URLパスバージョニング（推奨）

最も一般的でキャッシュフレンドリーな方式。

```
GET /v1/users
GET /v2/users
```

```typescript
// routes/index.ts
import v1Router from './v1';
import v2Router from './v2';

app.use('/v1', v1Router);
app.use('/v2', v2Router);

// routes/v1/users.ts
router.get('/users', v1UsersController.list); // 旧仕様

// routes/v2/users.ts
router.get('/users', v2UsersController.list); // 新仕様（フォーマット変更等）
```

### 9-2. ヘッダーバージョニング

URLをクリーンに保てるが、キャッシュが効きにくい。

```typescript
// Accept: application/vnd.api+json;version=2
const versionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const accept = req.headers['accept'] || '';
  const match = accept.match(/version=(\d+)/);
  req.apiVersion = match ? Number(match[1]) : 1;
  next();
};
```

### 9-3. 非推奨（Deprecation）の伝え方

古いバージョンを廃止する際は、事前に`Deprecation`ヘッダーで告知する。

```typescript
const deprecationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  res.set('Deprecation', 'true');
  res.set('Sunset', 'Sat, 31 Dec 2026 23:59:59 GMT');
  res.set('Link', '</v2/users>; rel="successor-version"');
  next();
};

app.use('/v1', deprecationMiddleware, v1Router);
```

---

## 10. 認証・認可

### 10-1. Bearer Token（JWT）認証

```typescript
import jwt from 'jsonwebtoken';

// 認証ミドルウェア
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      type: 'https://api.example.com/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Bearer token required',
    });
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; role: string };
    req.user = payload;
    next();
  } catch {
    res.status(401).json({
      type: 'https://api.example.com/errors/invalid-token',
      title: 'Invalid Token',
      status: 401,
      detail: 'Token is expired or invalid',
    });
  }
};

// 権限チェックミドルウェア
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        type: 'https://api.example.com/errors/forbidden',
        title: 'Forbidden',
        status: 403,
        detail: `Required role: ${roles.join(' or ')}`,
      });
    }
    next();
  };
};

// 使用例
router.delete('/users/:id', authenticate, authorize('admin'), deleteUser);
```

### 10-2. API Key認証

```typescript
export const apiKeyAuth = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  const keyRecord = await db.apiKey.findUnique({
    where: { key: apiKey, active: true },
    include: { user: true },
  });

  if (!keyRecord) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  // 最終使用日時を更新
  await db.apiKey.update({
    where: { id: keyRecord.id },
    data: { lastUsedAt: new Date() },
  });

  req.user = keyRecord.user;
  next();
};
```

---

## 11. レート制限

### 11-1. express-rate-limitによる実装

```typescript
import rateLimit from 'express-rate-limit';

// 基本レート制限
export const defaultRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100,                  // 最大100リクエスト
  standardHeaders: true,     // RateLimit-* ヘッダーを返す
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      type: 'https://api.example.com/errors/rate-limit-exceeded',
      title: 'Too Many Requests',
      status: 429,
      detail: 'Rate limit exceeded. Please retry after the indicated time.',
      retryAfter: Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000),
    });
  },
});

// 認証エンドポイント用（より厳しい制限）
export const authRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1時間
  max: 10,                   // 最大10回
  keyGenerator: (req) => req.ip + ':auth',
});

app.use('/api', defaultRateLimit);
app.use('/auth', authRateLimit);
```

レスポンスヘッダーの例:

```
RateLimit-Limit: 100
RateLimit-Remaining: 45
RateLimit-Reset: 2026-02-20T10:15:00Z
Retry-After: 540
```

---

## 12. OpenAPI (Swagger) 仕様書

OpenAPI仕様書を書くことでAPIドキュメントの自動生成と、クライアントSDKの自動生成が可能になる。

```yaml
# openapi.yaml
openapi: 3.1.0
info:
  title: Example API
  version: 1.0.0
  description: REST API設計ベストプラクティスのサンプルAPI

servers:
  - url: https://api.example.com/v1
    description: 本番環境
  - url: http://localhost:3000/v1
    description: ローカル開発環境

security:
  - BearerAuth: []

paths:
  /users:
    get:
      summary: ユーザー一覧取得
      operationId: listUsers
      tags: [Users]
      parameters:
        - name: page
          in: query
          schema: { type: integer, default: 1, minimum: 1 }
        - name: limit
          in: query
          schema: { type: integer, default: 20, minimum: 1, maximum: 100 }
        - name: role
          in: query
          schema: { type: string, enum: [admin, user, moderator] }
      responses:
        '200':
          description: 成功
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items: { $ref: '#/components/schemas/User' }
                  meta: { $ref: '#/components/schemas/PaginationMeta' }
        '401':
          $ref: '#/components/responses/Unauthorized'

    post:
      summary: ユーザー作成
      operationId: createUser
      tags: [Users]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateUserRequest' }
      responses:
        '201':
          description: 作成成功
          headers:
            Location:
              schema: { type: string }
              description: 作成されたリソースのURL
          content:
            application/json:
              schema:
                type: object
                properties:
                  data: { $ref: '#/components/schemas/User' }
        '422':
          $ref: '#/components/responses/ValidationError'

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    User:
      type: object
      properties:
        id: { type: string, format: uuid }
        name: { type: string }
        email: { type: string, format: email }
        role: { type: string, enum: [admin, user] }
        createdAt: { type: string, format: date-time }

    CreateUserRequest:
      type: object
      required: [name, email, password]
      properties:
        name: { type: string, minLength: 2, maxLength: 100 }
        email: { type: string, format: email }
        password: { type: string, minLength: 8 }

    PaginationMeta:
      type: object
      properties:
        total: { type: integer }
        page: { type: integer }
        limit: { type: integer }
        totalPages: { type: integer }
        hasNext: { type: boolean }

    ProblemDetail:
      type: object
      properties:
        type: { type: string, format: uri }
        title: { type: string }
        status: { type: integer }
        detail: { type: string }
        instance: { type: string }

  responses:
    Unauthorized:
      description: 認証エラー
      content:
        application/problem+json:
          schema: { $ref: '#/components/schemas/ProblemDetail' }

    ValidationError:
      description: バリデーションエラー
      content:
        application/problem+json:
          schema:
            allOf:
              - $ref: '#/components/schemas/ProblemDetail'
              - type: object
                properties:
                  errors:
                    type: object
                    additionalProperties:
                      type: array
                      items: { type: string }
```

### 12-1. swagger-ui-expressで自動ドキュメント公開

```typescript
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

const swaggerDocument = YAML.load('./openapi.yaml');

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customSiteTitle: 'API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
  },
}));
```

---

## 13. CORS設定とセキュリティヘッダー

### 13-1. CORSの設定

```typescript
import cors from 'cors';
import helmet from 'helmet';

// CORS設定
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://example.com',
      'https://app.example.com',
      process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '',
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy: origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  credentials: true,
  maxAge: 86400, // プリフライトキャッシュ: 24時間
};

app.use(cors(corsOptions));
```

### 13-2. Helmetでセキュリティヘッダーを設定

```typescript
// セキュリティヘッダーの設定
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1年
    includeSubDomains: true,
    preload: true,
  },
}));

// カスタムセキュリティヘッダー
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('X-Request-ID', crypto.randomUUID()); // リクエストトレーシング
  next();
});
```

### 13-3. 入力サニタイズ

```typescript
import { body, param, validationResult } from 'express-validator';

// バリデーションルールの定義
export const createUserValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2-100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email format'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase and number'),
];

// バリデーション結果チェックミドルウェア
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const errors = result.array().reduce((acc, err) => {
      const field = (err as { path: string }).path;
      if (!acc[field]) acc[field] = [];
      acc[field].push(err.msg);
      return acc;
    }, {} as Record<string, string[]>);

    return res.status(422).json({
      type: 'https://api.example.com/errors/validation-failed',
      title: 'Validation Failed',
      status: 422,
      errors,
    });
  }
  next();
};

// ルートへの適用
router.post('/users', createUserValidation, validate, createUser);
```

---

## まとめ

REST API設計のベストプラクティスを整理する。

| カテゴリ | 重要ポイント |
|---------|-------------|
| **URL設計** | 名詞・複数形・階層は2階層まで |
| **HTTPメソッド** | GET(取得)・POST(作成)・PUT(全置換)・PATCH(部分更新)・DELETE(削除) |
| **ステータスコード** | 200/201/204/400/401/403/404/409/422/429/500を状況に応じて使い分け |
| **エラー形式** | RFC 9457（Problem Details）に準拠して標準化 |
| **ページネーション** | 小規模はオフセット、大規模・リアルタイムはカーソルベース |
| **バージョニング** | URLパス方式（`/v1/`, `/v2/`）が最も実用的 |
| **認証** | Bearer Token（JWT）+ 権限チェックを分離 |
| **レート制限** | `429 Too Many Requests` + `Retry-After`ヘッダー |
| **ドキュメント** | OpenAPI 3.1仕様書を書いて自動生成 |
| **セキュリティ** | CORS・Helmet・入力バリデーションを必ず実装 |

API設計は**一貫性**が最も重要だ。チーム全体でスタイルガイドを定め、レビュープロセスで統一性を担保することで、長期間保守しやすいAPIを実現できる。OpenAPI仕様書を先に書いてから実装する「API-First開発」を採用すると、設計の質がさらに向上する。

---
title: 'REST API設計のベストプラクティス — 実践で使える設計原則15選'
description: 'REST APIの設計原則を実践的に解説。エンドポイント設計、HTTPメソッド、ステータスコード、バージョニング、認証、エラーハンドリングなど、現場で即使える15のベストプラクティスを具体例とともに紹介します。'
pubDate: 'Feb 05 2026'
---

API設計は、後から変更するのが非常に困難です。リリース後に「エンドポイント名を変えたい」「レスポンス構造を変えたい」と思っても、既存のクライアントが壊れてしまいます。この記事では、長期的に保守可能なREST APIを設計するための15のベストプラクティスを解説します。

## 1. リソース指向のURL設計

REST APIのURLは「動詞」ではなく「名詞（リソース）」で表現します。

### ❌ 悪い例

```
GET  /getUsers
POST /createUser
POST /updateUser
POST /deleteUser
```

### ✅ 良い例

```
GET    /users       # ユーザー一覧取得
POST   /users       # ユーザー作成
GET    /users/:id   # 特定ユーザー取得
PUT    /users/:id   # ユーザー更新
DELETE /users/:id   # ユーザー削除
```

**理由:** HTTPメソッド自体が動詞の役割を果たすため、URL内に動詞を含める必要はありません。

## 2. 複数形を使う

リソース名は複数形で統一します。

### ❌ 悪い例

```
GET /user/123
GET /post/456
```

### ✅ 良い例

```
GET /users/123
GET /posts/456
```

**理由:** 一覧取得のエンドポイントが`/users`になるため、単数と複数を混在させるより、すべて複数形に統一する方が一貫性があります。

## 3. ネストしたリソース表現

リソース間の関係性をURLで表現します。

```
GET /users/123/posts           # ユーザー123の投稿一覧
GET /users/123/posts/456       # ユーザー123の投稿456
GET /posts/456/comments        # 投稿456のコメント一覧
POST /posts/456/comments       # 投稿456に新しいコメントを追加
```

**注意:** ネストは2階層までに留めましょう。

```
# ❌ 深すぎるネスト
GET /users/123/posts/456/comments/789/likes

# ✅ シンプルに
GET /comments/789/likes
```

## 4. HTTPメソッドの正しい使い分け

| メソッド | 用途 | 冪等性 | 安全 |
|---------|------|--------|------|
| GET | リソース取得 | ✅ | ✅ |
| POST | リソース作成 | ❌ | ❌ |
| PUT | リソース全体更新・作成 | ✅ | ❌ |
| PATCH | リソース部分更新 | ❌ | ❌ |
| DELETE | リソース削除 | ✅ | ❌ |

### 冪等性とは

同じリクエストを複数回実行しても、結果が変わらない性質。

```javascript
// GET - 冪等（何度実行しても同じ結果）
GET /users/123

// POST - 非冪等（実行するたびに新しいリソースが作成される）
POST /users { "name": "Tanaka" }

// PUT - 冪等（何度実行しても同じ状態になる）
PUT /users/123 { "name": "Suzuki", "email": "suzuki@example.com" }

// DELETE - 冪等（1回目で削除、2回目以降は404だが状態は同じ）
DELETE /users/123
```

### PUTとPATCHの違い

```javascript
// PUT - リソース全体を置き換える
PUT /users/123
{
  "name": "Tanaka",
  "email": "tanaka@example.com",
  "age": 30
}
// 既存のすべてのフィールドを上書き

// PATCH - 指定したフィールドのみ更新
PATCH /users/123
{
  "email": "newemail@example.com"
}
// nameとageは変更されない
```

## 5. 適切なHTTPステータスコードを返す

### 成功系（2xx）

| コード | 意味 | 使用例 |
|-------|------|--------|
| 200 OK | 成功 | GET, PUT, PATCHの成功 |
| 201 Created | リソース作成成功 | POSTで新規作成 |
| 204 No Content | 成功だが返すコンテンツなし | DELETE成功時 |

### クライアントエラー（4xx）

| コード | 意味 | 使用例 |
|-------|------|--------|
| 400 Bad Request | リクエストが不正 | バリデーションエラー |
| 401 Unauthorized | 認証が必要 | トークンなし・無効 |
| 403 Forbidden | 権限がない | 認証済みだがアクセス権なし |
| 404 Not Found | リソースが見つからない | 存在しないIDを指定 |
| 409 Conflict | リソースの競合 | 既に存在するメールアドレス |
| 422 Unprocessable Entity | 処理不可能 | ビジネスロジックエラー |
| 429 Too Many Requests | レート制限超過 | APIコール上限到達 |

### サーバーエラー（5xx）

| コード | 意味 | 使用例 |
|-------|------|--------|
| 500 Internal Server Error | サーバー内部エラー | 予期しない例外 |
| 503 Service Unavailable | サービス利用不可 | メンテナンス中 |

### 実装例

```typescript
// Express + TypeScript
app.post('/users', async (req, res) => {
  try {
    const { email, name } = req.body;

    // バリデーション
    if (!email || !name) {
      return res.status(400).json({
        error: 'email and name are required'
      });
    }

    // 既存チェック
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        error: 'User with this email already exists'
      });
    }

    // 作成
    const user = await User.create({ email, name });

    // 201 Createdで返す
    return res.status(201).json(user);

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});
```

## 6. 一貫したエラーレスポンス

エラーレスポンスの形式を統一します。

```typescript
// エラーレスポンスの型定義
type ErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: any;
  };
};

// 実装例
res.status(400).json({
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid request parameters',
    details: {
      email: 'Email format is invalid',
      age: 'Age must be a number',
    },
  },
});

// 別の例
res.status(401).json({
  error: {
    code: 'UNAUTHORIZED',
    message: 'Authentication token is missing or invalid',
  },
});
```

## 7. バージョニング

APIは必ず将来変更されます。破壊的変更を安全に行うためにバージョニングが必須です。

### 方法1: URLパスにバージョンを含める（推奨）

```
GET /v1/users
GET /v2/users
```

**メリット:** 明確で分かりやすい、ブラウザでもテスト可能

### 方法2: ヘッダーでバージョン指定

```
GET /users
Header: Accept: application/vnd.myapi.v2+json
```

**メリット:** URLが綺麗、RESTの原則に近い

### 方法3: クエリパラメータ

```
GET /users?version=2
```

**メリット:** 簡単に実装できる

**推奨:** 方法1（URLパス）が最もシンプルで明確です。

### バージョンアップの原則

```typescript
// v1 - 既存のレスポンス
{
  "id": 1,
  "name": "Tanaka",
  "email": "tanaka@example.com"
}

// v2 - フィールド追加（後方互換性あり = バージョンアップ不要）
{
  "id": 1,
  "name": "Tanaka",
  "email": "tanaka@example.com",
  "createdAt": "2026-02-05T10:00:00Z"  // 追加
}

// v2 - フィールド削除・変更（破壊的変更 = バージョンアップ必要）
{
  "id": 1,
  "fullName": "Tanaka Taro",  // nameから変更
  "email": "tanaka@example.com"
}
```

## 8. ページネーション

大量のデータを返すエンドポイントには必ずページネーションを実装します。

### 方法1: Offset-based（ページ番号指定）

```
GET /users?page=2&limit=20
```

**レスポンス:**

```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### 方法2: Cursor-based（カーソルベース）

```
GET /users?cursor=abc123&limit=20
```

**レスポンス:**

```json
{
  "data": [...],
  "pagination": {
    "nextCursor": "xyz789",
    "hasMore": true
  }
}
```

**Cursor-basedのメリット:**
- 新しいデータが追加されても、ページがズレない
- 大規模データセットでパフォーマンスが良い
- 無限スクロールに最適

**実装例:**

```typescript
// Express + Prisma
app.get('/posts', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const cursor = req.query.cursor as string | undefined;

  const posts = await prisma.post.findMany({
    take: limit + 1, // +1で次があるか判定
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1, // カーソル自体をスキップ
    }),
    orderBy: { createdAt: 'desc' },
  });

  const hasMore = posts.length > limit;
  const data = hasMore ? posts.slice(0, -1) : posts;

  res.json({
    data,
    pagination: {
      nextCursor: hasMore ? data[data.length - 1].id : null,
      hasMore,
    },
  });
});
```

## 9. フィルタリング・ソート・検索

```
# フィルタリング
GET /users?status=active&role=admin

# ソート
GET /posts?sort=createdAt&order=desc

# 検索
GET /posts?search=typescript

# 組み合わせ
GET /posts?category=tech&sort=views&order=desc&limit=10
```

**実装例:**

```typescript
app.get('/posts', async (req, res) => {
  const { category, sort, order, search, limit } = req.query;

  const where: any = {};

  if (category) {
    where.category = category;
  }

  if (search) {
    where.title = {
      contains: search,
      mode: 'insensitive', // 大文字小文字を区別しない
    };
  }

  const posts = await prisma.post.findMany({
    where,
    orderBy: sort ? { [sort as string]: order || 'asc' } : undefined,
    take: limit ? parseInt(limit as string) : 50,
  });

  res.json(posts);
});
```

## 10. レスポンスのフィールド選択

大きなオブジェクトを返す際、クライアントが必要なフィールドだけを選択できるようにします。

```
# 特定フィールドのみ返す
GET /users/123?fields=id,name,email

# ネストしたリソースも含める
GET /users/123?include=posts,comments
```

**実装例:**

```typescript
app.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { fields, include } = req.query;

  const select: any = {};

  // fieldsパラメータがあれば、指定されたフィールドのみ選択
  if (fields) {
    const fieldList = (fields as string).split(',');
    fieldList.forEach(field => {
      select[field] = true;
    });
  }

  const includeRelations: any = {};

  // includeパラメータがあれば、関連リソースを含める
  if (include) {
    const includeList = (include as string).split(',');
    includeList.forEach(relation => {
      includeRelations[relation] = true;
    });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    ...(Object.keys(select).length > 0 && { select }),
    ...(Object.keys(includeRelations).length > 0 && { include: includeRelations }),
  });

  res.json(user);
});
```

## 11. HATEOAS（Hypermedia as the Engine of Application State）

レスポンスに関連リソースへのリンクを含めます。

```json
{
  "id": 123,
  "name": "Tanaka",
  "email": "tanaka@example.com",
  "links": {
    "self": "/users/123",
    "posts": "/users/123/posts",
    "followers": "/users/123/followers"
  }
}
```

完全なHATEOASは実装コストが高いため、重要なリンクのみ含めるのが現実的です。

## 12. レート制限

APIの過度な使用を防ぐため、レート制限を実装します。

```
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1643723400
```

制限超過時:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 3600

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "API rate limit exceeded. Try again in 1 hour."
  }
}
```

**実装例（express-rate-limit）:**

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 15分あたり100リクエストまで
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
    },
  },
  standardHeaders: true, // X-RateLimit-* ヘッダーを返す
  legacyHeaders: false,
});

app.use('/api/', limiter);
```

## 13. 認証とセキュリティ

### Bearer Token（JWT）

```
GET /users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**実装例:**

```typescript
import jwt from 'jsonwebtoken';

// 認証ミドルウェア
function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded; // ユーザー情報をリクエストに追加
    next();
  } catch (error) {
    return res.status(401).json({
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }
    });
  }
}

// 使用例
app.get('/users/me', authenticate, (req, res) => {
  res.json(req.user);
});
```

### API Key

```
GET /data
X-API-Key: your-api-key-here
```

簡易的な認証に使えますが、JWTの方が安全です。

## 14. CORS設定

フロントエンドからAPIを呼び出す場合、CORS設定が必要です。

```typescript
import cors from 'cors';

// 開発環境
app.use(cors());

// 本番環境（特定のオリジンのみ許可）
app.use(cors({
  origin: ['https://yourdomain.com', 'https://app.yourdomain.com'],
  credentials: true, // Cookieを許可
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

## 15. APIドキュメント

APIは必ずドキュメント化しましょう。

### OpenAPI (Swagger)

```yaml
openapi: 3.0.0
info:
  title: My API
  version: 1.0.0
paths:
  /users:
    get:
      summary: Get all users
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
        email:
          type: string
```

**ツール:**
- Swagger UI - インタラクティブなドキュメント
- Redoc - 美しいドキュメント
- Postman - API開発・テスト

## まとめ

REST API設計のベストプラクティス15選:

1. リソース指向のURL
2. 複数形で統一
3. ネストしたリソース表現
4. HTTPメソッドの正しい使い分け
5. 適切なステータスコード
6. 一貫したエラーレスポンス
7. バージョニング
8. ページネーション
9. フィルタリング・ソート
10. フィールド選択
11. HATEOAS
12. レート制限
13. 認証とセキュリティ
14. CORS設定
15. APIドキュメント

これらを実践することで、長期的に保守可能で、使いやすいAPIを設計できます。すべてを一度に実装する必要はありません。プロジェクトの規模や要件に合わせて、優先度の高いものから取り入れていきましょう。

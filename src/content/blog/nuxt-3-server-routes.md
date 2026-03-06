---
title: 'Nuxt 3 Server Routes完全ガイド'
description: 'Nuxt 3のServer Routesを使ったAPI設計の実践方法。ルーティング、ミドルウェア、バリデーション、認証、エラーハンドリング、Nitroエンジン統合を詳しく解説します。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。'
pubDate: 'Feb 06 2026'
tags: ['Nuxt 3', 'Vue.js', 'API', 'TypeScript', 'Nitro']
---
# Nuxt 3 Server Routes完全ガイド

Nuxt 3は、フロントエンドとバックエンドを統合したフルスタックフレームワークです。Server Routesを使えば、APIエンドポイントをNuxtアプリケーション内に直接実装でき、開発効率が大幅に向上します。

この記事では、Nuxt 3のServer Routesの基本から、実践的なAPI設計、認証、バリデーション、Nitroエンジンとの統合まで詳しく解説します。

## Server Routesの基本

### ファイルベースルーティング

Nuxt 3のServer Routesは、`server/api/`ディレクトリにファイルを配置するだけで自動的にAPIエンドポイントが作成されます。

```
server/
├── api/
│   ├── hello.ts              → /api/hello
│   ├── users/
│   │   ├── index.ts          → /api/users
│   │   ├── [id].ts           → /api/users/:id
│   │   └── [id]/posts.ts     → /api/users/:id/posts
│   └── posts/
│       ├── index.ts          → /api/posts
│       └── [slug].ts         → /api/posts/:slug
```

### 基本的なエンドポイント

```typescript
// server/api/hello.ts
export default defineEventHandler((event) => {
  return {
    message: 'Hello from Nuxt 3 API!',
    timestamp: new Date().toISOString(),
  }
})
```

### HTTPメソッド

```typescript
// server/api/users/index.ts
export default defineEventHandler(async (event) => {
  const method = event.method

  if (method === 'GET') {
    // ユーザー一覧を取得
    return await getUsers()
  }

  if (method === 'POST') {
    // 新規ユーザー作成
    const body = await readBody(event)
    return await createUser(body)
  }

  // その他のメソッドは405エラー
  throw createError({
    statusCode: 405,
    statusMessage: 'Method Not Allowed',
  })
})
```

メソッド別にファイルを分けることもできます。

```typescript
// server/api/users/index.get.ts
export default defineEventHandler(async (event) => {
  return await getUsers()
})

// server/api/users/index.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  return await createUser(body)
})

// server/api/users/[id].get.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  return await getUser(id)
})

// server/api/users/[id].put.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  return await updateUser(id, body)
})

// server/api/users/[id].delete.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  await deleteUser(id)
  return { success: true }
})
```

## リクエスト処理

### パラメータ取得

```typescript
// server/api/posts/[slug].get.ts
export default defineEventHandler(async (event) => {
  // URLパラメータ
  const slug = getRouterParam(event, 'slug')

  // クエリパラメータ
  const query = getQuery(event)
  const { page = 1, limit = 10 } = query

  // ヘッダー
  const headers = getHeaders(event)
  const authorization = getHeader(event, 'authorization')

  // リクエストURL
  const url = getRequestURL(event)

  const post = await getPost(slug)

  if (!post) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Post not found',
    })
  }

  return post
})
```

### リクエストボディ

```typescript
// server/api/posts/index.post.ts
export default defineEventHandler(async (event) => {
  // JSONボディを取得
  const body = await readBody(event)

  // FormDataを取得
  const formData = await readFormData(event)

  // マルチパートデータ（ファイルアップロード）
  const files = await readMultipartFormData(event)

  return await createPost(body)
})
```

### レスポンス設定

```typescript
// server/api/users/index.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const user = await createUser(body)

  // ステータスコード設定
  setResponseStatus(event, 201)

  // ヘッダー設定
  setHeader(event, 'X-User-Id', user.id)
  setHeaders(event, {
    'X-Total-Count': '1',
    'Cache-Control': 'no-cache',
  })

  // クッキー設定
  setCookie(event, 'session', user.sessionId, {
    httpOnly: true,
    secure: true,
    maxAge: 60 * 60 * 24 * 7, // 1週間
  })

  return user
})
```

## バリデーション

### Zodを使った型安全なバリデーション

```typescript
// server/api/users/index.post.ts
import { z } from 'zod'

const userSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  age: z.number().int().min(18).max(120).optional(),
  role: z.enum(['user', 'admin']).default('user'),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // バリデーション
  const result = userSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: result.error.format(),
    })
  }

  const validatedData = result.data
  return await createUser(validatedData)
})
```

### カスタムバリデーション関数

```typescript
// server/utils/validation.ts
import { z } from 'zod'

export async function validateBody<T>(
  event: any,
  schema: z.ZodSchema<T>
): Promise<T> {
  const body = await readBody(event)
  const result = schema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: result.error.format(),
    })
  }

  return result.data
}

// 使用例
// server/api/posts/index.post.ts
import { postSchema } from '~/schemas/post'

export default defineEventHandler(async (event) => {
  const data = await validateBody(event, postSchema)
  return await createPost(data)
})
```

### クエリパラメータのバリデーション

```typescript
// server/api/posts/index.get.ts
import { z } from 'zod'

const querySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).default('10'),
  sort: z.enum(['created', 'updated', 'title']).default('created'),
  order: z.enum(['asc', 'desc']).default('desc'),
})

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const validated = querySchema.parse(query)

  const posts = await getPosts({
    page: validated.page,
    limit: validated.limit,
    sort: validated.sort,
    order: validated.order,
  })

  return {
    data: posts,
    pagination: {
      page: validated.page,
      limit: validated.limit,
      total: await getPostsCount(),
    },
  }
})
```

## 認証・認可

### JWTベース認証

```typescript
// server/utils/auth.ts
import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET!

export function generateToken(userId: string) {
  return jwt.sign({ userId }, SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, SECRET) as { userId: string }
  } catch {
    return null
  }
}

export async function requireAuth(event: any) {
  const authorization = getHeader(event, 'authorization')

  if (!authorization?.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const token = authorization.slice(7)
  const payload = verifyToken(token)

  if (!payload) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid token',
    })
  }

  const user = await getUser(payload.userId)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'User not found',
    })
  }

  return user
}
```

### ログインエンドポイント

```typescript
// server/api/auth/login.post.ts
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export default defineEventHandler(async (event) => {
  const { email, password } = await validateBody(event, loginSchema)

  const user = await getUserByEmail(email)

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid credentials',
    })
  }

  const token = generateToken(user.id)

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  }
})
```

### 保護されたエンドポイント

```typescript
// server/api/profile.get.ts
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  }
})
```

### ロールベースアクセス制御

```typescript
// server/utils/auth.ts
export async function requireRole(event: any, allowedRoles: string[]) {
  const user = await requireAuth(event)

  if (!allowedRoles.includes(user.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
    })
  }

  return user
}

// server/api/admin/users.get.ts
export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])

  return await getAllUsers()
})
```

## ミドルウェア

### グローバルミドルウェア

```typescript
// server/middleware/log.ts
export default defineEventHandler((event) => {
  console.log(`[${event.method}] ${event.path}`)
})
```

### CORS設定

```typescript
// server/middleware/cors.ts
export default defineEventHandler((event) => {
  const origin = getHeader(event, 'origin')
  const allowedOrigins = ['https://example.com', 'http://localhost:3000']

  if (origin && allowedOrigins.includes(origin)) {
    setHeaders(event, {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    })
  }

  // OPTIONSリクエストの処理
  if (event.method === 'OPTIONS') {
    setResponseStatus(event, 204)
    return ''
  }
})
```

### レート制限

```typescript
// server/middleware/rateLimit.ts
const requests = new Map<string, number[]>()

export default defineEventHandler((event) => {
  const ip = getHeader(event, 'x-forwarded-for') || 'unknown'
  const now = Date.now()
  const windowMs = 60000 // 1分
  const maxRequests = 100

  const timestamps = requests.get(ip) || []
  const recentTimestamps = timestamps.filter((t) => now - t < windowMs)

  if (recentTimestamps.length >= maxRequests) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
    })
  }

  recentTimestamps.push(now)
  requests.set(ip, recentTimestamps)
})
```

## データベース統合

### Prisma統合

```typescript
// server/utils/db.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export { prisma }

// server/api/posts/index.get.ts
export default defineEventHandler(async (event) => {
  const posts = await prisma.post.findMany({
    include: {
      author: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return posts
})

// server/api/posts/[id].get.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: true,
      comments: {
        include: {
          author: true,
        },
      },
    },
  })

  if (!post) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Post not found',
    })
  }

  return post
})
```

### Drizzle ORM統合

```typescript
// server/utils/db.ts
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '~/server/db/schema'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export const db = drizzle(pool, { schema })

// server/api/users/index.get.ts
import { eq } from 'drizzle-orm'
import { users } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  const allUsers = await db.select().from(users)
  return allUsers
})

// server/api/users/[id].get.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!

  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
    with: {
      posts: true,
    },
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found',
    })
  }

  return user
})
```

## エラーハンドリング

### カスタムエラー

```typescript
// server/utils/errors.ts
export class NotFoundError extends Error {
  statusCode = 404
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends Error {
  statusCode = 400
  constructor(message: string, public errors: any) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401
  constructor(message: string) {
    super(message)
    this.name = 'UnauthorizedError'
  }
}
```

### エラーハンドラミドルウェア

```typescript
// server/middleware/errorHandler.ts
export default defineEventHandler((event) => {
  event.node.res.on('finish', () => {
    const statusCode = event.node.res.statusCode

    if (statusCode >= 400) {
      console.error({
        method: event.method,
        path: event.path,
        statusCode,
        timestamp: new Date().toISOString(),
      })
    }
  })
})
```

### グローバルエラーハンドリング

```typescript
// server/api/posts/[id].get.ts
export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')!
    const post = await getPost(id)

    if (!post) {
      throw new NotFoundError('Post not found')
    }

    return post
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw createError({
        statusCode: error.statusCode,
        statusMessage: error.message,
      })
    }

    console.error('Unexpected error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
    })
  }
})
```

## キャッシュ戦略

### 単純なキャッシュ

```typescript
// server/api/posts/index.get.ts
export default cachedEventHandler(
  async (event) => {
    return await getPosts()
  },
  {
    maxAge: 60 * 5, // 5分キャッシュ
  }
)
```

### キャッシュキーのカスタマイズ

```typescript
// server/api/posts/index.get.ts
export default cachedEventHandler(
  async (event) => {
    const query = getQuery(event)
    return await getPosts(query)
  },
  {
    maxAge: 60 * 5,
    getKey: (event) => {
      const query = getQuery(event)
      return `posts:${query.page}:${query.limit}`
    },
  }
)
```

### キャッシュ無効化

```typescript
// server/api/posts/index.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const post = await createPost(body)

  // キャッシュをクリア
  await useStorage('cache').removeItem('posts')

  return post
})
```

## まとめ

Nuxt 3のServer Routesを使えば、フルスタックアプリケーションを効率的に構築できます。

主なポイント:

- **ファイルベースルーティング**: 直感的なAPI設計
- **型安全**: TypeScriptとZodによる完全な型安全性
- **認証**: JWT、セッション、ロールベースアクセス制御
- **バリデーション**: Zodによる堅牢なデータ検証
- **ミドルウェア**: CORS、レート制限、ログ
- **データベース**: Prisma、Drizzleとのシームレスな統合
- **エラーハンドリング**: カスタムエラーとグローバルハンドリング
- **キャッシュ**: 柔軟なキャッシュ戦略

Nitroエンジンにより、高速で効率的なサーバーサイド処理が実現され、本番環境でもスケーラブルなアプリケーションを構築できます。

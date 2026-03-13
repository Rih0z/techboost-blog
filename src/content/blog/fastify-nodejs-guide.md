---
title: 'Fastify完全ガイド: Node.js最速フレームワークでAPIを構築'
description: 'FastifyでハイパフォーマンスなNode.js APIを構築する実践ガイド。プラグインシステム、バリデーション、認証、デプロイまで網羅。ExpressやHonoとの比較も解説。'
pubDate: '2025-11-29'
updatedDate: 'Nov 29 2025'
tags: ['Fastify', 'Node.js', 'API', 'Backend', 'TypeScript']
heroImage: '../../assets/thumbnails/fastify-nodejs-guide.jpg'
---

Fastifyは、Node.js向けの高速・低オーバーヘッドなWebフレームワークです。Expressの約2倍の性能を誇り、TypeScriptとの親和性も高いため、モダンなAPI開発に最適です。この記事では、基礎から本番運用まで実践的に解説します。

## Fastifyの特徴

### 主な利点

1. **高速** - Express比で約2倍、素のNode.jsに近いパフォーマンス
2. **低オーバーヘッド** - 最小限のメモリ使用量
3. **スキーマベース** - JSON Schemaによる自動バリデーション
4. **プラグインアーキテクチャ** - 拡張性と保守性が高い
5. **TypeScript完全サポート** - 型安全なAPI開発
6. **ロギング** - 高速なPinoロガーを標準搭載

### Express / Hono / Koaとの比較

| フレームワーク | リクエスト/秒 | オーバーヘッド | TypeScript | 学習コスト |
|-------------|------------|------------|------------|----------|
| Fastify | 高 (76,000) | 低 | ✅ 完全対応 | 中 |
| Express | 低 (38,000) | 中 | 型定義あり | 低 |
| Hono | 高 (134,000) | 極低 | ✅ 完全対応 | 低 |
| Koa | 中 (50,000) | 低 | 型定義あり | 中 |

※ ベンチマーク値は環境により変動します

## セットアップ

### インストール

```bash
# プロジェクト作成
npm init -y

# Fastifyとその他依存関係
npm install fastify
npm install -D typescript @types/node tsx

# TypeScript設定
npx tsc --init
```

### TypeScript設定

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### 基本的なサーバー

```typescript
// src/index.ts
import Fastify from 'fastify'

const fastify = Fastify({
  logger: true
})

// ルート定義
fastify.get('/ping', async (request, reply) => {
  return { pong: 'it worked!' }
})

// サーバー起動
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
```

```bash
# 実行
npx tsx src/index.ts

# ビルド & 実行
npm run build
node dist/index.js
```

## ルーティング

### 基本的なルート

```typescript
// GET
fastify.get('/users', async (request, reply) => {
  return { users: [] }
})

// POST
fastify.post('/users', async (request, reply) => {
  const body = request.body
  return { success: true, data: body }
})

// PUT
fastify.put('/users/:id', async (request, reply) => {
  const { id } = request.params as { id: string }
  const body = request.body
  return { id, ...body }
})

// DELETE
fastify.delete('/users/:id', async (request, reply) => {
  const { id } = request.params as { id: string }
  return { deleted: id }
})

// PATCH
fastify.patch('/users/:id', async (request, reply) => {
  const { id } = request.params as { id: string }
  const body = request.body
  return { id, updated: body }
})
```

### 型安全なルート定義

```typescript
import { FastifyRequest, FastifyReply } from 'fastify'

// 型定義
interface GetUserParams {
  id: string
}

interface CreateUserBody {
  name: string
  email: string
}

// ルートハンドラー
fastify.get<{ Params: GetUserParams }>(
  '/users/:id',
  async (request, reply) => {
    const { id } = request.params // 型推論される
    return { id, name: 'John Doe' }
  }
)

fastify.post<{ Body: CreateUserBody }>(
  '/users',
  async (request, reply) => {
    const { name, email } = request.body // 型推論される
    return { id: '123', name, email }
  }
)
```

### ルートグループ化

```typescript
// プレフィックス付きグループ
fastify.register(async (instance) => {
  instance.get('/list', async () => {
    return { users: [] }
  })

  instance.get('/:id', async (request) => {
    const { id } = request.params as { id: string }
    return { id, name: 'User' }
  })
}, { prefix: '/users' })

// 別ファイルでのルート定義
// src/routes/users.ts
import { FastifyInstance } from 'fastify'

export async function userRoutes(fastify: FastifyInstance) {
  fastify.get('/', async () => {
    return { users: [] }
  })

  fastify.post('/', async (request) => {
    return { created: true }
  })
}

// src/index.ts
import { userRoutes } from './routes/users'

fastify.register(userRoutes, { prefix: '/api/users' })
```

## スキーマバリデーション

### JSON Schemaでのバリデーション

```typescript
const createUserSchema = {
  body: {
    type: 'object',
    required: ['name', 'email'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 100 },
      email: { type: 'string', format: 'email' },
      age: { type: 'integer', minimum: 0, maximum: 150 }
    }
  },
  response: {
    201: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' },
        age: { type: 'integer' }
      }
    }
  }
}

fastify.post('/users', { schema: createUserSchema }, async (request, reply) => {
  const user = request.body as { name: string; email: string; age?: number }

  // バリデーション済み
  const newUser = {
    id: Math.random().toString(36),
    ...user
  }

  reply.code(201)
  return newUser
})
```

### TypeBoxでの型安全なスキーマ

```typescript
import { Type, Static } from '@sinclair/typebox'

// スキーマ定義
const UserSchema = Type.Object({
  id: Type.String(),
  name: Type.String({ minLength: 1 }),
  email: Type.String({ format: 'email' }),
  age: Type.Optional(Type.Integer({ minimum: 0 }))
})

type User = Static<typeof UserSchema>

const CreateUserSchema = Type.Object({
  name: Type.String({ minLength: 1 }),
  email: Type.String({ format: 'email' }),
  age: Type.Optional(Type.Integer({ minimum: 0 }))
})

type CreateUser = Static<typeof CreateUserSchema>

// ルート定義
fastify.post<{ Body: CreateUser, Reply: User }>(
  '/users',
  {
    schema: {
      body: CreateUserSchema,
      response: {
        201: UserSchema
      }
    }
  },
  async (request, reply) => {
    const userData = request.body // CreateUser型
    const newUser: User = {
      id: Math.random().toString(36),
      ...userData
    }

    reply.code(201)
    return newUser // User型
  }
)
```

## プラグインシステム

### カスタムプラグインの作成

```typescript
// src/plugins/database.ts
import fp from 'fastify-plugin'
import { Pool } from 'pg'

declare module 'fastify' {
  interface FastifyInstance {
    db: Pool
  }
}

export default fp(async (fastify, opts) => {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  })

  // プラグインのクリーンアップ
  fastify.addHook('onClose', async () => {
    await pool.end()
  })

  // インスタンスにデコレート
  fastify.decorate('db', pool)
})
```

```typescript
// src/index.ts
import databasePlugin from './plugins/database'

fastify.register(databasePlugin)

// ルートでの使用
fastify.get('/users', async (request, reply) => {
  const result = await fastify.db.query('SELECT * FROM users')
  return result.rows
})
```

### デコレータ

```typescript
// リクエストデコレータ
fastify.decorateRequest('currentUser', null)

declare module 'fastify' {
  interface FastifyRequest {
    currentUser: { id: string; name: string } | null
  }
}

// フックで使用
fastify.addHook('preHandler', async (request, reply) => {
  // 認証ロジック
  request.currentUser = { id: '123', name: 'John' }
})

// ルートで使用
fastify.get('/me', async (request, reply) => {
  if (!request.currentUser) {
    return reply.code(401).send({ error: 'Unauthorized' })
  }
  return request.currentUser
})
```

## 認証

### JWT認証

```typescript
import fastifyJwt from '@fastify/jwt'

// プラグイン登録
fastify.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || 'supersecret'
})

// ログイン
fastify.post<{ Body: { email: string; password: string } }>(
  '/login',
  async (request, reply) => {
    const { email, password } = request.body

    // ユーザー検証（例）
    const user = await validateUser(email, password)
    if (!user) {
      return reply.code(401).send({ error: 'Invalid credentials' })
    }

    // JWT発行
    const token = fastify.jwt.sign({ id: user.id, email: user.email })
    return { token }
  }
)

// 認証が必要なルート
fastify.get(
  '/profile',
  {
    preHandler: async (request, reply) => {
      try {
        await request.jwtVerify()
      } catch (err) {
        reply.send(err)
      }
    }
  },
  async (request, reply) => {
    return { user: request.user }
  }
)
```

### 再利用可能な認証フック

```typescript
// src/hooks/auth.ts
import { FastifyRequest, FastifyReply } from 'fastify'

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' })
  }
}

// 使用
import { authenticate } from './hooks/auth'

fastify.get('/protected', { preHandler: authenticate }, async (request) => {
  return { message: 'Protected data', user: request.user }
})
```

## エラーハンドリング

### カスタムエラーハンドラー

```typescript
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error)

  // バリデーションエラー
  if (error.validation) {
    return reply.code(400).send({
      error: 'Validation Error',
      details: error.validation
    })
  }

  // JWT エラー
  if (error.statusCode === 401) {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: error.message
    })
  }

  // 500エラー
  reply.code(error.statusCode || 500).send({
    error: 'Internal Server Error',
    message: error.message
  })
})
```

### カスタムエラークラス

```typescript
class NotFoundError extends Error {
  statusCode = 404

  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

// 使用
fastify.get('/users/:id', async (request, reply) => {
  const { id } = request.params as { id: string }
  const user = await findUser(id)

  if (!user) {
    throw new NotFoundError(`User ${id} not found`)
  }

  return user
})
```

## データベース統合

### Prisma

```typescript
// src/plugins/prisma.ts
import fp from 'fastify-plugin'
import { PrismaClient } from '@prisma/client'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

export default fp(async (fastify) => {
  const prisma = new PrismaClient()

  await prisma.$connect()

  fastify.decorate('prisma', prisma)

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect()
  })
})
```

```typescript
// 使用
import prismaPlugin from './plugins/prisma'

fastify.register(prismaPlugin)

fastify.get('/users', async (request, reply) => {
  const users = await fastify.prisma.user.findMany()
  return users
})

fastify.post('/users', async (request, reply) => {
  const data = request.body as { name: string; email: string }
  const user = await fastify.prisma.user.create({ data })
  reply.code(201)
  return user
})
```

## テスト

### ユニットテスト

```typescript
// src/app.ts
import Fastify from 'fastify'
import { userRoutes } from './routes/users'

export function buildApp() {
  const app = Fastify()
  app.register(userRoutes, { prefix: '/api/users' })
  return app
}
```

```typescript
// src/app.test.ts
import { test } from 'tap'
import { buildApp } from './app'

test('GET /api/users returns user list', async (t) => {
  const app = buildApp()

  const response = await app.inject({
    method: 'GET',
    url: '/api/users'
  })

  t.equal(response.statusCode, 200)
  t.same(JSON.parse(response.payload), { users: [] })
})

test('POST /api/users creates user', async (t) => {
  const app = buildApp()

  const response = await app.inject({
    method: 'POST',
    url: '/api/users',
    payload: {
      name: 'John Doe',
      email: 'john@example.com'
    }
  })

  t.equal(response.statusCode, 201)
  const body = JSON.parse(response.payload)
  t.ok(body.id)
  t.equal(body.name, 'John Doe')
})
```

## 本番運用

### 環境変数管理

```typescript
// src/config/env.ts
import { Type, Static } from '@sinclair/typebox'
import Ajv from 'ajv'

const envSchema = Type.Object({
  NODE_ENV: Type.String({ default: 'development' }),
  PORT: Type.Number({ default: 3000 }),
  HOST: Type.String({ default: '0.0.0.0' }),
  DATABASE_URL: Type.String(),
  JWT_SECRET: Type.String(),
  LOG_LEVEL: Type.Union([
    Type.Literal('fatal'),
    Type.Literal('error'),
    Type.Literal('warn'),
    Type.Literal('info'),
    Type.Literal('debug'),
    Type.Literal('trace')
  ], { default: 'info' })
})

type Env = Static<typeof envSchema>

const ajv = new Ajv({ coerceTypes: true, useDefaults: true, removeAdditional: true })
const validate = ajv.compile(envSchema)

const env = { ...process.env }
if (!validate(env)) {
  throw new Error(`Invalid environment: ${JSON.stringify(validate.errors)}`)
}

export default env as Env
```

### Dockerデプロイ

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/mydb
      - JWT_SECRET=supersecret
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=mydb
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## まとめ

Fastifyは、以下のようなプロジェクトに最適です。

### 適しているケース

- **ハイパフォーマンスAPI** - リアルタイム、高トラフィック
- **マイクロサービス** - 低オーバーヘッドで複数サービス構築
- **TypeScriptプロジェクト** - 型安全性が重要
- **スキーマベース開発** - 自動バリデーション・ドキュメント生成

### Expressからの移行

Fastifyは、Expressの約2倍の性能とTypeScript完全対応により、モダンなNode.js API開発のデファクトスタンダードになりつつあります。プラグインシステムとスキーマバリデーションにより、保守性の高いAPIを効率的に構築できます。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)

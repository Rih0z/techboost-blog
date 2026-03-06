---
title: 'ElysiaJS完全ガイド2026｜Bun最速フレームワークの実装パターン・プラグイン・デプロイ'
description: 'ElysiaJSの基本から実践まで解説。Bunネイティブの超高速Webフレームワーク、型安全なルーティング、プラグインシステム、バリデーション、認証、WebSocket対応まで。'
pubDate: '2026-03-05'
tags: ['ElysiaJS', 'Bun', 'TypeScript', 'バックエンド', 'Web開発']
---

## ElysiaJSとは

ElysiaJSはBunランタイム上で動作するTypeScriptファーストのWebフレームワークだ。Express.jsやFastifyと同じHTTPサーバーフレームワークの領域だが、Bunのネイティブ機能を最大限活用することで桁違いのパフォーマンスを実現している。

特徴は大きく3つある。

- **エンドツーエンドの型安全性** — ルート定義からバリデーション、レスポンスまで型が途切れない
- **宣言的なAPI設計** — メソッドチェーンでルーティング、バリデーション、フックを記述
- **プラグインによる拡張** — CORS、Swagger、JWT、GraphQLなど公式プラグインが豊富

### フレームワーク比較

| 特性 | ElysiaJS | Express.js | Fastify | Hono |
|------|----------|------------|---------|------|
| ランタイム | Bun | Node.js | Node.js | マルチ |
| 型安全性 | ネイティブ | なし | スキーマ経由 | 部分的 |
| バリデーション | 組み込み（TypeBox） | 外部ライブラリ | JSON Schema | Zod等 |
| リクエスト/秒（単純GET） | ~320,000 | ~15,000 | ~70,000 | ~200,000 |
| WebSocket | 組み込み | ws別途 | 別途 | アダプタ依存 |
| Swagger自動生成 | プラグイン1行 | swagger-jsdoc等 | fastify-swagger | 別途 |
| 学習コスト | 低い | 低い | 中程度 | 低い |

ベンチマーク値は環境により変動するが、ElysiaJSがBunのHTTPサーバーをほぼ直接利用するためオーバーヘッドが極めて小さい点は一貫している。

### なぜElysiaJSを選ぶのか

Express.jsは依然としてエコシステムが最大だが、パフォーマンスとTypeScript対応では2026年の基準を満たさない場面が増えている。FastifyはNode.js圏では高速だがBunの速度には届かない。HonoはマルチランタイムでCloudflare Workers向けに強いが、バリデーションや認証は外部に頼る。

ElysiaJSは「Bunで完結する高速APIサーバーを型安全に書きたい」というユースケースに最もフィットする。

## セットアップとプロジェクト構成

### インストール

Bun本体がインストール済みであることが前提だ。

```bash
# Bunのインストール（未導入の場合）
curl -fsSL https://bun.sh/install | bash

# プロジェクト作成
bun create elysia my-api
cd my-api
```

`bun create elysia`で生成されるプロジェクトは最小構成になっている。必要な依存は自分で追加していく。

### 推奨ディレクトリ構成

中〜大規模APIでは以下の構成が扱いやすい。

```
my-api/
├── src/
│   ├── index.ts          # エントリポイント
│   ├── routes/
│   │   ├── auth.ts       # 認証関連ルート
│   │   ├── users.ts      # ユーザーCRUD
│   │   └── posts.ts      # 投稿CRUD
│   ├── plugins/
│   │   ├── database.ts   # DB接続プラグイン
│   │   └── auth.ts       # 認証プラグイン
│   ├── middleware/
│   │   └── logger.ts     # ロギング
│   ├── models/
│   │   └── schema.ts     # Drizzle ORMスキーマ
│   └── lib/
│       └── config.ts     # 設定値
├── test/
│   └── routes/
│       └── users.test.ts
├── drizzle/
│   └── migrations/
├── Dockerfile
├── package.json
└── tsconfig.json
```

### 最小起動コード

```typescript
// src/index.ts
import { Elysia } from 'elysia'

const app = new Elysia()
  .get('/', () => 'Hello ElysiaJS')
  .listen(3000)

console.log(`Server running at http://localhost:${app.server?.port}`)
```

```bash
bun run src/index.ts
```

これだけで3000番ポートにHTTPサーバーが起動する。`bun --watch src/index.ts`でファイル変更時に自動再起動もできる。

## ルーティング

### 基本のHTTPメソッド

ElysiaJSではメソッドチェーンでルートを定義する。

```typescript
import { Elysia } from 'elysia'

const app = new Elysia()
  .get('/users', () => {
    return { users: [] }
  })
  .post('/users', ({ body }) => {
    return { created: body }
  })
  .put('/users/:id', ({ params: { id }, body }) => {
    return { updated: id, data: body }
  })
  .delete('/users/:id', ({ params: { id } }) => {
    return { deleted: id }
  })
  .listen(3000)
```

ハンドラの引数はContext objectで、`body`、`params`、`query`、`headers`、`cookie`などが含まれる。

### パスパラメータ

```typescript
app.get('/users/:id', ({ params: { id } }) => {
  // id は string 型として推論される
  return { userId: id }
})

// 複数パラメータ
app.get('/users/:userId/posts/:postId', ({ params }) => {
  // params.userId, params.postId
  return params
})
```

### クエリパラメータ

```typescript
app.get('/search', ({ query }) => {
  // /search?q=elysia&page=1
  const { q, page } = query
  return { query: q, page: Number(page) }
})
```

バリデーションなしの場合、`query`の各値は`string | undefined`型になる。型安全にしたい場合は後述するバリデーションを使う。

### リクエストボディ

```typescript
app.post('/users', ({ body }) => {
  // bodyはバリデーション定義がなければ unknown
  return { received: body }
})
```

### グループルーティング

関連するルートをまとめるには`group`を使う。

```typescript
const app = new Elysia()
  .group('/api/v1', (app) =>
    app
      .get('/users', () => 'ユーザー一覧')
      .get('/users/:id', ({ params: { id } }) => `ユーザー ${id}`)
      .post('/users', ({ body }) => body)
  )
  .listen(3000)
```

`/api/v1/users`のようにプレフィックスが付与される。

### ルートの分割

ファイルを分けたい場合はElysiaインスタンスを別ファイルでexportし、`.use()`で結合する。

```typescript
// src/routes/users.ts
import { Elysia } from 'elysia'

export const userRoutes = new Elysia({ prefix: '/users' })
  .get('/', () => 'ユーザー一覧')
  .get('/:id', ({ params: { id } }) => `ユーザー ${id}`)
  .post('/', ({ body }) => body)
```

```typescript
// src/index.ts
import { Elysia } from 'elysia'
import { userRoutes } from './routes/users'

const app = new Elysia()
  .use(userRoutes)
  .listen(3000)
```

## 型安全なバリデーション

ElysiaJSの最大の武器はTypeBoxベースの組み込みバリデーションだ。`t`オブジェクトを使ってスキーマを定義すると、リクエスト/レスポンスの型がコンパイル時に推論される。

### ボディバリデーション

```typescript
import { Elysia, t } from 'elysia'

const app = new Elysia()
  .post('/users', ({ body }) => {
    // body は { name: string; email: string; age: number } と推論
    return { id: crypto.randomUUID(), ...body }
  }, {
    body: t.Object({
      name: t.String({ minLength: 1 }),
      email: t.String({ format: 'email' }),
      age: t.Number({ minimum: 0, maximum: 150 })
    })
  })
  .listen(3000)
```

バリデーションに失敗するとElysiaJSが自動的に`422 Unprocessable Entity`を返す。エラーレスポンスのフォーマットはカスタマイズ可能だ。

### クエリバリデーション

```typescript
app.get('/search', ({ query }) => {
  // query.q は string, query.page は number と推論
  return { results: [], page: query.page }
}, {
  query: t.Object({
    q: t.String(),
    page: t.Number({ default: 1 }),
    limit: t.Optional(t.Number({ maximum: 100 }))
  })
})
```

### パラメータバリデーション

```typescript
app.get('/users/:id', ({ params: { id } }) => {
  return { userId: id }
}, {
  params: t.Object({
    id: t.String({ format: 'uuid' })
  })
})
```

### レスポンスバリデーション

レスポンスにもスキーマを指定できる。開発環境で意図しないデータ漏洩を防ぐのに有効だ。

```typescript
app.get('/users/:id', ({ params: { id } }) => {
  return {
    id,
    name: '田中太郎',
    email: 'tanaka@example.com',
    passwordHash: 'abc123' // レスポンススキーマにないので除外される
  }
}, {
  params: t.Object({ id: t.String() }),
  response: t.Object({
    id: t.String(),
    name: t.String(),
    email: t.String()
  })
})
```

### エラーハンドリングのカスタマイズ

```typescript
const app = new Elysia()
  .onError(({ code, error, set }) => {
    if (code === 'VALIDATION') {
      set.status = 400
      return {
        success: false,
        message: 'バリデーションエラー',
        errors: error.all.map((e) => ({
          path: e.path,
          message: e.message
        }))
      }
    }
  })
```

## プラグインシステム

ElysiaJSのプラグインは`.use()`で組み込む。公式・コミュニティ合わせて多数のプラグインが存在する。

### CORS

```bash
bun add @elysiajs/cors
```

```typescript
import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'

const app = new Elysia()
  .use(cors({
    origin: ['https://example.com', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }))
  .get('/', () => 'CORS有効')
  .listen(3000)
```

### Swagger（APIドキュメント自動生成）

```bash
bun add @elysiajs/swagger
```

```typescript
import { Elysia, t } from 'elysia'
import { swagger } from '@elysiajs/swagger'

const app = new Elysia()
  .use(swagger({
    documentation: {
      info: {
        title: 'My API',
        version: '1.0.0',
        description: 'ElysiaJSで構築したAPI'
      }
    }
  }))
  .get('/users', () => [], {
    detail: {
      summary: 'ユーザー一覧取得',
      tags: ['Users']
    },
    response: t.Array(t.Object({
      id: t.String(),
      name: t.String()
    }))
  })
  .listen(3000)
```

`http://localhost:3000/swagger`にアクセスするとSwagger UIが表示される。バリデーションスキーマが自動的にOpenAPIドキュメントに反映されるため、スキーマとドキュメントの乖離が起きない。

### JWT

```bash
bun add @elysiajs/jwt
```

```typescript
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

const app = new Elysia()
  .use(jwt({
    name: 'jwt',
    secret: process.env.JWT_SECRET!,
    exp: '7d'
  }))
  .post('/login', async ({ jwt, body }) => {
    // 認証処理（省略）
    const token = await jwt.sign({ userId: '123', role: 'admin' })
    return { token }
  })
  .get('/protected', async ({ jwt, headers, set }) => {
    const auth = headers.authorization?.replace('Bearer ', '')
    if (!auth) {
      set.status = 401
      return { error: '認証が必要です' }
    }

    const payload = await jwt.verify(auth)
    if (!payload) {
      set.status = 401
      return { error: 'トークンが無効です' }
    }

    return { userId: payload.userId, role: payload.role }
  })
  .listen(3000)
```

### 静的ファイル配信

```bash
bun add @elysiajs/static
```

```typescript
import { Elysia } from 'elysia'
import { staticPlugin } from '@elysiajs/static'

const app = new Elysia()
  .use(staticPlugin({
    assets: 'public',
    prefix: '/static'
  }))
  .listen(3000)
```

## ミドルウェアとライフサイクルフック

ElysiaJSにはリクエスト処理の各段階に介入できるライフサイクルフックがある。

### ライフサイクルの順序

```
リクエスト受信
  → onRequest        （最も早い段階、ルーティング前）
  → onParse          （ボディパース時）
  → onTransform      （バリデーション前にデータ変換）
  → onBeforeHandle   （ハンドラ実行前、認証チェック等）
  → ハンドラ実行
  → onAfterHandle    （レスポンス変換）
  → mapResponse      （レスポンスのマッピング）
  → onAfterResponse  （レスポンス送信後、ログ記録等）
  → onError          （エラー発生時）
```

### ロギングミドルウェアの実装

```typescript
// src/middleware/logger.ts
import { Elysia } from 'elysia'

export const logger = new Elysia({ name: 'logger' })
  .onRequest(({ request }) => {
    const start = performance.now()
    // storeに開始時刻を保存
    ;(request as any).__startTime = start
  })
  .onAfterResponse(({ request, set }) => {
    const start = (request as any).__startTime ?? performance.now()
    const duration = (performance.now() - start).toFixed(2)
    const method = request.method
    const url = new URL(request.url).pathname
    const status = set.status ?? 200

    console.log(`${method} ${url} ${status} ${duration}ms`)
  })
```

```typescript
// src/index.ts
import { Elysia } from 'elysia'
import { logger } from './middleware/logger'

const app = new Elysia()
  .use(logger)
  .get('/', () => 'Hello')
  .listen(3000)
```

### 認証ガードの実装

`onBeforeHandle`を使って特定ルートに認証を強制する。

```typescript
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

const authGuard = new Elysia({ name: 'auth-guard' })
  .use(jwt({ name: 'jwt', secret: process.env.JWT_SECRET! }))
  .derive(async ({ jwt, headers, set }) => {
    const auth = headers.authorization?.replace('Bearer ', '')
    if (!auth) {
      set.status = 401
      throw new Error('認証が必要です')
    }

    const payload = await jwt.verify(auth)
    if (!payload) {
      set.status = 401
      throw new Error('トークンが無効です')
    }

    return { user: payload as { userId: string; role: string } }
  })

// 使用例
const app = new Elysia()
  .get('/public', () => '誰でもアクセス可能')
  .use(authGuard)
  .get('/dashboard', ({ user }) => {
    // user.userId, user.role が型安全に利用可能
    return { message: `ようこそ ${user.userId}` }
  })
  .listen(3000)
```

`derive`で返したオブジェクトはそれ以降のハンドラのContextに型安全にマージされる。

### stateとdecorate

グローバルな状態やユーティリティの注入にも対応している。

```typescript
const app = new Elysia()
  // stateはリクエスト間で共有されるミュータブル状態
  .state('requestCount', 0)
  // decorateはイミュータブルなユーティリティ注入
  .decorate('generateId', () => crypto.randomUUID())
  .get('/', ({ store, generateId }) => {
    store.requestCount++
    return {
      id: generateId(),
      totalRequests: store.requestCount
    }
  })
```

## WebSocket対応

ElysiaJSではBunのネイティブWebSocketを直接利用できる。追加パッケージは不要だ。

```typescript
import { Elysia, t } from 'elysia'

const app = new Elysia()
  .ws('/chat', {
    // 接続時のバリデーション
    query: t.Object({
      room: t.String()
    }),
    // メッセージスキーマ
    body: t.Object({
      type: t.Union([t.Literal('message'), t.Literal('typing')]),
      content: t.String()
    }),
    // 接続確立時
    open(ws) {
      const room = ws.data.query.room
      ws.subscribe(room)
      ws.publish(room, JSON.stringify({
        type: 'system',
        content: `新しいユーザーが ${room} に参加しました`
      }))
      console.log(`WebSocket接続: room=${room}`)
    },
    // メッセージ受信時
    message(ws, data) {
      const room = ws.data.query.room
      if (data.type === 'message') {
        ws.publish(room, JSON.stringify({
          type: 'message',
          content: data.content,
          timestamp: Date.now()
        }))
      }
    },
    // 切断時
    close(ws) {
      const room = ws.data.query.room
      ws.unsubscribe(room)
      ws.publish(room, JSON.stringify({
        type: 'system',
        content: 'ユーザーが退出しました'
      }))
    }
  })
  .listen(3000)
```

BunのWebSocketはNode.jsの`ws`パッケージと比較して大幅に高速で、pub/subも組み込みで利用できる。チャット、リアルタイム通知、ゲームサーバーなどに向いている。

## データベース連携（Drizzle ORM）

Bunと相性が良いORMとしてDrizzle ORMを採用する例を示す。SQLiteを使った最小構成だ。

### セットアップ

```bash
bun add drizzle-orm
bun add -d drizzle-kit
```

### スキーマ定義

```typescript
// src/models/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date())
})

export const posts = sqliteTable('posts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  content: text('content').notNull(),
  authorId: text('author_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date())
})
```

### DBプラグインの作成

```typescript
// src/plugins/database.ts
import { Elysia } from 'elysia'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'
import * as schema from '../models/schema'

const sqlite = new Database('app.db')
const db = drizzle(sqlite, { schema })

export const database = new Elysia({ name: 'database' })
  .decorate('db', db)
```

### CRUDルートの実装

```typescript
// src/routes/users.ts
import { Elysia, t } from 'elysia'
import { eq } from 'drizzle-orm'
import { database } from '../plugins/database'
import { users } from '../models/schema'

export const userRoutes = new Elysia({ prefix: '/users' })
  .use(database)
  .get('/', async ({ db }) => {
    const allUsers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt
    }).from(users)

    return allUsers
  })
  .get('/:id', async ({ db, params: { id }, set }) => {
    const user = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt
    }).from(users).where(eq(users.id, id)).get()

    if (!user) {
      set.status = 404
      return { error: 'ユーザーが見つかりません' }
    }
    return user
  }, {
    params: t.Object({ id: t.String() })
  })
  .post('/', async ({ db, body }) => {
    const passwordHash = await Bun.password.hash(body.password)

    const newUser = await db.insert(users).values({
      name: body.name,
      email: body.email,
      passwordHash
    }).returning({
      id: users.id,
      name: users.name,
      email: users.email
    }).get()

    return newUser
  }, {
    body: t.Object({
      name: t.String({ minLength: 1, maxLength: 100 }),
      email: t.String({ format: 'email' }),
      password: t.String({ minLength: 8 })
    })
  })
  .delete('/:id', async ({ db, params: { id }, set }) => {
    const deleted = await db.delete(users)
      .where(eq(users.id, id))
      .returning()
      .get()

    if (!deleted) {
      set.status = 404
      return { error: 'ユーザーが見つかりません' }
    }
    return { deleted: true }
  }, {
    params: t.Object({ id: t.String() })
  })
```

### マイグレーション

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/models/schema.ts',
  out: './drizzle/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: 'app.db'
  }
} satisfies Config
```

```bash
# マイグレーションファイル生成
bunx drizzle-kit generate

# マイグレーション適用
bunx drizzle-kit push
```

## 認証（JWT + Cookie）

JWTプラグインとCookieを組み合わせた認証フローを構築する。

```typescript
// src/plugins/auth.ts
import { Elysia, t } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { eq } from 'drizzle-orm'
import { database } from './database'
import { users } from '../models/schema'

export const auth = new Elysia({ name: 'auth', prefix: '/auth' })
  .use(database)
  .use(jwt({
    name: 'jwt',
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
    exp: '7d'
  }))
  // ログイン
  .post('/login', async ({ db, jwt, body, cookie: { token }, set }) => {
    const user = await db.select()
      .from(users)
      .where(eq(users.email, body.email))
      .get()

    if (!user) {
      set.status = 401
      return { error: 'メールアドレスまたはパスワードが正しくありません' }
    }

    const valid = await Bun.password.verify(body.password, user.passwordHash)
    if (!valid) {
      set.status = 401
      return { error: 'メールアドレスまたはパスワードが正しくありません' }
    }

    const jwtToken = await jwt.sign({
      userId: user.id,
      email: user.email
    })

    // HttpOnly Cookieにトークンを設定
    token.set({
      value: jwtToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7日
      path: '/'
    })

    return {
      success: true,
      user: { id: user.id, name: user.name, email: user.email }
    }
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String()
    })
  })
  // ログアウト
  .post('/logout', ({ cookie: { token } }) => {
    token.remove()
    return { success: true }
  })
  // 現在のユーザー情報
  .get('/me', async ({ jwt, cookie: { token }, set, db }) => {
    if (!token.value) {
      set.status = 401
      return { error: '認証が必要です' }
    }

    const payload = await jwt.verify(token.value)
    if (!payload) {
      set.status = 401
      return { error: 'セッションが無効です' }
    }

    const user = await db.select({
      id: users.id,
      name: users.name,
      email: users.email
    }).from(users).where(eq(users.id, payload.userId as string)).get()

    if (!user) {
      set.status = 404
      return { error: 'ユーザーが見つかりません' }
    }

    return user
  })
```

Cookieベースの認証はブラウザクライアントとの連携で扱いやすい。SPAやモバイルアプリ向けにはAuthorizationヘッダー方式と併用するのが一般的だ。

## テスト

ElysiaJSにはテスト用のユーティリティが内蔵されている。Bunのテストランナーと組み合わせて使う。

### 基本的なテスト

```typescript
// test/routes/users.test.ts
import { describe, it, expect, beforeAll } from 'bun:test'
import { Elysia, t } from 'elysia'

// テスト対象のアプリ
const app = new Elysia()
  .get('/users', () => [
    { id: '1', name: '田中太郎' },
    { id: '2', name: '佐藤花子' }
  ])
  .post('/users', ({ body }) => ({
    id: crypto.randomUUID(),
    ...body
  }), {
    body: t.Object({
      name: t.String({ minLength: 1 }),
      email: t.String({ format: 'email' })
    })
  })

describe('ユーザーAPI', () => {
  it('GET /users でユーザー一覧を取得できる', async () => {
    const response = await app.handle(
      new Request('http://localhost/users')
    )

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toHaveLength(2)
    expect(data[0].name).toBe('田中太郎')
  })

  it('POST /users でユーザーを作成できる', async () => {
    const response = await app.handle(
      new Request('http://localhost/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '鈴木一郎',
          email: 'suzuki@example.com'
        })
      })
    )

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.name).toBe('鈴木一郎')
    expect(data.id).toBeDefined()
  })

  it('POST /users でバリデーションエラーを返す', async () => {
    const response = await app.handle(
      new Request('http://localhost/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '',
          email: 'invalid-email'
        })
      })
    )

    expect(response.status).toBe(422)
  })
})
```

```bash
bun test
```

### テストのポイント

`app.handle()`はサーバーを起動せずにリクエストを処理する。実際のHTTP通信は発生しないため高速にテストできる。

データベースを使うテストでは、テスト用のSQLiteインメモリDBを注入するか、トランザクション内でテストしてロールバックするパターンが有効だ。

```typescript
import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import * as schema from '../src/models/schema'

function createTestDb() {
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: './drizzle/migrations' })
  return db
}
```

## デプロイ

### Dockerでのデプロイ

```dockerfile
# Dockerfile
FROM oven/bun:1 AS base
WORKDIR /app

# 依存関係のインストール
FROM base AS install
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

# アプリケーションのコピー
FROM base AS release
COPY --from=install /app/node_modules ./node_modules
COPY src ./src
COPY drizzle ./drizzle
COPY drizzle.config.ts ./
COPY package.json ./

# マイグレーション実行
RUN bunx drizzle-kit push

# 非rootユーザーで実行
USER bun
EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
```

```bash
docker build -t my-elysia-api .
docker run -p 3000:3000 -e JWT_SECRET=your-secret my-elysia-api
```

### docker-compose.yml

PostgreSQLと組み合わせる場合の構成例。

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - '3000:3000'
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - DATABASE_URL=postgres://app:password@db:5432/myapp
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: password
      POSTGRES_DB: myapp
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U app']
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

### Fly.ioへのデプロイ

```toml
# fly.toml
app = "my-elysia-api"
primary_region = "nrt"

[build]

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[env]
  NODE_ENV = "production"
```

```bash
fly launch
fly secrets set JWT_SECRET=your-production-secret
fly deploy
```

### 本番環境のチェックリスト

本番で運用する際に確認すべき項目を列挙する。

- **環境変数**: `JWT_SECRET`等のシークレットをハードコードしない
- **CORS**: 許可するオリジンを本番ドメインに限定する
- **レート制限**: `elysia-rate-limit`プラグイン等で過剰リクエストを制御する
- **ヘルスチェック**: `/health`エンドポイントを設けてロードバランサーやオーケストレーションツールから監視する
- **ログ**: 構造化ログ（JSON形式）を標準出力に出し、集約ツールで収集する
- **グレースフルシャットダウン**: `process.on('SIGTERM', ...)`でDB接続のクリーンアップを行う

```typescript
// ヘルスチェックとグレースフルシャットダウンの例
import { Elysia } from 'elysia'

const app = new Elysia()
  .get('/health', () => ({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  }))
  .listen(3000)

process.on('SIGTERM', () => {
  console.log('SIGTERM受信、シャットダウン開始...')
  app.stop()
  process.exit(0)
})
```

## まとめ

ElysiaJSはBunのパフォーマンスを最大限引き出しつつ、TypeScriptの型安全性を犠牲にしないフレームワークだ。

主要な利点を整理する。

- **パフォーマンス**: Bunネイティブ実装により、Node.jsベースのフレームワークを大きく上回るスループット
- **型安全性**: バリデーションスキーマからハンドラの引数型が自動推論される。手動の型定義が不要
- **開発体験**: Swagger自動生成、WebSocket組み込み、プラグインシステムにより追加設定が最小限
- **テスタビリティ**: `app.handle()`でサーバー起動なしにテスト可能

一方で考慮すべき点もある。

- **Bun依存**: Node.jsでは動作しない。Bun未対応の環境ではデプロイ先が限定される
- **エコシステム規模**: Express.jsやFastifyと比較するとサードパーティミドルウェアの数は少ない
- **破壊的変更のリスク**: 若いプロジェクトのため、メジャーバージョン間でAPIが変わる可能性がある

BunをランタイムとしてAPIサーバーを構築する場合、ElysiaJSは第一候補になるフレームワークだ。特にTypeScriptを主言語とするチームで、型安全性とパフォーマンスの両立を求める場合に適している。

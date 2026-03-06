---
title: 'Nitro/H3完全ガイド - UnJSのサーバーフレームワーク'
description: 'Nitro/H3サーバーエンジンの基本からAPI Routes、ミドルウェア、ストレージ、エッジデプロイまで。UnJSエコシステムのサーバーフレームワークを徹底解説。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。'
pubDate: 'Feb 05 2026'
tags: ['Nitro', 'H3', 'UnJS', 'サーバー', 'Edge', 'インフラ']
---
# Nitro/H3完全ガイド - UnJSのサーバーフレームワーク

NitroはNuxtの裏側で動くサーバーエンジンで、H3はその軽量HTTPフレームワークです。単体でも使え、あらゆるデプロイターゲット（Node.js、Cloudflare Workers、Deno Deployなど）に対応したユニバーサルなサーバーを構築できます。

## Nitro/H3とは

### H3（HTTP Framework）

H3はUnJSプロジェクトの超軽量HTTPフレームワークです。

1. **超軽量** - 最小限のオーバーヘッド
2. **Web Standards** - Request/Response APIベース
3. **ランタイム非依存** - Node.js、Deno、Bun、エッジで動作
4. **型安全** - TypeScriptファースト設計

### Nitro（Server Engine）

NitroはH3の上に構築されたサーバーエンジンです。

1. **自動ルーティング** - ファイルベースルーティング
2. **ユニバーサルデプロイ** - 20以上のデプロイプリセット
3. **KVストレージ** - 組み込みのキー値ストレージ
4. **自動インポート** - よく使う関数を自動インポート
5. **キャッシュ** - 組み込みのキャッシュレイヤー

### Express/Fastifyとの比較

| 項目 | H3/Nitro | Express | Fastify |
|------|----------|---------|---------|
| Web Standards | ○ | × | × |
| エッジ対応 | ○ | × | × |
| TypeScript | ネイティブ | 別途 | ネイティブ |
| ファイルルーティング | ○(Nitro) | × | × |
| バンドルサイズ | 極小 | 中 | 中 |

## H3の基本

### セットアップ

```bash
npm install h3
```

### 基本的なサーバー

```typescript
// server.ts
import { createApp, createRouter, defineEventHandler, toNodeListener } from 'h3'
import { createServer } from 'node:http'

const app = createApp()
const router = createRouter()

router.get('/', defineEventHandler(() => {
  return { message: 'Hello, H3!' }
}))

router.get('/users', defineEventHandler(async () => {
  return [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ]
}))

app.use(router)

createServer(toNodeListener(app)).listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})
```

### リクエスト処理

```typescript
import {
  defineEventHandler,
  getQuery,
  readBody,
  getRouterParam,
  getHeaders,
  getCookie,
  setCookie,
} from 'h3'

// クエリパラメータ
router.get('/search', defineEventHandler((event) => {
  const { q, page } = getQuery(event)
  return { query: q, page: Number(page) || 1 }
}))

// パスパラメータ
router.get('/users/:id', defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  return { userId: id }
}))

// リクエストボディ
router.post('/users', defineEventHandler(async (event) => {
  const body = await readBody(event)
  return { created: body }
}))

// ヘッダー
router.get('/info', defineEventHandler((event) => {
  const headers = getHeaders(event)
  return {
    userAgent: headers['user-agent'],
    host: headers['host'],
  }
}))

// Cookie
router.get('/session', defineEventHandler((event) => {
  const token = getCookie(event, 'session_token')
  if (!token) {
    setCookie(event, 'session_token', 'abc123', {
      httpOnly: true,
      maxAge: 60 * 60 * 24,
    })
    return { message: 'Session created' }
  }
  return { message: 'Session exists', token }
}))
```

### レスポンス制御

```typescript
import {
  defineEventHandler,
  setResponseStatus,
  setResponseHeader,
  sendRedirect,
  createError,
} from 'h3'

// ステータスコード
router.post('/users', defineEventHandler(async (event) => {
  const body = await readBody(event)
  setResponseStatus(event, 201)
  return { id: 1, ...body }
}))

// カスタムヘッダー
router.get('/download', defineEventHandler((event) => {
  setResponseHeader(event, 'Content-Type', 'text/csv')
  setResponseHeader(event, 'Content-Disposition', 'attachment; filename="data.csv"')
  return 'id,name\n1,Alice\n2,Bob'
}))

// リダイレクト
router.get('/old-page', defineEventHandler((event) => {
  return sendRedirect(event, '/new-page', 301)
}))

// エラー
router.get('/protected', defineEventHandler((event) => {
  const token = getCookie(event, 'auth_token')
  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: '認証が必要です',
    })
  }
  return { data: 'Secret data' }
}))
```

## Nitroサーバーエンジン

### セットアップ

```bash
# Nitroプロジェクト作成
npx giget@latest nitro nitro-app
cd nitro-app
npm install

# 開発サーバー
npm run dev
```

### プロジェクト構造

```
nitro-app/
├── routes/
│   ├── index.ts          # GET /
│   ├── hello/
│   │   └── [name].ts     # GET /hello/:name
│   └── api/
│       ├── users.ts       # GET,POST /api/users
│       └── users/
│           └── [id].ts    # GET,PUT,DELETE /api/users/:id
├── middleware/
│   └── auth.ts            # グローバルミドルウェア
├── plugins/
│   └── db.ts              # プラグイン
├── utils/
│   └── helpers.ts         # ユーティリティ
├── nitro.config.ts
└── package.json
```

### ファイルベースルーティング

```typescript
// routes/index.ts
export default defineEventHandler(() => {
  return { message: 'Welcome to Nitro!' }
})
```

```typescript
// routes/api/users.ts
export default defineEventHandler(async (event) => {
  const method = event.method

  if (method === 'GET') {
    return [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]
  }

  if (method === 'POST') {
    const body = await readBody(event)
    setResponseStatus(event, 201)
    return { id: 3, ...body }
  }
})
```

```typescript
// routes/api/users/[id].ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const method = event.method

  if (method === 'GET') {
    return { id: Number(id), name: `User ${id}` }
  }

  if (method === 'PUT') {
    const body = await readBody(event)
    return { id: Number(id), ...body }
  }

  if (method === 'DELETE') {
    setResponseStatus(event, 204)
    return null
  }
})
```

### ミドルウェア

```typescript
// middleware/auth.ts
export default defineEventHandler((event) => {
  const url = getRequestURL(event)

  // /api/admin配下のルートを保護
  if (url.pathname.startsWith('/api/admin')) {
    const token = getHeader(event, 'Authorization')
    if (!token || token !== 'Bearer secret-token') {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized',
      })
    }
  }
})
```

```typescript
// middleware/cors.ts
export default defineEventHandler((event) => {
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  })

  if (event.method === 'OPTIONS') {
    setResponseStatus(event, 204)
    return ''
  }
})
```

### ストレージ（KV）

Nitroには組み込みのキー値ストレージがあります。

```typescript
// nitro.config.ts
export default defineNitroConfig({
  storage: {
    redis: {
      driver: 'redis',
      url: process.env.REDIS_URL,
    },
    db: {
      driver: 'fs',
      base: './.data/db',
    },
  },
})
```

```typescript
// routes/api/cache.ts
export default defineEventHandler(async (event) => {
  const storage = useStorage('db')

  if (event.method === 'GET') {
    const keys = await storage.getKeys()
    const items: Record<string, unknown> = {}
    for (const key of keys) {
      items[key] = await storage.getItem(key)
    }
    return items
  }

  if (event.method === 'POST') {
    const body = await readBody(event)
    await storage.setItem(body.key, body.value)
    return { success: true }
  }
})
```

### キャッシュ

```typescript
// routes/api/posts.ts
export default defineCachedEventHandler(async () => {
  // このハンドラーの結果は60秒間キャッシュされる
  const posts = await fetchPostsFromDB()
  return posts
}, {
  maxAge: 60, // 60秒
  staleMaxAge: 300, // 300秒（stale-while-revalidate）
  swr: true,
})
```

```typescript
// ルートルールでキャッシュ設定
// nitro.config.ts
export default defineNitroConfig({
  routeRules: {
    '/api/posts': {
      cache: { maxAge: 60 },
    },
    '/api/static/**': {
      cache: { maxAge: 3600 },
    },
    '/api/realtime/**': {
      cache: false,
    },
  },
})
```

### スケジュールタスク

```typescript
// tasks/cleanup.ts
export default defineTask({
  meta: {
    name: 'cleanup',
    description: '古いデータを削除',
  },
  run() {
    console.log('Running cleanup task...')
    // クリーンアップロジック
    return { result: 'Success' }
  },
})
```

```typescript
// nitro.config.ts
export default defineNitroConfig({
  scheduledTasks: {
    // 毎日午前3時に実行
    '0 3 * * *': ['cleanup'],
  },
})
```

## WebSocket対応

```typescript
// routes/_ws.ts
export default defineWebSocketHandler({
  open(peer) {
    console.log(`Client connected: ${peer.id}`)
    peer.send(JSON.stringify({ type: 'welcome', message: 'Connected!' }))
  },
  message(peer, message) {
    const data = JSON.parse(message.text())
    console.log(`Message from ${peer.id}:`, data)

    // ブロードキャスト
    peer.publish('chat', JSON.stringify({
      type: 'message',
      from: peer.id,
      text: data.text,
    }))
  },
  close(peer) {
    console.log(`Client disconnected: ${peer.id}`)
  },
})
```

## デプロイ

### Node.jsサーバー

```bash
# ビルド
npm run build

# 実行
node .output/server/index.mjs
```

### Cloudflare Workers

```typescript
// nitro.config.ts
export default defineNitroConfig({
  preset: 'cloudflare-worker',
})
```

```bash
npm run build
npx wrangler deploy .output/server/index.mjs
```

### Vercel

```typescript
// nitro.config.ts
export default defineNitroConfig({
  preset: 'vercel',
})
```

### Deno Deploy

```typescript
// nitro.config.ts
export default defineNitroConfig({
  preset: 'deno-deploy',
})
```

### その他のプリセット

```typescript
// 利用可能なプリセット
export default defineNitroConfig({
  preset: 'netlify',        // Netlify
  // preset: 'aws-lambda',  // AWS Lambda
  // preset: 'firebase',    // Firebase Functions
  // preset: 'bun',         // Bun
  // preset: 'edge-light',  // Edge Light (汎用エッジ)
})
```

## 実践例：REST API

```typescript
// routes/api/todos/index.ts
const todos: Array<{id: number; title: string; done: boolean}> = []
let nextId = 1

export default defineEventHandler(async (event) => {
  switch (event.method) {
    case 'GET': {
      const { status } = getQuery(event)
      if (status === 'done') return todos.filter(t => t.done)
      if (status === 'active') return todos.filter(t => !t.done)
      return todos
    }
    case 'POST': {
      const body = await readBody(event)
      const todo = { id: nextId++, title: body.title, done: false }
      todos.push(todo)
      setResponseStatus(event, 201)
      return todo
    }
    default:
      throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  }
})
```

```typescript
// routes/api/todos/[id].ts
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const index = todos.findIndex(t => t.id === id)

  if (index === -1) {
    throw createError({ statusCode: 404, message: 'Todo not found' })
  }

  switch (event.method) {
    case 'GET':
      return todos[index]
    case 'PATCH': {
      const body = await readBody(event)
      todos[index] = { ...todos[index], ...body }
      return todos[index]
    }
    case 'DELETE': {
      const [deleted] = todos.splice(index, 1)
      return deleted
    }
    default:
      throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  }
})
```

## まとめ

Nitro/H3の主な利点：

1. **ユニバーサル** - 20以上のデプロイターゲットに同一コードで対応
2. **超軽量** - 最小限のオーバーヘッド、高速起動
3. **Web Standards** - Request/ResponseベースのモダンAPI
4. **開発体験** - ファイルベースルーティング、自動インポート、HMR

NuxtのバックエンドとしてだけでなくスタンドアロンのAPIサーバーとしても優秀です。特にエッジデプロイを前提としたサーバーレスAPIの構築に最適です。

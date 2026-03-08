---
title: 'SolidStart フルスタックフレームワーク入門'
description: 'SolidStartでフルスタックアプリを構築。Fine-grained Reactivity、サーバー関数、ファイルベースルーティング、API Routes、認証実装まで実例で解説。SolidStart・SolidJS・フルスタックに関する実践情報。'
pubDate: '2025-02-06'
tags: ['SolidStart', 'SolidJS', 'フルスタック', 'SSR', 'サーバー関数', 'プログラミング']
heroImage: '../../assets/thumbnails/solid-start-fullstack.jpg'
---

SolidStartは、SolidJS公式のフルスタックフレームワークです。Fine-grained Reactivityの強力な性能を活かしながら、サーバーサイドレンダリング、サーバー関数、APIルートを統合した開発体験を提供します。

本ガイドでは、SolidStartの核心機能を実例とともに解説します。

## SolidStartの特徴

### Next.jsとの比較

| 機能 | Next.js | SolidStart |
|------|---------|-----------|
| ベースフレームワーク | React | SolidJS |
| リアクティビティ | 仮想DOM | Fine-grained Signals |
| サーバー関数 | Server Actions | Server Functions |
| ルーティング | App Router | File-based Router |
| データフェッチ | fetch + cache | createResource |
| バンドルサイズ | 約85KB | 約25KB |

### アーキテクチャ

```
┌─────────────────────────────────┐
│  クライアント（ブラウザ）        │
│                                 │
│  ┌──────────────────────────┐  │
│  │  SolidJS Components      │  │
│  │  - リアクティブUI        │  │
│  │  - シグナル              │  │
│  └─────────┬────────────────┘  │
└────────────┼────────────────────┘
             │ HTTP/WebSocket
             ▼
┌─────────────────────────────────┐
│  SolidStart Server              │
│                                 │
│  ┌──────────────────────────┐  │
│  │  Server Functions        │  │
│  │  - データフェッチ         │  │
│  │  - データ更新             │  │
│  └──────────────────────────┘  │
│                                 │
│  ┌──────────────────────────┐  │
│  │  API Routes              │  │
│  │  - REST API              │  │
│  │  - WebSocket             │  │
│  └──────────────────────────┘  │
│                                 │
│  ┌──────────────────────────┐  │
│  │  SSR Engine              │  │
│  │  - サーバーレンダリング   │  │
│  │  - ストリーミング         │  │
│  └──────────────────────────┘  │
└─────────────────────────────────┘
```

## プロジェクトセットアップ

### インストール

```bash
# SolidStartプロジェクト作成
npm create solid@latest my-solid-start-app

# プロジェクトディレクトリに移動
cd my-solid-start-app

# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev
```

### プロジェクト構造

```
my-solid-start-app/
├── src/
│   ├── routes/              # ルート定義
│   │   ├── index.tsx        # /
│   │   ├── about.tsx        # /about
│   │   ├── api/             # APIルート
│   │   │   └── hello.ts     # /api/hello
│   │   └── [...404].tsx     # 404ページ
│   ├── components/          # コンポーネント
│   ├── lib/                 # ユーティリティ
│   ├── app.tsx              # ルートコンポーネント
│   ├── entry-client.tsx     # クライアントエントリー
│   └── entry-server.tsx     # サーバーエントリー
├── public/                  # 静的ファイル
├── vite.config.ts
└── app.config.ts
```

## ファイルベースルーティング

### 基本的なルート

```typescript
// src/routes/index.tsx
import { Title } from "@solidjs/meta"

export default function Home() {
  return (
    <>
      <Title>Home - My SolidStart App</Title>
      <main>
        <h1>Welcome to SolidStart</h1>
        <p>This is the home page.</p>
      </main>
    </>
  )
}
```

### 動的ルート

```typescript
// src/routes/posts/[id].tsx
import { useParams } from "@solidjs/router"
import { Title } from "@solidjs/meta"
import { createResource, Show } from "solid-js"

async function fetchPost(id: string) {
  const res = await fetch(`/api/posts/${id}`)
  return res.json()
}

export default function Post() {
  const params = useParams()
  const [post] = createResource(() => params.id, fetchPost)

  return (
    <>
      <Title>{post()?.title || "Loading..."}</Title>
      <main>
        <Show when={!post.loading} fallback={<p>Loading post...</p>}>
          <article>
            <h1>{post()?.title}</h1>
            <p>{post()?.content}</p>
          </article>
        </Show>
      </main>
    </>
  )
}
```

### ネストルート

```typescript
// src/routes/dashboard.tsx (レイアウト)
import { A, Outlet } from "@solidjs/router"

export default function DashboardLayout() {
  return (
    <div class="dashboard">
      <nav class="sidebar">
        <h2>Dashboard</h2>
        <ul>
          <li><A href="/dashboard">Overview</A></li>
          <li><A href="/dashboard/analytics">Analytics</A></li>
          <li><A href="/dashboard/settings">Settings</A></li>
        </ul>
      </nav>
      <main class="content">
        <Outlet />
      </main>
    </div>
  )
}

// src/routes/dashboard/index.tsx
export default function DashboardOverview() {
  return <h1>Dashboard Overview</h1>
}

// src/routes/dashboard/analytics.tsx
export default function DashboardAnalytics() {
  return <h1>Analytics</h1>
}
```

## サーバー関数（Server Functions）

### 基本的なサーバー関数

```typescript
// src/routes/todos.tsx
import { createSignal, For } from "solid-js"
import { createServerAction$ } from "solid-start/server"

// サーバー関数定義
const addTodo = createServerAction$(async (formData: FormData) => {
  "use server"

  const title = formData.get("title") as string

  // サーバー側でのみ実行される
  const db = await connectToDatabase()
  const todo = await db.todos.create({
    data: { title, completed: false },
  })

  return todo
})

export default function Todos() {
  const [todos, setTodos] = createSignal([])

  return (
    <div>
      <h1>Todos</h1>

      <form action={addTodo} method="post">
        <input type="text" name="title" placeholder="New todo..." />
        <button type="submit">Add</button>
      </form>

      <ul>
        <For each={todos()}>
          {(todo) => (
            <li>
              <input type="checkbox" checked={todo.completed} />
              {todo.title}
            </li>
          )}
        </For>
      </ul>
    </div>
  )
}
```

### データフェッチ用サーバー関数

```typescript
// src/lib/api.ts
import { createServerData$ } from "solid-start/server"

export function getTodos() {
  return createServerData$(async () => {
    "use server"

    const db = await connectToDatabase()
    const todos = await db.todos.findMany({
      orderBy: { createdAt: "desc" },
    })

    return todos
  })
}

export function getTodo(id: string) {
  return createServerData$(
    async ([, todoId]) => {
      "use server"

      const db = await connectToDatabase()
      const todo = await db.todos.findUnique({
        where: { id: todoId },
      })

      return todo
    },
    { key: () => ["todo", id] }
  )
}
```

```typescript
// src/routes/todos.tsx
import { For, Show } from "solid-js"
import { getTodos } from "~/lib/api"

export default function TodosPage() {
  const todos = getTodos()

  return (
    <div>
      <h1>Todos</h1>

      <Show when={!todos.loading} fallback={<p>Loading...</p>}>
        <ul>
          <For each={todos()}>
            {(todo) => (
              <li>
                <input type="checkbox" checked={todo.completed} />
                {todo.title}
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  )
}
```

### 楽観的更新

```typescript
// src/routes/todos.tsx
import { createSignal, For } from "solid-js"
import { createServerAction$ } from "solid-start/server"

const toggleTodo = createServerAction$(async (id: string) => {
  "use server"

  const db = await connectToDatabase()
  const todo = await db.todos.findUnique({ where: { id } })

  return await db.todos.update({
    where: { id },
    data: { completed: !todo.completed },
  })
})

export default function Todos() {
  const [todos, setTodos] = createSignal([])

  const handleToggle = async (id: string) => {
    // 楽観的UI更新
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    )

    // サーバー更新
    try {
      await toggleTodo(id)
    } catch (error) {
      // エラー時はロールバック
      setTodos((prev) =>
        prev.map((todo) =>
          todo.id === id ? { ...todo, completed: !todo.completed } : todo
        )
      )
    }
  }

  return (
    <ul>
      <For each={todos()}>
        {(todo) => (
          <li>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => handleToggle(todo.id)}
            />
            {todo.title}
          </li>
        )}
      </For>
    </ul>
  )
}
```

## API Routes

### RESTful API

```typescript
// src/routes/api/posts.ts
import { json } from "solid-start/server"
import type { APIEvent } from "solid-start/api"

export async function GET() {
  const db = await connectToDatabase()
  const posts = await db.posts.findMany()

  return json(posts)
}

export async function POST({ request }: APIEvent) {
  const body = await request.json()

  const db = await connectToDatabase()
  const post = await db.posts.create({
    data: {
      title: body.title,
      content: body.content,
    },
  })

  return json(post, { status: 201 })
}
```

```typescript
// src/routes/api/posts/[id].ts
import { json } from "solid-start/server"
import type { APIEvent } from "solid-start/api"

export async function GET({ params }: APIEvent) {
  const db = await connectToDatabase()
  const post = await db.posts.findUnique({
    where: { id: params.id },
  })

  if (!post) {
    return json({ error: "Post not found" }, { status: 404 })
  }

  return json(post)
}

export async function PUT({ params, request }: APIEvent) {
  const body = await request.json()

  const db = await connectToDatabase()
  const post = await db.posts.update({
    where: { id: params.id },
    data: {
      title: body.title,
      content: body.content,
    },
  })

  return json(post)
}

export async function DELETE({ params }: APIEvent) {
  const db = await connectToDatabase()
  await db.posts.delete({
    where: { id: params.id },
  })

  return json({ success: true })
}
```

### ミドルウェア

```typescript
// src/middleware.ts
import { createMiddleware } from "solid-start/middleware"

export default createMiddleware({
  onRequest: [
    // CORS設定
    (event) => {
      event.response.headers.set("Access-Control-Allow-Origin", "*")
      event.response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE")
    },

    // 認証チェック
    async (event) => {
      if (event.request.url.includes("/api/protected")) {
        const token = event.request.headers.get("Authorization")

        if (!token) {
          return new Response("Unauthorized", { status: 401 })
        }

        const user = await verifyToken(token)
        if (!user) {
          return new Response("Unauthorized", { status: 401 })
        }

        // コンテキストにユーザー情報を追加
        event.locals.user = user
      }
    },

    // ロギング
    (event) => {
      console.log(`${event.request.method} ${event.request.url}`)
    },
  ],
})
```

## 認証実装

### セッションベース認証

```typescript
// src/lib/auth.ts
import { createCookieSessionStorage } from "solid-start/session"

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    secrets: [process.env.SESSION_SECRET],
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 1週間
    httpOnly: true,
  },
})

export async function createUserSession(userId: string) {
  const session = await sessionStorage.getSession()
  session.set("userId", userId)

  return sessionStorage.commitSession(session)
}

export async function getUserSession(request: Request) {
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie")
  )

  return session.get("userId")
}

export async function logout(request: Request) {
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie")
  )

  return sessionStorage.destroySession(session)
}
```

### ログインページ

```typescript
// src/routes/login.tsx
import { createSignal } from "solid-js"
import { createServerAction$, redirect } from "solid-start/server"
import { createUserSession } from "~/lib/auth"

const login = createServerAction$(async (formData: FormData) => {
  "use server"

  const email = formData.get("email") as string
  const password = formData.get("password") as string

  // ユーザー認証
  const db = await connectToDatabase()
  const user = await db.users.findUnique({ where: { email } })

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Invalid credentials" }
  }

  // セッション作成
  const session = await createUserSession(user.id)

  // リダイレクト
  return redirect("/dashboard", {
    headers: {
      "Set-Cookie": session,
    },
  })
})

export default function Login() {
  const [email, setEmail] = createSignal("")
  const [password, setPassword] = createSignal("")

  return (
    <div class="login-page">
      <h1>Login</h1>

      <form action={login} method="post">
        <div>
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={email()}
            onInput={(e) => setEmail(e.currentTarget.value)}
            required
          />
        </div>

        <div>
          <label>Password</label>
          <input
            type="password"
            name="password"
            value={password()}
            onInput={(e) => setPassword(e.currentTarget.value)}
            required
          />
        </div>

        <button type="submit">Login</button>
      </form>
    </div>
  )
}
```

### 認証保護ルート

```typescript
// src/routes/dashboard.tsx
import { redirect } from "solid-start/server"
import { createServerData$ } from "solid-start/server"
import { getUserSession } from "~/lib/auth"

export function routeData() {
  return createServerData$(async (_, { request }) => {
    "use server"

    const userId = await getUserSession(request)

    if (!userId) {
      throw redirect("/login")
    }

    const db = await connectToDatabase()
    const user = await db.users.findUnique({
      where: { id: userId },
    })

    return user
  })
}

export default function Dashboard() {
  const user = useRouteData<typeof routeData>()

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user()?.name}!</p>
    </div>
  )
}
```

## データベース統合

### Prismaセットアップ

```bash
npm install prisma @prisma/client
npx prisma init
```

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  name         String?
  passwordHash String
  posts        Post[]
  createdAt    DateTime @default(now())
}

model Post {
  id        String   @id @default(uuid())
  title     String
  content   String
  published Boolean  @default(false)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### Prismaクライアント初期化

```typescript
// src/lib/db.ts
import { PrismaClient } from "@prisma/client"

let prisma: PrismaClient

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient()
} else {
  if (!(global as any).prisma) {
    (global as any).prisma = new PrismaClient()
  }
  prisma = (global as any).prisma
}

export { prisma }
```

## デプロイ

### Vercelデプロイ

```bash
# Vercel CLIインストール
npm install -g vercel

# デプロイ
vercel
```

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".vercel/output",
  "devCommand": "npm run dev",
  "framework": "solidstart"
}
```

### Cloudflare Pagesデプロイ

```bash
npm run build
npx wrangler pages publish .vercel/output/static
```

## まとめ

SolidStartは以下を実現します:

1. **Fine-grained Reactivity** - 高速なリアクティブシステム
2. **サーバー関数** - シンプルなサーバーサイド処理
3. **ファイルベースルーティング** - 直感的なルート定義
4. **小さいバンドル** - 約25KBの軽量フレームワーク
5. **フルスタック** - フロントエンドとバックエンドの統合

SolidStartは、パフォーマンスと開発体験を両立した次世代フルスタックフレームワークです。SolidJSの強力なリアクティビティと、モダンなサーバーサイド機能を活用して、高速なWebアプリケーションを構築できます。

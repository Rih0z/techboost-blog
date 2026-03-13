---
title: 'TanStack Startフルスタックフレームワーク入門'
description: 'TanStack Startの完全ガイド。ファイルベースルーティング、サーバー関数、SSR、TanStack Query統合、Vinxiバンドラーなど、モダンなフルスタック開発手法を解説します。TanStack・TanStack Start・Reactに関する実践情報。'
pubDate: 2025-02-05
tags: ['TanStack', 'TanStack Start', 'React', 'フルスタック', 'TypeScript']
heroImage: '../../assets/thumbnails/tanstack-start-fullstack.jpg'
---

TanStack Startは、TanStack Queryの作者Tanner Linsleyが開発した、**型安全なフルスタックReactフレームワーク**です。

## TanStack Startとは

### 主な特徴

- **ファイルベースルーティング**: 直感的なルート定義
- **サーバー関数**: エンドツーエンドの型安全性
- **TanStack Query統合**: データフェッチの標準化
- **Vinxiバンドラー**: Viteベースの高速ビルド
- **フレームワーク非依存**: React、Vue、Solid対応予定
- **デプロイターゲット多様**: Vercel、Cloudflare、Node.js対応

### Next.jsとの違い

| 機能 | TanStack Start | Next.js |
|------|---------------|---------|
| **ルーティング** | ファイルベース | App Router |
| **データフェッチ** | TanStack Query | fetch + RSC |
| **サーバー関数** | createServerFn | Server Actions |
| **型安全性** | エンドツーエンド | 部分的 |
| **バンドラー** | Vinxi (Vite) | Turbopack/Webpack |
| **成熟度** | Beta | 安定 |

## セットアップ

### プロジェクト作成

```bash
npm create @tanstack/start@latest my-app
cd my-app
npm install
npm run dev
```

### 手動セットアップ

```bash
npm install @tanstack/react-start @tanstack/react-router
npm install -D @tanstack/start vite
```

```typescript
// app.config.ts
import { defineConfig } from '@tanstack/start/config'

export default defineConfig({
  vite: {
    // Vite設定
  },
})
```

## ファイルベースルーティング

### 基本的なルート構造

```
src/routes/
├── __root.tsx          # ルートレイアウト
├── index.tsx           # / (ホーム)
├── about.tsx           # /about
├── posts/
│   ├── index.tsx       # /posts
│   ├── $postId.tsx     # /posts/:postId (動的ルート)
│   └── new.tsx         # /posts/new
└── _layout.tsx         # レイアウト
```

### ルートレイアウト

```typescript
// src/routes/__root.tsx
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <html lang="ja">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>My App</title>
      </head>
      <body>
        <nav>
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/posts">Posts</a>
        </nav>

        <main>
          <Outlet />
        </main>

        <TanStackRouterDevtools />
      </body>
    </html>
  )
}
```

### ページコンポーネント

```typescript
// src/routes/index.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div>
      <h1>Welcome to TanStack Start</h1>
      <p>Modern Full-Stack React Framework</p>
    </div>
  )
}
```

### 動的ルート

```typescript
// src/routes/posts/$postId.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posts/$postId')({
  component: PostDetail,
})

function PostDetail() {
  const { postId } = Route.useParams()

  return (
    <div>
      <h1>Post {postId}</h1>
    </div>
  )
}
```

### レイアウト

```typescript
// src/routes/_layout.tsx
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout')({
  component: LayoutComponent,
})

function LayoutComponent() {
  return (
    <div className="layout">
      <aside>
        <nav>サイドバー</nav>
      </aside>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
```

```typescript
// src/routes/_layout/dashboard.tsx
import { createFileRoute } from '@tanstack/react-router'

// /dashboard にアクセスすると_layoutが適用される
export const Route = createFileRoute('/_layout/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  return <h1>Dashboard</h1>
}
```

## サーバー関数

TanStack Startの最大の特徴は、**型安全なサーバー関数**です。

### 基本的なサーバー関数

```typescript
// src/server/api.ts
import { createServerFn } from '@tanstack/start'
import { z } from 'zod'

// サーバー関数の定義
export const getUsers = createServerFn()
  .validator((data: unknown) => {
    return z.object({
      page: z.number().default(1),
      limit: z.number().default(10),
    }).parse(data)
  })
  .handler(async ({ data }) => {
    // サーバー側でのみ実行される
    const users = await db.user.findMany({
      skip: (data.page - 1) * data.limit,
      take: data.limit,
    })

    return users
  })

// 別の例: ユーザー作成
export const createUser = createServerFn()
  .validator((data: unknown) => {
    return z.object({
      name: z.string().min(1),
      email: z.string().email(),
    }).parse(data)
  })
  .handler(async ({ data }) => {
    const user = await db.user.create({
      data: {
        name: data.name,
        email: data.email,
      },
    })

    return user
  })
```

### クライアント側での使用

```typescript
// src/routes/users.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { getUsers } from '../server/api'

export const Route = createFileRoute('/users')({
  component: Users,
})

function Users() {
  const { data: users } = useSuspenseQuery({
    queryKey: ['users', 1, 10],
    queryFn: () => getUsers({ data: { page: 1, limit: 10 } }),
  })

  return (
    <div>
      <h1>Users</h1>
      <ul>
        {users.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  )
}
```

### ミューテーション

```typescript
// src/routes/users/new.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { createUser } from '../../server/api'

export const Route = createFileRoute('/users/new')({
  component: NewUser,
})

function NewUser() {
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      navigate({ to: '/users' })
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    mutation.mutate({
      data: {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
      },
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Name" required />
      <input name="email" type="email" placeholder="Email" required />
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Creating...' : 'Create User'}
      </button>

      {mutation.isError && (
        <div className="error">{mutation.error.message}</div>
      )}
    </form>
  )
}
```

## データフェッチとローダー

### ルートローダー

```typescript
// src/routes/posts/$postId.tsx
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/start'

const getPost = createServerFn()
  .validator((postId: string) => postId)
  .handler(async ({ data: postId }) => {
    const post = await db.post.findUnique({
      where: { id: postId },
      include: { author: true, comments: true },
    })

    if (!post) {
      throw new Error('Post not found')
    }

    return post
  })

export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => {
    return getPost({ data: params.postId })
  },
  component: PostDetail,
})

function PostDetail() {
  const post = Route.useLoaderData()

  return (
    <article>
      <h1>{post.title}</h1>
      <p>By {post.author.name}</p>
      <div>{post.content}</div>

      <section>
        <h2>Comments ({post.comments.length})</h2>
        {post.comments.map((comment) => (
          <div key={comment.id}>
            <p>{comment.content}</p>
          </div>
        ))}
      </section>
    </article>
  )
}
```

### 並列データフェッチ

```typescript
// src/routes/dashboard.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard')({
  loader: async () => {
    // 並列実行
    const [users, posts, stats] = await Promise.all([
      getUsers({ data: { page: 1, limit: 10 } }),
      getPosts({ data: { page: 1, limit: 5 } }),
      getStats({ data: {} }),
    ])

    return { users, posts, stats }
  },
  component: Dashboard,
})

function Dashboard() {
  const { users, posts, stats } = Route.useLoaderData()

  return (
    <div className="dashboard">
      <section>
        <h2>Stats</h2>
        <p>Total Users: {stats.totalUsers}</p>
        <p>Total Posts: {stats.totalPosts}</p>
      </section>

      <section>
        <h2>Recent Users</h2>
        {users.map((user) => (
          <div key={user.id}>{user.name}</div>
        ))}
      </section>

      <section>
        <h2>Recent Posts</h2>
        {posts.map((post) => (
          <div key={post.id}>{post.title}</div>
        ))}
      </section>
    </div>
  )
}
```

## 認証

### サーバー関数での認証

```typescript
// src/server/auth.ts
import { createServerFn } from '@tanstack/start'
import { getServerSession } from './session'

export const requireAuth = createServerFn()
  .handler(async () => {
    const session = await getServerSession()

    if (!session) {
      throw new Error('Unauthorized')
    }

    return session
  })

// 保護されたサーバー関数
export const getMyProfile = createServerFn()
  .handler(async () => {
    const session = await requireAuth({ data: undefined })

    const user = await db.user.findUnique({
      where: { id: session.userId },
    })

    return user
  })
```

### ルートガード

```typescript
// src/routes/_authenticated.tsx
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getServerSession } from '../server/session'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const session = await getServerSession()

    if (!session) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }

    return { session }
  },
  component: AuthLayout,
})

function AuthLayout() {
  const { session } = Route.useRouteContext()

  return (
    <div>
      <header>
        <p>Logged in as {session.user.name}</p>
        <button onClick={() => logout()}>Logout</button>
      </header>
      <Outlet />
    </div>
  )
}
```

## SSR（サーバーサイドレンダリング）

TanStack StartはデフォルトでSSRに対応しています。

### カスタムレンダリング

```typescript
// src/entry-server.tsx
import { createStartHandler, defaultStreamHandler } from '@tanstack/start/server'
import { getRouterManifest } from '@tanstack/start/router-manifest'

export default createStartHandler({
  createRouter: () => import('./router').then((m) => m.createRouter()),
  getRouterManifest,
})(defaultStreamHandler)
```

### メタタグとSEO

```typescript
// src/routes/posts/$postId.tsx
import { createFileRoute } from '@tanstack/react-router'
import { Meta } from '@tanstack/start'

export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => {
    return getPost({ data: params.postId })
  },
  component: PostDetail,
})

function PostDetail() {
  const post = Route.useLoaderData()

  return (
    <>
      <Meta>
        <title>{post.title} | My Blog</title>
        <meta name="description" content={post.excerpt} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:image" content={post.coverImage} />
      </Meta>

      <article>
        <h1>{post.title}</h1>
        <div>{post.content}</div>
      </article>
    </>
  )
}
```

## デプロイ

### Vercel

```typescript
// app.config.ts
import { defineConfig } from '@tanstack/start/config'
import vercel from '@tanstack/start/adapters/vercel'

export default defineConfig({
  server: {
    preset: 'vercel',
  },
})
```

```bash
npm run build
vercel deploy
```

### Cloudflare Pages

```typescript
// app.config.ts
import { defineConfig } from '@tanstack/start/config'
import cloudflare from '@tanstack/start/adapters/cloudflare-pages'

export default defineConfig({
  server: {
    preset: 'cloudflare-pages',
  },
})
```

### Node.js

```typescript
// app.config.ts
import { defineConfig } from '@tanstack/start/config'

export default defineConfig({
  server: {
    preset: 'node-server',
  },
})
```

```bash
npm run build
node .output/server/index.mjs
```

## まとめ

TanStack Startは、型安全性とDXを重視したモダンなフルスタックフレームワークです。

### 主な利点

- **型安全**: サーバーからクライアントまでエンドツーエンド
- **TanStack Query統合**: データフェッチのベストプラクティス
- **柔軟なルーティング**: ファイルベース + プログラマティック
- **高速ビルド**: Viteベースのバンドラー
- **デプロイ簡単**: 複数のプラットフォーム対応

### 今後の展開

- Vue/Solid対応
- エコシステムの拡充
- パフォーマンス最適化

TanStack Startで、次世代のフルスタック開発を始めましょう。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)

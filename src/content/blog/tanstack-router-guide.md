---
title: 'TanStack Router完全ガイド - 型安全なルーティングの新定番'
description: 'TanStack Routerの基本からファイルベースルーティング、データローダー、検索パラメータ管理まで。React向け型安全ルーターを徹底解説。'
pubDate: 'Feb 05 2026'
tags: ['TanStack Router', 'React', 'TypeScript']
---

# TanStack Router完全ガイド - 型安全なルーティングの新定番

TanStack Routerは、React向けの型安全なルーティングライブラリです。React Routerの代替として、TypeScriptとの完全な統合、ファイルベースルーティング、組み込みのデータローダー機能を提供します。

## TanStack Routerとは

### 特徴

1. **100%型安全** - パス、パラメータ、検索パラメータまで完全な型推論
2. **ファイルベースルーティング** - Next.jsライクなファイル構造
3. **データローダー** - ルートレベルのデータフェッチ機能
4. **検索パラメータ管理** - URLクエリパラメータの型安全な管理
5. **DevTools** - 開発者ツール標準搭載

### React Routerとの比較

| 項目 | React Router | TanStack Router |
|------|-------------|-----------------|
| 型安全性 | 部分的 | 完全 |
| 検索パラメータ | 手動管理 | 組み込み |
| データローダー | loader関数 | より柔軟 |
| バンドルサイズ | 中 | 中 |
| DevTools | なし | あり |

## セットアップ

### インストール

```bash
npm install @tanstack/react-router
npm install -D @tanstack/router-plugin @tanstack/router-devtools
```

### Vite設定

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    react(),
  ],
})
```

## ファイルベースルーティング

### ディレクトリ構造

```
src/
├── routes/
│   ├── __root.tsx         # ルートレイアウト
│   ├── index.tsx          # /
│   ├── about.tsx          # /about
│   ├── posts/
│   │   ├── index.tsx      # /posts
│   │   └── $postId.tsx    # /posts/:postId
│   └── settings/
│       ├── route.tsx      # /settings レイアウト
│       ├── profile.tsx    # /settings/profile
│       └── account.tsx    # /settings/account
├── main.tsx
└── routeTree.gen.ts       # 自動生成
```

### ルートレイアウト

```typescript
// src/routes/__root.tsx
import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

export const Route = createRootRoute({
  component: () => (
    <>
      <nav>
        <Link to="/" activeProps={{ className: 'active' }}>
          Home
        </Link>
        <Link to="/about">About</Link>
        <Link to="/posts">Posts</Link>
      </nav>
      <main>
        <Outlet />
      </main>
      <TanStackRouterDevtools />
    </>
  ),
})
```

### 基本ルート

```typescript
// src/routes/index.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return <h1>Welcome to TanStack Router</h1>
}
```

### 動的ルート

```typescript
// src/routes/posts/$postId.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => {
    const res = await fetch(`/api/posts/${params.postId}`)
    if (!res.ok) throw new Error('Post not found')
    return res.json()
  },
  component: PostDetail,
})

function PostDetail() {
  const post = Route.useLoaderData()
  const { postId } = Route.useParams()

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  )
}
```

## 検索パラメータ（Search Params）

### 型安全な検索パラメータ

```typescript
// src/routes/posts/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const postSearchSchema = z.object({
  page: z.number().default(1),
  sort: z.enum(['newest', 'oldest', 'popular']).default('newest'),
  tag: z.string().optional(),
})

export const Route = createFileRoute('/posts/')({
  validateSearch: postSearchSchema,
  component: PostList,
})

function PostList() {
  const { page, sort, tag } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <div>
      <h1>Posts (Page {page})</h1>

      <select
        value={sort}
        onChange={(e) =>
          navigate({
            search: (prev) => ({ ...prev, sort: e.target.value }),
          })
        }
      >
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="popular">Popular</option>
      </select>

      <button
        onClick={() =>
          navigate({
            search: (prev) => ({ ...prev, page: prev.page + 1 }),
          })
        }
      >
        Next Page
      </button>
    </div>
  )
}
```

### リンクでの検索パラメータ

```typescript
// 型安全なLink - 間違った検索パラメータはコンパイルエラー
<Link
  to="/posts"
  search={{ page: 1, sort: 'newest' }}
>
  Posts
</Link>

// 既存の検索パラメータを保持
<Link
  to="/posts"
  search={(prev) => ({ ...prev, page: 2 })}
>
  Page 2
</Link>
```

## データローダー

### 基本的なローダー

```typescript
export const Route = createFileRoute('/users/')({
  loader: async () => {
    const res = await fetch('/api/users')
    return res.json() as Promise<User[]>
  },
  component: UserList,
})

function UserList() {
  const users = Route.useLoaderData()

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  )
}
```

### コンテキスト付きローダー

```typescript
// __root.tsx
export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
})

// posts/$postId.tsx
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ context, params }) => {
    return context.queryClient.ensureQueryData({
      queryKey: ['posts', params.postId],
      queryFn: () => fetchPost(params.postId),
    })
  },
  component: PostDetail,
})
```

### ペンディングUI

```typescript
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => fetchPost(params.postId),
  pendingComponent: () => <div>Loading post...</div>,
  errorComponent: ({ error }) => <div>Error: {error.message}</div>,
  component: PostDetail,
})
```

## ナビゲーション

### プログラム的ナビゲーション

```typescript
function MyComponent() {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate({
      to: '/posts/$postId',
      params: { postId: '123' },
      search: { tab: 'comments' },
    })
  }

  return <button onClick={handleClick}>Go to post</button>
}
```

### 型安全なリンク

```typescript
// パラメータが必要なルートには必ず指定が必要（型エラーで検出）
<Link to="/posts/$postId" params={{ postId: '123' }}>
  Post 123
</Link>

// アクティブ状態のスタイリング
<Link
  to="/posts"
  activeProps={{ className: 'text-blue-500 font-bold' }}
  inactiveProps={{ className: 'text-gray-500' }}
>
  Posts
</Link>
```

## レイアウトルート

### ネストされたレイアウト

```typescript
// src/routes/settings/route.tsx
import { createFileRoute, Outlet, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/settings')({
  component: SettingsLayout,
})

function SettingsLayout() {
  return (
    <div className="settings">
      <nav>
        <Link to="/settings/profile">Profile</Link>
        <Link to="/settings/account">Account</Link>
      </nav>
      <div className="settings-content">
        <Outlet />
      </div>
    </div>
  )
}

// src/routes/settings/profile.tsx
export const Route = createFileRoute('/settings/profile')({
  component: () => <h2>Profile Settings</h2>,
})
```

## エラーハンドリング

### ルートレベルエラー

```typescript
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => {
    const res = await fetch(`/api/posts/${params.postId}`)
    if (!res.ok) {
      throw new Error(`Post ${params.postId} not found`)
    }
    return res.json()
  },
  errorComponent: ({ error, reset }) => (
    <div>
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  ),
  component: PostDetail,
})
```

### Not Found処理

```typescript
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => {
    const post = await fetchPost(params.postId)
    if (!post) {
      throw notFound()
    }
    return post
  },
  notFoundComponent: () => <div>Post not found</div>,
  component: PostDetail,
})
```

## まとめ

TanStack Routerの主な利点：

1. **完全な型安全性** - パス、パラメータ、検索パラメータすべて
2. **優れたDX** - ファイルベースルーティングとDevTools
3. **柔軟なデータローダー** - TanStack Queryとの統合
4. **検索パラメータ管理** - URLの状態管理を型安全に

React Routerからの移行も比較的簡単で、TypeScriptプロジェクトでのルーティングの新しいスタンダードとなりつつあります。

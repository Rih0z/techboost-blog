---
title: 'tRPC v11実践: Server Functionsとの統合による型安全なフルスタック開発'
description: 'tRPC v11の新機能Server Functionsを活用し、Next.js App RouterやReact Server Componentsと完全統合する実践ガイド。従来のRPC方式との違いや移行戦略も解説。開発効率を上げるヒントが満載です。'
pubDate: '2025-11-18'
updatedDate: 'Nov 18 2025'
tags: ['tRPC', 'TypeScript', 'Next.js', 'React Server Components']
heroImage: '../../assets/thumbnails/trpc-v11-server-functions.jpg'
---

tRPC v11では、React Server Components（RSC）やNext.js App Routerとのシームレスな統合を実現する「Server Functions」が導入されました。この記事では、従来のRPC方式とServer Functionsの違い、実装パターン、パフォーマンス最適化まで徹底解説します。

## tRPC v11の新機能: Server Functions

### 従来のtRPCとの違い

従来のtRPCは、HTTPエンドポイントを経由してクライアント・サーバー間でRPCコールを実行していました。tRPC v11のServer Functionsは、React Server ActionsやNext.js Server Actionsと同様のパラダイムを採用し、より直感的なサーバーサイドロジック呼び出しを実現します。

```typescript
// 従来のtRPC (v10)
const users = await trpc.user.list.query() // HTTPリクエスト経由

// tRPC v11 Server Functions
const users = await getUserList() // 直接サーバー関数を呼び出し
```

### Server Functionsの利点

1. **ゼロコストRPC** - バンドルサイズの削減（クライアント側コード不要）
2. **サーバーコンポーネントとの完全統合** - async/awaitでシームレスに利用
3. **型安全性の維持** - TypeScriptの型推論がそのまま機能
4. **ストリーミング対応** - React 19のSuspenseやStreaming SSR対応
5. **コロケーション** - サーバーロジックとUIコンポーネントを近接配置

## セットアップ

### インストール

```bash
npm install @trpc/server@next @trpc/client@next @trpc/react-query@next
npm install @trpc/next@next @tanstack/react-query zod
```

### プロジェクト構造

```
src/
├── app/
│   ├── (routes)/
│   │   ├── users/
│   │   │   ├── page.tsx
│   │   │   └── actions.ts        # Server Functions
│   │   └── posts/
│   │       ├── page.tsx
│   │       └── actions.ts
│   ├── api/trpc/[trpc]/route.ts  # 従来のRPCエンドポイント（オプション）
│   └── layout.tsx
├── server/
│   ├── routers/
│   │   ├── user.ts
│   │   └── post.ts
│   ├── functions/                # Server Functions定義
│   │   ├── user.ts
│   │   └── post.ts
│   ├── trpc.ts
│   └── index.ts
└── lib/
    └── trpc.ts
```

### サーバー設定

```typescript
// src/server/trpc.ts
import { initTRPC } from '@trpc/server'
import { cache } from 'react'
import { cookies, headers } from 'next/headers'

// Server Functions用のコンテキスト作成（React cacheでメモ化）
export const createContext = cache(async () => {
  const cookieStore = await cookies()
  const headersList = await headers()

  return {
    cookies: cookieStore,
    headers: headersList,
    // 認証情報など
    userId: cookieStore.get('userId')?.value,
  }
})

export type Context = Awaited<ReturnType<typeof createContext>>

export const t = initTRPC.context<Context>().create({
  transformer: {
    serialize: (object) => JSON.stringify(object),
    deserialize: (object) => JSON.parse(object),
  },
})

export const router = t.router
export const publicProcedure = t.procedure
export const createCallerFactory = t.createCallerFactory
```

### Server Functions定義

```typescript
// src/server/functions/user.ts
import { z } from 'zod'
import { createContext, createCallerFactory, router, publicProcedure } from '../trpc'
import { db } from '@/lib/db'

// ルーター定義
export const userRouter = router({
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const users = await db.user.findMany({
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: 'desc' },
      })

      let nextCursor: string | undefined
      if (users.length > input.limit) {
        const nextItem = users.pop()
        nextCursor = nextItem!.id
      }

      return {
        users,
        nextCursor,
      }
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const user = await db.user.findUnique({
        where: { id: input.id },
      })

      if (!user) {
        throw new Error('User not found')
      }

      return user
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        email: z.string().email(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.user.create({
        data: input,
      })
    }),
})

// Server Function用のcaller作成
const createCaller = createCallerFactory(userRouter)

// Reactコンポーネントから直接呼び出せるServer Functions
export async function getUserList(input?: { limit?: number; cursor?: string }) {
  const ctx = await createContext()
  const caller = createCaller(ctx)
  return caller.list(input ?? {})
}

export async function getUserById(id: string) {
  const ctx = await createContext()
  const caller = createCaller(ctx)
  return caller.getById({ id })
}

export async function createUser(input: { name: string; email: string }) {
  'use server'
  const ctx = await createContext()
  const caller = createCaller(ctx)
  return caller.create(input)
}
```

## React Server Componentsでの利用

### 基本的な使い方

```typescript
// src/app/users/page.tsx
import { getUserList } from '@/server/functions/user'
import { Suspense } from 'react'

async function UserList() {
  const { users } = await getUserList({ limit: 20 })

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>
          {user.name} ({user.email})
        </li>
      ))}
    </ul>
  )
}

export default function UsersPage() {
  return (
    <div>
      <h1>Users</h1>
      <Suspense fallback={<div>Loading users...</div>}>
        <UserList />
      </Suspense>
    </div>
  )
}
```

### パラレルデータフェッチング

```typescript
// src/app/dashboard/page.tsx
import { getUserStats } from '@/server/functions/user'
import { getPostStats } from '@/server/functions/post'
import { getAnalytics } from '@/server/functions/analytics'

export default async function DashboardPage() {
  // 並列実行でパフォーマンス最適化
  const [userStats, postStats, analytics] = await Promise.all([
    getUserStats(),
    getPostStats(),
    getAnalytics(),
  ])

  return (
    <div>
      <StatCard title="Users" data={userStats} />
      <StatCard title="Posts" data={postStats} />
      <AnalyticsChart data={analytics} />
    </div>
  )
}
```

### ストリーミングSSR

```typescript
// src/app/posts/page.tsx
import { Suspense } from 'react'
import { getRecentPosts, getTrendingPosts } from '@/server/functions/post'

async function RecentPosts() {
  const posts = await getRecentPosts()
  return <PostList posts={posts} />
}

async function TrendingPosts() {
  // 重い処理でもストリーミングで段階的レンダリング
  const posts = await getTrendingPosts()
  return <PostList posts={posts} />
}

export default function PostsPage() {
  return (
    <div>
      <section>
        <h2>Recent Posts</h2>
        <Suspense fallback={<Skeleton />}>
          <RecentPosts />
        </Suspense>
      </section>

      <section>
        <h2>Trending Posts</h2>
        <Suspense fallback={<Skeleton />}>
          <TrendingPosts />
        </Suspense>
      </section>
    </div>
  )
}
```

## Client Componentsでの利用（Server Actions）

### フォーム送信

```typescript
// src/app/users/new/page.tsx
'use client'

import { createUser } from '@/server/functions/user'
import { useActionState } from 'react'

export default function NewUserPage() {
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      try {
        const result = await createUser({
          name: formData.get('name') as string,
          email: formData.get('email') as string,
        })
        return { success: true, user: result }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    },
    { success: false }
  )

  return (
    <form action={formAction}>
      <input name="name" required placeholder="Name" />
      <input name="email" type="email" required placeholder="Email" />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create User'}
      </button>
      {state.error && <p className="error">{state.error}</p>}
      {state.success && <p className="success">User created!</p>}
    </form>
  )
}
```

### Optimistic Updates

```typescript
// src/app/posts/[id]/like-button.tsx
'use client'

import { toggleLike } from '@/server/functions/post'
import { useOptimistic, useTransition } from 'react'

export function LikeButton({ postId, initialLikes }: { postId: string; initialLikes: number }) {
  const [isPending, startTransition] = useTransition()
  const [optimisticLikes, addOptimisticLike] = useOptimistic(
    initialLikes,
    (currentLikes, amount: number) => currentLikes + amount
  )

  const handleLike = () => {
    startTransition(async () => {
      addOptimisticLike(1) // 即座にUIを更新
      await toggleLike({ postId })
    })
  }

  return (
    <button onClick={handleLike} disabled={isPending}>
      ❤️ {optimisticLikes} Likes
    </button>
  )
}
```

## 認証とミドルウェア

### コンテキストベース認証

```typescript
// src/server/trpc.ts
import { TRPCError } from '@trpc/server'
import { getServerSession } from '@/lib/auth'

export const createContext = cache(async () => {
  const session = await getServerSession()

  return {
    session,
    userId: session?.user?.id,
  }
})

// 認証ミドルウェア
const isAuthenticated = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in',
    })
  }

  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId, // 型を確定
    },
  })
})

export const protectedProcedure = t.procedure.use(isAuthenticated)
```

### 認証が必要なServer Function

```typescript
// src/server/functions/post.ts
import { protectedProcedure, router, createCallerFactory, createContext } from '../trpc'
import { z } from 'zod'

const postRouter = router({
  createDraft: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        content: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await db.post.create({
        data: {
          ...input,
          authorId: ctx.userId, // 型安全
          published: false,
        },
      })
    }),
})

const createCaller = createCallerFactory(postRouter)

export async function createDraft(input: { title: string; content: string }) {
  'use server'
  const ctx = await createContext()
  const caller = createCaller(ctx)
  return caller.createDraft(input)
}
```

## ハイブリッド構成: RPCとServer Functionsの併用

### 使い分けのガイドライン

```typescript
// Server Functions: サーバーコンポーネント・Server Actionsで使用
export async function getUserProfile(id: string) {
  const ctx = await createContext()
  const caller = createCaller(ctx)
  return caller.getById({ id })
}

// 従来のRPC: クライアントコンポーネントでのリアルタイムデータ取得
// src/app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from '@/server'

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
  })

export { handler as GET, handler as POST }
```

### クライアント側でのRPC利用

```typescript
// src/app/users/[id]/real-time-activity.tsx
'use client'

import { trpc } from '@/lib/trpc'

export function RealTimeActivity({ userId }: { userId: string }) {
  // リアルタイムデータはRPCで取得
  const { data: activity } = trpc.user.getActivity.useQuery(
    { userId },
    {
      refetchInterval: 5000, // 5秒ごとに更新
    }
  )

  return (
    <div>
      <h3>Recent Activity</h3>
      {activity?.map((item) => (
        <ActivityItem key={item.id} item={item} />
      ))}
    </div>
  )
}
```

## パフォーマンス最適化

### React Cache活用

```typescript
// src/server/functions/user.ts
import { cache } from 'react'
import { unstable_cache } from 'next/cache'

// リクエスト単位でのキャッシュ
export const getUserById = cache(async (id: string) => {
  const ctx = await createContext()
  const caller = createCaller(ctx)
  return caller.getById({ id })
})

// Next.js Data Cacheでの永続化
export const getCachedUserStats = unstable_cache(
  async () => {
    const ctx = await createContext()
    const caller = createCaller(ctx)
    return caller.getStats()
  },
  ['user-stats'],
  {
    revalidate: 3600, // 1時間キャッシュ
    tags: ['user-stats'],
  }
)
```

### Prefetchingとパラレルフェッチ

```typescript
// src/app/posts/[id]/page.tsx
import { getPostById, getRelatedPosts } from '@/server/functions/post'

export async function generateStaticParams() {
  // ビルド時に静的生成するパスを指定
  const posts = await getAllPostIds()
  return posts.map((id) => ({ id }))
}

export default async function PostPage({ params }: { params: { id: string } }) {
  // 並列取得
  const [post, relatedPosts] = await Promise.all([
    getPostById(params.id),
    getRelatedPosts(params.id),
  ])

  return (
    <article>
      <h1>{post.title}</h1>
      <div>{post.content}</div>
      <aside>
        <h2>Related Posts</h2>
        <RelatedPostList posts={relatedPosts} />
      </aside>
    </article>
  )
}
```

### Partial Prerendering (PPR)

```typescript
// src/app/dashboard/page.tsx
export const experimental_ppr = true

export default async function DashboardPage() {
  // 静的部分: ビルド時に生成
  const staticData = await getStaticDashboardData()

  return (
    <div>
      <StaticHeader data={staticData} />

      {/* 動的部分: リクエスト時に生成 */}
      <Suspense fallback={<Skeleton />}>
        <DynamicUserStats />
      </Suspense>
    </div>
  )
}

async function DynamicUserStats() {
  const stats = await getUserStats() // 動的データ取得
  return <UserStatsCard stats={stats} />
}
```

## エラーハンドリング

### Server Functionのエラー処理

```typescript
// src/server/functions/post.ts
import { TRPCError } from '@trpc/server'

export async function publishPost(id: string) {
  'use server'

  try {
    const ctx = await createContext()
    const caller = createCaller(ctx)
    return await caller.publish({ id })
  } catch (error) {
    if (error instanceof TRPCError) {
      // tRPCエラーをReact Server Action形式に変換
      throw new Error(error.message)
    }
    throw error
  }
}
```

### クライアント側でのエラーハンドリング

```typescript
// src/app/posts/[id]/publish-button.tsx
'use client'

import { publishPost } from '@/server/functions/post'
import { useTransition } from 'react'

export function PublishButton({ postId }: { postId: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handlePublish = () => {
    setError(null)
    startTransition(async () => {
      try {
        await publishPost(postId)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to publish')
      }
    })
  }

  return (
    <>
      <button onClick={handlePublish} disabled={isPending}>
        {isPending ? 'Publishing...' : 'Publish'}
      </button>
      {error && <p className="error">{error}</p>}
    </>
  )
}
```

## まとめ

tRPC v11のServer Functionsは、React Server ComponentsとServer Actionsのパラダイムに完全適合し、以下の利点を提供します。

### 主な利点

1. **バンドルサイズの削減** - クライアント側のRPCコードが不要
2. **シームレスな統合** - RSC/Server Actionsとネイティブに統合
3. **型安全性の維持** - TypeScriptの型推論がそのまま機能
4. **柔軟性** - RPCとServer Functionsのハイブリッド構成が可能

### 使い分けの推奨

- **Server Functions**: 初期ページロード、フォーム送信、サーバーコンポーネント
- **従来のRPC**: リアルタイムデータ、クライアント側のインタラクティブ機能、WebSocket

tRPC v11は、Next.js App Routerの能力を最大限活用し、モダンなフルスタック開発を実現する強力なツールです。

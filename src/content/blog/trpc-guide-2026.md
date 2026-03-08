---
title: 'tRPC完全ガイド - 型安全なAPI開発の決定版'
description: 'tRPCの基本からNext.js統合・認証・エラーハンドリング・パフォーマンス最適化まで徹底解説。GraphQLやREST APIとの違いと使い分けの判断基準も紹介。'
pubDate: '2026-02-05'
tags: ['tRPC', 'TypeScript', 'Next.js']
heroImage: '../../assets/thumbnails/trpc-guide-2026.jpg'
---

tRPCは、TypeScriptでエンドツーエンドの型安全性を実現するRPCフレームワークです。REST APIやGraphQLのような複雑な設定なしに、フロントエンドとバックエンド間で完全な型共有が可能です。

## tRPCとは

### 特徴

1. **エンドツーエンド型安全** - クライアントとサーバーで型を共有
2. **コード生成不要** - TypeScriptの型推論を活用
3. **軽量** - 追加のビルドステップなし
4. **開発体験** - 自動補完とリファクタリング
5. **柔軟性** - 任意のバックエンドフレームワークで利用可能

### REST API / GraphQLとの比較

| 項目 | REST API | GraphQL | tRPC |
|------|----------|---------|------|
| 型安全性 | 手動（OpenAPI等） | 手動（codegen） | 自動 |
| セットアップ | 簡単 | 複雑 | 簡単 |
| バンドルサイズ | 小 | 大 | 小 |
| 学習コスト | 低 | 高 | 低 |
| クエリ最適化 | 手動 | 自動 | 手動 |

## セットアップ

### Next.js App Routerでの導入

```bash
npm install @trpc/server @trpc/client @trpc/react-query @trpc/next
npm install @tanstack/react-query zod
```

### プロジェクト構造

```
src/
├── app/
│   ├── api/trpc/[trpc]/route.ts
│   └── page.tsx
├── server/
│   ├── routers/
│   │   ├── user.ts
│   │   └── post.ts
│   ├── trpc.ts
│   └── index.ts
└── trpc/
    ├── client.ts
    └── server.ts
```

### サーバーセットアップ

```typescript
// src/server/trpc.ts
import { initTRPC } from '@trpc/server'
import { ZodError } from 'zod'

export const t = initTRPC.create({
  errorFormatter(opts) {
    const { shape, error } = opts
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.code === 'BAD_REQUEST' && error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    }
  },
})

export const router = t.router
export const publicProcedure = t.procedure
```

### ルーター定義

```typescript
// src/server/routers/user.ts
import { z } from 'zod'
import { router, publicProcedure } from '../trpc'

export const userRouter = router({
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      // データベースから取得
      const user = await db.user.findUnique({
        where: { id: input.id },
      })
      return user
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
      })
    )
    .mutation(async ({ input }) => {
      const user = await db.user.create({
        data: input,
      })
      return user
    }),

  list: publicProcedure.query(async () => {
    const users = await db.user.findMany()
    return users
  }),
})
```

### メインルーター

```typescript
// src/server/index.ts
import { router } from './trpc'
import { userRouter } from './routers/user'
import { postRouter } from './routers/post'

export const appRouter = router({
  user: userRouter,
  post: postRouter,
})

export type AppRouter = typeof appRouter
```

### Next.js API Route

```typescript
// src/app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from '@/server'

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => ({}),
  })

export { handler as GET, handler as POST }
```

### クライアントセットアップ

```typescript
// src/trpc/client.ts
import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '@/server'

export const trpc = createTRPCReact<AppRouter>()
```

```typescript
// src/app/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { useState } from 'react'
import { trpc } from '@/trpc/client'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
        }),
      ],
    })
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  )
}
```

```typescript
// src/app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

## 基本的な使い方

### Query（データ取得）

```typescript
'use client'

import { trpc } from '@/trpc/client'

export default function UserList() {
  const { data, isLoading, error } = trpc.user.list.useQuery()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <ul>
      {data?.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  )
}
```

### パラメータ付きQuery

```typescript
function UserProfile({ userId }: { userId: string }) {
  const { data: user } = trpc.user.getById.useQuery({ id: userId })

  return <div>{user?.name}</div>
}
```

### Mutation（データ変更）

```typescript
function CreateUser() {
  const utils = trpc.useUtils()
  const createUser = trpc.user.create.useMutation({
    onSuccess: () => {
      // キャッシュを無効化してリフレッシュ
      utils.user.list.invalidate()
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    createUser.mutate({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Name" />
      <input name="email" type="email" placeholder="Email" />
      <button type="submit" disabled={createUser.isPending}>
        {createUser.isPending ? 'Creating...' : 'Create User'}
      </button>
      {createUser.error && <p>{createUser.error.message}</p>}
    </form>
  )
}
```

## 認証とコンテキスト

### コンテキストの定義

```typescript
// src/server/trpc.ts
import { inferAsyncReturnType } from '@trpc/server'
import { cookies } from 'next/headers'

export async function createContext() {
  const session = await getSession(cookies())

  return {
    session,
  }
}

export type Context = inferAsyncReturnType<typeof createContext>

export const t = initTRPC.context<Context>().create()
```

### 保護されたプロシージャ

```typescript
// src/server/trpc.ts
import { TRPCError } from '@trpc/server'

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      session: ctx.session,
    },
  })
})

export const protectedProcedure = t.procedure.use(isAuthed)
```

### 認証ルーターの例

```typescript
// src/server/routers/post.ts
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { z } from 'zod'

export const postRouter = router({
  // 誰でも閲覧可能
  list: publicProcedure.query(async () => {
    return await db.post.findMany()
  }),

  // ログインユーザーのみ
  create: protectedProcedure
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
          authorId: ctx.session.user.id,
        },
      })
    }),

  // 自分の投稿のみ削除可能
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const post = await db.post.findUnique({
        where: { id: input.id },
      })

      if (post?.authorId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      await db.post.delete({ where: { id: input.id } })
      return { success: true }
    }),
})
```

## バリデーション（Zod）

### 入力バリデーション

```typescript
import { z } from 'zod'

const createPostInput = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(10),
  tags: z.array(z.string()).max(5).optional(),
  publishedAt: z.date().optional(),
})

export const postRouter = router({
  create: protectedProcedure
    .input(createPostInput)
    .mutation(async ({ input }) => {
      // input は完全に型安全
      return await db.post.create({ data: input })
    }),
})
```

### カスタムバリデーション

```typescript
const registerInput = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})
```

### 再利用可能なスキーマ

```typescript
// src/server/schemas/user.ts
export const userIdSchema = z.object({
  id: z.string().uuid(),
})

export const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150).optional(),
})

// 使用例
export const userRouter = router({
  getById: publicProcedure
    .input(userIdSchema)
    .query(({ input }) => {
      // ...
    }),

  create: protectedProcedure
    .input(createUserSchema)
    .mutation(({ input }) => {
      // ...
    }),
})
```

## エラーハンドリング

### エラーコード

```typescript
import { TRPCError } from '@trpc/server'

export const postRouter = router({
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const post = await db.post.findUnique({
        where: { id: input.id },
      })

      if (!post) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Post not found',
        })
      }

      return post
    }),
})
```

### カスタムエラーハンドリング

```typescript
// クライアント側
function PostDetail({ id }: { id: string }) {
  const { data, error } = trpc.post.getById.useQuery({ id })

  if (error) {
    if (error.data?.code === 'NOT_FOUND') {
      return <div>Post not found</div>
    }
    return <div>Error: {error.message}</div>
  }

  return <div>{data?.title}</div>
}
```

## パフォーマンス最適化

### バッチング

```typescript
// 自動的に複数のリクエストを1つにまとめる
const user1 = trpc.user.getById.useQuery({ id: '1' })
const user2 = trpc.user.getById.useQuery({ id: '2' })
const user3 = trpc.user.getById.useQuery({ id: '3' })
// → 3つのリクエストが1つのHTTPリクエストにバッチされる
```

### データローダー（N+1問題の解決）

```typescript
import DataLoader from 'dataloader'

const userLoader = new DataLoader(async (ids: readonly string[]) => {
  const users = await db.user.findMany({
    where: { id: { in: [...ids] } },
  })
  return ids.map(id => users.find(u => u.id === id))
})

export const postRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    const posts = await db.post.findMany()

    // N+1問題を回避
    const postsWithAuthors = await Promise.all(
      posts.map(async post => ({
        ...post,
        author: await ctx.userLoader.load(post.authorId),
      }))
    )

    return postsWithAuthors
  }),
})
```

### prefetch（プリフェッチ）

```typescript
// サーバーコンポーネントでプリフェッチ
import { createCaller } from '@/server'

export default async function PostPage({ params }: { params: { id: string } }) {
  const caller = await createCaller()
  await caller.post.getById.prefetch({ id: params.id })

  return <PostDetail id={params.id} />
}

// クライアントコンポーネントはキャッシュを使う
'use client'
function PostDetail({ id }: { id: string }) {
  const { data } = trpc.post.getById.useQuery({ id })
  // サーバーでプリフェッチされたデータが即座に利用可能
  return <div>{data?.title}</div>
}
```

### React Query統合

```typescript
// 無限スクロール
function InfinitePosts() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.post.infiniteList.useInfiniteQuery(
    { limit: 10 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  )

  return (
    <div>
      {data?.pages.map(page =>
        page.items.map(post => (
          <div key={post.id}>{post.title}</div>
        ))
      )}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          Load more
        </button>
      )}
    </div>
  )
}
```

## サブスクリプション（WebSocket）

### サーバー設定

```typescript
import { observable } from '@trpc/server/observable'
import { EventEmitter } from 'events'

const ee = new EventEmitter()

export const postRouter = router({
  onNewPost: publicProcedure.subscription(() => {
    return observable<Post>((emit) => {
      const onPost = (data: Post) => {
        emit.next(data)
      }

      ee.on('newPost', onPost)

      return () => {
        ee.off('newPost', onPost)
      }
    })
  }),

  create: protectedProcedure
    .input(createPostInput)
    .mutation(async ({ input }) => {
      const post = await db.post.create({ data: input })
      ee.emit('newPost', post) // サブスクライバーに通知
      return post
    }),
})
```

### クライアント使用

```typescript
function RealtimePosts() {
  const [posts, setPosts] = useState<Post[]>([])

  trpc.post.onNewPost.useSubscription(undefined, {
    onData(post) {
      setPosts(prev => [post, ...prev])
    },
  })

  return (
    <div>
      {posts.map(post => (
        <div key={post.id}>{post.title}</div>
      ))}
    </div>
  )
}
```

## まとめ

tRPCの主な利点:

1. **完全な型安全性** - コンパイル時にエラー検出
2. **優れたDX** - 自動補完とリファクタリング
3. **シンプル** - GraphQLのような複雑さなし
4. **高速** - バッチング、キャッシング標準搭載

tRPCは、Next.jsやRemixなどのフルスタックフレームワークと組み合わせることで、TypeScriptの型システムを最大限活用した開発体験を提供します。REST APIやGraphQLの代替として、ぜひ検討してみてください。

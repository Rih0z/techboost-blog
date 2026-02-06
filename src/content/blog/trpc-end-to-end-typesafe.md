---
title: 'tRPCエンドツーエンド型安全API開発完全ガイド — フロントからバックエンドまで型で守る'
description: 'tRPCでエンドツーエンドの型安全API開発を実現。Next.js 15 App Router、Prisma、Zodと組み合わせた実践的な実装例、認証、エラーハンドリング、最適化手法まで完全網羅します。'
pubDate: '2025-02-06'
tags: ['tRPC', 'TypeScript', 'Next.js', 'API', 'Type Safety']
---

tRPC（TypeScript Remote Procedure Call）は、TypeScriptでエンドツーエンドの型安全なAPIを構築できる革命的なライブラリです。2026年現在、Next.js、Prisma、Zodとの組み合わせで、フロントエンドからバックエンドまで完全に型で守られた開発が主流になっています。

この記事では、tRPCの基礎から実践的な実装例、ベストプラクティスまで完全解説します。

## tRPCとは

tRPCは、TypeScriptの型を**フロントエンドとバックエンドで共有**できるライブラリです。

### 従来のREST API

```typescript
// バックエンド
app.get('/api/users/:id', async (req, res) => {
  const user = await db.user.findUnique({ where: { id: req.params.id } });
  res.json(user);
});

// フロントエンド
const response = await fetch(`/api/users/${id}`);
const user = await response.json(); // 型がない！
```

型定義が分離しており、バックエンドの変更がフロントエンドに自動反映されません。

### tRPCの場合

```typescript
// バックエンド
const appRouter = router({
  getUser: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await db.user.findUnique({ where: { id: input.id } });
    }),
});

// フロントエンド
const user = await trpc.getUser.query({ id: '123' }); // 完全に型安全！
```

バックエンドの変更が即座にフロントエンドに反映され、TypeScriptコンパイラがエラーを検出します。

## プロジェクトセットアップ

### Next.js 15 + tRPC + Prisma

```bash
npx create-next-app@latest my-trpc-app --typescript --tailwind --app
cd my-trpc-app

# tRPCのインストール
npm install @trpc/server @trpc/client @trpc/react-query @trpc/next @tanstack/react-query zod

# Prismaのインストール
npm install prisma @prisma/client
npx prisma init
```

### ディレクトリ構造

```
my-trpc-app/
├── app/
│   ├── api/
│   │   └── trpc/
│   │       └── [trpc]/
│   │           └── route.ts  # tRPC API Route
│   └── _trpc/
│       ├── client.tsx        # クライアント用Provider
│       └── serverClient.ts   # Server Component用
├── server/
│   ├── routers/
│   │   ├── user.ts
│   │   ├── post.ts
│   │   └── _app.ts           # ルーターの統合
│   ├── context.ts            # コンテキスト定義
│   └── trpc.ts               # tRPC初期化
└── prisma/
    └── schema.prisma
```

## tRPCサーバーのセットアップ

### 1. Prismaスキーマ

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
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  posts     Post[]
  createdAt DateTime @default(now())
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 2. tRPC初期化

```typescript
// server/trpc.ts
import { initTRPC } from '@trpc/server';
import { ZodError } from 'zod';

export const t = initTRPC.create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
```

### 3. コンテキスト定義

```typescript
// server/context.ts
import { prisma } from '@/lib/prisma';

export async function createContext() {
  return {
    prisma,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
```

### 4. ルーター作成

```typescript
// server/routers/user.ts
import { z } from 'zod';
import { router, publicProcedure } from '../trpc';

export const userRouter = router({
  // ユーザー一覧取得
  list: publicProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.user.findMany({
      include: { posts: true },
    });
  }),

  // ユーザー取得（ID指定）
  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.id },
        include: { posts: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    }),

  // ユーザー作成
  create: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().min(2),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.user.create({
        data: input,
      });
    }),

  // ユーザー更新
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        email: z.string().email().optional(),
        name: z.string().min(2).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      return await ctx.prisma.user.update({
        where: { id },
        data,
      });
    }),

  // ユーザー削除
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.user.delete({
        where: { id: input.id },
      });
    }),
});
```

```typescript
// server/routers/post.ts
import { z } from 'zod';
import { router, publicProcedure } from '../trpc';

export const postRouter = router({
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const posts = await ctx.prisma.post.findMany({
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: 'desc' },
        include: { author: true },
      });

      let nextCursor: string | undefined = undefined;
      if (posts.length > input.limit) {
        const nextItem = posts.pop();
        nextCursor = nextItem!.id;
      }

      return {
        posts,
        nextCursor,
      };
    }),

  create: publicProcedure
    .input(
      z.object({
        title: z.string().min(1),
        content: z.string().optional(),
        authorId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.post.create({
        data: input,
      });
    }),

  publish: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.post.update({
        where: { id: input.id },
        data: { published: true },
      });
    }),
});
```

### 5. ルーターの統合

```typescript
// server/routers/_app.ts
import { router } from '../trpc';
import { userRouter } from './user';
import { postRouter } from './post';

export const appRouter = router({
  user: userRouter,
  post: postRouter,
});

export type AppRouter = typeof appRouter;
```

### 6. API Route作成

```typescript
// app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/routers/_app';
import { createContext } from '@/server/context';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
  });

export { handler as GET, handler as POST };
```

## tRPCクライアントのセットアップ

### 1. クライアントProvider

```typescript
// app/_trpc/client.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import { useState } from 'react';
import type { AppRouter } from '@/server/routers/_app';

export const trpc = createTRPCReact<AppRouter>();

function getBaseUrl() {
  if (typeof window !== 'undefined') return '';
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
```

### 2. ルートレイアウトに適用

```typescript
// app/layout.tsx
import { TRPCProvider } from './_trpc/client';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
```

### 3. Server Component用クライアント

```typescript
// app/_trpc/serverClient.ts
import { appRouter } from '@/server/routers/_app';
import { createContext } from '@/server/context';

export const serverClient = appRouter.createCaller(await createContext());
```

## クライアント側での使用

### Client Componentでの使用

```typescript
// app/users/page.tsx
'use client';

import { trpc } from '@/app/_trpc/client';

export default function UsersPage() {
  const { data: users, isLoading, error } = trpc.user.list.useQuery();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>ユーザー一覧</h1>
      {users?.map((user) => (
        <div key={user.id}>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <p>投稿数: {user.posts.length}</p>
        </div>
      ))}
    </div>
  );
}
```

### Mutation（作成・更新・削除）

```typescript
// app/users/new/page.tsx
'use client';

import { trpc } from '@/app/_trpc/client';
import { useRouter } from 'next/navigation';

export default function NewUserPage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const createUser = trpc.user.create.useMutation({
    onSuccess: () => {
      // キャッシュを無効化して再取得
      utils.user.list.invalidate();
      router.push('/users');
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    createUser.mutate({
      email: formData.get('email') as string,
      name: formData.get('name') as string,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" type="text" placeholder="名前" required />
      <input name="email" type="email" placeholder="メール" required />
      <button type="submit" disabled={createUser.isPending}>
        {createUser.isPending ? '作成中...' : 'ユーザー作成'}
      </button>
      {createUser.error && <p>エラー: {createUser.error.message}</p>}
    </form>
  );
}
```

### Server Componentでの使用

```typescript
// app/users/[id]/page.tsx
import { serverClient } from '@/app/_trpc/serverClient';

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await serverClient.user.byId({ id });

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
      <h2>投稿一覧</h2>
      {user.posts.map((post) => (
        <article key={post.id}>
          <h3>{post.title}</h3>
          <p>{post.content}</p>
        </article>
      ))}
    </div>
  );
}
```

## 認証付きtRPC

### 認証コンテキスト

```typescript
// server/context.ts
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function createContext() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  // トークンからユーザー情報を取得（例: JWT検証）
  const user = token ? await verifyToken(token) : null;

  return {
    prisma,
    user,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

async function verifyToken(token: string) {
  // JWT検証ロジック
  // ...
  return { id: 'user-id', email: 'user@example.com' };
}
```

### 認証済みプロシージャ

```typescript
// server/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from './context';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// 認証が必要なプロシージャ
export const protectedProcedure = t.procedure.use(async (opts) => {
  if (!opts.ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  return opts.next({
    ctx: {
      ...opts.ctx,
      user: opts.ctx.user, // ユーザー情報を保証
    },
  });
});
```

### 認証ルーター

```typescript
// server/routers/auth.ts
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';

export const authRouter = router({
  // ログイン（公開）
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // パスワード検証
      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // トークン生成
      const token = generateToken(user.id);

      return { token };
    }),

  // プロフィール取得（要認証）
  me: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
    });
  }),
});
```

## 高度なパターン

### 無限スクロール

```typescript
// app/posts/page.tsx
'use client';

import { trpc } from '@/app/_trpc/client';

export default function PostsPage() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.post.list.useInfiniteQuery(
    { limit: 10 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  return (
    <div>
      {data?.pages.map((page, i) => (
        <div key={i}>
          {page.posts.map((post) => (
            <article key={post.id}>
              <h2>{post.title}</h2>
              <p>{post.content}</p>
            </article>
          ))}
        </div>
      ))}

      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? '読み込み中...' : 'もっと見る'}
        </button>
      )}
    </div>
  );
}
```

### Optimistic Update

```typescript
const utils = trpc.useUtils();

const publishPost = trpc.post.publish.useMutation({
  onMutate: async (variables) => {
    // 楽観的更新
    await utils.post.list.cancel();

    const previousPosts = utils.post.list.getData();

    utils.post.list.setData({ limit: 10 }, (old) => {
      if (!old) return old;

      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          posts: page.posts.map((post) =>
            post.id === variables.id ? { ...post, published: true } : post
          ),
        })),
      };
    });

    return { previousPosts };
  },

  onError: (err, variables, context) => {
    // エラー時にロールバック
    if (context?.previousPosts) {
      utils.post.list.setData({ limit: 10 }, context.previousPosts);
    }
  },

  onSettled: () => {
    // 最終的にサーバーから再取得
    utils.post.list.invalidate();
  },
});
```

## ベストプラクティス

### 1. Zodでバリデーション

```typescript
// Zodスキーマを再利用
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(50),
});

const updateUserSchema = createUserSchema.partial().extend({
  id: z.string(),
});

// プロシージャで使用
create: publicProcedure
  .input(createUserSchema)
  .mutation(({ ctx, input }) => {
    // ...
  }),
```

### 2. エラーハンドリング

```typescript
import { TRPCError } from '@trpc/server';

byId: publicProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ ctx, input }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: input.id },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return user;
  }),
```

### 3. ミドルウェア活用

```typescript
const loggerMiddleware = t.middleware(async ({ path, type, next }) => {
  const start = Date.now();
  const result = await next();
  const duration = Date.now() - start;

  console.log(`${type} ${path} - ${duration}ms`);

  return result;
});

export const loggedProcedure = t.procedure.use(loggerMiddleware);
```

## まとめ

tRPCは、TypeScriptでエンドツーエンドの型安全APIを構築できる強力なツールです。

- **完全な型安全** - フロントエンドとバックエンドで型を共有
- **Zodバリデーション** - 実行時の型チェック
- **React Query統合** - キャッシュ、無限スクロール対応
- **認証・認可** - ミドルウェアで柔軟に実装
- **高パフォーマンス** - バッチリクエスト、Optimistic Update

Next.js 15 + tRPC + Prisma + Zodの組み合わせで、最高の開発体験と型安全性を実現できます。

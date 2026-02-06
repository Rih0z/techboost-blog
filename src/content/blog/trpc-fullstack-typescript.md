---
title: "tRPCで型安全なフルスタックTypeScript開発 - エンドツーエンドの型安全性を実現"
description: "tRPCを使ったフルスタックTypeScriptアプリケーション開発の実践ガイド。Next.js App Router、Prisma、Zodを組み合わせた完全な型安全開発を解説します。"
pubDate: "2025-02-05"
---

# tRPCで型安全なフルスタックTypeScript開発

tRPCは、TypeScriptのフルスタック開発において、フロントエンドとバックエンド間の完全な型安全性を実現するライブラリです。GraphQLやREST APIのような冗長なスキーマ定義なしに、TypeScriptの型システムをそのまま活用できます。

この記事では、Next.js App Router、Prisma、Zodを組み合わせた実践的なフルスタックアプリケーション開発を通じて、tRPCの強力な機能を解説します。

## tRPCの特徴と利点

### 完全な型安全性

tRPCの最大の特徴は、エンドツーエンドの型安全性です。

```typescript
// サーバー側でプロシージャを定義
export const appRouter = router({
  getUser: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await db.user.findUnique({
        where: { id: input.id }
      });
    }),
});

// クライアント側で呼び出し（型推論が効く）
const user = await trpc.getUser.query({ id: '123' });
// user の型は自動的に推論される
console.log(user.name); // 型安全！
```

### ゼロコード生成

GraphQLと異なり、コード生成が不要です。TypeScriptの型推論を直接利用するため、ビルドプロセスがシンプルになります。

### 軽量で高速

REST APIやGraphQLに比べて、オーバーヘッドが少なく、バンドルサイズも小さくなります。

## プロジェクトセットアップ

### 依存関係のインストール

Next.js 14 App Routerを使用した環境を構築します。

```bash
# プロジェクト作成
npx create-next-app@latest my-trpc-app --typescript --tailwind --app

# tRPC関連のパッケージをインストール
npm install @trpc/server @trpc/client @trpc/next @trpc/react-query @tanstack/react-query

# バリデーションライブラリ
npm install zod

# データベースORM
npm install @prisma/client
npm install -D prisma
```

### ディレクトリ構造

プロジェクトの構造を以下のように整理します。

```
src/
├── app/
│   ├── api/
│   │   └── trpc/
│   │       └── [trpc]/
│   │           └── route.ts    # tRPCエンドポイント
│   ├── _trpc/
│   │   ├── client.tsx          # クライアント設定
│   │   └── Provider.tsx        # Providerコンポーネント
│   └── page.tsx
├── server/
│   ├── api/
│   │   ├── routers/
│   │   │   ├── user.ts         # Userルーター
│   │   │   └── post.ts         # Postルーター
│   │   ├── root.ts             # ルートルーター
│   │   └── trpc.ts             # tRPC初期化
│   └── db.ts                   # データベース接続
└── types/
    └── index.ts
```

## tRPCサーバーの構築

### コンテキストの作成

リクエストごとのコンテキストを定義します。

```typescript
// src/server/api/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server';
import { type NextRequest } from 'next/server';
import { db } from '../db';
import superjson from 'superjson';

export const createTRPCContext = async (opts: {
  headers: Headers
}) => {
  return {
    db,
    userId: opts.headers.get('x-user-id'), // 認証情報など
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson, // Date等のシリアライズに対応
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
```

### ミドルウェアで認証を実装

認証が必要なプロシージャ用のミドルウェアを作成します。

```typescript
// src/server/api/trpc.ts（続き）
const isAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  const user = await ctx.db.user.findUnique({
    where: { id: ctx.userId },
  });

  if (!user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  return next({
    ctx: {
      userId: ctx.userId,
      user,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);
```

### ルーターの作成

各機能ごとにルーターを分割します。

```typescript
// src/server/api/routers/user.ts
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';

export const userRouter = router({
  // ユーザー一覧取得（公開）
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const users = await ctx.db.user.findMany({
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: 'desc' },
      });

      let nextCursor: string | undefined = undefined;
      if (users.length > input.limit) {
        const nextItem = users.pop();
        nextCursor = nextItem?.id;
      }

      return {
        users,
        nextCursor,
      };
    }),

  // ユーザー取得
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.id },
        include: {
          posts: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      return user;
    }),

  // プロフィール更新（認証必要）
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        bio: z.string().max(500).optional(),
        avatar: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.user.update({
        where: { id: ctx.userId },
        data: input,
      });
    }),

  // ユーザー削除（認証必要）
  delete: protectedProcedure
    .mutation(async ({ ctx }) => {
      await ctx.db.user.delete({
        where: { id: ctx.userId },
      });

      return { success: true };
    }),
});
```

```typescript
// src/server/api/routers/post.ts
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';

export const postRouter = router({
  // 投稿一覧（無限スクロール対応）
  infinite: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const posts = await ctx.db.post.findMany({
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      });

      let nextCursor: string | undefined = undefined;
      if (posts.length > input.limit) {
        const nextItem = posts.pop();
        nextCursor = nextItem?.id;
      }

      return {
        posts,
        nextCursor,
      };
    }),

  // 投稿作成
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        content: z.string().min(1),
        published: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.post.create({
        data: {
          ...input,
          authorId: ctx.userId,
        },
      });
    }),

  // 投稿更新
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        content: z.string().min(1).optional(),
        published: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // 投稿の所有権確認
      const post = await ctx.db.post.findUnique({
        where: { id },
        select: { authorId: true },
      });

      if (!post || post.authorId !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only update your own posts',
        });
      }

      return await ctx.db.post.update({
        where: { id },
        data,
      });
    }),

  // 投稿削除
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.db.post.findUnique({
        where: { id: input.id },
        select: { authorId: true },
      });

      if (!post || post.authorId !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only delete your own posts',
        });
      }

      await ctx.db.post.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
```

### ルートルーターの作成

すべてのルーターを統合します。

```typescript
// src/server/api/root.ts
import { router } from './trpc';
import { userRouter } from './routers/user';
import { postRouter } from './routers/post';

export const appRouter = router({
  user: userRouter,
  post: postRouter,
});

export type AppRouter = typeof appRouter;
```

## Next.js App Routerとの統合

### APIルートの設定

```typescript
// src/app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/api/root';
import { createTRPCContext } from '@/server/api/trpc';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: req.headers }),
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? '<no-path>'}:`,
              error.message
            );
          }
        : undefined,
  });

export { handler as GET, handler as POST };
```

### クライアント設定

```typescript
// src/app/_trpc/client.tsx
'use client';

import { httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/api/root';
import superjson from 'superjson';

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  transformer: superjson,
  links: [
    httpBatchLink({
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/trpc`,
      headers() {
        return {
          'x-user-id': localStorage.getItem('userId') ?? '',
        };
      },
    }),
  ],
});
```

### Providerコンポーネント

```typescript
// src/app/_trpc/Provider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { trpc, trpcClient } from './client';

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

### Layout.tsxでProviderを使用

```typescript
// src/app/layout.tsx
import { TRPCProvider } from './_trpc/Provider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
```

## クライアント側での使用

### クエリの実行

```typescript
// src/app/users/[id]/page.tsx
'use client';

import { trpc } from '@/app/_trpc/client';

export default function UserPage({ params }: { params: { id: string } }) {
  const { data: user, isLoading, error } = trpc.user.getById.useQuery({
    id: params.id,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.bio}</p>
      <div>
        <h2>Posts</h2>
        {user.posts.map((post) => (
          <article key={post.id}>
            <h3>{post.title}</h3>
            <p>{post.content}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
```

### ミューテーションの実行

```typescript
// src/app/posts/new/page.tsx
'use client';

import { useState } from 'react';
import { trpc } from '@/app/_trpc/client';
import { useRouter } from 'next/navigation';

export default function NewPostPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const utils = trpc.useContext();

  const createPost = trpc.post.create.useMutation({
    onSuccess: () => {
      // キャッシュを無効化
      utils.post.infinite.invalidate();
      router.push('/posts');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPost.mutate({
      title,
      content,
      published: true,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="content">Content</label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
      </div>
      <button type="submit" disabled={createPost.isLoading}>
        {createPost.isLoading ? 'Creating...' : 'Create Post'}
      </button>
      {createPost.error && (
        <div>Error: {createPost.error.message}</div>
      )}
    </form>
  );
}
```

### 無限スクロールの実装

```typescript
// src/app/posts/page.tsx
'use client';

import { trpc } from '@/app/_trpc/client';
import { useEffect, useRef } from 'react';

export default function PostsPage() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = trpc.post.infinite.useInfiniteQuery(
    { limit: 10 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const observerTarget = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage]);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Posts</h1>
      {data?.pages.map((page, i) => (
        <div key={i}>
          {page.posts.map((post) => (
            <article key={post.id}>
              <h2>{post.title}</h2>
              <p>{post.content}</p>
              <div>by {post.author.name}</div>
            </article>
          ))}
        </div>
      ))}
      <div ref={observerTarget}>
        {isFetchingNextPage ? 'Loading more...' : null}
      </div>
    </div>
  );
}
```

## Server Componentsからの使用

App RouterのServer Componentsから直接tRPCを呼び出すこともできます。

```typescript
// src/app/posts/[id]/page.tsx
import { appRouter } from '@/server/api/root';
import { createTRPCContext } from '@/server/api/trpc';

export default async function PostPage({
  params
}: {
  params: { id: string }
}) {
  const ctx = await createTRPCContext({
    headers: new Headers()
  });

  const caller = appRouter.createCaller(ctx);
  const user = await caller.user.getById({ id: params.id });

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.bio}</p>
    </div>
  );
}
```

## エラーハンドリング

### カスタムエラー処理

```typescript
// src/lib/error-handler.ts
import { TRPCClientError } from '@trpc/client';
import type { AppRouter } from '@/server/api/root';

export function handleTRPCError(error: unknown) {
  if (error instanceof TRPCClientError) {
    const trpcError = error as TRPCClientError<AppRouter>;

    switch (trpcError.data?.code) {
      case 'UNAUTHORIZED':
        return 'ログインが必要です';
      case 'FORBIDDEN':
        return '権限がありません';
      case 'NOT_FOUND':
        return 'リソースが見つかりません';
      case 'BAD_REQUEST':
        if (trpcError.data.zodError) {
          const fieldErrors = trpcError.data.zodError.fieldErrors;
          return Object.values(fieldErrors).flat().join(', ');
        }
        return '入力内容に誤りがあります';
      default:
        return 'エラーが発生しました';
    }
  }

  return 'Unknown error';
}
```

## パフォーマンス最適化

### プリフェッチの活用

```typescript
// src/app/posts/page.tsx
import { appRouter } from '@/server/api/root';
import { createTRPCContext } from '@/server/api/trpc';
import { PostList } from './PostList';

export default async function PostsPage() {
  const ctx = await createTRPCContext({ headers: new Headers() });
  const caller = appRouter.createCaller(ctx);

  // サーバー側でプリフェッチ
  const initialData = await caller.post.infinite({
    limit: 10,
  });

  return <PostList initialData={initialData} />;
}
```

### バッチリクエスト

tRPCは自動的に複数のリクエストをバッチ化します。

```typescript
// 複数のクエリが同時に実行される場合、自動的にバッチ化される
const user = trpc.user.getById.useQuery({ id: '1' });
const posts = trpc.post.infinite.useQuery({ limit: 10 });
// → 1つのHTTPリクエストにまとめられる
```

## まとめ

tRPCを使用することで、TypeScriptの型安全性をフルに活用したフルスタック開発が可能になります。GraphQLのようなスキーマ定義や、RESTのようなエンドポイント管理が不要で、開発効率が大幅に向上します。

主な利点：

- エンドツーエンドの完全な型安全性
- コード生成が不要
- React QueryとのシームレスなR統合
- 軽量で高速
- Next.js App Routerとの優れた互換性

tRPCは、TypeScriptでモダンなWebアプリケーションを構築する際の最適な選択肢の一つです。

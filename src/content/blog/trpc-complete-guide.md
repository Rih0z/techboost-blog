---
title: 'tRPC完全ガイド — フルスタック型安全API開発（Next.js + TypeScript）'
description: 'tRPCでエンドツーエンドの型安全APIを構築する完全ガイド。Router定義・Procedure・Middleware・Zod validation・Next.js統合・React Query・無限スクロールまで実装例付きで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-3.jpg'
tags: ['tRPC', 'TypeScript', 'Next.js', 'API', 'React Query']
---

# tRPC完全ガイド — フルスタック型安全API開発（Next.js + TypeScript）

フロントエンドとバックエンドの型定義を二重管理していませんか？ REST APIのエンドポイントを変更するたびにクライアント側も手動で型を更新する作業は、チームの生産性を著しく低下させます。**tRPC**はこの問題を根本から解決するツールです。

本記事では、tRPCの基本概念からNext.js App Routerとの統合、React Queryを活用した無限スクロール実装、WebSocketによるリアルタイム更新、本番デプロイまでを網羅的に解説します。

---

## 1. tRPCとは — REST/GraphQLとの比較・型安全の仕組み

### tRPCの概念

tRPC（TypeScript Remote Procedure Call）は、TypeScriptのみを使用してエンドツーエンドの型安全なAPIを構築するためのライブラリです。2021年にAlex Johansson氏が公開し、現在はGitHubで30,000以上のスターを獲得しています。

従来のAPIスタックにおける型安全問題を理解するために、各アプローチを比較しましょう。

### REST APIとの比較

```typescript
// REST APIの課題：型定義の二重管理
// backend/routes/users.ts
app.get('/api/users/:id', async (req, res) => {
  const user = await db.user.findUnique({
    where: { id: req.params.id }
  });
  res.json(user);
});

// frontend/api/users.ts — バックエンドと別々に型定義が必要
interface User {
  id: string;
  name: string;
  email: string;
}

async function getUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  return res.json() as User; // 型キャストに依存（安全でない）
}
```

REST APIでは、サーバー側のレスポンス構造が変わっても、クライアント側の型定義は自動的に更新されません。型のズレが実行時エラーにつながるリスクがあります。

### GraphQLとの比較

GraphQLはスキーマファーストのアプローチで型安全を実現しますが、SDL（Schema Definition Language）の習得、コード生成ステップの設定、N+1問題への対処など、初期セットアップコストが高い点が課題です。

```graphql
# GraphQL: SDL定義が必要
type User {
  id: ID!
  name: String!
  email: String!
}

type Query {
  user(id: ID!): User
}
```

### tRPCの解決策

tRPCはTypeScriptの型推論を最大限に活用することで、**スキーマ定義ファイルなし**・**コード生成なし**でエンドツーエンドの型安全を実現します。

```
TypeScriptの型推論の仕組み:
サーバー側Router定義 → 型情報がクライアントに直接伝播
→ 実行時ではなくコンパイル時に型エラー検出
```

tRPCが型安全を実現する核心は「**型のみのインポート**」です。実際のコードはサーバーからクライアントに送られませんが、型情報（`AppRouter`型）だけをクライアントが参照します。これによりバンドルサイズへの影響ゼロで完全な型補完が得られます。

---

## 2. セットアップ（Next.js App Router統合）

### パッケージインストール

```bash
# Next.jsプロジェクトの作成
npx create-next-app@latest my-trpc-app --typescript --tailwind --app

cd my-trpc-app

# tRPC本体と関連パッケージ
npm install @trpc/server @trpc/client @trpc/react-query @trpc/next

# React Query（tRPCのデータフェッチング基盤）
npm install @tanstack/react-query

# バリデーション
npm install zod

# セッション管理（認証に使用）
npm install next-auth
```

### プロジェクト構造

```
src/
├── app/
│   ├── api/
│   │   └── trpc/
│   │       └── [trpc]/
│   │           └── route.ts    ← tRPC HTTPハンドラー
│   ├── layout.tsx
│   └── page.tsx
├── server/
│   ├── trpc.ts                 ← tRPCインスタンス初期化
│   ├── context.ts              ← コンテキスト定義
│   └── routers/
│       ├── _app.ts             ← メインルーター
│       ├── user.ts             ← ユーザーロジック
│       └── post.ts             ← 投稿ロジック
├── lib/
│   └── trpc/
│       ├── client.ts           ← クライアント設定
│       └── provider.tsx        ← Reactプロバイダー
```

### tRPCインスタンスの初期化

```typescript
// src/server/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server';
import { ZodError } from 'zod';
import superjson from 'superjson';
import type { Context } from './context';

const t = initTRPC.context<Context>().create({
  // superjsonで日付やMapなどのJSオブジェクトをシリアライズ
  transformer: superjson,
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

// Routerファクトリー
export const router = t.router;

// Procedureファクトリー（公開エンドポイント）
export const publicProcedure = t.procedure;

// Middlewareファクトリー
export const middleware = t.middleware;
```

### HTTPルートハンドラーの設定

```typescript
// src/app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/routers/_app';
import { createTRPCContext } from '@/server/context';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ req }),
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(
              `tRPC failed on ${path ?? '<no-path>'}: ${error.message}`
            );
          }
        : undefined,
  });

export { handler as GET, handler as POST };
```

---

## 3. Router定義（publicProcedure・protectedProcedure）

### メインルーターの定義

```typescript
// src/server/routers/_app.ts
import { router } from '../trpc';
import { userRouter } from './user';
import { postRouter } from './post';

export const appRouter = router({
  user: userRouter,
  post: postRouter,
});

// 型エクスポート（クライアントで使用）
export type AppRouter = typeof appRouter;
```

### 認証Middlewareとprotectedプロシージャ

```typescript
// src/server/trpc.ts（追記）
import { middleware, publicProcedure } from './trpc';
import { TRPCError } from '@trpc/server';

// 認証チェックミドルウェア
const isAuthenticated = middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: '認証が必要です。ログインしてください。',
    });
  }
  return next({
    ctx: {
      // セッションがnullでないことをTypeScriptに伝える
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

// 管理者チェックミドルウェア
const isAdmin = middleware(({ ctx, next }) => {
  if (!ctx.session?.user?.role || ctx.session.user.role !== 'ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '管理者権限が必要です。',
    });
  }
  return next({ ctx });
});

// 認証済みユーザー向けプロシージャ
export const protectedProcedure = publicProcedure.use(isAuthenticated);

// 管理者専用プロシージャ
export const adminProcedure = protectedProcedure.use(isAdmin);
```

### Userルーターの実装

```typescript
// src/server/routers/user.ts
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const userRouter = router({
  // ユーザー一覧（公開）
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
        nextCursor = nextItem!.id;
      }

      return { users, nextCursor };
    }),

  // ユーザー詳細（公開）
  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.id },
        include: { posts: true },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `ユーザーID "${input.id}" が見つかりません。`,
        });
      }

      return user;
    }),

  // プロフィール更新（認証必須）
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(50).optional(),
        bio: z.string().max(200).optional(),
        avatarUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updatedUser = await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: input,
      });

      return updatedUser;
    }),

  // アカウント削除（認証必須）
  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.user.delete({
      where: { id: ctx.session.user.id },
    });

    return { success: true };
  }),
});
```

---

## 4. Input Validation（Zod Schema）

tRPCはZodとのシームレスな統合が特徴です。入力バリデーションを定義するだけで、TypeScriptの型推論と実行時バリデーションの両方が自動的に機能します。

```typescript
// src/server/routers/post.ts
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';

// 再利用可能なZodスキーマ定義
const createPostSchema = z.object({
  title: z
    .string()
    .min(1, 'タイトルは必須です')
    .max(200, 'タイトルは200文字以内にしてください'),
  content: z
    .string()
    .min(10, '本文は10文字以上必要です')
    .max(50000),
  tags: z
    .array(z.string().max(30))
    .max(10, 'タグは10個まで')
    .optional()
    .default([]),
  publishedAt: z.date().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
});

// 部分更新用スキーマ（全フィールドをオプションに）
const updatePostSchema = createPostSchema.partial().extend({
  id: z.string().cuid(),
});

// ページネーション共通スキーマ
const paginationSchema = z.object({
  limit: z.number().int().positive().max(100).default(20),
  cursor: z.string().optional(),
  orderBy: z.enum(['createdAt', 'updatedAt', 'views']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const postRouter = router({
  create: protectedProcedure
    .input(createPostSchema)
    .mutation(async ({ ctx, input }) => {
      // inputは完全に型安全
      // input.title: string
      // input.tags: string[]
      // input.status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
      const post = await ctx.db.post.create({
        data: {
          ...input,
          authorId: ctx.session.user.id,
        },
      });

      return post;
    }),

  update: protectedProcedure
    .input(updatePostSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // 投稿の所有者確認
      const post = await ctx.db.post.findUnique({
        where: { id },
        select: { authorId: true },
      });

      if (!post || post.authorId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'この投稿を編集する権限がありません。',
        });
      }

      return ctx.db.post.update({ where: { id }, data });
    }),

  list: publicProcedure
    .input(paginationSchema)
    .query(async ({ ctx, input }) => {
      const { limit, cursor, orderBy, order } = input;

      const posts = await ctx.db.post.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: { status: 'PUBLISHED' },
        orderBy: { [orderBy]: order },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
          _count: { select: { comments: true, likes: true } },
        },
      });

      let nextCursor: string | undefined = undefined;
      if (posts.length > limit) {
        const nextItem = posts.pop();
        nextCursor = nextItem!.id;
      }

      return { posts, nextCursor };
    }),
});
```

### 高度なZod活用パターン

```typescript
// カスタムバリデーション
const passwordSchema = z
  .string()
  .min(8, 'パスワードは8文字以上必要です')
  .regex(/[A-Z]/, '大文字を1文字以上含めてください')
  .regex(/[0-9]/, '数字を1文字以上含めてください')
  .regex(/[^A-Za-z0-9]/, '記号を1文字以上含めてください');

const registerSchema = z
  .object({
    email: z.string().email('有効なメールアドレスを入力してください'),
    password: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  });

// ユニオン型バリデーション
const notificationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('email'),
    to: z.string().email(),
    subject: z.string(),
    body: z.string(),
  }),
  z.object({
    type: z.literal('push'),
    deviceToken: z.string(),
    title: z.string(),
    message: z.string(),
  }),
  z.object({
    type: z.literal('sms'),
    phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/),
    message: z.string().max(160),
  }),
]);
```

---

## 5. Middleware（認証・ログ・レート制限）

### ロギングMiddleware

```typescript
// src/server/middleware/logging.ts
import { middleware } from '../trpc';

export const loggingMiddleware = middleware(async ({ path, type, next }) => {
  const start = Date.now();

  const result = await next();

  const durationMs = Date.now() - start;
  const meta = { path, type, durationMs };

  if (result.ok) {
    console.log('tRPC OK:', meta);
  } else {
    console.error('tRPC Error:', { ...meta, error: result.error });
  }

  return result;
});

// トレースIDを付与するMiddleware
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

export const traceStorage = new AsyncLocalStorage<{ traceId: string }>();

export const traceMiddleware = middleware(({ next }) => {
  return traceStorage.run({ traceId: randomUUID() }, () => next());
});
```

### レート制限Middleware

```typescript
// src/server/middleware/rateLimit.ts
import { middleware } from '../trpc';
import { TRPCError } from '@trpc/server';

// メモリベースのシンプルなレート制限（本番ではRedis推奨）
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function createRateLimitMiddleware(
  limit: number,
  windowMs: number
) {
  return middleware(({ ctx, next }) => {
    const key = ctx.session?.user?.id ?? ctx.ip ?? 'anonymous';
    const now = Date.now();

    const current = requestCounts.get(key);

    if (!current || current.resetAt < now) {
      requestCounts.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (current.count >= limit) {
      const retryAfterSec = Math.ceil((current.resetAt - now) / 1000);
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `リクエスト制限に達しました。${retryAfterSec}秒後に再試行してください。`,
      });
    }

    current.count++;
    return next();
  });
}

// 使用例
const rateLimitedProcedure = publicProcedure.use(
  createRateLimitMiddleware(100, 60 * 1000) // 1分間に100リクエスト
);
```

### 入力サニタイズMiddleware

```typescript
// src/server/middleware/sanitize.ts
import { middleware } from '../trpc';
import DOMPurify from 'isomorphic-dompurify';

// HTML文字列をサニタイズするユーティリティ
function sanitizeObject(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return DOMPurify.sanitize(obj, { ALLOWED_TAGS: [] });
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, sanitizeObject(v)])
    );
  }
  return obj;
}

export const sanitizeMiddleware = middleware(({ rawInput, next }) => {
  // 入力データをサニタイズしてから次のミドルウェアへ
  return next({ rawInput: sanitizeObject(rawInput) });
});
```

---

## 6. Context（セッション・DB接続注入）

コンテキストはtRPCの中核です。リクエストごとに生成され、セッション情報・DBクライアント・その他依存関係をProcedureに注入します。

```typescript
// src/server/context.ts
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import type { NextRequest } from 'next/server';

export type CreateContextOptions = {
  req: NextRequest;
  session?: Awaited<ReturnType<typeof getServerSession>>;
};

export async function createTRPCContext({ req }: { req: NextRequest }) {
  // セッション情報の取得
  const session = await getServerSession(authOptions);

  // IPアドレスの取得（レート制限用）
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0] ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1';

  return {
    db: prisma,
    session,
    ip,
    req,
  };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
```

### Server Actions統合コンテキスト

```typescript
// src/server/context.ts（Server Actions用）
import { cache } from 'react';

// Reactのcacheでリクエスト内でのコンテキスト共有
export const createCachedContext = cache(async () => {
  const session = await getServerSession(authOptions);

  return {
    db: prisma,
    session,
  };
});

// Server ComponentsからtRPCを直接呼び出す
// src/lib/trpc/server.ts
import { createCallerFactory } from '@trpc/server';
import { appRouter } from '@/server/routers/_app';
import { createCachedContext } from '@/server/context';

const createCaller = createCallerFactory(appRouter);

export const api = createCaller(createCachedContext);
```

---

## 7. React Query統合（useQuery・useMutation・useInfiniteQuery）

### クライアントセットアップ

```typescript
// src/lib/trpc/client.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/routers/_app';

export const trpc = createTRPCReact<AppRouter>();
```

```typescript
// src/lib/trpc/provider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { httpBatchLink, loggerLink } from '@trpc/client';
import superjson from 'superjson';
import { useState } from 'react';
import { trpc } from './client';

function getBaseUrl() {
  if (typeof window !== 'undefined') return '';
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 1000, // 5秒間はキャッシュを新鮮とみなす
            retry: (failureCount, error: any) => {
              // 認証エラーはリトライしない
              if (error?.data?.code === 'UNAUTHORIZED') return false;
              return failureCount < 3;
            },
          },
        },
      })
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      transformer: superjson,
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === 'development' ||
            (opts.direction === 'down' && opts.result instanceof Error),
        }),
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          headers() {
            return {
              'x-trpc-source': 'react',
            };
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

### useQueryの使用例

```typescript
// src/components/UserProfile.tsx
'use client';

import { trpc } from '@/lib/trpc/client';

export function UserProfile({ userId }: { userId: string }) {
  const {
    data: user,
    isLoading,
    isError,
    error,
    refetch,
  } = trpc.user.byId.useQuery(
    { id: userId },
    {
      // オプション設定
      staleTime: 10 * 1000,        // 10秒間キャッシュを保持
      refetchOnWindowFocus: false,  // フォーカス時に自動refetchしない
      enabled: !!userId,            // userIdがある場合のみフェッチ
      select: (data) => ({          // データ変換
        ...data,
        displayName: data.name ?? 'Anonymous',
      }),
    }
  );

  if (isLoading) return <div>読み込み中...</div>;
  if (isError) return <div>エラー: {error.message}</div>;
  if (!user) return <div>ユーザーが見つかりません</div>;

  return (
    <div className="user-profile">
      <h1>{user.displayName}</h1>
      <p>{user.bio}</p>
      <button onClick={() => refetch()}>更新</button>
    </div>
  );
}
```

### useMutationの使用例

```typescript
// src/components/CreatePostForm.tsx
'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { useRouter } from 'next/navigation';

export function CreatePostForm() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    status: 'DRAFT' as const,
  });

  const createPost = trpc.post.create.useMutation({
    onSuccess: (newPost) => {
      // キャッシュの楽観的更新
      utils.post.list.invalidate();

      // 成功後にリダイレクト
      router.push(`/posts/${newPost.id}`);
    },
    onError: (error) => {
      // Zodバリデーションエラーの表示
      if (error.data?.zodError) {
        const fieldErrors = error.data.zodError.fieldErrors;
        console.error('バリデーションエラー:', fieldErrors);
      } else {
        alert(`エラー: ${error.message}`);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPost.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        placeholder="タイトル"
        disabled={createPost.isPending}
      />
      <textarea
        value={formData.content}
        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
        placeholder="本文"
        disabled={createPost.isPending}
      />
      <button type="submit" disabled={createPost.isPending}>
        {createPost.isPending ? '送信中...' : '投稿する'}
      </button>
    </form>
  );
}
```

---

## 8. 無限スクロール実装

無限スクロールはtRPCとReact Queryの`useInfiniteQuery`を組み合わせることで簡潔に実装できます。

### サーバー側（カーソルベースページネーション）

```typescript
// src/server/routers/post.ts（追記）
infiniteList: publicProcedure
  .input(
    z.object({
      limit: z.number().min(1).max(50).default(10),
      cursor: z.string().optional(), // 最後に取得したアイテムのID
      tag: z.string().optional(),
      search: z.string().optional(),
    })
  )
  .query(async ({ ctx, input }) => {
    const { limit, cursor, tag, search } = input;

    const where = {
      status: 'PUBLISHED' as const,
      ...(tag && {
        tags: { has: tag },
      }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { content: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const posts = await ctx.db.post.findMany({
      take: limit + 1, // 1つ多く取得して次のカーソルを判定
      cursor: cursor ? { id: cursor } : undefined,
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true },
        },
        _count: {
          select: { comments: true, likes: true },
        },
      },
    });

    let nextCursor: typeof cursor = undefined;
    if (posts.length > limit) {
      const nextItem = posts.pop(); // 余分な1件を取り除く
      nextCursor = nextItem!.id;
    }

    return {
      posts,
      nextCursor,
    };
  }),
```

### クライアント側（useInfiniteQuery）

```typescript
// src/components/InfinitePostList.tsx
'use client';

import { useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc/client';
import { PostCard } from './PostCard';

interface InfinitePostListProps {
  tag?: string;
  search?: string;
}

export function InfinitePostList({ tag, search }: InfinitePostListProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = trpc.post.infiniteList.useInfiniteQuery(
    {
      limit: 10,
      tag,
      search,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      // 検索条件が変わったらキャッシュをリセット
      initialCursor: undefined,
    }
  );

  // Intersection Observer で自動ロード
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const current = loadMoreRef.current;
    if (current) observer.observe(current);

    return () => {
      if (current) observer.unobserve(current);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) return <PostListSkeleton />;
  if (isError) return <ErrorMessage error={error} />;

  // ページを平坦化して全投稿を一覧表示
  const allPosts = data.pages.flatMap((page) => page.posts);

  return (
    <div>
      <div className="post-grid">
        {allPosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {/* 監視対象の要素（画面に入ったら次のページをロード） */}
      <div ref={loadMoreRef} className="load-more-trigger">
        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <LoadingSpinner />
          </div>
        )}
        {!hasNextPage && allPosts.length > 0 && (
          <p className="text-center text-gray-500 py-4">
            すべての投稿を表示しました
          </p>
        )}
      </div>
    </div>
  );
}

// スケルトンローダー
function PostListSkeleton() {
  return (
    <div className="post-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-48" />
      ))}
    </div>
  );
}
```

---

## 9. Subscriptions（WebSocket・リアルタイム更新）

tRPCはWebSocketによるリアルタイム通信をサポートします。チャット、通知、ライブダッシュボードに最適です。

### WebSocketサーバーのセットアップ

```typescript
// src/server/ws.ts
import { createWSServer } from '@trpc/server/adapters/ws';
import { WebSocketServer } from 'ws';
import { appRouter } from './routers/_app';
import { createTRPCContext } from './context';

const wss = new WebSocketServer({ port: 3001 });

const handler = createWSServer({
  wss,
  router: appRouter,
  createContext: async ({ req }) => {
    return createTRPCContext({ req: req as any });
  },
});

console.log('WebSocket server started on port 3001');
```

### Subscription定義

```typescript
// src/server/routers/chat.ts
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { observable } from '@trpc/server/observable';
import { EventEmitter } from 'events';

// グローバルイベントエミッター（本番ではRedis Pub/Sub推奨）
const chatEmitter = new EventEmitter();
chatEmitter.setMaxListeners(100);

interface ChatMessage {
  id: string;
  roomId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
}

export const chatRouter = router({
  // メッセージ送信
  sendMessage: protectedProcedure
    .input(
      z.object({
        roomId: z.string(),
        content: z.string().min(1).max(2000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const message = await ctx.db.message.create({
        data: {
          roomId: input.roomId,
          content: input.content,
          authorId: ctx.session.user.id,
        },
        include: {
          author: { select: { name: true } },
        },
      });

      const chatMessage: ChatMessage = {
        id: message.id,
        roomId: message.roomId,
        content: message.content,
        authorId: message.authorId,
        authorName: message.author.name ?? 'Unknown',
        createdAt: message.createdAt,
      };

      // サブスクライバーに通知
      chatEmitter.emit(`chat:${input.roomId}`, chatMessage);

      return message;
    }),

  // メッセージストリーム購読
  onMessage: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .subscription(({ input }) => {
      return observable<ChatMessage>((emit) => {
        const onMessage = (message: ChatMessage) => {
          emit.next(message);
        };

        const eventName = `chat:${input.roomId}`;
        chatEmitter.on(eventName, onMessage);

        // クリーンアップ
        return () => {
          chatEmitter.off(eventName, onMessage);
        };
      });
    }),

  // 未読件数のリアルタイム更新
  onUnreadCount: protectedProcedure.subscription(({ ctx }) => {
    return observable<number>((emit) => {
      const userId = ctx.session.user.id;

      const checkUnread = async () => {
        const count = await ctx.db.message.count({
          where: {
            room: { members: { some: { userId } } },
            readBy: { none: { userId } },
          },
        });
        emit.next(count);
      };

      chatEmitter.on(`unread:${userId}`, checkUnread);

      // 初回即時配信
      checkUnread();

      return () => {
        chatEmitter.off(`unread:${userId}`, checkUnread);
      };
    });
  }),
});
```

### クライアント側でのSubscription利用

```typescript
// src/components/ChatRoom.tsx
'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';

export function ChatRoom({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');

  // WebSocketを使用したサブスクリプション
  trpc.chat.onMessage.useSubscription(
    { roomId },
    {
      onData: (message) => {
        setMessages((prev) => [...prev, message]);
      },
      onError: (err) => {
        console.error('Subscription error:', err);
      },
    }
  );

  const sendMessage = trpc.chat.sendMessage.useMutation();

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage.mutate({ roomId, content: input });
    setInput('');
  };

  return (
    <div className="chat-room">
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className="message">
            <strong>{msg.authorName}</strong>: {msg.content}
          </div>
        ))}
      </div>
      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="メッセージを入力..."
        />
        <button onClick={handleSend} disabled={sendMessage.isPending}>
          送信
        </button>
      </div>
    </div>
  );
}
```

---

## 10. エラーハンドリング（TRPCError・カスタムエラーコード）

### TRPCErrorの種類

```typescript
import { TRPCError } from '@trpc/server';

// 利用可能なエラーコード一覧
const ERROR_CODES = {
  PARSE_ERROR: 400,          // リクエストのパース失敗
  BAD_REQUEST: 400,          // 不正なリクエスト
  UNAUTHORIZED: 401,         // 認証が必要
  PAYMENT_REQUIRED: 402,     // 支払いが必要
  FORBIDDEN: 403,            // アクセス権限なし
  NOT_FOUND: 404,            // リソースが存在しない
  METHOD_NOT_SUPPORTED: 405, // メソッドが非対応
  TIMEOUT: 408,              // タイムアウト
  CONFLICT: 409,             // 競合（重複など）
  PRECONDITION_FAILED: 412,  // 前提条件の失敗
  PAYLOAD_TOO_LARGE: 413,    // ペイロードが大きすぎる
  UNPROCESSABLE_CONTENT: 422, // バリデーション失敗
  TOO_MANY_REQUESTS: 429,    // レート制限超過
  CLIENT_CLOSED_REQUEST: 499, // クライアント切断
  INTERNAL_SERVER_ERROR: 500, // サーバー内部エラー
  NOT_IMPLEMENTED: 501,       // 未実装
  BAD_GATEWAY: 502,           // ゲートウェイエラー
  SERVICE_UNAVAILABLE: 503,   // サービス利用不可
};

// カスタムエラーの実装例
export function throwNotFound(resource: string, id: string): never {
  throw new TRPCError({
    code: 'NOT_FOUND',
    message: `${resource} (ID: ${id}) が見つかりません。`,
    cause: { resource, id }, // デバッグ用の追加情報
  });
}

export function throwConflict(message: string, field?: string): never {
  throw new TRPCError({
    code: 'CONFLICT',
    message,
    cause: field ? { conflictField: field } : undefined,
  });
}
```

### グローバルエラーハンドリング

```typescript
// src/server/trpc.ts（更新）
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // Zodエラーの整形
    const zodError =
      error.cause instanceof ZodError
        ? error.cause.flatten()
        : null;

    // Prismaエラーの処理
    const isPrismaError =
      error.cause instanceof Error &&
      error.cause.constructor.name === 'PrismaClientKnownRequestError';

    return {
      ...shape,
      data: {
        ...shape.data,
        zodError,
        // 本番環境では内部エラーの詳細を隠す
        internalError:
          process.env.NODE_ENV === 'development'
            ? error.cause?.message
            : undefined,
      },
    };
  },
});
```

### クライアント側エラーハンドリング

```typescript
// src/hooks/useTRPCError.ts
import { TRPCClientError } from '@trpc/client';
import type { AppRouter } from '@/server/routers/_app';

type TRPCError = TRPCClientError<AppRouter>;

export function parseTRPCError(error: unknown) {
  if (!(error instanceof TRPCClientError)) {
    return { message: '不明なエラーが発生しました', fieldErrors: null };
  }

  const trpcError = error as TRPCError;

  // Zodバリデーションエラー
  if (trpcError.data?.zodError) {
    const fieldErrors = trpcError.data.zodError.fieldErrors;
    return { message: '入力値に誤りがあります', fieldErrors };
  }

  // HTTPエラーコード別メッセージ
  const messages: Record<string, string> = {
    UNAUTHORIZED: 'ログインが必要です。',
    FORBIDDEN: 'この操作を行う権限がありません。',
    NOT_FOUND: 'お探しのコンテンツが見つかりません。',
    TOO_MANY_REQUESTS: 'アクセスが集中しています。しばらくお待ちください。',
    INTERNAL_SERVER_ERROR: 'サーバーエラーが発生しました。時間をおいて再試行してください。',
  };

  const code = trpcError.data?.code ?? 'INTERNAL_SERVER_ERROR';
  const message = messages[code] ?? trpcError.message;

  return { message, fieldErrors: null };
}

// Reactコンポーネントでの使用
export function useFormWithTRPC<T>(mutation: any) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const handleError = (error: unknown) => {
    const { message, fieldErrors } = parseTRPCError(error);
    setGlobalError(message);
    setFieldErrors(fieldErrors);
  };

  const handleSuccess = () => {
    setFieldErrors(null);
    setGlobalError(null);
  };

  return { fieldErrors, globalError, handleError, handleSuccess };
}
```

---

## 11. ファイルアップロード対応

tRPC自体はファイルアップロードを直接サポートしませんが、プリサインドURLと組み合わせることで安全なファイルアップロードを実装できます。

```typescript
// src/server/routers/upload.ts
import { z } from 'zod';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { router, protectedProcedure } from '../trpc';
import { randomUUID } from 'crypto';

const s3 = new S3Client({ region: process.env.AWS_REGION! });

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const uploadRouter = router({
  // プリサインドURL取得（クライアントが直接S3にアップロード）
  getPresignedUrl: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(255),
        contentType: z.enum(ALLOWED_MIME_TYPES as [string, ...string[]]),
        contentLength: z.number().positive().max(MAX_FILE_SIZE_BYTES),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const fileExtension = input.fileName.split('.').pop() ?? 'bin';
      const key = `uploads/${ctx.session.user.id}/${randomUUID()}.${fileExtension}`;

      const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: key,
        ContentType: input.contentType,
        ContentLength: input.contentLength,
        Metadata: {
          uploadedBy: ctx.session.user.id,
          originalFileName: input.fileName,
        },
      });

      const signedUrl = await getSignedUrl(s3, command, {
        expiresIn: 3600, // 1時間有効
      });

      return {
        signedUrl,
        key,
        publicUrl: `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${key}`,
      };
    }),

  // アップロード完了後のDB登録
  confirmUpload: protectedProcedure
    .input(
      z.object({
        key: z.string(),
        fileName: z.string(),
        contentType: z.string(),
        fileSize: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const attachment = await ctx.db.attachment.create({
        data: {
          key: input.key,
          fileName: input.fileName,
          contentType: input.contentType,
          fileSize: input.fileSize,
          uploadedById: ctx.session.user.id,
          url: `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${input.key}`,
        },
      });

      return attachment;
    }),
});
```

### クライアント側アップロードコンポーネント

```typescript
// src/components/FileUploader.tsx
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { trpc } from '@/lib/trpc/client';

export function FileUploader({
  onUploadComplete,
}: {
  onUploadComplete: (url: string) => void;
}) {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const getPresignedUrl = trpc.upload.getPresignedUrl.useMutation();
  const confirmUpload = trpc.upload.confirmUpload.useMutation();

  const uploadFile = async (file: File) => {
    setUploading(true);
    setProgress(0);

    try {
      // Step 1: プリサインドURLを取得
      const { signedUrl, key, publicUrl } =
        await getPresignedUrl.mutateAsync({
          fileName: file.name,
          contentType: file.type as any,
          contentLength: file.size,
        });

      // Step 2: S3に直接アップロード（プログレス付き）
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) resolve();
          else reject(new Error(`Upload failed: ${xhr.statusText}`));
        };

        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.open('PUT', signedUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      // Step 3: アップロード完了をDBに記録
      await confirmUpload.mutateAsync({
        key,
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
      });

      onUploadComplete(publicUrl);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`dropzone ${isDragActive ? 'active' : ''}`}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <div>
          <div className="progress-bar" style={{ width: `${progress}%` }} />
          <p>{progress}% アップロード中...</p>
        </div>
      ) : (
        <p>
          {isDragActive
            ? 'ドロップしてアップロード'
            : 'ファイルをドラッグ&ドロップまたはクリックして選択'}
        </p>
      )}
    </div>
  );
}
```

---

## 12. テスト（caller・mockモジュール）

### callerを使ったユニットテスト

callerはHTTPレイヤーを介さずにRouterを直接呼び出すため、高速なユニットテストが可能です。

```typescript
// src/server/routers/post.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCallerFactory } from '@trpc/server';
import { appRouter } from './_app';
import type { Context } from '../context';

// モックコンテキストのファクトリー
function createMockContext(overrides?: Partial<Context>): Context {
  return {
    db: {
      post: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
    } as any,
    session: null,
    ip: '127.0.0.1',
    req: {} as any,
    ...overrides,
  };
}

const createCaller = createCallerFactory(appRouter);

describe('postRouter', () => {
  describe('list', () => {
    it('公開済み投稿の一覧を取得できる', async () => {
      const mockPosts = [
        {
          id: 'post-1',
          title: 'テスト投稿',
          content: '本文内容',
          status: 'PUBLISHED',
          authorId: 'user-1',
          author: { id: 'user-1', name: 'テストユーザー', avatarUrl: null },
          _count: { comments: 2, likes: 5 },
          createdAt: new Date('2026-01-01'),
        },
      ];

      const ctx = createMockContext();
      (ctx.db.post.findMany as any).mockResolvedValue(mockPosts);

      const caller = createCaller(ctx);
      const result = await caller.post.list({
        limit: 10,
        orderBy: 'createdAt',
        order: 'desc',
      });

      expect(result.posts).toHaveLength(1);
      expect(result.posts[0].title).toBe('テスト投稿');
      expect(result.nextCursor).toBeUndefined();
    });

    it('limit+1件取得してnextCursorを返す', async () => {
      // 11件のモックデータ（limit=10の場合）
      const mockPosts = Array.from({ length: 11 }, (_, i) => ({
        id: `post-${i + 1}`,
        title: `投稿${i + 1}`,
        status: 'PUBLISHED',
        authorId: 'user-1',
        author: { id: 'user-1', name: 'User', avatarUrl: null },
        _count: { comments: 0, likes: 0 },
        createdAt: new Date(),
      }));

      const ctx = createMockContext();
      (ctx.db.post.findMany as any).mockResolvedValue(mockPosts);

      const caller = createCaller(ctx);
      const result = await caller.post.list({ limit: 10, orderBy: 'createdAt', order: 'desc' });

      expect(result.posts).toHaveLength(10);
      expect(result.nextCursor).toBe('post-11');
    });
  });

  describe('create', () => {
    it('認証なしで投稿を作成しようとするとUNAUTHORIZEDエラー', async () => {
      const ctx = createMockContext({ session: null });
      const caller = createCaller(ctx);

      await expect(
        caller.post.create({
          title: 'テスト',
          content: 'テスト本文です',
          status: 'DRAFT',
        })
      ).rejects.toThrowError('認証が必要です');
    });

    it('認証済みユーザーが投稿を作成できる', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'test@example.com' },
        expires: '2027-01-01',
      };

      const newPost = {
        id: 'new-post-1',
        title: '新しい投稿',
        content: 'これは本文です。10文字以上あります。',
        status: 'DRAFT',
        authorId: 'user-1',
        tags: [],
        createdAt: new Date(),
      };

      const ctx = createMockContext({ session: mockSession as any });
      (ctx.db.post.create as any).mockResolvedValue(newPost);

      const caller = createCaller(ctx);
      const result = await caller.post.create({
        title: '新しい投稿',
        content: 'これは本文です。10文字以上あります。',
        status: 'DRAFT',
      });

      expect(result.id).toBe('new-post-1');
      expect(ctx.db.post.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: '新しい投稿',
          authorId: 'user-1',
        }),
      });
    });

    it('タイトルが空の場合はZodエラー', async () => {
      const ctx = createMockContext({
        session: {
          user: { id: 'user-1', email: 'test@example.com' },
          expires: '2027-01-01',
        } as any,
      });

      const caller = createCaller(ctx);

      await expect(
        caller.post.create({
          title: '', // 空文字列
          content: '有効な本文テキストです',
          status: 'DRAFT',
        })
      ).rejects.toThrow();
    });
  });
});
```

### E2Eテスト（Playwrightとの統合）

```typescript
// e2e/api/trpc.spec.ts
import { test, expect } from '@playwright/test';

test.describe('tRPC API統合テスト', () => {
  test('投稿一覧APIが正常に返す', async ({ request }) => {
    const response = await request.get(
      '/api/trpc/post.list?input=' +
        encodeURIComponent(
          JSON.stringify({ limit: 5, orderBy: 'createdAt', order: 'desc' })
        )
    );

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.result.data.posts).toBeDefined();
    expect(Array.isArray(data.result.data.posts)).toBeTruthy();
  });

  test('認証なしでprotectedエンドポイントは401を返す', async ({ request }) => {
    const response = await request.post('/api/trpc/post.create', {
      data: {
        title: 'テスト',
        content: 'テスト本文です。最低10文字。',
        status: 'DRAFT',
      },
    });

    const data = await response.json();
    expect(data[0].error.data.code).toBe('UNAUTHORIZED');
  });
});
```

---

## 13. 本番デプロイ（Vercel Edge Functions）

### Vercelへのデプロイ設定

```typescript
// src/app/api/trpc/[trpc]/route.ts（Edge Runtime対応）
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/routers/_app';
import { createTRPCContext } from '@/server/context';

// Edge Runtimeを指定（Vercel Edge Functions）
export const runtime = 'edge';

// リクエストの最大サイズ設定
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ req: req as any }),
    responseMeta({ ctx, paths, type, errors }) {
      // キャッシュ制御ヘッダーの設定
      const allOk = errors.length === 0;
      const isQuery = type === 'query';

      if (allOk && isQuery) {
        // 公開クエリは5分間CDNキャッシュ
        const isPublicQuery =
          !paths?.some((path) =>
            ['user.me', 'post.myPosts'].includes(path)
          );

        if (isPublicQuery) {
          return {
            headers: {
              'cache-control': 'public, max-age=300, s-maxage=300',
            },
          };
        }
      }

      return {};
    },
  });

export { handler as GET, handler as POST };
```

### vercel.json設定

```json
{
  "functions": {
    "src/app/api/trpc/**": {
      "maxDuration": 30,
      "memory": 1024
    }
  },
  "headers": [
    {
      "source": "/api/trpc/:path*",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "https://yourdomain.com"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        }
      ]
    }
  ]
}
```

### 環境変数管理

```bash
# .env.local
DATABASE_URL="postgresql://user:password@host:5432/db?sslmode=require"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# S3設定
AWS_REGION="ap-northeast-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
S3_BUCKET_NAME="your-bucket-name"

# 本番環境
VERCEL_URL="your-app.vercel.app"
```

### パフォーマンス最適化

```typescript
// src/lib/trpc/client.ts（最適化版）
import { createTRPCReact } from '@trpc/react-query';
import {
  httpBatchLink,
  httpLink,
  splitLink,
  unstable_httpBatchStreamLink,
} from '@trpc/client';
import type { AppRouter } from '@/server/routers/_app';

export const trpc = createTRPCReact<AppRouter>();

// バッチリクエストとストリームを使い分け
export const trpcClient = trpc.createClient({
  links: [
    splitLink({
      // Mutationはバッチしない
      condition: (op) => op.type === 'subscription',
      true: httpLink({ url: '/api/trpc' }),
      false: unstable_httpBatchStreamLink({
        url: '/api/trpc',
        maxURLLength: 2083, // URL長制限でバッチを自動分割
        headers: {
          'x-trpc-source': 'client',
        },
      }),
    }),
  ],
});
```

---

## まとめ

tRPCは**TypeScriptファーストのフルスタック開発に革命をもたらす**ツールです。本記事で解説した内容を振り返りましょう。

| 機能 | tRPCの解決策 |
|------|-------------|
| 型安全 | TypeScript型推論でエンドツーエンド自動補完 |
| バリデーション | Zod統合で宣言的スキーマ定義 |
| 認証 | Middlewareチェーンで柔軟な権限管理 |
| リアルタイム | WebSocket Subscriptionでシームレスな双方向通信 |
| パフォーマンス | httpBatchLinkで自動リクエストバッチング |
| テスト | callerで軽量ユニットテスト |
| デプロイ | Edge Runtimeで世界規模の低レイテンシー |

tRPCは特に**モノレポ構成でフロントとバックを同チームで開発する場合**に最大の効果を発揮します。GraphQLの複雑さは必要なく、REST APIの型安全問題も解消した、モダンなTypeScriptスタックの決定版です。

---

## APIレスポンスを素早く確認するには

tRPCのエンドポイントを開発・デバッグする際、レスポンスのJSON構造を素早く確認・検証したいことがあります。そんなときは **[DevToolBox](https://usedevtools.com/)** が役立ちます。JSON Formatter、Base64エンコード/デコード、JWT Decoder、URL Encoderなど、API開発で頻繁に使うユーティリティをブラウザ上でまとめて利用できます。インストール不要で即使えるので、tRPC開発のお供にブックマークしておくと便利です。

---

## 参考リソース

- [tRPC公式ドキュメント](https://trpc.io/docs)
- [tRPC GitHub](https://github.com/trpc/trpc)
- [TanStack Query（React Query）](https://tanstack.com/query/latest)
- [Zod公式ドキュメント](https://zod.dev/)
- [Next.js App Router](https://nextjs.org/docs/app)

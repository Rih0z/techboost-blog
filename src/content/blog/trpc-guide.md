---
title: "tRPC 完全ガイド2026 — 型安全APIの設計・Next.js・Prisma統合"
description: "tRPCの完全ガイド。インストールからRouter設定、Client設定、React Query統合、Next.js・Prisma連携、エラーハンドリングまで実践的なコード例とともに解説します。"
pubDate: "2026-03-04"
tags: ["tRPC", "TypeScript", "Next.js", "API", "フルスタック"]
---

## はじめに

**tRPC**（TypeScript Remote Procedure Call）は、フロントエンドとバックエンドの間で **型安全なAPI通信** を実現するフレームワークです。OpenAPIやGraphQLのようなスキーマ定義が不要で、TypeScriptの型システムだけで完全な型安全性を担保できます。

## tRPC が解決する問題

従来のREST APIでの型安全の問題：

```typescript
// ❌ 従来のREST API: フロントエンドの型は手動で書く
// backend/routes/users.ts
app.get('/users/:id', async (req, res) => {
  const user = await db.user.findUnique({ where: { id: req.params.id } });
  res.json(user);
});

// frontend/api.ts（バックエンドとズレが起きやすい）
interface User {
  id: string;
  name: string;
  email: string;
  // バックエンドが変わっても型エラーにならない!
}

const user = await fetch('/api/users/123').then(r => r.json()) as User;
```

```typescript
// ✅ tRPC: フロントエンドとバックエンドで型が自動共有
// バックエンドの型変更が即座にフロントエンドのコンパイルエラーになる
const user = await trpc.user.getById.query({ id: '123' });
// user の型は自動的に推論される（Userオブジェクト）
```

## セットアップ

```bash
# Next.js プロジェクトに追加
npm install @trpc/server @trpc/client @trpc/react-query @tanstack/react-query zod
```

## サーバーサイドの実装

### Router の作成

```typescript
// server/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server';
import { ZodError } from 'zod';

// Context型（認証情報などを含む）
interface Context {
  userId?: string;
  role?: 'admin' | 'user';
}

const t = initTRPC.context<Context>().create({
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

// 認証ミドルウェア
const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { userId: ctx.userId } });
});

export const protectedProcedure = t.procedure.use(isAuthenticated);
```

### User Router

```typescript
// server/routers/user.ts
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

const createUserSchema = z.object({
  name: z.string().min(2, '名前は2文字以上'),
  email: z.string().email('有効なメールアドレスを入力'),
  password: z.string().min(8, 'パスワードは8文字以上'),
});

const updateUserSchema = z.object({
  id: z.string(),
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
});

export const userRouter = router({
  // GET /users（全件取得）
  getAll: publicProcedure.query(async ({ ctx }) => {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return users;
  }),

  // GET /users/:id（1件取得）
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { id: input.id },
        select: { id: true, name: true, email: true },
      });
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'ユーザーが見つかりません',
        });
      }
      return user;
    }),

  // POST /users（作成）
  create: publicProcedure
    .input(createUserSchema)
    .mutation(async ({ input }) => {
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email },
      });
      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'このメールアドレスは既に使用されています',
        });
      }

      const user = await prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          password: await hashPassword(input.password),
        },
      });
      return { id: user.id, name: user.name, email: user.email };
    }),

  // PATCH /users/:id（更新）
  update: protectedProcedure
    .input(updateUserSchema)
    .mutation(async ({ input, ctx }) => {
      const user = await prisma.user.update({
        where: { id: input.id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.email && { email: input.email }),
        },
      });
      return user;
    }),

  // DELETE /users/:id（削除）
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.user.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
```

### App Router の統合

```typescript
// server/routers/app.ts
import { router } from '../trpc';
import { userRouter } from './user';
import { postRouter } from './post';

export const appRouter = router({
  user: userRouter,
  post: postRouter,
});

// 型をエクスポート（クライアントで使用）
export type AppRouter = typeof appRouter;
```

## Next.js App Router との統合

```typescript
// app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/routers/app';
import { createContext } from '@/server/context';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext(req),
  });

export { handler as GET, handler as POST };
```

```typescript
// server/context.ts
import { getServerSession } from 'next-auth';

export async function createContext(req: Request) {
  const session = await getServerSession();
  return {
    userId: session?.user?.id,
    role: session?.user?.role as 'admin' | 'user' | undefined,
  };
}
```

## クライアントサイドの設定

```typescript
// utils/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/routers/app';

export const trpc = createTRPCReact<AppRouter>();
```

```typescript
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc } from '@/utils/trpc';
import { useState } from 'react';

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          headers() {
            return {
              authorization: `Bearer ${getToken()}`,
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
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

## React コンポーネントでの使用

```typescript
// components/UserList.tsx
'use client';

import { trpc } from '@/utils/trpc';

export function UserList() {
  // 型安全なデータフェッチ
  const { data: users, isLoading, error } = trpc.user.getAll.useQuery();

  // 型安全なmutation
  const createUser = trpc.user.create.useMutation({
    onSuccess: () => {
      // キャッシュの無効化
      utils.user.getAll.invalidate();
    },
    onError: (error) => {
      // zodバリデーションエラーも型安全
      if (error.data?.zodError) {
        console.log('バリデーションエラー:', error.data.zodError.fieldErrors);
      }
    },
  });

  const utils = trpc.useUtils();

  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error.message}</div>;

  return (
    <div>
      <ul>
        {users?.map((user) => (
          <li key={user.id}>
            {user.name} ({user.email})
          </li>
        ))}
      </ul>
      <button
        onClick={() =>
          createUser.mutate({
            name: '新規ユーザー',
            email: 'new@example.com',
            password: 'password123',
          })
        }
        disabled={createUser.isPending}
      >
        {createUser.isPending ? '作成中...' : 'ユーザー作成'}
      </button>
    </div>
  );
}
```

## まとめ

tRPCの主なメリットをまとめます。

- **エンドツーエンドの型安全**: バックエンドの型変更がフロントエンドに即反映
- **スキーマ不要**: OpenAPI/GraphQLのような別途スキーマ定義が不要
- **React Query統合**: キャッシュ・ローディング・エラー状態を自動管理
- **zodバリデーション**: 入力バリデーションと型推論を同時に実現
- **バンドルサイズゼロ**: 型情報はコンパイル時のみ使用されランタイムに含まれない

フルスタックTypeScriptプロジェクトでは、tRPCは最も効率的なAPI設計の選択肢です。

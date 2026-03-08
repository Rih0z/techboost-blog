---
title: "tRPC v11入門 — エンドツーエンド型安全APIの構築ガイド"
description: "tRPC v11でフルスタックTypeScriptアプリを構築する方法を解説。ルーター/プロシージャ定義、Zod連携、React Query統合、Next.js App Router対応まで網羅した実践ガイド。ベストプラクティスと注意点も紹介します。"
pubDate: "2026-02-05"
tags: ["tRPC", "TypeScript", "Next.js", "React Query", "API"]
heroImage: '../../assets/thumbnails/trpc-v11-guide.jpg'
---
tRPCは、TypeScriptによるエンドツーエンド型安全なAPIを実現するフレームワークです。REST APIやGraphQLと異なり、スキーマ定義や型生成が不要で、TypeScriptの型システムを直接活用できます。

この記事では、tRPC v11の基本から実践的な使い方まで、順を追って解説します。

## tRPCとは

tRPC（TypeScript Remote Procedure Call）は、クライアントとサーバー間で型情報を共有し、コンパイル時に型エラーを検出できるフレームワークです。

**主な特徴:**

- **型安全**: サーバー側の変更が即座にクライアント側に反映
- **コード生成不要**: TypeScriptの型推論を活用
- **軽量**: ランタイムオーバーヘッドが小さい
- **柔軟**: 既存のExpressやNext.jsに統合可能

## インストールとセットアップ

まず、必要なパッケージをインストールします。

```bash
npm install @trpc/server@next @trpc/client@next @trpc/react-query@next
npm install @tanstack/react-query@latest zod
```

### サーバー側の設定

tRPCルーターを定義します。

```typescript
// server/trpc.ts
import { initTRPC } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;

// ルーター定義
export const appRouter = router({
  hello: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(({ input }) => {
      return { greeting: `Hello, ${input.name}!` };
    }),

  createPost: publicProcedure
    .input(z.object({
      title: z.string().min(1),
      content: z.string(),
    }))
    .mutation(async ({ input }) => {
      // データベースへの保存処理
      const post = await db.post.create({ data: input });
      return post;
    }),
});

export type AppRouter = typeof appRouter;
```

### Next.js App Routerとの統合

Next.js 13+のApp Routerで使用する場合、Route Handlerを作成します。

```typescript
// app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/trpc';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => ({}),
  });

export { handler as GET, handler as POST };
```

## クライアント側の設定

次に、tRPCクライアントとReact Queryを統合します。

```typescript
// lib/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@/server/trpc';

export const trpc = createTRPCReact<AppRouter>();

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
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

## Zodによるバリデーション

Zodスキーマを使用して、入力値を検証します。

```typescript
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上必要です'),
  age: z.number().int().min(0).max(120),
});

export const authRouter = router({
  register: publicProcedure
    .input(userSchema)
    .mutation(async ({ input }) => {
      // input は型安全に検証済み
      const user = await createUser(input);
      return { success: true, userId: user.id };
    }),
});
```

## Reactコンポーネントでの使用

クライアント側でtRPCフックを使用します。

```typescript
'use client';

import { trpc } from '@/lib/trpc';

export function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error } = trpc.user.getById.useQuery({ id: userId });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>{data.name}</h1>
      <p>{data.email}</p>
    </div>
  );
}
```

### ミューテーションの使用

データ変更にはミューテーションを使用します。

```typescript
export function CreatePostForm() {
  const utils = trpc.useContext();
  const createPost = trpc.post.create.useMutation({
    onSuccess: () => {
      // キャッシュを無効化して再取得
      utils.post.list.invalidate();
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    await createPost.mutateAsync({
      title: formData.get('title') as string,
      content: formData.get('content') as string,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" required />
      <textarea name="content" required />
      <button type="submit" disabled={createPost.isLoading}>
        {createPost.isLoading ? '作成中...' : '作成'}
      </button>
    </form>
  );
}
```

## ミドルウェアとコンテキスト

認証などの共通処理はミドルウェアで実装します。

```typescript
import { TRPCError } from '@trpc/server';

const t = initTRPC.context<Context>().create();

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      user: ctx.user, // 認証済みユーザー
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);

export const userRouter = router({
  me: protectedProcedure.query(({ ctx }) => {
    // ctx.user は必ず存在する
    return ctx.user;
  }),
});
```

## サブスクリプション（リアルタイム）

WebSocketを使用したリアルタイム通信も可能です。

```typescript
import { observable } from '@trpc/server/observable';

export const chatRouter = router({
  onMessage: publicProcedure.subscription(() => {
    return observable<Message>((emit) => {
      const onMessage = (message: Message) => {
        emit.next(message);
      };

      eventEmitter.on('message', onMessage);

      return () => {
        eventEmitter.off('message', onMessage);
      };
    });
  }),
});
```

クライアント側:

```typescript
export function ChatRoom() {
  trpc.chat.onMessage.useSubscription(undefined, {
    onData: (message) => {
      console.log('New message:', message);
    },
  });

  return <div>Chat Room</div>;
}
```

## エラーハンドリング

tRPCは構造化されたエラーハンドリングをサポートします。

```typescript
import { TRPCError } from '@trpc/server';

export const postRouter = router({
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const post = await db.post.findUnique({ where: { id: input.id } });

      if (!post) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '投稿が見つかりません',
        });
      }

      if (post.authorId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '削除権限がありません',
        });
      }

      await db.post.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
```

## パフォーマンス最適化

### バッチリクエスト

tRPCは複数のリクエストを自動的にバッチ処理します。

```typescript
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: '/api/trpc',
      maxURLLength: 2083, // URL長制限
    }),
  ],
});
```

### データプリフェッチ

Server Componentsでデータをプリフェッチできます。

```typescript
import { createServerSideHelpers } from '@trpc/react-query/server';

export default async function PostPage({ params }: { params: { id: string } }) {
  const helpers = createServerSideHelpers({
    router: appRouter,
    ctx: {},
  });

  await helpers.post.getById.prefetch({ id: params.id });

  return (
    <HydrateClient>
      <PostDetail id={params.id} />
    </HydrateClient>
  );
}
```

## まとめ

tRPC v11は、フルスタックTypeScriptアプリケーションで型安全なAPIを実現する強力なツールです。

**主なメリット:**
- コンパイル時の型チェック
- スキーマ定義・コード生成不要
- React Queryとのシームレスな統合
- Next.js App Routerへの対応

tRPCを使えば、APIの型ミスマッチによるバグを大幅に削減し、開発体験を向上させることができます。

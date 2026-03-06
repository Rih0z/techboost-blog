---
title: '型安全API設計完全ガイド - tRPC、Zod、OpenAPIで実現するエンドツーエンド型安全'
description: 'tRPC、Zod、OpenAPIを活用した型安全なAPI設計を徹底解説。フロントエンドからバックエンドまで完全な型安全性を実現する方法を完全網羅。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。'
pubDate: 'Feb 05 2026'
tags: ['tRPC', 'Zod', 'TypeScript']
---
# 型安全API設計完全ガイド

モダンなWebアプリケーション開発において、フロントエンドとバックエンド間の型安全性は品質と生産性を大きく左右します。この記事では、tRPC、Zod、OpenAPIを組み合わせた、完全に型安全なAPI設計の実践方法を解説します。

## 型安全APIの重要性

### 従来のREST APIの課題

```typescript
// フロントエンド
interface User {
  id: number;
  name: string;
  email: string;
}

// バックエンドが実際に返すデータと型定義が一致する保証がない
async function getUser(id: number): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  return response.json(); // 型安全性なし
}

// 実行時エラーのリスク
const user = await getUser(1);
console.log(user.email.toLowerCase()); // emailが存在しない可能性
```

### 型安全APIのメリット

```typescript
// tRPCによる型安全なAPI
const user = await trpc.user.getById.query({ id: 1 });
// userの型が自動的に推論される
// プロパティの補完が効く
// 存在しないプロパティへのアクセスはコンパイルエラー
console.log(user.email.toLowerCase()); // 型安全
```

## tRPC入門

### tRPCのセットアップ

```bash
npm install @trpc/server @trpc/client @trpc/react-query @tanstack/react-query zod
```

### バックエンド設定

```typescript
// server/trpc.ts
import { initTRPC } from '@trpc/server';
import { z } from 'zod';

// コンテキストの型定義
export type Context = {
  user?: {
    id: string;
    name: string;
  };
};

// tRPCインスタンスの作成
const t = initTRPC.context<Context>().create();

// エクスポート
export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new Error('Unauthorized');
  }
  return next({
    ctx: {
      user: ctx.user,
    },
  });
});
```

### ルーターの定義

```typescript
// server/routers/user.ts
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';

// バリデーションスキーマ
const userSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150).optional(),
  role: z.enum(['user', 'admin']).default('user'),
});

export const userRouter = router({
  // ユーザー取得
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const user = await db.user.findUnique({
        where: { id: input.id },
      });
      if (!user) {
        throw new Error('User not found');
      }
      return userSchema.parse(user);
    }),

  // ユーザー一覧
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        offset: z.number().min(0).default(0),
        role: z.enum(['user', 'admin']).optional(),
      })
    )
    .query(async ({ input }) => {
      const users = await db.user.findMany({
        take: input.limit,
        skip: input.offset,
        where: input.role ? { role: input.role } : undefined,
      });
      return {
        users: users.map(u => userSchema.parse(u)),
        total: await db.user.count(),
      };
    }),

  // ユーザー作成（認証必要）
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        email: z.string().email(),
        age: z.number().int().min(0).max(150).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await db.user.create({
        data: {
          ...input,
          createdBy: ctx.user.id,
        },
      });
      return userSchema.parse(user);
    }),

  // ユーザー更新
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        email: z.string().email().optional(),
        age: z.number().int().min(0).max(150).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;

      // 権限チェック
      const existingUser = await db.user.findUnique({ where: { id } });
      if (existingUser?.createdBy !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new Error('Forbidden');
      }

      const user = await db.user.update({
        where: { id },
        data,
      });
      return userSchema.parse(user);
    }),

  // ユーザー削除
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // 権限チェック
      const user = await db.user.findUnique({ where: { id: input.id } });
      if (user?.createdBy !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new Error('Forbidden');
      }

      await db.user.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
```

### ルートルーターの作成

```typescript
// server/routers/_app.ts
import { router } from '../trpc';
import { userRouter } from './user';
import { postRouter } from './post';
import { commentRouter } from './comment';

export const appRouter = router({
  user: userRouter,
  post: postRouter,
  comment: commentRouter,
});

// 型をエクスポート
export type AppRouter = typeof appRouter;
```

### サーバーのセットアップ

```typescript
// server/index.ts
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { appRouter } from './routers/_app';
import { createContext } from './context';

const server = createHTTPServer({
  router: appRouter,
  createContext,
});

server.listen(3001);
console.log('🚀 tRPC server listening on http://localhost:3001');
```

```typescript
// server/context.ts
import { CreateHTTPContextOptions } from '@trpc/server/adapters/standalone';
import { verifyToken } from './auth';

export async function createContext({ req }: CreateHTTPContextOptions) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    try {
      const user = await verifyToken(token);
      return { user };
    } catch (error) {
      return {};
    }
  }

  return {};
}
```

## フロントエンド統合

### tRPCクライアントのセットアップ

```typescript
// src/utils/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../server/routers/_app';

export const trpc = createTRPCReact<AppRouter>();

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: 'http://localhost:3001',
        headers() {
          const token = localStorage.getItem('token');
          return token ? { authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
```

### Reactアプリでの使用

```tsx
// src/App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, createTRPCClient } from './utils/trpc';
import { UserList } from './components/UserList';

const queryClient = new QueryClient();
const trpcClient = createTRPCClient();

export function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <UserList />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

### コンポーネントでの使用

```tsx
// src/components/UserList.tsx
import { useState } from 'react';
import { trpc } from '../utils/trpc';

export function UserList() {
  const [page, setPage] = useState(0);
  const limit = 10;

  // ユーザー一覧の取得（自動的に型が推論される）
  const { data, isLoading, error } = trpc.user.list.useQuery({
    limit,
    offset: page * limit,
  });

  // ユーザー作成のMutation
  const createUser = trpc.user.create.useMutation({
    onSuccess: () => {
      // キャッシュの無効化
      trpc.useContext().user.list.invalidate();
    },
  });

  const handleCreate = async () => {
    await createUser.mutateAsync({
      name: 'New User',
      email: 'user@example.com',
      age: 25,
    });
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <button onClick={handleCreate}>Create User</button>

      <ul>
        {data?.users.map(user => (
          <li key={user.id}>
            {user.name} ({user.email})
            {user.age && ` - ${user.age}歳`}
          </li>
        ))}
      </ul>

      <div>
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          Previous
        </button>
        <span>Page {page + 1}</span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={(page + 1) * limit >= (data?.total || 0)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

## Zodによるバリデーション

### 複雑なスキーマ定義

```typescript
// schemas/post.ts
import { z } from 'zod';

// 基本スキーマ
export const postSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'タイトルは必須です').max(200),
  content: z.string().min(10, '本文は10文字以上必要です'),
  published: z.boolean().default(false),
  authorId: z.string().uuid(),
  tags: z.array(z.string()).max(5, 'タグは最大5個までです'),
  metadata: z.object({
    views: z.number().int().min(0).default(0),
    likes: z.number().int().min(0).default(0),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// 作成用スキーマ（IDと日時を除外）
export const createPostSchema = postSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  metadata: true,
});

// 更新用スキーマ（部分的な更新を許可）
export const updatePostSchema = postSchema.partial().required({ id: true });

// クエリパラメータ用スキーマ
export const postQuerySchema = z.object({
  authorId: z.string().uuid().optional(),
  published: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'views', 'likes']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().int().min(1).max(100).default(10),
  offset: z.number().int().min(0).default(0),
});

// 型の抽出
export type Post = z.infer<typeof postSchema>;
export type CreatePost = z.infer<typeof createPostSchema>;
export type UpdatePost = z.infer<typeof updatePostSchema>;
export type PostQuery = z.infer<typeof postQuerySchema>;
```

### カスタムバリデーション

```typescript
// カスタムバリデーター
const passwordSchema = z
  .string()
  .min(8, 'パスワードは8文字以上必要です')
  .regex(/[A-Z]/, '大文字を1文字以上含める必要があります')
  .regex(/[a-z]/, '小文字を1文字以上含める必要があります')
  .regex(/[0-9]/, '数字を1文字以上含める必要があります')
  .regex(/[^A-Za-z0-9]/, '特殊文字を1文字以上含める必要があります');

const signupSchema = z
  .object({
    email: z.string().email('有効なメールアドレスを入力してください'),
    password: passwordSchema,
    confirmPassword: z.string(),
    terms: z.literal(true, {
      errorMap: () => ({ message: '利用規約に同意する必要があります' }),
    }),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  });

// 使用例
export const authRouter = router({
  signup: publicProcedure
    .input(signupSchema)
    .mutation(async ({ input }) => {
      // パスワードのハッシュ化
      const hashedPassword = await hashPassword(input.password);

      const user = await db.user.create({
        data: {
          email: input.email,
          password: hashedPassword,
        },
      });

      return { userId: user.id };
    }),
});
```

### 条件付きバリデーション

```typescript
const userSchema = z.object({
  type: z.enum(['individual', 'company']),
  name: z.string(),
  email: z.string().email(),

  // 個人の場合のみ必須
  firstName: z.string().optional(),
  lastName: z.string().optional(),

  // 企業の場合のみ必須
  companyName: z.string().optional(),
  taxId: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'individual') {
    if (!data.firstName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '名を入力してください',
        path: ['firstName'],
      });
    }
    if (!data.lastName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '姓を入力してください',
        path: ['lastName'],
      });
    }
  } else if (data.type === 'company') {
    if (!data.companyName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '会社名を入力してください',
        path: ['companyName'],
      });
    }
    if (!data.taxId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '法人番号を入力してください',
        path: ['taxId'],
      });
    }
  }
});
```

## OpenAPI統合

### OpenAPIスキーマの生成

```typescript
// server/openapi.ts
import { generateOpenApiDocument } from 'trpc-openapi';
import { appRouter } from './routers/_app';

export const openApiDocument = generateOpenApiDocument(appRouter, {
  title: 'My API',
  version: '1.0.0',
  baseUrl: 'http://localhost:3001',
  docsUrl: 'https://docs.example.com',
  tags: ['user', 'post', 'comment'],
});
```

### OpenAPIメタデータの追加

```typescript
// server/routers/user.ts
export const userRouter = router({
  getById: publicProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/users/{id}',
        tags: ['user'],
        summary: 'Get user by ID',
        description: 'Retrieves a single user by their unique identifier',
      },
    })
    .input(z.object({ id: z.string() }))
    .output(userSchema)
    .query(async ({ input }) => {
      // ...
    }),

  create: protectedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/users',
        tags: ['user'],
        summary: 'Create user',
        protect: true, // 認証必要
      },
    })
    .input(createUserSchema)
    .output(userSchema)
    .mutation(async ({ input, ctx }) => {
      // ...
    }),
});
```

### Swagger UIの設定

```typescript
// server/index.ts
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routers/_app';
import { openApiDocument } from './openapi';
import { createContext } from './context';

const app = express();

// tRPC endpoint
app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// OpenAPI endpoint
app.get('/openapi.json', (req, res) => {
  res.json(openApiDocument);
});

// Swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.listen(3001, () => {
  console.log('🚀 Server running on http://localhost:3001');
  console.log('📚 API Docs: http://localhost:3001/docs');
});
```

## エラーハンドリング

### カスタムエラーの定義

```typescript
// server/errors.ts
import { TRPCError } from '@trpc/server';

export class AppError extends TRPCError {
  constructor(code: string, message: string, cause?: unknown) {
    super({
      code: 'INTERNAL_SERVER_ERROR',
      message,
      cause,
    });
  }
}

export class NotFoundError extends TRPCError {
  constructor(resource: string, id: string) {
    super({
      code: 'NOT_FOUND',
      message: `${resource} with id ${id} not found`,
    });
  }
}

export class ValidationError extends TRPCError {
  constructor(message: string, errors: Record<string, string>) {
    super({
      code: 'BAD_REQUEST',
      message,
      cause: errors,
    });
  }
}
```

### エラーハンドリングの実装

```typescript
// server/routers/user.ts
export const userRouter = router({
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      try {
        const user = await db.user.findUnique({
          where: { id: input.id },
        });

        if (!user) {
          throw new NotFoundError('User', input.id);
        }

        return userSchema.parse(user);
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new AppError('USER_FETCH_ERROR', 'Failed to fetch user', error);
      }
    }),
});
```

### フロントエンドでのエラーハンドリング

```tsx
// src/components/UserProfile.tsx
import { trpc } from '../utils/trpc';

export function UserProfile({ userId }: { userId: string }) {
  const { data, error, isLoading } = trpc.user.getById.useQuery({ id: userId });

  if (isLoading) return <div>Loading...</div>;

  if (error) {
    // エラーコードに応じた処理
    if (error.data?.code === 'NOT_FOUND') {
      return <div>ユーザーが見つかりません</div>;
    }
    if (error.data?.code === 'UNAUTHORIZED') {
      return <div>ログインが必要です</div>;
    }
    return <div>エラーが発生しました: {error.message}</div>;
  }

  return (
    <div>
      <h1>{data.name}</h1>
      <p>{data.email}</p>
    </div>
  );
}
```

## まとめ

型安全なAPI設計は、モダンなWebアプリケーション開発に不可欠です。

### 主な利点

1. **型安全性** - コンパイル時のエラー検出
2. **開発効率** - 自動補完とIntelliSense
3. **保守性** - リファクタリングが容易
4. **ドキュメント** - OpenAPIによる自動生成

### 推奨構成

- **tRPC** - エンドツーエンドの型安全性
- **Zod** - ランタイムバリデーション
- **OpenAPI** - ドキュメント生成
- **React Query** - データフェッチング

型安全なAPIで、堅牢で保守性の高いアプリケーションを構築しましょう。

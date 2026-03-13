---
title: 'TypeScriptで型安全なAPI設計パターン完全ガイド'
description: 'tRPC・Zod・TypeScriptを組み合わせたエンドツーエンドで型安全なAPI設計パターンを実践コード付きで解説。フロントエンドとバックエンド間の型不整合によるランタイムバグを根本から防ぐアーキテクチャ設計と導入手順がわかる完全ガイドです。'
pubDate: '2026-02-05'
tags: ['API', 'TypeScript', 'バックエンド', 'フロントエンド']
heroImage: '../../assets/thumbnails/type-safe-api-design.jpg'
---

フロントエンドとバックエンドで型定義がずれてバグが発生した経験はありませんか？TypeScriptを使っていても、API境界で型安全性が失われることはよくあります。

本記事では、tRPC、Zod、TypeScriptを組み合わせて、エンドツーエンドで型安全なAPIを設計する方法を詳しく解説します。

## 型安全なAPIとは？

従来のREST API開発では、以下のような問題が発生します。

```typescript
// Backend
app.post('/api/users', (req, res) => {
  const { name, email, age } = req.body; // 型がany
  // ...
});

// Frontend
const response = await fetch('/api/users', {
  method: 'POST',
  body: JSON.stringify({
    name: 'John',
    email: 'john@example.com',
    age: '30', // 🔴 文字列を送ってしまった！
  }),
});

const user = await response.json(); // 🔴 戻り値の型も不明
```

**型安全なAPI**では、以下が保証されます。

1. **リクエストの型検証**: 送信データが正しい型か
2. **レスポンスの型推論**: 戻り値の型が自動的に推論される
3. **エンドツーエンドの型安全性**: フロント・バック間で型が共有される

## tRPCによる型安全なAPI設計

tRPCは、TypeScriptの型システムを活用した、エンドツーエンドで型安全なRPCフレームワークです。

### 基本セットアップ

```bash
# サーバー側
npm install @trpc/server zod

# クライアント側
npm install @trpc/client @trpc/react-query @tanstack/react-query
```

### サーバー側の実装

```typescript
// server/trpc.ts
import { initTRPC } from '@trpc/server';
import { z } from 'zod';

// tRPCインスタンスの初期化
const t = initTRPC.create();

// ルーター・プロシージャビルダーのエクスポート
export const router = t.router;
export const publicProcedure = t.procedure;

// server/routers/user.ts
import { z } from 'zod';
import { router, publicProcedure } from '../trpc';

// Zodでバリデーションスキーマを定義
const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
});

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  age: z.number(),
  createdAt: z.date(),
});

export const userRouter = router({
  // ユーザー作成
  create: publicProcedure
    .input(createUserSchema)
    .mutation(async ({ input }) => {
      // ✅ inputの型が自動的に推論される
      // input: { name: string; email: string; age: number }

      const user = await db.user.create({
        data: {
          name: input.name,
          email: input.email,
          age: input.age,
        },
      });

      // ✅ 戻り値の型も推論される
      return user;
    }),

  // ユーザー一覧取得
  list: publicProcedure
    .query(async () => {
      const users = await db.user.findMany();
      return users;
    }),

  // ユーザー詳細取得
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const user = await db.user.findUnique({
        where: { id: input.id },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    }),

  // ユーザー更新
  update: publicProcedure
    .input(z.object({
      id: z.string(),
      data: createUserSchema.partial(),
    }))
    .mutation(async ({ input }) => {
      const user = await db.user.update({
        where: { id: input.id },
        data: input.data,
      });

      return user;
    }),

  // ユーザー削除
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db.user.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});

// server/routers/_app.ts
import { router } from '../trpc';
import { userRouter } from './user';
import { postRouter } from './post';

export const appRouter = router({
  user: userRouter,
  post: postRouter,
});

// 型定義をエクスポート
export type AppRouter = typeof appRouter;
```

### クライアント側の実装

```typescript
// client/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../server/routers/_app';

// ✅ サーバー側の型定義をインポート
export const trpc = createTRPCReact<AppRouter>();

// client/App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc } from './trpc';

const queryClient = new QueryClient();

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/trpc',
    }),
  ],
});

function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <UserList />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

// components/UserList.tsx
function UserList() {
  // ✅ 戻り値の型が自動的に推論される
  const { data: users, isLoading } = trpc.user.list.useQuery();

  const createUser = trpc.user.create.useMutation();

  const handleCreate = async () => {
    await createUser.mutateAsync({
      name: 'John',
      email: 'john@example.com',
      age: 30,
      // age: '30', // 🔴 型エラー！数値でなければならない
    });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <button onClick={handleCreate}>Create User</button>
      {users?.map((user) => (
        // ✅ user.name, user.email等の型が推論される
        <div key={user.id}>
          {user.name} ({user.email})
        </div>
      ))}
    </div>
  );
}
```

## Zodによる強力なバリデーション

Zodは、TypeScriptの型システムと統合されたスキーマバリデーションライブラリです。

### 基本的な使い方

```typescript
import { z } from 'zod';

// スキーマ定義
const userSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().int().min(0),
});

// 型推論
type User = z.infer<typeof userSchema>;
// type User = {
//   name: string;
//   email: string;
//   age: number;
// }

// バリデーション
const result = userSchema.safeParse({
  name: 'John',
  email: 'john@example.com',
  age: 30,
});

if (result.success) {
  console.log(result.data); // ✅ 型安全なデータ
} else {
  console.error(result.error); // エラー詳細
}
```

### 高度なバリデーション

```typescript
// 文字列のバリデーション
const nameSchema = z.string()
  .min(1, 'Name is required')
  .max(100, 'Name is too long')
  .regex(/^[a-zA-Z\s]+$/, 'Name must contain only letters');

// 数値のバリデーション
const ageSchema = z.number()
  .int('Age must be an integer')
  .min(0, 'Age must be positive')
  .max(150, 'Age is too high');

// メールアドレス
const emailSchema = z.string()
  .email('Invalid email address')
  .toLowerCase()
  .trim();

// 日付
const dateSchema = z.date()
  .min(new Date('1900-01-01'), 'Date is too old')
  .max(new Date(), 'Date cannot be in the future');

// 配列
const tagsSchema = z.array(z.string())
  .min(1, 'At least one tag is required')
  .max(10, 'Too many tags');

// オブジェクトのネスト
const addressSchema = z.object({
  street: z.string(),
  city: z.string(),
  zipCode: z.string().regex(/^\d{3}-\d{4}$/),
});

const userWithAddressSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  address: addressSchema,
});

// ユニオン型
const statusSchema = z.enum(['active', 'inactive', 'pending']);

// カスタムバリデーション
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .refine(
    (val) => /[A-Z]/.test(val),
    'Password must contain at least one uppercase letter'
  )
  .refine(
    (val) => /[a-z]/.test(val),
    'Password must contain at least one lowercase letter'
  )
  .refine(
    (val) => /[0-9]/.test(val),
    'Password must contain at least one number'
  );
```

### スキーマの合成

```typescript
// 基本スキーマ
const baseUserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

// 拡張
const userWithIdSchema = baseUserSchema.extend({
  id: z.string(),
  createdAt: z.date(),
});

// 部分的（全フィールドオプショナル）
const partialUserSchema = baseUserSchema.partial();
// type PartialUser = {
//   name?: string;
//   email?: string;
// }

// 一部必須
const updateUserSchema = baseUserSchema.partial().extend({
  id: z.string(), // idは必須
});

// オミット
const userWithoutEmailSchema = userWithIdSchema.omit({ email: true });

// ピック
const userNameOnlySchema = userWithIdSchema.pick({ name: true });

// マージ
const extendedUserSchema = userWithIdSchema.merge(
  z.object({
    age: z.number(),
    address: addressSchema,
  })
);
```

## 型推論を最大限活用する設計

### 1. Infer型の活用

```typescript
import { z } from 'zod';

// スキーマ定義
const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'guest']),
});

// 型推論
type User = z.infer<typeof userSchema>;

// スキーマから入力型を推論
const createUserSchema = userSchema.omit({ id: true });
type CreateUserInput = z.infer<typeof createUserSchema>;

// 関数の型定義も自動的に推論
function createUser(data: CreateUserInput): User {
  const id = generateId();
  return { id, ...data };
}
```

### 2. Discriminated Unions

```typescript
const successResponseSchema = z.object({
  status: z.literal('success'),
  data: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

const errorResponseSchema = z.object({
  status: z.literal('error'),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

const responseSchema = z.discriminatedUnion('status', [
  successResponseSchema,
  errorResponseSchema,
]);

type Response = z.infer<typeof responseSchema>;

// 型の絞り込みが効く
function handleResponse(response: Response) {
  if (response.status === 'success') {
    console.log(response.data.name); // ✅ OK
  } else {
    console.log(response.error.message); // ✅ OK
  }
}
```

### 3. ジェネリック型の活用

```typescript
// ページネーションレスポンス
function createPaginatedResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: z.array(dataSchema),
    pagination: z.object({
      page: z.number(),
      pageSize: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }),
  });
}

// 使用例
const userListResponseSchema = createPaginatedResponseSchema(userSchema);
type UserListResponse = z.infer<typeof userListResponseSchema>;

// tRPCで使用
export const userRouter = router({
  list: publicProcedure
    .input(z.object({
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const users = await db.user.findMany({
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      });

      const total = await db.user.count();

      return {
        data: users,
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          total,
          totalPages: Math.ceil(total / input.pageSize),
        },
      };
    }),
});
```

## フロント・バック間の型共有

### 1. Monorepo構成

```
project/
├── packages/
│   ├── api/              # バックエンド
│   │   ├── src/
│   │   │   ├── routers/
│   │   │   └── trpc.ts
│   │   └── package.json
│   ├── web/              # フロントエンド
│   │   ├── src/
│   │   └── package.json
│   └── shared/           # 共有型定義
│       ├── src/
│       │   ├── schemas/
│       │   └── types/
│       └── package.json
└── package.json
```

shared/src/schemas/user.ts:

```typescript
import { z } from 'zod';

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

export const createUserSchema = userSchema.omit({ id: true, createdAt: true });
export const updateUserSchema = createUserSchema.partial();

export type User = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
```

### 2. 型定義の再利用

api/src/routers/user.ts:

```typescript
import { router, publicProcedure } from '../trpc';
import { createUserSchema, updateUserSchema } from '@shared/schemas/user';

export const userRouter = router({
  create: publicProcedure
    .input(createUserSchema)
    .mutation(async ({ input }) => {
      // ✅ 共有スキーマを使用
      return await db.user.create({ data: input });
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string(),
      data: updateUserSchema,
    }))
    .mutation(async ({ input }) => {
      return await db.user.update({
        where: { id: input.id },
        data: input.data,
      });
    }),
});
```

web/src/components/UserForm.tsx:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserSchema, CreateUserInput } from '@shared/schemas/user';
import { trpc } from '../trpc';

function UserForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema), // ✅ Zodスキーマで検証
  });

  const createUser = trpc.user.create.useMutation();

  const onSubmit = async (data: CreateUserInput) => {
    await createUser.mutateAsync(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}

      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}

      <button type="submit">Create</button>
    </form>
  );
}
```

## エラーハンドリング

### 1. カスタムエラーの定義

```typescript
import { TRPCError } from '@trpc/server';

export class NotFoundError extends TRPCError {
  constructor(resource: string, id: string) {
    super({
      code: 'NOT_FOUND',
      message: `${resource} with id ${id} not found`,
    });
  }
}

export class ValidationError extends TRPCError {
  constructor(message: string) {
    super({
      code: 'BAD_REQUEST',
      message,
    });
  }
}
```

### 2. エラーハンドリングの実装

```typescript
export const userRouter = router({
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const user = await db.user.findUnique({
        where: { id: input.id },
      });

      if (!user) {
        throw new NotFoundError('User', input.id);
      }

      return user;
    }),
});

// クライアント側
function UserDetail({ id }: { id: string }) {
  const { data: user, error } = trpc.user.getById.useQuery({ id });

  if (error) {
    if (error.data?.code === 'NOT_FOUND') {
      return <div>User not found</div>;
    }
    return <div>Error: {error.message}</div>;
  }

  return <div>{user.name}</div>;
}
```

## ベストプラクティス

### 1. スキーマの分離

```typescript
// schemas/user.ts
export const userBaseSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

export const userSchema = userBaseSchema.extend({
  id: z.string(),
  createdAt: z.date(),
});

export const createUserSchema = userBaseSchema;
export const updateUserSchema = userBaseSchema.partial();
```

### 2. バリデーションの一元管理

```typescript
// validators/common.ts
export const commonValidators = {
  id: z.string().uuid(),
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(100),
  url: z.string().url(),
  phoneNumber: z.string().regex(/^\d{3}-\d{4}-\d{4}$/),
};

// schemas/user.ts
import { commonValidators } from '../validators/common';

export const userSchema = z.object({
  id: commonValidators.id,
  email: commonValidators.email,
  // ...
});
```

### 3. ミドルウェアの活用

```typescript
import { initTRPC } from '@trpc/server';

const t = initTRPC.context<Context>().create();

// 認証ミドルウェア
const isAuthenticated = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

// 保護されたプロシージャ
export const protectedProcedure = t.procedure.use(isAuthenticated);

// 使用例
export const userRouter = router({
  me: protectedProcedure.query(({ ctx }) => {
    // ✅ ctx.userは存在することが保証される
    return ctx.user;
  }),
});
```

## まとめ

tRPC + Zod + TypeScriptの組み合わせにより、以下のメリットが得られます。

1. **型安全性**: フロント・バック間で完全な型安全性
2. **開発効率**: 自動補完とエラー検出による高速開発
3. **バグ削減**: コンパイル時に多くのバグを検出
4. **リファクタリング容易性**: 型による安全なリファクタリング

型安全なAPI設計は、初期コストはかかりますが、長期的には開発効率とコード品質を大幅に向上させます。まずは小規模なプロジェクトで試してみて、徐々に適用範囲を広げていきましょう。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)

---
title: "Zodバリデーション完全マスター - スキーマ駆動開発の実践"
description: "TypeScript向けスキーマバリデーションライブラリZodの完全ガイド。基本的なバリデーションから複雑なスキーマ定義、フォームバリデーション、API型安全性、エラーハンドリングまで実践的に解説します。Zod・TypeScript・バリデーションに関する実践情報。"
pubDate: "2025-02-06"
tags: ["Zod", "TypeScript", "バリデーション", "型安全性", "フォーム", "スキーマ駆動開発"]
heroImage: '../../assets/thumbnails/zod-validation-mastery.jpg'
---

TypeScriptアプリケーション開発において、ランタイムバリデーションは避けて通れない重要な要素です。外部API、ユーザー入力、環境変数など、型安全性が保証されないデータソースに対して、適切なバリデーションを行う必要があります。

Zodは、TypeScriptファーストなスキーマバリデーションライブラリです。シンプルなAPI、優れた型推論、豊富なバリデーション機能を備え、フォームバリデーションからAPI型安全性まで幅広く活用できます。

本記事では、Zodの基本から実践的な使い方、複雑なスキーマ定義、エラーハンドリング、パフォーマンス最適化まで徹底解説します。

## Zodの特徴

### TypeScriptファーストな設計

```typescript
import { z } from 'zod'

// スキーマ定義
const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().min(0).max(150),
})

// 型推論（自動的に型が生成される）
type User = z.infer<typeof userSchema>
// { id: number; name: string; email: string; age: number }

// バリデーション
const result = userSchema.safeParse({
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
})

if (result.success) {
  console.log(result.data) // 型安全なデータ
} else {
  console.error(result.error) // バリデーションエラー
}
```

### 他のバリデーションライブラリとの比較

```typescript
// Zodの利点
// - 型推論が強力
// - APIがシンプル
// - エラーメッセージがカスタマイズ可能
// - バンドルサイズが小さい（8KB gzipped）
// - 依存関係ゼロ
```

## 基本的なスキーマ定義

### プリミティブ型

```typescript
import { z } from 'zod'

// 文字列
const stringSchema = z.string()
const minLengthSchema = z.string().min(3)
const maxLengthSchema = z.string().max(100)
const emailSchema = z.string().email()
const urlSchema = z.string().url()
const uuidSchema = z.string().uuid()
const regexSchema = z.string().regex(/^[a-z]+$/)

// 数値
const numberSchema = z.number()
const integerSchema = z.number().int()
const positiveSchema = z.number().positive()
const nonNegativeSchema = z.number().nonnegative()
const minMaxSchema = z.number().min(0).max(100)
const multipleOfSchema = z.number().multipleOf(5)

// 真偽値
const booleanSchema = z.boolean()

// 日付
const dateSchema = z.date()
const minDateSchema = z.date().min(new Date('2020-01-01'))
const maxDateSchema = z.date().max(new Date('2030-12-31'))

// undefined / null
const undefinedSchema = z.undefined()
const nullSchema = z.null()
const nullableSchema = z.string().nullable() // string | null
const optionalSchema = z.string().optional() // string | undefined
```

### オブジェクトスキーマ

```typescript
// 基本的なオブジェクト
const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().optional(),
})

// ネストしたオブジェクト
const profileSchema = z.object({
  user: z.object({
    id: z.number(),
    name: z.string(),
  }),
  settings: z.object({
    theme: z.enum(['light', 'dark']),
    notifications: z.boolean(),
  }),
})

// 部分的なスキーマ（すべてoptional）
const partialUserSchema = userSchema.partial()

// 一部のフィールドのみ必須
const updateUserSchema = userSchema.partial().required({ id: true })

// 特定のフィールドを除外
const userWithoutIdSchema = userSchema.omit({ id: true })

// 特定のフィールドのみ選択
const userNameOnlySchema = userSchema.pick({ name: true, email: true })
```

### 配列とタプル

```typescript
// 配列
const stringArraySchema = z.array(z.string())
const minArraySchema = z.array(z.string()).min(1) // 最低1要素
const maxArraySchema = z.array(z.string()).max(10) // 最大10要素
const nonEmptyArraySchema = z.array(z.string()).nonempty()

// タプル（固定長配列）
const tupleSchema = z.tuple([z.string(), z.number(), z.boolean()])
// [string, number, boolean]

// 可変長タプル
const variableTupleSchema = z.tuple([z.string(), z.number()]).rest(z.boolean())
// [string, number, ...boolean[]]
```

### Enumとリテラル型

```typescript
// Enum
const roleSchema = z.enum(['admin', 'user', 'guest'])
type Role = z.infer<typeof roleSchema> // 'admin' | 'user' | 'guest'

// Native Enum
enum NativeRole {
  Admin = 'admin',
  User = 'user',
  Guest = 'guest',
}
const nativeRoleSchema = z.nativeEnum(NativeRole)

// リテラル型
const literalSchema = z.literal('hello')
const numberLiteralSchema = z.literal(42)
const booleanLiteralSchema = z.literal(true)
```

### Union型とIntersection型

```typescript
// Union型（いずれか）
const stringOrNumberSchema = z.union([z.string(), z.number()])
const discriminatedUnionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), content: z.string() }),
  z.object({ type: z.literal('number'), value: z.number() }),
])

// Intersection型（両方）
const baseSchema = z.object({
  id: z.number(),
  createdAt: z.date(),
})

const userSchema = baseSchema.and(
  z.object({
    name: z.string(),
    email: z.string().email(),
  })
)
// { id: number; createdAt: Date; name: string; email: string }
```

## 高度なバリデーション

### カスタムバリデーション

```typescript
// refineメソッドでカスタムバリデーション
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine((password) => /[A-Z]/.test(password), {
    message: 'Password must contain at least one uppercase letter',
  })
  .refine((password) => /[a-z]/.test(password), {
    message: 'Password must contain at least one lowercase letter',
  })
  .refine((password) => /[0-9]/.test(password), {
    message: 'Password must contain at least one number',
  })

// superRefineで複数のエラーを追加
const passwordConfirmSchema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match',
        path: ['confirmPassword'],
      })
    }
  })
```

### 変換（Transform）

```typescript
// 文字列を数値に変換
const stringToNumberSchema = z.string().transform((val) => parseInt(val, 10))

// 文字列をDateに変換
const stringToDateSchema = z.string().transform((val) => new Date(val))

// オブジェクトの変換
const userInputSchema = z
  .object({
    name: z.string(),
    age: z.string(),
  })
  .transform((data) => ({
    name: data.name.trim(),
    age: parseInt(data.age, 10),
  }))

// transformとrefineの組み合わせ
const emailSchema = z
  .string()
  .transform((val) => val.toLowerCase().trim())
  .refine((val) => val.includes('@'), {
    message: 'Invalid email address',
  })
```

### 非同期バリデーション

```typescript
// 非同期バリデーション
const uniqueEmailSchema = z.string().email().refine(
  async (email) => {
    const exists = await checkEmailExists(email)
    return !exists
  },
  {
    message: 'Email already exists',
  }
)

// 使用例
async function validateUser(data: unknown) {
  const result = await userSchema.safeParseAsync(data)
  if (result.success) {
    return result.data
  } else {
    throw result.error
  }
}
```

### 条件付きバリデーション

```typescript
// discriminatedUnionで条件分岐
const eventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('click'),
    element: z.string(),
    x: z.number(),
    y: z.number(),
  }),
  z.object({
    type: z.literal('scroll'),
    scrollTop: z.number(),
  }),
  z.object({
    type: z.literal('resize'),
    width: z.number(),
    height: z.number(),
  }),
])

// 動的なバリデーション
function createUserSchema(requireEmail: boolean) {
  return z.object({
    name: z.string(),
    email: requireEmail ? z.string().email() : z.string().email().optional(),
  })
}
```

## フォームバリデーション

### React Hook Formとの統合

```bash
npm install react-hook-form @hookform/resolvers
```

```typescript
// components/UserForm.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const userFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  age: z.number().min(18, 'Must be at least 18 years old').max(100),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type UserFormData = z.infer<typeof userFormSchema>

export function UserForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
  })

  const onSubmit = async (data: UserFormData) => {
    console.log('Form data:', data)
    // APIリクエストなど
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>Name</label>
        <input {...register('name')} />
        {errors.name && <p>{errors.name.message}</p>}
      </div>

      <div>
        <label>Email</label>
        <input type="email" {...register('email')} />
        {errors.email && <p>{errors.email.message}</p>}
      </div>

      <div>
        <label>Age</label>
        <input
          type="number"
          {...register('age', { valueAsNumber: true })}
        />
        {errors.age && <p>{errors.age.message}</p>}
      </div>

      <div>
        <label>Password</label>
        <input type="password" {...register('password')} />
        {errors.password && <p>{errors.password.message}</p>}
      </div>

      <div>
        <label>Confirm Password</label>
        <input type="password" {...register('confirmPassword')} />
        {errors.confirmPassword && <p>{errors.confirmPassword.message}</p>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  )
}
```

### 動的フォーム

```typescript
// 動的に項目を追加できるフォーム
const dynamicFormSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  tags: z.array(z.string()).min(1, 'At least one tag is required'),
  socialLinks: z.array(
    z.object({
      platform: z.enum(['twitter', 'github', 'linkedin']),
      url: z.string().url(),
    })
  ).optional(),
})

type DynamicFormData = z.infer<typeof dynamicFormSchema>

export function DynamicForm() {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<DynamicFormData>({
    resolver: zodResolver(dynamicFormSchema),
    defaultValues: {
      tags: [''],
      socialLinks: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'socialLinks',
  })

  return (
    <form onSubmit={handleSubmit((data) => console.log(data))}>
      <input {...register('name')} placeholder="Name" />
      <input {...register('email')} placeholder="Email" />

      {/* 動的に追加可能な項目 */}
      <div>
        <h3>Social Links</h3>
        {fields.map((field, index) => (
          <div key={field.id}>
            <select {...register(`socialLinks.${index}.platform`)}>
              <option value="twitter">Twitter</option>
              <option value="github">GitHub</option>
              <option value="linkedin">LinkedIn</option>
            </select>
            <input {...register(`socialLinks.${index}.url`)} placeholder="URL" />
            <button type="button" onClick={() => remove(index)}>
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => append({ platform: 'twitter', url: '' })}
        >
          Add Social Link
        </button>
      </div>

      <button type="submit">Submit</button>
    </form>
  )
}
```

## API型安全性

### APIレスポンスのバリデーション

```typescript
// lib/api.ts
import { z } from 'zod'

const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.string().transform((val) => new Date(val)),
})

const usersResponseSchema = z.object({
  users: z.array(userSchema),
  total: z.number(),
  page: z.number(),
})

type User = z.infer<typeof userSchema>
type UsersResponse = z.infer<typeof usersResponseSchema>

export async function fetchUsers(page = 1): Promise<UsersResponse> {
  const response = await fetch(`https://api.example.com/users?page=${page}`)
  const data = await response.json()

  // バリデーション
  return usersResponseSchema.parse(data)
}

// エラーハンドリング付き
export async function fetchUsersSafe(page = 1): Promise<UsersResponse | null> {
  try {
    const response = await fetch(`https://api.example.com/users?page=${page}`)
    const data = await response.json()

    const result = usersResponseSchema.safeParse(data)
    if (result.success) {
      return result.data
    } else {
      console.error('API response validation failed:', result.error)
      return null
    }
  } catch (error) {
    console.error('API request failed:', error)
    return null
  }
}
```

### APIリクエストのバリデーション

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  age: z.number().int().min(18).max(150),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // バリデーション
    const validatedData = createUserSchema.parse(body)

    // ユーザー作成
    const user = await db.insert(users).values(validatedData).returning()

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', issues: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

const updateUserSchema = createUserSchema.partial()

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = updateUserSchema.parse(body)

    // ユーザー更新
    const user = await db.update(users).set(validatedData).returning()

    return NextResponse.json(user)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', issues: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### tRPCとの統合

```bash
npm install @trpc/server @trpc/client @trpc/react-query @trpc/next
```

```typescript
// server/trpc.ts
import { initTRPC } from '@trpc/server'
import { z } from 'zod'

const t = initTRPC.create()

export const appRouter = t.router({
  // ユーザー一覧取得
  getUsers: t.procedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ input }) => {
      const users = await db
        .select()
        .from(usersTable)
        .limit(input.limit)
        .offset((input.page - 1) * input.limit)

      return { users }
    }),

  // ユーザー作成
  createUser: t.procedure
    .input(
      z.object({
        name: z.string().min(2).max(100),
        email: z.string().email(),
        age: z.number().int().min(18).max(150),
      })
    )
    .mutation(async ({ input }) => {
      const [user] = await db.insert(usersTable).values(input).returning()
      return user
    }),

  // ユーザー更新
  updateUser: t.procedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          name: z.string().min(2).max(100).optional(),
          email: z.string().email().optional(),
          age: z.number().int().min(18).max(150).optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const [user] = await db
        .update(usersTable)
        .set(input.data)
        .where(eq(usersTable.id, input.id))
        .returning()

      return user
    }),
})

export type AppRouter = typeof appRouter
```

## 環境変数のバリデーション

```typescript
// lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  // 必須環境変数
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  API_URL: z.string().url(),

  // オプション環境変数
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('3000'),

  // 真偽値の環境変数
  ENABLE_ANALYTICS: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
})

// 型推論
export type Env = z.infer<typeof envSchema>

// バリデーション実行
function validateEnv(): Env {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Environment validation failed:')
      console.error(error.errors)
      process.exit(1)
    }
    throw error
  }
}

// エクスポート
export const env = validateEnv()

// 使用例
// import { env } from '@/lib/env'
// console.log(env.DATABASE_URL) // 型安全にアクセス
```

## エラーハンドリング

### エラーメッセージのカスタマイズ

```typescript
// デフォルトエラーメッセージの上書き
const customErrorMap: z.ZodErrorMap = (issue, ctx) => {
  if (issue.code === z.ZodIssueCode.invalid_type) {
    if (issue.expected === 'string') {
      return { message: 'この項目は文字列で入力してください' }
    }
  }

  if (issue.code === z.ZodIssueCode.too_small) {
    if (issue.type === 'string') {
      return { message: `${issue.minimum}文字以上で入力してください` }
    }
  }

  return { message: ctx.defaultError }
}

z.setErrorMap(customErrorMap)

// 個別のスキーマでエラーメッセージを設定
const userSchema = z.object({
  name: z.string().min(2, { message: '名前は2文字以上で入力してください' }),
  email: z.string().email({ message: '有効なメールアドレスを入力してください' }),
  age: z.number({
    required_error: '年齢は必須です',
    invalid_type_error: '年齢は数値で入力してください',
  }).min(18, { message: '18歳以上である必要があります' }),
})
```

### エラー情報の取得

```typescript
const result = userSchema.safeParse(data)

if (!result.success) {
  const errors = result.error

  // すべてのエラーメッセージ
  console.log(errors.errors)
  // [
  //   { code: 'too_small', minimum: 2, type: 'string', message: '...', path: ['name'] },
  //   { code: 'invalid_string', validation: 'email', message: '...', path: ['email'] }
  // ]

  // フィールドごとのエラーメッセージ
  const fieldErrors = errors.flatten().fieldErrors
  console.log(fieldErrors)
  // {
  //   name: ['名前は2文字以上で入力してください'],
  //   email: ['有効なメールアドレスを入力してください']
  // }

  // フォーマットされたエラー
  console.log(errors.format())
  // {
  //   name: { _errors: ['名前は2文字以上で入力してください'] },
  //   email: { _errors: ['有効なメールアドレスを入力してください'] }
  // }
}
```

## パフォーマンス最適化

### スキーマの再利用

```typescript
// ❌ 悪い例: 毎回スキーマを生成
function validateUser(data: unknown) {
  const schema = z.object({
    name: z.string(),
    email: z.string().email(),
  })
  return schema.parse(data)
}

// ✅ 良い例: スキーマを再利用
const userSchema = z.object({
  name: z.string(),
  email: z.string().email(),
})

function validateUser(data: unknown) {
  return userSchema.parse(data)
}
```

### Lazy Evaluation

```typescript
// 循環参照がある場合は z.lazy を使用
interface Category {
  id: number
  name: string
  subcategories: Category[]
}

const categorySchema: z.ZodType<Category> = z.lazy(() =>
  z.object({
    id: z.number(),
    name: z.string(),
    subcategories: z.array(categorySchema),
  })
)
```

### 部分的なバリデーション

```typescript
// 必要な部分だけバリデーション
const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  profile: z.object({
    bio: z.string(),
    avatar: z.string().url(),
  }),
})

// IDとnameだけバリデーション
const partialSchema = userSchema.pick({ id: true, name: true })

// profileを除外
const withoutProfileSchema = userSchema.omit({ profile: true })
```

## まとめ

Zodを使ったスキーマ駆動開発の主なポイントは以下の通りです。

- **型安全性**: スキーマから自動的に型が推論される
- **バリデーション**: ランタイムで型を検証し、安全性を保証
- **エラーハンドリング**: 詳細なエラー情報とカスタマイズ可能なメッセージ
- **フォーム統合**: React Hook Formとシームレスに統合
- **API型安全性**: リクエスト/レスポンスの型を保証

Zodを活用することで、TypeScriptの型システムとランタイムバリデーションを統合し、より安全で保守しやすいアプリケーションを構築できます。スキーマ駆動開発を実践し、型安全性の恩恵を最大限に活用しましょう。

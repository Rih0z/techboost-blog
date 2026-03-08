---
title: "Zodの高度なパターン集 — 型安全なバリデーションを極める"
description: "Zodのカスタムスキーマ、transform、refine、discriminated union、フォームバリデーション、API連携など、実践的な高度パターンを網羅的に解説します。Zod・TypeScript・Validationに関する実践情報。"
pubDate: "2026-02-05"
tags: ["Zod", "TypeScript", "Validation", "Type Safety", "Frontend"]
heroImage: '../../assets/thumbnails/zod-advanced-patterns.jpg'
---
## Zodとは

**Zod** は、TypeScriptファーストのスキーマバリデーションライブラリです。型推論とランタイムバリデーションを同時に提供し、フォーム入力、API レスポンス、環境変数の検証など、あらゆる場面で活用できます。

```bash
npm install zod
```

### Zodの基本的な使い方

```typescript
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().min(0).max(120),
});

type User = z.infer<typeof UserSchema>; // 型推論

const result = UserSchema.safeParse({
  name: "Alice",
  email: "alice@example.com",
  age: 25,
});

if (result.success) {
  console.log(result.data); // User型として型安全
} else {
  console.error(result.error.errors);
}
```

## パターン1: カスタムバリデーション（refine）

Zodの `refine()` メソッドで、複雑なビジネスロジックを実装できます。

```typescript
const PasswordSchema = z
  .string()
  .min(8, "パスワードは8文字以上必要です")
  .refine(
    (password) => /[A-Z]/.test(password),
    "大文字を1文字以上含める必要があります"
  )
  .refine(
    (password) => /[a-z]/.test(password),
    "小文字を1文字以上含める必要があります"
  )
  .refine(
    (password) => /[0-9]/.test(password),
    "数字を1文字以上含める必要があります"
  );

const SignupSchema = z
  .object({
    password: PasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "パスワードが一致しません",
    path: ["confirmPassword"], // エラーを特定のフィールドに関連付け
  });
```

## パターン2: transform による型変換

`transform()` を使って、バリデーション後にデータを変換できます。

```typescript
const DateSchema = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), {
    message: "無効な日付形式です",
  })
  .transform((val) => new Date(val)); // string → Date

const PriceSchema = z
  .string()
  .refine((val) => !isNaN(Number(val)), {
    message: "無効な価格です",
  })
  .transform((val) => Math.round(Number(val) * 100)); // 円 → セント単位

const ProductSchema = z.object({
  name: z.string(),
  price: PriceSchema,
  releaseDate: DateSchema,
});

const result = ProductSchema.parse({
  name: "商品A",
  price: "1980",
  releaseDate: "2026-02-05",
});

// result: { name: string, price: number, releaseDate: Date }
console.log(result.price); // 198000 (セント)
console.log(result.releaseDate.getFullYear()); // 2026
```

## パターン3: discriminated union（判別共用体）

複雑な型の分岐を型安全に扱えます。

```typescript
const SuccessResponseSchema = z.object({
  status: z.literal("success"),
  data: z.object({
    id: z.number(),
    name: z.string(),
  }),
});

const ErrorResponseSchema = z.object({
  status: z.literal("error"),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

const ApiResponseSchema = z.discriminatedUnion("status", [
  SuccessResponseSchema,
  ErrorResponseSchema,
]);

function handleResponse(response: z.infer<typeof ApiResponseSchema>) {
  if (response.status === "success") {
    console.log(response.data.name); // 型安全にアクセス
  } else {
    console.error(response.error.message); // エラーハンドリング
  }
}
```

## パターン4: フォームバリデーション（React Hook Form統合）

Zodは **React Hook Form** と組み合わせて強力なフォームバリデーションを実現します。

```bash
npm install react-hook-form @hookform/resolvers
```

```typescript
// components/SignupForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const SignupSchema = z.object({
  username: z
    .string()
    .min(3, "ユーザー名は3文字以上必要です")
    .max(20, "ユーザー名は20文字以下にしてください"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z
    .string()
    .min(8, "パスワードは8文字以上必要です")
    .regex(/[A-Z]/, "大文字を含める必要があります")
    .regex(/[a-z]/, "小文字を含める必要があります")
    .regex(/[0-9]/, "数字を含める必要があります"),
  age: z.coerce.number().min(13, "13歳以上である必要があります"),
  terms: z.literal(true, {
    errorMap: () => ({ message: "利用規約に同意する必要があります" }),
  }),
});

type SignupFormData = z.infer<typeof SignupSchema>;

export function SignupForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(SignupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    console.log("Form data:", data);
    // API送信処理
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <input {...register("username")} placeholder="ユーザー名" />
        {errors.username && <p className="error">{errors.username.message}</p>}
      </div>

      <div>
        <input {...register("email")} type="email" placeholder="メール" />
        {errors.email && <p className="error">{errors.email.message}</p>}
      </div>

      <div>
        <input {...register("password")} type="password" placeholder="パスワード" />
        {errors.password && <p className="error">{errors.password.message}</p>}
      </div>

      <div>
        <input {...register("age")} type="number" placeholder="年齢" />
        {errors.age && <p className="error">{errors.age.message}</p>}
      </div>

      <div>
        <label>
          <input {...register("terms")} type="checkbox" />
          利用規約に同意する
        </label>
        {errors.terms && <p className="error">{errors.terms.message}</p>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "送信中..." : "登録"}
      </button>
    </form>
  );
}
```

## パターン5: API連携とエラーハンドリング

```typescript
// lib/api.ts
import { z } from 'zod';

const UserApiSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  avatar: z.string().url().optional(),
  createdAt: z.string().transform((val) => new Date(val)),
});

export type User = z.infer<typeof UserApiSchema>;

export async function fetchUser(userId: number): Promise<User> {
  const response = await fetch(`/api/users/${userId}`);

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const data = await response.json();

  try {
    return UserApiSchema.parse(data); // バリデーション + 型変換
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("バリデーションエラー:", error.errors);
      throw new Error("APIレスポンスの形式が不正です");
    }
    throw error;
  }
}

// 使用例
try {
  const user = await fetchUser(123);
  console.log(user.createdAt.getFullYear()); // Date型として使える
} catch (error) {
  console.error("ユーザー取得エラー:", error);
}
```

## パターン6: 環境変数バリデーション

```typescript
// lib/env.ts
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  API_URL: z.string().url(),
  API_KEY: z.string().min(1),
  PORT: z.coerce.number().min(1000).max(65535).default(3000),
  DATABASE_URL: z.string().url(),
  ENABLE_ANALYTICS: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
});

export const env = EnvSchema.parse(process.env);

// 使用例
console.log(env.PORT); // number型
console.log(env.ENABLE_ANALYTICS); // boolean型
```

## パターン7: 再利用可能なスキーマ

```typescript
// schemas/common.ts
import { z } from 'zod';

// 共通スキーマの定義
export const EmailSchema = z.string().email();
export const PasswordSchema = z.string().min(8);
export const TimestampSchema = z.string().datetime().transform((val) => new Date(val));

export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// 基本エンティティスキーマ
export const BaseEntitySchema = z.object({
  id: z.number(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

// schemas/user.ts
import { BaseEntitySchema, EmailSchema } from './common';

export const UserSchema = BaseEntitySchema.extend({
  name: z.string(),
  email: EmailSchema,
  role: z.enum(['admin', 'user', 'guest']),
});

export const CreateUserSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateUserSchema = CreateUserSchema.partial(); // 全フィールドをオプショナルに
```

## パターン8: 配列とネストされたオブジェクト

```typescript
const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  zipCode: z.string().regex(/^\d{3}-\d{4}$/, "郵便番号の形式が不正です"),
});

const OrderItemSchema = z.object({
  productId: z.number(),
  quantity: z.number().min(1),
  price: z.number().min(0),
});

const OrderSchema = z.object({
  orderId: z.string().uuid(),
  customer: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
  shippingAddress: AddressSchema,
  billingAddress: AddressSchema.optional(),
  items: z.array(OrderItemSchema).min(1, "商品が1つ以上必要です"),
  totalAmount: z.number(),
}).refine(
  (data) => {
    const calculatedTotal = data.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    return Math.abs(calculatedTotal - data.totalAmount) < 0.01; // 浮動小数点誤差考慮
  },
  {
    message: "合計金額が一致しません",
    path: ["totalAmount"],
  }
);
```

## パターン9: 条件付きバリデーション

```typescript
const PaymentSchema = z
  .object({
    method: z.enum(['credit_card', 'bank_transfer', 'paypal']),
    creditCard: z.object({
      number: z.string().length(16),
      cvv: z.string().length(3),
      expiryDate: z.string().regex(/^\d{2}\/\d{2}$/),
    }).optional(),
    bankAccount: z.object({
      accountNumber: z.string(),
      bankCode: z.string().length(4),
    }).optional(),
    paypalEmail: z.string().email().optional(),
  })
  .refine(
    (data) => {
      if (data.method === 'credit_card') return !!data.creditCard;
      if (data.method === 'bank_transfer') return !!data.bankAccount;
      if (data.method === 'paypal') return !!data.paypalEmail;
      return false;
    },
    {
      message: "支払い方法に対応する情報を入力してください",
    }
  );
```

## まとめ

Zodは、TypeScriptプロジェクトにおける型安全性とランタイム安全性を同時に保証する強力なツールです。

**Zodを使うべきケース:**
- フォームバリデーション
- API レスポンスの型検証
- 環境変数のバリデーション
- 設定ファイルのパース

**ベストプラクティス:**
- スキーマを再利用可能にする
- エラーメッセージをユーザーフレンドリーに
- `safeParse()` を使ってエラーハンドリング
- `transform()` でデータ整形を一元化

Zodを活用することで、TypeScriptの型システムとランタイムのバリデーションを統一し、より安全で保守性の高いコードを書くことができます。

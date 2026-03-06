---
title: "Zod v4新機能完全ガイド: パフォーマンス改善とAPIの進化"
description: "Zod v4で実装された新機能とパフォーマンス改善を徹底解説。型推論の強化、新しいバリデーションメソッド、パフォーマンス最適化テクニックまで実践的に紹介します。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。"
pubDate: "2025-07-15"
updatedDate: "2025-07-15"
tags: ["Zod", "TypeScript", "バリデーション", "型安全性", "パフォーマンス"]
---
TypeScriptの型安全なバリデーションライブラリとして広く使われているZodが、v4で大幅なアップデートを遂げました。本記事では、Zod v4で追加された新機能とパフォーマンス改善について、実践的なコード例とともに詳しく解説します。

## Zod v4の主要アップデート

### 1. パフォーマンスの劇的な改善

Zod v4では、内部実装の最適化により、バリデーション速度が平均30-50%向上しています。特に大規模なオブジェクトや配列のバリデーションで顕著な改善が見られます。

```typescript
import { z } from 'zod';

// v4では内部最適化により、このような複雑なスキーマでも高速に動作
const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  profile: z.object({
    name: z.string().min(1).max(100),
    age: z.number().int().positive().max(150),
    bio: z.string().max(1000).optional(),
    tags: z.array(z.string()).max(10),
  }),
  settings: z.record(z.string(), z.unknown()),
  createdAt: z.date(),
  metadata: z.lazy(() => z.record(z.string(), z.any())),
});

// ベンチマーク例
const startTime = performance.now();
const result = userSchema.safeParse(userData);
const endTime = performance.now();
console.log(`Validation time: ${endTime - startTime}ms`);
```

### 2. 新しいバリデーションメソッド

#### `z.pipe()` の強化

Zod v4では`pipe`メソッドがより柔軟になり、変換とバリデーションを組み合わせやすくなりました。

```typescript
// 文字列から数値への変換とバリデーションをパイプライン化
const priceSchema = z
  .string()
  .pipe(z.coerce.number())
  .pipe(z.number().positive().multipleOf(0.01));

// 入力: "99.99" → 出力: 99.99 (number)
const price = priceSchema.parse("99.99");

// より複雑な例: JSON文字列のパース + バリデーション
const jsonUserSchema = z
  .string()
  .transform((str) => JSON.parse(str))
  .pipe(userSchema);

const user = jsonUserSchema.parse('{"id":"123","email":"user@example.com",...}');
```

#### `z.brand()` による名目型の実装

ブランド型を使用して、構造的には同じでも意味的に異なる型を区別できるようになりました。

```typescript
// ユーザーIDと注文IDを区別
const UserIdSchema = z.string().uuid().brand<'UserId'>();
const OrderIdSchema = z.string().uuid().brand<'OrderId'>();

type UserId = z.infer<typeof UserIdSchema>;
type OrderId = z.infer<typeof OrderIdSchema>;

function getUser(userId: UserId) {
  // UserIdのみ受け付ける
}

const userId = UserIdSchema.parse("550e8400-e29b-41d4-a716-446655440000");
const orderId = OrderIdSchema.parse("660e8400-e29b-41d4-a716-446655440000");

getUser(userId); // OK
// getUser(orderId); // Type error: OrderId は UserId に代入できない
```

#### `z.readonly()` による不変性の保証

スキーマレベルで読み取り専用を強制できるようになりました。

```typescript
const configSchema = z.object({
  apiKey: z.string(),
  endpoint: z.string().url(),
  timeout: z.number().default(5000),
}).readonly();

type Config = z.infer<typeof configSchema>;
// type Config = Readonly<{ apiKey: string; endpoint: string; timeout: number; }>

const config = configSchema.parse(data);
// config.apiKey = "new-key"; // Type error: 読み取り専用プロパティ
```

### 3. エラーハンドリングの改善

#### カスタムエラーマップの強化

エラーメッセージをより柔軟にカスタマイズできるようになりました。

```typescript
import { z, ZodIssueCode } from 'zod';

const customErrorMap: z.ZodErrorMap = (issue, ctx) => {
  // 日本語エラーメッセージ
  if (issue.code === ZodIssueCode.invalid_type) {
    if (issue.expected === 'string') {
      return { message: '文字列を入力してください' };
    }
    if (issue.expected === 'number') {
      return { message: '数値を入力してください' };
    }
  }

  if (issue.code === ZodIssueCode.too_small) {
    if (issue.type === 'string') {
      return { message: `${issue.minimum}文字以上入力してください` };
    }
  }

  if (issue.code === ZodIssueCode.invalid_string) {
    if (issue.validation === 'email') {
      return { message: '有効なメールアドレスを入力してください' };
    }
  }

  return { message: ctx.defaultError };
};

z.setErrorMap(customErrorMap);

// 使用例
const emailSchema = z.string().email();
const result = emailSchema.safeParse("invalid-email");

if (!result.success) {
  console.log(result.error.issues[0].message);
  // 出力: "有効なメールアドレスを入力してください"
}
```

#### エラーのフラット化API

ネストされたエラーを扱いやすくするための新しいAPIが追加されました。

```typescript
const formSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "パスワードが一致しません",
  path: ["confirmPassword"],
});

const result = formSchema.safeParse({
  username: "ab",
  email: "invalid",
  password: "short",
  confirmPassword: "different",
});

if (!result.success) {
  // フラット化されたエラーを取得
  const flatErrors = result.error.flatten();

  console.log(flatErrors.fieldErrors);
  // {
  //   username: ["String must contain at least 3 character(s)"],
  //   email: ["Invalid email"],
  //   password: ["String must contain at least 8 character(s)"],
  //   confirmPassword: ["パスワードが一致しません"]
  // }
}
```

### 4. 型推論の強化

#### `z.discriminatedUnion()` の改善

判別可能なユニオン型がより使いやすくなりました。

```typescript
// APIレスポンスの型定義
const successResponse = z.object({
  status: z.literal('success'),
  data: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

const errorResponse = z.object({
  status: z.literal('error'),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

const responseSchema = z.discriminatedUnion('status', [
  successResponse,
  errorResponse,
]);

type ApiResponse = z.infer<typeof responseSchema>;

// 型ガードが自動的に効く
function handleResponse(response: ApiResponse) {
  if (response.status === 'success') {
    console.log(response.data.name); // OK: data プロパティが存在
  } else {
    console.log(response.error.message); // OK: error プロパティが存在
  }
}
```

#### `z.lazy()` の型推論改善

再帰的な型定義がより直感的になりました。

```typescript
// 再帰的なツリー構造
interface TreeNode {
  value: string;
  children: TreeNode[];
}

const treeNodeSchema: z.ZodType<TreeNode> = z.lazy(() =>
  z.object({
    value: z.string(),
    children: z.array(treeNodeSchema),
  })
);

// 使用例
const tree = treeNodeSchema.parse({
  value: 'root',
  children: [
    {
      value: 'child1',
      children: [],
    },
    {
      value: 'child2',
      children: [
        {
          value: 'grandchild',
          children: [],
        },
      ],
    },
  ],
});
```

### 5. パフォーマンス最適化テクニック

#### スキーマのキャッシング

頻繁に使用するスキーマはキャッシュすることでパフォーマンスが向上します。

```typescript
// スキーマキャッシュクラス
class SchemaCache {
  private cache = new Map<string, z.ZodSchema>();

  getOrCreate<T extends z.ZodSchema>(key: string, factory: () => T): T {
    if (!this.cache.has(key)) {
      this.cache.set(key, factory());
    }
    return this.cache.get(key) as T;
  }
}

const schemaCache = new SchemaCache();

// 使用例
function validateUser(data: unknown) {
  const schema = schemaCache.getOrCreate('user', () =>
    z.object({
      id: z.string().uuid(),
      email: z.string().email(),
      name: z.string(),
    })
  );

  return schema.parse(data);
}
```

#### 部分的バリデーション

必要な部分だけをバリデーションすることで、パフォーマンスを改善できます。

```typescript
const fullSchema = z.object({
  personal: z.object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string(),
  }),
  address: z.object({
    street: z.string(),
    city: z.string(),
    zipCode: z.string(),
  }),
  preferences: z.object({
    newsletter: z.boolean(),
    notifications: z.boolean(),
  }),
});

// 特定のセクションだけをバリデーション
const personalSchema = fullSchema.pick({ personal: true });
const addressSchema = fullSchema.pick({ address: true });

// ステップごとのバリデーション
function validateForm(data: unknown, step: 'personal' | 'address' | 'preferences') {
  switch (step) {
    case 'personal':
      return personalSchema.parse(data);
    case 'address':
      return addressSchema.parse(data);
    case 'preferences':
      return fullSchema.pick({ preferences: true }).parse(data);
  }
}
```

### 6. 実践的な使用例

#### フォームバリデーション

```typescript
import { z } from 'zod';

// パスワードの強度チェック
const passwordSchema = z
  .string()
  .min(8, '8文字以上必要です')
  .regex(/[A-Z]/, '大文字を1文字以上含めてください')
  .regex(/[a-z]/, '小文字を1文字以上含めてください')
  .regex(/[0-9]/, '数字を1文字以上含めてください')
  .regex(/[^A-Za-z0-9]/, '記号を1文字以上含めてください');

// 登録フォームスキーマ
const registrationSchema = z
  .object({
    email: z.string().email('有効なメールアドレスを入力してください'),
    password: passwordSchema,
    confirmPassword: z.string(),
    username: z
      .string()
      .min(3, '3文字以上必要です')
      .max(20, '20文字以内にしてください')
      .regex(/^[a-zA-Z0-9_]+$/, '英数字とアンダースコアのみ使用できます'),
    birthDate: z
      .string()
      .pipe(z.coerce.date())
      .refine((date) => {
        const age = new Date().getFullYear() - date.getFullYear();
        return age >= 13;
      }, '13歳以上である必要があります'),
    terms: z.literal(true, {
      errorMap: () => ({ message: '利用規約に同意してください' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  });

// React Hook Form との統合例
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

type RegistrationForm = z.infer<typeof registrationSchema>;

function RegistrationForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
  });

  const onSubmit = (data: RegistrationForm) => {
    console.log('Valid data:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}

      <input {...register('password')} type="password" />
      {errors.password && <span>{errors.password.message}</span>}

      <input {...register('confirmPassword')} type="password" />
      {errors.confirmPassword && <span>{errors.confirmPassword.message}</span>}

      <button type="submit">登録</button>
    </form>
  );
}
```

#### API レスポンスの型安全な処理

```typescript
// API レスポンススキーマ
const apiResponseSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('success'),
    data: z.unknown(),
    metadata: z
      .object({
        timestamp: z.string().datetime(),
        requestId: z.string().uuid(),
      })
      .optional(),
  }),
  z.object({
    status: z.literal('error'),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.array(z.string()).optional(),
    }),
  }),
]);

// 型安全なAPIクライアント
class ApiClient {
  async fetch<T extends z.ZodSchema>(
    endpoint: string,
    dataSchema: T
  ): Promise<z.infer<T>> {
    const response = await fetch(endpoint);
    const json = await response.json();

    // レスポンス構造のバリデーション
    const parsed = apiResponseSchema.parse(json);

    if (parsed.status === 'error') {
      throw new Error(parsed.error.message);
    }

    // データ部分のバリデーション
    return dataSchema.parse(parsed.data);
  }
}

// 使用例
const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
});

const client = new ApiClient();
const user = await client.fetch('/api/users/123', userSchema);
// user の型は { id: string; email: string; name: string; }
```

#### 環境変数のバリデーション

```typescript
// 環境変数スキーマ
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  DATABASE_URL: z.string().url(),
  API_KEY: z.string().min(32),
  PORT: z.coerce.number().int().positive().default(3000),
  REDIS_URL: z.string().url().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ENABLE_CACHE: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .default('false'),
});

// 起動時にバリデーション
const env = envSchema.parse(process.env);

// 型安全に環境変数を使用
console.log(`Server running on port ${env.PORT}`);
if (env.ENABLE_CACHE && env.REDIS_URL) {
  // キャッシュ初期化
}
```

## まとめ

Zod v4は、パフォーマンスの大幅な改善に加えて、より柔軟で強力なAPIを提供しています。主な改善点は以下の通りです。

- **パフォーマンス**: 30-50%の速度向上
- **新機能**: `brand()`, `readonly()`, 強化された`pipe()`
- **エラーハンドリング**: カスタマイズ可能なエラーメッセージとフラット化API
- **型推論**: より正確で直感的な型推論
- **実用性**: フォーム、API、環境変数など実践的なユースケースへの対応

Zod v4を活用することで、より型安全で保守性の高いTypeScriptアプリケーションを構築できます。既存のZod v3からの移行も比較的スムーズなので、ぜひアップグレードを検討してみてください。


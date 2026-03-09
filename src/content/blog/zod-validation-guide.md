---
title: "Zod完全ガイド2026 — TypeScript時代の最強バリデーションライブラリ"
description: "Zod徹底解説。スキーマ定義、型推論、バリデーションルール、react-hook-form連携、API検証まで実践的に解説。TypeScript必携ツール。カスタムエラーメッセージやAPI入力検証、Prismaスキーマ連携の実装パターンも紹介します。"
pubDate: "2026-02-05"
tags: ["Zod", "TypeScript", "バリデーション", "型安全", "React"]
heroImage: '../../assets/thumbnails/zod-validation-guide.jpg'
---

TypeScriptでバリデーションを書くとき、型定義とバリデーションロジックを**2回書く**のは無駄です。**Zod**なら、スキーマ定義から**型を自動推論**し、ランタイムバリデーションも同時に実現できます。

本記事では、Zodの基礎から応用、実践的な使い方まで徹底解説します。

## Zodとは

**Zod**は、TypeScript-firstのスキーマ宣言とバリデーションライブラリです。

特徴:
- **型推論**: スキーマから TypeScript の型を自動生成
- **ゼロ依存**: 軽量（約8KB gzip）
- **チェーン可能**: `.min()`, `.max()`, `.email()` 等を繋げて書ける
- **エラーメッセージ**: カスタマイズ可能
- **変換（transform）**: バリデーション後にデータを加工可能

## Zodをインストール

```bash
npm install zod
```

TypeScriptプロジェクトで使用（`tsconfig.json`で`strict: true`推奨）。

## 基本スキーマ

### プリミティブ型

```typescript
import { z } from 'zod';

// 文字列
const stringSchema = z.string();
stringSchema.parse('hello'); // OK
stringSchema.parse(123); // エラー

// 数値
const numberSchema = z.number();
numberSchema.parse(42); // OK

// 真偽値
const booleanSchema = z.boolean();
booleanSchema.parse(true); // OK

// null / undefined
const nullSchema = z.null();
const undefinedSchema = z.undefined();

// any（型安全性なし、非推奨）
const anySchema = z.any();
```

### オブジェクト

```typescript
const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().optional(), // オプショナル
});

// 型推論
type User = z.infer<typeof userSchema>;
// ↓ 自動生成される型
// type User = {
//   id: number;
//   name: string;
//   email: string;
//   age?: number;
// }

// バリデーション
const result = userSchema.parse({
  id: 1,
  name: 'Alice',
  email: 'alice@example.com',
});
// OK → result は User 型

userSchema.parse({
  id: 1,
  name: 'Bob',
  email: 'invalid-email', // エラー（emailバリデーション失敗）
});
```

### 配列

```typescript
const numbersSchema = z.array(z.number());
numbersSchema.parse([1, 2, 3]); // OK
numbersSchema.parse([1, '2', 3]); // エラー

// 非空配列
const nonEmptySchema = z.array(z.string()).nonempty();
nonEmptySchema.parse([]); // エラー

// 最小・最大要素数
const limitedSchema = z.array(z.string()).min(1).max(10);
```

### ユニオン型

```typescript
const statusSchema = z.union([
  z.literal('pending'),
  z.literal('approved'),
  z.literal('rejected'),
]);

type Status = z.infer<typeof statusSchema>;
// type Status = "pending" | "approved" | "rejected"

statusSchema.parse('pending'); // OK
statusSchema.parse('unknown'); // エラー

// ショートハンド（enum）
const statusEnum = z.enum(['pending', 'approved', 'rejected']);
```

### タプル

```typescript
const tupleSchema = z.tuple([z.string(), z.number()]);

type Tuple = z.infer<typeof tupleSchema>;
// type Tuple = [string, number]

tupleSchema.parse(['Alice', 30]); // OK
tupleSchema.parse(['Alice']); // エラー（要素不足）
```

### レコード

```typescript
const recordSchema = z.record(z.string(), z.number());

type Record = z.infer<typeof recordSchema>;
// type Record = { [key: string]: number }

recordSchema.parse({ a: 1, b: 2 }); // OK
recordSchema.parse({ a: 1, b: 'invalid' }); // エラー
```

## バリデーションルール

### 文字列

```typescript
const schema = z.string()
  .min(3, '3文字以上必要です')
  .max(20, '20文字以下にしてください')
  .email('有効なメールアドレスを入力してください')
  .url('有効なURLを入力してください')
  .regex(/^[a-zA-Z0-9]+$/, '英数字のみ使用可能です')
  .trim() // 前後の空白を削除
  .toLowerCase(); // 小文字に変換
```

### 数値

```typescript
const schema = z.number()
  .min(0, '0以上の値を入力してください')
  .max(100, '100以下の値を入力してください')
  .int('整数を入力してください')
  .positive('正の数を入力してください')
  .nonnegative('0以上の値を入力してください')
  .multipleOf(5, '5の倍数を入力してください');
```

### 日付

```typescript
const dateSchema = z.date();

dateSchema.parse(new Date()); // OK
dateSchema.parse('2026-02-05'); // エラー（文字列はNG）

// 文字列をDateに変換
const dateStringSchema = z.string().pipe(z.coerce.date());
dateStringSchema.parse('2026-02-05'); // OK → Date オブジェクトに変換

// 日付範囲指定
const futureDate = z.date().min(new Date(), '未来の日付を指定してください');
```

### カスタムバリデーション

```typescript
const passwordSchema = z.string()
  .min(8, 'パスワードは8文字以上必要です')
  .refine(
    (val) => /[A-Z]/.test(val),
    '大文字を1文字以上含めてください'
  )
  .refine(
    (val) => /[a-z]/.test(val),
    '小文字を1文字以上含めてください'
  )
  .refine(
    (val) => /[0-9]/.test(val),
    '数字を1文字以上含めてください'
  );

passwordSchema.parse('Password1'); // OK
passwordSchema.parse('password'); // エラー（大文字と数字がない）
```

## オプショナル・デフォルト値

### オプショナル

```typescript
const schema = z.object({
  name: z.string(),
  age: z.number().optional(), // age は省略可能
});

type User = z.infer<typeof schema>;
// type User = { name: string; age?: number }

schema.parse({ name: 'Alice' }); // OK
schema.parse({ name: 'Bob', age: 30 }); // OK
```

### デフォルト値

```typescript
const schema = z.object({
  name: z.string(),
  role: z.string().default('user'),
});

const result = schema.parse({ name: 'Alice' });
console.log(result);
// { name: 'Alice', role: 'user' }
```

### nullable

```typescript
const schema = z.string().nullable();

type Str = z.infer<typeof schema>;
// type Str = string | null

schema.parse('hello'); // OK
schema.parse(null); // OK
schema.parse(undefined); // エラー
```

### nullish（nullable + optional）

```typescript
const schema = z.string().nullish();

type Str = z.infer<typeof schema>;
// type Str = string | null | undefined

schema.parse('hello'); // OK
schema.parse(null); // OK
schema.parse(undefined); // OK
```

## エラーハンドリング

### parse vs safeParse

```typescript
const schema = z.number();

// parse: エラーで例外をスロー
try {
  schema.parse('invalid');
} catch (err) {
  if (err instanceof z.ZodError) {
    console.error(err.errors);
  }
}

// safeParse: エラーをオブジェクトで返す（推奨）
const result = schema.safeParse('invalid');

if (!result.success) {
  console.error(result.error.errors);
  // [{ code: 'invalid_type', expected: 'number', received: 'string', path: [], message: '...' }]
} else {
  console.log(result.data); // 成功時のデータ
}
```

### カスタムエラーメッセージ

```typescript
const schema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  age: z.number().min(18, '18歳以上である必要があります'),
});

const result = schema.safeParse({ email: 'invalid', age: 15 });

if (!result.success) {
  result.error.errors.forEach(err => {
    console.log(`${err.path.join('.')}: ${err.message}`);
  });
  // email: 有効なメールアドレスを入力してください
  // age: 18歳以上である必要があります
}
```

## Zodとreact-hook-form連携

### インストール

```bash
npm install react-hook-form @hookform/resolvers
```

### フォームバリデーション

```typescript
// UserForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  age: z.number().min(18, '18歳以上である必要があります'),
});

type UserFormData = z.infer<typeof userSchema>;

export function UserForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  const onSubmit = (data: UserFormData) => {
    console.log('送信データ:', data);
    // API送信処理
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>名前</label>
        <input {...register('name')} />
        {errors.name && <span>{errors.name.message}</span>}
      </div>

      <div>
        <label>メール</label>
        <input {...register('email')} />
        {errors.email && <span>{errors.email.message}</span>}
      </div>

      <div>
        <label>年齢</label>
        <input type="number" {...register('age', { valueAsNumber: true })} />
        {errors.age && <span>{errors.age.message}</span>}
      </div>

      <button type="submit">送信</button>
    </form>
  );
}
```

### ネストしたオブジェクト

```typescript
const addressSchema = z.object({
  street: z.string(),
  city: z.string(),
  zipCode: z.string().regex(/^\d{3}-\d{4}$/, '郵便番号の形式が正しくありません'),
});

const userSchema = z.object({
  name: z.string(),
  address: addressSchema,
});

type UserFormData = z.infer<typeof userSchema>;

// フォームで使う
<input {...register('address.street')} />
<input {...register('address.city')} />
<input {...register('address.zipCode')} />
```

## ZodとTanStack Query（React Query）連携

### API レスポンスバリデーション

```typescript
// api.ts
import { z } from 'zod';

const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});

const usersSchema = z.array(userSchema);

export async function fetchUsers() {
  const res = await fetch('/api/users');
  const data = await res.json();

  // バリデーション
  return usersSchema.parse(data);
}
```

```typescript
// UsersPage.tsx
import { useQuery } from '@tanstack/react-query';
import { fetchUsers } from './api';

export function UsersPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error.message}</div>;

  return (
    <ul>
      {data?.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

## API入力バリデーション（Next.js App Router）

### Route Handler

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(18),
});

export async function POST(req: NextRequest) {
  const body = await req.json();

  // バリデーション
  const result = createUserSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.errors },
      { status: 400 }
    );
  }

  // DB保存処理（省略）
  const user = result.data;

  return NextResponse.json({ user }, { status: 201 });
}
```

### Server Actions

```typescript
// app/actions.ts
'use server';

import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().min(1),
  bio: z.string().max(500),
});

export async function updateProfile(formData: FormData) {
  const rawData = {
    name: formData.get('name'),
    bio: formData.get('bio'),
  };

  const result = updateProfileSchema.safeParse(rawData);

  if (!result.success) {
    return { error: result.error.flatten() };
  }

  // DB更新処理
  const { name, bio } = result.data;

  return { success: true };
}
```

```typescript
// app/profile/page.tsx
'use client';

import { updateProfile } from '../actions';

export default function ProfilePage() {
  async function handleSubmit(formData: FormData) {
    const result = await updateProfile(formData);

    if (result.error) {
      console.error(result.error);
    } else {
      console.log('更新成功');
    }
  }

  return (
    <form action={handleSubmit}>
      <input name="name" />
      <textarea name="bio" />
      <button>更新</button>
    </form>
  );
}
```

## 高度なテクニック

### transform（データ変換）

```typescript
const schema = z.string().transform((val) => val.toUpperCase());

const result = schema.parse('hello');
console.log(result); // "HELLO"

// 型も変換可能
const numberStringSchema = z.string().transform((val) => parseInt(val, 10));

type Result = z.infer<typeof numberStringSchema>;
// type Result = number

numberStringSchema.parse('42'); // 42（number型）
```

### preprocess（前処理）

```typescript
const schema = z.preprocess(
  (val) => (typeof val === 'string' ? val.trim() : val),
  z.string().min(1)
);

schema.parse('  hello  '); // "hello"（trim後にバリデーション）
```

### discriminatedUnion（判別可能なユニオン）

```typescript
const eventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('click'),
    x: z.number(),
    y: z.number(),
  }),
  z.object({
    type: z.literal('keypress'),
    key: z.string(),
  }),
]);

type Event = z.infer<typeof eventSchema>;
// type Event = { type: 'click'; x: number; y: number } | { type: 'keypress'; key: string }

const event = eventSchema.parse({ type: 'click', x: 10, y: 20 });

if (event.type === 'click') {
  console.log(event.x, event.y); // 型が自動で絞り込まれる
}
```

### extend（スキーマ拡張）

```typescript
const baseUserSchema = z.object({
  id: z.number(),
  name: z.string(),
});

const adminUserSchema = baseUserSchema.extend({
  role: z.literal('admin'),
  permissions: z.array(z.string()),
});

type AdminUser = z.infer<typeof adminUserSchema>;
// type AdminUser = { id: number; name: string; role: 'admin'; permissions: string[] }
```

### partial（すべてオプショナル）

```typescript
const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});

const partialUserSchema = userSchema.partial();

type PartialUser = z.infer<typeof partialUserSchema>;
// type PartialUser = { id?: number; name?: string; email?: string }

partialUserSchema.parse({}); // OK（すべて省略可能）
```

### pick / omit（部分選択）

```typescript
const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  password: z.string(),
});

// idとnameだけ取り出す
const publicUserSchema = userSchema.pick({ id: true, name: true });

// passwordを除外
const safeUserSchema = userSchema.omit({ password: true });
```

## Zodのベストプラクティス

### 1. スキーマをファイル分割

```typescript
// schemas/user.ts
import { z } from 'zod';

export const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});

export type User = z.infer<typeof userSchema>;
```

```typescript
// api.ts
import { userSchema } from './schemas/user';

export async function fetchUser(id: number) {
  const res = await fetch(`/api/users/${id}`);
  const data = await res.json();
  return userSchema.parse(data);
}
```

### 2. エラーメッセージをカスタマイズ

```typescript
const schema = z.object({
  email: z.string({ required_error: 'メールアドレスは必須です' })
    .email('有効なメールアドレスを入力してください'),
  age: z.number({ required_error: '年齢は必須です' })
    .min(18, '18歳以上である必要があります'),
});
```

### 3. 環境変数バリデーション

```typescript
// env.ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  API_KEY: z.string().min(1),
  PORT: z.string().transform((val) => parseInt(val, 10)),
});

export const env = envSchema.parse(process.env);

// 使用例
console.log(env.DATABASE_URL); // 型安全
```

## まとめ — Zodを使うべき理由

### 従来のバリデーション（型定義とバリデーションが分離）

```typescript
// 型定義
interface User {
  id: number;
  name: string;
  email: string;
}

// バリデーション（重複）
function validateUser(data: any): User {
  if (typeof data.id !== 'number') throw new Error('...');
  if (typeof data.name !== 'string') throw new Error('...');
  if (typeof data.email !== 'string') throw new Error('...');
  return data as User;
}
```

### Zodを使う場合（1箇所で完結）

```typescript
const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});

type User = z.infer<typeof userSchema>; // 型は自動推論

const user = userSchema.parse(data); // バリデーション + 型安全
```

### Zodの利点

1. **型とバリデーションの一元管理**: DRY原則
2. **型推論**: スキーマから自動で型生成
3. **ランタイム安全性**: 外部データ（API、フォーム）を確実に検証
4. **エコシステム**: react-hook-form、tRPC、Prisma等と連携
5. **開発体験**: エディタ補完が効く

### 2026年の採用状況

- **Next.js**: 公式ドキュメントでZod推奨
- **tRPC**: Zodがデフォルト
- **Remix**: Zodを使った例が多数
- **shadcn/ui**: フォームでZod使用

**結論**: TypeScriptプロジェクトで**Zodは標準ツール**。必ず習得すべきライブラリです。

---

**参考リンク**:
- [Zod公式ドキュメント](https://zod.dev/)
- [react-hook-form + Zod](https://react-hook-form.com/get-started#SchemaValidation)

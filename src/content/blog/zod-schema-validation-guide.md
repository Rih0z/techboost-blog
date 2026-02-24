---
title: 'Zod完全ガイド — TypeScript型安全バリデーション・フォーム・API・環境変数管理'
description: 'ZodでTypeScript型安全なバリデーションを完全実装する実践ガイド。スキーマ定義・変換・リファイン・react-hook-form統合・tRPC・環境変数バリデーション・カスタムエラーメッセージまで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-5.jpg'
tags: ['Zod', 'TypeScript', 'バリデーション', 'React', 'API']
---

TypeScriptプロジェクトで「実行時に型が保証されない」問題を抱えたことはないだろうか。コンパイル時にエラーが出なくても、APIレスポンスや環境変数、フォーム入力が想定外の値を持っていれば、アプリケーションは予期せぬ挙動を示す。**Zod**はその問題を根本から解決するTypeScriptファーストのスキーマバリデーションライブラリだ。

本記事では、Zodの基礎から実務レベルの応用まで、コードを中心に徹底解説する。

---

## 1. Zodとは — なぜ今Zodなのか

### Zodの特徴

Zodは2020年にColin McDonnellが公開したTypeScript専用のスキーマ定義・バリデーションライブラリだ。現在（2026年2月時点）でGitHubスター数は35,000を超え、TypeScriptエコシステムで最もよく使われるバリデーションライブラリの一つになっている。

Zodの核心的な特徴は**型推論の自動化**だ。スキーマを定義すると、そこからTypeScript型を自動的に導出できる。「型定義」と「バリデーションロジック」を二重に書く必要がない。

```typescript
import { z } from 'zod';

// スキーマを一度定義するだけ
const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});

// TypeScript型が自動的に推論される
type User = z.infer<typeof UserSchema>;
// type User = { id: number; name: string; email: string; }
```

### 他ライブラリとの比較

#### Yup

Yupは長年使われてきた実績あるバリデーションライブラリで、Formikとセットで使われることが多い。しかしTypeScriptサポートは後付けで追加されたため、型推論の精度がZodに劣る場面がある。また、非同期バリデーションを標準でサポートしているが、そのぶんバンドルサイズが大きくなりがちだ。

```typescript
// Yup の場合 — 型定義を別途書く必要がある
import * as yup from 'yup';

const schema = yup.object({
  name: yup.string().required(),
  age: yup.number().positive().integer(),
});

// 型を手動で定義しなければならない
interface User {
  name: string;
  age: number;
}
```

#### Joi

Joiはバックエンド（Node.js）寄りの設計で、詳細なバリデーションルールと豊富なオプションを持つ。ただしTypeScriptファーストではなく、型推論が弱い。フロントエンドでの使用にはバンドルサイズの面でも不利だ。

#### class-validator

NestJSと組み合わせて使われることが多い。デコレータベースのアプローチでクラスに直接バリデーションルールを書ける点は整理しやすいが、プレーンなオブジェクトには使いにくく、TypeScriptのクラスへの依存度が高い。

#### Zodが優れている点

| 特徴 | Zod | Yup | Joi | class-validator |
|------|-----|-----|-----|----------------|
| TypeScriptファースト | ◎ | △ | △ | ○ |
| 型推論の自動化 | ◎ | △ | × | △ |
| バンドルサイズ（gzip） | 約13KB | 約17KB | 約25KB | 約15KB |
| ブラウザ対応 | ◎ | ◎ | △ | ◎ |
| 変換（transform） | ◎ | ○ | ○ | △ |
| スキーマ合成 | ◎ | ○ | ○ | △ |

### インストール

```bash
npm install zod
# または
pnpm add zod
# または
bun add zod
```

Zodはゼロ依存（ランタイム依存がない）で、Node.js 12以上、またはモダンブラウザ環境で動作する。TypeScript 4.5以上を推奨する。

---

## 2. 基本型 — z.string・z.number・z.boolean・z.date

Zodのあらゆるスキーマは**プリミティブ型**から始まる。

```typescript
import { z } from 'zod';

// 文字列
const nameSchema = z.string();
nameSchema.parse('Alice');  // 'Alice'
nameSchema.parse(123);      // ZodError がスローされる

// 数値
const ageSchema = z.number();
ageSchema.parse(25);        // 25
ageSchema.parse('25');      // ZodError（文字列は数値ではない）

// ブール値
const activeSchema = z.boolean();
activeSchema.parse(true);   // true
activeSchema.parse('true'); // ZodError

// 日付
const dateSchema = z.date();
dateSchema.parse(new Date()); // Date オブジェクト
dateSchema.parse('2026-01-01'); // ZodError（文字列は Date ではない）

// null と undefined
const nullSchema = z.null();
const undefinedSchema = z.undefined();

// any と unknown
const anySchema = z.any();    // 何でも通す
const unknownSchema = z.unknown(); // 何でも通すが型は unknown
```

### parse vs safeParse

Zodのバリデーションには2つのAPIがある。

```typescript
const schema = z.string();

// parse: 失敗時に例外をスロー
try {
  const result = schema.parse(123);
} catch (error) {
  // ZodError がスローされる
  console.error(error);
}

// safeParse: 例外をスローせず結果オブジェクトを返す（推奨）
const result = schema.safeParse(123);

if (result.success) {
  console.log(result.data); // バリデーション済みの値
} else {
  console.error(result.error); // ZodError
}
```

実際の開発では `safeParse` を使うことを強く推奨する。例外処理より明示的にエラーハンドリングできるためだ。

---

## 3. 文字列バリデーション

文字列に対してZodは豊富なバリデーションメソッドを提供している。

```typescript
import { z } from 'zod';

// 基本的な文字列バリデーション
const emailSchema = z.string().email('有効なメールアドレスを入力してください');
const urlSchema = z.string().url('有効なURLを入力してください');
const uuidSchema = z.string().uuid('有効なUUIDを入力してください');

// 長さのバリデーション
const usernameSchema = z.string()
  .min(3, 'ユーザー名は3文字以上です')
  .max(20, 'ユーザー名は20文字以下です');

// 正規表現
const phoneSchema = z.string()
  .regex(/^0\d{9,10}$/, '有効な電話番号を入力してください（例: 09012345678）');

// 文字列の変換（バリデーション後に変換）
const trimmedSchema = z.string().trim(); // 前後の空白を除去
const lowerSchema = z.string().toLowerCase(); // 小文字に変換
const upperSchema = z.string().toUpperCase(); // 大文字に変換

// 文字列が空でないことを確認
const nonEmptySchema = z.string().min(1, '入力必須です');

// 特定の値のみ許可（リテラル型）
const statusSchema = z.literal('active');
const roleSchema = z.enum(['admin', 'user', 'moderator']);

// 日本語対応の複合バリデーション例
const PasswordSchema = z.string()
  .min(8, 'パスワードは8文字以上必要です')
  .max(100, 'パスワードは100文字以下にしてください')
  .regex(/[A-Z]/, '大文字を1文字以上含めてください')
  .regex(/[a-z]/, '小文字を1文字以上含めてください')
  .regex(/[0-9]/, '数字を1文字以上含めてください')
  .regex(/[!@#$%^&*]/, '記号（!@#$%^&*）を1文字以上含めてください');

// 検証
const result = PasswordSchema.safeParse('Weak1');
if (!result.success) {
  result.error.issues.forEach(issue => {
    console.log(issue.message);
    // 'パスワードは8文字以上必要です'
    // '記号（!@#$%^&*）を1文字以上含めてください'
  });
}
```

### 文字列の特殊バリデーション

```typescript
// IP アドレス
const ipSchema = z.string().ip();
const ipv4Schema = z.string().ip({ version: 'v4' });
const ipv6Schema = z.string().ip({ version: 'v6' });

// datetime（ISO 8601形式）
const datetimeSchema = z.string().datetime();
// 例: '2026-02-20T12:00:00Z'

// startsWith / endsWith
const prefixSchema = z.string().startsWith('https://');
const suffixSchema = z.string().endsWith('.jpg');

// includes
const includesSchema = z.string().includes('@');

// クレジットカード番号（カスタム正規表現）
const creditCardSchema = z.string()
  .regex(/^\d{4}-\d{4}-\d{4}-\d{4}$/, '有効なカード番号を入力してください');
```

---

## 4. 数値バリデーション

```typescript
import { z } from 'zod';

// 基本的な数値バリデーション
const priceSchema = z.number()
  .min(0, '価格は0以上である必要があります')
  .max(1000000, '価格は100万円以下にしてください');

// 整数のみ
const quantitySchema = z.number()
  .int('数量は整数で入力してください')
  .positive('数量は1以上で入力してください');

// 正の数
const positiveSchema = z.number().positive(); // 0より大きい
const nonNegativeSchema = z.number().nonnegative(); // 0以上

// 負の数
const negativeSchema = z.number().negative();
const nonPositiveSchema = z.number().nonpositive();

// 有限数（Infinity を除外）
const finiteSchema = z.number().finite();

// 小数点以下の桁数
const priceWithDecimalSchema = z.number()
  .multipleOf(0.01, '小数点以下2桁まで入力可能です');

// Bigint
const bigintSchema = z.bigint();

// NaN
const nanSchema = z.nan();

// 実践的な例: 商品価格スキーマ
const ProductPriceSchema = z.object({
  regularPrice: z.number()
    .int('通常価格は整数で入力してください')
    .min(1, '価格は1円以上です')
    .max(9999999, '価格は9,999,999円以下です'),
  salePrice: z.number()
    .int('セール価格は整数で入力してください')
    .min(0, 'セール価格は0円以上です')
    .optional(),
  taxRate: z.number()
    .min(0, '税率は0%以上です')
    .max(100, '税率は100%以下です')
    .default(10),
});

type ProductPrice = z.infer<typeof ProductPriceSchema>;
// type ProductPrice = {
//   regularPrice: number;
//   salePrice?: number | undefined;
//   taxRate: number;
// }
```

---

## 5. オブジェクトスキーマ

オブジェクトスキーマはZodで最もよく使うパターンだ。

```typescript
import { z } from 'zod';

// 基本的なオブジェクトスキーマ
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
  role: z.enum(['admin', 'user', 'guest']),
  createdAt: z.date(),
});

type User = z.infer<typeof UserSchema>;

// partial: 全フィールドをオプショナルにする
const PartialUserSchema = UserSchema.partial();
// { id?: string; name?: string; email?: string; ... }

// required: 全フィールドを必須にする（partialの逆）
const RequiredUserSchema = PartialUserSchema.required();

// 特定フィールドのみオプショナルに
const UpdateUserSchema = UserSchema.partial({
  name: true,
  age: true,
  role: true,
});
// id と email は必須、他はオプショナル

// pick: 特定フィールドのみ取り出す
const UserPreviewSchema = UserSchema.pick({
  id: true,
  name: true,
});
// { id: string; name: string }

// omit: 特定フィールドを除外する
const UserWithoutIdSchema = UserSchema.omit({
  id: true,
  createdAt: true,
});
// { name: string; email: string; age: number; role: string }

// extend: フィールドを追加する
const AdminUserSchema = UserSchema.extend({
  permissions: z.array(z.string()),
  lastLogin: z.date().nullable(),
});

// merge: 2つのスキーマをマージする
const BaseSchema = z.object({ id: z.string() });
const MetaSchema = z.object({ createdAt: z.date(), updatedAt: z.date() });
const EntitySchema = BaseSchema.merge(MetaSchema);

// ネストされたオブジェクト
const AddressSchema = z.object({
  prefecture: z.string(),
  city: z.string(),
  street: z.string(),
  zipCode: z.string().regex(/^\d{3}-\d{4}$/, '郵便番号の形式が正しくありません'),
});

const UserWithAddressSchema = z.object({
  name: z.string(),
  address: AddressSchema,
  shippingAddresses: z.array(AddressSchema).optional(),
});

// 未知のキーの扱い
const StrictSchema = z.object({ name: z.string() }).strict();
// 定義外のキーがあるとエラー

const PassthroughSchema = z.object({ name: z.string() }).passthrough();
// 定義外のキーもそのまま通す
```

---

## 6. 配列・タプル・Union・Intersection

### 配列

```typescript
import { z } from 'zod';

// 基本的な配列
const tagListSchema = z.array(z.string());
tagListSchema.parse(['TypeScript', 'Zod']); // OK

// 配列の長さバリデーション
const requiredTagsSchema = z.array(z.string())
  .min(1, '少なくとも1つのタグが必要です')
  .max(5, 'タグは5個以下にしてください');

// nonempty: 空配列を拒否（min(1)の糖衣構文）
const nonemptySchema = z.array(z.string()).nonempty('リストは空にできません');

// 複雑なオブジェクトの配列
const CartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
});

const CartSchema = z.object({
  items: z.array(CartItemSchema),
  totalAmount: z.number().nonnegative(),
});
```

### タプル

```typescript
// タプル: 固定長かつ各要素の型が異なる配列
const coordinateSchema = z.tuple([z.number(), z.number()]);
coordinateSchema.parse([35.6762, 139.6503]); // [lat, lng]

// タプルに残余要素を追加
const csvRowSchema = z.tuple([z.string(), z.number()]).rest(z.string());
// [string, number, ...string[]]
```

### Union と Discriminated Union

```typescript
// Union: どちらかの型を許可
const stringOrNumberSchema = z.union([z.string(), z.number()]);

// より読みやすい or メソッド
const stringOrNumber2 = z.string().or(z.number());

// Discriminated Union: 判別可能なユニオン（パフォーマンスが高い）
const ResponseSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('success'),
    data: z.unknown(),
  }),
  z.object({
    status: z.literal('error'),
    message: z.string(),
    code: z.number(),
  }),
]);

type Response = z.infer<typeof ResponseSchema>;
// type Response =
//   | { status: 'success'; data: unknown }
//   | { status: 'error'; message: string; code: number }

// 使用例
function handleResponse(response: unknown) {
  const result = ResponseSchema.safeParse(response);
  if (!result.success) return;

  if (result.data.status === 'success') {
    // TypeScript が data プロパティの存在を保証
    console.log(result.data.data);
  } else {
    // TypeScript が message と code の存在を保証
    console.error(`Error ${result.data.code}: ${result.data.message}`);
  }
}
```

### Intersection

```typescript
// Intersection: 両方の型の条件を満たす
const PersonSchema = z.object({ name: z.string() });
const EmployeeSchema = z.object({ companyId: z.string() });

const EmployedPersonSchema = z.intersection(PersonSchema, EmployeeSchema);
// { name: string; companyId: string }

// または and メソッド
const EmployedPerson2 = PersonSchema.and(EmployeeSchema);
```

### Record と Map

```typescript
// Record: 動的なキーを持つオブジェクト
const translationsSchema = z.record(z.string(), z.string());
// { [key: string]: string }

// 特定のキーのみ許可する Record
const localeSchema = z.record(
  z.enum(['ja', 'en', 'zh']),
  z.string()
);

// Map
const mapSchema = z.map(z.string(), z.number());

// Set
const setSchema = z.set(z.string());
```

---

## 7. 変換 — transform・preprocess・coerce

Zodはバリデーションだけでなく、データの変換も行える。

### transform

```typescript
import { z } from 'zod';

// 文字列をトリムして大文字に変換
const normalizedEmailSchema = z.string()
  .trim()
  .toLowerCase()
  .email();

// 数値を文字列に変換
const numberToStringSchema = z.number().transform(n => n.toString());
// 入力: 42 → 出力: '42'

// 日付文字列を Date オブジェクトに変換
const dateStringSchema = z.string()
  .datetime()
  .transform(str => new Date(str));
// 入力: '2026-02-20T12:00:00Z' → 出力: Date オブジェクト

// オブジェクトの変換
const UserInputSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  birthYear: z.number().int(),
}).transform(data => ({
  fullName: `${data.lastName} ${data.firstName}`,
  age: new Date().getFullYear() - data.birthYear,
}));

const result = UserInputSchema.parse({
  firstName: '太郎',
  lastName: '山田',
  birthYear: 1990,
});
// result: { fullName: '山田 太郎', age: 36 }

// transform 後の型を推論
type UserInput = z.input<typeof UserInputSchema>;
// { firstName: string; lastName: string; birthYear: number }

type UserOutput = z.output<typeof UserInputSchema>;
// { fullName: string; age: number }
```

### preprocess

`preprocess` は `parse` の前に実行される前処理だ。型変換に特に有用だ。

```typescript
// 文字列として来た数値を number に変換してからバリデーション
const coercedNumberSchema = z.preprocess(
  val => (typeof val === 'string' ? parseFloat(val) : val),
  z.number()
);
coercedNumberSchema.parse('3.14'); // 3.14（number として）

// フォーム入力（すべて文字列）を適切な型に変換
const FormDataSchema = z.object({
  name: z.string(),
  age: z.preprocess(val => parseInt(String(val), 10), z.number().int()),
  price: z.preprocess(val => parseFloat(String(val)), z.number()),
  active: z.preprocess(val => val === 'true' || val === true, z.boolean()),
});
```

### coerce

Zod v3.20以降では `z.coerce` が利用可能だ。`preprocess` より簡潔に書ける。

```typescript
// coerce は自動的に型変換を試みる
const CoercedSchema = z.object({
  age: z.coerce.number(),      // '25' → 25
  active: z.coerce.boolean(),  // 'true' → true, 0 → false
  birthDate: z.coerce.date(),  // '2000-01-01' → Date オブジェクト
  score: z.coerce.string(),    // 42 → '42'
});

// フォームデータの処理に最適
const FormSchema = z.object({
  userId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(1).max(999),
  notifyEmail: z.coerce.boolean().default(false),
});

// formData から直接バリデーション
function processFormData(formData: FormData) {
  return FormSchema.safeParse({
    userId: formData.get('userId'),
    quantity: formData.get('quantity'),
    notifyEmail: formData.get('notifyEmail'),
  });
}
```

---

## 8. リファイン — カスタムバリデーション

標準のバリデーションで表現できない複雑なロジックには `refine` と `superRefine` を使う。

### refine

```typescript
import { z } from 'zod';

// パスワード確認のバリデーション
const RegistrationSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine(
  data => data.password === data.confirmPassword,
  {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'], // エラーをこのフィールドに紐付ける
  }
);

// 日付範囲のバリデーション
const DateRangeSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
}).refine(
  data => data.endDate > data.startDate,
  {
    message: '終了日は開始日より後である必要があります',
    path: ['endDate'],
  }
);

// 非同期バリデーション（データベースチェックなど）
const UniqueEmailSchema = z.string().email().refine(
  async email => {
    // 実際にはデータベースを照会
    const existingUser = await fetchUserByEmail(email);
    return !existingUser;
  },
  { message: 'このメールアドレスはすでに登録されています' }
);

// 非同期スキーマには parseAsync / safeParseAsync を使う
const result = await UniqueEmailSchema.safeParseAsync('test@example.com');
```

### superRefine

`superRefine` はより高度なカスタムバリデーションに使う。複数のエラーを生成したり、条件によってエラーの詳細を変えたりできる。

```typescript
import { z } from 'zod';

const ProductSchema = z.object({
  type: z.enum(['physical', 'digital']),
  weight: z.number().optional(), // 物理商品のみ必須
  downloadUrl: z.string().url().optional(), // デジタル商品のみ必須
  price: z.number().positive(),
  stock: z.number().int().nonnegative().optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'physical') {
    if (data.weight === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '物理商品には重量の入力が必要です',
        path: ['weight'],
      });
    }
    if (data.stock === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '物理商品には在庫数の入力が必要です',
        path: ['stock'],
      });
    }
  }

  if (data.type === 'digital' && data.downloadUrl === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'デジタル商品にはダウンロードURLの入力が必要です',
      path: ['downloadUrl'],
    });
  }
});

// 条件付きバリデーション
const PaymentSchema = z.object({
  method: z.enum(['credit_card', 'bank_transfer', 'convenience_store']),
  cardNumber: z.string().optional(),
  cardExpiry: z.string().optional(),
  bankCode: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.method === 'credit_card') {
    if (!data.cardNumber?.match(/^\d{16}$/)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'カード番号を16桁で入力してください',
        path: ['cardNumber'],
      });
    }
    if (!data.cardExpiry?.match(/^\d{2}\/\d{2}$/)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '有効期限をMM/YY形式で入力してください',
        path: ['cardExpiry'],
      });
    }
  }

  if (data.method === 'bank_transfer' && !data.bankCode?.match(/^\d{4}$/)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '銀行コードを4桁で入力してください',
      path: ['bankCode'],
    });
  }
});
```

---

## 9. 環境変数バリデーション

環境変数の管理はNode.jsアプリケーションの弱点の一つだ。`process.env` はすべて `string | undefined` 型であり、型安全ではない。Zodを使えばこの問題を根本から解決できる。

```typescript
// env.ts
import { z } from 'zod';

const EnvSchema = z.object({
  // Node.js環境
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1024).max(65535).default(3000),

  // データベース
  DATABASE_URL: z.string().url('DATABASE_URL は有効なURLである必要があります'),
  DATABASE_POOL_MIN: z.coerce.number().int().min(1).default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).default(10),

  // 認証
  JWT_SECRET: z.string().min(32, 'JWT_SECRET は32文字以上である必要があります'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // 外部API
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),

  // メール
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().email().optional(),
  SMTP_PASSWORD: z.string().optional(),

  // ストレージ
  AWS_BUCKET_NAME: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
});

// バリデーション実行
const envResult = EnvSchema.safeParse(process.env);

if (!envResult.success) {
  console.error('環境変数の設定に誤りがあります:');
  console.error(envResult.error.format());
  process.exit(1); // 起動を中断
}

export const env = envResult.data;
// env.PORT は number 型（string ではない！）
// env.NODE_ENV は 'development' | 'test' | 'production' 型

// 使用例
import { env } from './env';
const server = app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});
```

### Next.js での環境変数バリデーション

```typescript
// src/env.mjs（Next.js App Router）
import { z } from 'zod';

const serverSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url(),
  OPENAI_API_KEY: z.string().startsWith('sk-'),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_ANALYTICS_ID: z.string().optional(),
});

const serverEnv = serverSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
});

const clientEnv = clientSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_ANALYTICS_ID: process.env.NEXT_PUBLIC_ANALYTICS_ID,
});

if (!serverEnv.success) {
  console.error('サーバー環境変数エラー:', serverEnv.error.format());
  throw new Error('サーバー環境変数の設定が不正です');
}

if (!clientEnv.success) {
  console.error('クライアント環境変数エラー:', clientEnv.error.format());
  throw new Error('クライアント環境変数の設定が不正です');
}

export const serverConfig = serverEnv.data;
export const clientConfig = clientEnv.data;
```

---

## 10. react-hook-form統合

react-hook-formとZodを組み合わせるパターンは、現代のReactフォーム開発のデファクトスタンダードだ。

```bash
npm install react-hook-form @hookform/resolvers
```

```typescript
// components/RegistrationForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// フォームスキーマを定義
const RegistrationFormSchema = z.object({
  username: z.string()
    .min(3, 'ユーザー名は3文字以上です')
    .max(20, 'ユーザー名は20文字以下です')
    .regex(/^[a-zA-Z0-9_]+$/, '英数字とアンダースコアのみ使用可能です'),
  email: z.string()
    .email('有効なメールアドレスを入力してください'),
  password: z.string()
    .min(8, 'パスワードは8文字以上です')
    .regex(/[A-Z]/, '大文字を含めてください')
    .regex(/[0-9]/, '数字を含めてください'),
  confirmPassword: z.string(),
  agreeToTerms: z.boolean().refine(val => val === true, {
    message: '利用規約への同意が必要です',
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: 'パスワードが一致しません',
  path: ['confirmPassword'],
});

// フォームの型を自動推論
type RegistrationFormData = z.infer<typeof RegistrationFormSchema>;

export function RegistrationForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(RegistrationFormSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false,
    },
  });

  const onSubmit = async (data: RegistrationFormData) => {
    // data は RegistrationFormData 型として型安全
    try {
      await registerUser(data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="username">ユーザー名</label>
        <input id="username" {...register('username')} />
        {errors.username && (
          <p role="alert">{errors.username.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="email">メールアドレス</label>
        <input id="email" type="email" {...register('email')} />
        {errors.email && (
          <p role="alert">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password">パスワード</label>
        <input id="password" type="password" {...register('password')} />
        {errors.password && (
          <p role="alert">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword">パスワード（確認）</label>
        <input id="confirmPassword" type="password" {...register('confirmPassword')} />
        {errors.confirmPassword && (
          <p role="alert">{errors.confirmPassword.message}</p>
        )}
      </div>

      <div>
        <input id="agreeToTerms" type="checkbox" {...register('agreeToTerms')} />
        <label htmlFor="agreeToTerms">利用規約に同意する</label>
        {errors.agreeToTerms && (
          <p role="alert">{errors.agreeToTerms.message}</p>
        )}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '登録中...' : '登録する'}
      </button>
    </form>
  );
}
```

### ステップフォームでのZod活用

```typescript
// 複数ステップのフォームでスキーマを分割して再利用
const Step1Schema = z.object({
  firstName: z.string().min(1, '名前を入力してください'),
  lastName: z.string().min(1, '苗字を入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください'),
});

const Step2Schema = z.object({
  phone: z.string().regex(/^0\d{9,10}$/, '有効な電話番号を入力してください'),
  prefecture: z.string().min(1, '都道府県を選択してください'),
  city: z.string().min(1, '市区町村を入力してください'),
  address: z.string().min(1, '住所を入力してください'),
});

const Step3Schema = z.object({
  cardNumber: z.string().regex(/^\d{16}$/, 'カード番号を16桁で入力してください'),
  cardExpiry: z.string().regex(/^\d{2}\/\d{2}$/, '有効期限をMM/YY形式で入力してください'),
  cardCvv: z.string().regex(/^\d{3,4}$/, 'セキュリティコードを入力してください'),
});

// 全ステップを結合した最終スキーマ
const CompleteOrderSchema = Step1Schema.merge(Step2Schema).merge(Step3Schema);
type CompleteOrder = z.infer<typeof CompleteOrderSchema>;

// 各ステップで該当スキーマを使用
function Step1Form() {
  const form = useForm<z.infer<typeof Step1Schema>>({
    resolver: zodResolver(Step1Schema),
  });
  // ...
}
```

---

## 11. APIレスポンスバリデーション

外部APIのレスポンスは型安全でないため、Zodで検証することが重要だ。

```typescript
import { z } from 'zod';

// GitHub API レスポンス用スキーマ
const GitHubUserSchema = z.object({
  id: z.number(),
  login: z.string(),
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  avatar_url: z.string().url(),
  public_repos: z.number().int().nonnegative(),
  followers: z.number().int().nonnegative(),
  following: z.number().int().nonnegative(),
  created_at: z.string().datetime(),
});

type GitHubUser = z.infer<typeof GitHubUserSchema>;

// 型安全な fetch ラッパー
async function fetchWithSchema<T>(
  url: string,
  schema: z.ZodSchema<T>,
  options?: RequestInit
): Promise<{ data: T; error: null } | { data: null; error: string }> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      return {
        data: null,
        error: `HTTP Error: ${response.status} ${response.statusText}`,
      };
    }

    const json = await response.json();
    const result = schema.safeParse(json);

    if (!result.success) {
      console.error('API レスポンスバリデーションエラー:', result.error.format());
      return {
        data: null,
        error: 'APIレスポンスの形式が予期したものと異なります',
      };
    }

    return { data: result.data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : '不明なエラーが発生しました',
    };
  }
}

// 使用例
async function getGitHubUser(username: string): Promise<GitHubUser | null> {
  const { data, error } = await fetchWithSchema(
    `https://api.github.com/users/${username}`,
    GitHubUserSchema
  );

  if (error) {
    console.error(`ユーザー情報の取得に失敗: ${error}`);
    return null;
  }

  return data; // GitHubUser 型として型安全
}
```

### ページネーション付きAPIレスポンス

```typescript
// 汎用的なページネーションレスポンス型
function createPaginatedResponse<T>(itemSchema: z.ZodSchema<T>) {
  return z.object({
    items: z.array(itemSchema),
    pagination: z.object({
      page: z.number().int().positive(),
      perPage: z.number().int().positive(),
      totalItems: z.number().int().nonnegative(),
      totalPages: z.number().int().nonnegative(),
      hasNextPage: z.boolean(),
      hasPrevPage: z.boolean(),
    }),
  });
}

const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  price: z.number().positive(),
  inStock: z.boolean(),
});

const ProductListResponseSchema = createPaginatedResponse(ProductSchema);
type ProductListResponse = z.infer<typeof ProductListResponseSchema>;

// tRPC との統合
import { initTRPC } from '@trpc/server';

const t = initTRPC.create();

const productRouter = t.router({
  list: t.procedure
    .input(z.object({
      page: z.number().int().positive().default(1),
      perPage: z.number().int().min(1).max(100).default(20),
      search: z.string().optional(),
      category: z.string().optional(),
      sortBy: z.enum(['price', 'name', 'createdAt']).default('createdAt'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }))
    .query(async ({ input }) => {
      // input は型安全
      const products = await db.product.findMany({
        where: {
          name: input.search ? { contains: input.search } : undefined,
          category: input.category,
        },
        orderBy: { [input.sortBy]: input.sortOrder },
        skip: (input.page - 1) * input.perPage,
        take: input.perPage,
      });
      return products;
    }),

  create: t.procedure
    .input(z.object({
      name: z.string().min(1).max(100),
      price: z.number().positive(),
      description: z.string().max(1000).optional(),
      categoryId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      return await db.product.create({ data: input });
    }),
});
```

---

## 12. エラーハンドリング

ZodのエラーはZodErrorクラスとして表現され、複数のバリデーションエラーを含む場合がある。

```typescript
import { z, ZodError } from 'zod';

const UserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().int().min(0),
});

const invalidData = {
  name: '',
  email: 'not-an-email',
  age: -1,
};

const result = UserSchema.safeParse(invalidData);

if (!result.success) {
  const error = result.error;

  // issues: 全バリデーションエラーの配列
  error.issues.forEach(issue => {
    console.log({
      path: issue.path,    // ['name'] など
      message: issue.message,
      code: issue.code,    // 'too_small', 'invalid_string' など
    });
  });

  // format: ネストされたエラーオブジェクト（フォームUIに便利）
  const formatted = error.format();
  // {
  //   _errors: [],
  //   name: { _errors: ['String must contain at least 1 character(s)'] },
  //   email: { _errors: ['Invalid email'] },
  //   age: { _errors: ['Number must be greater than or equal to 0'] },
  // }

  // flatten: フラットな構造（APIレスポンスに便利）
  const flattened = error.flatten();
  // {
  //   formErrors: [],
  //   fieldErrors: {
  //     name: ['String must contain at least 1 character(s)'],
  //     email: ['Invalid email'],
  //     age: ['Number must be greater than or equal to 0'],
  //   },
  // }

  // 特定フィールドのエラーメッセージを取得
  const nameErrors = flattened.fieldErrors.name ?? [];
  console.log(nameErrors[0]); // 'String must contain at least 1 character(s)'
}
```

### エラーをAPIレスポンスとして返す

```typescript
// Express / Hono でのエラーレスポンス例
import { z, ZodError } from 'zod';

function formatZodError(error: ZodError) {
  return {
    success: false,
    errors: error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    })),
  };
}

// Hono ルートハンドラーの例
app.post('/api/users', async (c) => {
  const body = await c.req.json();
  const result = UserSchema.safeParse(body);

  if (!result.success) {
    return c.json(formatZodError(result.error), 400);
  }

  // result.data は UserSchema の型として型安全
  const user = await createUser(result.data);
  return c.json({ success: true, data: user }, 201);
});
```

---

## 13. カスタムエラーメッセージ（日本語化・i18n）

Zodはデフォルトで英語のエラーメッセージを返す。日本語化するには2つのアプローチがある。

### アプローチ1: 各スキーマにメッセージを直接指定

```typescript
import { z } from 'zod';

const JapaneseUserSchema = z.object({
  name: z.string({
    required_error: '名前は必須項目です',
    invalid_type_error: '名前は文字列で入力してください',
  }).min(1, '名前を入力してください').max(50, '名前は50文字以下で入力してください'),

  email: z.string({
    required_error: 'メールアドレスは必須項目です',
  }).email('有効なメールアドレスを入力してください'),

  age: z.number({
    required_error: '年齢は必須項目です',
    invalid_type_error: '年齢は数値で入力してください',
  }).int('年齢は整数で入力してください')
    .min(0, '年齢は0以上で入力してください')
    .max(150, '年齢は150以下で入力してください'),
});
```

### アプローチ2: グローバルなエラーマップで日本語化

```typescript
// lib/zod-locale.ts
import { z } from 'zod';

// カスタムエラーマップ（日本語）
const japaneseErrorMap: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === 'undefined') {
        return { message: 'この項目は必須です' };
      }
      return {
        message: `${issue.expected}型を期待しましたが、${issue.received}型が入力されました`,
      };

    case z.ZodIssueCode.invalid_string:
      if (issue.validation === 'email') {
        return { message: '有効なメールアドレスを入力してください' };
      }
      if (issue.validation === 'url') {
        return { message: '有効なURLを入力してください（https://で始まるURL）' };
      }
      if (issue.validation === 'uuid') {
        return { message: '有効なUUIDを入力してください' };
      }
      if (issue.validation === 'regex') {
        return { message: '入力形式が正しくありません' };
      }
      return { message: '文字列の形式が正しくありません' };

    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') {
        if (issue.minimum === 1) {
          return { message: 'この項目は必須です' };
        }
        return { message: `${issue.minimum}文字以上で入力してください` };
      }
      if (issue.type === 'number') {
        return { message: `${issue.minimum}以上の値を入力してください` };
      }
      if (issue.type === 'array') {
        return { message: `${issue.minimum}件以上入力してください` };
      }
      return { message: ctx.defaultError };

    case z.ZodIssueCode.too_big:
      if (issue.type === 'string') {
        return { message: `${issue.maximum}文字以下で入力してください` };
      }
      if (issue.type === 'number') {
        return { message: `${issue.maximum}以下の値を入力してください` };
      }
      if (issue.type === 'array') {
        return { message: `${issue.maximum}件以下にしてください` };
      }
      return { message: ctx.defaultError };

    case z.ZodIssueCode.invalid_enum_value:
      return {
        message: `有効な選択肢: ${issue.options.join(', ')}`,
      };

    case z.ZodIssueCode.not_finite:
      return { message: '有限の数値を入力してください' };

    case z.ZodIssueCode.not_multiple_of:
      return { message: `${issue.multipleOf}の倍数を入力してください` };

    default:
      return { message: ctx.defaultError };
  }
};

// グローバルに設定
z.setErrorMap(japaneseErrorMap);

// これ以降、全てのZodスキーマで日本語エラーメッセージが使われる
export { z };
```

```typescript
// アプリケーションのエントリーポイントでインポート
// main.ts または _app.tsx など
import './lib/zod-locale';

// 以降は日本語メッセージが自動的に使われる
const schema = z.string().email();
const result = schema.safeParse('invalid');
// result.error.issues[0].message === '有効なメールアドレスを入力してください'
```

### i18n対応の動的エラーマップ

```typescript
// lib/zod-i18n.ts
import { z } from 'zod';

type Locale = 'ja' | 'en' | 'zh';

const messages: Record<Locale, Partial<Record<z.ZodIssueCode, string>>> = {
  ja: {
    [z.ZodIssueCode.invalid_type]: '入力形式が正しくありません',
    [z.ZodIssueCode.too_small]: '値が小さすぎます',
    [z.ZodIssueCode.too_big]: '値が大きすぎます',
  },
  en: {
    [z.ZodIssueCode.invalid_type]: 'Invalid type',
    [z.ZodIssueCode.too_small]: 'Value is too small',
    [z.ZodIssueCode.too_big]: 'Value is too large',
  },
  zh: {
    [z.ZodIssueCode.invalid_type]: '输入格式不正确',
    [z.ZodIssueCode.too_small]: '值太小',
    [z.ZodIssueCode.too_big]: '值太大',
  },
};

export function setZodLocale(locale: Locale) {
  z.setErrorMap((issue, ctx) => {
    const localeMessages = messages[locale];
    const message = localeMessages[issue.code];
    return { message: message ?? ctx.defaultError };
  });
}

// 使用例
setZodLocale('ja');
```

---

## 14. 実践的なパターン集

### スキーマの合成・再利用

```typescript
import { z } from 'zod';

// 共通フィールドを定義
const TimestampMixin = z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
});

const SoftDeleteMixin = z.object({
  deletedAt: z.date().nullable(),
});

const BaseEntitySchema = z.object({
  id: z.string().uuid(),
}).merge(TimestampMixin).merge(SoftDeleteMixin);

// 各エンティティに適用
const UserSchema = BaseEntitySchema.extend({
  name: z.string(),
  email: z.string().email(),
});

const ProductSchema = BaseEntitySchema.extend({
  name: z.string(),
  price: z.number().positive(),
  sku: z.string(),
});
```

### バリデーション結果を型ガードとして使う

```typescript
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(['admin', 'user']),
});

type User = z.infer<typeof UserSchema>;

// 型ガード関数
function isUser(value: unknown): value is User {
  return UserSchema.safeParse(value).success;
}

// 使用例
function processUser(data: unknown) {
  if (!isUser(data)) {
    throw new Error('無効なユーザーデータです');
  }
  // data は User 型として型安全
  console.log(data.name);
}
```

### Zodスキーマをミドルウェアとして使う（Express）

```typescript
import express from 'express';
import { z, ZodSchema } from 'zod';

// バリデーションミドルウェアファクトリー
function validate<T>(schema: ZodSchema<T>) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten().fieldErrors,
      });
    }
    // バリデーション済みデータを req に追加
    (req as any).validatedBody = result.data;
    next();
  };
}

// ルートで使用
const CreateUserSchema = z.object({
  name: z.string().min(1).max(50),
  email: z.string().email(),
  password: z.string().min(8),
});

app.post('/users', validate(CreateUserSchema), async (req, res) => {
  const userData = (req as any).validatedBody; // バリデーション済み
  // ...
});
```

---

## DevToolBoxでZodスキーマを補完する

Zodでバリデーションを実装する際、スキーマ設計の段階でJSONデータの構造を素早く確認したい場面は多い。外部APIのレスポンスJSONを解析してスキーマのベースを作ったり、複雑なネストを視覚的に整理したりする作業だ。

**[DevToolBox](https://usedevtools.com/)** には、JSON Formatter / Validator、JSON to TypeScript型変換、JWT Decoder、Base64エンコード/デコードなど、Zod実装を支える多数のツールが揃っている。外部APIのレスポンスをDevToolBoxのJSONフォーマッターで整形・確認しながら、それに対応するZodスキーマを設計するワークフローは非常にスムーズだ。

たとえばJSONをコピーしてDevToolBoxに貼り付けると構造が即座にビジュアル化され、どのフィールドがnullableか、どのフィールドが必須かを見極めやすくなる。Zodスキーマとデータの整合性確認にぜひ活用してほしい。

---

## まとめ

Zodはただのバリデーションライブラリではなく、TypeScriptプロジェクト全体の型安全性を底上げするインフラだ。

本記事で扱ったパターンを振り返ると:

- **基本型から始まるスキーマ設計**: string・number・boolean・dateをチェーンで組み合わせ、複雑なバリデーションを宣言的に表現できる
- **オブジェクトスキーマの柔軟な操作**: partial・pick・omit・extend・mergeで既存スキーマを再利用しながら派生させられる
- **変換パイプライン**: transform・preprocess・coerceでフォームデータや外部APIのレスポンスを適切な型に変換できる
- **カスタムバリデーション**: refine・superRefineでビジネスロジックをスキーマに組み込める
- **環境変数管理**: 起動時にprocess.envをバリデーションして、型安全なconfigオブジェクトを生成できる
- **react-hook-form統合**: zodResolverでフォームライブラリと密接に連携できる
- **APIバリデーション**: fetchレスポンスをスキーマで検証して、実行時の型安全性を保証できる

Zodを導入することで「型はコンパイル時にしか機能しない」という限界を超え、実行時にも型安全なアプリケーションを構築できるようになる。まず環境変数バリデーションから始め、次にAPIレスポンス、そしてフォームと、段階的に導入するのが現実的なアプローチだ。

---

## 参考リンク

- [Zod 公式ドキュメント](https://zod.dev/)
- [Zod GitHub リポジトリ](https://github.com/colinhacks/zod)
- [react-hook-form + Zod の公式ガイド](https://react-hook-form.com/get-started#SchemaValidation)
- [tRPC 公式ドキュメント](https://trpc.io/docs)
- [DevToolBox — 開発者向けツール集](https://usedevtools.com/)

---
title: "Effect Schema バリデーション実践ガイド - 型安全なデータ検証"
description: "@effect/schemaの基本的な使い方、スキーマ定義とバリデーション、パース・エンコード・デコード、Zodとの比較、実践的なAPI入力検証の例を詳しく解説します。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。"
pubDate: "2025-02-05"
tags: ['プログラミング', '開発ツール']
---
`@effect/schema`は、Effect-TSエコシステムの一部として提供される強力なバリデーションライブラリです。型安全性と実行時検証を統合し、Zodよりも高度な機能を提供します。

## Effect Schemaとは

Effect Schemaは、スキーマ定義から型推論、バリデーション、変換まで一貫して行える総合的なソリューションです。

### 主な特徴

- **完全な型安全性**: スキーマから自動的にTypeScript型を生成
- **双方向変換**: エンコード・デコード両方をサポート
- **豊富な組み込み型**: プリミティブから複雑な型まで
- **カスタムバリデーション**: 独自のバリデーションルールを定義可能
- **Effect統合**: Effect-TSとシームレスに連携
- **優れたエラーメッセージ**: 詳細で理解しやすいエラー

## セットアップ

```bash
# Effect Schemaとコア依存関係をインストール
npm install effect @effect/schema

# または pnpm
pnpm add effect @effect/schema
```

## 基本的な使い方

### スキーマ定義

```typescript
import * as S from "@effect/schema/Schema";

// プリミティブ型
const StringSchema = S.String;
const NumberSchema = S.Number;
const BooleanSchema = S.Boolean;

// オブジェクトスキーマ
const UserSchema = S.Struct({
  id: S.Number,
  name: S.String,
  email: S.String,
  age: S.Number,
  isActive: S.Boolean,
});

// 型推論
type User = S.Schema.Type<typeof UserSchema>;
// type User = {
//   id: number;
//   name: string;
//   email: string;
//   age: number;
//   isActive: boolean;
// }
```

### パース（バリデーション）

```typescript
import * as S from "@effect/schema/Schema";
import { Either } from "effect";

const UserSchema = S.Struct({
  id: S.Number,
  name: S.String,
  email: S.String,
});

// デコード（外部データ → 内部型）
const parseUser = S.decodeUnknownEither(UserSchema);

// 成功例
const validData = {
  id: 1,
  name: "Alice",
  email: "alice@example.com",
};

const result1 = parseUser(validData);
if (Either.isRight(result1)) {
  console.log("Valid user:", result1.right);
  // { id: 1, name: "Alice", email: "alice@example.com" }
}

// 失敗例
const invalidData = {
  id: "not-a-number",
  name: "Bob",
};

const result2 = parseUser(invalidData);
if (Either.isLeft(result2)) {
  console.error("Validation error:", result2.left);
}
```

### Promiseベースのパース

```typescript
import * as S from "@effect/schema/Schema";

const UserSchema = S.Struct({
  id: S.Number,
  name: S.String,
});

const parseUser = S.decodeUnknownPromise(UserSchema);

try {
  const user = await parseUser({ id: 1, name: "Alice" });
  console.log(user);
} catch (error) {
  console.error("Validation failed:", error);
}
```

## 高度なスキーマ定義

### バリデーションルール

```typescript
import * as S from "@effect/schema/Schema";

const EmailSchema = S.String.pipe(
  S.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
    message: () => "Invalid email format"
  })
);

const PositiveIntSchema = S.Number.pipe(
  S.int({ message: () => "Must be an integer" }),
  S.positive({ message: () => "Must be positive" })
);

const AgeSchema = S.Number.pipe(
  S.int(),
  S.between(0, 150, {
    message: () => "Age must be between 0 and 150"
  })
);

const UserSchema = S.Struct({
  name: S.String.pipe(
    S.minLength(1, { message: () => "Name is required" }),
    S.maxLength(100, { message: () => "Name too long" })
  ),
  email: EmailSchema,
  age: AgeSchema,
});
```

### オプショナルとデフォルト値

```typescript
import * as S from "@effect/schema/Schema";

const ConfigSchema = S.Struct({
  host: S.String,
  port: S.Number,
  // オプショナルフィールド
  timeout: S.optional(S.Number),
  // デフォルト値付き
  retries: S.Number.pipe(S.propertySignature, S.withDefault(() => 3)),
  debug: S.Boolean.pipe(S.propertySignature, S.withDefault(() => false)),
});

type Config = S.Schema.Type<typeof ConfigSchema>;
// type Config = {
//   host: string;
//   port: number;
//   timeout?: number;
//   retries: number;  // デフォルト: 3
//   debug: boolean;   // デフォルト: false
// }

const config = S.decodeUnknownSync(ConfigSchema)({
  host: "localhost",
  port: 3000,
});
// { host: "localhost", port: 3000, retries: 3, debug: false }
```

### ユニオン型とリテラル

```typescript
import * as S from "@effect/schema/Schema";

// リテラル型
const StatusSchema = S.Literal("pending", "approved", "rejected");

// タグ付きユニオン
const ShapeSchema = S.Union(
  S.Struct({
    kind: S.Literal("circle"),
    radius: S.Number,
  }),
  S.Struct({
    kind: S.Literal("rectangle"),
    width: S.Number,
    height: S.Number,
  }),
  S.Struct({
    kind: S.Literal("triangle"),
    base: S.Number,
    height: S.Number,
  })
);

type Shape = S.Schema.Type<typeof ShapeSchema>;
// type Shape =
//   | { kind: "circle"; radius: number }
//   | { kind: "rectangle"; width: number; height: number }
//   | { kind: "triangle"; base: number; height: number }
```

### 配列とレコード

```typescript
import * as S from "@effect/schema/Schema";

// 配列
const NumberArraySchema = S.Array(S.Number);
const UserArraySchema = S.Array(UserSchema);

// 最小・最大長の制約
const TagsSchema = S.Array(S.String).pipe(
  S.minItems(1, { message: () => "At least one tag required" }),
  S.maxItems(5, { message: () => "Maximum 5 tags allowed" })
);

// Record（オブジェクト型）
const DictionarySchema = S.Record(S.String, S.Number);
// { [key: string]: number }

// より複雑なRecord
const UserMapSchema = S.Record(S.String, UserSchema);
// { [key: string]: User }
```

## エンコードとデコード

Effect Schemaは双方向の変換をサポートします。

### 基本的な変換

```typescript
import * as S from "@effect/schema/Schema";

// DateをISO文字列に変換
const DateFromString = S.DateFromString;

const EventSchema = S.Struct({
  id: S.Number,
  title: S.String,
  createdAt: DateFromString,  // string → Date
});

// デコード: 外部データ（JSON） → 内部型
const decodeEvent = S.decodeUnknownSync(EventSchema);

const event = decodeEvent({
  id: 1,
  title: "Meeting",
  createdAt: "2025-02-05T10:00:00Z",  // string
});
// { id: 1, title: "Meeting", createdAt: Date(2025-02-05T10:00:00Z) }

// エンコード: 内部型 → 外部データ（JSON）
const encodeEvent = S.encodeSync(EventSchema);

const json = encodeEvent({
  id: 1,
  title: "Meeting",
  createdAt: new Date("2025-02-05T10:00:00Z"),
});
// { id: 1, title: "Meeting", createdAt: "2025-02-05T10:00:00Z" }
```

### カスタム変換

```typescript
import * as S from "@effect/schema/Schema";

// 小文字に正規化
const LowercaseString = S.transform(
  S.String,
  S.String,
  {
    decode: (s) => s.toLowerCase(),
    encode: (s) => s,
  }
);

// カンマ区切り文字列 → 配列
const CsvToArray = S.transform(
  S.String,
  S.Array(S.String),
  {
    decode: (s) => s.split(",").map(item => item.trim()),
    encode: (arr) => arr.join(", "),
  }
);

const decode = S.decodeUnknownSync(CsvToArray);
console.log(decode("apple, banana, cherry"));
// ["apple", "banana", "cherry"]

const encode = S.encodeSync(CsvToArray);
console.log(encode(["apple", "banana", "cherry"]));
// "apple, banana, cherry"
```

## 実践例

### API入力検証

```typescript
import * as S from "@effect/schema/Schema";
import { Effect } from "effect";

// リクエストスキーマ
const CreateUserRequestSchema = S.Struct({
  name: S.String.pipe(
    S.minLength(1),
    S.maxLength(100)
  ),
  email: S.String.pipe(
    S.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  ),
  age: S.Number.pipe(
    S.int(),
    S.between(18, 120)
  ),
  role: S.Literal("user", "admin", "moderator"),
});

type CreateUserRequest = S.Schema.Type<typeof CreateUserRequestSchema>;

// APIハンドラー
async function createUser(req: Request) {
  const body = await req.json();

  const parseRequest = S.decodeUnknownEither(CreateUserRequestSchema);
  const result = parseRequest(body);

  if (Either.isLeft(result)) {
    return new Response(
      JSON.stringify({
        error: "Validation failed",
        details: formatErrors(result.left),
      }),
      { status: 400 }
    );
  }

  const validData = result.right;

  // データベースに保存
  const user = await db.users.create(validData);

  return new Response(JSON.stringify(user), { status: 201 });
}
```

### フォームバリデーション

```typescript
import * as S from "@effect/schema/Schema";

const SignupFormSchema = S.Struct({
  username: S.String.pipe(
    S.minLength(3, { message: () => "Username must be at least 3 characters" }),
    S.maxLength(20, { message: () => "Username must be at most 20 characters" }),
    S.pattern(/^[a-zA-Z0-9_]+$/, {
      message: () => "Username can only contain letters, numbers, and underscores"
    })
  ),
  email: S.String.pipe(
    S.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
      message: () => "Invalid email address"
    })
  ),
  password: S.String.pipe(
    S.minLength(8, { message: () => "Password must be at least 8 characters" }),
    S.pattern(/[A-Z]/, { message: () => "Password must contain an uppercase letter" }),
    S.pattern(/[a-z]/, { message: () => "Password must contain a lowercase letter" }),
    S.pattern(/[0-9]/, { message: () => "Password must contain a number" })
  ),
  confirmPassword: S.String,
}).pipe(
  // パスワード一致チェック
  S.filter((data) => data.password === data.confirmPassword, {
    message: () => ({ path: ["confirmPassword"], message: "Passwords do not match" })
  })
);

function validateSignupForm(formData: unknown) {
  const parse = S.decodeUnknownEither(SignupFormSchema);
  return parse(formData);
}
```

### 環境変数バリデーション

```typescript
import * as S from "@effect/schema/Schema";

const EnvSchema = S.Struct({
  NODE_ENV: S.Literal("development", "production", "test"),
  PORT: S.NumberFromString.pipe(
    S.int(),
    S.between(1, 65535)
  ),
  DATABASE_URL: S.String.pipe(
    S.pattern(/^postgres:\/\//)
  ),
  REDIS_URL: S.optional(S.String),
  LOG_LEVEL: S.Literal("debug", "info", "warn", "error").pipe(
    S.propertySignature,
    S.withDefault(() => "info" as const)
  ),
});

type Env = S.Schema.Type<typeof EnvSchema>;

function loadEnv(): Env {
  const parse = S.decodeUnknownSync(EnvSchema);

  try {
    return parse(process.env);
  } catch (error) {
    console.error("Invalid environment variables:", error);
    process.exit(1);
  }
}

export const env = loadEnv();
```

## Zodとの比較

### 類似点

- スキーマベースのバリデーション
- TypeScript型推論
- 豊富な組み込み型
- カスタムバリデーション

### Effect Schemaの利点

```typescript
// Zod
const zodSchema = z.object({
  createdAt: z.string().transform((s) => new Date(s)),
});

// Effect Schema - 双方向変換が簡単
const effectSchema = S.Struct({
  createdAt: S.DateFromString,  // エンコード・デコード両対応
});
```

| 機能 | Zod | Effect Schema |
|------|-----|---------------|
| **双方向変換** | 限定的 | 完全サポート |
| **Effect統合** | なし | ネイティブ |
| **エラー型** | ZodError | ParseError（型安全） |
| **パフォーマンス** | 高速 | やや遅い（高機能） |
| **学習曲線** | 緩やか | やや急 |

## エラーハンドリング

```typescript
import * as S from "@effect/schema/Schema";
import { Either, ParseResult } from "effect";

function formatErrors(error: ParseResult.ParseError): string[] {
  return ParseResult.ArrayFormatter.formatError(error).map(
    (err) => `${err.path.join(".")}: ${err.message}`
  );
}

const result = S.decodeUnknownEither(UserSchema)(invalidData);

if (Either.isLeft(result)) {
  const errors = formatErrors(result.left);
  console.error("Validation errors:");
  errors.forEach((err) => console.error(`  - ${err}`));
}
```

## まとめ

Effect Schemaは以下のケースで特に有用です。

### 適用領域

- **API開発**: リクエスト・レスポンスの厳密な検証
- **設定管理**: 環境変数や設定ファイルの型安全な読み込み
- **データ変換**: 外部データと内部表現の相互変換
- **Effect-TSアプリ**: Effectエコシステムとの統合

### 推奨用途

1. **双方向変換が必要**: JSON ⇄ 内部型の変換
2. **複雑なバリデーション**: 多段階の検証ロジック
3. **Effect-TS利用時**: ネイティブ統合の恩恵
4. **厳密な型安全性**: コンパイル時 + 実行時の両方で保証

Effect Schemaは、型安全性とバリデーションの両方を高いレベルで実現する強力なツールです。

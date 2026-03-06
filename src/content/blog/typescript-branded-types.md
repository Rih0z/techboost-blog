---
title: 'TypeScriptブランド型実践: 型安全なドメインモデリング'
description: 'TypeScriptのブランド型(Branded Types)を使った型安全なドメインモデリング手法を解説。プリミティブ型の誤用を防ぎ、ドメインロジックを型レベルで表現するテクニックを実践的に紹介します。具体的なコード例とともに詳しく紹介します。'
pubDate: 2025-09-22
updatedDate: 2025-09-22
tags: ['typescript', 'type-safety', 'domain-modeling', 'advanced-types', 'Design Patterns']
category: 'programming'
---
## ブランド型(Branded Types)とは

ブランド型は、プリミティブ型に「ブランド」という見えないマーカーを付けることで、同じ基底型でも異なる型として扱えるようにするTypeScriptのテクニックです。

### なぜブランド型が必要か

```typescript
// ❌ 問題: すべてstringで型安全性がない
type UserId = string;
type Email = string;
type OrderId = string;

function sendEmail(email: Email, userId: UserId) {
  console.log(`Sending to ${email} for user ${userId}`);
}

const userId: UserId = "user-123";
const email: Email = "user@example.com";

// バグ: 引数の順序を間違えてもコンパイルエラーにならない
sendEmail(userId, email); // 実行時エラーの原因
```

```typescript
// ✅ 解決: ブランド型で型レベルで区別
type Brand<K, T> = K & { __brand: T };

type UserId = Brand<string, 'UserId'>;
type Email = Brand<string, 'Email'>;
type OrderId = Brand<string, 'OrderId'>;

function sendEmail(email: Email, userId: UserId) {
  console.log(`Sending to ${email} for user ${userId}`);
}

const userId = "user-123" as UserId;
const email = "user@example.com" as Email;

sendEmail(userId, email); // ❌ コンパイルエラー!
sendEmail(email, userId); // ✅ OK
```

## 基本的な実装パターン

### 1. シンプルなブランド型

```typescript
// ブランド型の基本定義
type Brand<K, T> = K & { readonly __brand: T };

// 使用例
type UserId = Brand<string, 'UserId'>;
type ProductId = Brand<number, 'ProductId'>;
type Timestamp = Brand<number, 'Timestamp'>;

// コンストラクタ関数
function UserId(value: string): UserId {
  return value as UserId;
}

function ProductId(value: number): ProductId {
  if (value <= 0) {
    throw new Error('ProductId must be positive');
  }
  return value as ProductId;
}

function Timestamp(value: number = Date.now()): Timestamp {
  return value as Timestamp;
}

// 使用
const userId = UserId("user-123");
const productId = ProductId(42);
const timestamp = Timestamp();
```

### 2. バリデーション付きブランド型

```typescript
type Email = Brand<string, 'Email'>;

function Email(value: string): Email {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(value)) {
    throw new Error(`Invalid email: ${value}`);
  }

  return value as Email;
}

// より安全なResult型を返すパターン
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function parseEmail(value: string): Result<Email> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(value)) {
    return { ok: false, error: new Error(`Invalid email: ${value}`) };
  }

  return { ok: true, value: value as Email };
}

// 使用
const result = parseEmail("user@example.com");
if (result.ok) {
  const email: Email = result.value;
  console.log(email);
}
```

### 3. 複数のブランドを持つ型

```typescript
type ValidatedEmail = Brand<string, 'Email'> & Brand<string, 'Validated'>;
type UnvalidatedEmail = Brand<string, 'Email'>;

function validateEmail(email: UnvalidatedEmail): ValidatedEmail {
  // 実際の検証ロジック(DNS確認など)
  return email as ValidatedEmail;
}

function sendEmail(email: ValidatedEmail) {
  // 検証済みメールのみ受け付ける
  console.log(`Sending to ${email}`);
}

const unvalidated = "user@example.com" as UnvalidatedEmail;
// sendEmail(unvalidated); // ❌ コンパイルエラー

const validated = validateEmail(unvalidated);
sendEmail(validated); // ✅ OK
```

## 実践的なドメインモデリング

### 金額の型安全性

```typescript
// 通貨と金額のブランド型
type Currency = 'USD' | 'EUR' | 'JPY';
type Money<C extends Currency> = Brand<number, `Money<${C}>`>;

type USD = Money<'USD'>;
type EUR = Money<'EUR'>;
type JPY = Money<'JPY'>;

// コンストラクタ
function USD(cents: number): USD {
  return cents as USD;
}

function EUR(cents: number): EUR {
  return cents as EUR;
}

function JPY(yen: number): JPY {
  return yen as JPY;
}

// 同一通貨のみ演算可能
function addMoney<C extends Currency>(
  a: Money<C>,
  b: Money<C>
): Money<C> {
  return (a + b) as Money<C>;
}

// 使用例
const price1 = USD(1000); // $10.00
const price2 = USD(500);  // $5.00
const total = addMoney(price1, price2); // ✅ OK

const euroPrice = EUR(1000);
// const invalid = addMoney(price1, euroPrice); // ❌ コンパイルエラー
```

### URL型の階層構造

```typescript
type Url = Brand<string, 'Url'>;
type HttpUrl = Brand<Url, 'Http'>;
type HttpsUrl = Brand<HttpUrl, 'Https'>;

function Url(value: string): Url {
  try {
    new URL(value);
    return value as Url;
  } catch {
    throw new Error(`Invalid URL: ${value}`);
  }
}

function HttpUrl(value: string): HttpUrl {
  const url = new URL(value);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('URL must use HTTP or HTTPS protocol');
  }
  return value as HttpUrl;
}

function HttpsUrl(value: string): HttpsUrl {
  const url = new URL(value);
  if (url.protocol !== 'https:') {
    throw new Error('URL must use HTTPS protocol');
  }
  return value as HttpsUrl;
}

// 関数はより厳密な型を要求できる
function fetchSecure(url: HttpsUrl) {
  return fetch(url);
}

function fetchAny(url: HttpUrl) {
  return fetch(url);
}

const secureUrl = HttpsUrl("https://api.example.com");
fetchSecure(secureUrl); // ✅ OK
fetchAny(secureUrl);    // ✅ OK (HttpsUrlはHttpUrlのサブタイプ)

const insecureUrl = HttpUrl("http://api.example.com");
// fetchSecure(insecureUrl); // ❌ コンパイルエラー
fetchAny(insecureUrl);       // ✅ OK
```

### 非空文字列型

```typescript
type NonEmptyString = Brand<string, 'NonEmptyString'>;

function NonEmptyString(value: string): NonEmptyString {
  if (value.trim().length === 0) {
    throw new Error('String cannot be empty');
  }
  return value as NonEmptyString;
}

// 実用例: ユーザー名
type Username = Brand<NonEmptyString, 'Username'>;

function Username(value: string): Username {
  const trimmed = value.trim();

  if (trimmed.length < 3) {
    throw new Error('Username must be at least 3 characters');
  }

  if (trimmed.length > 20) {
    throw new Error('Username must be at most 20 characters');
  }

  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    throw new Error('Username can only contain alphanumeric characters and underscores');
  }

  return trimmed as Username;
}

// 使用
function createUser(username: Username) {
  // usernameは必ず有効なフォーマット
  console.log(`Creating user: ${username}`);
}

const validUsername = Username("john_doe");
createUser(validUsername); // ✅ OK

// createUser("a"); // 実行時エラー: Username must be at least 3 characters
```

## 型ガードとの組み合わせ

```typescript
type PositiveNumber = Brand<number, 'PositiveNumber'>;
type NegativeNumber = Brand<number, 'NegativeNumber'>;

function isPositive(n: number): n is PositiveNumber {
  return n > 0;
}

function isNegative(n: number): n is NegativeNumber {
  return n < 0;
}

// 使用例
function processNumber(n: number) {
  if (isPositive(n)) {
    // この中ではnはPositiveNumber型
    const positive: PositiveNumber = n;
    console.log(`Positive: ${positive}`);
  } else if (isNegative(n)) {
    // この中ではnはNegativeNumber型
    const negative: NegativeNumber = n;
    console.log(`Negative: ${negative}`);
  } else {
    console.log('Zero');
  }
}
```

## Zodとの統合

```typescript
import { z } from 'zod';

type Email = Brand<string, 'Email'>;

const EmailSchema = z.string().email().transform((val) => val as Email);

type ParsedEmail = z.infer<typeof EmailSchema>; // Email型

// 使用例
const result = EmailSchema.safeParse("user@example.com");
if (result.success) {
  const email: Email = result.data;
  sendEmail(email);
}

// より複雑な例: ユーザー作成
type UserId = Brand<string, 'UserId'>;
type Username = Brand<string, 'Username'>;

const CreateUserSchema = z.object({
  email: z.string().email().transform((val) => val as Email),
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/)
    .transform((val) => val as Username),
});

type CreateUserInput = z.infer<typeof CreateUserSchema>;

async function createUser(input: CreateUserInput) {
  // input.emailとinput.usernameは既にブランド型
  const userId = generateId() as UserId;

  await db.user.create({
    data: {
      id: userId,
      email: input.email,
      username: input.username,
    },
  });

  return userId;
}
```

## パフォーマンスとランタイム

```typescript
// ブランド型はランタイムコスト0
const before = "user@example.com";
const after = before as Email;

console.log(before === after); // true (同じオブジェクト)

// バリデーション関数のみランタイムコスト
function Email(value: string): Email {
  // このバリデーションのみランタイムで実行される
  if (!value.includes('@')) {
    throw new Error('Invalid email');
  }
  return value as Email;
}
```

## 実践例: Eコマースドメイン

```typescript
// ドメイン型定義
type ProductId = Brand<string, 'ProductId'>;
type CustomerId = Brand<string, 'CustomerId'>;
type OrderId = Brand<string, 'OrderId'>;
type Quantity = Brand<number, 'Quantity'> & { readonly __positive: true };
type Price = Brand<number, 'Price'> & { readonly __positive: true };

// コンストラクタ
function ProductId(value: string): ProductId {
  if (!value.startsWith('prod_')) {
    throw new Error('ProductId must start with "prod_"');
  }
  return value as ProductId;
}

function Quantity(value: number): Quantity {
  if (value <= 0 || !Number.isInteger(value)) {
    throw new Error('Quantity must be a positive integer');
  }
  return value as Quantity;
}

function Price(cents: number): Price {
  if (cents < 0) {
    throw new Error('Price cannot be negative');
  }
  return cents as Price;
}

// ドメインロジック
interface OrderItem {
  productId: ProductId;
  quantity: Quantity;
  unitPrice: Price;
}

function calculateItemTotal(item: OrderItem): Price {
  return Price(item.unitPrice * item.quantity);
}

interface Order {
  orderId: OrderId;
  customerId: CustomerId;
  items: OrderItem[];
}

function calculateOrderTotal(order: Order): Price {
  const total = order.items.reduce(
    (sum, item) => sum + calculateItemTotal(item),
    0
  );
  return Price(total);
}

// 使用例
const order: Order = {
  orderId: "order-123" as OrderId,
  customerId: "cust-456" as CustomerId,
  items: [
    {
      productId: ProductId("prod_001"),
      quantity: Quantity(2),
      unitPrice: Price(1000), // $10.00
    },
    {
      productId: ProductId("prod_002"),
      quantity: Quantity(1),
      unitPrice: Price(2500), // $25.00
    },
  ],
};

const total = calculateOrderTotal(order);
console.log(`Order total: $${total / 100}`); // $45.00
```

## ユーティリティ型

```typescript
// ブランドを剥がす
type Unbrand<T> = T extends Brand<infer K, any> ? K : T;

type UserId = Brand<string, 'UserId'>;
type PlainString = Unbrand<UserId>; // string

// ブランドを取得
type GetBrand<T> = T extends Brand<any, infer B> ? B : never;

type UserIdBrand = GetBrand<UserId>; // 'UserId'

// 複数のブランドを結合
type MultiBrand<K, Brands extends readonly string[]> = Brands extends readonly [
  infer First extends string,
  ...infer Rest extends readonly string[]
]
  ? Brand<MultiBrand<K, Rest>, First>
  : K;

type ValidatedVerifiedEmail = MultiBrand<string, ['Email', 'Validated', 'Verified']>;
```

## まとめ

TypeScriptのブランド型は、プリミティブ型に意味を持たせることで、型レベルでドメインロジックを表現できる強力なテクニックです。コンパイル時の型チェックを活用し、実行時エラーを未然に防ぐことができます。

### ブランド型を使うべき場面

- 同じ基底型でも意味が異なる値(UserId、Email、OrderIdなど)
- バリデーションルールが必要な値(非空文字列、正の数など)
- 単位が重要な値(通貨、距離、重量など)
- セキュリティが重要な値(検証済みメール、サニタイズ済み文字列など)

### 次のステップ

- ドメイン駆動設計(DDD)と組み合わせた値オブジェクトの実装
- Zodなどのバリデーションライブラリとの統合
- 既存コードベースへの段階的導入戦略

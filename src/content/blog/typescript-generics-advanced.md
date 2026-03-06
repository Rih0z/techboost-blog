---
title: "TypeScript Generics上級テクニック: 条件型・マッピング型・テンプレートリテラル型"
description: "TypeScript Genericsの高度なパターンを実践的に解説。条件型による型の分岐、マッピング型によるユーティリティ型の作成、テンプレートリテラル型による文字列操作、infer活用など上級者向けテクニックを網羅。実務で役立つポイントを厳選して解説。"
pubDate: "2025-11-12"
updatedDate: "2025-11-12"
category: "typescript"
tags: ["TypeScript", "Generics", "型システム", "上級", "型安全"]
---
TypeScriptのGenericsは、単なる型パラメータ以上の力を持っています。この記事では、**条件型**、**マッピング型**、**テンプレートリテラル型**を組み合わせた高度なパターンを解説します。

## 条件型（Conditional Types）の基礎

### 基本構文

```typescript
// T extends U ? X : Y
// T が U に割り当て可能なら X、そうでなければ Y

type IsString<T> = T extends string ? true : false;

type A = IsString<string>;  // true
type B = IsString<number>;  // false
type C = IsString<'hello'>; // true
```

### 実用例: NonNullable の実装

```typescript
// undefined | null を除外
type MyNonNullable<T> = T extends null | undefined ? never : T;

type Example1 = MyNonNullable<string | null>;      // string
type Example2 = MyNonNullable<number | undefined>; // number
type Example3 = MyNonNullable<boolean | null | undefined>; // boolean
```

### 配列型の抽出

```typescript
// 配列の要素型を取得
type ArrayElement<T> = T extends (infer U)[] ? U : never;

type Str = ArrayElement<string[]>;        // string
type Num = ArrayElement<number[]>;        // number
type Mixed = ArrayElement<(string | number)[]>; // string | number
type NotArray = ArrayElement<string>;     // never

// Readonly配列にも対応
type ReadonlyArrayElement<T> = T extends readonly (infer U)[] ? U : never;

type ReadonlyStr = ReadonlyArrayElement<readonly string[]>; // string
```

### Promise の型抽出

```typescript
// Promiseの解決型を取得
type Awaited<T> = T extends Promise<infer U> ? U : T;

type A = Awaited<Promise<string>>;  // string
type B = Awaited<Promise<number>>;  // number
type C = Awaited<string>;           // string（Promiseでない場合はそのまま）

// ネストしたPromiseに対応
type DeepAwaited<T> = T extends Promise<infer U>
  ? DeepAwaited<U>
  : T;

type Nested = DeepAwaited<Promise<Promise<Promise<string>>>>; // string
```

### 関数の戻り値型を取得

```typescript
// 関数の戻り値型を抽出
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

function getUser() {
  return { id: 1, name: 'Alice' };
}

type User = MyReturnType<typeof getUser>; // { id: number; name: string; }

// async関数の場合
async function fetchData() {
  return { data: 'hello' };
}

type FetchResult = MyReturnType<typeof fetchData>; // Promise<{ data: string; }>
type UnwrappedResult = Awaited<MyReturnType<typeof fetchData>>; // { data: string; }
```

### 関数の引数型を取得

```typescript
// 関数の引数型を抽出
type MyParameters<T> = T extends (...args: infer P) => any ? P : never;

function createUser(name: string, age: number, active: boolean) {
  return { name, age, active };
}

type CreateUserParams = MyParameters<typeof createUser>; // [string, number, boolean]

// 特定の引数だけ取得
type FirstParameter<T> = T extends (first: infer F, ...args: any[]) => any ? F : never;

type FirstParam = FirstParameter<typeof createUser>; // string
```

## 高度な条件型パターン

### ユニオン型の分配（Distributive Conditional Types）

```typescript
// 条件型はユニオン型に対して分配される
type ToArray<T> = T extends any ? T[] : never;

type StringOrNumberArray = ToArray<string | number>;
// string[] | number[] （ (string | number)[] ではない）

// 分配を防ぐには配列で包む
type ToArrayNonDistributive<T> = [T] extends [any] ? T[] : never;

type Combined = ToArrayNonDistributive<string | number>;
// (string | number)[]
```

### 型の除外（Exclude）

```typescript
// ユニオン型から特定の型を除外
type MyExclude<T, U> = T extends U ? never : T;

type A = MyExclude<'a' | 'b' | 'c', 'a'>;       // 'b' | 'c'
type B = MyExclude<string | number, string>;    // number
type C = MyExclude<string | number | boolean, string | boolean>; // number

// 実用例: イベントハンドラーの型を除外
type DOMEventNames = keyof HTMLElementEventMap;
type CustomEvents = 'custom:load' | 'custom:save';

type AllEvents = DOMEventNames | CustomEvents;
type OnlyCustom = MyExclude<AllEvents, DOMEventNames>; // 'custom:load' | 'custom:save'
```

### 型の抽出（Extract）

```typescript
// ユニオン型から特定の型のみ抽出
type MyExtract<T, U> = T extends U ? T : never;

type A = MyExtract<'a' | 'b' | 'c', 'a' | 'c'>; // 'a' | 'c'
type B = MyExtract<string | number, number>;    // number

// 実用例: 特定の形状のオブジェクトのみ抽出
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; size: number }
  | { kind: 'triangle'; base: number; height: number };

type CircleOrSquare = MyExtract<Shape, { kind: 'circle' | 'square' }>;
// { kind: 'circle'; radius: number } | { kind: 'square'; size: number }
```

## マッピング型（Mapped Types）

### 基本的なマッピング型

```typescript
// オブジェクトの全プロパティをオプションにする
type MyPartial<T> = {
  [P in keyof T]?: T[P];
};

interface User {
  id: number;
  name: string;
  email: string;
}

type PartialUser = MyPartial<User>;
// { id?: number; name?: string; email?: string; }

// オブジェクトの全プロパティを必須にする
type MyRequired<T> = {
  [P in keyof T]-?: T[P];
};

type RequiredUser = MyRequired<PartialUser>;
// { id: number; name: string; email: string; }
```

### Readonly と Mutable

```typescript
// 全プロパティを読み取り専用にする
type MyReadonly<T> = {
  readonly [P in keyof T]: T[P];
};

type ReadonlyUser = MyReadonly<User>;
// { readonly id: number; readonly name: string; readonly email: string; }

// readonlyを解除する
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

type MutableUser = Mutable<ReadonlyUser>;
// { id: number; name: string; email: string; }
```

### プロパティの型を変換

```typescript
// 全プロパティをnullableにする
type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};

type NullableUser = Nullable<User>;
// { id: number | null; name: string | null; email: string | null; }

// 全プロパティをPromiseでラップ
type Promisify<T> = {
  [P in keyof T]: Promise<T[P]>;
};

type AsyncUser = Promisify<User>;
// { id: Promise<number>; name: Promise<string>; email: Promise<string>; }
```

### 特定のプロパティのみ抽出

```typescript
// 特定の型のプロパティのみ抽出
type PickByType<T, U> = {
  [P in keyof T as T[P] extends U ? P : never]: T[P];
};

interface Person {
  name: string;
  age: number;
  isActive: boolean;
  createdAt: Date;
  metadata: Record<string, any>;
}

type StringProps = PickByType<Person, string>;
// { name: string; }

type NumberProps = PickByType<Person, number>;
// { age: number; }

// 関数プロパティのみ抽出
type Methods<T> = PickByType<T, Function>;

interface UserService {
  name: string;
  getUser: (id: number) => Promise<User>;
  updateUser: (user: User) => Promise<void>;
  count: number;
}

type UserMethods = Methods<UserService>;
// { getUser: (id: number) => Promise<User>; updateUser: (user: User) => Promise<void>; }
```

### プロパティ名の変換

```typescript
// プロパティ名にプレフィックスを追加
type AddPrefix<T, Prefix extends string> = {
  [P in keyof T as `${Prefix}${string & P}`]: T[P];
};

type PrefixedUser = AddPrefix<User, 'get'>;
// { getId: number; getName: string; getEmail: string; }

// Getterを生成
type Getters<T> = {
  [P in keyof T as `get${Capitalize<string & P>}`]: () => T[P];
};

type UserGetters = Getters<User>;
// { getId: () => number; getName: () => string; getEmail: () => string; }

// Setterを生成
type Setters<T> = {
  [P in keyof T as `set${Capitalize<string & P>}`]: (value: T[P]) => void;
};

type UserSetters = Setters<User>;
// { setId: (value: number) => void; setName: (value: string) => void; setEmail: (value: string) => void; }
```

## テンプレートリテラル型

### 基本的な文字列操作

```typescript
// 文字列リテラルの結合
type Greeting = `Hello, ${string}!`;

const greet1: Greeting = 'Hello, World!';  // ✅
const greet2: Greeting = 'Hello, Alice!';  // ✅
// const greet3: Greeting = 'Hi, Bob!';    // ❌ エラー

// 複数の型を組み合わせ
type Protocol = 'http' | 'https';
type Domain = string;
type URL = `${Protocol}://${Domain}`;

const url1: URL = 'https://example.com';  // ✅
const url2: URL = 'http://localhost';     // ✅
// const url3: URL = 'ftp://example.com'; // ❌ エラー
```

### ルーティングパスの型安全化

```typescript
// APIエンドポイントの型定義
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type Resource = 'users' | 'posts' | 'comments';
type Endpoint = `/${Resource}` | `/${Resource}/${string}`;

const endpoint1: Endpoint = '/users';       // ✅
const endpoint2: Endpoint = '/posts/123';   // ✅
// const endpoint3: Endpoint = '/invalid';  // ❌

// RESTful APIの型
type RestEndpoint<R extends string, ID extends string | number = string> =
  | `/${R}`
  | `/${R}/${ID}`;

type UserEndpoint = RestEndpoint<'users', number>;
// '/users' | '/users/${number}'

// ネストしたリソース
type NestedEndpoint<
  R1 extends string,
  R2 extends string,
  ID1 extends string | number = string,
  ID2 extends string | number = string
> = `/${R1}/${ID1}/${R2}` | `/${R1}/${ID1}/${R2}/${ID2}`;

type PostCommentEndpoint = NestedEndpoint<'posts', 'comments', number, number>;
// '/posts/${number}/comments' | '/posts/${number}/comments/${number}'
```

### CSSプロパティの型安全化

```typescript
// CSS単位
type CSSUnit = 'px' | 'em' | 'rem' | '%' | 'vh' | 'vw';
type CSSValue<T extends number | string = number> = `${T}${CSSUnit}`;

const width1: CSSValue = '100px';   // ✅
const width2: CSSValue = '50%';     // ✅
const width3: CSSValue<16> = '16rem'; // ✅

// CSSプロパティ
type CSSColor = `#${string}` | `rgb(${number}, ${number}, ${number})` | `rgba(${number}, ${number}, ${number}, ${number})`;

const color1: CSSColor = '#ffffff';           // ✅
const color2: CSSColor = 'rgb(255, 255, 255)'; // ✅
const color3: CSSColor = 'rgba(0, 0, 0, 0.5)'; // ✅

// Flexboxプロパティ
type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';
type JustifyContent = 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around';

interface FlexContainer {
  display: 'flex';
  flexDirection?: FlexDirection;
  justifyContent?: JustifyContent;
}
```

### イベントハンドラーの型生成

```typescript
// イベント名からハンドラー名を生成
type EventName = 'click' | 'focus' | 'blur' | 'submit';
type EventHandler<E extends EventName> = `on${Capitalize<E>}`;

type ClickHandler = EventHandler<'click'>;   // 'onClick'
type FocusHandler = EventHandler<'focus'>;   // 'onFocus'

// イベントハンドラーの型を自動生成
type EventHandlers<T extends string> = {
  [E in T as `on${Capitalize<E>}`]: (event: Event) => void;
};

type FormEventHandlers = EventHandlers<'submit' | 'reset' | 'change'>;
// { onSubmit: (event: Event) => void; onReset: (event: Event) => void; onChange: (event: Event) => void; }
```

## 高度なGenericsパターン

### ファクトリーパターン

```typescript
// 型安全なファクトリー関数
interface EntityFactory<T> {
  create(props: Omit<T, 'id' | 'createdAt'>): T;
}

interface User {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}

class UserFactory implements EntityFactory<User> {
  private idCounter = 1;

  create(props: Omit<User, 'id' | 'createdAt'>): User {
    return {
      id: this.idCounter++,
      ...props,
      createdAt: new Date(),
    };
  }
}

const factory = new UserFactory();
const user = factory.create({ name: 'Alice', email: 'alice@example.com' });
// { id: 1, name: 'Alice', email: 'alice@example.com', createdAt: Date }
```

### ビルダーパターン

```typescript
// 型安全なビルダー
class QueryBuilder<T, Required extends keyof T = never> {
  private filters: Partial<T> = {};

  where<K extends keyof T>(key: K, value: T[K]): QueryBuilder<T, Required | K> {
    this.filters[key] = value;
    return this as any;
  }

  build(this: QueryBuilder<T, keyof T>): Required<T> {
    return this.filters as Required<T>;
  }
}

interface UserQuery {
  name?: string;
  email?: string;
  age?: number;
}

const query = new QueryBuilder<UserQuery>()
  .where('name', 'Alice')
  .where('email', 'alice@example.com')
  .build(); // ✅ 全プロパティが設定済み

// const incomplete = new QueryBuilder<UserQuery>()
//   .where('name', 'Alice')
//   .build(); // ❌ エラー: emailとageが未設定
```

### Zodスキーマからの型推論

```typescript
import { z } from 'zod';

// スキーマ定義
const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().min(0).max(150),
  isActive: z.boolean().default(true),
});

// スキーマから型を自動生成
type User = z.infer<typeof UserSchema>;
// { id: number; name: string; email: string; age: number; isActive: boolean; }

// API レスポンスの検証
async function getUser(id: number): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  const data = await response.json();

  // ランタイム検証 + 型安全
  return UserSchema.parse(data);
}
```

### 再帰的な型定義

```typescript
// JSONの型定義
type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

// ネストしたオブジェクトを平坦化
type FlattenObject<T> = T extends object
  ? T extends (infer U)[]
    ? U
    : { [K in keyof T]: FlattenObject<T[K]> }
  : T;

interface NestedUser {
  profile: {
    personal: {
      name: string;
      age: number;
    };
    contact: {
      email: string;
    };
  };
  settings: {
    theme: string;
  };
}

type Flat = FlattenObject<NestedUser>;
// { profile: { personal: { name: string; age: number; }; contact: { email: string; }; }; settings: { theme: string; }; }
```

### DeepReadonly と DeepPartial

```typescript
// 再帰的にReadonlyにする
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object
    ? DeepReadonly<T[P]>
    : T[P];
};

// 再帰的にPartialにする
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? DeepPartial<T[P]>
    : T[P];
};

interface Config {
  database: {
    host: string;
    port: number;
    credentials: {
      username: string;
      password: string;
    };
  };
  api: {
    endpoint: string;
  };
}

type ReadonlyConfig = DeepReadonly<Config>;
// 全てのプロパティがreadonlyに

type PartialConfig = DeepPartial<Config>;
// 全てのプロパティがoptionalに
```

## 実践例: 型安全なフォームバリデーション

```typescript
// フィールドの検証ルール
type ValidationRule<T> =
  | { type: 'required'; message?: string }
  | { type: 'minLength'; value: number; message?: string }
  | { type: 'maxLength'; value: number; message?: string }
  | { type: 'pattern'; value: RegExp; message?: string }
  | { type: 'custom'; validate: (value: T) => boolean; message?: string };

// フォームスキーマ
type FormSchema<T> = {
  [P in keyof T]: ValidationRule<T[P]>[];
};

// バリデーション結果
type ValidationErrors<T> = {
  [P in keyof T]?: string[];
};

// フォームバリデーター
class FormValidator<T extends Record<string, any>> {
  constructor(private schema: FormSchema<T>) {}

  validate(data: T): ValidationErrors<T> {
    const errors: ValidationErrors<T> = {};

    for (const [field, rules] of Object.entries(this.schema)) {
      const value = data[field as keyof T];
      const fieldErrors: string[] = [];

      for (const rule of rules as ValidationRule<any>[]) {
        if (rule.type === 'required' && !value) {
          fieldErrors.push(rule.message || `${field} is required`);
        }

        if (rule.type === 'minLength' && typeof value === 'string') {
          if (value.length < rule.value) {
            fieldErrors.push(rule.message || `${field} must be at least ${rule.value} characters`);
          }
        }

        if (rule.type === 'pattern' && typeof value === 'string') {
          if (!rule.value.test(value)) {
            fieldErrors.push(rule.message || `${field} format is invalid`);
          }
        }

        if (rule.type === 'custom') {
          if (!rule.validate(value)) {
            fieldErrors.push(rule.message || `${field} is invalid`);
          }
        }
      }

      if (fieldErrors.length > 0) {
        errors[field as keyof T] = fieldErrors;
      }
    }

    return errors;
  }
}

// 使用例
interface SignupForm {
  email: string;
  password: string;
  confirmPassword: string;
  age: number;
}

const signupSchema: FormSchema<SignupForm> = {
  email: [
    { type: 'required' },
    { type: 'pattern', value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email format' },
  ],
  password: [
    { type: 'required' },
    { type: 'minLength', value: 8, message: 'Password must be at least 8 characters' },
  ],
  confirmPassword: [
    { type: 'required' },
    {
      type: 'custom',
      validate: (value) => value === formData.password,
      message: 'Passwords do not match',
    },
  ],
  age: [
    { type: 'required' },
    { type: 'custom', validate: (value) => value >= 18, message: 'Must be 18 or older' },
  ],
};

const validator = new FormValidator(signupSchema);
const formData: SignupForm = {
  email: 'test@example.com',
  password: 'short',
  confirmPassword: 'different',
  age: 17,
};

const errors = validator.validate(formData);
// { password: ['Password must be at least 8 characters'], confirmPassword: ['Passwords do not match'], age: ['Must be 18 or older'] }
```

## まとめ

TypeScript Genericsの高度なテクニックを紹介しました。

### 重要なパターン

1. **条件型**: `T extends U ? X : Y` による型の分岐
2. **infer**: 型パラメータの推論
3. **マッピング型**: `[P in keyof T]` による型の変換
4. **テンプレートリテラル型**: 文字列リテラルの型安全な操作
5. **再帰的型**: ネストした構造の型定義

これらのテクニックを組み合わせることで、**実行時エラーをコンパイル時に検出**できる型安全なコードを書くことができます。

### 参考リンク

- [TypeScript Handbook - Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [TypeScript Handbook - Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
- [TypeScript Handbook - Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)
- [TypeScript Handbook - Template Literal Types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)

---
title: 'TypeScript 高度な型パターン実践ガイド：Conditional Types・Mapped Types・infer の使い方'
description: 'TypeScriptの上級者向け型パターン。Conditional Types、Mapped Types、Template Literal Types、inferを実践的なコード例で解説。型レベルプログラミングでコードの安全性を高める。'
pubDate: 'Feb 26 2026'
heroImage: '../../assets/thumbnails/typescript-advanced-types-guide.jpg'
---

TypeScriptの型システムは、単なる「変数の型チェック」をはるかに超えた能力を持っています。Conditional Types、Mapped Types、Template Literal Types、そして `infer` キーワードを組み合わせることで、ランタイムエラーをコンパイル時に検出できる強力な型制約を設計できます。

本記事では、実際のプロダクト開発で遭遇する課題を題材に、4つの高度な型パターンを体系的に解説します。「なぜこの型が必要なのか」という設計の動機から入り、段階的に複雑な応用例へと展開していきます。

---

## 1. Conditional Types — 条件で分岐する型

### なぜ使うのか

APIのレスポンス型や関数のオーバーロードを静的に表現したいとき、入力の型に応じて出力の型が変わるケースがあります。if文のような条件分岐を型レベルで行うのが Conditional Types です。

### 基本構文

```typescript
type IsString<T> = T extends string ? 'yes' : 'no';

type A = IsString<string>;  // 'yes'
type B = IsString<number>;  // 'no'
type C = IsString<'hello'>; // 'yes'（string のサブタイプ）
```

`T extends U ? X : Y` は「T が U に代入可能なら X、そうでなければ Y」を返します。

### 実践例：APIレスポンスの型安全なラッパー

実際のプロダクトでは、成功・失敗で異なる型を返すAPIが多くあります。

```typescript
type ApiResponse<T, IsSuccess extends boolean> =
  IsSuccess extends true
    ? { success: true; data: T; timestamp: number }
    : { success: false; error: string; code: number };

// 使用例
type UserResponse = ApiResponse<{ id: string; name: string }, true>;
// { success: true; data: { id: string; name: string }; timestamp: number }

type ErrorResponse = ApiResponse<never, false>;
// { success: false; error: string; code: number }
```

### ユニオン型への分配

Conditional Types はユニオン型に対して「分配」されます。これを利用すると、フィルタリング型を作れます。

```typescript
// ユニオン型から特定の型だけを抽出する
type ExtractNullable<T> = T extends null | undefined ? T : never;
type OnlyNullable = ExtractNullable<string | null | number | undefined>;
// null | undefined

// 逆にnullableを除外する
type NonNullableKeys<T> = {
  [K in keyof T]: NonNullable<T[K]> extends T[K] ? K : never;
}[keyof T];

interface User {
  id: string;
  name: string;
  email: string | null;
  age?: number;
}

type RequiredUserKeys = NonNullableKeys<User>; // 'id' | 'name'
```

### 再帰的 Conditional Types

TypeScript 4.1 以降、再帰的な型定義が可能になりました。ネストされたオブジェクトをフラットにする型が作れます。

```typescript
type DeepReadonly<T> = T extends (infer Item)[]
  ? ReadonlyArray<DeepReadonly<Item>>
  : T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

interface Config {
  server: {
    host: string;
    port: number;
    tls: {
      enabled: boolean;
      cert: string;
    };
  };
  database: {
    url: string;
  };
}

type ImmutableConfig = DeepReadonly<Config>;
// 全てのプロパティ（ネストも含む）が readonly になる
```

---

## 2. Mapped Types — 既存の型を変換する

### なぜ使うのか

既存のインターフェースを元に「全プロパティをオプション化した版」「全プロパティをreadonlyにした版」など、派生型を手動で書き直すのは保守性の観点から問題があります。Mapped Types を使えば元の型から自動的に派生型を生成できます。

### 基本構文

```typescript
type Mutable<T> = {
  -readonly [K in keyof T]: T[K]; // -readonly で readonly を除去
};

type OptionalAll<T> = {
  [K in keyof T]?: T[K]; // ? でオプション化
};

type RequiredAll<T> = {
  [K in keyof T]-?: T[K]; // -? でオプションを除去
};
```

### 実践例：フォームバリデーション型の自動生成

フォームの各フィールドに対して、値・エラーメッセージ・タッチ状態を持つ型を自動生成します。

```typescript
interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

// フォームの状態型を自動生成
type FormState<T> = {
  [K in keyof T]: {
    value: T[K];
    error: string | null;
    touched: boolean;
    dirty: boolean;
  };
};

type LoginFormState = FormState<LoginForm>;
/*
{
  email: { value: string; error: string | null; touched: boolean; dirty: boolean };
  password: { value: string; error: string | null; touched: boolean; dirty: boolean };
  rememberMe: { value: boolean; error: string | null; touched: boolean; dirty: boolean };
}
*/
```

### Key Remapping（キー名の変換）

TypeScript 4.1 以降、`as` キーワードを使ってキー名自体を変換できます。

```typescript
// getter メソッドを自動生成する型
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface Product {
  id: string;
  name: string;
  price: number;
}

type ProductGetters = Getters<Product>;
/*
{
  getId: () => string;
  getName: () => string;
  getPrice: () => number;
}
*/

// 特定のプロパティだけを除外する
type OmitByValue<T, V> = {
  [K in keyof T as T[K] extends V ? never : K]: T[K];
};

interface ApiPayload {
  userId: string;
  data: object;
  _internalFlag: boolean;  // 除外したい内部フラグ
  _timestamp: number;      // 除外したい内部値
}

// boolean | number 型のプロパティを除外
type PublicPayload = OmitByValue<ApiPayload, boolean | number>;
// { userId: string; data: object }
```

### 実践例：Zustand ストアの型安全なセレクター

状態管理ライブラリでよく使われるセレクター関数を型安全に定義します。

```typescript
type Selector<State, Result> = (state: State) => Result;

// ストアの各フィールドに対してセレクターを自動生成
type StoreSelectors<T> = {
  [K in keyof T as `select${Capitalize<string & K>}`]: Selector<T, T[K]>;
};

interface AppState {
  user: { id: string; name: string } | null;
  theme: 'light' | 'dark';
  notifications: string[];
}

type AppSelectors = StoreSelectors<AppState>;
/*
{
  selectUser: (state: AppState) => { id: string; name: string } | null;
  selectTheme: (state: AppState) => 'light' | 'dark';
  selectNotifications: (state: AppState) => string[];
}
*/
```

---

## 3. Template Literal Types — 文字列を型レベルで操作する

### なぜ使うのか

イベント名、ルートパス、CSS変数名など、文字列のパターンに意味がある場面は多くあります。Template Literal Types を使えば、「`on` から始まるイベントハンドラ名」「`/api/` から始まるルート」といった文字列パターンを型として表現できます。

### 基本構文

```typescript
type EventName = 'click' | 'focus' | 'blur';
type EventHandler = `on${Capitalize<EventName>}`;
// 'onClick' | 'onFocus' | 'onBlur'

type CSSVariable = `--${string}`;
const primary: CSSVariable = '--color-primary'; // OK
// const invalid: CSSVariable = 'color-primary'; // エラー
```

### 実践例：型安全なルーティング

Next.js や React Router で使える、パスパラメータを型から抽出するユーティリティです。

```typescript
// パスから動的セグメントを抽出
type ExtractRouteParams<T extends string> =
  T extends `${infer _Start}:${infer Param}/${infer Rest}`
    ? Param | ExtractRouteParams<`/${Rest}`>
    : T extends `${infer _Start}:${infer Param}`
    ? Param
    : never;

type UserRouteParams = ExtractRouteParams<'/users/:userId/posts/:postId'>;
// 'userId' | 'postId'

// パスパラメータを必須オブジェクトとして表現
type RouteParams<T extends string> = {
  [K in ExtractRouteParams<T>]: string;
};

function navigate<T extends string>(
  path: T,
  params: RouteParams<T>
): string {
  return Object.entries(params).reduce(
    (acc, [key, value]) => acc.replace(`:${key}`, value as string),
    path as string
  );
}

// 使用例
const url = navigate('/users/:userId/posts/:postId', {
  userId: '123',
  postId: '456',
});
// '/users/123/posts/456'

// パラメータが足りないとコンパイルエラー
// navigate('/users/:userId/posts/:postId', { userId: '123' }); // エラー
```

### 実践例：イベントシステムの型安全化

```typescript
type EventMap = {
  'user:login': { userId: string; timestamp: number };
  'user:logout': { userId: string };
  'cart:add': { productId: string; quantity: number };
  'cart:remove': { productId: string };
  'order:placed': { orderId: string; total: number };
};

type EventKey = keyof EventMap;

// 型安全なイベントエミッター
class TypedEventEmitter {
  private handlers: Partial<{
    [K in EventKey]: Array<(payload: EventMap[K]) => void>;
  }> = {};

  on<K extends EventKey>(
    event: K,
    handler: (payload: EventMap[K]) => void
  ): void {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    (this.handlers[event] as Array<(payload: EventMap[K]) => void>).push(handler);
  }

  emit<K extends EventKey>(event: K, payload: EventMap[K]): void {
    this.handlers[event]?.forEach(handler => handler(payload));
  }
}

const emitter = new TypedEventEmitter();

// 型安全なイベント登録とエミット
emitter.on('user:login', ({ userId, timestamp }) => {
  console.log(`User ${userId} logged in at ${timestamp}`);
});

emitter.emit('user:login', { userId: 'u123', timestamp: Date.now() });
// emitter.emit('user:login', { userId: 'u123' }); // エラー: timestamp が必要
```

### CSS-in-TS のスケールシステム

```typescript
type Scale = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
type SpacingKey = `spacing-${Scale}`;
type ColorShade = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
type ColorKey = `${string}-${ColorShade}`;

type DesignToken = SpacingKey | ColorKey;

function getToken(token: DesignToken): string {
  return `var(--${token})`;
}

getToken('spacing-4');       // OK
getToken('blue-500');        // OK
// getToken('spacing-15');  // エラー
// getToken('blue-50');     // エラー
```

---

## 4. infer — 型から型を取り出す

### なぜ使うのか

関数の戻り値の型、Promiseが解決する型、配列の要素型など、「ある型の一部を取り出したい」場面は頻繁にあります。`infer` キーワードは Conditional Types の中で使われ、マッチした型の一部を変数として捕捉します。

### 基本構文

```typescript
// 関数の戻り値型を抽出（標準の ReturnType<T> の実装）
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// Promiseが解決する型を抽出（標準の Awaited<T> の実装）
type MyAwaited<T> = T extends Promise<infer U> ? MyAwaited<U> : T;

// 配列の要素型を抽出
type ElementOf<T> = T extends (infer E)[] ? E : never;
```

### 実践例：非同期関数の戻り値型

```typescript
// 非同期関数の最終的な戻り値を取得
type AsyncReturnType<T extends (...args: any[]) => Promise<any>> =
  T extends (...args: any[]) => Promise<infer R> ? R : never;

async function fetchUser(id: string) {
  return { id, name: 'Alice', email: 'alice@example.com' };
}

type User = AsyncReturnType<typeof fetchUser>;
// { id: string; name: string; email: string }

// 複数の非同期関数の戻り値をまとめる
type BatchResults<T extends Record<string, (...args: any[]) => Promise<any>>> = {
  [K in keyof T]: AsyncReturnType<T[K]>;
};

const api = {
  getUser: async (id: string) => ({ id, name: 'Alice' }),
  getProducts: async () => [{ id: 'p1', price: 1000 }],
  getConfig: async () => ({ theme: 'dark' as const }),
};

type ApiResults = BatchResults<typeof api>;
/*
{
  getUser: { id: string; name: string };
  getProducts: { id: string; price: number }[];
  getConfig: { theme: 'dark' };
}
*/
```

### 実践例：関数のパラメータ型の操作

```typescript
// 最初のパラメータを除いた残りのパラメータ型
type DropFirstParam<T extends (...args: any[]) => any> =
  T extends (first: any, ...rest: infer R) => any ? R : never;

// カリー化の型定義
type Curry<T extends (...args: any[]) => any> =
  Parameters<T> extends [infer First, ...infer Rest]
    ? (arg: First) => Rest extends []
      ? ReturnType<T>
      : Curry<(...args: Rest) => ReturnType<T>>
    : ReturnType<T>;

function add(a: number, b: number, c: number): number {
  return a + b + c;
}

// Curry<typeof add> は以下と等価
// (a: number) => (b: number) => (c: number) => number
```

### 実践例：Zodスキーマからの型推論パターン

バリデーションライブラリと組み合わせた実践的なパターンです。

```typescript
// スキーマオブジェクトから型を自動推論するユーティリティ
type InferSchemaType<T> = T extends { parse: (input: unknown) => infer Output }
  ? Output
  : never;

// Zodライクなスキーマ定義（擬似コード）
const userSchema = {
  parse: (input: unknown): { id: string; name: string; age: number } => {
    // バリデーションロジック
    return input as any;
  }
};

type UserType = InferSchemaType<typeof userSchema>;
// { id: string; name: string; age: number }

// ネストしたオブジェクト型の再帰的な infer
type DeepUnwrapPromise<T> =
  T extends Promise<infer Inner>
    ? DeepUnwrapPromise<Inner>
    : T extends object
    ? { [K in keyof T]: DeepUnwrapPromise<T[K]> }
    : T;

type LazyConfig = {
  settings: Promise<Promise<{ theme: string; lang: string }>>;
  cache: Promise<Map<string, number>>;
};

type ResolvedConfig = DeepUnwrapPromise<LazyConfig>;
/*
{
  settings: { theme: string; lang: string };
  cache: Map<string, number>;
}
*/
```

---

## 5. 複合パターン：全技術を組み合わせた実践例

### 型安全なフィーチャーフラグシステム

実際のプロダクトで使える、フィーチャーフラグの型安全なシステムを設計します。

```typescript
// フィーチャーフラグの定義
interface FeatureFlags {
  'new-checkout': { variant: 'A' | 'B'; userId?: string };
  'dark-mode': { enabled: boolean };
  'ai-suggestions': { model: string; maxTokens: number };
  'beta-dashboard': Record<string, never>;
}

type FlagName = keyof FeatureFlags;
type FlagConfig<K extends FlagName> = FeatureFlags[K];

// フラグが設定を持つかどうかを判定
type HasConfig<K extends FlagName> =
  FeatureFlags[K] extends Record<string, never> ? false : true;

// 型安全なフィーチャーフラグマネージャー
class FeatureFlagManager {
  private flags: Partial<{
    [K in FlagName]: FlagConfig<K> & { enabled: boolean };
  }> = {};

  enable<K extends FlagName>(
    flag: K,
    ...args: HasConfig<K> extends true ? [config: FlagConfig<K>] : []
  ): void {
    const config = args[0] ?? ({} as FlagConfig<K>);
    this.flags[flag] = { ...config, enabled: true } as any;
  }

  isEnabled(flag: FlagName): boolean {
    return this.flags[flag]?.enabled ?? false;
  }

  getConfig<K extends FlagName>(flag: K): FlagConfig<K> | null {
    const entry = this.flags[flag];
    if (!entry) return null;
    const { enabled, ...config } = entry as any;
    return config as FlagConfig<K>;
  }
}

const flagManager = new FeatureFlagManager();

flagManager.enable('new-checkout', { variant: 'A', userId: 'u123' });
flagManager.enable('beta-dashboard'); // 設定不要なフラグは引数なし
// flagManager.enable('dark-mode'); // エラー: config が必要
```

---

## まとめ：いつどの技術を使うか

| 技術 | 主な用途 | TypeScript バージョン |
|------|---------|----------------------|
| **Conditional Types** | 型の分岐・フィルタリング・変換 | 2.8+ |
| **Mapped Types** | 既存型からの派生型生成 | 2.1+ |
| **Key Remapping** | キー名の変換・フィルタリング | 4.1+ |
| **Template Literal Types** | 文字列パターンの型表現 | 4.1+ |
| **infer** | 型の一部の抽出 | 2.8+ |
| **再帰的型** | ネスト構造の変換 | 4.1+ |

これらの技術は単独でも強力ですが、組み合わせることで真価を発揮します。まずは自分のプロダクトコードの中で「型が曖昧になっている箇所」「重複した型定義がある箇所」を探し、本記事のパターンを適用してみてください。

型レベルプログラミングは初見では難解に見えますが、「コンパイル時に検出できるバグが増える」という明確なメリットがあります。テストカバレッジを上げるのと同様の投資対効果があると考えてください。TypeScript 5.x では型推論の精度も向上しており、これらのパターンはより自然に機能します。

---
title: 'TypeScript実践パターン集 — 型安全なコードを書くための高度テクニック20選'
description: 'TypeScriptの高度な型テクニックを実践的なパターンで解説。条件型、マップ型、テンプレートリテラル型、Branded Types、Discriminated Unions、型推論の活用法など、実務で差がつく20のパターンをコード例付きで紹介。'
pubDate: '2026-02-20'
heroImage: '../../assets/blog-placeholder-2.jpg'
tags: ['TypeScript', '型安全', 'ジェネリクス', 'フロントエンド', '実践']
---

TypeScriptを「なんとなく使える」レベルから「型システムを武器にできる」レベルへ引き上げるには、標準的なユーティリティ型を超えた深い理解が必要です。本記事では、実務で実際に役立つ高度なパターンを20個厳選し、コード例と合わせて解説します。

---

## 1. ユーティリティ型の深掘り

TypeScriptが標準提供するユーティリティ型は、多くの開発者が表面的にしか使っていません。それぞれの内部実装を理解することで、自分でカスタム型を作る力が身につきます。

```typescript
// Partial<T> の内部実装
type MyPartial<T> = {
  [K in keyof T]?: T[K];
};

// Required<T> の内部実装
type MyRequired<T> = {
  [K in keyof T]-?: T[K]; // -? で optional を除去
};

// Readonly<T> の内部実装
type MyReadonly<T> = {
  readonly [K in keyof T]: T[K];
};

// Pick<T, K> の内部実装
type MyPick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// Omit<T, K> の内部実装
type MyOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

// Extract と Exclude の違いを明確に理解する
type A = 'a' | 'b' | 'c' | 'd';
type B = 'b' | 'd' | 'f';

type ExtractResult = Extract<A, B>;  // 'b' | 'd'  （共通部分）
type ExcludeResult = Exclude<A, B>;  // 'a' | 'c'  （Aにあり、Bにない）
```

### ReturnType と Parameters の活用

既存の関数から型を逆引きするテクニックは、外部ライブラリとの連携で特に威力を発揮します。

```typescript
function fetchUser(id: string, options: { cache: boolean }) {
  return { id, name: 'Alice', createdAt: new Date() };
}

// 関数の戻り値型を自動取得
type User = ReturnType<typeof fetchUser>;
// { id: string; name: string; createdAt: Date }

// 関数の引数型を自動取得
type FetchUserParams = Parameters<typeof fetchUser>;
// [id: string, options: { cache: boolean }]

// 特定のインデックスの引数型だけ取得
type FetchOptions = Parameters<typeof fetchUser>[1];
// { cache: boolean }
```

---

## 2. 条件型（Conditional Types）と型推論

条件型は `T extends U ? X : Y` の形式を持ち、型レベルのif文として機能します。

```typescript
// 基本的な条件型
type IsString<T> = T extends string ? true : false;

type Test1 = IsString<string>;  // true
type Test2 = IsString<number>;  // false

// ユニオン型への分配（Distributive Conditional Types）
type ToArray<T> = T extends any ? T[] : never;

type Result = ToArray<string | number>;
// string[] | number[]  ← ユニオンの各メンバーに分配される

// 分配を防ぎたい場合は [] で囲む
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;
type Result2 = ToArrayNonDist<string | number>;
// (string | number)[]  ← 全体として処理される

// NonNullable の実装
type MyNonNullable<T> = T extends null | undefined ? never : T;

type Cleaned = MyNonNullable<string | null | undefined | number>;
// string | number
```

---

## 3. マップ型（Mapped Types）の実践活用

マップ型を使うと、既存の型から新しい型を動的に生成できます。

```typescript
// キーを変換するマップ型（as句で再マッピング）
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type User = { name: string; age: number; email: string };
type UserGetters = Getters<User>;
// {
//   getName: () => string;
//   getAge: () => number;
//   getEmail: () => string;
// }

// 特定のキーだけを変換
type OptionalNullable<T, K extends keyof T> = Omit<T, K> & {
  [P in K]: T[P] | null;
};

type Product = { id: number; name: string; description: string };
type ProductWithNullableDesc = OptionalNullable<Product, 'description'>;
// { id: number; name: string; description: string | null }

// 値の型に基づいてキーをフィルタリング
type PickByValue<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};

type Config = { host: string; port: number; debug: boolean; timeout: number };
type NumberConfig = PickByValue<Config, number>;
// { port: number; timeout: number }
```

---

## 4. テンプレートリテラル型でAPIルートの型定義

TypeScript 4.1以降で使えるテンプレートリテラル型は、文字列パターンを型安全に扱う強力なツールです。

```typescript
// APIエンドポイントの型定義
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
type ApiVersion = 'v1' | 'v2';
type Resource = 'users' | 'products' | 'orders';

type ApiEndpoint = `/${ApiVersion}/${Resource}`;
// '/v1/users' | '/v1/products' | '/v1/orders' | '/v2/users' | ...

// イベント名のパターン型定義
type EventName<T extends string> = `on${Capitalize<T>}`;
type ClickEvent = EventName<'click'>;    // 'onClick'
type ChangeEvent = EventName<'change'>;  // 'onChange'

// CSSプロパティのショートハンド型
type CSSDirection = 'top' | 'right' | 'bottom' | 'left';
type CSSSpacingProp = `margin-${CSSDirection}` | `padding-${CSSDirection}`;
// 'margin-top' | 'margin-right' | 'margin-bottom' | 'margin-left'
// 'padding-top' | 'padding-right' | ...

// パス文字列から型を抽出
type ExtractRouteParams<T extends string> =
  T extends `${infer _Start}:${infer Param}/${infer Rest}`
    ? Param | ExtractRouteParams<Rest>
    : T extends `${infer _Start}:${infer Param}`
    ? Param
    : never;

type Params = ExtractRouteParams<'/users/:userId/posts/:postId'>;
// 'userId' | 'postId'
```

---

## 5. Discriminated Unions（判別共用体）の設計パターン

判別共用体は、TypeScriptで最も重要なパターンのひとつです。`kind` や `type` のような共通プロパティで型を絞り込みます。

```typescript
// Before: 型が曖昧で、どのプロパティが存在するか不明確
type Shape_Bad = {
  type: string;
  radius?: number;
  width?: number;
  height?: number;
};

// After: Discriminated Union で明確に定義
type Circle = { type: 'circle'; radius: number };
type Rectangle = { type: 'rectangle'; width: number; height: number };
type Triangle = { type: 'triangle'; base: number; height: number };

type Shape = Circle | Rectangle | Triangle;

// 網羅チェック（Exhaustive Check）パターン
function getArea(shape: Shape): number {
  switch (shape.type) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'rectangle':
      return shape.width * shape.height;
    case 'triangle':
      return (shape.base * shape.height) / 2;
    default:
      // 全ケースを処理していないとコンパイルエラー
      const _exhaustiveCheck: never = shape;
      throw new Error(`Unknown shape: ${_exhaustiveCheck}`);
  }
}

// 非同期処理の状態管理にも応用
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function renderUser(state: AsyncState<User>) {
  if (state.status === 'success') {
    // ここでは state.data が確定している
    console.log(state.data.name);
  }
}
```

---

## 6. Branded Types（ブランド型）でプリミティブを区別

同じ型（例: `string`）でも意味が異なる値を区別するためのパターンです。

```typescript
// Before: UserId と OrderId が混在しても型エラーにならない
function getUser(id: string) { /* ... */ }
function getOrder(id: string) { /* ... */ }

const orderId = 'order-123';
getUser(orderId); // エラーにならない（バグの温床）

// After: Branded Types で意味を区別
declare const __brand: unique symbol;
type Brand<T, TBrand extends string> = T & { [__brand]: TBrand };

type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;
type ProductId = Brand<string, 'ProductId'>;

// ブランド型のコンストラクタ関数
function createUserId(id: string): UserId {
  // バリデーションをここに集約できる
  if (!id.startsWith('user-')) throw new Error('Invalid UserId format');
  return id as UserId;
}

function createOrderId(id: string): OrderId {
  if (!id.startsWith('order-')) throw new Error('Invalid OrderId format');
  return id as OrderId;
}

function getUserById(id: UserId) { /* ... */ }
function getOrderById(id: OrderId) { /* ... */ }

const userId = createUserId('user-456');
const orderId2 = createOrderId('order-123');

getUserById(userId);   // OK
getUserById(orderId2); // コンパイルエラー！型が違うと教えてくれる

// 数値にも適用可能
type Meters = Brand<number, 'Meters'>;
type Kilograms = Brand<number, 'Kilograms'>;

const distance: Meters = 100 as Meters;
const weight: Kilograms = 75 as Kilograms;
// distance + weight はエラーにはならないが、型は明確に区別される
```

---

## 7. infer キーワードでの型抽出

`infer` はパターンマッチングで型を「キャプチャ」するための強力なキーワードです。

```typescript
// Promise の解決型を取得
type Awaited_Custom<T> = T extends Promise<infer R> ? Awaited_Custom<R> : T;

type Result = Awaited_Custom<Promise<Promise<string>>>;
// string

// 配列の要素型を取得
type ElementType<T> = T extends (infer E)[] ? E : never;
type StrElem = ElementType<string[]>;    // string
type NumElem = ElementType<number[][]>;  // number[]

// 関数の最後の引数の型を取得
type LastParam<T extends (...args: any[]) => any> =
  T extends (...args: [...infer _, infer Last]) => any ? Last : never;

function example(a: string, b: number, c: boolean) {}
type LastArg = LastParam<typeof example>;  // boolean

// コンストラクタの引数型を取得
type ConstructorParams<T extends new (...args: any[]) => any> =
  T extends new (...args: infer P) => any ? P : never;

class ApiClient {
  constructor(baseUrl: string, timeout: number, apiKey: string) {}
}

type ApiClientParams = ConstructorParams<typeof ApiClient>;
// [baseUrl: string, timeout: number, apiKey: string]

// 深いネストからの型抽出
type UnpackNested<T> =
  T extends { data: infer D }
    ? D extends { items: infer I }
      ? I
      : D
    : T;

type ApiResponse = { data: { items: Product[] } };
type Items = UnpackNested<ApiResponse>;  // Product[]
```

---

## 8. satisfies 演算子（TypeScript 4.9+）

`satisfies` は「型チェックはするが、型を広げない」という独自の挙動を持ちます。

```typescript
type Colors = 'red' | 'green' | 'blue';
type ColorMap = Record<Colors, string | [number, number, number]>;

// as でキャストすると型情報が失われる
const palette_bad = {
  red: [255, 0, 0],
  green: '#00ff00',
  blue: [0, 0, 255],
} as ColorMap;

// palette_bad.red は string | [number, number, number] になり、配列メソッドが使えない
// palette_bad.red.map(...)  // エラー

// satisfies を使うと推論型を保持しつつ型チェック可能
const palette = {
  red: [255, 0, 0],
  green: '#00ff00',
  blue: [0, 0, 255],
} satisfies ColorMap;

// palette.red は [number, number, number] として推論される
palette.red.map((v) => v * 2);   // OK！
palette.green.toUpperCase();      // OK！

// 設定オブジェクトのバリデーションにも最適
type AppConfig = {
  env: 'development' | 'staging' | 'production';
  port: number;
  features: string[];
};

const config = {
  env: 'production',  // 'production' として推論（string に広がらない）
  port: 3000,
  features: ['auth', 'analytics'],
} satisfies AppConfig;

// config.env は 'production' リテラル型として使える
type Env = typeof config.env;  // 'production'
```

---

## 9. const アサーション（as const）の活用

`as const` はすべてのプロパティを `readonly` にし、リテラル型として固定します。

```typescript
// Before: 型が広がってしまう
const DIRECTIONS = ['north', 'south', 'east', 'west'];
// string[]

const STATUS = { pending: 0, active: 1, inactive: 2 };
// { pending: number; active: number; inactive: number }

// After: as const でリテラル型を保持
const DIRECTIONS_CONST = ['north', 'south', 'east', 'west'] as const;
// readonly ['north', 'south', 'east', 'west']

type Direction = typeof DIRECTIONS_CONST[number];
// 'north' | 'south' | 'east' | 'west'

const STATUS_CONST = { pending: 0, active: 1, inactive: 2 } as const;
// { readonly pending: 0; readonly active: 1; readonly inactive: 2 }

type StatusValue = typeof STATUS_CONST[keyof typeof STATUS_CONST];
// 0 | 1 | 2

// オブジェクト配列から型を生成
const ROUTES = [
  { path: '/', name: 'Home', auth: false },
  { path: '/dashboard', name: 'Dashboard', auth: true },
  { path: '/settings', name: 'Settings', auth: true },
] as const;

type Route = typeof ROUTES[number];
// { readonly path: '/'; readonly name: 'Home'; readonly auth: false }
// | { readonly path: '/dashboard'; ... }
// | { readonly path: '/settings'; ... }

type AuthRequiredRoute = Extract<Route, { auth: true }>;
// ダッシュボードと設定のみを型として取得
```

---

## 10. 関数オーバーロードの型定義

異なる引数の組み合わせに対して異なる戻り値型を持つ関数を定義します。

```typescript
// オーバーロードシグネチャ（実装は最後に一つだけ）
function parseInput(input: string): number;
function parseInput(input: number): string;
function parseInput(input: string[]): number[];
function parseInput(input: string | number | string[]): string | number | number[] {
  if (typeof input === 'string') return parseInt(input, 10);
  if (typeof input === 'number') return String(input);
  return input.map((s) => parseInt(s, 10));
}

// 戻り値の型が引数によって変わることをTypeScriptが理解する
const num = parseInput('42');      // number
const str = parseInput(42);       // string
const nums = parseInput(['1', '2', '3']); // number[]

// Genericsと組み合わせた高度なオーバーロード
function createElement(tag: 'div'): HTMLDivElement;
function createElement(tag: 'span'): HTMLSpanElement;
function createElement(tag: 'input'): HTMLInputElement;
function createElement(tag: string): HTMLElement {
  return document.createElement(tag);
}

const div = createElement('div');   // HTMLDivElement
const span = createElement('span'); // HTMLSpanElement
const input = createElement('input'); // HTMLInputElement
```

---

## 11. 型ガード（Type Guards）の実装パターン

型ガードは実行時に型を絞り込むための関数です。`is` キーワードで戻り値を型述語にします。

```typescript
// ユーザー定義型ガード
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    typeof (value as User).id === 'string' &&
    typeof (value as User).name === 'string'
  );
}

// APIレスポンスのバリデーション
async function fetchUserSafe(id: string): Promise<User | null> {
  const res = await fetch(`/api/users/${id}`);
  const data: unknown = await res.json();
  return isUser(data) ? data : null;
}

// アサーション関数（TypeScript 3.7+）
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new TypeError(`Expected string, got ${typeof value}`);
  }
}

function processInput(value: unknown) {
  assertIsString(value);
  // ここ以降、value は string として扱われる
  console.log(value.toUpperCase());
}

// Discriminated Union への型ガード
function isSuccessState<T>(state: AsyncState<T>): state is Extract<AsyncState<T>, { status: 'success' }> {
  return state.status === 'success';
}
```

---

## 12. 再帰型でJSONツリーを型定義

TypeScriptは再帰的な型定義をサポートしており、JSONやツリー構造の表現に活用できます。

```typescript
// JSON型の完全な定義
type JsonPrimitive = string | number | boolean | null;
type JsonArray = JsonValue[];
type JsonObject = { [key: string]: JsonValue };
type JsonValue = JsonPrimitive | JsonArray | JsonObject;

// 型安全なJSONパーサー
function parseJson(input: string): JsonValue {
  return JSON.parse(input) as JsonValue;
}

// ツリー構造の型定義
type TreeNode<T> = {
  value: T;
  children: TreeNode<T>[];
};

function mapTree<T, U>(node: TreeNode<T>, fn: (value: T) => U): TreeNode<U> {
  return {
    value: fn(node.value),
    children: node.children.map((child) => mapTree(child, fn)),
  };
}

// カテゴリツリーの例
type Category = TreeNode<{ id: string; name: string }>;

// ファイルシステム型
type FileSystemNode =
  | { type: 'file'; name: string; size: number }
  | { type: 'directory'; name: string; children: FileSystemNode[] };

function getSize(node: FileSystemNode): number {
  if (node.type === 'file') return node.size;
  return node.children.reduce((sum, child) => sum + getSize(child), 0);
}
```

---

## 13. DeepPartial、DeepReadonly等のカスタムユーティリティ型

標準ユーティリティ型は浅い変換しかしません。深いネストにも対応する型を作りましょう。

```typescript
// DeepPartial: 全プロパティを再帰的にOptionalに
type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

// DeepRequired: 全プロパティを再帰的に必須に
type DeepRequired<T> = T extends object
  ? { [P in keyof T]-?: DeepRequired<T[P]> }
  : T;

// DeepReadonly: 全プロパティを再帰的に読み取り専用に
type DeepReadonly<T> = T extends (infer R)[]
  ? DeepReadonlyArray<R>
  : T extends object
  ? DeepReadonlyObject<T>
  : T;

type DeepReadonlyArray<T> = ReadonlyArray<DeepReadonly<T>>;
type DeepReadonlyObject<T> = { readonly [P in keyof T]: DeepReadonly<T[P]> };

// 使用例
type Config = {
  server: { host: string; port: number };
  database: { url: string; maxConnections: number };
  features: { auth: boolean; logging: boolean };
};

type PartialConfig = DeepPartial<Config>;
// server.host も server.port も全部 Optional になる

const partialConfig: PartialConfig = {
  server: { host: 'localhost' },  // port は省略可能
};

// PathValue: パス文字列でオブジェクトの値型を取得
type PathValue<T, P extends string> =
  P extends `${infer Key}.${infer Rest}`
    ? Key extends keyof T
      ? PathValue<T[Key], Rest>
      : never
    : P extends keyof T
    ? T[P]
    : never;

type HostType = PathValue<Config, 'server.host'>;  // string
type PortType = PathValue<Config, 'server.port'>;  // number
```

---

## 14. API型定義のベストプラクティス

バックエンドAPIとの連携で型安全性を最大化するパターンです。

```typescript
// RESTful APIの型定義パターン
type ApiResponse<T> = {
  data: T;
  meta: {
    timestamp: string;
    requestId: string;
  };
};

type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
};

type ApiError = {
  code: string;
  message: string;
  details?: Record<string, string[]>;
};

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

// 型安全なAPIクライアント
class TypedApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async get<T>(path: string): Promise<ApiResult<T>> {
    try {
      const res = await fetch(`${this.baseUrl}${path}`);
      if (!res.ok) {
        const error: ApiError = await res.json();
        return { ok: false, error };
      }
      const data: T = await res.json();
      return { ok: true, data };
    } catch (err) {
      return {
        ok: false,
        error: { code: 'NETWORK_ERROR', message: String(err) },
      };
    }
  }
}

// エンドポイント定義のマップ型
type ApiEndpoints = {
  '/users': { GET: User[]; POST: { name: string; email: string } };
  '/users/:id': { GET: User; PUT: Partial<User>; DELETE: void };
  '/products': { GET: Product[]; POST: Omit<Product, 'id'> };
};
```

---

## 15. tsconfigの重要オプション

型安全性を最大化するために押さえておくべき設定です。

```json
{
  "compilerOptions": {
    // 厳格モード（これだけで多くのオプションが有効になる）
    "strict": true,

    // インデックスアクセスの型安全化（TypeScript 4.1+）
    // arr[0] の型が T | undefined になる
    "noUncheckedIndexedAccess": true,

    // 使われていないローカル変数をエラーに
    "noUnusedLocals": true,

    // 使われていない関数パラメータをエラーに
    "noUnusedParameters": true,

    // switch文のfall-throughをエラーに
    "noFallthroughCasesInSwitch": true,

    // 暗黙のanyを禁止（strict に含まれるが明示的に）
    "noImplicitAny": true,

    // null/undefined チェックを厳格に（strict に含まれる）
    "strictNullChecks": true,

    // 関数型の引数の反変チェック
    "strictFunctionTypes": true,

    // exactOptionalPropertyTypes（TypeScript 4.4+）
    // undefined を明示的に設定できないようにする
    "exactOptionalPropertyTypes": true
  }
}
```

### noUncheckedIndexedAccess の効果

```typescript
// noUncheckedIndexedAccess: true の場合
const arr = [1, 2, 3];
const first = arr[0];  // number | undefined

// 安全にアクセスするには
if (first !== undefined) {
  console.log(first * 2);  // ここでは number
}

// Record のインデックスアクセスも同様
const map: Record<string, number> = {};
const value = map['key'];  // number | undefined
```

---

## 16. Template Literal Types で型安全なイベントシステム

```typescript
type EventMap = {
  click: { x: number; y: number };
  keydown: { key: string; ctrlKey: boolean };
  resize: { width: number; height: number };
};

type EventName = keyof EventMap;
type EventHandler<T extends EventName> = (event: EventMap[T]) => void;

// on/off/emit が完全に型安全
class TypedEventEmitter {
  private handlers: Partial<{ [K in EventName]: EventHandler<K>[] }> = {};

  on<T extends EventName>(event: T, handler: EventHandler<T>): void {
    if (!this.handlers[event]) {
      this.handlers[event] = [] as EventHandler<T>[];
    }
    (this.handlers[event] as EventHandler<T>[]).push(handler);
  }

  emit<T extends EventName>(event: T, data: EventMap[T]): void {
    this.handlers[event]?.forEach((handler) => {
      (handler as EventHandler<T>)(data);
    });
  }
}

const emitter = new TypedEventEmitter();

emitter.on('click', (e) => {
  console.log(e.x, e.y);  // 型推論で x, y が確定
});

emitter.emit('click', { x: 10, y: 20 });       // OK
emitter.emit('click', { key: 'Enter' });        // エラー！
emitter.emit('keydown', { key: 'a', ctrlKey: false });  // OK
```

---

## 17. Variance（型の変位）を理解する

共変・反変の理解は高度な型設計の基礎です。

```typescript
// 共変（Covariant）: 戻り値型は共変
type Producer<T> = () => T;

type StringProducer = Producer<string>;
type NumberProducer = Producer<number>;

// string extends string | number なので
// Producer<string> extends Producer<string | number>
// → 戻り値型は「より具体的」なものが代入可能

// 反変（Contravariant）: 引数型は反変（strictFunctionTypes: true の場合）
type Consumer<T> = (value: T) => void;

function processStringOrNumber(consumer: Consumer<string | number>) {
  consumer('hello');
}

const stringConsumer: Consumer<string> = (s) => console.log(s.toUpperCase());

// stringConsumer は string しか受け付けないので代入不可
// processStringOrNumber(stringConsumer);  // エラー

const anyConsumer: Consumer<string | number> = (v) => console.log(v);
processStringOrNumber(anyConsumer);  // OK
```

---

## 18. 型レベルプログラミング：フィボナッチ数列

TypeScriptの型システムはチューリング完全です。型レベルで計算を行う例を示します（実用例というより学習目的）。

```typescript
// 数値を型レベルのタプル長として表現
type BuildTuple<L extends number, T extends unknown[] = []> =
  T['length'] extends L ? T : BuildTuple<L, [...T, unknown]>;

// 加算
type Add<A extends number, B extends number> =
  [...BuildTuple<A>, ...BuildTuple<B>]['length'];

type Sum = Add<3, 4>;  // 7

// 比較
type LessThan<A extends number, B extends number> =
  BuildTuple<A> extends [...BuildTuple<B>, ...infer _] ? false : true;

type IsLess = LessThan<3, 5>;   // true
type IsMore = LessThan<10, 5>;  // false
```

---

## 19. モジュール拡張（Declaration Merging）

既存のライブラリの型を安全に拡張するパターンです。

```typescript
// Expressのリクエスト型を拡張
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'admin' | 'user';
      };
    }
  }
}

// Window オブジェクトに独自プロパティを追加
declare global {
  interface Window {
    analytics: {
      track(event: string, properties?: Record<string, unknown>): void;
    };
  }
}

// 外部モジュールの型を拡張
declare module 'some-library' {
  interface SomeInterface {
    customMethod(): void;
  }
}
```

---

## 20. 実務で使えるカスタム型ライブラリ

よく使うパターンをまとめたカスタム型コレクションです。

```typescript
// 少なくとも1つの要素を持つ配列
type NonEmptyArray<T> = [T, ...T[]];

// オブジェクトの特定のキーを必須にする
type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

// オブジェクトの特定のキーを除いて全てOptional
type PartialExcept<T, K extends keyof T> = Partial<Omit<T, K>> & Pick<T, K>;

// 2つの型の共通部分のみ
type CommonProps<T, U> = Pick<T, Extract<keyof T, keyof U>>;

// 関数の引数を1つ固定するカリー化型
type Curry<T extends (...args: any[]) => any> =
  Parameters<T> extends [infer First, ...infer Rest]
    ? (arg: First) => Rest extends []
      ? ReturnType<T>
      : (...args: Rest) => ReturnType<T>
    : ReturnType<T>;

// Null/Undefined を除いた型
type Defined<T> = Exclude<T, null | undefined>;

// オブジェクトのネストしたパスの型
type Paths<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends object
    ? Paths<T[K], `${Prefix}${K}.`> | `${Prefix}${K}`
    : `${Prefix}${K}`;
}[keyof T & string];

type ConfigPaths = Paths<Config>;
// 'server' | 'server.host' | 'server.port' | 'database' | ...
```

---

## まとめ

TypeScriptの型システムを深く理解すると、バグをコンパイル時に検出でき、チームメンバーへの仕様伝達もコードで行えるようになります。

今回紹介した20のパターンを実務に取り入れるためのロードマップ:

1. **今すぐ使える**: Discriminated Unions, Branded Types, satisfies 演算子
2. **1週間で習得**: infer キーワード, マップ型の応用, テンプレートリテラル型
3. **1ヶ月で習得**: 再帰型, 型レベルプログラミング, Variance の理解

すべてのパターンを一度に覚える必要はありません。コードレビューやバグ修正の中で「このパターンを使えば解決できる」という場面に気づいたとき、この記事に戻ってきてください。

型安全なTypeScriptコードは、長期的なメンテナンスコストを大幅に削減し、チーム全体の生産性向上につながります。ぜひ実プロジェクトで試してみてください。

---

## スキルアップ・キャリアアップのおすすめリソース

TypeScriptの高度なパターンを習得したら、次のステップとしてキャリアアップを検討してみてほしい。

### 転職・キャリアアップ
- **[レバテックキャリア](https://levtech.jp)** — ITエンジニア専門の転職エージェント。TypeScriptエンジニアの需要は高く、フロントエンド・バックエンド双方の求人が豊富。無料相談可能。
- **[Findy](https://findy-job.com)** — GitHubのTypeScriptリポジトリが評価対象。スカウト型でリモート・フルフレックスの求人が充実している。

### オンライン学習
- **[Udemy](https://www.udemy.com)** — TypeScript上級者向けのコースが充実。Zodや型レベルプログラミングの実践的なコースも多い。セール時は大幅割引。

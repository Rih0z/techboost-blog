---
title: 'TypeScript 5.x新機能完全ガイド2026 - Decorators、const型パラメータ、satisfies、using宣言、推論改善徹底解説'
description: 'TypeScript 5.0〜5.6の新機能を完全網羅。Decorators、const型パラメータ、satisfies演算子、using宣言、推論改善まで実践的に解説'
pubDate: 'Feb 05 2026'
tags: ['TypeScript', 'JavaScript', 'プログラミング言語', '型システム']
---

# TypeScript 5.x新機能完全ガイド2026

TypeScript 5.xシリーズは、多くの革新的機能を導入しました。本記事では、5.0から5.6までの主要機能を実践的なコード例とともに徹底解説します。

## 目次

1. Decorators（5.0）
2. const型パラメータ（5.0）
3. satisfies演算子の進化（5.0+）
4. using宣言とDisposable（5.2）
5. 推論改善（5.0〜5.6）
6. Import Attributes（5.3）
7. 型述語の改善（5.5）
8. パフォーマンス改善
9. 実践的なパターン

## Decorators（5.0）

### Stage 3 Decoratorsのサポート

TypeScript 5.0でECMAScript Stage 3のデコレータ仕様に対応しました。

```typescript
// クラスデコレータ
function sealed(constructor: Function) {
  Object.seal(constructor);
  Object.seal(constructor.prototype);
}

@sealed
class BugReport {
  type = "report";
  title: string;

  constructor(title: string) {
    this.title = title;
  }
}

// メソッドデコレータ
function log(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]) {
    console.log(`Calling ${propertyKey} with args:`, args);
    const result = originalMethod.apply(this, args);
    console.log(`Result:`, result);
    return result;
  };

  return descriptor;
}

class Calculator {
  @log
  add(a: number, b: number): number {
    return a + b;
  }
}

const calc = new Calculator();
calc.add(2, 3);
// ログ出力:
// Calling add with args: [2, 3]
// Result: 5
```

### 高度なデコレータパターン

```typescript
// パラメータを受け取るデコレータ
function throttle(milliseconds: number) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    let lastRun = 0;
    let timeout: NodeJS.Timeout | null = null;

    descriptor.value = function (...args: any[]) {
      const now = Date.now();

      if (timeout) {
        clearTimeout(timeout);
      }

      if (now - lastRun >= milliseconds) {
        lastRun = now;
        return originalMethod.apply(this, args);
      } else {
        timeout = setTimeout(() => {
          lastRun = Date.now();
          originalMethod.apply(this, args);
        }, milliseconds - (now - lastRun));
      }
    };

    return descriptor;
  };
}

class SearchComponent {
  @throttle(300)
  handleSearch(query: string) {
    console.log("Searching for:", query);
    // API呼び出しなど
  }
}
```

### プロパティデコレータ

```typescript
// バリデーションデコレータ
function MinLength(min: number) {
  return function (target: any, propertyKey: string) {
    let value: string;

    const getter = function () {
      return value;
    };

    const setter = function (newValue: string) {
      if (newValue.length < min) {
        throw new Error(
          `${propertyKey} must be at least ${min} characters long`
        );
      }
      value = newValue;
    };

    Object.defineProperty(target, propertyKey, {
      get: getter,
      set: setter,
      enumerable: true,
      configurable: true,
    });
  };
}

function Email() {
  return function (target: any, propertyKey: string) {
    let value: string;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const getter = function () {
      return value;
    };

    const setter = function (newValue: string) {
      if (!emailRegex.test(newValue)) {
        throw new Error(`${propertyKey} must be a valid email`);
      }
      value = newValue;
    };

    Object.defineProperty(target, propertyKey, {
      get: getter,
      set: setter,
      enumerable: true,
      configurable: true,
    });
  };
}

class User {
  @MinLength(3)
  username!: string;

  @Email()
  email!: string;
}

const user = new User();
user.username = "ab"; // エラー: username must be at least 3 characters long
user.email = "invalid"; // エラー: email must be a valid email
```

### デコレータコンポジション

```typescript
// 複数のデコレータを組み合わせる
function Autobind(
  _target: any,
  _propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;
  const adjustedDescriptor: PropertyDescriptor = {
    configurable: true,
    enumerable: false,
    get() {
      return originalMethod.bind(this);
    },
  };
  return adjustedDescriptor;
}

function Memoize(
  _target: any,
  _propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;
  const cache = new Map();

  descriptor.value = function (...args: any[]) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      console.log("Returning cached result");
      return cache.get(key);
    }

    const result = originalMethod.apply(this, args);
    cache.set(key, result);
    return result;
  };

  return descriptor;
}

class DataService {
  @Autobind
  @Memoize
  expensiveCalculation(n: number): number {
    console.log("Computing...");
    let result = 0;
    for (let i = 0; i < n; i++) {
      result += i;
    }
    return result;
  }
}

const service = new DataService();
const boundMethod = service.expensiveCalculation;
boundMethod(1000); // Computing... と表示
boundMethod(1000); // Returning cached result と表示
```

## const型パラメータ（5.0）

### 基本的な使い方

```typescript
// const型パラメータで literal型を保持
function createConfig<const T>(config: T) {
  return config;
}

// 従来の方法
const config1 = createConfig({ mode: "development", port: 3000 });
// 型: { mode: string; port: number; }

// const型パラメータを使用
const config2 = createConfig({ mode: "development", port: 3000 } as const);
// 型: { readonly mode: "development"; readonly port: 3000; }

// TypeScript 5.0以降は自動的にliteral型を推論
function createConfigAuto<const T>(config: T) {
  return config;
}

const config3 = createConfigAuto({ mode: "development", port: 3000 });
// 型: { mode: "development"; port: 3000; }（自動的にliteral型）
```

### 実践的な例

```typescript
// ルート定義
function defineRoutes<const T extends Record<string, string>>(routes: T) {
  return routes;
}

const routes = defineRoutes({
  home: "/",
  about: "/about",
  users: "/users/:id",
} as const);

// 型: {
//   readonly home: "/";
//   readonly about: "/about";
//   readonly users: "/users/:id";
// }

// 型安全なルーティング
type Route = (typeof routes)[keyof typeof routes];
// 型: "/" | "/about" | "/users/:id"

function navigate(route: Route) {
  console.log(`Navigating to ${route}`);
}

navigate(routes.home); // OK
navigate("/contact"); // エラー: "/contact" は Route 型に割り当てできません
```

### 配列での使用

```typescript
function tuple<const T extends readonly unknown[]>(...args: T) {
  return args;
}

// 従来
const arr1 = tuple("hello", 42, true);
// 型: (string | number | boolean)[]

// const型パラメータ
const arr2 = tuple("hello", 42, true);
// 型: readonly ["hello", 42, true]

// より厳密な型チェックが可能
function processUser<const T extends readonly [string, number, boolean]>(
  data: T
) {
  const [name, age, active] = data;
  // name: string, age: number, active: boolean
}

processUser(["Alice", 30, true]); // OK
processUser(["Bob", 25]); // エラー: 引数が足りない
```

## satisfies演算子の進化

### 基本的な使い方

```typescript
// satisfies演算子で型チェックしつつ literal型を保持
type Color = "red" | "green" | "blue";

type ColorConfig = {
  primary: Color;
  secondary: Color;
  accent?: Color;
};

// 従来の方法（型アノテーション）
const config1: ColorConfig = {
  primary: "red",
  secondary: "green",
  accent: "blue",
};
// config1.primary の型は Color（"red" | "green" | "blue"）

// satisfies演算子を使用
const config2 = {
  primary: "red",
  secondary: "green",
  accent: "blue",
} satisfies ColorConfig;
// config2.primary の型は "red"（literal型を保持）

// 型エラーを検出しつつ literal型を維持
const config3 = {
  primary: "red",
  secondary: "yellow", // エラー: "yellow" は Color に割り当てできません
} satisfies ColorConfig;
```

### オブジェクトキーの型安全性

```typescript
type AllowedKeys = "name" | "age" | "email";

const user = {
  name: "Alice",
  age: 30,
  email: "alice@example.com",
} satisfies Record<AllowedKeys, unknown>;

// user.name の型は string（literal型ではない）
// しかし、不正なキーはコンパイルエラー

const invalidUser = {
  name: "Bob",
  age: 25,
  phone: "123-456", // エラー: phone は AllowedKeys にない
} satisfies Record<AllowedKeys, unknown>;
```

### 関数の戻り値での使用

```typescript
type ApiResponse<T> = {
  data: T;
  status: number;
  message: string;
};

function fetchUser(id: string) {
  return {
    data: { id, name: "Alice", age: 30 },
    status: 200,
    message: "Success",
  } satisfies ApiResponse<{ id: string; name: string; age: number }>;
}

const response = fetchUser("123");
// response.data.name の型は string
// response.status の型は 200（literal型）
```

### 配列要素の型チェック

```typescript
type Task = {
  id: number;
  title: string;
  completed: boolean;
};

const tasks = [
  { id: 1, title: "Buy groceries", completed: false },
  { id: 2, title: "Write code", completed: true },
  { id: 3, title: "Exercise", completed: false },
] satisfies Task[];

// 各要素の literal型を保持
tasks[0].completed; // 型: false
tasks[1].completed; // 型: true
```

## using宣言とDisposable（5.2）

### 基本的な使い方

```typescript
// Disposableインターフェースを実装
class FileHandle implements Disposable {
  constructor(private filename: string) {
    console.log(`Opening file: ${filename}`);
  }

  write(data: string) {
    console.log(`Writing to ${this.filename}: ${data}`);
  }

  [Symbol.dispose]() {
    console.log(`Closing file: ${this.filename}`);
  }
}

function processFile() {
  using file = new FileHandle("data.txt");
  file.write("Hello, World!");
  // スコープを抜ける時に自動的に [Symbol.dispose] が呼ばれる
}

processFile();
// 出力:
// Opening file: data.txt
// Writing to data.txt: Hello, World!
// Closing file: data.txt
```

### データベース接続の管理

```typescript
class DatabaseConnection implements AsyncDisposable {
  private connection: any;

  constructor(private connectionString: string) {}

  async connect() {
    console.log(`Connecting to ${this.connectionString}`);
    // 実際の接続処理
    this.connection = {}; // 仮の接続オブジェクト
  }

  async query(sql: string) {
    console.log(`Executing query: ${sql}`);
    // クエリ実行
    return [];
  }

  async [Symbol.asyncDispose]() {
    console.log("Closing database connection");
    // 接続を閉じる
    this.connection = null;
  }
}

async function fetchUsers() {
  await using db = new DatabaseConnection("postgresql://localhost/mydb");
  await db.connect();
  const users = await db.query("SELECT * FROM users");
  return users;
  // 関数を抜ける時に自動的に接続を閉じる
}
```

### リソース管理のベストプラクティス

```typescript
// ロック機構の実装
class Lock implements Disposable {
  private locked = false;

  acquire() {
    if (this.locked) {
      throw new Error("Lock is already acquired");
    }
    this.locked = true;
    console.log("Lock acquired");
  }

  release() {
    this.locked = false;
    console.log("Lock released");
  }

  [Symbol.dispose]() {
    if (this.locked) {
      this.release();
    }
  }
}

class ResourceManager {
  private lock = new Lock();

  criticalSection() {
    using _ = this.lock;
    this.lock.acquire();

    // クリティカルセクション
    console.log("Performing critical operation");

    // 例外が発生してもロックは自動的に解放される
    if (Math.random() > 0.5) {
      throw new Error("Something went wrong");
    }
  }
}

const manager = new ResourceManager();
try {
  manager.criticalSection();
} catch (error) {
  console.error(error);
}
// Lock は必ず解放される
```

### 複数リソースの管理

```typescript
class Transaction implements AsyncDisposable {
  constructor(private id: string) {
    console.log(`Transaction ${id} started`);
  }

  async commit() {
    console.log(`Transaction ${this.id} committed`);
  }

  async rollback() {
    console.log(`Transaction ${this.id} rolled back`);
  }

  async [Symbol.asyncDispose]() {
    console.log(`Transaction ${this.id} disposed`);
  }
}

async function performDatabaseOperation() {
  await using tx1 = new Transaction("tx1");
  await using tx2 = new Transaction("tx2");

  try {
    // 操作を実行
    await tx1.commit();
    await tx2.commit();
  } catch (error) {
    // エラー時は両方ロールバック
    await tx1.rollback();
    await tx2.rollback();
    throw error;
  }
  // スコープを抜ける時、tx2、tx1の順（逆順）で dispose される
}
```

## 推論改善（5.0〜5.6）

### テンプレートリテラル型の推論改善

```typescript
// TypeScript 5.0+
type Route = `/users/${string}` | `/posts/${string}`;

function navigate(route: Route) {
  console.log(`Navigating to ${route}`);
}

navigate("/users/123"); // OK
navigate("/posts/456"); // OK
navigate("/products/789"); // エラー

// より高度なテンプレートリテラル型
type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE";
type Endpoint = `/api/${string}`;
type ApiRoute = `${HTTPMethod} ${Endpoint}`;

const routes: ApiRoute[] = [
  "GET /api/users",
  "POST /api/users",
  "PUT /api/users/123",
  "DELETE /api/users/123",
];
```

### 条件型の推論改善

```typescript
// 再帰的な条件型
type Flatten<T> = T extends Array<infer U> ? Flatten<U> : T;

type Test1 = Flatten<number[]>; // number
type Test2 = Flatten<number[][]>; // number
type Test3 = Flatten<number[][][]>; // number

// より複雑な推論
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

type User = {
  name: string;
  address: {
    street: string;
    city: string;
  };
};

type ReadonlyUser = DeepReadonly<User>;
// {
//   readonly name: string;
//   readonly address: {
//     readonly street: string;
//     readonly city: string;
//   };
// }
```

### タプル型の推論改善

```typescript
// TypeScript 5.2+
function concat<T extends readonly unknown[], U extends readonly unknown[]>(
  arr1: T,
  arr2: U
): [...T, ...U] {
  return [...arr1, ...arr2];
}

const result = concat([1, 2], ["a", "b"]);
// 型: [number, number, string, string]

// 可変長引数の推論
function curry<T extends unknown[], U>(
  fn: (...args: T) => U
): (...args: T) => U {
  return fn;
}

const add = curry((a: number, b: number, c: number) => a + b + c);
// add の型: (a: number, b: number, c: number) => number
```

### 型ガードの推論改善

```typescript
// TypeScript 5.5+
function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

function process(value: unknown) {
  if (isString(value)) {
    console.log(value.toUpperCase()); // value は string
  } else if (isNumber(value)) {
    console.log(value.toFixed(2)); // value は number
  }
}

// より高度な型ガード
type Success<T> = { success: true; data: T };
type Failure = { success: false; error: string };
type Result<T> = Success<T> | Failure;

function isSuccess<T>(result: Result<T>): result is Success<T> {
  return result.success;
}

function handleResult<T>(result: Result<T>) {
  if (isSuccess(result)) {
    console.log(result.data); // result は Success<T>
  } else {
    console.log(result.error); // result は Failure
  }
}
```

## Import Attributes（5.3）

### JSON インポート

```typescript
// JSON ファイルをインポート
import data from "./config.json" with { type: "json" };

// 型安全なJSONインポート
interface Config {
  apiUrl: string;
  timeout: number;
}

import config from "./config.json" with { type: "json" } as Config;

console.log(config.apiUrl);
console.log(config.timeout);
```

### CSS Modules

```typescript
// CSS Modulesのインポート
import styles from "./Button.module.css" with { type: "css" };

function Button() {
  return <button className={styles.primary}>Click me</button>;
}
```

### カスタムインポート属性

```typescript
// カスタムローダーでの使用
import wasm from "./module.wasm" with { type: "webassembly" };

async function initWasm() {
  const instance = await WebAssembly.instantiate(wasm);
  return instance.exports;
}
```

## 型述語の改善（5.5）

### 複雑な型ガードの推論

```typescript
// TypeScript 5.5+
interface Dog {
  type: "dog";
  bark(): void;
}

interface Cat {
  type: "cat";
  meow(): void;
}

type Animal = Dog | Cat;

function isDog(animal: Animal): animal is Dog {
  return animal.type === "dog";
}

function processAnimal(animal: Animal) {
  if (isDog(animal)) {
    animal.bark(); // animal は Dog
  } else {
    animal.meow(); // animal は Cat（自動的に推論）
  }
}

// 配列の型ガード
function isStringArray(arr: unknown[]): arr is string[] {
  return arr.every((item) => typeof item === "string");
}

function processArray(arr: unknown[]) {
  if (isStringArray(arr)) {
    arr.forEach((str) => console.log(str.toUpperCase()));
  }
}
```

## パフォーマンス改善

### ビルド速度の向上

```json
// tsconfig.json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo",

    // TypeScript 5.0+ の最適化
    "moduleDetection": "force",
    "isolatedModules": true,

    // より高速な型チェック
    "skipLibCheck": true,
    "skipDefaultLibCheck": true
  }
}
```

### プロジェクトリファレンスの活用

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true
  }
}

// packages/core/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}

// packages/app/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "references": [
    { "path": "../core" }
  ],
  "compilerOptions": {
    "outDir": "dist"
  }
}
```

## 実践的なパターン

### 型安全なイベントエミッター

```typescript
type EventMap = {
  userLoggedIn: { userId: string; timestamp: Date };
  userLoggedOut: { userId: string };
  dataUpdated: { id: string; data: unknown };
};

class TypedEventEmitter<T extends Record<string, any>> {
  private listeners = new Map<keyof T, Set<Function>>();

  on<K extends keyof T>(event: K, listener: (data: T[K]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  emit<K extends keyof T>(event: K, data: T[K]) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((listener) => listener(data));
    }
  }

  off<K extends keyof T>(event: K, listener: (data: T[K]) => void) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
    }
  }
}

const emitter = new TypedEventEmitter<EventMap>();

emitter.on("userLoggedIn", (data) => {
  console.log(`User ${data.userId} logged in at ${data.timestamp}`);
});

emitter.emit("userLoggedIn", {
  userId: "123",
  timestamp: new Date(),
});

// 型エラー
emitter.emit("userLoggedIn", {
  userId: 123, // エラー: number は string に割り当てできません
  timestamp: new Date(),
});
```

### ビルダーパターン

```typescript
class QueryBuilder<T> {
  private whereClause: string[] = [];
  private orderByClause: string | null = null;
  private limitValue: number | null = null;

  where(condition: string): this {
    this.whereClause.push(condition);
    return this;
  }

  orderBy(field: keyof T, direction: "ASC" | "DESC" = "ASC"): this {
    this.orderByClause = `${String(field)} ${direction}`;
    return this;
  }

  limit(value: number): this {
    this.limitValue = value;
    return this;
  }

  build(): string {
    let query = "SELECT * FROM table";

    if (this.whereClause.length > 0) {
      query += ` WHERE ${this.whereClause.join(" AND ")}`;
    }

    if (this.orderByClause) {
      query += ` ORDER BY ${this.orderByClause}`;
    }

    if (this.limitValue !== null) {
      query += ` LIMIT ${this.limitValue}`;
    }

    return query;
  }
}

type User = {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
};

const query = new QueryBuilder<User>()
  .where("age > 18")
  .where("active = true")
  .orderBy("createdAt", "DESC")
  .limit(10)
  .build();

console.log(query);
// SELECT * FROM table WHERE age > 18 AND active = true ORDER BY createdAt DESC LIMIT 10
```

### 型安全なAPI クライアント

```typescript
type ApiEndpoints = {
  "/users": {
    GET: { response: User[] };
    POST: { body: { name: string; email: string }; response: User };
  };
  "/users/:id": {
    GET: { params: { id: string }; response: User };
    PUT: {
      params: { id: string };
      body: Partial<User>;
      response: User;
    };
    DELETE: { params: { id: string }; response: void };
  };
};

class ApiClient {
  async request<
    Path extends keyof ApiEndpoints,
    Method extends keyof ApiEndpoints[Path]
  >(
    method: Method,
    path: Path,
    options?: ApiEndpoints[Path][Method] extends { params: infer P }
      ? { params: P }
      : ApiEndpoints[Path][Method] extends { body: infer B }
      ? { body: B }
      : {}
  ): Promise<
    ApiEndpoints[Path][Method] extends { response: infer R } ? R : never
  > {
    // 実際のHTTPリクエスト処理
    const url = this.buildUrl(path, options?.params);
    const response = await fetch(url, {
      method: method as string,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });
    return response.json();
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    let url = `https://api.example.com${path}`;
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url = url.replace(`:${key}`, value);
      });
    }
    return url;
  }
}

const api = new ApiClient();

// 型安全なAPIコール
const users = await api.request("GET", "/users");
// users の型は User[]

const user = await api.request("GET", "/users/:id", {
  params: { id: "123" },
});
// user の型は User

await api.request("POST", "/users", {
  body: { name: "Alice", email: "alice@example.com" },
});

// 型エラー
await api.request("POST", "/users", {
  body: { name: "Bob" }, // エラー: email が必要
});
```

## まとめ

TypeScript 5.xシリーズは、型システムの表現力とパフォーマンスを大幅に向上させました。

**主要な新機能**:

1. **Decorators**: メタプログラミングの標準化
2. **const型パラメータ**: literal型の自動推論
3. **satisfies**: 型チェックとliteral型の両立
4. **using宣言**: 自動リソース管理
5. **推論改善**: より正確な型推論

**2026年のベストプラクティス**:
- Decoratorsで横断的関心事を分離
- const型パラメータで型安全性を向上
- using宣言でリソースリークを防止
- 型述語で正確な型ガード
- Import Attributesで静的アセット管理

これらの機能を活用して、より型安全で保守性の高いTypeScriptコードを書きましょう。

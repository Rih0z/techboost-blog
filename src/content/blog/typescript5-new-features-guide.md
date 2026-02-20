---
title: 'TypeScript 5.x完全ガイド：最新機能と実践テクニック'
description: 'TypeScript 5.0〜5.xの全新機能を徹底解説。Decorators・const型パラメータ・satisfies演算子・using宣言・Infer Extends・Variadic Tuple Types・Template Literal Types実践まで解説'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-3.jpg'
---

TypeScript 5.0は2023年3月にリリースされ、ECMAScript標準Decoratorsの実装・const型パラメータ・satisfies演算子など、開発体験を大きく向上させる機能が多数追加されました。その後5.1・5.2・5.3・5.4・5.5と矢継ぎ早にアップデートが続き、2026年現在のTypeScript 5.xシリーズは言語としての成熟度が格段に上がっています。

本記事では、TypeScript 5.0から5.xまでの主要新機能を体系的に解説します。各機能について実際のコード例を豊富に示しながら、実務での活用方法まで踏み込んで説明します。TypeScriptを日常的に使っている方が「そんな書き方ができたのか」と発見できる内容を目指しています。

---

## 1. TypeScript 5.xの概要とバージョン別新機能一覧

### 1.1 TypeScript 5.xシリーズの位置づけ

TypeScript 4.xシリーズが型システムの深化に注力していたとすれば、5.xシリーズは「開発者体験の改善」と「JavaScriptエコシステムとの統合」を重点テーマとしています。特にECMAScript標準への追随が加速しており、Decorators・Explicit Resource Management（using宣言）など、TC39プロセスを経た標準機能が次々と実装されています。

もう一つの大きなテーマはパフォーマンスです。TypeScript 5.0ではコンパイラ自体がESモジュール（ESM）へ移行し、内部アーキテクチャが刷新されました。これにより型チェックとビルドの速度が大幅に改善されています。

### 1.2 バージョン別新機能早見表

**TypeScript 5.0（2023年3月）**
- ECMAScript標準Decorators
- const型パラメータ
- tsconfig.extendsの配列サポート
- 列挙型（enum）の改善
- --moduleResolution bundler
- resolution-mode アサーション
- --verbatimModuleSyntax
- コンパイラ自体のESM移行（速度向上）

**TypeScript 5.1（2023年6月）**
- Unrelated Types for Getters and Setters
- Namespaced JSX Attribute support
- typeRoots設定の改善
- JSDocの@overloadサポート

**TypeScript 5.2（2023年8月）**
- using宣言（Explicit Resource Management）
- await using宣言
- Decorator Metadataサポート
- Tuple型のunnamed rest elements
- コピーメソッドの型サポート強化

**TypeScript 5.3（2023年11月）**
- Import Attributes（import assertions後継）
- resolution-mode in Import Types
- switch(true)の型絞り込み改善
- boolean比較の型絞り込み

**TypeScript 5.4（2024年3月）**
- Preserved Narrowing in Closures
- NoInfer型ユーティリティ
- Object.groupBy / Map.groupByのサポート
- throw式の型チェック改善

**TypeScript 5.5（2024年6月）**
- Inferred Type Predicates（型述語の自動推論）
- Control Flow Narrowingの改善
- Regular Expression Syntax Checking
- --isolatedDeclarations フラグ
- JSDoc @import タグ

**TypeScript 5.6（2024年9月）**
- Iterator Helper Methodsのサポート
- Strict Null Checksの改善
- --noUncheckedSideEffectImports

**TypeScript 5.7（2024年11月）**
- --target es2024の追加
- path rewriting for relative imports
- checks for never-initialized variables

### 1.3 インストールと環境確認

```bash
# 最新の TypeScript 5.x をインストール
npm install typescript@latest --save-dev

# バージョン確認
npx tsc --version
# TypeScript 5.7.x

# グローバルインストール
npm install -g typescript@latest
tsc --version
```

```json
// package.json の devDependencies
{
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0"
  }
}
```

---

## 2. Decorators（ECMAScript標準Decorators実装）

### 2.1 旧Decoratorsとの違い

TypeScript 4.x以前にも`experimentalDecorators`フラグで使えるDecoratorがありましたが、これはTC39のステージ1提案をベースにした独自実装でした。TypeScript 5.0が実装したのは、TC39のステージ3まで到達したECMAScript標準Decoratorsです。

両者は構文が似ているものの、セマンティクスが大きく異なります。

```typescript
// tsconfig.json -- 標準Decoratorsを使う場合
{
  "compilerOptions": {
    // experimentalDecorators は不要（むしろ競合するので外す）
    "target": "ES2022",
    "lib": ["ES2022"]
  }
}
```

```typescript
// 旧 experimentalDecorators スタイル（非推奨）
function log(target: any, key: string, descriptor: PropertyDescriptor) {
  const original = descriptor.value;
  descriptor.value = function (...args: any[]) {
    console.log(`Calling ${key} with`, args);
    return original.apply(this, args);
  };
  return descriptor;
}

class OldStyle {
  @log  // 旧スタイル
  greet(name: string) {
    return `Hello, ${name}`;
  }
}
```

```typescript
// 新 ECMAScript 標準 Decorators スタイル
function log<T extends (...args: unknown[]) => unknown>(
  target: T,
  context: ClassMethodDecoratorContext
): T {
  return function (this: unknown, ...args: Parameters<T>): ReturnType<T> {
    console.log(`Calling ${String(context.name)} with`, args);
    const result = target.apply(this, args) as ReturnType<T>;
    console.log(`Result:`, result);
    return result;
  } as T;
}

class NewStyle {
  @log  // 新スタイル
  greet(name: string) {
    return `Hello, ${name}`;
  }
}

const obj = new NewStyle();
obj.greet("TypeScript");
// Calling greet with ["TypeScript"]
// Result: Hello, TypeScript
```

### 2.2 Decoratorの種類と用途

ECMAScript標準Decoratorsには5種類あります。

**クラスDecorator**

```typescript
type ClassDecorator<T extends abstract new (...args: unknown[]) => unknown> = (
  target: T,
  context: ClassDecoratorContext<T>
) => T | void;

function sealed<T extends abstract new (...args: unknown[]) => unknown>(
  target: T,
  context: ClassDecoratorContext<T>
): void {
  context.addInitializer(function (this: unknown) {
    // インスタンス初期化時に実行される
  });
  Object.seal(target);
  Object.seal(target.prototype);
}

@sealed
class BugReport {
  type = "report";
  title: string;

  constructor(title: string) {
    this.title = title;
  }
}

// BugReport.prototype に後からプロパティを追加しようとするとエラー
```

**メソッドDecorator**

```typescript
function memoize<T extends object>(
  target: (this: T, ...args: unknown[]) => unknown,
  context: ClassMethodDecoratorContext<T>
) {
  const cache = new Map<string, unknown>();

  return function (this: T, ...args: unknown[]) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = target.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

class Calculator {
  @memoize
  fibonacci(n: number): number {
    if (n <= 1) return n;
    return this.fibonacci(n - 1) + this.fibonacci(n - 2);
  }
}

const calc = new Calculator();
console.log(calc.fibonacci(40)); // 初回は計算
console.log(calc.fibonacci(40)); // キャッシュから返す（高速）
```

**フィールドDecorator**

```typescript
function required<T>(
  target: undefined,
  context: ClassFieldDecoratorContext<unknown, T>
) {
  return function (this: unknown, value: T): T {
    if (value === undefined || value === null) {
      throw new Error(`Field "${String(context.name)}" is required`);
    }
    return value;
  };
}

function minLength(min: number) {
  return function <T extends string>(
    target: undefined,
    context: ClassFieldDecoratorContext<unknown, T>
  ) {
    return function (this: unknown, value: T): T {
      if (value.length < min) {
        throw new Error(
          `Field "${String(context.name)}" must be at least ${min} characters`
        );
      }
      return value;
    };
  };
}

class User {
  @required
  @minLength(3)
  name: string;

  @required
  email: string;

  constructor(name: string, email: string) {
    this.name = name;
    this.email = email;
  }
}

const user = new User("Alice", "alice@example.com"); // OK
// const user2 = new User("Al", "..."); // Error: minLength violation
```

**アクセサDecorator**

```typescript
function range(min: number, max: number) {
  return function <T extends number>(
    target: ClassAccessorDecoratorTarget<unknown, T>,
    context: ClassAccessorDecoratorContext<unknown, T>
  ): ClassAccessorDecoratorResult<unknown, T> {
    return {
      set(this: unknown, value: T) {
        if (value < min || value > max) {
          throw new RangeError(
            `Value ${value} is out of range [${min}, ${max}]`
          );
        }
        target.set.call(this, value);
      },
    };
  };
}

class Sensor {
  @range(0, 100)
  accessor temperature: number = 25;
}

const sensor = new Sensor();
sensor.temperature = 50; // OK
// sensor.temperature = 150; // RangeError
```

### 2.3 Decorator Metadata（TypeScript 5.2）

TypeScript 5.2ではTC39のDecorator Metadataプロポーザルがサポートされました。`Symbol.metadata`を通じてクラスとそのDecoratorがメタデータを共有できます。

```typescript
// Decorator Metadata を使ったバリデーションフレームワーク

interface ValidationRule {
  type: "required" | "min" | "max" | "pattern";
  value?: unknown;
  message: string;
}

const validationKey = Symbol("validation");

function validate(rules: ValidationRule[]) {
  return function (
    target: undefined,
    context: ClassFieldDecoratorContext
  ) {
    context.metadata[validationKey] ??= {};
    (context.metadata[validationKey] as Record<string, ValidationRule[]>)[
      String(context.name)
    ] = rules;
  };
}

class FormData {
  @validate([
    { type: "required", message: "名前は必須です" },
    { type: "min", value: 2, message: "名前は2文字以上です" },
  ])
  name: string = "";

  @validate([
    { type: "required", message: "メールアドレスは必須です" },
    {
      type: "pattern",
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: "有効なメールアドレスを入力してください",
    },
  ])
  email: string = "";
}

function validateInstance(instance: object): string[] {
  const metadata = (instance.constructor as { [Symbol.metadata]?: DecoratorMetadata })[Symbol.metadata];
  if (!metadata) return [];

  const rules = metadata[validationKey] as Record<string, ValidationRule[]> | undefined;
  if (!rules) return [];

  const errors: string[] = [];
  for (const [field, fieldRules] of Object.entries(rules)) {
    const value = (instance as Record<string, unknown>)[field];
    for (const rule of fieldRules) {
      if (rule.type === "required" && !value) {
        errors.push(rule.message);
      }
      if (rule.type === "min" && typeof value === "string" && value.length < (rule.value as number)) {
        errors.push(rule.message);
      }
    }
  }
  return errors;
}

const form = new FormData();
form.name = "A";
form.email = "";
console.log(validateInstance(form));
// ["名前は2文字以上です", "メールアドレスは必須です"]
```

---

## 3. const型パラメータ（const Type Parameters）

### 3.1 基本概念

TypeScript 5.0で導入されたconst型パラメータは、ジェネリクス関数に`const`修飾子を付けることで、引数を最も具体的なリテラル型として推論させる機能です。

```typescript
// const型パラメータなし -- 広い型に推論される
function makeArray<T>(value: T): T[] {
  return [value];
}

const arr1 = makeArray("hello");
// T は string に推論される
// arr1 の型は string[]

// const型パラメータあり -- リテラル型として推論される
function makeArrayConst<const T>(value: T): T[] {
  return [value];
}

const arr2 = makeArrayConst("hello");
// T は "hello" に推論される
// arr2 の型は "hello"[]
```

### 3.2 実用的なユースケース

**ルーター定義**

```typescript
// const型パラメータなしの問題
function defineRoutes<T extends Record<string, string>>(routes: T): T {
  return routes;
}

const routes1 = defineRoutes({
  home: "/",
  about: "/about",
  contact: "/contact",
});
// routes1 の型は Record<string, string> -- 具体的なキーが失われる

// const型パラメータで解決
function defineRoutesConst<const T extends Record<string, string>>(routes: T): T {
  return routes;
}

const routes2 = defineRoutesConst({
  home: "/",
  about: "/about",
  contact: "/contact",
});
// routes2 の型は { home: "/"; about: "/about"; contact: "/contact" }
// 各パスがリテラル型として保持される

type RouteName = keyof typeof routes2; // "home" | "about" | "contact"

function navigate(route: RouteName) {
  window.location.href = routes2[route];
}

navigate("home");   // OK
// navigate("blog"); // Error: "blog" は RouteName に含まれない
```

**イベントシステム**

```typescript
type EventMap = Record<string, unknown[]>;

class TypedEventEmitter<const TEvents extends EventMap> {
  private listeners = new Map<keyof TEvents, Set<(...args: unknown[]) => void>>();

  on<K extends keyof TEvents>(
    event: K,
    listener: (...args: TEvents[K]) => void
  ): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as (...args: unknown[]) => void);
    return this;
  }

  emit<K extends keyof TEvents>(event: K, ...args: TEvents[K]): void {
    this.listeners.get(event)?.forEach((listener) => listener(...args));
  }
}

const emitter = new TypedEventEmitter<{
  connect: [userId: string];
  disconnect: [userId: string, reason: string];
  message: [from: string, content: string, timestamp: Date];
}>();

emitter.on("connect", (userId) => {
  console.log(`User ${userId} connected`);
});

emitter.on("message", (from, content, timestamp) => {
  console.log(`[${timestamp.toISOString()}] ${from}: ${content}`);
});

emitter.emit("connect", "user-123");
emitter.emit("message", "Alice", "Hello!", new Date());
// emitter.emit("connect", 123); // Error: number は string に割り当て不可
```

**設定オブジェクトの型安全な構築**

```typescript
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

function defineConfig<const T>(config: T): DeepReadonly<T> {
  return Object.freeze(config) as DeepReadonly<T>;
}

const config = defineConfig({
  server: {
    host: "localhost",
    port: 3000,
    ssl: false,
  },
  database: {
    url: "postgresql://localhost:5432/mydb",
    poolSize: 10,
  },
  features: {
    darkMode: true,
    betaFeatures: false,
  },
});

// config.server.host は "localhost" 型（string ではない）
type ServerHost = typeof config.server.host; // "localhost"
type ServerPort = typeof config.server.port; // 3000

// config.server.port = 4000; // Error: readonly
```

### 3.3 配列・タプルへの適用

```typescript
// タプル型の精密な推論
function createStep<const T extends readonly string[]>(steps: T): {
  current: T[number];
  next: () => void;
  steps: T;
} {
  let index = 0;
  return {
    get current() {
      return steps[index] as T[number];
    },
    next() {
      if (index < steps.length - 1) index++;
    },
    steps,
  };
}

const wizard = createStep(["welcome", "account", "payment", "confirm"] as const);
// wizard.steps の型は readonly ["welcome", "account", "payment", "confirm"]
// wizard.current の型は "welcome" | "account" | "payment" | "confirm"

// const型パラメータを使うと as const が不要になる場合がある
function createStepV2<const T extends readonly string[]>(steps: T) {
  return steps;
}

const steps = createStepV2(["a", "b", "c"]);
// steps の型は readonly ["a", "b", "c"]（as const なしで）
```

---

## 4. satisfies演算子（型チェックと型推論の両立）

### 4.1 satisfiesが解決する問題

TypeScript 4.9で導入されたsatisfies演算子ですが、5.xで広く普及しました。型アサーション（`as`）と型注釈（`: Type`）の中間的な役割を果たします。

```typescript
// 問題：型注釈を使うと具体的な型が失われる
type Color = "red" | "green" | "blue";
type Palette = Record<Color, string | [number, number, number]>;

const palette1: Palette = {
  red: [255, 0, 0],
  green: "#00ff00",
  blue: [0, 0, 255],
};

// palette1.red は string | [number, number, number] 型
// .map() が使えない！
// palette1.red.map(v => v * 2); // Error

// 問題：型注釈なしだと型チェックが機能しない
const palette2 = {
  red: [255, 0, 0],
  green: "#00ff00",
  blue: [0, 0, 255],
  // purple: "..." // タイポしてもエラーにならない
};

// satisfies で両立
const palette3 = {
  red: [255, 0, 0],
  green: "#00ff00",
  blue: [0, 0, 255],
} satisfies Palette;

// Palette の制約でチェックされる（不正なキーはエラー）
// 各値は具体的な型として推論される
palette3.red.map((v) => v * 2);     // OK！[number, number, number] と推論
palette3.green.toUpperCase();        // OK！string と推論
// palette3.red.toUpperCase();       // Error：string メソッドは配列にない
```

### 4.2 satisfiesの実践パターン

**設定オブジェクトの型安全な定義**

```typescript
interface AppConfig {
  env: "development" | "production" | "test";
  server: {
    port: number;
    host: string;
    timeout: number;
  };
  logging: {
    level: "debug" | "info" | "warn" | "error";
    format: "json" | "text";
  };
  features: Record<string, boolean>;
}

const config = {
  env: "development",
  server: {
    port: 3000,
    host: "localhost",
    timeout: 5000,
  },
  logging: {
    level: "debug",
    format: "text",
  },
  features: {
    newDashboard: true,
    betaApi: false,
    darkMode: true,
  },
} satisfies AppConfig;

// config.env は "development" 型（string ではない）
type Env = typeof config.env; // "development"

// features の各値は boolean として推論される
const isDarkMode: boolean = config.features.darkMode;
```

**関数の戻り値型チェック**

```typescript
type ApiResponse<T> = {
  data: T;
  status: number;
  message: string;
  timestamp: Date;
};

function createUserResponse(user: { id: string; name: string; email: string }) {
  return {
    data: user,
    status: 200,
    message: "Success",
    timestamp: new Date(),
    // extra: "unexpected" // satisfies があればここでエラー
  } satisfies ApiResponse<typeof user>;
}

const response = createUserResponse({
  id: "1",
  name: "Alice",
  email: "alice@example.com",
});

// response.data の型は { id: string; name: string; email: string }
// satisfies がなければ ApiResponse<...>['data'] になってしまう
response.data.name.toUpperCase(); // OK
```

**マップ型との組み合わせ**

```typescript
type Permission = "read" | "write" | "delete" | "admin";
type RolePermissions = Record<string, Permission[]>;

const roleConfig = {
  guest: ["read"],
  user: ["read", "write"],
  moderator: ["read", "write", "delete"],
  admin: ["read", "write", "delete", "admin"],
} satisfies RolePermissions;

// 各ロールのパーミッションは具体的なリテラル型の配列として推論される
type AdminPerms = typeof roleConfig.admin; // ("read" | "write" | "delete" | "admin")[]

function hasPermission(
  role: keyof typeof roleConfig,
  permission: Permission
): boolean {
  return roleConfig[role].includes(permission);
}

hasPermission("admin", "delete"); // OK
// hasPermission("superuser", "read"); // Error：不正なロール
```

---

## 5. using宣言（Explicit Resource Management）

### 5.1 リソース管理の問題と解決

TypeScript 5.2でサポートされた`using`宣言は、TC39のExplicit Resource Management提案を実装したものです。ファイルハンドル・データベース接続・タイマーなどのリソースを安全に解放するための仕組みです。

```typescript
// 従来のリソース管理（try-finally）
async function processFileOld(path: string) {
  const file = await openFile(path);
  try {
    const data = await file.read();
    return processData(data);
  } finally {
    await file.close(); // 必ず呼ぶ必要がある
  }
}

// using宣言を使った新しいリソース管理
async function processFileNew(path: string) {
  await using file = await openFile(path); // スコープ終了時に自動でclose
  const data = await file.read();
  return processData(data); // 例外が起きても file.close() が呼ばれる
}
```

### 5.2 Symbol.disposeの実装

`using`を使うには、オブジェクトに`Symbol.dispose`（同期）または`Symbol.asyncDispose`（非同期）を実装する必要があります。

```typescript
// 同期リソース
class DatabaseConnection {
  private connection: unknown;
  private isOpen = false;

  constructor(url: string) {
    // 接続を確立
    this.connection = { url }; // 実際はドライバAPIを使用
    this.isOpen = true;
    console.log(`Connected to ${url}`);
  }

  query(sql: string): unknown[] {
    if (!this.isOpen) throw new Error("Connection is closed");
    // クエリ実行
    return [];
  }

  [Symbol.dispose]() {
    if (this.isOpen) {
      // 接続を閉じる処理
      this.isOpen = false;
      console.log("Connection closed");
    }
  }
}

function executeQuery(sql: string) {
  using db = new DatabaseConnection("postgresql://localhost/mydb");
  const results = db.query(sql);
  return results;
  // ここで db[Symbol.dispose]() が自動的に呼ばれる
}
```

**非同期リソース管理**

```typescript
class AsyncFileHandle {
  private handle: unknown;

  static async open(path: string): Promise<AsyncFileHandle> {
    const handle = new AsyncFileHandle();
    // 非同期でファイルを開く
    handle.handle = { path };
    return handle;
  }

  async read(): Promise<string> {
    // ファイル読み取り
    return "file content";
  }

  async write(data: string): Promise<void> {
    // ファイル書き込み
    console.log(`Writing: ${data}`);
  }

  async [Symbol.asyncDispose]() {
    // 非同期でリソースを解放
    console.log("File handle closed");
    this.handle = null;
  }
}

async function processFile(path: string, data: string) {
  await using file = await AsyncFileHandle.open(path);
  const content = await file.read();
  console.log(`Current content: ${content}`);
  await file.write(data);
  // スコープ終了時に await file[Symbol.asyncDispose]() が呼ばれる
}
```

### 5.3 DisposableStackとAsyncDisposableStack

複数のリソースをまとめて管理するためのスタック型ユーティリティも提供されています。

```typescript
async function complexOperation() {
  using stack = new DisposableStack();

  // リソースを登録（スタックのLIFO順で解放される）
  const connection = stack.use(new DatabaseConnection("db://localhost/main"));
  const cache = stack.use(new CacheConnection("redis://localhost:6379"));

  // 関数の登録も可能
  stack.defer(() => {
    console.log("Cleanup callback executed");
  });

  // 処理
  const data = connection.query("SELECT * FROM users");
  cache.set("users", data);

  return data;
  // スコープ終了時に cache, connection の順で解放（登録の逆順）
}

// 型定義（lib.esnext.disposable を有効にする必要がある）
// tsconfig.json で lib: ["ES2022", "ESNext.Disposable"] を追加

class CacheConnection {
  private isOpen = true;

  set(key: string, value: unknown): void {
    if (!this.isOpen) throw new Error("Cache connection is closed");
    console.log(`Cache set: ${key}`);
  }

  [Symbol.dispose]() {
    this.isOpen = false;
    console.log("Cache connection closed");
  }
}
```

### 5.4 実用的なユースケース

**テストの前後処理**

```typescript
class TestDatabase {
  private transactions: string[] = [];

  beginTransaction(): void {
    this.transactions.push("BEGIN");
  }

  rollback(): void {
    this.transactions.push("ROLLBACK");
    console.log("Transaction rolled back");
  }

  [Symbol.dispose]() {
    this.rollback();
  }
}

// テスト関数内でusingを使ってロールバックを保証
async function testUserCreation() {
  using db = new TestDatabase();
  db.beginTransaction();

  // テスト処理（例外が起きても自動でrollback）
  const user = { id: "test-1", name: "Test User" };
  // await createUser(db, user);
  // await assertUserExists(db, user.id);

  console.log("Test passed");
  // using スコープ終了 -> db[Symbol.dispose]() -> rollback()
}

/**
 * タイマーの自動クリア
 */
class ManagedInterval {
  private id: ReturnType<typeof setInterval>;

  constructor(callback: () => void, ms: number) {
    this.id = setInterval(callback, ms);
    console.log(`Interval started (${ms}ms)`);
  }

  [Symbol.dispose]() {
    clearInterval(this.id);
    console.log("Interval cleared");
  }
}

function startMonitoring() {
  using monitor = new ManagedInterval(() => {
    console.log("Health check...");
  }, 1000);

  // 5秒後に関数が終了 -> monitor が自動クリア
  // （実際には await や条件で制御）
}
```

---

## 6. Infer Extends（条件型の改善）

### 6.1 Infer Extendsの基本

TypeScript 5.xでは条件型における`infer`キーワードに`extends`制約を追加できるようになりました。これにより、推論した型変数に対して即座に制約をかけられます。

```typescript
// 従来の方法（冗長）
type GetStringProp<T> = T extends { prop: infer V }
  ? V extends string
    ? V
    : never
  : never;

// Infer Extends を使った簡潔な記法
type GetStringPropNew<T> = T extends { prop: infer V extends string }
  ? V
  : never;

type Test1 = GetStringPropNew<{ prop: "hello" }>; // "hello"
type Test2 = GetStringPropNew<{ prop: 42 }>;       // never
type Test3 = GetStringPropNew<{ prop: string }>;   // string
```

### 6.2 実践的なユースケース

**配列の要素型抽出（制約付き）**

```typescript
// 数値配列の要素型のみ取得
type NumberArrayElement<T> = T extends readonly (infer E extends number)[]
  ? E
  : never;

type N1 = NumberArrayElement<number[]>;       // number
type N2 = NumberArrayElement<[1, 2, 3]>;      // 1 | 2 | 3
type N3 = NumberArrayElement<string[]>;       // never
type N4 = NumberArrayElement<(string | number)[]>; // never（制約を満たさない）

// 文字列ユニオン型のフィルタリング
type FilterStringKeys<T> = {
  [K in keyof T]: T[K] extends string ? K : never;
}[keyof T];

// Infer Extends と組み合わせた高度な型
type ExtractPromiseValue<T> = T extends Promise<infer V extends object>
  ? V
  : never;

type P1 = ExtractPromiseValue<Promise<{ id: number; name: string }>>; // { id: number; name: string }
type P2 = ExtractPromiseValue<Promise<string>>; // never（string は object でない）
type P3 = ExtractPromiseValue<string>;          // never
```

**タプル操作の改善**

```typescript
// タプルの最初の要素（文字列のみ）
type FirstString<T extends readonly unknown[]> =
  T extends readonly [infer F extends string, ...unknown[]]
    ? F
    : never;

type FS1 = FirstString<["hello", 1, true]>; // "hello"
type FS2 = FirstString<[42, "world"]>;      // never
type FS3 = FirstString<[]>;                 // never

// 再帰的なタプル処理
type FilterStringTuple<T extends readonly unknown[]> =
  T extends readonly [infer H, ...infer Rest]
    ? H extends string
      ? [H, ...FilterStringTuple<Rest>]
      : FilterStringTuple<Rest>
    : [];

type FST1 = FilterStringTuple<["a", 1, "b", true, "c"]>; // ["a", "b", "c"]
type FST2 = FilterStringTuple<[1, 2, 3]>;                // []
```

**関数シグネチャの型操作**

```typescript
// 特定の戻り値型を持つ関数型のみ抽出
type ExtractAsyncFunctions<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => Promise<infer R extends object>
    ? T[K]
    : never;
}[keyof T];

interface ApiService {
  getUser(id: string): Promise<{ id: string; name: string }>;
  getUserCount(): Promise<number>;   // objectでないので除外される
  createUser(data: unknown): Promise<{ id: string }>;
  deleteUser(id: string): void;      // Promiseでないので除外される
}

type AsyncObjectMethods = ExtractAsyncFunctions<ApiService>;
// Promise<object> を返すメソッドの型のみが残る
```

---

## 7. Variadic Tuple Types応用

### 7.1 Variadic Tuple Typesの復習と5.x改善点

Variadic Tuple Types（可変長タプル型）はTypeScript 4.0で導入されましたが、5.xシリーズでの型推論改善により、より複雑なパターンが実用的になりました。

```typescript
// 基本的な Variadic Tuple Types
type Concat<T extends unknown[], U extends unknown[]> = [...T, ...U];

type AB = Concat<[string, number], [boolean, Date]>;
// [string, number, boolean, Date]

// 先頭・末尾の型操作
type First<T extends unknown[]> = T extends [infer F, ...unknown[]] ? F : never;
type Last<T extends unknown[]> = T extends [...unknown[], infer L] ? L : never;
type Init<T extends unknown[]> = T extends [...infer I, unknown] ? I : never;
type Tail<T extends unknown[]> = T extends [unknown, ...infer T] ? T : never;

type F = First<[1, 2, 3]>; // 1
type L = Last<[1, 2, 3]>;  // 3
type I = Init<[1, 2, 3]>;  // [1, 2]
type T = Tail<[1, 2, 3]>;  // [2, 3]
```

### 7.2 実践的な型安全なパイプライン

```typescript
// 型安全な関数合成（pipe）
type Pipe<T extends ((...args: unknown[]) => unknown)[]> =
  T extends []
    ? () => void
    : T extends [infer F extends (...args: unknown[]) => unknown]
    ? F
    : T extends [
        infer F extends (...args: unknown[]) => unknown,
        ...infer Rest extends ((...args: unknown[]) => unknown)[]
      ]
    ? ReturnType<F> extends Parameters<Rest[0]>[0]
      ? (...args: Parameters<F>) => ReturnType<Last<Rest>>
      : never
    : never;

// シンプルな実装
function pipe<A, B>(f: (a: A) => B): (a: A) => B;
function pipe<A, B, C>(f: (a: A) => B, g: (b: B) => C): (a: A) => C;
function pipe<A, B, C, D>(f: (a: A) => B, g: (b: B) => C, h: (c: C) => D): (a: A) => D;
function pipe<A, B, C, D, E>(
  f: (a: A) => B,
  g: (b: B) => C,
  h: (c: C) => D,
  i: (d: D) => E
): (a: A) => E;
function pipe(...fns: ((...args: unknown[]) => unknown)[]) {
  return (value: unknown) => fns.reduce((acc, fn) => fn(acc), value);
}

const processUser = pipe(
  (id: string) => ({ id, name: "Alice" }),
  (user: { id: string; name: string }) => ({ ...user, email: `${user.name.toLowerCase()}@example.com` }),
  (user: { id: string; name: string; email: string }) => user.email.toUpperCase()
);

const result = processUser("user-1");
// result の型は string
console.log(result); // "ALICE@EXAMPLE.COM"
```

### 7.3 タプルを使ったZodライクなスキーマ

```typescript
// タプル型を活用した軽量バリデーションスキーマ
type Validator<T> = {
  validate: (value: unknown) => value is T;
  parse: (value: unknown) => T;
};

type InferSchema<T extends Validator<unknown>> = T extends Validator<infer U> ? U : never;

type ObjectSchemaInput = Record<string, Validator<unknown>>;
type InferObjectSchema<T extends ObjectSchemaInput> = {
  [K in keyof T]: InferSchema<T[K]>;
};

function object<T extends ObjectSchemaInput>(
  shape: T
): Validator<InferObjectSchema<T>> {
  return {
    validate(value: unknown): value is InferObjectSchema<T> {
      if (typeof value !== "object" || value === null) return false;
      return Object.entries(shape).every(([key, validator]) =>
        validator.validate((value as Record<string, unknown>)[key])
      );
    },
    parse(value: unknown): InferObjectSchema<T> {
      if (!this.validate(value)) {
        throw new Error("Validation failed");
      }
      return value;
    },
  };
}

const stringValidator: Validator<string> = {
  validate: (v): v is string => typeof v === "string",
  parse(v) {
    if (!this.validate(v)) throw new Error("Expected string");
    return v;
  },
};

const numberValidator: Validator<number> = {
  validate: (v): v is number => typeof v === "number",
  parse(v) {
    if (!this.validate(v)) throw new Error("Expected number");
    return v;
  },
};

const userSchema = object({
  id: numberValidator,
  name: stringValidator,
  email: stringValidator,
});

type User = InferSchema<typeof userSchema>;
// { id: number; name: string; email: string }

const user = userSchema.parse({ id: 1, name: "Alice", email: "alice@example.com" });
console.log(user.name.toUpperCase()); // "ALICE"
```

### 7.4 関数のオーバーロードをタプルで表現

```typescript
// 引数の組み合わせをタプルで型安全に表現
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

type RequestArgs =
  | [method: "GET", url: string]
  | [method: "POST", url: string, body: object]
  | [method: "PUT", url: string, body: object]
  | [method: "DELETE", url: string]
  | [method: "PATCH", url: string, body: Partial<object>];

async function request(...args: RequestArgs): Promise<Response> {
  const [method, url, body] = args as [string, string, object?];
  return fetch(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : {},
  });
}

// 型安全な呼び出し
request("GET", "https://api.example.com/users");
request("POST", "https://api.example.com/users", { name: "Alice" });
// request("POST", "https://api.example.com/users"); // Error: body が必要
// request("GET", "https://api.example.com", { data: 1 }); // Error: GET に body は不要
```

---

## 8. Template Literal Types実践

### 8.1 Template Literal Typesの高度な活用

Template Literal Types（テンプレートリテラル型）はTypeScript 4.1で導入されましたが、5.xでは型推論エンジンの改善により、より複雑なパターンが実用的になりました。

```typescript
// 基本的な Template Literal Types
type Greeting = `Hello, ${string}!`;
type EventName = `on${Capitalize<string>}`;

// 複数の Union を組み合わせた爆発的な型生成
type CSSUnit = "px" | "em" | "rem" | "vh" | "vw" | "%";
type CSSProperty = "margin" | "padding" | "border";
type CSSDirection = "top" | "right" | "bottom" | "left";

type CSSShorthand = `${CSSProperty}-${CSSDirection}`;
// "margin-top" | "margin-right" | ... | "padding-left" | ...

type CSSValue = `${number}${CSSUnit}`;
// `${number}px` | `${number}em` | etc.
```

### 8.2 URLパターンマッチング

```typescript
// RESTful API のパスから型安全なパラメータを抽出
type ExtractRouteParams<Path extends string> =
  Path extends `${infer _Start}:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof ExtractRouteParams<`/${Rest}`>]: string }
    : Path extends `${infer _Start}:${infer Param}`
    ? { [K in Param]: string }
    : Record<never, never>;

type UserParams = ExtractRouteParams<"/api/users/:userId/posts/:postId">;
// { userId: string; postId: string }

type SimpleParams = ExtractRouteParams<"/api/items/:id">;
// { id: string }

type NoParams = ExtractRouteParams<"/api/health">;
// {}

function createRoute<Path extends string>(
  path: Path,
  handler: (params: ExtractRouteParams<Path>) => Response
) {
  return { path, handler };
}

const userRoute = createRoute(
  "/api/users/:userId/posts/:postId",
  ({ userId, postId }) => {
    // userId と postId は string 型として推論される
    return new Response(`User ${userId}, Post ${postId}`);
  }
);
```

### 8.3 型安全なCSS-in-JS

```typescript
// CSS プロパティの型安全な表現
type CSSFlexDirection = "row" | "column" | "row-reverse" | "column-reverse";
type CSSJustifyContent =
  | "flex-start"
  | "flex-end"
  | "center"
  | "space-between"
  | "space-around"
  | "space-evenly";
type CSSAlignItems = "flex-start" | "flex-end" | "center" | "stretch" | "baseline";

type FlexConfig = {
  direction?: CSSFlexDirection;
  justify?: CSSJustifyContent;
  align?: CSSAlignItems;
  wrap?: boolean;
  gap?: `${number}px` | `${number}rem`;
};

function flex(config: FlexConfig): string {
  const props: string[] = ["display: flex"];
  if (config.direction) props.push(`flex-direction: ${config.direction}`);
  if (config.justify) props.push(`justify-content: ${config.justify}`);
  if (config.align) props.push(`align-items: ${config.align}`);
  if (config.wrap) props.push("flex-wrap: wrap");
  if (config.gap) props.push(`gap: ${config.gap}`);
  return props.join("; ");
}

const styles = flex({
  direction: "row",
  justify: "space-between",
  align: "center",
  gap: "16px",
  // gap: "16pt", // Error：px か rem のみ
});
```

### 8.4 イベント名の自動補完

```typescript
// DOM イベント名の型安全なマッピング
type DOMEventName = keyof HTMLElementEventMap;

type EventHandlerName<T extends string> = `on${Capitalize<T>}`;
type EventHandlerMap = {
  [K in DOMEventName as EventHandlerName<K>]?: (
    event: HTMLElementEventMap[K]
  ) => void;
};

// カスタムコンポーネントの Props
type ComponentProps = EventHandlerMap & {
  children?: unknown;
  className?: string;
  style?: Partial<CSSStyleDeclaration>;
};

const props: ComponentProps = {
  onClick: (e) => {
    // e は MouseEvent として推論される
    console.log(e.clientX, e.clientY);
  },
  onKeydown: (e) => {
    // e は KeyboardEvent として推論される
    if (e.key === "Enter") console.log("Enter pressed");
  },
  // onFoo: () => {} // Error：DOMEventName に "foo" は含まれない
};

// SQL タグ付きテンプレートの型安全化
type SQLColumn = string;
type SQLTable = string;
type SQLQuery<T extends string = string> = `SELECT ${string} FROM ${SQLTable}` & {
  __brand: T;
};

function sql<T extends string>(
  strings: TemplateStringsArray,
  ...values: (string | number)[]
): string {
  return strings.reduce((acc, str, i) => acc + str + (values[i] ?? ""), "");
}

const query = sql`SELECT id, name FROM users WHERE id = ${42}`;
```

---

## 9. 高度な型操作テクニック（Mapped Types・Conditional Types）

### 9.1 Mapped Typesの高度なパターン

```typescript
// キーの再マッピング（as 句）
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type Setters<T> = {
  [K in keyof T as `set${Capitalize<string & K>}`]: (value: T[K]) => void;
};

interface User {
  id: number;
  name: string;
  email: string;
}

type UserGetters = Getters<User>;
// { getId: () => number; getName: () => string; getEmail: () => string }

type UserSetters = Setters<User>;
// { setId: (value: number) => void; setName: (value: string) => void; ... }

// Observable パターン
type Observable<T> = Getters<T> & Setters<T> & {
  subscribe: (listener: (next: Partial<T>) => void) => () => void;
};

function createObservable<T extends object>(initial: T): Observable<T> {
  const state = { ...initial };
  const listeners = new Set<(next: Partial<T>) => void>();

  return new Proxy({} as Observable<T>, {
    get(_, prop: string) {
      if (prop === "subscribe") {
        return (listener: (next: Partial<T>) => void) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        };
      }
      if (prop.startsWith("get")) {
        const key = (prop[3].toLowerCase() + prop.slice(4)) as keyof T;
        return () => state[key];
      }
      if (prop.startsWith("set")) {
        const key = (prop[3].toLowerCase() + prop.slice(4)) as keyof T;
        return (value: T[typeof key]) => {
          state[key] = value;
          listeners.forEach((l) => l({ [key]: value } as Partial<T>));
        };
      }
    },
  });
}

const user = createObservable({ id: 1, name: "Alice", email: "alice@example.com" });
const unsubscribe = user.subscribe((changes) => {
  console.log("Changed:", changes);
});

user.setName("Bob"); // "Changed: { name: 'Bob' }"
console.log(user.getName()); // "Bob"
unsubscribe();
```

### 9.2 Conditional Typesの再帰パターン

```typescript
// 深い部分型（DeepPartial）
type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

// 深い必須型（DeepRequired）
type DeepRequired<T> = T extends object
  ? { [K in keyof T]-?: DeepRequired<T[K]> }
  : T;

// 深い読み取り専用型（DeepReadonly）
type DeepReadonly<T> = T extends (infer E)[]
  ? ReadonlyArray<DeepReadonly<E>>
  : T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

interface Config {
  server: {
    host: string;
    port: number;
    tls: {
      enabled: boolean;
      cert?: string;
    };
  };
  database: {
    primary: { url: string; pool: number };
    replica?: { url: string; pool: number };
  };
}

type PartialConfig = DeepPartial<Config>;
// server?: { host?: string; port?: number; tls?: { enabled?: boolean; cert?: string } }

type ReadonlyConfig = DeepReadonly<Config>;
// server: { readonly host: string; readonly port: number; ... }

// Flatten ネストされたオブジェクトを平坦化した型
type FlattenKeys<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends object
    ? FlattenKeys<T[K], `${Prefix}${K}.`>
    : `${Prefix}${K}`;
}[keyof T & string];

type ConfigKeys = FlattenKeys<Config>;
// "server.host" | "server.port" | "server.tls.enabled" | "server.tls.cert" | ...
```

### 9.3 NoInfer型（TypeScript 5.4）

```typescript
// TypeScript 5.4 で追加された NoInfer<T> ユーティリティ型
// 型推論の対象から特定の型パラメータを除外する

// 問題：defaultValue が T の推論に影響してしまう
function createStateOld<T>(
  initialValues: T[],
  defaultValue: T  // これが推論に参加してしまう
): [T[], T] {
  return [initialValues, defaultValue];
}

// "a" | 0 | null と推論されてしまう（意図していない）
const [items1, def1] = createStateOld(["a", "b"], null as unknown as string);

// NoInfer を使って defaultValue を推論から除外
function createState<T>(
  initialValues: T[],
  defaultValue: NoInfer<T>  // 推論に参加させない
): [T[], T] {
  return [initialValues, defaultValue];
}

const [items2, def2] = createState(["a", "b"], "default");
// T は string[] から string と推論される
// def2 は string 型

// const [items3, def3] = createState(["a", "b"], 0);
// Error: number は string に割り当て不可（正しいエラー）

// 実用例：デフォルト値を持つセレクター関数
function createSelector<T, R>(
  source: T[],
  selector: (item: T) => R,
  defaultValue: NoInfer<R>
): R {
  const result = source.map(selector);
  return result[0] ?? defaultValue;
}

const firstName = createSelector(
  [{ name: "Alice", age: 30 }],
  (user) => user.name,
  "Anonymous"  // string 型として正しくチェックされる
);

// const firstAge = createSelector(
//   [{ name: "Alice", age: 30 }],
//   (user) => user.age,
//   "N/A"  // Error: string は number に割り当て不可
// );
```

### 9.4 型述語の自動推論（TypeScript 5.5）

```typescript
// TypeScript 5.5 以前：明示的な型述語が必要
function isStringOld(value: unknown): value is string {
  return typeof value === "string";
}

// TypeScript 5.5 以降：フィルター関数の型述語が自動推論される
function isString(value: unknown) {
  return typeof value === "string";
}

// Array.filter での型推論が改善される
const mixed: (string | number | null | undefined)[] = ["a", 1, null, "b", undefined, 2];

// 5.5 以前は (string | number | null | undefined)[] のまま
// 5.5 以降は string[] として推論される
const strings = mixed.filter(isString);
// strings の型は string[]

// より複雑なケース
interface Dog {
  kind: "dog";
  bark(): void;
}

interface Cat {
  kind: "cat";
  meow(): void;
}

type Animal = Dog | Cat;

function isDog(animal: Animal) {
  return animal.kind === "dog";
}

const animals: Animal[] = [
  { kind: "dog", bark: () => console.log("woof") },
  { kind: "cat", meow: () => console.log("meow") },
];

const dogs = animals.filter(isDog); // Dog[] として推論される
dogs.forEach((dog) => dog.bark());  // OK
```

---

## 10. Declaration Emit（型定義ファイル生成の改善）

### 10.1 --isolatedDeclarationsフラグ（TypeScript 5.5）

`--isolatedDeclarations`は、各ファイルが独立して型定義ファイル（`.d.ts`）を生成できることを強制するフラグです。これにより、ビルドの並列化が可能になります。

```typescript
// isolatedDeclarations: true の場合、エクスポートされる関数には
// 明示的な戻り値型注釈が必要

// Error: 戻り値型の推論が他ファイルに依存している可能性がある
// export function getUser(id: string) {
//   return fetchUser(id); // fetchUser の戻り値に依存
// }

// OK: 明示的な型注釈
export function getUser(id: string): Promise<{ id: string; name: string }> {
  return fetchUser(id);
}

// OK: プリミティブ型の場合は推論可能
export function add(a: number, b: number) {
  return a + b; // number として明確
}

// OK: リテラル型も推論可能
export const VERSION = "5.0.0"; // string リテラルとして明確
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "isolatedDeclarations": true,
    "declaration": true,
    "emitDeclarationOnly": true
  }
}
```

### 10.2 型定義ファイルの品質向上

```typescript
// 型定義ファイルの出力例

// 入力：src/utils.ts
export function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2)}`;
}

export class EventBus<T extends Record<string, unknown[]>> {
  private handlers = new Map<keyof T, Set<(...args: unknown[]) => void>>();

  on<K extends keyof T>(event: K, handler: (...args: T[K]) => void): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as (...args: unknown[]) => void);
    return () => this.handlers.get(event)?.delete(handler as (...args: unknown[]) => void);
  }

  emit<K extends keyof T>(event: K, ...args: T[K]): void {
    this.handlers.get(event)?.forEach((h) => h(...args));
  }
}

// 出力：dist/utils.d.ts
// export declare function createId(prefix: string): string;
// export declare class EventBus<T extends Record<string, unknown[]>> {
//   private handlers;
//   on<K extends keyof T>(event: K, handler: (...args: T[K]) => void): () => void;
//   emit<K extends keyof T>(event: K, ...args: T[K]): void;
// }
```

### 10.3 JSDocの@importタグ（TypeScript 5.5）

```javascript
// TypeScript の型を JSDoc で参照する場合、以前はモジュール全体をimportする必要があった
/**
 * @param {import('./types').User} user
 */

// TypeScript 5.5 の @import タグで簡潔に書ける
/**
 * @import { User, Config } from './types'
 */

/**
 * @param {User} user
 * @returns {Config}
 */
function processUser(user) {
  return {
    userId: user.id,
    userName: user.name,
  };
}
```

---

## 11. 速度改善・バンドルサイズ最適化

### 11.1 TypeScript 5.0のコンパイラ速度改善

TypeScript 5.0では、コンパイラ自体がESMに移行し、内部最適化が行われました。公式ベンチマークでは以下の改善が報告されています。

- TypeScript自身のビルド: 最大26%高速化
- tsc --watch モード: 最大10%高速化
- project references使用時: 最大5%高速化

```json
// tsconfig.json での速度最適化設定
{
  "compilerOptions": {
    // インクリメンタルビルドを有効化
    "incremental": true,
    "tsBuildInfoFile": "./.tsbuildinfo",
    
    // skipLibCheck で型定義ファイルのチェックをスキップ
    "skipLibCheck": true,
    
    // isolatedModules でファイル単体でのトランスパイルを可能に
    "isolatedModules": true
  },
  // 不要なファイルを除外
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

### 11.2 verbatimModuleSyntax

TypeScript 5.0で追加された`--verbatimModuleSyntax`は、import/exportの変換をより予測可能にするフラグです。

```typescript
// verbatimModuleSyntax: true の場合

// 型のみのimportには import type を使わなければならない
import type { User } from "./types";       // OK
// import { User } from "./types";          // Error（値として使われない場合）

// 値として使うものは通常のimport
import { createUser } from "./factory";    // OK

// 型と値を混在させる場合は type 修飾子を使う
import { type UserOptions, createUser as _createUser } from "./module";

// エクスポート側も同様
export type { User };                      // 型のみのエクスポート
export { createUser };                     // 値のエクスポート
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "verbatimModuleSyntax": true,
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

### 11.3 --moduleResolution bundler

TypeScript 5.0で追加された`bundler`モード。ViteやesbuildなどのモダンバンドラーのModule Resolution動作を模倣します。

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    // bundler モードでは以下が可能
    // - .ts 拡張子なしのimport
    // - package.json の exports フィールドのサポート
    // - index.ts の自動解決
    "allowImportingTsExtensions": true
  }
}
```

```typescript
// bundler モードでは拡張子なしのimportが使える
import { utils } from "./utils";           // utils.ts を自動解決
import { Button } from "./Button";         // Button.tsx も解決可能

// package.json の exports フィールドも認識
// {
//   "exports": {
//     ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" },
//     "./utils": { "import": "./dist/utils.js", "types": "./dist/utils.d.ts" }
//   }
// }
import { helper } from "my-package/utils"; // exports フィールドを参照
```

### 11.4 バンドルサイズ最適化テクニック

```typescript
// Tree Shaking を活かす型安全なエクスポート

// Bad：名前空間エクスポートはTree Shakingが効かない
export * as utils from "./heavy-module";

// Good：必要なものだけエクスポート
export { specificFunction } from "./heavy-module";

// Dynamic Import の型安全な使い方
async function loadHeavyFeature() {
  const { HeavyComponent } = await import("./heavy-feature");
  // HeavyComponent の型は自動的に推論される
  return new HeavyComponent();
}

// Conditional Lazy Loading パターン
type FeatureModule = typeof import("./feature-module");

const featureCache = new Map<string, unknown>();

async function getFeature<K extends keyof FeatureModule>(
  feature: K
): Promise<FeatureModule[K]> {
  if (!featureCache.has(feature as string)) {
    const module = await import("./feature-module");
    featureCache.set(feature as string, module[feature]);
  }
  return featureCache.get(feature as string) as FeatureModule[K];
}
```

---

## 12. strict modeベストプラクティス

### 12.1 strictフラグの全項目理解

```json
// tsconfig.json の strict 関連フラグ（すべての内訳）
{
  "compilerOptions": {
    // これ一つで以下のフラグがすべて有効になる
    "strict": true,

    // strict に含まれる個別フラグ
    "strictNullChecks": true,         // null/undefined を明示的に扱う
    "strictFunctionTypes": true,      // 関数型の反変チェック
    "strictBindCallApply": true,      // bind/call/apply の型チェック
    "strictPropertyInitialization": true, // クラスプロパティの初期化チェック
    "noImplicitAny": true,            // any の暗黙的使用を禁止
    "noImplicitThis": true,           // this の暗黙的 any を禁止
    "alwaysStrict": true,             // 常に "use strict" を出力
    "useUnknownInCatchVariables": true // catch変数を unknown に
  }
}
```

### 12.2 strictNullChecksの実践

```typescript
// strictNullChecks の実践パターン

// Nullish Coalescing と Optional Chaining の活用
interface UserProfile {
  id: string;
  name: string;
  address?: {
    city?: string;
    zip?: string;
  };
  preferences?: {
    theme?: "light" | "dark";
  };
}

function getUserCity(profile: UserProfile): string {
  // Optional Chaining + Nullish Coalescing
  return profile.address?.city ?? "Unknown City";
}

function getTheme(profile: UserProfile): "light" | "dark" {
  return profile.preferences?.theme ?? "light";
}

// 型ガードの活用
function processInput(value: string | null | undefined): string {
  if (value == null) {
    // null と undefined を両方チェック
    return "default";
  }
  // ここでは value は string として推論される
  return value.trim().toUpperCase();
}

// アサーション関数
function assertDefined<T>(
  value: T | null | undefined,
  message: string
): asserts value is T {
  if (value == null) {
    throw new Error(message);
  }
}

function processUser(userId: string | null) {
  assertDefined(userId, "User ID is required");
  // ここでは userId は string として推論される
  console.log(userId.toUpperCase());
}
```

### 12.3 useUnknownInCatchVariables

```typescript
// TypeScript 4.4+ で追加、strict モードでデフォルト有効

// Bad パターン（以前の書き方）
try {
  // ...
} catch (error) {
  // error は以前は any だったが、今は unknown
  // error.message; // Error: unknown 型にはプロパティアクセス不可
}

// Good パターン
try {
  const data = JSON.parse(invalidJson);
} catch (error) {
  if (error instanceof Error) {
    // error は Error として型絞り込みされる
    console.error("Parse error:", error.message);
    console.error("Stack:", error.stack);
  } else if (typeof error === "string") {
    console.error("String error:", error);
  } else {
    console.error("Unknown error:", String(error));
  }
}

// ユーティリティ関数
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return String(error);
}

// Result 型パターン（例外を使わない設計）
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function tryCatch<T>(fn: () => T): Result<T> {
  try {
    return { ok: true, value: fn() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

async function tryCatchAsync<T>(
  fn: () => Promise<T>
): Promise<Result<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

const result = tryCatch(() => JSON.parse('{"name": "Alice"}'));
if (result.ok) {
  console.log(result.value.name);
} else {
  console.error(result.error.message);
}
```

---

## 13. tsconfig.json完全設定ガイド

### 13.1 プロジェクト種別ごとの推奨設定

**Next.js / Vite（フロントエンドSPA/SSR）**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "moduleDetection": "force",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "incremental": true,
    "tsBuildInfoFile": ".next/cache/tsconfig.tsbuildinfo",
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "next.config.ts", "env.d.ts"],
  "exclude": ["node_modules"]
}
```

**Node.js（バックエンドAPI）**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "Node16",
    "moduleResolution": "Node16",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "incremental": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**ライブラリ（npm公開用）**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "isolatedDeclarations": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "emitDeclarationOnly": false,
    "outDir": "./dist",
    "rootDir": "./src",
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
```

### 13.2 tsconfig.extendsの配列サポート（TypeScript 5.0）

```json
// tsconfig.json -- 複数の設定を継承
{
  "extends": [
    "@tsconfig/strictest/tsconfig.json",
    "@tsconfig/node22/tsconfig.json",
    "./tsconfig.paths.json"
  ],
  "compilerOptions": {
    // 独自の設定でオーバーライド
    "outDir": "./dist"
  }
}
```

```json
// tsconfig.paths.json -- パスエイリアス専用
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/components/*": ["src/components/*"],
      "@/lib/*": ["src/lib/*"],
      "@/types/*": ["src/types/*"]
    }
  }
}
```

### 13.3 Project References（大規模プロジェクト向け）

```json
// packages/core/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

```json
// packages/app/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist"
  },
  "references": [
    { "path": "../core" },
    { "path": "../shared" }
  ]
}
```

```json
// ルートの tsconfig.json（ビルド用）
{
  "files": [],
  "references": [
    { "path": "packages/core" },
    { "path": "packages/shared" },
    { "path": "packages/app" }
  ]
}
```

```bash
# Project References のビルド（依存関係を自動解決）
tsc --build --verbose

# 変更があったパッケージのみ再ビルド
tsc --build --incremental
```

### 13.4 追加の厳格フラグ

```json
{
  "compilerOptions": {
    "strict": true,

    // 追加の厳格フラグ（strict には含まれない）
    "noUncheckedIndexedAccess": true,
    // arr[0] の型が T | undefined になる（配列の境界チェック）

    "noImplicitOverride": true,
    // 基底クラスのメソッドをオーバーライドする際に override キーワードを要求

    "exactOptionalPropertyTypes": true,
    // { prop?: string } に undefined を明示的に代入できなくなる

    "noPropertyAccessFromIndexSignature": true,
    // インデックスシグネチャへのドット記法アクセスを禁止

    "allowUnusedLabels": false,
    "allowUnreachableCode": false,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

```typescript
// noUncheckedIndexedAccess の実践
const names: string[] = ["Alice", "Bob", "Charlie"];
const first = names[0]; // string | undefined（以前は string だった）

if (first !== undefined) {
  console.log(first.toUpperCase()); // OK
}

// Non-null assertion を使う場合（注意が必要）
const firstDefined = names[0]!; // string（境界チェックの責任を自分で負う）

// noImplicitOverride の実践
class Base {
  greet() { return "Hello"; }
}

class Derived extends Base {
  // override がないとエラー（noImplicitOverride: true の場合）
  override greet() { return "Hi"; } // OK
}
```

---

## 14. ESLint・Biomeとの連携

### 14.1 ESLint + typescript-eslintの設定

```bash
# インストール
npm install --save-dev eslint typescript-eslint @eslint/js
```

```javascript
// eslint.config.mjs（ESLint Flat Config形式）
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // 型安全性を強化するルール
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",

      // Promise 関連
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",

      // 不必要なコードを検出
      "@typescript-eslint/no-unnecessary-condition": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/no-redundant-type-constituents": "error",

      // スタイル
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
    },
  }
);
```

### 14.2 Biomeの設定

```bash
# Biome インストール（ESLint + Prettierの代替）
npm install --save-dev @biomejs/biome

# 初期設定生成
npx biome init
```

```json
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noBannedTypes": "error",
        "noExtraBooleanCast": "error",
        "noUselessTypeConstraint": "error"
      },
      "correctness": {
        "noUnusedVariables": "error",
        "useExhaustiveDependencies": "warn"
      },
      "suspicious": {
        "noExplicitAny": "error",
        "noConfusingVoidType": "error"
      },
      "style": {
        "useImportType": "error",
        "useNodejsImportProtocol": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "trailingCommas": "es5",
      "semicolons": "always"
    }
  },
  "files": {
    "ignore": ["node_modules", "dist", ".next", "coverage"]
  }
}
```

### 14.3 型チェックとLintの統合CI設定

```yaml
# .github/workflows/quality.yml
name: Code Quality

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  typecheck:
    name: TypeScript Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npx tsc --noEmit --project tsconfig.test.json

  lint:
    name: ESLint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
      - run: npm ci
      - run: npx eslint . --max-warnings 0

  biome:
    name: Biome Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: biomejs/setup-biome@v2
      - run: biome ci .
```

### 14.4 pre-commitフックとの連携

```bash
# Huskyのセットアップ
npm install --save-dev husky lint-staged
npx husky init
```

```json
// package.json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --max-warnings 0",
    "format": "biome format --write .",
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "biome check --apply",
      "eslint --max-warnings 0"
    ],
    "*.{json,md,yaml,yml}": [
      "biome format --write"
    ]
  }
}
```

```bash
# .husky/pre-commit
npm run typecheck
npx lint-staged
```

### 14.5 VS Code設定との連携

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "biomejs.biome",
  "editor.codeActionsOnSave": {
    "source.fixAll.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.preferences.useAliasesForRenames": false,
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "biomejs.biome"
  }
}
```

```json
// .vscode/extensions.json
{
  "recommendations": [
    "biomejs.biome",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

---

## まとめ

TypeScript 5.xシリーズは、言語としての成熟と実用性の両方において大きな前進を遂げました。本記事で解説した主要機能をまとめます。

**型システムの強化**
- `satisfies`演算子による型チェックと型推論の両立
- `const`型パラメータによる精密なリテラル型推論
- `Infer Extends`による条件型の簡潔な記述
- `NoInfer`型による推論制御
- 型述語の自動推論（TypeScript 5.5）

**新しい言語機能**
- ECMAScript標準Decoratorsの完全実装（5.0）
- Decorator Metadata（5.2）
- `using`/`await using`宣言によるリソース管理（5.2）
- Import Attributes（5.3）

**ビルドとツール**
- `--verbatimModuleSyntax`による正確なモジュール処理
- `--moduleResolution bundler`によるモダンバンドラーサポート
- `--isolatedDeclarations`による並列ビルド支援（5.5）
- tsconfig.extendsの配列サポート（5.0）

**実務での推奨アプローチ**

1. `strict: true`を基本とし、`noUncheckedIndexedAccess`・`exactOptionalPropertyTypes`などの追加フラグも有効にする
2. ライブラリを作成する場合は`isolatedDeclarations: true`を検討する
3. モダンバンドラー（Vite等）を使う場合は`moduleResolution: "bundler"`を使用する
4. リソース管理が必要な場合は`using`宣言を積極的に活用する
5. ESLint（typescript-eslint）またはBiomeと組み合わせて、型安全性をさらに強化する

TypeScriptの型システムを深く理解し活用することで、バグを開発時点で発見できる堅牢なコードベースを構築できます。特に`satisfies`演算子・`const`型パラメータ・`using`宣言はすぐに実務投入できる有用な機能です。ぜひ積極的に採用してみてください。

---

## 開発者ツールのご紹介

本記事のようなTypeScript開発をより効率化するために、[DevToolBox](https://usedevtools.com)をご活用ください。

DevToolBoxは、Web開発者向けのオールインワンツールサイトです。JSON整形・正規表現テスト・Base64エンコード・カラーコード変換・クロンスケジュール構文確認など、TypeScript/JavaScript開発で日常的に必要になるツールが一箇所に集まっています。

- JSON Formatter / Validator：TypeScriptの型定義と照らし合わせながらJSONを検証
- Regex Tester：Template Literal Typesで使うパターンのテスト
- TypeScript Playground相当のツール群
- ブックマーク不要のクイックアクセス設計

開発中に「ちょっと確認したい」という場面で役立つツールが揃っています。ぜひブックマークしてご活用ください。

**URL**: [https://usedevtools.com](https://usedevtools.com)

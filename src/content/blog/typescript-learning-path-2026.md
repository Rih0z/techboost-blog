---
title: "TypeScript習得ロードマップ2026：型安全な開発者への道"
description: "JavaScript経験者向けのTypeScript習得ロードマップ2026年版。型システムの基礎からインターフェース、ジェネリクス、ユーティリティ型、条件型、実践的な設計パターンまで段階的に解説。初心者がつまずきやすいポイントと具体的な解決法をコード例付きで紹介します。"
pubDate: "2026-03-06"
tags: ['TypeScript', 'school', 'プログラミング']
heroImage: '../../assets/thumbnails/typescript-learning-path-2026.jpg'
---

## はじめに：なぜ2026年にTypeScriptが必須なのか

TypeScriptは2026年現在、フロントエンド・バックエンドを問わず、JavaScript開発のデファクトスタンダードとなっています。

State of JS 2025の調査結果によると、TypeScriptの使用率は93%を超え、新規プロジェクトでTypeScriptを採用しない理由はほぼなくなりました（参照: State of JavaScript Survey https://stateofjs.com/）。

### TypeScriptを学ぶべき理由

| 理由 | 詳細 |
|------|------|
| バグの早期発見 | コンパイル時に型エラーを検出し、実行時エラーを大幅に削減 |
| コード補完の強化 | IDEが型情報を利用して正確な補完を提供 |
| リファクタリングの安全性 | 型があるため、変更箇所を正確に把握できる |
| ドキュメントとしての型 | 型定義がそのままAPIのドキュメントになる |
| 求人の必須スキル | フロントエンド求人の約65%がTypeScript必須 |

### この記事の対象読者

- JavaScriptの基本文法を理解している
- ES6+の構文（アロー関数、分割代入、スプレッド構文等）を使ったことがある
- TypeScriptに興味があるが、どこから始めればいいかわからない

---

## Phase 1: 型システムの基礎（1-2週間）

### 基本型（Primitive Types）

TypeScriptの型システムはJavaScriptのプリミティブ型を基盤としています。

```typescript
// 基本的な型注釈
const name: string = '田中太郎';
const age: number = 30;
const isActive: boolean = true;
const value: null = null;
const notDefined: undefined = undefined;

// 型推論を活用する（明示的な型注釈は不要な場合が多い）
const greeting = 'こんにちは'; // string と推論される
const count = 42;              // number と推論される
const enabled = true;          // boolean と推論される

// 関数の型注釈
function add(a: number, b: number): number {
  return a + b;
}

// アロー関数の型注釈
const multiply = (a: number, b: number): number => a * b;

// オプショナルパラメータ
function greet(name: string, title?: string): string {
  if (title) {
    return `${title} ${name}さん、こんにちは`;
  }
  return `${name}さん、こんにちは`;
}

// デフォルト値
function createUser(name: string, role: string = 'user'): { name: string; role: string } {
  return { name, role };
}
```

### つまずきポイント1: anyの誘惑

初心者が最もやりがちな間違いは、型エラーが出るたびに `any` を使ってしまうことです。

```typescript
// NG: anyを使って型チェックを回避する
function processData(data: any): any {
  return data.items.map((item: any) => item.name);
}

// OK: 適切な型を定義する
interface DataResponse {
  items: Array<{
    id: number;
    name: string;
  }>;
}

function processData(data: DataResponse): string[] {
  return data.items.map(item => item.name);
}
```

`any` を使うとTypeScriptを導入する意味がなくなります。どうしても型がわからない場合は `unknown` を使い、型ガードで絞り込んでください。

```typescript
// unknownと型ガードの組み合わせ
function safeParseJSON(jsonString: string): unknown {
  try {
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}

// 型ガード関数
function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every(item => typeof item === 'string')
  );
}

const parsed = safeParseJSON('["a", "b", "c"]');
if (isStringArray(parsed)) {
  // ここではparsedはstring[]として扱える
  console.log(parsed.join(', '));
}
```

### 配列とタプル

```typescript
// 配列
const numbers: number[] = [1, 2, 3, 4, 5];
const names: Array<string> = ['田中', '佐藤', '鈴木'];

// 読み取り専用配列
const constants: readonly number[] = [1, 2, 3];
// constants.push(4); // エラー: 読み取り専用

// タプル（固定長・固定型の配列）
const pair: [string, number] = ['田中', 30];
const [pairName, pairAge] = pair;

// ラベル付きタプル（可読性が向上）
type UserEntry = [name: string, age: number, active: boolean];
const entry: UserEntry = ['田中', 30, true];

// 可変長タプル
type StringsAndNumber = [...string[], number];
const data: StringsAndNumber = ['a', 'b', 'c', 42];
```

### オブジェクト型とインターフェース

```typescript
// インターフェースの定義
interface User {
  id: number;
  name: string;
  email: string;
  age?: number;              // オプショナルプロパティ
  readonly createdAt: Date;  // 読み取り専用
}

// typeエイリアスとの違い
type UserType = {
  id: number;
  name: string;
  email: string;
};

// interfaceは拡張（extends）が可能
interface AdminUser extends User {
  permissions: string[];
  department: string;
}

// typeはユニオン型やインターセクション型が使える
type Status = 'active' | 'inactive' | 'suspended';
type UserWithStatus = User & { status: Status };

// インデックスシグネチャ
interface Dictionary {
  [key: string]: string;
}

const translations: Dictionary = {
  hello: 'こんにちは',
  goodbye: 'さようなら'
};

// Record型を使った同等の表現
const config: Record<string, string | number | boolean> = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
  debug: false
};
```

### つまずきポイント2: interfaceとtypeの使い分け

```typescript
// interface: オブジェクト型の定義に使う。拡張（extends）が得意
interface Animal {
  name: string;
  sound(): string;
}

interface Dog extends Animal {
  breed: string;
  fetch(): void;
}

// interfaceは同名で宣言マージができる（ライブラリの型拡張に便利）
interface Window {
  myCustomProperty: string;
}

// type: ユニオン型、インターセクション型、マップ型など複雑な型に使う
type Result<T> = { success: true; data: T } | { success: false; error: string };
type EventName = 'click' | 'hover' | 'focus';
type Nullable<T> = T | null;
```

一般的なガイドラインとして、オブジェクトの形状を定義するときは `interface`、それ以外は `type` を使うことが推奨されています（参照: TypeScript公式ドキュメント https://www.typescriptlang.org/docs/handbook/2/everyday-types.html）。

---

## Phase 2: ユニオン型とリテラル型（1-2週間）

### ユニオン型の基本

```typescript
// 文字列リテラル型のユニオン
type Direction = 'north' | 'south' | 'east' | 'west';

function move(direction: Direction, distance: number): string {
  return `${direction}に${distance}m移動`;
}

move('north', 10);  // OK
// move('up', 10);  // エラー: 'up'はDirection型に割り当てられません

// 数値リテラル型
type DiceValue = 1 | 2 | 3 | 4 | 5 | 6;

function rollDice(): DiceValue {
  return (Math.floor(Math.random() * 6) + 1) as DiceValue;
}

// 判別可能なユニオン型（Discriminated Union）
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rectangle'; width: number; height: number }
  | { kind: 'triangle'; base: number; height: number };

function calculateArea(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'rectangle':
      return shape.width * shape.height;
    case 'triangle':
      return (shape.base * shape.height) / 2;
  }
}

// TypeScriptが各caseで正しい型に絞り込んでくれる
const circle: Shape = { kind: 'circle', radius: 5 };
console.log(calculateArea(circle)); // 78.54...
```

### 型の絞り込み（Type Narrowing）

```typescript
// typeof による絞り込み
function padLeft(value: string | number, padding: string | number): string {
  if (typeof padding === 'number') {
    return ' '.repeat(padding) + value;
  }
  return padding + value;
}

// in 演算子による絞り込み
interface Fish {
  swim(): void;
}

interface Bird {
  fly(): void;
}

function move(animal: Fish | Bird): void {
  if ('swim' in animal) {
    animal.swim(); // Fish として扱われる
  } else {
    animal.fly();  // Bird として扱われる
  }
}

// instanceof による絞り込み
function processDate(input: string | Date): string {
  if (input instanceof Date) {
    return input.toLocaleDateString('ja-JP');
  }
  return new Date(input).toLocaleDateString('ja-JP');
}

// カスタム型ガード
interface APIError {
  code: number;
  message: string;
}

function isAPIError(value: unknown): value is APIError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    typeof (value as APIError).code === 'number' &&
    typeof (value as APIError).message === 'string'
  );
}

async function fetchUser(id: number) {
  try {
    const response = await fetch(`/api/users/${id}`);
    const data: unknown = await response.json();

    if (isAPIError(data)) {
      console.error(`APIエラー: ${data.code} - ${data.message}`);
      return null;
    }

    return data as User;
  } catch (error) {
    console.error('通信エラー:', error);
    return null;
  }
}
```

### つまずきポイント3: nullとundefinedの扱い

```typescript
// strictNullChecksが有効な場合（推奨）
function getLength(str: string | null): number {
  // str.length; // エラー: strはnullの可能性がある

  // 方法1: if文でチェック
  if (str !== null) {
    return str.length;
  }
  return 0;

  // 方法2: オプショナルチェーン + Nullish Coalescing
  // return str?.length ?? 0;
}

// Non-null assertion（!演算子）は最終手段
function processElement(id: string): void {
  const element = document.getElementById(id);
  // element!.textContent = 'hello'; // 危険: elementがnullなら実行時エラー

  // 安全な方法
  if (element) {
    element.textContent = 'hello';
  }
}
```

---

## Phase 3: ジェネリクス（2-3週間）

ジェネリクスはTypeScriptの中で最も強力で、同時に最もつまずきやすい概念です。

### ジェネリクスの基本

```typescript
// ジェネリクスなし: 型ごとに関数を作る必要がある
function getFirstString(arr: string[]): string | undefined {
  return arr[0];
}
function getFirstNumber(arr: number[]): number | undefined {
  return arr[0];
}

// ジェネリクスあり: 1つの関数で全ての型に対応
function getFirst<T>(arr: T[]): T | undefined {
  return arr[0];
}

const firstStr = getFirst(['a', 'b', 'c']); // string | undefined
const firstNum = getFirst([1, 2, 3]);        // number | undefined

// 複数の型パラメータ
function zip<T, U>(arr1: T[], arr2: U[]): [T, U][] {
  const length = Math.min(arr1.length, arr2.length);
  const result: [T, U][] = [];
  for (let i = 0; i < length; i++) {
    result.push([arr1[i], arr2[i]]);
  }
  return result;
}

const zipped = zip(['a', 'b', 'c'], [1, 2, 3]);
// [string, number][] = [['a', 1], ['b', 2], ['c', 3]]
```

### ジェネリクスの制約（Constraints）

```typescript
// extends で型パラメータに制約を付ける
interface HasLength {
  length: number;
}

function logLength<T extends HasLength>(value: T): T {
  console.log(`長さ: ${value.length}`);
  return value;
}

logLength('hello');        // OK: stringはlengthを持つ
logLength([1, 2, 3]);     // OK: arrayはlengthを持つ
// logLength(42);          // エラー: numberはlengthを持たない

// keyof を使った制約
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: '田中', age: 30, email: 'tanaka@example.com' };
const userName = getProperty(user, 'name');  // string
const userAge = getProperty(user, 'age');    // number
// getProperty(user, 'phone');               // エラー: 'phone'は存在しない
```

### ジェネリクスの実践パターン

```typescript
// パターン1: APIレスポンスの型安全なラッパー
interface APIResponse<T> {
  data: T;
  status: number;
  message: string;
  timestamp: string;
}

interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

async function fetchAPI<T>(endpoint: string): Promise<APIResponse<T>> {
  const response = await fetch(`/api${endpoint}`);
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  return response.json();
}

// 使用例
interface User {
  id: number;
  name: string;
  email: string;
}

interface Post {
  id: number;
  title: string;
  content: string;
  authorId: number;
}

// 型が自動的に推論される
const userResponse = await fetchAPI<User>('/users/1');
console.log(userResponse.data.name); // string

const postsResponse = await fetchAPI<Post[]>('/posts');
console.log(postsResponse.data[0].title); // string

// パターン2: ジェネリックなリポジトリパターン
interface Repository<T extends { id: number }> {
  findById(id: number): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: number, data: Partial<Omit<T, 'id'>>): Promise<T>;
  delete(id: number): Promise<boolean>;
}

class InMemoryRepository<T extends { id: number }> implements Repository<T> {
  private items: T[] = [];
  private nextId = 1;

  async findById(id: number): Promise<T | null> {
    return this.items.find(item => item.id === id) ?? null;
  }

  async findAll(): Promise<T[]> {
    return [...this.items];
  }

  async create(data: Omit<T, 'id'>): Promise<T> {
    const item = { ...data, id: this.nextId++ } as T;
    this.items.push(item);
    return item;
  }

  async update(id: number, data: Partial<Omit<T, 'id'>>): Promise<T> {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) throw new Error('Not found');
    this.items[index] = { ...this.items[index], ...data };
    return this.items[index];
  }

  async delete(id: number): Promise<boolean> {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return false;
    this.items.splice(index, 1);
    return true;
  }
}

// 使用例
const userRepo = new InMemoryRepository<User>();
await userRepo.create({ name: '田中', email: 'tanaka@example.com' });
const allUsers = await userRepo.findAll();
```

### つまずきポイント4: ジェネリクスの型引数の推論

```typescript
// 型引数は明示しなくても推論されることが多い
function identity<T>(value: T): T {
  return value;
}

// 型引数を省略しても正しく推論される
const str = identity('hello');  // T = string と推論
const num = identity(42);       // T = number と推論

// ただし、複雑なケースでは明示が必要
function createPair<T, U>(first: T, second: U): [T, U] {
  return [first, second];
}

// 推論に任せる場合
const pair1 = createPair('hello', 42); // [string, number]

// 特定の型を強制する場合
const pair2 = createPair<string, string>('hello', 'world');
```

---

## Phase 4: ユーティリティ型（1-2週間）

TypeScriptには組み込みのユーティリティ型が多数用意されています。これらを使いこなすことで、型定義の重複を減らし、保守性の高いコードが書けます。

### 主要なユーティリティ型

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  role: 'admin' | 'user' | 'viewer';
  createdAt: Date;
}

// Partial<T>: 全プロパティをオプショナルにする
type UserUpdate = Partial<User>;
// { id?: number; name?: string; email?: string; ... }

// Required<T>: 全プロパティを必須にする
type RequiredUser = Required<User>;

// Readonly<T>: 全プロパティを読み取り専用にする
type ImmutableUser = Readonly<User>;

// Pick<T, K>: 特定のプロパティだけを抽出する
type UserPreview = Pick<User, 'id' | 'name' | 'role'>;
// { id: number; name: string; role: 'admin' | 'user' | 'viewer' }

// Omit<T, K>: 特定のプロパティを除外する
type UserInput = Omit<User, 'id' | 'createdAt'>;
// { name: string; email: string; age: number; role: ... }

// Record<K, V>: キーと値の型を指定したオブジェクト
type RolePermissions = Record<User['role'], string[]>;
const permissions: RolePermissions = {
  admin: ['read', 'write', 'delete', 'manage_users'],
  user: ['read', 'write'],
  viewer: ['read']
};

// Exclude<T, U>: ユニオン型から特定の型を除外
type NonAdminRole = Exclude<User['role'], 'admin'>; // 'user' | 'viewer'

// Extract<T, U>: ユニオン型から特定の型を抽出
type AdminRole = Extract<User['role'], 'admin'>; // 'admin'

// NonNullable<T>: nullとundefinedを除外
type NullableString = string | null | undefined;
type DefiniteString = NonNullable<NullableString>; // string

// ReturnType<T>: 関数の戻り値の型を取得
function fetchUserData() {
  return { users: [] as User[], total: 0 };
}
type FetchResult = ReturnType<typeof fetchUserData>;
// { users: User[]; total: number }

// Parameters<T>: 関数のパラメータ型をタプルとして取得
function createUser(name: string, email: string, age: number): User {
  return { id: 1, name, email, age, role: 'user', createdAt: new Date() };
}
type CreateUserParams = Parameters<typeof createUser>;
// [string, string, number]

// Awaited<T>: Promiseのアンラップ
type PromiseResult = Awaited<Promise<string>>; // string
type NestedPromise = Awaited<Promise<Promise<number>>>; // number
```

### ユーティリティ型の実践的な組み合わせ

```typescript
// CRUD操作の型定義
interface Entity {
  id: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Article extends Entity {
  title: string;
  content: string;
  authorId: number;
  tags: string[];
  published: boolean;
}

// 作成時: id, createdAt, updatedAtは自動生成
type CreateArticleInput = Omit<Article, keyof Entity>;

// 更新時: 全フィールドオプショナル（id等は除外）
type UpdateArticleInput = Partial<Omit<Article, keyof Entity>>;

// 一覧表示用: コンテンツは不要
type ArticleListItem = Pick<Article, 'id' | 'title' | 'authorId' | 'tags' | 'published' | 'createdAt'>;

// API エンドポイントの型定義
interface APIEndpoints {
  'GET /articles': {
    response: ArticleListItem[];
    query: { page?: number; limit?: number; tag?: string };
  };
  'GET /articles/:id': {
    response: Article;
    params: { id: number };
  };
  'POST /articles': {
    response: Article;
    body: CreateArticleInput;
  };
  'PATCH /articles/:id': {
    response: Article;
    params: { id: number };
    body: UpdateArticleInput;
  };
  'DELETE /articles/:id': {
    response: void;
    params: { id: number };
  };
}
```

---

## Phase 5: 高度な型パターン（2-3週間）

### Mapped Types（マップ型）

```typescript
// 全プロパティの型を変換する
type Stringify<T> = {
  [K in keyof T]: string;
};

interface Config {
  port: number;
  host: string;
  debug: boolean;
}

type StringConfig = Stringify<Config>;
// { port: string; host: string; debug: string }

// 条件付きマップ型
type ConditionalPick<T, Condition> = {
  [K in keyof T as T[K] extends Condition ? K : never]: T[K];
};

type StringProps = ConditionalPick<Config, string>;
// { host: string }

type NumberProps = ConditionalPick<Config, number>;
// { port: number }

// Getterを自動生成する型
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type ConfigGetters = Getters<Config>;
// { getPort: () => number; getHost: () => string; getDebug: () => boolean }
```

### Conditional Types（条件付き型）

```typescript
// 条件付き型の基本
type IsString<T> = T extends string ? true : false;

type A = IsString<string>;  // true
type B = IsString<number>;  // false

// 配列の要素型を取得する
type ElementType<T> = T extends (infer E)[] ? E : never;

type StringElement = ElementType<string[]>;  // string
type NumberElement = ElementType<number[]>;  // number

// 関数の引数型を取得する
type FirstArgument<T> = T extends (arg: infer A, ...args: unknown[]) => unknown ? A : never;

type Arg = FirstArgument<(name: string, age: number) => void>; // string

// Promiseのアンラップ（自作版）
type UnwrapPromise<T> = T extends Promise<infer U> ? UnwrapPromise<U> : T;

type Result1 = UnwrapPromise<Promise<string>>;            // string
type Result2 = UnwrapPromise<Promise<Promise<number>>>;   // number

// 実用的な条件付き型: APIレスポンスの正規化
type NormalizeResponse<T> = T extends Array<infer Item>
  ? { items: Item[]; count: number }
  : { item: T };

type UserResponse = NormalizeResponse<User>;     // { item: User }
type UsersResponse = NormalizeResponse<User[]>;  // { items: User[]; count: number }
```

### Template Literal Types

```typescript
// テンプレートリテラル型
type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
type APIPath = '/users' | '/posts' | '/comments';

type Endpoint = `${HTTPMethod} ${APIPath}`;
// 'GET /users' | 'GET /posts' | 'GET /comments' | 'POST /users' | ...

// イベントハンドラの型
type EventName = 'click' | 'hover' | 'focus' | 'blur';
type HandlerName = `on${Capitalize<EventName>}`;
// 'onClick' | 'onHover' | 'onFocus' | 'onBlur'

// CSSプロパティ風の型
type CSSUnit = 'px' | 'rem' | 'em' | '%' | 'vh' | 'vw';
type CSSValue = `${number}${CSSUnit}`;

function setWidth(value: CSSValue): void {
  console.log(`width: ${value}`);
}

setWidth('100px');   // OK
setWidth('2.5rem');  // OK
// setWidth('100');  // エラー: 単位が必要
```

---

## Phase 6: 実践パターン集（2-3週間）

### パターン1: 型安全なイベントエミッター

```typescript
type EventMap = {
  userLogin: { userId: number; timestamp: Date };
  userLogout: { userId: number };
  pageView: { path: string; referrer?: string };
  error: { message: string; code: number };
};

class TypedEventEmitter<T extends Record<string, unknown>> {
  private listeners: {
    [K in keyof T]?: Array<(data: T[K]) => void>;
  } = {};

  on<K extends keyof T>(event: K, listener: (data: T[K]) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(listener);
  }

  off<K extends keyof T>(event: K, listener: (data: T[K]) => void): void {
    const listeners = this.listeners[event];
    if (!listeners) return;
    this.listeners[event] = listeners.filter(l => l !== listener);
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    const listeners = this.listeners[event];
    if (!listeners) return;
    listeners.forEach(listener => listener(data));
  }
}

// 使用例
const emitter = new TypedEventEmitter<EventMap>();

emitter.on('userLogin', (data) => {
  console.log(`User ${data.userId} logged in at ${data.timestamp}`);
});

emitter.emit('userLogin', {
  userId: 123,
  timestamp: new Date()
});

// 型エラー: propertyが不足
// emitter.emit('userLogin', { userId: 123 });
```

### パターン2: Builderパターン

```typescript
interface QueryConfig {
  table: string;
  columns: string[];
  where: Array<{ column: string; operator: string; value: unknown }>;
  orderBy?: { column: string; direction: 'ASC' | 'DESC' };
  limit?: number;
  offset?: number;
}

class QueryBuilder {
  private config: QueryConfig;

  constructor(table: string) {
    this.config = {
      table,
      columns: ['*'],
      where: []
    };
  }

  select(...columns: string[]): this {
    this.config.columns = columns;
    return this;
  }

  where(column: string, operator: string, value: unknown): this {
    this.config.where.push({ column, operator, value });
    return this;
  }

  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.config.orderBy = { column, direction };
    return this;
  }

  limit(count: number): this {
    this.config.limit = count;
    return this;
  }

  offset(count: number): this {
    this.config.offset = count;
    return this;
  }

  build(): string {
    let query = `SELECT ${this.config.columns.join(', ')} FROM ${this.config.table}`;

    if (this.config.where.length > 0) {
      const conditions = this.config.where
        .map(w => `${w.column} ${w.operator} ?`)
        .join(' AND ');
      query += ` WHERE ${conditions}`;
    }

    if (this.config.orderBy) {
      query += ` ORDER BY ${this.config.orderBy.column} ${this.config.orderBy.direction}`;
    }

    if (this.config.limit !== undefined) {
      query += ` LIMIT ${this.config.limit}`;
    }

    if (this.config.offset !== undefined) {
      query += ` OFFSET ${this.config.offset}`;
    }

    return query;
  }
}

// 使用例（メソッドチェーン）
const query = new QueryBuilder('users')
  .select('id', 'name', 'email')
  .where('age', '>=', 18)
  .where('active', '=', true)
  .orderBy('name', 'ASC')
  .limit(20)
  .offset(0)
  .build();

console.log(query);
// SELECT id, name, email FROM users WHERE age >= ? AND active = ? ORDER BY name ASC LIMIT 20 OFFSET 0
```

### パターン3: Result型（エラーハンドリング）

```typescript
// 成功と失敗を型で表現する
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// ヘルパー関数
function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// 使用例: ユーザー入力のバリデーション
interface ValidationError {
  field: string;
  message: string;
}

function validateEmail(email: string): Result<string, ValidationError> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return err({ field: 'email', message: '有効なメールアドレスを入力してください' });
  }
  return ok(email);
}

function validateAge(age: number): Result<number, ValidationError> {
  if (age < 0 || age > 150) {
    return err({ field: 'age', message: '年齢は0-150の範囲で入力してください' });
  }
  return ok(age);
}

interface UserInput {
  name: string;
  email: string;
  age: number;
}

function validateUserInput(input: UserInput): Result<UserInput, ValidationError[]> {
  const errors: ValidationError[] = [];

  if (input.name.trim().length === 0) {
    errors.push({ field: 'name', message: '名前は必須です' });
  }

  const emailResult = validateEmail(input.email);
  if (!emailResult.ok) {
    errors.push(emailResult.error);
  }

  const ageResult = validateAge(input.age);
  if (!ageResult.ok) {
    errors.push(ageResult.error);
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(input);
}

// 呼び出し側
const result = validateUserInput({
  name: '田中太郎',
  email: 'tanaka@example.com',
  age: 30
});

if (result.ok) {
  console.log('バリデーション成功:', result.value);
} else {
  console.error('バリデーションエラー:', result.error);
}
```

---

## tsconfig.jsonの推奨設定

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],

    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,

    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,

    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

参照: TypeScript公式ドキュメント「TSConfig Reference」（https://www.typescriptlang.org/tsconfig/）で各オプションの詳細を確認できます。

重要なのは `"strict": true` を最初から有効にすることです。後から有効にすると大量のエラーが発生するため、プロジェクト開始時に設定することを強く推奨します。

---

## 学習リソースまとめ

### 公式ドキュメント

| リソース | URL | 特徴 |
|---------|-----|------|
| TypeScript Handbook | https://www.typescriptlang.org/docs/handbook/ | 公式。最も正確 |
| TypeScript Playground | https://www.typescriptlang.org/play | ブラウザで即座に試せる |
| Type Challenges | https://github.com/type-challenges/type-challenges | 型パズルで実力を鍛える |

### 書籍

| 書籍 | 著者 | おすすめ度 |
|------|------|----------|
| プロを目指す人のためのTypeScript入門 | 鈴木僚太 | 最高（日本語で最も体系的） |
| Effective TypeScript | Dan Vanderkam | 高（英語。中級者向け） |
| Programming TypeScript | Boris Cherny | 高（英語。網羅的） |

### 学習の順序

TypeScript習得は以下の順序で進めてください。

```
1. 基本型とインターフェース（Phase 1: 1-2週間）
   ↓
2. ユニオン型とリテラル型（Phase 2: 1-2週間）
   ↓
3. ジェネリクス（Phase 3: 2-3週間）
   ↓
4. ユーティリティ型（Phase 4: 1-2週間）
   ↓
5. 高度な型パターン（Phase 5: 2-3週間）
   ↓
6. 実践パターン集（Phase 6: 2-3週間）
```

合計で約9-15週間が目安です。

---

## まとめ

TypeScriptの習得は、JavaScriptの知識がある状態からスタートすれば、体系的に学ぶことで3-4ヶ月で実務レベルに到達できます。

最も重要なのは以下の3点です。

1. **`strict: true`を最初から有効にする**: 甘い設定で始めると後で苦労する
2. **`any`を使わない**: `unknown`と型ガードで対応する習慣をつける
3. **段階的に学ぶ**: 基本型→ユニオン→ジェネリクス→ユーティリティ型の順序を守る

TypeScriptの型システムは奥が深いですが、実務で使うパターンは限られています。この記事で紹介したパターンを一つずつ実践し、手を動かしながら身につけてください。

参考文献:
- TypeScript公式ドキュメント: https://www.typescriptlang.org/docs/
- State of JavaScript Survey: https://stateofjs.com/
- TypeScript Deep Dive（日本語訳）: https://typescript-jp.gitbook.io/deep-dive/

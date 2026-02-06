---
title: "TypeScript const アサーション完全解説 - より厳密な型推論を実現する"
description: "TypeScript の const アサーションの基本から実践的な活用方法まで。リテラル型の保持、イミュータブルな型定義、型安全性の向上など、実務で役立つテクニックを詳しく解説します。"
pubDate: "2025-02-05"
tags: ["TypeScript", "Programming", "WebDevelopment"]
---

TypeScript 3.4 で導入された **const アサーション**は、型推論をより厳密にし、型安全性を向上させる強力な機能です。しかし、その真価を理解して使いこなしている開発者は多くありません。

この記事では、const アサーションの基本から実践的な活用方法まで詳しく解説します。

## const アサーションとは

const アサーションは、`as const` という構文を使って、TypeScript に「この値をできるだけ厳密な型として扱ってほしい」と伝える機能です。

### 基本的な構文

```typescript
// const アサーションを使わない場合
const colors = ['red', 'green', 'blue'];
// 型: string[]

// const アサーションを使う場合
const colors = ['red', 'green', 'blue'] as const;
// 型: readonly ['red', 'green', 'blue']
```

## const アサーションの効果

const アサーションを使うと、以下の3つの効果があります。

### 1. リテラル型の保持

```typescript
// ❌ 通常の推論
let status = 'success';
// 型: string

// ✅ const アサーション
let status = 'success' as const;
// 型: 'success'

// オブジェクトの場合
const config = {
  timeout: 3000,
  method: 'GET',
};
// 型: { timeout: number; method: string; }

const config = {
  timeout: 3000,
  method: 'GET',
} as const;
// 型: { readonly timeout: 3000; readonly method: 'GET'; }
```

### 2. プロパティの readonly 化

```typescript
const point = { x: 10, y: 20 } as const;
// 型: { readonly x: 10; readonly y: 20; }

point.x = 30; // ❌ エラー: Cannot assign to 'x' because it is a read-only property
```

### 3. 配列のタプル化

```typescript
// 通常の配列
const numbers = [1, 2, 3];
// 型: number[]

// const アサーション
const numbers = [1, 2, 3] as const;
// 型: readonly [1, 2, 3]

numbers.push(4); // ❌ エラー: Property 'push' does not exist on type 'readonly [1, 2, 3]'
```

## 実践的な活用例

### 1. 定数の定義

```typescript
// ❌ 型安全性が低い
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE'];
type HttpMethod = typeof HTTP_METHODS[number]; // string

// ✅ リテラル型を保持
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE'] as const;
type HttpMethod = typeof HTTP_METHODS[number]; // 'GET' | 'POST' | 'PUT' | 'DELETE'

function request(method: HttpMethod) {
  // method は厳密な型
}

request('GET'); // ✅
request('PATCH'); // ❌ エラー
```

### 2. ルーティング定義

```typescript
const routes = {
  home: '/',
  about: '/about',
  users: '/users',
  userDetail: '/users/:id',
} as const;

type Route = typeof routes[keyof typeof routes];
// '/' | '/about' | '/users' | '/users/:id'

function navigate(route: Route) {
  window.location.href = route;
}

navigate('/'); // ✅
navigate('/users'); // ✅
navigate('/invalid'); // ❌ エラー
```

### 3. API レスポンスの型定義

```typescript
const API_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  PENDING: 'pending',
} as const;

type ApiStatus = typeof API_STATUS[keyof typeof API_STATUS];
// 'success' | 'error' | 'pending'

interface ApiResponse<T> {
  status: ApiStatus;
  data?: T;
  error?: string;
}

function handleResponse(response: ApiResponse<any>) {
  if (response.status === 'success') {
    // TypeScriptが正しく絞り込める
    console.log(response.data);
  }
}
```

### 4. 設定オブジェクト

```typescript
const appConfig = {
  api: {
    baseUrl: 'https://api.example.com',
    timeout: 5000,
    retries: 3,
  },
  features: {
    darkMode: true,
    analytics: false,
  },
} as const;

type AppConfig = typeof appConfig;

// 設定を型安全に使用
function getApiUrl(config: AppConfig): string {
  return config.api.baseUrl; // 型: 'https://api.example.com'
}

// ディープな readonly
appConfig.api.timeout = 10000; // ❌ エラー
appConfig.features.darkMode = false; // ❌ エラー
```

### 5. Enum の代替

```typescript
// ❌ 従来の Enum
enum Color {
  Red = 'red',
  Green = 'green',
  Blue = 'blue',
}

// ✅ const アサーション（よりシンプル）
const Color = {
  Red: 'red',
  Green: 'green',
  Blue: 'blue',
} as const;

type Color = typeof Color[keyof typeof Color];
// 'red' | 'green' | 'blue'

function setColor(color: Color) {
  // ...
}

setColor(Color.Red); // ✅
setColor('red'); // ✅（値としても使える）
```

## パターンとイディオム

### 1. ユニオン型の生成

```typescript
const ROLES = ['admin', 'user', 'guest'] as const;
type Role = typeof ROLES[number];
// 'admin' | 'user' | 'guest'

function hasPermission(role: Role): boolean {
  return role === 'admin';
}
```

### 2. キーのユニオン型

```typescript
const translations = {
  en: { hello: 'Hello', goodbye: 'Goodbye' },
  ja: { hello: 'こんにちは', goodbye: 'さようなら' },
} as const;

type Language = keyof typeof translations;
// 'en' | 'ja'

type TranslationKey = keyof typeof translations.en;
// 'hello' | 'goodbye'

function translate(lang: Language, key: TranslationKey): string {
  return translations[lang][key];
}
```

### 3. 関数のパラメータ制約

```typescript
const SORT_OPTIONS = {
  nameAsc: { field: 'name', order: 'asc' },
  nameDesc: { field: 'name', order: 'desc' },
  dateAsc: { field: 'date', order: 'asc' },
  dateDesc: { field: 'date', order: 'desc' },
} as const;

type SortOption = keyof typeof SORT_OPTIONS;

function sortData(option: SortOption) {
  const { field, order } = SORT_OPTIONS[option];
  // field は 'name' | 'date'
  // order は 'asc' | 'desc'
}
```

### 4. タプルのバリデーション

```typescript
function parseCoordinates(input: string) {
  const parts = input.split(',');

  if (parts.length !== 2) {
    throw new Error('Invalid coordinates');
  }

  return [parseFloat(parts[0]), parseFloat(parts[1])] as const;
  // 戻り値の型: readonly [number, number]
}

const [x, y] = parseCoordinates('10,20');
// x: number, y: number
```

## 実践的なユースケース

### React コンポーネントのProps

```typescript
const BUTTON_VARIANTS = ['primary', 'secondary', 'danger'] as const;
const BUTTON_SIZES = ['sm', 'md', 'lg'] as const;

type ButtonVariant = typeof BUTTON_VARIANTS[number];
type ButtonSize = typeof BUTTON_SIZES[number];

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

function Button({ variant = 'primary', size = 'md', children }: ButtonProps) {
  return (
    <button className={`btn-${variant} btn-${size}`}>
      {children}
    </button>
  );
}

// 使用時に型チェック
<Button variant="primary" size="md">Click</Button> // ✅
<Button variant="invalid" size="xl">Click</Button> // ❌ エラー
```

### Redux アクション

```typescript
// アクションタイプの定義
const actionTypes = {
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  SET_THEME: 'SET_THEME',
} as const;

type ActionType = typeof actionTypes[keyof typeof actionTypes];

// アクション生成関数
function createAction<T extends ActionType, P>(type: T, payload: P) {
  return { type, payload } as const;
}

// 使用例
const loginAction = createAction(actionTypes.USER_LOGIN, { id: 1, name: 'Alice' });
// 型: { readonly type: 'USER_LOGIN'; readonly payload: { id: number; name: string; } }

const logoutAction = createAction(actionTypes.USER_LOGOUT, undefined);
// 型: { readonly type: 'USER_LOGOUT'; readonly payload: undefined }
```

### フォームのバリデーション

```typescript
const VALIDATION_RULES = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Invalid email address',
  },
  password: {
    required: true,
    minLength: 8,
    message: 'Password must be at least 8 characters',
  },
} as const;

type ValidationRules = typeof VALIDATION_RULES;
type FieldName = keyof ValidationRules;

function validate(field: FieldName, value: string): boolean {
  const rule = VALIDATION_RULES[field];

  if (rule.required && !value) {
    console.error(rule.message);
    return false;
  }

  if ('pattern' in rule && !rule.pattern.test(value)) {
    console.error(rule.message);
    return false;
  }

  if ('minLength' in rule && value.length < rule.minLength) {
    console.error(rule.message);
    return false;
  }

  return true;
}
```

### API エンドポイントの定義

```typescript
const API_ENDPOINTS = {
  users: {
    list: '/api/users',
    detail: (id: number) => `/api/users/${id}`,
    create: '/api/users',
    update: (id: number) => `/api/users/${id}`,
    delete: (id: number) => `/api/users/${id}`,
  },
  posts: {
    list: '/api/posts',
    detail: (id: number) => `/api/posts/${id}`,
  },
} as const;

type ApiEndpoints = typeof API_ENDPOINTS;

async function fetchUser(id: number) {
  const url = API_ENDPOINTS.users.detail(id);
  const response = await fetch(url);
  return response.json();
}
```

## 注意点とベストプラクティス

### 1. パフォーマンスへの影響

```typescript
// ❌ 大きなオブジェクトに使うと型チェックが遅くなる可能性
const HUGE_CONFIG = {
  // 数千行の設定...
} as const;

// ✅ 必要な部分だけに使う
const IMPORTANT_CONFIG = {
  apiKey: 'xxx',
  endpoints: ['/', '/api'],
} as const;
```

### 2. ジェネリクスとの組み合わせ

```typescript
function createArray<T>(items: readonly T[]): T[] {
  return [...items];
}

const numbers = createArray([1, 2, 3] as const);
// 型: number[]（リテラル型は保持されない）

// より型安全な実装
function createTuple<T extends readonly unknown[]>(items: T): T {
  return items;
}

const numbers2 = createTuple([1, 2, 3] as const);
// 型: readonly [1, 2, 3]
```

### 3. satisfies との併用（TypeScript 4.9+）

```typescript
type Color = 'red' | 'green' | 'blue';

// ❌ 型エラーが起きない
const colors1 = ['red', 'green', 'yellow'] as const;

// ✅ satisfies で型チェック
const colors2 = ['red', 'green', 'blue'] as const satisfies readonly Color[];

const colors3 = ['red', 'green', 'yellow'] as const satisfies readonly Color[];
// ❌ エラー: 'yellow' は Color に含まれない
```

### 4. 型ヘルパーの作成

```typescript
// readonly を深く適用
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object
    ? DeepReadonly<T[P]>
    : T[P];
};

const config = {
  api: {
    url: 'https://example.com',
    timeout: 5000,
  },
} as const;

type Config = DeepReadonly<typeof config>;
```

## まとめ

const アサーションは、TypeScript の型システムを最大限に活用するための強力なツールです。

**主な利点:**
1. より厳密な型推論
2. イミュータブルな値の定義
3. リテラル型の保持
4. Enum の代替として使える

**使いどころ:**
- 定数の定義
- 設定オブジェクト
- APIエンドポイント
- ルーティング定義
- バリデーションルール

適切に使用することで、より型安全で保守しやすいコードを書くことができます。

## 参考リンク

- [TypeScript 3.4 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html#const-assertions)
- [TypeScript Deep Dive - const assertions](https://basarat.gitbook.io/typescript/type-system/literal-types#const-assertions)

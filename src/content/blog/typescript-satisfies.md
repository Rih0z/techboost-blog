---
title: "TypeScript satisfies 演算子完全解説 - 型安全性と柔軟性の両立"
description: "TypeScript 4.9で導入されたsatisfies演算子の使い方を徹底解説。型アサーション(as)との違い、実践的なユースケース、オブジェクト・配列・関数での活用方法を具体例とともに紹介。TypeScript・型安全・プログラミングに関する実践情報。"
pubDate: "2025-02-05"
tags: ["TypeScript", "型安全", "プログラミング"]
heroImage: '../../assets/thumbnails/typescript-satisfies.jpg'
---
TypeScript 4.9で導入された`satisfies`演算子は、型安全性を保ちながら推論される型を維持できる画期的な機能です。本記事では、その使い方と実践的なテクニックを詳しく解説します。

## satisfies 演算子とは

`satisfies`演算子は、値が特定の型を満たしていることを検証しつつ、元の値の詳細な型情報を保持する機能です。従来の型アサーション(`as`)とは異なり、型の拡大を防ぎながら型チェックを行えます。

### 基本構文

```typescript
const value = expression satisfies Type;
```

## asとの違い

### 型アサーション (as) の問題点

```typescript
type Config = {
  endpoint: string;
  timeout: number;
};

// asを使った場合
const config = {
  endpoint: "https://api.example.com",
  timeout: 5000,
  retries: 3, // 余計なプロパティがあってもエラーにならない
} as Config;

// configの型はConfigになる
// retriesプロパティにアクセスできない
config.retries; // エラー: Property 'retries' does not exist on type 'Config'

// 間違った値でもエラーにならない
const badConfig = {
  endpoint: 123, // 本来はstringであるべき
  timeout: "5000", // 本来はnumberであるべき
} as Config; // エラーにならない！
```

### satisfies の利点

```typescript
type Config = {
  endpoint: string;
  timeout: number;
};

// satisfiesを使った場合
const config = {
  endpoint: "https://api.example.com",
  timeout: 5000,
  retries: 3,
} satisfies Config;

// 元の型が保持される
config.retries; // OK: number型として推論される

// 間違った値は即座にエラー
const badConfig = {
  endpoint: 123, // エラー: Type 'number' is not assignable to type 'string'
  timeout: "5000", // エラー: Type 'string' is not assignable to type 'number'
} satisfies Config;
```

## 実践的なユースケース

### 設定オブジェクトの型安全性

```typescript
type Environment = 'development' | 'staging' | 'production';

type EnvironmentConfig = {
  apiUrl: string;
  debug: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
};

// 全環境の設定を定義
const envConfigs = {
  development: {
    apiUrl: 'http://localhost:3000',
    debug: true,
    logLevel: 'debug',
  },
  staging: {
    apiUrl: 'https://staging.example.com',
    debug: true,
    logLevel: 'info',
  },
  production: {
    apiUrl: 'https://api.example.com',
    debug: false,
    logLevel: 'error',
  },
} satisfies Record<Environment, EnvironmentConfig>;

// 型安全にアクセスできる
const currentEnv: Environment = 'production';
const config = envConfigs[currentEnv];

// 自動補完が効く
config.apiUrl; // string
config.debug; // boolean
config.logLevel; // 'error' | 'warn' | 'info' | 'debug'

// 環境名のタイポを防ぐ
envConfigs.prod; // エラー: Property 'prod' does not exist
```

### ルーティング設定

```typescript
type Route = {
  path: string;
  component: string;
  meta?: {
    requiresAuth?: boolean;
    title?: string;
  };
};

const routes = [
  {
    path: '/',
    component: 'Home',
    meta: { title: 'ホーム' },
  },
  {
    path: '/about',
    component: 'About',
    meta: { title: '会社概要' },
  },
  {
    path: '/dashboard',
    component: 'Dashboard',
    meta: {
      requiresAuth: true,
      title: 'ダッシュボード',
    },
  },
] satisfies Route[];

// 配列の要素型が正確に推論される
routes[0].path; // string
routes[0].component; // string
routes[0].meta?.title; // string | undefined

// タイポを即座に検出
const invalidRoute = {
  path: '/test',
  compnent: 'Test', // エラー: Object literal may only specify known properties
  meta: { title: 'テスト' },
} satisfies Route;
```

### カラーパレットの定義

```typescript
type Color = `#${string}`;

type ColorPalette = {
  primary: Color;
  secondary: Color;
  success: Color;
  error: Color;
  warning: Color;
};

const colors = {
  primary: '#007bff',
  secondary: '#6c757d',
  success: '#28a745',
  error: '#dc3545',
  warning: '#ffc107',
} satisfies ColorPalette;

// リテラル型が保持される
type PrimaryColor = typeof colors.primary; // "#007bff"

// 無効な色コードを検出
const invalidColors = {
  primary: 'blue', // エラー: Type '"blue"' is not assignable to type '`#${string}`'
  secondary: '#gg0000', // これは通ってしまう（テンプレートリテラルの限界）
  success: '#28a745',
  error: '#dc3545',
  warning: '#ffc107',
} satisfies ColorPalette;
```

### APIレスポンスのバリデーション

```typescript
type ApiResponse<T> = {
  data: T;
  status: number;
  message: string;
};

type User = {
  id: number;
  name: string;
  email: string;
};

// モックレスポンスの定義
const mockUserResponse = {
  data: {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
  },
  status: 200,
  message: 'Success',
} satisfies ApiResponse<User>;

// データ部分の詳細な型が保持される
mockUserResponse.data.id; // number
mockUserResponse.data.name; // string

// 型チェックが効く
const invalidResponse = {
  data: {
    id: '1', // エラー: Type 'string' is not assignable to type 'number'
    name: 'John Doe',
    email: 'john@example.com',
  },
  status: 200,
  message: 'Success',
} satisfies ApiResponse<User>;
```

## 高度な型パターン

### 判別可能なユニオン型

```typescript
type Action =
  | { type: 'INCREMENT'; payload: number }
  | { type: 'DECREMENT'; payload: number }
  | { type: 'RESET' };

// 各アクションの型を正確に保持
const actions = {
  increment: (amount: number) =>
    ({ type: 'INCREMENT', payload: amount } satisfies Action),

  decrement: (amount: number) =>
    ({ type: 'DECREMENT', payload: amount } satisfies Action),

  reset: () =>
    ({ type: 'RESET' } satisfies Action),
};

// 型安全なアクション生成
const action1 = actions.increment(5);
action1.type; // "INCREMENT"
action1.payload; // number

const action2 = actions.reset();
action2.type; // "RESET"
action2.payload; // エラー: Property 'payload' does not exist

// reducer での使用
function reducer(state: number, action: Action): number {
  switch (action.type) {
    case 'INCREMENT':
      return state + action.payload;
    case 'DECREMENT':
      return state - action.payload;
    case 'RESET':
      return 0;
  }
}
```

### ネストしたオブジェクトの型安全性

```typescript
type DeepConfig = {
  app: {
    name: string;
    version: string;
  };
  database: {
    host: string;
    port: number;
    credentials: {
      username: string;
      password: string;
    };
  };
  features: {
    [key: string]: boolean;
  };
};

const config = {
  app: {
    name: 'MyApp',
    version: '1.0.0',
  },
  database: {
    host: 'localhost',
    port: 5432,
    credentials: {
      username: 'admin',
      password: 'secret',
    },
  },
  features: {
    darkMode: true,
    notifications: false,
    analytics: true,
  },
} satisfies DeepConfig;

// ネストされた値も型安全
config.app.name; // string
config.database.port; // number
config.features.darkMode; // boolean

// 新しいfeatureを追加できる
config.features.newFeature = true; // OK
```

### 関数のシグネチャ検証

```typescript
type MathOperation = (a: number, b: number) => number;

const operations = {
  add: (a: number, b: number) => a + b,
  subtract: (a: number, b: number) => a - b,
  multiply: (a: number, b: number) => a * b,
  divide: (a: number, b: number) => a / b,
} satisfies Record<string, MathOperation>;

// 関数の型が保持される
const result = operations.add(5, 3); // number

// 間違ったシグネチャを検出
const invalidOperations = {
  add: (a: number, b: number) => a + b,
  toString: (a: number) => a.toString(), // エラー: 型が合わない
} satisfies Record<string, MathOperation>;
```

### 型ガードとの組み合わせ

```typescript
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; sideLength: number }
  | { kind: 'rectangle'; width: number; height: number };

const shapes = [
  { kind: 'circle', radius: 10 },
  { kind: 'square', sideLength: 20 },
  { kind: 'rectangle', width: 30, height: 40 },
] satisfies Shape[];

function calculateArea(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'square':
      return shape.sideLength ** 2;
    case 'rectangle':
      return shape.width * shape.height;
  }
}

// 型安全に面積を計算
shapes.forEach((shape) => {
  console.log(`Area: ${calculateArea(shape)}`);
});
```

## ジェネリクスとの組み合わせ

### ジェネリック関数での使用

```typescript
function createStore<T>(initialState: T) {
  let state = initialState;

  return {
    getState: () => state,
    setState: (newState: T) => {
      state = newState;
    },
  };
}

// satisfiesでストアの初期状態を検証
type TodoState = {
  todos: string[];
  filter: 'all' | 'active' | 'completed';
};

const todoStore = createStore({
  todos: [],
  filter: 'all',
} satisfies TodoState);

// 型安全に使用できる
todoStore.setState({
  todos: ['Buy milk'],
  filter: 'active',
});

// 無効な状態を検出
todoStore.setState({
  todos: ['Buy milk'],
  filter: 'invalid', // エラー: Type '"invalid"' is not assignable to type '"all" | "active" | "completed"'
});
```

### ジェネリック制約との組み合わせ

```typescript
function validateData<T extends Record<string, any>>(
  schema: T,
  data: unknown
): data is T {
  // バリデーションロジック
  return true;
}

type UserSchema = {
  name: string;
  age: number;
  email: string;
};

const userSchema = {
  name: 'string',
  age: 'number',
  email: 'string',
} satisfies Record<keyof UserSchema, string>;

// スキーマが正しいことを保証
const isValid = validateData(userSchema, {
  name: 'John',
  age: 30,
  email: 'john@example.com',
});
```

## React での活用

### コンポーネントのProps検証

```typescript
import type { CSSProperties } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

type ButtonProps = {
  variant: ButtonVariant;
  onClick: () => void;
  children: React.ReactNode;
  style?: CSSProperties;
};

// ボタンのスタイルを定義
const buttonStyles = {
  primary: {
    backgroundColor: '#007bff',
    color: 'white',
  },
  secondary: {
    backgroundColor: '#6c757d',
    color: 'white',
  },
  danger: {
    backgroundColor: '#dc3545',
    color: 'white',
  },
} satisfies Record<ButtonVariant, CSSProperties>;

// コンポーネントで使用
function Button({ variant, onClick, children, style }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{ ...buttonStyles[variant], ...style }}
    >
      {children}
    </button>
  );
}
```

### イベントハンドラーマップ

```typescript
type EventHandler<T> = (event: T) => void;

type FormEvents = {
  submit: React.FormEvent<HTMLFormElement>;
  change: React.ChangeEvent<HTMLInputElement>;
  focus: React.FocusEvent<HTMLInputElement>;
  blur: React.FocusEvent<HTMLInputElement>;
};

const formHandlers = {
  submit: (event) => {
    event.preventDefault();
    console.log('Form submitted');
  },
  change: (event) => {
    console.log('Input changed:', event.target.value);
  },
  focus: (event) => {
    console.log('Input focused');
  },
  blur: (event) => {
    console.log('Input blurred');
  },
} satisfies {
  [K in keyof FormEvents]: EventHandler<FormEvents[K]>;
};

// イベントハンドラーの型が正確に推論される
formHandlers.submit; // (event: React.FormEvent<HTMLFormElement>) => void
formHandlers.change; // (event: React.ChangeEvent<HTMLInputElement>) => void
```

## パフォーマンスへの影響

`satisfies`演算子は型チェック時のみ機能し、コンパイル後のJavaScriptには一切影響しません。

```typescript
// TypeScript
const config = {
  timeout: 5000,
} satisfies { timeout: number };

// コンパイル後のJavaScript
const config = {
  timeout: 5000,
};
```

ランタイムオーバーヘッドは一切なく、型安全性のみを提供します。

## ベストプラクティス

### 1. 設定オブジェクトには常にsatisfiesを使う

```typescript
// Good
const config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
} satisfies AppConfig;

// Bad
const config: AppConfig = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
};
```

### 2. 型の詳細さが重要な場合に使用

```typescript
// リテラル型を保持したい場合
const status = 'success' satisfies 'success' | 'error';
type Status = typeof status; // "success"

// 型を拡大したくない場合
const colors = ['red', 'green', 'blue'] satisfies string[];
type FirstColor = typeof colors[0]; // string
```

### 3. 複雑なオブジェクトの構造検証

```typescript
type ComplexSchema = {
  metadata: Record<string, string | number>;
  data: Array<{
    id: string;
    value: number;
  }>;
};

const apiResponse = {
  metadata: {
    version: '1.0',
    timestamp: Date.now(),
  },
  data: [
    { id: 'a1', value: 100 },
    { id: 'a2', value: 200 },
  ],
} satisfies ComplexSchema;
```

### 4. ユニオン型の絞り込み

```typescript
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function handleResult<T>(result: Result<T>) {
  if (result.success) {
    // result.dataは自動的にT型と推論される
    console.log(result.data);
  } else {
    // result.errorは自動的にstring型と推論される
    console.error(result.error);
  }
}

// 使用例
const successResult = {
  success: true,
  data: { id: 1, name: 'John' },
} satisfies Result<{ id: number; name: string }>;

handleResult(successResult);
```

## トラブルシューティング

### よくあるエラーと解決法

#### エラー1: 余分なプロパティ

```typescript
type User = {
  name: string;
  age: number;
};

// エラー: Object literal may only specify known properties
const user = {
  name: 'John',
  age: 30,
  email: 'john@example.com', // 余分なプロパティ
} satisfies User;

// 解決策: インデックスシグネチャを使用
type FlexibleUser = User & {
  [key: string]: any;
};

const user2 = {
  name: 'John',
  age: 30,
  email: 'john@example.com',
} satisfies FlexibleUser;
```

#### エラー2: 型の不一致

```typescript
type Config = {
  timeout: number;
};

// エラー: Type 'string' is not assignable to type 'number'
const config = {
  timeout: '5000',
} satisfies Config;

// 解決策: 正しい型を使用
const config2 = {
  timeout: 5000,
} satisfies Config;
```

## まとめ

`satisfies`演算子は、TypeScriptにおける型安全性と柔軟性を両立させる強力な機能です。従来の型アサーション(`as`)や型注釈(`: Type`)では実現できなかった、「型制約の検証」と「推論された型の保持」を同時に行えます。

特に、設定オブジェクト、ルーティング定義、カラーパレット、APIレスポンスなど、構造化されたデータを扱う際に威力を発揮します。適切に活用することで、より安全で保守性の高いコードを書くことができるでしょう。

TypeScript 4.9以降を使用している場合は、積極的に`satisfies`演算子を活用し、型安全性の向上を図りましょう。

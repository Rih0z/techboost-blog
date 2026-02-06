---
title: "TypeScript satisfies演算子完全ガイド - 型安全とリテラル推論の両立"
description: "TypeScript 4.9で導入されたsatisfies演算子の使い方を徹底解説。as型アサーションとの違い、実践的なユースケース、型安全性の向上方法を実例付きで学べます。"
pubDate: "2025-02-05"
tags: ["TypeScript", "型システム", "型安全性", "静的解析"]
---

## はじめに

TypeScript 4.9で導入された`satisfies`演算子は、**型安全性とリテラル推論を両立**する画期的な機能です。

従来の`as`型アサーションや型注釈では解決できなかった問題を、エレガントに解決します。

### satisfiesが解決する問題

```typescript
// 従来の問題: 型注釈を使うとリテラル型が失われる
type Color = "red" | "green" | "blue" | { r: number; g: number; b: number }

const palette: Record<string, Color> = {
  primary: "red",      // string型に広がる（"red"リテラルが失われる）
  secondary: { r: 0, g: 255, b: 0 },
}

palette.primary.toUpperCase() // エラーにならない（stringと推論されるため）

// satisfiesを使った解決
const palette = {
  primary: "red",      // "red"リテラル型が保持される
  secondary: { r: 0, g: 255, b: 0 },
} satisfies Record<string, Color>

palette.primary.toUpperCase() // ✓ 正しく動作（"red"型）
palette.primary = "yellow"    // ✗ エラー（"red"型に"yellow"は代入不可）
```

この記事では、`satisfies`の仕組みと実践的な活用方法を深掘りします。

## satisfies演算子の基本

### 構文

```typescript
const value = expression satisfies Type
```

`satisfies`は、**式が指定した型を満たすことを検証しつつ、式の元の型を保持**します。

### as型アサーションとの違い

```typescript
type User = {
  name: string
  age: number
}

// as型アサーション: 型チェックを上書き（危険）
const user1 = { name: "Alice" } as User
// ✗ ageがなくてもエラーにならない（実行時エラーの原因）

// satisfies演算子: 型チェックを実行（安全）
const user2 = { name: "Alice" } satisfies User
// ✓ エラー: Property 'age' is missing

// 正しい例
const user3 = { name: "Alice", age: 30 } satisfies User
// ✓ 型チェックOK & リテラル型保持
```

### 型注釈との違い

```typescript
// 型注釈: 型が広がる
const config: Record<string, string> = {
  apiUrl: "https://api.example.com",
  wsUrl: "wss://ws.example.com",
}

config.apiUrl // string型（リテラルが失われる）

// satisfies: リテラル型が保持される
const config = {
  apiUrl: "https://api.example.com",
  wsUrl: "wss://ws.example.com",
} satisfies Record<string, string>

config.apiUrl // "https://api.example.com" 型（リテラル型保持）
```

## 実践的なユースケース

### 1. ルーティング定義

```typescript
// ルート定義の型
type Route = {
  path: string
  component: string
  meta?: {
    requiresAuth?: boolean
    title?: string
  }
}

// 従来の方法（型注釈）
const routes: Record<string, Route> = {
  home: {
    path: "/",
    component: "Home",
  },
  dashboard: {
    path: "/dashboard",
    component: "Dashboard",
    meta: { requiresAuth: true },
  },
}

routes.home.path // string型（リテラルが失われる）
routes.unknownRoute // エラーにならない（Record型のため）

// satisfiesを使った改善
const routes = {
  home: {
    path: "/",
    component: "Home",
  },
  dashboard: {
    path: "/dashboard",
    component: "Dashboard",
    meta: { requiresAuth: true },
  },
} satisfies Record<string, Route>

routes.home.path // "/" 型（リテラル型保持）
routes.unknownRoute // ✗ エラー（存在しないプロパティ）

// 型安全なルート参照
function navigateTo(routeName: keyof typeof routes) {
  const route = routes[routeName]
  console.log(`Navigating to ${route.path}`)
}

navigateTo("home")      // ✓ OK
navigateTo("unknown")   // ✗ エラー
```

### 2. 環境変数の検証

```typescript
type Environment = "development" | "staging" | "production"

type Config = {
  env: Environment
  apiUrl: string
  features: {
    analytics: boolean
    betaFeatures: boolean
  }
}

// 設定の定義（型チェック + リテラル保持）
const config = {
  env: "production",
  apiUrl: "https://api.example.com",
  features: {
    analytics: true,
    betaFeatures: false,
  },
} satisfies Config

// リテラル型が保持されるため、型推論が正確
if (config.env === "production") {
  // ✓ 正確な型推論
}

config.env = "development" // ✗ エラー（"production"リテラルに代入不可）

// ユニオン型で柔軟性を持たせる
type Config2 = {
  env: Environment
  apiUrl: string
  debug?: boolean
}

const config2 = {
  env: "development" as const,
  apiUrl: "http://localhost:3000",
  debug: true,
} satisfies Config2

config2.env = "staging" // ✗ エラー（"development"リテラル）
```

### 3. APIレスポンスの型検証

```typescript
type ApiResponse<T> = {
  data: T
  status: "success" | "error"
  message?: string
}

type User = {
  id: number
  name: string
  email: string
}

// APIレスポンスのモック
const mockResponse = {
  data: {
    id: 1,
    name: "Alice",
    email: "alice@example.com",
  },
  status: "success",
} satisfies ApiResponse<User>

mockResponse.status // "success" 型（リテラル保持）
mockResponse.data.id // number型（リテラル化されない）

// エラーケースのテスト
const errorResponse = {
  data: null,
  status: "error",
  message: "User not found",
} satisfies ApiResponse<User | null>

// 型チェックが厳密に機能
const invalidResponse = {
  data: { id: 1, name: "Alice" }, // ✗ emailがない
  status: "success",
} satisfies ApiResponse<User> // エラー
```

### 4. イベントハンドラーマップ

```typescript
type EventMap = {
  click: (x: number, y: number) => void
  scroll: (offset: number) => void
  keydown: (key: string, modifiers: string[]) => void
}

// イベントハンドラーの定義
const handlers = {
  click: (x, y) => console.log(`Clicked at (${x}, ${y})`),
  scroll: (offset) => console.log(`Scrolled to ${offset}`),
  keydown: (key, modifiers) => console.log(`Key: ${key}, Modifiers: ${modifiers}`),
} satisfies EventMap

// 型安全なイベント発火
function emit<K extends keyof typeof handlers>(
  event: K,
  ...args: Parameters<typeof handlers[K]>
) {
  handlers[event](...args)
}

emit("click", 10, 20)           // ✓ OK
emit("scroll", 100)             // ✓ OK
emit("keydown", "Enter", [])    // ✓ OK
emit("click", "invalid")        // ✗ エラー（引数の型が違う）
emit("unknown", 1, 2)           // ✗ エラー（存在しないイベント）
```

### 5. テーマ設定

```typescript
type ColorValue = string | { light: string; dark: string }

type Theme = {
  colors: Record<string, ColorValue>
  spacing: Record<string, number>
}

// テーマ定義
const theme = {
  colors: {
    primary: "#007bff",
    secondary: { light: "#6c757d", dark: "#adb5bd" },
    success: "#28a745",
  },
  spacing: {
    small: 8,
    medium: 16,
    large: 24,
  },
} satisfies Theme

// リテラル型が保持される
theme.colors.primary // "#007bff" 型
theme.spacing.small  // 8 型

// 型安全なテーマアクセス
function getColor(name: keyof typeof theme.colors): ColorValue {
  return theme.colors[name]
}

getColor("primary")   // ✓ OK
getColor("unknown")   // ✗ エラー

// ダークモード対応の型安全な関数
function resolveColor(name: keyof typeof theme.colors, mode: "light" | "dark"): string {
  const color = theme.colors[name]
  if (typeof color === "string") return color
  return color[mode]
}
```

## 高度な使用例

### ジェネリック関数との組み合わせ

```typescript
// APIエンドポイント定義
type Endpoint<T> = {
  url: string
  method: "GET" | "POST" | "PUT" | "DELETE"
  response: T
}

type Endpoints = {
  getUser: Endpoint<{ id: number; name: string }>
  createUser: Endpoint<{ id: number }>
  deleteUser: Endpoint<{ success: boolean }>
}

// エンドポイント定義（型チェック + 推論）
const endpoints = {
  getUser: {
    url: "/api/users/:id",
    method: "GET",
    response: {} as { id: number; name: string },
  },
  createUser: {
    url: "/api/users",
    method: "POST",
    response: {} as { id: number },
  },
  deleteUser: {
    url: "/api/users/:id",
    method: "DELETE",
    response: {} as { success: boolean },
  },
} satisfies Endpoints

// 型安全なAPIクライアント
async function callApi<K extends keyof typeof endpoints>(
  endpoint: K,
  params?: Record<string, string>
): Promise<typeof endpoints[K]["response"]> {
  const config = endpoints[endpoint]
  const url = config.url.replace(/:(\w+)/g, (_, key) => params?.[key] ?? "")

  const response = await fetch(url, { method: config.method })
  return response.json()
}

// 使用例
const user = await callApi("getUser", { id: "123" })
user.name // string型（正確に推論される）

const created = await callApi("createUser")
created.id // number型
```

### 条件型との組み合わせ

```typescript
type ValueOrGetter<T> = T | (() => T)

type Config<T> = {
  [K in keyof T]: ValueOrGetter<T[K]>
}

type AppConfig = {
  apiUrl: string
  timeout: number
  retries: number
}

// 設定定義
const config = {
  apiUrl: "https://api.example.com",
  timeout: () => (process.env.NODE_ENV === "production" ? 5000 : 10000),
  retries: 3,
} satisfies Config<AppConfig>

// 値の解決関数
function resolveValue<T>(value: ValueOrGetter<T>): T {
  return typeof value === "function" ? (value as () => T)() : value
}

const apiUrl = resolveValue(config.apiUrl)     // string型
const timeout = resolveValue(config.timeout)   // number型
```

### バリデーションスキーマ

```typescript
type Validator<T> = (value: unknown) => value is T

type Schema<T> = {
  [K in keyof T]: Validator<T[K]>
}

type User = {
  id: number
  name: string
  email: string
  age?: number
}

// バリデータ定義
const isNumber = (value: unknown): value is number => typeof value === "number"
const isString = (value: unknown): value is string => typeof value === "string"

const userSchema = {
  id: isNumber,
  name: isString,
  email: isString,
  age: (value: unknown): value is number | undefined =>
    value === undefined || typeof value === "number",
} satisfies Schema<User>

// 型安全なバリデーション
function validate<T>(data: unknown, schema: Schema<T>): data is T {
  if (typeof data !== "object" || data === null) return false

  for (const key in schema) {
    const validator = schema[key]
    const value = (data as Record<string, unknown>)[key]
    if (!validator(value)) return false
  }

  return true
}

// 使用例
const data: unknown = { id: 1, name: "Alice", email: "alice@example.com" }

if (validate(data, userSchema)) {
  // この中では data は User 型として扱える
  console.log(data.name.toUpperCase())
}
```

## satisfiesのベストプラクティス

### 1. 設定ファイルでの使用

```typescript
// ✓ Good: 型チェック + リテラル保持
const dbConfig = {
  host: "localhost",
  port: 5432,
  database: "myapp",
} satisfies Record<string, string | number>

// ✗ Bad: 型が広がる
const dbConfig: Record<string, string | number> = {
  host: "localhost",
  port: 5432,
  database: "myapp",
}
```

### 2. 定数の型検証

```typescript
// ✓ Good: 厳密な型チェック
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
} satisfies Record<string, number>

// 自動補完が効く
HTTP_STATUS.OK // 200
```

### 3. ユニオン型の検証

```typescript
type Status = "pending" | "approved" | "rejected"

// ✓ Good: すべてのステータスが定義されているか検証
const statusMessages = {
  pending: "処理中",
  approved: "承認済み",
  rejected: "却下",
} satisfies Record<Status, string>

// もし1つでも欠けているとエラー
const incomplete = {
  pending: "処理中",
  approved: "承認済み",
  // rejected がない
} satisfies Record<Status, string> // ✗ エラー
```

## まとめ

`satisfies`演算子は、TypeScriptの型システムをより柔軟かつ安全に使うための強力なツールです。

### 主な利点

- **型安全性の向上** - 型チェックを実行しつつ、型情報を保持
- **リテラル型の保持** - 自動補完と型推論が正確に
- **asアサーションより安全** - 実行時エラーを防ぐ

### 使い分けガイド

| シーン | 推奨 |
|---|---|
| 設定オブジェクトの定義 | `satisfies` |
| ルーティング・イベントマップ | `satisfies` |
| 型の上書き（危険） | `as`（非推奨） |
| 変数の型宣言（型が広がってもOK） | 型注釈 `: Type` |

### 導入チェックリスト

- [ ] TypeScript 4.9以上にアップグレード
- [ ] 設定オブジェクトで`satisfies`を使用
- [ ] `as`アサーションを`satisfies`に置き換え
- [ ] ESLintで`consistent-type-assertions`ルールを設定

`satisfies`を活用すれば、型安全性と開発体験を両立した、より堅牢なTypeScriptコードが書けます。

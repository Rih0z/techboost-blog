---
title: "Effect-TS入門 — TypeScriptの関数型プログラミング"
description: "Effect-TSの基礎から実践まで。エラーハンドリング、依存性注入、並行処理を型安全に実装する方法を徹底解説。Zodとの比較も。"
pubDate: "2026-02-05"
tags: ["TypeScript", "Effect-TS", "関数型プログラミング", "エラーハンドリング"]
---

## Effect-TSとは

Effect-TSは、TypeScriptで関数型プログラミングを実現するための強力なライブラリです。エラーハンドリング、非同期処理、依存性注入などを型安全に扱うことができます。

従来のPromiseやtry-catchでは型情報が失われがちでしたが、Effect-TSを使えば「成功」「失敗」「必要な依存性」をすべて型で表現できます。

### Effect-TSの特徴

- **型安全なエラーハンドリング**: エラーの種類を型レベルで管理
- **依存性注入**: テスト可能で保守性の高いコード
- **並行処理の制御**: Promise.allやPromise.raceを型安全に
- **遅延評価**: 実行タイミングを完全にコントロール
- **リソース管理**: ファイルやDBコネクションの安全な管理

## インストール

```bash
npm install effect
```

Effect-TSはゼロ依存のライブラリで、非常に軽量です。

## 基本概念: Effect型

Effect-TSの中心となるのは`Effect`型です。

```typescript
import { Effect } from "effect"

// Effect<Success, Error, Requirements>
type MyEffect = Effect.Effect<string, Error, never>
```

Effectは3つの型パラメータを持ちます。

1. **Success**: 成功時の値の型
2. **Error**: エラー時の値の型
3. **Requirements**: 実行に必要な依存性の型

### シンプルな例

```typescript
import { Effect } from "effect"

// 成功する処理
const success = Effect.succeed("Hello, Effect!")

// 失敗する処理
const failure = Effect.fail(new Error("Something went wrong"))

// 同期処理をEffectに変換
const syncEffect = Effect.sync(() => {
  return Math.random()
})

// 非同期処理をEffectに変換
const asyncEffect = Effect.promise(() => {
  return fetch("https://api.example.com/data")
})
```

### Effectの実行

Effectは遅延評価されるため、定義しただけでは実行されません。明示的に実行する必要があります。

```typescript
import { Effect } from "effect"

const program = Effect.succeed("Hello!")

// Promiseとして実行
Effect.runPromise(program).then(console.log) // "Hello!"

// 同期実行（副作用なしの場合のみ）
const result = Effect.runSync(program) // "Hello!"
```

## エラーハンドリング

Effect-TSの最大の強みは、型安全なエラーハンドリングです。

### Result/Either型によるエラー表現

```typescript
import { Effect, Either } from "effect"

class NetworkError {
  readonly _tag = "NetworkError"
  constructor(readonly message: string) {}
}

class ParseError {
  readonly _tag = "ParseError"
  constructor(readonly message: string) {}
}

const fetchData = (url: string): Effect.Effect<string, NetworkError, never> => {
  return Effect.tryPromise({
    try: () => fetch(url).then(r => r.text()),
    catch: (error) => new NetworkError(String(error))
  })
}

const parseData = (data: string): Effect.Effect<object, ParseError, never> => {
  return Effect.try({
    try: () => JSON.parse(data),
    catch: () => new ParseError("Invalid JSON")
  })
}
```

### エラーの合成

```typescript
const program = fetchData("https://api.example.com/data").pipe(
  Effect.flatMap(parseData)
)

// 型: Effect<object, NetworkError | ParseError, never>
```

Effectを合成すると、エラー型も自動的に合成されます。これにより、どんなエラーが発生する可能性があるかが型で明確になります。

### エラーのハンドリング

```typescript
const handleError = program.pipe(
  Effect.catchTag("NetworkError", (error) => {
    console.error("Network error:", error.message)
    return Effect.succeed({})
  }),
  Effect.catchTag("ParseError", (error) => {
    console.error("Parse error:", error.message)
    return Effect.succeed({})
  })
)

// 型: Effect<object, never, never>
```

`catchTag`を使えば、特定のエラーだけをキャッチできます。すべてのエラーをハンドリングすると、エラー型が`never`になります。

### Either型との関係

```typescript
const result: Effect.Effect<Either.Either<object, NetworkError | ParseError>, never, never> =
  Effect.either(program)

Effect.runPromise(result).then((either) => {
  if (Either.isLeft(either)) {
    console.error("Error:", either.left)
  } else {
    console.log("Success:", either.right)
  }
})
```

`Effect.either`を使うと、エラーを値として扱えます。

## 依存性注入

Effect-TSの依存性注入は、テスト可能で保守性の高いコードを書くための強力な機能です。

### Contextによる依存性の定義

```typescript
import { Effect, Context } from "effect"

// データベースサービスの定義
class Database extends Context.Tag("Database")<
  Database,
  {
    query: (sql: string) => Effect.Effect<any[], Error, never>
  }
>() {}

// ロガーサービスの定義
class Logger extends Context.Tag("Logger")<
  Logger,
  {
    log: (message: string) => Effect.Effect<void, never, never>
  }
>() {}
```

### 依存性を使うEffectの定義

```typescript
const getUser = (id: string): Effect.Effect<User, Error, Database | Logger> => {
  return Effect.gen(function* (_) {
    const db = yield* _(Database)
    const logger = yield* _(Logger)

    yield* _(logger.log(`Fetching user ${id}`))
    const rows = yield* _(db.query(`SELECT * FROM users WHERE id = '${id}'`))

    if (rows.length === 0) {
      return yield* _(Effect.fail(new Error("User not found")))
    }

    return rows[0] as User
  })
}
```

`Effect.gen`はジェネレータ関数を使った記法で、async/awaitに似た書き方ができます。

### 依存性の提供

```typescript
// 本番環境用の実装
const DatabaseLive = Database.of({
  query: (sql: string) =>
    Effect.tryPromise({
      try: () => realDatabase.query(sql),
      catch: (error) => new Error(String(error))
    })
})

const LoggerLive = Logger.of({
  log: (message: string) =>
    Effect.sync(() => console.log(message))
})

// 依存性を提供して実行
const program = getUser("123").pipe(
  Effect.provideService(Database, DatabaseLive),
  Effect.provideService(Logger, LoggerLive)
)

Effect.runPromise(program)
```

### テスト用の実装

```typescript
const DatabaseTest = Database.of({
  query: (sql: string) =>
    Effect.succeed([{ id: "123", name: "Test User" }])
})

const LoggerTest = Logger.of({
  log: (message: string) => Effect.sync(() => {})
})

// テストで実行
const testProgram = getUser("123").pipe(
  Effect.provideService(Database, DatabaseTest),
  Effect.provideService(Logger, LoggerTest)
)

Effect.runPromise(testProgram).then((user) => {
  console.assert(user.name === "Test User")
})
```

依存性注入により、テスト時にモックを簡単に差し替えられます。

## 並行処理

Effect-TSは並行処理を型安全に扱えます。

### 複数のEffectの並行実行

```typescript
import { Effect } from "effect"

const task1 = Effect.sleep("1 second").pipe(
  Effect.map(() => "Task 1 done")
)

const task2 = Effect.sleep("2 seconds").pipe(
  Effect.map(() => "Task 2 done")
)

const task3 = Effect.sleep("500 millis").pipe(
  Effect.map(() => "Task 3 done")
)

// すべて並行実行
const allTasks = Effect.all([task1, task2, task3])
// 型: Effect<[string, string, string], never, never>

Effect.runPromise(allTasks).then(console.log)
// ["Task 1 done", "Task 2 done", "Task 3 done"]
```

### エラーハンドリング付き並行処理

```typescript
const task1 = Effect.succeed("OK")
const task2 = Effect.fail(new Error("Failed"))
const task3 = Effect.succeed("Also OK")

// デフォルトでは最初のエラーで停止
const result1 = Effect.all([task1, task2, task3])
// 型: Effect<[string, string, string], Error, never>

// すべて実行してエラーを収集
const result2 = Effect.all([task1, task2, task3], { mode: "validate" })
// 型: Effect<[string, string, string], Array<Error>, never>
```

### 競合（Race）

```typescript
const slow = Effect.sleep("10 seconds").pipe(
  Effect.map(() => "Slow")
)

const fast = Effect.sleep("1 second").pipe(
  Effect.map(() => "Fast")
)

// 最初に完了した方を返す
const race = Effect.race(slow, fast)

Effect.runPromise(race).then(console.log) // "Fast"
```

### 並行数の制限

```typescript
const tasks = Array.from({ length: 100 }, (_, i) =>
  Effect.sleep("1 second").pipe(
    Effect.map(() => `Task ${i}`)
  )
)

// 最大5つまで並行実行
const limited = Effect.all(tasks, { concurrency: 5 })

Effect.runPromise(limited)
```

## Zodとの比較

ZodとEffect-TSはよく比較されますが、役割が異なります。

### Zod: スキーマバリデーション

```typescript
import { z } from "zod"

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().min(0).max(120)
})

const result = UserSchema.safeParse(data)

if (result.success) {
  console.log(result.data)
} else {
  console.error(result.error)
}
```

Zodは**データの形状を検証**するためのライブラリです。

### Effect-TS: 処理全体の型安全性

```typescript
import { Effect, Schema } from "effect"

const UserSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  email: Schema.String,
  age: Schema.Number
})

const validateUser = (data: unknown): Effect.Effect<
  typeof UserSchema.Type,
  Schema.ParseError,
  never
> => {
  return Schema.decodeUnknown(UserSchema)(data)
}

const program = validateUser(data).pipe(
  Effect.flatMap((user) => saveToDatabase(user)),
  Effect.flatMap((user) => sendEmail(user.email))
)
```

Effect-TSは**処理全体のエラーハンドリングと依存性管理**を提供します。

### 組み合わせて使う

```typescript
import { z } from "zod"
import { Effect } from "effect"

const UserSchema = z.object({
  id: z.string(),
  name: z.string()
})

const validateWithZod = (data: unknown): Effect.Effect<
  z.infer<typeof UserSchema>,
  Error,
  never
> => {
  return Effect.try({
    try: () => UserSchema.parse(data),
    catch: (error) => new Error(String(error))
  })
}

const program = validateWithZod(data).pipe(
  Effect.flatMap((user) => processUser(user))
)
```

ZodでバリデーションをしてからEffect-TSで処理を組み立てることもできます。

## Effect Schemaの活用

Effect-TSには独自のスキーマライブラリ`@effect/schema`があります。

```typescript
import { Schema } from "@effect/schema"

const User = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
  age: Schema.Number.pipe(Schema.between(0, 120))
})

// 型の抽出
type User = Schema.Schema.Type<typeof User>

// デコード（検証）
const decode = Schema.decodeUnknown(User)

const program = decode({ id: "1", name: "Alice", email: "alice@example.com", age: 30 })
// 型: Effect<User, ParseError, never>
```

Effect Schemaは、Effectとシームレスに統合されており、エラーハンドリングが一貫しています。

## 実践例: API呼び出しとエラーハンドリング

```typescript
import { Effect, Context } from "effect"

// エラー定義
class NetworkError {
  readonly _tag = "NetworkError"
  constructor(readonly status: number, readonly message: string) {}
}

class ValidationError {
  readonly _tag = "ValidationError"
  constructor(readonly message: string) {}
}

// HTTPクライアントサービス
class HttpClient extends Context.Tag("HttpClient")<
  HttpClient,
  {
    get: (url: string) => Effect.Effect<Response, NetworkError, never>
  }
>() {}

// ユーザーAPIクライアント
const fetchUser = (id: string): Effect.Effect<User, NetworkError | ValidationError, HttpClient> => {
  return Effect.gen(function* (_) {
    const http = yield* _(HttpClient)

    const response = yield* _(http.get(`https://api.example.com/users/${id}`))
    const data = yield* _(Effect.promise(() => response.json()))

    if (!isValidUser(data)) {
      return yield* _(Effect.fail(new ValidationError("Invalid user data")))
    }

    return data as User
  })
}

// 実装
const HttpClientLive = HttpClient.of({
  get: (url: string) =>
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(url)
        if (!response.ok) {
          throw new NetworkError(response.status, response.statusText)
        }
        return response
      },
      catch: (error) =>
        error instanceof NetworkError
          ? error
          : new NetworkError(500, String(error))
    })
})

// 使用例
const program = fetchUser("123").pipe(
  Effect.retry({ times: 3 }),
  Effect.timeout("10 seconds"),
  Effect.catchTag("NetworkError", (error) => {
    console.error(`Network error ${error.status}: ${error.message}`)
    return Effect.succeed(null)
  }),
  Effect.catchTag("ValidationError", (error) => {
    console.error(`Validation error: ${error.message}`)
    return Effect.succeed(null)
  }),
  Effect.provideService(HttpClient, HttpClientLive)
)

Effect.runPromise(program)
```

この例では、リトライ、タイムアウト、エラーハンドリングがすべて型安全に実装されています。

## まとめ

Effect-TSは、TypeScriptで型安全な関数型プログラミングを実現する強力なライブラリです。

### Effect-TSのメリット

- **型安全なエラーハンドリング**: どんなエラーが発生するか型で明確
- **依存性注入**: テスト可能で保守性の高いコード
- **並行処理の制御**: Promise.allやPromise.raceを型安全に
- **遅延評価**: 実行タイミングを完全にコントロール
- **合成可能**: 小さなEffectを組み合わせて大きなプログラムを作る

### 使うべき場面

- 複雑なエラーハンドリングが必要な場合
- テスト可能性を重視する場合
- 非同期処理が多い大規模アプリケーション
- 依存性注入でコードを整理したい場合

### 学習コスト

Effect-TSは関数型プログラミングの概念を多く含むため、学習コストは高めです。しかし、一度習得すれば、バグが少なく保守性の高いコードを書けるようになります。

小さなプロジェクトから始めて、徐々に適用範囲を広げていくのがおすすめです。

## 参考リンク

- [Effect-TS公式ドキュメント](https://effect.website/)
- [Effect GitHub](https://github.com/Effect-TS/effect)
- [Effect Schema](https://github.com/Effect-TS/schema)

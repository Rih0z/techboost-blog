---
title: "Effect-TS実践ガイド: 関数型プログラミングで堅牢なTypeScriptアプリを作る"
description: "Effect-TSを使った実践的なTypeScript開発。エフェクトシステム、型安全なエラーハンドリング、並行処理、依存性注入パターンを徹底解説。Next.js、Hono、tRPCとの連携も紹介。"
pubDate: "2025-02-05"
category: "typescript"
tags: ["Effect-TS", "TypeScript", "関数型プログラミング", "エラーハンドリング", "並行処理", "依存性注入"]
---

**Effect-TS**は、TypeScriptに本格的な関数型プログラミングとエフェクトシステムを導入するライブラリです。型安全なエラーハンドリング、並行処理、依存性注入を統一的に扱えます。

この記事では、Effect-TSの基本から実践的なパターンまでを解説します。

## Effect-TSとは

Effect-TSは、副作用（エフェクト）を型システムで管理するライブラリです。ScalaのZIOやHaskellのMonadにインスパイアされています。

### 特徴

- **型安全なエラーハンドリング**: エラー型が明示的
- **並行処理の簡潔な記述**: async/awaitより強力
- **依存性注入**: テスタブルな設計
- **リソース管理**: 自動的なクリーンアップ
- **構造化された並行処理**: Fiber、スケジューリング

### インストール

```bash
npm install effect
```

## Effectの基本

### Effect型の理解

```typescript
import { Effect } from "effect"

// Effect<A, E, R>
// A: 成功時の型
// E: エラーの型
// R: 必要な依存関係の型

// 成功する Effect
const success: Effect.Effect<number, never, never> =
  Effect.succeed(42)

// 失敗する Effect
const failure: Effect.Effect<never, string, never> =
  Effect.fail("Something went wrong")

// 同期処理をラップ
const syncEffect: Effect.Effect<number, never, never> =
  Effect.sync(() => {
    console.log("Computing...")
    return 1 + 1
  })

// 非同期処理をラップ
const asyncEffect: Effect.Effect<string, Error, never> =
  Effect.promise(() =>
    fetch("https://api.example.com/data")
      .then(res => res.text())
  )
```

### Effectの実行

```typescript
import { Effect, Exit } from "effect"

const program = Effect.succeed(42)

// 実行（Promiseとして）
const result = await Effect.runPromise(program)
console.log(result) // 42

// Exitとして実行（成功/失敗を明示的に処理）
const exit = await Effect.runPromiseExit(program)

if (Exit.isSuccess(exit)) {
  console.log("Success:", exit.value)
} else {
  console.log("Failure:", exit.cause)
}
```

## エラーハンドリング

### 型安全なエラー処理

```typescript
import { Effect, pipe } from "effect"

// カスタムエラー型
class ValidationError {
  readonly _tag = "ValidationError"
  constructor(readonly message: string) {}
}

class NetworkError {
  readonly _tag = "NetworkError"
  constructor(readonly status: number) {}
}

// ユーザー取得関数
const getUser = (id: string): Effect.Effect<
  User,
  ValidationError | NetworkError,
  never
> => {
  if (!id) {
    return Effect.fail(new ValidationError("ID is required"))
  }

  return Effect.tryPromise({
    try: () => fetch(`/api/users/${id}`).then(res => {
      if (!res.ok) throw new NetworkError(res.status)
      return res.json()
    }),
    catch: (error) => {
      if (error instanceof NetworkError) return error
      return new NetworkError(500)
    }
  })
}

// エラー処理
const program = pipe(
  getUser("123"),
  Effect.catchTag("ValidationError", (error) =>
    Effect.succeed({ id: "default", name: "Guest" })
  ),
  Effect.catchTag("NetworkError", (error) =>
    Effect.fail(`Network error: ${error.status}`)
  )
)
```

### エラーのリカバリー

```typescript
import { Effect, pipe } from "effect"

// リトライ戦略
import { Schedule } from "effect"

const fetchWithRetry = (url: string) => pipe(
  Effect.tryPromise(() => fetch(url).then(r => r.json())),
  Effect.retry(
    Schedule.exponential("100 millis", 2.0).pipe(
      Schedule.compose(Schedule.recurs(3))
    )
  )
)

// フォールバック
const getDataWithFallback = pipe(
  Effect.tryPromise(() => fetch("/api/data").then(r => r.json())),
  Effect.orElse(() =>
    Effect.succeed({ data: [], cached: true })
  )
)

// 複数のエラーをまとめて処理
const robustFetch = pipe(
  Effect.tryPromise(() => fetch("/api/primary").then(r => r.json())),
  Effect.catchAll((primaryError) =>
    Effect.tryPromise(() => fetch("/api/secondary").then(r => r.json()))
  ),
  Effect.catchAll((secondaryError) =>
    Effect.succeed({ fallback: true })
  )
)
```

## 並行処理

### 並列実行

```typescript
import { Effect, pipe } from "effect"

// 複数のAPIを並列で呼び出す
const fetchUserData = (userId: string) => {
  const user = Effect.tryPromise(() =>
    fetch(`/api/users/${userId}`).then(r => r.json())
  )

  const posts = Effect.tryPromise(() =>
    fetch(`/api/users/${userId}/posts`).then(r => r.json())
  )

  const followers = Effect.tryPromise(() =>
    fetch(`/api/users/${userId}/followers`).then(r => r.json())
  )

  // 並列実行して結果を結合
  return Effect.all([user, posts, followers], { concurrency: "unbounded" })
    .pipe(
      Effect.map(([user, posts, followers]) => ({
        user,
        posts,
        followers
      }))
    )
}

// オブジェクト形式
const fetchUserDataObject = (userId: string) =>
  Effect.all({
    user: Effect.tryPromise(() =>
      fetch(`/api/users/${userId}`).then(r => r.json())
    ),
    posts: Effect.tryPromise(() =>
      fetch(`/api/users/${userId}/posts`).then(r => r.json())
    ),
    followers: Effect.tryPromise(() =>
      fetch(`/api/users/${userId}/followers`).then(r => r.json())
    )
  }, { concurrency: "unbounded" })
```

### 並行数の制限

```typescript
import { Effect, pipe } from "effect"

// 並行数を2に制限
const processItems = (items: string[]) =>
  Effect.all(
    items.map(item =>
      Effect.tryPromise(() => processItem(item))
    ),
    { concurrency: 2 }
  )

// forEach で逐次処理
const sequentialProcess = (items: string[]) =>
  Effect.forEach(items, (item) =>
    Effect.tryPromise(() => processItem(item)),
    { concurrency: 1 }
  )

// バッチ処理
const batchProcess = (items: string[]) =>
  pipe(
    items,
    Effect.forEach((item) =>
      Effect.tryPromise(() => processItem(item)),
      { concurrency: 10, batching: true }
    )
  )
```

### ファイバー（Fiber）

```typescript
import { Effect, Fiber } from "effect"

// バックグラウンドタスクの実行
const backgroundTask = Effect.gen(function* () {
  const fiber = yield* Effect.fork(
    Effect.sleep("5 seconds").pipe(
      Effect.flatMap(() => Effect.log("Background task completed"))
    )
  )

  yield* Effect.log("Main task started")
  yield* Effect.sleep("1 second")
  yield* Effect.log("Main task completed")

  // バックグラウンドタスクの完了を待つ
  yield* Fiber.join(fiber)
})

// タイムアウト付き実行
const withTimeout = pipe(
  Effect.sleep("10 seconds"),
  Effect.timeout("5 seconds"),
  Effect.flatMap(() => Effect.log("Completed"))
)

// レース条件（最初に完了したものを返す）
const raceExample = Effect.race(
  Effect.sleep("3 seconds").pipe(Effect.as("slow")),
  Effect.sleep("1 second").pipe(Effect.as("fast"))
)
```

## 依存性注入

### Layerによる依存性管理

```typescript
import { Effect, Context, Layer } from "effect"

// サービスの定義
class Database extends Context.Tag("Database")<
  Database,
  {
    readonly query: <A>(sql: string) => Effect.Effect<A, Error>
  }
>() {}

class Logger extends Context.Tag("Logger")<
  Logger,
  {
    readonly log: (message: string) => Effect.Effect<void>
  }
>() {}

// サービスの実装
const DatabaseLive = Layer.succeed(
  Database,
  {
    query: <A>(sql: string) =>
      Effect.tryPromise({
        try: () => db.execute(sql) as Promise<A>,
        catch: () => new Error("Database error")
      })
  }
)

const LoggerLive = Layer.succeed(
  Logger,
  {
    log: (message: string) =>
      Effect.sync(() => console.log(message))
  }
)

// サービスを使用
const getUser = (id: string) =>
  Effect.gen(function* () {
    const db = yield* Database
    const logger = yield* Logger

    yield* logger.log(`Fetching user ${id}`)
    const user = yield* db.query<User>(`SELECT * FROM users WHERE id = '${id}'`)
    yield* logger.log(`User fetched: ${user.name}`)

    return user
  })

// レイヤーを提供して実行
const program = pipe(
  getUser("123"),
  Effect.provide(Layer.merge(DatabaseLive, LoggerLive))
)

await Effect.runPromise(program)
```

### テスト用のモック実装

```typescript
import { Effect, Context, Layer } from "effect"

// テスト用のモック実装
const DatabaseTest = Layer.succeed(
  Database,
  {
    query: <A>(sql: string) =>
      Effect.succeed({
        id: "test-id",
        name: "Test User"
      } as A)
  }
)

const LoggerTest = Layer.succeed(
  Logger,
  {
    log: (message: string) =>
      Effect.sync(() => {
        // テストではログを保存
        testLogs.push(message)
      })
  }
)

// テストで使用
const testProgram = pipe(
  getUser("123"),
  Effect.provide(Layer.merge(DatabaseTest, LoggerTest))
)

const result = await Effect.runPromise(testProgram)
expect(result.name).toBe("Test User")
```

## 実践例

### Next.js App Routerとの連携

```typescript
// app/api/users/[id]/route.ts
import { Effect, pipe } from "effect"
import { NextResponse } from "next/server"

class UserNotFoundError {
  readonly _tag = "UserNotFoundError"
  constructor(readonly id: string) {}
}

const getUser = (id: string) =>
  Effect.gen(function* () {
    const db = yield* Database

    const user = yield* db.query<User | null>(
      `SELECT * FROM users WHERE id = $1`,
      [id]
    )

    if (!user) {
      yield* Effect.fail(new UserNotFoundError(id))
    }

    return user
  })

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const program = pipe(
    getUser(params.id),
    Effect.catchTag("UserNotFoundError", (error) =>
      Effect.succeed(NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      ))
    ),
    Effect.map((user) => NextResponse.json(user)),
    Effect.catchAll(() =>
      Effect.succeed(NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      ))
    ),
    Effect.provide(AppLayer)
  )

  return await Effect.runPromise(program)
}
```

### Honoとの連携

```typescript
import { Hono } from "hono"
import { Effect, pipe } from "effect"

const app = new Hono()

app.get("/users/:id", async (c) => {
  const program = pipe(
    getUser(c.req.param("id")),
    Effect.catchTag("UserNotFoundError", () =>
      Effect.fail({ status: 404, message: "User not found" })
    ),
    Effect.provide(AppLayer)
  )

  const exit = await Effect.runPromiseExit(program)

  if (Exit.isSuccess(exit)) {
    return c.json(exit.value)
  } else {
    const error = exit.cause
    return c.json({ error: error.message }, error.status || 500)
  }
})

export default app
```

### バッチ処理

```typescript
import { Effect, Schedule, pipe } from "effect"

// データを10件ずつバッチ処理
const processBatch = (items: string[]) =>
  pipe(
    Effect.forEach(
      chunk(items, 10),
      (batch) => Effect.gen(function* () {
        const logger = yield* Logger

        yield* logger.log(`Processing batch of ${batch.length} items`)

        yield* Effect.all(
          batch.map(item => processItem(item)),
          { concurrency: 5 }
        )

        yield* logger.log("Batch completed")
      }),
      { concurrency: 1 }
    ),
    Effect.provide(AppLayer)
  )

// スケジュール実行
const scheduledTask = pipe(
  fetchAndProcessData(),
  Effect.repeat(
    Schedule.fixed("1 hour").pipe(
      Schedule.compose(Schedule.forever)
    )
  ),
  Effect.provide(AppLayer)
)

// 実行
Effect.runFork(scheduledTask)
```

### ストリーム処理

```typescript
import { Effect, Stream, pipe } from "effect"

// ファイルを行ごとに処理
const processFile = (filePath: string) =>
  pipe(
    Stream.fromAsyncIterable(
      fs.createReadStream(filePath),
      (error) => new Error(String(error))
    ),
    Stream.decodeText(),
    Stream.splitLines,
    Stream.mapEffect((line) =>
      Effect.gen(function* () {
        const logger = yield* Logger
        yield* logger.log(`Processing: ${line}`)
        return processLine(line)
      })
    ),
    Stream.runCollect,
    Effect.provide(AppLayer)
  )
```

## パフォーマンスとベストプラクティス

### Effectの作成は安価、実行は遅延

```typescript
// ✅ Good: Effect を返す
const getUser = (id: string): Effect.Effect<User, Error, Database> =>
  Effect.gen(function* () {
    const db = yield* Database
    return yield* db.query<User>(`SELECT * FROM users WHERE id = $1`, [id])
  })

// ❌ Bad: 即座に実行してしまう
const getUser = async (id: string): Promise<User> => {
  const db = await getDatabase()
  return await db.query(`SELECT * FROM users WHERE id = $1`, [id])
}
```

### Effect.genの活用

```typescript
// ✅ Good: Effect.gen で読みやすく
const program = Effect.gen(function* () {
  const user = yield* getUser("123")
  const posts = yield* getPosts(user.id)
  const comments = yield* getComments(posts[0].id)

  return { user, posts, comments }
})

// ❌ Bad: flatMap のネスト
const program = pipe(
  getUser("123"),
  Effect.flatMap((user) =>
    pipe(
      getPosts(user.id),
      Effect.flatMap((posts) =>
        pipe(
          getComments(posts[0].id),
          Effect.map((comments) => ({ user, posts, comments }))
        )
      )
    )
  )
)
```

### エラー型を明示的に

```typescript
// ✅ Good: エラー型を定義
class ValidationError {
  readonly _tag = "ValidationError"
  constructor(readonly field: string, readonly message: string) {}
}

const validateUser = (user: unknown): Effect.Effect<User, ValidationError> => {
  // ...
}

// ❌ Bad: unknown エラー
const validateUser = (user: unknown): Effect.Effect<User> => {
  // エラー型が不明
}
```

## まとめ

Effect-TSを使うことで、TypeScriptでも型安全で堅牢なアプリケーションを構築できます。

### 重要なポイント

1. **Effect型**: `Effect<A, E, R>` で成功、失敗、依存関係を表現
2. **エラーハンドリング**: 型安全なエラー処理とリカバリー
3. **並行処理**: Fiber、タイムアウト、レース条件の制御
4. **依存性注入**: Layer による DI とテスタビリティ
5. **遅延評価**: Effect は実行されるまで副作用を起こさない

Effect-TSは学習曲線がありますが、大規模なアプリケーションでその真価を発揮します。

### 参考リンク

- [Effect-TS 公式ドキュメント](https://effect.website/)
- [Effect-TS GitHub](https://github.com/Effect-TS/effect)
- [Effect-TS Discord](https://discord.gg/effect-ts)

---
title: "Effect-TS実践ガイド2026"
description: "Effect-TSの導入から実践活用まで徹底解説。型安全なエラーハンドリング、依存性注入、並行処理、リトライ戦略、ストリーム処理の実装パターンを具体的なコード例とともに紹介します。"
pubDate: '2026-03-05'
tags: ['TypeScript', 'Effect', '関数型プログラミング', 'エラーハンドリング', 'バックエンド']
heroImage: '../../assets/thumbnails/effect-ts-guide-2026.jpg'
---

**関連記事**: [Effect-TSで型安全なエラーハンドリング - 完全実装ガイド](/blog/effect-ts-guide)では基礎的な実装パターンを解説しています。本記事は2026年版として、v3のSchema、HTTP API構築、リソース管理など最新機能を網羅しています。

Effect-TSは、TypeScriptで型安全なエラーハンドリング、依存性注入、並行処理、リソース管理を実現するフレームワークです。従来のtry-catchベースのエラーハンドリングでは見落とされがちな「どの関数がどのエラーを発生させうるか」を型レベルで追跡でき、プロダクション環境での信頼性を大幅に向上させます。

2026年現在、Effect-TSはv3系が安定リリースされ、多くの企業でバックエンドサービスやCLIツールの基盤として採用されています。本記事では、Effect-TSの基本概念から実践的な活用パターンまで包括的に解説します。

## なぜEffect-TSが必要なのか

### 従来のエラーハンドリングの問題点

```typescript
// 問題1: エラーの型が不明
async function getUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) throw new Error("Failed to fetch");  // どんなエラー？
  return response.json();
}

// 問題2: エラーハンドリングの漏れ
async function processOrder(orderId: string) {
  const order = await getOrder(orderId);       // 例外の可能性
  const user = await getUser(order.userId);    // 例外の可能性
  const payment = await chargeUser(user, order.total); // 例外の可能性
  await sendConfirmation(user.email, order);   // 例外の可能性
  // 4つの関数すべてが異なるエラーを投げる可能性があるが、
  // 型からは一切わからない
}

// 問題3: リソースリークのリスク
async function readFile(path: string) {
  const handle = await fs.open(path, 'r');
  const content = await handle.readFile('utf-8');
  // ここで例外が発生するとhandleが閉じられない
  await handle.close();
  return content;
}
```

### Effect-TSによる解決

```typescript
import { Effect, pipe } from "effect"

// エラーの型が明示される
// Effect<User, NetworkError | NotFoundError, UserService>
//         ^成功値    ^エラー型                   ^必要な依存
function getUser(id: string): Effect.Effect<User, NetworkError | NotFoundError, UserService> {
  // ...
}

// コンパイラがエラーハンドリングの漏れを検出
// リソースは自動的にクリーンアップされる
```

## インストールとセットアップ

```bash
# Effect-TSのインストール
npm install effect

# スキーマバリデーション用
npm install @effect/schema

# プラットフォーム固有の機能（Node.js用）
npm install @effect/platform @effect/platform-node

# CLI構築用
npm install @effect/cli

# RPC（リモートプロシージャコール）用
npm install @effect/rpc @effect/rpc-http
```

### tsconfig.json の設定

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

## Effect型の基本

### Effect<A, E, R> の3つの型パラメータ

```typescript
import { Effect, Console } from "effect"

// Effect<A, E, R>
// A = 成功時の戻り値の型
// E = 失敗時のエラーの型
// R = 必要な依存（Requirements/Context）

// 成功のみ（エラーなし、依存なし）
const succeed: Effect.Effect<number> = Effect.succeed(42)

// 失敗の可能性あり
const parse = (input: string): Effect.Effect<number, Error> =>
  Effect.try({
    try: () => {
      const n = parseInt(input, 10)
      if (isNaN(n)) throw new Error(`Invalid number: ${input}`)
      return n
    },
    catch: (e) => e as Error,
  })

// 依存あり
interface Logger {
  readonly log: (message: string) => Effect.Effect<void>
}

const program: Effect.Effect<void, never, Logger> =
  Effect.flatMap(
    Effect.serviceFunction(/* ... */),
    (logger) => logger.log("Hello")
  )
```

### Effect の生成

```typescript
import { Effect } from "effect"

// 成功
const success = Effect.succeed(42)

// 失敗
const failure = Effect.fail(new Error("Something went wrong"))

// 非同期処理のラップ
const fetchUser = (id: string) =>
  Effect.tryPromise({
    try: () => fetch(`/api/users/${id}`).then((r) => r.json()),
    catch: (error) => new NetworkError(String(error)),
  })

// 同期処理のラップ（例外の可能性あり）
const parseJSON = (input: string) =>
  Effect.try({
    try: () => JSON.parse(input),
    catch: (error) => new ParseError(String(error)),
  })

// 条件分岐
const divide = (a: number, b: number) =>
  b === 0
    ? Effect.fail(new DivisionByZeroError())
    : Effect.succeed(a / b)
```

### Effect の合成（パイプラインビルド）

```typescript
import { Effect, pipe } from "effect"

// カスタムエラー型
class NetworkError {
  readonly _tag = "NetworkError"
  constructor(readonly message: string) {}
}

class ParseError {
  readonly _tag = "ParseError"
  constructor(readonly message: string) {}
}

class ValidationError {
  readonly _tag = "ValidationError"
  constructor(readonly field: string, readonly reason: string) {}
}

interface User {
  id: string
  name: string
  email: string
}

// パイプラインで合成
const fetchAndParseUser = (id: string) =>
  pipe(
    // Step 1: APIリクエスト
    Effect.tryPromise({
      try: () => fetch(`https://api.example.com/users/${id}`),
      catch: () => new NetworkError(`Failed to fetch user ${id}`),
    }),
    // Step 2: レスポンスをJSONにパース
    Effect.flatMap((response) =>
      Effect.tryPromise({
        try: () => response.json() as Promise<User>,
        catch: () => new ParseError("Failed to parse response"),
      })
    ),
    // Step 3: バリデーション
    Effect.flatMap((user) => {
      if (!user.email.includes("@")) {
        return Effect.fail(
          new ValidationError("email", "Invalid email format")
        )
      }
      return Effect.succeed(user)
    }),
    // Step 4: ログ出力（エラーに影響しない副作用）
    Effect.tap((user) =>
      Effect.sync(() => console.log(`Fetched user: ${user.name}`))
    )
  )

// 型は自動推論される:
// Effect<User, NetworkError | ParseError | ValidationError, never>
```

## エラーハンドリング

### パターンマッチングによるエラー処理

```typescript
import { Effect, Match } from "effect"

const handleErrors = (id: string) =>
  pipe(
    fetchAndParseUser(id),
    Effect.catchAll((error) =>
      Match.value(error).pipe(
        Match.tag("NetworkError", (e) =>
          Effect.succeed({ fallback: true, message: `Network error: ${e.message}` })
        ),
        Match.tag("ParseError", (e) =>
          Effect.succeed({ fallback: true, message: `Parse error: ${e.message}` })
        ),
        Match.tag("ValidationError", (e) =>
          Effect.succeed({ fallback: true, message: `${e.field}: ${e.reason}` })
        ),
        Match.exhaustive
      )
    )
  )

// 特定のエラーだけをキャッチ
const retryOnNetwork = (id: string) =>
  pipe(
    fetchAndParseUser(id),
    Effect.catchTag("NetworkError", (error) =>
      pipe(
        Effect.logWarning(`Retrying after network error: ${error.message}`),
        Effect.flatMap(() => fetchAndParseUser(id))
      )
    )
  )
```

### リトライ戦略

```typescript
import { Effect, Schedule, Duration } from "effect"

// 指数バックオフリトライ
const fetchWithRetry = (url: string) =>
  pipe(
    Effect.tryPromise({
      try: () => fetch(url),
      catch: () => new NetworkError(`Failed: ${url}`),
    }),
    Effect.retry(
      Schedule.exponential(Duration.millis(100)).pipe(
        // 最大5回リトライ
        Schedule.compose(Schedule.recurs(5)),
        // 最大待ち時間10秒
        Schedule.either(Schedule.spaced(Duration.seconds(10)))
      )
    )
  )

// 条件付きリトライ
const fetchWithConditionalRetry = (url: string) =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(url)
        if (response.status === 429) {
          throw new RateLimitError(
            parseInt(response.headers.get("retry-after") || "1")
          )
        }
        if (response.status >= 500) {
          throw new ServerError(response.status)
        }
        if (!response.ok) {
          throw new ClientError(response.status)
        }
        return response.json()
      },
      catch: (e) => e as NetworkError | RateLimitError | ServerError | ClientError,
    }),
    // サーバーエラーとレート制限のみリトライ
    Effect.retry({
      schedule: Schedule.exponential(Duration.seconds(1)),
      while: (error) =>
        error instanceof ServerError || error instanceof RateLimitError,
    })
  )
```

## 依存性注入（サービスパターン）

### サービスの定義と実装

```typescript
import { Effect, Context, Layer } from "effect"

// Step 1: サービスインターフェースの定義
class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  {
    readonly findById: (id: string) => Effect.Effect<User | null, DatabaseError>
    readonly findByEmail: (email: string) => Effect.Effect<User | null, DatabaseError>
    readonly create: (data: CreateUserInput) => Effect.Effect<User, DatabaseError | ValidationError>
    readonly update: (id: string, data: Partial<User>) => Effect.Effect<User, DatabaseError | NotFoundError>
    readonly delete: (id: string) => Effect.Effect<void, DatabaseError | NotFoundError>
  }
>() {}

class EmailService extends Context.Tag("EmailService")<
  EmailService,
  {
    readonly send: (to: string, subject: string, body: string) => Effect.Effect<void, EmailError>
  }
>() {}

class Logger extends Context.Tag("Logger")<
  Logger,
  {
    readonly info: (message: string) => Effect.Effect<void>
    readonly error: (message: string, error?: unknown) => Effect.Effect<void>
  }
>() {}

// Step 2: サービスを使うビジネスロジック
const registerUser = (input: CreateUserInput) =>
  Effect.gen(function* () {
    const repo = yield* UserRepository
    const email = yield* EmailService
    const logger = yield* Logger

    // 既存ユーザーチェック
    const existing = yield* repo.findByEmail(input.email)
    if (existing) {
      return yield* Effect.fail(
        new ValidationError("email", "Email already registered")
      )
    }

    // ユーザー作成
    const user = yield* repo.create(input)
    yield* logger.info(`User registered: ${user.id}`)

    // ウェルカムメール送信
    yield* email.send(
      user.email,
      "アカウント登録完了",
      `${user.name}さん、ご登録ありがとうございます。`
    )

    return user
  })

// 型が自動推論される:
// Effect<User, DatabaseError | ValidationError | EmailError, UserRepository | EmailService | Logger>
```

### Layer（依存の具体的な実装）

```typescript
import { Layer, Effect } from "effect"
import { PrismaClient } from "@prisma/client"

// 本番用UserRepository実装
const UserRepositoryLive = Layer.succeed(
  UserRepository,
  {
    findById: (id) =>
      Effect.tryPromise({
        try: () => prisma.user.findUnique({ where: { id } }),
        catch: (e) => new DatabaseError(String(e)),
      }),

    findByEmail: (email) =>
      Effect.tryPromise({
        try: () => prisma.user.findUnique({ where: { email } }),
        catch: (e) => new DatabaseError(String(e)),
      }),

    create: (data) =>
      Effect.tryPromise({
        try: () => prisma.user.create({ data }),
        catch: (e) => new DatabaseError(String(e)),
      }),

    update: (id, data) =>
      pipe(
        Effect.tryPromise({
          try: () => prisma.user.update({ where: { id }, data }),
          catch: (e) => new DatabaseError(String(e)),
        }),
        Effect.catchAll(() => Effect.fail(new NotFoundError(`User ${id}`)))
      ),

    delete: (id) =>
      pipe(
        Effect.tryPromise({
          try: () => prisma.user.delete({ where: { id } }).then(() => void 0),
          catch: (e) => new DatabaseError(String(e)),
        }),
        Effect.catchAll(() => Effect.fail(new NotFoundError(`User ${id}`)))
      ),
  }
)

// メール送信の本番実装
const EmailServiceLive = Layer.succeed(
  EmailService,
  {
    send: (to, subject, body) =>
      Effect.tryPromise({
        try: () =>
          sendgrid.send({
            to,
            from: "noreply@example.com",
            subject,
            html: body,
          }),
        catch: (e) => new EmailError(String(e)),
      }),
  }
)

// ロガーの実装
const LoggerLive = Layer.succeed(
  Logger,
  {
    info: (message) => Effect.sync(() => console.log(`[INFO] ${message}`)),
    error: (message, error) =>
      Effect.sync(() => console.error(`[ERROR] ${message}`, error)),
  }
)

// テスト用のモック実装
const UserRepositoryTest = Layer.succeed(
  UserRepository,
  {
    findById: (id) => Effect.succeed({ id, name: "Test User", email: "test@example.com" }),
    findByEmail: () => Effect.succeed(null),
    create: (data) => Effect.succeed({ id: "test-id", ...data }),
    update: (id, data) => Effect.succeed({ id, name: "Updated", email: "test@example.com", ...data }),
    delete: () => Effect.succeed(void 0),
  }
)

// Layerの合成
const AppLayerLive = Layer.mergeAll(
  UserRepositoryLive,
  EmailServiceLive,
  LoggerLive
)

const AppLayerTest = Layer.mergeAll(
  UserRepositoryTest,
  EmailServiceLive, // テストでもメール送信は本番と同じ（またはモック）
  LoggerLive
)
```

### プログラムの実行

```typescript
import { Effect } from "effect"

// 本番環境で実行
const main = pipe(
  registerUser({
    name: "田中太郎",
    email: "tanaka@example.com",
  }),
  Effect.provide(AppLayerLive)
)

// 実行
Effect.runPromise(main)
  .then((user) => console.log("Registered:", user))
  .catch((error) => console.error("Failed:", error))

// テスト環境で実行
const testMain = pipe(
  registerUser({
    name: "テストユーザー",
    email: "test@example.com",
  }),
  Effect.provide(AppLayerTest)
)
```

## 並行処理

### 並列実行

```typescript
import { Effect } from "effect"

// 複数のEffectを並列実行
const fetchAllUsers = (ids: string[]) =>
  Effect.all(
    ids.map((id) => fetchAndParseUser(id)),
    { concurrency: 5 }  // 最大5並列
  )

// レース（最初に完了したものを採用）
const fetchFromFastestMirror = (path: string) =>
  Effect.race(
    Effect.tryPromise({
      try: () => fetch(`https://mirror1.example.com${path}`),
      catch: () => new NetworkError("Mirror 1 failed"),
    }),
    Effect.tryPromise({
      try: () => fetch(`https://mirror2.example.com${path}`),
      catch: () => new NetworkError("Mirror 2 failed"),
    })
  )

// forEach with concurrency
const processItems = (items: Item[]) =>
  Effect.forEach(
    items,
    (item) =>
      pipe(
        processItem(item),
        Effect.tap(() => Effect.logInfo(`Processed: ${item.id}`))
      ),
    { concurrency: 10 }
  )
```

### Fiber（軽量スレッド）

```typescript
import { Effect, Fiber, Duration } from "effect"

const backgroundTask = Effect.gen(function* () {
  // バックグラウンドタスクをFiberとして起動
  const fiber = yield* Effect.fork(
    pipe(
      Effect.sleep(Duration.seconds(5)),
      Effect.flatMap(() => Effect.succeed("Background task done"))
    )
  )

  // メインタスクを並行実行
  yield* Effect.logInfo("Main task running...")
  yield* Effect.sleep(Duration.seconds(1))
  yield* Effect.logInfo("Main task continuing...")

  // Fiberの完了を待機
  const result = yield* Fiber.join(fiber)
  yield* Effect.logInfo(result)
})

// タイムアウト付き実行
const withTimeout = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  duration: Duration.Duration
) =>
  pipe(
    effect,
    Effect.timeout(duration),
    Effect.flatMap((option) =>
      option._tag === "None"
        ? Effect.fail(new TimeoutError())
        : Effect.succeed(option.value)
    )
  )
```

## リソース管理

### Scope（自動リソース解放）

```typescript
import { Effect, Scope } from "effect"

// データベース接続のリソース管理
const acquireConnection = Effect.acquireRelease(
  // 取得
  Effect.tryPromise({
    try: () => pool.connect(),
    catch: (e) => new DatabaseError(String(e)),
  }),
  // 解放（エラーが発生しても必ず実行）
  (connection) =>
    Effect.sync(() => {
      connection.release()
      console.log("Connection released")
    })
)

// トランザクション管理
const withTransaction = <A, E>(
  fn: (tx: Transaction) => Effect.Effect<A, E>
) =>
  Effect.scoped(
    Effect.gen(function* () {
      const connection = yield* acquireConnection
      const tx = yield* Effect.tryPromise({
        try: () => connection.beginTransaction(),
        catch: (e) => new DatabaseError(String(e)),
      })

      // Scopeのfinalizer追加（エラー時にロールバック）
      yield* Effect.addFinalizer((exit) =>
        exit._tag === "Failure"
          ? Effect.tryPromise({
              try: () => tx.rollback(),
              catch: () => new DatabaseError("Rollback failed"),
            })
          : Effect.tryPromise({
              try: () => tx.commit(),
              catch: () => new DatabaseError("Commit failed"),
            })
      )

      return yield* fn(tx)
    })
  )

// 使用例
const transferFunds = (from: string, to: string, amount: number) =>
  withTransaction((tx) =>
    Effect.gen(function* () {
      yield* debit(tx, from, amount)
      yield* credit(tx, to, amount)
      yield* recordTransaction(tx, { from, to, amount })
    })
  )
```

## Schema（バリデーション）

### @effect/schemaによるバリデーション

```typescript
import { Schema } from "@effect/schema"

// スキーマ定義
const UserSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.nonEmptyString()),
  name: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(100)
  ),
  email: Schema.String.pipe(
    Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  ),
  age: Schema.Number.pipe(
    Schema.int(),
    Schema.between(0, 150)
  ),
  role: Schema.Literal("admin", "member", "viewer"),
  tags: Schema.Array(Schema.String),
  createdAt: Schema.DateFromString,  // ISO文字列からDateに変換
})

// 型の抽出
type User = Schema.Schema.Type<typeof UserSchema>
// {
//   id: string
//   name: string
//   email: string
//   age: number
//   role: "admin" | "member" | "viewer"
//   tags: string[]
//   createdAt: Date
// }

// デコード（バリデーション＆変換）
const decodeUser = Schema.decodeUnknown(UserSchema)

const result = decodeUser({
  id: "user-1",
  name: "田中太郎",
  email: "tanaka@example.com",
  age: 30,
  role: "member",
  tags: ["developer"],
  createdAt: "2026-03-05T00:00:00Z",
})
// Effect<User, ParseError>

// APIリクエストのバリデーション
const CreateUserRequest = Schema.Struct({
  name: Schema.String.pipe(Schema.nonEmptyString()),
  email: Schema.String.pipe(
    Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
    Schema.annotations({ message: () => "有効なメールアドレスを入力してください" })
  ),
  password: Schema.String.pipe(
    Schema.minLength(8, {
      message: () => "パスワードは8文字以上で入力してください",
    }),
    Schema.pattern(/[A-Z]/, {
      message: () => "大文字を1文字以上含めてください",
    }),
    Schema.pattern(/[0-9]/, {
      message: () => "数字を1文字以上含めてください",
    })
  ),
})

// エンコード（シリアライズ）
const encodeUser = Schema.encodeUnknown(UserSchema)
```

### ブランド型（Branded Types）

```typescript
import { Schema } from "@effect/schema"

// ブランド型で型安全なIDを定義
const UserId = Schema.String.pipe(
  Schema.brand("UserId"),
  Schema.pattern(/^usr_[a-z0-9]{12}$/)
)
type UserId = Schema.Schema.Type<typeof UserId>

const OrderId = Schema.String.pipe(
  Schema.brand("OrderId"),
  Schema.pattern(/^ord_[a-z0-9]{12}$/)
)
type OrderId = Schema.Schema.Type<typeof OrderId>

// コンパイル時にUserIdとOrderIdを混同できない
function getUser(id: UserId): Effect.Effect<User, NotFoundError> {
  // ...
}

function getOrder(id: OrderId): Effect.Effect<Order, NotFoundError> {
  // ...
}

// getUser(orderId)  // コンパイルエラー！型が異なる
```

## HTTP APIの構築

### @effect/platformによるHTTPサーバー

```typescript
import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpServer } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Schema } from "@effect/schema"
import { Effect, Layer } from "effect"
import { createServer } from "node:http"

// APIエンドポイント定義
const UsersApi = HttpApiGroup.make("users").pipe(
  HttpApiGroup.add(
    HttpApiEndpoint.get("getUser", "/users/:id").pipe(
      HttpApiEndpoint.setSuccess(UserSchema),
      HttpApiEndpoint.addError(Schema.Struct({
        message: Schema.String,
      }), { status: 404 })
    )
  ),
  HttpApiGroup.add(
    HttpApiEndpoint.post("createUser", "/users").pipe(
      HttpApiEndpoint.setPayload(CreateUserRequest),
      HttpApiEndpoint.setSuccess(UserSchema, { status: 201 }),
      HttpApiEndpoint.addError(Schema.Struct({
        message: Schema.String,
        field: Schema.String,
      }), { status: 400 })
    )
  ),
  HttpApiGroup.add(
    HttpApiEndpoint.get("listUsers", "/users").pipe(
      HttpApiEndpoint.setSuccess(Schema.Array(UserSchema)),
      HttpApiEndpoint.setUrlParams(Schema.Struct({
        page: Schema.NumberFromString.pipe(Schema.optional),
        limit: Schema.NumberFromString.pipe(Schema.optional),
      }))
    )
  )
)

// APIルーターの構築
const api = HttpApi.make("MyApi").pipe(HttpApi.addGroup(UsersApi))

// ハンドラー実装
const UsersHandler = HttpApiGroup.handle(
  "getUser",
  ({ path: { id } }) =>
    Effect.gen(function* () {
      const repo = yield* UserRepository
      const user = yield* repo.findById(id)
      if (!user) {
        return yield* Effect.fail({ message: `User ${id} not found` })
      }
      return user
    })
).pipe(
  HttpApiGroup.handle(
    "createUser",
    ({ payload }) =>
      Effect.gen(function* () {
        const repo = yield* UserRepository
        return yield* repo.create(payload)
      })
  ),
  HttpApiGroup.handle(
    "listUsers",
    ({ urlParams: { page = 1, limit = 20 } }) =>
      Effect.gen(function* () {
        const repo = yield* UserRepository
        return yield* repo.findAll({ page, limit })
      })
  )
)

// サーバー起動
const ServerLive = NodeHttpServer.layer(createServer, { port: 3000 })

const main = pipe(
  HttpServer.serve(api, UsersHandler),
  Layer.provide(UserRepositoryLive),
  Layer.provide(ServerLive)
)

NodeRuntime.runMain(Layer.launch(main))
```

## テスト

### Effect-TSプログラムのテスト

```typescript
import { Effect, Layer } from "effect"
import { describe, it, expect } from "vitest"

// テスト用モックレイヤー
const mockUsers: User[] = [
  { id: "1", name: "田中", email: "tanaka@test.com", age: 30, role: "member", tags: [], createdAt: new Date() },
  { id: "2", name: "鈴木", email: "suzuki@test.com", age: 25, role: "admin", tags: [], createdAt: new Date() },
]

const TestUserRepository = Layer.succeed(
  UserRepository,
  {
    findById: (id) =>
      Effect.succeed(mockUsers.find((u) => u.id === id) ?? null),
    findByEmail: (email) =>
      Effect.succeed(mockUsers.find((u) => u.email === email) ?? null),
    create: (data) =>
      Effect.succeed({ id: "new-id", ...data, createdAt: new Date() } as User),
    update: (id, data) => {
      const user = mockUsers.find((u) => u.id === id)
      return user
        ? Effect.succeed({ ...user, ...data })
        : Effect.fail(new NotFoundError(`User ${id}`))
    },
    delete: (id) =>
      mockUsers.find((u) => u.id === id)
        ? Effect.succeed(void 0)
        : Effect.fail(new NotFoundError(`User ${id}`)),
  }
)

const TestEmailService = Layer.succeed(
  EmailService,
  {
    send: (_to, _subject, _body) => Effect.succeed(void 0),
  }
)

const TestLayer = Layer.mergeAll(
  TestUserRepository,
  TestEmailService,
  LoggerLive
)

describe("registerUser", () => {
  it("新規ユーザーを登録できる", async () => {
    const program = pipe(
      registerUser({
        name: "新規ユーザー",
        email: "new@test.com",
      }),
      Effect.provide(TestLayer)
    )

    const result = await Effect.runPromise(program)
    expect(result.name).toBe("新規ユーザー")
    expect(result.email).toBe("new@test.com")
  })

  it("既存メールアドレスでエラーになる", async () => {
    const program = pipe(
      registerUser({
        name: "重複ユーザー",
        email: "tanaka@test.com", // 既存
      }),
      Effect.provide(TestLayer)
    )

    const result = await Effect.runPromiseExit(program)
    expect(result._tag).toBe("Failure")
  })
})
```

## 実践パターン集

### 設定管理

```typescript
import { Config, Effect, Layer } from "effect"

// 設定の定義
const AppConfig = Config.all({
  port: Config.number("PORT").pipe(Config.withDefault(3000)),
  databaseUrl: Config.string("DATABASE_URL"),
  redisUrl: Config.string("REDIS_URL").pipe(Config.optional),
  logLevel: Config.literal("debug", "info", "warn", "error")("LOG_LEVEL").pipe(
    Config.withDefault("info" as const)
  ),
  maxConnections: Config.number("MAX_CONNECTIONS").pipe(
    Config.withDefault(10)
  ),
})

type AppConfig = Config.Config.Success<typeof AppConfig>

// 設定を使うプログラム
const startServer = Effect.gen(function* () {
  const config = yield* AppConfig
  yield* Effect.logInfo(`Starting server on port ${config.port}`)
  yield* Effect.logInfo(`Database: ${config.databaseUrl}`)
  yield* Effect.logInfo(`Log level: ${config.logLevel}`)
  // ...
})
```

### キャッシュ

```typescript
import { Effect, Cache, Duration } from "effect"

// TTL付きキャッシュ
const userCache = Cache.make({
  capacity: 1000,
  timeToLive: Duration.minutes(5),
  lookup: (id: string) =>
    pipe(
      fetchAndParseUser(id),
      Effect.tap(() => Effect.logDebug(`Cache miss for user: ${id}`))
    ),
})

const getUserCached = (id: string) =>
  Effect.gen(function* () {
    const cache = yield* userCache
    return yield* cache.get(id)
  })
```

### バッチ処理

```typescript
import { Effect, Chunk, Stream } from "effect"

// ストリームによるバッチ処理
const processLargeDataset = (filePath: string) =>
  pipe(
    // ファイルからストリーム読み込み
    Stream.fromReadableStream(
      () => fs.createReadStream(filePath),
      (e) => new FileError(String(e))
    ),
    // 行ごとに分割
    Stream.splitLines,
    // JSONパース
    Stream.mapEffect((line) =>
      Effect.try({
        try: () => JSON.parse(line),
        catch: (e) => new ParseError(String(e)),
      })
    ),
    // バッチ化（100件ずつ）
    Stream.grouped(100),
    // バッチごとにDB挿入
    Stream.mapEffect((batch) =>
      pipe(
        Effect.tryPromise({
          try: () => prisma.record.createMany({ data: Chunk.toArray(batch) }),
          catch: (e) => new DatabaseError(String(e)),
        }),
        Effect.tap(() =>
          Effect.logInfo(`Inserted ${Chunk.size(batch)} records`)
        )
      )
    ),
    // 並行度制御
    Stream.buffer({ capacity: 5 }),
    Stream.runDrain
  )
```

## まとめ

Effect-TSは、TypeScriptの型システムを最大限に活用して、堅牢で保守性の高いアプリケーションを構築するためのフレームワークです。本記事で紹介した内容をまとめます。

- **型安全なエラーハンドリング**: `Effect<A, E, R>`の3つの型パラメータにより、成功値・エラー・依存関係のすべてが型レベルで追跡される。try-catchの見落としがコンパイル時に検出可能
- **依存性注入**: `Context.Tag`と`Layer`パターンにより、テスト容易性が高く、モジュール境界が明確なアーキテクチャを実現
- **並行処理**: `Effect.all`の`concurrency`オプション、`Fiber`による軽量スレッド、`Stream`による大量データ処理など、充実した並行処理プリミティブ
- **リソース管理**: `Scope`と`acquireRelease`により、データベース接続やファイルハンドルの自動解放を保証
- **Schema**: `@effect/schema`による宣言的なバリデーションとシリアライゼーション。ブランド型で型レベルの安全性をさらに強化
- **リトライ戦略**: `Schedule`による柔軟なリトライパターン。指数バックオフ、条件付きリトライ、タイムアウトを型安全に記述

Effect-TSの学習曲線は決して緩やかではありませんが、一度習得すると、ランタイムエラーの大幅な削減、テスト容易性の向上、コードの可読性改善など、多くのメリットを享受できます。まずは小さなユーティリティ関数やCLIツールから導入し、徐々にバックエンドサービスのコアロジックに適用していくアプローチがおすすめです。

---
title: "Effect-TS入門 — TypeScriptで型安全な副作用管理を実現する"
description: "Effect-TSの基本概念、Effect型、Layer/Service、エラー処理パターン。実践的なHTTPリクエスト例を通じて型安全な副作用管理を学びます。"
pubDate: "2026-02-05"
tags: ["TypeScript", "Effect-TS", "関数型プログラミング"]
---

## Effect-TSとは

Effect-TSは、TypeScriptで副作用を型安全に扱うための強力なライブラリです。非同期処理、エラーハンドリング、依存性注入を統一的なAPIで管理できます。

従来の`Promise`や`async/await`では、エラーの型が失われがちでしたが、Effect-TSはすべてを型で表現します。

## Effect型の基本

Effect型は3つの型パラメータを持ちます:

```typescript
Effect<Success, Error, Requirements>
```

- **Success**: 成功時の値の型
- **Error**: 失敗時のエラーの型
- **Requirements**: 実行に必要な依存の型

### 基本的な使い方

```typescript
import { Effect } from "effect";

// 成功する処理
const success = Effect.succeed(42);

// 失敗する処理
class NetworkError {
  readonly _tag = "NetworkError";
  constructor(readonly message: string) {}
}

const failure = Effect.fail(new NetworkError("Connection timeout"));

// 同期的な計算
const computation = Effect.sync(() => {
  console.log("副作用を伴う処理");
  return Math.random();
});

// 非同期処理
const asyncOp = Effect.promise(() => fetch("https://api.example.com"));
```

## エラー処理パターン

Effect-TSの強力な点は、エラーを型で表現できることです。

```typescript
import { Effect, pipe } from "effect";

class ValidationError {
  readonly _tag = "ValidationError";
  constructor(readonly field: string) {}
}

class DatabaseError {
  readonly _tag = "DatabaseError";
  constructor(readonly reason: string) {}
}

// エラーを含む処理
const validateUser = (email: string): Effect.Effect<string, ValidationError> =>
  email.includes("@")
    ? Effect.succeed(email)
    : Effect.fail(new ValidationError("email"));

const saveToDb = (email: string): Effect.Effect<number, DatabaseError> =>
  Effect.promise(() =>
    fetch("/api/users", {
      method: "POST",
      body: JSON.stringify({ email })
    }).then(r => r.json())
  ).pipe(
    Effect.catchAll(() =>
      Effect.fail(new DatabaseError("Save failed"))
    )
  );

// エラーハンドリング
const program = pipe(
  validateUser("test@example.com"),
  Effect.flatMap(saveToDb),
  Effect.catchTag("ValidationError", (err) =>
    Effect.succeed(-1) // バリデーションエラーは-1で処理
  ),
  Effect.catchTag("DatabaseError", (err) => {
    console.error("DB Error:", err.reason);
    return Effect.succeed(-2);
  })
);
```

## Layer/Service: 依存性注入

Effectは依存性注入をファーストクラスでサポートします。

```typescript
import { Effect, Context, Layer } from "effect";

// サービスの定義
class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  {
    readonly findById: (id: number) => Effect.Effect<User, NotFoundError>;
    readonly save: (user: User) => Effect.Effect<void, DatabaseError>;
  }
>() {}

// 実装
const UserRepositoryLive = Layer.succeed(
  UserRepository,
  {
    findById: (id) =>
      Effect.promise(() => fetch(`/api/users/${id}`).then(r => r.json())),
    save: (user) =>
      Effect.promise(() =>
        fetch("/api/users", {
          method: "POST",
          body: JSON.stringify(user)
        })
      ).pipe(Effect.asVoid)
  }
);

// サービスを使用
const getUser = (id: number) =>
  Effect.gen(function* (_) {
    const repo = yield* _(UserRepository);
    return yield* _(repo.findById(id));
  });

// 実行
const runnable = getUser(123).pipe(
  Effect.provide(UserRepositoryLive)
);

Effect.runPromise(runnable).then(console.log);
```

## 実践例: HTTPリクエストクライアント

実際のアプリケーションで使えるHTTPクライアントを構築します。

```typescript
import { Effect, pipe } from "effect";

class HttpError {
  readonly _tag = "HttpError";
  constructor(
    readonly status: number,
    readonly message: string
  ) {}
}

class NetworkError {
  readonly _tag = "NetworkError";
  constructor(readonly cause: unknown) {}
}

const httpGet = <T>(url: string): Effect.Effect<T, HttpError | NetworkError> =>
  pipe(
    Effect.promise(() => fetch(url)),
    Effect.flatMap((response) =>
      response.ok
        ? Effect.promise(() => response.json())
        : Effect.fail(
            new HttpError(response.status, response.statusText)
          )
    ),
    Effect.catchAllDefect((defect) =>
      Effect.fail(new NetworkError(defect))
    )
  );

// 使用例
const fetchUser = httpGet<{ id: number; name: string }>(
  "https://api.example.com/user/1"
).pipe(
  Effect.retry({ times: 3 }), // 3回リトライ
  Effect.timeout("5 seconds"),
  Effect.catchTag("HttpError", (err) => {
    console.error(`HTTP ${err.status}: ${err.message}`);
    return Effect.succeed(null);
  })
);

Effect.runPromise(fetchUser).then((user) => {
  if (user) {
    console.log("User:", user.name);
  }
});
```

## Effect-TSのメリット

1. **型安全性**: すべてのエラーが型で表現される
2. **合成可能性**: 小さな処理を組み合わせて大きな処理を構築
3. **テスト容易性**: 依存性注入により、モックが簡単
4. **可読性**: パイプライン形式で処理の流れが明確

## まとめ

Effect-TSは学習コストがありますが、大規模アプリケーションでは威力を発揮します。型安全な副作用管理により、ランタイムエラーを大幅に削減できます。

まずは小さなユーティリティから始めて、徐々にプロジェクトに導入していくのがおすすめです。

公式ドキュメント: https://effect.website/

---
title: "Effect-TSで型安全なエラーハンドリング - 完全実装ガイド"
description: "Effect-TSを使った型安全な副作用管理とエラーハンドリングの完全ガイド。依存性注入、並行処理、リトライ戦略、テスト手法まで実践的なパターンを解説します。"
pubDate: "2025-02-05"
tags: ['プログラミング']
---

Effect-TSは、TypeScriptで**型安全に副作用を扱う**ための革新的なライブラリです。従来の`Promise`や`async/await`では実現できなかった、エラー型の完全な追跡と依存性注入を提供します。

本記事では、Effect-TSの基礎から実践的な実装パターン、本番環境での活用方法まで詳しく解説します。

## Effect-TSとは

Effect-TSは、関数型プログラミングの概念をTypeScriptに持ち込み、**副作用を一級市民として扱う**ライブラリです。Scalaの`ZIO`やHaskellの`IO`モナドに影響を受けています。

### 従来の問題点

```typescript
// 従来のPromise: エラー型が失われる
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch user'); // どんなエラーかわからない
  }
  return response.json();
}

// 呼び出し側
try {
  const user = await fetchUser('123');
  console.log(user.name);
} catch (error) {
  // errorは unknown、型安全性ゼロ
  console.error(error);
}
```

### Effect-TSでの解決

```typescript
import { Effect, pipe } from 'effect';

// エラー型が明示される
type FetchError =
  | { _tag: 'NetworkError'; cause: Error }
  | { _tag: 'NotFoundError'; id: string }
  | { _tag: 'ParseError'; body: string };

function fetchUser(id: string): Effect.Effect<User, FetchError, never> {
  return pipe(
    Effect.tryPromise({
      try: () => fetch(`/api/users/${id}`),
      catch: (error) => ({ _tag: 'NetworkError' as const, cause: error as Error }),
    }),
    Effect.flatMap(response =>
      response.ok
        ? Effect.tryPromise({
            try: () => response.json(),
            catch: (error) => ({ _tag: 'ParseError' as const, body: String(error) }),
          })
        : response.status === 404
          ? Effect.fail({ _tag: 'NotFoundError' as const, id })
          : Effect.fail({ _tag: 'NetworkError' as const, cause: new Error(`HTTP ${response.status}`) })
    ),
  );
}

// 呼び出し側: エラーが型で保証される
const program = pipe(
  fetchUser('123'),
  Effect.match({
    onFailure: (error) => {
      // errorの型は FetchError
      switch (error._tag) {
        case 'NetworkError':
          console.error('Network error:', error.cause);
          break;
        case 'NotFoundError':
          console.error('User not found:', error.id);
          break;
        case 'ParseError':
          console.error('Parse error:', error.body);
          break;
      }
    },
    onSuccess: (user) => {
      console.log('User:', user.name);
    },
  })
);

Effect.runPromise(program);
```

## セットアップ

### インストール

```bash
npm install effect
```

### 基本概念

Effect-TSの型シグネチャは3つのパラメータを持ちます。

```typescript
Effect.Effect<Success, Error, Requirements>

// Success: 成功時の値の型
// Error: 失敗時のエラーの型
// Requirements: 実行に必要な依存関係の型
```

```typescript
// 例
Effect.Effect<User, FetchError, Database>
// - 成功したら User を返す
// - 失敗したら FetchError を返す
// - 実行には Database サービスが必要
```

## 基本的な使い方

### Effectの作成

```typescript
import { Effect } from 'effect';

// 成功するEffect
const success = Effect.succeed(42);
// Effect<number, never, never>

// 失敗するEffect
const failure = Effect.fail('Something went wrong');
// Effect<never, string, never>

// 同期的な計算
const computation = Effect.sync(() => {
  console.log('Running computation');
  return Math.random();
});
// Effect<number, never, never>

// 非同期的な計算
const asyncComputation = Effect.promise(() => {
  return fetch('/api/data').then(res => res.json());
});
// Effect<unknown, never, never>
```

### Effectの合成

```typescript
import { pipe } from 'effect';

// map: 成功値を変換
const doubled = pipe(
  Effect.succeed(10),
  Effect.map(x => x * 2)
);
// Effect<number, never, never> (20)

// flatMap: Effectを連鎖
const program = pipe(
  Effect.succeed(5),
  Effect.flatMap(x => Effect.succeed(x * 2)),
  Effect.flatMap(x => Effect.succeed(x + 3))
);
// Effect<number, never, never> (13)

// mapError: エラーを変換
const withMappedError = pipe(
  Effect.fail('low level error'),
  Effect.mapError(err => ({ _tag: 'AppError' as const, message: err }))
);
```

### エラーハンドリング

```typescript
// エラーをキャッチして回復
const recovered = pipe(
  Effect.fail('error'),
  Effect.catchAll((error) => Effect.succeed('default value'))
);
// Effect<string, never, never>

// 特定のエラーのみキャッチ
type MyError =
  | { _tag: 'NotFound' }
  | { _tag: 'Unauthorized' }
  | { _tag: 'ServerError' };

const selective = pipe(
  fetchData(),
  Effect.catchTag('NotFound', () => Effect.succeed(null)),
  Effect.catchTag('Unauthorized', () => Effect.fail('Please login'))
);

// フォールバック
const withFallback = pipe(
  fetchFromPrimary(),
  Effect.orElse(() => fetchFromSecondary()),
  Effect.orElse(() => fetchFromCache())
);
```

## 実践パターン

### パターン1: APIクライアントの実装

```typescript
// api-client.ts
import { Effect, pipe } from 'effect';
import { Schema } from '@effect/schema';

// エラー型の定義
export class NetworkError {
  readonly _tag = 'NetworkError';
  constructor(readonly cause: Error) {}
}

export class ValidationError {
  readonly _tag = 'ValidationError';
  constructor(readonly errors: unknown) {}
}

export class HttpError {
  readonly _tag = 'HttpError';
  constructor(readonly status: number, readonly body: string) {}
}

// ユーザースキーマ
const UserSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  email: Schema.String,
});

type User = Schema.Schema.Type<typeof UserSchema>;

// API クライアント
export class ApiClient {
  constructor(private baseUrl: string) {}

  // GETリクエスト
  get<A>(
    path: string,
    schema: Schema.Schema<A>
  ): Effect.Effect<A, NetworkError | ValidationError | HttpError, never> {
    return pipe(
      Effect.tryPromise({
        try: () => fetch(`${this.baseUrl}${path}`),
        catch: (error) => new NetworkError(error as Error),
      }),
      Effect.flatMap((response) =>
        response.ok
          ? Effect.tryPromise({
              try: () => response.json(),
              catch: (error) => new NetworkError(error as Error),
            })
          : Effect.fail(new HttpError(response.status, response.statusText))
      ),
      Effect.flatMap((data) =>
        Schema.decodeUnknown(schema)(data).pipe(
          Effect.mapError((error) => new ValidationError(error))
        )
      )
    );
  }

  // POSTリクエスト
  post<A, B>(
    path: string,
    body: A,
    schema: Schema.Schema<B>
  ): Effect.Effect<B, NetworkError | ValidationError | HttpError, never> {
    return pipe(
      Effect.tryPromise({
        try: () =>
          fetch(`${this.baseUrl}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }),
        catch: (error) => new NetworkError(error as Error),
      }),
      Effect.flatMap((response) =>
        response.ok
          ? Effect.tryPromise({
              try: () => response.json(),
              catch: (error) => new NetworkError(error as Error),
            })
          : Effect.fail(new HttpError(response.status, response.statusText))
      ),
      Effect.flatMap((data) =>
        Schema.decodeUnknown(schema)(data).pipe(
          Effect.mapError((error) => new ValidationError(error))
        )
      )
    );
  }
}

// 使用例
const client = new ApiClient('https://api.example.com');

const fetchUser = (id: string) =>
  pipe(
    client.get(`/users/${id}`, UserSchema),
    Effect.retry({ times: 3 }),
    Effect.timeout('5 seconds'),
    Effect.catchTag('HttpError', (error) =>
      error.status === 404
        ? Effect.succeed(null)
        : Effect.fail(error)
    )
  );
```

### パターン2: 依存性注入

```typescript
// services.ts
import { Context, Effect, Layer } from 'effect';

// データベースサービスの定義
export class Database extends Context.Tag('Database')<
  Database,
  {
    query: <A>(sql: string, params: unknown[]) => Effect.Effect<A, Error, never>;
  }
>() {}

// ロガーサービスの定義
export class Logger extends Context.Tag('Logger')<
  Logger,
  {
    info: (message: string) => Effect.Effect<void, never, never>;
    error: (message: string) => Effect.Effect<void, never, never>;
  }
>() {}

// データベース実装
const DatabaseLive = Layer.succeed(
  Database,
  {
    query: <A>(sql: string, params: unknown[]) =>
      Effect.tryPromise({
        try: async () => {
          // 実際のデータベースクエリ
          const result = await pool.query(sql, params);
          return result.rows as A;
        },
        catch: (error) => error as Error,
      }),
  }
);

// ロガー実装
const LoggerLive = Layer.succeed(
  Logger,
  {
    info: (message) =>
      Effect.sync(() => {
        console.log(`[INFO] ${message}`);
      }),
    error: (message) =>
      Effect.sync(() => {
        console.error(`[ERROR] ${message}`);
      }),
  }
);

// ユーザーリポジトリ
export const UserRepository = {
  findById: (id: string) =>
    Effect.gen(function* (_) {
      const db = yield* _(Database);
      const logger = yield* _(Logger);

      yield* _(logger.info(`Fetching user: ${id}`));

      const users = yield* _(
        db.query<User>('SELECT * FROM users WHERE id = $1', [id])
      );

      if (users.length === 0) {
        yield* _(logger.error(`User not found: ${id}`));
        return yield* _(Effect.fail({ _tag: 'NotFound' as const }));
      }

      return users[0];
    }),

  create: (data: { name: string; email: string }) =>
    Effect.gen(function* (_) {
      const db = yield* _(Database);
      const logger = yield* _(Logger);

      yield* _(logger.info(`Creating user: ${data.email}`));

      const users = yield* _(
        db.query<User>(
          'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
          [data.name, data.email]
        )
      );

      return users[0];
    }),
};

// アプリケーションの構築
const AppLayer = Layer.mergeAll(DatabaseLive, LoggerLive);

const program = pipe(
  UserRepository.findById('123'),
  Effect.flatMap((user) =>
    Effect.gen(function* (_) {
      const logger = yield* _(Logger);
      yield* _(logger.info(`Found user: ${user.name}`));
      return user;
    })
  )
);

// 実行
const runnable = Effect.provide(program, AppLayer);
Effect.runPromise(runnable);
```

### パターン3: 並行処理とリトライ

```typescript
// parallel.ts
import { Effect, pipe } from 'effect';

// 複数のAPIを並行で呼び出し
const fetchUserProfile = (userId: string) =>
  Effect.all(
    {
      user: fetchUser(userId),
      posts: fetchUserPosts(userId),
      followers: fetchFollowers(userId),
    },
    { concurrency: 'unbounded' } // 並行実行
  );

// リトライ戦略
const fetchWithRetry = (url: string) =>
  pipe(
    Effect.tryPromise({
      try: () => fetch(url),
      catch: (error) => new NetworkError(error as Error),
    }),
    Effect.retry({
      times: 3,
      schedule: Schedule.exponential('100 millis'),
    }),
    Effect.timeout('10 seconds')
  );

// レースコンディション（最初に成功したものを使用）
const fetchFromMultipleSources = pipe(
  Effect.race(
    fetchFromPrimary(),
    Effect.race(fetchFromSecondary(), fetchFromTertiary())
  )
);

// バッチ処理
const processBatch = (items: string[]) =>
  Effect.all(
    items.map((item) => processItem(item)),
    { concurrency: 5 } // 最大5並行
  );
```

### パターン4: リソース管理

```typescript
// resource.ts
import { Effect, pipe } from 'effect';

// データベース接続のリソース管理
const withDatabase = <A, E>(
  f: (db: Database) => Effect.Effect<A, E, never>
): Effect.Effect<A, E, never> =>
  Effect.acquireUseRelease(
    // acquire
    Effect.sync(() => {
      console.log('Opening database connection');
      return createDatabaseConnection();
    }),
    // use
    (db) => f(db),
    // release
    (db) =>
      Effect.sync(() => {
        console.log('Closing database connection');
        db.close();
      })
  );

// 使用例
const queryUsers = withDatabase((db) =>
  Effect.tryPromise({
    try: () => db.query('SELECT * FROM users'),
    catch: (error) => error as Error,
  })
);

// ファイル処理
const processFile = (path: string) =>
  Effect.acquireUseRelease(
    Effect.tryPromise({
      try: () => fs.promises.open(path, 'r'),
      catch: (error) => error as Error,
    }),
    (file) =>
      Effect.tryPromise({
        try: () => file.readFile({ encoding: 'utf-8' }),
        catch: (error) => error as Error,
      }),
    (file) =>
      Effect.sync(() => {
        file.close();
      })
  );
```

## テスティング

### ユニットテスト

```typescript
// user.service.test.ts
import { Effect, Layer } from 'effect';
import { describe, it, expect } from 'vitest';

// モックデータベース
const MockDatabase = Layer.succeed(Database, {
  query: (sql, params) =>
    Effect.succeed([
      { id: '1', name: 'Alice', email: 'alice@example.com' },
    ]),
});

// モックロガー
const MockLogger = Layer.succeed(Logger, {
  info: (message) => Effect.void,
  error: (message) => Effect.void,
});

const MockAppLayer = Layer.mergeAll(MockDatabase, MockLogger);

describe('UserRepository', () => {
  it('should find user by id', async () => {
    const program = UserRepository.findById('1');
    const result = await Effect.runPromise(
      Effect.provide(program, MockAppLayer)
    );

    expect(result.name).toBe('Alice');
  });

  it('should fail when user not found', async () => {
    const EmptyDatabase = Layer.succeed(Database, {
      query: () => Effect.succeed([]),
    });

    const program = UserRepository.findById('999');

    await expect(
      Effect.runPromise(
        Effect.provide(program, Layer.mergeAll(EmptyDatabase, MockLogger))
      )
    ).rejects.toEqual({ _tag: 'NotFound' });
  });
});
```

### 統合テスト

```typescript
// integration.test.ts
import { Effect } from 'effect';
import { describe, it, beforeAll, afterAll } from 'vitest';

describe('Integration Tests', () => {
  let container: TestContainer;

  beforeAll(async () => {
    container = await new GenericContainer('postgres:16')
      .withExposedPorts(5432)
      .start();

    // マイグレーション実行
    await runMigrations();
  });

  afterAll(async () => {
    await container.stop();
  });

  it('should create and fetch user', async () => {
    const program = Effect.gen(function* (_) {
      const newUser = yield* _(
        UserRepository.create({
          name: 'Bob',
          email: 'bob@example.com',
        })
      );

      const fetchedUser = yield* _(UserRepository.findById(newUser.id));

      return fetchedUser;
    });

    const result = await Effect.runPromise(
      Effect.provide(program, RealAppLayer)
    );

    expect(result.name).toBe('Bob');
  });
});
```

## パフォーマンス最適化

### メモ化

```typescript
import { Effect, Cache } from 'effect';

// 計算結果のキャッシュ
const cache = Cache.make({
  capacity: 100,
  timeToLive: '1 hour',
  lookup: (key: string) => expensiveComputation(key),
});

const getCachedResult = (key: string) =>
  Effect.flatMap(cache, (c) => Cache.get(c, key));
```

### バッチ処理の最適化

```typescript
// リクエストのバッチング
const batchedFetch = RequestResolver.makeBatched(
  (requests: Array<{ id: string }>) =>
    Effect.tryPromise({
      try: async () => {
        const ids = requests.map((r) => r.id);
        const users = await fetchUsersBatch(ids);
        return users;
      },
      catch: (error) => error as Error,
    })
);
```

## まとめ

Effect-TSは、TypeScriptで型安全な副作用管理を実現する強力なライブラリです。

### 主な利点

- **完全な型安全性**: エラー型を含めて完全に型で保証
- **合成可能性**: 小さなEffectを組み合わせて複雑なロジックを構築
- **依存性注入**: 型安全なDIが標準装備
- **リソース管理**: 自動的なクリーンアップを保証
- **並行処理**: 並列実行、リトライ、タイムアウトを簡単に扱える

### 適用領域

- **バックエンドAPI**: エラーハンドリングが重要なシステム
- **マイクロサービス**: 複雑な依存関係の管理
- **データパイプライン**: リソースの適切な管理
- **CLI ツール**: 型安全な副作用の制御

### 学習リソース

- [Effect公式サイト](https://effect.website/)
- [Effect GitHub](https://github.com/Effect-TS/effect)
- [Effect Documentation](https://effect.website/docs/introduction)
- [Effect Examples](https://github.com/Effect-TS/examples)

Effect-TSを活用することで、エラーハンドリングが型レベルで保証され、バグの少ない堅牢なアプリケーションを構築できます。特にエンタープライズアプリケーションや、信頼性が重要なシステムに最適です。

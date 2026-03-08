---
title: "Effect-TS実践ガイド: 型安全なエラーハンドリングと依存性注入"
description: "Effect-TSで実現する実践的なエラーハンドリングパターン。カスタムエラー型の設計、リトライ戦略、タイムアウト処理、依存性注入によるテスト容易性の向上まで、実戦で使えるテクニックを徹底解説。Effect-TS・TypeScript・エラーハンドリングに関する実践情報。"
pubDate: "2025-08-15"
updatedDate: "2025-08-15"
tags: ["Effect-TS", "TypeScript", "エラーハンドリング", "依存性注入", "関数型プログラミング"]
heroImage: '../../assets/thumbnails/effect-ts-error-handling.jpg'
---
Effect-TSは型安全な副作用管理ライブラリとして知られていますが、その真価は**実践的なエラーハンドリング**と**依存性注入**にあります。この記事では、実際のプロダクション環境で使える高度なパターンを解説します。

## なぜEffect-TSのエラーハンドリングが優れているのか

従来のPromiseやResult型では実現できない、Effect-TSならではのエラーハンドリングの特徴を見ていきましょう。

### Promiseの問題点

```typescript
// 従来のPromise: エラー型が追跡できない
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch'); // 何が失敗したのか不明
  }
  return response.json();
}

// 呼び出し側: エラーが unknown
try {
  const user = await fetchUser('123');
} catch (error) {
  // error は unknown 型
  // ここで型安全なエラー処理は不可能
  console.error(error);
}
```

### Effect-TSでの解決

```typescript
import { Effect, pipe, Schema } from 'effect';

// エラー型を明示的に定義
type FetchError =
  | { readonly _tag: 'NetworkError'; readonly cause: Error }
  | { readonly _tag: 'NotFoundError'; readonly id: string }
  | { readonly _tag: 'ParseError'; readonly body: string }
  | { readonly _tag: 'UnauthorizedError' }
  | { readonly _tag: 'RateLimitError'; readonly retryAfter: number };

// Effectで型安全なエラーハンドリング
function fetchUser(id: string): Effect.Effect<User, FetchError, never> {
  return pipe(
    Effect.tryPromise({
      try: () => fetch(`/api/users/${id}`),
      catch: (error): FetchError => ({
        _tag: 'NetworkError',
        cause: error as Error,
      }),
    }),
    Effect.flatMap((response) => {
      if (response.status === 401) {
        return Effect.fail<FetchError>({ _tag: 'UnauthorizedError' });
      }
      if (response.status === 404) {
        return Effect.fail<FetchError>({ _tag: 'NotFoundError', id });
      }
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        return Effect.fail<FetchError>({ _tag: 'RateLimitError', retryAfter });
      }
      if (!response.ok) {
        return Effect.fail<FetchError>({
          _tag: 'NetworkError',
          cause: new Error(`HTTP ${response.status}`),
        });
      }

      return Effect.tryPromise({
        try: () => response.json(),
        catch: (error): FetchError => ({
          _tag: 'ParseError',
          body: String(error),
        }),
      });
    })
  );
}

// 型安全なエラー処理
const program = pipe(
  fetchUser('123'),
  Effect.catchTag('NotFoundError', (error) => {
    console.log(`User ${error.id} not found, creating default user`);
    return Effect.succeed(createDefaultUser());
  }),
  Effect.catchTag('UnauthorizedError', () => {
    console.log('Redirecting to login...');
    return Effect.fail(new Error('Please login'));
  }),
  Effect.catchTag('RateLimitError', (error) => {
    console.log(`Rate limited, retry after ${error.retryAfter}s`);
    return Effect.fail(new Error('Too many requests'));
  })
);
```

## 実践パターン1: カスタムエラー型の設計

効果的なエラー型を設計するには、エラーの粒度と復旧可能性を考慮する必要があります。

### エラー型の階層化

```typescript
// ベースエラー型
type BaseError = {
  readonly timestamp: Date;
  readonly context?: Record<string, unknown>;
};

// ドメイン別エラー
type UserError = BaseError &
  (
    | { readonly _tag: 'UserNotFound'; readonly userId: string }
    | { readonly _tag: 'UserAlreadyExists'; readonly email: string }
    | { readonly _tag: 'InvalidUserData'; readonly errors: string[] }
  );

type PaymentError = BaseError &
  (
    | { readonly _tag: 'InsufficientFunds'; readonly required: number; readonly available: number }
    | { readonly _tag: 'PaymentGatewayError'; readonly code: string; readonly message: string }
    | { readonly _tag: 'InvalidCard'; readonly reason: string }
  );

type DatabaseError = BaseError &
  (
    | { readonly _tag: 'ConnectionError'; readonly host: string }
    | { readonly _tag: 'QueryError'; readonly query: string; readonly cause: Error }
    | { readonly _tag: 'TransactionError'; readonly cause: Error }
  );

// アプリケーション全体のエラー型
type AppError = UserError | PaymentError | DatabaseError;

// エラー生成ヘルパー
const makeError = <T extends AppError>(error: Omit<T, 'timestamp'>): T => ({
  ...error,
  timestamp: new Date(),
} as T);
```

### エラー型を使った実装例

```typescript
import { Effect, pipe } from 'effect';

// ユーザー取得関数
function getUser(userId: string): Effect.Effect<User, UserError | DatabaseError, DbService> {
  return pipe(
    DbService,
    Effect.flatMap((db) =>
      Effect.tryPromise({
        try: () => db.query('SELECT * FROM users WHERE id = ?', [userId]),
        catch: (error): DatabaseError =>
          makeError({
            _tag: 'QueryError',
            query: `SELECT * FROM users WHERE id = ${userId}`,
            cause: error as Error,
          }),
      })
    ),
    Effect.flatMap((rows) => {
      if (rows.length === 0) {
        return Effect.fail<UserError>(
          makeError({
            _tag: 'UserNotFound',
            userId,
            context: { source: 'getUser' },
          })
        );
      }
      return Effect.succeed(rows[0] as User);
    })
  );
}

// 支払い処理
function processPayment(
  userId: string,
  amount: number
): Effect.Effect<PaymentResult, PaymentError | UserError | DatabaseError, DbService | PaymentGateway> {
  return pipe(
    getUser(userId),
    Effect.flatMap((user) =>
      pipe(
        PaymentGateway,
        Effect.flatMap((gateway) =>
          Effect.tryPromise({
            try: () => gateway.charge(user.cardToken, amount),
            catch: (error): PaymentError => {
              const err = error as { code?: string; message?: string };
              return makeError({
                _tag: 'PaymentGatewayError',
                code: err.code || 'UNKNOWN',
                message: err.message || 'Unknown error',
                context: { userId, amount },
              });
            },
          })
        ),
        Effect.catchTag('PaymentGatewayError', (error) => {
          // 残高不足の場合は特定のエラーに変換
          if (error.code === 'INSUFFICIENT_FUNDS') {
            return Effect.fail<PaymentError>(
              makeError({
                _tag: 'InsufficientFunds',
                required: amount,
                available: 0, // 実際にはAPIから取得
              })
            );
          }
          return Effect.fail(error);
        })
      )
    )
  );
}
```

## 実践パターン2: 高度なリトライ戦略

Effect-TSには強力なリトライ機構が組み込まれています。

### 基本的なリトライ

```typescript
import { Effect, Schedule, pipe } from 'effect';

// 3回まで、1秒ずつ増加させながらリトライ
const retrySchedule = pipe(
  Schedule.exponential('1 second'),
  Schedule.compose(Schedule.recurs(3))
);

const program = pipe(
  fetchUser('123'),
  Effect.retry(retrySchedule)
);
```

### 条件付きリトライ

```typescript
// 特定のエラーのみリトライ
const retryableErrors = ['NetworkError', 'RateLimitError'] as const;

const conditionalRetry = <R, A>(
  effect: Effect.Effect<A, FetchError, R>
): Effect.Effect<A, FetchError, R> =>
  pipe(
    effect,
    Effect.retry({
      schedule: pipe(
        Schedule.exponential('1 second'),
        Schedule.compose(Schedule.recurs(5))
      ),
      while: (error) => retryableErrors.includes(error._tag),
    })
  );

// レート制限エラーの場合はRetry-Afterを尊重
const smartRetry = <R, A>(
  effect: Effect.Effect<A, FetchError, R>
): Effect.Effect<A, FetchError, R> =>
  pipe(
    effect,
    Effect.catchTag('RateLimitError', (error) =>
      pipe(
        Effect.sleep(`${error.retryAfter} seconds`),
        Effect.flatMap(() => effect)
      )
    ),
    Effect.retry({
      schedule: Schedule.exponential('1 second'),
      while: (error) => error._tag === 'NetworkError',
    })
  );
```

### カスタムリトライロジック

```typescript
import { Effect, Schedule, pipe, Duration } from 'effect';

// 指数バックオフ + ジッター
const exponentialBackoffWithJitter = pipe(
  Schedule.exponential('100 millis'),
  Schedule.jittered,
  Schedule.compose(Schedule.recurs(10)),
  Schedule.whileOutput((duration) => Duration.lessThanOrEqualTo(duration, '30 seconds'))
);

// サーキットブレーカーパターン
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: Date | null;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

const circuitBreaker = <R, A, E>(
  effect: Effect.Effect<A, E, R>,
  maxFailures: number = 5,
  resetTimeout: Duration.Duration = Duration.seconds(60)
) => {
  let state: CircuitBreakerState = {
    failures: 0,
    lastFailureTime: null,
    state: 'CLOSED',
  };

  return Effect.gen(function* (_) {
    // サーキットが開いている場合
    if (state.state === 'OPEN') {
      const now = new Date();
      const timeSinceLastFailure =
        state.lastFailureTime ? now.getTime() - state.lastFailureTime.getTime() : 0;

      if (timeSinceLastFailure < Duration.toMillis(resetTimeout)) {
        return yield* _(
          Effect.fail(new Error('Circuit breaker is OPEN') as E)
        );
      }

      // タイムアウト経過後はHALF_OPENに
      state.state = 'HALF_OPEN';
    }

    return yield* _(
      effect,
      Effect.tap(() =>
        Effect.sync(() => {
          // 成功時はリセット
          state.failures = 0;
          state.state = 'CLOSED';
        })
      ),
      Effect.catchAll((error) =>
        Effect.gen(function* (_) {
          state.failures += 1;
          state.lastFailureTime = new Date();

          if (state.failures >= maxFailures) {
            state.state = 'OPEN';
          }

          return yield* _(Effect.fail(error));
        })
      )
    );
  });
};

// 使用例
const resilientFetch = pipe(
  fetchUser('123'),
  (effect) => circuitBreaker(effect, 5, Duration.seconds(60)),
  Effect.retry(exponentialBackoffWithJitter)
);
```

## 実践パターン3: タイムアウトとキャンセル

```typescript
import { Effect, pipe } from 'effect';

// 基本的なタイムアウト
const withTimeout = pipe(
  fetchUser('123'),
  Effect.timeout('5 seconds'),
  Effect.catchTag('TimeoutException', () => {
    console.log('Request timed out');
    return Effect.succeed(null);
  })
);

// タイムアウトとフォールバック
const withFallback = pipe(
  fetchUser('123'),
  Effect.timeout('3 seconds'),
  Effect.catchAll(() => {
    console.log('Primary source failed, trying cache...');
    return getCachedUser('123');
  })
);

// 複数の処理を並列実行し、最初に成功したものを返す
const raceMultipleSources = Effect.raceAll([
  fetchUser('123'),
  getCachedUser('123'),
  getDefaultUser('123'),
]);

// タイムアウト付きで複数ソースを試行
const resilientUserFetch = pipe(
  Effect.raceAll([
    pipe(fetchUser('123'), Effect.timeout('2 seconds')),
    pipe(getCachedUser('123'), Effect.timeout('1 second')),
  ]),
  Effect.catchAll(() => getDefaultUser('123'))
);
```

## 実践パターン4: 依存性注入によるテスト容易性

Effect-TSの最大の強みの一つが、型安全な依存性注入です。

### サービス定義

```typescript
import { Context, Effect, Layer } from 'effect';

// データベースサービス
interface DbService {
  readonly query: (sql: string, params: unknown[]) => Promise<unknown[]>;
  readonly transaction: <A>(fn: () => Promise<A>) => Promise<A>;
}

const DbService = Context.GenericTag<DbService>('DbService');

// HTTP クライアントサービス
interface HttpClient {
  readonly get: <T>(url: string) => Effect.Effect<T, FetchError, never>;
  readonly post: <T, B>(url: string, body: B) => Effect.Effect<T, FetchError, never>;
}

const HttpClient = Context.GenericTag<HttpClient>('HttpClient');

// ロガーサービス
interface Logger {
  readonly info: (message: string, context?: Record<string, unknown>) => Effect.Effect<void, never, never>;
  readonly error: (message: string, error: Error) => Effect.Effect<void, never, never>;
}

const Logger = Context.GenericTag<Logger>('Logger');

// キャッシュサービス
interface CacheService {
  readonly get: <T>(key: string) => Effect.Effect<T | null, never, never>;
  readonly set: <T>(key: string, value: T, ttl: number) => Effect.Effect<void, never, never>;
}

const CacheService = Context.GenericTag<CacheService>('CacheService');
```

### サービス実装

```typescript
import { Layer, Effect } from 'effect';
import { Pool } from 'pg';

// 本番用DB実装
const DbServiceLive = Layer.succeed(
  DbService,
  DbService.of({
    query: (sql, params) => {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      return pool.query(sql, params).then((result) => result.rows);
    },
    transaction: async (fn) => {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn();
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  })
);

// テスト用モックDB
const DbServiceMock = Layer.succeed(
  DbService,
  DbService.of({
    query: async (sql, params) => {
      // モックデータを返す
      if (sql.includes('SELECT * FROM users')) {
        return [{ id: '123', name: 'Test User', email: 'test@example.com' }];
      }
      return [];
    },
    transaction: async (fn) => fn(),
  })
);

// HTTP クライアント実装
const HttpClientLive = Layer.succeed(
  HttpClient,
  HttpClient.of({
    get: (url) =>
      Effect.tryPromise({
        try: () => fetch(url).then((res) => res.json()),
        catch: (error): FetchError => ({
          _tag: 'NetworkError',
          cause: error as Error,
        }),
      }),
    post: (url, body) =>
      Effect.tryPromise({
        try: () =>
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }).then((res) => res.json()),
        catch: (error): FetchError => ({
          _tag: 'NetworkError',
          cause: error as Error,
        }),
      }),
  })
);

// ロガー実装
const LoggerLive = Layer.succeed(
  Logger,
  Logger.of({
    info: (message, context) =>
      Effect.sync(() => {
        console.log(JSON.stringify({ level: 'info', message, ...context, timestamp: new Date() }));
      }),
    error: (message, error) =>
      Effect.sync(() => {
        console.error(JSON.stringify({ level: 'error', message, error: error.message, stack: error.stack, timestamp: new Date() }));
      }),
  })
);

// Redisキャッシュ実装
const CacheServiceLive = Layer.effect(
  CacheService,
  Effect.gen(function* (_) {
    const redis = yield* _(
      Effect.tryPromise({
        try: async () => {
          const { createClient } = await import('redis');
          const client = createClient({ url: process.env.REDIS_URL });
          await client.connect();
          return client;
        },
        catch: (error) => new Error(`Failed to connect to Redis: ${error}`),
      })
    );

    return CacheService.of({
      get: (key) =>
        Effect.tryPromise({
          try: async () => {
            const value = await redis.get(key);
            return value ? JSON.parse(value) : null;
          },
          catch: () => null,
        }),
      set: (key, value, ttl) =>
        Effect.tryPromise({
          try: () => redis.setEx(key, ttl, JSON.stringify(value)),
          catch: (error) => new Error(`Failed to set cache: ${error}`),
        }).pipe(Effect.catchAll(() => Effect.void)),
    });
  })
);
```

### 依存性を使用したビジネスロジック

```typescript
import { Effect, pipe } from 'effect';

// ユーザー取得（キャッシュ付き）
function getUserWithCache(
  userId: string
): Effect.Effect<User, UserError | DatabaseError, DbService | CacheService | Logger> {
  return Effect.gen(function* (_) {
    const cache = yield* _(CacheService);
    const db = yield* _(DbService);
    const logger = yield* _(Logger);

    // キャッシュを確認
    yield* _(logger.info('Checking cache', { userId }));
    const cached = yield* _(cache.get<User>(`user:${userId}`));

    if (cached) {
      yield* _(logger.info('Cache hit', { userId }));
      return cached;
    }

    // DBから取得
    yield* _(logger.info('Cache miss, fetching from DB', { userId }));
    const rows = yield* _(
      Effect.tryPromise({
        try: () => db.query('SELECT * FROM users WHERE id = ?', [userId]),
        catch: (error): DatabaseError =>
          makeError({
            _tag: 'QueryError',
            query: `SELECT * FROM users WHERE id = ${userId}`,
            cause: error as Error,
          }),
      })
    );

    if (rows.length === 0) {
      return yield* _(
        Effect.fail<UserError>(
          makeError({
            _tag: 'UserNotFound',
            userId,
          })
        )
      );
    }

    const user = rows[0] as User;

    // キャッシュに保存
    yield* _(cache.set(`user:${userId}`, user, 300)); // 5分
    yield* _(logger.info('User cached', { userId }));

    return user;
  });
}

// 複数サービスを組み合わせた複雑な処理
function createOrderWithNotification(
  order: CreateOrderInput
): Effect.Effect<Order, AppError, DbService | HttpClient | Logger | CacheService> {
  return Effect.gen(function* (_) {
    const db = yield* _(DbService);
    const http = yield* _(HttpClient);
    const logger = yield* _(Logger);

    // トランザクション内で注文を作成
    yield* _(logger.info('Creating order', { order }));

    const newOrder = yield* _(
      Effect.tryPromise({
        try: () =>
          db.transaction(async () => {
            const result = await db.query(
              'INSERT INTO orders (user_id, total, items) VALUES (?, ?, ?) RETURNING *',
              [order.userId, order.total, JSON.stringify(order.items)]
            );
            return result[0] as Order;
          }),
        catch: (error): DatabaseError =>
          makeError({
            _tag: 'TransactionError',
            cause: error as Error,
          }),
      })
    );

    // 通知を送信（失敗しても注文は成功扱い）
    yield* _(
      pipe(
        http.post<void, { orderId: string; userId: string }>(
          process.env.NOTIFICATION_SERVICE_URL!,
          { orderId: newOrder.id, userId: order.userId }
        ),
        Effect.timeout('5 seconds'),
        Effect.catchAll((error) =>
          logger.error('Failed to send notification', error as Error)
        )
      )
    );

    yield* _(logger.info('Order created', { orderId: newOrder.id }));

    return newOrder;
  });
}
```

### テストコード

```typescript
import { Effect, Layer } from 'effect';
import { describe, it, expect } from 'vitest';

describe('getUserWithCache', () => {
  it('should return cached user if available', async () => {
    // モックサービスを定義
    const mockCache = Layer.succeed(
      CacheService,
      CacheService.of({
        get: (key) =>
          Effect.succeed(
            key === 'user:123'
              ? { id: '123', name: 'Cached User', email: 'cached@example.com' }
              : null
          ),
        set: () => Effect.void,
      })
    );

    const mockLogger = Layer.succeed(
      Logger,
      Logger.of({
        info: () => Effect.void,
        error: () => Effect.void,
      })
    );

    const mockDb = Layer.succeed(
      DbService,
      DbService.of({
        query: async () => {
          throw new Error('DB should not be called when cache hits');
        },
        transaction: async (fn) => fn(),
      })
    );

    // 依存性を注入してテスト
    const program = pipe(
      getUserWithCache('123'),
      Effect.provide(Layer.merge(Layer.merge(mockCache, mockLogger), mockDb))
    );

    const result = await Effect.runPromise(program);

    expect(result).toEqual({
      id: '123',
      name: 'Cached User',
      email: 'cached@example.com',
    });
  });

  it('should fetch from DB when cache misses', async () => {
    const mockCache = Layer.succeed(
      CacheService,
      CacheService.of({
        get: () => Effect.succeed(null),
        set: () => Effect.void,
      })
    );

    const mockLogger = Layer.succeed(
      Logger,
      Logger.of({
        info: () => Effect.void,
        error: () => Effect.void,
      })
    );

    const mockDb = Layer.succeed(
      DbService,
      DbService.of({
        query: async () => [
          { id: '123', name: 'DB User', email: 'db@example.com' },
        ],
        transaction: async (fn) => fn(),
      })
    );

    const program = pipe(
      getUserWithCache('123'),
      Effect.provide(Layer.merge(Layer.merge(mockCache, mockLogger), mockDb))
    );

    const result = await Effect.runPromise(program);

    expect(result).toEqual({
      id: '123',
      name: 'DB User',
      email: 'db@example.com',
    });
  });
});
```

## 実践パターン5: エラーログとモニタリング

```typescript
import { Effect, pipe } from 'effect';

// エラーをログに記録するヘルパー
const withErrorLogging = <R, A, E extends AppError>(
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R | Logger> =>
  pipe(
    effect,
    Effect.tapError((error) =>
      Effect.gen(function* (_) {
        const logger = yield* _(Logger);
        yield* _(
          logger.error('Operation failed', {
            name: 'OperationError',
            message: JSON.stringify(error),
          } as Error)
        );
      })
    )
  );

// メトリクスを送信
const withMetrics = <R, A, E>(
  effect: Effect.Effect<A, E, R>,
  operationName: string
): Effect.Effect<A, E, R> =>
  pipe(
    Effect.sync(() => Date.now()),
    Effect.flatMap((startTime) =>
      pipe(
        effect,
        Effect.tap(() =>
          Effect.sync(() => {
            const duration = Date.now() - startTime;
            // メトリクス送信（例: DataDog, CloudWatch）
            console.log(`[METRIC] ${operationName} completed in ${duration}ms`);
          })
        ),
        Effect.tapError(() =>
          Effect.sync(() => {
            console.log(`[METRIC] ${operationName} failed`);
          })
        )
      )
    )
  );

// 使用例
const monitoredOperation = pipe(
  processPayment('user-123', 1000),
  withErrorLogging,
  (effect) => withMetrics(effect, 'processPayment')
);
```

## まとめ

Effect-TSによる実践的なエラーハンドリングと依存性注入のパターンを紹介しました。

### 主要なポイント

1. **型安全なエラー処理**: エラー型を明示的に定義し、コンパイル時に全てのエラーケースを処理
2. **高度なリトライ戦略**: 指数バックオフ、サーキットブレーカー、条件付きリトライ
3. **タイムアウトとキャンセル**: 複数ソースからのフォールバック、並列実行
4. **依存性注入**: テスト容易性の高い設計、モックとの切り替えが簡単
5. **観測可能性**: ログとメトリクスによるモニタリング

Effect-TSは学習コストが高いと言われますが、一度習得すれば**型安全で保守性の高いコード**を書くことができます。特に、マイクロサービスやAPI統合が多いバックエンド開発で真価を発揮します。

### 参考リンク

- [Effect公式ドキュメント](https://effect.website/)
- [Effect GitHub](https://github.com/Effect-TS/effect)
- [Error Handling in Effect](https://effect.website/docs/error-management/expected-errors)

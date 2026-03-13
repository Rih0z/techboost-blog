---
title: "Effect Pattern完全ガイド — TypeScriptで関数型プログラミングとエラーハンドリングの新境地"
description: "TypeScriptで型安全な非同期処理とエラーハンドリングを実現するEffect Patternの完全ガイド。Effect-TS、Result型、Railway Oriented Programming、実践パターンまで徹底解説します。基礎から応用まで幅広くカバーしています。"
pubDate: "2025-02-06"
tags: ["Effect", "TypeScript", "Functional Programming", "Error Handling", "Type Safety"]
heroImage: '../../assets/thumbnails/effect-pattern-guide.jpg'
---
Effect Patternは、TypeScriptで関数型プログラミングのパワーを活用し、型安全な非同期処理とエラーハンドリングを実現するデザインパターンです。Effect-TSライブラリを中心に、Result型、Railway Oriented Programming、依存性注入など、堅牢なアプリケーション開発のための実践的手法を解説します。

## Effect Patternとは

Effect Patternは、副作用（Effect）を明示的に扱い、型システムで追跡することで、予測可能で保守性の高いコードを書くためのアプローチです。エラーハンドリング、依存性、非同期処理を型レベルで管理します。

### 主な概念

- **Effect型** - 成功値、エラー、依存性を型パラメータで表現
- **Railway Oriented Programming** - エラーを別のレールとして扱う
- **Result型** - 成功（Ok）と失敗（Err）を型安全に表現
- **依存性の明示化** - 必要な依存性を型で宣言
- **合成可能性** - 小さなEffectを組み合わせて大きな処理を構築

### なぜEffect Patternなのか

```typescript
// 従来のアプローチ
// ❌ エラーが型に現れない
// ❌ 例外が突然飛んでくる
// ❌ 依存性が隠れている
async function getUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) throw new Error('User not found');
  return response.json();
}

// Effect Pattern
// ✅ エラー型が明示的
// ✅ 依存性が型に現れる
// ✅ 例外なし、全て型安全
function getUser(id: string): Effect<User, UserNotFoundError, HttpClient> {
  return Effect.gen(function* (_) {
    const client = yield* _(HttpClient);
    const response = yield* _(client.get(`/api/users/${id}`));
    return response;
  });
}
```

## Effect-TSのインストール

```bash
npm install effect
```

### 基本的なインポート

```typescript
import { Effect, pipe } from 'effect';
```

## Effect型の基本

### Effect型の構造

```typescript
Effect<Success, Error, Requirements>
```

- **Success** - 成功時の値の型
- **Error** - 発生しうるエラーの型
- **Requirements** - 必要な依存性の型

### 基本的なEffect作成

```typescript
import { Effect } from 'effect';

// 成功するEffect
const success = Effect.succeed(42);
// Effect<number, never, never>

// 失敗するEffect
const failure = Effect.fail('Something went wrong');
// Effect<never, string, never>

// 同期的な処理
const sync = Effect.sync(() => {
  console.log('Running...');
  return 'Done';
});

// 非同期的な処理
const async = Effect.async<string>((resume) => {
  setTimeout(() => {
    resume(Effect.succeed('Async result'));
  }, 1000);
});

// Promiseからの変換
const fromPromise = Effect.promise(() => fetch('/api/data').then((r) => r.json()));
```

### Effectの実行

```typescript
import { Effect } from 'effect';

const program = Effect.succeed('Hello Effect!');

// 実行
Effect.runPromise(program).then(console.log);
// => "Hello Effect!"

// 同期実行（エラーは例外として投げられる）
const result = Effect.runSync(Effect.succeed(42));
// => 42

// Exitとして取得（成功/失敗を含む）
Effect.runPromiseExit(program).then((exit) => {
  if (exit._tag === 'Success') {
    console.log('Success:', exit.value);
  } else {
    console.log('Failure:', exit.cause);
  }
});
```

## エラーハンドリング

### 基本的なエラー処理

```typescript
import { Effect, pipe } from 'effect';

const riskyOperation = Effect.fail('Something went wrong');

// catchAllでエラー処理
const handled = pipe(
  riskyOperation,
  Effect.catchAll((error) => Effect.succeed(`Handled: ${error}`))
);

// catchTagで特定エラーのみ処理
class NetworkError {
  readonly _tag = 'NetworkError';
  constructor(readonly message: string) {}
}

class ValidationError {
  readonly _tag = 'ValidationError';
  constructor(readonly field: string) {}
}

const program = pipe(
  Effect.fail(new NetworkError('Connection failed')),
  Effect.catchTag('NetworkError', (error) => Effect.succeed(`Retry: ${error.message}`))
);
```

### エラーのマッピング

```typescript
const mapError = pipe(
  Effect.fail('Raw error'),
  Effect.mapError((error) => ({
    code: 'ERROR_CODE',
    message: error,
    timestamp: Date.now(),
  }))
);
```

### フォールバック

```typescript
const withFallback = pipe(
  Effect.fail('Primary failed'),
  Effect.orElse(() => Effect.succeed('Fallback value'))
);

// または複数のフォールバック
const withMultipleFallbacks = pipe(
  Effect.fail('All failed'),
  Effect.orElse(() => Effect.fail('Fallback 1 failed')),
  Effect.orElse(() => Effect.succeed('Fallback 2 succeeded'))
);
```

## Railway Oriented Programming

### Result型の実装

```typescript
type Result<T, E> = { _tag: 'Ok'; value: T } | { _tag: 'Err'; error: E };

const Ok = <T>(value: T): Result<T, never> => ({ _tag: 'Ok', value });
const Err = <E>(error: E): Result<never, E> => ({ _tag: 'Err', error });

// ヘルパー関数
const map = <T, U, E>(fn: (value: T) => U) => {
  return (result: Result<T, E>): Result<U, E> => {
    if (result._tag === 'Ok') {
      return Ok(fn(result.value));
    }
    return result;
  };
};

const flatMap = <T, U, E>(fn: (value: T) => Result<U, E>) => {
  return (result: Result<T, E>): Result<U, E> => {
    if (result._tag === 'Ok') {
      return fn(result.value);
    }
    return result;
  };
};
```

### パイプライン構築

```typescript
import { pipe } from 'effect';

type User = { id: string; name: string; email: string };
type ValidationError = { field: string; message: string };

const validateEmail = (email: string): Result<string, ValidationError> => {
  if (!email.includes('@')) {
    return Err({ field: 'email', message: 'Invalid email' });
  }
  return Ok(email);
};

const validateName = (name: string): Result<string, ValidationError> => {
  if (name.length < 2) {
    return Err({ field: 'name', message: 'Name too short' });
  }
  return Ok(name);
};

const createUser = (data: { name: string; email: string }): Result<User, ValidationError> => {
  // Railway: エラーが起きたら以降の処理はスキップされる
  const nameResult = validateName(data.name);
  if (nameResult._tag === 'Err') return nameResult;

  const emailResult = validateEmail(data.email);
  if (emailResult._tag === 'Err') return emailResult;

  return Ok({
    id: crypto.randomUUID(),
    name: nameResult.value,
    email: emailResult.value,
  });
};
```

## Effect.genによる便利な記法

```typescript
import { Effect } from 'effect';

// Generator構文でEffect合成
const program = Effect.gen(function* (_) {
  // Effectを実行して値を取得
  const x = yield* _(Effect.succeed(10));
  const y = yield* _(Effect.succeed(20));

  // 通常のJavaScriptのように書ける
  const sum = x + y;

  // エラーも自動で伝播
  const result = yield* _(riskyOperation(sum));

  return result;
});
```

### 実践例: ユーザー取得処理

```typescript
class UserNotFoundError {
  readonly _tag = 'UserNotFoundError';
  constructor(readonly userId: string) {}
}

class NetworkError {
  readonly _tag = 'NetworkError';
  constructor(readonly message: string) {}
}

const fetchUser = (id: string) =>
  Effect.gen(function* (_) {
    // APIリクエスト
    const response = yield* _(
      Effect.tryPromise({
        try: () => fetch(`/api/users/${id}`),
        catch: (error) => new NetworkError(String(error)),
      })
    );

    // ステータスチェック
    if (!response.ok) {
      yield* _(Effect.fail(new UserNotFoundError(id)));
    }

    // JSON解析
    const user = yield* _(
      Effect.tryPromise({
        try: () => response.json(),
        catch: (error) => new NetworkError('Invalid JSON'),
      })
    );

    return user;
  });

// エラーハンドリング付きで実行
const program = pipe(
  fetchUser('123'),
  Effect.catchTag('UserNotFoundError', (error) =>
    Effect.succeed({ id: error.userId, name: 'Guest', email: '' })
  ),
  Effect.catchTag('NetworkError', (error) => Effect.fail(`Network issue: ${error.message}`))
);
```

## 依存性注入

### Contextの定義

```typescript
import { Context, Effect } from 'effect';

// サービスの定義
class Database extends Context.Tag('Database')<
  Database,
  {
    readonly query: (sql: string) => Effect.Effect<any[], never, never>;
  }
>() {}

class Logger extends Context.Tag('Logger')<
  Logger,
  {
    readonly log: (message: string) => Effect.Effect<void, never, never>;
  }
>() {}
```

### 依存性を使うEffect

```typescript
const getUsers = Effect.gen(function* (_) {
  const db = yield* _(Database);
  const logger = yield* _(Logger);

  yield* _(logger.log('Fetching users...'));
  const users = yield* _(db.query('SELECT * FROM users'));
  yield* _(logger.log(`Found ${users.length} users`));

  return users;
});
// Effect<any[], never, Database | Logger>
```

### 依存性の提供

```typescript
import { Layer } from 'effect';

// 実装の提供
const DatabaseLive = Layer.succeed(
  Database,
  Database.of({
    query: (sql) =>
      Effect.sync(() => {
        console.log('Executing:', sql);
        return [{ id: 1, name: 'Alice' }];
      }),
  })
);

const LoggerLive = Layer.succeed(
  Logger,
  Logger.of({
    log: (message) =>
      Effect.sync(() => {
        console.log('[LOG]', message);
      }),
  })
);

// レイヤーを結合
const AppLayer = Layer.mergeAll(DatabaseLive, LoggerLive);

// 依存性を解決して実行
const program = pipe(getUsers, Effect.provide(AppLayer));

Effect.runPromise(program).then(console.log);
```

## パターン: リトライと再試行

```typescript
import { Effect, Schedule } from 'effect';

const unstableApi = Effect.gen(function* (_) {
  const random = Math.random();
  if (random < 0.7) {
    yield* _(Effect.fail('API failed'));
  }
  return 'Success!';
});

// 再試行戦略
const withRetry = pipe(
  unstableApi,
  Effect.retry(
    Schedule.exponential('100 millis').pipe(
      Schedule.compose(Schedule.recurs(5)) // 最大5回
    )
  )
);

// タイムアウト付き
const withTimeout = pipe(unstableApi, Effect.timeout('5 seconds'));

// 両方組み合わせ
const robust = pipe(
  unstableApi,
  Effect.retry(Schedule.exponential('100 millis').pipe(Schedule.recurs(3))),
  Effect.timeout('10 seconds')
);
```

## パターン: 並列処理

```typescript
import { Effect } from 'effect';

const task1 = Effect.succeed(1).pipe(Effect.delay('100 millis'));
const task2 = Effect.succeed(2).pipe(Effect.delay('200 millis'));
const task3 = Effect.succeed(3).pipe(Effect.delay('150 millis'));

// 全て並列実行
const allTasks = Effect.all([task1, task2, task3]);
// Effect<[number, number, number], never, never>

// オブジェクトとして実行
const taskObject = Effect.all({
  first: task1,
  second: task2,
  third: task3,
});
// Effect<{ first: number, second: number, third: number }, never, never>

// 並列実行、最初に完了したものを取得
const raceResult = Effect.race(task1, task2);

// 最初に成功したものを取得（エラーは無視）
const firstSuccess = Effect.raceAll([task1, task2, task3]);
```

## パターン: キャッシング

```typescript
import { Effect, Cache, Duration } from 'effect';

// キャッシュ作成
const userCache = Cache.make({
  capacity: 100,
  timeToLive: Duration.minutes(5),
  lookup: (userId: string) => fetchUser(userId),
});

// キャッシュ利用
const getUserCached = (id: string) =>
  Effect.gen(function* (_) {
    const cache = yield* _(userCache);
    const user = yield* _(cache.get(id));
    return user;
  });
```

## パターン: バッチ処理

```typescript
import { Effect } from 'effect';

type UserId = string;
type User = { id: UserId; name: string };

const fetchUsersBatch = (ids: UserId[]): Effect.Effect<User[], never, never> =>
  Effect.sync(() => {
    console.log(`Batch fetching ${ids.length} users`);
    return ids.map((id) => ({ id, name: `User ${id}` }));
  });

// N+1問題を回避するバッチローダー
const getUserWithBatching = (id: UserId) =>
  Effect.gen(function* (_) {
    // 実際にはDataLoaderのようなバッチング機構を使用
    const users = yield* _(fetchUsersBatch([id]));
    return users[0];
  });
```

## パターン: トランザクション

```typescript
import { Effect, STM } from 'effect';

// トランザクショナルメモリ
const transferMoney = (from: string, to: string, amount: number) =>
  Effect.gen(function* (_) {
    const db = yield* _(Database);

    // トランザクション開始
    yield* _(db.beginTransaction());

    try {
      // 送金元から引き出し
      yield* _(db.query(`UPDATE accounts SET balance = balance - ${amount} WHERE id = '${from}'`));

      // 送金先へ入金
      yield* _(db.query(`UPDATE accounts SET balance = balance + ${amount} WHERE id = '${to}'`));

      // コミット
      yield* _(db.commit());

      return { success: true };
    } catch (error) {
      // ロールバック
      yield* _(db.rollback());
      yield* _(Effect.fail(error));
    }
  });
```

## 実践例: ユーザー登録フロー

```typescript
import { Effect, pipe } from 'effect';

// エラー定義
class EmailAlreadyExistsError {
  readonly _tag = 'EmailAlreadyExistsError';
  constructor(readonly email: string) {}
}

class ValidationError {
  readonly _tag = 'ValidationError';
  constructor(readonly errors: Record<string, string>) {}
}

class DatabaseError {
  readonly _tag = 'DatabaseError';
  constructor(readonly message: string) {}
}

// 型定義
type CreateUserInput = {
  name: string;
  email: string;
  password: string;
};

type User = {
  id: string;
  name: string;
  email: string;
};

// バリデーション
const validateInput = (
  input: CreateUserInput
): Effect.Effect<CreateUserInput, ValidationError, never> =>
  Effect.gen(function* (_) {
    const errors: Record<string, string> = {};

    if (!input.name || input.name.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (!input.email.includes('@')) {
      errors.email = 'Invalid email format';
    }

    if (input.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (Object.keys(errors).length > 0) {
      yield* _(Effect.fail(new ValidationError(errors)));
    }

    return input;
  });

// 重複チェック
const checkEmailUnique = (
  email: string
): Effect.Effect<void, EmailAlreadyExistsError, Database> =>
  Effect.gen(function* (_) {
    const db = yield* _(Database);
    const existing = yield* _(db.query(`SELECT * FROM users WHERE email = '${email}'`));

    if (existing.length > 0) {
      yield* _(Effect.fail(new EmailAlreadyExistsError(email)));
    }
  });

// パスワードハッシュ化
const hashPassword = (password: string): Effect.Effect<string, never, never> =>
  Effect.sync(() => {
    // 実際にはbcryptなどを使用
    return `hashed_${password}`;
  });

// ユーザー作成
const createUserInDb = (
  input: CreateUserInput & { hashedPassword: string }
): Effect.Effect<User, DatabaseError, Database> =>
  Effect.gen(function* (_) {
    const db = yield* _(Database);

    const result = yield* _(
      Effect.tryPromise({
        try: () =>
          db.query(
            `INSERT INTO users (name, email, password) VALUES ('${input.name}', '${input.email}', '${input.hashedPassword}')`
          ),
        catch: (error) => new DatabaseError(String(error)),
      })
    );

    return {
      id: crypto.randomUUID(),
      name: input.name,
      email: input.email,
    };
  });

// メイン処理
const registerUser = (
  input: CreateUserInput
): Effect.Effect<User, ValidationError | EmailAlreadyExistsError | DatabaseError, Database> =>
  Effect.gen(function* (_) {
    // バリデーション
    const validInput = yield* _(validateInput(input));

    // 重複チェック
    yield* _(checkEmailUnique(validInput.email));

    // パスワードハッシュ化
    const hashedPassword = yield* _(hashPassword(validInput.password));

    // ユーザー作成
    const user = yield* _(createUserInDb({ ...validInput, hashedPassword }));

    return user;
  });

// エラーハンドリング付き実行
const safeRegisterUser = (input: CreateUserInput) =>
  pipe(
    registerUser(input),
    Effect.catchTags({
      ValidationError: (error) =>
        Effect.succeed({
          success: false,
          errors: error.errors,
        }),
      EmailAlreadyExistsError: (error) =>
        Effect.succeed({
          success: false,
          errors: { email: `Email ${error.email} already exists` },
        }),
      DatabaseError: (error) =>
        Effect.succeed({
          success: false,
          errors: { _: 'Database error occurred' },
        }),
    }),
    Effect.map((result) =>
      'id' in result ? { success: true, user: result } : result
    )
  );
```

## テスト

```typescript
import { Effect, Layer } from 'effect';

// モックデータベース
const MockDatabase = Layer.succeed(
  Database,
  Database.of({
    query: (sql) =>
      Effect.sync(() => {
        if (sql.includes('SELECT')) {
          return []; // ユーザーなし
        }
        return [{ id: 1 }]; // INSERT成功
      }),
  })
);

// テスト
const testRegisterUser = Effect.gen(function* (_) {
  const result = yield* _(
    registerUser({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'password123',
    })
  );

  console.assert(result.name === 'Alice');
  console.assert(result.email === 'alice@example.com');
});

// モックを提供して実行
Effect.runPromise(pipe(testRegisterUser, Effect.provide(MockDatabase)));
```

## まとめ

Effect Patternは、TypeScriptで型安全かつ堅牢なアプリケーションを構築するための強力なアプローチです。

**主な利点:**
- エラーが型に現れ、見落としがない
- 依存性が明示的で、テストが容易
- 合成可能で保守性が高い
- Railway Oriented Programmingでエラー処理が明確
- 非同期処理が同期的に書ける

**こんなプロジェクトに最適:**
- 堅牢性が求められるバックエンドAPI
- 複雑なビジネスロジック
- 依存性管理が重要なアプリケーション
- 型安全性を最大限活用したい

Effect-TSは学習曲線がありますが、習得すればTypeScriptで最高レベルの型安全性と保守性を実現できます。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)

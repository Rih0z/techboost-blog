---
title: 'Node.js非同期処理完全ガイド — Promise・async/await・イベントループを完全理解'
description: 'JavaScriptの非同期処理を基礎から徹底解説。コールバック地獄からPromise・async/await・並列処理パターンまで。イベントループの仕組み・エラーハンドリング・並行制御・ストリーム処理・Worker Threadsまで実践コード付き。'
pubDate: '2026-02-20'
heroImage: '../../assets/blog-placeholder-4.jpg'
tags: ['Node.js', 'JavaScript', 'TypeScript', '非同期処理', 'Promise']
---

Node.jsアプリケーションの性能と信頼性は、非同期処理の理解度に直結します。コールバック地獄に悩んだ経験、`Promise.all` と `Promise.allSettled` の違いを説明できない経験、`async/await` を使っているのに直列実行になってしまった経験——これらはすべて、非同期処理の基礎が固まっていないことに起因します。本記事では、JavaScriptのシングルスレッドモデルから始め、実践的な並行制御パターン・エラーハンドリング・ストリーム処理・Worker Threadsまで、体系的に解説します。

---

## 1. JavaScriptのシングルスレッドとイベントループ

JavaScriptはシングルスレッドで動作します。これは「同時に1つのことしか実行できない」ことを意味しますが、Node.jsが大量の並行I/Oを処理できるのはイベントループのおかげです。

### コールスタック・タスクキュー・マイクロタスクキュー

```javascript
// イベントループの動作を観察する
console.log('1: スクリプト開始');            // コールスタック（同期）

setTimeout(() => {
  console.log('4: setTimeout（マクロタスク）');
}, 0);

Promise.resolve().then(() => {
  console.log('3: Promise.then（マイクロタスク）');
});

console.log('2: スクリプト終了');             // コールスタック（同期）

// 出力順:
// 1: スクリプト開始
// 2: スクリプト終了
// 3: Promise.then（マイクロタスク）
// 4: setTimeout（マクロタスク）
```

イベントループの処理順序は以下の通りです。

1. **コールスタック** — 同期コードをすべて実行
2. **マイクロタスクキュー** — `Promise.then`・`queueMicrotask`・`MutationObserver` を全件処理
3. **マクロタスクキュー** — `setTimeout`・`setInterval`・I/Oコールバックを1件処理
4. 2に戻る

```javascript
// より複雑な例：ネストしたPromiseとsetTimeout
console.log('A');

setTimeout(() => {
  console.log('D');
  Promise.resolve().then(() => console.log('E'));
}, 0);

Promise.resolve()
  .then(() => {
    console.log('B');
    return Promise.resolve();
  })
  .then(() => console.log('C'));

// 出力: A → B → C → D → E
// 解説: D のsetTimeoutが実行された後、その中のPromise.thenがマイクロタスクに積まれ、
//       Eはマクロタスクの次のイテレーションより前に処理される
```

### なぜNode.jsはシングルスレッドで高速なのか

Node.jsのI/O操作（ファイル読み書き・ネットワーク通信・DB問い合わせ）はlibuvが管理するスレッドプールに委譲されます。Node.jsのJavaScriptスレッドは「I/Oの結果を待つ間に別の処理をする」ため、スレッドをブロックせずに数万の並行接続を処理できます。

---

## 2. コールバック関数とコールバック地獄

Node.jsの初期APIはエラーファーストコールバックを採用しています。

```javascript
const fs = require('fs');

// エラーファーストコールバック規約: (error, result) => void
fs.readFile('config.json', 'utf8', (err, data) => {
  if (err) {
    console.error('読み込み失敗:', err.message);
    return;
  }
  console.log('設定:', data);
});
```

### コールバック地獄（Callback Hell）

ネストが深くなると可読性と保守性が激しく低下します。

```javascript
// コールバック地獄の典型例
fs.readFile('user.json', 'utf8', (err, userData) => {
  if (err) return handleError(err);
  const user = JSON.parse(userData);

  fs.readFile(`orders/${user.id}.json`, 'utf8', (err, orderData) => {
    if (err) return handleError(err);
    const orders = JSON.parse(orderData);

    db.query('SELECT * FROM products WHERE id = ?', [orders[0].productId], (err, products) => {
      if (err) return handleError(err);

      sendEmail(user.email, products[0], (err, result) => {
        if (err) return handleError(err);
        // ネストがどんどん深くなる...
        console.log('完了');
      });
    });
  });
});
```

このコードの問題点は、エラーハンドリングの重複・デバッグの困難さ・テストの書きにくさです。Promiseがこれを解決します。

---

## 3. Promiseの基本

Promiseは「将来完了する（または失敗する）非同期操作」を表すオブジェクトです。

```typescript
// Promiseの3つの状態
// pending（保留中）→ fulfilled（成功）または rejected（失敗）

const fetchUser = (id: number): Promise<{ id: number; name: string }> => {
  return new Promise((resolve, reject) => {
    // 非同期処理をシミュレート
    setTimeout(() => {
      if (id > 0) {
        resolve({ id, name: `ユーザー${id}` });  // 成功
      } else {
        reject(new Error('IDは正の整数である必要があります'));  // 失敗
      }
    }, 100);
  });
};

// then / catch / finally
fetchUser(1)
  .then((user) => {
    console.log('取得成功:', user.name);
    return user.id;  // 次のthenに渡す値
  })
  .then((id) => {
    console.log('ユーザーID:', id);
  })
  .catch((err) => {
    console.error('エラー:', err.message);
  })
  .finally(() => {
    console.log('処理完了（成功・失敗どちらでも実行）');
  });
```

### Promise chaining でコールバック地獄を解消

```typescript
import { promises as fs } from 'fs';

// コールバック地獄をPromise chainに変換
const processOrder = (userId: number) =>
  fs.readFile('user.json', 'utf8')
    .then((data) => JSON.parse(data) as { id: number; email: string })
    .then((user) => fs.readFile(`orders/${user.id}.json`, 'utf8').then((o) => ({ user, orders: JSON.parse(o) })))
    .then(({ user, orders }) => sendEmailPromise(user.email, orders[0]))
    .then((result) => {
      console.log('メール送信完了:', result);
    })
    .catch((err) => {
      // チェーン全体のエラーを1箇所でキャッチ
      console.error('処理失敗:', err.message);
    });
```

---

## 4. Promiseの組み合わせメソッド

複数の非同期処理を組み合わせるための4つのメソッドを使い分けることが重要です。

```typescript
const delay = (ms: number, label: string) =>
  new Promise<string>((resolve) => setTimeout(() => resolve(label), ms));

const failAfter = (ms: number, label: string) =>
  new Promise<string>((_, reject) => setTimeout(() => reject(new Error(label)), ms));
```

### Promise.all — 全件成功を待つ

1件でも失敗すると即座にrejectします。

```typescript
// 全APIを並列で呼び出し、全件成功したら進む
const [users, products, orders] = await Promise.all([
  fetchUsers(),
  fetchProducts(),
  fetchOrders(),
]);
// いずれか1つが失敗 → catchに飛ぶ
```

### Promise.allSettled — 全件完了を待つ（失敗を許容）

```typescript
const results = await Promise.allSettled([
  delay(100, 'API-A'),
  failAfter(200, 'API-B失敗'),
  delay(150, 'API-C'),
]);

results.forEach((result, index) => {
  if (result.status === 'fulfilled') {
    console.log(`API-${index}: 成功 →`, result.value);
  } else {
    console.log(`API-${index}: 失敗 →`, result.reason.message);
  }
});
// 出力:
// API-0: 成功 → API-A
// API-1: 失敗 → API-B失敗
// API-2: 成功 → API-C
```

### Promise.race — 最初に完了したものを返す

タイムアウト実装に活用できます。

```typescript
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`タイムアウト: ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
};

// 使用例
try {
  const data = await withTimeout(fetchHeavyData(), 3000);
  console.log('取得完了:', data);
} catch (err) {
  console.error(err.message); // タイムアウト: 3000ms
}
```

### Promise.any — 最初に成功したものを返す

```typescript
// 複数のCDNから最速のレスポンスを採用
const fastestCdn = await Promise.any([
  fetch('https://cdn1.example.com/asset.js'),
  fetch('https://cdn2.example.com/asset.js'),
  fetch('https://cdn3.example.com/asset.js'),
]);
// すべて失敗した場合のみ AggregateError がthrowされる
```

| メソッド | 成功条件 | 失敗条件 | ユースケース |
|----------|----------|----------|-------------|
| `Promise.all` | 全件成功 | 1件でも失敗 | 依存関係のある並列取得 |
| `Promise.allSettled` | 全件完了 | なし | バルク処理・集計 |
| `Promise.race` | 最初の完了 | 最初が失敗 | タイムアウト・ヘルスチェック |
| `Promise.any` | 最初の成功 | 全件失敗 | フォールバック・冗長化 |

---

## 5. async/awaitの基本と落とし穴

`async/await` はPromiseを同期的なコードのように書けるシンタックスシュガーです。

```typescript
// Promiseチェーン版
const getUserOrders = (userId: number) =>
  fetchUser(userId)
    .then((user) => fetchOrders(user.id))
    .then((orders) => ({ userId, orders }));

// async/await版（同等）
const getUserOrdersAsync = async (userId: number) => {
  const user = await fetchUser(userId);
  const orders = await fetchOrders(user.id);
  return { userId, orders };
};
```

### 落とし穴1: 意図せず直列実行になる

```typescript
// 悪い例: awaitを並べると直列実行（合計600ms）
const bad = async () => {
  const users = await fetchUsers();    // 200ms
  const products = await fetchProducts();  // 200ms
  const orders = await fetchOrders();  // 200ms
  return { users, products, orders };
};

// 良い例: Promise.allで並列実行（合計200ms）
const good = async () => {
  const [users, products, orders] = await Promise.all([
    fetchUsers(),
    fetchProducts(),
    fetchOrders(),
  ]);
  return { users, products, orders };
};
```

### 落とし穴2: forEachはawaitを待たない

```typescript
// 悪い例: forEach内のawaitは機能しない
const processItems = async (ids: number[]) => {
  ids.forEach(async (id) => {
    await processItem(id);  // awaitが効いていない
  });
  console.log('完了？');  // 処理が終わる前に実行される
};

// 良い例1: for...ofで直列実行
const processItemsSerial = async (ids: number[]) => {
  for (const id of ids) {
    await processItem(id);
  }
  console.log('完了');
};

// 良い例2: Promise.allで並列実行
const processItemsParallel = async (ids: number[]) => {
  await Promise.all(ids.map((id) => processItem(id)));
  console.log('完了');
};
```

### 落とし穴3: async関数はPromiseを返す

```typescript
// async関数の戻り値は常にPromise
const getValue = async (): Promise<number> => 42;

// 同期的に使おうとするとundefinedになる
const result = getValue();  // Promise<number>、42ではない
console.log(result);        // Promise { 42 }

// 正しい使い方
const result2 = await getValue();  // 42
```

---

## 6. エラーハンドリングのベストプラクティス

### try/catch の適切な粒度

```typescript
// 悪い例: エラー原因が特定できない
const processAll = async () => {
  try {
    const user = await fetchUser(1);
    const orders = await fetchOrders(user.id);
    const invoice = await generateInvoice(orders);
    await sendEmail(user.email, invoice);
  } catch (err) {
    console.error('何かが失敗した:', err);  // どのステップか不明
  }
};

// 良い例: エラー原因を特定できる構造
const processAllSafe = async () => {
  let user: User;
  try {
    user = await fetchUser(1);
  } catch (err) {
    throw new Error(`ユーザー取得失敗: ${err.message}`);
  }

  let orders: Order[];
  try {
    orders = await fetchOrders(user.id);
  } catch (err) {
    throw new Error(`注文取得失敗 (userId=${user.id}): ${err.message}`);
  }

  // ...
};
```

### カスタムエラークラスで型安全なエラーハンドリング

```typescript
class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

class NotFoundError extends AppError {
  constructor(resource: string, id: string | number) {
    super(`${resource} が見つかりません: ${id}`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

class ValidationError extends AppError {
  constructor(field: string, message: string) {
    super(`バリデーションエラー [${field}]: ${message}`, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

// エラーの種類に応じた処理
const handleRequest = async (id: number) => {
  try {
    if (id <= 0) throw new ValidationError('id', '正の整数である必要があります');
    const user = await fetchUser(id);
    if (!user) throw new NotFoundError('User', id);
    return user;
  } catch (err) {
    if (err instanceof NotFoundError) {
      return { error: err.message, statusCode: 404 };
    }
    if (err instanceof ValidationError) {
      return { error: err.message, statusCode: 400 };
    }
    throw err;  // 想定外のエラーは再throw
  }
};
```

### グローバルな未処理Promiseエラーのキャッチ

```typescript
// Node.js プロセスレベルでのエラーキャッチ
process.on('unhandledRejection', (reason, promise) => {
  console.error('未処理のPromise拒否:', reason);
  // プロダクションでは適切なロギング・監視ツールに送信
  // Sentry.captureException(reason);
  process.exit(1);  // クリーンにシャットダウン
});

process.on('uncaughtException', (err) => {
  console.error('未捕捉の例外:', err);
  process.exit(1);
});
```

---

## 7. 並列処理パターン

### 並行数を制限した処理（Concurrency Limiter）

`Promise.all` で大量のタスクを一度に実行するとサーバーに過負荷をかけます。

```typescript
// 並行数を制限する汎用関数
async function pLimit<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
): Promise<T[]> {
  const results: T[] = [];
  let index = 0;

  const worker = async (): Promise<void> => {
    while (index < tasks.length) {
      const currentIndex = index++;
      results[currentIndex] = await tasks[currentIndex]();
    }
  };

  // concurrency数のワーカーを並列起動
  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, worker),
  );

  return results;
}

// 使用例: 100件のAPIリクエストを最大5並列で実行
const userIds = Array.from({ length: 100 }, (_, i) => i + 1);
const tasks = userIds.map((id) => () => fetchUser(id));

const users = await pLimit(tasks, 5);
console.log(`${users.length}件のユーザーを取得完了`);
```

### バッチ処理パターン

```typescript
// N件ずつに分割して処理
async function processBatch<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>,
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
    console.log(`バッチ ${Math.ceil((i + 1) / batchSize)} 完了`);
  }

  return results;
}

// 使用例
const allUsers = await processBatch(userIds, 10, async (batch) => {
  return Promise.all(batch.map((id) => fetchUser(id)));
});
```

### リトライパターン（指数バックオフ）

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    shouldRetry?: (err: unknown) => boolean;
  } = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 300,
    maxDelayMs = 10000,
    shouldRetry = () => true,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts || !shouldRetry(err)) break;

      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      console.warn(`試行 ${attempt}/${maxAttempts} 失敗。${delay}ms後にリトライ...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// 使用例
const data = await withRetry(
  () => fetch('https://api.example.com/data').then((r) => r.json()),
  {
    maxAttempts: 5,
    baseDelayMs: 500,
    shouldRetry: (err) => err instanceof NetworkError,
  },
);
```

---

## 8. AbortController でのキャンセル処理

`AbortController` はfetch・ストリーム・カスタム非同期処理のキャンセルを統一的に扱えます。

```typescript
// fetchのキャンセル
const controller = new AbortController();
const { signal } = controller;

// 5秒後に自動キャンセル
const timeoutId = setTimeout(() => controller.abort(new Error('タイムアウト')), 5000);

try {
  const response = await fetch('https://api.example.com/large-data', { signal });
  const data = await response.json();
  clearTimeout(timeoutId);
  return data;
} catch (err) {
  if (err.name === 'AbortError') {
    console.log('リクエストがキャンセルされました');
  } else {
    throw err;
  }
}
```

### カスタム非同期処理でAbortSignalを使う

```typescript
// AbortSignalに対応した非同期処理
async function processWithCancellation(
  items: number[],
  signal: AbortSignal,
): Promise<number[]> {
  const results: number[] = [];

  for (const item of items) {
    // キャンセルチェック
    if (signal.aborted) {
      throw signal.reason ?? new Error('処理がキャンセルされました');
    }

    const result = await heavyProcess(item);
    results.push(result);
  }

  return results;
}

// AbortSignal.timeout を使うとさらにシンプル（Node.js 17.3+）
const signal = AbortSignal.timeout(3000);
const results = await processWithCancellation([1, 2, 3, 4, 5], signal);
```

---

## 9. ストリーム処理

大きなデータをメモリに一度に読み込まず、チャンク単位で処理するのがストリームです。

### Readable・Writable・Transform ストリーム

```typescript
import { Readable, Writable, Transform, pipeline } from 'stream';
import { promisify } from 'util';
import { createReadStream, createWriteStream } from 'fs';
import { createGzip } from 'zlib';

const pipelineAsync = promisify(pipeline);

// 大きなファイルをgzip圧縮してコピー（メモリ効率良好）
await pipelineAsync(
  createReadStream('huge-file.txt'),       // Readable
  createGzip(),                             // Transform（圧縮）
  createWriteStream('huge-file.txt.gz'),   // Writable
);
console.log('圧縮完了');
```

### カスタムTransformストリーム

```typescript
import { Transform, TransformCallback } from 'stream';

// CSVの各行をJSONオブジェクトに変換するTransform
class CsvToJson extends Transform {
  private headers: string[] = [];
  private buffer = '';

  constructor() {
    super({ objectMode: true });
  }

  _transform(chunk: Buffer, _encoding: string, callback: TransformCallback): void {
    this.buffer += chunk.toString();
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? '';  // 未完の行はバッファに残す

    for (const line of lines) {
      if (line.trim() === '') continue;
      const values = line.split(',').map((v) => v.trim());

      if (this.headers.length === 0) {
        this.headers = values;  // 1行目はヘッダー
      } else {
        const record: Record<string, string> = {};
        this.headers.forEach((header, i) => {
          record[header] = values[i] ?? '';
        });
        this.push(record);
      }
    }

    callback();
  }

  _flush(callback: TransformCallback): void {
    if (this.buffer.trim()) {
      // 最後の行を処理
      const values = this.buffer.split(',').map((v) => v.trim());
      const record: Record<string, string> = {};
      this.headers.forEach((header, i) => {
        record[header] = values[i] ?? '';
      });
      this.push(record);
    }
    callback();
  }
}

// 使用例
const csvToJson = new CsvToJson();
createReadStream('data.csv')
  .pipe(csvToJson)
  .on('data', (record) => {
    console.log('行データ:', record);
    // { name: '田中太郎', age: '30', city: '東京' }
  });
```

### async iteratorでストリームを扱う（Node.js 12+）

```typescript
import { createReadStream } from 'fs';
import * as readline from 'readline';

async function countLines(filePath: string): Promise<number> {
  const fileStream = createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream });

  let count = 0;
  for await (const _line of rl) {
    count++;
  }

  return count;
}

const lines = await countLines('huge-log.txt');
console.log(`総行数: ${lines}`);
```

---

## 10. Worker Threads で重い処理をオフロード

CPU集約的な処理（画像変換・暗号計算・大量データ集計）はイベントループをブロックします。Worker Threadsを使えばNode.jsのシングルスレッド制約を回避できます。

```typescript
// worker.ts — ワーカースレッドのコード
import { workerData, parentPort } from 'worker_threads';

function heavyComputation(n: number): number {
  // フィボナッチ数列（意図的に重い実装）
  if (n <= 1) return n;
  return heavyComputation(n - 1) + heavyComputation(n - 2);
}

const result = heavyComputation(workerData.n);
parentPort?.postMessage({ result });
```

```typescript
// main.ts — メインスレッドのコード
import { Worker } from 'worker_threads';
import path from 'path';

function runWorker(n: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, 'worker.js'), {
      workerData: { n },
    });

    worker.on('message', ({ result }) => resolve(result));
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker終了コード: ${code}`));
    });
  });
}

// ワーカーを並列実行
console.time('並列計算');
const [fib40, fib41, fib42] = await Promise.all([
  runWorker(40),
  runWorker(41),
  runWorker(42),
]);
console.timeEnd('並列計算');
console.log(`fib(40)=${fib40}, fib(41)=${fib41}, fib(42)=${fib42}`);
```

### Worker Poolパターン

毎回ワーカーを生成するのはオーバーヘッドがあります。プールを使い回すことで効率化できます。

```typescript
import { Worker } from 'worker_threads';

class WorkerPool {
  private workers: Worker[] = [];
  private queue: Array<{
    data: unknown;
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
  }> = [];
  private idleWorkers: Worker[] = [];

  constructor(private workerPath: string, size: number) {
    for (let i = 0; i < size; i++) {
      const worker = new Worker(workerPath);
      worker.on('message', (result) => {
        const task = this.queue.shift();
        if (task) {
          worker.postMessage(task.data);
          task.resolve(result);
        } else {
          this.idleWorkers.push(worker);
        }
      });
      this.idleWorkers.push(worker);
    }
  }

  run(data: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const worker = this.idleWorkers.pop();
      if (worker) {
        worker.once('message', resolve);
        worker.once('error', reject);
        worker.postMessage(data);
      } else {
        this.queue.push({ data, resolve, reject });
      }
    });
  }

  async terminate(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.terminate()));
  }
}
```

---

## 11. タイマーの優先順位

Node.jsのタイマーAPIは複数あり、それぞれ実行タイミングが異なります。

```javascript
// 実行順序を確認する
setImmediate(() => console.log('5: setImmediate（チェックフェーズ）'));

setTimeout(() => console.log('4: setTimeout 0ms（タイマーフェーズ）'), 0);

Promise.resolve().then(() => console.log('2: Promise.then（マイクロタスク）'));

process.nextTick(() => console.log('1: process.nextTick（最優先マイクロタスク）'));

queueMicrotask(() => console.log('3: queueMicrotask（マイクロタスク）'));

console.log('0: 同期コード');

// 出力:
// 0: 同期コード
// 1: process.nextTick（最優先マイクロタスク）
// 2: Promise.then（マイクロタスク）
// 3: queueMicrotask（マイクロタスク）
// 4: setTimeout 0ms（タイマーフェーズ）
// 5: setImmediate（チェックフェーズ）
```

### 各タイマーの適切な使い分け

```typescript
// setTimeout: 最小待機時間後に実行（精度は保証されない）
setTimeout(() => {
  console.log('500ms後以降に実行');
}, 500);

// setInterval: 定期実行（ドリフトが発生しやすい）
const intervalId = setInterval(() => {
  console.log('1秒ごとに実行');
}, 1000);
// 停止
clearInterval(intervalId);

// setImmediate: I/Oコールバックの直後に実行（I/O処理後の後処理に最適）
const fs = require('fs');
fs.readFile('file.txt', () => {
  setTimeout(() => console.log('setTimeout'));   // 次のイベントループ
  setImmediate(() => console.log('setImmediate')); // このI/Oフェーズの直後
  // setImmediateが先に実行される
});

// process.nextTick: 現在のオペレーション完了直後（マイクロタスクより優先）
// 使いすぎるとイベントループが飢餓状態になるので注意
const emitAsync = (emitter: EventEmitter, event: string, data: unknown) => {
  process.nextTick(() => emitter.emit(event, data));
};
```

### 精度の高い定期実行（ドリフト補正）

```typescript
// setIntervalはドリフトが蓄積される
// 代わりに再帰setTimeoutで補正する
function accurateInterval(fn: () => void, ms: number): () => void {
  let expected = Date.now() + ms;
  let timeoutId: NodeJS.Timeout;

  const step = () => {
    const drift = Date.now() - expected;
    fn();
    expected += ms;
    timeoutId = setTimeout(step, Math.max(0, ms - drift));
  };

  timeoutId = setTimeout(step, ms);
  return () => clearTimeout(timeoutId);  // キャンセル関数を返す
}

// 使用例: ドリフトを補正しながら毎秒実行
const stop = accurateInterval(() => {
  console.log(new Date().toISOString());
}, 1000);

// 10秒後に停止
setTimeout(stop, 10000);
```

---

## まとめ: 非同期処理の選択指針

| シナリオ | 推奨パターン |
|----------|-------------|
| 単一の非同期処理 | `async/await` + `try/catch` |
| 複数の独立した並列処理 | `Promise.all` |
| 失敗を許容する並列処理 | `Promise.allSettled` |
| 最速レスポンスが欲しい | `Promise.race` / `Promise.any` |
| 大量データの逐次処理 | `for...of` + `await` |
| 大量データの並列処理（負荷制限あり） | `pLimit` + `Promise.all` |
| 大容量ファイル処理 | Stream + `pipeline` |
| CPU集約型処理 | Worker Threads |
| キャンセル可能な処理 | `AbortController` |
| 定期実行 | 再帰 `setTimeout`（ドリフト補正） |

JavaScriptの非同期処理は「シングルスレッドのイベントループ」という土台の上に、Promise・async/await・ストリーム・Worker Threadsが積み重なっています。イベントループの仕組みを理解した上でこれらのAPIを使い分けることで、パフォーマンスが高く、バグが少なく、テストしやすいNode.jsアプリケーションを構築できます。

---

*本記事のコードサンプルはNode.js 18以上・TypeScript 5以上を対象としています。*

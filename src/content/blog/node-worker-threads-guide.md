---
title: 'Node.js Worker Threads実践: CPU集約タスクの並列処理'
description: 'Node.js Worker Threadsを使ったCPU集約タスクの並列処理を実践的に解説。マルチスレッドプログラミングの基礎、ワーカープール実装、パフォーマンス最適化テクニックを紹介します。'
pubDate: 2025-10-12
updatedDate: 2025-10-12
tags: ['nodejs', 'worker-threads', 'performance', 'concurrency', 'backend']
category: 'backend'
---

## Worker Threadsとは

Node.js Worker Threadsは、JavaScriptコードを別スレッドで実行するための機能です。CPU集約的な処理を並列化し、メインスレッド(イベントループ)をブロックせずにパフォーマンスを向上させます。

### なぜWorker Threadsが必要か

```javascript
// ❌ CPU集約タスクでメインスレッドがブロック
const express = require('express');
const app = express();

app.get('/heavy', (req, res) => {
  // フィボナッチ計算(CPU集約)
  const result = fibonacci(45);
  res.json({ result });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// /heavyのリクエスト中、/healthも応答できない!
```

```javascript
// ✅ Worker Threadsで並列処理
const { Worker } = require('worker_threads');

app.get('/heavy', async (req, res) => {
  const worker = new Worker('./fibonacci-worker.js', {
    workerData: { n: 45 }
  });

  worker.on('message', (result) => {
    res.json({ result });
  });

  worker.on('error', (error) => {
    res.status(500).json({ error: error.message });
  });
});

// メインスレッドはブロックされない
```

## 基本的な使い方

### シンプルなWorker

```javascript
// main.js
const { Worker } = require('worker_threads');

function runWorker(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./worker.js', {
      workerData: data
    });

    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

// 使用
runWorker({ n: 10 })
  .then(result => console.log('Result:', result))
  .catch(err => console.error('Error:', err));
```

```javascript
// worker.js
const { workerData, parentPort } = require('worker_threads');

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = fibonacci(workerData.n);
parentPort.postMessage(result);
```

### TypeScriptでの実装

```typescript
// main.ts
import { Worker } from 'worker_threads';
import path from 'path';

interface WorkerData {
  n: number;
}

interface WorkerResult {
  result: number;
  duration: number;
}

function runWorker<T, R>(
  workerPath: string,
  data: T
): Promise<R> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerPath, {
      workerData: data,
    });

    worker.on('message', (message: R) => {
      resolve(message);
    });

    worker.on('error', reject);

    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker exited with code ${code}`));
      }
    });
  });
}

// 使用例
async function main() {
  const result = await runWorker<WorkerData, WorkerResult>(
    path.join(__dirname, 'worker.js'),
    { n: 45 }
  );

  console.log(`Result: ${result.result}`);
  console.log(`Duration: ${result.duration}ms`);
}

main();
```

```typescript
// worker.ts
import { workerData, parentPort } from 'worker_threads';

interface WorkerData {
  n: number;
}

interface WorkerResult {
  result: number;
  duration: number;
}

function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const startTime = Date.now();
const result = fibonacci(workerData.n);
const duration = Date.now() - startTime;

const response: WorkerResult = {
  result,
  duration,
};

parentPort!.postMessage(response);
```

## Worker Pool実装

### 基本的なWorker Pool

```typescript
// worker-pool.ts
import { Worker } from 'worker_threads';
import EventEmitter from 'events';
import os from 'os';

interface Task<T, R> {
  data: T;
  resolve: (value: R) => void;
  reject: (error: Error) => void;
}

export class WorkerPool<T = any, R = any> extends EventEmitter {
  private workers: Worker[] = [];
  private freeWorkers: Worker[] = [];
  private queue: Task<T, R>[] = [];
  private workerPath: string;
  private poolSize: number;

  constructor(workerPath: string, poolSize = os.cpus().length) {
    super();
    this.workerPath = workerPath;
    this.poolSize = poolSize;

    // ワーカープール初期化
    for (let i = 0; i < poolSize; i++) {
      this.addWorker();
    }
  }

  private addWorker(): void {
    const worker = new Worker(this.workerPath);

    worker.on('message', (result: R) => {
      this.freeWorkers.push(worker);
      this.processQueue();
      this.emit('taskComplete', result);
    });

    worker.on('error', (error) => {
      this.emit('error', error);
    });

    this.workers.push(worker);
    this.freeWorkers.push(worker);
  }

  private processQueue(): void {
    if (this.queue.length === 0 || this.freeWorkers.length === 0) {
      return;
    }

    const task = this.queue.shift()!;
    const worker = this.freeWorkers.pop()!;

    const onMessage = (result: R) => {
      worker.off('message', onMessage);
      worker.off('error', onError);
      task.resolve(result);
      this.freeWorkers.push(worker);
      this.processQueue();
    };

    const onError = (error: Error) => {
      worker.off('message', onMessage);
      worker.off('error', onError);
      task.reject(error);
      this.freeWorkers.push(worker);
      this.processQueue();
    };

    worker.once('message', onMessage);
    worker.once('error', onError);
    worker.postMessage(task.data);
  }

  exec(data: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ data, resolve, reject });
      this.processQueue();
    });
  }

  async destroy(): Promise<void> {
    await Promise.all(
      this.workers.map((worker) => worker.terminate())
    );
    this.workers = [];
    this.freeWorkers = [];
    this.queue = [];
  }

  getStats() {
    return {
      poolSize: this.poolSize,
      activeWorkers: this.poolSize - this.freeWorkers.length,
      queuedTasks: this.queue.length,
    };
  }
}
```

### 使用例

```typescript
// example-pool.ts
import { WorkerPool } from './worker-pool';
import path from 'path';

interface ImageTask {
  imagePath: string;
  operations: string[];
}

interface ImageResult {
  outputPath: string;
  duration: number;
}

async function processImages() {
  const pool = new WorkerPool<ImageTask, ImageResult>(
    path.join(__dirname, 'image-worker.js'),
    4 // 4ワーカー
  );

  const tasks = [
    { imagePath: '/images/1.jpg', operations: ['resize', 'compress'] },
    { imagePath: '/images/2.jpg', operations: ['resize', 'compress'] },
    { imagePath: '/images/3.jpg', operations: ['resize', 'compress'] },
  ];

  try {
    const results = await Promise.all(
      tasks.map((task) => pool.exec(task))
    );

    console.log('Processed images:', results);
    console.log('Pool stats:', pool.getStats());
  } finally {
    await pool.destroy();
  }
}

processImages();
```

## 実践例: 画像処理

```typescript
// image-worker.ts
import { parentPort } from 'worker_threads';
import sharp from 'sharp';
import path from 'path';

interface ImageTask {
  imagePath: string;
  operations: Array<'resize' | 'compress' | 'grayscale'>;
}

parentPort!.on('message', async (task: ImageTask) => {
  const startTime = Date.now();

  try {
    let pipeline = sharp(task.imagePath);

    // 操作を適用
    for (const operation of task.operations) {
      switch (operation) {
        case 'resize':
          pipeline = pipeline.resize(800, 600, { fit: 'inside' });
          break;
        case 'compress':
          pipeline = pipeline.jpeg({ quality: 80 });
          break;
        case 'grayscale':
          pipeline = pipeline.grayscale();
          break;
      }
    }

    const outputPath = path.join(
      path.dirname(task.imagePath),
      'processed',
      path.basename(task.imagePath)
    );

    await pipeline.toFile(outputPath);

    parentPort!.postMessage({
      outputPath,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    parentPort!.postMessage({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
```

## 実践例: CSVデータ処理

```typescript
// csv-worker.ts
import { parentPort, workerData } from 'worker_threads';
import { parse } from 'csv-parse/sync';
import fs from 'fs';

interface CsvTask {
  filePath: string;
  transform: string; // 変換ロジック(文字列として受け取り)
}

interface CsvResult {
  rowCount: number;
  processedData: any[];
  duration: number;
}

const startTime = Date.now();

try {
  const { filePath, transform } = workerData as CsvTask;

  // CSVファイル読み込み
  const content = fs.readFileSync(filePath, 'utf-8');
  const records = parse(content, { columns: true });

  // 変換ロジックを実行(evalは本番では避けるべき)
  const transformFn = new Function('data', transform);
  const processedData = records.map(transformFn);

  const result: CsvResult = {
    rowCount: records.length,
    processedData,
    duration: Date.now() - startTime,
  };

  parentPort!.postMessage(result);
} catch (error) {
  throw error;
}
```

```typescript
// csv-processor.ts
import { WorkerPool } from './worker-pool';
import path from 'path';

interface CsvTask {
  filePath: string;
  transform: string;
}

interface CsvResult {
  rowCount: number;
  processedData: any[];
  duration: number;
}

async function processCsvFiles() {
  const pool = new WorkerPool<CsvTask, CsvResult>(
    path.join(__dirname, 'csv-worker.js'),
    4
  );

  const files = [
    { file: 'sales-2024-q1.csv', transform: 'return { ...data, total: data.quantity * data.price }' },
    { file: 'sales-2024-q2.csv', transform: 'return { ...data, total: data.quantity * data.price }' },
    { file: 'sales-2024-q3.csv', transform: 'return { ...data, total: data.quantity * data.price }' },
  ];

  const results = await Promise.all(
    files.map((f) =>
      pool.exec({
        filePath: path.join('./data', f.file),
        transform: f.transform,
      })
    )
  );

  console.log('Total rows processed:', results.reduce((sum, r) => sum + r.rowCount, 0));
  console.log('Total duration:', results.reduce((sum, r) => sum + r.duration, 0));

  await pool.destroy();
}

processCsvFiles();
```

## SharedArrayBufferでの共有メモリ

```typescript
// shared-memory-example.ts
import { Worker } from 'worker_threads';

// 共有メモリバッファ
const sharedBuffer = new SharedArrayBuffer(1024);
const sharedArray = new Int32Array(sharedBuffer);

// メインスレッドで値を設定
Atomics.store(sharedArray, 0, 100);

const worker = new Worker(`
  const { parentPort, workerData } = require('worker_threads');
  const sharedArray = new Int32Array(workerData);

  // ワーカーで値を読み取り
  const value = Atomics.load(sharedArray, 0);
  console.log('Worker read:', value);

  // ワーカーで値を更新
  Atomics.add(sharedArray, 0, 50);

  parentPort.postMessage('done');
`, { eval: true, workerData: sharedBuffer });

worker.on('message', () => {
  // メインスレッドで更新された値を確認
  console.log('Main thread read:', Atomics.load(sharedArray, 0)); // 150
});
```

## パフォーマンス計測

```typescript
// benchmark.ts
import { Worker } from 'worker_threads';
import { performance } from 'perf_hooks';

async function benchmark() {
  const n = 42;

  // シングルスレッド
  const singleStart = performance.now();
  const singleResult = fibonacci(n);
  const singleDuration = performance.now() - singleStart;

  // マルチスレッド(4ワーカー)
  const multiStart = performance.now();
  const tasks = Array.from({ length: 4 }, () =>
    runWorker({ n: n })
  );
  await Promise.all(tasks);
  const multiDuration = performance.now() - multiStart;

  console.log(`Single thread: ${singleDuration.toFixed(2)}ms`);
  console.log(`Multi thread (4 workers): ${multiDuration.toFixed(2)}ms`);
  console.log(`Speedup: ${(singleDuration / multiDuration).toFixed(2)}x`);
}

function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

function runWorker(data: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./fibonacci-worker.js', {
      workerData: data,
    });
    worker.on('message', resolve);
    worker.on('error', reject);
  });
}

benchmark();
```

## Expressとの統合

```typescript
// server.ts
import express from 'express';
import { WorkerPool } from './worker-pool';
import path from 'path';

const app = express();
const port = 3000;

// ワーカープールを起動時に初期化
const pool = new WorkerPool(
  path.join(__dirname, 'task-worker.js'),
  4
);

app.use(express.json());

app.post('/process', async (req, res) => {
  try {
    const result = await pool.exec(req.body);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/stats', (req, res) => {
  res.json(pool.getStats());
});

// グレースフルシャットダウン
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await pool.destroy();
  process.exit(0);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

## エラーハンドリング

```typescript
// robust-worker.ts
import { Worker } from 'worker_threads';

interface WorkerOptions {
  maxRetries?: number;
  timeout?: number;
}

async function runWorkerWithRetry<T, R>(
  workerPath: string,
  data: T,
  options: WorkerOptions = {}
): Promise<R> {
  const { maxRetries = 3, timeout = 30000 } = options;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await runWorkerWithTimeout<T, R>(workerPath, data, timeout);
    } catch (error) {
      lastError = error as Error;
      console.warn(`Worker attempt ${attempt + 1} failed:`, error);

      if (attempt < maxRetries - 1) {
        // 指数バックオフ
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  }

  throw lastError || new Error('Worker failed after all retries');
}

function runWorkerWithTimeout<T, R>(
  workerPath: string,
  data: T,
  timeout: number
): Promise<R> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerPath, { workerData: data });
    let timeoutId: NodeJS.Timeout;

    const cleanup = () => {
      clearTimeout(timeoutId);
      worker.terminate();
    };

    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`Worker timed out after ${timeout}ms`));
    }, timeout);

    worker.on('message', (result: R) => {
      cleanup();
      resolve(result);
    });

    worker.on('error', (error) => {
      cleanup();
      reject(error);
    });

    worker.on('exit', (code) => {
      cleanup();
      if (code !== 0) {
        reject(new Error(`Worker exited with code ${code}`));
      }
    });
  });
}
```

## ベストプラクティス

### 1. ワーカー数の最適化

```typescript
import os from 'os';

// CPU コア数に基づく
const optimalWorkerCount = os.cpus().length;

// I/O バウンドタスク: CPU コア数より多め
const ioWorkerCount = os.cpus().length * 2;

// CPU バウンドタスク: CPU コア数と同じか少なめ
const cpuWorkerCount = Math.max(1, os.cpus().length - 1);
```

### 2. メモリ効率

```typescript
// ❌ 非効率: 大きなデータをコピー
worker.postMessage(largeArray); // データがシリアライズされる

// ✅ 効率的: 転送可能オブジェクトを使用
worker.postMessage(largeArrayBuffer, [largeArrayBuffer]);
```

### 3. プール管理

```typescript
// アプリケーション起動時にプール作成
const pool = new WorkerPool('./worker.js', 4);

// 使い回す
app.post('/task1', async (req, res) => {
  const result = await pool.exec(req.body);
  res.json(result);
});

// 終了時にクリーンアップ
process.on('exit', async () => {
  await pool.destroy();
});
```

## まとめ

Node.js Worker Threadsを活用することで、CPU集約タスクを並列処理し、アプリケーションのパフォーマンスを大幅に向上させることができます。ワーカープールパターンを実装し、適切なエラーハンドリングとリソース管理を行うことで、本番環境でも安定したマルチスレッドアプリケーションを構築できます。

### Worker Threadsを使うべき場面

- 画像/動画処理
- 大量データの変換・集計
- 暗号化/復号化
- 機械学習の推論
- PDFレンダリング
- コード圧縮・難読化

### 次のステップ

- Cluster APIとの違いを理解
- メッセージパッシングの最適化
- SharedArrayBufferでのロック制御
- 分散処理への拡張(BullMQ等)

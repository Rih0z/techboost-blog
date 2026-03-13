---
title: "Web Workers実践ガイド — メインスレッドをブロックしない高速処理"
description: "Web Workersを使ったバックグラウンド処理の実装を完全解説。Dedicated Worker、Shared Worker、Service Workerの違いから、postMessage、Transferable Objectsまで実践的なパターンを学べます。"
pubDate: "2026-02-05"
tags: ["Web Workers", "JavaScript", "パフォーマンス", "並列処理", "ブラウザAPI"]
heroImage: '../../assets/thumbnails/web-workers-practical.jpg'
---

## Web Workersとは

Web Workersは、JavaScriptをメインスレッドとは別のバックグラウンドスレッドで実行するためのブラウザAPIです。重い計算処理をWorkerに委譲することで、UIのブロックを防ぎ、快適なユーザー体験を維持できます。

2026年現在、すべてのモダンブラウザで完全にサポートされており、特にデータ集約的なWebアプリケーションでは必須の技術となっています。

### Web Workersの種類

1. **Dedicated Worker**: 単一のスクリプトから使用される専用Worker
2. **Shared Worker**: 複数のスクリプトから共有できるWorker
3. **Service Worker**: PWAやキャッシュ制御に特化したWorker

この記事では主にDedicated Workerに焦点を当てます。

## Dedicated Workerの基本

### 最初のWorker

メインスクリプト:

```javascript
// main.js
const worker = new Worker('worker.js');

// Workerにメッセージを送信
worker.postMessage({ type: 'calculate', data: 1000000 });

// Workerからのメッセージを受信
worker.onmessage = (event) => {
  console.log('Result:', event.data);
};

// エラーハンドリング
worker.onerror = (error) => {
  console.error('Worker error:', error);
};
```

Workerスクリプト:

```javascript
// worker.js
self.onmessage = (event) => {
  const { type, data } = event.data;

  if (type === 'calculate') {
    // 重い計算処理
    let result = 0;
    for (let i = 0; i < data; i++) {
      result += Math.sqrt(i);
    }

    // 結果を返す
    self.postMessage(result);
  }
};
```

### TypeScriptでの型安全なWorker

```typescript
// worker.types.ts
export interface WorkerRequest {
  type: 'calculate' | 'process';
  data: any;
}

export interface WorkerResponse {
  type: 'result' | 'error';
  data: any;
}
```

```typescript
// worker.ts
import { WorkerRequest, WorkerResponse } from './worker.types';

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { type, data } = event.data;

  try {
    if (type === 'calculate') {
      const result = performCalculation(data);

      const response: WorkerResponse = {
        type: 'result',
        data: result,
      };

      self.postMessage(response);
    }
  } catch (error) {
    const response: WorkerResponse = {
      type: 'error',
      data: error.message,
    };

    self.postMessage(response);
  }
};

function performCalculation(n: number): number {
  let result = 0;
  for (let i = 0; i < n; i++) {
    result += Math.sqrt(i);
  }
  return result;
}
```

## Transferable Objects

大きなデータをWorkerとやり取りする場合、通常のpostMessageではデータがコピーされるため、パフォーマンスが低下します。Transferable Objectsを使うと、データの所有権を移譲できるため、高速です。

### ArrayBufferの転送

```javascript
// main.js
const buffer = new ArrayBuffer(1024 * 1024); // 1MB
const uint8Array = new Uint8Array(buffer);

// データを準備
for (let i = 0; i < uint8Array.length; i++) {
  uint8Array[i] = i % 256;
}

// bufferの所有権をWorkerに移譲
worker.postMessage({ buffer }, [buffer]);

// この時点でbufferはメインスレッドでは使用不可
console.log(buffer.byteLength); // 0
```

```javascript
// worker.js
self.onmessage = (event) => {
  const { buffer } = event.data;
  const uint8Array = new Uint8Array(buffer);

  // データ処理
  for (let i = 0; i < uint8Array.length; i++) {
    uint8Array[i] = uint8Array[i] * 2;
  }

  // 処理結果を返す（所有権を戻す）
  self.postMessage({ buffer }, [buffer]);
};
```

### ImageDataの転送

```javascript
// 画像処理の例
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

const worker = new Worker('image-worker.js');

worker.postMessage(
  { imageData },
  [imageData.data.buffer] // ImageDataの内部バッファを転送
);

worker.onmessage = (event) => {
  const processedImageData = event.data.imageData;
  ctx.putImageData(processedImageData, 0, 0);
};
```

## 実践的なパターン

### 画像処理Worker

グレースケール変換の例:

```javascript
// image-worker.js
self.onmessage = (event) => {
  const { imageData } = event.data;
  const data = imageData.data;

  // グレースケール変換
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    data[i] = avg;     // R
    data[i + 1] = avg; // G
    data[i + 2] = avg; // B
    // data[i + 3] はアルファ値（そのまま）
  }

  self.postMessage(
    { imageData },
    [imageData.data.buffer]
  );
};
```

メインスクリプト:

```javascript
// main.js
async function processImage(file) {
  const img = await createImageBitmap(file);

  const canvas = new OffscreenCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  return new Promise((resolve) => {
    const worker = new Worker('image-worker.js');

    worker.postMessage(
      { imageData },
      [imageData.data.buffer]
    );

    worker.onmessage = (event) => {
      resolve(event.data.imageData);
      worker.terminate();
    };
  });
}
```

### データ集計Worker

大量のデータ処理の例:

```javascript
// data-worker.js
self.onmessage = (event) => {
  const { type, data } = event.data;

  if (type === 'aggregate') {
    const result = {
      count: data.length,
      sum: 0,
      average: 0,
      min: Infinity,
      max: -Infinity,
    };

    for (const value of data) {
      result.sum += value;
      result.min = Math.min(result.min, value);
      result.max = Math.max(result.max, value);
    }

    result.average = result.sum / result.count;

    self.postMessage({ type: 'result', data: result });
  }
};
```

```javascript
// main.js
function aggregateData(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('data-worker.js');

    worker.postMessage({ type: 'aggregate', data });

    worker.onmessage = (event) => {
      if (event.data.type === 'result') {
        resolve(event.data.data);
        worker.terminate();
      }
    };

    worker.onerror = (error) => {
      reject(error);
      worker.terminate();
    };
  });
}

// 使用例
const largeDataset = Array.from({ length: 1000000 }, () => Math.random() * 100);

aggregateData(largeDataset).then((stats) => {
  console.log('Statistics:', stats);
});
```

### プログレス報告

長時間かかる処理で進捗を報告する例:

```javascript
// progress-worker.js
self.onmessage = (event) => {
  const { type, data } = event.data;

  if (type === 'process') {
    const total = data.length;
    let processed = 0;

    for (const item of data) {
      // 重い処理
      processItem(item);

      processed++;

      // 10%ごとに進捗を報告
      if (processed % Math.floor(total / 10) === 0) {
        self.postMessage({
          type: 'progress',
          data: {
            processed,
            total,
            percentage: (processed / total) * 100,
          },
        });
      }
    }

    self.postMessage({ type: 'complete' });
  }
};

function processItem(item) {
  // 実際の処理
  let result = 0;
  for (let i = 0; i < 1000000; i++) {
    result += Math.sqrt(i);
  }
  return result;
}
```

```javascript
// main.js
const worker = new Worker('progress-worker.js');

const progressBar = document.getElementById('progress');
const statusText = document.getElementById('status');

worker.onmessage = (event) => {
  const { type, data } = event.data;

  if (type === 'progress') {
    progressBar.value = data.percentage;
    statusText.textContent = `処理中: ${data.processed} / ${data.total}`;
  } else if (type === 'complete') {
    statusText.textContent = '完了!';
    worker.terminate();
  }
};

// 処理開始
worker.postMessage({
  type: 'process',
  data: Array.from({ length: 100 }, (_, i) => i),
});
```

## Worker Pool

複数のWorkerを管理して並列処理を効率化するパターン:

```javascript
// worker-pool.js
class WorkerPool {
  constructor(workerScript, poolSize = navigator.hardwareConcurrency || 4) {
    this.workers = [];
    this.taskQueue = [];
    this.activeWorkers = new Set();

    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(workerScript);
      worker.onmessage = (event) => this.handleWorkerMessage(worker, event);
      this.workers.push(worker);
    }
  }

  execute(data) {
    return new Promise((resolve, reject) => {
      const task = { data, resolve, reject };

      const availableWorker = this.workers.find(
        (w) => !this.activeWorkers.has(w)
      );

      if (availableWorker) {
        this.runTask(availableWorker, task);
      } else {
        this.taskQueue.push(task);
      }
    });
  }

  runTask(worker, task) {
    this.activeWorkers.add(worker);
    worker.currentTask = task;
    worker.postMessage(task.data);
  }

  handleWorkerMessage(worker, event) {
    const task = worker.currentTask;
    task.resolve(event.data);

    this.activeWorkers.delete(worker);
    delete worker.currentTask;

    // 次のタスクを実行
    if (this.taskQueue.length > 0) {
      const nextTask = this.taskQueue.shift();
      this.runTask(worker, nextTask);
    }
  }

  terminate() {
    this.workers.forEach((worker) => worker.terminate());
    this.workers = [];
    this.taskQueue = [];
    this.activeWorkers.clear();
  }
}
```

使用例:

```javascript
const pool = new WorkerPool('calculation-worker.js', 4);

// 複数のタスクを並列実行
const tasks = Array.from({ length: 100 }, (_, i) => ({
  type: 'calculate',
  data: i * 10000,
}));

Promise.all(tasks.map((task) => pool.execute(task)))
  .then((results) => {
    console.log('All tasks completed:', results);
    pool.terminate();
  });
```

## ViteやWebpackでのWorker利用

### Vite

```javascript
// Viteでは ?worker サフィックスを使う
import MyWorker from './worker?worker';

const worker = new MyWorker();
worker.postMessage({ type: 'hello' });
```

### Webpack 5

```javascript
// Webpack 5では自動的にWorkerを認識
const worker = new Worker(new URL('./worker.js', import.meta.url));
```

## パフォーマンスのベストプラクティス

1. **Workerの再利用**: 毎回新しいWorkerを作成せず、再利用する
2. **Transferable Objectsの活用**: 大きなデータは転送する
3. **適切な粒度**: 小さすぎるタスクはオーバーヘッドが大きい
4. **Worker Poolの利用**: CPU数に応じた並列処理
5. **エラーハンドリング**: 必ずエラーハンドラーを設定

## まとめ

Web Workersは、Webアプリケーションのパフォーマンスを劇的に改善できる強力な技術です。特に以下のようなケースで有効です。

- 画像・動画処理
- 大量データの集計・分析
- 複雑な数値計算
- テキスト解析・検索

メインスレッドをブロックしない快適なUXを実現するために、積極的に活用しましょう。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)

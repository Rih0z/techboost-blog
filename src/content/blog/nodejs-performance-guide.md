---
title: 'Node.jsパフォーマンス最適化完全ガイド — プロファイリング・メモリ・クラスタリング・Worker Threads'
description: 'Node.jsアプリのパフォーマンスを最大化する実践ガイド。V8プロファイリング・メモリリーク検出・イベントループ監視・クラスタリング・Worker Threads・ストリーム最適化・APM導入まで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-5.jpg'
tags: ['Node.js', 'パフォーマンス', 'TypeScript', 'Worker Threads', '最適化']
---

Node.jsは非同期I/Oとイベント駆動アーキテクチャにより、高いスループットを実現できるランタイムだ。しかし、適切な最適化を施さなければ、本番環境でメモリリークやイベントループブロッキング、CPUスパイクなどの問題が顕在化する。本記事では、Node.jsアプリケーションのパフォーマンスを根本から改善するための手法を、実際のコード例を交えながら体系的に解説する。

---

## 1. Node.jsパフォーマンスの全体像

### イベントループの仕組みとボトルネック

Node.jsはシングルスレッドのイベントループで動作する。リクエスト処理・タイマー・I/Oコールバックがすべてこのループ上を流れるため、**ループをブロックする処理が1つでも存在すれば、全リクエストのレイテンシが悪化する**。

```
┌───────────────────────────────────────────────┐
│               Event Loop                      │
│  timers → pending callbacks → idle/prepare   │
│  → poll → check → close callbacks            │
└───────────────────────────────────────────────┘
         ↑                          ↓
    libuv Thread Pool (I/O, DNS, crypto...)
```

ボトルネックは大きく3種類に分類できる。

| 種別 | 原因 | 症状 |
|------|------|------|
| CPUバウンド | 複雑な計算・JSON処理 | イベントループラグ増大 |
| メモリリーク | 参照の解放忘れ・クロージャ | ヒープ使用量の単調増加 |
| I/Oバウンド | DB遅延・外部API | スループット低下 |

### パフォーマンス計測の基本指標

最適化を始める前に、何を計測するかを明確にする。

```typescript
// src/metrics/baseline.ts
import { performance, PerformanceObserver } from 'perf_hooks';
import * as os from 'os';

export interface PerformanceBaseline {
  eventLoopLag: number;      // ms
  heapUsed: number;          // bytes
  heapTotal: number;         // bytes
  rss: number;               // bytes (Resident Set Size)
  cpuUserMs: number;
  cpuSystemMs: number;
  activeHandles: number;
  activeRequests: number;
}

export function captureBaseline(): PerformanceBaseline {
  const mem = process.memoryUsage();
  const cpu = process.cpuUsage();
  const lag = measureEventLoopLag();

  return {
    eventLoopLag: lag,
    heapUsed: mem.heapUsed,
    heapTotal: mem.heapTotal,
    rss: mem.rss,
    cpuUserMs: cpu.user / 1000,
    cpuSystemMs: cpu.system / 1000,
    // @ts-ignore: internal API
    activeHandles: (process as any)._getActiveHandles().length,
    // @ts-ignore: internal API
    activeRequests: (process as any)._getActiveRequests().length,
  };
}

function measureEventLoopLag(): number {
  const start = performance.now();
  setImmediate(() => {
    const lag = performance.now() - start;
    return lag;
  });
  return 0; // simplified; use timed version below
}
```

---

## 2. V8プロファイリング — `--inspect` と Chrome DevTools

### CPU プロファイルの取得

Node.jsには組み込みのV8インスペクターが搭載されている。`--inspect` フラグで起動すれば、Chrome DevToolsからリアルタイムにプロファイリングできる。

```bash
# 開発環境でのプロファイリング起動
node --inspect=0.0.0.0:9229 dist/server.js

# 本番ライクな環境での計測（最適化を有効化）
node --inspect --optimize_for_size dist/server.js
```

```typescript
// src/profiler/v8-profiler.ts
import { Session } from 'inspector';
import * as fs from 'fs';
import * as path from 'path';

export class V8Profiler {
  private session: Session;

  constructor() {
    this.session = new Session();
    this.session.connect();
  }

  async startCpuProfile(label: string = 'default'): Promise<void> {
    await this.post('Profiler.enable');
    await this.post('Profiler.setSamplingInterval', { interval: 100 }); // 100μs
    await this.post('Profiler.start');
    console.log(`[V8Profiler] CPU profile started: ${label}`);
  }

  async stopCpuProfile(outputDir: string = './profiles'): Promise<string> {
    const result = await this.post('Profiler.stop') as any;
    const profile = result.profile;

    fs.mkdirSync(outputDir, { recursive: true });
    const filename = `cpu-profile-${Date.now()}.cpuprofile`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(profile));

    console.log(`[V8Profiler] CPU profile saved: ${filepath}`);
    return filepath;
  }

  async takeHeapSnapshot(outputDir: string = './profiles'): Promise<string> {
    await this.post('HeapProfiler.enable');

    let chunks: string[] = [];
    this.session.on('HeapProfiler.addHeapSnapshotChunk', (msg: any) => {
      chunks.push(msg.params.chunk);
    });

    await this.post('HeapProfiler.takeHeapSnapshot', { reportProgress: false });

    fs.mkdirSync(outputDir, { recursive: true });
    const filename = `heap-${Date.now()}.heapsnapshot`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, chunks.join(''));

    console.log(`[V8Profiler] Heap snapshot saved: ${filepath}`);
    return filepath;
  }

  private post(method: string, params?: object): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.session.post(method, params, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
  }

  disconnect(): void {
    this.session.disconnect();
  }
}
```

### Flamegraph の生成

フレームグラフはどの関数がCPU時間を最も消費しているかを視覚化する。`0x` パッケージを使えばワンコマンドで生成できる。

```bash
# 0x インストール
npm install -g 0x

# Flamegraph 生成（プロセスが自動起動・終了）
0x --output-dir ./flamegraph dist/server.js

# 負荷をかけながらプロファイリング
0x dist/server.js &
PID=$!
npx autocannon -c 100 -d 30 http://localhost:3000/api/heavy
kill -SIGINT $PID
```

生成された `flamegraph.html` をブラウザで開くと、コールスタックの厚みがCPU消費量に対応している。幅の広いバーを見つけたら、それが最適化すべきホットスポットだ。

---

## 3. clinic.js — 診断ツールスイート

`clinic.js` はNode.js専用の診断ツール群で、3つのツールを提供している。

```bash
npm install -g clinic
```

### clinic doctor — 総合診断

```bash
# イベントループ・CPU・メモリを同時計測
clinic doctor -- node dist/server.js

# 負荷テストと組み合わせる
clinic doctor --autocannon [ -c 50 -d 20 http://localhost:3000/ ] -- node dist/server.js
```

レポートには以下が含まれる:
- イベントループ遅延の時系列グラフ
- CPU使用率の推移
- メモリ使用量のトレンド
- 問題の自動診断と改善提案

### clinic flame — ホットパスの特定

```bash
# CPU集約タスクのフレームグラフ
clinic flame -- node dist/server.js
```

`clinic flame` は `0x` より詳細なフィルタリングオプションを持ち、Node.js内部フレームを除外してアプリコードに集中できる。

### clinic bubbleprof — 非同期フローの可視化

```bash
# 非同期操作のタイムライン分析
clinic bubbleprof -- node dist/server.js
```

Bubbleprofは非同期コンテキストのラグ（待機時間）をバブルチャートで表示する。データベース待機や外部API呼び出しのボトルネックを素早く発見できる。

---

## 4. メモリリーク検出

### ヒープスナップショットの比較

メモリリークの検出は「スナップショット比較」が最も確実な手法だ。

```typescript
// src/memory/leak-detector.ts
import * as v8 from 'v8';
import * as fs from 'fs';

export class MemoryLeakDetector {
  private snapshots: string[] = [];
  private intervalId: NodeJS.Timeout | null = null;

  // 定期的にヒープ統計を記録
  startMonitoring(intervalMs: number = 60_000): void {
    this.intervalId = setInterval(() => {
      const stats = v8.getHeapStatistics();
      const usage = process.memoryUsage();

      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        heapUsedMB: Math.round(usage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(usage.heapTotal / 1024 / 1024),
        rssMB: Math.round(usage.rss / 1024 / 1024),
        externalMB: Math.round(usage.external / 1024 / 1024),
        mallocedMemoryMB: Math.round(stats.malloced_memory / 1024 / 1024),
        numberOfDetachedContexts: stats.number_of_detached_contexts,
        numberOfNativeContexts: stats.number_of_native_contexts,
      }));
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // GC強制実行後にスナップショット取得（--expose-gc 必須）
  async captureAfterGC(outputPath: string): Promise<void> {
    if (typeof global.gc !== 'function') {
      throw new Error('Run with --expose-gc flag');
    }

    // GCを2回実行して確実にクリーンアップ
    global.gc();
    await new Promise(r => setTimeout(r, 100));
    global.gc();
    await new Promise(r => setTimeout(r, 100));

    const snapshotStream = v8.writeHeapSnapshot(outputPath);
    this.snapshots.push(snapshotStream);
    console.log(`[MemoryLeakDetector] Snapshot saved: ${snapshotStream}`);
  }
}
```

```bash
# --expose-gc フラグで起動し、GC強制実行を許可
node --expose-gc dist/server.js
```

### よくあるメモリリークパターンと対策

```typescript
// BAD: グローバルキャッシュが無限に成長する
const cache = new Map<string, object>();

app.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  if (!cache.has(id)) {
    const user = await db.users.findById(id);
    cache.set(id, user); // 削除されることがない
  }
  res.json(cache.get(id));
});

// GOOD: サイズ制限付きLRUキャッシュを使う
import LRU from 'lru-cache';

const userCache = new LRU<string, object>({
  max: 1000,           // 最大エントリ数
  ttl: 1000 * 60 * 5, // 5分TTL
});

app.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  const cached = userCache.get(id);
  if (cached) return res.json(cached);

  const user = await db.users.findById(id);
  userCache.set(id, user);
  res.json(user);
});
```

```typescript
// BAD: イベントリスナーの解放忘れ
class DataProcessor extends EventEmitter {
  subscribe(source: EventEmitter): void {
    source.on('data', (chunk) => {
      this.process(chunk);
    });
    // source が破棄されてもリスナーが残る
  }
}

// GOOD: WeakRef と FinalizationRegistry を活用
class DataProcessor extends EventEmitter {
  private cleanups: Array<() => void> = [];

  subscribe(source: EventEmitter): void {
    const handler = (chunk: Buffer) => this.process(chunk);
    source.on('data', handler);

    this.cleanups.push(() => source.off('data', handler));
  }

  destroy(): void {
    this.cleanups.forEach(cleanup => cleanup());
    this.cleanups = [];
    this.removeAllListeners();
  }

  private process(chunk: Buffer): void {
    // 処理ロジック
  }
}
```

---

## 5. イベントループ監視 — `perf_hooks` によるラグ計測

イベントループのラグ（遅延）は、アプリケーションの応答性に直結する重要な指標だ。

```typescript
// src/monitoring/event-loop-monitor.ts
import { monitorEventLoopDelay } from 'perf_hooks';

export class EventLoopMonitor {
  private histogram: ReturnType<typeof monitorEventLoopDelay>;
  private alertThresholdMs: number;

  constructor(resolutionMs: number = 20, alertThresholdMs: number = 100) {
    this.histogram = monitorEventLoopDelay({ resolution: resolutionMs });
    this.alertThresholdMs = alertThresholdMs;
  }

  start(): void {
    this.histogram.enable();
    console.log('[EventLoopMonitor] Monitoring started');
  }

  stop(): void {
    this.histogram.disable();
  }

  getStats() {
    const nsToMs = (ns: number) => ns / 1_000_000;

    const stats = {
      minMs: nsToMs(this.histogram.min),
      maxMs: nsToMs(this.histogram.max),
      meanMs: nsToMs(this.histogram.mean),
      stddevMs: nsToMs(this.histogram.stddev),
      p50Ms: nsToMs(this.histogram.percentile(50)),
      p75Ms: nsToMs(this.histogram.percentile(75)),
      p95Ms: nsToMs(this.histogram.percentile(95)),
      p99Ms: nsToMs(this.histogram.percentile(99)),
      p999Ms: nsToMs(this.histogram.percentile(99.9)),
    };

    if (stats.p99Ms > this.alertThresholdMs) {
      console.warn(`[EventLoopMonitor] HIGH LAG DETECTED: p99=${stats.p99Ms.toFixed(2)}ms`);
    }

    this.histogram.reset();
    return stats;
  }
}

// 使用例
const monitor = new EventLoopMonitor(20, 50);
monitor.start();

setInterval(() => {
  const stats = monitor.getStats();
  // Prometheus / Datadog にメトリクス送信
  metrics.gauge('nodejs.event_loop.p99_ms', stats.p99Ms);
  metrics.gauge('nodejs.event_loop.mean_ms', stats.meanMs);
}, 5000);
```

### ブロッキング検出の自動化

```typescript
// src/monitoring/blocking-detector.ts
export function detectLongTasks(thresholdMs: number = 50): void {
  let lastCheck = performance.now();

  setInterval(() => {
    const now = performance.now();
    const elapsed = now - lastCheck;
    const expectedInterval = 10; // setInterval の期待間隔
    const lag = elapsed - expectedInterval;

    if (lag > thresholdMs) {
      console.error(
        `[BlockingDetector] Long task detected! Lag: ${lag.toFixed(2)}ms (threshold: ${thresholdMs}ms)`,
      );
      // スタックトレース取得（開発環境のみ）
      if (process.env.NODE_ENV !== 'production') {
        console.error(new Error('Stack trace at long task detection').stack);
      }
    }

    lastCheck = now;
  }, 10);
}
```

---

## 6. Worker Threads — CPUバウンドタスクの並列化

Node.jsのシングルスレッドの制約を突破するには `worker_threads` モジュールを使う。CPU集約型の処理をメインスレッドから分離することで、イベントループを解放できる。

```typescript
// src/workers/image-processor.worker.ts
import { workerData, parentPort } from 'worker_threads';
import sharp from 'sharp';

interface WorkerInput {
  imageBuffer: ArrayBuffer;
  width: number;
  height: number;
  quality: number;
}

interface WorkerOutput {
  processedBuffer: ArrayBuffer;
  originalSizeBytes: number;
  processedSizeBytes: number;
  processingTimeMs: number;
}

async function processImage(): Promise<void> {
  const { imageBuffer, width, height, quality } = workerData as WorkerInput;
  const startTime = performance.now();

  const buffer = Buffer.from(imageBuffer);

  const processedBuffer = await sharp(buffer)
    .resize(width, height, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality })
    .toBuffer();

  const result: WorkerOutput = {
    processedBuffer: processedBuffer.buffer,
    originalSizeBytes: buffer.byteLength,
    processedSizeBytes: processedBuffer.byteLength,
    processingTimeMs: performance.now() - startTime,
  };

  parentPort?.postMessage(result, [result.processedBuffer]);
}

processImage().catch((err) => {
  parentPort?.postMessage({ error: err.message });
});
```

```typescript
// src/workers/worker-pool.ts
import { Worker } from 'worker_threads';
import * as os from 'os';
import * as path from 'path';

type Task<T, R> = {
  data: T;
  resolve: (value: R) => void;
  reject: (reason: Error) => void;
};

export class WorkerPool<T, R> {
  private workers: Worker[] = [];
  private queue: Task<T, R>[] = [];
  private activeWorkers = new Set<Worker>();
  private workerScript: string;

  constructor(
    workerScript: string,
    private poolSize: number = os.cpus().length - 1,
  ) {
    this.workerScript = path.resolve(workerScript);
    this.initWorkers();
  }

  private initWorkers(): void {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(this.workerScript);
      this.workers.push(worker);
      worker.on('error', (err) => console.error(`[WorkerPool] Worker error:`, err));
    }
  }

  execute(data: T): Promise<R> {
    return new Promise((resolve, reject) => {
      const task: Task<T, R> = { data, resolve, reject };
      const availableWorker = this.workers.find(w => !this.activeWorkers.has(w));

      if (availableWorker) {
        this.runTask(availableWorker, task);
      } else {
        this.queue.push(task);
      }
    });
  }

  private runTask(worker: Worker, task: Task<T, R>): void {
    this.activeWorkers.add(worker);

    const messageHandler = (result: R | { error: string }) => {
      this.activeWorkers.delete(worker);
      worker.removeListener('message', messageHandler);

      if (result && typeof result === 'object' && 'error' in result) {
        task.reject(new Error((result as { error: string }).error));
      } else {
        task.resolve(result as R);
      }

      // キューから次のタスクを取り出す
      if (this.queue.length > 0) {
        const nextTask = this.queue.shift()!;
        this.runTask(worker, nextTask);
      }
    };

    worker.on('message', messageHandler);
    worker.postMessage(task.data, task.data instanceof ArrayBuffer ? [task.data] : []);
  }

  async destroy(): Promise<void> {
    await Promise.all(this.workers.map(w => w.terminate()));
    this.workers = [];
    this.queue = [];
  }

  get stats() {
    return {
      poolSize: this.poolSize,
      activeWorkers: this.activeWorkers.size,
      queuedTasks: this.queue.length,
    };
  }
}

// 使用例
const imagePool = new WorkerPool<WorkerInput, WorkerOutput>(
  './dist/workers/image-processor.worker.js',
  os.cpus().length - 1,
);

app.post('/api/images/resize', async (req, res) => {
  const imageBuffer = req.body; // raw buffer

  const result = await imagePool.execute({
    imageBuffer: imageBuffer.buffer,
    width: 800,
    height: 600,
    quality: 85,
  });

  res.set('Content-Type', 'image/webp');
  res.send(Buffer.from(result.processedBuffer));
});
```

---

## 7. クラスタリング — マルチコアの活用

`cluster` モジュールにより、複数のワーカープロセスを起動してCPUコアを最大活用できる。

```typescript
// src/cluster.ts
import cluster from 'cluster';
import * as os from 'os';
import * as process from 'process';

const NUM_WORKERS = os.cpus().length;

if (cluster.isPrimary) {
  console.log(`[Cluster] Primary ${process.pid} is running`);
  console.log(`[Cluster] Forking ${NUM_WORKERS} workers...`);

  for (let i = 0; i < NUM_WORKERS; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.warn(
      `[Cluster] Worker ${worker.process.pid} exited (code=${code}, signal=${signal}). Restarting...`,
    );
    cluster.fork(); // 自動再起動
  });

  cluster.on('online', (worker) => {
    console.log(`[Cluster] Worker ${worker.process.pid} is online`);
  });

  // ゼロダウンタイムリロード（SIGUSR2 シグナルで実行）
  process.on('SIGUSR2', () => {
    const workers = Object.values(cluster.workers ?? {});
    let i = 0;

    function restartNext(): void {
      const worker = workers[i++];
      if (!worker) return;

      worker.once('exit', () => {
        cluster.fork().once('listening', restartNext);
      });
      worker.kill();
    }

    restartNext();
  });
} else {
  // ワーカープロセスとして起動
  import('./server').then(({ startServer }) => {
    startServer();
    console.log(`[Cluster] Worker ${process.pid} started`);
  });
}
```

### PM2 による本番運用

PM2はNode.jsの本番運用で最も広く使われるプロセスマネージャーだ。

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'api-server',
      script: 'dist/server.js',
      instances: 'max',          // CPUコア数分起動
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',  // メモリ超過で自動再起動
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        UV_THREADPOOL_SIZE: 64,
      },
      // ゼロダウンタイムリロード設定
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
      // ログ設定
      log_file: '/var/log/pm2/api-combined.log',
      out_file: '/var/log/pm2/api-out.log',
      error_file: '/var/log/pm2/api-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
```

```bash
# 起動
pm2 start ecosystem.config.js

# ゼロダウンタイムリロード
pm2 reload api-server

# ステータス確認
pm2 status
pm2 monit

# ログ確認
pm2 logs api-server --lines 200
```

---

## 8. ストリーム最適化 — バックプレッシャーのハンドリング

大量のデータを処理する際は、ストリームを使ってメモリ効率を最大化する。バックプレッシャーを正しく実装しないと、メモリが溢れる。

```typescript
// src/streams/csv-processor.ts
import { Transform, TransformCallback } from 'stream';
import { pipeline } from 'stream/promises';
import * as fs from 'fs';
import * as zlib from 'zlib';
import { createReadStream } from 'fs';

interface CsvRow {
  [key: string]: string;
}

// バックプレッシャーを正しく扱う Transform ストリーム
class CsvParserTransform extends Transform {
  private buffer: string = '';
  private headers: string[] = [];
  private isFirstLine: boolean = true;

  constructor() {
    super({
      readableObjectMode: true,   // 出力はオブジェクト
      writableObjectMode: false,  // 入力はバイナリ
      highWaterMark: 64 * 1024,   // 64KB バッファ
    });
  }

  _transform(chunk: Buffer, _encoding: string, callback: TransformCallback): void {
    this.buffer += chunk.toString('utf8');
    const lines = this.buffer.split('\n');

    // 最後の不完全な行はバッファに残す
    this.buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (this.isFirstLine) {
        this.headers = trimmed.split(',').map(h => h.trim());
        this.isFirstLine = false;
        continue;
      }

      const values = trimmed.split(',');
      const row: CsvRow = {};
      this.headers.forEach((header, i) => {
        row[header] = values[i]?.trim() ?? '';
      });

      // push() が false を返したら、ダウンストリームが詰まっている
      if (!this.push(row)) {
        // バックプレッシャーシグナルを尊重（callback を後で呼ぶ）
        callback();
        return;
      }
    }

    callback();
  }

  _flush(callback: TransformCallback): void {
    if (this.buffer.trim()) {
      const values = this.buffer.trim().split(',');
      const row: CsvRow = {};
      this.headers.forEach((header, i) => {
        row[header] = values[i]?.trim() ?? '';
      });
      this.push(row);
    }
    callback();
  }
}

class RowValidatorTransform extends Transform {
  private validCount = 0;
  private invalidCount = 0;

  constructor(private requiredFields: string[]) {
    super({ objectMode: true });
  }

  _transform(row: CsvRow, _encoding: string, callback: TransformCallback): void {
    const isValid = this.requiredFields.every(field => row[field] !== undefined && row[field] !== '');

    if (isValid) {
      this.validCount++;
      this.push(row);
    } else {
      this.invalidCount++;
    }

    callback();
  }

  get stats() {
    return { valid: this.validCount, invalid: this.invalidCount };
  }
}

// pipeline を使えばバックプレッシャーとエラー処理を自動管理
export async function processCsvFile(
  inputPath: string,
  outputPath: string,
  requiredFields: string[],
): Promise<{ valid: number; invalid: number }> {
  const parser = new CsvParserTransform();
  const validator = new RowValidatorTransform(requiredFields);

  const jsonStringifier = new Transform({
    objectMode: true,
    transform(row, _enc, cb) {
      cb(null, JSON.stringify(row) + '\n');
    },
  });

  await pipeline(
    createReadStream(inputPath),
    zlib.createGunzip(),       // gzip 圧縮ファイルにも対応
    parser,
    validator,
    jsonStringifier,
    fs.createWriteStream(outputPath),
  );

  return validator.stats;
}
```

---

## 9. 接続プール最適化

### データベース接続プール

```typescript
// src/db/pool-config.ts
import { Pool, PoolConfig } from 'pg';

// PostgreSQL 接続プールの最適設定
const poolConfig: PoolConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // プールサイズ = (コア数 * 2) + 実効スピンドル数
  // PM2 クラスターの場合、ワーカー数で割る
  max: Math.max(2, Math.floor((os.cpus().length * 2 + 1) / NUM_WORKERS)),
  min: 2,

  idleTimeoutMillis: 30_000,       // 30秒アイドルで解放
  connectionTimeoutMillis: 5_000,  // 接続タイムアウト
  maxUses: 7500,                   // 一定回数使用後に接続を再作成（接続劣化対策）

  // Statement タイムアウト（長時間クエリを自動キャンセル）
  statement_timeout: 30_000,
  query_timeout: 30_000,
};

export const db = new Pool(poolConfig);

// プールヘルスモニタリング
setInterval(() => {
  console.log(JSON.stringify({
    event: 'pool_stats',
    total: db.totalCount,
    idle: db.idleCount,
    waiting: db.waitingCount,
  }));
}, 30_000);

db.on('error', (err) => {
  console.error('[DB Pool] Unexpected error on idle client:', err);
});
```

### HTTP Keep-Alive の最適化

```typescript
// src/http/agent-config.ts
import http from 'http';
import https from 'https';
import axios from 'axios';

// Keep-Alive エージェント設定
const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 60_000,    // Keep-Alive のタイムアウト
  maxSockets: 100,           // 最大同時ソケット数
  maxFreeSockets: 20,        // アイドル状態の最大ソケット数
  scheduling: 'lifo',        // LIFO でソケットを再利用（ウォームソケット優先）
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 60_000,
  maxSockets: 100,
  maxFreeSockets: 20,
  scheduling: 'lifo',
});

export const apiClient = axios.create({
  httpAgent,
  httpsAgent,
  timeout: 10_000,
  headers: {
    'Connection': 'keep-alive',
  },
});
```

---

## 10. キャッシュ戦略

### インプロセスキャッシュ + Redis の二層構造

```typescript
// src/cache/two-tier-cache.ts
import LRU from 'lru-cache';
import Redis from 'ioredis';

interface CacheOptions {
  l1MaxSize: number;     // L1 (インプロセス LRU) の最大エントリ数
  l1TtlMs: number;       // L1 TTL (ミリ秒)
  l2TtlSeconds: number;  // L2 (Redis) TTL (秒)
}

export class TwoTierCache<T> {
  private l1: LRU<string, T>;
  private l2: Redis;

  constructor(
    private readonly namespace: string,
    private readonly options: CacheOptions,
    redisClient: Redis,
  ) {
    this.l1 = new LRU<string, T>({
      max: options.l1MaxSize,
      ttl: options.l1TtlMs,
      allowStale: false,
      updateAgeOnGet: false,
    });
    this.l2 = redisClient;
  }

  private key(id: string): string {
    return `${this.namespace}:${id}`;
  }

  async get(id: string): Promise<T | null> {
    // L1 キャッシュを確認
    const l1Value = this.l1.get(id);
    if (l1Value !== undefined) {
      return l1Value;
    }

    // L2 (Redis) を確認
    const l2Raw = await this.l2.get(this.key(id));
    if (l2Raw) {
      const value = JSON.parse(l2Raw) as T;
      // L1 にもキャッシュ
      this.l1.set(id, value);
      return value;
    }

    return null;
  }

  async set(id: string, value: T): Promise<void> {
    this.l1.set(id, value);
    await this.l2.setex(
      this.key(id),
      this.options.l2TtlSeconds,
      JSON.stringify(value),
    );
  }

  async invalidate(id: string): Promise<void> {
    this.l1.delete(id);
    await this.l2.del(this.key(id));
  }

  async invalidatePattern(pattern: string): Promise<void> {
    // Redis SCAN で安全にパターン削除
    const fullPattern = `${this.namespace}:${pattern}`;
    let cursor = '0';

    do {
      const [nextCursor, keys] = await this.l2.scan(
        cursor, 'MATCH', fullPattern, 'COUNT', 100,
      );
      cursor = nextCursor;

      if (keys.length > 0) {
        await this.l2.del(...keys);
        keys.forEach(k => this.l1.delete(k.replace(`${this.namespace}:`, '')));
      }
    } while (cursor !== '0');
  }

  // Cache-Aside パターン（取得 or フェッチ&キャッシュ）
  async getOrFetch(id: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = await this.get(id);
    if (cached !== null) return cached;

    const fresh = await fetcher();
    await this.set(id, fresh);
    return fresh;
  }
}
```

---

## 11. N+1クエリ問題と DataLoader

GraphQL や RESTful API で最も頻出するパフォーマンス問題がN+1クエリだ。DataLoaderパターンで解決する。

```typescript
// src/dataloaders/user-loader.ts
import DataLoader from 'dataloader';
import { db } from '../db/pool-config';

interface User {
  id: number;
  name: string;
  email: string;
}

interface Post {
  id: number;
  title: string;
  authorId: number;
}

// バッチ関数: 複数の ID を一度のクエリで取得
const batchLoadUsers = async (ids: readonly number[]): Promise<(User | Error)[]> => {
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
  const { rows } = await db.query<User>(
    `SELECT id, name, email FROM users WHERE id = ANY(ARRAY[${placeholders}]::int[])`,
    [...ids],
  );

  // DataLoader は入力と同じ順序・数で結果を返す必要がある
  const userMap = new Map(rows.map(u => [u.id, u]));
  return ids.map(id => userMap.get(id) ?? new Error(`User ${id} not found`));
};

const batchLoadPostsByAuthor = async (
  authorIds: readonly number[],
): Promise<Post[][]> => {
  const { rows } = await db.query<Post>(
    `SELECT id, title, author_id as "authorId" 
     FROM posts 
     WHERE author_id = ANY($1::int[])
     ORDER BY created_at DESC`,
    [authorIds],
  );

  const postsByAuthor = new Map<number, Post[]>();
  authorIds.forEach(id => postsByAuthor.set(id, []));
  rows.forEach(post => {
    postsByAuthor.get(post.authorId)?.push(post);
  });

  return authorIds.map(id => postsByAuthor.get(id) ?? []);
};

// リクエストごとに新しい DataLoader インスタンスを作成（キャッシュはリクエストスコープ）
export function createDataLoaders() {
  return {
    userLoader: new DataLoader<number, User>(batchLoadUsers, {
      maxBatchSize: 100,
      cache: true,
    }),
    postsByAuthorLoader: new DataLoader<number, Post[]>(batchLoadPostsByAuthor, {
      maxBatchSize: 50,
      cache: true,
    }),
  };
}

// Express ミドルウェアでリクエストスコープの DataLoader を注入
app.use((req, _res, next) => {
  (req as any).loaders = createDataLoaders();
  next();
});
```

---

## 12. APM ツール — OpenTelemetry による計装

本番環境では APM (Application Performance Monitoring) ツールを導入して継続的な可視性を確保する。OpenTelemetry はベンダー中立の標準だ。

```typescript
// src/telemetry/setup.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

// アプリ起動前に初期化（require より前に実行）
export function setupTelemetry(): NodeSDK {
  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: process.env.SERVICE_NAME ?? 'api-server',
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version ?? '0.0.0',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV ?? 'development',
    }),

    traceExporter: new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318/v1/traces',
    }),

    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318/v1/metrics',
      }),
      exportIntervalMillis: 15_000,
    }),

    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-http': {
          ignoreIncomingRequestHook: (req) => {
            // ヘルスチェックはトレースしない
            return req.url === '/health' || req.url === '/metrics';
          },
        },
        '@opentelemetry/instrumentation-pg': { enhancedDatabaseReporting: true },
        '@opentelemetry/instrumentation-redis': {},
      }),
    ],
  });

  sdk.start();
  console.log('[Telemetry] OpenTelemetry SDK initialized');

  process.on('SIGTERM', () => {
    sdk.shutdown().then(() => console.log('[Telemetry] SDK shut down'));
  });

  return sdk;
}
```

```typescript
// src/telemetry/custom-spans.ts
import { trace, context, SpanStatusCode, Attributes } from '@opentelemetry/api';

const tracer = trace.getTracer('api-server');

// カスタムスパンでビジネスロジックを計装
export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: Attributes,
): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    if (attributes) span.setAttributes(attributes);

    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: err instanceof Error ? err.message : String(err),
      });
      span.recordException(err as Error);
      throw err;
    } finally {
      span.end();
    }
  });
}

// 使用例
app.get('/api/orders/:id', async (req, res) => {
  const order = await withSpan(
    'orders.fetchById',
    () => orderService.findById(req.params.id),
    { 'order.id': req.params.id, 'user.id': req.user?.id },
  );
  res.json(order);
});
```

---

## 13. 本番環境の設定最適化

### 環境変数チューニング

```bash
# UV_THREADPOOL_SIZE: libuv のスレッドプールサイズ
# デフォルトは 4。DNS・crypto・ファイルI/O で使用
# I/O 集約アプリは増やすと効果的（上限: 1024）
export UV_THREADPOOL_SIZE=64

# --max-old-space-size: V8 ヒープの最大サイズ（MB）
# コンテナメモリの 75% 程度に設定
export NODE_OPTIONS="--max-old-space-size=1536"

# GC ログの出力（本番デバッグ時のみ）
export NODE_OPTIONS="--max-old-space-size=1536 --expose-gc"
```

```typescript
// src/config/runtime-optimization.ts
import * as v8 from 'v8';

export function applyRuntimeOptimizations(): void {
  // ヒープ使用量が 85% を超えたら積極的にGCを実行
  const heapStats = v8.getHeapStatistics();
  const heapUsageRatio = heapStats.used_heap_size / heapStats.heap_size_limit;

  if (heapUsageRatio > 0.85 && typeof global.gc === 'function') {
    console.warn(`[Runtime] High heap usage (${(heapUsageRatio * 100).toFixed(1)}%). Forcing GC.`);
    global.gc();
  }

  // 未処理の Promise rejection を必ずキャッチ
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[Runtime] Unhandled Rejection at:', promise, 'reason:', reason);
    // 本番環境では process を終了させ、PM2 が再起動する
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });

  // OOM 直前にヒープダンプを取得
  process.on('exit', (code) => {
    if (code !== 0) {
      const stats = v8.getHeapStatistics();
      console.error('[Runtime] Process exiting with code:', code);
      console.error('[Runtime] Final heap stats:', JSON.stringify(stats));
    }
  });
}
```

### Docker コンテナでのチューニング

```dockerfile
# Dockerfile
FROM node:22-alpine AS production

WORKDIR /app

# dumb-init でシグナルを正しく処理
RUN apk add --no-cache dumb-init

COPY --chown=node:node dist/ ./dist/
COPY --chown=node:node node_modules/ ./node_modules/
COPY --chown=node:node package.json ./

USER node

# コンテナメモリ 2GB の場合: max-old-space-size を 1536MB に設定
ENV NODE_OPTIONS="--max-old-space-size=1536"
ENV UV_THREADPOOL_SIZE=64
ENV NODE_ENV=production

# dumb-init 経由で起動（PID 1 問題を回避）
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
```

### 設定チェックリスト

```typescript
// src/startup/preflight-check.ts
export async function preflightCheck(): Promise<void> {
  const checks: Array<{ name: string; check: () => boolean | Promise<boolean> }> = [
    {
      name: 'UV_THREADPOOL_SIZE is set',
      check: () => parseInt(process.env.UV_THREADPOOL_SIZE ?? '4') >= 16,
    },
    {
      name: 'max-old-space-size is configured',
      check: () => {
        const nodeOptions = process.env.NODE_OPTIONS ?? '';
        return nodeOptions.includes('--max-old-space-size');
      },
    },
    {
      name: 'Database pool is healthy',
      check: async () => {
        const client = await db.connect();
        await client.query('SELECT 1');
        client.release();
        return true;
      },
    },
    {
      name: 'Redis is reachable',
      check: async () => {
        const pong = await redis.ping();
        return pong === 'PONG';
      },
    },
  ];

  const results = await Promise.allSettled(
    checks.map(async ({ name, check }) => {
      const passed = await check();
      if (!passed) throw new Error(`Check failed: ${name}`);
      return name;
    }),
  );

  const failures = results.filter(r => r.status === 'rejected');
  if (failures.length > 0) {
    failures.forEach(f => {
      if (f.status === 'rejected') console.error('[Preflight]', f.reason);
    });
    if (process.env.NODE_ENV === 'production') {
      console.error('[Preflight] Aborting startup due to failures');
      process.exit(1);
    }
  }

  console.log('[Preflight] All checks passed');
}
```

---

## 14. まとめ — 最適化のロードマップ

Node.jsのパフォーマンス最適化は「計測 → 特定 → 改善 → 検証」のサイクルを繰り返すことが基本だ。闇雲に最適化するのではなく、まずプロファイラでボトルネックを特定することが重要となる。

### 優先度別アクションリスト

**即座に実施すべき設定（コストゼロ）:**
1. `UV_THREADPOOL_SIZE` を 64 以上に設定
2. `--max-old-space-size` をコンテナメモリの 75% に設定
3. HTTP エージェントに Keep-Alive を有効化
4. 未処理の Promise rejection ハンドラーを追加

**短期的な改善（1〜2スプリント）:**
5. clinic.js または 0x でフレームグラフを取得してホットパスを特定
6. N+1クエリを DataLoader でバッチ化
7. インプロセス LRU キャッシュを導入
8. イベントループラグの監視を追加

**中長期的な改善（アーキテクチャ変更を伴う）:**
9. CPU 集約タスクを Worker Threads に移行
10. PM2 クラスタリングでマルチコアを活用
11. ストリーム処理でメモリ効率を改善
12. OpenTelemetry で完全な可観測性を実現

---

## API レスポンスのデバッグに DevToolBox を活用

Node.jsの最適化作業では、APIレスポンスのJSONを素早く解析・整形するツールが不可欠だ。**[DevToolBox](https://usedevtools.com/)** には、開発者の日常作業を効率化するツール群が揃っている。

JSON Formatterは、axios や fetch で取得した生のAPIレスポンスを即座に整形・バリデーションできる。Node.jsのデバッグ中に `console.log(JSON.stringify(data, null, 2))` と書く手間が省け、ネストの深いオブジェクトも構造を一目で把握できる。また、Base64デコーダーはJWTトークンのペイロード確認に便利で、認証まわりのデバッグ効率が上がる。

ローカルで動作するため、本番データを外部サービスに貼り付けるセキュリティリスクがない点も、エンタープライズ開発での採用に適している。Node.jsの最適化サイクルにDevToolBoxを組み込むことで、計測・分析の速度をさらに上げられる。

---

Node.jsのパフォーマンス最適化は一度やれば終わりではなく、アプリケーションの成長に伴って継続的に取り組む必要がある。本記事で紹介したツールと手法を組み合わせ、計測に基づいた改善サイクルを構築してほしい。

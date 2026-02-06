---
title: 'Web Worker実践ガイド - ブラウザで並列処理を実現する'
description: 'Web Workerの基本から実践まで徹底解説。メッセージパッシング、SharedWorker、Service Workerとの違い、パフォーマンス改善の実例まで、フロントエンドの並列処理をマスター'
pubDate: 'Feb 05 2026'
---

# Web Worker実践ガイド

JavaScriptはシングルスレッドで動作しますが、Web Workerを使用することで別スレッドでコードを実行し、メインスレッドをブロックせずに重い処理を行えます。

本ガイドでは、Web Workerの基本から実践的な使い方まで、パフォーマンス改善の具体例とともに解説します。

## Web Workerとは

Web Workerは、Webアプリケーションでバックグラウンドスレッドを作成し、メインスレッドと並行して処理を実行できる機能です。

### 主な特徴

1. **別スレッドで実行** - UIをブロックしない
2. **メッセージベース通信** - 構造化クローンによるデータ転送
3. **制限された環境** - DOMアクセス不可
4. **独立したグローバルスコープ** - メインスレッドと分離

### Web Workerが適しているケース

```typescript
// ✅ Web Workerに適した処理
- 大量データの計算処理
- 画像・動画の処理
- データの暗号化・復号化
- 大きなファイルの解析
- リアルタイムデータの処理
- 複雑なアルゴリズムの実行

// ❌ Web Workerに不適切な処理
- DOM操作
- window, documentオブジェクトへのアクセス
- 小さく速い処理（オーバーヘッドが大きくなる）
- 頻繁なメインスレッドとの通信が必要な処理
```

## 基本的な使い方

### 1. シンプルなWorker作成

```javascript
// worker.js
self.addEventListener('message', (event) => {
  const result = event.data * 2
  self.postMessage(result)
})

// main.js
const worker = new Worker('worker.js')

worker.addEventListener('message', (event) => {
  console.log('結果:', event.data) // 20
})

worker.postMessage(10)
```

### 2. TypeScriptでのWorker

```typescript
// worker.ts
const ctx: Worker = self as any

ctx.addEventListener('message', (event: MessageEvent) => {
  const data: number = event.data
  const result = data * 2
  ctx.postMessage(result)
})

// main.ts
const worker = new Worker(new URL('./worker.ts', import.meta.url), {
  type: 'module'
})

worker.addEventListener('message', (event: MessageEvent<number>) => {
  console.log('結果:', event.data)
})

worker.postMessage(10)
```

### 3. 型安全なWorker通信

```typescript
// worker-types.ts
export interface WorkerRequest {
  type: 'calculate' | 'process' | 'transform'
  data: any
}

export interface WorkerResponse {
  type: 'success' | 'error'
  result?: any
  error?: string
}

// worker.ts
import { WorkerRequest, WorkerResponse } from './worker-types'

const ctx: Worker = self as any

ctx.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const { type, data } = event.data

  try {
    let result: any

    switch (type) {
      case 'calculate':
        result = performCalculation(data)
        break
      case 'process':
        result = processData(data)
        break
      case 'transform':
        result = transformData(data)
        break
      default:
        throw new Error(`Unknown type: ${type}`)
    }

    const response: WorkerResponse = {
      type: 'success',
      result
    }
    ctx.postMessage(response)
  } catch (error) {
    const response: WorkerResponse = {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
    ctx.postMessage(response)
  }
})

function performCalculation(data: number): number {
  return data * 2
}

function processData(data: any[]): any[] {
  return data.map(item => item * 2)
}

function transformData(data: string): string {
  return data.toUpperCase()
}

// main.ts
import { WorkerRequest, WorkerResponse } from './worker-types'

class TypedWorker {
  private worker: Worker

  constructor(workerUrl: string) {
    this.worker = new Worker(workerUrl, { type: 'module' })
  }

  async execute<T = any>(request: WorkerRequest): Promise<T> {
    return new Promise((resolve, reject) => {
      const handleMessage = (event: MessageEvent<WorkerResponse>) => {
        this.worker.removeEventListener('message', handleMessage)

        if (event.data.type === 'success') {
          resolve(event.data.result as T)
        } else {
          reject(new Error(event.data.error))
        }
      }

      this.worker.addEventListener('message', handleMessage)
      this.worker.postMessage(request)
    })
  }

  terminate() {
    this.worker.terminate()
  }
}

// 使用例
const worker = new TypedWorker(new URL('./worker.ts', import.meta.url).href)

try {
  const result = await worker.execute<number>({
    type: 'calculate',
    data: 10
  })
  console.log('計算結果:', result)
} catch (error) {
  console.error('エラー:', error)
}
```

## メッセージパッシング

### 1. 構造化クローン

```typescript
// worker.ts
const ctx: Worker = self as any

ctx.addEventListener('message', (event) => {
  const { type, payload } = event.data

  // 複雑なデータ構造も転送可能
  if (type === 'process') {
    const result = {
      processed: true,
      data: payload.data.map((item: any) => item * 2),
      timestamp: Date.now(),
      metadata: {
        version: '1.0',
        items: payload.data.length
      }
    }
    ctx.postMessage(result)
  }
})

// main.ts
const data = {
  type: 'process',
  payload: {
    data: [1, 2, 3, 4, 5],
    options: {
      multiply: true,
      filter: false
    }
  }
}

worker.postMessage(data)
```

### 2. Transferable Objects（転送可能オブジェクト）

大きなデータを効率的に転送:

```typescript
// メインスレッド
const buffer = new ArrayBuffer(1024 * 1024) // 1MB
const uint8Array = new Uint8Array(buffer)
// データを埋める
for (let i = 0; i < uint8Array.length; i++) {
  uint8Array[i] = i % 256
}

// 転送（コピーではなく所有権を移動）
worker.postMessage({ buffer }, [buffer])

// この時点でbufferは使用不可（所有権がworkerに移った）
console.log(buffer.byteLength) // 0

// worker.ts
const ctx: Worker = self as any

ctx.addEventListener('message', (event) => {
  const { buffer } = event.data
  const uint8Array = new Uint8Array(buffer)

  // 処理...
  const sum = uint8Array.reduce((acc, val) => acc + val, 0)

  // 結果と共にバッファを返す
  ctx.postMessage({ sum, buffer }, [buffer])
})
```

### 3. SharedArrayBuffer（共有メモリ）

```typescript
// メインスレッド
const sharedBuffer = new SharedArrayBuffer(1024)
const sharedArray = new Int32Array(sharedBuffer)

worker.postMessage({ sharedBuffer })

// Workerと同じメモリを参照
sharedArray[0] = 42

// worker.ts
const ctx: Worker = self as any

ctx.addEventListener('message', (event) => {
  const { sharedBuffer } = event.data
  const sharedArray = new Int32Array(sharedBuffer)

  // メインスレッドと同じメモリを参照
  console.log(sharedArray[0]) // 42

  // Atomics APIで安全に操作
  Atomics.add(sharedArray, 0, 1)
  Atomics.notify(sharedArray, 0)
})
```

## 実践例

### 1. 画像処理Worker

```typescript
// image-worker.ts
const ctx: Worker = self as any

interface ImageData {
  data: Uint8ClampedArray
  width: number
  height: number
}

interface ProcessRequest {
  type: 'grayscale' | 'blur' | 'brightness'
  imageData: ImageData
  options?: any
}

ctx.addEventListener('message', (event: MessageEvent<ProcessRequest>) => {
  const { type, imageData, options } = event.data

  try {
    let processed: ImageData

    switch (type) {
      case 'grayscale':
        processed = grayscale(imageData)
        break
      case 'blur':
        processed = blur(imageData, options?.radius || 1)
        break
      case 'brightness':
        processed = brightness(imageData, options?.factor || 1.2)
        break
      default:
        throw new Error(`Unknown filter: ${type}`)
    }

    ctx.postMessage({ success: true, imageData: processed }, [processed.data.buffer])
  } catch (error) {
    ctx.postMessage({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

function grayscale(imageData: ImageData): ImageData {
  const { data, width, height } = imageData
  const processed = new Uint8ClampedArray(data.length)

  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
    processed[i] = avg
    processed[i + 1] = avg
    processed[i + 2] = avg
    processed[i + 3] = data[i + 3]
  }

  return { data: processed, width, height }
}

function brightness(imageData: ImageData, factor: number): ImageData {
  const { data, width, height } = imageData
  const processed = new Uint8ClampedArray(data.length)

  for (let i = 0; i < data.length; i += 4) {
    processed[i] = Math.min(255, data[i] * factor)
    processed[i + 1] = Math.min(255, data[i + 1] * factor)
    processed[i + 2] = Math.min(255, data[i + 2] * factor)
    processed[i + 3] = data[i + 3]
  }

  return { data: processed, width, height }
}

function blur(imageData: ImageData, radius: number): ImageData {
  // シンプルなボックスブラー実装
  const { data, width, height } = imageData
  const processed = new Uint8ClampedArray(data.length)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, count = 0

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx
          const ny = y + dy

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const idx = (ny * width + nx) * 4
            r += data[idx]
            g += data[idx + 1]
            b += data[idx + 2]
            count++
          }
        }
      }

      const idx = (y * width + x) * 4
      processed[idx] = r / count
      processed[idx + 1] = g / count
      processed[idx + 2] = b / count
      processed[idx + 3] = data[idx + 3]
    }
  }

  return { data: processed, width, height }
}

// 使用例（React）
import { useRef, useEffect } from 'react'

export function ImageProcessor() {
  const workerRef = useRef<Worker>()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('./image-worker.ts', import.meta.url),
      { type: 'module' }
    )

    return () => workerRef.current?.terminate()
  }, [])

  const processImage = async (file: File, filter: string) => {
    const canvas = canvasRef.current
    if (!canvas || !workerRef.current) return

    const ctx = canvas.getContext('2d')!
    const img = await createImageBitmap(file)

    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    return new Promise((resolve, reject) => {
      const worker = workerRef.current!

      const handleMessage = (event: MessageEvent) => {
        worker.removeEventListener('message', handleMessage)

        if (event.data.success) {
          const processed = event.data.imageData
          const processedImageData = new ImageData(
            processed.data,
            processed.width,
            processed.height
          )
          ctx.putImageData(processedImageData, 0, 0)
          resolve(true)
        } else {
          reject(new Error(event.data.error))
        }
      }

      worker.addEventListener('message', handleMessage)
      worker.postMessage({
        type: filter,
        imageData: {
          data: imageData.data,
          width: imageData.width,
          height: imageData.height
        }
      }, [imageData.data.buffer])
    })
  }

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            processImage(file, 'grayscale')
          }
        }}
      />
      <canvas ref={canvasRef} />
    </div>
  )
}
```

### 2. データ処理Worker Pool

```typescript
// worker-pool.ts
export class WorkerPool {
  private workers: Worker[] = []
  private queue: Array<{
    data: any
    resolve: (value: any) => void
    reject: (error: any) => void
  }> = []
  private availableWorkers: Set<Worker> = new Set()

  constructor(
    private workerUrl: string,
    private poolSize: number = navigator.hardwareConcurrency || 4
  ) {
    this.initialize()
  }

  private initialize() {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(this.workerUrl, { type: 'module' })
      this.workers.push(worker)
      this.availableWorkers.add(worker)

      worker.addEventListener('message', (event) => {
        const { result, error } = event.data

        // Workerを再び利用可能にする
        this.availableWorkers.add(worker)

        // キューから次のタスクを取得
        const nextTask = this.queue.shift()
        if (nextTask) {
          this.executeTask(worker, nextTask.data, nextTask.resolve, nextTask.reject)
        }
      })
    }
  }

  async execute<T = any>(data: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const availableWorker = this.getAvailableWorker()

      if (availableWorker) {
        this.executeTask(availableWorker, data, resolve, reject)
      } else {
        // 利用可能なWorkerがない場合はキューに追加
        this.queue.push({ data, resolve, reject })
      }
    })
  }

  private getAvailableWorker(): Worker | null {
    const worker = this.availableWorkers.values().next().value
    if (worker) {
      this.availableWorkers.delete(worker)
      return worker
    }
    return null
  }

  private executeTask(
    worker: Worker,
    data: any,
    resolve: (value: any) => void,
    reject: (error: any) => void
  ) {
    const handleMessage = (event: MessageEvent) => {
      worker.removeEventListener('message', handleMessage)
      worker.removeEventListener('error', handleError)

      if (event.data.error) {
        reject(new Error(event.data.error))
      } else {
        resolve(event.data.result)
      }

      // Workerを再び利用可能にする
      this.availableWorkers.add(worker)

      // キューから次のタスクを実行
      const nextTask = this.queue.shift()
      if (nextTask) {
        this.executeTask(worker, nextTask.data, nextTask.resolve, nextTask.reject)
      }
    }

    const handleError = (error: ErrorEvent) => {
      worker.removeEventListener('message', handleMessage)
      worker.removeEventListener('error', handleError)
      reject(error)
      this.availableWorkers.add(worker)
    }

    worker.addEventListener('message', handleMessage)
    worker.addEventListener('error', handleError)
    worker.postMessage(data)
  }

  terminate() {
    this.workers.forEach(worker => worker.terminate())
    this.workers = []
    this.availableWorkers.clear()
    this.queue = []
  }
}

// 使用例
const pool = new WorkerPool(new URL('./data-worker.ts', import.meta.url).href, 4)

async function processLargeDataset(data: number[][]) {
  const promises = data.map(chunk => pool.execute(chunk))
  const results = await Promise.all(promises)
  return results.flat()
}

// 使用後
pool.terminate()
```

## SharedWorker vs Service Worker vs Web Worker

### Web Worker
```typescript
// 標準的なWorker
const worker = new Worker('worker.js')
worker.postMessage('hello')

// 特徴:
// - 作成したページ/タブ専用
// - 複数インスタンス可能
// - ページを閉じると終了
```

### SharedWorker
```typescript
// 複数のタブ/ウィンドウで共有
const worker = new SharedWorker('shared-worker.js')
worker.port.postMessage('hello')

// shared-worker.js
self.addEventListener('connect', (event) => {
  const port = event.ports[0]

  port.addEventListener('message', (e) => {
    console.log('Message from page:', e.data)
    port.postMessage('Hello back!')
  })

  port.start()
})

// 特徴:
// - 同じオリジンの複数ページで共有
// - すべてのページが閉じられるまで実行継続
// - リアルタイム通信に適している
```

### Service Worker
```typescript
// オフライン対応、プッシュ通知など
navigator.serviceWorker.register('/sw.js')

// sw.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then((cache) => {
      return cache.addAll(['/index.html', '/styles.css', '/app.js'])
    })
  )
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request)
    })
  )
})

// 特徴:
// - ネットワークリクエストを傍受
// - オフライン対応
// - プッシュ通知
// - バックグラウンド同期
```

## パフォーマンス改善の実例

### Before / After比較

```typescript
// Before: メインスレッドで処理（UIがブロックされる）
function processLargeArray(data: number[]) {
  const start = performance.now()

  const result = data.map(item => {
    // 重い計算
    return heavyCalculation(item)
  })

  const end = performance.now()
  console.log(`処理時間: ${end - start}ms`)
  // UI がフリーズする

  return result
}

// After: Workerで処理（UIは応答性を保つ）
async function processLargeArrayWithWorker(data: number[]) {
  const worker = new Worker(new URL('./calculator-worker.ts', import.meta.url))

  const result = await new Promise((resolve) => {
    worker.addEventListener('message', (event) => {
      resolve(event.data)
      worker.terminate()
    })

    worker.postMessage(data)
  })

  // UI は応答性を保つ
  return result
}

// calculator-worker.ts
const ctx: Worker = self as any

ctx.addEventListener('message', (event) => {
  const data: number[] = event.data
  const result = data.map(item => heavyCalculation(item))
  ctx.postMessage(result)
})

function heavyCalculation(n: number): number {
  // 重い計算のシミュレーション
  let result = 0
  for (let i = 0; i < 1000000; i++) {
    result += Math.sqrt(n * i)
  }
  return result
}
```

### 実測パフォーマンス

```typescript
// ベンチマークコード
async function benchmark() {
  const data = Array.from({ length: 10000 }, (_, i) => i)

  // メインスレッド
  console.time('Main Thread')
  const result1 = processLargeArray(data)
  console.timeEnd('Main Thread')
  // Main Thread: 2500ms (UI frozen)

  // Worker
  console.time('Web Worker')
  const result2 = await processLargeArrayWithWorker(data)
  console.timeEnd('Web Worker')
  // Web Worker: 2300ms (UI responsive)
}
```

## まとめ

Web Workerを効果的に使用することで:

1. **UIの応答性維持** - 重い処理でもスムーズな操作
2. **マルチコア活用** - CPUリソースの効率的利用
3. **ユーザー体験向上** - ストレスフリーなインタラクション

適切な場面でWeb Workerを活用し、モダンなWebアプリケーションのパフォーマンスを最大化しましょう。

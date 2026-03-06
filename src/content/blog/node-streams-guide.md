---
title: 'Node.js Streams完全ガイド: 大量データの効率的な処理パターン'
description: 'Node.js Streamsを使った大量データの効率的な処理方法を解説。Readable、Writable、Transform、Duplexストリームの実装から、エラーハンドリング、バックプレッシャー、パイプラインまで網羅します。実務で役立つポイントを厳選して解説。'
pubDate: '2025-09-03'
updatedDate: '2025-09-03'
tags: ['Node.js', 'Streams', 'Performance', 'Data Processing', 'Backend', 'プログラミング']
---
## はじめに

Node.js Streamsは、大量のデータを効率的に処理するための強力な抽象化です。ファイル全体をメモリに読み込むのではなく、小さなチャンクに分けて処理することで、メモリ効率を大幅に向上させます。

この記事では、Node.js Streamsの基礎から実践的な応用パターンまで、包括的に解説します。

## Streamsの基本概念

### なぜStreamsが必要か

通常のファイル読み込み:

```typescript
// ❌ メモリ非効率
import fs from 'fs/promises';

const data = await fs.readFile('huge-file.txt', 'utf-8');
console.log(data.length);
// 10GBのファイルだと、10GBのメモリを消費
```

Streamsを使った場合:

```typescript
// ✅ メモリ効率的
import fs from 'fs';

const stream = fs.createReadStream('huge-file.txt', 'utf-8');
let length = 0;

stream.on('data', (chunk) => {
  length += chunk.length;
});

stream.on('end', () => {
  console.log(length);
});
// 常に一定量のメモリしか消費しない
```

### Streamの種類

1. **Readable Stream**: データを読み取る（ファイル読み込み、HTTPリクエストボディなど）
2. **Writable Stream**: データを書き込む（ファイル書き込み、HTTPレスポンスなど）
3. **Duplex Stream**: 読み書き両方可能（TCP socket、WebSocketなど）
4. **Transform Stream**: データを変換（圧縮、暗号化、パースなど）

## Readable Stream

### ファイルからの読み込み

```typescript
// basic-readable.ts
import fs from 'fs';

const readableStream = fs.createReadStream('input.txt', {
  encoding: 'utf-8',
  highWaterMark: 16 * 1024, // 16KB チャンクサイズ
});

readableStream.on('data', (chunk) => {
  console.log(`Received ${chunk.length} bytes`);
  console.log(chunk);
});

readableStream.on('end', () => {
  console.log('Stream ended');
});

readableStream.on('error', (error) => {
  console.error('Stream error:', error);
});
```

### カスタムReadable Streamの作成

```typescript
// custom-readable.ts
import { Readable } from 'stream';

class NumberStream extends Readable {
  private current = 1;
  private max: number;

  constructor(max: number) {
    super();
    this.max = max;
  }

  _read() {
    if (this.current <= this.max) {
      // データをプッシュ
      this.push(`${this.current}\n`);
      this.current++;
    } else {
      // ストリーム終了
      this.push(null);
    }
  }
}

// 使用例
const numberStream = new NumberStream(100);
numberStream.pipe(process.stdout);
```

### 非同期イテレータとしての使用

```typescript
// async-iterator.ts
import fs from 'fs';

async function processFile() {
  const stream = fs.createReadStream('data.txt', 'utf-8');

  for await (const chunk of stream) {
    console.log(chunk);
    // 非同期処理も可能
    await processChunk(chunk);
  }
}

async function processChunk(chunk: string) {
  // データ処理
  return new Promise((resolve) => setTimeout(resolve, 100));
}

processFile();
```

## Writable Stream

### ファイルへの書き込み

```typescript
// basic-writable.ts
import fs from 'fs';

const writableStream = fs.createWriteStream('output.txt', {
  encoding: 'utf-8',
});

writableStream.write('Hello, ');
writableStream.write('World!\n');

writableStream.end('Goodbye!', () => {
  console.log('Write completed');
});

writableStream.on('error', (error) => {
  console.error('Write error:', error);
});
```

### カスタムWritable Streamの作成

```typescript
// custom-writable.ts
import { Writable } from 'stream';

class ConsoleStream extends Writable {
  _write(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ) {
    console.log(`[LOG] ${chunk.toString()}`);
    callback();
  }

  _final(callback: (error?: Error | null) => void) {
    console.log('[LOG] Stream ended');
    callback();
  }
}

// 使用例
const consoleStream = new ConsoleStream();
consoleStream.write('Line 1\n');
consoleStream.write('Line 2\n');
consoleStream.end('Line 3\n');
```

### バックプレッシャーの処理

```typescript
// backpressure.ts
import fs from 'fs';

const readable = fs.createReadStream('large-input.txt');
const writable = fs.createWriteStream('output.txt');

readable.on('data', (chunk) => {
  const canContinue = writable.write(chunk);

  if (!canContinue) {
    // バックプレッシャー: 読み込みを一時停止
    console.log('Pausing read due to backpressure');
    readable.pause();
  }
});

writable.on('drain', () => {
  // バッファが空いたら再開
  console.log('Resuming read');
  readable.resume();
});

readable.on('end', () => {
  writable.end();
});
```

## Transform Stream

### カスタムTransform Streamの作成

```typescript
// custom-transform.ts
import { Transform } from 'stream';

class UpperCaseTransform extends Transform {
  _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: (error?: Error | null, data?: any) => void
  ) {
    const upperCased = chunk.toString().toUpperCase();
    this.push(upperCased);
    callback();
  }
}

// 使用例
const upperCase = new UpperCaseTransform();

process.stdin.pipe(upperCase).pipe(process.stdout);
```

### JSONパーサー Transform Stream

```typescript
// json-parser-transform.ts
import { Transform } from 'stream';

class JSONLineParser extends Transform {
  constructor() {
    super({ objectMode: true });
  }

  _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: (error?: Error | null, data?: any) => void
  ) {
    const lines = chunk.toString().split('\n');

    for (const line of lines) {
      if (line.trim()) {
        try {
          const obj = JSON.parse(line);
          this.push(obj);
        } catch (error) {
          console.error('JSON parse error:', error);
        }
      }
    }

    callback();
  }
}

// 使用例
import fs from 'fs';

const readStream = fs.createReadStream('data.jsonl');
const parser = new JSONLineParser();

parser.on('data', (obj) => {
  console.log('Parsed object:', obj);
});

readStream.pipe(parser);
```

### CSVパーサー

```typescript
// csv-parser.ts
import { Transform } from 'stream';

interface CSVRow {
  [key: string]: string;
}

class CSVParser extends Transform {
  private headers: string[] | null = null;
  private buffer = '';

  constructor() {
    super({ objectMode: true });
  }

  _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: (error?: Error | null, data?: any) => void
  ) {
    this.buffer += chunk.toString();
    const lines = this.buffer.split('\n');

    // 最後の行は不完全かもしれないので残しておく
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      const values = line.split(',').map((v) => v.trim());

      if (!this.headers) {
        // 最初の行はヘッダー
        this.headers = values;
      } else {
        // データ行をオブジェクトに変換
        const row: CSVRow = {};
        this.headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        this.push(row);
      }
    }

    callback();
  }

  _flush(callback: (error?: Error | null, data?: any) => void) {
    // 最後の行を処理
    if (this.buffer.trim() && this.headers) {
      const values = this.buffer.split(',').map((v) => v.trim());
      const row: CSVRow = {};
      this.headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      this.push(row);
    }
    callback();
  }
}

// 使用例
import fs from 'fs';

const csvStream = fs.createReadStream('data.csv');
const parser = new CSVParser();

parser.on('data', (row: CSVRow) => {
  console.log(row);
});

csvStream.pipe(parser);
```

## Pipeline: Streamの組み合わせ

### stream.pipelineの使用

```typescript
// pipeline.ts
import { pipeline } from 'stream/promises';
import fs from 'fs';
import { createGzip } from 'zlib';

async function compressFile() {
  try {
    await pipeline(
      fs.createReadStream('input.txt'),
      createGzip(),
      fs.createWriteStream('input.txt.gz')
    );
    console.log('Compression completed');
  } catch (error) {
    console.error('Pipeline failed:', error);
  }
}

compressFile();
```

### 複数のTransformの連結

```typescript
// multi-transform-pipeline.ts
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';
import fs from 'fs';

// Transform 1: 行番号を追加
class AddLineNumbers extends Transform {
  private lineNumber = 1;

  _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: (error?: Error | null, data?: any) => void
  ) {
    const lines = chunk.toString().split('\n');
    const numbered = lines.map((line) => {
      if (line.trim()) {
        return `${this.lineNumber++}: ${line}`;
      }
      return line;
    });
    this.push(numbered.join('\n'));
    callback();
  }
}

// Transform 2: 大文字に変換
class ToUpperCase extends Transform {
  _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: (error?: Error | null, data?: any) => void
  ) {
    this.push(chunk.toString().toUpperCase());
    callback();
  }
}

// パイプライン
async function processFile() {
  await pipeline(
    fs.createReadStream('input.txt'),
    new AddLineNumbers(),
    new ToUpperCase(),
    fs.createWriteStream('output.txt')
  );
}

processFile();
```

## 実践的なユースケース

### 大きなファイルの行ごと処理

```typescript
// process-lines.ts
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

async function processLargeFile(filePath: string) {
  const fileStream = createReadStream(filePath);
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let lineNumber = 0;

  for await (const line of rl) {
    lineNumber++;

    // 行ごとに処理
    if (line.includes('ERROR')) {
      console.log(`Error found on line ${lineNumber}: ${line}`);
    }
  }

  console.log(`Processed ${lineNumber} lines`);
}

processLargeFile('app.log');
```

### HTTPストリーミングレスポンス

```typescript
// http-streaming.ts
import http from 'http';
import fs from 'fs';

const server = http.createServer((req, res) => {
  if (req.url === '/download') {
    const filePath = 'large-file.zip';

    // ファイルサイズを取得
    const stat = fs.statSync(filePath);

    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Length': stat.size,
      'Content-Disposition': 'attachment; filename="large-file.zip"',
    });

    // ファイルをストリーム
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Stream error:', error);
      res.statusCode = 500;
      res.end('Internal Server Error');
    });
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### データベースからのストリーミング

```typescript
// db-streaming.ts
import { Readable } from 'stream';
import { prisma } from './db';

class DatabaseReadStream extends Readable {
  private skip = 0;
  private batchSize = 100;
  private tableName: string;

  constructor(tableName: string, batchSize = 100) {
    super({ objectMode: true });
    this.tableName = tableName;
    this.batchSize = batchSize;
  }

  async _read() {
    try {
      const records = await (prisma as any)[this.tableName].findMany({
        skip: this.skip,
        take: this.batchSize,
      });

      if (records.length === 0) {
        // データがなくなったらストリーム終了
        this.push(null);
        return;
      }

      // レコードを1つずつプッシュ
      records.forEach((record: any) => this.push(record));

      this.skip += records.length;
    } catch (error) {
      this.destroy(error as Error);
    }
  }
}

// 使用例
async function exportUsers() {
  const userStream = new DatabaseReadStream('user');
  const writeStream = fs.createWriteStream('users.jsonl');

  for await (const user of userStream) {
    writeStream.write(JSON.stringify(user) + '\n');
  }

  writeStream.end();
  console.log('Export completed');
}

exportUsers();
```

### ファイルアップロードの処理

```typescript
// upload-handler.ts
import { IncomingMessage } from 'http';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createHash } from 'crypto';
import { Transform } from 'stream';

class HashTransform extends Transform {
  private hash = createHash('sha256');

  _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: (error?: Error | null, data?: any) => void
  ) {
    this.hash.update(chunk);
    this.push(chunk);
    callback();
  }

  getHash(): string {
    return this.hash.digest('hex');
  }
}

async function handleUpload(req: IncomingMessage, uploadPath: string) {
  const hashTransform = new HashTransform();

  try {
    await pipeline(req, hashTransform, createWriteStream(uploadPath));

    const fileHash = hashTransform.getHash();
    console.log(`File uploaded successfully. SHA256: ${fileHash}`);

    return { success: true, hash: fileHash };
  } catch (error) {
    console.error('Upload failed:', error);
    return { success: false, error };
  }
}
```

### リアルタイムログ処理

```typescript
// log-processor.ts
import { Transform } from 'stream';
import WebSocket from 'ws';

class LogAnalyzer extends Transform {
  private errorCount = 0;
  private warningCount = 0;

  constructor(private ws: WebSocket) {
    super();
  }

  _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: (error?: Error | null, data?: any) => void
  ) {
    const line = chunk.toString();

    if (line.includes('ERROR')) {
      this.errorCount++;
      this.ws.send(
        JSON.stringify({
          type: 'error',
          message: line,
          count: this.errorCount,
        })
      );
    } else if (line.includes('WARNING')) {
      this.warningCount++;
      this.ws.send(
        JSON.stringify({
          type: 'warning',
          message: line,
          count: this.warningCount,
        })
      );
    }

    this.push(chunk);
    callback();
  }

  _flush(callback: (error?: Error | null, data?: any) => void) {
    this.ws.send(
      JSON.stringify({
        type: 'summary',
        errors: this.errorCount,
        warnings: this.warningCount,
      })
    );
    callback();
  }
}

// WebSocketサーバー
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  const logStream = fs.createReadStream('/var/log/app.log');
  const analyzer = new LogAnalyzer(ws);

  logStream.pipe(analyzer);
});
```

## エラーハンドリング

### エラーの適切な処理

```typescript
// error-handling.ts
import { pipeline } from 'stream/promises';
import fs from 'fs';
import { Transform } from 'stream';

class SafeTransform extends Transform {
  _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: (error?: Error | null, data?: any) => void
  ) {
    try {
      // 処理
      const result = processChunk(chunk);
      this.push(result);
      callback();
    } catch (error) {
      // エラーをコールバックに渡す
      callback(error as Error);
    }
  }
}

async function safeProcessing() {
  try {
    await pipeline(
      fs.createReadStream('input.txt'),
      new SafeTransform(),
      fs.createWriteStream('output.txt')
    );
    console.log('Processing completed');
  } catch (error) {
    console.error('Processing failed:', error);
    // クリーンアップ処理
    await fs.promises.unlink('output.txt').catch(() => {});
  }
}
```

## パフォーマンス最適化

### highWaterMarkの調整

```typescript
// optimize-chunk-size.ts
import fs from 'fs';

// デフォルト: 64KB
const defaultStream = fs.createReadStream('file.txt');

// 大きなチャンク: 1MB（大きなファイルに適している）
const largeChunkStream = fs.createReadStream('large-file.txt', {
  highWaterMark: 1024 * 1024,
});

// 小さなチャンク: 4KB（リアルタイム処理に適している）
const smallChunkStream = fs.createReadStream('realtime.log', {
  highWaterMark: 4 * 1024,
});
```

### オブジェクトモード

```typescript
// object-mode.ts
import { Transform } from 'stream';

class ObjectTransform extends Transform {
  constructor() {
    super({ objectMode: true });
  }

  _transform(
    obj: any,
    encoding: BufferEncoding,
    callback: (error?: Error | null, data?: any) => void
  ) {
    // オブジェクトを直接扱える
    this.push({ ...obj, processed: true, timestamp: Date.now() });
    callback();
  }
}
```

## まとめ

Node.js Streamsは、大量データの効率的な処理に不可欠なツールです。メモリ効率、バックプレッシャー、エラーハンドリング、そしてパイプラインを理解することで、スケーラブルなアプリケーションを構築できます。

主なポイント:

- Streamsはメモリ効率的なデータ処理を実現
- 4種類のStream（Readable、Writable、Duplex、Transform）を理解する
- `pipeline`を使った安全なStream処理
- バックプレッシャーの適切な処理
- カスタムStreamで柔軟な処理を実装

ファイル処理、HTTPストリーミング、データベース操作など、様々な場面でStreamsを活用することで、パフォーマンスとスケーラビリティを向上させることができます。

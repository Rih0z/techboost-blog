---
title: 'Node.js 22新機能完全ガイド - ネイティブfetch、Webストリーム、テストランナー改善'
description: 'Node.js 22の新機能を徹底解説。ネイティブfetchの安定化、Webストリーム対応、テストランナー改善、パーミッションモデル、V8最適化などを実例コード付きで紹介します。'
pubDate: '2026-02-05'
tags: ['Node.js', 'JavaScript', 'Backend']
heroImage: '../../assets/thumbnails/node-22-features-guide.jpg'
---

Node.js 22は2024年4月にリリースされ、多くの画期的な機能が安定版として提供されました。本記事では、Node.js 22で追加・改善された主要機能を実践的なコード例とともに解説します。

## 目次

1. ネイティブfetchの安定化
2. Webストリームの完全サポート
3. テストランナーの大幅改善
4. パーミッションモデル
5. V8エンジン12.4へのアップデート
6. require(ESM)のサポート
7. その他の改善点

## 1. ネイティブfetchの安定化

Node.js 18で実験的に導入されたネイティブfetch APIが、Node.js 22でついに安定版となりました。もう外部パッケージ（node-fetch、axios）は不要です。

### 基本的な使い方

```javascript
// GET リクエスト
const response = await fetch('https://api.example.com/users');
const users = await response.json();
console.log(users);

// POST リクエスト
const newUser = {
  name: 'Alice',
  email: 'alice@example.com'
};

const postResponse = await fetch('https://api.example.com/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(newUser)
});

const createdUser = await postResponse.json();
console.log(createdUser);
```

### エラーハンドリング

```javascript
async function fetchUserData(userId) {
  try {
    const response = await fetch(`https://api.example.com/users/${userId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const user = await response.json();
    return user;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error('ネットワークエラー:', error);
    } else {
      console.error('予期しないエラー:', error);
    }
    throw error;
  }
}
```

### タイムアウトの実装

```javascript
async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`リクエストが${timeout}msでタイムアウトしました`);
    }
    throw error;
  }
}

// 使用例
try {
  const response = await fetchWithTimeout('https://api.example.com/slow-endpoint', {}, 3000);
  const data = await response.json();
  console.log(data);
} catch (error) {
  console.error(error.message);
}
```

### 並列リクエスト

```javascript
async function fetchMultipleUsers(userIds) {
  const promises = userIds.map(id =>
    fetch(`https://api.example.com/users/${id}`)
      .then(res => res.json())
  );

  const users = await Promise.all(promises);
  return users;
}

// 使用例
const userIds = [1, 2, 3, 4, 5];
const users = await fetchMultipleUsers(userIds);
console.log(users);
```

### FormDataとファイルアップロード

```javascript
import { readFile } from 'node:fs/promises';

async function uploadFile(filePath) {
  const fileBuffer = await readFile(filePath);
  const blob = new Blob([fileBuffer]);

  const formData = new FormData();
  formData.append('file', blob, 'image.png');
  formData.append('description', 'My uploaded file');

  const response = await fetch('https://api.example.com/upload', {
    method: 'POST',
    body: formData
  });

  return response.json();
}
```

## 2. Webストリームの完全サポート

Node.js 22では、Web Streams API（ReadableStream、WritableStream、TransformStream）が完全にサポートされ、ブラウザとの互換性が大幅に向上しました。

### ReadableStreamの基本

```javascript
// カスタムReadableStreamの作成
const stream = new ReadableStream({
  start(controller) {
    controller.enqueue('Hello ');
    controller.enqueue('World!');
    controller.close();
  }
});

// ストリームの読み取り
const reader = stream.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log(value);
}
```

### fetchとストリーミング

```javascript
async function streamLargeFile(url) {
  const response = await fetch(url);
  const reader = response.body.getReader();

  let receivedLength = 0;
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    chunks.push(value);
    receivedLength += value.length;

    console.log(`受信済み: ${receivedLength} バイト`);
  }

  // すべてのチャンクを結合
  const chunksAll = new Uint8Array(receivedLength);
  let position = 0;
  for (const chunk of chunks) {
    chunksAll.set(chunk, position);
    position += chunk.length;
  }

  return chunksAll;
}
```

### TransformStreamでデータ変換

```javascript
// テキストを大文字に変換するTransformStream
const uppercaseStream = new TransformStream({
  transform(chunk, controller) {
    controller.enqueue(chunk.toString().toUpperCase());
  }
});

// 使用例
const readableStream = new ReadableStream({
  start(controller) {
    controller.enqueue('hello ');
    controller.enqueue('world');
    controller.close();
  }
});

const transformedStream = readableStream.pipeThrough(uppercaseStream);
const reader = transformedStream.getReader();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log(value); // "HELLO ", "WORLD"
}
```

### Node.jsストリームとの相互変換

```javascript
import { Readable, Writable } from 'node:stream';

// ReadableStreamからNode.js Readableへ
function webToNodeStream(webStream) {
  return Readable.fromWeb(webStream);
}

// Node.js ReadableからReadableStreamへ
function nodeToWebStream(nodeStream) {
  return Readable.toWeb(nodeStream);
}

// 使用例
import { createReadStream } from 'node:fs';

const nodeStream = createReadStream('./large-file.txt');
const webStream = Readable.toWeb(nodeStream);

// fetchのbodyとして使用可能
const response = await fetch('https://api.example.com/upload', {
  method: 'POST',
  body: webStream,
  duplex: 'half'
});
```

### SSE（Server-Sent Events）の実装

```javascript
import { createServer } from 'node:http';

createServer((req, res) => {
  if (req.url === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // ReadableStreamを使ったSSE
    const stream = new ReadableStream({
      start(controller) {
        let counter = 0;

        const interval = setInterval(() => {
          const data = `data: ${JSON.stringify({ count: counter++ })}\n\n`;
          controller.enqueue(new TextEncoder().encode(data));

          if (counter > 10) {
            clearInterval(interval);
            controller.close();
          }
        }, 1000);
      }
    });

    // Web StreamをNode.jsストリームに変換してレスポンスにパイプ
    const nodeStream = Readable.fromWeb(stream);
    nodeStream.pipe(res);
  }
}).listen(3000);
```

## 3. テストランナーの大幅改善

Node.js 20で導入されたテストランナーが、Node.js 22でさらに強化されました。

### 基本的なテスト

```javascript
// test.js
import { test, describe, it } from 'node:test';
import assert from 'node:assert';

describe('数学関数のテスト', () => {
  it('足し算が正しく動作する', () => {
    assert.strictEqual(1 + 1, 2);
  });

  it('引き算が正しく動作する', () => {
    assert.strictEqual(5 - 3, 2);
  });
});

// または test() を直接使用
test('配列のテスト', (t) => {
  const arr = [1, 2, 3];
  assert.strictEqual(arr.length, 3);
  assert.deepStrictEqual(arr, [1, 2, 3]);
});
```

### 非同期テスト

```javascript
import { test } from 'node:test';
import assert from 'node:assert';

test('非同期処理のテスト', async () => {
  const result = await Promise.resolve(42);
  assert.strictEqual(result, 42);
});

test('fetchのテスト', async () => {
  const response = await fetch('https://api.example.com/data');
  const data = await response.json();

  assert.ok(response.ok);
  assert.strictEqual(typeof data, 'object');
});
```

### モックとスパイ

```javascript
import { test, mock } from 'node:test';
import assert from 'node:assert';

test('モック関数のテスト', () => {
  const mockFn = mock.fn((x, y) => x + y);

  const result = mockFn(2, 3);

  assert.strictEqual(result, 5);
  assert.strictEqual(mockFn.mock.calls.length, 1);
  assert.deepStrictEqual(mockFn.mock.calls[0].arguments, [2, 3]);
});

test('メソッドのモック', () => {
  const obj = {
    method: (x) => x * 2
  };

  const mockMethod = mock.method(obj, 'method', (x) => x * 3);

  assert.strictEqual(obj.method(5), 15);
  assert.strictEqual(mockMethod.mock.calls.length, 1);

  // モックを復元
  mockMethod.mock.restore();
  assert.strictEqual(obj.method(5), 10);
});
```

### カバレッジレポート

```bash
# カバレッジ付きでテスト実行
node --test --experimental-test-coverage

# 特定のファイルのみ
node --test --experimental-test-coverage src/**/*.test.js
```

### スナップショットテスト

```javascript
import { test } from 'node:test';
import assert from 'node:assert';

test('スナップショットテスト', (t) => {
  const data = {
    name: 'John',
    age: 30,
    hobbies: ['reading', 'coding']
  };

  // スナップショットと比較
  t.assert.snapshot(data);
});
```

### テストのフィルタリング

```javascript
// only を使って特定のテストのみ実行
test('このテストは実行される', { only: true }, () => {
  // テストコード
});

test('このテストはスキップされる', () => {
  // テストコード
});

// skip を使ってテストをスキップ
test('このテストはスキップされる', { skip: true }, () => {
  // テストコード
});

// 条件付きスキップ
test('条件付きスキップ', { skip: process.platform === 'win32' }, () => {
  // Windowsでは実行されない
});
```

### カスタムレポーター

```javascript
// custom-reporter.js
export default class CustomReporter {
  constructor() {
    this.tests = [];
  }

  report(event) {
    if (event.type === 'test:pass') {
      console.log(`✓ ${event.data.name}`);
    } else if (event.type === 'test:fail') {
      console.log(`✗ ${event.data.name}`);
      console.error(event.data.error);
    }
  }
}
```

```bash
# カスタムレポーターを使用
node --test --test-reporter=./custom-reporter.js
```

## 4. パーミッションモデル

Node.js 22では、Denoのようなパーミッションモデルが実験的に導入されました。

### 基本的な使い方

```bash
# ファイルシステムへの読み取りアクセスを制限
node --experimental-permission --allow-fs-read=/path/to/allowed app.js

# ファイルシステムへの書き込みアクセスを制限
node --experimental-permission --allow-fs-write=/path/to/allowed app.js

# 子プロセスの実行を制限
node --experimental-permission --allow-child-process app.js

# ネットワークアクセスを制限
node --experimental-permission --allow-worker app.js
```

### パーミッションのチェック

```javascript
// パーミッションがあるかチェック
import { permission } from 'node:process';

console.log(permission.has('fs.read', '/etc/passwd')); // false
console.log(permission.has('fs.read', '/allowed/path')); // true

// すべてのパーミッションをチェック
console.log(permission.has('fs')); // undefined (一部のみ許可)
```

### セキュリティのベストプラクティス

```javascript
// セキュアなファイル操作
import { readFile } from 'node:fs/promises';
import { permission } from 'node:process';

async function secureReadFile(path) {
  if (!permission.has('fs.read', path)) {
    throw new Error(`ファイル ${path} への読み取り権限がありません`);
  }

  return readFile(path, 'utf-8');
}

// 使用例
try {
  const content = await secureReadFile('/allowed/path/file.txt');
  console.log(content);
} catch (error) {
  console.error(error.message);
}
```

## 5. V8エンジン12.4へのアップデート

Node.js 22にはV8エンジン12.4が搭載され、多くのパフォーマンス改善と新しいJavaScript機能が利用可能になりました。

### Array.prototype.group（Stage 3）

```javascript
const inventory = [
  { type: 'fruit', name: 'apple' },
  { type: 'vegetable', name: 'carrot' },
  { type: 'fruit', name: 'banana' },
  { type: 'vegetable', name: 'broccoli' }
];

// カテゴリごとにグループ化
const grouped = Object.groupBy(inventory, item => item.type);

console.log(grouped);
// {
//   fruit: [
//     { type: 'fruit', name: 'apple' },
//     { type: 'fruit', name: 'banana' }
//   ],
//   vegetable: [
//     { type: 'vegetable', name: 'carrot' },
//     { type: 'vegetable', name: 'broccoli' }
//   ]
// }
```

### Promise.withResolvers

```javascript
// 従来の方法
let resolve, reject;
const promise = new Promise((res, rej) => {
  resolve = res;
  reject = rej;
});

// 新しい方法
const { promise, resolve, reject } = Promise.withResolvers();

// 使用例
setTimeout(() => resolve('完了'), 1000);
const result = await promise;
console.log(result);
```

### String.prototype.isWellFormed

```javascript
// 正しいUnicode文字列かチェック
const validString = 'Hello, World!';
const invalidString = 'Hello\uD800World'; // 不完全なサロゲートペア

console.log(validString.isWellFormed()); // true
console.log(invalidString.isWellFormed()); // false

// 正しい文字列に変換
console.log(invalidString.toWellFormed()); // "Hello�World"
```

### ArrayBuffer.prototype.transfer

```javascript
// ArrayBufferの所有権を移動
const buffer1 = new ArrayBuffer(8);
const view1 = new Uint8Array(buffer1);
view1[0] = 42;

// 所有権を移動（元のbufferは使用不可に）
const buffer2 = buffer1.transfer();
const view2 = new Uint8Array(buffer2);

console.log(view2[0]); // 42
console.log(buffer1.byteLength); // 0 (detached)
```

## 6. require(ESM)のサポート

Node.js 22では、CommonJSからESモジュールを直接requireできるようになりました（実験的機能）。

### 基本的な使い方

```javascript
// CommonJS側 (app.cjs)
const esmModule = require('./esm-module.mjs');
console.log(esmModule.default);
console.log(esmModule.namedExport);
```

```javascript
// ESモジュール側 (esm-module.mjs)
export default function() {
  return 'デフォルトエクスポート';
}

export const namedExport = '名前付きエクスポート';
```

### 注意点

```javascript
// トップレベルawaitを使っているESMはrequireできない
// esm-with-await.mjs
const data = await fetch('https://api.example.com/data');
export default data;

// これはエラーになる
// const module = require('./esm-with-await.mjs'); // Error!
```

## 7. その他の改善点

### glob と globSync

```javascript
import { glob, globSync } from 'node:fs';

// 非同期版
for await (const file of glob('**/*.js')) {
  console.log(file);
}

// 同期版
const files = globSync('src/**/*.{js,ts}');
console.log(files);

// オプション付き
const testFiles = globSync('**/*.test.js', {
  ignore: ['node_modules/**', 'dist/**']
});
```

### WebSocket の改善

```javascript
// Node.js 22では実験的なWebSocketサポートが改善
const ws = new WebSocket('wss://echo.websocket.org');

ws.addEventListener('open', () => {
  console.log('接続しました');
  ws.send('Hello Server!');
});

ws.addEventListener('message', (event) => {
  console.log('受信:', event.data);
});

ws.addEventListener('error', (error) => {
  console.error('エラー:', error);
});

ws.addEventListener('close', () => {
  console.log('接続を閉じました');
});
```

### watch モードの改善

```bash
# ファイル変更を監視して自動再起動
node --watch app.js

# 特定のファイルを監視対象から除外
node --watch --watch-path=./src app.js
```

## パフォーマンス比較

### fetch vs axios

```javascript
import { performance } from 'node:perf_hooks';

// ネイティブfetchのベンチマーク
async function benchmarkFetch(iterations = 100) {
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    await fetch('https://api.example.com/data');
  }

  const end = performance.now();
  return end - start;
}

const fetchTime = await benchmarkFetch();
console.log(`fetch: ${fetchTime}ms`);

// 結果: Node.js 22のネイティブfetchは外部ライブラリと同等以上のパフォーマンス
```

## マイグレーションガイド

### node-fetchからの移行

```javascript
// Before (node-fetch)
import fetch from 'node-fetch';

const response = await fetch('https://api.example.com/data');
const data = await response.json();

// After (Node.js 22)
// import文を削除するだけ
const response = await fetch('https://api.example.com/data');
const data = await response.json();
```

### axiosからの移行

```javascript
// Before (axios)
import axios from 'axios';

const { data } = await axios.get('https://api.example.com/data', {
  headers: { 'Authorization': 'Bearer token' }
});

// After (Node.js 22)
const response = await fetch('https://api.example.com/data', {
  headers: { 'Authorization': 'Bearer token' }
});
const data = await response.json();
```

## ベストプラクティス

### 1. エラーハンドリング

```javascript
async function robustFetch(url, options = {}) {
  const maxRetries = 3;
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error;

      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  throw lastError;
}
```

### 2. リソース管理

```javascript
// ストリームの適切なクリーンアップ
async function processStream(url) {
  const response = await fetch(url);
  const reader = response.body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // 処理
      processChunk(value);
    }
  } finally {
    reader.releaseLock();
  }
}
```

### 3. テストの組織化

```javascript
// tests/unit/math.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { add, subtract } from '../../src/math.js';

describe('Math Module', () => {
  describe('add()', () => {
    it('正の数を足す', () => {
      assert.strictEqual(add(2, 3), 5);
    });

    it('負の数を足す', () => {
      assert.strictEqual(add(-2, -3), -5);
    });
  });

  describe('subtract()', () => {
    it('正の数を引く', () => {
      assert.strictEqual(subtract(5, 3), 2);
    });
  });
});
```

## まとめ

Node.js 22は、以下の点で大きな進化を遂げました。

1. **ネイティブfetchの安定化**: 外部ライブラリ不要でモダンなHTTPクライアント機能を提供
2. **Webストリーム対応**: ブラウザとの互換性が向上し、コードの共有が容易に
3. **テストランナー改善**: 外部テストフレームワークなしで本格的なテストが可能
4. **パーミッションモデル**: セキュリティ強化のための新しいアプローチ
5. **V8更新**: 最新のJavaScript機能とパフォーマンス改善

これらの機能により、Node.jsはよりモダンで、セキュアで、開発者フレンドリーなランタイムへと進化しました。既存のプロジェクトをNode.js 22にアップグレードする価値は十分にあります。

## 参考リンク

- [Node.js 22 リリースノート](https://nodejs.org/en/blog/release/v22.0.0)
- [Node.js ドキュメント](https://nodejs.org/docs/latest-v22.x/api/)
- [Web Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API)
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)

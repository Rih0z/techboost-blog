---
title: "Server-Sent Events (SSE) 実践ガイド - リアルタイム通信の最適解"
description: "Server-Sent Events（SSE）の基礎から実践まで徹底解説。WebSocketとの比較、Node.js/Next.js実装、エラーハンドリング、実運用のベストプラクティスを網羅。"
pubDate: "2025-02-05"
category: "Web Development"
tags: ["SSE", "Server-Sent Events", "Real-time", "Node.js", "Next.js"]
---

## はじめに

Server-Sent Events（SSE）は、サーバーからクライアントへの一方向リアルタイム通信を実現するWeb標準技術です。WebSocketより軽量で、多くのユースケースで最適な選択肢となります。

### SSEとは

```
特徴:
✅ サーバー→クライアントの一方向通信
✅ HTTP/HTTPSで動作
✅ 自動再接続機能
✅ テキストベース（UTF-8）
✅ ブラウザ標準API（EventSource）
✅ シンプルな実装
```

### WebSocketとの比較

| 項目 | SSE | WebSocket |
|---|---|---|
| **通信方向** | 一方向（S→C） | 双方向 |
| **プロトコル** | HTTP/HTTPS | WS/WSS |
| **再接続** | 自動 | 手動実装必要 |
| **実装** | 簡単 | 複雑 |
| **データ形式** | テキスト | バイナリ可 |
| **ブラウザ対応** | 標準 | 標準 |
| **ファイアウォール** | 通りやすい | 制限される場合あり |

### 適したユースケース

```
SSEに適している:
✅ ニュースフィード
✅ 株価・為替レート更新
✅ 通知システム
✅ ログストリーミング
✅ プログレスバー
✅ チャット（受信のみ）
✅ ダッシュボードメトリクス

WebSocketに適している:
❌ チャット（送受信）
❌ オンラインゲーム
❌ リアルタイム協同編集
❌ ビデオ通話
❌ バイナリデータ転送
```

## 基本的な実装

### クライアント側（ブラウザ）

```html
<!DOCTYPE html>
<html>
<head>
  <title>SSE Demo</title>
</head>
<body>
  <div id="messages"></div>

  <script>
    // EventSourceインスタンス作成
    const eventSource = new EventSource('/api/events');

    // メッセージ受信
    eventSource.onmessage = (event) => {
      const message = event.data;
      console.log('Received:', message);

      // DOM更新
      const div = document.getElementById('messages');
      div.innerHTML += `<p>${message}</p>`;
    };

    // 接続成功
    eventSource.onopen = () => {
      console.log('Connection opened');
    };

    // エラー発生
    eventSource.onerror = (error) => {
      console.error('Error:', error);
    };

    // 接続クローズ
    // eventSource.close();
  </script>
</body>
</html>
```

### サーバー側（Node.js + Express）

```javascript
// server.js
const express = require('express');
const app = express();

app.get('/api/events', (req, res) => {
  // SSE用のヘッダー設定
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // CORS対応（必要に応じて）
  res.setHeader('Access-Control-Allow-Origin', '*');

  // メッセージ送信
  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // 初回メッセージ
  sendEvent({ message: 'Connected to SSE' });

  // 定期的にメッセージ送信（例: 1秒ごと）
  const intervalId = setInterval(() => {
    const now = new Date().toISOString();
    sendEvent({ time: now });
  }, 1000);

  // クライアント切断時のクリーンアップ
  req.on('close', () => {
    clearInterval(intervalId);
    console.log('Client disconnected');
  });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

## SSEメッセージフォーマット

### 基本形式

```
data: メッセージ本文\n\n
```

### フィールド

```javascript
// data: メッセージ本文
res.write('data: Hello World\n\n');

// event: カスタムイベント名
res.write('event: notification\n');
res.write('data: New notification\n\n');

// id: イベントID（Last-Event-IDヘッダーで再接続時に使用）
res.write('id: 123\n');
res.write('data: Message with ID\n\n');

// retry: 再接続間隔（ミリ秒）
res.write('retry: 5000\n\n');

// コメント（無視される）
res.write(': This is a comment\n\n');
```

### 複数行データ

```javascript
// 複数行のデータ
res.write('data: Line 1\n');
res.write('data: Line 2\n');
res.write('data: Line 3\n\n');

// JSONデータ
const data = { user: 'Alice', message: 'Hello' };
res.write(`data: ${JSON.stringify(data)}\n\n`);
```

## React/Next.js実装

### カスタムフック（useSSE）

```typescript
// hooks/useSSE.ts
import { useEffect, useState } from 'react';

interface UseSSEOptions {
  url: string;
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
}

export function useSSE({ url, onMessage, onError }: UseSSEOptions) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<Event | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  useEffect(() => {
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      setStatus('connected');
    };

    eventSource.onmessage = (event) => {
      const parsedData = JSON.parse(event.data);
      setData(parsedData);
      onMessage?.(parsedData);
    };

    eventSource.onerror = (error) => {
      setStatus('error');
      setError(error);
      onError?.(error);
    };

    // クリーンアップ
    return () => {
      eventSource.close();
    };
  }, [url]);

  return { data, error, status };
}
```

### コンポーネントでの使用

```tsx
// components/LiveFeed.tsx
'use client';

import { useSSE } from '@/hooks/useSSE';

export function LiveFeed() {
  const { data, status } = useSSE({
    url: '/api/events',
    onMessage: (data) => {
      console.log('New data:', data);
    },
  });

  if (status === 'connecting') {
    return <div>Connecting...</div>;
  }

  if (status === 'error') {
    return <div>Connection error</div>;
  }

  return (
    <div>
      <h2>Live Feed</h2>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
```

### Next.js App Router API Route

```typescript
// app/api/events/route.ts
export const dynamic = 'force-dynamic';

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // メッセージ送信ヘルパー
      const sendEvent = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      // 初回メッセージ
      sendEvent({ message: 'Connected', timestamp: Date.now() });

      // 定期的に送信
      const intervalId = setInterval(() => {
        sendEvent({
          time: new Date().toISOString(),
          random: Math.random(),
        });
      }, 1000);

      // クリーンアップ
      return () => {
        clearInterval(intervalId);
      };
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

## 実践的なパターン

### パターン1: ニュースフィード

```typescript
// app/api/news/route.ts
export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // ニュース取得（例: データベース、外部API）
      const sendNews = async () => {
        const news = await fetchLatestNews();
        const message = `data: ${JSON.stringify(news)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      // 初回送信
      sendNews();

      // 30秒ごとに更新
      const intervalId = setInterval(sendNews, 30000);

      return () => clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

```tsx
// components/NewsFeed.tsx
'use client';

import { useSSE } from '@/hooks/useSSE';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  timestamp: string;
}

export function NewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([]);

  useSSE({
    url: '/api/news',
    onMessage: (data) => {
      setNews((prev) => [data, ...prev].slice(0, 10)); // 最新10件
    },
  });

  return (
    <div>
      <h2>Latest News</h2>
      {news.map((item) => (
        <div key={item.id}>
          <h3>{item.title}</h3>
          <p>{item.content}</p>
          <small>{new Date(item.timestamp).toLocaleString()}</small>
        </div>
      ))}
    </div>
  );
}
```

### パターン2: プログレスバー

```typescript
// app/api/progress/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const checkProgress = async () => {
        const progress = await getTaskProgress(taskId);

        const message = `data: ${JSON.stringify(progress)}\n\n`;
        controller.enqueue(encoder.encode(message));

        // 完了したら終了
        if (progress.status === 'completed') {
          controller.close();
        }
      };

      // 1秒ごとにチェック
      const intervalId = setInterval(checkProgress, 1000);

      return () => clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

```tsx
// components/ProgressBar.tsx
'use client';

export function ProgressBar({ taskId }: { taskId: string }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'pending' | 'running' | 'completed'>('pending');

  useSSE({
    url: `/api/progress?taskId=${taskId}`,
    onMessage: (data) => {
      setProgress(data.progress);
      setStatus(data.status);
    },
  });

  return (
    <div>
      <div style={{ width: '100%', backgroundColor: '#eee' }}>
        <div
          style={{
            width: `${progress}%`,
            backgroundColor: 'blue',
            height: '20px',
          }}
        />
      </div>
      <p>{progress}% - {status}</p>
    </div>
  );
}
```

### パターン3: ログストリーミング

```typescript
// app/api/logs/route.ts
import { spawn } from 'child_process';

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // ログファイルをtailで監視
      const tail = spawn('tail', ['-f', '/var/log/app.log']);

      tail.stdout.on('data', (data) => {
        const log = data.toString();
        const message = `data: ${JSON.stringify({ log })}\n\n`;
        controller.enqueue(encoder.encode(message));
      });

      tail.on('error', (error) => {
        console.error('Error:', error);
        controller.error(error);
      });

      return () => {
        tail.kill();
      };
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### パターン4: 通知システム

```typescript
// app/api/notifications/route.ts
export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // データベースから未読通知を監視
      const checkNotifications = async () => {
        const notifications = await getUnreadNotifications(userId);

        if (notifications.length > 0) {
          const message = `data: ${JSON.stringify(notifications)}\n\n`;
          controller.enqueue(encoder.encode(message));
        }
      };

      // 5秒ごとにチェック
      const intervalId = setInterval(checkNotifications, 5000);

      return () => clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

## エラーハンドリング

### クライアント側

```typescript
// hooks/useSSE.ts（改良版）
export function useSSE({ url, onMessage, onError, maxRetries = 3 }: UseSSEOptions) {
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const eventSource = new EventSource(url);

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);

      if (retryCount < maxRetries) {
        setRetryCount((prev) => prev + 1);
        onError?.(error);
      } else {
        eventSource.close();
        console.error('Max retries reached');
      }
    };

    // ...
  }, [url, retryCount]);
}
```

### サーバー側

```typescript
// app/api/events/route.ts
export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      try {
        // ...
      } catch (error) {
        console.error('Server error:', error);

        // エラーメッセージを送信
        const message = `data: ${JSON.stringify({ error: 'Server error' })}\n\n`;
        controller.enqueue(encoder.encode(message));

        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

## カスタムイベント

### サーバー側

```typescript
// app/api/events/route.ts
export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // カスタムイベント送信
      const sendCustomEvent = (eventName: string, data: any) => {
        const message = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      sendCustomEvent('notification', { message: 'New notification' });
      sendCustomEvent('update', { status: 'Updated' });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### クライアント側

```typescript
const eventSource = new EventSource('/api/events');

// 特定のイベントをリッスン
eventSource.addEventListener('notification', (event) => {
  const data = JSON.parse(event.data);
  console.log('Notification:', data);
});

eventSource.addEventListener('update', (event) => {
  const data = JSON.parse(event.data);
  console.log('Update:', data);
});
```

## パフォーマンス最適化

### 1. ハートビート

```typescript
// サーバー側
const intervalId = setInterval(() => {
  // コメント（ハートビート）を送信
  controller.enqueue(encoder.encode(':\n\n'));
}, 30000); // 30秒ごと
```

### 2. バッチ送信

```typescript
// 複数のメッセージをバッチで送信
const batch = [
  { id: 1, message: 'Message 1' },
  { id: 2, message: 'Message 2' },
  { id: 3, message: 'Message 3' },
];

const message = `data: ${JSON.stringify(batch)}\n\n`;
controller.enqueue(encoder.encode(message));
```

### 3. 圧縮

```typescript
// 圧縮を有効化（Expressの場合）
import compression from 'compression';

app.use(compression());
```

## まとめ

### SSEの強み

1. **シンプル**: HTTP/HTTPSで動作
2. **自動再接続**: ブラウザが自動処理
3. **軽量**: WebSocketより低オーバーヘッド
4. **標準**: ブラウザネイティブサポート

### ベストプラクティス

- 一方向通信には必ずSSE
- エラーハンドリングを実装
- ハートビートで接続維持
- 適切なリトライ間隔設定

### いつSSEを使うべきか

- サーバー→クライアントのみ
- リアルタイム更新が必要
- シンプルな実装を優先
- ファイアウォール対応が必要

### 次のステップ

- MDN: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- Spec: https://html.spec.whatwg.org/multipage/server-sent-events.html

SSEで、シンプルかつ強力なリアルタイム通信を実現しましょう。

---
title: "PWA開発ガイド2026年版 — Service WorkerからWeb Push通知まで"
description: "Progressive Web Appの最新開発手法を解説。Workbox活用、Web Push API、Background Sync、ファイルシステムアクセス、インストール体験の最適化まで実践的にガイドします。2026年最新の情報を反映しています。"
pubDate: "2026-02-05"
tags: ["PWA", "Service Worker", "Web Push", "Workbox", "オフライン", "プログラミング"]
heroImage: '../../assets/thumbnails/progressive-web-app-2026.jpg'
---
Progressive Web App（PWA）は、ネイティブアプリのような体験をWebで実現する技術です。この記事では、2026年時点の最新PWA開発手法を実践的に解説します。

## PWAとは

PWAは、以下の特徴を持つWebアプリケーションです。

- **インストール可能**: ホーム画面に追加できる
- **オフライン対応**: ネットワークなしでも動作
- **プッシュ通知**: ユーザーエンゲージメント向上
- **高速**: キャッシュによる即座のロード
- **セキュア**: HTTPS必須

## マニフェストファイル

PWAの基本設定を記述します。

```json
{
  "name": "My Awesome App",
  "short_name": "MyApp",
  "description": "An awesome Progressive Web App",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#4F46E5",
  "background_color": "#FFFFFF",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/home.png",
      "sizes": "540x720",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ],
  "shortcuts": [
    {
      "name": "New Post",
      "url": "/new",
      "icons": [{ "src": "/icons/new.png", "sizes": "96x96" }]
    }
  ]
}
```

HTMLでの読み込み:

```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#4F46E5">
<link rel="apple-touch-icon" href="/icons/icon-192.png">
```

## Service Workerの基本

Service Workerは、ブラウザとネットワークの間に位置するプロキシです。

### 登録

```typescript
// app.ts
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration.scope);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });
}
```

### 基本的なService Worker

```typescript
// sw.js
const CACHE_NAME = 'my-app-v1';
const URLS_TO_CACHE = [
  '/',
  '/styles.css',
  '/script.js',
  '/offline.html',
];

// インストール
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting(); // 即座に有効化
});

// アクティベート
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim(); // 即座に制御
});

// フェッチ
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

## Workboxによる高度なキャッシング

Workboxは、Service Workerの開発を簡単にするライブラリです。

### インストール

```bash
npm install workbox-webpack-plugin
```

### Webpack設定

```javascript
// webpack.config.js
const WorkboxPlugin = require('workbox-webpack-plugin');

module.exports = {
  // ...
  plugins: [
    new WorkboxPlugin.GenerateSW({
      clientsClaim: true,
      skipWaiting: true,
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/api\.example\.com/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 5 * 60, // 5分
            },
          },
        },
        {
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'image-cache',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 30 * 24 * 60 * 60, // 30日
            },
          },
        },
      ],
    }),
  ],
};
```

### キャッシング戦略

#### Cache First（キャッシュ優先）

画像や静的アセットに適しています。

```typescript
import { CacheFirst } from 'workbox-strategies';
import { registerRoute } from 'workbox-routing';

registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      {
        cacheWillUpdate: async ({ response }) => {
          return response.status === 200 ? response : null;
        },
      },
    ],
  })
);
```

#### Network First（ネットワーク優先）

APIリクエストに適しています。

```typescript
import { NetworkFirst } from 'workbox-strategies';

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api',
    networkTimeoutSeconds: 5,
  })
);
```

#### Stale While Revalidate

頻繁に更新されるコンテンツに適しています。

```typescript
import { StaleWhileRevalidate } from 'workbox-strategies';

registerRoute(
  ({ request }) => request.destination === 'script',
  new StaleWhileRevalidate({
    cacheName: 'scripts',
  })
);
```

## オフライン対応

ネットワークエラー時にオフラインページを表示します。

```typescript
import { setCatchHandler } from 'workbox-routing';

setCatchHandler(async ({ event }) => {
  if (event.request.destination === 'document') {
    return caches.match('/offline.html');
  }
  return Response.error();
});
```

## Web Push通知

プッシュ通知でユーザーエンゲージメントを向上させます。

### 購読

```typescript
async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
  });

  // サーバーに送信
  await fetch('/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
```

### 通知受信

```typescript
// sw.js
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    data: { url: data.url },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
```

### サーバー側（Node.js）

```typescript
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  PUBLIC_VAPID_KEY,
  PRIVATE_VAPID_KEY
);

async function sendNotification(subscription: PushSubscription, payload: any) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (error) {
    console.error('Push notification failed:', error);
  }
}
```

## Background Sync

オフライン時のリクエストを自動再送信します。

```typescript
// Service Worker
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { registerRoute } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';

const bgSyncPlugin = new BackgroundSyncPlugin('postQueue', {
  maxRetentionTime: 24 * 60, // 24時間
});

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/posts'),
  new NetworkOnly({
    plugins: [bgSyncPlugin],
  }),
  'POST'
);
```

クライアント側:

```typescript
async function createPost(data: PostData) {
  try {
    await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (error) {
    // Service Workerがバックグラウンドで再送信
    console.log('Request queued for background sync');
  }
}
```

## File System Access API

ローカルファイルへのアクセスを可能にします。

```typescript
async function saveFile(content: string) {
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: 'document.txt',
      types: [{
        description: 'Text Files',
        accept: { 'text/plain': ['.txt'] },
      }],
    });

    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  } catch (error) {
    console.error('Save failed:', error);
  }
}

async function openFile() {
  const [handle] = await window.showOpenFilePicker();
  const file = await handle.getFile();
  const content = await file.text();
  return content;
}
```

## インストールプロンプト

カスタムインストールUIを作成します。

```typescript
let deferredPrompt: any;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // カスタムボタンを表示
  document.getElementById('install-button')?.classList.remove('hidden');
});

document.getElementById('install-button')?.addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User ${outcome} the install prompt`);
    deferredPrompt = null;
  }
});
```

## パフォーマンス最適化

### プリキャッシュ

重要なアセットを事前にキャッシュします。

```typescript
import { precacheAndRoute } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST);
```

### ナビゲーションプリロード

Service Worker起動中のネットワークリクエストを並列化します。

```typescript
addEventListener('activate', (event) => {
  event.waitUntil(self.registration.navigationPreload.enable());
});

addEventListener('fetch', (event) => {
  event.respondWith(async function() {
    const response = await event.preloadResponse;
    if (response) return response;
    return fetch(event.request);
  }());
});
```

## まとめ

PWAは、ネイティブアプリに近い体験をWebで実現できる強力な技術です。

**主な機能:**
- Service Workerによるオフライン対応
- Workboxによる高度なキャッシング
- Web Push通知
- Background Sync
- File System Access

適切に実装すれば、ユーザーエクスペリエンスを大幅に向上させることができます。

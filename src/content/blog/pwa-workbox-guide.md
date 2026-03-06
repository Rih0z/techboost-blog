---
title: "PWA + Workbox実践ガイド：Service Workerを活用したオフライン対応"
description: "WorkboxライブラリでPWA開発を効率化する方法を解説。Service Workerによるキャッシュ戦略、オフライン対応、プッシュ通知の実装まで実践的に学びます。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。"
pubDate: "2025-02-06"
tags: ["PWA", "Workbox", "Service Worker", "Web", "Offline", "プログラミング"]
---
# PWA + Workbox実践ガイド：Service Workerを活用したオフライン対応

Progressive Web Apps（PWA）は、Webアプリにネイティブアプリのような体験をもたらす技術です。その核となる**Service Worker**の実装を簡単にするのが**Workbox**です。本記事では、Workboxを使ったPWA開発の実践的なテクニックを解説します。

## Workboxとは

WorkboxはGoogleが開発するService Workerライブラリ群です。複雑なキャッシュ戦略やオフライン対応を、シンプルなAPIで実装できます。

### 主な特徴

- **キャッシュ戦略**: 定義済みの最適化されたパターン
- **ルーティング**: URLパターンベースのリクエスト処理
- **プリキャッシング**: ビルド時のアセット事前キャッシュ
- **バックグラウンド同期**: オフライン時のリクエスト保存
- **プッシュ通知**: Webプッシュの実装支援
- **開発ツール**: デバッグとロギング

### Service Workerの基本

Service Workerは、Webページとは独立して動作するスクリプトで、以下を可能にします：

- ネットワークリクエストのインターセプト
- キャッシュの管理
- バックグラウンド処理
- プッシュ通知の受信

## セットアップ

### インストール

```bash
# npm
npm install workbox-cli --save-dev
npm install workbox-window

# pnpm
pnpm add -D workbox-cli
pnpm add workbox-window

# Workbox CLI確認
npx workbox --version
```

### Webpackプロジェクトの場合

```bash
npm install workbox-webpack-plugin --save-dev
```

`webpack.config.js`:

```javascript
const WorkboxPlugin = require('workbox-webpack-plugin');

module.exports = {
  // 既存の設定...
  plugins: [
    new WorkboxPlugin.GenerateSW({
      clientsClaim: true,
      skipWaiting: true,
      runtimeCaching: [
        {
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'images',
            expiration: {
              maxEntries: 60,
              maxAgeSeconds: 30 * 24 * 60 * 60, // 30日
            },
          },
        },
      ],
    }),
  ],
};
```

### Viteプロジェクトの場合

```bash
npm install vite-plugin-pwa --save-dev
```

`vite.config.js`:

```javascript
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'My PWA App',
        short_name: 'PWA App',
        description: 'My Progressive Web App',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.example\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60, // 1時間
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
});
```

## Service Workerの登録

### アプリケーション側での登録

`src/main.js`:

```javascript
import { Workbox } from 'workbox-window';

if ('serviceWorker' in navigator) {
  const wb = new Workbox('/sw.js');

  // Service Workerの更新検知
  wb.addEventListener('waiting', (event) => {
    console.log('新しいService Workerが利用可能です');
    
    // ユーザーに更新を促す
    if (confirm('新しいバージョンがあります。更新しますか？')) {
      wb.addEventListener('controlling', (event) => {
        window.location.reload();
      });
      
      // 待機中のService Workerをアクティブ化
      wb.messageSkipWaiting();
    }
  });

  // Service Workerがアクティブ化された時
  wb.addEventListener('activated', (event) => {
    console.log('Service Workerがアクティブ化されました');
    
    // 初回インストール時でなければリロード
    if (!event.isUpdate) {
      console.log('Service Workerが初めてインストールされました');
    }
  });

  // 登録
  wb.register()
    .then((registration) => {
      console.log('Service Worker登録成功:', registration);
    })
    .catch((error) => {
      console.error('Service Worker登録失敗:', error);
    });
}
```

### Service Worker本体

`public/sw.js`:

```javascript
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// ビルド時に生成されたアセットをプリキャッシュ
precacheAndRoute(self.__WB_MANIFEST);

// Google Fontsのキャッシュ
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-stylesheets',
  })
);

registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1年
        maxEntries: 30,
      }),
    ],
  })
);

// 画像のキャッシュ
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30日
      }),
    ],
  })
);

// APIリクエストのキャッシュ
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60, // 1時間
      }),
    ],
  })
);
```

## キャッシュ戦略

Workboxは5つの主要なキャッシュ戦略を提供します。

### 1. Cache First（キャッシュ優先）

キャッシュから取得し、なければネットワークから取得。画像やフォントに最適。

```javascript
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'image-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7日
      }),
    ],
  })
);
```

### 2. Network First（ネットワーク優先）

ネットワークから取得し、失敗したらキャッシュから。APIリクエストに最適。

```javascript
import { NetworkFirst } from 'workbox-strategies';

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 3, // 3秒でタイムアウト
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5分
      }),
    ],
  })
);
```

### 3. Stale While Revalidate（キャッシュ即返し＋バックグラウンド更新）

キャッシュをすぐ返しつつ、バックグラウンドで更新。CSS/JSに最適。

```javascript
import { StaleWhileRevalidate } from 'workbox-strategies';

registerRoute(
  ({ request }) => 
    request.destination === 'script' || 
    request.destination === 'style',
  new StaleWhileRevalidate({
    cacheName: 'static-resources',
  })
);
```

### 4. Network Only（ネットワークのみ）

常にネットワークから取得。キャッシュ不可なリクエストに使用。

```javascript
import { NetworkOnly } from 'workbox-strategies';

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/auth/'),
  new NetworkOnly()
);
```

### 5. Cache Only（キャッシュのみ）

常にキャッシュから取得。プリキャッシュされたアセット向け。

```javascript
import { CacheOnly } from 'workbox-strategies';

registerRoute(
  ({ url }) => url.pathname === '/offline.html',
  new CacheOnly({
    cacheName: 'offline-page',
  })
);
```

## プリキャッシング

### ビルド時のプリキャッシュ

`workbox-config.js`:

```javascript
module.exports = {
  globDirectory: 'dist/',
  globPatterns: [
    '**/*.{html,js,css,png,jpg,svg,woff2}',
  ],
  swDest: 'dist/sw.js',
  swSrc: 'src/sw.js',
  // リビジョン計算に含めないファイル
  dontCacheBustURLsMatching: /\.[0-9a-f]{8}\./,
  // 最大ファイルサイズ（2MB）
  maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
};
```

生成:

```bash
npx workbox generateSW workbox-config.js
# または
npx workbox injectManifest workbox-config.js
```

### 動的なプリキャッシュ

```javascript
import { precacheAndRoute } from 'workbox-precaching';

// ビルド時に自動生成されるマニフェスト
precacheAndRoute(self.__WB_MANIFEST);

// 追加のURLを動的にプリキャッシュ
precacheAndRoute([
  { url: '/offline.html', revision: '1' },
  { url: '/fallback-image.png', revision: '1' },
]);
```

## オフライン対応

### オフラインフォールバック

```javascript
import { setCatchHandler } from 'workbox-routing';
import { matchPrecache } from 'workbox-precaching';

// 全てのルートに対するフォールバック
setCatchHandler(async ({ event }) => {
  switch (event.request.destination) {
    case 'document':
      // HTMLページのフォールバック
      return matchPrecache('/offline.html');
    
    case 'image':
      // 画像のフォールバック
      return matchPrecache('/fallback-image.png');
    
    default:
      // その他は失敗を返す
      return Response.error();
  }
});
```

`public/offline.html`:

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>オフライン</title>
  <style>
    body {
      font-family: sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    h1 {
      color: #333;
    }
    p {
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>オフラインです</h1>
    <p>インターネット接続を確認してください</p>
    <button onclick="window.location.reload()">再試行</button>
  </div>
</body>
</html>
```

### バックグラウンド同期

```javascript
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { registerRoute } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';

const bgSyncPlugin = new BackgroundSyncPlugin('apiQueue', {
  maxRetentionTime: 24 * 60, // 24時間リトライ
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request);
        console.log('バックグラウンド同期成功:', entry.request.url);
      } catch (error) {
        console.error('バックグラウンド同期失敗:', error);
        // 失敗したらキューに戻す
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
  },
});

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkOnly({
    plugins: [bgSyncPlugin],
  }),
  'POST'
);
```

クライアント側:

```javascript
// オフライン時のPOSTリクエスト
async function saveData(data) {
  try {
    const response = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (response.ok) {
      console.log('保存成功');
    }
  } catch (error) {
    console.log('オフライン時はバックグラウンド同期に追加されます');
  }
}
```

## プッシュ通知

### Service Workerでの通知受信

```javascript
// sw.js
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url,
      dateOfArrival: Date.now(),
    },
    actions: [
      {
        action: 'open',
        title: '開く',
      },
      {
        action: 'close',
        title: '閉じる',
      },
    ],
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
```

### クライアント側での購読

```javascript
// main.js
async function subscribeToPushNotifications() {
  if (!('Notification' in window)) {
    console.log('このブラウザはプッシュ通知に対応していません');
    return;
  }
  
  // 権限リクエスト
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.log('通知が許可されませんでした');
    return;
  }
  
  // Service Worker登録を取得
  const registration = await navigator.serviceWorker.ready;
  
  // プッシュ購読
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
  });
  
  // サーバーに購読情報を送信
  await fetch('/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });
  
  console.log('プッシュ通知を購読しました');
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
```

## マニフェストファイル

`public/manifest.json`:

```json
{
  "name": "My Progressive Web App",
  "short_name": "My PWA",
  "description": "A Progressive Web App built with Workbox",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3f51b5",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "categories": ["productivity", "utilities"],
  "screenshots": [
    {
      "src": "/screenshot1.png",
      "sizes": "540x720",
      "type": "image/png"
    }
  ]
}
```

HTMLでのリンク:

```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#3f51b5">
<link rel="apple-touch-icon" href="/icon-192x192.png">
```

## デバッグとテスト

### Chrome DevToolsでのデバッグ

1. **Application タブ > Service Workers**: 登録状態の確認
2. **Cache Storage**: キャッシュの内容確認
3. **オフラインモード**: ネットワークタブでオフライン化
4. **Lighthouse**: PWAスコアの確認

### ログ出力

```javascript
import { workbox } from 'workbox-core';

// 開発環境でのみログ有効化
if (process.env.NODE_ENV === 'development') {
  workbox.setConfig({ debug: true });
}

// カスタムログ
import { logger } from 'workbox-core/_private/logger.js';

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  async ({ event }) => {
    logger.log('APIリクエスト:', event.request.url);
    const response = await fetch(event.request);
    logger.log('レスポンス:', response.status);
    return response;
  }
);
```

### テスト

```javascript
// service-worker.test.js
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.get('/api/data', (req, res, ctx) => {
    return res(ctx.json({ data: 'test' }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('Service Workerがキャッシュを使用する', async () => {
  // テストコード
});
```

## ベストプラクティス

### 1. 適切なキャッシュ戦略の選択

- **静的アセット**: Cache First
- **APIレスポンス**: Network First または Stale While Revalidate
- **ユーザー生成コンテンツ**: Network First
- **画像・フォント**: Cache First + 長期有効期限

### 2. キャッシュサイズの管理

```javascript
import { ExpirationPlugin } from 'workbox-expiration';

new ExpirationPlugin({
  maxEntries: 50,              // 最大エントリ数
  maxAgeSeconds: 7 * 24 * 60 * 60,  // 7日
  purgeOnQuotaError: true,     // クォータエラー時に自動削除
})
```

### 3. バージョニング

```javascript
const CACHE_VERSION = 'v1.2.0';

const cacheName = `${CACHE_VERSION}-static`;
```

### 4. 段階的な導入

```javascript
// Feature Detection
if ('serviceWorker' in navigator && 'caches' in window) {
  // Service Worker対応ブラウザのみ
  registerServiceWorker();
}
```

## まとめ

WorkboxとPWAの組み合わせにより、以下のメリットが得られます：

1. **オフライン対応**: ネットワークに依存しないアプリ体験
2. **高速化**: 効率的なキャッシュ戦略による読み込み速度向上
3. **エンゲージメント**: プッシュ通知によるユーザー再訪問
4. **インストール可能**: ホーム画面への追加でネイティブアプリライク
5. **信頼性**: ネットワーク状態に関わらず動作

Service Workerの複雑さをWorkboxが抽象化してくれるため、PWA開発のハードルは大幅に下がっています。モバイルファーストなWebアプリには、PWA化を検討する価値があります。

## 参考リンク

- [Workbox公式ドキュメント](https://developer.chrome.com/docs/workbox/)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

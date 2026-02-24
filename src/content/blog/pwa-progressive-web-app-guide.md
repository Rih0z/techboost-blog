---
title: 'PWA（プログレッシブウェブアプリ）完全ガイド — Service Worker・オフライン・プッシュ通知'
description: 'PWAを完全実装する実践ガイド。Service Worker・Cache API・Background Sync・Push Notifications・Web App Manifest・インストール・Workbox・Next.js PWA対応まで実装例付きで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-1.jpg'
tags: ['PWA', 'Service Worker', 'オフライン', 'プッシュ通知', 'Web API']
---

## はじめに — なぜ今 PWA なのか

スマートフォンが普及して久しい現在、ユーザーはネイティブアプリの快適さに慣れている。瞬時に起動し、オフラインでも動作し、プッシュ通知で情報を届けてくれるアプリ体験は、Webブラウザだけでは長らく実現できなかった。しかし **PWA（Progressive Web App）** の登場によって状況は一変した。

PWA は Google が 2015 年に提唱した概念で、Webの持つ「インストール不要・クロスプラットフォーム・URL共有可能」という強みを保ちながら、ネイティブアプリに匹敵する体験を提供するアーキテクチャパターンだ。Twitter（現X）、Pinterest、Starbucks、Uber など世界の大手サービスがPWAに移行し、コンバージョン率や滞在時間の大幅な改善を報告している。

本記事では PWA を構成する全技術要素を体系的に解説し、実装コード付きで実践的な理解を深める。

---

## 1. PWA とは — ネイティブアプリとの比較・メリット

### 1.1 PWA の定義

PWA は単一の技術ではなく、複数のWeb標準技術を組み合わせた **アーキテクチャパターン** だ。以下の3要素を満たすWebアプリを指す。

| 要件 | 説明 |
|------|------|
| **Reliable（信頼性）** | ネットワーク環境に関わらず即座にロードし、オフラインでも動作する |
| **Fast（高速性）** | アニメーションがスムーズで、ユーザーインタラクションへの応答が素早い |
| **Engaging（魅力的）** | ネイティブアプリのような没入感。ホーム画面へのインストール・プッシュ通知対応 |

### 1.2 ネイティブアプリとの比較

```
┌──────────────────────────┬──────────────┬─────────────┬──────────┐
│ 特性                     │ ネイティブ   │ 従来のWeb   │ PWA      │
├──────────────────────────┼──────────────┼─────────────┼──────────┤
│ インストール              │ 必要         │ 不要        │ 任意     │
│ オフライン動作            │ ○           │ ✗           │ ○        │
│ プッシュ通知              │ ○           │ ✗           │ ○        │
│ ホーム画面アイコン        │ ○           │ ✗           │ ○        │
│ App Store 審査           │ 必要         │ 不要        │ 不要     │
│ 更新の即時性              │ 遅い         │ 即時        │ 即時     │
│ URL による共有            │ ✗           │ ○           │ ○        │
│ SEO 対応                  │ ✗           │ ○           │ ○        │
│ クロスプラットフォーム    │ 困難         │ ○           │ ○        │
│ デバイス API アクセス     │ 広範囲       │ 限定的      │ 拡大中   │
└──────────────────────────┴──────────────┴─────────────┴──────────┘
```

### 1.3 PWA がもたらすビジネス効果

実際の事例から見るPWAの効果：

- **Twitter Lite**: データ消費量 70% 削減、セッション時間 65% 増加、ツイート数 75% 増加
- **Pinterest**: セッション時間 40% 増加、ユーザー生成コンテンツ 44% 増加、広告収益 44% 増加
- **Starbucks**: 注文数 2 倍、PWAはネイティブiOSアプリの 99.84% 小さいサイズ
- **Uber**: 低速 2G 回線でも 3 秒以内に読み込み完了

### 1.4 PWA を構成する主要技術

```
PWA
├── Web App Manifest     ← アプリのメタ情報・アイコン・インストール設定
├── Service Worker       ← バックグラウンド処理・キャッシュ・プッシュ通知
│   ├── Cache API        ← オフラインリソース管理
│   ├── Background Sync  ← オフライン時のデータ同期
│   └── Push API         ← プッシュ通知受信
└── HTTPS                ← セキュアな通信（必須要件）
```

---

## 2. Web App Manifest

Web App Manifest は、Webアプリのインストール方法やホーム画面での見た目をブラウザに伝えるJSONファイルだ。

### 2.1 基本的な manifest.json

```json
{
  "name": "MyAwesomeApp",
  "short_name": "MyApp",
  "description": "すごいアプリの説明文",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#0070f3",
  "lang": "ja",
  "dir": "ltr",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/screenshot1.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide",
      "label": "ホーム画面"
    },
    {
      "src": "/screenshots/screenshot2.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "モバイル画面"
    }
  ],
  "shortcuts": [
    {
      "name": "新規作成",
      "short_name": "新規",
      "description": "新しいアイテムを作成",
      "url": "/new",
      "icons": [{ "src": "/icons/shortcut-new.png", "sizes": "96x96" }]
    }
  ],
  "categories": ["productivity", "utilities"],
  "prefer_related_applications": false
}
```

### 2.2 display モードの選択

```
┌─────────────────────────────────────────────────────┐
│ display: "browser"    → 通常のブラウザタブで表示     │
│ display: "minimal-ui" → 最小限のブラウザUI付き       │
│ display: "standalone" → ネイティブアプリ風（推奨）   │
│ display: "fullscreen" → フルスクリーン表示           │
└─────────────────────────────────────────────────────┘
```

### 2.3 HTML でのリンク設定

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- PWA Manifest -->
  <link rel="manifest" href="/manifest.json" />

  <!-- iOS Safari 対応 -->
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="MyApp" />
  <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />

  <!-- テーマカラー -->
  <meta name="theme-color" content="#0070f3" />
  <meta name="theme-color" content="#1a1a2e" media="(prefers-color-scheme: dark)" />

  <!-- OGP -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="MyAwesomeApp" />
  <meta property="og:description" content="すごいアプリの説明文" />

  <title>MyAwesomeApp</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

### 2.4 Maskable Icon の重要性

Android では「アダプティブアイコン」として表示されるため、アイコンの重要部分はセーフゾーン（中央 80% の円形領域）内に収める必要がある。`purpose: "maskable"` を指定することで、OSがアイコンをマスク処理できるようになる。

---

## 3. Service Worker ライフサイクル

Service Worker（SW）はブラウザとネットワークの間に位置するプロキシとして機能するJavaScriptスクリプトだ。Webページとは別のスレッドで動作し、ページが閉じられても一定時間バックグラウンドで動き続けられる。

### 3.1 登録（Registration）

```typescript
// src/main.ts
async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker はサポートされていません');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none', // SW ファイル自体はキャッシュしない
    });

    console.log('SW 登録成功:', registration.scope);

    // 更新の検出
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (
          newWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          // 新バージョンが利用可能 → ユーザーに通知
          showUpdateNotification();
        }
      });
    });

    // コントローラー変更時にページリロード
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  } catch (error) {
    console.error('SW 登録失敗:', error);
  }
}

function showUpdateNotification(): void {
  const banner = document.createElement('div');
  banner.innerHTML = `
    <div style="
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      background: #0070f3; color: white; padding: 12px 24px;
      border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex; gap: 12px; align-items: center; z-index: 9999;
    ">
      <span>新しいバージョンが利用可能です</span>
      <button id="update-btn" style="
        background: white; color: #0070f3; border: none;
        padding: 6px 16px; border-radius: 4px; cursor: pointer;
      ">更新</button>
    </div>
  `;
  document.body.appendChild(banner);

  document.getElementById('update-btn')?.addEventListener('click', () => {
    navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' });
  });
}

// DOMContentLoaded 後に実行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', registerServiceWorker);
} else {
  registerServiceWorker();
}
```

### 3.2 Service Worker の基本構造とライフサイクル

```
インストール(install) → アクティベート(activate) → フェッチ(fetch)
      ↓                        ↓                         ↓
  キャッシュ作成          古いキャッシュ削除          リクエスト傍受
```

```typescript
// public/sw.ts（TypeScript で書いてビルドする場合）
// または public/sw.js として直接配置

const SW_VERSION = 'v1.0.0';
const CACHE_NAME = `app-cache-${SW_VERSION}`;
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/src/main.css',
  '/icons/icon-192x192.png',
];

// ---- install イベント ----
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('[SW] インストール中...', SW_VERSION);

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // 重要なアセットを事前キャッシュ
      await cache.addAll(STATIC_ASSETS);
      console.log('[SW] 静的アセットをキャッシュしました');

      // 新しい SW を即座にアクティブ化（待機をスキップ）
      // await self.skipWaiting(); // 必要に応じてコメントアウト解除
    })()
  );
});

// ---- activate イベント ----
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('[SW] アクティベート中...', SW_VERSION);

  event.waitUntil(
    (async () => {
      // 古いキャッシュを削除
      const cacheKeys = await caches.keys();
      const deletePromises = cacheKeys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => {
          console.log('[SW] 古いキャッシュを削除:', key);
          return caches.delete(key);
        });
      await Promise.all(deletePromises);

      // 現在開いている全タブを即座に制御下に置く
      await (self as ServiceWorkerGlobalScope).clients.claim();
      console.log('[SW] アクティベート完了');
    })()
  );
});

// ---- message イベント ----
self.addEventListener('message', (event: MessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') {
    (self as ServiceWorkerGlobalScope).skipWaiting();
  }
});
```

---

## 4. Cache API — キャッシュ戦略

Cache API を使ったキャッシュ戦略は PWA の心臓部だ。目的に応じた戦略を使い分けることが重要。

### 4.1 Cache First（キャッシュ優先）

静的アセット（CSS・JS・画像）に最適。ネットワーク不要で即時応答。

```typescript
// キャッシュファーストストラテジー
async function cacheFirst(request: Request): Promise<Response> {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse; // キャッシュがあれば即返す
  }

  // キャッシュがなければネットワークから取得してキャッシュ
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch {
    // オフライン時はフォールバック
    return caches.match('/offline.html') as Promise<Response>;
  }
}
```

### 4.2 Network First（ネットワーク優先）

APIレスポンスや動的コンテンツに最適。最新データを優先しつつ、オフライン時はキャッシュを使用。

```typescript
async function networkFirst(
  request: Request,
  cacheName: string = CACHE_NAME,
  timeout: number = 3000
): Promise<Response> {
  const cache = await caches.open(cacheName);

  try {
    // タイムアウト付きでネットワークリクエスト
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Network timeout')), timeout)
      ),
    ]);

    // 成功したらキャッシュを更新
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch {
    // ネットワーク失敗 → キャッシュから返す
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('[SW] オフライン: キャッシュを使用', request.url);
      return cachedResponse;
    }

    // キャッシュもなければオフラインページ
    return (await caches.match('/offline.html')) as Response;
  }
}
```

### 4.3 Stale While Revalidate（SWR）

パフォーマンスと鮮度のバランスが必要なコンテンツ（ニュース・ブログ記事）に最適。

```typescript
async function staleWhileRevalidate(
  request: Request,
  cacheName: string = CACHE_NAME
): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  // バックグラウンドでネットワーク取得してキャッシュ更新
  const networkFetch = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });

  // キャッシュがあれば即返し、なければネットワーク待ち
  return cachedResponse ?? networkFetch;
}
```

### 4.4 fetch イベントでの戦略振り分け

```typescript
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // 別オリジンのリクエストはスキップ
  if (url.origin !== self.location.origin) return;

  // Navigate リクエスト（ページ遷移）
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // 静的アセット（JS・CSS・フォント・画像）
  if (
    url.pathname.match(/\.(js|css|woff2?|png|jpg|jpeg|svg|ico|webp)$/)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // API エンドポイント
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, 'api-cache', 5000));
    return;
  }

  // その他コンテンツ
  event.respondWith(staleWhileRevalidate(request));
});
```

---

## 5. オフライン対応 — offline.html の設計

### 5.1 オフラインページの実装

```html
<!-- public/offline.html -->
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>オフライン — MyApp</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #f8fafc;
      color: #1e293b;
      padding: 24px;
    }
    .container {
      text-align: center;
      max-width: 480px;
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 24px;
      display: block;
    }
    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 12px;
    }
    p {
      color: #64748b;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    button {
      background: #0070f3;
      color: white;
      border: none;
      padding: 12px 28px;
      border-radius: 8px;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    button:hover { background: #0051cc; }
  </style>
</head>
<body>
  <div class="container">
    <span class="icon" aria-hidden="true">📡</span>
    <h1>オフラインです</h1>
    <p>
      インターネット接続が見つかりません。<br />
      接続を確認してから再度お試しください。
    </p>
    <button onclick="window.location.reload()">再読み込み</button>
  </div>
  <script>
    // オンラインに戻ったら自動リダイレクト
    window.addEventListener('online', () => {
      window.location.reload();
    });
  </script>
</body>
</html>
```

### 5.2 オフライン状態の検出と UI フィードバック

```typescript
// src/utils/network-status.ts

type NetworkStatusCallback = (isOnline: boolean) => void;

class NetworkStatusMonitor {
  private listeners: NetworkStatusCallback[] = [];
  private banner: HTMLElement | null = null;

  constructor() {
    window.addEventListener('online', () => this.handleStatusChange(true));
    window.addEventListener('offline', () => this.handleStatusChange(false));
  }

  get isOnline(): boolean {
    return navigator.onLine;
  }

  subscribe(callback: NetworkStatusCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private handleStatusChange(isOnline: boolean): void {
    this.listeners.forEach((cb) => cb(isOnline));
    this.showStatusBanner(isOnline);
  }

  private showStatusBanner(isOnline: boolean): void {
    if (this.banner) {
      this.banner.remove();
      this.banner = null;
    }

    const banner = document.createElement('div');
    banner.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0;
      padding: 10px; text-align: center; font-weight: 600;
      background: ${isOnline ? '#10b981' : '#ef4444'};
      color: white; z-index: 9999;
      animation: slideDown 0.3s ease;
    `;
    banner.textContent = isOnline
      ? 'オンラインに戻りました'
      : 'オフラインです — キャッシュされたコンテンツを表示しています';

    document.body.prepend(banner);
    this.banner = banner;

    if (isOnline) {
      setTimeout(() => banner.remove(), 3000);
    }
  }
}

export const networkStatus = new NetworkStatusMonitor();
```

---

## 6. Background Sync API — フォーム送信の失敗時リトライ

Background Sync は、オフライン時に実行できなかった処理をオンライン復帰後に自動リトライする仕組みだ。フォーム送信・いいね・メッセージ送信などに最適。

### 6.1 クライアント側の実装

```typescript
// src/utils/background-sync.ts

interface SyncMessage {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  timestamp: number;
}

const DB_NAME = 'sync-store';
const STORE_NAME = 'pending-requests';

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function savePendingRequest(message: SyncMessage): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(message);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function syncFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // オンライン時は通常のfetch
  if (navigator.onLine) {
    return fetch(url, options);
  }

  // オフライン時はIndexedDBに保存してBackground Sync登録
  const message: SyncMessage = {
    id: crypto.randomUUID(),
    url,
    method: options.method ?? 'GET',
    headers: (options.headers as Record<string, string>) ?? {},
    body: options.body ? String(options.body) : '',
    timestamp: Date.now(),
  };

  await savePendingRequest(message);

  const registration = await navigator.serviceWorker.ready;

  if ('sync' in registration) {
    await (registration as ServiceWorkerRegistration & {
      sync: { register: (tag: string) => Promise<void> };
    }).sync.register('pending-requests');
    console.log('[Sync] Background Sync 登録完了');
  }

  // オフライン用のモックレスポンスを返す
  return new Response(
    JSON.stringify({ offline: true, queued: true, id: message.id }),
    {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
```

### 6.2 Service Worker での Background Sync 処理

```typescript
// public/sw.js（Background Sync 処理）

const DB_NAME = 'sync-store';
const STORE_NAME = 'pending-requests';

self.addEventListener('sync', (event) => {
  if (event.tag === 'pending-requests') {
    event.waitUntil(processPendingRequests());
  }
});

async function processPendingRequests() {
  const db = await openDB();
  const requests = await getAllPendingRequests(db);

  console.log(`[SW] ${requests.length} 件のリクエストを処理します`);

  for (const req of requests) {
    try {
      const response = await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body || undefined,
      });

      if (response.ok) {
        await deletePendingRequest(db, req.id);
        console.log('[SW] リクエスト送信成功:', req.url);
      } else {
        console.warn('[SW] リクエスト失敗 (ステータス):', response.status);
      }
    } catch (error) {
      console.error('[SW] リクエスト送信エラー:', error);
      // エラー時は次回の sync で再試行
    }
  }
}

async function getAllPendingRequests(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function deletePendingRequest(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
```

---

## 7. Push Notifications — プッシュ通知の完全実装

Push Notifications は、アプリが開いていない状態でもユーザーに情報を届けられる強力な機能だ。VAPID（Voluntary Application Server Identification）プロトコルを使った実装を解説する。

### 7.1 VAPID 鍵の生成

```bash
# web-push ライブラリを使って VAPID 鍵ペアを生成
npx web-push generate-vapid-keys

# 出力例:
# Public Key: BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U
# Private Key: UUxI4O8-HoFnpqaLeTdDVwDGXBBfDZQjI2nB6hQK1...
```

### 7.2 通知許可とサブスクリプション

```typescript
// src/utils/push-notifications.ts

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}

export async function requestNotificationPermission(): Promise<
  NotificationPermission
> {
  if (!('Notification' in window)) {
    throw new Error('このブラウザはプッシュ通知をサポートしていません');
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  const permission = await requestNotificationPermission();

  if (permission !== 'granted') {
    console.log('通知の許可が得られませんでした');
    return null;
  }

  const registration = await navigator.serviceWorker.ready;

  // 既存のサブスクリプションを確認
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true, // 全プッシュはユーザーに表示（Chrome 要件）
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  // サーバーにサブスクリプション情報を送信
  await sendSubscriptionToServer(subscription);

  return subscription;
}

async function sendSubscriptionToServer(
  subscription: PushSubscription
): Promise<void> {
  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription.toJSON()),
  });

  if (!response.ok) {
    throw new Error('サーバーへのサブスクリプション送信に失敗しました');
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    await subscription.unsubscribe();
    await fetch('/api/push/unsubscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
  }
}
```

### 7.3 サーバー側での Push 送信（Node.js）

```typescript
// server/push-service.ts
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:admin@example.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

export async function sendPushNotification(
  subscription: webpush.PushSubscription,
  payload: PushPayload
): Promise<void> {
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify(payload),
      {
        TTL: 60 * 60 * 24, // 24時間後に期限切れ
        urgency: 'normal',
        topic: payload.tag,
      }
    );
  } catch (error: unknown) {
    if (
      error instanceof webpush.WebPushError &&
      (error.statusCode === 404 || error.statusCode === 410)
    ) {
      // サブスクリプションが無効 → DBから削除
      await deleteInvalidSubscription(subscription.endpoint);
    } else {
      throw error;
    }
  }
}

async function deleteInvalidSubscription(endpoint: string): Promise<void> {
  // データベースから無効なサブスクリプションを削除する実装
  console.log('無効なサブスクリプションを削除:', endpoint);
}
```

### 7.4 Service Worker での Push イベント処理

```typescript
// public/sw.js（Push 通知処理）

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const payload = event.data.json();
  const {
    title = '新しいお知らせ',
    body = '',
    icon = '/icons/icon-192x192.png',
    badge = '/icons/badge-72x72.png',
    url = '/',
    tag = 'default',
    image,
    actions,
  } = payload;

  const notificationOptions = {
    body,
    icon,
    badge,
    tag,
    image,
    actions: actions ?? [
      { action: 'open', title: '開く' },
      { action: 'dismiss', title: '閉じる' },
    ],
    data: { url },
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
  );
});

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { action } = event;
  const { url } = event.notification.data;

  if (action === 'dismiss') return;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 既に開いているタブがあればフォーカス
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        // 開いていなければ新規タブで開く
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
```

---

## 8. Workbox — 実用的なキャッシュ管理

Workbox は Google が提供するPWAライブラリで、Service Worker のキャッシュ管理を大幅に簡素化する。

### 8.1 インストール

```bash
npm install workbox-webpack-plugin workbox-window
# または Vite を使う場合
npm install vite-plugin-pwa workbox-window
```

### 8.2 Vite + Workbox の設定

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // 事前キャッシュのパターン
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

        // ランタイムキャッシュの設定
        runtimeCaching: [
          {
            // Google Fonts — Cache First
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1年
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // API — Network First（5秒タイムアウト）
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60, // 1時間
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              backgroundSync: {
                name: 'api-queue',
                options: {
                  maxRetentionTime: 24 * 60, // 24時間
                },
              },
            },
          },
          {
            // 画像 — Stale While Revalidate
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30日
              },
            },
          },
        ],

        // オフライン時のフォールバック
        offlineFallbacks: {
          document: '/offline.html',
          image: '/icons/offline-image.png',
          font: undefined,
        },
      },

      manifest: {
        name: 'MyAwesomeApp',
        short_name: 'MyApp',
        description: 'すごいアプリ',
        theme_color: '#0070f3',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable any',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable any',
          },
        ],
      },

      devOptions: {
        enabled: true, // 開発環境でも SW を有効化
        type: 'module',
      },
    }),
  ],
});
```

### 8.3 Workbox ウィンドウ（更新通知）

```typescript
// src/main.ts
import { Workbox } from 'workbox-window';

if ('serviceWorker' in navigator) {
  const wb = new Workbox('/sw.js');

  wb.addEventListener('waiting', () => {
    // 新バージョンの SW が待機中
    showUpdatePrompt(() => {
      wb.messageSkipWaiting();
    });
  });

  wb.addEventListener('controlling', () => {
    window.location.reload();
  });

  wb.register();
}

function showUpdatePrompt(onAccept: () => void): void {
  const toast = document.createElement('div');
  toast.innerHTML = `
    <div class="update-toast">
      <p>新しいバージョンが利用可能です</p>
      <button id="accept-update">今すぐ更新</button>
      <button id="dismiss-update">後で</button>
    </div>
  `;
  document.body.appendChild(toast);

  document.getElementById('accept-update')?.addEventListener('click', () => {
    toast.remove();
    onAccept();
  });

  document.getElementById('dismiss-update')?.addEventListener('click', () => {
    toast.remove();
  });
}
```

---

## 9. Next.js PWA 対応（App Router）

### 9.1 next-pwa のセットアップ

```bash
npm install @ducanh2912/next-pwa
# または
npm install next-pwa
```

```typescript
// next.config.ts
import type { NextConfig } from 'next';
import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/api\.example\.com\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'external-api',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60,
          },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  // その他の設定
};

export default withPWA(nextConfig);
```

### 9.2 App Router での Metadata 設定

```typescript
// app/layout.tsx
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'MyAwesomeApp',
  description: 'すごいアプリ',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MyApp',
  },
  openGraph: {
    type: 'website',
    title: 'MyAwesomeApp',
    description: 'すごいアプリ',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0070f3' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a2e' },
  ],
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
```

### 9.3 PWA インストール状態の検出

```typescript
// src/hooks/usePWA.ts
'use client';

import { useEffect, useState } from 'react';

type DisplayMode = 'standalone' | 'browser' | 'minimal-ui' | 'fullscreen';

interface PWAState {
  isInstalled: boolean;
  displayMode: DisplayMode;
  isIOS: boolean;
  canInstall: boolean;
}

export function usePWA(): PWAState {
  const [state, setState] = useState<PWAState>({
    isInstalled: false,
    displayMode: 'browser',
    isIOS: false,
    canInstall: false,
  });

  useEffect(() => {
    const isIOS =
      /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()) &&
      !(window as unknown as { MSStream: unknown }).MSStream;

    const getDisplayMode = (): DisplayMode => {
      if (window.matchMedia('(display-mode: fullscreen)').matches)
        return 'fullscreen';
      if (window.matchMedia('(display-mode: standalone)').matches)
        return 'standalone';
      if (window.matchMedia('(display-mode: minimal-ui)').matches)
        return 'minimal-ui';
      return 'browser';
    };

    const displayMode = getDisplayMode();

    setState((prev) => ({
      ...prev,
      displayMode,
      isInstalled: displayMode !== 'browser',
      isIOS,
    }));
  }, []);

  return state;
}
```

---

## 10. インストールプロンプト（beforeinstallprompt）

### 10.1 カスタムインストールプロンプトの実装

```typescript
// src/components/InstallPrompt.tsx
'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  prompt(): Promise<void>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // インストール済みかチェック
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);

      // インストール完了をアナリティクスに送信
      gtag?.('event', 'pwa_install', { method: 'browser_prompt' });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA インストール承認');
    } else {
      console.log('PWA インストール拒否');
      // 一定期間後に再表示（例: 7日後）
      localStorage.setItem('pwa-install-dismissed', String(Date.now()));
    }

    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pwa-install-dismissed', String(Date.now()));
  };

  if (!isVisible || isInstalled) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="install-title"
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        padding: '20px 24px',
        maxWidth: '360px',
        width: 'calc(100% - 48px)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img
          src="/icons/icon-72x72.png"
          alt="アプリアイコン"
          style={{ width: 48, height: 48, borderRadius: 12 }}
        />
        <div>
          <p
            id="install-title"
            style={{ fontWeight: 700, margin: 0, fontSize: '1rem' }}
          >
            ホーム画面に追加
          </p>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>
            オフラインでも使えます
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleInstall}
          style={{
            flex: 1,
            background: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          インストール
        </button>
        <button
          onClick={handleDismiss}
          style={{
            flex: 1,
            background: '#f1f5f9',
            color: '#475569',
            border: 'none',
            borderRadius: '8px',
            padding: '10px',
            cursor: 'pointer',
          }}
        >
          後で
        </button>
      </div>
    </div>
  );
}
```

---

## 11. App Badge API と Share Target API

### 11.1 App Badge API — アプリアイコンのバッジ表示

```typescript
// src/utils/app-badge.ts

export class AppBadgeManager {
  private supported = 'setAppBadge' in navigator;

  async set(count: number): Promise<void> {
    if (!this.supported) return;
    try {
      await navigator.setAppBadge(count);
    } catch (error) {
      console.error('バッジ設定エラー:', error);
    }
  }

  async clear(): Promise<void> {
    if (!this.supported) return;
    try {
      await navigator.clearAppBadge();
    } catch (error) {
      console.error('バッジクリアエラー:', error);
    }
  }

  get isSupported(): boolean {
    return this.supported;
  }
}

export const appBadge = new AppBadgeManager();

// 使用例: 未読通知数をバッジ表示
async function updateUnreadCount(count: number): Promise<void> {
  if (count > 0) {
    await appBadge.set(count);
  } else {
    await appBadge.clear();
  }
}
```

### 11.2 Share Target API — PWA を共有先として登録

```json
// manifest.json に追加
{
  "share_target": {
    "action": "/share",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url",
      "files": [
        {
          "name": "files",
          "accept": ["image/png", "image/jpeg", "image/webp"]
        }
      ]
    }
  }
}
```

```typescript
// app/share/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function SharePage() {
  const searchParams = useSearchParams();
  const [sharedData, setSharedData] = useState<{
    title?: string;
    text?: string;
    url?: string;
  }>({});

  useEffect(() => {
    setSharedData({
      title: searchParams.get('title') ?? undefined,
      text: searchParams.get('text') ?? undefined,
      url: searchParams.get('url') ?? undefined,
    });
  }, [searchParams]);

  return (
    <div>
      <h1>共有されたコンテンツ</h1>
      {sharedData.title && <p>タイトル: {sharedData.title}</p>}
      {sharedData.text && <p>テキスト: {sharedData.text}</p>}
      {sharedData.url && (
        <p>
          URL: <a href={sharedData.url}>{sharedData.url}</a>
        </p>
      )}
    </div>
  );
}
```

---

## 12. Lighthouse PWA チェックリスト

Lighthouse は Google Chrome に内蔵されたPWA品質チェックツールだ。以下の要件を満たすことで高いスコアが得られる。

### 12.1 必須要件チェックリスト

```
PWA 必須要件（Lighthouse チェック）
├── ネットワーク
│   ├── [ ] HTTPS で配信されている
│   ├── [ ] HTTP → HTTPS にリダイレクトされる
│   └── [ ] カスタムオフラインページが存在する
├── Service Worker
│   ├── [ ] SW が登録されている
│   ├── [ ] SW が fetch イベントをハンドルしている
│   └── [ ] オフライン時にコンテンツを返す
├── Web App Manifest
│   ├── [ ] manifest.json が存在する
│   ├── [ ] name または short_name がある
│   ├── [ ] start_url が指定されている
│   ├── [ ] display が standalone/fullscreen/minimal-ui
│   ├── [ ] 192×192 以上のアイコンがある
│   └── [ ] 512×512 のアイコンがある
└── パフォーマンス
    ├── [ ] First Contentful Paint < 3s (3G 相当)
    ├── [ ] TTI (Time to Interactive) < 5s
    └── [ ] ページが速い
```

### 12.2 Lighthouse CI の自動化

```yaml
# .github/workflows/lighthouse-ci.yml
name: Lighthouse CI

on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v11
        with:
          urls: |
            https://your-preview-url.vercel.app
          budgetPath: ./budget.json
          uploadArtifacts: true

# budget.json
# {
#   "resourceSizes": [
#     { "resourceType": "script", "budget": 300 },
#     { "resourceType": "stylesheet", "budget": 50 },
#     { "resourceType": "image", "budget": 500 }
#   ],
#   "scores": [
#     { "category": "performance", "minScore": 90 },
#     { "category": "pwa", "minScore": 100 },
#     { "category": "accessibility", "minScore": 95 }
#   ]
# }
```

---

## 13. iOS / Android 対応の注意点

### 13.1 iOS Safari の制約と対応

iOS Safari はPWAサポートが部分的で、以下の制約がある。

```typescript
// src/utils/platform-detect.ts

export const platform = {
  isIOS:
    /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()) &&
    !(window as { MSStream?: unknown }).MSStream,

  isAndroid: /android/i.test(navigator.userAgent),

  isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),

  isStandalone:
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true,

  // iOS で standalone（ホーム画面追加済み）
  isIOSStandalone:
    (navigator as { standalone?: boolean }).standalone === true,
};

// iOS 向けのインストール案内コンポーネント
export function IOSInstallGuide() {
  const showGuide =
    platform.isIOS && platform.isSafari && !platform.isIOSStandalone;

  if (!showGuide) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'white',
        borderTop: '1px solid #e2e8f0',
        padding: '16px 20px',
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: '0.9rem', color: '#475569' }}>
        ホーム画面に追加するには、Safari の{' '}
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          共有ボタン（□↑）
        </span>{' '}
        をタップし、「ホーム画面に追加」を選んでください
      </p>
    </div>
  );
}
```

### 13.2 iOS の主要制限事項

| 機能 | iOS Safari | Android Chrome |
|------|-----------|----------------|
| Service Worker | iOS 11.3以降 ○ | ○ |
| Push 通知 | iOS 16.4以降（ホーム画面追加時のみ） | ○ |
| Background Sync | ✗ | ○ |
| Web Share API | ○（iOS 12.4以降） | ○ |
| App Badge API | ✗ | ○ |
| beforeinstallprompt | ✗ | ○ |
| Payment Request | ○ | ○ |
| Camera/Mic アクセス | ○ | ○ |

### 13.3 PWA キャッシュの iOS 制限

iOS では PWA のストレージは **50MB** に制限されており、長期間使用されないとクリアされる可能性がある。重要なデータは必ずサーバーに同期する設計が必要だ。

```typescript
// ストレージ使用量の確認
async function checkStorageQuota(): Promise<void> {
  if (!navigator.storage?.estimate) return;

  const { quota = 0, usage = 0 } = await navigator.storage.estimate();
  const usagePercent = Math.round((usage / quota) * 100);

  console.log(
    `ストレージ使用量: ${formatBytes(usage)} / ${formatBytes(quota)} (${usagePercent}%)`
  );

  if (usagePercent > 80) {
    console.warn('ストレージ使用量が 80% を超えています');
    // 古いキャッシュのクリーンアップを実行
    await cleanupOldCaches();
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function cleanupOldCaches(): Promise<void> {
  const cacheKeys = await caches.keys();
  const sortedByAge = cacheKeys.sort(); // バージョン名でソート

  // 最新の2つ以外を削除
  const toDelete = sortedByAge.slice(0, -2);
  await Promise.all(toDelete.map((key) => caches.delete(key)));
}
```

---

## 14. PWA の開発・デバッグ環境構築

### 14.1 Chrome DevTools での Service Worker デバッグ

```
Chrome DevTools → Application タブ
├── Service Workers    → SW の登録状態・イベント確認
├── Cache Storage      → キャッシュ内容の確認・削除
├── IndexedDB          → Background Sync 保留データ確認
└── Manifest           → manifest.json の検証・インストール可能性確認
```

### 14.2 ローカル HTTPS 環境の構築

```bash
# mkcert で自己署名証明書を生成
brew install mkcert
mkcert -install
mkcert localhost 127.0.0.1 ::1

# Vite での HTTPS 設定
# vite.config.ts
import fs from 'fs';
import path from 'path';

export default defineConfig({
  server: {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, 'localhost-key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, 'localhost.pem')),
    },
    port: 3000,
  },
});
```

### 14.3 Service Worker のデバッグ Tips

```typescript
// SW 内でのデバッグ用ログ
const DEBUG = process.env.NODE_ENV === 'development';

function swLog(message: string, ...args: unknown[]): void {
  if (DEBUG) {
    console.log(`[SW ${new Date().toISOString()}] ${message}`, ...args);
  }
}

// SW の状態をクライアントに送信
async function broadcastMessage(message: unknown): Promise<void> {
  const allClients = await (
    self as unknown as ServiceWorkerGlobalScope
  ).clients.matchAll();
  allClients.forEach((client) => {
    client.postMessage(message);
  });
}
```

---

## 15. PWA パフォーマンス最適化

### 15.1 App Shell パターン

```typescript
// App Shell = 最小限のHTMLスケルトンをキャッシュし、コンテンツをAPIで取得
// SW の install 時に App Shell をキャッシュ

const APP_SHELL_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/fonts/inter-var.woff2',
  '/css/critical.css',
  '/js/app-shell.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_ASSETS))
  );
});
```

### 15.2 Periodic Background Sync（定期バックグラウンド同期）

```typescript
// 定期的なコンテンツ更新（Chrome 80以降）

async function registerPeriodicSync(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;

  if (!('periodicSync' in registration)) {
    console.log('Periodic Background Sync 非対応');
    return;
  }

  const status = await navigator.permissions.query({
    name: 'periodic-background-sync' as PermissionName,
  });

  if (status.state === 'granted') {
    await (
      registration as ServiceWorkerRegistration & {
        periodicSync: {
          register: (tag: string, options: { minInterval: number }) => Promise<void>;
        };
      }
    ).periodicSync.register('content-sync', {
      minInterval: 24 * 60 * 60 * 1000, // 最低1日1回
    });
    console.log('Periodic Sync 登録完了');
  }
}

// SW 側
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-sync') {
    event.waitUntil(syncLatestContent());
  }
});

async function syncLatestContent(): Promise<void> {
  try {
    const response = await fetch('/api/latest-content');
    const data = await response.json();
    const cache = await caches.open('content-cache');
    await cache.put('/api/latest-content', new Response(JSON.stringify(data)));
    console.log('[SW] コンテンツを更新しました');
  } catch (error) {
    console.error('[SW] コンテンツ更新失敗:', error);
  }
}
```

---

## 16. 実装チェックリスト — 本番デプロイ前

```markdown
## PWA 本番デプロイ前チェックリスト

### 基本要件
- [ ] HTTPS で配信（Let's Encrypt / Cloudflare 等）
- [ ] manifest.json が正しくリンクされている
- [ ] 全サイズのアイコンが揃っている（72, 96, 128, 144, 152, 192, 384, 512）
- [ ] Maskable アイコンが用意されている
- [ ] offline.html が存在し、キャッシュされている

### Service Worker
- [ ] SW が正しく登録されている
- [ ] install / activate / fetch イベントが実装されている
- [ ] 適切なキャッシュ戦略が実装されている
- [ ] SW バージョン管理と古いキャッシュ削除が実装されている
- [ ] skipWaiting の挙動を確認した

### オフライン対応
- [ ] オフライン時のフォールバックが動作する
- [ ] オフライン UI フィードバックが表示される
- [ ] Background Sync でフォーム送信をリトライする

### プッシュ通知
- [ ] VAPID 鍵が環境変数で管理されている
- [ ] 通知許可フローが UX として自然
- [ ] 通知クリック時のディープリンクが動作する
- [ ] 無効なサブスクリプションをサーバーから削除する

### Lighthouse スコア
- [ ] Performance: 90+
- [ ] PWA: 100
- [ ] Accessibility: 95+
- [ ] Best Practices: 95+
- [ ] SEO: 95+

### クロスブラウザ
- [ ] Chrome / Edge で動作確認
- [ ] Safari (iOS) で動作確認
- [ ] Firefox で動作確認
- [ ] インストールフローを各プラットフォームで確認
```

---

## まとめ

PWA は「一度作ればどこでも動く」Webの強みと、「ネイティブアプリのような体験」を両立する現代的なアーキテクチャだ。本記事で解説した要素をまとめると：

1. **Web App Manifest** でアプリのメタ情報とインストール体験を定義
2. **Service Worker** がバックグラウンドで動作しリクエストを制御
3. **Cache API** でオフライン対応とパフォーマンス向上を実現
4. **Background Sync** でオフライン時の操作を確実に同期
5. **Push Notifications** でユーザーエンゲージメントを向上
6. **Workbox** で複雑なSW実装をシンプルに管理
7. **Next.js + next-pwa** でReactアプリを即座にPWA化

PWA は段階的に実装できるため、まず manifest.json と基本的な Service Worker から始め、徐々に機能を追加していくアプローチが現実的だ。

---

**Web 開発のツールを探しているなら [DevToolBox](https://usedevtools.com/) をチェックしてみてほしい。** Regex テスター・JSON フォーマッター・Base64 エンコーダー・色変換ツールなど、PWA 開発にも役立つ 20 以上のツールがブラウザ上で使える。複雑な計算やデータ変換を手軽に行えるため、日常的な開発作業の効率が大きく向上する。インストール不要でオフラインでも動作するので、ぜひ活用してほしい。

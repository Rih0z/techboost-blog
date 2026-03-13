---
title: 'Web Push通知実装ガイド: Service WorkerとPush APIの活用'
description: 'Web Push通知の実装方法を徹底解説。Service Workerの登録、Push API、Notification API、VAPID認証、プッシュ配信サーバー構築、通知戦略、パフォーマンス最適化まで実践的にカバー。基礎から応用まで幅広くカバーしています。'
pubDate: '2025-03-30'
updatedDate: '2025-03-30'
tags: ['Web API', 'Service Worker', 'PWA', 'Push通知', 'TypeScript']
heroImage: '../../assets/thumbnails/web-push-notifications-guide.jpg'
---
## Web Push通知とは？

Web Push通知は、ブラウザを閉じていてもユーザーにメッセージを届けられる強力な機能です。PWA（Progressive Web Apps）の中核技術の一つで、ネイティブアプリのようなユーザー体験を実現します。

### Web Pushの仕組み

```
[Webアプリ] → [Service Worker] → [Push Service] → [ユーザーのデバイス]
     ↓              ↓                   ↑
  [あなたのサーバー] ←------ 通知送信 ---┘
```

**主要コンポーネント:**
1. **Service Worker** - バックグラウンドで動作し、Push イベントを受信
2. **Push API** - サーバーからの通知を受け取る
3. **Notification API** - 通知を表示する
4. **Push Service** - ブラウザベンダーが提供する配信サービス（FCM、APNSなど）

### 対応ブラウザ

2026年現在の対応状況:
- ✅ Chrome/Edge 42+
- ✅ Firefox 44+
- ✅ Opera 42+
- ✅ Safari 16+ (macOS 13+、iOS 16.4+)
- ❌ IE（サポート終了）

## 実装の全体フロー

### フロントエンド（ユーザーのブラウザ）

1. Service Workerを登録
2. 通知の許可をリクエスト
3. Push購読を作成
4. サーバーに購読情報を送信

### バックエンド（あなたのサーバー）

1. 購読情報をデータベースに保存
2. 通知を送信したいタイミングで、Push Serviceに配信リクエスト
3. Push ServiceがService Workerにイベントを配信
4. Service Workerが通知を表示

## Service Workerのセットアップ

### Service Workerの登録

```typescript
// main.ts
async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker is not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('Service Worker registered:', registration.scope);

    // 更新チェック
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      console.log('New Service Worker found:', newWorker);
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

// アプリ起動時に実行
registerServiceWorker();
```

### Service Workerファイル

```javascript
// sw.js
const CACHE_NAME = 'my-app-v1';

// Service Workerのインストール
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting(); // すぐにアクティブ化
});

// Service Workerのアクティブ化
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim()); // すべてのクライアントを制御
});

// Pushイベントの受信
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);

  const data = event.data ? event.data.json() : {};
  const title = data.title || 'New Notification';
  const options = {
    body: data.body || 'You have a new message',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/badge-72.png',
    data: data.url || '/',
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});
```

## Push購読の作成

### VAPID鍵の生成

VAPID（Voluntary Application Server Identification）は、あなたのサーバーを識別するための鍵ペアです。

```bash
# web-push ライブラリをインストール
npm install web-push

# 鍵ペアを生成
npx web-push generate-vapid-keys
```

**出力例:**
```
Public Key:
BEl62iUY...（省略）

Private Key:
wpIxJ3mE...（省略）
```

この鍵を安全に保存してください。

### フロントエンドで購読作成

```typescript
// push-manager.ts
interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class PushManager {
  private vapidPublicKey: string;

  constructor(vapidPublicKey: string) {
    this.vapidPublicKey = vapidPublicKey;
  }

  // 通知許可のリクエスト
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Notification API not supported');
    }

    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission;
  }

  // Push購読の作成
  async subscribe(
    registration: ServiceWorkerRegistration
  ): Promise<PushSubscriptionData> {
    // 既存の購読をチェック
    let subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      console.log('Already subscribed:', subscription);
    } else {
      // 新規購読
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true, // 必須: 通知は常にユーザーに表示
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey),
      });
      console.log('New subscription created:', subscription);
    }

    return this.subscriptionToJSON(subscription);
  }

  // 購読の解除
  async unsubscribe(registration: ServiceWorkerRegistration): Promise<boolean> {
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      return await subscription.unsubscribe();
    }
    return false;
  }

  // Base64 URLをUint8Arrayに変換
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
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

  // PushSubscriptionをJSON形式に変換
  private subscriptionToJSON(subscription: PushSubscription): PushSubscriptionData {
    const json = subscription.toJSON();
    return {
      endpoint: json.endpoint!,
      keys: {
        p256dh: json.keys!.p256dh,
        auth: json.keys!.auth,
      },
    };
  }
}
```

### 使用例

```typescript
// app.ts
const VAPID_PUBLIC_KEY = 'BEl62iUY...'; // あなたの公開鍵

async function setupPushNotification() {
  // Service Workerを登録
  const registration = await registerServiceWorker();
  if (!registration) return;

  // 通知マネージャーを作成
  const pushManager = new PushManager(VAPID_PUBLIC_KEY);

  // 許可をリクエスト
  const permission = await pushManager.requestPermission();
  if (permission !== 'granted') {
    console.warn('Notification permission denied');
    return;
  }

  // 購読を作成
  const subscription = await pushManager.subscribe(registration);

  // サーバーに送信
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription,
      userId: getCurrentUserId(),
    }),
  });

  console.log('Push notification setup complete!');
}

// ボタンクリックで購読
document.getElementById('enable-push')?.addEventListener('click', () => {
  setupPushNotification();
});
```

## バックエンド実装（Node.js）

### サーバーサイドのセットアップ

```typescript
// server.ts
import express from 'express';
import webpush from 'web-push';

const app = express();
app.use(express.json());

// VAPID鍵を設定
webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// 購読情報をメモリに保存（本番環境ではDBを使用）
const subscriptions = new Map<string, webpush.PushSubscription>();

// 購読の保存
app.post('/api/push/subscribe', (req, res) => {
  const { subscription, userId } = req.body;

  subscriptions.set(userId, subscription);

  console.log(`User ${userId} subscribed`);
  res.status(201).json({ message: 'Subscribed successfully' });
});

// 購読の削除
app.post('/api/push/unsubscribe', (req, res) => {
  const { userId } = req.body;
  subscriptions.delete(userId);
  res.json({ message: 'Unsubscribed successfully' });
});

// 通知の送信
app.post('/api/push/send', async (req, res) => {
  const { userId, title, body, url } = req.body;

  const subscription = subscriptions.get(userId);
  if (!subscription) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  const payload = JSON.stringify({
    title,
    body,
    url,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
  });

  try {
    await webpush.sendNotification(subscription, payload);
    res.json({ message: 'Notification sent' });
  } catch (error) {
    console.error('Error sending notification:', error);

    // 410 Goneエラー = 購読が無効
    if ((error as any).statusCode === 410) {
      subscriptions.delete(userId);
    }

    res.status(500).json({ error: 'Failed to send notification' });
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### データベースでの購読管理（Prisma）

```prisma
// schema.prisma
model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
}
```

```typescript
// push-service.ts
import { PrismaClient } from '@prisma/client';
import webpush from 'web-push';

const prisma = new PrismaClient();

export class PushService {
  // 購読の保存
  async saveSubscription(
    userId: string,
    subscription: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    }
  ) {
    return await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      update: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
  }

  // 特定ユーザーに送信
  async sendToUser(userId: string, payload: any) {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    const results = await Promise.allSettled(
      subscriptions.map(sub =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        )
      )
    );

    // 失敗した購読を削除
    const failedSubscriptions = results
      .map((result, index) => {
        if (result.status === 'rejected' &&
            (result.reason as any).statusCode === 410) {
          return subscriptions[index].id;
        }
      })
      .filter(Boolean);

    if (failedSubscriptions.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { id: { in: failedSubscriptions as string[] } },
      });
    }

    return {
      sent: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
    };
  }

  // 全ユーザーに送信
  async sendToAll(payload: any) {
    const subscriptions = await prisma.pushSubscription.findMany();

    const results = await Promise.allSettled(
      subscriptions.map(sub =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        )
      )
    );

    return {
      sent: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
    };
  }
}
```

## 高度な通知機能

### 通知のカスタマイズ

```javascript
// sw.js
self.addEventListener('push', (event) => {
  const data = event.data.json();

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/badge-72.png',
    image: data.image, // 大きな画像
    vibrate: [200, 100, 200], // バイブレーションパターン
    data: {
      url: data.url,
      timestamp: Date.now(),
    },
    tag: data.tag || 'default', // 同じtagは上書き
    renotify: true, // 再通知
    requireInteraction: data.urgent, // ユーザーが閉じるまで表示
    actions: [
      {
        action: 'view',
        title: '開く',
        icon: '/icons/open.png',
      },
      {
        action: 'dismiss',
        title: '閉じる',
        icon: '/icons/close.png',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
```

### 通知アクションの処理

```javascript
// sw.js
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    // "開く" ボタン
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  } else if (event.action === 'dismiss') {
    // "閉じる" ボタン
    console.log('Notification dismissed');
  } else {
    // 通知本体をクリック
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
```

### サイレント通知（バックグラウンド同期）

```javascript
// sw.js
self.addEventListener('push', (event) => {
  const data = event.data.json();

  if (data.silent) {
    // 通知を表示せず、データだけ処理
    event.waitUntil(
      syncData(data).then(() => {
        // クライアントに通知
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SILENT_PUSH',
              data: data,
            });
          });
        });
      })
    );
  } else {
    // 通常の通知
    event.waitUntil(
      self.registration.showNotification(data.title, data.options)
    );
  }
});

async function syncData(data) {
  // データベースやキャッシュを更新
  const cache = await caches.open('data-cache');
  await cache.put(data.url, new Response(JSON.stringify(data.content)));
}
```

## 実践的なユースケース

### チャットアプリの新着メッセージ通知

```typescript
// server.ts
interface ChatMessage {
  id: string;
  from: string;
  content: string;
  roomId: string;
}

async function notifyNewMessage(message: ChatMessage, recipientUserId: string) {
  const pushService = new PushService();

  await pushService.sendToUser(recipientUserId, {
    title: `New message from ${message.from}`,
    body: message.content.substring(0, 100),
    icon: `/avatars/${message.from}.png`,
    url: `/chat/${message.roomId}`,
    tag: `chat-${message.roomId}`, // 同じルームの通知は上書き
    requireInteraction: false,
    actions: [
      { action: 'reply', title: 'Reply' },
      { action: 'view', title: 'View' },
    ],
  });
}
```

### ECサイトの在庫復活通知

```typescript
// product-service.ts
async function notifyProductAvailable(productId: string) {
  // このプロダクトを待機リストに入れているユーザーを取得
  const waitingUsers = await prisma.productWaitlist.findMany({
    where: { productId },
    include: { user: true },
  });

  const pushService = new PushService();

  for (const { user } of waitingUsers) {
    await pushService.sendToUser(user.id, {
      title: 'Product back in stock!',
      body: 'The product you wanted is now available',
      icon: '/product-icon.png',
      image: `/products/${productId}/image.jpg`,
      url: `/products/${productId}`,
      tag: `product-${productId}`,
      requireInteraction: true,
      actions: [
        { action: 'buy', title: 'Buy Now' },
        { action: 'view', title: 'View' },
      ],
    });
  }
}
```

## パフォーマンスとベストプラクティス

### 1. 通知の頻度制限

```typescript
// rate-limiter.ts
class NotificationRateLimiter {
  private limits = new Map<string, number[]>();
  private maxPerHour = 5;

  canSend(userId: string): boolean {
    const now = Date.now();
    const userLimits = this.limits.get(userId) || [];

    // 1時間以内の通知をフィルタ
    const recentNotifications = userLimits.filter(
      time => now - time < 60 * 60 * 1000
    );

    if (recentNotifications.length >= this.maxPerHour) {
      return false;
    }

    recentNotifications.push(now);
    this.limits.set(userId, recentNotifications);
    return true;
  }
}
```

### 2. バッチ送信

```typescript
// batch-sender.ts
async function sendBatchNotifications(
  notifications: Array<{ userId: string; payload: any }>
) {
  // 100件ずつバッチ処理
  const batchSize = 100;
  const pushService = new PushService();

  for (let i = 0; i < notifications.length; i += batchSize) {
    const batch = notifications.slice(i, i + batchSize);

    await Promise.allSettled(
      batch.map(({ userId, payload }) =>
        pushService.sendToUser(userId, payload)
      )
    );

    // レート制限を避けるため、少し待つ
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
```

### 3. 通知の優先度

```typescript
interface NotificationPriority {
  urgent: boolean;
  ttl: number; // Time To Live (秒)
}

async function sendPriorityNotification(
  userId: string,
  payload: any,
  priority: NotificationPriority
) {
  const subscription = await getSubscription(userId);

  await webpush.sendNotification(
    subscription,
    JSON.stringify(payload),
    {
      urgency: priority.urgent ? 'high' : 'normal',
      TTL: priority.ttl,
    }
  );
}
```

## セキュリティ対策

### 1. エンドポイントの検証

```typescript
function isValidPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    // 信頼できるPush Serviceのみ許可
    const trustedDomains = [
      'fcm.googleapis.com',
      'updates.push.services.mozilla.com',
      'web.push.apple.com',
    ];
    return trustedDomains.some(domain => url.hostname.endsWith(domain));
  } catch {
    return false;
  }
}
```

### 2. ペイロードの暗号化

web-pushライブラリが自動的に暗号化しますが、追加のセキュリティ層を実装できます。

```typescript
import crypto from 'crypto';

function encryptSensitiveData(data: any, key: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}
```

## まとめ

Web Push通知は、ユーザーエンゲージメントを高める強力なツールです。

**実装のポイント:**

1. **Service Worker** - バックグラウンド処理の要
2. **VAPID認証** - サーバー認証で安全な通信
3. **購読管理** - データベースで永続化
4. **通知戦略** - 頻度制限とパーソナライゼーション
5. **UX最適化** - 適切なタイミングで許可リクエスト

**ベストプラクティス:**
- 通知の送りすぎに注意（1日5件まで）
- ユーザーに価値を提供する通知のみ
- 簡単に解除できる仕組み
- パフォーマンスとバッテリー消費に配慮

Web Push通知を適切に実装することで、ネイティブアプリと遜色ないユーザー体験を提供できます。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)

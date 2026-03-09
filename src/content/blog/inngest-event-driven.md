---
title: "Inngestでイベント駆動のバックグラウンドジョブを実装する"
description: "Inngestを使って、イベント駆動のバックグラウンドジョブを簡単に実装する方法を解説します。リトライ、スケジューリング、並行処理など、RedisやRabbitMQ不要で非同期処理を実現できます。"
pubDate: "2025-02-05"
tags: ['DevOps', 'バックエンド', 'プログラミング']
heroImage: '../../assets/thumbnails/inngest-event-driven.jpg'
---
Webアプリケーションを開発していると、重い処理をバックグラウンドで実行したり、特定のイベントに応じて処理を実行したりする必要が出てきます。従来は、RedisやRabbitMQなどのメッセージキューを使って自前で実装する必要がありましたが、**Inngest**を使えば、これらの機能を簡単に実装できます。

この記事では、Inngestの基本から実践的な使い方まで、詳しく解説します。

## Inngestとは？

[Inngest](https://www.inngest.com/)は、イベント駆動のバックグラウンドジョブを実装するためのプラットフォームです。以下のような特徴があります。

- **イベント駆動**: イベントをトリガーにして関数を実行
- **リトライ機能**: 失敗時の自動リトライ
- **スケジューリング**: cron形式でのスケジュール実行
- **並行処理制御**: 並行実行数の制限
- **ステップ機能**: 複数のステップに分けて実行
- **開発者体験**: TypeScriptフルサポート、ローカル開発環境

## なぜInngestを使うのか？

従来のバックグラウンドジョブの実装では、以下のような課題がありました。

### 従来の課題

```typescript
// 従来のアプローチ
app.post('/api/user/register', async (req, res) => {
  const user = await createUser(req.body);

  // これは同期処理なので、レスポンスが遅くなる
  await sendWelcomeEmail(user.email);
  await createStripeCustomer(user.id);
  await notifySlack(`New user: ${user.email}`);

  res.json({ success: true });
});
```

この実装には以下の問題があります。

1. **レスポンスが遅い**: すべての処理が終わるまでレスポンスを返せない
2. **リトライがない**: メール送信に失敗したら、ユーザーは再登録する必要がある
3. **監視が困難**: どの処理が失敗したのか、ログを見ないとわからない
4. **スケールしない**: トラフィックが増えると、サーバーがパンクする

### Inngestを使った解決

```typescript
// Inngestを使ったアプローチ
app.post('/api/user/register', async (req, res) => {
  const user = await createUser(req.body);

  // イベントを送信するだけ（非同期）
  await inngest.send({
    name: "app/user.registered",
    data: { userId: user.id, email: user.email }
  });

  res.json({ success: true }); // すぐにレスポンスを返せる
});

// バックグラウンドで実行される関数
inngest.createFunction(
  { id: "user-registration-workflow" },
  { event: "app/user.registered" },
  async ({ event, step }) => {
    // ステップごとに実行され、失敗時は該当ステップからリトライ
    await step.run("send-welcome-email", async () => {
      await sendWelcomeEmail(event.data.email);
    });

    await step.run("create-stripe-customer", async () => {
      await createStripeCustomer(event.data.userId);
    });

    await step.run("notify-slack", async () => {
      await notifySlack(`New user: ${event.data.email}`);
    });
  }
);
```

このアプローチの利点は以下の通りです。

1. **即座にレスポンス**: イベント送信だけなので、数ミリ秒でレスポンスを返せる
2. **自動リトライ**: 失敗したステップだけを自動的にリトライ
3. **可視化**: Inngestのダッシュボードで実行状況を確認できる
4. **スケーラブル**: イベント駆動なので、トラフィックが増えても安心

## セットアップ

### インストール

```bash
npm install inngest
```

### Inngestクライアントの初期化

```typescript
// src/inngest/client.ts
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "my-app",
  // 本番環境では環境変数から取得
  eventKey: process.env.INNGEST_EVENT_KEY
});
```

### Next.jsでのセットアップ

Next.jsの場合、API Routeを作成します。

```typescript
// app/api/inngest/route.ts (App Router)
import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { functions } from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: functions,
});
```

```typescript
// pages/api/inngest.ts (Pages Router)
import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { functions } from "@/inngest/functions";

export default serve({
  client: inngest,
  functions: functions,
});
```

## 基本的な関数の作成

### シンプルな関数

```typescript
// src/inngest/functions/hello.ts
import { inngest } from "../client";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "app/hello" },
  async ({ event, step }) => {
    console.log("Hello", event.data.name);
    return { message: `Hello, ${event.data.name}!` };
  }
);
```

### イベントの送信

```typescript
// どこからでもイベントを送信できる
await inngest.send({
  name: "app/hello",
  data: { name: "World" }
});
```

## ステップ機能

ステップ機能を使うと、関数を複数のステップに分けて実行できます。各ステップは独立してリトライされるため、長時間実行される処理に最適です。

### 基本的なステップ

```typescript
export const processOrder = inngest.createFunction(
  { id: "process-order" },
  { event: "shop/order.created" },
  async ({ event, step }) => {
    // ステップ1: 在庫確認
    const inventory = await step.run("check-inventory", async () => {
      return await checkInventory(event.data.items);
    });

    if (!inventory.available) {
      throw new Error("Out of stock");
    }

    // ステップ2: 決済処理
    const payment = await step.run("process-payment", async () => {
      return await processPayment(event.data.paymentMethod);
    });

    // ステップ3: 配送手配
    await step.run("arrange-shipping", async () => {
      return await arrangeShipping(event.data.address);
    });

    // ステップ4: メール送信
    await step.run("send-confirmation-email", async () => {
      return await sendEmail({
        to: event.data.email,
        subject: "Order Confirmation",
        body: `Your order #${event.data.orderId} has been confirmed.`
      });
    });

    return { success: true, orderId: event.data.orderId };
  }
);
```

### ステップ間でのデータの受け渡し

```typescript
export const dataFlowExample = inngest.createFunction(
  { id: "data-flow" },
  { event: "app/data.flow" },
  async ({ event, step }) => {
    // ステップ1の結果を取得
    const user = await step.run("fetch-user", async () => {
      return await db.user.findUnique({
        where: { id: event.data.userId }
      });
    });

    // ステップ2でステップ1の結果を使う
    const posts = await step.run("fetch-user-posts", async () => {
      return await db.post.findMany({
        where: { authorId: user.id }
      });
    });

    // ステップ3で両方の結果を使う
    await step.run("generate-report", async () => {
      return await generateReport({
        userName: user.name,
        postCount: posts.length,
        posts: posts
      });
    });
  }
);
```

## スリープとスケジューリング

### ステップ内でのスリープ

```typescript
export const delayedNotification = inngest.createFunction(
  { id: "delayed-notification" },
  { event: "app/trial.started" },
  async ({ event, step }) => {
    // 7日間待つ
    await step.sleep("wait-7-days", "7d");

    // 7日後にリマインダーを送信
    await step.run("send-reminder", async () => {
      return await sendEmail({
        to: event.data.email,
        subject: "Your trial is ending soon",
        body: "Upgrade to continue using our service."
      });
    });
  }
);
```

### Cron形式でのスケジュール実行

```typescript
export const dailyReport = inngest.createFunction(
  { id: "daily-report" },
  { cron: "0 9 * * *" }, // 毎日9時に実行
  async ({ step }) => {
    const stats = await step.run("fetch-stats", async () => {
      return await db.stats.aggregate();
    });

    await step.run("send-report", async () => {
      return await sendEmail({
        to: "admin@example.com",
        subject: "Daily Report",
        body: JSON.stringify(stats, null, 2)
      });
    });
  }
);
```

## リトライとエラーハンドリング

### 自動リトライの設定

```typescript
export const unreliableAPI = inngest.createFunction(
  {
    id: "call-unreliable-api",
    retries: 5, // 最大5回リトライ
  },
  { event: "app/api.call" },
  async ({ event }) => {
    const response = await fetch("https://unreliable-api.example.com", {
      method: "POST",
      body: JSON.stringify(event.data)
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    return await response.json();
  }
);
```

### カスタムリトライロジック

```typescript
export const smartRetry = inngest.createFunction(
  {
    id: "smart-retry",
    retries: 3,
    onFailure: async ({ error, event }) => {
      // 失敗時の処理
      await logError({
        functionId: "smart-retry",
        error: error.message,
        event: event
      });

      // Slackに通知
      await notifySlack({
        channel: "#errors",
        message: `Function failed: ${error.message}`
      });
    }
  },
  { event: "app/critical.task" },
  async ({ event, step }) => {
    // 重要な処理
    await step.run("critical-operation", async () => {
      return await performCriticalOperation(event.data);
    });
  }
);
```

## 並行処理制御

### 並行実行数の制限

```typescript
export const rateLimitedFunction = inngest.createFunction(
  {
    id: "rate-limited",
    concurrency: {
      limit: 5, // 同時に5つまで実行
    }
  },
  { event: "app/expensive.operation" },
  async ({ event }) => {
    // 重い処理
    return await expensiveOperation(event.data);
  }
);
```

### ユーザーごとの並行実行制限

```typescript
export const perUserLimit = inngest.createFunction(
  {
    id: "per-user-limit",
    concurrency: {
      limit: 1,
      key: "event.data.userId" // ユーザーごとに1つずつ実行
    }
  },
  { event: "app/user.export" },
  async ({ event, step }) => {
    await step.run("generate-export", async () => {
      return await generateUserExport(event.data.userId);
    });

    await step.run("upload-to-s3", async () => {
      return await uploadToS3(event.data.userId);
    });

    await step.run("send-email", async () => {
      return await sendDownloadLink(event.data.email);
    });
  }
);
```

## 実践的な例

### ユーザー登録フロー

```typescript
export const userRegistrationWorkflow = inngest.createFunction(
  { id: "user-registration-workflow" },
  { event: "app/user.registered" },
  async ({ event, step }) => {
    // ウェルカムメール送信
    await step.run("send-welcome-email", async () => {
      return await sendEmail({
        to: event.data.email,
        template: "welcome",
        data: { name: event.data.name }
      });
    });

    // Stripe顧客作成
    const customer = await step.run("create-stripe-customer", async () => {
      return await stripe.customers.create({
        email: event.data.email,
        name: event.data.name,
        metadata: { userId: event.data.userId }
      });
    });

    // DBに保存
    await step.run("save-stripe-id", async () => {
      return await db.user.update({
        where: { id: event.data.userId },
        data: { stripeCustomerId: customer.id }
      });
    });

    // アナリティクスに送信
    await step.run("track-registration", async () => {
      return await analytics.track({
        userId: event.data.userId,
        event: "User Registered",
        properties: { email: event.data.email }
      });
    });

    // 3日後にオンボーディングメール
    await step.sleep("wait-3-days", "3d");
    await step.run("send-onboarding-email", async () => {
      return await sendEmail({
        to: event.data.email,
        template: "onboarding",
        data: { name: event.data.name }
      });
    });
  }
);
```

### Webhook処理

```typescript
export const processStripeWebhook = inngest.createFunction(
  { id: "process-stripe-webhook" },
  { event: "stripe/payment.succeeded" },
  async ({ event, step }) => {
    const payment = event.data;

    // 注文を更新
    await step.run("update-order", async () => {
      return await db.order.update({
        where: { id: payment.metadata.orderId },
        data: { status: "paid" }
      });
    });

    // 領収書メール送信
    await step.run("send-receipt", async () => {
      return await sendEmail({
        to: payment.customer_email,
        template: "receipt",
        data: { payment }
      });
    });

    // サブスクリプションの場合、アクセス権を付与
    if (payment.metadata.subscription) {
      await step.run("grant-access", async () => {
        return await db.user.update({
          where: { email: payment.customer_email },
          data: { plan: "premium", subscriptionId: payment.subscription }
        });
      });
    }
  }
);
```

### データ集計ジョブ

```typescript
export const hourlyAnalytics = inngest.createFunction(
  { id: "hourly-analytics" },
  { cron: "0 * * * *" }, // 毎時0分に実行
  async ({ step }) => {
    const startTime = await step.run("get-time-range", async () => {
      const now = new Date();
      return new Date(now.getTime() - 60 * 60 * 1000); // 1時間前
    });

    // ページビュー集計
    const pageviews = await step.run("aggregate-pageviews", async () => {
      return await db.pageview.count({
        where: { createdAt: { gte: startTime } }
      });
    });

    // アクティブユーザー集計
    const activeUsers = await step.run("count-active-users", async () => {
      return await db.pageview.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: startTime } },
        _count: true
      });
    });

    // 結果を保存
    await step.run("save-analytics", async () => {
      return await db.analytics.create({
        data: {
          timestamp: startTime,
          pageviews,
          activeUsers: activeUsers.length
        }
      });
    });
  }
);
```

## ローカル開発

Inngestは、ローカル開発環境を提供しています。

### Inngest Dev Serverの起動

```bash
npx inngest-cli@latest dev
```

これにより、`http://localhost:8288`でInngestのダッシュボードが起動します。

### アプリケーションの起動

```bash
npm run dev
```

Next.jsアプリが起動したら、Inngest Dev Serverが自動的に関数を検出します。

### イベントの送信テスト

ダッシュボードから、手動でイベントを送信してテストできます。

## デプロイ

### Vercelへのデプロイ

1. Inngestアカウントを作成（無料プランあり）
2. Event Keyを取得
3. Vercelの環境変数に設定

```bash
INNGEST_EVENT_KEY=your_event_key
INNGEST_SIGNING_KEY=your_signing_key
```

4. デプロイ後、InngestダッシュボードでアプリのURLを登録

```
https://your-app.vercel.app/api/inngest
```

### その他のプラットフォーム

Inngestは、Next.js以外にも以下のプラットフォームに対応しています。

- Remix
- SvelteKit
- Express
- Fastify
- AWS Lambda
- Cloudflare Workers

## まとめ

Inngestを使えば、イベント駆動のバックグラウンドジョブを簡単に実装できます。

**メリット**

- イベント駆動で疎結合な設計
- 自動リトライで信頼性の高い処理
- ステップ機能で長時間実行される処理にも対応
- TypeScriptフルサポートで開発体験が良い
- ローカル開発環境が充実

**使い所**

- ユーザー登録後の処理
- Webhook処理
- データ集計ジョブ
- メール送信
- 外部API連携
- 長時間実行される処理

バックグラウンドジョブの実装に悩んでいる方は、ぜひInngestを試してみてください。
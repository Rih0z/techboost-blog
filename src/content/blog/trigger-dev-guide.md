---
title: 'Trigger.dev：バックグラウンドジョブフレームワーク完全ガイド'
description: 'Trigger.dev v3を使ったバックグラウンドジョブの構築方法。タスク定義、スケジュール、リトライ、Next.js/Express統合まで実践的に解説します。Trigger.dev・バックグラウンドジョブ・Next.jsに関する実践情報。'
pubDate: '2026-02-05'
tags: ['Trigger.dev', 'バックグラウンドジョブ', 'Next.js', 'TypeScript', 'ワークフロー']
---

バックグラウンドジョブの管理は、スケーラブルなアプリケーション開発において重要な要素です。長時間実行される処理、定期的なタスク、外部APIとの連携など、様々な場面でバックグラウンドジョブが必要になります。

Trigger.devは、TypeScriptファーストなバックグラウンドジョブフレームワークで、開発者体験と信頼性を重視した設計が特徴です。この記事では、Trigger.dev v3の基本から実践的な使い方まで、詳しく解説していきます。

## Trigger.devとは

Trigger.devは、長時間実行されるバックグラウンドジョブとワークフローを構築するためのプラットフォームです。

### 主な特徴

- **TypeScriptファースト**: 完全な型安全性
- **長時間実行対応**: 数時間〜数日の処理も可能
- **視覚的なダッシュボード**: リアルタイム監視
- **自動リトライ**: エラー時の再試行
- **スケジューリング**: Cron式対応
- **統合**: Next.js、Remix、Express、Fastifyなど
- **ローカル開発**: 充実した開発ツール

### v3の新機能（2025〜）

- **より高速な実行**: パフォーマンスが大幅向上
- **改善された課金モデル**: より予測可能な料金体系
- **新しいSDK**: よりシンプルなAPI
- **エッジ対応**: Cloudflare Workers対応

### 競合との比較

**Trigger.dev vs Inngest**
- Trigger.devは長時間ジョブに強い
- Inngestはイベント駆動に特化
- 料金体系が異なる（実行時間 vs ステップ数）

**Trigger.dev vs BullMQ**
- Trigger.devはクラウドホスト、BullMQはセルフホスト
- Trigger.devは開発者体験が優れている
- BullMQは無料でRedisベース

## セットアップ

### インストール

```bash
npm install @trigger.dev/sdk@latest
# または
pnpm add @trigger.dev/sdk@latest
```

### CLIのインストール

```bash
npm install -g @trigger.dev/cli@latest
```

### プロジェクトの初期化

```bash
# Next.jsプロジェクトの場合
npx trigger.dev@latest init

# 対話形式で設定
? What is your Trigger.dev API key? [your-api-key]
? Where should we create the trigger directory? trigger/
? Which framework are you using? Next.js (App Router)
```

### 環境変数

`.env.local` に以下を追加します。

```bash
# Trigger.dev
TRIGGER_API_KEY=your_api_key
TRIGGER_API_URL=https://api.trigger.dev
```

Trigger.devのダッシュボード（https://cloud.trigger.dev/）でAPIキーを取得します。

## 基本的な使い方

### 最初のタスク

シンプルなバックグラウンドタスクを作成してみましょう。

```typescript
// trigger/example.ts
import { task } from "@trigger.dev/sdk/v3";

export const helloWorldTask = task({
  id: "hello-world",
  run: async (payload: { name: string }) => {
    console.log(`Hello, ${payload.name}!`);
    return {
      message: `Hello, ${payload.name}!`,
      timestamp: new Date().toISOString(),
    };
  },
});
```

### タスクのトリガー

Next.jsのAPI routeからタスクを実行します。

```typescript
// app/api/trigger-hello/route.ts
import { helloWorldTask } from "@/trigger/example";

export async function POST(request: Request) {
  const { name } = await request.json();

  const handle = await helloWorldTask.trigger({
    name,
  });

  return Response.json({
    id: handle.id,
    message: "Task triggered successfully",
  });
}
```

### Next.jsとの統合

Next.jsのApp Routerと統合するには、専用のエンドポイントを作成します。

```typescript
// app/api/trigger/route.ts
import { createAppRoute } from "@trigger.dev/nextjs";
import { client } from "@/trigger/client";

// タスクをインポート
import "@/trigger/example";

export const { POST, dynamic } = createAppRoute(client);
```

### クライアントの設定

```typescript
// trigger/client.ts
import { TriggerClient } from "@trigger.dev/sdk";

export const client = new TriggerClient({
  id: "my-app",
  apiKey: process.env.TRIGGER_API_KEY!,
  apiUrl: process.env.TRIGGER_API_URL,
});
```

## タスクの詳細

### ペイロードとバリデーション

Zodを使ってペイロードを検証できます。

```typescript
// trigger/tasks/send-email.ts
import { task } from "@trigger.dev/sdk/v3";
import { z } from "zod";

const payloadSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  body: z.string(),
});

export const sendEmailTask = task({
  id: "send-email",
  run: async (payload: z.infer<typeof payloadSchema>) => {
    // ペイロード検証
    const validated = payloadSchema.parse(payload);

    // メール送信処理
    const result = await sendEmail({
      to: validated.to,
      subject: validated.subject,
      body: validated.body,
    });

    return { success: true, messageId: result.id };
  },
});
```

### リトライ設定

```typescript
// trigger/tasks/api-call.ts
import { task, retry } from "@trigger.dev/sdk/v3";

export const apiCallTask = task({
  id: "api-call",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
    randomize: true,
  },
  run: async (payload: { url: string }) => {
    const response = await fetch(payload.url);

    if (!response.ok) {
      // リトライをトリガー
      throw new Error(`API call failed: ${response.status}`);
    }

    return await response.json();
  },
});
```

### タイムアウト設定

```typescript
export const longRunningTask = task({
  id: "long-running",
  timeout: "30m", // 30分でタイムアウト
  run: async (payload) => {
    // 長時間実行される処理
    await processLargeDataset(payload.datasetId);
    return { success: true };
  },
});
```

## スケジュールタスク

### Cron式でのスケジュール

```typescript
// trigger/tasks/daily-report.ts
import { task, schedules } from "@trigger.dev/sdk/v3";

export const dailyReportTask = task({
  id: "daily-report",
  run: async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const stats = await db.getStatsForDate(yesterday);

    await sendEmail({
      to: "admin@example.com",
      subject: "Daily Report",
      body: formatReport(stats),
    });

    return { success: true, stats };
  },
});

// スケジュール設定
schedules.create({
  task: dailyReportTask,
  cron: "0 9 * * *", // 毎日9時
  timezone: "Asia/Tokyo",
});
```

### インターバルスケジュール

```typescript
import { task, schedules } from "@trigger.dev/sdk/v3";

export const healthCheckTask = task({
  id: "health-check",
  run: async () => {
    const services = await checkAllServices();
    const failedServices = services.filter((s) => !s.healthy);

    if (failedServices.length > 0) {
      await sendAlert({
        message: `Services down: ${failedServices.map((s) => s.name).join(", ")}`,
      });
    }

    return { healthy: failedServices.length === 0 };
  },
});

// 5分ごとに実行
schedules.create({
  task: healthCheckTask,
  interval: "5m",
});
```

## 並列処理とバッチ

### 並列タスク実行

```typescript
// trigger/tasks/batch-processing.ts
import { task, batch } from "@trigger.dev/sdk/v3";

export const processImageTask = task({
  id: "process-image",
  run: async (payload: { imageUrl: string }) => {
    const processed = await processImage(payload.imageUrl);
    return { success: true, url: processed.url };
  },
});

export const batchImageProcessing = task({
  id: "batch-image-processing",
  run: async (payload: { imageUrls: string[] }) => {
    // 並列実行（最大10個まで同時）
    const results = await batch.run(
      payload.imageUrls.map((url) => ({
        task: processImageTask,
        payload: { imageUrl: url },
      })),
      { maxConcurrency: 10 }
    );

    const successful = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);

    return {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
    };
  },
});
```

### チャンク処理

大量のデータを分割して処理します。

```typescript
// trigger/tasks/bulk-email.ts
import { task } from "@trigger.dev/sdk/v3";

export const sendBulkEmailTask = task({
  id: "send-bulk-email",
  run: async (payload: { userIds: string[]; template: string }) => {
    const CHUNK_SIZE = 100;
    const chunks = [];

    // ユーザーIDをチャンクに分割
    for (let i = 0; i < payload.userIds.length; i += CHUNK_SIZE) {
      chunks.push(payload.userIds.slice(i, i + CHUNK_SIZE));
    }

    let sent = 0;
    let failed = 0;

    // 各チャンクを処理
    for (const chunk of chunks) {
      const users = await db.user.findMany({
        where: { id: { in: chunk } },
      });

      for (const user of users) {
        try {
          await sendEmail({
            to: user.email,
            template: payload.template,
            data: { name: user.name },
          });
          sent++;
        } catch (error) {
          console.error(`Failed to send to ${user.email}:`, error);
          failed++;
        }
      }

      // レート制限対策で少し待つ
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return { sent, failed, total: payload.userIds.length };
  },
});
```

## Webhookとの統合

### Webhook受信タスク

```typescript
// trigger/tasks/webhook-handler.ts
import { task } from "@trigger.dev/sdk/v3";

export const stripeWebhookTask = task({
  id: "stripe-webhook",
  run: async (payload: { event: any }) => {
    const { type, data } = payload.event;

    switch (type) {
      case "payment_intent.succeeded":
        await handlePaymentSuccess(data.object);
        break;

      case "payment_intent.failed":
        await handlePaymentFailure(data.object);
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(data.object);
        break;

      default:
        console.log(`Unhandled event type: ${type}`);
    }

    return { processed: true, type };
  },
});

async function handlePaymentSuccess(paymentIntent: any) {
  await db.payment.update({
    where: { stripeId: paymentIntent.id },
    data: { status: "succeeded" },
  });

  await sendReceiptEmail(paymentIntent.customer);
}

async function handlePaymentFailure(paymentIntent: any) {
  await db.payment.update({
    where: { stripeId: paymentIntent.id },
    data: { status: "failed" },
  });

  await sendPaymentFailedEmail(paymentIntent.customer);
}

async function handleSubscriptionCreated(subscription: any) {
  await db.subscription.create({
    data: {
      stripeId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  });
}
```

### Webhook APIエンドポイント

```typescript
// app/api/webhooks/stripe/route.ts
import { stripeWebhookTask } from "@/trigger/tasks/webhook-handler";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return new Response("Webhook signature verification failed", {
      status: 400,
    });
  }

  // バックグラウンドで処理
  await stripeWebhookTask.trigger({ event });

  return new Response("Webhook received", { status: 200 });
}
```

## 実践例

### メール送信キュー

```typescript
// trigger/tasks/email-queue.ts
import { task } from "@trigger.dev/sdk/v3";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export const sendEmailTask = task({
  id: "send-email",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
  },
  run: async (payload: EmailPayload) => {
    const result = await resend.emails.send({
      from: payload.from || "noreply@example.com",
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });

    if (result.error) {
      throw new Error(`Failed to send email: ${result.error.message}`);
    }

    // ログを記録
    await db.emailLog.create({
      data: {
        to: payload.to,
        subject: payload.subject,
        status: "sent",
        messageId: result.data!.id,
        sentAt: new Date(),
      },
    });

    return { success: true, messageId: result.data!.id };
  },
});

// 使用例
export const welcomeEmailTask = task({
  id: "welcome-email",
  run: async (payload: { userId: string }) => {
    const user = await db.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    await sendEmailTask.trigger({
      to: user.email,
      subject: "Welcome to Our Platform!",
      html: `
        <h1>Welcome, ${user.name}!</h1>
        <p>Thank you for signing up.</p>
      `,
    });

    return { success: true };
  },
});
```

### データ同期タスク

```typescript
// trigger/tasks/data-sync.ts
import { task, schedules } from "@trigger.dev/sdk/v3";

export const syncUsersTask = task({
  id: "sync-users",
  timeout: "1h",
  run: async () => {
    let page = 1;
    let hasMore = true;
    let totalSynced = 0;

    while (hasMore) {
      // 外部APIからユーザーデータ取得
      const response = await fetch(
        `https://api.external.com/users?page=${page}&limit=100`,
        {
          headers: {
            Authorization: `Bearer ${process.env.EXTERNAL_API_TOKEN}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const users = data.users;

      // データベースに保存
      for (const user of users) {
        await db.user.upsert({
          where: { externalId: user.id },
          update: {
            name: user.name,
            email: user.email,
            updatedAt: new Date(),
          },
          create: {
            externalId: user.id,
            name: user.name,
            email: user.email,
          },
        });
        totalSynced++;
      }

      hasMore = data.hasMore;
      page++;

      // レート制限対策
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return {
      success: true,
      totalSynced,
      pages: page - 1,
    };
  },
});

// 毎時実行
schedules.create({
  task: syncUsersTask,
  cron: "0 * * * *",
});
```

### 画像処理パイプライン

```typescript
// trigger/tasks/image-pipeline.ts
import { task } from "@trigger.dev/sdk/v3";
import sharp from "sharp";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: "us-east-1" });

export const processImageTask = task({
  id: "process-image",
  run: async (payload: { imageUrl: string; imageId: string }) => {
    // 画像ダウンロード
    const response = await fetch(payload.imageUrl);
    const imageBuffer = Buffer.from(await response.arrayBuffer());

    // 各サイズの画像を作成
    const sizes = [
      { name: "thumbnail", width: 150, height: 150 },
      { name: "medium", width: 800, height: 800 },
      { name: "large", width: 1920, height: 1920 },
    ];

    const results = await Promise.all(
      sizes.map(async (size) => {
        const processed = await sharp(imageBuffer)
          .resize(size.width, size.height, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality: 85 })
          .toBuffer();

        const key = `images/${payload.imageId}/${size.name}.jpg`;

        await s3.send(
          new PutObjectCommand({
            Bucket: "my-bucket",
            Key: key,
            Body: processed,
            ContentType: "image/jpeg",
          })
        );

        return {
          size: size.name,
          key,
          url: `https://cdn.example.com/${key}`,
        };
      })
    );

    // データベース更新
    await db.image.update({
      where: { id: payload.imageId },
      data: {
        thumbnailUrl: results.find((r) => r.size === "thumbnail")?.url,
        mediumUrl: results.find((r) => r.size === "medium")?.url,
        largeUrl: results.find((r) => r.size === "large")?.url,
        processed: true,
      },
    });

    return { success: true, results };
  },
});
```

### レポート生成

```typescript
// trigger/tasks/report-generation.ts
import { task, schedules } from "@trigger.dev/sdk/v3";
import { PDFDocument } from "pdf-lib";

export const generateMonthlyReportTask = task({
  id: "generate-monthly-report",
  timeout: "30m",
  run: async (payload: { month: string; year: number }) => {
    // データ収集
    const startDate = new Date(payload.year, parseInt(payload.month) - 1, 1);
    const endDate = new Date(payload.year, parseInt(payload.month), 0);

    const [users, orders, revenue] = await Promise.all([
      db.user.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      db.order.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      db.order.aggregate({
        _sum: { amount: true },
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: "completed",
        },
      }),
    ]);

    // PDFレポート作成
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();

    page.drawText(`Monthly Report - ${payload.month}/${payload.year}`, {
      x: 50,
      y: 750,
      size: 20,
    });

    page.drawText(`New Users: ${users}`, { x: 50, y: 700, size: 14 });
    page.drawText(`Total Orders: ${orders}`, { x: 50, y: 680, size: 14 });
    page.drawText(`Revenue: $${revenue._sum.amount || 0}`, {
      x: 50,
      y: 660,
      size: 14,
    });

    const pdfBytes = await pdfDoc.save();

    // S3にアップロード
    const key = `reports/${payload.year}/${payload.month}/monthly-report.pdf`;
    await s3.send(
      new PutObjectCommand({
        Bucket: "my-reports-bucket",
        Key: key,
        Body: pdfBytes,
        ContentType: "application/pdf",
      })
    );

    // 管理者に通知
    await sendEmailTask.trigger({
      to: "admin@example.com",
      subject: `Monthly Report Ready - ${payload.month}/${payload.year}`,
      html: `
        <p>The monthly report is ready.</p>
        <a href="https://reports.example.com/${key}">Download Report</a>
      `,
    });

    return {
      success: true,
      reportUrl: `https://reports.example.com/${key}`,
      stats: { users, orders, revenue: revenue._sum.amount },
    };
  },
});

// 毎月1日の午前9時に実行
schedules.create({
  task: generateMonthlyReportTask,
  cron: "0 9 1 * *",
  timezone: "Asia/Tokyo",
});
```

## ローカル開発

### 開発サーバーの起動

```bash
npm run dev:trigger
# または
npx trigger.dev@latest dev
```

このコマンドで、ローカルの開発環境とTrigger.devが接続されます。

### ダッシュボード

Trigger.devのダッシュボード（https://cloud.trigger.dev/）で、以下が確認できます。

- タスクの実行履歴
- リアルタイムログ
- エラーとリトライ
- スケジュール一覧

### テスト実行

```typescript
// scripts/test-task.ts
import { helloWorldTask } from "@/trigger/example";

async function test() {
  const handle = await helloWorldTask.trigger({
    name: "Test User",
  });

  console.log("Task triggered:", handle.id);

  // 結果を待つ
  const result = await handle.wait();
  console.log("Result:", result);
}

test().catch(console.error);
```

実行：

```bash
npx tsx scripts/test-task.ts
```

## デプロイ

### Vercelへのデプロイ

```bash
# 環境変数を設定
vercel env add TRIGGER_API_KEY

# デプロイ
vercel --prod
```

### 他のプラットフォーム

- **Netlify**: Netlify Functions
- **Railway**: Node.jsアプリとしてデプロイ
- **Render**: Webサービスとしてデプロイ

## ベストプラクティス

### 1. タスクを小さく保つ

```typescript
// Good: 各タスクは1つの責任
export const processOrder = task({
  id: "process-order",
  run: async (payload) => {
    await validateOrder(payload.orderId);
    await chargePayment(payload.orderId);
    await sendConfirmation(payload.orderId);
  },
});

// Better: タスクを分割
export const validateOrderTask = task({ /* ... */ });
export const chargePaymentTask = task({ /* ... */ });
export const sendConfirmationTask = task({ /* ... */ });
```

### 2. 冪等性を確保

```typescript
export const processPaymentTask = task({
  id: "process-payment",
  run: async (payload: { paymentId: string }) => {
    // すでに処理済みかチェック
    const existing = await db.payment.findUnique({
      where: { id: payload.paymentId },
    });

    if (existing?.status === "completed") {
      return { message: "Already processed" };
    }

    // 処理実行
    const result = await processPayment(payload.paymentId);

    return result;
  },
});
```

### 3. エラーハンドリング

```typescript
export const robustTask = task({
  id: "robust-task",
  run: async (payload) => {
    try {
      const result = await riskyOperation(payload);
      return { success: true, result };
    } catch (error) {
      // ログ記録
      await db.errorLog.create({
        data: {
          taskId: "robust-task",
          error: error.message,
          payload,
        },
      });

      // 特定のエラーはリトライしない
      if (error instanceof ValidationError) {
        return { success: false, error: error.message };
      }

      // その他はリトライ
      throw error;
    }
  },
});
```

## まとめ

Trigger.devは、TypeScriptファーストなバックグラウンドジョブフレームワークです。主な利点は以下の通りです。

- **開発者体験**: 型安全で直感的なAPI
- **信頼性**: 自動リトライと監視
- **長時間実行**: 数時間〜数日の処理も対応
- **可視性**: リアルタイムダッシュボード

複雑なバックグラウンド処理を簡単に構築でき、ローカル開発環境も充実しています。スケーラブルなアプリケーション開発において、Trigger.devは強力な選択肢となるでしょう。

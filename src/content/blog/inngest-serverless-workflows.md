---
title: 'Inngest実践ガイド: サーバーレスワークフローとバックグラウンドジョブの構築'
description: 'Inngestを使った複雑なワークフロー、リトライ戦略、スケジューリング、イベント駆動処理の実装方法を、実践的なユースケースと共に解説します。'
pubDate: '2025-07-08'
updatedDate: '2025-07-08'
tags: ['Inngest', 'Serverless', 'Workflows', 'Background Jobs', 'Event-Driven', 'インフラ']
category: 'backend'
---

## はじめに

Inngestは、サーバーレス環境でのバックグラウンドジョブとワークフローを簡単に構築できるプラットフォームです。リトライ、スケジューリング、並列処理、イベント駆動などの機能がビルトインで提供され、複雑な非同期処理を宣言的に記述できます。

この記事では、Inngestを使った実践的なワークフロー構築、高度なパターン、そしてプロダクション運用のベストプラクティスを解説します。

## Inngestの特徴

- **イベント駆動**: イベントをトリガーとして関数を実行
- **ステップ関数**: 複雑なワークフローを段階的に実行
- **自動リトライ**: エラー時の自動リトライとバックオフ
- **スケジューリング**: Cron式でのジョブスケジュール
- **並列処理**: ファンアウト/ファンイン パターンのサポート
- **型安全**: TypeScriptファーストの設計
- **デバッグ機能**: ローカル開発サーバーとUIダッシュボード

## セットアップ

### プロジェクトの初期化

```bash
npm install inngest
```

### Inngestクライアントの作成

```typescript
// src/inngest/client.ts
import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'my-app',
  name: 'My Application',
  schemas: new EventSchemas().from<{
    'user/signup': {
      data: {
        userId: string;
        email: string;
        name: string;
      };
    };
    'order/created': {
      data: {
        orderId: string;
        userId: string;
        amount: number;
      };
    };
    'subscription/cancelled': {
      data: {
        userId: string;
        subscriptionId: string;
        reason: string;
      };
    };
  }>(),
});
```

### Next.js/Remixでの統合

```typescript
// app/api/inngest/route.ts (Next.js App Router)
import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { functions } from '@/inngest/functions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
```

```typescript
// app/routes/api.inngest.ts (Remix)
import { serve } from 'inngest/remix';
import { inngest } from '@/inngest/client';
import { functions } from '@/inngest/functions';

const handler = serve({
  client: inngest,
  functions,
});

export const loader = handler;
export const action = handler;
```

## 基本的な関数の作成

### シンプルなバックグラウンドジョブ

```typescript
// src/inngest/functions/send-welcome-email.ts
import { inngest } from '../client';

export const sendWelcomeEmail = inngest.createFunction(
  {
    id: 'send-welcome-email',
    name: 'Send Welcome Email',
  },
  { event: 'user/signup' },
  async ({ event, step }) => {
    // ステップ1: ユーザーデータの取得
    const user = await step.run('fetch-user', async () => {
      return await db.user.findUnique({
        where: { id: event.data.userId },
      });
    });

    // ステップ2: メール送信
    await step.run('send-email', async () => {
      await emailService.send({
        to: user.email,
        subject: 'Welcome to our platform!',
        template: 'welcome',
        data: { name: user.name },
      });
    });

    // ステップ3: オンボーディングフラグの更新
    await step.run('update-user', async () => {
      await db.user.update({
        where: { id: user.id },
        data: { onboarded: true },
      });
    });

    return { success: true };
  }
);
```

### イベントの送信

```typescript
// app/api/signup/route.ts
import { inngest } from '@/inngest/client';

export async function POST(request: Request) {
  const { email, password, name } = await request.json();

  // ユーザー作成
  const user = await db.user.create({
    data: { email, password: await hash(password), name },
  });

  // Inngestイベントを送信
  await inngest.send({
    name: 'user/signup',
    data: {
      userId: user.id,
      email: user.email,
      name: user.name,
    },
  });

  return Response.json({ user });
}
```

## 複雑なワークフロー

### 注文処理のワークフロー

```typescript
// src/inngest/functions/process-order.ts
import { inngest } from '../client';

export const processOrder = inngest.createFunction(
  {
    id: 'process-order',
    name: 'Process Order Workflow',
  },
  { event: 'order/created' },
  async ({ event, step }) => {
    const { orderId, userId, amount } = event.data;

    // 1. 在庫確認
    const inventory = await step.run('check-inventory', async () => {
      const order = await db.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      for (const item of order.items) {
        const product = await db.product.findUnique({
          where: { id: item.productId },
        });

        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }
      }

      return { available: true };
    });

    // 2. 決済処理
    const payment = await step.run('process-payment', async () => {
      const paymentResult = await paymentService.charge({
        userId,
        amount,
        orderId,
      });

      if (!paymentResult.success) {
        throw new Error('Payment failed');
      }

      return paymentResult;
    });

    // 3. 在庫更新（並列処理）
    await step.run('update-inventory', async () => {
      const order = await db.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      await Promise.all(
        order.items.map((item) =>
          db.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          })
        )
      );
    });

    // 4. 配送ラベル作成
    const shipping = await step.run('create-shipping-label', async () => {
      return await shippingService.createLabel({ orderId });
    });

    // 5. 注文確認メール送信
    await step.run('send-confirmation-email', async () => {
      const user = await db.user.findUnique({ where: { id: userId } });

      await emailService.send({
        to: user.email,
        subject: 'Order Confirmation',
        template: 'order-confirmation',
        data: {
          orderId,
          amount,
          trackingNumber: shipping.trackingNumber,
        },
      });
    });

    // 6. 注文ステータス更新
    await step.run('update-order-status', async () => {
      await db.order.update({
        where: { id: orderId },
        data: {
          status: 'PROCESSING',
          paymentId: payment.id,
          trackingNumber: shipping.trackingNumber,
        },
      });
    });

    return {
      orderId,
      paymentId: payment.id,
      trackingNumber: shipping.trackingNumber,
    };
  }
);
```

## 高度なパターン

### ファンアウト/ファンイン

複数のイベントを並列処理し、すべての完了を待つパターン。

```typescript
// src/inngest/functions/generate-reports.ts
import { inngest } from '../client';

export const generateMonthlyReports = inngest.createFunction(
  {
    id: 'generate-monthly-reports',
    name: 'Generate Monthly Reports',
  },
  { cron: '0 0 1 * *' }, // 毎月1日の0時
  async ({ step }) => {
    // レポート生成が必要なユーザーを取得
    const users = await step.run('fetch-users', async () => {
      return await db.user.findMany({
        where: { subscriptionStatus: 'ACTIVE' },
      });
    });

    // ファンアウト: 各ユーザーのレポート生成イベントを送信
    await step.run('fan-out', async () => {
      await Promise.all(
        users.map((user) =>
          inngest.send({
            name: 'report/generate',
            data: { userId: user.id },
          })
        )
      );
    });

    return { totalUsers: users.length };
  }
);

// 個別レポート生成
export const generateUserReport = inngest.createFunction(
  {
    id: 'generate-user-report',
    name: 'Generate User Report',
  },
  { event: 'report/generate' },
  async ({ event, step }) => {
    const { userId } = event.data;

    // レポートデータの収集
    const data = await step.run('collect-data', async () => {
      const [orders, usage, revenue] = await Promise.all([
        db.order.findMany({ where: { userId } }),
        db.usage.aggregate({ where: { userId } }),
        db.payment.aggregate({ where: { userId } }),
      ]);

      return { orders, usage, revenue };
    });

    // PDF生成
    const pdf = await step.run('generate-pdf', async () => {
      return await pdfService.generate({
        template: 'monthly-report',
        data,
      });
    });

    // S3にアップロード
    const url = await step.run('upload-to-s3', async () => {
      return await s3.upload({
        key: `reports/${userId}/${Date.now()}.pdf`,
        body: pdf,
      });
    });

    // メール送信
    await step.run('send-email', async () => {
      const user = await db.user.findUnique({ where: { id: userId } });

      await emailService.send({
        to: user.email,
        subject: 'Your Monthly Report',
        template: 'report-ready',
        data: { reportUrl: url },
      });
    });

    return { userId, reportUrl: url };
  }
);
```

### 待機とスリープ

```typescript
// src/inngest/functions/trial-expiration.ts
import { inngest } from '../client';

export const trialExpirationFlow = inngest.createFunction(
  {
    id: 'trial-expiration-flow',
    name: 'Trial Expiration Reminder Flow',
  },
  { event: 'user/trial-started' },
  async ({ event, step }) => {
    const { userId } = event.data;

    // 5日後にリマインダー送信
    await step.sleep('wait-5-days', '5d');

    const user = await step.run('fetch-user', async () => {
      return await db.user.findUnique({ where: { id: userId } });
    });

    // まだトライアル中か確認
    if (user.subscriptionStatus === 'TRIAL') {
      await step.run('send-reminder-5-days', async () => {
        await emailService.send({
          to: user.email,
          subject: '5 days left in your trial',
          template: 'trial-reminder-5',
        });
      });
    }

    // さらに3日待機（トライアル開始から8日後）
    await step.sleep('wait-3-more-days', '3d');

    const updatedUser = await step.run('fetch-user-again', async () => {
      return await db.user.findUnique({ where: { id: userId } });
    });

    if (updatedUser.subscriptionStatus === 'TRIAL') {
      await step.run('send-reminder-2-days', async () => {
        await emailService.send({
          to: updatedUser.email,
          subject: 'Only 2 days left in your trial',
          template: 'trial-reminder-2',
        });
      });
    }

    // さらに2日待機（トライアル終了日）
    await step.sleep('wait-until-expiration', '2d');

    const finalUser = await step.run('fetch-final-user', async () => {
      return await db.user.findUnique({ where: { id: userId } });
    });

    // まだ有料プランに変換していない場合
    if (finalUser.subscriptionStatus === 'TRIAL') {
      await step.run('expire-trial', async () => {
        await db.user.update({
          where: { id: userId },
          data: { subscriptionStatus: 'EXPIRED' },
        });

        await emailService.send({
          to: finalUser.email,
          subject: 'Your trial has expired',
          template: 'trial-expired',
        });
      });
    }

    return { userId, status: finalUser.subscriptionStatus };
  }
);
```

### イベント待機（waitForEvent）

```typescript
// src/inngest/functions/payment-verification.ts
import { inngest } from '../client';

export const paymentVerification = inngest.createFunction(
  {
    id: 'payment-verification',
    name: 'Payment Verification Flow',
  },
  { event: 'payment/initiated' },
  async ({ event, step }) => {
    const { paymentId } = event.data;

    // 外部決済プロバイダーに問い合わせ
    await step.run('request-payment', async () => {
      await paymentProvider.initiatePayment(paymentId);
    });

    // 5分以内にwebhookイベントが来るのを待つ
    const result = await step.waitForEvent('wait-for-webhook', {
      event: 'payment/webhook',
      timeout: '5m',
      match: 'data.paymentId',
    });

    if (result) {
      // Webhookが届いた場合
      await step.run('mark-as-paid', async () => {
        await db.payment.update({
          where: { id: paymentId },
          data: { status: 'PAID' },
        });

        await inngest.send({
          name: 'payment/completed',
          data: { paymentId },
        });
      });
    } else {
      // タイムアウトした場合
      await step.run('handle-timeout', async () => {
        await db.payment.update({
          where: { id: paymentId },
          data: { status: 'TIMEOUT' },
        });

        await inngest.send({
          name: 'payment/failed',
          data: { paymentId, reason: 'timeout' },
        });
      });
    }

    return { paymentId, status: result ? 'completed' : 'timeout' };
  }
);
```

## リトライとエラーハンドリング

### カスタムリトライ設定

```typescript
// src/inngest/functions/send-sms.ts
import { inngest } from '../client';
import { NonRetriableError } from 'inngest';

export const sendSMS = inngest.createFunction(
  {
    id: 'send-sms',
    name: 'Send SMS Notification',
    retries: 5,
  },
  { event: 'notification/sms' },
  async ({ event, step, attempt }) => {
    console.log(`Attempt ${attempt} of 5`);

    const result = await step.run('send-sms', async () => {
      try {
        return await smsService.send({
          to: event.data.phoneNumber,
          message: event.data.message,
        });
      } catch (error) {
        // 電話番号が無効な場合はリトライしない
        if (error.code === 'INVALID_PHONE_NUMBER') {
          throw new NonRetriableError('Invalid phone number');
        }

        // それ以外はリトライ
        throw error;
      }
    });

    return result;
  }
);
```

### ステップレベルのリトライ

```typescript
// src/inngest/functions/data-sync.ts
import { inngest } from '../client';

export const dataSync = inngest.createFunction(
  {
    id: 'data-sync',
    name: 'Sync Data from External API',
  },
  { cron: '0 */6 * * *' }, // 6時間ごと
  async ({ step }) => {
    // 外部APIからデータ取得（最大10回リトライ）
    const data = await step.run(
      'fetch-external-data',
      async () => {
        return await externalAPI.fetchData();
      },
      {
        retries: {
          attempts: 10,
          // エクスポネンシャルバックオフ
          backoff: (attempt) => `${Math.pow(2, attempt)}s`,
        },
      }
    );

    // データベースに保存（リトライなし）
    await step.run(
      'save-to-db',
      async () => {
        await db.externalData.createMany({ data });
      },
      {
        retries: {
          attempts: 0,
        },
      }
    );

    return { synced: data.length };
  }
);
```

## スケジューリング

### Cron式でのジョブ実行

```typescript
// src/inngest/functions/scheduled-jobs.ts
import { inngest } from '../client';

// 毎日午前3時にデータベースバックアップ
export const dailyBackup = inngest.createFunction(
  {
    id: 'daily-backup',
    name: 'Daily Database Backup',
  },
  { cron: '0 3 * * *' },
  async ({ step }) => {
    const backupUrl = await step.run('create-backup', async () => {
      return await db.createBackup();
    });

    await step.run('upload-to-s3', async () => {
      await s3.upload({
        key: `backups/db-${Date.now()}.sql`,
        url: backupUrl,
      });
    });

    await step.run('notify-admin', async () => {
      await emailService.send({
        to: 'admin@example.com',
        subject: 'Daily backup completed',
        template: 'backup-complete',
      });
    });

    return { success: true };
  }
);

// 毎週月曜日の午前9時にレポート送信
export const weeklyReport = inngest.createFunction(
  {
    id: 'weekly-report',
    name: 'Weekly Analytics Report',
  },
  { cron: '0 9 * * MON' },
  async ({ step }) => {
    const analytics = await step.run('gather-analytics', async () => {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      return await analyticsService.getReport({ startDate, endDate });
    });

    await step.run('send-to-team', async () => {
      const admins = await db.user.findMany({ where: { role: 'ADMIN' } });

      await Promise.all(
        admins.map((admin) =>
          emailService.send({
            to: admin.email,
            subject: 'Weekly Analytics Report',
            template: 'weekly-report',
            data: analytics,
          })
        )
      );
    });

    return { sent: true };
  }
);
```

## ローカル開発とデバッグ

### 開発サーバーの起動

```bash
npx inngest-cli@latest dev
```

ブラウザで `http://localhost:8288` を開くと、Inngestの開発UIが表示されます。

### イベントのテスト送信

```typescript
// scripts/test-event.ts
import { inngest } from '../src/inngest/client';

async function main() {
  await inngest.send({
    name: 'user/signup',
    data: {
      userId: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
    },
  });

  console.log('Event sent successfully');
}

main();
```

```bash
tsx scripts/test-event.ts
```

## プロダクション運用

### 環境変数の設定

```env
# .env
INNGEST_EVENT_KEY=your_event_key
INNGEST_SIGNING_KEY=your_signing_key
```

### モニタリングとアラート

```typescript
// src/inngest/functions/critical-job.ts
import { inngest } from '../client';

export const criticalJob = inngest.createFunction(
  {
    id: 'critical-job',
    name: 'Critical Background Job',
    onFailure: async ({ error, event, runId }) => {
      // 失敗時にSlack通知
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `❌ Critical job failed: ${error.message}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Job:* ${event.name}\n*Run ID:* ${runId}\n*Error:* ${error.message}`,
              },
            },
          ],
        }),
      });
    },
  },
  { event: 'critical/task' },
  async ({ event, step }) => {
    // クリティカルな処理
    await step.run('critical-operation', async () => {
      // ...
    });
  }
);
```

## まとめ

Inngestは、サーバーレス環境での複雑なワークフローとバックグラウンドジョブを簡潔に実装できる強力なプラットフォームです。ステップ関数、リトライ、スケジューリング、イベント待機などの機能により、エンタープライズレベルの非同期処理を構築できます。

主なメリット:

- 宣言的なワークフロー定義
- 自動リトライとエラーハンドリング
- ローカル開発とデバッグの容易さ
- 型安全なイベントシステム
- スケーラブルなアーキテクチャ

複雑な非同期処理やワークフローが必要なプロジェクトでは、Inngestの導入を検討する価値があります。

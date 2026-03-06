---
title: 'Inngest：イベント駆動バックグラウンドジョブ完全ガイド'
description: 'Inngestを使ったイベント駆動バックグラウンドジョブの構築方法。ステップ関数、スケジュール、リトライ、Next.js統合まで実践的に解説します。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。'
pubDate: '2026-02-05'
tags: ['Inngest', 'バックグラウンドジョブ', 'Next.js', 'TypeScript', 'イベント駆動']
---

バックグラウンドジョブの管理は、モダンなWebアプリケーション開発において避けて通れない課題です。メール送信、画像処理、データ同期など、時間のかかる処理をユーザーを待たせずに実行したい場面は数多くあります。

Inngestは、イベント駆動型のバックグラウンドジョブフレームワークで、開発者体験に優れた設計が特徴です。この記事では、Inngestの基本から実践的な使い方まで、詳しく解説していきます。

## Inngestとは

Inngestは、イベント駆動型のバックグラウンドジョブとワークフローを構築するためのプラットフォームです。主な特徴は以下の通りです。

### 主な特徴

- **TypeScriptファースト**: 型安全な開発体験
- **イベント駆動**: イベントベースのトリガー
- **ステップ関数**: 複雑なワークフローを簡単に構築
- **自動リトライ**: エラー時の自動再試行
- **スケジューリング**: Cron式でのジョブスケジュール
- **開発者体験**: ローカル開発サーバーとダッシュボード
- **無料枠**: 月25,000ステップまで無料

### 競合との比較

Inngestは以下のツールと比較されることが多いです。

**Inngest vs BullMQ**
- Inngestはサーバーレス向き、BullMQはRedis必須
- Inngestは型安全、BullMQは動的
- Inngestは有料プランあり、BullMQは完全オープンソース

**Inngest vs Trigger.dev**
- 両方ともTypeScriptファースト
- Inngestはイベント駆動、Trigger.devはタスク駆動
- 料金体系が異なる（Inngestはステップ数、Trigger.devは実行時間）

## セットアップ

### インストール

まずは必要なパッケージをインストールします。

```bash
npm install inngest
# または
pnpm add inngest
# または
yarn add inngest
```

### Inngestクライアントの作成

プロジェクトのルートに `inngest` ディレクトリを作成し、クライアントを初期化します。

```typescript
// inngest/client.ts
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "my-app",
  name: "My Application"
});
```

### 環境変数の設定

`.env.local` に以下を追加します。

```bash
# 開発環境
INNGEST_EVENT_KEY=your_event_key
INNGEST_SIGNING_KEY=your_signing_key

# 本番環境
INNGEST_SIGNING_KEY=your_production_signing_key
```

Inngestのダッシュボード（https://www.inngest.com/）でアカウントを作成し、APIキーを取得します。

## 基本的な使い方

### 最初のファンクション

シンプルなバックグラウンドジョブを作成してみましょう。

```typescript
// inngest/functions/hello.ts
import { inngest } from "../client";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "app/hello.world" },
  async ({ event, step }) => {
    await step.run("say-hello", async () => {
      console.log(`Hello, ${event.data.name}!`);
      return { message: `Hello, ${event.data.name}!` };
    });
  }
);
```

### イベントの送信

作成したファンクションは、イベントを送信することで実行されます。

```typescript
// app/api/trigger-hello/route.ts
import { inngest } from "@/inngest/client";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { name } = await request.json();

  await inngest.send({
    name: "app/hello.world",
    data: {
      name,
    },
  });

  return NextResponse.json({ message: "Event sent" });
}
```

### Next.jsとの統合

Next.jsのApp Routerと統合するには、API routeを作成します。

```typescript
// app/api/inngest/route.ts
import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { helloWorld } from "@/inngest/functions/hello";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    helloWorld,
    // 他のファンクションもここに追加
  ],
});
```

このエンドポイントが、Inngestとアプリケーションの橋渡しをします。

## ステップ関数

ステップ関数は、Inngestの最も強力な機能の一つです。複雑なワークフローを簡単に構築できます。

### ステップの基本

```typescript
// inngest/functions/user-onboarding.ts
import { inngest } from "../client";

export const userOnboarding = inngest.createFunction(
  { id: "user-onboarding" },
  { event: "app/user.created" },
  async ({ event, step }) => {
    // ステップ1: ウェルカムメール送信
    const emailResult = await step.run("send-welcome-email", async () => {
      await sendEmail({
        to: event.data.email,
        subject: "Welcome!",
        body: "Thank you for signing up!",
      });
      return { sent: true };
    });

    // ステップ2: ユーザープロファイル作成
    const profile = await step.run("create-user-profile", async () => {
      return await db.userProfile.create({
        data: {
          userId: event.data.userId,
          displayName: event.data.name,
        },
      });
    });

    // ステップ3: 通知送信
    await step.run("send-slack-notification", async () => {
      await sendSlackMessage({
        channel: "#new-users",
        text: `New user signed up: ${event.data.name}`,
      });
    });

    return { success: true, profileId: profile.id };
  }
);
```

### ステップの利点

各ステップは独立して実行され、失敗した場合はそのステップからリトライされます。すべてのステップを最初からやり直す必要はありません。

```typescript
// ステップ1が成功 → ステップ2が失敗 → リトライ時はステップ2から再開
```

### 並列実行

複数のステップを並列実行することもできます。

```typescript
export const parallelProcessing = inngest.createFunction(
  { id: "parallel-processing" },
  { event: "app/image.uploaded" },
  async ({ event, step }) => {
    // 並列実行
    const [thumbnail, webp, metadata] = await Promise.all([
      step.run("create-thumbnail", async () => {
        return await createThumbnail(event.data.imageUrl);
      }),
      step.run("convert-to-webp", async () => {
        return await convertToWebP(event.data.imageUrl);
      }),
      step.run("extract-metadata", async () => {
        return await extractMetadata(event.data.imageUrl);
      }),
    ]);

    // すべて完了後に実行
    await step.run("save-results", async () => {
      await db.image.update({
        where: { id: event.data.imageId },
        data: {
          thumbnail: thumbnail.url,
          webp: webp.url,
          metadata: metadata,
        },
      });
    });
  }
);
```

## スリープとウェイト

時間をあけて処理を実行したい場合、`step.sleep` を使います。

```typescript
export const delayedNotification = inngest.createFunction(
  { id: "delayed-notification" },
  { event: "app/trial.started" },
  async ({ event, step }) => {
    // 7日後に実行
    await step.sleep("wait-7-days", "7d");

    // トライアル終了3日前の通知
    await step.run("send-reminder", async () => {
      await sendEmail({
        to: event.data.email,
        subject: "Your trial is ending soon!",
        body: "Only 3 days left in your trial.",
      });
    });
  }
);
```

時間の指定方法：
- `"1h"` - 1時間
- `"30m"` - 30分
- `"7d"` - 7日
- `"2w"` - 2週間

## イベント待機

他のイベントを待ってから処理を続けることもできます。

```typescript
export const paymentFlow = inngest.createFunction(
  { id: "payment-flow" },
  { event: "app/payment.initiated" },
  async ({ event, step }) => {
    // 決済処理
    await step.run("process-payment", async () => {
      await processPayment(event.data.paymentId);
    });

    // 決済完了イベントを最大1時間待つ
    const paymentEvent = await step.waitForEvent("wait-for-payment", {
      event: "app/payment.completed",
      timeout: "1h",
      match: "data.paymentId",
    });

    if (paymentEvent) {
      // 決済成功
      await step.run("send-receipt", async () => {
        await sendReceipt(event.data.userId, paymentEvent.data);
      });
    } else {
      // タイムアウト
      await step.run("handle-timeout", async () => {
        await cancelPayment(event.data.paymentId);
      });
    }
  }
);
```

## スケジュールジョブ

Cron式を使って定期実行ジョブを設定できます。

### 基本的なスケジュール

```typescript
// inngest/functions/daily-report.ts
import { inngest } from "../client";

export const dailyReport = inngest.createFunction(
  { id: "daily-report" },
  { cron: "0 9 * * *" }, // 毎日9時に実行
  async ({ step }) => {
    const report = await step.run("generate-report", async () => {
      const stats = await db.getYesterdayStats();
      return stats;
    });

    await step.run("send-report", async () => {
      await sendEmail({
        to: "admin@example.com",
        subject: "Daily Report",
        body: JSON.stringify(report, null, 2),
      });
    });
  }
);
```

### 複数のスケジュール

```typescript
export const multiSchedule = inngest.createFunction(
  { id: "multi-schedule" },
  { cron: ["0 9 * * *", "0 17 * * *"] }, // 9時と17時
  async ({ step }) => {
    const hour = new Date().getHours();

    if (hour === 9) {
      await step.run("morning-task", async () => {
        // 朝のタスク
      });
    } else {
      await step.run("evening-task", async () => {
        // 夕方のタスク
      });
    }
  }
);
```

### タイムゾーン指定

```typescript
export const tokyoSchedule = inngest.createFunction(
  { id: "tokyo-schedule" },
  {
    cron: "0 9 * * *",
    timezone: "Asia/Tokyo" // 日本時間で9時
  },
  async ({ step }) => {
    // 処理
  }
);
```

## リトライとエラーハンドリング

### 自動リトライ

Inngestはデフォルトでエラー時に自動的にリトライします。

```typescript
export const reliableJob = inngest.createFunction(
  {
    id: "reliable-job",
    retries: 3, // 最大3回リトライ
  },
  { event: "app/api.call" },
  async ({ event, step }) => {
    const result = await step.run("call-external-api", async () => {
      // 失敗すると自動的にリトライされる
      const response = await fetch("https://api.example.com/data");
      if (!response.ok) throw new Error("API call failed");
      return await response.json();
    });

    return result;
  }
);
```

### カスタムリトライ設定

```typescript
export const customRetry = inngest.createFunction(
  {
    id: "custom-retry",
    retries: {
      attempts: 5,
      // リトライ間隔を指数バックオフで設定
      backoff: {
        type: "exponential",
        base: 2, // 2秒から開始
        max: 60, // 最大60秒
      },
    },
  },
  { event: "app/heavy.task" },
  async ({ event, step }) => {
    // 処理
  }
);
```

### エラーハンドリング

```typescript
export const errorHandling = inngest.createFunction(
  { id: "error-handling" },
  { event: "app/process.data" },
  async ({ event, step }) => {
    try {
      const result = await step.run("risky-operation", async () => {
        // リスクのある操作
        return await riskyOperation(event.data);
      });

      await step.run("handle-success", async () => {
        await notifySuccess(result);
      });
    } catch (error) {
      // エラー処理
      await step.run("handle-error", async () => {
        await logError(error);
        await notifyAdmin(error);
      });

      // エラーを再スロー（リトライさせる場合）
      throw error;
    }
  }
);
```

## 実践例

### メール送信キュー

```typescript
// inngest/functions/email-queue.ts
import { inngest } from "../client";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmailJob = inngest.createFunction(
  {
    id: "send-email",
    retries: 3,
  },
  { event: "app/email.send" },
  async ({ event, step }) => {
    const { to, subject, body } = event.data;

    const result = await step.run("send-email", async () => {
      return await resend.emails.send({
        from: "noreply@example.com",
        to,
        subject,
        html: body,
      });
    });

    await step.run("log-result", async () => {
      await db.emailLog.create({
        data: {
          to,
          subject,
          status: "sent",
          messageId: result.id,
        },
      });
    });

    return { success: true, messageId: result.id };
  }
);
```

### 画像処理パイプライン

```typescript
// inngest/functions/image-pipeline.ts
import { inngest } from "../client";
import sharp from "sharp";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: "us-east-1" });

export const imageProcessing = inngest.createFunction(
  { id: "image-processing" },
  { event: "app/image.uploaded" },
  async ({ event, step }) => {
    const { imageUrl, imageId } = event.data;

    // 画像をダウンロード
    const imageBuffer = await step.run("download-image", async () => {
      const response = await fetch(imageUrl);
      return Buffer.from(await response.arrayBuffer());
    });

    // サムネイル作成（並列処理）
    const [thumbnail, medium, large] = await Promise.all([
      step.run("create-thumbnail", async () => {
        const buffer = await sharp(imageBuffer)
          .resize(150, 150, { fit: "cover" })
          .jpeg({ quality: 80 })
          .toBuffer();

        const key = `thumbnails/${imageId}.jpg`;
        await s3.send(new PutObjectCommand({
          Bucket: "my-bucket",
          Key: key,
          Body: buffer,
          ContentType: "image/jpeg",
        }));

        return { key, size: buffer.length };
      }),

      step.run("create-medium", async () => {
        const buffer = await sharp(imageBuffer)
          .resize(800, 800, { fit: "inside" })
          .jpeg({ quality: 85 })
          .toBuffer();

        const key = `medium/${imageId}.jpg`;
        await s3.send(new PutObjectCommand({
          Bucket: "my-bucket",
          Key: key,
          Body: buffer,
          ContentType: "image/jpeg",
        }));

        return { key, size: buffer.length };
      }),

      step.run("create-large", async () => {
        const buffer = await sharp(imageBuffer)
          .resize(1920, 1920, { fit: "inside" })
          .jpeg({ quality: 90 })
          .toBuffer();

        const key = `large/${imageId}.jpg`;
        await s3.send(new PutObjectCommand({
          Bucket: "my-bucket",
          Key: key,
          Body: buffer,
          ContentType: "image/jpeg",
        }));

        return { key, size: buffer.length };
      }),
    ]);

    // データベース更新
    await step.run("update-database", async () => {
      await db.image.update({
        where: { id: imageId },
        data: {
          thumbnailUrl: `https://cdn.example.com/${thumbnail.key}`,
          mediumUrl: `https://cdn.example.com/${medium.key}`,
          largeUrl: `https://cdn.example.com/${large.key}`,
          processed: true,
        },
      });
    });

    return {
      success: true,
      sizes: { thumbnail, medium, large },
    };
  }
);
```

### サブスクリプション管理

```typescript
// inngest/functions/subscription.ts
import { inngest } from "../client";

export const trialEndingReminder = inngest.createFunction(
  { id: "trial-ending-reminder" },
  { event: "app/trial.started" },
  async ({ event, step }) => {
    const { userId, email, trialEndsAt } = event.data;

    // 7日目（終了3日前）にリマインダー
    await step.sleep("wait-7-days", "7d");

    await step.run("send-first-reminder", async () => {
      await sendEmail({
        to: email,
        subject: "Your trial is ending in 3 days",
        template: "trial-reminder-3days",
        data: { userId },
      });
    });

    // 9日目（終了1日前）に最終リマインダー
    await step.sleep("wait-2-more-days", "2d");

    await step.run("send-final-reminder", async () => {
      await sendEmail({
        to: email,
        subject: "Last chance! Trial ends tomorrow",
        template: "trial-reminder-1day",
        data: { userId },
      });
    });

    // トライアル終了を待つ
    await step.sleep("wait-until-end", "1d");

    // サブスクリプション状態を確認
    const user = await step.run("check-subscription", async () => {
      return await db.user.findUnique({
        where: { id: userId },
        include: { subscription: true },
      });
    });

    if (!user.subscription) {
      // サブスクリプションなし → アカウント制限
      await step.run("restrict-account", async () => {
        await db.user.update({
          where: { id: userId },
          data: { accountStatus: "restricted" },
        });

        await sendEmail({
          to: email,
          subject: "Your trial has ended",
          template: "trial-ended",
          data: { userId },
        });
      });
    }
  }
);

export const subscriptionCanceled = inngest.createFunction(
  { id: "subscription-canceled" },
  { event: "app/subscription.canceled" },
  async ({ event, step }) => {
    const { userId, cancelsAt } = event.data;

    // キャンセル確認メール
    await step.run("send-cancellation-email", async () => {
      const user = await db.user.findUnique({ where: { id: userId } });
      await sendEmail({
        to: user.email,
        subject: "Subscription canceled",
        template: "subscription-canceled",
        data: {
          userId,
          accessEndsAt: cancelsAt,
        },
      });
    });

    // 期限まで待つ
    const waitTime = new Date(cancelsAt).getTime() - Date.now();
    await step.sleep("wait-until-expiry", `${waitTime}ms`);

    // アクセス制限
    await step.run("revoke-access", async () => {
      await db.user.update({
        where: { id: userId },
        data: {
          accountStatus: "restricted",
          subscriptionId: null,
        },
      });
    });
  }
);
```

### データ同期

```typescript
// inngest/functions/data-sync.ts
import { inngest } from "../client";

export const syncToExternalService = inngest.createFunction(
  {
    id: "sync-to-external",
    retries: 5,
  },
  { event: "app/data.updated" },
  async ({ event, step }) => {
    const { entityType, entityId } = event.data;

    // データ取得
    const data = await step.run("fetch-data", async () => {
      switch (entityType) {
        case "user":
          return await db.user.findUnique({ where: { id: entityId } });
        case "order":
          return await db.order.findUnique({ where: { id: entityId } });
        default:
          throw new Error(`Unknown entity type: ${entityType}`);
      }
    });

    // 外部サービスA に送信
    await step.run("sync-to-service-a", async () => {
      await fetch("https://service-a.example.com/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.SERVICE_A_TOKEN}`,
        },
        body: JSON.stringify(data),
      });
    });

    // 外部サービスB に送信
    await step.run("sync-to-service-b", async () => {
      await fetch("https://service-b.example.com/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.SERVICE_B_TOKEN}`,
        },
        body: JSON.stringify(data),
      });
    });

    // 同期ログ記録
    await step.run("log-sync", async () => {
      await db.syncLog.create({
        data: {
          entityType,
          entityId,
          syncedAt: new Date(),
          services: ["service-a", "service-b"],
        },
      });
    });
  }
);

// 定期的な全データ同期
export const fullSync = inngest.createFunction(
  { id: "full-sync" },
  { cron: "0 2 * * *" }, // 毎日深夜2時
  async ({ step }) => {
    // 未同期のレコードを取得
    const unsyncedRecords = await step.run("fetch-unsynced", async () => {
      return await db.syncLog.findMany({
        where: {
          syncedAt: {
            lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24時間以上前
          },
        },
        take: 100, // バッチサイズ
      });
    });

    // 各レコードの同期イベントを発行
    await step.run("trigger-sync-events", async () => {
      await inngest.send(
        unsyncedRecords.map(record => ({
          name: "app/data.updated",
          data: {
            entityType: record.entityType,
            entityId: record.entityId,
          },
        }))
      );
    });

    return { syncedCount: unsyncedRecords.length };
  }
);
```

## ローカル開発

### 開発サーバーの起動

```bash
npx inngest-cli@latest dev
```

このコマンドで、ローカルの開発環境が立ち上がります。

### ダッシュボード

ブラウザで `http://localhost:8288` を開くと、Inngestの開発ダッシュボードが表示されます。

ここでは以下のことができます。

- 登録されたファンクションの一覧
- イベントの手動送信
- 実行履歴の確認
- ステップごとの実行状況

### イベントのテスト送信

ダッシュボードからイベントを送信してテストできます。

```json
{
  "name": "app/hello.world",
  "data": {
    "name": "Test User"
  }
}
```

## デプロイ

### Vercelへのデプロイ

Vercelにデプロイする場合、特別な設定は不要です。

1. 環境変数を設定

```bash
# Vercel Dashboard で設定
INNGEST_SIGNING_KEY=your_production_signing_key
INNGEST_EVENT_KEY=your_event_key
```

2. デプロイ

```bash
vercel --prod
```

3. Inngestダッシュボードでアプリを同期

Inngestのダッシュボードで、デプロイしたアプリのURLを登録します。

```
https://your-app.vercel.app/api/inngest
```

### 他のプラットフォーム

Inngestは以下のプラットフォームでも動作します。

- **Netlify**: Netlify Functions
- **AWS Lambda**: Serverless Framework
- **Cloudflare Workers**: Hono統合
- **Express**: Node.jsサーバー

## ベストプラクティス

### 1. ステップを小さく保つ

```typescript
// Good
await step.run("send-email", async () => {
  return await sendEmail(data);
});

await step.run("update-database", async () => {
  return await db.update(data);
});

// Bad
await step.run("do-everything", async () => {
  await sendEmail(data);
  await db.update(data);
  await notifySlack(data);
  // リトライ時にすべてやり直し
});
```

### 2. イベント名に規則を設ける

```typescript
// Good
"app/user.created"
"app/order.completed"
"app/payment.failed"

// Bad
"user-created"
"orderComplete"
"PAYMENT_FAILED"
```

### 3. データ検証

```typescript
import { z } from "zod";

const schema = z.object({
  userId: z.string(),
  email: z.string().email(),
});

export const validatedFunction = inngest.createFunction(
  { id: "validated-function" },
  { event: "app/user.created" },
  async ({ event, step }) => {
    // データ検証
    const data = schema.parse(event.data);

    // 以降は型安全
    await step.run("process", async () => {
      await processUser(data.userId, data.email);
    });
  }
);
```

### 4. 冪等性を確保

```typescript
export const idempotentJob = inngest.createFunction(
  { id: "idempotent-job" },
  { event: "app/process.data" },
  async ({ event, step }) => {
    const { requestId } = event.data;

    // すでに処理済みかチェック
    const existing = await step.run("check-existing", async () => {
      return await db.processLog.findUnique({
        where: { requestId },
      });
    });

    if (existing) {
      return { message: "Already processed" };
    }

    // 処理実行
    const result = await step.run("process", async () => {
      return await heavyProcess(event.data);
    });

    // 処理済みマーク
    await step.run("mark-processed", async () => {
      await db.processLog.create({
        data: { requestId, result },
      });
    });

    return result;
  }
);
```

## トラブルシューティング

### よくある問題

**1. ファンクションが実行されない**

- イベント名が正確か確認
- Inngestダッシュボードでアプリが同期されているか確認
- 環境変数が正しく設定されているか確認

**2. タイムアウトエラー**

```typescript
export const longRunningJob = inngest.createFunction(
  {
    id: "long-running-job",
    // タイムアウトを延長
    maxRuntime: "5m",
  },
  { event: "app/heavy.task" },
  async ({ event, step }) => {
    // 処理
  }
);
```

**3. リトライループ**

エラーハンドリングで適切に処理し、必要に応じて例外を再スローしないようにします。

```typescript
await step.run("safe-operation", async () => {
  try {
    return await riskyOperation();
  } catch (error) {
    // ログだけして成功扱い（リトライしない）
    console.error(error);
    return null;
  }
});
```

## まとめ

Inngestは、TypeScriptファーストなイベント駆動バックグラウンドジョブフレームワークです。主な利点は以下の通りです。

- **開発者体験**: 型安全で直感的なAPI
- **信頼性**: 自動リトライとステップ関数
- **スケーラビリティ**: サーバーレス環境に最適
- **可視性**: リアルタイムダッシュボード

複雑なワークフローを簡単に構築でき、ローカル開発環境も充実しています。無料枠も十分なので、小規模なプロジェクトからでも気軽に始められます。

バックグラウンドジョブが必要なプロジェクトでは、Inngestを検討してみてください。

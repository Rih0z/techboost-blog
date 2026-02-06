---
title: 'Trigger.dev：TypeScriptバックグラウンドジョブ実行ガイド'
description: 'Trigger.devを活用したサーバーレスバックグラウンドジョブの実装方法。自動リトライ、スケジューリング、Webhook連携、エラーハンドリングの実践的パターンを解説します。'
pubDate: 'Feb 06 2026'
tags: ['Trigger.dev', 'TypeScript', 'バックグラウンドジョブ', 'サーバーレス', 'Webhook']
---

# Trigger.dev：TypeScriptバックグラウンドジョブ実行ガイド

モダンなWebアプリケーションでは、重い処理をバックグラウンドで実行することが不可欠です。メール送信、画像処理、データ同期、レポート生成など、ユーザーを待たせたくない処理を非同期で実行する必要があります。

Trigger.devは、TypeScriptでバックグラウンドジョブを簡単に構築できるプラットフォームです。この記事では、実践的なジョブ実装パターン、エラーハンドリング、スケジューリング、Webhook連携について詳しく解説します。

## Trigger.devの強み

### サーバーレスファースト

```typescript
// インフラ管理不要で即座にスケール
import { TriggerClient } from "@trigger.dev/sdk";

const client = new TriggerClient({
  id: "my-app",
  apiKey: process.env.TRIGGER_API_KEY!,
});

// コードを書くだけでジョブが動く
client.defineJob({
  id: "send-welcome-email",
  name: "ウェルカムメール送信",
  version: "1.0.0",
  trigger: eventTrigger({
    name: "user.signed_up",
  }),
  run: async (payload, io, ctx) => {
    await io.sendEmail("send-email", {
      to: payload.email,
      subject: "ようこそ！",
      body: "登録ありがとうございます",
    });
  },
});
```

### 自動リトライとエラーハンドリング

```typescript
// リトライ戦略を細かく設定可能
client.defineJob({
  id: "process-payment",
  name: "決済処理",
  version: "1.0.0",
  trigger: eventTrigger({ name: "payment.requested" }),
  retry: {
    maxAttempts: 5,
    minTimeoutInSeconds: 1,
    maxTimeoutInSeconds: 300,
    factor: 2, // 指数バックオフ
  },
  run: async (payload, io, ctx) => {
    // io.runTaskは自動的にリトライされる
    const charge = await io.runTask("charge-card", async () => {
      return await stripe.charges.create({
        amount: payload.amount,
        currency: "jpy",
        source: payload.token,
      });
    });

    if (charge.status !== "succeeded") {
      // エラーをスローするとリトライされる
      throw new Error(`決済失敗: ${charge.failure_message}`);
    }

    return { chargeId: charge.id };
  },
});
```

### リアルタイム監視

ダッシュボードで全ジョブの実行状況をリアルタイムで確認できます。

- 実行中のジョブ
- 失敗したジョブとエラー詳細
- リトライ状況
- 実行時間とパフォーマンス

## 実践的なジョブパターン

### 1. スケジュールジョブ

定期的に実行するジョブは`cronTrigger`または`intervalTrigger`を使用します。

```typescript
import { cronTrigger, intervalTrigger } from "@trigger.dev/sdk";

// Cron式でスケジューリング
client.defineJob({
  id: "daily-report",
  name: "日次レポート生成",
  version: "1.0.0",
  trigger: cronTrigger({
    cron: "0 9 * * *", // 毎日9時
  }),
  run: async (payload, io, ctx) => {
    // 昨日のデータを集計
    const stats = await io.runTask("fetch-stats", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return await db.analytics.aggregate({
        date: yesterday,
      });
    });

    // レポート生成
    const report = await io.runTask("generate-report", async () => {
      return generatePDF(stats);
    });

    // 管理者にメール送信
    await io.sendEmail("send-report", {
      to: "admin@example.com",
      subject: `日次レポート ${new Date().toLocaleDateString()}`,
      attachments: [{ filename: "report.pdf", content: report }],
    });

    return { statsCount: stats.length };
  },
});

// インターバルでスケジューリング
client.defineJob({
  id: "sync-inventory",
  name: "在庫同期",
  version: "1.0.0",
  trigger: intervalTrigger({
    seconds: 300, // 5分ごと
  }),
  run: async (payload, io, ctx) => {
    const products = await io.runTask("fetch-products", async () => {
      return await externalAPI.getProducts();
    });

    await io.runTask("update-database", async () => {
      return await db.products.bulkUpdate(products);
    });

    return { updated: products.length };
  },
});
```

### 2. Webhook連携

外部サービスからのWebhookをトリガーにジョブを実行します。

```typescript
import { webhookEvent } from "@trigger.dev/sdk";

// Stripe Webhookの処理
client.defineJob({
  id: "stripe-webhook-handler",
  name: "Stripe Webhook処理",
  version: "1.0.0",
  trigger: webhookEvent({
    service: "stripe",
    eventName: "payment_intent.succeeded",
  }),
  integrations: { stripe },
  run: async (payload, io, ctx) => {
    const paymentIntent = payload.data.object;

    // ユーザーのサブスクリプションを更新
    await io.runTask("update-subscription", async () => {
      return await db.subscriptions.create({
        userId: paymentIntent.metadata.userId,
        stripePaymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        status: "active",
      });
    });

    // 確認メール送信
    await io.sendEmail("send-confirmation", {
      to: paymentIntent.receipt_email,
      subject: "お支払いが完了しました",
      template: "payment-confirmation",
      data: { amount: paymentIntent.amount },
    });

    // Slackに通知
    await io.slack.postMessage("notify-team", {
      channel: "#sales",
      text: `新規課金: ¥${paymentIntent.amount / 100}`,
    });

    return { success: true };
  },
});

// GitHub Webhookの処理
client.defineJob({
  id: "github-webhook-handler",
  name: "GitHub PR作成時処理",
  version: "1.0.0",
  trigger: webhookEvent({
    service: "github",
    eventName: "pull_request.opened",
  }),
  run: async (payload, io, ctx) => {
    const pr = payload.pull_request;

    // コードレビュー分析
    const analysis = await io.runTask("analyze-pr", async () => {
      const diff = await github.pulls.get({
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        pull_number: pr.number,
      });
      return analyzeDiff(diff.data);
    });

    // コメント投稿
    await io.runTask("post-comment", async () => {
      return await github.issues.createComment({
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        issue_number: pr.number,
        body: formatAnalysis(analysis),
      });
    });

    return { analyzed: true };
  },
});
```

### 3. バッチ処理

大量のデータを処理する場合は、チャンク分割とバッチ処理を活用します。

```typescript
import { batchTrigger } from "@trigger.dev/sdk";

// 大量ユーザーへのメール送信
client.defineJob({
  id: "bulk-email-sender",
  name: "一括メール送信",
  version: "1.0.0",
  trigger: eventTrigger({ name: "campaign.send" }),
  run: async (payload, io, ctx) => {
    // 全ユーザーを取得
    const users = await io.runTask("fetch-users", async () => {
      return await db.users.findMany({
        where: { subscribed: true },
      });
    });

    // 1000件ずつバッチ処理
    const batchSize = 1000;
    const batches = Math.ceil(users.length / batchSize);

    for (let i = 0; i < batches; i++) {
      const batch = users.slice(i * batchSize, (i + 1) * batchSize);

      await io.runTask(`send-batch-${i}`, async () => {
        return await Promise.all(
          batch.map((user) =>
            sendEmail({
              to: user.email,
              subject: payload.subject,
              body: payload.body,
            })
          )
        );
      });

      // レート制限対策で少し待つ
      if (i < batches - 1) {
        await io.wait("rate-limit-wait", 5);
      }
    }

    return { sent: users.length };
  },
});

// 画像一括処理
client.defineJob({
  id: "bulk-image-processor",
  name: "画像一括最適化",
  version: "1.0.0",
  trigger: eventTrigger({ name: "images.optimize" }),
  run: async (payload, io, ctx) => {
    const images = await io.runTask("fetch-images", async () => {
      return await db.images.findMany({
        where: { optimized: false },
      });
    });

    // 並列処理（最大10並列）
    const concurrency = 10;
    const results = [];

    for (let i = 0; i < images.length; i += concurrency) {
      const chunk = images.slice(i, i + concurrency);

      const chunkResults = await Promise.all(
        chunk.map((image, index) =>
          io.runTask(`optimize-${i + index}`, async () => {
            const optimized = await sharp(image.url)
              .resize(1920, 1080, { fit: "inside" })
              .webp({ quality: 80 })
              .toBuffer();

            const uploadedUrl = await uploadToS3(optimized);

            await db.images.update({
              where: { id: image.id },
              data: { optimized: true, optimizedUrl: uploadedUrl },
            });

            return { id: image.id, url: uploadedUrl };
          })
        )
      );

      results.push(...chunkResults);
    }

    return { processed: results.length };
  },
});
```

### 4. チェーンジョブ

複数のジョブを連鎖させて実行します。

```typescript
// ジョブ1: データ収集
const collectDataJob = client.defineJob({
  id: "collect-data",
  name: "データ収集",
  version: "1.0.0",
  trigger: eventTrigger({ name: "pipeline.start" }),
  run: async (payload, io, ctx) => {
    const data = await io.runTask("scrape-data", async () => {
      return await scrapeWebsite(payload.url);
    });

    // 次のジョブをトリガー
    await io.sendEvent("trigger-processing", {
      name: "data.collected",
      payload: { data, sourceUrl: payload.url },
    });

    return { itemCount: data.length };
  },
});

// ジョブ2: データ処理
const processDataJob = client.defineJob({
  id: "process-data",
  name: "データ処理",
  version: "1.0.0",
  trigger: eventTrigger({ name: "data.collected" }),
  run: async (payload, io, ctx) => {
    const processed = await io.runTask("process", async () => {
      return payload.data.map(cleanAndTransform);
    });

    // データベース保存
    await io.runTask("save", async () => {
      return await db.items.createMany({ data: processed });
    });

    // 次のジョブをトリガー
    await io.sendEvent("trigger-notification", {
      name: "data.processed",
      payload: { count: processed.length },
    });

    return { processed: processed.length };
  },
});

// ジョブ3: 通知送信
const notifyJob = client.defineJob({
  id: "notify",
  name: "完了通知",
  version: "1.0.0",
  trigger: eventTrigger({ name: "data.processed" }),
  run: async (payload, io, ctx) => {
    await io.slack.postMessage("notify", {
      channel: "#data-pipeline",
      text: `データパイプライン完了: ${payload.count}件処理しました`,
    });

    return { notified: true };
  },
});
```

## エラーハンドリング

### カスタムリトライロジック

```typescript
client.defineJob({
  id: "api-with-custom-retry",
  name: "カスタムリトライAPI呼び出し",
  version: "1.0.0",
  trigger: eventTrigger({ name: "api.call" }),
  run: async (payload, io, ctx) => {
    const result = await io.runTask(
      "call-api",
      async () => {
        return await externalAPI.call(payload.endpoint);
      },
      {
        retry: {
          maxAttempts: 3,
          factor: 1.5,
          minTimeoutInSeconds: 2,
          maxTimeoutInSeconds: 30,
        },
      }
    );

    return result;
  },
});
```

### 条件付きリトライ

```typescript
client.defineJob({
  id: "conditional-retry",
  name: "条件付きリトライ",
  version: "1.0.0",
  trigger: eventTrigger({ name: "task.execute" }),
  run: async (payload, io, ctx) => {
    try {
      const result = await io.runTask("risky-operation", async () => {
        return await riskyOperation();
      });

      return result;
    } catch (error) {
      // 特定のエラーのみリトライ
      if (error.code === "RATE_LIMIT") {
        // レート制限の場合は60秒待ってリトライ
        await io.wait("rate-limit-wait", 60);
        throw error; // リトライされる
      } else if (error.code === "TEMPORARY_ERROR") {
        // 一時的なエラーはリトライ
        throw error;
      } else {
        // その他のエラーはリトライしない
        await io.logger.error("致命的エラー", { error });
        return { success: false, error: error.message };
      }
    }
  },
});
```

### Dead Letter Queue（DLQ）パターン

```typescript
// メインジョブ
client.defineJob({
  id: "main-job",
  name: "メインジョブ",
  version: "1.0.0",
  trigger: eventTrigger({ name: "task.process" }),
  retry: { maxAttempts: 3 },
  onFailure: async (payload, error, io, ctx) => {
    // 失敗時にDLQに送信
    await io.sendEvent("send-to-dlq", {
      name: "dlq.failed_job",
      payload: {
        originalPayload: payload,
        error: error.message,
        attempts: ctx.attempts,
      },
    });
  },
  run: async (payload, io, ctx) => {
    // メイン処理
    return await processTask(payload);
  },
});

// DLQ処理ジョブ
client.defineJob({
  id: "dlq-handler",
  name: "失敗ジョブ処理",
  version: "1.0.0",
  trigger: eventTrigger({ name: "dlq.failed_job" }),
  run: async (payload, io, ctx) => {
    // 失敗をログに記録
    await io.runTask("log-failure", async () => {
      return await db.failedJobs.create({
        data: {
          payload: payload.originalPayload,
          error: payload.error,
          attempts: payload.attempts,
          timestamp: new Date(),
        },
      });
    });

    // 管理者に通知
    await io.sendEmail("notify-admin", {
      to: "admin@example.com",
      subject: "ジョブ失敗通知",
      body: `ジョブが失敗しました: ${payload.error}`,
    });

    return { logged: true };
  },
});
```

## テストとデバッグ

### ローカルテスト

```typescript
// test/jobs.test.ts
import { createTestClient } from "@trigger.dev/sdk/test";

describe("ジョブテスト", () => {
  it("メール送信ジョブが正しく動作する", async () => {
    const testClient = createTestClient();

    const result = await testClient.runJob("send-welcome-email", {
      email: "test@example.com",
      name: "テストユーザー",
    });

    expect(result.ok).toBe(true);
    expect(result.output).toMatchObject({
      sent: true,
    });
  });
});
```

### 本番環境でのデバッグ

```typescript
client.defineJob({
  id: "debug-job",
  name: "デバッグ付きジョブ",
  version: "1.0.0",
  trigger: eventTrigger({ name: "task.debug" }),
  run: async (payload, io, ctx) => {
    // ログ出力
    await io.logger.info("ジョブ開始", { payload });

    const step1 = await io.runTask("step-1", async () => {
      await io.logger.debug("ステップ1実行中");
      return await doStep1();
    });

    await io.logger.info("ステップ1完了", { result: step1 });

    const step2 = await io.runTask("step-2", async () => {
      await io.logger.debug("ステップ2実行中");
      return await doStep2(step1);
    });

    await io.logger.info("ジョブ完了", { step1, step2 });

    return { step1, step2 };
  },
});
```

## まとめ

Trigger.devを使えば、以下のようなバックグラウンドジョブを簡単に実装できます。

- **スケジュールジョブ**: Cron式やインターバルで定期実行
- **Webhook連携**: 外部サービスのイベントに反応
- **バッチ処理**: 大量データの効率的な処理
- **チェーンジョブ**: 複数ジョブの連鎖実行
- **エラーハンドリング**: 自動リトライとDLQパターン

TypeScriptの型安全性、充実した開発ツール、リアルタイム監視により、信頼性の高いバックグラウンド処理を構築できます。

次のステップとして、実際のプロジェクトでTrigger.devを導入し、ユーザー体験を向上させるバックグラウンド処理を実装してみてください。

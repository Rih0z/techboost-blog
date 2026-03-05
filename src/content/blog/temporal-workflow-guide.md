---
title: 'Temporalでワークフロー自動化 - 複雑な非同期処理を確実に実行【2026年版】'
description: 'Temporalを使った信頼性の高いワークフロー実装を解説。長時間実行ジョブ、リトライ処理、分散タスクなど、実際のコード例で学べるガイドです。'
pubDate: 'Feb 05 2026'
tags: ['Temporal', 'ワークフロー', '非同期処理', 'プログラミング']
---

Temporalは、複雑で長時間実行される非同期処理を確実に実行するためのワークフローエンジンです。Netflix、Stripe、Datadog、Snap、HashiCorpなど、多くの企業が本番環境で採用しています。

## Temporalとは

### 従来の問題

非同期処理で以下のような問題に直面したことはありませんか？

- **APIコールが途中で失敗したらどうする？**
- **サーバーが再起動したらジョブは？**
- **1時間後に実行したい処理は？**
- **複数のマイクロサービスを連携させるには？**

従来の解決策（Redis Queue、Celery、Bull等）では、これらを完全に解決するのは困難です。

### Temporalの解決策

Temporalは、これらの問題を**ワークフロー**という概念で解決します。

**主な特徴:**
- **自動リトライ**: 失敗しても自動で再試行
- **永続性**: サーバー再起動してもワークフロー継続
- **タイムアウト管理**: 複雑なタイムアウト処理が簡単
- **可視性**: 全ワークフローの状態をWeb UIで確認
- **バージョニング**: ワークフローコードの安全な更新

## セットアップ

### Temporal Serverの起動

開発環境ではDocker Composeを使用:

```bash
git clone https://github.com/temporalio/docker-compose.git temporal
cd temporal
docker-compose up
```

Web UI: http://localhost:8233

### TypeScript SDKのインストール

```bash
npm install @temporalio/client @temporalio/worker @temporalio/workflow @temporalio/activity
```

## 基本概念

### 1. Workflow（ワークフロー）

ビジネスロジックのオーケストレーション。決定論的（deterministic）である必要があります。

### 2. Activity（アクティビティ）

外部APIコール、DB操作など、非決定論的な処理。失敗する可能性のある処理はすべてActivityに。

### 3. Worker（ワーカー）

WorkflowとActivityを実行するプロセス。

### 4. Client（クライアント）

Workflowを開始したり、状態を取得するためのクライアント。

## 最初のワークフロー

### Activityの定義

```typescript
// src/activities.ts
export async function sendEmail(to: string, subject: string, body: string) {
  console.log(`Sending email to ${to}: ${subject}`);

  // 実際のメール送信処理（例: SendGrid）
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: "noreply@example.com" },
      subject,
      content: [{ type: "text/plain", value: body }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send email: ${response.statusText}`);
  }

  return { success: true, sentAt: new Date().toISOString() };
}

export async function chargeCustomer(customerId: string, amount: number) {
  console.log(`Charging customer ${customerId} for ${amount}`);

  // Stripe APIを使った課金処理
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100, // セント単位
    currency: "jpy",
    customer: customerId,
  });

  return { paymentIntentId: paymentIntent.id };
}
```

### Workflowの定義

```typescript
// src/workflows.ts
import { proxyActivities, sleep } from "@temporalio/workflow";
import type * as activities from "./activities";

// Activityのプロキシを作成（タイムアウト設定）
const { sendEmail, chargeCustomer } = proxyActivities<typeof activities>({
  startToCloseTimeout: "1 minute",
  retry: {
    maximumAttempts: 3,
  },
});

export async function subscriptionSignupWorkflow(
  email: string,
  customerId: string
): Promise<string> {
  // 1. ウェルカムメール送信
  await sendEmail(
    email,
    "ご登録ありがとうございます",
    "サービスへようこそ！"
  );

  // 2. 7日間のトライアル期間
  await sleep("7 days");

  // 3. トライアル終了メール
  await sendEmail(
    email,
    "トライアル期間終了のお知らせ",
    "明日から課金が開始されます。"
  );

  // 4. 1日待機
  await sleep("1 day");

  // 5. 初回課金
  const result = await chargeCustomer(customerId, 1000);

  // 6. 課金完了メール
  await sendEmail(
    email,
    "お支払いありがとうございます",
    `お支払いが完了しました。領収書ID: ${result.paymentIntentId}`
  );

  return "Subscription workflow completed";
}
```

**注目ポイント:**
- `sleep("7 days")` で7日間待機できる
- サーバーが再起動しても、7日後に自動で再開される
- 各ステップが失敗しても自動リトライ

### Workerの起動

```typescript
// src/worker.ts
import { Worker } from "@temporalio/worker";
import * as activities from "./activities";

async function run() {
  const worker = await Worker.create({
    workflowsPath: require.resolve("./workflows"),
    activities,
    taskQueue: "default",
  });

  await worker.run();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

```bash
npm run worker
```

### Workflowの開始

```typescript
// src/start-workflow.ts
import { Client } from "@temporalio/client";
import { subscriptionSignupWorkflow } from "./workflows";

async function run() {
  const client = new Client();

  const handle = await client.workflow.start(subscriptionSignupWorkflow, {
    args: ["user@example.com", "cus_xxxxx"],
    taskQueue: "default",
    workflowId: "subscription-user-123",
  });

  console.log(`Started workflow ${handle.workflowId}`);

  // ワークフローの完了を待つ（オプション）
  const result = await handle.result();
  console.log("Workflow result:", result);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

```bash
npm run start-workflow
```

## 実践例: 注文処理ワークフロー

ECサイトの注文処理を例にします。

```typescript
// src/workflows/order-workflow.ts
import { proxyActivities, sleep, condition } from "@temporalio/workflow";
import type * as activities from "../activities";

const {
  reserveInventory,
  chargePayment,
  sendOrderConfirmation,
  shipOrder,
  sendShippingNotification,
  refundPayment,
  restoreInventory,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "2 minutes",
  retry: {
    maximumAttempts: 5,
    backoffCoefficient: 2,
  },
});

export async function orderWorkflow(orderId: string): Promise<string> {
  let inventoryReserved = false;
  let paymentCharged = false;

  try {
    // 1. 在庫確保
    await reserveInventory(orderId);
    inventoryReserved = true;

    // 2. 決済処理
    await chargePayment(orderId);
    paymentCharged = true;

    // 3. 注文確認メール送信
    await sendOrderConfirmation(orderId);

    // 4. 発送処理（最大48時間待機）
    await sleep("48 hours");
    await shipOrder(orderId);

    // 5. 発送通知メール
    await sendShippingNotification(orderId);

    return "Order completed successfully";

  } catch (error) {
    // エラー発生時のロールバック処理
    console.error("Order workflow failed:", error);

    if (paymentCharged) {
      await refundPayment(orderId);
    }

    if (inventoryReserved) {
      await restoreInventory(orderId);
    }

    throw error;
  }
}
```

## シグナルとクエリ

### シグナル: 外部からワークフローに通知

```typescript
// workflows.ts
import { defineSignal, setHandler } from "@temporalio/workflow";

export const cancelOrderSignal = defineSignal("cancelOrder");

export async function orderWorkflow(orderId: string): Promise<string> {
  let shouldCancel = false;

  setHandler(cancelOrderSignal, () => {
    shouldCancel = true;
  });

  // ... 処理 ...

  if (shouldCancel) {
    // キャンセル処理
    return "Order cancelled";
  }

  // ... 続き ...
}
```

```typescript
// クライアントからシグナル送信
const handle = client.workflow.getHandle("order-123");
await handle.signal(cancelOrderSignal);
```

### クエリ: ワークフローの状態を取得

```typescript
// workflows.ts
import { defineQuery, setHandler } from "@temporalio/workflow";

export const orderStatusQuery = defineQuery<string>("orderStatus");

export async function orderWorkflow(orderId: string): Promise<string> {
  let currentStatus = "pending";

  setHandler(orderStatusQuery, () => currentStatus);

  currentStatus = "processing";
  await reserveInventory(orderId);

  currentStatus = "payment";
  await chargePayment(orderId);

  currentStatus = "shipping";
  await shipOrder(orderId);

  currentStatus = "completed";
  return "Order completed";
}
```

```typescript
// クライアントからクエリ
const handle = client.workflow.getHandle("order-123");
const status = await handle.query(orderStatusQuery);
console.log("Current status:", status);
```

## 子ワークフローとパラレル実行

```typescript
import { executeChild, ParentClosePolicy } from "@temporalio/workflow";

export async function bulkEmailWorkflow(userIds: string[]): Promise<void> {
  // 並列で子ワークフローを実行
  const promises = userIds.map((userId) =>
    executeChild(sendEmailWorkflow, {
      args: [userId],
      parentClosePolicy: ParentClosePolicy.PARENT_CLOSE_POLICY_ABANDON,
    })
  );

  await Promise.all(promises);
}
```

## スケジュール実行

定期実行（Cron的な使い方）:

```typescript
const handle = await client.workflow.start(dailyReportWorkflow, {
  taskQueue: "default",
  workflowId: "daily-report",
  cronSchedule: "0 9 * * *", // 毎日9時
});
```

## まとめ

Temporalは、以下のようなユースケースで特に威力を発揮します:

- **長時間実行ジョブ**: 数時間〜数日かかる処理
- **複雑なステートマシン**: 多段階の承認フロー
- **マイクロサービス連携**: 複数サービスをまたぐ処理
- **確実性が必要な処理**: 決済、注文、メール送信など

学習コストはありますが、一度理解すれば、非同期処理の実装が劇的に楽になります。公式ドキュメントとサンプルコードも充実しているので、ぜひ試してみてください。

---
title: "Temporal ワークフローエンジン実践ガイド - 信頼性の高い分散システムを構築する"
description: "Temporalを使った耐障害性の高いワークフロー実装方法を、実践的なコード例とともに詳しく解説します。マイクロサービス、バッチ処理、長時間実行タスクの課題を解決します。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。"
pubDate: "2025-02-05"
tags: ['DevOps', 'バックエンド', 'プログラミング']
---

Temporalは、複雑な分散システムやマイクロサービスにおけるワークフローを管理するためのオープンソースプラットフォームです。障害への耐性、リトライ、タイムアウト、状態管理などを宣言的に記述でき、本番環境で信頼性の高いシステムを構築できます。本記事では、Temporalの基礎から実践的な使い方まで、コード例を交えて詳しく解説します。

## Temporalとは

Temporalは、Uberの内部ツールCadenceから派生したワークフローオーケストレーションエンジンです。長時間実行されるビジネスプロセス、複雑な非同期処理、分散トランザクションなどを、シンプルなコードで記述できます。

### Temporalが解決する課題

従来の分散システム開発では、以下のような問題に直面します:

1. **障害時のリトライ処理**: どのステップで失敗したか追跡し、リトライロジックを実装する必要がある
2. **状態管理**: プロセスの進行状況をデータベースに保存し、復旧時に読み込む
3. **タイムアウト処理**: 各ステップの実行時間を監視し、適切にタイムアウトさせる
4. **分散トランザクション**: 複数のサービスにまたがる処理の整合性を保つ
5. **スケジューリング**: 定期実行やディレイ実行を管理する

Temporalは、これらをすべて自動的に処理します。

### Temporalの主要コンセプト

- **Workflow**: ビジネスロジックを表現する関数（決定論的である必要がある）
- **Activity**: 外部システムとのやり取りなど、副作用のある処理
- **Worker**: WorkflowとActivityを実行するプロセス
- **Temporal Server**: ワークフローの状態を管理し、タスクをスケジューリングする

## 環境構築

### Temporal Serverのセットアップ

開発環境では、Docker Composeを使うのが最も簡単です。

```bash
# Temporal CLIのインストール
brew install temporalio/brew/temporal

# ローカルでTemporal Serverを起動
temporal server start-dev

# または Docker Compose（本番相当の環境）
git clone https://github.com/temporalio/docker-compose.git
cd docker-compose
docker-compose up
```

Temporal Server起動後、Web UIにアクセスできます:
```
http://localhost:8233
```

### TypeScript SDKのインストール

```bash
npm init -y
npm install @temporalio/worker @temporalio/client @temporalio/activity @temporalio/workflow
npm install -D typescript @types/node ts-node
```

`tsconfig.json`の設定:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

## 最初のワークフロー: Hello World

### 1. Workflowの定義

```typescript
// src/workflows/hello.workflow.ts
import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../activities/hello.activity';

// Activityへの参照を取得（型安全）
const { greet } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
});

// Workflowの定義
export async function helloWorkflow(name: string): Promise<string> {
  // Activityを実行
  const greeting = await greet(name);
  return greeting;
}
```

Workflowは決定論的である必要があるため、以下は禁止されています:
- ランダム値の生成（`Math.random()`など）
- 現在時刻の取得（`Date.now()`など）
- 直接のネットワークI/O
- 外部ライブラリの多くの機能

### 2. Activityの定義

```typescript
// src/activities/hello.activity.ts
export async function greet(name: string): Promise<string> {
  // Activityでは自由に副作用のある処理が可能
  console.log(`Greeting ${name}`);

  // 外部APIの呼び出し、データベースアクセスなども可能
  return `Hello, ${name}!`;
}
```

### 3. Workerの実装

```typescript
// src/worker.ts
import { Worker } from '@temporalio/worker';
import * as activities from './activities/hello.activity';

async function run() {
  const worker = await Worker.create({
    workflowsPath: require.resolve('./workflows'),
    activities,
    taskQueue: 'hello-world',
  });

  await worker.run();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

### 4. Clientでワークフローを開始

```typescript
// src/client.ts
import { Connection, Client } from '@temporalio/client';
import { helloWorkflow } from './workflows/hello.workflow';

async function run() {
  const connection = await Connection.connect({ address: 'localhost:7233' });
  const client = new Client({ connection });

  const handle = await client.workflow.start(helloWorkflow, {
    taskQueue: 'hello-world',
    args: ['World'],
    workflowId: 'hello-workflow-' + Date.now(),
  });

  console.log(`Started workflow ${handle.workflowId}`);

  // 結果を待つ
  const result = await handle.result();
  console.log(result); // "Hello, World!"
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

### 実行

```bash
# Workerを起動
npx ts-node src/worker.ts

# 別のターミナルでClientを実行
npx ts-node src/client.ts
```

## 実践的な例: Eコマースの注文処理

複数のステップからなる注文処理ワークフローを実装します。

### ワークフローの設計

1. 在庫確認
2. 決済処理
3. 配送手配
4. 通知送信

各ステップでエラーが発生した場合、適切にロールバックします。

### Activityの実装

```typescript
// src/activities/order.activity.ts
interface OrderDetails {
  orderId: string;
  userId: string;
  items: Array<{ productId: string; quantity: number }>;
  totalAmount: number;
}

interface PaymentResult {
  transactionId: string;
  status: 'success' | 'failed';
}

// 在庫確認
export async function checkInventory(
  items: OrderDetails['items']
): Promise<boolean> {
  console.log('Checking inventory for', items);

  // 実際にはデータベースやAPIを呼び出す
  // ここではシミュレーション
  await sleep(1000);

  // 10%の確率で在庫切れとする
  if (Math.random() < 0.1) {
    throw new Error('Out of stock');
  }

  return true;
}

// 在庫予約
export async function reserveInventory(
  items: OrderDetails['items']
): Promise<string> {
  console.log('Reserving inventory');
  await sleep(500);
  return `reservation-${Date.now()}`;
}

// 決済処理
export async function processPayment(
  userId: string,
  amount: number
): Promise<PaymentResult> {
  console.log(`Processing payment of ${amount} for user ${userId}`);
  await sleep(2000);

  // 5%の確率で決済失敗
  if (Math.random() < 0.05) {
    return { transactionId: '', status: 'failed' };
  }

  return {
    transactionId: `txn-${Date.now()}`,
    status: 'success',
  };
}

// 配送手配
export async function arrangeShipping(
  orderId: string,
  items: OrderDetails['items']
): Promise<string> {
  console.log(`Arranging shipping for order ${orderId}`);
  await sleep(1500);
  return `shipping-${Date.now()}`;
}

// 通知送信
export async function sendNotification(
  userId: string,
  orderId: string,
  message: string
): Promise<void> {
  console.log(`Sending notification to ${userId}: ${message}`);
  await sleep(300);
}

// ロールバック用: 在庫予約のキャンセル
export async function cancelReservation(reservationId: string): Promise<void> {
  console.log(`Cancelling reservation ${reservationId}`);
  await sleep(500);
}

// ロールバック用: 決済の払い戻し
export async function refundPayment(transactionId: string): Promise<void> {
  console.log(`Refunding payment ${transactionId}`);
  await sleep(1000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### Workflowの実装

```typescript
// src/workflows/order.workflow.ts
import {
  proxyActivities,
  defineSignal,
  setHandler,
  condition,
  sleep,
} from '@temporalio/workflow';
import type * as activities from '../activities/order.activity';

// Activityの設定
const {
  checkInventory,
  reserveInventory,
  processPayment,
  arrangeShipping,
  sendNotification,
  cancelReservation,
  refundPayment,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '1s',
    maximumInterval: '30s',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

interface OrderDetails {
  orderId: string;
  userId: string;
  items: Array<{ productId: string; quantity: number }>;
  totalAmount: number;
}

// Signalの定義（外部から状態を変更できる）
export const cancelOrderSignal = defineSignal<[]>('cancelOrder');

export async function orderWorkflow(order: OrderDetails): Promise<string> {
  let reservationId = '';
  let transactionId = '';
  let cancelled = false;

  // Signalのハンドラを設定
  setHandler(cancelOrderSignal, () => {
    cancelled = true;
  });

  try {
    // Step 1: 在庫確認
    await checkInventory(order.items);

    if (cancelled) throw new Error('Order cancelled by user');

    // Step 2: 在庫予約
    reservationId = await reserveInventory(order.items);

    if (cancelled) throw new Error('Order cancelled by user');

    // Step 3: 決済処理
    const paymentResult = await processPayment(order.userId, order.totalAmount);

    if (paymentResult.status === 'failed') {
      throw new Error('Payment failed');
    }

    transactionId = paymentResult.transactionId;

    if (cancelled) throw new Error('Order cancelled by user');

    // Step 4: 配送手配
    const shippingId = await arrangeShipping(order.orderId, order.items);

    // Step 5: 完了通知
    await sendNotification(
      order.userId,
      order.orderId,
      `Your order ${order.orderId} has been confirmed. Tracking: ${shippingId}`
    );

    return `Order ${order.orderId} completed successfully`;

  } catch (error: any) {
    // エラー発生時のロールバック処理
    console.error(`Order workflow failed: ${error.message}`);

    // 決済済みの場合は払い戻し
    if (transactionId) {
      await refundPayment(transactionId);
    }

    // 在庫予約済みの場合はキャンセル
    if (reservationId) {
      await cancelReservation(reservationId);
    }

    // エラー通知
    await sendNotification(
      order.userId,
      order.orderId,
      `Your order ${order.orderId} could not be processed: ${error.message}`
    );

    throw error;
  }
}
```

### Clientから実行

```typescript
// src/client-order.ts
import { Connection, Client } from '@temporalio/client';
import { orderWorkflow } from './workflows/order.workflow';

async function run() {
  const connection = await Connection.connect();
  const client = new Client({ connection });

  const order = {
    orderId: `order-${Date.now()}`,
    userId: 'user-123',
    items: [
      { productId: 'prod-1', quantity: 2 },
      { productId: 'prod-2', quantity: 1 },
    ],
    totalAmount: 5999,
  };

  const handle = await client.workflow.start(orderWorkflow, {
    taskQueue: 'order-processing',
    args: [order],
    workflowId: order.orderId,
  });

  console.log(`Started order workflow: ${handle.workflowId}`);

  // 途中でキャンセルする例
  // await sleep(2000);
  // await handle.signal(cancelOrderSignal);

  try {
    const result = await handle.result();
    console.log(result);
  } catch (error: any) {
    console.error('Workflow failed:', error.message);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

## 高度な機能

### 1. Queryによる状態照会

Workflowの実行中に、外部から状態を照会できます。

```typescript
// Workflow内
import { defineQuery, setHandler } from '@temporalio/workflow';

interface OrderStatus {
  currentStep: string;
  progress: number;
}

export const getOrderStatusQuery = defineQuery<OrderStatus>('getOrderStatus');

export async function orderWorkflow(order: OrderDetails): Promise<string> {
  let status: OrderStatus = { currentStep: 'pending', progress: 0 };

  setHandler(getOrderStatusQuery, () => status);

  status = { currentStep: 'checking inventory', progress: 10 };
  await checkInventory(order.items);

  status = { currentStep: 'processing payment', progress: 40 };
  await processPayment(order.userId, order.totalAmount);

  status = { currentStep: 'arranging shipping', progress: 70 };
  await arrangeShipping(order.orderId, order.items);

  status = { currentStep: 'completed', progress: 100 };
  return `Order completed`;
}
```

Clientから照会:

```typescript
const status = await handle.query(getOrderStatusQuery);
console.log(status); // { currentStep: 'processing payment', progress: 40 }
```

### 2. 子Workflowの実行

```typescript
import { startChild } from '@temporalio/workflow';
import { sendEmailWorkflow } from './email.workflow';

// メインWorkflow内で子Workflowを起動
const childHandle = await startChild(sendEmailWorkflow, {
  args: [email],
  workflowId: `email-${order.orderId}`,
});

const result = await childHandle.result();
```

### 3. タイマーとスケジューリング

```typescript
import { sleep } from '@temporalio/workflow';

// 3日後にリマインダーを送信
await sleep('3 days');
await sendNotification(userId, orderId, 'Please review your order');
```

### 4. Sagaパターン（分散トランザクション）

```typescript
export async function sagaWorkflow(order: OrderDetails): Promise<void> {
  const compensations: Array<() => Promise<void>> = [];

  try {
    // Step 1
    const reservationId = await reserveInventory(order.items);
    compensations.push(() => cancelReservation(reservationId));

    // Step 2
    const paymentResult = await processPayment(order.userId, order.totalAmount);
    if (paymentResult.status === 'success') {
      compensations.push(() => refundPayment(paymentResult.transactionId));
    }

    // Step 3
    await arrangeShipping(order.orderId, order.items);

  } catch (error) {
    // エラー時は逆順で補償処理を実行
    for (const compensate of compensations.reverse()) {
      await compensate();
    }
    throw error;
  }
}
```

### 5. Continue-As-New（長時間実行ワークフロー）

Workflowのイベント履歴が大きくなりすぎる場合、`continueAsNew`で新しいWorkflowとして継続します。

```typescript
import { continueAsNew } from '@temporalio/workflow';

export async function longRunningWorkflow(iteration: number): Promise<void> {
  // 処理を実行
  await doSomeWork();

  // 1000回のイテレーション後に新しいWorkflowとして継続
  if (iteration >= 1000) {
    await continueAsNew<typeof longRunningWorkflow>(0);
  } else {
    await continueAsNew<typeof longRunningWorkflow>(iteration + 1);
  }
}
```

## 本番運用のベストプラクティス

### 1. エラーハンドリングとリトライ

```typescript
const activities = proxyActivities<typeof activityModule>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '1 minute',
    maximumAttempts: 5,
    nonRetryableErrorTypes: ['ValidationError', 'PermissionDenied'],
  },
});
```

### 2. タイムアウト設定

```typescript
const activities = proxyActivities<typeof activityModule>({
  startToCloseTimeout: '10 minutes',  // Activity開始から完了まで
  scheduleToCloseTimeout: '15 minutes', // スケジュールから完了まで
  scheduleToStartTimeout: '1 minute',   // スケジュールから開始まで
  heartbeatTimeout: '30s',              // ハートビート間隔
});
```

### 3. Workerのスケーリング

```typescript
const worker = await Worker.create({
  workflowsPath: require.resolve('./workflows'),
  activities,
  taskQueue: 'production-queue',
  maxConcurrentActivityTaskExecutions: 100,
  maxConcurrentWorkflowTaskExecutions: 50,
});
```

複数のWorkerプロセスを起動して水平スケーリング可能です。

### 4. モニタリングとメトリクス

```typescript
import { PrometheusMetricsCollector } from '@temporalio/worker';

const worker = await Worker.create({
  // ...
  metricsCollector: new PrometheusMetricsCollector(),
});
```

Grafanaでメトリクスを可視化できます。

### 5. テスト

```typescript
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import { orderWorkflow } from './workflows/order.workflow';
import * as activities from './activities/order.activity';

describe('Order Workflow', () => {
  let testEnv: TestWorkflowEnvironment;

  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createLocal();
  });

  afterAll(async () => {
    await testEnv?.teardown();
  });

  it('should complete order successfully', async () => {
    const { client } = testEnv;

    const worker = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue: 'test',
      workflowsPath: require.resolve('./workflows'),
      activities,
    });

    await worker.runUntil(async () => {
      const result = await client.workflow.execute(orderWorkflow, {
        taskQueue: 'test',
        workflowId: 'test-order',
        args: [{
          orderId: 'test-123',
          userId: 'user-1',
          items: [{ productId: 'prod-1', quantity: 1 }],
          totalAmount: 1000,
        }],
      });

      expect(result).toContain('completed successfully');
    });
  });
});
```

## まとめ

Temporalは、複雑な分散システムのワークフロー管理を劇的にシンプルにします。

主なメリット:
- **耐障害性**: 自動リトライ、タイムアウト、エラーハンドリング
- **可視性**: Web UIでワークフローの状態を可視化
- **スケーラビリティ**: Workerを追加するだけで水平スケーリング
- **決定論的実行**: 同じ入力に対して常に同じ結果
- **長時間実行**: 数秒から数ヶ月までのワークフローに対応

使用例:
- Eコマースの注文処理
- データパイプライン
- 顧客オンボーディングフロー
- マイクロサービスのオーケストレーション
- バッチ処理

Temporalを活用することで、障害に強く、保守しやすい分散システムを構築できます。

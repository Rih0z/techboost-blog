---
title: 'マイクロサービスアーキテクチャ完全ガイド — 設計原則・API Gateway・サービスメッシュ・観測性'
description: 'マイクロサービスアーキテクチャの設計から運用まで完全解説。ドメイン境界設計・API Gateway・サービスディスカバリ・サーキットブレーカー・Istio・分散トレーシング・Event Sourcing/CQRSまで実装例付きで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-1.jpg'
tags: ['マイクロサービス', 'アーキテクチャ', 'Kubernetes', 'API Gateway', 'DevOps']
---

マイクロサービスアーキテクチャは、現代のクラウドネイティブ開発における中心的な設計思想となっている。NetflixやAmazon、Uberといったハイパースケール企業がモノリスからの移行で得た知見は、今や中規模のスタートアップにも適用されつつある。本記事では、マイクロサービスの基本概念から、本番環境での運用に必要な全技術スタックを体系的に解説する。

---

## 1. マイクロサービスとは — モノリスとの比較

### モノリシックアーキテクチャの限界

従来のモノリスアーキテクチャでは、すべてのビジネスロジックが単一のデプロイ可能ユニットとして存在する。

```
【モノリス構造】
┌──────────────────────────────────────────┐
│              Monolithic App              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │  User    │ │  Order   │ │ Payment  │ │
│  │ Module   │ │ Module   │ │ Module   │ │
│  └──────────┘ └──────────┘ └──────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │Inventory │ │Shipping  │ │Notific.  │ │
│  │ Module   │ │ Module   │ │ Module   │ │
│  └──────────┘ └──────────┘ └──────────┘ │
│                                          │
│         Single Database                  │
└──────────────────────────────────────────┘
```

モノリスの課題は規模が拡大するにつれて顕在化する。

- **デプロイの遅延**: 小さな変更でもアプリケーション全体を再デプロイする必要がある
- **スケーリングの非効率**: 特定モジュールだけ負荷が高くても全体をスケールアウトしなければならない
- **技術的負債の蓄積**: 年月とともにモジュール間の依存関係が複雑になり、「スパゲッティコード」化する
- **チームのボトルネック**: 複数チームが同一コードベースを変更する際のコンフリクトが多発する
- **障害の波及**: 一つのモジュールのメモリリークがアプリケーション全体をダウンさせる

### マイクロサービスアーキテクチャの構造

```
【マイクロサービス構造】
          ┌───────────┐
          │  Client   │
          └─────┬─────┘
                │
         ┌──────▼──────┐
         │ API Gateway  │
         └──────┬───────┘
                │
    ┌───────────┼───────────┐
    │           │           │
┌───▼───┐  ┌───▼───┐  ┌───▼───┐
│ User  │  │ Order │  │Payment│
│Service│  │Service│  │Service│
└───┬───┘  └───┬───┘  └───┬───┘
    │           │           │
  ┌─▼─┐      ┌─▼─┐      ┌─▼─┐
  │DB │      │DB │      │DB │
  └───┘      └───┘      └───┘
```

### マイクロサービスの定義と特性

Martin Fowlerによる定義を簡略化すると、マイクロサービスとは「単一の機能を担い、独立してデプロイ可能な小さなサービスの集合体」である。主要な特性を以下に示す。

| 特性 | 説明 |
|------|------|
| 単一責任 | 各サービスは明確に定義された一つのビジネス機能を担う |
| 独立デプロイ | 他サービスに影響なく単独でリリース可能 |
| 分散データ管理 | 各サービスが独自のデータストアを所有する |
| 障害隔離 | 一サービスの障害が他サービスに波及しない |
| 技術多様性 | サービスごとに最適なプログラミング言語・フレームワークを選択できる |
| 疎結合 | サービス間はAPIのみを通じて通信する |

### メリットとデメリット

**メリット**
- デプロイ頻度の向上（Netflixは1日に数千回のデプロイを実行）
- 障害の影響範囲が限定される
- チームが自律的に動ける（Conway's Lawの活用）
- 必要な箇所だけをスケールアウトできる

**デメリット**
- 分散システム特有の複雑性（ネットワーク遅延・部分的障害）
- サービス間の整合性管理が難しい
- 運用コストの増大（監視・ロギング・デプロイパイプラインの数が増える）
- 初期設計コストが高い

**採用すべきタイミング**: チーム規模が10名以上、または明確なドメイン境界が存在し、かつデプロイ頻度の向上が事業上の重要課題である場合に限って導入を検討する。小規模プロジェクトへの早期導入は「分散モノリス」というアンチパターンを生み出しやすい。

---

## 2. ドメイン境界設計（Bounded Context・DDD）

### ドメイン駆動設計（DDD）とマイクロサービス

マイクロサービスの境界設計において最も重要な理論的基盤がDomain-Driven Design（DDD）だ。特に「Bounded Context（境界付けられたコンテキスト）」の概念がサービス分割の指針となる。

**Bounded Contextとは**: あるドメインモデルが有効な範囲の境界。同じ言葉（例: "Order"）でも、販売コンテキストと物流コンテキストでは意味と属性が異なる。

```
【EC サイトのコンテキストマップ】

┌─────────────────┐     ┌─────────────────┐
│  Sales Context  │────▶│ Payment Context │
│  ・Order        │     │  ・Invoice      │
│  ・Customer     │     │  ・Transaction  │
│  ・Product      │     │  ・Refund       │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ Shipping Context│     │ Inventory Ctx   │
│  ・Shipment     │     │  ・Stock        │
│  ・Address      │     │  ・Warehouse    │
│  ・Carrier      │     │  ・SKU          │
└─────────────────┘     └─────────────────┘
```

### サービス分割の実践的手順

**ステップ1: イベントストーミング**

ビジネスイベントをホワイトボードに並べ、ドメインエキスパートとエンジニアが共同でドメインを探索する手法。

```
ビジネスイベント例（EC サイト）:
- OrderPlaced（注文確定）
- PaymentProcessed（決済完了）
- InventoryReserved（在庫確保）
- OrderShipped（出荷）
- OrderDelivered（配達完了）
- OrderCancelled（注文キャンセル）
- RefundIssued（返金処理）
```

**ステップ2: 集約（Aggregate）の特定**

関連するエンティティとバリューオブジェクトをまとめて、トランザクション境界を定義する。

```typescript
// Order集約の例
class Order {
  private readonly id: OrderId;
  private items: OrderItem[];
  private status: OrderStatus;
  private customerId: CustomerId;

  // 集約ルートのみが状態変更メソッドを公開する
  addItem(product: ProductId, quantity: number, price: Money): void {
    if (this.status !== OrderStatus.DRAFT) {
      throw new Error('Cannot add item to non-draft order');
    }
    this.items.push(new OrderItem(product, quantity, price));
    this.apply(new OrderItemAdded(this.id, product, quantity));
  }

  confirm(): void {
    if (this.items.length === 0) {
      throw new Error('Cannot confirm empty order');
    }
    this.status = OrderStatus.CONFIRMED;
    this.apply(new OrderConfirmed(this.id, this.customerId));
  }
}
```

**ステップ3: コンテキスト間マッピング**

コンテキスト間の関係パターンを定義する。

| パターン | 説明 | 使用場面 |
|---------|------|---------|
| Shared Kernel | 共有コードベース | 密接に連携するチーム間 |
| Customer-Supplier | 上流・下流の非対称関係 | 強い依存関係がある場合 |
| Anti-Corruption Layer | 翻訳レイヤー | レガシーシステムとの統合 |
| Open Host Service | 公開API | 複数コンシューマーへの提供 |
| Published Language | 共通言語定義 | 標準的なイベントスキーマ |

---

## 3. サービス間通信（同期・非同期）

### 同期通信：REST vs gRPC

**REST（HTTP/JSON）**

```yaml
# OpenAPI 3.0 仕様例
openapi: '3.0.0'
paths:
  /orders/{orderId}:
    get:
      summary: Get order by ID
      parameters:
        - name: orderId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'
        '404':
          description: Order not found
```

RESTはシンプルで人間が読みやすく、ブラウザから直接呼び出せるメリットがある。ただしJSON のシリアライズ/デシリアライズのオーバーヘッドが大きい。

**gRPC（Protocol Buffers）**

```protobuf
// order.proto
syntax = "proto3";

package order.v1;

service OrderService {
  rpc GetOrder(GetOrderRequest) returns (GetOrderResponse);
  rpc CreateOrder(CreateOrderRequest) returns (CreateOrderResponse);
  rpc StreamOrderUpdates(StreamRequest) returns (stream OrderUpdate);
}

message GetOrderRequest {
  string order_id = 1;
}

message GetOrderResponse {
  Order order = 1;
}

message Order {
  string id = 1;
  string customer_id = 2;
  repeated OrderItem items = 3;
  OrderStatus status = 4;
  int64 created_at = 5;
}

enum OrderStatus {
  ORDER_STATUS_UNSPECIFIED = 0;
  ORDER_STATUS_DRAFT = 1;
  ORDER_STATUS_CONFIRMED = 2;
  ORDER_STATUS_SHIPPED = 3;
  ORDER_STATUS_DELIVERED = 4;
}
```

gRPCはProtocol BuffersによるバイナリシリアライゼーションでRESTより3〜10倍高速。HTTP/2の双方向ストリーミングもサポートする。マイクロサービス間の内部通信では gRPC が推奨される。

### 非同期メッセージング

同期通信では呼び出し元と呼び出し先が同時に稼働している必要があるが、非同期メッセージングではこの制約がない。

```
【非同期イベント駆動通信】

Order Service                 Message Broker              Inventory Service
      │                      (Kafka / RabbitMQ)                 │
      │──OrderConfirmed──▶  ┌──────────────┐                    │
      │                     │   Topic:     │◀──subscribe─────────│
      │                     │order.events  │──publish──────────▶│
      │                     └──────────────┘                    │
      │                                                          │
      │                      ┌──────────────┐                    │
      │                      │   Topic:     │                    │
      │◀──subscribe──────────│inventory.    │◀──InventoryReserved│
      │                      │  events      │                    │
      │                      └──────────────┘                    │
```

**Apache Kafka を使った実装例**

```typescript
// イベント発行側（Order Service）
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'order-service',
  brokers: ['kafka-broker:9092'],
});

const producer = kafka.producer();

async function publishOrderConfirmed(order: Order): Promise<void> {
  await producer.send({
    topic: 'order.events',
    messages: [
      {
        key: order.id,
        value: JSON.stringify({
          eventType: 'OrderConfirmed',
          orderId: order.id,
          customerId: order.customerId,
          items: order.items,
          confirmedAt: new Date().toISOString(),
        }),
        headers: {
          'content-type': 'application/json',
          'event-version': '1',
        },
      },
    ],
  });
}

// イベント購読側（Inventory Service）
const consumer = kafka.consumer({ groupId: 'inventory-service' });

await consumer.subscribe({
  topic: 'order.events',
  fromBeginning: false,
});

await consumer.run({
  eachMessage: async ({ message }) => {
    const event = JSON.parse(message.value!.toString());
    if (event.eventType === 'OrderConfirmed') {
      await reserveInventory(event.orderId, event.items);
    }
  },
});
```

---

## 4. API Gateway

API Gatewayはクライアントとマイクロサービス群の間に位置する単一エントリーポイント。認証・認可・レート制限・ルーティング・ロードバランシングを一元管理する。

```
【API Gateway の役割】

Mobile App ─┐
Web App    ─┼──▶  ┌─────────────────────────────┐
Third Party─┘     │         API Gateway          │
                  │  ・認証/認可（JWT/OAuth2）    │
                  │  ・レート制限                 │
                  │  ・リクエストルーティング      │
                  │  ・SSL終端                    │
                  │  ・レスポンスキャッシュ        │
                  │  ・プロトコル変換             │
                  └──┬──────┬──────┬─────────────┘
                     │      │      │
                  User   Order  Payment
                 Service Service Service
```

### Kong Gateway の設定例

```yaml
# Kong Declarative Config (deck)
_format_version: "3.0"

services:
  - name: order-service
    url: http://order-service:8080
    routes:
      - name: order-routes
        paths:
          - /api/v1/orders
        methods:
          - GET
          - POST
        plugins:
          - name: jwt
          - name: rate-limiting
            config:
              minute: 100
              policy: local

  - name: user-service
    url: http://user-service:8080
    routes:
      - name: user-routes
        paths:
          - /api/v1/users
        plugins:
          - name: jwt
          - name: cors
            config:
              origins:
                - https://app.example.com
              methods:
                - GET
                - POST
                - PUT
              headers:
                - Authorization
                - Content-Type

plugins:
  - name: prometheus
    config:
      status_code_metrics: true
      latency_metrics: true
      bandwidth_metrics: true
```

### AWS API Gateway + Lambda Authorizer

```typescript
// Lambda Authorizer（JWT検証）
import { APIGatewayAuthorizerResult } from 'aws-lambda';
import * as jwt from 'jsonwebtoken';

export const handler = async (event: any): Promise<APIGatewayAuthorizerResult> => {
  const token = event.authorizationToken?.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;

    return {
      principalId: decoded.sub!,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: event.methodArn,
          },
        ],
      },
      context: {
        userId: decoded.sub,
        roles: JSON.stringify(decoded.roles),
      },
    };
  } catch (error) {
    throw new Error('Unauthorized');
  }
};
```

---

## 5. サービスディスカバリ

マイクロサービスは動的にスケールするため、IPアドレスがランタイムに変化する。サービスディスカバリはサービスの場所（ホスト・ポート）を動的に解決するしくみだ。

### クライアントサイドディスカバリ vs サーバーサイドディスカバリ

```
【クライアントサイドディスカバリ】
Client ──▶ Service Registry ──▶ (Service A の IP リスト)
  │                                     │
  └────────────────────────────────────▶ Service A (直接通信)

【サーバーサイドディスカバリ (Kubernetes Service)】
Client ──▶ Load Balancer / kube-proxy ──▶ Service A Pod 1
                                      └──▶ Service A Pod 2
                                      └──▶ Service A Pod 3
```

### Kubernetes Service による DNS ベースディスカバリ

```yaml
# Kubernetes Service 定義
apiVersion: v1
kind: Service
metadata:
  name: order-service
  namespace: production
  labels:
    app: order-service
    version: v2
spec:
  selector:
    app: order-service
  ports:
    - name: http
      port: 80
      targetPort: 8080
    - name: grpc
      port: 9090
      targetPort: 9090
  type: ClusterIP

---
# 他サービスからの呼び出し
# DNS: order-service.production.svc.cluster.local:80
```

```typescript
// サービスアドレスを環境変数で管理
const ORDER_SERVICE_URL =
  process.env.ORDER_SERVICE_URL || 'http://order-service.production.svc.cluster.local';

const response = await fetch(`${ORDER_SERVICE_URL}/orders/${orderId}`);
```

### Consul によるヘルスチェック統合

```hcl
# Consul サービス登録
service {
  name = "payment-service"
  id   = "payment-service-1"
  port = 8080
  tags = ["v1", "production"]

  check {
    http     = "http://localhost:8080/health"
    interval = "10s"
    timeout  = "3s"
    deregister_critical_service_after = "30s"
  }

  meta {
    version = "1.2.3"
    region  = "ap-northeast-1"
  }
}
```

---

## 6. サーキットブレーカー

分散システムでは依存サービスの障害がカスケードして全体に波及する危険がある。サーキットブレーカーはこの連鎖障害を防ぐパターンだ。

```
【サーキットブレーカーの状態遷移】

    ┌──────────────────────────────────────────────┐
    │                                              │
    ▼   成功率 > 閾値                              │
 CLOSED ────────────────────────────────────────▶ │
    │                                         HALF-OPEN
    │   失敗率 > 閾値（例: 50%）                   ▲
    │                                              │
    ▼   タイムアウト経過後                         │
  OPEN ─────────────────────────────────────────▶─┘
    │
    │   OPEN状態では即座にフォールバックを返す
    │   （依存先サービスへのリクエストをブロック）
```

### Resilience4j の実装例（Java/Kotlin）

```kotlin
// build.gradle.kts
dependencies {
    implementation("io.github.resilience4j:resilience4j-spring-boot3:2.2.0")
    implementation("io.github.resilience4j:resilience4j-reactor:2.2.0")
}

// サーキットブレーカー設定
@Configuration
class ResilienceConfig {
    @Bean
    fun circuitBreakerRegistry(): CircuitBreakerRegistry {
        val config = CircuitBreakerConfig.custom()
            .slidingWindowType(SlidingWindowType.COUNT_BASED)
            .slidingWindowSize(10)
            .failureRateThreshold(50f)
            .waitDurationInOpenState(Duration.ofSeconds(30))
            .permittedNumberOfCallsInHalfOpenState(3)
            .recordExceptions(IOException::class.java, TimeoutException::class.java)
            .build()

        return CircuitBreakerRegistry.of(config)
    }
}

// サービス実装
@Service
class OrderService(
    private val paymentClient: PaymentServiceClient,
    private val circuitBreakerRegistry: CircuitBreakerRegistry,
) {
    private val circuitBreaker = circuitBreakerRegistry.circuitBreaker("payment-service")

    suspend fun processPayment(orderId: String, amount: Money): PaymentResult {
        return CircuitBreaker.decorateSupplier(circuitBreaker) {
            paymentClient.processPayment(orderId, amount)
        }.get().also { result ->
            log.info("Payment processed: orderId=$orderId, result=$result")
        }
    }

    // フォールバック処理
    fun paymentFallback(orderId: String, exception: Exception): PaymentResult {
        log.warn("Payment service unavailable, queuing for retry: orderId=$orderId")
        paymentRetryQueue.enqueue(orderId)
        return PaymentResult.pending(orderId)
    }
}
```

### TypeScript / Polly.js の実装例

```typescript
import * as Polly from 'polly-js';

class PaymentServiceClient {
  async processPayment(orderId: string, amount: number): Promise<PaymentResult> {
    return Polly()
      .logger((error) => console.error('Retry attempt:', error.message))
      .waitAndRetry([1000, 2000, 4000]) // 指数バックオフ
      .executeForPromise(async () => {
        const response = await fetch(`${PAYMENT_SERVICE_URL}/payments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, amount }),
          signal: AbortSignal.timeout(5000), // 5秒タイムアウト
        });

        if (!response.ok) {
          throw new Error(`Payment service error: ${response.status}`);
        }

        return response.json();
      });
  }
}
```

---

## 7. Saga パターン（分散トランザクション）

マイクロサービスでは各サービスが独自DBを持つため、従来の2フェーズコミットは使用できない。Sagaパターンはこの問題を解決する。

### Choreography Saga（コレオグラフィ）

各サービスがイベントに反応して自律的に動作する。中央コーディネーターは不要。

```
【注文処理の Choreography Saga】

Order Service
  │ OrderCreated イベント発行
  ▼
Payment Service
  │ PaymentProcessed / PaymentFailed イベント発行
  ▼
Inventory Service
  │ InventoryReserved / InventoryFailed イベント発行
  ▼
Shipping Service
  │ ShipmentScheduled イベント発行
  ▼
Order Service
  └─ OrderConfirmed に状態更新

【補償トランザクション（失敗時）】
Inventory Service で失敗
  ↓ InventoryFailed イベント発行
Payment Service が受け取り
  ↓ PaymentRefunded イベント発行（補償）
Order Service が受け取り
  ↓ OrderCancelled に状態更新
```

### Orchestration Saga（オーケストレーション）

中央のSagaオーケストレーターが全ステップを制御する。

```typescript
// Saga オーケストレーター実装
class OrderSagaOrchestrator {
  private steps: SagaStep[] = [
    {
      name: 'ProcessPayment',
      execute: (ctx) => this.paymentService.processPayment(ctx.orderId, ctx.amount),
      compensate: (ctx) => this.paymentService.refundPayment(ctx.orderId),
    },
    {
      name: 'ReserveInventory',
      execute: (ctx) => this.inventoryService.reserve(ctx.orderId, ctx.items),
      compensate: (ctx) => this.inventoryService.release(ctx.orderId),
    },
    {
      name: 'ScheduleShipment',
      execute: (ctx) => this.shippingService.schedule(ctx.orderId, ctx.address),
      compensate: (ctx) => this.shippingService.cancel(ctx.orderId),
    },
  ];

  async execute(context: OrderSagaContext): Promise<SagaResult> {
    const executedSteps: SagaStep[] = [];

    for (const step of this.steps) {
      try {
        await step.execute(context);
        executedSteps.push(step);
        await this.saveCheckpoint(context.sagaId, step.name, 'completed');
      } catch (error) {
        console.error(`Saga step failed: ${step.name}`, error);
        // 実行済みステップの補償処理を逆順で実行
        await this.compensate(executedSteps.reverse(), context);
        return { success: false, failedStep: step.name, error };
      }
    }

    return { success: true };
  }

  private async compensate(steps: SagaStep[], context: OrderSagaContext): Promise<void> {
    for (const step of steps) {
      try {
        await step.compensate(context);
        await this.saveCheckpoint(context.sagaId, step.name, 'compensated');
      } catch (compensationError) {
        // 補償失敗は手動介入が必要
        await this.alertOps(`Compensation failed for ${step.name}`, compensationError);
      }
    }
  }
}
```

---

## 8. Event Sourcing と CQRS

### Event Sourcing

通常のデータベースは「現在の状態」を保存するが、Event Sourcingは「状態の変化（イベントの履歴）」を保存する。

```
【通常の状態保存 vs Event Sourcing】

通常:
Orders テーブル:
┌──────────┬────────────┬──────────┐
│ order_id │ total      │ status   │
├──────────┼────────────┼──────────┤
│ order-1  │ 15,000 JPY │ SHIPPED  │
└──────────┴────────────┴──────────┘

Event Sourcing:
Order Events テーブル:
┌──────────┬───────────────────┬────────────────────────────────┐
│ order_id │ event_type        │ payload                        │
├──────────┼───────────────────┼────────────────────────────────┤
│ order-1  │ OrderCreated      │ {customerId: "c-1", ...}       │
│ order-1  │ ItemAdded         │ {productId: "p-1", qty: 2, ...}│
│ order-1  │ ItemAdded         │ {productId: "p-2", qty: 1, ...}│
│ order-1  │ OrderConfirmed    │ {confirmedAt: "2026-02-01..."}  │
│ order-1  │ PaymentProcessed  │ {amount: 15000, ...}           │
│ order-1  │ OrderShipped      │ {trackingNo: "JP1234..."}      │
└──────────┴───────────────────┴────────────────────────────────┘
```

**Event Sourcing の利点**:
- 完全な監査証跡が自動的に得られる
- 過去の任意時点の状態を再構築できる（イベントリプレイ）
- デバッグが容易（何がいつ起きたかが明確）

### CQRS（Command Query Responsibility Segregation）

コマンド（書き込み）とクエリ（読み取り）のモデルを分離する。

```
【CQRS アーキテクチャ】

         Write Side                    Read Side
  ┌─────────────────────┐      ┌─────────────────────┐
  │ Command Handler     │      │ Query Handler       │
  │                     │      │                     │
  │ CreateOrder         │      │ GetOrderById        │
  │ ConfirmOrder        │      │ GetOrdersByUser     │
  │ CancelOrder         │      │ GetOrderHistory     │
  └────────┬────────────┘      └────────┬────────────┘
           │                            │
           ▼                            ▼
  ┌─────────────────┐          ┌─────────────────────┐
  │  Write DB       │  Event   │  Read DB (View)     │
  │  (Event Store)  │─────────▶│  (Denormalized)     │
  │  PostgreSQL     │  Sync    │  Redis / Elastic    │
  └─────────────────┘          └─────────────────────┘
```

```typescript
// CQRS 実装例（TypeScript）
// --- コマンド側 ---
interface CreateOrderCommand {
  customerId: string;
  items: Array<{ productId: string; quantity: number }>;
}

class CreateOrderCommandHandler {
  async handle(command: CreateOrderCommand): Promise<string> {
    const order = Order.create(command.customerId, command.items);

    // イベントをEvent Storeに保存
    await this.eventStore.save(order.id, order.uncommittedEvents);

    // 発行済みイベントをパブリッシュ
    await this.eventBus.publishAll(order.uncommittedEvents);

    return order.id;
  }
}

// --- クエリ側 ---
interface OrderSummaryView {
  orderId: string;
  customerName: string;
  totalAmount: number;
  status: string;
  itemCount: number;
}

class GetOrderSummaryQueryHandler {
  async handle(orderId: string): Promise<OrderSummaryView> {
    // 読み取り最適化されたビューから直接取得（JOINなし）
    return this.readDb.getOrderSummary(orderId);
  }
}

// --- プロジェクション（イベント -> ビュー更新） ---
class OrderProjection {
  @EventHandler(OrderConfirmed)
  async onOrderConfirmed(event: OrderConfirmed): Promise<void> {
    await this.readDb.upsert('order_summaries', {
      orderId: event.orderId,
      status: 'CONFIRMED',
      confirmedAt: event.occurredAt,
    });
  }
}
```

---

## 9. サービスメッシュ（Istio・Envoy）

サービスメッシュはサービス間通信のインフラを担うレイヤー。mTLS・トラフィック管理・観測性をアプリケーションコードから分離して提供する。

```
【Istio アーキテクチャ】

Control Plane
┌─────────────────────────────────────────────┐
│  istiod（Pilot + Citadel + Galley）         │
│   ・サービスディスカバリ                      │
│   ・証明書管理（mTLS）                       │
│   ・トラフィックポリシー配信                  │
└──────────────────┬──────────────────────────┘
                   │ xDS API
Data Plane         │
┌──────────────────▼──────────────────────────┐
│  Pod A              Pod B              Pod C │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐│
│  │  App     │   │  App     │   │  App     ││
│  └────┬─────┘   └────┬─────┘   └────┬─────┘│
│  ┌────▼─────┐   ┌────▼─────┐   ┌────▼─────┐│
│  │  Envoy   │◀──│  Envoy   │──▶│  Envoy   ││
│  │ Sidecar  │   │ Sidecar  │   │ Sidecar  ││
│  └──────────┘   └──────────┘   └──────────┘│
└─────────────────────────────────────────────┘
```

### Istio 設定例

```yaml
# VirtualService: トラフィック管理
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-service
spec:
  hosts:
    - order-service
  http:
    # カナリアデプロイ: v2に10%のトラフィック
    - match:
        - headers:
            x-canary-user:
              exact: "true"
      route:
        - destination:
            host: order-service
            subset: v2
    - route:
        - destination:
            host: order-service
            subset: v1
          weight: 90
        - destination:
            host: order-service
            subset: v2
          weight: 10
      timeout: 5s
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: 5xx,reset,connect-failure

---
# DestinationRule: サブセット定義 + mTLS
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: order-service
spec:
  host: order-service
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL  # mTLS 強制
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2

---
# PeerAuthentication: mTLS ポリシー
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT  # 全サービス間通信でmTLS必須
```

---

## 10. 分散トレーシング（OpenTelemetry・Jaeger）

マイクロサービスではリクエストが複数サービスをまたぐため、従来のログだけでは問題箇所を特定できない。分散トレーシングは1リクエストの全経路を可視化する。

```
【分散トレーシングの概念】

Trace ID: abc-123
│
├─ Span: API Gateway (10ms)
│    TraceID: abc-123  SpanID: span-1
│
├─── Span: Order Service (45ms)
│      TraceID: abc-123  SpanID: span-2  ParentSpanID: span-1
│
├────── Span: DB Query (5ms)
│         TraceID: abc-123  SpanID: span-3  ParentSpanID: span-2
│
├────── Span: Payment Service (30ms)
│         TraceID: abc-123  SpanID: span-4  ParentSpanID: span-2
│
└──────── Span: External Payment API (20ms)
            TraceID: abc-123  SpanID: span-5  ParentSpanID: span-4
```

### OpenTelemetry の実装例

```typescript
// OpenTelemetry SDK セットアップ（Node.js）
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'order-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.2.3',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: 'production',
  }),
  traceExporter: new OTLPTraceExporter({
    url: 'http://otel-collector:4317',
  }),
  spanProcessor: new SimpleSpanProcessor(new OTLPTraceExporter()),
});

sdk.start();

// カスタムスパンの作成
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('order-service', '1.0.0');

async function processOrder(orderId: string): Promise<Order> {
  return tracer.startActiveSpan('processOrder', async (span) => {
    span.setAttribute('order.id', orderId);
    span.setAttribute('order.service', 'order-service');

    try {
      const order = await orderRepository.findById(orderId);
      span.setAttribute('order.status', order.status);
      span.setStatus({ code: SpanStatusCode.OK });
      return order;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

### OpenTelemetry Collector 設定

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 1s
    send_batch_size: 1024
  resourcedetection:
    detectors: [env, system, k8snode]

exporters:
  jaeger:
    endpoint: jaeger-collector:14250
    tls:
      insecure: true
  prometheus:
    endpoint: 0.0.0.0:8889
  logging:
    loglevel: warn

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resourcedetection, batch]
      exporters: [jaeger]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]
```

---

## 11. 中央集権ロギング（ELK Stack・Grafana Loki）

### 構造化ロギングの実装

分散システムでは構造化ログ（JSON形式）が必須。Trace IDをログに含めることで、トレースとの相関分析が可能になる。

```typescript
// 構造化ロガー（Winston + OpenTelemetry 連携）
import winston from 'winston';
import { trace, context } from '@opentelemetry/api';

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format((info) => {
      // 現在のスパンからTrace IDを自動付与
      const activeSpan = trace.getActiveSpan();
      if (activeSpan) {
        const spanContext = activeSpan.spanContext();
        info.traceId = spanContext.traceId;
        info.spanId = spanContext.spanId;
      }
      return info;
    })(),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: '/var/log/app/app.log' }),
  ],
});

// 使用例
logger.info('Order created', {
  orderId: order.id,
  customerId: order.customerId,
  totalAmount: order.totalAmount,
  itemCount: order.items.length,
});
```

### ELK Stack 構成

```yaml
# docker-compose.yml（ELK Stack）
version: '3.8'
services:
  elasticsearch:
    image: elasticsearch:8.12.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
    volumes:
      - es-data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"

  logstash:
    image: logstash:8.12.0
    volumes:
      - ./logstash/pipeline:/usr/share/logstash/pipeline
    depends_on:
      - elasticsearch

  kibana:
    image: kibana:8.12.0
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

  filebeat:
    image: elastic/filebeat:8.12.0
    volumes:
      - /var/log/app:/var/log/app:ro
      - ./filebeat/filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
    depends_on:
      - logstash

volumes:
  es-data:
```

```yaml
# logstash/pipeline/main.conf
input {
  beats {
    port => 5044
  }
}

filter {
  json {
    source => "message"
  }

  # サービス名でタグ付け
  mutate {
    add_field => {
      "[@metadata][index]" => "logs-%{[service_name]}-%{+YYYY.MM.dd}"
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "%{[@metadata][index]}"
  }
}
```

### Grafana Loki（軽量代替）

ELKはリソース消費が大きいため、小〜中規模では Grafana Loki が有力な選択肢だ。

```yaml
# Loki + Promtail + Grafana
version: '3.8'
services:
  loki:
    image: grafana/loki:2.9.4
    ports:
      - "3100:3100"
    command: -config.file=/etc/loki/local-config.yaml

  promtail:
    image: grafana/promtail:2.9.4
    volumes:
      - /var/log:/var/log
      - ./promtail-config.yaml:/etc/promtail/config.yaml
    command: -config.file=/etc/promtail/config.yaml

  grafana:
    image: grafana/grafana:10.3.0
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

```yaml
# promtail-config.yaml
scrape_configs:
  - job_name: microservices
    static_configs:
      - targets:
          - localhost
        labels:
          job: microservices
          __path__: /var/log/app/*.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            traceId: traceId
            service: service_name
      - labels:
          level:
          service:
      - output:
          source: message
```

---

## 12. ヘルスチェックとカナリアデプロイ

### ヘルスチェックエンドポイントの実装

```typescript
// Express ヘルスチェック実装
import express from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';

const app = express();
const db = new Pool({ connectionString: process.env.DATABASE_URL });
const redis = new Redis(process.env.REDIS_URL);

// Liveness Probe: プロセスが生きているか
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

// Readiness Probe: リクエストを受け付けられるか
app.get('/health/ready', async (req, res) => {
  const checks: Record<string, string> = {};
  let overallStatus = 200;

  // データベース接続チェック
  try {
    await db.query('SELECT 1');
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
    overallStatus = 503;
  }

  // Redis接続チェック
  try {
    await redis.ping();
    checks.cache = 'ok';
  } catch {
    checks.cache = 'error';
    overallStatus = 503;
  }

  // 外部依存サービスチェック
  try {
    const paymentHealth = await fetch(`${PAYMENT_SERVICE_URL}/health/live`, {
      signal: AbortSignal.timeout(2000),
    });
    checks.paymentService = paymentHealth.ok ? 'ok' : 'degraded';
  } catch {
    checks.paymentService = 'unavailable';
    // 外部サービス障害は503ではなく200（degraded）として返すケースも
  }

  res.status(overallStatus).json({
    status: overallStatus === 200 ? 'ready' : 'not ready',
    checks,
    timestamp: new Date().toISOString(),
  });
});

// Startup Probe: 初期化完了チェック
app.get('/health/startup', async (req, res) => {
  if (!appInitialized) {
    return res.status(503).json({ status: 'initializing' });
  }
  res.status(200).json({ status: 'started' });
});
```

### Kubernetes でのプローブ設定

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  template:
    spec:
      containers:
        - name: order-service
          image: order-service:1.2.3
          ports:
            - containerPort: 8080
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 3
          startupProbe:
            httpGet:
              path: /health/startup
              port: 8080
            failureThreshold: 30
            periodSeconds: 10
```

### カナリアデプロイ戦略

```yaml
# Argo Rollouts によるカナリアデプロイ
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: order-service
spec:
  replicas: 10
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      containers:
        - name: order-service
          image: order-service:2.0.0
  strategy:
    canary:
      steps:
        - setWeight: 10     # 10% のトラフィックを新バージョンへ
        - pause: { duration: 5m }
        - analysis:
            templates:
              - templateName: error-rate-check
        - setWeight: 30     # 問題なければ30%に拡大
        - pause: { duration: 10m }
        - setWeight: 60
        - pause: { duration: 10m }
        - setWeight: 100    # フルロールアウト
      canaryMetadata:
        labels:
          deployment: canary
      stableMetadata:
        labels:
          deployment: stable

---
# AnalysisTemplate: 自動ロールバック条件
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: error-rate-check
spec:
  metrics:
    - name: error-rate
      interval: 1m
      successCondition: result[0] < 0.05  # エラーレート5%未満
      failureLimit: 3
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(http_requests_total{
              job="order-service",
              status=~"5.."
            }[5m]))
            /
            sum(rate(http_requests_total{
              job="order-service"
            }[5m]))
```

---

## 13. 移行戦略（ストラングラー・フィグパターン）

既存のモノリスからマイクロサービスへ移行する最も実績ある手法が「ストラングラー・フィグパターン」だ。イチジクを締め付けるつる植物（Strangler Fig）のように、モノリスを少しずつ置き換える。

```
【ストラングラー・フィグパターン移行フロー】

Phase 1: ファサード設置
┌──────────┐     ┌──────────────────────────┐
│ Client   │────▶│   Routing Facade / Proxy  │
└──────────┘     └──────────────────────────┘
                        │
                        ▼ (全リクエスト)
                 ┌──────────────┐
                 │   Monolith   │
                 └──────────────┘

Phase 2: 最初のサービス切り出し（Payments）
┌──────────┐     ┌──────────────────────────┐
│ Client   │────▶│   Routing Facade / Proxy  │
└──────────┘     └──────────────────────────┘
                    │              │
          /payments │              │ その他
                    ▼              ▼
           ┌─────────────┐  ┌──────────────┐
           │  Payment    │  │   Monolith   │
           │  Service    │  └──────────────┘
           └─────────────┘

Phase 3: さらに切り出し（Users, Orders）
┌──────────┐     ┌──────────────────────────┐
│ Client   │────▶│   Routing Facade / Proxy  │
└──────────┘     └──────────────────────────┘
            │           │           │         │
        /users      /orders    /payments   その他
            ▼           ▼           ▼         ▼
         User       Order      Payment   Monolith
        Service    Service     Service  (縮小中)

Phase 4: モノリス消滅
                 ┌──────────────────────┐
                 │    API Gateway       │
                 └──────────────────────┘
              │       │       │       │
           User    Order  Payment  Inventory
          Service Service Service  Service
```

### 実践的な移行手順

```typescript
// ストラングラーパターン: Routing Facade 実装例（Express）
import express from 'express';
import httpProxy from 'http-proxy-middleware';

const app = express();

// 新サービスへのルーティング（切り出し済み）
app.use('/api/v1/payments', httpProxy.createProxyMiddleware({
  target: 'http://payment-service:8080',
  changeOrigin: true,
  on: {
    error: (err, req, res) => {
      // 新サービス障害時はモノリスにフォールバック
      console.error('Payment service error, falling back to monolith', err);
      httpProxy.createProxyMiddleware({
        target: 'http://monolith:8000',
      })(req, res, () => {});
    },
  },
}));

app.use('/api/v1/users', httpProxy.createProxyMiddleware({
  target: 'http://user-service:8080',
  changeOrigin: true,
}));

// 未移行機能はモノリスへ
app.use('/', httpProxy.createProxyMiddleware({
  target: 'http://monolith:8000',
  changeOrigin: true,
}));

app.listen(3000);
```

### Anti-Corruption Layer（ACL）によるデータ変換

```typescript
// モノリスのデータ形式をマイクロサービス形式に変換する ACL
class LegacyOrderAdapter {
  // モノリス側の旧フォーマット
  fromLegacy(legacyOrder: LegacyOrder): Order {
    return {
      id: legacyOrder.ORDER_NO,
      customerId: legacyOrder.CUSTOMER_ID.toString(),
      items: legacyOrder.LINE_ITEMS.map((item) => ({
        productId: item.PROD_CODE,
        quantity: item.QTY,
        unitPrice: item.UNIT_PRICE / 100, // 旧: 分単位 → 新: 円単位
      })),
      status: this.mapStatus(legacyOrder.STATUS_CODE),
      createdAt: new Date(legacyOrder.CREATE_DATE).toISOString(),
    };
  }

  private mapStatus(legacyCode: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
      '01': 'DRAFT',
      '02': 'CONFIRMED',
      '03': 'SHIPPED',
      '04': 'DELIVERED',
      '09': 'CANCELLED',
    };
    return statusMap[legacyCode] ?? 'UNKNOWN';
  }
}
```

---

## まとめ: マイクロサービス導入チェックリスト

マイクロサービスアーキテクチャは強力だが、すべてのプロジェクトに適しているわけではない。以下のチェックリストで導入の準備ができているかを確認しよう。

### 設計フェーズ
- [ ] ドメイン境界がBounded Contextとして明確に定義されている
- [ ] イベントストーミングを実施し、ビジネスイベントが洗い出されている
- [ ] サービス間の通信方式（同期/非同期）が設計されている
- [ ] 分散トランザクション戦略（Sagaパターン）が決定されている
- [ ] データ所有権が各サービスに明確に割り当てられている

### インフラフェーズ
- [ ] API Gatewayが設置され、認証・レート制限が設定されている
- [ ] サービスディスカバリが機能している（Kubernetes Serviceまたは Consul）
- [ ] サーキットブレーカーがすべての外部依存に実装されている
- [ ] 分散トレーシングが全サービスに導入されている（OpenTelemetry）
- [ ] 中央集権ロギングが機能している（ELK/Loki）

### 運用フェーズ
- [ ] ヘルスチェックエンドポイントが実装されている
- [ ] カナリアデプロイのパイプラインが整備されている
- [ ] アラートとオンコールローテーションが設定されている
- [ ] Runbook（障害対応手順書）が作成されている
- [ ] Chaos Engineeringによる耐障害性テストが実施されている

---

## デバッグツールの活用

マイクロサービスのデバッグで特に難しいのが、サービス間でやり取りされるAPIレスポンスのフォーマット検証だ。API Gatewayやサービスメッシュを介したレスポンスが期待するスキーマと一致しているかを素早く確認する必要がある。

**[DevToolBox](https://usedevtools.com/)** はマイクロサービスデバッグを効率化するオンラインツール集だ。JSONフォーマッター・バリデーター機能を使えば、Jaeger等のトレーシングUIからコピーしたAPIレスポンスのJSONを即座に整形・検証できる。複数サービスのレスポンスを比較しながらスキーマの不一致を特定する作業が大幅に効率化される。インストール不要でブラウザから即座に使えるため、インシデント対応中の素早いデバッグにも役立つ。

---

マイクロサービスアーキテクチャは、設計・実装・運用のすべてのフェーズにわたる深い理解と投資を必要とする。しかしその複雑性を管理する技術スタック（Istio・OpenTelemetry・Argo Rollouts等）の成熟度は2026年現在著しく向上しており、以前よりはるかに実践しやすくなっている。本記事で解説した原則と実装例を土台に、段階的な移行と継続的な改善を続けてほしい。

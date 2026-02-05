---
title: 'マイクロサービスアーキテクチャ入門 — モノリスからの移行戦略と実装パターン'
description: 'マイクロサービスアーキテクチャの基礎から実践まで。モノリスとの違い、メリット・デメリット、段階的な移行戦略、実装パターンを2026年の最新技術スタックで解説します。'
pubDate: 'Feb 05 2026'
---

「マイクロサービスに移行したい」と考えていませんか？しかし、闇雲に分割すると逆に複雑性が増し、開発速度が落ちることもあります。この記事では、マイクロサービスアーキテクチャの本質を理解し、適切な移行戦略を立てるための実践的な知識を提供します。

## マイクロサービスとは何か？

マイクロサービスは、**小さく独立したサービスの集合**でシステムを構成するアーキテクチャパターンです。

### モノリスとの比較

**モノリス（従来型）:**
```
┌─────────────────────────────────┐
│    Single Application           │
│  ┌──────┐ ┌──────┐ ┌──────┐   │
│  │ User │ │Order │ │ Pay  │   │
│  │ Mgmt │ │ Mgmt │ │ ment │   │
│  └──────┘ └──────┘ └──────┘   │
│         ↓                       │
│    ┌─────────────┐             │
│    │ Database    │             │
│    └─────────────┘             │
└─────────────────────────────────┘
```

**マイクロサービス:**
```
┌───────────┐  ┌───────────┐  ┌───────────┐
│  User     │  │  Order    │  │  Payment  │
│  Service  │  │  Service  │  │  Service  │
│  ┌─────┐  │  │  ┌─────┐  │  │  ┌─────┐  │
│  │ DB  │  │  │  │ DB  │  │  │  │ DB  │  │
│  └─────┘  │  │  └─────┘  │  │  └─────┘  │
└───────────┘  └───────────┘  └───────────┘
     ↕              ↕              ↕
    API Gateway / Service Mesh
```

## マイクロサービスの特徴

### 1. 独立したデプロイ

```typescript
// User Serviceの更新
// 他のサービスに影響なし
cd user-service
npm run build
docker build -t user-service:v2.0 .
kubectl apply -f deployment.yaml
```

### 2. 技術スタックの自由

```typescript
// User Service - Node.js + PostgreSQL
// user-service/server.ts
import express from 'express';
import { Pool } from 'pg';

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.get('/users/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  res.json(rows[0]);
});

app.listen(3001);
```

```python
# Order Service - Python + MongoDB
# order-service/server.py
from fastapi import FastAPI
from motor.motor_asyncio import AsyncIOMotorClient

app = FastAPI()
client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client.orders

@app.get("/orders/{order_id}")
async def get_order(order_id: str):
    order = await db.orders.find_one({"_id": order_id})
    return order
```

### 3. 独立したスケーリング

```yaml
# Kubernetes HPA (Horizontal Pod Autoscaler)
# order-service/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

注文サービスだけを10台にスケールアウトできます。

## メリットとデメリット

### メリット

**1. 障害の局所化**
```typescript
// Payment Serviceがダウンしても
// User ServiceとOrder Serviceは稼働し続ける

// Circuit Breaker パターン
import CircuitBreaker from 'opossum';

const options = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
};

const breaker = new CircuitBreaker(async (orderId) => {
  const response = await fetch(`http://payment-service/charge/${orderId}`);
  return response.json();
}, options);

breaker.fallback(() => ({ status: 'pending', message: 'Payment service temporarily unavailable' }));

app.post('/orders/:id/pay', async (req, res) => {
  try {
    const result = await breaker.fire(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(503).json({ error: 'Service unavailable' });
  }
});
```

**2. チームの独立性**
```
Team A → User Service
Team B → Order Service
Team C → Payment Service

各チームが独立してリリース可能
```

**3. 技術負債の局所化**
```typescript
// 古いUser Serviceを段階的にリプレース
// 他のサービスに影響なし

// Old User Service (Express + MySQL)
// → New User Service (Fastify + PostgreSQL)

// API互換性を保てば段階的移行可能
```

### デメリット

**1. 分散システムの複雑さ**
```typescript
// トランザクション管理が困難
// モノリスなら1つのDB Transaction

// マイクロサービスでは Saga パターンが必要
class OrderSaga {
  async createOrder(userId: string, items: CartItem[]) {
    let orderId: string;
    let paymentId: string;

    try {
      // Step 1: Create order
      orderId = await orderService.createOrder(userId, items);

      // Step 2: Reserve inventory
      await inventoryService.reserve(orderId, items);

      // Step 3: Process payment
      paymentId = await paymentService.charge(userId, orderId);

      // Step 4: Confirm order
      await orderService.confirm(orderId);

      return { orderId, paymentId };
    } catch (error) {
      // Compensating transactions (ロールバック)
      if (paymentId) await paymentService.refund(paymentId);
      if (orderId) await inventoryService.release(orderId);
      if (orderId) await orderService.cancel(orderId);

      throw error;
    }
  }
}
```

**2. ネットワークのオーバーヘッド**
```typescript
// モノリス: 関数呼び出し (μs)
const user = getUserById(123);

// マイクロサービス: HTTPリクエスト (ms)
const user = await fetch('http://user-service/users/123').then(r => r.json());
```

**3. デバッグの難しさ**
```typescript
// 分散トレーシングが必須
import { trace, context } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const provider = new NodeTracerProvider();
provider.addSpanProcessor(new SimpleSpanProcessor(new JaegerExporter()));
provider.register();

app.get('/orders/:id', async (req, res) => {
  const span = trace.getTracer('order-service').startSpan('get-order');

  const order = await orderService.findById(req.params.id);
  const user = await userService.findById(order.userId); // 別サービス呼び出し

  span.end();
  res.json({ order, user });
});
```

**4. データの一貫性**
```typescript
// 結果整合性（Eventual Consistency）を受け入れる必要がある
// ユーザーサービスで削除したユーザーが
// 一時的に注文サービスに残る可能性がある

// イベント駆動で整合性を保つ
import { EventEmitter } from 'events';

const eventBus = new EventEmitter();

// User Service
userService.deleteUser(userId);
eventBus.emit('user.deleted', { userId });

// Order Service
eventBus.on('user.deleted', async ({ userId }) => {
  await orderService.anonymizeUserOrders(userId);
});
```

## マイクロサービスに向いているケース

### 向いている

1. **大規模チーム（10人以上）**
   - チームが独立して開発できる

2. **部分的に負荷が高い**
   - 特定機能だけスケールさせたい

3. **技術刷新が必要な部分がある**
   - 段階的にリプレースしたい

4. **ドメインが明確に分離可能**
   - ユーザー管理、注文処理、決済など

### 向いていない

1. **小規模チーム（5人以下）**
   - 運用コストが高すぎる

2. **ドメインが複雑に絡み合っている**
   - サービス分割が困難

3. **リアルタイム性が最重要**
   - ネットワークレイテンシが許容できない

## モノリスからの移行戦略

### ストラングラーパターン（段階的移行）

```typescript
// Phase 1: モノリスの外側に新サービスを配置
//
// ┌──────────────┐
// │  API Gateway │
// └──────────────┘
//    ↓         ↓
// ┌────┐   ┌──────────┐
// │User│   │ Monolith │
// │Svc │   └──────────┘
// └────┘

// API Gateway設定
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

// 新サービスへルーティング
app.use('/api/users', createProxyMiddleware({
  target: 'http://user-service:3001',
  changeOrigin: true
}));

// 既存モノリスへルーティング
app.use('/api', createProxyMiddleware({
  target: 'http://monolith:3000',
  changeOrigin: true
}));

app.listen(80);
```

```typescript
// Phase 2: 機能を1つずつ抽出
// User Service抽出完了 → Order Service抽出開始

// Phase 3: モノリス縮小
// すべての機能を抽出したらモノリス廃止
```

### データベース分離戦略

**1. 読み取り専用レプリカの作成**
```typescript
// Step 1: モノリスDBからレプリカ作成
// Step 2: 新サービスはレプリカから読み取り
const userServiceDB = new Pool({
  host: 'user-db-replica',
  database: 'users'
});

// Step 3: 徐々に書き込みも新サービスへ
```

**2. データ同期期間**
```typescript
// 両方のDBに書き込み（一時的）
async function createUser(userData: UserData) {
  // 新DB（メイン）
  const user = await newUserDB.users.create(userData);

  // 旧DB（同期）
  await oldMonolithDB.users.create(userData);

  return user;
}

// 一定期間後、旧DBへの書き込みを停止
```

**3. データ分割**
```sql
-- モノリスDB
CREATE TABLE users (...);
CREATE TABLE orders (...);
CREATE TABLE payments (...);

-- 分割後
-- User Service DB
CREATE TABLE users (...);

-- Order Service DB
CREATE TABLE orders (...);

-- Payment Service DB
CREATE TABLE payments (...);
```

## サービス間通信パターン

### 1. 同期通信（REST API）

```typescript
// Order Service → User Serviceを呼び出し
import axios from 'axios';

async function createOrder(userId: string, items: CartItem[]) {
  // User Serviceに問い合わせ
  const { data: user } = await axios.get(`http://user-service/users/${userId}`);

  if (!user) {
    throw new Error('User not found');
  }

  const order = await db.orders.create({
    userId,
    items,
    userEmail: user.email
  });

  return order;
}
```

**メリット:** シンプル、理解しやすい
**デメリット:** User Serviceがダウンすると注文作成不可

### 2. 非同期通信（Message Queue）

```typescript
// RabbitMQを使用
import amqp from 'amqplib';

const connection = await amqp.connect('amqp://rabbitmq');
const channel = await connection.createChannel();

// Order Service: メッセージ送信
async function createOrder(userId: string, items: CartItem[]) {
  const order = await db.orders.create({ userId, items, status: 'pending' });

  // メッセージキューに送信
  await channel.sendToQueue('order.created', Buffer.from(JSON.stringify({
    orderId: order.id,
    userId,
    items
  })));

  return order;
}

// Payment Service: メッセージ受信
channel.consume('order.created', async (msg) => {
  if (msg) {
    const { orderId, userId } = JSON.parse(msg.content.toString());

    try {
      await processPayment(orderId, userId);
      channel.ack(msg);
    } catch (error) {
      channel.nack(msg);
    }
  }
});
```

**メリット:** サービスが疎結合、一時的なダウンに強い
**デメリット:** デバッグが難しい、結果整合性

### 3. イベント駆動（Event Bus）

```typescript
// Kafka使用
import { Kafka } from 'kafkajs';

const kafka = new Kafka({ brokers: ['kafka:9092'] });
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'payment-service' });

// Order Service: イベント発行
await producer.send({
  topic: 'orders',
  messages: [
    {
      key: orderId,
      value: JSON.stringify({
        event: 'OrderCreated',
        orderId,
        userId,
        items,
        timestamp: new Date()
      })
    }
  ]
});

// Payment Service: イベント購読
await consumer.subscribe({ topic: 'orders' });
await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const event = JSON.parse(message.value.toString());

    if (event.event === 'OrderCreated') {
      await handleOrderCreated(event);
    }
  }
});

// Inventory Service: 同じイベントを購読
// Email Service: 同じイベントを購読
// 1つのイベントで複数のサービスが反応
```

## サービスの境界設計

### ドメイン駆動設計（DDD）

```typescript
// 悪い分割: 技術層で分割
UserController Service
OrderController Service
PaymentController Service

// 良い分割: ドメインで分割
┌─────────────────┐
│ User Context    │
│ - Authentication│
│ - Profile       │
│ - Preferences   │
└─────────────────┘

┌─────────────────┐
│ Order Context   │
│ - Cart          │
│ - Checkout      │
│ - Fulfillment   │
└─────────────────┘

┌─────────────────┐
│ Payment Context │
│ - Billing       │
│ - Transactions  │
└─────────────────┘
```

### サービス分割の実例

```typescript
// ECサイトのサービス分割例

// 1. User Service
interface UserService {
  createUser(data: CreateUserDto): Promise<User>;
  authenticate(email: string, password: string): Promise<AuthToken>;
  updateProfile(userId: string, data: UpdateProfileDto): Promise<User>;
}

// 2. Product Service
interface ProductService {
  listProducts(filters: ProductFilters): Promise<Product[]>;
  getProduct(id: string): Promise<Product>;
  updateInventory(id: string, quantity: number): Promise<void>;
}

// 3. Order Service
interface OrderService {
  createOrder(userId: string, items: CartItem[]): Promise<Order>;
  getOrderStatus(orderId: string): Promise<OrderStatus>;
  cancelOrder(orderId: string): Promise<void>;
}

// 4. Payment Service
interface PaymentService {
  processPayment(orderId: string, method: PaymentMethod): Promise<PaymentResult>;
  refund(paymentId: string): Promise<RefundResult>;
}

// 5. Notification Service
interface NotificationService {
  sendEmail(to: string, template: EmailTemplate): Promise<void>;
  sendSMS(to: string, message: string): Promise<void>;
}
```

## API Gatewayパターン

```typescript
// Kong, AWS API Gateway, または自作
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import jwt from 'jsonwebtoken';

const app = express();

// 認証ミドルウェア
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Rate limiting
import rateLimit from 'express-rate-limit';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// ルーティング
app.use('/api/users', limiter, createProxyMiddleware({
  target: 'http://user-service:3001'
}));

app.use('/api/orders', authMiddleware, createProxyMiddleware({
  target: 'http://order-service:3002'
}));

app.use('/api/products', limiter, createProxyMiddleware({
  target: 'http://product-service:3003'
}));

app.listen(80);
```

## Service Meshパターン

```yaml
# Istio使用例
# サービス間通信を自動管理

apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-service
spec:
  hosts:
  - order-service
  http:
  - match:
    - headers:
        version:
          exact: v2
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
      weight: 10  # Canary Deployment
```

## 監視とトラブルシューティング

### 分散トレーシング

```typescript
// OpenTelemetry + Jaeger
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';

const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'order-service',
  }),
});

const exporter = new JaegerExporter({
  endpoint: 'http://jaeger:14268/api/traces',
});

provider.addSpanProcessor(new BatchSpanProcessor(exporter));
provider.register();

// 使用
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('order-service');

app.post('/orders', async (req, res) => {
  const span = tracer.startSpan('create-order');

  try {
    const userSpan = tracer.startSpan('fetch-user', { parent: span });
    const user = await userService.getUser(req.body.userId);
    userSpan.end();

    const paymentSpan = tracer.startSpan('process-payment', { parent: span });
    const payment = await paymentService.charge(req.body.amount);
    paymentSpan.end();

    res.json({ success: true });
  } finally {
    span.end();
  }
});
```

### ログ集約

```typescript
// ELK Stack (Elasticsearch + Logstash + Kibana)
import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

const logger = winston.createLogger({
  transports: [
    new ElasticsearchTransport({
      level: 'info',
      clientOpts: { node: 'http://elasticsearch:9200' },
      index: 'logs'
    })
  ]
});

logger.info('Order created', {
  orderId: '123',
  userId: '456',
  service: 'order-service'
});
```

## 実装のベストプラクティス

### 1. サービスは小さく保つ

```typescript
// 悪い例: 1つのサービスが多すぎる責務を持つ
class UserService {
  createUser() {}
  authenticate() {}
  processOrder() {} // ❌ Orderの責務
  sendEmail() {}    // ❌ Notificationの責務
}

// 良い例: 単一責任
class UserService {
  createUser() {}
  authenticate() {}
  updateProfile() {}
}

class OrderService {
  createOrder() {}
  getOrderStatus() {}
}

class NotificationService {
  sendEmail() {}
  sendSMS() {}
}
```

### 2. API契約を明確にする

```typescript
// OpenAPI仕様書
openapi: 3.0.0
info:
  title: Order Service API
  version: 1.0.0
paths:
  /orders:
    post:
      summary: Create a new order
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateOrderRequest'
      responses:
        '201':
          description: Order created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'
```

### 3. Backward Compatibility

```typescript
// バージョニング戦略
// Option 1: URLバージョニング
app.use('/v1/orders', ordersV1Router);
app.use('/v2/orders', ordersV2Router);

// Option 2: Headerバージョニング
app.use('/orders', (req, res, next) => {
  const version = req.headers['api-version'] || 'v1';
  if (version === 'v1') {
    ordersV1Router(req, res, next);
  } else {
    ordersV2Router(req, res, next);
  }
});
```

## まとめ

マイクロサービスアーキテクチャは銀の弾丸ではありません。

### 移行の判断基準
- チームサイズ: 10人以上
- ドメインの分離可能性: 高
- スケールニーズ: 部分的に高負荷
- 既存システム: 複雑化・肥大化

### 移行手順
1. ドメイン分析（DDD）
2. ストラングラーパターンで段階的移行
3. API Gateway導入
4. 監視・トレーシング整備
5. サービス分割開始

### 成功のカギ
- 明確なサービス境界
- 適切な通信パターン選択
- 充実した監視体制
- チームの自律性確保

マイクロサービス開発に役立つツールを探しているなら、[DevToolBox](https://devtoolbox.app)もチェックしてみてください。APIスキーマのバリデーションやJSON変換など、開発効率を上げるツールが揃っています。

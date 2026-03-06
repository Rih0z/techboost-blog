---
title: 'OpenTelemetry入門ガイド - 分散トレーシングとオブザーバビリティの標準'
description: 'OpenTelemetryの基礎から実践まで徹底解説。分散トレーシング、メトリクス収集、ログ統合、JavaScript/TypeScript SDK、Next.js/Node.js統合、実運用のベストプラクティスを完全網羅。実務で役立つポイントを厳選して解説。'
pubDate: '2026-02-05'
tags: ['OpenTelemetry', 'Observability', 'Tracing', 'Monitoring', 'Node.js', 'プログラミング']
---

## はじめに

OpenTelemetry（オープンテレメトリー、略称OTel）は、2019年に登場し、2026年現在、**分散システムの監視・観測の業界標準**として広く採用されています。

### OpenTelemetryとは

OpenTelemetryは、**アプリケーションのテレメトリデータ（トレース、メトリクス、ログ）を収集・送信するためのオープンソースフレームワーク**です。

主な特徴:

- **ベンダー中立**: 特定の監視ツールに依存しない
- **統一API**: トレース、メトリクス、ログを統一的に扱える
- **自動計装**: 主要フレームワークを自動で計装
- **多言語対応**: JavaScript、Python、Go、Java等
- **CNCFプロジェクト**: Kubernetes等と同じ基盤

### オブザーバビリティの3本柱

OpenTelemetryは、オブザーバビリティの3つの要素を提供します。

```
1. トレース（Traces）
   → リクエストの流れを追跡
   例: APIリクエスト → DB接続 → 外部API呼び出し

2. メトリクス（Metrics）
   → 数値データの時系列記録
   例: CPU使用率、リクエスト数、エラー率

3. ログ（Logs）
   → イベントの記録
   例: エラーメッセージ、デバッグ情報
```

### なぜOpenTelemetryが必要か

```
問題1: マイクロサービスのデバッグが困難
  複数サービスをまたぐリクエストの追跡が難しい
  → OpenTelemetryで全体の流れを可視化

問題2: ベンダーロックイン
  特定の監視ツールに依存すると切り替えが困難
  → OpenTelemetryで標準化、ツール乗り換え可能

問題3: 手動計装のコスト
  各サービスに手動でログ・メトリクスを追加
  → OpenTelemetryの自動計装で工数削減
```

## セットアップ

### Node.js/TypeScriptでのインストール

```bash
# コアパッケージ
npm install @opentelemetry/api
npm install @opentelemetry/sdk-node

# 自動計装
npm install @opentelemetry/auto-instrumentations-node

# エクスポーター（データ送信先）
npm install @opentelemetry/exporter-trace-otlp-http
npm install @opentelemetry/exporter-metrics-otlp-http
```

### 基本的なセットアップ

```typescript
// tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

const sdk = new NodeSDK({
  serviceName: 'my-app',
  traceExporter: new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: 'http://localhost:4318/v1/metrics',
    }),
    exportIntervalMillis: 10000, // 10秒ごと
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

// アプリケーション終了時のクリーンアップ
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});
```

### アプリケーションへの組み込み

```typescript
// index.ts
import './tracing'; // 最初にインポート
import express from 'express';

const app = express();

app.get('/', (req, res) => {
  res.send('Hello, OpenTelemetry!');
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## トレーシング（Traces）

### トレースとスパンの概念

```
トレース（Trace）:
  単一のリクエストの全体的な流れ
  例: ユーザーがAPIを呼び出してから応答が返るまで

スパン（Span）:
  トレース内の個別の操作単位
  例: DB接続、外部API呼び出し、関数実行
```

視覚化:

```
Trace: ユーザーリクエスト
├── Span: APIハンドラー (100ms)
│   ├── Span: ユーザー認証 (20ms)
│   ├── Span: DB接続 (50ms)
│   │   └── Span: SQLクエリ実行 (40ms)
│   └── Span: 外部API呼び出し (30ms)
└── 合計: 100ms
```

### 手動でスパンを作成

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('my-app');

async function getUserById(userId: string) {
  // スパン開始
  const span = tracer.startSpan('getUserById');

  try {
    // 属性を追加（メタデータ）
    span.setAttribute('user.id', userId);

    // DB接続
    const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);

    span.setAttribute('user.found', !!user);

    return user;
  } catch (error) {
    // エラー記録
    span.recordException(error);
    span.setStatus({ code: 2, message: error.message }); // ERROR
    throw error;
  } finally {
    // スパン終了
    span.end();
  }
}
```

### ネストしたスパン

```typescript
import { trace, context } from '@opentelemetry/api';

const tracer = trace.getTracer('my-app');

async function processOrder(orderId: string) {
  return tracer.startActiveSpan('processOrder', async (span) => {
    span.setAttribute('order.id', orderId);

    try {
      // 子スパン1
      const order = await tracer.startActiveSpan('fetchOrder', async (childSpan) => {
        const result = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
        childSpan.end();
        return result;
      });

      // 子スパン2
      await tracer.startActiveSpan('updateInventory', async (childSpan) => {
        await updateInventory(order.items);
        childSpan.end();
      });

      // 子スパン3
      await tracer.startActiveSpan('sendEmail', async (childSpan) => {
        await sendOrderConfirmationEmail(order.email);
        childSpan.end();
      });

      span.setStatus({ code: 1 }); // OK
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

### 自動計装（HTTP、DB等）

```typescript
// 自動計装が有効な場合、以下は自動でトレースされる

// HTTP リクエスト
app.get('/users/:id', async (req, res) => {
  // HTTPスパンが自動作成される
  const userId = req.params.id;

  // DBクエリのスパンも自動作成される
  const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);

  res.json(user);
});

// 外部APIリクエスト（fetch/axios）
const response = await fetch('https://api.example.com/data');
// → HTTPクライアントスパンが自動作成される
```

### コンテキスト伝播

分散トレーシングでは、リクエスト間でトレースコンテキストを伝播させます。

```typescript
// サービスA: リクエスト送信
import { context, propagation } from '@opentelemetry/api';

async function callServiceB() {
  const span = tracer.startSpan('callServiceB');

  // コンテキストをHTTPヘッダーに注入
  const headers: Record<string, string> = {};
  propagation.inject(context.active(), headers);

  const response = await fetch('http://service-b/api/data', { headers });

  span.end();
  return response.json();
}
```

```typescript
// サービスB: リクエスト受信
app.use((req, res, next) => {
  // HTTPヘッダーからコンテキストを抽出
  const ctx = propagation.extract(context.active(), req.headers);

  context.with(ctx, () => {
    // 抽出したコンテキスト内でハンドラー実行
    next();
  });
});
```

## メトリクス（Metrics）

### メトリクスの種類

OpenTelemetryは以下のメトリクスタイプをサポートします。

```
1. Counter（カウンター）
   → 増加のみ（リクエスト数、エラー数等）

2. UpDownCounter（アップダウンカウンター）
   → 増減可能（同時接続数、キュー長等）

3. Histogram（ヒストグラム）
   → 分布を記録（レスポンスタイム、ファイルサイズ等）

4. ObservableGauge（ゲージ）
   → 現在の値（CPU使用率、メモリ使用量等）
```

### Counterの作成

```typescript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('my-app');

// カウンター作成
const requestCounter = meter.createCounter('http.requests', {
  description: 'Total HTTP requests',
  unit: '1',
});

// リクエストハンドラー
app.use((req, res, next) => {
  requestCounter.add(1, {
    method: req.method,
    route: req.path,
  });
  next();
});
```

### Histogramの作成

```typescript
const requestDuration = meter.createHistogram('http.request.duration', {
  description: 'HTTP request duration',
  unit: 'ms',
});

app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    requestDuration.record(duration, {
      method: req.method,
      route: req.path,
      status: res.statusCode,
    });
  });

  next();
});
```

### ObservableGaugeの作成

```typescript
import os from 'os';

// CPU使用率を定期的に記録
meter.createObservableGauge('system.cpu.usage', {
  description: 'System CPU usage',
  unit: '%',
}).addCallback((observableResult) => {
  const cpus = os.cpus();
  const usage = cpus.reduce((acc, cpu) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b);
    const idle = cpu.times.idle;
    return acc + (1 - idle / total);
  }, 0) / cpus.length * 100;

  observableResult.observe(usage);
});

// メモリ使用量
meter.createObservableGauge('system.memory.usage', {
  description: 'System memory usage',
  unit: 'bytes',
}).addCallback((observableResult) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  observableResult.observe(totalMem - freeMem);
});
```

### カスタムメトリクス

```typescript
// ビジネスメトリクス: 注文数
const orderCounter = meter.createCounter('orders.created', {
  description: 'Total orders created',
  unit: '1',
});

app.post('/orders', async (req, res) => {
  const order = await createOrder(req.body);

  orderCounter.add(1, {
    product: order.productName,
    country: order.shippingCountry,
  });

  res.json(order);
});

// エラー率
const errorCounter = meter.createCounter('errors.count', {
  description: 'Total errors',
  unit: '1',
});

app.use((err, req, res, next) => {
  errorCounter.add(1, {
    type: err.name,
    route: req.path,
  });
  res.status(500).json({ error: err.message });
});
```

## ログとの統合

### ログとトレースの関連付け

```typescript
import { trace, context } from '@opentelemetry/api';
import winston from 'winston';

// Winstonロガー設定
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

// トレースコンテキストをログに追加
function logWithTrace(message: string, level: string = 'info') {
  const span = trace.getActiveSpan();
  const traceId = span?.spanContext().traceId;
  const spanId = span?.spanContext().spanId;

  logger.log(level, message, {
    traceId,
    spanId,
  });
}

// 使用例
app.get('/users/:id', async (req, res) => {
  const userId = req.params.id;

  logWithTrace(`Fetching user ${userId}`, 'info');

  try {
    const user = await getUserById(userId);
    logWithTrace(`User ${userId} found`, 'info');
    res.json(user);
  } catch (error) {
    logWithTrace(`Error fetching user ${userId}: ${error.message}`, 'error');
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

出力例:

```json
{
  "level": "info",
  "message": "Fetching user 123",
  "timestamp": "2026-02-05T10:30:00.000Z",
  "traceId": "a1b2c3d4e5f6g7h8i9j0",
  "spanId": "1a2b3c4d5e6f7g8h"
}
```

## Next.js統合

### Next.jsプロジェクトでのセットアップ

```typescript
// instrumentation.ts (Next.js 13.4+)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { NodeSDK } = await import('@opentelemetry/sdk-node');
    const { getNodeAutoInstrumentations } = await import(
      '@opentelemetry/auto-instrumentations-node'
    );
    const { OTLPTraceExporter } = await import(
      '@opentelemetry/exporter-trace-otlp-http'
    );

    const sdk = new NodeSDK({
      serviceName: 'nextjs-app',
      traceExporter: new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
      }),
      instrumentations: [getNodeAutoInstrumentations()],
    });

    sdk.start();
  }
}
```

### next.config.jsでの有効化

```javascript
// next.config.js
module.exports = {
  experimental: {
    instrumentationHook: true,
  },
};
```

### APIルートでのトレーシング

```typescript
// app/api/users/route.ts
import { trace } from '@opentelemetry/api';
import { NextResponse } from 'next/server';

const tracer = trace.getTracer('nextjs-api');

export async function GET() {
  return tracer.startActiveSpan('GET /api/users', async (span) => {
    try {
      span.setAttribute('api.route', '/api/users');

      const users = await db.select().from(usersTable);

      span.setAttribute('users.count', users.length);
      span.setStatus({ code: 1 }); // OK

      return NextResponse.json(users);
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
      span.end();
    }
  });
}
```

### Server Componentsでのトレーシング

```typescript
// app/users/page.tsx
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('nextjs-pages');

async function getUsersFromDB() {
  return tracer.startActiveSpan('getUsersFromDB', async (span) => {
    const users = await db.select().from(usersTable);
    span.setAttribute('users.count', users.length);
    span.end();
    return users;
  });
}

export default async function UsersPage() {
  const users = await getUsersFromDB();

  return (
    <div>
      <h1>Users</h1>
      <ul>
        {users.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

## バックエンド（Jaeger、Grafana等）

### Jaegerのセットアップ

Jaegerは、トレースデータを可視化するツールです。

```bash
# Docker Composeでローカル起動
docker run -d \
  --name jaeger \
  -e COLLECTOR_OTLP_ENABLED=true \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest
```

ブラウザで`http://localhost:16686`を開くとJaeger UIにアクセスできます。

### Grafana + Tempoのセットアップ

```yaml
# docker-compose.yml
version: '3.8'

services:
  tempo:
    image: grafana/tempo:latest
    command: ["-config.file=/etc/tempo.yaml"]
    volumes:
      - ./tempo.yaml:/etc/tempo.yaml
    ports:
      - "4318:4318"   # OTLP HTTP
      - "3200:3200"   # Tempo

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Admin
```

```yaml
# tempo.yaml
server:
  http_listen_port: 3200

distributor:
  receivers:
    otlp:
      protocols:
        http:

storage:
  trace:
    backend: local
    local:
      path: /tmp/tempo/traces
```

起動:

```bash
docker-compose up -d
```

Grafanaで`http://localhost:3000`を開き、Tempoをデータソースに追加します。

## 実践的なパターン

### パターン1: マイクロサービス間のトレーシング

```typescript
// サービスA: API Gateway
app.get('/orders/:id', async (req, res) => {
  return tracer.startActiveSpan('getOrder', async (span) => {
    const orderId = req.params.id;
    span.setAttribute('order.id', orderId);

    // サービスBを呼び出し（自動でコンテキスト伝播）
    const order = await fetch(`http://order-service/orders/${orderId}`);
    const orderData = await order.json();

    // サービスCを呼び出し
    const user = await fetch(`http://user-service/users/${orderData.userId}`);
    const userData = await user.json();

    span.end();
    res.json({ ...orderData, user: userData });
  });
});
```

トレース可視化:

```
Trace: GET /orders/123
├── Span: API Gateway (150ms)
│   ├── Span: HTTP GET order-service (80ms)
│   │   └── Span: DB query orders (60ms)
│   └── Span: HTTP GET user-service (50ms)
│       └── Span: DB query users (30ms)
```

### パターン2: データベースクエリの詳細トレーシング

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('database');

async function queryWithTracing(sql: string, params: any[]) {
  return tracer.startActiveSpan('db.query', async (span) => {
    span.setAttribute('db.statement', sql);
    span.setAttribute('db.system', 'postgresql');

    const start = Date.now();

    try {
      const result = await db.query(sql, params);

      const duration = Date.now() - start;
      span.setAttribute('db.duration', duration);
      span.setAttribute('db.rows', result.length);

      span.setStatus({ code: 1 }); // OK
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

### パターン3: 外部API呼び出しのトレーシング

```typescript
async function fetchExternalAPI(url: string) {
  return tracer.startActiveSpan('external.api', async (span) => {
    span.setAttribute('http.url', url);
    span.setAttribute('http.method', 'GET');

    try {
      const response = await fetch(url);

      span.setAttribute('http.status_code', response.status);

      if (!response.ok) {
        span.setStatus({ code: 2, message: `HTTP ${response.status}` });
      } else {
        span.setStatus({ code: 1 });
      }

      return response.json();
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

## まとめ

### OpenTelemetryの強み

1. **ベンダー中立**: ツールを自由に選べる
2. **統一API**: トレース・メトリクス・ログを統合
3. **自動計装**: 手動実装不要
4. **分散トレーシング**: マイクロサービスに最適
5. **業界標準**: CNCF公式プロジェクト

### ベストプラクティス

- サービス名を明確に設定
- 重要な操作に手動スパンを追加
- 属性（attributes）を活用してメタデータを記録
- エラーは必ずspan.recordExceptionで記録
- メトリクスはビジネス指標も含める

### 次のステップ

- 公式ドキュメント: https://opentelemetry.io/
- JavaScript SDK: https://opentelemetry.io/docs/instrumentation/js/
- Jaeger: https://www.jaegertracing.io/
- Grafana: https://grafana.com/

OpenTelemetryで、アプリケーションの可観測性を向上させましょう。

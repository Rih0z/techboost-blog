---
title: 'OpenTelemetry × Node.js実践ガイド: 分散トレーシングとオブザーバビリティで本番運用を支える'
description: 'OpenTelemetryをNode.jsアプリケーションに導入し、トレース・メトリクス・ログの統合監視を実現する完全ガイド。自動計装、手動計装、Jaeger/Prometheus連携、実運用のベストプラクティスを解説'
pubDate: 2025-06-25
updatedDate: 2025-06-25
tags: ['OpenTelemetry', 'Node.js', 'オブザーバビリティ', '分散トレーシング', 'モニタリング', 'プログラミング']
category: 'バックエンド'
---

# OpenTelemetry × Node.js実践ガイド: 分散トレーシングとオブザーバビリティで本番運用を支える

OpenTelemetryは、トレース、メトリクス、ログを統合的に扱うオブザーバビリティのCNCF標準です。

本記事では、Node.jsアプリケーションへのOpenTelemetry導入から、自動計装、手動計装、Jaeger/Prometheus連携、実運用のベストプラクティスまで徹底解説します。

## OpenTelemetryとは

### オブザーバビリティの3つの柱

1. **トレース（Traces）**: リクエストの流れを追跡
2. **メトリクス（Metrics）**: システムの定量的指標
3. **ログ（Logs）**: イベントの詳細記録

### OpenTelemetryの利点

- **ベンダーニュートラル**: 特定のAPMツールに依存しない
- **標準化**: CNCF標準の計装API
- **柔軟な出力先**: Jaeger、Prometheus、Grafana、Datadog、New Relicなど
- **自動計装**: 主要フレームワーク・ライブラリに対応
- **コンテキスト伝播**: マイクロサービス間でトレースを継承

## 環境セットアップ

### 必要なパッケージのインストール

```bash
# OpenTelemetry SDK
npm install @opentelemetry/sdk-node \
  @opentelemetry/api \
  @opentelemetry/auto-instrumentations-node

# エクスポーター（出力先）
npm install @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/exporter-metrics-otlp-http \
  @opentelemetry/exporter-jaeger

# リソース検出
npm install @opentelemetry/resources \
  @opentelemetry/semantic-conventions
```

### プロジェクト構成

```
my-app/
├── src/
│   ├── instrumentation.ts    # OpenTelemetry設定
│   ├── index.ts              # アプリケーション
│   └── tracing.ts            # カスタムトレース
├── docker-compose.yml        # Jaeger/Prometheus起動
└── package.json
```

## 基本的な自動計装

### instrumentation.tsの作成

```typescript
// src/instrumentation.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';

const jaegerExporter = new JaegerExporter({
    endpoint: 'http://localhost:14268/api/traces',
});

const metricReader = new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
        url: 'http://localhost:4318/v1/metrics',
    }),
    exportIntervalMillis: 1000,
});

const sdk = new NodeSDK({
    resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'my-node-app',
        [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    }),
    traceExporter: jaegerExporter,
    metricReader,
    instrumentations: [
        getNodeAutoInstrumentations({
            // 自動計装の設定
            '@opentelemetry/instrumentation-http': {
                enabled: true,
            },
            '@opentelemetry/instrumentation-express': {
                enabled: true,
            },
            '@opentelemetry/instrumentation-pg': {
                enabled: true,
            },
            '@opentelemetry/instrumentation-mongodb': {
                enabled: true,
            },
            '@opentelemetry/instrumentation-redis': {
                enabled: true,
            },
        }),
    ],
});

sdk.start();

// プロセス終了時のクリーンアップ
process.on('SIGTERM', () => {
    sdk.shutdown()
        .then(() => console.log('OpenTelemetry shutdown'))
        .catch((error) => console.error('Error shutting down', error))
        .finally(() => process.exit(0));
});

export default sdk;
```

### アプリケーション起動

```typescript
// src/index.ts
// 必ず最初にインポート
import './instrumentation';

import express from 'express';
import { trace } from '@opentelemetry/api';

const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/api/users', async (req, res) => {
    // 自動でトレースされる
    const users = await fetchUsers();
    res.json(users);
});

app.get('/api/users/:id', async (req, res) => {
    const user = await fetchUserById(req.params.id);
    res.json(user);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

async function fetchUsers() {
    // DBクエリも自動でトレース
    return [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
    ];
}

async function fetchUserById(id: string) {
    return { id, name: 'Alice' };
}
```

package.jsonに起動スクリプト追加:

```json
{
  "scripts": {
    "start": "node --require ./src/instrumentation.js src/index.js",
    "dev": "nodemon --require ./src/instrumentation.js src/index.js"
  }
}
```

## 手動計装（カスタムスパン）

### 基本的なスパンの作成

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('my-app', '1.0.0');

async function processOrder(orderId: string) {
    // スパンの開始
    const span = tracer.startSpan('processOrder');

    try {
        // 属性の追加
        span.setAttribute('order.id', orderId);
        span.setAttribute('order.priority', 'high');

        // 処理実行
        const order = await fetchOrder(orderId);
        await validateOrder(order);
        await saveOrder(order);

        // 成功
        span.setStatus({ code: SpanStatusCode.OK });
        return order;
    } catch (error) {
        // エラー記録
        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message,
        });
        span.recordException(error);
        throw error;
    } finally {
        // スパン終了
        span.end();
    }
}
```

### ネストしたスパン

```typescript
import { context, trace } from '@opentelemetry/api';

const tracer = trace.getTracer('my-app');

async function handleRequest(userId: string) {
    return tracer.startActiveSpan('handleRequest', async (parentSpan) => {
        try {
            parentSpan.setAttribute('user.id', userId);

            // 子スパン1
            const user = await tracer.startActiveSpan('fetchUser', async (span) => {
                span.setAttribute('db.operation', 'SELECT');
                const result = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
                span.end();
                return result;
            });

            // 子スパン2
            const orders = await tracer.startActiveSpan('fetchOrders', async (span) => {
                span.setAttribute('db.operation', 'SELECT');
                const result = await db.query('SELECT * FROM orders WHERE user_id = ?', [userId]);
                span.end();
                return result;
            });

            parentSpan.setStatus({ code: SpanStatusCode.OK });
            return { user, orders };
        } catch (error) {
            parentSpan.recordException(error);
            parentSpan.setStatus({ code: SpanStatusCode.ERROR });
            throw error;
        } finally {
            parentSpan.end();
        }
    });
}
```

### イベントの記録

```typescript
async function checkout(cartId: string) {
    return tracer.startActiveSpan('checkout', async (span) => {
        try {
            // イベント1: カート検証
            span.addEvent('validating_cart', {
                'cart.id': cartId,
                'cart.items': 5,
            });

            const cart = await validateCart(cartId);

            // イベント2: 在庫確認
            span.addEvent('checking_inventory');
            await checkInventory(cart.items);

            // イベント3: 決済処理
            span.addEvent('processing_payment', {
                'payment.amount': cart.total,
                'payment.currency': 'JPY',
            });

            const payment = await processPayment(cart);

            // イベント4: 注文確定
            span.addEvent('order_confirmed', {
                'order.id': payment.orderId,
            });

            span.setStatus({ code: SpanStatusCode.OK });
            return payment;
        } finally {
            span.end();
        }
    });
}
```

## メトリクスの計測

### カウンター

```typescript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('my-app');

// カウンター作成
const requestCounter = meter.createCounter('http.requests', {
    description: 'Total number of HTTP requests',
});

const errorCounter = meter.createCounter('http.errors', {
    description: 'Total number of HTTP errors',
});

// Express ミドルウェア
app.use((req, res, next) => {
    requestCounter.add(1, {
        method: req.method,
        route: req.route?.path || req.path,
    });

    res.on('finish', () => {
        if (res.statusCode >= 400) {
            errorCounter.add(1, {
                method: req.method,
                status: res.statusCode,
            });
        }
    });

    next();
});
```

### ヒストグラム

```typescript
// レスポンスタイム計測
const responseTimeHistogram = meter.createHistogram('http.response_time', {
    description: 'HTTP response time in milliseconds',
    unit: 'ms',
});

app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        responseTimeHistogram.record(duration, {
            method: req.method,
            route: req.route?.path || req.path,
            status: res.statusCode,
        });
    });

    next();
});
```

### ゲージ（動的な値）

```typescript
// アクティブ接続数
let activeConnections = 0;

const activeConnectionsGauge = meter.createObservableGauge('http.active_connections', {
    description: 'Number of active HTTP connections',
});

activeConnectionsGauge.addCallback((observableResult) => {
    observableResult.observe(activeConnections);
});

app.use((req, res, next) => {
    activeConnections++;
    res.on('finish', () => {
        activeConnections--;
    });
    next();
});

// メモリ使用量
const memoryGauge = meter.createObservableGauge('process.memory.usage', {
    description: 'Process memory usage in bytes',
    unit: 'bytes',
});

memoryGauge.addCallback((observableResult) => {
    const usage = process.memoryUsage();
    observableResult.observe(usage.heapUsed, { type: 'heap' });
    observableResult.observe(usage.rss, { type: 'rss' });
});
```

## データベースとの統合

### PostgreSQL

```typescript
import { Pool } from 'pg';
import { trace, SpanKind } from '@opentelemetry/api';

const pool = new Pool({
    host: 'localhost',
    database: 'mydb',
    user: 'user',
    password: 'password',
});

async function queryWithTracing<T>(
    sql: string,
    params: any[] = []
): Promise<T[]> {
    const tracer = trace.getTracer('db');

    return tracer.startActiveSpan(
        'db.query',
        {
            kind: SpanKind.CLIENT,
            attributes: {
                'db.system': 'postgresql',
                'db.statement': sql,
                'db.operation': sql.split(' ')[0].toUpperCase(),
            },
        },
        async (span) => {
            try {
                const start = Date.now();
                const result = await pool.query(sql, params);
                const duration = Date.now() - start;

                span.setAttribute('db.rows_affected', result.rowCount);
                span.setAttribute('db.duration_ms', duration);
                span.setStatus({ code: SpanStatusCode.OK });

                return result.rows;
            } catch (error) {
                span.recordException(error);
                span.setStatus({ code: SpanStatusCode.ERROR });
                throw error;
            } finally {
                span.end();
            }
        }
    );
}
```

### MongoDB

```typescript
import { MongoClient } from 'mongodb';

// 自動計装が有効な場合、MongoDBクエリは自動でトレースされる
const client = new MongoClient('mongodb://localhost:27017');

async function findUsers() {
    // このクエリは自動でトレース
    const users = await client.db('mydb').collection('users').find({}).toArray();
    return users;
}

// カスタム属性を追加したい場合
async function findUsersWithCustomTracing() {
    const tracer = trace.getTracer('mongodb');

    return tracer.startActiveSpan('findUsers', async (span) => {
        span.setAttribute('collection', 'users');
        span.setAttribute('query.type', 'find');

        const users = await client.db('mydb').collection('users').find({}).toArray();

        span.setAttribute('result.count', users.length);
        span.end();

        return users;
    });
}
```

## 外部API呼び出しのトレース

### HTTP クライアント

```typescript
import axios from 'axios';
import { propagation, context, trace } from '@opentelemetry/api';

async function fetchExternalData(endpoint: string) {
    const tracer = trace.getTracer('http-client');

    return tracer.startActiveSpan('external_api_call', async (span) => {
        try {
            span.setAttribute('http.url', endpoint);
            span.setAttribute('http.method', 'GET');

            // トレースコンテキストをヘッダーに注入
            const headers: Record<string, string> = {};
            propagation.inject(context.active(), headers);

            const response = await axios.get(endpoint, { headers });

            span.setAttribute('http.status_code', response.status);
            span.setStatus({ code: SpanStatusCode.OK });

            return response.data;
        } catch (error) {
            span.recordException(error);
            span.setStatus({ code: SpanStatusCode.ERROR });
            throw error;
        } finally {
            span.end();
        }
    });
}
```

## Jaeger・Prometheusとの連携

### docker-compose.yml

```yaml
version: '3.8'

services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # Jaeger UI
      - "14268:14268"  # Jaeger collector
      - "4318:4318"    # OTLP HTTP receiver
    environment:
      - COLLECTOR_OTLP_ENABLED=true

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'

  otel-collector:
    image: otel/opentelemetry-collector:latest
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4317:4317"   # OTLP gRPC receiver
      - "4318:4318"   # OTLP HTTP receiver
      - "8889:8889"   # Prometheus metrics exporter
```

### OpenTelemetry Collector設定

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

exporters:
  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true

  prometheus:
    endpoint: 0.0.0.0:8889

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [jaeger]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]
```

### Prometheus設定

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'otel-collector'
    static_configs:
      - targets: ['otel-collector:8889']
```

## 実運用のベストプラクティス

### サンプリング戦略

```typescript
import { TraceIdRatioBasedSampler, ParentBasedSampler } from '@opentelemetry/sdk-trace-base';

const sdk = new NodeSDK({
    // 10%のトレースをサンプリング
    sampler: new ParentBasedSampler({
        root: new TraceIdRatioBasedSampler(0.1),
    }),
    // ...
});
```

### 環境別設定

```typescript
// src/instrumentation.ts
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

const sdk = new NodeSDK({
    resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: process.env.SERVICE_NAME || 'my-app',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV,
    }),
    traceExporter: isProduction
        ? new OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT })
        : new JaegerExporter({ endpoint: 'http://localhost:14268/api/traces' }),
    sampler: isProduction
        ? new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(0.1) })
        : new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(1.0) }),
    // ...
});
```

### エラーハンドリング

```typescript
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const span = trace.getActiveSpan();

    if (span) {
        span.recordException(err);
        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: err.message,
        });
        span.setAttribute('error.type', err.name);
        span.setAttribute('error.stack', err.stack || '');
    }

    res.status(500).json({ error: 'Internal Server Error' });
});
```

## まとめ

OpenTelemetryを使ったNode.jsアプリケーションの監視方法を解説しました。

### キーポイント

- **自動計装**: 主要ライブラリは設定するだけで計測可能
- **手動計装**: ビジネスロジックのトレースを追加
- **メトリクス**: カウンター、ヒストグラム、ゲージで定量計測
- **統合**: Jaeger、Prometheus、Grafanaで可視化

### ベストプラクティス

1. **早期導入**: 開発初期からトレース埋め込み
2. **適切なサンプリング**: 本番環境では負荷を考慮
3. **セマンティック規約**: 標準的な属性名を使用
4. **エラー記録**: 例外情報を漏れなくキャプチャ

OpenTelemetryで、本番環境の可観測性を高めましょう。

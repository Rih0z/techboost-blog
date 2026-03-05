---
title: "OpenTelemetryで始めるオブザーバビリティ入門【実践ガイド】"
description: "OpenTelemetryの概念、トレース・メトリクス・ログの統合、Node.jsアプリへの導入方法、Grafana/Jaeger連携の実践的な解説です。"
pubDate: "2026-02-05"
tags: ["OpenTelemetry", "Observability", "Monitoring", "Node.js", "DevOps", "プログラミング"]
---

## オブザーバビリティとは

オブザーバビリティ（可観測性）は、システムの内部状態を外部からの出力（ログ、メトリクス、トレース）によって理解する能力です。従来のモニタリングを超えて、「なぜ」問題が起きているかを理解できます。

### 3つの柱

1. **トレース（Traces）**: リクエストの流れを追跡
2. **メトリクス（Metrics）**: システムの定量的な測定値
3. **ログ（Logs）**: 個別のイベント記録

## OpenTelemetryとは

OpenTelemetry（OTel）は、CNCF（Cloud Native Computing Foundation）が管理するオープンソースのオブザーバビリティフレームワークです。

### 主な特徴

- **ベンダーニュートラル**: 特定のツールに依存しない
- **標準化**: トレース、メトリクス、ログを統一的に扱う
- **多言語対応**: Java、Go、Python、Node.js、Rustなど
- **自動計装**: フレームワークやライブラリを自動で計装

## Node.jsへの導入

### インストール

```bash
npm install @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/exporter-metrics-otlp-http
```

### 基本的なセットアップ

```typescript
// instrumentation.ts
import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'

const sdk = new NodeSDK({
  serviceName: 'my-service',
  traceExporter: new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: 'http://localhost:4318/v1/metrics',
    }),
    exportIntervalMillis: 10000,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
})

sdk.start()

process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Telemetry terminated'))
    .catch((error) => console.log('Error terminating telemetry', error))
})
```

### アプリケーションへの適用

```typescript
// index.ts
import './instrumentation' // 最初にインポート

import express from 'express'
import { trace } from '@opentelemetry/api'

const app = express()
const tracer = trace.getTracer('my-app')

app.get('/api/users/:id', async (req, res) => {
  const span = tracer.startSpan('fetch-user')

  try {
    const userId = req.params.id
    span.setAttribute('user.id', userId)

    const user = await fetchUser(userId)

    span.setStatus({ code: 0 }) // SUCCESS
    res.json(user)
  } catch (error) {
    span.recordException(error as Error)
    span.setStatus({ code: 2 }) // ERROR
    res.status(500).json({ error: 'Failed to fetch user' })
  } finally {
    span.end()
  }
})

app.listen(3000)
```

## トレースの実装

### カスタムスパンの作成

```typescript
import { trace, context } from '@opentelemetry/api'

const tracer = trace.getTracer('my-service')

async function processOrder(orderId: string) {
  const span = tracer.startSpan('process-order')

  span.setAttribute('order.id', orderId)
  span.setAttribute('order.status', 'processing')

  try {
    // データベースクエリ（自動計装される）
    const order = await db.order.findUnique({ where: { id: orderId } })

    // カスタムスパン
    const paymentSpan = tracer.startSpan('process-payment', {
      attributes: {
        'payment.amount': order.amount,
        'payment.method': order.paymentMethod,
      }
    })

    await processPayment(order)
    paymentSpan.end()

    // イベントの記録
    span.addEvent('order-completed', {
      'order.total': order.amount,
      'items.count': order.items.length,
    })

    span.setStatus({ code: 0 })
  } catch (error) {
    span.recordException(error as Error)
    span.setStatus({ code: 2, message: error.message })
    throw error
  } finally {
    span.end()
  }
}
```

### 分散トレーシング

マイクロサービス間のリクエストを追跡します。

```typescript
// Service A
import { propagation, context } from '@opentelemetry/api'

async function callServiceB() {
  const span = tracer.startSpan('call-service-b')

  // コンテキストを伝播
  const headers: Record<string, string> = {}
  propagation.inject(context.active(), headers)

  const response = await fetch('http://service-b/api', {
    headers,
  })

  span.end()
  return response
}
```

```typescript
// Service B
import { propagation, context } from '@opentelemetry/api'

app.use((req, res, next) => {
  // コンテキストを抽出
  const ctx = propagation.extract(context.active(), req.headers)

  context.with(ctx, () => {
    next()
  })
})
```

## メトリクスの実装

### カスタムメトリクス

```typescript
import { metrics } from '@opentelemetry/api'

const meter = metrics.getMeter('my-service')

// カウンター
const requestCounter = meter.createCounter('http.requests', {
  description: 'Total HTTP requests',
})

// ヒストグラム
const responseTimeHistogram = meter.createHistogram('http.response.duration', {
  description: 'HTTP response time in ms',
  unit: 'ms',
})

// UpDownCounter
const activeConnections = meter.createUpDownCounter('http.active.connections', {
  description: 'Current active connections',
})

app.use((req, res, next) => {
  const start = Date.now()

  activeConnections.add(1)
  requestCounter.add(1, { method: req.method, route: req.path })

  res.on('finish', () => {
    const duration = Date.now() - start
    responseTimeHistogram.record(duration, {
      method: req.method,
      status: res.statusCode,
    })
    activeConnections.add(-1)
  })

  next()
})
```

### ビジネスメトリクス

```typescript
const ordersMeter = meter.createCounter('orders.created', {
  description: 'Total orders created',
})

const revenueCounter = meter.createCounter('revenue.total', {
  description: 'Total revenue',
  unit: 'USD',
})

async function createOrder(order: Order) {
  await db.order.create({ data: order })

  ordersMeter.add(1, {
    'order.type': order.type,
    'customer.tier': order.customer.tier,
  })

  revenueCounter.add(order.total, {
    'payment.method': order.paymentMethod,
  })
}
```

## ログとの統合

### 構造化ログ + トレースコンテキスト

```typescript
import { trace } from '@opentelemetry/api'
import pino from 'pino'

const logger = pino()

function logWithContext(message: string, data?: any) {
  const span = trace.getActiveSpan()
  const spanContext = span?.spanContext()

  logger.info({
    message,
    ...data,
    traceId: spanContext?.traceId,
    spanId: spanContext?.spanId,
  })
}

// 使用例
app.get('/api/orders', async (req, res) => {
  logWithContext('Fetching orders', { userId: req.user.id })

  const orders = await db.order.findMany()

  logWithContext('Orders fetched', { count: orders.length })
  res.json(orders)
})
```

## Jaegerとの連携

Jaegerはトレースの可視化ツールです。

### Docker Composeでセットアップ

```yaml
version: '3'
services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # UI
      - "4318:4318"    # OTLP HTTP
    environment:
      - COLLECTOR_OTLP_ENABLED=true
```

```bash
docker-compose up -d
```

ブラウザで `http://localhost:16686` にアクセスすると、トレースを可視化できます。

## Grafanaとの連携

### Prometheusエクスポーター

```typescript
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus'

const prometheusExporter = new PrometheusExporter({
  port: 9464,
})

const sdk = new NodeSDK({
  metricReader: prometheusExporter,
  // ...
})
```

### Grafanaダッシュボード

```yaml
# docker-compose.yml
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'my-service'
    static_configs:
      - targets: ['host.docker.internal:9464']
```

## Next.jsでの実装

```typescript
// instrumentation.ts (Next.js 15+)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { NodeSDK } = await import('@opentelemetry/sdk-node')
    const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node')

    const sdk = new NodeSDK({
      serviceName: 'nextjs-app',
      instrumentations: [getNodeAutoInstrumentations()],
    })

    sdk.start()
  }
}
```

## ベストプラクティス

### 1. 適切な粒度

```typescript
// ❌ 過度に細かいスパン
for (const item of items) {
  const span = tracer.startSpan('process-item')
  processItem(item)
  span.end()
}

// ✅ 適切な粒度
const span = tracer.startSpan('process-items', {
  attributes: { 'items.count': items.length }
})
items.forEach(processItem)
span.end()
```

### 2. 意味のある属性

```typescript
// ✅ 有用な属性
span.setAttribute('user.id', userId)
span.setAttribute('order.amount', order.total)
span.setAttribute('db.query.type', 'SELECT')
```

### 3. エラーの適切な記録

```typescript
try {
  await riskyOperation()
} catch (error) {
  span.recordException(error as Error)
  span.setStatus({ code: 2, message: error.message })
  throw error
}
```

## まとめ

OpenTelemetryを導入することで、以下が実現できます。

- **包括的な可視性**: システム全体の動作を理解
- **パフォーマンス分析**: ボトルネックの特定
- **エラー追跡**: 問題の根本原因を迅速に発見
- **ベンダーロックイン回避**: 任意のバックエンドに切り替え可能

小規模なプロジェクトでもトレースだけでも導入する価値があります。まずは自動計装から始めて、徐々にカスタムスパンやメトリクスを追加していくのがおすすめです。

## 参考リンク

- [OpenTelemetry公式サイト](https://opentelemetry.io/)
- [OpenTelemetry JavaScript](https://github.com/open-telemetry/opentelemetry-js)
- [Jaeger](https://www.jaegertracing.io/)
- [Grafana](https://grafana.com/)

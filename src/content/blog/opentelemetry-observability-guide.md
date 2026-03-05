---
title: "OpenTelemetryで始める分散トレーシング - 完全実装ガイド"
description: "OpenTelemetryを使った分散トレーシングの導入から実践まで。Node.js、Next.js、Cloudflare Workers環境での実装方法、メトリクス収集、ログ統合を詳しく解説します。"
pubDate: "2025-02-05"
tags: ['プログラミング']
---

OpenTelemetry（OTel）は、分散システムのオブザーバビリティを実現するためのオープンソース標準です。トレース、メトリクス、ログを統一的に扱い、ベンダーロックインを回避できます。

本記事では、OpenTelemetryの基礎から実践的な実装パターン、本番環境での運用まで詳しく解説します。

## OpenTelemetryとは

OpenTelemetryは、**CNCF（Cloud Native Computing Foundation）の卒業プロジェクト**で、可観測性データの標準化を目指しています。

### 主要コンポーネント

OpenTelemetryは3つの柱で構成されています。

```typescript
// Traces（トレース）
// リクエストの処理フローを追跡
const span = tracer.startSpan('database-query');
span.setAttribute('db.system', 'postgresql');
span.end();

// Metrics（メトリクス）
// システムの測定値を記録
const counter = meter.createCounter('http_requests_total');
counter.add(1, { method: 'GET', status: 200 });

// Logs（ログ）
// 構造化されたログ出力
logger.emit({
  severityText: 'INFO',
  body: 'User logged in',
  attributes: { userId: '123' },
});
```

### OpenTelemetryの利点

**ベンダー中立性**: 任意のバックエンド（Jaeger、Zipkin、Datadog等）に送信可能
**標準化**: 業界標準のAPI・SDKで学習コストを削減
**自動計装**: 多くのライブラリ・フレームワークを自動計装
**拡張性**: カスタム計装でビジネスメトリクスも収集

## セットアップ

### Node.jsでの基本セットアップ

まず、必要なパッケージをインストールします。

```bash
npm install @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/exporter-metrics-otlp-http
```

基本的な設定ファイルを作成します。

```typescript
// instrumentation.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: 'my-api-service',
    [SEMRESATTRS_SERVICE_VERSION]: '1.0.0',
  }),
  traceExporter: new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
  }),
  metricReader: new OTLPMetricExporter({
    url: 'http://localhost:4318/v1/metrics',
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false, // ファイルシステムは除外
      },
    }),
  ],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});
```

アプリケーションの起動時に読み込みます。

```json
// package.json
{
  "scripts": {
    "start": "node -r ./instrumentation.js app.js"
  }
}
```

### Expressアプリケーションでの実装

```typescript
// app.ts
import express from 'express';
import { trace, SpanStatusCode } from '@opentelemetry/api';

const app = express();
const tracer = trace.getTracer('express-app', '1.0.0');

// カスタムミドルウェアでトレース追加
app.use((req, res, next) => {
  const span = tracer.startSpan('http-request', {
    attributes: {
      'http.method': req.method,
      'http.url': req.url,
      'http.user_agent': req.get('user-agent'),
    },
  });

  res.on('finish', () => {
    span.setAttribute('http.status_code', res.statusCode);
    if (res.statusCode >= 400) {
      span.setStatus({ code: SpanStatusCode.ERROR });
    }
    span.end();
  });

  next();
});

app.get('/api/users/:id', async (req, res) => {
  const span = trace.getActiveSpan();
  span?.setAttribute('user.id', req.params.id);

  try {
    const user = await fetchUser(req.params.id);
    res.json(user);
  } catch (error) {
    span?.recordException(error as Error);
    span?.setStatus({ code: SpanStatusCode.ERROR });
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

async function fetchUser(id: string) {
  return tracer.startActiveSpan('fetch-user', async (span) => {
    span.setAttribute('db.system', 'postgresql');
    span.setAttribute('db.operation', 'SELECT');

    try {
      // データベースクエリの実行
      const user = await db.query('SELECT * FROM users WHERE id = $1', [id]);
      span.setStatus({ code: SpanStatusCode.OK });
      return user;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## 実践パターン

### パターン1: マイクロサービス間のトレーシング

複数のサービスをまたがるリクエストを追跡します。

```typescript
// service-a/api.ts
import { context, propagation, trace } from '@opentelemetry/api';
import axios from 'axios';

async function callServiceB(userId: string) {
  const tracer = trace.getTracer('service-a');

  return tracer.startActiveSpan('call-service-b', async (span) => {
    span.setAttribute('service.name', 'service-b');
    span.setAttribute('user.id', userId);

    // トレースコンテキストをHTTPヘッダーに注入
    const headers: Record<string, string> = {};
    propagation.inject(context.active(), headers);

    try {
      const response = await axios.get(`http://service-b:3001/api/data/${userId}`, {
        headers,
      });

      span.setStatus({ code: SpanStatusCode.OK });
      return response.data;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

```typescript
// service-b/api.ts
import express from 'express';
import { context, propagation } from '@opentelemetry/api';

const app = express();

app.get('/api/data/:userId', (req, res) => {
  // HTTPヘッダーからトレースコンテキストを抽出
  const extractedContext = propagation.extract(context.active(), req.headers);

  context.with(extractedContext, () => {
    const tracer = trace.getTracer('service-b');
    const span = tracer.startSpan('process-data');

    span.setAttribute('user.id', req.params.userId);

    // データ処理
    const data = processData(req.params.userId);

    span.end();
    res.json(data);
  });
});
```

### パターン2: Next.js App Routerでのトレーシング

```typescript
// instrumentation.ts（Next.js 15+）
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { NodeSDK } = await import('@opentelemetry/sdk-node');
    const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
    const { Resource } = await import('@opentelemetry/resources');
    const { SEMRESATTRS_SERVICE_NAME } = await import('@opentelemetry/semantic-conventions');

    const sdk = new NodeSDK({
      resource: new Resource({
        [SEMRESATTRS_SERVICE_NAME]: 'nextjs-app',
      }),
      traceExporter: new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
      }),
    });

    sdk.start();
  }
}
```

```typescript
// app/api/users/[id]/route.ts
import { trace, SpanStatusCode } from '@opentelemetry/api';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const tracer = trace.getTracer('nextjs-api');

  return tracer.startActiveSpan('api-get-user', async (span) => {
    span.setAttribute('user.id', params.id);
    span.setAttribute('http.method', 'GET');

    try {
      const user = await fetchUserFromDB(params.id);

      if (!user) {
        span.setAttribute('error', 'User not found');
        span.setStatus({ code: SpanStatusCode.ERROR });
        return Response.json({ error: 'Not found' }, { status: 404 });
      }

      span.setStatus({ code: SpanStatusCode.OK });
      return Response.json(user);
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      return Response.json({ error: 'Internal error' }, { status: 500 });
    } finally {
      span.end();
    }
  });
}

async function fetchUserFromDB(id: string) {
  const tracer = trace.getTracer('nextjs-api');

  return tracer.startActiveSpan('db-query-user', async (span) => {
    span.setAttribute('db.system', 'postgresql');
    span.setAttribute('db.operation', 'SELECT');
    span.setAttribute('db.statement', 'SELECT * FROM users WHERE id = $1');

    try {
      const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
      span.setStatus({ code: SpanStatusCode.OK });
      return result.rows[0];
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

### パターン3: Cloudflare Workersでのトレーシング

```typescript
// worker.ts
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { BasicTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // トレーサーの初期化
    const provider = new BasicTracerProvider();
    const exporter = new OTLPTraceExporter({
      url: env.OTEL_ENDPOINT,
      headers: {
        'Authorization': `Bearer ${env.OTEL_TOKEN}`,
      },
    });

    provider.addSpanProcessor(new BatchSpanProcessor(exporter));
    provider.register();

    const tracer = trace.getTracer('cloudflare-worker');

    return tracer.startActiveSpan('http-request', async (span) => {
      span.setAttribute('http.method', request.method);
      span.setAttribute('http.url', request.url);

      try {
        const url = new URL(request.url);

        if (url.pathname === '/api/data') {
          const data = await fetchData(tracer);
          span.setStatus({ code: SpanStatusCode.OK });
          return Response.json(data);
        }

        span.setStatus({ code: SpanStatusCode.ERROR });
        return new Response('Not Found', { status: 404 });
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        return new Response('Internal Error', { status: 500 });
      } finally {
        span.end();
        await provider.forceFlush();
      }
    });
  },
};

async function fetchData(tracer: any) {
  return tracer.startActiveSpan('fetch-external-api', async (span: any) => {
    span.setAttribute('http.url', 'https://api.example.com/data');

    try {
      const response = await fetch('https://api.example.com/data');
      const data = await response.json();
      span.setStatus({ code: SpanStatusCode.OK });
      return data;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

### パターン4: カスタムメトリクスの収集

```typescript
// metrics.ts
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('my-app', '1.0.0');

// Counter（カウンター）
const requestCounter = meter.createCounter('http_requests_total', {
  description: 'Total number of HTTP requests',
});

// Histogram（ヒストグラム）
const requestDuration = meter.createHistogram('http_request_duration_ms', {
  description: 'HTTP request duration in milliseconds',
  unit: 'ms',
});

// UpDownCounter（増減カウンター）
const activeConnections = meter.createUpDownCounter('active_connections', {
  description: 'Number of active connections',
});

// ObservableGauge（監視可能ゲージ）
const memoryUsage = meter.createObservableGauge('memory_usage_bytes', {
  description: 'Current memory usage in bytes',
});

memoryUsage.addCallback((observableResult) => {
  const usage = process.memoryUsage();
  observableResult.observe(usage.heapUsed, { type: 'heap_used' });
  observableResult.observe(usage.heapTotal, { type: 'heap_total' });
  observableResult.observe(usage.rss, { type: 'rss' });
});

// 使用例
export function recordRequest(method: string, path: string, status: number, duration: number) {
  requestCounter.add(1, {
    method,
    path,
    status: status.toString(),
  });

  requestDuration.record(duration, {
    method,
    path,
    status: status.toString(),
  });
}

export function trackConnection(delta: number) {
  activeConnections.add(delta);
}
```

```typescript
// app.ts
import express from 'express';
import { recordRequest, trackConnection } from './metrics';

const app = express();

app.use((req, res, next) => {
  const startTime = Date.now();
  trackConnection(1);

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    recordRequest(req.method, req.route?.path || req.path, res.statusCode, duration);
    trackConnection(-1);
  });

  next();
});
```

## 本番環境での運用

### バックエンドの選択

OpenTelemetryのデータを受け取るバックエンドを選択します。

```yaml
# docker-compose.yml（Jaegerを使用）
version: '3.8'

services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686" # UI
      - "4318:4318"   # OTLP HTTP
    environment:
      - COLLECTOR_OTLP_ENABLED=true

  app:
    build: .
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318
    depends_on:
      - jaeger
```

### サンプリング設定

本番環境では、すべてのトレースを記録すると負荷が高くなるため、サンプリングを設定します。

```typescript
// instrumentation.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { TraceIdRatioBasedSampler, ParentBasedSampler } from '@opentelemetry/sdk-trace-base';

const sdk = new NodeSDK({
  // 10%のトレースをサンプリング
  sampler: new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(0.1),
  }),
  // その他の設定...
});
```

### 環境変数での設定

```bash
# .env
OTEL_SERVICE_NAME=my-api-service
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io
OTEL_EXPORTER_OTLP_HEADERS=x-honeycomb-team=YOUR_API_KEY
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1
OTEL_LOG_LEVEL=info
```

### パフォーマンス最適化

```typescript
// 効率的なバッチ処理
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';

const processor = new BatchSpanProcessor(exporter, {
  maxQueueSize: 2048,
  maxExportBatchSize: 512,
  scheduledDelayMillis: 5000,
  exportTimeoutMillis: 30000,
});
```

## トラブルシューティング

### トレースが表示されない

```typescript
// デバッグ用の設定
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

// 詳細なログを出力
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
```

### メモリリークの防止

```typescript
// スパンの適切なクリーンアップ
async function processData() {
  const span = tracer.startSpan('process-data');

  try {
    // 処理
    return result;
  } catch (error) {
    span.recordException(error);
    throw error;
  } finally {
    // 必ずendを呼ぶ
    span.end();
  }
}
```

## まとめ

OpenTelemetryは、分散システムのオブザーバビリティを実現する強力なツールです。

### 主な利点

- **統一された標準**: トレース、メトリクス、ログを一元管理
- **ベンダー中立**: バックエンドを自由に選択可能
- **自動計装**: 多くのライブラリに対応
- **本番対応**: サンプリング、バッチ処理などの最適化

### 導入のステップ

1. **基本セットアップ**: SDK導入と自動計装の有効化
2. **カスタム計装**: ビジネスロジックのトレース追加
3. **メトリクス収集**: 重要な指標の測定
4. **バックエンド選定**: Jaeger、Honeycomb、Datadogなど
5. **本番最適化**: サンプリング、バッチ処理の調整

OpenTelemetryを活用することで、システムの可視化が劇的に向上し、問題の早期発見と迅速な対応が可能になります。

---
title: 'Grafana監視ダッシュボード構築ガイド - Prometheus連携とアラート設定'
description: 'Grafanaで本格的な監視ダッシュボードを構築。Prometheus連携、メトリクス可視化、アラート設定、ログ分析、ダッシュボード設計のベストプラクティスを実例付きで解説します。Grafana・Prometheus・Monitoringに関する実践情報。'
pubDate: '2025-02-06'
tags: ['Grafana', 'Prometheus', 'Monitoring', 'DevOps', 'Observability', 'インフラ']
---
Grafanaは、メトリクスやログを可視化するオープンソースの監視プラットフォームです。Prometheusと組み合わせることで、システムの状態をリアルタイムで監視し、問題を早期発見できます。本記事では、Grafanaの導入から実践的なダッシュボード構築まで解説します。

## Grafanaとは

Grafanaは、**時系列データを美しく可視化**するダッシュボードツールです。

### 主な特徴

- **多様なデータソース対応**: Prometheus、MySQL、PostgreSQL、Elasticsearch等
- **リアルタイム可視化**: メトリクスを即座にグラフ化
- **柔軟なダッシュボード**: ドラッグ&ドロップで簡単作成
- **アラート機能**: 閾値超過時に通知
- **無料・オープンソース**: 商用利用も可能

### ユースケース

- インフラ監視（CPU、メモリ、ディスク）
- アプリケーションパフォーマンス監視
- ビジネスメトリクス可視化
- ログ分析
- IoTデータ可視化

## Prometheusとは

Prometheusは、**メトリクス収集・保存**に特化した時系列データベースです。

### 主な特徴

- **Pull型アーキテクチャ**: 定期的にメトリクスを取得
- **多次元データモデル**: ラベルで柔軟にフィルタリング
- **PromQL**: 強力なクエリ言語
- **サービスディスカバリ**: 動的な監視対象検出

### アーキテクチャ

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ Application │────→│  Prometheus  │────→│   Grafana   │
│  (Exporter) │     │   (Storage)  │     │ (Visualize) │
└─────────────┘     └──────────────┘     └─────────────┘
                            │
                            ↓
                    ┌──────────────┐
                    │  Alertmanager│
                    └──────────────┘
```

## 環境構築

### Docker Composeで一括セットアップ

```yaml
# docker-compose.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false

  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    ports:
      - "9100:9100"
    command:
      - '--path.rootfs=/host'
    volumes:
      - '/:/host:ro,rslave'

volumes:
  prometheus-data:
  grafana-data:
```

### Prometheus設定

```yaml
# prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # Prometheus自身を監視
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Node Exporter（サーバーメトリクス）
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

  # カスタムアプリケーション
  - job_name: 'my-app'
    static_configs:
      - targets: ['my-app:8080']
```

### 起動

```bash
# Docker Composeで起動
docker-compose up -d

# アクセス確認
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000 (admin/admin)
```

## Grafanaの初期設定

### 1. ログイン

```
URL: http://localhost:3000
Username: admin
Password: admin
```

初回ログイン後、パスワード変更を求められます。

### 2. データソース追加

```
1. 左メニュー「Configuration」→「Data Sources」
2. 「Add data source」
3. 「Prometheus」を選択
4. URL: http://prometheus:9090
5. 「Save & Test」
```

### 3. ダッシュボードインポート

```
1. 左メニュー「+」→「Import」
2. Grafana.comのダッシュボードIDを入力
   - Node Exporter Full: 1860
   - Docker Monitoring: 893
3. 「Load」→データソース選択→「Import」
```

## メトリクスの可視化

### 基本的なパネル作成

```
1. 「+」→「Dashboard」→「Add new panel」
2. Query設定:
   - Metric: up
   - Legend: {{job}}
3. Visualization設定:
   - Type: Time series
   - Title: Service Uptime
4. 「Apply」で保存
```

### PromQLクエリ例

```promql
# CPU使用率
100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# メモリ使用率
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# ディスク使用率
(1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100

# HTTPリクエスト数（5分間の平均）
rate(http_requests_total[5m])

# レスポンスタイム（95パーセンタイル）
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# エラー率
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])
```

### ダッシュボード例：システム監視

```json
{
  "dashboard": {
    "title": "System Overview",
    "panels": [
      {
        "title": "CPU Usage",
        "targets": [
          {
            "expr": "100 - (avg by (instance) (irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)"
          }
        ],
        "type": "timeseries"
      },
      {
        "title": "Memory Usage",
        "targets": [
          {
            "expr": "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100"
          }
        ],
        "type": "gauge"
      },
      {
        "title": "Disk I/O",
        "targets": [
          {
            "expr": "rate(node_disk_read_bytes_total[5m])",
            "legendFormat": "Read"
          },
          {
            "expr": "rate(node_disk_written_bytes_total[5m])",
            "legendFormat": "Write"
          }
        ],
        "type": "timeseries"
      }
    ]
  }
}
```

## アプリケーションの監視

### Node.jsアプリケーションのメトリクス公開

```bash
npm install prom-client express
```

```javascript
// server.js
const express = require('express');
const client = require('prom-client');

const app = express();
const register = new client.Registry();

// デフォルトメトリクス（CPU、メモリ等）を収集
client.collectDefaultMetrics({ register });

// カスタムメトリクス
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestCounter);

// ミドルウェア
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const labels = {
      method: req.method,
      route: req.route?.path || req.path,
      status: res.statusCode,
    };

    httpRequestDuration.observe(labels, duration);
    httpRequestCounter.inc(labels);
  });

  next();
});

// メトリクスエンドポイント
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// アプリケーションのルート
app.get('/', (req, res) => {
  res.send('Hello World');
});

app.listen(8080, () => {
  console.log('Server running on port 8080');
});
```

### Prometheusに追加

```yaml
# prometheus/prometheus.yml
scrape_configs:
  - job_name: 'node-app'
    static_configs:
      - targets: ['host.docker.internal:8080']
```

### Grafanaで可視化

```promql
# リクエスト数（1分あたり）
sum(rate(http_requests_total[1m])) by (route)

# 平均レスポンスタイム
avg(rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m]))

# エラー率
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100
```

## アラート設定

### Grafana Alertの作成

```
1. ダッシュボードのパネルを編集
2. 「Alert」タブを選択
3. 「Create Alert」

条件設定:
- WHEN: avg()
- OF: query(A, 5m, now)
- IS ABOVE: 80

通知設定:
- Send to: Email / Slack / PagerDuty
- Message: CPU使用率が80%を超えています
```

### Prometheus Alertmanager

```yaml
# alertmanager/config.yml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@example.com'
  smtp_auth_username: 'your-email@gmail.com'
  smtp_auth_password: 'your-password'

route:
  group_by: ['alertname']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 12h
  receiver: 'email'

receivers:
  - name: 'email'
    email_configs:
      - to: 'admin@example.com'
        headers:
          Subject: 'Alert: {{ .GroupLabels.alertname }}'
```

### Prometheusアラートルール

```yaml
# prometheus/alerts.yml
groups:
  - name: system
    rules:
      - alert: HighCPUUsage
        expr: 100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is {{ $value }}%"

      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is {{ $value }}%"

      - alert: DiskSpaceLow
        expr: (1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100 > 85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Disk space low on {{ $labels.instance }}"
          description: "Disk usage is {{ $value }}%"
```

```yaml
# prometheus/prometheus.yml
rule_files:
  - 'alerts.yml'

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
```

## ログ分析（Loki連携）

### Loki + Promtail追加

```yaml
# docker-compose.yml
services:
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - ./loki/loki-config.yml:/etc/loki/local-config.yaml
    command: -config.file=/etc/loki/local-config.yaml

  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/log:/var/log
      - ./promtail/promtail-config.yml:/etc/promtail/config.yml
    command: -config.file=/etc/promtail/config.yml
```

### Grafanaにログデータソース追加

```
1. Configuration → Data Sources → Add data source
2. Loki を選択
3. URL: http://loki:3100
4. Save & Test
```

### ログクエリ例

```logql
# エラーログ検索
{job="my-app"} |= "error"

# 特定のステータスコードを含むログ
{job="nginx"} | json | status="500"

# ログの集計（1分間のエラー数）
sum(count_over_time({job="my-app"} |= "error" [1m]))
```

## ダッシュボード設計のベストプラクティス

### 1. レイアウト設計

```
┌─────────────────────────────────────────┐
│  タイトル: Production System Overview  │
├─────────────────────────────────────────┤
│  [CPU]  [Memory]  [Disk]  [Network]     │  ← Stat/Gauge
├─────────────────────────────────────────┤
│  Request Rate (Time Series)             │
├─────────────────────────────────────────┤
│  Response Time (Heatmap)                │
├─────────────────────────────────────────┤
│  [Error Log]        [Access Log]        │  ← Logs
└─────────────────────────────────────────┘
```

### 2. 変数の活用

```
Settings → Variables → Add variable

Name: instance
Type: Query
Query: label_values(node_cpu_seconds_total, instance)

パネルで使用:
node_cpu_seconds_total{instance="$instance"}
```

### 3. カラー設定

```
緑: 正常（< 70%）
黄: 注意（70-85%）
赤: 危険（> 85%）
```

## まとめ

Grafana + Prometheusによる監視システムは以下の点で優れています。

**メリット**:
- リアルタイム可視化
- 柔軟なクエリ言語（PromQL）
- 多様なデータソース対応
- 無料・オープンソース
- アラート機能充実

**構成要素**:
- Grafana: 可視化
- Prometheus: メトリクス収集・保存
- Alertmanager: アラート通知
- Loki: ログ集約

**ベストプラクティス**:
- メトリクスは15秒〜1分間隔で収集
- アラートは適切な閾値と待機時間を設定
- ダッシュボードは役割別に分ける
- 変数を活用して柔軟なダッシュボードを構築

本格的な監視システムを構築して、システムの健全性を保ちましょう。

**参考リンク**:
- [Grafana公式ドキュメント](https://grafana.com/docs/)
- [Prometheus公式ドキュメント](https://prometheus.io/docs/)
- [Grafana Dashboards](https://grafana.com/grafana/dashboards/)

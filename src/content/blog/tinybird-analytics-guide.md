---
title: "Tinybirdでリアルタイムアナリティクスパイプライン構築"
description: "Tinybirdを使ったリアルタイムデータ分析基盤の構築方法を解説。SQLでデータパイプラインを定義し、低レイテンシなAPIエンドポイントを自動生成する方法を実践的に学びます。"
pubDate: "2025-02-05"
---

## Tinybirdとは

Tinybirdは、リアルタイムデータアナリティクスを簡単に構築できるデータプラットフォームです。SQLでデータパイプラインを定義するだけで、高速なAPIエンドポイントを自動生成し、数ミリ秒のレスポンスタイムでデータを提供できます。

### Tinybirdの主な特徴

- **SQLベースのデータパイプライン**: 学習コストが低く、すぐに始められる
- **リアルタイム取り込み**: イベントストリーミングとバッチ両方に対応
- **高速クエリ**: ClickHouseベースで大量データも高速処理
- **自動API生成**: SQLクエリが即座にRESTful APIエンドポイントに
- **バージョン管理**: Git統合でCI/CD可能
- **スケーラブル**: 自動スケーリングで大規模データに対応

## なぜTinybirdを使うのか

従来のアナリティクス構築では、データウェアハウス、ETLツール、APIサーバー、キャッシュレイヤーなど、複数のコンポーネントが必要でした。Tinybirdはこれらを統合し、SQLだけでエンドツーエンドのアナリティクスパイプラインを構築できます。

```
従来の構成:
データソース → Kafka → Spark → データウェアハウス → APIサーバー → キャッシュ → クライアント

Tinybirdの構成:
データソース → Tinybird (SQLパイプライン) → クライアント
```

## セットアップ

### アカウント作成

```bash
# Tinybirdにサインアップ
# https://www.tinybird.co/signup

# CLIツールをインストール
curl https://cli.tinybird.co/install.sh | sh

# または npm経由で
npm install -g @tinybirdco/cli

# または pipenv経由で
pip install tinybird-cli

# 認証
tb auth

# ワークスペース作成
tb workspace create my-analytics
```

### プロジェクト初期化

```bash
# プロジェクトディレクトリを作成
mkdir my-analytics-project
cd my-analytics-project

# Tinybirdプロジェクトを初期化
tb init

# 生成されるファイル構造:
# .
# ├── .tinyb
# ├── datasources/
# ├── pipes/
# └── endpoints/
```

## データソースの定義

Tinybirdでは、まずデータソース（Data Source）を定義します。

### イベントトラッキング用データソース

```sql
-- datasources/events.datasource

SCHEMA >
    `timestamp` DateTime,
    `event_name` String,
    `user_id` String,
    `session_id` String,
    `properties` String,
    `page_url` String,
    `user_agent` String,
    `ip_address` String

ENGINE "MergeTree"
ENGINE_PARTITION_KEY "toYYYYMM(timestamp)"
ENGINE_SORTING_KEY "timestamp, user_id, event_name"
```

### アプリケーションログ用データソース

```sql
-- datasources/app_logs.datasource

SCHEMA >
    `timestamp` DateTime,
    `level` LowCardinality(String),
    `service` LowCardinality(String),
    `message` String,
    `error_code` Nullable(String),
    `user_id` Nullable(String),
    `request_id` String,
    `duration_ms` UInt32,
    `metadata` String

ENGINE "MergeTree"
ENGINE_PARTITION_KEY "toYYYYMM(timestamp)"
ENGINE_SORTING_KEY "timestamp, service, level"
ENGINE_TTL "timestamp + INTERVAL 30 DAY"
```

### CSVファイルからデータソース作成

```bash
# CSVファイルをアップロード
tb datasource append users_data ./data/users.csv

# または、データソース定義とともに
tb push datasources/users.datasource --csv ./data/users.csv
```

## パイプラインの構築

パイプ（Pipe）は、データソースを変換・集計するSQLクエリです。

### 基本的なパイプ

```sql
-- pipes/events_last_hour.pipe

SELECT
    event_name,
    count() as count,
    uniq(user_id) as unique_users
FROM events
WHERE timestamp >= now() - INTERVAL 1 HOUR
GROUP BY event_name
ORDER BY count DESC
```

### 複雑な集計パイプ

```sql
-- pipes/user_analytics.pipe

SELECT
    toStartOfHour(timestamp) as hour,
    event_name,
    count() as event_count,
    uniq(user_id) as unique_users,
    uniq(session_id) as unique_sessions,
    avg(JSONExtractFloat(properties, 'duration')) as avg_duration
FROM events
WHERE
    timestamp >= {{DateTime(start_date, '2024-01-01 00:00:00')}}
    AND timestamp < {{DateTime(end_date, '2024-01-31 23:59:59')}}
    {% if defined(event_filter) %}
        AND event_name = {{String(event_filter)}}
    {% end %}
GROUP BY hour, event_name
ORDER BY hour DESC, event_count DESC
```

### マテリアライズドビュー

頻繁に使うクエリはマテリアライズドビューとして事前計算できます。

```sql
-- pipes/hourly_metrics.pipe

MATERIALIZED VIEW hourly_metrics
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (hour, event_name)
AS SELECT
    toStartOfHour(timestamp) as hour,
    event_name,
    count() as count,
    uniq(user_id) as unique_users
FROM events
GROUP BY hour, event_name
```

## APIエンドポイントの作成

パイプをAPIエンドポイントとして公開します。

### 基本的なエンドポイント

```sql
-- endpoints/events_stats.endpoint

SELECT * FROM events_last_hour

DESCRIPTION >
    過去1時間のイベント統計を取得
```

```bash
# デプロイ
tb push endpoints/events_stats.endpoint

# 生成されるURL:
# https://api.tinybird.co/v0/pipes/events_stats.json?token=YOUR_TOKEN
```

### パラメータ付きエンドポイント

```sql
-- endpoints/user_analytics_api.endpoint

SELECT * FROM user_analytics

DESCRIPTION >
    ユーザーアナリティクスデータを期間指定で取得

PARAMS >
    start_date: DateTime = '2024-01-01 00:00:00',
    end_date: DateTime = '2024-01-31 23:59:59',
    event_filter: String = ''
```

```bash
# APIリクエスト例
curl "https://api.tinybird.co/v0/pipes/user_analytics_api.json?token=YOUR_TOKEN&start_date=2024-02-01&end_date=2024-02-05&event_filter=page_view"
```

## 実践例: Webアナリティクスダッシュボード

実際のWebアナリティクスシステムを構築してみましょう。

### 1. イベント収集スクリプト

```javascript
// frontend/analytics.js

class TinybirdAnalytics {
  constructor(dataSourceUrl, token) {
    this.url = dataSourceUrl;
    this.token = token;
    this.sessionId = this.generateSessionId();
  }

  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async track(eventName, properties = {}) {
    const event = {
      timestamp: new Date().toISOString(),
      event_name: eventName,
      user_id: this.getUserId(),
      session_id: this.sessionId,
      properties: JSON.stringify(properties),
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      ip_address: '', // サーバー側で付与
    };

    try {
      await fetch(this.url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }

  getUserId() {
    let userId = localStorage.getItem('analytics_user_id');
    if (!userId) {
      userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('analytics_user_id', userId);
    }
    return userId;
  }

  // ページビュートラッキング
  trackPageView() {
    this.track('page_view', {
      title: document.title,
      referrer: document.referrer,
    });
  }

  // クリックイベント
  trackClick(element, label) {
    this.track('click', {
      element: element,
      label: label,
    });
  }

  // カスタムイベント
  trackCustom(eventName, data) {
    this.track(eventName, data);
  }
}

// 初期化
const analytics = new TinybirdAnalytics(
  'https://api.tinybird.co/v0/events?name=events',
  'YOUR_INGESTION_TOKEN'
);

// 自動ページビュートラッキング
analytics.trackPageView();
```

### 2. パイプライン定義

```sql
-- pipes/page_views_by_page.pipe

SELECT
    page_url,
    count() as views,
    uniq(user_id) as unique_visitors,
    uniq(session_id) as unique_sessions,
    avg(if(properties != '', JSONExtractFloat(properties, 'load_time'), 0)) as avg_load_time
FROM events
WHERE
    event_name = 'page_view'
    AND timestamp >= now() - INTERVAL {{Int32(days, 7)}} DAY
GROUP BY page_url
ORDER BY views DESC
LIMIT {{Int32(limit, 100)}}
```

```sql
-- pipes/user_journey.pipe

SELECT
    user_id,
    session_id,
    arraySort(groupArray(tuple(timestamp, event_name, page_url))) as journey
FROM events
WHERE
    user_id = {{String(user_id)}}
    AND timestamp >= now() - INTERVAL 30 DAY
GROUP BY user_id, session_id
ORDER BY session_id DESC
```

```sql
-- pipes/realtime_dashboard.pipe

SELECT
    toStartOfMinute(timestamp) as minute,
    count() as events,
    uniq(user_id) as active_users,
    countIf(event_name = 'page_view') as page_views,
    countIf(event_name = 'click') as clicks,
    countIf(event_name = 'conversion') as conversions
FROM events
WHERE timestamp >= now() - INTERVAL 1 HOUR
GROUP BY minute
ORDER BY minute DESC
```

### 3. Next.jsダッシュボード

```typescript
// app/dashboard/page.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AnalyticsData {
  page_url: string;
  views: number;
  unique_visitors: number;
  unique_sessions: number;
  avg_load_time: number;
}

async function getAnalytics(days: number = 7): Promise<AnalyticsData[]> {
  const response = await fetch(
    `https://api.tinybird.co/v0/pipes/page_views_by_page.json?token=${process.env.TINYBIRD_TOKEN}&days=${days}`,
    { next: { revalidate: 60 } } // 1分キャッシュ
  );

  const data = await response.json();
  return data.data;
}

export default async function DashboardPage() {
  const analytics = await getAnalytics(7);

  const totalViews = analytics.reduce((sum, item) => sum + item.views, 0);
  const totalVisitors = analytics.reduce((sum, item) => sum + item.unique_visitors, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>総ページビュー</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalViews.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ユニークビジター</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalVisitors.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>平均読み込み時間</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {(analytics.reduce((sum, item) => sum + item.avg_load_time, 0) / analytics.length).toFixed(2)}ms
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>人気ページ</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left">ページ</th>
                <th className="text-right">ビュー</th>
                <th className="text-right">ユニーク訪問者</th>
              </tr>
            </thead>
            <tbody>
              {analytics.slice(0, 10).map((item) => (
                <tr key={item.page_url}>
                  <td>{item.page_url}</td>
                  <td className="text-right">{item.views}</td>
                  <td className="text-right">{item.unique_visitors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
```

## リアルタイムデータ取り込み

### Events API経由

```bash
# 単一イベント
curl -X POST "https://api.tinybird.co/v0/events?name=events" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "timestamp": "2024-02-05 10:30:00",
    "event_name": "purchase",
    "user_id": "user123",
    "session_id": "session456",
    "properties": "{\"amount\": 99.99, \"product_id\": \"prod789\"}",
    "page_url": "https://example.com/checkout",
    "user_agent": "Mozilla/5.0...",
    "ip_address": "192.168.1.1"
  }'

# バッチイベント（NDJSON形式）
curl -X POST "https://api.tinybird.co/v0/events?name=events" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"timestamp": "2024-02-05 10:30:00", "event_name": "page_view", "user_id": "user1"}
{"timestamp": "2024-02-05 10:31:00", "event_name": "click", "user_id": "user2"}
{"timestamp": "2024-02-05 10:32:00", "event_name": "conversion", "user_id": "user3"}'
```

### Kafkaからのストリーミング取り込み

```sql
-- datasources/kafka_events.datasource

CONNECTOR "kafka"
CONNECTOR_TOPIC "analytics-events"
CONNECTOR_BOOTSTRAP_SERVERS "kafka.example.com:9092"

SCHEMA >
    `timestamp` DateTime,
    `event_name` String,
    `user_id` String,
    `properties` String

ENGINE "MergeTree"
ENGINE_SORTING_KEY "timestamp, user_id"
```

## パフォーマンス最適化

### 1. 適切なソーティングキー

```sql
-- 悪い例: よく使うフィルタがソーティングキーに含まれていない
ENGINE_SORTING_KEY "timestamp"

-- 良い例: フィルタ条件を含める
ENGINE_SORTING_KEY "timestamp, user_id, event_name"
```

### 2. パーティショニング

```sql
-- 月次パーティション（長期保存用）
ENGINE_PARTITION_KEY "toYYYYMM(timestamp)"

-- 日次パーティション（リアルタイム分析用）
ENGINE_PARTITION_KEY "toYYYYMMDD(timestamp)"
```

### 3. TTL設定

```sql
-- 30日後に自動削除
ENGINE_TTL "timestamp + INTERVAL 30 DAY"

-- 段階的削除（7日後に詳細データ削除、30日後に完全削除）
ENGINE_TTL "
    properties + INTERVAL 7 DAY,
    timestamp + INTERVAL 30 DAY
"
```

## CI/CDパイプライン

```yaml
# .github/workflows/tinybird.yml

name: Deploy Tinybird

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Tinybird CLI
        run: curl https://cli.tinybird.co/install.sh | sh

      - name: Deploy to Tinybird
        env:
          TB_TOKEN: ${{ secrets.TINYBIRD_ADMIN_TOKEN }}
        run: |
          tb auth --token $TB_TOKEN
          tb push --force

      - name: Run tests
        run: tb test
```

## まとめ

Tinybirdは、SQLだけでリアルタイムアナリティクスパイプラインを構築できる強力なプラットフォームです。以下のようなユースケースに最適です:

- **Webアナリティクス**: ページビュー、ユーザー行動分析
- **プロダクトアナリティクス**: 機能利用状況、ユーザーエンゲージメント
- **アプリケーションモニタリング**: ログ集計、エラートラッキング
- **IoTデータ処理**: センサーデータのリアルタイム分析
- **広告レポーティング**: インプレッション、クリック、コンバージョン追跡

従来のデータウェアハウスと比較して、セットアップが簡単で、リアルタイム性が高く、コストも抑えられます。SQLの知識があれば今すぐ始められるので、ぜひTinybirdを試してみてください!

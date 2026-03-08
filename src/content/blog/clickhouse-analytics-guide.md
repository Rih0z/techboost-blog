---
title: 'ClickHouse分析データベース入門ガイド - 高速集計とリアルタイム分析'
description: 'ClickHouseでビッグデータを高速分析。カラムナストレージ、分散処理、リアルタイム集計の実装方法を実例付きで解説します。PostgreSQLの100倍高速な分析クエリを実現。ClickHouse・Database・Analyticsに関する実践情報。'
pubDate: '2025-02-06'
tags: ['ClickHouse', 'Database', 'Analytics', 'BigData', 'OLAP', 'インフラ']
heroImage: '../../assets/thumbnails/clickhouse-analytics-guide.jpg'
---
ClickHouseは、Yandex社が開発したオープンソースのカラムナデータベースです。億単位のレコードでも秒単位で集計でき、リアルタイム分析に最適です。本記事では、ClickHouseの導入から実践的な使い方まで解説します。

## ClickHouseとは

ClickHouseは**OLAP**（Online Analytical Processing）に特化したカラムナストレージデータベースです。

### 主な特徴

- **超高速集計**: PostgreSQLの100〜1000倍高速
- **カラムナストレージ**: データを列単位で保存し圧縮率が高い
- **水平スケーリング**: 分散処理で数千台まで拡張可能
- **リアルタイム挿入**: 秒間数百万行の挿入が可能
- **SQL対応**: 標準SQLに近い構文

### PostgreSQL vs ClickHouse

```sql
-- 同じクエリでのパフォーマンス比較
-- データ: 1億件のアクセスログ

-- PostgreSQL: 約45秒
SELECT date, COUNT(*) as views
FROM page_views
WHERE date >= '2025-01-01'
GROUP BY date
ORDER BY date;

-- ClickHouse: 約0.3秒
-- 150倍高速！
```

### ユースケース

- Webアクセス解析
- ログ分析
- メトリクス集計
- リアルタイムダッシュボード
- 時系列データ分析
- ビジネスインテリジェンス

## インストール

### Docker（推奨）

```bash
# ClickHouseサーバー起動
docker run -d \
  --name clickhouse-server \
  --ulimit nofile=262144:262144 \
  -p 8123:8123 \
  -p 9000:9000 \
  clickhouse/clickhouse-server

# クライアント接続
docker exec -it clickhouse-server clickhouse-client
```

### macOS

```bash
brew install clickhouse
clickhouse-server
```

### Linux

```bash
curl https://clickhouse.com/ | sh
sudo ./clickhouse install
sudo clickhouse start
```

### 接続確認

```bash
# HTTPインターフェース
curl http://localhost:8123

# クライアント接続
clickhouse-client --host localhost --port 9000
```

## 基本的な使い方

### データベース作成

```sql
-- データベース作成
CREATE DATABASE analytics;

-- 使用するデータベースを選択
USE analytics;
```

### テーブル作成

```sql
-- ページビューテーブル
CREATE TABLE page_views
(
    event_time DateTime,
    user_id UInt32,
    page_url String,
    country String,
    device String,
    duration UInt32
)
ENGINE = MergeTree()
ORDER BY (event_time, user_id);
```

**ポイント**:
- `ENGINE = MergeTree()`: 最も一般的なテーブルエンジン
- `ORDER BY`: ソート順を指定（クエリ高速化の鍵）
- データ型は厳密に指定（パフォーマンスに影響）

### データ挿入

```sql
-- 1件挿入
INSERT INTO page_views VALUES
    (now(), 1001, '/home', 'Japan', 'Mobile', 45);

-- 複数行挿入
INSERT INTO page_views VALUES
    (now(), 1002, '/products', 'USA', 'Desktop', 120),
    (now(), 1003, '/about', 'Japan', 'Tablet', 30),
    (now(), 1001, '/contact', 'Japan', 'Mobile', 60);
```

### データ取得

```sql
-- 基本的なSELECT
SELECT * FROM page_views LIMIT 10;

-- 集計
SELECT
    country,
    COUNT(*) as views,
    AVG(duration) as avg_duration
FROM page_views
GROUP BY country
ORDER BY views DESC;
```

## データ型

### 数値型

```sql
-- 整数
Int8, Int16, Int32, Int64      -- 符号付き
UInt8, UInt16, UInt32, UInt64  -- 符号なし

-- 浮動小数点
Float32, Float64

-- 例
CREATE TABLE metrics (
    id UInt64,
    value Float64,
    count UInt32
) ENGINE = MergeTree() ORDER BY id;
```

### 文字列型

```sql
-- 固定長文字列（高速）
FixedString(N)

-- 可変長文字列
String

-- 例
CREATE TABLE users (
    user_id UInt64,
    username String,
    country_code FixedString(2)
) ENGINE = MergeTree() ORDER BY user_id;
```

### 日付・時刻型

```sql
-- 日付（YYYY-MM-DD）
Date

-- 日時（秒精度）
DateTime

-- 日時（マイクロ秒精度）
DateTime64(3)  -- ミリ秒
DateTime64(6)  -- マイクロ秒

-- 例
CREATE TABLE events (
    event_time DateTime,
    event_date Date,
    precise_time DateTime64(6)
) ENGINE = MergeTree() ORDER BY event_time;
```

### 配列型

```sql
-- 配列
Array(T)

-- 例
CREATE TABLE user_actions (
    user_id UInt64,
    tags Array(String),
    scores Array(Float64)
) ENGINE = MergeTree() ORDER BY user_id;

INSERT INTO user_actions VALUES
    (1, ['tech', 'news'], [0.8, 0.6]);

-- 配列操作
SELECT
    user_id,
    arrayJoin(tags) as tag  -- 配列を展開
FROM user_actions;
```

## 実践：アクセスログ分析

### テーブル設計

```sql
CREATE TABLE access_log
(
    timestamp DateTime,
    date Date DEFAULT toDate(timestamp),
    user_id UInt32,
    session_id String,
    url String,
    referer String,
    user_agent String,
    ip String,
    country String,
    city String,
    device_type LowCardinality(String),
    browser LowCardinality(String),
    http_status UInt16,
    response_time UInt32,
    bytes_sent UInt64
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, timestamp, user_id)
SETTINGS index_granularity = 8192;
```

**ポイント**:
- `PARTITION BY toYYYYMM(date)`: 月ごとにデータを分割
- `LowCardinality`: カーディナリティが低いカラムの圧縮最適化
- `ORDER BY`: クエリで頻繁に使う列を指定

### サンプルデータ挿入

```sql
-- ダミーデータ生成
INSERT INTO access_log
SELECT
    now() - INTERVAL (rand() % 86400) SECOND as timestamp,
    toDate(timestamp) as date,
    rand() % 10000 as user_id,
    toString(rand()) as session_id,
    concat('/page', toString(rand() % 100)) as url,
    concat('https://example.com/ref', toString(rand() % 10)) as referer,
    'Mozilla/5.0' as user_agent,
    concat(toString(rand() % 255), '.', toString(rand() % 255), '.0.1') as ip,
    ['Japan', 'USA', 'UK', 'Germany'][rand() % 4 + 1] as country,
    ['Tokyo', 'New York', 'London', 'Berlin'][rand() % 4 + 1] as city,
    ['Mobile', 'Desktop', 'Tablet'][rand() % 3 + 1] as device_type,
    ['Chrome', 'Safari', 'Firefox'][rand() % 3 + 1] as browser,
    [200, 404, 500][rand() % 3 + 1] as http_status,
    rand() % 5000 as response_time,
    rand() % 1000000 as bytes_sent
FROM numbers(1000000);  -- 100万件のダミーデータ
```

### 基本的な集計クエリ

```sql
-- 1. 日別アクセス数
SELECT
    date,
    COUNT(*) as views,
    COUNT(DISTINCT user_id) as unique_users
FROM access_log
GROUP BY date
ORDER BY date DESC;

-- 2. デバイス別集計
SELECT
    device_type,
    COUNT(*) as views,
    AVG(response_time) as avg_response_time,
    SUM(bytes_sent) / 1024 / 1024 as total_mb
FROM access_log
GROUP BY device_type
ORDER BY views DESC;

-- 3. 時間帯別アクセス
SELECT
    toHour(timestamp) as hour,
    COUNT(*) as views
FROM access_log
GROUP BY hour
ORDER BY hour;
```

### 高度な分析クエリ

```sql
-- 4. 国・デバイス別の詳細分析
SELECT
    country,
    device_type,
    COUNT(*) as views,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(response_time) as avg_response,
    quantile(0.5)(response_time) as median_response,
    quantile(0.95)(response_time) as p95_response
FROM access_log
WHERE date >= today() - INTERVAL 7 DAY
GROUP BY country, device_type
ORDER BY views DESC
LIMIT 20;

-- 5. ファネル分析（ページ遷移）
SELECT
    arrayJoin(['/', '/products', '/cart', '/checkout']) as page,
    countIf(url LIKE page || '%') as views
FROM access_log
WHERE date = today();

-- 6. リテンションコホート分析
SELECT
    toStartOfWeek(first_visit) as cohort_week,
    COUNT(DISTINCT user_id) as users,
    countIf(last_visit >= first_visit + INTERVAL 7 DAY) as retained_week1,
    countIf(last_visit >= first_visit + INTERVAL 14 DAY) as retained_week2
FROM (
    SELECT
        user_id,
        MIN(date) as first_visit,
        MAX(date) as last_visit
    FROM access_log
    GROUP BY user_id
)
GROUP BY cohort_week
ORDER BY cohort_week DESC;
```

## 時系列データ分析

### ウィンドウ関数

```sql
-- 移動平均（7日間）
SELECT
    date,
    COUNT(*) as daily_views,
    AVG(COUNT(*)) OVER (
        ORDER BY date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as moving_avg_7days
FROM access_log
GROUP BY date
ORDER BY date;

-- 前日比
SELECT
    date,
    COUNT(*) as views,
    lagInFrame(COUNT(*)) OVER (ORDER BY date) as prev_day_views,
    (COUNT(*) - lagInFrame(COUNT(*))) / lagInFrame(COUNT(*)) * 100 as growth_rate
FROM access_log
GROUP BY date
ORDER BY date;
```

### マテリアライズドビュー（集計の高速化）

```sql
-- 日次集計のマテリアライズドビュー
CREATE MATERIALIZED VIEW daily_stats
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, country, device_type)
AS SELECT
    date,
    country,
    device_type,
    COUNT(*) as views,
    COUNT(DISTINCT user_id) as unique_users,
    SUM(response_time) as total_response_time,
    SUM(bytes_sent) as total_bytes
FROM access_log
GROUP BY date, country, device_type;

-- マテリアライズドビューからクエリ（超高速）
SELECT
    date,
    SUM(views) as total_views,
    SUM(unique_users) as total_users
FROM daily_stats
GROUP BY date
ORDER BY date DESC;
```

## パフォーマンス最適化

### インデックス活用

```sql
-- スキップインデックス（特定値の検索高速化）
ALTER TABLE access_log
ADD INDEX idx_url url TYPE bloom_filter GRANULARITY 1;

-- クエリで活用
SELECT * FROM access_log WHERE url = '/products/123';
```

### パーティション管理

```sql
-- 古いパーティションを削除
ALTER TABLE access_log DROP PARTITION '202401';

-- パーティションの確認
SELECT
    partition,
    rows,
    bytes_on_disk
FROM system.parts
WHERE table = 'access_log'
ORDER BY partition DESC;
```

### クエリ最適化

```sql
-- Bad: SELECT *は遅い
SELECT * FROM access_log;

-- Good: 必要なカラムのみ取得
SELECT date, country, COUNT(*) FROM access_log GROUP BY date, country;

-- Bad: WHERE句で関数を使う
SELECT * FROM access_log WHERE toDate(timestamp) = '2025-02-06';

-- Good: パーティションキーをそのまま使う
SELECT * FROM access_log WHERE date = '2025-02-06';
```

## 外部データソース連携

### MySQLからデータ取得

```sql
-- MySQL Engineテーブル
CREATE TABLE mysql_users
ENGINE = MySQL('mysql_host:3306', 'database', 'users', 'user', 'password');

-- MySQLデータをClickHouseにコピー
INSERT INTO clickhouse_users
SELECT * FROM mysql_users;
```

### PostgreSQLからデータ取得

```sql
-- PostgreSQL Engine
CREATE TABLE pg_orders
ENGINE = PostgreSQL('pg_host:5432', 'database', 'orders', 'user', 'password');

-- データ取得
SELECT * FROM pg_orders WHERE date >= today() - 7;
```

### CSVファイルのインポート

```bash
# コマンドラインからCSVインポート
clickhouse-client --query="INSERT INTO access_log FORMAT CSV" < data.csv

# HTTPインターフェース経由
curl -F 'data=@data.csv' 'http://localhost:8123/?query=INSERT INTO access_log FORMAT CSV'
```

## Node.jsからClickHouseを使う

```bash
npm install @clickhouse/client
```

```javascript
const { createClient } = require('@clickhouse/client');

const client = createClient({
  host: 'http://localhost:8123',
  database: 'analytics',
});

// データ挿入
async function insertData() {
  await client.insert({
    table: 'access_log',
    values: [
      {
        timestamp: new Date(),
        user_id: 1001,
        url: '/home',
        country: 'Japan',
        device_type: 'Mobile',
        response_time: 120,
      },
    ],
    format: 'JSONEachRow',
  });
}

// クエリ実行
async function queryData() {
  const result = await client.query({
    query: `
      SELECT country, COUNT(*) as views
      FROM access_log
      WHERE date >= today() - 7
      GROUP BY country
      ORDER BY views DESC
    `,
    format: 'JSONEachRow',
  });

  const data = await result.json();
  console.log(data);
}

// 実行
(async () => {
  await insertData();
  await queryData();
  await client.close();
})();
```

## 運用のベストプラクティス

### 1. データ型の選択

```sql
-- Good: 適切なデータ型
user_id UInt32        -- 最大42億
country LowCardinality(String)  -- 少数の値

-- Bad: 過剰なデータ型
user_id UInt64        -- 不要に大きい
country String        -- 圧縮効率が悪い
```

### 2. パーティション設計

```sql
-- Good: 月単位のパーティション
PARTITION BY toYYYYMM(date)

-- Bad: 日単位（パーティションが多すぎる）
PARTITION BY date

-- Bad: パーティションなし（削除が遅い）
```

### 3. ORDER BY の最適化

```sql
-- Good: よく使うフィルタを先頭に
ORDER BY (date, country, user_id)

-- Bad: カーディナリティの高い列を先頭に
ORDER BY (user_id, date, country)
```

## まとめ

ClickHouseは以下の点で優れています。

**メリット**:
- 超高速な集計クエリ（PostgreSQLの100倍以上）
- 優れた圧縮率（ディスク容量を大幅削減）
- 水平スケーリング対応
- リアルタイム挿入可能
- SQL互換性が高い

**適したユースケース**:
- ログ分析
- メトリクス集計
- リアルタイムダッシュボード
- ビッグデータ分析

**注意点**:
- トランザクション非対応
- UPDATE/DELETEが遅い
- OLTP用途には不向き

アクセスログ分析やメトリクス集計には、ClickHouseが最適です。ぜひ試してみてください。

**参考リンク**:
- [ClickHouse公式ドキュメント](https://clickhouse.com/docs/)
- [ClickHouse GitHub](https://github.com/ClickHouse/ClickHouse)
- [ClickHouse Playground](https://play.clickhouse.com/)

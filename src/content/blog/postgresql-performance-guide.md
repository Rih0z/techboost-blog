---
title: 'PostgreSQL パフォーマンス最適化完全ガイド — インデックス・クエリチューニング・設定'
description: 'PostgreSQLのパフォーマンスを最大化する実践ガイド。インデックス設計・EXPLAIN ANALYZE・N+1問題・コネクションプール・パーティショニング・設定チューニングをSQL例付きで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-4.jpg'
---

PostgreSQL は世界で最も広く使われるオープンソースRDBMSの一つだ。機能の豊富さと拡張性においてMySQLを凌駕する場面も多く、特にJSONB・フルテキスト検索・パーティショニング・ウィンドウ関数などの高度な機能は他のデータベースにはない強みを持つ。

しかし、デフォルト設定のままPostgreSQLを本番環境に投入すると、スケールした瞬間にパフォーマンス問題に直面する。クエリが遅い、コネクションが枯渇する、バキュームが追いつかない——こうした問題を根本から解決するのが本ガイドの目的だ。

この記事では、EXPLAIN ANALYZEの読み方から始まり、インデックス設計・N+1問題の解決・コネクションプール・パーティショニング・postgresql.confのチューニング・ロック競合の解消・JSONB活用・全文検索・モニタリングまで、PostgreSQLパフォーマンス最適化の全領域を実践的なSQL例とともに解説する。

---

## 1. EXPLAIN ANALYZE の読み方

パフォーマンス改善の第一歩は「なぜ遅いのか」を正確に把握することだ。PostgreSQLには `EXPLAIN` と `EXPLAIN ANALYZE` という強力な診断ツールが内蔵されている。

### EXPLAIN vs EXPLAIN ANALYZE

```sql
-- EXPLAIN: 実行計画のみ（実際には実行しない）
EXPLAIN SELECT * FROM orders WHERE user_id = 42;

-- EXPLAIN ANALYZE: 実際に実行して計測（本番での使用は慎重に）
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 42;

-- より詳細な情報を取得する場合
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) 
  SELECT * FROM orders WHERE user_id = 42;
```

### 出力の読み方

```
Seq Scan on orders  (cost=0.00..1842.00 rows=1 width=72)
                     (actual time=0.043..18.420 rows=1 loops=1)
  Filter: (user_id = 42)
  Rows Removed by Filter: 99999
Planning Time: 0.152 ms
Execution Time: 18.453 ms
```

各フィールドの意味：

| フィールド | 説明 |
|---|---|
| `cost=0.00..1842.00` | 推定コスト（起動コスト..総コスト）。ディスクページアクセスを1.0として計算 |
| `rows=1` | 返ると推定される行数 |
| `width=72` | 1行あたりの推定バイト数 |
| `actual time=0.043..18.420` | 実測時間（ms）。最初の行..全行取得 |
| `loops=1` | このノードが何回実行されたか |

`Seq Scan` は全件スキャン（テーブル全体を読む）を意味する。`Rows Removed by Filter: 99999` は10万行読んで1行だけ返したことを示しており、これはインデックスが使われていないサインだ。

### 主要なノードタイプ

```sql
-- Index Scan: インデックスを使ってデータを取得
-- Index Only Scan: インデックスだけでデータが完結（最高効率）
-- Bitmap Heap Scan: 複数インデックスを組み合わせる場合
-- Hash Join / Merge Join / Nested Loop: テーブル結合の方式
-- Sort: ORDER BY での並び替え
-- Aggregate: GROUP BY / 集約関数

-- 実際に確認してみる
EXPLAIN ANALYZE
SELECT u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2025-01-01'
GROUP BY u.id, u.name
ORDER BY order_count DESC
LIMIT 10;
```

### コストが高い箇所の特定

```sql
-- バッファ情報付きで詳細分析
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM large_table WHERE created_at BETWEEN '2025-01-01' AND '2025-12-31';

-- shared hit: 共有バッファキャッシュからの読み込み（高速）
-- read: ディスクからの読み込み（低速）
-- Buffers: shared hit=1234 read=5678 なら、5678回ディスクアクセスが発生
```

EXPLAIN ANALYZEで `actual rows` が `rows`（推定値）と大きく乖離している場合は、統計情報が古い可能性がある。`ANALYZE テーブル名;` を実行して統計を更新しよう。

---

## 2. インデックス設計の実践

インデックスはクエリを高速化する最も効果的な手段だが、すべてのカラムにインデックスを貼れば良いわけではない。インデックスは `INSERT` / `UPDATE` / `DELETE` のオーバーヘッドを増加させ、ストレージも消費する。適切な設計が重要だ。

### B-tree インデックス（デフォルト）

```sql
-- 等値検索・範囲検索・ORDER BY に対応
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- 等値検索
SELECT * FROM orders WHERE user_id = 42;

-- 範囲検索（インデックスが効く）
SELECT * FROM orders WHERE created_at > '2025-01-01';

-- 降順インデックス（ORDER BY ... DESC 最適化）
CREATE INDEX idx_orders_created_at_desc ON orders(created_at DESC);
```

### 複合インデックス（Composite Index）

```sql
-- カーディナリティの高いカラムを先頭に置く
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- このクエリに効く（先頭カラムから順番に使われる）
SELECT * FROM orders WHERE user_id = 42 AND status = 'pending';

-- このクエリにも効く（先頭カラムだけでも使える）
SELECT * FROM orders WHERE user_id = 42;

-- このクエリにはインデックスが使われない（先頭カラムをスキップ不可）
SELECT * FROM orders WHERE status = 'pending';

-- インデックスが機能するかテスト
EXPLAIN SELECT * FROM orders WHERE user_id = 42 AND status = 'pending';
```

### 部分インデックス（Partial Index）

特定の条件を満たすレコードだけにインデックスを作成する。インデックスサイズを劇的に削減できる。

```sql
-- アクティブなユーザーだけを対象にする部分インデックス
CREATE INDEX idx_users_active_email 
  ON users(email) 
  WHERE is_active = true;

-- 未処理の注文だけを対象にする部分インデックス（全体の5%程度と想定）
CREATE INDEX idx_orders_pending 
  ON orders(created_at) 
  WHERE status = 'pending';

-- このクエリはインデックスが使われる
SELECT * FROM orders 
WHERE status = 'pending' 
  AND created_at < NOW() - INTERVAL '24 hours';

-- NULLでないレコードのみ対象にする
CREATE INDEX idx_orders_assigned 
  ON orders(assigned_to) 
  WHERE assigned_to IS NOT NULL;
```

### GIN インデックス（配列・JSONB・全文検索）

```sql
-- 配列カラムへのGINインデックス
CREATE INDEX idx_products_tags ON products USING GIN(tags);

-- 配列内の要素を検索（GINインデックスが効く）
SELECT * FROM products WHERE tags @> ARRAY['sale', 'electronics'];

-- JSONBカラムへのGINインデックス
CREATE INDEX idx_users_metadata ON users USING GIN(metadata);

-- JSONB内の特定キーを検索
SELECT * FROM users WHERE metadata @> '{"plan": "pro"}';

-- 全文検索用GINインデックス
CREATE INDEX idx_articles_search 
  ON articles USING GIN(to_tsvector('japanese', title || ' ' || body));
```

### GiST インデックス（地理情報・範囲型）

```sql
-- PostGIS の地理情報インデックス
CREATE INDEX idx_stores_location ON stores USING GiST(location);

-- 範囲型インデックス（予約テーブルで重複チェックに使用）
CREATE INDEX idx_reservations_period 
  ON reservations USING GiST(daterange(start_date, end_date));

-- 重複する予約を検索
SELECT * FROM reservations 
WHERE daterange(start_date, end_date) && daterange('2025-06-01', '2025-06-30');
```

### インデックスの健全性確認

```sql
-- 未使用インデックスの確認（本番で定期的にチェック）
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- インデックスの膨張確認
SELECT 
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  pg_size_pretty(pg_relation_size(tablename::regclass)) AS table_size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;
```

---

## 3. N+1問題の検出と解決

N+1問題は、ORMを使うアプリケーションで最も頻繁に発生するパフォーマンス問題の一つだ。「1回のクエリでリストを取得し、各要素についてN回の追加クエリを発行する」というパターンを指す。

### N+1問題の典型例

```sql
-- 悪い例（アプリケーション側のロジックをSQLで再現）
-- Step 1: 全ユーザーを取得（1クエリ）
SELECT id, name FROM users LIMIT 100;

-- Step 2: 各ユーザーの注文数を取得（100クエリ）
SELECT COUNT(*) FROM orders WHERE user_id = 1;
SELECT COUNT(*) FROM orders WHERE user_id = 2;
-- ... 98回繰り返し
```

### JOIN で解決する

```sql
-- 良い例: JOIN で1クエリにまとめる
SELECT 
  u.id,
  u.name,
  COUNT(o.id) AS order_count,
  SUM(o.total_amount) AS total_spent,
  MAX(o.created_at) AS last_order_at
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name
ORDER BY total_spent DESC NULLS LAST
LIMIT 100;
```

### サブクエリで解決する

```sql
-- 相関サブクエリ（各行に対してサブクエリを実行するため遅い場合がある）
SELECT 
  u.id,
  u.name,
  (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS order_count
FROM users u;

-- スカラーサブクエリをLATERALに変換（PostgreSQL固有の強力な構文）
SELECT 
  u.id,
  u.name,
  recent.last_order_at,
  recent.total_amount
FROM users u
LEFT JOIN LATERAL (
  SELECT created_at AS last_order_at, total_amount
  FROM orders
  WHERE user_id = u.id
  ORDER BY created_at DESC
  LIMIT 1
) recent ON true;
```

### CTE（Common Table Expression）で可読性と性能を両立

```sql
-- WITH句を使ったCTE
WITH 
  active_users AS (
    SELECT id, name, email
    FROM users
    WHERE last_login_at > NOW() - INTERVAL '30 days'
      AND is_active = true
  ),
  user_stats AS (
    SELECT 
      user_id,
      COUNT(*) AS order_count,
      SUM(total_amount) AS total_spent,
      AVG(total_amount) AS avg_order_value
    FROM orders
    WHERE created_at > NOW() - INTERVAL '90 days'
    GROUP BY user_id
  )
SELECT 
  au.id,
  au.name,
  au.email,
  COALESCE(us.order_count, 0) AS order_count,
  COALESCE(us.total_spent, 0) AS total_spent,
  COALESCE(us.avg_order_value, 0) AS avg_order_value
FROM active_users au
LEFT JOIN user_stats us ON au.id = us.user_id
ORDER BY us.total_spent DESC NULLS LAST;

-- 再帰CTE（組織階層の取得など）
WITH RECURSIVE org_tree AS (
  -- 基底ケース
  SELECT id, name, parent_id, 0 AS depth
  FROM employees
  WHERE parent_id IS NULL
  
  UNION ALL
  
  -- 再帰ステップ
  SELECT e.id, e.name, e.parent_id, ot.depth + 1
  FROM employees e
  JOIN org_tree ot ON e.parent_id = ot.id
  WHERE ot.depth < 10  -- 無限ループ防止
)
SELECT * FROM org_tree ORDER BY depth, name;
```

### pg_stat_statements で N+1 を検出

```sql
-- pg_stat_statements 拡張を有効化（postgresql.conf に設定が必要）
-- shared_preload_libraries = 'pg_stat_statements'

-- 実行回数の多いクエリを確認
SELECT 
  calls,
  round(total_exec_time::numeric, 2) AS total_ms,
  round(mean_exec_time::numeric, 2) AS mean_ms,
  round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) AS percentage,
  query
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 20;
```

---

## 4. クエリ最適化テクニック

### LIMIT / OFFSET の罠とカーソルベースのページネーション

```sql
-- 悪い例: OFFSET が大きくなると全件スキャンが必要になる
SELECT * FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 100000;
-- OFFSET 100000 は先頭から100000件読んで捨てる = 非常に遅い

-- 良い例: カーソルベースのページネーション
-- 最初のページ
SELECT id, title, created_at 
FROM posts 
ORDER BY created_at DESC, id DESC 
LIMIT 20;

-- 次のページ（前のページの最後の行の値を使う）
SELECT id, title, created_at 
FROM posts 
WHERE (created_at, id) < ('2025-06-15 10:30:00', 12345)
ORDER BY created_at DESC, id DESC 
LIMIT 20;
-- このクエリはインデックスが使えるため、どのページでも高速
```

### ウィンドウ関数で集計を効率化

```sql
-- ROW_NUMBER: ページネーション・ランキングに使用
SELECT 
  id,
  user_id,
  total_amount,
  ROW_NUMBER() OVER (
    PARTITION BY user_id 
    ORDER BY created_at DESC
  ) AS rn
FROM orders;

-- 各ユーザーの最新注文を取得（サブクエリより効率的）
SELECT * FROM (
  SELECT 
    id, user_id, total_amount, created_at,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
  FROM orders
) ranked
WHERE rn = 1;

-- LAG / LEAD: 前後の行を参照
SELECT 
  date,
  revenue,
  LAG(revenue) OVER (ORDER BY date) AS prev_revenue,
  revenue - LAG(revenue) OVER (ORDER BY date) AS daily_change,
  round(
    100.0 * (revenue - LAG(revenue) OVER (ORDER BY date)) 
    / LAG(revenue) OVER (ORDER BY date), 
    2
  ) AS growth_rate
FROM daily_revenue
ORDER BY date;

-- SUM OVER (累積合計)
SELECT 
  date,
  revenue,
  SUM(revenue) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING) AS cumulative_revenue,
  AVG(revenue) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS weekly_avg
FROM daily_revenue;
```

### 条件付き集計でピボットテーブル

```sql
-- FILTER 句を使った条件付き集計（CASE WHEN より高速）
SELECT 
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed_orders,
  COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_orders,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending_orders,
  SUM(total_amount) FILTER (WHERE status = 'completed') AS completed_revenue,
  AVG(total_amount) FILTER (WHERE status = 'completed') AS avg_completed_amount
FROM orders
WHERE created_at >= '2025-01-01'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;
```

### DISTINCT ON（PostgreSQL固有）

```sql
-- 各カテゴリで最も売れた商品を取得
SELECT DISTINCT ON (category_id)
  category_id,
  id AS product_id,
  name,
  total_sold
FROM products
ORDER BY category_id, total_sold DESC;
-- DISTINCT ON のカラムは ORDER BY の先頭になければならない
```

### MATERIALIZED VIEW でコストの高いクエリをキャッシュ

```sql
-- マテリアライズドビューの作成
CREATE MATERIALIZED VIEW mv_monthly_sales AS
SELECT 
  DATE_TRUNC('month', o.created_at) AS month,
  p.category_id,
  c.name AS category_name,
  COUNT(oi.id) AS items_sold,
  SUM(oi.quantity * oi.unit_price) AS revenue
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
JOIN categories c ON p.category_id = c.id
WHERE o.status = 'completed'
GROUP BY 
  DATE_TRUNC('month', o.created_at),
  p.category_id,
  c.name;

-- インデックスも作成可能
CREATE INDEX ON mv_monthly_sales(month);
CREATE INDEX ON mv_monthly_sales(category_id);

-- 定期的に更新（CONCURRENTLY でロックなし）
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_sales;
```

---

## 5. コネクションプール（PgBouncer / pgxpool）

PostgreSQLはコネクションごとにプロセスをフォークするため、コネクション数が増えるとメモリ消費と切り替えコストが激増する。本番では必ずコネクションプールを使う。

### なぜコネクションプールが必要か

```sql
-- 現在のコネクション状況を確認
SELECT 
  state,
  COUNT(*) AS connection_count,
  MAX(now() - state_change) AS max_idle_time
FROM pg_stat_activity
GROUP BY state;

-- アイドル状態のコネクションが多い = コネクションプール未使用のサイン
-- state: active（実行中）/ idle（待機中）/ idle in transaction（危険）
```

### PgBouncer の設定

PgBouncer は最も広く使われるPostgreSQL用コネクションプールだ。

```ini
# pgbouncer.ini
[databases]
mydb = host=localhost port=5432 dbname=mydb

[pgbouncer]
# Transaction mode: トランザクション単位でコネクションを貸し出す（最も効率的）
# Session mode: セッション全体でコネクションを占有（SET/LISTEN非互換性なし）
pool_mode = transaction

# 最大クライアントコネクション数
max_client_conn = 1000

# データベースあたりのサーバーコネクション数
# PostgreSQLのmax_connectionsの80-90%以下に設定
default_pool_size = 20

# アイドルサーバーコネクションの最大数
min_pool_size = 5

# コネクション取得のタイムアウト（秒）
connect_timeout = 10

# アイドルコネクションの寿命（秒）
server_idle_timeout = 600

# サーバーコネクションの最大寿命（秒）
server_lifetime = 3600

# ログレベル
log_connections = 1
log_disconnections = 1
```

### Go での pgxpool 設定

```go
// Go アプリケーションでの pgxpool 設定例
package database

import (
    "context"
    "time"
    
    "github.com/jackc/pgx/v5/pgxpool"
)

func NewPool(databaseURL string) (*pgxpool.Pool, error) {
    config, err := pgxpool.ParseConfig(databaseURL)
    if err != nil {
        return nil, err
    }
    
    // コネクション数の設定
    config.MaxConns = 20
    config.MinConns = 5
    
    // コネクションの寿命
    config.MaxConnLifetime = 30 * time.Minute
    config.MaxConnIdleTime = 5 * time.Minute
    
    // コネクション取得のタイムアウト
    config.ConnConfig.ConnectTimeout = 10 * time.Second
    
    // ヘルスチェック
    config.HealthCheckPeriod = 1 * time.Minute
    
    pool, err := pgxpool.NewWithConfig(context.Background(), config)
    if err != nil {
        return nil, err
    }
    
    return pool, nil
}
```

### Node.js での pg プール設定

```javascript
// node-postgres (pg) のプール設定
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: 5432,
  
  // プールサイズ
  max: 20,          // 最大コネクション数
  min: 5,           // 最小コネクション数
  
  // タイムアウト設定
  connectionTimeoutMillis: 10000,  // コネクション取得タイムアウト
  idleTimeoutMillis: 30000,        // アイドルコネクションのタイムアウト
  maxUses: 7500,                   // コネクションの最大使用回数（メモリリーク対策）
});

// コネクション状態の監視
pool.on('connect', () => console.log('New DB connection created'));
pool.on('remove', () => console.log('DB connection removed'));
pool.on('error', (err) => console.error('Pool error:', err));
```

---

## 6. パーティショニング

大量のデータを扱うテーブルでは、パーティショニングによりクエリのスキャン範囲を絞り込み、メンテナンスコストを削減できる。

### Range パーティショニング（日付でよく使われる）

```sql
-- 親テーブルの作成
CREATE TABLE orders (
  id BIGSERIAL,
  user_id INTEGER NOT NULL,
  total_amount NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(20)
) PARTITION BY RANGE (created_at);

-- 月別パーティションの作成
CREATE TABLE orders_2025_01 
  PARTITION OF orders
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE orders_2025_02 
  PARTITION OF orders
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- デフォルトパーティション（範囲外のデータを受け取る）
CREATE TABLE orders_default 
  PARTITION OF orders DEFAULT;

-- 各パーティションにインデックスを作成
CREATE INDEX idx_orders_2025_01_user_id ON orders_2025_01(user_id);
CREATE INDEX idx_orders_2025_02_user_id ON orders_2025_02(user_id);

-- クエリは自動的に適切なパーティションのみスキャン（パーティションプルーニング）
EXPLAIN SELECT * FROM orders 
WHERE created_at BETWEEN '2025-01-01' AND '2025-01-31';
-- → orders_2025_01 のみをスキャン

-- 月次パーティション自動作成の関数
CREATE OR REPLACE FUNCTION create_monthly_partition(
  parent_table TEXT,
  partition_date DATE
) RETURNS VOID AS $$
DECLARE
  partition_name TEXT;
  start_date DATE;
  end_date DATE;
BEGIN
  partition_name := parent_table || '_' || TO_CHAR(partition_date, 'YYYY_MM');
  start_date := DATE_TRUNC('month', partition_date);
  end_date := start_date + INTERVAL '1 month';
  
  EXECUTE FORMAT(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
    partition_name, parent_table, start_date, end_date
  );
END;
$$ LANGUAGE plpgsql;

-- 翌月のパーティションを事前に作成
SELECT create_monthly_partition('orders', NOW()::DATE + INTERVAL '1 month');
```

### List パーティショニング（カテゴリ・地域など）

```sql
CREATE TABLE sales (
  id BIGSERIAL,
  region VARCHAR(20) NOT NULL,
  amount NUMERIC(10, 2),
  sale_date DATE NOT NULL
) PARTITION BY LIST (region);

CREATE TABLE sales_east PARTITION OF sales
  FOR VALUES IN ('tokyo', 'chiba', 'kanagawa', 'saitama');

CREATE TABLE sales_west PARTITION OF sales
  FOR VALUES IN ('osaka', 'kyoto', 'hyogo', 'nara');

CREATE TABLE sales_other PARTITION OF sales DEFAULT;
```

### Hash パーティショニング（均等分散）

```sql
-- ユーザーIDでハッシュ分散（8パーティション）
CREATE TABLE user_activity (
  id BIGSERIAL,
  user_id INTEGER NOT NULL,
  action VARCHAR(50),
  occurred_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY HASH (user_id);

CREATE TABLE user_activity_p0 PARTITION OF user_activity
  FOR VALUES WITH (MODULUS 8, REMAINDER 0);
CREATE TABLE user_activity_p1 PARTITION OF user_activity
  FOR VALUES WITH (MODULUS 8, REMAINDER 1);
-- ... p2 〜 p7 も同様に作成
```

---

## 7. バキューム・ANALYZE 設定

PostgreSQLはMVCC（Multi-Version Concurrency Control）を採用しており、更新・削除されたレコードは物理的にはしばらく残る。これを「デッドタプル」と呼び、バキュームで回収する。

### 手動バキュームの実行

```sql
-- 通常のバキューム（デッドタプルを回収、テーブルは縮小しない）
VACUUM orders;

-- フルバキューム（テーブルを物理的に縮小。排他ロックが必要、本番では注意）
VACUUM FULL orders;

-- バキューム + 統計更新
VACUUM ANALYZE orders;

-- 詳細情報付きバキューム
VACUUM VERBOSE ANALYZE orders;

-- バキューム状態の確認
SELECT 
  schemaname,
  relname AS tablename,
  n_live_tup,
  n_dead_tup,
  round(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_ratio,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 20;
```

### autovacuum のチューニング

```sql
-- テーブルごとにautovacuumを設定
ALTER TABLE orders SET (
  autovacuum_vacuum_scale_factor = 0.01,  -- デフォルト0.2→1%のデッドタプルでトリガー
  autovacuum_vacuum_threshold = 1000,     -- 最低1000行でトリガー
  autovacuum_analyze_scale_factor = 0.005, -- 0.5%の変更でANALYZEをトリガー
  autovacuum_vacuum_cost_limit = 400      -- IOコスト制限（デフォルト200→2倍速く）
);

-- 大きなテーブルの更新頻度が高い場合
ALTER TABLE large_events SET (
  autovacuum_vacuum_scale_factor = 0.005, -- 0.5%でトリガー
  autovacuum_vacuum_cost_delay = 2,       -- ms（デフォルト2ms）
  autovacuum_vacuum_cost_limit = 800      -- 4倍速く処理
);
```

---

## 8. postgresql.conf チューニング

デフォルト設定のPostgreSQLは保守的な値が設定されており、本番環境には不十分だ。サーバーのリソースに合わせてチューニングする。

### メモリ設定

```ini
# postgresql.conf

# shared_buffers: PostgreSQLが使うキャッシュサイズ
# 推奨: システムメモリの25%（デフォルト128MBは低すぎる）
# 16GBメモリなら → 4GB
shared_buffers = 4GB

# work_mem: ソート・ハッシュ結合で使うメモリ（コネクションごと）
# 注意: max_connections × work_mem = 最大メモリ消費量
# 100コネクション × 64MB = 6.4GB になり得る
work_mem = 64MB

# maintenance_work_mem: VACUUM・CREATE INDEX で使うメモリ
# 大きいほどVACUUMが速い
maintenance_work_mem = 1GB

# effective_cache_size: OSのファイルキャッシュ込みの利用可能メモリの推定値
# クエリプランナーがインデックスを使うかどうかの判断に影響
# 推奨: システムメモリの75%
effective_cache_size = 12GB

# huge_pages: 大きなshared_buffersに対して有効化（Linuxのみ）
huge_pages = try
```

### WAL・チェックポイント設定

```ini
# checkpoint_completion_target: チェックポイント間でのI/O分散率
# 0.9 = チェックポイント間の90%の時間でデータを書き込む（デフォルト0.5）
checkpoint_completion_target = 0.9

# wal_buffers: WALキャッシュサイズ（デフォルト-1は自動）
wal_buffers = 64MB

# max_wal_size: チェックポイント間の最大WALサイズ
# 大きいほどチェックポイントの頻度が下がる（書き込み性能向上、クラッシュ回復は遅くなる）
max_wal_size = 4GB
min_wal_size = 1GB

# synchronous_commit: 各トランザクションのWAL同期を制御
# off にすると約1ms以内のデータロスリスクで書き込みパフォーマンスが大幅向上
# 金融トランザクション以外なら off が高速
synchronous_commit = off
```

### クエリプランナー設定

```ini
# effective_io_concurrency: ビットマップヒープスキャンの並列I/O数
# SSDなら200程度が適切（HDDなら2〜4）
effective_io_concurrency = 200

# random_page_cost: ランダムI/Oのコスト（プランナーがインデックスを使うかに影響）
# SSDなら1.1〜1.5程度に下げる（デフォルト4.0はHDD向け）
random_page_cost = 1.5
seq_page_cost = 1.0

# default_statistics_target: ANALYZE が収集する統計の精度
# デフォルト100。複雑なクエリが多い場合は200-500に上げる
default_statistics_target = 200

# 並列クエリ設定（マルチコアCPU向け）
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
parallel_setup_cost = 1000
parallel_tuple_cost = 0.1
```

### コネクション設定

```ini
# max_connections: 最大コネクション数
# PgBouncer経由なら100以下でOK（直接接続なら200〜400）
max_connections = 100

# コネクションプールを使わない場合のアイドルタイムアウト
tcp_keepalives_idle = 60
tcp_keepalives_interval = 10
tcp_keepalives_count = 6
```

---

## 9. ロック競合の検出と解消

長時間のトランザクションやデッドロックはシステム全体を停止させる。定期的にロック状態を監視し、問題を事前に検出する。

### ロック状態の確認

```sql
-- 現在のロック競合を確認
SELECT 
  blocked.pid AS blocked_pid,
  blocked.query AS blocked_query,
  blocking.pid AS blocking_pid,
  blocking.query AS blocking_query,
  blocked.query_start AS blocked_since,
  age(NOW(), blocked.query_start) AS waiting_duration
FROM pg_stat_activity blocked
JOIN pg_stat_activity blocking 
  ON blocking.pid = ANY(pg_blocking_pids(blocked.pid))
WHERE NOT blocked.pid = pg_backend_pid();

-- 長時間実行中のクエリ（5分以上）
SELECT 
  pid,
  usename,
  application_name,
  state,
  query_start,
  age(NOW(), query_start) AS duration,
  LEFT(query, 100) AS query_preview
FROM pg_stat_activity
WHERE state != 'idle'
  AND query_start < NOW() - INTERVAL '5 minutes'
ORDER BY query_start;

-- 全テーブルのロック状況
SELECT 
  t.relname AS table_name,
  l.locktype,
  l.mode,
  l.granted,
  l.pid
FROM pg_locks l
JOIN pg_class t ON l.relation = t.oid
WHERE t.relnamespace = 'public'::regnamespace
ORDER BY t.relname;
```

### 危険なクエリのキャンセルと強制終了

```sql
-- クエリをキャンセル（トランザクションはロールバック）
SELECT pg_cancel_backend(pid)
FROM pg_stat_activity
WHERE state != 'idle'
  AND query_start < NOW() - INTERVAL '10 minutes';

-- コネクション自体を強制終了（pg_cancel_backend で止まらない場合）
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND query_start < NOW() - INTERVAL '5 minutes';
```

### ロック競合を防ぐベストプラクティス

```sql
-- 1. トランザクションは短く保つ
BEGIN;
  -- 必要最小限の操作だけ
  UPDATE inventory SET quantity = quantity - 1 WHERE product_id = 42;
COMMIT;  -- なるべく早くCOMMIT

-- 2. SELECT ... FOR UPDATE で行ロックの順序を統一する
BEGIN;
  -- 複数行を更新する場合、必ず同じ順序でロックする
  SELECT id FROM accounts WHERE id IN (1, 2) ORDER BY id FOR UPDATE;
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;
  UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;

-- 3. SKIP LOCKED で待機なしの非同期処理キュー
-- ジョブキュー実装でのよくあるパターン
SELECT id, payload
FROM jobs
WHERE status = 'pending'
ORDER BY created_at
LIMIT 10
FOR UPDATE SKIP LOCKED;  -- ロック中のジョブはスキップして別のジョブを取得

-- 4. Advisory Lock で自前のロック機構
-- アプリケーションレベルの排他制御
SELECT pg_try_advisory_lock(12345);  -- 12345はカスタムのロックID
-- 処理実行...
SELECT pg_advisory_unlock(12345);

-- 5. statement_timeout でタイムアウト設定
SET statement_timeout = '30s';
-- このセッション内のクエリが30秒を超えると自動でキャンセル

-- lock_timeout でロック待ちタイムアウト
SET lock_timeout = '5s';
```

---

## 10. 全文検索（tsvector・tsquery・pg_trgm）

PostgreSQLには強力な全文検索機能が内蔵されており、外部検索エンジンなしで実用的な全文検索を実装できる。

### tsvector と tsquery の基本

```sql
-- tsvector: 文書をトークン化したベクトル表現
SELECT to_tsvector('english', 'The PostgreSQL database system is very powerful');
-- 出力: 'databas':3 'postgresql':2 'power':7 'system':4

-- tsquery: 検索クエリの表現
SELECT to_tsquery('english', 'postgresql & performance');
-- 出力: 'postgresql' & 'perform'

-- 検索実行
SELECT title 
FROM articles 
WHERE to_tsvector('english', title || ' ' || body) @@ to_tsquery('english', 'postgresql & performance');

-- より柔軟なplainto_tsquery（AND検索）
SELECT title FROM articles 
WHERE to_tsvector('english', content) @@ plainto_tsquery('english', 'postgresql performance tuning');

-- websearch_to_tsquery（Googleライクな検索構文）
SELECT title FROM articles 
WHERE to_tsvector('english', content) @@ websearch_to_tsquery('english', '"postgresql performance" -slow');
```

### 全文検索の最適化

```sql
-- tsvectorカラムを追加して自動更新（推奨）
ALTER TABLE articles ADD COLUMN search_vector tsvector;

-- トリガーで自動更新
CREATE FUNCTION update_search_vector() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.body, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER articles_search_vector_update
  BEFORE INSERT OR UPDATE OF title, description, body ON articles
  FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- GINインデックスで高速検索
CREATE INDEX idx_articles_search ON articles USING GIN(search_vector);

-- 重み付き検索（タイトルマッチを優先）
SELECT 
  id,
  title,
  ts_rank(search_vector, query) AS rank
FROM articles, to_tsquery('english', 'postgresql') query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 10;

-- 検索結果のハイライト
SELECT 
  title,
  ts_headline(
    'english',
    body,
    to_tsquery('english', 'postgresql'),
    'MaxWords=50, MinWords=20, StartSel=<mark>, StopSel=</mark>'
  ) AS highlighted_snippet
FROM articles
WHERE search_vector @@ to_tsquery('english', 'postgresql');
```

### pg_trgm（トライグラム検索）

あいまい検索・部分一致検索に使用する。特に日本語のような言語でも有効だ。

```sql
-- pg_trgm 拡張を有効化
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GINインデックスで高速なLIKE/ILIKE検索
CREATE INDEX idx_products_name_trgm ON products USING GIN(name gin_trgm_ops);

-- 通常のLIKEよりはるかに高速
SELECT * FROM products WHERE name ILIKE '%postgresql%';

-- 類似度検索
SELECT name, similarity(name, 'postgresq') AS sim
FROM products
WHERE name % 'postgresq'  -- デフォルト閾値0.3以上の類似度
ORDER BY sim DESC
LIMIT 10;

-- 最大距離での検索（スペルミス許容）
SELECT name
FROM products
WHERE levenshtein(name, 'postgresq') <= 3
ORDER BY levenshtein(name, 'postgresq');
```

---

## 11. JSONB の活用とインデックス

PostgreSQLのJSONBはバイナリ形式でJSONを格納し、高速な検索・インデックス付けが可能だ。NoSQLとRDBMSの利点を組み合わせた強力な機能だ。

### JSONB の基本操作

```sql
-- テーブル作成
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  attributes JSONB
);

-- データ挿入
INSERT INTO products (name, attributes) VALUES
  ('MacBook Pro', '{"cpu": "M3 Pro", "ram": 18, "storage": 512, "color": ["silver", "black"], "released": "2024-01"}'),
  ('iPad Air', '{"cpu": "M2", "ram": 8, "storage": 256, "color": ["blue", "starlight"], "released": "2024-03"}');

-- JSONB 演算子
SELECT 
  name,
  attributes -> 'cpu' AS cpu,           -- JSONBとして取得
  attributes ->> 'cpu' AS cpu_text,     -- テキストとして取得
  attributes -> 'color' -> 0 AS first_color,  -- 配列アクセス
  attributes #>> '{color, 0}' AS first_color_text  -- パス指定テキスト
FROM products;

-- 含有チェック（@>）
SELECT * FROM products WHERE attributes @> '{"cpu": "M3 Pro"}';

-- キー存在チェック
SELECT * FROM products WHERE attributes ? 'storage';
SELECT * FROM products WHERE attributes ?& ARRAY['cpu', 'ram', 'storage'];  -- 全キーが存在
SELECT * FROM products WHERE attributes ?| ARRAY['cpu', 'gpu'];  -- いずれかのキーが存在

-- JSONB の更新
UPDATE products 
SET attributes = attributes || '{"discount": 0.15}'  -- マージ
WHERE id = 1;

UPDATE products 
SET attributes = attributes - 'discount'  -- キー削除
WHERE id = 1;

-- 特定パスの値を更新
UPDATE products 
SET attributes = jsonb_set(attributes, '{ram}', '24')
WHERE name = 'MacBook Pro';
```

### JSONB インデックス

```sql
-- 全体をGINインデックス（@>, ?演算子が高速化）
CREATE INDEX idx_products_attributes ON products USING GIN(attributes);

-- 特定キーだけのインデックス（より小さく高速）
CREATE INDEX idx_products_cpu 
  ON products ((attributes ->> 'cpu'));

CREATE INDEX idx_products_ram 
  ON products ((CAST(attributes ->> 'ram' AS INTEGER)));

-- 部分インデックスとの組み合わせ
CREATE INDEX idx_products_pro_attributes 
  ON products USING GIN(attributes)
  WHERE name LIKE '%Pro%';
```

### JSON集計とアンネスト

```sql
-- JSONBを行に展開
SELECT 
  id,
  name,
  key,
  value
FROM products,
  jsonb_each_text(attributes);

-- JSONBの配列を行に展開
SELECT 
  id,
  name,
  jsonb_array_elements_text(attributes -> 'color') AS color
FROM products;

-- JSON集計（行→JSON）
SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name))
FROM products;

-- JSON統計
SELECT 
  attributes ->> 'cpu' AS cpu_model,
  COUNT(*) AS product_count,
  AVG(CAST(attributes ->> 'ram' AS NUMERIC)) AS avg_ram
FROM products
GROUP BY attributes ->> 'cpu'
ORDER BY product_count DESC;
```

PostgreSQLでJSONBデータを扱う際、APIレスポンスやJSONスキーマの検証が必要になることがある。**[DevToolBox](https://usedevtools.com/)** はブラウザ上でJSONのバリデーション・フォーマット・差分比較ができるツールで、PostgreSQLのJSONBに格納するデータの事前検証に便利だ。インデックスを活用したJSONBクエリを設計する前に、データ構造を整理するのに役立つ。

---

## 12. モニタリング（pg_stat_statements・スロークエリログ）

本番環境では継続的なモニタリングが不可欠だ。問題が起きてから対処するのではなく、事前に検出する仕組みを作る。

### pg_stat_statements でクエリ統計

```sql
-- pg_stat_statementsを有効化（postgresql.confで設定）
-- shared_preload_libraries = 'pg_stat_statements'
-- pg_stat_statements.max = 10000
-- pg_stat_statements.track = all

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 実行時間の合計でトップ10のクエリ
SELECT 
  calls,
  round(total_exec_time::numeric / 1000, 2) AS total_sec,
  round(mean_exec_time::numeric, 2) AS mean_ms,
  round(stddev_exec_time::numeric, 2) AS stddev_ms,
  round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) AS percentage,
  rows / calls AS avg_rows,
  query
FROM pg_stat_statements
WHERE calls > 100
ORDER BY total_exec_time DESC
LIMIT 10;

-- バッファヒット率の低いクエリ（ディスクI/Oが多い）
SELECT 
  calls,
  round(mean_exec_time::numeric, 2) AS mean_ms,
  round(
    100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0),
    2
  ) AS cache_hit_ratio,
  query
FROM pg_stat_statements
WHERE calls > 50
  AND shared_blks_hit + shared_blks_read > 0
ORDER BY cache_hit_ratio ASC
LIMIT 10;

-- 統計をリセット（定期的に実行してフレッシュな統計を取得）
SELECT pg_stat_statements_reset();
```

### スロークエリログの設定

```ini
# postgresql.conf
log_min_duration_statement = 1000  # 1秒以上かかったクエリをログ出力（ms）
log_line_prefix = '%t [%p]: [%l-1] db=%d,user=%u,app=%a,client=%h '
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_temp_files = 0  # 一時ファイルが使われたら全てログ出力
```

### 重要なヘルスチェッククエリ集

```sql
-- 1. データベース全体のキャッシュヒット率（95%以上が目標）
SELECT 
  datname,
  round(
    100.0 * blks_hit / NULLIF(blks_hit + blks_read, 0),
    2
  ) AS cache_hit_ratio
FROM pg_stat_database
WHERE datname = current_database();

-- 2. テーブルごとのシーケンシャルスキャン数（インデックス不足のサイン）
SELECT 
  relname AS tablename,
  seq_scan,
  idx_scan,
  round(100.0 * idx_scan / NULLIF(seq_scan + idx_scan, 0), 2) AS index_usage_ratio,
  n_live_tup AS live_rows
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_scan DESC
LIMIT 20;

-- 3. テーブルとインデックスのサイズ
SELECT 
  relname AS tablename,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
  pg_size_pretty(pg_relation_size(relid)) AS table_size,
  pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS index_size
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 20;

-- 4. トランザクションID周回（XID Wraparound）の監視
-- age(relfrozenxid) が 2億を超えると危険
SELECT 
  relname,
  age(relfrozenxid) AS xid_age,
  pg_size_pretty(pg_total_relation_size(oid)) AS size
FROM pg_class
WHERE relkind = 'r'
ORDER BY age(relfrozenxid) DESC
LIMIT 10;

-- 警告レベルの確認（age > 150,000,000 で要注意）
SELECT 
  count(*) FILTER (WHERE age(relfrozenxid) > 150000000) AS critical_tables,
  max(age(relfrozenxid)) AS max_xid_age
FROM pg_class
WHERE relkind = 'r';

-- 5. 長時間の idle in transaction を検出
SELECT 
  pid,
  usename,
  application_name,
  age(now(), xact_start) AS transaction_age,
  state,
  left(query, 80) AS last_query
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND xact_start < now() - interval '5 minutes'
ORDER BY xact_start;

-- 6. レプリケーション遅延（レプリカ側で実行）
SELECT 
  now() - pg_last_xact_replay_timestamp() AS replication_lag;

-- プライマリ側でのレプリカ状態確認
SELECT 
  client_addr,
  state,
  sent_lsn,
  write_lsn,
  flush_lsn,
  replay_lsn,
  pg_wal_lsn_diff(sent_lsn, replay_lsn) AS replay_lag_bytes
FROM pg_stat_replication;
```

### 自動モニタリングのシェルスクリプト例

```bash
#!/bin/bash
# pg_health_check.sh - PostgreSQL定期ヘルスチェック

DB_NAME="${PGDATABASE:-myapp}"
ALERT_EMAIL="dba@example.com"

# スロークエリが多い場合にアラート
SLOW_QUERY_COUNT=$(psql -d "$DB_NAME" -t -A -c "
  SELECT count(*) FROM pg_stat_statements 
  WHERE mean_exec_time > 1000 AND calls > 100;
")

if [ "$SLOW_QUERY_COUNT" -gt 5 ]; then
  echo "警告: スロークエリが $SLOW_QUERY_COUNT 件あります" | \
    mail -s "[DB Alert] スロークエリ検出" "$ALERT_EMAIL"
fi

# キャッシュヒット率チェック
CACHE_HIT=$(psql -d "$DB_NAME" -t -A -c "
  SELECT round(100.0 * blks_hit / NULLIF(blks_hit + blks_read, 0), 2)
  FROM pg_stat_database WHERE datname = '$DB_NAME';
")

if (( $(echo "$CACHE_HIT < 90" | bc -l) )); then
  echo "警告: キャッシュヒット率が $CACHE_HIT% に低下しています" | \
    mail -s "[DB Alert] キャッシュヒット率低下" "$ALERT_EMAIL"
fi

echo "ヘルスチェック完了: $(date)"
```

---

## まとめ：PostgreSQL最適化のチェックリスト

本記事で解説した内容を実施順序でまとめると以下の通りだ。

### 診断フェーズ

1. `pg_stat_statements` を有効化してスロークエリを特定
2. スロークエリに `EXPLAIN (ANALYZE, BUFFERS)` を実行して原因を特定
3. `Seq Scan` とフィルタで除去されている行数を確認
4. キャッシュヒット率（目標95%以上）を確認
5. デッドタプル比率・autovacuumの稼働状況を確認

### 即効性の高い対策

6. 欠損インデックスを追加（SELECT が多いカラム・外部キーなど）
7. N+1クエリをJOINまたはCTEで解消
8. OFFSET ページネーションをカーソルベースに変更
9. `postgresql.conf` の `shared_buffers` を RAM の25%に設定
10. `work_mem` を適切な値に設定

### 中長期の対策

11. コネクションプール（PgBouncer）を導入
12. 大テーブルにパーティショニングを適用
13. 頻繁に参照する重いクエリをマテリアライズドビューにキャッシュ
14. autovacuumのチューニングで更新頻度の高いテーブルを最適化
15. レプリカを追加してリードクエリを分散

PostgreSQL は「使えば使うほど奥が深い」データベースだ。本番の問題は突然起きるのではなく、少しずつ蓄積していく。定期的なモニタリングと計画的なチューニングで、どんなスケールでも安定したパフォーマンスを維持できる。

---

*参考: PostgreSQLドキュメント（[https://www.postgresql.org/docs/](https://www.postgresql.org/docs/)）、pgBadger、pganalyze*

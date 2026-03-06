---
title: 'PostgreSQL実践テクニック集2026'
description: 'PostgreSQLの実践的テクニックを完全網羅。インデックス最適化、JSONB活用、ウィンドウ関数、CTE、パフォーマンスチューニングまで実例で解説。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。'
pubDate: 'Feb 05 2026'
tags: ['PostgreSQL', 'Database', 'SQL', 'パフォーマンス', 'インフラ']
---
# PostgreSQL実践テクニック集2026

PostgreSQLは強力な機能を持つリレーショナルデータベースです。本記事では、実務で使える実践的テクニックを徹底解説します。

## 目次

1. インデックス最適化
2. JSONB活用
3. ウィンドウ関数
4. CTE（共通テーブル式）
5. パーティショニング
6. フルテキスト検索
7. パフォーマンスチューニング
8. 実践パターン
9. ベストプラクティス

## インデックス最適化

### B-Treeインデックス

```sql
-- 基本的なインデックス
CREATE INDEX idx_users_email ON users(email);

-- 複合インデックス（順序が重要）
CREATE INDEX idx_orders_user_created
ON orders(user_id, created_at DESC);

-- 部分インデックス（条件付き）
CREATE INDEX idx_active_users
ON users(email)
WHERE status = 'active';

-- ユニークインデックス
CREATE UNIQUE INDEX idx_users_username
ON users(username);
```

### インデックスの使用状況確認

```sql
-- インデックスのサイズと使用状況
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- 未使用インデックスの検出
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexrelid NOT IN (
  SELECT indexrelid FROM pg_index WHERE indisunique
);
```

### GINインデックス

```sql
-- 配列検索用
CREATE INDEX idx_tags_gin ON posts USING GIN(tags);

-- 使用例
SELECT * FROM posts WHERE tags @> ARRAY['postgresql', 'database'];

-- JSONB用
CREATE INDEX idx_metadata_gin ON products USING GIN(metadata);

-- 使用例
SELECT * FROM products
WHERE metadata @> '{"category": "electronics"}';
```

### GiSTインデックス

```sql
-- 範囲検索用
CREATE INDEX idx_events_daterange
ON events USING GIST(daterange(start_date, end_date));

-- 使用例
SELECT * FROM events
WHERE daterange(start_date, end_date) && daterange('2026-01-01', '2026-12-31');

-- 地理空間データ用（PostGIS）
CREATE INDEX idx_locations_geom
ON locations USING GIST(geom);
```

### 式インデックス

```sql
-- 小文字変換後の検索用
CREATE INDEX idx_users_lower_email
ON users(LOWER(email));

-- 使用例
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';

-- JSON抽出用
CREATE INDEX idx_data_name
ON documents((data->>'name'));

-- 使用例
SELECT * FROM documents WHERE data->>'name' = 'John';
```

## JSONB活用

### 基本操作

```sql
-- テーブル作成
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- データ挿入
INSERT INTO products (name, metadata) VALUES
('Laptop', '{"brand": "Dell", "specs": {"cpu": "i7", "ram": 16}}'),
('Phone', '{"brand": "Apple", "specs": {"storage": 128, "color": "black"}}');

-- データ取得
SELECT
  name,
  metadata->>'brand' as brand,
  metadata->'specs'->>'cpu' as cpu
FROM products;
```

### JSONB検索

```sql
-- キーの存在確認
SELECT * FROM products WHERE metadata ? 'brand';

-- 複数キーの存在確認
SELECT * FROM products WHERE metadata ?& ARRAY['brand', 'specs'];

-- 値の一致
SELECT * FROM products WHERE metadata @> '{"brand": "Apple"}';

-- ネストした値の検索
SELECT * FROM products
WHERE metadata->'specs'->>'cpu' = 'i7';

-- 配列要素の検索
SELECT * FROM products
WHERE metadata->'tags' @> '"featured"';
```

### JSONB更新

```sql
-- 値の追加・更新
UPDATE products
SET metadata = metadata || '{"warranty": "2 years"}'
WHERE id = 1;

-- ネストした値の更新
UPDATE products
SET metadata = jsonb_set(
  metadata,
  '{specs, ram}',
  '32'
)
WHERE id = 1;

-- キーの削除
UPDATE products
SET metadata = metadata - 'warranty'
WHERE id = 1;

-- ネストしたキーの削除
UPDATE products
SET metadata = metadata #- '{specs, color}'
WHERE id = 2;
```

### JSONB集計

```sql
-- JSONBから集計
SELECT
  metadata->>'brand' as brand,
  COUNT(*) as product_count,
  AVG((metadata->'specs'->>'ram')::int) as avg_ram
FROM products
WHERE metadata->'specs' ? 'ram'
GROUP BY metadata->>'brand';

-- JSONB配列の展開
SELECT
  p.name,
  tag.value as tag
FROM products p,
  jsonb_array_elements_text(p.metadata->'tags') as tag;
```

### JSONBインデックス戦略

```sql
-- GINインデックス（汎用）
CREATE INDEX idx_metadata_gin ON products USING GIN(metadata);

-- 特定のパス用インデックス
CREATE INDEX idx_brand ON products((metadata->>'brand'));

-- 複合インデックス
CREATE INDEX idx_brand_category
ON products((metadata->>'brand'), (metadata->>'category'));
```

## ウィンドウ関数

### ROW_NUMBER

```sql
-- 各ユーザーの最新注文
SELECT *
FROM (
  SELECT
    *,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
  FROM orders
) as ranked
WHERE rn = 1;
```

### RANK / DENSE_RANK

```sql
-- 売上ランキング
SELECT
  user_id,
  total_sales,
  RANK() OVER (ORDER BY total_sales DESC) as rank,
  DENSE_RANK() OVER (ORDER BY total_sales DESC) as dense_rank
FROM (
  SELECT
    user_id,
    SUM(amount) as total_sales
  FROM orders
  GROUP BY user_id
) as sales;
```

### LAG / LEAD

```sql
-- 前月比の計算
SELECT
  date_trunc('month', created_at) as month,
  SUM(amount) as current_month,
  LAG(SUM(amount)) OVER (ORDER BY date_trunc('month', created_at)) as prev_month,
  SUM(amount) - LAG(SUM(amount)) OVER (ORDER BY date_trunc('month', created_at)) as diff
FROM orders
GROUP BY date_trunc('month', created_at)
ORDER BY month;
```

### 累積合計

```sql
-- 累積売上
SELECT
  date,
  daily_sales,
  SUM(daily_sales) OVER (ORDER BY date) as cumulative_sales
FROM (
  SELECT
    DATE(created_at) as date,
    SUM(amount) as daily_sales
  FROM orders
  GROUP BY DATE(created_at)
) as daily;
```

### 移動平均

```sql
-- 7日間移動平均
SELECT
  date,
  daily_sales,
  AVG(daily_sales) OVER (
    ORDER BY date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) as moving_avg_7d
FROM (
  SELECT
    DATE(created_at) as date,
    SUM(amount) as daily_sales
  FROM orders
  GROUP BY DATE(created_at)
) as daily;
```

### パーセンタイル

```sql
-- 売上の四分位数
SELECT
  user_id,
  total_sales,
  NTILE(4) OVER (ORDER BY total_sales) as quartile
FROM (
  SELECT
    user_id,
    SUM(amount) as total_sales
  FROM orders
  GROUP BY user_id
) as sales;
```

## CTE（共通テーブル式）

### 基本的なCTE

```sql
-- 読みやすいクエリ
WITH monthly_sales AS (
  SELECT
    date_trunc('month', created_at) as month,
    SUM(amount) as total
  FROM orders
  GROUP BY date_trunc('month', created_at)
)
SELECT
  month,
  total,
  LAG(total) OVER (ORDER BY month) as prev_month,
  total - LAG(total) OVER (ORDER BY month) as growth
FROM monthly_sales
ORDER BY month;
```

### 複数のCTE

```sql
-- 複雑な分析を段階的に
WITH user_stats AS (
  SELECT
    user_id,
    COUNT(*) as order_count,
    SUM(amount) as total_spent
  FROM orders
  GROUP BY user_id
),
user_segments AS (
  SELECT
    user_id,
    order_count,
    total_spent,
    CASE
      WHEN total_spent >= 10000 THEN 'VIP'
      WHEN total_spent >= 5000 THEN 'Premium'
      ELSE 'Regular'
    END as segment
  FROM user_stats
)
SELECT
  segment,
  COUNT(*) as user_count,
  AVG(total_spent) as avg_spent,
  AVG(order_count) as avg_orders
FROM user_segments
GROUP BY segment;
```

### 再帰CTE

```sql
-- 組織階層の取得
WITH RECURSIVE org_tree AS (
  -- ベースケース
  SELECT
    id,
    name,
    manager_id,
    1 as level,
    ARRAY[id] as path
  FROM employees
  WHERE manager_id IS NULL

  UNION ALL

  -- 再帰ケース
  SELECT
    e.id,
    e.name,
    e.manager_id,
    ot.level + 1,
    ot.path || e.id
  FROM employees e
  INNER JOIN org_tree ot ON e.manager_id = ot.id
)
SELECT
  id,
  repeat('  ', level - 1) || name as name,
  level,
  path
FROM org_tree
ORDER BY path;
```

### 変更を伴うCTE

```sql
-- 削除したレコードを返す
WITH deleted_orders AS (
  DELETE FROM orders
  WHERE created_at < CURRENT_DATE - INTERVAL '1 year'
  RETURNING *
)
INSERT INTO archived_orders
SELECT * FROM deleted_orders;

-- 更新と同時に集計
WITH updated_users AS (
  UPDATE users
  SET last_login = CURRENT_TIMESTAMP
  WHERE id IN (1, 2, 3)
  RETURNING *
)
SELECT
  COUNT(*) as updated_count,
  AVG(age) as avg_age
FROM updated_users;
```

## パーティショニング

### 範囲パーティショニング

```sql
-- 親テーブル
CREATE TABLE orders (
  id BIGSERIAL,
  user_id INTEGER,
  amount DECIMAL(10,2),
  created_at TIMESTAMP,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- パーティション作成
CREATE TABLE orders_2024 PARTITION OF orders
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE orders_2025 PARTITION OF orders
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE orders_2026 PARTITION OF orders
FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- インデックス（各パーティションに自動作成）
CREATE INDEX ON orders (user_id);
CREATE INDEX ON orders (created_at);
```

### リストパーティショニング

```sql
-- 地域別パーティション
CREATE TABLE users (
  id SERIAL,
  name VARCHAR(255),
  region VARCHAR(50),
  created_at TIMESTAMP,
  PRIMARY KEY (id, region)
) PARTITION BY LIST (region);

CREATE TABLE users_us PARTITION OF users
FOR VALUES IN ('US', 'CA', 'MX');

CREATE TABLE users_eu PARTITION OF users
FOR VALUES IN ('UK', 'DE', 'FR');

CREATE TABLE users_asia PARTITION OF users
FOR VALUES IN ('JP', 'CN', 'KR');
```

### パーティション管理

```sql
-- 新しいパーティションの追加
CREATE TABLE orders_2027 PARTITION OF orders
FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

-- 古いパーティションのデタッチ
ALTER TABLE orders DETACH PARTITION orders_2024;

-- パーティションの削除
DROP TABLE orders_2024;

-- パーティション情報の確認
SELECT
  parent.relname as parent_table,
  child.relname as partition_name,
  pg_get_expr(child.relpartbound, child.oid) as partition_expression
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
WHERE parent.relname = 'orders';
```

## フルテキスト検索

### 基本的な検索

```sql
-- tsvectorの作成
ALTER TABLE articles
ADD COLUMN search_vector tsvector;

-- 検索インデックス
CREATE INDEX idx_articles_search
ON articles USING GIN(search_vector);

-- 検索ベクトルの更新
UPDATE articles
SET search_vector =
  to_tsvector('english', title || ' ' || content);

-- 自動更新トリガー
CREATE FUNCTION articles_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('english', NEW.title || ' ' || NEW.content);
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER tsvector_update
BEFORE INSERT OR UPDATE ON articles
FOR EACH ROW
EXECUTE FUNCTION articles_search_trigger();
```

### 検索クエリ

```sql
-- 基本検索
SELECT *
FROM articles
WHERE search_vector @@ to_tsquery('english', 'postgresql & performance');

-- ランキング付き検索
SELECT
  title,
  ts_rank(search_vector, query) as rank
FROM articles,
  to_tsquery('english', 'postgresql & performance') query
WHERE search_vector @@ query
ORDER BY rank DESC;

-- ハイライト表示
SELECT
  title,
  ts_headline('english', content, query) as snippet
FROM articles,
  to_tsquery('english', 'postgresql & performance') query
WHERE search_vector @@ query;
```

### 多言語対応

```sql
-- 日本語検索（pg_bigm拡張）
CREATE EXTENSION pg_bigm;

CREATE INDEX idx_articles_title_bigm
ON articles USING GIN(title gin_bigm_ops);

-- 検索
SELECT * FROM articles
WHERE title LIKE '%PostgreSQL%';
```

## パフォーマンスチューニング

### EXPLAIN ANALYZE

```sql
-- 実行計画の確認
EXPLAIN ANALYZE
SELECT u.name, COUNT(o.id)
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2025-01-01'
GROUP BY u.name;

-- 詳細な情報
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM orders WHERE user_id = 123;
```

### クエリ最適化

```sql
-- 悪い例：N+1問題
SELECT * FROM users;
-- 各ユーザーごとに注文を取得
SELECT * FROM orders WHERE user_id = ?;

-- 良い例：JOINを使用
SELECT
  u.*,
  json_agg(o.*) as orders
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id;

-- さらに良い例：LATERAL JOIN
SELECT
  u.*,
  recent_orders.orders
FROM users u
LEFT JOIN LATERAL (
  SELECT json_agg(o.*) as orders
  FROM orders o
  WHERE o.user_id = u.id
  ORDER BY o.created_at DESC
  LIMIT 10
) recent_orders ON true;
```

### バキューム

```sql
-- 手動バキューム
VACUUM ANALYZE orders;

-- 完全バキューム（テーブルロック）
VACUUM FULL orders;

-- 自動バキューム設定の確認
SELECT
  relname,
  n_tup_ins,
  n_tup_upd,
  n_tup_del,
  n_live_tup,
  n_dead_tup,
  last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_dead_tup DESC;
```

### 接続プーリング

```sql
-- PgBouncerの設定例
-- pgbouncer.ini
[databases]
mydb = host=localhost dbname=mydb

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
```

## 実践パターン

### ソフトデリート

```sql
-- テーブル定義
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255),
  content TEXT,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 部分インデックス（アクティブなレコードのみ）
CREATE INDEX idx_posts_active
ON posts(created_at)
WHERE deleted_at IS NULL;

-- ビュー（削除されていないレコード）
CREATE VIEW active_posts AS
SELECT * FROM posts WHERE deleted_at IS NULL;

-- ソフトデリート関数
CREATE FUNCTION soft_delete_post(post_id INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE posts
  SET deleted_at = CURRENT_TIMESTAMP
  WHERE id = post_id AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;
```

### 楽観的ロック

```sql
-- バージョン列を追加
ALTER TABLE products
ADD COLUMN version INTEGER DEFAULT 1;

-- 更新関数
CREATE FUNCTION update_product(
  p_id INTEGER,
  p_name VARCHAR,
  p_version INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  updated_rows INTEGER;
BEGIN
  UPDATE products
  SET
    name = p_name,
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_id AND version = p_version;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;

  RETURN updated_rows > 0;
END;
$$ LANGUAGE plpgsql;
```

### 監査ログ

```sql
-- 監査ログテーブル
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name VARCHAR(255),
  operation VARCHAR(10),
  old_data JSONB,
  new_data JSONB,
  user_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 監査トリガー関数
CREATE FUNCTION audit_trigger() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (table_name, operation, old_data, user_id)
    VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), current_setting('app.user_id')::INTEGER);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (table_name, operation, old_data, new_data, user_id)
    VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), row_to_json(NEW), current_setting('app.user_id')::INTEGER);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (table_name, operation, new_data, user_id)
    VALUES (TG_TABLE_NAME, TG_OP, row_to_json(NEW), current_setting('app.user_id')::INTEGER);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- トリガーの設定
CREATE TRIGGER products_audit
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW
EXECUTE FUNCTION audit_trigger();
```

## ベストプラクティス

### スキーマ設計

```sql
-- NOT NULL制約を適切に使用
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  bio TEXT, -- NULLを許可
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CHECK制約でデータ整合性を保証
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL CHECK (stock >= 0),
  status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'published', 'archived'))
);

-- 外部キー制約
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT
);
```

### トランザクション管理

```sql
-- アトミックな操作
BEGIN;

UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

COMMIT;

-- セーブポイントの使用
BEGIN;

INSERT INTO orders (user_id, amount) VALUES (1, 100);

SAVEPOINT order_created;

INSERT INTO order_items (order_id, product_id) VALUES (1, 1);
-- エラーが発生した場合
ROLLBACK TO SAVEPOINT order_created;

COMMIT;
```

### パフォーマンスモニタリング

```sql
-- スロークエリの検出
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- テーブルサイズの確認
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## まとめ

PostgreSQLの高度な機能を活用することで、パフォーマンスと保守性を大幅に向上できます。

**重要なテクニック**:

1. **インデックス最適化**: 適切なインデックスタイプを選択
2. **JSONB活用**: 柔軟なデータ構造
3. **ウィンドウ関数**: 複雑な分析を簡潔に
4. **CTE**: 読みやすいクエリ
5. **パーティショニング**: 大規模データの管理

**2026年のベストプラクティス**:

- インデックス戦略を慎重に計画
- JSONBで柔軟性と性能を両立
- ウィンドウ関数で分析を効率化
- パーティショニングでスケーラビリティを確保
- 定期的なパフォーマンス監視

これらのテクニックを駆使して、高性能なデータベースアプリケーションを構築しましょう。

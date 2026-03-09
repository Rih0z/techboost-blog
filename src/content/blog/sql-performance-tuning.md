---
title: "SQL パフォーマンスチューニング実践ガイド — スロークエリを10倍速にする方法"
description: "データベースのパフォーマンスを劇的に改善するSQL最適化テクニック。インデックス設計、EXPLAIN解析、N+1問題解決など実践的な手法を網羅的に解説します。PostgreSQL・MySQLに対応した具体的なクエリ改善例でスロークエリを解消しましょう。"
pubDate: "2026-02-06"
tags: ["SQL", "パフォーマンス", "データベース", "チューニング", "PostgreSQL", "プログラミング"]
heroImage: '../../assets/thumbnails/sql-performance-tuning.jpg'
---
データベースのパフォーマンス問題は、Webアプリケーションのボトルネックの中でも最も影響が大きい要因の一つです。本記事では、SQLクエリのパフォーマンスを最大化するための実践的なテクニックを、基礎から応用まで体系的に解説します。

## 目次

1. パフォーマンスチューニングの基礎知識
2. 実行計画（EXPLAIN）の読み方
3. インデックス設計の極意
4. クエリ最適化パターン
5. N+1問題の解決
6. PostgreSQL固有の最適化
7. MySQL固有の最適化
8. 実践的なチューニング手法

## 1. パフォーマンスチューニングの基礎知識

### なぜSQLは遅くなるのか

SQLクエリのパフォーマンス低下には、主に以下の原因があります。

**1. フルテーブルスキャン**

```sql
-- 遅い: テーブル全体をスキャン
SELECT * FROM users WHERE email = 'user@example.com';

-- 速い: インデックスを使用
CREATE INDEX idx_users_email ON users(email);
SELECT * FROM users WHERE email = 'user@example.com';
```

**2. 不適切なJOIN**

```sql
-- 遅い: 複数のテーブルを無計画に結合
SELECT *
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
LEFT JOIN products p ON o.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id
WHERE c.name = 'Electronics';

-- 速い: 先に絞り込んでからJOIN
SELECT o.*, u.name, p.name
FROM categories c
INNER JOIN products p ON p.category_id = c.id
INNER JOIN orders o ON o.product_id = p.id
INNER JOIN users u ON o.user_id = u.id
WHERE c.name = 'Electronics';
```

**3. N+1問題**

```sql
-- 遅い: 各ユーザーごとにクエリ実行（N+1問題）
SELECT * FROM users;
-- 各ユーザーに対して
SELECT * FROM orders WHERE user_id = ?;

-- 速い: 1つのクエリで取得
SELECT u.*, o.*
FROM users u
LEFT JOIN orders o ON o.user_id = u.id;
```

### パフォーマンス測定の基本

チューニングの前に、必ず現状を測定します。

```sql
-- クエリ実行時間の測定（PostgreSQL）
\timing on
SELECT COUNT(*) FROM large_table;

-- クエリ実行時間の測定（MySQL）
SET profiling = 1;
SELECT COUNT(*) FROM large_table;
SHOW PROFILES;
```

## 2. 実行計画（EXPLAIN）の読み方

### EXPLAINの基本

```sql
EXPLAIN ANALYZE
SELECT u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.created_at > '2025-01-01'
GROUP BY u.id, u.name
HAVING COUNT(o.id) > 5;
```

### PostgreSQLの実行計画

```
Seq Scan on users u  (cost=0.00..1234.56 rows=10000 width=32)
  Filter: (created_at > '2025-01-01'::date)

Index Scan using idx_orders_user_id on orders o  (cost=0.29..8.31 rows=1 width=8)
  Index Cond: (user_id = u.id)
```

**重要な指標**

- **cost**: クエリの推定コスト（小さいほど良い）
- **rows**: 推定行数
- **width**: 行の平均バイト数
- **actual time**: 実際の実行時間（ANALYZE使用時）

### 実行計画の読み方のコツ

1. **Seq Scan（シーケンシャルスキャン）に注意**
   - 小さなテーブル以外では避けるべき
   - Index Scanに変更できないか検討

2. **Nested Loop vs Hash Join**
   - Nested Loop: 小さなテーブルのJOINに適している
   - Hash Join: 大きなテーブルのJOINに適している

3. **Filter条件の位置**
   - できるだけ早い段階で絞り込む
   - Index Condで絞り込めるのが理想

```sql
-- 悪い例: Filterで絞り込み
EXPLAIN SELECT * FROM orders WHERE status = 'completed';
-- Seq Scan on orders (cost=0.00..1234.56 rows=5000 width=100)
--   Filter: (status = 'completed'::text)

-- 良い例: Index Condで絞り込み
CREATE INDEX idx_orders_status ON orders(status);
EXPLAIN SELECT * FROM orders WHERE status = 'completed';
-- Index Scan using idx_orders_status on orders (cost=0.29..8.31 rows=5000 width=100)
--   Index Cond: (status = 'completed'::text)
```

## 3. インデックス設計の極意

### 単一カラムインデックス

```sql
-- 基本的なインデックス作成
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_products_price ON products(price);

-- ユニークインデックス
CREATE UNIQUE INDEX idx_users_username ON users(username);
```

### 複合インデックス（Composite Index）

```sql
-- 検索条件が複数ある場合
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- 使用例
SELECT * FROM orders
WHERE user_id = 123 AND status = 'pending';
-- このクエリは idx_orders_user_status を効率的に使用

SELECT * FROM orders WHERE user_id = 123;
-- このクエリも idx_orders_user_status を使用可能（最左一致の法則）

SELECT * FROM orders WHERE status = 'pending';
-- このクエリは idx_orders_user_status を効率的に使用できない
```

**複合インデックスの順序ルール**

1. **等価条件 > 範囲条件**
   ```sql
   -- 良い順序
   CREATE INDEX idx_events ON events(user_id, created_at);

   SELECT * FROM events
   WHERE user_id = 123
   AND created_at > '2025-01-01';
   ```

2. **カーディナリティの高い列を先に**
   ```sql
   -- カーディナリティ: email > status
   CREATE INDEX idx_users_email_status ON users(email, status);
   ```

3. **頻繁に使う条件を先に**
   ```sql
   -- user_id で絞り込むクエリが多い
   CREATE INDEX idx_orders ON orders(user_id, created_at, status);
   ```

### 部分インデックス（Partial Index）

```sql
-- アクティブユーザーのみをインデックス化
CREATE INDEX idx_active_users ON users(email)
WHERE deleted_at IS NULL;

-- 未完了の注文のみをインデックス化
CREATE INDEX idx_pending_orders ON orders(created_at)
WHERE status IN ('pending', 'processing');
```

### カバリングインデックス（Covering Index）

```sql
-- INCLUDE句でカバリングインデックス作成（PostgreSQL 11+）
CREATE INDEX idx_users_email_covering ON users(email)
INCLUDE (name, created_at);

-- このクエリはインデックスのみでデータを取得可能
SELECT email, name, created_at
FROM users
WHERE email = 'user@example.com';
```

### 関数インデックス

```sql
-- 大文字小文字を区別しない検索
CREATE INDEX idx_users_email_lower ON users(LOWER(email));

SELECT * FROM users WHERE LOWER(email) = 'user@example.com';

-- JSON フィールドのインデックス
CREATE INDEX idx_user_metadata ON users((metadata->>'city'));

SELECT * FROM users WHERE metadata->>'city' = 'Tokyo';
```

### インデックスのアンチパターン

```sql
-- ❌ 過剰なインデックス
CREATE INDEX idx1 ON users(email);
CREATE INDEX idx2 ON users(email, name);
CREATE INDEX idx3 ON users(email, name, created_at);
-- idx2とidx3だけで十分

-- ❌ 選択性の低いカラムへのインデックス
CREATE INDEX idx_users_gender ON users(gender);
-- gender が 2-3値しかない場合、効果が薄い

-- ❌ 更新頻度が高いテーブルへの過剰なインデックス
-- INSERT/UPDATE/DELETEのたびにインデックスも更新される
```

## 4. クエリ最適化パターン

### SELECT句の最適化

```sql
-- ❌ 悪い例: SELECT *
SELECT * FROM users WHERE id = 123;

-- ✅ 良い例: 必要なカラムのみ
SELECT id, name, email FROM users WHERE id = 123;
```

### WHERE句の最適化

```sql
-- ❌ 関数をカラムに適用
SELECT * FROM users WHERE YEAR(created_at) = 2025;

-- ✅ 範囲条件に変換
SELECT * FROM users
WHERE created_at >= '2025-01-01'
AND created_at < '2026-01-01';

-- ❌ OR条件が多い
SELECT * FROM products
WHERE category_id = 1 OR category_id = 2 OR category_id = 3;

-- ✅ INを使用
SELECT * FROM products WHERE category_id IN (1, 2, 3);

-- ❌ LIKE with leading wildcard
SELECT * FROM users WHERE name LIKE '%john%';

-- ✅ 前方一致なら高速
SELECT * FROM users WHERE name LIKE 'john%';
```

### JOIN の最適化

```sql
-- ❌ 不要な LEFT JOIN
SELECT u.name, o.id
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE o.status = 'completed';
-- WHERE句でoテーブルの条件があるのでINNER JOINで十分

-- ✅ INNER JOIN に変更
SELECT u.name, o.id
FROM users u
INNER JOIN orders o ON o.user_id = u.id
WHERE o.status = 'completed';

-- ❌ 暗黙的JOIN（クロスジョイン）
SELECT u.name, o.id
FROM users u, orders o
WHERE u.id = o.user_id;

-- ✅ 明示的JOIN
SELECT u.name, o.id
FROM users u
INNER JOIN orders o ON o.user_id = u.id;
```

### サブクエリの最適化

```sql
-- ❌ 相関サブクエリ
SELECT u.name,
  (SELECT COUNT(*) FROM orders WHERE user_id = u.id) as order_count
FROM users u;

-- ✅ JOINに書き換え
SELECT u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.name;

-- ❌ IN with subquery
SELECT * FROM products
WHERE category_id IN (
  SELECT id FROM categories WHERE name LIKE '%electronics%'
);

-- ✅ EXISTS を使用（大量データの場合）
SELECT p.* FROM products p
WHERE EXISTS (
  SELECT 1 FROM categories c
  WHERE c.id = p.category_id
  AND c.name LIKE '%electronics%'
);

-- ✅ または JOIN
SELECT p.* FROM products p
INNER JOIN categories c ON c.id = p.category_id
WHERE c.name LIKE '%electronics%';
```

### UNION vs UNION ALL

```sql
-- ❌ 重複排除が不要なのにUNION
SELECT id, name FROM users WHERE role = 'admin'
UNION
SELECT id, name FROM users WHERE role = 'moderator';

-- ✅ UNION ALL（重複チェックなし）
SELECT id, name FROM users WHERE role = 'admin'
UNION ALL
SELECT id, name FROM users WHERE role = 'moderator';

-- ✅ またはINで書き換え
SELECT id, name FROM users WHERE role IN ('admin', 'moderator');
```

### ページネーションの最適化

```sql
-- ❌ OFFSET を使った大きなページ番号
SELECT * FROM posts
ORDER BY created_at DESC
LIMIT 20 OFFSET 10000;
-- OFFSET値が大きいと全行スキャンが必要

-- ✅ Cursor-based pagination
SELECT * FROM posts
WHERE created_at < '2025-12-31 23:59:59'
ORDER BY created_at DESC
LIMIT 20;

-- ✅ Keyset pagination
SELECT * FROM posts
WHERE (created_at, id) < ('2025-12-31 23:59:59', 12345)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

## 5. N+1問題の解決

### N+1問題とは

```sql
-- 1回目: ユーザー一覧取得
SELECT * FROM users LIMIT 10;

-- 2回目以降: 各ユーザーの注文を取得（N回実行）
SELECT * FROM orders WHERE user_id = 1;
SELECT * FROM orders WHERE user_id = 2;
-- ... (10回繰り返し)
```

### 解決策1: JOINを使う

```sql
-- 1回のクエリで全て取得
SELECT
  u.id as user_id,
  u.name as user_name,
  o.id as order_id,
  o.total as order_total,
  o.status as order_status
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.id <= 10;
```

### 解決策2: IN句でまとめて取得

```sql
-- 1回目: ユーザー取得
SELECT * FROM users LIMIT 10;
-- user_ids = [1, 2, 3, ..., 10]

-- 2回目: 注文を一括取得
SELECT * FROM orders WHERE user_id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
```

### 解決策3: CTEを使う

```sql
WITH user_orders AS (
  SELECT
    user_id,
    json_agg(
      json_build_object(
        'id', id,
        'total', total,
        'status', status
      ) ORDER BY created_at DESC
    ) as orders
  FROM orders
  WHERE user_id IN (SELECT id FROM users LIMIT 10)
  GROUP BY user_id
)
SELECT
  u.id,
  u.name,
  u.email,
  COALESCE(uo.orders, '[]'::json) as orders
FROM users u
LEFT JOIN user_orders uo ON uo.user_id = u.id
LIMIT 10;
```

### ORM でのN+1問題対策

**Eloquent (Laravel)**

```php
// ❌ N+1問題
$users = User::limit(10)->get();
foreach ($users as $user) {
    echo $user->orders->count(); // N回クエリ実行
}

// ✅ Eager Loading
$users = User::with('orders')->limit(10)->get();
foreach ($users as $user) {
    echo $user->orders->count(); // クエリは2回のみ
}
```

**ActiveRecord (Rails)**

```ruby
# ❌ N+1問題
users = User.limit(10)
users.each do |user|
  puts user.orders.count
end

# ✅ includes
users = User.includes(:orders).limit(10)
users.each do |user|
  puts user.orders.count
end
```

**Prisma (Node.js)**

```typescript
// ❌ N+1問題
const users = await prisma.user.findMany({ take: 10 });
for (const user of users) {
  const orders = await prisma.order.findMany({
    where: { userId: user.id }
  });
}

// ✅ include
const users = await prisma.user.findMany({
  take: 10,
  include: {
    orders: true
  }
});
```

## 6. PostgreSQL固有の最適化

### VACUUM と ANALYZE

```sql
-- テーブルの統計情報を更新
ANALYZE users;

-- 不要な領域を回収
VACUUM users;

-- VACUUM と ANALYZE を同時実行
VACUUM ANALYZE users;

-- 自動VACUUMの設定確認
SHOW autovacuum;
```

### 部分インデックスの活用

```sql
-- 削除されていないユーザーのみをインデックス化
CREATE INDEX idx_active_users ON users(email)
WHERE deleted_at IS NULL;

-- 使用例
SELECT * FROM users
WHERE email = 'user@example.com'
AND deleted_at IS NULL;
```

### GINインデックス（全文検索）

```sql
-- テキスト検索用のGINインデックス
CREATE INDEX idx_posts_content_gin ON posts
USING gin(to_tsvector('english', content));

-- 全文検索
SELECT * FROM posts
WHERE to_tsvector('english', content) @@ to_tsquery('english', 'postgresql & performance');
```

### JSONBのインデックス

```sql
-- JSONBカラムへのGINインデックス
CREATE INDEX idx_user_metadata ON users USING gin(metadata);

-- JSONB検索
SELECT * FROM users WHERE metadata @> '{"city": "Tokyo"}';

-- 特定キーへのインデックス
CREATE INDEX idx_user_city ON users((metadata->>'city'));
SELECT * FROM users WHERE metadata->>'city' = 'Tokyo';
```

### パーティショニング

```sql
-- レンジパーティション（日付ベース）
CREATE TABLE orders (
  id BIGSERIAL,
  user_id INTEGER,
  total DECIMAL,
  created_at TIMESTAMP NOT NULL
) PARTITION BY RANGE (created_at);

-- パーティション作成
CREATE TABLE orders_2025_q1 PARTITION OF orders
FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');

CREATE TABLE orders_2025_q2 PARTITION OF orders
FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');

-- クエリは自動的に適切なパーティションのみをスキャン
SELECT * FROM orders WHERE created_at > '2025-05-01';
```

### CTEの最適化（PostgreSQL 12+）

```sql
-- ❌ Optimization Fence（最適化されない）
WITH recent_users AS (
  SELECT * FROM users WHERE created_at > NOW() - INTERVAL '7 days'
)
SELECT * FROM recent_users WHERE email LIKE '%@example.com';

-- ✅ NOT MATERIALIZED で最適化を許可
WITH recent_users AS NOT MATERIALIZED (
  SELECT * FROM users WHERE created_at > NOW() - INTERVAL '7 days'
)
SELECT * FROM recent_users WHERE email LIKE '%@example.com';
```

### 並列クエリの活用

```sql
-- 並列ワーカー数の設定
SET max_parallel_workers_per_gather = 4;

-- 大量データの集計を並列化
SELECT COUNT(*) FROM large_table;
```

## 7. MySQL固有の最適化

### クエリキャッシュ（MySQL 5.7以前）

```sql
-- クエリキャッシュの確認
SHOW VARIABLES LIKE 'query_cache%';

-- クエリキャッシュの有効化（MySQL 5.7以前）
SET GLOBAL query_cache_type = ON;
SET GLOBAL query_cache_size = 268435456; -- 256MB
```

### ストレージエンジンの選択

```sql
-- InnoDBの使用（推奨）
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255)
) ENGINE=InnoDB;

-- テーブルの最適化
OPTIMIZE TABLE users;
```

### カバリングインデックス

```sql
-- MySQLでのカバリングインデックス
CREATE INDEX idx_users_email_name ON users(email, name, created_at);

-- このクエリはインデックスのみで処理可能（Using index）
SELECT email, name, created_at FROM users WHERE email = 'user@example.com';

-- EXPLAIN で確認
EXPLAIN SELECT email, name, created_at FROM users WHERE email = 'user@example.com';
-- Extra: Using index
```

### 全文検索インデックス

```sql
-- FULLTEXT インデックス
CREATE FULLTEXT INDEX idx_posts_content ON posts(title, content);

-- 全文検索
SELECT * FROM posts
WHERE MATCH(title, content) AGAINST('mysql performance' IN NATURAL LANGUAGE MODE);

-- Boolean モード
SELECT * FROM posts
WHERE MATCH(title, content) AGAINST('+mysql +performance -bug' IN BOOLEAN MODE);
```

### JOIN の順序最適化

```sql
-- STRAIGHT_JOIN で結合順序を固定
SELECT STRAIGHT_JOIN u.name, o.total
FROM small_table u
JOIN large_table o ON o.user_id = u.id
WHERE u.status = 'active';
```

## 8. 実践的なチューニング手法

### ケーススタディ1: ダッシュボードの高速化

**Before: 15秒**

```sql
SELECT
  u.id,
  u.name,
  (SELECT COUNT(*) FROM orders WHERE user_id = u.id) as order_count,
  (SELECT SUM(total) FROM orders WHERE user_id = u.id) as total_spent,
  (SELECT MAX(created_at) FROM orders WHERE user_id = u.id) as last_order_date
FROM users u
WHERE u.created_at > NOW() - INTERVAL '30 days'
ORDER BY u.id
LIMIT 100;
```

**After: 0.3秒**

```sql
-- インデックス追加
CREATE INDEX idx_orders_user_id_created ON orders(user_id, created_at);
CREATE INDEX idx_users_created_at ON users(created_at);

-- クエリ書き換え
SELECT
  u.id,
  u.name,
  COUNT(o.id) as order_count,
  COALESCE(SUM(o.total), 0) as total_spent,
  MAX(o.created_at) as last_order_date
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.id, u.name
ORDER BY u.id
LIMIT 100;
```

### ケーススタディ2: 検索機能の高速化

**Before: 8秒**

```sql
SELECT * FROM products
WHERE
  LOWER(name) LIKE '%laptop%'
  OR LOWER(description) LIKE '%laptop%'
ORDER BY created_at DESC
LIMIT 20;
```

**After: 0.1秒**

```sql
-- PostgreSQL: GINインデックス + tsvector
ALTER TABLE products ADD COLUMN search_vector tsvector;

UPDATE products SET search_vector =
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''));

CREATE INDEX idx_products_search ON products USING gin(search_vector);

-- トリガーで自動更新
CREATE TRIGGER tsvector_update BEFORE INSERT OR UPDATE
ON products FOR EACH ROW EXECUTE FUNCTION
tsvector_update_trigger(search_vector, 'pg_catalog.english', name, description);

-- 検索クエリ
SELECT * FROM products
WHERE search_vector @@ to_tsquery('english', 'laptop')
ORDER BY created_at DESC
LIMIT 20;
```

### ケーススタディ3: ランキングの高速化

**Before: 20秒**

```sql
SELECT
  user_id,
  COUNT(*) as score,
  RANK() OVER (ORDER BY COUNT(*) DESC) as rank
FROM user_actions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY user_id
ORDER BY score DESC
LIMIT 100;
```

**After: 1秒**

```sql
-- マテリアライズドビューを使用（PostgreSQL）
CREATE MATERIALIZED VIEW user_rankings AS
SELECT
  user_id,
  COUNT(*) as score,
  RANK() OVER (ORDER BY COUNT(*) DESC) as rank
FROM user_actions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY user_id
ORDER BY score DESC;

-- インデックス追加
CREATE INDEX idx_user_rankings ON user_rankings(rank);

-- 定期的にリフレッシュ（cron等で実行）
REFRESH MATERIALIZED VIEW CONCURRENTLY user_rankings;

-- 高速クエリ
SELECT * FROM user_rankings LIMIT 100;
```

### 監視とチューニングのベストプラクティス

**1. スロークエリログの有効化**

PostgreSQL:
```sql
-- postgresql.conf
log_min_duration_statement = 1000  # 1秒以上のクエリをログ
```

MySQL:
```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;
```

**2. クエリ実行統計の確認**

PostgreSQL:
```sql
-- pg_stat_statements拡張を有効化
CREATE EXTENSION pg_stat_statements;

-- 遅いクエリTOP 10
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**3. インデックスの効果測定**

```sql
-- 未使用インデックスの検出（PostgreSQL）
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

**4. 定期的なメンテナンス**

```sql
-- PostgreSQL
VACUUM ANALYZE;
REINDEX TABLE large_table;

-- MySQL
OPTIMIZE TABLE large_table;
ANALYZE TABLE large_table;
```

### チューニングチェックリスト

**クエリレベル**
- [ ] SELECT * を使っていないか
- [ ] WHERE句に関数を使っていないか
- [ ] LIKE検索で前方一致を使えないか
- [ ] N+1問題は解決しているか
- [ ] 不要なJOINはないか
- [ ] サブクエリをJOINに書き換えられないか
- [ ] UNION ALLで代用できないか
- [ ] ページネーションは最適か

**インデックスレベル**
- [ ] WHERE句のカラムにインデックスはあるか
- [ ] JOIN条件のカラムにインデックスはあるか
- [ ] ORDER BY のカラムにインデックスはあるか
- [ ] 複合インデックスの順序は適切か
- [ ] カバリングインデックスを使えないか
- [ ] 部分インデックスを使えないか
- [ ] 未使用インデックスを削除したか

**データベース設定レベル**
- [ ] 適切なストレージエンジンを選択しているか
- [ ] 共有バッファサイズは適切か
- [ ] ワーカープロセス数は適切か
- [ ] VACUUMは定期実行されているか
- [ ] ANALYZEは定期実行されているか
- [ ] スロークエリログは有効か

## まとめ

SQLパフォーマンスチューニングは、以下の手順で進めましょう。

1. **測定**: EXPLAINとスロークエリログで問題を特定
2. **分析**: 実行計画を読み、ボトルネックを見つける
3. **最適化**: インデックス追加、クエリ書き換え
4. **検証**: 改善効果を測定
5. **監視**: 継続的にパフォーマンスを追跡

**重要なポイント**

- 早すぎる最適化は避ける（測定してから対処）
- インデックスは万能ではない（更新コストとのトレードオフ）
- クエリの書き方次第で10倍以上の差が出る
- データベースごとの特性を理解する
- 定期的なメンテナンスを忘れない

適切なチューニングにより、スロークエリを劇的に高速化できます。本記事のテクニックを実践し、快適なデータベース環境を構築してください。

## 参考リンク

- [PostgreSQL Performance Optimization](https://www.postgresql.org/docs/current/performance-tips.html)
- [MySQL Performance Schema](https://dev.mysql.com/doc/refman/8.0/en/performance-schema.html)
- [Use The Index, Luke!](https://use-the-index-luke.com/)
- [Explain Analyze Visualizer](https://explain.depesz.com/)

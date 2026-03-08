---
title: "PostgreSQLパフォーマンス最適化入門ガイド2026：インデックス設計からクエリ分析まで"
description: "PostgreSQLのパフォーマンスチューニングを実践的に解説。EXPLAIN ANALYZE・インデックス戦略・パーティショニング・コネクションプール・PgBouncer設定まで網羅。PostgreSQL・データベース・パフォーマンスに関する実践情報。"
pubDate: "2026-03-15"
tags: ["PostgreSQL", "データベース", "パフォーマンス", "SQL", "インデックス", "プログラミング"]
heroImage: '../../assets/thumbnails/postgresql-performance-guide-2026.jpg'
---
## PostgreSQLが遅くなる3大原因

```
1. インデックス不足（または過剰なインデックス）
2. N+1クエリ問題
3. コネクション数の枯渇
```

この3つを解消するだけで、多くのシステムは劇的に改善します。

---

## EXPLAIN ANALYZEで問題を特定する

```sql
-- 実行計画の確認（基本）
EXPLAIN SELECT * FROM orders WHERE user_id = 123;

-- 実際の実行時間込みの詳細分析
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM orders WHERE user_id = 123;
```

**読み方のポイント：**

| 表示 | 意味 |
|------|------|
| `Seq Scan` | テーブル全スキャン（遅い。インデックスを検討） |
| `Index Scan` | インデックス使用（良い） |
| `Index Only Scan` | インデックスのみで完結（最速） |
| `Hash Join` | 中大テーブルの結合（大抵効率的） |
| `rows=1000 actual rows=50000` | 統計情報が古い → ANALYZE実行 |

---

## インデックス戦略

```sql
-- 単一カラムインデックス
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- 複合インデックス（順番が重要！）
-- WHERE user_id = ? AND status = ? の場合
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- 部分インデックス（条件付き。サイズが小さくて高速）
CREATE INDEX idx_orders_pending ON orders(created_at)
WHERE status = 'pending';

-- 使われていないインデックスを探す
SELECT indexrelid::regclass AS index, idx_scan AS scans
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexrelid::regclass::text NOT LIKE '%_pkey';

-- SeqScanが多い大テーブルを探す
SELECT
  relname AS table,
  seq_scan,
  n_live_tup AS rows
FROM pg_stat_user_tables
WHERE seq_scan > 0 AND n_live_tup > 10000
ORDER BY seq_scan DESC;
```

---

## N+1クエリ問題を解消する

```sql
-- NG: ユーザー取得後に各ユーザーのオーダーを個別取得（N+1問題）
SELECT * FROM users LIMIT 100;
-- → 100回繰り返し
SELECT * FROM orders WHERE user_id = ?;

-- OK: JOINで1回にまとめる
SELECT
  u.id, u.name, u.email,
  COUNT(o.id) AS order_count,
  COALESCE(SUM(o.amount), 0) AS total_amount
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name, u.email
LIMIT 100;

-- OK: 高頻度クエリにはマテリアライズドビュー
CREATE MATERIALIZED VIEW user_stats AS
SELECT
  user_id,
  COUNT(*) AS order_count,
  SUM(amount) AS total_amount,
  MAX(created_at) AS last_order_at
FROM orders
GROUP BY user_id;

-- 定期更新（cronやトリガーで）
REFRESH MATERIALIZED VIEW CONCURRENTLY user_stats;
```

---

## パーティショニング：大テーブルの高速化

```sql
-- 月次パーティション（ログ・注文履歴等に有効）
CREATE TABLE orders_2026 (
  id BIGSERIAL,
  user_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE orders_2026_01 PARTITION OF orders_2026
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE orders_2026_02 PARTITION OF orders_2026
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- 各パーティションにインデックスを作成
CREATE INDEX ON orders_2026_01(user_id);
CREATE INDEX ON orders_2026_02(user_id);

-- Partition Pruningが自動適用される
-- WHERE created_at >= '2026-01-01' AND created_at < '2026-02-01'
-- → orders_2026_01 のみスキャン
```

---

## PgBouncer：コネクションプールで接続問題を解消

```ini
# pgbouncer.ini
[databases]
mydb = host=127.0.0.1 port=5432 dbname=mydb

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = md5
pool_mode = transaction  # トランザクションプールモード（推奨）
server_pool_size = 80    # PostgreSQL最大コネクションの80%程度
max_client_conn = 1000   # アプリ側の最大同時コネクション
server_lifetime = 3600
```

```
コネクション問題の典型：
  PostgreSQL max_connections: 100（デフォルト）
  Next.jsサーバー10台 × 各接続10 = 100コネクション → 枯渇

PgBouncer導入後：
  アプリ → PgBouncer（1000接続を受け付け）
  PgBouncer → PostgreSQL（実際は80接続のみ）
  スループットを落とさずに接続問題を解消
```

---

## まとめ：パフォーマンス改善の優先順位

```
1. EXPLAIN ANALYZEでボトルネックを特定（計測なき最適化は無意味）
2. SeqScanのある大テーブルにインデックスを追加
3. N+1クエリをJOINまたはIN句で解消
4. コネクション枯渇が起きているならPgBouncer導入
5. 100万行超の大テーブルはパーティショニング検討
6. VACUUM/ANALYZEを定期実行（統計情報を常に最新に）
```

「最適化は計測から始まる」。EXPLAIN ANALYZEを使いこなすことがPostgreSQL高速化の出発点です。

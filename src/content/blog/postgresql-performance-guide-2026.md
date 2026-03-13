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

## VACUUM/ANALYZE：統計情報とデッドタプルの管理

```sql
-- テーブルのデッドタプル（ゴミ行）を確認
SELECT
  relname AS table,
  n_live_tup AS live_rows,
  n_dead_tup AS dead_rows,
  ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 1) AS dead_pct,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;

-- 手動VACUUM（ロックなし・オンラインで実行可能）
VACUUM (VERBOSE) orders;

-- VACUUM FULL（テーブルロック発生・ディスク領域回収）
-- ⚠️ 本番では深夜メンテナンス時のみ
VACUUM FULL orders;

-- 統計情報の更新
ANALYZE orders;
-- 特定カラムの統計精度を上げる（デフォルト100 → 500）
ALTER TABLE orders ALTER COLUMN status SET STATISTICS 500;
ANALYZE orders(status);
```

### autovacuumのチューニング

```ini
# postgresql.conf（本番推奨設定）

# autovacuum基本設定
autovacuum = on
autovacuum_max_workers = 4          # デフォルト3→4に増加
autovacuum_naptime = 30s            # チェック間隔（デフォルト1min）

# VACUUM発動閾値
autovacuum_vacuum_threshold = 50       # 最低デッドタプル数
autovacuum_vacuum_scale_factor = 0.05  # デフォルト0.2→0.05に下げる
# → 100万行テーブルの場合: 50 + 1,000,000 * 0.05 = 50,050行変更でVACUUM

# ANALYZE発動閾値
autovacuum_analyze_threshold = 50
autovacuum_analyze_scale_factor = 0.02 # デフォルト0.1→0.02

# 速度制限（I/O負荷調整）
autovacuum_vacuum_cost_limit = 1000    # デフォルト200→1000（高速化）
```

---

## postgresql.conf：メモリとI/Oの最適化

```ini
# メモリ設定（サーバーRAM 16GBの場合）
shared_buffers = 4GB          # RAMの25%（デフォルト128MB）
effective_cache_size = 12GB    # RAMの75%（プランナのヒント用）
work_mem = 64MB               # ソート・ハッシュ用（接続数×work_mem < RAM）
maintenance_work_mem = 1GB     # VACUUM・CREATE INDEX用

# WAL設定（書き込み性能）
wal_buffers = 64MB
checkpoint_completion_target = 0.9
max_wal_size = 4GB
min_wal_size = 1GB

# プランナ設定
random_page_cost = 1.1        # SSD使用時（HDD: 4.0）
effective_io_concurrency = 200 # SSD使用時（HDD: 2）
```

---

## pg_stat_statements：スロークエリの発見

```sql
-- 拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 実行時間が長いクエリ TOP 20
SELECT
  LEFT(query, 100) AS query_preview,
  calls,
  ROUND(total_exec_time::numeric / 1000, 2) AS total_sec,
  ROUND(mean_exec_time::numeric, 2) AS mean_ms,
  rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

-- 呼び出し回数が多いクエリ（N+1検出）
SELECT
  LEFT(query, 100) AS query_preview,
  calls,
  ROUND(mean_exec_time::numeric, 2) AS mean_ms
FROM pg_stat_statements
WHERE calls > 1000
ORDER BY calls DESC
LIMIT 20;

-- 統計リセット（定期的に）
SELECT pg_stat_statements_reset();
```

---

## よくあるクエリの最適化パターン

### ページネーションの改善

```sql
-- NG: OFFSET が大きいほど遅い
SELECT * FROM products ORDER BY id LIMIT 20 OFFSET 100000;
-- → 100,020行スキャンして20行返す

-- OK: キーセット・ページネーション（Seek法）
SELECT * FROM products
WHERE id > 100000   -- 前ページの最後のIDを使用
ORDER BY id
LIMIT 20;
-- → インデックスで直接ジャンプ
```

### EXISTS vs IN vs JOIN

```sql
-- OK: 小さいサブクエリ → IN
SELECT * FROM users
WHERE id IN (SELECT user_id FROM orders WHERE amount > 10000);

-- BETTER: 大きいサブクエリ → EXISTS
SELECT * FROM users u
WHERE EXISTS (
  SELECT 1 FROM orders o
  WHERE o.user_id = u.id AND o.amount > 10000
);

-- BEST: 集計が必要 → JOIN
SELECT u.*, COUNT(o.id) as order_count
FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE o.amount > 10000
GROUP BY u.id;
```

### LIKE検索の高速化

```sql
-- NG: 前方一致以外はインデックスが効かない
SELECT * FROM products WHERE name LIKE '%検索語%';

-- OK: pg_trgmで部分一致もインデックス化
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_products_name_trgm ON products
  USING gin (name gin_trgm_ops);

-- これで部分一致も高速
SELECT * FROM products WHERE name LIKE '%検索語%';
-- GIN Index Scan を使用
```

---

## ORM（Prisma/Drizzle）でのパフォーマンス対策

```typescript
// Prisma: N+1を回避するinclude
// NG: 自動的にN+1が発生
const users = await prisma.user.findMany();
for (const user of users) {
  const orders = await prisma.order.findMany({
    where: { userId: user.id }
  });
}

// OK: includeでEager Loading
const users = await prisma.user.findMany({
  include: {
    orders: {
      where: { amount: { gt: 10000 } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    },
  },
});

// Drizzle: SQLに近い記法で最適化しやすい
import { eq, gt, sql } from 'drizzle-orm';

const result = await db
  .select({
    userId: users.id,
    name: users.name,
    orderCount: sql<number>`count(${orders.id})`,
    totalAmount: sql<number>`coalesce(sum(${orders.amount}), 0)`,
  })
  .from(users)
  .leftJoin(orders, eq(users.id, orders.userId))
  .where(gt(orders.amount, 10000))
  .groupBy(users.id, users.name)
  .limit(100);
```

---

## 監視クエリ集：本番運用に必須

```sql
-- 現在のアクティブ接続数
SELECT
  state,
  COUNT(*) as count
FROM pg_stat_activity
GROUP BY state;

-- ロック待ちのクエリを確認
SELECT
  blocked.pid AS blocked_pid,
  blocked.query AS blocked_query,
  blocking.pid AS blocking_pid,
  blocking.query AS blocking_query
FROM pg_stat_activity blocked
JOIN pg_locks bl ON blocked.pid = bl.pid
JOIN pg_locks bgl ON bl.locktype = bgl.locktype
  AND bl.relation = bgl.relation
  AND bl.pid != bgl.pid
JOIN pg_stat_activity blocking ON bgl.pid = blocking.pid
WHERE NOT bl.granted;

-- テーブルサイズランキング
SELECT
  relname AS table,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
  pg_size_pretty(pg_relation_size(relid)) AS data_size,
  pg_size_pretty(pg_indexes_size(relid)) AS index_size
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 20;

-- キャッシュヒット率（99%以上が目標）
SELECT
  sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) AS cache_hit_ratio
FROM pg_statio_user_tables;
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
7. pg_stat_statementsでスロークエリを定期確認
8. キャッシュヒット率99%以上を維持
```

「最適化は計測から始まる」。EXPLAIN ANALYZEを使いこなすことがPostgreSQL高速化の出発点です。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)

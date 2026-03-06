---
title: "PostgreSQL JSONB完全活用ガイド: リレーショナルとドキュメント指向の融合"
description: "PostgreSQLのJSONB型を使った実践的なデータ管理。JSONB演算子、クエリパターン、インデックス戦略、パフォーマンス最適化、マイグレーション、実践的なスキーマ設計を徹底解説。PostgreSQL・JSONB・SQLに関する実践情報。"
pubDate: "2025-02-05"
tags: ["PostgreSQL", "JSONB", "SQL", "データベース", "NoSQL"]
---
PostgreSQLの**JSONB型**は、リレーショナルデータベースでありながらドキュメント指向のデータを扱える強力な機能です。柔軟性とパフォーマンスを両立できます。

この記事では、JSONBの基本から高度なクエリパターン、インデックス戦略、実践的な設計パターンまでを解説します。

## JSONBとは

JSONBは、JSONデータをバイナリ形式で保存するPostgreSQLのデータ型です。JSON型とは異なり、パースされた状態で保存されるため高速です。

### JSON vs JSONB

```sql
-- JSON型: テキストとして保存
CREATE TABLE logs_json (
  id SERIAL PRIMARY KEY,
  data JSON
);

-- JSONB型: バイナリとして保存（推奨）
CREATE TABLE logs_jsonb (
  id SERIAL PRIMARY KEY,
  data JSONB
);
```

**JSONBを使うべき理由:**
- クエリが高速
- インデックスが作成できる
- 演算子が豊富
- 自動的にキーがソートされる
- 重複キーが自動的に削除される

## 基本操作

### データの挿入

```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  metadata JSONB
);

-- 基本的な挿入
INSERT INTO products (name, metadata) VALUES
  ('Laptop', '{"brand": "Dell", "specs": {"ram": "16GB", "storage": "512GB"}}'),
  ('Mouse', '{"brand": "Logitech", "wireless": true, "dpi": 1600}');

-- JSONBリテラル
INSERT INTO products (name, metadata) VALUES
  ('Keyboard', '{"brand": "Keychron", "layout": "JIS", "switches": ["red", "blue", "brown"]}'::JSONB);
```

### データの取得

```sql
-- 全体を取得
SELECT metadata FROM products WHERE id = 1;

-- 特定のキーを取得 (->)
SELECT metadata->'brand' FROM products;
-- 結果: "Dell" (JSONB型)

-- 特定のキーをテキストとして取得 (->>)
SELECT metadata->>'brand' FROM products;
-- 結果: Dell (TEXT型)

-- ネストしたキーへのアクセス
SELECT metadata->'specs'->'ram' FROM products;
SELECT metadata->'specs'->>'ram' FROM products;
-- 結果: 16GB (TEXT型)

-- パス指定 (#>)
SELECT metadata #> '{specs,ram}' FROM products;
SELECT metadata #>> '{specs,ram}' FROM products;
```

## JSONB演算子

### 基本演算子

```sql
-- -> : JSONBオブジェクトを返す
SELECT metadata -> 'brand' FROM products;

-- ->> : テキストを返す
SELECT metadata ->> 'brand' FROM products;

-- #> : パス指定でJSONBを返す
SELECT metadata #> '{specs,ram}' FROM products;

-- #>> : パス指定でテキストを返す
SELECT metadata #>> '{specs,storage}' FROM products;

-- @> : 包含チェック（左が右を含む）
SELECT * FROM products
WHERE metadata @> '{"brand": "Dell"}';

-- <@ : 被包含チェック（左が右に含まれる）
SELECT * FROM products
WHERE '{"brand": "Dell"}' <@ metadata;

-- ? : キーの存在チェック
SELECT * FROM products
WHERE metadata ? 'wireless';

-- ?| : いずれかのキーが存在
SELECT * FROM products
WHERE metadata ?| array['wireless', 'bluetooth'];

-- ?& : すべてのキーが存在
SELECT * FROM products
WHERE metadata ?& array['brand', 'layout'];

-- || : 連結・マージ
UPDATE products
SET metadata = metadata || '{"color": "black"}'
WHERE id = 1;

-- - : キー削除
UPDATE products
SET metadata = metadata - 'wireless'
WHERE id = 2;

-- #- : パス指定で削除
UPDATE products
SET metadata = metadata #- '{specs,ram}'
WHERE id = 1;
```

### 配列操作

```sql
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title TEXT,
  data JSONB
);

INSERT INTO posts (title, data) VALUES
  ('Post 1', '{"tags": ["tech", "programming", "web"], "views": 100}'),
  ('Post 2', '{"tags": ["design", "ui"], "views": 50}');

-- 配列要素の取得
SELECT data->'tags'->0 FROM posts;
-- 結果: "tech"

-- 配列の長さ
SELECT jsonb_array_length(data->'tags') FROM posts;

-- 配列要素の検索
SELECT * FROM posts
WHERE data->'tags' @> '["tech"]';

-- 配列要素のいずれかに一致
SELECT * FROM posts
WHERE data->'tags' ?| array['tech', 'design'];
```

## 高度なクエリパターン

### jsonb_to_recordset

```sql
-- JSONBの配列をレコードセットに変換
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INT,
  items JSONB
);

INSERT INTO orders (customer_id, items) VALUES
  (1, '[
    {"name": "Laptop", "price": 1200, "qty": 1},
    {"name": "Mouse", "price": 30, "qty": 2}
  ]');

-- 配列をテーブルとして扱う
SELECT
  o.id,
  i.*
FROM orders o
CROSS JOIN LATERAL jsonb_to_recordset(o.items) AS i(
  name TEXT,
  price NUMERIC,
  qty INT
);
```

### 集計関数

```sql
-- JSONBのキーを集計
SELECT
  metadata->>'brand' AS brand,
  COUNT(*) AS count
FROM products
GROUP BY metadata->>'brand';

-- JSONB内の値を集計
SELECT
  SUM((metadata->>'views')::INT) AS total_views
FROM posts;

-- jsonb_agg: 行をJSONB配列に集約
SELECT jsonb_agg(metadata->'brand') AS brands
FROM products;

-- jsonb_object_agg: キー・値ペアをJSONBオブジェクトに
SELECT jsonb_object_agg(
  metadata->>'brand',
  COUNT(*)
) AS brand_counts
FROM products
GROUP BY metadata->>'brand';
```

### 動的なキーの処理

```sql
-- すべてのキーを取得
SELECT DISTINCT jsonb_object_keys(metadata)
FROM products;

-- キーと値のペアを展開
SELECT id, key, value
FROM products,
LATERAL jsonb_each(metadata);

-- テキスト値として展開
SELECT id, key, value
FROM products,
LATERAL jsonb_each_text(metadata);
```

### 複雑な検索

```sql
-- 範囲検索
SELECT * FROM products
WHERE (metadata->>'price')::NUMERIC BETWEEN 100 AND 500;

-- 正規表現
SELECT * FROM products
WHERE metadata->>'brand' ~ 'Dell|HP';

-- 複合条件
SELECT * FROM products
WHERE metadata @> '{"brand": "Dell"}'
  AND (metadata->'specs'->>'ram')::TEXT LIKE '%16GB%';

-- サブクエリ
SELECT * FROM products
WHERE id IN (
  SELECT id FROM products
  WHERE metadata @> '{"wireless": true}'
);
```

## インデックス戦略

### GINインデックス（汎用転置インデックス）

```sql
-- デフォルトのGINインデックス
CREATE INDEX idx_products_metadata
ON products USING GIN (metadata);

-- 特定のパスにインデックス
CREATE INDEX idx_products_brand
ON products USING GIN ((metadata -> 'brand'));

-- 複数パスにインデックス
CREATE INDEX idx_products_specs
ON products USING GIN ((metadata -> 'specs'));
```

### jsonb_path_opsオプション

```sql
-- 包含演算子 (@>) に特化した高速インデックス
CREATE INDEX idx_products_metadata_ops
ON products USING GIN (metadata jsonb_path_ops);

-- メリット: インデックスサイズが小さい、包含検索が速い
-- デメリット: ? 演算子（キー存在チェック）が使えない
```

### 式インデックス

```sql
-- 特定のキーの値にインデックス
CREATE INDEX idx_products_brand_text
ON products ((metadata->>'brand'));

-- 計算式にインデックス
CREATE INDEX idx_products_price
ON products (((metadata->>'price')::NUMERIC));

-- パスにインデックス
CREATE INDEX idx_products_ram
ON products ((metadata #>> '{specs,ram}'));
```

### 部分インデックス

```sql
-- 条件付きインデックス
CREATE INDEX idx_products_expensive
ON products USING GIN (metadata)
WHERE (metadata->>'price')::NUMERIC > 1000;

-- NULLでない値のみ
CREATE INDEX idx_products_wireless
ON products (metadata)
WHERE metadata ? 'wireless';
```

## パフォーマンス最適化

### EXPLAIN ANALYZEで分析

```sql
EXPLAIN ANALYZE
SELECT * FROM products
WHERE metadata @> '{"brand": "Dell"}';

-- Index Scan が使われているか確認
-- Seq Scan の場合はインデックスが必要
```

### 統計情報の更新

```sql
-- 統計情報を更新
ANALYZE products;

-- 自動VACUUM設定
ALTER TABLE products
SET (autovacuum_vacuum_scale_factor = 0.1);
```

### クエリの最適化

```sql
-- ❌ 遅い: 関数を使うとインデックスが使えない
SELECT * FROM products
WHERE lower(metadata->>'brand') = 'dell';

-- ✅ 速い: 式インデックスを作成
CREATE INDEX idx_products_brand_lower
ON products (lower(metadata->>'brand'));

-- ❌ 遅い: ORでつなぐ
SELECT * FROM products
WHERE metadata->>'brand' = 'Dell'
   OR metadata->>'brand' = 'HP';

-- ✅ 速い: INを使う
SELECT * FROM products
WHERE metadata->>'brand' IN ('Dell', 'HP');

-- ✅ さらに速い: 包含演算子
SELECT * FROM products
WHERE metadata->'brand' ?| array['Dell', 'HP'];
```

## 実践的なスキーマ設計

### ハイブリッド設計

```sql
-- 重要なカラムはリレーショナル、柔軟な部分はJSONB
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- 検索頻度の高いフィールド
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  -- 柔軟なメタデータ
  profile JSONB,
  settings JSONB,
  preferences JSONB
);

CREATE INDEX idx_users_profile ON users USING GIN (profile);
CREATE INDEX idx_users_name ON users (name);
CREATE INDEX idx_users_status ON users (status);

INSERT INTO users (email, name, status, profile, settings) VALUES
  ('alice@example.com', 'Alice', 'active',
   '{"bio": "Software Engineer", "avatar": "https://...", "location": "Tokyo"}',
   '{"theme": "dark", "notifications": true}');
```

### イベントログ

```sql
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  data JSONB NOT NULL
);

CREATE INDEX idx_events_type ON events (event_type);
CREATE INDEX idx_events_user ON events (user_id);
CREATE INDEX idx_events_data ON events USING GIN (data);
CREATE INDEX idx_events_created ON events (created_at DESC);

-- パーティショニング（月ごと）
CREATE TABLE events_2025_02 PARTITION OF events
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

INSERT INTO events (event_type, user_id, data) VALUES
  ('page_view', 1, '{"page": "/products", "referrer": "google.com"}'),
  ('click', 1, '{"element": "buy_button", "product_id": 123}');
```

### マルチテナント

```sql
CREATE TABLE tenants (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  config JSONB NOT NULL
);

CREATE TABLE tenant_data (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  data JSONB NOT NULL,
  UNIQUE (tenant_id, entity_type, entity_id)
);

CREATE INDEX idx_tenant_data_lookup
ON tenant_data (tenant_id, entity_type, entity_id);

CREATE INDEX idx_tenant_data_jsonb
ON tenant_data USING GIN (data);

INSERT INTO tenant_data (tenant_id, entity_type, entity_id, data) VALUES
  (1, 'customer', 'c1', '{"name": "John", "plan": "pro", "mrr": 99}'),
  (1, 'invoice', 'inv1', '{"amount": 99, "status": "paid", "date": "2025-02-01"}');
```

## バリデーションとスキーマ

### JSONスキーマ（PostgreSQL 14+）

```sql
-- スキーマをチェック関数として定義
CREATE OR REPLACE FUNCTION validate_product_metadata(data JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    data ? 'brand' AND
    data ? 'price' AND
    (data->>'price')::NUMERIC > 0
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- チェック制約
ALTER TABLE products
ADD CONSTRAINT check_metadata
CHECK (validate_product_metadata(metadata));

-- 挿入時にバリデーション
INSERT INTO products (name, metadata) VALUES
  ('Invalid', '{"brand": "Test"}'); -- エラー: price がない
```

### トリガーでバリデーション

```sql
CREATE OR REPLACE FUNCTION validate_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.profile IS NOT NULL THEN
    -- 必須フィールドのチェック
    IF NOT (NEW.profile ? 'bio') THEN
      RAISE EXCEPTION 'bio is required in profile';
    END IF;

    -- 型チェック
    IF jsonb_typeof(NEW.profile->'bio') != 'string' THEN
      RAISE EXCEPTION 'bio must be a string';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_user_profile
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_profile();
```

## まとめ

PostgreSQLのJSONBは、リレーショナルデータベースの堅牢性とドキュメント指向の柔軟性を両立できる強力な機能です。

### 重要なポイント

1. **JSON vs JSONB**: 必ずJSONBを使う（パフォーマンス）
2. **演算子**: `@>`（包含）、`?`（キー存在）、`->>`（テキスト取得）
3. **インデックス**: GINインデックス、式インデックス、部分インデックス
4. **ハイブリッド設計**: 検索頻度の高いフィールドはカラムに、柔軟な部分はJSONBに
5. **パフォーマンス**: EXPLAIN ANALYZEで確認、適切なインデックス作成

### ユースケース

- **イベントログ**: 柔軟なスキーマが必要
- **ユーザープロファイル**: カスタムフィールド
- **マルチテナント**: テナントごとの異なるスキーマ
- **API統合**: 外部APIのレスポンスを保存
- **設定・メタデータ**: 頻繁に変わる構造

PostgreSQLのJSONBは、MongoDBなどのNoSQLに移行せずとも柔軟なスキーマを実現できます。

### 参考リンク

- [PostgreSQL JSON Functions](https://www.postgresql.org/docs/current/functions-json.html)
- [PostgreSQL JSONB Indexing](https://www.postgresql.org/docs/current/datatype-json.html#JSON-INDEXING)
- [JSONB Performance Tips](https://www.postgresql.org/docs/current/functions-json.html)

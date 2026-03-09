---
title: 'データベース設計入門 — 正規化からインデックスまで実践ガイド'
description: 'データベース設計の基礎から実践まで完全網羅。ER図作成、正規化（1NF-3NF）、インデックス設計、SQL最適化テクニックを実例付きで解説。初心者から中級者まで必読。'
pubDate: '2026-02-05'
tags: ['データベース', 'バックエンド']
heroImage: '../../assets/thumbnails/database-design-basics.jpg'
---
## なぜデータベース設計が重要なのか

データベース設計の良し悪しは、アプリケーションのパフォーマンス、保守性、スケーラビリティに直結します。後から設計を変更するのは極めて困難なため、最初の設計が勝負です。

この記事では、実務で即使えるデータベース設計の基礎から、パフォーマンスチューニングまでを実例付きで解説します。

### 対象読者

- Webアプリ開発初心者〜中級者
- SQL基礎は理解しているが設計は未経験の方
- 既存DBの改善方法を知りたいエンジニア

### 使用するDBMS

例はPostgreSQLベースですが、MySQL、SQLiteでも応用可能です。

## データベース設計の5ステップ

### ステップ1: 要件定義
### ステップ2: 概念設計（ER図作成）
### ステップ3: 論理設計（正規化）
### ステップ4: 物理設計（テーブル定義、インデックス）
### ステップ5: パフォーマンスチューニング

順番に見ていきましょう。

## ステップ1: 要件定義 — 何を保存するか明確にする

### 実例: ECサイトのデータベース

**保存すべきデータ**:
- ユーザー情報（ID、名前、メール、パスワード）
- 商品情報（ID、名前、価格、在庫数）
- 注文情報（注文ID、ユーザーID、注文日時、合計金額）
- 注文明細（注文ID、商品ID、数量、小計）

**ビジネスルール**:
- 1ユーザーは複数の注文が可能
- 1注文には複数の商品を含められる
- 在庫管理は商品マスタで一元管理

これをER図に落とし込みます。

## ステップ2: 概念設計 — ER図でエンティティと関連を可視化

### ER図とは

Entity-Relationship Diagram（実体関連図）。データの構造を視覚化する設計図。

### ER図の基本要素

- **エンティティ（実体）**: 四角形。Users、Productsなど
- **リレーション（関連）**: 線。1対多、多対多など
- **属性（カラム）**: 楕円。user_id、nameなど

### 実例: ECサイトのER図

```
[Users] 1 ----< * [Orders] * >---- * [Products]
   |                |
user_id          order_id
name             user_id (FK)
email            order_date
password         total_amount
created_at
                    |
                    v
              [OrderItems]
              order_id (FK)
              product_id (FK)
              quantity
              subtotal
```

**カーディナリティ（多重度）**:
- Users 1 : N Orders（1ユーザーは複数注文）
- Orders M : N Products（多対多、中間テーブル OrderItems で解決）

### ER図作成ツール

**無料ツール**:
- **dbdiagram.io**: ブラウザでサクッと作成、DDL自動生成
- **draw.io**: 汎用図作成ツール
- **DBeaver**: DB管理ツール、既存DBからER図自動生成

**有料ツール**:
- **MySQL Workbench**: MySQL公式（無料版もあり）
- **ERMaster**: Eclipse プラグイン

## ステップ3: 論理設計 — 正規化で冗長性を排除

### 正規化とは

データの重複を排除し、更新時の不整合を防ぐ技術。1NF → 2NF → 3NF → BCNF → 4NF と段階的に進める。

実務では **第3正規形（3NF）** までが基本。

### 非正規形（0NF）の悪い例

```sql
-- 注文テーブル（悪い設計）
CREATE TABLE orders_bad (
    order_id INT PRIMARY KEY,
    user_name VARCHAR(100),
    user_email VARCHAR(100),
    product_names TEXT,  -- "商品A, 商品B, 商品C"
    quantities TEXT,     -- "2, 1, 3"
    prices TEXT,         -- "1000, 500, 300"
    total_amount INT
);
```

**問題点**:
- 商品情報が文字列で連結されている（検索困難）
- ユーザー情報が重複（同じユーザーの注文ごとに名前・メール記録）
- 商品価格変更時に全注文データを更新必要

### 第1正規形（1NF）— 繰り返し項目の排除

**ルール**: 全ての属性が単一値（アトミック）であること。

```sql
-- 1NFに修正
CREATE TABLE orders_1nf (
    order_id INT,
    user_name VARCHAR(100),
    user_email VARCHAR(100),
    product_name VARCHAR(100),
    quantity INT,
    price INT,
    PRIMARY KEY (order_id, product_name)
);
```

**改善点**: 商品情報が行単位に分割され、検索可能に。

**残る問題**: user_name、user_email が注文ごとに重複。

### 第2正規形（2NF）— 部分関数従属の排除

**ルール**: 主キーの一部だけに従属する属性を別テーブルに分離。

```sql
-- Usersテーブルを分離
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE orders_2nf (
    order_id INT,
    user_id INT REFERENCES users(user_id),
    product_name VARCHAR(100),
    quantity INT,
    price INT,
    PRIMARY KEY (order_id, product_name)
);
```

**改善点**: ユーザー情報の重複解消。メール変更が1箇所で済む。

### 第3正規形（3NF）— 推移的関数従属の排除

**ルール**: 主キー以外の属性に従属する属性を分離。

```sql
-- Productsテーブルを分離
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    price INT,
    stock INT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    order_date TIMESTAMP DEFAULT NOW(),
    total_amount INT
);

CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(order_id),
    product_id INT REFERENCES products(product_id),
    quantity INT,
    subtotal INT  -- price * quantity のスナップショット
);
```

**重要なポイント**:
- `order_items.subtotal` は冗長だが、**過去の注文時点の価格**を保持するため必要
- 商品の現在価格が変わっても、過去の注文金額は変わらない

これが **正規化の例外** — ビジネスロジック上の必要性。

### 正規化のメリット・デメリット

**メリット**:
- データ重複排除 → ストレージ節約
- 更新時の不整合防止
- データの一貫性保証

**デメリット**:
- JOIN が増えてクエリが複雑化
- 読み取りパフォーマンスが低下する場合がある

→ 読み取り頻度が高い場合は **意図的な非正規化** も選択肢。

## ステップ4: 物理設計 — テーブル定義とインデックス

### データ型の選択

**整数型**:
```sql
SMALLINT  -- -32768 〜 32767（年齢、数量など）
INT       -- -2億 〜 2億（一般的なID）
BIGINT    -- 大規模データ（TwitterのツイートIDなど）
SERIAL    -- 自動採番（PostgreSQL）
```

**文字列型**:
```sql
VARCHAR(n)  -- 可変長（最大n文字）
TEXT        -- 無制限（長文コンテンツ）
CHAR(n)     -- 固定長（国コードなど）
```

**日時型**:
```sql
DATE        -- 日付のみ（誕生日など）
TIMESTAMP   -- 日時（created_at、updated_at）
TIMESTAMPTZ -- タイムゾーン付き（グローバルサービスで必須）
```

### 制約（Constraint）の設定

```sql
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    age INT CHECK (age >= 0 AND age <= 150),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'shipped', 'completed')),
    total_amount INT CHECK (total_amount >= 0),
    order_date TIMESTAMP DEFAULT NOW()
);
```

**重要な制約**:
- `PRIMARY KEY`: 一意性 + NOT NULL
- `UNIQUE`: 重複禁止（emailなど）
- `NOT NULL`: NULL禁止
- `CHECK`: 値の範囲制限
- `FOREIGN KEY`: 外部キー制約（参照整合性）
- `ON DELETE CASCADE`: 親レコード削除時に子も削除

### インデックス設計 — 検索速度を100倍にする

インデックスは本の索引と同じ。適切に設定すれば検索が劇的に高速化。

#### インデックスが必要な場所

1. **WHERE句で頻繁に使うカラム**
2. **JOIN条件のカラム**
3. **ORDER BY、GROUP BYで使うカラム**
4. **外部キー**

#### 基本的なインデックス作成

```sql
-- 単一カラムインデックス
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);

-- 複合インデックス（複数カラム）
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
CREATE INDEX idx_order_items_order_product ON order_items(order_id, product_id);
```

#### 複合インデックスの順序

**重要**: カラムの順序が性能に直結。

```sql
-- ケース1: WHERE user_id = 1 AND status = 'paid'
-- → idx_orders_user_status (user_id, status) が最適

-- ケース2: WHERE status = 'paid' AND user_id = 1
-- → 同じインデックスで対応可能

-- ケース3: WHERE status = 'paid'
-- → user_id が先頭のインデックスは使われない！
-- → 別途 idx_orders_status が必要
```

**原則**: **カーディナリティ（種類の多さ）が高いカラムを先頭に**。

```sql
-- 悪い例（statusは種類が少ない）
CREATE INDEX idx_bad ON orders(status, user_id);

-- 良い例（user_idは種類が多い）
CREATE INDEX idx_good ON orders(user_id, status);
```

#### インデックスの確認（PostgreSQL）

```sql
-- テーブルのインデックス一覧
\d orders

-- 実行計画でインデックス使用を確認
EXPLAIN ANALYZE
SELECT * FROM orders WHERE user_id = 1 AND status = 'paid';
```

**出力例**:
```
Index Scan using idx_orders_user_status on orders (cost=0.29..8.31 rows=1)
  Index Cond: ((user_id = 1) AND (status = 'paid'))
```

`Index Scan` なら成功。`Seq Scan`（全件スキャン）なら要改善。

#### インデックスの注意点

**デメリット**:
- 書き込み（INSERT/UPDATE/DELETE）が遅くなる
- ストレージ容量を消費

**原則**: 必要最低限のインデックスに留める。

**不要なインデックス例**:
```sql
-- 悪い例: 全カラムにインデックス
CREATE INDEX idx_users_name ON users(name);  -- 検索しないなら不要
CREATE INDEX idx_users_created_at ON users(created_at);  -- 範囲検索が稀なら不要
```

## ステップ5: SQL最適化 — パフォーマンスチューニング

### 遅いクエリの典型例と改善策

#### 問題1: N+1クエリ

```sql
-- 悪い例: 注文一覧取得後、ループでユーザー情報取得
SELECT * FROM orders;  -- 100件

-- アプリ側でループ
for order in orders:
    SELECT * FROM users WHERE user_id = order.user_id;  -- 100回実行
```

**合計101回のクエリ実行** → パフォーマンス最悪。

**改善: JOIN で1回に集約**:
```sql
SELECT
    o.order_id,
    o.total_amount,
    o.order_date,
    u.name AS user_name,
    u.email
FROM orders o
INNER JOIN users u ON o.user_id = u.user_id
LIMIT 100;
```

#### 問題2: SELECT *

```sql
-- 悪い例: 不要なカラムも取得
SELECT * FROM products WHERE category = 'Electronics';

-- 良い例: 必要なカラムのみ指定
SELECT product_id, name, price FROM products WHERE category = 'Electronics';
```

**理由**:
- ネットワーク転送量削減
- インデックスのみで処理完結する場合あり（Covering Index）

#### 問題3: WHERE句での関数使用

```sql
-- 悪い例: インデックスが使われない
SELECT * FROM users WHERE LOWER(email) = 'test@example.com';

-- 良い例: 関数を使わずに検索
SELECT * FROM users WHERE email = 'test@example.com';
```

**代替案**: 関数ベースインデックス（PostgreSQL）
```sql
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
```

#### 問題4: OR条件の乱用

```sql
-- 悪い例: インデックスが効きにくい
SELECT * FROM orders WHERE user_id = 1 OR status = 'paid';

-- 良い例: UNION で分割
SELECT * FROM orders WHERE user_id = 1
UNION
SELECT * FROM orders WHERE status = 'paid';
```

#### 問題5: LIKE '%keyword%'

```sql
-- 最悪: 前方一致でないLIKE
SELECT * FROM products WHERE name LIKE '%laptop%';  -- 全件スキャン

-- 改善: 前方一致なら高速
SELECT * FROM products WHERE name LIKE 'laptop%';  -- インデックス使用

-- 最善: 全文検索インデックス（PostgreSQL）
CREATE INDEX idx_products_name_gin ON products USING gin(to_tsvector('english', name));

SELECT * FROM products WHERE to_tsvector('english', name) @@ to_tsquery('laptop');
```

### EXPLAINで実行計画を分析

```sql
EXPLAIN ANALYZE
SELECT
    o.order_id,
    u.name,
    SUM(oi.subtotal) AS total
FROM orders o
JOIN users u ON o.user_id = u.user_id
JOIN order_items oi ON o.order_id = oi.order_id
WHERE o.order_date >= '2026-01-01'
GROUP BY o.order_id, u.name;
```

**見るべきポイント**:
- `Seq Scan` → インデックス不足
- `cost` の値（低いほど良い）
- `rows` の見積もり精度

## 実践例: ECサイトの完全なスキーマ

```sql
-- Usersテーブル
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- Productsテーブル
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price INT NOT NULL CHECK (price >= 0),
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_name ON products(name);

-- Ordersテーブル
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    total_amount INT NOT NULL CHECK (total_amount >= 0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'shipped', 'completed', 'cancelled')),
    order_date TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(order_date);

-- OrderItemsテーブル
CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(product_id),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price INT NOT NULL,  -- 注文時の価格（スナップショット）
    subtotal INT NOT NULL,
    UNIQUE(order_id, product_id)
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- トリガー: updated_at自動更新
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

## 非正規化の実践 — パフォーマンスとのトレードオフ

### ケース: 注文回数の表示

**要件**: ユーザー一覧画面で各ユーザーの注文回数を表示。

**正規化版（遅い）**:
```sql
SELECT
    u.user_id,
    u.name,
    COUNT(o.order_id) AS order_count
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id
GROUP BY u.user_id, u.name;
```

ユーザー数10万件、注文数100万件なら激遅。

**非正規化版（高速）**:
```sql
-- usersテーブルにorder_countカラム追加
ALTER TABLE users ADD COLUMN order_count INT DEFAULT 0;

-- トリガーで自動更新
CREATE OR REPLACE FUNCTION update_user_order_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE users SET order_count = order_count + 1 WHERE user_id = NEW.user_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE users SET order_count = order_count - 1 WHERE user_id = OLD.user_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_order_count
AFTER INSERT OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION update_user_order_count();

-- 高速な検索
SELECT user_id, name, order_count FROM users;
```

**トレードオフ**:
- 読み取り: 爆速（JOIN不要）
- 書き込み: やや遅い（トリガー実行）
- データ整合性: トリガーで保証

## データベース設計のアンチパターン

### 1. EAV（Entity-Attribute-Value）パターン

```sql
-- 悪い例
CREATE TABLE entity_attributes (
    entity_id INT,
    attribute_name VARCHAR(50),
    attribute_value TEXT
);

-- 同じ商品の属性がバラバラに
-- product_id=1, name=price, value=1000
-- product_id=1, name=stock, value=50
```

**問題**: 型安全性なし、クエリが複雑、パフォーマンス最悪。

**代替案**: JSONBカラム（PostgreSQL）または適切な正規化。

### 2. ENUM の VARCHAR 保存

```sql
-- 悪い例
status VARCHAR(20)  -- 'pending', 'paid', ... タイポの危険

-- 良い例
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'shipped', 'completed');
status order_status;
```

### 3. 複数値をカンマ区切りで保存

```sql
-- 悪い例
tag_ids VARCHAR(100)  -- '1,3,5,7'

-- 良い例: 中間テーブル
CREATE TABLE product_tags (
    product_id INT REFERENCES products(product_id),
    tag_id INT REFERENCES tags(tag_id),
    PRIMARY KEY (product_id, tag_id)
);
```

## まとめ: 良いDB設計の7原則

1. **正規化は3NFまで** — 冗長性を排除
2. **ビジネスロジック優先** — 必要なら非正規化も
3. **インデックスは戦略的に** — WHERE/JOIN/ORDER BY を重点的に
4. **制約で整合性保証** — CHECK, FOREIGN KEY, UNIQUE
5. **EXPLAIN で検証** — 推測でなく計測
6. **N+1クエリ撲滅** — JOIN で一括取得
7. **スケーラビリティを考慮** — 将来のデータ増加を想定

データベース設計は一度決めると変更が困難です。この記事の原則を守り、保守性とパフォーマンスを両立した設計を目指しましょう。

**関連記事**:
- AWS無料枠 完全ガイド2026 — RDS無料枠でDB運用
- Docker Compose 実践ガイド — PostgreSQL環境を5分で構築
- AIコーディングツール比較2026 — SQLクエリ生成にAI活用

**便利ツール**: [DevToolBox](/tools) でSQL整形・ER図作成が可能です。

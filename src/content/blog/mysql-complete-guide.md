---
title: 'MySQL完全ガイド2026：データベース設計から最適化まで'
description: 'MySQLの基本から応用まで完全解説。SQL基礎・テーブル設計・インデックス最適化・トランザクション・レプリケーション・パーティショニング・Node.js/Python連携・Docker設定まで実践的に学ぶ'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-5.jpg'
tags: ['MySQL', 'Database', 'Backend']
---

MySQLは世界で最も広く使われているオープンソースのリレーショナルデータベース管理システム（RDBMS）だ。WordPress・Laravel・Drupalなど主要なWebフレームワークのデフォルトデータベースとして採用されており、Facebook・Twitter・YouTube・Airbnbなど大規模サービスの根幹を支えてきた実績がある。

2026年現在、MySQLはバージョン8.0系が主流となり、ウィンドウ関数・共通テーブル式（CTE）・JSON関数・不可視インデックス・ロールベースアクセス制御など、かつてはPostgreSQLの専売特許だった機能も次々と取り込んでいる。本ガイドでは、MySQLの基礎から本番運用レベルの最適化まで、実際に動くSQLコード例とともに体系的に解説する。

---

## 1. MySQLとは・PostgreSQLとの比較

### MySQLの歴史と特徴

MySQLは1995年にMichael WideniusとDavid Axmarkによって開発され、当初はスウェーデンの企業MySQL ABが管理していた。2008年にSunMicrosystemsが買収し、さらに2010年にOracleがSunを買収したことでOracleの製品となった。

MySQLの主な特徴は以下の通りだ。

- **高速な読み取りパフォーマンス**: MyISAMエンジン（レガシー）はシーケンシャル読み取りに特化しており、InnoDB（現在のデフォルト）でも読み取り性能は優秀
- **幅広いエコシステム**: ほぼ全てのプログラミング言語から接続するドライバが存在する
- **LAMP/LEMPスタックの標準**: Linux・Apache/Nginx・MySQL・PHP/Pythonの組み合わせはWebアプリの定番構成
- **シンプルな管理**: PostgreSQLと比べて設定項目が少なく、初期導入のハードルが低い
- **活発なコミュニティ**: Oracle公式版のほか、MariaDB・Percona Serverなどコミュニティフォークも存在する

### MySQLとPostgreSQLの比較

MySQLとPostgreSQLはどちらを選ぶべきか、という議論は長年続いている。以下の比較表を参考にしてほしい。

| 比較項目 | MySQL 8.0 | PostgreSQL 16 |
|---------|-----------|---------------|
| ライセンス | GPL v2 / Commercial | PostgreSQL License（BSD系） |
| デフォルトエンジン | InnoDB | -- |
| ACID準拠 | 完全準拠（InnoDB） | 完全準拠 |
| JSON対応 | JSON型・関数 | JSONB（バイナリ最適化） |
| 全文検索 | FULLTEXT INDEX | tsvector・tsquery |
| ウィンドウ関数 | 8.0以降サポート | 早期からサポート |
| CTE（WITH句） | 8.0以降サポート | 早期からサポート |
| 部分インデックス | 非サポート | サポート |
| 関数インデックス | 8.0.13以降サポート | サポート |
| レプリケーション | シンプル | 論理レプリケーション |
| パーティショニング | RANGEなど4種 | 豊富な種類 |
| 拡張機能 | 限定的 | PostGIS・pg_vector等 |
| 読み取りパフォーマンス | 高速 | 中程度 |
| 書き込みパフォーマンス | 中程度 | 高速 |
| 学習コスト | 低い | 中程度 |

**MySQLが向いているケース:**

- WordPressやLaravelなど既存エコシステムとの連携
- 読み取り中心のWebアプリケーション
- シンプルな構成を優先したい場合
- 既存のMySQL運用チームがいる場合

**PostgreSQLが向いているケース:**

- 複雑なクエリや分析処理が多い場合
- GIS・全文検索・時系列データなど特殊なデータ型が必要な場合
- データの整合性を最優先にする場合（外部キー制約の厳格さなど）
- JSON主体のデータ構造（JSONBの性能優位）

どちらが優れているかという二項対立ではなく、プロジェクトの要件に合わせて選択することが重要だ。

---

## 2. インストールとセットアップ

### Dockerを使ったセットアップ（推奨）

開発環境にはDockerを使うのが最も手軽で再現性が高い。

```yaml
# docker-compose.yml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: mysql_dev
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: myapp_db
      MYSQL_USER: myapp_user
      MYSQL_PASSWORD: myapp_password
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./mysql/conf.d:/etc/mysql/conf.d
      - ./mysql/init:/docker-entrypoint-initdb.d
    command: --default-authentication-plugin=mysql_native_password

  phpmyadmin:
    image: phpmyadmin/phpmyadmin
    container_name: phpmyadmin
    restart: unless-stopped
    environment:
      PMA_HOST: mysql
      PMA_PORT: 3306
    ports:
      - "8080:80"
    depends_on:
      - mysql

volumes:
  mysql_data:
```

カスタム設定ファイルを作成して性能を調整する。

```ini
# mysql/conf.d/my.cnf
[mysqld]
# 文字コード設定
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# バッファプールサイズ（利用可能RAMの70-80%が目安）
innodb_buffer_pool_size = 1G
innodb_buffer_pool_instances = 4

# ログ設定
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 1

# バイナリログ（レプリケーション・PITRに必要）
log_bin = /var/log/mysql/mysql-bin.log
binlog_expire_logs_seconds = 604800
max_binlog_size = 100M

# InnoDB設定
innodb_file_per_table = 1
innodb_flush_log_at_trx_commit = 1
innodb_log_file_size = 256M

[client]
default-character-set = utf8mb4
```

コンテナを起動する。

```bash
# コンテナの起動
docker-compose up -d

# MySQLへの接続確認
docker exec -it mysql_dev mysql -u myapp_user -pmyapp_password myapp_db

# ログの確認
docker-compose logs mysql
```

### macOSへのネイティブインストール（Homebrew）

```bash
# Homebrewでインストール
brew install mysql

# MySQLサービスを起動
brew services start mysql

# 初期セキュリティ設定
mysql_secure_installation

# 接続確認
mysql -u root -p
```

### Ubuntuへのネイティブインストール

```bash
# パッケージリストを更新
sudo apt update

# MySQLサーバーをインストール
sudo apt install mysql-server -y

# セキュリティ設定の初期化
sudo mysql_secure_installation

# サービスの状態確認
sudo systemctl status mysql

# MySQLサービスを自動起動に設定
sudo systemctl enable mysql

# rootで接続（Ubuntu 20.04以降はsudoが必要な場合がある）
sudo mysql -u root
```

### 初期設定とユーザー作成

```sql
-- ユーザーの作成（ローカルからのみ接続可能）
CREATE USER 'appuser'@'localhost' IDENTIFIED BY 'secure_password_here';

-- 特定のデータベースへの全権限を付与
GRANT ALL PRIVILEGES ON myapp_db.* TO 'appuser'@'localhost';

-- 読み取り専用ユーザーの作成（レポート用など）
CREATE USER 'reader'@'%' IDENTIFIED BY 'reader_password';
GRANT SELECT ON myapp_db.* TO 'reader'@'%';

-- 権限を反映
FLUSH PRIVILEGES;

-- ユーザー一覧の確認
SELECT User, Host, plugin FROM mysql.user;

-- 特定ユーザーの権限確認
SHOW GRANTS FOR 'appuser'@'localhost';
```

---

## 3. データベース・テーブル操作（DDL）

### データベースの作成と選択

```sql
-- データベースの一覧表示
SHOW DATABASES;

-- データベースの作成（文字コード指定）
CREATE DATABASE IF NOT EXISTS ecommerce
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- データベースを選択
USE ecommerce;

-- 現在のデータベースを確認
SELECT DATABASE();

-- データベースの削除（本番では絶対に慎重に）
DROP DATABASE IF EXISTS test_old_db;
```

### テーブルの作成

ECサイトを例に、実際のテーブル設計を見ていこう。

```sql
-- ユーザーテーブル
CREATE TABLE users (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(255) NOT NULL UNIQUE,
  username    VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name   VARCHAR(200),
  phone       VARCHAR(20),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  email_verified_at DATETIME,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  DATETIME DEFAULT NULL,
  INDEX idx_email (email),
  INDEX idx_username (username),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- カテゴリテーブル（ツリー構造）
CREATE TABLE categories (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  parent_id INT UNSIGNED DEFAULT NULL,
  name      VARCHAR(100) NOT NULL,
  slug      VARCHAR(100) NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
  INDEX idx_parent_id (parent_id),
  INDEX idx_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 商品テーブル
CREATE TABLE products (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id INT UNSIGNED NOT NULL,
  name        VARCHAR(300) NOT NULL,
  slug        VARCHAR(300) NOT NULL UNIQUE,
  description TEXT,
  price       DECIMAL(10, 2) NOT NULL,
  cost_price  DECIMAL(10, 2),
  stock_quantity INT NOT NULL DEFAULT 0,
  sku         VARCHAR(100) UNIQUE,
  weight_kg   DECIMAL(5, 3),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  metadata    JSON,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  INDEX idx_category_id (category_id),
  INDEX idx_slug (slug),
  INDEX idx_price (price),
  INDEX idx_is_active_price (is_active, price),
  FULLTEXT INDEX ft_name_description (name, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 注文テーブル
CREATE TABLE orders (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT UNSIGNED NOT NULL,
  status        ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending',
  total_amount  DECIMAL(12, 2) NOT NULL,
  tax_amount    DECIMAL(12, 2) NOT NULL DEFAULT 0,
  shipping_fee  DECIMAL(10, 2) NOT NULL DEFAULT 0,
  shipping_address JSON NOT NULL,
  payment_method VARCHAR(50),
  payment_status ENUM('unpaid', 'paid', 'refunded') NOT NULL DEFAULT 'unpaid',
  notes         TEXT,
  shipped_at    DATETIME,
  delivered_at  DATETIME,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 注文明細テーブル
CREATE TABLE order_items (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id    BIGINT UNSIGNED NOT NULL,
  product_id  BIGINT UNSIGNED NOT NULL,
  quantity    INT NOT NULL,
  unit_price  DECIMAL(10, 2) NOT NULL,
  subtotal    DECIMAL(12, 2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_order_id (order_id),
  INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### テーブルの変更（ALTER TABLE）

```sql
-- カラムの追加
ALTER TABLE users
  ADD COLUMN avatar_url VARCHAR(500) AFTER full_name,
  ADD COLUMN last_login_at DATETIME AFTER email_verified_at;

-- カラムの型変更
ALTER TABLE products
  MODIFY COLUMN description MEDIUMTEXT;

-- カラムの名前変更
ALTER TABLE users
  RENAME COLUMN username TO handle;

-- カラムの削除
ALTER TABLE users
  DROP COLUMN phone;

-- インデックスの追加
ALTER TABLE orders
  ADD INDEX idx_payment_status (payment_status);

-- 外部キーの追加
ALTER TABLE products
  ADD COLUMN brand_id INT UNSIGNED,
  ADD FOREIGN KEY (brand_id) REFERENCES brands(id);

-- インデックスの削除
ALTER TABLE products
  DROP INDEX idx_price;

-- テーブル名の変更
RENAME TABLE old_table_name TO new_table_name;

-- テーブルの文字コード変換
ALTER TABLE products
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### テーブル情報の確認

```sql
-- テーブル一覧
SHOW TABLES;

-- テーブルの構造確認
DESCRIBE orders;
-- または
SHOW COLUMNS FROM orders;

-- テーブル作成DDLの確認
SHOW CREATE TABLE orders\G

-- テーブルサイズの確認
SELECT
  table_name,
  ROUND(data_length / 1024 / 1024, 2) AS data_mb,
  ROUND(index_length / 1024 / 1024, 2) AS index_mb,
  ROUND((data_length + index_length) / 1024 / 1024, 2) AS total_mb,
  table_rows
FROM information_schema.tables
WHERE table_schema = 'ecommerce'
ORDER BY (data_length + index_length) DESC;
```

---

## 4. データ操作（SELECT・INSERT・UPDATE・DELETE）

### INSERT文

```sql
-- 単一行の挿入
INSERT INTO users (email, username, password_hash, full_name)
VALUES ('alice@example.com', 'alice', '$2b$12$hashed...', 'Alice Johnson');

-- 複数行の一括挿入（パフォーマンスに優れる）
INSERT INTO products (category_id, name, slug, price, stock_quantity)
VALUES
  (1, 'ワイヤレスマウス Pro', 'wireless-mouse-pro', 4980, 100),
  (1, 'メカニカルキーボード', 'mechanical-keyboard', 12800, 50),
  (1, '27インチ4Kモニター', '27-4k-monitor', 45800, 20),
  (2, 'USBハブ 7ポート', 'usb-hub-7port', 2980, 200);

-- 重複キーの場合に更新する（UPSERT）
INSERT INTO products (sku, name, price, stock_quantity)
VALUES ('PROD-001', 'テスト商品', 1000, 10)
ON DUPLICATE KEY UPDATE
  price = VALUES(price),
  stock_quantity = stock_quantity + VALUES(stock_quantity),
  updated_at = CURRENT_TIMESTAMP;

-- 他のテーブルからデータをコピー
INSERT INTO products_archive (SELECT * FROM products WHERE is_active = FALSE);

-- INSERT IGNORE（重複エラーを無視）
INSERT IGNORE INTO users (email, username, password_hash)
VALUES ('duplicate@example.com', 'dupuser', 'hash');
```

### SELECT文

```sql
-- 基本的なSELECT
SELECT id, name, price, stock_quantity
FROM products
WHERE is_active = TRUE
  AND price BETWEEN 1000 AND 10000
ORDER BY price ASC
LIMIT 10 OFFSET 0;

-- ワイルドカード検索
SELECT * FROM products
WHERE name LIKE '%キーボード%'
   OR description LIKE '%メカニカル%';

-- IN句
SELECT * FROM orders
WHERE status IN ('confirmed', 'shipped')
  AND user_id IN (SELECT id FROM users WHERE is_active = TRUE);

-- NULL検索
SELECT * FROM users
WHERE email_verified_at IS NULL
  AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY);

-- 条件付きの集計（CASE式）
SELECT
  user_id,
  COUNT(*) AS total_orders,
  SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered_count,
  SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_count,
  SUM(total_amount) AS total_spent,
  AVG(total_amount) AS avg_order_value
FROM orders
GROUP BY user_id
HAVING total_orders >= 5
ORDER BY total_spent DESC
LIMIT 20;

-- DISTINCT（重複排除）
SELECT DISTINCT category_id FROM products WHERE is_active = TRUE;

-- サブクエリ
SELECT p.*
FROM products p
WHERE p.price > (
  SELECT AVG(price) FROM products WHERE category_id = p.category_id
);

-- 全文検索（FULLTEXTインデックスが必要）
SELECT id, name, price,
  MATCH(name, description) AGAINST ('メカニカル キーボード' IN NATURAL LANGUAGE MODE) AS relevance
FROM products
WHERE MATCH(name, description) AGAINST ('メカニカル キーボード' IN NATURAL LANGUAGE MODE)
ORDER BY relevance DESC;
```

### UPDATE文

```sql
-- 単純な更新
UPDATE products
SET price = price * 1.1
WHERE category_id = 3 AND is_active = TRUE;

-- 複数カラムの更新
UPDATE users
SET
  full_name = 'Alice Smith',
  updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- JOINを使ったUPDATE
UPDATE order_items oi
JOIN products p ON oi.product_id = p.id
SET oi.unit_price = p.price
WHERE oi.order_id = 12345;

-- サブクエリを使ったUPDATE
UPDATE products
SET stock_quantity = stock_quantity - 1
WHERE id IN (
  SELECT product_id FROM order_items WHERE order_id = 9999
);

-- 条件付きUPDATE（在庫切れの場合は非アクティブに）
UPDATE products
SET is_active = CASE
  WHEN stock_quantity = 0 THEN FALSE
  ELSE TRUE
END
WHERE category_id = 1;
```

### DELETE文

```sql
-- 条件付き削除
DELETE FROM sessions
WHERE expires_at < NOW();

-- JOINを使った削除
DELETE oi
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'cancelled'
  AND o.created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- 論理削除（ソフトデリート）パターン
UPDATE users
SET deleted_at = CURRENT_TIMESTAMP
WHERE id = 42;

-- 論理削除済みデータを除外する検索
SELECT * FROM users WHERE deleted_at IS NULL;

-- TRUNCATE（全データ削除、WALログなし・高速だが取り消し不可）
TRUNCATE TABLE session_logs;
```

### ウィンドウ関数（MySQL 8.0以降）

```sql
-- ROW_NUMBER: 行番号の付与
SELECT
  id,
  user_id,
  total_amount,
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
FROM orders;

-- 各ユーザーの最新注文を取得
SELECT * FROM (
  SELECT
    id,
    user_id,
    status,
    total_amount,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
  FROM orders
) ranked
WHERE rn = 1;

-- RANK / DENSE_RANK: 同順位処理
SELECT
  name,
  price,
  category_id,
  RANK() OVER (PARTITION BY category_id ORDER BY price DESC) AS price_rank,
  DENSE_RANK() OVER (PARTITION BY category_id ORDER BY price DESC) AS dense_rank
FROM products
WHERE is_active = TRUE;

-- LAG / LEAD: 前後行の値を参照
SELECT
  DATE(created_at) AS order_date,
  COUNT(*) AS daily_orders,
  LAG(COUNT(*), 1) OVER (ORDER BY DATE(created_at)) AS prev_day_orders,
  COUNT(*) - LAG(COUNT(*), 1) OVER (ORDER BY DATE(created_at)) AS day_over_day_change
FROM orders
GROUP BY DATE(created_at)
ORDER BY order_date;

-- 累積合計（Running Total）
SELECT
  id,
  created_at,
  total_amount,
  SUM(total_amount) OVER (ORDER BY created_at ROWS UNBOUNDED PRECEDING) AS cumulative_total
FROM orders
WHERE user_id = 1
ORDER BY created_at;

-- 移動平均（7日間）
SELECT
  DATE(created_at) AS order_date,
  SUM(total_amount) AS daily_revenue,
  AVG(SUM(total_amount)) OVER (
    ORDER BY DATE(created_at)
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) AS moving_avg_7d
FROM orders
GROUP BY DATE(created_at)
ORDER BY order_date;
```

### 共通テーブル式（CTE・WITH句）

```sql
-- 基本的なCTE
WITH active_products AS (
  SELECT id, name, price, category_id
  FROM products
  WHERE is_active = TRUE AND stock_quantity > 0
),
category_stats AS (
  SELECT
    category_id,
    COUNT(*) AS product_count,
    AVG(price) AS avg_price,
    MIN(price) AS min_price,
    MAX(price) AS max_price
  FROM active_products
  GROUP BY category_id
)
SELECT
  c.name AS category_name,
  cs.product_count,
  cs.avg_price,
  cs.min_price,
  cs.max_price
FROM category_stats cs
JOIN categories c ON cs.category_id = c.id
ORDER BY cs.product_count DESC;

-- 再帰CTE（階層データの取得）
WITH RECURSIVE category_tree AS (
  -- ベースケース（ルートカテゴリ）
  SELECT
    id,
    name,
    parent_id,
    0 AS depth,
    CAST(name AS CHAR(1000)) AS path
  FROM categories
  WHERE parent_id IS NULL

  UNION ALL

  -- 再帰ケース（子カテゴリ）
  SELECT
    c.id,
    c.name,
    c.parent_id,
    ct.depth + 1,
    CONCAT(ct.path, ' > ', c.name)
  FROM categories c
  JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT id, depth, path
FROM category_tree
ORDER BY path;
```

---

## 5. 結合（JOIN）と集計

### JOINの種類

```sql
-- INNER JOIN（両テーブルに存在する行のみ）
SELECT
  o.id AS order_id,
  u.email,
  u.full_name,
  o.total_amount,
  o.status
FROM orders o
INNER JOIN users u ON o.user_id = u.id
WHERE o.created_at >= '2026-01-01';

-- LEFT JOIN（左テーブルの全行 + 右テーブルの一致行）
SELECT
  u.id,
  u.email,
  COUNT(o.id) AS order_count,
  COALESCE(SUM(o.total_amount), 0) AS total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id AND o.status != 'cancelled'
GROUP BY u.id, u.email;

-- 注文がないユーザーを探す（LEFT JOIN + IS NULL）
SELECT u.id, u.email, u.created_at
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.id IS NULL
  AND u.created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- 3テーブルのJOIN
SELECT
  o.id AS order_id,
  u.email,
  p.name AS product_name,
  oi.quantity,
  oi.unit_price,
  oi.subtotal
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE o.status = 'delivered'
  AND o.created_at >= '2026-01-01'
ORDER BY o.id, p.name;

-- CROSS JOIN（デカルト積、組み合わせ表の生成など）
SELECT
  c1.name AS size,
  c2.name AS color
FROM options c1
CROSS JOIN options c2
WHERE c1.type = 'size' AND c2.type = 'color';

-- SELF JOIN（同一テーブルの結合）
SELECT
  child.id,
  child.name AS category_name,
  parent.name AS parent_category
FROM categories child
JOIN categories parent ON child.parent_id = parent.id;
```

### GROUP BYと集計関数

```sql
-- 基本的な集計
SELECT
  category_id,
  COUNT(*) AS product_count,
  SUM(stock_quantity) AS total_stock,
  AVG(price) AS avg_price,
  MIN(price) AS min_price,
  MAX(price) AS max_price
FROM products
WHERE is_active = TRUE
GROUP BY category_id;

-- HAVING（集計後のフィルタリング）
SELECT
  user_id,
  COUNT(*) AS order_count,
  SUM(total_amount) AS total_revenue
FROM orders
WHERE status = 'delivered'
  AND created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
GROUP BY user_id
HAVING total_revenue >= 100000
ORDER BY total_revenue DESC;

-- GROUP_CONCAT（グループ内の値を結合）
SELECT
  o.id AS order_id,
  GROUP_CONCAT(p.name ORDER BY p.name SEPARATOR ', ') AS products_purchased
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
GROUP BY o.id;

-- WITH ROLLUP（小計・総計の自動追加）
SELECT
  COALESCE(category_id, 'TOTAL') AS category,
  COUNT(*) AS product_count,
  SUM(price) AS total_price
FROM products
WHERE is_active = TRUE
GROUP BY category_id WITH ROLLUP;

-- 日次・月次・年次の集計
SELECT
  DATE_FORMAT(created_at, '%Y-%m') AS month,
  COUNT(*) AS order_count,
  SUM(total_amount) AS monthly_revenue,
  COUNT(DISTINCT user_id) AS unique_customers
FROM orders
WHERE status = 'delivered'
GROUP BY DATE_FORMAT(created_at, '%Y-%m')
ORDER BY month;
```

---

## 6. インデックス設計と最適化

インデックスはMySQLのパフォーマンスを左右する最重要要素だ。適切なインデックスがなければ、テーブルが大きくなるにつれてクエリは指数関数的に遅くなる。

### インデックスの種類

```sql
-- プライマリキー（クラスタードインデックス）
CREATE TABLE example (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  -- 他のカラム
);

-- ユニークインデックス
CREATE UNIQUE INDEX idx_email ON users(email);
ALTER TABLE users ADD UNIQUE INDEX idx_username (username);

-- 通常のインデックス（非ユニーク）
CREATE INDEX idx_category_price ON products(category_id, price);

-- 複合インデックス（マルチカラム）
ALTER TABLE orders ADD INDEX idx_user_status_date (user_id, status, created_at);

-- プレフィックスインデックス（長いVARCHARの先頭N文字のみインデックス化）
ALTER TABLE products ADD INDEX idx_slug_prefix (slug(50));

-- 全文検索インデックス
ALTER TABLE products ADD FULLTEXT INDEX ft_search (name, description);

-- 不可視インデックス（MySQL 8.0以降: インデックスをオプティマイザから隠す）
ALTER TABLE products ALTER INDEX idx_price INVISIBLE;
ALTER TABLE products ALTER INDEX idx_price VISIBLE;

-- インデックスの削除
DROP INDEX idx_price ON products;
ALTER TABLE products DROP INDEX idx_price;
```

### 複合インデックスの設計原則

```sql
-- 悪い例: 各カラムに個別インデックス
ALTER TABLE orders ADD INDEX idx_user_id (user_id);
ALTER TABLE orders ADD INDEX idx_status (status);
ALTER TABLE orders ADD INDEX idx_created_at (created_at);

-- 良い例: 複合インデックス（カーディナリティと使用頻度を考慮）
-- user_id=?  AND status=? AND created_at >= ? のようなクエリに最適
ALTER TABLE orders ADD INDEX idx_user_status_created (user_id, status, created_at);

-- インデックスの選択性を確認
SELECT
  COUNT(DISTINCT user_id) / COUNT(*) AS user_id_selectivity,
  COUNT(DISTINCT status) / COUNT(*) AS status_selectivity,
  COUNT(DISTINCT DATE(created_at)) / COUNT(*) AS date_selectivity
FROM orders;

-- インデックス使用状況の確認
SELECT
  table_name,
  index_name,
  seq_in_index,
  column_name,
  cardinality
FROM information_schema.statistics
WHERE table_schema = 'ecommerce'
ORDER BY table_name, index_name, seq_in_index;
```

### インデックスが効かないパターン

```sql
-- NG: 関数でラップするとインデックスが使われない
SELECT * FROM users WHERE YEAR(created_at) = 2026;

-- OK: 範囲条件に書き換える
SELECT * FROM users
WHERE created_at >= '2026-01-01' AND created_at < '2027-01-01';

-- NG: LIKE前方一致でないとインデックスが使われない
SELECT * FROM products WHERE name LIKE '%キーボード%';

-- OK（前方一致ならインデックス使用可能）
SELECT * FROM products WHERE name LIKE 'メカニカル%';

-- NG: 暗黙の型変換
SELECT * FROM users WHERE id = '123';  -- idがINTなのにVARCHARで比較

-- OK
SELECT * FROM users WHERE id = 123;

-- NG: OR条件はインデックスが効きにくい
SELECT * FROM orders WHERE user_id = 1 OR status = 'pending';

-- OK: UNIONに書き換える
SELECT * FROM orders WHERE user_id = 1
UNION
SELECT * FROM orders WHERE status = 'pending' AND user_id != 1;

-- NG: 否定条件（!= や NOT IN）はインデックスが使われにくい
SELECT * FROM products WHERE category_id != 1;

-- NG: NULLとの比較（IS NULL / IS NOT NULL）は状況によりインデックス不使用
SELECT * FROM orders WHERE shipped_at IS NOT NULL;
```

### カバリングインデックス

```sql
-- クエリで使用する全カラムをインデックスに含める（テーブルアクセスが不要になる）
-- このクエリに対して:
SELECT user_id, status, total_amount FROM orders WHERE user_id = 1 AND status = 'delivered';

-- カバリングインデックスを作成（user_id, statusに加えてtotal_amountも含める）
ALTER TABLE orders ADD INDEX idx_covering (user_id, status, total_amount);

-- EXPLAINでExtra列に "Using index" が表示されればカバリングインデックスが機能している
EXPLAIN SELECT user_id, status, total_amount FROM orders WHERE user_id = 1;
```

---

## 7. EXPLAINによるクエリ分析

EXPLAINはMySQLのクエリ実行計画を確認するための最重要コマンドだ。パフォーマンス問題を診断する際は必ずEXPLAINから始める。

### EXPLAINの基本

```sql
-- 基本的なEXPLAIN
EXPLAIN SELECT * FROM orders WHERE user_id = 1 AND status = 'pending';

-- より詳細な情報（MySQL 8.0以降推奨）
EXPLAIN FORMAT=JSON SELECT * FROM orders WHERE user_id = 1\G

-- 実際に実行してコストを計測（ANALYZE）
EXPLAIN ANALYZE SELECT o.*, u.email
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 'delivered'
  AND o.created_at >= '2026-01-01';
```

### EXPLAIN出力の読み方

```
EXPLAIN出力の各カラムの意味:

id          : クエリのステップ番号（大きいほど先に実行）
select_type : SIMPLE / PRIMARY / SUBQUERY / DERIVED / UNION など
table       : アクセスするテーブル名
partitions  : アクセスするパーティション
type        : アクセスタイプ（重要！）
possible_keys: 使用可能なインデックス
key         : 実際に使用されたインデックス
key_len     : 使用されたインデックスの長さ（バイト）
ref         : インデックスとの比較に使われたカラム/定数
rows        : 調査される推定行数（小さいほど良い）
filtered    : WHERE条件でフィルタリングされる推定割合
Extra       : 追加情報（重要！）
```

### typeの種類（良い順）

```
system   : テーブルに1行しかない場合
const    : プライマリキーまたはユニークキーで1行取得
eq_ref   : JOINでプライマリキー/ユニークキーを使用
ref      : 非ユニークインデックスを使用
range    : インデックスの範囲スキャン（BETWEEN, >, < など）
index    : インデックス全体をスキャン（テーブルスキャンよりはマシ）
ALL      : フルテーブルスキャン（最悪、要改善）
```

### Extraの重要な値

```
Using index          : カバリングインデックス使用（良い）
Using where          : WHERE条件でフィルタリング中
Using filesort       : ソートにインデックスを使えない（要注意）
Using temporary      : 一時テーブルを使用（GROUP BYなど、重い）
Using index condition: インデックスコンディションプッシュダウン（良い）
```

### 実践的なクエリチューニング例

```sql
-- 問題のあるクエリ
EXPLAIN SELECT p.name, c.name AS category, o_count
FROM products p
JOIN categories c ON p.category_id = c.id
LEFT JOIN (
  SELECT product_id, COUNT(*) AS o_count
  FROM order_items
  GROUP BY product_id
) oi ON p.id = oi.product_id
WHERE p.is_active = TRUE
ORDER BY o_count DESC
LIMIT 10;

-- チューニング後（サブクエリをCTEに変換し可読性と性能を改善）
WITH product_order_counts AS (
  SELECT product_id, COUNT(*) AS order_count
  FROM order_items
  GROUP BY product_id
)
SELECT
  p.id,
  p.name,
  c.name AS category_name,
  COALESCE(poc.order_count, 0) AS order_count
FROM products p
JOIN categories c ON p.category_id = c.id
LEFT JOIN product_order_counts poc ON p.id = poc.product_id
WHERE p.is_active = TRUE
ORDER BY order_count DESC
LIMIT 10;

-- スロークエリログの確認
SHOW VARIABLES LIKE 'slow_query_log%';
SHOW VARIABLES LIKE 'long_query_time';

-- 動的にスロークエリログを有効化
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
```

---

## 8. トランザクションとロック

### トランザクションの基本

```sql
-- トランザクションの開始
START TRANSACTION;
-- または
BEGIN;

-- 注文処理の例（在庫確認→注文作成→在庫減算）
START TRANSACTION;

-- 在庫確認と確保（SELECT FOR UPDATE でロック）
SELECT stock_quantity
FROM products
WHERE id = 100
FOR UPDATE;

-- 在庫が十分あることを確認してから処理を続行
-- （アプリケーション側で在庫チェック）

-- 注文の作成
INSERT INTO orders (user_id, status, total_amount, tax_amount, shipping_address)
VALUES (1, 'pending', 5500, 500, '{"zip": "100-0001", "address": "東京都千代田区..."}');

SET @order_id = LAST_INSERT_ID();

-- 注文明細の追加
INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
VALUES (@order_id, 100, 1, 5000, 5000);

-- 在庫の減算
UPDATE products
SET stock_quantity = stock_quantity - 1
WHERE id = 100 AND stock_quantity >= 1;

-- 影響行数が0なら在庫切れ → ロールバック
-- ROW_COUNT() で確認

-- 全ての処理が成功したらコミット
COMMIT;

-- エラーが発生した場合はロールバック
ROLLBACK;
```

### 分離レベル

```sql
-- 現在の分離レベルを確認
SELECT @@transaction_isolation;
SHOW VARIABLES LIKE 'transaction_isolation';

-- 分離レベルの変更
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- 各分離レベルの特徴:
-- READ UNCOMMITTED : ダーティリード発生。使用非推奨
-- READ COMMITTED   : ダーティリードなし。非再現読み取りあり
-- REPEATABLE READ  : MySQLのデフォルト。非再現読み取りなし
-- SERIALIZABLE     : 完全な分離。デッドロックリスク高

-- グローバル設定の変更（要再起動 or SET GLOBAL）
SET GLOBAL transaction_isolation = 'READ-COMMITTED';
```

### ロックの種類と操作

```sql
-- 行ロック（SELECT FOR UPDATE）
SELECT * FROM products WHERE id = 1 FOR UPDATE;

-- 共有ロック（読み取りロック）
SELECT * FROM products WHERE id = 1 FOR SHARE;
-- または（旧記法）
SELECT * FROM products WHERE id = 1 LOCK IN SHARE MODE;

-- デッドロックの例と対策
-- スレッド1:
START TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;  -- id=1をロック
UPDATE accounts SET balance = balance + 100 WHERE id = 2;  -- id=2を待機

-- スレッド2（同時実行）:
START TRANSACTION;
UPDATE accounts SET balance = balance - 50 WHERE id = 2;   -- id=2をロック
UPDATE accounts SET balance = balance + 50 WHERE id = 1;   -- id=1を待機 → デッドロック

-- デッドロック対策: 常に同じ順序でロック
-- 両スレッドともid=1→id=2の順でUPDATE

-- デッドロックの確認
SHOW ENGINE INNODB STATUS\G

-- ロック待ちの確認（MySQL 8.0）
SELECT * FROM performance_schema.data_locks;
SELECT * FROM performance_schema.data_lock_waits;

-- テーブルロック
LOCK TABLES products READ;
-- 処理...
UNLOCK TABLES;

LOCK TABLES products WRITE;
-- 処理...
UNLOCK TABLES;
```

### セーブポイント

```sql
-- セーブポイントを使った部分ロールバック
START TRANSACTION;

INSERT INTO orders (user_id, total_amount) VALUES (1, 1000);
SET @order_id = LAST_INSERT_ID();

SAVEPOINT after_order_insert;

INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
VALUES (@order_id, 1, 1, 1000, 1000);

-- ここでエラーが発生した場合、セーブポイントまで戻る
ROLLBACK TO SAVEPOINT after_order_insert;

-- 別の処理を試みる
-- ...

COMMIT;
```

---

## 9. ストアドプロシージャ・トリガー・ビュー

### ストアドプロシージャ

```sql
-- 注文処理のストアドプロシージャ
DELIMITER $$

CREATE PROCEDURE process_order(
  IN  p_user_id     BIGINT,
  IN  p_product_id  BIGINT,
  IN  p_quantity    INT,
  OUT p_order_id    BIGINT,
  OUT p_error_msg   VARCHAR(255)
)
BEGIN
  DECLARE v_price DECIMAL(10,2);
  DECLARE v_stock INT;
  DECLARE v_total DECIMAL(12,2);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    SET p_order_id = -1;
    GET DIAGNOSTICS CONDITION 1
      p_error_msg = MESSAGE_TEXT;
  END;

  -- 商品情報の取得
  SELECT price, stock_quantity
  INTO v_price, v_stock
  FROM products
  WHERE id = p_product_id AND is_active = TRUE
  FOR UPDATE;

  -- 在庫チェック
  IF v_stock < p_quantity THEN
    SET p_error_msg = '在庫が不足しています';
    SET p_order_id = -1;
    LEAVE;
  END IF;

  SET v_total = v_price * p_quantity;

  START TRANSACTION;

  -- 注文の作成
  INSERT INTO orders (user_id, status, total_amount, tax_amount, shipping_address)
  VALUES (p_user_id, 'pending', v_total, v_total * 0.1, '{}');

  SET p_order_id = LAST_INSERT_ID();

  -- 注文明細の追加
  INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
  VALUES (p_order_id, p_product_id, p_quantity, v_price, v_total);

  -- 在庫の減算
  UPDATE products
  SET stock_quantity = stock_quantity - p_quantity
  WHERE id = p_product_id;

  COMMIT;

  SET p_error_msg = NULL;

END$$

DELIMITER ;

-- ストアドプロシージャの実行
CALL process_order(1, 100, 2, @order_id, @error);
SELECT @order_id, @error;

-- ストアドプロシージャの一覧
SHOW PROCEDURE STATUS WHERE Db = 'ecommerce'\G

-- ストアドプロシージャの削除
DROP PROCEDURE IF EXISTS process_order;
```

### トリガー

```sql
-- 在庫変更の履歴を記録するトリガー
CREATE TABLE stock_history (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  old_qty    INT,
  new_qty    INT,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  changed_by VARCHAR(100)
);

DELIMITER $$

CREATE TRIGGER trg_stock_change
AFTER UPDATE ON products
FOR EACH ROW
BEGIN
  IF OLD.stock_quantity != NEW.stock_quantity THEN
    INSERT INTO stock_history (product_id, old_qty, new_qty, changed_by)
    VALUES (NEW.id, OLD.stock_quantity, NEW.stock_quantity, CURRENT_USER());
  END IF;
END$$

DELIMITER ;

-- 注文ステータス変更時にメタデータを更新するトリガー
DELIMITER $$

CREATE TRIGGER trg_order_status_change
BEFORE UPDATE ON orders
FOR EACH ROW
BEGIN
  IF NEW.status = 'shipped' AND OLD.status != 'shipped' THEN
    SET NEW.shipped_at = CURRENT_TIMESTAMP;
  END IF;

  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    SET NEW.delivered_at = CURRENT_TIMESTAMP;
  END IF;
END$$

DELIMITER ;

-- トリガーの一覧
SHOW TRIGGERS FROM ecommerce\G

-- トリガーの削除
DROP TRIGGER IF EXISTS trg_stock_change;
```

### ビュー

```sql
-- 注文サマリービュー
CREATE OR REPLACE VIEW v_order_summary AS
SELECT
  o.id AS order_id,
  o.user_id,
  u.email,
  u.full_name,
  o.status,
  o.total_amount,
  o.created_at,
  COUNT(oi.id) AS item_count,
  GROUP_CONCAT(p.name ORDER BY p.name SEPARATOR ', ') AS product_names
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
GROUP BY o.id, o.user_id, u.email, u.full_name, o.status, o.total_amount, o.created_at;

-- ビューの使用
SELECT * FROM v_order_summary WHERE status = 'pending' LIMIT 10;

-- カテゴリ別商品統計ビュー
CREATE OR REPLACE VIEW v_category_stats AS
SELECT
  c.id AS category_id,
  c.name AS category_name,
  COUNT(p.id) AS total_products,
  COUNT(CASE WHEN p.is_active = TRUE THEN 1 END) AS active_products,
  AVG(p.price) AS avg_price,
  SUM(p.stock_quantity) AS total_stock
FROM categories c
LEFT JOIN products p ON c.id = p.category_id
GROUP BY c.id, c.name;

-- ビューの一覧
SHOW FULL TABLES WHERE Table_type = 'VIEW';

-- ビューの削除
DROP VIEW IF EXISTS v_order_summary;
```

---

## 10. レプリケーション（Master-Slave構成）

MySQLのレプリケーションは、Primaryサーバーのデータ変更をReplicaサーバーにリアルタイムで伝達する仕組みだ。読み取り負荷の分散や高可用性の実現に使われる。

### レプリケーションの仕組み

```
Primary（書き込み）
    │
    ├── バイナリログ（binlog）に変更を記録
    │
    └── Replica（読み取り）
            │
            ├── I/Oスレッド: PrimaryのbinlogをリレーログにコピーPrimary
            └── SQLスレッド: リレーログを再生してデータを更新
```

### Primaryサーバーの設定

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf (Primary)
[mysqld]
server-id = 1                          # 一意のサーバーID
log_bin = /var/log/mysql/mysql-bin.log  # バイナリログを有効化
binlog_format = ROW                    # 推奨: ROW形式
binlog_expire_logs_seconds = 604800    # 7日間保持
max_binlog_size = 100M
```

```sql
-- Primaryでレプリケーション用ユーザーを作成
CREATE USER 'replicator'@'%' IDENTIFIED BY 'strong_replica_password';
GRANT REPLICATION SLAVE ON *.* TO 'replicator'@'%';
FLUSH PRIVILEGES;

-- バイナリログの現在位置を確認
SHOW MASTER STATUS;
-- 出力例:
-- File: mysql-bin.000001
-- Position: 154
-- Binlog_Do_DB:
-- Binlog_Ignore_DB:

-- 既存データをReplicaに転送する場合
FLUSH TABLES WITH READ LOCK;
-- この状態でmysqldumpを実行
-- mysqldump --all-databases --master-data=2 > dump.sql
UNLOCK TABLES;
```

### Replicaサーバーの設定

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf (Replica)
[mysqld]
server-id = 2                          # Primaryと異なるID
relay_log = /var/log/mysql/relay-bin   # リレーログ
read_only = 1                          # 読み取り専用モード
super_read_only = 1                    # SUPER権限ユーザーも読み取り専用
```

```sql
-- Replicaでレプリケーションを設定
CHANGE MASTER TO
  MASTER_HOST = '192.168.1.100',
  MASTER_USER = 'replicator',
  MASTER_PASSWORD = 'strong_replica_password',
  MASTER_LOG_FILE = 'mysql-bin.000001',
  MASTER_LOG_POS = 154;

-- レプリケーションの開始
START SLAVE;

-- レプリケーション状態の確認
SHOW SLAVE STATUS\G
-- 重要な確認ポイント:
-- Slave_IO_Running: Yes
-- Slave_SQL_Running: Yes
-- Seconds_Behind_Master: 0 (遅延秒数)

-- レプリケーションの停止
STOP SLAVE;

-- レプリケーションのリセット
RESET SLAVE ALL;
```

### GTIDベースのレプリケーション（推奨）

```ini
# Primary と Replica 両方の設定
[mysqld]
gtid_mode = ON
enforce_gtid_consistency = ON
```

```sql
-- GTIDを使ったReplica設定（ログファイル位置指定不要）
CHANGE MASTER TO
  MASTER_HOST = '192.168.1.100',
  MASTER_USER = 'replicator',
  MASTER_PASSWORD = 'strong_replica_password',
  MASTER_AUTO_POSITION = 1;  -- GTIDを使って自動的に位置を特定

START SLAVE;

-- GTID状態の確認
SHOW MASTER STATUS;
SELECT @@global.gtid_executed;
```

### レプリケーション遅延の監視

```sql
-- 遅延の確認
SHOW SLAVE STATUS\G  -- Seconds_Behind_Master を確認

-- Performance Schemaを使った詳細な確認
SELECT
  CHANNEL_NAME,
  SERVICE_STATE,
  LAST_ERROR_MESSAGE,
  LAST_HEARTBEAT_TIMESTAMP,
  LAST_RECEIVED_TRANSACTION
FROM performance_schema.replication_connection_status;

SELECT
  CHANNEL_NAME,
  SERVICE_STATE,
  LAST_ERROR_MESSAGE,
  APPLYING_TRANSACTION,
  LAST_APPLIED_TRANSACTION
FROM performance_schema.replication_applier_status_by_worker;
```

---

## 11. パーティショニング

パーティショニングは、大きなテーブルを論理的に複数の部分に分割する技術だ。パーティションプルーニング（必要なパーティションのみアクセス）により、クエリパフォーマンスが大幅に向上する。

### RANGEパーティション（最も一般的）

```sql
-- 年単位のRANGEパーティション
CREATE TABLE orders_partitioned (
  id          BIGINT UNSIGNED AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  status      VARCHAR(20) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, created_at),  -- パーティションキーはPKに含める必要がある
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB
PARTITION BY RANGE (YEAR(created_at)) (
  PARTITION p2023 VALUES LESS THAN (2024),
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION p2025 VALUES LESS THAN (2026),
  PARTITION p2026 VALUES LESS THAN (2027),
  PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- パーティション情報の確認
SELECT
  PARTITION_NAME,
  TABLE_ROWS,
  DATA_LENGTH,
  INDEX_LENGTH
FROM information_schema.partitions
WHERE TABLE_SCHEMA = 'ecommerce'
  AND TABLE_NAME = 'orders_partitioned';

-- 特定パーティションへのクエリ
SELECT * FROM orders_partitioned PARTITION (p2026);

-- パーティションの追加
ALTER TABLE orders_partitioned
  REORGANIZE PARTITION p_future INTO (
    PARTITION p2027 VALUES LESS THAN (2028),
    PARTITION p_future VALUES LESS THAN MAXVALUE
  );

-- 古いパーティションのアーカイブと削除（超高速）
ALTER TABLE orders_partitioned DROP PARTITION p2023;
```

### LISTパーティション

```sql
-- ステータス別のLISTパーティション
CREATE TABLE orders_by_status (
  id          BIGINT UNSIGNED AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  status_code TINYINT NOT NULL,  -- 1:pending, 2:confirmed, 3:shipped, 4:delivered, 5:cancelled
  total_amount DECIMAL(12, 2) NOT NULL,
  created_at  DATETIME NOT NULL,
  PRIMARY KEY (id, status_code)
) ENGINE=InnoDB
PARTITION BY LIST (status_code) (
  PARTITION p_active   VALUES IN (1, 2, 3),
  PARTITION p_complete VALUES IN (4),
  PARTITION p_inactive VALUES IN (5)
);
```

### HASHパーティション

```sql
-- ユーザーIDのHASHパーティション（均等分散）
CREATE TABLE user_activities (
  id      BIGINT UNSIGNED AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  action  VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id, user_id)
) ENGINE=InnoDB
PARTITION BY HASH(user_id)
PARTITIONS 8;
```

### パーティションのパフォーマンス検証

```sql
-- パーティションプルーニングの確認
EXPLAIN SELECT * FROM orders_partitioned
WHERE created_at >= '2026-01-01' AND created_at < '2027-01-01';
-- partitions列にp2026のみ表示されればプルーニング成功

-- パーティションなしテーブルとの比較
-- パーティションあり: p2026のみアクセス → 高速
-- パーティションなし: 全データをスキャン → 低速
```

---

## 12. Node.js連携

### mysql2パッケージの使用

```bash
npm install mysql2
```

```javascript
// db.js - データベース接続の設定
const mysql = require('mysql2/promise');

// コネクションプールの作成
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'myapp_user',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'ecommerce',
  waitForConnections: true,
  connectionLimit: 10,       // プール内の最大コネクション数
  queueLimit: 0,             // 待機キューの上限（0=無制限）
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4',
  timezone: '+09:00',        // JSTを設定
});

module.exports = pool;
```

```javascript
// models/product.js - 商品モデル
const pool = require('../db');

class ProductModel {
  // 商品の一覧取得（ページネーション付き）
  async findAll({ page = 1, limit = 20, categoryId, minPrice, maxPrice, search }) {
    const offset = (page - 1) * limit;
    const conditions = ['p.is_active = TRUE'];
    const params = [];

    if (categoryId) {
      conditions.push('p.category_id = ?');
      params.push(categoryId);
    }

    if (minPrice !== undefined) {
      conditions.push('p.price >= ?');
      params.push(minPrice);
    }

    if (maxPrice !== undefined) {
      conditions.push('p.price <= ?');
      params.push(maxPrice);
    }

    if (search) {
      conditions.push('(p.name LIKE ? OR p.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.join(' AND ');

    const [rows] = await pool.execute(
      `SELECT
        p.id, p.name, p.slug, p.price, p.stock_quantity,
        c.name AS category_name
       FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM products p WHERE ${whereClause}`,
      params
    );

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // IDで商品取得
  async findById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM products WHERE id = ? AND is_active = TRUE',
      [id]
    );
    return rows[0] || null;
  }

  // 商品の作成
  async create({ categoryId, name, slug, price, stockQuantity, description }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        `INSERT INTO products (category_id, name, slug, price, stock_quantity, description)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [categoryId, name, slug, price, stockQuantity, description]
      );

      await connection.commit();
      return result.insertId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // 在庫の更新（楽観的ロック）
  async updateStock(productId, quantity) {
    const [result] = await pool.execute(
      `UPDATE products
       SET stock_quantity = stock_quantity - ?
       WHERE id = ? AND stock_quantity >= ?`,
      [quantity, productId, quantity]
    );

    if (result.affectedRows === 0) {
      throw new Error('在庫が不足しているか、商品が存在しません');
    }

    return result.affectedRows;
  }
}

module.exports = new ProductModel();
```

```javascript
// routes/orders.js - 注文ルート
const express = require('express');
const router = express.Router();
const pool = require('../db');

// 注文作成（トランザクション使用）
router.post('/', async (req, res) => {
  const { userId, items, shippingAddress } = req.body;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 各商品の在庫確認と合計金額計算
    let totalAmount = 0;
    const processedItems = [];

    for (const item of items) {
      const [products] = await connection.execute(
        'SELECT id, price, stock_quantity FROM products WHERE id = ? AND is_active = TRUE FOR UPDATE',
        [item.productId]
      );

      if (products.length === 0) {
        throw new Error(`商品ID ${item.productId} が見つかりません`);
      }

      const product = products[0];
      if (product.stock_quantity < item.quantity) {
        throw new Error(`商品ID ${item.productId} の在庫が不足しています`);
      }

      const subtotal = product.price * item.quantity;
      totalAmount += subtotal;
      processedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.price,
        subtotal,
      });
    }

    const taxAmount = Math.round(totalAmount * 0.1);

    // 注文の作成
    const [orderResult] = await connection.execute(
      `INSERT INTO orders (user_id, status, total_amount, tax_amount, shipping_address)
       VALUES (?, 'pending', ?, ?, ?)`,
      [userId, totalAmount + taxAmount, taxAmount, JSON.stringify(shippingAddress)]
    );

    const orderId = orderResult.insertId;

    // 注文明細の追加と在庫更新
    for (const item of processedItems) {
      await connection.execute(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.productId, item.quantity, item.unitPrice, item.subtotal]
      );

      await connection.execute(
        'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
        [item.quantity, item.productId]
      );
    }

    await connection.commit();

    res.json({ success: true, orderId, totalAmount: totalAmount + taxAmount });
  } catch (error) {
    await connection.rollback();
    res.status(400).json({ success: false, error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
```

### PrismaでのMySQL連携

```bash
npm install prisma @prisma/client
npx prisma init --datasource-provider mysql
```

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id              Int       @id @default(autoincrement()) @db.UnsignedBigInt
  email           String    @unique @db.VarChar(255)
  username        String    @unique @db.VarChar(100)
  passwordHash    String    @map("password_hash") @db.VarChar(255)
  fullName        String?   @map("full_name") @db.VarChar(200)
  isActive        Boolean   @default(true) @map("is_active")
  emailVerifiedAt DateTime? @map("email_verified_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  orders          Order[]

  @@map("users")
}

model Product {
  id            Int         @id @default(autoincrement()) @db.UnsignedBigInt
  categoryId    Int         @map("category_id") @db.UnsignedInt
  name          String      @db.VarChar(300)
  slug          String      @unique @db.VarChar(300)
  description   String?     @db.Text
  price         Decimal     @db.Decimal(10, 2)
  stockQuantity Int         @default(0) @map("stock_quantity")
  isActive      Boolean     @default(true) @map("is_active")
  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt @map("updated_at")
  category      Category    @relation(fields: [categoryId], references: [id])
  orderItems    OrderItem[]

  @@index([categoryId])
  @@map("products")
}

model Order {
  id              Int         @id @default(autoincrement()) @db.UnsignedBigInt
  userId          Int         @map("user_id") @db.UnsignedBigInt
  status          OrderStatus @default(pending)
  totalAmount     Decimal     @map("total_amount") @db.Decimal(12, 2)
  taxAmount       Decimal     @default(0) @map("tax_amount") @db.Decimal(12, 2)
  shippingAddress Json        @map("shipping_address")
  createdAt       DateTime    @default(now()) @map("created_at")
  updatedAt       DateTime    @updatedAt @map("updated_at")
  user            User        @relation(fields: [userId], references: [id])
  items           OrderItem[]

  @@index([userId])
  @@index([status])
  @@map("orders")
}

model OrderItem {
  id        Int     @id @default(autoincrement()) @db.UnsignedBigInt
  orderId   Int     @map("order_id") @db.UnsignedBigInt
  productId Int     @map("product_id") @db.UnsignedBigInt
  quantity  Int
  unitPrice Decimal @map("unit_price") @db.Decimal(10, 2)
  subtotal  Decimal @db.Decimal(12, 2)
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product   Product @relation(fields: [productId], references: [id])

  @@index([orderId])
  @@map("order_items")
}

model Category {
  id       Int        @id @default(autoincrement()) @db.UnsignedInt
  name     String     @db.VarChar(100)
  slug     String     @unique @db.VarChar(100)
  products Product[]

  @@map("categories")
}

enum OrderStatus {
  pending
  confirmed
  shipped
  delivered
  cancelled
  refunded
}
```

```javascript
// prisma/client.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

module.exports = prisma;

// 使用例: service/product.service.js
const prisma = require('../prisma/client');

async function getProductsWithOrders() {
  return prisma.product.findMany({
    where: { isActive: true },
    include: {
      category: true,
      orderItems: {
        include: {
          order: {
            include: { user: { select: { email: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
}

async function createOrderWithItems(userId, items, shippingAddress) {
  return prisma.$transaction(async (tx) => {
    let totalAmount = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });

      if (!product || !product.isActive) {
        throw new Error(`商品 ${item.productId} が見つかりません`);
      }

      if (product.stockQuantity < item.quantity) {
        throw new Error(`商品 ${product.name} の在庫が不足しています`);
      }

      const subtotal = Number(product.price) * item.quantity;
      totalAmount += subtotal;
      processedItems.push({ product, quantity: item.quantity, subtotal });
    }

    const order = await tx.order.create({
      data: {
        userId,
        totalAmount,
        taxAmount: Math.round(totalAmount * 0.1),
        shippingAddress,
        items: {
          create: processedItems.map(({ product, quantity, subtotal }) => ({
            productId: product.id,
            quantity,
            unitPrice: product.price,
            subtotal,
          })),
        },
      },
      include: { items: true },
    });

    // 在庫一括更新
    await Promise.all(
      processedItems.map(({ product, quantity }) =>
        tx.product.update({
          where: { id: product.id },
          data: { stockQuantity: { decrement: quantity } },
        })
      )
    );

    return order;
  });
}
```

```bash
# マイグレーションの実行
npx prisma migrate dev --name init
npx prisma migrate deploy  # 本番環境

# Prisma Studioで管理UI起動
npx prisma studio
```

---

## 13. Python連携

### PyMySQL（シンプルな接続）

```bash
pip install PyMySQL
```

```python
# db.py - データベース接続
import pymysql
import os
from contextlib import contextmanager

DB_CONFIG = {
    'host': os.environ.get('DB_HOST', 'localhost'),
    'port': int(os.environ.get('DB_PORT', 3306)),
    'user': os.environ.get('DB_USER', 'myapp_user'),
    'password': os.environ.get('DB_PASSWORD', ''),
    'database': os.environ.get('DB_NAME', 'ecommerce'),
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor,
    'autocommit': False,
}

def get_connection():
    """データベース接続を取得する"""
    return pymysql.connect(**DB_CONFIG)

@contextmanager
def get_cursor():
    """コンテキストマネージャーでカーソルを管理する"""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        yield cursor
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()
```

```python
# models/product.py - 商品モデル
from typing import Optional, List, Dict, Any
from decimal import Decimal
from db import get_cursor, get_connection

class ProductRepository:
    def find_all(
        self,
        page: int = 1,
        limit: int = 20,
        category_id: Optional[int] = None,
        min_price: Optional[Decimal] = None,
        max_price: Optional[Decimal] = None,
        search: Optional[str] = None,
    ) -> Dict[str, Any]:
        """商品一覧を取得する（ページネーション付き）"""
        offset = (page - 1) * limit
        conditions = ['p.is_active = TRUE']
        params = []

        if category_id is not None:
            conditions.append('p.category_id = %s')
            params.append(category_id)

        if min_price is not None:
            conditions.append('p.price >= %s')
            params.append(min_price)

        if max_price is not None:
            conditions.append('p.price <= %s')
            params.append(max_price)

        if search:
            conditions.append('(p.name LIKE %s OR p.description LIKE %s)')
            params.extend([f'%{search}%', f'%{search}%'])

        where_clause = ' AND '.join(conditions)

        with get_cursor() as cursor:
            # データ取得
            cursor.execute(
                f"""SELECT
                    p.id, p.name, p.slug, p.price, p.stock_quantity,
                    c.name AS category_name
                   FROM products p
                   JOIN categories c ON p.category_id = c.id
                   WHERE {where_clause}
                   ORDER BY p.created_at DESC
                   LIMIT %s OFFSET %s""",
                params + [limit, offset]
            )
            rows = cursor.fetchall()

            # 総件数取得
            cursor.execute(
                f'SELECT COUNT(*) AS total FROM products p WHERE {where_clause}',
                params
            )
            total = cursor.fetchone()['total']

        return {
            'data': rows,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'total_pages': (total + limit - 1) // limit,
            }
        }

    def find_by_id(self, product_id: int) -> Optional[Dict]:
        with get_cursor() as cursor:
            cursor.execute(
                'SELECT * FROM products WHERE id = %s AND is_active = TRUE',
                (product_id,)
            )
            return cursor.fetchone()

    def create(self, data: Dict[str, Any]) -> int:
        """商品を作成してIDを返す"""
        conn = get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """INSERT INTO products
                       (category_id, name, slug, price, stock_quantity, description)
                       VALUES (%s, %s, %s, %s, %s, %s)""",
                    (
                        data['category_id'],
                        data['name'],
                        data['slug'],
                        data['price'],
                        data['stock_quantity'],
                        data.get('description'),
                    )
                )
                product_id = cursor.lastrowid
            conn.commit()
            return product_id
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def get_sales_report(self, start_date: str, end_date: str) -> List[Dict]:
        """売上レポートを取得する"""
        with get_cursor() as cursor:
            cursor.execute(
                """SELECT
                    p.id,
                    p.name,
                    p.category_id,
                    c.name AS category_name,
                    SUM(oi.quantity) AS total_sold,
                    SUM(oi.subtotal) AS total_revenue,
                    COUNT(DISTINCT o.user_id) AS unique_buyers
                   FROM products p
                   JOIN categories c ON p.category_id = c.id
                   JOIN order_items oi ON p.id = oi.product_id
                   JOIN orders o ON oi.order_id = o.id
                   WHERE o.status = 'delivered'
                     AND o.created_at >= %s
                     AND o.created_at < %s
                   GROUP BY p.id, p.name, p.category_id, c.name
                   ORDER BY total_revenue DESC
                   LIMIT 50""",
                (start_date, end_date)
            )
            return cursor.fetchall()
```

### SQLAlchemyの使用

```bash
pip install sqlalchemy pymysql
```

```python
# sqlalchemy_setup.py
from sqlalchemy import (
    create_engine, Column, BigInteger, Integer, String,
    Boolean, DateTime, Numeric, Text, JSON, ForeignKey, Enum
)
from sqlalchemy.orm import declarative_base, relationship, Session, sessionmaker
from sqlalchemy.sql import func
import enum
import os

DATABASE_URL = (
    f"mysql+pymysql://{os.environ.get('DB_USER')}:{os.environ.get('DB_PASSWORD')}"
    f"@{os.environ.get('DB_HOST', 'localhost')}/{os.environ.get('DB_NAME')}"
    f"?charset=utf8mb4"
)

engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,  # コネクション確認
    echo=False,          # SQLログ出力（開発時はTrue）
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()

# モデル定義
class OrderStatus(enum.Enum):
    pending = 'pending'
    confirmed = 'confirmed'
    shipped = 'shipped'
    delivered = 'delivered'
    cancelled = 'cancelled'
    refunded = 'refunded'

class User(Base):
    __tablename__ = 'users'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    email = Column(String(255), nullable=False, unique=True)
    username = Column(String(100), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(200))
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    orders = relationship('Order', back_populates='user')

class Product(Base):
    __tablename__ = 'products'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    category_id = Column(Integer, ForeignKey('categories.id'), nullable=False)
    name = Column(String(300), nullable=False)
    slug = Column(String(300), unique=True, nullable=False)
    description = Column(Text)
    price = Column(Numeric(10, 2), nullable=False)
    stock_quantity = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    category = relationship('Category', back_populates='products')
    order_items = relationship('OrderItem', back_populates='product')

class Order(Base):
    __tablename__ = 'orders'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.pending, nullable=False)
    total_amount = Column(Numeric(12, 2), nullable=False)
    tax_amount = Column(Numeric(12, 2), default=0, nullable=False)
    shipping_address = Column(JSON, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    user = relationship('User', back_populates='orders')
    items = relationship('OrderItem', back_populates='order', cascade='all, delete-orphan')

def get_db():
    """FastAPIなどで使うDependency Injection用"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

```python
# services/order_service.py
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from models import Order, OrderItem, Product, OrderStatus
from decimal import Decimal
from typing import List, Dict

class OrderService:
    def __init__(self, db: Session):
        self.db = db

    def create_order(self, user_id: int, items: List[Dict], shipping_address: Dict) -> Order:
        """トランザクションを使った注文作成"""
        try:
            total_amount = Decimal('0')
            processed_items = []

            for item in items:
                product = (
                    self.db.query(Product)
                    .filter(Product.id == item['product_id'], Product.is_active == True)
                    .with_for_update()
                    .first()
                )

                if not product:
                    raise ValueError(f"商品 {item['product_id']} が見つかりません")

                if product.stock_quantity < item['quantity']:
                    raise ValueError(f"商品 '{product.name}' の在庫が不足しています")

                subtotal = product.price * item['quantity']
                total_amount += subtotal
                processed_items.append({
                    'product': product,
                    'quantity': item['quantity'],
                    'unit_price': product.price,
                    'subtotal': subtotal,
                })

            tax_amount = round(total_amount * Decimal('0.1'))

            order = Order(
                user_id=user_id,
                status=OrderStatus.pending,
                total_amount=total_amount + tax_amount,
                tax_amount=tax_amount,
                shipping_address=shipping_address,
            )
            self.db.add(order)
            self.db.flush()  # order.idを取得するためにflush

            for item_data in processed_items:
                order_item = OrderItem(
                    order_id=order.id,
                    product_id=item_data['product'].id,
                    quantity=item_data['quantity'],
                    unit_price=item_data['unit_price'],
                    subtotal=item_data['subtotal'],
                )
                self.db.add(order_item)
                item_data['product'].stock_quantity -= item_data['quantity']

            self.db.commit()
            self.db.refresh(order)
            return order

        except SQLAlchemyError as e:
            self.db.rollback()
            raise RuntimeError(f"データベースエラー: {str(e)}")

    def get_monthly_revenue(self, year: int) -> List[Dict]:
        """月次売上集計（生SQLで複雑な集計を実行）"""
        result = self.db.execute(
            """
            SELECT
                MONTH(created_at) AS month,
                COUNT(*) AS order_count,
                SUM(total_amount) AS revenue,
                COUNT(DISTINCT user_id) AS unique_customers
            FROM orders
            WHERE YEAR(created_at) = :year
              AND status = 'delivered'
            GROUP BY MONTH(created_at)
            ORDER BY month
            """,
            {'year': year}
        )
        return [dict(row) for row in result]
```

---

## 14. バックアップ・リストア・セキュリティ

### mysqldumpによるバックアップ

```bash
# 全データベースのバックアップ
mysqldump -u root -p \
  --all-databases \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  > backup_$(date +%Y%m%d_%H%M%S).sql

# 特定データベースのバックアップ
mysqldump -u myapp_user -p \
  --single-transaction \
  --routines \
  --triggers \
  ecommerce \
  > ecommerce_$(date +%Y%m%d).sql

# 圧縮バックアップ
mysqldump -u root -p --single-transaction ecommerce | gzip > ecommerce_$(date +%Y%m%d).sql.gz

# バックアップのリストア
mysql -u root -p ecommerce < ecommerce_20260101.sql

# 圧縮ファイルのリストア
gunzip < ecommerce_20260101.sql.gz | mysql -u root -p ecommerce

# 特定テーブルのみバックアップ
mysqldump -u root -p ecommerce users orders order_items > partial_backup.sql
```

### 自動バックアップスクリプト

```bash
#!/bin/bash
# backup_mysql.sh

BACKUP_DIR="/var/backups/mysql"
DB_HOST="localhost"
DB_USER="backup_user"
DB_PASS="${MYSQL_BACKUP_PASSWORD}"
RETENTION_DAYS=7
DATE=$(date +%Y%m%d_%H%M%S)

# バックアップディレクトリの作成
mkdir -p "${BACKUP_DIR}"

# 全データベースのリスト取得
DATABASES=$(mysql -h "${DB_HOST}" -u "${DB_USER}" -p"${DB_PASS}" \
  -e "SHOW DATABASES;" --batch --skip-column-names \
  | grep -Ev "^(information_schema|performance_schema|mysql|sys)$")

# 各データベースをバックアップ
for DB in ${DATABASES}; do
  BACKUP_FILE="${BACKUP_DIR}/${DB}_${DATE}.sql.gz"
  echo "バックアップ中: ${DB} -> ${BACKUP_FILE}"

  mysqldump -h "${DB_HOST}" -u "${DB_USER}" -p"${DB_PASS}" \
    --single-transaction \
    --routines \
    --triggers \
    "${DB}" | gzip > "${BACKUP_FILE}"

  if [ $? -eq 0 ]; then
    echo "完了: ${DB}"
  else
    echo "エラー: ${DB} のバックアップに失敗しました" >&2
  fi
done

# 古いバックアップファイルの削除
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
echo "古いバックアップを削除しました（${RETENTION_DAYS}日以前）"

# crontab設定例:
# 毎日午前2時にバックアップ
# 0 2 * * * /opt/scripts/backup_mysql.sh >> /var/log/mysql_backup.log 2>&1
```

### ポイントインタイムリカバリ（PITR）

```bash
# バイナリログを使ったPITR
# 1. バックアップからリストア
mysql -u root -p ecommerce < ecommerce_20260120.sql

# 2. バックアップ後のバイナリログを適用（障害発生時刻の直前まで）
mysqlbinlog \
  --start-datetime="2026-01-20 00:00:00" \
  --stop-datetime="2026-01-20 14:30:00" \
  /var/log/mysql/mysql-bin.000001 \
  /var/log/mysql/mysql-bin.000002 \
  | mysql -u root -p ecommerce

# 特定のGTIDまで適用
mysqlbinlog \
  --exclude-gtids="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:1-100" \
  /var/log/mysql/mysql-bin.000001 \
  | mysql -u root -p ecommerce
```

### セキュリティのベストプラクティス

```sql
-- 最小権限の原則に従ったユーザー管理
-- アプリケーション用（必要な権限のみ）
CREATE USER 'app_user'@'10.0.1.%' IDENTIFIED BY 'strong_password_here';
GRANT SELECT, INSERT, UPDATE, DELETE ON ecommerce.* TO 'app_user'@'10.0.1.%';

-- レポート用（読み取りのみ）
CREATE USER 'report_user'@'10.0.2.%' IDENTIFIED BY 'another_strong_password';
GRANT SELECT ON ecommerce.* TO 'report_user'@'10.0.2.%';

-- バックアップ用（必要な権限のみ）
CREATE USER 'backup_user'@'localhost' IDENTIFIED BY 'backup_password';
GRANT SELECT, SHOW VIEW, TRIGGER, LOCK TABLES, EVENT, RELOAD ON *.* TO 'backup_user'@'localhost';

-- パスワードポリシーの設定
SET GLOBAL validate_password.policy = MEDIUM;  -- LOW / MEDIUM / STRONG
SET GLOBAL validate_password.length = 12;
SET GLOBAL validate_password.mixed_case_count = 1;
SET GLOBAL validate_password.number_count = 1;
SET GLOBAL validate_password.special_char_count = 1;

-- 匿名ユーザーの削除
DELETE FROM mysql.user WHERE User = '';
FLUSH PRIVILEGES;

-- リモートrootログインの無効化
DELETE FROM mysql.user WHERE User = 'root' AND Host != 'localhost';
FLUSH PRIVILEGES;

-- 不要なデータベースの削除
DROP DATABASE IF EXISTS test;
```

```ini
# my.cnf のセキュリティ設定
[mysqld]
# リモートからのrootログインを禁止
bind-address = 0.0.0.0

# ローカルファイルの読み込みを禁止
local_infile = 0

# シンボリックリンクを禁止
symbolic-links = 0

# SQLインジェクション対策（厳格なSQLモード）
sql_mode = STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION

# 接続タイムアウト
connect_timeout = 10
wait_timeout = 600
interactive_timeout = 600

# 最大接続数
max_connections = 200

# 接続エラー制限（ブルートフォース対策）
max_connect_errors = 100
```

### SSL/TLS接続の設定

```bash
# 証明書の生成
openssl genrsa 2048 > ca-key.pem
openssl req -new -x509 -nodes -days 3650 -key ca-key.pem -out ca-cert.pem

openssl req -newkey rsa:2048 -days 3650 -nodes -keyout server-key.pem -out server-req.pem
openssl x509 -req -in server-req.pem -days 3650 -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial -out server-cert.pem

openssl req -newkey rsa:2048 -days 3650 -nodes -keyout client-key.pem -out client-req.pem
openssl x509 -req -in client-req.pem -days 3650 -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial -out client-cert.pem
```

```ini
# my.cnf のSSL設定
[mysqld]
ssl-ca=/etc/mysql/ssl/ca-cert.pem
ssl-cert=/etc/mysql/ssl/server-cert.pem
ssl-key=/etc/mysql/ssl/server-key.pem
require_secure_transport = ON  # 全接続にSSLを強制

[client]
ssl-ca=/etc/mysql/ssl/ca-cert.pem
ssl-cert=/etc/mysql/ssl/client-cert.pem
ssl-key=/etc/mysql/ssl/client-key.pem
```

```sql
-- SSL接続を要求するユーザーの設定
ALTER USER 'app_user'@'%' REQUIRE SSL;

-- 特定証明書を要求
ALTER USER 'secure_user'@'%' REQUIRE X509;

-- SSL接続の確認
SHOW VARIABLES LIKE 'have_ssl';
SHOW VARIABLES LIKE 'ssl_%';
STATUS;  -- SSL: の行を確認
```

### パフォーマンス監視とチューニング

```sql
-- Performance Schemaを使った監視
-- 最も遅いクエリを確認
SELECT
  DIGEST_TEXT,
  COUNT_STAR AS exec_count,
  ROUND(AVG_TIMER_WAIT / 1e9, 3) AS avg_ms,
  ROUND(MAX_TIMER_WAIT / 1e9, 3) AS max_ms,
  ROUND(SUM_TIMER_WAIT / 1e9, 3) AS total_ms
FROM performance_schema.events_statements_summary_by_digest
ORDER BY avg_ms DESC
LIMIT 20;

-- テーブル別のI/O統計
SELECT
  object_schema,
  object_name,
  count_read,
  count_write,
  count_fetch,
  count_insert,
  count_update,
  count_delete
FROM performance_schema.table_io_waits_summary_by_table
WHERE object_schema = 'ecommerce'
ORDER BY count_read + count_write DESC;

-- コネクション使用状況
SHOW STATUS LIKE 'Threads_connected';
SHOW STATUS LIKE 'Max_used_connections';
SHOW PROCESSLIST;

-- バッファプールの使用率
SELECT
  ROUND(100 * innodb_buffer_pool_pages_data / innodb_buffer_pool_pages_total, 2) AS buf_pool_data_pct,
  ROUND(100 * innodb_buffer_pool_pages_free / innodb_buffer_pool_pages_total, 2) AS buf_pool_free_pct,
  innodb_buffer_pool_read_requests,
  innodb_buffer_pool_reads,
  ROUND(100 - (100 * innodb_buffer_pool_reads / innodb_buffer_pool_read_requests), 4) AS hit_rate_pct
FROM (
  SELECT
    VARIABLE_VALUE AS innodb_buffer_pool_pages_data
  FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Innodb_buffer_pool_pages_data'
) a, (
  SELECT VARIABLE_VALUE AS innodb_buffer_pool_pages_total
  FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Innodb_buffer_pool_pages_total'
) b, (
  SELECT VARIABLE_VALUE AS innodb_buffer_pool_pages_free
  FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Innodb_buffer_pool_pages_free'
) c, (
  SELECT VARIABLE_VALUE AS innodb_buffer_pool_read_requests
  FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Innodb_buffer_pool_read_requests'
) d, (
  SELECT VARIABLE_VALUE AS innodb_buffer_pool_reads
  FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Innodb_buffer_pool_reads'
) e;

-- 推奨設定の取得（MySQL Tuner相当の基礎確認）
SHOW GLOBAL STATUS LIKE 'Key_read%';
SHOW GLOBAL STATUS LIKE 'Handler%';
SHOW GLOBAL STATUS LIKE 'Created_tmp%';
SHOW GLOBAL STATUS LIKE 'Select%';
```

### innodb_buffer_pool_sizeの最適化

```sql
-- バッファプールに乗り切れていないデータ量を確認
SELECT
  ROUND(SUM(data_length + index_length) / 1024 / 1024 / 1024, 2) AS total_gb
FROM information_schema.tables
WHERE table_schema NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys');

-- バッファプールヒット率の確認（99%以上が理想）
SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_reads';
SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_read_requests';
-- ヒット率 = (1 - Reads / Read_requests) * 100
```

---

## まとめ

本ガイドでは、MySQLの基礎から実践的な運用まで幅広く解説してきた。改めて要点を整理する。

### 設計フェーズのチェックリスト

- 文字コードは `utf8mb4` + `utf8mb4_unicode_ci` を必ず指定する
- `BIGINT UNSIGNED AUTO_INCREMENT` をプライマリキーとして使用する
- `created_at` / `updated_at` カラムに `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` を設定する
- 外部キー制約を設定し、参照整合性を保つ
- 論理削除が必要な場合は `deleted_at` カラムを追加する

### インデックス設計のポイント

- EXPLAINで `type: ALL`（フルテーブルスキャン）が出たら即座にインデックスを追加する
- 複合インデックスはカーディナリティの高いカラムを先頭に置く
- SELECT句のカラムもインデックスに含めてカバリングインデックスを狙う
- インデックスは多すぎても書き込みが遅くなるため、使われていないインデックスは削除する

### パフォーマンス最適化の優先順位

1. EXPLAINでフルテーブルスキャンを特定し、適切なインデックスを追加
2. スロークエリログを分析して問題クエリを洗い出す
3. `innodb_buffer_pool_size` を適切に設定する（利用可能RAMの70-80%）
4. コネクションプールを使ってコネクション管理を最適化する
5. レプリケーションで読み取り負荷を分散する
6. パーティショニングで大規模テーブルを管理する

### セキュリティの基本原則

- 最小権限の原則: アプリケーションに必要な最小限の権限のみ付与する
- リモートrootログインを無効化する
- 本番環境では必ずSSL/TLSで接続を暗号化する
- 定期的なバックアップとポイントインタイムリカバリのテストを実施する

MySQLは成熟した技術であり、適切に設計・設定・最適化することで、数億行規模のデータも効率的に扱える。本ガイドを手引きに、堅牢で高性能なデータベース基盤を構築してほしい。

---

## 開発ツールの活用

MySQLを含むデータベース開発・バックエンド開発全般で活用できるツールやリソースを探している方は、**[DevToolBox](https://usedevtools.com)** を参考にしてみてほしい。SQL整形・クエリデバッグ・正規表現テスト・JSON変換など、開発者が日常的に使うユーティリティが一箇所にまとまっており、ブラウザからすぐに利用できる。ツールの導入コストをかけずに開発効率を高めたい場合に特に有用だ。

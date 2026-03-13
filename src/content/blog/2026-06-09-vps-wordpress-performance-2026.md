---
title: "VPSでWordPressを高速化する方法2026【Nginx+Redis+OPcache】"
description: "VPS上のWordPressをNginx+PHP-FPM+Redis+OPcacheで高速化する全手順を解説。PageSpeed 90点以上達成のための設定・W3 Total Cache・ヒートマップ分析まで2026年最新の実践的な高速化手法を詳しく説明します。"
pubDate: "2026-06-09"
tags: ["server", "wordpress", "パフォーマンス"]
heroImage: "../../assets/blog-placeholder-5.jpg"
---

## はじめに

> *本記事にはアフィリエイト広告（A8.net）が含まれます。*

「WordPressが遅い」という悩みは多くのサイトオーナーが抱えている。共有サーバー（レンタルサーバー）では設定の自由度が低く、改善できる幅が限られる。しかし**VPS（仮想専用サーバー）**を使えば、Nginx・PHP-FPM・Redis・OPcacheなどをフル活用して大幅な高速化が可能だ。

本記事ではUbuntu VPS上でWordPressをNginx+PHP-FPM+Redisで動かし、PageSpeed Insights 90点以上を達成するための設定方法を解説する。

> **免責事項**: ツールのバージョン・設定は記事執筆時点の情報です。最新の公式ドキュメントも合わせてご確認ください。

<div style="padding:1.5em;background:#f0f7ff;border-radius:8px;border-left:4px solid #0066cc;margin:1.5em 0;">
<strong>WordPress高速化に最適なVPS</strong><br>
NVMe SSD・高スペックCPU搭載でWordPressが快適に動くXServerVPSがおすすめ。<br>
<a href="https://px.a8.net/svt/ejp?a8mat=4AZ9C2+2ZRJL6+5GDG+NTJWY" rel="noopener sponsored" target="_blank" style="display:inline-block;margin-top:0.75em;background:#0066cc;color:white;padding:10px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">→ XServerVPS 公式サイトで詳細を見る</a>
</div>

---

## 前提環境

- OS: Ubuntu 22.04 LTS
- VPS: XServerVPS / ConoHa VPS / さくらのVPS等
- Nginx インストール済み
- WordPress インストール済み（Apache→Nginxの移行も可）
- PHP 8.1以上

---

## 目次

1. WordPress高速化の全体戦略
2. PHP-FPMのインストールと設定
3. NginxのWordPress用設定
4. OPcacheでPHPを高速化
5. Redisのインストールとオブジェクトキャッシュ設定
6. MariaDB/MySQLのチューニング
7. Nginxのマイクロキャッシュ設定
8. WordPressプラグインによるキャッシュ最適化
9. 静的ファイルの最適化
10. PageSpeed Insightsで計測・改善

---

## 1. WordPress高速化の全体戦略

WordPressの速度に影響する要因と対策を整理する。

| レイヤー | 問題 | 対策 |
|---------|------|------|
| PHP実行 | PHPスクリプトのコンパイル | **OPcache**（バイトコードキャッシュ） |
| DB接続 | WordPressのDB接続コスト | **Redis**（オブジェクトキャッシュ） |
| ページ生成 | 毎リクエストでHTML生成 | **Nginxマイクロキャッシュ / W3TC** |
| 静的ファイル | CSS/JS/画像の転送量 | **gzip圧縮 / Brotli / ブラウザキャッシュ** |
| 画像 | 非圧縮・非WebP画像 | **WebP変換 / Lazy Load** |
| ネットワーク | HTTP/1.1 | **HTTP/2 / CDN** |

---

## 2. PHP-FPMのインストールと設定

### PHP 8.2のインストール

```bash
# ondrejのPHPリポジトリを追加
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update

# PHP 8.2とWordPressに必要な拡張をインストール
sudo apt install -y \
    php8.2-fpm \
    php8.2-mysql \
    php8.2-xml \
    php8.2-mbstring \
    php8.2-curl \
    php8.2-zip \
    php8.2-gd \
    php8.2-intl \
    php8.2-bcmath \
    php8.2-imagick \
    php8.2-redis \
    php8.2-opcache

# PHP-FPMの起動確認
sudo systemctl status php8.2-fpm
```

### PHP-FPMのプールチューニング

```bash
# WordPressサイト用のPHP-FPMプールを作成
sudo nano /etc/php/8.2/fpm/pool.d/wordpress.conf
```

```ini
; /etc/php/8.2/fpm/pool.d/wordpress.conf
[wordpress]
user = www-data
group = www-data
listen = /run/php/php8.2-wordpress-fpm.sock
listen.owner = www-data
listen.group = www-data

; プロセス管理方式（dynamicが一般的）
pm = dynamic

; 最大子プロセス数（メモリに応じて調整: RAM/64MB程度が目安）
pm.max_children = 20

; 起動時の子プロセス数
pm.start_servers = 4

; アイドル時の最小プロセス数
pm.min_spare_servers = 2

; アイドル時の最大プロセス数
pm.max_spare_servers = 6

; 各子プロセスが処理するリクエスト数（メモリリーク対策）
pm.max_requests = 500

; タイムアウト設定
request_terminate_timeout = 60s

; エラーログ
php_admin_value[error_log] = /var/log/php/wordpress-error.log
php_admin_flag[log_errors] = on

; PHPメモリ上限（WordPressは128MB以上推奨）
php_admin_value[memory_limit] = 256M

; ファイルアップロード上限
php_admin_value[upload_max_filesize] = 64M
php_admin_value[post_max_size] = 64M
```

```bash
# ログディレクトリを作成
sudo mkdir -p /var/log/php
sudo chown www-data:www-data /var/log/php

# PHP-FPMを再起動
sudo systemctl restart php8.2-fpm
```

---

## 3. NginxのWordPress用設定

```bash
sudo nano /etc/nginx/sites-available/wordpress.conf
```

```nginx
# FastCGIキャッシュパス（マイクロキャッシュ）の設定
fastcgi_cache_path /var/cache/nginx/wordpress
    levels=1:2
    keys_zone=WORDPRESS:100m
    inactive=60m
    max_size=1g;

fastcgi_cache_key "$scheme$request_method$host$request_uri";
fastcgi_cache_use_stale error timeout invalid_header http_500;
fastcgi_ignore_headers Cache-Control Expires Set-Cookie;

server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    root /var/www/wordpress;
    index index.php;

    # SSL設定
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;

    # セキュリティヘッダー
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # ログ
    access_log /var/log/nginx/wordpress.access.log;
    error_log  /var/log/nginx/wordpress.error.log;

    # gzip圧縮
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_comp_level 6;

    # 静的ファイルのキャッシュ（1年間）
    location ~* \.(jpg|jpeg|png|gif|webp|ico|css|js|pdf|woff|woff2|ttf|svg)$ {
        expires 365d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # WordPress用のメインルーティング
    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    # PHPファイルの処理
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.2-wordpress-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;

        # FastCGIキャッシュ設定
        fastcgi_cache WORDPRESS;
        fastcgi_cache_valid 200 301 302 60m;
        fastcgi_cache_bypass $skip_cache;
        fastcgi_no_cache $skip_cache;
        add_header X-FastCGI-Cache $upstream_cache_status;
    }

    # wp-admin・wp-loginはキャッシュ除外
    set $skip_cache 0;
    if ($request_method = POST) { set $skip_cache 1; }
    if ($query_string != "") { set $skip_cache 1; }
    if ($request_uri ~* "/wp-admin/|/wp-login.php") { set $skip_cache 1; }
    if ($http_cookie ~* "comment_author|wordpress_[a-f0-9]+|wp-postpass|wordpress_no_cache|wordpress_logged_in") {
        set $skip_cache 1;
    }

    # XML-RPCへのアクセスをブロック（セキュリティ）
    location = /xmlrpc.php {
        deny all;
    }

    # .htaccessへのアクセスをブロック
    location ~ /\.ht {
        deny all;
    }

    # wp-config.phpへのアクセスをブロック
    location ~ /wp-config\.php {
        deny all;
    }
}
```

```bash
# キャッシュディレクトリを作成
sudo mkdir -p /var/cache/nginx/wordpress
sudo chown www-data:www-data /var/cache/nginx/wordpress

# 設定を有効化
sudo ln -s /etc/nginx/sites-available/wordpress.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 4. OPcacheでPHPを高速化

OPcacheはPHPのバイトコードをメモリにキャッシュして再コンパイルを省略し、処理速度を大幅に向上させる。

```bash
sudo nano /etc/php/8.2/fpm/conf.d/10-opcache.ini
```

```ini
; /etc/php/8.2/fpm/conf.d/10-opcache.ini
; OPcacheを有効化
opcache.enable=1
opcache.enable_cli=0

; バイトコードキャッシュのメモリサイズ（MB）
opcache.memory_consumption=256

; インターンされた文字列のメモリサイズ（MB）
opcache.interned_strings_buffer=16

; キャッシュできるファイル数
opcache.max_accelerated_files=10000

; ファイル変更の検出間隔（秒）。本番環境は0でリアルタイム検出無効化
opcache.revalidate_freq=0

; ファイル変更検出を無効化（デプロイ時にキャッシュをリセット）
opcache.validate_timestamps=0

; JITコンパイラを有効化（PHP 8.0以降）
opcache.jit=1255
opcache.jit_buffer_size=64M
```

```bash
# PHP-FPMを再起動
sudo systemctl restart php8.2-fpm

# OPcacheの状態確認（WordPressのphpinfo()で確認するか以下のスクリプトを使用）
php -r "var_dump(opcache_get_status());" | grep -E '"used_memory|hit_rate"'
```

### デプロイ時のOPcacheリセット

```bash
# wp-cliを使ってOPcacheをリセット
wp eval 'opcache_reset();' --allow-root
# または
php -r "opcache_reset();"
```

---

## 5. Redisのインストールとオブジェクトキャッシュ設定

### Redisのインストール

```bash
# Redisのインストール
sudo apt install redis-server -y

# Redisの起動と自動起動設定
sudo systemctl start redis-server
sudo systemctl enable redis-server

# 動作確認
redis-cli ping
# PONG
```

### Redisの設定チューニング

```bash
sudo nano /etc/redis/redis.conf
```

```
# メモリ上限（WordPressのオブジェクトキャッシュには256MB程度）
maxmemory 256mb

# メモリ上限に達した場合のポリシー（最も古いものから削除）
maxmemory-policy allkeys-lru

# AOF（永続化）を無効化（キャッシュ用途では不要）
appendonly no

# TCPバックログ（接続数が多い場合）
tcp-backlog 511

# Unixソケット経由での接続（TCP接続より高速）
unixsocket /run/redis/redis.sock
unixsocketperm 770
```

```bash
# www-dataユーザーをredisグループに追加
sudo usermod -a -G redis www-data

# Redisを再起動
sudo systemctl restart redis-server
sudo systemctl status redis-server
```

### WordPressのオブジェクトキャッシュ設定

```bash
# wp-cliのインストール
curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
chmod +x wp-cli.phar
sudo mv wp-cli.phar /usr/local/bin/wp

# Redis Object Cache プラグインのインストール
wp plugin install redis-cache --activate --path=/var/www/wordpress

# wp-config.phpにRedis設定を追加
sudo nano /var/www/wordpress/wp-config.php
```

```php
// Redis Object Cache設定（wp-config.phpに追加）
define('WP_REDIS_SCHEME', 'unix');
define('WP_REDIS_PATH', '/run/redis/redis.sock');
define('WP_REDIS_DATABASE', 0);
define('WP_REDIS_TIMEOUT', 1);
define('WP_REDIS_READ_TIMEOUT', 1);
define('WP_REDIS_MAXTTL', 86400);  // 1日間キャッシュ
```

```bash
# Redisキャッシュを有効化
wp redis enable --path=/var/www/wordpress

# 接続確認
wp redis status --path=/var/www/wordpress
# Status: Connected
```

---

## 6. MariaDB/MySQLのチューニング

```bash
# MySQLの設定ファイルを確認
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf（チューニング設定）
[mysqld]
# 文字コード
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# InnoDBバッファープールサイズ（RAMの50-70%が目安）
innodb_buffer_pool_size = 512M

# InnoDBバッファープールインスタンス数（buffer_pool_sizeを1GBごとに1増やす）
innodb_buffer_pool_instances = 1

# ログファイルサイズ（buffer_pool_sizeの25%程度）
innodb_log_file_size = 128M

# ダーティページのフラッシュ設定
innodb_flush_log_at_trx_commit = 2  # 1が安全だが遅い、2はほぼ安全で高速
innodb_flush_method = O_DIRECT

# クエリキャッシュ（MySQL 8.0では廃止済み）
# query_cache_size = 0
# query_cache_type = 0

# 接続数の上限
max_connections = 150

# スロークエリログ（デバッグ用）
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow-query.log
long_query_time = 1  # 1秒以上のクエリを記録
```

```bash
# MySQLを再起動
sudo systemctl restart mysql

# MySQLのパフォーマンス確認
mysql -u root -p -e "SHOW STATUS LIKE 'Innodb_buffer_pool%';"
```

---

## 7. NginxのFastCGIマイクロキャッシュ設定

FastCGIキャッシュを使うと、PHPを介さず直接HTMLをキャッシュして返すためWordPressのレスポンスが数十倍高速化される。

```bash
# キャッシュのウォームアップスクリプト
cat > /var/www/scripts/cache-warmup.sh << 'EOF'
#!/bin/bash
# サイトマップのURLを取得してキャッシュをウォームアップ
SITEMAP_URL="https://example.com/sitemap.xml"

# サイトマップのURLを一覧取得
URLS=$(curl -s $SITEMAP_URL | grep -o '<loc>[^<]*</loc>' | sed 's/<[^>]*>//g')

# 各URLにアクセスしてキャッシュをプリウォーム
for url in $URLS; do
    curl -s -o /dev/null -w "%{http_code} $url\n" "$url"
    sleep 0.1  # サーバー負荷軽減
done

echo "Cache warmup complete!"
EOF
chmod +x /var/www/scripts/cache-warmup.sh
```

---

## 8. WordPressプラグインによるキャッシュ最適化

### W3 Total Cache の設定

W3 Total Cacheを使う場合のおすすめ設定。

```bash
# wp-cliでインストール
wp plugin install w3-total-cache --activate --path=/var/www/wordpress
```

管理画面（`/wp-admin/admin.php?page=w3tc_general`）で以下を設定する。

| 設定項目 | 推奨値 |
|---------|-------|
| Page Cache | Redis または Disk: Enhanced |
| Minify | Enabled（CSS/JS最小化） |
| Database Cache | Redis |
| Object Cache | Redis |
| Browser Cache | Enabled |
| CDN | CloudflareやBunny CDNを利用する場合は設定 |

### Autoptimize（CSS/JS最適化）

```bash
wp plugin install autoptimize --activate --path=/var/www/wordpress
```

設定推奨値：
- Optimize JavaScript Code: ✅
- Optimize CSS Code: ✅
- Optimize HTML Code: ✅
- Lazy-load images: ✅

---

## 9. 静的ファイルの最適化

### 画像のWebP変換

```bash
# cwebpのインストール
sudo apt install webp -y

# 既存JPEGをWebPに変換するスクリプト
for f in /var/www/wordpress/wp-content/uploads/**/*.jpg; do
    cwebp -q 80 "$f" -o "${f%.jpg}.webp"
done

# Nginxでブラウザ対応に応じてWebPを配信
```

```nginx
# /etc/nginx/sites-available/wordpress.conf に追加
# WebP対応ブラウザにはWebP画像を配信
map $http_accept $webp_suffix {
    default "";
    "~*webp" ".webp";
}

location ~* \.(png|jpg|jpeg)$ {
    add_header Vary Accept;
    try_files $uri$webp_suffix $uri =404;
    expires 365d;
    add_header Cache-Control "public, immutable";
}
```

### Brotli圧縮の有効化

```bash
# Brotliモジュールのインストール
sudo apt install nginx-module-brotli -y

# nginx.confに追加
sudo nano /etc/nginx/nginx.conf
```

```nginx
load_module modules/ngx_http_brotli_filter_module.so;
load_module modules/ngx_http_brotli_static_module.so;

http {
    brotli on;
    brotli_comp_level 6;
    brotli_types text/plain text/css application/json application/javascript text/xml;
}
```

---

## 10. PageSpeed Insightsで計測・改善

```bash
# Lighthouse CLIでローカル計測
npm install -g lighthouse
lighthouse https://example.com --output json --output-path ./report.json

# 主要スコアを確認
cat report.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
cats = data['categories']
for k, v in cats.items():
    print(f'{k}: {v[\"score\"]*100:.0f}')
"
```

### PageSpeed 90点以上のチェックリスト

| 項目 | 状態確認コマンド |
|------|---------------|
| gzip/Brotli圧縮 | `curl -H "Accept-Encoding: br,gzip" -I https://example.com` |
| 画像のWebP配信 | ブラウザのネットワークタブで確認 |
| CSS/JS最小化 | ページソースでminified確認 |
| Browser Cache | `curl -I https://example.com/wp-content/themes/...` でCache-Control確認 |
| HTTP/2 | `curl -I --http2 https://example.com` |
| Redis有効 | `wp redis status` |
| OPcache有効 | `php -r "var_dump(opcache_get_configuration());"` |

<div style="padding:1.5em;background:#f0f7ff;border-radius:8px;border-left:4px solid #0066cc;margin:1.5em 0;">
<strong>WordPress高速VPSを選ぶなら</strong><br>
さくらのVPSはWordPress向けのOS再インストールテンプレートも充実。LAMP環境の構築が簡単。<br>
<a href="https://px.a8.net/svt/ejp?a8mat=4AZ9C1+G6VE0I+D8Y+CA67M" rel="noopener sponsored" target="_blank" style="display:inline-block;margin-top:0.75em;background:#e67e22;color:white;padding:10px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">→ さくらのVPS 公式サイトで詳細を見る</a>
</div>

---

## まとめ

本記事ではVPS上でWordPressを高速化するための設定を解説した。

- **PHP-FPM**のプールチューニング
- **OPcache**でPHPバイトコードをキャッシュ
- **Redis**でWordPressのオブジェクトキャッシュを高速化
- **NginxのFastCGIキャッシュ**でHTMLをキャッシュ
- **MariaDB/MySQLチューニング**でクエリを高速化
- **WebP変換・Brotli圧縮**で転送量を削減

これらをすべて適用することでPageSpeed Insights 90点以上は十分に達成できる。

---

## 関連記事

- [NginxでWebサーバー構築完全ガイド2026](/blog/2026-06-06-nginx-web-server-setup-guide-2026/) — NginxのWordPress向け設定の基礎
- [Let's Encrypt無料SSL証明書設定完全ガイド2026](/blog/2026-06-07-lets-encrypt-ssl-setup-guide-2026/) — WordPressのHTTPS化手順
- [Dockerをサーバーで本番運用する完全ガイド2026](/blog/2026-06-03-docker-production-server-guide-2026/) — DockerでWordPressを動かす方法
- [XServerVPS vs ConoHa VPS徹底比較2026](/blog/2026-06-01-xservervps-vs-conoha-vps-2026/) — WordPressに最適なVPS比較

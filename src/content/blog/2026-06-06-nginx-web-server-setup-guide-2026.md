---
title: "NginxでWebサーバー構築完全ガイド2026【Ubuntu VPS対応】"
description: "Ubuntu VPS上でNginxをインストールしてHTTPS対応Webサーバーを構築する全手順を解説。仮想ホスト設定・gzip圧縮・セキュリティヘッダー・パフォーマンスチューニング・ログ管理まで2026年最新の実践内容を詳しく説明します。"
pubDate: "2026-03-05"
tags: ["server", "インフラ", "linux"]
heroImage: '../../assets/thumbnails/2026-06-06-nginx-web-server-setup-guide-2026.jpg'
---

## はじめに

> *本記事にはアフィリエイト広告（A8.net）が含まれます。*

VPSを借りてWebサーバーを立ち上げる際、最初の壁となるのが**Nginxの設定**だ。

Nginxはシンプルな静的サイトから高負荷なWebアプリのリバースプロキシまで幅広く対応できる、現代の標準的なWebサーバーソフトウェアである。本記事ではUbuntu 22.04 LTS上でNginxを0からインストールし、HTTPS対応まで完全に構築する手順を解説する。

> **免責事項**: ツールのバージョン・コマンドは記事執筆時点の情報です。最新の公式ドキュメントも合わせてご確認ください。

<div style="padding:1.5em;background:#f0f7ff;border-radius:8px;border-left:4px solid #0066cc;margin:1.5em 0;">
<strong>Nginx構築に最適なVPS</strong><br>
NVMe SSD搭載でレスポンスが速いXServerVPSが本番Webサーバーにおすすめ。月額830円〜で始められます。<br>
<a href="https://px.a8.net/svt/ejp?a8mat=4AZ9C2+2ZRJL6+5GDG+NTJWY" rel="noopener sponsored" target="_blank" style="display:inline-block;margin-top:0.75em;background:#0066cc;color:white;padding:10px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">→ XServerVPS 公式サイトで詳細を見る</a>
</div>

---

## 前提環境

- OS: Ubuntu 22.04 LTS
- VPS: XServerVPS / ConoHa VPS / さくらのVPS 等
- 独自ドメイン取得済み（DNS設定完了）
- 初期設定（root以外のsudoユーザー作成・UFWファイアウォール設定）完了

---

## 目次

1. Nginxのインストール
2. UFWファイアウォール設定
3. 基本設定ファイルの確認
4. 仮想ホスト（Server Block）の設定
5. HTTPSの設定（Let's Encrypt）
6. gzip圧縮の有効化
7. セキュリティヘッダーの設定
8. パフォーマンスチューニング
9. Nginxログの確認・管理
10. よくあるトラブルと対処法

---

## 1. Nginxのインストール

### パッケージの更新とインストール

```bash
# システムパッケージを最新化
sudo apt update && sudo apt upgrade -y

# Nginxのインストール
sudo apt install nginx -y

# インストール確認
nginx -v
# nginx version: nginx/1.24.0 (Ubuntu)

# サービス状態の確認
sudo systemctl status nginx
```

### Nginxの自動起動設定

```bash
# 起動時に自動スタートを有効化
sudo systemctl enable nginx

# 手動起動
sudo systemctl start nginx

# ブラウザでアクセス確認
# http://<サーバーのIPアドレス>/ にアクセスすると「Welcome to nginx!」が表示される
```

---

## 2. UFWファイアウォール設定

```bash
# 現在のUFW状態確認
sudo ufw status

# Nginxのプリセット一覧
sudo ufw app list
# Available applications:
#   Nginx Full      ← HTTP + HTTPS（推奨）
#   Nginx HTTP      ← HTTPのみ
#   Nginx HTTPS     ← HTTPSのみ
#   OpenSSH

# Nginx Full（HTTP + HTTPS）を許可
sudo ufw allow 'Nginx Full'

# SSH接続も忘れずに許可
sudo ufw allow OpenSSH

# UFWを有効化
sudo ufw enable

# 設定確認
sudo ufw status verbose
# Status: active
# To                         Action      From
# --                         ------      ----
# OpenSSH                    ALLOW IN    Anywhere
# Nginx Full                 ALLOW IN    Anywhere
```

---

## 3. Nginxの設定ファイル構成

Nginxの設定ファイルはUbuntuでは以下の場所に配置される。

```
/etc/nginx/
├── nginx.conf              ← メイン設定（グローバル設定）
├── sites-available/        ← 仮想ホスト設定ファイル置き場
│   └── default             ← デフォルト仮想ホスト
├── sites-enabled/          ← 有効化された仮想ホストのシンボリックリンク
│   └── default -> ../sites-available/default
├── conf.d/                 ← 追加設定ファイル
├── snippets/               ← 再利用可能な設定スニペット
│   ├── fastcgi-php.conf
│   └── snakeoil.conf
└── modules-enabled/        ← 有効化されたモジュール
```

### メイン設定ファイルの確認

```bash
# nginx.confの確認
sudo cat /etc/nginx/nginx.conf
```

```nginx
# /etc/nginx/nginx.conf（主要部分）
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 1024;
    # multi_accept on;  # 後でパフォーマンスチューニングで有効化
}

http {
    # 基本設定
    sendfile on;
    tcp_nopush on;
    types_hash_max_size 2048;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # ログ設定
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # gzip設定
    gzip on;

    # 仮想ホスト設定のインクルード
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

---

## 4. 仮想ホスト（Server Block）の設定

Nginxでは「Server Block」が仮想ホストに相当する。1台のサーバーで複数ドメインを運用できる。

### 新しい仮想ホスト設定の作成

```bash
# サイトのドキュメントルートを作成
sudo mkdir -p /var/www/example.com/html

# 所有者をwww-dataに設定
sudo chown -R www-data:www-data /var/www/example.com/html
sudo chmod -R 755 /var/www/example.com

# テスト用index.htmlを作成
sudo nano /var/www/example.com/html/index.html
```

```html
<!-- /var/www/example.com/html/index.html -->
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>example.com - テストページ</title>
</head>
<body>
    <h1>Hello, Nginx!</h1>
    <p>Nginx仮想ホストが正常に動作しています。</p>
</body>
</html>
```

### Server Block設定ファイルの作成

```bash
# sites-availableに設定ファイルを作成
sudo nano /etc/nginx/sites-available/example.com
```

```nginx
# /etc/nginx/sites-available/example.com
server {
    listen 80;
    listen [::]:80;

    server_name example.com www.example.com;

    root /var/www/example.com/html;
    index index.html index.htm;

    location / {
        try_files $uri $uri/ =404;
    }

    # アクセスログ・エラーログを個別に設定
    access_log /var/log/nginx/example.com.access.log;
    error_log  /var/log/nginx/example.com.error.log;
}
```

### 仮想ホストを有効化

```bash
# sites-enabledにシンボリックリンクを作成
sudo ln -s /etc/nginx/sites-available/example.com /etc/nginx/sites-enabled/

# デフォルト仮想ホストを無効化（必要に応じて）
sudo unlink /etc/nginx/sites-enabled/default

# 設定の構文チェック
sudo nginx -t
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Nginxをリロード
sudo systemctl reload nginx
```

---

## 5. HTTPSの設定（Let's Encrypt + Certbot）

### Certbotのインストール

```bash
# snapdのインストール（Ubuntu 22.04では標準で入っている場合が多い）
sudo apt install snapd -y

# Certbotをsnapでインストール
sudo snap install --classic certbot

# certbotコマンドへのシンボリックリンク
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

### SSL証明書の取得

```bash
# Nginx用のSSL証明書を取得（自動でNginx設定も更新）
sudo certbot --nginx -d example.com -d www.example.com

# メールアドレスの入力を求められる
# Enter email address (used for urgent renewal and security notices):
# → info@example.com などを入力

# 利用規約への同意
# Please read the Terms of Service at...
# → Y を入力

# EFF（Electronic Frontier Foundation）のニュースレター購読
# → N を入力（任意）
```

取得後、Nginxの設定ファイルは自動的にHTTPS対応に更新される。

```nginx
# certbotが自動更新した設定例
server {
    server_name example.com www.example.com;
    root /var/www/example.com/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    listen [::]:443 ssl; # managed by Certbot
    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = www.example.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    if ($host = example.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;
    return 404; # managed by Certbot
}
```

### 証明書の自動更新テスト

```bash
# 自動更新のドライランテスト
sudo certbot renew --dry-run

# 自動更新タイマーの確認
sudo systemctl list-timers | grep certbot
# snap.certbot.renew.timer  ...  snap.certbot.renew.service
```

---

## 6. gzip圧縮の有効化

gzip圧縮を有効にすることで、転送データ量を削減しページロード速度を向上させる。

```bash
sudo nano /etc/nginx/nginx.conf
```

```nginx
# httpブロック内に追記
http {
    # gzip設定
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;        # 圧縮レベル（1-9、6が一般的に最適）
    gzip_buffers 16 8k;
    gzip_http_version 1.1;
    gzip_min_length 256;      # 256バイト以上のファイルを圧縮
    gzip_types
        application/atom+xml
        application/geo+json
        application/javascript
        application/x-javascript
        application/json
        application/ld+json
        application/manifest+json
        application/rdf+xml
        application/rss+xml
        application/vnd.ms-fontobject
        application/wasm
        application/x-font-ttf
        application/x-web-app-manifest+json
        application/xhtml+xml
        application/xml
        font/eot
        font/opentype
        font/otf
        image/bmp
        image/svg+xml
        text/cache-manifest
        text/calendar
        text/css
        text/javascript
        text/markdown
        text/plain
        text/xml
        text/x-component
        text/x-cross-domain-policy;
}
```

```bash
# 設定の確認とリロード
sudo nginx -t && sudo systemctl reload nginx

# gzip動作確認
curl -H "Accept-Encoding: gzip" -I https://example.com
# Content-Encoding: gzip が含まれていればOK
```

---

## 7. セキュリティヘッダーの設定

本番サーバーには適切なセキュリティヘッダーが必須だ。

```bash
# セキュリティヘッダー用スニペットを作成
sudo nano /etc/nginx/snippets/security-headers.conf
```

```nginx
# /etc/nginx/snippets/security-headers.conf

# クリックジャッキング防止
add_header X-Frame-Options "SAMEORIGIN" always;

# MIME スニッフィング防止
add_header X-Content-Type-Options "nosniff" always;

# XSS フィルタリング
add_header X-XSS-Protection "1; mode=block" always;

# リファラーポリシー
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# コンテンツセキュリティポリシー（サイトに合わせて調整）
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;

# HSTS（HTTPSを強制）
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# 権限ポリシー
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()";

# Nginxのバージョン情報を非表示（nginx.confのhttpブロックで設定）
# server_tokens off;
```

```bash
# 仮想ホスト設定にスニペットをインクルード
sudo nano /etc/nginx/sites-available/example.com
```

```nginx
server {
    listen 443 ssl;
    server_name example.com www.example.com;

    # セキュリティヘッダーを読み込む
    include snippets/security-headers.conf;

    # ... 他の設定 ...
}
```

### nginx.confでバージョン情報を非表示

```bash
sudo nano /etc/nginx/nginx.conf
```

```nginx
http {
    server_tokens off;  # Nginxのバージョン情報を非表示
    # ... 他の設定 ...
}
```

---

## 8. パフォーマンスチューニング

### worker_processesとworker_connectionsの最適化

```bash
# CPUコア数の確認
nproc
# 例: 4

# nginx.confを編集
sudo nano /etc/nginx/nginx.conf
```

```nginx
# worker_processesをCPUコア数に合わせる（autoが推奨）
worker_processes auto;

# ファイルディスクリプタの上限を設定
worker_rlimit_nofile 65535;

events {
    # CPUコアごとの最大接続数
    worker_connections 4096;
    multi_accept on;
    use epoll;  # Linuxで最も効率的なI/Oイベントモデル
}

http {
    # Keep-Alive設定
    keepalive_timeout 65;
    keepalive_requests 1000;

    # バッファサイズ最適化
    client_body_buffer_size 16K;
    client_header_buffer_size 1k;
    client_max_body_size 8m;
    large_client_header_buffers 4 4k;

    # タイムアウト設定
    client_body_timeout 12;
    client_header_timeout 12;
    send_timeout 10;

    # ファイル送信の最適化
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;

    # オープンファイルキャッシュ
    open_file_cache max=200000 inactive=20s;
    open_file_cache_valid 30s;
    open_file_cache_min_uses 2;
    open_file_cache_errors on;
}
```

### 静的ファイルのキャッシュ設定

```nginx
# サイト設定に追加
server {
    # ... 基本設定 ...

    # 静的ファイルのキャッシュ（1ヶ月）
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|pdf|txt|tar|woff|woff2|ttf|svg)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
        access_log off;
    }

    # HTMLのキャッシュ（短め）
    location ~* \.html$ {
        expires 1h;
        add_header Cache-Control "public, no-transform";
    }
}
```

---

## 9. Nginxログの確認・管理

### ログのリアルタイム監視

```bash
# アクセスログのリアルタイム監視
sudo tail -f /var/log/nginx/access.log

# エラーログのリアルタイム監視
sudo tail -f /var/log/nginx/error.log

# 特定のIPからのアクセスをフィルタ
sudo tail -f /var/log/nginx/access.log | grep "192.168.1.100"

# HTTPステータスコード別の集計
sudo awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -rn
# 1523 200
# 234  304
# 45   404
# 3    500
```

### ログのローテーション設定

Ubuntuではlogrotateが自動的に設定されているが、カスタマイズする場合は以下のファイルを編集する。

```bash
sudo nano /etc/logrotate.d/nginx
```

```
/var/log/nginx/*.log {
    daily              # 毎日ローテーション
    missingok          # ファイルがなくてもエラーにしない
    rotate 14          # 14日分保持
    compress           # gzip圧縮
    delaycompress      # 1世代前はまだ圧縮しない
    notifempty         # 空ファイルはローテーションしない
    create 0640 www-data adm
    sharedscripts
    prerotate
        if [ -d /etc/logrotate.d/httpd-prerotate ]; then \
            run-parts /etc/logrotate.d/httpd-prerotate; \
        fi \
    endscript
    postrotate
        invoke-rc.d nginx rotate >/dev/null 2>&1
    endscript
}
```

---

## 10. よくあるトラブルと対処法

### 設定ファイルの構文エラー

```bash
# 設定ファイルの構文チェック（必ずreloadの前に実行）
sudo nginx -t

# エラー例と対処
# nginx: [emerg] unexpected "}" in /etc/nginx/sites-available/example.com:25
# → 指定行の括弧・セミコロンの欠落を確認

# 詳細なデバッグ情報を表示
sudo nginx -T | head -100
```

### 502 Bad Gatewayエラー

```bash
# バックエンドサービスが起動しているか確認
sudo systemctl status php8.1-fpm   # PHP-FPMの場合
sudo systemctl status gunicorn     # Pythonアプリの場合

# Nginxエラーログで詳細を確認
sudo tail -50 /var/log/nginx/error.log
```

### 403 Forbidden エラー

```bash
# ドキュメントルートの権限を確認
ls -la /var/www/example.com/html/

# 権限を修正
sudo chown -R www-data:www-data /var/www/example.com/html
sudo chmod -R 755 /var/www/example.com/html
sudo chmod 644 /var/www/example.com/html/*.html

# nginxユーザーを確認
sudo grep -r "user" /etc/nginx/nginx.conf | head -3
```

### ポートが使用中のエラー

```bash
# ポート80・443が使用されているか確認
sudo ss -tlnp | grep -E ':80|:443'

# Apacheがインストールされている場合は停止
sudo systemctl stop apache2
sudo systemctl disable apache2

# Nginxを起動
sudo systemctl start nginx
```

---

## Nginx設定のベストプラクティスまとめ

| 項目 | 推奨設定 |
|------|---------|
| worker_processes | auto |
| worker_connections | 4096 |
| server_tokens | off |
| gzip | on（comp_level 6） |
| HTTPS | Let's Encrypt（無料・自動更新） |
| セキュリティヘッダー | HSTS / CSP / X-Frame-Options など |
| ログローテーション | 14日間保持 |
| 静的ファイルキャッシュ | 30日間 |

<div style="padding:1.5em;background:#f0f7ff;border-radius:8px;border-left:4px solid #0066cc;margin:1.5em 0;">
<strong>Webサーバー構築に最適なVPS</strong><br>
高速NVMe SSD・国内DCで低レイテンシ。NginxなどのWebサーバー構築に最適。<br>
<a href="https://px.a8.net/svt/ejp?a8mat=4AZ9C2+2ZRJL6+5GDG+NTJWY" rel="noopener sponsored" target="_blank" style="display:inline-block;margin-top:0.75em;background:#0066cc;color:white;padding:10px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">→ XServerVPS 公式サイトで申し込む</a>
<a href="https://px.a8.net/svt/ejp?a8mat=4AZ9C1+G6VE0I+D8Y+CA67M" rel="noopener sponsored" target="_blank" style="display:inline-block;margin-top:0.75em;margin-left:0.5em;background:#e67e22;color:white;padding:10px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">→ さくらのVPS 公式サイトで詳細を見る</a>
</div>

---

## まとめ

本記事では以下の内容を解説した。

- **Nginxのインストール**とファイアウォール設定
- **仮想ホスト（Server Block）**の設定と有効化
- **Let's EncryptによるHTTPS化**（Certbot自動設定）
- **gzip圧縮**で転送量を削減
- **セキュリティヘッダー**によるサイト保護
- **パフォーマンスチューニング**でレスポンス改善
- **ログ管理**とトラブルシューティング

Nginxの基本構築ができたら、次のステップとしてLet's Encryptの詳細設定やCI/CDによる自動デプロイに進むとよいだろう。

---

## 関連記事

- [VPSサーバー比較2026｜用途別おすすめランキング](/blog/2026-03-12-vps-server-comparison-2026)
- [プログラミングスクール比較2026年版｜現役エンジニアが選ぶ厳選8校](/blog/2026-03-08-programming-school-comparison-2026)
- [XServerVPS vs ConoHa VPS徹底比較2026](/blog/2026-06-01-xservervps-vs-conoha-vps-2026/) — VPS選びの判断材料を網羅的に解説
- [Dockerをサーバーで本番運用する完全ガイド2026](/blog/2026-06-03-docker-production-server-guide-2026/) — NginxとDockerを組み合わせた本番構成
- [さくらのVPS vs XServerVPS 徹底比較2026](/blog/2026-06-04-sakura-vps-vs-xservervps-2026/) — 用途別に最適なVPSを選ぶ
- [VPS初期設定完全ガイド2026](/blog/2026-06-02-vps-initial-setup-guide-2026/) — Nginxを動かす前のサーバー初期設定

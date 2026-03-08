---
title: 'Caddy v2リバースプロキシ詳解ガイド'
description: 'Caddy v2を使ったリバースプロキシの実践的な設定方法。自動HTTPS、ロードバランシング、WebSocket対応、ヘッダー操作、キャッシュ戦略、セキュリティ設定を詳しく解説します。Caddy・リバースプロキシ・HTTPSに関する実践情報。'
pubDate: '2026-02-06'
tags: ['Caddy', 'リバースプロキシ', 'HTTPS', 'WebSocket', 'インフラ']
heroImage: '../../assets/thumbnails/caddy-reverse-proxy-guide.jpg'
---

リバースプロキシは、モダンなWebアプリケーションのインフラにおいて不可欠なコンポーネントです。NginxやApacheが長年使われてきましたが、Caddyは自動HTTPS、シンプルな設定、モダンなアーキテクチャにより、急速に人気を集めています。

この記事では、Caddy v2を使ったリバースプロキシの設定方法を、基本から応用まで詳しく解説します。

## Caddyの強み

### 自動HTTPS

Caddyの最大の特徴は、Let's Encryptを使った自動HTTPS取得・更新です。設定ファイルにドメイン名を書くだけで、証明書の取得、設定、自動更新がすべて自動化されます。

```caddy
example.com {
    reverse_proxy localhost:3000
}
```

これだけで完全なHTTPS対応サイトが完成します。

### シンプルな設定

Nginxと比較してみましょう。

**Nginx**

```nginx
server {
    listen 80;
    server_name example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Caddy**

```caddy
example.com {
    reverse_proxy localhost:3000
}
```

Caddyは必要な設定を自動的に行うため、設定ファイルが驚くほどシンプルになります。

## 基本設定

### 単一バックエンド

```caddy
example.com {
    # 基本的なリバースプロキシ
    reverse_proxy localhost:3000
}
```

### 複数ドメイン

```caddy
example.com {
    reverse_proxy localhost:3000
}

api.example.com {
    reverse_proxy localhost:4000
}

admin.example.com {
    reverse_proxy localhost:5000
}
```

### パスベースルーティング

```caddy
example.com {
    # /api へのリクエストはバックエンドAPI
    reverse_proxy /api/* localhost:4000

    # /admin へのリクエストは管理画面
    reverse_proxy /admin/* localhost:5000

    # その他はフロントエンド
    reverse_proxy localhost:3000
}
```

### ヘッダー操作

```caddy
example.com {
    reverse_proxy localhost:3000 {
        # カスタムヘッダーを追加
        header_up X-Custom-Header "CustomValue"
        header_up X-Request-ID {http.request.uuid}

        # Hostヘッダーを保持
        header_up Host {host}

        # Real IPを転送
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}

        # レスポンスヘッダーを削除
        header_down -Server

        # セキュリティヘッダーを追加
        header_down X-Content-Type-Options "nosniff"
        header_down X-Frame-Options "DENY"
        header_down X-XSS-Protection "1; mode=block"
    }
}
```

## ロードバランシング

### ラウンドロビン（デフォルト）

```caddy
example.com {
    reverse_proxy localhost:3000 localhost:3001 localhost:3002
}
```

### ランダム選択

```caddy
example.com {
    reverse_proxy localhost:3000 localhost:3001 localhost:3002 {
        lb_policy random
    }
}
```

### 最少接続数

```caddy
example.com {
    reverse_proxy localhost:3000 localhost:3001 localhost:3002 {
        lb_policy least_conn
    }
}
```

### IPハッシュ（セッション維持）

```caddy
example.com {
    reverse_proxy localhost:3000 localhost:3001 localhost:3002 {
        lb_policy ip_hash
    }
}
```

### ヘルスチェック

```caddy
example.com {
    reverse_proxy localhost:3000 localhost:3001 localhost:3002 {
        # ヘルスチェック設定
        health_uri /health
        health_interval 10s
        health_timeout 5s
        health_status 200

        # 失敗したバックエンドの再試行
        lb_try_duration 5s
        lb_try_interval 500ms

        # パッシブヘルスチェック
        fail_duration 30s
        max_fails 3
        unhealthy_status 500 502 503
    }
}
```

### 重み付けロードバランシング

```caddy
example.com {
    reverse_proxy {
        # サーバー1: 50%のトラフィック
        to localhost:3000 {
            weight 50
        }
        # サーバー2: 30%のトラフィック
        to localhost:3001 {
            weight 30
        }
        # サーバー3: 20%のトラフィック
        to localhost:3002 {
            weight 20
        }

        lb_policy weighted
    }
}
```

## WebSocket対応

### 基本WebSocket

```caddy
example.com {
    reverse_proxy /ws localhost:3000
}
```

CaddyはWebSocketを自動的に検出し、適切に処理します。

### WebSocket + HTTP

```caddy
example.com {
    # WebSocketエンドポイント
    reverse_proxy /ws localhost:3000

    # 通常のHTTPリクエスト
    reverse_proxy localhost:8080
}
```

### タイムアウト設定

```caddy
example.com {
    reverse_proxy /ws localhost:3000 {
        # WebSocketのタイムアウトを延長
        transport http {
            read_timeout 24h
            write_timeout 24h
            dial_timeout 10s
        }
    }
}
```

## セキュリティ設定

### 基本認証

```caddy
example.com {
    basicauth /admin/* {
        # ユーザー名: admin, パスワード: password
        admin $2a$14$Zkx19XLiW6VYouLHR5NmfOFU0z2GTNmpkT/5qqR7hx7wHnxJhJUFS
    }

    reverse_proxy localhost:3000
}
```

パスワードハッシュは以下のコマンドで生成します。

```bash
caddy hash-password --plaintext 'password'
```

### IP制限

```caddy
example.com {
    # 許可するIP
    @allowed {
        remote_ip 192.168.1.0/24 10.0.0.0/8
    }

    # 許可されていないIPは403
    respond @allowed 403

    reverse_proxy @allowed localhost:3000
}
```

### レート制限

```caddy
example.com {
    # rate_limit モジュール（プラグイン）
    rate_limit {
        zone dynamic {
            key {remote_host}
            events 100
            window 1m
        }
    }

    reverse_proxy localhost:3000
}
```

### CORS設定

```caddy
example.com {
    @cors_preflight {
        method OPTIONS
    }

    header {
        Access-Control-Allow-Origin "https://frontend.example.com"
        Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
        Access-Control-Allow-Headers "Content-Type, Authorization"
        Access-Control-Max-Age "3600"
    }

    respond @cors_preflight 204

    reverse_proxy localhost:4000
}
```

## 高度な設定

### A/Bテスト

```caddy
example.com {
    @version_a {
        header Cookie *version=a*
    }

    @version_b {
        header Cookie *version=b*
    }

    reverse_proxy @version_a localhost:3000
    reverse_proxy @version_b localhost:3001

    # デフォルトはバージョンA
    reverse_proxy localhost:3000
}
```

### カナリアデプロイ

```caddy
example.com {
    @canary {
        # 10%のトラフィックを新バージョンに
        expression {rand()} < 0.1
    }

    reverse_proxy @canary localhost:3001
    reverse_proxy localhost:3000
}
```

### ブルーグリーンデプロイ

```caddy
example.com {
    @blue {
        header X-Deployment "blue"
    }

    @green {
        header X-Deployment "green"
    }

    reverse_proxy @blue localhost:3000
    reverse_proxy @green localhost:3001

    # デフォルトは現在アクティブな環境
    reverse_proxy localhost:3000
}
```

### ファイルアップロード

```caddy
example.com {
    reverse_proxy localhost:3000 {
        # 大きいファイルのアップロードを許可
        request_buffers 16KB

        # タイムアウトを延長
        transport http {
            read_timeout 5m
            write_timeout 5m
        }
    }

    # 最大ボディサイズ
    request_body {
        max_size 100MB
    }
}
```

### 静的ファイルとリバースプロキシの組み合わせ

```caddy
example.com {
    # 静的ファイルを直接配信
    root * /var/www/html

    # /api へのリクエストはバックエンド
    reverse_proxy /api/* localhost:4000

    # その他は静的ファイル、なければバックエンド
    try_files {path} /index.html
}
```

### キャッシュ

```caddy
example.com {
    reverse_proxy localhost:3000 {
        # キャッシュヘッダーを設定
        header_down Cache-Control "public, max-age=3600"
    }

    # 静的アセットは長期キャッシュ
    @static {
        path *.js *.css *.png *.jpg *.svg
    }

    header @static Cache-Control "public, max-age=31536000, immutable"
}
```

### gzip圧縮

```caddy
example.com {
    # 自動圧縮（デフォルトで有効）
    encode gzip zstd

    reverse_proxy localhost:3000
}
```

### HTTP/2 Server Push

```caddy
example.com {
    reverse_proxy localhost:3000

    # HTTP/2 Server Push
    push /style.css
    push /script.js
}
```

## ログとモニタリング

### アクセスログ

```caddy
example.com {
    log {
        output file /var/log/caddy/access.log
        format json
    }

    reverse_proxy localhost:3000
}
```

### 構造化ログ

```caddy
{
    log {
        format json
        output file /var/log/caddy/caddy.log {
            roll_size 100MB
            roll_keep 10
            roll_keep_days 90
        }
    }
}

example.com {
    log {
        output file /var/log/caddy/example.log
        format filter {
            wrap json
            fields {
                request>headers>Authorization delete
                request>headers>Cookie delete
            }
        }
    }

    reverse_proxy localhost:3000
}
```

### Prometheusメトリクス

```caddy
{
    servers {
        metrics
    }
}

:2019 {
    metrics /metrics
}

example.com {
    reverse_proxy localhost:3000
}
```

## 実践的な設定例

### Next.jsアプリケーション

```caddy
example.com {
    # Next.jsの静的アセット
    @static {
        path /_next/static/*
    }

    header @static Cache-Control "public, max-age=31536000, immutable"

    # Next.jsのAPIルート
    reverse_proxy /api/* localhost:3000

    # その他のリクエスト
    reverse_proxy localhost:3000 {
        header_up X-Forwarded-Host {host}
    }

    encode gzip
}
```

### マイクロサービスアーキテクチャ

```caddy
example.com {
    # 認証サービス
    reverse_proxy /auth/* localhost:4001

    # ユーザーサービス
    reverse_proxy /users/* localhost:4002

    # 商品サービス
    reverse_proxy /products/* localhost:4003

    # 注文サービス
    reverse_proxy /orders/* localhost:4004

    # フロントエンド
    reverse_proxy localhost:3000
}
```

### Docker環境

```caddy
{
    email admin@example.com
}

app.example.com {
    reverse_proxy app:3000
}

api.example.com {
    reverse_proxy api:4000
}

db.example.com {
    reverse_proxy db:5432
}
```

docker-compose.yml:

```yaml
version: '3.8'

services:
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - web

  app:
    build: ./app
    networks:
      - web

  api:
    build: ./api
    networks:
      - web

volumes:
  caddy_data:
  caddy_config:

networks:
  web:
```

## デバッグとトラブルシューティング

### デバッグモード

```bash
# 設定ファイルの検証
caddy validate --config Caddyfile

# デバッグログを有効にして起動
caddy run --config Caddyfile --debug

# 設定をJSON形式で表示
caddy adapt --config Caddyfile --pretty
```

### 接続テスト

```bash
# HTTPSが正しく設定されているか確認
curl -I https://example.com

# WebSocketのテスト
websocat wss://example.com/ws

# ヘッダーの確認
curl -I https://example.com -H "X-Custom-Header: test"
```

### パフォーマンス最適化

```caddy
{
    # グローバル設定
    servers {
        protocol {
            # HTTP/3を有効化
            experimental_http3
        }

        # タイムアウト設定
        timeouts {
            read_body 10s
            read_header 10s
            write 30s
            idle 2m
        }

        # 最大ヘッダーサイズ
        max_header_size 16KB
    }
}

example.com {
    reverse_proxy localhost:3000 {
        # コネクションプール
        transport http {
            max_conns_per_host 100
            keep_alive 90s
        }
    }
}
```

## まとめ

Caddy v2を使えば、以下のような機能を簡単に実装できます。

- **自動HTTPS**: 証明書の取得・更新が完全自動
- **ロードバランシング**: ラウンドロビン、最少接続、IPハッシュ
- **WebSocket**: 自動検出と適切な処理
- **セキュリティ**: 基本認証、IP制限、CORS
- **高度なルーティング**: A/Bテスト、カナリアデプロイ
- **監視**: 構造化ログ、Prometheusメトリクス

シンプルな設定ファイル、自動HTTPS、モダンなアーキテクチャにより、Caddyは次世代のリバースプロキシとして最適な選択肢です。NginxやApacheからの移行も容易で、すぐに本番環境で使い始められます。

---
title: "Caddy Webサーバー完全ガイド - 自動HTTPS対応のモダンサーバー"
description: "Caddyは自動HTTPS対応のモダンWebサーバー。Caddyfile設定、リバースプロキシ、Let's Encrypt自動証明書、Docker連携まで徹底解説します。"
pubDate: "2025-02-06"
---

**Caddy**は、自動HTTPS対応を特徴とするモダンなWebサーバーです。設定が簡単で、Let's Encryptによる証明書の自動取得・更新機能を標準搭載しています。

本記事では、Caddyの基本から実践的な設定方法、リバースプロキシ、Docker連携まで詳しく解説します。

## Caddyとは？

Caddyは、**Go言語で書かれたオープンソースのWebサーバー**です。NginxやApacheの代替として、よりシンプルな設定と自動HTTPS機能を提供します。

### 主な特徴

- **自動HTTPS**: Let's Encryptの証明書を自動取得・更新
- **シンプルな設定**: Caddyfileによる直感的な設定
- **HTTP/2・HTTP/3対応**: 最新プロトコルをデフォルトでサポート
- **リバースプロキシ**: 簡単な設定でバックエンドサーバーに転送
- **単一バイナリ**: 依存関係なしで動作
- **プラグインシステム**: 機能拡張が容易

### Nginxとの比較

| 機能 | Caddy | Nginx |
|------|-------|-------|
| HTTPS自動化 | ✅ 自動 | ❌ 手動設定 |
| 設定の簡潔さ | ✅ 非常にシンプル | ⚠️ 複雑 |
| HTTP/3サポート | ✅ デフォルト | ⚠️ 要コンパイル |
| パフォーマンス | ⚠️ 高速 | ✅ 最高速 |
| メモリ使用量 | ⚠️ やや多い | ✅ 少ない |

Caddyは**簡単さ**を重視し、Nginxは**最高のパフォーマンス**を重視しています。

## インストール

### macOS (Homebrew)

```bash
brew install caddy
```

### Linux

#### Ubuntu/Debian

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

#### Fedora/CentOS/RHEL

```bash
dnf install 'dnf-command(copr)'
dnf copr enable @caddy/caddy
dnf install caddy
```

### バイナリダウンロード

```bash
# 最新版をダウンロード
wget https://github.com/caddyserver/caddy/releases/download/v2.7.6/caddy_2.7.6_linux_amd64.tar.gz
tar -xzf caddy_2.7.6_linux_amd64.tar.gz
sudo mv caddy /usr/local/bin/
```

### インストール確認

```bash
caddy version
# v2.7.6
```

## 基本的な使い方

### 静的ファイルの配信

最もシンプルな例:

```bash
# カレントディレクトリを配信
caddy file-server --listen :8080
```

ブラウザで `http://localhost:8080` にアクセスすると、カレントディレクトリのファイルが表示されます。

### Caddyfileによる設定

`Caddyfile`を作成:

```caddyfile
# 基本的な静的サイト
localhost:8080

root * /var/www/html
file_server
```

起動:

```bash
caddy run
# または
caddy start  # バックグラウンドで起動
```

### 自動HTTPS

```caddyfile
example.com

root * /var/www/html
file_server
```

このたった3行で、**HTTPSが自動的に有効化**されます:

1. Let's Encryptから証明書を自動取得
2. HTTPからHTTPSへ自動リダイレクト
3. 証明書を自動更新

## Caddyfileの文法

### 基本構造

```caddyfile
# サイトブロック
example.com {
    # ディレクティブ
    root * /var/www/html
    file_server

    # ログ設定
    log {
        output file /var/log/caddy/access.log
    }
}
```

### 複数サイトの設定

```caddyfile
# サイト1
site1.com {
    root * /var/www/site1
    file_server
}

# サイト2
site2.com {
    root * /var/www/site2
    file_server
}
```

### パスベースのルーティング

```caddyfile
example.com {
    # ルートパス
    root * /var/www/html

    # /api/* は別の場所
    route /api/* {
        root * /var/www/api
        file_server
    }

    # 静的ファイル
    file_server
}
```

### リクエストマッチャー

```caddyfile
example.com {
    # パスマッチ
    @images path *.jpg *.png *.gif
    header @images Cache-Control "max-age=31536000"

    # ホストマッチ
    @api host api.example.com
    reverse_proxy @api localhost:3000

    # メソッドマッチ
    @post method POST
    reverse_proxy @post localhost:4000

    file_server
}
```

## リバースプロキシ

CaddyはNode.js、Python、Goなどのバックエンドサーバーへのリバースプロキシとして優れています。

### 基本的なリバースプロキシ

```caddyfile
example.com {
    reverse_proxy localhost:3000
}
```

### ヘッダーの設定

```caddyfile
example.com {
    reverse_proxy localhost:3000 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
```

### ロードバランシング

```caddyfile
example.com {
    reverse_proxy localhost:3000 localhost:3001 localhost:3002 {
        # ラウンドロビン（デフォルト）
        lb_policy round_robin

        # ヘルスチェック
        health_uri /health
        health_interval 10s
        health_timeout 5s
    }
}
```

### WebSocketサポート

```caddyfile
example.com {
    # WebSocketは自動的にサポート
    reverse_proxy /ws localhost:3000

    # 通常のHTTP
    reverse_proxy localhost:3000
}
```

## 実践例

### パターン1: Next.jsアプリケーション

```caddyfile
myapp.com {
    # Next.jsサーバー
    reverse_proxy localhost:3000

    # カスタムエラーページ
    handle_errors {
        @5xx expression {http.error.status_code} >= 500
        rewrite @5xx /500.html
        file_server
    }

    # ログ
    log {
        output file /var/log/caddy/myapp.log {
            roll_size 100mb
            roll_keep 5
        }
    }
}
```

### パターン2: APIゲートウェイ

```caddyfile
api.example.com {
    # ユーザーサービス
    route /users/* {
        reverse_proxy localhost:3001
    }

    # 商品サービス
    route /products/* {
        reverse_proxy localhost:3002
    }

    # 注文サービス
    route /orders/* {
        reverse_proxy localhost:3003
    }

    # CORS設定
    header {
        Access-Control-Allow-Origin *
        Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
        Access-Control-Allow-Headers *
    }

    # レート制限
    rate_limit {
        zone dynamic {
            key {remote_host}
            events 100
            window 1m
        }
    }
}
```

### パターン3: SPA + API

```caddyfile
app.example.com {
    # APIリクエスト
    route /api/* {
        reverse_proxy localhost:4000
    }

    # 静的ファイル（SPA）
    root * /var/www/app/dist

    # SPAルーティング
    try_files {path} /index.html
    file_server

    # キャッシュ設定
    header /assets/* {
        Cache-Control "public, max-age=31536000, immutable"
    }

    # Gzip圧縮
    encode gzip zstd
}
```

### パターン4: 複数環境のホスティング

```caddyfile
# 本番環境
prod.example.com {
    reverse_proxy localhost:3000

    log {
        output file /var/log/caddy/prod.log
        level INFO
    }
}

# ステージング環境
staging.example.com {
    reverse_proxy localhost:3001

    # Basic認証
    basicauth {
        user $2a$14$...hashed_password...
    }

    log {
        output file /var/log/caddy/staging.log
        level DEBUG
    }
}

# 開発環境
dev.example.com {
    reverse_proxy localhost:3002

    # 開発用ヘッダー
    header {
        X-Environment "development"
    }
}
```

## Docker連携

### Docker Composeでの使用

`docker-compose.yml`:

```yaml
version: '3.8'

services:
  caddy:
    image: caddy:2.7-alpine
    container_name: caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"  # HTTP/3
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - ./site:/srv
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - web

  app:
    image: node:18-alpine
    container_name: app
    working_dir: /app
    command: npm start
    volumes:
      - ./app:/app
    networks:
      - web

networks:
  web:
    driver: bridge

volumes:
  caddy_data:
  caddy_config:
```

`Caddyfile`:

```caddyfile
example.com {
    reverse_proxy app:3000
}
```

起動:

```bash
docker compose up -d
```

### Dockerfileでのビルド

`Dockerfile`:

```dockerfile
FROM caddy:2.7-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY site /srv

EXPOSE 80 443 443/udp
```

ビルド:

```bash
docker build -t my-caddy .
docker run -d -p 80:80 -p 443:443 -p 443:443/udp my-caddy
```

## セキュリティ設定

### セキュリティヘッダー

```caddyfile
example.com {
    header {
        # XSS保護
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"

        # CSP
        Content-Security-Policy "default-src 'self'"

        # HSTS
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"

        # Referrer Policy
        Referrer-Policy "strict-origin-when-cross-origin"

        # Permissions Policy
        Permissions-Policy "geolocation=(), microphone=(), camera=()"
    }

    reverse_proxy localhost:3000
}
```

### Basic認証

```caddyfile
example.com {
    basicauth /admin/* {
        # ユーザー名: admin
        # パスワード: password (ハッシュ化必要)
        admin $2a$14$...hashed_password...
    }

    reverse_proxy localhost:3000
}
```

パスワードのハッシュ化:

```bash
caddy hash-password --plaintext 'password'
```

### IP制限

```caddyfile
example.com {
    @blocked {
        not remote_ip 192.168.1.0/24 10.0.0.0/8
    }

    respond @blocked "Access Denied" 403

    reverse_proxy localhost:3000
}
```

## パフォーマンスチューニング

### 圧縮設定

```caddyfile
example.com {
    # Gzip/Zstd圧縮を有効化
    encode {
        gzip 6
        zstd
        minimum_length 1024
    }

    reverse_proxy localhost:3000
}
```

### キャッシュ制御

```caddyfile
example.com {
    # 静的アセットのキャッシュ
    @static {
        path *.css *.js *.jpg *.png *.svg *.woff2
    }

    header @static {
        Cache-Control "public, max-age=31536000, immutable"
    }

    # HTML は短めのキャッシュ
    @html {
        path *.html
    }

    header @html {
        Cache-Control "public, max-age=3600"
    }

    reverse_proxy localhost:3000
}
```

### HTTP/3の有効化

```caddyfile
{
    # グローバル設定
    servers {
        protocols h1 h2 h3
    }
}

example.com {
    reverse_proxy localhost:3000
}
```

## トラブルシューティング

### 設定の検証

```bash
# 設定ファイルのチェック
caddy validate --config Caddyfile

# 設定のフォーマット
caddy fmt --overwrite Caddyfile
```

### ログの確認

```bash
# Caddyのログを表示
journalctl -u caddy -f

# または
tail -f /var/log/caddy/access.log
```

### デバッグモード

```caddyfile
{
    debug
}

example.com {
    reverse_proxy localhost:3000
}
```

### よくあるエラー

#### エラー: "certificate unavailable"

**原因**: Let's Encryptが証明書を取得できない

**解決策**:
- ドメインのDNSが正しく設定されているか確認
- ポート80/443が開放されているか確認
- ファイアウォール設定を確認

#### エラー: "bind: address already in use"

**原因**: ポートが既に使用されている

**解決策**:
```bash
# ポートを使用しているプロセスを確認
sudo lsof -i :80
sudo lsof -i :443

# プロセスを停止
sudo systemctl stop nginx  # Nginxなど
```

## まとめ

Caddyは**自動HTTPS対応**と**シンプルな設定**により、モダンなWebサーバーの新しいスタンダードとなっています。

### Caddyの強み

- **ゼロコンフィグHTTPS**: 証明書の自動取得・更新
- **シンプルな設定**: 直感的なCaddyfile
- **最新プロトコル**: HTTP/2、HTTP/3対応
- **リバースプロキシ**: 簡単な設定で強力な機能

### 適用場面

- 個人プロジェクトの本番環境
- マイクロサービスのAPIゲートウェイ
- SPA + APIのホスティング
- Docker環境でのリバースプロキシ

### 学習リソース

- [公式ドキュメント](https://caddyserver.com/docs/)
- [Caddy Community](https://caddy.community/)
- [GitHub](https://github.com/caddyserver/caddy)

Caddyを使えば、複雑な証明書管理から解放され、開発に集中できます。次のプロジェクトでぜひ試してみてください。

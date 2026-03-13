---
title: "Let's Encrypt無料SSL証明書設定完全ガイド2026【Certbot+Nginx】"
description: "CertbotでLet's EncryptのSSL証明書を取得しNginxに設定する全手順を解説。自動更新・ワイルドカード証明書・複数ドメイン対応・HSTS設定まで、2026年最新版でHTTPS化を完全に実現する方法を説明します。"
pubDate: "2026-06-07"
tags: ["server", "インフラ", "セキュリティ"]
heroImage: "../../assets/blog-placeholder-5.jpg"
---

## はじめに

> *本記事にはアフィリエイト広告（A8.net）が含まれます。*

Webサイトを公開する際、**HTTPS化は現在では必須**だ。GoogleはHTTPSをSEOの評価指標に含めており、非HTTPSサイトはブラウザに「安全でない」と表示される。

Let's Encryptは非営利組織ISRGが提供する無料のSSL証明書サービスで、世界で最も広く使われているSSL証明書の一つだ。本記事ではCertbotを使ってLet's EncryptのSSL証明書をUbuntu VPS上のNginxに設定する全手順を解説する。

> **免責事項**: ツールのバージョン・コマンドは記事執筆時点の情報です。最新情報は各公式ドキュメントをご確認ください。

<div style="padding:1.5em;background:#f0f7ff;border-radius:8px;border-left:4px solid #0066cc;margin:1.5em 0;">
<strong>SSL設定に最適なVPS</strong><br>
国内DCでIPv6対応・NVMe SSD搭載のXServerVPSがSSL設定込みのWebサーバー構築に最適。<br>
<a href="https://px.a8.net/svt/ejp?a8mat=4AZ9C2+2ZRJL6+5GDG+NTJWY" rel="noopener sponsored" target="_blank" style="display:inline-block;margin-top:0.75em;background:#0066cc;color:white;padding:10px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">→ XServerVPS 公式サイトで詳細を見る</a>
</div>

---

## 前提環境

- OS: Ubuntu 22.04 LTS
- Nginx インストール済み・起動中
- 独自ドメイン取得済み
- ドメインのAレコードがサーバーIPに向いている
- UFWでポート80・443が開放済み

---

## 目次

1. Let's Encryptとは
2. Certbotのインストール
3. SSL証明書の取得（Nginx自動設定）
4. 取得後の設定確認
5. 手動でのHTTPS設定（詳細版）
6. ワイルドカード証明書の取得
7. 複数ドメインへの対応
8. 自動更新の設定と確認
9. SSL設定のセキュリティ強化
10. 証明書の管理コマンド

---

## 1. Let's Encryptとは

Let's Encryptは以下の特徴を持つSSL証明書サービスだ。

| 項目 | 内容 |
|------|------|
| 費用 | **完全無料** |
| 有効期限 | **90日間**（自動更新で実質無期限） |
| ドメイン認証 | DV（ドメイン認証型） |
| ワイルドカード | 対応（DNS-01チャレンジが必要） |
| マルチドメイン | 対応（SAN証明書、最大100ドメイン） |
| 発行速度 | **数秒〜数分** |

有効期限が90日と短いが、Certbotによる自動更新（30日前から自動）で実質的に永続利用できる。

---

## 2. Certbotのインストール

### snap経由でのインストール（推奨）

Ubuntu 22.04ではsnapを使ったインストールが公式推奨だ。

```bash
# snapdが入っているか確認
snap --version

# snapdのインストール（必要な場合）
sudo apt install snapd -y
sudo snap install core
sudo snap refresh core

# 古いcertbotがある場合はアンインストール
sudo apt remove certbot -y

# Certbotをsnapでインストール
sudo snap install --classic certbot

# certbotコマンドを使えるようにシンボリックリンクを作成
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# インストール確認
certbot --version
# certbot 2.x.x
```

### apt経由でのインストール（代替手段）

```bash
# Certbotのリポジトリを追加
sudo apt install software-properties-common -y
sudo add-apt-repository universe -y
sudo apt update

# Certbotとpython3-certbot-nginxをインストール
sudo apt install certbot python3-certbot-nginx -y

# バージョン確認
certbot --version
```

---

## 3. SSL証明書の取得（Nginx自動設定）

Certbotの `--nginx` オプションを使うと、Nginxの設定を自動的に更新してくれる。

```bash
# 単一ドメインの証明書取得（Nginxの設定を自動更新）
sudo certbot --nginx -d example.com -d www.example.com
```

コマンド実行後、以下の質問に答える。

```
Saving debug log to /var/log/letsencrypt/letsencrypt.log
Enter email address (used for urgent renewal and security notices)
(Enter 'c' to cancel): admin@example.com   # メールアドレスを入力

- - - - - - - - - - - - - - - - - - - - -
Please read the Terms of Service at
https://letsencrypt.org/documents/LE-SA-v1.3-September-21-2022.pdf
- - - - - - - - - - - - - - - - - - - - -
(Y)es/(N)o: Y   # Yを入力

- - - - - - - - - - - - - - - - - - - - -
Would you be willing to share your email address with the Electronic
Frontier Foundation, a founding partner of the Let's Encrypt project...
- - - - - - - - - - - - - - - - - - - - -
(Y)es/(N)o: N   # 任意

Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/example.com/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/example.com/privkey.pem
This certificate expires on 2026-09-07.
```

---

## 4. 取得後の設定確認

```bash
# SSL証明書の情報を確認
sudo certbot certificates

# 出力例
# Found the following certs:
#   Certificate Name: example.com
#     Serial Number: xxxxxx
#     Key Type: ECDSA
#     Domains: example.com www.example.com
#     Expiry Date: 2026-09-07 09:00:00+00:00 (VALID: 89 days)
#     Certificate Path: /etc/letsencrypt/live/example.com/fullchain.pem
#     Private Key Path: /etc/letsencrypt/live/example.com/privkey.pem

# Nginxの設定構文チェック
sudo nginx -t

# Nginxをリロード
sudo systemctl reload nginx

# SSL接続テスト
curl -I https://example.com
# HTTP/2 200
# server: nginx/1.24.0
# ...
```

### ブラウザでSSL確認

ブラウザでhttps://example.comにアクセスして鍵アイコンが表示されれば成功だ。

---

## 5. 手動でのHTTPS設定（詳細版）

`--nginx` オプションでCertbotが自動設定する内容を手動で制御したい場合は以下のようにする。

```bash
# Nginx設定を変更せずに証明書だけ取得
sudo certbot certonly --nginx -d example.com -d www.example.com
```

取得した証明書を手動でNginx設定に組み込む。

```nginx
# /etc/nginx/sites-available/example.com
server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;

    # HTTPをHTTPSにリダイレクト
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name example.com www.example.com;

    # ドキュメントルート
    root /var/www/example.com/html;
    index index.html index.htm;

    # SSL証明書の設定
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # Let's Encryptが生成したSSLオプション
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # セキュリティヘッダー
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        try_files $uri $uri/ =404;
    }

    # アクセスログ・エラーログ
    access_log /var/log/nginx/example.com.access.log;
    error_log  /var/log/nginx/example.com.error.log;
}
```

---

## 6. ワイルドカード証明書の取得

ワイルドカード証明書（`*.example.com`）を使うと、サブドメイン（blog.example.com、api.example.com等）すべてに1枚の証明書を使える。取得にはDNS-01チャレンジが必要だ。

```bash
# ワイルドカード証明書の取得（手動DNSチャレンジ）
sudo certbot certonly \
  --manual \
  --preferred-challenges dns \
  -d example.com \
  -d "*.example.com"
```

コマンド実行中に以下のようなTXTレコードの追加を求められる。

```
Please deploy a DNS TXT record under the name:
_acme-challenge.example.com

with the following value:
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Press Enter to Continue
```

DNSプロバイダの管理画面で `_acme-challenge.example.com` にTXTレコードを追加し、伝播を待ってからEnterを押す。

```bash
# DNS伝播の確認
dig TXT _acme-challenge.example.com
# または
nslookup -type=TXT _acme-challenge.example.com
```

---

## 7. 複数ドメインへの対応

```bash
# 複数ドメインを一度に取得
sudo certbot --nginx \
  -d example.com \
  -d www.example.com \
  -d api.example.com \
  -d blog.example.com

# または既存の証明書にドメインを追加
sudo certbot --expand --cert-name example.com \
  -d example.com \
  -d www.example.com \
  -d new-subdomain.example.com
```

---

## 8. 自動更新の設定と確認

Let's Encryptの証明書は90日で期限切れになるが、Certbotが自動更新してくれる。

### 自動更新タイマーの確認

```bash
# systemdタイマーの確認
sudo systemctl status snap.certbot.renew.timer
# または
sudo systemctl list-timers | grep certbot

# certbot.timerの確認（apt版）
sudo systemctl status certbot.timer
sudo systemctl list-timers certbot
```

### 自動更新のテスト

```bash
# ドライラン（実際には更新しない）でテスト
sudo certbot renew --dry-run

# 成功例
# Congratulations, all simulated renewals succeeded:
#   /etc/letsencrypt/live/example.com/fullchain.pem (success)
```

### 手動更新

```bash
# 今すぐ更新（30日以上残っていても強制更新したい場合）
sudo certbot renew --force-renewal

# 特定の証明書のみ更新
sudo certbot renew --cert-name example.com
```

### 更新後にNginxをリロードする設定

```bash
# renewalの設定ファイルを確認
sudo cat /etc/letsencrypt/renewal/example.com.conf

# deploy-hookを追加
sudo nano /etc/letsencrypt/renewal/example.com.conf
```

```ini
# /etc/letsencrypt/renewal/example.com.conf
[renewalparams]
account = xxxxxxxxxx
authenticator = nginx
installer = nginx
server = https://acme-v02.api.letsencrypt.org/directory

# 更新後にNginxをリロード
renew_hook = systemctl reload nginx
```

または `/etc/letsencrypt/renewal-hooks/deploy/` にスクリプトを配置する方法もある。

```bash
# Nginxリロードスクリプトを作成
sudo nano /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

```bash
#!/bin/bash
systemctl reload nginx
```

```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

---

## 9. SSL設定のセキュリティ強化

### TLSバージョンと暗号スイートの最適化

```nginx
# /etc/nginx/snippets/ssl-strong.conf

# TLSバージョン（1.2と1.3のみ許可）
ssl_protocols TLSv1.2 TLSv1.3;

# 暗号スイート（TLS 1.3はブラウザに任せる）
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256;
ssl_prefer_server_ciphers off;

# DHパラメータ（2048bit以上）
ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

# SSLセッションキャッシュ
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 1d;
ssl_session_tickets off;

# OCSP Stapling（証明書失効確認を高速化）
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
```

### SSL Labsでグレード確認

```bash
# SSLのセキュリティスコアを確認
# https://www.ssllabs.com/ssltest/analyze.html?d=example.com にアクセス
# A+ グレードを目指す
```

### HSTSプリロードへの登録

```nginx
# HSTSヘッダーにpreloadを追加
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

```bash
# HSTSプリロードリストへの登録
# https://hstspreload.org/ で登録申請
# （一度登録すると解除が困難なため十分にテストしてから登録する）
```

---

## 10. 証明書の管理コマンド

```bash
# インストール済み証明書の一覧
sudo certbot certificates

# 証明書の削除
sudo certbot delete --cert-name example.com

# ドメインの削除（証明書からドメインを削除）
sudo certbot --cert-name example.com --cert-name example.com -d example.com
# ※ ドメインを削除する場合は残したいドメインのみを指定して再実行

# 証明書の場所
ls -la /etc/letsencrypt/live/example.com/
# cert.pem      ← サーバー証明書
# chain.pem     ← 中間証明書
# fullchain.pem ← サーバー証明書 + 中間証明書（Nginxではこれを使う）
# privkey.pem   ← 秘密鍵

# ログの確認
sudo cat /var/log/letsencrypt/letsencrypt.log | tail -50
```

---

## トラブルシューティング

### チャレンジが失敗する場合

```bash
# ポート80が開いているか確認
sudo ss -tlnp | grep :80

# DNSが正しく設定されているか確認
dig +short example.com
nslookup example.com

# UFWでポート80が許可されているか確認
sudo ufw status | grep -E "80|Nginx"

# Certbotの詳細ログを確認
sudo cat /var/log/letsencrypt/letsencrypt.log
```

### 「too many certificates already issued」エラー

Let's Encryptにはレート制限がある。同一ドメインに対して週5回まで同じ証明書を発行できる。

```bash
# レート制限を確認
# https://letsencrypt.org/docs/rate-limits/

# ステージング環境でテスト（レート制限なし）
sudo certbot certonly --nginx \
  --staging \
  -d example.com \
  -d www.example.com
```

---

## Let's Encrypt設定チェックリスト

| 項目 | 確認方法 |
|------|---------|
| 証明書取得 | `sudo certbot certificates` |
| 自動更新 | `sudo certbot renew --dry-run` |
| HTTPS接続 | `curl -I https://example.com` |
| HTTP→HTTPS リダイレクト | `curl -I http://example.com` |
| HSTSヘッダー | `curl -I https://example.com \| grep Strict` |
| SSL Labs | A以上 |

<div style="padding:1.5em;background:#f0f7ff;border-radius:8px;border-left:4px solid #0066cc;margin:1.5em 0;">
<strong>SSL証明書設定済みサーバーをすぐ使いたい方へ</strong><br>
さくらのVPSはNginx・Let's Encryptのセットアップ手順が公式ドキュメントで充実。初心者にも安心。<br>
<a href="https://px.a8.net/svt/ejp?a8mat=4AZ9C1+G6VE0I+D8Y+CA67M" rel="noopener sponsored" target="_blank" style="display:inline-block;margin-top:0.75em;background:#e67e22;color:white;padding:10px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">→ さくらのVPS 公式サイトで詳細を見る</a>
<a href="https://px.a8.net/svt/ejp?a8mat=4AZ9C2+2ZRJL6+5GDG+NTJWY" rel="noopener sponsored" target="_blank" style="display:inline-block;margin-top:0.75em;margin-left:0.5em;background:#0066cc;color:white;padding:10px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">→ XServerVPS 公式サイトで申し込む</a>
</div>

---

## まとめ

本記事ではCertbotを使ったLet's Encrypt SSL証明書の設定方法を解説した。

- **Certbotのインストール**（snap推奨）
- **SSL証明書の自動取得**と `--nginx` による自動設定
- **ワイルドカード証明書**・複数ドメイン対応
- **自動更新**の設定確認
- **TLS強化**・HSTS・OCSP Staplingによるセキュリティ向上

90日ごとの自動更新が正しく設定されていれば、証明書の期限切れを心配することなく運用できる。

---

## 関連記事

- [NginxでWebサーバー構築完全ガイド2026](/blog/2026-06-06-nginx-web-server-setup-guide-2026/) — Nginxのインストールから設定まで
- [VPS初期設定完全ガイド2026](/blog/2026-06-02-vps-initial-setup-guide-2026/) — SSL設定前に行うサーバー初期設定
- [Dockerをサーバーで本番運用する完全ガイド2026](/blog/2026-06-03-docker-production-server-guide-2026/) — DockerとNginx・SSLの組み合わせ
- [XServerVPS vs ConoHa VPS徹底比較2026](/blog/2026-06-01-xservervps-vs-conoha-vps-2026/) — SSL設定を試せるVPS比較

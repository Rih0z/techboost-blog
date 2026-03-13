---
title: "VPS初期設定完全ガイド2026【Ubuntu・SSH鍵・Nginx・SSL】"
description: "VPS契約後にまずやるべきUbuntu初期設定を完全解説。SSH鍵認証・UFWファイアウォール・Nginxインストール・Let's EncryptによるSSL設定・fail2ban導入まで、コピペで動くコマンドで順を追って丁寧に説明します。"
pubDate: "2026-06-02"
tags: ["server", "インフラ", "linux"]
heroImage: '../../assets/thumbnails/2026-06-02-vps-initial-setup-guide-2026.jpg'
---

## はじめに

> *本記事にはアフィリエイト広告（A8.net）が含まれます。*

VPSを契約したはいいが、「初期設定で何をすればいいかわからない」というエンジニアは多い。

この記事ではUbuntu 22.04をベースに、**セキュアなVPS環境を構築するための初期設定全手順**をコピペ可能なコマンドで解説する。所要時間は約30〜60分。

> **免責事項**: 料金・仕様は記事執筆時点の情報です。各サービスの公式サイトで最新情報をご確認ください。

<div style="padding:1.5em;background:#f0f7ff;border-radius:8px;border-left:4px solid #0066cc;margin:1.5em 0;">
<strong>VPSをこれから契約する方へ</strong><br>
初期設定が終わったら本番運用に最適なVPSを選ぼう。NVMe SSD搭載のXServerVPSが本番環境におすすめ。<br>
<a href="https://px.a8.net/svt/ejp?a8mat=4AZ9C2+2ZRJL6+5GDG+NTJWY" rel="noopener sponsored" target="_blank" style="display:inline-block;margin-top:0.75em;background:#0066cc;color:white;padding:10px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">→ XServerVPS 公式サイトで申し込む</a>
</div>

---

## 前提環境

- OS: Ubuntu 22.04 LTS
- VPS: XServerVPS / ConoHa VPS 等（SSH接続可能なもの）
- ローカルPC: macOS / Linux（WSL2も可）
- ドメイン: 取得済み（SSL設定時に必要）

---

## Step 1: 初回SSH接続とrootパスワード変更

VPS契約直後は多くの場合、rootユーザーでパスワードログインになっている。まず接続を確認する。

```bash
# ローカルPCから初回接続（IPアドレスはコントロールパネルで確認）
ssh root@<YOUR_SERVER_IP>

# 接続後、まずrootパスワードを変更
passwd
# New password: （強力なパスワードを入力）
# Retype new password:
```

---

## Step 2: 一般ユーザーの作成とsudo権限付与

rootで常時ログインするのはセキュリティリスクがある。一般ユーザーを作成してsudo権限を与える。

```bash
# 新規ユーザー作成（例: deploy）
adduser deploy
# 名前等の入力はEnterで省略可

# sudo グループに追加
usermod -aG sudo deploy

# 確認
id deploy
# uid=1000(deploy) gid=1000(deploy) groups=1000(deploy),27(sudo)
```

---

## Step 3: SSH鍵認証の設定

パスワード認証を廃止してSSH鍵認証に切り替える。これがセキュリティ上最も重要なステップ。

### ローカルPCでSSH鍵ペアを生成

```bash
# ローカルPC（macOS/Linux）で実行
# Ed25519方式（RSAより安全・鍵サイズが小さい）
ssh-keygen -t ed25519 -C "your-email@example.com" -f ~/.ssh/vps_key

# 確認
ls -la ~/.ssh/vps_key*
# -rw-------  vps_key       ← 秘密鍵（絶対に外部へ渡さない）
# -rw-r--r--  vps_key.pub   ← 公開鍵（サーバーに登録する）
```

### サーバーに公開鍵を登録

```bash
# ローカルPCから公開鍵をサーバーにコピー
ssh-copy-id -i ~/.ssh/vps_key.pub deploy@<YOUR_SERVER_IP>

# または手動で登録（ssh-copy-idが使えない場合）
# サーバー側でdeploy ユーザーとして実行:
mkdir -p ~/.ssh
chmod 700 ~/.ssh
# ローカルで cat ~/.ssh/vps_key.pub の出力をコピーして貼り付け
echo "ssh-ed25519 AAAA... your-email@example.com" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### SSH鍵認証の動作確認

```bash
# ローカルPCから鍵認証でログインを確認
ssh -i ~/.ssh/vps_key deploy@<YOUR_SERVER_IP>

# ~/.ssh/config に設定を書いておくと便利
cat >> ~/.ssh/config << 'EOF'
Host myvps
    HostName <YOUR_SERVER_IP>
    User deploy
    IdentityFile ~/.ssh/vps_key
    ServerAliveInterval 60
EOF

# 以降はこれだけでログイン可能
ssh myvps
```

---

## Step 4: SSH設定の強化（パスワード認証無効化）

SSH鍵認証が確認できたら、パスワード認証を無効化する。

```bash
# サーバー側で実行（sudo権限が必要）
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak  # バックアップ

sudo vim /etc/ssh/sshd_config
# 以下の行を変更/追加:
```

```ini
# /etc/ssh/sshd_config 変更箇所
Port 22                        # 必要に応じて変更（例: 2222）
PermitRootLogin no             # rootログインを禁止
PasswordAuthentication no      # パスワード認証を無効化
PubkeyAuthentication yes       # 公開鍵認証を有効化
AuthorizedKeysFile .ssh/authorized_keys
MaxAuthTries 3                 # 認証試行回数を制限
AllowUsers deploy              # ログイン可能ユーザーを制限
```

```bash
# SSH設定のシンタックスチェック
sudo sshd -t

# 問題なければSSHサービスを再起動
sudo systemctl restart sshd

# 別ターミナルで接続確認してから元のセッションを閉じる
# （確認前に閉じると締め出される）
```

---

## Step 5: UFWファイアウォールの設定

Ubuntu標準の`ufw`でファイアウォールを設定する。

```bash
# 現在の状態確認
sudo ufw status

# SSHポートを許可（重要: これをやらないとSSH接続が切れる）
sudo ufw allow 22/tcp    # SSHポートを変更した場合はそのポート番号に変更
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# UFW有効化
sudo ufw --force enable

# 設定確認
sudo ufw status verbose
```

```
# 正常な設定例
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere
80/tcp                     ALLOW IN    Anywhere
443/tcp                    ALLOW IN    Anywhere
```

---

## Step 6: システムのアップデートと基本パッケージのインストール

```bash
# システム全体をアップデート
sudo apt update && sudo apt upgrade -y

# 必須パッケージのインストール
sudo apt install -y \
  curl \
  wget \
  git \
  vim \
  htop \
  tree \
  unzip \
  build-essential \
  software-properties-common \
  apt-transport-https \
  ca-certificates \
  gnupg \
  lsb-release

# 自動アップデート設定（セキュリティパッチを自動適用）
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## Step 7: タイムゾーンとロケールの設定

```bash
# タイムゾーンを日本時間（JST）に設定
sudo timedatectl set-timezone Asia/Tokyo

# 確認
timedatectl
# Local time: Wed 2026-06-01 12:00:00 JST

# ロケール設定（日本語環境が必要な場合）
sudo locale-gen ja_JP.UTF-8
sudo update-locale LANG=ja_JP.UTF-8

# NTPで時刻同期（Ubuntu 22.04はデフォルトでsystemd-timesyncdが動作）
systemctl status systemd-timesyncd
```

---

## Step 8: Nginxのインストールと基本設定

WebサーバーとしてNginxをインストールする。

```bash
# Nginxインストール
sudo apt install -y nginx

# 起動・自動起動設定
sudo systemctl start nginx
sudo systemctl enable nginx

# 起動確認
sudo systemctl status nginx
curl -I http://localhost
# HTTP/1.1 200 OK
```

### Nginx基本設定ファイル

```nginx
# /etc/nginx/sites-available/myapp.conf
server {
    listen 80;
    server_name example.com www.example.com;

    # セキュリティヘッダー
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Webルートディレクトリ
    root /var/www/myapp;
    index index.html index.htm;

    location / {
        try_files $uri $uri/ =404;
    }

    # ログ設定
    access_log /var/log/nginx/myapp.access.log;
    error_log /var/log/nginx/myapp.error.log;
}
```

```bash
# 設定ファイルを有効化
sudo ln -s /etc/nginx/sites-available/myapp.conf /etc/nginx/sites-enabled/

# デフォルト設定を無効化
sudo rm /etc/nginx/sites-enabled/default

# 設定チェック
sudo nginx -t

# Nginx再起動
sudo systemctl reload nginx
```

---

## Step 9: Let's EncryptでSSL証明書を取得

`certbot`を使って無料のSSL証明書を取得する。

```bash
# Certbotインストール
sudo apt install -y certbot python3-certbot-nginx

# SSL証明書の取得（ドメインが必要）
sudo certbot --nginx -d example.com -d www.example.com \
  --email your-email@example.com \
  --agree-tos \
  --non-interactive

# 自動更新の確認（cronまたはsystemdで自動更新される）
sudo certbot renew --dry-run
```

### SSL設定後のNginx設定（certbotが自動生成）

```nginx
# /etc/nginx/sites-available/myapp.conf（certbot適用後）
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;  # HTTPSへリダイレクト
}

server {
    listen 443 ssl;
    server_name example.com www.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    add_header Strict-Transport-Security "max-age=63072000" always;

    root /var/www/myapp;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

---

## Step 10: fail2banでブルートフォース攻撃を防ぐ

```bash
# fail2banインストール
sudo apt install -y fail2ban

# カスタム設定ファイルを作成
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

sudo vim /etc/fail2ban/jail.local
```

```ini
# /etc/fail2ban/jail.local の主要設定
[DEFAULT]
bantime  = 3600      # 1時間BAN
findtime  = 600      # 10分以内に
maxretry = 5         # 5回失敗でBAN
banaction = ufw      # UFWでIPブロック

[sshd]
enabled = true
port    = ssh
logpath = %(sshd_log)s
backend = %(sshd_backend)s

[nginx-http-auth]
enabled  = true
port     = http,https
logpath  = /var/log/nginx/error.log
```

```bash
# fail2ban起動
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# 状態確認
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

---

## Step 11: swap領域の設定（メモリ不足対策）

VPSのメモリが少ない場合（2GB以下）はswapを設定する。

```bash
# 現在のswap確認
free -h
swapon --show

# 2GBのswapファイルを作成
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 永続化（再起動後も有効にする）
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# swappiness調整（デフォルト60→10に下げてRAM優先）
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# 確認
free -h
```

---

## 初期設定完了チェックリスト

設定が完了したら以下を確認する。

```bash
# 1. SSH鍵認証でログインできるか
ssh -i ~/.ssh/vps_key deploy@<YOUR_SERVER_IP>

# 2. rootログインが拒否されるか
ssh root@<YOUR_SERVER_IP>
# Permission denied (publickey) → OK

# 3. UFWが有効か
sudo ufw status

# 4. Nginxが動作しているか
curl -I https://example.com

# 5. SSL証明書が有効か
echo | openssl s_client -connect example.com:443 2>/dev/null | openssl x509 -noout -dates

# 6. fail2banが動作しているか
sudo fail2ban-client status

# 7. 自動アップデートが設定されているか
systemctl status unattended-upgrades
```

---

## おすすめVPSサービス

<div style="display:flex;flex-direction:column;gap:1em;margin:2em 0;">

<div style="padding:1.5em;background:#f0f7ff;border-radius:8px;border-left:4px solid #0066cc;">
<strong>XServerVPS — パフォーマンス重視の本番運用に</strong><br>
NVMe SSD搭載で高速。Ubuntu 22.04 + Dockerテンプレートで即座に環境構築可能。<br>
<a href="https://px.a8.net/svt/ejp?a8mat=4AZ9C2+2ZRJL6+5GDG+NTJWY" rel="noopener sponsored" target="_blank" style="display:inline-block;margin-top:0.75em;background:#0066cc;color:white;padding:10px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">→ XServerVPS 公式サイトで申し込む</a>
</div>

<div style="padding:1.5em;background:#fff7f0;border-radius:8px;border-left:4px solid #e67e22;">
<strong>ConoHa WING — WordPressホスティング・個人ブログに</strong><br>
使いやすいUIと低コスト。WordPressなら専用のConoHa WINGが最適。<br>
<a href="https://px.a8.net/svt/ejp?a8mat=4AZBO0+C968T6+50+5SJPS2" rel="noopener sponsored" target="_blank" style="display:inline-block;margin-top:0.75em;background:#e67e22;color:white;padding:10px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">→ ConoHa WING 公式サイトで詳細を見る</a>
</div>

</div>

---

## まとめ

VPS初期設定のポイントをまとめる。

| ステップ | 内容 | 重要度 |
|---------|------|--------|
| Step 1-2 | ユーザー作成・sudo設定 | ★★★ |
| Step 3-4 | SSH鍵認証・パスワード認証無効化 | ★★★ |
| Step 5 | UFWファイアウォール | ★★★ |
| Step 6-7 | アップデート・タイムゾーン | ★★☆ |
| Step 8 | Nginxインストール | ★★★ |
| Step 9 | SSL証明書（Let's Encrypt） | ★★★ |
| Step 10 | fail2ban | ★★☆ |
| Step 11 | swap設定 | ★☆☆ |

セキュリティ関連（SSH鍵・UFW・fail2ban）は必須。残りは用途に応じて設定する。

VPSを安全に運用するための土台となる設定なので、契約直後に必ず実施しよう。

---

## 関連記事

- [XServerVPS vs ConoHa VPS徹底比較2026](/blog/2026-06-01-xservervps-vs-conoha-vps-2026/)
- [Dockerをサーバーで本番運用する完全ガイド2026](/blog/2026-06-03-docker-production-server-guide-2026/)
- [レンタルサーバー vs VPS vs クラウド 選び方2026](/blog/2026-06-05-server-types-comparison-2026/)

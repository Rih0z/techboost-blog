---
title: "サーバー監視・アラート設定完全ガイド2026【UptimeKuma+Prometheus】"
description: "UptimeKuma・Prometheus・AlertmanagerでVPSの死活監視とアラートを設定する全手順を解説。Grafanaダッシュボード・Slack/Discord通知・CPU/メモリ閾値アラートまで2026年最新の監視基盤構築を詳しく説明します。"
pubDate: "2026-03-07"
tags: ["server", "インフラ", "監視"]
heroImage: '../../assets/thumbnails/2026-06-10-server-monitoring-alert-guide-2026.jpg'
---

## はじめに

> *本記事にはアフィリエイト広告（A8.net）が含まれます。*

サーバーが落ちても気づかない、ディスクがいっぱいになってWebサービスが停止した、CPUが100%になっているのに誰も知らなかった——こうした問題はすべて**監視・アラートの不備**が原因だ。

本記事では**UptimeKuma**（シンプルな死活監視）と**Prometheus + Alertmanager**（本格的なメトリクス監視）を組み合わせたVPS監視基盤の構築方法を解説する。Slack/Discordへのリアルタイムアラートも設定し、問題発生を即座に検知できる体制を整える。

> **免責事項**: ツールのバージョン・設定は記事執筆時点の情報です。最新の公式ドキュメントも合わせてご確認ください。

<div style="padding:1.5em;background:#f0f7ff;border-radius:8px;border-left:4px solid #0066cc;margin:1.5em 0;">
<strong>監視基盤を構築するならVPSが最適</strong><br>
Prometheus・Grafanaなどの監視ツールを自由にインストールできるXServerVPS・ConoHa VPSがおすすめ。<br>
<a href="https://px.a8.net/svt/ejp?a8mat=4AZ9C2+2ZRJL6+5GDG+NTJWY" rel="noopener sponsored" target="_blank" style="display:inline-block;margin-top:0.75em;background:#0066cc;color:white;padding:10px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">→ XServerVPS 公式サイトで詳細を見る</a>
</div>

---

## 前提環境

- OS: Ubuntu 22.04 LTS
- VPS: XServerVPS / ConoHa VPS / さくらのVPS等
- Docker & Docker Compose インストール済み（Prometheusスタックで使用）
- Nginx インストール済み

---

## 目次

1. 監視基盤の全体設計
2. UptimeKumaで死活監視
3. Node Exporterのインストール
4. Prometheusのインストールと設定
5. Alertmanagerでアラート設定
6. Grafanaダッシュボードの構築
7. Docker Composeで監視スタックを一括構築
8. Nginxリバースプロキシで監視UIを公開
9. アラートルールのカスタマイズ
10. 監視のベストプラクティス

---

## 1. 監視基盤の全体設計

```
監視対象VPS
├── Node Exporter :9100  ← CPU/メモリ/ディスクメトリクスを収集
├── アプリケーション
└── Nginx

監視サーバー（同一VPS or 別VPS）
├── UptimeKuma :3001     ← 死活監視・HTTP監視
├── Prometheus :9090     ← メトリクス収集・アラートルール評価
├── Alertmanager :9093   ← アラート通知（Slack/Email）
└── Grafana :3000        ← ダッシュボード可視化

通知先
├── Slack #alerts        ← リアルタイムアラート
└── Email                ← 重大アラート
```

---

## 2. UptimeKumaで死活監視

UptimeKumaはシンプルで高機能な死活監視ツールだ。WebサイトのHTTP監視・TCPポート監視・DNS監視などをブラウザUIで簡単に設定できる。

### Dockerでインストール

```bash
# UptimeKuma用ディレクトリを作成
mkdir -p /opt/uptime-kuma/data

# Dockerで起動
docker run -d \
  --name uptime-kuma \
  --restart unless-stopped \
  -p 3001:3001 \
  -v /opt/uptime-kuma/data:/app/data \
  louislam/uptime-kuma:1

# 起動確認
docker ps | grep uptime-kuma
```

ブラウザで `http://サーバーIP:3001` にアクセスして初期設定を行う。

### 監視モニターの追加

管理画面で「Add New Monitor」をクリックして監視を追加する。

**HTTPモニター設定例（Webサイト死活監視）**

| 項目 | 設定値 |
|------|-------|
| Monitor Type | HTTP(s) |
| Friendly Name | メインサイト |
| URL | https://example.com |
| Heartbeat Interval | 60秒 |
| Retries | 3 |
| Accepted Status Codes | 200-299 |

**TCPモニター設定例（SSHポート監視）**

| 項目 | 設定値 |
|------|-------|
| Monitor Type | TCP Port |
| Hostname | your-server-ip |
| Port | 22 |
| Interval | 60秒 |

### Slack通知の設定

1. UptimeKuma管理画面 → Settings → Notifications → Add Notification
2. Notification Type: Slack を選択
3. Slack Webhook URLを入力（Slack App の Incoming Webhooks URLをコピー）
4. テスト送信で確認

---

## 3. Node Exporterのインストール

Node ExporterはLinuxサーバーのシステムメトリクスをPrometheusが収集できる形式でエクスポートする。

```bash
# 最新バージョンを確認
NODE_EXPORTER_VERSION="1.8.2"

# ダウンロード
wget https://github.com/prometheus/node_exporter/releases/download/v${NODE_EXPORTER_VERSION}/node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64.tar.gz

# 展開
tar xvfz node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64.tar.gz

# バイナリを移動
sudo mv node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64/node_exporter /usr/local/bin/
sudo chmod +x /usr/local/bin/node_exporter

# 専用ユーザーを作成
sudo useradd -r -s /bin/false node_exporter

# systemdサービスを作成
sudo nano /etc/systemd/system/node_exporter.service
```

```ini
# /etc/systemd/system/node_exporter.service
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter \
    --collector.systemd \
    --collector.processes \
    --web.listen-address=127.0.0.1:9100

Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
# サービスを有効化・起動
sudo systemctl daemon-reload
sudo systemctl enable node_exporter
sudo systemctl start node_exporter

# 動作確認
curl http://127.0.0.1:9100/metrics | head -20
# # HELP go_gc_duration_seconds A summary of the pause duration of garbage collection cycles.
# ...
```

---

## 4. Prometheusのインストールと設定

```bash
PROMETHEUS_VERSION="2.51.0"

# ダウンロード・展開
wget https://github.com/prometheus/prometheus/releases/download/v${PROMETHEUS_VERSION}/prometheus-${PROMETHEUS_VERSION}.linux-amd64.tar.gz
tar xvfz prometheus-${PROMETHEUS_VERSION}.linux-amd64.tar.gz

# バイナリを配置
sudo mv prometheus-${PROMETHEUS_VERSION}.linux-amd64/prometheus /usr/local/bin/
sudo mv prometheus-${PROMETHEUS_VERSION}.linux-amd64/promtool /usr/local/bin/

# 設定ディレクトリを作成
sudo mkdir -p /etc/prometheus /var/lib/prometheus
sudo useradd -r -s /bin/false prometheus
sudo chown -R prometheus:prometheus /etc/prometheus /var/lib/prometheus

# Prometheusの設定ファイルを作成
sudo nano /etc/prometheus/prometheus.yml
```

```yaml
# /etc/prometheus/prometheus.yml
global:
  scrape_interval: 15s        # メトリクス収集間隔
  evaluation_interval: 15s    # アラートルール評価間隔
  scrape_timeout: 10s

# Alertmanagerの接続設定
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - localhost:9093

# アラートルールファイル
rule_files:
  - "/etc/prometheus/rules/*.yml"

# スクレイプ（収集）設定
scrape_configs:
  # Prometheus自身の監視
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]

  # Node Exporterからサーバーメトリクスを収集
  - job_name: "node"
    static_configs:
      - targets: ["localhost:9100"]
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        replacement: "web-server-01"

  # Nginxの監視（nginx-prometheus-exporterを使用）
  - job_name: "nginx"
    static_configs:
      - targets: ["localhost:9113"]
```

```bash
# systemdサービスを作成
sudo nano /etc/systemd/system/prometheus.service
```

```ini
[Unit]
Description=Prometheus
After=network.target

[Service]
User=prometheus
Group=prometheus
Type=simple
ExecStart=/usr/local/bin/prometheus \
    --config.file /etc/prometheus/prometheus.yml \
    --storage.tsdb.path /var/lib/prometheus/ \
    --storage.tsdb.retention.time=30d \
    --web.listen-address=127.0.0.1:9090

Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# 起動
sudo systemctl daemon-reload
sudo systemctl enable prometheus
sudo systemctl start prometheus

# 動作確認
curl -s http://127.0.0.1:9090/api/v1/query?query=up | python3 -m json.tool | head -20
```

---

## 5. Alertmanagerでアラート設定

### Alertmanagerのインストール

```bash
ALERTMANAGER_VERSION="0.27.0"

wget https://github.com/prometheus/alertmanager/releases/download/v${ALERTMANAGER_VERSION}/alertmanager-${ALERTMANAGER_VERSION}.linux-amd64.tar.gz
tar xvfz alertmanager-${ALERTMANAGER_VERSION}.linux-amd64.tar.gz

sudo mv alertmanager-${ALERTMANAGER_VERSION}.linux-amd64/alertmanager /usr/local/bin/
sudo mkdir -p /etc/alertmanager /var/lib/alertmanager
sudo useradd -r -s /bin/false alertmanager

# 設定ファイルを作成
sudo nano /etc/alertmanager/alertmanager.yml
```

```yaml
# /etc/alertmanager/alertmanager.yml
global:
  resolve_timeout: 5m
  slack_api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'

# ルーティング設定
route:
  group_by: ['alertname', 'instance']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 1h
  receiver: 'slack-critical'
  routes:
    # 警告レベルはSlackの別チャンネルへ
    - match:
        severity: warning
      receiver: 'slack-warning'
    # 重大アラートはメールも送信
    - match:
        severity: critical
      receiver: 'slack-critical'
      continue: true

# 通知先の設定
receivers:
  - name: 'slack-critical'
    slack_configs:
      - channel: '#server-alerts'
        send_resolved: true
        icon_emoji: ':fire:'
        title: '{{ template "slack.title" . }}'
        text: |
          {{ range .Alerts }}
          *アラート:* {{ .Annotations.summary }}
          *詳細:* {{ .Annotations.description }}
          *サーバー:* {{ .Labels.instance }}
          *重要度:* {{ .Labels.severity }}
          {{ end }}

  - name: 'slack-warning'
    slack_configs:
      - channel: '#server-warnings'
        send_resolved: true
        icon_emoji: ':warning:'
        title: '{{ template "slack.title" . }}'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}: {{ .Annotations.description }}{{ end }}'
```

```bash
# systemdサービス
sudo nano /etc/systemd/system/alertmanager.service
```

```ini
[Unit]
Description=Alertmanager
After=network.target

[Service]
User=alertmanager
Group=alertmanager
Type=simple
ExecStart=/usr/local/bin/alertmanager \
    --config.file /etc/alertmanager/alertmanager.yml \
    --storage.path /var/lib/alertmanager/ \
    --web.listen-address=127.0.0.1:9093

Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable alertmanager
sudo systemctl start alertmanager
```

### アラートルールの設定

```bash
sudo mkdir -p /etc/prometheus/rules
sudo nano /etc/prometheus/rules/server-alerts.yml
```

```yaml
# /etc/prometheus/rules/server-alerts.yml
groups:
  - name: server-alerts
    interval: 30s
    rules:
      # サーバーダウン検知
      - alert: InstanceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "サーバーがダウンしています"
          description: "{{ $labels.instance }} が1分以上応答していません"

      # CPU使用率が80%以上
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "CPU使用率が高い ({{ $labels.instance }})"
          description: "CPU使用率が {{ $value | printf \"%.1f\" }}% で5分以上継続しています"

      # CPU使用率が95%以上
      - alert: CriticalCPUUsage
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 95
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "CPU使用率が危険水準 ({{ $labels.instance }})"
          description: "CPU使用率が {{ $value | printf \"%.1f\" }}% で2分以上継続しています"

      # メモリ使用率が85%以上
      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "メモリ使用率が高い ({{ $labels.instance }})"
          description: "メモリ使用率が {{ $value | printf \"%.1f\" }}% で5分以上継続しています"

      # ディスク使用率が85%以上
      - alert: HighDiskUsage
        expr: (1 - (node_filesystem_avail_bytes{fstype!="tmpfs"} / node_filesystem_size_bytes{fstype!="tmpfs"})) * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "ディスク使用率が高い ({{ $labels.instance }})"
          description: "{{ $labels.device }} のディスク使用率が {{ $value | printf \"%.1f\" }}% です"

      # ディスク使用率が95%以上（緊急）
      - alert: CriticalDiskUsage
        expr: (1 - (node_filesystem_avail_bytes{fstype!="tmpfs"} / node_filesystem_size_bytes{fstype!="tmpfs"})) * 100 > 95
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "ディスク残容量が危険水準"
          description: "{{ $labels.device }} のディスク使用率が {{ $value | printf \"%.1f\" }}% です。緊急対応が必要です"

      # Nginxのダウン
      - alert: NginxDown
        expr: nginx_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Nginxが停止しています"
          description: "Nginxの応答がなくなっています。即座に確認してください"
```

```bash
# アラートルールの構文チェック
promtool check rules /etc/prometheus/rules/server-alerts.yml

# Prometheusを再起動
sudo systemctl reload prometheus
```

---

## 6. Grafanaダッシュボードの構築

```bash
# Grafanaのリポジトリを追加（Ubuntu 22.04推奨の署名方式）
sudo apt install -y apt-transport-https software-properties-common
wget -q -O - https://packages.grafana.com/gpg.key | gpg --dearmor | sudo tee /usr/share/keyrings/grafana.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/grafana.gpg] https://packages.grafana.com/oss/deb stable main" | sudo tee /etc/apt/sources.list.d/grafana.list

sudo apt update
sudo apt install grafana -y

# 起動と自動起動
sudo systemctl start grafana-server
sudo systemctl enable grafana-server

# 動作確認（デフォルトポート3000）
sudo systemctl status grafana-server
```

### Grafanaの初期設定

1. ブラウザで `http://サーバーIP:3000` にアクセス
2. 初期ログイン: admin / admin（初回ログイン時にパスワード変更を求められる）
3. Configuration → Data Sources → Add data source
4. Prometheusを選択、URL: `http://localhost:9090` を設定

### Node Exporterダッシュボードのインポート

1. Grafana → Dashboards → Import
2. Dashboard ID: **1860**（Node Exporter Full）を入力
3. Prometheusデータソースを選択してインポート

これで以下のメトリクスが可視化される。

- CPU使用率・コアごとの内訳
- メモリ使用量・スワップ
- ディスクI/O・使用量
- ネットワーク送受信量
- システムロード・プロセス数

---

## 7. Docker Composeで監視スタックを一括構築

個別インストールの代わりに、Docker Composeで監視スタック全体をまとめて起動することもできる。

```bash
mkdir -p /opt/monitoring/{prometheus,alertmanager,grafana}
nano /opt/monitoring/docker-compose.yml
```

```yaml
# /opt/monitoring/docker-compose.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:v2.51.0
    container_name: prometheus
    restart: unless-stopped
    ports:
      - "127.0.0.1:9090:9090"
    volumes:
      - ./prometheus:/etc/prometheus
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'

  alertmanager:
    image: prom/alertmanager:v0.27.0
    container_name: alertmanager
    restart: unless-stopped
    ports:
      - "127.0.0.1:9093:9093"
    volumes:
      - ./alertmanager:/etc/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'

  grafana:
    image: grafana/grafana:10.3.0
    container_name: grafana
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=your-secure-password
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana

  node-exporter:
    image: prom/node-exporter:v1.8.2
    container_name: node-exporter
    restart: unless-stopped
    ports:
      - "127.0.0.1:9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'

volumes:
  prometheus_data:
  grafana_data:
```

```bash
# 起動
cd /opt/monitoring && docker compose up -d

# ログ確認
docker compose logs -f prometheus
```

---

## 8. Nginxリバースプロキシで監視UIを公開

監視ツールをSSL付きで安全に公開するためのNginx設定。

```nginx
# /etc/nginx/sites-available/monitoring.conf
server {
    listen 443 ssl http2;
    server_name monitoring.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # Basic認証（外部公開する場合は必須）
    auth_basic "Monitoring";
    auth_basic_user_file /etc/nginx/.htpasswd;

    # Grafana
    location /grafana/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Prometheus
    location /prometheus/ {
        proxy_pass http://127.0.0.1:9090/;
        proxy_set_header Host $host;
    }

    # UptimeKuma
    location /uptime/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

```bash
# Basic認証のユーザーを作成
sudo apt install apache2-utils -y
sudo htpasswd -c /etc/nginx/.htpasswd admin

# Nginx設定を有効化
sudo ln -s /etc/nginx/sites-available/monitoring.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 9. アラートルールのカスタマイズ

```yaml
# 追加のアラートルール例

  # SSL証明書の期限切れ警告（14日前）
  - alert: SSLCertExpiringSoon
    expr: probe_ssl_earliest_cert_expiry - time() < 14 * 24 * 3600
    for: 1h
    labels:
      severity: warning
    annotations:
      summary: "SSL証明書の期限が近づいています"
      description: "{{ $labels.instance }} のSSL証明書は {{ $value | humanizeDuration }} 後に期限切れになります"

  # ネットワークエラーレートが高い
  - alert: HighNetworkErrors
    expr: rate(node_network_receive_errs_total[5m]) > 10
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "ネットワークエラーが多発しています"
      description: "{{ $labels.device }} で毎秒 {{ $value | printf \"%.1f\" }} 件のネットワークエラーが発生しています"
```

---

## 10. 監視のベストプラクティス

### アラートの設計原則

| 原則 | 説明 |
|------|------|
| **アラート疲れを避ける** | 誤検知・低重要度のアラートを絞り込む |
| **明確なアクションを定義** | アラートごとに「誰が・何をすべきか」を記載 |
| **段階的なエスカレーション** | warning → critical → page の順で通知強度を上げる |
| **ダッシュボードとアラートを分離** | ダッシュボードは情報表示、アラートは異常検知に集中 |
| **定期的なアラートの見直し** | 月1回、無効なアラートをレビューして削除 |

### 最低限監視すべきメトリクス

```bash
# 現在のシステム状態を素早く確認するワンライナー
# CPU使用率
top -bn1 | grep "Cpu(s)" | awk '{print "CPU: " 100-$8 "%"}'

# メモリ使用率
free -m | awk 'NR==2{printf "Memory: %.1f%%\n", $3/$2*100}'

# ディスク使用率
df -h / | awk 'NR==2{print "Disk: " $5}'

# Nginx状態
systemctl is-active nginx && echo "Nginx: OK" || echo "Nginx: DOWN"

# 最近のエラーログ確認
sudo journalctl -p err -n 20 --no-pager
```

<div style="padding:1.5em;background:#f0f7ff;border-radius:8px;border-left:4px solid #0066cc;margin:1.5em 0;">
<strong>監視基盤の構築に使えるVPS</strong><br>
さくらのVPSは監視ツール（Prometheus・Grafana・UptimeKuma）の実行に十分なスペックで月額980円〜。<br>
<a href="https://px.a8.net/svt/ejp?a8mat=4AZ9C1+G6VE0I+D8Y+CA67M" rel="noopener sponsored" target="_blank" style="display:inline-block;margin-top:0.75em;background:#e67e22;color:white;padding:10px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">→ さくらのVPS 公式サイトで詳細を見る</a>
</div>

---

## 監視環境チェックリスト

| 項目 | 確認方法 |
|------|---------|
| Node Exporterが起動している | `curl http://localhost:9100/metrics \| head -5` |
| Prometheusがメトリクスを収集 | `http://localhost:9090/targets` で全ターゲットがUP |
| アラートルールが読み込まれている | `http://localhost:9090/rules` |
| Alertmanagerが起動 | `curl http://localhost:9093/-/healthy` |
| Grafanaにログインできる | `http://monitoring.example.com/grafana/` |
| テストアラートが届く | `amtool alert add alertname=Test --alertmanager.url=http://localhost:9093` |

---

## まとめ

本記事ではVPSの監視基盤として以下を構築する方法を解説した。

- **UptimeKuma**で死活監視・Slack通知
- **Node Exporter + Prometheus**でCPU/メモリ/ディスクを収集
- **Alertmanager**でアラートルール設定とSlack通知
- **Grafana**でダッシュボード可視化
- **Docker Compose**での監視スタック一括構築
- **Nginxリバースプロキシ + Basic認証**で安全な外部公開

監視基盤が整うとサーバー障害への対応速度が大幅に上がり、問題を発見できず機会損失するリスクを防げる。

---

## 関連記事

- [NginxでWebサーバー構築完全ガイド2026](/blog/2026-06-06-nginx-web-server-setup-guide-2026/) — 監視対象となるNginxの設定方法
- [GitHub ActionsでVPSに自動デプロイする方法2026](/blog/2026-06-08-github-actions-vps-deploy-2026/) — デプロイパイプラインと監視の組み合わせ
- [VPS初期設定完全ガイド2026](/blog/2026-06-02-vps-initial-setup-guide-2026/) — 監視ツールを入れる前のサーバー初期設定
- [XServerVPS vs ConoHa VPS徹底比較2026](/blog/2026-06-01-xservervps-vs-conoha-vps-2026/) — 監視基盤を動かすVPS選び

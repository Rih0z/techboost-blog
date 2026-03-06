---
title: 'n8n自動化ガイド｜Docker構築からAI連携まで'
description: 'n8nでワークフロー自動化を構築する方法を徹底解説。Docker環境構築からAPI連携・Webhook受信・AIノード統合・カスタムノード開発まで実践コード付きで紹介。Zapier/Makeとの料金・機能比較やセルフホスト運用のベストプラクティスも網羅。'
pubDate: '2026-03-05'
tags: ['server', '開発ツール', '自動化', 'Docker']
---

日々の開発業務には、驚くほど多くの「手作業の繰り返し」が潜んでいます。Slackに通知を飛ばす、スプレッドシートにデータを転記する、APIのレスポンスを加工して別のサービスに投げる。ひとつひとつは数分の作業でも、積み重なれば週に何時間も消えていきます。

n8nは、こうした繰り返し作業をビジュアルなワークフローとして組み立て、完全に自動化できるオープンソースツールです。ZapierやMakeと同じ領域のプロダクトですが、**セルフホストできる**という点で決定的に異なります。自分のサーバーで動かせるため、データが外部に流出するリスクがなく、実行回数の制限もありません。

この記事では、n8nのDocker構築から始めて、実際のワークフロー作成、API連携、Webhook、AIノードの活用、そしてZapier/Makeとの比較まで、実践的なコード付きで解説していきます。

---

## n8nとは何か

### オープンソースのワークフロー自動化ツール

n8n（"nodemation"と読みます）は、ドイツ・ベルリン発のワークフロー自動化プラットフォームです。2019年にJan Obernauserが開発を始め、現在はn8n GmbHが運営しています。

特徴を一言で表すなら、「**開発者フレンドリーなZapier**」です。GUIでノードを繋いでワークフローを構築しつつ、必要に応じてJavaScript/Pythonのコードを書き込むことができます。

### n8nの主な特徴

| 特徴 | 詳細 |
|------|------|
| オープンソース | Fair-code ライセンス（ソース公開・自己ホスト可能） |
| セルフホスト対応 | Docker / npm / Kubernetes で自前運用可能 |
| 400以上の連携 | Slack, GitHub, Google Sheets, PostgreSQL, OpenAI など |
| コード実行 | JavaScript / Python をワークフロー内で直接実行可能 |
| AIネイティブ | LLM連携ノード（OpenAI, Anthropic, Ollama）を標準搭載 |
| Webhook対応 | 外部サービスからのHTTPリクエストでワークフロー起動 |
| エラーハンドリング | リトライ・フォールバック・エラー通知を組み込み可能 |

### セルフホスト vs クラウド版

n8nには2つの利用形態があります。

```
┌─────────────────────────────────────────────────────────┐
│                    n8n の利用形態                         │
├────────────────────────┬────────────────────────────────┤
│    セルフホスト版        │       n8n Cloud               │
├────────────────────────┼────────────────────────────────┤
│ Docker/npm で自前構築   │ n8n.io でアカウント作成       │
│ 無料（インフラ費のみ）  │ 月額 €20〜                    │
│ データ完全管理          │ EU/USリージョン選択可能       │
│ カスタムノード追加可能  │ 自動アップデート              │
│ 実行回数 無制限        │ プランにより制限あり          │
│ メンテナンス 自己責任  │ マネージドで運用不要          │
└────────────────────────┴────────────────────────────────┘
```

個人開発者やスタートアップのように、コスト意識が高くて技術力もあるチームには、セルフホスト版が圧倒的におすすめです。月額数百円のVPS上で無制限にワークフローを動かせます。

---

## DockerでN8nを構築する

n8nの構築方法はいくつかありますが、本番運用を見据えるなら[Docker](/blog/docker-complete-guide)一択です。環境の再現性が保証され、アップデートもイメージの差し替えだけで済みます。

### 最小構成：Docker単体で起動

まずは最もシンプルな方法で動かしてみましょう。

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n
```

ブラウザで `http://localhost:5678` にアクセスすれば、n8nのセットアップ画面が表示されます。しかし、この方法では設定が不十分です。本番環境で使うには、Docker Composeで適切に構成する必要があります。

### 本番向け Docker Compose 構成

以下は、PostgreSQLをバックエンドDB、Nginxをリバースプロキシに使った本番向け構成です。

```yaml
# docker-compose.yml
version: '3.8'

services:
  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    container_name: n8n
    restart: always
    ports:
      - "5678:5678"
    environment:
      # 基本設定
      - N8N_HOST=n8n.example.com
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://n8n.example.com/

      # データベース設定（SQLiteからPostgreSQLへ）
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD}

      # セキュリティ
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_BASIC_AUTH_USER}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_BASIC_AUTH_PASSWORD}

      # 暗号化キー（ワークフロー内の認証情報を暗号化）
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}

      # タイムゾーン
      - GENERIC_TIMEZONE=Asia/Tokyo
      - TZ=Asia/Tokyo

      # 実行設定
      - EXECUTIONS_DATA_PRUNE=true
      - EXECUTIONS_DATA_MAX_AGE=168  # 7日間保持
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - n8n-network

  postgres:
    image: postgres:16-alpine
    container_name: n8n-postgres
    restart: always
    environment:
      - POSTGRES_USER=n8n
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=n8n
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U n8n"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - n8n-network

  nginx:
    image: nginx:alpine
    container_name: n8n-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - n8n
    networks:
      - n8n-network

volumes:
  n8n_data:
  postgres_data:

networks:
  n8n-network:
    driver: bridge
```

### 環境変数ファイル

Docker Composeと同じディレクトリに `.env` ファイルを作成します。

```bash
# .env
POSTGRES_PASSWORD=your-strong-password-here
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your-admin-password
N8N_ENCRYPTION_KEY=your-random-encryption-key

# 暗号化キーの生成方法
# openssl rand -hex 32
```

### Nginx リバースプロキシ設定

```nginx
# nginx.conf
upstream n8n {
    server n8n:5678;
}

server {
    listen 80;
    server_name n8n.example.com;

    # Let's Encrypt用
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name n8n.example.com;

    ssl_certificate /etc/letsencrypt/live/n8n.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/n8n.example.com/privkey.pem;

    # WebSocket対応（n8nのリアルタイム通信に必要）
    location / {
        proxy_pass http://n8n;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # タイムアウト設定（長時間実行ワークフロー対応）
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    # アップロードサイズ上限
    client_max_body_size 50m;
}
```

### 起動と初期設定

```bash
# 起動
docker compose up -d

# ログ確認
docker compose logs -f n8n

# 初回アクセス
# https://n8n.example.com にアクセスしてオーナーアカウントを作成
```

起動後にブラウザでアクセスすると、メールアドレスとパスワードの登録画面が表示されます。ここで作成するアカウントがn8nの管理者になります。

---

## ワークフローの基本概念

n8nのワークフローは、**ノード**（処理の単位）を**接続線**で繋いだ有向グラフです。データは左から右へ流れていきます。

### ノードの種類

```
┌─────────────────────────────────────────────────────┐
│                  ノードの分類                         │
├──────────────┬──────────────────────────────────────┤
│ トリガーノード │ ワークフローの開始点                  │
│              │ 例: Webhook, Cron, メール受信         │
├──────────────┼──────────────────────────────────────┤
│ アクションノード│ 外部サービスとの連携                  │
│              │ 例: Slack送信, DB操作, HTTP Request   │
├──────────────┼──────────────────────────────────────┤
│ ロジックノード │ データの加工・分岐・集約              │
│              │ 例: IF, Switch, Merge, Code          │
├──────────────┼──────────────────────────────────────┤
│ AIノード      │ LLMやベクトルDBとの連携              │
│              │ 例: OpenAI, Anthropic, Pinecone      │
└──────────────┴──────────────────────────────────────┘
```

### データの流れ

n8nでは、ノード間を流れるデータは**JSON配列**として表現されます。各要素は1つの「アイテム」と呼ばれます。

```json
[
  {
    "json": {
      "name": "田中太郎",
      "email": "tanaka@example.com",
      "role": "engineer"
    }
  },
  {
    "json": {
      "name": "鈴木花子",
      "email": "suzuki@example.com",
      "role": "designer"
    }
  }
]
```

後続ノードでは、`{{ $json.name }}` のような**式（Expression）**でデータにアクセスできます。これはn8n独自のテンプレート構文で、JavaScriptの式をそのまま埋め込めます。

```
# 式の例
{{ $json.name }}                         → "田中太郎"
{{ $json.email.split('@')[1] }}          → "example.com"
{{ $json.role === 'engineer' ? '開発' : 'その他' }} → "開発"
{{ DateTime.now().toFormat('yyyy-MM-dd') }}          → "2026-03-05"
```

---

## 実践ワークフロー 1：GitHub Issue → Slack通知

最初の実践例として、GitHubで新しいIssueが作成されたらSlackに通知を送るワークフローを構築します。

### ワークフローJSON

n8nのワークフローはJSON形式でエクスポート・インポートできます。以下がワークフロー定義の全体像です。

```json
{
  "name": "GitHub Issue → Slack通知",
  "nodes": [
    {
      "parameters": {
        "owner": "your-org",
        "repository": "your-repo",
        "events": ["issues"],
        "options": {}
      },
      "name": "GitHub Trigger",
      "type": "n8n-nodes-base.githubTrigger",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{ $json.action }}",
              "value2": "opened"
            }
          ]
        }
      },
      "name": "新規Issueのみ",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [470, 300]
    },
    {
      "parameters": {
        "channel": "#dev-notifications",
        "text": "=:github: 新しいIssueが作成されました\n*{{ $json.issue.title }}*\nby {{ $json.issue.user.login }}\n{{ $json.issue.html_url }}",
        "otherOptions": {}
      },
      "name": "Slack通知",
      "type": "n8n-nodes-base.slack",
      "typeVersion": 2,
      "position": [690, 280]
    }
  ],
  "connections": {
    "GitHub Trigger": {
      "main": [
        [{ "node": "新規Issueのみ", "type": "main", "index": 0 }]
      ]
    },
    "新規Issueのみ": {
      "main": [
        [{ "node": "Slack通知", "type": "main", "index": 0 }]
      ]
    }
  }
}
```

### 設定のポイント

1. **GitHub Trigger** ノードでは、GitHubアプリの認証情報（OAuth or Personal Access Token）を事前に登録しておく必要があります
2. **IF** ノードで `action === "opened"` をフィルタリングすることで、Issue編集やクローズ時の通知を防ぎます
3. **Slack** ノードでは、Bot Tokenの認証情報が必要です。Slack App管理画面で `chat:write` スコープを付与してください

---

## 実践ワークフロー 2：定期データ取得 → スプレッドシート

次に、外部APIからデータを定期取得してGoogle Sheetsに書き込むワークフローを作ります。これはレポート自動化の典型パターンです。

### Cron + HTTP Request + Google Sheets

```json
{
  "name": "日次レポート自動化",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "cronExpression",
              "expression": "0 9 * * 1-5"
            }
          ]
        }
      },
      "name": "毎朝9時（平日）",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "url": "https://api.example.com/metrics/daily",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "httpHeaderAuth",
        "options": {
          "response": {
            "response": {
              "responseFormat": "json"
            }
          }
        }
      },
      "name": "APIからデータ取得",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [470, 300]
    },
    {
      "parameters": {
        "jsCode": "// データを整形\nconst items = $input.all();\nconst today = DateTime.now().toFormat('yyyy-MM-dd');\n\nreturn items.map(item => ({\n  json: {\n    date: today,\n    activeUsers: item.json.metrics.active_users,\n    revenue: item.json.metrics.revenue,\n    conversionRate: (item.json.metrics.conversions / item.json.metrics.visits * 100).toFixed(2) + '%'\n  }\n}));"
      },
      "name": "データ整形",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [690, 300]
    },
    {
      "parameters": {
        "operation": "append",
        "documentId": "your-spreadsheet-id",
        "sheetName": "日次レポート",
        "columns": {
          "mappingMode": "autoMapInputData"
        }
      },
      "name": "Google Sheets書き込み",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 4,
      "position": [910, 300]
    }
  ]
}
```

### Codeノードの活用

上記ワークフローのポイントは **Code** ノードです。n8nのCodeノードではJavaScriptまたはPythonを書けます。

```javascript
// Codeノード内のJavaScript例

// 入力データの取得
const items = $input.all();

// Luxon（日時ライブラリ）が標準で使える
const now = DateTime.now().setZone('Asia/Tokyo');

// 各アイテムを加工
return items.map(item => ({
  json: {
    ...item.json,
    processedAt: now.toISO(),
    summary: `${item.json.name}: ¥${item.json.amount.toLocaleString()}`
  }
}));
```

```python
# Codeノード内のPython例
import json
from datetime import datetime

items = []
for item in _input.all():
    data = item.json
    items.append({
        "json": {
            "name": data["name"],
            "processed": True,
            "timestamp": datetime.now().isoformat()
        }
    })

return items
```

---

## Webhook：外部からワークフローを起動する

Webhookは、n8nの中でも特に実用性の高い機能です。外部サービスからHTTPリクエストを受け取ることで、リアルタイムにワークフローを起動できます。

### 基本的なWebhookワークフロー

```json
{
  "name": "Webhook受信処理",
  "nodes": [
    {
      "parameters": {
        "path": "incoming-data",
        "httpMethod": "POST",
        "responseMode": "responseNode",
        "options": {}
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1.1,
      "position": [250, 300],
      "webhookId": "incoming-data"
    },
    {
      "parameters": {
        "jsCode": "const body = $input.first().json.body;\n\n// バリデーション\nif (!body.event || !body.data) {\n  throw new Error('Invalid payload: event and data are required');\n}\n\nreturn [{ json: { event: body.event, data: body.data, receivedAt: new Date().toISOString() } }];"
      },
      "name": "バリデーション",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [470, 300]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={ \"status\": \"accepted\", \"processedAt\": \"{{ $json.receivedAt }}\" }"
      },
      "name": "レスポンス返却",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [690, 300]
    }
  ]
}
```

### Webhookのテスト方法

n8nにはテスト用と本番用の2つのWebhook URLが存在します。

```bash
# テスト用（エディタでワークフローを開いた状態でのみ動作）
curl -X POST https://n8n.example.com/webhook-test/incoming-data \
  -H "Content-Type: application/json" \
  -d '{"event": "order.created", "data": {"orderId": "12345", "amount": 9800}}'

# 本番用（ワークフローをアクティブにすると使える）
curl -X POST https://n8n.example.com/webhook/incoming-data \
  -H "Content-Type: application/json" \
  -d '{"event": "order.created", "data": {"orderId": "12345", "amount": 9800}}'
```

### Webhook認証の実装

本番環境では、Webhookに認証を付けることが不可欠です。

```json
{
  "parameters": {
    "path": "secure-webhook",
    "httpMethod": "POST",
    "authentication": "headerAuth",
    "options": {
      "allowedOrigins": "https://your-app.com"
    }
  },
  "name": "認証付きWebhook",
  "type": "n8n-nodes-base.webhook",
  "typeVersion": 1.1
}
```

もしくは、Codeノードでカスタム認証を実装する方法もあります。

```javascript
// HMAC署名検証の例
const crypto = require('crypto');

const payload = JSON.stringify($input.first().json.body);
const signature = $input.first().json.headers['x-webhook-signature'];
const secret = 'your-webhook-secret';

const expectedSignature = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');

if (signature !== `sha256=${expectedSignature}`) {
  throw new Error('Invalid webhook signature');
}

return $input.all();
```

---

## API連携の実践パターン

n8nの HTTP Requestノードを使えば、任意のREST APIと連携できます。ここでは、実務でよく使うパターンをいくつか紹介します。

### パターン1：ページネーション対応

APIが結果をページ分割して返す場合のループ処理です。

```javascript
// Codeノードでページネーション処理
const allItems = [];
let page = 1;
const perPage = 100;
let hasMore = true;

while (hasMore) {
  const response = await this.helpers.httpRequest({
    method: 'GET',
    url: 'https://api.example.com/users',
    qs: { page, per_page: perPage },
    headers: {
      'Authorization': 'Bearer ' + $credentials.apiToken
    }
  });

  allItems.push(...response.data);
  hasMore = response.data.length === perPage;
  page++;

  // レート制限対策
  if (hasMore) {
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

return allItems.map(user => ({ json: user }));
```

### パターン2：エラーハンドリング付きリトライ

```javascript
// Codeノードでリトライロジック
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await this.helpers.httpRequest({
        method: 'GET',
        url,
        ...options
      });
      return response;
    } catch (error) {
      if (attempt === maxRetries) throw error;

      // 指数バックオフ
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

const data = await fetchWithRetry.call(
  this,
  'https://api.example.com/data',
  { headers: { 'Authorization': 'Bearer token' } }
);

return [{ json: data }];
```

### パターン3：複数API統合

異なるAPIのデータを結合するパターンです。n8nのMergeノードを使います。

```
[ユーザーAPI取得] ──┐
                   ├─→ [Merge: 結合] → [整形] → [DB保存]
[注文API取得]   ──┘
```

Mergeノードの結合モードには以下があります。

| モード | 動作 |
|--------|------|
| Append | 全アイテムを単純に結合 |
| Keep Key Matches | 指定キーが一致するアイテムだけを結合（INNER JOIN相当） |
| Enrich | 片方のデータをもう片方に追加（LEFT JOIN相当） |
| Combine All | 全組み合わせを生成（CROSS JOIN相当） |

---

## AIノードの活用

n8nのバージョン1.19以降、AI関連のノードが大幅に強化されました。LangChainベースのAIエージェントをワークフロー内で構築できます。

### OpenAI / Anthropicとの連携

```json
{
  "name": "AI要約ワークフロー",
  "nodes": [
    {
      "parameters": {
        "path": "summarize",
        "httpMethod": "POST"
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1.1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "model": "gpt-4o",
        "messages": {
          "values": [
            {
              "content": "=以下の文章を日本語で3行に要約してください。\n\n{{ $json.body.text }}"
            }
          ]
        },
        "options": {
          "temperature": 0.3,
          "maxTokens": 500
        }
      },
      "name": "OpenAI要約",
      "type": "@n8n/n8n-nodes-langchain.openAi",
      "typeVersion": 1.2,
      "position": [470, 300]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={ \"summary\": \"{{ $json.text }}\" }"
      },
      "name": "結果返却",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [690, 300]
    }
  ]
}
```

### AIエージェントの構築

n8nのAI Agentノードを使えば、ツール呼び出し（Function Calling）に対応したエージェントを構築できます。

```
[トリガー] → [AI Agent] ← [ツール: Google検索]
                         ← [ツール: Calculator]
                         ← [ツール: HTTP Request]
```

AIエージェントの定義例を以下に示します。

```json
{
  "parameters": {
    "agent": "toolsAgent",
    "promptType": "define",
    "text": "={{ $json.body.question }}",
    "options": {
      "systemMessage": "あなたは日本語で回答する優秀なリサーチアシスタントです。ユーザーの質問に対して、利用可能なツールを使って正確に回答してください。"
    }
  },
  "name": "AI Agent",
  "type": "@n8n/n8n-nodes-langchain.agent",
  "typeVersion": 1.6
}
```

### ローカルLLM（Ollama）との連携

外部APIを使いたくない場合、Ollamaを使ってローカルでLLMを動かすこともできます。

```yaml
# docker-compose.ymlにOllamaを追加
services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    volumes:
      - ollama_data:/root/.ollama
    ports:
      - "11434:11434"
    networks:
      - n8n-network
    # GPU使用時（NVIDIA）
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

volumes:
  ollama_data:
```

n8nからOllamaに接続する際は、ホスト名を `ollama`（Docker Composeのサービス名）に設定するだけです。

```
Ollama Base URL: http://ollama:11434
Model: llama3.1
```

---

## エラーハンドリングとモニタリング

本番運用では、ワークフローの失敗を素早く検知して対処できる仕組みが不可欠です。

### エラーワークフロー

n8nには「Error Workflow」という機能があります。任意のワークフローが失敗したとき、指定した別のワークフローを自動起動できます。

```json
{
  "name": "エラー通知ワークフロー",
  "nodes": [
    {
      "parameters": {},
      "name": "Error Trigger",
      "type": "n8n-nodes-base.errorTrigger",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "channel": "#alerts",
        "text": "=:rotating_light: *ワークフロー失敗*\n\n*ワークフロー:* {{ $json.workflow.name }}\n*エラー:* {{ $json.execution.error.message }}\n*実行ID:* {{ $json.execution.id }}\n*時刻:* {{ $json.execution.lastNodeExecuted }}\n\n<{{ $json.execution.url }}|実行ログを確認>"
      },
      "name": "Slack通知",
      "type": "n8n-nodes-base.slack",
      "typeVersion": 2,
      "position": [470, 300]
    }
  ]
}
```

設定方法は、各ワークフローの **Settings** → **Error Workflow** でこのエラー通知ワークフローを選択するだけです。

### ノード単位のエラーハンドリング

個別のノードにもエラー処理を設定できます。

```
[HTTP Request] ── 成功 ──→ [次の処理]
       │
       └── エラー ──→ [ログ記録] → [リトライ or 通知]
```

n8nのノード設定で「Continue On Fail」を有効にすると、エラーが発生しても後続ノードにエラー情報を渡して処理を継続できます。これはバッチ処理で一部のアイテムが失敗しても全体を止めたくない場合に有用です。

### ヘルスチェックとバックアップ

```bash
#!/bin/bash
# n8n-healthcheck.sh

N8N_URL="https://n8n.example.com"
SLACK_WEBHOOK="https://hooks.slack.com/services/xxx/yyy/zzz"

# ヘルスチェック
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$N8N_URL/healthz")

if [ "$HTTP_STATUS" != "200" ]; then
  curl -X POST "$SLACK_WEBHOOK" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \":warning: n8nヘルスチェック失敗 (HTTP $HTTP_STATUS)\"}"

  # コンテナ再起動
  docker compose restart n8n
fi
```

```bash
#!/bin/bash
# n8n-backup.sh
# ワークフローのエクスポート（バックアップ）

BACKUP_DIR="/backups/n8n/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# n8n CLIでワークフローをエクスポート
docker exec n8n n8n export:workflow --all --output="$BACKUP_DIR/workflows.json"
docker exec n8n n8n export:credentials --all --output="$BACKUP_DIR/credentials.json"

# PostgreSQLバックアップ
docker exec n8n-postgres pg_dump -U n8n n8n > "$BACKUP_DIR/database.sql"

# 古いバックアップの削除（30日以上前）
find /backups/n8n -type d -mtime +30 -exec rm -rf {} +

echo "Backup completed: $BACKUP_DIR"
```

---

## Zapier / Make との比較

ワークフロー自動化ツールを選ぶ際、Zapier・Make（旧Integromat）・n8nの3つが主要な選択肢になります。

### 機能比較表

| 項目 | n8n | Zapier | Make |
|------|-----|--------|------|
| 料金 | セルフホスト: 無料 / Cloud: €20〜 | $19.99/月〜 | $9/月〜 |
| 無料枠 | セルフホスト: 無制限 | 100タスク/月 | 1,000オペ/月 |
| 連携数 | 400+ | 7,000+ | 1,800+ |
| コード実行 | JS/Python（制限なし） | JS（制限あり） | JS（制限あり） |
| セルフホスト | 可能 | 不可 | 不可 |
| AI機能 | LangChain統合 | AI Actions（Beta） | AI Add-on |
| 複雑な分岐 | ビジュアルで自在 | Paths（制限的） | Router（柔軟） |
| デバッグ | ノード単位で実行結果確認 | ヒストリーログ | シナリオデバッガー |
| APIリクエスト | 制限なし | プランにより制限 | プランにより制限 |

### n8nを選ぶべきケース

**n8nが向いている人:**

- データを自社管理したい（医療・金融・個人情報を扱う企業）
- 実行回数が多い（月1万回以上のワークフロー実行）
- カスタムロジックが多い（JavaScript/Pythonで複雑な処理を書きたい）
- Docker / Kubernetes の運用経験がある
- 予算を最小限に抑えたい個人開発者

**Zapierが向いている人:**

- 非エンジニアが主な利用者
- とにかく早くワークフローを作りたい
- 連携先サービスの種類が多い
- サーバー管理をしたくない

**Makeが向いている人:**

- 複雑なデータ変換が多い
- ビジュアル面の操作性を重視する
- 中程度の予算で柔軟なワークフローを組みたい

### コスト試算：月5,000回実行の場合

```
n8n セルフホスト:
  VPS (2GB RAM): ~$5/月 ≈ ¥750
  合計: ¥750/月

n8n Cloud (Starter):
  €20/月 ≈ ¥3,200
  合計: ¥3,200/月

Zapier (Professional):
  $49/月 ≈ ¥7,500（2,000タスク/月、超過分追加課金）
  合計: ¥10,000〜/月

Make (Core):
  $9/月 ≈ ¥1,400（10,000オペ/月）
  合計: ¥1,400/月
```

セルフホスト版n8nの場合、VPS代だけで済むため月額¥750程度から運用可能です。実行回数が増えるほど、セルフホストのコストメリットは大きくなります。

---

## セルフホスト運用の実践Tips

### SSL証明書の自動更新（Let's Encrypt）

```yaml
# docker-compose.ymlにCertbotを追加
services:
  certbot:
    image: certbot/certbot
    container_name: certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
```

```bash
# 初回証明書取得
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  -d n8n.example.com \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email
```

### アップデート手順

n8nのアップデートは、Dockerイメージの更新だけで完了します。

```bash
# 現在のバージョン確認
docker exec n8n n8n --version

# イメージの更新
docker compose pull n8n

# コンテナの再作成
docker compose up -d n8n

# 動作確認
docker compose logs -f n8n
```

重要なのは、アップデート前に必ずバックアップを取ることです。先ほどのバックアップスクリプトを実行してからアップデートしてください。

### メモリとパフォーマンスの最適化

```yaml
# docker-compose.yml のn8nサービスに追加
services:
  n8n:
    # ... 既存の設定 ...
    environment:
      # Node.jsヒープサイズ（デフォルト512MB）
      - NODE_OPTIONS=--max-old-space-size=1024

      # 実行データの保持設定
      - EXECUTIONS_DATA_PRUNE=true
      - EXECUTIONS_DATA_MAX_AGE=168      # 7日間（時間単位）
      - EXECUTIONS_DATA_SAVE_ON_ERROR=all
      - EXECUTIONS_DATA_SAVE_ON_SUCCESS=none  # 成功時は保存しない
      - EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS=true

      # キューモード（大量ワークフロー実行時）
      # - EXECUTIONS_MODE=queue
      # - QUEUE_BULL_REDIS_HOST=redis
      # - QUEUE_BULL_REDIS_PORT=6379

    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 512M
```

### Kubernetes対応

大規模運用では、Kubernetesでn8nをスケールさせることも可能です。n8n公式のHelmチャートが用意されています。

```bash
# Helmチャートの追加
helm repo add n8n https://n8n-io.github.io/n8n-helm-chart/
helm repo update

# インストール
helm install n8n n8n/n8n \
  --namespace n8n \
  --create-namespace \
  --set n8n.encryption_key="your-encryption-key" \
  --set database.type=postgresdb \
  --set database.postgresdb.host=your-postgres-host
```

---

## カスタムノードの開発

n8nの既存ノードでは対応できない独自のサービスと連携したい場合、カスタムノードを開発できます。

### プロジェクト構成

```bash
# カスタムノードの雛形を生成
npx n8n-node-dev new

# プロジェクト構造
my-custom-node/
├── package.json
├── tsconfig.json
├── nodes/
│   └── MyCustomNode/
│       ├── MyCustomNode.node.ts    # ノード本体
│       └── myCustomNode.svg        # アイコン
└── credentials/
    └── MyCustomApi.credentials.ts  # 認証情報定義
```

### ノード実装例

```typescript
// nodes/MyCustomNode/MyCustomNode.node.ts
import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';

export class MyCustomNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Custom Node',
    name: 'myCustomNode',
    icon: 'file:myCustomNode.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'カスタムサービスとの連携ノード',
    defaults: {
      name: 'My Custom Node',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'myCustomApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Get', value: 'get', description: 'データを取得' },
          { name: 'Create', value: 'create', description: 'データを作成' },
        ],
        default: 'get',
      },
      {
        displayName: 'Resource ID',
        name: 'resourceId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: { operation: ['get'] },
        },
        description: '取得するリソースのID',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const operation = this.getNodeParameter('operation', 0) as string;
    const credentials = await this.getCredentials('myCustomApi');

    for (let i = 0; i < items.length; i++) {
      try {
        if (operation === 'get') {
          const resourceId = this.getNodeParameter('resourceId', i) as string;
          const response = await this.helpers.httpRequest({
            method: 'GET',
            url: `${credentials.baseUrl}/api/resources/${resourceId}`,
            headers: {
              Authorization: `Bearer ${credentials.apiKey}`,
            },
          });
          returnData.push({ json: response });
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({ json: { error: error.message } });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
```

### カスタムノードのインストール

```bash
# ビルド
cd my-custom-node
npm run build

# n8nのカスタムノードディレクトリにコピー
# Docker Compose の場合、volumeマウントで追加
```

```yaml
# docker-compose.yml
services:
  n8n:
    volumes:
      - n8n_data:/home/node/.n8n
      - ./custom-nodes:/home/node/.n8n/custom
    environment:
      - N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/custom
```

---

## 実践ユースケース集

最後に、n8nで自動化できるユースケースをいくつか紹介します。

### 1. デプロイ通知パイプライン

[GitHub ActionsのCI/CD](/blog/github-actions-cicd-complete-guide-2026)と組み合わせた通知ワークフローです。

```
[GitHub Webhook: deploy完了]
  → [Code: コミット情報整形]
  → [Slack: #deploys に通知]
  → [HTTP Request: ステータスページ更新]
```

### 2. 問い合わせフォーム → CRM自動登録

```
[Webhook: フォーム送信受信]
  → [Code: バリデーション]
  → [IF: スパム判定]
      ├─ スパム → [ログ記録]
      └─ 正常 → [Google Sheets: 記録]
              → [Slack: 営業チームに通知]
              → [Email: 自動返信]
```

### 3. 日次レポート自動生成

```
[Schedule: 毎朝8時]
  → [PostgreSQL: 前日の売上データ取得]
  → [HTTP Request: Google Analytics API]
  → [Code: レポートMarkdown生成]
  → [OpenAI: 分析コメント追記]
  → [Slack: #daily-report に投稿]
```

### 4. コンテンツ監視と自動対応

```
[Schedule: 15分ごと]
  → [HTTP Request: サイトの死活監視]
  → [IF: ステータスコード != 200]
      ├─ 異常 → [Slack: アラート]
      │        → [PagerDuty: インシデント作成]
      └─ 正常 → [何もしない]
```

### 5. AIを活用したカスタマーサポート

```
[Webhook: 問い合わせ受信]
  → [AI Agent: 回答生成]
      ← [Vector Store: FAQ検索]
      ← [HTTP Request: ユーザー情報取得]
  → [IF: 信頼度 > 0.8]
      ├─ 高 → [Email: 自動返信]
      └─ 低 → [Slack: 人間に対応依頼]
```

---

## まとめ

n8nは、開発者にとって理想的なワークフロー自動化ツールです。セルフホストできるため、データの管理権を手放す必要がなく、実行回数の制限もありません。

この記事で紹介した内容を振り返ります。

- **Docker Composeでの構築**: PostgreSQL + Nginx構成で本番運用に対応
- **ワークフローの基本**: ノード・接続線・Expression（式）によるデータ操作
- **Webhook**: 外部サービスからのリアルタイム連携
- **API連携**: ページネーション・リトライ・データ結合の実践パターン
- **AIノード**: OpenAI / Anthropic / Ollama との統合でインテリジェントな処理
- **Zapier/Make比較**: セルフホストのコスト優位性と使い分け
- **運用Tips**: SSL・バックアップ・パフォーマンス最適化

まずは[Dockerの基礎](/blog/docker-complete-guide)を押さえた上で、ローカルにn8nを立ち上げてみてください。最初のワークフローが動いた瞬間、「この手作業、全部自動化できるじゃないか」という感覚を得られるはずです。

自動化の旅は、小さな一歩から始まります。いちばん面倒だと思っている日常の作業を、1つだけn8nに置き換えてみてください。

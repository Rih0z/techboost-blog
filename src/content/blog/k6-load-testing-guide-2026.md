---
title: 'k6負荷テスト完全ガイド2026｜シナリオ設計・閾値設定・CI/CD連携・結果分析'
description: 'Grafana k6による負荷テストを解説する2026年版ガイド。JavaScript/TypeScriptでのシナリオ設計、閾値設定、段階的負荷パターンの構築、GitHub ActionsとのCI/CD連携、Grafanaダッシュボードでのリアルタイム結果分析まで網羅。'
pubDate: '2026-03-05'
tags: ['k6', 'テスト', '負荷テスト', 'DevOps', 'パフォーマンス']
heroImage: '../../assets/thumbnails/k6-load-testing-guide-2026.jpg'
---

## k6とは

**k6**はGrafana Labsが開発するオープンソースの負荷テストツールです。JavaScript/TypeScriptでテストシナリオを記述し、Go製のランタイムで高速に実行します。

### 負荷テストツール比較

| ツール | 言語 | プロトコル | CI/CD | クラウド | 学習コスト |
|--------|------|-----------|-------|---------|-----------|
| **k6** | JavaScript | HTTP/WS/gRPC | ◎ | Grafana Cloud | 低 |
| JMeter | XML/GUI | HTTP/JDBC等 | △ | BlazeMeter | 高 |
| Locust | Python | HTTP | ○ | なし | 中 |
| Artillery | YAML/JS | HTTP/WS | ○ | Artillery Cloud | 低 |
| Gatling | Scala/Java | HTTP | ○ | Gatling Enterprise | 高 |

### k6が選ばれる理由

- **JavaScript/TypeScript**でシナリオを書ける（フロントエンド開発者にも親しみやすい）
- **Go製ランタイム**で高パフォーマンス（1台で数万VU）
- **CLI完結**（GUIツール不要）
- **CI/CD統合**が容易（GitHub Actions, GitLab CI等）
- **Grafana連携**で結果を美しく可視化

---

## セットアップ

### インストール

```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Docker
docker run --rm -i grafana/k6 run - <script.js

# npm（TypeScript対応）
npm install -D @types/k6
```

### プロジェクト構成

```
load-tests/
├── scenarios/
│   ├── smoke.ts          # スモークテスト
│   ├── load.ts           # 通常負荷テスト
│   ├── stress.ts         # ストレステスト
│   ├── spike.ts          # スパイクテスト
│   └── soak.ts           # 耐久テスト
├── helpers/
│   ├── auth.ts           # 認証ヘルパー
│   └── data.ts           # テストデータ
├── thresholds.json       # 閾値設定
└── package.json
```

---

## 基本的なテストスクリプト

### 最小構成

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

// テスト設定
export const options = {
  vus: 10,        // 仮想ユーザー数
  duration: '30s', // テスト時間
};

// テストシナリオ
export default function () {
  const res = http.get('https://api.example.com/users');

  // レスポンス検証
  check(res, {
    'ステータス200': (r) => r.status === 200,
    'レスポンス500ms以内': (r) => r.timings.duration < 500,
    'ボディにusersを含む': (r) => r.body.includes('users'),
  });

  sleep(1); // 1秒待機（実ユーザーの行動を模倣）
}
```

### 実行

```bash
k6 run scenarios/smoke.ts

# 出力例
#          /\      |‾‾| /‾‾/   /‾‾/
#     /\  /  \     |  |/  /   /  /
#    /  \/    \    |     (   /   ‾‾\
#   /          \   |  |\  \ |  (‾)  |
#  / __________ \  |__| \__\ \_____/
#
#   execution: local
#   script: scenarios/smoke.ts
#
#   ✓ ステータス200
#   ✓ レスポンス500ms以内
#
#   http_req_duration.............: avg=120ms  min=80ms  max=250ms
#   http_reqs.....................: 280    9.3/s
#   vus..........................: 10     min=10  max=10
```

---

## 負荷パターン（Scenarios）

### スモークテスト（最小負荷で動作確認）

```javascript
export const options = {
  vus: 1,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};
```

### 通常負荷テスト（段階的にスケールアップ）

```javascript
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // 2分かけて50VUまで増加
    { duration: '5m', target: 50 },   // 5分間50VUを維持
    { duration: '2m', target: 100 },  // 2分かけて100VUに
    { duration: '5m', target: 100 },  // 5分間100VUを維持
    { duration: '2m', target: 0 },    // 2分かけて終了
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};
```

### ストレステスト（限界を探る）

```javascript
export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 300 },  // 通常の3倍
    { duration: '5m', target: 300 },
    { duration: '5m', target: 0 },
  ],
};
```

### スパイクテスト（急激なアクセス増）

```javascript
export const options = {
  stages: [
    { duration: '10s', target: 100 },  // 10秒で急増
    { duration: '1m', target: 100 },
    { duration: '10s', target: 1000 }, // 10秒で10倍に！
    { duration: '3m', target: 1000 },
    { duration: '10s', target: 100 },  // 急減
    { duration: '3m', target: 100 },
    { duration: '5m', target: 0 },
  ],
};
```

### Scenariosによる複合テスト

```javascript
export const options = {
  scenarios: {
    // シナリオ1: 一般ユーザーのブラウジング
    browsing: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 0 },
      ],
      exec: 'browsingScenario',
    },
    // シナリオ2: APIへの書き込みリクエスト
    api_writes: {
      executor: 'constant-arrival-rate',
      rate: 30,          // 1秒あたり30リクエスト
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50,
      exec: 'apiWriteScenario',
    },
    // シナリオ3: 管理者の重い操作
    admin_operations: {
      executor: 'per-vu-iterations',
      vus: 5,
      iterations: 10,
      exec: 'adminScenario',
      startTime: '1m', // 1分後に開始
    },
  },
};

export function browsingScenario() {
  http.get('https://api.example.com/products');
  sleep(2);
  http.get('https://api.example.com/products/1');
  sleep(1);
}

export function apiWriteScenario() {
  const payload = JSON.stringify({
    title: `Post ${Date.now()}`,
    body: 'テスト投稿の本文です',
  });

  http.post('https://api.example.com/posts', payload, {
    headers: { 'Content-Type': 'application/json' },
  });
}

export function adminScenario() {
  http.get('https://api.example.com/admin/reports');
  sleep(5);
}
```

---

## 閾値（Thresholds）

閾値はテストの**合否判定基準**です。CI/CDで自動的にパス/フェイルを判断できます。

```javascript
export const options = {
  thresholds: {
    // レスポンス時間
    http_req_duration: [
      'p(95)<500',    // 95パーセンタイルが500ms以内
      'p(99)<1500',   // 99パーセンタイルが1500ms以内
      'avg<200',      // 平均200ms以内
      'max<3000',     // 最大3000ms以内
    ],

    // エラー率
    http_req_failed: [
      'rate<0.01',    // エラー率1%未満
    ],

    // スループット
    http_reqs: [
      'rate>100',     // 1秒あたり100リクエスト以上
    ],

    // カスタムメトリクス
    'http_req_duration{name:login}': ['p(95)<1000'],
    'http_req_duration{name:search}': ['p(95)<2000'],

    // チェックの成功率
    checks: ['rate>0.99'], // 99%以上成功
  },
};
```

### カスタムメトリクス

```javascript
import { Trend, Counter, Rate, Gauge } from 'k6/metrics';

// カスタムメトリクスの定義
const loginDuration = new Trend('login_duration');
const loginFailures = new Counter('login_failures');
const loginSuccess = new Rate('login_success');
const activeUsers = new Gauge('active_users');

export default function () {
  const start = Date.now();

  const res = http.post('https://api.example.com/login', JSON.stringify({
    email: 'test@example.com',
    password: 'password123',
  }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'login' }, // タグ付け
  });

  // カスタムメトリクスに記録
  loginDuration.add(Date.now() - start);

  if (res.status === 200) {
    loginSuccess.add(1);
  } else {
    loginSuccess.add(0);
    loginFailures.add(1);
  }

  activeUsers.add(__VU); // 現在のVU番号
}
```

---

## 実践的なシナリオ

### EC サイトの負荷テスト

```javascript
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// テストデータ（1回だけ読み込み、全VUで共有）
const users = new SharedArray('users', function () {
  return JSON.parse(open('./data/users.json'));
});

const products = new SharedArray('products', function () {
  return JSON.parse(open('./data/products.json'));
});

const BASE_URL = 'https://api.example.com';

export const options = {
  scenarios: {
    shopping_flow: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '10m', target: 100 },
        { duration: '2m', target: 0 },
      ],
    },
  },
  thresholds: {
    'group_duration{group:::商品一覧}': ['p(95)<1000'],
    'group_duration{group:::商品詳細}': ['p(95)<500'],
    'group_duration{group:::カート追加}': ['p(95)<800'],
    'group_duration{group:::購入完了}': ['p(95)<3000'],
    http_req_failed: ['rate<0.02'],
  },
};

export default function () {
  const user = users[__VU % users.length];

  // ログイン
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: user.email,
    password: user.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  const token = loginRes.json('token');
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // 商品一覧を閲覧
  group('商品一覧', function () {
    const res = http.get(`${BASE_URL}/products?page=1&limit=20`, {
      headers: authHeaders,
    });
    check(res, { '商品一覧200': (r) => r.status === 200 });
  });

  sleep(2); // ページを見る

  // 商品詳細を閲覧
  const productId = products[Math.floor(Math.random() * products.length)].id;
  group('商品詳細', function () {
    const res = http.get(`${BASE_URL}/products/${productId}`, {
      headers: authHeaders,
    });
    check(res, { '商品詳細200': (r) => r.status === 200 });
  });

  sleep(3); // 商品を検討

  // カートに追加
  group('カート追加', function () {
    const res = http.post(`${BASE_URL}/cart/items`, JSON.stringify({
      productId: productId,
      quantity: 1,
    }), { headers: authHeaders });
    check(res, { 'カート追加成功': (r) => r.status === 201 });
  });

  sleep(1);

  // 購入完了（10%のユーザーのみ）
  if (Math.random() < 0.1) {
    group('購入完了', function () {
      const res = http.post(`${BASE_URL}/orders`, JSON.stringify({
        paymentMethod: 'credit_card',
      }), { headers: authHeaders });
      check(res, { '購入成功': (r) => r.status === 201 });
    });
  }

  sleep(1);
}
```

### 認証付きAPIテスト

```javascript
import http from 'k6/http';
import { check } from 'k6';

// setup: テスト開始前に1回だけ実行
export function setup() {
  const res = http.post('https://api.example.com/auth/login', JSON.stringify({
    email: 'admin@example.com',
    password: 'admin-password',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  return { token: res.json('token') };
}

// default: 各VUが繰り返し実行
export default function (data) {
  const res = http.get('https://api.example.com/protected/resource', {
    headers: {
      Authorization: `Bearer ${data.token}`,
    },
  });

  check(res, {
    'ステータス200': (r) => r.status === 200,
  });
}

// teardown: テスト終了後に1回だけ実行
export function teardown(data) {
  http.post('https://api.example.com/auth/logout', null, {
    headers: {
      Authorization: `Bearer ${data.token}`,
    },
  });
}
```

---

## gRPC / WebSocketテスト

### gRPCテスト

```javascript
import grpc from 'k6/net/grpc';
import { check } from 'k6';

const client = new grpc.Client();
client.load(['definitions'], 'user_service.proto');

export default function () {
  client.connect('grpc.example.com:443', { tls: true });

  const response = client.invoke('user.UserService/GetUser', {
    id: '123',
  });

  check(response, {
    'gRPCステータスOK': (r) => r.status === grpc.StatusOK,
    'ユーザー名が存在': (r) => r.message.name !== '',
  });

  client.close();
}
```

### WebSocketテスト

```javascript
import ws from 'k6/ws';
import { check } from 'k6';

export default function () {
  const url = 'wss://ws.example.com/chat';

  const res = ws.connect(url, {}, function (socket) {
    socket.on('open', function () {
      socket.send(JSON.stringify({
        type: 'join',
        room: 'general',
      }));

      // 5秒ごとにメッセージ送信
      socket.setInterval(function () {
        socket.send(JSON.stringify({
          type: 'message',
          text: `Hello from VU ${__VU}`,
        }));
      }, 5000);
    });

    socket.on('message', function (msg) {
      const data = JSON.parse(msg);
      check(data, {
        'メッセージタイプが正しい': (d) => ['join', 'message'].includes(d.type),
      });
    });

    socket.on('error', function (e) {
      console.error('WebSocketエラー:', e.error());
    });

    // 30秒後に切断
    socket.setTimeout(function () {
      socket.close();
    }, 30000);
  });

  check(res, {
    'WebSocket接続成功': (r) => r && r.status === 101,
  });
}
```

---

## CI/CD連携

### GitHub Actions

```yaml
# .github/workflows/load-test.yml
name: Load Test

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1' # 毎週月曜6:00

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: k6をインストール
        uses: grafana/setup-k6-action@v1

      - name: スモークテスト実行
        run: k6 run scenarios/smoke.ts

      - name: 負荷テスト実行
        run: |
          k6 run \
            --out json=results.json \
            scenarios/load.ts

      - name: 結果をアーティファクトとして保存
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: k6-results
          path: results.json
```

### 閾値でCI/CDを制御

```javascript
// 閾値を超えると exit code 99 でk6が終了
// → CI/CDのステップが失敗扱いになる
export const options = {
  thresholds: {
    http_req_duration: [{
      threshold: 'p(95)<500',
      abortOnFail: true,      // 閾値超過で即中断
      delayAbortEval: '10s',  // 10秒後に評価開始
    }],
    http_req_failed: [{
      threshold: 'rate<0.01',
      abortOnFail: true,
    }],
  },
};
```

---

## Grafanaダッシュボードで結果を可視化

### InfluxDB + Grafana

```bash
# InfluxDBに結果を送信
k6 run --out influxdb=http://localhost:8086/k6 scenarios/load.ts
```

### Prometheus + Grafana

```bash
# Prometheus Remote Write
k6 run \
  --out experimental-prometheus-rw \
  -e K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9090/api/v1/write \
  scenarios/load.ts
```

### Grafana Cloud k6

```bash
# Grafana Cloudに直接送信
k6 cloud scenarios/load.ts
```

---

## ベストプラクティス

### 1. テストデータの管理

```javascript
import { SharedArray } from 'k6/data';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';

// CSVファイルからテストデータを読み込み
const csvData = new SharedArray('csv', function () {
  return papaparse.parse(open('./data/users.csv'), {
    header: true,
  }).data;
});

export default function () {
  // VUごとに異なるデータを使用
  const user = csvData[__VU % csvData.length];
  // ...
}
```

### 2. 段階的なテスト戦略

```
1. スモークテスト（1VU/1分）  → デプロイ直後に毎回
2. 通常負荷テスト（想定負荷）  → リリース前に毎回
3. ストレステスト（想定の2-3倍）→ 月次で実施
4. スパイクテスト（急激な負荷） → セール前に実施
5. 耐久テスト（長時間負荷）    → 四半期ごと
```

### 3. 現実的なシナリオ設計

```javascript
// ❌ 悪い例: 同じエンドポイントを連続で叩く
export default function () {
  http.get('/api/products');
  http.get('/api/products');
  http.get('/api/products');
}

// ✅ 良い例: 実際のユーザー行動を模倣
export default function () {
  http.get('/api/products');          // 一覧を見る
  sleep(randomIntBetween(1, 5));     // 考える時間
  http.get('/api/products/123');      // 詳細を見る
  sleep(randomIntBetween(2, 8));     // 検討する時間
  http.post('/api/cart', payload);   // カートに入れる
  sleep(randomIntBetween(1, 3));
}
```

---

## まとめ

| テストタイプ | VU数 | 目的 | 実施頻度 |
|------------|------|------|---------|
| スモーク | 1-5 | 基本動作確認 | 毎デプロイ |
| 負荷 | 想定ピーク | SLA検証 | 毎リリース |
| ストレス | 想定の2-3倍 | 限界値把握 | 月次 |
| スパイク | 急激に増減 | 回復力検証 | イベント前 |
| 耐久 | 中負荷長時間 | メモリリーク検出 | 四半期 |

k6の強みは**開発者フレンドリー**な点です。JavaScriptでシナリオを書き、CLI一本で実行、閾値でCI/CDを自動判定、Grafanaで美しく可視化——このワークフローで、パフォーマンスの問題をリリース前に確実に検出できます。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)

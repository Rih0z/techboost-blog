---
title: "NATS メッセージングシステム入門 - 軽量高速な分散通信基盤"
description: "NATSは軽量高速なメッセージングシステム。Pub/Sub、Request/Reply、Queue Groups、JetStream永続化、Node.js/Go統合まで実践的に解説します。"
pubDate: "2025-02-06"
---

**NATS**は、クラウドネイティブアプリケーション向けの**軽量・高速・シンプルなメッセージングシステム**です。マイクロサービス間の通信、イベント駆動アーキテクチャ、リアルタイムデータ配信に最適です。

本記事では、NATSの基本概念からPub/Sub、Request/Reply、JetStreamによる永続化、実際のNode.js/Go実装まで詳しく解説します。

## NATSとは？

NATSは、**Cloud Native Computing Foundation (CNCF)**のインキュベーティングプロジェクトである、オープンソースのメッセージングシステムです。

### 主な特徴

- **超軽量**: 単一バイナリ、メモリ使用量わずか数MB
- **高速**: 100万メッセージ/秒以上の処理能力
- **シンプル**: 学習曲線が緩やか、設定がほぼ不要
- **クラウドネイティブ**: Kubernetes、Docker環境に最適化
- **多言語対応**: 40以上のクライアントライブラリ
- **At-Most-Once / At-Least-Once**: 配信保証の選択が可能

### 他のメッセージングシステムとの比較

| 機能 | NATS | RabbitMQ | Kafka |
|------|------|----------|-------|
| 速度 | ✅ 最高速 | ⚠️ 高速 | ⚠️ 高速 |
| シンプルさ | ✅ 非常に簡単 | ⚠️ 中程度 | ❌ 複雑 |
| メモリ | ✅ 数MB | ⚠️ 数百MB | ❌ 数GB |
| 永続化 | ✅ JetStream | ✅ デフォルト | ✅ デフォルト |
| スケーラビリティ | ✅ 優秀 | ⚠️ 良好 | ✅ 最高 |

NATSは**シンプルさと速度**を重視し、Kafkaは**大規模データストリーム**に最適化されています。

## NATSのセットアップ

### Docker での起動

最も簡単な方法:

```bash
# NATS サーバーを起動
docker run -p 4222:4222 -p 8222:8222 nats:latest

# JetStream有効化
docker run -p 4222:4222 -p 8222:8222 nats:latest -js
```

### Docker Compose

`docker-compose.yml`:

```yaml
version: '3.8'

services:
  nats:
    image: nats:2.10-alpine
    container_name: nats
    ports:
      - "4222:4222"  # クライアント接続
      - "8222:8222"  # HTTPモニタリング
      - "6222:6222"  # クラスタリング
    command:
      - "-js"              # JetStream有効化
      - "-m"               # モニタリング有効化
      - "8222"
      - "--store_dir=/data"
    volumes:
      - nats_data:/data
    restart: unless-stopped

volumes:
  nats_data:
```

起動:

```bash
docker compose up -d
```

### バイナリインストール

macOS:
```bash
brew install nats-server
nats-server -js
```

Linux:
```bash
# ダウンロード
wget https://github.com/nats-io/nats-server/releases/download/v2.10.7/nats-server-v2.10.7-linux-amd64.tar.gz
tar -xzf nats-server-v2.10.7-linux-amd64.tar.gz
sudo mv nats-server-v2.10.7-linux-amd64/nats-server /usr/local/bin/

# 起動
nats-server -js
```

### 接続確認

ブラウザで `http://localhost:8222` にアクセスすると、NATSのモニタリング画面が表示されます。

## 基本パターン

### 1. Publish/Subscribe (Pub/Sub)

**1対多の配信**。1つのメッセージを複数の購読者が受信します。

#### Node.js実装

```javascript
// publisher.js
import { connect } from 'nats';

const nc = await connect({ servers: 'localhost:4222' });

// メッセージを配信
nc.publish('news.updates', JSON.stringify({
  title: 'Breaking News',
  content: 'Something happened!',
  timestamp: Date.now()
}));

console.log('メッセージを配信しました');
await nc.close();
```

```javascript
// subscriber.js
import { connect, StringCodec } from 'nats';

const nc = await connect({ servers: 'localhost:4222' });
const sc = StringCodec();

// サブスクライバー1
const sub1 = nc.subscribe('news.updates');
(async () => {
  for await (const msg of sub1) {
    const data = JSON.parse(sc.decode(msg.data));
    console.log('[購読者1] 受信:', data);
  }
})();

// サブスクライバー2
const sub2 = nc.subscribe('news.updates');
(async () => {
  for await (const msg of sub2) {
    const data = JSON.parse(sc.decode(msg.data));
    console.log('[購読者2] 受信:', data);
  }
})();

console.log('ニュースを購読中...');
```

#### Go実装

```go
// publisher.go
package main

import (
    "encoding/json"
    "log"
    "github.com/nats-io/nats.go"
)

type NewsUpdate struct {
    Title     string `json:"title"`
    Content   string `json:"content"`
    Timestamp int64  `json:"timestamp"`
}

func main() {
    nc, _ := nats.Connect(nats.DefaultURL)
    defer nc.Close()

    news := NewsUpdate{
        Title:   "Breaking News",
        Content: "Something happened!",
        Timestamp: time.Now().Unix(),
    }

    data, _ := json.Marshal(news)
    nc.Publish("news.updates", data)

    log.Println("メッセージを配信しました")
}
```

```go
// subscriber.go
package main

import (
    "encoding/json"
    "log"
    "github.com/nats-io/nats.go"
)

func main() {
    nc, _ := nats.Connect(nats.DefaultURL)
    defer nc.Close()

    nc.Subscribe("news.updates", func(msg *nats.Msg) {
        var news NewsUpdate
        json.Unmarshal(msg.Data, &news)
        log.Printf("[購読] %s: %s\n", news.Title, news.Content)
    })

    log.Println("ニュースを購読中...")
    select {} // 無限待機
}
```

### 2. Request/Reply

**同期的なリクエスト・レスポンス**パターン。RPCのような通信を実現します。

#### Node.js実装

```javascript
// server.js (レスポンダー)
import { connect, StringCodec } from 'nats';

const nc = await connect({ servers: 'localhost:4222' });
const sc = StringCodec();

// リクエストに応答
nc.subscribe('user.get', {
  callback: (err, msg) => {
    const userId = sc.decode(msg.data);
    console.log(`[サーバー] ユーザーID ${userId} のリクエストを受信`);

    const user = {
      id: userId,
      name: 'John Doe',
      email: 'john@example.com'
    };

    msg.respond(sc.encode(JSON.stringify(user)));
  }
});

console.log('ユーザーサービスが起動しました');
```

```javascript
// client.js (リクエスター)
import { connect, StringCodec } from 'nats';

const nc = await connect({ servers: 'localhost:4222' });
const sc = StringCodec();

// リクエストを送信（タイムアウト: 5秒）
const response = await nc.request('user.get', sc.encode('123'), {
  timeout: 5000
});

const user = JSON.parse(sc.decode(response.data));
console.log('[クライアント] ユーザー情報:', user);

await nc.close();
```

#### Go実装

```go
// server.go
package main

import (
    "encoding/json"
    "log"
    "github.com/nats-io/nats.go"
)

type User struct {
    ID    string `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

func main() {
    nc, _ := nats.Connect(nats.DefaultURL)
    defer nc.Close()

    nc.Subscribe("user.get", func(msg *nats.Msg) {
        userId := string(msg.Data)
        log.Printf("[サーバー] ユーザーID %s のリクエスト\n", userId)

        user := User{
            ID:    userId,
            Name:  "John Doe",
            Email: "john@example.com",
        }

        data, _ := json.Marshal(user)
        msg.Respond(data)
    })

    log.Println("ユーザーサービスが起動しました")
    select {}
}
```

### 3. Queue Groups

**負荷分散**。複数のワーカーが1つのキューを共有し、メッセージが均等に分散されます。

#### Node.js実装

```javascript
// worker.js
import { connect, StringCodec } from 'nats';

const nc = await connect({ servers: 'localhost:4222' });
const sc = StringCodec();

const workerName = process.env.WORKER_NAME || 'worker';

// キューグループ "workers" に参加
nc.subscribe('tasks.process', {
  queue: 'workers',
  callback: (err, msg) => {
    const task = JSON.parse(sc.decode(msg.data));
    console.log(`[${workerName}] タスク処理中:`, task);

    // 処理をシミュレート
    setTimeout(() => {
      console.log(`[${workerName}] タスク完了:`, task.id);
    }, Math.random() * 3000);
  }
});

console.log(`${workerName} が起動しました`);
```

```javascript
// producer.js
import { connect, StringCodec } from 'nats';

const nc = await connect({ servers: 'localhost:4222' });
const sc = StringCodec();

// タスクを複数送信
for (let i = 1; i <= 10; i++) {
  const task = {
    id: i,
    type: 'data-processing',
    payload: `Task ${i}`
  };

  nc.publish('tasks.process', sc.encode(JSON.stringify(task)));
  console.log(`タスク ${i} を送信`);
}

await nc.close();
```

複数のワーカーを起動:

```bash
WORKER_NAME=worker1 node worker.js &
WORKER_NAME=worker2 node worker.js &
WORKER_NAME=worker3 node worker.js &

node producer.js
```

各ワーカーがタスクを**均等に分散**して処理します。

## JetStream: 永続化とストリーミング

**JetStream**は、NATSの永続化・ストリーミング機能です。

### Streamの作成

```javascript
import { connect, AckPolicy } from 'nats';

const nc = await connect({ servers: 'localhost:4222' });
const jsm = await nc.jetstreamManager();

// Streamを作成
await jsm.streams.add({
  name: 'ORDERS',
  subjects: ['orders.*'],
  retention: 'limits',
  max_age: 86400000000000, // 1日 (ナノ秒)
  max_msgs: 10000,
  storage: 'file'
});

console.log('Stream "ORDERS" を作成しました');
```

### メッセージの永続化

```javascript
// producer.js
const js = nc.jetstream();

// 永続化メッセージを送信
const pa = await js.publish('orders.created', JSON.stringify({
  orderId: '12345',
  amount: 9999,
  timestamp: Date.now()
}));

console.log('メッセージが永続化されました:', pa.seq);
```

### Consumer (購読者)

```javascript
// consumer.js
const js = nc.jetstream();

// Consumerを作成
const consumer = await js.consumers.get('ORDERS', 'order-processor');

// メッセージを消費
const messages = await consumer.consume();

for await (const msg of messages) {
  const order = JSON.parse(msg.string());
  console.log('注文を処理:', order);

  // 処理完了を確認
  msg.ack();
}
```

### At-Least-Once 配信保証

```javascript
await jsm.consumers.add('ORDERS', {
  durable_name: 'processor',
  ack_policy: AckPolicy.Explicit,
  max_deliver: 3,           // 最大3回再配信
  ack_wait: 30000000000     // 30秒待機 (ナノ秒)
});
```

## 実践例: マイクロサービス通信

### サービス構成

```
User Service (Port 3001)
   ↓ (nats)
Order Service (Port 3002)
   ↓ (nats)
Notification Service (Port 3003)
```

### User Service

```javascript
// user-service.js
import { connect, StringCodec } from 'nats';
import express from 'express';

const app = express();
app.use(express.json());

const nc = await connect({ servers: 'localhost:4222' });
const sc = StringCodec();
const js = nc.jetstream();

// ユーザー作成
app.post('/users', async (req, res) => {
  const user = {
    id: Date.now().toString(),
    ...req.body
  };

  // JetStreamでイベント配信
  await js.publish('users.created', sc.encode(JSON.stringify(user)));

  res.json(user);
});

app.listen(3001, () => console.log('User Service on port 3001'));
```

### Order Service

```javascript
// order-service.js
import { connect, StringCodec } from 'nats';
import express from 'express';

const app = express();
app.use(express.json());

const nc = await connect({ servers: 'localhost:4222' });
const sc = StringCodec();
const js = nc.jetstream();

// ユーザー作成イベントを購読
const consumer = await js.consumers.get('USERS', 'order-service');
(async () => {
  const messages = await consumer.consume();
  for await (const msg of messages) {
    const user = JSON.parse(sc.decode(msg.data));
    console.log('[Order Service] 新規ユーザー:', user);
    msg.ack();
  }
})();

// 注文作成
app.post('/orders', async (req, res) => {
  const order = {
    id: Date.now().toString(),
    ...req.body
  };

  // イベント配信
  await js.publish('orders.created', sc.encode(JSON.stringify(order)));

  res.json(order);
});

app.listen(3002, () => console.log('Order Service on port 3002'));
```

### Notification Service

```javascript
// notification-service.js
import { connect, StringCodec } from 'nats';

const nc = await connect({ servers: 'localhost:4222' });
const sc = StringCodec();
const js = nc.jetstream();

// 複数のイベントを購読
const orderConsumer = await js.consumers.get('ORDERS', 'notifier');
(async () => {
  const messages = await orderConsumer.consume();
  for await (const msg of messages) {
    const order = JSON.parse(sc.decode(msg.data));
    console.log('[通知] 新規注文:', order.id);
    // メール送信などの処理
    msg.ack();
  }
})();

console.log('Notification Service が起動しました');
```

## モニタリングとデバッグ

### NATS CLI

```bash
# NATS CLIのインストール
brew install nats-io/nats-tools/nats

# サーバー情報
nats server info

# Streamの確認
nats stream ls
nats stream info ORDERS

# Consumerの確認
nats consumer ls ORDERS

# メッセージの送信
nats pub orders.created '{"orderId": "123"}'

# メッセージの購読
nats sub orders.created
```

### HTTPモニタリング

ブラウザで `http://localhost:8222` にアクセス:

- `/varz`: サーバー変数
- `/connz`: 接続情報
- `/routez`: ルート情報
- `/subsz`: サブスクリプション情報

## まとめ

NATSは**軽量・高速・シンプル**なメッセージングシステムとして、マイクロサービスやイベント駆動アーキテクチャに最適です。

### NATSの強み

- **超高速**: 100万メッセージ/秒以上
- **軽量**: メモリ使用量わずか数MB
- **シンプル**: 学習コストが低い
- **多様なパターン**: Pub/Sub、Request/Reply、Queue Groups
- **永続化**: JetStreamで信頼性の高い配信

### 適用場面

- マイクロサービス間の通信
- イベント駆動アーキテクチャ
- リアルタイムデータ配信
- IoTデバイスの通信
- チャットアプリケーション

### 学習リソース

- [公式ドキュメント](https://docs.nats.io/)
- [NATS by Example](https://natsbyexample.com/)
- [GitHub](https://github.com/nats-io/nats-server)

NATSは、複雑なメッセージングを驚くほどシンプルに実現します。次のプロジェクトでぜひ活用してみてください。

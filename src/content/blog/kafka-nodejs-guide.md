---
title: 'Apache Kafka完全ガイド — Node.js・イベント駆動アーキテクチャ・マイクロサービス連携'
description: 'Apache KafkaをNode.jsで活用するイベント駆動アーキテクチャの完全ガイド。Topic・Producer・Consumer・Consumer Group・Partition・kafkajs実装・スキーマレジストリ・Kafka Connect・モニタリングまで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-2.jpg'
tags: ['Kafka', 'Node.js', 'イベント駆動', 'メッセージキュー', 'マイクロサービス']
---

Apache Kafkaは、LinkedInが2011年にオープンソース化した分散ストリーミングプラットフォームだ。現在では世界中の大規模システムで採用され、1秒間に数百万件のイベントを処理するインフラの中核を担っている。本記事では、Kafkaのアーキテクチャを根本から理解し、Node.js（TypeScript）での実践的な実装方法を徹底解説する。

---

## 1. Apache Kafkaとは — RabbitMQ / SQS との比較

### Kafkaの本質

Kafkaは「分散コミットログ」として設計された。メッセージを受け取って届けるだけでなく、**ログとして永続化し、任意のタイミングで再読み込みできる**点が他のメッセージブローカーと根本的に異なる。

| 特性 | Apache Kafka | RabbitMQ | Amazon SQS |
|------|-------------|----------|------------|
| メッセージ保持 | 設定期間（デフォルト7日）永続 | 消費後削除 | 消費後削除（最大14日） |
| スループット | 極めて高い（数百万/秒） | 中〜高 | 中 |
| 配信保証 | At-least-once / Exactly-once | At-most-once / At-least-once | At-least-once |
| コンシューマー型 | Pull型（Consumer主導） | Push型（Broker主導） | Pull型 |
| 再生（Replay） | 可能（Offset指定） | 不可 | 不可 |
| プロトコル | 独自バイナリ | AMQP | HTTPベースAWS API |
| 管理コスト | 高い | 中程度 | 低い（マネージド） |
| 適合ユースケース | ストリーム処理・イベントソーシング・CDC | タスクキュー・RPC・複雑ルーティング | シンプルなタスクキュー・AWS統合 |

### いつKafkaを選ぶべきか

**Kafkaが適している場面**
- 大量のリアルタイムイベントを処理する（ユーザー行動ログ、IoTセンサーデータ）
- イベントソーシングパターンでシステムの状態変化を記録する
- 複数のマイクロサービスが同一イベントを独立して処理する
- 過去のイベントを再処理（バッチ処理・ML学習データ生成）する
- データベースの変更をリアルタイムで他システムに連携（CDC）する

**RabbitMQが適している場面**
- タスクキューとして使いたい（ジョブ処理）
- 複雑なルーティング（Exchange・Binding）が必要
- メッセージ消費確認後すぐ削除して良い

**SQSが適している場面**
- AWSエコシステムに乗っており運用コストを最小化したい
- シンプルなFIFOキューで十分
- マネージドサービスが必須

---

## 2. Kafkaアーキテクチャ詳解

### Broker（ブローカー）

Kafkaクラスターを構成するサーバーノードを「Broker」と呼ぶ。各BrokerはTopicのPartitionを担当し、Producerからのメッセージ受信とConsumerへの配信を行う。

複数のBrokerでクラスターを構成することで**高可用性**を実現する。リーダーBrokerが障害を起こしても、レプリカを持つ他のBrokerが自動的にリーダーに昇格する。

### ZooKeeperとKRaft

従来のKafkaはApache ZooKeeperをクラスター管理（リーダー選出・設定管理）に使用していたが、**Kafka 3.3以降ではKRaftモード**（KafkaのRaftコンセンサスプロトコル）が安定版となり、ZooKeeper依存が解消された。

### Topic（トピック）

Topicはメッセージの「カテゴリー」または「チャンネル」だ。Kafkaのすべてのメッセージは何らかのTopicに書き込まれる。

```
Kafka Cluster
├── Topic: user-events
│   ├── Partition 0  [msg0] [msg1] [msg2] [msg3] ...
│   ├── Partition 1  [msg0] [msg1] [msg2] ...
│   └── Partition 2  [msg0] [msg1] ...
├── Topic: order-created
│   ├── Partition 0  ...
│   └── Partition 1  ...
└── Topic: payment-processed
    └── Partition 0  ...
```

### Partition（パーティション）

Topicは1つ以上のPartitionに分割される。Partitionは**順序保証の単位**であり、同一Partition内のメッセージは書き込まれた順序で読み出せる。

Partitionを増やすことでTopicのスループットをスケールできる（並列処理が可能になる）。ただしPartition数は増やせるが**減らせない**点に注意。

### Offset（オフセット）

各Partition内のメッセージには0から始まる連番の「Offset」が割り当てられる。ConsumerはOffsetを管理することで「どこまで読んだか」を追跡し、再起動後も続きから処理できる。

```
Partition 0:
Offset: 0    1    2    3    4    5    6
        [A] [B] [C] [D] [E] [F] [G]
                              ^
                         Consumer現在位置 (committed offset: 4)
```

### Consumer Group（コンシューマーグループ）

Consumer Groupは複数のConsumerが協調して1つのTopicを処理する仕組みだ。**同一グループ内では各Partitionは必ず1つのConsumerのみが担当**する（排他処理）。

```
Topic: user-events (3 Partitions)

Consumer Group A (3 Consumers)
  Consumer A1 → Partition 0
  Consumer A2 → Partition 1
  Consumer A3 → Partition 2

Consumer Group B (2 Consumers)  ← 同じTopicを独立して処理可能
  Consumer B1 → Partition 0, 1
  Consumer B2 → Partition 2
```

### Replication（レプリケーション）

各PartitionはReplication Factorの数だけ複製される。1つが「Leader」となり読み書きを担当、残りは「Follower」として同期コピーを保持する。

```
Replication Factor: 3

Partition 0:
  Broker 1 (Leader)  [msg0][msg1][msg2]
  Broker 2 (Follower) [msg0][msg1][msg2]
  Broker 3 (Follower) [msg0][msg1][msg2]
```

---

## 3. ローカル開発環境（Docker Compose・KRaft mode）

### docker-compose.yml（KRaft mode）

```yaml
# docker-compose.yml
version: '3.8'

services:
  kafka:
    image: confluentinc/cp-kafka:7.6.0
    container_name: kafka
    ports:
      - "9092:9092"
      - "9101:9101"
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: 'CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT'
      KAFKA_ADVERTISED_LISTENERS: 'PLAINTEXT://kafka:29092,PLAINTEXT_HOST://localhost:9092'
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
      KAFKA_JMX_PORT: 9101
      KAFKA_JMX_HOSTNAME: localhost
      KAFKA_PROCESS_ROLES: 'broker,controller'
      KAFKA_CONTROLLER_QUORUM_VOTERS: '1@kafka:29093'
      KAFKA_LISTENERS: 'PLAINTEXT://kafka:29092,CONTROLLER://kafka:29093,PLAINTEXT_HOST://0.0.0.0:9092'
      KAFKA_INTER_BROKER_LISTENER_NAME: 'PLAINTEXT'
      KAFKA_CONTROLLER_LISTENER_NAMES: 'CONTROLLER'
      KAFKA_LOG_DIRS: '/tmp/kraft-combined-logs'
      CLUSTER_ID: 'MkU3OEVBNTcwNTJENDM2Qg'
    volumes:
      - kafka-data:/tmp/kraft-combined-logs

  schema-registry:
    image: confluentinc/cp-schema-registry:7.6.0
    container_name: schema-registry
    depends_on:
      - kafka
    ports:
      - "8081:8081"
    environment:
      SCHEMA_REGISTRY_HOST_NAME: schema-registry
      SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: 'kafka:29092'
      SCHEMA_REGISTRY_LISTENERS: http://0.0.0.0:8081

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    container_name: kafka-ui
    depends_on:
      - kafka
      - schema-registry
    ports:
      - "8080:8080"
    environment:
      KAFKA_CLUSTERS_0_NAME: local
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:29092
      KAFKA_CLUSTERS_0_SCHEMAREGISTRY: http://schema-registry:8081

  kafka-connect:
    image: confluentinc/cp-kafka-connect:7.6.0
    container_name: kafka-connect
    depends_on:
      - kafka
      - schema-registry
    ports:
      - "8083:8083"
    environment:
      CONNECT_BOOTSTRAP_SERVERS: 'kafka:29092'
      CONNECT_REST_ADVERTISED_HOST_NAME: kafka-connect
      CONNECT_GROUP_ID: compose-connect-group
      CONNECT_CONFIG_STORAGE_TOPIC: docker-connect-configs
      CONNECT_CONFIG_STORAGE_REPLICATION_FACTOR: 1
      CONNECT_OFFSET_FLUSH_INTERVAL_MS: 10000
      CONNECT_OFFSET_STORAGE_TOPIC: docker-connect-offsets
      CONNECT_OFFSET_STORAGE_REPLICATION_FACTOR: 1
      CONNECT_STATUS_STORAGE_TOPIC: docker-connect-status
      CONNECT_STATUS_STORAGE_REPLICATION_FACTOR: 1
      CONNECT_KEY_CONVERTER: org.apache.kafka.connect.storage.StringConverter
      CONNECT_VALUE_CONVERTER: io.confluent.connect.avro.AvroConverter
      CONNECT_VALUE_CONVERTER_SCHEMA_REGISTRY_URL: http://schema-registry:8081

volumes:
  kafka-data:
```

```bash
# 起動
docker-compose up -d

# 状態確認
docker-compose ps

# Kafka UIアクセス
open http://localhost:8080

# トピック一覧（CLIから確認）
docker exec kafka kafka-topics --list --bootstrap-server localhost:9092
```

---

## 4. kafkajs セットアップ（Node.js TypeScript）

### プロジェクト初期化

```bash
mkdir kafka-app && cd kafka-app
npm init -y
npm install kafkajs
npm install -D typescript ts-node @types/node tsx
npx tsc --init
```

```json
// tsconfig.json（重要な設定）
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### Kafkaクライアント設定

```typescript
// src/kafka/client.ts
import { Kafka, logLevel } from 'kafkajs';

export const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['localhost:9092'],
  // SSL設定（本番環境）
  // ssl: {
  //   rejectUnauthorized: false,
  //   ca: [fs.readFileSync('/path/to/ca.pem', 'utf-8')],
  //   cert: fs.readFileSync('/path/to/cert.pem', 'utf-8'),
  //   key: fs.readFileSync('/path/to/key.pem', 'utf-8'),
  // },
  // SASL認証（Confluent Cloud等）
  // sasl: {
  //   mechanism: 'plain',
  //   username: process.env.KAFKA_USERNAME!,
  //   password: process.env.KAFKA_PASSWORD!,
  // },
  logLevel: logLevel.INFO,
  // 接続タイムアウト・リトライ設定
  connectionTimeout: 3000,
  requestTimeout: 30000,
  retry: {
    initialRetryTime: 300,
    retries: 8,
  },
});
```

### トピック管理ユーティリティ

```typescript
// src/kafka/admin.ts
import { kafka } from './client';

const admin = kafka.admin();

export async function createTopics(): Promise<void> {
  await admin.connect();

  try {
    const created = await admin.createTopics({
      waitForLeaders: true,
      topics: [
        {
          topic: 'user-events',
          numPartitions: 3,
          replicationFactor: 1,
          configEntries: [
            { name: 'retention.ms', value: String(7 * 24 * 60 * 60 * 1000) }, // 7日
            { name: 'max.message.bytes', value: String(1024 * 1024) },          // 1MB
          ],
        },
        {
          topic: 'order-created',
          numPartitions: 6,
          replicationFactor: 1,
        },
        {
          topic: 'order-created.DLQ',  // Dead Letter Queue
          numPartitions: 1,
          replicationFactor: 1,
          configEntries: [
            { name: 'retention.ms', value: String(30 * 24 * 60 * 60 * 1000) }, // 30日
          ],
        },
      ],
    });

    console.log(`Topics created: ${created}`);

    // トピック一覧表示
    const topics = await admin.listTopics();
    console.log('All topics:', topics);

    // トピックのメタデータ確認
    const metadata = await admin.fetchTopicMetadata({ topics: ['user-events'] });
    console.log(JSON.stringify(metadata, null, 2));

  } finally {
    await admin.disconnect();
  }
}

// Consumer Groupのオフセットリセット（開発時に便利）
export async function resetConsumerGroupOffset(
  groupId: string,
  topic: string
): Promise<void> {
  await admin.connect();
  try {
    await admin.resetOffsets({
      groupId,
      topic,
      earliest: true,  // 最初のメッセージから再処理
    });
    console.log(`Offset reset for group ${groupId} on topic ${topic}`);
  } finally {
    await admin.disconnect();
  }
}
```

---

## 5. Producer実装（send・partition・key・headers）

### 型定義

```typescript
// src/types/events.ts
export interface UserEvent {
  eventId: string;
  userId: string;
  eventType: 'signup' | 'login' | 'purchase' | 'logout';
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface OrderCreatedEvent {
  orderId: string;
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  currency: string;
  createdAt: string;
}
```

### Producerの実装

```typescript
// src/kafka/producer.ts
import { Producer, Message, CompressionTypes, ProducerRecord } from 'kafkajs';
import { kafka } from './client';
import { UserEvent, OrderCreatedEvent } from '../types/events';

class KafkaProducer {
  private producer: Producer;
  private isConnected = false;

  constructor() {
    this.producer = kafka.producer({
      // トランザクション使用時
      // transactionalId: 'my-transactional-producer',
      // idempotent: true,  // べき等プロデューサー（重複排除）
      allowAutoTopicCreation: false,
      transactionTimeout: 30000,
      // バッファリング設定（スループット最適化）
      maxInFlightRequests: 5,
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.producer.connect();
      this.isConnected = true;
      console.log('Kafka Producer connected');
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.producer.disconnect();
      this.isConnected = false;
    }
  }

  // ユーザーイベント送信
  async sendUserEvent(event: UserEvent): Promise<void> {
    await this.connect();

    const message: Message = {
      // キー: 同一ユーザーのイベントを同一Partitionに送る（順序保証）
      key: event.userId,
      value: JSON.stringify(event),
      // ヘッダー: メタデータ（ルーティング・デバッグ用）
      headers: {
        'event-type': event.eventType,
        'schema-version': '1.0',
        'source-service': 'user-service',
        'correlation-id': event.eventId,
      },
      // タイムスタンプ（ミリ秒）
      timestamp: new Date(event.timestamp).getTime().toString(),
    };

    const record: ProducerRecord = {
      topic: 'user-events',
      messages: [message],
      compression: CompressionTypes.GZIP,
      acks: -1,  // all: 全レプリカへの書き込み確認（最高の耐久性）
      // acks: 0  // fire and forget（最高のスループット・データロスあり）
      // acks: 1  // リーダーのみ確認（バランス型）
    };

    const result = await this.producer.send(record);
    console.log(`Message sent: partition=${result[0].partition}, offset=${result[0].baseOffset}`);
  }

  // バッチ送信（高スループット）
  async sendBatch(events: UserEvent[]): Promise<void> {
    await this.connect();

    const messages: Message[] = events.map(event => ({
      key: event.userId,
      value: JSON.stringify(event),
      headers: {
        'event-type': event.eventType,
        'batch-id': crypto.randomUUID(),
      },
    }));

    await this.producer.send({
      topic: 'user-events',
      messages,
      compression: CompressionTypes.SNAPPY,
    });

    console.log(`Batch sent: ${events.length} messages`);
  }

  // 複数トピックへの送信
  async sendToMultipleTopics(
    userEvent: UserEvent,
    orderEvent: OrderCreatedEvent
  ): Promise<void> {
    await this.connect();

    await this.producer.sendBatch({
      topicMessages: [
        {
          topic: 'user-events',
          messages: [{ key: userEvent.userId, value: JSON.stringify(userEvent) }],
        },
        {
          topic: 'order-created',
          messages: [{ key: orderEvent.orderId, value: JSON.stringify(orderEvent) }],
        },
      ],
      acks: -1,
      compression: CompressionTypes.GZIP,
    });
  }

  // パーティション直接指定（特定データを特定パーティションへ）
  async sendToSpecificPartition(
    event: UserEvent,
    partitionIndex: number
  ): Promise<void> {
    await this.connect();

    await this.producer.send({
      topic: 'user-events',
      messages: [
        {
          partition: partitionIndex,
          key: event.userId,
          value: JSON.stringify(event),
        },
      ],
    });
  }
}

export const kafkaProducer = new KafkaProducer();

// 使用例
async function main() {
  const event: UserEvent = {
    eventId: crypto.randomUUID(),
    userId: 'user-123',
    eventType: 'purchase',
    timestamp: new Date().toISOString(),
    metadata: {
      productId: 'prod-456',
      amount: 9800,
    },
  };

  await kafkaProducer.sendUserEvent(event);
  await kafkaProducer.disconnect();
}
```

---

## 6. Consumer実装（subscribe・run・commit管理）

### 基本的なConsumer

```typescript
// src/kafka/consumer.ts
import { Consumer, EachMessagePayload, EachBatchPayload } from 'kafkajs';
import { kafka } from './client';
import { UserEvent } from '../types/events';

class KafkaConsumer {
  private consumer: Consumer;

  constructor(groupId: string) {
    this.consumer = kafka.consumer({
      groupId,
      // セッションタイムアウト（ハートビート失敗判定まで）
      sessionTimeout: 30000,
      // ハートビート間隔（sessionTimeoutの1/3以下推奨）
      heartbeatInterval: 3000,
      // 自動オフセットコミット（デフォルトtrue）
      // falseにして手動コミットで確実な処理保証
      autoCommit: false,
      autoCommitInterval: 5000,
      autoCommitThreshold: 100,
    });
  }

  // メッセージ1件ずつ処理（シンプル・低スループット）
  async startMessageConsumer(): Promise<void> {
    await this.consumer.connect();

    await this.consumer.subscribe({
      topics: ['user-events'],
      // fromBeginning: true,  // 最初から再読み込み（デフォルトfalse）
    });

    await this.consumer.run({
      // autoCommit: falseの場合、手動でコミット
      eachMessage: async ({ topic, partition, message, heartbeat, pause }: EachMessagePayload) => {
        // ハートビートで生存確認（長時間処理時に必要）
        await heartbeat();

        const key = message.key?.toString();
        const value = message.value?.toString();
        const headers = message.headers;

        if (!value) return;

        try {
          const event: UserEvent = JSON.parse(value);
          console.log(`Processing event: ${event.eventType} for user ${event.userId}`);
          console.log(`  topic=${topic}, partition=${partition}, offset=${message.offset}`);
          console.log(`  headers: event-type=${headers?.['event-type']?.toString()}`);

          // ビジネスロジック実行
          await processUserEvent(event);

          // 手動コミット（処理成功後）
          await this.consumer.commitOffsets([{
            topic,
            partition,
            offset: (BigInt(message.offset) + 1n).toString(),
          }]);

        } catch (error) {
          console.error('Message processing failed:', error);
          // エラー時: pauseして再試行 or DLQへ送信
          const resume = pause();
          setTimeout(resume, 5000);  // 5秒後に再開
          throw error;
        }
      },
    });
  }

  // バッチ処理（高スループット）
  async startBatchConsumer(): Promise<void> {
    await this.consumer.connect();

    await this.consumer.subscribe({ topics: ['user-events'] });

    await this.consumer.run({
      eachBatch: async ({
        batch,
        resolveOffset,
        heartbeat,
        commitOffsetsIfNecessary,
        isRunning,
        isStale,
      }: EachBatchPayload) => {

        console.log(
          `Batch: topic=${batch.topic}, partition=${batch.partition}, ` +
          `messages=${batch.messages.length}`
        );

        for (const message of batch.messages) {
          if (!isRunning() || isStale()) break;  // シャットダウン・リバランス検出

          const value = message.value?.toString();
          if (!value) continue;

          try {
            const event: UserEvent = JSON.parse(value);
            await processUserEvent(event);

            // オフセット解決（バッチ内で個別にマーク）
            resolveOffset(message.offset);

            // 定期的にハートビートを送信
            await heartbeat();

          } catch (error) {
            console.error(`Failed to process offset ${message.offset}:`, error);
            // バッチ処理では失敗メッセージをスキップするかDLQへ
          }
        }

        // バッチ完了後にオフセットをコミット
        await commitOffsetsIfNecessary();
      },
    });
  }

  async stop(): Promise<void> {
    await this.consumer.stop();
    await this.consumer.disconnect();
  }
}

async function processUserEvent(event: UserEvent): Promise<void> {
  // 実際のビジネスロジック
  switch (event.eventType) {
    case 'signup':
      console.log(`New user signed up: ${event.userId}`);
      // ウェルカムメール送信、プロフィール初期化等
      break;
    case 'purchase':
      console.log(`Purchase event: ${event.userId}`);
      // 在庫更新、請求処理、通知送信等
      break;
    default:
      console.log(`Unhandled event type: ${event.eventType}`);
  }
}

export const userEventConsumer = new KafkaConsumer('user-service-group');
```

---

## 7. Consumer Group（並列処理・リバランス）

### リバランスの仕組みと対策

Consumer GroupにConsumerが追加/削除されると「リバランス」が発生し、Partitionの割り当てが再計算される。リバランス中は**全Consumerが一時停止**する（Stop-the-world）。

```typescript
// src/kafka/consumer-with-rebalance.ts
import { Consumer, ConsumerRunConfig } from 'kafkajs';
import { kafka } from './client';

async function startWithRebalanceHandling(): Promise<void> {
  const consumer = kafka.consumer({
    groupId: 'order-processing-group',
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
    // Cooperative Sticky Assignorで増分リバランス（停止時間短縮）
    // デフォルトはRangeAssignor
  });

  await consumer.connect();

  // リバランスイベントのリスニング
  consumer.on('consumer.rebalancing', ({ payload }) => {
    console.log('Rebalancing started:', payload);
  });

  consumer.on('consumer.group_join', ({ payload }) => {
    console.log('Joined group:', payload);
  });

  consumer.on('consumer.crash', ({ payload }) => {
    console.error('Consumer crashed:', payload);
    process.exit(1);
  });

  await consumer.subscribe({ topic: 'order-created' });

  // 処理中のオフセットを追跡（リバランス時に安全にコミット）
  const processingOffsets = new Map<string, string>();

  const runConfig: ConsumerRunConfig = {
    autoCommit: false,
    eachMessage: async ({ topic, partition, message }) => {
      const key = `${topic}-${partition}`;
      processingOffsets.set(key, message.offset);

      try {
        const order = JSON.parse(message.value!.toString());
        await processOrder(order);

        // 処理成功後にオフセットをコミット
        await consumer.commitOffsets([{
          topic,
          partition,
          offset: (BigInt(message.offset) + 1n).toString(),
        }]);

        processingOffsets.delete(key);

      } catch (error) {
        console.error('Order processing failed:', error);
        throw error;
      }
    },
  };

  await consumer.run(runConfig);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down consumer...');
    await consumer.stop();
    await consumer.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

async function processOrder(order: unknown): Promise<void> {
  // 注文処理ロジック
  console.log('Processing order:', order);
  await new Promise(resolve => setTimeout(resolve, 100)); // 処理シミュレーション
}
```

### 並列処理スケーリング

```
Topic: order-created (6 Partitions)

スケールアウト例:
Pod 1: Consumer → Partition 0, 1
Pod 2: Consumer → Partition 2, 3
Pod 3: Consumer → Partition 4, 5

水平スケール後:
Pod 1: Consumer → Partition 0
Pod 2: Consumer → Partition 1
Pod 3: Consumer → Partition 2
Pod 4: Consumer → Partition 3
Pod 5: Consumer → Partition 4
Pod 6: Consumer → Partition 5

注意: Consumer数 > Partition数の場合、超過分のConsumerはアイドル状態
```

---

## 8. エラーハンドリング・リトライ（DLQ・指数バックオフ）

### Dead Letter Queue（デッドレターキュー）パターン

処理に失敗したメッセージを専用のDLQトピックに送り、後から調査・再処理できる仕組みだ。

```typescript
// src/kafka/error-handler.ts
import { kafka } from './client';
import { CompressionTypes } from 'kafkajs';

interface ProcessingError {
  originalTopic: string;
  originalPartition: number;
  originalOffset: string;
  errorMessage: string;
  errorStack?: string;
  retryCount: number;
  originalMessage: string;
  timestamp: string;
}

class DLQHandler {
  private producer = kafka.producer();
  private isConnected = false;

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.producer.connect();
      this.isConnected = true;
    }
  }

  async sendToDLQ(
    originalTopic: string,
    originalPartition: number,
    originalOffset: string,
    originalMessage: string,
    error: Error,
    retryCount: number
  ): Promise<void> {
    await this.connect();

    const dlqMessage: ProcessingError = {
      originalTopic,
      originalPartition,
      originalOffset,
      errorMessage: error.message,
      errorStack: error.stack,
      retryCount,
      originalMessage,
      timestamp: new Date().toISOString(),
    };

    await this.producer.send({
      topic: `${originalTopic}.DLQ`,
      messages: [
        {
          key: `${originalTopic}-${originalPartition}-${originalOffset}`,
          value: JSON.stringify(dlqMessage),
          headers: {
            'dlq-reason': error.message,
            'dlq-retry-count': retryCount.toString(),
            'dlq-original-topic': originalTopic,
          },
        },
      ],
      acks: -1,
      compression: CompressionTypes.GZIP,
    });

    console.log(`Message sent to DLQ: ${originalTopic}.DLQ`);
  }
}

// 指数バックオフ付きリトライConsumer
class RetryableConsumer {
  private consumer = kafka.consumer({ groupId: 'retry-consumer-group' });
  private dlqHandler = new DLQHandler();
  private readonly MAX_RETRIES = 3;

  async start(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'user-events' });

    await this.consumer.run({
      autoCommit: false,
      eachMessage: async ({ topic, partition, message }) => {
        let retryCount = 0;
        const maxRetries = this.MAX_RETRIES;

        while (retryCount <= maxRetries) {
          try {
            await this.processWithRetry(message.value!.toString(), retryCount);

            // 成功時: オフセットコミット
            await this.consumer.commitOffsets([{
              topic,
              partition,
              offset: (BigInt(message.offset) + 1n).toString(),
            }]);
            return;

          } catch (error) {
            retryCount++;
            console.error(`Attempt ${retryCount}/${maxRetries + 1} failed:`, error);

            if (retryCount > maxRetries) {
              // 最大リトライ超過: DLQへ送信
              await this.dlqHandler.sendToDLQ(
                topic,
                partition,
                message.offset,
                message.value!.toString(),
                error as Error,
                retryCount
              );

              // DLQ送信後はオフセットをコミット（同じメッセージを無限に処理しない）
              await this.consumer.commitOffsets([{
                topic,
                partition,
                offset: (BigInt(message.offset) + 1n).toString(),
              }]);
              return;
            }

            // 指数バックオフ: 1s, 2s, 4s...
            const backoffMs = Math.min(1000 * Math.pow(2, retryCount - 1), 30000);
            console.log(`Waiting ${backoffMs}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
          }
        }
      },
    });
  }

  private async processWithRetry(rawMessage: string, retryCount: number): Promise<void> {
    // 外部APIコール等、一時的な失敗が起こりうる処理
    const data = JSON.parse(rawMessage);
    // 実際の処理...
    if (Math.random() < 0.3 && retryCount < 2) {
      throw new Error('Transient error - will retry');
    }
    console.log('Message processed successfully:', data);
  }
}
```

---

## 9. スキーマレジストリ（Avro・Schema Evolution）

スキーマレジストリはメッセージの型定義を一元管理し、ProducerとConsumer間の**スキーマ互換性**を保証する。

### Avroスキーマ定義

```typescript
// src/schema/user-event.ts
import { SchemaRegistry, SchemaType } from '@kafkajs/confluent-schema-registry';

const registry = new SchemaRegistry({
  host: 'http://localhost:8081',
  // 認証が必要な場合
  // auth: { username: 'user', password: 'pass' },
});

// Avroスキーマ定義
const userEventSchemaV1 = {
  type: 'record',
  name: 'UserEvent',
  namespace: 'com.myapp.events',
  fields: [
    { name: 'eventId', type: 'string' },
    { name: 'userId', type: 'string' },
    { name: 'eventType', type: { type: 'enum', name: 'EventType', symbols: ['SIGNUP', 'LOGIN', 'PURCHASE', 'LOGOUT'] } },
    { name: 'timestamp', type: 'string' },
  ],
};

// スキーマ進化（後方互換）: フィールド追加はデフォルト値必須
const userEventSchemaV2 = {
  type: 'record',
  name: 'UserEvent',
  namespace: 'com.myapp.events',
  fields: [
    { name: 'eventId', type: 'string' },
    { name: 'userId', type: 'string' },
    { name: 'eventType', type: { type: 'enum', name: 'EventType', symbols: ['SIGNUP', 'LOGIN', 'PURCHASE', 'LOGOUT', 'DELETE'] } },
    { name: 'timestamp', type: 'string' },
    // 新規フィールドはデフォルト値を設定（後方互換性確保）
    { name: 'metadata', type: ['null', 'string'], default: null },
    { name: 'sessionId', type: ['null', 'string'], default: null },
  ],
};

// スキーマ登録
async function registerSchemas(): Promise<{ v1Id: number; v2Id: number }> {
  const { id: v1Id } = await registry.register(
    {
      type: SchemaType.AVRO,
      schema: JSON.stringify(userEventSchemaV1),
    },
    { subject: 'user-events-value' }  // Subject名: {topic}-value
  );

  const { id: v2Id } = await registry.register(
    {
      type: SchemaType.AVRO,
      schema: JSON.stringify(userEventSchemaV2),
    },
    { subject: 'user-events-value' }
  );

  console.log(`Schema V1 registered: id=${v1Id}`);
  console.log(`Schema V2 registered: id=${v2Id}`);

  return { v1Id, v2Id };
}

// Avro対応Producer
async function sendAvroMessage(schemaId: number): Promise<void> {
  const producer = kafka.producer();
  await producer.connect();

  const payload = {
    eventId: crypto.randomUUID(),
    userId: 'user-123',
    eventType: 'PURCHASE',
    timestamp: new Date().toISOString(),
    metadata: JSON.stringify({ amount: 9800 }),
    sessionId: 'sess-abc',
  };

  // Avroエンコード（スキーマIDをプレフィックスとして付与）
  const encodedValue = await registry.encode(schemaId, payload);

  await producer.send({
    topic: 'user-events',
    messages: [{ key: payload.userId, value: encodedValue }],
  });

  await producer.disconnect();
}

// Avro対応Consumer（自動デコード）
async function startAvroConsumer(): Promise<void> {
  const consumer = kafka.consumer({ groupId: 'avro-consumer-group' });
  await consumer.connect();
  await consumer.subscribe({ topic: 'user-events' });

  await consumer.run({
    eachMessage: async ({ message }) => {
      // スキーマIDを自動検出してデコード
      const decoded = await registry.decode(message.value!);
      console.log('Decoded message:', decoded);
    },
  });
}
```

---

## 10. トランザクション（Exactly-once Semantics）

KafkaのExactly-once処理は「トランザクショナルプロデューサー」と「べき等プロデューサー」で実現する。

```typescript
// src/kafka/transactional-producer.ts
import { kafka } from './client';

async function processWithExactlyOnce(
  inputMessage: string,
  outputTopic: string
): Promise<void> {
  // トランザクショナルプロデューサー
  const producer = kafka.producer({
    transactionalId: `txn-producer-${process.pid}`,
    idempotent: true,
    maxInFlightRequests: 1,  // トランザクション使用時は1必須
  });

  const consumer = kafka.consumer({
    groupId: 'transactional-consumer-group',
    // readUncommitted: false  // デフォルト: コミット済みのみ読み取り
    // readUncommitted: true   // 未コミットも読み取り（デバッグ時）
  });

  await producer.connect();
  await consumer.connect();
  await consumer.subscribe({ topic: 'user-events' });

  await consumer.run({
    autoCommit: false,
    eachBatch: async ({ batch, commitOffsetsIfNecessary }) => {
      // トランザクション開始
      const transaction = await producer.transaction();

      try {
        for (const message of batch.messages) {
          const event = JSON.parse(message.value!.toString());

          // 変換処理
          const enrichedEvent = {
            ...event,
            processedAt: new Date().toISOString(),
            version: '2.0',
          };

          // トランザクション内で送信
          await transaction.send({
            topic: outputTopic,
            messages: [
              {
                key: message.key,
                value: JSON.stringify(enrichedEvent),
              },
            ],
          });
        }

        // Consumer OffsetをKafkaに送信（外部ストアではなく）
        await transaction.sendOffsets({
          consumerGroupId: 'transactional-consumer-group',
          topics: [
            {
              topic: batch.topic,
              partitions: [
                {
                  partition: batch.partition,
                  offset: String(
                    Number(batch.messages[batch.messages.length - 1].offset) + 1
                  ),
                },
              ],
            },
          ],
        });

        // コミット（原子的に Producer送信 + Consumer Offset更新）
        await transaction.commit();
        console.log(`Transaction committed: ${batch.messages.length} messages`);

      } catch (error) {
        console.error('Transaction failed, aborting:', error);
        await transaction.abort();
        throw error;
      }
    },
  });
}
```

---

## 11. Kafka Connect（DB変更イベントキャプチャ・CDC）

Kafka ConnectはKafkaとデータソース（DB、ファイル、クラウドサービス等）を接続するフレームワークだ。Change Data Capture（CDC）により、データベースの変更（INSERT/UPDATE/DELETE）をリアルタイムでKafkaに流せる。

### Debezium PostgreSQL Connectorの設定

```bash
# Kafka Connect REST APIでコネクターを登録
curl -X POST http://localhost:8083/connectors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "postgres-cdc-connector",
    "config": {
      "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
      "database.hostname": "postgres",
      "database.port": "5432",
      "database.user": "postgres",
      "database.password": "postgres",
      "database.dbname": "myapp",
      "database.server.name": "myapp",
      "table.include.list": "public.users,public.orders",
      "topic.prefix": "cdc",
      "plugin.name": "pgoutput",
      "slot.name": "debezium_slot",
      "publication.name": "debezium_pub",
      "transforms": "route",
      "transforms.route.type": "org.apache.kafka.connect.transforms.ReplaceField$Value",
      "key.converter": "org.apache.kafka.connect.json.JsonConverter",
      "value.converter": "org.apache.kafka.connect.json.JsonConverter"
    }
  }'
```

```typescript
// src/kafka/cdc-consumer.ts
// CDCイベントの型定義（Debezium形式）
interface DebeziumEvent<T = Record<string, unknown>> {
  before: T | null;   // 変更前の状態（DELETEの場合は変更前レコード）
  after: T | null;    // 変更後の状態（DELETEの場合null）
  source: {
    version: string;
    connector: string;
    name: string;
    ts_ms: number;
    schema: string;
    table: string;
    txId: number;
    lsn: number;
  };
  op: 'c' | 'u' | 'd' | 'r';  // create/update/delete/read（スナップショット）
  ts_ms: number;
}

async function consumeCDCEvents(): Promise<void> {
  const consumer = kafka.consumer({ groupId: 'cdc-consumer-group' });
  await consumer.connect();

  // CDC Topicを購読（テーブル名がトピック名になる）
  await consumer.subscribe({
    topics: ['cdc.public.users', 'cdc.public.orders'],
  });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const event: DebeziumEvent = JSON.parse(message.value!.toString());

      const tableName = topic.split('.').slice(1).join('.');

      switch (event.op) {
        case 'c':
          console.log(`[INSERT] ${tableName}:`, event.after);
          await handleInsert(tableName, event.after!);
          break;
        case 'u':
          console.log(`[UPDATE] ${tableName}: before=`, event.before, 'after=', event.after);
          await handleUpdate(tableName, event.before!, event.after!);
          break;
        case 'd':
          console.log(`[DELETE] ${tableName}:`, event.before);
          await handleDelete(tableName, event.before!);
          break;
        case 'r':
          console.log(`[SNAPSHOT] ${tableName}:`, event.after);
          break;
      }
    },
  });
}

async function handleInsert(table: string, record: Record<string, unknown>): Promise<void> {
  // Elasticsearchへのインデックス更新、キャッシュ更新等
  console.log(`Syncing insert to search index: ${table}`);
}

async function handleUpdate(
  table: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Promise<void> {
  console.log(`Syncing update to search index: ${table}`);
}

async function handleDelete(table: string, record: Record<string, unknown>): Promise<void> {
  console.log(`Removing from search index: ${table}`);
}
```

---

## 12. Kafka Streams基礎（ストリーム処理）

Kafka StreamsはKafkaのデータをリアルタイムで変換・集計するクライアントライブラリだ。Node.jsではkafkajsのConsumer/Producerを組み合わせてストリーム処理を実装する。

```typescript
// src/kafka/stream-processor.ts
// Node.jsでKafka Streams相当の処理パターン

import { kafka } from './client';
import { CompressionTypes } from 'kafkajs';

interface UserEvent {
  userId: string;
  eventType: string;
  timestamp: string;
}

interface UserActivity {
  userId: string;
  eventCount: number;
  lastEventAt: string;
  windowStart: string;
  windowEnd: string;
}

// タンブリングウィンドウ集計（1分ごと）
class TumblingWindowAggregator {
  private windowSize = 60 * 1000; // 1分（ミリ秒）
  private windows = new Map<string, Map<string, UserActivity>>();

  aggregate(event: UserEvent): UserActivity | null {
    const eventTime = new Date(event.timestamp).getTime();
    const windowStart = Math.floor(eventTime / this.windowSize) * this.windowSize;
    const windowKey = windowStart.toString();

    if (!this.windows.has(windowKey)) {
      this.windows.set(windowKey, new Map());
      // 古いウィンドウのクリーンアップ
      this.cleanupOldWindows(eventTime);
    }

    const window = this.windows.get(windowKey)!;
    const existing = window.get(event.userId);

    const updated: UserActivity = {
      userId: event.userId,
      eventCount: (existing?.eventCount ?? 0) + 1,
      lastEventAt: event.timestamp,
      windowStart: new Date(windowStart).toISOString(),
      windowEnd: new Date(windowStart + this.windowSize).toISOString(),
    };

    window.set(event.userId, updated);
    return updated;
  }

  private cleanupOldWindows(currentTime: number): void {
    const cutoff = currentTime - this.windowSize * 10; // 10ウィンドウ分保持
    for (const [key] of this.windows) {
      if (Number(key) < cutoff) {
        this.windows.delete(key);
      }
    }
  }
}

// ストリーム処理パイプライン
async function startStreamProcessor(): Promise<void> {
  const consumer = kafka.consumer({ groupId: 'stream-processor-group' });
  const producer = kafka.producer();
  const aggregator = new TumblingWindowAggregator();

  await consumer.connect();
  await producer.connect();
  await consumer.subscribe({ topic: 'user-events' });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const event: UserEvent = JSON.parse(message.value!.toString());

      // フィルタリング（購買イベントのみ）
      if (event.eventType !== 'purchase') return;

      // 集計
      const activity = aggregator.aggregate(event);
      if (!activity) return;

      // 結果を別トピックに出力
      await producer.send({
        topic: 'user-activity-aggregated',
        messages: [
          {
            key: `${activity.userId}-${activity.windowStart}`,
            value: JSON.stringify(activity),
          },
        ],
        compression: CompressionTypes.GZIP,
      });

      console.log(`Aggregated activity for ${activity.userId}: ${activity.eventCount} events`);
    },
  });
}
```

---

## 13. モニタリング（Kafka UI・Prometheus・Grafana）

### Kafka UI（Provectus）

先述のDocker Composeで起動したKafka UIにアクセスするだけで、以下が確認できる。

- **Topics**: メッセージ一覧・Partition状態・オフセット
- **Consumer Groups**: Lag（遅延）・Partition割り当て状態
- **Brokers**: ネットワーク・ディスク使用率
- **Schema Registry**: 登録スキーマ一覧・バージョン履歴
- **Kafka Connect**: コネクター状態・エラー

### JMX Exporter + Prometheusメトリクス

```yaml
# docker-compose.monitoring.yml
services:
  jmx-exporter:
    image: bitnami/jmx-exporter:latest
    container_name: jmx-exporter
    ports:
      - "5556:5556"
    volumes:
      - ./config/jmx-config.yaml:/opt/bitnami/jmx-exporter/config.yaml

  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./config/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    volumes:
      - grafana-data:/var/lib/grafana

volumes:
  grafana-data:
```

### Node.jsアプリケーションからのカスタムメトリクス

```typescript
// src/monitoring/kafka-metrics.ts
import { kafka } from '../kafka/client';

interface KafkaMetrics {
  groupId: string;
  topic: string;
  partition: number;
  currentOffset: number;
  highWatermark: number;
  lag: number;
}

class KafkaMonitor {
  private admin = kafka.admin();

  async getConsumerLag(groupId: string, topic: string): Promise<KafkaMetrics[]> {
    await this.admin.connect();

    try {
      // Consumer Groupのオフセット取得
      const groupOffsets = await this.admin.fetchOffsets({ groupId, topics: [topic] });

      // Topicの最新オフセット（High Watermark）取得
      const topicOffsets = await this.admin.fetchTopicOffsets(topic);

      const metrics: KafkaMetrics[] = [];

      for (const topicOffset of topicOffsets) {
        const groupOffset = groupOffsets[0]?.partitions.find(
          p => p.partition === topicOffset.partition
        );

        const currentOffset = Number(groupOffset?.offset ?? 0);
        const highWatermark = Number(topicOffset.high);
        const lag = Math.max(0, highWatermark - currentOffset);

        metrics.push({
          groupId,
          topic,
          partition: topicOffset.partition,
          currentOffset,
          highWatermark,
          lag,
        });
      }

      const totalLag = metrics.reduce((sum, m) => sum + m.lag, 0);
      console.log(`Consumer Group: ${groupId}, Topic: ${topic}, Total Lag: ${totalLag}`);

      // Lagが閾値超過でアラート
      if (totalLag > 10000) {
        console.warn(`ALERT: High consumer lag detected! Total lag: ${totalLag}`);
        // Slack通知・PagerDuty等への連携
      }

      return metrics;

    } finally {
      await this.admin.disconnect();
    }
  }

  // 定期的なLag監視
  startLagMonitoring(groupId: string, topic: string, intervalMs = 30000): NodeJS.Timer {
    console.log(`Starting lag monitoring for ${groupId}/${topic}`);
    return setInterval(async () => {
      try {
        await this.getConsumerLag(groupId, topic);
      } catch (error) {
        console.error('Failed to fetch consumer lag:', error);
      }
    }, intervalMs);
  }
}

export const kafkaMonitor = new KafkaMonitor();
```

### 主要な監視指標

| メトリクス | 説明 | アラート閾値（例） |
|-----------|------|------------------|
| `consumer_lag` | 未処理メッセージ数 | > 10,000 |
| `messages_in_per_sec` | Producer送信レート | 急激な低下/上昇 |
| `bytes_in_per_sec` | 受信バイト数 | ディスク容量に応じて |
| `replication_lag` | レプリカの遅延 | > 0（完全同期が理想） |
| `active_controller_count` | アクティブコントローラー数 | != 1 |
| `offline_partitions_count` | オフラインPartition数 | > 0 |
| `under_replicated_partitions` | 複製不足Partition数 | > 0 |

---

## 本番運用のベストプラクティス

### Topicの設計原則

```typescript
// ベストプラクティス: 命名規則を統一する
// パターン: {ドメイン}.{エンティティ}.{アクション}
// 例:
//   commerce.order.created
//   commerce.order.updated
//   commerce.payment.processed
//   user.profile.updated
//   user.session.started
//   analytics.user.behavior

// アンチパターン: 汎用すぎるトピック名
//   events  （何のイベントか不明）
//   messages（メッセージとは何か不明）
```

### パーティション数の見積もり

```
パーティション数の計算式:
  必要パーティション数 = max(目標スループット / Producer単一パーティションスループット,
                            目標スループット / Consumer単一パーティションスループット)

目安:
  - Producer: 20-50 MB/s per partition
  - Consumer: 50-100 MB/s per partition（処理が軽い場合）

例: 目標 200 MB/s
  → max(200/30, 200/50) ≈ max(6.7, 4) = 7 partitions → 8パーティションに設定
```

### セキュリティ設定（本番必須）

```typescript
// src/kafka/secure-client.ts
import * as fs from 'fs';
import { Kafka } from 'kafkajs';

export const secureKafka = new Kafka({
  clientId: 'secure-app',
  brokers: [
    'kafka1.example.com:9093',
    'kafka2.example.com:9093',
    'kafka3.example.com:9093',
  ],
  ssl: {
    rejectUnauthorized: true,
    ca: [fs.readFileSync('/etc/kafka/ssl/ca.pem', 'utf-8')],
    cert: fs.readFileSync('/etc/kafka/ssl/client-cert.pem', 'utf-8'),
    key: fs.readFileSync('/etc/kafka/ssl/client-key.pem', 'utf-8'),
  },
  sasl: {
    mechanism: 'scram-sha-512',
    username: process.env.KAFKA_USERNAME!,
    password: process.env.KAFKA_PASSWORD!,
  },
});
```

---

## Kafkaメッセージ開発時のデバッグ

Kafkaの開発で頻繁に発生する課題の一つが、**JSON形式のメッセージ構造の検証**だ。Producerが正しい形式でデータを送っているか、Consumer側で期待どおりにデシリアライズできるか確認するために、メッセージのJSONスキーマを素早く検証したい場面は多い。

[DevToolBox](https://usedevtools.com/) には JSON Validator・JSON Formatter・JSON Diff など、Kafkaメッセージのデバッグに役立つツールが揃っている。Kafka UIでメッセージの内容を確認しつつ、DevToolBoxのJSON Validatorで構造を検証するフローは開発効率を大幅に向上させる。特にスキーマレジストリを使う前の初期開発フェーズや、DLQに到着したエラーメッセージの調査時に重宝する。

---

## まとめ

本記事ではApache KafkaをNode.js（TypeScript）で活用するための包括的な実装方法を解説した。

**学んだ主要ポイント:**

1. **KafkaはRabbitMQ/SQSとは別物** — ログ永続化・再生可能・高スループットが強み
2. **アーキテクチャの理解が先決** — Partition・Offset・Consumer Groupを正しく理解することで設計ミスを防げる
3. **kafkajs** — Node.jsのde facto standardライブラリ。TypeScriptサポートが充実
4. **Producer設計** — acks設定・圧縮・バッチ送信でスループット最適化
5. **Consumer設計** — autoCommit無効化 + 手動コミットで処理保証を強化
6. **DLQ + リトライ** — 堅牢なエラーハンドリングで本番耐障害性を確保
7. **スキーマレジストリ** — Avroで型安全なメッセージ管理と後方互換性を確保
8. **Exactly-once** — トランザクションAPIで二重処理を完全排除
9. **CDC（Debezium）** — データベース変更のリアルタイムKafka連携
10. **Consumer Lagモニタリング** — Kafka UIとPrometheusで問題を早期検知

Kafkaは強力だが、運用コストも相応に高い。小規模なタスクキューであればRabbitMQやSQSで十分なケースも多い。スループット要件・再生要件・マイクロサービス間の複雑なイベント連携が必要になったとき、Kafkaは真価を発揮する。

まずはDockerでローカル環境を立ち上げ、kafkajsで簡単なProducer/Consumerを動かしてみることから始めよう。

---

*Apache Kafka公式ドキュメント: https://kafka.apache.org/documentation/*  
*kafkajs公式ドキュメント: https://kafka.js.org/*  
*Confluent Platform: https://docs.confluent.io/platform/current/overview.html*

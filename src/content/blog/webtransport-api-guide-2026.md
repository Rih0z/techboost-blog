---
title: 'WebTransport API実践ガイド2026｜HTTP/3ベースの次世代リアルタイム通信'
description: 'WebTransport APIの仕組みと実装を解説。HTTP/3(QUIC)ベースの双方向通信、WebSocketとの比較、ストリーム/データグラム、サーバー実装、ユースケースまで。'
pubDate: '2026-03-05'
tags: ['WebTransport', 'HTTP3', 'リアルタイム', 'Web API', 'TypeScript']
heroImage: '../../assets/thumbnails/webtransport-api-guide-2026.jpg'
---

## WebTransportとは

WebTransportは、HTTP/3（QUIC）プロトコル上に構築された次世代のクライアント・サーバー間通信APIです。WebSocketやServer-Sent Events（SSE）の限界を超え、低遅延・高効率なリアルタイム通信を実現します。

従来のリアルタイム通信手段と比較してみましょう。

| 特徴 | WebSocket | SSE | WebTransport |
|------|-----------|-----|-------------|
| プロトコル | TCP | HTTP/1.1, HTTP/2 | HTTP/3 (QUIC/UDP) |
| 通信方向 | 双方向 | サーバー→クライアント | 双方向 |
| ストリーム多重化 | 不可（1接続1ストリーム） | 不可 | 可能（複数ストリーム並行） |
| データグラム（UDP的） | 不可 | 不可 | 可能 |
| Head-of-Line Blocking | あり | あり | なし |
| 接続確立速度 | TCP + TLS（2-3 RTT） | TCP + TLS | 0-1 RTT（QUIC） |
| 順序保証 | あり | あり | ストリーム：あり / データグラム：なし |
| 信頼性 | あり | あり | ストリーム：あり / データグラム：なし |
| ブラウザサポート | ほぼ全て | ほぼ全て | Chrome 97+, Edge 97+, Firefox(flag) |

WebTransportが特に有効なのは、リアルタイムゲーム、ライブ配信、IoTデータストリーミングなど、低遅延が求められるシナリオです。

## HTTP/3(QUIC)の基礎

WebTransportを理解するには、その基盤であるHTTP/3とQUICプロトコルの知識が欠かせません。

### QUICプロトコルの特徴

QUICはGoogleが開発し、IETFで標準化されたトランスポートプロトコルです。UDPの上に構築されていますが、TCPと同等の信頼性をストリーム単位で提供します。

```
従来のスタック:
  アプリケーション
  ├── HTTP/2
  ├── TLS 1.3
  ├── TCP
  └── IP

HTTP/3スタック:
  アプリケーション
  ├── HTTP/3
  ├── QUIC (TLS 1.3内蔵)
  └── UDP / IP
```

### QUICの主要メリット

**1. Head-of-Line Blocking の解消**

TCPでは1つのパケットが失われると、後続の全パケットがブロックされます。QUICではストリームごとに独立しているため、あるストリームのパケットロスが他のストリームに影響しません。

**2. 0-RTT接続確立**

QUICはTLS 1.3を内蔵しており、初回接続で1-RTT、再接続では0-RTTで通信を開始できます。

**3. コネクションマイグレーション**

QUICのコネクションはIPアドレスではなくConnection IDで識別されるため、モバイル端末がWi-Fiから4G/5Gに切り替わっても接続が維持されます。

## ブラウザ対応状況

2026年3月時点でのWebTransport APIの対応状況です。

| ブラウザ | バージョン | 状況 |
|---------|-----------|------|
| Chrome | 97+ | 完全サポート |
| Edge | 97+ | 完全サポート |
| Firefox | 114+ | フラグで有効化（`network.webtransport.enabled`） |
| Safari | 18.2+ | 実験的サポート |
| Opera | 83+ | 完全サポート |

機能検出を行うことで、WebTransportが使えない環境ではWebSocketにフォールバックする戦略が一般的です。

```typescript
function createTransport(url: string): WebTransport | WebSocket {
  if ('WebTransport' in window) {
    return new WebTransport(url);
  }
  // WebSocketにフォールバック
  const wsUrl = url.replace('https://', 'wss://');
  return new WebSocket(wsUrl);
}
```

## 基本的な接続

WebTransport APIを使った基本的な接続処理を見ていきましょう。

### 接続の確立

```typescript
async function connectWebTransport(url: string): Promise<WebTransport> {
  const transport = new WebTransport(url);

  // 接続が確立されるのを待つ
  await transport.ready;
  console.log('WebTransport接続が確立されました');

  // 接続終了時の処理
  transport.closed
    .then(() => {
      console.log('接続が正常に終了しました');
    })
    .catch((error) => {
      console.error('接続エラー:', error);
    });

  return transport;
}

// 使用例
const transport = await connectWebTransport('https://example.com:4433/api');
```

### 接続オプション

```typescript
const transport = new WebTransport('https://example.com:4433/api', {
  // サーバー証明書のハッシュを指定（開発用途で自己署名証明書を使う場合）
  serverCertificateHashes: [
    {
      algorithm: 'sha-256',
      value: new Uint8Array([
        // SHA-256ハッシュバイト列
      ]),
    },
  ],
  // 輻輳制御アルゴリズム
  congestionControl: 'default', // 'default' | 'throughput' | 'low-latency'
});
```

### 接続の終了

```typescript
// 正常終了
transport.close({
  closeCode: 0,
  reason: 'ユーザーが切断しました',
});

// 強制終了（エラー時）
transport.close({
  closeCode: 1,
  reason: '予期せぬエラーが発生しました',
});
```

## 双方向ストリーム

双方向ストリームは、クライアントとサーバーの両方がデータを送受信できるチャネルです。WebSocketに似た使い方が可能ですが、複数のストリームを同時に開けるのが大きな違いです。

### ストリームの作成と利用

```typescript
async function useBidirectionalStream(
  transport: WebTransport
): Promise<void> {
  // 双方向ストリームを開く
  const stream = await transport.createBidirectionalStream();

  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();

  // データの送信
  const encoder = new TextEncoder();
  await writer.write(encoder.encode('Hello, サーバー！'));

  // データの受信
  const decoder = new TextDecoder();
  const { value, done } = await reader.read();
  if (!done && value) {
    console.log('受信:', decoder.decode(value));
  }

  // ストリームの終了
  await writer.close();
}
```

### 複数ストリームの並行利用

WebTransportの真価は、複数のストリームを同時に利用できる点にあります。

```typescript
interface ChatMessage {
  channel: string;
  user: string;
  text: string;
  timestamp: number;
}

class MultiChannelChat {
  private transport: WebTransport;
  private channels: Map<string, WritableStreamDefaultWriter> = new Map();

  constructor(transport: WebTransport) {
    this.transport = transport;
  }

  // チャンネルごとに独立したストリームを作成
  async joinChannel(channelName: string): Promise<void> {
    const stream = await this.transport.createBidirectionalStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // チャンネル参加メッセージを送信
    const joinMsg = JSON.stringify({ type: 'join', channel: channelName });
    await writer.write(encoder.encode(joinMsg));

    this.channels.set(channelName, writer);

    // 受信ループを開始
    this.receiveMessages(channelName, stream.readable);
  }

  async sendMessage(channelName: string, text: string): Promise<void> {
    const writer = this.channels.get(channelName);
    if (!writer) throw new Error(`チャンネル ${channelName} に未参加です`);

    const encoder = new TextEncoder();
    const msg: ChatMessage = {
      channel: channelName,
      user: 'self',
      text,
      timestamp: Date.now(),
    };
    await writer.write(encoder.encode(JSON.stringify(msg)));
  }

  private async receiveMessages(
    channelName: string,
    readable: ReadableStream<Uint8Array>
  ): Promise<void> {
    const reader = readable.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const msg: ChatMessage = JSON.parse(decoder.decode(value));
        console.log(`[${channelName}] ${msg.user}: ${msg.text}`);
      }
    } catch (error) {
      console.error(`チャンネル ${channelName} 受信エラー:`, error);
    }
  }
}
```

### サーバー側から開始する双方向ストリーム

サーバー側からストリームを開始することも可能です。

```typescript
async function handleIncomingStreams(transport: WebTransport): Promise<void> {
  const reader = transport.incomingBidirectionalStreams.getReader();

  try {
    while (true) {
      const { value: stream, done } = await reader.read();
      if (done) break;

      // 各ストリームを並行して処理
      handleServerStream(stream);
    }
  } catch (error) {
    console.error('受信ストリームエラー:', error);
  }
}

async function handleServerStream(
  stream: WebTransportBidirectionalStream
): Promise<void> {
  const reader = stream.readable.getReader();
  const writer = stream.writable.getWriter();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const { value } = await reader.read();
  if (value) {
    const data = JSON.parse(decoder.decode(value));
    console.log('サーバーからのリクエスト:', data);

    // レスポンスを返す
    await writer.write(encoder.encode(JSON.stringify({ status: 'ok' })));
  }

  await writer.close();
}
```

## 単方向ストリーム

単方向ストリームは、一方向のみのデータ送信に特化したストリームです。サーバーログのストリーミングや、クライアントからのテレメトリ送信などに適しています。

### クライアント→サーバー（送信専用）

```typescript
async function sendTelemetry(
  transport: WebTransport,
  data: Record<string, unknown>
): Promise<void> {
  // 単方向送信ストリームを作成
  const stream = await transport.createUnidirectionalStream();
  const writer = stream.getWriter();
  const encoder = new TextEncoder();

  await writer.write(encoder.encode(JSON.stringify(data)));
  await writer.close();
}

// 定期的にパフォーマンスメトリクスを送信
async function startMetricsReporter(transport: WebTransport): Promise<void> {
  setInterval(async () => {
    const metrics = {
      type: 'performance',
      timestamp: Date.now(),
      fps: getFPS(),
      memory: performance.memory?.usedJSHeapSize ?? 0,
      latency: await measureLatency(),
    };
    await sendTelemetry(transport, metrics);
  }, 5000);
}
```

### サーバー→クライアント（受信専用）

```typescript
async function receiveServerUpdates(transport: WebTransport): Promise<void> {
  const reader = transport.incomingUnidirectionalStreams.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { value: stream, done } = await reader.read();
      if (done) break;

      // 各ストリームを非同期で処理
      processUnidirectionalStream(stream, decoder);
    }
  } catch (error) {
    console.error('単方向ストリーム受信エラー:', error);
  }
}

async function processUnidirectionalStream(
  stream: ReadableStream<Uint8Array>,
  decoder: TextDecoder
): Promise<void> {
  const reader = stream.getReader();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
    }

    const data = JSON.parse(buffer);
    console.log('サーバーからの更新:', data);
  } catch (error) {
    console.error('ストリーム処理エラー:', error);
  }
}
```

## データグラム（UDP的通信）

データグラムはWebTransportの最も特徴的な機能です。順序保証も再送もないため、リアルタイムゲームの座標更新やライブ映像フレームなど、最新のデータだけが重要なシナリオに最適です。

### データグラムの送受信

```typescript
class DatagramChannel {
  private transport: WebTransport;
  private writer: WritableStreamDefaultWriter<Uint8Array>;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();

  constructor(transport: WebTransport) {
    this.transport = transport;
    this.writer = transport.datagrams.writable.getWriter();
  }

  // データグラムの送信
  async send(data: unknown): Promise<void> {
    const payload = this.encoder.encode(JSON.stringify(data));

    // データグラムのサイズ制限チェック（通常1200バイト前後）
    if (payload.byteLength > this.transport.datagrams.maxDatagramSize) {
      console.warn('データグラムサイズ超過。ストリームを使用してください');
      return;
    }

    await this.writer.write(payload);
  }

  // データグラムの受信ループ
  async startReceiving(
    callback: (data: unknown) => void
  ): Promise<void> {
    const reader = this.transport.datagrams.readable.getReader();

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        try {
          const data = JSON.parse(this.decoder.decode(value));
          callback(data);
        } catch {
          console.warn('不正なデータグラムを受信');
        }
      }
    } catch (error) {
      console.error('データグラム受信エラー:', error);
    }
  }
}

// 使用例：リアルタイム位置送信
const datagram = new DatagramChannel(transport);

// 受信開始
datagram.startReceiving((data) => {
  console.log('位置データ受信:', data);
});

// ゲームループで位置を送信
function gameLoop(): void {
  const position = { x: player.x, y: player.y, rotation: player.angle };
  datagram.send({ type: 'position', ...position });
  requestAnimationFrame(gameLoop);
}
```

### バイナリデータの効率的な送受信

JSONではなくバイナリフォーマットを使うことで、データグラムのサイズを大幅に削減できます。

```typescript
// バイナリプロトコルの定義
const MessageType = {
  POSITION: 0x01,
  INPUT: 0x02,
  STATE: 0x03,
} as const;

function encodePosition(x: number, y: number, angle: number): Uint8Array {
  const buffer = new ArrayBuffer(13); // 1 + 4 + 4 + 4 バイト
  const view = new DataView(buffer);

  view.setUint8(0, MessageType.POSITION);
  view.setFloat32(1, x, true);  // リトルエンディアン
  view.setFloat32(5, y, true);
  view.setFloat32(9, angle, true);

  return new Uint8Array(buffer);
}

function decodePosition(data: Uint8Array): { x: number; y: number; angle: number } {
  const view = new DataView(data.buffer);

  return {
    x: view.getFloat32(1, true),
    y: view.getFloat32(5, true),
    angle: view.getFloat32(9, true),
  };
}
```

## サーバー実装（Node.js/Go）

### Node.js実装

Node.jsでWebTransportサーバーを構築するには、`@aspect-build/webtransport`パッケージや`webtransport-http3`ライブラリを使用します。

```typescript
// server.ts
import { Http3Server } from '@aspect-build/webtransport';
import { readFileSync } from 'fs';

const server = new Http3Server({
  host: '0.0.0.0',
  port: 4433,
  secret: 'your-secret-key',
  cert: readFileSync('./cert.pem'),
  privKey: readFileSync('./key.pem'),
});

server.startServer();

// セッション処理
(async () => {
  const sessionStream = await server.sessionStream('/api');
  const sessionReader = sessionStream.getReader();

  while (true) {
    const { value: session, done } = await sessionReader.read();
    if (done) break;

    console.log('新しいセッション接続');
    handleSession(session);
  }
})();

async function handleSession(session: any): Promise<void> {
  // 双方向ストリームの処理
  handleBidirectionalStreams(session);

  // データグラムの処理
  handleDatagrams(session);
}

async function handleBidirectionalStreams(session: any): Promise<void> {
  const reader = session.incomingBidirectionalStreams.getReader();

  while (true) {
    const { value: stream, done } = await reader.read();
    if (done) break;

    const streamReader = stream.readable.getReader();
    const streamWriter = stream.writable.getWriter();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    // エコーサーバー：受信データをそのまま返す
    while (true) {
      const { value, done: streamDone } = await streamReader.read();
      if (streamDone) break;

      const message = decoder.decode(value);
      console.log('受信:', message);

      // レスポンスを送信
      const response = JSON.stringify({
        echo: message,
        timestamp: Date.now(),
      });
      await streamWriter.write(encoder.encode(response));
    }
  }
}

async function handleDatagrams(session: any): Promise<void> {
  const reader = session.datagrams.readable.getReader();
  const writer = session.datagrams.writable.getWriter();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    // データグラムのエコー
    await writer.write(value);
  }
}
```

### Go実装

Goでは`quic-go`ライブラリを使ったWebTransportサーバーが高パフォーマンスです。

```go
package main

import (
    "context"
    "crypto/tls"
    "fmt"
    "io"
    "log"
    "net/http"

    "github.com/quic-go/quic-go/http3"
    "github.com/quic-go/webtransport-go"
)

func main() {
    server := &webtransport.Server{
        H3: http3.Server{
            Addr: ":4433",
            TLSConfig: &tls.Config{
                Certificates: []tls.Certificate{loadCert()},
            },
        },
        CheckOrigin: func(r *http.Request) bool {
            return true // 本番では適切なオリジンチェックを行う
        },
    }

    http.HandleFunc("/api", func(w http.ResponseWriter, r *http.Request) {
        session, err := server.Upgrade(w, r)
        if err != nil {
            log.Printf("アップグレード失敗: %v", err)
            return
        }
        defer session.CloseSession()

        handleSession(session)
    })

    log.Println("WebTransportサーバー起動: https://localhost:4433")
    log.Fatal(server.ListenAndServeTLS("cert.pem", "key.pem"))
}

func handleSession(session *webtransport.Session) {
    ctx := session.Context()

    // 双方向ストリームの受信処理
    go func() {
        for {
            stream, err := session.AcceptStream(ctx)
            if err != nil {
                log.Printf("ストリーム受信エラー: %v", err)
                return
            }
            go handleStream(ctx, stream)
        }
    }()

    // データグラムの処理
    for {
        data, err := session.ReceiveDatagram(ctx)
        if err != nil {
            log.Printf("データグラム受信エラー: %v", err)
            return
        }
        // エコー
        if err := session.SendDatagram(data); err != nil {
            log.Printf("データグラム送信エラー: %v", err)
        }
    }
}

func handleStream(ctx context.Context, stream webtransport.Stream) {
    defer stream.Close()

    buf := make([]byte, 4096)
    for {
        n, err := stream.Read(buf)
        if err == io.EOF {
            break
        }
        if err != nil {
            log.Printf("読み取りエラー: %v", err)
            return
        }

        message := string(buf[:n])
        fmt.Printf("受信: %s\n", message)

        response := fmt.Sprintf(`{"echo":"%s","timestamp":%d}`, message, 0)
        if _, err := stream.Write([]byte(response)); err != nil {
            log.Printf("書き込みエラー: %v", err)
            return
        }
    }
}

func loadCert() tls.Certificate {
    cert, err := tls.LoadX509KeyPair("cert.pem", "key.pem")
    if err != nil {
        log.Fatalf("証明書読み込みエラー: %v", err)
    }
    return cert
}
```

### 開発用自己署名証明書の生成

```bash
# OpenSSLで開発用証明書を生成
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 \
  -keyout key.pem -out cert.pem -days 14 -nodes \
  -subj '/CN=localhost'

# 証明書のSHA-256ハッシュを取得（クライアントの serverCertificateHashes に使用）
openssl x509 -in cert.pem -outform der | openssl dgst -sha256 -binary | base64
```

## エラーハンドリングと再接続

本番環境では、ネットワーク断やサーバー障害に対する堅牢なエラーハンドリングが不可欠です。

### 再接続ロジック

```typescript
class ResilientWebTransport {
  private url: string;
  private transport: WebTransport | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseDelay = 1000; // 1秒

  private onConnected?: () => void;
  private onDisconnected?: () => void;
  private onMessage?: (data: unknown) => void;

  constructor(url: string) {
    this.url = url;
  }

  async connect(): Promise<void> {
    try {
      this.transport = new WebTransport(this.url);
      await this.transport.ready;

      this.reconnectAttempts = 0;
      console.log('接続成功');
      this.onConnected?.();

      // 切断監視
      this.transport.closed
        .then(() => this.handleDisconnect('正常終了'))
        .catch((err) => this.handleDisconnect(err.message));
    } catch (error) {
      console.error('接続失敗:', error);
      await this.scheduleReconnect();
    }
  }

  private async handleDisconnect(reason: string): Promise<void> {
    console.log(`切断: ${reason}`);
    this.transport = null;
    this.onDisconnected?.();
    await this.scheduleReconnect();
  }

  private async scheduleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('再接続の最大試行回数に達しました');
      return;
    }

    // 指数バックオフ + ジッター
    const delay =
      this.baseDelay * Math.pow(2, this.reconnectAttempts) +
      Math.random() * 1000;

    this.reconnectAttempts++;
    console.log(
      `${delay.toFixed(0)}ms後に再接続を試行（${this.reconnectAttempts}/${this.maxReconnectAttempts}）`
    );

    await new Promise((resolve) => setTimeout(resolve, delay));
    await this.connect();
  }

  // 接続状態の確認
  get isConnected(): boolean {
    return this.transport !== null;
  }

  // イベントハンドラの登録
  on(event: 'connected' | 'disconnected' | 'message', handler: any): void {
    switch (event) {
      case 'connected':
        this.onConnected = handler;
        break;
      case 'disconnected':
        this.onDisconnected = handler;
        break;
      case 'message':
        this.onMessage = handler;
        break;
    }
  }
}

// 使用例
const client = new ResilientWebTransport('https://example.com:4433/api');

client.on('connected', () => {
  console.log('サーバーに接続しました');
});

client.on('disconnected', () => {
  console.log('サーバーとの接続が切断されました');
});

await client.connect();
```

### 接続状態の監視

```typescript
class ConnectionMonitor {
  private transport: WebTransport;
  private pingInterval: number | null = null;

  constructor(transport: WebTransport) {
    this.transport = transport;
  }

  // RTTの取得（WebTransport Stats API）
  async getStats(): Promise<void> {
    const stats = await this.transport.getStats();
    console.log('RTT（往復遅延）:', stats.minRtt, 'ms');
    console.log('送信データグラム数:', stats.numDatagramsSent);
    console.log('受信データグラム数:', stats.numDatagramsReceived);
    console.log('紛失データグラム数:', stats.numDatagramsLost);
  }

  // 定期的なpingによる死活監視
  startPing(intervalMs: number = 5000): void {
    this.pingInterval = window.setInterval(async () => {
      try {
        const stream = await this.transport.createUnidirectionalStream();
        const writer = stream.getWriter();
        const encoder = new TextEncoder();

        await writer.write(encoder.encode(JSON.stringify({
          type: 'ping',
          timestamp: Date.now(),
        })));
        await writer.close();
      } catch {
        console.warn('ping失敗：接続が不安定です');
      }
    }, intervalMs);
  }

  stopPing(): void {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}
```

## リアルタイムゲームでの活用

WebTransportはリアルタイムゲームの通信に最適です。データグラムで位置情報を低遅延で送り、ストリームでチャットやイベントを確実に届けるハイブリッド設計が可能です。

```typescript
interface PlayerState {
  id: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  health: number;
  timestamp: number;
}

interface GameEvent {
  type: 'attack' | 'item_pickup' | 'chat' | 'player_join' | 'player_leave';
  payload: unknown;
  sequence: number;
}

class GameClient {
  private transport: WebTransport;
  private datagramWriter: WritableStreamDefaultWriter<Uint8Array>;
  private eventStream: WebTransportBidirectionalStream | null = null;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  private sequenceNumber = 0;

  constructor(transport: WebTransport) {
    this.transport = transport;
    this.datagramWriter = transport.datagrams.writable.getWriter();
  }

  async initialize(): Promise<void> {
    // イベント用の信頼性のあるストリームを作成
    this.eventStream = await this.transport.createBidirectionalStream();

    // プレイヤー位置データの受信（データグラム）
    this.receivePositionUpdates();

    // ゲームイベントの受信（ストリーム）
    this.receiveGameEvents();
  }

  // 自分の位置をデータグラムで送信（低遅延・順序不保証）
  async sendPosition(state: PlayerState): Promise<void> {
    const buffer = new ArrayBuffer(29);
    const view = new DataView(buffer);

    view.setUint8(0, 0x01); // メッセージタイプ: POSITION
    view.setFloat32(1, state.x, true);
    view.setFloat32(5, state.y, true);
    view.setFloat32(9, state.velocityX, true);
    view.setFloat32(13, state.velocityY, true);
    view.setUint16(17, state.health, true);
    view.setFloat64(19, state.timestamp, true);
    // ID: 残りバイトはセッションで識別

    await this.datagramWriter.write(new Uint8Array(buffer));
  }

  // ゲームイベントをストリームで送信（信頼性保証）
  async sendEvent(type: GameEvent['type'], payload: unknown): Promise<void> {
    if (!this.eventStream) throw new Error('未初期化');

    const writer = this.eventStream.writable.getWriter();
    const event: GameEvent = {
      type,
      payload,
      sequence: this.sequenceNumber++,
    };

    const data = this.encoder.encode(JSON.stringify(event) + '\n');
    await writer.write(data);
    writer.releaseLock();
  }

  private async receivePositionUpdates(): Promise<void> {
    const reader = this.transport.datagrams.readable.getReader();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      if (value[0] === 0x01) {
        const view = new DataView(value.buffer);
        const state: Partial<PlayerState> = {
          x: view.getFloat32(1, true),
          y: view.getFloat32(5, true),
          velocityX: view.getFloat32(9, true),
          velocityY: view.getFloat32(13, true),
          health: view.getUint16(17, true),
          timestamp: view.getFloat64(19, true),
        };

        // クライアント側予測と補間で滑らかな描画
        this.interpolatePlayerPosition(state);
      }
    }
  }

  private async receiveGameEvents(): Promise<void> {
    if (!this.eventStream) return;

    const reader = this.eventStream.readable.getReader();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += this.decoder.decode(value, { stream: true });

      // 改行区切りでイベントをパース
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.trim()) {
          const event: GameEvent = JSON.parse(line);
          this.handleGameEvent(event);
        }
      }
    }
  }

  private interpolatePlayerPosition(state: Partial<PlayerState>): void {
    // 位置補間のロジック（実装省略）
    console.log('位置更新:', state);
  }

  private handleGameEvent(event: GameEvent): void {
    console.log('ゲームイベント:', event.type, event.payload);
  }
}
```

## ライブ配信での活用

WebTransportはライブ配信にも優れた選択肢です。映像フレームのデータグラム送信により、遅延フレームを自動スキップする仕組みが実現できます。

```typescript
interface VideoFrame {
  frameId: number;
  timestamp: number;
  keyFrame: boolean;
  data: Uint8Array;
}

class LiveStreamClient {
  private transport: WebTransport;
  private encoder = new TextEncoder();

  constructor(transport: WebTransport) {
    this.transport = transport;
  }

  // 映像配信（送信側）
  async startBroadcast(mediaStream: MediaStream): Promise<void> {
    const videoTrack = mediaStream.getVideoTracks()[0];
    const processor = new MediaStreamTrackProcessor({ track: videoTrack });
    const reader = processor.readable.getReader();

    // メタデータは信頼性のあるストリームで送信
    const metaStream = await this.transport.createUnidirectionalStream();
    const metaWriter = metaStream.getWriter();

    await metaWriter.write(
      this.encoder.encode(
        JSON.stringify({
          type: 'stream_start',
          codec: 'vp9',
          width: videoTrack.getSettings().width,
          height: videoTrack.getSettings().height,
        })
      )
    );

    const datagramWriter = this.transport.datagrams.writable.getWriter();
    let frameId = 0;

    while (true) {
      const { value: frame, done } = await reader.read();
      if (done) break;

      // キーフレームはストリーム（信頼性あり）で送信
      // 差分フレームはデータグラム（低遅延）で送信
      if (frameId % 30 === 0) {
        // 約1秒ごとにキーフレーム
        await this.sendKeyFrame(frameId, frame);
      } else {
        await this.sendDeltaFrame(datagramWriter, frameId, frame);
      }

      frame.close();
      frameId++;
    }
  }

  private async sendKeyFrame(frameId: number, frame: VideoFrame): Promise<void> {
    const stream = await this.transport.createUnidirectionalStream();
    const writer = stream.getWriter();

    const header = new ArrayBuffer(9);
    const view = new DataView(header);
    view.setUint8(0, 0x10); // キーフレームマーカー
    view.setUint32(1, frameId, true);
    view.setFloat32(5, performance.now(), true);

    await writer.write(new Uint8Array(header));
    // フレームデータを書き込み（実際にはエンコード済みデータ）
    await writer.close();
  }

  private async sendDeltaFrame(
    writer: WritableStreamDefaultWriter<Uint8Array>,
    frameId: number,
    frame: VideoFrame
  ): Promise<void> {
    const header = new ArrayBuffer(9);
    const view = new DataView(header);
    view.setUint8(0, 0x20); // 差分フレームマーカー
    view.setUint32(1, frameId, true);
    view.setFloat32(5, performance.now(), true);

    await writer.write(new Uint8Array(header));
  }

  // 映像受信（視聴側）
  async startViewing(
    onFrame: (frameData: Uint8Array, isKeyFrame: boolean) => void
  ): Promise<void> {
    // キーフレーム受信（ストリーム経由）
    this.receiveKeyFrames(onFrame);

    // 差分フレーム受信（データグラム経由）
    this.receiveDeltaFrames(onFrame);
  }

  private async receiveKeyFrames(
    onFrame: (data: Uint8Array, isKeyFrame: boolean) => void
  ): Promise<void> {
    const reader = this.transport.incomingUnidirectionalStreams.getReader();

    while (true) {
      const { value: stream, done } = await reader.read();
      if (done) break;

      const streamReader = stream.getReader();
      const chunks: Uint8Array[] = [];

      while (true) {
        const { value, done: streamDone } = await streamReader.read();
        if (streamDone) break;
        chunks.push(value);
      }

      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }

      onFrame(combined, true);
    }
  }

  private async receiveDeltaFrames(
    onFrame: (data: Uint8Array, isKeyFrame: boolean) => void
  ): Promise<void> {
    const reader = this.transport.datagrams.readable.getReader();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      if (value[0] === 0x20) {
        onFrame(value, false);
      }
    }
  }
}
```

## WebSocket→WebTransport移行ガイド

既存のWebSocketベースのアプリケーションをWebTransportに移行する際の戦略を解説します。

### 段階的な移行アプローチ

```typescript
// 抽象化レイヤーを作成して、両方のプロトコルに対応
interface TransportAdapter {
  connect(): Promise<void>;
  send(data: string | Uint8Array): Promise<void>;
  onMessage(callback: (data: string | Uint8Array) => void): void;
  close(): void;
  readonly isConnected: boolean;
}

// WebSocket用アダプター
class WebSocketAdapter implements TransportAdapter {
  private ws: WebSocket | null = null;
  private messageCallback?: (data: string | Uint8Array) => void;
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (e) => this.messageCallback?.(e.data);
    });
  }

  async send(data: string | Uint8Array): Promise<void> {
    this.ws?.send(data);
  }

  onMessage(callback: (data: string | Uint8Array) => void): void {
    this.messageCallback = callback;
  }

  close(): void {
    this.ws?.close();
  }
}

// WebTransport用アダプター
class WebTransportAdapter implements TransportAdapter {
  private transport: WebTransport | null = null;
  private stream: WebTransportBidirectionalStream | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private messageCallback?: (data: string | Uint8Array) => void;
  private url: string;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();

  constructor(url: string) {
    this.url = url;
  }

  get isConnected(): boolean {
    return this.transport !== null && this.stream !== null;
  }

  async connect(): Promise<void> {
    this.transport = new WebTransport(this.url);
    await this.transport.ready;

    this.stream = await this.transport.createBidirectionalStream();
    this.writer = this.stream.writable.getWriter();

    // 受信ループ
    this.startReceiving();
  }

  async send(data: string | Uint8Array): Promise<void> {
    if (!this.writer) throw new Error('未接続');

    const payload = typeof data === 'string'
      ? this.encoder.encode(data)
      : data;
    await this.writer.write(payload);
  }

  onMessage(callback: (data: string | Uint8Array) => void): void {
    this.messageCallback = callback;
  }

  close(): void {
    this.transport?.close();
  }

  private async startReceiving(): Promise<void> {
    if (!this.stream) return;
    const reader = this.stream.readable.getReader();

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        this.messageCallback?.(this.decoder.decode(value));
      }
    } catch (error) {
      console.error('受信エラー:', error);
    }
  }
}

// ファクトリー関数で自動選択
function createAdapter(wsUrl: string, wtUrl: string): TransportAdapter {
  if ('WebTransport' in window) {
    console.log('WebTransportを使用します');
    return new WebTransportAdapter(wtUrl);
  }
  console.log('WebSocketにフォールバックします');
  return new WebSocketAdapter(wsUrl);
}

// 使用例
const adapter = createAdapter(
  'wss://example.com/ws',
  'https://example.com:4433/wt'
);

adapter.onMessage((data) => {
  console.log('受信:', data);
});

await adapter.connect();
await adapter.send('Hello!');
```

### 移行時のチェックリスト

WebSocketからWebTransportへ移行する際に確認すべきポイントをまとめます。

**サーバー側**
- HTTP/3対応のサーバー環境を構築する（Go `quic-go`、Rust `quinn` など）
- TLS 1.3証明書を用意する（Let's Encrypt等）
- WebSocketのエンドポイントは残し、両プロトコルを並行運用する
- ロードバランサーがUDP（QUIC）を通すか確認する

**クライアント側**
- 機能検出で対応ブラウザを判定し、非対応時はWebSocketへフォールバックする
- データグラムのサイズ制限（約1200バイト）に注意する
- ストリームの明示的なクローズ処理を実装する
- 再接続ロジックを指数バックオフで実装する

**テスト**
- 帯域制限下でのパフォーマンスを計測する
- パケットロスシミュレーション（tc / netem）でデータグラムの挙動を確認する
- コネクションマイグレーション（IP切替）のテストを行う

## まとめ

WebTransport APIは、HTTP/3（QUIC）を基盤とした次世代のリアルタイム通信プロトコルです。

**WebTransportの3つの通信チャネル**

- **双方向ストリーム**: WebSocketに似た使い方。順序保証・信頼性あり。複数同時利用可能
- **単方向ストリーム**: 片方向のみのデータ送信に最適化
- **データグラム**: UDP的な低遅延通信。順序保証・再送なし。ゲームや映像に最適

**WebTransportを選ぶべきケース**

- リアルタイムゲーム（位置データの低遅延送信）
- ライブ配信（遅延フレームの自動スキップ）
- IoTデバイスからの大量センサーデータ
- 複数チャンネルの同時通信が必要な場合
- モバイル環境でのコネクションマイグレーション

**WebSocketを使い続けるべきケース**

- ブラウザ互換性が最優先の場合
- 全データの順序保証が必要な場合
- 既存のWebSocketインフラが十分に機能している場合

2026年時点ではChrome/Edge/Operaで安定サポートされ、Firefox/Safariも対応を進めています。既存システムへの導入は抽象化レイヤーを挟む段階的アプローチが推奨されます。WebTransportの低遅延・多重化の恩恵を受けられるユースケースでは、積極的に導入を検討する価値があります。

---
title: 'WebSocketリアルタイム通信完全ガイド — Socket.io・チャット・通知・スケール設計'
description: 'WebSocketによるリアルタイムアプリ開発の完全ガイド。Socket.io・Room/Namespace・認証・再接続処理・チャット実装・リアルタイム通知・Redis Pub/Sub・水平スケールまで実装例付きで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-2.jpg'
tags: ['WebSocket', 'Socket.io', 'Node.js', 'リアルタイム', 'TypeScript']
---

リアルタイム通信は現代のWebアプリケーションに不可欠な要素だ。チャット、通知、ライブダッシュボード、オンラインゲーム、コラボレーションツール — これらはすべて、サーバーとクライアントが双方向に即座にデータをやり取りする仕組みを必要とする。本記事では、WebSocketの基礎からSocket.ioを使った実装、本番環境での水平スケール設計まで、実務で通用する知識を体系的に解説する。

---

## 1. WebSocketとは — HTTP Polling・SSEとの比較

### 従来のHTTP通信の限界

HTTP/1.1はリクエスト・レスポンス型のプロトコルだ。クライアントがリクエストを送り、サーバーがレスポンスを返すと接続は閉じられる。「サーバーが自発的にクライアントへデータを送る」ことは設計上できない。

この制限を回避するために、様々な手法が考案されてきた。

**Short Polling（定期ポーリング）**

クライアントが一定間隔でサーバーにリクエストを送り続ける最もシンプルな方法。実装は簡単だが、新しいデータがない場合でも無駄なHTTPリクエストが発生し、サーバー・ネットワーク双方に大きな負荷がかかる。遅延も間隔分（例: 1秒ポーリングなら最大1秒遅延）が生じる。

```javascript
// Short Polling — シンプルだが非効率
setInterval(async () => {
  const response = await fetch('/api/messages');
  const data = await response.json();
  updateUI(data);
}, 1000); // 1秒ごとにリクエスト
```

**Long Polling（ロングポーリング）**

クライアントがリクエストを送り、サーバーは新しいデータが発生するまでレスポンスを保留する手法。データが届いたらレスポンスを返し、クライアントは即座に次のリクエストを送る。Short Pollingよりレイテンシは低いが、同時接続数が増えるとサーバーのスレッド消費が問題になる。

**Server-Sent Events（SSE）**

HTTP/1.1上でサーバーからクライアントへの一方向ストリームを実現する技術。チケット1枚でサーバー側からデータを継続的に送り続けられる。ブラウザが自動で再接続し、実装もシンプルだ。

```javascript
// SSE — サーバーからの一方向プッシュ
const eventSource = new EventSource('/api/events');
eventSource.onmessage = (event) => {
  console.log(JSON.parse(event.data));
};
```

ただしSSEはサーバーからクライアントへの**一方向通信**のみ。クライアントからデータを送るには別途HTTPリクエストが必要になる。

### WebSocket — 双方向全二重通信

WebSocketはHTTPアップグレードハンドシェイクで接続を確立した後、TCPコネクション上で双方向通信を行うプロトコルだ。一度接続が確立されれば、サーバーもクライアントも任意のタイミングでデータを送れる。

```
Client                    Server
  |                          |
  |-- HTTP Upgrade Request -->|
  |<-- 101 Switching Proto --|
  |                          |
  |<====== WebSocket =======>|  ← 双方向・低レイテンシ
  |                          |
```

各手法の比較をまとめると以下の通りだ。

| 手法 | 方向 | レイテンシ | オーバーヘッド | ユースケース |
|------|------|-----------|--------------|------------|
| Short Polling | 単方向 | 高 | 高 | シンプルな状態確認 |
| Long Polling | 単方向 | 中 | 中 | 軽量なプッシュ通知 |
| SSE | サーバー→クライアント | 低 | 低 | ライブフィード・通知 |
| WebSocket | 双方向 | 最低 | 最低 | チャット・ゲーム・コラボ |

---

## 2. ブラウザネイティブWebSocket API

Socket.ioに進む前に、ブラウザ標準のWebSocket APIを理解しておく必要がある。Socket.ioはその上に構築されたライブラリであり、基礎を知ることでトラブルシュートが格段に楽になる。

```typescript
// クライアント側 — ブラウザネイティブWebSocket
const ws = new WebSocket('wss://api.example.com/ws');

// 接続確立時
ws.onopen = (event) => {
  console.log('WebSocket接続確立');
  ws.send(JSON.stringify({ type: 'PING', payload: {} }));
};

// メッセージ受信時
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('受信:', data);
};

// エラー発生時
ws.onerror = (error) => {
  console.error('WebSocketエラー:', error);
};

// 接続切断時
ws.onclose = (event) => {
  console.log(`接続切断 — code: ${event.code}, reason: ${event.reason}`);
};

// メッセージ送信
ws.send(JSON.stringify({
  type: 'CHAT_MESSAGE',
  payload: { roomId: 'general', text: 'Hello!' }
}));

// 接続を閉じる
ws.close(1000, 'Normal closure');
```

サーバー側（Node.js標準の`ws`ライブラリ使用）:

```typescript
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

const server = http.createServer();
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`新規接続: ${clientIp}`);

  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('受信:', message);

    // 全クライアントへブロードキャスト
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'BROADCAST', payload: message }));
      }
    });
  });

  ws.on('close', () => {
    console.log(`切断: ${clientIp}`);
  });

  // Ping/Pongでコネクション維持
  const heartbeat = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, 30000);

  ws.on('close', () => clearInterval(heartbeat));
});

server.listen(3000);
```

ネイティブAPIは低レベルで柔軟だが、Room管理・再接続・フォールバックなどを自前で実装する必要がある。本番アプリではSocket.ioが現実的な選択肢となる。

---

## 3. Socket.io セットアップ（Node.js + TypeScript）

Socket.ioはWebSocket上の抽象レイヤーとして、自動再接続・Room/Namespace・イベントベースAPI・フォールバック（Polling）など実務に必要な機能を提供する。

### インストール

```bash
# サーバー側
npm install socket.io
npm install -D @types/node typescript ts-node

# クライアント側
npm install socket.io-client
```

### サーバー実装

```typescript
// server/index.ts
import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // トランスポート設定 — WebSocketを優先し、Pollingにフォールバック
  transports: ['websocket', 'polling'],
  // Ping間隔とタイムアウト
  pingInterval: 10000,
  pingTimeout: 5000,
});

// 接続イベント
io.on('connection', (socket: Socket) => {
  console.log(`接続: ${socket.id} | IP: ${socket.handshake.address}`);

  socket.on('disconnect', (reason) => {
    console.log(`切断: ${socket.id} | 理由: ${reason}`);
  });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Socket.io サーバー起動: http://localhost:${PORT}`);
});
```

### クライアント実装

```typescript
// client/socket.ts
import { io, Socket } from 'socket.io-client';

// サーバー側イベントの型定義
interface ServerToClientEvents {
  'chat:message': (message: ChatMessage) => void;
  'user:joined': (user: User) => void;
  'user:left': (userId: string) => void;
  'notification': (notification: Notification) => void;
}

// クライアント側イベントの型定義
interface ClientToServerEvents {
  'chat:send': (data: SendMessageData, callback: AckCallback) => void;
  'room:join': (roomId: string) => void;
  'room:leave': (roomId: string) => void;
}

type AckCallback = (response: { success: boolean; error?: string }) => void;

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000',
  {
    withCredentials: true,
    autoConnect: false, // 手動で接続タイミングを制御
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  }
);

export default socket;
```

TypeScriptの型定義を活用することで、イベント名のタイポや引数の型ミスをコンパイル時に検出できる。

---

## 4. イベント設計（emit・on・broadcast）

Socket.ioはイベント駆動モデルを採用している。設計の良し悪しがコードの保守性に直結する。

### イベント命名規則

イベント名は `namespace:action` の形式を推奨する。名前空間の分離により、機能ごとのグルーピングが明確になる。

```typescript
// 推奨: コロン区切りの名前空間
'chat:message'      // チャットメッセージ
'chat:read'         // 既読
'room:join'         // ルーム入室
'room:leave'        // ルーム退出
'notification:new'  // 新規通知
'user:status'       // ユーザー状態変更

// 非推奨: フラットな命名
'message'
'joinRoom'
```

### emit・on・broadcast のパターン

```typescript
// server/handlers/chat.handler.ts
import { Server, Socket } from 'socket.io';

interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  text: string;
  timestamp: number;
}

export function registerChatHandlers(io: Server, socket: Socket): void {
  // 1. 送信者のみへ返す（acknowledgement）
  socket.on('chat:send', async (data, callback) => {
    try {
      const message: ChatMessage = {
        id: generateId(),
        roomId: data.roomId,
        userId: socket.data.userId,
        text: data.text,
        timestamp: Date.now(),
      };

      // DBに保存
      await saveMessage(message);

      // 送信者へ確認を返す（Acknowledgement）
      callback({ success: true, messageId: message.id });

      // 同じRoomの全員へブロードキャスト（送信者含む）
      io.to(data.roomId).emit('chat:message', message);

    } catch (error) {
      callback({ success: false, error: 'メッセージ送信に失敗しました' });
    }
  });

  // 2. 送信者以外の同ルームへブロードキャスト
  socket.on('user:typing', (data: { roomId: string }) => {
    socket.to(data.roomId).emit('user:typing', {
      userId: socket.data.userId,
      roomId: data.roomId,
    });
  });

  // 3. 特定ユーザーへ直接送信
  socket.on('user:direct-message', (data: { targetId: string; message: string }) => {
    // ユーザーIDとソケットIDのマッピングが必要
    const targetSocketId = getUserSocketId(data.targetId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('chat:direct', {
        fromUserId: socket.data.userId,
        message: data.message,
      });
    }
  });
}

// メインの接続ハンドラに登録
io.on('connection', (socket) => {
  registerChatHandlers(io, socket);
  registerNotificationHandlers(io, socket);
});
```

### Acknowledgement（確認応答）パターン

UDP的な「送りっぱなし」ではなく、確実な送達を確認したい場合にAcknowledgementを使う。

```typescript
// クライアント側
socket.emit('chat:send', { roomId: 'general', text: 'Hello' }, (response) => {
  if (response.success) {
    console.log('送信成功:', response.messageId);
    markAsSent(response.messageId);
  } else {
    console.error('送信失敗:', response.error);
    showRetryOption();
  }
});

// タイムアウト付きAcknowledgement（Socket.io v4.6+）
socket.timeout(5000).emit('chat:send', data, (err, response) => {
  if (err) {
    console.error('タイムアウト — サーバーからの応答なし');
  }
});
```

---

## 5. Namespace・Room（チャンネル分離）

### Namespace — 論理的な接続の分離

Namespaceはアプリケーション全体を論理的に分割する仕組みだ。管理者機能とユーザー機能を完全に分離したい場合などに有効。

```typescript
// サーバー側
// デフォルトNamespace: /
const defaultNs = io; // io.of('/')

// 管理者用Namespace
const adminNs = io.of('/admin');
adminNs.use(adminAuthMiddleware); // Namespace固有のミドルウェア

adminNs.on('connection', (socket) => {
  console.log('管理者接続:', socket.id);

  socket.on('broadcast:all', (message) => {
    // /admin Namespace内の全員に送信
    adminNs.emit('admin:announcement', message);
  });
});

// 通知専用Namespace
const notificationNs = io.of('/notifications');

notificationNs.on('connection', (socket) => {
  const userId = socket.data.userId;

  // ユーザー固有の通知Roomに自動参加
  socket.join(`user:${userId}:notifications`);
});

// クライアント側
const adminSocket = io('http://localhost:4000/admin', { auth: { token } });
const notifSocket = io('http://localhost:4000/notifications', { auth: { token } });
```

### Room — 動的なグループ管理

Roomは同じNamespace内でソケットをグループ化する機能だ。チャットルーム、ゲームセッション、ドキュメント編集セッションなど動的なグループ管理に最適。

```typescript
// server/handlers/room.handler.ts
export function registerRoomHandlers(io: Server, socket: Socket): void {

  // ルームへの参加
  socket.on('room:join', async (roomId: string) => {
    // 権限チェック
    const canJoin = await checkRoomPermission(socket.data.userId, roomId);
    if (!canJoin) {
      socket.emit('error', { message: '参加権限がありません' });
      return;
    }

    socket.join(roomId);

    // ルームの現在の参加者一覧を取得
    const socketsInRoom = await io.in(roomId).allSockets();
    const memberCount = socketsInRoom.size;

    // 参加者全員に通知
    io.to(roomId).emit('room:member-update', {
      type: 'joined',
      userId: socket.data.userId,
      memberCount,
    });

    // 参加者本人にルーム情報を送る
    const roomHistory = await getRoomHistory(roomId, 50);
    socket.emit('room:history', { roomId, messages: roomHistory });
  });

  // ルームからの退出
  socket.on('room:leave', (roomId: string) => {
    socket.leave(roomId);

    io.to(roomId).emit('room:member-update', {
      type: 'left',
      userId: socket.data.userId,
    });
  });

  // 切断時の自動退出処理
  socket.on('disconnecting', () => {
    // socket.rooms には参加中の全Roomが含まれる
    for (const roomId of socket.rooms) {
      if (roomId !== socket.id) { // socket.idは自動で追加されるデフォルトRoom
        io.to(roomId).emit('room:member-update', {
          type: 'left',
          userId: socket.data.userId,
          reason: 'disconnect',
        });
      }
    }
  });
}
```

---

## 6. 認証（JWT・Handshake middleware）

WebSocket接続はHTTPリクエストとは別のコネクションであるため、Cookieベースの認証がそのまま使えない場合がある。JWTをHandshake時に渡すパターンが広く採用されている。

```typescript
// server/middleware/auth.middleware.ts
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
}

export function setupAuthMiddleware(io: Server): void {
  io.use(async (socket, next) => {
    try {
      // Handshakeヘッダーからトークンを取得
      const token =
        socket.handshake.auth.token ||           // auth オブジェクト
        socket.handshake.headers.authorization?.replace('Bearer ', '') || // Authヘッダー
        socket.handshake.query.token as string;  // クエリパラメータ（非推奨）

      if (!token) {
        return next(new Error('認証トークンが必要です'));
      }

      // JWTを検証
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

      // ユーザー情報をsocket.dataに保存（以降のハンドラで利用可能）
      socket.data.userId = payload.userId;
      socket.data.email = payload.email;
      socket.data.role = payload.role;

      // DBからユーザー存在確認（オプション）
      const user = await getUserById(payload.userId);
      if (!user || !user.isActive) {
        return next(new Error('アカウントが無効です'));
      }

      next();

    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        next(new Error('トークンの有効期限切れです'));
      } else if (error instanceof jwt.JsonWebTokenError) {
        next(new Error('無効なトークンです'));
      } else {
        next(new Error('認証エラー'));
      }
    }
  });
}
```

クライアント側でのトークン送信:

```typescript
// client/socket.ts — 認証対応版
import { io } from 'socket.io-client';

function createAuthenticatedSocket(accessToken: string) {
  return io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
    auth: {
      token: accessToken, // Handshake時に送信
    },
    withCredentials: true,
  });
}

// トークンリフレッシュ後に更新
function updateSocketToken(socket: Socket, newToken: string) {
  socket.auth = { token: newToken };
  socket.disconnect().connect(); // 再接続で新トークンを使用
}
```

---

## 7. 再接続・エラーハンドリング（Exponential Backoff）

ネットワーク不安定や一時的なサーバー障害は必ず起こる。適切な再接続戦略がユーザー体験を左右する。

```typescript
// client/socket-manager.ts
import { io, Socket } from 'socket.io-client';

class SocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseDelay = 1000; // 1秒
  private maxDelay = 30000; // 30秒

  connect(token: string): Socket {
    this.socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.baseDelay,
      reconnectionDelayMax: this.maxDelay,
      randomizationFactor: 0.5, // ±50%のジッタを追加（再接続の集中防止）
    });

    this.setupEventListeners();
    return this.socket;
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket接続確立');
      this.reconnectAttempts = 0;
      this.onConnected();
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`切断: ${reason}`);

      // サーバー側からの切断はクライアントが再接続を試みる
      if (reason === 'io server disconnect') {
        // 意図的な切断（認証失効など） — 手動再接続
        this.handleServerDisconnect();
      }
      // 'io client disconnect' はクライアント側の意図的切断 — 再接続しない
    });

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      console.error(`接続エラー (試行 ${this.reconnectAttempts}):`, error.message);

      // 認証エラーの場合はトークンリフレッシュを試みる
      if (error.message.includes('トークン') || error.message.includes('認証')) {
        this.handleAuthError();
      }
    });

    this.socket.io.on('reconnect', (attempt) => {
      console.log(`再接続成功 (${attempt}回目)`);
      this.onReconnected();
    });

    this.socket.io.on('reconnect_attempt', (attempt) => {
      const delay = this.calculateBackoff(attempt);
      console.log(`再接続試行 ${attempt}回目 — ${delay}ms後`);
    });

    this.socket.io.on('reconnect_failed', () => {
      console.error('再接続上限に達しました');
      this.onReconnectFailed();
    });
  }

  // Exponential Backoffの計算
  private calculateBackoff(attempt: number): number {
    const exponential = this.baseDelay * Math.pow(2, attempt - 1);
    const jitter = exponential * 0.5 * Math.random();
    return Math.min(exponential + jitter, this.maxDelay);
  }

  private async handleAuthError(): Promise<void> {
    try {
      const newToken = await refreshAccessToken();
      if (this.socket) {
        this.socket.auth = { token: newToken };
        this.socket.connect();
      }
    } catch {
      // リフレッシュ失敗 — ログインページへリダイレクト
      redirectToLogin();
    }
  }

  private onConnected(): void {
    // 接続後の初期化処理（ルーム再参加等）
    restoreRooms(this.socket!);
  }

  private onReconnected(): void {
    // 再接続後のデータ同期
    syncMissedMessages(this.socket!);
  }

  private onReconnectFailed(): void {
    showOfflineBanner();
  }
}

export const socketManager = new SocketManager();
```

---

## 8. チャットアプリ実装（メッセージ送受信・既読管理）

実際のチャットアプリのコアロジックを実装する。

```typescript
// server/handlers/chat.handler.ts
import { Server, Socket } from 'socket.io';
import { prisma } from '../lib/prisma';

export function registerChatHandlers(io: Server, socket: Socket): void {
  const userId = socket.data.userId;

  // メッセージ送信
  socket.on('chat:send', async (data: SendMessageData, callback: AckCallback) => {
    const { roomId, text, replyToId } = data;

    // 入力バリデーション
    if (!text?.trim() || text.length > 2000) {
      return callback({ success: false, error: '無効なメッセージです' });
    }

    try {
      // メッセージをDBに保存
      const message = await prisma.message.create({
        data: {
          roomId,
          senderId: userId,
          text: text.trim(),
          replyToId: replyToId || null,
        },
        include: {
          sender: { select: { id: true, name: true, avatarUrl: true } },
          replyTo: { select: { id: true, text: true, senderId: true } },
        },
      });

      callback({ success: true, messageId: message.id });

      // ルーム全員へ送信
      io.to(roomId).emit('chat:message', {
        id: message.id,
        roomId,
        sender: message.sender,
        text: message.text,
        replyTo: message.replyTo,
        timestamp: message.createdAt.getTime(),
        readBy: [userId], // 送信者は既読
      });

      // オフラインユーザーへのプッシュ通知（非同期）
      sendPushNotificationsToOfflineUsers(roomId, message, userId).catch(console.error);

    } catch (error) {
      console.error('メッセージ保存エラー:', error);
      callback({ success: false, error: 'サーバーエラーが発生しました' });
    }
  });

  // 既読管理
  socket.on('chat:read', async (data: { roomId: string; lastReadMessageId: string }) => {
    const { roomId, lastReadMessageId } = data;

    try {
      // 既読状態をDBに更新
      await prisma.roomMember.update({
        where: { userId_roomId: { userId, roomId } },
        data: { lastReadMessageId, lastReadAt: new Date() },
      });

      // 同じルームの他メンバーへ既読通知
      socket.to(roomId).emit('chat:read-receipt', {
        userId,
        roomId,
        lastReadMessageId,
        timestamp: Date.now(),
      });

    } catch (error) {
      console.error('既読更新エラー:', error);
    }
  });

  // タイピングインジケーター
  let typingTimer: NodeJS.Timeout | null = null;

  socket.on('chat:typing-start', (data: { roomId: string }) => {
    socket.to(data.roomId).emit('chat:user-typing', { userId, roomId: data.roomId });

    // 3秒後に自動停止
    if (typingTimer) clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      socket.to(data.roomId).emit('chat:user-stopped-typing', { userId });
    }, 3000);
  });

  socket.on('chat:typing-stop', (data: { roomId: string }) => {
    if (typingTimer) clearTimeout(typingTimer);
    socket.to(data.roomId).emit('chat:user-stopped-typing', { userId });
  });
}
```

---

## 9. リアルタイム通知（在庫・価格変動・進捗通知）

ECサイトやダッシュボードで活用されるリアルタイム通知の実装パターン。

```typescript
// server/services/notification.service.ts
import { Server } from 'socket.io';

export class NotificationService {
  constructor(private io: Server) {}

  // 在庫変動通知
  async notifyStockChange(productId: string, newStock: number): Promise<void> {
    const notification = {
      type: 'STOCK_UPDATE',
      productId,
      stock: newStock,
      isLowStock: newStock < 10,
      timestamp: Date.now(),
    };

    // 商品をウォッチしているユーザーへ通知
    const watchers = await getProductWatchers(productId);
    for (const userId of watchers) {
      this.io.to(`user:${userId}`).emit('notification', notification);
    }

    // 在庫0の場合はカートに入れているユーザーへも通知
    if (newStock === 0) {
      const cartUsers = await getUsersWithProductInCart(productId);
      for (const userId of cartUsers) {
        this.io.to(`user:${userId}`).emit('notification', {
          ...notification,
          type: 'STOCK_SOLD_OUT',
          message: 'カートの商品が在庫切れになりました',
        });
      }
    }

    // 管理者ダッシュボードへのブロードキャスト
    this.io.of('/admin').emit('admin:stock-alert', notification);
  }

  // 価格変動通知
  async notifyPriceChange(productId: string, oldPrice: number, newPrice: number): Promise<void> {
    const changePercent = ((newPrice - oldPrice) / oldPrice) * 100;
    const isPriceDrop = newPrice < oldPrice;

    if (isPriceDrop) {
      const watchers = await getProductWatchers(productId);
      for (const userId of watchers) {
        this.io.to(`user:${userId}`).emit('notification', {
          type: 'PRICE_DROP',
          productId,
          oldPrice,
          newPrice,
          changePercent: Math.abs(changePercent).toFixed(1),
          timestamp: Date.now(),
        });
      }
    }
  }

  // 非同期処理の進捗通知（ファイルアップロード・バッチ処理等）
  async sendProgressUpdate(
    userId: string,
    jobId: string,
    progress: number,
    status: 'processing' | 'completed' | 'failed'
  ): Promise<void> {
    this.io.to(`user:${userId}`).emit('job:progress', {
      jobId,
      progress,
      status,
      timestamp: Date.now(),
    });
  }
}

// 外部サービス（Webhookなど）からの通知送信
export function setupWebhookNotifications(app: Express, notifService: NotificationService) {
  app.post('/internal/notify/stock', async (req, res) => {
    const { productId, stock } = req.body;
    await notifService.notifyStockChange(productId, stock);
    res.json({ success: true });
  });
}
```

---

## 10. Redis Adapter（複数サーバー間ブロードキャスト）

単一サーバーではすべてのSocket接続がメモリ上で管理される。サーバーを複数台に増やすと、Server Aに接続しているユーザーへServer Bからブロードキャストできなくなる問題が生じる。Redis AdapterはPub/Subを介してこれを解決する。

```bash
npm install @socket.io/redis-adapter ioredis
```

```typescript
// server/adapters/redis.adapter.ts
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

export async function setupRedisAdapter(io: Server): Promise<void> {
  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

  // Pub/Sub用に2つの接続が必要
  const pubClient = createClient({ url: REDIS_URL });
  const subClient = pubClient.duplicate();

  await Promise.all([
    pubClient.connect(),
    subClient.connect(),
  ]);

  io.adapter(createAdapter(pubClient, subClient));

  console.log('Redis Adapter設定完了');

  // グレースフルシャットダウン
  process.on('SIGTERM', async () => {
    await pubClient.disconnect();
    await subClient.disconnect();
  });
}
```

Redis Adapterを使用すると、`io.to(roomId).emit()` の呼び出しが自動的にRedisを経由して全サーバーに伝播する。アプリケーションコードの変更は不要だ。

---

## 11. 水平スケール設計（Sticky Session・Redis Pub/Sub）

### Sticky Session（セッションアフィニティ）

WebSocketのハンドシェイクにはHTTP Pollingが使われることがある（特に初回接続時）。Pollingトランスポートを使う場合、同一クライアントのリクエストは必ず同じサーバーに届く必要がある。これをSticky Session（セッションアフィニティ）という。

```nginx
# nginx.conf — Sticky Session設定
upstream socketio_backend {
    ip_hash;  # クライアントIPでサーバーを固定
    server app1:4000;
    server app2:4000;
    server app3:4000;
}

server {
    listen 80;
    server_name api.example.com;

    location /socket.io/ {
        proxy_pass http://socketio_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocketタイムアウト設定
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

**重要**: WebSocketトランスポート（`transports: ['websocket']`）のみを使用する場合、Sticky Sessionは不要だ。Pollingへのフォールバックを無効にすることでインフラが簡素化できる。

### Redis Pub/Sub によるスケールアーキテクチャ

```
Client A ──── Server 1 ──────┐
Client B ──── Server 1       │         Redis
Client C ──── Server 2 ──────┤────── Pub/Sub ────── 全サーバーへ伝播
Client D ──── Server 2       │
Client E ──── Server 3 ──────┘
```

Server 1 が `io.to('room-123').emit(event)` を呼ぶと:
1. Redis Pub に `room-123` 向けメッセージを発行
2. 全サーバーの Redis Sub がそれを受信
3. 各サーバーが `room-123` に参加しているローカルソケットへ配信

```typescript
// 水平スケール対応のルーム参加者数取得
async function getRoomMemberCount(io: Server, roomId: string): Promise<number> {
  // fetchSockets() はRedis Adapter経由で全サーバーのソケットを取得
  const sockets = await io.in(roomId).fetchSockets();
  return sockets.length;
}

// 特定ユーザーへのサーバー横断送信
async function sendToUser(io: Server, userId: string, event: string, data: unknown): Promise<void> {
  // serverSideEmit でサーバー間通信も可能
  io.to(`user:${userId}`).emit(event, data);
}
```

---

## 12. React側実装（カスタムフック・状態管理）

```typescript
// hooks/useSocket.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/auth.store';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const { accessToken } = useAuthStore();

  useEffect(() => {
    if (!accessToken) return;

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    socketRef.current = socket;
    setStatus('connecting');

    socket.on('connect', () => setStatus('connected'));
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('connect_error', () => setStatus('error'));

    return () => {
      socket.disconnect();
    };
  }, [accessToken]);

  const emit = useCallback(<T>(event: string, data: T) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { socket: socketRef.current, status, emit };
}

// hooks/useChat.ts — チャット機能専用フック
import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  readBy: string[];
}

export function useChat(roomId: string) {
  const { socket, status } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!socket || status !== 'connected') return;

    // ルームに参加
    socket.emit('room:join', roomId);

    // 過去メッセージ受信
    socket.on('room:history', ({ messages }) => {
      setMessages(messages);
      setIsLoading(false);
    });

    // リアルタイムメッセージ受信
    socket.on('chat:message', (message: Message) => {
      setMessages((prev) => [...prev, message]);

      // 受信と同時に既読送信
      socket.emit('chat:read', {
        roomId,
        lastReadMessageId: message.id,
      });
    });

    // タイピングインジケーター
    socket.on('chat:user-typing', ({ userId }) => {
      setTypingUsers((prev) => new Set([...prev, userId]));
    });

    socket.on('chat:user-stopped-typing', ({ userId }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    return () => {
      socket.emit('room:leave', roomId);
      socket.off('room:history');
      socket.off('chat:message');
      socket.off('chat:user-typing');
      socket.off('chat:user-stopped-typing');
    };
  }, [socket, status, roomId]);

  const sendMessage = useCallback(async (text: string): Promise<boolean> => {
    if (!socket) return false;

    return new Promise((resolve) => {
      socket.timeout(5000).emit(
        'chat:send',
        { roomId, text },
        (err, response) => {
          if (err || !response?.success) {
            resolve(false);
          } else {
            resolve(true);
          }
        }
      );
    });
  }, [socket, roomId]);

  return { messages, typingUsers, isLoading, sendMessage };
}

// hooks/useNotifications.ts — 通知専用フック
export function useNotifications() {
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!socket) return;

    socket.on('notification', (notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 50));
      showToast(notification); // トースト通知を表示
    });

    return () => {
      socket.off('notification');
    };
  }, [socket]);

  return { notifications };
}
```

---

## 13. 本番デプロイ（nginx WebSocket proxy・SSL）

### nginx SSL + WebSocket プロキシ設定

```nginx
# /etc/nginx/sites-available/api.example.com
upstream socketio {
    least_conn;  # 最小コネクション数でロードバランス
    server 127.0.0.1:4000;
    server 127.0.0.1:4001;
    keepalive 64;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # WebSocket エンドポイント
    location /socket.io/ {
        proxy_pass http://socketio;
        proxy_http_version 1.1;

        # WebSocketアップグレードに必須
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        # 長時間接続のタイムアウト設定
        proxy_connect_timeout 7d;
        proxy_read_timeout 7d;
        proxy_send_timeout 7d;

        # バッファリング無効化（リアルタイム通信に重要）
        proxy_buffering off;
    }
}

# HTTPからHTTPSへリダイレクト
server {
    listen 80;
    server_name api.example.com;
    return 301 https://$host$request_uri;
}
```

### PM2によるNode.jsプロセス管理

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'socketio-server',
      script: './dist/index.js',
      instances: 4,          // CPUコア数に合わせる
      exec_mode: 'cluster',  // クラスターモード
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        REDIS_URL: 'redis://localhost:6379',
      },
      // メモリリーク対策
      max_memory_restart: '500M',
      // ログ設定
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
    },
  ],
};
```

```bash
# デプロイコマンド
npm run build
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup  # OS起動時の自動起動設定
```

### 本番環境でのモニタリング

```typescript
// server/monitoring.ts — 接続状況の監視
export function setupMonitoring(io: Server): void {
  // 接続数の定期レポート
  setInterval(async () => {
    const sockets = await io.fetchSockets();
    const metrics = {
      totalConnections: sockets.length,
      timestamp: new Date().toISOString(),
    };

    // Prometheus/Datadogなどへメトリクスを送信
    recordMetrics(metrics);
    console.log('接続状況:', metrics);
  }, 60000); // 1分ごと

  // 接続イベントのロギング
  io.on('connection', (socket) => {
    incrementCounter('websocket_connections_total');

    socket.on('disconnect', () => {
      decrementGauge('websocket_active_connections');
    });
  });
}
```

---

## まとめ — WebSocketアーキテクチャの全体像

本記事で解説したポイントを整理する。

- **プロトコル選択**: 双方向通信はWebSocket、サーバープッシュのみならSSEで十分
- **Socket.io**: 自動再接続・Room・Namespace・TypeScript型定義で実装品質が大幅に向上
- **認証**: JWTをHandshake時に送信し、ミドルウェアで一元検証
- **再接続**: Exponential BackoffとJitterで再接続の集中を防ぐ
- **スケール**: Redis Adapterで水平スケールに対応、WebSocketのみなら Sticky Session 不要
- **React**: カスタムフックでWebSocketロジックをUIから分離

### メッセージフォーマットの設計について

WebSocketを通じて送受信するJSONメッセージのスキーマ設計は、複雑なアプリケーションになるほど重要性が増す。型定義のズレや必須フィールドの抜け漏れは、デバッグが困難な実行時エラーを引き起こす。

開発中に送受信メッセージの構造を素早く確認・検証したい場面では、[DevToolBox](https://usedevtools.com/) のJSON Formatterが役立つ。Socket.ioのイベントペイロードをペーストして構造を整形・確認する用途に実用的だ。

WebSocketによるリアルタイム通信は、正しく実装すればユーザー体験を大きく向上させる強力な技術だ。本記事のコードをベースに、プロダクションで動作するリアルタイムアプリケーションを構築してほしい。

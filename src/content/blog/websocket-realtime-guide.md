---
title: "WebSocket完全ガイド — リアルタイム通信の実装パターン"
description: "WebSocketでリアルタイム通信を実装。Socket.io vs ws、チャットアプリ、通知システム、接続管理、SSEとの比較まで実践的に解説。"
pubDate: "2026-02-05"
tags: ["WebSocket", "Socket.io", "リアルタイム", "Node.js", "チャット"]
---

リアルタイムWebアプリケーションの需要が高まる中、WebSocketは欠かせない技術となっています。本記事では、WebSocketの基礎から、Socket.ioやwsライブラリを使った実装、チャットアプリの構築まで解説します。

## WebSocketとは

WebSocketは、クライアントとサーバー間で双方向のリアルタイム通信を可能にするプロトコルです。

### HTTP vs WebSocket

**HTTP（従来の通信）**:
- リクエスト/レスポンス型
- クライアントから開始する必要がある
- 新しいデータを取得するためにポーリングが必要
- オーバーヘッドが大きい

**WebSocket**:
- 双方向通信
- サーバーからクライアントへプッシュ可能
- 持続的な接続
- 低レイテンシ、低オーバーヘッド

### ユースケース

- チャットアプリケーション
- リアルタイム通知
- コラボレーションツール（Googleドキュメントなど）
- ライブダッシュボード
- オンラインゲーム
- ストリーミング
- IoTデバイス通信

## WebSocket基礎

### ブラウザのWebSocket API

```javascript
// 接続
const ws = new WebSocket('ws://localhost:8080');

// 接続確立時
ws.onopen = (event) => {
  console.log('Connected');
  ws.send('Hello Server!');
};

// メッセージ受信時
ws.onmessage = (event) => {
  console.log('Received:', event.data);
};

// エラー時
ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

// 接続終了時
ws.onclose = (event) => {
  console.log('Disconnected:', event.code, event.reason);
};

// メッセージ送信
ws.send(JSON.stringify({ type: 'message', text: 'Hello' }));

// 接続を閉じる
ws.close();
```

### Node.jsでの基本的なWebSocketサーバー（ws）

```bash
npm install ws
```

```javascript
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('New client connected');

  // メッセージ受信
  ws.on('message', (data) => {
    console.log('Received:', data.toString());

    // エコーバック
    ws.send(`Server received: ${data}`);
  });

  // エラーハンドリング
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  // 接続終了
  ws.on('close', () => {
    console.log('Client disconnected');
  });

  // 初期メッセージ送信
  ws.send('Welcome to WebSocket server!');
});

console.log('WebSocket server is running on ws://localhost:8080');
```

### Expressとの統合

```javascript
import express from 'express';
import { WebSocketServer } from 'ws';

const app = express();
const server = app.listen(3000);

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    // すべてのクライアントにブロードキャスト
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });
});

app.get('/', (req, res) => {
  res.send('HTTP server is running');
});
```

## Socket.io

Socket.ioは、WebSocketの上に構築された高レベルのライブラリで、自動再接続、ルーム、名前空間などの便利な機能を提供します。

### Socket.io vs ws

| 機能 | Socket.io | ws |
|------|-----------|-----|
| 抽象度 | 高い | 低い |
| 自動再接続 | あり | なし |
| ルーム機能 | あり | なし |
| ブロードキャスト | 簡単 | 手動実装 |
| フォールバック | あり（HTTPポーリング） | なし |
| バイナリサポート | あり | あり |
| パッケージサイズ | 大きい | 小さい |

**Socket.ioを選ぶべきケース**:
- チャットやコラボレーションツール
- 複雑なルーム管理が必要
- 自動再接続が必要
- クロスブラウザ対応が重要

**wsを選ぶべきケース**:
- シンプルな双方向通信
- パフォーマンスが最優先
- バンドルサイズを小さくしたい

### Socket.ioセットアップ

```bash
npm install socket.io socket.io-client
```

**サーバー側**:

```javascript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:3001',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // イベント受信
  socket.on('message', (data) => {
    console.log('Received:', data);

    // 送信者を除く全員に送信
    socket.broadcast.emit('message', data);

    // 送信者を含む全員に送信
    io.emit('message', data);

    // 特定のクライアントに送信
    socket.emit('message', data);
  });

  // カスタムイベント
  socket.on('chat-message', (msg) => {
    io.emit('chat-message', {
      id: socket.id,
      message: msg,
      timestamp: Date.now(),
    });
  });

  // 切断時
  socket.on('disconnect', (reason) => {
    console.log('User disconnected:', socket.id, reason);
  });
});

httpServer.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

**クライアント側（React）**:

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

function Chat() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('chat-message', (data) => {
      setMessages(prev => [...prev, data.message]);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const sendMessage = () => {
    if (socket && input.trim()) {
      socket.emit('chat-message', input);
      setInput('');
    }
  };

  return (
    <div>
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i}>{msg}</div>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}
```

## チャットアプリケーション実装

本格的なチャットアプリケーションの実装例です。

### サーバー側（Socket.io + TypeScript）

```typescript
import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';

interface User {
  id: string;
  username: string;
}

interface Message {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
}

interface Room {
  id: string;
  name: string;
  users: Set<string>;
  messages: Message[];
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const users = new Map<string, User>();
const rooms = new Map<string, Room>();

// デフォルトルーム作成
rooms.set('general', {
  id: 'general',
  name: 'General',
  users: new Set(),
  messages: [],
});

io.on('connection', (socket: Socket) => {
  console.log('User connected:', socket.id);

  // ユーザー登録
  socket.on('register', (username: string) => {
    users.set(socket.id, {
      id: socket.id,
      username,
    });

    socket.emit('registered', { id: socket.id, username });

    // ルーム一覧を送信
    socket.emit('rooms', Array.from(rooms.values()).map(r => ({
      id: r.id,
      name: r.name,
      userCount: r.users.size,
    })));
  });

  // ルーム参加
  socket.on('join-room', (roomId: string) => {
    const room = rooms.get(roomId);
    if (!room) return;

    // 他のルームから退出
    socket.rooms.forEach((r) => {
      if (r !== socket.id) {
        socket.leave(r);
        const oldRoom = rooms.get(r);
        if (oldRoom) {
          oldRoom.users.delete(socket.id);
          io.to(r).emit('user-left', {
            userId: socket.id,
            username: users.get(socket.id)?.username,
          });
        }
      }
    });

    // 新しいルームに参加
    socket.join(roomId);
    room.users.add(socket.id);

    // 過去のメッセージを送信
    socket.emit('room-messages', room.messages);

    // 他のユーザーに通知
    socket.to(roomId).emit('user-joined', {
      userId: socket.id,
      username: users.get(socket.id)?.username,
    });

    // ユーザー一覧を送信
    const roomUsers = Array.from(room.users)
      .map(id => users.get(id))
      .filter(Boolean);

    io.to(roomId).emit('room-users', roomUsers);
  });

  // メッセージ送信
  socket.on('send-message', (data: { roomId: string; text: string }) => {
    const room = rooms.get(data.roomId);
    const user = users.get(socket.id);

    if (!room || !user) return;

    const message: Message = {
      id: `${Date.now()}-${socket.id}`,
      userId: socket.id,
      username: user.username,
      text: data.text,
      timestamp: Date.now(),
    };

    room.messages.push(message);

    // 全員に送信
    io.to(data.roomId).emit('new-message', message);
  });

  // タイピング通知
  socket.on('typing', (roomId: string) => {
    const user = users.get(socket.id);
    if (user) {
      socket.to(roomId).emit('user-typing', {
        userId: socket.id,
        username: user.username,
      });
    }
  });

  // タイピング停止
  socket.on('stop-typing', (roomId: string) => {
    socket.to(roomId).emit('user-stop-typing', socket.id);
  });

  // プライベートメッセージ
  socket.on('private-message', (data: { to: string; text: string }) => {
    const sender = users.get(socket.id);
    if (!sender) return;

    const message = {
      from: socket.id,
      fromUsername: sender.username,
      text: data.text,
      timestamp: Date.now(),
    };

    // 送信先に送る
    socket.to(data.to).emit('private-message', message);

    // 送信者にも確認を送る
    socket.emit('private-message-sent', {
      to: data.to,
      ...message,
    });
  });

  // 切断時
  socket.on('disconnect', () => {
    const user = users.get(socket.id);

    // すべてのルームから削除
    socket.rooms.forEach((roomId) => {
      const room = rooms.get(roomId);
      if (room) {
        room.users.delete(socket.id);
        socket.to(roomId).emit('user-left', {
          userId: socket.id,
          username: user?.username,
        });
      }
    });

    users.delete(socket.id);
    console.log('User disconnected:', socket.id);
  });
});

httpServer.listen(3000, () => {
  console.log('Chat server running on http://localhost:3000');
});
```

### クライアント側（React + Socket.io）

```typescript
import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
}

function ChatApp() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [username, setUsername] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [currentRoom, setCurrentRoom] = useState('general');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState<Set<string>>(new Set());
  const typingTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    newSocket.on('registered', ({ username }) => {
      setIsRegistered(true);
      setUsername(username);
    });

    newSocket.on('room-messages', (msgs: Message[]) => {
      setMessages(msgs);
    });

    newSocket.on('new-message', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    newSocket.on('user-joined', ({ username }) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        userId: 'system',
        username: 'System',
        text: `${username} joined the room`,
        timestamp: Date.now(),
      }]);
    });

    newSocket.on('user-left', ({ username }) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        userId: 'system',
        username: 'System',
        text: `${username} left the room`,
        timestamp: Date.now(),
      }]);
    });

    newSocket.on('user-typing', ({ username }) => {
      setTyping(prev => new Set(prev).add(username));
    });

    newSocket.on('user-stop-typing', (userId) => {
      setTyping(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const register = () => {
    if (socket && username.trim()) {
      socket.emit('register', username);
      socket.emit('join-room', currentRoom);
    }
  };

  const sendMessage = () => {
    if (socket && input.trim()) {
      socket.emit('send-message', {
        roomId: currentRoom,
        text: input,
      });
      setInput('');
      socket.emit('stop-typing', currentRoom);
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);

    if (socket) {
      socket.emit('typing', currentRoom);

      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }

      typingTimeout.current = setTimeout(() => {
        socket.emit('stop-typing', currentRoom);
      }, 1000);
    }
  };

  if (!isRegistered) {
    return (
      <div>
        <input
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && register()}
        />
        <button onClick={register}>Join Chat</button>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={msg.userId === socket?.id ? 'message-own' : 'message'}
          >
            <strong>{msg.username}:</strong> {msg.text}
          </div>
        ))}
        {typing.size > 0 && (
          <div className="typing-indicator">
            {Array.from(typing).join(', ')} is typing...
          </div>
        )}
      </div>
      <div className="input-area">
        <input
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
```

## 接続管理

### 自動再接続

```typescript
// Socket.ioは自動再接続をサポート
const socket = io('http://localhost:3000', {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

socket.on('connect', () => {
  console.log('Connected');
});

socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
});

socket.on('reconnect_error', (error) => {
  console.error('Reconnection error:', error);
});

socket.on('reconnect_failed', () => {
  console.error('Failed to reconnect');
});
```

### ハートビート（Ping/Pong）

```javascript
// サーバー側（ws）
const HEARTBEAT_INTERVAL = 30000; // 30秒

wss.on('connection', (ws) => {
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });
});

const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL);

wss.on('close', () => {
  clearInterval(interval);
});
```

### 認証

```typescript
// Socket.ioでのトークン認証
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = verifyToken(token);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

// クライアント側
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token',
  },
});
```

## Server-Sent Events（SSE）との比較

SSEは、サーバーからクライアントへの一方向通信を提供します。

### SSEの特徴

- HTTPベース
- 自動再接続
- テキストデータのみ
- サーバーからクライアントへの一方向通信

### SSE実装例

```javascript
// サーバー側（Express）
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // 定期的にデータ送信
  const interval = setInterval(() => {
    sendEvent({ timestamp: Date.now() });
  }, 1000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// クライアント側
const eventSource = new EventSource('/events');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

eventSource.onerror = (error) => {
  console.error('SSE error:', error);
};
```

### WebSocket vs SSE

| 特徴 | WebSocket | SSE |
|------|-----------|-----|
| 通信方向 | 双方向 | サーバー→クライアント |
| プロトコル | WebSocket | HTTP |
| データ型 | バイナリ/テキスト | テキストのみ |
| 自動再接続 | ライブラリ依存 | 標準搭載 |
| ブラウザサポート | 広い | IEは非対応 |

**SSEを選ぶべきケース**:
- 通知システム
- ライブフィード
- サーバーからのプッシュのみ
- シンプルな実装が好ましい

**WebSocketを選ぶべきケース**:
- チャット
- コラボレーションツール
- 双方向通信が必要
- バイナリデータの送信

## まとめ

WebSocketはリアルタイムWebアプリケーションの中核技術です。

**重要なポイント**:
- Socket.ioは高レベルで便利、wsは軽量で高速
- ルーム機能で効率的なグループ通信
- 自動再接続とハートビートで安定した接続
- 認証とバリデーションでセキュアな通信
- SSEは一方向通信に最適

用途に応じて適切な技術を選び、スケーラブルで信頼性の高いリアルタイムアプリケーションを構築してください。

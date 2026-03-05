---
title: "PartyKitで作るリアルタイムマルチプレイヤーアプリ完全ガイド"
description: "PartyKitを使ってリアルタイムコラボレーションやマルチプレイヤーアプリを構築する方法を、実践的なコード例とともに詳しく解説します。"
pubDate: "2025-02-05"
tags: ['プログラミング']
---

# PartyKitで作るリアルタイムマルチプレイヤーアプリ完全ガイド

リアルタイムコラボレーション機能は、現代のWebアプリケーションにおいて欠かせない要素となっています。PartyKitは、リアルタイムマルチプレイヤーアプリケーションを簡単に構築できる革新的なプラットフォームです。

## PartyKitとは

PartyKitは、Cloudflare Workersベースのリアルタイムコラボレーションプラットフォームで、WebSocketを使った双方向通信を簡単に実装できます。従来のWebSocketサーバーと比較して、以下の特徴があります。

### 主な特徴

- **自動スケーリング**: Cloudflareのエッジネットワーク上で動作し、グローバルに自動スケール
- **低レイテンシ**: エッジロケーションから配信されるため、世界中どこでも低遅延
- **状態管理**: Durable Objectsを活用した効率的な状態管理
- **シンプルなAPI**: 複雑なインフラ設定不要で、数行のコードでリアルタイム機能を実装
- **TypeScript完全対応**: 型安全な開発体験

## セットアップ

PartyKitプロジェクトを始めるには、以下のコマンドを実行します。

```bash
npm create partykit@latest my-realtime-app
cd my-realtime-app
npm install
```

これにより、PartyKitプロジェクトの基本構造が作成されます。

```
my-realtime-app/
├── party/
│   └── index.ts       # PartyKitサーバーコード
├── src/
│   └── client.ts      # クライアントコード
├── public/
│   └── index.html
├── partykit.json      # 設定ファイル
└── package.json
```

## 基本的なPartyサーバーの実装

PartyKitサーバーは`party/index.ts`に記述します。最もシンプルなエコーサーバーから始めましょう。

```typescript
import type * as Party from "partykit/server";

export default class MyPartyServer implements Party.Server {
  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // 新しいクライアントが接続したときの処理
    console.log(
      `Connected: ${conn.id} to room ${this.room.id}`
    );

    // 接続通知を全員に送信
    this.room.broadcast(
      JSON.stringify({
        type: "user-joined",
        userId: conn.id,
        timestamp: Date.now()
      })
    );
  }

  onMessage(message: string, sender: Party.Connection) {
    // メッセージを受信したときの処理
    const data = JSON.parse(message);

    // 送信者以外の全員にブロードキャスト
    this.room.broadcast(
      JSON.stringify({
        type: "message",
        userId: sender.id,
        content: data.content,
        timestamp: Date.now()
      }),
      [sender.id] // 送信者を除外
    );
  }

  onClose(conn: Party.Connection) {
    // クライアントが切断したときの処理
    this.room.broadcast(
      JSON.stringify({
        type: "user-left",
        userId: conn.id,
        timestamp: Date.now()
      })
    );
  }
}

MyPartyServer satisfies Party.Worker;
```

## クライアント側の実装

次に、クライアント側でPartyKitサーバーに接続します。

```typescript
import PartySocket from "partysocket";

// PartySocketインスタンスを作成
const socket = new PartySocket({
  host: "localhost:1999", // 開発環境
  room: "my-room",        // ルーム名
});

// 接続が確立したとき
socket.addEventListener("open", () => {
  console.log("Connected to PartyKit server");

  // メッセージを送信
  socket.send(JSON.stringify({
    type: "chat",
    content: "Hello, PartyKit!"
  }));
});

// メッセージを受信したとき
socket.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  console.log("Received:", data);

  switch (data.type) {
    case "user-joined":
      console.log(`User ${data.userId} joined`);
      break;
    case "user-left":
      console.log(`User ${data.userId} left`);
      break;
    case "message":
      displayMessage(data);
      break;
  }
});

// エラーハンドリング
socket.addEventListener("error", (error) => {
  console.error("Socket error:", error);
});

// 接続が閉じられたとき
socket.addEventListener("close", () => {
  console.log("Disconnected from server");
});

function displayMessage(data: any) {
  const messageElement = document.createElement("div");
  messageElement.textContent = `${data.userId}: ${data.content}`;
  document.getElementById("messages")?.appendChild(messageElement);
}
```

## 実践例1: リアルタイムチャットアプリ

より実践的なチャットアプリケーションを構築してみましょう。

### サーバー側（状態管理付き）

```typescript
import type * as Party from "partykit/server";

interface User {
  id: string;
  name: string;
  joinedAt: number;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
}

export default class ChatServer implements Party.Server {
  users: Map<string, User>;
  messages: ChatMessage[];

  constructor(readonly room: Party.Room) {
    this.users = new Map();
    this.messages = [];
  }

  async onStart() {
    // 永続化されたメッセージを読み込む
    const stored = await this.room.storage.get<ChatMessage[]>("messages");
    if (stored) {
      this.messages = stored;
    }
  }

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // URLパラメータからユーザー名を取得
    const url = new URL(ctx.request.url);
    const userName = url.searchParams.get("name") || "Anonymous";

    const user: User = {
      id: conn.id,
      name: userName,
      joinedAt: Date.now()
    };

    this.users.set(conn.id, user);

    // 既存のメッセージ履歴を新規ユーザーに送信
    conn.send(JSON.stringify({
      type: "history",
      messages: this.messages.slice(-50) // 最新50件
    }));

    // 現在のユーザーリストを送信
    conn.send(JSON.stringify({
      type: "user-list",
      users: Array.from(this.users.values())
    }));

    // 全員に新規参加を通知
    this.room.broadcast(JSON.stringify({
      type: "user-joined",
      user
    }));
  }

  async onMessage(message: string, sender: Party.Connection) {
    const data = JSON.parse(message);
    const user = this.users.get(sender.id);

    if (!user) return;

    switch (data.type) {
      case "chat":
        const chatMessage: ChatMessage = {
          id: crypto.randomUUID(),
          userId: user.id,
          userName: user.name,
          content: data.content,
          timestamp: Date.now()
        };

        this.messages.push(chatMessage);

        // メッセージを永続化（最新100件のみ保存）
        if (this.messages.length > 100) {
          this.messages = this.messages.slice(-100);
        }
        await this.room.storage.put("messages", this.messages);

        // 全員にブロードキャスト
        this.room.broadcast(JSON.stringify({
          type: "message",
          message: chatMessage
        }));
        break;

      case "typing":
        // 入力中状態を送信者以外に通知
        this.room.broadcast(
          JSON.stringify({
            type: "typing",
            userId: user.id,
            userName: user.name,
            isTyping: data.isTyping
          }),
          [sender.id]
        );
        break;
    }
  }

  onClose(conn: Party.Connection) {
    const user = this.users.get(conn.id);
    this.users.delete(conn.id);

    if (user) {
      this.room.broadcast(JSON.stringify({
        type: "user-left",
        user
      }));
    }
  }
}

ChatServer satisfies Party.Worker;
```

### クライアント側（React実装）

```typescript
import { useEffect, useState, useRef } from "react";
import PartySocket from "partysocket";

interface Message {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
}

export function ChatRoom({ roomId, userName }: { roomId: string; userName: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const socketRef = useRef<PartySocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // WebSocket接続
    const socket = new PartySocket({
      host: import.meta.env.VITE_PARTYKIT_HOST,
      room: roomId,
      query: { name: userName }
    });

    socket.addEventListener("message", (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "history":
          setMessages(data.messages);
          break;
        case "message":
          setMessages(prev => [...prev, data.message]);
          break;
        case "user-list":
          setOnlineUsers(data.users.map((u: any) => u.name));
          break;
        case "user-joined":
          setOnlineUsers(prev => [...prev, data.user.name]);
          break;
        case "user-left":
          setOnlineUsers(prev => prev.filter(n => n !== data.user.name));
          break;
        case "typing":
          if (data.isTyping) {
            setTypingUsers(prev => new Set(prev).add(data.userName));
          } else {
            setTypingUsers(prev => {
              const next = new Set(prev);
              next.delete(data.userName);
              return next;
            });
          }
          break;
      }
    });

    socketRef.current = socket;

    return () => {
      socket.close();
    };
  }, [roomId, userName]);

  const sendMessage = () => {
    if (!inputValue.trim() || !socketRef.current) return;

    socketRef.current.send(JSON.stringify({
      type: "chat",
      content: inputValue
    }));

    setInputValue("");
    sendTypingStatus(false);
  };

  const sendTypingStatus = (isTyping: boolean) => {
    socketRef.current?.send(JSON.stringify({
      type: "typing",
      isTyping
    }));
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);

    // 入力中状態を送信
    sendTypingStatus(true);

    // タイムアウトをリセット
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // 3秒後に入力停止を通知
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(false);
    }, 3000);
  };

  return (
    <div className="chat-room">
      <div className="sidebar">
        <h3>オンライン ({onlineUsers.length})</h3>
        <ul>
          {onlineUsers.map((name, i) => (
            <li key={i}>{name}</li>
          ))}
        </ul>
      </div>

      <div className="main">
        <div className="messages">
          {messages.map((msg) => (
            <div key={msg.id} className="message">
              <span className="user-name">{msg.userName}</span>
              <span className="content">{msg.content}</span>
              <span className="timestamp">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>

        {typingUsers.size > 0 && (
          <div className="typing-indicator">
            {Array.from(typingUsers).join(", ")} が入力中...
          </div>
        )}

        <div className="input-area">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            placeholder="メッセージを入力..."
          />
          <button onClick={sendMessage}>送信</button>
        </div>
      </div>
    </div>
  );
}
```

## 実践例2: コラボレーティブホワイトボード

リアルタイム描画を実現するホワイトボードアプリを構築します。

### サーバー側

```typescript
import type * as Party from "partykit/server";

interface DrawEvent {
  type: "draw" | "clear";
  x?: number;
  y?: number;
  prevX?: number;
  prevY?: number;
  color?: string;
  lineWidth?: number;
  userId: string;
}

export default class WhiteboardServer implements Party.Server {
  cursors: Map<string, { x: number; y: number; color: string }>;
  drawHistory: DrawEvent[];

  constructor(readonly room: Party.Room) {
    this.cursors = new Map();
    this.drawHistory = [];
  }

  async onStart() {
    const stored = await this.room.storage.get<DrawEvent[]>("drawHistory");
    if (stored) {
      this.drawHistory = stored;
    }
  }

  onConnect(conn: Party.Connection) {
    // 既存の描画履歴を新規ユーザーに送信
    conn.send(JSON.stringify({
      type: "init",
      history: this.drawHistory
    }));

    // 現在のカーソル位置を送信
    conn.send(JSON.stringify({
      type: "cursors",
      cursors: Array.from(this.cursors.entries()).map(([id, pos]) => ({
        userId: id,
        ...pos
      }))
    }));
  }

  async onMessage(message: string, sender: Party.Connection) {
    const data = JSON.parse(message);

    switch (data.type) {
      case "draw":
        const drawEvent: DrawEvent = {
          ...data,
          userId: sender.id
        };

        this.drawHistory.push(drawEvent);

        // 履歴が大きくなりすぎないよう制限
        if (this.drawHistory.length > 10000) {
          this.drawHistory = this.drawHistory.slice(-10000);
        }

        await this.room.storage.put("drawHistory", this.drawHistory);

        // 全員にブロードキャスト
        this.room.broadcast(JSON.stringify(drawEvent));
        break;

      case "cursor":
        this.cursors.set(sender.id, {
          x: data.x,
          y: data.y,
          color: data.color
        });

        // カーソル位置を他のユーザーに送信
        this.room.broadcast(
          JSON.stringify({
            type: "cursor",
            userId: sender.id,
            x: data.x,
            y: data.y,
            color: data.color
          }),
          [sender.id]
        );
        break;

      case "clear":
        this.drawHistory = [];
        await this.room.storage.put("drawHistory", []);

        this.room.broadcast(JSON.stringify({
          type: "clear"
        }));
        break;
    }
  }

  onClose(conn: Party.Connection) {
    this.cursors.delete(conn.id);

    this.room.broadcast(JSON.stringify({
      type: "cursor-leave",
      userId: conn.id
    }));
  }
}

WhiteboardServer satisfies Party.Worker;
```

### クライアント側（Canvas実装）

```typescript
import { useEffect, useRef, useState } from "react";
import PartySocket from "partysocket";

export function Whiteboard({ roomId }: { roomId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<PartySocket | null>(null);
  const isDrawingRef = useRef(false);
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(2);
  const cursorsRef = useRef<Map<string, { x: number; y: number; color: string }>>(new Map());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // WebSocket接続
    const socket = new PartySocket({
      host: import.meta.env.VITE_PARTYKIT_HOST,
      room: roomId
    });

    socket.addEventListener("message", (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "init":
          // 履歴を再描画
          data.history.forEach((evt: any) => {
            if (evt.type === "draw") {
              drawLine(ctx, evt.prevX, evt.prevY, evt.x, evt.y, evt.color, evt.lineWidth);
            }
          });
          break;

        case "draw":
          drawLine(ctx, data.prevX, data.prevY, data.x, data.y, data.color, data.lineWidth);
          break;

        case "clear":
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          break;

        case "cursor":
          cursorsRef.current.set(data.userId, {
            x: data.x,
            y: data.y,
            color: data.color
          });
          break;

        case "cursor-leave":
          cursorsRef.current.delete(data.userId);
          break;

        case "cursors":
          data.cursors.forEach((cursor: any) => {
            cursorsRef.current.set(cursor.userId, {
              x: cursor.x,
              y: cursor.y,
              color: cursor.color
            });
          });
          break;
      }
    });

    socketRef.current = socket;

    // マウスイベント
    let prevX = 0, prevY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isDrawingRef.current = true;
      const rect = canvas.getBoundingClientRect();
      prevX = e.clientX - rect.left;
      prevY = e.clientY - rect.top;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // カーソル位置を送信
      socket.send(JSON.stringify({
        type: "cursor",
        x,
        y,
        color
      }));

      if (isDrawingRef.current) {
        drawLine(ctx, prevX, prevY, x, y, color, lineWidth);

        socket.send(JSON.stringify({
          type: "draw",
          prevX,
          prevY,
          x,
          y,
          color,
          lineWidth
        }));

        prevX = x;
        prevY = y;
      }
    };

    const handleMouseUp = () => {
      isDrawingRef.current = false;
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseUp);

    // カーソル描画ループ
    const drawCursors = () => {
      // ここでは省略（別レイヤーで描画推奨）
      requestAnimationFrame(drawCursors);
    };
    drawCursors();

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseleave", handleMouseUp);
      socket.close();
    };
  }, [roomId, color, lineWidth]);

  const drawLine = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    strokeColor: string,
    strokeWidth: number
  ) => {
    ctx.beginPath();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = "round";
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  const clearCanvas = () => {
    socketRef.current?.send(JSON.stringify({ type: "clear" }));
  };

  return (
    <div className="whiteboard">
      <div className="toolbar">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <input
          type="range"
          min="1"
          max="20"
          value={lineWidth}
          onChange={(e) => setLineWidth(Number(e.target.value))}
        />
        <button onClick={clearCanvas}>クリア</button>
      </div>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ border: "1px solid #ccc" }}
      />
    </div>
  );
}
```

## デプロイ

PartyKitアプリケーションは簡単にデプロイできます。

```bash
# ビルド
npm run build

# デプロイ
npx partykit deploy
```

デプロイ後、`https://your-app.partykit.dev`のようなURLでアクセスできます。

## まとめ

PartyKitを使えば、複雑なリアルタイムアプリケーションを驚くほど簡単に構築できます。WebSocketサーバーの管理、スケーリング、状態管理などの煩雑な部分をPartyKitが担当してくれるため、開発者はビジネスロジックに集中できます。

チャット、ホワイトボード、マルチプレイヤーゲーム、コラボレーティブエディタなど、さまざまな用途に活用できるでしょう。

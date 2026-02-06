---
title: "PartyKit入門：リアルタイムマルチプレイヤーアプリの構築"
description: "PartyKitを使ってリアルタイムコラボレーションやマルチプレイヤー機能を実装する方法を、実践的なコード例とともに詳しく解説します。"
pubDate: "2025-02-06"
tags: ["PartyKit", "WebSocket", "リアルタイム", "マルチプレイヤー", "TypeScript"]
---

## PartyKitとは

PartyKitは、リアルタイムマルチプレイヤーアプリケーションを簡単に構築できるプラットフォームです。WebSocketベースの通信を抽象化し、開発者がビジネスロジックに集中できる環境を提供します。

### 主な特徴

- **シンプルなAPI**: WebSocketの複雑さを隠蔽し、直感的なインターフェースを提供
- **スケーラビリティ**: Cloudflare Workersをベースにした高速・スケーラブルなインフラ
- **型安全性**: TypeScriptファーストの設計で開発体験が向上
- **柔軟な状態管理**: Room単位での独立した状態管理が可能
- **低レイテンシ**: エッジコンピューティングによる高速通信

## セットアップ

### インストール

```bash
npm create partykit@latest my-party-app
cd my-party-app
npm install
```

既存プロジェクトに追加する場合:

```bash
npm install partykit
```

### プロジェクト構成

```
my-party-app/
├── party/
│   └── server.ts      # PartyKitサーバーコード
├── src/
│   ├── app.tsx        # クライアントアプリ
│   └── partykit.ts    # クライアントSDK設定
├── partykit.json      # 設定ファイル
└── package.json
```

## 基本的なサーバー実装

### シンプルなチャットサーバー

```typescript
// party/chatroom.ts
import type * as Party from "partykit/server";

export default class ChatRoom implements Party.Server {
  constructor(readonly room: Party.Room) {}

  // クライアントが接続したとき
  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    console.log(`User ${conn.id} connected`);
    
    // 他の参加者に通知
    this.room.broadcast(
      JSON.stringify({
        type: "user_joined",
        userId: conn.id,
        timestamp: Date.now()
      }),
      [conn.id] // この接続を除外
    );
  }

  // メッセージを受信したとき
  onMessage(message: string, sender: Party.Connection) {
    const data = JSON.parse(message);
    
    // メッセージを全員にブロードキャスト
    this.room.broadcast(
      JSON.stringify({
        type: "chat_message",
        userId: sender.id,
        message: data.message,
        timestamp: Date.now()
      })
    );
  }

  // クライアントが切断したとき
  onClose(conn: Party.Connection) {
    console.log(`User ${conn.id} disconnected`);
    
    this.room.broadcast(
      JSON.stringify({
        type: "user_left",
        userId: conn.id,
        timestamp: Date.now()
      })
    );
  }
}

ChatRoom.onBeforeConnect = async (request, lobby, ctx) => {
  // 認証やレート制限をここで実装
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }
  
  // 接続を許可
  return request;
};
```

### 状態を持つゲームサーバー

```typescript
// party/gameroom.ts
import type * as Party from "partykit/server";

interface Player {
  id: string;
  name: string;
  score: number;
  position: { x: number; y: number };
}

interface GameState {
  players: Map<string, Player>;
  gameStarted: boolean;
  startTime?: number;
}

export default class GameRoom implements Party.Server {
  state: GameState;

  constructor(readonly room: Party.Room) {
    this.state = {
      players: new Map(),
      gameStarted: false
    };
  }

  async onStart() {
    // 永続化されたデータを復元
    const saved = await this.room.storage.get<GameState>("gameState");
    if (saved) {
      this.state = {
        ...saved,
        players: new Map(Object.entries(saved.players))
      };
    }
  }

  onConnect(conn: Party.Connection) {
    // 新しいプレイヤーを追加
    const player: Player = {
      id: conn.id,
      name: `Player ${conn.id.slice(0, 4)}`,
      score: 0,
      position: { x: 0, y: 0 }
    };
    
    this.state.players.set(conn.id, player);

    // 現在の状態を新規接続者に送信
    conn.send(JSON.stringify({
      type: "initial_state",
      state: this.serializeState()
    }));

    // 他のプレイヤーに新規参加を通知
    this.broadcastState([conn.id]);
    
    // 状態を永続化
    this.saveState();
  }

  onMessage(message: string, sender: Party.Connection) {
    const data = JSON.parse(message);
    
    switch (data.type) {
      case "move":
        this.handleMove(sender.id, data.position);
        break;
      case "update_score":
        this.handleScoreUpdate(sender.id, data.score);
        break;
      case "start_game":
        this.handleGameStart();
        break;
      default:
        console.warn("Unknown message type:", data.type);
    }
  }

  handleMove(playerId: string, position: { x: number; y: number }) {
    const player = this.state.players.get(playerId);
    if (player) {
      player.position = position;
      
      // 位置更新をブロードキャスト
      this.room.broadcast(JSON.stringify({
        type: "player_moved",
        playerId,
        position
      }));
    }
  }

  handleScoreUpdate(playerId: string, scoreDelta: number) {
    const player = this.state.players.get(playerId);
    if (player) {
      player.score += scoreDelta;
      this.broadcastState();
      this.saveState();
    }
  }

  handleGameStart() {
    if (!this.state.gameStarted && this.state.players.size >= 2) {
      this.state.gameStarted = true;
      this.state.startTime = Date.now();
      
      this.room.broadcast(JSON.stringify({
        type: "game_started",
        startTime: this.state.startTime
      }));
      
      this.saveState();
    }
  }

  onClose(conn: Party.Connection) {
    this.state.players.delete(conn.id);
    this.broadcastState();
    this.saveState();
  }

  // ヘルパーメソッド
  private serializeState() {
    return {
      players: Array.from(this.state.players.values()),
      gameStarted: this.state.gameStarted,
      startTime: this.state.startTime
    };
  }

  private broadcastState(exclude: string[] = []) {
    this.room.broadcast(
      JSON.stringify({
        type: "state_update",
        state: this.serializeState()
      }),
      exclude
    );
  }

  private async saveState() {
    await this.room.storage.put("gameState", {
      players: Object.fromEntries(this.state.players),
      gameStarted: this.state.gameStarted,
      startTime: this.state.startTime
    });
  }

  // 定期的なティック処理
  async onRequest(request: Party.Request) {
    if (request.method === "POST" && new URL(request.url).pathname === "/tick") {
      // ゲームロジックの更新
      if (this.state.gameStarted) {
        // 例: 時間経過の処理
        this.broadcastState();
      }
      return new Response("OK");
    }
    
    return new Response("Not found", { status: 404 });
  }
}
```

## クライアント実装

### React + PartyKit

```typescript
// src/hooks/usePartyKit.ts
import { useEffect, useState, useCallback } from "react";
import PartySocket from "partysocket";

interface Message {
  type: string;
  [key: string]: any;
}

export function usePartyKit(roomId: string, options?: {
  host?: string;
  party?: string;
}) {
  const [socket, setSocket] = useState<PartySocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new PartySocket({
      host: options?.host || "localhost:1999",
      room: roomId,
      party: options?.party || "chatroom"
    });

    ws.addEventListener("open", () => {
      console.log("Connected to PartyKit");
      setConnected(true);
    });

    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      setMessages((prev) => [...prev, message]);
    });

    ws.addEventListener("close", () => {
      console.log("Disconnected from PartyKit");
      setConnected(false);
    });

    ws.addEventListener("error", (error) => {
      console.error("WebSocket error:", error);
    });

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [roomId, options?.host, options?.party]);

  const sendMessage = useCallback((message: any) => {
    if (socket && connected) {
      socket.send(JSON.stringify(message));
    }
  }, [socket, connected]);

  return { socket, messages, connected, sendMessage };
}
```

### チャットコンポーネント

```typescript
// src/components/Chat.tsx
import { useState } from "react";
import { usePartyKit } from "../hooks/usePartyKit";

export function Chat({ roomId }: { roomId: string }) {
  const [input, setInput] = useState("");
  const { messages, connected, sendMessage } = usePartyKit(roomId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({
        type: "chat_message",
        message: input
      });
      setInput("");
    }
  };

  return (
    <div className="chat-container">
      <div className="status">
        {connected ? "🟢 接続中" : "🔴 切断"}
      </div>

      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className="message">
            {msg.type === "chat_message" && (
              <div>
                <strong>{msg.userId.slice(0, 8)}</strong>: {msg.message}
                <span className="time">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
            )}
            {msg.type === "user_joined" && (
              <div className="system-message">
                👋 {msg.userId.slice(0, 8)} が参加しました
              </div>
            )}
            {msg.type === "user_left" && (
              <div className="system-message">
                👋 {msg.userId.slice(0, 8)} が退出しました
              </div>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="メッセージを入力..."
          disabled={!connected}
        />
        <button type="submit" disabled={!connected}>
          送信
        </button>
      </form>
    </div>
  );
}
```

## 高度な機能

### プレゼンス管理

```typescript
// party/presence.ts
import type * as Party from "partykit/server";

interface User {
  id: string;
  name: string;
  cursor?: { x: number; y: number };
  lastSeen: number;
}

export default class PresenceRoom implements Party.Server {
  users: Map<string, User> = new Map();
  cleanupInterval?: ReturnType<typeof setInterval>;

  async onStart() {
    // 5秒ごとに非アクティブユーザーをクリーンアップ
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 30000; // 30秒

      for (const [id, user] of this.users.entries()) {
        if (now - user.lastSeen > timeout) {
          this.users.delete(id);
          this.broadcastPresence();
        }
      }
    }, 5000);
  }

  onConnect(conn: Party.Connection) {
    this.users.set(conn.id, {
      id: conn.id,
      name: `User ${conn.id.slice(0, 6)}`,
      lastSeen: Date.now()
    });

    // 現在のプレゼンス情報を送信
    conn.send(JSON.stringify({
      type: "presence",
      users: Array.from(this.users.values())
    }));

    this.broadcastPresence([conn.id]);
  }

  onMessage(message: string, sender: Party.Connection) {
    const data = JSON.parse(message);
    const user = this.users.get(sender.id);

    if (!user) return;

    user.lastSeen = Date.now();

    switch (data.type) {
      case "cursor_move":
        user.cursor = data.position;
        // カーソル移動は頻繁なのでブロードキャストを最適化
        this.room.broadcast(
          JSON.stringify({
            type: "cursor_update",
            userId: sender.id,
            position: data.position
          }),
          [sender.id]
        );
        break;

      case "update_name":
        user.name = data.name;
        this.broadcastPresence();
        break;
    }
  }

  onClose(conn: Party.Connection) {
    this.users.delete(conn.id);
    this.broadcastPresence();
  }

  private broadcastPresence(exclude: string[] = []) {
    this.room.broadcast(
      JSON.stringify({
        type: "presence",
        users: Array.from(this.users.values())
      }),
      exclude
    );
  }

  async onShutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
```

### リアルタイムコラボレーション（カーソル共有）

```typescript
// src/components/CollaborativeCursor.tsx
import { useEffect, useRef, useState } from "react";
import { usePartyKit } from "../hooks/usePartyKit";

interface Cursor {
  userId: string;
  x: number;
  y: number;
  name: string;
}

export function CollaborativeCursor() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [cursors, setCursors] = useState<Map<string, Cursor>>(new Map());
  const { messages, sendMessage } = usePartyKit("presence-demo", {
    party: "presence"
  });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        sendMessage({
          type: "cursor_move",
          position: {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
          }
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [sendMessage]);

  useEffect(() => {
    messages.forEach((msg) => {
      if (msg.type === "cursor_update") {
        setCursors((prev) => {
          const next = new Map(prev);
          next.set(msg.userId, {
            userId: msg.userId,
            x: msg.position.x,
            y: msg.position.y,
            name: msg.name || msg.userId.slice(0, 6)
          });
          return next;
        });
      } else if (msg.type === "presence") {
        // プレゼンス情報の更新
        const userMap = new Map<string, Cursor>();
        msg.users.forEach((user: any) => {
          if (user.cursor) {
            userMap.set(user.id, {
              userId: user.id,
              x: user.cursor.x,
              y: user.cursor.y,
              name: user.name
            });
          }
        });
        setCursors(userMap);
      }
    });
  }, [messages]);

  return (
    <div ref={canvasRef} className="collaborative-canvas">
      {Array.from(cursors.values()).map((cursor) => (
        <div
          key={cursor.userId}
          className="remote-cursor"
          style={{
            position: "absolute",
            left: cursor.x,
            top: cursor.y,
            pointerEvents: "none"
          }}
        >
          <svg width="20" height="20">
            <path
              d="M0 0 L0 16 L4 12 L7 18 L9 17 L6 11 L12 11 Z"
              fill={`hsl(${hashCode(cursor.userId) % 360}, 70%, 60%)`}
            />
          </svg>
          <span className="cursor-label">{cursor.name}</span>
        </div>
      ))}
    </div>
  );
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}
```

## デプロイと設定

### partykit.json

```json
{
  "name": "my-party-app",
  "main": "party/server.ts",
  "parties": {
    "chatroom": "party/chatroom.ts",
    "gameroom": "party/gameroom.ts",
    "presence": "party/presence.ts"
  },
  "serve": "dist",
  "build": {
    "command": "npm run build",
    "cwd": ".",
    "watch": "src"
  }
}
```

### デプロイコマンド

```bash
# 開発サーバー起動
npx partykit dev

# プロダクションデプロイ
npx partykit deploy

# 特定のPartyをデプロイ
npx partykit deploy --party chatroom
```

### 環境変数の設定

```bash
# .env
PARTYKIT_TOKEN=your-token-here
PARTYKIT_PROJECT=my-party-app
```

## パフォーマンス最適化

### メッセージのスロットリング

```typescript
// クライアント側でスロットリング
import { useCallback, useRef } from "react";

export function useThrottledSend(socket: PartySocket, delay: number = 50) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastSentRef = useRef<number>(0);

  const throttledSend = useCallback((message: any) => {
    const now = Date.now();
    const timeSinceLastSend = now - lastSentRef.current;

    if (timeSinceLastSend >= delay) {
      socket.send(JSON.stringify(message));
      lastSentRef.current = now;
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        socket.send(JSON.stringify(message));
        lastSentRef.current = Date.now();
      }, delay - timeSinceLastSend);
    }
  }, [socket, delay]);

  return throttledSend;
}
```

### バッチ処理

```typescript
// サーバー側でメッセージをバッチ処理
export default class OptimizedRoom implements Party.Server {
  messageQueue: Array<{ sender: Party.Connection; data: any }> = [];
  batchInterval?: ReturnType<typeof setInterval>;

  async onStart() {
    // 100msごとにバッチ処理
    this.batchInterval = setInterval(() => {
      this.processBatch();
    }, 100);
  }

  onMessage(message: string, sender: Party.Connection) {
    this.messageQueue.push({
      sender,
      data: JSON.parse(message)
    });
  }

  private processBatch() {
    if (this.messageQueue.length === 0) return;

    // 同じタイプのメッセージをグループ化
    const grouped = new Map<string, any[]>();
    
    this.messageQueue.forEach(({ sender, data }) => {
      const key = data.type;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push({ senderId: sender.id, ...data });
    });

    // グループ化されたメッセージをブロードキャスト
    for (const [type, messages] of grouped.entries()) {
      this.room.broadcast(JSON.stringify({
        type: `batch_${type}`,
        messages
      }));
    }

    this.messageQueue = [];
  }

  async onShutdown() {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
    }
  }
}
```

## ベストプラクティス

### 1. 認証とセキュリティ

```typescript
// JWT認証の実装
import { verify } from "jsonwebtoken";

ChatRoom.onBeforeConnect = async (request, lobby) => {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const payload = verify(token, process.env.JWT_SECRET!);
    // 認証情報をヘッダーに追加
    const headers = new Headers(request.headers);
    headers.set("X-User-ID", payload.sub as string);
    
    return new Request(request, { headers });
  } catch (error) {
    return new Response("Invalid token", { status: 401 });
  }
};
```

### 2. エラーハンドリング

```typescript
onMessage(message: string, sender: Party.Connection) {
  try {
    const data = JSON.parse(message);
    this.handleMessage(data, sender);
  } catch (error) {
    console.error("Message handling error:", error);
    sender.send(JSON.stringify({
      type: "error",
      message: "Invalid message format"
    }));
  }
}
```

### 3. レート制限

```typescript
class RateLimiter {
  private requests = new Map<string, number[]>();

  check(connectionId: string, limit: number, window: number): boolean {
    const now = Date.now();
    const requests = this.requests.get(connectionId) || [];
    
    // ウィンドウ外のリクエストを削除
    const validRequests = requests.filter(time => now - time < window);
    
    if (validRequests.length >= limit) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(connectionId, validRequests);
    return true;
  }
}

export default class RateLimitedRoom implements Party.Server {
  rateLimiter = new RateLimiter();

  onMessage(message: string, sender: Party.Connection) {
    // 1分間に60メッセージまで
    if (!this.rateLimiter.check(sender.id, 60, 60000)) {
      sender.send(JSON.stringify({
        type: "error",
        message: "Rate limit exceeded"
      }));
      return;
    }

    // 通常の処理
    // ...
  }
}
```

## まとめ

PartyKitを使えば、リアルタイムマルチプレイヤーアプリケーションを素早く構築できます。主なポイント:

- シンプルなAPIでWebSocketの複雑さを隠蔽
- Room単位の独立した状態管理
- Cloudflare Workersベースのスケーラブルなインフラ
- TypeScriptによる型安全な開発
- プレゼンス、コラボレーション、ゲームなど多様なユースケースに対応

適切なスロットリング、バッチ処理、認証、レート制限を実装することで、本番環境でも安定したアプリケーションを提供できます。

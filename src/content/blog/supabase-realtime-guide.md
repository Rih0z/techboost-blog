---
title: 'Supabase Realtime完全ガイド: WebSocketベースのリアルタイムデータ同期'
description: 'Supabase Realtimeを使ったリアルタイムアプリケーション開発を完全解説。データベース変更の購読、Presence、Broadcastの実装パターンとパフォーマンス最適化テクニックを紹介します。2026年最新の情報を反映しています。'
pubDate: 2025-09-28
updatedDate: 2025-09-28
tags: ['Supabase', 'Realtime', 'websocket', 'React', 'Database']
heroImage: '../../assets/thumbnails/supabase-realtime-guide.jpg'
---
## Supabase Realtimeとは

Supabase Realtimeは、PostgreSQLデータベースの変更をWebSocket経由でリアルタイムに購読できる機能です。チャットアプリ、コラボレーションツール、ライブダッシュボードなど、リアルタイム性が求められるアプリケーション開発に最適です。

### 3つの主要機能

1. **Database Changes** - テーブルのINSERT/UPDATE/DELETEを購読
2. **Presence** - オンラインユーザーの状態管理
3. **Broadcast** - クライアント間のメッセージ送信

## セットアップ

### 1. Supabaseプロジェクト作成

```bash
# Supabase CLIインストール
npm install -g supabase

# ローカル開発環境起動
supabase init
supabase start
```

### 2. クライアントライブラリのインストール

```bash
npm install @supabase/supabase-js
```

### 3. クライアント初期化

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10, // レート制限
    },
  },
});
```

## Database Changes: データベース変更の購読

### 基本的な購読

```typescript
// テーブル全体の変更を購読
const channel = supabase
  .channel('public:messages')
  .on(
    'postgres_changes',
    {
      event: '*', // INSERT, UPDATE, DELETE, すべて
      schema: 'public',
      table: 'messages',
    },
    (payload) => {
      console.log('Change received!', payload);
    }
  )
  .subscribe();

// クリーンアップ
await supabase.removeChannel(channel);
```

### イベント別の処理

```typescript
// INSERT専用
supabase
  .channel('inserts')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
    },
    (payload) => {
      console.log('New message:', payload.new);
    }
  )
  .subscribe();

// UPDATE専用
supabase
  .channel('updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'messages',
    },
    (payload) => {
      console.log('Updated:', payload.old, '->', payload.new);
    }
  )
  .subscribe();

// DELETE専用
supabase
  .channel('deletes')
  .on(
    'postgres_changes',
    {
      event: 'DELETE',
      schema: 'public',
      table: 'messages',
    },
    (payload) => {
      console.log('Deleted:', payload.old);
    }
  )
  .subscribe();
```

### フィルター付き購読

```typescript
// 特定のユーザーのメッセージのみ購読
supabase
  .channel('user-messages')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'messages',
      filter: 'user_id=eq.123', // WHERE user_id = '123'
    },
    (payload) => {
      console.log('User message:', payload);
    }
  )
  .subscribe();
```

## Reactでの実装パターン

### カスタムフック: useRealtimeSubscription

```typescript
// hooks/use-realtime-subscription.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseRealtimeOptions<T> {
  table: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
}

export function useRealtimeSubscription<T>(
  options: UseRealtimeOptions<T>
) {
  const [data, setData] = useState<T[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    // 初期データ取得
    const fetchInitialData = async () => {
      let query = supabase.from(options.table).select('*');

      if (options.filter) {
        const [column, value] = options.filter.split('=eq.');
        query = query.eq(column, value);
      }

      const { data: initialData } = await query;
      if (initialData) {
        setData(initialData as T[]);
      }
    };

    fetchInitialData();

    // リアルタイム購読
    const newChannel = supabase
      .channel(`${options.table}-changes`)
      .on(
        'postgres_changes',
        {
          event: options.event || '*',
          schema: options.schema || 'public',
          table: options.table,
          filter: options.filter,
        },
        (payload: RealtimePostgresChangesPayload<T>) => {
          if (payload.eventType === 'INSERT') {
            setData((prev) => [...prev, payload.new as T]);
          } else if (payload.eventType === 'UPDATE') {
            setData((prev) =>
              prev.map((item: any) =>
                item.id === (payload.new as any).id ? (payload.new as T) : item
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setData((prev) =>
              prev.filter((item: any) => item.id !== (payload.old as any).id)
            );
          }
        }
      )
      .subscribe();

    setChannel(newChannel);

    return () => {
      if (newChannel) {
        supabase.removeChannel(newChannel);
      }
    };
  }, [options.table, options.filter, options.event, options.schema]);

  return { data, channel };
}
```

### チャットアプリの実装

```typescript
// components/chat-room.tsx
'use client';

import { useState } from 'react';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';
import { supabase } from '@/lib/supabase';

interface Message {
  id: string;
  content: string;
  user_id: string;
  room_id: string;
  created_at: string;
}

interface ChatRoomProps {
  roomId: string;
  userId: string;
}

export function ChatRoom({ roomId, userId }: ChatRoomProps) {
  const [message, setMessage] = useState('');

  const { data: messages } = useRealtimeSubscription<Message>({
    table: 'messages',
    filter: `room_id=eq.${roomId}`,
    event: '*',
  });

  const sendMessage = async () => {
    if (!message.trim()) return;

    await supabase.from('messages').insert({
      content: message,
      user_id: userId,
      room_id: roomId,
    });

    setMessage('');
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.user_id === userId ? 'justify-end' : 'justify-start'}`}
          >
            <div className="bg-blue-500 text-white rounded-lg px-4 py-2 max-w-md">
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          className="flex-1 border rounded px-3 py-2"
          placeholder="メッセージを入力..."
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
        >
          送信
        </button>
      </div>
    </div>
  );
}
```

## Presence: オンラインユーザー管理

### 基本的な実装

```typescript
// hooks/use-presence.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceState {
  user_id: string;
  username: string;
  online_at: string;
}

export function usePresence(roomId: string, currentUser: PresenceState) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceState[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    const presenceChannel = supabase.channel(`room:${roomId}`, {
      config: {
        presence: {
          key: currentUser.user_id,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState<PresenceState>();
        const users = Object.values(state).flat();
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('New user joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track(currentUser);
        }
      });

    setChannel(presenceChannel);

    return () => {
      if (presenceChannel) {
        presenceChannel.untrack();
        supabase.removeChannel(presenceChannel);
      }
    };
  }, [roomId, currentUser.user_id]);

  return { onlineUsers, channel };
}
```

### オンラインユーザー表示

```typescript
// components/online-users.tsx
'use client';

import { usePresence } from '@/hooks/use-presence';

interface OnlineUsersProps {
  roomId: string;
  currentUser: {
    user_id: string;
    username: string;
  };
}

export function OnlineUsers({ roomId, currentUser }: OnlineUsersProps) {
  const { onlineUsers } = usePresence(roomId, {
    ...currentUser,
    online_at: new Date().toISOString(),
  });

  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold mb-2">
        オンライン ({onlineUsers.length})
      </h3>
      <ul className="space-y-1">
        {onlineUsers.map((user) => (
          <li key={user.user_id} className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            <span>{user.username}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Broadcast: クライアント間メッセージング

### タイピングインジケーター

```typescript
// hooks/use-typing-indicator.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface TypingUser {
  user_id: string;
  username: string;
}

export function useTypingIndicator(roomId: string, currentUser: TypingUser) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    const broadcastChannel = supabase.channel(`typing:${roomId}`);

    broadcastChannel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const user = payload as TypingUser;

        setTypingUsers((prev) => {
          const exists = prev.some((u) => u.user_id === user.user_id);
          if (exists) return prev;
          return [...prev, user];
        });

        // 3秒後に自動削除
        setTimeout(() => {
          setTypingUsers((prev) =>
            prev.filter((u) => u.user_id !== user.user_id)
          );
        }, 3000);
      })
      .subscribe();

    setChannel(broadcastChannel);

    return () => {
      if (broadcastChannel) {
        supabase.removeChannel(broadcastChannel);
      }
    };
  }, [roomId]);

  const sendTyping = async () => {
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: currentUser,
      });
    }
  };

  return { typingUsers, sendTyping };
}

// 使用例
function ChatInput({ roomId, currentUser }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const { typingUsers, sendTyping } = useTypingIndicator(roomId, currentUser);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    sendTyping();
  };

  return (
    <div>
      <input value={message} onChange={handleChange} />
      {typingUsers.length > 0 && (
        <div className="text-sm text-gray-500">
          {typingUsers.map((u) => u.username).join(', ')} が入力中...
        </div>
      )}
    </div>
  );
}
```

### カーソル位置の同期(コラボレーション)

```typescript
// hooks/use-cursor-sync.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Cursor {
  user_id: string;
  username: string;
  x: number;
  y: number;
  color: string;
}

export function useCursorSync(roomId: string, currentUser: { user_id: string; username: string }) {
  const [cursors, setCursors] = useState<Map<string, Cursor>>(new Map());
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    const cursorChannel = supabase.channel(`cursors:${roomId}`);

    cursorChannel
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        const cursor = payload as Cursor;
        setCursors((prev) => new Map(prev).set(cursor.user_id, cursor));
      })
      .subscribe();

    setChannel(cursorChannel);

    return () => {
      if (cursorChannel) {
        supabase.removeChannel(cursorChannel);
      }
    };
  }, [roomId]);

  const updateCursor = async (x: number, y: number) => {
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'cursor',
        payload: {
          user_id: currentUser.user_id,
          username: currentUser.username,
          x,
          y,
          color: `hsl(${Math.random() * 360}, 70%, 50%)`,
        },
      });
    }
  };

  return { cursors: Array.from(cursors.values()), updateCursor };
}

// 使用例
function CollaborativeCanvas({ roomId, currentUser }: CanvasProps) {
  const { cursors, updateCursor } = useCursorSync(roomId, currentUser);

  const handleMouseMove = (e: React.MouseEvent) => {
    updateCursor(e.clientX, e.clientY);
  };

  return (
    <div onMouseMove={handleMouseMove} className="relative w-full h-screen">
      {cursors.map((cursor) => (
        <div
          key={cursor.user_id}
          className="absolute pointer-events-none"
          style={{
            left: cursor.x,
            top: cursor.y,
            backgroundColor: cursor.color,
          }}
        >
          <div className="w-4 h-4 rounded-full" />
          <span className="ml-2 text-xs">{cursor.username}</span>
        </div>
      ))}
    </div>
  );
}
```

## パフォーマンス最適化

### 1. チャンネルの再利用

```typescript
// ❌ 非効率: 複数のチャンネルを作成
const channel1 = supabase.channel('messages').on(...).subscribe();
const channel2 = supabase.channel('users').on(...).subscribe();

// ✅ 効率的: 1つのチャンネルで複数の購読
const channel = supabase
  .channel('room')
  .on('postgres_changes', { table: 'messages' }, handleMessages)
  .on('postgres_changes', { table: 'users' }, handleUsers)
  .on('broadcast', { event: 'typing' }, handleTyping)
  .on('presence', { event: 'sync' }, handlePresence)
  .subscribe();
```

### 2. デバウンス処理

```typescript
import { debounce } from 'lodash';

// タイピングインジケーターのデバウンス
const sendTyping = debounce(async () => {
  await channel.send({
    type: 'broadcast',
    event: 'typing',
    payload: currentUser,
  });
}, 300);
```

### 3. Row Level Security (RLS)

```sql
-- メッセージの購読制限
CREATE POLICY "Users can only subscribe to their rooms"
  ON messages
  FOR SELECT
  USING (
    room_id IN (
      SELECT room_id
      FROM room_members
      WHERE user_id = auth.uid()
    )
  );
```

## エラーハンドリング

```typescript
const channel = supabase
  .channel('room')
  .on('postgres_changes', { table: 'messages' }, (payload) => {
    try {
      handleMessage(payload);
    } catch (error) {
      console.error('Failed to handle message:', error);
    }
  })
  .subscribe((status, error) => {
    if (status === 'SUBSCRIBED') {
      console.log('Connected!');
    } else if (status === 'CHANNEL_ERROR') {
      console.error('Channel error:', error);
    } else if (status === 'TIMED_OUT') {
      console.error('Connection timed out');
      // 再接続ロジック
    }
  });
```

## まとめ

Supabase Realtimeを使うことで、WebSocketベースのリアルタイム機能を簡単に実装できます。Database Changes、Presence、Broadcastの3つの機能を組み合わせることで、チャット、コラボレーション、ライブダッシュボードなど、あらゆるリアルタイムアプリケーションを構築できます。

### 次のステップ

- Row Level Securityでセキュリティ強化
- Realtimeのスケーリング戦略を検討
- オフライン対応の実装(Optimistic UI)
- パフォーマンスモニタリングの導入
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)

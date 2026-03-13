---
title: 'LiveKit：リアルタイム音声・映像通信フレームワークガイド'
description: 'WebRTCベースのリアルタイム通信フレームワークLiveKitの完全ガイド。ルーム管理、音声・映像配信、画面共有、録画機能など、TypeScriptコード例とともに詳しく解説します。'
pubDate: '2026-02-06'
tags: ['WebRTC', 'LiveKit', 'リアルタイム通信', 'ビデオ会議', 'TypeScript']
heroImage: '../../assets/thumbnails/livekit-realtime-audio-video.jpg'
---
LiveKitは、WebRTCベースのオープンソースなリアルタイム音声・映像通信フレームワークです。この記事では、LiveKitの基本から実践的な活用法まで、コード例とともに詳しく解説します。

## LiveKitとは

LiveKitは、ビデオ会議、ライブ配信、リアルタイムコラボレーションなどのアプリケーションを構築するためのインフラストラクチャです。

### 主な特徴

- **スケーラブル** - 数千人規模のセッションに対応
- **低レイテンシ** - リアルタイム通信に最適化
- **オープンソース** - Apache 2.0ライセンス
- **マルチプラットフォーム** - Web、iOS、Android、Flutter、Unity対応
- **エンタープライズ対応** - E2E暗号化、録画、分析機能
- **自己ホスト可能** - セルフホスト版とクラウド版を選択可能

## セットアップ

### サーバーのセットアップ（Docker）

```bash
# LiveKitサーバーをDockerで起動
docker run -d \
  --name livekit \
  -p 7880:7880 \
  -p 7881:7881 \
  -p 7882:7882/udp \
  -v $PWD/livekit.yaml:/livekit.yaml \
  livekit/livekit-server \
  --config /livekit.yaml
```

### livekit.yaml設定ファイル

```yaml
port: 7880
rtc:
  port_range_start: 50000
  port_range_end: 60000
  use_external_ip: true

keys:
  APIxxxxxxxxxxx: SECRETxxxxxxxxxxxxxxxxxxxxxxxxx

room:
  auto_create: true
  empty_timeout: 300
  max_participants: 100

logging:
  level: info
```

### クライアント側のインストール

```bash
# React/Next.jsプロジェクト
npm install livekit-client @livekit/components-react

# TypeScript型定義も含まれています
```

## 基本的な使い方

### アクセストークンの生成

LiveKitに接続するには、サーバー側でアクセストークンを生成する必要があります。

```typescript
// app/api/token/route.ts (Next.js)
import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const roomName = req.nextUrl.searchParams.get('room');
  const participantName = req.nextUrl.searchParams.get('username');

  if (!roomName || !participantName) {
    return NextResponse.json(
      { error: 'Missing room or username' },
      { status: 400 }
    );
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
  });

  // ルームへの参加権限を付与
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  const token = await at.toJwt();
  return NextResponse.json({ token });
}
```

### 環境変数の設定

```bash
# .env.local
LIVEKIT_API_KEY=APIxxxxxxxxxxx
LIVEKIT_API_SECRET=SECRETxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
```

## ビデオ会議アプリの実装

### LiveKitルームコンポーネント

```typescript
// components/VideoCall.tsx
'use client';

import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import { useEffect, useState } from 'react';

interface VideoCallProps {
  roomName: string;
  userName: string;
}

export default function VideoCall({ roomName, userName }: VideoCallProps) {
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    const getToken = async () => {
      const response = await fetch(
        `/api/token?room=${roomName}&username=${userName}`
      );
      const data = await response.json();
      setToken(data.token);
    };

    getToken();
  }, [roomName, userName]);

  if (!token) {
    return <div>Loading...</div>;
  }

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      data-lk-theme="default"
      style={{ height: '100vh' }}
    >
      {/* VideoConferenceコンポーネントで基本的なUIを提供 */}
      <VideoConference />
    </LiveKitRoom>
  );
}
```

### カスタムUIの構築

```typescript
// components/CustomVideoRoom.tsx
'use client';

import {
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useTracks,
  ParticipantTile,
  ControlBar,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';

function ParticipantList() {
  const participants = useParticipants();
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);

  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      {tracks.map((track) => (
        <ParticipantTile
          key={track.participant.identity}
          participant={track.participant}
          source={track.source}
        />
      ))}
    </div>
  );
}

export default function CustomVideoRoom({ token, serverUrl }: Props) {
  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={serverUrl}
      className="h-screen flex flex-col"
    >
      {/* 音声のレンダリング */}
      <RoomAudioRenderer />

      {/* ビデオグリッド */}
      <div className="flex-1 overflow-auto">
        <ParticipantList />
      </div>

      {/* コントロールバー（ミュート、カメラON/OFF等） */}
      <ControlBar />
    </LiveKitRoom>
  );
}
```

## 画面共有の実装

```typescript
// hooks/useScreenShare.ts
import { useLocalParticipant } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useState } from 'react';

export function useScreenShare() {
  const { localParticipant } = useLocalParticipant();
  const [isSharing, setIsSharing] = useState(false);

  const toggleScreenShare = async () => {
    if (!localParticipant) return;

    try {
      if (isSharing) {
        // 画面共有を停止
        await localParticipant.setScreenShareEnabled(false);
        setIsSharing(false);
      } else {
        // 画面共有を開始
        await localParticipant.setScreenShareEnabled(true);
        setIsSharing(true);
      }
    } catch (error) {
      console.error('Screen share error:', error);
    }
  };

  return { isSharing, toggleScreenShare };
}
```

### 画面共有ボタンコンポーネント

```typescript
// components/ScreenShareButton.tsx
'use client';

import { useScreenShare } from '@/hooks/useScreenShare';

export default function ScreenShareButton() {
  const { isSharing, toggleScreenShare } = useScreenShare();

  return (
    <button
      onClick={toggleScreenShare}
      className={`px-4 py-2 rounded ${
        isSharing ? 'bg-red-500' : 'bg-blue-500'
      } text-white`}
    >
      {isSharing ? '画面共有を停止' : '画面を共有'}
    </button>
  );
}
```

## 録画機能

LiveKitは録画機能（Egress）を提供しています。

### サーバー側で録画開始

```typescript
// app/api/recording/start/route.ts
import { EgressClient, RoomCompositeEgressRequest } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { roomName } = await req.json();

  const egressClient = new EgressClient(
    process.env.LIVEKIT_URL!,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );

  const output = {
    filepath: `/recordings/${roomName}-${Date.now()}.mp4`,
  };

  const request: RoomCompositeEgressRequest = {
    roomName,
    layout: 'grid',
    audioOnly: false,
    videoOnly: false,
    file: output,
  };

  try {
    const egress = await egressClient.startRoomCompositeEgress(request);
    return NextResponse.json({ egressId: egress.egressId });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to start recording' },
      { status: 500 }
    );
  }
}
```

### 録画停止

```typescript
// app/api/recording/stop/route.ts
import { EgressClient } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { egressId } = await req.json();

  const egressClient = new EgressClient(
    process.env.LIVEKIT_URL!,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );

  try {
    await egressClient.stopEgress(egressId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to stop recording' },
      { status: 500 }
    );
  }
}
```

## ルーム管理

### ルーム一覧の取得

```typescript
// app/api/rooms/route.ts
import { RoomServiceClient } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';

export async function GET() {
  const roomService = new RoomServiceClient(
    process.env.LIVEKIT_URL!,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );

  try {
    const rooms = await roomService.listRooms();
    return NextResponse.json({ rooms });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch rooms' },
      { status: 500 }
    );
  }
}
```

### 参加者の管理

```typescript
// 参加者の削除
const removeParticipant = async (roomName: string, identity: string) => {
  const roomService = new RoomServiceClient(
    process.env.LIVEKIT_URL!,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );

  await roomService.removeParticipant(roomName, identity);
};

// 参加者のミュート
const muteParticipant = async (roomName: string, identity: string) => {
  const roomService = new RoomServiceClient(
    process.env.LIVEKIT_URL!,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );

  await roomService.mutePublishedTrack(roomName, identity, 'audio');
};
```

## データメッセージの送信

```typescript
// components/ChatInRoom.tsx
'use client';

import { useLocalParticipant, useDataChannel } from '@livekit/components-react';
import { useState } from 'react';

export default function ChatInRoom() {
  const { localParticipant } = useLocalParticipant();
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');

  // データチャネルでメッセージを受信
  useDataChannel((message) => {
    const decoder = new TextDecoder();
    const text = decoder.decode(message.payload);
    setMessages((prev) => [...prev, `${message.from?.identity}: ${text}`]);
  });

  const sendMessage = () => {
    if (!localParticipant || !input) return;

    const encoder = new TextEncoder();
    const data = encoder.encode(input);

    localParticipant.publishData(data, { reliable: true });
    setInput('');
  };

  return (
    <div className="p-4">
      <div className="h-64 overflow-y-auto border p-2 mb-2">
        {messages.map((msg, i) => (
          <div key={i}>{msg}</div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          className="flex-1 border px-2 py-1"
          placeholder="メッセージを入力"
        />
        <button onClick={sendMessage} className="px-4 py-1 bg-blue-500 text-white">
          送信
        </button>
      </div>
    </div>
  );
}
```

## WebHookの活用

LiveKitはルームイベントをWebHookで通知できます。

```typescript
// app/api/webhook/livekit/route.ts
import { WebhookReceiver } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const receiver = new WebhookReceiver(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );

  const body = await req.text();
  const authHeader = req.headers.get('Authorization');

  try {
    const event = receiver.receive(body, authHeader!);

    // イベントタイプに応じて処理
    switch (event.event) {
      case 'room_started':
        console.log('Room started:', event.room);
        break;
      case 'room_finished':
        console.log('Room finished:', event.room);
        break;
      case 'participant_joined':
        console.log('Participant joined:', event.participant);
        break;
      case 'participant_left':
        console.log('Participant left:', event.participant);
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 });
  }
}
```

## デプロイ時の注意点

### HTTPS/WSS必須

本番環境ではHTTPS/WSSが必須です。

```bash
# Vercel等にデプロイする場合
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-server.com
```

### ファイアウォール設定

LiveKitは以下のポートを使用します。

- **7880** - HTTP/WebSocket
- **7881** - TURN/STUN over TCP
- **50000-60000** - WebRTC メディア（UDP）

### プロダクション向け設定

```yaml
# livekit.yaml (本番環境)
port: 7880
rtc:
  port_range_start: 50000
  port_range_end: 60000
  use_external_ip: true
  ice_servers:
    - urls:
        - stun:stun.l.google.com:19302

turn:
  enabled: true
  domain: turn.yourdomain.com
  tls_port: 5349
  udp_port: 3478

logging:
  level: warn

# 録画用ストレージ
egress:
  s3:
    access_key: YOUR_ACCESS_KEY
    secret: YOUR_SECRET
    region: us-east-1
    bucket: your-bucket
```

## まとめ

LiveKitの主な機能をまとめます。

- **簡単なセットアップ** - Dockerで即座に起動可能
- **リアルタイム通信** - WebRTCベースの低レイテンシ通信
- **画面共有** - ワンクリックで画面共有が可能
- **録画機能** - Egressでルーム全体を録画
- **ルーム管理** - APIで参加者やルームを管理
- **データチャネル** - チャット等のテキスト通信
- **WebHook** - イベント駆動の処理

LiveKitを使えば、ZoomやGoogle Meetのようなビデオ会議アプリを短時間で構築できます。セルフホスト版なら完全に自社管理できるため、エンタープライズ用途にも最適です。

リアルタイム通信が必要なアプリケーションを開発するなら、LiveKitは最有力の選択肢です。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)

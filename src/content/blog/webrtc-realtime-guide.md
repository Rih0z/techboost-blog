---
title: 'WebRTC完全ガイド：ブラウザでリアルタイム通信を実現する'
description: 'WebRTCの仕組みから実装まで徹底解説。ビデオ通話・音声通話・データチャネル・シグナリング・STUN/TURN・Simple-peer・メディアサーバーまで実践的に学ぶ'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-3.jpg'
tags: ['WebRTC', 'リアルタイム', 'Frontend']
---

WebRTCは、ブラウザとモバイルアプリがプラグインなしにリアルタイムのオーディオ・ビデオ・データ通信を行えるようにするオープンな標準技術である。Google Meetのようなビデオ会議ツールから、Discord、さらにはP2Pファイル転送アプリまで、現代のリアルタイムWeb通信のほぼすべてがWebRTCを基盤としている。

本記事では、WebRTCの基本概念から始まり、シグナリングサーバーの実装、ビデオ通話アプリの完全な構築、データチャネルによるファイル転送、SFUサーバーを使ったスケーリングまで、実際のコードとともに体系的に解説する。

## 目次

1. WebRTCとは・主なユースケース
2. WebRTCの仕組み：SDP・ICE・STUN/TURN
3. シグナリングサーバーの実装（WebSocket）
4. ローカルメディアストリームの取得（getUserMedia）
5. RTCPeerConnectionの基本実装
6. ビデオ通話アプリの完全実装例
7. データチャネル：テキストチャットとファイル転送
8. Simple-peerライブラリの活用
9. mediasoupによるSFUサーバー構築
10. WebRTCクラウドサービス比較
11. モバイル対応：React Native WebRTC
12. セキュリティ：DTLS・SRTP
13. デバッグ方法
14. 本番環境でのスケーリング戦略

---

## 1. WebRTCとは・主なユースケース

### WebRTCの定義と歴史

WebRTC（Web Real-Time Communication）は、2011年にGoogleがオープンソース化し、W3CおよびIETFが標準化を進めたブラウザ向けリアルタイム通信技術である。それ以前のビデオ会議は、Adobe FlashやMicrosoft Silverlightなどのプラグインに依存しており、インストール・更新・セキュリティリスクといった問題を抱えていた。

WebRTCはこれらの課題を解決し、JavaScriptのAPIだけで次の機能を実現する。

- リアルタイムのオーディオ・ビデオ通信
- 低遅延のP2Pデータ転送
- ネットワークトラバーサル（NATやファイアウォールを越えた通信）
- メディアのエンコード・デコード（VP8/VP9/H.264/AV1、Opus/AAC）

2023年時点で、Chrome、Firefox、Safari、Edge、Operaのすべての主要ブラウザがWebRTCをサポートしている。

### 主なユースケース

**ビデオ会議・音声通話**

Google Meet、Zoom（ブラウザ版）、Jitsi MeetはすべてWebRTCを使用している。特にJitsi Meetは完全にオープンソースであり、WebRTCの実装例として参照される機会が多い。

**ライブストリーミング**

低遅延が求められるライブ配信でもWebRTCが活用される。従来のHLS（HTTP Live Streaming）は10〜30秒の遅延があるのに対し、WebRTCは100〜500ミリ秒の超低遅延を実現できる。

**P2Pファイル転送**

ShareDrop、Snapdropなどのサービスは、サーバーを経由せずにブラウザ間で直接ファイルを転送する。大容量ファイルを扱う場合でもサーバーのストレージコストが不要になる。

**オンラインゲーム**

リアルタイムのゲームプレイにはWebRTCのデータチャネルが使われる。UDPベースの通信により、TCPより低遅延でのデータ送受信が可能である。

**IoTとスクリーン共有**

デスクトップのリモート操作、スクリーン共有、工場のカメラ映像のリアルタイムモニタリングにもWebRTCが応用されている。

---

## 2. WebRTCの仕組み：SDP・ICE・STUN/TURN

WebRTCのP2P接続確立は複雑なプロセスを経る。主要な構成要素を順に理解していこう。

### SDP（Session Description Protocol）

SDPは、メディアセッションの内容を記述するテキストフォーマットである。WebRTCでは、接続の「オファー」と「アンサー」という形でやり取りされる。

SDPには以下の情報が含まれる。

- 使用するコーデック（VP8、H.264、Opus等）
- ネットワークアドレス候補（ICE Candidate）
- 暗号化のフィンガープリント
- 帯域幅の制限

実際のSDPテキストの例を示す。

```
v=0
o=- 4611732601042881039 2 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE 0 1
m=audio 9 UDP/TLS/RTP/SAVPF 111 103 104 9 0 8 126
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:KkUH
a=ice-pwd:3+a6FBBIPFkk+JRmA5fJEJhQ
a=fingerprint:sha-256 49:66:12:17:0D:1C:91...
a=rtpmap:111 opus/48000/2
a=rtpmap:103 ISAC/16000
m=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101 102
a=rtpmap:96 VP8/90000
a=rtpmap:97 rtx/90000
a=rtpmap:98 VP9/90000
```

### ICE（Interactive Connectivity Establishment）

ICEは、二つのピア間での最適なネットワーク経路を見つけるフレームワークである。直接接続からリレーサーバー経由の接続まで、複数の候補（ICE Candidate）を列挙し、最も効率的な経路を選択する。

ICE Candidateには三種類ある。

1. **ホスト候補**: デバイスのローカルIPアドレス（同一LAN内の通信に使用）
2. **サーバーリフレクティブ候補**: STUNサーバーで取得したグローバルIPアドレス
3. **リレー候補**: TURNサーバーを経由した中継アドレス

ICEエージェントは全候補を収集し、相手のエージェントと「接続性チェック」を実施して最適な経路を確定させる。

### STUN（Session Traversal Utilities for NAT）

多くのデバイスはNAT（Network Address Translation）の背後にあるため、グローバルIPアドレスを直接知ることができない。STUNサーバーを使うと、自分のグローバルIPアドレスとポート番号を知ることができる。

```
クライアント -> STUNサーバー: "私のグローバルIPを教えてください"
STUNサーバー -> クライアント: "あなたのIPは203.0.113.10:54321です"
```

Googleが公開しているSTUNサーバー（stun.l.google.com:19302）が広く利用されている。

### TURN（Traversal Using Relays around NAT）

対称型NATや厳格なファイアウォールの環境では、STUNだけでは直接通信できない場合がある。TURNサーバーはリレーとして機能し、すべてのメディアデータを中継する。

TURNを使うと通信の遅延が増加し、サーバーの帯域幅コストも発生する。そのため、最終手段として使用されることが多い。

```
ピアA <-> TURNサーバー <-> ピアB
```

WebRTCの接続成功率を高めるためには、TURNサーバーの配置が重要である。本番環境ではcoTURNなどのオープンソース実装を自前で運用するか、Twilio NTS、Metered.caなどのサービスを利用することが多い。

### シグナリングプロセスの全体像

WebRTCの接続確立プロセスを時系列で整理する。

```
ピアA                  シグナリングサーバー               ピアB
  |                          |                              |
  |-- WebSocketで接続 ------->|                              |
  |                          |<------ WebSocketで接続 -------|
  |                          |                              |
  | (ローカルメディア取得)     |       (ローカルメディア取得)    |
  |                          |                              |
  |-- SDPオファー送信 -------->|                              |
  |                          |------ SDPオファー転送 -------->|
  |                          |                              |
  |                          |<----- SDPアンサー送信 --------|
  |<-- SDPアンサー転送 --------|                              |
  |                          |                              |
  |-- ICE Candidate送信 ----->|                              |
  |                          |--- ICE Candidate転送 -------->|
  |                          |                              |
  |                          |<-- ICE Candidate送信 ---------|
  |<-- ICE Candidate転送 -----|                              |
  |                          |                              |
  |<====================== P2P接続確立 =====================>|
  |                          |                              |
  |<============= リアルタイム通信（音声・映像・データ）======>|
```

---

## 3. シグナリングサーバーの実装（WebSocket）

WebRTC自体はシグナリングプロトコルを規定していない。SDPやICE Candidateをどのように交換するかは開発者が決める。WebSocketが最もよく使われるが、HTTP長ポーリング、Server-Sent Events、さらにはSMS（特殊なケース）でも実現できる。

### Node.js + WebSocketによるシグナリングサーバー

```typescript
// server/signaling-server.ts
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

interface Client {
  id: string;
  ws: WebSocket;
  roomId: string | null;
}

interface SignalingMessage {
  type: 'join' | 'offer' | 'answer' | 'ice-candidate' | 'leave' | 'error';
  roomId?: string;
  targetId?: string;
  senderId?: string;
  payload?: unknown;
}

const clients = new Map<string, Client>();
const rooms = new Map<string, Set<string>>();

const httpServer = createServer();
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws: WebSocket) => {
  const clientId = uuidv4();
  const client: Client = { id: clientId, ws, roomId: null };
  clients.set(clientId, client);

  console.log(`クライアント接続: ${clientId}`);

  // 接続確認メッセージを送信
  sendToClient(ws, {
    type: 'connected',
    payload: { clientId },
  });

  ws.on('message', (data: Buffer) => {
    try {
      const message: SignalingMessage = JSON.parse(data.toString());
      handleMessage(clientId, message);
    } catch (error) {
      console.error('メッセージ解析エラー:', error);
      sendToClient(ws, { type: 'error', payload: { message: '無効なメッセージ形式' } });
    }
  });

  ws.on('close', () => {
    handleClientDisconnect(clientId);
  });

  ws.on('error', (error) => {
    console.error(`クライアントエラー ${clientId}:`, error);
  });
});

function handleMessage(clientId: string, message: SignalingMessage): void {
  const client = clients.get(clientId);
  if (!client) return;

  switch (message.type) {
    case 'join':
      handleJoin(clientId, message.roomId!);
      break;
    case 'offer':
    case 'answer':
    case 'ice-candidate':
      forwardMessage(clientId, message);
      break;
    case 'leave':
      handleLeave(clientId);
      break;
    default:
      console.warn(`未知のメッセージタイプ: ${message.type}`);
  }
}

function handleJoin(clientId: string, roomId: string): void {
  const client = clients.get(clientId)!;

  // 既存のルームから退出
  if (client.roomId) {
    handleLeave(clientId);
  }

  client.roomId = roomId;

  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }

  const room = rooms.get(roomId)!;
  const existingPeers = Array.from(room);

  // 既存のピアのIDを新しいクライアントに通知
  sendToClient(client.ws, {
    type: 'room-joined',
    payload: {
      roomId,
      peers: existingPeers,
    },
  });

  // 既存のピアに新しいクライアントの参加を通知
  existingPeers.forEach((peerId) => {
    const peer = clients.get(peerId);
    if (peer) {
      sendToClient(peer.ws, {
        type: 'peer-joined',
        payload: { peerId: clientId },
      });
    }
  });

  room.add(clientId);
  console.log(`ルーム ${roomId} に参加: ${clientId}（現在の参加者数: ${room.size}）`);
}

function handleLeave(clientId: string): void {
  const client = clients.get(clientId);
  if (!client || !client.roomId) return;

  const room = rooms.get(client.roomId);
  if (room) {
    room.delete(clientId);

    // 残りのピアに退出を通知
    room.forEach((peerId) => {
      const peer = clients.get(peerId);
      if (peer) {
        sendToClient(peer.ws, {
          type: 'peer-left',
          payload: { peerId: clientId },
        });
      }
    });

    if (room.size === 0) {
      rooms.delete(client.roomId);
    }
  }

  client.roomId = null;
}

function forwardMessage(senderId: string, message: SignalingMessage): void {
  const sender = clients.get(senderId);
  if (!sender || !sender.roomId) return;

  const messageWithSender = {
    ...message,
    senderId,
  };

  if (message.targetId) {
    // 特定のピアに転送
    const target = clients.get(message.targetId);
    if (target) {
      sendToClient(target.ws, messageWithSender);
    }
  } else {
    // ルーム内の全員に転送（送信者を除く）
    const room = rooms.get(sender.roomId);
    if (room) {
      room.forEach((peerId) => {
        if (peerId !== senderId) {
          const peer = clients.get(peerId);
          if (peer) {
            sendToClient(peer.ws, messageWithSender);
          }
        }
      });
    }
  }
}

function handleClientDisconnect(clientId: string): void {
  handleLeave(clientId);
  clients.delete(clientId);
  console.log(`クライアント切断: ${clientId}`);
}

function sendToClient(ws: WebSocket, message: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
  console.log(`シグナリングサーバー起動: ws://localhost:${PORT}`);
});
```

### Socket.ioを使ったより堅牢なシグナリングサーバー

Socket.ioはWebSocketの上位互換ライブラリで、自動再接続、名前空間、部屋管理などの機能が組み込まれている。

```typescript
// server/socket-signaling.ts
import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

interface RoomUser {
  socketId: string;
  userId: string;
}

const roomUsers = new Map<string, RoomUser[]>();

io.on('connection', (socket: Socket) => {
  console.log(`接続: ${socket.id}`);

  socket.on('join-room', ({ roomId, userId }: { roomId: string; userId: string }) => {
    socket.join(roomId);

    const users = roomUsers.get(roomId) || [];
    const otherUsers = users.filter((u) => u.socketId !== socket.id);

    // 既存ユーザーを新しい参加者に通知
    socket.emit('existing-users', { users: otherUsers });

    // 新しい参加者を既存ユーザーに通知
    socket.to(roomId).emit('user-joined', { userId, socketId: socket.id });

    users.push({ socketId: socket.id, userId });
    roomUsers.set(roomId, users);

    console.log(`ルーム ${roomId}: ${userId} が参加（計 ${users.length} 名）`);
  });

  socket.on(
    'offer',
    ({ targetSocketId, sdp }: { targetSocketId: string; sdp: RTCSessionDescriptionInit }) => {
      io.to(targetSocketId).emit('offer', {
        sdp,
        senderSocketId: socket.id,
      });
    }
  );

  socket.on(
    'answer',
    ({ targetSocketId, sdp }: { targetSocketId: string; sdp: RTCSessionDescriptionInit }) => {
      io.to(targetSocketId).emit('answer', {
        sdp,
        senderSocketId: socket.id,
      });
    }
  );

  socket.on(
    'ice-candidate',
    ({ targetSocketId, candidate }: { targetSocketId: string; candidate: RTCIceCandidateInit }) => {
      io.to(targetSocketId).emit('ice-candidate', {
        candidate,
        senderSocketId: socket.id,
      });
    }
  );

  socket.on('disconnecting', () => {
    socket.rooms.forEach((roomId) => {
      if (roomId !== socket.id) {
        socket.to(roomId).emit('user-left', { socketId: socket.id });

        const users = roomUsers.get(roomId) || [];
        const updatedUsers = users.filter((u) => u.socketId !== socket.id);
        if (updatedUsers.length === 0) {
          roomUsers.delete(roomId);
        } else {
          roomUsers.set(roomId, updatedUsers);
        }
      }
    });
  });
});

const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
  console.log(`Socket.ioシグナリングサーバー: http://localhost:${PORT}`);
});
```

---

## 4. ローカルメディアストリームの取得（getUserMedia）

WebRTCでメディアを送受信するには、まずデバイスのカメラとマイクにアクセスする必要がある。`navigator.mediaDevices.getUserMedia()`がこの役割を担う。

### 基本的な使い方

```typescript
// utils/media.ts

interface MediaConstraints {
  video?:
    | boolean
    | {
        width?: { min?: number; ideal?: number; max?: number };
        height?: { min?: number; ideal?: number; max?: number };
        frameRate?: { min?: number; ideal?: number; max?: number };
        facingMode?: 'user' | 'environment';
        deviceId?: string;
      };
  audio?:
    | boolean
    | {
        echoCancellation?: boolean;
        noiseSuppression?: boolean;
        autoGainControl?: boolean;
        sampleRate?: number;
        deviceId?: string;
      };
}

export async function getLocalStream(constraints: MediaConstraints): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return stream;
  } catch (error) {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
          throw new Error('カメラ・マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。');
        case 'NotFoundError':
          throw new Error('カメラまたはマイクが見つかりません。デバイスを確認してください。');
        case 'NotReadableError':
          throw new Error('カメラまたはマイクが別のアプリで使用中です。');
        case 'OverconstrainedError':
          throw new Error('指定した制約条件に対応するデバイスが見つかりません。');
        default:
          throw new Error(`メディアデバイスエラー: ${error.message}`);
      }
    }
    throw error;
  }
}

// HD品質のビデオと音声を取得
export async function getHDStream(): Promise<MediaStream> {
  return getLocalStream({
    video: {
      width: { min: 640, ideal: 1280, max: 1920 },
      height: { min: 480, ideal: 720, max: 1080 },
      frameRate: { min: 24, ideal: 30, max: 60 },
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
}

// 音声のみのストリームを取得
export async function getAudioOnlyStream(): Promise<MediaStream> {
  return getLocalStream({
    video: false,
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
    },
  });
}

// スクリーン共有ストリームを取得
export async function getScreenShareStream(): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: 'always',
        displaySurface: 'monitor',
      },
      audio: true,
    });
    return stream;
  } catch (error) {
    throw new Error('スクリーン共有の取得に失敗しました。');
  }
}

// 利用可能なデバイス一覧を取得
export async function getAvailableDevices(): Promise<{
  cameras: MediaDeviceInfo[];
  microphones: MediaDeviceInfo[];
  speakers: MediaDeviceInfo[];
}> {
  const devices = await navigator.mediaDevices.enumerateDevices();

  return {
    cameras: devices.filter((d) => d.kind === 'videoinput'),
    microphones: devices.filter((d) => d.kind === 'audioinput'),
    speakers: devices.filter((d) => d.kind === 'audiooutput'),
  };
}

// ストリームの停止
export function stopStream(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop());
}

// 特定のトラックのミュート制御
export function toggleAudioMute(stream: MediaStream): boolean {
  const audioTrack = stream.getAudioTracks()[0];
  if (audioTrack) {
    audioTrack.enabled = !audioTrack.enabled;
    return !audioTrack.enabled; // true = ミュート中
  }
  return false;
}

export function toggleVideoMute(stream: MediaStream): boolean {
  const videoTrack = stream.getVideoTracks()[0];
  if (videoTrack) {
    videoTrack.enabled = !videoTrack.enabled;
    return !videoTrack.enabled; // true = カメラオフ
  }
  return false;
}
```

### デバイス選択UIの実装

```typescript
// components/DeviceSelector.tsx
import { useState, useEffect } from 'react';

interface DeviceOption {
  deviceId: string;
  label: string;
}

interface DeviceSelectorProps {
  onDeviceChange: (cameraId: string, micId: string) => void;
}

export function DeviceSelector({ onDeviceChange }: DeviceSelectorProps) {
  const [cameras, setCameras] = useState<DeviceOption[]>([]);
  const [microphones, setMicrophones] = useState<DeviceOption[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedMic, setSelectedMic] = useState<string>('');

  useEffect(() => {
    async function loadDevices() {
      // デバイスラベルを取得するには先にパーミッションが必要
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const devices = await navigator.mediaDevices.enumerateDevices();

      const cameraList = devices
        .filter((d) => d.kind === 'videoinput')
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `カメラ ${d.deviceId.slice(0, 8)}`,
        }));

      const micList = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `マイク ${d.deviceId.slice(0, 8)}`,
        }));

      setCameras(cameraList);
      setMicrophones(micList);

      if (cameraList[0]) setSelectedCamera(cameraList[0].deviceId);
      if (micList[0]) setSelectedMic(micList[0].deviceId);
    }

    loadDevices();

    // デバイスの追加・削除を監視
    navigator.mediaDevices.addEventListener('devicechange', loadDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
    };
  }, []);

  useEffect(() => {
    if (selectedCamera && selectedMic) {
      onDeviceChange(selectedCamera, selectedMic);
    }
  }, [selectedCamera, selectedMic]);

  return (
    <div className="device-selector">
      <div>
        <label htmlFor="camera-select">カメラ</label>
        <select
          id="camera-select"
          value={selectedCamera}
          onChange={(e) => setSelectedCamera(e.target.value)}
        >
          {cameras.map((cam) => (
            <option key={cam.deviceId} value={cam.deviceId}>
              {cam.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="mic-select">マイク</label>
        <select
          id="mic-select"
          value={selectedMic}
          onChange={(e) => setSelectedMic(e.target.value)}
        >
          {microphones.map((mic) => (
            <option key={mic.deviceId} value={mic.deviceId}>
              {mic.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
```

---

## 5. RTCPeerConnectionの基本実装

`RTCPeerConnection`はWebRTCの中核となるAPIである。P2P接続の確立、メディアトラックの送受信、ICE Candidateの処理など、すべての重要な処理を担う。

### RTCPeerConnectionのラッパークラス

```typescript
// lib/peer-connection.ts

interface PeerConnectionConfig {
  onRemoteStream?: (stream: MediaStream) => void;
  onIceCandidate?: (candidate: RTCIceCandidateInit) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onDataChannel?: (channel: RTCDataChannel) => void;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: 'turn:your-turn-server.example.com:3478',
    username: 'webrtcuser',
    credential: 'webrtcpassword',
  },
];

export class WebRTCPeerConnection {
  private pc: RTCPeerConnection;
  private localStream: MediaStream | null = null;
  private config: PeerConnectionConfig;

  constructor(config: PeerConnectionConfig) {
    this.config = config;
    this.pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceTransportPolicy: 'all', // 'relay'にするとTURNのみ使用
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // リモートのICE Candidateを受信
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.config.onIceCandidate?.(event.candidate.toJSON());
      }
    };

    // ICE接続状態の変化を監視
    this.pc.oniceconnectionstatechange = () => {
      console.log('ICE接続状態:', this.pc.iceConnectionState);
      if (this.pc.iceConnectionState === 'failed') {
        // ICE restartを試みる
        this.restartIce();
      }
    };

    // 接続全体の状態変化
    this.pc.onconnectionstatechange = () => {
      console.log('接続状態:', this.pc.connectionState);
      this.config.onConnectionStateChange?.(this.pc.connectionState);
    };

    // リモートトラックの受信
    this.pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        this.config.onRemoteStream?.(remoteStream);
      }
    };

    // データチャネルの受信（answer側）
    this.pc.ondatachannel = (event) => {
      this.config.onDataChannel?.(event.channel);
    };

    // シグナリング状態の変化（デバッグ用）
    this.pc.onsignalingstatechange = () => {
      console.log('シグナリング状態:', this.pc.signalingState);
    };

    // ICE gathering状態の変化
    this.pc.onicegatheringstatechange = () => {
      console.log('ICE収集状態:', this.pc.iceGatheringState);
    };
  }

  // ローカルメディアストリームを設定
  addLocalStream(stream: MediaStream): void {
    this.localStream = stream;
    stream.getTracks().forEach((track) => {
      this.pc.addTrack(track, stream);
    });
  }

  // ローカルトラックを差し替え（カメラ切り替え等）
  async replaceTrack(newTrack: MediaStreamTrack): Promise<void> {
    const sender = this.pc
      .getSenders()
      .find((s) => s.track?.kind === newTrack.kind);
    if (sender) {
      await sender.replaceTrack(newTrack);
    }
  }

  // SDPオファーを作成
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  // SDPアンサーを作成
  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  // リモートSDPを設定
  async setRemoteDescription(sdp: RTCSessionDescriptionInit): Promise<void> {
    await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
  }

  // ICE Candidateを追加
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (this.pc.remoteDescription) {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  // データチャネルを作成（offer側）
  createDataChannel(label: string, options?: RTCDataChannelInit): RTCDataChannel {
    return this.pc.createDataChannel(label, {
      ordered: true, // 順序保証（TCPライク）
      ...options,
    });
  }

  // 帯域幅を制限（ビットレート制御）
  async setBandwidth(videoKbps: number, audioKbps: number): Promise<void> {
    const senders = this.pc.getSenders();
    for (const sender of senders) {
      if (!sender.track) continue;
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      if (sender.track.kind === 'video') {
        params.encodings[0].maxBitrate = videoKbps * 1000;
      } else if (sender.track.kind === 'audio') {
        params.encodings[0].maxBitrate = audioKbps * 1000;
      }
      await sender.setParameters(params);
    }
  }

  // 接続統計情報を取得
  async getStats(): Promise<RTCStatsReport> {
    return this.pc.getStats();
  }

  // ICEの再起動
  private async restartIce(): Promise<void> {
    console.log('ICE restartを実行中...');
    this.pc.restartIce();
  }

  // 接続を閉じる
  close(): void {
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.pc.close();
  }

  get connectionState(): RTCPeerConnectionState {
    return this.pc.connectionState;
  }

  get signalingState(): RTCSignalingState {
    return this.pc.signalingState;
  }
}
```

---

## 6. ビデオ通話アプリの完全実装例

ここまでの要素を組み合わせ、Reactでビデオ通話アプリを実装する。

### カスタムフック: useWebRTC

```typescript
// hooks/useWebRTC.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { WebRTCPeerConnection } from '../lib/peer-connection';

interface Peer {
  socketId: string;
  connection: WebRTCPeerConnection;
  stream: MediaStream | null;
}

interface UseWebRTCOptions {
  roomId: string;
  userId: string;
  serverUrl: string;
}

interface UseWebRTCReturn {
  localStream: MediaStream | null;
  peers: Map<string, Peer>;
  isConnected: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  join: () => Promise<void>;
  leave: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  shareScreen: () => Promise<void>;
}

export function useWebRTC({
  roomId,
  userId,
  serverUrl,
}: UseWebRTCOptions): UseWebRTCReturn {
  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Map<string, Peer>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  const createPeerConnection = useCallback(
    (targetSocketId: string): WebRTCPeerConnection => {
      const peer = new WebRTCPeerConnection({
        onRemoteStream: (stream) => {
          setPeers((prev) => {
            const next = new Map(prev);
            const existing = next.get(targetSocketId);
            if (existing) {
              next.set(targetSocketId, { ...existing, stream });
            }
            return next;
          });
        },
        onIceCandidate: (candidate) => {
          socketRef.current?.emit('ice-candidate', {
            targetSocketId,
            candidate,
          });
        },
        onConnectionStateChange: (state) => {
          console.log(`ピア ${targetSocketId} 接続状態: ${state}`);
          if (state === 'disconnected' || state === 'failed' || state === 'closed') {
            removePeer(targetSocketId);
          }
        },
      });

      if (localStreamRef.current) {
        peer.addLocalStream(localStreamRef.current);
      }

      return peer;
    },
    []
  );

  const removePeer = useCallback((socketId: string) => {
    setPeers((prev) => {
      const next = new Map(prev);
      const peer = next.get(socketId);
      if (peer) {
        peer.connection.close();
        next.delete(socketId);
      }
      return next;
    });
  }, []);

  const join = useCallback(async () => {
    // ローカルストリームを取得
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    localStreamRef.current = stream;
    setLocalStream(stream);

    // WebSocketサーバーに接続
    const socket = io(serverUrl, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join-room', { roomId, userId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // 既存ユーザーへのオファー送信
    socket.on('existing-users', async ({ users }: { users: { socketId: string }[] }) => {
      for (const { socketId } of users) {
        const peer = createPeerConnection(socketId);
        setPeers((prev) => new Map(prev).set(socketId, { socketId, connection: peer, stream: null }));

        const offer = await peer.createOffer();
        socket.emit('offer', { targetSocketId: socketId, sdp: offer });
      }
    });

    // 新しいユーザーからのオファーを受け取る
    socket.on(
      'offer',
      async ({
        sdp,
        senderSocketId,
      }: {
        sdp: RTCSessionDescriptionInit;
        senderSocketId: string;
      }) => {
        const peer = createPeerConnection(senderSocketId);
        setPeers((prev) =>
          new Map(prev).set(senderSocketId, { socketId: senderSocketId, connection: peer, stream: null })
        );

        await peer.setRemoteDescription(sdp);

        // 保留中のICE Candidateを追加
        const pending = pendingCandidates.current.get(senderSocketId) || [];
        for (const candidate of pending) {
          await peer.addIceCandidate(candidate);
        }
        pendingCandidates.current.delete(senderSocketId);

        const answer = await peer.createAnswer();
        socket.emit('answer', { targetSocketId: senderSocketId, sdp: answer });
      }
    );

    // アンサーを受け取る
    socket.on(
      'answer',
      async ({
        sdp,
        senderSocketId,
      }: {
        sdp: RTCSessionDescriptionInit;
        senderSocketId: string;
      }) => {
        const peer = peers.get(senderSocketId);
        if (peer) {
          await peer.connection.setRemoteDescription(sdp);
        }
      }
    );

    // ICE Candidateを受け取る
    socket.on(
      'ice-candidate',
      async ({
        candidate,
        senderSocketId,
      }: {
        candidate: RTCIceCandidateInit;
        senderSocketId: string;
      }) => {
        const peer = peers.get(senderSocketId);
        if (peer) {
          await peer.connection.addIceCandidate(candidate);
        } else {
          // ピアがまだ作成されていない場合は保留
          const existing = pendingCandidates.current.get(senderSocketId) || [];
          pendingCandidates.current.set(senderSocketId, [...existing, candidate]);
        }
      }
    );

    socket.on('user-left', ({ socketId }: { socketId: string }) => {
      removePeer(socketId);
    });
  }, [roomId, userId, serverUrl, createPeerConnection, removePeer, peers]);

  const leave = useCallback(() => {
    socketRef.current?.disconnect();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    peers.forEach((peer) => peer.connection.close());
    setPeers(new Map());
    setLocalStream(null);
    setIsConnected(false);
  }, [peers]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  }, []);

  const shareScreen = useCallback(async () => {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });
    const screenTrack = screenStream.getVideoTracks()[0];

    // 全ピアにスクリーントラックを送信
    for (const [, peer] of peers) {
      await peer.connection.replaceTrack(screenTrack);
    }

    // スクリーン共有終了時にカメラに戻す
    screenTrack.onended = async () => {
      const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
      if (cameraTrack) {
        for (const [, peer] of peers) {
          await peer.connection.replaceTrack(cameraTrack);
        }
      }
    };
  }, [peers]);

  useEffect(() => {
    return () => {
      leave();
    };
  }, []);

  return {
    localStream,
    peers,
    isConnected,
    isMuted,
    isVideoOff,
    join,
    leave,
    toggleMute,
    toggleVideo,
    shareScreen,
  };
}
```

### ビデオ通話UIコンポーネント

```typescript
// components/VideoCall.tsx
import { useEffect, useRef } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';

interface VideoCallProps {
  roomId: string;
  userId: string;
}

function VideoPlayer({ stream, muted = false }: { stream: MediaStream | null; muted?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
    />
  );
}

export function VideoCall({ roomId, userId }: VideoCallProps) {
  const {
    localStream,
    peers,
    isConnected,
    isMuted,
    isVideoOff,
    join,
    leave,
    toggleMute,
    toggleVideo,
    shareScreen,
  } = useWebRTC({
    roomId,
    userId,
    serverUrl: process.env.NEXT_PUBLIC_SIGNALING_SERVER || 'http://localhost:8080',
  });

  const peersArray = Array.from(peers.values());
  const totalParticipants = 1 + peersArray.length; // 自分 + リモートピア

  const gridColumns = totalParticipants <= 1 ? 1
    : totalParticipants <= 2 ? 2
    : totalParticipants <= 4 ? 2
    : 3;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#1a1a2e' }}>
      {/* 接続ステータス */}
      <div style={{ padding: '8px 16px', background: isConnected ? '#0f3460' : '#333', color: '#fff' }}>
        <span>{isConnected ? `接続中 - ルーム: ${roomId}` : '未接続'}</span>
        <span style={{ marginLeft: '16px' }}>参加者: {totalParticipants}名</span>
      </div>

      {/* ビデオグリッド */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
          gap: '8px',
          padding: '8px',
          overflow: 'hidden',
        }}
      >
        {/* 自分の映像 */}
        <div style={{ position: 'relative', background: '#0f3460', borderRadius: '8px' }}>
          <VideoPlayer stream={localStream} muted />
          <div
            style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              color: '#fff',
              background: 'rgba(0,0,0,0.5)',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          >
            あなた {isMuted ? '(ミュート)' : ''}
          </div>
        </div>

        {/* リモートピアの映像 */}
        {peersArray.map((peer) => (
          <div
            key={peer.socketId}
            style={{ position: 'relative', background: '#0f3460', borderRadius: '8px' }}
          >
            <VideoPlayer stream={peer.stream} />
            <div
              style={{
                position: 'absolute',
                bottom: '8px',
                left: '8px',
                color: '#fff',
                background: 'rgba(0,0,0,0.5)',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              {peer.socketId.slice(0, 8)} ({peer.connection.connectionState})
            </div>
          </div>
        ))}
      </div>

      {/* コントロールバー */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          padding: '16px',
          background: '#0f3460',
        }}
      >
        {!isConnected ? (
          <button
            onClick={join}
            style={{
              padding: '12px 32px',
              background: '#4CAF50',
              color: '#fff',
              border: 'none',
              borderRadius: '24px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            通話に参加
          </button>
        ) : (
          <>
            <button
              onClick={toggleMute}
              style={{
                padding: '12px 24px',
                background: isMuted ? '#f44336' : '#555',
                color: '#fff',
                border: 'none',
                borderRadius: '24px',
                cursor: 'pointer',
              }}
            >
              {isMuted ? 'ミュート解除' : 'ミュート'}
            </button>

            <button
              onClick={toggleVideo}
              style={{
                padding: '12px 24px',
                background: isVideoOff ? '#f44336' : '#555',
                color: '#fff',
                border: 'none',
                borderRadius: '24px',
                cursor: 'pointer',
              }}
            >
              {isVideoOff ? 'カメラON' : 'カメラOFF'}
            </button>

            <button
              onClick={shareScreen}
              style={{
                padding: '12px 24px',
                background: '#555',
                color: '#fff',
                border: 'none',
                borderRadius: '24px',
                cursor: 'pointer',
              }}
            >
              画面共有
            </button>

            <button
              onClick={leave}
              style={{
                padding: '12px 24px',
                background: '#f44336',
                color: '#fff',
                border: 'none',
                borderRadius: '24px',
                cursor: 'pointer',
              }}
            >
              通話終了
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

---

## 7. データチャネル：テキストチャットとファイル転送

WebRTCのデータチャネルは、P2Pでバイナリまたはテキストデータを送受信するAPIである。TCPライクな信頼性のある転送から、UDPライクな非信頼性転送まで設定できる。

### テキストチャットの実装

```typescript
// lib/chat-channel.ts

interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
}

interface ChatChannelOptions {
  onMessage: (message: ChatMessage) => void;
  onOpen: () => void;
  onClose: () => void;
}

export class ChatChannel {
  private channel: RTCDataChannel;
  private options: ChatChannelOptions;

  constructor(channel: RTCDataChannel, options: ChatChannelOptions) {
    this.channel = channel;
    this.options = options;
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.channel.onopen = () => {
      console.log('データチャネル開通');
      this.options.onOpen();
    };

    this.channel.onclose = () => {
      console.log('データチャネル閉鎖');
      this.options.onClose();
    };

    this.channel.onmessage = (event: MessageEvent) => {
      try {
        const message: ChatMessage = JSON.parse(event.data);
        this.options.onMessage(message);
      } catch (error) {
        console.error('メッセージ解析エラー:', error);
      }
    };

    this.channel.onerror = (error) => {
      console.error('データチャネルエラー:', error);
    };
  }

  send(text: string, senderId: string): void {
    if (this.channel.readyState !== 'open') {
      throw new Error('データチャネルが開いていません');
    }

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      senderId,
      text,
      timestamp: Date.now(),
    };

    this.channel.send(JSON.stringify(message));
  }

  get readyState(): RTCDataChannelState {
    return this.channel.readyState;
  }
}
```

### ファイル転送の実装

大容量ファイルの転送には、チャンク分割と進捗管理が必要である。

```typescript
// lib/file-transfer.ts

interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  totalChunks: number;
}

interface FileTransferMessage {
  type: 'metadata' | 'chunk' | 'complete' | 'error';
  fileId: string;
  payload?: unknown;
}

interface ChunkPayload {
  index: number;
  data: string; // Base64エンコード
}

interface ReceivedFile {
  metadata: FileMetadata;
  chunks: Map<number, ArrayBuffer>;
  receivedChunks: number;
}

const CHUNK_SIZE = 16 * 1024; // 16KB（WebRTCデータチャネルの推奨チャンクサイズ）

export class FileTransfer {
  private channel: RTCDataChannel;
  private receivedFiles = new Map<string, ReceivedFile>();
  private onProgress?: (fileId: string, percent: number) => void;
  private onComplete?: (fileId: string, file: File) => void;

  constructor(
    channel: RTCDataChannel,
    options?: {
      onProgress?: (fileId: string, percent: number) => void;
      onComplete?: (fileId: string, file: File) => void;
    }
  ) {
    this.channel = channel;
    this.onProgress = options?.onProgress;
    this.onComplete = options?.onComplete;

    this.channel.onmessage = (event: MessageEvent) => {
      this.handleMessage(event.data);
    };

    // バイナリタイプを設定
    this.channel.binaryType = 'arraybuffer';
  }

  // ファイルを送信
  async sendFile(file: File): Promise<void> {
    const fileId = crypto.randomUUID();
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // メタデータを送信
    const metadata: FileMetadata = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      totalChunks,
    };

    this.sendMessage({
      type: 'metadata',
      fileId,
      payload: metadata,
    });

    // チャンクを順次送信
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      const buffer = await chunk.arrayBuffer();

      // バックプレッシャー制御
      while (this.channel.bufferedAmount > CHUNK_SIZE * 8) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // ArrayBufferを直接送信
      this.channel.send(buffer);

      const progress = Math.round(((i + 1) / totalChunks) * 100);
      this.onProgress?.(fileId, progress);
    }

    this.sendMessage({ type: 'complete', fileId });
  }

  private handleMessage(data: string | ArrayBuffer): void {
    if (typeof data === 'string') {
      // JSONメッセージ（メタデータ・制御）
      try {
        const message: FileTransferMessage = JSON.parse(data);
        this.handleControlMessage(message);
      } catch (error) {
        console.error('制御メッセージ解析エラー:', error);
      }
    } else {
      // バイナリデータ（チャンク）
      this.handleChunk(data);
    }
  }

  private handleControlMessage(message: FileTransferMessage): void {
    switch (message.type) {
      case 'metadata': {
        const metadata = message.payload as FileMetadata;
        this.receivedFiles.set(message.fileId, {
          metadata,
          chunks: new Map(),
          receivedChunks: 0,
        });
        break;
      }
      case 'complete': {
        this.assembleFile(message.fileId);
        break;
      }
      case 'error': {
        console.error('ファイル転送エラー:', message.payload);
        this.receivedFiles.delete(message.fileId);
        break;
      }
    }
  }

  // チャンクインデックスを追跡する変数
  private currentFileId: string | null = null;
  private currentChunkIndex = 0;

  private handleChunk(data: ArrayBuffer): void {
    // 受信中のファイルにチャンクを追加
    for (const [fileId, receivedFile] of this.receivedFiles) {
      if (receivedFile.receivedChunks < receivedFile.metadata.totalChunks) {
        receivedFile.chunks.set(receivedFile.receivedChunks, data);
        receivedFile.receivedChunks++;

        const progress = Math.round(
          (receivedFile.receivedChunks / receivedFile.metadata.totalChunks) * 100
        );
        this.onProgress?.(fileId, progress);
        break;
      }
    }
  }

  private assembleFile(fileId: string): void {
    const receivedFile = this.receivedFiles.get(fileId);
    if (!receivedFile) return;

    const { metadata, chunks, receivedChunks } = receivedFile;

    if (receivedChunks !== metadata.totalChunks) {
      console.error(`チャンク数不一致: 受信${receivedChunks}/${metadata.totalChunks}`);
      return;
    }

    // チャンクを順序通りに結合
    const totalSize = metadata.size;
    const buffer = new Uint8Array(totalSize);
    let offset = 0;

    for (let i = 0; i < metadata.totalChunks; i++) {
      const chunk = chunks.get(i);
      if (!chunk) {
        console.error(`チャンク${i}が見つかりません`);
        return;
      }
      buffer.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }

    const file = new File([buffer], metadata.name, { type: metadata.type });
    this.onComplete?.(fileId, file);
    this.receivedFiles.delete(fileId);

    console.log(`ファイル受信完了: ${metadata.name} (${totalSize}バイト)`);
  }

  private sendMessage(message: FileTransferMessage): void {
    if (this.channel.readyState === 'open') {
      this.channel.send(JSON.stringify(message));
    }
  }
}
```

---

## 8. Simple-peerライブラリの活用

Simple-peerは、WebRTCのAPIを大幅に簡略化するnpmライブラリである。複雑なSDP交換やICE Candidate管理を内部で処理し、よりシンプルなAPIを提供する。

### インストール

```bash
npm install simple-peer
npm install --save-dev @types/simple-peer
```

### Simple-peerの基本的な使い方

```typescript
// lib/simple-peer-connection.ts
import SimplePeer, { SignalData } from 'simple-peer';

interface SimplePeerOptions {
  initiator: boolean;
  localStream?: MediaStream;
  onSignal: (data: SignalData) => void;
  onStream: (stream: MediaStream) => void;
  onConnect: () => void;
  onError: (error: Error) => void;
  onClose: () => void;
}

export function createSimplePeer(options: SimplePeerOptions): SimplePeer.Instance {
  const peer = new SimplePeer({
    initiator: options.initiator,
    stream: options.localStream,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
          urls: 'turn:your-turn-server.example.com:3478',
          username: 'user',
          credential: 'pass',
        },
      ],
    },
    // データチャネルのオプション
    channelConfig: {
      ordered: true,
    },
    // Trickle ICE（ICE Candidateを順次送信）
    trickle: true,
  });

  peer.on('signal', options.onSignal);
  peer.on('stream', options.onStream);
  peer.on('connect', options.onConnect);
  peer.on('error', options.onError);
  peer.on('close', options.onClose);

  // データ受信
  peer.on('data', (data: Uint8Array) => {
    const message = new TextDecoder().decode(data);
    console.log('受信データ:', message);
  });

  return peer;
}

// Simple-peerを使った1対1ビデオ通話の例
export class SimplePeerCall {
  private peer: SimplePeer.Instance | null = null;
  private socket: WebSocket;

  constructor(private serverUrl: string) {
    this.socket = new WebSocket(serverUrl);
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.socket.onmessage = (event) => {
      const { type, payload } = JSON.parse(event.data);

      switch (type) {
        case 'signal':
          this.peer?.signal(payload);
          break;
        case 'call-request':
          this.answerCall(payload.callerId);
          break;
      }
    };
  }

  async startCall(localStream: MediaStream): Promise<void> {
    this.peer = createSimplePeer({
      initiator: true,
      localStream,
      onSignal: (data) => {
        this.sendMessage('signal', data);
      },
      onStream: (remoteStream) => {
        console.log('リモートストリーム受信');
        // UIにリモートストリームを表示
      },
      onConnect: () => {
        console.log('P2P接続確立');
        // テキストデータ送信のテスト
        this.peer?.send('接続テスト');
      },
      onError: (error) => {
        console.error('接続エラー:', error);
      },
      onClose: () => {
        console.log('接続終了');
      },
    });
  }

  async answerCall(localStream: MediaStream): Promise<void> {
    this.peer = createSimplePeer({
      initiator: false,
      localStream,
      onSignal: (data) => {
        this.sendMessage('signal', data);
      },
      onStream: (remoteStream) => {
        console.log('リモートストリーム受信');
      },
      onConnect: () => {
        console.log('P2P接続確立');
      },
      onError: (error) => {
        console.error('接続エラー:', error);
      },
      onClose: () => {
        console.log('接続終了');
      },
    });
  }

  hangUp(): void {
    this.peer?.destroy();
    this.peer = null;
  }

  private sendMessage(type: string, payload: unknown): void {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }));
    }
  }
}
```

---

## 9. mediasoupによるSFUサーバー構築

P2P（メッシュトポロジー）は参加者が増えるにつれ、各クライアントが全参加者分のストリームを送受信するため、帯域幅とCPUの消費が指数関数的に増大する。SFU（Selective Forwarding Unit）サーバーは、各クライアントがサーバーに1本のストリームを送信するだけで済むようにする。

### P2Pとの比較

```
【P2P（メッシュ）- 4人の場合】
各クライアントが3本の送信 + 3本の受信 = 計6本の接続 x4人 = 24ストリーム

【SFU - 4人の場合】
各クライアントが1本の送信 + 3本の受信 = 計4接続ストリーム
サーバー側でルーティングのみ（デコードなし）
```

### mediasoupのセットアップ

```bash
npm install mediasoup
```

```typescript
// server/mediasoup-server.ts
import * as mediasoup from 'mediasoup';
import { Router, Worker, WebRtcTransport, Producer, Consumer } from 'mediasoup/node/lib/types';

interface Room {
  router: Router;
  peers: Map<string, Peer>;
}

interface Peer {
  transports: Map<string, WebRtcTransport>;
  producers: Map<string, Producer>;
  consumers: Map<string, Consumer>;
}

class MediasoupServer {
  private worker: Worker | null = null;
  private rooms = new Map<string, Room>();

  async init(): Promise<void> {
    this.worker = await mediasoup.createWorker({
      rtcMinPort: 10000,
      rtcMaxPort: 10999,
      logLevel: 'warn',
    });

    this.worker.on('died', () => {
      console.error('mediasoup Workerが予期せず終了しました。再起動します...');
      setTimeout(() => this.init(), 2000);
    });

    console.log('mediasoup Worker起動完了');
  }

  async createRoom(roomId: string): Promise<Router> {
    if (this.rooms.has(roomId)) {
      return this.rooms.get(roomId)!.router;
    }

    const router = await this.worker!.createRouter({
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000,
          },
        },
        {
          kind: 'video',
          mimeType: 'video/VP9',
          clockRate: 90000,
          parameters: {
            'profile-id': 2,
            'x-google-start-bitrate': 1000,
          },
        },
        {
          kind: 'video',
          mimeType: 'video/H264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '4d0032',
            'level-asymmetry-allowed': 1,
            'x-google-start-bitrate': 1000,
          },
        },
      ],
    });

    this.rooms.set(roomId, {
      router,
      peers: new Map(),
    });

    return router;
  }

  async createWebRtcTransport(roomId: string, peerId: string, direction: 'send' | 'recv'): Promise<{
    id: string;
    iceParameters: unknown;
    iceCandidates: unknown;
    dtlsParameters: unknown;
  }> {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error(`ルーム ${roomId} が見つかりません`);

    const transport = await room.router.createWebRtcTransport({
      listenIps: [
        {
          ip: '0.0.0.0',
          announcedIp: process.env.ANNOUNCED_IP || '127.0.0.1',
        },
      ],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate: 1000000,
      minimumAvailableOutgoingBitrate: 600000,
    });

    // ピアのトランスポートを管理
    let peer = room.peers.get(peerId);
    if (!peer) {
      peer = {
        transports: new Map(),
        producers: new Map(),
        consumers: new Map(),
      };
      room.peers.set(peerId, peer);
    }
    peer.transports.set(transport.id, transport);

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }

  async connectTransport(
    roomId: string,
    peerId: string,
    transportId: string,
    dtlsParameters: mediasoup.types.DtlsParameters
  ): Promise<void> {
    const transport = this.getTransport(roomId, peerId, transportId);
    await transport.connect({ dtlsParameters });
  }

  async produce(
    roomId: string,
    peerId: string,
    transportId: string,
    kind: mediasoup.types.MediaKind,
    rtpParameters: mediasoup.types.RtpParameters
  ): Promise<string> {
    const transport = this.getTransport(roomId, peerId, transportId);
    const producer = await transport.produce({ kind, rtpParameters });

    const room = this.rooms.get(roomId)!;
    room.peers.get(peerId)!.producers.set(producer.id, producer);

    return producer.id;
  }

  async consume(
    roomId: string,
    consumerPeerId: string,
    producerPeerId: string,
    producerId: string,
    transportId: string,
    rtpCapabilities: mediasoup.types.RtpCapabilities
  ): Promise<{
    id: string;
    producerId: string;
    kind: mediasoup.types.MediaKind;
    rtpParameters: mediasoup.types.RtpParameters;
  }> {
    const room = this.rooms.get(roomId)!;
    const router = room.router;

    if (!router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error('このクライアントはこのプロデューサーを消費できません');
    }

    const transport = this.getTransport(roomId, consumerPeerId, transportId);
    const consumer = await transport.consume({
      producerId,
      rtpCapabilities,
      paused: true, // 最初は一時停止
    });

    room.peers.get(consumerPeerId)!.consumers.set(consumer.id, consumer);

    // 準備完了後に再開
    await consumer.resume();

    return {
      id: consumer.id,
      producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
    };
  }

  private getTransport(roomId: string, peerId: string, transportId: string): WebRtcTransport {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error(`ルーム ${roomId} が見つかりません`);
    const peer = room.peers.get(peerId);
    if (!peer) throw new Error(`ピア ${peerId} が見つかりません`);
    const transport = peer.transports.get(transportId);
    if (!transport) throw new Error(`トランスポート ${transportId} が見つかりません`);
    return transport;
  }
}

export const mediasoupServer = new MediasoupServer();
```

---

## 10. WebRTCクラウドサービス比較

自前でメディアサーバーを構築するのは複雑であるため、マネージドサービスの利用も選択肢となる。

### 主要サービスの比較

| サービス | 特徴 | 価格モデル | 最大同時接続 |
|----------|------|-----------|-------------|
| **Twilio Video** | 成熟したAPI、豊富なSDK | 分単位課金 | 50人/ルーム |
| **Daily.co** | シンプルなAPI、iframe埋め込み可 | 分単位課金 | 200人/ルーム |
| **Livekit** | オープンソース、セルフホスト可能 | セルフホスト無料 | 数千人/ルーム |
| **Amazon Chime** | AWSエコシステム統合 | 分単位課金 | 250人/ルーム |
| **Agora** | アジア系CDN強み、低遅延 | 分単位課金 | 1000人/チャンネル |
| **100ms** | 分析機能充実、録画機能 | 分単位課金 | 100人/ルーム |

### Livekitの実装例

Livekitはオープンソースで、Go言語で実装されたSFUサーバーである。セルフホストとクラウドサービスの両方が利用できる。

```typescript
// lib/livekit-client.ts
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  RemoteTrackPublication,
  RemoteTrack,
  Participant,
  Track,
  VideoPresets,
  createLocalVideoTrack,
  createLocalAudioTrack,
} from 'livekit-client';

interface LivekitRoomOptions {
  serverUrl: string;
  token: string;
  onParticipantConnected?: (participant: RemoteParticipant) => void;
  onParticipantDisconnected?: (participant: RemoteParticipant) => void;
  onTrackSubscribed?: (track: RemoteTrack, participant: RemoteParticipant) => void;
}

export async function joinLivekitRoom(options: LivekitRoomOptions): Promise<Room> {
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
    videoCaptureDefaults: {
      resolution: VideoPresets.h720.resolution,
    },
  });

  room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
    console.log(`参加者参加: ${participant.identity}`);
    options.onParticipantConnected?.(participant);
  });

  room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
    console.log(`参加者退出: ${participant.identity}`);
    options.onParticipantDisconnected?.(participant);
  });

  room.on(
    RoomEvent.TrackSubscribed,
    (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
      console.log(`トラック受信: ${track.kind} from ${participant.identity}`);
      options.onTrackSubscribed?.(track, participant);

      if (track.kind === Track.Kind.Video) {
        const videoEl = document.createElement('video');
        videoEl.autoplay = true;
        videoEl.playsInline = true;
        track.attach(videoEl);
        document.getElementById('remote-videos')?.appendChild(videoEl);
      }
    }
  );

  room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
    track.detach();
  });

  room.on(RoomEvent.Disconnected, () => {
    console.log('ルームから切断されました');
  });

  // ルームに接続
  await room.connect(options.serverUrl, options.token);

  // ローカルのカメラとマイクを公開
  const videoTrack = await createLocalVideoTrack({
    facingMode: 'user',
    resolution: VideoPresets.h720.resolution,
  });

  const audioTrack = await createLocalAudioTrack({
    echoCancellation: true,
    noiseSuppression: true,
  });

  await room.localParticipant.publishTrack(videoTrack);
  await room.localParticipant.publishTrack(audioTrack);

  return room;
}

// Livekitのアクセストークンをサーバーサイドで生成（Node.js）
// npm install livekit-server-sdk
import { AccessToken } from 'livekit-server-sdk';

export function generateLivekitToken(
  roomName: string,
  participantName: string,
  apiKey: string,
  apiSecret: string
): string {
  const token = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
    ttl: '1h',
  });

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return token.toJwt();
}
```

---

## 11. モバイル対応：React Native WebRTC

React NativeでWebRTCを使うには、`react-native-webrtc`ライブラリを使用する。

### セットアップ

```bash
npm install react-native-webrtc
cd ios && pod install
```

```typescript
// mobile/VideoCall.tsx (React Native)
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  MediaStream,
  mediaDevices,
  RTCView,
} from 'react-native-webrtc';

const ICE_SERVERS = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302'] },
    {
      urls: ['turn:your-turn-server:3478'],
      username: 'user',
      credential: 'pass',
    },
  ],
};

export function MobileVideoCall({ roomId }: { roomId: string }) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    initCall();
    return () => {
      pcRef.current?.close();
      localStream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function initCall() {
    // iOSとAndroidでの制約の違いに対応
    const constraints = {
      audio: true,
      video: {
        mandatory: {
          minWidth: 500,
          minHeight: 300,
          minFrameRate: 30,
        },
        facingMode: isFrontCamera ? 'user' : 'environment',
      },
    };

    const stream = await mediaDevices.getUserMedia(constraints);
    setLocalStream(stream);

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // シグナリングサーバーにICE Candidateを送信
        console.log('ICE Candidate:', event.candidate);
      }
    };
  }

  async function switchCamera() {
    const videoTrack = localStream?.getVideoTracks()[0];
    if (videoTrack) {
      // React Native WebRTCのカメラ切り替え
      (videoTrack as any)._switchCamera();
      setIsFrontCamera(!isFrontCamera);
    }
  }

  return (
    <View style={styles.container}>
      {/* リモート映像（フルスクリーン） */}
      {remoteStream && (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={styles.remoteVideo}
          objectFit="cover"
          mirror={false}
        />
      )}

      {/* ローカル映像（小窓） */}
      {localStream && (
        <RTCView
          streamURL={localStream.toURL()}
          style={styles.localVideo}
          objectFit="cover"
          mirror={isFrontCamera}
          zOrder={1}
        />
      )}

      {/* コントロールボタン */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.button} onPress={switchCamera}>
          <Text style={styles.buttonText}>カメラ切替</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  remoteVideo: {
    flex: 1,
  },
  localVideo: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  button: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#fff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});
```

---

## 12. セキュリティ：DTLS・SRTP

WebRTCは設計段階からセキュリティを考慮しており、すべてのメディアストリームとデータチャネルが暗号化される。

### DTLS（Datagram Transport Layer Security）

DTLSはUDP上で動作するTLSの変形版である。WebRTCでは、ピア間の鍵交換に使用される。

接続確立時に双方のフィンガープリントをSDPで交換し、DTLSハンドシェイク時に検証することで、中間者攻撃を防ぐ。

### SRTP（Secure Real-time Transport Protocol）

実際のメディアデータはSRTP（Secure RTP）で暗号化されて送受信される。DTLSで交換した鍵を使って各パケットを暗号化する。

### セキュリティのベストプラクティス

```typescript
// セキュアなICEサーバー設定
const secureIceServers: RTCIceServer[] = [
  {
    urls: 'stuns:stun.example.com:5349', // STUNs（TLS使用）
  },
  {
    urls: 'turns:turn.example.com:5349?transport=tcp', // TURNs（TLS使用）
    username: generateEphemeralCredential().username,
    credential: generateEphemeralCredential().credential,
  },
];

// 一時的なTURN認証情報の生成（サーバーサイド）
import crypto from 'crypto';

interface TurnCredential {
  username: string;
  credential: string;
}

function generateEphemeralCredential(
  secret: string,
  ttlSeconds: number = 3600
): TurnCredential {
  const timestamp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const username = `${timestamp}:webrtcuser`;
  const hmac = crypto.createHmac('sha1', secret);
  hmac.update(username);
  const credential = hmac.digest('base64');
  return { username, credential };
}

// クライアントサイドのセキュリティ設定
const secureConfig: RTCConfiguration = {
  iceServers: secureIceServers,
  // 強制的にDTLS-SRTPを使用（デフォルトだが明示的に設定）
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
  // ICEトランスポートポリシー
  iceTransportPolicy: 'all', // 'relay'にするとTURNのみで通信（IP漏洩防止）
};
```

### IP漏洩対策

WebRTCは接続確立のためにローカルIPアドレスを公開する可能性がある（VPN使用時でも）。これはプライバシー上の問題となりうる。

```typescript
// Firefoxの場合: about:config で media.peerconnection.ice.default_address_only = true
// Chromeの場合: 拡張機能でICE policyをrelayに設定

// アプリ側での対応
const privacyConfig: RTCConfiguration = {
  iceServers: [
    {
      urls: 'turns:turn.example.com:443',
      username: 'user',
      credential: 'pass',
    },
  ],
  iceTransportPolicy: 'relay', // TURNのみ使用することでローカルIP非公開
};
```

---

## 13. デバッグ方法

WebRTCの問題を調査するための各種ツールと方法を紹介する。

### chrome://webrtc-internals

Chromeに内蔵されたWebRTCデバッグツールである。接続中のすべてのWebRTC接続の詳細な統計情報をリアルタイムで確認できる。

確認できる主な情報は以下の通りである。

- ICE Candidateの交換状況
- 接続状態の遷移
- 送受信のビットレート・パケットロス率
- RTT（往復遅延）
- コーデック情報
- DTLS接続の詳細

### WebRTC統計APIを使ったコード内デバッグ

```typescript
// lib/webrtc-stats.ts

interface ConnectionStats {
  bytesReceived: number;
  bytesSent: number;
  packetsLost: number;
  jitter: number;
  roundTripTime: number;
  frameWidth: number;
  frameHeight: number;
  framesPerSecond: number;
  audioLevel: number;
}

export async function getConnectionStats(
  pc: RTCPeerConnection
): Promise<ConnectionStats | null> {
  const stats = await pc.getStats();
  const result: Partial<ConnectionStats> = {};

  stats.forEach((report) => {
    switch (report.type) {
      case 'inbound-rtp':
        if (report.kind === 'video') {
          result.bytesReceived = report.bytesReceived;
          result.packetsLost = report.packetsLost;
          result.jitter = report.jitter;
          result.frameWidth = report.frameWidth;
          result.frameHeight = report.frameHeight;
          result.framesPerSecond = report.framesPerSecond;
        } else if (report.kind === 'audio') {
          result.audioLevel = report.audioLevel;
        }
        break;

      case 'outbound-rtp':
        if (report.kind === 'video') {
          result.bytesSent = report.bytesSent;
        }
        break;

      case 'candidate-pair':
        if (report.state === 'succeeded') {
          result.roundTripTime = report.currentRoundTripTime * 1000; // ミリ秒に変換
        }
        break;
    }
  });

  return result as ConnectionStats;
}

// 定期的な統計収集
export function startStatsMonitoring(
  pc: RTCPeerConnection,
  intervalMs: number = 1000
): () => void {
  const intervalId = setInterval(async () => {
    const stats = await getConnectionStats(pc);
    if (stats) {
      // ビットレートが極端に低い場合に警告
      if (stats.bytesReceived < 1000) {
        console.warn('受信データが少なすぎます。接続品質を確認してください。');
      }
      // パケットロス率が高い場合に警告
      if (stats.packetsLost > 5) {
        console.warn(`パケットロスが高い: ${stats.packetsLost}パケット損失`);
      }
      // RTTが高い場合に警告
      if (stats.roundTripTime > 300) {
        console.warn(`高遅延を検出: RTT ${stats.roundTripTime}ms`);
      }

      console.log('接続統計:', stats);
    }
  }, intervalMs);

  return () => clearInterval(intervalId);
}
```

### よくある問題と解決策

**問題1: 接続が確立できない**

原因の調査順序は以下の通りである。

1. ICE Candidateが正しく交換されているか確認する（シグナリングサーバーのログ）
2. STUNサーバーへの到達性をテストする（Trickle ICE Testsツール）
3. TURNサーバーの設定を確認する
4. ファイアウォールでUDP 3478ポートが開いているか確認する

```typescript
// STUNサーバーの到達性テスト
async function testStunConnectivity(stunUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: stunUrl }],
    });

    pc.createDataChannel('test');

    const timeout = setTimeout(() => {
      pc.close();
      resolve(false);
    }, 5000);

    pc.onicecandidate = (event) => {
      if (event.candidate?.type === 'srflx') {
        clearTimeout(timeout);
        pc.close();
        resolve(true);
      }
    };

    pc.createOffer().then((offer) => pc.setLocalDescription(offer));
  });
}
```

**問題2: 映像・音声の品質が悪い**

```typescript
// 接続品質に応じたビデオ品質の自動調整
async function adaptVideoQuality(pc: RTCPeerConnection): Promise<void> {
  const stats = await getConnectionStats(pc);
  if (!stats) return;

  const senders = pc.getSenders().filter((s) => s.track?.kind === 'video');
  for (const sender of senders) {
    const params = sender.getParameters();
    if (!params.encodings || params.encodings.length === 0) continue;

    if (stats.roundTripTime > 200 || stats.packetsLost > 2) {
      // 高遅延・パケットロス時は品質を下げる
      params.encodings[0].maxBitrate = 300_000; // 300Kbps
      params.encodings[0].scaleResolutionDownBy = 2; // 解像度を半分に
    } else {
      // 良好な接続では品質を上げる
      params.encodings[0].maxBitrate = 1_500_000; // 1.5Mbps
      params.encodings[0].scaleResolutionDownBy = 1; // フル解像度
    }

    await sender.setParameters(params);
  }
}
```

**問題3: エコーやノイズが発生する**

```typescript
// 音声処理の設定を最適化
async function getOptimizedAudioStream(): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      // Chrome独自の拡張機能
      googEchoCancellation: true,
      googAutoGainControl: true,
      googNoiseSuppression: true,
      googHighpassFilter: true,
    } as MediaTrackConstraints,
    video: false,
  });
  return stream;
}
```

---

## 14. 本番環境でのスケーリング戦略

### アーキテクチャの選択

本番環境でのWebRTCスケーリングには、いくつかのアーキテクチャがある。

**1. メッシュトポロジー（P2P）**

- 適用: 少人数（2〜4名）のプライベート通話
- 利点: サーバーコストが低い
- 欠点: 参加者増加で帯域幅・CPUが増大

**2. SFU（Selective Forwarding Unit）**

- 適用: 中規模グループ通話（最大50〜100名）
- 利点: サーバーはルーティングのみでCPU負荷が低い
- 欠点: 複数のサブスクリプションが必要

**3. MCU（Multipoint Conferencing Unit）**

- 適用: 大規模な配信・ウェビナー
- 利点: クライアントの受信ストリームが1本
- 欠点: サーバーのデコード・エンコードでCPU消費大

### TURNサーバーのスケーリング

coTURNを使ったTURNサーバーのDocker設定。

```yaml
# docker-compose.yml
version: '3.8'

services:
  coturn:
    image: coturn/coturn:latest
    network_mode: host
    volumes:
      - ./turnserver.conf:/etc/coturn/turnserver.conf
    restart: unless-stopped

  # 複数のTURNサーバーをロードバランサーの背後に配置
  nginx:
    image: nginx:alpine
    ports:
      - '3478:3478/udp'
      - '3478:3478/tcp'
    volumes:
      - ./nginx-turn.conf:/etc/nginx/nginx.conf
    depends_on:
      - coturn
```

```conf
# turnserver.conf
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0
external-ip=YOUR_PUBLIC_IP
realm=turn.example.com
server-name=turn.example.com

# TLS証明書
cert=/etc/letsencrypt/live/turn.example.com/fullchain.pem
pkey=/etc/letsencrypt/live/turn.example.com/privkey.pem

# 認証
use-auth-secret
static-auth-secret=YOUR_STATIC_SECRET

# セキュリティ
no-multicast-peers
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=192.168.0.0-192.168.255.255
denied-peer-ip=172.16.0.0-172.31.255.255

# パフォーマンス
min-port=49152
max-port=65535
```

### シグナリングサーバーのスケーリング

単一のシグナリングサーバーではスケールしないため、RedisのPub/Subを使った水平スケーリングを実装する。

```typescript
// server/scalable-signaling.ts
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

async function createScalableSignalingServer() {
  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: { origin: '*' },
    transports: ['websocket'],
  });

  // RedisアダプターでSocket.ioを複数サーバーに対応
  const pubClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  const subClient = pubClient.duplicate();

  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));

  io.on('connection', (socket) => {
    socket.on('join-room', (roomId: string) => {
      socket.join(roomId);
      socket.to(roomId).emit('user-joined', socket.id);
    });

    socket.on('signal', ({ targetId, signal }: { targetId: string; signal: unknown }) => {
      // Redisアダプターが自動的に正しいサーバーにルーティング
      io.to(targetId).emit('signal', { from: socket.id, signal });
    });
  });

  const PORT = parseInt(process.env.PORT || '8080');
  httpServer.listen(PORT, () => {
    console.log(`スケーラブルシグナリングサーバー起動: ポート ${PORT}`);
  });

  return io;
}

createScalableSignalingServer().catch(console.error);
```

### 録画機能の実装

```typescript
// lib/recording.ts

export class MediaRecorder {
  private recorder: globalThis.MediaRecorder | null = null;
  private chunks: BlobPart[] = [];

  start(stream: MediaStream, mimeType: string = 'video/webm;codecs=vp9,opus'): void {
    if (!globalThis.MediaRecorder.isTypeSupported(mimeType)) {
      // フォールバック
      mimeType = 'video/webm;codecs=vp8,opus';
    }

    this.chunks = [];
    this.recorder = new globalThis.MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 2_500_000,
      audioBitsPerSecond: 128_000,
    });

    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    this.recorder.start(1000); // 1秒ごとにデータを収集
    console.log('録画開始');
  }

  stop(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.recorder) return resolve(new Blob());

      this.recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'video/webm' });
        resolve(blob);
      };

      this.recorder.stop();
    });
  }

  async stopAndDownload(filename: string = 'recording.webm'): Promise<void> {
    const blob = await this.stop();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  get isRecording(): boolean {
    return this.recorder?.state === 'recording';
  }
}
```

### 帯域幅適応（Simulcast）

Simulcastは、同じビデオを複数の品質でエンコードして送信し、受信側の回線品質に応じて適切な品質を選択する技術である。

```typescript
// Simulcastの設定
const simulcastEncodings: RTCRtpEncodingParameters[] = [
  {
    rid: 'q', // 低品質
    maxBitrate: 100_000, // 100Kbps
    scaleResolutionDownBy: 4,
    maxFramerate: 15,
  },
  {
    rid: 'h', // 中品質
    maxBitrate: 500_000, // 500Kbps
    scaleResolutionDownBy: 2,
    maxFramerate: 30,
  },
  {
    rid: 'f', // 高品質（フル）
    maxBitrate: 2_000_000, // 2Mbps
    scaleResolutionDownBy: 1,
    maxFramerate: 30,
  },
];

// Simulcastを有効にしてトラックを追加
async function addTrackWithSimulcast(
  pc: RTCPeerConnection,
  videoTrack: MediaStreamTrack,
  stream: MediaStream
): Promise<RTCRtpSender> {
  const sender = pc.addTrack(videoTrack, stream);

  const params = sender.getParameters();
  params.encodings = simulcastEncodings;
  await sender.setParameters(params);

  return sender;
}
```

---

## まとめと次のステップ

本記事では、WebRTCの基礎概念からプロダクション環境での実装まで網羅的に解説した。

学習のポイントを振り返ると、以下の通りである。

- **シグナリング**: WebRTCはシグナリング方法を規定しないため、WebSocketやSocket.ioで実装する
- **ICE/STUN/TURN**: NAT越えのためSTUNサーバーは必須、不安定な環境ではTURNも用意する
- **メディア取得**: `getUserMedia`はデバイスごとの違いに対応した堅牢なエラー処理が重要
- **スケーリング**: 4人以上の通話ではSFUアーキテクチャを採用する
- **セキュリティ**: DTLS/SRTPが標準で有効だが、TURNサーバーの認証情報管理に注意する

### 参考リソース

- **WebRTC公式仕様**: https://www.w3.org/TR/webrtc/
- **WebRTC Samples**: https://webrtc.github.io/samples/
- **mediasoup公式ドキュメント**: https://mediasoup.org/
- **Livekit公式ドキュメント**: https://docs.livekit.io/
- **coTURN**: https://github.com/coturn/coturn

### DevToolBoxで開発効率を上げる

WebRTCの開発では、JSON形式のSDPやICE Candidateのデバッグ、WebSocket通信の確認など、多くのテキスト処理・変換作業が発生する。**DevToolBox**（https://usedevtools.com）は、開発者向けのオールインワンツールセットであり、以下の機能がWebRTC開発に役立つ。

- **JSON フォーマッター**: SDPをJSON形式で可視化・整形する
- **Base64 エンコーダ/デコーダ**: ICE Candidateやフィンガープリントのデバッグに使用する
- **WebSocket テスター**: シグナリングサーバーとの通信をリアルタイムでテストする
- **タイムスタンプ変換**: TURNサーバーの一時認証情報のTTLを確認する
- **HMAC ジェネレーター**: TURNサーバーのシークレットベース認証情報を手動で生成する

ブラウザだけで使えるため、インストール不要で即座に使い始めることができる。WebRTCのシグナリングフローをデバッグする際に、ぜひ活用してほしい。

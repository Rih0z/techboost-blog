---
title: 'gRPC完全ガイド — Protocol Buffers・Node.js・型安全・双方向ストリーミング'
description: 'gRPCとProtocol BuffersでマイクロサービスAPIを構築する完全ガイド。.protoファイル定義・Node.js実装・型コード生成・Unary/Server Streaming/Client Streaming/双方向・gRPC-Web・認証まで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-1.jpg'
tags: ['gRPC', 'Protocol Buffers', 'Node.js', 'マイクロサービス', 'TypeScript']
---

マイクロサービスアーキテクチャが普及するにつれて、サービス間通信の効率化は重要な課題となっている。REST APIは汎用性が高く広く普及しているが、大規模なマイクロサービス環境ではパフォーマンス・型安全性・スキーマ管理において限界が見えてくる。そこで注目されているのが **gRPC** だ。

gRPCはGoogleが開発したオープンソースのRPC（Remote Procedure Call）フレームワークで、HTTP/2を基盤とし、Protocol Buffersをデフォルトのシリアライゼーションフォーマットとして採用している。本記事ではgRPCの概念から実装まで、Node.js/TypeScriptを使って体系的に解説する。

---

## 1. gRPCとは — REST/GraphQLとの比較・適用場面

### gRPCの概要

gRPC（gRPC Remote Procedure Calls）は2015年にGoogleが公開したRPCフレームワークだ。内部では長年「Stubby」という名のシステムを使ってサービス間通信を行っていたが、それをオープンソース化したものがgRPCである。

gRPCの主な特徴は以下の通りだ。

- **HTTP/2ベース**: ヘッダー圧縮・多重化・サーバープッシュをサポート
- **Protocol Buffers**: バイナリシリアライゼーションによる高速・コンパクトなデータ転送
- **コード生成**: .protoファイルから複数言語のコードを自動生成
- **双方向ストリーミング**: クライアント・サーバー双方向のリアルタイム通信
- **強力な型安全性**: スキーマファースト設計で型の不整合を防止

### REST・GraphQLとの比較

| 特性 | REST | GraphQL | gRPC |
|------|------|---------|------|
| プロトコル | HTTP/1.1〜2 | HTTP/1.1〜2 | HTTP/2 |
| データ形式 | JSON（主）| JSON | Protocol Buffers（バイナリ） |
| スキーマ定義 | OpenAPI（任意） | GraphQLスキーマ（必須） | .proto（必須） |
| 型安全性 | 弱い | 中程度 | 強い |
| ストリーミング | 限定的 | サブスクリプション | ネイティブ対応 |
| ブラウザサポート | 完全 | 完全 | gRPC-Web経由 |
| 学習コスト | 低い | 中程度 | 高い |
| パフォーマンス | 普通 | 普通 | 高い |

**RESTが適している場面**:
- 外部公開APIの設計
- ブラウザから直接アクセスするAPI
- シンプルなCRUD操作
- 汎用性・相互運用性を重視する場合

**gRPCが適している場面**:
- マイクロサービス間の内部通信
- リアルタイムストリーミングが必要な場面
- パフォーマンスクリティカルな通信
- 多言語環境での統一スキーマ管理
- モバイルアプリ（帯域節約）

### gRPCの通信モデル

gRPCには4種類の通信モデルがある。

1. **Unary RPC**: 従来のリクエスト/レスポンス（REST APIに相当）
2. **Server Streaming RPC**: サーバーが複数レスポンスを返す
3. **Client Streaming RPC**: クライアントが複数リクエストを送る
4. **Bidirectional Streaming RPC**: 双方向で複数メッセージをやり取り

---

## 2. Protocol Buffers基礎（.proto構文・メッセージ・サービス定義）

### Protocol Buffersとは

Protocol Buffers（protobuf）はGoogleが開発したインターフェース定義言語（IDL）かつシリアライゼーション形式だ。JSONと比較してデータサイズが3〜10倍小さく、シリアライゼーション/デシリアライゼーションが5〜10倍高速とされている。

### .protoファイルの基本構文

```protobuf
// user.proto
syntax = "proto3";

package user;

// 基本的なメッセージ定義
message User {
  int32 id = 1;           // フィールド番号は1から始まる
  string name = 2;
  string email = 3;
  bool is_active = 4;
  repeated string roles = 5;  // 配列型
  optional string bio = 6;    // オプショナルフィールド
}

// ネストしたメッセージ
message Address {
  string street = 1;
  string city = 2;
  string country = 3;
  string postal_code = 4;
}

// Enumの定義
enum UserStatus {
  USER_STATUS_UNKNOWN = 0;  // proto3ではデフォルト値は0
  USER_STATUS_ACTIVE = 1;
  USER_STATUS_INACTIVE = 2;
  USER_STATUS_SUSPENDED = 3;
}

// oneof: いずれか一つのフィールドのみ
message ContactInfo {
  oneof contact {
    string email = 1;
    string phone = 2;
  }
}

// mapフィールド
message Config {
  map<string, string> settings = 1;
}
```

### スカラー型の一覧

| proto3型 | TypeScript型 | 説明 |
|----------|-------------|------|
| double | number | 64bit浮動小数点 |
| float | number | 32bit浮動小数点 |
| int32 | number | 32bit整数 |
| int64 | string | 64bit整数（JSはbigint or string） |
| uint32 | number | 符号なし32bit整数 |
| uint64 | string | 符号なし64bit整数 |
| bool | boolean | 真偽値 |
| string | string | UTF-8文字列 |
| bytes | Uint8Array | バイト列 |

### サービス定義

```protobuf
// user_service.proto
syntax = "proto3";

package userservice;

import "google/protobuf/empty.proto";
import "google/protobuf/timestamp.proto";

// リクエスト/レスポンスメッセージ
message CreateUserRequest {
  string name = 1;
  string email = 2;
  string password = 3;
}

message GetUserRequest {
  int32 user_id = 1;
}

message ListUsersRequest {
  int32 page = 1;
  int32 page_size = 2;
  string filter = 3;
}

message UserResponse {
  int32 id = 1;
  string name = 2;
  string email = 3;
  bool is_active = 4;
  google.protobuf.Timestamp created_at = 5;
}

message ListUsersResponse {
  repeated UserResponse users = 1;
  int32 total_count = 2;
  bool has_next_page = 3;
}

message UpdateUserRequest {
  int32 user_id = 1;
  string name = 2;
  string email = 3;
}

// サービス定義
service UserService {
  // Unary RPC
  rpc CreateUser(CreateUserRequest) returns (UserResponse);
  rpc GetUser(GetUserRequest) returns (UserResponse);
  rpc UpdateUser(UpdateUserRequest) returns (UserResponse);
  rpc DeleteUser(GetUserRequest) returns (google.protobuf.Empty);

  // Server Streaming RPC
  rpc ListUsers(ListUsersRequest) returns (stream UserResponse);

  // Client Streaming RPC
  rpc BatchCreateUsers(stream CreateUserRequest) returns (ListUsersResponse);

  // Bidirectional Streaming RPC
  rpc SyncUsers(stream GetUserRequest) returns (stream UserResponse);
}
```

### Well-Known Types

Googleが提供する標準的なメッセージ型（google.protobufパッケージ）が利用できる。

```protobuf
import "google/protobuf/timestamp.proto";  // タイムスタンプ
import "google/protobuf/duration.proto";   // 期間
import "google/protobuf/empty.proto";      // 空レスポンス
import "google/protobuf/any.proto";        // 任意の型
import "google/protobuf/struct.proto";     // 動的な構造体
import "google/protobuf/wrappers.proto";   // NullableなスカラーWrapper
```

---

## 3. Node.js環境セットアップ（@grpc/grpc-js・@grpc/proto-loader）

### プロジェクト初期化

```bash
mkdir grpc-demo && cd grpc-demo
npm init -y
npm install @grpc/grpc-js @grpc/proto-loader
npm install -D typescript ts-node @types/node
npx tsc --init
```

### tsconfig.json設定

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### ディレクトリ構造

```
grpc-demo/
├── proto/
│   ├── user_service.proto
│   └── google/
│       └── protobuf/
│           ├── empty.proto
│           └── timestamp.proto
├── src/
│   ├── server/
│   │   ├── index.ts
│   │   └── user-service-impl.ts
│   ├── client/
│   │   └── index.ts
│   └── generated/
│       └── (自動生成ファイル)
├── package.json
└── tsconfig.json
```

### proto-loaderを使った動的ロード

```typescript
// src/proto-loader.ts
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const PROTO_PATH = path.join(__dirname, '../../proto/user_service.proto');

export const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,        // フィールド名のケースを保持
  longs: String,         // int64をStringとして扱う
  enums: String,         // enumを文字列として扱う
  defaults: true,        // デフォルト値を設定
  oneofs: true,          // oneofフィールドを仮想フィールドとして扱う
  includeDirs: [
    path.join(__dirname, '../../proto'),
    path.join(__dirname, '../../node_modules/google-proto-files'),
  ],
});

export const userProto = grpc.loadPackageDefinition(packageDefinition) as any;
```

---

## 4. TypeScript型コード生成（protoc・ts-proto）

### protocのインストール

```bash
# macOS
brew install protobuf

# Ubuntu/Debian
apt-get install protobuf-compiler

# バージョン確認
protoc --version
```

### ts-protoのセットアップ

```bash
npm install -D ts-proto
```

### コード生成スクリプト

```bash
#!/bin/bash
# scripts/generate.sh

PROTO_DIR="./proto"
OUT_DIR="./src/generated"

mkdir -p $OUT_DIR

# ts-protoでTypeScriptコードを生成
protoc \
  --plugin=./node_modules/.bin/protoc-gen-ts_proto \
  --ts_proto_out=$OUT_DIR \
  --ts_proto_opt=outputServices=grpc-js \
  --ts_proto_opt=esModuleInterop=true \
  --ts_proto_opt=useOptionals=messages \
  --ts_proto_opt=addGrpcMetadata=true \
  --proto_path=$PROTO_DIR \
  $PROTO_DIR/*.proto
```

### package.jsonスクリプト追加

```json
{
  "scripts": {
    "generate": "bash scripts/generate.sh",
    "build": "tsc",
    "start:server": "ts-node src/server/index.ts",
    "start:client": "ts-node src/client/index.ts"
  }
}
```

### 生成されるTypeScript型の例

ts-protoが生成するコードは以下のような型安全なインターフェースを提供する。

```typescript
// src/generated/user_service.ts (自動生成)
export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
}

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: Date | undefined;
}

export interface ListUsersResponse {
  users: UserResponse[];
  totalCount: number;
  hasNextPage: boolean;
}

// gRPC-jsのClientインターフェース
export interface UserServiceClient extends grpc.Client {
  createUser(
    request: CreateUserRequest,
    callback: (error: grpc.ServiceError | null, response: UserResponse) => void
  ): grpc.ClientUnaryCall;

  listUsers(
    request: ListUsersRequest,
    options?: grpc.CallOptions
  ): grpc.ClientReadableStream<UserResponse>;

  // ... 他のRPCメソッド
}
```

---

## 5. Unary RPC実装（クライアント・サーバー）

### サーバー実装

```typescript
// src/server/user-service-impl.ts
import * as grpc from '@grpc/grpc-js';

// インメモリのユーザーストア（デモ用）
interface User {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
}

const users: Map<number, User> = new Map();
let nextId = 1;

export const userServiceImpl = {
  // Unary: ユーザー作成
  createUser: (
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) => {
    const { name, email } = call.request;

    // バリデーション
    if (!name || !email) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'name and email are required',
      });
    }

    // メール重複チェック
    const existingUser = Array.from(users.values()).find(
      (u) => u.email === email
    );
    if (existingUser) {
      return callback({
        code: grpc.status.ALREADY_EXISTS,
        message: `User with email ${email} already exists`,
      });
    }

    // ユーザー作成
    const user: User = {
      id: nextId++,
      name,
      email,
      isActive: true,
      createdAt: new Date(),
    };
    users.set(user.id, user);

    callback(null, {
      id: user.id,
      name: user.name,
      email: user.email,
      is_active: user.isActive,
      created_at: {
        seconds: Math.floor(user.createdAt.getTime() / 1000),
        nanos: 0,
      },
    });
  },

  // Unary: ユーザー取得
  getUser: (
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) => {
    const { user_id } = call.request;
    const user = users.get(user_id);

    if (!user) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: `User ${user_id} not found`,
      });
    }

    callback(null, {
      id: user.id,
      name: user.name,
      email: user.email,
      is_active: user.isActive,
    });
  },

  // Unary: ユーザー更新
  updateUser: (
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) => {
    const { user_id, name, email } = call.request;
    const user = users.get(user_id);

    if (!user) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: `User ${user_id} not found`,
      });
    }

    if (name) user.name = name;
    if (email) user.email = email;

    callback(null, {
      id: user.id,
      name: user.name,
      email: user.email,
      is_active: user.isActive,
    });
  },

  // Unary: ユーザー削除
  deleteUser: (
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) => {
    const { user_id } = call.request;
    if (!users.has(user_id)) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: `User ${user_id} not found`,
      });
    }

    users.delete(user_id);
    callback(null, {}); // google.protobuf.Empty
  },
};
```

### サーバー起動

```typescript
// src/server/index.ts
import * as grpc from '@grpc/grpc-js';
import { userProto } from '../proto-loader';
import { userServiceImpl } from './user-service-impl';

const PORT = process.env.PORT || '50051';

function startServer(): void {
  const server = new grpc.Server();

  // サービスを登録
  server.addService(
    userProto.userservice.UserService.service,
    userServiceImpl
  );

  // サーバーをバインド
  server.bindAsync(
    `0.0.0.0:${PORT}`,
    grpc.ServerCredentials.createInsecure(), // 開発環境
    (error, port) => {
      if (error) {
        console.error('Failed to bind server:', error);
        process.exit(1);
      }
      console.log(`gRPC Server running on port ${port}`);
      server.start();
    }
  );
}

startServer();
```

### クライアント実装（Unary）

```typescript
// src/client/unary-client.ts
import * as grpc from '@grpc/grpc-js';
import { userProto } from '../proto-loader';

const client = new userProto.userservice.UserService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

// ユーザー作成
function createUser(name: string, email: string): Promise<any> {
  return new Promise((resolve, reject) => {
    client.createUser({ name, email, password: 'secret' }, (error: any, response: any) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(response);
    });
  });
}

// ユーザー取得
function getUser(userId: number): Promise<any> {
  return new Promise((resolve, reject) => {
    client.getUser({ user_id: userId }, (error: any, response: any) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(response);
    });
  });
}

// 実行例
async function main() {
  try {
    // ユーザー作成
    const newUser = await createUser('田中 太郎', 'tanaka@example.com');
    console.log('Created user:', newUser);

    // ユーザー取得
    const user = await getUser(newUser.id);
    console.log('Retrieved user:', user);
  } catch (error: any) {
    console.error('gRPC Error:', {
      code: error.code,
      message: error.message,
      details: error.details,
    });
  } finally {
    client.close();
  }
}

main();
```

---

## 6. Server Streaming（リアルタイムデータ配信）

サーバーストリーミングは、クライアントが一つのリクエストを送り、サーバーが複数のレスポンスを返す通信パターンだ。ページネーションやリアルタイムデータフィードに適している。

### サーバー側実装

```typescript
// src/server/streaming-impl.ts

export const streamingServiceImpl = {
  // Server Streaming: ユーザー一覧をストリームで返す
  listUsers: (call: grpc.ServerWritableStream<any, any>) => {
    const { page, page_size, filter } = call.request;

    let allUsers = Array.from(users.values());

    // フィルタリング
    if (filter) {
      allUsers = allUsers.filter(
        (u) =>
          u.name.includes(filter) ||
          u.email.includes(filter)
      );
    }

    // ページネーション
    const startIndex = ((page || 1) - 1) * (page_size || 10);
    const pageUsers = allUsers.slice(startIndex, startIndex + (page_size || 10));

    // ユーザーを一件ずつストリームで送信
    for (const user of pageUsers) {
      call.write({
        id: user.id,
        name: user.name,
        email: user.email,
        is_active: user.isActive,
      });
    }

    // ストリーム終了
    call.end();
  },

  // リアルタイム株価配信の例
  watchStockPrice: (call: grpc.ServerWritableStream<any, any>) => {
    const { symbol } = call.request;
    let count = 0;
    const maxUpdates = 10;

    const interval = setInterval(() => {
      if (count >= maxUpdates || call.cancelled) {
        clearInterval(interval);
        call.end();
        return;
      }

      // モックの株価データを送信
      const price = 100 + Math.random() * 50;
      call.write({
        symbol,
        price: price.toFixed(2),
        timestamp: Date.now(),
        change: (Math.random() * 5 - 2.5).toFixed(2),
      });

      count++;
    }, 1000);

    // クライアント切断時の処理
    call.on('cancelled', () => {
      clearInterval(interval);
      console.log(`Stock feed cancelled for ${symbol}`);
    });
  },
};
```

### クライアント側実装（Server Streaming）

```typescript
// src/client/server-streaming-client.ts

function listUsersStream(filter?: string): void {
  const stream = client.listUsers({
    page: 1,
    page_size: 100,
    filter: filter || '',
  });

  const users: any[] = [];

  stream.on('data', (user: any) => {
    users.push(user);
    console.log('Received user:', user.name);
  });

  stream.on('end', () => {
    console.log(`Total users received: ${users.length}`);
  });

  stream.on('error', (error: grpc.ServiceError) => {
    console.error('Stream error:', error.message);
  });
}

// Promiseにラップする場合
function listUsersAsync(filter?: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const stream = client.listUsers({ page: 1, page_size: 100, filter: filter || '' });
    const users: any[] = [];

    stream.on('data', (user: any) => users.push(user));
    stream.on('end', () => resolve(users));
    stream.on('error', reject);
  });
}

// async generatorを使った実装
async function* listUsersGenerator(filter?: string): AsyncGenerator<any> {
  const stream = client.listUsers({ page: 1, page_size: 100, filter: filter || '' });

  for await (const user of stream) {
    yield user;
  }
}

// 使用例
async function main() {
  // async generatorで反復処理
  for await (const user of listUsersGenerator()) {
    console.log(`Processing: ${user.name} (${user.email})`);
    // 各ユーザーに対する処理...
  }
}
```

---

## 7. Client Streaming（ファイルアップロード）

クライアントストリーミングは、クライアントが複数のリクエストを送り、サーバーが処理完了後に一つのレスポンスを返すパターンだ。大量データの一括送信やファイルアップロードに適している。

### サーバー側実装（Client Streaming）

```typescript
// src/server/client-streaming-impl.ts

export const clientStreamingImpl = {
  // Client Streaming: ユーザーの一括作成
  batchCreateUsers: (
    call: grpc.ServerReadableStream<any, any>,
    callback: grpc.sendUnaryData<any>
  ) => {
    const createdUsers: any[] = [];
    const errors: string[] = [];

    call.on('data', (request: any) => {
      const { name, email } = request;

      // バリデーション
      if (!name || !email) {
        errors.push(`Invalid data: name=${name}, email=${email}`);
        return;
      }

      // 重複チェック
      const exists = Array.from(users.values()).some((u) => u.email === email);
      if (exists) {
        errors.push(`Duplicate email: ${email}`);
        return;
      }

      // ユーザー作成
      const user: User = {
        id: nextId++,
        name,
        email,
        isActive: true,
        createdAt: new Date(),
      };
      users.set(user.id, user);
      createdUsers.push({
        id: user.id,
        name: user.name,
        email: user.email,
        is_active: user.isActive,
      });
    });

    call.on('end', () => {
      callback(null, {
        users: createdUsers,
        total_count: createdUsers.length,
        has_next_page: false,
      });

      if (errors.length > 0) {
        console.warn('Batch create errors:', errors);
      }
    });

    call.on('error', (error: Error) => {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message,
      });
    });
  },

  // ファイルアップロードの例
  uploadFile: (
    call: grpc.ServerReadableStream<any, any>,
    callback: grpc.sendUnaryData<any>
  ) => {
    const chunks: Buffer[] = [];
    let fileName = '';
    let totalBytes = 0;

    call.on('data', (chunk: any) => {
      if (chunk.file_name) {
        fileName = chunk.file_name;
      }
      if (chunk.content) {
        const buffer = Buffer.from(chunk.content);
        chunks.push(buffer);
        totalBytes += buffer.length;
      }
    });

    call.on('end', () => {
      const fileContent = Buffer.concat(chunks);
      // ファイル保存処理...
      console.log(`Received file: ${fileName} (${totalBytes} bytes)`);

      callback(null, {
        success: true,
        file_name: fileName,
        file_size: totalBytes,
        message: `File ${fileName} uploaded successfully`,
      });
    });
  },
};
```

### クライアント側実装（Client Streaming）

```typescript
// src/client/client-streaming-client.ts

function batchCreateUsers(usersData: Array<{ name: string; email: string }>): Promise<any> {
  return new Promise((resolve, reject) => {
    const stream = client.batchCreateUsers((error: any, response: any) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(response);
    });

    // データを逐次送信
    for (const userData of usersData) {
      stream.write({
        name: userData.name,
        email: userData.email,
        password: 'defaultPassword',
      });
    }

    // 送信完了
    stream.end();
  });
}

// ファイルアップロードの例
async function uploadFile(filePath: string): Promise<void> {
  const fs = await import('fs');
  const path = await import('path');

  const fileName = path.basename(filePath);
  const CHUNK_SIZE = 64 * 1024; // 64KB chunks

  return new Promise((resolve, reject) => {
    const stream = client.uploadFile((error: any, response: any) => {
      if (error) {
        reject(error);
        return;
      }
      console.log(`Upload response:`, response);
      resolve();
    });

    // ファイル名を最初のチャンクで送信
    stream.write({ file_name: fileName });

    // ファイルをチャンクに分けて送信
    const fileStream = fs.createReadStream(filePath, { highWaterMark: CHUNK_SIZE });

    fileStream.on('data', (chunk: Buffer) => {
      stream.write({ content: chunk });
    });

    fileStream.on('end', () => {
      stream.end();
    });

    fileStream.on('error', reject);
  });
}

// 使用例
async function main() {
  const batchData = [
    { name: '山田 花子', email: 'yamada@example.com' },
    { name: '鈴木 一郎', email: 'suzuki@example.com' },
    { name: '佐藤 次郎', email: 'sato@example.com' },
  ];

  const result = await batchCreateUsers(batchData);
  console.log(`Batch created ${result.total_count} users`);
}
```

---

## 8. 双方向ストリーミング（チャット・リアルタイム通信）

双方向ストリーミングは、クライアントとサーバーが同時に複数のメッセージを送受信できるパターンだ。チャットアプリケーションやリアルタイムゲームの通信に適している。

### チャットサービスのproto定義

```protobuf
// chat.proto
syntax = "proto3";

package chat;

message ChatMessage {
  string room_id = 1;
  string user_id = 2;
  string username = 3;
  string content = 4;
  int64 timestamp = 5;
  MessageType type = 6;
}

enum MessageType {
  MESSAGE_TYPE_TEXT = 0;
  MESSAGE_TYPE_JOIN = 1;
  MESSAGE_TYPE_LEAVE = 2;
  MESSAGE_TYPE_SYSTEM = 3;
}

service ChatService {
  rpc Chat(stream ChatMessage) returns (stream ChatMessage);
}
```

### サーバー側実装（双方向ストリーミング）

```typescript
// src/server/chat-impl.ts
import * as grpc from '@grpc/grpc-js';

// ルームごとのクライアント管理
const chatRooms = new Map<string, Set<grpc.ServerDuplexStream<any, any>>>();

export const chatServiceImpl = {
  chat: (call: grpc.ServerDuplexStream<any, any>) => {
    let currentRoomId: string | null = null;
    let currentUserId: string | null = null;

    call.on('data', (message: any) => {
      const { room_id, user_id, username, content, type } = message;

      // 最初のメッセージでルームに参加
      if (!currentRoomId) {
        currentRoomId = room_id;
        currentUserId = user_id;

        if (!chatRooms.has(room_id)) {
          chatRooms.set(room_id, new Set());
        }
        chatRooms.get(room_id)!.add(call);

        // 入室通知をブロードキャスト
        broadcastToRoom(room_id, {
          room_id,
          user_id: 'system',
          username: 'System',
          content: `${username} が入室しました`,
          timestamp: Date.now(),
          type: 1, // JOIN
        }, call); // 自分自身には送らない
      }

      // メッセージをルームにブロードキャスト
      if (type === 0) { // TEXT
        broadcastToRoom(room_id, message, null); // 全員に送信
      }
    });

    call.on('end', () => {
      // ルームから退出
      if (currentRoomId) {
        const room = chatRooms.get(currentRoomId);
        if (room) {
          room.delete(call);

          // 退室通知
          broadcastToRoom(currentRoomId, {
            room_id: currentRoomId,
            user_id: 'system',
            username: 'System',
            content: `ユーザー ${currentUserId} が退室しました`,
            timestamp: Date.now(),
            type: 2, // LEAVE
          }, null);

          if (room.size === 0) {
            chatRooms.delete(currentRoomId);
          }
        }
      }
      call.end();
    });

    call.on('error', (error: Error) => {
      console.error('Chat stream error:', error.message);
      if (currentRoomId) {
        chatRooms.get(currentRoomId)?.delete(call);
      }
    });
  },
};

function broadcastToRoom(
  roomId: string,
  message: any,
  exclude: grpc.ServerDuplexStream<any, any> | null
): void {
  const room = chatRooms.get(roomId);
  if (!room) return;

  for (const client of room) {
    if (client !== exclude && !client.cancelled) {
      try {
        client.write(message);
      } catch (error) {
        // 切断済みのクライアントを削除
        room.delete(client);
      }
    }
  }
}
```

### クライアント側実装（双方向ストリーミング）

```typescript
// src/client/chat-client.ts
import * as grpc from '@grpc/grpc-js';
import * as readline from 'readline';

const client = new chatProto.chat.ChatService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

class ChatClient {
  private stream: grpc.ClientDuplexStream<any, any>;
  private roomId: string;
  private userId: string;
  private username: string;

  constructor(roomId: string, userId: string, username: string) {
    this.roomId = roomId;
    this.userId = userId;
    this.username = username;
    this.stream = client.chat();
    this.setupListeners();
  }

  private setupListeners(): void {
    this.stream.on('data', (message: any) => {
      const timestamp = new Date(message.timestamp).toLocaleTimeString('ja-JP');
      if (message.type === 1 || message.type === 2) {
        // システムメッセージ
        console.log(`\n[${timestamp}] *** ${message.content} ***`);
      } else {
        // 通常メッセージ
        console.log(`\n[${timestamp}] ${message.username}: ${message.content}`);
      }
    });

    this.stream.on('error', (error: grpc.ServiceError) => {
      console.error('Connection error:', error.message);
    });

    this.stream.on('end', () => {
      console.log('Chat session ended');
      process.exit(0);
    });
  }

  join(): void {
    // 入室メッセージを送信
    this.stream.write({
      room_id: this.roomId,
      user_id: this.userId,
      username: this.username,
      content: '',
      timestamp: Date.now(),
      type: 1, // JOIN
    });
  }

  sendMessage(content: string): void {
    this.stream.write({
      room_id: this.roomId,
      user_id: this.userId,
      username: this.username,
      content,
      timestamp: Date.now(),
      type: 0, // TEXT
    });
  }

  leave(): void {
    this.stream.end();
  }
}

// 対話型チャットクライアント
async function startChat() {
  const chatClient = new ChatClient('room-1', 'user-123', '田中 太郎');
  chatClient.join();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('チャットに参加しました。メッセージを入力してEnterで送信。/quit で終了。');

  rl.on('line', (input: string) => {
    if (input.trim() === '/quit') {
      chatClient.leave();
      rl.close();
    } else if (input.trim()) {
      chatClient.sendMessage(input.trim());
    }
  });
}

startChat();
```

---

## 9. エラーハンドリング（Status codes・metadata）

### gRPCステータスコード

gRPCはHTTPのステータスコードに対応する独自のステータスコードを持つ。

```typescript
// src/utils/error-handler.ts
import * as grpc from '@grpc/grpc-js';

// gRPCステータスコード一覧
const STATUS_CODES = {
  OK: grpc.status.OK,                           // 0: 成功
  CANCELLED: grpc.status.CANCELLED,             // 1: キャンセル
  UNKNOWN: grpc.status.UNKNOWN,                 // 2: 不明なエラー
  INVALID_ARGUMENT: grpc.status.INVALID_ARGUMENT,   // 3: 無効な引数
  DEADLINE_EXCEEDED: grpc.status.DEADLINE_EXCEEDED, // 4: タイムアウト
  NOT_FOUND: grpc.status.NOT_FOUND,             // 5: リソースが見つからない
  ALREADY_EXISTS: grpc.status.ALREADY_EXISTS,   // 6: 既に存在する
  PERMISSION_DENIED: grpc.status.PERMISSION_DENIED, // 7: 権限不足
  UNAUTHENTICATED: grpc.status.UNAUTHENTICATED, // 16: 認証エラー
  RESOURCE_EXHAUSTED: grpc.status.RESOURCE_EXHAUSTED, // 8: リソース枯渇
  INTERNAL: grpc.status.INTERNAL,               // 13: 内部エラー
  UNIMPLEMENTED: grpc.status.UNIMPLEMENTED,     // 12: 未実装
  UNAVAILABLE: grpc.status.UNAVAILABLE,         // 14: サービス利用不可
};

// エラーレスポンスのヘルパー
export function createGrpcError(
  code: grpc.status,
  message: string,
  details?: string
): grpc.ServiceError {
  const error: any = new Error(message);
  error.code = code;
  error.details = details || message;
  return error;
}

// エラーのハンドリング例
export function handleServiceError(
  error: unknown,
  callback: grpc.sendUnaryData<any>
): void {
  if (error instanceof Error) {
    if (error.message.includes('not found')) {
      callback(createGrpcError(grpc.status.NOT_FOUND, error.message));
    } else if (error.message.includes('already exists')) {
      callback(createGrpcError(grpc.status.ALREADY_EXISTS, error.message));
    } else if (error.message.includes('permission')) {
      callback(createGrpcError(grpc.status.PERMISSION_DENIED, error.message));
    } else {
      callback(createGrpcError(grpc.status.INTERNAL, 'Internal server error'));
    }
  } else {
    callback(createGrpcError(grpc.status.UNKNOWN, 'Unknown error'));
  }
}
```

### Metadataの活用

```typescript
// src/utils/metadata.ts

// サーバー側: Metadataの読み取りと送信
export function readAuthMetadata(call: grpc.ServerUnaryCall<any, any>): string | null {
  const metadata = call.metadata;
  const authToken = metadata.get('authorization');
  return authToken.length > 0 ? authToken[0] as string : null;
}

// サーバー側: トレーシング情報をMetadataで返す
export function addTracingMetadata(
  call: grpc.ServerUnaryCall<any, any>,
  requestId: string
): void {
  const trailer = new grpc.Metadata();
  trailer.set('request-id', requestId);
  trailer.set('server-version', '1.0.0');
  call.sendMetadata(trailer);
}

// クライアント側: Metadataの設定
export function createAuthMetadata(token: string): grpc.Metadata {
  const metadata = new grpc.Metadata();
  metadata.set('authorization', `Bearer ${token}`);
  metadata.set('x-request-id', generateRequestId());
  metadata.set('x-client-version', '1.0.0');
  return metadata;
}

function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// デッドライン（タイムアウト）の設定
export function createCallOptions(timeoutMs: number): grpc.CallOptions {
  return {
    deadline: new Date(Date.now() + timeoutMs),
  };
}

// クライアントでのMetadata使用例
async function getUserWithAuth(userId: number, token: string): Promise<any> {
  const metadata = createAuthMetadata(token);
  const options = createCallOptions(5000); // 5秒タイムアウト

  return new Promise((resolve, reject) => {
    client.getUser(
      { user_id: userId },
      metadata,
      options,
      (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          // エラーコードに応じた処理
          switch (error.code) {
            case grpc.status.UNAUTHENTICATED:
              reject(new Error('認証が必要です'));
              break;
            case grpc.status.NOT_FOUND:
              reject(new Error(`ユーザー ${userId} が見つかりません`));
              break;
            case grpc.status.DEADLINE_EXCEEDED:
              reject(new Error('リクエストがタイムアウトしました'));
              break;
            default:
              reject(new Error(`gRPCエラー: ${error.message}`));
          }
          return;
        }
        resolve(response);
      }
    );
  });
}
```

---

## 10. 認証（JWT metadata・SSL/TLS）

### JWT認証の実装

```typescript
// src/auth/jwt-auth.ts
import * as grpc from '@grpc/grpc-js';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// JWTトークン生成
export function generateToken(userId: number, roles: string[]): string {
  return jwt.sign(
    { userId, roles, iat: Date.now() },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// JWTトークン検証
export function verifyToken(token: string): { userId: number; roles: string[] } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return { userId: decoded.userId, roles: decoded.roles };
  } catch {
    return null;
  }
}

// サーバーサイドの認証インターセプター
export function authInterceptor(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>,
  next: () => void
): void {
  const authHeader = call.metadata.get('authorization');

  if (!authHeader || authHeader.length === 0) {
    callback({
      code: grpc.status.UNAUTHENTICATED,
      message: 'Authorization header is required',
    });
    return;
  }

  const token = (authHeader[0] as string).replace('Bearer ', '');
  const payload = verifyToken(token);

  if (!payload) {
    callback({
      code: grpc.status.UNAUTHENTICATED,
      message: 'Invalid or expired token',
    });
    return;
  }

  // コンテキストにユーザー情報を追加（実際のgRPCでは別の方法で渡す）
  (call as any).user = payload;
  next();
}
```

### SSL/TLS設定

```typescript
// src/server/secure-server.ts
import * as grpc from '@grpc/grpc-js';
import * as fs from 'fs';

function createSecureServer(): grpc.Server {
  const server = new grpc.Server();

  // 証明書の読み込み
  const credentials = grpc.ServerCredentials.createSsl(
    fs.readFileSync('./certs/ca.crt'),           // CA証明書
    [{
      cert_chain: fs.readFileSync('./certs/server.crt'),  // サーバー証明書
      private_key: fs.readFileSync('./certs/server.key'), // 秘密鍵
    }],
    true // クライアント証明書を要求（mTLS）
  );

  server.bindAsync('0.0.0.0:50051', credentials, (error, port) => {
    if (error) throw error;
    console.log(`Secure gRPC server running on port ${port}`);
    server.start();
  });

  return server;
}

// クライアント側のSSL設定
function createSecureClient(): grpc.ChannelCredentials {
  return grpc.credentials.createSsl(
    fs.readFileSync('./certs/ca.crt'),          // CA証明書
    fs.readFileSync('./certs/client.key'),       // クライアント秘密鍵（mTLS）
    fs.readFileSync('./certs/client.crt'),       // クライアント証明書（mTLS）
  );
}

// 自己署名証明書の生成（開発環境）
// openssl req -x509 -newkey rsa:4096 -keyout server.key -out server.crt -days 365 -nodes
```

### チャンネル認証情報の組み合わせ

```typescript
// src/client/auth-client.ts

// JWTトークンをMetadataで送る場合
function createCallCredentials(getToken: () => Promise<string>): grpc.CallCredentials {
  return grpc.credentials.createFromMetadataGenerator(
    (params: grpc.CallMetadataGeneratorOptions, callback: (err: Error | null, metadata?: grpc.Metadata) => void) => {
      getToken()
        .then((token) => {
          const metadata = new grpc.Metadata();
          metadata.set('authorization', `Bearer ${token}`);
          callback(null, metadata);
        })
        .catch(callback);
    }
  );
}

// SSL + JWT認証の組み合わせ
const sslCreds = grpc.credentials.createSsl(fs.readFileSync('./certs/ca.crt'));
const jwtCreds = createCallCredentials(async () => {
  // トークンの取得・更新ロジック
  return 'your-jwt-token';
});

const combinedCreds = grpc.credentials.combineChannelCredentials(sslCreds, jwtCreds);

const secureClient = new userProto.userservice.UserService(
  'api.example.com:443',
  combinedCreds
);
```

---

## 11. インターセプター（ログ・認証・リトライ）

gRPCインターセプターはHTTPミドルウェアに相当し、横断的な関心事（ロギング・認証・リトライ等）を処理する。

### クライアントサイドインターセプター

```typescript
// src/interceptors/client-interceptors.ts
import * as grpc from '@grpc/grpc-js';

// ロギングインターセプター
export function loggingInterceptor(
  options: grpc.InterceptorOptions,
  nextCall: (options: grpc.InterceptorOptions) => grpc.InterceptingCall
): grpc.InterceptingCall {
  const startTime = Date.now();

  return new grpc.InterceptingCall(nextCall(options), {
    start: (metadata, listener, next) => {
      console.log(`[gRPC] ${options.method_definition.path} started`);
      next(metadata, {
        onReceiveMessage: (message: any, nextMessage: any) => {
          console.log(`[gRPC] Received response`);
          nextMessage(message);
        },
        onReceiveStatus: (status: grpc.StatusObject, nextStatus: any) => {
          const duration = Date.now() - startTime;
          console.log(`[gRPC] ${options.method_definition.path} completed in ${duration}ms with status ${status.code}`);
          nextStatus(status);
        },
      });
    },
  });
}

// リトライインターセプター
export function retryInterceptor(maxRetries: number = 3) {
  return (
    options: grpc.InterceptorOptions,
    nextCall: (options: grpc.InterceptorOptions) => grpc.InterceptingCall
  ): grpc.InterceptingCall => {
    let retryCount = 0;

    const retryableStatusCodes = new Set([
      grpc.status.UNAVAILABLE,
      grpc.status.RESOURCE_EXHAUSTED,
      grpc.status.ABORTED,
    ]);

    function executeWithRetry(): grpc.InterceptingCall {
      return new grpc.InterceptingCall(nextCall(options), {
        start: (metadata, listener, next) => {
          next(metadata, {
            onReceiveStatus: (status: grpc.StatusObject, nextStatus: any) => {
              if (
                retryableStatusCodes.has(status.code) &&
                retryCount < maxRetries
              ) {
                retryCount++;
                const delay = Math.pow(2, retryCount) * 100; // 指数バックオフ
                console.log(`Retrying (${retryCount}/${maxRetries}) after ${delay}ms...`);

                setTimeout(() => {
                  executeWithRetry();
                }, delay);
              } else {
                nextStatus(status);
              }
            },
          });
        },
      });
    }

    return executeWithRetry();
  };
}

// インターセプターの適用
const client = new userProto.userservice.UserService(
  'localhost:50051',
  grpc.credentials.createInsecure(),
  {
    interceptors: [loggingInterceptor, retryInterceptor(3)],
  }
);
```

### サーバーサイドインターセプター

```typescript
// src/interceptors/server-interceptors.ts

// サーバーインターセプターの型
type ServerInterceptor = (
  methodDescriptor: any,
  call: grpc.ServerUnaryCall<any, any>
) => void;

// リクエストログインターセプター
export function createLoggingInterceptor(): grpc.ServerInterceptor {
  return (methodDescriptor: any, call: grpc.ServerUnaryCall<any, any>) => {
    const startTime = Date.now();
    const method = methodDescriptor.path;

    console.log(`[${new Date().toISOString()}] RPC: ${method}`);

    call.on('data', (data: any) => {
      console.log(`Request:`, JSON.stringify(data).substring(0, 200));
    });

    return {
      sendUnaryData: (
        err: grpc.ServiceError | null,
        value: any,
        trailer?: grpc.Metadata,
        flags?: number
      ) => {
        const duration = Date.now() - startTime;
        console.log(`${method} completed in ${duration}ms, error: ${err?.code || 'none'}`);
        return { err, value, trailer, flags };
      },
    };
  };
}
```

---

## 12. gRPC-Web（ブラウザからgRPC・Envoy proxy）

gRPCはHTTP/2に依存しており、ブラウザから直接呼び出せない。gRPC-Webはブラウザ対応のプロトコルで、Envoy Proxyや専用ゲートウェイを介してgRPCサービスにアクセスする。

### gRPC-Webのインストール

```bash
npm install grpc-web google-protobuf
npm install -D @types/google-protobuf protoc-gen-grpc-web
```

### Envoy Proxyの設定

```yaml
# envoy.yaml
static_resources:
  listeners:
    - name: listener_0
      address:
        socket_address:
          address: 0.0.0.0
          port_value: 8080
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                codec_type: auto
                stat_prefix: ingress_http
                route_config:
                  name: local_route
                  virtual_hosts:
                    - name: local_service
                      domains: ["*"]
                      routes:
                        - match:
                            prefix: "/"
                          route:
                            cluster: grpc_service
                            timeout: 0s
                            max_stream_duration:
                              grpc_timeout_header_max: 0s
                      cors:
                        allow_origin_string_match:
                          - prefix: "*"
                        allow_methods: GET, PUT, DELETE, POST, OPTIONS
                        allow_headers: >
                          keep-alive,user-agent,cache-control,content-type,
                          content-transfer-encoding,custom-header-1,x-accept-content-transfer-encoding,
                          x-accept-response-streaming,x-user-agent,x-grpc-web,grpc-timeout
                        max_age: "1728000"
                        expose_headers: custom-header-1,grpc-status,grpc-message
                http_filters:
                  - name: envoy.filters.http.grpc_web
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.grpc_web.v3.GrpcWeb
                  - name: envoy.filters.http.cors
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.cors.v3.CorsPolicy
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
  clusters:
    - name: grpc_service
      connect_timeout: 0.25s
      type: logical_dns
      http2_protocol_options: {}
      lb_policy: round_robin
      load_assignment:
        cluster_name: cluster_0
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: host.docker.internal
                      port_value: 50051
```

### ブラウザからの利用（React/Vue）

```typescript
// src/web-client/grpc-client.ts
import { UserServiceClient } from './generated/user_service_grpc_web_pb';
import { CreateUserRequest, GetUserRequest } from './generated/user_service_pb';

const client = new UserServiceClient('http://localhost:8080', null, null);

// ユーザー作成
export function createUser(
  name: string,
  email: string
): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = new CreateUserRequest();
    request.setName(name);
    request.setEmail(email);

    client.createUser(request, {}, (err: any, response: any) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({
        id: response.getId(),
        name: response.getName(),
        email: response.getEmail(),
      });
    });
  });
}

// Reactコンポーネントでの使用例
function UserForm() {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = await createUser(name, email);
      console.log('Created:', user);
    } catch (error: any) {
      console.error('Error:', error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <button type="submit">Create User</button>
    </form>
  );
}
```

### ConnectRPC（モダンな代替手段）

Bufの提供するConnectRPCはEnvoy不要でgRPCをブラウザから利用できる。

```bash
npm install @connectrpc/connect @connectrpc/connect-web
```

```typescript
// ConnectRPCを使ったブラウザクライアント
import { createClient } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';
import { UserService } from './generated/user_service_connect';

const transport = createConnectTransport({
  baseUrl: 'https://api.example.com',
});

const client = createClient(UserService, transport);

// TypeScript型推論が完全に効く
const user = await client.createUser({
  name: '田中 太郎',
  email: 'tanaka@example.com',
  password: 'secret',
});

console.log(user.id, user.name);
```

---

## 13. 本番運用（ヘルスチェック・ロードバランシング・Kubernetes）

### ヘルスチェック実装

```typescript
// src/health/health-service.ts
import * as grpc from '@grpc/grpc-js';

// gRPC Health Checking Protocol
// https://github.com/grpc/grpc/blob/master/doc/health-checking.md

enum ServingStatus {
  UNKNOWN = 0,
  SERVING = 1,
  NOT_SERVING = 2,
  SERVICE_UNKNOWN = 3,
}

const serviceHealth = new Map<string, ServingStatus>();

export const healthServiceImpl = {
  check: (call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) => {
    const { service } = call.request;
    const status = serviceHealth.get(service) ?? ServingStatus.UNKNOWN;

    if (status === ServingStatus.SERVING) {
      callback(null, { status });
    } else {
      callback({
        code: grpc.status.UNAVAILABLE,
        message: `Service ${service} is not serving`,
      });
    }
  },

  watch: (call: grpc.ServerWritableStream<any, any>) => {
    const { service } = call.request;

    // ヘルス状態の変更を監視してストリームで通知
    const interval = setInterval(() => {
      const status = serviceHealth.get(service) ?? ServingStatus.UNKNOWN;
      call.write({ status });
    }, 5000);

    call.on('cancelled', () => clearInterval(interval));
  },
};

// サービスのヘルス状態を更新
export function setServiceHealth(service: string, status: ServingStatus): void {
  serviceHealth.set(service, status);
}

// 起動時にヘルス状態を設定
setServiceHealth('userservice.UserService', ServingStatus.SERVING);
```

### Kubernetesデプロイメント設定

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grpc-user-service
  labels:
    app: grpc-user-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: grpc-user-service
  template:
    metadata:
      labels:
        app: grpc-user-service
    spec:
      containers:
        - name: user-service
          image: your-registry/grpc-user-service:latest
          ports:
            - name: grpc
              containerPort: 50051
          env:
            - name: PORT
              value: "50051"
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: grpc-secrets
                  key: jwt-secret
          readinessProbe:
            exec:
              command:
                - /bin/grpc_health_probe
                - -addr=:50051
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            exec:
              command:
                - /bin/grpc_health_probe
                - -addr=:50051
            initialDelaySeconds: 10
            periodSeconds: 15
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: grpc-user-service
  annotations:
    # GKEのL4ロードバランサーはgRPCに対応
    cloud.google.com/load-balancer-type: "Internal"
spec:
  selector:
    app: grpc-user-service
  ports:
    - name: grpc
      protocol: TCP
      port: 50051
      targetPort: grpc
  type: LoadBalancer
---
# gRPCのHPA設定
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: grpc-user-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: grpc-user-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### クライアントサイドロードバランシング

```typescript
// src/client/load-balanced-client.ts

// gRPCはHTTP/2の多重化により、単一の接続で効率的にロードバランシングできる
// ただし、サービスメッシュ（Istio等）の利用が推奨される

const channelOptions: grpc.ChannelOptions = {
  // ラウンドロビンロードバランシング
  'grpc.lb_policy_name': 'round_robin',

  // 接続の設定
  'grpc.keepalive_time_ms': 10000,         // 10秒ごとにkeepalive
  'grpc.keepalive_timeout_ms': 5000,       // 5秒でタイムアウト
  'grpc.keepalive_permit_without_calls': 1,

  // 再接続の設定
  'grpc.min_reconnect_backoff_ms': 1000,
  'grpc.max_reconnect_backoff_ms': 30000,

  // HTTPヘッダーの最大サイズ
  'grpc.max_receive_message_length': 4 * 1024 * 1024,  // 4MB
  'grpc.max_send_message_length': 4 * 1024 * 1024,     // 4MB
};

// DNS経由のサービスディスカバリ（Kubernetes）
const client = new userProto.userservice.UserService(
  'dns:///grpc-user-service.default.svc.cluster.local:50051',
  grpc.credentials.createInsecure(),
  channelOptions
);
```

### 監視・メトリクス

```typescript
// src/monitoring/metrics.ts
import * as grpc from '@grpc/grpc-js';

interface RpcMetrics {
  method: string;
  statusCode: grpc.status;
  durationMs: number;
  timestamp: Date;
}

class MetricsCollector {
  private metrics: RpcMetrics[] = [];

  record(metric: RpcMetrics): void {
    this.metrics.push(metric);
    // PrometheusやDatadogに送信
    this.sendToMonitoringService(metric);
  }

  private sendToMonitoringService(metric: RpcMetrics): void {
    // 実装例: Prometheusのカウンター/ヒストグラムを更新
    console.log(`Metrics: ${metric.method} ${metric.statusCode} ${metric.durationMs}ms`);
  }

  getSuccessRate(): number {
    const successful = this.metrics.filter((m) => m.statusCode === grpc.status.OK).length;
    return successful / this.metrics.length;
  }

  getAverageDuration(): number {
    const total = this.metrics.reduce((sum, m) => sum + m.durationMs, 0);
    return total / this.metrics.length;
  }
}

export const metricsCollector = new MetricsCollector();
```

---

## まとめ

gRPCはマイクロサービスアーキテクチャにおける内部通信の最有力候補だ。本記事で解説した内容を振り返る。

**採用の判断基準**:
- サービス間の高頻度・高スループット通信 → **gRPC強く推奨**
- リアルタイム双方向通信（チャット・ゲーム・IoT）→ **gRPC最適**
- 外部公開API・ブラウザからのアクセス主体 → **REST/GraphQL検討**
- 多言語チームでの型安全なAPI共有 → **gRPC推奨**

**実装のポイント**:
1. `.protoファイル`をシングルソースオブトゥルースとして管理
2. ts-protoで型安全なコードを自動生成
3. 通信パターン（Unary/Streaming）を用途に応じて使い分け
4. インターセプターで横断的な関心事を集約
5. SSL/TLS + JWT認証で本番環境のセキュリティを確保

**ツールの活用**:

gRPC開発ではAPI仕様の検証やJSONデータの変換が頻繁に発生する。特にRESTとgRPCの混在環境や、gRPC-Webのデバッグ時には、JSONデータの整形・スキーマ検証ツールが役立つ。**[DevToolBox](https://usedevtools.com/)** はJSON Formatter・Schema Validator・Base64エンコーダーなど開発に必要なツールをまとめて提供しており、gRPCのリクエスト/レスポンスをJSON形式でデバッグする際の効率を高めてくれる。ブラウザから即座に使えるため、ローカル開発環境を汚さずに検証作業ができる。

gRPCは初期学習コストはあるが、一度体得すれば大規模マイクロサービス開発の生産性と信頼性を大きく向上させる強力なツールだ。ぜひ小規模なプロトタイプから始めて、その効果を体感してほしい。

---

## 参考リンク

- [gRPC公式ドキュメント](https://grpc.io/docs/)
- [Protocol Buffers言語ガイド](https://protobuf.dev/programming-guides/proto3/)
- [@grpc/grpc-js NPMパッケージ](https://www.npmjs.com/package/@grpc/grpc-js)
- [ts-proto: TypeScript用Protocol Bufferプラグイン](https://github.com/stephenh/ts-proto)
- [ConnectRPC: gRPC互換の次世代フレームワーク](https://connectrpc.com/)
- [Buf: Protocol Bufferツールチェーン](https://buf.build/)
- [gRPC-Web仕様](https://github.com/grpc/grpc-web)
- [DevToolBox — 開発者向けユーティリティツール集](https://usedevtools.com/)

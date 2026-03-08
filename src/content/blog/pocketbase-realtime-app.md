---
title: 'PocketBase実践ガイド: リアルタイムバックエンドの構築と運用'
description: 'PocketBaseを使ったリアルタイムアプリケーションの構築方法を実践的に解説。認証、ファイルストレージ、リアルタイムサブスクリプション、カスタムエンドポイント、本番運用まで網羅。PocketBase・Backend・SQLiteに関する実践情報。'
pubDate: '2025-10-22'
updatedDate: 'Oct 22 2025'
tags: ['PocketBase', 'Backend', 'SQLite', 'Realtime', 'Go', 'プログラミング']
heroImage: '../../assets/thumbnails/pocketbase-realtime-app.jpg'
---

PocketBaseは、Go言語で書かれたオープンソースのバックエンドで、SQLiteをベースにした認証、リアルタイムデータベース、ファイルストレージを単一バイナリで提供します。この記事では、実際のアプリケーション開発から本番運用まで実践的に解説します。

## PocketBaseの特徴

### 主な機能

1. **リアルタイムデータベース** - SQLiteベースでリアルタイムサブスクリプション対応
2. **認証システム** - Email/Password、OAuth2（Google、GitHub等）
3. **ファイルストレージ** - S3互換APIで画像・ファイル管理
4. **管理画面** - ブラウザベースのAdmin UI
5. **APIエンドポイント** - 自動生成REST API + カスタムルート
6. **拡張性** - Goコードでカスタマイズ可能

### Supabase/Firebaseとの比較

| 機能 | PocketBase | Supabase | Firebase |
|------|-----------|----------|----------|
| ホスティング | セルフホスト | マネージド/セルフ | マネージド |
| データベース | SQLite | PostgreSQL | Firestore |
| 価格 | 無料（セルフホスト） | 無料枠あり | 無料枠あり |
| リアルタイム | ✅ | ✅ | ✅ |
| スケーラビリティ | 中規模まで | 大規模対応 | 大規模対応 |
| セットアップ | 超簡単 | 簡単 | 簡単 |

## セットアップ

### インストール

```bash
# macOS / Linux
curl -L https://github.com/pocketbase/pocketbase/releases/download/v0.22.0/pocketbase_0.22.0_darwin_amd64.zip -o pocketbase.zip
unzip pocketbase.zip
chmod +x pocketbase

# Dockerを使う場合
docker pull ghcr.io/muchobien/pocketbase:latest
```

### 起動

```bash
# 開発環境
./pocketbase serve

# カスタムポート
./pocketbase serve --http="0.0.0.0:8090"

# Admin UI: http://127.0.0.1:8090/_/
```

### TypeScript SDKのインストール

```bash
npm install pocketbase
```

## コレクション設計

### スキーマ定義

管理画面（http://127.0.0.1:8090/_/）でコレクションを作成します。

```typescript
// コレクション例: posts
{
  id: string (自動生成)
  title: string (必須)
  content: text
  thumbnail: file (画像)
  author: relation (usersコレクション)
  tags: json
  published: bool (デフォルト: false)
  created: datetime (自動)
  updated: datetime (自動)
}

// コレクション例: comments
{
  id: string
  post: relation (postsコレクション)
  author: relation (usersコレクション)
  content: text (必須)
  created: datetime
  updated: datetime
}
```

### アクセスルール

```javascript
// posts コレクションのルール設定

// List/Search Rule
@request.auth.id != ""

// View Rule
published = true || @request.auth.id = author.id

// Create Rule
@request.auth.id != "" && @request.auth.id = @request.data.author

// Update Rule
@request.auth.id = author.id

// Delete Rule
@request.auth.id = author.id
```

## クライアント実装

### 初期化

```typescript
// src/lib/pocketbase.ts
import PocketBase from 'pocketbase'

export const pb = new PocketBase('http://127.0.0.1:8090')

// 認証状態の永続化（ブラウザのlocalStorage）
pb.autoCancellation(false)

// 型定義
export interface Post {
  id: string
  title: string
  content: string
  thumbnail: string
  author: string
  tags: string[]
  published: boolean
  created: string
  updated: string
}

export interface User {
  id: string
  email: string
  name: string
  avatar: string
  created: string
  updated: string
}
```

### 認証

```typescript
// src/lib/auth.ts
import { pb } from './pocketbase'

// Email/Passwordでサインアップ
export async function signUp(email: string, password: string, name: string) {
  const data = {
    email,
    password,
    passwordConfirm: password,
    name,
  }

  const record = await pb.collection('users').create(data)

  // 確認メール送信
  await pb.collection('users').requestVerification(email)

  return record
}

// ログイン
export async function signIn(email: string, password: string) {
  const authData = await pb.collection('users').authWithPassword(email, password)
  return authData
}

// OAuth2ログイン（GitHub）
export async function signInWithGitHub() {
  const authData = await pb.collection('users').authWithOAuth2({ provider: 'github' })
  return authData
}

// ログアウト
export function signOut() {
  pb.authStore.clear()
}

// 現在のユーザー取得
export function getCurrentUser() {
  return pb.authStore.model
}

// 認証状態の監視
export function onAuthStateChange(callback: (isValid: boolean) => void) {
  pb.authStore.onChange((token, model) => {
    callback(pb.authStore.isValid)
  })
}
```

### CRUD操作

```typescript
// src/lib/posts.ts
import { pb, type Post } from './pocketbase'

// 記事一覧取得（ページネーション）
export async function getPosts(page = 1, perPage = 20) {
  const records = await pb.collection('posts').getList<Post>(page, perPage, {
    filter: 'published = true',
    sort: '-created',
    expand: 'author', // リレーション展開
  })

  return records
}

// 記事詳細取得
export async function getPost(id: string) {
  const record = await pb.collection('posts').getOne<Post>(id, {
    expand: 'author',
  })

  return record
}

// 記事作成
export async function createPost(data: {
  title: string
  content: string
  thumbnail?: File
  tags: string[]
}) {
  const formData = new FormData()
  formData.append('title', data.title)
  formData.append('content', data.content)
  formData.append('tags', JSON.stringify(data.tags))
  formData.append('author', pb.authStore.model!.id)
  formData.append('published', 'false')

  if (data.thumbnail) {
    formData.append('thumbnail', data.thumbnail)
  }

  const record = await pb.collection('posts').create<Post>(formData)
  return record
}

// 記事更新
export async function updatePost(id: string, data: Partial<Post>) {
  const record = await pb.collection('posts').update<Post>(id, data)
  return record
}

// 記事削除
export async function deletePost(id: string) {
  await pb.collection('posts').delete(id)
}

// フィルター・検索
export async function searchPosts(query: string) {
  const records = await pb.collection('posts').getFullList<Post>({
    filter: `title ~ "${query}" || content ~ "${query}"`,
    sort: '-created',
  })

  return records
}
```

### ファイルアップロード

```typescript
// src/lib/files.ts
import { pb } from './pocketbase'

// 画像URL取得
export function getFileUrl(
  record: any,
  filename: string,
  thumb?: string // 例: '100x100'
) {
  return pb.files.getUrl(record, filename, { thumb })
}

// 使用例
const post = await getPost('post_id')
const thumbnailUrl = getFileUrl(post, post.thumbnail, '400x300')
```

## リアルタイムサブスクリプション

### 基本的な使い方

```typescript
// src/hooks/useRealtimePosts.ts
import { useEffect, useState } from 'react'
import { pb, type Post } from '@/lib/pocketbase'

export function useRealtimePosts() {
  const [posts, setPosts] = useState<Post[]>([])

  useEffect(() => {
    // 初期データ取得
    pb.collection('posts')
      .getFullList<Post>({ sort: '-created' })
      .then(setPosts)

    // リアルタイム購読
    pb.collection('posts').subscribe<Post>('*', (e) => {
      if (e.action === 'create') {
        setPosts((prev) => [e.record, ...prev])
      } else if (e.action === 'update') {
        setPosts((prev) =>
          prev.map((post) => (post.id === e.record.id ? e.record : post))
        )
      } else if (e.action === 'delete') {
        setPosts((prev) => prev.filter((post) => post.id !== e.record.id))
      }
    })

    // クリーンアップ
    return () => {
      pb.collection('posts').unsubscribe('*')
    }
  }, [])

  return posts
}
```

### フィルター付きサブスクリプション

```typescript
// src/hooks/useRealtimeComments.ts
export function useRealtimeComments(postId: string) {
  const [comments, setComments] = useState<Comment[]>([])

  useEffect(() => {
    const filter = `post = "${postId}"`

    pb.collection('comments')
      .getFullList<Comment>({ filter, sort: 'created' })
      .then(setComments)

    pb.collection('comments').subscribe<Comment>(
      '*',
      (e) => {
        // postId が一致する場合のみ更新
        if (e.record.post === postId) {
          if (e.action === 'create') {
            setComments((prev) => [...prev, e.record])
          } else if (e.action === 'update') {
            setComments((prev) =>
              prev.map((c) => (c.id === e.record.id ? e.record : c))
            )
          } else if (e.action === 'delete') {
            setComments((prev) => prev.filter((c) => c.id !== e.record.id))
          }
        }
      },
      { filter }
    )

    return () => {
      pb.collection('comments').unsubscribe('*')
    }
  }, [postId])

  return comments
}
```

### Reactでのリアルタイムチャット

```typescript
// src/components/ChatRoom.tsx
'use client'

import { useState } from 'react'
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages'
import { pb } from '@/lib/pocketbase'

export function ChatRoom({ roomId }: { roomId: string }) {
  const messages = useRealtimeMessages(roomId)
  const [newMessage, setNewMessage] = useState('')

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    await pb.collection('messages').create({
      room: roomId,
      author: pb.authStore.model!.id,
      content: newMessage,
    })

    setNewMessage('')
  }

  return (
    <div className="chat-room">
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className="message">
            <strong>{msg.expand?.author.name}</strong>: {msg.content}
          </div>
        ))}
      </div>
      <div className="input">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  )
}
```

## カスタムエンドポイント（Go拡張）

### main.goの作成

```go
// main.go
package main

import (
    "log"
    "net/http"

    "github.com/labstack/echo/v5"
    "github.com/pocketbase/pocketbase"
    "github.com/pocketbase/pocketbase/core"
)

func main() {
    app := pocketbase.New()

    // カスタムルート
    app.OnBeforeServe().Add(func(e *core.ServeEvent) error {
        // GET /api/stats
        e.Router.GET("/api/stats", func(c echo.Context) error {
            records, _ := app.Dao().FindRecordsByFilter(
                "posts",
                "published = true",
                "-created",
                10,
                0,
            )

            return c.JSON(http.StatusOK, map[string]any{
                "totalPosts": len(records),
                "message": "Stats endpoint",
            })
        })

        // POST /api/custom-action
        e.Router.POST("/api/custom-action", func(c echo.Context) error {
            // カスタムロジック
            data := struct {
                Name string `json:"name"`
            }{}

            if err := c.Bind(&data); err != nil {
                return err
            }

            // データベース操作
            collection, _ := app.Dao().FindCollectionByNameOrId("users")
            record := core.NewRecord(collection)
            record.Set("name", data.Name)

            if err := app.Dao().SaveRecord(record); err != nil {
                return err
            }

            return c.JSON(http.StatusOK, record)
        })

        return nil
    })

    // フック: レコード作成後に処理
    app.OnRecordAfterCreateRequest("posts").Add(func(e *core.RecordCreateEvent) error {
        log.Printf("New post created: %s", e.Record.GetString("title"))

        // 通知送信など

        return nil
    })

    if err := app.Start(); err != nil {
        log.Fatal(err)
    }
}
```

### ビルドと実行

```bash
# go.modの初期化
go mod init myapp
go mod tidy

# ビルド
go build

# 実行
./myapp serve
```

## 本番運用

### Dockerでのデプロイ

```dockerfile
# Dockerfile
FROM alpine:latest

ARG PB_VERSION=0.22.0

RUN apk add --no-cache unzip ca-certificates

ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/ && chmod +x /pb/pocketbase

EXPOSE 8090

CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  pocketbase:
    build: .
    ports:
      - "8090:8090"
    volumes:
      - ./pb_data:/pb/pb_data
      - ./pb_migrations:/pb/pb_migrations
    environment:
      - PB_ENCRYPTION_KEY=your-32-char-encryption-key
    restart: unless-stopped
```

### Fly.ioへのデプロイ

```toml
# fly.toml
app = "my-pocketbase-app"

[build]
  dockerfile = "Dockerfile"

[[services]]
  internal_port = 8090
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

[mounts]
  source = "pb_data"
  destination = "/pb/pb_data"
```

```bash
# デプロイ
fly launch
fly volumes create pb_data --size 1
fly deploy
```

### バックアップ戦略

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/$DATE"

mkdir -p $BACKUP_DIR

# データベースのコピー
cp pb_data/data.db $BACKUP_DIR/

# ファイルストレージのコピー
cp -r pb_data/storage $BACKUP_DIR/

# S3へアップロード（オプション）
aws s3 sync $BACKUP_DIR s3://my-bucket/pocketbase-backups/$DATE/

echo "Backup completed: $BACKUP_DIR"
```

### パフォーマンスチューニング

```go
// main.go でSQLiteチューニング
app.OnBeforeServe().Add(func(e *core.ServeEvent) error {
    // WALモード有効化（並行性向上）
    if _, err := app.Dao().DB().NewQuery("PRAGMA journal_mode=WAL").Execute(); err != nil {
        return err
    }

    // キャッシュサイズ設定
    if _, err := app.Dao().DB().NewQuery("PRAGMA cache_size=-64000").Execute(); err != nil {
        return err
    }

    return nil
})
```

## まとめ

PocketBaseは、以下のようなプロジェクトに最適です。

### 適しているケース

- **中小規模アプリ** - MVP、プロトタイプ、スタートアップ初期
- **セルフホスト** - データ主権が重要なプロジェクト
- **リアルタイムアプリ** - チャット、ダッシュボード、コラボレーションツール
- **低コスト運用** - 月5ドル程度のVPSで運用可能

### 制限事項

- **スケーラビリティ** - SQLiteの限界（書き込みヘビーなアプリには不向き）
- **複雑なクエリ** - PostgreSQLのような高度な機能は限定的
- **マルチリージョン** - 単一インスタンス（レプリケーション非対応）

PocketBaseは、セットアップの簡潔さとリアルタイム機能のバランスが優れており、多くのユースケースで強力な選択肢となります。

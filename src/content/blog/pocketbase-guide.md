---
title: 'PocketBaseでバックエンドを爆速構築 - 2026年版完全ガイド'
description: 'たった1つのバイナリで動く次世代BaaS、PocketBaseを徹底解説。インストールからリアルタイムDB、認証、ファイルストレージ、本番デプロイまで完全網羅。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。'
pubDate: '2026-02-05'
tags: ['PocketBase', 'Backend', 'BaaS', 'Database', 'Realtime', 'インフラ']
---
PocketBaseは、たった1つの実行ファイルで動く超軽量バックエンドです。Firebase/Supabaseのようなリアルタイムデータベース、認証、ストレージを、Go言語のシングルバイナリとして提供します。2026年現在、個人開発からスタートアップまで幅広く採用されています。

## PocketBaseとは？

PocketBaseは**オールインワンのバックエンドツール**です。

### 主な特徴

- **1ファイルで完結**: バイナリ1つダウンロードして実行するだけ
- **SQLiteベース**: 軽量・高速・ポータブル
- **リアルタイムDB**: WebSocket経由でデータ変更を即座に通知
- **認証機能**: Email/Password、OAuth2（Google、GitHub等）
- **ファイルストレージ**: 画像・動画などのアップロード・配信
- **Admin UI**: ブラウザベースの管理画面が標準搭載
- **REST & Realtime API**: SDKも充実
- **拡張可能**: Go言語でカスタムロジックを追加可能
- **無料**: ライセンス料金ゼロ（MITライセンス）

### Firebase/Supabaseとの比較

| 機能 | PocketBase | Firebase | Supabase |
|------|------------|----------|----------|
| セルフホスト | ○ | × | ○ |
| 料金 | 無料 | 従量課金 | 無料枠あり |
| データベース | SQLite | Firestore | PostgreSQL |
| リアルタイム | ○ | ○ | ○ |
| 認証 | ○ | ○ | ○ |
| ストレージ | ○ | ○ | ○ |
| サーバー不要 | × | ○ | × |
| 学習曲線 | 低 | 中 | 中 |

→ **小〜中規模アプリで自前サーバーを持てるならPocketBase最強**

## インストール

### 方法1: バイナリダウンロード（最速）

```bash
# macOS/Linux
curl -L https://github.com/pocketbase/pocketbase/releases/download/v0.22.0/pocketbase_0.22.0_darwin_amd64.zip -o pocketbase.zip
unzip pocketbase.zip
chmod +x pocketbase

# 起動
./pocketbase serve

# ブラウザで http://127.0.0.1:8090 を開く
```

### 方法2: Dockerで起動

```bash
# docker-compose.yml
version: '3.8'
services:
  pocketbase:
    image: ghcr.io/muchobien/pocketbase:latest
    ports:
      - "8090:8090"
    volumes:
      - ./pb_data:/pb_data
    restart: unless-stopped
```

```bash
docker-compose up -d
```

### 方法3: Goから使う（拡張開発用）

```bash
go mod init myapp
go get github.com/pocketbase/pocketbase
```

```go
// main.go
package main

import (
    "log"
    "github.com/pocketbase/pocketbase"
)

func main() {
    app := pocketbase.New()

    if err := app.Start(); err != nil {
        log.Fatal(err)
    }
}
```

## 初期セットアップ

### 1. 管理者アカウント作成

`http://127.0.0.1:8090/_/` にアクセスして管理者を作成:

- Email: admin@example.com
- Password: （強力なパスワード）

### 2. コレクション作成（データベーステーブル）

Admin UI > Collections > New Collection

#### 例: Blogコレクション

```json
{
  "name": "posts",
  "type": "base",
  "schema": [
    {
      "name": "title",
      "type": "text",
      "required": true
    },
    {
      "name": "content",
      "type": "editor",
      "required": true
    },
    {
      "name": "author",
      "type": "relation",
      "options": {
        "collectionId": "users",
        "cascadeDelete": false
      }
    },
    {
      "name": "tags",
      "type": "select",
      "options": {
        "maxSelect": 5,
        "values": ["tech", "design", "business"]
      }
    },
    {
      "name": "coverImage",
      "type": "file",
      "options": {
        "maxSelect": 1,
        "maxSize": 5242880
      }
    },
    {
      "name": "published",
      "type": "bool",
      "required": true
    }
  ]
}
```

### 3. APIルール設定

各コレクションには5つのルールを設定できます:

- **List/Search**: 一覧取得
- **View**: 詳細取得
- **Create**: 作成
- **Update**: 更新
- **Delete**: 削除

#### 例: 公開投稿は誰でも閲覧可、作成は認証済みユーザーのみ

```javascript
// List/Search rule
published = true

// View rule
published = true

// Create rule
@request.auth.id != ""

// Update rule
@request.auth.id = author.id

// Delete rule
@request.auth.id = author.id
```

## JavaScript SDKでデータ操作

### セットアップ

```bash
npm install pocketbase
```

```typescript
// lib/pocketbase.ts
import PocketBase from 'pocketbase'

export const pb = new PocketBase('http://127.0.0.1:8090')

// TypeScript型定義
export interface Post {
  id: string
  title: string
  content: string
  author: string
  tags: string[]
  coverImage: string
  published: boolean
  created: string
  updated: string
}
```

### CRUD操作

#### Create（作成）

```typescript
import { pb } from './lib/pocketbase'

async function createPost() {
  const data = {
    title: 'PocketBase入門',
    content: '<p>PocketBaseは最高です...</p>',
    author: pb.authStore.model?.id,  // ログイン中のユーザー
    tags: ['tech', 'backend'],
    published: true,
  }

  const record = await pb.collection('posts').create<Post>(data)
  console.log('Created:', record)
}
```

#### Read（読み取り）

```typescript
// 一覧取得
async function getPosts() {
  const records = await pb.collection('posts').getList<Post>(1, 50, {
    filter: 'published = true',
    sort: '-created',
    expand: 'author',  // リレーション展開
  })

  console.log(records.items)
}

// 詳細取得
async function getPost(id: string) {
  const record = await pb.collection('posts').getOne<Post>(id, {
    expand: 'author',
  })

  console.log(record)
}

// 全件取得（ページング自動処理）
async function getAllPosts() {
  const records = await pb.collection('posts').getFullList<Post>({
    sort: '-created',
  })

  console.log(records)
}
```

#### Update（更新）

```typescript
async function updatePost(id: string) {
  const record = await pb.collection('posts').update<Post>(id, {
    title: '更新されたタイトル',
  })

  console.log('Updated:', record)
}
```

#### Delete（削除）

```typescript
async function deletePost(id: string) {
  await pb.collection('posts').delete(id)
  console.log('Deleted')
}
```

### フィルタリング・検索

```typescript
// タグで絹り込み
const techPosts = await pb.collection('posts').getList<Post>(1, 20, {
  filter: 'tags ~ "tech" && published = true',
})

// テキスト検索
const searchResults = await pb.collection('posts').getList<Post>(1, 20, {
  filter: 'title ~ "React" || content ~ "React"',
})

// 日付範囲
const recentPosts = await pb.collection('posts').getList<Post>(1, 20, {
  filter: 'created >= "2026-01-01"',
  sort: '-created',
})

// 複雑なフィルタ
const complexFilter = await pb.collection('posts').getList<Post>(1, 20, {
  filter: '(tags ~ "tech" || tags ~ "design") && author.id = "xyz123"',
})
```

## 認証（Authentication）

### Email/Password認証

#### ユーザー登録

```typescript
async function signup(email: string, password: string, name: string) {
  const data = {
    email,
    password,
    passwordConfirm: password,
    name,
  }

  const user = await pb.collection('users').create(data)

  // 認証メール送信（設定で有効化必要）
  await pb.collection('users').requestVerification(email)

  return user
}
```

#### ログイン

```typescript
async function login(email: string, password: string) {
  const authData = await pb.collection('users').authWithPassword(email, password)

  console.log('Token:', pb.authStore.token)
  console.log('User:', pb.authStore.model)

  return authData
}
```

#### ログアウト

```typescript
function logout() {
  pb.authStore.clear()
}
```

#### 認証状態の保持

```typescript
// authStoreは自動的にlocalStorageに保存される
console.log('Is logged in:', pb.authStore.isValid)
console.log('Current user:', pb.authStore.model)

// 認証状態変更を監視
pb.authStore.onChange((token, model) => {
  console.log('Auth changed:', token, model)
})
```

### OAuth2認証（Google、GitHub等）

```typescript
async function loginWithGoogle() {
  // OAuth2フロー開始
  const authData = await pb.collection('users').authWithOAuth2({ provider: 'google' })

  console.log('OAuth User:', authData.record)
  console.log('OAuth Meta:', authData.meta)
}

// サポートプロバイダー
// - google
// - github
// - gitlab
// - discord
// - microsoft
// - apple
```

## ファイルアップロード

### 画像アップロード

```typescript
async function uploadImage(file: File) {
  const formData = new FormData()
  formData.append('title', 'My Photo')
  formData.append('image', file)

  const record = await pb.collection('posts').create(formData)

  // 画像URL取得
  const imageUrl = pb.files.getUrl(record, record.coverImage)
  console.log('Image URL:', imageUrl)

  // サムネイル（自動生成）
  const thumbUrl = pb.files.getUrl(record, record.coverImage, { thumb: '100x100' })
  console.log('Thumbnail:', thumbUrl)
}
```

### React Hook Form連携

```tsx
import { useForm } from 'react-hook-form'
import { pb } from './lib/pocketbase'

function PostForm() {
  const { register, handleSubmit } = useForm()

  const onSubmit = async (data: any) => {
    const formData = new FormData()
    formData.append('title', data.title)
    formData.append('content', data.content)
    formData.append('coverImage', data.coverImage[0])

    await pb.collection('posts').create(formData)
    alert('投稿完了！')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('title')} placeholder="タイトル" />
      <textarea {...register('content')} placeholder="本文" />
      <input type="file" {...register('coverImage')} accept="image/*" />
      <button type="submit">投稿</button>
    </form>
  )
}
```

## リアルタイムサブスクリプション

```typescript
// リアルタイムでpostsコレクションの変更を監視
pb.collection('posts').subscribe<Post>('*', (e) => {
  console.log('Event:', e.action)  // 'create' | 'update' | 'delete'
  console.log('Record:', e.record)
})

// 特定のレコードのみ監視
pb.collection('posts').subscribe<Post>('RECORD_ID', (e) => {
  console.log('Post updated:', e.record)
})

// 購読解除
await pb.collection('posts').unsubscribe()
```

### Reactでリアルタイム更新

```tsx
import { useEffect, useState } from 'react'
import { pb, Post } from './lib/pocketbase'

function PostList() {
  const [posts, setPosts] = useState<Post[]>([])

  useEffect(() => {
    // 初期データ取得
    pb.collection('posts').getList<Post>(1, 50).then((res) => {
      setPosts(res.items)
    })

    // リアルタイム監視
    pb.collection('posts').subscribe<Post>('*', (e) => {
      if (e.action === 'create') {
        setPosts((prev) => [e.record, ...prev])
      } else if (e.action === 'update') {
        setPosts((prev) => prev.map((p) => (p.id === e.record.id ? e.record : p)))
      } else if (e.action === 'delete') {
        setPosts((prev) => prev.filter((p) => p.id !== e.record.id))
      }
    })

    return () => {
      pb.collection('posts').unsubscribe()
    }
  }, [])

  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}
```

## カスタムロジック（Go拡張）

```go
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

    // カスタムエンドポイント
    app.OnBeforeServe().Add(func(e *core.ServeEvent) error {
        e.Router.GET("/api/hello", func(c echo.Context) error {
            return c.JSON(http.StatusOK, map[string]string{
                "message": "Hello from custom API!",
            })
        })

        return nil
    })

    // レコード作成前のフック
    app.OnRecordBeforeCreateRequest("posts").Add(func(e *core.RecordCreateEvent) error {
        // 自動でslug生成
        e.Record.Set("slug", generateSlug(e.Record.GetString("title")))
        return nil
    })

    // レコード作成後のフック（通知送信など）
    app.OnRecordAfterCreateRequest("posts").Add(func(e *core.RecordCreateEvent) error {
        // メール通知、Slack通知など
        sendNotification(e.Record)
        return nil
    })

    if err := app.Start(); err != nil {
        log.Fatal(err)
    }
}
```

## 本番デプロイ

### Fly.ioでデプロイ

```bash
# Dockerfile
FROM alpine:latest

RUN apk add --no-cache ca-certificates

COPY pocketbase /usr/local/bin/pocketbase

EXPOSE 8090

CMD ["/usr/local/bin/pocketbase", "serve", "--http=0.0.0.0:8090"]
```

```toml
# fly.toml
app = "my-pocketbase"
primary_region = "nrt"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "8090"

[http_service]
  internal_port = 8090
  force_https = true

[[mounts]]
  source = "pb_data"
  destination = "/pb_data"
```

```bash
fly launch
fly volumes create pb_data --size 1
fly deploy
```

### Railway/Render/VPSでデプロイ

```bash
# systemdサービス（Linux VPS）
# /etc/systemd/system/pocketbase.service

[Unit]
Description=PocketBase
After=network.target

[Service]
Type=simple
User=pocketbase
WorkingDirectory=/opt/pocketbase
ExecStart=/opt/pocketbase/pocketbase serve --http=0.0.0.0:8090
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable pocketbase
sudo systemctl start pocketbase
```

## バックアップ

```bash
# 自動バックアップスクリプト
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf backups/pb_data_$DATE.tar.gz pb_data/

# 古いバックアップを削除（30日以上前）
find backups/ -name "pb_data_*.tar.gz" -mtime +30 -delete
```

```bash
# cronで毎日実行
0 2 * * * /opt/pocketbase/backup.sh
```

## まとめ

PocketBaseは以下の点で革新的です:

**シンプルさ**:
- 1ファイルで完結
- セットアップ数分
- 学習曲線が低い

**機能性**:
- リアルタイムDB
- 認証・認可
- ファイルストレージ
- Admin UI標準搭載

**柔軟性**:
- SQLite（ポータブル）
- Go言語で拡張可能
- REST & Realtime API

**コスト**:
- ライセンス料金ゼロ
- VPS月$5で運用可能
- スケールしてもコスト増えにくい

**PocketBaseが向いているケース**:
- 個人プロジェクト・スタートアップ
- リアルタイムが必要なアプリ
- 自前サーバーを持てる環境
- 低コストで始めたい

Firebase/Supabaseの代替として、また小規模バックエンドの最適解として、PocketBaseは2026年の必修ツールです。

**参考リンク**:
- [PocketBase公式サイト](https://pocketbase.io/)
- [PocketBase GitHub](https://github.com/pocketbase/pocketbase)
- [JavaScript SDK](https://github.com/pocketbase/js-sdk)

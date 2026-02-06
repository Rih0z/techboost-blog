---
title: "PocketBaseで5分でバックエンド構築 - オールインワンBaaS入門"
description: "たった1つの実行ファイルで完結するバックエンド「PocketBase」の完全ガイド。認証、リアルタイムDB、ファイルストレージ、管理画面を爆速でセットアップし、Next.jsやSvelteと連携する方法を解説します。"
pubDate: "2025-02-06"
---

# PocketBaseで5分でバックエンド構築

PocketBaseは、たった1つの実行ファイルで完結するオープンソースのバックエンドです。Firebase/Supabaseのようなバックエンド・アズ・ア・サービス（BaaS）の機能を、セルフホストで提供します。

## PocketBaseとは

PocketBaseは、Go言語で書かれた組み込みSQLite搭載のバックエンドフレームワークです。主な特徴は以下の通りです。

- **オールインワン**: 認証、データベース、ファイルストレージ、管理UI
- **リアルタイム**: リアルタイムサブスクリプション標準搭載
- **超軽量**: 単一バイナリ（約15MB）で動作
- **セルフホスト**: 完全に自分のサーバーで管理
- **無料**: オープンソース（MIT License）

## セットアップ

### インストール

```bash
# macOS/Linux
wget https://github.com/pocketbase/pocketbase/releases/download/v0.21.0/pocketbase_0.21.0_darwin_amd64.zip
unzip pocketbase_0.21.0_darwin_amd64.zip
chmod +x pocketbase

# 起動
./pocketbase serve

# 管理画面: http://127.0.0.1:8090/_/
# API: http://127.0.0.1:8090/api/
```

### 初期設定

ブラウザで `http://127.0.0.1:8090/_/` にアクセスし、管理者アカウントを作成します。

## クライアントSDKの使用

### JavaScript/TypeScript

```bash
npm install pocketbase
```

```typescript
import PocketBase from 'pocketbase'

const pb = new PocketBase('http://127.0.0.1:8090')

// 認証
async function login() {
  const authData = await pb.collection('users').authWithPassword(
    'test@example.com',
    'password123'
  )

  console.log(authData.token)
  console.log(authData.record)
}

// レコード作成
async function createPost() {
  const data = {
    title: 'My First Post',
    content: 'Hello PocketBase!',
    author: pb.authStore.model.id,
    published: true,
    tags: ['tutorial', 'pocketbase']
  }

  const record = await pb.collection('posts').create(data)
  console.log(record)
}

// レコード取得
async function getPosts() {
  const records = await pb.collection('posts').getList(1, 50, {
    filter: 'published = true',
    sort: '-created',
    expand: 'author'  // リレーションを展開
  })

  console.log(records.items)
}
```

## リアルタイムサブスクリプション

```typescript
// リアルタイムで変更を監視
pb.collection('posts').subscribe('*', (e) => {
  console.log(e.action) // create, update, delete
  console.log(e.record)
})

// 特定のレコードを監視
pb.collection('posts').subscribe('RECORD_ID', (e) => {
  console.log('Record changed:', e.record)
})

// 購読解除
pb.collection('posts').unsubscribe('*')
```

## まとめ

PocketBaseは、たった1つの実行ファイルで以下の機能を提供します。

- **認証**: メール/パスワード、OAuth2
- **データベース**: SQLite + リアルタイム
- **ファイルストレージ**: 自動サムネイル生成
- **管理UI**: ノーコードでCRUD操作
- **REST API**: 自動生成されるエンドポイント
- **拡張性**: Goでカスタムロジック追加

Firebase/Supabaseの代替として、セルフホストしたい場合に最適な選択肢です。特に小〜中規模のプロジェクトや、プロトタイプ開発に非常に有効です。次のプロジェクトで、ぜひ試してみてください。

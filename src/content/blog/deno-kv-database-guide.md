---
title: "Deno KV実践ガイド: グローバル分散キーバリューストアの活用"
description: "Deno KVの基本から、グローバル分散、リアルタイム同期、トランザクション、セカンダリインデックスまで、実践的な活用方法を解説します。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。"
pubDate: "2025-09-28"
updatedDate: "2025-09-28"
tags: ["Deno", "Deno KV", "データベース", "Key-Value Store", "分散システム", "プログラミング"]
category: "Backend"
---
Deno KVは、Denoに組み込まれたグローバル分散キーバリューストアです。SQLiteベースのローカルストレージと、グローバルに分散されたクラウドストレージの両方をサポートし、低レイテンシーとリアルタイム同期を実現します。

## Deno KVの特徴

### 1. ゼロ設定のデータベース

外部データベースのセットアップ不要で、すぐに使えます。

```typescript
// Deno KVを開く
const kv = await Deno.openKv()

// データの保存
await kv.set(['users', 'user123'], {
  id: 'user123',
  name: 'Alice',
  email: 'alice@example.com',
  createdAt: new Date().toISOString(),
})

// データの取得
const result = await kv.get(['users', 'user123'])
console.log(result.value) // { id: 'user123', name: 'Alice', ... }

// データの削除
await kv.delete(['users', 'user123'])
```

### 2. 階層的なキー構造

配列をキーとして使用し、階層的にデータを整理できます。

```typescript
const kv = await Deno.openKv()

// ユーザーデータ
await kv.set(['users', 'user123'], {
  id: 'user123',
  name: 'Alice',
})

// ユーザーの投稿
await kv.set(['users', 'user123', 'posts', 'post456'], {
  id: 'post456',
  title: 'Hello Deno KV',
  content: 'This is my first post',
})

// ユーザーの設定
await kv.set(['users', 'user123', 'settings'], {
  theme: 'dark',
  notifications: true,
})

// プレフィックス検索
const posts = kv.list({ prefix: ['users', 'user123', 'posts'] })
for await (const entry of posts) {
  console.log(entry.key, entry.value)
}
```

### 3. ACID トランザクション

複数の操作をアトミックに実行できます。

```typescript
// 銀行口座間の送金（アトミック操作）
const kv = await Deno.openKv()

async function transfer(fromId: string, toId: string, amount: number) {
  const fromKey = ['accounts', fromId]
  const toKey = ['accounts', toId]

  let success = false

  while (!success) {
    // 現在の残高を取得
    const [fromAccount, toAccount] = await kv.getMany([fromKey, toKey])

    if (fromAccount.value === null || toAccount.value === null) {
      throw new Error('Account not found')
    }

    const fromBalance = fromAccount.value.balance
    const toBalance = toAccount.value.balance

    if (fromBalance < amount) {
      throw new Error('Insufficient funds')
    }

    // アトミックトランザクション
    const result = await kv.atomic()
      .check(fromAccount) // バージョンチェック
      .check(toAccount)
      .set(fromKey, { ...fromAccount.value, balance: fromBalance - amount })
      .set(toKey, { ...toAccount.value, balance: toBalance + amount })
      .commit()

    success = result.ok

    // コミット失敗時は自動的にリトライ
  }
}

// 使用例
await kv.set(['accounts', 'alice'], { id: 'alice', balance: 1000 })
await kv.set(['accounts', 'bob'], { id: 'bob', balance: 500 })

await transfer('alice', 'bob', 100)

const alice = await kv.get(['accounts', 'alice'])
console.log(alice.value.balance) // 900

const bob = await kv.get(['accounts', 'bob'])
console.log(bob.value.balance) // 600
```

## 実践: ブログシステムの構築

Deno KVを使った実際のアプリケーション例を見ていきます。

### データモデル設計

```typescript
// types.ts
export interface User {
  id: string
  username: string
  email: string
  passwordHash: string
  createdAt: string
}

export interface Post {
  id: string
  authorId: string
  title: string
  content: string
  slug: string
  published: boolean
  createdAt: string
  updatedAt: string
}

export interface Comment {
  id: string
  postId: string
  authorId: string
  content: string
  createdAt: string
}
```

### キー設計

```typescript
// db.ts
export const keys = {
  // プライマリキー
  user: (userId: string) => ['users', userId],
  post: (postId: string) => ['posts', postId],
  comment: (commentId: string) => ['comments', commentId],

  // セカンダリインデックス
  userByUsername: (username: string) => ['users_by_username', username],
  userByEmail: (email: string) => ['users_by_email', email],
  postBySlug: (slug: string) => ['posts_by_slug', slug],
  postsByAuthor: (authorId: string, postId: string) =>
    ['posts_by_author', authorId, postId],
  commentsByPost: (postId: string, commentId: string) =>
    ['comments_by_post', postId, commentId],

  // カウンター
  postCount: (authorId: string) => ['post_count', authorId],
  commentCount: (postId: string) => ['comment_count', postId],
}
```

### ユーザー管理

```typescript
// users.ts
import { keys } from './db.ts'
import { User } from './types.ts'
import { hash, compare } from 'bcrypt'

export async function createUser(
  kv: Deno.Kv,
  username: string,
  email: string,
  password: string
): Promise<User> {
  const userId = crypto.randomUUID()

  // ユーザー名とメールの重複チェック
  const [existingUsername, existingEmail] = await kv.getMany([
    keys.userByUsername(username),
    keys.userByEmail(email),
  ])

  if (existingUsername.value !== null) {
    throw new Error('Username already taken')
  }

  if (existingEmail.value !== null) {
    throw new Error('Email already registered')
  }

  const user: User = {
    id: userId,
    username,
    email,
    passwordHash: await hash(password),
    createdAt: new Date().toISOString(),
  }

  // アトミックにユーザーとインデックスを作成
  const result = await kv.atomic()
    .check(existingUsername) // ユーザー名が取得されていないことを確認
    .check(existingEmail) // メールが取得されていないことを確認
    .set(keys.user(userId), user)
    .set(keys.userByUsername(username), userId)
    .set(keys.userByEmail(email), userId)
    .commit()

  if (!result.ok) {
    throw new Error('Failed to create user (race condition)')
  }

  return user
}

export async function getUserByUsername(
  kv: Deno.Kv,
  username: string
): Promise<User | null> {
  // インデックスからユーザーIDを取得
  const userIdEntry = await kv.get<string>(keys.userByUsername(username))

  if (userIdEntry.value === null) {
    return null
  }

  // ユーザーIDから実際のユーザーデータを取得
  const userEntry = await kv.get<User>(keys.user(userIdEntry.value))
  return userEntry.value
}

export async function authenticateUser(
  kv: Deno.Kv,
  username: string,
  password: string
): Promise<User | null> {
  const user = await getUserByUsername(kv, username)

  if (!user) {
    return null
  }

  const isValid = await compare(password, user.passwordHash)
  return isValid ? user : null
}
```

### 投稿管理

```typescript
// posts.ts
import { keys } from './db.ts'
import { Post } from './types.ts'

export async function createPost(
  kv: Deno.Kv,
  authorId: string,
  title: string,
  content: string,
  slug: string
): Promise<Post> {
  const postId = crypto.randomUUID()

  // スラグの重複チェック
  const existingSlug = await kv.get(keys.postBySlug(slug))

  if (existingSlug.value !== null) {
    throw new Error('Slug already exists')
  }

  const post: Post = {
    id: postId,
    authorId,
    title,
    content,
    slug,
    published: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  // 投稿とインデックスを作成
  await kv.atomic()
    .check(existingSlug)
    .set(keys.post(postId), post)
    .set(keys.postBySlug(slug), postId)
    .set(keys.postsByAuthor(authorId, postId), postId)
    .sum(keys.postCount(authorId), 1n) // カウンターを1増やす
    .commit()

  return post
}

export async function getPostsByAuthor(
  kv: Deno.Kv,
  authorId: string,
  options?: { limit?: number; reverse?: boolean }
): Promise<Post[]> {
  const posts: Post[] = []

  const entries = kv.list<string>({
    prefix: ['posts_by_author', authorId],
    limit: options?.limit,
    reverse: options?.reverse,
  })

  for await (const entry of entries) {
    const postId = entry.value
    const postEntry = await kv.get<Post>(keys.post(postId))

    if (postEntry.value !== null) {
      posts.push(postEntry.value)
    }
  }

  return posts
}

export async function updatePost(
  kv: Deno.Kv,
  postId: string,
  updates: Partial<Pick<Post, 'title' | 'content' | 'published'>>
): Promise<Post> {
  const postEntry = await kv.get<Post>(keys.post(postId))

  if (postEntry.value === null) {
    throw new Error('Post not found')
  }

  const updatedPost: Post = {
    ...postEntry.value,
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  await kv.atomic()
    .check(postEntry) // バージョンチェック
    .set(keys.post(postId), updatedPost)
    .commit()

  return updatedPost
}

export async function deletePost(
  kv: Deno.Kv,
  postId: string
): Promise<void> {
  const postEntry = await kv.get<Post>(keys.post(postId))

  if (postEntry.value === null) {
    throw new Error('Post not found')
  }

  const post = postEntry.value

  // 関連するコメントも削除
  const comments = kv.list({ prefix: ['comments_by_post', postId] })

  const atomic = kv.atomic()
    .check(postEntry)
    .delete(keys.post(postId))
    .delete(keys.postBySlug(post.slug))
    .delete(keys.postsByAuthor(post.authorId, postId))
    .sum(keys.postCount(post.authorId), -1n)

  for await (const comment of comments) {
    atomic.delete(comment.key)
  }

  await atomic.commit()
}
```

### コメント管理

```typescript
// comments.ts
import { keys } from './db.ts'
import { Comment } from './types.ts'

export async function createComment(
  kv: Deno.Kv,
  postId: string,
  authorId: string,
  content: string
): Promise<Comment> {
  const commentId = crypto.randomUUID()

  const comment: Comment = {
    id: commentId,
    postId,
    authorId,
    content,
    createdAt: new Date().toISOString(),
  }

  await kv.atomic()
    .set(keys.comment(commentId), comment)
    .set(keys.commentsByPost(postId, commentId), commentId)
    .sum(keys.commentCount(postId), 1n)
    .commit()

  return comment
}

export async function getCommentsByPost(
  kv: Deno.Kv,
  postId: string
): Promise<Comment[]> {
  const comments: Comment[] = []

  const entries = kv.list<string>({
    prefix: ['comments_by_post', postId],
  })

  for await (const entry of entries) {
    const commentId = entry.value
    const commentEntry = await kv.get<Comment>(keys.comment(commentId))

    if (commentEntry.value !== null) {
      comments.push(commentEntry.value)
    }
  }

  return comments
}
```

## リアルタイム機能の実装

Deno KVは`watch()`メソッドで変更を監視できます。

```typescript
// realtime.ts
export async function watchPost(
  kv: Deno.Kv,
  postId: string,
  callback: (post: Post | null) => void
): Promise<void> {
  const stream = kv.watch([keys.post(postId)])

  for await (const entries of stream) {
    const postEntry = entries[0]
    callback(postEntry.value as Post | null)
  }
}

// 使用例
const kv = await Deno.openKv()

watchPost(kv, 'post123', (post) => {
  if (post) {
    console.log('Post updated:', post.title)
  } else {
    console.log('Post deleted')
  }
})
```

WebSocketと組み合わせてリアルタイム同期を実装できます。

```typescript
// server.ts
import { serve } from 'https://deno.land/std/http/server.ts'

const kv = await Deno.openKv()

serve((req) => {
  if (req.headers.get('upgrade') !== 'websocket') {
    return new Response('Expected websocket', { status: 400 })
  }

  const { socket, response } = Deno.upgradeWebSocket(req)

  socket.onopen = () => {
    console.log('WebSocket connected')
  }

  socket.onmessage = async (event) => {
    const { type, postId } = JSON.parse(event.data)

    if (type === 'subscribe') {
      // 投稿の変更を監視
      const stream = kv.watch([keys.post(postId)])

      for await (const entries of stream) {
        const post = entries[0].value
        socket.send(JSON.stringify({ type: 'update', post }))
      }
    }
  }

  return response
})
```

## パフォーマンス最適化

### 1. バッチ処理

```typescript
// 複数の取得を一度に実行
const [user, post, comments] = await kv.getMany([
  keys.user('user123'),
  keys.post('post456'),
  keys.commentsByPost('post456', 'comment789'),
])
```

### 2. ページネーション

```typescript
export async function getPostsPaginated(
  kv: Deno.Kv,
  authorId: string,
  cursor?: string,
  limit = 10
): Promise<{ posts: Post[]; cursor?: string }> {
  const posts: Post[] = []

  const entries = kv.list<string>({
    prefix: ['posts_by_author', authorId],
    limit: limit + 1, // 次のページがあるかチェック
    cursor,
  })

  for await (const entry of entries) {
    if (posts.length >= limit) {
      // 次のページがある
      return {
        posts,
        cursor: entry.cursor,
      }
    }

    const postId = entry.value
    const postEntry = await kv.get<Post>(keys.post(postId))

    if (postEntry.value !== null) {
      posts.push(postEntry.value)
    }
  }

  return { posts }
}
```

### 3. キャッシュ戦略

```typescript
// TTL付きキャッシュ
export async function getCachedData<T>(
  kv: Deno.Kv,
  key: Deno.KvKey,
  fetchFn: () => Promise<T>,
  ttlMs = 60000
): Promise<T> {
  const cached = await kv.get<{ data: T; expiresAt: number }>(key)

  if (cached.value !== null && cached.value.expiresAt > Date.now()) {
    return cached.value.data
  }

  const data = await fetchFn()

  await kv.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  })

  return data
}
```

## Deno Deployでのグローバル分散

Deno Deployにデプロイすると、Deno KVが自動的にグローバル分散されます。

```typescript
// main.ts
import { serve } from 'https://deno.land/std/http/server.ts'

const kv = await Deno.openKv() // Deno Deployでは自動的にグローバルKV

serve(async (req) => {
  const url = new URL(req.url)

  if (url.pathname === '/api/posts') {
    const posts = await getPostsPaginated(kv, 'author123')
    return Response.json(posts)
  }

  return new Response('Not found', { status: 404 })
})
```

デプロイ:

```bash
$ deno deploy --project=my-blog
```

**特徴:**
- 世界中のエッジロケーションで自動レプリケーション
- 読み取りは最寄りのリージョンから（低レイテンシー）
- 書き込みは強い整合性を保証
- 追加設定不要

## まとめ

Deno KVは、シンプルながら強力な分散データベースです。

**主な利点:**
- ゼロ設定で使える
- グローバル分散とリアルタイム同期
- ACIDトランザクション
- 型安全なTypeScript統合
- Deno Deployで自動スケール

**適用シーン:**
- エッジアプリケーション
- リアルタイムアプリ
- プロトタイプ開発
- 中小規模のアプリケーション

従来のデータベースと比較して、運用コストとインフラ複雑性を大幅に削減できます。

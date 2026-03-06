---
title: 'SignalDB: リアクティブローカルファーストデータベース入門'
description: 'SignalDBは信号ベースのリアクティビティを備えたローカルファーストデータベース。CRUD操作、永続化、リアクティブクエリの実践的な使い方を解説します。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。'
pubDate: 'Feb 05 2025'
tags: ['SignalDB', 'Database', 'LocalFirst', 'React', 'TypeScript']
---
SignalDBは、ブラウザとNode.jsで動作するリアクティブなローカルファーストデータベースです。信号（Signal）ベースのリアクティビティにより、データ変更を自動的にUIに反映できます。

## SignalDBとは

従来のクライアントサイドデータベース（IndexedDB、LocalStorage）と異なり、SignalDBは以下の特徴を持ちます。

**主な特徴:**
- **リアクティブクエリ**: データ変更を自動検知してUIを更新
- **MongoDB風API**: 直感的なクエリ構文
- **TypeScript完全対応**: 型安全なデータアクセス
- **永続化オプション**: LocalStorage、IndexedDB、メモリ
- **フレームワーク統合**: React、Vue、Solidに対応

## 基本セットアップ

まずはSignalDBをインストールします。

```bash
npm install signaldb
# Reactで使う場合
npm install signaldb-plugin-react
```

### シンプルなコレクション作成

```typescript
import { Collection } from 'signaldb'

interface User {
  id: string
  name: string
  email: string
  createdAt: Date
}

// メモリ内コレクション
const users = new Collection<User>()

// データ追加
users.insert({
  id: '1',
  name: '山田太郎',
  email: 'yamada@example.com',
  createdAt: new Date()
})
```

## CRUD操作

SignalDBはMongoDBと似たAPIを提供します。

### Create（作成）

```typescript
// 単一ドキュメント挿入
const userId = users.insert({
  id: '2',
  name: '佐藤花子',
  email: 'sato@example.com',
  createdAt: new Date()
})

// 複数ドキュメント挿入
users.insert([
  { id: '3', name: '鈴木一郎', email: 'suzuki@example.com', createdAt: new Date() },
  { id: '4', name: '田中次郎', email: 'tanaka@example.com', createdAt: new Date() }
])
```

### Read（読み取り）

```typescript
// 全件取得
const allUsers = users.find().fetch()

// 条件検索
const yamada = users.findOne({ name: '山田太郎' })

// 複雑なクエリ
const recentUsers = users.find({
  createdAt: { $gte: new Date('2025-01-01') }
}).fetch()

// ソートと制限
const topUsers = users.find()
  .sort({ createdAt: -1 })
  .limit(10)
  .fetch()
```

### Update（更新）

```typescript
// 単一ドキュメント更新
users.updateOne(
  { id: '1' },
  { $set: { name: '山田太郎（更新）' } }
)

// 複数ドキュメント更新
users.updateMany(
  { createdAt: { $lt: new Date('2024-01-01') } },
  { $set: { status: 'inactive' } }
)

// 増減操作
users.updateOne(
  { id: '1' },
  { $inc: { loginCount: 1 } }
)
```

### Delete（削除）

```typescript
// 条件に一致する最初のドキュメントを削除
users.removeOne({ id: '1' })

// 条件に一致する全ドキュメントを削除
users.removeMany({ status: 'inactive' })

// 全件削除
users.removeMany({})
```

## リアクティブクエリ

SignalDBの真骨頂はリアクティブクエリです。データが変更されると、自動的にクエリ結果が更新されます。

### Reactとの統合

```typescript
import { useReactivityAdapter } from 'signaldb-plugin-react'
import { Collection } from 'signaldb'

// Reactアダプターを設定
const users = new Collection<User>({
  reactivity: useReactivityAdapter()
})
```

### リアクティブコンポーネント

```typescript
import { useFind, useOne } from 'signaldb-plugin-react'

function UserList() {
  // リアクティブクエリ - データ変更時に自動再レンダリング
  const users = useFind(users.find())

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name} - {user.email}</li>
      ))}
    </ul>
  )
}

function UserDetail({ userId }: { userId: string }) {
  // 単一ドキュメントのリアクティブ取得
  const user = useOne(users.findOne({ id: userId }))

  if (!user) return <div>ユーザーが見つかりません</div>

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  )
}
```

### リアルタイム検索

```typescript
function SearchableUserList() {
  const [query, setQuery] = useState('')

  // クエリが変更されても自動的に再計算
  const filteredUsers = useFind(
    users.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    })
  )

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ユーザー検索..."
      />
      <ul>
        {filteredUsers.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  )
}
```

## 永続化

データをブラウザに永続化することで、ページリロード後もデータを保持できます。

### LocalStorageでの永続化

```typescript
import { Collection } from 'signaldb'
import { LocalStorageAdapter } from 'signaldb/adapters'

const users = new Collection<User>({
  persistence: new LocalStorageAdapter('users')
})

// データは自動的にLocalStorageに保存される
users.insert({ id: '1', name: '山田太郎', email: 'yamada@example.com', createdAt: new Date() })
```

### IndexedDBでの永続化

```typescript
import { IndexedDBAdapter } from 'signaldb/adapters'

const users = new Collection<User>({
  persistence: new IndexedDBAdapter('myapp', 'users')
})

// より大きなデータセットに対応
for (let i = 0; i < 10000; i++) {
  users.insert({
    id: `${i}`,
    name: `User ${i}`,
    email: `user${i}@example.com`,
    createdAt: new Date()
  })
}
```

## 高度なクエリ

MongoDBスタイルのクエリオペレーターが使えます。

### 比較オペレーター

```typescript
// 等価
users.find({ status: 'active' }).fetch()

// 不等価
users.find({ status: { $ne: 'deleted' } }).fetch()

// 大なり・小なり
users.find({ age: { $gte: 20, $lt: 30 } }).fetch()

// 配列内検索
users.find({ tags: { $in: ['premium', 'enterprise'] } }).fetch()
```

### 論理オペレーター

```typescript
// AND（デフォルト）
users.find({
  status: 'active',
  age: { $gte: 18 }
}).fetch()

// OR
users.find({
  $or: [
    { status: 'active' },
    { status: 'pending' }
  ]
}).fetch()

// NOT
users.find({
  status: { $not: { $in: ['deleted', 'banned'] } }
}).fetch()
```

### 配列クエリ

```typescript
interface Post {
  id: string
  title: string
  tags: string[]
  likes: number
}

const posts = new Collection<Post>()

// 配列に特定要素を含む
posts.find({ tags: 'JavaScript' }).fetch()

// すべての要素が条件を満たす
posts.find({ tags: { $all: ['JavaScript', 'TypeScript'] } }).fetch()

// 配列サイズ
posts.find({ tags: { $size: 3 } }).fetch()
```

## パフォーマンス最適化

### インデックス作成

```typescript
// 検索頻度の高いフィールドにインデックスを作成
users.createIndex('email', { unique: true })
users.createIndex('name')

// 複合インデックス
users.createIndex(['status', 'createdAt'])
```

### バッチ操作

```typescript
// 複数操作をまとめて実行
users.bulkWrite([
  { insertOne: { document: { id: '1', name: 'User 1', email: 'user1@example.com', createdAt: new Date() } } },
  { updateOne: { filter: { id: '2' }, update: { $set: { name: 'Updated' } } } },
  { deleteOne: { filter: { id: '3' } } }
])
```

## エラーハンドリング

```typescript
try {
  users.insert({ id: '1', name: 'Test', email: 'test@example.com', createdAt: new Date() })
  users.insert({ id: '1', name: 'Duplicate', email: 'dup@example.com', createdAt: new Date() }) // エラー
} catch (error) {
  console.error('重複IDエラー:', error)
}
```

## 実践例: ToDoアプリ

```typescript
interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: Date
}

const todos = new Collection<Todo>({
  reactivity: useReactivityAdapter(),
  persistence: new LocalStorageAdapter('todos')
})

function TodoApp() {
  const allTodos = useFind(todos.find().sort({ createdAt: -1 }))
  const activeTodos = useFind(todos.find({ completed: false }))

  const addTodo = (text: string) => {
    todos.insert({
      id: crypto.randomUUID(),
      text,
      completed: false,
      createdAt: new Date()
    })
  }

  const toggleTodo = (id: string) => {
    const todo = todos.findOne({ id })
    if (todo) {
      todos.updateOne({ id }, { $set: { completed: !todo.completed } })
    }
  }

  const deleteTodo = (id: string) => {
    todos.removeOne({ id })
  }

  return (
    <div>
      <h1>ToDoリスト（{activeTodos.length}件）</h1>
      {/* UI実装 */}
    </div>
  )
}
```

## まとめ

SignalDBは、リアクティブなローカルファーストアプリケーションを構築するための強力なツールです。

**メリット:**
- リアクティブクエリによる自動UI更新
- 直感的なMongoDBスタイルAPI
- TypeScript完全対応
- 柔軟な永続化オプション

**適したユースケース:**
- オフライン対応アプリ
- リアルタイムダッシュボード
- ローカルファーストアプリ
- プロトタイピング

バックエンドAPIとの同期が必要な場合は、SignalDBとRESTful APIを組み合わせることで、オフライン機能を持つ堅牢なアプリケーションを構築できます。

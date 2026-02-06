---
title: 'HTMX + Alpine.js: モダンなハイパーメディア駆動開発の実践ガイド'
description: 'HTMXとAlpine.jsを組み合わせて、サーバーサイドレンダリングとインタラクティブUIを両立。SPAに頼らないモダンなフルスタック開発を実例で解説します。'
pubDate: 'Feb 05 2025'
tags: ['HTMX', 'Alpine.js', 'Hypermedia', 'SSR', 'FullStack', 'JavaScript']
---

HTMXとAlpine.jsは、React/Vueなどの重量級フレームワークに頼らず、サーバーサイドレンダリングとインタラクティブUIを両立できる軽量な組み合わせです。

## HTMXとAlpine.jsとは

### HTMX

HTMLの属性だけで、AJAX、WebSocket、サーバー送信イベントを扱えるライブラリです。

**特徴:**
- **HTML中心**: JavaScript不要でAJAXリクエスト
- **軽量**: 14KB（gzip圧縮後）
- **プログレッシブエンハンスメント**: JavaScriptなしでも動作
- **サーバーサイドレンダリング**: HTMLを返すだけ

### Alpine.js

Vue.jsの軽量版のような、宣言的UIライブラリです。

**特徴:**
- **軽量**: 15KB（gzip圧縮後）
- **宣言的構文**: Vue.jsライクな記法
- **ビルドステップ不要**: CDNから直接使える
- **リアクティビティ**: データ変更で自動更新

## 基本セットアップ

### CDN経由で導入

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>HTMX + Alpine.js</title>

  <!-- HTMX -->
  <script src="https://unpkg.com/htmx.org@1.9.10"></script>

  <!-- Alpine.js -->
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.13.5/dist/cdn.min.js"></script>
</head>
<body>
  <div id="app">
    <!-- ここにコンテンツ -->
  </div>
</body>
</html>
```

### npm経由で導入

```bash
npm install htmx.org alpinejs
```

```javascript
// main.js
import 'htmx.org'
import Alpine from 'alpinejs'

window.Alpine = Alpine
Alpine.start()
```

## HTMX基本: AJAX without JavaScript

### シンプルなGETリクエスト

```html
<!-- クリックでコンテンツをロード -->
<button
  hx-get="/api/message"
  hx-target="#result">
  メッセージ取得
</button>

<div id="result">
  <!-- ここにレスポンスHTMLが挿入される -->
</div>
```

サーバー側（例: Express.js）

```javascript
app.get('/api/message', (req, res) => {
  res.send('<p>サーバーからのメッセージ</p>')
})
```

### POSTリクエスト

```html
<form hx-post="/api/users" hx-target="#user-list">
  <input type="text" name="name" placeholder="名前">
  <input type="email" name="email" placeholder="メール">
  <button type="submit">追加</button>
</form>

<ul id="user-list">
  <!-- 新規ユーザーがここに追加される -->
</ul>
```

サーバー側

```javascript
app.post('/api/users', (req, res) => {
  const { name, email } = req.body
  const html = `<li>${name} (${email})</li>`
  res.send(html)
})
```

### DELETEリクエスト

```html
<ul>
  <li>
    太郎
    <button
      hx-delete="/api/users/1"
      hx-target="closest li"
      hx-swap="outerHTML">
      削除
    </button>
  </li>
</ul>
```

サーバー側

```javascript
app.delete('/api/users/:id', (req, res) => {
  // DBから削除
  res.send('') // 空のレスポンスで要素が削除される
})
```

## Alpine.js基本: リアクティブUI

### データバインディング

```html
<div x-data="{ count: 0 }">
  <p>カウント: <span x-text="count"></span></p>
  <button @click="count++">増やす</button>
  <button @click="count--">減らす</button>
</div>
```

### 条件付きレンダリング

```html
<div x-data="{ open: false }">
  <button @click="open = !open">トグル</button>

  <div x-show="open" x-transition>
    <p>表示/非表示が切り替わります</p>
  </div>
</div>
```

### ループレンダリング

```html
<div x-data="{
  items: ['リンゴ', 'バナナ', 'オレンジ']
}">
  <ul>
    <template x-for="item in items" :key="item">
      <li x-text="item"></li>
    </template>
  </ul>
</div>
```

## HTMX + Alpine.js の組み合わせ

### インタラクティブな検索UI

```html
<div x-data="{ query: '', loading: false }">
  <input
    type="text"
    x-model="query"
    @input.debounce.500ms="
      loading = true;
      htmx.ajax('GET', '/api/search?q=' + query, '#results').then(() => {
        loading = false;
      })
    "
    placeholder="検索...">

  <div x-show="loading">検索中...</div>

  <div id="results">
    <!-- 検索結果がここに表示される -->
  </div>
</div>
```

サーバー側

```javascript
app.get('/api/search', (req, res) => {
  const query = req.query.q
  const results = db.search(query) // 検索ロジック

  const html = results.map(r =>
    `<div class="result">${r.title}</div>`
  ).join('')

  res.send(html)
})
```

### モーダルダイアログ

```html
<div x-data="{ modalOpen: false }">
  <button @click="modalOpen = true">モーダルを開く</button>

  <div
    x-show="modalOpen"
    @click.away="modalOpen = false"
    x-transition
    class="modal">

    <div class="modal-content">
      <h2>ユーザー情報</h2>

      <div
        hx-get="/api/user/123"
        hx-trigger="load"
        hx-indicator="#spinner">
        <div id="spinner" class="htmx-indicator">読込中...</div>
        <!-- ユーザー情報がここに表示される -->
      </div>

      <button @click="modalOpen = false">閉じる</button>
    </div>
  </div>
</div>
```

## 実践例: ToDoアプリ

### HTML

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>ToDoアプリ</title>
  <script src="https://unpkg.com/htmx.org@1.9.10"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.13.5/dist/cdn.min.js"></script>
  <style>
    .completed { text-decoration: line-through; opacity: 0.6; }
  </style>
</head>
<body>
  <div x-data="{ editMode: false, editText: '' }">
    <h1>ToDoリスト</h1>

    <!-- 新規追加フォーム -->
    <form hx-post="/api/todos" hx-target="#todo-list" hx-swap="beforeend">
      <input type="text" name="text" placeholder="新しいタスク" required>
      <button type="submit">追加</button>
    </form>

    <!-- ToDoリスト -->
    <ul id="todo-list" hx-get="/api/todos" hx-trigger="load">
      <!-- サーバーから初期データがロードされる -->
    </ul>
  </div>
</body>
</html>
```

### サーバー側（Express.js）

```javascript
const express = require('express')
const app = express()

app.use(express.urlencoded({ extended: true }))

let todos = [
  { id: 1, text: 'HTMXを学ぶ', completed: false },
  { id: 2, text: 'Alpine.jsを学ぶ', completed: false }
]
let nextId = 3

// 全ToDo取得
app.get('/api/todos', (req, res) => {
  const html = todos.map(renderTodo).join('')
  res.send(html)
})

// 新規ToDo作成
app.post('/api/todos', (req, res) => {
  const todo = {
    id: nextId++,
    text: req.body.text,
    completed: false
  }
  todos.push(todo)
  res.send(renderTodo(todo))
})

// ToDo完了トグル
app.put('/api/todos/:id/toggle', (req, res) => {
  const todo = todos.find(t => t.id === parseInt(req.params.id))
  if (todo) {
    todo.completed = !todo.completed
    res.send(renderTodo(todo))
  }
})

// ToDo削除
app.delete('/api/todos/:id', (req, res) => {
  todos = todos.filter(t => t.id !== parseInt(req.params.id))
  res.send('')
})

// ToDoをHTMLにレンダリング
function renderTodo(todo) {
  return `
    <li id="todo-${todo.id}" class="${todo.completed ? 'completed' : ''}">
      <span>${todo.text}</span>
      <button
        hx-put="/api/todos/${todo.id}/toggle"
        hx-target="#todo-${todo.id}"
        hx-swap="outerHTML">
        ${todo.completed ? '未完了に戻す' : '完了'}
      </button>
      <button
        hx-delete="/api/todos/${todo.id}"
        hx-target="#todo-${todo.id}"
        hx-swap="outerHTML">
        削除
      </button>
    </li>
  `
}

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})
```

## 高度な機能

### 楽観的UI更新

```html
<button
  hx-post="/api/like"
  hx-swap="outerHTML"
  hx-indicator="#spinner">
  <span class="htmx-request">いいね中...</span>
  <span class="htmx-added">いいね済み</span>
</button>
```

### 無限スクロール

```html
<div id="content">
  <div hx-get="/api/posts?page=1" hx-trigger="load" hx-swap="outerHTML">
    <!-- 最初のページ -->
  </div>
</div>

<div
  hx-get="/api/posts?page=2"
  hx-trigger="revealed"
  hx-swap="afterend">
  <!-- スクロールで表示されたら次のページをロード -->
</div>
```

### WebSocketでのリアルタイム更新

```html
<div hx-ext="ws" ws-connect="/ws">
  <div id="messages" ws-send>
    <!-- WebSocketメッセージがここに追加される -->
  </div>

  <form ws-send>
    <input name="message" placeholder="メッセージ">
    <button type="submit">送信</button>
  </form>
</div>
```

## パフォーマンス最適化

### プリフェッチ

```html
<a
  href="/page2"
  hx-get="/page2"
  hx-trigger="mouseenter"
  hx-swap="innerHTML"
  hx-target="#content">
  次のページ（ホバーでプリフェッチ）
</a>
```

### デバウンス

```html
<input
  type="text"
  hx-get="/api/search"
  hx-trigger="keyup changed delay:500ms"
  hx-target="#results">
```

## まとめ

HTMX + Alpine.jsは、SPAの複雑さを避けつつ、モダンなUXを実現できます。

**メリット:**
- 軽量（合計30KB以下）
- ビルドステップ不要
- サーバーサイドレンダリングと相性が良い
- SEO対応が容易
- プログレッシブエンハンスメント

**適したプロジェクト:**
- コンテンツ重視のWebアプリ
- 管理画面・ダッシュボード
- サーバーサイドレンダリング前提のアプリ
- プロトタイピング

**向いていないケース:**
- 複雑な状態管理が必要
- オフライン対応必須
- ネイティブアプリ風のSPA

Rails、Django、Laravel、Express.jsなど、あらゆるバックエンドフレームワークと組み合わせて、シンプルで保守性の高いフルスタックアプリケーションを構築できます。

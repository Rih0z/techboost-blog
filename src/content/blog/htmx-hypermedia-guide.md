---
title: "htmxでモダンなハイパーメディア駆動アプリを構築する完全ガイド"
description: "htmxでSPAに頼らないリッチなWebアプリを構築。AJAX、WebSocket、SSEを活用したインタラクティブUI、フォーム処理、無限スクロール、リアルタイム更新の実装方法を徹底解説"
pubDate: "2025-02-05"
---

# htmxでモダンなハイパーメディア駆動アプリを構築する完全ガイド

## htmxとは

**htmx**は、HTML要素に属性を追加するだけでAJAX、CSS Transitions、WebSocket、Server-Sent Eventsなどを使えるようにする軽量JavaScriptライブラリです。「SPAを作らずにモダンなWebアプリを構築する」という新しいアプローチを提供します。

### なぜhtmxが注目されているのか

**従来のSPA開発の課題**:
```javascript
// React/Vueでの典型的なフロー
// 1. JSON APIを作る
const response = await fetch('/api/users');
const users = await response.json();

// 2. クライアントでHTML生成
return (
  <div>
    {users.map(user => (
      <UserCard key={user.id} user={user} />
    ))}
  </div>
);

// 結果: 複雑なビルドプロセス、大きなバンドルサイズ、状態管理
```

**htmxのアプローチ**:
```html
<!-- サーバーから直接HTMLを返す -->
<button hx-get="/users" hx-target="#user-list">
  ユーザー一覧を読み込む
</button>

<div id="user-list">
  <!-- ここにサーバーから返されたHTMLが挿入される -->
</div>
```

**htmxの利点**:
- JavaScriptのビルドプロセス不要
- 小さなバンドルサイズ（14KB gzipped）
- サーバーサイドレンダリングで高速初期表示
- SEO対応が容易
- 既存のバックエンドと統合しやすい

## インストールとセットアップ

### CDNから読み込み

```html
<!DOCTYPE html>
<html>
<head>
  <title>htmx App</title>
  <!-- htmx -->
  <script src="https://unpkg.com/htmx.org@1.9.10"></script>
</head>
<body>
  <h1>My htmx App</h1>
</body>
</html>
```

### npmでインストール

```bash
npm install htmx.org
```

```javascript
// main.js
import 'htmx.org';
```

### 拡張機能の追加

```html
<!-- WebSocket拡張 -->
<script src="https://unpkg.com/htmx.org@1.9.10/dist/ext/ws.js"></script>

<!-- SSE拡張 -->
<script src="https://unpkg.com/htmx.org@1.9.10/dist/ext/sse.js"></script>

<!-- JSON拡張 -->
<script src="https://unpkg.com/htmx.org@1.9.10/dist/ext/json-enc.js"></script>
```

## 基本的な使い方

### AJAX GET リクエスト

```html
<!-- クリックでGETリクエスト -->
<button hx-get="/api/data" hx-target="#result">
  データを取得
</button>

<div id="result">
  <!-- ここにレスポンスが表示される -->
</div>
```

**サーバー側（Express例）**:
```javascript
app.get('/api/data', (req, res) => {
  res.send(`
    <div class="data-card">
      <h3>データが読み込まれました</h3>
      <p>タイムスタンプ: ${new Date().toISOString()}</p>
    </div>
  `);
});
```

### POSTリクエスト

```html
<!-- フォーム送信 -->
<form hx-post="/api/users" hx-target="#user-list" hx-swap="beforeend">
  <input type="text" name="name" placeholder="名前" required>
  <input type="email" name="email" placeholder="メール" required>
  <button type="submit">追加</button>
</form>

<div id="user-list">
  <!-- 新しいユーザーがここに追加される -->
</div>
```

**サーバー側**:
```javascript
app.post('/api/users', (req, res) => {
  const { name, email } = req.body;
  // DBに保存
  const user = createUser(name, email);

  // 新しいユーザーのHTMLを返す
  res.send(`
    <div class="user-card">
      <h4>${user.name}</h4>
      <p>${user.email}</p>
    </div>
  `);
});
```

### 削除とUPDATE

```html
<!-- 削除ボタン -->
<div class="user-card" id="user-123">
  <h4>山田太郎</h4>
  <button
    hx-delete="/api/users/123"
    hx-target="#user-123"
    hx-swap="outerHTML">
    削除
  </button>
</div>
```

```javascript
app.delete('/api/users/:id', (req, res) => {
  deleteUser(req.params.id);
  // 空のレスポンスで要素が削除される
  res.send('');
});
```

## hx-target と hx-swap

### hx-target: 更新対象の指定

```html
<!-- ID指定 -->
<button hx-get="/data" hx-target="#result">取得</button>

<!-- クラス指定 -->
<button hx-get="/data" hx-target=".result-area">取得</button>

<!-- 親要素 -->
<div class="card">
  <button hx-get="/data" hx-target="closest .card">更新</button>
</div>

<!-- 次の兄弟要素 -->
<button hx-get="/data" hx-target="next .sibling">取得</button>

<!-- this（ボタン自体を置き換え） -->
<button hx-get="/data" hx-target="this">自分を置き換え</button>
```

### hx-swap: 挿入方法の指定

```html
<!-- innerHTML（デフォルト） -->
<div hx-get="/data" hx-swap="innerHTML">内容を置き換え</div>

<!-- outerHTML（要素ごと置き換え） -->
<div hx-get="/data" hx-swap="outerHTML">要素ごと置き換え</div>

<!-- beforebegin（要素の前に挿入） -->
<div hx-get="/data" hx-swap="beforebegin">前に挿入</div>

<!-- afterbegin（最初の子要素として挿入） -->
<div hx-get="/data" hx-swap="afterbegin">先頭に挿入</div>

<!-- beforeend（最後の子要素として挿入） -->
<div hx-get="/data" hx-swap="beforeend">末尾に挿入</div>

<!-- afterend（要素の後に挿入） -->
<div hx-get="/data" hx-swap="afterend">後に挿入</div>

<!-- delete（要素を削除） -->
<div hx-get="/data" hx-swap="delete">削除</div>

<!-- none（更新しない） -->
<div hx-get="/data" hx-swap="none">何もしない</div>
```

### スワップのタイミング調整

```html
<!-- 1秒後にスワップ -->
<div hx-get="/data" hx-swap="innerHTML swap:1s">遅延スワップ</div>

<!-- スムーズな遷移 -->
<div hx-get="/data" hx-swap="innerHTML settle:200ms">
  フェードイン
</div>

<!-- スクロール制御 -->
<div hx-get="/data" hx-swap="innerHTML scroll:top">
  トップまでスクロール
</div>
```

## トリガーイベント

### hx-trigger: イベントの指定

```html
<!-- クリック（デフォルト） -->
<button hx-get="/data">クリックで取得</button>

<!-- マウスオーバー -->
<div hx-get="/tooltip" hx-trigger="mouseenter">
  ホバーで表示
</div>

<!-- フォーカス -->
<input hx-get="/suggestions" hx-trigger="focus">

<!-- 入力時 -->
<input
  hx-get="/search"
  hx-trigger="keyup changed delay:500ms"
  hx-target="#search-results">

<!-- 複数イベント -->
<div hx-get="/data" hx-trigger="click, customEvent">
  複数トリガー
</div>

<!-- ページロード時 -->
<div hx-get="/initial-data" hx-trigger="load">
  初期データ読み込み
</div>

<!-- 定期実行（ポーリング） -->
<div hx-get="/status" hx-trigger="every 5s">
  5秒ごとに更新
</div>

<!-- 条件付きトリガー -->
<button
  hx-get="/data"
  hx-trigger="click[ctrlKey]">
  Ctrl+クリックで実行
</button>
```

### イベント修飾子

```html
<!-- once: 1回だけ実行 -->
<button hx-get="/data" hx-trigger="click once">一度だけ</button>

<!-- changed: 値が変わった時のみ -->
<input hx-get="/validate" hx-trigger="keyup changed">

<!-- delay: 遅延実行（デバウンス） -->
<input hx-get="/search" hx-trigger="keyup changed delay:500ms">

<!-- throttle: 実行頻度制限 -->
<div hx-get="/scroll-data" hx-trigger="scroll throttle:1s">
  スクロールデータ
</div>

<!-- from: 他の要素のイベントをリッスン -->
<input id="search-box" type="text">
<div hx-get="/results" hx-trigger="keyup from:#search-box">
  検索結果
</div>
```

## 実践例: Todoアプリ

### HTML構造

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/htmx.org@1.9.10"></script>
  <style>
    .todo-item {
      padding: 10px;
      border: 1px solid #ddd;
      margin: 5px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .completed {
      text-decoration: line-through;
      opacity: 0.6;
    }
  </style>
</head>
<body>
  <h1>htmx Todo App</h1>

  <!-- Todo作成フォーム -->
  <form hx-post="/todos" hx-target="#todo-list" hx-swap="afterbegin">
    <input type="text" name="text" placeholder="新しいタスク" required>
    <button type="submit">追加</button>
  </form>

  <!-- Todo一覧 -->
  <div id="todo-list" hx-get="/todos" hx-trigger="load">
    <!-- サーバーから初期データが読み込まれる -->
  </div>
</body>
</html>
```

### サーバー側実装（Express）

```javascript
const express = require('express');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// メモリ内のTodo配列（本番ではDBを使用）
let todos = [
  { id: 1, text: 'htmxを学ぶ', completed: false },
  { id: 2, text: 'Todoアプリを作る', completed: false }
];
let nextId = 3;

// Todo一覧を取得
app.get('/todos', (req, res) => {
  const html = todos.map(todo => renderTodo(todo)).join('');
  res.send(html);
});

// Todo作成
app.post('/todos', (req, res) => {
  const newTodo = {
    id: nextId++,
    text: req.body.text,
    completed: false
  };
  todos.push(newTodo);
  res.send(renderTodo(newTodo));
});

// Todo完了/未完了切り替え
app.patch('/todos/:id', (req, res) => {
  const todo = todos.find(t => t.id == req.params.id);
  if (todo) {
    todo.completed = !todo.completed;
    res.send(renderTodo(todo));
  }
});

// Todo削除
app.delete('/todos/:id', (req, res) => {
  todos = todos.filter(t => t.id != req.params.id);
  res.send(''); // 空のレスポンスで要素が削除される
});

// Todoをレンダリング
function renderTodo(todo) {
  return `
    <div class="todo-item ${todo.completed ? 'completed' : ''}" id="todo-${todo.id}">
      <label>
        <input
          type="checkbox"
          ${todo.completed ? 'checked' : ''}
          hx-patch="/todos/${todo.id}"
          hx-target="#todo-${todo.id}"
          hx-swap="outerHTML">
        ${todo.text}
      </label>
      <button
        hx-delete="/todos/${todo.id}"
        hx-target="#todo-${todo.id}"
        hx-swap="outerHTML">
        削除
      </button>
    </div>
  `;
}

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

## 無限スクロール

```html
<!-- 無限スクロール実装 -->
<div id="post-list">
  <div class="post">投稿1</div>
  <div class="post">投稿2</div>
  <!-- ... -->

  <!-- トリガー要素 -->
  <div
    hx-get="/posts?page=2"
    hx-trigger="revealed"
    hx-swap="afterend">
    <div class="loading">読み込み中...</div>
  </div>
</div>
```

**サーバー側**:
```javascript
app.get('/posts', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const postsPerPage = 10;
  const posts = getPostsForPage(page, postsPerPage);

  let html = posts.map(post => `
    <div class="post">
      <h3>${post.title}</h3>
      <p>${post.content}</p>
    </div>
  `).join('');

  // 次のページがあれば、次のトリガー要素を追加
  if (hasMorePosts(page + 1)) {
    html += `
      <div
        hx-get="/posts?page=${page + 1}"
        hx-trigger="revealed"
        hx-swap="afterend">
        <div class="loading">読み込み中...</div>
      </div>
    `;
  }

  res.send(html);
});
```

## インライン編集

```html
<!-- クリックで編集モードに -->
<div
  hx-get="/edit/user/123"
  hx-target="this"
  hx-swap="outerHTML"
  class="user-display">
  <h4>山田太郎</h4>
  <p>yamada@example.com</p>
  <button>編集</button>
</div>
```

**編集フォームを返す**:
```javascript
app.get('/edit/user/:id', (req, res) => {
  const user = getUser(req.params.id);
  res.send(`
    <form
      hx-put="/users/${user.id}"
      hx-target="this"
      hx-swap="outerHTML"
      class="user-edit">
      <input type="text" name="name" value="${user.name}">
      <input type="email" name="email" value="${user.email}">
      <button type="submit">保存</button>
      <button
        hx-get="/users/${user.id}"
        hx-target="this"
        hx-swap="outerHTML">
        キャンセル
      </button>
    </form>
  `);
});

app.put('/users/:id', (req, res) => {
  const user = updateUser(req.params.id, req.body);
  res.send(`
    <div
      hx-get="/edit/user/${user.id}"
      hx-target="this"
      hx-swap="outerHTML"
      class="user-display">
      <h4>${user.name}</h4>
      <p>${user.email}</p>
      <button>編集</button>
    </div>
  `);
});
```

## リアルタイム更新（Server-Sent Events）

```html
<div hx-ext="sse" sse-connect="/events" sse-swap="message">
  <!-- ここにリアルタイムデータが表示される -->
</div>
```

**サーバー側（SSE）**:
```javascript
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // 5秒ごとにメッセージ送信
  const intervalId = setInterval(() => {
    const html = `
      <div class="notification">
        <p>新着メッセージ: ${new Date().toLocaleTimeString()}</p>
      </div>
    `;
    res.write(`event: message\n`);
    res.write(`data: ${html}\n\n`);
  }, 5000);

  req.on('close', () => {
    clearInterval(intervalId);
  });
});
```

## WebSocketでチャット

```html
<div hx-ext="ws" ws-connect="/chat">
  <div id="messages"></div>

  <form ws-send>
    <input type="text" name="message" placeholder="メッセージ">
    <button type="submit">送信</button>
  </form>
</div>
```

**サーバー側（WebSocket）**:
```javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    const message = JSON.parse(data);

    // 全クライアントにブロードキャスト
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          html: `
            <div class="message">
              <strong>${message.user}:</strong> ${message.text}
            </div>
          `
        }));
      }
    });
  });
});
```

## ローディングインジケーター

```html
<!-- htmx-indicatorクラスで自動制御 -->
<button hx-get="/slow-data" hx-target="#result">
  データ取得
  <span class="htmx-indicator">
    <img src="spinner.gif" alt="読み込み中...">
  </span>
</button>

<style>
  .htmx-indicator {
    display: none;
  }
  .htmx-request .htmx-indicator {
    display: inline;
  }
  .htmx-request.htmx-indicator {
    display: inline;
  }
</style>
```

### カスタムインジケーター

```html
<button
  hx-get="/data"
  hx-indicator="#custom-spinner">
  読み込む
</button>

<div id="custom-spinner" class="htmx-indicator">
  <div class="spinner"></div>
</div>
```

## エラーハンドリング

```html
<div
  hx-get="/api/data"
  hx-target="#result"
  hx-on::after-request="
    if(event.detail.failed) {
      alert('エラーが発生しました');
    }
  ">
  データ取得
</div>
```

**イベントリスナーでのハンドリング**:
```javascript
document.body.addEventListener('htmx:responseError', (event) => {
  console.error('リクエストエラー:', event.detail);
  alert(`エラー: ${event.detail.xhr.status}`);
});
```

## バリデーション

### クライアント側バリデーション

```html
<form hx-post="/users" hx-target="#result">
  <input
    type="email"
    name="email"
    required
    pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$">
  <button type="submit">送信</button>
</form>
```

### サーバー側バリデーション

```javascript
app.post('/users', (req, res) => {
  const { email } = req.body;

  if (!isValidEmail(email)) {
    res.status(400).send(`
      <div class="error">
        有効なメールアドレスを入力してください
      </div>
    `);
    return;
  }

  // 正常処理
  res.send('<div class="success">登録完了</div>');
});
```

## まとめ

htmxは**ハイパーメディア駆動**のアプローチで、モダンなWebアプリケーションを構築する新しい方法を提供します。

### htmxの主要な利点

1. **シンプル** - HTML属性だけでインタラクティブUIを実現
2. **軽量** - 14KB（gzipped）、ビルドプロセス不要
3. **高速** - サーバーサイドレンダリングで初期表示が速い
4. **SEO対応** - HTMLベースなので検索エンジンに優しい
5. **バックエンド統合** - 既存のサーバーサイド技術と簡単に統合

### 採用を検討すべきケース

- **管理画面・社内ツール** - 複雑なフロントエンドが不要
- **コンテンツサイト** - SEOが重要
- **既存アプリの拡張** - JavaScriptを最小限に抑えたい
- **プロトタイピング** - 高速開発が必要

### SPAが適しているケース

- **高度なインタラクション** - リッチなクライアントサイドロジック
- **オフライン対応** - PWA機能が必要
- **モバイルアプリ** - React Native等でコード共有

htmxは「すべてのアプリに適している」わけではありませんが、多くのユースケースで**よりシンプルで効果的な解決策**を提供します。

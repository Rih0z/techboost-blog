---
title: "htmx入門2026 — JavaScriptなしでインタラクティブなWebアプリを作る革命"
description: "htmx完全ガイド。SPAフレームワーク不要でAJAX、WebSocket、SSEを実現。基本使い方、サーバーサイド連携、実践例を網羅。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。"
pubDate: "2026-02-05"
tags: ["htmx", "HTML", "JavaScript", "Web開発", "AJAX", "ハイパーメディア", "SSR"]
---
# htmx入門2026 — JavaScriptなしでインタラクティブなWebアプリを作る

JavaScriptフレームワークの複雑さに疲れていませんか？**htmx**は、HTMLの**属性（attributes）だけ**でAJAX、WebSocket、Server-Sent Eventsを実現する革命的なライブラリです。

React、Vue、Angularなしで、シンプルかつ強力なWebアプリを作りましょう。

## htmxとは

**htmx**は、HTMLに拡張属性を追加することで、インタラクティブなWebアプリを作れる軽量ライブラリ（約14KB gzip）です。

特徴:
- **HTML中心**: JavaScriptを書かずにAJAX通信
- **ハイパーメディア駆動**: サーバーがHTMLフラグメントを返す
- **プログレッシブエンハンスメント**: JavaScriptがオフでも動作
- **フレームワーク不要**: バニラJSでもExpress/Django/Rails等と併用可能

## SPAフレームワークとの比較

### 従来のSPA（React/Vue/Angular）

```
ブラウザ               サーバー
  │                      │
  ├─ 初回HTML取得 ───────>│
  │<─ HTMLシェル ─────────┤
  ├─ JS/CSSダウンロード ──>│
  │<─ バンドルファイル ────┤
  ├─ API: GET /users ────>│
  │<─ JSON ───────────────┤
  └─ JS側でDOM構築
```

**課題**:
- 初回読み込みが遅い（バンドルサイズ大）
- ビルドツールチェインが複雑（Webpack、Babel、TypeScript等）
- SEO対策にSSR/SSG必要
- JavaScriptが無効だと動かない

### htmxアプローチ

```
ブラウザ               サーバー
  │                      │
  ├─ GET / ─────────────>│
  │<─ HTML（完全） ───────┤ ← すぐに表示可能
  ├─ ボタンクリック
  ├─ hx-get="/users" ───>│
  │<─ HTMLフラグメント ────┤
  └─ DOMに挿入（htmxが自動）
```

**メリット**:
- サーバーがHTMLを返すので、ブラウザはシンプル
- 初回読み込み高速（JS最小限）
- ビルド不要
- SEOフレンドリー（最初からHTML）

### 比較表

| 項目 | React/Vue/Angular | htmx |
|------|------------------|------|
| バンドルサイズ | 数百KB〜数MB | 14KB |
| 初回読み込み | 遅い | 高速 |
| SEO | SSR/SSG必要 | デフォルトでOK |
| 学習コスト | 高い | 低い（HTML知識だけ） |
| サーバー負荷 | 低い（JSON返すだけ） | やや高い（HTML生成） |
| リッチUI | 得意 | やや不得意 |
| 適用範囲 | 大規模SPA | 中小規模、ハイパーメディアアプリ |

**結論**: htmxは万能ではないが、多くのWebアプリで十分な選択肢。

## htmxのインストール

### CDN（最速）

```html
<!DOCTYPE html>
<html>
<head>
  <title>htmx Demo</title>
  <script src="https://unpkg.com/htmx.org@2.0.0"></script>
</head>
<body>
  <!-- htmxの機能が使える -->
</body>
</html>
```

### npm

```bash
npm install htmx.org
```

```html
<script src="/node_modules/htmx.org/dist/htmx.min.js"></script>
```

### Vite/Webpack

```javascript
import 'htmx.org';
```

## htmxの基本属性

### hx-get — GETリクエスト

```html
<button hx-get="/api/hello" hx-target="#result">
  クリックしてね
</button>

<div id="result"></div>
```

ボタンをクリックすると:
1. `/api/hello`にGETリクエスト
2. サーバーがHTMLを返す（例: `<p>こんにちは！</p>`）
3. `#result`にHTMLを挿入

サーバー側（Express例）:
```javascript
app.get('/api/hello', (req, res) => {
  res.send('<p>こんにちは！</p>');
});
```

### hx-post — POSTリクエスト

```html
<form hx-post="/api/submit" hx-target="#message">
  <input name="username" placeholder="名前" />
  <button type="submit">送信</button>
</form>

<div id="message"></div>
```

サーバー側:
```javascript
app.post('/api/submit', (req, res) => {
  const { username } = req.body;
  res.send(`<p>ようこそ、${username}さん！</p>`);
});
```

### hx-target — 挿入先指定

```html
<button hx-get="/content" hx-target="#output">
  読み込み
</button>

<div id="output">ここに表示されます</div>
```

**セレクタ**:
- `#id` — ID
- `.class` — クラス
- `this` — 自分自身
- `closest <selector>` — 最も近い祖先要素

### hx-swap — 挿入方法指定

```html
<button hx-get="/item" hx-target="#list" hx-swap="beforeend">
  アイテム追加
</button>

<ul id="list">
  <li>既存アイテム1</li>
</ul>
```

**swapオプション**:
- `innerHTML` — 内容を置き換え（デフォルト）
- `outerHTML` — 要素ごと置き換え
- `beforebegin` — 要素の前に挿入
- `afterbegin` — 内部の先頭に挿入
- `beforeend` — 内部の末尾に挿入
- `afterend` — 要素の後に挿入
- `delete` — 要素を削除
- `none` — 何もしない

### hx-trigger — トリガー指定

```html
<!-- クリック時（デフォルト） -->
<button hx-get="/data" hx-trigger="click">クリック</button>

<!-- マウスオーバー時 -->
<div hx-get="/preview" hx-trigger="mouseenter">ホバーで読み込み</div>

<!-- インプット変更時（500msディレイ） -->
<input
  hx-get="/search"
  hx-trigger="keyup changed delay:500ms"
  hx-target="#results"
  name="q"
/>

<!-- ページロード時 -->
<div hx-get="/stats" hx-trigger="load"></div>

<!-- 5秒ごとにポーリング -->
<div hx-get="/updates" hx-trigger="every 5s"></div>
```

### hx-vals — 追加データ送信

```html
<button
  hx-post="/api/vote"
  hx-vals='{"postId": 123, "value": 1}'
>
  いいね
</button>
```

### hx-confirm — 確認ダイアログ

```html
<button
  hx-delete="/api/posts/123"
  hx-confirm="本当に削除しますか？"
>
  削除
</button>
```

### hx-indicator — ローディング表示

```html
<button hx-get="/slow-api" hx-indicator="#spinner">
  読み込み
</button>

<div id="spinner" class="htmx-indicator">
  読み込み中...
</div>
```

CSS:
```css
.htmx-indicator {
  display: none;
}

.htmx-request .htmx-indicator {
  display: inline;
}
```

## サーバーサイド連携

### Express（Node.js）

```bash
npm install express
```

```javascript
// server.js
import express from 'express';

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// トップページ
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://unpkg.com/htmx.org@2.0.0"></script>
    </head>
    <body>
      <h1>htmx + Express</h1>
      <button hx-get="/time" hx-target="#clock">現在時刻</button>
      <div id="clock"></div>
    </body>
    </html>
  `);
});

// APIエンドポイント
app.get('/time', (req, res) => {
  const now = new Date().toLocaleString('ja-JP');
  res.send(`<p>現在時刻: ${now}</p>`);
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
```

実行:
```bash
node server.js
```

### Django（Python）

```python
# views.py
from django.shortcuts import render
from django.http import HttpResponse
from datetime import datetime

def index(request):
    return render(request, 'index.html')

def get_time(request):
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    return HttpResponse(f'<p>現在時刻: {now}</p>')
```

```html
<!-- templates/index.html -->
<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/htmx.org@2.0.0"></script>
</head>
<body>
  <h1>htmx + Django</h1>
  <button hx-get="{% url 'get_time' %}" hx-target="#clock">現在時刻</button>
  <div id="clock"></div>
</body>
</html>
```

### Rails（Ruby）

```ruby
# app/controllers/home_controller.rb
class HomeController < ApplicationController
  def index
  end

  def get_time
    @time = Time.now.strftime('%Y-%m-%d %H:%M:%S')
    render partial: 'time'
  end
end
```

```erb
<!-- app/views/home/_time.html.erb -->
<p>現在時刻: <%= @time %></p>
```

```erb
<!-- app/views/home/index.html.erb -->
<script src="https://unpkg.com/htmx.org@2.0.0"></script>
<h1>htmx + Rails</h1>
<button hx-get="<%= get_time_path %>" hx-target="#clock">現在時刻</button>
<div id="clock"></div>
```

## 実践例

### 1. CRUD操作（ToDoリスト）

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/htmx.org@2.0.0"></script>
  <style>
    body { font-family: sans-serif; max-width: 600px; margin: 50px auto; }
    .todo-item { padding: 10px; border-bottom: 1px solid #ddd; }
  </style>
</head>
<body>
  <h1>htmx ToDoリスト</h1>

  <!-- 新規追加フォーム -->
  <form hx-post="/todos" hx-target="#todo-list" hx-swap="beforeend">
    <input name="text" placeholder="やることを入力" required />
    <button type="submit">追加</button>
  </form>

  <!-- ToDoリスト -->
  <div id="todo-list">
    <!-- サーバーから初期データ読み込み -->
    <div hx-get="/todos" hx-trigger="load" hx-swap="innerHTML"></div>
  </div>
</body>
</html>
```

サーバー側（Express）:
```javascript
let todos = [
  { id: 1, text: 'htmxを学ぶ', done: false },
  { id: 2, text: 'アプリを作る', done: false },
];
let nextId = 3;

app.get('/todos', (req, res) => {
  const html = todos.map(todo => `
    <div class="todo-item" id="todo-${todo.id}">
      <input
        type="checkbox"
        ${todo.done ? 'checked' : ''}
        hx-patch="/todos/${todo.id}/toggle"
        hx-target="#todo-${todo.id}"
        hx-swap="outerHTML"
      />
      <span style="${todo.done ? 'text-decoration: line-through;' : ''}">
        ${todo.text}
      </span>
      <button
        hx-delete="/todos/${todo.id}"
        hx-target="#todo-${todo.id}"
        hx-swap="outerHTML"
      >削除</button>
    </div>
  `).join('');
  res.send(html);
});

app.post('/todos', (req, res) => {
  const todo = { id: nextId++, text: req.body.text, done: false };
  todos.push(todo);
  res.send(`
    <div class="todo-item" id="todo-${todo.id}">
      <input
        type="checkbox"
        hx-patch="/todos/${todo.id}/toggle"
        hx-target="#todo-${todo.id}"
        hx-swap="outerHTML"
      />
      <span>${todo.text}</span>
      <button
        hx-delete="/todos/${todo.id}"
        hx-target="#todo-${todo.id}"
        hx-swap="outerHTML"
      >削除</button>
    </div>
  `);
});

app.patch('/todos/:id/toggle', (req, res) => {
  const todo = todos.find(t => t.id === parseInt(req.params.id));
  todo.done = !todo.done;
  res.send(`
    <div class="todo-item" id="todo-${todo.id}">
      <input
        type="checkbox"
        ${todo.done ? 'checked' : ''}
        hx-patch="/todos/${todo.id}/toggle"
        hx-target="#todo-${todo.id}"
        hx-swap="outerHTML"
      />
      <span style="${todo.done ? 'text-decoration: line-through;' : ''}">
        ${todo.text}
      </span>
      <button
        hx-delete="/todos/${todo.id}"
        hx-target="#todo-${todo.id}"
        hx-swap="outerHTML"
      >削除</button>
    </div>
  `);
});

app.delete('/todos/:id', (req, res) => {
  todos = todos.filter(t => t.id !== parseInt(req.params.id));
  res.send(''); // 空HTMLを返す → swapで要素削除
});
```

### 2. 無限スクロール

```html
<div id="posts">
  <!-- 初期投稿 -->
  <div hx-get="/posts?page=1" hx-trigger="load" hx-swap="innerHTML"></div>
</div>

<!-- ローディングトリガー -->
<div
  hx-get="/posts?page=2"
  hx-trigger="revealed"
  hx-swap="outerHTML"
>
  読み込み中...
</div>
```

サーバー側:
```javascript
app.get('/posts', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const posts = [
    `<div>投稿 ${page}-1</div>`,
    `<div>投稿 ${page}-2</div>`,
    `<div>投稿 ${page}-3</div>`,
  ].join('');

  const nextPage = page + 1;
  const loadMore = `
    <div
      hx-get="/posts?page=${nextPage}"
      hx-trigger="revealed"
      hx-swap="outerHTML"
    >
      読み込み中...
    </div>
  `;

  res.send(posts + loadMore);
});
```

### 3. リアルタイム検索

```html
<input
  type="search"
  name="q"
  placeholder="検索..."
  hx-get="/search"
  hx-trigger="keyup changed delay:300ms"
  hx-target="#search-results"
  hx-indicator="#search-spinner"
/>

<span id="search-spinner" class="htmx-indicator">🔍 検索中...</span>

<div id="search-results"></div>
```

サーバー側:
```javascript
const products = [
  { id: 1, name: 'iPhone 15' },
  { id: 2, name: 'MacBook Pro' },
  { id: 3, name: 'iPad Air' },
];

app.get('/search', (req, res) => {
  const query = req.query.q?.toLowerCase() || '';
  const results = products.filter(p => p.name.toLowerCase().includes(query));

  const html = results.map(p => `<div>${p.name}</div>`).join('');
  res.send(html || '<div>結果なし</div>');
});
```

### 4. モーダル表示

```html
<button hx-get="/modal/login" hx-target="body" hx-swap="beforeend">
  ログイン
</button>
```

サーバー側:
```javascript
app.get('/modal/login', (req, res) => {
  res.send(`
    <div id="modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;">
      <div style="background: white; padding: 20px; border-radius: 8px;">
        <h2>ログイン</h2>
        <form hx-post="/login" hx-target="#modal" hx-swap="outerHTML">
          <input name="email" placeholder="メール" /><br/>
          <input name="password" type="password" placeholder="パスワード" /><br/>
          <button type="submit">ログイン</button>
          <button type="button" onclick="document.getElementById('modal').remove()">キャンセル</button>
        </form>
      </div>
    </div>
  `);
});
```

## htmxの拡張機能

### hx-boost（段階的導入）

既存のリンク/フォームをAJAX化:

```html
<body hx-boost="true">
  <a href="/page2">ページ2へ</a> <!-- AJAXで遷移 -->
  <form action="/submit">
    <button>送信</button> <!-- AJAXで送信 -->
  </form>
</body>
```

### WebSocket

```html
<div hx-ws="connect:/chatws">
  <form hx-ws="send">
    <input name="message" />
    <button>送信</button>
  </form>
  <div id="chat"></div>
</div>
```

サーバー側（Node.js + ws）:
```javascript
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', ws => {
  ws.on('message', data => {
    // 全クライアントにブロードキャスト
    wss.clients.forEach(client => {
      client.send(`<div>${data}</div>`);
    });
  });
});
```

### Server-Sent Events（SSE）

```html
<div hx-sse="connect:/events">
  <div hx-sse="swap:message" hx-swap="beforeend"></div>
</div>
```

サーバー側:
```javascript
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const interval = setInterval(() => {
    const data = `<div>${new Date().toLocaleTimeString()}</div>`;
    res.write(`event: message\ndata: ${data}\n\n`);
  }, 1000);

  req.on('close', () => clearInterval(interval));
});
```

## まとめ — htmxを使うべきか？

### htmxが向いているケース

- **中小規模Webアプリ**: ブログ、CMS、管理画面、フォーム中心アプリ
- **サーバーサイドレンダリング重視**: Rails、Django、Laravel等との相性抜群
- **シンプルさ優先**: ビルドツール不要、学習コスト低
- **SEO重視**: 最初からHTMLが存在

### htmxが向いていないケース

- **超リッチUI**: ドラッグ&ドロップ、複雑なアニメーション
- **完全オフライン動作**: ServiceWorkerとの統合は可能だが面倒
- **巨大SPA**: 状態管理が複雑になる場合はReact等が適切

### 2026年の立ち位置

htmxは**「SPAアンチテーゼ」**として急成長中。

採用例:
- GitHub（一部機能）
- Basecamp
- 多くのスタートアップ

**結論**: htmxは**「JavaScriptフレームワーク疲れ」の特効薬**。多くのWebアプリで十分な選択肢です。

---

**参考リンク**:
- [htmx公式サイト](https://htmx.org/)
- [htmxエッセイ](https://htmx.org/essays/)

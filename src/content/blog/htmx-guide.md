---
title: "htmx 入門ガイド - JavaScriptなしでモダンUI"
description: "htmxを使ってJavaScriptフレームワークなしでインタラクティブなWebアプリケーションを構築する方法を解説。軽量でシンプルなアプローチを紹介します。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。"
pubDate: "2025-02-05"
tags: ['htmx', 'web-development', 'HTML', 'JavaScript']
heroImage: '../../assets/thumbnails/htmx-guide.jpg'
---
htmx は、HTML属性だけでAJAX、WebSocket、Server-Sent Eventsなどのモダンなブラウザ機能を利用できるライブラリです。複雑なJavaScriptフレームワークを使わずに、インタラクティブなWebアプリケーションを構築できます。

## htmx とは

htmx は以下の特徴を持つ軽量ライブラリ（約14KB gzip）です:

- **HTML中心**: HTML属性でインタラクションを定義
- **サーバー主導**: サーバーからHTMLを返すだけ
- **プログレッシブエンハンスメント**: JavaScriptが無効でも基本機能は動作
- **学習コストが低い**: HTMLが書ければ使える
- **フレームワーク不要**: React、Vue、Angularなどが不要

## セットアップ

### CDN経由

最も簡単な方法:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>htmx Example</title>
  <script src="https://unpkg.com/htmx.org@1.9.10"></script>
</head>
<body>
  <!-- ここにhtmx属性を使ったHTML -->
</body>
</html>
```

### npm経由

```bash
npm install htmx.org
```

```javascript
import 'htmx.org';
```

## 基本的な使い方

### AJAX リクエスト

#### GET リクエスト

```html
<!-- ボタンクリックでコンテンツを読み込む -->
<button
  hx-get="/api/message"
  hx-target="#result"
  hx-swap="innerHTML">
  メッセージを取得
</button>

<div id="result"></div>
```

サーバー側（Express.js）:

```javascript
app.get('/api/message', (req, res) => {
  res.send('<p>こんにちは、htmx!</p>');
});
```

#### POST リクエスト

```html
<!-- フォーム送信 -->
<form hx-post="/api/comments" hx-target="#comments" hx-swap="beforeend">
  <input type="text" name="author" placeholder="名前" required>
  <textarea name="content" placeholder="コメント" required></textarea>
  <button type="submit">投稿</button>
</form>

<div id="comments"></div>
```

サーバー側:

```javascript
app.post('/api/comments', (req, res) => {
  const { author, content } = req.body;
  res.send(`
    <div class="comment">
      <strong>${author}</strong>
      <p>${content}</p>
    </div>
  `);
});
```

### 主要な属性

| 属性 | 説明 | 例 |
|------|------|-----|
| `hx-get` | GET リクエストを送信 | `hx-get="/api/data"` |
| `hx-post` | POST リクエストを送信 | `hx-post="/api/submit"` |
| `hx-put` | PUT リクエストを送信 | `hx-put="/api/update"` |
| `hx-delete` | DELETE リクエストを送信 | `hx-delete="/api/delete"` |
| `hx-target` | レスポンスを挿入する要素 | `hx-target="#result"` |
| `hx-swap` | 挿入方法 | `hx-swap="innerHTML"` |
| `hx-trigger` | トリガーイベント | `hx-trigger="click, keyup"` |

### hx-swap オプション

```html
<!-- innerHTML: 要素の中身を置き換え（デフォルト） -->
<div hx-get="/content" hx-swap="innerHTML"></div>

<!-- outerHTML: 要素ごと置き換え -->
<div hx-get="/content" hx-swap="outerHTML"></div>

<!-- beforebegin: 要素の前に挿入 -->
<div hx-get="/content" hx-swap="beforebegin"></div>

<!-- afterbegin: 要素の最初の子として挿入 -->
<div hx-get="/content" hx-swap="afterbegin"></div>

<!-- beforeend: 要素の最後の子として挿入 -->
<div hx-get="/content" hx-swap="beforeend"></div>

<!-- afterend: 要素の後に挿入 -->
<div hx-get="/content" hx-swap="afterend"></div>

<!-- delete: 要素を削除 -->
<div hx-get="/content" hx-swap="delete"></div>

<!-- none: スワップしない -->
<div hx-get="/content" hx-swap="none"></div>
```

## 実践例

### 1. インフィニットスクロール

```html
<div id="posts">
  <!-- 既存の投稿 -->
  <div class="post">投稿1</div>
  <div class="post">投稿2</div>
  <div class="post">投稿3</div>

  <!-- トリガー要素 -->
  <div
    hx-get="/api/posts?page=2"
    hx-trigger="revealed"
    hx-swap="afterend"
    hx-target="this">
    <p>読み込み中...</p>
  </div>
</div>
```

サーバー側:

```javascript
app.get('/api/posts', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const posts = getPostsForPage(page);

  let html = posts.map(post => `
    <div class="post">
      <h3>${post.title}</h3>
      <p>${post.content}</p>
    </div>
  `).join('');

  // 次のページがある場合、トリガー要素を追加
  if (hasNextPage(page)) {
    html += `
      <div
        hx-get="/api/posts?page=${page + 1}"
        hx-trigger="revealed"
        hx-swap="afterend"
        hx-target="this">
        <p>読み込み中...</p>
      </div>
    `;
  }

  res.send(html);
});
```

### 2. リアルタイム検索

```html
<input
  type="search"
  name="q"
  placeholder="検索..."
  hx-get="/api/search"
  hx-trigger="keyup changed delay:500ms"
  hx-target="#search-results"
  hx-indicator="#spinner">

<span id="spinner" class="htmx-indicator">検索中...</span>

<div id="search-results"></div>
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

サーバー側:

```javascript
app.get('/api/search', (req, res) => {
  const query = req.query.q;
  const results = searchDatabase(query);

  const html = results.map(result => `
    <div class="result">
      <h4>${result.title}</h4>
      <p>${result.description}</p>
    </div>
  `).join('');

  res.send(html || '<p>結果が見つかりませんでした</p>');
});
```

### 3. 削除機能

```html
<div id="todo-list">
  <div class="todo" id="todo-1">
    <span>タスク1</span>
    <button
      hx-delete="/api/todos/1"
      hx-target="#todo-1"
      hx-swap="outerHTML"
      hx-confirm="本当に削除しますか？">
      削除
    </button>
  </div>
</div>
```

サーバー側:

```javascript
app.delete('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  deleteTodo(id);
  res.send('');  // 空のレスポンス（要素が削除される）
});
```

### 4. 編集可能なコンテンツ

```html
<div id="profile">
  <div id="view-mode">
    <p>名前: <span id="name">田中太郎</span></p>
    <button
      hx-get="/api/profile/edit"
      hx-target="#profile"
      hx-swap="innerHTML">
      編集
    </button>
  </div>
</div>
```

編集フォーム（サーバーから返される）:

```javascript
app.get('/api/profile/edit', (req, res) => {
  const user = getCurrentUser();
  res.send(`
    <form hx-put="/api/profile" hx-target="#profile">
      <input type="text" name="name" value="${user.name}" required>
      <button type="submit">保存</button>
      <button type="button" hx-get="/api/profile/view" hx-target="#profile">
        キャンセル
      </button>
    </form>
  `);
});

app.put('/api/profile', (req, res) => {
  const { name } = req.body;
  updateUser({ name });
  res.send(`
    <div id="view-mode">
      <p>名前: <span id="name">${name}</span></p>
      <button hx-get="/api/profile/edit" hx-target="#profile">編集</button>
    </div>
  `);
});
```

### 5. モーダル

```html
<!-- トリガーボタン -->
<button
  hx-get="/api/modal/login"
  hx-target="body"
  hx-swap="beforeend">
  ログイン
</button>

<div id="modal-container"></div>
```

サーバー側:

```javascript
app.get('/api/modal/login', (req, res) => {
  res.send(`
    <div class="modal" id="login-modal">
      <div class="modal-content">
        <span class="close" onclick="this.closest('.modal').remove()">×</span>
        <h2>ログイン</h2>
        <form hx-post="/api/login" hx-target="#login-modal">
          <input type="email" name="email" placeholder="メールアドレス" required>
          <input type="password" name="password" placeholder="パスワード" required>
          <button type="submit">ログイン</button>
        </form>
      </div>
    </div>
  `);
});
```

## 高度な機能

### 1. Out of Band Swaps (OOB)

複数の要素を同時に更新:

```html
<div id="notifications"></div>
<div id="cart-count"></div>

<button hx-post="/api/add-to-cart" hx-target="#result">
  カートに追加
</button>

<div id="result"></div>
```

サーバー側:

```javascript
app.post('/api/add-to-cart', (req, res) => {
  // 商品をカートに追加
  const cartCount = addToCart(req.body);

  res.send(`
    <div id="result">
      <p>カートに追加しました</p>
    </div>

    <!-- OOB: 別の要素も更新 -->
    <div id="cart-count" hx-swap-oob="true">
      ${cartCount}
    </div>

    <div id="notifications" hx-swap-oob="beforeend">
      <div class="notification">商品が追加されました</div>
    </div>
  `);
});
```

### 2. トリガー修飾子

```html
<!-- イベント1回のみ -->
<button hx-get="/api/data" hx-trigger="click once">
  クリック（1回のみ）
</button>

<!-- イベント頻度制限 -->
<input
  hx-get="/api/search"
  hx-trigger="keyup throttle:1s">

<!-- 条件付きトリガー -->
<button
  hx-get="/api/submit"
  hx-trigger="click[event.shiftKey]">
  Shift+クリック
</button>

<!-- 複数のイベント -->
<div hx-get="/api/data" hx-trigger="mouseenter, focus">
```

### 3. リクエストヘッダー

```html
<button
  hx-get="/api/data"
  hx-headers='{"X-Custom-Header": "value"}'>
  送信
</button>
```

または、JavaScript で:

```javascript
document.body.addEventListener('htmx:configRequest', (event) => {
  event.detail.headers['X-CSRF-Token'] = getCsrfToken();
});
```

### 4. WebSocket

```html
<div hx-ws="connect:/chatroom">
  <form hx-ws="send">
    <input name="message" placeholder="メッセージ">
    <button type="submit">送信</button>
  </form>
  <div id="messages"></div>
</div>
```

### 5. Server-Sent Events (SSE)

```html
<div hx-sse="connect:/events">
  <div hx-sse="swap:message" hx-swap="beforeend"></div>
</div>
```

サーバー側（Node.js）:

```javascript
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const interval = setInterval(() => {
    res.write(`event: message\n`);
    res.write(`data: <div>新しいメッセージ: ${new Date().toLocaleTimeString()}</div>\n\n`);
  }, 5000);

  req.on('close', () => {
    clearInterval(interval);
  });
});
```

## イベントシステム

htmx は豊富なイベントを発行します:

```javascript
// リクエスト前
document.body.addEventListener('htmx:beforeRequest', (event) => {
  console.log('リクエスト開始', event.detail);
});

// レスポンス後
document.body.addEventListener('htmx:afterSwap', (event) => {
  console.log('スワップ完了', event.detail);
});

// エラー処理
document.body.addEventListener('htmx:responseError', (event) => {
  console.error('エラー', event.detail);
  alert('エラーが発生しました');
});
```

## Extensions（拡張機能）

htmx は拡張可能です:

```html
<!-- class-tools 拡張 -->
<script src="https://unpkg.com/htmx.org/dist/ext/class-tools.js"></script>

<div hx-ext="class-tools">
  <button
    hx-get="/api/data"
    classes="add loading:1s">
    読み込み
  </button>
</div>
```

人気の拡張機能:
- `class-tools`: CSSクラスの操作
- `json-enc`: JSONでデータ送信
- `loading-states`: ローディング状態の管理
- `response-targets`: レスポンスコードに応じたターゲット変更

## ベストプラクティス

### 1. プログレッシブエンハンスメント

```html
<!-- JavaScriptなしでも動作 -->
<form action="/api/submit" method="POST" hx-post="/api/submit" hx-target="#result">
  <input type="text" name="message">
  <button type="submit">送信</button>
</form>
```

### 2. アクセシビリティ

```html
<!-- aria属性を追加 -->
<button
  hx-get="/api/data"
  hx-target="#result"
  aria-controls="result"
  aria-live="polite">
  データを取得
</button>

<div id="result" role="region" aria-live="polite"></div>
```

### 3. エラーハンドリング

```javascript
document.body.addEventListener('htmx:responseError', (event) => {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error';
  errorDiv.textContent = 'エラーが発生しました。もう一度お試しください。';
  event.detail.target.prepend(errorDiv);
});
```

### 4. CSRF 保護

```javascript
// すべてのリクエストにCSRFトークンを追加
document.body.addEventListener('htmx:configRequest', (event) => {
  const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
  event.detail.headers['X-CSRF-Token'] = csrfToken;
});
```

## htmx vs JavaScript フレームワーク

### htmx の利点

1. **シンプル**: HTMLだけでインタラクション定義
2. **軽量**: 約14KB（React は約40KB）
3. **学習コスト低**: HTMLがわかれば使える
4. **SEO フレンドリー**: サーバーレンダリング
5. **プログレッシブエンハンスメント**: JavaScriptなしでも動作

### htmx の制限

1. **複雑なUI**: 高度なUIはJavaScriptフレームワークが適切
2. **状態管理**: クライアント側の複雑な状態管理は困難
3. **エコシステム**: React/Vue ほど大きなエコシステムではない

## まとめ

htmx は以下の場合に最適です:

- サーバーレンダリングを中心としたアプリケーション
- シンプルなインタラクションの追加
- JavaScriptフレームワークのオーバーヘッドを避けたい
- プログレッシブエンハンスメントを重視

逆に、以下の場合はReact/Vueなどが適切:

- 複雑なクライアント側の状態管理
- リアルタイムコラボレーション
- オフライン機能
- 大規模なSPA

htmx は「ちょうど良い量のJavaScript」を提供し、多くのWebアプリケーションにとって最適な選択肢となります。

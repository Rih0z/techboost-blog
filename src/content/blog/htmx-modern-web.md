---
title: "HTMXで始めるモダンWeb開発 — JavaScriptなしでリッチUIを実現"
description: "HTMXを使えばJavaScriptフレームワーク不要でSPA的なUXが実現できます。hx-get、hx-post、hx-swapなどの基本属性から実践的なサーバー連携パターンまで完全ガイド。"
pubDate: "2026-02-05"
tags: ["HTMX", "HTML", "Web開発", "サーバーサイド", "フロントエンド"]
---

## HTMXとは

HTMX（Hypermedia Extensions）は、HTML属性を拡張することで、JavaScriptを書かずにAJAXリクエストやWebSocket、Server-Sent Eventsなどのモダンなブラウザ機能を利用できるライブラリです。

2026年現在、バージョン2.xが主流となり、多くの開発者がReactやVueの代替として採用し始めています。

### HTMXの哲学

- **HTMLファーストアプローチ**: すべてがHTML属性で完結
- **サーバーサイドレンダリング**: サーバーがHTMLを返すだけ
- **プログレッシブエンハンスメント**: JavaScriptが無効でも動作する
- **小さなフットプリント**: 約15KB（gzip圧縮後）

## 基本的な使い方

### インストール

CDNから読み込むか、npmでインストールできます。

```html
<!-- CDN -->
<script src="https://unpkg.com/htmx.org@2.0.0"></script>
```

```bash
# npm
npm install htmx.org

# pnpm
pnpm add htmx.org
```

### 最初のHTMXアプリケーション

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/htmx.org@2.0.0"></script>
</head>
<body>
  <button hx-get="/api/hello" hx-target="#result">
    クリックしてください
  </button>
  <div id="result"></div>
</body>
</html>
```

サーバー側（Express.jsの例）:

```javascript
app.get('/api/hello', (req, res) => {
  res.send('<p>こんにちは、HTMX！</p>');
});
```

このシンプルなコードで、ページリロードなしでコンテンツを更新できます。

## 主要な属性

### hx-get / hx-post / hx-put / hx-delete

HTTPメソッドに対応した属性です。

```html
<!-- GET リクエスト -->
<button hx-get="/api/users" hx-target="#users">
  ユーザー一覧を取得
</button>

<!-- POST リクエスト -->
<form hx-post="/api/users" hx-target="#result">
  <input name="username" type="text">
  <button type="submit">送信</button>
</form>

<!-- DELETE リクエスト -->
<button hx-delete="/api/users/123" hx-confirm="本当に削除しますか？">
  削除
</button>
```

### hx-target

レスポンスを挿入する要素を指定します。

```html
<!-- IDで指定 -->
<button hx-get="/content" hx-target="#main">読み込む</button>
<div id="main"></div>

<!-- CSSセレクターで指定 -->
<button hx-get="/content" hx-target=".content-area">読み込む</button>

<!-- 特殊な値 -->
<button hx-get="/content" hx-target="this">自分自身を置換</button>
<button hx-get="/content" hx-target="closest div">最も近い親div</button>
```

### hx-swap

コンテンツの挿入方法を指定します。

```html
<!-- 内側を完全置換（デフォルト） -->
<div hx-get="/content" hx-swap="innerHTML"></div>

<!-- 要素自体を置換 -->
<div hx-get="/content" hx-swap="outerHTML"></div>

<!-- 前後に追加 -->
<ul hx-get="/items" hx-swap="beforeend">
  <!-- 新しいアイテムがここに追加される -->
</ul>

<!-- アフターエフェクト付き -->
<div hx-get="/content" hx-swap="innerHTML swap:1s settle:2s"></div>
```

### hx-trigger

イベントトリガーを指定します。

```html
<!-- カスタムイベント -->
<div hx-get="/updates" hx-trigger="every 5s">
  5秒ごとに更新
</div>

<!-- 複数のトリガー -->
<input
  hx-get="/search"
  hx-trigger="keyup changed delay:500ms, search"
  hx-target="#results">

<!-- スクロールトリガー -->
<div hx-get="/next-page" hx-trigger="revealed">
  スクロールで表示されたら次のページを読み込む
</div>
```

## 実践的なパターン

### インフィニットスクロール

```html
<div id="content">
  <div class="item">アイテム1</div>
  <div class="item">アイテム2</div>
  <!-- ... -->
  <div
    hx-get="/api/items?page=2"
    hx-trigger="revealed"
    hx-swap="afterend">
    <div class="loading">読み込み中...</div>
  </div>
</div>
```

サーバー側:

```javascript
app.get('/api/items', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const items = getItems(page);
  const nextPage = page + 1;

  res.send(`
    ${items.map(item => `<div class="item">${item.name}</div>`).join('')}
    <div hx-get="/api/items?page=${nextPage}"
         hx-trigger="revealed"
         hx-swap="afterend">
      <div class="loading">読み込み中...</div>
    </div>
  `);
});
```

### リアルタイム検索

```html
<input
  type="text"
  name="q"
  hx-get="/api/search"
  hx-trigger="input changed delay:300ms"
  hx-target="#search-results"
  placeholder="検索...">

<div id="search-results"></div>
```

サーバー側:

```javascript
app.get('/api/search', (req, res) => {
  const query = req.query.q;
  const results = searchDatabase(query);

  if (results.length === 0) {
    res.send('<p>結果が見つかりませんでした</p>');
    return;
  }

  res.send(`
    <ul>
      ${results.map(r => `<li>${r.name}</li>`).join('')}
    </ul>
  `);
});
```

### モーダルウィンドウ

```html
<button hx-get="/modal/edit/123" hx-target="body" hx-swap="beforeend">
  編集
</button>
```

サーバー側:

```javascript
app.get('/modal/edit/:id', (req, res) => {
  const user = getUser(req.params.id);

  res.send(`
    <div class="modal" id="modal">
      <div class="modal-content">
        <h2>ユーザー編集</h2>
        <form hx-put="/api/users/${user.id}" hx-target="#modal" hx-swap="outerHTML">
          <input name="name" value="${user.name}">
          <button type="submit">保存</button>
          <button type="button" onclick="document.getElementById('modal').remove()">
            キャンセル
          </button>
        </form>
      </div>
    </div>
  `);
});
```

### 楽観的UI

```html
<button
  hx-post="/api/like/123"
  hx-target="this"
  hx-swap="outerHTML">
  いいね
</button>
```

サーバー側で即座にUIを返し、バックグラウンドで処理:

```javascript
app.post('/api/like/:id', async (req, res) => {
  // 先にUIを返す
  res.send(`
    <button
      hx-post="/api/like/${req.params.id}"
      hx-target="this"
      hx-swap="outerHTML"
      class="liked">
      いいね済み
    </button>
  `);

  // 非同期で処理
  await saveLike(req.params.id);
});
```

## フレームワークとの統合

### Next.js（App Router）との連携

```typescript
// app/api/content/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return new NextResponse(
    '<div>動的に生成されたコンテンツ</div>',
    {
      headers: {
        'Content-Type': 'text/html',
      },
    }
  );
}
```

```tsx
// app/page.tsx
export default function Home() {
  return (
    <div>
      <button hx-get="/api/content" hx-target="#result">
        読み込む
      </button>
      <div id="result"></div>
    </div>
  );
}
```

### Astroとの連携

```astro
---
// src/pages/api/hello.ts
export async function GET() {
  return new Response('<p>Hello from Astro!</p>', {
    headers: { 'Content-Type': 'text/html' },
  });
}
---

<button hx-get="/api/hello" hx-target="#content">Load</button>
<div id="content"></div>
```

## パフォーマンスと最適化

### リクエストのキャンセル

```html
<input
  hx-get="/search"
  hx-trigger="input changed delay:500ms"
  hx-sync="this:abort">
```

### キャッシュ制御

```javascript
res.set('Cache-Control', 'max-age=300'); // 5分間キャッシュ
```

### 部分的なHTMLレスポンス

大きなHTMLを返すのではなく、必要な部分だけを返すことでパフォーマンスを改善できます。

```javascript
// ❌ 遅い
res.send(renderFullPage(data));

// ✅ 速い
res.send(renderPartial(data));
```

## まとめ

HTMXは、JavaScript フレームワークの複雑さを避けながら、モダンなユーザー体験を提供する優れた選択肢です。特に以下のようなケースで有効です。

- サーバーサイドレンダリングを重視するプロジェクト
- 小規模〜中規模のWebアプリケーション
- チームのJavaScript習熟度が低い場合
- SEOとパフォーマンスを重視する場合

まずは既存のプロジェクトの一部にHTMXを導入し、その効果を実感してみることをお勧めします。

---
title: 'CSSコンテナクエリ完全ガイド - 次世代レスポンシブデザインの実現'
description: 'CSSコンテナクエリ(@container)を徹底解説。メディアクエリを超える柔軟なレスポンシブデザイン、コンテナクエリ単位、実践的なパターンを詳しく紹介'
pubDate: 'Feb 05 2026'
tags: ['CSS', 'レスポンシブ', 'フロントエンド', 'Web Design']
---

# CSSコンテナクエリ完全ガイド - 次世代レスポンシブデザインの実現

CSSコンテナクエリは、要素の親コンテナのサイズに基づいてスタイルを適用できる画期的な機能です。従来のメディアクエリがビューポートサイズに依存していたのに対し、コンテナクエリはコンポーネント単位でのレスポンシブデザインを可能にします。

この記事では、CSSコンテナクエリの基本から実践的な使い方まで、完全に解説します。

## CSSコンテナクエリとは

CSSコンテナクエリ(@container)は、親要素のサイズに応じて子要素のスタイルを変更できる機能です。

### 主な特徴

- **コンポーネント単位**: 親のサイズに応じた柔軟なデザイン
- **再利用性**: どこに配置しても適切に表示
- **コンテナ単位**: 新しいサイズ単位(cqw, cqh等)
- **メディアクエリ不要**: ビューポートに依存しない
- **高いブラウザサポート**: モダンブラウザで利用可能

## 基本的な使い方

### 最初のコンテナクエリ

```html
<div class="card-container">
  <div class="card">
    <h2>タイトル</h2>
    <p>コンテンツ...</p>
  </div>
</div>
```

```css
/* コンテナを定義 */
.card-container {
  container-type: inline-size;
  /* または */
  container-name: card;
}

/* コンテナクエリ */
@container (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .card h2 {
    font-size: 2rem;
  }
}

@container (min-width: 600px) {
  .card {
    grid-template-columns: 1fr 1fr 1fr;
  }
}
```

### container-type プロパティ

```css
/* inline-size: 幅のみを監視 */
.container-inline {
  container-type: inline-size;
}

/* size: 幅と高さの両方を監視 */
.container-size {
  container-type: size;
}

/* normal: コンテナクエリ無効 */
.container-normal {
  container-type: normal;
}
```

## 名前付きコンテナ

### container-name

```css
/* コンテナに名前を付ける */
.sidebar {
  container-type: inline-size;
  container-name: sidebar;
}

.main-content {
  container-type: inline-size;
  container-name: main;
}

/* 名前を指定してクエリ */
@container sidebar (min-width: 300px) {
  .widget {
    padding: 2rem;
  }
}

@container main (min-width: 800px) {
  .article {
    column-count: 2;
  }
}
```

### ショートハンド構文

```css
/* container: name / type */
.card {
  container: card / inline-size;
}

/* 複数の名前 */
.complex {
  container: primary secondary / inline-size;
}
```

## コンテナクエリ単位

### サイズ単位の種類

```css
.container {
  container-type: inline-size;
}

.child {
  /* cqw: コンテナ幅の1% */
  width: 50cqw;

  /* cqh: コンテナ高さの1% */
  height: 30cqh;

  /* cqi: インライン方向の1% */
  padding: 2cqi;

  /* cqb: ブロック方向の1% */
  margin: 1cqb;

  /* cqmin: cqiとcqbの小さい方 */
  gap: 5cqmin;

  /* cqmax: cqiとcqbの大きい方 */
  font-size: 3cqmax;
}
```

### 実用例

```css
.card-container {
  container: card / inline-size;
}

.card {
  padding: 2cqw; /* コンテナ幅の2% */
}

.card-title {
  /* コンテナサイズに応じたフォントサイズ */
  font-size: clamp(1rem, 4cqw, 2rem);
}

.card-image {
  /* コンテナ幅の100% */
  width: 100cqw;
  /* アスペクト比維持 */
  aspect-ratio: 16 / 9;
}
```

## 実践的なパターン

### カードコンポーネント

```html
<div class="card-grid">
  <div class="card">
    <img src="image.jpg" alt="Image" />
    <div class="card-content">
      <h3>タイトル</h3>
      <p>説明文...</p>
      <button>詳細を見る</button>
    </div>
  </div>
</div>
```

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.card {
  container: card / inline-size;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 小さいカード (300px未満) */
.card-content {
  padding: 1rem;
}

.card h3 {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

.card p {
  font-size: 0.875rem;
  color: #666;
}

/* 中サイズカード (400px以上) */
@container card (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 200px 1fr;
  }

  .card-content {
    padding: 1.5rem;
  }

  .card h3 {
    font-size: 1.5rem;
  }

  .card p {
    font-size: 1rem;
  }
}

/* 大きいカード (600px以上) */
@container card (min-width: 600px) {
  .card {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }

  .card img {
    aspect-ratio: 21 / 9;
    object-fit: cover;
  }

  .card-content {
    padding: 2rem;
  }

  .card h3 {
    font-size: 2rem;
  }
}
```

### サイドバーパターン

```html
<div class="layout">
  <aside class="sidebar">
    <nav>
      <ul>
        <li><a href="#">ホーム</a></li>
        <li><a href="#">ブログ</a></li>
        <li><a href="#">お問い合わせ</a></li>
      </ul>
    </nav>
  </aside>
  <main class="main-content">
    <!-- コンテンツ -->
  </main>
</div>
```

```css
.layout {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2rem;
}

.sidebar {
  container: sidebar / inline-size;
  background: #f5f5f5;
}

.sidebar nav ul {
  list-style: none;
  padding: 0;
}

/* 狭いサイドバー */
.sidebar nav a {
  display: block;
  padding: 0.75rem;
  text-decoration: none;
  color: #333;
}

/* 広いサイドバー (200px以上) */
@container sidebar (min-width: 200px) {
  .sidebar nav a {
    padding: 1rem 1.5rem;
    font-size: 1.125rem;
  }

  .sidebar nav a::before {
    content: '→ ';
  }
}

/* さらに広いサイドバー (300px以上) */
@container sidebar (min-width: 300px) {
  .sidebar nav {
    padding: 2rem;
  }

  .sidebar nav a {
    border-radius: 8px;
    margin-bottom: 0.5rem;
  }

  .sidebar nav a:hover {
    background: #e0e0e0;
  }
}
```

### 商品リスト

```html
<div class="product-container">
  <article class="product">
    <img src="product.jpg" alt="Product" />
    <h4>商品名</h4>
    <p class="price">¥1,980</p>
    <p class="description">商品説明...</p>
    <button>カートに追加</button>
  </article>
</div>
```

```css
.product-container {
  container: product / inline-size;
}

.product {
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 1rem;
}

/* コンパクト表示 (デフォルト) */
.product img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  margin-bottom: 0.5rem;
}

.product h4 {
  font-size: 1rem;
  margin: 0.5rem 0;
}

.product .price {
  font-size: 1.25rem;
  font-weight: bold;
  color: #e53935;
}

.product .description {
  display: none; /* 小さい時は非表示 */
}

/* 中サイズ (250px以上) */
@container product (min-width: 250px) {
  .product {
    display: grid;
    grid-template-columns: 100px 1fr;
    grid-template-areas:
      'image title'
      'image price'
      'image button';
    gap: 0.5rem;
  }

  .product img {
    grid-area: image;
    width: 100px;
    height: 100px;
  }

  .product h4 {
    grid-area: title;
    margin: 0;
  }

  .product .price {
    grid-area: price;
  }

  .product button {
    grid-area: button;
  }
}

/* 大サイズ (400px以上) */
@container product (min-width: 400px) {
  .product {
    grid-template-columns: 150px 1fr;
    grid-template-areas:
      'image title'
      'image price'
      'image description'
      'image button';
    padding: 1.5rem;
  }

  .product img {
    width: 150px;
    height: 150px;
  }

  .product .description {
    display: block;
    grid-area: description;
    font-size: 0.875rem;
    color: #666;
  }
}
```

## 高度なテクニック

### ネストしたコンテナ

```css
.outer-container {
  container: outer / inline-size;
}

.inner-container {
  container: inner / inline-size;
}

/* 外側コンテナのクエリ */
@container outer (min-width: 600px) {
  .outer-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}

/* 内側コンテナのクエリ */
@container inner (min-width: 300px) {
  .inner-content {
    padding: 2rem;
  }
}
```

### スタイルクエリ(実験的)

```css
.theme-container {
  container-name: theme;
  --theme: dark;
}

/* スタイルに基づくクエリ */
@container style(--theme: dark) {
  .content {
    background: #1a1a1a;
    color: white;
  }
}

@container style(--theme: light) {
  .content {
    background: white;
    color: #1a1a1a;
  }
}
```

### 複雑な条件

```css
.container {
  container: main / inline-size;
}

/* AND条件 */
@container main (min-width: 400px) and (max-width: 800px) {
  .content {
    column-count: 2;
  }
}

/* OR条件 (not使用) */
@container main not (min-width: 600px) {
  .content {
    font-size: 0.875rem;
  }
}
```

## ユースケース

### レスポンシブナビゲーション

```html
<nav class="navigation">
  <ul class="nav-list">
    <li><a href="#">ホーム</a></li>
    <li><a href="#">サービス</a></li>
    <li><a href="#">会社概要</a></li>
    <li><a href="#">お問い合わせ</a></li>
  </ul>
</nav>
```

```css
.navigation {
  container: nav / inline-size;
  background: #333;
}

/* デフォルト: ハンバーガーメニュー */
.nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-list li {
  border-bottom: 1px solid #444;
}

.nav-list a {
  display: block;
  padding: 1rem;
  color: white;
  text-decoration: none;
}

/* 中サイズ: 横並び */
@container nav (min-width: 600px) {
  .nav-list {
    display: flex;
    justify-content: space-around;
  }

  .nav-list li {
    border-bottom: none;
  }
}

/* 大サイズ: 余白追加 */
@container nav (min-width: 900px) {
  .navigation {
    padding: 0 2rem;
  }

  .nav-list a {
    padding: 1.5rem 2rem;
    font-size: 1.125rem;
  }
}
```

### フォームレイアウト

```html
<form class="form-container">
  <div class="form-field">
    <label>名前</label>
    <input type="text" />
  </div>
  <div class="form-field">
    <label>メール</label>
    <input type="email" />
  </div>
  <button type="submit">送信</button>
</form>
```

```css
.form-container {
  container: form / inline-size;
  padding: 1rem;
}

/* 小サイズ: 縦並び */
.form-field {
  margin-bottom: 1rem;
}

.form-field label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.form-field input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

/* 中サイズ: ラベルと入力を横並び */
@container form (min-width: 400px) {
  .form-field {
    display: grid;
    grid-template-columns: 150px 1fr;
    align-items: center;
    gap: 1rem;
  }

  .form-field label {
    margin-bottom: 0;
    text-align: right;
  }
}

/* 大サイズ: 2カラム */
@container form (min-width: 700px) {
  .form-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  button[type='submit'] {
    grid-column: 1 / -1;
    padding: 1rem 2rem;
    font-size: 1.125rem;
  }
}
```

## パフォーマンス考慮事項

### 最適化のヒント

```css
/* ❌ 避けるべき: container-type: size */
.container {
  container-type: size; /* 幅と高さの両方を監視 */
  /* レイアウトシフトの可能性 */
}

/* ✅ 推奨: container-type: inline-size */
.container {
  container-type: inline-size; /* 幅のみ */
  /* パフォーマンスが良い */
}

/* 必要に応じて使い分ける */
.specific-case {
  container-type: size; /* 本当に必要な場合のみ */
}
```

### ブラウザサポート

```css
/* フォールバック */
.card {
  padding: 1rem;
}

/* コンテナクエリサポート時 */
@supports (container-type: inline-size) {
  .card-container {
    container: card / inline-size;
  }

  @container card (min-width: 400px) {
    .card {
      padding: 2rem;
    }
  }
}
```

## メディアクエリとの比較

### メディアクエリ

```css
/* ビューポートベース */
@media (min-width: 768px) {
  .card {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
```

### コンテナクエリ

```css
/* コンテナベース */
.card-container {
  container: card / inline-size;
}

@container card (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
```

### ハイブリッドアプローチ

```css
/* ページ全体のレイアウト: メディアクエリ */
@media (min-width: 1024px) {
  .main-layout {
    display: grid;
    grid-template-columns: 300px 1fr;
  }
}

/* コンポーネント: コンテナクエリ */
.component {
  container: component / inline-size;
}

@container component (min-width: 400px) {
  .component-content {
    display: flex;
    gap: 2rem;
  }
}
```

## まとめ

CSSコンテナクエリは、レスポンシブデザインに革命をもたらす機能です。

主なメリット:

- **柔軟性**: コンポーネント単位でのレスポンシブ
- **再利用性**: どこに配置しても適切に表示
- **保守性**: メディアクエリより管理しやすい
- **パフォーマンス**: 効率的なレイアウト制御

モダンなWebデザインには、CSSコンテナクエリが不可欠な技術となっています。

## 参考リンク

- [MDN - CSS Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Container_Queries)
- [Can I Use - Container Queries](https://caniuse.com/css-container-queries)
- [Web.dev - Container Queries](https://web.dev/new-responsive/)

---
title: '2026年のモダンCSS完全ガイド - コンテナクエリ、Subgrid、ネストの実践'
description: 'コンテナクエリ・Subgrid・CSSネスト・@layer・light-dark()など2026年に使えるモダンCSS新機能を実践コード付きで徹底解説。SassやJavaScriptなしで実現できるレスポンシブデザインとテーマ切替の最新手法を紹介します。'
pubDate: '2026-02-05'
tags: ['CSS', 'Docker', 'インフラ', 'フロントエンド']
heroImage: '../../assets/thumbnails/modern-css-2026.jpg'
---

CSSは近年、驚くべき進化を遂げています。2026年現在、コンテナクエリ、Subgrid、CSSネストなど、これまでSassやJavaScriptが必要だった機能がネイティブで利用可能になりました。

本記事では、2026年に使える最新CSS機能を、実践的なコード例とともに詳しく解説します。

## Container Queries（コンテナクエリ）

コンテナクエリは、親要素のサイズに基づいてスタイルを変更できる革新的な機能です。

### 基本的な使い方

```css
/* コンテナを定義 */
.card-container {
  container-type: inline-size;
  container-name: card;
}

/* コンテナのサイズに応じてスタイル変更 */
@container card (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 200px 1fr;
  }

  .card-image {
    grid-row: 1 / -1;
  }
}

@container card (max-width: 399px) {
  .card {
    display: flex;
    flex-direction: column;
  }
}
```

### 実践例: レスポンシブカード

```html
<div class="grid">
  <div class="card-container">
    <div class="card">
      <img class="card-image" src="image.jpg" alt="Card">
      <div class="card-content">
        <h3>Card Title</h3>
        <p>Card description...</p>
      </div>
    </div>
  </div>
</div>
```

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.card-container {
  container-type: inline-size;
  container-name: card;
}

.card {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

/* 小さいコンテナ: 縦並び */
@container card (max-width: 399px) {
  .card {
    display: flex;
    flex-direction: column;
  }

  .card-image {
    width: 100%;
    height: 200px;
    object-fit: cover;
  }

  .card-content {
    padding: 1rem;
  }

  .card h3 {
    font-size: 1.25rem;
  }
}

/* 大きいコンテナ: 横並び */
@container card (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 200px 1fr;
  }

  .card-image {
    width: 200px;
    height: 100%;
    object-fit: cover;
  }

  .card-content {
    padding: 1.5rem;
  }

  .card h3 {
    font-size: 1.5rem;
  }
}

/* さらに大きいコンテナ: より豊かなレイアウト */
@container card (min-width: 600px) {
  .card {
    grid-template-columns: 300px 1fr;
  }

  .card-image {
    width: 300px;
  }

  .card-content {
    padding: 2rem;
  }

  .card h3 {
    font-size: 2rem;
    margin-bottom: 1rem;
  }
}
```

### コンテナクエリ単位

```css
.card-container {
  container-type: inline-size;
}

.card h3 {
  /* コンテナ幅の5% */
  font-size: 5cqi;

  /* コンテナ高さの10% */
  padding: 10cqh 0;

  /* コンテナの最小値の3% */
  margin: 3cqmin;

  /* コンテナの最大値の2% */
  border-radius: 2cqmax;
}
```

単位一覧:
- `cqw`: コンテナ幅の1%
- `cqh`: コンテナ高さの1%
- `cqi`: インライン方向の1%
- `cqb`: ブロック方向の1%
- `cqmin`: cqiとcqbの小さい方
- `cqmax`: cqiとcqbの大きい方

### スタイルクエリ（実験的）

```css
.theme-container {
  container-name: theme;
  --theme: dark;
}

/* カスタムプロパティに基づいてスタイル変更 */
@container style(--theme: dark) {
  .card {
    background: #1a1a1a;
    color: #fff;
  }
}

@container style(--theme: light) {
  .card {
    background: #fff;
    color: #000;
  }
}
```

## CSS Grid Level 3 - Subgrid

Subgridは、親のグリッドラインを子要素が継承できる機能です。

### 基本的な使い方

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.card {
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 3;
}
```

### 実践例: カードグリッド

```html
<div class="card-grid">
  <article class="card">
    <img src="image1.jpg" alt="Image 1">
    <h3>Card Title 1</h3>
    <p>Short description.</p>
    <button>Read More</button>
  </article>
  <article class="card">
    <img src="image2.jpg" alt="Image 2">
    <h3>Much Longer Card Title 2</h3>
    <p>This is a much longer description that spans multiple lines.</p>
    <button>Read More</button>
  </article>
  <article class="card">
    <img src="image3.jpg" alt="Image 3">
    <h3>Card Title 3</h3>
    <p>Medium length description here.</p>
    <button>Read More</button>
  </article>
</div>
```

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  /* 各カードの行を4つ定義 */
  grid-auto-rows: auto auto 1fr auto;
}

.card {
  display: grid;
  /* 親グリッドの行を継承 */
  grid-template-rows: subgrid;
  grid-row: span 4;

  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

.card img {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.card h3 {
  padding: 1rem;
  margin: 0;
}

.card p {
  padding: 0 1rem;
  margin: 0;
}

.card button {
  margin: 1rem;
  /* 自動的に最下部に配置される */
}
```

### 複雑なレイアウト

```css
.page {
  display: grid;
  grid-template-columns: [full-start] 1fr [content-start] minmax(0, 1200px) [content-end] 1fr [full-end];
  gap: 2rem;
}

.section {
  display: grid;
  grid-template-columns: subgrid;
  grid-column: full;
}

.section-header {
  grid-column: content;
}

.section-content {
  grid-column: full;
  background: #f5f5f5;
}

.section-footer {
  grid-column: content;
}
```

## CSS Nesting（CSSネスト）

ネイティブCSSでSassのようなネストが可能になりました。

### 基本構文

```css
/* 従来の書き方 */
.card { }
.card h3 { }
.card p { }
.card:hover { }

/* ネストを使った書き方 */
.card {
  border: 1px solid #ddd;

  & h3 {
    font-size: 1.5rem;
    color: #333;
  }

  & p {
    color: #666;
  }

  &:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
}
```

### メディアクエリのネスト

```css
.container {
  padding: 1rem;

  @media (min-width: 768px) {
    padding: 2rem;
  }

  @media (min-width: 1024px) {
    padding: 3rem;
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

### 複雑なセレクター

```css
.nav {
  display: flex;
  gap: 1rem;

  & li {
    list-style: none;

    & a {
      text-decoration: none;
      color: #333;

      &:hover {
        color: #0066cc;
      }

      &[aria-current="page"] {
        font-weight: bold;
        color: #0066cc;
      }
    }
  }

  &.is-mobile {
    flex-direction: column;

    & li {
      border-bottom: 1px solid #ddd;
    }
  }
}
```

## :has()セレクター（親セレクター）

子要素の存在に基づいて親要素をスタイル指定できます。

### 基本的な使い方

```css
/* 画像を含むカードのスタイル */
.card:has(img) {
  padding: 0;
}

/* フォーム内にエラーがある場合 */
form:has(.error) {
  border: 2px solid red;
}

/* チェックされたinputを持つlabel */
label:has(input:checked) {
  background: #e3f2fd;
  font-weight: bold;
}
```

### 実践例

```css
/* 兄弟要素の状態に応じてスタイル変更 */
.card {
  border: 1px solid #ddd;
}

/* 次の要素がhoverされている場合 */
.card:has(+ .card:hover) {
  border-right-color: transparent;
}

/* 前の要素がhoverされている場合 */
.card:hover + .card {
  border-left-color: transparent;
}

/* 子孫要素の状態 */
.sidebar:has(.notification.unread) {
  /* 未読通知がある場合のスタイル */
}

.sidebar:has(.notification.unread):before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 8px;
  height: 8px;
  background: red;
  border-radius: 50%;
}
```

### フォームのバリデーション

```css
/* 有効な入力 */
.form-group:has(input:valid) label {
  color: green;
}

.form-group:has(input:valid) input {
  border-color: green;
}

/* 無効な入力 */
.form-group:has(input:invalid:not(:placeholder-shown)) label {
  color: red;
}

.form-group:has(input:invalid:not(:placeholder-shown)) input {
  border-color: red;
}

/* すべてvalidなフォーム */
form:has(input:not(:valid)) button[type="submit"] {
  opacity: 0.5;
  pointer-events: none;
}
```

## 色の操作

### color-mix()

```css
:root {
  --primary: #0066cc;
  --secondary: #ff6600;
}

.button {
  /* 2色をミックス */
  background: color-mix(in srgb, var(--primary) 70%, white);

  &:hover {
    background: color-mix(in srgb, var(--primary) 85%, white);
  }
}

/* 透明度の調整 */
.overlay {
  background: color-mix(in srgb, black 50%, transparent);
}

/* グラデーション */
.gradient {
  background: linear-gradient(
    to right,
    var(--primary),
    color-mix(in srgb, var(--primary), var(--secondary)),
    var(--secondary)
  );
}
```

### 相対色構文

```css
:root {
  --primary: oklch(60% 0.15 250);
}

.button {
  /* ベース色 */
  background: var(--primary);

  /* 明度を上げる */
  &:hover {
    background: oklch(from var(--primary) calc(l + 0.1) c h);
  }

  /* 彩度を下げる */
  &:disabled {
    background: oklch(from var(--primary) l calc(c * 0.3) h);
  }

  /* 色相を変更 */
  &.secondary {
    background: oklch(from var(--primary) l c calc(h + 180));
  }
}
```

## Anchor Positioning

要素を別の要素に相対的に配置できます。

### 基本的な使い方

```css
/* アンカー要素を定義 */
.tooltip-trigger {
  anchor-name: --trigger;
}

/* アンカーに基づいて配置 */
.tooltip {
  position: absolute;
  position-anchor: --trigger;

  /* アンカーの上部に配置 */
  bottom: anchor(top);
  left: anchor(center);
  translate: -50% -8px;
}
```

### ドロップダウンメニュー

```css
.menu-button {
  anchor-name: --menu-button;
}

.dropdown-menu {
  position: absolute;
  position-anchor: --menu-button;

  /* ボタンの下に配置 */
  top: anchor(bottom);
  left: anchor(left);

  /* ビューポートからはみ出る場合は上に表示 */
  position-fallback: --menu-fallback;
}

@position-fallback --menu-fallback {
  @try {
    top: anchor(bottom);
    left: anchor(left);
  }

  @try {
    bottom: anchor(top);
    left: anchor(left);
  }

  @try {
    top: anchor(bottom);
    right: anchor(right);
  }
}
```

## View Transitions API

ページ遷移時のアニメーション。

### 基本的な使い方

```css
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.3s;
}

/* カスタムアニメーション */
@keyframes slide-from-right {
  from {
    transform: translateX(100%);
  }
}

::view-transition-new(root) {
  animation: slide-from-right 0.3s ease-out;
}
```

```javascript
// JavaScriptで実行
document.startViewTransition(() => {
  // DOM更新
  updateDOM();
});
```

### 特定要素のトランジション

```css
.card {
  view-transition-name: card-1;
}

::view-transition-old(card-1),
::view-transition-new(card-1) {
  animation-duration: 0.5s;
}
```

## Scroll-driven Animations

スクロールに応じたアニメーション。

```css
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.reveal {
  animation: fade-in linear;
  animation-timeline: view();
  animation-range: entry 0% cover 30%;
}

/* スクロールバーに応じた進捗表示 */
.progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  height: 4px;
  background: linear-gradient(to right, #0066cc, #00cc66);

  animation: grow-progress linear;
  animation-timeline: scroll(root);
  transform-origin: left;
}

@keyframes grow-progress {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}
```

## 実践的なコンポーネント例

### レスポンシブナビゲーション

```css
.nav {
  container-type: inline-size;

  & ul {
    display: flex;
    gap: 2rem;
    list-style: none;
    padding: 0;
    margin: 0;

    @container (max-width: 600px) {
      flex-direction: column;
      gap: 0;
    }
  }

  & li {
    @container (max-width: 600px) {
      border-bottom: 1px solid #ddd;
    }
  }

  & a {
    text-decoration: none;
    color: #333;
    padding: 0.5rem 1rem;
    display: block;

    &:hover {
      background: color-mix(in srgb, currentColor 10%, transparent);
    }

    &[aria-current="page"] {
      font-weight: bold;
      background: color-mix(in srgb, currentColor 15%, transparent);
    }
  }
}
```

### ダークモード対応カード

```css
.card {
  --bg: light-dark(#fff, #1a1a1a);
  --text: light-dark(#333, #fff);
  --border: light-dark(#ddd, #444);

  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.5rem;

  & h3 {
    margin-top: 0;
    color: light-dark(#000, #fff);
  }

  &:hover {
    box-shadow: 0 4px 12px light-dark(
      rgba(0, 0, 0, 0.1),
      rgba(255, 255, 255, 0.1)
    );
  }
}
```

## まとめ

2026年のモダンCSSは、以下のような強力な機能を提供します。

1. **Container Queries**: コンポーネント単位でのレスポンシブデザイン
2. **Subgrid**: 複雑なグリッドレイアウトの簡素化
3. **CSS Nesting**: メンテナンス性の向上
4. **:has()**: 親要素の条件付きスタイリング
5. **color-mix()**: 色の柔軟な操作
6. **Anchor Positioning**: 要素の相対配置
7. **View Transitions**: スムーズなページ遷移
8. **Scroll-driven Animations**: スクロール連動アニメーション

これらの機能により、JavaScriptやSassに頼らず、純粋なCSSでより豊かなデザインが実現できます。ブラウザサポートを確認しながら、積極的に活用していきましょう。

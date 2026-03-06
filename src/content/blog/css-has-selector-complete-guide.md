---
title: "CSS :has()セレクタ完全ガイド2026: 親要素セレクタの革命的活用法"
description: "CSS :has()セレクタの全機能を徹底解説。親要素セレクタ、条件付きスタイリング、フォームバリデーション、レスポンシブデザインまで、JavaScriptなしで実現する実践的テクニックを紹介します。基礎から応用まで幅広くカバーしています。"
pubDate: "2026-02-06"
tags: ["CSS", ":has()", "Selectors", "Modern CSS", "Frontend", "プログラミング"]
---
CSS :has()セレクタは、親要素や兄弟要素を選択できる革命的なセレクタです。本記事では、:has()の基本から高度な活用法まで、JavaScriptなしで実現できる実践的なテクニックを徹底解説します。

## :has()セレクタとは

### 概要

:has()は、指定した子要素や子孫要素を持つ親要素を選択できるセレクタです。

```css
/* 基本構文 */
親要素:has(子要素) {
  /* 親要素のスタイル */
}

/* 例: imgを含むdivを選択 */
div:has(img) {
  border: 2px solid blue;
}

/* チェックされたinputを含むformを選択 */
form:has(input:checked) {
  background: #f0f0f0;
}
```

### 従来の方法との比較

```css
/* 従来の方法（JavaScriptが必要） */
/* JavaScript: */
/* document.querySelectorAll('div').forEach(div => { */
/*   if (div.querySelector('img')) { */
/*     div.classList.add('has-image') */
/*   } */
/* }) */

/* CSS: */
.has-image {
  border: 2px solid blue;
}

/* :has()を使った方法（JavaScriptなし） */
div:has(img) {
  border: 2px solid blue;
}
```

### ブラウザサポート

```css
/**
 * 2026年現在のサポート状況:
 * - Chrome 105+ (2022年9月〜)
 * - Firefox 121+ (2023年12月〜)
 * - Safari 15.4+ (2022年3月〜)
 * - Edge 105+ (2022年9月〜)
 *
 * サポート率: 95%以上（グローバル）
 */

/* フォールバック */
@supports not (selector(:has(*))) {
  /* :has()をサポートしないブラウザ向けのスタイル */
  div {
    border: 1px solid gray;
  }
}

@supports selector(:has(*)) {
  /* :has()をサポートするブラウザ向けのスタイル */
  div:has(img) {
    border: 2px solid blue;
  }
}
```

## 基本的な使い方

### 子要素の存在チェック

```css
/* 直接の子要素 */
article:has(> img) {
  /* imgを直接の子として持つarticleを選択 */
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 20px;
}

/* 子孫要素 */
section:has(video) {
  /* 子孫にvideoを含むsectionを選択 */
  background: #000;
  color: #fff;
}

/* 複数の条件（OR） */
div:has(img, video, iframe) {
  /* img、video、iframeのいずれかを含むdivを選択 */
  aspect-ratio: 16 / 9;
}

/* 複数の条件（AND） */
article:has(img):has(h2) {
  /* imgとh2の両方を含むarticleを選択 */
  border: 2px solid blue;
}
```

### 疑似クラスとの組み合わせ

```css
/* ホバー状態 */
li:has(a:hover) {
  /* ホバーされたリンクを含むliを選択 */
  background: #f0f0f0;
}

/* フォーカス状態 */
form:has(input:focus) {
  /* フォーカスされたinputを含むformを選択 */
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
}

/* チェック状態 */
label:has(input:checked) {
  /* チェックされたinputを含むlabelを選択 */
  background: #007bff;
  color: white;
}

/* 無効状態 */
fieldset:has(input:disabled) {
  /* 無効なinputを含むfieldsetを選択 */
  opacity: 0.5;
  pointer-events: none;
}

/* エラー状態 */
.form-group:has(input:invalid) {
  /* バリデーションエラーのinputを含むform-groupを選択 */
  border-left: 3px solid red;
}
```

### 否定（:not）との組み合わせ

```css
/* 画像を含まない記事 */
article:not(:has(img)) {
  /* imgを含まないarticleを選択 */
  background: #f9f9f9;
}

/* チェックされていないチェックボックスを含むフォーム */
form:has(input[type="checkbox"]:not(:checked)) {
  /* 未チェックのチェックボックスを含むformを選択 */
  border: 2px dashed orange;
}

/* 空でない要素 */
div:has(:not(:empty)) {
  /* 空でない子要素を持つdivを選択 */
  padding: 20px;
}
```

## 実践的な活用例

### カード型レイアウト

```html
<article class="card">
  <img src="image.jpg" alt="Card image">
  <h2>Card Title</h2>
  <p>Card description...</p>
</article>

<article class="card">
  <!-- 画像なし -->
  <h2>Card Title</h2>
  <p>Card description...</p>
</article>
```

```css
.card {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

/* 画像を含むカード */
.card:has(img) {
  display: grid;
  grid-template-columns: 200px 1fr;
}

.card:has(img) img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 画像を含まないカード */
.card:not(:has(img)) {
  padding: 20px;
}

.card:not(:has(img)) h2 {
  margin-top: 0;
}
```

### フォームバリデーション

```html
<form>
  <div class="form-group">
    <label for="email">Email</label>
    <input type="email" id="email" required>
    <span class="error-message">Invalid email</span>
  </div>

  <div class="form-group">
    <label for="password">Password</label>
    <input type="password" id="password" required minlength="8">
    <span class="error-message">Password must be at least 8 characters</span>
  </div>

  <button type="submit">Submit</button>
</form>
```

```css
.form-group {
  margin-bottom: 20px;
  position: relative;
}

.error-message {
  display: none;
  color: red;
  font-size: 14px;
  margin-top: 5px;
}

/* バリデーションエラー時 */
.form-group:has(input:invalid:not(:placeholder-shown)) {
  /* プレースホルダーが表示されていない（入力された）かつ無効な入力 */
}

.form-group:has(input:invalid:not(:placeholder-shown)) input {
  border-color: red;
  background: #fff5f5;
}

.form-group:has(input:invalid:not(:placeholder-shown)) .error-message {
  display: block;
}

/* バリデーション成功時 */
.form-group:has(input:valid:not(:placeholder-shown)) input {
  border-color: green;
  background: #f0fff0;
}

.form-group:has(input:valid:not(:placeholder-shown))::after {
  content: '✓';
  position: absolute;
  right: 10px;
  top: 35px;
  color: green;
  font-weight: bold;
}

/* フォーカス時 */
.form-group:has(input:focus) label {
  color: #007bff;
  font-weight: bold;
}

/* フォーム全体のバリデーション */
form:has(input:invalid) button[type="submit"] {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### アコーディオン/トグル

```html
<div class="accordion-item">
  <input type="checkbox" id="section1" class="accordion-toggle">
  <label for="section1" class="accordion-header">
    Section 1
  </label>
  <div class="accordion-content">
    <p>Content for section 1...</p>
  </div>
</div>
```

```css
.accordion-toggle {
  display: none;
}

.accordion-header {
  display: block;
  padding: 15px;
  background: #f0f0f0;
  cursor: pointer;
  user-select: none;
  position: relative;
}

.accordion-header::after {
  content: '▼';
  position: absolute;
  right: 15px;
  transition: transform 0.3s;
}

.accordion-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease-out;
}

/* チェックされた状態 */
.accordion-item:has(.accordion-toggle:checked) .accordion-content {
  max-height: 500px;
  padding: 15px;
}

.accordion-item:has(.accordion-toggle:checked) .accordion-header {
  background: #007bff;
  color: white;
}

.accordion-item:has(.accordion-toggle:checked) .accordion-header::after {
  transform: rotate(180deg);
}
```

### モーダルダイアログ

```html
<input type="checkbox" id="modal-toggle" class="modal-trigger">

<label for="modal-toggle" class="btn-open-modal">
  Open Modal
</label>

<div class="modal-overlay">
  <div class="modal">
    <h2>Modal Title</h2>
    <p>Modal content...</p>
    <label for="modal-toggle" class="btn-close">Close</label>
  </div>
</div>
```

```css
.modal-trigger {
  display: none;
}

.modal-overlay {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 30px;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

/* モーダルが開いている状態 */
body:has(.modal-trigger:checked) .modal-overlay {
  display: flex;
}

body:has(.modal-trigger:checked) {
  overflow: hidden; /* スクロール防止 */
}

/* アニメーション */
@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

body:has(.modal-trigger:checked) .modal {
  animation: modalFadeIn 0.3s ease-out;
}
```

### タブUI

```html
<div class="tabs">
  <input type="radio" name="tab" id="tab1" checked>
  <input type="radio" name="tab" id="tab2">
  <input type="radio" name="tab" id="tab3">

  <div class="tab-buttons">
    <label for="tab1">Tab 1</label>
    <label for="tab2">Tab 2</label>
    <label for="tab3">Tab 3</label>
  </div>

  <div class="tab-content" data-tab="tab1">
    <p>Content for Tab 1</p>
  </div>

  <div class="tab-content" data-tab="tab2">
    <p>Content for Tab 2</p>
  </div>

  <div class="tab-content" data-tab="tab3">
    <p>Content for Tab 3</p>
  </div>
</div>
```

```css
.tabs input[type="radio"] {
  display: none;
}

.tab-buttons {
  display: flex;
  border-bottom: 2px solid #ddd;
}

.tab-buttons label {
  padding: 12px 24px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.3s;
}

.tab-buttons label:hover {
  background: #f0f0f0;
}

.tab-content {
  display: none;
  padding: 20px;
}

/* アクティブなタブ */
.tabs:has(#tab1:checked) label[for="tab1"],
.tabs:has(#tab2:checked) label[for="tab2"],
.tabs:has(#tab3:checked) label[for="tab3"] {
  color: #007bff;
  border-bottom-color: #007bff;
}

.tabs:has(#tab1:checked) .tab-content[data-tab="tab1"],
.tabs:has(#tab2:checked) .tab-content[data-tab="tab2"],
.tabs:has(#tab3:checked) .tab-content[data-tab="tab3"] {
  display: block;
}
```

### ツールチップ

```html
<div class="tooltip-container">
  <button class="tooltip-trigger">Hover me</button>
  <div class="tooltip">
    This is a tooltip message
  </div>
</div>
```

```css
.tooltip-container {
  position: relative;
  display: inline-block;
}

.tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
  margin-bottom: 8px;
}

.tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: #333;
}

/* ホバー時にツールチップ表示 */
.tooltip-container:has(.tooltip-trigger:hover) .tooltip {
  opacity: 1;
}
```

### 動的グリッドレイアウト

```html
<div class="grid">
  <div class="grid-item">Item 1</div>
  <div class="grid-item featured">Featured Item</div>
  <div class="grid-item">Item 3</div>
  <div class="grid-item">Item 4</div>
</div>
```

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.grid-item {
  background: #f0f0f0;
  padding: 20px;
  border-radius: 8px;
}

/* 注目アイテムを含むグリッド */
.grid:has(.featured) {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

/* 注目アイテム自体 */
.grid:has(.featured) .featured {
  grid-column: span 2;
  grid-row: span 2;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 1.2em;
}
```

## 高度なテクニック

### 量に応じたスタイリング

```css
/* 子要素が1つだけの場合 */
ul:has(li:only-child) li {
  font-size: 1.5em;
  text-align: center;
}

/* 子要素が3つ以上の場合 */
ul:has(li:nth-child(3)) {
  columns: 2;
  column-gap: 20px;
}

/* 子要素が6つ以上の場合 */
ul:has(li:nth-child(6)) {
  columns: 3;
}

/* 特定の数の子要素を持つ場合 */
ul:has(li:nth-child(5)):has(li:nth-last-child(5)) {
  /* 正確に5つのliを持つul */
  display: grid;
  grid-template-columns: repeat(5, 1fr);
}
```

### 兄弟要素の選択

```css
/* 後続の兄弟要素 */
section:has(+ section) {
  /* 直後にsectionがあるsection */
  margin-bottom: 40px;
}

/* 先行の兄弟要素（間接的に） */
section:has(~ .highlighted) {
  /* 後続の兄弟に.highlightedがあるsection */
  border-left: 4px solid blue;
}

/* 兄弟要素の状態に応じて */
.tab-panel:has(~ .tab-panel .active) {
  /* 後続の兄弟に.activeを含む要素がある */
  opacity: 0.5;
}
```

### ネストした条件

```css
/* 複雑な条件 */
article:has(
  header:has(h1):has(img)
) {
  /* h1とimgの両方を含むheaderを持つarticle */
  display: grid;
  grid-template-areas:
    "header header"
    "sidebar content";
}

/* 複数レベルの親要素 */
body:has(
  main:has(
    article:has(.featured)
  )
) {
  /* .featuredを含むarticleを含むmainを持つbody */
  background: #f9f9f9;
}
```

### アニメーション制御

```css
/* ホバー時のアニメーション */
.card {
  transition: all 0.3s;
}

.card-container:has(.card:hover) .card:not(:hover) {
  /* ホバーされたカード以外を暗くする */
  opacity: 0.5;
  transform: scale(0.95);
}

/* フォーカス時のアニメーション */
.form-group:has(input:focus) {
  animation: focusPulse 1s ease-in-out;
}

@keyframes focusPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(0, 123, 255, 0.4); }
  50% { box-shadow: 0 0 0 10px rgba(0, 123, 255, 0); }
}
```

### テーマ切り替え

```html
<input type="checkbox" id="theme-toggle">

<label for="theme-toggle" class="theme-switcher">
  Toggle Dark Mode
</label>

<main>
  <!-- コンテンツ -->
</main>
```

```css
#theme-toggle {
  display: none;
}

/* ライトモード（デフォルト） */
body {
  background: white;
  color: black;
}

/* ダークモード */
body:has(#theme-toggle:checked) {
  background: #1a1a1a;
  color: white;
}

body:has(#theme-toggle:checked) .card {
  background: #2a2a2a;
  border-color: #444;
}

body:has(#theme-toggle:checked) a {
  color: #66b3ff;
}

/* トグルボタンのスタイル */
.theme-switcher {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 10px 20px;
  background: #f0f0f0;
  border-radius: 20px;
  cursor: pointer;
}

body:has(#theme-toggle:checked) .theme-switcher {
  background: #444;
  color: white;
}
```

### レスポンシブデザイン

```css
/* コンテナクエリとの組み合わせ */
.container {
  container-type: inline-size;
}

/* 小さいコンテナ */
@container (max-width: 500px) {
  .card:has(img) {
    /* 小さいコンテナでは縦並び */
    grid-template-columns: 1fr;
  }
}

/* 大きいコンテナ */
@container (min-width: 800px) {
  .grid:has(.featured) {
    /* 大きいコンテナでは3カラム */
    grid-template-columns: repeat(3, 1fr);
  }

  .grid:has(.featured) .featured {
    grid-column: span 3;
  }
}
```

### アクセシビリティ

```css
/* スクリーンリーダー専用コンテンツがある場合 */
.section:has(.sr-only:not(:empty)) {
  /* スクリーンリーダー専用のコンテンツを持つセクション */
  position: relative;
}

/* フォーカス可能な要素を含むコンテナ */
.container:has(a, button, input, select, textarea) {
  /* キーボードナビゲーション用のスタイル */
  outline: 2px solid transparent;
  transition: outline 0.2s;
}

.container:has(:focus-visible) {
  outline-color: #007bff;
}

/* エラーメッセージを含むフォーム */
form:has([aria-invalid="true"]) {
  border-left: 4px solid red;
}

form:has([aria-invalid="true"]) [role="alert"] {
  display: block;
}
```

## パフォーマンス最適化

### セレクタの効率化

```css
/* 推奨: 具体的なセレクタ */
.card:has(> img) {
  /* 直接の子要素のみチェック */
}

/* 非推奨: 広範囲なセレクタ */
*:has(img) {
  /* すべての要素をチェック（重い） */
}

/* 推奨: スコープを限定 */
main .article:has(h2) {
  /* mainの中のarticleのみチェック */
}

/* 非推奨: 複雑すぎるネスト */
div:has(
  section:has(
    article:has(
      div:has(span)
    )
  )
) {
  /* 避けるべき深いネスト */
}
```

### will-changeの活用

```css
.card-container:has(.card:hover) .card {
  will-change: transform, opacity;
  transition: all 0.3s;
}

.card-container:not(:hover) .card {
  will-change: auto; /* ホバー終了後はリセット */
}
```

## ブラウザ対応とフォールバック

### プログレッシブエンハンスメント

```css
/* ベーススタイル（すべてのブラウザ） */
.card {
  border: 1px solid #ddd;
  padding: 20px;
}

/* :has()対応ブラウザ向け拡張 */
@supports selector(:has(*)) {
  .card:has(img) {
    display: grid;
    grid-template-columns: 200px 1fr;
    padding: 0;
  }

  .card:has(img) > *:not(img) {
    padding: 20px;
  }
}
```

### JavaScriptによるフォールバック

```javascript
// :has()サポート検出
const supportsHas = CSS.supports('selector(:has(*))')

if (!supportsHas) {
  // フォールバック処理
  document.querySelectorAll('.card').forEach(card => {
    if (card.querySelector('img')) {
      card.classList.add('has-image')
    }
  })
}
```

## まとめ

CSS :has()セレクタは、CSSの表現力を大幅に向上させる革命的な機能です。

**主な利点**
- JavaScriptなしで親要素を選択可能
- 状態に応じた動的スタイリング
- フォームバリデーションの簡素化
- インタラクティブUIコンポーネントの実装

**適用場面**
- フォームバリデーション
- カード型レイアウト
- モーダル/アコーディオン/タブUI
- テーマ切り替え
- レスポンシブデザイン

**ベストプラクティス**
- セレクタを具体的に保つ
- プログレッシブエンハンスメントで段階的に拡張
- パフォーマンスを考慮した設計
- アクセシビリティを維持

2026年現在、:has()セレクタは主要ブラウザで完全サポートされており、モダンなWeb開発の標準となっています。

**参考リンク**
- [MDN :has()](https://developer.mozilla.org/en-US/docs/Web/CSS/:has)
- [Can I use :has()](https://caniuse.com/css-has)
- [CSS :has() Interactive Examples](https://webkit.org/blog/13096/css-has-pseudo-class/)

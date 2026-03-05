---
title: 'CSS :has()セレクタ完全ガイド - 親要素セレクタの実践テクニック'
description: 'CSS :has()セレクタで実現する親要素選択、フォームバリデーション、ダークモード、実践的なUIパターンを解説します。'
pubDate: 'Feb 05 2026'
tags: ['CSS', 'Web開発', 'フロントエンド', 'UI-UX', 'プログラミング']
---

# CSS :has()セレクタ完全ガイド

CSS `:has()` 疑似クラスは、特定の子要素や子孫要素を持つ親要素を選択できる革新的なセレクタです。これまでJavaScriptでしか実現できなかった多くのUIパターンが、純粋なCSSで実装可能になります。

## :has()の基本

### 基本構文

```css
/* 子要素にimgを持つarticle */
article:has(img) {
  display: grid;
  grid-template-columns: 1fr 2fr;
}

/* imgを持たないarticle */
article:not(:has(img)) {
  max-width: 800px;
  margin: 0 auto;
}
```

### 直接の子要素

```css
/* 直接の子要素として.alertを持つdiv */
div:has(> .alert) {
  padding: 1rem;
  border: 2px solid red;
}

/* 直接の子要素として複数の条件 */
section:has(> h2, > h3) {
  margin-top: 2rem;
}
```

### 兄弟要素との組み合わせ

```css
/* 次の兄弟要素が.activeであるli */
li:has(+ li.active) {
  border-right: 3px solid blue;
}

/* 後続の兄弟に.errorがあるinput */
input:has(~ .error) {
  border-color: red;
}
```

## フォームバリデーション

### リアルタイムバリデーション表示

```html
<form class="contact-form">
  <div class="form-group">
    <label for="email">Email</label>
    <input type="email" id="email" required>
    <span class="error">無効なメールアドレスです</span>
  </div>

  <div class="form-group">
    <label for="password">Password</label>
    <input type="password" id="password" required minlength="8">
    <span class="error">8文字以上入力してください</span>
  </div>
</form>
```

```css
/* デフォルトではエラーメッセージを非表示 */
.form-group .error {
  display: none;
  color: #dc2626;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

/* 無効な入力があるフォームグループ */
.form-group:has(input:invalid:not(:placeholder-shown)) {
  --error-visible: 1;
}

.form-group:has(input:invalid:not(:placeholder-shown)) .error {
  display: block;
}

.form-group:has(input:invalid:not(:placeholder-shown)) input {
  border-color: #dc2626;
  background-color: #fef2f2;
}

/* 有効な入力 */
.form-group:has(input:valid:not(:placeholder-shown)) input {
  border-color: #10b981;
  background-color: #f0fdf4;
}

/* フォーカス時のスタイル */
.form-group:has(input:focus) label {
  color: #3b82f6;
  font-weight: 600;
}
```

### チェックボックス・ラジオボタンのスタイリング

```html
<div class="checkbox-group">
  <input type="checkbox" id="terms" required>
  <label for="terms">利用規約に同意します</label>
</div>

<div class="radio-group">
  <div class="radio-item">
    <input type="radio" id="plan-basic" name="plan" value="basic">
    <label for="plan-basic">
      <span class="title">ベーシック</span>
      <span class="price">¥1,000/月</span>
    </label>
  </div>

  <div class="radio-item">
    <input type="radio" id="plan-pro" name="plan" value="pro">
    <label for="plan-pro">
      <span class="title">プロ</span>
      <span class="price">¥3,000/月</span>
    </label>
  </div>
</div>
```

```css
/* チェックボックスグループ */
.checkbox-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 0.5rem;
  border: 2px solid #e5e7eb;
  transition: all 0.2s;
}

.checkbox-group:has(input:checked) {
  background-color: #eff6ff;
  border-color: #3b82f6;
}

.checkbox-group:has(input:focus) {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* ラジオボタングループ */
.radio-item {
  position: relative;
  padding: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.radio-item:has(input:checked) {
  background-color: #eff6ff;
  border-color: #3b82f6;
}

.radio-item:has(input:checked)::after {
  content: '✓';
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  color: #3b82f6;
  font-weight: bold;
}

.radio-item:hover {
  border-color: #9ca3af;
}

.radio-item label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  cursor: pointer;
}

.radio-item .title {
  font-weight: 600;
  font-size: 1.125rem;
}

.radio-item .price {
  color: #6b7280;
  font-size: 0.875rem;
}

.radio-item:has(input:checked) .price {
  color: #3b82f6;
}

/* inputを非表示 */
.checkbox-group input,
.radio-item input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
```

### 必須フィールドの表示

```css
/* 必須フィールドを含むフォームグループ */
.form-group:has(input[required]) label::after {
  content: ' *';
  color: #dc2626;
}

/* すべての必須フィールドが入力済み */
form:has(input[required]:invalid) button[type="submit"] {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

/* 送信可能な状態 */
form:not(:has(input[required]:invalid)) button[type="submit"] {
  background-color: #10b981;
  cursor: pointer;
}
```

## カード・リストのレイアウト

### 画像の有無によるレイアウト変更

```html
<article class="card">
  <img src="image.jpg" alt="">
  <div class="content">
    <h3>記事タイトル</h3>
    <p>記事の説明文...</p>
  </div>
</article>

<article class="card">
  <div class="content">
    <h3>画像なし記事</h3>
    <p>記事の説明文...</p>
  </div>
</article>
```

```css
/* 画像を含むカード - グリッドレイアウト */
.card:has(img) {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 1rem;
}

.card:has(img) img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 0.5rem;
}

/* 画像を含まないカード - シンプルレイアウト */
.card:not(:has(img)) {
  max-width: 600px;
  padding: 1.5rem;
  border-left: 4px solid #3b82f6;
}

.card:not(:has(img)) .content {
  text-align: left;
}
```

### 子要素の数によるスタイル調整

```css
/* 子要素が3つ以下のグリッド */
.grid:has(> :nth-child(-n+3):last-child) {
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

/* 子要素が4つ以上のグリッド */
.grid:has(> :nth-child(4)) {
  grid-template-columns: repeat(2, 1fr);
}

/* リストアイテムが1つだけ */
ul:has(li:only-child) li {
  text-align: center;
  padding: 2rem;
  font-size: 1.25rem;
}
```

### ホバー時の兄弟要素への影響

```css
.card-list {
  display: grid;
  gap: 1rem;
}

.card {
  transition: all 0.3s;
}

/* カードがホバーされたとき、兄弟要素を薄くする */
.card-list:has(.card:hover) .card:not(:hover) {
  opacity: 0.5;
  transform: scale(0.98);
}

/* ホバーされたカード */
.card:hover {
  transform: scale(1.02);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}
```

## ナビゲーション

### アクティブページのハイライト

```html
<nav class="main-nav">
  <a href="/" class="active">Home</a>
  <a href="/about">About</a>
  <a href="/services">Services</a>
  <a href="/contact">Contact</a>
</nav>
```

```css
/* アクティブなリンクを含むナビゲーション */
.main-nav:has(.active) {
  border-bottom: 2px solid #3b82f6;
}

.main-nav a {
  padding: 1rem 1.5rem;
  color: #6b7280;
  text-decoration: none;
  transition: all 0.2s;
  position: relative;
}

.main-nav a.active {
  color: #3b82f6;
  font-weight: 600;
}

.main-nav a.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background-color: #3b82f6;
}

/* ホバー時に他のリンクを薄くする */
.main-nav:has(a:hover) a:not(:hover):not(.active) {
  opacity: 0.5;
}
```

### ドロップダウンメニュー

```html
<nav class="dropdown-nav">
  <div class="nav-item">
    <button>Products</button>
    <div class="dropdown">
      <a href="/product-a">Product A</a>
      <a href="/product-b">Product B</a>
      <a href="/product-c">Product C</a>
    </div>
  </div>
</nav>
```

```css
.dropdown {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border-radius: 0.5rem;
  padding: 0.5rem;
  min-width: 200px;
}

/* ホバーまたはフォーカス時にドロップダウンを表示 */
.nav-item:has(button:hover) .dropdown,
.nav-item:has(button:focus) .dropdown,
.nav-item:has(.dropdown:hover) .dropdown {
  display: block;
}

/* ドロップダウンが開いているときのボタンスタイル */
.nav-item:has(.dropdown:hover) button,
.nav-item:has(button:hover) button {
  background-color: #eff6ff;
  color: #3b82f6;
}
```

## モーダル・ダイアログ

### モーダルの背景オーバーレイ

```html
<body>
  <div class="content">
    <!-- ページコンテンツ -->
  </div>

  <dialog class="modal" id="my-modal">
    <h2>モーダルタイトル</h2>
    <p>モーダルの内容</p>
    <button onclick="document.getElementById('my-modal').close()">閉じる</button>
  </dialog>
</body>
```

```css
/* モーダルが開いているときにbodyをスクロール不可に */
body:has(dialog[open]) {
  overflow: hidden;
}

/* モーダルが開いているときに背景をぼかす */
body:has(dialog[open]) .content {
  filter: blur(3px);
  pointer-events: none;
}

.modal {
  border: none;
  border-radius: 0.5rem;
  padding: 2rem;
  max-width: 500px;
  box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);
}

.modal::backdrop {
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(3px);
}
```

## ダークモード

### システム設定とユーザー設定の統合

```html
<html data-theme="auto">
<body>
  <button id="theme-toggle">
    <span class="light-icon">🌙</span>
    <span class="dark-icon">☀️</span>
  </button>

  <main>
    <!-- コンテンツ -->
  </main>
</body>
</html>
```

```css
/* デフォルト（ライトモード） */
:root {
  --bg-color: #ffffff;
  --text-color: #1f2937;
  --border-color: #e5e7eb;
  --primary-color: #3b82f6;
}

/* システムのダークモード設定 */
@media (prefers-color-scheme: dark) {
  :root {
    --bg-color: #111827;
    --text-color: #f9fafb;
    --border-color: #374151;
    --primary-color: #60a5fa;
  }
}

/* ユーザーがライトモードを選択 */
html[data-theme="light"] {
  --bg-color: #ffffff;
  --text-color: #1f2937;
  --border-color: #e5e7eb;
  --primary-color: #3b82f6;
}

/* ユーザーがダークモードを選択 */
html[data-theme="dark"] {
  --bg-color: #111827;
  --text-color: #f9fafb;
  --border-color: #374151;
  --primary-color: #60a5fa;
}

/* テーマトグルボタン */
html:has([data-theme="light"]) .dark-icon,
html:has([data-theme="dark"]) .light-icon {
  display: none;
}

/* カラースキームに応じたアイコン表示 */
@media (prefers-color-scheme: dark) {
  html[data-theme="auto"] .light-icon {
    display: none;
  }
}

@media (prefers-color-scheme: light) {
  html[data-theme="auto"] .dark-icon {
    display: none;
  }
}

body {
  background-color: var(--bg-color);
  color: var(--text-color);
  transition: background-color 0.3s, color 0.3s;
}
```

## アコーディオン

```html
<div class="accordion">
  <details>
    <summary>セクション 1</summary>
    <div class="content">
      <p>セクション1の内容...</p>
    </div>
  </details>

  <details>
    <summary>セクション 2</summary>
    <div class="content">
      <p>セクション2の内容...</p>
    </div>
  </details>
</div>
```

```css
.accordion details {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 0.5rem;
  transition: all 0.3s;
}

.accordion details[open] {
  background-color: #f9fafb;
  border-color: #3b82f6;
}

.accordion details summary {
  cursor: pointer;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.accordion details summary::after {
  content: '+';
  font-size: 1.5rem;
  transition: transform 0.3s;
}

.accordion details[open] summary::after {
  content: '−';
}

/* 他のdetailsが開いているとき、閉じているdetailsを薄くする */
.accordion:has(details[open]) details:not([open]) {
  opacity: 0.6;
}

.accordion .content {
  padding-top: 1rem;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

## テーブル

### 選択行のハイライト

```html
<table class="data-table">
  <tbody>
    <tr>
      <td><input type="checkbox"></td>
      <td>項目 1</td>
      <td>値 1</td>
    </tr>
    <tr>
      <td><input type="checkbox"></td>
      <td>項目 2</td>
      <td>値 2</td>
    </tr>
  </tbody>
</table>
```

```css
.data-table tr {
  transition: background-color 0.2s;
}

/* チェックされた行 */
.data-table tr:has(input:checked) {
  background-color: #eff6ff;
  border-left: 3px solid #3b82f6;
}

/* ホバー時 */
.data-table tr:hover {
  background-color: #f9fafb;
}

/* チェックされた行をホバー */
.data-table tr:has(input:checked):hover {
  background-color: #dbeafe;
}

/* テーブルに選択行がある場合、ヘッダーを変更 */
.data-table:has(input:checked) thead {
  background-color: #3b82f6;
  color: white;
}
```

## パフォーマンスとブラウザサポート

### パフォーマンスの考慮事項

```css
/* 避けるべき：過度に複雑なセレクタ */
body:has(.container:has(.wrapper:has(.item:hover))) {
  /* パフォーマンスに悪影響 */
}

/* 推奨：シンプルで明確なセレクタ */
.container:has(.item:hover) {
  /* より効率的 */
}

/* ネストは2-3階層まで */
.parent:has(.child:has(.grandchild)) {
  /* 許容範囲 */
}
```

### ブラウザサポートの確認

```css
/* フォールバック付き */
.card {
  padding: 1rem;
}

/* :has()をサポートするブラウザのみ */
@supports selector(:has(*)) {
  .card:has(img) {
    display: grid;
    grid-template-columns: 200px 1fr;
  }
}

/* :has()をサポートしないブラウザ */
@supports not selector(:has(*)) {
  .card.with-image {
    display: grid;
    grid-template-columns: 200px 1fr;
  }
}
```

## まとめ

`:has()` セレクタは、CSSに革新的な機能をもたらしました。

### 主な利点

1. **親要素の選択**: 子要素の状態に基づいて親をスタイリング
2. **JavaScriptの削減**: 多くのUIパターンをCSSのみで実装
3. **メンテナンス性**: ロジックとスタイルの分離
4. **パフォーマンス**: ブラウザ最適化による高速レンダリング

### 使用上の注意

- パフォーマンスを考慮してシンプルに保つ
- ブラウザサポートを確認する
- フォールバックを用意する
- 過度なネストを避ける

`:has()` を活用することで、より宣言的で保守性の高いCSSコードを書くことができます。

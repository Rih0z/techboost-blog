---
title: 'CSS :has()セレクタ応用テクニック - 親要素セレクション完全ガイド'
description: 'CSS :has()擬似クラスの実践的な使い方を徹底解説。親要素のスタイリング、フォームバリデーション、動的レイアウト、アコーディオン実装など即戦力テクニック集。'
pubDate: '2025-02-06'
tags: ['CSS', 'Frontend', 'Web Design', 'CSS Selectors', 'Modern CSS']
---

CSS `:has()` 擬似クラスは、「親セレクタ」として長年待ち望まれていた機能です。2024年以降、全モダンブラウザでサポートされ、JavaScriptなしで複雑なUIパターンを実装できるようになりました。

## :has()セレクタとは

`:has()` は、**特定の子要素や兄弟要素を持つ要素**を選択できる擬似クラスです。

### 基本構文

```css
/* 子要素にimgを持つdivを選択 */
div:has(img) {
  border: 2px solid blue;
}

/* チェックされたinputを持つlabelを選択 */
label:has(input:checked) {
  background-color: lightgreen;
}
```

### ブラウザサポート

- Chrome 105+ (2022年8月)
- Safari 15.4+ (2022年3月)
- Firefox 121+ (2023年12月)
- Edge 105+ (2022年9月)

全モダンブラウザで利用可能です。

## 親要素のスタイリング

### 子要素に応じたスタイル変更

```css
/* 画像を含むカードに余白を追加 */
.card:has(img) {
  padding: 20px;
}

/* 画像がない場合は余白なし */
.card:not(:has(img)) {
  padding: 0;
}

/* 複数の画像を持つギャラリー */
.card:has(img):has(img ~ img) {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
```

### ホバー時の親要素スタイル

```css
/* 子要素ホバー時に親をスタイル */
.parent:has(.child:hover) {
  background-color: #f0f0f0;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

/* カードのボタンホバー時にカード全体を強調 */
.card:has(button:hover) {
  transform: scale(1.02);
  transition: transform 0.2s;
}
```

```html
<div class="parent">
  <div class="child">Hover me</div>
</div>
```

### フォーカス時のコンテナスタイル

```css
/* 入力フォーカス時にフォームグループをハイライト */
.form-group:has(input:focus),
.form-group:has(textarea:focus) {
  background-color: #e3f2fd;
  border-left: 3px solid #2196F3;
  padding-left: 17px;
}

/* フォーカスされた入力のラベルを強調 */
label:has(+ input:focus) {
  color: #2196F3;
  font-weight: bold;
}
```

## フォームバリデーション

### カスタムバリデーションスタイル

```css
/* 無効な入力を持つフォームグループ */
.form-group:has(input:invalid) {
  border-left: 3px solid #f44336;
  background-color: #ffebee;
}

/* 有効な入力を持つフォームグループ */
.form-group:has(input:valid) {
  border-left: 3px solid #4CAF50;
  background-color: #e8f5e9;
}

/* エラーメッセージを表示 */
.form-group:has(input:invalid)::after {
  content: "入力内容を確認してください";
  color: #f44336;
  font-size: 0.875rem;
  display: block;
  margin-top: 4px;
}
```

```html
<div class="form-group">
  <label>メールアドレス</label>
  <input type="email" required>
</div>
```

### チェックボックス・ラジオボタンのスタイリング

```css
/* チェックされたラベル */
label:has(input[type="checkbox"]:checked) {
  background-color: #4CAF50;
  color: white;
  font-weight: bold;
}

/* 未チェックのラベル */
label:has(input[type="checkbox"]:not(:checked)) {
  background-color: #f5f5f5;
  color: #666;
}

/* ラジオボタン選択時のカードスタイル */
.option-card:has(input[type="radio"]:checked) {
  border: 2px solid #2196F3;
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
}
```

```html
<label class="option-card">
  <input type="radio" name="plan" value="basic">
  <span>Basic Plan - $9/month</span>
</label>
```

### リアルタイムフォームバリデーション

```css
/* パスワード強度インジケーター */
.password-field:has(input[minlength="8"]:valid) .strength-meter::before {
  content: "強い";
  background: linear-gradient(90deg, #4CAF50 0%, #4CAF50 100%);
}

.password-field:has(input[minlength="6"]:valid) .strength-meter::before {
  content: "普通";
  background: linear-gradient(90deg, #FFC107 0%, #FFC107 66%);
}

.password-field:has(input:invalid) .strength-meter::before {
  content: "弱い";
  background: linear-gradient(90deg, #f44336 0%, #f44336 33%);
}

.strength-meter::before {
  display: block;
  height: 4px;
  border-radius: 2px;
  transition: all 0.3s;
}
```

## 動的レイアウト

### 子要素の数に応じたレイアウト

```css
/* 1つの子要素の場合 */
.grid:has(.item:only-child) {
  grid-template-columns: 1fr;
}

/* 2つの子要素の場合 */
.grid:has(.item:first-child:nth-last-child(2)) {
  grid-template-columns: repeat(2, 1fr);
}

/* 3つ以上の子要素の場合 */
.grid:has(.item:first-child:nth-last-child(n+3)) {
  grid-template-columns: repeat(3, 1fr);
}

/* 4つ以上の場合はさらに細分化 */
.grid:has(.item:first-child:nth-last-child(n+4)) {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}
```

### 空状態の表示

```css
/* 子要素がない場合にメッセージを表示 */
.list:not(:has(li))::before {
  content: "項目がありません";
  display: block;
  padding: 40px;
  text-align: center;
  color: #999;
  font-style: italic;
}

/* データがある場合はメッセージを非表示 */
.list:has(li)::before {
  display: none;
}
```

### 条件付きヘッダー表示

```css
/* テーブルにデータがある場合のみヘッダーを表示 */
table:has(tbody tr) thead {
  display: table-header-group;
}

table:not(:has(tbody tr)) thead {
  display: none;
}

/* データがない場合のメッセージ */
table:not(:has(tbody tr))::after {
  content: "データがありません";
  display: block;
  padding: 20px;
  text-align: center;
}
```

## アコーディオン実装

### CSSのみのアコーディオン

```html
<div class="accordion">
  <input type="checkbox" id="section1" class="accordion-toggle">
  <label for="section1" class="accordion-header">Section 1</label>
  <div class="accordion-content">
    <p>Content for section 1</p>
  </div>
</div>
```

```css
/* アコーディオンの基本スタイル */
.accordion {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

.accordion-toggle {
  display: none;
}

.accordion-header {
  display: block;
  padding: 16px;
  background-color: #f5f5f5;
  cursor: pointer;
  user-select: none;
  position: relative;
}

/* 矢印アイコン */
.accordion-header::after {
  content: "▼";
  position: absolute;
  right: 16px;
  transition: transform 0.3s;
}

/* コンテンツの非表示 */
.accordion-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease-out;
}

/* チェックされた時のスタイル */
.accordion:has(.accordion-toggle:checked) .accordion-header {
  background-color: #2196F3;
  color: white;
}

.accordion:has(.accordion-toggle:checked) .accordion-header::after {
  transform: rotate(180deg);
}

.accordion:has(.accordion-toggle:checked) .accordion-content {
  max-height: 500px;
  padding: 16px;
  transition: max-height 0.5s ease-in;
}
```

## タブインターフェース

```html
<div class="tabs">
  <input type="radio" name="tab" id="tab1" checked>
  <label for="tab1">Tab 1</label>
  <div class="tab-content">Content 1</div>

  <input type="radio" name="tab" id="tab2">
  <label for="tab2">Tab 2</label>
  <div class="tab-content">Content 2</div>

  <input type="radio" name="tab" id="tab3">
  <label for="tab3">Tab 3</label>
  <div class="tab-content">Content 3</div>
</div>
```

```css
.tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}

.tabs input[type="radio"] {
  display: none;
}

.tabs label {
  padding: 12px;
  background-color: #f5f5f5;
  text-align: center;
  cursor: pointer;
  border-bottom: 3px solid transparent;
}

/* アクティブなタブ */
.tabs:has(#tab1:checked) label[for="tab1"],
.tabs:has(#tab2:checked) label[for="tab2"],
.tabs:has(#tab3:checked) label[for="tab3"] {
  background-color: white;
  border-bottom-color: #2196F3;
  font-weight: bold;
}

.tab-content {
  display: none;
  grid-column: 1 / -1;
  padding: 20px;
}

/* アクティブなコンテンツを表示 */
.tabs:has(#tab1:checked) .tab-content:nth-of-type(2),
.tabs:has(#tab2:checked) .tab-content:nth-of-type(4),
.tabs:has(#tab3:checked) .tab-content:nth-of-type(6) {
  display: block;
}
```

## カード選択UI

```css
/* 選択可能なカード */
.card-selector {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.card {
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.card input[type="radio"] {
  display: none;
}

/* 選択されたカード */
.card:has(input:checked) {
  border-color: #2196F3;
  background-color: #e3f2fd;
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
}

/* チェックマークアイコン */
.card:has(input:checked)::before {
  content: "✓";
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: #2196F3;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}
```

```html
<div class="card-selector">
  <label class="card">
    <input type="radio" name="plan" value="basic">
    <h3>Basic</h3>
    <p>$9/month</p>
  </label>
  <label class="card">
    <input type="radio" name="plan" value="pro">
    <h3>Pro</h3>
    <p>$29/month</p>
  </label>
</div>
```

## ドロップダウンメニュー

```css
/* メニューコンテナ */
.menu {
  position: relative;
}

.menu-toggle {
  display: none;
}

.menu-button {
  padding: 10px 20px;
  background-color: #2196F3;
  color: white;
  cursor: pointer;
  user-select: none;
  border-radius: 4px;
}

/* ドロップダウン */
.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
  transition: all 0.3s;
}

/* チェックされた時にドロップダウンを表示 */
.menu:has(.menu-toggle:checked) .dropdown {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

/* ボタンのスタイル変更 */
.menu:has(.menu-toggle:checked) .menu-button {
  background-color: #1976D2;
}
```

```html
<div class="menu">
  <input type="checkbox" id="menu1" class="menu-toggle">
  <label for="menu1" class="menu-button">Menu</label>
  <div class="dropdown">
    <a href="#">Item 1</a>
    <a href="#">Item 2</a>
    <a href="#">Item 3</a>
  </div>
</div>
```

## パフォーマンス考慮

### 効率的なセレクタ

```css
/* Good: 具体的なセレクタ */
.form:has(input:invalid) {
  border-color: red;
}

/* Avoid: 広範囲すぎるセレクタ */
body:has(*:invalid) {
  /* 全要素を検査するため低速 */
}
```

### 適切な使い分け

```css
/* Good: 子要素の直接チェック */
.card:has(> img) {
  padding: 20px;
}

/* Avoid: 深いネスト */
.container:has(.wrapper:has(.card:has(img))) {
  /* 複雑すぎて読みにくい */
}
```

## ブラウザサポート確認

```css
/* フォールバック */
@supports not selector(:has(*)) {
  /* :has()非対応ブラウザ向けスタイル */
  .card-with-image {
    padding: 20px;
  }
}

/* :has()対応ブラウザのみ */
@supports selector(:has(*)) {
  .card:has(img) {
    padding: 20px;
  }
}
```

## 実用例：ショッピングカート

```css
/* カートが空の場合 */
.cart:not(:has(.cart-item)) .cart-empty-message {
  display: block;
}

.cart:has(.cart-item) .cart-empty-message {
  display: none;
}

/* カート内にアイテムがある場合のみチェックアウトボタンを表示 */
.cart:has(.cart-item) .checkout-button {
  display: block;
}

.cart:not(:has(.cart-item)) .checkout-button {
  display: none;
}

/* セール商品を含むカートをハイライト */
.cart:has(.cart-item.sale) {
  border: 2px solid #f44336;
}

.cart:has(.cart-item.sale)::before {
  content: "セール商品が含まれています";
  background-color: #f44336;
  color: white;
  padding: 8px;
  display: block;
}
```

## まとめ

`:has()` セレクタにより、以下が可能になりました。

**主な用途**:
- 親要素のスタイリング
- フォームバリデーション
- 動的レイアウト調整
- CSSのみのインタラクティブUI

**メリット**:
- JavaScriptが不要
- パフォーマンス向上
- コード量削減
- 保守性向上

**注意点**:
- 複雑なセレクタは避ける
- パフォーマンスを考慮
- フォールバックを用意

`:has()` はモダンCSSの必須スキルです。ぜひマスターしてください。

**参考リンク**:
- [MDN: :has()](https://developer.mozilla.org/en-US/docs/Web/CSS/:has)
- [Can I use: :has()](https://caniuse.com/css-has)
- [CSS :has() Interactive Examples](https://ishadeed.com/article/css-has-guide/)

---
title: "CSS :has()セレクタ高度なテクニック集 - 親要素セレクタで実現する次世代のスタイリング"
description: "CSS :has()疑似クラスを使った高度なスタイリングテクニックを解説。親要素の選択、状態に応じたスタイル変更、フォームバリデーション、レイアウト制御など実践的な活用法を紹介します。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。"
pubDate: "2025-02-06"
tags: ['CSS', 'フロントエンド']
heroImage: '../../assets/thumbnails/css-has-selector-advanced.jpg'
---

CSS `:has()` 疑似クラスは、長年待ち望まれていた「親要素セレクタ」を実現する革命的な機能です。2023年末から主要ブラウザで全面サポートされ、JavaScriptなしで実現できるインタラクティブなUIの幅が大きく広がりました。

## :has()の基本

`:has()` は、指定した条件を満たす子要素または後続要素を持つ要素を選択します。

```css
/* 画像を含むdiv要素 */
div:has(img) {
  border: 2px solid blue;
}

/* チェックされたinputを含むform */
form:has(input:checked) {
  background: #e8f5e9;
}

/* 子要素がない（空の）要素 */
div:not(:has(*)) {
  display: none;
}
```

### ブラウザサポート

```css
/* フォールバック付きの使用例 */
.card {
  padding: 1rem;
}

/* :has()が使える場合のみ適用 */
@supports selector(:has(*)) {
  .card:has(.card-image) {
    display: grid;
    grid-template-columns: 200px 1fr;
  }
}
```

## 実践的なテクニック

### 1. フォームバリデーションのビジュアルフィードバック

```css
/* 必須フィールドが空の場合、親フォームに警告表示 */
form:has(input[required]:invalid) {
  border-left: 4px solid #f44336;
}

/* すべてのフィールドが有効な場合 */
form:has(input[required]):not(:has(input[required]:invalid)) {
  border-left: 4px solid #4caf50;
}

/* 特定のフィールドが入力されたら、次のセクションを表示 */
.form-section {
  display: none;
}

form:has(#email:valid) .form-section.step-2 {
  display: block;
}

/* チェックボックスの状態で送信ボタンを有効化 */
.submit-section {
  opacity: 0.5;
  pointer-events: none;
}

form:has(#terms:checked) .submit-section {
  opacity: 1;
  pointer-events: auto;
}
```

実際のHTML例:

```html
<form>
  <div>
    <label for="email">Email (required)</label>
    <input type="email" id="email" required>
  </div>

  <div class="form-section step-2">
    <label for="phone">Phone</label>
    <input type="tel" id="phone">
  </div>

  <div class="submit-section">
    <label>
      <input type="checkbox" id="terms">
      I agree to the terms
    </label>
    <button type="submit">Submit</button>
  </div>
</form>
```

### 2. 動的なカードレイアウト

```css
/* 画像のある/なしで自動的にレイアウト変更 */
.card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card:has(img) {
  display: grid;
  grid-template-columns: 200px 1fr;
  grid-template-areas: "image content";
}

.card:has(img) img {
  grid-area: image;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card:has(img) .card-content {
  grid-area: content;
}

/* 動画を含む場合はフルワイド */
.card:has(video) {
  grid-template-columns: 1fr;
  grid-template-areas:
    "video"
    "content";
}

/* 複数画像がある場合はギャラリー表示 */
.card:has(img:nth-of-type(2)) {
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  grid-template-areas: none;
}

.card:has(img:nth-of-type(2)) .card-content {
  grid-column: 1 / -1;
}
```

### 3. ナビゲーションとメニューの状態管理

```css
/* ドロップダウンメニュー */
.dropdown {
  position: relative;
}

.dropdown-menu {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
}

/* ホバー時にメニュー表示（親要素に適用） */
.dropdown:has(.dropdown-toggle:hover) .dropdown-menu,
.dropdown:has(.dropdown-menu:hover) .dropdown-menu {
  display: block;
}

/* アクティブなリンクを含むナビゲーション */
nav:has(a.active) {
  border-bottom: 2px solid #1976d2;
}

/* サブメニューを持つ項目にアイコン追加 */
.nav-item:has(.submenu)::after {
  content: "▼";
  margin-left: 0.5rem;
  font-size: 0.8em;
}

/* 展開されたメニュー項目をハイライト */
.nav-item:has(.submenu:hover) {
  background: #f5f5f5;
}
```

### 4. テーブルのインタラクティブ制御

```css
/* チェックボックスが選択された行をハイライト */
tr:has(input[type="checkbox"]:checked) {
  background: #e3f2fd;
  font-weight: 600;
}

/* 少なくとも1行が選択されている場合、一括操作ツールバーを表示 */
.bulk-actions {
  display: none;
}

table:has(input[type="checkbox"]:checked) ~ .bulk-actions {
  display: flex;
}

/* すべての行が選択されている場合 */
table:has(thead input[type="checkbox"]:checked):not(:has(tbody input[type="checkbox"]:not(:checked))) {
  border: 2px solid #4caf50;
}

/* ソート可能な列のヘッダー */
th:has(button.sort) {
  cursor: pointer;
  user-select: none;
}

th:has(button.sort[aria-sort="ascending"])::after {
  content: " ▲";
}

th:has(button.sort[aria-sort="descending"])::after {
  content: " ▼";
}
```

### 5. モーダルとダイアログの制御

```css
/* モーダルが開いている時、背景をブロック */
body:has(dialog[open]) {
  overflow: hidden;
}

/* モーダルのバックドロップ */
body:has(dialog[open])::before {
  content: "";
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 999;
}

/* 複数のモーダルがある場合、最新のものを最前面に */
dialog[open]:has(~ dialog[open]) {
  z-index: 1000;
}

dialog[open]:not(:has(~ dialog[open])) {
  z-index: 1001;
}

/* エラーメッセージを含むモーダル */
dialog:has(.error-message) {
  border-color: #f44336;
}

dialog:has(.error-message) header {
  background: #ffebee;
  color: #c62828;
}
```

## ブラウザサポート状況（2026年）

`:has()` は現在、すべての主要ブラウザで安定サポートされています。

| ブラウザ | サポート開始バージョン | リリース時期 |
|---------|---------------------|------------|
| Chrome | 105+ | 2022年8月 |
| Safari | 15.4+ | 2022年3月 |
| Firefox | 121+ | 2023年12月 |
| Edge | 105+ | 2022年8月 |
| Opera | 91+ | 2022年9月 |
| Samsung Internet | 20+ | 2023年3月 |

2026年時点でのグローバルサポート率は **96%以上** です。IE11はサポート対象外ですが、IE11のサポート終了（2022年6月）から4年が経過しており、実務で考慮する必要はほぼありません。

## プログレッシブエンハンスメントのパターン

`:has()` をプロダクションで安全に使うための段階的な実装パターンを紹介します。

### 基本パターン: @supports による機能検出

```css
/* ベースライン: すべてのブラウザで動作するスタイル */
.card {
  padding: 1rem;
  border: 1px solid #ddd;
}

/* エンハンスメント: :has() 対応ブラウザのみ */
@supports selector(:has(*)) {
  .card:has(.card-image) {
    display: grid;
    grid-template-columns: 250px 1fr;
    gap: 1rem;
  }
}
```

### 実践パターン: フォームのリアルタイムフィードバック

```css
/* ベースライン: JavaScriptで .has-error クラスを付与するフォールバック */
.field-group.has-error .error-text {
  display: block;
}

/* エンハンスメント: :has() でJavaScript不要に */
@supports selector(:has(*)) {
  .field-group:has(input:invalid:not(:placeholder-shown)) .error-text {
    display: block;
  }

  .field-group:has(input:invalid:not(:placeholder-shown)) input {
    border-color: #d32f2f;
  }

  .field-group:has(input:valid) input {
    border-color: #2e7d32;
  }
}
```

### パフォーマンスに関する注意点

`:has()` セレクタは非常に強力ですが、使い方によってはパフォーマンスに影響します。

- `:has()` のネストは **2階層まで** に留める
- `body:has(...)` のような広範なセレクタは最小限にする
- アニメーションと組み合わせる場合は `will-change` プロパティを活用する
- 大量のDOM要素に対する `:has()` は、JavaScriptでの実装と比較検討する

## まとめ

CSS `:has()` 疑似クラスは、従来JavaScriptが必要だった多くのインタラクティブなUIパターンを、純粋なCSSで実装可能にしました。主な利点は以下の通りです。

- **パフォーマンス向上**: JavaScriptの実行を削減
- **保守性向上**: ロジックとスタイルの分離
- **アクセシビリティ**: ブラウザネイティブの動作
- **シンプルな実装**: 複雑な状態管理が不要

ただし、複雑すぎるセレクタはパフォーマンスに影響するため、適切なバランスを保つことが重要です。`:has()` を効果的に活用して、よりインタラクティブで保守性の高いWebアプリケーションを構築しましょう。

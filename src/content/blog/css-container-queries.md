---
title: 'CSSコンテナクエリ実践ガイド - コンポーネントベースのレスポンシブデザイン'
description: '@containerの基本概念から実践的な使い方まで徹底解説。レスポンシブコンポーネント設計、メディアクエリとの使い分け、パフォーマンス最適化のテクニック'
pubDate: 'Feb 05 2026'
tags: ['プログラミング']
---

# CSSコンテナクエリ実践ガイド

CSSコンテナクエリは、レスポンシブデザインのパラダイムを変える革新的な機能です。ビューポートサイズではなく、親要素のサイズに基づいてスタイルを変更できます。

本ガイドでは、コンテナクエリの基本から実践的な使い方、設計パターンまで詳しく解説します。

## コンテナクエリとは

従来のメディアクエリはビューポート（画面全体）のサイズに基づいてスタイルを変更しますが、コンテナクエリはコンテナ（親要素）のサイズに基づいて変更できます。

### 従来の問題点

```css
/* メディアクエリ（従来）*/
.card {
  display: flex;
  flex-direction: column;
}

@media (min-width: 768px) {
  .card {
    flex-direction: row;
  }
}

/* 問題:
   - ビューポートサイズにしか反応できない
   - サイドバー内のカードも同じスタイルになる
   - コンポーネントが配置された場所に関わらず同じ見た目
*/
```

### コンテナクエリの解決策

```css
/* コンテナクエリ */
.card-container {
  container-type: inline-size;
}

.card {
  display: flex;
  flex-direction: column;
}

@container (min-width: 500px) {
  .card {
    flex-direction: row;
  }
}

/* 利点:
   - コンテナのサイズに反応
   - 配置場所に応じて自動的にスタイル変更
   - 真の再利用可能なコンポーネント
*/
```

## 基本的な使い方

### 1. コンテナの定義

```css
/* コンテナタイプの指定 */
.container {
  /* インラインサイズ（横幅）のみ監視 */
  container-type: inline-size;

  /* または明示的な名前付き */
  container-name: card-container;
  container-type: inline-size;

  /* ショートハンド */
  container: card-container / inline-size;
}

/* コンテナタイプの種類 */
.size-container {
  /* 横幅と高さ両方を監視 */
  container-type: size;
}

.normal-container {
  /* デフォルト（クエリできない） */
  container-type: normal;
}
```

### 2. コンテナクエリの記述

```css
.card-container {
  container-type: inline-size;
}

.card {
  padding: 1rem;
  background: white;
  border-radius: 8px;
}

/* コンテナが400px以上の時 */
@container (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 150px 1fr;
    gap: 1rem;
  }
}

/* コンテナが700px以上の時 */
@container (min-width: 700px) {
  .card {
    grid-template-columns: 200px 1fr;
    gap: 2rem;
    padding: 2rem;
  }
}

/* 名前付きコンテナへのクエリ */
@container card-container (min-width: 500px) {
  .card {
    /* このスタイルはcard-containerに適用 */
  }
}
```

### 3. コンテナクエリユニット

```css
.card-container {
  container-type: inline-size;
}

.card {
  /* コンテナの幅に基づく単位 */
  padding: 2cqi; /* Container Query Inline size */
  font-size: 3cqi;

  /* コンテナの高さに基づく単位 */
  margin-block: 2cqb; /* Container Query Block size */

  /* コンテナの小さい方の辺に基づく */
  gap: 1cqmin;

  /* コンテナの大きい方の辺に基づく */
  border-radius: 0.5cqmax;
}

/* 利用可能な単位:
   cqw  - Container Query Width (1% of container width)
   cqh  - Container Query Height (1% of container height)
   cqi  - Container Query Inline size (1%)
   cqb  - Container Query Block size (1%)
   cqmin - Container Query Minimum (small dimension)
   cqmax - Container Query Maximum (large dimension)
*/
```

## 実践的なパターン

### 1. レスポンシブカードコンポーネント

```html
<div class="card-grid">
  <article class="card-container">
    <div class="card">
      <img src="image.jpg" alt="Card image" class="card__image">
      <div class="card__content">
        <h2 class="card__title">Card Title</h2>
        <p class="card__description">Card description goes here...</p>
        <button class="card__button">Read More</button>
      </div>
    </div>
  </article>
  <!-- 他のカード... -->
</div>
```

```css
/* グリッドレイアウト */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  padding: 2rem;
}

/* コンテナ定義 */
.card-container {
  container-type: inline-size;
}

/* ベーススタイル（モバイル） */
.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.card__image {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.card__content {
  padding: 1.5rem;
}

.card__title {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.card__description {
  color: #666;
  line-height: 1.6;
  margin-bottom: 1rem;
}

.card__button {
  width: 100%;
  padding: 0.75rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

/* コンテナが450px以上 */
@container (min-width: 450px) {
  .card {
    flex-direction: row;
  }

  .card__image {
    width: 40%;
    height: auto;
  }

  .card__content {
    flex: 1;
  }

  .card__button {
    width: auto;
    align-self: flex-start;
  }
}

/* コンテナが650px以上 */
@container (min-width: 650px) {
  .card {
    display: grid;
    grid-template-columns: 250px 1fr;
  }

  .card__image {
    width: 100%;
    height: 100%;
  }

  .card__content {
    padding: 2rem;
  }

  .card__title {
    font-size: 2rem;
  }

  .card__description {
    font-size: 1.1rem;
  }
}
```

### 2. サイドバー対応レイアウト

```html
<div class="page-layout">
  <aside class="sidebar">
    <div class="widget-container">
      <div class="widget">
        <h3>Widget Title</h3>
        <ul class="widget__list">
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
      </div>
    </div>
  </aside>

  <main class="main-content">
    <div class="widget-container">
      <div class="widget">
        <h3>Widget Title</h3>
        <ul class="widget__list">
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
      </div>
    </div>
  </main>
</div>
```

```css
/* ページレイアウト */
.page-layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 2rem;
  padding: 2rem;
}

@media (max-width: 768px) {
  .page-layout {
    grid-template-columns: 1fr;
  }
}

/* コンテナ定義 */
.widget-container {
  container-type: inline-size;
}

/* ベーススタイル */
.widget {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.widget__list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.widget__list li {
  padding: 0.5rem;
  border-bottom: 1px solid #eee;
}

/* サイドバー内（狭い）でのスタイル */
@container (max-width: 300px) {
  .widget {
    padding: 0.75rem;
    font-size: 0.9rem;
  }

  .widget h3 {
    font-size: 1rem;
  }
}

/* メインコンテンツ内（広い）でのスタイル */
@container (min-width: 500px) {
  .widget {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 1.5rem;
    padding: 1.5rem;
  }

  .widget__list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
  }

  .widget__list li {
    border: 1px solid #ddd;
    border-radius: 4px;
    text-align: center;
  }
}
```

### 3. ナビゲーションコンポーネント

```html
<nav class="nav-container">
  <ul class="nav">
    <li class="nav__item"><a href="#">Home</a></li>
    <li class="nav__item"><a href="#">About</a></li>
    <li class="nav__item"><a href="#">Services</a></li>
    <li class="nav__item"><a href="#">Contact</a></li>
  </ul>
</nav>
```

```css
.nav-container {
  container-type: inline-size;
  background: #333;
}

/* ベーススタイル（モバイル） */
.nav {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
}

.nav__item {
  border-bottom: 1px solid #444;
}

.nav__item a {
  display: block;
  padding: 1rem;
  color: white;
  text-decoration: none;
}

.nav__item a:hover {
  background: #444;
}

/* タブレット以上 */
@container (min-width: 600px) {
  .nav {
    flex-direction: row;
    justify-content: center;
  }

  .nav__item {
    border-bottom: none;
    border-right: 1px solid #444;
  }

  .nav__item:last-child {
    border-right: none;
  }
}

/* デスクトップ */
@container (min-width: 900px) {
  .nav {
    justify-content: flex-start;
    padding: 0 2rem;
  }

  .nav__item a {
    padding: 1.5rem 2rem;
    font-size: 1.1rem;
  }
}
```

### 4. データテーブルの適応

```html
<div class="table-container">
  <table class="data-table">
    <thead>
      <tr>
        <th>Name</th>
        <th>Email</th>
        <th>Role</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td data-label="Name">John Doe</td>
        <td data-label="Email">john@example.com</td>
        <td data-label="Role">Admin</td>
        <td data-label="Status">Active</td>
      </tr>
      <!-- 他の行... -->
    </tbody>
  </table>
</div>
```

```css
.table-container {
  container-type: inline-size;
}

/* ベーススタイル（モバイル） */
.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead {
  display: none;
}

.data-table tbody tr {
  display: block;
  margin-bottom: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

.data-table td {
  display: block;
  text-align: right;
  padding: 0.75rem;
  border-bottom: 1px solid #eee;
}

.data-table td::before {
  content: attr(data-label);
  float: left;
  font-weight: bold;
  color: #666;
}

.data-table td:last-child {
  border-bottom: none;
}

/* タブレット以上 */
@container (min-width: 600px) {
  .data-table thead {
    display: table-header-group;
  }

  .data-table tbody tr {
    display: table-row;
    border: none;
    margin-bottom: 0;
  }

  .data-table td {
    display: table-cell;
    text-align: left;
    border-bottom: 1px solid #ddd;
  }

  .data-table td::before {
    content: none;
  }

  .data-table th,
  .data-table td {
    padding: 1rem;
  }

  .data-table th {
    background: #f5f5f5;
    font-weight: 600;
  }
}
```

## メディアクエリとの使い分け

### 併用パターン

```css
/* グローバルレイアウト: メディアクエリ */
@media (min-width: 768px) {
  .page {
    display: grid;
    grid-template-columns: 250px 1fr;
  }
}

@media (min-width: 1200px) {
  .page {
    grid-template-columns: 300px 1fr 250px;
  }
}

/* コンポーネントスタイル: コンテナクエリ */
.component-container {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .component {
    /* コンポーネント内部のスタイル */
  }
}
```

### 判断基準

```css
/* メディアクエリを使うべき場合:
   - ページ全体のレイアウト変更
   - グローバルナビゲーション
   - ビューポート全体に影響する変更
   - デバイスの向き（orientation）
   - プリント用スタイル
*/

@media (min-width: 1024px) {
  .page-header {
    /* グローバルヘッダー */
  }
}

@media (orientation: landscape) {
  .video-player {
    /* 横向きの時のスタイル */
  }
}

/* コンテナクエリを使うべき場合:
   - 再利用可能なコンポーネント
   - 配置場所に関わらず適応するUI
   - コンポーネントライブラリ
   - 動的にサイズが変わる要素
*/

@container (min-width: 500px) {
  .card {
    /* コンポーネント内部のスタイル */
  }
}
```

## パフォーマンス最適化

### 1. コンテナの適切な配置

```css
/* ❌ 避けるべき: すべての要素をコンテナにする */
* {
  container-type: inline-size;
}

/* ✅ 推奨: 必要な場所のみコンテナにする */
.card-container,
.widget-wrapper,
.section-container {
  container-type: inline-size;
}
```

### 2. コンテナタイプの選択

```css
/* inline-size: 横幅のみ監視（推奨） */
.horizontal-container {
  container-type: inline-size;
}

/* size: 横幅と高さ両方（レイアウト制約あり） */
.full-size-container {
  container-type: size;
  /* 注意: 子要素の高さが親に影響しない */
}
```

### 3. クエリの最適化

```css
/* ✅ 効率的: 具体的な範囲指定 */
@container (min-width: 400px) and (max-width: 600px) {
  .component {
    /* 特定の範囲でのスタイル */
  }
}

/* ✅ 論理演算子の活用 */
@container (min-width: 500px) or (min-height: 400px) {
  .flexible-component {
    /* どちらかの条件を満たす */
  }
}
```

## ブラウザサポート

```css
/* フィーチャークエリで対応 */
@supports (container-type: inline-size) {
  .card-container {
    container-type: inline-size;
  }

  @container (min-width: 500px) {
    .card {
      display: grid;
    }
  }
}

/* フォールバック */
@supports not (container-type: inline-size) {
  @media (min-width: 768px) {
    .card {
      display: grid;
    }
  }
}
```

## まとめ

CSSコンテナクエリは以下の利点をもたらします:

1. **真の再利用可能なコンポーネント** - 配置場所に依存しない
2. **柔軟なレイアウト** - より細かい制御が可能
3. **シンプルなコード** - ビューポートサイズを気にしない
4. **保守性の向上** - コンポーネント単位でスタイル管理

メディアクエリとコンテナクエリを適切に使い分けることで、より柔軟でメンテナブルなレスポンシブデザインを実現できます。

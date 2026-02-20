---
title: 'CSS Grid vs Flexbox 完全ガイド — 使い分けの判断基準と実践パターン30選'
description: 'CSS GridとFlexboxの本質的な違いを理解し、状況に応じて使い分ける判断基準を解説。実務で使えるレイアウトパターン30選を具体的なコード例付きで紹介。'
pubDate: '2026-02-20'
heroImage: '../../assets/blog-placeholder-2.jpg'
tags: ['CSS', 'Grid', 'Flexbox', 'レイアウト', 'フロントエンド']
---

CSS GridとFlexboxは、現代のWebレイアウトを支える2大技術です。どちらも強力ですが、それぞれ得意とする領域が異なります。「いつGridを使うべきか、いつFlexboxを使うべきか」という判断は、フロントエンド開発者が日常的に直面する問いです。本記事では、両者の本質的な違いを理解したうえで、実務で即使える30のレイアウトパターンをコード例とともに解説します。

---

## 1. GridとFlexboxの本質的な違い

### 1次元 vs 2次元

最も重要な違いは「何次元のレイアウトを扱うか」です。

**Flexbox（1次元）**  
Flexboxは、アイテムを**1つの軸（行または列）**に沿って配置するためのレイアウトモデルです。主軸（main axis）と交差軸（cross axis）がありますが、制御の主体は1方向です。

```css
.flex-container {
  display: flex;
  flex-direction: row; /* または column */
  gap: 16px;
}
```

**CSS Grid（2次元）**  
Gridは、**行と列の両方を同時に制御**します。格子状のレイアウトを、縦横のトラックを定義することで実現します。

```css
.grid-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto;
  gap: 24px;
}
```

### ブラウザの考え方の違い

| 観点 | Flexbox | CSS Grid |
|------|---------|----------|
| 制御の方向 | コンテンツ → レイアウト | レイアウト → コンテンツ |
| 次元数 | 1次元（行 or 列） | 2次元（行 + 列） |
| アイテムサイズ | コンテンツに基づいて柔軟に決まる | グリッドトラックで明示的に定義 |
| 最適なユースケース | ナビゲーション、ボタン群、インライン要素 | ページレイアウト、ギャラリー、ダッシュボード |

### `fr`単位とflexible sizing

GridはCSSの`fr`（fraction）単位を使って利用可能スペースを分割します。

```css
/* 利用可能なスペースを1:2:1に分割 */
.grid {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
}

/* Flexboxの場合はflex-growで比率を指定 */
.flex-container {
  display: flex;
}
.item-small { flex: 1; }
.item-large { flex: 2; }
.item-small2 { flex: 1; }
```

---

## 2. どちらを選ぶかの判断基準

### 判断フロー

以下の問いに順番に答えることで、どちらを使うべきかが明確になります。

**Q1: レイアウトは2次元（縦横同時に制御）が必要か？**
- YES → **Grid**
- NO → Q2へ

**Q2: アイテムを行方向（横並び）または列方向（縦並び）の1方向に並べるだけか？**
- YES → **Flexbox**
- NO → Q3へ

**Q3: アイテムのサイズをコンテンツに合わせて柔軟に変えたいか？**
- YES → **Flexbox**
- NO（明示的なトラックサイズを定義したい） → **Grid**

**Q4: 複数行に並べる際、各行の高さを揃えたいか？**
- YES → **Grid**（行トラックで揃えられる）
- アイテムごとに異なってよい → **Flexbox** + `flex-wrap`

### 典型的な使い分けまとめ

```
ページ全体のレイアウト    → Grid
ナビゲーションバー       → Flexbox
カードグリッド           → Grid
カード内部のレイアウト   → Flexbox
ダッシュボード           → Grid（外枠）+ Flexbox（各パネル内）
フォームのラベル+入力    → Flexbox または Grid（縦列揃えが必要な場合）
```

---

## 3. Flexbox実践パターン15選

### パターン1: 水平ナビゲーションバー

```css
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 60px;
  background: #1a1a2e;
}

.navbar__logo {
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
}

.navbar__links {
  display: flex;
  gap: 32px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.navbar__links a {
  color: #ccc;
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s;
}

.navbar__links a:hover {
  color: #fff;
}

.navbar__cta {
  padding: 8px 20px;
  background: #4f46e5;
  color: #fff;
  border-radius: 6px;
  font-size: 0.9rem;
  text-decoration: none;
}
```

### パターン2: 完全中央寄せ（水平・垂直）

```css
/* 画面全体の中央に配置 */
.centered-layout {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

/* コンテナ内の中央に配置 */
.card-centered {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
}
```

### パターン3: 等幅カードリスト（折り返し付き）

```css
.card-list {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
}

.card-list .card {
  flex: 1 1 280px; /* grow shrink basis */
  max-width: 400px;
  padding: 24px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}
```

`flex: 1 1 280px` は「280pxを基準として、大きくも小さくもなれる」という意味です。コンテナ幅に応じて自動的に折り返します。

### パターン4: フッターを画面下部に固定

```css
.page-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.page-layout__header {
  /* ヘッダー */
}

.page-layout__main {
  flex: 1; /* 残りスペースをすべて取る */
  padding: 40px 24px;
}

.page-layout__footer {
  padding: 24px;
  background: #f3f4f6;
  text-align: center;
}
```

### パターン5: アイコン付きボタン

```css
.btn-with-icon {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #4f46e5;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-with-icon:hover {
  background: #4338ca;
}

.btn-with-icon svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0; /* アイコンが縮まないようにする */
}
```

### パターン6: メディアオブジェクト（画像+テキスト）

```css
.media-object {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.media-object__image {
  flex-shrink: 0; /* 画像が縮まないようにする */
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 50%;
}

.media-object__body {
  flex: 1; /* 残りスペースを取る */
  min-width: 0; /* テキストオーバーフロー対策 */
}

.media-object__title {
  font-weight: 600;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

### パターン7: タブナビゲーション

```css
.tabs {
  display: flex;
  border-bottom: 2px solid #e5e7eb;
  gap: 0;
}

.tab {
  padding: 12px 24px;
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  position: relative;
  transition: color 0.2s;
}

.tab::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: #4f46e5;
  transform: scaleX(0);
  transition: transform 0.2s;
}

.tab.active {
  color: #4f46e5;
}

.tab.active::after {
  transform: scaleX(1);
}
```

### パターン8: バッジ付きアイテム

```css
.badge-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
  background: #dbeafe;
  color: #1d4ed8;
}
```

### パターン9: スプレッドレイアウト（両端揃え + 中央の自動拡張）

```css
/* ヘッダー: ロゴ | 中央メニュー | アクション */
.spread-layout {
  display: flex;
  align-items: center;
}

.spread-layout__start { /* flex-grow不要 */ }

.spread-layout__center {
  flex: 1; /* 残りスペースを占める */
  display: flex;
  justify-content: center;
}

.spread-layout__end { /* flex-grow不要 */ }
```

### パターン10: フォームの入力グループ

```css
.input-group {
  display: flex;
}

.input-group__field {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid #d1d5db;
  border-right: none;
  border-radius: 6px 0 0 6px;
  font-size: 0.9rem;
  outline: none;
}

.input-group__field:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.input-group__button {
  padding: 10px 20px;
  background: #4f46e5;
  color: #fff;
  border: none;
  border-radius: 0 6px 6px 0;
  cursor: pointer;
  white-space: nowrap;
}
```

### パターン11: チップ/タグリスト

```css
.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 9999px;
  font-size: 0.8rem;
  color: #374151;
  cursor: pointer;
  transition: background 0.15s;
}

.chip:hover {
  background: #e5e7eb;
}

.chip--selected {
  background: #ede9fe;
  border-color: #a78bfa;
  color: #5b21b6;
}
```

### パターン12: ローディングスケルトン行

```css
.skeleton-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
}

.skeleton-avatar {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-line {
  height: 12px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-line:last-child {
  width: 60%;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### パターン13: ブレッドクラム

```css
.breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 0.85rem;
}

.breadcrumb__item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #6b7280;
}

.breadcrumb__item a {
  color: #4f46e5;
  text-decoration: none;
}

.breadcrumb__item a:hover {
  text-decoration: underline;
}

.breadcrumb__item::after {
  content: '/';
  color: #d1d5db;
}

.breadcrumb__item:last-child::after {
  display: none;
}
```

### パターン14: ページネーション

```css
.pagination {
  display: flex;
  align-items: center;
  gap: 4px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  color: #374151;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s;
}

.page-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.page-btn--active {
  background: #4f46e5;
  border-color: #4f46e5;
  color: #fff;
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

### パターン15: プログレスバー付きステッパー

```css
.stepper {
  display: flex;
  align-items: center;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  position: relative;
}

.step:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 16px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: #e5e7eb;
  z-index: 0;
}

.step--completed:not(:last-child)::after {
  background: #4f46e5;
}

.step__circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e5e7eb;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 600;
  position: relative;
  z-index: 1;
  transition: all 0.2s;
}

.step--completed .step__circle {
  background: #4f46e5;
  color: #fff;
}

.step--active .step__circle {
  background: #fff;
  border: 2px solid #4f46e5;
  color: #4f46e5;
}

.step__label {
  margin-top: 8px;
  font-size: 0.75rem;
  color: #6b7280;
  text-align: center;
}
```

---

## 4. CSS Grid実践パターン15選

### パターン16: 3カラムページレイアウト（サイドバー付き）

```css
.page-layout {
  display: grid;
  grid-template-areas:
    "header header header"
    "sidebar main aside"
    "footer footer footer";
  grid-template-columns: 240px 1fr 200px;
  grid-template-rows: 60px 1fr auto;
  min-height: 100vh;
  gap: 0;
}

.page-header { grid-area: header; }
.page-sidebar { grid-area: sidebar; }
.page-main   { grid-area: main; }
.page-aside  { grid-area: aside; }
.page-footer { grid-area: footer; }

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .page-layout {
    grid-template-areas:
      "header"
      "main"
      "aside"
      "sidebar"
      "footer";
    grid-template-columns: 1fr;
    grid-template-rows: 60px auto;
  }
}
```

### パターン17: 写真ギャラリー（等幅グリッド）

```css
.photo-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.photo-gallery__item {
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 8px;
}

.photo-gallery__item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.photo-gallery__item:hover img {
  transform: scale(1.05);
}
```

`auto-fill` + `minmax()` の組み合わせにより、メディアクエリなしで自動的にレスポンシブになります。

### パターン18: マソンリーレイアウト（Pinterestスタイル）

```css
/* CSS Gridによる疑似マソンリー */
.masonry {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  grid-auto-rows: 10px;
  gap: 16px;
}

/* JSでspan数を動的に設定: style="grid-row: span 30" */
.masonry__item {
  padding: 0;
  border-radius: 8px;
  overflow: hidden;
}

/* columnsプロパティを使った別手法 */
.masonry-columns {
  columns: 3 250px;
  column-gap: 16px;
}

.masonry-columns .item {
  break-inside: avoid;
  margin-bottom: 16px;
}
```

### パターン19: ダッシュボードレイアウト

```css
.dashboard {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-auto-rows: minmax(100px, auto);
  gap: 24px;
  padding: 24px;
}

/* 大きなメトリクスカード */
.metric-card--large {
  grid-column: span 4;
  grid-row: span 2;
}

/* 通常のメトリクスカード */
.metric-card {
  grid-column: span 3;
}

/* グラフエリア */
.chart-area {
  grid-column: span 8;
  grid-row: span 3;
}

/* アクティビティフィード */
.activity-feed {
  grid-column: span 4;
  grid-row: span 3;
}

/* テーブル */
.data-table {
  grid-column: span 12;
}

@media (max-width: 1024px) {
  .metric-card--large { grid-column: span 6; }
  .metric-card { grid-column: span 6; }
  .chart-area { grid-column: span 12; }
  .activity-feed { grid-column: span 12; }
}

@media (max-width: 640px) {
  .metric-card--large,
  .metric-card { grid-column: span 12; }
}
```

### パターン20: 雑誌レイアウト（フィーチャード記事 + サブ記事）

```css
.magazine-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: repeat(3, 200px);
  gap: 16px;
}

/* メイン特集記事 */
.article--featured {
  grid-column: 1 / 4;
  grid-row: 1 / 3;
}

/* 縦長の第2特集 */
.article--secondary {
  grid-column: 4 / 6;
  grid-row: 1 / 4;
}

/* 小記事群 */
.article--small:nth-child(3) { grid-column: 1 / 3; grid-row: 3; }
.article--small:nth-child(4) { grid-column: 3 / 4; grid-row: 3; }
.article--small:nth-child(5) { grid-column: 6;     grid-row: 1 / 4; }

.article {
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.article img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.article__overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px;
  background: linear-gradient(transparent, rgba(0,0,0,0.8));
  color: #fff;
}
```

### パターン21: Holy Grailレイアウト（完全版）

```css
.holy-grail {
  display: grid;
  grid-template:
    "header"  60px
    "nav"     auto
    "body"    1fr
    "footer"  auto
    / 1fr;
}

@media (min-width: 768px) {
  .holy-grail {
    grid-template:
      "header  header  header"  60px
      "nav     body    aside"   1fr
      "footer  footer  footer"  auto
      / 200px  1fr     160px;
  }
}

[style*="header"] { grid-area: header; }
[style*="nav"]    { grid-area: nav; }
.holy-grail-body  { grid-area: body; }
[style*="aside"]  { grid-area: aside; }
[style*="footer"] { grid-area: footer; }
```

### パターン22: 自動フィルグリッド（アイテム数に応じて自動調整）

```css
/* auto-fillとauto-fitの使い分け */

/* auto-fill: 空のトラックも保持する */
.grid-autofill {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

/* auto-fit: 空のトラックを折りたたむ */
.grid-autofit {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

/* 実用例: 製品カードリスト */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
  padding: 24px 0;
}
```

### パターン23: ランダムサイズのアート系グリッド

```css
.art-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 150px;
  gap: 8px;
}

.art-grid__item { border-radius: 4px; overflow: hidden; }
.art-grid__item img { width: 100%; height: 100%; object-fit: cover; }

/* バリアント */
.art-grid__item--wide  { grid-column: span 2; }
.art-grid__item--tall  { grid-row: span 2; }
.art-grid__item--large { grid-column: span 2; grid-row: span 2; }
```

### パターン24: フォームレイアウト（ラベル+入力の縦列揃え）

```css
.form-grid {
  display: grid;
  grid-template-columns: max-content 1fr;
  align-items: center;
  gap: 16px 24px;
}

.form-grid label {
  text-align: right;
  font-size: 0.9rem;
  color: #374151;
  font-weight: 500;
}

.form-grid input,
.form-grid select,
.form-grid textarea {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  width: 100%;
}

/* 全幅の要素 */
.form-grid .full-width {
  grid-column: 1 / -1;
}

/* ボタン行 */
.form-grid .form-actions {
  grid-column: 2;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
```

### パターン25: カレンダーグリッド

```css
.calendar {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: #e5e7eb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.calendar__day-header {
  background: #f9fafb;
  padding: 8px;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
}

.calendar__cell {
  background: #fff;
  min-height: 80px;
  padding: 8px;
  font-size: 0.85rem;
}

.calendar__cell--today {
  background: #ede9fe;
}

.calendar__cell--other-month {
  background: #fafafa;
  color: #d1d5db;
}

.calendar__date {
  font-weight: 600;
  margin-bottom: 4px;
}

.calendar__events {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.calendar__event {
  font-size: 0.7rem;
  padding: 1px 6px;
  border-radius: 3px;
  background: #4f46e5;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

### パターン26: タイムラインレイアウト

```css
.timeline {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0 24px;
}

.timeline__marker {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.timeline__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #4f46e5;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.timeline__line {
  flex: 1;
  width: 2px;
  background: #e5e7eb;
  margin-top: 4px;
}

.timeline__content {
  padding-bottom: 32px;
}

.timeline__date {
  font-size: 0.8rem;
  color: #6b7280;
  margin-bottom: 8px;
}

.timeline__title {
  font-weight: 600;
  margin-bottom: 4px;
}
```

### パターン27: 比較テーブル（料金プラン）

```css
.pricing-grid {
  display: grid;
  grid-template-columns: 1fr repeat(3, 1fr);
  gap: 0;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

.pricing-grid__header {
  padding: 24px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
}

.pricing-grid__header--featured {
  background: #4f46e5;
  color: #fff;
}

.pricing-grid__cell {
  padding: 16px 24px;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
}

.pricing-grid__feature-name {
  font-weight: 500;
  color: #374151;
}

.pricing-grid__check {
  color: #10b981;
}

.pricing-grid__dash {
  color: #d1d5db;
}
```

### パターン28: スティッキーサイドバー付きレイアウト

```css
.article-layout {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 40px;
  align-items: start;
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 24px;
}

.article-content {
  min-width: 0; /* テキストオーバーフロー対策 */
}

.article-sidebar {
  position: sticky;
  top: 80px; /* ヘッダー高さ分 */
}

.toc {
  padding: 20px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

@media (max-width: 768px) {
  .article-layout {
    grid-template-columns: 1fr;
  }
  .article-sidebar {
    position: static;
  }
}
```

### パターン29: サブグリッド（CSS Subgrid）

```css
/* 親グリッドのトラックをカード内で継承する */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 24px;
}

.card {
  display: grid;
  /* 親の列を継承 */
  grid-template-rows: subgrid;
  /* カード内に4行: 画像 / タイトル / 説明 / フッター */
  grid-row: span 4;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.card__image {
  aspect-ratio: 16/9;
  object-fit: cover;
  width: 100%;
}

.card__title {
  padding: 16px 16px 0;
  font-size: 1rem;
  font-weight: 600;
}

.card__body {
  padding: 8px 16px;
  font-size: 0.875rem;
  color: #6b7280;
}

.card__footer {
  padding: 12px 16px;
  border-top: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
```

### パターン30: レスポンシブグリッドシステム（Tailwind-like）

```css
/* Bootstrap/Tailwindに近い12カラムグリッド */
.grid-12 {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
}

/* ユーティリティクラス */
.col-1  { grid-column: span 1; }
.col-2  { grid-column: span 2; }
.col-3  { grid-column: span 3; }
.col-4  { grid-column: span 4; }
.col-6  { grid-column: span 6; }
.col-8  { grid-column: span 8; }
.col-12 { grid-column: span 12; }

@media (max-width: 1024px) {
  .lg\:col-6  { grid-column: span 6; }
  .lg\:col-12 { grid-column: span 12; }
}

@media (max-width: 768px) {
  .md\:col-12 { grid-column: span 12; }
}

@media (max-width: 480px) {
  .sm\:col-12 { grid-column: span 12; }
}
```

---

## 5. GridとFlexboxの組み合わせパターン

GridとFlexboxは競合技術ではなく、**補完技術**です。ページレイアウトはGridで行い、各コンポーネントの内部はFlexboxで調整するパターンが最も強力です。

### 組み合わせ例1: ダッシュボード

```css
/* 外枠: Grid */
.dashboard {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: 60px 1fr;
  min-height: 100vh;
}

/* ヘッダー内部: Flexbox */
.dashboard-header {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-bottom: 1px solid #e5e7eb;
}

/* コンテンツエリア: Grid */
.dashboard-content {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: minmax(100px, auto);
  gap: 24px;
  padding: 24px;
  overflow-y: auto;
}

/* 各カード内部: Flexbox */
.metric-card {
  display: flex;
  flex-direction: column;
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.metric-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.metric-card__footer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto; /* フッターをカード下部に固定 */
}
```

### 組み合わせ例2: ブログ記事ページ

```css
/* ページレイアウト: Grid */
.blog-page {
  display: grid;
  grid-template-columns: minmax(0, 720px) 280px;
  gap: 60px;
  max-width: 1100px;
  margin: 0 auto;
  padding: 60px 24px;
}

/* 記事ヘッダー: Flexbox */
.article-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 32px;
}

.article-author {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* タグリスト: Flexbox */
.article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 40px;
}

/* 関連記事: Grid */
.related-articles {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-top: 60px;
}
```

---

## 6. よくある間違いと解決策

### 間違い1: `min-width: 0` を忘れる

Flexアイテムのデフォルトの `min-width` は `auto` です。テキストが長い場合、コンテナからはみ出します。

```css
/* 問題: テキストがオーバーフローする */
.flex-item {
  flex: 1;
}

/* 解決策 */
.flex-item {
  flex: 1;
  min-width: 0; /* または overflow: hidden */
}

.flex-item p {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

### 間違い2: `flex-shrink: 0` を忘れてアイコンが縮む

```css
/* 問題: テキストが長いとアイコンが縮む */
.list-item {
  display: flex;
  gap: 12px;
}

/* 解決策 */
.list-item__icon {
  flex-shrink: 0; /* アイコンを縮まないようにする */
  width: 24px;
  height: 24px;
}
```

### 間違い3: GridでのImplicit Grid（暗黙的グリッド）の見落とし

```css
/* 定義したトラック数を超えた場合、暗黙的トラックが作られる */
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  /* grid-template-rowsを未定義 → 暗黙的行が生まれる */
  grid-auto-rows: 200px; /* 暗黙的行のサイズを明示 */
}
```

### 間違い4: `justify-content` と `align-content` の混同

```css
.flex-container {
  display: flex;
  /* justify-content: 主軸方向（デフォルト: 横）のアイテム配置 */
  justify-content: center;
  /* align-items: 交差軸方向（デフォルト: 縦）の各行のアイテム配置 */
  align-items: center;
  /* align-content: 複数行ある場合の行全体の配置（flex-wrap必須） */
  align-content: flex-start;
}
```

### 間違い5: `grid-template-columns` での `%` 使用

```css
/* 問題: gapを考慮すると計算がずれる */
.grid-bad {
  display: grid;
  grid-template-columns: 33% 33% 33%; /* gapがあるとはみ出す */
  gap: 16px;
}

/* 解決策: frを使う */
.grid-good {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr; /* gapを自動的に除いた残りを分割 */
  gap: 16px;
}
```

### 間違い6: Flexboxで垂直中央寄せにheightを設定し忘れる

```css
/* 問題: 高さが定義されていないと中央寄せが効かない */
.container-bad {
  display: flex;
  align-items: center; /* 高さがないと意味がない */
}

/* 解決策 */
.container-good {
  display: flex;
  align-items: center;
  min-height: 100vh; /* または固定の高さ */
}
```

---

## 7. CSSカスタムプロパティとの組み合わせ

CSSカスタムプロパティ（CSS変数）を使うことで、レイアウトシステムを柔軟かつ保守しやすくできます。

### グリッドシステムをカスタムプロパティで制御

```css
/* ルートで基本値を定義 */
:root {
  --grid-columns: 12;
  --grid-gap: 24px;
  --grid-max-width: 1280px;

  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 40px;
  --spacing-2xl: 64px;
}

/* グリッドコンポーネント */
.grid {
  display: grid;
  grid-template-columns: repeat(var(--grid-columns), 1fr);
  gap: var(--grid-gap);
  max-width: var(--grid-max-width);
  margin: 0 auto;
  padding: 0 var(--grid-gap);
}

/* カラム数をコンテキストで変更 */
@media (max-width: 1024px) {
  :root {
    --grid-columns: 8;
    --grid-gap: 20px;
  }
}

@media (max-width: 640px) {
  :root {
    --grid-columns: 4;
    --grid-gap: 16px;
  }
}
```

### テーマ対応レイアウト

```css
:root {
  --sidebar-width: 240px;
  --header-height: 60px;
  --content-max-width: 860px;
}

/* コンパクトモード（JSで切り替え） */
[data-layout="compact"] {
  --sidebar-width: 64px;
  --header-height: 48px;
}

.app-layout {
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;
  grid-template-rows: var(--header-height) 1fr;
  min-height: 100vh;
  transition: grid-template-columns 0.3s ease;
}

.sidebar {
  width: var(--sidebar-width);
  overflow: hidden;
  transition: width 0.3s ease;
}
```

### レスポンシブ間隔のカスタムプロパティ

```css
/* clamp()と組み合わせてレスポンシブなスペーシング */
:root {
  --space-section: clamp(40px, 8vw, 80px);
  --space-component: clamp(20px, 4vw, 40px);
  --font-size-hero: clamp(2rem, 5vw, 4rem);
  --font-size-h2: clamp(1.5rem, 3vw, 2.25rem);
}

.section {
  padding: var(--space-section) 0;
}

.component {
  margin-bottom: var(--space-component);
}
```

CSS単位の変換にはDevToolBoxの[CSS単位変換ツール](https://usedevtools.com/css-unit)が便利です。px、rem、em、vh等を相互変換できます。

### アニメーションとの組み合わせ

```css
/* グリッドレイアウトアニメーション（要素追加/削除時） */
@keyframes grid-item-in {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.grid-item {
  animation: grid-item-in 0.3s ease forwards;
}

/* View Transitions APIとの組み合わせ（Chrome 111+） */
.grid-item {
  view-transition-name: var(--item-id);
}

@keyframes slide-in-right {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

::view-transition-new(root) {
  animation: slide-in-right 0.3s ease;
}
```

---

## まとめ

GridとFlexboxの使い分けの判断基準を再整理します。

| 状況 | 推奨 |
|------|------|
| ページ全体の骨格 | Grid |
| ナビゲーション、ボタン群 | Flexbox |
| 等幅カードのグリッド | Grid（auto-fill + minmax） |
| カード内部のレイアウト | Flexbox |
| 完全中央寄せ | Flexbox（1〜2行） / Grid（place-items: center） |
| フッターを下部固定 | Flexbox（flex-direction: column） |
| 複雑なダッシュボード | Grid（外枠） + Flexbox（各ウィジェット） |
| テキスト + アイコンの横並び | Flexbox |
| 多段のギャラリー | Grid |

最終的には「コードが読みやすく、意図が明確か」が判断基準です。GridとFlexboxを深く理解し、適材適所で使い分けることで、保守性の高い堅牢なUIを実現できます。

本記事で紹介した30のパターンをベースに、プロジェクトの要件に合わせてカスタマイズしてください。MDN Web Docsの[CSS Grid Layout](https://developer.mozilla.org/ja/docs/Web/CSS/CSS_grid_layout)と[Flexbox](https://developer.mozilla.org/ja/docs/Web/CSS/CSS_flexible_box_layout)のリファレンスも、詳細仕様の確認に活用することをおすすめします。

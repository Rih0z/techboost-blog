---
title: "CSSネイティブネスティング詳解: Sass不要の時代へ"
description: "CSSネイティブネスティング完全ガイド。&セレクタ、@nestルール、疑似クラス・疑似要素との組み合わせ、Sass/SCSSとの違い、移行戦略、ブラウザ対応状況を徹底解説。"
pubDate: "2025-02-05"
category: "css"
tags: ["CSS", "ネスティング", "Sass", "SCSS", "フロントエンド", "Web標準"]
---

CSSネイティブネスティングがすべてのモダンブラウザでサポートされ、SassやSCSSなしでもネストした記法が使えるようになりました。

この記事では、CSSネイティブネスティングの文法、使い方、Sassとの違い、移行戦略を解説します。

## CSSネイティブネスティングとは

CSSネスティングは、セレクタをネストして記述できる構文です。これまでSass/SCSSでしか使えなかった機能が、ブラウザネイティブで利用可能になりました。

### ブラウザサポート状況（2025年2月時点）

- Chrome/Edge: 120+ ✅
- Firefox: 117+ ✅
- Safari: 17.2+ ✅

### 基本構文

```css
/* 従来の書き方 */
.card {
  padding: 1rem;
}

.card .title {
  font-size: 1.5rem;
}

.card .description {
  color: #666;
}

/* ネスティング */
.card {
  padding: 1rem;

  .title {
    font-size: 1.5rem;
  }

  .description {
    color: #666;
  }
}
```

## &セレクタ（ネストセレクタ）

### 親セレクタの参照

```css
.button {
  background: blue;
  color: white;

  /* ホバー時 */
  &:hover {
    background: darkblue;
  }

  /* フォーカス時 */
  &:focus {
    outline: 2px solid blue;
  }

  /* 無効化時 */
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
```

### 修飾子パターン

```css
.card {
  border: 1px solid #ddd;
  padding: 1rem;

  /* .card--primary */
  &--primary {
    border-color: blue;
    background: #f0f8ff;
  }

  /* .card--danger */
  &--danger {
    border-color: red;
    background: #fff0f0;
  }

  /* .card--large */
  &--large {
    padding: 2rem;
    font-size: 1.2em;
  }
}
```

### &の位置

```css
.link {
  color: blue;

  /* .link:hover */
  &:hover {
    text-decoration: underline;
  }

  /* .dark .link */
  .dark & {
    color: lightblue;
  }

  /* nav .link */
  nav & {
    color: white;
  }

  /* .link.active */
  &.active {
    font-weight: bold;
  }
}
```

## ネスト構文のパターン

### 子孫セレクタ

```css
.nav {
  display: flex;

  /* .nav ul */
  ul {
    list-style: none;
    display: flex;
    gap: 1rem;
  }

  /* .nav ul li */
  ul li {
    display: flex;
  }

  /* .nav ul li a */
  ul li a {
    color: inherit;
    text-decoration: none;
  }
}
```

### 直接の子要素（>）

```css
.menu {
  /* .menu > li */
  > li {
    padding: 0.5rem;
  }

  /* .menu > li > a */
  > li > a {
    display: block;
    color: black;
  }
}
```

### 隣接兄弟セレクタ（+）

```css
.article {
  /* .article h2 + p */
  h2 + p {
    margin-top: 0;
    font-size: 1.1em;
  }

  /* .article img + figcaption */
  img + figcaption {
    text-align: center;
    font-style: italic;
  }
}
```

### 一般兄弟セレクタ（~）

```css
.form {
  /* .form input:focus ~ label */
  input:focus ~ label {
    color: blue;
  }

  /* .form input:invalid ~ .error */
  input:invalid ~ .error {
    display: block;
  }
}
```

## 疑似クラス・疑似要素

### 疑似クラス

```css
.input {
  border: 1px solid #ccc;

  /* .input:focus */
  &:focus {
    border-color: blue;
    outline: 2px solid rgba(0, 0, 255, 0.1);
  }

  /* .input:invalid */
  &:invalid {
    border-color: red;
  }

  /* .input:not(:placeholder-shown) */
  &:not(:placeholder-shown) {
    background: #f9f9f9;
  }

  /* .input:has(+ .error) */
  &:has(+ .error) {
    border-color: red;
  }
}
```

### 疑似要素

```css
.quote {
  font-style: italic;

  /* .quote::before */
  &::before {
    content: '"';
    font-size: 2em;
    color: #ccc;
  }

  /* .quote::after */
  &::after {
    content: '"';
    font-size: 2em;
    color: #ccc;
  }

  /* .quote::first-line */
  &::first-line {
    font-weight: bold;
  }
}
```

### nth-child系

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);

  /* .grid > *:nth-child(3n+1) */
  > *:nth-child(3n+1) {
    grid-column: span 2;
  }

  /* .grid > *:nth-child(odd) */
  > *:nth-child(odd) {
    background: #f0f0f0;
  }

  /* .grid > *:last-child */
  > *:last-child {
    border-bottom: none;
  }
}
```

## @nestルール

複雑なセレクタには`@nest`を使用します。

### @nestの基本

```css
.card {
  border: 1px solid #ddd;

  /* 通常のネスト */
  .title {
    font-size: 1.5rem;
  }

  /* @nestが必要なパターン */
  @nest .dark & {
    border-color: #333;
    background: #1a1a1a;
  }

  @nest :not(&) {
    opacity: 0.5;
  }
}
```

### 複合セレクタ

```css
.button {
  padding: 0.5rem 1rem;

  /* .container .button.primary */
  @nest .container &.primary {
    background: blue;
    color: white;
  }

  /* .button:not(.disabled):hover */
  @nest &:not(.disabled):hover {
    transform: scale(1.05);
  }

  /* .dark .button, .button.dark-mode */
  @nest .dark &, &.dark-mode {
    background: #333;
    color: white;
  }
}
```

## メディアクエリとの組み合わせ

### コンテナクエリ

```css
.card {
  container-type: inline-size;
  container-name: card;

  .title {
    font-size: 1.2rem;

    /* コンテナが広い時 */
    @container card (min-width: 500px) {
      font-size: 2rem;
    }
  }

  .image {
    width: 100%;

    @container card (min-width: 700px) {
      width: 50%;
      float: left;
    }
  }
}
```

### レスポンシブデザイン

```css
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem;
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 3rem;
  }

  .item {
    padding: 1rem;

    @media (min-width: 768px) {
      padding: 1.5rem;
    }
  }
}
```

### prefers系メディアクエリ

```css
.theme {
  background: white;
  color: black;

  @media (prefers-color-scheme: dark) {
    background: #1a1a1a;
    color: white;
  }

  @media (prefers-reduced-motion: reduce) {
    * {
      animation: none !important;
      transition: none !important;
    }
  }

  @media (prefers-contrast: high) {
    border: 2px solid currentColor;
  }
}
```

## Sass/SCSSとの違い

### &の挙動の違い

```scss
/* SCSS */
.button {
  &-primary {  /* OK: .button-primary */
    background: blue;
  }
}

/* CSS Nesting */
.button {
  /* ❌ 動作しない */
  &-primary {
    background: blue;
  }

  /* ✅ 正しい書き方 */
  &--primary {
    background: blue;
  }
}
```

### ネストの深さ

```css
/* SCSS: 無制限にネスト可能（非推奨） */
.a {
  .b {
    .c {
      .d {
        .e {
          /* 深すぎ！ */
        }
      }
    }
  }
}

/* CSS Nesting: 3階層までを推奨 */
.card {
  .header {
    .title {
      /* これくらいまで */
    }
  }
}
```

### 変数のスコープ

```scss
/* SCSS: 変数もネストできる */
.theme {
  $color: blue;

  .title {
    color: $color; /* OK */
  }
}

/* CSS Nesting: カスタムプロパティを使う */
.theme {
  --color: blue;

  .title {
    color: var(--color); /* OK */
  }
}
```

## 実践パターン

### BEM記法

```css
.block {
  /* Block */
  display: flex;
  gap: 1rem;

  /* Element */
  &__element {
    padding: 0.5rem;
  }

  &__title {
    font-size: 1.5rem;
  }

  /* Modifier */
  &--primary {
    background: blue;
    color: white;
  }

  &--large {
    padding: 2rem;
  }
}
```

### コンポーネント設計

```css
.card {
  /* ベーススタイル */
  border-radius: 8px;
  padding: 1rem;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);

  /* 子要素 */
  .header {
    border-bottom: 1px solid #eee;
    padding-bottom: 0.5rem;
    margin-bottom: 1rem;

    .title {
      margin: 0;
      font-size: 1.5rem;
    }

    .subtitle {
      color: #666;
      font-size: 0.9rem;
    }
  }

  .body {
    line-height: 1.6;
  }

  .footer {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #eee;
    display: flex;
    justify-content: space-between;
  }

  /* 状態 */
  &:hover {
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  }

  &[aria-selected="true"] {
    border: 2px solid blue;
  }

  /* バリエーション */
  &.compact {
    padding: 0.5rem;

    .header {
      margin-bottom: 0.5rem;
    }
  }
}
```

### ユーティリティクラス

```css
.flex {
  display: flex;

  &-row {
    flex-direction: row;
  }

  &-col {
    flex-direction: column;
  }

  &-center {
    justify-content: center;
    align-items: center;
  }

  &-between {
    justify-content: space-between;
  }

  &-wrap {
    flex-wrap: wrap;
  }
}

.text {
  &-center {
    text-align: center;
  }

  &-right {
    text-align: right;
  }

  &-sm {
    font-size: 0.875rem;
  }

  &-lg {
    font-size: 1.25rem;
  }
}
```

## 移行戦略

### Sassから段階的に移行

```css
/* 1. まず単純なネストから移行 */
.nav {
  /* ✅ 簡単に移行可能 */
  ul {
    list-style: none;
  }

  a {
    text-decoration: none;
  }
}

/* 2. 変数をカスタムプロパティに */
/* Before (SCSS) */
$primary-color: blue;

.button {
  background: $primary-color;
}

/* After (CSS) */
:root {
  --primary-color: blue;
}

.button {
  background: var(--primary-color);
}

/* 3. mixinは代替手段を検討 */
/* Before (SCSS) */
@mixin flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* After (CSS) - ユーティリティクラスまたは直接記述 */
.flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

### PostCSSでの対応

```bash
npm install postcss postcss-nesting
```

```javascript
// postcss.config.js
module.exports = {
  plugins: {
    'postcss-nesting': {},
    autoprefixer: {}
  }
}
```

## パフォーマンスと注意点

### ネストの深さは3階層まで

```css
/* ❌ 深すぎる */
.page {
  .container {
    .section {
      .card {
        .header {
          .title {
            /* 読みにくい、詳細度も高すぎる */
          }
        }
      }
    }
  }
}

/* ✅ 適切な深さ */
.card {
  .header {
    .title {
      /* 十分読みやすい */
    }
  }
}
```

### 詳細度の管理

```css
/* 詳細度が高くなりすぎる例 */
.nav {
  ul {
    li {
      a {
        /* .nav ul li a - 詳細度: 0,0,0,4 */
        color: blue;
      }
    }
  }
}

/* より良いアプローチ */
.nav {
  &__link {
    /* .nav__link - 詳細度: 0,0,1,0 */
    color: blue;
  }
}
```

## まとめ

CSSネイティブネスティングにより、プリプロセッサなしでも読みやすいCSSが書けるようになりました。

### 重要なポイント

1. **&セレクタ**: 親セレクタの参照に使用
2. **@nestルール**: 複雑なセレクタに必要
3. **ネストは3階層まで**: 詳細度と可読性のバランス
4. **Sassとの違い**: `&-modifier` の挙動に注意
5. **段階的移行**: まず単純なネストから導入

### 移行のメリット

- ビルドステップの削減
- ネイティブCSSなので高速
- ブラウザDevToolsでそのまま読める
- 学習コストの削減（CSS標準仕様）

CSSネスティングは、Sassのキラー機能の1つがブラウザネイティブになった大きな進歩です。

### 参考リンク

- [CSS Nesting - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_nesting)
- [CSS Nesting Module - W3C](https://www.w3.org/TR/css-nesting-1/)
- [Can I use: CSS Nesting](https://caniuse.com/css-nesting)

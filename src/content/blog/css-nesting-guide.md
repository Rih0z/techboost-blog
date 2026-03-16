---
title: 'CSSネスティング完全ガイド - ネイティブCSS Nesting、&セレクタ、@scope実践'
description: 'CSSネスティングの完全ガイド。ネイティブCSS Nesting構文、&セレクタ、@scopeルール、Sassからの移行方法、実践的なパターンを詳しく解説。'
pubDate: '2026-02-05'
tags: ['CSS', 'Frontend', 'Web', 'プログラミング']
heroImage: '../../assets/thumbnails/css-nesting-guide.jpg'
---

ついにCSSにネイティブなネスティング機能が実装されました。長年Sass/Lessなどのプリプロセッサが提供してきた機能が、標準CSSで利用できるようになりました。本記事では、CSS Nestingの構文から実践的な使い方、移行方法までを徹底解説します。

## 目次

1. CSS Nestingとは
2. 基本的な構文
3. &セレクタの活用
4. @scopeルール
5. メディアクエリとネスティング
6. Sassからの移行
7. ブラウザサポート
8. 実践パターン集

## 1. CSS Nestingとは

CSS Nestingは、CSSルールを別のルール内にネストできる機能です。これにより、関連するスタイルをグループ化し、より読みやすく保守しやすいコードを書けます。

### 従来のCSS

```css
.card {
  padding: 1rem;
  border: 1px solid #ccc;
}

.card .title {
  font-size: 1.5rem;
  font-weight: bold;
}

.card .description {
  color: #666;
  margin-top: 0.5rem;
}

.card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

### CSS Nestingを使った場合

```css
.card {
  padding: 1rem;
  border: 1px solid #ccc;

  .title {
    font-size: 1.5rem;
    font-weight: bold;
  }

  .description {
    color: #666;
    margin-top: 0.5rem;
  }

  &:hover {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
}
```

## 2. 基本的な構文

### 子孫セレクタ

```css
/* ベーシックなネスティング */
.navigation {
  background: white;

  ul {
    list-style: none;
    padding: 0;
  }

  li {
    display: inline-block;
    margin-right: 1rem;
  }

  a {
    color: #333;
    text-decoration: none;
  }
}

/* 出力結果（概念上）:
.navigation { background: white; }
.navigation ul { list-style: none; padding: 0; }
.navigation li { display: inline-block; margin-right: 1rem; }
.navigation a { color: #333; text-decoration: none; }
*/
```

### 直接の子要素

```css
.parent {
  padding: 1rem;

  /* > を使って直接の子要素を指定 */
  > .child {
    margin-bottom: 0.5rem;
  }

  > * {
    box-sizing: border-box;
  }
}
```

### 複数のセレクタ

```css
.button {
  padding: 0.5rem 1rem;
  border: none;

  /* 複数のセレクタをまとめる */
  &.primary,
  &.secondary {
    border-radius: 4px;
    font-weight: bold;
  }

  &.primary {
    background: blue;
    color: white;
  }

  &.secondary {
    background: gray;
    color: white;
  }
}
```

## 3. &セレクタの活用

&セレクタは親セレクタへの参照です。Sassユーザーにはおなじみの機能が、ネイティブCSSでも使えるようになりました。

### 擬似クラス

```css
.button {
  background: blue;
  color: white;
  padding: 0.5rem 1rem;
  transition: all 0.2s;

  &:hover {
    background: darkblue;
  }

  &:active {
    transform: scale(0.98);
  }

  &:focus {
    outline: 2px solid lightblue;
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
```

### 擬似要素

```css
.link {
  color: blue;
  text-decoration: none;
  position: relative;

  &::before {
    content: '→ ';
    color: gray;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 0;
    height: 2px;
    background: blue;
    transition: width 0.3s;
  }

  &:hover::after {
    width: 100%;
  }
}
```

### BEMスタイル

```css
.block {
  padding: 1rem;

  /* Element */
  &__element {
    margin-bottom: 0.5rem;
  }

  /* Modifier */
  &--modifier {
    background: lightgray;
  }

  /* 組み合わせ */
  &__element--modifier {
    font-weight: bold;
  }
}

/* 出力:
.block { padding: 1rem; }
.block__element { margin-bottom: 0.5rem; }
.block--modifier { background: lightgray; }
.block__element--modifier { font-weight: bold; }
*/
```

### クラスの結合

```css
.nav {
  display: flex;

  /* .nav.open のように結合される */
  &.open {
    background: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  /* .nav.light-theme */
  &.light-theme {
    background: white;
    color: black;
  }

  /* .nav.dark-theme */
  &.dark-theme {
    background: black;
    color: white;
  }
}
```

### 子要素との組み合わせ

```css
.card {
  padding: 1rem;
  border: 1px solid #ccc;

  /* .card:hover .title */
  &:hover .title {
    color: blue;
  }

  /* .card.featured .badge */
  &.featured .badge {
    display: block;
  }

  /* .card > .header */
  & > .header {
    border-bottom: 1px solid #eee;
    padding-bottom: 0.5rem;
  }
}
```

## 4. @scopeルール

@scopeルールは、スタイルの適用範囲を明示的に制限する新しい機能です。

### 基本的な使い方

```css
/* .panel 内でのみスタイルが適用される */
@scope (.panel) {
  .title {
    font-size: 1.5rem;
    color: blue;
  }

  .description {
    color: gray;
  }
}

/* .panel の外では影響を受けない */
.title {
  font-size: 1rem;
  color: black;
}
```

### 除外範囲の指定

```css
/* .article 内で適用されるが、.sidebar 内は除外 */
@scope (.article) to (.sidebar) {
  p {
    line-height: 1.6;
    margin-bottom: 1rem;
  }

  a {
    color: blue;
    text-decoration: underline;
  }
}
```

### コンポーネントのスコープ化

```css
@scope (.modal) {
  /* このスタイルは .modal 内でのみ有効 */
  .header {
    border-bottom: 1px solid #ccc;
    padding: 1rem;
  }

  .body {
    padding: 1rem;
    max-height: 500px;
    overflow-y: auto;
  }

  .footer {
    border-top: 1px solid #ccc;
    padding: 1rem;
    text-align: right;
  }

  button {
    margin-left: 0.5rem;
  }
}

/* 別のコンポーネント */
@scope (.card) {
  /* 同じクラス名でも競合しない */
  .header {
    background: lightgray;
    padding: 0.5rem;
  }

  .body {
    padding: 0.5rem;
  }
}
```

### ネスティングとの組み合わせ

```css
@scope (.dashboard) {
  .widget {
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 1rem;

    .title {
      font-weight: bold;
      margin-bottom: 0.5rem;
    }

    .content {
      color: #666;
    }

    &:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
  }
}
```

## 5. メディアクエリとネスティング

メディアクエリもネストできるようになり、レスポンシブデザインの記述が簡潔になります。

### 基本的なメディアクエリ

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

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }
}
```

### コンテナクエリとの組み合わせ

```css
.card {
  container-type: inline-size;
  padding: 1rem;

  .title {
    font-size: 1rem;

    @container (min-width: 400px) {
      font-size: 1.25rem;
    }

    @container (min-width: 600px) {
      font-size: 1.5rem;
    }
  }

  .image {
    width: 100%;

    @container (min-width: 400px) {
      width: 50%;
      float: left;
      margin-right: 1rem;
    }
  }
}
```

### ダークモード対応

```css
.theme-switch {
  background: white;
  color: black;
  padding: 0.5rem 1rem;
  border: 1px solid #ccc;

  @media (prefers-color-scheme: dark) {
    background: #333;
    color: white;
    border-color: #555;
  }

  &:hover {
    opacity: 0.8;

    @media (prefers-color-scheme: dark) {
      opacity: 0.9;
    }
  }
}
```

### 印刷スタイル

```css
.article {
  font-size: 1rem;
  color: #333;

  @media print {
    font-size: 12pt;
    color: black;
  }

  .sidebar {
    display: block;

    @media print {
      display: none;
    }
  }

  a {
    color: blue;
    text-decoration: none;

    @media print {
      color: black;
      text-decoration: underline;

      &::after {
        content: ' (' attr(href) ')';
      }
    }
  }
}
```

## 6. Sassからの移行

Sassで書かれたコードをネイティブCSSに移行する際のポイントを解説します。

### 基本的なネスティング

```scss
/* Sass */
.nav {
  background: white;

  ul {
    list-style: none;
  }

  li {
    display: inline-block;
  }
}
```

```css
/* ネイティブCSS（同じ） */
.nav {
  background: white;

  ul {
    list-style: none;
  }

  li {
    display: inline-block;
  }
}
```

### 変数

```scss
/* Sass */
$primary-color: blue;
$spacing: 1rem;

.button {
  background: $primary-color;
  padding: $spacing;
}
```

```css
/* ネイティブCSS（CSS Custom Properties） */
:root {
  --primary-color: blue;
  --spacing: 1rem;
}

.button {
  background: var(--primary-color);
  padding: var(--spacing);
}
```

### Mixins → CSS機能への置き換え

```scss
/* Sass Mixin */
@mixin flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

.container {
  @include flex-center;
}
```

```css
/* ネイティブCSS（再利用可能なクラス） */
.flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

.container {
  /* Tailwindのような方法 */
  @extend .flex-center; /* または class="container flex-center" */
}
```

### 関数

```scss
/* Sass */
@function calculate-spacing($multiplier) {
  @return $base-spacing * $multiplier;
}

.element {
  margin: calculate-spacing(2);
}
```

```css
/* ネイティブCSS（calc） */
:root {
  --base-spacing: 1rem;
}

.element {
  margin: calc(var(--base-spacing) * 2);
}
```

### @extend の代替

```scss
/* Sass */
.button {
  padding: 0.5rem 1rem;
  border: none;
}

.primary-button {
  @extend .button;
  background: blue;
  color: white;
}
```

```css
/* ネイティブCSS（複数クラス or :is()） */
.button,
.primary-button {
  padding: 0.5rem 1rem;
  border: none;
}

.primary-button {
  background: blue;
  color: white;
}

/* または :is() を使用 */
:is(.button, .primary-button) {
  padding: 0.5rem 1rem;
  border: none;
}
```

## 7. ブラウザサポート

### 現在のサポート状況（2026年2月時点）

- **Chrome/Edge**: 112+ (2023年4月〜)
- **Safari**: 16.5+ (2023年5月〜)
- **Firefox**: 117+ (2023年8月〜)

### PostCSSによるポリフィル

```bash
npm install postcss postcss-nesting
```

```javascript
// postcss.config.js
export default {
  plugins: {
    'postcss-nesting': {}
  }
};
```

### フィーチャー検出

```css
/* CSS Nestingがサポートされている場合 */
@supports (selector(&)) {
  .card {
    padding: 1rem;

    &:hover {
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
  }
}

/* サポートされていない場合のフォールバック */
@supports not (selector(&)) {
  .card {
    padding: 1rem;
  }

  .card:hover {
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
}
```

## 8. 実践パターン集

### フォームスタイリング

```css
.form {
  max-width: 500px;
  margin: 0 auto;

  .form-group {
    margin-bottom: 1rem;

    label {
      display: block;
      margin-bottom: 0.25rem;
      font-weight: 500;
    }

    input,
    textarea,
    select {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 4px;

      &:focus {
        outline: none;
        border-color: blue;
        box-shadow: 0 0 0 3px rgba(0, 0, 255, 0.1);
      }

      &:invalid {
        border-color: red;
      }

      &:disabled {
        background: #f5f5f5;
        cursor: not-allowed;
      }
    }

    .error-message {
      color: red;
      font-size: 0.875rem;
      margin-top: 0.25rem;
      display: none;

      .form-group:has(input:invalid) & {
        display: block;
      }
    }
  }

  .form-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
  }
}
```

### カードコンポーネント

```css
.card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  .card-image {
    width: 100%;
    height: 200px;
    object-fit: cover;
  }

  .card-body {
    padding: 1.5rem;

    .card-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #333;
    }

    .card-description {
      color: #666;
      line-height: 1.6;
      margin-bottom: 1rem;
    }

    .card-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.875rem;
      color: #999;

      .meta-item {
        display: flex;
        align-items: center;
        gap: 0.25rem;

        svg {
          width: 16px;
          height: 16px;
        }
      }
    }
  }

  .card-footer {
    padding: 1rem 1.5rem;
    background: #f9f9f9;
    border-top: 1px solid #e0e0e0;

    .button {
      width: 100%;
    }
  }

  /* バリエーション */
  &.card-horizontal {
    display: flex;

    .card-image {
      width: 40%;
      height: auto;
    }

    .card-body {
      width: 60%;
    }
  }

  &.card-featured {
    border-color: gold;
    border-width: 2px;

    .card-title::before {
      content: '⭐ ';
    }
  }
}
```

### ナビゲーションメニュー

```css
.nav {
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;

  .nav-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .nav-logo {
    font-size: 1.5rem;
    font-weight: bold;
    color: #333;
    text-decoration: none;

    &:hover {
      color: blue;
    }
  }

  .nav-menu {
    display: flex;
    gap: 2rem;
    list-style: none;
    margin: 0;
    padding: 0;

    @media (max-width: 768px) {
      display: none;

      &.open {
        display: flex;
        flex-direction: column;
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        padding: 1rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
    }

    .nav-item {
      position: relative;

      .nav-link {
        color: #333;
        text-decoration: none;
        padding: 1rem 0;
        display: block;
        transition: color 0.2s;

        &:hover {
          color: blue;
        }

        &.active {
          color: blue;
          font-weight: 600;

          &::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: blue;
          }
        }
      }

      /* ドロップダウンメニュー */
      .dropdown {
        display: none;
        position: absolute;
        top: 100%;
        left: 0;
        background: white;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        border-radius: 4px;
        min-width: 200px;
        padding: 0.5rem 0;

        .dropdown-item {
          padding: 0.5rem 1rem;
          color: #333;
          text-decoration: none;
          display: block;

          &:hover {
            background: #f5f5f5;
          }
        }
      }

      &:hover .dropdown {
        display: block;
      }
    }
  }

  .nav-toggle {
    display: none;
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;

    @media (max-width: 768px) {
      display: block;
    }
  }
}
```

### グリッドレイアウト

```css
.grid-container {
  display: grid;
  gap: 2rem;
  padding: 2rem;

  /* デフォルト: 1カラム */
  grid-template-columns: 1fr;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (min-width: 1440px) {
    grid-template-columns: repeat(4, 1fr);
  }

  .grid-item {
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    transition: all 0.3s;

    &:hover {
      transform: scale(1.02);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    /* フィーチャーアイテムは2倍の幅 */
    &.featured {
      @media (min-width: 768px) {
        grid-column: span 2;
      }
    }

    /* ワイドアイテムは全幅 */
    &.wide {
      @media (min-width: 768px) {
        grid-column: 1 / -1;
      }
    }
  }
}
```

### モーダルダイアログ

```css
.modal {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 1000;

  &.open {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    cursor: pointer;

    &:hover {
      background: rgba(0, 0, 0, 0.6);
    }
  }

  .modal-content {
    position: relative;
    background: white;
    border-radius: 8px;
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow: auto;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);

    @media (prefers-reduced-motion: no-preference) {
      animation: modal-appear 0.3s ease-out;
    }

    .modal-header {
      padding: 1.5rem;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: center;

      .modal-title {
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0;
      }

      .modal-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;

        &:hover {
          background: #f5f5f5;
        }
      }
    }

    .modal-body {
      padding: 1.5rem;
    }

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #e0e0e0;
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }
  }
}

@keyframes modal-appear {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
```

## パフォーマンスへの影響

CSS Nestingは、ビルド時ではなくブラウザがネストを解決するため、パフォーマンスへの影響を考慮する必要があります。

### ベストプラクティス

```css
/* 良い例: 適度なネスト */
.component {
  padding: 1rem;

  .title {
    font-size: 1.5rem;
  }

  .description {
    color: gray;
  }
}

/* 避けるべき例: 過度なネスト */
.component {
  .section {
    .container {
      .wrapper {
        .item {
          .content {
            /* 深すぎる！ */
          }
        }
      }
    }
  }
}
```

---

## 関連記事

- [プログラミングスクール比較2026年版｜現役エンジニアが選ぶ厳選8校](/blog/2026-03-08-programming-school-comparison-2026)
- [エンジニア転職完全ガイド2026](/blog/2026-03-09-engineer-career-change-guide-2026)

## まとめ

CSS Nestingにより、以下のメリットが得られます。

1. **可読性の向上**: 関連するスタイルをグループ化できる
2. **保守性の向上**: セレクタの重複を減らし、変更が容易に
3. **ビルドツール不要**: ネイティブ機能なので、Sass/Lessが不要
4. **ブラウザとの互換性**: 標準仕様なので、将来的に安定
5. **@scopeとの組み合わせ**: より強力なカプセル化が可能

ただし、以下の点に注意が必要です。

- 過度なネストは避ける（3〜4階層まで）
- ブラウザサポートを確認（古いブラウザにはPostCSSでポリフィル）
- パフォーマンスへの影響を考慮

CSS Nestingは、モダンなWeb開発において必須の機能となりつつあります。Sassからの移行を検討している方も、新規プロジェクトで導入を検討している方も、ぜひ活用してみてください。

## 参考リンク

- [CSS Nesting Module Specification](https://www.w3.org/TR/css-nesting-1/)
- [MDN: CSS Nesting](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_nesting)
- [Can I Use: CSS Nesting](https://caniuse.com/css-nesting)

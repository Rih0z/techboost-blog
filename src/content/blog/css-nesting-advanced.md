---
title: "CSSネスティング高度なテクニック集"
description: "CSS Nestingの基本から高度なテクニックまで、実践的なパターンとベストプラクティスを解説します。レスポンシブデザイン、状態管理、アニメーションでのネストの活用法を学びます。"
pubDate: "2025-02-05"
tags: ['CSS', 'フロントエンド']
heroImage: '../../assets/thumbnails/css-nesting-advanced.jpg'
---
## CSSネスティングとは

CSS Nestingは、Sassなどのプリプロセッサで人気だった機能がネイティブCSSでも使えるようになった仕様です。セレクタをネストすることで、より読みやすく保守性の高いスタイルを記述できます。

2023年以降、主要なブラウザがネイティブCSSネスティングをサポートし始め、2025年現在では広く使える機能となっています。

### ネスティングの基本構文

従来のCSS:

```css
.card {
  padding: 1rem;
  border: 1px solid #ccc;
}

.card h2 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.card p {
  color: #666;
}

.card:hover {
  border-color: #999;
}
```

ネスティングを使用:

```css
.card {
  padding: 1rem;
  border: 1px solid #ccc;

  & h2 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
  }

  & p {
    color: #666;
  }

  &:hover {
    border-color: #999;
  }
}
```

`&`記号は親セレクタへの参照を表します。

## 高度なネスティングパターン

### 1. BEM記法とネスティングの組み合わせ

BEM（Block Element Modifier）とネスティングを組み合わせると、コンポーネントの構造が明確になります:

```css
.button {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.25rem;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;

  /* Element */
  &__icon {
    margin-right: 0.5rem;

    &--left {
      margin-right: 0.5rem;
      margin-left: 0;
    }

    &--right {
      margin-right: 0;
      margin-left: 0.5rem;
    }
  }

  &__text {
    font-weight: 500;
  }

  /* Modifier */
  &--primary {
    background-color: #007bff;
    color: white;

    &:hover {
      background-color: #0056b3;
    }

    &:active {
      background-color: #004085;
    }

    &:disabled {
      background-color: #ccc;
      cursor: not-allowed;
    }
  }

  &--secondary {
    background-color: #6c757d;
    color: white;

    &:hover {
      background-color: #545b62;
    }
  }

  &--outline {
    background-color: transparent;
    border: 2px solid currentColor;

    &.button--primary {
      color: #007bff;
      border-color: #007bff;

      &:hover {
        background-color: #007bff;
        color: white;
      }
    }
  }

  &--large {
    padding: 0.75rem 1.5rem;
    font-size: 1.125rem;
  }

  &--small {
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
  }
}
```

### 2. メディアクエリのネスティング

メディアクエリもネストできるため、レスポンシブデザインが書きやすくなります:

```css
.container {
  width: 100%;
  padding: 1rem;

  @media (min-width: 768px) {
    padding: 2rem;
    max-width: 720px;
    margin: 0 auto;
  }

  @media (min-width: 1024px) {
    max-width: 960px;
    padding: 3rem;
  }

  @media (min-width: 1280px) {
    max-width: 1200px;
  }
}

.grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }

  & > .grid__item {
    background: white;
    padding: 1.5rem;
    border-radius: 0.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

    @media (min-width: 768px) {
      padding: 2rem;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
      }
    }
  }
}
```

### 3. 複雑な状態管理

フォームやインタラクティブなコンポーネントでの状態管理:

```css
.input-group {
  position: relative;
  margin-bottom: 1.5rem;

  & label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #333;
    transition: color 0.2s;
  }

  & input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #ddd;
    border-radius: 0.25rem;
    font-size: 1rem;
    transition: all 0.2s;

    &:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);

      & + .input-group__helper {
        color: #007bff;
      }
    }

    &:disabled {
      background-color: #f5f5f5;
      cursor: not-allowed;

      & ~ label {
        color: #999;
      }
    }

    &[aria-invalid="true"] {
      border-color: #dc3545;

      &:focus {
        box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
      }
    }
  }

  &__helper {
    margin-top: 0.25rem;
    font-size: 0.875rem;
    color: #666;
  }

  &__error {
    margin-top: 0.25rem;
    font-size: 0.875rem;
    color: #dc3545;
    display: none;
  }

  &--error {
    & label {
      color: #dc3545;
    }

    & .input-group__error {
      display: block;
    }

    & .input-group__helper {
      display: none;
    }
  }

  &--success {
    & input {
      border-color: #28a745;

      &:focus {
        box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.1);
      }
    }

    &::after {
      content: "✓";
      position: absolute;
      right: 0.75rem;
      top: 2.75rem;
      color: #28a745;
      font-weight: bold;
    }
  }
}
```

### 4. アニメーションとトランジション

ネスティングを使ったアニメーションの管理:

```css
.notification {
  position: fixed;
  top: 1rem;
  right: 1rem;
  padding: 1rem 1.5rem;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateX(calc(100% + 2rem));
  transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);

  &--visible {
    transform: translateX(0);
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  &__title {
    font-weight: 600;
    font-size: 1rem;
  }

  &__close {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    opacity: 0.6;
    transition: opacity 0.2s;

    &:hover {
      opacity: 1;
    }
  }

  &__body {
    color: #666;
    font-size: 0.875rem;
  }

  /* タイプ別のスタイル */
  &--success {
    border-left: 4px solid #28a745;

    & .notification__title {
      color: #28a745;
    }
  }

  &--error {
    border-left: 4px solid #dc3545;

    & .notification__title {
      color: #dc3545;
    }
  }

  &--warning {
    border-left: 4px solid #ffc107;

    & .notification__title {
      color: #e0a800;
    }
  }

  &--info {
    border-left: 4px solid #17a2b8;

    & .notification__title {
      color: #17a2b8;
    }
  }

  /* アニメーション */
  @keyframes slideIn {
    from {
      transform: translateX(calc(100% + 2rem));
    }
    to {
      transform: translateX(0);
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(calc(100% + 2rem));
    }
  }

  &--entering {
    animation: slideIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }

  &--exiting {
    animation: slideOut 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }
}
```

### 5. テーマとカラースキーム

ダークモードなどのテーマ切り替え:

```css
:root {
  --color-bg: #ffffff;
  --color-text: #333333;
  --color-primary: #007bff;
  --color-border: #dddddd;
  --shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  @media (prefers-color-scheme: dark) {
    --color-bg: #1a1a1a;
    --color-text: #e0e0e0;
    --color-primary: #4da3ff;
    --color-border: #444444;
    --shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
}

.theme-card {
  background: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  padding: 2rem;
  border-radius: 0.5rem;
  box-shadow: var(--shadow);
  transition: all 0.3s;

  &__header {
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--color-border);
  }

  &__title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-primary);
    margin-bottom: 0.5rem;
  }

  &__link {
    color: var(--color-primary);
    text-decoration: none;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.8;
      text-decoration: underline;
    }
  }

  /* 明示的なテーマ指定 */
  &[data-theme="light"] {
    --color-bg: #ffffff;
    --color-text: #333333;
    --color-primary: #007bff;
    --color-border: #dddddd;
  }

  &[data-theme="dark"] {
    --color-bg: #1a1a1a;
    --color-text: #e0e0e0;
    --color-primary: #4da3ff;
    --color-border: #444444;
  }
}
```

### 6. コンテナクエリとの組み合わせ

CSS Container Queriesとネスティングを組み合わせた例:

```css
.card-container {
  container-type: inline-size;
  container-name: card;
  width: 100%;
}

.responsive-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 0.5rem;

  @container card (min-width: 400px) {
    flex-direction: row;
    align-items: center;
    gap: 1.5rem;
    padding: 1.5rem;
  }

  @container card (min-width: 600px) {
    gap: 2rem;
    padding: 2rem;
  }

  &__image {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    border-radius: 0.25rem;

    @container card (min-width: 400px) {
      width: 150px;
      aspect-ratio: 1;
    }

    @container card (min-width: 600px) {
      width: 200px;
    }
  }

  &__content {
    flex: 1;
  }

  &__title {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;

    @container card (min-width: 600px) {
      font-size: 1.5rem;
      margin-bottom: 0.75rem;
    }
  }

  &__description {
    font-size: 0.875rem;
    color: #666;
    line-height: 1.5;

    @container card (min-width: 600px) {
      font-size: 1rem;
    }
  }
}
```

### 7. 擬似要素を使った装飾

複雑な装飾パターンをネスティングで管理:

```css
.decorated-heading {
  position: relative;
  padding-bottom: 1rem;
  margin-bottom: 2rem;
  font-size: 2rem;
  font-weight: 700;

  &::before {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    width: 60px;
    height: 4px;
    background: linear-gradient(90deg, #007bff, #00d4ff);
    border-radius: 2px;
  }

  &::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 1px;
    background: #e0e0e0;
  }

  &--center {
    text-align: center;

    &::before {
      left: 50%;
      transform: translateX(-50%);
    }
  }

  &--accent {
    &::before {
      width: 100%;
      height: 6px;
      background: linear-gradient(90deg,
        #ff6b6b 0%,
        #4ecdc4 25%,
        #45b7d1 50%,
        #f7dc6f 75%,
        #ff6b6b 100%
      );
      animation: gradientShift 3s ease infinite;
    }

    @keyframes gradientShift {
      0%, 100% {
        background-position: 0% 50%;
      }
      50% {
        background-position: 100% 50%;
      }
    }
  }
}
```

### 8. フォーカス管理とアクセシビリティ

キーボードナビゲーションとフォーカス表示:

```css
.nav-menu {
  display: flex;
  gap: 0.5rem;
  list-style: none;
  padding: 0;
  margin: 0;

  & li {
    position: relative;
  }

  &__link {
    display: block;
    padding: 0.75rem 1rem;
    color: #333;
    text-decoration: none;
    border-radius: 0.25rem;
    transition: all 0.2s;
    position: relative;

    &:hover {
      background-color: #f5f5f5;
    }

    &:focus-visible {
      outline: 2px solid #007bff;
      outline-offset: 2px;
      background-color: #e7f3ff;
    }

    &:active {
      transform: scale(0.98);
    }

    &[aria-current="page"] {
      color: #007bff;
      font-weight: 600;

      &::after {
        content: "";
        position: absolute;
        bottom: 0;
        left: 1rem;
        right: 1rem;
        height: 3px;
        background: #007bff;
        border-radius: 2px 2px 0 0;
      }
    }
  }

  /* キーボードナビゲーション時のみフォーカス表示 */
  @media (prefers-reduced-motion: no-preference) {
    &__link:focus-visible {
      animation: focusPulse 0.3s ease-out;
    }

    @keyframes focusPulse {
      0% {
        box-shadow: 0 0 0 0 rgba(0, 123, 255, 0.4);
      }
      100% {
        box-shadow: 0 0 0 8px rgba(0, 123, 255, 0);
      }
    }
  }
}
```

## ネスティングのベストプラクティス

### 1. 深さは3-4レベルまで

```css
/* 良い例 */
.component {
  & .element {
    & .sub-element {
      /* OK: 3レベル */
    }
  }
}

/* 避けるべき */
.component {
  & .level1 {
    & .level2 {
      & .level3 {
        & .level4 {
          & .level5 {
            /* NG: 深すぎる */
          }
        }
      }
    }
  }
}
```

### 2. 論理的なグループ化

```css
.product-card {
  /* 基本スタイル */
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 0.5rem;

  /* 子要素 */
  &__image { }
  &__content { }
  &__price { }
  &__actions { }

  /* 状態 */
  &:hover { }
  &:focus-within { }

  /* バリエーション */
  &--featured { }
  &--sale { }

  /* レスポンシブ */
  @media (min-width: 768px) { }
}
```

### 3. 変数スコープの活用

```css
.button {
  --button-padding: 0.5rem 1rem;
  --button-bg: #007bff;
  --button-color: white;

  padding: var(--button-padding);
  background: var(--button-bg);
  color: var(--button-color);
  border: none;
  border-radius: 0.25rem;

  &--large {
    --button-padding: 0.75rem 1.5rem;
  }

  &--small {
    --button-padding: 0.25rem 0.5rem;
  }

  &--outline {
    --button-bg: transparent;
    --button-color: #007bff;
    border: 2px solid var(--button-color);
  }
}
```

## パフォーマンスとブラウザサポート

### ブラウザサポート状況（2025年時点）

- Chrome/Edge: 112+
- Firefox: 117+
- Safari: 16.5+

### フォールバック戦略

古いブラウザをサポートする必要がある場合:

```css
/* フォールバック */
.card { }
.card h2 { }
.card p { }

/* ネスティングサポートがある場合 */
@supports (selector(&)) {
  .card {
    & h2 { }
    & p { }
  }
}
```

## まとめ

CSSネスティングは、コードの可読性と保守性を大幅に向上させる強力な機能です。以下のポイントを押さえて活用しましょう:

- **適度な深さ**: 3-4レベルまでに抑える
- **論理的な構造**: 関連するスタイルをグループ化
- **メディアクエリの統合**: コンポーネント内でレスポンシブを管理
- **状態管理**: 擬似クラスや属性セレクタを効果的に使用
- **CSS変数との組み合わせ**: スコープ付き変数で柔軟なテーマ管理

ネイティブCSSネスティングにより、プリプロセッサなしでも高度なスタイリングが可能になりました。ぜひプロジェクトで活用してみてください。

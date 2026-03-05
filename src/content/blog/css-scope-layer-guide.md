---
title: 'CSS @scope と @layer実践: スタイルのカプセル化とカスケード制御'
description: 'CSS最新機能@scopeと@layerを使った実践的なスタイル管理手法を解説。コンポーネント単位のカプセル化、優先順位制御、設計パターンまで網羅。'
pubDate: 'Dec 03 2025'
updatedDate: 'Dec 03 2025'
tags: ['CSS', 'Web Standards', 'Frontend', 'Design System', 'プログラミング']
category: 'Frontend'
---

# CSS @scope と @layer実践: スタイルのカプセル化とカスケード制御

CSS @scopeと@layerは、モダンなWeb開発におけるスタイル管理の課題を解決する強力な機能です。この記事では、従来のCSS設計手法との違い、実践的な使用パターン、パフォーマンス最適化まで詳しく解説します。

## CSS @scopeとは

@scopeは、スタイルのスコープを特定のDOM範囲に限定する機能です。これにより、コンポーネント単位でのスタイル分離が可能になります。

### 従来の問題

```css
/* 従来のCSS - グローバル汚染のリスク */
.card {
  padding: 1rem;
}

.card .title {
  font-size: 1.5rem;
  color: #333;
}

.card .button {
  background: blue; /* 他のbuttonにも影響する可能性 */
}
```

### @scopeによる解決

```css
/* @scope でカプセル化 */
@scope (.card) {
  .title {
    font-size: 1.5rem;
    color: #333;
  }

  .button {
    background: blue; /* .card 内のbuttonのみに適用 */
  }
}
```

## @scopeの基本構文

### 基本的な使い方

```css
@scope (scope-root) {
  /* スコープ内のスタイル */
}
```

```css
/* 実例: カードコンポーネント */
@scope (.product-card) {
  .image {
    width: 100%;
    aspect-ratio: 16/9;
    object-fit: cover;
  }

  .title {
    font-size: 1.25rem;
    font-weight: bold;
    margin-top: 0.5rem;
  }

  .price {
    color: #e63946;
    font-size: 1.5rem;
  }

  .button {
    background: #2a9d8f;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
  }
}
```

### スコープ境界の指定

```css
/* to() で下限境界を指定 */
@scope (.article) to (.exclude) {
  p {
    line-height: 1.6;
    /* .article 内だが .exclude 内は除外 */
  }
}
```

```html
<article class="article">
  <p>このパラグラフにスタイル適用</p>

  <div class="exclude">
    <p>このパラグラフは除外される</p>
  </div>

  <p>このパラグラフにスタイル適用</p>
</article>
```

### 複数の境界条件

```css
@scope (.container) to (.nested-container, .modal) {
  .button {
    /* .container内だが.nested-containerと.modal内は除外 */
    background: blue;
  }
}
```

## @scopeの実践パターン

### コンポーネントスタイルの分離

```css
/* ボタンコンポーネント */
@scope (.btn) {
  /* ベーススタイル */
  :scope {
    display: inline-block;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    font-size: 1rem;
  }

  /* バリアント */
  &.primary {
    background: #007bff;
    color: white;
  }

  &.secondary {
    background: #6c757d;
    color: white;
  }

  /* 状態 */
  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
```

### ネストされたコンポーネント

```css
/* 親コンポーネント: カード */
@scope (.card) {
  :scope {
    border: 1px solid #ddd;
    border-radius: 0.5rem;
    padding: 1rem;
  }

  .header {
    border-bottom: 1px solid #eee;
    padding-bottom: 0.5rem;
    margin-bottom: 1rem;
  }

  .body {
    padding: 0.5rem 0;
  }
}

/* 子コンポーネント: カード内のフォーム */
@scope (.card .form) {
  .input {
    width: 100%;
    padding: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .submit-button {
    background: #28a745;
    color: white;
  }
}
```

### テーマ切り替え

```css
/* ライトテーマ */
@scope ([data-theme="light"] .panel) {
  :scope {
    background: white;
    color: #333;
  }

  .header {
    background: #f8f9fa;
    border-bottom: 1px solid #dee2e6;
  }
}

/* ダークテーマ */
@scope ([data-theme="dark"] .panel) {
  :scope {
    background: #1a1a1a;
    color: #f0f0f0;
  }

  .header {
    background: #2d2d2d;
    border-bottom: 1px solid #404040;
  }
}
```

## CSS @layerとは

@layerは、CSSのカスケード層を明示的に制御する機能です。スタイルの優先順位を詳細度ではなく、レイヤーの順序で管理できます。

### レイヤーなしの問題

```css
/* 詳細度の戦い */
.button {
  background: blue; /* 詳細度: 0,1,0 */
}

.primary.button {
  background: green; /* 詳細度: 0,2,0 - こちらが勝つ */
}

.button.button {
  background: red; /* 詳細度を上げるハック */
}
```

### @layerによる解決

```css
/* レイヤー定義 */
@layer reset, base, components, utilities;

@layer reset {
  * {
    margin: 0;
    padding: 0;
  }
}

@layer base {
  .button {
    background: blue;
  }
}

@layer components {
  .button {
    /* base層より優先される（詳細度に関係なく） */
    background: green;
  }
}

@layer utilities {
  .bg-red {
    /* 最優先 */
    background: red !important;
  }
}
```

## @layerの実践パターン

### デザインシステムの階層化

```css
/* レイヤー定義（順序が重要） */
@layer reset, tokens, base, layouts, components, utilities, overrides;

/* リセットCSS */
@layer reset {
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    font-family: system-ui, sans-serif;
  }
}

/* デザイントークン */
@layer tokens {
  :root {
    --color-primary: #007bff;
    --color-secondary: #6c757d;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 2rem;
  }
}

/* ベーススタイル */
@layer base {
  h1, h2, h3 {
    margin-top: 0;
  }

  a {
    color: var(--color-primary);
    text-decoration: none;
  }
}

/* レイアウト */
@layer layouts {
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 var(--spacing-md);
  }

  .grid {
    display: grid;
    gap: var(--spacing-md);
  }
}

/* コンポーネント */
@layer components {
  .button {
    padding: var(--spacing-sm) var(--spacing-md);
    border: none;
    border-radius: 0.25rem;
    background: var(--color-primary);
    color: white;
    cursor: pointer;
  }

  .card {
    border: 1px solid #ddd;
    border-radius: 0.5rem;
    padding: var(--spacing-md);
  }
}

/* ユーティリティ */
@layer utilities {
  .text-center {
    text-align: center;
  }

  .mt-4 {
    margin-top: var(--spacing-lg);
  }
}
```

### フレームワークとの統合

```css
/* Tailwind CSSとカスタムスタイルの統合 */
@import "tailwindcss/base" layer(framework.base);
@import "tailwindcss/components" layer(framework.components);
@import "tailwindcss/utilities" layer(framework.utilities);

@layer custom.components {
  .custom-button {
    /* Tailwindのcomponentsより優先される */
    @apply px-4 py-2 bg-blue-500 text-white rounded;
  }
}

@layer custom.utilities {
  .custom-shadow {
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  }
}
```

### レスポンシブデザイン

```css
@layer base {
  .container {
    width: 100%;
    padding: 1rem;
  }
}

@layer responsive {
  @media (min-width: 768px) {
    .container {
      max-width: 768px;
      margin: 0 auto;
    }
  }

  @media (min-width: 1024px) {
    .container {
      max-width: 1024px;
    }
  }
}
```

## @scopeと@layerの組み合わせ

### 高度なコンポーネント設計

```css
@layer components {
  /* カードコンポーネントのスコープ化 */
  @scope (.card) {
    :scope {
      border: 1px solid #ddd;
      border-radius: 0.5rem;
      padding: 1rem;
      background: white;
    }

    .header {
      font-size: 1.5rem;
      font-weight: bold;
      margin-bottom: 0.5rem;
    }

    .content {
      line-height: 1.6;
    }

    /* ネストされたボタンのスタイル */
    .button {
      background: #007bff;
      color: white;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 0.25rem;
    }
  }
}

@layer utilities {
  /* ユーティリティは常に最優先 */
  @scope (.card) {
    .text-danger {
      color: #dc3545 !important;
    }
  }
}
```

### テーマシステム

```css
@layer themes {
  @scope ([data-theme="light"]) {
    :scope {
      --bg-primary: #ffffff;
      --text-primary: #000000;
      --border-color: #e0e0e0;
    }

    .panel {
      background: var(--bg-primary);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
    }
  }

  @scope ([data-theme="dark"]) {
    :scope {
      --bg-primary: #1a1a1a;
      --text-primary: #ffffff;
      --border-color: #404040;
    }

    .panel {
      background: var(--bg-primary);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
    }
  }
}
```

## パフォーマンス最適化

### レイヤーの分割読み込み

```css
/* クリティカルCSS（インライン） */
@layer critical {
  body {
    margin: 0;
    font-family: sans-serif;
  }

  .hero {
    height: 100vh;
    display: flex;
    align-items: center;
  }
}

/* 非クリティカルCSS（遅延読み込み） */
@layer deferred {
  .footer {
    background: #333;
    color: white;
    padding: 2rem;
  }
}
```

### スコープの最適化

```css
/* 悪い例: 過度なネスト */
@scope (.container) {
  @scope (.section) {
    @scope (.card) {
      /* 3階層のネスト - パフォーマンス低下 */
      .title {
        font-size: 1.5rem;
      }
    }
  }
}

/* 良い例: フラットなスコープ */
@scope (.card) {
  .title {
    font-size: 1.5rem;
  }
}
```

## 実世界のユースケース

### SPAコンポーネントライブラリ

```css
/* React/Vueコンポーネントのスタイル分離 */
@layer components {
  @scope (.TodoList) {
    :scope {
      list-style: none;
      padding: 0;
    }

    .TodoItem {
      display: flex;
      align-items: center;
      padding: 0.5rem;
      border-bottom: 1px solid #eee;
    }

    .TodoItem input[type="checkbox"] {
      margin-right: 0.5rem;
    }

    .TodoItem.completed {
      opacity: 0.6;
      text-decoration: line-through;
    }
  }
}
```

### CMSテーマ

```css
@layer theme {
  /* ブログ記事のスタイル */
  @scope (.article-content) {
    h1, h2, h3 {
      margin-top: 2rem;
      margin-bottom: 1rem;
    }

    p {
      line-height: 1.8;
      margin-bottom: 1rem;
    }

    /* コードブロックは除外 */
    @scope to (.code-block) {
      pre {
        /* このスコープでは適用されない */
      }
    }

    img {
      max-width: 100%;
      height: auto;
    }

    blockquote {
      border-left: 4px solid #007bff;
      padding-left: 1rem;
      font-style: italic;
    }
  }
}
```

## ブラウザサポートと Polyfill

### サポート状況（2026年1月時点）

- **@layer**: Chrome 99+, Edge 99+, Firefox 97+, Safari 15.4+
- **@scope**: Chrome 118+, Edge 118+, Safari 17.4+ (Firefoxは開発中)

### フォールバック戦略

```css
/* @layerをサポートしていない場合のフォールバック */
@supports not at-rule(@layer) {
  /* 従来のCSSで記述 */
  .button {
    background: blue;
  }
}

@supports at-rule(@layer) {
  @layer components {
    .button {
      background: blue;
    }
  }
}
```

### PostCSS Plugin

```javascript
// postcss.config.js
module.exports = {
  plugins: [
    require('@csstools/postcss-cascade-layers'),
    require('postcss-preset-env')({
      features: {
        'cascade-layers': true
      }
    })
  ]
}
```

## まとめ

### @scopeの利点

1. **カプセル化** - コンポーネント単位でスタイルを分離
2. **詳細度の簡素化** - クラス名の衝突を回避
3. **保守性向上** - スタイルの影響範囲が明確

### @layerの利点

1. **優先順位制御** - 詳細度に依存しない予測可能なカスケード
2. **デザインシステム** - 明確な階層構造
3. **フレームワーク統合** - サードパーティCSSとの共存

### 使い分けの指針

- **@scope**: コンポーネント単位のスタイル分離
- **@layer**: プロジェクト全体のスタイル優先順位管理
- **組み合わせ**: 大規模アプリケーションのスタイルアーキテクチャ

@scopeと@layerは、CSS設計の未来を形作る重要な機能です。適切に活用することで、保守性の高いスタイルシートを構築できます。

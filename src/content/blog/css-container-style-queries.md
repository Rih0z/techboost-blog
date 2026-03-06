---
title: 'CSS Container Style Queries実践ガイド'
description: '@container style()を使ったスタイルベースのコンテナクエリ。コンポーネントテーマ切替、条件付きスタイリング、デザインシステムへの応用を実例で解説。CSS・Container Queries・Style Queriesに関する実践情報。'
pubDate: '2025-02-06'
tags: ['CSS', 'Container Queries', 'Style Queries', 'Design System', 'プログラミング']
---
# CSS Container Style Queries実践ガイド

CSS Container Style Queries（スタイルクエリ）は、親要素の**サイズ**ではなく**スタイルプロパティ**に基づいて子要素のスタイルを変更できる革新的な機能です。

本ガイドでは、`@container style()`の基本から実践的な使い方まで、実例とともに解説します。

## Container Style Queriesとは

### サイズクエリとの違い

```css
/* サイズクエリ（従来） */
.card-container {
  container-type: inline-size;
}

@container (min-width: 500px) {
  .card {
    display: grid;
  }
}

/* スタイルクエリ（新機能） */
.card-container {
  container-name: card;
  --theme: dark;
}

@container card style(--theme: dark) {
  .card {
    background: #1a1a1a;
    color: white;
  }
}
```

### 主な特徴

1. **カスタムプロパティベース** - CSS変数の値に基づいて条件分岐
2. **コンテキスト対応** - 親要素のスタイル状態に応じて変化
3. **ネスト可能** - 深い階層でも親のスタイルを参照可能
4. **動的テーマ切替** - JavaScriptなしでテーマ変更可能

## 基本的な使い方

### 1. コンテナの定義

```css
/* コンテナ名の定義 */
.theme-container {
  container-name: theme-box;
  --theme: light;
}

/* または省略形 */
.theme-container {
  container: theme-box / normal;
  --theme: light;
}
```

### 2. スタイルクエリの記述

```css
/* カスタムプロパティの値でクエリ */
@container theme-box style(--theme: dark) {
  .content {
    background: #1a1a1a;
    color: #ffffff;
  }

  .button {
    background: #333;
    border: 1px solid #555;
  }
}

@container theme-box style(--theme: light) {
  .content {
    background: #ffffff;
    color: #000000;
  }

  .button {
    background: #e0e0e0;
    border: 1px solid #ccc;
  }
}
```

## 実践的なパターン

### 1. テーマシステムの構築

```html
<!DOCTYPE html>
<html>
<head>
<style>
  /* テーマコンテナ */
  .theme-switcher {
    container-name: theme;
    --theme: light;
    padding: 2rem;
    transition: background 0.3s ease;
  }

  /* ライトテーマ */
  @container theme style(--theme: light) {
    .theme-switcher {
      background: #f5f5f5;
      color: #333;
    }

    .card {
      background: white;
      color: #333;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .button {
      background: #007bff;
      color: white;
    }

    .button:hover {
      background: #0056b3;
    }
  }

  /* ダークテーマ */
  @container theme style(--theme: dark) {
    .theme-switcher {
      background: #1a1a1a;
      color: #e0e0e0;
    }

    .card {
      background: #2a2a2a;
      color: #e0e0e0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
    }

    .button {
      background: #0d6efd;
      color: white;
    }

    .button:hover {
      background: #0a58ca;
    }
  }

  /* ハイコントラストテーマ */
  @container theme style(--theme: high-contrast) {
    .theme-switcher {
      background: black;
      color: yellow;
    }

    .card {
      background: black;
      color: yellow;
      border: 2px solid yellow;
    }

    .button {
      background: yellow;
      color: black;
      border: 2px solid yellow;
    }
  }

  /* 共通スタイル */
  .card {
    padding: 1.5rem;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .button {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;
  }

  .theme-controls {
    margin-bottom: 2rem;
    display: flex;
    gap: 1rem;
  }
</style>
</head>
<body>
  <div class="theme-switcher" id="container">
    <div class="theme-controls">
      <button class="button" onclick="setTheme('light')">Light</button>
      <button class="button" onclick="setTheme('dark')">Dark</button>
      <button class="button" onclick="setTheme('high-contrast')">High Contrast</button>
    </div>

    <div class="card">
      <h2>Card Title</h2>
      <p>This card adapts to the theme context automatically.</p>
      <button class="button">Action Button</button>
    </div>
  </div>

  <script>
    function setTheme(theme) {
      document.getElementById('container').style.setProperty('--theme', theme);
    }
  </script>
</body>
</html>
```

### 2. 状態ベースのスタイリング

```css
/* 状態コンテナ */
.form-container {
  container-name: form-state;
  --state: default;
}

/* デフォルト状態 */
@container form-state style(--state: default) {
  .input {
    border: 2px solid #ddd;
  }

  .submit-button {
    background: #007bff;
    cursor: pointer;
  }
}

/* 送信中状態 */
@container form-state style(--state: submitting) {
  .input {
    border: 2px solid #ccc;
    opacity: 0.6;
    pointer-events: none;
  }

  .submit-button {
    background: #6c757d;
    cursor: not-allowed;
  }

  .submit-button::after {
    content: " (Submitting...)";
  }
}

/* 成功状態 */
@container form-state style(--state: success) {
  .input {
    border: 2px solid #28a745;
  }

  .submit-button {
    background: #28a745;
  }

  .success-message {
    display: block;
    color: #28a745;
  }
}

/* エラー状態 */
@container form-state style(--state: error) {
  .input {
    border: 2px solid #dc3545;
  }

  .error-message {
    display: block;
    color: #dc3545;
  }
}
```

### 3. デザインバリアントシステム

```css
/* バリアントコンテナ */
.button-container {
  container-name: button-variant;
  --variant: primary;
  --size: medium;
}

/* プライマリバリアント */
@container button-variant style(--variant: primary) {
  .btn {
    background: #007bff;
    color: white;
    border: none;
  }

  .btn:hover {
    background: #0056b3;
  }
}

/* セカンダリバリアント */
@container button-variant style(--variant: secondary) {
  .btn {
    background: #6c757d;
    color: white;
    border: none;
  }

  .btn:hover {
    background: #5a6268;
  }
}

/* アウトラインバリアント */
@container button-variant style(--variant: outline) {
  .btn {
    background: transparent;
    color: #007bff;
    border: 2px solid #007bff;
  }

  .btn:hover {
    background: #007bff;
    color: white;
  }
}

/* サイズバリエーション */
@container button-variant style(--size: small) {
  .btn {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }
}

@container button-variant style(--size: medium) {
  .btn {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
  }
}

@container button-variant style(--size: large) {
  .btn {
    padding: 1rem 2rem;
    font-size: 1.125rem;
  }
}
```

### 4. アダプティブカードコンポーネント

```html
<style>
  /* カードコンテナ */
  .card-wrapper {
    container-name: card-context;
    --layout: standard;
    --emphasis: normal;
  }

  /* ベーススタイル */
  .adaptive-card {
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  /* 標準レイアウト */
  @container card-context style(--layout: standard) {
    .adaptive-card {
      display: flex;
      flex-direction: column;
    }

    .card-image {
      width: 100%;
      height: 200px;
      object-fit: cover;
    }
  }

  /* コンパクトレイアウト */
  @container card-context style(--layout: compact) {
    .adaptive-card {
      display: grid;
      grid-template-columns: 100px 1fr;
      gap: 1rem;
    }

    .card-image {
      width: 100px;
      height: 100px;
      object-fit: cover;
    }

    .card-title {
      font-size: 1rem;
    }
  }

  /* リストレイアウト */
  @container card-context style(--layout: list) {
    .adaptive-card {
      display: flex;
      align-items: center;
      padding: 1rem;
    }

    .card-image {
      width: 60px;
      height: 60px;
      object-fit: cover;
      margin-right: 1rem;
    }

    .card-title {
      font-size: 0.875rem;
      margin-bottom: 0;
    }

    .card-description {
      display: none;
    }
  }

  /* 強調表示 */
  @container card-context style(--emphasis: high) {
    .adaptive-card {
      border: 3px solid #007bff;
      box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
    }

    .card-title {
      color: #007bff;
      font-weight: bold;
    }
  }

  /* 警告表示 */
  @container card-context style(--emphasis: warning) {
    .adaptive-card {
      border-left: 4px solid #ffc107;
      background: #fffbea;
    }

    .card-title {
      color: #856404;
    }
  }
</style>

<div class="card-wrapper" style="--layout: standard; --emphasis: normal;">
  <div class="adaptive-card">
    <img src="image.jpg" alt="Card" class="card-image">
    <h3 class="card-title">Card Title</h3>
    <p class="card-description">Card description goes here.</p>
  </div>
</div>
```

### 5. ダイナミックグリッドシステム

```css
/* グリッドコンテナ */
.grid-container {
  container-name: grid-layout;
  --columns: 3;
  --gap: normal;
}

/* 1カラム */
@container grid-layout style(--columns: 1) {
  .grid {
    display: grid;
    grid-template-columns: 1fr;
  }
}

/* 2カラム */
@container grid-layout style(--columns: 2) {
  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 3カラム */
@container grid-layout style(--columns: 3) {
  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
  }
}

/* 4カラム */
@container grid-layout style(--columns: 4) {
  .grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
  }
}

/* 間隔バリエーション */
@container grid-layout style(--gap: tight) {
  .grid {
    gap: 0.5rem;
  }
}

@container grid-layout style(--gap: normal) {
  .grid {
    gap: 1rem;
  }
}

@container grid-layout style(--gap: spacious) {
  .grid {
    gap: 2rem;
  }
}
```

## JavaScriptとの連携

### 1. 動的テーマ切替

```javascript
// テーママネージャー
class ThemeManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId)
    this.currentTheme = 'light'
  }

  setTheme(theme) {
    this.container.style.setProperty('--theme', theme)
    this.currentTheme = theme
    localStorage.setItem('preferred-theme', theme)
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light'
    this.setTheme(newTheme)
  }

  loadPreferredTheme() {
    const saved = localStorage.getItem('preferred-theme')
    if (saved) {
      this.setTheme(saved)
    }
  }
}

// 使用例
const themeManager = new ThemeManager('app-container')
themeManager.loadPreferredTheme()

document.getElementById('theme-toggle').addEventListener('click', () => {
  themeManager.toggleTheme()
})
```

### 2. 状態管理との統合

```javascript
// Reactコンポーネント例
function FormWithState() {
  const [formState, setFormState] = useState('default')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormState('submitting')

    try {
      await submitForm(formData)
      setFormState('success')
    } catch (error) {
      setFormState('error')
    }
  }

  return (
    <div
      className="form-container"
      style={{ '--state': formState }}
    >
      <form onSubmit={handleSubmit}>
        <input className="input" type="text" />
        <button className="submit-button" type="submit">
          Submit
        </button>
        <p className="success-message">Success!</p>
        <p className="error-message">Error occurred</p>
      </form>
    </div>
  )
}
```

## デザインシステムへの応用

### トークンベースのデザインシステム

```css
/* デザイントークン */
:root {
  /* カラートークン */
  --color-primary: #007bff;
  --color-secondary: #6c757d;
  --color-success: #28a745;
  --color-danger: #dc3545;

  /* スペーシングトークン */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
}

/* コンポーネントコンテナ */
.component-container {
  container-name: component;
  --tone: neutral;
  --spacing: comfortable;
}

/* トーンバリエーション */
@container component style(--tone: primary) {
  .component {
    --accent-color: var(--color-primary);
  }
}

@container component style(--tone: success) {
  .component {
    --accent-color: var(--color-success);
  }
}

@container component style(--tone: danger) {
  .component {
    --accent-color: var(--color-danger);
  }
}

/* スペーシングバリエーション */
@container component style(--spacing: compact) {
  .component {
    --component-padding: var(--space-sm);
    --component-gap: var(--space-xs);
  }
}

@container component style(--spacing: comfortable) {
  .component {
    --component-padding: var(--space-md);
    --component-gap: var(--space-sm);
  }
}

@container component style(--spacing: spacious) {
  .component {
    --component-padding: var(--space-xl);
    --component-gap: var(--space-lg);
  }
}
```

## ブラウザサポートと代替案

### フィーチャー検出

```css
/* スタイルクエリ対応チェック */
@supports (container-name: test) and (not (container-type: inline-size)) {
  /* Style Queries対応ブラウザ */
  .theme-container {
    container-name: theme;
    --theme: light;
  }

  @container theme style(--theme: dark) {
    .content {
      background: #1a1a1a;
    }
  }
}

/* フォールバック */
@supports not ((container-name: test) and (not (container-type: inline-size))) {
  /* データ属性を使用 */
  [data-theme="dark"] .content {
    background: #1a1a1a;
  }
}
```

### ポリフィル代替案

```javascript
// スタイルクエリのポリフィル的実装
class StyleQueryPolyfill {
  constructor() {
    this.observers = new Map()
  }

  observe(container, customProperty, callback) {
    const observer = new MutationObserver(() => {
      const value = getComputedStyle(container)
        .getPropertyValue(customProperty)
        .trim()
      callback(value)
    })

    observer.observe(container, {
      attributes: true,
      attributeFilter: ['style'],
    })

    this.observers.set(container, observer)

    // 初回実行
    const initialValue = getComputedStyle(container)
      .getPropertyValue(customProperty)
      .trim()
    callback(initialValue)
  }
}

// 使用例
const polyfill = new StyleQueryPolyfill()
const container = document.querySelector('.theme-container')

polyfill.observe(container, '--theme', (theme) => {
  container.dataset.theme = theme
})
```

## まとめ

CSS Container Style Queriesは以下を実現します:

1. **スタイルベース条件分岐** - カスタムプロパティの値で条件分岐
2. **コンテキスト対応UI** - 親要素の状態に応じた柔軟なスタイリング
3. **デザインシステム構築** - トークンベースの一貫したデザイン
4. **JavaScript削減** - 多くのケースでJavaScriptが不要

Container Style Queriesは、特にデザインシステム、テーマシステム、状態管理において強力です。サイズクエリと組み合わせることで、真に柔軟でメンテナブルなコンポーネントを構築できます。

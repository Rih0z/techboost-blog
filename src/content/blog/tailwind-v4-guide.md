---
title: 'Tailwind CSS v4完全ガイド — CSS-first設定とパフォーマンス改善'
description: 'Tailwind CSS v4の新機能を徹底解説。CSS-first設定、高速化、新しいユーティリティクラス、移行方法まで網羅した実践ガイド。'
pubDate: 'Feb 05 2026'
tags: ['Tailwind CSS', 'CSS', 'Frontend', 'Styling', 'v4']
---

Tailwind CSS v4は、2026年にリリースされた大型アップデートです。CSS-first設定への移行、大幅なパフォーマンス改善、新しいユーティリティクラスなど、多くの革新的な変更が加えられました。この記事では、Tailwind CSS v4の全機能を実践的に解説します。

## Tailwind CSS v4の主な変更点

### 破壊的変更と新機能

1. **CSS-first設定**: `tailwind.config.js`から`@tailwind`ディレクティブへ
2. **高速ビルド**: Rust製のエンジンで10倍高速化
3. **ゼロ設定**: PostCSSやautoprefixer不要
4. **新しい色システム**: より柔軟なカラーパレット
5. **コンテナクエリ**: `@container`のネイティブサポート
6. **3D Transform**: 3D変換のユーティリティ
7. **改善されたダークモード**: より柔軟な制御

## インストールとセットアップ

### 新規プロジェクト

```bash
# Tailwind CSS v4をインストール
npm install tailwindcss@next @tailwindcss/postcss@next

# または、新しいCLI
npx @tailwindcss/cli init
```

### 設定ファイル（CSS-first）

Tailwind CSS v4では、設定を**CSSファイルで直接**行います。

```css
/* app/globals.css */
@import "tailwindcss";

/* テーマのカスタマイズ */
@theme {
  /* カラーパレット */
  --color-primary: #3b82f6;
  --color-secondary: #8b5cf6;
  --color-accent: #f59e0b;

  /* スペーシング */
  --spacing-xs: 0.5rem;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  --spacing-xl: 3rem;

  /* フォント */
  --font-sans: Inter, system-ui, sans-serif;
  --font-mono: 'Fira Code', monospace;

  /* ブレークポイント */
  --breakpoint-tablet: 768px;
  --breakpoint-desktop: 1024px;
  --breakpoint-wide: 1280px;
}
```

### PostCSS設定（v4では不要！）

Tailwind CSS v4では、PostCSSやautoprefixerの設定が**不要**になりました。

```javascript
// postcss.config.js (v4では不要)
// v3まで:
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

// v4: 設定不要！Tailwindが自動で処理
```

### Vite設定

```javascript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  css: {
    transformer: 'lightningcss', // オプション: より高速なCSS処理
  },
});
```

### Next.js設定

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Tailwind v4のCSSサポート
    optimizeCss: true,
  },
};

module.exports = nextConfig;
```

## CSS-first設定の詳細

### カラーシステム

```css
@theme {
  /* プライマリカラー */
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-200: #bfdbfe;
  --color-primary-300: #93c5fd;
  --color-primary-400: #60a5fa;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;
  --color-primary-800: #1e40af;
  --color-primary-900: #1e3a8a;

  /* セマンティックカラー */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;
}
```

使用例:

```html
<button class="bg-primary-500 hover:bg-primary-600 text-white">
  Primary Button
</button>

<div class="text-success border-success">Success Message</div>
```

### タイポグラフィ

```css
@theme {
  /* フォントファミリー */
  --font-sans: 'Inter var', system-ui, sans-serif;
  --font-serif: 'Merriweather', serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* フォントサイズ */
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
  --font-size-4xl: 2.25rem;

  /* 行高 */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
}
```

使用例:

```html
<h1 class="font-serif text-4xl leading-tight">Heading</h1>
<p class="font-sans text-base leading-normal">Body text</p>
<code class="font-mono text-sm">const x = 42;</code>
```

### スペーシング

```css
@theme {
  /* カスタムスペーシング */
  --spacing-xs: 0.25rem;   /* 4px */
  --spacing-sm: 0.5rem;    /* 8px */
  --spacing-md: 1rem;      /* 16px */
  --spacing-lg: 1.5rem;    /* 24px */
  --spacing-xl: 2rem;      /* 32px */
  --spacing-2xl: 3rem;     /* 48px */
  --spacing-3xl: 4rem;     /* 64px */
}
```

使用例:

```html
<div class="p-md m-lg">
  <div class="space-y-sm">
    <p>Item 1</p>
    <p>Item 2</p>
  </div>
</div>
```

### ブレークポイント

```css
@theme {
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;

  /* カスタムブレークポイント */
  --breakpoint-tablet: 900px;
  --breakpoint-desktop: 1200px;
}
```

使用例:

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  <!-- レスポンシブグリッド -->
</div>
```

## 新しいユーティリティクラス

### コンテナクエリ

Tailwind CSS v4では、CSSコンテナクエリがネイティブでサポートされています。

```html
<div class="@container">
  <div class="@sm:text-sm @md:text-base @lg:text-lg">
    コンテナのサイズに応じてテキストサイズが変わる
  </div>
</div>
```

```css
/* カスタムコンテナサイズ */
@theme {
  --container-sm: 20rem;
  --container-md: 28rem;
  --container-lg: 32rem;
  --container-xl: 36rem;
}
```

### 3D Transform

```html
<!-- 3D回転 -->
<div class="rotate-x-45 rotate-y-30 rotate-z-15">
  3D Rotated
</div>

<!-- 3D平行移動 -->
<div class="translate-z-10">
  Z-axis translation
</div>

<!-- パースペクティブ -->
<div class="perspective-1000">
  <div class="rotate-y-45 transform-style-3d">
    3D Card
  </div>
</div>
```

実用例（3Dカード）:

```html
<div class="perspective-1000 group">
  <div class="relative w-64 h-80 transition-transform duration-500 transform-style-3d group-hover:rotate-y-180">
    <!-- Front -->
    <div class="absolute inset-0 bg-white rounded-lg shadow-lg backface-hidden">
      <h3 class="p-6 text-xl font-bold">Front Side</h3>
    </div>
    <!-- Back -->
    <div class="absolute inset-0 bg-blue-500 rounded-lg shadow-lg backface-hidden rotate-y-180">
      <h3 class="p-6 text-xl font-bold text-white">Back Side</h3>
    </div>
  </div>
</div>
```

### グリッドの改善

```html
<!-- サブグリッド -->
<div class="grid grid-cols-3 gap-4">
  <div class="grid grid-rows-subgrid gap-4">
    <div>Item 1</div>
    <div>Item 2</div>
  </div>
</div>

<!-- Auto-fit/Auto-fill -->
<div class="grid grid-cols-auto-fit-[minmax(200px,1fr)] gap-4">
  <div>Card 1</div>
  <div>Card 2</div>
  <div>Card 3</div>
</div>
```

### 論理プロパティ

```html
<!-- margin/paddingの論理プロパティ -->
<div class="ms-4 me-8 ps-2 pe-4">
  <!-- ms = margin-inline-start (LTRではmargin-left) -->
  <!-- me = margin-inline-end (LTRではmargin-right) -->
</div>

<!-- border -->
<div class="border-s-2 border-e-4">
  <!-- border-inline-start, border-inline-end -->
</div>
```

### カスケードレイヤー

```css
/* グローバルスタイル */
@layer base {
  h1 {
    @apply text-4xl font-bold;
  }
  a {
    @apply text-primary-600 hover:text-primary-700;
  }
}

@layer components {
  .btn {
    @apply px-4 py-2 rounded-lg font-medium transition-colors;
  }
  .btn-primary {
    @apply bg-primary-500 text-white hover:bg-primary-600;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

## ダークモードの改善

### バリアント設定

```css
@theme {
  /* ダークモードカラー */
  --color-dark-bg: #1a1a1a;
  --color-dark-text: #e5e5e5;
  --color-dark-border: #333;
}
```

```html
<!-- クラスベース -->
<html class="dark">
  <body class="bg-white dark:bg-dark-bg text-black dark:text-dark-text">
    <div class="border-gray-200 dark:border-dark-border">
      Content
    </div>
  </body>
</html>

<!-- メディアクエリベース -->
<div class="bg-white @media(prefers-color-scheme:dark):bg-dark-bg">
  自動ダークモード
</div>
```

### カスタムダークモードバリアント

```css
@custom-variant dark-mode (&:is(.dark-theme *));

/* 使用例 */
.element {
  @apply bg-white dark-mode:bg-gray-900;
}
```

## パフォーマンス最適化

### JITモード（デフォルト）

Tailwind CSS v4では、JITモードがデフォルトで有効です。必要なCSSのみを生成します。

### PurgeCSS（自動）

未使用のスタイルは自動的に削除されます。設定不要。

```javascript
// v3までの設定（v4では不要）
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  // ...
};
```

### ビルドサイズの比較

```
Tailwind CSS v3: ~50ms ビルド時間
Tailwind CSS v4: ~5ms ビルド時間（10倍高速）

本番CSS:
v3: 8-15KB (gzip)
v4: 5-10KB (gzip)
```

## 実践例

### モダンなカード

```html
<div class="@container max-w-sm mx-auto">
  <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-xl hover:scale-105">
    <img src="/image.jpg" alt="" class="w-full h-48 object-cover" />
    <div class="p-6">
      <h3 class="text-xl font-bold text-gray-900 dark:text-white @lg:text-2xl">
        Card Title
      </h3>
      <p class="mt-2 text-gray-600 dark:text-gray-300 @lg:text-lg">
        Card description goes here.
      </p>
      <button class="mt-4 px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
        Learn More
      </button>
    </div>
  </div>
</div>
```

### レスポンシブナビゲーション

```html
<nav class="bg-white dark:bg-gray-900 shadow-lg">
  <div class="max-w-7xl mx-auto px-4">
    <div class="flex items-center justify-between h-16">
      <div class="font-bold text-xl text-primary-600">Logo</div>

      <!-- Desktop Menu -->
      <div class="hidden md:flex space-x-8">
        <a href="#" class="text-gray-700 dark:text-gray-300 hover:text-primary-600 transition-colors">Home</a>
        <a href="#" class="text-gray-700 dark:text-gray-300 hover:text-primary-600 transition-colors">About</a>
        <a href="#" class="text-gray-700 dark:text-gray-300 hover:text-primary-600 transition-colors">Services</a>
        <a href="#" class="text-gray-700 dark:text-gray-300 hover:text-primary-600 transition-colors">Contact</a>
      </div>

      <!-- Mobile Menu Button -->
      <button class="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
        </svg>
      </button>
    </div>
  </div>
</nav>
```

### グリッドレイアウト

```html
<div class="grid grid-cols-1 @md:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4 gap-6">
  <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
    <h3 class="text-lg font-semibold">Item 1</h3>
  </div>
  <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
    <h3 class="text-lg font-semibold">Item 2</h3>
  </div>
  <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
    <h3 class="text-lg font-semibold">Item 3</h3>
  </div>
  <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
    <h3 class="text-lg font-semibold">Item 4</h3>
  </div>
</div>
```

## v3からv4への移行

### 移行ステップ

1. **依存関係の更新**

```bash
npm install tailwindcss@next @tailwindcss/postcss@next
```

2. **tailwind.config.jsをCSS設定に移行**

```javascript
// tailwind.config.js (v3)
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
      },
    },
  },
};
```

```css
/* globals.css (v4) */
@theme {
  --color-primary: #3b82f6;
}
```

3. **PostCSS設定を削除**

```javascript
// postcss.config.js を削除してOK
```

4. **カスタムクラスの更新**

```css
/* v3 */
@layer components {
  .btn {
    @apply px-4 py-2 bg-blue-500 text-white;
  }
}

/* v4 (同じ構文) */
@layer components {
  .btn {
    @apply px-4 py-2 bg-primary-500 text-white;
  }
}
```

### 破壊的変更のチェックリスト

- [ ] `tailwind.config.js`の設定をCSSに移行
- [ ] PostCSS設定を削除
- [ ] 廃止されたユーティリティクラスを置き換え
- [ ] カスタムプラグインをv4互換に更新
- [ ] ビルドスクリプトを確認

## トラブルシューティング

### ビルドエラー

```bash
# キャッシュをクリア
rm -rf .next
rm -rf node_modules/.cache

# 再インストール
npm install
```

### スタイルが適用されない

```css
/* globals.cssで正しくインポート */
@import "tailwindcss";

/* または */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### ダークモードが動作しない

```html
<!-- HTMLタグにdarkクラスを追加 -->
<html class="dark">
```

## まとめ

Tailwind CSS v4の主な特徴:

**新機能:**
- CSS-first設定でシンプルな設定
- Rust製エンジンで10倍高速化
- コンテナクエリのネイティブサポート
- 3D Transformユーティリティ
- 改善されたダークモード

**移行のメリット:**
- ビルド時間の大幅短縮
- 設定ファイルの簡素化
- より柔軟なカスタマイズ
- パフォーマンス向上

**推奨する人:**
- 新規プロジェクト
- パフォーマンスを重視する開発者
- モダンなCSS機能を使いたい開発者

Tailwind CSS v4は、フロントエンド開発の効率を大幅に向上させる革新的なアップデートです。

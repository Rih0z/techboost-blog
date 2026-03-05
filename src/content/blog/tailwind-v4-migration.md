---
title: 'Tailwind CSS v4移行完全ガイド — 新機能とブレイキングチェンジ対策'
description: 'Tailwind CSS v4の全貌を徹底解説。Oxide Engine、Container Queries、CSS変数ベース設定、@themeディレクティブなど新機能と、v3からの移行手順、ブレイキングチェンジ対策を実践的に紹介します。'
pubDate: '2025-02-06'
tags: ['Tailwind CSS', 'CSS', 'Frontend', 'Migration', 'プログラミング']
---

Tailwind CSS v4が2024年末にアルファ版としてリリースされ、2026年現在では安定版として多くのプロジェクトで採用されています。パフォーマンスの大幅向上、設定の簡素化、新機能の追加など、v3からの進化は劇的です。

この記事では、Tailwind CSS v4の新機能を完全解説し、v3からの移行手順とブレイキングチェンジへの対策を実践的に紹介します。

## Tailwind CSS v4の主要アップデート

### 主な変更点

- **Oxide Engine** - Rustベースの新エンジンで10倍高速化
- **CSS変数ベース設定** - `tailwind.config.js`が不要に
- **`@theme`ディレクティブ** - CSS内で直接テーマ設定
- **Container Queries対応** - `@container`ユーティリティ追加
- **`:is()`擬似クラス活用** - セレクタ効率化
- **カスタムプロパティファースト** - より柔軟なカスタマイズ
- **ビルトインRTL対応** - 右横書き言語のサポート強化
- **@importのネイティブサポート** - PostCSS不要に

## インストールと初期設定

### 新規プロジェクト

```bash
npm install tailwindcss@next
npx tailwindcss init
```

### v3からのアップグレード

```bash
npm install tailwindcss@next
```

### 基本設定ファイル

Tailwind CSS v4では、`tailwind.config.js`は**オプショナル**になりました。

```css
/* app/globals.css */
@import "tailwindcss";

/* テーマ設定 */
@theme {
  --color-primary: #3b82f6;
  --color-secondary: #8b5cf6;
  --font-sans: 'Inter', sans-serif;
  --breakpoint-3xl: 1920px;
}
```

従来の`tailwind.config.js`を使う場合:

```javascript
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
      },
    },
  },
};
```

どちらの方法でも動作しますが、v4では**CSS変数ベース**が推奨されます。

## Oxide Engine - 10倍高速化

Tailwind CSS v4の最大の変更点は、RustベースのOxide Engineです。

### パフォーマンス比較

```
Tailwind CSS v3: 約250ms（大規模プロジェクト）
Tailwind CSS v4: 約25ms（Oxide Engine）

結果: 約10倍高速化
```

### フルリビルド不要

```bash
# v3: ファイル変更時にフルリビルド
# v4: 変更部分のみ再ビルド（インクリメンタルビルド）
```

大規模プロジェクトでのHMR（Hot Module Replacement）が劇的に速くなります。

## @themeディレクティブ - CSS変数ベース設定

`@theme`は、CSS内で直接テーマをカスタマイズできる新機能です。

### カラーシステム

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  /* カスタムカラー */
  --color-brand-50: #f0f9ff;
  --color-brand-100: #e0f2fe;
  --color-brand-200: #bae6fd;
  --color-brand-500: #0ea5e9;
  --color-brand-900: #0c4a6e;

  /* カラーパレット */
  --color-primary: var(--color-brand-500);
  --color-secondary: #8b5cf6;
  --color-accent: #f59e0b;
}
```

使用例:

```jsx
<div className="bg-brand-500 text-white">
  Tailwind CSS v4
</div>

<button className="bg-primary hover:bg-brand-600">
  ボタン
</button>
```

### フォント設定

```css
@theme {
  /* カスタムフォント */
  --font-sans: 'Inter', ui-sans-serif, system-ui;
  --font-serif: 'Merriweather', ui-serif, Georgia;
  --font-mono: 'Fira Code', ui-monospace, monospace;

  /* フォントサイズ */
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
}
```

```jsx
<p className="font-sans text-lg">
  Interフォントで表示
</p>
```

### スペーシング

```css
@theme {
  /* カスタムスペーシング */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;
}
```

```jsx
<div className="p-lg mb-xl">
  カスタムスペーシング
</div>
```

### ブレークポイント

```css
@theme {
  /* カスタムブレークポイント */
  --breakpoint-xs: 480px;
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;
  --breakpoint-3xl: 1920px;
}
```

```jsx
<div className="w-full 3xl:w-1/2">
  3xlブレークポイント対応
</div>
```

## Container Queries - 親要素ベースのレスポンシブ

Tailwind CSS v4では、CSS Container Queriesがビルトインサポートされました。

### 基本的な使い方

```jsx
<div className="@container">
  <div className="@md:flex @lg:grid @lg:grid-cols-2">
    <div className="@md:w-1/2">
      Container Queries
    </div>
  </div>
</div>
```

### コンテナ名付き

```css
@theme {
  /* コンテナ名定義 */
  --container-sidebar: inline-size;
  --container-main: inline-size;
}
```

```jsx
<aside className="@container/sidebar">
  <nav className="@sm/sidebar:flex @md/sidebar:flex-col">
    サイドバーナビゲーション
  </nav>
</aside>

<main className="@container/main">
  <article className="@lg/main:grid @lg/main:grid-cols-3">
    メインコンテンツ
  </article>
</main>
```

### 実践例: カードコンポーネント

```jsx
// components/ResponsiveCard.tsx
export function ResponsiveCard({ title, content, image }) {
  return (
    <div className="@container">
      <div className="@md:flex @md:gap-4">
        <img
          src={image}
          className="@md:w-1/3 @lg:w-1/4"
          alt={title}
        />
        <div className="@md:w-2/3 @lg:w-3/4">
          <h3 className="@sm:text-lg @md:text-xl @lg:text-2xl">
            {title}
          </h3>
          <p className="@sm:text-sm @md:text-base">
            {content}
          </p>
        </div>
      </div>
    </div>
  );
}
```

従来のメディアクエリ（`md:`, `lg:`等）は画面幅、Container Queries（`@md:`, `@lg:`等）は親要素の幅で判定されます。

## カスタムプロパティファースト

Tailwind CSS v4では、CSS変数（カスタムプロパティ）を直接ユーティリティで使えます。

### 動的なテーマ切り替え

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  /* ライトモード */
  --color-bg: #ffffff;
  --color-text: #1f2937;
}

@media (prefers-color-scheme: dark) {
  @theme {
    /* ダークモード */
    --color-bg: #1f2937;
    --color-text: #f9fafb;
  }
}
```

```jsx
<body className="bg-[var(--color-bg)] text-[var(--color-text)]">
  <h1>自動ダークモード対応</h1>
</body>
```

### ユーザー選択式テーマ

```css
[data-theme="light"] {
  --color-primary: #3b82f6;
  --color-bg: #ffffff;
}

[data-theme="dark"] {
  --color-primary: #60a5fa;
  --color-bg: #111827;
}

[data-theme="high-contrast"] {
  --color-primary: #000000;
  --color-bg: #ffffff;
}
```

```jsx
'use client';

import { useState } from 'react';

export function ThemeSwitcher() {
  const [theme, setTheme] = useState('light');

  function changeTheme(newTheme: string) {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  }

  return (
    <select value={theme} onChange={(e) => changeTheme(e.target.value)}>
      <option value="light">ライト</option>
      <option value="dark">ダーク</option>
      <option value="high-contrast">ハイコントラスト</option>
    </select>
  );
}
```

## RTL（右横書き）対応

Tailwind CSS v4では、RTL言語（アラビア語、ヘブライ語等）のサポートが強化されました。

### RTL対応ユーティリティ

```jsx
<div dir="rtl">
  <div className="ps-4 pe-8">
    {/* ps = padding-inline-start (RTLでは右) */}
    {/* pe = padding-inline-end (RTLでは左) */}
    RTL対応パディング
  </div>

  <div className="ms-auto">
    {/* ms = margin-inline-start */}
    RTL対応マージン
  </div>
</div>
```

### 論理プロパティ

```jsx
<div className="border-s-2 border-e-4">
  {/* border-s = border-inline-start */}
  {/* border-e = border-inline-end */}
  RTL対応ボーダー
</div>

<div className="rounded-s-lg rounded-e-none">
  {/* rounded-s = border-start-radius */}
  RTL対応角丸
</div>
```

## v3からv4への移行手順

### ステップ1: 依存関係の更新

```bash
npm install tailwindcss@next
```

### ステップ2: 設定ファイルの移行

従来の`tailwind.config.js`:

```javascript
// tailwind.config.js (v3)
export default {
  content: ['./app/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

v4の`@theme`に移行:

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-primary: #3b82f6;
  --color-secondary: #8b5cf6;
  --font-sans: 'Inter', sans-serif;
}
```

### ステップ3: ブレイキングチェンジ対策

#### 1. `@apply`の変更

```css
/* v3 */
.btn {
  @apply px-4 py-2 bg-blue-500 text-white;
}

/* v4 */
.btn {
  @apply px-4 py-2 bg-blue-500 text-white;
}

/* 変更なし。ただし@themeで定義した変数を使う場合: */
.btn {
  @apply px-4 py-2 bg-[var(--color-primary)] text-white;
}
```

#### 2. JITモードはデフォルト

```javascript
// v3: JIT有効化が必要
export default {
  mode: 'jit',
  // ...
};

// v4: JITがデフォルト。設定不要。
```

#### 3. `@layer`の推奨

```css
/* v4推奨 */
@layer components {
  .card {
    @apply rounded-lg shadow-md p-6;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

### ステップ4: プラグインの互換性確認

```javascript
// tailwind.config.js
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

export default {
  plugins: [
    forms, // v4対応済み
    typography, // v4対応済み
  ],
};
```

主要プラグインはv4対応済みです。サードパーティプラグインは公式ドキュメントで確認してください。

## 新機能の活用例

### 1. ダイナミックユーティリティ

```jsx
<div className="bg-[#1da1f2]">
  任意の色を使用
</div>

<div className="w-[347px]">
  任意のサイズ
</div>

<div className="top-[117px] left-[344px]">
  任意の位置
</div>
```

### 2. `@variant`でカスタムバリアント作成

```css
@variant hocus (&:hover, &:focus);

@variant optional (&:optional);
@variant valid (&:valid);
@variant invalid (&:invalid);
```

```jsx
<button className="hocus:bg-blue-600">
  ホバーとフォーカス両方に適用
</button>

<input className="optional:border-gray-300 invalid:border-red-500" />
```

### 3. `@utility`でカスタムユーティリティ作成

```css
@utility text-pretty {
  text-wrap: pretty;
}

@utility text-balance {
  text-wrap: balance;
}
```

```jsx
<p className="text-pretty">
  美しいテキスト折り返し
</p>
```

## パフォーマンス最適化

### 1. 未使用CSSの削除

Tailwind CSS v4のOxide Engineは、自動的に未使用のCSSを削除します。

```css
/* v3: PurgeCSS設定が必要 */
/* v4: 自動最適化 */
```

### 2. インクリメンタルビルド

```bash
# v4は変更部分のみ再ビルド
# 大規模プロジェクトでも高速
```

### 3. ビルドサイズ削減

```
v3: 約3MB（開発時）→ 10KB（本番）
v4: 約1.5MB（開発時）→ 8KB（本番）

結果: 約20%削減
```

## ベストプラクティス

### 1. `@theme`を活用

```css
@theme {
  /* デザイントークンを一元管理 */
  --color-primary: #3b82f6;
  --color-secondary: #8b5cf6;
  --spacing-unit: 0.25rem;
}
```

### 2. Container Queriesを使う

```jsx
<div className="@container">
  {/* メディアクエリより柔軟 */}
  <div className="@md:flex">
    コンテンツ
  </div>
</div>
```

### 3. 論理プロパティを優先

```jsx
{/* 従来（LTR専用） */}
<div className="ml-4 mr-8"></div>

{/* v4推奨（RTL対応） */}
<div className="ms-4 me-8"></div>
```

### 4. カスタムプロパティで動的スタイル

```jsx
<div
  className="bg-[var(--user-color)]"
  style={{ '--user-color': userColor }}
>
  ユーザー選択色
</div>
```

## トラブルシューティング

### エラー: `@theme is not defined`

```css
/* ❌ NG */
@theme {
  --color-primary: #3b82f6;
}

/* ✅ OK - @importの後に書く */
@import "tailwindcss";

@theme {
  --color-primary: #3b82f6;
}
```

### ビルドが遅い

```bash
# キャッシュをクリア
rm -rf .next
rm -rf node_modules/.cache

npm run dev
```

### プラグインが動かない

```javascript
// package.jsonでバージョン確認
{
  "dependencies": {
    "tailwindcss": "^4.0.0",
    "@tailwindcss/forms": "^0.5.7" // 最新版に更新
  }
}
```

## まとめ

Tailwind CSS v4の主要機能をまとめます。

- **Oxide Engine** - Rustベースで10倍高速化
- **@themeディレクティブ** - CSS変数ベース設定
- **Container Queries** - 親要素ベースのレスポンシブ
- **カスタムプロパティファースト** - 柔軟なカスタマイズ
- **RTL対応** - 論理プロパティサポート
- **インクリメンタルビルド** - 変更部分のみ再ビルド

Tailwind CSS v4は、パフォーマンス、開発体験、柔軟性すべてが向上した次世代CSSフレームワークです。v3からの移行も比較的スムーズなので、早めにアップグレードしましょう。

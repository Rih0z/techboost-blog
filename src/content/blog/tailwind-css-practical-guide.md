---
title: 'Tailwind CSS実践ガイド — 効率的なスタイリングと設計パターン完全解説'
description: 'Tailwind CSS v4の新機能から実践的なコンポーネント設計まで徹底解説。カスタムテーマ設定・レスポンシブ・ダークモード・アニメーション・CVA（Class Variance Authority）を使ったコンポーネント設計・パフォーマンス最適化まで実践コード付き。'
pubDate: '2026-02-20'
heroImage: '../../assets/blog-placeholder-3.jpg'
tags: ['Tailwind CSS', 'CSS', 'React', 'コンポーネント設計', 'フロントエンド']
---

Tailwind CSSは「クラスを書き過ぎて可読性が下がる」と批判される一方、使いこなしたチームからは「これなしでは開発できない」とも言われます。その二極化した評価の背景には、「正しい使い方」を知っているかどうかの差があります。本記事では、設計哲学の理解から実践的なコンポーネント設計、v4の最新機能まで体系的に解説します。

---

## 1. Tailwindの設計哲学 — ユーティリティファーストとは何か

### コンポーネント指向との本質的な違い

従来のCSSアーキテクチャ（BEM、SMACSS、CSS Modules）は「コンポーネントに名前をつけてスタイルをカプセル化する」思想です。Tailwindはその逆で、**スタイルの原子（ユーティリティ）をHTMLに直接組み合わせる**アプローチです。

```html
<!-- 従来のコンポーネント指向 -->
<button class="btn btn--primary btn--lg">送信</button>

<!-- Tailwindのユーティリティファースト -->
<button class="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
  送信
</button>
```

一見HTMLが肥大化するように見えますが、これには重大な利点があります。

**利点1: CSSが増殖しない**
ユーティリティクラスは有限で、プロジェクトの規模が大きくなっても生成されるCSSファイルのサイズはほぼ変わりません。JITコンパイラが使用しているクラスだけを出力するからです。

**利点2: コンテキストスイッチがない**
CSSファイルとHTMLファイルを行き来する必要がなく、スタイルと構造を同一ファイルで管理できます。

**利点3: 命名から解放される**
「このコンテナを何と呼ぶか」という認知コストがゼロになります。

### いつ`@apply`を使うべきか

Tailwindには`@apply`ディレクティブがあり、ユーティリティをCSSにまとめられます。ただし、公式ドキュメントも「多用を避けるべき」と明記しています。

```css
/* 推奨: 本当に繰り返しが避けられない場合のみ */
@layer components {
  .btn-primary {
    @apply rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white;
    @apply hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500;
  }
}
```

Reactなどのコンポーネントベースフレームワークでは、`@apply`よりも**コンポーネント自体を再利用する**のが正しいパターンです。

---

## 2. tailwind.config.ts の設定

### 基本構造と型安全な設定

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class', // または 'media'
  theme: {
    // extend でデフォルトを拡張（推奨）
    extend: {
      // カスタムカラー
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
        surface: {
          primary:   'hsl(var(--surface-primary) / <alpha-value>)',
          secondary: 'hsl(var(--surface-secondary) / <alpha-value>)',
        },
      },
      // カスタムフォント
      fontFamily: {
        sans: ['Inter', 'Noto Sans JP', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Cal Sans', 'Inter', 'sans-serif'],
      },
      // カスタムspacingはデフォルトに追加
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      // カスタムbreakpoints
      screens: {
        'xs': '480px',
        // sm: '640px' はデフォルトのまま
        '3xl': '1920px',
      },
      // カスタムz-index
      zIndex: {
        'modal':   '1000',
        'tooltip': '1100',
        'toast':   '1200',
      },
      // カスタムborder-radius
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
  ],
}

export default config
```

### CSS変数との連携

CSS変数を使うことで、テーマをJavaScriptから動的に変更できます。

```css
/* globals.css */
@layer base {
  :root {
    --surface-primary: 0 0% 100%;
    --surface-secondary: 210 40% 98%;
    --text-primary: 222.2 84% 4.9%;
  }

  .dark {
    --surface-primary: 222.2 84% 4.9%;
    --surface-secondary: 217.2 32.6% 17.5%;
    --text-primary: 210 40% 98%;
  }
}
```

---

## 3. レスポンシブデザイン

### モバイルファーストの原則

Tailwindのレスポンシブは**モバイルファースト**です。プレフィックスなしはすべての画面サイズに適用され、`sm:`以上はブレークポイント以上に適用されます。

```html
<!-- モバイル: 1列、タブレット: 2列、デスクトップ: 3列 -->
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
  <div class="rounded-lg bg-white p-6 shadow">カード1</div>
  <div class="rounded-lg bg-white p-6 shadow">カード2</div>
  <div class="rounded-lg bg-white p-6 shadow">カード3</div>
</div>

<!-- テキストサイズのレスポンシブ -->
<h1 class="text-2xl font-bold sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
  レスポンシブな見出し
</h1>

<!-- パディングのレスポンシブ -->
<section class="px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
  コンテンツ
</section>
```

### コンテナパターン

```html
<!-- 一貫したコンテナ幅の管理 -->
<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
  <!-- ページコンテンツ -->
</div>
```

### 任意の値（Arbitrary Values）

デザインシステムに存在しない値も一時的に使えます。

```html
<!-- 任意の値はブラケット記法で指定 -->
<div class="w-[342px] top-[117px] bg-[#1da1f2] text-[13px]">
  任意の値を使用
</div>

<!-- CSS変数も使える -->
<div class="bg-[var(--brand-color)]">CSS変数参照</div>
```

---

## 4. ダークモード

### classストラテジーの実装

`darkMode: 'class'`を設定すると、`<html class="dark">`で切り替えられます。

```tsx
// ThemeToggle.tsx
'use client'
import { useState, useEffect } from 'react'

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setIsDark(saved === 'dark' || (!saved && prefersDark))
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
      aria-label="テーマ切替"
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  )
}
```

```html
<!-- ダークモード対応コンポーネント -->
<div class="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
  <h1 class="text-2xl font-bold text-gray-800 dark:text-gray-200">
    見出し
  </h1>
  <p class="mt-2 text-gray-600 dark:text-gray-400">
    本文テキスト
  </p>
  <div class="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
    カード内容
  </div>
</div>
```

---

## 5. よく使うパターン集

### Flexboxレイアウト

```html
<!-- 水平中央揃え -->
<div class="flex items-center justify-center min-h-screen">
  <p>中央に配置</p>
</div>

<!-- スペース均等配置のナビゲーション -->
<nav class="flex items-center justify-between px-6 py-4">
  <a href="/" class="text-lg font-bold">ロゴ</a>
  <div class="flex items-center gap-6">
    <a href="/about" class="text-gray-600 hover:text-gray-900">About</a>
    <a href="/blog" class="text-gray-600 hover:text-gray-900">Blog</a>
    <button class="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">
      お問い合わせ
    </button>
  </div>
</nav>

<!-- アイコン+テキストの横並び -->
<div class="flex items-center gap-2 text-sm text-gray-600">
  <svg class="h-4 w-4" .../>
  <span>テキスト</span>
</div>
```

### Gridレイアウト

```html
<!-- 非対称2カラム（サイドバー付きレイアウト） -->
<div class="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
  <aside class="rounded-xl bg-gray-50 p-6">サイドバー</aside>
  <main>メインコンテンツ</main>
</div>

<!-- 画像ギャラリー（masonry風） -->
<div class="columns-2 gap-4 sm:columns-3 lg:columns-4">
  <img class="mb-4 w-full rounded-lg" src="..." alt=""/>
  <img class="mb-4 w-full rounded-lg" src="..." alt=""/>
</div>
```

### カードコンポーネント

```html
<article class="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
  <!-- 画像エリア -->
  <div class="aspect-video overflow-hidden">
    <img
      class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      src="..."
      alt="記事のサムネイル"
    />
  </div>
  <!-- コンテンツエリア -->
  <div class="p-6">
    <div class="flex items-center gap-2">
      <span class="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        タグ
      </span>
      <time class="text-xs text-gray-500">2026年2月20日</time>
    </div>
    <h2 class="mt-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
      <a href="#" class="hover:text-blue-600 dark:hover:text-blue-400">
        記事タイトル
      </a>
    </h2>
    <p class="mt-2 text-sm text-gray-600 line-clamp-3 dark:text-gray-400">
      記事の要約テキストです。3行を超える場合は省略されます。
    </p>
  </div>
</article>
```

### モーダルコンポーネント

```html
<!-- オーバーレイ -->
<div class="fixed inset-0 z-modal flex items-center justify-center bg-black/50 backdrop-blur-sm">
  <!-- モーダル本体 -->
  <div class="relative mx-4 w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
    <!-- ヘッダー -->
    <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">モーダルタイトル</h2>
      <button class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700">
        ✕
      </button>
    </div>
    <!-- ボディ -->
    <div class="px-6 py-4">
      <p class="text-gray-600 dark:text-gray-400">モーダルコンテンツ</p>
    </div>
    <!-- フッター -->
    <div class="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
      <button class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
        キャンセル
      </button>
      <button class="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
        確認
      </button>
    </div>
  </div>
</div>
```

### フォームパターン

```html
<form class="space-y-6">
  <!-- テキスト入力 -->
  <div class="space-y-1.5">
    <label class="text-sm font-medium text-gray-700 dark:text-gray-300" for="name">
      お名前 <span class="text-red-500">*</span>
    </label>
    <input
      id="name"
      type="text"
      class="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
      placeholder="山田 太郎"
    />
    <p class="text-xs text-red-500">このフィールドは必須です</p>
  </div>

  <!-- セレクト -->
  <div class="space-y-1.5">
    <label class="text-sm font-medium text-gray-700 dark:text-gray-300" for="category">
      カテゴリ
    </label>
    <select
      id="category"
      class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
    >
      <option value="">選択してください</option>
      <option value="a">オプションA</option>
      <option value="b">オプションB</option>
    </select>
  </div>

  <!-- チェックボックス -->
  <div class="flex items-start gap-3">
    <input
      id="agree"
      type="checkbox"
      class="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
    />
    <label for="agree" class="text-sm text-gray-600 dark:text-gray-400">
      <a href="/terms" class="text-blue-600 underline hover:no-underline">利用規約</a>に同意します
    </label>
  </div>

  <button
    type="submit"
    class="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
  >
    送信する
  </button>
</form>
```

---

## 6. アニメーション・トランジション

### 組み込みアニメーション

```html
<!-- スピナー -->
<div class="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>

<!-- スケルトンローディング -->
<div class="space-y-3">
  <div class="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
  <div class="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
  <div class="h-4 w-5/6 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
</div>

<!-- バウンスインジケーター -->
<div class="flex items-center gap-1">
  <div class="h-2 w-2 animate-bounce rounded-full bg-blue-600 [animation-delay:-0.3s]"></div>
  <div class="h-2 w-2 animate-bounce rounded-full bg-blue-600 [animation-delay:-0.15s]"></div>
  <div class="h-2 w-2 animate-bounce rounded-full bg-blue-600"></div>
</div>

<!-- フェードイン（トランジション） -->
<div class="opacity-0 transition-opacity duration-500 data-[visible=true]:opacity-100">
  フェードインコンテンツ
</div>
```

### カスタムキーフレーム

```typescript
// tailwind.config.ts
theme: {
  extend: {
    keyframes: {
      slideDown: {
        from: { height: '0', opacity: '0' },
        to: { height: 'var(--radix-accordion-content-height)', opacity: '1' },
      },
      slideUp: {
        from: { height: 'var(--radix-accordion-content-height)', opacity: '1' },
        to: { height: '0', opacity: '0' },
      },
      shimmer: {
        '0%': { backgroundPosition: '-200% 0' },
        '100%': { backgroundPosition: '200% 0' },
      },
      fadeInUp: {
        from: { opacity: '0', transform: 'translateY(16px)' },
        to: { opacity: '1', transform: 'translateY(0)' },
      },
    },
    animation: {
      'slide-down': 'slideDown 200ms ease-out',
      'slide-up':   'slideUp 200ms ease-in',
      'shimmer':    'shimmer 2s linear infinite',
      'fade-in-up': 'fadeInUp 400ms ease-out both',
    },
  },
}
```

```html
<!-- カスタムアニメーションの使用 -->
<div class="animate-fade-in-up">フェードインアップ</div>

<!-- シマーエフェクト（骨格スクリーン） -->
<div class="animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded h-4"></div>
```

---

## 7. 擬似クラス・擬似要素

### hover・focus・active

```html
<button class="
  rounded-lg bg-blue-600 px-6 py-2.5 text-white font-medium
  hover:bg-blue-700
  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
  active:scale-95
  disabled:cursor-not-allowed disabled:opacity-50
  transition-all duration-150
">
  ボタン
</button>
```

### groupとpeerの活用

`group`は親要素の状態に応じて子要素をスタイリングし、`peer`は同階層の隣接要素の状態を参照します。

```html
<!-- group: 親ホバー時に子を変化させる -->
<a href="#" class="group flex items-center gap-3 rounded-xl p-4 hover:bg-blue-50 dark:hover:bg-blue-900/20">
  <div class="rounded-lg bg-blue-100 p-2 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-900/30">
    <svg class="h-5 w-5" .../>
  </div>
  <div>
    <p class="font-medium text-gray-900 group-hover:text-blue-700 dark:text-gray-100">メニュー項目</p>
    <p class="text-sm text-gray-500 group-hover:text-blue-600/70">説明テキスト</p>
  </div>
  <svg class="ml-auto h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-500" .../>
</a>

<!-- peer: チェックボックスの状態でラベルをスタイリング -->
<label class="flex cursor-pointer items-center gap-3">
  <input type="checkbox" class="peer sr-only" />
  <div class="h-5 w-5 rounded border-2 border-gray-300 transition-colors peer-checked:border-blue-600 peer-checked:bg-blue-600"></div>
  <span class="text-gray-700 peer-checked:text-blue-600 peer-checked:font-medium">
    オプション
  </span>
</label>
```

### before/after擬似要素

```html
<!-- beforeでバッジを追加 -->
<span class="relative before:absolute before:-right-1 before:-top-1 before:h-2 before:w-2 before:rounded-full before:bg-red-500">
  通知
</span>

<!-- 区切り線のある見出し -->
<div class="relative text-center">
  <span class="relative z-10 bg-white px-4 text-sm text-gray-500 dark:bg-gray-900">
    または
  </span>
  <div class="absolute inset-0 flex items-center">
    <div class="w-full border-t border-gray-200 dark:border-gray-700"></div>
  </div>
</div>
```

---

## 8. コンポーネント設計 — CVA・clsx・twMerge

### CVA（Class Variance Authority）

CVAは、コンポーネントのバリアントを型安全に管理するライブラリです。

```bash
npm install class-variance-authority clsx tailwind-merge
```

```tsx
// components/Button.tsx
import { cva, type VariantProps } from 'class-variance-authority'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// cn ユーティリティ（ほぼ全プロジェクトで必須）
export function cn(...inputs: (string | undefined | null | boolean)[]): string {
  return twMerge(clsx(inputs))
}

const buttonVariants = cva(
  // 共通の基底クラス
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:   'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        secondary: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-400',
        ghost:     'text-gray-700 hover:bg-gray-100 focus:ring-gray-400',
        danger:    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
        success:   'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
      },
      size: {
        sm:  'h-8 px-3 text-xs',
        md:  'h-10 px-4 text-sm',
        lg:  'h-12 px-6 text-base',
        xl:  'h-14 px-8 text-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size:    'md',
    },
  }
)

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    isLoading?: boolean
    leftIcon?: React.ReactNode
    rightIcon?: React.ReactNode
  }

export function Button({
  variant,
  size,
  className,
  isLoading,
  leftIcon,
  rightIcon,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  )
}
```

```tsx
// 使用例
<Button variant="primary" size="lg">送信する</Button>
<Button variant="secondary" isLoading>処理中...</Button>
<Button variant="danger" size="sm" leftIcon={<TrashIcon />}>削除</Button>

// className でオーバーライドも可能（twMergeが競合を解決）
<Button variant="primary" className="w-full rounded-full">全幅ボタン</Button>
```

### Badgeコンポーネントの例

```tsx
const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
        primary: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        danger:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export function Badge({ variant, className, children }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)}>
      {children}
    </span>
  )
}
```

---

## 9. shadcn/uiとの組み合わせ

shadcn/uiはTailwindとRadix UIをベースにしたコンポーネントコレクションです。コードをプロジェクトにコピーして完全にカスタマイズできるのが特徴です。

```bash
# shadcn/uiのセットアップ
npx shadcn@latest init

# コンポーネントを追加（コードがsrc/components/ui/に生成される）
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add form
```

shadcn/uiはCSS変数ベースのテーマシステムを採用しており、`globals.css`で定義した変数が全コンポーネントに反映されます。

```css
/* shadcn/ui のテーマ変数 */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
  }
}
```

既存のCVAベースのコンポーネントとshadcn/uiを混在させる場合は、`cn`ユーティリティを共有して使います。

---

## 10. パフォーマンス最適化

### JITコンパイルとPurgeCSS

Tailwind v3以降はJIT（Just-In-Time）コンパイラがデフォルトです。`content`設定で指定したファイルをスキャンし、使用しているクラスだけを生成します。

```typescript
// 正確なcontentパターンの指定が重要
content: [
  './src/**/*.{js,ts,jsx,tsx,mdx}',
  // 外部ライブラリのコンポーネントも含める場合
  './node_modules/@company/design-system/**/*.{js,ts,jsx,tsx}',
],
```

**よくある落とし穴: 動的クラス名の分割**

```tsx
// 危険: JITがクラスを検出できない
const color = 'blue'
<div className={`bg-${color}-500`} /> // bg-blue-500 は生成されない

// 安全: 完全なクラス名を文字列で持つ
const colorMap = {
  blue:  'bg-blue-500',
  green: 'bg-green-500',
  red:   'bg-red-500',
}
<div className={colorMap[color]} /> // 正しく検出される
```

### バンドルサイズの確認

```bash
# ビルド後のCSSサイズを確認
npx tailwindcss -i ./src/globals.css -o ./dist/output.css --minify
ls -lh dist/output.css
```

本番ビルド（minify + autoprefixer）でTailwindのCSSは通常**5〜20KB**に収まります。

### レイヤーとカスケードの理解

```css
@layer base {
  /* リセット・デフォルトスタイル（最低優先度） */
  h1 { @apply text-3xl font-bold; }
}

@layer components {
  /* 再利用コンポーネント */
  .card { @apply rounded-xl bg-white p-6 shadow; }
}

@layer utilities {
  /* カスタムユーティリティ（最高優先度） */
  .text-balance { text-wrap: balance; }
}
```

---

## 11. Tailwind CSS v4の新機能

### CSS-firstコンフィグレーション

v4最大の変更点は、設定をJavaScriptからCSSに移行したことです。

```css
/* app.css (v4の新しい設定方法) */
@import "tailwindcss";

/* テーマのカスタマイズ */
@theme {
  --color-brand-500: oklch(60% 0.2 250);
  --color-brand-600: oklch(50% 0.22 250);
  --font-sans: "Inter", sans-serif;
  --radius-card: 1rem;
  --spacing-18: 4.5rem;
}

/* カスタムユーティリティ */
@utility text-balance {
  text-wrap: balance;
}

/* バリアント */
@variant hocus {
  &:hover, &:focus {
    @slot;
  }
}
```

```html
<!-- v4のCSS変数ベースユーティリティはそのまま使用可能 -->
<div class="bg-brand-500 rounded-card p-18">
  v4スタイルコンポーネント
</div>
```

### @importによる分割

```css
/* styles/main.css */
@import "tailwindcss";
@import "./theme.css";
@import "./components.css";
@import "./utilities.css";
```

### v4のOKLCHカラー

v4ではカラーシステムがP3色空間対応のOKLCHに移行しています。

```css
@theme {
  /* OKLCHで高精度なカラー定義 */
  --color-primary: oklch(55% 0.23 264);
  --color-primary-hover: oklch(45% 0.25 264);
}
```

---

## まとめ

Tailwind CSSを使いこなすポイントは以下の5点です。

| ポイント | 内容 |
|---------|------|
| 設計哲学の理解 | ユーティリティファーストはコンポーネントの**再利用**で補完する |
| `cn`ユーティリティ | `clsx + twMerge`の組み合わせを全プロジェクトで共有する |
| CVAの活用 | バリアントを型安全に管理してコンポーネントを設計する |
| 動的クラス名に注意 | 動的に構築するクラスはJITに検出されない |
| v4への備え | CSS-firstコンフィグとOKLCHカラーへの移行を計画する |

Tailwindは「書くのが速い」だけでなく、適切な設計パターンと組み合わせることで**保守性の高いUIシステム**を構築できます。CVAやshadcn/uiと組み合わせたコンポーネント設計を実践に取り入れることで、チーム開発でもスタイルの一貫性を保てるでしょう。

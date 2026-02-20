---
title: 'Tailwind CSS v4完全ガイド — 新機能・CSS-first設定・パフォーマンス向上'
description: 'Tailwind CSS v4の新機能を完全解説。CSS-first設定（@theme・@variant・@utility）・新デザイントークン・コンテナクエリ・3Dトランスフォーム・v3からの移行手順まで実装例付きで網羅。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-3.jpg'
tags: ['Tailwind CSS', 'CSS', 'フロントエンド', 'v4', 'デザイン']
---

Tailwind CSS v4は、2025年初頭にリリースされたメジャーバージョンアップで、フレームワークの根本的なアーキテクチャを再設計した大型リリースです。単なる機能追加にとどまらず、設定方法・ビルドエンジン・CSS出力の仕組みまでが刷新されており、v3からの移行には一定の理解が必要です。

本記事では、Tailwind CSS v4のすべての主要変更点を実装例とともに解説します。CSS-first設定から新しいユーティリティクラス、パフォーマンス向上の背景まで、フロントエンド開発者が知るべき情報を網羅しています。

---

## 1. Tailwind CSS v4の変更点概要 — v3との主要な違い

### アーキテクチャの根本的な変更

v3まで、Tailwind CSSはNode.jsベースのPostCSSプラグインとして動作し、`tailwind.config.js`（または`tailwind.config.ts`）で設定を管理していました。v4ではこのアプローチを廃止し、**CSSファイル自体が設定の主役**となる「CSS-first」設計に移行しています。

主な変更点を一覧で把握しておきましょう。

| 項目 | v3 | v4 |
|------|----|----|
| 設定ファイル | `tailwind.config.js` | CSSの`@theme`指令 |
| エントリポイント | PostCSSプラグイン | `@import "tailwindcss"` |
| カスタムバリアント | `addVariant()` | `@variant` |
| カスタムユーティリティ | `addUtilities()` | `@utility` |
| カラーパレット | HSL | oklch（P3色域対応） |
| ビルドエンジン | Rust（Lightning CSS） | Oxide（さらに高速化） |
| コンテナクエリ | プラグイン別途必要 | 組み込み済み |
| 3D Transform | 非対応 | `rotate-x`・`rotate-y`等 |

### なぜCSS-firstに移行したのか

JavaScript設定ファイルをCSSに統合することで、以下のメリットが生まれます。

- **ツールチェーンの簡素化**: Node.jsの設定ファイルが不要になり、バンドラーとの統合がシンプルになる
- **IDEサポートの向上**: CSSとして扱われるため、標準的なCSSの補完が効く
- **カスケードの活用**: CSSのカスケードと変数（CSS Custom Properties）を自然に組み合わせられる
- **ビルド速度の向上**: JavaScriptの設定解析が不要になり、コールドスタートが速い

---

## 2. CSS-first設定 — `@import "tailwindcss"` と `tailwind.config.js` の廃止

### インストール

```bash
npm install tailwindcss@next @tailwindcss/vite
```

Viteを使う場合は`@tailwindcss/vite`プラグインを利用します。PostCSSを使う場合は`@tailwindcss/postcss`を使います。

### Vite設定

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
})
```

### PostCSS設定（非Vite環境）

```javascript
// postcss.config.js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

### CSSエントリポイント

v4では、`tailwind.config.js`の代わりにCSSファイルの先頭に1行追加するだけで動作します。

```css
/* app.css — v4の最小構成 */
@import "tailwindcss";
```

v3では以下のような3行が必要でした。

```css
/* v3 — 旧来の書き方 */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

この変更により、設定のエントリポイントがJavaScriptからCSSに移動しました。`tailwind.config.js`ファイルは完全に不要になります（後述する移行セクションで詳しく説明します）。

---

## 3. `@theme` 指令 — カスタムデザイントークンの定義

### 基本構文

`@theme`はv4最大の新機能の一つで、デザイントークン（カラー・スペーシング・フォントなど）をCSSファイル内で直接定義できます。

```css
@import "tailwindcss";

@theme {
  /* カスタムカラー */
  --color-brand: oklch(60% 0.2 250);
  --color-brand-light: oklch(80% 0.15 250);
  --color-brand-dark: oklch(40% 0.25 250);

  /* カスタムフォントファミリー */
  --font-display: 'Noto Sans JP', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* カスタムスペーシング */
  --spacing-18: 4.5rem;
  --spacing-22: 5.5rem;

  /* カスタムブレークポイント */
  --breakpoint-xs: 480px;
  --breakpoint-3xl: 1920px;

  /* カスタムボーダー半径 */
  --radius-xl: 1rem;
  --radius-2xl: 1.5rem;

  /* カスタムシャドウ */
  --shadow-card: 0 4px 24px oklch(0% 0 0 / 0.08);
}
```

`@theme`で定義した変数は、自動的にTailwindのユーティリティクラスとして使えるようになります。

```html
<!-- --color-brand が bg-brand, text-brand, border-brand として使える -->
<div class="bg-brand text-white px-18 rounded-xl shadow-card">
  カスタムトークンが反映されたコンポーネント
</div>
```

### CSS Custom Propertiesとしても利用可能

`@theme`で定義した変数は、通常のCSS Custom Propertiesとしても参照できます。

```css
.custom-component {
  background-color: var(--color-brand);
  font-family: var(--font-display);
  padding: var(--spacing-18);
}
```

### テーマの継承と拡張

v3の`extend`オプションに相当するものとして、v4では`@theme`ブロック内の変数が既存テーマに追加（上書き）されます。既存トークンを完全にリセットしたい場合は`@theme reset`を使います。

```css
/* 既存テーマに追加 */
@theme {
  --color-custom: oklch(50% 0.18 320);
}

/* デフォルトテーマをリセットして独自テーマのみに */
@theme reset {
  --color-primary: oklch(60% 0.2 250);
  --color-secondary: oklch(55% 0.15 180);
}
```

---

## 4. `@variant` 指令 — カスタムバリアントの定義

### 基本構文

v3では`addVariant()`関数をプラグインで記述していたカスタムバリアントが、v4では`@variant`指令でCSSファイル内に書けます。

```css
@import "tailwindcss";

/* ダークモード（data属性ベース） */
@variant dark (&:where([data-theme=dark] *));

/* 印刷用バリアント */
@variant print {
  @media print {
    @slot;
  }
}

/* RTL（右から左）バリアント */
@variant rtl (&:where([dir=rtl] *));

/* 高コントラストモード */
@variant high-contrast {
  @media (forced-colors: active) {
    @slot;
  }
}

/* カスタム属性バリアント */
@variant loading (&[data-loading]);
@variant error (&[data-error]);
@variant expanded (&[aria-expanded=true]);
```

### 実際の使用例

```html
<!-- カスタムバリアントを使ったコンポーネント -->
<div data-theme="dark">
  <button
    class="bg-white dark:bg-gray-800 text-black dark:text-white
           print:border print:border-gray-300
           loading:opacity-50 loading:cursor-wait
           error:border-red-500 error:bg-red-50"
    data-loading
  >
    ボタン
  </button>
</div>
```

```css
/* 複合バリアントの定義 */
@variant focus-visible-within (&:has(:focus-visible));
@variant interactive (&:not([disabled]):not([aria-disabled=true]));
```

---

## 5. `@utility` 指令 — カスタムユーティリティの定義

### 基本構文

v3では`addUtilities()`プラグイン関数を使っていたカスタムユーティリティが、v4では`@utility`で直接CSSに定義できます。

```css
@import "tailwindcss";

/* シンプルなカスタムユーティリティ */
@utility scrollbar-hide {
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}

@utility text-balance {
  text-wrap: balance;
}

@utility text-pretty {
  text-wrap: pretty;
}

/* グラスモーフィズム */
@utility glass {
  background: oklch(100% 0 0 / 0.1);
  backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid oklch(100% 0 0 / 0.2);
}

/* フルスクリーン中央配置 */
@utility center-absolute {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
```

### バリアント対応のカスタムユーティリティ

```css
/* hover・focus等のバリアントと組み合わせられる */
@utility card-hover {
  transition: transform 150ms ease, box-shadow 150ms ease;
  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-card);
  }
}
```

```html
<div class="scrollbar-hide overflow-y-auto h-64">
  スクロールバーが非表示のコンテナ
</div>

<article class="glass rounded-2xl p-6 card-hover">
  グラスモーフィズムカード
</article>

<h1 class="text-balance text-4xl font-bold">
  テキストが美しくバランスされる見出し
</h1>
```

---

## 6. 新しいカラーパレット — oklch と P3色域

### oklchとは

v4では、デフォルトのカラーパレットがHSL（Hue, Saturation, Lightness）から**oklch**（Oklab Lightness Chroma Hue）に変更されました。

oklchの主なメリット：

- **知覚的均一性**: 明度値が実際の明るさの知覚に対応する（HSLは知覚と一致しない）
- **P3色域対応**: 現代のモニター（iPhone・MacBook・iPad等）が表示できる広い色域をフルに活用
- **予測可能なカラースケール**: 同じL値のカラーは同じ明るさに見える

```css
@theme {
  /* oklch(明度 彩度 色相) */
  --color-blue-500: oklch(62.3% 0.214 259.8);
  --color-green-500: oklch(72.3% 0.199 142.5);
  --color-red-500: oklch(63.7% 0.237 25.3);

  /* 透明度付き */
  --color-overlay: oklch(0% 0 0 / 0.5);

  /* P3色域の鮮やかな色（P3対応モニターでのみ発色） */
  --color-vivid-blue: oklch(65% 0.28 265);
}
```

### 実際のカラーパレット使用例

```html
<!-- v4のデフォルトカラーはそのまま使える -->
<div class="bg-blue-500 text-white">
  P3色域対応のblue-500
</div>

<div class="bg-gradient-to-r from-violet-500 to-fuchsia-500">
  oklchベースのグラデーション（より鮮やか）
</div>
```

### 透明度の扱いの変化

v4では、透明度ユーティリティがCSS Relative Colorとして実装されており、パフォーマンスと予測可能性が向上しています。

```html
<!-- v4の透明度（oklchと完全に互換） -->
<div class="bg-blue-500/20 border border-blue-500/40">
  20%透明のblue-500背景
</div>
```

---

## 7. コンテナクエリ — `@container`・`@sm`/`@md` 対応

### コンテナクエリの概要

v3では`@tailwindcss/container-queries`プラグインが必要でしたが、v4では**コンテナクエリが組み込み機能**として提供されます。

コンテナクエリを使うと、ビューポートのサイズではなく**親コンテナのサイズ**に応じてスタイルを変更できます。再利用性の高いコンポーネント設計に非常に有効です。

### 基本的な使い方

```html
<!-- コンテナを定義 -->
<div class="@container">
  <!-- コンテナサイズに応じてレイアウトが変わる -->
  <div class="flex flex-col @md:flex-row gap-4">
    <img class="w-full @md:w-48 rounded-lg" src="image.jpg" alt="" />
    <div class="flex-1">
      <h2 class="text-lg @lg:text-2xl font-bold">タイトル</h2>
      <p class="text-sm @md:text-base text-gray-600">説明テキスト</p>
    </div>
  </div>
</div>
```

### コンテナクエリのブレークポイント

| クラス | コンテナ幅 |
|--------|-----------|
| `@xs:` | 320px以上 |
| `@sm:` | 384px以上 |
| `@md:` | 448px以上 |
| `@lg:` | 512px以上 |
| `@xl:` | 576px以上 |
| `@2xl:` | 672px以上 |

### 名前付きコンテナ

```html
<!-- 複数のネストされたコンテナがある場合 -->
<div class="@container/sidebar">
  <div class="@container/main">
    <!-- @md/sidebar はsidebarコンテナの幅に反応 -->
    <!-- @md/main はmainコンテナの幅に反応 -->
    <div class="@md/sidebar:hidden @lg/main:block">
      サイドバーが広い時は非表示、メインが広い時は表示
    </div>
  </div>
</div>
```

### カードコンポーネントの実装例

```html
<!-- コンテナクエリを使った自律的なカード -->
<article class="@container rounded-xl border border-gray-200 overflow-hidden">
  <div class="flex flex-col @sm:flex-row">
    <div class="@sm:w-40 @md:w-56 flex-shrink-0">
      <img class="w-full h-48 @sm:h-full object-cover" src="thumb.jpg" alt="" />
    </div>
    <div class="p-4 @md:p-6 flex flex-col justify-between">
      <div>
        <span class="text-xs @md:text-sm text-blue-600 font-semibold uppercase tracking-wide">
          カテゴリ
        </span>
        <h3 class="mt-1 text-lg @lg:text-xl font-bold text-gray-900 leading-tight">
          記事タイトル
        </h3>
        <p class="mt-2 text-sm @md:text-base text-gray-600 hidden @sm:block">
          記事の概要テキスト...
        </p>
      </div>
      <div class="mt-4 flex items-center justify-between">
        <span class="text-xs @md:text-sm text-gray-400">2026年2月20日</span>
        <a href="#" class="text-sm font-medium text-blue-600 hover:text-blue-800">
          続きを読む →
        </a>
      </div>
    </div>
  </div>
</article>
```

---

## 8. 3D Transforms — `rotate-x`・`rotate-y`・`perspective`

### v4で追加された3D変換ユーティリティ

v4では3Dトランスフォームのユーティリティが組み込みで追加されました。v3では手動でCSS変数を使う必要がありましたが、v4からはクラス指定だけで3D効果が使えます。

```html
<!-- X軸・Y軸の回転 -->
<div class="rotate-x-45">X軸45度回転</div>
<div class="rotate-y-12">Y軸12度回転</div>
<div class="rotate-z-6">Z軸6度回転（通常のrotateと同じ）</div>

<!-- パースペクティブ設定 -->
<div class="perspective-500">
  <div class="rotate-y-45">パース付きY軸回転</div>
</div>

<!-- 変換スタイル（3Dの継承） -->
<div class="transform-style-3d perspective-1000">
  <div class="rotate-x-30 rotate-y-15">
    3D空間での複合回転
  </div>
</div>
```

### カード反転アニメーション

```html
<style>
.flip-card {
  perspective: 1000px;
}
.flip-inner {
  transition: transform 0.6s;
  transform-style: preserve-3d;
}
.flip-card:hover .flip-inner {
  transform: rotateY(180deg);
}
.flip-front,
.flip-back {
  backface-visibility: hidden;
}
.flip-back {
  transform: rotateY(180deg);
}
</style>

<!-- Tailwind v4の3Dユーティリティ + カスタムCSS -->
<div class="flip-card w-64 h-40">
  <div class="flip-inner relative w-full h-full">
    <div class="flip-front absolute inset-0 bg-blue-500 rounded-xl flex items-center justify-center">
      <span class="text-white font-bold text-xl">表面</span>
    </div>
    <div class="flip-back absolute inset-0 bg-purple-500 rounded-xl flex items-center justify-center">
      <span class="text-white font-bold text-xl">裏面</span>
    </div>
  </div>
</div>
```

### 利用可能な3Dトランスフォームクラス

```html
<!-- パースペクティブ -->
<div class="perspective-250">浅いパース</div>
<div class="perspective-500">標準パース</div>
<div class="perspective-750">深いパース</div>
<div class="perspective-1000">さらに深いパース</div>

<!-- 変換原点 -->
<div class="rotate-x-45 origin-top">上端を軸にX回転</div>
<div class="rotate-y-45 origin-left">左端を軸にY回転</div>

<!-- スケール3D -->
<div class="scale-z-75">Z方向に75%スケール</div>

<!-- translate3D -->
<div class="translate-z-4">Z方向に移動（前に出る）</div>
```

---

## 9. 新しいグラデーション — グラデーション角度・from/to percent

### 任意角度のグラデーション

v4では、グラデーションの角度をより柔軟に指定できるようになりました。

```html
<!-- 従来の方向指定（v3から継続） -->
<div class="bg-gradient-to-r from-blue-500 to-purple-500">左から右</div>
<div class="bg-gradient-to-br from-cyan-400 to-blue-600">左上から右下</div>

<!-- v4の任意角度指定（JIT値） -->
<div class="bg-linear-[135deg] from-rose-500 via-orange-500 to-yellow-400">
  135度グラデーション
</div>

<div class="bg-linear-[to_right_in_oklab] from-blue-500 to-red-500">
  oklab色空間でのグラデーション（中間色が自然）
</div>
```

### from/to のパーセント指定

```html
<!-- グラデーションの色の開始・終了位置を指定 -->
<div class="bg-gradient-to-r from-blue-500 from-10% via-purple-500 via-50% to-pink-500 to-90%">
  位置指定付きグラデーション
</div>

<!-- via の位置指定 -->
<div class="bg-gradient-to-r from-green-400 via-blue-500 via-[60%] to-purple-600">
  60%地点でvia色
</div>
```

### コニックグラデーション・放射グラデーション

```html
<!-- 放射グラデーション -->
<div class="bg-radial from-white to-blue-600 rounded-full w-32 h-32">
  放射状グラデーション
</div>

<!-- コニックグラデーション -->
<div class="bg-conic from-red-500 via-yellow-500 via-green-500 to-blue-500 rounded-full w-32 h-32">
  円錐グラデーション（カラーホイール風）
</div>
```

### グラデーションテキスト

```html
<h1 class="text-4xl font-black bg-gradient-to-r from-violet-600 via-pink-500 to-orange-400 bg-clip-text text-transparent">
  グラデーションテキスト
</h1>
```

---

## 10. フォームスタイリング — `@tailwindcss/forms` v4対応

### インストール

```bash
npm install @tailwindcss/forms@next
```

### CSS設定

```css
@import "tailwindcss";
@plugin "@tailwindcss/forms";
```

v3では`tailwind.config.js`の`plugins`配列に追加していましたが、v4では`@plugin`指令を使います。

### フォームの実装例

```html
<!-- フォームプラグインによりデフォルトスタイルが適用される -->
<form class="max-w-lg mx-auto space-y-6 p-6">
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-1">
      お名前
    </label>
    <input
      type="text"
      class="w-full rounded-lg border-gray-300 shadow-sm
             focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
             transition-colors"
      placeholder="山田 太郎"
    />
  </div>

  <div>
    <label class="block text-sm font-medium text-gray-700 mb-1">
      メールアドレス
    </label>
    <input
      type="email"
      class="w-full rounded-lg border-gray-300 shadow-sm
             focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
             transition-colors"
      placeholder="example@email.com"
    />
  </div>

  <div>
    <label class="block text-sm font-medium text-gray-700 mb-1">
      カテゴリ
    </label>
    <select
      class="w-full rounded-lg border-gray-300 shadow-sm
             focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
    >
      <option>技術相談</option>
      <option>デザイン依頼</option>
      <option>その他</option>
    </select>
  </div>

  <div>
    <label class="block text-sm font-medium text-gray-700 mb-1">
      メッセージ
    </label>
    <textarea
      rows="4"
      class="w-full rounded-lg border-gray-300 shadow-sm
             focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
             resize-none transition-colors"
      placeholder="お問い合わせ内容を入力..."
    ></textarea>
  </div>

  <button
    type="submit"
    class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold
           py-3 px-6 rounded-lg transition-colors focus:outline-none
           focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
  >
    送信する
  </button>
</form>
```

### `@plugin` 指令の使い方

v4では、`@plugin`でサードパーティプラグインをCSSから直接読み込めます。

```css
@import "tailwindcss";

/* 公式プラグイン */
@plugin "@tailwindcss/forms";
@plugin "@tailwindcss/typography";
@plugin "@tailwindcss/aspect-ratio";

/* カスタムプラグイン */
@plugin "./plugins/animations.js";
```

---

## 11. Next.js / Vite 統合

### Next.js 15 + Tailwind CSS v4

```bash
# 新規プロジェクト作成（v4対応済み）
npx create-next-app@latest my-app --tailwind

# 既存プロジェクトへのインストール
npm install tailwindcss@next @tailwindcss/postcss
```

Next.jsプロジェクトでは、PostCSSプラグインを使います。

```javascript
// postcss.config.mjs
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}
```

```typescript
// app/layout.tsx
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${geist.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
```

### Vite + Tailwind CSS v4

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install tailwindcss @tailwindcss/vite
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})
```

```css
/* src/index.css */
@import "tailwindcss";

@theme {
  --color-primary: oklch(60% 0.22 250);
  --color-secondary: oklch(55% 0.18 320);
}
```

### SvelteKit + Tailwind CSS v4

```bash
npx sv create my-app
cd my-app
npm install tailwindcss @tailwindcss/vite
```

```typescript
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
  ],
})
```

---

## 12. v3 → v4 マイグレーション手順

### 自動移行ツール

Tailwind CSS公式の移行ツールを使うと、多くの変更を自動で対応できます。

```bash
npx @tailwindcss/upgrade@next
```

このツールは以下を自動で実行します。

- `tailwind.config.js`の内容を`@theme`指令に変換
- `@tailwind base/components/utilities`を`@import "tailwindcss"`に置換
- 廃止されたクラス名を新しいクラス名にリネーム
- PostCSS設定を更新

### Breaking Changes一覧

#### クラス名の変更

| v3 | v4 | 変更理由 |
|----|----|----|
| `shadow-sm` | `shadow-xs` | スケールの整合性 |
| `shadow` | `shadow-sm` | スケールの整合性 |
| `shadow-md` | `shadow-md` | 変更なし |
| `blur-sm` | `blur-xs` | スケールの整合性 |
| `blur` | `blur-sm` | スケールの整合性 |
| `rounded` | `rounded-sm` | スケールの整合性 |
| `ring` | `ring-3` | 明示的な数値 |
| `text-opacity-50` | `text-black/50` | 透明度構文統一 |
| `bg-opacity-75` | `bg-white/75` | 透明度構文統一 |
| `flex-grow` | `grow` | 短縮形 |
| `flex-shrink` | `shrink` | 短縮形 |
| `overflow-ellipsis` | `text-ellipsis` | 命名一貫性 |
| `decoration-slice` | `box-decoration-slice` | CSS仕様準拠 |

#### 設定方法の変更

```css
/* v3 (tailwind.config.js) → v4 (@theme) の対応 */

/* v3 */
/* module.exports = {
  theme: {
    extend: {
      colors: {
        brand: '#3B82F6',
      },
      fontFamily: {
        display: ['Noto Sans JP', 'sans-serif'],
      },
    },
  },
} */

/* v4 */
@theme {
  --color-brand: oklch(60% 0.22 250);
  --font-display: 'Noto Sans JP', sans-serif;
}
```

#### カスタムバリアント・ユーティリティの移行

```javascript
// v3 (tailwind.config.js)
// const plugin = require('tailwindcss/plugin')
// module.exports = {
//   plugins: [
//     plugin(function({ addVariant, addUtilities }) {
//       addVariant('hocus', ['&:hover', '&:focus'])
//       addUtilities({
//         '.scrollbar-hide': {
//           '-ms-overflow-style': 'none',
//           'scrollbar-width': 'none',
//           '&::-webkit-scrollbar': { display: 'none' },
//         },
//       })
//     }),
//   ],
// }
```

```css
/* v4 (@variant / @utility) */
@variant hocus (&:hover, &:focus);

@utility scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}
```

### 手動対応が必要な変更

1. **PostCSSプラグインのアップデート**: `tailwindcss`から`@tailwindcss/postcss`に変更
2. **コンテンツ設定の削除**: v4ではソースファイルを自動検出するため、`content`設定は不要
3. **カスタムプラグインのリファクタリング**: `addVariant`/`addUtilities`を使うプラグインは`@variant`/`@utility`に移行
4. **`@apply`の見直し**: 大部分は動作するが、一部のプラグインクラスへの`@apply`は動作が変わる場合がある

### マイグレーション後の確認リスト

- [ ] ビルドが成功する
- [ ] 全ページの見た目が意図通り
- [ ] シャドウ・ブラー・角丸のサイズ感が正しい（スケール変更に注意）
- [ ] カスタムカラーが正しく表示される
- [ ] ダークモードが機能する
- [ ] フォームスタイルが崩れていない
- [ ] コンテナクエリが正しく動作する

---

## 13. パフォーマンス向上 — ビルド速度・バンドルサイズ削減

### Oxideエンジン（v4のビルドエンジン）

v4は内部ビルドエンジンを**Oxide**に刷新しました。v3でもRust製のLightning CSSを使っていましたが、v4ではさらに最適化されています。

#### 速度向上の数値

公式ベンチマーク（Tailwind公式ブログ）によると：

- **フルビルド（コールドスタート）**: v3比で約5倍高速
- **インクリメンタルビルド**: v3比で約100倍高速（変更ファイルのみ再処理）

実際の開発体験への影響：

- 大規模プロジェクトでも開発サーバーの起動が数秒以内に
- ファイル変更時のHMR（Hot Module Replacement）が体感ゼロ遅延に近い
- CIパイプラインのビルド時間が大幅に短縮

### コンテンツ自動検出

v3では`tailwind.config.js`に`content`の配列を明示的に設定する必要がありました。

```javascript
// v3 — 手動設定が必要
module.exports = {
  content: [
    './src/**/*.{html,js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
}
```

v4では、プロジェクト内のソースファイルを**自動検出**するため、この設定が不要です。`node_modules`や`.git`などは自動的に除外されます。

明示的に含める・除外するパスを指定したい場合は`@source`指令を使います。

```css
@import "tailwindcss";

/* 特定パスを明示的に追加 */
@source "../components";
@source "../../shared/ui";

/* 特定パターンを除外 */
@source not "../legacy";
```

### バンドルサイズへの影響

v4は、実際に使用されているユーティリティクラスだけをCSSに出力します（これはv3と同様）。加えて、v4では：

- **CSS変数の最適化**: `@theme`で定義したトークンがCSS Custom Propertiesとして出力されるため、重複が削減される
- **レイヤーの最適化**: CSSカスケードレイヤー（`@layer`）を内部で適切に使用し、specificity問題を回避
- **未使用トークンの削除**: `@theme`で定義したが使われなかったトークンは出力されない

### `@source inline` による追加クラスの安全な追加

動的に生成されるクラス名（JavaScriptでクラス名を構築する場合など）には`@source inline`を使います。

```css
/* 動的クラス名のセーフリスト */
@source inline('bg-red-{100..900}');
@source inline('text-{sm,base,lg,xl,2xl}');
@source inline('{p,m}-{1..12}');
```

```html
<!-- JavaScriptで動的に生成されるクラスも安全に使える -->
<div id="dynamic-element"></div>
<script>
  const colors = ['red', 'blue', 'green']
  const shade = 500
  // @source inlineがあれば bg-red-500, bg-blue-500, bg-green-500 が出力される
  element.className = `bg-${colors[0]}-${shade}`
</script>
```

---

## 実践的な実装例 — v4でのUIコンポーネント

### デザインシステムのセットアップ

```css
/* design-system.css */
@import "tailwindcss";

@theme {
  /* ブランドカラー */
  --color-brand-50: oklch(97% 0.03 250);
  --color-brand-100: oklch(93% 0.07 250);
  --color-brand-200: oklch(87% 0.12 250);
  --color-brand-300: oklch(78% 0.16 250);
  --color-brand-400: oklch(68% 0.20 250);
  --color-brand-500: oklch(60% 0.22 250);
  --color-brand-600: oklch(52% 0.22 250);
  --color-brand-700: oklch(44% 0.20 250);
  --color-brand-800: oklch(36% 0.16 250);
  --color-brand-900: oklch(28% 0.12 250);

  /* タイポグラフィ */
  --font-sans: 'Noto Sans JP', ui-sans-serif, system-ui;
  --font-heading: 'Noto Serif JP', ui-serif, serif;

  /* スペーシング拡張 */
  --spacing-18: 4.5rem;
  --spacing-22: 5.5rem;
  --spacing-88: 22rem;
  --spacing-96: 24rem;

  /* アニメーション */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --duration-fast: 150ms;
  --duration-base: 250ms;
  --duration-slow: 400ms;
}

/* カスタムバリアント */
@variant dark (&:where(.dark *));
@variant hocus (&:hover, &:focus-visible);
@variant group-hocus (:where(.group):hover &, :where(.group):focus-visible &);

/* カスタムユーティリティ */
@utility scrollbar-hide {
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}

@utility text-balance {
  text-wrap: balance;
}

@utility focus-ring {
  outline: 2px solid var(--color-brand-500);
  outline-offset: 2px;
}
```

### レスポンシブナビゲーション

```html
<nav class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between h-16">
      <!-- ロゴ -->
      <a href="/" class="flex items-center gap-2 group">
        <span class="w-8 h-8 rounded-lg bg-brand-500 group-hocus:bg-brand-600 transition-colors"></span>
        <span class="font-heading font-bold text-lg text-gray-900 dark:text-white">
          TechBoost
        </span>
      </a>

      <!-- デスクトップメニュー -->
      <div class="hidden md:flex items-center gap-1">
        <a href="/articles" class="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors">
          記事
        </a>
        <a href="/tools" class="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors">
          ツール
        </a>
        <a href="/about" class="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors">
          About
        </a>
      </div>

      <!-- CTA -->
      <a href="/subscribe" class="hidden sm:block bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors focus-ring">
        購読する
      </a>
    </div>
  </div>
</nav>
```

### コンテナクエリを使ったプロダクトカード

```html
<!-- グリッドに配置されたカード（幅によって自動的にレイアウト変更） -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  <article class="@container group">
    <div class="flex flex-col @[280px]:flex-row gap-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-card hover:shadow-lg transition-shadow">
      <div class="@[280px]:w-24 @[280px]:h-24 w-full aspect-video @[280px]:aspect-auto flex-shrink-0">
        <img class="w-full h-full object-cover rounded-xl" src="product.jpg" alt="プロダクト" />
      </div>
      <div class="flex flex-col justify-between min-w-0">
        <div>
          <p class="text-xs font-semibold text-brand-600 uppercase tracking-wide">ツール</p>
          <h3 class="mt-1 font-bold text-gray-900 dark:text-white text-balance leading-snug">
            プロダクト名
          </h3>
          <p class="mt-1.5 text-sm text-gray-500 dark:text-gray-400 hidden @[280px]:block line-clamp-2">
            プロダクトの説明テキスト
          </p>
        </div>
        <div class="mt-3 flex items-center justify-between">
          <span class="text-lg font-bold text-gray-900 dark:text-white">¥2,980</span>
          <button class="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
            詳細 →
          </button>
        </div>
      </div>
    </div>
  </article>
</div>
```

---

## CSS単位変換とTailwindの実用Tips

Tailwind CSS v4では、CSSの値を直接扱う場面が増えます。特に`@theme`指令でのトークン定義や、`[arbitrary-value]`の使用時には、`rem`・`px`・`em`の変換が頻繁に必要になります。

たとえば「`--spacing-18: 4.5rem`を定義したが、これは何pxか？」「デザインカンプのpx値をremに変換したい」といった場面は実際の開発で毎日発生します。

こうした単位変換・CSS計算には **[DevToolBox](https://usedevtools.com/)** が役立ちます。ブラウザ上でpx ↔ rem変換、viewportユニット計算、oklchカラー変換など、フロントエンド開発に必要な計算が一括して行えるため、Tailwind v4での開発効率が向上します。CSSの単位をまたいだ作業が多いv4プロジェクトでぜひ活用してみてください。

---

## まとめ

Tailwind CSS v4は、以下の面で大きく進化しました。

**設定の簡素化**
- `tailwind.config.js`を廃止し、CSS-first設定に移行
- `@theme`・`@variant`・`@utility`でCSSファイル内に完結

**モダンなCSS対応**
- oklch・P3色域によるより鮮やかで均一なカラーパレット
- コンテナクエリの組み込みサポート
- 3Dトランスフォームユーティリティ
- 改善されたグラデーション構文

**パフォーマンス**
- Oxideエンジンによる大幅なビルド速度向上
- ソースファイルの自動検出
- インクリメンタルビルドの最適化

**エコシステム統合**
- Vite・Next.js・SvelteKitとのファーストクラス統合
- `@plugin`指令による公式プラグインのCSS統合

v3からの移行は`npx @tailwindcss/upgrade@next`で自動化できますが、シャドウ・ブラー・角丸のスケール変更やカスタムバリアント・ユーティリティの書き換えは手動確認が必要です。プロジェクト規模によっては段階的な移行が安全です。

v4はCSSの標準仕様への準拠を強め、長期的にはJavaScriptへの依存をさらに減らす方向性を示しています。新規プロジェクトはv4から始め、既存プロジェクトも計画的に移行を進めることを推奨します。

---

## 参考リンク

- [Tailwind CSS v4 公式ドキュメント](https://tailwindcss.com/docs)
- [Tailwind CSS v4 リリースブログ](https://tailwindcss.com/blog/tailwindcss-v4)
- [v3 → v4 マイグレーションガイド](https://tailwindcss.com/docs/upgrade-guide)
- [oklch カラーピッカー](https://oklch.com/)
- [DevToolBox — CSSユーティリティツール](https://usedevtools.com/)

---
title: 'Tailwind CSS v4 完全移行ガイド【2026年版】'
description: 'Tailwind CSS v4の新機能と破壊的変更を解説。v3からv4への移行手順、@theme変数、CSS-firstアプローチ、Vite/Next.js対応まで網羅。'
pubDate: '2026-02-22'
heroImage: '../../assets/thumbnails/tailwindcss-v4-migration-guide.jpg'
tags: ['tailwindcss', 'css', 'frontend', 'migration']
---

Tailwind CSS v4は既存の `tailwind.config.js` を廃止し、CSS ファイル自体で設定を完結させる「CSS-first」アーキテクチャに移行した。v3プロジェクトを v4 に移行する際、設定ファイルの書き方・クラス名・プラグイン API がすべて変わるため、チームとして体系的な移行計画が必要になる。

本記事は「v3 を実際に使っているチームが v4 へ移行する」ことを前提とした実践的な移行ガイドだ。新機能の概説ではなく、**破壊的変更の全一覧・移行手順・よくあるエラーの解決策**に絞って解説する。

---

## v4 移行の全体像

移行作業は大きく 5 つのフェーズに分かれる。

1. **環境整備** — Node.js バージョン確認・パッケージ更新
2. **設定ファイル移行** — `tailwind.config.js` → CSS `@theme`
3. **クラス名・ユーティリティの修正** — 削除・リネームされた v3 クラスを置換
4. **フレームワーク統合の調整** — Vite / Next.js / Astro の設定を v4 対応に更新
5. **動作確認・スナップショットテスト** — ビジュアルリグレッションの検出

移行ツール（公式 CLI）を使うと自動変換できる部分も多いが、すべては自動化されない。各フェーズで人手が必要な箇所を明示しながら進める。

---

## Phase 1: 環境整備

### 前提条件の確認

Tailwind CSS v4 は以下の環境を必要とする。

- **Node.js 18.12 以上**（推奨: Node.js 22 LTS）
- **PostCSS 8.4 以上**（Vite を使う場合は PostCSS 不要）
- **Vite 5.4 以上 / Next.js 14.1 以上 / Astro 4.5 以上**

```bash
# Node.js バージョン確認
node --version  # v18.12.0 以上であること

# 現在のパッケージバージョン確認
npm list tailwindcss postcss autoprefixer
```

### パッケージの更新

```bash
# v4 と Vite プラグインをインストール（Vite プロジェクトの場合）
npm install -D tailwindcss@next @tailwindcss/vite@next

# Next.js プロジェクトの場合
npm install -D tailwindcss@next @tailwindcss/postcss@next

# 公式移行ツールをインストール
npm install -D @tailwindcss/upgrade
```

### 自動移行ツールの実行

```bash
# プロジェクトルートで実行（Git ワーキングツリーがクリーンな状態で）
npx @tailwindcss/upgrade
```

このツールが自動変換してくれるもの:
- `tailwind.config.js` の `theme.colors` → CSS `@theme` 変数
- `@tailwind base/components/utilities` → `@import "tailwindcss"`
- 削除されたユーティリティクラス名の自動リネーム（一部）
- PostCSS の設定調整

**ただし以下は自動変換されない**。後続フェーズで手動対応が必要だ。

- `theme()` 関数の参照（CSS カスタムプロパティへの書き換え）
- カスタムプラグイン（`addUtilities` / `addComponents` → `@utility` / `@variant`）
- `safelist` / `blocklist` の設定
- `darkMode: 'class'` 等の動作モード変更

---

## Phase 2: 設定ファイルの移行

### v3 の設定ファイル構造

```javascript
// tailwind.config.js（v3）
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '112': '28rem',
      },
    },
  },
  plugins: [],
}
```

### v4 の CSS-first 設定

v4 では `tailwind.config.js` を削除し、CSS ファイルに設定を移行する。

```css
/* src/globals.css（v4） */
@import "tailwindcss";

@theme {
  /* カラーパレット */
  --color-brand-50:  #eff6ff;
  --color-brand-500: #3b82f6;
  --color-brand-900: #1e3a8a;

  /* フォントファミリー */
  --font-family-sans: 'Inter', sans-serif;

  /* スペーシング */
  --spacing-18:  4.5rem;
  --spacing-112: 28rem;
}
```

### content の設定（v4 では自動検出）

v4 では `content` 設定が不要になった。Oxide エンジンが自動的にファイルをスキャンする。ただし明示的に除外したい場合は `@source` を使う。

```css
/* 特定ディレクトリを除外する場合 */
@import "tailwindcss";
@source not "../node_modules";
@source not "../dist";
```

### darkMode 設定の移行

```css
/* v3: tailwind.config.js で darkMode: 'class' */
/* v4: CSS で @variant を使う */

@import "tailwindcss";

@variant dark (&:where(.dark, .dark *));
```

---

## Phase 3: 破壊的変更一覧と対処法

v3 から v4 への移行で最も注意が必要な破壊的変更をまとめる。

### 3-1. 削除・リネームされたクラス

| v3 クラス | v4 での代替 | 備考 |
|-----------|------------|------|
| `shadow-sm` | `shadow-xs` | サイズ名が1段階シフト |
| `shadow` | `shadow-sm` | デフォルトシャドウが変更 |
| `shadow-md` | `shadow-md` | 変更なし |
| `blur` | `blur-sm` | ブラーも同様にシフト |
| `rounded` | `rounded-sm` | 角丸も変更 |
| `ring` | `ring-3` | リングの太さを明示 |
| `text-opacity-*` | `text-{color}/{opacity}` | スラッシュ記法に統一 |
| `bg-opacity-*` | `bg-{color}/{opacity}` | 同上 |
| `border-opacity-*` | `border-{color}/{opacity}` | 同上 |

```html
<!-- v3 -->
<div class="shadow bg-blue-500 bg-opacity-75 text-white text-opacity-90">

<!-- v4 -->
<div class="shadow-sm bg-blue-500/75 text-white/90">
```

### 3-2. `theme()` 関数の廃止

v3 では CSS 内で `theme()` 関数を使ってトークンを参照できた。v4 では CSS カスタムプロパティを直接使う。

```css
/* v3 */
.custom-element {
  background-color: theme('colors.brand.500');
  padding: theme('spacing.4');
}

/* v4 */
.custom-element {
  background-color: var(--color-brand-500);
  padding: var(--spacing-4);
}
```

### 3-3. カスタムプラグインの書き換え

v3 のプラグイン API は v4 で動作しない。`@utility` と `@variant` に書き換える必要がある。

```javascript
// v3: JavaScript プラグイン
// tailwind.config.js
const plugin = require('tailwindcss/plugin')

module.exports = {
  plugins: [
    plugin(function({ addUtilities, addVariant }) {
      addUtilities({
        '.text-balance': { 'text-wrap': 'balance' },
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
      })
      addVariant('hocus', ['&:hover', '&:focus'])
    }),
  ],
}
```

```css
/* v4: CSS @utility と @variant */
@utility text-balance {
  text-wrap: balance;
}

@utility scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}

@variant hocus (&:hover, &:focus);
```

### 3-4. Preflight の変更

v4 の Preflight（CSS リセット）にいくつかの変更が加えられている。

- `border-color` のデフォルトが `currentColor` から `--color-gray-200` に変更
- `placeholder` の色がデフォルトで `--color-gray-500` に

既存のカスタムリセットが競合する場合は `@layer base` 内で上書きする。

```css
@import "tailwindcss";

@layer base {
  /* Preflight の挙動を上書き */
  *, *::before, *::after {
    border-color: theme(colors.gray.300);
  }
}
```

---

## Phase 4: フレームワーク統合の更新

### Vite との統合

v4 では PostCSS プラグインではなく専用の Vite プラグインを使うことが推奨される。

```typescript
// vite.config.ts（v4 対応）
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    tailwindcss(),  // PostCSS の代わりにここで設定
    react(),
  ],
})
```

`postcss.config.js` が存在する場合は削除するか、Tailwind の設定を取り除く。

```javascript
// postcss.config.js（Vite を使う場合は削除推奨）
// もし他の PostCSS プラグインが必要な場合のみ残す
export default {
  plugins: {
    // '@tailwindcss/postcss': {},  ← 削除
    autoprefixer: {},  // 必要であれば残す
  },
}
```

### Next.js との統合

Next.js は PostCSS 経由での統合が引き続きサポートされる。

```javascript
// postcss.config.mjs（Next.js v4 対応）
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
export default config
```

`app/globals.css` を更新する。

```css
/* app/globals.css（v4） */
@import "tailwindcss";

@theme {
  --color-background: #ffffff;
  --color-foreground: #171717;
}
```

`tailwind.config.ts` が存在する場合は削除する（v4 では不要）。

### Astro との統合

```bash
npx astro add tailwind
# または手動でインストール
npm install -D @astrojs/tailwind tailwindcss@next
```

```javascript
// astro.config.mjs（v4 対応）
import { defineConfig } from 'astro/config'
import tailwind from '@astrojs/tailwind'

export default defineConfig({
  integrations: [
    tailwind({
      applyBaseStyles: false,  // Preflight を手動管理する場合
    }),
  ],
})
```

---

## Phase 5: よくある移行エラーと解決方法

### エラー1: `Cannot find module 'tailwindcss'`

v4 のパッケージ名が変わった可能性がある。

```bash
# 確認
npm list tailwindcss

# v4 を明示的に再インストール
npm install -D tailwindcss@next
```

### エラー2: `@theme` が認識されない

PostCSS の設定が古い場合に起きる。`@tailwindcss/postcss` パッケージを使っているか確認する。

```bash
npm install -D @tailwindcss/postcss@next
```

```javascript
// postcss.config.mjs
export default {
  plugins: {
    '@tailwindcss/postcss': {},  // 'tailwindcss' ではなくこちらを使う
  },
}
```

### エラー3: カスタムカラーが反映されない

`@theme` 内の変数名のプレフィックスが正しいか確認する。

```css
/* 誤り — プレフィックスなし */
@theme {
  --brand-500: #3b82f6;  /* このままでは bg-brand-500 クラスが生成されない */
}

/* 正解 — --color- プレフィックスが必要 */
@theme {
  --color-brand-500: #3b82f6;  /* bg-brand-500、text-brand-500 が使えるようになる */
}
```

v4 の命名規則:

| 用途 | プレフィックス | 例 |
|------|--------------|-----|
| カラー | `--color-` | `--color-brand-500` |
| フォント | `--font-family-` | `--font-family-sans` |
| スペーシング | `--spacing-` | `--spacing-18` |
| ブレークポイント | `--breakpoint-` | `--breakpoint-xl` |
| ボーダー半径 | `--radius-` | `--radius-lg` |

### エラー4: `bg-opacity-*` クラスが効かない

v4 ではスラッシュ記法に統一された。

```bash
# 一括置換のコマンド例
grep -r "bg-opacity-" src/ --include="*.tsx" -l | \
  xargs sed -i 's/bg-blue-500 bg-opacity-75/bg-blue-500\/75/g'
```

実際の置換はクラスの組み合わせが複雑になるため、正規表現でパターンマッチさせるか、移行ツールに任せることを推奨する。

### エラー5: CSS-in-JS ライブラリとの競合

styled-components や emotion を使っている場合、Tailwind v4 の CSS 変数とクラス名が競合することがある。

```typescript
// Tailwind クラスを優先させる場合
import { twMerge } from 'tailwind-merge'

const Button = ({ className, ...props }) => (
  <button
    className={twMerge('px-4 py-2 bg-brand-500 text-white rounded-sm', className)}
    {...props}
  />
)
```

`tailwind-merge` は v4 対応版（`^2.5.0` 以上）を使うこと。

---

## 移行チェックリスト

移行が完了したかどうかを以下のチェックリストで確認する。

### 設定ファイル
- [ ] `tailwind.config.js` または `tailwind.config.ts` を削除した
- [ ] CSS ファイルに `@import "tailwindcss"` を追加した
- [ ] カスタムテーマを `@theme {}` に移行した
- [ ] カスタムプラグインを `@utility` / `@variant` に書き換えた
- [ ] `darkMode` 設定を `@variant` で再定義した

### パッケージ
- [ ] `tailwindcss@next` をインストールした
- [ ] Vite の場合: `@tailwindcss/vite` をインストールし `vite.config.ts` を更新した
- [ ] Next.js の場合: `@tailwindcss/postcss` をインストールし `postcss.config.mjs` を更新した
- [ ] `autoprefixer` は Vite 使用時に削除した（不要）
- [ ] `tailwind-merge` を v2.5.0 以上に更新した

### コード
- [ ] `theme()` 関数を CSS カスタムプロパティ（`var(--...)`)に置き換えた
- [ ] `bg-opacity-*` / `text-opacity-*` をスラッシュ記法に変換した
- [ ] `shadow` / `blur` / `rounded` クラスのリネームを反映した
- [ ] ビジュアルリグレッションテストを実行してレイアウト崩れがないことを確認した

---

## まとめ

Tailwind CSS v4 への移行は、設定ファイルの廃止・クラス名の変更・プラグイン API の刷新と変更点が多い。しかし公式移行ツール（`@tailwindcss/upgrade`）が多くの変換を自動化してくれるため、手動作業は**テーマカスタマイズ・カスタムプラグイン・`theme()` 関数の置換**に集中できる。

移行後のメリットは大きい。ビルド速度の大幅改善・CSS 変数との自然な統合・設定ファイルの不要化によるシンプルな構成と、長期的な保守コストの削減につながる。本記事のチェックリストを活用して、段階的かつ確実に移行を進めてほしい。

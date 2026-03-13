---
title: "Open PropsでCSS設計を効率化する実践ガイド"
description: "Open Propsを使ったCSS設計の効率化方法を解説。デザイントークンとしてのCSS Custom Properties活用、カラー・タイポグラフィ・スペーシングの統一、ダークモード対応、Tailwind CSSとの併用まで実践コード付きで紹介します。"
pubDate: "2026-03-09"
tags: ["CSS", "デザイン", "フロントエンド"]
heroImage: '../../assets/thumbnails/open-props-css-custom-properties-guide.jpg'
---

## はじめに

Open Propsは、Adam Argyleが開発したCSS Custom Properties（カスタムプロパティ）のコレクションである。Tailwind CSSのようなユーティリティクラスではなく、CSS変数としてデザイントークンを提供するという独自のアプローチを取る。

Open Propsを導入すると、一貫性のあるデザインシステムの基盤を即座に利用できる。カラーパレット、タイポグラフィスケール、スペーシング、イージング関数、アニメーション、シャドウなど、デザインに必要なトークンが網羅されている。

2026年現在、Open Propsはnpmで月間100万ダウンロードを超え、CSS Custom Propertiesベースのデザインシステムとして広く採用されている。本記事では、Open Propsの導入から実践的な活用方法まで体系的に解説する。

### 対象読者

- CSS設計の一貫性に課題を感じているフロントエンドエンジニア
- デザインシステムの構築を検討しているチーム
- Tailwind CSS以外のスタイリングアプローチを探している開発者

### Open Propsの設計思想

Open Propsは以下の3つの原則に基づいている。

| 原則 | 説明 |
|------|------|
| CSS標準準拠 | フレームワーク非依存。ブラウザネイティブのCSS Custom Propertiesを使用 |
| ゼロランタイム | ビルド時に不使用変数を除去可能。ランタイムコスト最小 |
| 段階的採用 | 必要なカテゴリだけ選択的にインポート可能 |

## インストールと基本設定

### npmによるインストール

```bash
npm install open-props
```

### CDNによる利用

開発・プロトタイピング時はCDNから直接読み込むことも可能である。

```html
<!-- 全トークンを一括読み込み -->
<link rel="stylesheet" href="https://unpkg.com/open-props" />

<!-- ノーマライズ付き -->
<link rel="stylesheet" href="https://unpkg.com/open-props/normalize.min.css" />
```

### 選択的インポート

全トークンを読み込む必要はない。プロジェクトで使用するカテゴリだけをインポートすることでファイルサイズを最小化できる。

```css
/* 必要なカテゴリのみインポート */
@import 'open-props/colors.min.css';
@import 'open-props/sizes.min.css';
@import 'open-props/fonts.min.css';
@import 'open-props/shadows.min.css';
@import 'open-props/easings.min.css';
@import 'open-props/animations.min.css';
@import 'open-props/borders.min.css';
@import 'open-props/aspects.min.css';
@import 'open-props/zindex.min.css';
```

### PostCSSによるJIT（Just-In-Time）ビルド

未使用の変数を自動除去するには、PostCSSプラグインを使用する。

```bash
npm install postcss postcss-jit-props --save-dev
```

```javascript
// postcss.config.js
const postcssJitProps = require('postcss-jit-props');
const OpenProps = require('open-props');

module.exports = {
  plugins: [
    postcssJitProps(OpenProps),
  ],
};
```

JITモードでは、CSSファイル内で実際に使用されている`var(--XXX)`のみが出力に含まれる。数KB程度のOpen Props変数だけがバンドルされるため、パフォーマンスへの影響は最小限である。

## カラーシステム

Open Propsのカラーシステムはoklch色空間を採用している。人間の知覚に基づいた均等な色空間で、一貫性のあるパレット生成が可能である。

### カラーパレットの構造

各色は0（最も明るい）から12（最も暗い）の13段階で提供される。

```css
/* Open Propsが提供するカラー変数の例 */
:root {
  /* Blue系 */
  --blue-0: oklch(0.97 0.01 240);   /* 最も明るい */
  --blue-1: oklch(0.93 0.03 240);
  --blue-2: oklch(0.88 0.06 240);
  --blue-3: oklch(0.82 0.09 240);
  --blue-4: oklch(0.74 0.13 240);
  --blue-5: oklch(0.66 0.17 240);
  --blue-6: oklch(0.57 0.2 240);
  --blue-7: oklch(0.49 0.2 240);    /* 中間 */
  --blue-8: oklch(0.42 0.19 240);
  --blue-9: oklch(0.36 0.16 240);
  --blue-10: oklch(0.3 0.13 240);
  --blue-11: oklch(0.24 0.09 240);
  --blue-12: oklch(0.18 0.06 240);  /* 最も暗い */

  /* 利用可能な色相 */
  /* gray, stone, red, pink, purple, violet, indigo, blue,
     cyan, teal, green, lime, yellow, orange, choco, brown, sand, jungle */
}
```

### 実践的なカラー設計

プロジェクト固有のセマンティックカラーを、Open Propsのトークンから派生させる。

```css
:root {
  /* プライマリカラー */
  --color-primary: var(--blue-7);
  --color-primary-light: var(--blue-4);
  --color-primary-dark: var(--blue-9);
  --color-primary-surface: var(--blue-1);

  /* セカンダリカラー */
  --color-secondary: var(--violet-7);
  --color-secondary-light: var(--violet-4);
  --color-secondary-dark: var(--violet-9);

  /* セマンティックカラー */
  --color-success: var(--green-7);
  --color-success-surface: var(--green-1);
  --color-warning: var(--yellow-6);
  --color-warning-surface: var(--yellow-1);
  --color-error: var(--red-7);
  --color-error-surface: var(--red-1);
  --color-info: var(--cyan-7);
  --color-info-surface: var(--cyan-1);

  /* テキストカラー */
  --color-text-primary: var(--gray-12);
  --color-text-secondary: var(--gray-8);
  --color-text-tertiary: var(--gray-6);
  --color-text-inverse: var(--gray-0);

  /* サーフェスカラー */
  --color-surface-1: white;
  --color-surface-2: var(--gray-1);
  --color-surface-3: var(--gray-2);
  --color-surface-4: var(--gray-3);

  /* ボーダーカラー */
  --color-border: var(--gray-3);
  --color-border-strong: var(--gray-5);
}
```

### カラーパレットの活用例

```css
/* ステータスバッジ */
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--size-1);
  padding: var(--size-1) var(--size-3);
  border-radius: var(--radius-round);
  font-size: var(--font-size-0);
  font-weight: var(--font-weight-6);
  line-height: 1;
}

.badge-success {
  background: var(--color-success-surface);
  color: var(--green-9);
  border: 1px solid var(--green-3);
}

.badge-warning {
  background: var(--color-warning-surface);
  color: var(--yellow-9);
  border: 1px solid var(--yellow-3);
}

.badge-error {
  background: var(--color-error-surface);
  color: var(--red-9);
  border: 1px solid var(--red-3);
}

.badge-info {
  background: var(--color-info-surface);
  color: var(--cyan-9);
  border: 1px solid var(--cyan-3);
}
```

## タイポグラフィスケール

Open Propsは数学的に調和したタイポグラフィスケールを提供する。

### フォントサイズ

```css
/* Open Propsのフォントサイズ変数 */
:root {
  --font-size-00: 0.5rem;    /* 8px */
  --font-size-0: 0.75rem;    /* 12px */
  --font-size-1: 1rem;       /* 16px - 基準 */
  --font-size-2: 1.1rem;     /* 17.6px */
  --font-size-3: 1.25rem;    /* 20px */
  --font-size-4: 1.5rem;     /* 24px */
  --font-size-5: 2rem;       /* 32px */
  --font-size-6: 2.5rem;     /* 40px */
  --font-size-7: 3.5rem;     /* 56px */
  --font-size-8: 6rem;       /* 96px */

  /* Fluid（ビューポートに応じて可変） */
  --font-size-fluid-0: clamp(0.75rem, 2vw, 1rem);
  --font-size-fluid-1: clamp(1rem, 4vw, 1.5rem);
  --font-size-fluid-2: clamp(1.5rem, 6vw, 2.5rem);
  --font-size-fluid-3: clamp(2rem, 9vw, 3.5rem);
}
```

### 実践的なタイポグラフィ設計

```css
/* タイポグラフィシステム */
body {
  font-family: var(--font-sans);
  font-size: var(--font-size-1);
  line-height: var(--font-lineheight-3);
  color: var(--color-text-primary);
}

h1 {
  font-size: var(--font-size-fluid-3);
  font-weight: var(--font-weight-9);
  line-height: var(--font-lineheight-0);
  letter-spacing: var(--font-letterspacing-1);
}

h2 {
  font-size: var(--font-size-fluid-2);
  font-weight: var(--font-weight-7);
  line-height: var(--font-lineheight-1);
  letter-spacing: var(--font-letterspacing-1);
}

h3 {
  font-size: var(--font-size-fluid-1);
  font-weight: var(--font-weight-6);
  line-height: var(--font-lineheight-2);
}

h4 {
  font-size: var(--font-size-3);
  font-weight: var(--font-weight-6);
  line-height: var(--font-lineheight-2);
}

.text-small {
  font-size: var(--font-size-0);
  line-height: var(--font-lineheight-2);
}

.text-caption {
  font-size: var(--font-size-00);
  line-height: var(--font-lineheight-1);
  text-transform: uppercase;
  letter-spacing: var(--font-letterspacing-4);
  color: var(--color-text-tertiary);
}

/* コードブロック */
code, pre {
  font-family: var(--font-mono);
  font-size: var(--font-size-0);
}

pre {
  padding: var(--size-4);
  border-radius: var(--radius-2);
  background: var(--gray-12);
  color: var(--gray-2);
  overflow-x: auto;
  line-height: var(--font-lineheight-4);
}
```

### Fluidタイポグラフィの活用

Fluidフォントサイズは`clamp()`を使い、ビューポート幅に応じてスムーズにサイズが変化する。メディアクエリによるブレークポイントベースの切り替えと異なり、すべての画面幅で最適なサイズが自動計算される。

```css
/* Fluidタイポグラフィを使ったヒーローセクション */
.hero {
  padding: var(--size-fluid-4) var(--size-fluid-2);
  text-align: center;
}

.hero-title {
  font-size: var(--font-size-fluid-3);
  font-weight: var(--font-weight-9);
  line-height: var(--font-lineheight-0);
  background: linear-gradient(
    to right,
    var(--blue-7),
    var(--violet-7)
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: var(--font-size-fluid-1);
  color: var(--color-text-secondary);
  max-inline-size: var(--size-content-2);
  margin-inline: auto;
  margin-block-start: var(--size-3);
}
```

## スペーシングとサイズ

Open Propsは一貫したスペーシングスケールを提供する。

### サイズ変数

```css
/* Open Propsのサイズ変数 */
:root {
  --size-000: -0.5rem;
  --size-00: -0.25rem;
  --size-1: 0.25rem;   /* 4px */
  --size-2: 0.5rem;    /* 8px */
  --size-3: 1rem;      /* 16px */
  --size-4: 1.25rem;   /* 20px */
  --size-5: 1.5rem;    /* 24px */
  --size-6: 1.75rem;   /* 28px */
  --size-7: 2rem;      /* 32px */
  --size-8: 3rem;      /* 48px */
  --size-9: 4rem;      /* 64px */
  --size-10: 5rem;     /* 80px */
  --size-11: 7.5rem;   /* 120px */
  --size-12: 10rem;    /* 160px */
  --size-13: 15rem;    /* 240px */
  --size-14: 20rem;    /* 320px */
  --size-15: 30rem;    /* 480px */

  /* Fluidサイズ */
  --size-fluid-1: clamp(0.5rem, 1vw, 1rem);
  --size-fluid-2: clamp(1rem, 2vw, 1.5rem);
  --size-fluid-3: clamp(1.5rem, 3vw, 2rem);
  --size-fluid-4: clamp(2rem, 4vw, 3rem);
  --size-fluid-5: clamp(4rem, 6vw, 6rem);

  /* コンテンツ幅 */
  --size-content-1: 20ch;
  --size-content-2: 45ch;
  --size-content-3: 60ch;
}
```

### レイアウトでの活用

```css
/* カードコンポーネント */
.card {
  padding: var(--size-5);
  border-radius: var(--radius-3);
  background: var(--color-surface-1);
  box-shadow: var(--shadow-2);
  display: grid;
  gap: var(--size-3);
}

.card-header {
  display: flex;
  align-items: center;
  gap: var(--size-2);
}

.card-body {
  max-inline-size: var(--size-content-3);
  line-height: var(--font-lineheight-3);
}

.card-footer {
  display: flex;
  gap: var(--size-2);
  justify-content: flex-end;
  padding-block-start: var(--size-3);
  border-block-start: 1px solid var(--color-border);
}

/* セクションスペーシング */
.section {
  padding-block: var(--size-fluid-5);
  padding-inline: var(--size-fluid-2);
}

.section-title {
  font-size: var(--font-size-fluid-2);
  margin-block-end: var(--size-fluid-3);
}

/* グリッドレイアウト */
.grid-auto {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
  gap: var(--size-5);
}
```

## アニメーションとイージング

Open Propsは実用的なアニメーションとイージング関数のコレクションを提供する。

### イージング関数

```css
/* Open Propsのイージング変数 */
:root {
  --ease-1: cubic-bezier(0.25, 0, 0.5, 1);
  --ease-2: cubic-bezier(0.25, 0, 0.4, 1);
  --ease-3: cubic-bezier(0.25, 0, 0.3, 1);        /* 推奨デフォルト */
  --ease-4: cubic-bezier(0.25, 0, 0.2, 1);
  --ease-5: cubic-bezier(0.25, 0, 0.1, 1);

  --ease-in-1: cubic-bezier(0.25, 0, 1, 1);
  --ease-in-2: cubic-bezier(0.5, 0, 1, 1);
  --ease-in-3: cubic-bezier(0.7, 0, 1, 1);

  --ease-out-1: cubic-bezier(0, 0, 0.75, 1);
  --ease-out-2: cubic-bezier(0, 0, 0.5, 1);
  --ease-out-3: cubic-bezier(0, 0, 0.3, 1);       /* 推奨デフォルト */

  --ease-in-out-1: cubic-bezier(0.1, 0, 0.9, 1);
  --ease-in-out-2: cubic-bezier(0.3, 0, 0.7, 1);
  --ease-in-out-3: cubic-bezier(0.5, 0, 0.5, 1);

  --ease-elastic-in-1: cubic-bezier(0.5, -0.25, 0.75, 1);
  --ease-elastic-out-1: cubic-bezier(0.25, 0, 0.5, 1.25);

  --ease-spring-1: linear(/* ... spring function ... */);
}
```

### キーフレームアニメーション

```css
/* Open Propsが提供するアニメーション */
:root {
  --animation-fade-in: fade-in 0.5s var(--ease-3);
  --animation-fade-out: fade-out 0.5s var(--ease-3);
  --animation-slide-in-up: slide-in-up 0.5s var(--ease-3);
  --animation-slide-in-down: slide-in-down 0.5s var(--ease-3);
  --animation-slide-out-up: slide-out-up 0.5s var(--ease-3);
  --animation-scale-up: scale-up 0.5s var(--ease-3);
  --animation-scale-down: scale-down 0.5s var(--ease-3);
  --animation-shake-x: shake-x 0.75s var(--ease-out-5);
  --animation-spin: spin 2s linear infinite;
  --animation-ping: ping 1s var(--ease-out-3) infinite;
  --animation-pulse: pulse 2s var(--ease-in-out-3) infinite;
  --animation-bounce: bounce 2s var(--ease-elastic-out-1) infinite;
}
```

### 実践的なアニメーション実装

```css
/* インタラクティブなボタン */
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--size-2);
  padding: var(--size-2) var(--size-5);
  border: none;
  border-radius: var(--radius-2);
  font-size: var(--font-size-1);
  font-weight: var(--font-weight-6);
  cursor: pointer;
  transition:
    background-color 0.2s var(--ease-3),
    box-shadow 0.2s var(--ease-3),
    transform 0.1s var(--ease-3);
}

.btn:hover {
  box-shadow: var(--shadow-3);
  transform: translateY(-1px);
}

.btn:active {
  transform: translateY(0);
  box-shadow: var(--shadow-1);
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-dark);
}

/* ページ遷移アニメーション */
.page-enter {
  animation: var(--animation-fade-in), var(--animation-slide-in-up);
}

.page-exit {
  animation: var(--animation-fade-out), var(--animation-slide-out-up);
}

/* カード出現アニメーション（スタガー） */
.card-grid > * {
  animation: var(--animation-fade-in);
  animation-fill-mode: both;
}

.card-grid > *:nth-child(1) { animation-delay: 0ms; }
.card-grid > *:nth-child(2) { animation-delay: 100ms; }
.card-grid > *:nth-child(3) { animation-delay: 200ms; }
.card-grid > *:nth-child(4) { animation-delay: 300ms; }
.card-grid > *:nth-child(5) { animation-delay: 400ms; }
.card-grid > *:nth-child(6) { animation-delay: 500ms; }

/* ローディングスピナー */
.spinner {
  width: var(--size-7);
  height: var(--size-7);
  border: 3px solid var(--gray-3);
  border-top-color: var(--color-primary);
  border-radius: var(--radius-round);
  animation: var(--animation-spin);
}

/* 通知バッジのパルス */
.notification-dot {
  width: var(--size-2);
  height: var(--size-2);
  border-radius: var(--radius-round);
  background: var(--red-7);
  animation: var(--animation-pulse);
}
```

## ダークモード対応（Adaptive Design）

Open Propsはライト/ダークモードに対応したAdaptive Propsを提供する。`prefers-color-scheme`に応じて自動的にトークン値が切り替わる。

### Adaptive Propsの導入

```css
/* Adaptiveバージョンをインポート */
@import 'open-props/colors.min.css';
@import 'open-props/colors-hsl.min.css';

/* または個別にAdaptiveトークンを設定 */
:root {
  color-scheme: light dark;

  /* ライトモードのデフォルト */
  --surface-1: var(--gray-0);
  --surface-2: var(--gray-1);
  --surface-3: var(--gray-2);
  --surface-4: var(--gray-3);
  --text-1: var(--gray-12);
  --text-2: var(--gray-8);
  --text-3: var(--gray-6);
  --border-default: var(--gray-3);
  --shadow-color: 220 3% 15%;
}

/* ダークモード */
@media (prefers-color-scheme: dark) {
  :root {
    --surface-1: var(--gray-12);
    --surface-2: var(--gray-11);
    --surface-3: var(--gray-10);
    --surface-4: var(--gray-9);
    --text-1: var(--gray-1);
    --text-2: var(--gray-4);
    --text-3: var(--gray-6);
    --border-default: var(--gray-8);
    --shadow-color: 220 40% 2%;
  }
}
```

### ダークモード対応コンポーネント

```css
/* テーマ対応のカードコンポーネント */
.card {
  background: var(--surface-1);
  color: var(--text-1);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-3);
  padding: var(--size-5);
  box-shadow:
    0 1px 2px hsl(var(--shadow-color) / 0.1),
    0 4px 8px hsl(var(--shadow-color) / 0.05);
  transition:
    background-color 0.3s var(--ease-3),
    border-color 0.3s var(--ease-3),
    box-shadow 0.3s var(--ease-3);
}

.card:hover {
  box-shadow:
    0 2px 4px hsl(var(--shadow-color) / 0.15),
    0 8px 16px hsl(var(--shadow-color) / 0.1);
}

/* サイドバー */
.sidebar {
  background: var(--surface-2);
  border-inline-end: 1px solid var(--border-default);
  padding: var(--size-4);
  width: var(--size-15);
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: var(--size-2);
  padding: var(--size-2) var(--size-3);
  border-radius: var(--radius-2);
  color: var(--text-2);
  text-decoration: none;
  transition: background-color 0.15s var(--ease-3);
}

.sidebar-item:hover {
  background: var(--surface-3);
  color: var(--text-1);
}

.sidebar-item.active {
  background: var(--color-primary-surface);
  color: var(--color-primary);
  font-weight: var(--font-weight-6);
}
```

### 手動テーマ切替

ユーザーがテーマを手動で切り替えられるようにする場合は、`data-theme`属性を活用する。

```css
/* 手動テーマ切替対応 */
[data-theme="light"] {
  --surface-1: var(--gray-0);
  --surface-2: var(--gray-1);
  --text-1: var(--gray-12);
  --text-2: var(--gray-8);
}

[data-theme="dark"] {
  --surface-1: var(--gray-12);
  --surface-2: var(--gray-11);
  --text-1: var(--gray-1);
  --text-2: var(--gray-4);
}
```

```html
<html data-theme="light">
<body>
  <button onclick="toggleTheme()">テーマ切替</button>

  <script>
    function toggleTheme() {
      const html = document.documentElement;
      const current = html.getAttribute('data-theme');
      const next = current === 'light' ? 'dark' : 'light';
      html.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    }

    // 保存済みテーマを復元
    const saved = localStorage.getItem('theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
    }
  </script>
</body>
</html>
```

## Custom Propertyの合成テクニック

Open Propsのトークンを組み合わせて、プロジェクト固有のデザインシステムを構築する手法を解説する。

### トークンの派生

```css
:root {
  /* Open Propsのトークンから派生させる */
  --btn-padding-inline: var(--size-5);
  --btn-padding-block: var(--size-2);
  --btn-radius: var(--radius-2);
  --btn-font-size: var(--font-size-1);
  --btn-font-weight: var(--font-weight-6);
  --btn-transition: 0.2s var(--ease-3);

  --input-padding-inline: var(--size-3);
  --input-padding-block: var(--size-2);
  --input-radius: var(--radius-2);
  --input-border-color: var(--color-border);
  --input-focus-ring: 0 0 0 3px var(--blue-3);

  --card-padding: var(--size-5);
  --card-radius: var(--radius-3);
  --card-shadow: var(--shadow-2);
  --card-gap: var(--size-3);
}
```

### コンポーネントライブラリの構築

```css
/* フォーム入力コンポーネント */
.input {
  width: 100%;
  padding: var(--input-padding-block) var(--input-padding-inline);
  border: 1px solid var(--input-border-color);
  border-radius: var(--input-radius);
  font-size: var(--font-size-1);
  font-family: inherit;
  background: var(--surface-1);
  color: var(--text-1);
  transition: border-color 0.15s var(--ease-3),
              box-shadow 0.15s var(--ease-3);
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: var(--input-focus-ring);
}

.input::placeholder {
  color: var(--text-3);
}

.input:invalid {
  border-color: var(--color-error);
}

/* テキストエリア */
.textarea {
  min-height: 6rem;
  resize: vertical;
}

/* ラベル */
.label {
  display: block;
  font-size: var(--font-size-0);
  font-weight: var(--font-weight-6);
  color: var(--text-2);
  margin-block-end: var(--size-1);
}

/* フォームグループ */
.form-group {
  display: grid;
  gap: var(--size-1);
}

.form-group + .form-group {
  margin-block-start: var(--size-4);
}

/* エラーメッセージ */
.form-error {
  font-size: var(--font-size-0);
  color: var(--color-error);
  display: flex;
  align-items: center;
  gap: var(--size-1);
}
```

### シャドウの活用

```css
/* Open Propsのシャドウ変数 */
:root {
  --shadow-1: 0 1px 2px 0 hsl(var(--shadow-color) / 0.05);
  --shadow-2: 0 1px 3px 0 hsl(var(--shadow-color) / 0.1),
              0 1px 2px -1px hsl(var(--shadow-color) / 0.1);
  --shadow-3: 0 4px 6px -1px hsl(var(--shadow-color) / 0.1),
              0 2px 4px -2px hsl(var(--shadow-color) / 0.1);
  --shadow-4: 0 10px 15px -3px hsl(var(--shadow-color) / 0.1),
              0 4px 6px -4px hsl(var(--shadow-color) / 0.1);
  --shadow-5: 0 20px 25px -5px hsl(var(--shadow-color) / 0.1),
              0 8px 10px -6px hsl(var(--shadow-color) / 0.1);
  --shadow-6: 0 25px 50px -12px hsl(var(--shadow-color) / 0.25);
}

/* エレベーションシステム */
.elevation-1 { box-shadow: var(--shadow-1); }
.elevation-2 { box-shadow: var(--shadow-2); }
.elevation-3 { box-shadow: var(--shadow-3); }
.elevation-4 { box-shadow: var(--shadow-4); }
.elevation-5 { box-shadow: var(--shadow-5); }

/* ホバーでエレベーション上昇 */
.interactive-card {
  box-shadow: var(--shadow-2);
  transition: box-shadow 0.2s var(--ease-3),
              transform 0.2s var(--ease-3);
}

.interactive-card:hover {
  box-shadow: var(--shadow-4);
  transform: translateY(-2px);
}
```

## フレームワーク統合

### Reactでの活用

```jsx
// styles/tokens.css
// @import 'open-props/colors.min.css';
// @import 'open-props/sizes.min.css';
// ...

// components/Alert.jsx
import './Alert.css';

export function Alert({ variant = 'info', title, children, onClose }) {
  return (
    <div className={`alert alert-${variant}`} role="alert">
      <div className="alert-header">
        <strong className="alert-title">{title}</strong>
        {onClose && (
          <button className="alert-close" onClick={onClose} aria-label="閉じる">
            &times;
          </button>
        )}
      </div>
      <div className="alert-body">{children}</div>
    </div>
  );
}
```

```css
/* components/Alert.css */
.alert {
  padding: var(--size-3) var(--size-4);
  border-radius: var(--radius-2);
  border-inline-start: 4px solid;
  animation: var(--animation-slide-in-down);
}

.alert-info {
  background: var(--cyan-1);
  border-color: var(--cyan-7);
  color: var(--cyan-10);
}

.alert-success {
  background: var(--green-1);
  border-color: var(--green-7);
  color: var(--green-10);
}

.alert-warning {
  background: var(--yellow-1);
  border-color: var(--yellow-7);
  color: var(--yellow-10);
}

.alert-error {
  background: var(--red-1);
  border-color: var(--red-7);
  color: var(--red-10);
}

.alert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-block-end: var(--size-1);
}

.alert-title {
  font-weight: var(--font-weight-6);
}

.alert-close {
  background: none;
  border: none;
  font-size: var(--font-size-4);
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
  padding: 0;
  line-height: 1;
}

.alert-close:hover {
  opacity: 1;
}

.alert-body {
  font-size: var(--font-size-0);
  line-height: var(--font-lineheight-3);
}
```

### Vueでの活用

```vue
<!-- components/Tooltip.vue -->
<template>
  <div class="tooltip-wrapper" @mouseenter="show" @mouseleave="hide">
    <slot />
    <div v-if="visible" class="tooltip" :class="`tooltip-${placement}`">
      {{ text }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
  text: { type: String, required: true },
  placement: { type: String, default: 'top' }
});

const visible = ref(false);
const show = () => visible.value = true;
const hide = () => visible.value = false;
</script>

<style scoped>
.tooltip-wrapper {
  position: relative;
  display: inline-block;
}

.tooltip {
  position: absolute;
  padding: var(--size-1) var(--size-3);
  background: var(--gray-11);
  color: var(--gray-1);
  font-size: var(--font-size-0);
  border-radius: var(--radius-2);
  white-space: nowrap;
  pointer-events: none;
  animation: var(--animation-fade-in);
  z-index: var(--layer-important);
}

.tooltip-top {
  bottom: calc(100% + var(--size-1));
  left: 50%;
  transform: translateX(-50%);
}

.tooltip-bottom {
  top: calc(100% + var(--size-1));
  left: 50%;
  transform: translateX(-50%);
}
</style>
```

## Tailwind CSSとの比較と併用

Open PropsとTailwind CSSは異なるアプローチでCSSの課題を解決する。

### アプローチの違い

| 観点 | Open Props | Tailwind CSS |
|------|-----------|-------------|
| 手法 | CSS変数（デザイントークン） | ユーティリティクラス |
| HTMLへの影響 | なし（CSS内で使用） | クラス名が長くなる |
| 学習コスト | CSS知識がそのまま使える | 独自のクラス名体系を覚える必要がある |
| カスタマイズ | CSS変数を上書きするだけ | tailwind.config.jsで設定 |
| ファイルサイズ | JITで数KB | PurgeCSS適用で数KB |
| フレームワーク依存 | なし | PostCSS必須 |
| コンポーネントスタイリング | CSSファイルに記述 | HTML内にインライン的に記述 |
| IDE支援 | CSS標準のオートコンプリート | Tailwind CSS IntelliSense拡張 |

### 併用パターン

Open PropsをTailwind CSSのデザイントークンとして活用する方法がある。

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          light: 'var(--blue-4)',
          DEFAULT: 'var(--blue-7)',
          dark: 'var(--blue-9)',
        },
        surface: {
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
        },
      },
      spacing: {
        'op-1': 'var(--size-1)',
        'op-2': 'var(--size-2)',
        'op-3': 'var(--size-3)',
        'op-4': 'var(--size-4)',
        'op-5': 'var(--size-5)',
      },
      borderRadius: {
        'op-2': 'var(--radius-2)',
        'op-3': 'var(--radius-3)',
      },
      boxShadow: {
        'op-2': 'var(--shadow-2)',
        'op-3': 'var(--shadow-3)',
        'op-4': 'var(--shadow-4)',
      },
    },
  },
};
```

```html
<!-- TailwindのユーティリティクラスでOpen Propsのトークンを利用 -->
<div class="bg-surface-1 p-op-5 rounded-op-3 shadow-op-2">
  <h2 class="text-primary font-semibold">タイトル</h2>
  <p class="text-gray-600 mt-op-2">本文テキスト</p>
</div>
```

### どちらを選ぶべきか

| 状況 | 推奨 |
|------|------|
| 新規プロジェクト・小〜中規模 | Open Props（シンプルで軽量） |
| 大規模チーム・統一スタイルガイド必須 | Tailwind CSS（厳密なルール適用が容易） |
| デザインシステムの基盤構築 | Open Props（CSS標準準拠で長期安定） |
| ラピッドプロトタイピング | Tailwind CSS（HTMLだけで完結） |
| フレームワーク非依存が必要 | Open Props（ビルドツール不要でも使用可） |
| 既存CSSとの段階的統合 | Open Props（既存CSSに変数を追加するだけ） |

## Open Props Normalizeの活用

Open Propsは独自のCSS Normalizeを提供しており、モダンブラウザ向けに最適化されたリセットスタイルが含まれている。

```css
@import 'open-props/normalize.min.css';
```

このNormalizeは以下の特徴を持つ。

```css
/* Normalizeの一部（概念的な内容） */

/* ボックスサイジングの統一 */
*, *::before, *::after {
  box-sizing: border-box;
}

/* スムーススクロール（motion-safe時のみ） */
@media (prefers-reduced-motion: no-preference) {
  html {
    scroll-behavior: smooth;
  }
}

/* レスポンシブ画像 */
img, picture, video, canvas, svg {
  display: block;
  max-inline-size: 100%;
  block-size: auto;
}

/* フォーム要素のフォント継承 */
input, button, textarea, select {
  font: inherit;
}

/* テキストの折り返し */
p, h1, h2, h3, h4, h5, h6 {
  overflow-wrap: break-word;
}

/* リストスタイルのリセット */
ul[role="list"],
ol[role="list"] {
  list-style: none;
  padding: 0;
}
```

## まとめ

Open Propsは、CSS Custom Propertiesを活用したデザイントークンライブラリとして、フロントエンド開発に一貫性と効率性をもたらす。本記事の内容を整理する。

| トピック | ポイント |
|---------|---------|
| カラーシステム | oklch色空間ベース。13段階のパレットからセマンティックカラーを派生 |
| タイポグラフィ | 数学的に調和したスケール。Fluid対応で全画面幅に最適化 |
| スペーシング | 一貫した間隔スケール。Fluidサイズも提供 |
| アニメーション | 実用的なイージング関数とキーフレームアニメーション |
| ダークモード | Adaptive Props + `prefers-color-scheme`で自動切替 |
| フレームワーク統合 | React/Vue/Svelte等、フレームワーク非依存で利用可能 |
| Tailwind CSS併用 | トークンとして統合し、ユーティリティクラスから参照可能 |
| パフォーマンス | JITビルドで未使用変数を除去。ランタイムコストゼロ |

Open Propsの最大の利点は、CSS標準に準拠している点にある。特定のビルドツールやフレームワークに依存せず、ブラウザネイティブの仕組みだけで動作する。デザインシステムの基盤として採用し、プロジェクト固有のトークンをその上に構築するアプローチを推奨する。

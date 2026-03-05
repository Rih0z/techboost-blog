---
title: "CSS数学関数完全ガイド — clamp(), min(), max(), calc()を使いこなす"
description: "CSS数学関数の基礎から実践まで徹底解説。clamp()、min()、max()、calc()、round()、mod()、rem()を使ったレスポンシブデザイン、タイポグラフィ、レイアウト最適化のテクニック集。"
pubDate: "2026-02-06"
tags: ["CSS", "レスポンシブ", "デザイン", "タイポグラフィ", "レイアウト", "プログラミング"]
---

CSS数学関数は、レスポンシブデザインやタイポグラフィの調整を劇的に簡単にします。

この記事では、`clamp()`、`min()`、`max()`、`calc()`をはじめとする数学関数の使い方と、実践的な活用例を詳しく解説します。

## CSS数学関数の種類

### 基本的な関数

| 関数 | 説明 | 対応状況 |
|------|------|----------|
| `calc()` | 四則演算 | ✅ 完全対応 |
| `min()` | 最小値を選択 | ✅ 完全対応 |
| `max()` | 最大値を選択 | ✅ 完全対応 |
| `clamp()` | 値を範囲内に制限 | ✅ 完全対応 |

### 新しい関数（CSS Values 4）

| 関数 | 説明 | 対応状況 |
|------|------|----------|
| `round()` | 四捨五入 | 🟡 部分対応 |
| `mod()` | 剰余 | 🟡 部分対応 |
| `rem()` | 剰余（mod()の別名） | 🟡 部分対応 |
| `sin()`, `cos()`, `tan()` | 三角関数 | 🟡 部分対応 |
| `asin()`, `acos()`, `atan()` | 逆三角関数 | 🟡 部分対応 |
| `pow()`, `sqrt()`, `hypot()` | べき乗・平方根 | 🟡 部分対応 |
| `log()`, `exp()` | 対数・指数 | 🟡 部分対応 |

## calc() — 基本の四則演算

### 基本的な使い方

```css
/* 四則演算 */
.box {
  width: calc(100% - 20px);
  height: calc(100vh - 80px);
  padding: calc(1rem + 5px);
  margin: calc(10px * 2);
}

/* 単位の混在も可能 */
.container {
  width: calc(100vw - 2rem);
  padding: calc(5% + 10px);
}

/* ネスト可能 */
.element {
  width: calc((100% - 40px) / 3);
}
```

### 実践例：レスポンシブマージン

```css
/* ビューポート幅に応じた可変マージン */
.section {
  margin-left: calc(50vw - 500px);
  margin-right: calc(50vw - 500px);
}

/* 最小マージンを確保 */
@media (max-width: 1000px) {
  .section {
    margin-left: 20px;
    margin-right: 20px;
  }
}
```

### CSS変数との組み合わせ

```css
:root {
  --base-spacing: 1rem;
  --multiplier: 2;
}

.card {
  padding: calc(var(--base-spacing) * var(--multiplier));
  margin-bottom: calc(var(--base-spacing) * 1.5);
}
```

## min() と max() — 最小値・最大値の選択

### min() の使い方

```css
/* 幅の最大値を制限 */
.container {
  width: min(90%, 1200px);
  /* 90% と 1200px の小さい方を採用 */
}

/* パディングの最大値を制限 */
.card {
  padding: min(5vw, 3rem);
}

/* 複数の値から最小値を選択 */
.box {
  width: min(100%, 600px, 90vw);
}
```

### max() の使い方

```css
/* 幅の最小値を保証 */
.sidebar {
  width: max(300px, 20%);
  /* 300px と 20% の大きい方を採用 */
}

/* フォントサイズの最小値を保証 */
.text {
  font-size: max(16px, 1rem);
}

/* 高さの最小値を保証 */
.hero {
  height: max(400px, 50vh);
}
```

### 実践例：レスポンシブグリッド

```css
.grid {
  display: grid;
  /* 最小250px、最大で等分 */
  grid-template-columns: repeat(auto-fit, minmax(min(250px, 100%), 1fr));
  gap: min(3vw, 2rem);
}
```

## clamp() — 値を範囲内に制限

### 基本構文

```css
clamp(最小値, 推奨値, 最大値)
```

- 推奨値が最小値より小さい → 最小値を採用
- 推奨値が最大値より大きい → 最大値を採用
- それ以外 → 推奨値を採用

### レスポンシブタイポグラフィ

```css
/* ビューポート幅に応じてフォントサイズが変化 */
h1 {
  font-size: clamp(2rem, 5vw, 5rem);
  /* 最小2rem、最大5rem、推奨5vw */
}

h2 {
  font-size: clamp(1.5rem, 3vw + 1rem, 3rem);
}

p {
  font-size: clamp(1rem, 0.9rem + 0.5vw, 1.25rem);
}
```

### レスポンシブスペーシング

```css
.section {
  padding: clamp(1rem, 5vw, 5rem) clamp(1rem, 5vw, 3rem);
  margin-bottom: clamp(2rem, 10vh, 8rem);
}

.container {
  width: clamp(300px, 90%, 1200px);
  margin-inline: auto;
}
```

### 実践例：可変グリッドギャップ

```css
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: clamp(1rem, 3vw, 3rem);
}
```

## 高度な活用例

### 1. 完璧なレスポンシブタイポグラフィシステム

```css
:root {
  --font-size-base: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);
  --font-size-sm: clamp(0.875rem, 0.8rem + 0.4vw, 1rem);
  --font-size-lg: clamp(1.125rem, 1rem + 0.6vw, 1.25rem);
  --font-size-xl: clamp(1.25rem, 1.1rem + 0.8vw, 1.5rem);
  --font-size-2xl: clamp(1.5rem, 1.3rem + 1vw, 2rem);
  --font-size-3xl: clamp(2rem, 1.5rem + 2vw, 3rem);
  --font-size-4xl: clamp(2.5rem, 2rem + 2.5vw, 4rem);
}

body {
  font-size: var(--font-size-base);
}

h1 {
  font-size: var(--font-size-4xl);
}

h2 {
  font-size: var(--font-size-3xl);
}

h3 {
  font-size: var(--font-size-2xl);
}

small {
  font-size: var(--font-size-sm);
}
```

### 2. レスポンシブスペーシングシステム

```css
:root {
  --space-xs: clamp(0.5rem, 1vw, 0.75rem);
  --space-sm: clamp(0.75rem, 2vw, 1rem);
  --space-md: clamp(1rem, 3vw, 1.5rem);
  --space-lg: clamp(1.5rem, 4vw, 2rem);
  --space-xl: clamp(2rem, 5vw, 3rem);
  --space-2xl: clamp(3rem, 7vw, 5rem);
  --space-3xl: clamp(5rem, 10vw, 8rem);
}

.section {
  padding-block: var(--space-2xl);
  padding-inline: var(--space-md);
}

.card {
  padding: var(--space-lg);
  margin-bottom: var(--space-md);
}
```

### 3. アスペクト比を保つレスポンシブボックス

```css
.aspect-box {
  width: min(100%, 800px);
  height: calc(min(100%, 800px) * 9 / 16);
  /* 16:9 のアスペクト比を維持 */
}

/* 代替案：aspect-ratio プロパティを使用 */
.aspect-box-modern {
  width: min(100%, 800px);
  aspect-ratio: 16 / 9;
}
```

### 4. 可変グリッドレイアウト

```css
.responsive-grid {
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(clamp(200px, 30%, 300px), 1fr)
  );
  gap: clamp(1rem, 3vw, 2rem);
  padding: clamp(1rem, 5vw, 3rem);
}
```

### 5. レスポンシブコンテナ

```css
.container {
  width: min(100% - 2rem, 1200px);
  margin-inline: auto;
  padding-inline: clamp(1rem, 5vw, 3rem);
}

/* 小・中・大サイズのコンテナ */
.container-sm {
  max-width: min(100% - 2rem, 800px);
}

.container-md {
  max-width: min(100% - 2rem, 1200px);
}

.container-lg {
  max-width: min(100% - 2rem, 1600px);
}
```

## 新しい数学関数（CSS Values 4）

### round() — 四捨五入

```css
/* 構文: round(値, 基準値) */
.grid {
  /* 10pxの倍数に丸める */
  width: round(247px, 10px); /* 250px */

  /* 0.5remの倍数に丸める */
  padding: round(2.7rem, 0.5rem); /* 3rem */
}

/* 丸め方向を指定 */
.box {
  width: round(up, 247px, 10px); /* 250px（切り上げ） */
  height: round(down, 247px, 10px); /* 240px（切り捨て） */
  margin: round(nearest, 247px, 10px); /* 250px（四捨五入） */
}
```

### mod() と rem() — 剰余

```css
/* mod(被除数, 除数) */
.stripe:nth-child(n) {
  /* 3で割った余り → 0, 1, 2 のパターン */
  --index: mod(n, 3);
  background: hsl(calc(var(--index) * 120), 50%, 50%);
}

/* rem() は mod() と同じ */
.element {
  width: rem(100px, 30px); /* 10px */
}
```

### 三角関数 — アニメーション・レイアウト

```css
/* 円形配置 */
.circle-item {
  --angle: calc(360deg / 8 * var(--i));
  --radius: 200px;

  transform:
    rotate(var(--angle))
    translate(var(--radius))
    rotate(calc(-1 * var(--angle)));
}

/* sin/cos を使った波形アニメーション */
@keyframes wave {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(calc(sin(var(--progress) * 3.14159) * 20px));
  }
}
```

## ブラウザ対応状況

### 安全に使える関数

```css
/* ✅ すべてのモダンブラウザで対応 */
.safe {
  width: calc(100% - 20px);
  font-size: clamp(1rem, 2vw, 2rem);
  padding: min(5vw, 3rem);
  height: max(400px, 50vh);
}
```

### フォールバック付きで使用

```css
/* 新しい関数はフォールバックを用意 */
.element {
  width: 250px; /* フォールバック */
  width: round(247px, 10px); /* 対応ブラウザのみ */
}

/* @supports を使った条件分岐 */
@supports (width: round(100px, 10px)) {
  .element {
    width: round(247px, 10px);
  }
}
```

## パフォーマンス最適化

### CSS変数でまとめて定義

```css
/* ❌ 悪い例：毎回計算 */
.card-1 { padding: clamp(1rem, 3vw, 2rem); }
.card-2 { padding: clamp(1rem, 3vw, 2rem); }
.card-3 { padding: clamp(1rem, 3vw, 2rem); }

/* ✅ 良い例：1回だけ計算 */
:root {
  --padding-responsive: clamp(1rem, 3vw, 2rem);
}

.card-1, .card-2, .card-3 {
  padding: var(--padding-responsive);
}
```

### calc() のネストを避ける

```css
/* ❌ 悪い例：深いネスト */
.element {
  width: calc(calc(calc(100% - 20px) / 2) - 10px);
}

/* ✅ 良い例：シンプルに */
.element {
  width: calc((100% - 40px) / 2);
}
```

## デバッグのコツ

### ステップバイステップで確認

```css
.debug {
  /* 段階的に確認 */
  --base: 100%;
  --subtract: calc(var(--base) - 40px);
  --divide: calc(var(--subtract) / 2);

  width: var(--divide);

  /* DevToolsで各変数の値を確認できる */
}
```

### ブラウザの開発者ツールを活用

```css
.element {
  /* 計算結果がComputedタブで確認できる */
  font-size: clamp(1rem, 2vw + 0.5rem, 2rem);
}
```

## まとめ

CSS数学関数は、レスポンシブデザインを大幅に簡素化します。

**主なメリット:**
- メディアクエリの削減
- より滑らかなレスポンシブ対応
- メンテナンス性の向上
- コードの可読性向上

**ベストプラクティス:**
- `clamp()` でタイポグラフィを最適化
- `min()` / `max()` で柔軟なレイアウト
- CSS変数と組み合わせて再利用性を高める
- 新しい関数はフォールバックを用意

これらの関数をマスターすれば、より柔軟で保守性の高いCSSを書けるようになります。

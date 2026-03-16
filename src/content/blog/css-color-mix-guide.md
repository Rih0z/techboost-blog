---
title: "CSS color-mix()関数の実践活用：動的カラー生成テクニック"
description: "CSS color-mix()関数を使った動的な色生成、テーマカラーの派生、アクセシビリティ対応など、実践的な活用方法を詳しく解説します。"
pubDate: "2025-02-06"
tags: ["CSS", "color-mix", "デザインシステム", "アクセシビリティ", "カラー", "プログラミング"]
heroImage: '../../assets/thumbnails/css-color-mix-guide.jpg'
---
## color-mix()とは

`color-mix()`は、2つの色を指定した比率で混ぜ合わせる新しいCSS関数です。従来のSassやPostCSSでしか実現できなかった動的な色生成が、純粋なCSSだけで可能になりました。

### 基本構文

```css
color-mix(in <colorspace>, <color1> <percentage>, <color2> <percentage>)
```

### ブラウザサポート

- Chrome 111+
- Firefox 113+
- Safari 16.2+
- Edge 111+

## 基本的な使い方

### シンプルな色の混合

```css
/* 50%ずつ混ぜる */
.element {
  background: color-mix(in srgb, blue, yellow);
  /* 結果: 緑がかった色 */
}

/* 比率を指定 */
.element {
  background: color-mix(in srgb, blue 70%, yellow 30%);
  /* 青寄りの色 */
}

/* 片方だけ指定（残りは自動計算） */
.element {
  background: color-mix(in srgb, blue 25%, yellow);
  /* blue 25% + yellow 75% */
}
```

### カラースペースの選択

```css
/* sRGB色空間（デフォルト） */
.srgb {
  background: color-mix(in srgb, red, blue);
}

/* OKLCH色空間（知覚的に均一） */
.oklch {
  background: color-mix(in oklch, red, blue);
}

/* HSL色空間 */
.hsl {
  background: color-mix(in hsl, red, blue);
}

/* LAB色空間 */
.lab {
  background: color-mix(in lab, red, blue);
}
```

カラースペースによる違い:

```css
:root {
  /* sRGBは数学的に混合（やや不自然） */
  --mix-srgb: color-mix(in srgb, #ff0000, #0000ff);
  
  /* OKLCHは人間の知覚に基づく混合（自然） */
  --mix-oklch: color-mix(in oklch, #ff0000, #0000ff);
  
  /* HSLは色相環に沿って混合 */
  --mix-hsl: color-mix(in hsl, #ff0000, #0000ff);
}
```

## デザインシステムでの活用

### ブランドカラーの派生色生成

```css
:root {
  /* ベースカラー */
  --brand-primary: #3b82f6;
  --brand-secondary: #8b5cf6;
  
  /* 明るいバリエーション */
  --primary-50: color-mix(in oklch, var(--brand-primary) 5%, white);
  --primary-100: color-mix(in oklch, var(--brand-primary) 10%, white);
  --primary-200: color-mix(in oklch, var(--brand-primary) 25%, white);
  --primary-300: color-mix(in oklch, var(--brand-primary) 40%, white);
  --primary-400: color-mix(in oklch, var(--brand-primary) 60%, white);
  --primary-500: var(--brand-primary);
  
  /* 暗いバリエーション */
  --primary-600: color-mix(in oklch, var(--brand-primary) 85%, black);
  --primary-700: color-mix(in oklch, var(--brand-primary) 70%, black);
  --primary-800: color-mix(in oklch, var(--brand-primary) 50%, black);
  --primary-900: color-mix(in oklch, var(--brand-primary) 30%, black);
}

.button-primary {
  background: var(--primary-500);
  color: white;
}

.button-primary:hover {
  background: var(--primary-600);
}

.button-primary:active {
  background: var(--primary-700);
}
```

### 透明度のコントロール

```css
:root {
  --brand-color: #3b82f6;
  
  /* 透明度のバリエーション */
  --brand-alpha-10: color-mix(in srgb, var(--brand-color) 10%, transparent);
  --brand-alpha-20: color-mix(in srgb, var(--brand-color) 20%, transparent);
  --brand-alpha-50: color-mix(in srgb, var(--brand-color) 50%, transparent);
  --brand-alpha-80: color-mix(in srgb, var(--brand-color) 80%, transparent);
}

.overlay {
  background: var(--brand-alpha-50);
  backdrop-filter: blur(8px);
}

.shadow {
  box-shadow: 0 4px 6px var(--brand-alpha-20);
}
```

## ダークモード対応

### 自動的な色の調整

```css
:root {
  --bg-base: white;
  --text-base: #1a1a1a;
  --surface-color: #f5f5f5;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-base: #1a1a1a;
    --text-base: white;
    --surface-color: #2a2a2a;
  }
}

/* ベース色を基に派生色を生成 */
.card {
  background: var(--surface-color);
  border: 1px solid color-mix(in srgb, var(--text-base) 10%, transparent);
  color: var(--text-base);
}

.card:hover {
  background: color-mix(in srgb, var(--surface-color), var(--text-base) 5%);
}
```

### セマンティックカラーの生成

```css
:root {
  --brand-primary: #3b82f6;
  
  /* ライトモード */
  --color-primary: var(--brand-primary);
  --color-primary-hover: color-mix(in oklch, var(--brand-primary) 85%, black);
  --color-primary-text: color-mix(in oklch, var(--brand-primary) 20%, black);
  
  /* 背景色に対するコントラスト調整 */
  --bg-primary: color-mix(in oklch, var(--brand-primary) 10%, white);
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-primary: color-mix(in oklch, var(--brand-primary) 80%, white);
    --color-primary-hover: color-mix(in oklch, var(--brand-primary) 90%, white);
    --color-primary-text: color-mix(in oklch, var(--brand-primary) 60%, white);
    --bg-primary: color-mix(in oklch, var(--brand-primary) 15%, black);
  }
}
```

## インタラクティブな状態管理

### ホバー・フォーカス状態

```css
.interactive-button {
  --base-color: #3b82f6;
  
  background: var(--base-color);
  color: white;
  transition: background 0.2s;
}

.interactive-button:hover {
  background: color-mix(in oklch, var(--base-color) 90%, white);
}

.interactive-button:active {
  background: color-mix(in oklch, var(--base-color) 85%, black);
}

.interactive-button:focus-visible {
  outline: 2px solid var(--base-color);
  outline-offset: 2px;
  background: color-mix(in oklch, var(--base-color) 95%, white);
}

.interactive-button:disabled {
  background: color-mix(in srgb, var(--base-color) 30%, gray);
  cursor: not-allowed;
  opacity: 0.6;
}
```

### 進行状態の視覚化

```css
.progress-indicator {
  --progress-color: #10b981;
  --progress-value: 65%; /* JavaScriptから動的に設定 */
  
  width: 100%;
  height: 8px;
  background: color-mix(in srgb, var(--progress-color) 20%, transparent);
  border-radius: 4px;
  overflow: hidden;
}

.progress-indicator::before {
  content: '';
  display: block;
  width: var(--progress-value);
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--progress-color),
    color-mix(in oklch, var(--progress-color), white 30%)
  );
  transition: width 0.3s ease;
}
```

## グラデーションとの組み合わせ

### 動的グラデーション生成

```css
.gradient-card {
  --base-color: #6366f1;
  
  background: linear-gradient(
    135deg,
    var(--base-color),
    color-mix(in oklch, var(--base-color), #ec4899 50%)
  );
}

/* 複数のストップポイント */
.complex-gradient {
  --primary: #3b82f6;
  --secondary: #8b5cf6;
  
  background: linear-gradient(
    to right,
    var(--primary),
    color-mix(in oklch, var(--primary) 70%, var(--secondary) 30%),
    color-mix(in oklch, var(--primary) 50%, var(--secondary) 50%),
    color-mix(in oklch, var(--primary) 30%, var(--secondary) 70%),
    var(--secondary)
  );
}
```

### グラデーションオーバーレイ

```css
.image-card {
  position: relative;
  overflow: hidden;
}

.image-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, black 0%, transparent),
    color-mix(in srgb, black 70%, transparent)
  );
}
```

## アクセシビリティ対応

### コントラスト比の自動調整

```css
:root {
  --brand-color: #3b82f6;
  --bg-color: white;
}

/* 背景色に対して十分なコントラストを確保 */
.accessible-text {
  background: var(--bg-color);
  color: color-mix(in oklch, var(--brand-color) 70%, black);
  /* より暗くすることでコントラスト比を向上 */
}

/* ボタンのコントラスト */
.accessible-button {
  background: var(--brand-color);
  /* 背景色が明るい場合は暗いテキスト、暗い場合は明るいテキスト */
  color: color-mix(in oklch, var(--brand-color) 10%, white);
}

@media (prefers-contrast: more) {
  .accessible-button {
    /* 高コントラストモードでより強調 */
    background: color-mix(in oklch, var(--brand-color) 85%, black);
    color: white;
    border: 2px solid currentColor;
  }
}
```

### 色覚異常への配慮

```css
/* 色だけに頼らない表現 */
.status-indicator {
  --status-color: #10b981; /* success green */
  
  background: color-mix(in srgb, var(--status-color) 15%, transparent);
  border-left: 4px solid var(--status-color);
  color: color-mix(in oklch, var(--status-color) 60%, black);
}

.status-indicator::before {
  content: '✓ ';
  /* アイコンで状態を補足 */
}

/* 色相だけでなく明度も変える */
.error {
  --error-base: #ef4444;
  background: color-mix(in oklch, var(--error-base) 10%, white);
  border: 2px solid color-mix(in oklch, var(--error-base) 70%, black);
}
```

## 実践的なパターン

### カラーパレットジェネレーター

```css
@property --hue {
  syntax: '<number>';
  inherits: false;
  initial-value: 200;
}

.palette-generator {
  --base-hue: var(--hue);
  --saturation: 70%;
  --lightness: 50%;
  
  /* ベースカラー */
  --color-1: oklch(var(--lightness) var(--saturation) var(--base-hue));
  
  /* 類似色 */
  --color-2: oklch(var(--lightness) var(--saturation) calc(var(--base-hue) + 30));
  --color-3: oklch(var(--lightness) var(--saturation) calc(var(--base-hue) - 30));
  
  /* 補色 */
  --color-complement: oklch(var(--lightness) var(--saturation) calc(var(--base-hue) + 180));
  
  /* トーンバリエーション */
  --color-light: color-mix(in oklch, var(--color-1) 60%, white);
  --color-dark: color-mix(in oklch, var(--color-1) 60%, black);
}

/* JavaScriptから動的に変更 */
.palette-generator {
  animation: hue-rotation 10s linear infinite;
}

@keyframes hue-rotation {
  to {
    --hue: 560; /* 360 + 200 */
  }
}
```

### テーマバリエーション

```css
/* ベーステーマ */
:root {
  --theme-primary: #3b82f6;
  --theme-secondary: #8b5cf6;
  --theme-accent: #ec4899;
}

/* 派生色の自動生成 */
.theme-surface {
  --surface-1: color-mix(in oklch, var(--theme-primary) 5%, white);
  --surface-2: color-mix(in oklch, var(--theme-primary) 10%, white);
  --surface-3: color-mix(in oklch, var(--theme-primary) 15%, white);
  
  background: var(--surface-1);
  border: 1px solid color-mix(in srgb, var(--theme-primary) 20%, transparent);
}

/* カスタムテーマの適用 */
[data-theme="ocean"] {
  --theme-primary: #0ea5e9;
  --theme-secondary: #06b6d4;
  --theme-accent: #14b8a6;
}

[data-theme="sunset"] {
  --theme-primary: #f59e0b;
  --theme-secondary: #ef4444;
  --theme-accent: #ec4899;
}
```

### グラスモーフィズム効果

```css
.glass-card {
  --glass-color: #ffffff;
  --glass-opacity: 15%;
  
  background: color-mix(
    in srgb,
    var(--glass-color) var(--glass-opacity),
    transparent
  );
  backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid color-mix(
    in srgb,
    var(--glass-color) 30%,
    transparent
  );
  box-shadow: 
    0 8px 32px color-mix(in srgb, black 10%, transparent),
    inset 0 1px 0 color-mix(in srgb, white 20%, transparent);
}

/* ダークモード対応 */
@media (prefers-color-scheme: dark) {
  .glass-card {
    --glass-color: #1a1a1a;
    --glass-opacity: 40%;
  }
}
```

## パフォーマンス最適化

### CSS変数との組み合わせ

```css
/* 計算結果をキャッシュ */
:root {
  --primary: #3b82f6;
  
  /* 一度だけ計算 */
  --primary-light: color-mix(in oklch, var(--primary) 80%, white);
  --primary-dark: color-mix(in oklch, var(--primary) 80%, black);
}

/* 再利用 */
.button {
  background: var(--primary);
}

.button:hover {
  background: var(--primary-light);
}

.button:active {
  background: var(--primary-dark);
}
```

### カスケードの活用

```css
/* コンテキストに応じた色の継承 */
.theme-context {
  --context-color: #3b82f6;
}

.theme-context .child {
  /* 親のコンテキストカラーを継承 */
  background: color-mix(in oklch, var(--context-color) 10%, white);
  border: 1px solid color-mix(in srgb, var(--context-color) 30%, transparent);
}
```

## フォールバック対応

### 古いブラウザへの対応

```css
.modern-color {
  /* フォールバック */
  background: #3b82f6;
  
  /* color-mix()をサポートしているブラウザのみ */
  background: color-mix(in oklch, #3b82f6 80%, white);
}

/* @supportsで分岐 */
@supports (background: color-mix(in oklch, red, blue)) {
  .advanced-colors {
    --primary: #3b82f6;
    background: color-mix(in oklch, var(--primary) 90%, white);
  }
}

@supports not (background: color-mix(in oklch, red, blue)) {
  .advanced-colors {
    /* 代替実装 */
    background: rgba(59, 130, 246, 0.9);
  }
}
```

## ベストプラクティス

### 1. 適切なカラースペースの選択

- **OKLCH**: 知覚的に均一な色変化が必要な場合（推奨）
- **sRGB**: 単純な混合で十分な場合
- **HSL**: 色相の変化を重視する場合
- **LAB**: 科学的に正確な色表現が必要な場合

### 2. CSS変数との組み合わせ

```css
/* 良い例: 再利用可能 */
:root {
  --brand: #3b82f6;
  --brand-light: color-mix(in oklch, var(--brand) 80%, white);
}

/* 悪い例: 重複した計算 */
.element1 {
  background: color-mix(in oklch, #3b82f6 80%, white);
}
.element2 {
  background: color-mix(in oklch, #3b82f6 80%, white);
}
```

### 3. アクセシビリティの確保

- コントラスト比を常にチェック
- 色だけに依存しない表現
- 高コントラストモードへの対応

---

## 関連記事

- [プログラミングスクール比較2026年版｜現役エンジニアが選ぶ厳選8校](/blog/2026-03-08-programming-school-comparison-2026)
- [エンジニア転職完全ガイド2026](/blog/2026-03-09-engineer-career-change-guide-2026)

## まとめ

`color-mix()`関数により:

- 動的な色生成がCSSだけで可能に
- デザインシステムの実装が簡潔に
- ダークモード対応が容易に
- アクセシビリティの向上

適切なカラースペース選択と、CSS変数との組み合わせにより、保守性の高いスタイルシートを構築できます。

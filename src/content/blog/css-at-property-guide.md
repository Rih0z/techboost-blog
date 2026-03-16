---
title: 'CSS @propertyルール活用ガイド'
description: 'CSS @propertyによるカスタムプロパティの型定義、初期値設定、アニメーション対応の実践的な使い方を完全解説。'
pubDate: 2025-02-05
tags: ['CSS', '@property', 'Custom Properties', 'CSS Variables', 'Animation']
heroImage: '../../assets/thumbnails/css-at-property-guide.jpg'
---
CSS `@property` ルールは、カスタムプロパティ（CSS変数）に型情報を与え、より強力で予測可能なスタイリングを実現する機能です。本記事では、`@property` の実践的な使い方について詳しく解説します。

## @propertyの基本

### 従来のカスタムプロパティの問題点

通常のCSSカスタムプロパティは型を持ちません。

```css
:root {
  --primary-color: #3b82f6;
  --spacing: 16px;
}

.button {
  background: var(--primary-color);
  padding: var(--spacing);
}
```

これには以下の問題があります。

- 型安全性がない
- 無効な値をアニメーションできない
- ブラウザが値の種類を推測する必要がある

### @propertyの導入

`@property` を使用すると、型情報を明示的に定義できます。

```css
@property --primary-color {
  syntax: '<color>';
  inherits: false;
  initial-value: #3b82f6;
}

@property --spacing {
  syntax: '<length>';
  inherits: true;
  initial-value: 16px;
}
```

## syntax プロパティ

`syntax` は、カスタムプロパティが受け入れる値の型を定義します。

### 基本的な型

```css
/* 色 */
@property --brand-color {
  syntax: '<color>';
  inherits: false;
  initial-value: blue;
}

/* 長さ */
@property --gap {
  syntax: '<length>';
  inherits: true;
  initial-value: 1rem;
}

/* パーセンテージ */
@property --opacity-percent {
  syntax: '<percentage>';
  inherits: false;
  initial-value: 100%;
}

/* 数値 */
@property --scale {
  syntax: '<number>';
  inherits: false;
  initial-value: 1;
}

/* 角度 */
@property --rotation {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}

/* 時間 */
@property --duration {
  syntax: '<time>';
  inherits: false;
  initial-value: 0s;
}
```

### 複合型と制約

```css
/* 複数の型を許可 */
@property --theme-value {
  syntax: '<color> | <length>';
  inherits: false;
  initial-value: blue;
}

/* スペース区切りのリスト */
@property --gradient-colors {
  syntax: '<color>+';
  inherits: false;
  initial-value: red blue;
}

/* カンマ区切りのリスト */
@property --shadows {
  syntax: '<length>#';
  inherits: false;
  initial-value: 0px, 4px;
}

/* ワイルドカード（任意の値） */
@property --custom-value {
  syntax: '*';
  inherits: false;
  initial-value: anything;
}
```

## inheritsプロパティ

`inherits` は、プロパティが親要素から継承されるかを制御します。

```css
/* 継承する */
@property --font-scale {
  syntax: '<number>';
  inherits: true;
  initial-value: 1;
}

/* 継承しない */
@property --component-color {
  syntax: '<color>';
  inherits: false;
  initial-value: #000;
}
```

実際の使用例：

```html
<div class="parent">
  <div class="child">Child Text</div>
</div>
```

```css
@property --text-scale {
  syntax: '<number>';
  inherits: true;
  initial-value: 1;
}

.parent {
  --text-scale: 1.5;
  font-size: calc(1rem * var(--text-scale));
}

.child {
  /* --text-scale: 1.5 が継承される */
  font-size: calc(0.875rem * var(--text-scale));
}
```

## initial-valueプロパティ

`initial-value` は、プロパティが設定されていない場合のデフォルト値を定義します。

```css
@property --theme-primary {
  syntax: '<color>';
  inherits: false;
  initial-value: #3b82f6;
}

/* initial-valueが使用される */
.button {
  background: var(--theme-primary);
}

/* 明示的な値で上書き */
.button-danger {
  --theme-primary: #ef4444;
  background: var(--theme-primary);
}
```

## アニメーションとトランジション

`@property` の最大の利点は、カスタムプロパティをアニメーション可能にすることです。

### グラデーションアニメーション

通常のカスタムプロパティではグラデーションをアニメーションできません。

```css
/* ❌ 動作しない */
:root {
  --gradient-angle: 0deg;
}

.box {
  background: linear-gradient(var(--gradient-angle), red, blue);
  animation: rotate 3s linear infinite;
}

@keyframes rotate {
  to {
    --gradient-angle: 360deg;
  }
}
```

`@property` を使用すると可能になります。

```css
/* ✅ 動作する */
@property --gradient-angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}

.box {
  background: linear-gradient(var(--gradient-angle), red, blue);
  animation: rotate 3s linear infinite;
}

@keyframes rotate {
  to {
    --gradient-angle: 360deg;
  }
}
```

### カラートランジション

```css
@property --button-color {
  syntax: '<color>';
  inherits: false;
  initial-value: #3b82f6;
}

.button {
  background: var(--button-color);
  transition: --button-color 0.3s ease;
}

.button:hover {
  --button-color: #2563eb;
}
```

### 数値アニメーション

```css
@property --progress {
  syntax: '<percentage>';
  inherits: false;
  initial-value: 0%;
}

.progress-bar {
  width: var(--progress);
  height: 24px;
  background: linear-gradient(
    90deg,
    #3b82f6 var(--progress),
    #e5e7eb var(--progress)
  );
  transition: --progress 0.5s ease-out;
}

.progress-bar.loaded {
  --progress: 100%;
}
```

## 実践例

### テーマシステム

```css
/* カラープロパティの定義 */
@property --theme-primary {
  syntax: '<color>';
  inherits: true;
  initial-value: #3b82f6;
}

@property --theme-secondary {
  syntax: '<color>';
  inherits: true;
  initial-value: #8b5cf6;
}

@property --theme-background {
  syntax: '<color>';
  inherits: true;
  initial-value: #ffffff;
}

/* ライトテーマ */
:root {
  --theme-primary: #3b82f6;
  --theme-secondary: #8b5cf6;
  --theme-background: #ffffff;
}

/* ダークテーマ */
[data-theme='dark'] {
  --theme-primary: #60a5fa;
  --theme-secondary: #a78bfa;
  --theme-background: #1f2937;
}

/* トランジション付きコンポーネント */
.card {
  background: var(--theme-background);
  border: 2px solid var(--theme-primary);
  transition: --theme-background 0.3s, --theme-primary 0.3s;
}
```

### アニメーション付きローディング

```css
@property --loading-angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}

@property --loading-opacity {
  syntax: '<number>';
  inherits: false;
  initial-value: 1;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid transparent;
  border-top-color: hsl(var(--loading-angle), 70%, 50%);
  border-radius: 50%;
  opacity: var(--loading-opacity);
  animation: spin 1s linear infinite, pulse 2s ease-in-out infinite;
}

@keyframes spin {
  to {
    --loading-angle: 360deg;
  }
}

@keyframes pulse {
  0%,
  100% {
    --loading-opacity: 1;
  }
  50% {
    --loading-opacity: 0.5;
  }
}
```

### レスポンシブスペーシング

```css
@property --spacing-unit {
  syntax: '<length>';
  inherits: true;
  initial-value: 8px;
}

:root {
  --spacing-unit: 8px;
}

@media (min-width: 768px) {
  :root {
    --spacing-unit: 12px;
  }
}

@media (min-width: 1024px) {
  :root {
    --spacing-unit: 16px;
  }
}

.container {
  padding: calc(var(--spacing-unit) * 2);
  gap: var(--spacing-unit);
  transition: padding 0.3s, gap 0.3s;
}

.section {
  margin-bottom: calc(var(--spacing-unit) * 4);
  transition: margin-bottom 0.3s;
}
```

### インタラクティブグラデーション

```css
@property --gradient-start {
  syntax: '<color>';
  inherits: false;
  initial-value: #3b82f6;
}

@property --gradient-end {
  syntax: '<color>';
  inherits: false;
  initial-value: #8b5cf6;
}

@property --gradient-position {
  syntax: '<percentage>';
  inherits: false;
  initial-value: 50%;
}

.gradient-box {
  background: linear-gradient(
    135deg,
    var(--gradient-start) 0%,
    var(--gradient-end) 100%
  );
  transition: --gradient-start 0.5s, --gradient-end 0.5s;
}

.gradient-box:hover {
  --gradient-start: #ef4444;
  --gradient-end: #f59e0b;
}
```

## JavaScriptとの連携

JavaScriptから `@property` を登録することも可能です。

```javascript
// @propertyをプログラマティックに登録
CSS.registerProperty({
  name: '--dynamic-color',
  syntax: '<color>',
  inherits: false,
  initialValue: '#3b82f6',
});

// カスタムプロパティを設定
document.documentElement.style.setProperty('--dynamic-color', '#ef4444');

// 値を取得
const color = getComputedStyle(document.documentElement).getPropertyValue(
  '--dynamic-color'
);
console.log(color); // "#ef4444"
```

動的なアニメーション制御：

```javascript
CSS.registerProperty({
  name: '--animation-progress',
  syntax: '<percentage>',
  inherits: false,
  initialValue: '0%',
});

const element = document.querySelector('.animated-element');
let progress = 0;

function animate() {
  progress += 1;
  if (progress <= 100) {
    element.style.setProperty('--animation-progress', `${progress}%`);
    requestAnimationFrame(animate);
  }
}

animate();
```

## ブラウザサポートと代替策

### サポート状況の確認

```javascript
if ('registerProperty' in CSS) {
  CSS.registerProperty({
    name: '--my-property',
    syntax: '<color>',
    inherits: false,
    initialValue: 'blue',
  });
} else {
  // フォールバック
  document.documentElement.style.setProperty('--my-property', 'blue');
}
```

### プログレッシブエンハンスメント

```css
/* フォールバック */
.element {
  background: blue;
}

/* @propertyがサポートされている場合 */
@supports (background: var(--test-property, red)) {
  @property --element-color {
    syntax: '<color>';
    inherits: false;
    initial-value: blue;
  }

  .element {
    background: var(--element-color);
    transition: --element-color 0.3s;
  }

  .element:hover {
    --element-color: darkblue;
  }
}
```

---

## 関連記事

- [プログラミングスクール比較2026年版｜現役エンジニアが選ぶ厳選8校](/blog/2026-03-08-programming-school-comparison-2026)
- [エンジニア転職完全ガイド2026](/blog/2026-03-09-engineer-career-change-guide-2026)

## まとめ

CSS `@property` ルールは、カスタムプロパティに以下の機能を追加します。

- **型安全性**: `syntax` による型定義
- **継承制御**: `inherits` による明示的な継承設定
- **デフォルト値**: `initial-value` による初期値の設定
- **アニメーション**: 型付きプロパティのスムーズなアニメーション

これにより、より予測可能で保守性の高いCSSを書くことができます。モダンブラウザでのサポートも広がっており、今後のCSSスタイリングの標準となるでしょう。

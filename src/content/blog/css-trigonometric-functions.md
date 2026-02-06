---
title: 'CSS三角関数実践ガイド：sin(), cos(), tan()で作るアニメーション'
description: 'CSSの三角関数（sin, cos, tan, atan2）を使った実践的なテクニックを解説。円形配置、波形アニメーション、回転エフェクトなど、コード例とともに詳しく紹介します。'
pubDate: 'Feb 06 2026'
tags: ['CSS', '三角関数', 'アニメーション', 'フロントエンド', 'デザイン']
---

CSS Values and Units Module Level 4で導入された三角関数は、複雑な数学計算をCSSだけで実現できる強力な機能です。この記事では、sin()、cos()、tan()、atan2()の実践的な使い方を解説します。

## CSS三角関数の基本

### 利用可能な関数

CSS Trigonometric Functionsは以下の関数を提供します。

- **sin()** - サイン（正弦）
- **cos()** - コサイン（余弦）
- **tan()** - タンジェント（正接）
- **asin()** - アークサイン（逆正弦）
- **acos()** - アークコサイン（逆余弦）
- **atan()** - アークタンジェント（逆正接）
- **atan2()** - 2引数アークタンジェント

### ブラウザサポート

2026年現在、主要ブラウザすべてでサポートされています。

```css
/* モダンブラウザ全てで動作 */
.element {
  transform: translateX(calc(sin(45deg) * 100px));
}
```

### 基本的な構文

```css
/* 角度指定（deg、rad、grad、turn） */
sin(45deg)      /* 度数法 */
sin(0.785rad)   /* ラジアン */
sin(50grad)     /* グラード */
sin(0.125turn)  /* 回転（1turn = 360deg） */

/* 結果は-1から1の範囲の数値 */
cos(0deg)    /* → 1 */
sin(90deg)   /* → 1 */
tan(45deg)   /* → 1 */
```

## 円形配置（Circular Layout）

三角関数の最も一般的な用途は、要素を円形に配置することです。

### 基本的な円形配置

```html
<div class="circle-container">
  <div class="item" style="--index: 0"></div>
  <div class="item" style="--index: 1"></div>
  <div class="item" style="--index: 2"></div>
  <div class="item" style="--index: 3"></div>
  <div class="item" style="--index: 4"></div>
  <div class="item" style="--index: 5"></div>
</div>
```

```css
.circle-container {
  position: relative;
  width: 400px;
  height: 400px;
}

.item {
  --total: 6;          /* 総数 */
  --radius: 150px;     /* 半径 */

  /* 角度を計算（360度を等分） */
  --angle: calc(360deg / var(--total) * var(--index));

  /* sin/cosで座標を計算 */
  --x: calc(cos(var(--angle)) * var(--radius));
  --y: calc(sin(var(--angle)) * var(--radius));

  position: absolute;
  top: 50%;
  left: 50%;

  /* 中心からのオフセット */
  transform: translate(
    calc(-50% + var(--x)),
    calc(-50% + var(--y))
  );

  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
}
```

### 回転する円形配置

```css
.circle-container {
  position: relative;
  width: 400px;
  height: 400px;
  animation: rotate 10s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.item {
  --total: 8;
  --radius: 150px;
  --angle: calc(360deg / var(--total) * var(--index));
  --x: calc(cos(var(--angle)) * var(--radius));
  --y: calc(sin(var(--angle)) * var(--radius));

  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(
    calc(-50% + var(--x)),
    calc(-50% + var(--y))
  );

  width: 60px;
  height: 60px;
  background: #3b82f6;
  border-radius: 50%;

  /* カウンターローテーション（常に正立） */
  animation: counter-rotate 10s linear infinite reverse;
}

@keyframes counter-rotate {
  from {
    transform: translate(
      calc(-50% + var(--x)),
      calc(-50% + var(--y))
    ) rotate(0deg);
  }
  to {
    transform: translate(
      calc(-50% + var(--x)),
      calc(-50% + var(--y))
    ) rotate(360deg);
  }
}
```

## 波形アニメーション

sin()を使えば、滑らかな波形アニメーションを作成できます。

### 横波アニメーション

```html
<div class="wave-container">
  <div class="wave-item" style="--index: 0"></div>
  <div class="wave-item" style="--index: 1"></div>
  <div class="wave-item" style="--index: 2"></div>
  <div class="wave-item" style="--index: 3"></div>
  <div class="wave-item" style="--index: 4"></div>
  <div class="wave-item" style="--index: 5"></div>
  <div class="wave-item" style="--index: 6"></div>
  <div class="wave-item" style="--index: 7"></div>
</div>
```

```css
.wave-container {
  display: flex;
  gap: 10px;
  padding: 50px;
}

.wave-item {
  width: 30px;
  height: 30px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 50%;

  /* sin関数で上下に動かす */
  animation: wave 2s ease-in-out infinite;
  animation-delay: calc(var(--index) * 0.1s);
}

@keyframes wave {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    /* sin関数的な動き（CSSアニメーションのease-in-outがsin曲線に近い） */
    transform: translateY(-40px);
  }
}
```

### sin()を直接使った波形

```css
.wave-item {
  --frequency: 2;  /* 周波数 */
  --amplitude: 50px;  /* 振幅 */
  --phase: calc(var(--index) * 45deg);  /* 位相 */

  width: 30px;
  height: 30px;
  background: #3b82f6;
  border-radius: 50%;

  /* sin関数で位置を計算 */
  transform: translateY(
    calc(sin(var(--phase)) * var(--amplitude))
  );

  animation: wave-phase 2s linear infinite;
}

@keyframes wave-phase {
  from {
    --phase: calc(var(--index) * 45deg);
  }
  to {
    --phase: calc(var(--index) * 45deg + 360deg);
  }
}
```

## ローディングアニメーション

### 回転ドットローダー

```html
<div class="loader">
  <div class="dot" style="--index: 0"></div>
  <div class="dot" style="--index: 1"></div>
  <div class="dot" style="--index: 2"></div>
  <div class="dot" style="--index: 3"></div>
  <div class="dot" style="--index: 4"></div>
  <div class="dot" style="--index: 5"></div>
  <div class="dot" style="--index: 6"></div>
  <div class="dot" style="--index: 7"></div>
</div>
```

```css
.loader {
  position: relative;
  width: 100px;
  height: 100px;
}

.dot {
  --total: 8;
  --radius: 40px;
  --angle: calc(360deg / var(--total) * var(--index));
  --x: calc(cos(var(--angle)) * var(--radius));
  --y: calc(sin(var(--angle)) * var(--radius));

  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(
    calc(-50% + var(--x)),
    calc(-50% + var(--y))
  );

  width: 12px;
  height: 12px;
  background: #3b82f6;
  border-radius: 50%;

  /* フェードイン・アウト */
  animation: fade 1.2s ease-in-out infinite;
  animation-delay: calc(var(--index) * 0.15s);
}

@keyframes fade {
  0%, 100% {
    opacity: 0.2;
    transform: translate(
      calc(-50% + var(--x)),
      calc(-50% + var(--y))
    ) scale(0.8);
  }
  50% {
    opacity: 1;
    transform: translate(
      calc(-50% + var(--x)),
      calc(-50% + var(--y))
    ) scale(1.2);
  }
}
```

### パルスローダー

```css
.pulse-loader {
  position: relative;
  width: 80px;
  height: 80px;
}

.pulse-ring {
  position: absolute;
  inset: 0;
  border: 3px solid #3b82f6;
  border-radius: 50%;
  animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  animation-delay: calc(var(--index) * 0.2s);
}

@keyframes pulse {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}
```

## 3D効果

### ペンデュラム（振り子）

```html
<div class="pendulum-container">
  <div class="pendulum">
    <div class="pendulum-bob"></div>
  </div>
</div>
```

```css
.pendulum-container {
  height: 300px;
  display: flex;
  justify-content: center;
  padding-top: 20px;
}

.pendulum {
  width: 2px;
  height: 200px;
  background: #333;
  transform-origin: top center;
  animation: swing 2s ease-in-out infinite;
}

@keyframes swing {
  0%, 100% {
    /* sin関数的な動き */
    transform: rotate(-30deg);
  }
  50% {
    transform: rotate(30deg);
  }
}

.pendulum-bob {
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 40px;
  background: radial-gradient(circle at 30% 30%, #fbbf24, #f59e0b);
  border-radius: 50%;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}
```

### 3D回転カード

```html
<div class="card-3d">
  <div class="card-front">Front</div>
  <div class="card-back">Back</div>
</div>
```

```css
.card-3d {
  width: 200px;
  height: 300px;
  perspective: 1000px;
  cursor: pointer;
}

.card-3d:hover .card-front {
  transform: rotateY(180deg);
}

.card-3d:hover .card-back {
  transform: rotateY(0deg);
}

.card-front,
.card-back {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  transition: transform 0.6s;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  color: white;
}

.card-front {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transform: rotateY(0deg);
}

.card-back {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  transform: rotateY(-180deg);
}
```

## atan2()を使った追従エフェクト

atan2()は2点間の角度を計算できます。

```html
<div class="follower-container">
  <div class="follower">
    <div class="arrow"></div>
  </div>
</div>
```

```css
.follower-container {
  position: relative;
  height: 400px;
  background: #f3f4f6;
  cursor: none;
}

.follower {
  --mouse-x: 50%;
  --mouse-y: 50%;
  --center-x: 50%;
  --center-y: 50%;

  position: absolute;
  top: var(--center-y);
  left: var(--center-x);
  width: 60px;
  height: 60px;
  background: #3b82f6;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: all 0.3s ease;
}

.arrow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 20px solid white;

  /* atan2()でマウス方向を向く */
  transform: translate(-50%, -50%)
    rotate(calc(atan2(
      var(--mouse-y) - var(--center-y),
      var(--mouse-x) - var(--center-x)
    ) + 90deg));
}
```

```javascript
// JavaScriptでマウス座標を更新
const container = document.querySelector('.follower-container');
const follower = document.querySelector('.follower');

container.addEventListener('mousemove', (e) => {
  const rect = container.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;

  follower.style.setProperty('--mouse-x', `${x}%`);
  follower.style.setProperty('--mouse-y', `${y}%`);
});
```

## パフォーマンスの最適化

### CSS変数との組み合わせ

```css
:root {
  --pi: 3.14159265359;
}

.element {
  /* 定数を使って可読性向上 */
  --angle-rad: calc(var(--angle-deg) * var(--pi) / 180);
  transform: translateX(calc(cos(var(--angle-rad) * 1rad) * 100px));
}
```

### will-changeの活用

```css
.animated-element {
  will-change: transform;
  /* GPUアクセラレーションを有効化 */
  transform: translateZ(0);
}
```

## まとめ

CSS三角関数の主な用途をまとめます。

- **円形配置** - ナビゲーション、アバター配置
- **波形アニメーション** - ローディング、装飾
- **3D効果** - カード、ギャラリー
- **追従エフェクト** - インタラクティブUI
- **物理シミュレーション** - 振り子、回転

CSS三角関数を使えば、従来JavaScriptで実装していた複雑なアニメーションを、CSSだけで実現できます。パフォーマンスも向上し、コードもシンプルになります。

モダンなWebデザインを作るなら、CSS三角関数は必須のテクニックです。

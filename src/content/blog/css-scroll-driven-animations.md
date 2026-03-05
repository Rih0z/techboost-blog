---
title: 'CSS Scroll-driven Animations完全ガイド: JavaScriptなしでスクロール連動アニメーションを実装'
description: 'CSS Scroll-driven Animations APIを使って、JavaScriptなしでスクロールに連動したアニメーションを実装する方法を徹底解説。animation-timeline、view-timeline、scroll()、view()の使い方'
pubDate: 2025-05-20
updatedDate: 2025-05-20
tags: ['CSS', 'Scroll-driven Animations', 'Web Animation', 'フロントエンド', 'パフォーマンス', 'プログラミング']
category: 'フロントエンド'
---

# CSS Scroll-driven Animations完全ガイド: JavaScriptなしでスクロール連動アニメーションを実装

CSS Scroll-driven Animations APIは、スクロール位置に連動したアニメーションをJavaScriptなしで実装できる革新的な機能です。

本記事では、`animation-timeline`、`view-timeline`、`scroll()`、`view()`などの新しいプロパティを使った実践的なアニメーション実装を徹底解説します。

## Scroll-driven Animationsとは

### 従来の課題

これまでスクロール連動アニメーションを実装するには:

```javascript
// 従来: JavaScriptでスクロール監視（重い）
window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const element = document.querySelector('.animated');
    element.style.transform = `translateY(${scrollTop * 0.5}px)`;
});
```

問題点:
- **パフォーマンス低下**: メインスレッドでの処理
- **ジャンクが発生**: スクロールとアニメーションの同期ずれ
- **複雑な実装**: Intersection Observerとの組み合わせが必要

### Scroll-driven Animationsの利点

```css
/* 新しい方法: CSSだけで実装（軽量・滑らか） */
.animated {
    animation: slide linear;
    animation-timeline: scroll();
}

@keyframes slide {
    from { transform: translateY(0); }
    to { transform: translateY(200px); }
}
```

メリット:
- **高パフォーマンス**: コンポジターで動作
- **滑らかな動き**: スクロールと完全同期
- **シンプルな実装**: 宣言的に記述可能
- **保守性向上**: CSS内で完結

## ブラウザサポートとPolyfill

### 対応状況（2025年6月時点）

- Chrome/Edge: 115+（フル対応）
- Firefox: 114+（フル対応）
- Safari: 実験的サポート（要フラグ有効化）

### Polyfillの使用

```html
<!-- Polyfillの読み込み -->
<script src="https://flackr.github.io/scroll-timeline/dist/scroll-timeline.js"></script>
```

または:

```bash
npm install scroll-timeline
```

```javascript
import 'scroll-timeline';
```

## scroll()関数の基本

### スクロールコンテナに連動

```css
/* ページ全体のスクロールに連動 */
.hero-image {
    animation: parallax linear;
    animation-timeline: scroll(root);
}

@keyframes parallax {
    from {
        transform: translateY(0);
    }
    to {
        transform: translateY(-200px);
    }
}
```

### スクロール軸の指定

```css
/* 垂直スクロール（デフォルト） */
animation-timeline: scroll(block);

/* 水平スクロール */
animation-timeline: scroll(inline);

/* 特定コンテナ */
.scroll-container {
    overflow-y: scroll;
}

.item {
    animation: fade linear;
    animation-timeline: scroll(nearest block);
}
```

### 実践例: パララックス効果

```html
<section class="parallax-section">
    <div class="background"></div>
    <div class="midground"></div>
    <div class="foreground"></div>
    <div class="content">
        <h1>Parallax Scrolling</h1>
    </div>
</section>
```

```css
.parallax-section {
    position: relative;
    height: 100vh;
    overflow: hidden;
}

.background {
    position: absolute;
    width: 100%;
    height: 100%;
    background: url('bg.jpg') center/cover;
    animation: parallax-bg linear;
    animation-timeline: scroll(root);
}

.midground {
    position: absolute;
    width: 100%;
    height: 100%;
    background: url('mid.png') center/cover;
    animation: parallax-mid linear;
    animation-timeline: scroll(root);
}

.foreground {
    position: absolute;
    width: 100%;
    height: 100%;
    background: url('fg.png') center/cover;
    animation: parallax-fg linear;
    animation-timeline: scroll(root);
}

@keyframes parallax-bg {
    to { transform: translateY(-30%); }
}

@keyframes parallax-mid {
    to { transform: translateY(-50%); }
}

@keyframes parallax-fg {
    to { transform: translateY(-70%); }
}
```

## view()関数とview-timeline

### 要素の表示範囲に連動

```css
/* 要素がビューポートに入ると開始 */
.card {
    animation: fade-in linear;
    animation-timeline: view();
}

@keyframes fade-in {
    from {
        opacity: 0;
        transform: translateY(50px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
```

### view-timeline-insetで範囲調整

```css
.card {
    animation: slide-in linear;
    animation-timeline: view();
    animation-range: entry 0% cover 50%;
}

/* または */
.card {
    view-timeline-inset: 100px;
    animation: slide-in linear;
    animation-timeline: view();
}
```

### 実践例: カード出現アニメーション

```html
<div class="card-grid">
    <article class="card">
        <img src="image1.jpg" alt="">
        <h3>Card 1</h3>
        <p>Description</p>
    </article>
    <article class="card">
        <img src="image2.jpg" alt="">
        <h3>Card 2</h3>
        <p>Description</p>
    </article>
    <!-- 複数のカード -->
</div>
```

```css
.card {
    opacity: 0;
    animation: reveal linear both;
    animation-timeline: view();
    animation-range: entry 0% cover 40%;
}

@keyframes reveal {
    from {
        opacity: 0;
        transform: scale(0.8) translateY(100px);
        filter: blur(10px);
    }
    to {
        opacity: 1;
        transform: scale(1) translateY(0);
        filter: blur(0);
    }
}

/* 遅延を追加（カスケード効果） */
.card:nth-child(2) {
    animation-delay: 0.1s;
}

.card:nth-child(3) {
    animation-delay: 0.2s;
}
```

## animation-rangeで細かい制御

### 範囲の指定方法

```css
/* entry: 要素が画面に入り始めてから入り終わるまで */
animation-range: entry 0% entry 100%;

/* cover: 要素が画面内を移動する期間 */
animation-range: cover 0% cover 100%;

/* exit: 要素が画面から出始めて出終わるまで */
animation-range: exit 0% exit 100%;

/* contain: 要素が完全に画面内にある期間 */
animation-range: contain 0% contain 100%;

/* 複合指定 */
animation-range: entry 50% exit 50%;
```

### 実践例: プログレスバー

```html
<article class="progress-article">
    <div class="progress-bar"></div>
    <div class="content">
        <h2>Long Article</h2>
        <p>Content...</p>
        <!-- 長いコンテンツ -->
    </div>
</article>
```

```css
.progress-bar {
    position: fixed;
    top: 0;
    left: 0;
    height: 4px;
    background: linear-gradient(to right, #667eea, #764ba2);
    transform-origin: left;
    animation: progress linear;
    animation-timeline: view(block);
    animation-range: entry 0% exit 100%;
}

@keyframes progress {
    from {
        transform: scaleX(0);
    }
    to {
        transform: scaleX(1);
    }
}
```

## 高度な実装例

### 1. 水平スクロールギャラリー

```html
<div class="gallery-container">
    <div class="gallery">
        <img src="1.jpg" alt="">
        <img src="2.jpg" alt="">
        <img src="3.jpg" alt="">
        <img src="4.jpg" alt="">
    </div>
</div>
```

```css
.gallery-container {
    overflow-x: scroll;
    scroll-snap-type: x mandatory;
}

.gallery {
    display: flex;
    gap: 2rem;
}

.gallery img {
    scroll-snap-align: center;
    animation: scale-in linear;
    animation-timeline: view(inline);
    animation-range: entry 0% cover 50%;
}

@keyframes scale-in {
    from {
        transform: scale(0.7);
        opacity: 0.5;
    }
    to {
        transform: scale(1);
        opacity: 1;
    }
}
```

### 2. 数値カウントアップ

```html
<div class="stats">
    <div class="stat-item">
        <span class="stat-number" data-target="1000">0</span>
        <p>Users</p>
    </div>
</div>
```

```css
@property --num {
    syntax: '<integer>';
    initial-value: 0;
    inherits: false;
}

.stat-number {
    animation: counter linear both;
    animation-timeline: view();
    animation-range: entry 0% cover 50%;
    counter-reset: num var(--num);
}

.stat-number::after {
    content: counter(num);
}

@keyframes counter {
    from {
        --num: 0;
    }
    to {
        --num: 1000;
    }
}
```

### 3. テキストの文字ごとアニメーション

```html
<h1 class="animated-text">
    <span>S</span><span>c</span><span>r</span><span>o</span><span>l</span><span>l</span>
</h1>
```

```css
.animated-text {
    display: flex;
    gap: 0.2em;
}

.animated-text span {
    display: inline-block;
    animation: wave linear both;
    animation-timeline: view();
    animation-range: entry 0% cover 50%;
}

.animated-text span:nth-child(1) { animation-delay: 0s; }
.animated-text span:nth-child(2) { animation-delay: 0.05s; }
.animated-text span:nth-child(3) { animation-delay: 0.1s; }
.animated-text span:nth-child(4) { animation-delay: 0.15s; }
.animated-text span:nth-child(5) { animation-delay: 0.2s; }
.animated-text span:nth-child(6) { animation-delay: 0.25s; }

@keyframes wave {
    0%, 100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(-20px);
    }
}
```

### 4. 背景色変化

```css
@property --bg-hue {
    syntax: '<number>';
    initial-value: 0;
    inherits: false;
}

section {
    background: hsl(var(--bg-hue), 70%, 60%);
    animation: hue-shift linear;
    animation-timeline: view();
}

@keyframes hue-shift {
    from {
        --bg-hue: 0;
    }
    to {
        --bg-hue: 360;
    }
}
```

### 5. SVGパスアニメーション

```html
<svg viewBox="0 0 100 100" class="animated-svg">
    <path d="M10,90 Q50,10 90,90" stroke="currentColor" fill="none" />
</svg>
```

```css
.animated-svg path {
    stroke-dasharray: 200;
    stroke-dashoffset: 200;
    animation: draw linear;
    animation-timeline: view();
    animation-range: entry 0% cover 100%;
}

@keyframes draw {
    to {
        stroke-dashoffset: 0;
    }
}
```

## パフォーマンス最適化

### will-changeの活用

```css
.animated {
    will-change: transform, opacity;
    animation: slide linear;
    animation-timeline: scroll();
}
```

### コンポジター対応プロパティの使用

```css
/* 推奨: GPU加速されるプロパティ */
@keyframes good {
    to {
        transform: translateX(100px);
        opacity: 0.5;
    }
}

/* 非推奨: レイアウトに影響 */
@keyframes bad {
    to {
        width: 500px;
        margin-left: 100px;
    }
}
```

### contain-intrinsic-sizeでレイアウトシフト防止

```css
.lazy-content {
    contain: layout;
    contain-intrinsic-size: 0 500px;
}
```

## JavaScriptとの連携

### アニメーション状態の取得

```javascript
const element = document.querySelector('.animated');

// アニメーション情報の取得
const animations = element.getAnimations();

animations.forEach(anim => {
    // 進行度の監視
    console.log(anim.currentTime, anim.effect.getComputedTiming().progress);

    // 状態変更時
    anim.addEventListener('finish', () => {
        console.log('アニメーション完了');
    });
});
```

### 動的な制御

```javascript
const card = document.querySelector('.card');

// プログラムから開始
const animation = card.animate(
    [
        { opacity: 0, transform: 'translateY(50px)' },
        { opacity: 1, transform: 'translateY(0)' }
    ],
    {
        timeline: new ViewTimeline({
            subject: card,
            axis: 'block'
        }),
        rangeStart: 'entry 0%',
        rangeEnd: 'cover 50%'
    }
);
```

## デバッグとDevTools

### Chrome DevToolsでの確認

1. Elements → Animations タブ
2. スクロールタイムラインの可視化
3. 再生速度の調整
4. キーフレームの確認

### デバッグ用CSS

```css
/* タイムライン範囲を可視化 */
.debug {
    outline: 2px solid red;
    animation-timeline: view();
    animation-range: entry 0% exit 100%;
}

.debug::before {
    content: 'Timeline Active';
    position: absolute;
    background: red;
    color: white;
    padding: 4px;
}
```

## まとめ

CSS Scroll-driven Animationsの実装方法を解説しました。

### キーポイント

- **scroll()**: スクロール位置に連動
- **view()**: 要素の表示範囲に連動
- **animation-range**: アニメーション範囲の細かい制御
- **高パフォーマンス**: コンポジターで動作

### ベストプラクティス

1. **GPU加速プロパティを使用**: transform、opacityを中心に
2. **will-changeで最適化**: ただし過度な使用は避ける
3. **Polyfillで互換性確保**: Safari対応まで
4. **Progressive Enhancement**: 非対応ブラウザでも破綻しない設計

JavaScriptなしで滑らかなスクロールアニメーションを実現しましょう。

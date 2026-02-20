---
title: 'CSS アニメーション完全ガイド — transition・keyframes・scroll-driven・パフォーマンス最適化'
description: 'CSSアニメーションを完全マスターする実践ガイド。transition・animation・@keyframes・CSS Custom Properties・Scroll-Driven Animations・View Transitions API・パフォーマンス最適化まで実装例付きで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-4.jpg'
tags: ['CSS', 'アニメーション', 'フロントエンド', 'パフォーマンス', 'Web API']
---

CSSアニメーションは、現代のWebにおいて「ただ動く」ものではなく、ユーザーの認知負荷を下げ、状態変化を直感的に伝え、ブランドの個性を表現するための重要な設計言語だ。しかし「とりあえずtransitionを書けばいい」という段階から抜け出せていないエンジニアは多い。

本記事では、`transition` の基礎から `@keyframes`、CSS Custom Properties によるアニメーション変数管理、最新の Scroll-Driven Animations・View Transitions API、GPU最適化、アクセシビリティ対応まで、実装例を交えて体系的に解説する。読み終えた後には、あなたのCSSアニメーションの質が根本的に変わるはずだ。

---

## 1. transition — 状態変化を滑らかにする基本構文

`transition` はCSSプロパティの値が変わるときに、その変化を補間アニメーションで表示する仕組みだ。4つのサブプロパティで構成される。

### 1-1. transition の4つのサブプロパティ

```css
.button {
  /* transition: プロパティ名 継続時間 タイミング関数 遅延時間; */
  transition: background-color 0.3s ease-in-out 0s;
}
```

**`transition-property`**

アニメーション対象のCSSプロパティを指定する。`all` を指定するとすべてのプロパティが対象になるが、パフォーマンスの観点から必要なプロパティのみを明示的に指定することを推奨する。

```css
/* 悪い例: all は予期しないプロパティにも適用される */
.card { transition: all 0.3s ease; }

/* 良い例: 対象を明示する */
.card {
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease,
    opacity 0.2s ease;
}
```

**`transition-duration`**

アニメーションの継続時間を `s`（秒）または `ms`（ミリ秒）で指定する。UIの変化では 150〜400ms が体感的に自然と言われている。

**`transition-timing-function`**

時間軸に対する速度変化を定義する。後述の Easing 関数の節で詳しく解説する。

**`transition-delay`**

アニメーション開始までの遅延時間。負の値を指定すると、アニメーションの途中から開始したように見せることができる。

### 1-2. 複数プロパティへの同時適用

```css
.nav-link {
  color: #333;
  border-bottom: 2px solid transparent;
  padding-bottom: 4px;
  transition:
    color 0.2s ease,
    border-color 0.2s ease 0.05s; /* border-colorは少し遅れて変化 */
}

.nav-link:hover {
  color: #0066cc;
  border-bottom-color: #0066cc;
}
```

遅延時間をプロパティごとに少しずらすことで、カスケード効果（ripple）のような演出が生まれる。

### 1-3. transition で注意すべき制限

`transition` には **開始状態と終了状態が明確に存在している必要がある**。たとえば `height: auto` から `height: 0` へのトランジションはデフォルトでは機能しない。これを解決するには `max-height` を使うか、後述の CSS の `interpolate-size` プロパティ（2025年〜）を活用する。

```css
/* height: auto へのトランジション (従来の回避策) */
.accordion-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.4s ease;
}

.accordion-content.open {
  max-height: 1000px; /* 十分に大きな値 */
}
```

---

## 2. @keyframes と animation — 複雑な動きを定義する

`transition` が「AからBへの変化」を扱うのに対し、`@keyframes` + `animation` は「任意の時点における状態の列」を定義できる。ループ、逆再生、一時停止など高度な制御も可能だ。

### 2-1. @keyframes の構文

```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* パーセンテージで複数の中間点を指定 */
@keyframes pulse {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.08); }
  100% { transform: scale(1); }
}

/* 複数のキーフレームに同じスタイルを適用 */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-8px); }
  40%, 80% { transform: translateX(8px); }
}
```

### 2-2. animation の8つのサブプロパティ完全解説

```css
.hero-title {
  animation:
    fadeInUp        /* animation-name */
    0.6s            /* animation-duration */
    ease-out        /* animation-timing-function */
    0.2s            /* animation-delay */
    1               /* animation-iteration-count */
    normal          /* animation-direction */
    forwards        /* animation-fill-mode */
    running;        /* animation-play-state */
}
```

**`animation-name`**

適用する `@keyframes` の名前。カンマ区切りで複数指定できる。`none` を指定するとアニメーションなし。

**`animation-duration`**

1サイクルの継続時間。`0s` を指定するとアニメーションは即時完了する（fill-mode の影響は残る）。

**`animation-timing-function`**

各キーフレーム間の速度変化を制御する。`@keyframes` 内の各ステップに個別指定も可能。

**`animation-delay`**

アニメーション開始前の待機時間。負の値で「途中から再生中のように見せる」テクニックが使える。

```css
/* ロード時に既にアニメーション中に見えるローダー */
.spinner {
  animation: rotate 1s linear infinite -0.5s;
}
```

**`animation-iteration-count`**

繰り返し回数。`infinite` で無限ループ。小数値（例: `2.5`）も指定可能で、2.5周したところで止まる。

**`animation-direction`**

| 値 | 挙動 |
|---|---|
| `normal` | 毎回 0% → 100% の方向で再生 |
| `reverse` | 毎回 100% → 0% の方向で再生 |
| `alternate` | 奇数回: 正方向、偶数回: 逆方向（往復） |
| `alternate-reverse` | 奇数回: 逆方向、偶数回: 正方向 |

```css
@keyframes bounce {
  from { transform: translateY(0); }
  to   { transform: translateY(-30px); }
}

.ball {
  animation: bounce 0.5s ease-in-out infinite alternate;
  /* alternate で自然なバウンスを表現 */
}
```

**`animation-fill-mode`**

| 値 | 挙動 |
|---|---|
| `none` | アニメーション前後はCSSで定義したスタイルに戻る |
| `forwards` | アニメーション終了後、最後のキーフレームのスタイルを維持 |
| `backwards` | 遅延時間中も最初のキーフレームのスタイルを適用 |
| `both` | `forwards` + `backwards` 両方の効果 |

```css
/* フェードインして表示状態を維持する典型パターン */
.toast-notification {
  animation: fadeInUp 0.3s ease both;
  /* both: 遅延中は透明・浮いた状態を維持し、終了後も最終スタイルを維持 */
}
```

**`animation-play-state`**

`running`（再生中）または `paused`（一時停止）。JavaScriptから動的に切り替えることで、ユーザー操作によるアニメーション制御が可能。

```css
.animated-element { animation: spin 2s linear infinite; }
.animated-element:hover { animation-play-state: paused; }
```

---

## 3. CSS Custom Properties — アニメーション変数で管理する

CSS Custom Properties（CSS変数）はアニメーションの設計を劇的に改善する。値の一元管理、動的な変更、テーマシステムとの統合など、活用場面は多岐にわたる。

### 3-1. アニメーション設定の変数化

```css
:root {
  /* アニメーション変数の一元管理 */
  --duration-fast:   150ms;
  --duration-normal: 300ms;
  --duration-slow:   600ms;

  --ease-standard:   cubic-bezier(0.4, 0, 0.2, 1);  /* Material Design */
  --ease-decelerate: cubic-bezier(0, 0, 0.2, 1);
  --ease-accelerate: cubic-bezier(0.4, 0, 1, 1);
  --ease-sharp:      cubic-bezier(0.4, 0, 0.6, 1);

  --spring-bounce:   cubic-bezier(0.34, 1.56, 0.64, 1);
}

.button {
  transition:
    transform var(--duration-fast) var(--ease-standard),
    background-color var(--duration-normal) var(--ease-standard);
}
```

### 3-2. JavaScriptから変数を動的に操作する

CSS Custom Properties はJavaScriptから `setProperty` で変更できる。この特性を活かすと、DOM操作を最小限に抑えながら動的なアニメーションが実現できる。

```css
@keyframes fly {
  from {
    transform: translate(var(--from-x, 0), var(--from-y, 0));
    opacity: 0;
  }
  to {
    transform: translate(var(--to-x, 0), var(--to-y, 0));
    opacity: 1;
  }
}

.flying-element {
  animation: fly 0.5s var(--ease-decelerate) forwards;
}
```

```javascript
// クリック位置からアニメーションを開始する
document.querySelector('.btn').addEventListener('click', (e) => {
  const el = document.querySelector('.flying-element');
  const rect = el.getBoundingClientRect();
  const dx = e.clientX - (rect.left + rect.width / 2);
  const dy = e.clientY - (rect.top  + rect.height / 2);

  el.style.setProperty('--from-x', `${dx}px`);
  el.style.setProperty('--from-y', `${dy}px`);

  // アニメーションをリセットして再生
  el.classList.remove('animate');
  void el.offsetWidth; // reflow trigger
  el.classList.add('animate');
});
```

### 3-3. スタガーアニメーション（時差アニメーション）

```css
.list-item {
  animation: fadeInUp 0.4s var(--ease-decelerate) both;
  animation-delay: calc(var(--index) * 60ms);
}
```

```html
<!-- HTMLでインデックスを変数として渡す -->
<ul>
  <li class="list-item" style="--index: 0">Item 1</li>
  <li class="list-item" style="--index: 1">Item 2</li>
  <li class="list-item" style="--index: 2">Item 3</li>
  <li class="list-item" style="--index: 3">Item 4</li>
</ul>
```

各アイテムが 60ms ずつ遅れてフェードインするスタガー効果を、JavaScriptなしのCSSだけで実現できる。

---

## 4. Easing 関数 — アニメーションの「感触」を決める

Easing 関数はアニメーションの時間軸に対する進行速度を定義する。正しい Easing の選択がアニメーションの自然さを決定する。

### 4-1. キーワード Easing

| キーワード | cubic-bezier相当 | 用途 |
|---|---|---|
| `ease` | `cubic-bezier(0.25, 0.1, 0.25, 1)` | デフォルト。汎用的 |
| `linear` | `cubic-bezier(0, 0, 1, 1)` | 機械的な動き。ローテーションなど |
| `ease-in` | `cubic-bezier(0.42, 0, 1, 1)` | 遅く始まり速く終わる。退場アニメーション |
| `ease-out` | `cubic-bezier(0, 0, 0.58, 1)` | 速く始まり遅く終わる。入場アニメーション |
| `ease-in-out` | `cubic-bezier(0.42, 0, 0.58, 1)` | 両端が遅い。往復アニメーション |

### 4-2. cubic-bezier — カスタムイージング

```css
/* スプリングのような跳ね返り効果 */
.modal {
  transform: scale(0.8);
  opacity: 0;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
              opacity 0.3s ease-out;
}

.modal.open {
  transform: scale(1);
  opacity: 1;
}

/* Androidのような「快速に出て、そっと止まる」移動 */
.drawer {
  transition: transform 0.35s cubic-bezier(0, 0, 0.2, 1);
}
```

cubic-bezier のP1(x1,y1)とP2(x2,y2)の4値を調整する。y値を0〜1の範囲外にすると「オーバーシュート（行きすぎて戻る）」効果が生まれる。Chrome DevTools の Easing Editor で視覚的に調整できる。

### 4-3. steps() — フレームアニメーション

```css
/* スプライトシートを使ったキャラクターアニメーション */
.character {
  width: 64px;
  height: 64px;
  background-image: url('sprite.png');
  animation: walk 0.8s steps(8) infinite;
}

@keyframes walk {
  from { background-position: 0 0; }
  to   { background-position: -512px 0; } /* 8フレーム × 64px */
}

/* タイプライター効果 */
.typewriter {
  overflow: hidden;
  white-space: nowrap;
  width: 0;
  animation: typing 2s steps(20, end) forwards;
}

@keyframes typing {
  to { width: 20ch; }
}
```

`steps(n, start|end)` の第1引数がステップ数、第2引数が各ステップで変化するタイミング（開始時か終了時か）。

### 4-4. linear() — 任意のイージング曲線（CSS Level 4）

CSS Easing Level 4 で導入された `linear()` は、任意の点を通る折れ線グラフ的なイージングを定義できる。バウンスや弾性効果もCSSだけで表現可能になった。

```css
/* バウンスイージング */
.bouncy {
  transition: transform 0.8s linear(
    0, 0.009, 0.035 2.1%, 0.141, 0.281 6.7%, 0.723 12.9%,
    0.938 16.7%, 1.041, 1.098 21.3%, 1.123, 1.138 24.5%,
    1.138 24.9%, 1.128, 1.103 27.6%, 1.009 32.3%,
    0.994 33.7%, 0.988, 0.984, 0.981, 0.981 37.3%,
    0.984, 1.001 42.2%, 1.005, 1.007 44.4%, 1.007 45.2%,
    1.005 46.6%, 0.999 52%, 0.999 52.2%, 1
  );
}
```

---

## 5. transform — GPUアクセラレーションで高速アニメーション

`transform` はブラウザの合成レイヤー（composite layer）で処理されるため、`top/left` などのレイアウトプロパティを変更するよりはるかに高パフォーマンス。アニメーションには積極的に活用すること。

### 5-1. 2Dトランスフォームの関数

```css
.element {
  /* 移動 */
  transform: translate(50px, 20px);
  transform: translateX(50px);
  transform: translateY(20px);

  /* 回転 */
  transform: rotate(45deg);
  transform: rotate(0.5turn); /* 1turn = 360deg */

  /* 拡大縮小 */
  transform: scale(1.5);
  transform: scale(1.2, 0.8); /* x, y 個別指定 */
  transform: scaleX(1.2);

  /* 傾斜 */
  transform: skew(10deg, 5deg);
  transform: skewX(15deg);

  /* 複数の関数を連鎖 (右から左の順に適用) */
  transform: translateY(-50%) rotate(45deg) scale(0.8);
}
```

### 5-2. transform-origin — 変形の起点

```css
/* デフォルトは要素の中心 (50% 50%) */
.rotate-from-top {
  transform-origin: center top;
}

.rotate-from-corner {
  transform-origin: 0 0; /* 左上コーナー */
}

/* 吹き出しのような開閉アニメーション */
.tooltip {
  transform-origin: top center;
  transform: scaleY(0);
  transition: transform 0.2s ease;
}

.tooltip.visible {
  transform: scaleY(1);
}
```

### 5-3. 3D トランスフォームとパースペクティブ

```css
.scene {
  perspective: 800px; /* 視点からの距離。小さいほど強いパース */
  perspective-origin: 50% 50%;
}

.card {
  transform-style: preserve-3d; /* 子要素を3D空間内に配置 */
  transition: transform 0.6s ease;
}

.card:hover {
  transform: rotateY(180deg);
}

.card-front,
.card-back {
  backface-visibility: hidden; /* 裏面を非表示に */
}

.card-back {
  transform: rotateY(180deg);
}
```

```css
/* 3Dカードホバーエフェクト */
.tilt-card {
  transform: perspective(600px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
  transition: transform 0.1s ease;
}
```

```javascript
document.querySelector('.tilt-card').addEventListener('mousemove', (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const rx = ((e.clientY - cy) / (rect.height / 2)) * -10;
  const ry = ((e.clientX - cx) / (rect.width  / 2)) *  10;
  e.currentTarget.style.setProperty('--rx', `${rx}deg`);
  e.currentTarget.style.setProperty('--ry', `${ry}deg`);
});
```

---

## 6. アニメーション制御 — pause・reverse・fill-mode の実践

### 6-1. JavaScriptによる動的制御

```javascript
const el = document.querySelector('.animated');

// 一時停止
el.style.animationPlayState = 'paused';

// 再開
el.style.animationPlayState = 'running';

// アニメーションのリセットと再生
function restartAnimation(element) {
  element.classList.remove('animate');
  void element.offsetWidth; // DOM reflow を強制してクラス削除を確定させる
  element.classList.add('animate');
}

// アニメーション完了イベント
el.addEventListener('animationend', (e) => {
  console.log(`Animation "${e.animationName}" finished`);
  el.classList.remove('animate');
});

// イテレーション完了イベント（ループ時）
el.addEventListener('animationiteration', (e) => {
  console.log(`Iteration count: ${e.elapsedTime / e.target.style.animationDuration}`);
});
```

### 6-2. Intersection Observer との組み合わせ

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      observer.unobserve(entry.target); // 一度だけアニメーション
    }
  });
}, {
  threshold: 0.15, // 15%見えたらトリガー
  rootMargin: '0px 0px -50px 0px' // 下50pxのマージン
});

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
```

```css
.reveal {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.reveal.in-view {
  opacity: 1;
  transform: translateY(0);
}
```

---

## 7. Scroll-Driven Animations — スクロールと連動する新世代CSS

Chrome 115 / Firefox 110 でサポートされた Scroll-Driven Animations は、JavaScriptなしでスクロール位置にアニメーションを連動させる革命的な機能だ。

### 7-1. animation-timeline: scroll()

スクロールコンテナの進行度をアニメーションのタイムラインとして使用する。

```css
/* ページ読書進捗バー */
@keyframes grow-progress {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}

.progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  transform-origin: left center;

  animation: grow-progress linear;
  animation-timeline: scroll(root block);
  /* root: ルートのスクロールコンテナ */
  /* block: ブロック軸（縦スクロール）*/
}
```

`scroll()` 関数のシンタックス:
- 第1引数: `root`（ルート）| `nearest`（最近傍の祖先コンテナ）| `self`（要素自身）
- 第2引数: `block`（縦）| `inline`（横）| `x` | `y`

### 7-2. animation-timeline: view()

要素がビューポートに入ってから出るまでの進行度をタイムラインとして使用する。スクロール連動の登場・退場アニメーションが簡潔に書ける。

```css
@keyframes appear {
  entry 0%  { opacity: 0; transform: translateY(40px); }
  entry 100%{ opacity: 1; transform: translateY(0);    }
  exit 0%   { opacity: 1; transform: translateY(0);    }
  exit 100% { opacity: 0; transform: translateY(-40px);}
}

.scroll-reveal {
  animation: appear linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 30%; /* 登場する30%区間でアニメーション */
}
```

`animation-range` で対象区間を絞ることができる:
- `entry`: 要素がビューポートに入ってくる区間
- `exit`: 要素がビューポートから出ていく区間
- `contain`: 要素が完全にビューポート内に収まっている区間

### 7-3. scroll-driven を使ったパララックス

```css
.parallax-bg {
  position: sticky;
  top: 0;
  animation: parallax-move linear;
  animation-timeline: scroll(root);
}

@keyframes parallax-move {
  from { transform: translateY(0); }
  to   { transform: translateY(-30%); }
}
```

### 7-4. ブラウザサポートの確認

```css
/* フォールバック付きの実装 */
@supports (animation-timeline: scroll()) {
  .progress-bar {
    animation: grow-progress linear;
    animation-timeline: scroll(root block);
  }
}

/* @supports が使えない古いブラウザ向け */
.progress-bar {
  /* JavaScriptによるフォールバック実装 */
}
```

---

## 8. View Transitions API — ページ遷移アニメーション

2024年に主要ブラウザが対応した View Transitions API は、MPA（Multi-Page Application）とSPAの両方でスムーズなページ遷移を実現する。

### 8-1. 基本的な使い方（SPA）

```javascript
// ページ遷移時にView Transitionsを使用
async function navigateTo(url) {
  if (!document.startViewTransition) {
    // フォールバック: 通常のナビゲーション
    window.location.href = url;
    return;
  }

  const transition = document.startViewTransition(async () => {
    // この中でDOMを更新する
    const response = await fetch(url);
    const html = await response.text();
    const parser = new DOMParser();
    const newDoc = parser.parseFromString(html, 'text/html');
    document.querySelector('main').replaceWith(newDoc.querySelector('main'));
  });

  await transition.finished;
}
```

### 8-2. CSSでトランジションを制御

```css
/* デフォルトのクロスフェードをカスタマイズ */
::view-transition-old(root) {
  animation: 400ms ease both slide-out-left;
}

::view-transition-new(root) {
  animation: 400ms ease both slide-in-right;
}

@keyframes slide-out-left {
  to { transform: translateX(-100%); opacity: 0; }
}

@keyframes slide-in-right {
  from { transform: translateX(100%); opacity: 0; }
}
```

### 8-3. 要素ごとのView Transition

特定の要素に名前付きView Transitionを設定すると、異なるページ間でも要素が「移動する」ように見えるShared Element Transitionが実現できる。

```css
/* 一覧ページのカード */
.product-card[data-id="42"] {
  view-transition-name: product-42;
}

/* 詳細ページのヘッダー画像 */
.product-hero-image {
  view-transition-name: product-42;
}
```

```css
/* 要素固有のトランジション制御 */
::view-transition-group(product-42) {
  animation-duration: 0.5s;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 8-4. MPA（Next.js App Router / Astro）での対応

```html
<!-- Next.js App Router での使用例 -->
<!-- next.config.js で experimental.viewTransition を有効化 -->
```

```javascript
// Astroの場合、astro.config.mjs で設定
// viewTransitions: true を有効化すると
// <ViewTransitions /> コンポーネントで自動対応
```

---

## 9. will-change と GPU最適化 — 合成レイヤーの管理

### 9-1. will-change の正しい使い方

`will-change` はブラウザに「このプロパティが変化する」ことを事前通知し、合成レイヤーに昇格させる。乱用するとメモリを大量消費するため、適切な使い方が重要。

```css
/* 良い使い方: アニメーション直前にJSで付与、完了後に除去 */
.card {
  transition: transform 0.3s ease;
}

/* 悪い使い方: 全要素に常時適用 */
* { will-change: transform; } /* これは絶対NG */
```

```javascript
// アニメーション前後だけ will-change を適用する
card.addEventListener('mouseenter', () => {
  card.style.willChange = 'transform';
});

card.addEventListener('mouseleave', () => {
  // アニメーション完了後に解除
  card.addEventListener('transitionend', () => {
    card.style.willChange = 'auto';
  }, { once: true });
});
```

### 9-2. GPU合成可能なプロパティ

ブラウザのレンダリングパイプラインは「Layout → Paint → Composite」の3段階。アニメーションで変化させるプロパティによってどの段階がトリガーされるか変わる。

| プロパティ | Layout | Paint | Composite | 推奨度 |
|---|---|---|---|---|
| `transform` | | | 合成のみ | 最高 |
| `opacity` | | | 合成のみ | 最高 |
| `filter` | | | 合成のみ | 高 |
| `background-color` | | Paint | | 中 |
| `width` / `height` | Layout | Paint | | 低 |
| `top` / `left` | Layout | Paint | | 低 |
| `margin` / `padding` | Layout | Paint | | 低 |

**ルール: アニメーションには `transform` と `opacity` のみを使う** というのが基本原則。位置変更は `transform: translate()` で、表示非表示は `opacity` で行う。

### 9-3. レイヤー確認（Chrome DevTools）

Chrome DevToolsの「Layers」パネルで合成レイヤーの状態を確認できる:

1. DevTools → More tools → Layers
2. アニメーション要素をクリック → 黄色いボーダーが合成レイヤーを示す
3. 「Rendering」タブの「Layer borders」チェックボックスでオーバーレイ表示

```css
/* 明示的に合成レイヤーを作成する（ハック的手法） */
.force-layer {
  transform: translateZ(0); /* または translate3d(0, 0, 0) */
  will-change: transform;
}
```

---

## 10. prefers-reduced-motion — アクセシビリティ対応

前庭障害（三半規管の障害）を持つユーザーはアニメーションによって頭痛・吐き気を引き起こすことがある。OS設定「視差効果を減らす」を尊重するCSSメディアクエリが `prefers-reduced-motion` だ。

### 10-1. 基本パターン

```css
/* アニメーションのデフォルト定義 */
.hero-section {
  animation: heroFadeIn 0.8s ease forwards;
}

/* 動きを減らす設定のユーザー向け */
@media (prefers-reduced-motion: reduce) {
  .hero-section {
    animation: none;
    opacity: 1; /* フォールバックで即表示 */
  }
}
```

### 10-2. モーションファースト設計 vs リデュースドファースト設計

```css
/* モーションファースト（デフォルトでアニメーションあり）*/
.animated {
  animation: fadeIn 0.5s ease;
}
@media (prefers-reduced-motion: reduce) {
  .animated { animation: none; }
}

/* リデュースドファースト（デフォルトでアニメーションなし）*/
.animated {
  /* アニメーションなし */
}
@media (prefers-reduced-motion: no-preference) {
  .animated {
    animation: fadeIn 0.5s ease;
  }
}
```

後者の「リデュースドファースト」は、未知のデバイスでも安全にデフォルト表示できる利点がある。

### 10-3. Scroll-Driven Animations とのセット対応

```css
@media (prefers-reduced-motion: no-preference) {
  .scroll-reveal {
    animation: appear linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 30%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .scroll-reveal {
    /* アニメーションなしで即表示 */
    opacity: 1;
    transform: none;
  }
}
```

### 10-4. JavaScriptでの確認

```javascript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion) {
  // アニメーションを実行
  runComplexAnimation();
}

// 設定変更を監視
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
  if (e.matches) {
    pauseAllAnimations();
  }
});
```

---

## 11. SVGアニメーション — SMIL vs CSS

SVGのアニメーションには「SMIL」（SVG内の `<animate>` タグ）と「CSS」の2つのアプローチがある。

### 11-1. CSSによるSVGアニメーション（推奨）

```html
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle class="dot" cx="50" cy="50" r="10"/>
  <path class="checkmark" d="M 20 50 L 45 75 L 80 25"/>
</svg>
```

```css
/* SVG要素にCSSアニメーションを適用 */
.dot {
  animation: pulse 1.5s ease-in-out infinite;
  transform-origin: center;
  transform-box: fill-box; /* SVG内の transform-origin を要素ローカルにする */
}

@keyframes pulse {
  0%, 100% { r: 10; opacity: 1; }
  50%       { r: 15; opacity: 0.7; }
}

/* SVGパスのストロークアニメーション（描画エフェクト） */
.checkmark {
  stroke: #22c55e;
  stroke-width: 4;
  stroke-linecap: round;
  fill: none;
  stroke-dasharray: 120;    /* パスの全長 */
  stroke-dashoffset: 120;   /* 初期状態: 全て非表示 */
  animation: draw 0.6s ease-out 0.3s forwards;
}

@keyframes draw {
  to { stroke-dashoffset: 0; }
}
```

`transform-box: fill-box` は SVGアニメーションの必須設定。これがないと `transform-origin` がSVGの座標系で計算されてしまい、意図しない回転中心になる。

### 11-2. SVGモーフィングアニメーション

```css
@keyframes morph {
  0%   { d: path("M 0,0 L 100,0 L 100,100 L 0,100 Z"); }
  50%  { d: path("M 10,10 L 90,5  L 95,95  L 5,90  Z"); }
  100% { d: path("M 0,0 L 100,0 L 100,100 L 0,100 Z"); }
}

.morphing-shape {
  animation: morph 3s ease-in-out infinite;
}
```

ただし、モーフィングでは始点と終点のパスのポイント数が同じである必要がある。

---

## 12. CSS Houdini — ブラウザレンダリングに介入する

CSS Houdiniは、ブラウザのレンダリングエンジンにJavaScriptでカスタム処理を注入できる一連のAPIだ。現在利用可能なのは主に `@property` と Paint API。

### 12-1. @property — アニメーション可能なCSS変数

通常、CSS Custom Properties はアニメーション補間されない。`@property` で型を定義することで、変数そのものをアニメーションできる。

```css
/* グラデーションの角度をアニメーションする */
@property --gradient-angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}

@keyframes rotate-gradient {
  to { --gradient-angle: 360deg; }
}

.gradient-border {
  background: conic-gradient(
    from var(--gradient-angle),
    #3b82f6, #8b5cf6, #ec4899, #3b82f6
  );
  animation: rotate-gradient 3s linear infinite;
}
```

`@property` なしでは `--gradient-angle` は文字列として扱われ、アニメーション補間されない。`@property` で `<angle>` 型を定義することで、0degから360degへの補間が機能する。

```css
/* カラーアニメーション */
@property --accent-color {
  syntax: '<color>';
  inherits: true;
  initial-value: #3b82f6;
}

@keyframes color-cycle {
  0%   { --accent-color: #3b82f6; }
  33%  { --accent-color: #8b5cf6; }
  66%  { --accent-color: #ec4899; }
  100% { --accent-color: #3b82f6; }
}

:root {
  animation: color-cycle 5s ease infinite;
}

.themed-element {
  background: var(--accent-color);
  box-shadow: 0 4px 20px color-mix(in srgb, var(--accent-color) 40%, transparent);
}
```

### 12-2. Paint API — カスタムCSS描画

```javascript
// houdini-painter.js (Workletとして登録)
registerPaint('wavy-underline', class {
  static get inputProperties() {
    return ['--wave-color', '--wave-height'];
  }

  paint(ctx, size, props) {
    const color = props.get('--wave-color').toString().trim() || '#3b82f6';
    const waveHeight = parseInt(props.get('--wave-height')) || 4;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    const frequency = size.width / 10;
    for (let x = 0; x < size.width; x++) {
      const y = size.height / 2 + Math.sin((x / frequency) * Math.PI * 2) * waveHeight;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }

    ctx.stroke();
  }
});
```

```javascript
// メインスレッドで登録
CSS.paintWorklet.addModule('houdini-painter.js');
```

```css
.wavy-text {
  --wave-color: #3b82f6;
  --wave-height: 3;
  background: paint(wavy-underline);
  padding-bottom: 8px;
}
```

---

## 13. パフォーマンス計測 — DevTools Performance タブの読み方

アニメーションのパフォーマンス問題を特定するにはChrome DevToolsのPerformanceパネルが必須ツールだ。

### 13-1. 計測手順

1. Chrome DevTools を開く（F12 または Cmd+Option+I）
2. **Performance** タブを選択
3. 「Record」ボタンをクリック（または Ctrl+E）
4. アニメーションを実行
5. 「Stop」でレコーディングを停止

### 13-2. フレームレートの確認

**目標: 60fps（1フレームあたり 16.7ms 以内）**

```
Frames セクションで確認:
- 緑のバー: 60fps達成
- 黄色のバー: 警告（30〜60fps）
- 赤のバー: jank（カクつき）30fps未満
```

### 13-3. Long Tasks の特定

メインスレッドで 50ms を超えるタスクは「Long Task」として赤いマークが付く。アニメーション中に Long Task があると必ずjankが発生する。

```javascript
// Performance Observer で Long Tasks を検出
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach(entry => {
    if (entry.duration > 50) {
      console.warn(`Long Task: ${entry.duration}ms`, entry);
    }
  });
});
observer.observe({ entryTypes: ['longtask'] });
```

### 13-4. Layout Thrashing の回避

アニメーション中にDOMの読み取りと書き込みを交互に行うと、強制的にレイアウト計算が走る（Layout Thrashing）。

```javascript
// 悪い例: 読み取りと書き込みの交互実行
elements.forEach(el => {
  const width = el.offsetWidth;  // 読み取り → レイアウト計算
  el.style.width = width * 2 + 'px'; // 書き込み → レイアウト無効化
  const height = el.offsetHeight; // 読み取り → 再レイアウト計算 (thrashing!)
});

// 良い例: 読み取りをまとめてから書き込む
const widths = elements.map(el => el.offsetWidth);  // 読み取り一括
elements.forEach((el, i) => {
  el.style.width = widths[i] * 2 + 'px'; // 書き込み一括
});
```

### 13-5. requestAnimationFrame を活用する

```javascript
// JavaScriptアニメーションは必ず rAF で実装
function animate() {
  const start = performance.now();

  function tick(timestamp) {
    const elapsed = timestamp - start;
    const progress = Math.min(elapsed / 1000, 1); // 1秒でアニメーション完了

    const eased = easeOutQuart(progress);
    element.style.transform = `translateX(${eased * 300}px)`;

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}

function easeOutQuart(t) {
  return 1 - (--t) * t * t * t;
}
```

### 13-6. CSS Containment でレイアウト計算を局所化

```css
.animation-container {
  /* アニメーションの影響を要素内に閉じ込める */
  contain: layout style paint;
  /* または */
  contain: strict;
}

.isolated-animation {
  /* content-visibility で表示外要素のレンダリングをスキップ */
  content-visibility: auto;
  contain-intrinsic-size: 0 200px;
}
```

---

## 実装チェックリスト

CSSアニメーションを実装する際は以下を確認しよう:

```
パフォーマンス
□ transform と opacity のみでアニメーション (layout/paint プロパティを避ける)
□ will-change は必要な場合のみ・アニメーション中のみ適用
□ 合成レイヤーを無闇に増やしていない
□ Layout Thrashing が発生していない
□ rAF を使ったJSアニメーション

アクセシビリティ
□ prefers-reduced-motion: reduce 対応済み
□ アニメーション無効時も情報が正確に伝わる
□ ループアニメーションに停止手段がある（WCAG 2.2.2）

ブラウザサポート
□ Scroll-Driven Animations に @supports フォールバックあり
□ View Transitions API にフォールバックあり
□ @property のフォールバック定義あり

UX品質
□ 適切な duration (ホバー: 150-200ms, 入場: 300-500ms)
□ 適切な easing (入場: ease-out, 退場: ease-in)
□ アニメーションは目的に貢献しているか（装飾のみはNG）
□ スタガーアニメーションの遅延が蓄積しすぎていない
```

---

## まとめ

CSSアニメーションの全体像を整理すると:

- **`transition`**: 状態変化の補間。シンプルなホバー・フォーカスに
- **`@keyframes` + `animation`**: 複雑な動き、ループ、複数ステップに
- **CSS Custom Properties**: アニメーション設定の一元管理とスタガー制御
- **Easing 関数**: `cubic-bezier` で自然な動きを設計。`linear()` でバウンスも
- **transform 3D**: GPU合成レイヤーで高パフォーマンスな立体表現
- **Scroll-Driven Animations**: JavaScriptなしでスクロール連動アニメーション
- **View Transitions API**: ページ遷移にシネマティックな演出を
- **will-change**: 乱用禁止。アニメーション直前・直後だけ適用
- **prefers-reduced-motion**: アクセシビリティは必須。後付けしない
- **SVG + CSS**: `transform-box: fill-box` と `stroke-dasharray` で高品質SVGアニメーション
- **@property**: CSS変数をアニメーション補間可能にするHoudiniの恩恵
- **DevTools**: Performance タブで 60fps を計測・確認する習慣を

アニメーションは「動かすための技術」ではなく「ユーザーの認知を助けるための設計」だ。Purpose（目的）なき動きは混乱を生む。この記事で得た知識を活かして、快適で意味あるUIアニメーションを実装してほしい。

---

アニメーション開発では、`rem` → `px` 変換や `vh/vw` の実値計算が頻繁に必要になる。そういった単位変換の手間を省くなら **[DevToolBox](https://usedevtools.com/)** が便利だ。CSS単位変換・カラー変換・タイポグラフィスケール計算などフロントエンド開発で使いたいツールが一か所にまとまっており、毎日の開発ワークフローに組み込む価値がある。


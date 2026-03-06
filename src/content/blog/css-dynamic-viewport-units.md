---
title: "CSS動的ビューポート単位（dvh, svh, lvh）実践ガイド - モバイルUIの新標準"
description: "CSS動的ビューポート単位（dvh、svh、lvh）を使った実践的なモバイルUI設計を解説。従来のvhの問題点を解決し、スマートフォンのアドレスバーに対応したレイアウトを実現します。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。"
pubDate: "2025-02-05"
tags: ['CSS', 'フロントエンド']
---
# CSS動的ビューポート単位（dvh, svh, lvh）実践ガイド

モバイルブラウザのアドレスバーの表示/非表示によるレイアウトの崩れは、長年Webデベロッパーを悩ませてきました。従来の`vh`単位では、この問題に完全には対応できませんでした。

CSS動的ビューポート単位（Dynamic Viewport Units）は、この課題を解決するために導入された新しいビューポート単位です。この記事では、`dvh`、`svh`、`lvh`の使い方と実践的な活用方法を詳しく解説します。

## 従来のvhの問題点

### モバイルブラウザでの課題

従来の`100vh`を使用した全画面レイアウトは、モバイルブラウザで以下のような問題を引き起こしていました。

```css
/* 従来の方法 */
.fullscreen {
  height: 100vh; /* 問題あり */
}
```

**問題点：**

1. アドレスバーが表示されている時は正しく表示される
2. スクロールしてアドレスバーが隠れると、コンテンツが画面からはみ出す
3. または、コンテンツが縮小されて余白が生まれる
4. ユーザーエクスペリエンスが損なわれる

### JavaScriptによる回避策の限界

```javascript
// 従来の回避策
function setVh() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

window.addEventListener('resize', setVh);
setVh();
```

```css
.fullscreen {
  height: calc(var(--vh, 1vh) * 100);
}
```

この方法には以下の問題がありました：

- JavaScriptへの依存
- パフォーマンスオーバーヘッド
- リサイズイベントの処理が複雑
- SSR/SSGとの相性が悪い

## 動的ビューポート単位の種類

CSS動的ビューポート単位は3つの新しい単位を導入します。

### 1. dvh（Dynamic Viewport Height）

**動的ビューポート高さ** - ビューポートのサイズに応じて動的に変化します。

```css
.dynamic-fullscreen {
  height: 100dvh;
}
```

- アドレスバーの表示/非表示に応じて自動的に調整
- スムーズなトランジション
- ユーザーの操作に追従

### 2. svh（Small Viewport Height）

**小さいビューポート高さ** - アドレスバーが表示されている時の高さです。

```css
.small-viewport {
  height: 100svh;
}
```

- アドレスバーが表示されている状態を基準
- 最小の表示領域を保証
- 常にコンテンツが見える状態を維持

### 3. lvh（Large Viewport Height）

**大きいビューポート高さ** - アドレスバーが隠れている時の高さです。

```css
.large-viewport {
  height: 100lvh;
}
```

- アドレスバーが隠れている状態を基準
- 最大の表示領域を活用
- フルスクリーン体験の提供

### 幅の単位も同様に存在

- `dvw` - Dynamic Viewport Width
- `svw` - Small Viewport Width
- `lvw` - Large Viewport Width
- `dvi`、`svi`、`lvi` - インライン方向
- `dvb`、`svb`、`lvb` - ブロック方向
- `dvmin`、`svmin`、`lvmin` - 最小値
- `dvmax`、`svmax`、`lvmax` - 最大値

## 実践的な使用例

### 1. ヒーローセクション

モバイルで完璧な全画面ヒーローセクションを実現します。

```css
.hero {
  height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-align: center;
}

.hero__title {
  font-size: clamp(2rem, 5dvh, 4rem);
  margin-bottom: 2dvh;
}

.hero__subtitle {
  font-size: clamp(1rem, 2dvh, 1.5rem);
  margin-bottom: 4dvh;
}

.hero__cta {
  padding: 2dvh 4dvw;
  font-size: clamp(1rem, 2dvh, 1.25rem);
  background: white;
  color: #667eea;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s;
}

.hero__cta:hover {
  transform: scale(1.05);
}
```

### 2. モーダルダイアログ

画面サイズに応じて最適なサイズのモーダルを表示します。

```css
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100dvw;
  height: 100dvh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

.modal__content {
  background: white;
  border-radius: 16px;
  padding: 4dvh 4dvw;
  max-width: min(90dvw, 600px);
  max-height: 80dvh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal__header {
  font-size: clamp(1.5rem, 3dvh, 2rem);
  margin-bottom: 2dvh;
}

.modal__body {
  font-size: clamp(1rem, 2dvh, 1.125rem);
  line-height: 1.6;
  margin-bottom: 3dvh;
}

.modal__actions {
  display: flex;
  gap: 2dvw;
  justify-content: flex-end;
}

.modal__button {
  padding: 1.5dvh 3dvw;
  font-size: clamp(0.875rem, 1.8dvh, 1rem);
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s;
}

.modal__button:hover {
  opacity: 0.8;
}

.modal__button--primary {
  background: #667eea;
  color: white;
}

.modal__button--secondary {
  background: #e2e8f0;
  color: #334155;
}
```

### 3. スプリットスクリーンレイアウト

デスクトップとモバイルで異なる動作をする分割レイアウトです。

```css
.split-screen {
  display: grid;
  grid-template-columns: 1fr;
  min-height: 100dvh;
}

@media (min-width: 768px) {
  .split-screen {
    grid-template-columns: 1fr 1fr;
  }
}

.split-screen__left {
  background: #f8fafc;
  padding: 4dvh 4dvw;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.split-screen__right {
  background: #1e293b;
  color: white;
  padding: 4dvh 4dvw;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.split-screen__title {
  font-size: clamp(2rem, 5dvh, 3rem);
  margin-bottom: 2dvh;
}

.split-screen__content {
  font-size: clamp(1rem, 2dvh, 1.25rem);
  line-height: 1.6;
  max-width: 60ch;
}
```

### 4. スティッキーヘッダー

動的ビューポートを考慮したスティッキーヘッダーです。

```css
.header {
  position: sticky;
  top: 0;
  height: 8dvh;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  padding: 0 4dvw;
  z-index: 100;
}

.header__logo {
  font-size: clamp(1.25rem, 2.5dvh, 1.5rem);
  font-weight: bold;
}

.header__nav {
  margin-left: auto;
  display: flex;
  gap: 3dvw;
}

.header__link {
  font-size: clamp(0.875rem, 1.8dvh, 1rem);
  color: #334155;
  text-decoration: none;
  transition: color 0.2s;
}

.header__link:hover {
  color: #667eea;
}

.main-content {
  min-height: calc(100dvh - 8dvh);
  padding: 4dvh 4dvw;
}
```

### 5. カードグリッド

レスポンシブなカードレイアウトです。

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
  gap: 3dvh 3dvw;
  padding: 4dvh 4dvw;
  min-height: 100dvh;
}

.card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.card:hover {
  transform: translateY(-4px);
}

.card__image {
  width: 100%;
  height: 25dvh;
  object-fit: cover;
}

.card__content {
  padding: 2dvh 3dvw;
}

.card__title {
  font-size: clamp(1.25rem, 2.5dvh, 1.5rem);
  margin-bottom: 1dvh;
}

.card__description {
  font-size: clamp(0.875rem, 1.8dvh, 1rem);
  color: #64748b;
  line-height: 1.5;
}
```

### 6. フルスクリーンビデオ背景

動画背景を持つヒーローセクションです。

```css
.video-hero {
  position: relative;
  height: 100dvh;
  overflow: hidden;
}

.video-hero__video {
  position: absolute;
  top: 50%;
  left: 50%;
  min-width: 100%;
  min-height: 100%;
  width: auto;
  height: auto;
  transform: translate(-50%, -50%);
  object-fit: cover;
}

.video-hero__overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  text-align: center;
  padding: 4dvh 4dvw;
}

.video-hero__title {
  font-size: clamp(2.5rem, 6dvh, 4rem);
  font-weight: bold;
  margin-bottom: 2dvh;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.video-hero__subtitle {
  font-size: clamp(1.125rem, 2.5dvh, 1.5rem);
  margin-bottom: 4dvh;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}
```

### 7. オンボーディングスライダー

スワイプ可能なオンボーディング画面です。

```css
.onboarding {
  height: 100dvh;
  overflow: hidden;
  display: flex;
  scroll-snap-type: x mandatory;
  overflow-x: auto;
}

.onboarding__slide {
  flex-shrink: 0;
  width: 100dvw;
  height: 100dvh;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 8dvh 4dvw;
  text-align: center;
}

.onboarding__slide:nth-child(1) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.onboarding__slide:nth-child(2) {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.onboarding__slide:nth-child(3) {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.onboarding__illustration {
  width: min(80dvw, 400px);
  height: 40dvh;
  margin-bottom: 4dvh;
}

.onboarding__title {
  font-size: clamp(1.75rem, 4dvh, 2.5rem);
  color: white;
  margin-bottom: 2dvh;
}

.onboarding__description {
  font-size: clamp(1rem, 2dvh, 1.25rem);
  color: rgba(255, 255, 255, 0.9);
  max-width: 60ch;
  line-height: 1.6;
  margin-bottom: 4dvh;
}

.onboarding__indicators {
  display: flex;
  gap: 2dvw;
  margin-bottom: 4dvh;
}

.onboarding__indicator {
  width: 2dvw;
  height: 2dvw;
  min-width: 8px;
  min-height: 8px;
  max-width: 12px;
  max-height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transition: background 0.3s;
}

.onboarding__indicator--active {
  background: white;
}
```

## ブラウザサポートと互換性

### サポート状況

- Chrome 108+
- Safari 15.4+
- Firefox 101+
- Edge 108+

### フォールバック戦略

古いブラウザへのフォールバックを提供します。

```css
.fullscreen {
  /* フォールバック */
  height: 100vh;

  /* 動的ビューポート対応ブラウザ */
  height: 100dvh;
}
```

### CSS @supportsの活用

```css
.hero {
  height: 100vh;
}

@supports (height: 100dvh) {
  .hero {
    height: 100dvh;
  }
}
```

### JavaScriptによる検出

```javascript
function supportsDynamicViewport() {
  return CSS.supports('height', '100dvh');
}

if (supportsDynamicViewport()) {
  document.documentElement.classList.add('dvh-supported');
}
```

```css
.fullscreen {
  height: 100vh;
}

.dvh-supported .fullscreen {
  height: 100dvh;
}
```

## パフォーマンス考慮事項

### レンダリングパフォーマンス

動的ビューポート単位は、アドレスバーの表示/非表示時に再計算されます。

```css
/* パフォーマンスに配慮 */
.smooth-resize {
  height: 100dvh;
  transition: height 0.3s ease-out;
  will-change: height;
}
```

### レイアウトシフトの防止

```css
.stable-layout {
  /* 最小サイズを保証 */
  min-height: 100svh;

  /* 動的に拡張 */
  height: 100dvh;
}
```

## まとめ

CSS動的ビューポート単位は、モバイルWebのレイアウト問題を根本的に解決する強力な機能です。

**主な利点：**

- JavaScriptへの依存を排除
- より正確なビューポートサイズの取得
- スムーズなユーザーエクスペリエンス
- シンプルで保守性の高いコード

**使い分けのガイドライン：**

- `dvh` - 動的に変化するレイアウト（推奨）
- `svh` - 常にコンテンツを表示したい場合
- `lvh` - 最大限の画面領域を使いたい場合

モダンなWebアプリケーション開発において、動的ビューポート単位の活用は必須のスキルとなっています。

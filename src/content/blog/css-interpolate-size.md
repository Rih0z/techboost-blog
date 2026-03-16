---
title: "CSS interpolate-sizeでアニメーション可能な高さ - auto値のスムーズな遷移を実現"
description: "CSS interpolate-sizeプロパティを使って、height: autoやwidth: autoをアニメーション可能にする方法を解説。これまで困難だったコンテンツサイズの自動調整とスムーズな遷移を両立できます。"
pubDate: "2025-02-05"
tags: ['CSS', 'フロントエンド']
heroImage: '../../assets/thumbnails/css-interpolate-size.jpg'
---

Web開発において、`height: auto`や`width: auto`をアニメーションさせることは長年の課題でした。CSSの新しいプロパティ`interpolate-size`は、この問題を解決し、コンテンツサイズに応じた自動調整とスムーズなアニメーションを両立させます。

## 従来の課題

### height: autoがアニメーションできない問題

```css
/* これは動作しない */
.accordion-content {
  height: 0;
  overflow: hidden;
  transition: height 0.3s ease;
}

.accordion-content.open {
  height: auto; /* autoへの遷移はアニメーションされない */
}
```

### これまでの回避策とその問題点

#### 1. max-heightトリック

```css
/* 回避策1: max-heightを使う */
.accordion-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.accordion-content.open {
  max-height: 1000px; /* 十分大きな値を設定 */
}
```

**問題点:**
- コンテンツの実際の高さがわからない
- max-heightを大きくしすぎるとアニメーションが不自然
- コンテンツが予想より大きい場合に切れる

#### 2. JavaScriptで高さを計算

```javascript
// 回避策2: JavaScriptで実際の高さを取得
const content = document.querySelector('.accordion-content');
const height = content.scrollHeight;
content.style.height = `${height}px`;
```

**問題点:**
- JavaScriptが必須
- リサイズ時の再計算が必要
- パフォーマンスへの影響
- コンテンツが動的に変化する場合の対応が複雑

#### 3. transform: scaleY()

```css
/* 回避策3: scaleYを使う */
.accordion-content {
  transform: scaleY(0);
  transform-origin: top;
  transition: transform 0.3s ease;
}

.accordion-content.open {
  transform: scaleY(1);
}
```

**問題点:**
- 内部のテキストも縦方向に圧縮される
- 見た目が不自然
- レイアウトへの影響

## interpolate-sizeの登場

CSS Working Groupによって提案された`interpolate-size`プロパティは、この問題を根本的に解決します。

### 基本構文

```css
.element {
  interpolate-size: allow-keywords;
}
```

### ブラウザサポート

```css
/* ブラウザサポートチェック */
@supports (interpolate-size: allow-keywords) {
  /* interpolate-sizeをサポートするブラウザ向けのスタイル */
}
```

現在のサポート状況（2025年2月時点）:
- Chrome/Edge 123+
- Safari 18+（実験的機能）
- Firefox: 開発中

## 基本的な使い方

### アコーディオンの実装

```html
<div class="accordion">
  <button class="accordion-trigger">クリックして展開</button>
  <div class="accordion-content">
    <p>これはアコーディオンのコンテンツです。</p>
    <p>任意の長さのコンテンツを含むことができます。</p>
  </div>
</div>
```

```css
/* interpolate-sizeを有効化 */
.accordion-content {
  interpolate-size: allow-keywords;

  height: 0;
  overflow: hidden;
  transition: height 0.3s ease;
}

/* 開いた状態 */
.accordion-content.open {
  height: auto; /* これでアニメーションが動作する！ */
}
```

```javascript
// JavaScriptでトグル
document.querySelector('.accordion-trigger').addEventListener('click', () => {
  document.querySelector('.accordion-content').classList.toggle('open');
});
```

### 横方向のアニメーション

```css
.sidebar {
  interpolate-size: allow-keywords;

  width: 0;
  overflow: hidden;
  transition: width 0.4s ease-in-out;
}

.sidebar.expanded {
  width: auto; /* コンテンツ幅に応じて自動調整 */
}
```

## 実践的な例

### カード展開UI

```html
<div class="card">
  <div class="card-header">
    <h3>製品情報</h3>
    <button class="expand-btn">詳細を見る</button>
  </div>
  <div class="card-details">
    <p>製品の詳細説明がここに入ります。</p>
    <ul>
      <li>特徴1</li>
      <li>特徴2</li>
      <li>特徴3</li>
    </ul>
  </div>
</div>
```

```css
.card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
}

.card-details {
  interpolate-size: allow-keywords;

  height: 0;
  overflow: hidden;
  opacity: 0;
  transition:
    height 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.3s ease;
}

.card.expanded .card-details {
  height: auto;
  opacity: 1;
}

/* スムーズなイージング関数 */
.card-details {
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### ドロップダウンメニュー

```html
<nav class="dropdown">
  <button class="dropdown-trigger">メニュー</button>
  <ul class="dropdown-menu">
    <li><a href="/home">ホーム</a></li>
    <li><a href="/about">会社概要</a></li>
    <li><a href="/services">サービス</a></li>
    <li><a href="/contact">お問い合わせ</a></li>
  </ul>
</nav>
```

```css
.dropdown {
  position: relative;
}

.dropdown-menu {
  interpolate-size: allow-keywords;

  position: absolute;
  top: 100%;
  left: 0;

  height: 0;
  overflow: hidden;

  background: white;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  transition:
    height 0.25s ease-out,
    box-shadow 0.25s ease-out;

  list-style: none;
  padding: 0;
  margin: 0;
}

.dropdown:hover .dropdown-menu,
.dropdown:focus-within .dropdown-menu {
  height: auto;
}

.dropdown-menu li {
  padding: 0.75rem 1rem;
}

.dropdown-menu a {
  color: inherit;
  text-decoration: none;
  display: block;
}

.dropdown-menu a:hover {
  background: #f5f5f5;
}
```

### モーダルのコンテンツエリア

```html
<div class="modal">
  <div class="modal-header">
    <h2>タイトル</h2>
    <button class="modal-close">&times;</button>
  </div>
  <div class="modal-body">
    <p>動的な長さのコンテンツ</p>
  </div>
  <div class="modal-footer">
    <button>キャンセル</button>
    <button>OK</button>
  </div>
</div>
```

```css
.modal-body {
  interpolate-size: allow-keywords;

  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.modal.open .modal-body {
  max-height: 80vh; /* ビューポート高さに応じて調整 */
}

/* スクロール可能に */
.modal-body {
  overflow-y: auto;
}
```

## アニメーションのカスタマイズ

### イージング関数

```css
/* 標準的なイージング */
.smooth-open {
  interpolate-size: allow-keywords;
  transition: height 0.3s ease-in-out;
}

/* カスタムベジェ曲線 */
.bouncy {
  interpolate-size: allow-keywords;
  transition: height 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

/* 段階的なアニメーション */
.stepped {
  interpolate-size: allow-keywords;
  transition: height 0.4s steps(5);
}
```

### 遅延とディレイ

```css
.staggered-items > * {
  interpolate-size: allow-keywords;
  transition: height 0.3s ease;
}

.staggered-items > *:nth-child(1) { transition-delay: 0s; }
.staggered-items > *:nth-child(2) { transition-delay: 0.1s; }
.staggered-items > *:nth-child(3) { transition-delay: 0.2s; }
.staggered-items > *:nth-child(4) { transition-delay: 0.3s; }
```

### 複合プロパティのアニメーション

```css
.complex-animation {
  interpolate-size: allow-keywords;

  height: 0;
  opacity: 0;
  transform: translateY(-20px);

  transition:
    height 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.3s ease,
    transform 0.3s ease;
}

.complex-animation.visible {
  height: auto;
  opacity: 1;
  transform: translateY(0);
}
```

## プログレッシブエンハンスメント

### フォールバック戦略

```css
/* 基本スタイル（全ブラウザ） */
.expandable {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.expandable.open {
  max-height: 500px; /* フォールバック */
}

/* interpolate-sizeサポート時の最適化 */
@supports (interpolate-size: allow-keywords) {
  .expandable {
    interpolate-size: allow-keywords;
    height: 0;
    max-height: none; /* max-heightの制限を解除 */
    transition: height 0.3s ease;
  }

  .expandable.open {
    height: auto;
  }
}
```

### JavaScriptによる機能検出

```javascript
// interpolate-sizeのサポートを確認
function supportsInterpolateSize() {
  return CSS.supports('interpolate-size', 'allow-keywords');
}

// サポート状況に応じて処理を分岐
if (supportsInterpolateSize()) {
  // interpolate-sizeを使用
  element.style.interpolateSize = 'allow-keywords';
  element.style.height = 'auto';
} else {
  // フォールバック: JavaScriptで高さを計算
  const height = element.scrollHeight;
  element.style.height = `${height}px`;
}
```

## パフォーマンス最適化

### will-changeの活用

```css
.accordion-content {
  interpolate-size: allow-keywords;
  will-change: height;
  transition: height 0.3s ease;
}

/* アニメーション完了後にwill-changeを解除 */
.accordion-content.animating {
  will-change: height;
}
```

```javascript
element.addEventListener('transitionend', () => {
  element.classList.remove('animating');
});
```

### contain プロパティ

```css
.expandable {
  interpolate-size: allow-keywords;
  contain: layout style; /* レイアウト計算を最適化 */
  transition: height 0.3s ease;
}
```

### content-visibilityとの組み合わせ

```css
.lazy-expand {
  interpolate-size: allow-keywords;
  content-visibility: auto; /* オフスクリーン時のレンダリングをスキップ */
  contain-intrinsic-size: 0 500px; /* 概算サイズを指定 */
  transition: height 0.3s ease;
}
```

## アクセシビリティ

### ARIAラベルの適切な使用

```html
<button
  class="accordion-trigger"
  aria-expanded="false"
  aria-controls="accordion-content-1">
  セクション1
</button>

<div
  id="accordion-content-1"
  class="accordion-content"
  role="region"
  aria-labelledby="accordion-trigger">
  <!-- コンテンツ -->
</div>
```

```javascript
trigger.addEventListener('click', () => {
  const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
  trigger.setAttribute('aria-expanded', !isExpanded);
  content.classList.toggle('open');
});
```

### prefers-reduced-motionへの対応

```css
.expandable {
  interpolate-size: allow-keywords;
  transition: height 0.3s ease;
}

/* アニメーションを減らす設定のユーザー向け */
@media (prefers-reduced-motion: reduce) {
  .expandable {
    transition-duration: 0.01ms;
  }
}
```

### キーボードナビゲーション

```css
/* フォーカス時の視覚的フィードバック */
.accordion-trigger:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

/* フォーカス時にコンテンツも表示 */
.accordion-trigger:focus-within + .accordion-content {
  height: auto;
}
```

## 実装パターン集

### ネストされたアコーディオン

```html
<div class="accordion-group">
  <div class="accordion-item">
    <button class="accordion-trigger">親項目1</button>
    <div class="accordion-content">
      <div class="accordion-item nested">
        <button class="accordion-trigger">子項目1-1</button>
        <div class="accordion-content">
          コンテンツ
        </div>
      </div>
    </div>
  </div>
</div>
```

```css
.accordion-content {
  interpolate-size: allow-keywords;
  height: 0;
  overflow: hidden;
  transition: height 0.3s ease;
}

.accordion-content.open {
  height: auto;
}

/* ネストレベルに応じて遅延 */
.nested .accordion-content {
  transition-delay: 0.1s;
}
```

### タブパネル

```html
<div class="tabs">
  <div role="tablist">
    <button role="tab" aria-selected="true">タブ1</button>
    <button role="tab">タブ2</button>
    <button role="tab">タブ3</button>
  </div>
  <div role="tabpanel" class="tab-panel active">
    タブ1のコンテンツ
  </div>
  <div role="tabpanel" class="tab-panel">
    タブ2のコンテンツ
  </div>
  <div role="tabpanel" class="tab-panel">
    タブ3のコンテンツ
  </div>
</div>
```

```css
.tab-panel {
  interpolate-size: allow-keywords;
  height: 0;
  opacity: 0;
  overflow: hidden;
  transition:
    height 0.3s ease,
    opacity 0.3s ease;
}

.tab-panel.active {
  height: auto;
  opacity: 1;
}
```

### カルーセル

```css
.carousel-item {
  interpolate-size: allow-keywords;
  width: 0;
  overflow: hidden;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.carousel-item.active {
  width: auto;
}
```

---

## 関連記事

- [プログラミングスクール比較2026年版｜現役エンジニアが選ぶ厳選8校](/blog/2026-03-08-programming-school-comparison-2026)
- [エンジニア転職完全ガイド2026](/blog/2026-03-09-engineer-career-change-guide-2026)

## まとめ

`interpolate-size`は、長年の課題だった`auto`値のアニメーションを可能にする革新的な機能です。

### 主な利点

- **シンプルな実装**: JavaScriptなしでautoのアニメーションが可能
- **パフォーマンス**: ブラウザネイティブの最適化
- **保守性**: コンテンツサイズの変更に自動対応
- **柔軟性**: 高さ・幅の両方に適用可能

### 今後の展望

現在は一部のブラウザでのみサポートされていますが、今後の普及が期待されます。プログレッシブエンハンスメントを活用し、サポートするブラウザでは最適な体験を、それ以外ではフォールバックを提供する実装を心がけましょう。

次のプロジェクトで`interpolate-size`を試して、より洗練されたUIアニメーションを実現してください。

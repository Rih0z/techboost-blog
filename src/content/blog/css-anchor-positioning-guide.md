---
title: 'CSS Anchor Positioning実践: JavaScriptなしのツールチップ・ポップオーバー'
description: 'CSS Anchor Positioning APIの実践的な活用方法、複雑なUIパターン、アクセシビリティ対応、レスポンシブデザイン、アニメーション実装を詳しく解説します。CSS・Anchor Positioning・UIに関する実践情報。'
pubDate: '2025-10-07'
updatedDate: '2025-10-07'
tags: ['CSS', 'Anchor Positioning', 'UI', 'アクセシビリティ', 'アニメーション', 'プログラミング']
heroImage: '../../assets/thumbnails/css-anchor-positioning-guide.jpg'
---

CSS Anchor Positioningは、JavaScriptライブラリなしでツールチップやポップオーバーを実装できる革新的なCSS機能です。

本記事では、実践的なUIパターン、アクセシビリティ対応、レスポンシブデザイン、アニメーション実装など、プロダクション環境で使える実装方法を解説します。

## 実践的なUIパターン

### 高度なツールチップ

```html
<!-- 複数のツールチップを持つUI -->
<div class="toolbar">
  <button class="toolbar-btn" id="btn-save">
    <span class="icon">💾</span>
    <span class="tooltip" data-tooltip-for="btn-save">
      保存 (Ctrl+S)
    </span>
  </button>

  <button class="toolbar-btn" id="btn-undo">
    <span class="icon">↶</span>
    <span class="tooltip" data-tooltip-for="btn-undo">
      元に戻す (Ctrl+Z)
    </span>
  </button>

  <button class="toolbar-btn" id="btn-redo">
    <span class="icon">↷</span>
    <span class="tooltip" data-tooltip-for="btn-redo">
      やり直す (Ctrl+Y)
    </span>
  </button>
</div>
```

```css
/* ツールチップの基本スタイル */
.toolbar-btn {
  position: relative;
  padding: 12px;
  border: none;
  background: #f0f0f0;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;

  /* アンカーポイントを設定 */
  anchor-name: --toolbar-button;
}

.toolbar-btn:hover {
  background: #e0e0e0;
}

.tooltip {
  position: absolute;
  position-anchor: --toolbar-button;

  /* ボタンの上に配置 */
  position-area: top;
  margin-bottom: 8px;

  /* スタイル */
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  font-size: 13px;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;

  /* 初期状態は非表示 */
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 0.2s, transform 0.2s;
}

/* ホバー時に表示 */
.toolbar-btn:hover .tooltip,
.toolbar-btn:focus-visible .tooltip {
  opacity: 1;
  transform: translateY(0);
}

/* 矢印 */
.tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: rgba(0, 0, 0, 0.9);
}

/* フォールバック配置 */
.tooltip {
  position-try-fallbacks:
    --tooltip-bottom,
    --tooltip-left,
    --tooltip-right;
}

@position-try --tooltip-bottom {
  position-area: bottom;
  margin-top: 8px;
  margin-bottom: 0;
}

@position-try --tooltip-bottom::after {
  top: auto;
  bottom: 100%;
  border-top-color: transparent;
  border-bottom-color: rgba(0, 0, 0, 0.9);
}

@position-try --tooltip-left {
  position-area: left;
  margin-right: 8px;
  margin-bottom: 0;
}

@position-try --tooltip-right {
  position-area: right;
  margin-left: 8px;
  margin-bottom: 0;
}
```

### メガメニュー

```html
<nav class="nav">
  <button class="nav-item" id="nav-products" popovertarget="menu-products">
    製品
  </button>

  <div popover id="menu-products" class="mega-menu">
    <div class="mega-menu-grid">
      <section class="menu-section">
        <h3>カテゴリー</h3>
        <ul>
          <li><a href="#">ソフトウェア</a></li>
          <li><a href="#">ハードウェア</a></li>
          <li><a href="#">サービス</a></li>
        </ul>
      </section>

      <section class="menu-section">
        <h3>人気商品</h3>
        <ul>
          <li><a href="#">商品A</a></li>
          <li><a href="#">商品B</a></li>
          <li><a href="#">商品C</a></li>
        </ul>
      </section>

      <section class="menu-section menu-featured">
        <h3>注目</h3>
        <div class="featured-product">
          <img src="/product.jpg" alt="新製品">
          <p>新製品が登場！</p>
        </div>
      </section>
    </div>
  </div>
</nav>
```

```css
.nav-item {
  anchor-name: --nav-trigger;
  padding: 12px 24px;
  border: none;
  background: transparent;
  font-size: 16px;
  cursor: pointer;
}

.mega-menu {
  position-anchor: --nav-trigger;
  position-area: bottom left;
  margin-top: 8px;

  /* メニューをトリガーの幅に合わせる */
  min-width: max(400px, anchor-size(width));
  max-width: 800px;

  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  padding: 24px;

  /* アニメーション */
  opacity: 0;
  transform: translateY(-8px);
  transition:
    opacity 0.2s,
    transform 0.2s,
    overlay 0.2s allow-discrete,
    display 0.2s allow-discrete;
}

.mega-menu:popover-open {
  opacity: 1;
  transform: translateY(0);
}

@starting-style {
  .mega-menu:popover-open {
    opacity: 0;
    transform: translateY(-8px);
  }
}

.mega-menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 32px;
}

.menu-section h3 {
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
}

.menu-section ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.menu-section li {
  margin: 8px 0;
}

.menu-section a {
  color: #333;
  text-decoration: none;
  transition: color 0.2s;
}

.menu-section a:hover {
  color: #007bff;
}

.menu-featured {
  grid-column: span 1;
}

.featured-product {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 6px;
}

.featured-product img {
  width: 100%;
  height: auto;
  border-radius: 4px;
  margin-bottom: 8px;
}
```

### カスタムセレクト

```html
<div class="custom-select">
  <button class="select-trigger" id="select-trigger" popovertarget="select-options">
    <span class="selected-value">オプションを選択</span>
    <span class="select-arrow">▼</span>
  </button>

  <div popover id="select-options" class="select-dropdown">
    <div class="select-option" data-value="option1">
      オプション 1
    </div>
    <div class="select-option" data-value="option2">
      オプション 2
    </div>
    <div class="select-option" data-value="option3">
      オプション 3
    </div>
    <div class="select-option" data-value="option4">
      オプション 4
    </div>
  </div>
</div>
```

```css
.select-trigger {
  anchor-name: --select-anchor;
  width: 250px;
  padding: 12px 16px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: border-color 0.2s;
}

.select-trigger:hover {
  border-color: #999;
}

.select-trigger:focus-visible {
  outline: 2px solid #007bff;
  outline-offset: 2px;
}

.select-arrow {
  transition: transform 0.2s;
}

.select-trigger[aria-expanded="true"] .select-arrow {
  transform: rotate(180deg);
}

.select-dropdown {
  position-anchor: --select-anchor;
  position-area: bottom;
  margin-top: 4px;

  /* トリガーと同じ幅 */
  width: anchor-size(width);

  background: white;
  border: 1px solid #ccc;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 300px;
  overflow-y: auto;

  /* アニメーション */
  opacity: 0;
  transform: scaleY(0.95);
  transform-origin: top;
  transition:
    opacity 0.15s,
    transform 0.15s,
    overlay 0.15s allow-discrete,
    display 0.15s allow-discrete;
}

.select-dropdown:popover-open {
  opacity: 1;
  transform: scaleY(1);
}

@starting-style {
  .select-dropdown:popover-open {
    opacity: 0;
    transform: scaleY(0.95);
  }
}

.select-option {
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.15s;
}

.select-option:hover {
  background: #f0f0f0;
}

.select-option:active {
  background: #e0e0e0;
}

.select-option.selected {
  background: #e7f3ff;
  color: #007bff;
  font-weight: 500;
}

/* フォールバック: 下に表示できない場合は上に */
.select-dropdown {
  position-try-fallbacks: --select-top;
}

@position-try --select-top {
  position-area: top;
  margin-bottom: 4px;
  margin-top: 0;
  transform-origin: bottom;
}
```

JavaScript（最小限）:

```javascript
// オプション選択の処理
const trigger = document.getElementById('select-trigger')
const options = document.querySelectorAll('.select-option')

options.forEach((option) => {
  option.addEventListener('click', () => {
    const value = option.dataset.value
    const selectedValue = trigger.querySelector('.selected-value')
    selectedValue.textContent = option.textContent

    // 選択状態を更新
    options.forEach((opt) => opt.classList.remove('selected'))
    option.classList.add('selected')

    // ドロップダウンを閉じる
    document.getElementById('select-options').hidePopover()
  })
})
```

## レスポンシブ対応

### ブレークポイントごとの配置

```css
.responsive-tooltip {
  position-anchor: --trigger;

  /* デスクトップ: 上に表示 */
  position-area: top;
  margin-bottom: 8px;
}

@media (max-width: 768px) {
  .responsive-tooltip {
    /* タブレット: 右に表示 */
    position-area: right;
    margin-left: 8px;
    margin-bottom: 0;
  }
}

@media (max-width: 480px) {
  .responsive-tooltip {
    /* モバイル: 下に固定表示 */
    position: fixed;
    position-anchor: none;
    bottom: 0;
    left: 0;
    right: 0;
    margin: 0;
    border-radius: 0;
  }
}
```

### ビューポートサイズに応じた調整

```css
.adaptive-menu {
  position-anchor: --menu-trigger;
  position-area: bottom;

  /* ビューポート幅の80%まで */
  max-width: min(500px, 80vw);

  /* ビューポート高さの60%まで */
  max-height: min(400px, 60vh);
  overflow-y: auto;
}

/* 画面が小さい場合は全幅 */
@container (max-width: 500px) {
  .adaptive-menu {
    width: 100vw;
    max-width: 100vw;
  }
}
```

## アクセシビリティ対応

### キーボードナビゲーション

```html
<div class="accessible-menu">
  <button
    class="menu-trigger"
    id="menu-trigger"
    aria-haspopup="true"
    aria-expanded="false"
    aria-controls="menu-content"
    popovertarget="menu-content"
  >
    メニュー
  </button>

  <div
    popover
    id="menu-content"
    role="menu"
    aria-labelledby="menu-trigger"
    class="menu-content"
  >
    <a href="#" role="menuitem">項目 1</a>
    <a href="#" role="menuitem">項目 2</a>
    <a href="#" role="menuitem">項目 3</a>
  </div>
</div>
```

```javascript
// キーボードナビゲーション
const trigger = document.getElementById('menu-trigger')
const menu = document.getElementById('menu-content')
const menuItems = menu.querySelectorAll('[role="menuitem"]')

let currentIndex = -1

trigger.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    menu.showPopover()
    trigger.setAttribute('aria-expanded', 'true')
    // 最初の項目にフォーカス
    menuItems[0]?.focus()
    currentIndex = 0
  }
})

menu.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    menu.hidePopover()
    trigger.setAttribute('aria-expanded', 'false')
    trigger.focus()
    return
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    currentIndex = (currentIndex + 1) % menuItems.length
    menuItems[currentIndex].focus()
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault()
    currentIndex = currentIndex <= 0 ? menuItems.length - 1 : currentIndex - 1
    menuItems[currentIndex].focus()
  }

  if (e.key === 'Home') {
    e.preventDefault()
    currentIndex = 0
    menuItems[0].focus()
  }

  if (e.key === 'End') {
    e.preventDefault()
    currentIndex = menuItems.length - 1
    menuItems[currentIndex].focus()
  }
})

// メニューが閉じたときの処理
menu.addEventListener('toggle', (e) => {
  if (!e.newState === 'open') {
    trigger.setAttribute('aria-expanded', 'false')
    currentIndex = -1
  }
})
```

### スクリーンリーダー対応

```html
<button
  class="tooltip-trigger"
  aria-describedby="tooltip-content"
>
  ヘルプ
  <span
    id="tooltip-content"
    role="tooltip"
    class="tooltip"
  >
    この機能についての詳細情報
  </span>
</button>
```

```css
/* ツールチップは視覚的には非表示だが、スクリーンリーダーには読み上げられる */
.tooltip {
  position: absolute;
  position-anchor: --tooltip-trigger;
  position-area: top;

  /* 視覚的に非表示（ホバー前） */
  opacity: 0;
  pointer-events: none;

  /* ただしスクリーンリーダーには利用可能 */
  /* clip: rect(0 0 0 0) は使わない */
}

.tooltip-trigger:hover .tooltip,
.tooltip-trigger:focus-visible .tooltip {
  opacity: 1;
}
```

## アニメーションパターン

### フェードイン/アウト

```css
.fade-tooltip {
  opacity: 0;
  transition: opacity 0.3s ease;
}

.trigger:hover .fade-tooltip,
.trigger:focus-visible .fade-tooltip {
  opacity: 1;
}
```

### スライドイン

```css
.slide-tooltip {
  position-anchor: --slide-trigger;
  position-area: top;

  opacity: 0;
  transform: translateY(8px);
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.trigger:hover .slide-tooltip {
  opacity: 1;
  transform: translateY(0);
}
```

### スケールアニメーション

```css
.scale-popover {
  opacity: 0;
  transform: scale(0.95);
  transform-origin: top left;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease,
    overlay 0.2s allow-discrete,
    display 0.2s allow-discrete;
}

.scale-popover:popover-open {
  opacity: 1;
  transform: scale(1);
}

@starting-style {
  .scale-popover:popover-open {
    opacity: 0;
    transform: scale(0.95);
  }
}
```

### 複雑なアニメーション

```css
@keyframes popoverSlideIn {
  from {
    opacity: 0;
    transform: translateY(-12px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes popoverSlideOut {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-12px) scale(0.98);
  }
}

.animated-popover {
  animation: popoverSlideOut 0.2s ease forwards;
}

.animated-popover:popover-open {
  animation: popoverSlideIn 0.2s ease forwards;
}
```

## パフォーマンス最適化

### will-change の活用

```css
.optimized-tooltip {
  /* アニメーションするプロパティを事前通知 */
  will-change: opacity, transform;
}

.trigger:hover .optimized-tooltip {
  opacity: 1;
  transform: translateY(0);
}

/* ホバーが終わったら will-change をリセット */
.trigger:not(:hover) .optimized-tooltip {
  will-change: auto;
}
```

### contain の使用

```css
.contained-menu {
  /* レイアウトとペイントを分離 */
  contain: layout paint;

  /* さらに厳格な分離 */
  content-visibility: auto;
}
```

## まとめ

CSS Anchor Positioningを実践的に活用することで、以下が実現できます。

### 主な利点

1. **JavaScriptライブラリ不要** - CSSのみで実装
2. **パフォーマンス向上** - ネイティブCSS機能による高速化
3. **保守性の向上** - 宣言的なコード
4. **アクセシビリティ** - Popover APIとの組み合わせ
5. **レスポンシブ対応** - メディアクエリとの統合

### 実装時の注意点

- ブラウザサポートを確認（Polyfill使用を検討）
- アクセシビリティを最優先
- フォールバック配置を設定
- パフォーマンスを監視

CSS Anchor Positioningは、モダンなUIパターンを実装する強力なツールです。適切に活用することで、ユーザー体験を大幅に向上させることができます。

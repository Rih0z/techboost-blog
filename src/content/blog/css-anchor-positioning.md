---
title: "CSS Anchor Positioning入門 — ツールチップとポップオーバーの新常識"
description: "CSS Anchor Positioning APIの基本、anchor()関数、position-area、@position-try、Popover API連携による実践的なツールチップ・ポップオーバー実装を解説します。"
pubDate: "2026-02-05"
tags: ["CSS", "Anchor Positioning", "Popover", "Web Standards", "UI"]
---

## CSS Anchor Positioningとは

CSS Anchor Positioningは、要素を別の要素（アンカー）に対して相対的に配置できる新しいCSS機能です。従来JavaScriptライブラリ（Popper.js、Floating UIなど）が担っていた役割をCSSだけで実現できます。

### 従来の課題

```javascript
// Popper.jsを使った実装
import { createPopper } from '@popperjs/core'

const button = document.querySelector('#button')
const tooltip = document.querySelector('#tooltip')

createPopper(button, tooltip, {
  placement: 'top',
  modifiers: [
    { name: 'offset', options: { offset: [0, 8] } },
  ],
})
```

これがCSSだけで可能になります。

## ブラウザサポート

2026年2月時点:
- Chrome 125+（2024年5月〜）
- Edge 125+
- Safari: 未サポート（polyfill使用推奨）
- Firefox: 未サポート（polyfill使用推奨）

Polyfillとして[Oddbird CSS Anchor Positioning](https://github.com/oddbird/css-anchor-positioning)が利用できます。

## 基本的な使い方

### アンカーとターゲットの設定

```html
<button id="my-button">ボタン</button>
<div id="tooltip">ツールチップ</div>
```

```css
/* アンカーを定義 */
#my-button {
  anchor-name: --my-anchor;
}

/* アンカーに対して配置 */
#tooltip {
  position: absolute;
  position-anchor: --my-anchor;

  /* アンカーの上部に配置 */
  bottom: anchor(top);
  left: anchor(center);
  translate: -50% 0; /* 中央揃え */
}
```

### anchor()関数

`anchor()`関数は、アンカー要素の位置を参照します。

```css
.tooltip {
  /* アンカーの上に配置 */
  bottom: anchor(top);

  /* アンカーの下に配置 */
  top: anchor(bottom);

  /* アンカーの左に配置 */
  right: anchor(left);

  /* アンカーの右に配置 */
  left: anchor(right);

  /* アンカーの中央 */
  left: anchor(center);
  top: anchor(center);
}
```

### オフセット付き配置

```css
.tooltip {
  /* アンカーの上、8px離す */
  bottom: calc(anchor(top) + 8px);

  /* アンカーの右、16px離す */
  left: calc(anchor(right) + 16px);
}
```

## position-area — 簡単な配置

`position-area`を使うと、より簡潔に配置を指定できます。

```css
.tooltip {
  position: absolute;
  position-anchor: --my-anchor;

  /* アンカーの上、中央 */
  position-area: top;

  /* アンカーの下、左 */
  position-area: bottom left;

  /* アンカーの右、中央 */
  position-area: right;
}
```

### position-areaの値

```
   top-left    |   top    |   top-right
  -------------+----------+-------------
   left        | (anchor) |   right
  -------------+----------+-------------
   bottom-left |  bottom  | bottom-right
```

```css
/* 例 */
.tooltip-top { position-area: top; }
.tooltip-bottom { position-area: bottom; }
.tooltip-left { position-area: left; }
.tooltip-right { position-area: right; }
.tooltip-top-left { position-area: top left; }
.tooltip-bottom-right { position-area: bottom right; }
```

## 実践例: ツールチップ

### シンプルなツールチップ

```html
<button class="anchor-button">ホバーしてね</button>
<div class="tooltip">これはツールチップです</div>
```

```css
.anchor-button {
  anchor-name: --button-anchor;
}

.tooltip {
  position: absolute;
  position-anchor: --button-anchor;
  position-area: top;

  margin-bottom: 8px;
  padding: 8px 12px;
  background: #333;
  color: white;
  border-radius: 4px;
  font-size: 14px;
  white-space: nowrap;

  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}

.anchor-button:hover + .tooltip {
  opacity: 1;
}

/* 矢印 */
.tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  translate: -50% 0;
  border: 6px solid transparent;
  border-top-color: #333;
}
```

## @position-try — フォールバック配置

画面端で要素がはみ出る場合の自動調整。

```css
.tooltip {
  position: absolute;
  position-anchor: --my-anchor;
  position-area: top;

  /* フォールバック */
  position-try-fallbacks:
    --bottom,
    --left,
    --right;
}

@position-try --bottom {
  position-area: bottom;
}

@position-try --left {
  position-area: left;
}

@position-try --right {
  position-area: right;
}
```

### position-try-order

```css
.tooltip {
  position-try-fallbacks:
    --bottom,
    --left,
    --right;

  /* より多くのスペースがある位置を優先 */
  position-try-order: most-block-size;
}
```

## Popover APIとの統合

Popover APIと組み合わせると、さらに強力です。

```html
<button popovertarget="my-popover" class="trigger">開く</button>

<div popover id="my-popover" class="popover">
  <h3>ポップオーバー</h3>
  <p>これはポップオーバーの内容です。</p>
</div>
```

```css
.trigger {
  anchor-name: --trigger-anchor;
}

.popover {
  position-anchor: --trigger-anchor;
  position-area: bottom;
  margin-top: 8px;

  /* Popoverのデフォルトスタイルをリセット */
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);

  /* アニメーション */
  opacity: 0;
  transform: translateY(-10px);
  transition: opacity 0.2s, transform 0.2s, overlay 0.2s allow-discrete, display 0.2s allow-discrete;
}

.popover:popover-open {
  opacity: 1;
  transform: translateY(0);
}

/* 開始状態をアニメーション */
@starting-style {
  .popover:popover-open {
    opacity: 0;
    transform: translateY(-10px);
  }
}
```

## 実践例: ドロップダウンメニュー

```html
<button popovertarget="menu" class="menu-button">メニュー</button>

<div popover id="menu" class="dropdown-menu">
  <button>項目 1</button>
  <button>項目 2</button>
  <button>項目 3</button>
</div>
```

```css
.menu-button {
  anchor-name: --menu-anchor;
}

.dropdown-menu {
  position-anchor: --menu-anchor;
  position-area: bottom left;
  margin-top: 4px;

  min-width: anchor-size(width);
  padding: 4px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dropdown-menu button {
  padding: 8px 12px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  border-radius: 4px;
}

.dropdown-menu button:hover {
  background: #f0f0f0;
}
```

## anchor-size() — アンカーのサイズを参照

```css
.tooltip {
  /* アンカーと同じ幅 */
  width: anchor-size(width);

  /* アンカーの幅の2倍 */
  width: calc(anchor-size(width) * 2);

  /* アンカーと同じ高さ */
  height: anchor-size(height);
}
```

## 実践例: コンテキストメニュー

```html
<div class="content" id="content">
  右クリックしてみて
</div>

<div popover id="context-menu" class="context-menu">
  <button>コピー</button>
  <button>貼り付け</button>
  <button>削除</button>
</div>
```

```javascript
const content = document.getElementById('content')
const menu = document.getElementById('context-menu')

content.addEventListener('contextmenu', (e) => {
  e.preventDefault()

  // 動的アンカー位置
  content.style.anchorName = '--context-anchor'

  // カーソル位置に仮想アンカー
  const rect = content.getBoundingClientRect()
  content.style.setProperty('--anchor-x', `${e.clientX - rect.left}px`)
  content.style.setProperty('--anchor-y', `${e.clientY - rect.top}px`)

  menu.showPopover()
})
```

```css
.context-menu {
  position: absolute;
  position-anchor: --context-anchor;

  /* カーソル位置に配置 */
  left: anchor(left);
  top: anchor(top);
  translate: var(--anchor-x, 0) var(--anchor-y, 0);

  padding: 4px;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
```

## Polyfillの使用

```bash
npm install @oddbird/css-anchor-positioning
```

```javascript
import { polyfill } from '@oddbird/css-anchor-positioning'

// ブラウザがサポートしていない場合のみpolyfill
if (!CSS.supports('anchor-name', '--test')) {
  polyfill()
}
```

または、CDN:

```html
<script type="module">
  import { polyfill } from 'https://cdn.jsdelivr.net/npm/@oddbird/css-anchor-positioning'

  if (!CSS.supports('anchor-name', '--test')) {
    polyfill()
  }
</script>
```

## パフォーマンスとベストプラクティス

### 1. アンカーを明示的に指定

```css
/* ✅ 推奨 */
.tooltip {
  position-anchor: --my-anchor;
}

/* ❌ 非推奨（暗黙的な関連） */
```

### 2. position-areaを優先

```css
/* ✅ シンプル */
.tooltip {
  position-area: top;
}

/* ❌ 冗長 */
.tooltip {
  bottom: anchor(top);
  left: anchor(center);
  translate: -50% 0;
}
```

### 3. フォールバックを設定

```css
.tooltip {
  position-try-fallbacks: --bottom, --left, --right;
}
```

## まとめ

CSS Anchor Positioningは、以下のメリットがあります。

- **JavaScriptライブラリ不要**: Popper.js、Floating UIが不要
- **パフォーマンス**: CSSネイティブで高速
- **宣言的**: HTMLとCSSのみで完結
- **Popover API連携**: モダンなUIパターンを簡単に実装

現時点ではpolyfillが必要ですが、今後ブラウザサポートが広がれば、ツールチップやドロップダウンメニューの実装が大幅に簡素化されます。

## 参考リンク

- [CSS Anchor Positioning Spec](https://drafts.csswg.org/css-anchor-position-1/)
- [MDN: CSS Anchor Positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning)
- [Oddbird Polyfill](https://github.com/oddbird/css-anchor-positioning)
- [Chrome Developers Blog](https://developer.chrome.com/blog/anchor-positioning-api)

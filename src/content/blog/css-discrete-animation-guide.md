---
title: 'CSS離散アニメーション実践ガイド: display/visibilityをアニメーション化'
description: 'CSS transition-behavior: allow-discreteで、これまでアニメーション不可だったdisplay、visibility、content-visibilityをスムーズに遷移させる方法を解説します。サンプルコード付きで実践的に解説。'
pubDate: '2025-02-05'
tags: ['CSS', 'Animation', 'Transition', 'WebDev', 'Frontend', 'プログラミング']
heroImage: '../../assets/thumbnails/css-discrete-animation-guide.jpg'
---
CSS離散プロパティ（discrete properties）のアニメーション化は、長年の課題でした。しかし`transition-behavior: allow-discrete`の登場により、`display`や`visibility`をスムーズに遷移できるようになりました。

## 離散アニメーションとは

従来、CSSでアニメーション可能だったのは連続値（opacity: 0～1など）のみでした。離散値（display: none/block）は中間状態が存在しないため、瞬時に切り替わっていました。

### 従来の問題

```css
/* これではアニメーションしない */
.modal {
  display: none;
  opacity: 0;
  transition: opacity 0.3s;
}

.modal.open {
  display: block;
  opacity: 1;
}
```

display: noneからblockへは即座に切り替わるため、opacityのトランジションが発火しません。

## transition-behavior: allow-discrete

この新しいプロパティで、離散値のアニメーションが可能になります。

### 基本構文

```css
.element {
  transition-property: display, opacity;
  transition-duration: 0.3s;
  transition-behavior: allow-discrete;
}
```

## display プロパティのアニメーション

最も実用的なのが、モーダルやドロップダウンのフェードイン/アウトです。

### フェードインモーダル

```css
.modal {
  display: none;
  opacity: 0;
  transition:
    opacity 0.3s ease-out,
    display 0.3s allow-discrete;
}

.modal.open {
  display: block;
  opacity: 1;
}

/* transitionプロパティの短縮記法 */
.modal-short {
  display: none;
  opacity: 0;
  transition:
    opacity 0.3s,
    display 0.3s allow-discrete;
}

.modal-short.open {
  display: block;
  opacity: 1;
}
```

### スライドダウンメニュー

```css
.dropdown-menu {
  display: none;
  opacity: 0;
  transform: translateY(-10px);
  transition:
    opacity 0.25s ease-out,
    transform 0.25s ease-out,
    display 0.25s allow-discrete;
}

.dropdown-menu.open {
  display: block;
  opacity: 1;
  transform: translateY(0);
}
```

### ツールチップ

```css
.tooltip {
  display: none;
  opacity: 0;
  scale: 0.95;
  transition:
    opacity 0.2s,
    scale 0.2s,
    display 0.2s allow-discrete;
}

.tooltip-trigger:hover .tooltip {
  display: block;
  opacity: 1;
  scale: 1;
}
```

## visibility プロパティのアニメーション

visibilityも同様にアニメーション可能です。displayとの違いは、レイアウト空間を保持する点です。

### 基本例

```css
.element {
  visibility: hidden;
  opacity: 0;
  transition:
    opacity 0.3s,
    visibility 0.3s allow-discrete;
}

.element.visible {
  visibility: visible;
  opacity: 1;
}
```

### タブコンテンツ切り替え

```css
.tab-content {
  visibility: hidden;
  opacity: 0;
  position: absolute;
  transition:
    opacity 0.3s ease-in-out,
    visibility 0.3s allow-discrete;
}

.tab-content.active {
  visibility: visible;
  opacity: 1;
  position: relative;
}
```

## @starting-style の活用

`@starting-style`ルールで、初期レンダリング時のアニメーションを制御できます。

### ページロード時のフェードイン

```css
.hero {
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity 0.5s ease-out,
    transform 0.5s ease-out;
}

@starting-style {
  .hero {
    opacity: 0;
    transform: translateY(20px);
  }
}
```

### displayと組み合わせる

```css
dialog {
  opacity: 1;
  scale: 1;
  transition:
    opacity 0.3s,
    scale 0.3s,
    display 0.3s allow-discrete,
    overlay 0.3s allow-discrete;
}

@starting-style {
  dialog[open] {
    opacity: 0;
    scale: 0.9;
  }
}

dialog:not([open]) {
  opacity: 0;
  scale: 0.9;
}
```

## 実践例: モーダルダイアログ

完全に機能するモーダルの実装例です。

### HTML

```html
<button id="openModal">モーダルを開く</button>

<dialog id="modal">
  <div class="modal-content">
    <h2>モーダルタイトル</h2>
    <p>モーダルの内容がここに入ります。</p>
    <button id="closeModal">閉じる</button>
  </div>
</dialog>
```

### CSS

```css
dialog {
  border: none;
  border-radius: 8px;
  padding: 2rem;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);

  opacity: 0;
  scale: 0.95;
  transition:
    opacity 0.3s ease-out,
    scale 0.3s ease-out,
    display 0.3s allow-discrete,
    overlay 0.3s allow-discrete;
}

dialog[open] {
  opacity: 1;
  scale: 1;
}

@starting-style {
  dialog[open] {
    opacity: 0;
    scale: 0.95;
  }
}

dialog::backdrop {
  background-color: rgba(0, 0, 0, 0);
  transition: background-color 0.3s;
}

dialog[open]::backdrop {
  background-color: rgba(0, 0, 0, 0.5);
}
```

### JavaScript

```javascript
const modal = document.getElementById('modal')
const openBtn = document.getElementById('openModal')
const closeBtn = document.getElementById('closeModal')

openBtn.addEventListener('click', () => {
  modal.showModal()
})

closeBtn.addEventListener('click', () => {
  modal.close()
})

// 背景クリックで閉じる
modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.close()
  }
})
```

## 実践例: アコーディオンメニュー

```html
<div class="accordion">
  <button class="accordion-trigger">セクション1</button>
  <div class="accordion-content">
    <p>アコーディオンの内容がここに表示されます。</p>
  </div>
</div>
```

```css
.accordion-content {
  display: none;
  opacity: 0;
  max-height: 0;
  overflow: hidden;
  transition:
    opacity 0.3s ease-out,
    max-height 0.3s ease-out,
    display 0.3s allow-discrete;
}

.accordion.open .accordion-content {
  display: block;
  opacity: 1;
  max-height: 500px;
}
```

```javascript
document.querySelectorAll('.accordion-trigger').forEach(trigger => {
  trigger.addEventListener('click', () => {
    trigger.parentElement.classList.toggle('open')
  })
})
```

## パフォーマンス最適化

### will-change の活用

```css
.modal {
  will-change: opacity, transform;
  transition:
    opacity 0.3s,
    transform 0.3s,
    display 0.3s allow-discrete;
}

/* アニメーション完了後にwill-changeをクリア */
.modal.animation-complete {
  will-change: auto;
}
```

### ハードウェアアクセラレーション

```css
.animated-element {
  /* transformやopacityはGPUアクセラレーション可能 */
  transform: translateZ(0);
  transition:
    opacity 0.3s,
    transform 0.3s,
    display 0.3s allow-discrete;
}
```

## アクセシビリティへの配慮

### ARIA属性との連携

```html
<button
  aria-expanded="false"
  aria-controls="dropdown"
  id="dropdown-trigger">
  メニュー
</button>

<div
  id="dropdown"
  role="menu"
  aria-labelledby="dropdown-trigger"
  class="dropdown-menu">
  <!-- メニュー項目 -->
</div>
```

```javascript
const trigger = document.getElementById('dropdown-trigger')
const dropdown = document.getElementById('dropdown')

trigger.addEventListener('click', () => {
  const isOpen = dropdown.classList.contains('open')
  dropdown.classList.toggle('open')
  trigger.setAttribute('aria-expanded', !isOpen)
})
```

### キーボード操作対応

```javascript
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.hasAttribute('open')) {
    modal.close()
  }
})
```

## ブラウザサポート

`transition-behavior: allow-discrete`は比較的新しい機能です。

**サポート状況（2025年2月時点）:**
- Chrome 117+
- Edge 117+
- Safari 17.4+
- Firefox 129+

### フォールバック

```css
/* 非対応ブラウザ向けフォールバック */
.modal {
  display: none;
  opacity: 0;
}

.modal.open {
  display: block;
  animation: fadeIn 0.3s forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 対応ブラウザではtransitionを使用 */
@supports (transition-behavior: allow-discrete) {
  .modal {
    animation: none;
    transition:
      opacity 0.3s,
      transform 0.3s,
      display 0.3s allow-discrete;
  }

  .modal.open {
    opacity: 1;
    transform: scale(1);
  }
}
```

## まとめ

`transition-behavior: allow-discrete`により、CSSアニメーションの可能性が大きく広がりました。

**メリット:**
- JavaScriptなしでスムーズなUI遷移が可能
- コード量の削減
- パフォーマンスの向上
- メンテナンス性の改善

**適したユースケース:**
- モーダル・ダイアログ
- ドロップダウンメニュー
- ツールチップ
- アコーディオン
- タブコンテンツ

JavaScriptでのクラス切り替えと組み合わせることで、モダンでアクセシブルなUIコンポーネントを簡単に実装できます。

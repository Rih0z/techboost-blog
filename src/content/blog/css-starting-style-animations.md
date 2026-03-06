---
title: 'CSS @starting-style応用ガイド'
description: 'CSS @starting-styleを使った表示時アニメーションの実践的な実装方法。ダイアログ、ポップオーバー、トースト通知、モーダルなどの自然なアニメーションパターンを解説します。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。'
pubDate: 'Feb 06 2026'
tags: ['CSS', 'アニメーション', 'UI-UX', 'Web標準', 'フロントエンド', 'プログラミング']
---
# CSS @starting-style応用ガイド

モダンなWebアプリケーションでは、要素の表示・非表示に自然なアニメーションを付けることがUX向上の鍵となります。従来はJavaScriptで要素の状態を管理する必要がありましたが、CSS `@starting-style`を使えば、純粋なCSSだけで洗練されたアニメーションを実装できます。

この記事では、`@starting-style`の基本から、ダイアログ、ポップオーバー、トースト通知、ドロップダウンメニューなど、実践的なUIパターンの実装方法を詳しく解説します。

## @starting-styleとは

`@starting-style`は、要素が初めてレンダリングされる際の開始スタイルを定義するCSSルールです。`display: none`から`display: block`に変化する要素や、DOMに新しく追加された要素に対して、スムーズなトランジションを適用できます。

### 基本構文

```css
/* 通常の状態 */
.element {
  opacity: 1;
  transform: translateY(0);
  transition: all 0.3s ease;
}

/* 表示開始時の初期状態 */
@starting-style {
  .element {
    opacity: 0;
    transform: translateY(-20px);
  }
}
```

### 従来の方法との比較

**従来の方法（JavaScript必須）**

```javascript
// 要素を追加
const element = document.createElement('div');
element.classList.add('hidden'); // 初期状態
document.body.appendChild(element);

// 強制リフロー
element.offsetHeight;

// アニメーション開始
element.classList.remove('hidden');
```

**@starting-styleを使った方法**

```css
.element {
  opacity: 1;
  transition: opacity 0.3s;
}

@starting-style {
  .element {
    opacity: 0;
  }
}
```

JavaScriptが不要になり、コードがシンプルで保守しやすくなります。

## ダイアログのアニメーション

### モーダルダイアログ

```html
<dialog id="modal">
  <div class="modal-content">
    <h2>モーダルタイトル</h2>
    <p>モーダルの内容がここに入ります。</p>
    <button onclick="this.closest('dialog').close()">閉じる</button>
  </div>
</dialog>

<button onclick="document.getElementById('modal').showModal()">
  モーダルを開く
</button>
```

```css
dialog {
  border: none;
  border-radius: 12px;
  padding: 0;
  max-width: 500px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);

  /* アニメーション設定 */
  opacity: 1;
  transform: scale(1);
  transition:
    opacity 0.3s ease,
    transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    overlay 0.3s allow-discrete,
    display 0.3s allow-discrete;
}

/* 開始時の状態 */
@starting-style {
  dialog[open] {
    opacity: 0;
    transform: scale(0.9);
  }
}

/* 閉じる時の状態 */
dialog:not([open]) {
  opacity: 0;
  transform: scale(0.9);
}

/* バックドロップのアニメーション */
dialog::backdrop {
  background-color: rgba(0, 0, 0, 0.5);
  transition:
    background-color 0.3s,
    overlay 0.3s allow-discrete,
    display 0.3s allow-discrete;
}

@starting-style {
  dialog[open]::backdrop {
    background-color: rgba(0, 0, 0, 0);
  }
}

dialog:not([open])::backdrop {
  background-color: rgba(0, 0, 0, 0);
}

/* モーダルコンテンツ */
.modal-content {
  padding: 2rem;
}

.modal-content h2 {
  margin-top: 0;
}
```

### スライドインダイアログ

```css
/* 下からスライドイン */
dialog.slide-up {
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity 0.4s ease,
    transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
    overlay 0.4s allow-discrete,
    display 0.4s allow-discrete;
}

@starting-style {
  dialog.slide-up[open] {
    opacity: 0;
    transform: translateY(100%);
  }
}

dialog.slide-up:not([open]) {
  opacity: 0;
  transform: translateY(100%);
}

/* 右からスライドイン */
dialog.slide-left {
  position: fixed;
  right: 0;
  top: 0;
  height: 100vh;
  margin: 0;
  max-width: 400px;

  transform: translateX(0);
  transition:
    transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
    overlay 0.3s allow-discrete,
    display 0.3s allow-discrete;
}

@starting-style {
  dialog.slide-left[open] {
    transform: translateX(100%);
  }
}

dialog.slide-left:not([open]) {
  transform: translateX(100%);
}
```

## ポップオーバーのアニメーション

### 基本ポップオーバー

```html
<button popovertarget="info-popover">情報を表示</button>

<div id="info-popover" popover>
  <h3>詳細情報</h3>
  <p>ポップオーバーの内容がここに表示されます。</p>
</div>
```

```css
[popover] {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background: white;

  /* アニメーション */
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity 0.2s ease,
    transform 0.2s ease,
    overlay 0.2s allow-discrete,
    display 0.2s allow-discrete;
}

@starting-style {
  [popover]:popover-open {
    opacity: 0;
    transform: translateY(-10px);
  }
}

[popover]:not(:popover-open) {
  opacity: 0;
  transform: translateY(-10px);
}
```

### ツールチップ風ポップオーバー

```css
.tooltip-popover {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  background: #333;
  color: white;
  border: none;
  border-radius: 4px;

  /* アニメーション */
  opacity: 1;
  transform: translateY(0) scale(1);
  transition:
    opacity 0.15s ease,
    transform 0.15s cubic-bezier(0.16, 1, 0.3, 1),
    overlay 0.15s allow-discrete,
    display 0.15s allow-discrete;
}

@starting-style {
  .tooltip-popover:popover-open {
    opacity: 0;
    transform: translateY(-5px) scale(0.95);
  }
}

.tooltip-popover:not(:popover-open) {
  opacity: 0;
  transform: translateY(-5px) scale(0.95);
}

/* 三角形の矢印 */
.tooltip-popover::before {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-bottom-color: #333;
}
```

### ドロップダウンメニュー

```html
<button popovertarget="menu-popover">メニュー</button>

<div id="menu-popover" popover class="menu-popover">
  <ul>
    <li><a href="#">プロフィール</a></li>
    <li><a href="#">設定</a></li>
    <li><a href="#">ヘルプ</a></li>
    <li><a href="#">ログアウト</a></li>
  </ul>
</div>
```

```css
.menu-popover {
  padding: 0.5rem;
  min-width: 200px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

  /* アニメーション */
  opacity: 1;
  transform: translateY(0) scale(1);
  transform-origin: top;
  transition:
    opacity 0.2s ease,
    transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
    overlay 0.2s allow-discrete,
    display 0.2s allow-discrete;
}

@starting-style {
  .menu-popover:popover-open {
    opacity: 0;
    transform: translateY(-10px) scale(0.9);
  }
}

.menu-popover:not(:popover-open) {
  opacity: 0;
  transform: translateY(-10px) scale(0.9);
}

.menu-popover ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.menu-popover li {
  margin: 0;
}

.menu-popover a {
  display: block;
  padding: 0.5rem 1rem;
  color: #333;
  text-decoration: none;
  border-radius: 4px;
  transition: background-color 0.15s;
}

.menu-popover a:hover {
  background-color: #f5f5f5;
}
```

## トースト通知

### 基本トースト

```html
<div id="toast-container"></div>

<button onclick="showToast('操作が完了しました')">トーストを表示</button>
```

```javascript
function showToast(message, duration = 3000) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;

  document.getElementById('toast-container').appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
```

```css
#toast-container {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  z-index: 1000;
}

.toast {
  background: #333;
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  min-width: 250px;

  /* アニメーション */
  opacity: 1;
  transform: translateX(0);
  transition:
    opacity 0.3s ease,
    transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@starting-style {
  .toast {
    opacity: 0;
    transform: translateX(100px);
  }
}

.toast.removing {
  opacity: 0;
  transform: translateX(100px);
}
```

### 異なるタイプのトースト

```css
/* 成功トースト */
.toast.success {
  background: #10b981;
}

@starting-style {
  .toast.success {
    opacity: 0;
    transform: translateY(20px) scale(0.9);
  }
}

/* エラートースト */
.toast.error {
  background: #ef4444;
  animation: shake 0.3s;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

@starting-style {
  .toast.error {
    opacity: 0;
    transform: translateY(20px);
  }
}

/* 警告トースト */
.toast.warning {
  background: #f59e0b;
  color: #1f2937;
}

@starting-style {
  .toast.warning {
    opacity: 0;
    transform: scale(0.8);
  }
}
```

### プログレス付きトースト

```html
<div class="toast toast-progress">
  <p>ファイルをアップロード中...</p>
  <div class="progress-bar">
    <div class="progress-fill"></div>
  </div>
</div>
```

```css
.toast-progress {
  padding: 1rem;
}

.toast-progress p {
  margin: 0 0 0.5rem 0;
}

.progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: white;
  width: 0;
  animation: progress 3s linear forwards;
}

@keyframes progress {
  to { width: 100%; }
}

@starting-style {
  .toast-progress {
    opacity: 0;
    transform: translateY(-20px);
  }
}
```

## アコーディオン

```html
<details class="accordion">
  <summary>セクション1</summary>
  <div class="accordion-content">
    <p>アコーディオンの内容がここに表示されます。</p>
  </div>
</details>
```

```css
.accordion {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  overflow: hidden;
}

.accordion summary {
  padding: 1rem;
  cursor: pointer;
  user-select: none;
  background: #f9fafb;
  font-weight: 600;
  transition: background-color 0.2s;
}

.accordion summary:hover {
  background: #f3f4f6;
}

.accordion[open] summary {
  background: #e5e7eb;
}

.accordion-content {
  padding: 1rem;

  /* アニメーション */
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

@starting-style {
  .accordion[open] .accordion-content {
    opacity: 0;
    transform: translateY(-10px);
  }
}
```

## カード入場アニメーション

```html
<div class="card-grid">
  <div class="card" style="--delay: 0">カード1</div>
  <div class="card" style="--delay: 1">カード2</div>
  <div class="card" style="--delay: 2">カード3</div>
</div>
```

```css
.card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  /* アニメーション */
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity 0.5s ease calc(var(--delay) * 0.1s),
    transform 0.5s ease calc(var(--delay) * 0.1s);
}

@starting-style {
  .card {
    opacity: 0;
    transform: translateY(30px);
  }
}
```

## ベストプラクティス

### パフォーマンス最適化

```css
/* transform と opacity のみを使用（GPU加速） */
.element {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.3s, transform 0.3s;
}

/* 避けるべき: width, height, top, left */
.element-bad {
  height: 100px; /* リフローを引き起こす */
  transition: height 0.3s;
}
```

### アクセシビリティ

```css
/* アニメーションを無効にするユーザー設定を尊重 */
@media (prefers-reduced-motion: reduce) {
  * {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }

  @starting-style {
    * {
      /* 初期状態を最終状態と同じにする */
      opacity: 1;
      transform: none;
    }
  }
}
```

### タイミング関数

```css
/* 自然な動き */
.natural {
  transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

/* バウンス効果 */
.bounce {
  transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 急激な開始 */
.snappy {
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
```

## まとめ

`@starting-style`を活用することで、以下のようなUIパターンを純粋なCSSだけで実装できます。

- **ダイアログ**: モーダル、スライドイン
- **ポップオーバー**: ツールチップ、ドロップダウンメニュー
- **トースト通知**: 成功、エラー、警告、プログレス付き
- **アコーディオン**: スムーズな展開・折りたたみ
- **カード**: 段階的な入場アニメーション

JavaScriptを減らし、宣言的なCSSでアニメーションを管理することで、コードの保守性とパフォーマンスが向上します。ブラウザサポートも広がっているため、今すぐプロジェクトに導入できます。

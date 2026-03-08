---
title: "CSS @starting-style完全ガイド - display:noneからの滑らかなアニメーション"
description: "@starting-styleルールを使ったCSS遷移の新手法。display:noneからのアニメーション、Popover API・dialog要素との組み合わせ、ブラウザサポート状況と代替策を詳しく解説します。2026年最新の情報を反映しています。"
pubDate: "2025-02-05"
tags: ['CSS', 'フロントエンド', '開発ツール']
heroImage: '../../assets/thumbnails/css-starting-style-guide.jpg'
---
CSS `@starting-style`は、要素が初めてレンダリングされる際の開始スタイルを定義する新しいat-ruleです。これにより、`display: none`からのアニメーションやダイアログの表示アニメーションが簡単に実装できます。

## @starting-styleとは

従来、CSSトランジションは既に表示されている要素のスタイル変更にのみ適用されました。`@starting-style`は、要素の初期表示時のアニメーションを可能にします。

### 基本構文

```css
.element {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.3s, transform 0.3s;

  @starting-style {
    opacity: 0;
    transform: translateY(-20px);
  }
}
```

### 従来の問題点

```css
/* 従来の方法 - 動作しない */
.dialog {
  display: none;
  opacity: 0;
  transition: opacity 0.3s;
}

.dialog.open {
  display: block; /* 即座に適用される */
  opacity: 1;     /* トランジションが効かない */
}
```

`display`の変更はトランジションの対象外であり、`none`から`block`への変更時にトランジションは適用されません。

## @starting-styleの使用例

### 基本的なフェードイン

```css
.fade-in {
  opacity: 1;
  transition: opacity 0.4s ease-in-out;

  @starting-style {
    opacity: 0;
  }
}
```

```html
<div class="fade-in">
  この要素は初回表示時にフェードインします
</div>
```

### スライドインアニメーション

```css
.slide-in {
  transform: translateX(0);
  opacity: 1;
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
              opacity 0.5s;

  @starting-style {
    transform: translateX(-100%);
    opacity: 0;
  }
}
```

### 回転しながら表示

```css
.rotate-in {
  transform: rotate(0deg) scale(1);
  opacity: 1;
  transition: all 0.6s ease-out;

  @starting-style {
    transform: rotate(-180deg) scale(0.3);
    opacity: 0;
  }
}
```

## Popover APIとの組み合わせ

`@starting-style`はHTML Popover APIと相性が良く、ポップオーバーの表示・非表示アニメーションを実装できます。

### 基本的なポップオーバー

```html
<button popovertarget="my-popover">メニューを開く</button>

<div id="my-popover" popover>
  <ul>
    <li>項目 1</li>
    <li>項目 2</li>
    <li>項目 3</li>
  </ul>
</div>
```

```css
[popover] {
  /* 開いている状態（最終状態） */
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity 0.3s,
    transform 0.3s,
    overlay 0.3s allow-discrete,
    display 0.3s allow-discrete;

  /* 初期状態 */
  @starting-style {
    opacity: 0;
    transform: translateY(-10px);
  }

  /* 閉じる時の状態 */
  &:popover-open {
    opacity: 1;
    transform: translateY(0);
  }

  &:not(:popover-open) {
    opacity: 0;
    transform: translateY(-10px);
  }
}
```

### 高度なポップオーバーアニメーション

```css
.menu-popover {
  /* ポップオーバーの基本スタイル */
  background: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);

  /* アニメーション設定 */
  opacity: 1;
  transform: scale(1) translateY(0);
  transition:
    opacity 0.2s ease-out,
    transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
    overlay 0.2s allow-discrete,
    display 0.2s allow-discrete;

  /* 開始スタイル */
  @starting-style {
    opacity: 0;
    transform: scale(0.9) translateY(-8px);
  }

  /* 閉じる時 */
  &:not(:popover-open) {
    opacity: 0;
    transform: scale(0.95) translateY(-4px);
  }
}
```

## dialog要素との連携

`<dialog>`要素の表示アニメーションも`@starting-style`で実装できます。

### モーダルダイアログ

```html
<dialog id="my-dialog">
  <h2>確認ダイアログ</h2>
  <p>この操作を実行してもよろしいですか？</p>
  <form method="dialog">
    <button value="cancel">キャンセル</button>
    <button value="confirm">OK</button>
  </form>
</dialog>

<button onclick="document.getElementById('my-dialog').showModal()">
  ダイアログを開く
</button>
```

```css
dialog {
  border: none;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);

  /* 開いている状態 */
  opacity: 1;
  transform: scale(1);
  transition:
    opacity 0.3s,
    transform 0.3s,
    overlay 0.3s allow-discrete,
    display 0.3s allow-discrete;

  /* 初期状態 */
  @starting-style {
    opacity: 0;
    transform: scale(0.9);
  }

  /* 閉じた状態 */
  &:not([open]) {
    opacity: 0;
    transform: scale(0.95);
  }
}

/* バックドロップのアニメーション */
dialog::backdrop {
  background-color: rgba(0, 0, 0, 0.5);
  transition:
    background-color 0.3s,
    overlay 0.3s allow-discrete,
    display 0.3s allow-discrete;

  @starting-style {
    background-color: rgba(0, 0, 0, 0);
  }
}

dialog:not([open])::backdrop {
  background-color: rgba(0, 0, 0, 0);
}
```

### スライドアップダイアログ

```css
.slide-up-dialog {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  margin: 0;
  max-height: 80vh;
  border-radius: 16px 16px 0 0;

  opacity: 1;
  transform: translateY(0);
  transition:
    opacity 0.4s,
    transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
    overlay 0.4s allow-discrete,
    display 0.4s allow-discrete;

  @starting-style {
    opacity: 0;
    transform: translateY(100%);
  }

  &:not([open]) {
    opacity: 0;
    transform: translateY(100%);
  }
}
```

## 実践パターン集

### ツールチップ

```css
.tooltip {
  position: absolute;
  background: #333;
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
  white-space: nowrap;

  opacity: 1;
  transform: translateY(0);
  transition:
    opacity 0.2s,
    transform 0.2s,
    overlay 0.2s allow-discrete,
    display 0.2s allow-discrete;

  @starting-style {
    opacity: 0;
    transform: translateY(4px);
  }

  &:not(:popover-open) {
    opacity: 0;
    transform: translateY(4px);
  }
}

/* 矢印 */
.tooltip::before {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-bottom-color: #333;
}
```

### ドロップダウンメニュー

```css
.dropdown-menu {
  position: absolute;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  min-width: 200px;

  opacity: 1;
  transform: scale(1) translateY(0);
  transform-origin: top;
  transition:
    opacity 0.15s ease-out,
    transform 0.15s cubic-bezier(0.16, 1, 0.3, 1),
    overlay 0.15s allow-discrete,
    display 0.15s allow-discrete;

  @starting-style {
    opacity: 0;
    transform: scale(0.95) translateY(-8px);
  }

  &:not(:popover-open) {
    opacity: 0;
    transform: scale(0.98) translateY(-4px);
  }
}
```

### トースト通知

```css
.toast {
  position: fixed;
  top: 1rem;
  right: 1rem;
  background: white;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);

  opacity: 1;
  transform: translateX(0);
  transition:
    opacity 0.3s,
    transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

  @starting-style {
    opacity: 0;
    transform: translateX(100%);
  }
}

/* 自動的にフェードアウト */
@keyframes fade-out {
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}

.toast.removing {
  animation: fade-out 0.3s forwards;
}
```

## allow-discreteの重要性

`transition-behavior: allow-discrete`（または`allow-discrete`キーワード）は、離散的プロパティ（`display`、`overlay`など）のトランジションを許可します。

```css
.element {
  transition:
    opacity 0.3s,
    display 0.3s allow-discrete,  /* 必須 */
    overlay 0.3s allow-discrete;  /* 必須 */
}
```

### 一括指定

```css
.element {
  transition-property: opacity, display, overlay;
  transition-duration: 0.3s;
  transition-behavior: normal, allow-discrete, allow-discrete;
}
```

## ブラウザサポート状況

2025年2月時点のサポート状況：

- **Chrome/Edge**: 117+ (2023年9月～)
- **Safari**: 17.4+ (2024年3月～)
- **Firefox**: 129+ (2024年8月～)

### フィーチャー検出

```javascript
const supportsStartingStyle = CSS.supports("@starting-style");

if (supportsStartingStyle) {
  document.body.classList.add('supports-starting-style');
}
```

```css
/* 代替スタイル */
:not(.supports-starting-style) .dialog {
  /* フォールバック用のシンプルなアニメーション */
  animation: simple-fade-in 0.3s;
}

@keyframes simple-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

## 代替手法

### JavaScriptによる遅延

```javascript
function showDialog(dialog) {
  dialog.style.display = 'block';

  // リフローを強制
  dialog.offsetHeight;

  // クラス追加でトランジション開始
  requestAnimationFrame(() => {
    dialog.classList.add('visible');
  });
}
```

```css
.dialog {
  display: none;
  opacity: 0;
  transform: scale(0.9);
  transition: opacity 0.3s, transform 0.3s;
}

.dialog.visible {
  opacity: 1;
  transform: scale(1);
}
```

### Web Animations API

```javascript
const dialog = document.querySelector('dialog');

dialog.showModal();

dialog.animate(
  [
    { opacity: 0, transform: 'scale(0.9)' },
    { opacity: 1, transform: 'scale(1)' }
  ],
  {
    duration: 300,
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
  }
);
```

## まとめ

`@starting-style`は以下のメリットをもたらします：

1. **シンプルなコード**: JavaScriptなしで初期表示アニメーション
2. **パフォーマンス**: GPUアクセラレーションの恩恵
3. **宣言的**: CSSのみで完結する直感的な記述
4. **標準化**: Popover API、dialog要素との統合

今後のWeb開発において、より豊かなユーザー体験を提供する重要な機能です。

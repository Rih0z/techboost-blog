---
title: "CSS transition-behavior完全ガイド - discrete transitionsで全プロパティをアニメーション化"
description: "CSS transition-behaviorプロパティを徹底解説。display、content-visibilityなどdiscreteプロパティのアニメーション化、allow-discreteの使い方、実践的なテクニックを網羅。"
pubDate: "2025-02-06"
tags: ["css", "animation", "transitions", "web-animations", "discrete-properties"]
---

CSS Transitions APIは長年、`opacity`や`transform`などの連続的なプロパティのみをアニメーション化できました。しかし、**CSS transition-behavior**プロパティの登場により、`display`や`content-visibility`などの離散的（discrete）なプロパティもアニメーション可能になりました。

この記事では、transition-behaviorの基本から実践的な活用方法まで、最新のCSSアニメーション技術を徹底解説します。

## transition-behaviorとは

transition-behaviorは、**離散的なプロパティ（discrete properties）のトランジション動作を制御**するCSSプロパティです。

### ブラウザサポート（2025年2月時点）

```css
/* Chrome 117+, Edge 117+, Safari 17.4+ */
.element {
  transition-behavior: allow-discrete;
}
```

- **Chrome/Edge**: 117+ (2023年9月〜)
- **Safari**: 17.4+ (2024年3月〜)
- **Firefox**: 開発中（Nightly版で実験的サポート）

### 基本構文

```css
/* 構文 */
transition-behavior: normal | allow-discrete;

/* 例 */
.modal {
  display: none;
  opacity: 0;
  transition: opacity 0.3s, display 0.3s;
  transition-behavior: allow-discrete;
}

.modal.open {
  display: block;
  opacity: 1;
}
```

## 離散的プロパティとは

従来のCSSトランジションは、数値的に補間可能なプロパティのみをアニメーション化できました。

### 連続的プロパティ（従来から可能）

```css
/* 数値・色・座標など補間可能 */
.element {
  opacity: 0;      /* 0 → 0.5 → 1 と滑らかに変化 */
  transform: translateX(0);  /* 0px → 50px → 100px */
  background: red; /* red → purple → blue */
  transition: all 0.3s;
}
```

### 離散的プロパティ（transition-behavior必須）

```css
/* ON/OFF、表示/非表示など段階的 */
.element {
  display: none;          /* none → block（中間状態なし）*/
  content-visibility: hidden;  /* hidden → visible */
  visibility: hidden;     /* hidden → visible */
  transition-behavior: allow-discrete;
  transition: all 0.3s;
}
```

## 実践例：displayプロパティのアニメーション

### 問題：従来のアプローチ

```css
/* これは動かない */
.modal {
  display: none;
  opacity: 0;
  transition: opacity 0.3s;
}

.modal.open {
  display: block; /* ← 即座に切り替わるため、opacityトランジションが見えない */
  opacity: 1;
}
```

### 解決：transition-behaviorを使用

```css
.modal {
  display: none;
  opacity: 0;
  transition:
    opacity 0.3s,
    display 0.3s allow-discrete; /* ← ショートハンド構文 */
}

.modal.open {
  display: block; /* トランジション期間中もblock状態を維持 */
  opacity: 1;
}
```

### HTMLとJavaScript

```html
<button id="openBtn">モーダルを開く</button>

<div class="modal" id="modal">
  <div class="modal-content">
    <h2>モーダルタイトル</h2>
    <p>コンテンツがフェードインします</p>
    <button id="closeBtn">閉じる</button>
  </div>
</div>
```

```javascript
const modal = document.getElementById('modal');
const openBtn = document.getElementById('openBtn');
const closeBtn = document.getElementById('closeBtn');

openBtn.addEventListener('click', () => {
  modal.classList.add('open');
});

closeBtn.addEventListener('click', () => {
  modal.classList.remove('open');
});
```

## @starting-styleとの組み合わせ

`@starting-style`ルールを使うと、初期レンダリング時のスタイルを定義できます。

### ページロード時のフェードイン

```css
.header {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.5s, transform 0.5s;
}

@starting-style {
  .header {
    opacity: 0;
    transform: translateY(-20px);
  }
}
```

### displayとの併用

```css
.dialog {
  display: block;
  opacity: 1;
  scale: 1;
  transition:
    opacity 0.3s,
    scale 0.3s,
    display 0.3s allow-discrete;
}

.dialog:not(.open) {
  display: none;
  opacity: 0;
  scale: 0.8;
}

@starting-style {
  .dialog.open {
    opacity: 0;
    scale: 0.8;
  }
}
```

## content-visibilityのトランジション

`content-visibility`は、レンダリングパフォーマンスを向上させるプロパティです。

### 基本的な使い方

```css
.card {
  content-visibility: auto; /* ビューポート外は非表示 */
  transition: content-visibility 0.3s allow-discrete;
}

.card.hidden {
  content-visibility: hidden;
}
```

### 長いリストのパフォーマンス最適化

```css
.article {
  content-visibility: auto;
  contain-intrinsic-size: auto 500px; /* 推定サイズ */
  transition: content-visibility 0.2s allow-discrete;
}

.article:hover {
  content-visibility: visible; /* 強制的に表示 */
}
```

```html
<div class="feed">
  <article class="article">記事1</article>
  <article class="article">記事2</article>
  <!-- ... 数百件の記事 ... -->
</div>
```

## visibilityとの違い

`visibility`と`display`は似ていますが、動作が異なります。

### visibility: hidden

```css
/* スペースは保持される */
.element {
  visibility: visible;
  opacity: 1;
  transition: visibility 0.3s, opacity 0.3s;
}

.element.hidden {
  visibility: hidden; /* レイアウトは保持 */
  opacity: 0;
}
```

### display: none

```css
/* スペースも削除される */
.element {
  display: block;
  opacity: 1;
  transition:
    display 0.3s allow-discrete,
    opacity 0.3s;
}

.element.hidden {
  display: none; /* レイアウトから完全削除 */
  opacity: 0;
}
```

## 実践例：ドロップダウンメニュー

```css
.dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  display: none;
  opacity: 0;
  transform: translateY(-10px);
  transition:
    opacity 0.2s,
    transform 0.2s,
    display 0.2s allow-discrete;
}

.dropdown:hover .dropdown-menu {
  display: block;
  opacity: 1;
  transform: translateY(0);
}

@starting-style {
  .dropdown:hover .dropdown-menu {
    opacity: 0;
    transform: translateY(-10px);
  }
}
```

```html
<nav class="dropdown">
  <button>メニュー</button>
  <ul class="dropdown-menu">
    <li><a href="#">項目1</a></li>
    <li><a href="#">項目2</a></li>
    <li><a href="#">項目3</a></li>
  </ul>
</nav>
```

## トースト通知のアニメーション

```css
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toast {
  display: none;
  padding: 16px 24px;
  background: #333;
  color: white;
  border-radius: 8px;
  opacity: 0;
  transform: translateX(100%);
  transition:
    display 0.3s allow-discrete,
    opacity 0.3s,
    transform 0.3s;
}

.toast.show {
  display: block;
  opacity: 1;
  transform: translateX(0);
}

@starting-style {
  .toast.show {
    opacity: 0;
    transform: translateX(100%);
  }
}
```

```javascript
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.querySelector('.toast-container').appendChild(toast);

  // トリガー用に少し待つ
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
  });

  // 3秒後に非表示
  setTimeout(() => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => {
      toast.remove();
    }, { once: true });
  }, 3000);
}

// 使用例
showToast('保存しました！');
```

## アコーディオンメニュー

```css
.accordion-item {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

.accordion-header {
  padding: 16px;
  background: #f5f5f5;
  cursor: pointer;
}

.accordion-content {
  display: none;
  padding: 0 16px;
  max-height: 0;
  opacity: 0;
  transition:
    display 0.3s allow-discrete,
    max-height 0.3s,
    padding 0.3s,
    opacity 0.3s;
}

.accordion-item.open .accordion-content {
  display: block;
  max-height: 500px;
  padding: 16px;
  opacity: 1;
}

@starting-style {
  .accordion-item.open .accordion-content {
    max-height: 0;
    padding: 0 16px;
    opacity: 0;
  }
}
```

```javascript
document.querySelectorAll('.accordion-header').forEach(header => {
  header.addEventListener('click', () => {
    const item = header.closest('.accordion-item');
    item.classList.toggle('open');
  });
});
```

## パフォーマンス考慮事項

### GPU アクセラレーション

```css
/* transformとopacityはGPUアクセラレーション可能 */
.element {
  display: block;
  opacity: 1;
  transform: translateY(0); /* GPU加速 */
  will-change: opacity, transform; /* ヒント */
  transition:
    display 0.3s allow-discrete,
    opacity 0.3s,
    transform 0.3s;
}
```

### contain プロパティ

```css
/* レンダリング最適化 */
.modal {
  contain: layout style paint;
  display: none;
  transition: display 0.3s allow-discrete;
}
```

## フォールバック（レガシーブラウザ対応）

```css
/* モダンブラウザ */
@supports (transition-behavior: allow-discrete) {
  .modal {
    display: none;
    opacity: 0;
    transition:
      display 0.3s allow-discrete,
      opacity 0.3s;
  }

  .modal.open {
    display: block;
    opacity: 1;
  }
}

/* 旧ブラウザ */
@supports not (transition-behavior: allow-discrete) {
  .modal {
    visibility: hidden;
    opacity: 0;
    transition: visibility 0.3s, opacity 0.3s;
  }

  .modal.open {
    visibility: visible;
    opacity: 1;
  }
}
```

## トラブルシューティング

### アニメーションが動作しない

```css
/* ❌ 動かない */
.element {
  display: none;
  transition: display 0.3s; /* allow-discreteがない */
}

/* ✅ 正しい */
.element {
  display: none;
  transition: display 0.3s allow-discrete;
}
```

### @starting-styleが必要なケース

```css
/* ページロード時のアニメーション */
.hero {
  opacity: 1;
  transition: opacity 1s;
}

/* これがないと初期状態からのトランジションが発生しない */
@starting-style {
  .hero {
    opacity: 0;
  }
}
```

## まとめ

CSS transition-behaviorを使うと、以下が可能になります。

### 主な利点

1. **displayのアニメーション化** - モーダル、ドロップダウンが自然に
2. **content-visibilityの制御** - パフォーマンス最適化とUXの両立
3. **JavaScriptの削減** - CSSだけで複雑なアニメーションを実現
4. **保守性の向上** - アニメーションロジックがスタイルシートに集約

### ベストプラクティス

```css
/* 推奨パターン */
.component {
  /* 初期状態 */
  display: none;
  opacity: 0;
  transform: translateY(-10px);

  /* トランジション定義 */
  transition:
    display 0.3s allow-discrete,
    opacity 0.3s,
    transform 0.3s;
}

.component.active {
  /* 最終状態 */
  display: block;
  opacity: 1;
  transform: translateY(0);
}

/* 初期レンダリング制御 */
@starting-style {
  .component.active {
    opacity: 0;
    transform: translateY(-10px);
  }
}
```

transition-behaviorは、モダンWebアプリケーションのUI/UX向上に不可欠な機能です。ぜひプロジェクトで活用してみてください。

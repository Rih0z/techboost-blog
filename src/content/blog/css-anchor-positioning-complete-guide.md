---
title: 'CSS Anchor Positioning完全ガイド: position-anchor、anchor()、inset-areaの使い方'
description: 'CSS Anchor Positioning APIの完全ガイド。position-anchor、anchor()関数、inset-area、ポップオーバー、ツールチップ配置の実装方法を基礎から徹底解説'
pubDate: 2025-02-05
tags: ['CSS', 'Anchor Positioning', 'UI', 'Web標準', 'レイアウト', 'プログラミング']
---

# CSS Anchor Positioning完全ガイド: position-anchor、anchor()、inset-areaの使い方

CSS Anchor Positioningは、JavaScriptなしで要素を別の要素に相対的に配置できる新しいCSS機能です。本記事では、基本概念から実践的な実装パターンまで、体系的に解説します。

## CSS Anchor Positioningとは

### 従来の課題

従来、ツールチップやポップオーバーなどの浮動要素を配置するには、以下のような課題がありました。

```javascript
// 従来の実装（JavaScript必須）
function positionTooltip(anchor, tooltip) {
    const rect = anchor.getBoundingClientRect();
    tooltip.style.left = `${rect.left}px`;
    tooltip.style.top = `${rect.bottom + 8}px`;

    // スクロール、リサイズ時に再計算が必要
    window.addEventListener('scroll', () => updatePosition());
    window.addEventListener('resize', () => updatePosition());
}
```

### Anchor Positioningの利点

- **JavaScriptレス**: CSSのみで実装可能
- **自動更新**: スクロールやリサイズに自動対応
- **パフォーマンス**: ブラウザがネイティブに最適化
- **シンプル**: コードが簡潔で保守しやすい
- **宣言的**: UIの意図が明確

## ブラウザサポート

```css
/* 機能検出 */
@supports (anchor-name: --myanchor) {
    /* Anchor Positioning対応 */
}

@supports not (anchor-name: --myanchor) {
    /* フォールバック */
}
```

現在の対応状況（2025年2月時点）:
- Chrome 125+: フル対応
- Edge 125+: フル対応
- Safari: 実験的サポート（フラグ有効化が必要）
- Firefox: 開発中

## 基本的な使い方

### 最小限の実装

```html
<button id="anchor-btn">Hover me</button>
<div id="tooltip">Tooltip content</div>
```

```css
/* アンカー名の定義 */
#anchor-btn {
    anchor-name: --my-button;
}

/* アンカーに配置 */
#tooltip {
    position: absolute;
    position-anchor: --my-button;

    /* アンカーの下に配置 */
    top: anchor(bottom);
    left: anchor(left);

    /* スタイリング */
    background: #333;
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    white-space: nowrap;
}
```

### anchor()関数の使い方

```css
/* anchor()関数の基本構文 */
property: anchor(<anchor-name>? <anchor-side>, <fallback>?);

/* 例 */
.tooltip {
    /* アンカーの下端を基準 */
    top: anchor(bottom);

    /* アンカーの右端を基準 */
    left: anchor(right);

    /* フォールバック値付き */
    top: anchor(bottom, 0px);

    /* 複数アンカーから選択 */
    top: anchor(--button1 bottom);

    /* calc()と組み合わせ */
    top: calc(anchor(bottom) + 8px);

    /* センタリング */
    left: anchor(center);
}
```

### 利用可能なアンカー位置

```css
/* 水平方向 */
left: anchor(left);     /* 左端 */
left: anchor(center);   /* 中央 */
left: anchor(right);    /* 右端 */

/* 垂直方向 */
top: anchor(top);       /* 上端 */
top: anchor(center);    /* 中央 */
top: anchor(bottom);    /* 下端 */

/* パーセント指定 */
top: anchor(50%);       /* 50%の位置 */
left: anchor(25%);      /* 25%の位置 */
```

## inset-area: 簡単な配置指定

### 基本構文

```css
/* inset-areaで簡単に配置 */
.tooltip {
    position: absolute;
    position-anchor: --my-button;

    /* 上部中央 */
    inset-area: top;

    /* 下部中央 */
    inset-area: bottom;

    /* 右側中央 */
    inset-area: right;

    /* 左上 */
    inset-area: top left;

    /* 右下 */
    inset-area: bottom right;
}
```

### 詳細な位置指定

```css
/* 9つのエリア */
.tooltip {
    /* グリッド形式で指定 */
    inset-area: top left;
    inset-area: top center;
    inset-area: top right;

    inset-area: center left;
    inset-area: center;        /* アンカーの中央 */
    inset-area: center right;

    inset-area: bottom left;
    inset-area: bottom center;
    inset-area: bottom right;
}

/* スパン指定 */
.tooltip {
    /* 上部全体 */
    inset-area: top span-all;

    /* 左側全体 */
    inset-area: span-all left;
}
```

## 実践的な実装パターン

### ツールチップ（4方向対応）

```html
<button class="btn" data-anchor="btn1">Top</button>
<button class="btn" data-anchor="btn2">Right</button>
<button class="btn" data-anchor="btn3">Bottom</button>
<button class="btn" data-anchor="btn4">Left</button>

<div class="tooltip" data-position="top">Tooltip</div>
```

```css
.btn {
    anchor-name: var(--anchor-name);
}

.tooltip {
    position: absolute;
    position-anchor: var(--anchor-name);

    background: #1a1a1a;
    color: white;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 14px;
    white-space: nowrap;

    /* デフォルトは下 */
    inset-area: bottom;
    margin-top: 8px;

    /* 矢印 */
    &::before {
        content: '';
        position: absolute;
        width: 0;
        height: 0;
        border: 6px solid transparent;
    }
}

/* 上配置 */
.tooltip[data-position="top"] {
    inset-area: top;
    margin-top: 0;
    margin-bottom: 8px;

    &::before {
        bottom: -12px;
        left: 50%;
        transform: translateX(-50%);
        border-top-color: #1a1a1a;
    }
}

/* 右配置 */
.tooltip[data-position="right"] {
    inset-area: right;
    margin-top: 0;
    margin-left: 8px;

    &::before {
        left: -12px;
        top: 50%;
        transform: translateY(-50%);
        border-right-color: #1a1a1a;
    }
}

/* 下配置 */
.tooltip[data-position="bottom"] {
    inset-area: bottom;

    &::before {
        top: -12px;
        left: 50%;
        transform: translateX(-50%);
        border-bottom-color: #1a1a1a;
    }
}

/* 左配置 */
.tooltip[data-position="left"] {
    inset-area: left;
    margin-top: 0;
    margin-right: 8px;

    &::before {
        right: -12px;
        top: 50%;
        transform: translateY(-50%);
        border-left-color: #1a1a1a;
    }
}

/* ホバー時に表示 */
.btn:hover + .tooltip,
.btn:focus + .tooltip {
    opacity: 1;
    visibility: visible;
}
```

### ドロップダウンメニュー

```html
<button id="menu-btn">Menu</button>
<ul class="dropdown-menu">
    <li><a href="#">Profile</a></li>
    <li><a href="#">Settings</a></li>
    <li><a href="#">Logout</a></li>
</ul>
```

```css
#menu-btn {
    anchor-name: --menu-anchor;
}

.dropdown-menu {
    position: absolute;
    position-anchor: --menu-anchor;

    /* ボタンの下、左揃え */
    inset-area: bottom;
    justify-self: start;
    margin-top: 4px;

    /* スタイル */
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    list-style: none;
    padding: 8px 0;
    min-width: 200px;

    /* 初期状態は非表示 */
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s, visibility 0.2s;
}

/* メニューアイテム */
.dropdown-menu li a {
    display: block;
    padding: 10px 16px;
    color: #333;
    text-decoration: none;

    &:hover {
        background: #f5f5f5;
    }
}

/* アクティブ時に表示 */
#menu-btn:focus + .dropdown-menu,
#menu-btn:focus-within + .dropdown-menu,
.dropdown-menu:hover {
    opacity: 1;
    visibility: visible;
}
```

### ポップオーバー（Popover API統合）

```html
<button popovertarget="info-popover" id="info-btn">
    More info
</button>

<div popover id="info-popover" class="popover">
    <h3>Information</h3>
    <p>This is a popover with anchor positioning.</p>
</div>
```

```css
#info-btn {
    anchor-name: --info-anchor;
}

.popover {
    position-anchor: --info-anchor;

    /* ボタンの右側に配置 */
    inset-area: right;
    margin-left: 12px;

    /* スタイル */
    background: white;
    border: 1px solid #ddd;
    border-radius: 12px;
    padding: 20px;
    max-width: 300px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);

    /* Popover APIのデフォルトスタイルをリセット */
    margin: 0;
}

/* 画面端での自動調整 */
@supports (position-try-fallbacks: --fallback) {
    .popover {
        position-try-fallbacks: --right, --left, --bottom, --top;
    }

    @position-try --right {
        inset-area: right;
        margin-left: 12px;
    }

    @position-try --left {
        inset-area: left;
        margin-right: 12px;
    }

    @position-try --bottom {
        inset-area: bottom;
        margin-top: 12px;
    }

    @position-try --top {
        inset-area: top;
        margin-bottom: 12px;
    }
}
```

## 自動フォールバック（position-try）

```css
/* 画面端で自動的に配置を変更 */
.tooltip {
    position-anchor: --my-anchor;

    /* デフォルト配置 */
    inset-area: top;

    /* フォールバック順序を定義 */
    position-try-fallbacks:
        --top,
        --right,
        --bottom,
        --left;
}

/* 各フォールバック位置を定義 */
@position-try --top {
    inset-area: top;
    margin-bottom: 8px;
}

@position-try --right {
    inset-area: right;
    margin-left: 8px;
}

@position-try --bottom {
    inset-area: bottom;
    margin-top: 8px;
}

@position-try --left {
    inset-area: left;
    margin-right: 8px;
}
```

## スクロール対応

```css
/* アンカーに固定（スクロール時も追従） */
.floating-label {
    position: absolute;
    position-anchor: --input-anchor;

    inset-area: right;

    /* スクロールコンテナを指定 */
    position-visibility: anchors-visible;

    /* アンカーが見えない時は非表示 */
    &:not(:is(:state(anchor-visible))) {
        opacity: 0;
    }
}
```

## アニメーション

```css
.tooltip {
    position: absolute;
    position-anchor: --button;
    inset-area: top;

    /* 初期状態 */
    opacity: 0;
    transform: translateY(4px);

    /* トランジション */
    transition: opacity 0.2s, transform 0.2s;
}

/* アクティブ状態 */
.button:hover + .tooltip {
    opacity: 1;
    transform: translateY(0);
}

/* スケールアニメーション */
@keyframes tooltipIn {
    from {
        opacity: 0;
        transform: scale(0.95);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

.tooltip[data-state="open"] {
    animation: tooltipIn 0.15s ease-out;
}
```

## フォールバック（非対応ブラウザ）

```css
/* フォールバック実装 */
.tooltip {
    /* デフォルト位置（非対応ブラウザ用） */
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 8px;
}

/* Anchor Positioning対応時 */
@supports (anchor-name: --test) {
    .tooltip {
        position-anchor: --button;
        inset-area: top;
        top: unset;
        left: unset;
        transform: none;
        margin-top: 0;
        margin-bottom: 8px;
    }
}
```

## まとめ

CSS Anchor Positioningの基本から実践的な実装パターンまで解説しました。

### キーポイント

- **anchor-name**: アンカー要素に名前を付ける
- **position-anchor**: 配置先のアンカーを指定
- **anchor()**: アンカーの位置を参照
- **inset-area**: 簡単な配置指定
- **position-try**: 自動フォールバック

### ユースケース

1. **ツールチップ**: ホバー時の情報表示
2. **ドロップダウンメニュー**: ナビゲーション
3. **ポップオーバー**: 詳細情報の表示
4. **コンテキストメニュー**: 右クリックメニュー
5. **フローティングラベル**: フォーム入力のヒント

### ベストプラクティス

1. **フォールバック**: 非対応ブラウザへの対応
2. **アクセシビリティ**: キーボード操作とスクリーンリーダー対応
3. **パフォーマンス**: CSSのみで実装し、JavaScriptを最小化
4. **レスポンシブ**: position-tryで画面端への対応
5. **アニメーション**: スムーズなトランジション

CSS Anchor Positioningで、JavaScriptレスな洗練されたUIを構築しましょう。

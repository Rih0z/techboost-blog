---
title: "CSS :has() セレクター活用ガイド - 親要素セレクションの革命"
description: "CSS :has() 疑似クラスを使った親要素の選択方法と実践的な活用例を紹介。JavaScriptなしで実現できる高度なスタイリングテクニックを解説します。"
pubDate: "2025-02-05"
tags: ["css", "frontend", "web-development"]
---

CSS の `:has()` 疑似クラスは、長年待ち望まれていた「親要素セレクター」を実現する画期的な機能です。これまでJavaScriptでしか実現できなかった複雑なスタイリングが、純粋なCSSだけで可能になりました。

## :has() とは何か

`:has()` は関係疑似クラスとして提案され、2023年以降主要ブラウザでサポートが始まりました。指定した条件に一致する子要素や子孫要素を持つ要素を選択できます。

### 基本構文

```css
/* 特定の子要素を持つ親を選択 */
.parent:has(.child) {
  /* スタイル */
}

/* 複数の条件 */
.container:has(img, video) {
  /* 画像または動画を含むコンテナ */
}
```

## ブラウザサポート状況

2024年現在、主要ブラウザでの対応状況:

- Chrome: 105+ (2022年8月〜)
- Safari: 15.4+ (2022年3月〜)
- Firefox: 121+ (2023年12月〜)
- Edge: 105+ (2022年9月〜)

フォールバック戦略として、`@supports` を使用できます:

```css
@supports selector(:has(*)) {
  /* :has() をサポートするブラウザのみ適用 */
  .card:has(img) {
    display: grid;
  }
}
```

## 実践的な使用例

### 1. フォームバリデーション

エラーメッセージを含むフォームグループをハイライト:

```css
.form-group:has(.error-message) {
  border-color: #ef4444;
  background-color: #fef2f2;
}

.form-group:has(input:invalid) {
  border-color: #f59e0b;
}

.form-group:has(input:valid) {
  border-color: #10b981;
}
```

対応するHTML:

```html
<div class="form-group">
  <label for="email">メールアドレス</label>
  <input type="email" id="email" required>
  <span class="error-message">無効なメールアドレスです</span>
</div>
```

### 2. カードコンポーネント

画像の有無でレイアウトを変更:

```css
.card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card:has(img) {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 1.5rem;
}

.card:has(img) .card-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
```

### 3. ナビゲーションメニュー

アクティブなリンクを含むメニュー項目を強調:

```css
.nav-item:has(.active) {
  background-color: #eff6ff;
  border-left: 3px solid #3b82f6;
}

.nav-item:has(.active) .icon {
  color: #3b82f6;
}
```

### 4. テーブルのゼブラストライピング

特定の条件を満たす行のみストライプ:

```css
/* チェックされた行のみストライプ */
tr:has(input[type="checkbox"]:checked) {
  background-color: #dbeafe;
}

/* エラーを含む行を赤くハイライト */
tr:has(.status-error) {
  background-color: #fee2e2;
}
```

### 5. 空コンテナの処理

子要素がない場合のフォールバック表示:

```css
.gallery:not(:has(img)) {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.gallery:not(:has(img))::after {
  content: "画像がありません";
  color: #9ca3af;
  font-size: 0.875rem;
}
```

## 高度なテクニック

### 兄弟要素の選択

`:has()` と隣接セレクターを組み合わせて、特定の兄弟要素を持つ要素を選択:

```css
/* 次の兄弟に特定の要素を持つ場合 */
h2:has(+ .highlight) {
  margin-bottom: 0.5rem;
}

/* 後続の兄弟要素に基づいて選択 */
.section:has(~ .footer) {
  padding-bottom: 2rem;
}
```

### 数量クエリ

特定の数の子要素を持つ場合のスタイリング:

```css
/* 3つ以上のアイテムを持つリスト */
ul:has(li:nth-child(3)) {
  columns: 2;
  column-gap: 2rem;
}

/* 正確に1つのアイテムのみ */
.grid:has(> *:only-child) {
  display: block;
}
```

### ネストした条件

複数の `:has()` を組み合わせ:

```css
/* 画像を含むリンクを持つカード */
.card:has(a:has(img)) {
  cursor: pointer;
  transition: transform 0.2s;
}

.card:has(a:has(img)):hover {
  transform: scale(1.02);
}
```

## パフォーマンス考慮事項

`:has()` は強力ですが、適切に使用することが重要です:

### 推奨される使い方

```css
/* 良い: スコープを限定 */
.container:has(> .alert) { }

/* 良い: 具体的なセレクター */
.card:has(.card-image) { }
```

### 避けるべき使い方

```css
/* 悪い: 全称セレクターと組み合わせ */
*:has(.something) { }

/* 悪い: 過度に複雑なネスト */
div:has(div:has(div:has(.target))) { }
```

## JavaScriptとの比較

従来のJavaScriptアプローチ:

```javascript
// JavaScript版
document.querySelectorAll('.card').forEach(card => {
  if (card.querySelector('img')) {
    card.classList.add('has-image');
  }
});
```

CSS `:has()` 版:

```css
/* CSS版 - JavaScriptなし */
.card:has(img) {
  /* スタイル */
}
```

利点:
- コードが簡潔
- パフォーマンスが良い（ブラウザ最適化）
- 動的変更に自動対応
- JavaScriptエラーの影響を受けない

## 実用的なコンポーネント例

### アコーディオンメニュー

```css
.accordion-item:has(input[type="checkbox"]:checked) .accordion-content {
  max-height: 500px;
  padding: 1rem;
}

.accordion-item:has(input[type="checkbox"]:checked) .accordion-icon {
  transform: rotate(180deg);
}
```

### モーダルオーバーレイ

```css
body:has(.modal[open]) {
  overflow: hidden;
}

body:has(.modal[open])::before {
  content: "";
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
}
```

### タブインターフェース

```css
.tabs:has(#tab1:checked) .panel-1,
.tabs:has(#tab2:checked) .panel-2,
.tabs:has(#tab3:checked) .panel-3 {
  display: block;
}

.tabs:has(#tab1:checked) label[for="tab1"],
.tabs:has(#tab2:checked) label[for="tab2"],
.tabs:has(#tab3:checked) label[for="tab3"] {
  background-color: white;
  border-bottom-color: transparent;
}
```

## まとめ

`:has()` 疑似クラスは、CSSに革命をもたらす機能です:

1. **親要素の選択**: 長年の課題が解決
2. **JavaScriptレス**: より保守しやすいコード
3. **パフォーマンス**: ブラウザ最適化の恩恵
4. **柔軟性**: 複雑な条件も表現可能

ただし、以下の点に注意:

- ブラウザサポートを確認
- パフォーマンスに配慮した使用
- フォールバックの検討
- 過度に複雑な条件は避ける

`:has()` を活用することで、よりクリーンで保守しやすいCSSコードを書くことができます。従来JavaScriptに頼っていた機能の多くが、純粋なCSSで実現可能になり、フロントエンド開発の新たな可能性が開かれています。

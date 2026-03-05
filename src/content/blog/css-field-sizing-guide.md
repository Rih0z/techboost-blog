---
title: "CSS field-sizing プロパティ完全ガイド - 入力欄を自動リサイズ"
description: "CSS field-sizingプロパティを使ったinput、textarea、selectの自動サイズ調整方法を解説。ブラウザサポート状況とフォールバック方法も紹介します。"
pubDate: "2025-02-06"
tags: ['プログラミング']
---

CSS `field-sizing` プロパティは、フォーム要素を**コンテンツに応じて自動的にリサイズ**できる新しいCSSプロパティです。これまでJavaScriptが必要だった動的なサイズ調整が、CSSだけで実現できるようになります。

本記事では、`field-sizing`の基本から実践的な使い方、ブラウザサポート、フォールバック方法までを詳しく解説します。

## field-sizingとは？

`field-sizing`は、**input、textarea、select要素のサイズをコンテンツに合わせて自動調整**するCSSプロパティです。

### 従来の問題

```html
<!-- 固定幅のinput -->
<input type="text" style="width: 200px;" />

<!-- textareaは固定サイズ -->
<textarea rows="5" cols="30"></textarea>
```

従来は以下の課題がありました:

- 入力内容が見切れる、または余白が多すぎる
- ユーザーが入力する量を事前に予測できない
- JavaScript での動的リサイズが必要

### field-sizingによる解決

```css
input, textarea, select {
  field-sizing: content;
}
```

たった1行のCSSで、フォーム要素が**入力内容に合わせて自動的にサイズ調整**されます。

## 基本的な使い方

### field-sizingの値

`field-sizing`プロパティは2つの値を取ります:

```css
/* デフォルト: 固定サイズ */
field-sizing: fixed;

/* コンテンツに合わせて自動リサイズ */
field-sizing: content;
```

### input要素での使用

```html
<style>
  .auto-input {
    field-sizing: content;
    min-width: 100px;
    max-width: 400px;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
</style>

<input
  type="text"
  class="auto-input"
  placeholder="タイプすると幅が変わります"
/>
```

入力するたびにinputの幅が**自動的に調整**されます。

### textarea要素での使用

```html
<style>
  .auto-textarea {
    field-sizing: content;
    min-height: 80px;
    max-height: 300px;
    width: 100%;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    resize: none; /* 手動リサイズを無効化 */
  }
</style>

<textarea
  class="auto-textarea"
  placeholder="入力すると高さが自動調整されます"
></textarea>
```

テキストを入力すると、**行数に応じて高さが自動調整**されます。

### select要素での使用

```html
<style>
  .auto-select {
    field-sizing: content;
    padding: 8px 32px 8px 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
</style>

<select class="auto-select">
  <option>短い</option>
  <option>これは非常に長いオプションテキストです</option>
  <option>中くらい</option>
</select>
```

選択されたオプションの長さに合わせて、**selectの幅が自動調整**されます。

## 実践的なパターン

### パターン1: 検索ボックス

```html
<style>
  .search-container {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .search-input {
    field-sizing: content;
    min-width: 200px;
    max-width: 500px;
    padding: 10px 16px;
    border: 2px solid #3b82f6;
    border-radius: 24px;
    font-size: 16px;
    transition: all 0.2s;
  }

  .search-input:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .search-button {
    padding: 10px 20px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 24px;
    cursor: pointer;
    font-weight: 600;
  }
</style>

<div class="search-container">
  <input
    type="text"
    class="search-input"
    placeholder="検索..."
  />
  <button class="search-button">検索</button>
</div>
```

### パターン2: コメント欄

```html
<style>
  .comment-box {
    field-sizing: content;
    min-height: 60px;
    max-height: 400px;
    width: 100%;
    padding: 12px 16px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 15px;
    line-height: 1.5;
    resize: none;
    transition: border-color 0.2s;
  }

  .comment-box:focus {
    outline: none;
    border-color: #3b82f6;
  }

  .comment-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 8px;
    color: #6b7280;
    font-size: 14px;
  }
</style>

<div>
  <textarea
    class="comment-box"
    placeholder="コメントを入力..."
  ></textarea>
  <div class="comment-footer">
    <span>改行で自動的に拡張されます</span>
    <button>投稿</button>
  </div>
</div>
```

### パターン3: タグ入力

```html
<style>
  .tag-input-container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
  }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: #3b82f6;
    color: white;
    border-radius: 4px;
    font-size: 14px;
  }

  .tag-input {
    field-sizing: content;
    min-width: 120px;
    max-width: 300px;
    border: none;
    outline: none;
    font-size: 14px;
  }
</style>

<div class="tag-input-container">
  <span class="tag">React</span>
  <span class="tag">TypeScript</span>
  <input
    type="text"
    class="tag-input"
    placeholder="タグを追加..."
  />
</div>
```

### パターン4: インライン編集

```html
<style>
  .editable-title {
    field-sizing: content;
    min-width: 200px;
    max-width: 600px;
    padding: 4px 8px;
    border: 2px solid transparent;
    border-radius: 4px;
    font-size: 24px;
    font-weight: 700;
    transition: border-color 0.2s;
  }

  .editable-title:hover {
    border-color: #e5e7eb;
  }

  .editable-title:focus {
    outline: none;
    border-color: #3b82f6;
    background: #f9fafb;
  }
</style>

<input
  type="text"
  class="editable-title"
  value="タイトルをクリックして編集"
/>
```

## 高度なテクニック

### 最小・最大サイズの制約

```css
.constrained-input {
  field-sizing: content;

  /* 幅の制約 */
  min-width: 100px;
  max-width: 400px;

  /* 高さの制約（textarea） */
  min-height: 60px;
  max-height: 300px;
}
```

### トランジション効果

```css
.smooth-input {
  field-sizing: content;
  transition: all 0.2s ease-out;
}
```

### グリッドレイアウトでの使用

```html
<style>
  .form-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 16px;
    align-items: start;
  }

  .form-label {
    padding-top: 10px;
    font-weight: 600;
  }

  .form-input {
    field-sizing: content;
    min-width: 200px;
    max-width: 500px;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
</style>

<div class="form-grid">
  <label class="form-label">名前:</label>
  <input type="text" class="form-input" />

  <label class="form-label">メール:</label>
  <input type="email" class="form-input" />
</div>
```

### 文字数カウンター付き

```html
<style>
  .textarea-wrapper {
    position: relative;
  }

  .auto-textarea {
    field-sizing: content;
    min-height: 100px;
    max-height: 300px;
    width: 100%;
    padding: 12px;
    padding-bottom: 32px; /* カウンター用の余白 */
    border: 1px solid #ddd;
    border-radius: 8px;
    resize: none;
  }

  .char-count {
    position: absolute;
    bottom: 8px;
    right: 12px;
    font-size: 12px;
    color: #6b7280;
  }
</style>

<div class="textarea-wrapper">
  <textarea
    class="auto-textarea"
    maxlength="500"
    oninput="this.nextElementSibling.textContent = this.value.length + '/500'"
  ></textarea>
  <span class="char-count">0/500</span>
</div>
```

## ブラウザサポート

### サポート状況（2025年2月時点）

| ブラウザ | バージョン | サポート状況 |
|----------|------------|--------------|
| Chrome | 123+ | ✅ サポート |
| Edge | 123+ | ✅ サポート |
| Safari | 17.4+ | ✅ サポート |
| Firefox | 未サポート | ⏳ 開発中 |

### 機能検出

```javascript
if (CSS.supports('field-sizing', 'content')) {
  console.log('field-sizingがサポートされています');
} else {
  console.log('フォールバックが必要です');
}
```

```css
/* CSS での機能検出 */
@supports (field-sizing: content) {
  .auto-input {
    field-sizing: content;
  }
}

@supports not (field-sizing: content) {
  .auto-input {
    width: 300px; /* フォールバック */
  }
}
```

## フォールバック方法

### JavaScript によるポリフィル

```javascript
// 簡易的なフォールバック実装
function setupAutoResize(element) {
  if (CSS.supports('field-sizing', 'content')) {
    element.style.fieldSizing = 'content';
    return;
  }

  // フォールバック: JavaScript で動的リサイズ
  if (element.tagName === 'TEXTAREA') {
    element.addEventListener('input', () => {
      element.style.height = 'auto';
      element.style.height = element.scrollHeight + 'px';
    });
  } else if (element.tagName === 'INPUT') {
    const span = document.createElement('span');
    span.style.visibility = 'hidden';
    span.style.position = 'absolute';
    span.style.whiteSpace = 'pre';
    document.body.appendChild(span);

    element.addEventListener('input', () => {
      span.textContent = element.value || element.placeholder;
      const computedStyle = window.getComputedStyle(element);
      span.style.font = computedStyle.font;
      span.style.padding = computedStyle.padding;
      element.style.width = span.offsetWidth + 'px';
    });
  }
}

// 使用例
document.querySelectorAll('.auto-input, .auto-textarea').forEach(setupAutoResize);
```

### プログレッシブエンハンスメント

```html
<style>
  /* ベーススタイル（全ブラウザ） */
  .input-field {
    width: 300px;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  /* field-sizing サポート時 */
  @supports (field-sizing: content) {
    .input-field {
      field-sizing: content;
      min-width: 100px;
      max-width: 500px;
      width: auto;
    }
  }
</style>

<input type="text" class="input-field" />
```

## パフォーマンスの考慮事項

### 推奨事項

```css
/* ✅ 良い例: 制約を設定 */
.good-input {
  field-sizing: content;
  min-width: 100px;
  max-width: 500px;
}

/* ❌ 悪い例: 制約なし */
.bad-input {
  field-sizing: content;
  /* ページレイアウトが不安定になる可能性 */
}
```

### リフロー最適化

```css
/* contain プロパティでリフローを最適化 */
.optimized-input {
  field-sizing: content;
  contain: layout; /* レイアウトの影響範囲を制限 */
}
```

## まとめ

`field-sizing: content`は、フォーム要素の**自動リサイズを実現する革新的なCSSプロパティ**です。

### 主な利点

- **JavaScriptが不要**: CSSだけで動的リサイズを実現
- **UX向上**: 入力内容が常に見える
- **シンプルな実装**: たった1行のCSS
- **パフォーマンス**: ブラウザネイティブの最適化

### 使用時の注意点

- `min-width`/`max-width`で制約を設定
- ブラウザサポートを確認
- フォールバックを用意
- リフローのパフォーマンスに注意

### 今後の展望

`field-sizing`は、現代的なフォームUIの標準となる可能性を秘めています。ブラウザサポートの拡大に伴い、より多くのプロジェクトで採用されるでしょう。

まだ実験的な機能ですが、プログレッシブエンハンスメントの手法を用いることで、今すぐ導入することが可能です。

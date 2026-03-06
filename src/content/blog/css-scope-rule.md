---
title: "CSS @scopeルールで実現するスコープ付きスタイル完全ガイド"
description: "CSS @scopeルールを使って、スタイルのカプセル化とスコープ管理を実現する方法を、実践的なコード例とともに詳しく解説します。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。初心者から実務レベルまで段階的に学べる内容です。"
pubDate: "2025-02-05"
tags: ['CSS', 'フロントエンド']
---
# CSS @scopeルールで実現するスコープ付きスタイル完全ガイド

CSSのスコープ管理は、長年の課題でした。BEMやCSS Modules、CSS-in-JSなど、様々な手法が考案されてきましたが、CSS標準仕様として`@scope`ルールが導入されることで、ネイティブなスコープ管理が可能になります。

## @scopeルールとは

`@scope`は、CSSスタイルの適用範囲を明示的に制限できる新しいアットルールです。特定のDOM要素の範囲内でのみスタイルを適用することで、スタイルの衝突を防ぎ、より保守性の高いCSSを書くことができます。

### 主な特徴

- **明示的なスコープ**: スタイルの適用範囲を明確に定義
- **境界の設定**: 上限（root）と下限（limit）を指定可能
- **詳細度の制御**: スコープ内のスタイルは自然に優先される
- **ネイティブサポート**: ビルドツール不要で動作

## 基本的な構文

最もシンプルな`@scope`の使用例から始めましょう。

```css
@scope (.card) {
  h2 {
    color: blue;
    font-size: 1.5rem;
  }

  p {
    line-height: 1.6;
  }

  button {
    background: blue;
    color: white;
  }
}
```

このコードは、`.card`クラスを持つ要素内のみで`h2`、`p`、`button`にスタイルを適用します。

```html
<div class="card">
  <h2>カード内の見出し</h2> <!-- 青色になる -->
  <p>カード内のテキスト</p>
  <button>ボタン</button> <!-- 青背景になる -->
</div>

<h2>カード外の見出し</h2> <!-- スタイルは適用されない -->
<button>外部ボタン</button> <!-- スタイルは適用されない -->
```

## スコープルート（Scope Root）

`@scope`の第一引数がスコープルートです。この要素の子孫にのみスタイルが適用されます。

```css
/* 特定のIDをスコープルートに */
@scope (#main-content) {
  article {
    max-width: 800px;
    margin: 0 auto;
  }
}

/* 複数のセレクタも可能 */
@scope (.card, .panel, .widget) {
  header {
    border-bottom: 2px solid #ccc;
  }
}

/* 属性セレクタも使用可能 */
@scope ([data-theme="dark"]) {
  body {
    background: #1a1a1a;
    color: #ffffff;
  }
}
```

## スコープリミット（Scope Limit）

`@scope`の第二引数として、スコープの下限を設定できます。この境界内の要素には、スタイルが適用されません。

```css
@scope (.article) to (.nested-article) {
  /* .article内だが、.nested-article内は除外 */
  h1 {
    font-size: 2rem;
    color: navy;
  }

  p {
    margin: 1em 0;
  }
}
```

HTMLでの動作例:

```html
<article class="article">
  <h1>メイン記事の見出し</h1> <!-- スタイル適用 -->
  <p>メイン記事の本文</p> <!-- スタイル適用 -->

  <article class="nested-article">
    <h1>入れ子記事の見出し</h1> <!-- スタイル適用されない -->
    <p>入れ子記事の本文</p> <!-- スタイル適用されない -->
  </article>

  <p>メイン記事の続き</p> <!-- スタイル適用 -->
</article>
```

## 実践例1: カードコンポーネント

カードコンポーネントのスタイルをスコープ化してみましょう。

```css
@scope (.card) {
  /* カード全体 */
  :scope {
    display: flex;
    flex-direction: column;
    border: 1px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  /* カードヘッダー */
  .header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 1rem;
  }

  .header h3 {
    margin: 0;
    font-size: 1.25rem;
  }

  /* カードボディ */
  .body {
    padding: 1rem;
    flex: 1;
  }

  .body p {
    margin: 0.5em 0;
    color: #333;
  }

  /* カードフッター */
  .footer {
    background: #f5f5f5;
    padding: 0.75rem 1rem;
    border-top: 1px solid #ddd;
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  .footer button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .footer .primary {
    background: #667eea;
    color: white;
  }

  .footer .secondary {
    background: transparent;
    color: #667eea;
    border: 1px solid #667eea;
  }
}
```

このスタイルを使用するHTML:

```html
<div class="card">
  <div class="header">
    <h3>カードタイトル</h3>
  </div>
  <div class="body">
    <p>カードの本文コンテンツがここに入ります。</p>
    <p>複数の段落も問題なく表示されます。</p>
  </div>
  <div class="footer">
    <button class="secondary">キャンセル</button>
    <button class="primary">確定</button>
  </div>
</div>
```

## 実践例2: テーマシステム

異なるテーマで同じコンポーネントのスタイルを変える例です。

```css
/* ライトテーマ */
@scope ([data-theme="light"]) {
  .dashboard {
    background: #ffffff;
    color: #1a1a1a;
  }

  .sidebar {
    background: #f5f5f5;
    border-right: 1px solid #ddd;
  }

  .button {
    background: #007bff;
    color: white;
  }

  .button:hover {
    background: #0056b3;
  }

  .input {
    background: white;
    border: 1px solid #ccc;
    color: #1a1a1a;
  }
}

/* ダークテーマ */
@scope ([data-theme="dark"]) {
  .dashboard {
    background: #1a1a1a;
    color: #ffffff;
  }

  .sidebar {
    background: #2a2a2a;
    border-right: 1px solid #444;
  }

  .button {
    background: #0d6efd;
    color: white;
  }

  .button:hover {
    background: #0a58ca;
  }

  .input {
    background: #2a2a2a;
    border: 1px solid #444;
    color: #ffffff;
  }
}

/* ハイコントラストテーマ */
@scope ([data-theme="high-contrast"]) {
  .dashboard {
    background: #000000;
    color: #ffffff;
  }

  .sidebar {
    background: #000000;
    border-right: 3px solid #ffffff;
  }

  .button {
    background: #ffffff;
    color: #000000;
    border: 2px solid #ffffff;
  }

  .button:hover {
    background: #000000;
    color: #ffffff;
  }

  .input {
    background: #000000;
    border: 2px solid #ffffff;
    color: #ffffff;
  }
}
```

JavaScriptでテーマを切り替え:

```javascript
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

// 初期化
const savedTheme = localStorage.getItem('theme') || 'light';
setTheme(savedTheme);

// テーマスイッチャー
document.getElementById('theme-switcher').addEventListener('change', (e) => {
  setTheme(e.target.value);
});
```

## 実践例3: ネストされたコンポーネント

親コンポーネントと子コンポーネントでスタイルを分離する例です。

```css
/* 親コンポーネント（フォーム全体） */
@scope (.form-container) to (.nested-form) {
  :scope {
    max-width: 600px;
    margin: 2rem auto;
    padding: 2rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }

  h2 {
    margin-top: 0;
    color: #333;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #555;
  }

  input, textarea, select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }

  button[type="submit"] {
    width: 100%;
    padding: 1rem;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
  }
}

/* 子コンポーネント（入れ子のフォーム） */
@scope (.nested-form) {
  :scope {
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 4px;
    margin: 1rem 0;
  }

  h3 {
    margin-top: 0;
    font-size: 1rem;
    color: #666;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  input {
    background: white;
    font-size: 0.875rem;
  }

  button {
    padding: 0.5rem 1rem;
    background: #6c757d;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.875rem;
  }
}
```

HTMLでの使用例:

```html
<div class="form-container">
  <h2>メインフォーム</h2>

  <div class="form-group">
    <label>名前</label>
    <input type="text" placeholder="山田太郎">
  </div>

  <div class="form-group">
    <label>メールアドレス</label>
    <input type="email" placeholder="email@example.com">
  </div>

  <!-- ネストされたフォーム -->
  <div class="nested-form">
    <h3>追加情報（任意）</h3>

    <div class="form-group">
      <label>電話番号</label>
      <input type="tel">
    </div>

    <div class="form-group">
      <label>住所</label>
      <input type="text">
    </div>
  </div>

  <button type="submit">送信</button>
</div>
```

## :scopeセレクタ

`@scope`ブロック内で`:scope`セレクタを使用すると、スコープルート自体を参照できます。

```css
@scope (.widget) {
  /* スコープルート自体 */
  :scope {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    padding: 1rem;
    background: white;
    border: 1px solid #ddd;
  }

  /* スコープルート直下の子要素 */
  :scope > .item {
    padding: 1rem;
    background: #f5f5f5;
  }

  /* 特定の状態のスコープルート */
  :scope:hover {
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }

  :scope.active {
    border-color: #007bff;
  }
}
```

## 詳細度（Specificity）の扱い

`@scope`内のセレクタは、スコープの文脈を持つため、自然に優先されます。

```css
/* グローバルスタイル */
button {
  background: gray;
  color: white;
}

/* スコープ付きスタイル */
@scope (.special-section) {
  button {
    background: blue; /* こちらが優先される */
  }
}
```

ただし、明示的な詳細度は通常通り機能します:

```css
@scope (.container) {
  button {
    background: blue;
  }

  .primary-button {
    background: green; /* より高い詳細度 */
  }

  #special {
    background: red; /* さらに高い詳細度 */
  }
}
```

## メディアクエリとの組み合わせ

`@scope`は`@media`クエリと組み合わせて使用できます。

```css
@scope (.responsive-grid) {
  :scope {
    display: grid;
    gap: 1rem;
  }

  @media (max-width: 768px) {
    :scope {
      grid-template-columns: 1fr;
    }

    .item {
      padding: 0.5rem;
    }
  }

  @media (min-width: 769px) {
    :scope {
      grid-template-columns: repeat(3, 1fr);
    }

    .item {
      padding: 1rem;
    }
  }

  @media (min-width: 1200px) {
    :scope {
      grid-template-columns: repeat(4, 1fr);
    }
  }
}
```

または、`@scope`を`@media`内にネストすることも可能:

```css
@media (prefers-color-scheme: dark) {
  @scope (.card) {
    :scope {
      background: #1a1a1a;
      color: white;
    }

    .header {
      background: #2a2a2a;
    }
  }
}
```

## コンテナクエリとの組み合わせ

CSS Container Queriesとも組み合わせられます。

```css
@scope (.product-card) {
  :scope {
    container-type: inline-size;
    container-name: card;
  }

  .image {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
  }

  .title {
    font-size: 1rem;
  }

  .description {
    font-size: 0.875rem;
  }

  @container card (min-width: 400px) {
    :scope {
      display: grid;
      grid-template-columns: 200px 1fr;
    }

    .image {
      width: 200px;
    }

    .title {
      font-size: 1.5rem;
    }

    .description {
      font-size: 1rem;
    }
  }
}
```

## ブラウザサポートと代替案

`@scope`は比較的新しい機能のため、ブラウザサポートを確認する必要があります。

### フィーチャー検出

```css
@supports (selector(:scope)) {
  @scope (.modern-component) {
    /* @scopeをサポートするブラウザ用 */
    .title {
      color: blue;
    }
  }
}

@supports not (selector(:scope)) {
  /* フォールバック */
  .modern-component .title {
    color: blue;
  }
}
```

### PostCSSプラグインでのポリフィル

`postcss-scope`プラグインを使用すると、ビルド時に`@scope`を変換できます。

```javascript
// postcss.config.js
module.exports = {
  plugins: [
    require('postcss-scope')(),
    require('autoprefixer')
  ]
};
```

## まとめ

CSS `@scope`ルールは、スタイルのカプセル化とスコープ管理に革新をもたらします。BEMやCSS Modulesのような命名規則に頼らず、ネイティブCSSでスタイルの適用範囲を制御できるため、よりシンプルで保守性の高いコードを書くことができます。

コンポーネントベースの開発において、`@scope`は強力なツールとなるでしょう。既存のプロジェクトへの段階的な導入も可能なので、ぜひ試してみてください。

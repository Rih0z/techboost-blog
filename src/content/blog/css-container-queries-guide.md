---
title: 'CSS Container Queries完全ガイド：モダンCSSレスポンシブデザインの新標準'
description: 'CSS Container Queriesの基本から応用まで徹底解説。@container・コンテナサイズ・スタイルクエリ・CSS Nesting・:has()・CSS Layers・CSS Cascade Layersまで実践的に学ぶ'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-2.jpg'
tags: ['CSS', 'Frontend', 'レスポンシブ']
---

CSS Container Queriesは、Webレイアウト設計における長年の課題を解決する画期的な機能です。従来のメディアクエリが「ビューポートのサイズ」に基づいてスタイルを切り替えていたのに対し、Container Queriesは「親コンテナのサイズ」に応じてコンポーネントのスタイルを動的に変更できます。この記事では、Container Queriesの基礎から応用まで、モダンCSSの最新機能とあわせて徹底的に解説します。

---

## 1. Container Queriesとは何か

### 従来のメディアクエリが抱えていた問題

Webデザインにおいて「レスポンシブデザイン」は長年の標準的なアプローチです。`@media` クエリを使い、画面幅に応じてレイアウトを切り替える手法は現在も広く使われています。しかし、コンポーネントベースの開発が主流となった現代において、メディアクエリには根本的な限界があります。

例えば、カードコンポーネントを考えてみましょう。このカードは、メインコンテンツエリアに配置されることもあれば、サイドバーに配置されることもあります。同じカードコンポーネントでも、配置される場所によって異なるレイアウトが必要です。

```css
/* 従来のアプローチ：ビューポート幅でしか制御できない */
@media (min-width: 768px) {
  .card {
    display: flex;
    flex-direction: row;
  }
}
```

この方法の問題点は、カードが768px以上のビューポートで表示されていても、狭いサイドバー内に配置されている場合は縦並びにしたいというケースに対応できないことです。ビューポート幅はわかっても、コンポーネントを含む親要素の幅はわからないのです。

### Container Queriesが解決すること

Container Queriesを使うと、コンポーネントは自分を包む親コンテナのサイズを参照してスタイルを変えられます。

```css
/* Container Queriesのアプローチ：親コンテナの幅で制御できる */
.card-wrapper {
  container-type: inline-size;
}

@container (min-width: 600px) {
  .card {
    display: flex;
    flex-direction: row;
  }
}
```

このように記述すると、カードは「ビューポートが何ピクセルか」ではなく「自分の親要素が何ピクセルか」を基準にレイアウトを変えます。これにより、同じカードコンポーネントがメインエリアに置かれれば横並びに、サイドバーに置かれれば縦並びになるという振る舞いが、1つのコンポーネント定義で実現できます。

### メディアクエリとの本質的な違い

| 特性 | メディアクエリ (`@media`) | コンテナクエリ (`@container`) |
|------|--------------------------|------------------------------|
| 参照対象 | ビューポートのサイズ | 親コンテナのサイズ |
| スコープ | グローバル | コンポーネントローカル |
| 再利用性 | 低い（配置場所依存） | 高い（場所を選ばない） |
| コンポーネント設計 | 難しい | 自然にできる |
| ブラウザサポート | 全主要ブラウザ | Chrome 105+、Firefox 110+、Safari 16+ |

---

## 2. @containerの基本構文と使い方

### 最小限の構文

Container Queriesを使うには、まず「コンテナ」を定義する必要があります。

```css
/* ステップ1：親要素をコンテナとして宣言する */
.wrapper {
  container-type: inline-size;
}

/* ステップ2：コンテナのサイズに基づいてスタイルを記述する */
@container (min-width: 500px) {
  .card {
    background-color: lightblue;
    padding: 2rem;
  }
}
```

`container-type: inline-size` を指定した要素が「コンテナ」になり、その子孫要素は `@container` クエリで参照できます。

### @containerの構文詳細

`@container` ルールの構文は以下の通りです。

```css
@container <container-name>? <container-query> {
  /* スタイルルール */
}
```

コンテナ名（`<container-name>`）は省略可能で、省略した場合は最も近い祖先コンテナが使われます。

```css
/* コンテナ名なし：最も近い祖先コンテナを参照 */
@container (min-width: 400px) {
  .item { color: red; }
}

/* コンテナ名あり：特定のコンテナを参照 */
@container sidebar (min-width: 300px) {
  .item { color: blue; }
}
```

### 複数の条件を組み合わせる

`and`、`or`、`not` を使って複数の条件を組み合わせられます。

```css
/* andで両方の条件を満たす場合 */
@container (min-width: 400px) and (max-width: 800px) {
  .card {
    grid-template-columns: 1fr 1fr;
  }
}

/* orでどちらかの条件を満たす場合 */
@container (max-width: 300px) or (min-width: 700px) {
  .card {
    display: block;
  }
}

/* notで条件を否定する場合 */
@container not (min-width: 500px) {
  .card {
    flex-direction: column;
  }
}
```

### ネストしたコンテナクエリ

コンテナクエリはネストできます。

```css
@container sidebar (min-width: 300px) {
  .card {
    display: flex;
  }

  @container card (min-width: 200px) {
    .card-image {
      width: 40%;
    }
  }
}
```

---

## 3. container-typeとcontainer-name

### container-typeの値

`container-type` プロパティには3つの値があります。

```css
/* inline-size：インライン方向（通常は幅）をクエリできる */
.container-inline {
  container-type: inline-size;
}

/* size：インライン方向とブロック方向（高さ）の両方をクエリできる */
.container-size {
  container-type: size;
}

/* normal：コンテナではない（スタイルクエリのみ使用可能） */
.container-normal {
  container-type: normal;
}
```

実務では `inline-size` が最もよく使われます。`size` を指定した場合、要素は高さを内部コンテンツから算出できなくなるため（intrinsic height が失われる）、明示的な高さの指定が必要になる場合があります。

### container-nameの使い方

`container-name` を使うと、特定のコンテナを名前で参照できます。

```css
/* 名前付きコンテナの定義 */
.sidebar {
  container-type: inline-size;
  container-name: sidebar;
}

.main-content {
  container-type: inline-size;
  container-name: main;
}

/* 名前でコンテナを参照 */
@container sidebar (min-width: 200px) {
  .widget {
    font-size: 0.9rem;
  }
}

@container main (min-width: 600px) {
  .widget {
    font-size: 1.1rem;
  }
}
```

名前なしの `@container` クエリは、DOM上で最も近い祖先コンテナを参照します。名前付きクエリは、DOM構造に関わらず指定した名前のコンテナを参照します。

### containerショートハンド

`container` ショートハンドプロパティで `container-name` と `container-type` をまとめて指定できます。

```css
/* container: <name> / <type> */
.sidebar {
  container: sidebar / inline-size;
}

.main {
  container: main / size;
}

/* 名前なしの場合 */
.wrapper {
  container: / inline-size;
  /* または */
  container-type: inline-size;
}
```

---

## 4. コンテナサイズクエリ（width・height・inline-size）

### 使用可能なクエリ条件

コンテナサイズクエリでは、以下の値を参照できます。

```css
/* width：コンテナの幅（論理プロパティではない物理的な幅） */
@container (width > 400px) { }
@container (min-width: 400px) { }  /* 同義 */

/* height：コンテナの高さ（container-type: size が必要） */
@container (height > 300px) { }

/* inline-size：インライン方向のサイズ（通常はwidth） */
@container (inline-size > 400px) { }

/* block-size：ブロック方向のサイズ（通常はheight） */
@container (block-size > 300px) { }

/* aspect-ratio：アスペクト比 */
@container (aspect-ratio > 1/1) { }  /* 横長 */
@container (aspect-ratio < 1/1) { }  /* 縦長 */

/* orientation：向き */
@container (orientation: landscape) { }
@container (orientation: portrait) { }
```

### 新しいRange構文

CSS Media Queries Level 4 で導入された Range 構文（比較演算子）は Container Queries でも使えます。

```css
/* 従来の min/max 構文 */
@container (min-width: 400px) and (max-width: 800px) {
  .card { grid-template-columns: 1fr 2fr; }
}

/* 新しいRange構文（より読みやすい） */
@container (400px <= width <= 800px) {
  .card { grid-template-columns: 1fr 2fr; }
}

/* 比較演算子の例 */
@container (width > 600px) {
  .card { font-size: 1.25rem; }
}

@container (width < 400px) {
  .card { font-size: 0.875rem; }
}

@container (width >= 768px) {
  .card { display: flex; }
}
```

### コンテナクエリ単位（cqw・cqh・cqi・cqb）

Container Queries に関連する新しいCSS単位が導入されました。

```css
/* cqw：コンテナ幅の1% */
/* cqh：コンテナ高さの1%（container-type: size が必要） */
/* cqi：コンテナのinline-sizeの1% */
/* cqb：コンテナのblock-sizeの1% */
/* cqmin：cqi と cqb の小さい方の1% */
/* cqmax：cqi と cqb の大きい方の1% */

.container {
  container-type: inline-size;
}

.title {
  /* コンテナ幅の5%をフォントサイズに使用 */
  font-size: max(1rem, 5cqi);
}

.hero-image {
  /* コンテナ幅に応じた画像サイズ */
  width: 80cqw;
  max-width: 600px;
}

.card-padding {
  /* コンテナに応じたパディング */
  padding: clamp(1rem, 3cqi, 2rem);
}
```

これらの単位を使うと、タイポグラフィやスペーシングをコンテナサイズに流動的に追従させられます。

### 実践的なサイズクエリの例

```css
/* カードグリッドの列数をコンテナ幅で制御 */
.grid-container {
  container-type: inline-size;
}

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@container (min-width: 400px) {
  .grid {
    grid-template-columns: 1fr 1fr;
  }
}

@container (min-width: 700px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@container (min-width: 1000px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

---

## 5. スタイルクエリ（CSS Custom Properties）

### スタイルクエリとは

スタイルクエリ（Style Queries）は、コンテナのサイズではなく「CSSカスタムプロパティの値」に基づいてスタイルを切り替える機能です。2023年に Chrome 111 で実装され、現在も実装が進んでいます。

```css
/* スタイルクエリの基本構文 */
@container style(--variant: featured) {
  .card {
    border: 2px solid gold;
    background: linear-gradient(135deg, #fff9c4, #ffffff);
  }
}
```

### スタイルクエリの使い方

```css
/* 親要素にカスタムプロパティを設定 */
.card-wrapper {
  --card-style: compact;
}

.card-wrapper.featured {
  --card-style: featured;
}

/* スタイルクエリでカスタムプロパティを参照 */
@container style(--card-style: compact) {
  .card {
    padding: 0.5rem;
    font-size: 0.875rem;
  }
}

@container style(--card-style: featured) {
  .card {
    padding: 2rem;
    font-size: 1.25rem;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  }
}
```

### テーマ切り替えへの応用

スタイルクエリはテーマシステムの構築に非常に有用です。

```css
:root {
  --theme: light;
}

[data-theme="dark"] {
  --theme: dark;
}

/* テーマに応じたコンポーネントスタイル */
@container style(--theme: dark) {
  .card {
    background-color: #1e1e2e;
    color: #cdd6f4;
    border-color: #313244;
  }
}

@container style(--theme: light) {
  .card {
    background-color: #ffffff;
    color: #1e1e2e;
    border-color: #e0e0e0;
  }
}
```

### ブール値のスタイルクエリ

カスタムプロパティが設定されているかどうかを確認できます。

```css
.card {
  /* デフォルトは未設定 */
}

.card.highlighted {
  --highlighted: 1;
}

/* カスタムプロパティが設定されている場合 */
@container style(--highlighted) {
  .card-border {
    border-left: 4px solid #4a90d9;
  }
}
```

---

## 6. CSS Nesting（ネスト構文）

### CSS Nestingとは

CSS Nesting は、Sass や Less などのプリプロセッサで広く使われていたネスト構文がネイティブCSSに導入されたものです。Chrome 112、Firefox 117、Safari 16.5 以降でサポートされています。

```css
/* ネスト構文を使わない場合 */
.card { background: white; }
.card .title { font-size: 1.5rem; }
.card .title:hover { color: blue; }
.card .content { padding: 1rem; }

/* ネスト構文を使う場合 */
.card {
  background: white;

  .title {
    font-size: 1.5rem;

    &:hover {
      color: blue;
    }
  }

  .content {
    padding: 1rem;
  }
}
```

### &（アンパサンド）の使い方

`&` は親セレクターを参照します。

```css
.button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  background: #4a90d9;
  color: white;

  /* &:hover → .button:hover */
  &:hover {
    background: #357abd;
  }

  /* &:active → .button:active */
  &:active {
    transform: scale(0.98);
  }

  /* &.disabled → .button.disabled */
  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* &--primary → .button--primary（BEMスタイル） */
  &--primary {
    background: #2ecc71;
  }

  /* &--danger → .button--danger */
  &--danger {
    background: #e74c3c;
  }
}
```

### メディアクエリとのネスト

CSS Nesting はメディアクエリとも組み合わせられます。

```css
.card {
  display: block;
  padding: 1rem;

  @media (min-width: 768px) {
    display: flex;
    padding: 2rem;
  }

  @media (min-width: 1024px) {
    max-width: 800px;
    margin: 0 auto;
  }
}
```

### Container QueriesとNestingの組み合わせ

これが非常に強力な組み合わせです。

```css
.card-wrapper {
  container-type: inline-size;

  .card {
    display: block;
    padding: 1rem;

    @container (min-width: 400px) {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    @container (min-width: 600px) {
      padding: 2rem;
      gap: 2rem;
    }

    .card-image {
      width: 100%;

      @container (min-width: 400px) {
        width: 200px;
        flex-shrink: 0;
      }
    }

    .card-content {
      .title {
        font-size: 1.25rem;

        @container (min-width: 400px) {
          font-size: 1.5rem;
        }
      }

      .description {
        font-size: 0.875rem;
        color: #666;
      }
    }
  }
}
```

### ネスト構文のベストプラクティス

```css
/* 推奨：浅いネスト（2〜3段階まで） */
.nav {
  display: flex;
  gap: 1rem;

  .nav-item {
    position: relative;

    &:hover .dropdown {
      display: block;
    }
  }
}

/* 避けるべき：過度に深いネスト（読みにくくなる） */
.header {
  .nav {
    .nav-list {
      .nav-item {
        .nav-link {
          .nav-icon {
            /* 6段階のネスト：避けるべき */
          }
        }
      }
    }
  }
}
```

---

## 7. :has()セレクター（親要素の条件指定）

### :has()とは

`:has()` は「特定の子孫要素を持つ要素」を選択できる革命的なCSSセレクターです。長らく「親セレクター」として要望されてきたもので、2023年に全主要ブラウザがサポートしました。

```css
/* 画像を含むカードにだけ特別なスタイルを適用 */
.card:has(img) {
  grid-template-rows: auto 1fr;
}

/* チェックされたチェックボックスの親ラベルをスタイル変更 */
label:has(input[type="checkbox"]:checked) {
  font-weight: bold;
  color: #2ecc71;
}

/* フォームにエラーがある場合に送信ボタンをグレーアウト */
form:has(.error-message) button[type="submit"] {
  opacity: 0.5;
  pointer-events: none;
}
```

### :has()の基本的な使い方

```css
/* 子要素の有無で親をスタイル変更 */
section:has(h2) {
  padding-top: 3rem;
}

/* 特定の状態の子を持つ親をスタイル変更 */
.form-group:has(input:invalid) {
  border-left: 3px solid #e74c3c;
}

.form-group:has(input:valid) {
  border-left: 3px solid #2ecc71;
}

/* フォーカスされた子を持つ親をスタイル変更 */
.input-wrapper:has(input:focus) {
  box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.3);
  border-color: #4a90d9;
}
```

### 複雑な:has()の活用

```css
/* 最後の子がボタンではない場合のスタイル */
.card:not(:has(> .card-footer)) {
  padding-bottom: 2rem;
}

/* 3つ以上の子要素を持つリスト */
ul:has(li:nth-child(3)) {
  columns: 2;
}

/* 空の要素を持つコンテナを非表示 */
.widget:has(> :empty) {
  display: none;
}

/* ホバーされた兄弟があるナビゲーションアイテム */
.nav-item:has(~ .nav-item:hover) {
  opacity: 0.6;
}
```

### :has()をContainer Queriesと組み合わせる

```css
/* コンテナが画像を含む場合のコンテナクエリ */
.card-wrapper {
  container-type: inline-size;
}

/* カードに画像がある場合の大画面レイアウト */
@container (min-width: 500px) {
  .card:has(.card-image) {
    display: grid;
    grid-template-columns: 200px 1fr;
    grid-template-areas: "image content";
  }

  .card:not(:has(.card-image)) {
    padding: 2rem;
  }
}
```

### フォームバリデーションへの応用

```css
/* バリデーション状態に基づく動的なフォームスタイリング */
.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* 入力フィールドが無効な状態 */
.form-field:has(input:invalid:not(:placeholder-shown)) {
  .error-message {
    display: block;
    color: #e74c3c;
    font-size: 0.875rem;
  }

  input {
    border-color: #e74c3c;
    background-color: #fff5f5;
  }

  label {
    color: #e74c3c;
  }
}

/* 入力フィールドが有効な状態 */
.form-field:has(input:valid:not(:placeholder-shown)) {
  .success-indicator {
    display: block;
    color: #2ecc71;
  }

  input {
    border-color: #2ecc71;
  }
}
```

---

## 8. CSS Layers（@layer・カスケードレイヤー）

### CSS Layersとは

CSS Cascade Layers（`@layer`）は、CSSのカスケード（優先順位）を明示的に制御する仕組みです。Chrome 99、Firefox 97、Safari 15.4 以降でサポートされています。

従来のCSS優先順位の問題として、specificity（詳細度）の競合があります。`!important` の乱用や、セレクターの詳細度を上げるためだけのネストは、メンテナビリティを大幅に下げていました。

```css
/* 従来の問題：詳細度の競合 */
/* lib.css（ライブラリ） */
.btn.btn-primary { color: blue; }  /* 詳細度: 0,2,0 */

/* app.css（アプリケーション） */
.btn { color: red; }  /* 詳細度: 0,1,0 → ライブラリに負ける */

/* 解決のために詳細度を上げるハック */
.app .btn { color: red; }  /* 詳細度: 0,2,0 → まだ競合 */
```

### @layerの基本構文

```css
/* レイヤーの宣言（順序が優先順位を決める：後のものが強い） */
@layer base, components, utilities;

/* baseレイヤー：最も優先度が低い */
@layer base {
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: sans-serif;
    line-height: 1.5;
  }

  h1, h2, h3, h4, h5, h6 {
    font-weight: bold;
  }
}

/* componentsレイヤー：中間の優先度 */
@layer components {
  .btn {
    display: inline-flex;
    align-items: center;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
  }

  .card {
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}

/* utilitiesレイヤー：最も優先度が高い */
@layer utilities {
  .mt-4 { margin-top: 1rem; }
  .p-4 { padding: 1rem; }
  .text-center { text-align: center; }
  .hidden { display: none; }
}
```

### レイヤーの優先順位ルール

```css
/* 宣言された順序がすべてを決める */
@layer A, B, C;

@layer C {
  .element { color: blue; }  /* 最高優先度 */
}

@layer A {
  .element { color: red; }  /* 最低優先度 */
}

@layer B {
  .element { color: green; }  /* 中間優先度 */
}

/* 結果：.element は blue になる（Cが最後に宣言されたため） */
```

レイヤーに属さないスタイル（アンレイヤード）は、すべてのレイヤーより優先度が高くなります。

```css
@layer base { .btn { color: blue; } }  /* レイヤー内 */

/* アンレイヤードのスタイルはレイヤーより優先される */
.btn { color: red; }  /* 詳細度が低くても勝つ */
```

### サードパーティCSSの管理

```css
/* サードパーティのスタイルをレイヤーに閉じ込める */
@layer vendor {
  /* normalize.cssの内容 */
  @import url('normalize.css') layer(vendor);
}

@layer base {
  /* アプリケーション独自のベーススタイル */
  /* vendor より優先される */
}
```

### @layerのネスト

```css
@layer framework {
  @layer base {
    /* framework.base */
  }

  @layer components {
    /* framework.components */
  }
}

/* ドット記法でネストしたレイヤーに追記できる */
@layer framework.base {
  body { margin: 0; }
}
```

### !importantとレイヤーの関係

`!important` はレイヤーの優先順位を逆転させます。

```css
@layer A, B;

@layer A {
  .element { color: red !important; }  /* !importantはレイヤーAが勝つ */
}

@layer B {
  .element { color: blue; }  /* 通常はBが勝つが... */
}

/* !importantの場合：Aの!importantがBの通常スタイルに勝つ */
/* 結果：color: red */
```

---

## 9. CSS Subgrid

### Subgridとは

CSS Subgridは、ネストしたグリッドアイテムが親グリッドのトラック定義を引き継げる機能です。Firefox 71（2019年）で先行実装され、Chrome 117（2023年）でようやく全主要ブラウザが対応しました。

従来のグリッドの問題として、カード内の要素を複数のカード間で揃えるのが困難でした。

```css
/* 従来の問題：カード内の要素が揃わない */
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.card {
  /* カード自体はグリッドに乗れるが... */
  display: flex;
  flex-direction: column;
}

/* カード内のヘッダー・コンテンツ・フッターを
   カード間で水平に揃えることができない */
```

### Subgridの基本構文

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  /* 行の定義を追加 */
  grid-template-rows: auto 1fr auto;
  gap: 1rem;
}

.card {
  /* 親グリッドの行定義を引き継ぐ */
  display: grid;
  grid-row: span 3;
  grid-template-rows: subgrid;
}

/* これで card-header・card-content・card-footer が
   すべてのカード間で水平に揃う */
.card-header { /* 1行目 */ }
.card-content { /* 2行目 */ }
.card-footer { /* 3行目 */ }
```

### Subgridの実践例

```css
/* 等身大カードグリッド */
.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  grid-template-rows: auto;
  gap: 2rem;
  align-items: start;
}

.product-card {
  display: grid;
  grid-row: span 4;
  grid-template-rows: subgrid;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.product-image {
  aspect-ratio: 4 / 3;
  object-fit: cover;
  width: 100%;
}

.product-title {
  padding: 1rem 1rem 0;
  font-size: 1.125rem;
  font-weight: bold;
}

.product-description {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: #666;
}

.product-footer {
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #f0f0f0;
}
```

### 列方向のSubgrid

```css
/* 列方向のSubgrid */
.form-layout {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 1rem;
}

.form-section {
  display: contents;
  /* または */
  display: grid;
  grid-column: span 2;
  grid-template-columns: subgrid;
}

.form-label {
  grid-column: 1;
  text-align: right;
  align-self: center;
}

.form-input {
  grid-column: 2;
}
```

---

## 10. CSS Anchor Positioning（アンカーポジショニング）

### Anchor Positioningとは

CSS Anchor Positioning は、要素を別の要素（アンカー）に相対的に配置できる機能です。Chrome 125（2024年）でサポートされ、ツールチップ・ポップオーバー・ドロップダウンの実装を純粋なCSSで行えます。

```css
/* アンカー要素の定義 */
.trigger-button {
  anchor-name: --my-anchor;
}

/* アンカーに位置を紐付けるポップアップ */
.tooltip {
  position: absolute;
  position-anchor: --my-anchor;

  /* アンカーの下辺から配置 */
  top: anchor(bottom);
  /* アンカーの左辺を基準に中央揃え */
  left: calc(anchor(left) + (anchor(width) / 2) - (self-width / 2));
}
```

### @position-tryによるフォールバック

ビューポートを超える場合の代替位置を指定できます。

```css
.tooltip {
  position: absolute;
  position-anchor: --my-anchor;
  top: anchor(bottom);
  left: anchor(center);
  translate: -50% 0;

  /* 下に表示できない場合は上に表示 */
  position-try-fallbacks: --above;
}

@position-try --above {
  top: auto;
  bottom: anchor(top);
  translate: -50% 0;
}
```

### 実践的なドロップダウンメニュー

```css
.nav-item {
  position: relative;
  anchor-name: --nav-item;
}

.dropdown-menu {
  position: fixed;
  position-anchor: --nav-item;
  top: anchor(bottom);
  left: anchor(left);
  min-width: anchor-size(width);
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);

  position-try-fallbacks: --flip-up, --flip-left;
}

@position-try --flip-up {
  top: auto;
  bottom: anchor(top);
}

@position-try --flip-left {
  left: auto;
  right: anchor(right);
}
```

---

## 11. 実践例：カードコンポーネント・サイドバー・ダッシュボード

### 完全なカードコンポーネント

Container Queries、CSS Nesting、:has() を組み合わせた完全なカードコンポーネントです。

```css
/* カードコンテナ */
.card-container {
  container: card-wrapper / inline-size;
}

/* カードの基本スタイル */
.card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto 1fr auto;

  /* 画像がある場合のスタイル */
  &:has(.card-image) {
    grid-template-rows: auto auto 1fr auto;
  }

  /* カード画像 */
  .card-image {
    img {
      width: 100%;
      height: 200px;
      object-fit: cover;
      display: block;
    }
  }

  /* カードヘッダー */
  .card-header {
    padding: 1.25rem 1.25rem 0.5rem;

    .card-category {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b7280;
      margin-bottom: 0.5rem;
    }

    .card-title {
      font-size: 1.25rem;
      font-weight: 700;
      line-height: 1.3;
      color: #111827;
    }
  }

  /* カードコンテンツ */
  .card-content {
    padding: 0.5rem 1.25rem;
    color: #4b5563;
    font-size: 0.875rem;
    line-height: 1.6;
  }

  /* カードフッター */
  .card-footer {
    padding: 1rem 1.25rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #f3f4f6;

    .card-author {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      img {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        object-fit: cover;
      }

      span {
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
      }
    }

    .card-date {
      font-size: 0.8125rem;
      color: #9ca3af;
    }
  }
}

/* コンテナクエリ：横並びレイアウト（400px以上） */
@container card-wrapper (min-width: 400px) {
  .card:has(.card-image) {
    grid-template-rows: unset;
    grid-template-columns: 240px 1fr;
    grid-template-areas:
      "image header"
      "image content"
      "image footer";

    .card-image {
      grid-area: image;

      img {
        height: 100%;
        min-height: 200px;
      }
    }

    .card-header {
      grid-area: header;
      padding: 1.5rem 1.5rem 0.5rem;

      .card-title { font-size: 1.5rem; }
    }

    .card-content {
      grid-area: content;
      padding: 0.5rem 1.5rem;
    }

    .card-footer {
      grid-area: footer;
      padding: 1rem 1.5rem;
    }
  }
}

/* コンテナクエリ：大きなコンテナ（600px以上） */
@container card-wrapper (min-width: 600px) {
  .card:has(.card-image) {
    grid-template-columns: 320px 1fr;

    .card-image img {
      min-height: 280px;
    }

    .card-header .card-title {
      font-size: 1.75rem;
    }
  }
}
```

### レスポンシブサイドバーレイアウト

```css
/* ページレイアウト全体 */
.page-layout {
  display: grid;
  grid-template-areas:
    "header"
    "main"
    "sidebar"
    "footer";
  grid-template-columns: 1fr;
  gap: 1.5rem;
  padding: 1rem;
  max-width: 1400px;
  margin: 0 auto;

  @media (min-width: 768px) {
    grid-template-areas:
      "header header"
      "main sidebar"
      "footer footer";
    grid-template-columns: 1fr 280px;
  }

  @media (min-width: 1200px) {
    grid-template-areas:
      "header header header"
      "sidebar main aside"
      "footer footer footer";
    grid-template-columns: 240px 1fr 200px;
  }
}

.page-header { grid-area: header; }
.page-main { grid-area: main; container: main-content / inline-size; }
.page-sidebar { grid-area: sidebar; container: sidebar-content / inline-size; }
.page-footer { grid-area: footer; }

/* サイドバー内ウィジェット */
.sidebar-widget {
  background: #f9fafb;
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1rem;

  .widget-title {
    font-size: 0.875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #6b7280;
    margin-bottom: 1rem;
  }
}

/* サイドバーが広い場合（サイドバーが700px以上になる場合） */
@container sidebar-content (min-width: 500px) {
  .sidebar-widget {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;

    .widget-title {
      grid-column: span 2;
    }
  }
}
```

### ダッシュボードレイアウト

```css
/* ダッシュボードのメトリクスグリッド */
.dashboard {
  container: dashboard / inline-size;
  padding: 1.5rem;
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-bottom: 2rem;

  @container dashboard (min-width: 500px) {
    grid-template-columns: 1fr 1fr;
  }

  @container dashboard (min-width: 900px) {
    grid-template-columns: repeat(4, 1fr);
  }
}

.metric-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
  container: metric / inline-size;

  .metric-label {
    font-size: 0.875rem;
    color: #6b7280;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }

  .metric-value {
    font-size: 2rem;
    font-weight: 700;
    color: #111827;
    line-height: 1;
  }

  .metric-change {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin-top: 0.5rem;
    font-size: 0.8125rem;

    &.positive { color: #059669; }
    &.negative { color: #dc2626; }
  }
}

/* チャートエリア */
.charts-section {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @container dashboard (min-width: 700px) {
    grid-template-columns: 2fr 1fr;
  }
}

.chart-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
  container: chart / inline-size;

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;

    .chart-title {
      font-size: 1rem;
      font-weight: 600;
      color: #111827;
    }

    .chart-controls {
      display: none;

      @container chart (min-width: 400px) {
        display: flex;
        gap: 0.5rem;
      }
    }
  }
}

/* データテーブルのレスポンシブ対応 */
.data-table-wrapper {
  container: table-wrapper / inline-size;
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;

  th, td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
    white-space: nowrap;
  }

  th {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #6b7280;
    background: #f9fafb;
  }
}

/* 狭いコンテナではカラムを非表示に */
.col-optional {
  @container table-wrapper (max-width: 500px) {
    display: none;
  }
}

.col-desktop {
  @container table-wrapper (max-width: 700px) {
    display: none;
  }
}
```

---

## 12. Tailwind CSSとの組み合わせ

### Tailwind CSS v3 でのContainer Queries

Tailwind CSS v3 では、`@tailwindcss/container-queries` プラグインを追加する必要があります。

```bash
npm install @tailwindcss/container-queries
```

```javascript
// tailwind.config.js
module.exports = {
  plugins: [
    require('@tailwindcss/container-queries'),
  ],
};
```

```html
<!-- Tailwind Container Queries の使い方（v3） -->
<div class="@container">
  <div class="@sm:flex @sm:gap-4 @lg:gap-8">
    <div class="@sm:w-48">
      <img src="..." alt="..." class="w-full">
    </div>
    <div>
      <h2 class="text-lg @sm:text-xl @lg:text-2xl">タイトル</h2>
      <p class="@sm:text-base">説明文</p>
    </div>
  </div>
</div>
```

### Tailwind CSS v4 でのContainer Queries

Tailwind CSS v4 では、Container Queriesがコアに統合され、プラグイン不要になりました。

```html
<!-- v4ではプラグインなしで動作 -->
<div class="@container">
  <div class="flex flex-col @md:flex-row @md:gap-6">
    <img class="w-full @md:w-64" src="..." alt="...">
    <div class="@md:flex-1">
      <h2 class="text-xl @lg:text-3xl font-bold">見出し</h2>
      <p class="text-gray-600">本文テキスト</p>
    </div>
  </div>
</div>
```

### 名前付きコンテナのTailwind設定

```html
<!-- 名前付きコンテナ -->
<aside class="@container/sidebar">
  <div class="@sm/sidebar:grid @sm/sidebar:grid-cols-2">
    <!-- サイドバーのサイズに応じたレイアウト -->
  </div>
</aside>

<main class="@container/main">
  <div class="@lg/main:flex @lg/main:gap-8">
    <!-- メインエリアのサイズに応じたレイアウト -->
  </div>
</main>
```

### Tailwindのカスタムコンテナサイズ

```javascript
// tailwind.config.js（v3）
module.exports = {
  theme: {
    containers: {
      xs: '320px',
      sm: '384px',
      md: '448px',
      lg: '512px',
      xl: '576px',
      '2xl': '672px',
      '3xl': '768px',
      '4xl': '896px',
      '5xl': '1024px',
      '6xl': '1152px',
      '7xl': '1280px',
    },
  },
  plugins: [
    require('@tailwindcss/container-queries'),
  ],
};
```

### Container Queries + Tailwind の実践パターン

```html
<!-- プロダクトカードの実践例 -->
<div class="@container">
  <!-- デフォルト：縦積み。sm以上：横並び -->
  <article class="
    flex flex-col gap-4
    @sm:flex-row @sm:gap-6
    bg-white rounded-xl border border-gray-200 overflow-hidden
    shadow-sm hover:shadow-md transition-shadow
  ">
    <!-- 画像 -->
    <div class="@sm:w-48 @sm:flex-shrink-0 @lg:w-64">
      <img
        src="/product.jpg"
        alt="商品画像"
        class="w-full h-48 @sm:h-full object-cover"
      >
    </div>

    <!-- コンテンツ -->
    <div class="flex flex-col gap-2 p-4 @sm:p-6 @sm:pl-0 flex-1">
      <span class="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
        カテゴリ
      </span>
      <h2 class="text-lg @sm:text-xl @lg:text-2xl font-bold text-gray-900">
        商品名タイトル
      </h2>
      <p class="text-sm @sm:text-base text-gray-600 leading-relaxed line-clamp-3">
        商品の説明文をここに記載します。コンテナのサイズに応じてフォントサイズが変わります。
      </p>

      <!-- フッター -->
      <div class="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
        <span class="text-xl @lg:text-2xl font-bold text-gray-900">
          ¥12,800
        </span>
        <button class="
          bg-indigo-600 text-white px-4 py-2 rounded-lg
          text-sm @lg:text-base font-medium
          hover:bg-indigo-700 transition-colors
        ">
          カートに追加
        </button>
      </div>
    </div>
  </article>
</div>
```

---

## 13. ブラウザサポートとpolyfill

### 各機能のブラウザサポート状況（2026年2月現在）

| 機能 | Chrome | Firefox | Safari | Edge |
|------|--------|---------|--------|------|
| Container Size Queries | 105+ | 110+ | 16+ | 105+ |
| Container Style Queries（カスタムプロパティ） | 111+ | 未サポート | 未サポート | 111+ |
| CSS Nesting | 112+ | 117+ | 16.5+ | 112+ |
| :has() | 105+ | 121+ | 15.4+ | 105+ |
| @layer | 99+ | 97+ | 15.4+ | 99+ |
| CSS Subgrid | 117+ | 71+ | 16+ | 117+ |
| Anchor Positioning | 125+ | 開発中 | 未サポート | 125+ |
| cqw/cqh単位 | 105+ | 110+ | 16+ | 105+ |

### Container Queriesのpolyfill

```html
<!-- GoogleのContainer Queries Polyfill -->
<script>
  if (!("container" in document.documentElement.style)) {
    import("https://cdn.jsdelivr.net/npm/container-query-polyfill@1/dist/container-query-polyfill.modern.js");
  }
</script>
```

```javascript
// package.jsonで管理する場合
// npm install container-query-polyfill

// entry.js
import "container-query-polyfill";
```

polyfillを使う際の注意点：

1. polyfillはResizeObserverに依存しているため、IE11ではさらに別のpolyfillが必要です
2. CSSセレクターの解析にオーバーヘッドが発生するため、パフォーマンスへの影響があります
3. コンテナとして認識させるため、`container-type` を持つ要素には `display: block` または `display: grid` が必要です

### プログレッシブエンハンスメントアプローチ

```css
/* まずシンプルなスタイルを書く（全ブラウザ共通） */
.card {
  display: block;
  padding: 1rem;
}

/* Container Queriesをサポートしている場合の拡張 */
@supports (container-type: inline-size) {
  .card-wrapper {
    container-type: inline-size;
  }

  @container (min-width: 500px) {
    .card {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }
  }
}
```

### @supportsでの機能検出

```css
/* CSS Nestingのサポート検出 */
@supports selector(&) {
  .nav {
    display: flex;

    .nav-item { margin: 0 0.5rem; }
  }
}

/* :has()のサポート検出 */
@supports selector(:has(*)) {
  .card:has(img) {
    grid-template-rows: auto 1fr;
  }
}

/* Subgridのサポート検出 */
@supports (grid-template-rows: subgrid) {
  .card {
    grid-template-rows: subgrid;
  }
}
```

---

## 14. パフォーマンスとベストプラクティス

### Container Queriesのパフォーマンス

Container Queriesは、ブラウザの描画エンジンに追加のコンテナサイズ計算を課します。以下のポイントに注意することでパフォーマンスへの影響を最小化できます。

```css
/* 推奨：コンテナの指定はできるだけ上位レベルのみ */
.page-layout {
  container-type: inline-size;
}

/* 避けるべき：すべてのDIVをコンテナにする */
/* div { container-type: inline-size; }  ← 絶対にやめる */
```

### contain プロパティとの関係

`container-type` を指定すると、ブラウザは内部的に `contain: layout style` を適用します。これは意図しないレイアウト変化を引き起こす可能性があります。

```css
/* container-type: size は layout と size containment を有効にする */
.container {
  container-type: size;
  /* 暗黙的に: contain: layout style size */
  /* height の intrinsic sizing が失われるため注意 */
  height: 400px; /* 明示的に高さを指定する必要がある */
}

/* container-type: inline-size は inline containment のみ */
.container {
  container-type: inline-size;
  /* 暗黙的に: contain: inline-size layout style */
  /* height は通常通り動作する */
}
```

### CSS Nestingとパフォーマンス

ネスト構文はブラウザのスタイル計算に対してほぼ影響がありません。しかし、過度に深いネストは可読性を下げ、セレクターの詳細度を理解しにくくします。

```css
/* 推奨：浅いネスト */
.nav {
  display: flex;

  .nav-item {
    padding: 0.5rem 1rem;

    &:hover { background: #f5f5f5; }
  }
}

/* 避けるべき：深すぎるネスト */
.page {
  .content {
    .sidebar {
      .widget {
        .widget-header {
          .title {
            /* 6段階のネストは保守が困難 */
          }
        }
      }
    }
  }
}
```

### @layerを使った効率的なCSS管理

```css
/* プロジェクトのCSSアーキテクチャ例 */

/* 1. レイヤーの優先順位を冒頭で宣言 */
@layer reset, base, tokens, components, patterns, utilities, overrides;

/* 2. リセット */
@layer reset {
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
}

/* 3. デザイントークン */
@layer tokens {
  :root {
    --color-primary: #4f46e5;
    --color-primary-hover: #4338ca;
    --spacing-unit: 0.25rem;
    --radius-base: 6px;
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  }
}

/* 4. 基本スタイル */
@layer base {
  body {
    font-family: system-ui, -apple-system, sans-serif;
    color: #1a1a2e;
    line-height: 1.5;
  }

  h1 { font-size: clamp(1.75rem, 4vw, 3rem); }
  h2 { font-size: clamp(1.5rem, 3vw, 2.25rem); }
  h3 { font-size: clamp(1.25rem, 2.5vw, 1.75rem); }
}

/* 5. コンポーネント */
@layer components {
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    border-radius: var(--radius-base);
    font-weight: 500;
    font-size: 0.875rem;
    line-height: 1;
    cursor: pointer;
    transition: all 0.15s ease;
    border: none;

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
  }

  .btn-primary {
    background: var(--color-primary);
    color: white;

    &:hover { background: var(--color-primary-hover); }
    &:active { transform: scale(0.98); }
  }
}

/* 6. ユーティリティ */
@layer utilities {
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  .truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
```

### カスケードレイヤーとContainer Queriesの共存

```css
@layer components, layout;

@layer components {
  .card {
    background: white;
    border-radius: 8px;
    padding: 1rem;
  }
}

@layer layout {
  .card-grid {
    container-type: inline-size;

    @container (min-width: 500px) {
      .card {
        /* components レイヤーのスタイルを上書きできる */
        /* （layout が後に宣言されているため） */
        padding: 2rem;
      }
    }
  }
}
```

### アクセシビリティとContainer Queries

```css
/* ユーザーの設定を尊重する */
@container (min-width: 600px) {
  .navigation {
    /* アニメーション */
    .nav-item {
      transition: transform 0.2s ease;

      /* prefers-reduced-motion を尊重 */
      @media (prefers-reduced-motion: reduce) {
        transition: none;
      }
    }
  }
}

/* フォーカスインジケーターをコンテナサイズに応じて調整 */
.btn:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;

  @container (min-width: 500px) {
    outline-offset: 4px;
  }
}
```

### CSS変数とContainer Queriesの相乗効果

```css
/* コンテナサイズに応じてCSS変数を変更 */
.responsive-component {
  container-type: inline-size;

  /* デフォルト値 */
  --font-size-heading: 1.25rem;
  --font-size-body: 0.875rem;
  --gap: 0.75rem;
  --padding: 1rem;
}

@container (min-width: 400px) {
  .responsive-component {
    --font-size-heading: 1.5rem;
    --font-size-body: 1rem;
    --gap: 1rem;
    --padding: 1.5rem;
  }
}

@container (min-width: 700px) {
  .responsive-component {
    --font-size-heading: 2rem;
    --font-size-body: 1.125rem;
    --gap: 1.5rem;
    --padding: 2rem;
  }
}

/* 子コンポーネントはCSS変数を参照するだけ */
.component-heading {
  font-size: var(--font-size-heading);
}

.component-body {
  font-size: var(--font-size-body);
}

.component-layout {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  padding: var(--padding);
}
```

### ベストプラクティスまとめ

**1. コンテナ指定は必要な箇所だけ**

```css
/* 推奨：必要なコンテナのみ */
.card-list { container-type: inline-size; }
.sidebar { container-type: inline-size; }

/* 避けるべき：すべての要素をコンテナ化 */
/* * { container-type: inline-size; } */
```

**2. container-type: size は慎重に使う**

```css
/* inline-size で十分なケースがほとんど */
.wrapper { container-type: inline-size; }

/* size が本当に必要なケース（高さのクエリが必要な場合） */
.fixed-height-container {
  container-type: size;
  height: 500px; /* 必ず高さを指定 */
}
```

**3. コンテナクエリとメディアクエリを適切に使い分ける**

```css
/* グローバルなレイアウト変更：メディアクエリ */
@media (min-width: 1024px) {
  .page-layout {
    grid-template-columns: 240px 1fr;
  }
}

/* コンポーネント内部のスタイル変更：コンテナクエリ */
.page-sidebar { container-type: inline-size; }

@container (min-width: 200px) {
  .sidebar-nav {
    display: flex;
    flex-direction: column;
  }
}
```

**4. フォールバックを忘れずに**

```css
/* サポートされていないブラウザへのフォールバック */
.card {
  /* フォールバックスタイル */
  display: flex;
  flex-direction: column;
}

/* Container Queries サポート時の拡張 */
@supports (container-type: inline-size) {
  .card-wrapper {
    container-type: inline-size;
  }

  @container (min-width: 500px) {
    .card {
      flex-direction: row;
    }
  }
}
```

**5. CSS Layersで優先順位を明示的に管理**

```css
/* プロジェクト開始時に必ずレイヤー順を宣言 */
@layer reset, base, components, utilities;

/* サードパーティCSSはレイヤーに閉じ込める */
@layer vendor {
  @import url('./vendor/normalize.css');
}
```

**6. ネストは3段階まで**

```css
/* 推奨：明確で読みやすい */
.section {
  padding: 2rem;

  .section-header {
    margin-bottom: 1rem;

    &:hover { color: blue; }
  }
}
```

---

## モダンCSSを活用した実務の取り組み方

### 段階的な導入戦略

新機能を既存プロジェクトに導入する場合、段階的なアプローチが最も安全です。

**フェーズ1：@layerの導入**
既存のCSSを@layerで整理するだけで、カスケード管理が大幅に改善されます。既存の動作を変えずにリファクタリングできます。

```css
/* 既存のCSSをレイヤーに移行 */
@layer base, components, utilities;

@layer components {
  /* 既存のコンポーネントスタイルをそのまま移行 */
  .card { /* ... */ }
  .btn { /* ... */ }
}
```

**フェーズ2：CSS Nestingの導入**
新規コンポーネントから順次ネスト構文に移行します。プリプロセッサが不要になるケースも増えます。

**フェーズ3：Container Queriesの導入**
再利用性の高いコンポーネント（カード、ウィジェット、データテーブル）から優先的にContainer Queriesを適用します。

**フェーズ4：:has()の活用**
フォームバリデーション、動的なレイアウト変更など、JavaScriptで行っていた処理をCSSに移管します。

### チームでの規約づくり

```css
/* チームのCSSコーディング規約例 */

/* 1. コンテナ命名規則：ケバブケースで機能的な名前 */
.hero { container: hero-section / inline-size; }
.product-list { container: product-grid / inline-size; }

/* 2. ブレークポイントはCSS変数で管理 */
/* （CSS変数はメディア/コンテナクエリ内では使えないため、コメントで管理） */
/* Breakpoints: sm=400px, md=640px, lg=900px, xl=1200px */

/* 3. コンテナクエリは対象コンポーネントの直前に記述 */
.widget { /* ウィジェットの基本スタイル */ }
@container (min-width: 400px) {
  .widget { /* 拡張スタイル */ }
}

/* 4. @layerの使用はプロジェクト全体で統一 */
/* 宣言はCSSエントリーポイントの冒頭に集約 */
```

### ツールと開発環境の整備

モダンCSSを開発する際に役立つツール群を整えましょう。

**VSCode拡張機能**
- CSS Nesting のシンタックスハイライトは標準で対応済み（VSCode 1.80+）
- Container Queries の補完は「CSS Container Queries」拡張で対応

**Linting**
```json
// .stylelintrc.json
{
  "extends": ["stylelint-config-standard"],
  "rules": {
    "at-rule-no-unknown": null,
    "custom-at-rule-no-unknown": [true, {
      "atRuleName": ["container", "layer"]
    }]
  }
}
```

**PostCSS設定**
```javascript
// postcss.config.js
module.exports = {
  plugins: [
    require("postcss-preset-env")({
      stage: 2,
      features: {
        "nesting-rules": true,
        "cascade-layers": true,
      },
    }),
  ],
};
```

---

## 開発ツールとデバッグ

### Chrome DevToolsでのContainer Queriesデバッグ

Chrome DevTools では、Container Queries をデバッグするための専用機能があります。

1. Elements パネルでコンテナ要素を選択すると、コンテナアイコンが表示されます
2. Computed パネルで `container-type` の値を確認できます
3. コンテナ要素にオーバーレイを表示して、サイズを視覚的に確認できます

### Firefox DevToolsでのContainer Queries

Firefox では「インスペクター」パネルで以下を確認できます。

- `container-type` プロパティのハイライト表示
- コンテナのサイズ情報をボックスモデルビューで確認
- `@container` ルールがStyles パネルに表示される

### デバッグ用のアウトライン表示

```css
/* 開発時限定：コンテナの範囲を視覚化 */
[style*="container-type"],
[class*="container"] {
  outline: 2px dashed rgba(255, 0, 0, 0.3);
}

/* 別の方法：擬似要素で表示 */
.debug-container::before {
  content: attr(class) " [" counter(container-size, integer) "px]";
  position: absolute;
  top: 0;
  left: 0;
  background: rgba(255, 0, 0, 0.7);
  color: white;
  font-size: 10px;
  padding: 2px 4px;
  z-index: 9999;
}
```

---

## まとめ：モダンCSSが変える開発体験

CSS Container Queries を筆頭とするモダンCSSの機能群は、Webフロントエンド開発の根本的な体験を変えつつあります。

**Container Queries** は、コンポーネントを「どこに置かれても正しく振る舞える」自律的な存在にします。デザインシステムの構築において、これは画期的な変化です。

**CSS Nesting** は、Sass や Less なしで読みやすいCSSを書くことを可能にします。プリプロセッサへの依存を減らし、ツールチェーンをシンプルにできます。

**:has()** は、CSSが「子の状態を見て親をスタイル変更する」という、これまでJavaScriptなしでは不可能だった操作を実現します。インタラクティブなUIのコードが劇的にシンプルになります。

**@layer** は、大規模CSSの管理に秩序をもたらします。詳細度の競合を`!important`の乱用で解決する時代は終わりです。

**CSS Subgrid** は、コンポーネント間のアライメントをCSSだけで完全に制御できるようにします。

これらの機能はすでに全主要ブラウザで使用可能であり（Anchor Positioningは一部を除く）、プロダクション環境での採用が急速に進んでいます。

---

## 参考リソース

モダンCSSの学習と開発効率化には、以下のリソースが役立ちます。

- **MDN Web Docs** - Container Queries、CSS Nesting、:has()の公式仕様を日本語で確認できます
- **web.dev** - Google の開発者向けドキュメント。実践的なガイドが豊富です
- **CSS-Tricks** - コミュニティによる豊富なチュートリアルとデモ
- **Chrome Developers** - 最新の Chrome リリースで導入された機能の詳細解説

また、フロントエンド開発の生産性向上には、適切な開発ツールを活用することが重要です。**DevToolBox**（[https://usedevtools.com](https://usedevtools.com)）は、CSS 変換・フォーマット・デバッグをはじめとする開発ツールを一箇所にまとめたプラットフォームです。CSSのカラー変換・グラデーションジェネレーター・スペーシング計算など、日常的なフロントエンド作業を効率化するツールが揃っており、Container Queries の学習・実装時にも活用できます。

モダンCSSは進化が速く、新機能が次々と追加されています。本記事で紹介した機能を実際のプロジェクトに取り入れ、より保守性が高くパフォーマンスに優れたWebアプリケーションを構築していきましょう。

---
title: 'CSSモダンレイアウト完全ガイド — Flexbox・Grid・Container Queries'
description: '2026年のCSSレイアウト技術を完全網羅。Flexbox、CSS Grid、Container Queries、Subgridなど、モダンなレスポンシブレイアウトを実現するための実践的なテクニックとコード例を詳しく解説します。'
pubDate: 'Feb 05 2026'
tags: ['プログラミング']
---

CSSのレイアウト技術は過去10年で劇的に進化しました。floatやposition: absoluteを駆使していた時代は終わり、2026年現在では、Flexbox、CSS Grid、Container Queriesを使えば、ほぼすべてのレイアウトを簡潔に実装できます。この記事では、モダンCSSレイアウトの完全ガイドを提供します。

## Flexbox完全ガイド

Flexboxは1次元レイアウト（行または列）に最適です。

### 基本構造

```css
.container {
  display: flex;
}

.item {
  /* 子要素 */
}
```

### 主要なプロパティ

#### flex-direction（方向）

```css
.container {
  display: flex;
  flex-direction: row; /* 横並び（デフォルト） */
}

.container-column {
  display: flex;
  flex-direction: column; /* 縦並び */
}

.container-reverse {
  display: flex;
  flex-direction: row-reverse; /* 右から左 */
}
```

#### justify-content（主軸の配置）

```css
/* 横並びの場合、水平方向の配置 */
.container {
  display: flex;
  justify-content: flex-start;    /* 左寄せ（デフォルト） */
  justify-content: center;         /* 中央 */
  justify-content: flex-end;       /* 右寄せ */
  justify-content: space-between;  /* 両端揃え、間隔均等 */
  justify-content: space-around;   /* 周囲に均等な余白 */
  justify-content: space-evenly;   /* 完全に均等な間隔 */
}
```

#### align-items（交差軸の配置）

```css
/* 横並びの場合、垂直方向の配置 */
.container {
  display: flex;
  align-items: stretch;      /* 高さいっぱいに伸ばす（デフォルト） */
  align-items: flex-start;   /* 上揃え */
  align-items: center;       /* 中央 */
  align-items: flex-end;     /* 下揃え */
  align-items: baseline;     /* テキストのベースラインで揃える */
}
```

#### gap（アイテム間の余白）

```css
.container {
  display: flex;
  gap: 16px; /* すべてのアイテム間に16pxの余白 */

  /* 行と列で別々に指定 */
  gap: 20px 10px; /* 行: 20px, 列: 10px */
}
```

### 実践例1: 水平中央配置

```html
<div class="center-box">
  <div class="content">中央に配置されます</div>
</div>
```

```css
.center-box {
  display: flex;
  justify-content: center; /* 水平中央 */
  align-items: center;     /* 垂直中央 */
  min-height: 100vh;
}
```

### 実践例2: ヘッダーレイアウト

```html
<header class="header">
  <div class="logo">Logo</div>
  <nav class="nav">
    <a href="#">Home</a>
    <a href="#">About</a>
    <a href="#">Contact</a>
  </nav>
  <button class="cta">Sign Up</button>
</header>
```

```css
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.nav {
  display: flex;
  gap: 2rem;
}

.nav a {
  text-decoration: none;
  color: #333;
}
```

### 実践例3: カードグリッド（Flexbox版）

```html
<div class="card-container">
  <div class="card">Card 1</div>
  <div class="card">Card 2</div>
  <div class="card">Card 3</div>
</div>
```

```css
.card-container {
  display: flex;
  flex-wrap: wrap; /* 折り返しを許可 */
  gap: 1rem;
}

.card {
  flex: 1 1 300px; /* 最小幅300px、余白があれば伸びる */
  padding: 1.5rem;
  background: #f5f5f5;
  border-radius: 8px;
}
```

### flex: 1 1 300pxの意味

```css
.item {
  flex: 1 1 300px;
  /* flex-grow: 1;   余白があれば伸びる */
  /* flex-shrink: 1; スペースが足りなければ縮む */
  /* flex-basis: 300px; 基本サイズは300px */
}
```

## CSS Grid完全ガイド

CSS Gridは2次元レイアウト（行と列）に最適です。

### 基本構造

```css
.container {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr; /* 3列 */
  grid-template-rows: auto;
  gap: 1rem;
}
```

### グリッドの定義方法

#### 固定サイズ

```css
.grid {
  display: grid;
  grid-template-columns: 200px 300px 200px; /* 200px, 300px, 200px */
}
```

#### fr単位（比率）

```css
.grid {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr; /* 1:2:1の比率 */
}
```

#### repeat関数

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* 1fr 1fr 1fr と同じ */
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); /* レスポンシブ */
}
```

#### auto-fitとauto-fill

```css
/* auto-fit: 空白スペースをアイテムで埋める */
.grid-fit {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

/* auto-fill: 空白スペースを保持する */
.grid-fill {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}
```

### 実践例1: ダッシュボードレイアウト

```html
<div class="dashboard">
  <header class="header">Header</header>
  <aside class="sidebar">Sidebar</aside>
  <main class="main">Main Content</main>
  <footer class="footer">Footer</footer>
</div>
```

```css
.dashboard {
  display: grid;
  grid-template-columns: 250px 1fr;
  grid-template-rows: 60px 1fr 50px;
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
  min-height: 100vh;
  gap: 0;
}

.header {
  grid-area: header;
  background: #2c3e50;
  color: white;
  padding: 1rem;
}

.sidebar {
  grid-area: sidebar;
  background: #34495e;
  color: white;
  padding: 1rem;
}

.main {
  grid-area: main;
  background: #ecf0f1;
  padding: 2rem;
}

.footer {
  grid-area: footer;
  background: #2c3e50;
  color: white;
  padding: 1rem;
  text-align: center;
}
```

### 実践例2: カードグリッド（CSS Grid版）

```html
<div class="card-grid">
  <div class="card">Card 1</div>
  <div class="card">Card 2</div>
  <div class="card">Card 3</div>
  <div class="card">Card 4</div>
  <div class="card">Card 5</div>
  <div class="card">Card 6</div>
</div>
```

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  padding: 2rem;
}

.card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
```

### 実践例3: 複雑なグリッドレイアウト

```html
<div class="gallery">
  <div class="item item-1">1</div>
  <div class="item item-2">2</div>
  <div class="item item-3">3</div>
  <div class="item item-4">4</div>
  <div class="item item-5">5</div>
</div>
```

```css
.gallery {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(3, 200px);
  gap: 1rem;
}

.item-1 {
  grid-column: 1 / 3; /* 1列目から3列目の手前まで（2列分） */
  grid-row: 1 / 3;    /* 1行目から3行目の手前まで（2行分） */
}

.item-2 {
  grid-column: 3 / 5; /* 2列分 */
}

.item-3 {
  grid-column: 3 / 5;
}

.item-4 {
  grid-row: 2 / 4; /* 2行分 */
}

.item-5 {
  grid-column: 2 / 4;
}
```

## Container Queries - 2026年の新標準

Container Queriesは、メディアクエリの進化版で、**親要素のサイズ**に応じてスタイルを変更できます。

### 従来のメディアクエリの問題

```css
/* 画面幅に依存（コンポーネントの再利用性が低い） */
@media (max-width: 768px) {
  .card {
    flex-direction: column;
  }
}
```

同じカードコンポーネントでも、サイドバーに配置する場合とメインコンテンツに配置する場合で、異なるブレイクポイントが必要になります。

### Container Queriesの解決策

```css
.sidebar,
.main-content {
  container-type: inline-size; /* コンテナとして定義 */
  container-name: card-container;
}

.card {
  display: flex;
  gap: 1rem;
}

/* 親要素の幅が500px未満の場合 */
@container card-container (max-width: 500px) {
  .card {
    flex-direction: column;
  }
}
```

### 実践例: レスポンシブカード

```html
<div class="container">
  <article class="product-card">
    <img src="product.jpg" alt="Product">
    <div class="info">
      <h3>Product Title</h3>
      <p>Description</p>
      <button>Buy Now</button>
    </div>
  </article>
</div>
```

```css
.container {
  container-type: inline-size;
  container-name: product;
}

.product-card {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
}

.product-card img {
  width: 150px;
  height: 150px;
  object-fit: cover;
  border-radius: 8px;
}

/* 親要素が400px未満なら縦並び */
@container product (max-width: 400px) {
  .product-card {
    flex-direction: column;
  }

  .product-card img {
    width: 100%;
    height: 200px;
  }
}
```

### Container Query Units

```css
.container {
  container-type: inline-size;
}

.text {
  /* コンテナの幅に応じて文字サイズを変更 */
  font-size: clamp(1rem, 5cqi, 3rem);
  /* cqi = Container Query Inline size (幅の1%) */
}
```

**利用可能な単位:**
- `cqw` - コンテナ幅の1%
- `cqh` - コンテナ高さの1%
- `cqi` - インライン方向（通常は幅）の1%
- `cqb` - ブロック方向（通常は高さ）の1%
- `cqmin` - cqiとcqbの小さい方
- `cqmax` - cqiとcqbの大きい方

## Subgrid - ネストしたグリッドの整列

Subgridは、子グリッドが親グリッドのトラック（行・列）を継承できる機能です。

```html
<div class="parent-grid">
  <div class="card">
    <h3>Title 1</h3>
    <p>Short description</p>
    <button>Action</button>
  </div>
  <div class="card">
    <h3>Title 2</h3>
    <p>This is a much longer description that takes up more space</p>
    <button>Action</button>
  </div>
  <div class="card">
    <h3>Title 3</h3>
    <p>Medium length</p>
    <button>Action</button>
  </div>
</div>
```

```css
.parent-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.card {
  display: grid;
  grid-template-rows: subgrid; /* 親のグリッドを継承 */
  grid-row: span 3; /* 3行分のスペース */
  gap: 0.5rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
}

/* すべてのカードのタイトル、説明、ボタンが揃う */
```

## Clamp関数でレスポンシブな値

```css
.title {
  /* 最小1.5rem、最大3rem、画面幅の5%が理想 */
  font-size: clamp(1.5rem, 5vw, 3rem);
}

.container {
  /* 最小320px、最大1200px、画面幅の90%が理想 */
  width: clamp(320px, 90vw, 1200px);
  margin: 0 auto;
}

.gap {
  /* レスポンシブなgap */
  gap: clamp(1rem, 3vw, 3rem);
}
```

## Aspect Ratio - アスペクト比の固定

```css
.video-container {
  aspect-ratio: 16 / 9; /* 16:9の比率を維持 */
  width: 100%;
}

.square {
  aspect-ratio: 1; /* 正方形 */
}

.card-image {
  aspect-ratio: 4 / 3;
  width: 100%;
  object-fit: cover;
}
```

## 実践: モダンなランディングページ

```html
<div class="landing">
  <header class="hero">
    <h1>Welcome</h1>
    <p>Modern CSS Layout</p>
  </header>

  <section class="features">
    <div class="feature">Feature 1</div>
    <div class="feature">Feature 2</div>
    <div class="feature">Feature 3</div>
  </section>

  <section class="cta">
    <button>Get Started</button>
  </section>
</div>
```

```css
.landing {
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
}

.hero {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-align: center;
}

.hero h1 {
  font-size: clamp(2rem, 8vw, 5rem);
  margin: 0;
}

.features {
  container-type: inline-size;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  padding: 4rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.feature {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.cta {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
  background: #f8f9fa;
}

.cta button {
  padding: 1rem 3rem;
  font-size: 1.25rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
```

## CSSレイアウトツール

開発を効率化するツールを活用しましょう。

**DevToolBox** ([https://devtoolbox.app](https://devtoolbox.app))
グラデーションジェネレーター、影ジェネレーター、カラーピッカーなど、CSSコーディングに役立つ無料ツールが揃っています。特にグラデーションツールは、複雑なlinear-gradientを簡単に作成できます。

**その他の便利なツール:**
- CSS Grid Generator - グリッドレイアウトをビジュアルに生成
- Flexbox Playground - Flexboxのプロパティを試せる
- Can I Use - ブラウザ対応状況を確認

## ブラウザ対応状況（2026年）

- **Flexbox** - すべてのモダンブラウザで完全サポート
- **CSS Grid** - すべてのモダンブラウザで完全サポート
- **Container Queries** - Chrome 105+, Firefox 110+, Safari 16+（2026年は完全対応）
- **Subgrid** - Chrome 117+, Firefox 71+, Safari 16+

IE11のサポートが不要なら、すべての機能を安心して使えます。

## まとめ

2026年のCSSレイアウトは、Flexbox、CSS Grid、Container Queriesの3つで大部分をカバーできます。

**使い分けの基本:**
- **1次元レイアウト（行または列）** → Flexbox
- **2次元レイアウト（行と列）** → CSS Grid
- **コンポーネントの再利用性を高める** → Container Queries
- **レスポンシブな値** → clamp関数
- **アスペクト比の固定** → aspect-ratio

floatやposition: absoluteに頼る時代は終わりました。モダンなCSSレイアウトをマスターして、保守性の高いスタイルシートを書きましょう。

CSSのグラデーションや影の生成には、[DevToolBox](https://devtoolbox.app)のグラデーションジェネレーターが便利です。ぜひチェックしてみてください。

---
title: "CSS round()関数でピクセルパーフェクトなレイアウトを実現する"
description: "CSS Values and Units Module Level 4で導入されたround()関数を使えば、計算結果を指定した間隔に丸めることができます。レスポンシブデザインやグリッドレイアウトで威力を発揮します。サンプルコード付きで実践的に解説。"
pubDate: "2025-02-05"
tags: ['CSS', 'フロントエンド']
heroImage: '../../assets/thumbnails/css-round-function.jpg'
---
## CSS round()関数とは

`round()` は CSS の数学関数の一つで、計算結果を指定した間隔（倍数）に丸めることができます。2023年にブラウザサポートが進み、Chrome 107+、Firefox 108+、Safari 15.4+ で利用可能になりました。

### 基本構文

```css
round(<rounding-strategy>, <value>, <interval>)
```

- **rounding-strategy**: 丸め方（省略可能、デフォルトは `nearest`）
  - `nearest`: 最も近い間隔に丸める
  - `up`: 切り上げ
  - `down`: 切り下げ
  - `to-zero`: ゼロ方向に丸める
- **value**: 丸めたい値
- **interval**: 丸める間隔（倍数）

### シンプルな例

```css
/* 10pxの倍数に丸める */
.element {
  width: round(nearest, 47px, 10px);
  /* 結果: 50px */
}

/* 切り下げ */
.element {
  width: round(down, 47px, 10px);
  /* 結果: 40px */
}

/* 切り上げ */
.element {
  width: round(up, 47px, 10px);
  /* 結果: 50px */
}
```

## なぜround()が必要なのか

### 問題: calc()による小数点の誤差

従来の `calc()` 関数では、計算結果が小数点以下の値になることがあります。

```css
.grid-item {
  /* 3カラムグリッド */
  width: calc(100% / 3);
  /* 結果: 33.333333...% */
  /* ブラウザによってレンダリングが微妙にずれる */
}
```

この問題により:
- ピクセルの端数でぼやけた表示
- グリッドアイテム間の隙間の不均一
- サブピクセルレンダリングの不一致

### 解決策: round()で明確な値に

```css
.grid-item {
  width: round(down, calc(100% / 3), 1%);
  /* 結果: 33% (明確な値) */
}
```

## 実践的な使用例

### 1. レスポンシブグリッドの最適化

コンテナクエリと組み合わせて、常にピクセルパーフェクトなグリッドを実現:

```css
.grid {
  display: grid;
  gap: 1rem;
}

.grid-item {
  /* コンテナ幅を3で割り、16pxの倍数に丸める */
  width: round(nearest, calc(100cqw / 3), 16px);
}

/* 5カラムの場合 */
.grid-5col .grid-item {
  width: round(down, calc(100cqw / 5), 8px);
}
```

### 2. フォントサイズの均一化

フォントサイズを2pxや4pxの倍数に揃えることで、より整ったタイポグラフィに:

```css
:root {
  --base-size: 16px;
}

h1 {
  /* ビューポート幅に基づいて、4pxの倍数に */
  font-size: round(nearest, calc(var(--base-size) + 2vw), 4px);
}

h2 {
  font-size: round(nearest, calc(var(--base-size) + 1.5vw), 4px);
}

p {
  /* 2pxの倍数に */
  font-size: round(nearest, calc(var(--base-size) + 0.5vw), 2px);
}
```

### 3. パディングとマージンの統一

デザインシステムのスペーシングスケールに合わせて丸める:

```css
:root {
  --spacing-unit: 8px;
}

.card {
  /* 動的な値を8pxの倍数に */
  padding: round(nearest, calc(2vw + 0.5rem), var(--spacing-unit));
  margin-bottom: round(nearest, calc(3vh), var(--spacing-unit));
}

.container {
  /* 16pxの倍数に */
  padding-inline: round(nearest, 5vw, 16px);
}
```

### 4. アスペクト比の維持

画像やビデオコンテナで、アスペクト比を保ちながらピクセルパーフェクトに:

```css
.video-container {
  width: 100%;
  /* 16:9のアスペクト比で、ピクセル単位に丸める */
  height: round(nearest, calc(100vw * 9 / 16), 1px);
  max-height: 720px;
}

.square-image {
  width: round(nearest, 30vw, 4px);
  height: round(nearest, 30vw, 4px);
  aspect-ratio: 1;
}
```

### 5. スクロールスナップの調整

スクロールコンテナのアイテムサイズを均一に:

```css
.scroll-container {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  gap: 1rem;
}

.scroll-item {
  flex-shrink: 0;
  /* ビューポート幅の40%を、16pxの倍数に */
  width: round(nearest, 40vw, 16px);
  scroll-snap-align: start;
}
```

## 高度なテクニック

### カスタムプロパティとの組み合わせ

```css
:root {
  --grid-columns: 4;
  --gap: 1rem;
  --snap-interval: 8px;
}

.dynamic-grid {
  display: grid;
  grid-template-columns: repeat(
    var(--grid-columns),
    minmax(
      round(
        nearest,
        calc((100% - (var(--gap) * (var(--grid-columns) - 1))) / var(--grid-columns)),
        var(--snap-interval)
      ),
      1fr
    )
  );
  gap: var(--gap);
}
```

### メディアクエリと併用

```css
.adaptive-element {
  /* モバイル: 4pxの倍数 */
  width: round(nearest, calc(100vw - 2rem), 4px);
}

@media (min-width: 768px) {
  .adaptive-element {
    /* タブレット: 8pxの倍数 */
    width: round(nearest, calc(50vw - 2rem), 8px);
  }
}

@media (min-width: 1024px) {
  .adaptive-element {
    /* デスクトップ: 16pxの倍数 */
    width: round(nearest, calc(33.333vw - 2rem), 16px);
  }
}
```

### clamp()との組み合わせ

最小・最大値を設定しつつ、round()で値を整える:

```css
.responsive-text {
  font-size: clamp(
    16px,
    round(nearest, calc(1rem + 1vw), 2px),
    32px
  );
}

.flexible-container {
  width: clamp(
    320px,
    round(nearest, 80vw, 16px),
    1200px
  );
}
```

## パフォーマンスと最適化

### GPU加速との相性

整数値に丸めることで、GPU加速が効きやすくなります:

```css
.animated-element {
  /* transformは整数値の方がスムーズ */
  transform: translateX(round(nearest, calc(var(--scroll) * 1px), 1px));
  will-change: transform;
}
```

### サブピクセルレンダリングの回避

テキストのシャープさを保つ:

```css
.text-container {
  /* テキストコンテナは整数ピクセルに */
  width: round(nearest, 60vw, 1px);

  /* フォントサイズも整数に */
  font-size: round(nearest, calc(1rem + 0.5vw), 1px);
}
```

## デザインシステムへの統合

### スペーシングスケールの実装

```css
:root {
  --spacing-base: 4px;

  /* スペーシングスケール */
  --space-1: calc(var(--spacing-base) * 1); /* 4px */
  --space-2: calc(var(--spacing-base) * 2); /* 8px */
  --space-3: calc(var(--spacing-base) * 3); /* 12px */
  --space-4: calc(var(--spacing-base) * 4); /* 16px */
  --space-6: calc(var(--spacing-base) * 6); /* 24px */
  --space-8: calc(var(--spacing-base) * 8); /* 32px */
}

.component {
  /* 動的な値をスケールに合わせる */
  padding: round(nearest, calc(2vw), var(--spacing-base));
  margin-block: round(nearest, calc(3vh), var(--spacing-base));
}
```

### グリッドシステムの構築

```css
:root {
  --grid-unit: 8px;
  --grid-columns: 12;
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(
    var(--grid-columns),
    round(
      down,
      calc(100% / var(--grid-columns)),
      var(--grid-unit)
    )
  );
}

.col-4 {
  grid-column: span 4;
  /* 幅を8pxの倍数に */
  padding-inline: round(nearest, 2vw, var(--grid-unit));
}
```

### レスポンシブタイポグラフィ

```css
:root {
  --text-snap: 2px;
}

.heading-xl {
  font-size: round(nearest, clamp(2rem, 5vw, 4rem), var(--text-snap));
  line-height: round(nearest, calc(1.2em), var(--text-snap));
}

.heading-lg {
  font-size: round(nearest, clamp(1.5rem, 4vw, 3rem), var(--text-snap));
}

.heading-md {
  font-size: round(nearest, clamp(1.25rem, 3vw, 2rem), var(--text-snap));
}

.body {
  font-size: round(nearest, clamp(1rem, 2.5vw, 1.125rem), var(--text-snap));
}
```

## ブラウザサポートと代替案

### サポート状況（2025年2月時点）

- Chrome/Edge: 107+
- Firefox: 108+
- Safari: 15.4+

### フォールバック戦略

```css
.element {
  /* フォールバック: calc()のみ */
  width: calc(100% / 3);

  /* round()をサポートしているブラウザのみ */
  width: round(down, calc(100% / 3), 1%);
}
```

### @supportsでの分岐

```css
@supports (width: round(nearest, 100%, 1px)) {
  .modern-layout {
    width: round(nearest, 80vw, 16px);
    padding: round(nearest, 5vw, 8px);
  }
}

@supports not (width: round(nearest, 100%, 1px)) {
  .modern-layout {
    width: 80vw;
    padding: 5vw;
  }
}
```

### PostCSSプラグイン

古いブラウザ向けには、PostCSSでフォールバックを自動生成:

```javascript
// postcss.config.js
module.exports = {
  plugins: [
    require('postcss-round')({
      fallback: true, // フォールバック生成
    }),
  ],
};
```

## 実践プロジェクト例

### レスポンシブカードグリッド

```css
.card-grid {
  --min-card-width: 280px;
  --grid-gap: 1rem;
  --snap: 8px;

  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(
      round(nearest, var(--min-card-width), var(--snap)),
      1fr
    )
  );
  gap: var(--grid-gap);
  padding: round(nearest, 5vw, var(--snap));
}

.card {
  border-radius: round(nearest, calc(0.5rem + 0.5vw), 4px);
  padding: round(nearest, calc(1rem + 1vw), var(--snap));
}

.card-title {
  font-size: round(nearest, clamp(1.25rem, 3vw, 2rem), 2px);
  margin-bottom: round(nearest, calc(0.5rem + 0.5vh), var(--snap));
}
```

### フルード画像ギャラリー

```css
.gallery {
  display: flex;
  flex-wrap: wrap;
  gap: round(nearest, 2vw, 8px);
}

.gallery-item {
  /* 画像サイズを16pxの倍数に */
  flex-basis: round(
    down,
    calc((100% - (round(nearest, 2vw, 8px) * 3)) / 4),
    16px
  );
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: round(nearest, 1vw, 4px);
}

.gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

### モーダルダイアログ

```css
.modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  /* モーダルサイズを16pxの倍数に */
  width: round(nearest, min(90vw, 600px), 16px);
  max-height: round(nearest, 90vh, 16px);

  padding: round(nearest, 5vw, 8px);
  border-radius: round(nearest, 2vw, 4px);
}

.modal-header {
  padding-bottom: round(nearest, 2vh, 8px);
  margin-bottom: round(nearest, 2vh, 8px);
}
```

## デバッグとテスト

### CSS変数で確認

```css
:root {
  --debug: false;
}

.element {
  --original: calc(100% / 3);
  --rounded: round(down, var(--original), 1%);

  width: var(--rounded);
}

/* デバッグモード */
@media (prefers-color-scheme: dark) {
  .element::after {
    content: 'Original: ' var(--original) ', Rounded: ' var(--rounded);
    display: block;
    font-size: 0.75rem;
    color: yellow;
  }
}
```

### DevToolsでの確認

Chrome DevToolsのComputedタブで、round()の計算結果を確認できます。

```css
.test {
  --test-value: 47.3px;
  width: round(nearest, var(--test-value), 10px);
  /* Computed: 50px */
}
```

---

## 関連記事

- [プログラミングスクール比較2026年版｜現役エンジニアが選ぶ厳選8校](/blog/2026-03-08-programming-school-comparison-2026)
- [エンジニア転職完全ガイド2026](/blog/2026-03-09-engineer-career-change-guide-2026)

## まとめ

CSS `round()` 関数は、レスポンシブデザインにおけるピクセルパーフェクトなレイアウトの実現を大幅に簡単にします。

主な利点:
- サブピクセルレンダリングの問題を解決
- デザインシステムのスナップポイントに値を揃えられる
- 計算結果の予測可能性が向上
- GPU加速との相性が良い
- グリッドやフレックスボックスとの組み合わせが強力

2025年現在、主要ブラウザでのサポートも充実しており、実務で積極的に活用できる段階に達しています。特にデザインシステムやコンポーネントライブラリを構築する際には、必須の機能と言えるでしょう。

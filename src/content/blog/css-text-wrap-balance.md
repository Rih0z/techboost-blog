---
title: "CSS text-wrap: balanceで美しいテキストレイアウト"
description: "CSS text-wrap: balanceプロパティを使用して、見出しや短いテキストのレイアウトを自動的に最適化する方法を詳しく解説します。"
pubDate: "2025-02-05"
tags: ['プログラミング']
---

Webデザインにおいて、テキストの折り返しは見た目に大きな影響を与えます。特に見出しやキャッチコピーなどの短いテキストでは、行の長さが不均等になると見栄えが悪くなることがあります。これまで、この問題を解決するには手動で改行を調整するか、JavaScriptを使用する必要がありました。

しかし、CSSの新しいプロパティ **`text-wrap: balance`** を使用することで、ブラウザが自動的にテキストの折り返しを最適化し、バランスの取れたレイアウトを実現できるようになりました。

本記事では、`text-wrap: balance` の使い方、ブラウザサポート状況、実用例、そして注意点について詳しく解説します。

## text-wrap: balance とは

`text-wrap: balance` は、複数行にわたるテキストの各行の長さを均等に調整し、視覚的にバランスの取れたレイアウトを実現するCSSプロパティです。

### 従来の問題

従来のテキスト折り返しでは、以下のような問題が発生していました。

```html
<h1>
  この長い見出しは折り返されると最後の行が短くなってしまう
</h1>
```

**デフォルトの折り返し**:
```
この長い見出しは折り返されると最後の行が
短くなってしまう
```

最後の行だけが極端に短くなり、見た目のバランスが悪くなります。

### text-wrap: balance の効果

```css
h1 {
  text-wrap: balance;
}
```

**バランス調整後**:
```
この長い見出しは折り返されると
最後の行が短くなってしまう
```

各行の長さが均等になり、視覚的に美しいレイアウトになります。

## 基本的な使い方

### 構文

```css
.element {
  text-wrap: balance;
}
```

### 対応する値

`text-wrap` プロパティには以下の値を指定できます。

- **`wrap`** (デフォルト): 通常の折り返し
- **`nowrap`**: 折り返しなし
- **`balance`**: バランス調整された折り返し
- **`pretty`**: 孤立した単語を防ぐ折り返し
- **`stable`**: 編集中に安定した折り返し

## 実用例

### 1. 見出しの最適化

見出しは `text-wrap: balance` の最も効果的な使用例です。

```css
h1, h2, h3, h4, h5, h6 {
  text-wrap: balance;
  max-width: 60ch; /* 読みやすい幅に制限 */
}
```

```html
<h1>
  Revolutionary New Product Launches Next Week
</h1>

<h2>
  Discover the Future of Technology Today
</h2>
```

### 2. キャッチコピー

```css
.hero-tagline {
  text-wrap: balance;
  font-size: 2rem;
  max-width: 40ch;
  margin: 0 auto;
}
```

```html
<p class="hero-tagline">
  最高のユーザー体験を提供するプラットフォーム
</p>
```

### 3. カードのタイトル

```css
.card-title {
  text-wrap: balance;
  font-size: 1.5rem;
  line-height: 1.3;
}
```

```html
<div class="card">
  <h3 class="card-title">
    効率的なチーム協業を実現する新しいツール
  </h3>
  <p class="card-description">
    リモートワークに最適な機能を搭載
  </p>
</div>
```

### 4. ブロック引用

```css
blockquote {
  text-wrap: balance;
  font-style: italic;
  max-width: 50ch;
  margin: 2rem auto;
  padding: 1rem;
  border-left: 4px solid #0066cc;
}
```

```html
<blockquote>
  デザインは単なる見た目ではない。それは機能の表現である。
</blockquote>
```

## text-wrap: pretty との違い

`text-wrap` には `balance` の他に `pretty` という値もあります。この2つの違いを理解することが重要です。

### text-wrap: balance

- **目的**: 各行の長さを均等にする
- **対象**: 短いテキスト（見出しなど）
- **行数制限**: 通常6行まで（ブラウザ依存）

```css
h1 {
  text-wrap: balance;
}
```

### text-wrap: pretty

- **目的**: 最後の行の孤立した単語を防ぐ
- **対象**: 段落などの長いテキスト
- **行数制限**: なし

```css
p {
  text-wrap: pretty;
}
```

**例**:

```html
<!-- prettを使用しない場合 -->
<p>
  This is a long paragraph that wraps to multiple lines and ends with a single
  word.
</p>
<!-- 最後に "word." だけが残る -->

<!-- prettを使用する場合 -->
<p style="text-wrap: pretty;">
  This is a long paragraph that wraps to multiple lines and ends with a single
  word.
</p>
<!-- 最後の2語以上が同じ行に配置される -->
```

## 実践的なスタイルガイド

### グローバル設定

```css
/* ベーススタイル */
:root {
  --max-width-heading: 60ch;
  --max-width-text: 70ch;
}

/* すべての見出しにbalanceを適用 */
h1, h2, h3, h4, h5, h6 {
  text-wrap: balance;
  max-width: var(--max-width-heading);
}

/* 段落にprettyを適用 */
p {
  text-wrap: pretty;
  max-width: var(--max-width-text);
}

/* 単一行のテキストにはbalanceを無効化 */
.single-line {
  text-wrap: nowrap;
}
```

### レスポンシブデザイン

```css
.hero-title {
  text-wrap: balance;
  font-size: clamp(2rem, 5vw, 4rem);
  line-height: 1.2;
  max-width: 20ch;
}

@media (min-width: 768px) {
  .hero-title {
    max-width: 30ch;
  }
}

@media (min-width: 1024px) {
  .hero-title {
    max-width: 40ch;
  }
}
```

### ユーティリティクラス

```css
/* ユーティリティクラス */
.text-wrap-balance {
  text-wrap: balance;
}

.text-wrap-pretty {
  text-wrap: pretty;
}

.text-wrap-none {
  text-wrap: nowrap;
}

.text-wrap-auto {
  text-wrap: wrap;
}
```

```html
<h2 class="text-wrap-balance">
  Important Announcement
</h2>

<p class="text-wrap-pretty">
  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
</p>
```

## パフォーマンスへの影響

`text-wrap: balance` はブラウザが各行の長さを計算する必要があるため、若干のパフォーマンスオーバーヘッドがあります。

### ベストプラクティス

1. **短いテキストにのみ使用**: 見出しやキャッチコピーなど、数行程度のテキストに限定
2. **max-widthと組み合わせる**: テキストの幅を制限することで計算を軽減
3. **長い段落には使用しない**: 長いテキストには `text-wrap: pretty` を使用

```css
/* 推奨 */
h1 {
  text-wrap: balance;
  max-width: 60ch; /* 幅を制限 */
}

/* 非推奨 */
.long-article {
  text-wrap: balance; /* 長いテキストには不適切 */
}
```

## ブラウザサポート状況

2025年2月現在、`text-wrap: balance` のブラウザサポート状況は以下の通りです。

| ブラウザ | サポート状況 |
|----------|-------------|
| Chrome | ✅ 114+ |
| Edge | ✅ 114+ |
| Safari | ✅ 17.5+ |
| Firefox | ✅ 121+ |
| Opera | ✅ 100+ |

### フォールバック戦略

```css
h1 {
  /* フォールバック: 古いブラウザでも動作 */
  max-width: 60ch;

  /* モダンブラウザではbalanceを適用 */
  text-wrap: balance;
}
```

### @supports での条件分岐

```css
@supports (text-wrap: balance) {
  h1 {
    text-wrap: balance;
  }
}

@supports not (text-wrap: balance) {
  h1 {
    /* フォールバックスタイル */
    hyphens: auto;
  }
}
```

## JavaScriptによる動的制御

場合によっては、JavaScriptで動的に `text-wrap` を制御したいこともあります。

```javascript
// text-wrapのサポートをチェック
function supportsTextWrapBalance() {
  return CSS.supports('text-wrap', 'balance');
}

// 条件に応じてtext-wrapを適用
function applyTextWrap(element, condition) {
  if (condition && supportsTextWrapBalance()) {
    element.style.textWrap = 'balance';
  } else {
    element.style.textWrap = 'wrap';
  }
}

// 使用例
const headings = document.querySelectorAll('h1, h2, h3');
headings.forEach(heading => {
  // 3行以下の見出しにのみbalanceを適用
  const lineCount = heading.offsetHeight / parseFloat(
    getComputedStyle(heading).lineHeight
  );

  applyTextWrap(heading, lineCount <= 3);
});
```

## React/Vue での使用例

### React

```tsx
import { CSSProperties } from 'react';

interface HeadingProps {
  children: React.ReactNode;
  balance?: boolean;
}

export function Heading({ children, balance = true }: HeadingProps) {
  const style: CSSProperties = {
    textWrap: balance ? 'balance' : 'wrap',
    maxWidth: '60ch',
  };

  return <h1 style={style}>{children}</h1>;
}

// 使用例
<Heading>
  This is a balanced heading that looks great
</Heading>
```

### Vue

```vue
<template>
  <h1 :style="headingStyle">
    <slot />
  </h1>
</template>

<script setup lang="ts">
import { computed, CSSProperties } from 'vue';

interface Props {
  balance?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  balance: true,
});

const headingStyle = computed<CSSProperties>(() => ({
  textWrap: props.balance ? 'balance' : 'wrap',
  maxWidth: '60ch',
}));
</script>

<!-- 使用例 -->
<Heading :balance="true">
  This is a balanced heading
</Heading>
```

## Tailwind CSS での使用

Tailwind CSS v3.4以降では、`text-wrap` ユーティリティが標準で提供されています。

```html
<!-- balance -->
<h1 class="text-balance max-w-prose">
  This heading will be balanced
</h1>

<!-- pretty -->
<p class="text-pretty max-w-prose">
  This paragraph will avoid orphaned words
</p>

<!-- nowrap -->
<span class="text-nowrap">
  This text will not wrap
</span>
```

カスタム設定:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      textWrap: {
        'balance': 'balance',
        'pretty': 'pretty',
      },
    },
  },
};
```

## まとめ

`text-wrap: balance` は、テキストレイアウトを自動的に最適化する強力なCSSプロパティです。見出しやキャッチコピーなどの短いテキストに適用することで、視覚的に美しいレイアウトを簡単に実現できます。

**主なポイント**:

- **使用場所**: 見出し、キャッチコピー、カードタイトルなどの短いテキスト
- **パフォーマンス**: 短いテキストに限定し、`max-width` と組み合わせる
- **フォールバック**: 古いブラウザでも機能するようにフォールバックを用意
- **prettyとの使い分け**: 見出しには `balance`、段落には `pretty` を使用

2025年現在、主要ブラウザすべてが `text-wrap: balance` をサポートしているため、本番環境で安心して使用できます。ぜひ、あなたのプロジェクトでも試してみてください。

## 参考リンク

- [CSS Text Module Level 4 - text-wrap](https://drafts.csswg.org/css-text-4/#text-wrap)
- [MDN Web Docs - text-wrap](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap)
- [Can I use - text-wrap: balance](https://caniuse.com/mdn-css_properties_text-wrap_balance)

---
title: "CSS light-dark()関数でテーマ切り替えを簡単に実装する"
description: "CSSの新しいlight-dark()関数を使って、ライトモードとダークモードのテーマ切り替えをシンプルに実装する方法を解説します。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。"
pubDate: "2025-02-05"
tags: ['CSS', 'フロントエンド']
heroImage: '../../assets/thumbnails/css-light-dark-function.jpg'
---
ダークモードは、現代のWebアプリケーションには欠かせない機能になっています。しかし、従来の実装方法では、CSS変数を使ったり、JavaScriptでクラスを切り替えたりと、複雑な実装が必要でした。

CSS仕様に新しく追加された**light-dark()関数**を使えば、これらの実装がずっとシンプルになります。この記事では、light-dark()関数の使い方から実践的な実装パターンまで、詳しく解説します。

## light-dark()関数とは？

`light-dark()`は、CSS Color Module Level 5で追加された関数で、カラースキームに応じて自動的に色を切り替えることができます。

### 基本的な構文

```css
/* light-dark(ライトモードの色, ダークモードの色) */
color: light-dark(black, white);
background-color: light-dark(white, #1a1a1a);
```

この関数は、`color-scheme`プロパティの値に応じて、自動的に適切な色を選択します。

## 従来の実装方法との比較

### 従来の方法1: CSS変数とメディアクエリ

```css
:root {
  --text-color: black;
  --bg-color: white;
}

@media (prefers-color-scheme: dark) {
  :root {
    --text-color: white;
    --bg-color: #1a1a1a;
  }
}

body {
  color: var(--text-color);
  background-color: var(--bg-color);
}
```

**問題点**
- CSS変数を定義する必要がある
- メディアクエリを書く必要がある
- コード量が多い

### 従来の方法2: data属性とJavaScript

```css
[data-theme="light"] {
  --text-color: black;
  --bg-color: white;
}

[data-theme="dark"] {
  --text-color: white;
  --bg-color: #1a1a1a;
}

body {
  color: var(--text-color);
  background-color: var(--bg-color);
}
```

```javascript
// JavaScriptでテーマを切り替え
document.documentElement.dataset.theme = "dark";
```

**問題点**
- JavaScriptが必須
- 初期レンダリング時にフラッシュが発生する可能性
- 管理するコードが増える

### light-dark()関数を使った方法

```css
:root {
  color-scheme: light dark;
}

body {
  color: light-dark(black, white);
  background-color: light-dark(white, #1a1a1a);
}
```

**メリット**
- シンプルで直感的
- CSS変数が不要
- ブラウザが自動的に切り替え
- コード量が少ない

## 基本的な使い方

### color-schemeプロパティの設定

light-dark()関数を使うには、まず`color-scheme`プロパティを設定する必要があります。

```css
:root {
  color-scheme: light dark;
}
```

このプロパティは、以下の値を取ります。

- `light`: ライトモードのみ
- `dark`: ダークモードのみ
- `light dark`: 両方サポート（システムの設定に従う）
- `dark light`: 両方サポート（ダークモードを優先）

### light-dark()関数の使用

```css
.button {
  /* テキスト色 */
  color: light-dark(#333, #fff);

  /* 背景色 */
  background-color: light-dark(#f0f0f0, #2a2a2a);

  /* ボーダー色 */
  border-color: light-dark(#ccc, #444);

  /* シャドウ */
  box-shadow: light-dark(
    0 2px 4px rgba(0, 0, 0, 0.1),
    0 2px 4px rgba(255, 255, 255, 0.1)
  );
}
```

### システムの設定に従う

デフォルトでは、ブラウザのカラースキームの設定に従います。

```css
:root {
  color-scheme: light dark;
}

/* システムがライトモードなら白背景、ダークモードなら黒背景 */
body {
  background-color: light-dark(white, black);
}
```

ユーザーは、OSの設定やブラウザの設定で、ライトモード/ダークモードを切り替えられます。

## 手動でテーマを切り替える

システムの設定に加えて、ユーザーが手動でテーマを切り替えられるようにするには、`color-scheme`プロパティを動的に変更します。

### JavaScriptでの切り替え

```javascript
// ライトモードに切り替え
document.documentElement.style.colorScheme = "light";

// ダークモードに切り替え
document.documentElement.style.colorScheme = "dark";

// システムの設定に従う
document.documentElement.style.colorScheme = "light dark";
```

### トグルボタンの実装

```html
<button id="theme-toggle">
  <span class="light-icon">☀️</span>
  <span class="dark-icon">🌙</span>
</button>
```

```css
:root {
  color-scheme: light dark;
}

.dark-icon {
  display: none;
}

:root[style*="color-scheme: dark"] .light-icon {
  display: none;
}

:root[style*="color-scheme: dark"] .dark-icon {
  display: inline;
}
```

```javascript
const toggle = document.getElementById("theme-toggle");
const root = document.documentElement;

// 初期値を取得
const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
  root.style.colorScheme = savedTheme;
}

toggle.addEventListener("click", () => {
  const current = root.style.colorScheme;

  if (current === "dark") {
    root.style.colorScheme = "light";
    localStorage.setItem("theme", "light");
  } else {
    root.style.colorScheme = "dark";
    localStorage.setItem("theme", "dark");
  }
});
```

## 実践的な例

### ナビゲーションバー

```css
:root {
  color-scheme: light dark;
}

.navbar {
  background-color: light-dark(#ffffff, #1a1a1a);
  border-bottom: 1px solid light-dark(#e0e0e0, #333);
  box-shadow: light-dark(
    0 2px 8px rgba(0, 0, 0, 0.1),
    0 2px 8px rgba(0, 0, 0, 0.5)
  );
}

.navbar-link {
  color: light-dark(#333, #fff);
  transition: color 0.2s;
}

.navbar-link:hover {
  color: light-dark(#0066cc, #66b3ff);
}

.navbar-link.active {
  color: light-dark(#0066cc, #66b3ff);
  background-color: light-dark(#f0f0f0, #2a2a2a);
}
```

### カード

```css
.card {
  background-color: light-dark(#fff, #2a2a2a);
  border: 1px solid light-dark(#e0e0e0, #444);
  border-radius: 8px;
  box-shadow: light-dark(
    0 4px 6px rgba(0, 0, 0, 0.1),
    0 4px 6px rgba(0, 0, 0, 0.3)
  );
  padding: 1.5rem;
}

.card-title {
  color: light-dark(#1a1a1a, #fff);
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.card-text {
  color: light-dark(#666, #aaa);
  line-height: 1.6;
}
```

### ボタン

```css
.button {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.button-primary {
  color: white;
  background-color: light-dark(#0066cc, #66b3ff);
  border: none;
}

.button-primary:hover {
  background-color: light-dark(#0052a3, #4da6ff);
}

.button-secondary {
  color: light-dark(#333, #fff);
  background-color: light-dark(#f0f0f0, #333);
  border: 1px solid light-dark(#ccc, #555);
}

.button-secondary:hover {
  background-color: light-dark(#e0e0e0, #444);
}

.button-outline {
  color: light-dark(#0066cc, #66b3ff);
  background-color: transparent;
  border: 2px solid light-dark(#0066cc, #66b3ff);
}

.button-outline:hover {
  color: white;
  background-color: light-dark(#0066cc, #66b3ff);
}
```

### フォーム

```css
.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid light-dark(#ccc, #555);
  border-radius: 6px;
  background-color: light-dark(#fff, #2a2a2a);
  color: light-dark(#333, #fff);
  font-size: 1rem;
}

.form-input:focus {
  outline: none;
  border-color: light-dark(#0066cc, #66b3ff);
  box-shadow: 0 0 0 3px light-dark(
    rgba(0, 102, 204, 0.1),
    rgba(102, 179, 255, 0.1)
  );
}

.form-input::placeholder {
  color: light-dark(#999, #666);
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  color: light-dark(#333, #fff);
  font-weight: 600;
}

.form-error {
  margin-top: 0.25rem;
  color: light-dark(#dc3545, #ff6b7a);
  font-size: 0.875rem;
}
```

### コードブロック

```css
.code-block {
  padding: 1rem;
  border-radius: 8px;
  background-color: light-dark(#f5f5f5, #1e1e1e);
  border: 1px solid light-dark(#e0e0e0, #333);
  overflow-x: auto;
}

.code-block code {
  color: light-dark(#333, #d4d4d4);
  font-family: 'Fira Code', monospace;
  font-size: 0.9rem;
}

.code-inline {
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  background-color: light-dark(#f0f0f0, #2a2a2a);
  color: light-dark(#d73a49, #ff6b7a);
  font-family: 'Fira Code', monospace;
  font-size: 0.9em;
}
```

## 画像の切り替え

light-dark()関数は色だけでなく、画像の切り替えにも使えます。

### 背景画像

```css
.hero {
  background-image: light-dark(
    url('/images/hero-light.jpg'),
    url('/images/hero-dark.jpg')
  );
  background-size: cover;
  background-position: center;
}
```

### ロゴの切り替え

```css
.logo {
  content: light-dark(
    url('/images/logo-dark.svg'),
    url('/images/logo-light.svg')
  );
  width: 150px;
  height: 50px;
}
```

### HTMLでの画像切り替え

HTMLの`<picture>`要素を使う方法もあります。

```html
<picture>
  <source srcset="/images/logo-dark.svg" media="(prefers-color-scheme: light)">
  <source srcset="/images/logo-light.svg" media="(prefers-color-scheme: dark)">
  <img src="/images/logo-dark.svg" alt="Logo">
</picture>
```

## CSS変数との組み合わせ

light-dark()関数とCSS変数を組み合わせることで、より柔軟なテーマシステムを構築できます。

```css
:root {
  color-scheme: light dark;

  /* プライマリカラー */
  --color-primary: light-dark(#0066cc, #66b3ff);
  --color-primary-hover: light-dark(#0052a3, #4da6ff);

  /* テキストカラー */
  --color-text: light-dark(#333, #fff);
  --color-text-secondary: light-dark(#666, #aaa);

  /* 背景色 */
  --color-bg: light-dark(#fff, #1a1a1a);
  --color-bg-secondary: light-dark(#f5f5f5, #2a2a2a);

  /* ボーダー */
  --color-border: light-dark(#e0e0e0, #444);

  /* シャドウ */
  --shadow-sm: light-dark(
    0 1px 2px rgba(0, 0, 0, 0.05),
    0 1px 2px rgba(0, 0, 0, 0.3)
  );
  --shadow-md: light-dark(
    0 4px 6px rgba(0, 0, 0, 0.1),
    0 4px 6px rgba(0, 0, 0, 0.3)
  );
  --shadow-lg: light-dark(
    0 10px 15px rgba(0, 0, 0, 0.1),
    0 10px 15px rgba(0, 0, 0, 0.4)
  );
}

/* 使用例 */
.card {
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
}

.button-primary {
  background-color: var(--color-primary);
  color: white;
}

.button-primary:hover {
  background-color: var(--color-primary-hover);
}
```

## アニメーションとトランジション

テーマ切り替え時にスムーズなアニメーションを追加できます。

```css
:root {
  color-scheme: light dark;
}

body {
  background-color: light-dark(white, #1a1a1a);
  color: light-dark(black, white);
  transition: background-color 0.3s ease, color 0.3s ease;
}

.card {
  background-color: light-dark(white, #2a2a2a);
  border-color: light-dark(#e0e0e0, #444);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.button {
  background-color: light-dark(#0066cc, #66b3ff);
  transition: background-color 0.3s ease;
}
```

## ブラウザサポート

light-dark()関数は比較的新しい機能のため、ブラウザサポートを確認する必要があります。

### サポート状況（2025年2月時点）

- Chrome/Edge: 123+
- Firefox: 120+
- Safari: 17.5+

### フォールバック

古いブラウザのために、フォールバックを用意します。

```css
:root {
  color-scheme: light dark;
}

body {
  /* フォールバック */
  background-color: white;
  color: black;

  /* light-dark()をサポートしているブラウザで上書き */
  background-color: light-dark(white, #1a1a1a);
  color: light-dark(black, white);
}

@media (prefers-color-scheme: dark) {
  body {
    /* light-dark()をサポートしていないブラウザ用 */
    background-color: #1a1a1a;
    color: white;
  }
}
```

### CSS Feature Queryを使う

```css
@supports (color: light-dark(white, black)) {
  /* light-dark()をサポートしているブラウザ用 */
  body {
    background-color: light-dark(white, #1a1a1a);
  }
}

@supports not (color: light-dark(white, black)) {
  /* サポートしていないブラウザ用 */
  body {
    background-color: white;
  }

  @media (prefers-color-scheme: dark) {
    body {
      background-color: #1a1a1a;
    }
  }
}
```

## まとめ

light-dark()関数を使えば、ダークモードの実装がずっとシンプルになります。

**メリット**

- コード量が大幅に削減
- CSS変数の定義が不要
- メディアクエリの記述が不要
- ブラウザが自動的に切り替え
- 直感的で読みやすい

**使い所**

- 新規プロジェクト
- モダンブラウザをターゲットとしたアプリ
- シンプルなテーマ切り替え

**注意点**

- ブラウザサポートを確認
- 必要に応じてフォールバックを用意
- 古いブラウザをサポートする場合は従来の方法と併用

light-dark()関数は、CSSの新しい標準として、これからのWebデザインを大きく変えていくでしょう。ぜひ、あなたのプロジェクトでも試してみてください。
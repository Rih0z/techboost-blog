---
title: "CSS light-dark()関数活用ガイド"
description: "CSS light-dark()関数の基本からダークモード実装まで実践的に解説。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。実践的なコード例とともに解説しています。導入から応用まで段階的に学べます。"
pubDate: "2025-02-05"
tags: ['CSS', 'フロントエンド', '開発ツール']
---
CSSの`light-dark()`関数は、ダークモード対応を劇的に簡素化する新しい機能です。従来のメディアクエリや複雑なCSS変数の管理から解放され、シンプルで保守しやすいコードでライト・ダークモード対応が可能になります。本記事では、基本構文から実践的な活用方法、ブラウザサポート状況まで徹底解説します。

## light-dark()関数とは

`light-dark()`関数は、CSS Color Module Level 5で導入された新しい関数で、ライトモードとダークモードで異なる値を簡潔に指定できます。

### 基本構文

```css
/* 基本形式 */
color: light-dark(lightModeValue, darkModeValue);

/* 具体例 */
color: light-dark(#000000, #ffffff);
background-color: light-dark(#ffffff, #1a1a1a);
```

この関数は、`color-scheme`プロパティと連携して動作します。

## color-schemeプロパティとの連携

`light-dark()`関数を使用するには、`color-scheme`プロパティの設定が必須です。

### グローバル設定

```css
:root {
  color-scheme: light dark;
}
```

この設定により、ブラウザはシステムの設定に応じて自動的にライト・ダークモードを切り替えます。

### HTMLでの設定

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta name="color-scheme" content="light dark">
  <style>
    :root {
      color-scheme: light dark;
    }

    body {
      background-color: light-dark(#ffffff, #0d1117);
      color: light-dark(#24292f, #e6edf3);
    }
  </style>
</head>
<body>
  <h1>自動的にダークモード対応</h1>
</body>
</html>
```

## 実践的な使用例

### テキストと背景色

```css
:root {
  color-scheme: light dark;
}

body {
  /* 背景: ライトモードは白、ダークモードは濃いグレー */
  background-color: light-dark(#ffffff, #0d1117);

  /* テキスト: ライトモードは黒、ダークモードは白 */
  color: light-dark(#1f2328, #e6edf3);

  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.6;
}

/* リンクの色 */
a {
  color: light-dark(#0969da, #2f81f7);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
```

### カードコンポーネント

```css
.card {
  background-color: light-dark(#f6f8fa, #161b22);
  border: 1px solid light-dark(#d0d7de, #30363d);
  border-radius: 8px;
  padding: 24px;
  box-shadow: light-dark(
    0 1px 3px rgba(0, 0, 0, 0.12),
    0 1px 3px rgba(0, 0, 0, 0.5)
  );
}

.card-title {
  color: light-dark(#1f2328, #e6edf3);
  font-size: 1.5rem;
  margin-bottom: 12px;
}

.card-description {
  color: light-dark(#57606a, #8b949e);
  line-height: 1.5;
}
```

### ボタンスタイル

```css
.button {
  background-color: light-dark(#2da44e, #238636);
  color: #ffffff;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.button:hover {
  background-color: light-dark(#2c974b, #2ea043);
  transform: translateY(-1px);
  box-shadow: light-dark(
    0 4px 8px rgba(0, 0, 0, 0.15),
    0 4px 8px rgba(0, 0, 0, 0.4)
  );
}

.button:active {
  transform: translateY(0);
}

.button-secondary {
  background-color: light-dark(#f6f8fa, #21262d);
  color: light-dark(#24292f, #c9d1d9);
  border: 1px solid light-dark(#d0d7de, #30363d);
}

.button-secondary:hover {
  background-color: light-dark(#f3f4f6, #30363d);
  border-color: light-dark(#bcc4ce, #8b949e);
}
```

### フォーム要素

```css
input[type="text"],
input[type="email"],
textarea {
  background-color: light-dark(#ffffff, #0d1117);
  color: light-dark(#1f2328, #e6edf3);
  border: 1px solid light-dark(#d0d7de, #30363d);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  transition: border-color 0.2s;
}

input:focus,
textarea:focus {
  outline: none;
  border-color: light-dark(#0969da, #1f6feb);
  box-shadow: 0 0 0 3px light-dark(
    rgba(9, 105, 218, 0.1),
    rgba(31, 111, 235, 0.2)
  );
}

input::placeholder,
textarea::placeholder {
  color: light-dark(#6e7781, #6e7681);
}
```

## ダークモード対応の簡素化

従来の方法と比較して、`light-dark()`関数がどれだけコードを簡素化するか見てみましょう。

### 従来の方法（メディアクエリ）

```css
/* ライトモード */
.card {
  background-color: #ffffff;
  color: #000000;
  border: 1px solid #e1e4e8;
}

/* ダークモード */
@media (prefers-color-scheme: dark) {
  .card {
    background-color: #161b22;
    color: #ffffff;
    border: 1px solid #30363d;
  }
}
```

### light-dark()関数を使用

```css
:root {
  color-scheme: light dark;
}

.card {
  background-color: light-dark(#ffffff, #161b22);
  color: light-dark(#000000, #ffffff);
  border: 1px solid light-dark(#e1e4e8, #30363d);
}
```

コードが半分になり、保守性が大幅に向上します。

### CSS変数との組み合わせ

より柔軟な実装のため、CSS変数と組み合わせることも可能です。

```css
:root {
  color-scheme: light dark;

  /* セマンティックカラー */
  --color-primary: light-dark(#0969da, #2f81f7);
  --color-secondary: light-dark(#6e7781, #8b949e);
  --color-success: light-dark(#1a7f37, #3fb950);
  --color-danger: light-dark(#d1242f, #f85149);
  --color-warning: light-dark(#9a6700, #d29922);

  /* 背景色 */
  --bg-primary: light-dark(#ffffff, #0d1117);
  --bg-secondary: light-dark(#f6f8fa, #161b22);
  --bg-tertiary: light-dark(#f3f4f6, #21262d);

  /* ボーダー */
  --border-primary: light-dark(#d0d7de, #30363d);
  --border-secondary: light-dark(#e1e4e8, #21262d);

  /* テキスト */
  --text-primary: light-dark(#1f2328, #e6edf3);
  --text-secondary: light-dark(#57606a, #8b949e);
  --text-tertiary: light-dark(#6e7781, #6e7681);
}

/* 使用例 */
body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.sidebar {
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border-primary);
}

.alert-success {
  background-color: var(--color-success);
  color: white;
  padding: 16px;
  border-radius: 6px;
}
```

## 実践的なコンポーネント例

### ナビゲーションバー

```css
.navbar {
  background-color: light-dark(#ffffff, #161b22);
  border-bottom: 1px solid light-dark(#d0d7de, #30363d);
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  backdrop-filter: blur(10px);
  background-color: light-dark(
    rgba(255, 255, 255, 0.8),
    rgba(22, 27, 34, 0.8)
  );
}

.navbar-brand {
  font-size: 1.25rem;
  font-weight: 700;
  color: light-dark(#1f2328, #e6edf3);
  text-decoration: none;
}

.navbar-menu {
  display: flex;
  gap: 24px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.navbar-link {
  color: light-dark(#57606a, #8b949e);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.navbar-link:hover {
  color: light-dark(#1f2328, #e6edf3);
}

.navbar-link.active {
  color: light-dark(#0969da, #2f81f7);
}
```

### データテーブル

```css
.table {
  width: 100%;
  border-collapse: collapse;
  background-color: light-dark(#ffffff, #0d1117);
  border-radius: 8px;
  overflow: hidden;
}

.table thead {
  background-color: light-dark(#f6f8fa, #161b22);
}

.table th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: light-dark(#1f2328, #e6edf3);
  border-bottom: 2px solid light-dark(#d0d7de, #30363d);
}

.table td {
  padding: 12px 16px;
  color: light-dark(#57606a, #8b949e);
  border-bottom: 1px solid light-dark(#d0d7de, #21262d);
}

.table tbody tr:hover {
  background-color: light-dark(#f6f8fa, #161b22);
}

.table tbody tr:last-child td {
  border-bottom: none;
}
```

### コードブロック

```css
pre {
  background-color: light-dark(#f6f8fa, #161b22);
  border: 1px solid light-dark(#d0d7de, #30363d);
  border-radius: 6px;
  padding: 16px;
  overflow-x: auto;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 14px;
  line-height: 1.5;
}

code {
  color: light-dark(#1f2328, #e6edf3);
}

.code-inline {
  background-color: light-dark(rgba(175, 184, 193, 0.2), rgba(110, 118, 129, 0.4));
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.9em;
}
```

## ブラウザサポートとフォールバック

### サポート状況（2025年2月現在）

- **Chrome/Edge**: 123+（2024年3月〜）
- **Firefox**: 120+（2023年11月〜）
- **Safari**: 17.5+（2024年5月〜）

### フォールバック戦略

最新ブラウザをターゲットにしつつ、古いブラウザのためのフォールバックを提供します。

```css
:root {
  color-scheme: light dark;

  /* フォールバック: 古いブラウザ用 */
  --bg-primary: #ffffff;
  --text-primary: #000000;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #0d1117;
    --text-primary: #e6edf3;
  }
}

/* モダンブラウザ用 */
@supports (background-color: light-dark(#fff, #000)) {
  :root {
    --bg-primary: light-dark(#ffffff, #0d1117);
    --text-primary: light-dark(#000000, #e6edf3);
  }
}

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}
```

### プログレッシブエンハンスメント

```css
/* ベースライン（全ブラウザ対応） */
.card {
  background-color: #ffffff;
  color: #000000;
}

/* ダークモード対応（古い方法） */
@media (prefers-color-scheme: dark) {
  .card {
    background-color: #161b22;
    color: #ffffff;
  }
}

/* light-dark()関数対応ブラウザ */
@supports (background-color: light-dark(#fff, #000)) {
  :root {
    color-scheme: light dark;
  }

  .card {
    background-color: light-dark(#ffffff, #161b22);
    color: light-dark(#000000, #ffffff);
  }
}
```

## パフォーマンスへの影響

`light-dark()`関数は、CSSの解析時に評価されるため、パフォーマンスへの影響はほとんどありません。

### メリット

1. **CSSファイルサイズの削減**: メディアクエリの重複が不要
2. **保守性の向上**: 色の変更が1箇所で完結
3. **ランタイムオーバーヘッドなし**: JavaScriptが不要

### ベストプラクティス

```css
/* Good: セマンティックな変数名 */
:root {
  color-scheme: light dark;
  --color-primary: light-dark(#0969da, #2f81f7);
  --color-text: light-dark(#1f2328, #e6edf3);
}

/* Better: 変数を再利用 */
.button-primary {
  background-color: var(--color-primary);
  color: white;
}

/* Best: コンポーネントベースの変数 */
.button {
  --button-bg: light-dark(#f6f8fa, #21262d);
  --button-text: light-dark(#24292f, #c9d1d9);
  --button-border: light-dark(#d0d7de, #30363d);

  background-color: var(--button-bg);
  color: var(--button-text);
  border: 1px solid var(--button-border);
}
```

## まとめ

CSS `light-dark()`関数は、ダークモード実装を劇的に簡素化する強力なツールです。主な利点は以下の通りです。

- **シンプルなコード**: メディアクエリの重複が不要
- **保守性の向上**: 色の定義が1箇所に集約
- **パフォーマンス**: ランタイムオーバーヘッドなし
- **柔軟性**: CSS変数と組み合わせて強力

モダンブラウザのサポートが広がる中、`light-dark()`関数は今後のスタンダードになっていくでしょう。フォールバック戦略を適切に実装することで、すべてのユーザーに最適な体験を提供できます。

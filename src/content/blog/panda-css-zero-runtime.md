---
title: "Panda CSS入門 — ゼロランタイムCSS-in-JSの実力を検証"
description: "Panda CSSはビルド時にスタイルを抽出するゼロランタイムCSS-in-JS。パターン・レシピ・テーマ設定からTailwindとの比較まで実践的に解説します。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。"
pubDate: "2026-02-05"
tags: ["Panda CSS", "CSS-in-JS", "Styling", "Performance", "プログラミング"]
---
## Panda CSSとは

Panda CSSは、Chakra UIチームが開発したゼロランタイムのCSS-in-JSライブラリです。従来のCSS-in-JS（Emotion、styled-components）と異なり、ランタイムでのスタイル計算を一切行わず、ビルド時に全てのCSSを静的ファイルとして抽出します。

### 主な特徴

1. **ゼロランタイム**: JavaScriptバンドルにスタイリングコードが含まれない
2. **型安全**: TypeScriptで完全な型推論
3. **デザイントークン**: テーマ設定を型安全に管理
4. **レシピ**: コンポーネントバリアントを宣言的に定義
5. **条件付きスタイル**: レスポンシブ・ダークモードを簡潔に記述

## セットアップ

### インストール

```bash
npm install -D @pandacss/dev
npx panda init --postcss
```

### 設定ファイル

`panda.config.ts`:
```typescript
import { defineConfig } from '@pandacss/dev';

export default defineConfig({
  // スキャン対象ファイル
  include: ['./src/**/*.{js,jsx,ts,tsx}'],
  exclude: [],

  // 出力先
  outdir: 'styled-system',

  // テーマ設定
  theme: {
    extend: {
      tokens: {
        colors: {
          primary: { value: '#3b82f6' },
          secondary: { value: '#8b5cf6' },
        },
        spacing: {
          sm: { value: '0.5rem' },
          md: { value: '1rem' },
          lg: { value: '2rem' },
        },
      },
    },
  },
});
```

### package.jsonスクリプト

```json
{
  "scripts": {
    "prepare": "panda codegen",
    "dev": "panda --watch",
    "build": "panda"
  }
}
```

### PostCSS設定

`postcss.config.js`:
```javascript
module.exports = {
  plugins: {
    '@pandacss/dev/postcss': {},
    autoprefixer: {},
  },
};
```

## 基本的な使い方

### cssユーティリティ

```tsx
import { css } from '../styled-system/css';

export function Button() {
  return (
    <button
      className={css({
        bg: 'primary',
        color: 'white',
        px: 'md',
        py: 'sm',
        borderRadius: 'md',
        fontWeight: 'bold',
        _hover: {
          bg: 'blue.600',
        },
      })}
    >
      クリック
    </button>
  );
}
```

ビルド後のCSS:
```css
.bg_primary {
  background-color: var(--colors-primary);
}
.color_white {
  color: white;
}
/* ... */
```

### cxユーティリティ（条件付きクラス）

```tsx
import { css, cx } from '../styled-system/css';

export function Alert({ type }: { type: 'info' | 'error' }) {
  return (
    <div
      className={cx(
        css({ p: 'md', borderRadius: 'md' }),
        type === 'error' && css({ bg: 'red.100', color: 'red.800' }),
        type === 'info' && css({ bg: 'blue.100', color: 'blue.800' })
      )}
    >
      メッセージ
    </div>
  );
}
```

## パターンシステム

Panda CSSのパターンは、再利用可能なレイアウトプリミティブです。

### スタックパターン

```tsx
import { stack } from '../styled-system/patterns';

export function Sidebar() {
  return (
    <div className={stack({ gap: 'md', direction: 'column' })}>
      <nav>ナビゲーション</nav>
      <main>コンテンツ</main>
      <footer>フッター</footer>
    </div>
  );
}
```

### カスタムパターン定義

`panda.config.ts`:
```typescript
export default defineConfig({
  patterns: {
    extend: {
      card: {
        description: 'カードレイアウト',
        properties: {
          padding: { type: 'property', value: 'padding' },
          shadow: { type: 'boolean' },
        },
        transform(props) {
          const { padding = 'md', shadow, ...rest } = props;
          return {
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 'lg',
            padding,
            ...(shadow && {
              boxShadow: 'md',
            }),
            ...rest,
          };
        },
      },
    },
  },
});
```

使用例:
```tsx
import { card } from '../styled-system/patterns';

export function ProductCard() {
  return (
    <div className={card({ padding: 'lg', shadow: true })}>
      <h3>商品名</h3>
      <p>説明文</p>
    </div>
  );
}
```

## レシピシステム

レシピは、コンポーネントのバリアントを型安全に定義する機能です。

### ボタンレシピ

`panda.config.ts`:
```typescript
export default defineConfig({
  theme: {
    extend: {
      recipes: {
        button: {
          className: 'button',
          description: 'ボタンスタイル',
          base: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            borderRadius: 'md',
            cursor: 'pointer',
            transition: 'all 0.2s',
            _disabled: {
              opacity: 0.5,
              cursor: 'not-allowed',
            },
          },
          variants: {
            variant: {
              solid: {
                bg: 'primary',
                color: 'white',
                _hover: { bg: 'blue.600' },
              },
              outline: {
                border: '2px solid',
                borderColor: 'primary',
                color: 'primary',
                _hover: { bg: 'blue.50' },
              },
              ghost: {
                color: 'primary',
                _hover: { bg: 'blue.50' },
              },
            },
            size: {
              sm: { px: '3', py: '1.5', fontSize: 'sm' },
              md: { px: '4', py: '2', fontSize: 'md' },
              lg: { px: '6', py: '3', fontSize: 'lg' },
            },
          },
          defaultVariants: {
            variant: 'solid',
            size: 'md',
          },
        },
      },
    },
  },
});
```

### レシピの使用

```tsx
import { button } from '../styled-system/recipes';

export function ButtonDemo() {
  return (
    <div>
      <button className={button({ variant: 'solid', size: 'sm' })}>
        Small
      </button>

      <button className={button({ variant: 'outline', size: 'md' })}>
        Medium
      </button>

      <button className={button({ variant: 'ghost', size: 'lg' })}>
        Large
      </button>
    </div>
  );
}
```

型推論が効いているため、存在しないバリアントを指定するとTypeScriptエラーになります。

## テーマとデザイントークン

### セマンティックトークン

`panda.config.ts`:
```typescript
export default defineConfig({
  theme: {
    extend: {
      tokens: {
        colors: {
          // プリミティブカラー
          blue: {
            50: { value: '#eff6ff' },
            500: { value: '#3b82f6' },
            900: { value: '#1e3a8a' },
          },
        },
      },
      semanticTokens: {
        colors: {
          // セマンティックカラー
          bg: {
            DEFAULT: { value: '{colors.white}' },
            _dark: { value: '{colors.gray.900}' },
          },
          text: {
            DEFAULT: { value: '{colors.gray.900}' },
            _dark: { value: '{colors.gray.100}' },
          },
          primary: {
            DEFAULT: { value: '{colors.blue.500}' },
            _dark: { value: '{colors.blue.400}' },
          },
        },
      },
    },
  },
});
```

使用例:
```tsx
import { css } from '../styled-system/css';

export function Card() {
  return (
    <div
      className={css({
        bg: 'bg',
        color: 'text',
        borderColor: 'primary',
      })}
    >
      ダークモード対応カード
    </div>
  );
}
```

ダークモード時に自動的に `_dark` のトークンが適用されます。

## レスポンシブデザイン

```tsx
import { css } from '../styled-system/css';

export function Hero() {
  return (
    <section
      className={css({
        px: { base: '4', md: '8', lg: '16' },
        py: { base: '8', md: '16', lg: '24' },
        fontSize: { base: 'xl', md: '2xl', lg: '4xl' },
        textAlign: { base: 'center', lg: 'left' },
      })}
    >
      <h1>レスポンシブなヒーロー</h1>
    </section>
  );
}
```

ブレークポイント設定:
```typescript
// panda.config.ts
export default defineConfig({
  theme: {
    extend: {
      breakpoints: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
    },
  },
});
```

## Tailwindとの比較

### Tailwind CSS

```tsx
<button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
  ボタン
</button>
```

### Panda CSS

```tsx
<button
  className={css({
    bg: 'blue.500',
    _hover: { bg: 'blue.600' },
    color: 'white',
    fontWeight: 'bold',
    py: '2',
    px: '4',
    borderRadius: 'md',
  })}
>
  ボタン
</button>
```

### 比較表

| 項目 | Tailwind | Panda CSS |
|------|----------|-----------|
| 記法 | クラス名文字列 | JavaScriptオブジェクト |
| 型安全性 | プラグイン必要 | ネイティブ対応 |
| 動的スタイル | 複雑 | 簡単 |
| バンドルサイズ | CSS最適化必要 | 自動最適化 |
| 学習コスト | 低 | 中 |
| IDEサポート | 良好 | 優秀 |

## パフォーマンス測定

### バンドルサイズ比較

```bash
# Panda CSSプロジェクト
npm run build

# 出力例
CSS: 12.3 KB (gzip: 3.2 KB)
JS: 45.6 KB (gzip: 15.1 KB)  # スタイリングコードなし
```

### ランタイムパフォーマンス

Panda CSSはゼロランタイムのため、以下のコストがゼロ:
- スタイル計算時間
- メモリ使用量（スタイルオブジェクト保持）
- 再レンダリング時のスタイル再計算

## Next.js統合

### app/layout.tsx

```tsx
import '../styled-system/styles.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
```

### Server Component対応

Panda CSSは静的CSSを生成するため、Server Componentと完全互換です。

```tsx
// app/page.tsx (Server Component)
import { css } from '../styled-system/css';

export default function Page() {
  return (
    <main className={css({ p: 'lg' })}>
      <h1>Server Component with Panda CSS</h1>
    </main>
  );
}
```

## まとめ

Panda CSSは、以下のような場面で特に有効です。

### おすすめケース
- パフォーマンスが重要なプロジェクト
- TypeScriptプロジェクト
- デザインシステム構築
- Server Componentメインのアプリ

### Tailwindを選ぶべきケース
- 素早いプロトタイピング
- チームメンバーがTailwindに慣れている
- 既存のTailwindプラグイン・エコシステムが必要

Panda CSSは、型安全性とパフォーマンスを両立する新世代のスタイリングソリューションです。ゼロランタイムの恩恵は特にモバイル環境で顕著で、JavaScriptバンドルサイズを削減しつつ、優れた開発者体験を提供します。

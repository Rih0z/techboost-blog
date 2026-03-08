---
title: "vanilla-extract完全ガイド - TypeScriptでゼロランタイムCSS-in-JSを実現する最新手法"
description: "vanilla-extractはビルド時にCSSを生成するゼロランタイムCSS-in-JSライブラリ。TypeScript型安全性、静的抽出、テーマ、レスポンシブ、Next.js/Vite統合まで完全網羅。実務で役立つポイントを厳選して解説。"
pubDate: "2025-02-06"
tags: ["vanilla-extract", "CSS-in-JS", "TypeScript", "Zero Runtime", "Styling", "Frontend"]
heroImage: '../../assets/thumbnails/vanilla-extract-css.jpg'
---

## vanilla-extractとは

vanilla-extractは**ゼロランタイムCSS-in-JS**のパイオニアとして、従来のCSS-in-JSライブラリの課題を解決する革新的なソリューションです。

### 従来のCSS-in-JSの問題点

```tsx
// styled-components（ランタイムオーバーヘッド）
const Button = styled.button`
  background: ${props => props.primary ? 'blue' : 'gray'};
  padding: 12px 24px;
`;
// → 実行時にCSSを生成・注入（パフォーマンスコスト）
```

**問題**:
- **ランタイムコスト**: JavaScript実行中にCSS文字列をパース・注入
- **バンドルサイズ増**: ライブラリコード（~15kb）がクライアントに送信
- **SSR複雑化**: サーバー側でのスタイル収集が必要
- **型安全性欠如**: CSS文字列は基本的に型チェック不可

### vanilla-extractの解決策

```ts
// button.css.ts（ビルド時に静的CSS生成）
import { style } from '@vanilla-extract/css';

export const button = style({
  padding: '12px 24px',
  borderRadius: 4,
  selectors: {
    '&:hover': {
      opacity: 0.8
    }
  }
});

export const primary = style({
  background: 'blue',
  color: 'white'
});
```

**利点**:
- **ゼロランタイム**: ビルド時に`.css`ファイルを生成
- **TypeScript完全統合**: プロパティ名・値をすべて型チェック
- **最小バンドル**: CSSのみ送信（JS不要）
- **静的解析可能**: 未使用スタイルの削除が容易

## インストールとセットアップ

### Viteプロジェクト

```bash
npm install @vanilla-extract/css @vanilla-extract/vite-plugin
```

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';

export default defineConfig({
  plugins: [vanillaExtractPlugin()]
});
```

### Next.jsプロジェクト

```bash
npm install @vanilla-extract/css @vanilla-extract/next-plugin
```

```js
// next.config.js
const { createVanillaExtractPlugin } = require('@vanilla-extract/next-plugin');
const withVanillaExtract = createVanillaExtractPlugin();

module.exports = withVanillaExtract({
  // Next.js設定
});
```

### Webpackプロジェクト

```bash
npm install @vanilla-extract/css @vanilla-extract/webpack-plugin
```

```js
// webpack.config.js
const { VanillaExtractPlugin } = require('@vanilla-extract/webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  plugins: [
    new VanillaExtractPlugin(),
    new MiniCssExtractPlugin()
  ],
  module: {
    rules: [
      {
        test: /\.vanilla\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      }
    ]
  }
};
```

## 基本スタイル定義

### styleAPI

```ts
// components/card.css.ts
import { style } from '@vanilla-extract/css';

export const card = style({
  backgroundColor: 'white',
  borderRadius: 8,
  padding: 16,
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',

  // 疑似クラス
  ':hover': {
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  },

  // 疑似要素
  '::before': {
    content: '""',
    display: 'block'
  }
});

export const cardTitle = style({
  fontSize: 24,
  fontWeight: 'bold',
  marginBottom: 8,

  // 親セレクタ参照
  selectors: {
    [`${card}:hover &`]: {
      color: 'blue'
    }
  }
});
```

```tsx
// Card.tsx
import { card, cardTitle } from './card.css';

export const Card = ({ title, children }) => (
  <div className={card}>
    <h2 className={cardTitle}>{title}</h2>
    {children}
  </div>
);
```

### styleVariantsによるバリエーション

```ts
// button.css.ts
import { style, styleVariants } from '@vanilla-extract/css';

const baseButton = style({
  padding: '12px 24px',
  borderRadius: 4,
  border: 'none',
  cursor: 'pointer',
  fontSize: 16,
  fontWeight: 600,
  transition: 'all 0.2s'
});

export const button = styleVariants({
  primary: [baseButton, {
    background: 'blue',
    color: 'white',
    ':hover': { background: 'darkblue' }
  }],
  secondary: [baseButton, {
    background: 'gray',
    color: 'white',
    ':hover': { background: 'darkgray' }
  }],
  outline: [baseButton, {
    background: 'transparent',
    color: 'blue',
    border: '2px solid blue',
    ':hover': { background: 'rgba(0,0,255,0.05)' }
  }]
});

// 使用
import { button } from './button.css';
<button className={button.primary}>送信</button>
```

### 条件付きスタイル（Recipes）

```ts
// button.css.ts
import { recipe } from '@vanilla-extract/recipes';

export const button = recipe({
  base: {
    borderRadius: 4,
    border: 'none',
    cursor: 'pointer'
  },

  variants: {
    color: {
      primary: { background: 'blue', color: 'white' },
      secondary: { background: 'gray', color: 'white' }
    },
    size: {
      small: { padding: '8px 16px', fontSize: 14 },
      medium: { padding: '12px 24px', fontSize: 16 },
      large: { padding: '16px 32px', fontSize: 18 }
    },
    rounded: {
      true: { borderRadius: 999 }
    }
  },

  // バリアント組み合わせの複合スタイル
  compoundVariants: [
    {
      variants: { color: 'primary', size: 'large' },
      style: { boxShadow: '0 4px 12px rgba(0,0,255,0.3)' }
    }
  ],

  defaultVariants: {
    color: 'primary',
    size: 'medium'
  }
});
```

```tsx
// 使用例
import { button } from './button.css';

<button className={button({ color: 'primary', size: 'large', rounded: true })}>
  送信
</button>
```

## テーマシステム

### Contract定義

```ts
// theme.css.ts
import { createThemeContract, createTheme } from '@vanilla-extract/css';

// 1. コントラクト定義（型安全なテーマ構造）
export const themeVars = createThemeContract({
  color: {
    primary: null,
    secondary: null,
    background: null,
    text: null
  },
  spacing: {
    small: null,
    medium: null,
    large: null
  },
  font: {
    body: null,
    heading: null
  }
});

// 2. ライトテーマ
export const lightTheme = createTheme(themeVars, {
  color: {
    primary: '#0070f3',
    secondary: '#7928ca',
    background: '#ffffff',
    text: '#000000'
  },
  spacing: {
    small: '8px',
    medium: '16px',
    large: '32px'
  },
  font: {
    body: 'system-ui, sans-serif',
    heading: 'Georgia, serif'
  }
});

// 3. ダークテーマ
export const darkTheme = createTheme(themeVars, {
  color: {
    primary: '#3291ff',
    secondary: '#b44aff',
    background: '#000000',
    text: '#ffffff'
  },
  spacing: {
    small: '8px',
    medium: '16px',
    large: '32px'
  },
  font: {
    body: 'system-ui, sans-serif',
    heading: 'Georgia, serif'
  }
});
```

### テーマ変数の使用

```ts
// components/header.css.ts
import { style } from '@vanilla-extract/css';
import { themeVars } from '../theme.css';

export const header = style({
  backgroundColor: themeVars.color.primary,
  color: themeVars.color.background,
  padding: themeVars.spacing.medium,
  fontFamily: themeVars.font.heading,

  transition: 'background-color 0.3s, color 0.3s'
});
```

```tsx
// App.tsx
import { lightTheme, darkTheme } from './theme.css';
import { header } from './components/header.css';
import { useState } from 'react';

export const App = () => {
  const [isDark, setIsDark] = useState(false);

  return (
    <div className={isDark ? darkTheme : lightTheme}>
      <header className={header}>
        <button onClick={() => setIsDark(!isDark)}>
          {isDark ? '☀️' : '🌙'}
        </button>
      </header>
    </div>
  );
};
```

### 動的テーマ切り替え

```ts
// theme-switcher.css.ts
import { createGlobalTheme, assignVars } from '@vanilla-extract/css';
import { themeVars } from './theme.css';

// グローバルルートテーマ
export const rootTheme = createGlobalTheme(':root', themeVars, {
  color: {
    primary: '#0070f3',
    secondary: '#7928ca',
    background: '#ffffff',
    text: '#000000'
  },
  spacing: {
    small: '8px',
    medium: '16px',
    large: '32px'
  },
  font: {
    body: 'system-ui',
    heading: 'Georgia'
  }
});

// ダークモード上書き
export const darkMode = style({
  vars: assignVars(themeVars, {
    color: {
      primary: '#3291ff',
      secondary: '#b44aff',
      background: '#000000',
      text: '#ffffff'
    }
  })
});
```

## レスポンシブデザイン

### ブレークポイント定義

```ts
// breakpoints.css.ts
import { createVar } from '@vanilla-extract/css';

export const breakpoints = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1280
} as const;

export const queries = {
  mobile: `screen and (min-width: ${breakpoints.mobile}px)`,
  tablet: `screen and (min-width: ${breakpoints.tablet}px)`,
  desktop: `screen and (min-width: ${breakpoints.desktop}px)`,
  wide: `screen and (min-width: ${breakpoints.wide}px)`
} as const;
```

### メディアクエリスタイル

```ts
// grid.css.ts
import { style } from '@vanilla-extract/css';
import { queries } from './breakpoints.css';

export const grid = style({
  display: 'grid',
  gap: 16,
  gridTemplateColumns: '1fr', // モバイルデフォルト

  '@media': {
    [queries.tablet]: {
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 24
    },
    [queries.desktop]: {
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 32
    },
    [queries.wide]: {
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 40
    }
  }
});
```

### Sprinklesユーティリティ

```ts
// sprinkles.css.ts
import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';
import { queries } from './breakpoints.css';

const responsiveProperties = defineProperties({
  conditions: {
    mobile: {},
    tablet: { '@media': queries.tablet },
    desktop: { '@media': queries.desktop }
  },
  defaultCondition: 'mobile',
  properties: {
    display: ['none', 'flex', 'block', 'grid'],
    flexDirection: ['row', 'column'],
    justifyContent: ['flex-start', 'center', 'flex-end', 'space-between'],
    alignItems: ['flex-start', 'center', 'flex-end', 'stretch'],
    paddingTop: [0, 4, 8, 12, 16, 24, 32],
    paddingBottom: [0, 4, 8, 12, 16, 24, 32],
    paddingLeft: [0, 4, 8, 12, 16, 24, 32],
    paddingRight: [0, 4, 8, 12, 16, 24, 32]
  },
  shorthands: {
    padding: ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'],
    paddingX: ['paddingLeft', 'paddingRight'],
    paddingY: ['paddingTop', 'paddingBottom']
  }
});

const colorProperties = defineProperties({
  conditions: {
    lightMode: {},
    darkMode: { selector: '.dark &' }
  },
  defaultCondition: 'lightMode',
  properties: {
    color: {
      blue: 'blue',
      red: 'red',
      green: 'green'
    },
    backgroundColor: {
      blue: 'blue',
      red: 'red',
      green: 'green'
    }
  }
});

export const sprinkles = createSprinkles(responsiveProperties, colorProperties);
export type Sprinkles = Parameters<typeof sprinkles>[0];
```

```tsx
// 使用例
import { sprinkles } from './sprinkles.css';

<div className={sprinkles({
  display: { mobile: 'block', desktop: 'flex' },
  paddingX: { mobile: 16, desktop: 32 },
  backgroundColor: { lightMode: 'blue', darkMode: 'red' }
})}>
  レスポンシブコンテナ
</div>
```

## グローバルスタイル

```ts
// global.css.ts
import { globalStyle, globalFontFace } from '@vanilla-extract/css';
import { themeVars } from './theme.css';

// カスタムフォント
globalFontFace('CustomFont', {
  src: 'url("/fonts/custom-font.woff2") format("woff2")',
  fontWeight: 400,
  fontStyle: 'normal',
  fontDisplay: 'swap'
});

// リセットCSS
globalStyle('*, *::before, *::after', {
  boxSizing: 'border-box',
  margin: 0,
  padding: 0
});

globalStyle('body', {
  fontFamily: themeVars.font.body,
  color: themeVars.color.text,
  backgroundColor: themeVars.color.background,
  lineHeight: 1.6,
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale'
});

globalStyle('h1, h2, h3, h4, h5, h6', {
  fontFamily: themeVars.font.heading,
  fontWeight: 700,
  lineHeight: 1.2
});

globalStyle('a', {
  color: themeVars.color.primary,
  textDecoration: 'none',
  transition: 'color 0.2s'
});

globalStyle('a:hover', {
  color: themeVars.color.secondary
});
```

## アニメーション

### keyframes

```ts
// animations.css.ts
import { keyframes, style } from '@vanilla-extract/css';

const fadeIn = keyframes({
  '0%': { opacity: 0, transform: 'translateY(20px)' },
  '100%': { opacity: 1, transform: 'translateY(0)' }
});

const spin = keyframes({
  from: { transform: 'rotate(0deg)' },
  to: { transform: 'rotate(360deg)' }
});

export const fadeInAnimation = style({
  animation: `${fadeIn} 0.5s ease-out`
});

export const spinner = style({
  display: 'inline-block',
  width: 40,
  height: 40,
  border: '4px solid rgba(0,0,0,0.1)',
  borderTopColor: 'blue',
  borderRadius: '50%',
  animation: `${spin} 1s linear infinite`
});
```

### 複雑なアニメーション

```ts
// complex-animations.css.ts
import { keyframes, style } from '@vanilla-extract/css';

const bounce = keyframes({
  '0%, 100%': {
    transform: 'translateY(0)',
    animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)'
  },
  '50%': {
    transform: 'translateY(-25%)',
    animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)'
  }
});

const pulse = keyframes({
  '0%, 100%': { opacity: 1 },
  '50%': { opacity: 0.5 }
});

export const bounceAnimation = style({
  animation: `${bounce} 1s infinite`
});

export const pulseAnimation = style({
  animation: `${pulse} 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`
});
```

## TypeScript統合

### 型安全なスタイル

```ts
// typed-styles.css.ts
import { style, styleVariants } from '@vanilla-extract/css';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

export const button = recipe({
  base: { padding: 12 },
  variants: {
    color: {
      primary: { background: 'blue' },
      secondary: { background: 'gray' }
    },
    size: {
      small: { fontSize: 12 },
      large: { fontSize: 18 }
    }
  }
});

// バリアント型を抽出
export type ButtonVariants = RecipeVariants<typeof button>;

// TypeScript型定義
interface ButtonProps extends ButtonVariants {
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button = ({ color, size, children, onClick }: ButtonProps) => (
  <button className={button({ color, size })} onClick={onClick}>
    {children}
  </button>
);
```

### 型安全なテーマ

```ts
// typed-theme.css.ts
import { createThemeContract, createTheme } from '@vanilla-extract/css';

// テーマ構造を型定義
interface ThemeTokens {
  color: {
    primary: string;
    secondary: string;
    error: string;
    success: string;
  };
  spacing: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', string>;
  borderRadius: Record<'sm' | 'md' | 'lg' | 'full', string>;
}

export const vars = createThemeContract<ThemeTokens>({
  color: {
    primary: null,
    secondary: null,
    error: null,
    success: null
  },
  spacing: {
    xs: null,
    sm: null,
    md: null,
    lg: null,
    xl: null
  },
  borderRadius: {
    sm: null,
    md: null,
    lg: null,
    full: null
  }
});

export const lightTheme = createTheme(vars, {
  color: {
    primary: '#0070f3',
    secondary: '#7928ca',
    error: '#ff0000',
    success: '#00ff00'
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '32px',
    xl: '64px'
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '16px',
    full: '9999px'
  }
});
```

## Next.js統合

### App Router対応

```ts
// app/layout.tsx
import { lightTheme } from './theme.css';
import './global.css';

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body className={lightTheme}>
        {children}
      </body>
    </html>
  );
}
```

### Server Components

```tsx
// app/page.tsx（Server Component）
import { container, title } from './page.css';

export default function Home() {
  return (
    <div className={container}>
      <h1 className={title}>Hello vanilla-extract</h1>
    </div>
  );
}
```

```ts
// app/page.css.ts
import { style } from '@vanilla-extract/css';

export const container = style({
  maxWidth: 1200,
  margin: '0 auto',
  padding: 32
});

export const title = style({
  fontSize: 48,
  fontWeight: 'bold',
  marginBottom: 24
});
```

### 動的スタイル（Client Components）

```tsx
// components/DynamicButton.tsx
'use client';

import { button } from './DynamicButton.css';
import { useState } from 'react';

export const DynamicButton = () => {
  const [variant, setVariant] = useState<'primary' | 'secondary'>('primary');

  return (
    <button
      className={button({ color: variant })}
      onClick={() => setVariant(v => v === 'primary' ? 'secondary' : 'primary')}
    >
      切り替え
    </button>
  );
};
```

## パフォーマンス最適化

### CSS Modules vs vanilla-extract

```plaintext
バンドルサイズ比較（プロダクションビルド）

CSS Modules:
- styles.module.css → 2.3kb (gzip: 0.8kb)
- JS bundle増加 → 0kb

vanilla-extract:
- styles.css.ts → 2.1kb (gzip: 0.7kb)
- JS bundle増加 → 0kb（ビルド時に除去）

styled-components:
- コンポーネント定義 → 3.5kb (gzip: 1.2kb)
- ライブラリコード → 15kb (gzip: 5.2kb)
- 合計 → 18.5kb (gzip: 6.4kb)

結論: vanilla-extractは最小バンドル
```

### Tree Shaking

```ts
// design-system.css.ts（大規模スタイルライブラリ）
export const button = style({ /* ... */ });
export const input = style({ /* ... */ });
export const select = style({ /* ... */ });
// 100個のスタイル定義...

// App.tsx（一部のみ使用）
import { button } from './design-system.css';

// ビルド結果: buttonのCSSのみ含まれる（未使用スタイルは除去）
```

### Critical CSS抽出

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';

export default defineConfig({
  plugins: [
    vanillaExtractPlugin({
      identifiers: 'short' // クラス名を短縮（.a, .b, .c...）
    })
  ],
  build: {
    cssCodeSplit: true // ルートごとにCSS分割
  }
});
```

## ベストプラクティス

### ファイル構造

```plaintext
src/
├── styles/
│   ├── theme.css.ts           # テーマ定義
│   ├── global.css.ts          # グローバルスタイル
│   ├── sprinkles.css.ts       # ユーティリティ
│   ├── breakpoints.css.ts     # ブレークポイント
│   └── tokens/
│       ├── colors.css.ts
│       ├── spacing.css.ts
│       └── typography.css.ts
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   └── Button.css.ts      # コロケーション
│   └── Card/
│       ├── Card.tsx
│       └── Card.css.ts
└── app/
    ├── page.tsx
    └── page.css.ts
```

### 命名規則

```ts
// ❌ 悪い例
export const btn = style({ /* ... */ });
export const btnPrimary = style({ /* ... */ });

// ✅ 良い例
export const button = style({ /* ... */ });
export const buttonPrimary = style({ /* ... */ });

// ✅ さらに良い例（Recipes使用）
export const button = recipe({
  base: { /* ... */ },
  variants: {
    variant: {
      primary: { /* ... */ },
      secondary: { /* ... */ }
    }
  }
});
```

### スタイル分離

```ts
// ❌ 悪い例（すべて1ファイル）
// components/Dashboard.css.ts
export const dashboard = style({ /* ... */ });
export const header = style({ /* ... */ });
export const sidebar = style({ /* ... */ });
export const content = style({ /* ... */ });
export const footer = style({ /* ... */ });

// ✅ 良い例（関心事ごとに分離）
// components/Dashboard/Dashboard.css.ts
export const container = style({ /* ... */ });

// components/Dashboard/Header.css.ts
export const header = style({ /* ... */ });

// components/Dashboard/Sidebar.css.ts
export const sidebar = style({ /* ... */ });
```

## 実践例

### デザインシステム構築

```ts
// design-system/tokens.css.ts
export const tokens = {
  color: {
    brand: {
      primary: '#0070f3',
      secondary: '#7928ca',
      tertiary: '#ff0080'
    },
    neutral: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      // ...
      900: '#171717'
    },
    semantic: {
      success: '#00ff00',
      error: '#ff0000',
      warning: '#ffaa00',
      info: '#0070f3'
    }
  },
  spacing: {
    0: '0px',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px'
  },
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px'
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  }
} as const;
```

```ts
// design-system/components/Button.css.ts
import { recipe } from '@vanilla-extract/recipes';
import { tokens } from '../tokens.css';

export const button = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    fontWeight: tokens.fontWeight.semibold,
    transition: 'all 0.2s',
    ':disabled': {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
  },

  variants: {
    variant: {
      solid: {},
      outline: {
        background: 'transparent'
      },
      ghost: {
        background: 'transparent'
      }
    },
    color: {
      primary: {},
      secondary: {},
      error: {}
    },
    size: {
      sm: {
        padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
        fontSize: tokens.fontSize.sm
      },
      md: {
        padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
        fontSize: tokens.fontSize.base
      },
      lg: {
        padding: `${tokens.spacing[4]} ${tokens.spacing[6]}`,
        fontSize: tokens.fontSize.lg
      }
    }
  },

  compoundVariants: [
    {
      variants: { variant: 'solid', color: 'primary' },
      style: {
        background: tokens.color.brand.primary,
        color: 'white',
        ':hover': { background: '#0051cc' }
      }
    },
    {
      variants: { variant: 'outline', color: 'primary' },
      style: {
        border: `2px solid ${tokens.color.brand.primary}`,
        color: tokens.color.brand.primary,
        ':hover': { background: 'rgba(0,112,243,0.05)' }
      }
    }
  ],

  defaultVariants: {
    variant: 'solid',
    color: 'primary',
    size: 'md'
  }
});
```

### ダークモード完全対応

```ts
// theme-system.css.ts
import { createGlobalTheme, createThemeContract } from '@vanilla-extract/css';

export const vars = createThemeContract({
  color: {
    background: {
      primary: null,
      secondary: null,
      tertiary: null
    },
    text: {
      primary: null,
      secondary: null,
      tertiary: null
    },
    border: {
      default: null,
      hover: null
    }
  }
});

export const lightTheme = createGlobalTheme(':root', vars, {
  color: {
    background: {
      primary: '#ffffff',
      secondary: '#f5f5f5',
      tertiary: '#e5e5e5'
    },
    text: {
      primary: '#000000',
      secondary: '#666666',
      tertiary: '#999999'
    },
    border: {
      default: '#e5e5e5',
      hover: '#cccccc'
    }
  }
});

export const darkTheme = createGlobalTheme('.dark', vars, {
  color: {
    background: {
      primary: '#000000',
      secondary: '#1a1a1a',
      tertiary: '#2a2a2a'
    },
    text: {
      primary: '#ffffff',
      secondary: '#aaaaaa',
      tertiary: '#888888'
    },
    border: {
      default: '#333333',
      hover: '#555555'
    }
  }
});
```

## トラブルシューティング

### よくあるエラー

```ts
// ❌ エラー: Cannot find module './styles.css'
import { button } from './styles.css';

// ✅ 修正: .css.ts拡張子が必要
import { button } from './styles.css.ts';
```

```ts
// ❌ エラー: Dynamic values not allowed
const size = 16;
export const box = style({
  padding: size // 実行時の値は使えない
});

// ✅ 修正: 静的な値のみ
export const box = style({
  padding: 16
});
```

### TypeScriptエラー対処

```json
// tsconfig.json
{
  "compilerOptions": {
    "types": ["@vanilla-extract/css/disableRuntimeStyles"]
  }
}
```

## まとめ

vanilla-extractは**ゼロランタイムCSS-in-JS**の決定版として、以下の利点を提供します。

### 主要な利点

1. **ゼロランタイムコスト** - ビルド時にCSSを生成、実行時オーバーヘッドゼロ
2. **TypeScript完全統合** - プロパティ・値の完全な型チェック
3. **最小バンドルサイズ** - CSSのみ送信、JSライブラリ不要
4. **静的解析可能** - Tree Shaking、未使用コード削除が容易
5. **強力なテーマシステム** - 型安全なテーマ定義・切り替え
6. **優れた開発者体験** - IntelliSense、リファクタリング対応

### 採用判断基準

**vanilla-extractを選ぶべき場合**:
- パフォーマンス重視のアプリケーション
- TypeScript型安全性を最大限活用したい
- 大規模デザインシステム構築
- SSG/SSR最適化が必要

**他の選択肢を検討すべき場合**:
- プロトタイピング速度優先（Tailwind CSS）
- 既存のstyled-components資産が大量にある
- ランタイムスタイル生成が必須要件

vanilla-extractは現代的なフロントエンド開発において、パフォーマンスと開発者体験の両立を実現する最良の選択肢の一つです。

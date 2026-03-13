---
title: "Panda CSS完全ガイド — ビルド時CSS-in-JSでゼロランタイムの高速スタイリング"
description: "ビルド時に静的CSSを生成するゼロランタイムCSS-in-JSライブラリPanda CSSの完全ガイド。型安全なスタイリング、レシピパターン、テーマカスタマイズ、実践的な使い方まで徹底解説します。Panda CSS・CSS-in-JS・Stylingに関する実践情報。"
pubDate: "2025-02-06"
tags: ["Panda CSS", "CSS-in-JS", "Styling", "TypeScript", "Zero Runtime", "Design System"]
heroImage: '../../assets/thumbnails/panda-css-guide.jpg'
---
Panda CSSは、ビルド時に静的CSSを生成する次世代のCSS-in-JSライブラリです。ゼロランタイムでパフォーマンスに影響を与えず、完全な型安全性を提供し、直感的なAPIでスタイリングできます。この記事では、Panda CSSの基本から実践的な使い方まで徹底的に解説します。

## Panda CSSとは

Panda CSSは、Chakra UIチームが開発した、ビルド時にCSSを生成する新しいスタイリングソリューションです。従来のCSS-in-JSライブラリの課題を解決し、パフォーマンスと開発体験の両立を実現します。

### 主な特徴

- **ゼロランタイム** - ビルド時にCSSを生成、ランタイムコストなし
- **完全型安全** - TypeScriptで完全な型推論とオートコンプリート
- **ユーティリティファースト** - Tailwind風の記述も可能
- **レシピパターン** - コンポーネントバリアントの定義が簡単
- **トークンベース** - デザイントークンで一貫したデザインシステム
- **条件付きスタイル** - レスポンシブ・ダークモード・Hover等を直感的に
- **フレームワーク非依存** - React、Vue、Solid、Svelteで動作
- **小さなバンドルサイズ** - 生成されるCSSのみで、JS実行なし

### なぜPanda CSSなのか

```typescript
// 従来のCSS-in-JS（styled-components等）
// ❌ ランタイムでスタイル計算 → パフォーマンス低下
// ❌ バンドルサイズ増加
// ❌ SSR時のハイドレーションコスト

// Panda CSS
// ✅ ビルド時にCSS生成 → ゼロランタイム
// ✅ 静的CSS出力でキャッシュ可能
// ✅ 型安全で開発体験向上
// ✅ ファイルサイズ最小化
```

## インストールとセットアップ

### 初期設定

```bash
# Panda CSSのインストール
npm install -D @pandacss/dev

# 初期化
npx panda init

# PostCSSプラグイン（オプション）
npm install -D @pandacss/postcss
```

### 設定ファイル

```typescript
// panda.config.ts
import { defineConfig } from '@pandacss/dev';

export default defineConfig({
  // 監視対象ファイル
  include: ['./src/**/*.{js,jsx,ts,tsx}'],
  exclude: [],

  // 出力ディレクトリ
  outdir: 'styled-system',

  // プリフライト（リセットCSS）
  preflight: true,

  // JSX framework
  jsxFramework: 'react',

  // テーマ設定
  theme: {
    extend: {
      tokens: {
        colors: {
          primary: { value: '#0070f3' },
          secondary: { value: '#ff4081' },
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

### package.jsonのスクリプト

```json
{
  "scripts": {
    "prepare": "panda codegen",
    "dev": "panda --watch"
  }
}
```

### CSSのインポート

```tsx
// src/index.tsx or src/App.tsx
import './index.css';
```

```css
/* src/index.css */
@layer reset, base, tokens, recipes, utilities;
```

## 基本的な使い方

### cssユーティリティ

```tsx
import { css } from '../styled-system/css';

export const Button = () => {
  return (
    <button
      className={css({
        bg: 'blue.500',
        color: 'white',
        px: '4',
        py: '2',
        borderRadius: 'md',
        fontWeight: 'bold',
        _hover: {
          bg: 'blue.600',
        },
      })}
    >
      Click me
    </button>
  );
};
```

### JSXスタイルプロップ

```tsx
import { styled } from '../styled-system/jsx';

export const Box = () => {
  return (
    <styled.div
      bg="gray.100"
      p="4"
      borderRadius="lg"
      _hover={{
        bg: 'gray.200',
      }}
    >
      Styled Box
    </styled.div>
  );
};
```

### カスタムコンポーネント

```tsx
import { styled } from '../styled-system/jsx';

// styled.divベースのカスタムコンポーネント
const Card = styled('div', {
  base: {
    bg: 'white',
    p: '6',
    borderRadius: 'lg',
    boxShadow: 'md',
  },
});

export const MyCard = () => {
  return (
    <Card>
      <h2>Card Title</h2>
      <p>Card content goes here</p>
    </Card>
  );
};
```

## レスポンシブデザイン

### ブレークポイント

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

### レスポンシブスタイル

```tsx
import { css } from '../styled-system/css';

export const ResponsiveBox = () => {
  return (
    <div
      className={css({
        // モバイル
        fontSize: 'sm',
        p: '2',

        // タブレット以上
        md: {
          fontSize: 'md',
          p: '4',
        },

        // デスクトップ以上
        lg: {
          fontSize: 'lg',
          p: '6',
        },
      })}
    >
      Responsive content
    </div>
  );
};
```

### 配列記法

```tsx
<styled.div
  fontSize={['sm', 'md', 'lg', 'xl']}
  padding={['2', '4', '6', '8']}
  // sm: sm, md: md, lg: lg, xl: xl
>
  Array notation
</styled.div>
```

## デザイントークン

### カラートークン

```typescript
// panda.config.ts
export default defineConfig({
  theme: {
    extend: {
      tokens: {
        colors: {
          brand: {
            50: { value: '#e3f2fd' },
            100: { value: '#bbdefb' },
            200: { value: '#90caf9' },
            300: { value: '#64b5f6' },
            400: { value: '#42a5f5' },
            500: { value: '#2196f3' },
            600: { value: '#1e88e5' },
            700: { value: '#1976d2' },
            800: { value: '#1565c0' },
            900: { value: '#0d47a1' },
          },
        },
      },
    },
  },
});
```

使用例:

```tsx
<styled.button bg="brand.500" color="white" _hover={{ bg: 'brand.600' }}>
  Brand Button
</styled.button>
```

### スペーシングトークン

```typescript
export default defineConfig({
  theme: {
    extend: {
      tokens: {
        spacing: {
          xs: { value: '0.25rem' },
          sm: { value: '0.5rem' },
          md: { value: '1rem' },
          lg: { value: '2rem' },
          xl: { value: '4rem' },
        },
      },
    },
  },
});
```

### セマンティックトークン

```typescript
export default defineConfig({
  theme: {
    extend: {
      semanticTokens: {
        colors: {
          bg: {
            primary: { value: '{colors.white}' },
            secondary: { value: '{colors.gray.100}' },
          },
          text: {
            primary: { value: '{colors.gray.900}' },
            secondary: { value: '{colors.gray.600}' },
          },
        },
      },
    },
  },
});
```

## レシピパターン（Recipes）

### 基本的なレシピ

```typescript
// panda.config.ts
export default defineConfig({
  theme: {
    extend: {
      recipes: {
        button: {
          base: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: '4',
            py: '2',
            borderRadius: 'md',
            fontWeight: 'semibold',
            cursor: 'pointer',
            transition: 'all 0.2s',
          },
          variants: {
            variant: {
              solid: {
                bg: 'blue.500',
                color: 'white',
                _hover: { bg: 'blue.600' },
              },
              outline: {
                border: '2px solid',
                borderColor: 'blue.500',
                color: 'blue.500',
                _hover: { bg: 'blue.50' },
              },
              ghost: {
                color: 'blue.500',
                _hover: { bg: 'blue.50' },
              },
            },
            size: {
              sm: { px: '3', py: '1', fontSize: 'sm' },
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

使用例:

```tsx
import { button } from '../styled-system/recipes';

export const Button = ({ variant, size, children }) => {
  return <button className={button({ variant, size })}>{children}</button>;
};

// 使用
<Button variant="solid" size="lg">Click me</Button>
<Button variant="outline" size="sm">Cancel</Button>
<Button variant="ghost">Ghost Button</Button>
```

### 複雑なレシピ

```typescript
export default defineConfig({
  theme: {
    extend: {
      recipes: {
        card: {
          base: {
            bg: 'white',
            borderRadius: 'lg',
            overflow: 'hidden',
          },
          variants: {
            variant: {
              elevated: {
                boxShadow: 'lg',
              },
              outline: {
                border: '1px solid',
                borderColor: 'gray.200',
              },
              filled: {
                bg: 'gray.100',
              },
            },
            size: {
              sm: { p: '4' },
              md: { p: '6' },
              lg: { p: '8' },
            },
            interactive: {
              true: {
                cursor: 'pointer',
                transition: 'all 0.2s',
                _hover: {
                  transform: 'translateY(-2px)',
                  boxShadow: 'xl',
                },
              },
            },
          },
          compoundVariants: [
            {
              variant: 'outline',
              interactive: true,
              css: {
                _hover: {
                  borderColor: 'blue.500',
                },
              },
            },
          ],
          defaultVariants: {
            variant: 'elevated',
            size: 'md',
          },
        },
      },
    },
  },
});
```

## スロットレシピ（Slot Recipes）

複数パーツを持つコンポーネント向け:

```typescript
// panda.config.ts
export default defineConfig({
  theme: {
    extend: {
      slotRecipes: {
        alert: {
          slots: ['root', 'icon', 'title', 'description'],
          base: {
            root: {
              display: 'flex',
              gap: '3',
              p: '4',
              borderRadius: 'md',
            },
            icon: {
              flexShrink: 0,
              fontSize: 'xl',
            },
            title: {
              fontWeight: 'bold',
              fontSize: 'md',
            },
            description: {
              fontSize: 'sm',
              color: 'gray.600',
            },
          },
          variants: {
            status: {
              info: {
                root: { bg: 'blue.50', borderLeft: '4px solid', borderColor: 'blue.500' },
                icon: { color: 'blue.500' },
                title: { color: 'blue.800' },
              },
              success: {
                root: { bg: 'green.50', borderLeft: '4px solid', borderColor: 'green.500' },
                icon: { color: 'green.500' },
                title: { color: 'green.800' },
              },
              warning: {
                root: { bg: 'yellow.50', borderLeft: '4px solid', borderColor: 'yellow.500' },
                icon: { color: 'yellow.500' },
                title: { color: 'yellow.800' },
              },
              error: {
                root: { bg: 'red.50', borderLeft: '4px solid', borderColor: 'red.500' },
                icon: { color: 'red.500' },
                title: { color: 'red.800' },
              },
            },
          },
          defaultVariants: {
            status: 'info',
          },
        },
      },
    },
  },
});
```

使用例:

```tsx
import { alert } from '../styled-system/recipes';

export const Alert = ({ status, title, description }) => {
  const classes = alert({ status });

  return (
    <div className={classes.root}>
      <div className={classes.icon}>ℹ️</div>
      <div>
        <div className={classes.title}>{title}</div>
        <div className={classes.description}>{description}</div>
      </div>
    </div>
  );
};

// 使用
<Alert status="success" title="Success!" description="Your action completed." />
```

## 条件付きスタイル

### 疑似クラス

```tsx
<styled.button
  bg="blue.500"
  color="white"
  _hover={{ bg: 'blue.600' }}
  _active={{ bg: 'blue.700' }}
  _focus={{ outline: '2px solid', outlineColor: 'blue.400' }}
  _disabled={{ opacity: 0.5, cursor: 'not-allowed' }}
>
  Interactive Button
</styled.button>
```

### 疑似要素

```tsx
<styled.div
  position="relative"
  _before={{
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '2px',
    bg: 'blue.500',
  }}
  _after={{
    content: '"→"',
    ml: '2',
  }}
>
  Content with pseudo-elements
</styled.div>
```

### データ属性

```tsx
<styled.div
  data-state="active"
  _data-state-active={{ bg: 'blue.500', color: 'white' }}
  _data-state-inactive={{ bg: 'gray.100', color: 'gray.600' }}
>
  Data attribute styling
</styled.div>
```

## ダークモード対応

### 設定

```typescript
// panda.config.ts
export default defineConfig({
  conditions: {
    dark: '[data-theme=dark] &',
  },
  // または
  // conditions: {
  //   dark: '.dark &',
  // },
});
```

### 使用例

```tsx
<styled.div
  bg="white"
  color="gray.900"
  _dark={{
    bg: 'gray.900',
    color: 'white',
  }}
>
  Dark mode aware component
</styled.div>
```

### セマンティックトークンでダークモード

```typescript
// panda.config.ts
export default defineConfig({
  theme: {
    extend: {
      semanticTokens: {
        colors: {
          bg: {
            primary: {
              value: { base: '{colors.white}', _dark: '{colors.gray.900}' },
            },
            secondary: {
              value: { base: '{colors.gray.100}', _dark: '{colors.gray.800}' },
            },
          },
          text: {
            primary: {
              value: { base: '{colors.gray.900}', _dark: '{colors.white}' },
            },
            secondary: {
              value: { base: '{colors.gray.600}', _dark: '{colors.gray.400}' },
            },
          },
        },
      },
    },
  },
});
```

使用例:

```tsx
<styled.div bg="bg.primary" color="text.primary">
  Automatically adapts to dark mode
</styled.div>
```

## パターンとレイアウト

### Flexレイアウト

```tsx
import { flex } from '../styled-system/patterns';

<div
  className={flex({
    direction: 'row',
    align: 'center',
    justify: 'space-between',
    gap: '4',
  })}
>
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>;
```

### Gridレイアウト

```tsx
import { grid } from '../styled-system/patterns';

<div
  className={grid({
    columns: 3,
    gap: '4',
  })}
>
  <div>Cell 1</div>
  <div>Cell 2</div>
  <div>Cell 3</div>
</div>;
```

### Stackパターン

```tsx
import { stack, hstack, vstack } from '../styled-system/patterns';

// 垂直スタック
<div className={vstack({ gap: '4' })}>
  <div>Item 1</div>
  <div>Item 2</div>
</div>;

// 水平スタック
<div className={hstack({ gap: '4' })}>
  <div>Item 1</div>
  <div>Item 2</div>
</div>;
```

### カスタムパターン

```typescript
// panda.config.ts
export default defineConfig({
  patterns: {
    container: {
      properties: {
        maxWidth: { type: 'string' },
      },
      transform(props) {
        return {
          maxWidth: props.maxWidth || '1200px',
          mx: 'auto',
          px: '4',
        };
      },
    },
  },
});
```

使用例:

```tsx
import { container } from '../styled-system/patterns';

<div className={container({ maxWidth: '1400px' })}>Container content</div>;
```

## アニメーション

### トランジション

```tsx
<styled.div
  bg="blue.500"
  transition="all 0.3s ease-in-out"
  _hover={{
    bg: 'blue.600',
    transform: 'scale(1.05)',
  }}
>
  Animated on hover
</styled.div>
```

### キーフレームアニメーション

```typescript
// panda.config.ts
export default defineConfig({
  theme: {
    extend: {
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
      },
    },
  },
});
```

使用例:

```tsx
<styled.div animation="fadeIn 0.5s ease-in">Fade in animation</styled.div>

<styled.div animation="slideUp 0.3s ease-out">Slide up animation</styled.div>
```

## Vueでの使用

```vue
<script setup lang="ts">
import { css } from '../styled-system/css';

const buttonClass = css({
  bg: 'blue.500',
  color: 'white',
  px: '4',
  py: '2',
  borderRadius: 'md',
  _hover: { bg: 'blue.600' },
});
</script>

<template>
  <button :class="buttonClass">Click me</button>
</template>
```

## Solidでの使用

```tsx
import { css } from '../styled-system/css';

export const Button = () => {
  return (
    <button
      class={css({
        bg: 'blue.500',
        color: 'white',
        px: '4',
        py: '2',
        _hover: { bg: 'blue.600' },
      })}
    >
      Click me
    </button>
  );
};
```

## パフォーマンス最適化

### Atomic CSS生成

Panda CSSは自動的にAtomic CSSを生成:

```css
/* 生成されるCSS */
.bg_blue\\.500 {
  background: #3b82f6;
}
.color_white {
  color: #fff;
}
.px_4 {
  padding-left: 1rem;
  padding-right: 1rem;
}
```

### 未使用CSSの削除

ビルド時に使用されているスタイルのみ生成されるため、バンドルサイズは最小化されます。

### 静的抽出

```bash
# ビルド時に静的CSS生成
npm run build
```

## まとめ

Panda CSSは、CSS-in-JSの新しいパラダイムを提案する革新的なライブラリです。

**主な利点:**
- ゼロランタイムで最高のパフォーマンス
- 完全な型安全性で開発体験向上
- レシピパターンで再利用可能なスタイル
- デザイントークンで一貫したデザインシステム
- フレームワーク非依存で柔軟

**こんなプロジェクトに最適:**
- パフォーマンスが重要なアプリケーション
- 型安全なスタイリングが必要
- デザインシステムを構築したい
- ユーティリティファーストが好き

Panda CSSは、styled-componentsやEmotionのような従来のCSS-in-JSライブラリの問題を解決し、Tailwind CSSのような直感性とTypeScriptの型安全性を組み合わせた、次世代のスタイリングソリューションです。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)

---
title: "shadcn/ui テーマカスタマイズ完全ガイド - CSS変数からダークモードまで"
description: "shadcn/uiのテーマシステムを徹底解説。CSS変数ベースのカラーシステム、ダークモード実装、カスタムテーマ作成、アニメーション、レスポンシブデザインまで実践的に学びます。"
pubDate: "2025-02-05"
---

## shadcn/uiのテーマシステム

shadcn/uiは、コピー&ペーストで使えるReactコンポーネントライブラリですが、その核心にあるのが柔軟なテーマシステムです。CSS変数ベースのデザイントークンにより、簡単にブランドカラーに合わせたカスタマイズが可能です。

### テーマシステムの特徴

- **CSS変数ベース**: HSL色空間を使用した柔軟なカラーシステム
- **ダークモード対応**: ライト/ダークモードの切り替えが簡単
- **アクセシビリティ**: WCAG準拠のコントラスト比
- **Tailwind統合**: Tailwindのユーティリティクラスと完全統合
- **型安全**: TypeScriptで型付けされたテーマ設定

## 基本セットアップ

### インストール

```bash
# Next.jsプロジェクトを作成
npx create-next-app@latest my-app --typescript --tailwind --app

cd my-app

# shadcn/ui初期化
npx shadcn@latest init

# 対話形式で設定
# - Style: Default または New York
# - Base color: Slate, Gray, Zinc, etc.
# - CSS variables: Yes
```

### グローバルCSS設定

```css
/* app/globals.css */

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* ライトモードのカラー */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;

    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;

    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;

    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;

    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;

    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;

    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;

    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;

    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;

    --radius: 0.5rem;
  }

  .dark {
    /* ダークモードのカラー */
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;

    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;

    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;

    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;

    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;

    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;

    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;

    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;

    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

## カスタムテーマの作成

### ブランドカラーの適用

例えば、紫色ベースのブランドカラーを適用してみましょう。

```css
/* app/globals.css */

@layer base {
  :root {
    /* 紫ベースのカラーパレット */
    --background: 0 0% 100%;
    --foreground: 270 10% 10%;

    --primary: 262 83% 58%; /* 紫 */
    --primary-foreground: 0 0% 100%;

    --secondary: 270 50% 95%;
    --secondary-foreground: 270 10% 20%;

    --muted: 270 30% 96%;
    --muted-foreground: 270 10% 45%;

    --accent: 280 85% 65%; /* ピンクアクセント */
    --accent-foreground: 0 0% 100%;

    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;

    --border: 270 20% 90%;
    --input: 270 20% 90%;
    --ring: 262 83% 58%;

    --radius: 0.75rem; /* より丸みを持たせる */
  }

  .dark {
    --background: 270 20% 8%;
    --foreground: 270 10% 95%;

    --primary: 262 83% 65%;
    --primary-foreground: 270 10% 10%;

    --secondary: 270 20% 15%;
    --secondary-foreground: 270 10% 95%;

    --muted: 270 20% 15%;
    --muted-foreground: 270 10% 70%;

    --accent: 280 85% 70%;
    --accent-foreground: 270 10% 10%;

    --destructive: 0 62% 50%;
    --destructive-foreground: 0 0% 100%;

    --border: 270 20% 20%;
    --input: 270 20% 20%;
    --ring: 262 83% 65%;
  }
}
```

### テーマジェネレーターの活用

shadcn/uiのテーマジェネレーターを使うと、視覚的にテーマを作成できます。

```typescript
// lib/theme-generator.ts

import { hslToHex, hexToHsl } from '@/lib/color-utils'

export function generateTheme(primaryColor: string) {
  const hsl = hexToHsl(primaryColor)

  return {
    light: {
      primary: `${hsl.h} ${hsl.s}% ${hsl.l}%`,
      primaryForeground: '0 0% 100%',
      secondary: `${hsl.h} ${hsl.s * 0.3}% 96%`,
      accent: `${(hsl.h + 20) % 360} ${hsl.s}% ${Math.min(hsl.l + 10, 95)}%`,
    },
    dark: {
      primary: `${hsl.h} ${hsl.s}% ${Math.min(hsl.l + 10, 80)}%`,
      primaryForeground: `${hsl.h} ${hsl.s * 0.2}% 10%`,
      secondary: `${hsl.h} ${hsl.s * 0.3}% 15%`,
      accent: `${(hsl.h + 20) % 360} ${hsl.s}% ${Math.min(hsl.l + 15, 85)}%`,
    },
  }
}
```

## ダークモード実装

### next-themesセットアップ

```bash
npm install next-themes
```

```typescript
// components/theme-provider.tsx

'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { type ThemeProviderProps } from 'next-themes/dist/types'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

```typescript
// app/layout.tsx

import { ThemeProvider } from '@/components/theme-provider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### テーマ切り替えボタン

```typescript
// components/theme-toggle.tsx

'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ThemeToggle() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">テーマ切り替え</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          ライト
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          ダーク
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          システム
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

## 複数テーマのサポート

複数のカラーテーマを切り替えられるようにします。

```css
/* app/globals.css */

/* デフォルトテーマ */
:root {
  /* ... */
}

/* 紫テーマ */
[data-theme="purple"] {
  --primary: 262 83% 58%;
  --accent: 280 85% 65%;
  /* ... */
}

/* 緑テーマ */
[data-theme="green"] {
  --primary: 142 76% 36%;
  --accent: 142 76% 50%;
  /* ... */
}

/* 青テーマ */
[data-theme="blue"] {
  --primary: 221 83% 53%;
  --accent: 199 89% 48%;
  /* ... */
}

/* オレンジテーマ */
[data-theme="orange"] {
  --primary: 24 100% 50%;
  --accent: 38 100% 50%;
  /* ... */
}
```

```typescript
// components/theme-customizer.tsx

'use client'

import { Button } from '@/components/ui/button'

const themes = [
  { name: 'Default', value: 'default' },
  { name: 'Purple', value: 'purple' },
  { name: 'Green', value: 'green' },
  { name: 'Blue', value: 'blue' },
  { name: 'Orange', value: 'orange' },
]

export function ThemeCustomizer() {
  const [currentTheme, setCurrentTheme] = React.useState('default')

  const handleThemeChange = (theme: string) => {
    setCurrentTheme(theme)
    if (theme === 'default') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }

  return (
    <div className="flex gap-2">
      {themes.map((theme) => (
        <Button
          key={theme.value}
          variant={currentTheme === theme.value ? 'default' : 'outline'}
          onClick={() => handleThemeChange(theme.value)}
        >
          {theme.name}
        </Button>
      ))}
    </div>
  )
}
```

## カスタムコンポーネントのスタイリング

### グラデーションボタン

```typescript
// components/ui/gradient-button.tsx

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const gradientButtonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90',
        purple: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90',
        blue: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:opacity-90',
        sunset: 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:opacity-90',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface GradientButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof gradientButtonVariants> {
  asChild?: boolean
}

const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(gradientButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
GradientButton.displayName = 'GradientButton'

export { GradientButton, gradientButtonVariants }
```

### グラスモーフィズムカード

```typescript
// components/ui/glass-card.tsx

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl border border-white/20 bg-white/10 backdrop-blur-lg dark:border-white/10 dark:bg-black/20',
          'shadow-xl shadow-black/5 dark:shadow-white/5',
          className
        )}
        {...props}
      />
    )
  }
)
GlassCard.displayName = 'GlassCard'

export { GlassCard }
```

## アニメーション強化

### カスタムアニメーション追加

```javascript
// tailwind.config.js

module.exports = {
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'bounce-slow': 'bounce 3s infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
}
```

### アニメーション付きコンポーネント

```typescript
// components/animated-card.tsx

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface AnimatedCardProps {
  children: React.ReactNode
  className?: string
  delay?: number
}

export function AnimatedCard({ children, className, delay = 0 }: AnimatedCardProps) {
  return (
    <Card
      className={cn('animate-slide-up', className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </Card>
  )
}
```

## レスポンシブデザイン

### ブレークポイントのカスタマイズ

```javascript
// tailwind.config.js

module.exports = {
  theme: {
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      '3xl': '1920px',
    },
  },
}
```

### レスポンシブコンポーネント

```typescript
// components/responsive-grid.tsx

export function ResponsiveGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  )
}
```

## フォントのカスタマイズ

```typescript
// app/layout.tsx

import { Inter, Noto_Sans_JP } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const notoSansJP = Noto_Sans_JP({ subsets: ['latin'], variable: '--font-noto-sans-jp' })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${inter.variable} ${notoSansJP.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
```

```javascript
// tailwind.config.js

module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'var(--font-noto-sans-jp)', 'sans-serif'],
      },
    },
  },
}
```

## まとめ

shadcn/uiのテーマシステムは、CSS変数ベースの柔軟な設計により、簡単にカスタマイズできます。以下のポイントを押さえましょう:

- **CSS変数**: HSL色空間で直感的なカラーカスタマイズ
- **ダークモード**: next-themesで簡単実装
- **複数テーマ**: data属性で切り替え可能
- **アニメーション**: Tailwindのカスタムアニメーションで強化
- **レスポンシブ**: モバイルファーストのデザイン

これらの技術を組み合わせることで、ブランドに合った美しいUIを短時間で構築できます。ぜひshadcn/uiのテーマカスタマイズを極めてください!

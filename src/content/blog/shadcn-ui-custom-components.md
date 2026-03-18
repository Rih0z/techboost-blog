---
title: "shadcn/uiでカスタムコンポーネントを作る — 実践テクニック集"
description: "shadcn/uiの仕組みを理解し、カスタムバリアント作成からRadix UIプリミティブの拡張まで実践的なテクニックを網羅的に解説します。"
pubDate: "2026-02-05"
tags: ["shadcn-ui", "React", "Radix UI", "Tailwind CSS", "TypeScript"]
---

shadcn/uiは「コンポーネントライブラリ」ではなく「コンポーネントのコレクション」です。コピー&ペーストで自分のプロジェクトに組み込み、完全にカスタマイズできる点が最大の特徴です。この記事では、shadcn/uiの仕組みを理解し、実践的なカスタムコンポーネントを作成する方法を解説します。

## shadcn/uiの仕組み

shadcn/uiは以下の技術スタックで構成されています。

- **Radix UI** - アクセシブルなプリミティブコンポーネント
- **Tailwind CSS** - ユーティリティファーストなスタイリング
- **class-variance-authority (CVA)** - バリアント管理
- **clsx / tailwind-merge** - クラス名の結合と競合解決

コンポーネントは `components/ui/` 配下に配置され、完全にあなたのコードになります。

```typescript
// components/ui/button.tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
```

## カスタムバリアントの作成

既存のButtonコンポーネントに新しいバリアントを追加してみましょう。

```typescript
const buttonVariants = cva(
  // ... base classes
  {
    variants: {
      variant: {
        // 既存のバリアント...
        gradient: "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600",
        glass: "bg-white/10 backdrop-blur-lg border border-white/20 text-white hover:bg-white/20",
        animated: "bg-primary text-primary-foreground hover:scale-105 transition-transform",
      },
      size: {
        // 既存のサイズ...
        xs: "h-7 px-2 text-xs",
        xl: "h-14 px-10 text-lg",
      },
    },
    // 複数バリアントの組み合わせ
    compoundVariants: [
      {
        variant: "gradient",
        size: "lg",
        className: "shadow-xl shadow-purple-500/50",
      },
    ],
  }
)
```

使用例:

```tsx
<Button variant="gradient" size="lg">
  グラデーションボタン
</Button>
<Button variant="glass">
  グラスモーフィズム
</Button>
```

## Radix UIプリミティブの拡張

shadcn/uiのコンポーネントはRadix UIのプリミティブをラップしています。カスタムコンポーネントを作成する際も同様のパターンを使用できます。

### カスタムツールチップの作成

```typescript
// components/ui/custom-tooltip.tsx
import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const tooltipVariants = cva(
  "z-50 overflow-hidden rounded-md px-3 py-1.5 text-xs animate-in fade-in-0 zoom-in-95",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        info: "bg-blue-500 text-white",
        success: "bg-green-500 text-white",
        warning: "bg-yellow-500 text-black",
        error: "bg-red-500 text-white",
      },
      size: {
        sm: "px-2 py-1 text-xs",
        md: "px-3 py-1.5 text-sm",
        lg: "px-4 py-2 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

interface CustomTooltipProps extends VariantProps<typeof tooltipVariants> {
  content: React.ReactNode
  children: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
}

export function CustomTooltip({
  content,
  children,
  variant,
  size,
  side = "top",
}: CustomTooltipProps) {
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            className={cn(tooltipVariants({ variant, size }))}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-current" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
```

使用例:

```tsx
<CustomTooltip content="これは成功メッセージです" variant="success">
  <Button>ホバーしてください</Button>
</CustomTooltip>
```

## テーマカスタマイズ

shadcn/uiはCSS変数でテーマを管理します。カスタムカラーパレットを作成しましょう。

```css
/* globals.css */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;

    /* カスタムカラー */
    --brand: 262 83% 58%;
    --brand-foreground: 210 40% 98%;

    /* グラデーション用 */
    --gradient-start: 330 81% 60%;
    --gradient-end: 262 83% 58%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;

    --brand: 262 83% 58%;
    --brand-foreground: 222.2 84% 4.9%;
  }
}
```

Tailwind設定での利用:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "hsl(var(--brand))",
          foreground: "hsl(var(--brand-foreground))",
        },
      },
    },
  },
}
```

## 実用コンポーネント例

### 1. ステータスバッジ

```typescript
// components/ui/status-badge.tsx
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      status: {
        success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
        error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
        info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
        neutral: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-0.5 text-sm",
        lg: "px-3 py-1 text-base",
      },
      withDot: {
        true: "pl-1.5",
      },
    },
    defaultVariants: {
      status: "neutral",
      size: "md",
      withDot: false,
    },
  }
)

interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  children: React.ReactNode
}

export function StatusBadge({
  className,
  status,
  size,
  withDot,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(statusBadgeVariants({ status, size, withDot, className }))}
      {...props}
    >
      {withDot && (
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      )}
      {children}
    </span>
  )
}
```

### 2. プログレスステッパー

```typescript
// components/ui/stepper.tsx
import { cn } from "@/lib/utils"

interface Step {
  label: string
  description?: string
}

interface StepperProps {
  steps: Step[]
  currentStep: number
  className?: string
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <nav aria-label="Progress" className={cn("", className)}>
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const isComplete = index < currentStep
          const isCurrent = index === currentStep
          const isUpcoming = index > currentStep

          return (
            <li
              key={step.label}
              className={cn(
                "relative flex-1",
                index !== steps.length - 1 && "pr-8 sm:pr-20"
              )}
            >
              <div className="flex items-center">
                <div className="relative flex items-center justify-center">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border-2",
                      isComplete && "border-primary bg-primary",
                      isCurrent && "border-primary",
                      isUpcoming && "border-gray-300"
                    )}
                  >
                    {isComplete ? (
                      <svg
                        className="h-6 w-6 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          isCurrent && "text-primary",
                          isUpcoming && "text-gray-500"
                        )}
                      >
                        {index + 1}
                      </span>
                    )}
                  </div>
                </div>
                {index !== steps.length - 1 && (
                  <div
                    className={cn(
                      "absolute left-10 right-0 top-5 -ml-px h-0.5",
                      isComplete ? "bg-primary" : "bg-gray-300"
                    )}
                  />
                )}
              </div>
              <div className="mt-2">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isCurrent && "text-primary",
                    isComplete && "text-foreground",
                    isUpcoming && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
```

### 3. カスタムコマンドパレット

```typescript
// components/ui/command-palette.tsx
import { useState } from "react"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

interface CommandAction {
  id: string
  label: string
  icon?: React.ReactNode
  keywords?: string[]
  onSelect: () => void
}

interface CommandPaletteProps {
  actions: CommandAction[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({
  actions,
  open,
  onOpenChange,
}: CommandPaletteProps) {
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="コマンドを入力..." />
      <CommandList>
        <CommandEmpty>結果が見つかりません。</CommandEmpty>
        <CommandGroup heading="アクション">
          {actions.map((action) => (
            <CommandItem
              key={action.id}
              keywords={action.keywords}
              onSelect={() => {
                action.onSelect()
                onOpenChange(false)
              }}
            >
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

// 使用例
export function App() {
  const [open, setOpen] = useState(false)

  const actions = [
    {
      id: "new-post",
      label: "新しい投稿を作成",
      keywords: ["create", "new", "post"],
      onSelect: () => console.log("新規投稿"),
    },
    {
      id: "settings",
      label: "設定を開く",
      keywords: ["settings", "preferences"],
      onSelect: () => console.log("設定"),
    },
  ]

  return (
    <>
      <button onClick={() => setOpen(true)}>コマンドパレットを開く</button>
      <CommandPalette actions={actions} open={open} onOpenChange={setOpen} />
    </>
  )
}
```

## まとめ

shadcn/uiのカスタマイズは、以下のポイントを押さえることで自由自在に行えます。

1. **CVAでバリアント管理** - 型安全でメンテナンスしやすいバリアント定義
2. **Radix UIプリミティブの活用** - アクセシビリティが担保されたベース
3. **CSS変数でテーマ管理** - 柔軟なカラーシステム
4. **compoundVariantsで複雑な組み合わせ** - 複数バリアントの相互作用

これらのテクニックを組み合わせることで、あなたのプロジェクトに最適化されたコンポーネントライブラリを構築できます。コードは完全にあなたのものなので、ビジネス要件に合わせて自由にカスタマイズしましょう。

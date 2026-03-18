---
title: "shadcn/ui完全ガイド - モダンUIコンポーネントの作り方"
description: "shadcn/uiの基礎から実践まで徹底解説。セットアップ、主要コンポーネント、テーマカスタマイズ、react-hook-form/Zodとの連携、ダークモード対応を完全網羅。"
pubDate: "2026-02-05"
tags: ["shadcn/ui", "React", "Tailwind CSS", "UI", "Next.js"]
---

## はじめに

shadcn/uiは、2026年現在**最も注目されているReact UIライブラリ**の1つです。

従来のUIライブラリと異なり、**コンポーネントをコピー&ペーストして使う**という革新的なアプローチを採用しています。

### shadcn/uiの特徴

- **コピペベース**: npmパッケージではなく、コードをプロジェクトに直接追加
- **カスタマイズ自由**: 完全に自分のコードとして管理可能
- **Tailwind CSS**: スタイリングにTailwindを使用
- **Radix UI**: アクセシビリティに配慮したプリミティブ
- **TypeScript**: 完全な型サポート
- **ゼロランタイム**: 必要なコンポーネントだけ使用

### なぜshadcn/uiなのか

**従来のUIライブラリの課題:**
- Material UI、Chakra UI等はカスタマイズが難しい
- バンドルサイズが大きい
- アップデート時に破壊的変更

**shadcn/uiの解決策:**
- 完全にコントロール可能（自分のコード）
- 必要なコンポーネントだけ追加
- 自由にカスタマイズ・修正

## セットアップ

### 前提条件

- Next.js 14+ (App Router推奨)
- React 18+
- Tailwind CSS

### Next.js + shadcn/ui プロジェクト作成

```bash
# Next.jsプロジェクト作成
npx create-next-app@latest my-app
cd my-app

# shadcn/ui初期化
npx shadcn@latest init
```

### 初期化時の質問

```bash
? Would you like to use TypeScript? › Yes
? Which style would you like to use? › New York
? Which color would you like to use as base color? › Zinc
? Where is your global CSS file? › app/globals.css
? Would you like to use CSS variables for colors? › Yes
? Where is your tailwind.config.js located? › tailwind.config.ts
? Configure the import alias for components: › @/components
? Configure the import alias for utils: › @/lib/utils
```

### 既存プロジェクトに追加

```bash
# Tailwind CSSインストール（まだの場合）
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# shadcn/ui初期化
npx shadcn@latest init
```

### 手動セットアップ

```bash
# 必要な依存関係
npm install tailwindcss-animate class-variance-authority clsx tailwind-merge
npm install @radix-ui/react-slot
```

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // ...他の色
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

## コンポーネント追加

### コンポーネントインストール

```bash
# Buttonコンポーネント追加
npx shadcn@latest add button

# 複数コンポーネント一括追加
npx shadcn@latest add button input card dialog

# 全コンポーネント追加
npx shadcn@latest add --all
```

### 生成されるファイル

```
components/
└── ui/
    ├── button.tsx
    ├── input.tsx
    ├── card.tsx
    └── dialog.tsx
```

## 主要コンポーネント

### 1. Button

```tsx
import { Button } from '@/components/ui/button';

export default function ButtonDemo() {
  return (
    <div className="space-x-2">
      {/* デフォルト */}
      <Button>Default</Button>

      {/* バリアント */}
      <Button variant="secondary">Secondary</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>

      {/* サイズ */}
      <Button size="sm">Small</Button>
      <Button size="lg">Large</Button>
      <Button size="icon">🔍</Button>

      {/* 状態 */}
      <Button disabled>Disabled</Button>
      <Button loading>Loading...</Button>
    </div>
  );
}
```

### 2. Input

```tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function InputDemo() {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input type="email" id="email" placeholder="you@example.com" />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input type="password" id="password" />
      </div>

      <Input type="file" />
      <Input disabled placeholder="Disabled" />
    </div>
  );
}
```

### 3. Card

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function CardDemo() {
  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Create project</CardTitle>
        <CardDescription>Deploy your new project in one-click.</CardDescription>
      </CardHeader>
      <CardContent>
        <form>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Name of your project" />
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button>Deploy</Button>
      </CardFooter>
    </Card>
  );
}
```

### 4. Dialog

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function DialogDemo() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete your account.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button variant="destructive">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 5. Form（react-hook-form + Zod）

```bash
npx shadcn@latest add form
npm install react-hook-form zod @hookform/resolvers
```

```tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

// Zodスキーマ定義
const formSchema = z.object({
  username: z.string().min(2, {
    message: 'Username must be at least 2 characters.',
  }),
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
});

export default function FormDemo() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      email: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="shadcn" {...field} />
              </FormControl>
              <FormDescription>This is your public display name.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

### 6. Table

```tsx
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const invoices = [
  { invoice: 'INV001', paymentStatus: 'Paid', totalAmount: '$250.00' },
  { invoice: 'INV002', paymentStatus: 'Pending', totalAmount: '$150.00' },
  { invoice: 'INV003', paymentStatus: 'Unpaid', totalAmount: '$350.00' },
];

export default function TableDemo() {
  return (
    <Table>
      <TableCaption>A list of your recent invoices.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.invoice}>
            <TableCell className="font-medium">{invoice.invoice}</TableCell>
            <TableCell>{invoice.paymentStatus}</TableCell>
            <TableCell className="text-right">{invoice.totalAmount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### 7. Command (⌘K メニュー)

```bash
npx shadcn@latest add command
```

```tsx
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

export default function CommandDemo() {
  return (
    <Command className="rounded-lg border shadow-md">
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem>Calendar</CommandItem>
          <CommandItem>Search Emoji</CommandItem>
          <CommandItem>Calculator</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
```

## テーマカスタマイズ

### CSS変数でカラー管理

```css
/* app/globals.css */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    /* ... */
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    /* ... */
  }
}
```

### テーマジェネレーター

公式サイトでカラーを選択してコピー:
https://ui.shadcn.com/themes

### カスタムカラー追加

```css
:root {
  --success: 142.1 76.2% 36.3%;
  --success-foreground: 355.7 100% 97.3%;
  --warning: 32.2 95% 44%;
  --warning-foreground: 0 0% 100%;
}
```

```typescript
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      success: {
        DEFAULT: 'hsl(var(--success))',
        foreground: 'hsl(var(--success-foreground))',
      },
      warning: {
        DEFAULT: 'hsl(var(--warning))',
        foreground: 'hsl(var(--warning-foreground))',
      },
    },
  },
},
```

## ダークモード

### next-themesセットアップ

```bash
npm install next-themes
```

```tsx
// app/providers.tsx
'use client';

import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
}
```

```tsx
// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### テーマ切り替えボタン

```tsx
'use client';

import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
```

## 実践例

### ログインフォーム

```tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export default function LoginForm() {
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    // ログイン処理
    console.log(values);
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>Enter your email and password to login.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">
              Login
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
```

## まとめ

### shadcn/uiのメリット

1. **完全なコントロール**: 自分のコードとして管理
2. **軽量**: 必要なコンポーネントだけ追加
3. **カスタマイズ自由**: Tailwindで自由にスタイル変更
4. **アクセシビリティ**: Radix UIベース
5. **型安全**: TypeScript完全サポート

### ベストプラクティス

- コンポーネントは必要なものだけ追加
- カラーはCSS変数で一元管理
- Zodでバリデーション定義
- ダークモードは最初から対応

### 次のステップ

- 公式ドキュメント: https://ui.shadcn.com/
- コンポーネント一覧: https://ui.shadcn.com/docs/components
- テーマエディター: https://ui.shadcn.com/themes

shadcn/uiで、美しく、アクセシブルなUIを構築しましょう。

---
title: 'shadcn/ui完全ガイド — Radix UI・Tailwind CSSで作るモダンUIコンポーネント'
description: 'shadcn/uiを使ったReactコンポーネント開発の完全ガイド。インストール・コンポーネント追加・カスタマイズ・テーマ・フォーム（react-hook-form + zod）・データテーブル・アクセシビリティまで実装例付きで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-5.jpg'
tags: ['shadcn/ui', 'React', 'Tailwind CSS', 'TypeScript', 'UIコンポーネント']
---

## はじめに

フロントエンド開発においてUIコンポーネントライブラリの選択は、プロジェクトの生産性とメンテナンス性を大きく左右する。MUIやChakra UIといった従来型のライブラリとは一線を画す新世代のアプローチとして、**shadcn/ui**が急速に普及している。

shadcn/uiはGitHubのスター数が急増し、2024年のState of JSでも高い注目を集めた。しかしその真価は「コンポーネントライブラリ」ではなく、「コンポーネントのソースコードをプロジェクトに直接コピーする仕組み」にある。この設計思想を深く理解することが、shadcn/uiを使いこなす第一歩となる。

本記事では、shadcn/uiの基本思想からNext.js App Routerとの統合まで、実践的なコード例を交えながら体系的に解説する。

---

## 1. shadcn/uiとは — Radix UI + Tailwind CSS の組み合わせ思想

### 従来ライブラリの課題

MUIやAnt Designなどの伝統的なコンポーネントライブラリには共通の課題がある。

- **スタイルの上書きが困難**: CSS-in-JSやモジュールCSSとの衝突
- **バンドルサイズの肥大化**: 使わないコンポーネントまでバンドルされる
- **カスタマイズの限界**: デザインシステムとの乖離が生じやすい
- **バージョン依存**: ライブラリのメジャーアップデートで破壊的変更が起きる

### shadcn/uiの解決アプローチ

shadcn/uiはこれらの問題を根本から解決する。

```
従来: npm install @mui/material → node_modulesに格納 → importして使う

shadcn/ui: npx shadcn@latest add button → src/components/ui/button.tsx に直接コピー
```

コンポーネントがプロジェクトのソースコードになるため、**完全な所有権**を持てる。スタイルを変更したければ直接ファイルを編集すればよい。依存関係の更新でUIが崩れる心配もない。

### 技術スタックの構成

shadcn/uiは以下の技術の組み合わせで成立している。

**Radix UI Primitives**
アクセシビリティとキーボード操作に特化した、スタイルなしのUIプリミティブ。ARIA属性の実装、フォーカス管理、ポップオーバーのポジショニングなど、UIの「振る舞い」を担う。

**Tailwind CSS**
ユーティリティファーストのCSSフレームワーク。Radix UIのプリミティブにスタイルを付与する役割を担う。

**class-variance-authority (CVA)**
TypeScriptでコンポーネントのバリアント（`size="sm" | "md" | "lg"` など）を型安全に定義するためのライブラリ。

**clsx / tailwind-merge**
条件付きクラス名の結合と、Tailwindクラスの衝突解決に使用する。

```typescript
// shadcn/uiのButton実装の核心部分
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
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
```

この設計により、バリアントは型安全に定義され、TypeScriptによる自動補完と型チェックが効く。

---

## 2. インストール・初期設定

### 前提条件

- Node.js 18以上
- React 18以上のプロジェクト（Next.js / Vite / Remix）
- Tailwind CSS設定済み

### Next.jsプロジェクトへのインストール

```bash
# 新規Next.jsプロジェクト作成
npx create-next-app@latest my-app --typescript --tailwind --eslint

cd my-app

# shadcn/ui初期化
npx shadcn@latest init
```

初期化時にいくつかの質問が表示される。

```
Which style would you like to use? › Default
Which color would you like to use as base color? › Slate
Would you like to use CSS variables for colors? › yes
```

### components.json の設定

初期化後、プロジェクトルートに `components.json` が生成される。

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

`rsc: true` にすることで、Server Componentsに対応したコンポーネントが生成される。`aliases` でパスエイリアスを設定することで、コンポーネントのインポートパスが簡潔になる。

### globals.css のCSS変数

shadcn/uiはTailwindのCSS変数を使ってテーマを管理する。

```css
@layer base {
  :root {
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
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... ダークモード変数 */
  }
}
```

### コンポーネントの追加

```bash
# 個別追加
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add dialog

# 複数まとめて追加
npx shadcn@latest add button input select dialog sheet
```

追加されたコンポーネントは `src/components/ui/` に配置される。

---

## 3. 主要コンポーネント

### Button

```typescript
import { Button } from "@/components/ui/button"

export function ButtonExamples() {
  return (
    <div className="flex gap-4 flex-wrap">
      <Button>デフォルト</Button>
      <Button variant="destructive">削除</Button>
      <Button variant="outline">アウトライン</Button>
      <Button variant="secondary">セカンダリ</Button>
      <Button variant="ghost">ゴースト</Button>
      <Button variant="link">リンク</Button>
      <Button size="sm">小さい</Button>
      <Button size="lg">大きい</Button>
      <Button disabled>無効</Button>
      <Button>
        <svg className="mr-2 h-4 w-4" /* アイコン */ />
        アイコン付き
      </Button>
    </div>
  )
}
```

### Input と Label

```typescript
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function InputExample() {
  return (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="email">メールアドレス</Label>
      <Input
        type="email"
        id="email"
        placeholder="example@domain.com"
      />
    </div>
  )
}
```

### Select

```typescript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function SelectExample() {
  return (
    <Select>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="フレームワーク選択" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="next">Next.js</SelectItem>
        <SelectItem value="remix">Remix</SelectItem>
        <SelectItem value="astro">Astro</SelectItem>
        <SelectItem value="nuxt">Nuxt.js</SelectItem>
      </SelectContent>
    </Select>
  )
}
```

### Dialog

```typescript
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function DialogExample() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">プロフィール編集</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>プロフィール編集</DialogTitle>
          <DialogDescription>
            アカウント情報を変更します。完了したら保存ボタンをクリックしてください。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              名前
            </Label>
            <Input id="name" defaultValue="田中 太郎" className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="username" className="text-right">
              ユーザー名
            </Label>
            <Input id="username" defaultValue="@tanaka" className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit">変更を保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Sheet（スライドオーバー）

```typescript
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

export function SheetExample() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">メニューを開く</Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>ナビゲーション</SheetTitle>
          <SheetDescription>
            サイト内のページへ移動できます。
          </SheetDescription>
        </SheetHeader>
        <nav className="mt-6 flex flex-col gap-4">
          <a href="/" className="text-sm font-medium hover:underline">ホーム</a>
          <a href="/about" className="text-sm font-medium hover:underline">About</a>
          <a href="/blog" className="text-sm font-medium hover:underline">ブログ</a>
          <a href="/contact" className="text-sm font-medium hover:underline">お問い合わせ</a>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
```

---

## 4. テーマカスタマイズ

### CSS変数によるテーマ変更

shadcn/uiのテーマはCSS変数を書き換えるだけで全コンポーネントに反映される。

```css
/* globals.css — ブランドカラーに変更する例 */
:root {
  /* Slateベースから青系に変更 */
  --primary: 221.2 83.2% 53.3%;       /* #3B82F6 */
  --primary-foreground: 210 40% 98%;  /* 白 */
  --accent: 210 40% 96.1%;
  --accent-foreground: 221.2 83.2% 53.3%;
  --ring: 221.2 83.2% 53.3%;
  --radius: 0.75rem;  /* 角丸を大きく */
}
```

### ダークモードの実装

Next.jsで `next-themes` を使ったダークモード切り替え。

```bash
npm install next-themes
```

```typescript
// src/app/providers.tsx
"use client"

import { ThemeProvider } from "next-themes"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  )
}
```

```typescript
// src/app/layout.tsx
import { Providers } from "./providers"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

```typescript
// テーマ切り替えボタン
"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Moon, Sun } from "lucide-react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">テーマ切り替え</span>
    </Button>
  )
}
```

### カスタムテーマの作成

複数テーマを切り替えたい場合はCSSクラスでテーマを定義する。

```css
/* globals.css */
.theme-forest {
  --primary: 142.1 76.2% 36.3%;       /* 緑 */
  --primary-foreground: 355.7 100% 97.3%;
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
}

.theme-rose {
  --primary: 346.8 77.2% 49.8%;       /* ローズ */
  --primary-foreground: 355.7 100% 97.3%;
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
}
```

---

## 5. フォーム実装 — react-hook-form + zod + FormField

shadcn/uiが提供するFormコンポーネントは `react-hook-form` と `zod` を前提に設計されている。

```bash
npm install react-hook-form zod @hookform/resolvers
npx shadcn@latest add form
```

### 基本的なフォーム

```typescript
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

// バリデーションスキーマの定義
const profileSchema = z.object({
  username: z
    .string()
    .min(2, { message: "ユーザー名は2文字以上入力してください" })
    .max(50, { message: "ユーザー名は50文字以内で入力してください" }),
  email: z
    .string()
    .email({ message: "有効なメールアドレスを入力してください" }),
  bio: z
    .string()
    .max(200, { message: "自己紹介は200文字以内で入力してください" })
    .optional(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

export function ProfileForm() {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: "",
      email: "",
      bio: "",
    },
  })

  async function onSubmit(data: ProfileFormValues) {
    try {
      // APIへの送信処理
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error("送信に失敗しました")

      toast.success("プロフィールを更新しました")
    } catch (error) {
      toast.error("エラーが発生しました。もう一度お試しください。")
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ユーザー名</FormLabel>
              <FormControl>
                <Input placeholder="tanaka_taro" {...field} />
              </FormControl>
              <FormDescription>
                公開プロフィールに表示される名前です。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>メールアドレス</FormLabel>
              <FormControl>
                <Input type="email" placeholder="example@domain.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>自己紹介</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="簡単な自己紹介を入力してください"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                200文字以内で入力してください。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "送信中..." : "保存する"}
        </Button>
      </form>
    </Form>
  )
}
```

### SelectとCheckboxのFormField統合

```typescript
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const settingsSchema = z.object({
  role: z.string({ required_error: "役割を選択してください" }),
  notifications: z.boolean().default(false),
  terms: z.boolean().refine((val) => val === true, {
    message: "利用規約への同意が必要です",
  }),
})

// ... FormFieldの中での使用例
<FormField
  control={form.control}
  name="role"
  render={({ field }) => (
    <FormItem>
      <FormLabel>役割</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="役割を選択" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="admin">管理者</SelectItem>
          <SelectItem value="editor">編集者</SelectItem>
          <SelectItem value="viewer">閲覧者</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>

<FormField
  control={form.control}
  name="terms"
  render={({ field }) => (
    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
      <FormControl>
        <Checkbox
          checked={field.value}
          onCheckedChange={field.onChange}
        />
      </FormControl>
      <div className="space-y-1 leading-none">
        <FormLabel>
          利用規約に同意する
        </FormLabel>
        <FormDescription>
          サービスの利用規約とプライバシーポリシーに同意します。
        </FormDescription>
      </div>
    </FormItem>
  )}
/>
```

---

## 6. データテーブル — @tanstack/react-table + DataTable

shadcn/uiのデータテーブルは `@tanstack/react-table` をベースにしており、ソート・フィルタリング・ページネーション・列選択などの機能を型安全に実装できる。

```bash
npm install @tanstack/react-table
npx shadcn@latest add table
```

### 型定義とカラム定義

```typescript
// types/payment.ts
export type Payment = {
  id: string
  amount: number
  status: "pending" | "processing" | "success" | "failed"
  email: string
  createdAt: Date
}
```

```typescript
// components/payments/columns.tsx
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Payment } from "@/types/payment"

export const columns: ColumnDef<Payment>[] = [
  {
    accessorKey: "status",
    header: "ステータス",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      const statusMap = {
        pending: { label: "保留中", variant: "secondary" as const },
        processing: { label: "処理中", variant: "default" as const },
        success: { label: "完了", variant: "outline" as const },
        failed: { label: "失敗", variant: "destructive" as const },
      }
      const { label, variant } = statusMap[status as keyof typeof statusMap]
      return <Badge variant={variant}>{label}</Badge>
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        メールアドレス
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right">金額</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"))
      const formatted = new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
      }).format(amount)
      return <div className="text-right font-medium">{formatted}</div>
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const payment = row.original
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">メニューを開く</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>操作</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(payment.id)}
            >
              IDをコピー
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>詳細を表示</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">削除</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
```

### DataTableコンポーネント

```typescript
// components/ui/data-table.tsx
"use client"

import { useState } from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "検索...",
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    state: { sorting, columnFilters, columnVisibility },
  })

  return (
    <div className="space-y-4">
      {searchKey && (
        <Input
          placeholder={searchPlaceholder}
          value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn(searchKey)?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  データがありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} 件中{" "}
          {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} -{" "}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{" "}
          件を表示
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            前へ
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            次へ
          </Button>
        </div>
      </div>
    </div>
  )
}
```

---

## 7. コマンドパレット — cmdk・Command・CommandDialog

コマンドパレットはパワーユーザー向けの検索・ナビゲーション機能として、多くの現代的なアプリで採用されている。

```bash
npx shadcn@latest add command
```

### 基本的なCommandDialog

```typescript
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import {
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  Smile,
  User,
  FileText,
  Home,
} from "lucide-react"

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  // Cmd+K / Ctrl+K でコマンドパレットを開く
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const navigate = (path: string) => {
    setOpen(false)
    router.push(path)
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
          <span className="text-xs">Cmd</span>K
        </kbd>
        でコマンドパレットを開く
      </p>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="コマンドやページを検索..." />
        <CommandList>
          <CommandEmpty>該当する結果が見つかりません。</CommandEmpty>

          <CommandGroup heading="ページ">
            <CommandItem onSelect={() => navigate("/")}>
              <Home className="mr-2 h-4 w-4" />
              <span>ホーム</span>
            </CommandItem>
            <CommandItem onSelect={() => navigate("/dashboard")}>
              <Calendar className="mr-2 h-4 w-4" />
              <span>ダッシュボード</span>
              <CommandShortcut>Cmd+D</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => navigate("/blog")}>
              <FileText className="mr-2 h-4 w-4" />
              <span>ブログ</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="設定">
            <CommandItem onSelect={() => navigate("/settings/profile")}>
              <User className="mr-2 h-4 w-4" />
              <span>プロフィール</span>
              <CommandShortcut>Cmd+P</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => navigate("/settings/billing")}>
              <CreditCard className="mr-2 h-4 w-4" />
              <span>請求情報</span>
            </CommandItem>
            <CommandItem onSelect={() => navigate("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>設定</span>
              <CommandShortcut>Cmd+,</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="ツール">
            <CommandItem>
              <Calculator className="mr-2 h-4 w-4" />
              <span>計算機</span>
            </CommandItem>
            <CommandItem>
              <Smile className="mr-2 h-4 w-4" />
              <span>絵文字パレット</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
```

---

## 8. Toastと通知 — sonner・useToast

shadcn/uiは `sonner` を使ったモダンなトースト通知を提供する。

```bash
npx shadcn@latest add sonner
```

```typescript
// layout.tsx にToasterを追加
import { Toaster } from "@/components/ui/sonner"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  )
}
```

```typescript
// コンポーネントでの使用
"use client"

import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function ToastExamples() {
  return (
    <div className="flex flex-wrap gap-4">
      <Button
        onClick={() => toast("ファイルを保存しました")}
      >
        デフォルト
      </Button>

      <Button
        variant="outline"
        onClick={() =>
          toast.success("操作が完了しました", {
            description: "変更内容が正常に保存されました。",
          })
        }
      >
        成功
      </Button>

      <Button
        variant="destructive"
        onClick={() =>
          toast.error("エラーが発生しました", {
            description: "ネットワークエラーです。もう一度お試しください。",
            action: {
              label: "再試行",
              onClick: () => console.log("再試行"),
            },
          })
        }
      >
        エラー
      </Button>

      <Button
        variant="secondary"
        onClick={() =>
          toast.promise(
            new Promise((resolve) => setTimeout(resolve, 2000)),
            {
              loading: "データを読み込み中...",
              success: "データの読み込みが完了しました",
              error: "データの読み込みに失敗しました",
            }
          )
        }
      >
        Promise
      </Button>
    </div>
  )
}
```

---

## 9. カレンダー・日付ピッカー — react-day-picker

```bash
npx shadcn@latest add calendar date-picker
npm install react-day-picker date-fns
```

### DatePicker（単一日付選択）

```typescript
"use client"

import { useState } from "react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function DatePicker() {
  const [date, setDate] = useState<Date>()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[280px] justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "yyyy年MM月dd日", { locale: ja }) : "日付を選択"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
          locale={ja}
        />
      </PopoverContent>
    </Popover>
  )
}
```

### 日付範囲選択

```typescript
"use client"

import { useState } from "react"
import { DateRange } from "react-day-picker"
import { addDays, format } from "date-fns"
import { ja } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function DateRangePicker() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(2026, 0, 1),
    to: addDays(new Date(2026, 0, 1), 30),
  })

  return (
    <div className="grid gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "yyyy/MM/dd", { locale: ja })} -{" "}
                  {format(date.to, "yyyy/MM/dd", { locale: ja })}
                </>
              ) : (
                format(date.from, "yyyy/MM/dd", { locale: ja })
              )
            ) : (
              <span>期間を選択</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
            locale={ja}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
```

---

## 10. グラフ・チャート — recharts・ChartContainer

shadcn/uiはv0.0.0から `recharts` ベースのChartコンポーネントを提供しており、デザインシステムと統一されたグラフを簡単に実装できる。

```bash
npx shadcn@latest add chart
npm install recharts
```

### 棒グラフ

```typescript
"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"

const chartData = [
  { month: "1月", desktop: 186, mobile: 80 },
  { month: "2月", desktop: 305, mobile: 200 },
  { month: "3月", desktop: 237, mobile: 120 },
  { month: "4月", desktop: 73, mobile: 190 },
  { month: "5月", desktop: 209, mobile: 130 },
  { month: "6月", desktop: 214, mobile: 140 },
]

const chartConfig = {
  desktop: {
    label: "デスクトップ",
    color: "hsl(var(--chart-1))",
  },
  mobile: {
    label: "モバイル",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export function BarChartExample() {
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <BarChart data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
        />
        <YAxis tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
        <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}
```

### 折れ線グラフ（エリアチャート）

```typescript
"use client"

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const revenueData = [
  { date: "2026-01", revenue: 120000 },
  { date: "2026-02", revenue: 185000 },
  { date: "2026-03", revenue: 230000 },
  { date: "2026-04", revenue: 197000 },
  { date: "2026-05", revenue: 310000 },
  { date: "2026-06", revenue: 285000 },
]

const revenueConfig = {
  revenue: {
    label: "売上",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export function RevenueChart() {
  return (
    <ChartContainer config={revenueConfig}>
      <AreaChart data={revenueData} margin={{ left: 12, right: 12 }}>
        <defs>
          <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="dot" />}
        />
        <Area
          dataKey="revenue"
          type="monotone"
          fill="url(#fillRevenue)"
          stroke="var(--color-revenue)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  )
}
```

---

## 11. コンポーネントのカスタマイズ — className・variant拡張

### className による上書き

shadcn/uiのコンポーネントは `cn()` ユーティリティを使って既存クラスと新しいクラスをマージするため、`className` props で柔軟にカスタマイズできる。

```typescript
import { Button } from "@/components/ui/button"

// グラデーションボタン
<Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0">
  グラデーション
</Button>

// カスタムサイズ
<Button className="h-14 px-8 text-base rounded-xl">
  大きなボタン
</Button>

// アニメーション付き
<Button className="transition-transform hover:scale-105 active:scale-95">
  アニメーション
</Button>
```

### variant拡張

既存のButtonに独自のvariantを追加する場合は、`button.tsx` を直接編集する。

```typescript
// src/components/ui/button.tsx を編集
const buttonVariants = cva(
  "inline-flex items-center justify-center ...",
  {
    variants: {
      variant: {
        // 既存のvariant
        default: "bg-primary text-primary-foreground ...",
        destructive: "bg-destructive ...",
        outline: "border border-input ...",
        secondary: "bg-secondary ...",
        ghost: "hover:bg-accent ...",
        link: "text-primary underline-offset-4 ...",
        // カスタムvariantを追加
        gradient: "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 border-0",
        success: "bg-green-600 text-white hover:bg-green-700",
        warning: "bg-yellow-500 text-white hover:bg-yellow-600",
      },
      // ...
    },
  }
)
```

### 型の拡張

カスタムvariantを追加した場合、TypeScriptの型定義も自動的に更新される。

```typescript
// ButtonVariantsの型から自動的にカスタムvariantが推論される
<Button variant="gradient">グラデーション</Button>
<Button variant="success">成功</Button>
<Button variant="warning">警告</Button>
```

### コンポーネントの合成

shadcn/uiのコンポーネントを組み合わせて複合コンポーネントを作る。

```typescript
// カード形式のメトリクスコンポーネント
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string
  change: number
  unit?: string
}

export function MetricCard({ title, value, change, unit = "%" }: MetricCardProps) {
  const isPositive = change >= 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Badge variant={isPositive ? "default" : "destructive"} className="text-xs">
          {isPositive ? (
            <TrendingUp className="mr-1 h-3 w-3" />
          ) : (
            <TrendingDown className="mr-1 h-3 w-3" />
          )}
          {Math.abs(change)}{unit}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">
          前月比 {isPositive ? "+" : ""}{change}{unit}
        </p>
      </CardContent>
    </Card>
  )
}
```

---

## 12. アクセシビリティ — Radix UIのARIA属性

shadcn/uiがRadix UIをベースにしている最大のメリットは、アクセシビリティが標準で組み込まれている点だ。

### Radix UIが自動で処理するアクセシビリティ

**フォーカス管理**
- ダイアログが開いた際に最初のフォーカス可能な要素へフォーカスを移動
- ダイアログが閉じた際に元のトリガー要素にフォーカスを戻す
- Tab/Shift+Tab によるフォーカストラップ

**キーボード操作**
- Escape キーによるダイアログ・ポップオーバーの閉じる動作
- Arrow キーによるセレクト・ラジオグループのナビゲーション
- Enter/Space によるトリガー操作

**ARIA属性の自動付与**

```html
<!-- Dialogが開いた状態で生成されるHTML -->
<div role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-description">
  <h2 id="dialog-title">ダイアログタイトル</h2>
  <p id="dialog-description">説明文</p>
</div>

<!-- Selectの生成HTML -->
<button
  role="combobox"
  aria-expanded="false"
  aria-autocomplete="none"
  aria-controls="select-content"
>
  フレームワーク選択
</button>
<ul role="listbox" id="select-content">
  <li role="option" aria-selected="false">Next.js</li>
  <li role="option" aria-selected="true">Remix</li>
</ul>
```

### スクリーンリーダー専用テキスト

```typescript
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

// sr-only クラスを使ったアプローチ
<Button size="icon" aria-label="閉じる">
  <X className="h-4 w-4" />
  <span className="sr-only">閉じる</span>
</Button>

// アイコンボタンには必ずaria-labelまたはsr-onlyテキストを付ける
<Button variant="ghost" size="icon">
  <Search className="h-4 w-4" />
  <span className="sr-only">検索</span>
</Button>
```

### カラーコントラストの確保

shadcn/uiのデフォルトテーマはWCAG 2.1 AA基準（4.5:1以上）を満たすように設計されている。カスタムカラーを設定する際は必ずコントラスト比を確認する。

```css
/* NG: コントラスト不足 */
--primary: 210 100% 70%;  /* 薄い青 — 白背景では不十分 */
--primary-foreground: 0 0% 100%;

/* OK: 十分なコントラスト */
--primary: 221.2 83.2% 53.3%;  /* 濃い青 — 白背景で4.5:1以上 */
--primary-foreground: 0 0% 100%;
```

### フォームのアクセシビリティ

shadcn/uiのFormコンポーネントは適切なARIA属性を自動的に設定する。

```typescript
// FormFieldを使うと以下が自動設定される
// - FormLabelのhtmlFor → FormControlのid
// - aria-invalid → バリデーションエラー時にtrue
// - aria-describedby → FormDescriptionとFormMessageのid

<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      {/* htmlFor="email-field-id" が自動生成 */}
      <FormLabel>メールアドレス</FormLabel>
      <FormControl>
        {/* id="email-field-id" aria-describedby="email-desc email-msg" が自動付与 */}
        <Input {...field} />
      </FormControl>
      {/* id="email-desc" が自動生成 */}
      <FormDescription>ログインに使用するメールアドレス</FormDescription>
      {/* id="email-msg" aria-live="polite" が自動生成 */}
      <FormMessage />
    </FormItem>
  )}
/>
```

---

## 13. Next.js App Router統合・Server Components対応

### "use client" の使い分け

Next.js App Routerでは、インタラクティブなコンポーネントに `"use client"` ディレクティブが必要だ。shadcn/uiのコンポーネントは多くがRadix UIを使ったインタラクティブな実装のため、クライアントコンポーネントとして動作する。

```typescript
// NG: Server ComponentでDialogを使おうとするとエラー
// app/page.tsx (Server Component)
import { Dialog } from "@/components/ui/dialog"  // エラー!

// OK: クライアントコンポーネントでラップする
// components/my-dialog.tsx
"use client"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"

export function MyDialog() {
  // ...
}

// app/page.tsx (Server Component) からは問題なく使える
import { MyDialog } from "@/components/my-dialog"
```

### Server Componentで使える静的コンポーネント

一部のshadcn/uiコンポーネントは純粋なHTMLのラッパーであり、Server Componentで使える。

```typescript
// app/page.tsx (Server Component) — これらはOK
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// サーバーサイドでデータフェッチ + 静的コンポーネントで表示
export default async function DashboardPage() {
  const data = await fetchDashboardData()

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {data.metrics.map((metric) => (
        <Card key={metric.id}>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
            <Badge variant={metric.trend > 0 ? "default" : "destructive"}>
              {metric.trend > 0 ? "+" : ""}{metric.trend}%
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

### Suspenseとスケルトンローディング

```typescript
// app/dashboard/page.tsx
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"

// スケルトンローディングコンポーネント
function DashboardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-6">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <main className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">ダッシュボード</h1>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardMetrics />
      </Suspense>
    </main>
  )
}
```

### Server ActionsとFormの統合

Next.js App RouterのServer Actionsとshadcn/uiのFormを組み合わせる。

```typescript
// app/actions.ts
"use server"

import { z } from "zod"

const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  message: z.string().min(10),
})

export async function submitContact(formData: FormData) {
  const rawData = Object.fromEntries(formData)
  const result = contactSchema.safeParse(rawData)

  if (!result.success) {
    return { error: "入力内容に誤りがあります" }
  }

  // DBへの保存やメール送信
  await saveToDatabase(result.data)

  return { success: true }
}
```

```typescript
// components/contact-form.tsx
"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { submitContact } from "@/app/actions"

const schema = z.object({
  name: z.string().min(1, "名前を入力してください"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  message: z.string().min(10, "メッセージは10文字以上入力してください"),
})

export function ContactForm() {
  const [isPending, startTransition] = useTransition()
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  })

  const onSubmit = (data: z.infer<typeof schema>) => {
    startTransition(async () => {
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value)
      })

      const result = await submitContact(formData)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("お問い合わせを受け付けました")
        form.reset()
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* FormFieldは省略 */}
        <Button type="submit" disabled={isPending}>
          {isPending ? "送信中..." : "送信する"}
        </Button>
      </form>
    </Form>
  )
}
```

---

## 実践Tips: よくある問題と解決策

### Hydrationエラーの対処

サーバーとクライアントでレンダリング結果が異なる場合に発生する。

```typescript
// NG: サーバーとクライアントで結果が異なる
export function ThemeAwareComponent() {
  const { theme } = useTheme()
  return <div>{theme === "dark" ? "ダークモード" : "ライトモード"}</div>
  // サーバー: theme=undefined → ライトモード
  // クライアント: theme=dark → ダークモード
  // → Hydrationエラー!
}

// OK: マウント後に表示
import { useEffect, useState } from "react"

export function ThemeAwareComponent() {
  const [mounted, setMounted] = useState(false)
  const { theme } = useTheme()

  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return <div>{theme === "dark" ? "ダークモード" : "ライトモード"}</div>
}
```

### Tailwind CSSのJIT問題

動的なクラス名はTailwindのJITコンパイラに認識されない。

```typescript
// NG: 動的クラス名
const color = "blue"
<div className={`bg-${color}-500`}>...</div>  // ビルド後に消える

// OK: 完全なクラス名を使う
const colorMap = {
  blue: "bg-blue-500",
  red: "bg-red-500",
  green: "bg-green-500",
}
<div className={colorMap[color]}>...</div>
```

---

## フォームデータ検証のデバッグにDevToolBox

shadcn/uiとreact-hook-form + zodでフォームを開発していると、バリデーションスキーマが複雑になるにつれてデバッグが困難になることがある。送信されるJSONデータの構造確認やzodスキーマのテストには、**[DevToolBox](https://usedevtools.com/)** が役立つ。

DevToolBoxのJSON Validatorを使えば、フォームから送信されるJSONデータを視覚的に確認・整形できる。特にネストされたオブジェクトや配列を含む複雑なフォームの開発時に、`form.getValues()` の結果を貼り付けてデータ構造を素早く確認するワークフローが効率的だ。

```typescript
// 開発中のデバッグコード例
const form = useForm(...)

// DevToolBoxでデータ構造を確認
console.log(JSON.stringify(form.getValues(), null, 2))
// この出力をDevToolBoxのJSON Validatorに貼り付けて確認
```

---

## まとめ

shadcn/uiは「ライブラリをインストールする」という従来の発想を覆し、**コンポーネントのソースコードをプロジェクトに取り込む**という新しいアプローチを提示した。

| メリット | 説明 |
|---------|------|
| 完全な所有権 | コンポーネントがプロジェクトのコードになる |
| 無制限のカスタマイズ | ソースを直接編集して自由に変更 |
| 型安全 | TypeScript + CVAで型付きバリアント |
| アクセシビリティ | Radix UIのARIA・フォーカス管理が標準搭載 |
| デザイン統一 | CSS変数ベースのテーマで全コンポーネントが一貫 |
| ゼロ追加依存 | 必要なコンポーネントだけをプロジェクトに追加 |

Next.js App Routerとの統合、react-hook-form + zodによるフォーム実装、@tanstack/react-tableによるデータテーブル、rechartsによるグラフなど、現代のWebアプリに必要な機能が揃っている。

特にチームでの開発では、デザインシステムとしてshadcn/uiを採用することで、UIの一貫性を保ちながら各開発者が自由にカスタマイズできる環境を構築できる。コンポーネントのソースコードがプロジェクト内にあることで、デザイナーとエンジニアが同じコードを見ながらコラボレーションしやすくなる点も大きな利点だ。

まずは `npx shadcn@latest init` でプロジェクトに導入し、一つのコンポーネントから始めてみてほしい。その柔軟性と開発体験の良さを、実際のコードで体感できるはずだ。

---

## 参考リンク

- [shadcn/ui 公式ドキュメント](https://ui.shadcn.com/)
- [Radix UI Primitives](https://www.radix-ui.com/)
- [TanStack Table](https://tanstack.com/table)
- [react-hook-form](https://react-hook-form.com/)
- [zod](https://zod.dev/)
- [recharts](https://recharts.org/)
- [DevToolBox — 開発者向けツール集](https://usedevtools.com/)

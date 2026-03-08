---
title: "shadcn/ui v3実践ガイド2026"
description: "shadcn/ui v3の導入から実践活用まで徹底解説。Radix UIベースのアクセシブルなコンポーネント、Tailwind CSS v4統合、カスタマイズ手法を具体的なコード例とともに紹介します。"
pubDate: '2026-03-05'
tags: ['React', 'UI', 'shadcn-ui', 'フロントエンド', 'Tailwind CSS']
heroImage: '../../assets/thumbnails/shadcn-ui-v3-guide-2026.jpg'
---

shadcn/uiは、Radix UIプリミティブをベースに、Tailwind CSSでスタイリングされたコンポーネントコレクションです。従来のUIライブラリとは異なり、コンポーネントのソースコードを直接プロジェクトにコピーするという斬新なアプローチを採用しています。

2026年にリリースされたv3では、Tailwind CSS v4への完全対応、React Server Components最適化、新しいテーマシステムなど、大幅なアップデートが行われました。本記事では、shadcn/ui v3の導入から実践的な活用方法まで包括的に解説します。

## shadcn/uiの設計思想

### 「ライブラリではない」アプローチ

shadcn/uiの最大の特徴は、npm パッケージとしてインストールするのではなく、コンポーネントのソースコードをプロジェクトにコピーする点です。

```
従来のUIライブラリ:
  npm install some-ui-lib
  → node_modules/some-ui-lib/Button.js（変更不可）
  → カスタマイズ: propsやCSSオーバーライドで対応

shadcn/ui:
  npx shadcn@latest add button
  → src/components/ui/button.tsx（自由に編集可能）
  → カスタマイズ: ソースコードを直接編集
```

### メリットとデメリット

| 項目 | shadcn/ui | 従来のUIライブラリ |
|------|-----------|-------------------|
| カスタマイズ性 | ソースコード直接編集可能 | props/CSSオーバーライド |
| バンドルサイズ | 使用分のみ | ツリーシェイキング依存 |
| アップデート | 手動（差分適用） | npm update |
| 学習コスト | Radix UI + Tailwindの知識必要 | APIドキュメント参照 |
| アクセシビリティ | Radix UIが保証 | ライブラリ依存 |
| 型安全性 | TypeScript完全対応 | ライブラリ依存 |

## セットアップ

### Next.js プロジェクトへの導入

```bash
# 新規Next.jsプロジェクト作成
npx create-next-app@latest my-app --typescript --tailwind --app

cd my-app

# shadcn/ui v3 初期化
npx shadcn@latest init

# 対話式セットアップ
# ✔ Which style would you like to use? › New York
# ✔ Which color would you like to use as base color? › Zinc
# ✔ Would you like to use CSS variables for colors? › yes
```

### components.json の設定

初期化後に生成される`components.json`がshadcn/uiの設定ファイルです。

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

### Tailwind CSS v4 との統合

shadcn/ui v3はTailwind CSS v4にネイティブ対応しています。

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@layer base {
  :root {
    --background: oklch(1 0 0);
    --foreground: oklch(0.145 0.004 285.82);
    --card: oklch(1 0 0);
    --card-foreground: oklch(0.145 0.004 285.82);
    --popover: oklch(1 0 0);
    --popover-foreground: oklch(0.145 0.004 285.82);
    --primary: oklch(0.205 0.006 285.82);
    --primary-foreground: oklch(0.985 0 0);
    --secondary: oklch(0.965 0.001 285.82);
    --secondary-foreground: oklch(0.205 0.006 285.82);
    --muted: oklch(0.965 0.001 285.82);
    --muted-foreground: oklch(0.556 0.007 285.82);
    --accent: oklch(0.965 0.001 285.82);
    --accent-foreground: oklch(0.205 0.006 285.82);
    --destructive: oklch(0.577 0.245 27.33);
    --destructive-foreground: oklch(0.577 0.245 27.33);
    --border: oklch(0.922 0.004 285.82);
    --input: oklch(0.922 0.004 285.82);
    --ring: oklch(0.708 0.01 285.82);
    --radius: 0.625rem;
  }

  .dark {
    --background: oklch(0.145 0.004 285.82);
    --foreground: oklch(0.985 0 0);
    --primary: oklch(0.985 0 0);
    --primary-foreground: oklch(0.205 0.006 285.82);
    /* ...ダークモード用の残りの変数 */
  }
}
```

## コンポーネントの追加と使用

### 基本的なコンポーネント追加

```bash
# 個別追加
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add form
npx shadcn@latest add input
npx shadcn@latest add table

# 複数まとめて追加
npx shadcn@latest add button card dialog form input table

# 全コンポーネント追加
npx shadcn@latest add --all
```

### Button コンポーネント

```tsx
// src/components/ui/button.tsx（自動生成されるソース）
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
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

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
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

export { Button, buttonVariants }
```

### 使用例

```tsx
// src/app/page.tsx
import { Button } from "@/components/ui/button"
import { Loader2, Mail, Github } from "lucide-react"

export default function Home() {
  return (
    <div className="flex flex-col gap-4 p-8">
      {/* 基本バリアント */}
      <Button>デフォルト</Button>
      <Button variant="secondary">セカンダリ</Button>
      <Button variant="destructive">削除</Button>
      <Button variant="outline">アウトライン</Button>
      <Button variant="ghost">ゴースト</Button>
      <Button variant="link">リンク</Button>

      {/* サイズ */}
      <Button size="sm">小さい</Button>
      <Button size="default">標準</Button>
      <Button size="lg">大きい</Button>

      {/* アイコン付き */}
      <Button>
        <Mail /> メール送信
      </Button>

      {/* ローディング状態 */}
      <Button disabled>
        <Loader2 className="animate-spin" />
        処理中...
      </Button>

      {/* asChild: リンクをボタンスタイルで */}
      <Button asChild>
        <a href="/login">ログイン</a>
      </Button>
    </div>
  )
}
```

## フォーム構築（React Hook Form + Zod統合）

### セットアップ

```bash
npx shadcn@latest add form input select textarea checkbox
npm install react-hook-form @hookform/resolvers zod
```

### 実践的なフォーム実装

```tsx
// src/components/user-profile-form.tsx
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"

const profileSchema = z.object({
  username: z
    .string()
    .min(3, "ユーザー名は3文字以上で入力してください")
    .max(20, "ユーザー名は20文字以下で入力してください")
    .regex(/^[a-zA-Z0-9_]+$/, "英数字とアンダースコアのみ使用可能です"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  bio: z.string().max(160, "自己紹介は160文字以内で入力してください").optional(),
  role: z.enum(["developer", "designer", "pm", "other"], {
    required_error: "役職を選択してください",
  }),
  notifications: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(false),
  }),
})

type ProfileFormValues = z.infer<typeof profileSchema>

export function UserProfileForm() {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: "",
      email: "",
      bio: "",
      notifications: {
        email: true,
        push: false,
      },
    },
  })

  async function onSubmit(data: ProfileFormValues) {
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error("更新に失敗しました")

      toast.success("プロフィールを更新しました")
    } catch (error) {
      toast.error("エラーが発生しました")
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
                英数字とアンダースコアのみ使用できます
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
                <Input
                  type="email"
                  placeholder="taro@example.com"
                  {...field}
                />
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
                  placeholder="あなたについて教えてください"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {field.value?.length || 0}/160文字
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>役職</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="役職を選択" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="developer">開発者</SelectItem>
                  <SelectItem value="designer">デザイナー</SelectItem>
                  <SelectItem value="pm">プロジェクトマネージャー</SelectItem>
                  <SelectItem value="other">その他</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-3">
          <FormLabel>通知設定</FormLabel>
          <FormField
            control={form.control}
            name="notifications.email"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="font-normal">メール通知を受け取る</FormLabel>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notifications.push"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="font-normal">プッシュ通知を受け取る</FormLabel>
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "保存中..." : "プロフィールを保存"}
        </Button>
      </form>
    </Form>
  )
}
```

## データテーブル（TanStack Table統合）

### セットアップ

```bash
npx shadcn@latest add table badge dropdown-menu
npm install @tanstack/react-table
```

### 高機能データテーブルの実装

```tsx
// src/components/data-table/columns.tsx
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"

export type Article = {
  id: string
  title: string
  status: "draft" | "published" | "archived"
  author: string
  views: number
  createdAt: string
}

export const columns: ColumnDef<Article>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        タイトル
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="max-w-[300px] truncate font-medium">
        {row.getValue("title")}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "ステータス",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      const variant = {
        draft: "secondary",
        published: "default",
        archived: "outline",
      }[status] as "secondary" | "default" | "outline"

      const label = {
        draft: "下書き",
        published: "公開中",
        archived: "アーカイブ",
      }[status]

      return <Badge variant={variant}>{label}</Badge>
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "author",
    header: "著者",
  },
  {
    accessorKey: "views",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        閲覧数
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const views = row.getValue("views") as number
      return <div className="text-right">{views.toLocaleString()}</div>
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const article = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>操作</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(article.id)}
            >
              IDをコピー
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>編集</DropdownMenuItem>
            <DropdownMenuItem>プレビュー</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              削除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
```

```tsx
// src/components/data-table/data-table.tsx
"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
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
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] =
    React.useState<ColumnFiltersState>([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: { sorting, columnFilters },
  })

  return (
    <div className="space-y-4">
      <Input
        placeholder="タイトルで検索..."
        value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
        onChange={(event) =>
          table.getColumn("title")?.setFilterValue(event.target.value)
        }
        className="max-w-sm"
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  データがありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length}件中{" "}
          {table.getState().pagination.pageIndex *
            table.getState().pagination.pageSize +
            1}
          -
          {Math.min(
            (table.getState().pagination.pageIndex + 1) *
              table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}
          件を表示
        </p>
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

## テーマのカスタマイズ

### カスタムテーマの作成

```css
/* src/app/globals.css に追加 */

/* ブルーテーマ */
.theme-blue {
  --primary: oklch(0.546 0.245 262.88);
  --primary-foreground: oklch(0.985 0 0);
  --accent: oklch(0.932 0.032 255.59);
  --accent-foreground: oklch(0.293 0.066 243.16);
  --ring: oklch(0.546 0.245 262.88);
}

/* グリーンテーマ */
.theme-green {
  --primary: oklch(0.627 0.194 149.21);
  --primary-foreground: oklch(0.985 0 0);
  --accent: oklch(0.925 0.049 158.2);
  --accent-foreground: oklch(0.266 0.065 152.93);
  --ring: oklch(0.627 0.194 149.21);
}
```

### テーマスイッチャーの実装

```tsx
// src/components/theme-switcher.tsx
"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sun, Moon, Palette } from "lucide-react"

const themes = [
  { name: "デフォルト", value: "", color: "#71717a" },
  { name: "ブルー", value: "theme-blue", color: "#3b82f6" },
  { name: "グリーン", value: "theme-green", color: "#22c55e" },
]

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-2">
      {/* ライト/ダーク切り替え */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </Button>

      {/* カラーテーマ切り替え */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <Palette className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {themes.map((t) => (
            <DropdownMenuItem
              key={t.value}
              onClick={() => {
                document.documentElement.className =
                  document.documentElement.className
                    .replace(/theme-\w+/g, "")
                    .trim() + (t.value ? ` ${t.value}` : "")
              }}
            >
              <div
                className="mr-2 h-4 w-4 rounded-full"
                style={{ backgroundColor: t.color }}
              />
              {t.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
```

## カスタムコンポーネントの作成

### ステップウィザード

shadcn/uiのプリミティブを組み合わせて、独自のコンポーネントを作成できます。

```tsx
// src/components/ui/stepper.tsx
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface StepperProps {
  steps: { title: string; description?: string }[]
  currentStep: number
  className?: string
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <div className={cn("flex w-full items-center", className)}>
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          <div className="flex flex-col items-center gap-2">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                index < currentStep
                  ? "border-primary bg-primary text-primary-foreground"
                  : index === currentStep
                    ? "border-primary text-primary"
                    : "border-muted text-muted-foreground"
              )}
            >
              {index < currentStep ? (
                <Check className="h-5 w-5" />
              ) : (
                index + 1
              )}
            </div>
            <div className="text-center">
              <p
                className={cn(
                  "text-sm font-medium",
                  index <= currentStep
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {step.title}
              </p>
              {step.description && (
                <p className="text-xs text-muted-foreground">
                  {step.description}
                </p>
              )}
            </div>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                "mx-2 h-0.5 flex-1 transition-colors",
                index < currentStep ? "bg-primary" : "bg-muted"
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
```

```tsx
// 使用例
import { Stepper } from "@/components/ui/stepper"

const steps = [
  { title: "アカウント", description: "基本情報の入力" },
  { title: "プラン選択", description: "料金プランの選択" },
  { title: "お支払い", description: "決済情報の入力" },
  { title: "完了", description: "登録完了" },
]

export function SignupWizard() {
  const [currentStep, setCurrentStep] = React.useState(1)

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <Stepper steps={steps} currentStep={currentStep} />
      {/* 各ステップのコンテンツ */}
    </div>
  )
}
```

## アクセシビリティ

shadcn/uiはRadix UIをベースにしているため、WAI-ARIA準拠のアクセシビリティが標準で組み込まれています。

### キーボードナビゲーション

```tsx
// Dialogコンポーネントは自動的にフォーカストラップを実装
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function AccessibleDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>設定を開く</Button>
      </DialogTrigger>
      <DialogContent>
        {/* 自動的にフォーカストラップ・Escキー閉じ対応 */}
        <DialogHeader>
          <DialogTitle>設定</DialogTitle>
          <DialogDescription>
            アプリケーションの設定を変更できます
          </DialogDescription>
        </DialogHeader>
        {/* フォーム内容 */}
      </DialogContent>
    </Dialog>
  )
}
```

### スクリーンリーダー対応

```tsx
// visually-hiddenパターン
import { Label } from "@/components/ui/label"

export function SearchInput() {
  return (
    <div>
      {/* スクリーンリーダーには読まれるが視覚的には非表示 */}
      <Label htmlFor="search" className="sr-only">
        記事を検索
      </Label>
      <Input id="search" placeholder="検索..." />
    </div>
  )
}
```

## パフォーマンス最適化

### Server Components対応

```tsx
// サーバーコンポーネントとして使用可能なもの
// Badge, Card, Table, Separator など

// src/app/articles/page.tsx (Server Component)
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default async function ArticlesPage() {
  const articles = await fetchArticles() // サーバーサイドfetch

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <Card key={article.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{article.title}</CardTitle>
              <Badge>{article.status}</Badge>
            </div>
            <CardDescription>{article.excerpt}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {article.createdAt}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

### 動的インポート

```tsx
// 重いコンポーネントは動的インポート
import dynamic from "next/dynamic"

const DataTable = dynamic(
  () => import("@/components/data-table/data-table").then((mod) => mod.DataTable),
  {
    loading: () => (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)
```

## まとめ

shadcn/ui v3は、2026年のReact開発における最も実践的なUIコンポーネントソリューションの一つです。本記事で紹介した内容をまとめます。

- **設計思想**: コンポーネントのソースコードを直接所有するアプローチにより、完全なカスタマイズ自由度を実現
- **Tailwind CSS v4統合**: oklch色空間、CSS変数ベースのテーマシステムにより、一貫性のあるデザインシステムを構築可能
- **フォーム構築**: React Hook Form + Zodとの統合により、型安全なバリデーション付きフォームを効率的に実装可能
- **データテーブル**: TanStack Tableとの組み合わせで、ソート・フィルタ・ページネーション対応の高機能テーブルを構築可能
- **アクセシビリティ**: Radix UIベースにより、WAI-ARIA準拠のアクセシビリティが標準で組み込まれている
- **パフォーマンス**: React Server Components対応、動的インポートにより、初期ロード時間を最適化可能

shadcn/uiを導入する際は、まず`components.json`の設定を丁寧に行い、プロジェクトのデザインシステムに合わせたテーマカスタマイズを最初に済ませることが、スムーズな開発の鍵となります。

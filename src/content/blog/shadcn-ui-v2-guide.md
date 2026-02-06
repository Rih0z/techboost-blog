---
title: 'shadcn/ui v2完全ガイド2026 - 最新変更点、新コンポーネント、テーマシステム、CLI改善、カスタマイズ徹底解説'
description: 'shadcn/ui v2の全機能を完全網羅。変更点、新コンポーネント、テーマシステム、CLI改善、カスタマイズまで実践的に解説します'
pubDate: 'Feb 05 2026'
tags: ['shadcn/ui', 'React', 'UI', 'Tailwind CSS']
---

# shadcn/ui v2完全ガイド2026

shadcn/ui v2は、コンポーネントライブラリの新しい標準を確立しました。本記事では、v1からの変更点、新機能、実践的な使い方を徹底解説します。

## 目次

1. shadcn/ui v2の概要
2. 主な変更点
3. 新コンポーネント
4. テーマシステムの改善
5. CLI の改善
6. カスタマイズガイド
7. 実践的なパターン
8. パフォーマンス最適化
9. マイグレーションガイド

## shadcn/ui v2の概要

### v2の特徴

```typescript
// v2の主な改善点
// 1. より柔軟なテーマシステム
// 2. 改善されたコンポーネント構造
// 3. TypeScript型定義の強化
// 4. アクセシビリティの向上
// 5. パフォーマンスの最適化
```

### セットアップ

```bash
# プロジェクト作成
npm create vite@latest my-app -- --template react-ts
cd my-app

# shadcn/ui初期化
npx shadcn@latest init

# コンポーネント追加
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
```

### 設定ファイル

```json
// components.json
{
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
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

## 主な変更点

### コンポーネント構造の改善

```typescript
// v1
import { Button } from "@/components/ui/button"

export function MyButton() {
  return <Button>Click me</Button>
}

// v2 - より柔軟なバリアント
import { Button } from "@/components/ui/button"

export function MyButton() {
  return (
    <>
      <Button variant="default">Default</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </>
  )
}
```

### 型安全性の向上

```typescript
// v2 - 厳密な型定義
import { Button, type ButtonProps } from "@/components/ui/button"
import { type VariantProps } from "class-variance-authority"

type CustomButtonProps = ButtonProps & {
  loading?: boolean
  icon?: React.ReactNode
}

export function CustomButton({
  loading,
  icon,
  children,
  ...props
}: CustomButtonProps) {
  return (
    <Button {...props} disabled={loading || props.disabled}>
      {loading ? "Loading..." : (
        <>
          {icon}
          {children}
        </>
      )}
    </Button>
  )
}
```

### アクセシビリティの改善

```typescript
// v2 - 改善されたARIA属性
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
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          {/* 自動的に適切なARIA属性が設定される */}
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
```

## 新コンポーネント

### Carousel

```typescript
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

export function CarouselDemo() {
  const items = [
    { id: 1, title: "Slide 1", image: "/image1.jpg" },
    { id: 2, title: "Slide 2", image: "/image2.jpg" },
    { id: 3, title: "Slide 3", image: "/image3.jpg" },
  ]

  return (
    <Carousel className="w-full max-w-xs">
      <CarouselContent>
        {items.map((item) => (
          <CarouselItem key={item.id}>
            <div className="p-1">
              <Card>
                <CardContent className="flex aspect-square items-center justify-center p-6">
                  <img src={item.image} alt={item.title} />
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  )
}
```

### Breadcrumb

```typescript
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export function BreadcrumbDemo() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="/products">Products</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Product Details</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
```

### Drawer

```typescript
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

export function DrawerDemo() {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline">Open Drawer</Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Move Goal</DrawerTitle>
            <DrawerDescription>
              Set your daily activity goal.
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 pb-0">
            {/* コンテンツ */}
          </div>
          <DrawerFooter>
            <Button>Submit</Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
```

### Resizable

```typescript
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

export function ResizableDemo() {
  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="min-h-[200px] max-w-md rounded-lg border"
    >
      <ResizablePanel defaultSize={50}>
        <div className="flex h-full items-center justify-center p-6">
          <span className="font-semibold">One</span>
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={50}>
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={25}>
            <div className="flex h-full items-center justify-center p-6">
              <span className="font-semibold">Two</span>
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={75}>
            <div className="flex h-full items-center justify-center p-6">
              <span className="font-semibold">Three</span>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
```

### Sonner (Toast)

```typescript
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function SonnerDemo() {
  return (
    <div className="flex gap-2">
      <Button
        onClick={() =>
          toast("Event has been created", {
            description: "Sunday, December 03, 2023 at 9:00 AM",
          })
        }
      >
        Show Toast
      </Button>

      <Button
        onClick={() =>
          toast.success("Success!", {
            description: "Your changes have been saved.",
          })
        }
      >
        Success
      </Button>

      <Button
        variant="destructive"
        onClick={() =>
          toast.error("Error!", {
            description: "Something went wrong.",
          })
        }
      >
        Error
      </Button>
    </div>
  )
}

// App.tsxでToasterを追加
import { Toaster } from "@/components/ui/sonner"

export function App() {
  return (
    <>
      {/* アプリケーションコンテンツ */}
      <Toaster />
    </>
  )
}
```

## テーマシステムの改善

### CSS変数ベースのテーマ

```css
/* globals.css */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;

    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;

    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;

    --primary: 221.2 83.2% 53.3%;
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
    --ring: 221.2 83.2% 53.3%;

    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;

    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;

    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;

    --primary: 217.2 91.2% 59.8%;
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
    --ring: 224.3 76.3% 48%;
  }
}
```

### カスタムテーマの作成

```typescript
// lib/theme-provider.tsx
import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined
)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
```

### テーマ切り替えコンポーネント

```typescript
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/theme-provider"

export function ThemeToggle() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

## CLIの改善

### コンポーネントの一括追加

```bash
# 複数コンポーネントを一度に追加
npx shadcn@latest add button card dialog dropdown-menu

# すべてのコンポーネントを追加
npx shadcn@latest add --all

# 特定のスタイルで追加
npx shadcn@latest add button --style new-york
```

### カスタムコンポーネントの作成

```bash
# カスタムコンポーネントディレクトリから追加
npx shadcn@latest add --path ./custom-components

# リモートから追加
npx shadcn@latest add https://example.com/custom-button.tsx
```

### 設定の更新

```bash
# 設定を対話的に更新
npx shadcn@latest init

# 特定の設定を更新
npx shadcn@latest init --style new-york
npx shadcn@latest init --base-color slate
```

## カスタマイズガイド

### バリアントの追加

```typescript
// components/ui/button.tsx
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "underline-offset-4 hover:underline text-primary",
        // カスタムバリアント
        gradient: "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600",
        neon: "bg-black text-green-400 border-2 border-green-400 hover:bg-green-400 hover:text-black",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
        // カスタムサイズ
        xl: "h-14 px-12 rounded-lg text-lg",
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

export { Button, buttonVariants }
```

### コンポーネントの拡張

```typescript
// components/custom/loading-button.tsx
import { Button, type ButtonProps } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean
}

export function LoadingButton({
  loading,
  disabled,
  children,
  ...props
}: LoadingButtonProps) {
  return (
    <Button disabled={loading || disabled} {...props}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  )
}

// 使用例
export function Form() {
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setLoading(false)
  }

  return (
    <LoadingButton loading={loading} onClick={handleSubmit}>
      Submit
    </LoadingButton>
  )
}
```

### 複合コンポーネントの作成

```typescript
// components/custom/search-input.tsx
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
}: SearchInputProps) {
  return (
    <div className="relative">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-8"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full"
          onClick={() => onChange("")}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
```

## 実践的なパターン

### フォームビルダー

```typescript
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
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
import { Button } from "@/components/ui/button"

const formSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  password: z.string().min(8),
})

export function SignUpForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values)
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
              <FormDescription>
                This is your public display name.
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

        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}
```

### データテーブル

```typescript
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from "@tanstack/react-table"

type User = {
  id: string
  name: string
  email: string
  role: string
}

const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "role",
    header: "Role",
  },
]

export function DataTable({ data }: { data: User[] }) {
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  })

  return (
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
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
```

### ダッシュボードレイアウト

```typescript
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Overview } from "@/components/overview"
import { RecentSales } from "@/components/recent-sales"

export function Dashboard() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Button>Download</Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$45,231.89</div>
                <p className="text-xs text-muted-foreground">
                  +20.1% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Subscriptions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+2350</div>
                <p className="text-xs text-muted-foreground">
                  +180.1% from last month
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <Overview />
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Recent Sales</CardTitle>
                <CardDescription>
                  You made 265 sales this month.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecentSales />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

## パフォーマンス最適化

### 遅延読み込み

```typescript
import { lazy, Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"

// コンポーネントの遅延読み込み
const HeavyComponent = lazy(() => import("@/components/heavy-component"))

export function App() {
  return (
    <Suspense fallback={<Skeleton className="w-full h-96" />}>
      <HeavyComponent />
    </Suspense>
  )
}
```

### メモ化

```typescript
import { memo } from "react"
import { Card, CardContent } from "@/components/ui/card"

type ItemProps = {
  id: string
  title: string
  description: string
}

export const ListItem = memo(({ id, title, description }: ItemProps) => {
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
})
```

### バーチャルスクロール

```typescript
import { useVirtualizer } from "@tanstack/react-virtual"
import { useRef } from "react"

export function VirtualList({ items }: { items: any[] }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  })

  return (
    <div
      ref={parentRef}
      className="h-96 overflow-auto border rounded-md"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <Card className="m-2">
              <CardContent className="p-4">
                {items[virtualItem.index].title}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
}
```

## マイグレーションガイド

### v1からv2への移行

```typescript
// v1
import { Button } from "@/components/ui/button"

<Button variant="default">Click me</Button>

// v2 - 変更なし（互換性あり）
import { Button } from "@/components/ui/button"

<Button variant="default">Click me</Button>

// 新しいバリアントの使用
<Button variant="ghost">Ghost Button</Button>
```

### コンポーネントの更新

```bash
# 既存コンポーネントを最新版に更新
npx shadcn@latest add button --overwrite

# すべてのコンポーネントを更新
npx shadcn@latest add --all --overwrite
```

### 破壊的変更への対応

```typescript
// v1 - Dialog
<DialogPrimitive.Root>
  <DialogPrimitive.Trigger />
  <DialogPrimitive.Content />
</DialogPrimitive.Root>

// v2 - より簡潔なAPI
<Dialog>
  <DialogTrigger />
  <DialogContent />
</Dialog>
```

## まとめ

shadcn/ui v2は、より柔軟で強力なUIコンポーネントライブラリに進化しました。

**主な改善点**:

1. **新コンポーネント**: Carousel、Drawer、Breadcrumb、Resizable
2. **テーマシステム**: CSS変数ベースの柔軟なカスタマイズ
3. **CLI改善**: 一括追加、カスタムコンポーネント対応
4. **型安全性**: 厳密な型定義とバリアント
5. **アクセシビリティ**: ARIA属性の自動設定

**2026年のベストプラクティス**:

- コンポーネントは必要なものだけ追加
- カスタムバリアントで独自デザインを実現
- テーマプロバイダーでダークモード対応
- フォームはreact-hook-formとzodで型安全に
- パフォーマンス最適化には遅延読み込みとメモ化

shadcn/ui v2を活用して、美しく保守性の高いUIを構築しましょう。

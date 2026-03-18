---
title: 'shadcn/ui完全ガイド — コピペで使えるReactコンポーネント集とカスタマイズ術'
description: 'shadcn/uiの全コンポーネントを徹底解説。インストール、カスタマイズ、Next.js 15との統合、テーマ切り替え、フォームバリデーション、実践的なデザインパターンまで完全網羅します。'
pubDate: '2025-02-06'
tags: ['shadcn-ui', 'React', 'UI Components', 'Tailwind CSS', 'Radix UI']
---

shadcn/uiは、2023年に登場してから爆発的に人気を博しているReactコンポーネントライブラリです。2026年現在、Next.js、Remix、Astroなど主要フレームワークで標準的に使われています。

この記事では、shadcn/uiの全コンポーネントとカスタマイズ方法を実践的なコード例とともに完全解説します。

## shadcn/uiとは

shadcn/uiは「コンポーネントライブラリ」ではなく、**コピー&ペーストできるコンポーネント集**です。

### 従来のUIライブラリとの違い

```bash
# 従来のライブラリ（Material-UI、Chakra UI等）
npm install @mui/material
import { Button } from '@mui/material';

# shadcn/ui
npx shadcn@latest add button
# → components/ui/button.tsxにコードがコピーされる
```

shadcn/uiは**パッケージをインストールしない**のが最大の特徴です。コンポーネントのソースコードが直接プロジェクトにコピーされるため、自由にカスタマイズできます。

### 技術スタック

- **Radix UI** - アクセシビリティ対応の低レベルUI
- **Tailwind CSS** - スタイリング
- **class-variance-authority (CVA)** - バリアント管理
- **clsx** - クラス名の条件付き結合

## プロジェクトセットアップ

### Next.js 15プロジェクトの作成

```bash
npx create-next-app@latest my-shadcn-app --typescript --tailwind --app
cd my-shadcn-app
```

### shadcn/uiの初期化

```bash
npx shadcn@latest init
```

対話形式で以下を選択:

```
✔ Which style would you like to use? › New York
✔ Which color would you like to use as base color? › Slate
✔ Would you like to use CSS variables for colors? › yes
```

これで以下のファイルが生成されます:

```
my-shadcn-app/
├── components/
│   └── ui/              # コンポーネントはここに配置
├── lib/
│   └── utils.ts         # cn()ユーティリティ
└── components.json      # shadcn設定
```

## 基本コンポーネント

### Button

```bash
npx shadcn@latest add button
```

```typescript
// app/page.tsx
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="p-8 space-y-4">
      {/* デフォルト */}
      <Button>Default</Button>

      {/* バリアント */}
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>

      {/* サイズ */}
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon">⭐</Button>

      {/* 状態 */}
      <Button disabled>Disabled</Button>
      <Button loading>Loading</Button>
    </div>
  );
}
```

### カスタマイズ例

```typescript
// components/ui/button.tsx
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground',
        outline: 'border border-input hover:bg-accent',
        // カスタムバリアント追加
        success: 'bg-green-500 text-white hover:bg-green-600',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
        // カスタムサイズ追加
        xl: 'h-14 px-12 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

// 使用例
<Button variant="success" size="xl">
  カスタムボタン
</Button>
```

## フォームコンポーネント

### Input、Label、Form

```bash
npx shadcn@latest add input label form
```

```typescript
// app/login/page.tsx
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

const formSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上必要です'),
});

export default function LoginPage() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>メールアドレス</FormLabel>
              <FormControl>
                <Input placeholder="you@example.com" {...field} />
              </FormControl>
              <FormDescription>
                ログインに使用するメールアドレスを入力してください。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>パスワード</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">ログイン</Button>
      </form>
    </Form>
  );
}
```

### Select、Checkbox、RadioGroup

```bash
npx shadcn@latest add select checkbox radio-group
```

```typescript
// app/settings/page.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const formSchema = z.object({
  language: z.string(),
  theme: z.enum(['light', 'dark', 'system']),
  notifications: z.boolean(),
});

export default function SettingsPage() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      language: 'ja',
      theme: 'system',
      notifications: true,
    },
  });

  return (
    <Form {...form}>
      <form className="space-y-6">
        {/* Select */}
        <FormField
          control={form.control}
          name="language"
          render={({ field }) => (
            <FormItem>
              <FormLabel>言語</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="言語を選択" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ja">日本語</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Radio Group */}
        <FormField
          control={form.control}
          name="theme"
          render={({ field }) => (
            <FormItem>
              <FormLabel>テーマ</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="light" />
                    </FormControl>
                    <FormLabel className="font-normal">ライト</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="dark" />
                    </FormControl>
                    <FormLabel className="font-normal">ダーク</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="system" />
                    </FormControl>
                    <FormLabel className="font-normal">システム</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Checkbox */}
        <FormField
          control={form.control}
          name="notifications"
          render={({ field }) => (
            <FormItem className="flex items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>通知を受け取る</FormLabel>
              </div>
            </FormItem>
          )}
        />

        <Button type="submit">保存</Button>
      </form>
    </Form>
  );
}
```

## ナビゲーションコンポーネント

### Dialog（モーダル）

```bash
npx shadcn@latest add dialog
```

```typescript
// components/CreatePostDialog.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CreatePostDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>新規投稿</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>新規投稿</DialogTitle>
          <DialogDescription>
            記事の情報を入力してください。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              タイトル
            </Label>
            <Input id="title" className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="content" className="text-right">
              内容
            </Label>
            <Input id="content" className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={() => setOpen(false)}>
            作成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Dropdown Menu

```bash
npx shadcn@latest add dropdown-menu
```

```typescript
// components/UserMenu.tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">アカウント</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>マイアカウント</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>プロフィール</DropdownMenuItem>
        <DropdownMenuItem>設定</DropdownMenuItem>
        <DropdownMenuItem>チーム</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600">
          ログアウト
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Sheet（サイドバー）

```bash
npx shadcn@latest add sheet
```

```typescript
// components/MobileNav.tsx
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

export function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon">
          ☰
        </Button>
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>メニュー</SheetTitle>
          <SheetDescription>
            ナビゲーションメニュー
          </SheetDescription>
        </SheetHeader>
        <nav className="mt-8 flex flex-col gap-4">
          <a href="/dashboard">ダッシュボード</a>
          <a href="/posts">投稿</a>
          <a href="/settings">設定</a>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
```

## データ表示コンポーネント

### Table

```bash
npx shadcn@latest add table
```

```typescript
// app/users/page.tsx
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const users = [
  { id: '1', name: '山田太郎', email: 'yamada@example.com', role: 'Admin' },
  { id: '2', name: '佐藤花子', email: 'sato@example.com', role: 'User' },
  { id: '3', name: '鈴木一郎', email: 'suzuki@example.com', role: 'User' },
];

export default function UsersPage() {
  return (
    <Table>
      <TableCaption>ユーザー一覧</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>名前</TableHead>
          <TableHead>メールアドレス</TableHead>
          <TableHead>権限</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>{user.role}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### Card

```bash
npx shadcn@latest add card
```

```typescript
// app/dashboard/page.tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>総ユーザー数</CardTitle>
          <CardDescription>過去30日間の増加</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">1,234</p>
          <p className="text-sm text-green-600">+12.5%</p>
        </CardContent>
        <CardFooter>
          <Button variant="outline">詳細</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>収益</CardTitle>
          <CardDescription>今月の売上</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">¥567,890</p>
          <p className="text-sm text-green-600">+8.2%</p>
        </CardContent>
        <CardFooter>
          <Button variant="outline">詳細</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
```

### Badge、Avatar、Separator

```bash
npx shadcn@latest add badge avatar separator
```

```typescript
// components/UserProfile.tsx
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export function UserProfile() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold">山田太郎</h3>
          <p className="text-sm text-muted-foreground">yamada@example.com</p>
        </div>
        <Badge>Pro</Badge>
      </div>

      <Separator />

      <div>
        <p>プロフィール情報...</p>
      </div>
    </div>
  );
}
```

## テーマとカスタマイズ

### カラースキーム変更

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

### ダークモード切り替え

```bash
npm install next-themes
```

```typescript
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

```typescript
// components/ThemeToggle.tsx
'use client';

import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="outline"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      {theme === 'dark' ? '🌙' : '☀️'}
    </Button>
  );
}
```

## 実践的なデザインパターン

### データテーブル（ソート・フィルタ付き）

```bash
npx shadcn@latest add table
npm install @tanstack/react-table
```

```typescript
// app/posts/data-table.tsx
'use client';

import { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function DataTable({ columns, data }) {
  const [sorting, setSorting] = useState([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

## ベストプラクティス

### 1. コンポーネントの再利用

```typescript
// components/custom/ConfirmDialog.tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>実行</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### 2. フォームの型安全

```typescript
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormValues = z.infer<typeof schema>;

const form = useForm<FormValues>({
  resolver: zodResolver(schema),
});
```

### 3. アクセシビリティ

shadcn/uiは[Radix UI](https://www.radix-ui.com/)ベースなので、アクセシビリティは自動的に確保されます。

```typescript
// キーボード操作、ARIA属性、フォーカス管理が自動対応
<Dialog>
  <DialogTrigger>開く</DialogTrigger>
  <DialogContent>
    {/* ESCで閉じる、フォーカストラップ等が自動 */}
  </DialogContent>
</Dialog>
```

## まとめ

shadcn/uiは、コピー&ペーストで使えるReactコンポーネント集です。

- **自由なカスタマイズ** - ソースコードが直接プロジェクトに
- **Tailwind CSS統合** - スタイリングが簡単
- **アクセシビリティ** - Radix UIベース
- **型安全** - TypeScriptフル対応
- **フォームバリデーション** - Zod統合

Next.js 15 + shadcn/ui + Tailwind CSSの組み合わせで、高速で美しいUIを簡単に構築できます。まずは`npx shadcn@latest init`から始めましょう。

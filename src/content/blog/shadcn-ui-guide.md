---
title: "shadcn/ui 完全ガイド2026 — コンポーネント設計・カスタマイズ・Next.js統合"
description: "shadcn/uiの完全ガイド。インストールからコンポーネント追加、テーマ変更、Radix UIとの関係、アクセシビリティ対応、Next.js統合まで実践的に解説します。"
pubDate: "2026-03-04"
tags: ["shadcn-ui", "React", "TypeScript", "UI", "コンポーネント"]
---

## はじめに

**shadcn/ui** はコンポーネントライブラリではなく、**コンポーネントのコレクション** です。npmでインストールするのではなく、必要なコンポーネントのソースコードをプロジェクトにコピーして使います。これにより、完全なカスタマイズが可能で、バンドルサイズも最小化できます。

## shadcn/ui の特徴

- **コードオーナーシップ**: コンポーネントはあなたのプロジェクトの一部
- **Radix UI 基盤**: アクセシビリティが保証されたプリミティブを使用
- **Tailwind CSS**: スタイリングにTailwindを使用
- **TypeScript対応**: 完全な型定義付き

## セットアップ（Next.js）

```bash
# Next.js プロジェクト作成
npx create-next-app@latest my-app --typescript --tailwind --eslint --app

# shadcn/ui の初期化
cd my-app
npx shadcn@latest init
```

初期化時の設定：

```
Which style would you like to use? › Default
Which color would you like to use as base color? › Slate
Would you like to use CSS variables for colors? › yes
```

これにより `components.json` と `src/lib/utils.ts`、`src/app/globals.css` が設定されます。

## コンポーネントの追加

```bash
# 個別に追加
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add dialog
npx shadcn@latest add form

# 複数まとめて追加
npx shadcn@latest add button input form dialog card
```

追加されたコンポーネントは `src/components/ui/` に配置されます。

```typescript
// src/components/ui/button.tsx（追加後のファイル）
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
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

// カスタマイズはこのファイルを直接編集するだけ！
```

## Form コンポーネントの活用

shadcn/uiのFormはReact Hook Formとzodを統合しています。

```typescript
// src/components/ContactForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";

const formSchema = z.object({
  name: z.string().min(2, "名前は2文字以上で入力してください"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  message: z.string().min(10, "メッセージは10文字以上で入力してください"),
});

type FormData = z.infer<typeof formSchema>;

export function ContactForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      message: "",
    },
  });

  async function onSubmit(values: FormData) {
    try {
      await fetch("/api/contact", {
        method: "POST",
        body: JSON.stringify(values),
      });
      toast({
        title: "送信完了",
        description: "お問い合わせを受け付けました。",
      });
      form.reset();
    } catch {
      toast({
        title: "エラー",
        description: "送信に失敗しました。",
        variant: "destructive",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>お名前</FormLabel>
              <FormControl>
                <Input placeholder="田中太郎" {...field} />
              </FormControl>
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
                <Input type="email" placeholder="tanaka@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>メッセージ</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="お問い合わせ内容をご記入ください"
                  className="min-h-32"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                10文字以上で入力してください
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "送信中..." : "送信する"}
        </Button>
      </form>
    </Form>
  );
}
```

## テーマのカスタマイズ

```css
/* src/app/globals.css */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;

    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;

    --primary: 221.2 83.2% 53.3%;  /* ブランドカラーに変更 */
    --primary-foreground: 210 40% 98%;

    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;

    --radius: 0.75rem;  /* 角丸の調整 */
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;

    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
  }
}
```

## Dialog コンポーネントの実装例

```typescript
// src/components/DeleteConfirmDialog.tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface DeleteConfirmDialogProps {
  itemName: string;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({
  itemName,
  onConfirm,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          削除
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            「{itemName}」を削除します。この操作は取り消せません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            削除する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

## まとめ

shadcn/uiの主要な利点をまとめます。

- **完全なコントロール**: コンポーネントのソースコードを直接編集できる
- **アクセシビリティ**: Radix UIによりWAI-ARIAが自動的に対応
- **型安全**: 完全なTypeScript型定義
- **バンドルサイズ最適化**: 使ったコンポーネントのみがバンドルされる
- **テーマの柔軟性**: CSS変数とTailwindで自由にデザイン変更可能

shadcn/uiはUIライブラリの新しいアプローチとして2026年現在、Next.jsプロジェクトで最も人気のある選択肢の一つです。

---
title: 'shadcn/ui応用ガイド2026 — カスタムコンポーネントと実践テクニック'
description: 'shadcn/uiの応用編。カスタムコンポーネント作成、高度なテーマカスタマイズ、アニメーション、パフォーマンス最適化を解説します。'
pubDate: 'Feb 05 2026'
tags: ['shadcn/ui', 'React', 'Tailwind CSS', 'Advanced', 'Custom Components']
---

shadcn/uiは基本的なコンポーネントを提供していますが、実際のプロジェクトでは独自のコンポーネントやカスタマイズが必要になります。この記事では、shadcn/uiの応用テクニックを実践的に解説します。

## カスタムコンポーネントの作成

### データテーブル（TanStack Table統合）

```bash
npm install @tanstack/react-table
npx shadcn-ui@latest add table
```

```tsx
// components/ui/data-table.tsx
'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  return (
    <div>
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
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
```

使用例:

```tsx
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'role',
    header: 'Role',
  },
];

const data: User[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Admin' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
];

export default function UsersPage() {
  return (
    <div className="container mx-auto py-10">
      <DataTable columns={columns} data={data} />
    </div>
  );
}
```

### ファイルアップロード

```tsx
// components/ui/file-upload.tsx
'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { Upload, X } from 'lucide-react';
import { Button } from './button';

interface FileUploadProps {
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  accept?: Record<string, string[]>;
}

export function FileUpload({ onFilesChange, maxFiles = 1, accept }: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = [...files, ...acceptedFiles].slice(0, maxFiles);
      setFiles(newFiles);
      onFilesChange(newFiles);
    },
    [files, maxFiles, onFilesChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    accept,
  });

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFilesChange(newFiles);
  };

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        {isDragActive ? (
          <p>Drop the files here...</p>
        ) : (
          <p>Drag & drop files here, or click to select files</p>
        )}
      </div>

      {files.length > 0 && (
        <ul className="mt-4 space-y-2">
          {files.map((file, index) => (
            <li
              key={index}
              className="flex items-center justify-between p-2 bg-gray-50 rounded"
            >
              <span className="text-sm truncate">{file.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### ステッパー（マルチステップフォーム）

```tsx
// components/ui/stepper.tsx
'use client';

import { createContext, useContext, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface StepperContextType {
  currentStep: number;
  totalSteps: number;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
}

const StepperContext = createContext<StepperContextType | undefined>(undefined);

export function Stepper({ children, steps }: { children: React.ReactNode; steps: number }) {
  const [currentStep, setCurrentStep] = useState(0);

  const goToStep = (step: number) => {
    if (step >= 0 && step < steps) {
      setCurrentStep(step);
    }
  };

  const nextStep = () => goToStep(currentStep + 1);
  const prevStep = () => goToStep(currentStep - 1);

  return (
    <StepperContext.Provider
      value={{
        currentStep,
        totalSteps: steps,
        goToStep,
        nextStep,
        prevStep,
      }}
    >
      {children}
    </StepperContext.Provider>
  );
}

export function StepperHeader({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between mb-8">{children}</div>;
}

export function StepperStep({ index, children }: { index: number; children: React.ReactNode }) {
  const context = useContext(StepperContext);
  if (!context) throw new Error('StepperStep must be used within Stepper');

  const { currentStep, goToStep } = context;
  const isActive = currentStep === index;
  const isCompleted = currentStep > index;

  return (
    <button
      onClick={() => goToStep(index)}
      className={cn(
        'flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors',
        isActive && 'bg-primary text-primary-foreground',
        isCompleted && 'bg-green-100 text-green-700',
        !isActive && !isCompleted && 'bg-gray-100 text-gray-500'
      )}
    >
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center font-semibold',
          isActive && 'bg-white text-primary',
          isCompleted && 'bg-green-500 text-white',
          !isActive && !isCompleted && 'bg-gray-300 text-gray-600'
        )}
      >
        {index + 1}
      </div>
      <span>{children}</span>
    </button>
  );
}

export function StepperContent({ children }: { children: React.ReactNode }) {
  return <div className="my-8">{children}</div>;
}

export function StepperActions({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-between mt-8">{children}</div>;
}

export function useStepper() {
  const context = useContext(StepperContext);
  if (!context) throw new Error('useStepper must be used within Stepper');
  return context;
}
```

使用例:

```tsx
'use client';

import {
  Stepper,
  StepperHeader,
  StepperStep,
  StepperContent,
  StepperActions,
  useStepper,
} from '@/components/ui/stepper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function MultiStepForm() {
  return (
    <Stepper steps={3}>
      <StepperHeader>
        <StepperStep index={0}>Account</StepperStep>
        <StepperStep index={1}>Profile</StepperStep>
        <StepperStep index={2}>Confirm</StepperStep>
      </StepperHeader>

      <StepperContent>
        <StepContent />
      </StepperContent>

      <StepperActions>
        <NavigationButtons />
      </StepperActions>
    </Stepper>
  );
}

function StepContent() {
  const { currentStep } = useStepper();

  switch (currentStep) {
    case 0:
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Account Information</h2>
          <Input placeholder="Email" type="email" />
          <Input placeholder="Password" type="password" />
        </div>
      );
    case 1:
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Profile Details</h2>
          <Input placeholder="Full Name" />
          <Input placeholder="Phone" />
        </div>
      );
    case 2:
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Confirm</h2>
          <p>Please review your information and submit.</p>
        </div>
      );
    default:
      return null;
  }
}

function NavigationButtons() {
  const { currentStep, totalSteps, nextStep, prevStep } = useStepper();

  return (
    <>
      <Button
        variant="outline"
        onClick={prevStep}
        disabled={currentStep === 0}
      >
        Previous
      </Button>
      <Button onClick={nextStep} disabled={currentStep === totalSteps - 1}>
        {currentStep === totalSteps - 1 ? 'Submit' : 'Next'}
      </Button>
    </>
  );
}
```

## 高度なテーマカスタマイズ

### グラデーションカラー

```css
/* app/globals.css */
@layer base {
  :root {
    --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --gradient-success: linear-gradient(135deg, #10b981 0%, #059669 100%);
    --gradient-warning: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  }
}
```

```tsx
// components/ui/gradient-button.tsx
import { Button } from './button';
import { cn } from '@/lib/utils';

export function GradientButton({ children, className, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn(
        'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600',
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}
```

### ガラスモーフィズム

```tsx
// components/ui/glass-card.tsx
import { Card } from './card';
import { cn } from '@/lib/utils';

export function GlassCard({ children, className, ...props }: React.ComponentProps<typeof Card>) {
  return (
    <Card
      className={cn(
        'backdrop-blur-lg bg-white/30 dark:bg-gray-900/30 border border-white/20 shadow-xl',
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );
}
```

### ニューモーフィズム

```css
/* app/globals.css */
.neumorphic {
  background: #e0e5ec;
  box-shadow:
    9px 9px 16px rgba(163, 177, 198, 0.6),
    -9px -9px 16px rgba(255, 255, 255, 0.5);
}

.neumorphic-inset {
  box-shadow:
    inset 9px 9px 16px rgba(163, 177, 198, 0.6),
    inset -9px -9px 16px rgba(255, 255, 255, 0.5);
}
```

## アニメーション

### Framer Motionとの統合

```bash
npm install framer-motion
```

```tsx
// components/ui/animated-card.tsx
'use client';

import { motion } from 'framer-motion';
import { Card } from './card';

export function AnimatedCard({ children, ...props }: React.ComponentProps<typeof Card>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card {...props}>{children}</Card>
    </motion.div>
  );
}
```

### スケルトンローディング

```tsx
// components/ui/skeleton-card.tsx
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function SkeletonCard() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
  );
}
```

### ページトランジション

```tsx
// components/page-transition.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

## パフォーマンス最適化

### 遅延読み込み

```tsx
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('@/components/heavy-component'), {
  loading: () => <SkeletonCard />,
  ssr: false,
});
```

### メモ化

```tsx
'use client';

import { memo, useMemo } from 'react';
import { DataTable } from '@/components/ui/data-table';

const MemoizedDataTable = memo(DataTable);

export function OptimizedTable({ data }: { data: any[] }) {
  const columns = useMemo(() => [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'email', header: 'Email' },
  ], []);

  return <MemoizedDataTable columns={columns} data={data} />;
}
```

### バーチャルスクロール

```bash
npm install @tanstack/react-virtual
```

```tsx
'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

export function VirtualList({ items }: { items: string[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {items[virtualRow.index]}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## アクセシビリティ

### キーボードナビゲーション

```tsx
'use client';

import { useCallback } from 'react';

export function useKeyboardNavigation() {
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        // 次の要素にフォーカス
        break;
      case 'ArrowUp':
        e.preventDefault();
        // 前の要素にフォーカス
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        // 選択
        break;
      case 'Escape':
        // 閉じる
        break;
    }
  }, []);

  return { handleKeyDown };
}
```

### スクリーンリーダー対応

```tsx
<button
  aria-label="Close dialog"
  aria-describedby="dialog-description"
  onClick={onClose}
>
  <X className="h-4 w-4" />
</button>
```

## まとめ

shadcn/uiの応用テクニック:

**カスタムコンポーネント:**
- データテーブル（TanStack Table）
- ファイルアップロード
- ステッパー（マルチステップフォーム）

**テーマカスタマイズ:**
- グラデーション
- ガラスモーフィズム
- ニューモーフィズム

**アニメーション:**
- Framer Motion統合
- ページトランジション
- スケルトンローディング

**パフォーマンス:**
- 遅延読み込み
- メモ化
- バーチャルスクロール

これらのテクニックを使って、shadcn/uiをさらに活用しましょう。

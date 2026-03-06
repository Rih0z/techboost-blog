---
title: 'Ark UI + Park UI：ヘッドレスUIコンポーネント完全ガイド'
description: 'Ark UIとPark UIを使ったアクセシブルなUIコンポーネントの構築方法。ヘッドレスコンポーネント、プリセット、カスタマイズまで実践的に解説します。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。'
pubDate: 'Feb 05 2026'
tags: ['Ark UI', 'Park UI', 'React', 'アクセシビリティ', 'UI Components']
---
# Ark UI + Park UI：ヘッドレスUIコンポーネント完全ガイド

UIコンポーネントライブラリの選択は、プロジェクトの成功を左右する重要な決定です。デザインの柔軟性を保ちつつ、アクセシビリティとユーザビリティを確保する必要があります。

Ark UIは、ヘッドレスUIコンポーネントのライブラリで、ロジックと状態管理を提供しながら、スタイリングの自由を完全に保ちます。Park UIは、Ark UIの上に構築された美しいプリセットコンポーネント集です。

この記事では、Ark UIとPark UIの基本から実践的な使い方まで、詳しく解説していきます。

## Ark UIとは

Ark UIは、Chakra UIの開発チームによって作られたヘッドレスUIコンポーネントライブラリです。

### 主な特徴

- **ヘッドレス設計**: スタイリングは完全に自由
- **フレームワーク対応**: React、Vue、Solidをサポート
- **アクセシビリティ**: ARIA準拠
- **TypeScriptファースト**: 完全な型安全性
- **状態管理**: Zag.js（状態マシン）を使用
- **コンポジション**: 柔軟なコンポーネント組み合わせ

### Park UIとは

Park UIは、Ark UIをベースにした美しいプリセットコンポーネント集です。

- **即座に使える**: プリセットされたスタイル
- **カスタマイズ可能**: Panda CSSベース
- **レスポンシブ**: モバイルファースト
- **ダークモード**: 標準でサポート
- **アニメーション**: スムーズなトランジション

## セットアップ

### Ark UIのインストール

```bash
npm install @ark-ui/react
# または
pnpm add @ark-ui/react
```

### Park UIのインストール

Park UIを使う場合、Panda CSSも必要です。

```bash
# Panda CSSのインストール
npm install -D @pandacss/dev
npx panda init

# Park UIコンポーネントのインストール
npx @park-ui/cli init
```

インストール時の質問：

```
? Which UI library would you like to use? React
? Which style library would you like to use? Panda CSS
? Where would you like to store your components? components/ui
? Would you like to use TypeScript? Yes
```

### 設定ファイル

`panda.config.ts` が自動生成されます。

```typescript
import { defineConfig } from "@pandacss/dev";
import { createPreset } from "@park-ui/panda-preset";

export default defineConfig({
  preflight: true,
  presets: [
    "@pandacss/preset-base",
    createPreset({
      accentColor: "blue",
      grayColor: "slate",
      borderRadius: "md",
    }),
  ],
  include: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./pages/**/*.{js,jsx,ts,tsx}",
  ],
  exclude: [],
  outdir: "styled-system",
});
```

## 基本的な使い方

### Ark UIの基本

#### アコーディオン

```typescript
// components/accordion-example.tsx
import { Accordion } from "@ark-ui/react";

export function AccordionExample() {
  return (
    <Accordion.Root>
      <Accordion.Item value="item-1">
        <Accordion.ItemTrigger>
          What is Ark UI?
        </Accordion.ItemTrigger>
        <Accordion.ItemContent>
          Ark UI is a headless UI component library that provides
          the logic and state management for building accessible
          UI components.
        </Accordion.ItemContent>
      </Accordion.Item>

      <Accordion.Item value="item-2">
        <Accordion.ItemTrigger>
          Why use headless components?
        </Accordion.ItemTrigger>
        <Accordion.ItemContent>
          Headless components separate logic from presentation,
          giving you complete control over styling while ensuring
          accessibility and behavior.
        </Accordion.ItemContent>
      </Accordion.Item>

      <Accordion.Item value="item-3">
        <Accordion.ItemTrigger>
          Is it production ready?
        </Accordion.ItemTrigger>
        <Accordion.ItemContent>
          Yes! Ark UI is used in production by many companies
          and is actively maintained.
        </Accordion.ItemContent>
      </Accordion.Item>
    </Accordion.Root>
  );
}
```

#### ダイアログ（モーダル）

```typescript
// components/dialog-example.tsx
import { Dialog } from "@ark-ui/react";
import { useState } from "react";

export function DialogExample() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={(e) => setOpen(e.open)}>
      <Dialog.Trigger>Open Dialog</Dialog.Trigger>

      <Dialog.Backdrop />

      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Title>Dialog Title</Dialog.Title>
          <Dialog.Description>
            This is a dialog description that explains what
            this dialog is about.
          </Dialog.Description>

          <div>
            <label htmlFor="name">Name:</label>
            <input id="name" type="text" />
          </div>

          <div>
            <Dialog.CloseTrigger>Cancel</Dialog.CloseTrigger>
            <button onClick={() => setOpen(false)}>
              Save
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
```

### Park UIの基本

Park UIを使うと、スタイル済みのコンポーネントをすぐに使えます。

#### ボタン

```bash
npx @park-ui/cli add button
```

使用例：

```typescript
// app/page.tsx
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div>
      <Button>Default Button</Button>
      <Button variant="outline">Outline Button</Button>
      <Button variant="ghost">Ghost Button</Button>
      <Button size="sm">Small Button</Button>
      <Button size="lg">Large Button</Button>
    </div>
  );
}
```

#### カード

```bash
npx @park-ui/cli add card
```

使用例：

```typescript
// components/product-card.tsx
import { Card } from "@/components/ui/card";

export function ProductCard() {
  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>Premium Plan</Card.Title>
        <Card.Description>
          Best for professional use
        </Card.Description>
      </Card.Header>

      <Card.Body>
        <div className="text-4xl font-bold">$99</div>
        <ul className="space-y-2 mt-4">
          <li>✓ Unlimited projects</li>
          <li>✓ Priority support</li>
          <li>✓ Advanced analytics</li>
        </ul>
      </Card.Body>

      <Card.Footer>
        <Button width="full">Subscribe</Button>
      </Card.Footer>
    </Card.Root>
  );
}
```

## 主要コンポーネント

### セレクト

複雑なドロップダウン選択を簡単に実装できます。

```typescript
// components/select-example.tsx
import { Select } from "@ark-ui/react";

const frameworks = [
  { value: "react", label: "React" },
  { value: "vue", label: "Vue" },
  { value: "solid", label: "Solid" },
  { value: "svelte", label: "Svelte" },
];

export function SelectExample() {
  return (
    <Select.Root items={frameworks}>
      <Select.Label>Framework</Select.Label>
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder="Select a framework" />
          <Select.Indicator>▼</Select.Indicator>
        </Select.Trigger>
      </Select.Control>

      <Select.Positioner>
        <Select.Content>
          {frameworks.map((framework) => (
            <Select.Item key={framework.value} item={framework}>
              <Select.ItemText>{framework.label}</Select.ItemText>
              <Select.ItemIndicator>✓</Select.ItemIndicator>
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select.Root>
  );
}
```

### コンボボックス（オートコンプリート）

検索可能なセレクトボックスです。

```typescript
// components/combobox-example.tsx
import { Combobox } from "@ark-ui/react";
import { useState } from "react";

const countries = [
  { value: "jp", label: "Japan" },
  { value: "us", label: "United States" },
  { value: "uk", label: "United Kingdom" },
  { value: "ca", label: "Canada" },
  { value: "au", label: "Australia" },
];

export function ComboboxExample() {
  const [items, setItems] = useState(countries);

  const handleInputChange = (details: { value: string }) => {
    const filtered = countries.filter((country) =>
      country.label.toLowerCase().includes(details.value.toLowerCase())
    );
    setItems(filtered);
  };

  return (
    <Combobox.Root
      items={items}
      onInputValueChange={handleInputChange}
    >
      <Combobox.Label>Country</Combobox.Label>
      <Combobox.Control>
        <Combobox.Input placeholder="Search countries..." />
        <Combobox.Trigger>▼</Combobox.Trigger>
      </Combobox.Control>

      <Combobox.Positioner>
        <Combobox.Content>
          {items.map((country) => (
            <Combobox.Item key={country.value} item={country}>
              <Combobox.ItemText>{country.label}</Combobox.ItemText>
              <Combobox.ItemIndicator>✓</Combobox.ItemIndicator>
            </Combobox.Item>
          ))}
        </Combobox.Content>
      </Combobox.Positioner>
    </Combobox.Root>
  );
}
```

### タブ

```typescript
// components/tabs-example.tsx
import { Tabs } from "@ark-ui/react";

export function TabsExample() {
  return (
    <Tabs.Root defaultValue="account">
      <Tabs.List>
        <Tabs.Trigger value="account">Account</Tabs.Trigger>
        <Tabs.Trigger value="security">Security</Tabs.Trigger>
        <Tabs.Trigger value="notifications">Notifications</Tabs.Trigger>
        <Tabs.Indicator />
      </Tabs.List>

      <Tabs.Content value="account">
        <h3>Account Settings</h3>
        <p>Manage your account information here.</p>
      </Tabs.Content>

      <Tabs.Content value="security">
        <h3>Security Settings</h3>
        <p>Update your password and security preferences.</p>
      </Tabs.Content>

      <Tabs.Content value="notifications">
        <h3>Notification Settings</h3>
        <p>Choose how you want to be notified.</p>
      </Tabs.Content>
    </Tabs.Root>
  );
}
```

### トースト（通知）

```typescript
// components/toast-example.tsx
import { Toast, Toaster, createToaster } from "@ark-ui/react";

const toaster = createToaster({
  placement: "top-end",
  duration: 3000,
});

export function ToastExample() {
  const showToast = () => {
    toaster.create({
      title: "Success!",
      description: "Your changes have been saved.",
      type: "success",
    });
  };

  return (
    <>
      <button onClick={showToast}>Show Toast</button>
      <Toaster toaster={toaster}>
        {(toast) => (
          <Toast.Root key={toast.id}>
            <Toast.Title>{toast.title}</Toast.Title>
            <Toast.Description>{toast.description}</Toast.Description>
            <Toast.CloseTrigger>×</Toast.CloseTrigger>
          </Toast.Root>
        )}
      </Toaster>
    </>
  );
}
```

### ポップオーバー

```typescript
// components/popover-example.tsx
import { Popover } from "@ark-ui/react";

export function PopoverExample() {
  return (
    <Popover.Root>
      <Popover.Trigger>Open Settings</Popover.Trigger>

      <Popover.Positioner>
        <Popover.Content>
          <Popover.Arrow>
            <Popover.ArrowTip />
          </Popover.Arrow>

          <Popover.Title>Settings</Popover.Title>
          <Popover.Description>
            Customize your experience
          </Popover.Description>

          <div>
            <label>
              <input type="checkbox" />
              Enable notifications
            </label>
          </div>

          <div>
            <label>
              <input type="checkbox" />
              Dark mode
            </label>
          </div>

          <Popover.CloseTrigger>Close</Popover.CloseTrigger>
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  );
}
```

## フォームコンポーネント

### フィールドとバリデーション

```typescript
// components/form-example.tsx
import { Field } from "@ark-ui/react";

export function FormExample() {
  return (
    <form>
      <Field.Root>
        <Field.Label>Email</Field.Label>
        <Field.Input
          type="email"
          name="email"
          placeholder="you@example.com"
        />
        <Field.HelperText>
          We'll never share your email.
        </Field.HelperText>
        <Field.ErrorText>
          Please enter a valid email address.
        </Field.ErrorText>
      </Field.Root>

      <Field.Root>
        <Field.Label>Password</Field.Label>
        <Field.Input
          type="password"
          name="password"
          placeholder="••••••••"
        />
        <Field.HelperText>
          Must be at least 8 characters.
        </Field.HelperText>
      </Field.Root>
    </form>
  );
}
```

### スライダー

```typescript
// components/slider-example.tsx
import { Slider } from "@ark-ui/react";
import { useState } from "react";

export function SliderExample() {
  const [value, setValue] = useState([50]);

  return (
    <Slider.Root
      min={0}
      max={100}
      value={value}
      onValueChange={(details) => setValue(details.value)}
    >
      <Slider.Label>Volume: {value[0]}%</Slider.Label>
      <Slider.Control>
        <Slider.Track>
          <Slider.Range />
        </Slider.Track>
        <Slider.Thumb index={0}>
          <Slider.HiddenInput />
        </Slider.Thumb>
      </Slider.Control>
    </Slider.Root>
  );
}
```

### レンジスライダー

```typescript
// components/range-slider-example.tsx
import { Slider } from "@ark-ui/react";
import { useState } from "react";

export function RangeSliderExample() {
  const [value, setValue] = useState([25, 75]);

  return (
    <Slider.Root
      min={0}
      max={100}
      value={value}
      onValueChange={(details) => setValue(details.value)}
    >
      <Slider.Label>
        Price Range: ${value[0]} - ${value[1]}
      </Slider.Label>
      <Slider.Control>
        <Slider.Track>
          <Slider.Range />
        </Slider.Track>
        <Slider.Thumb index={0}>
          <Slider.HiddenInput />
        </Slider.Thumb>
        <Slider.Thumb index={1}>
          <Slider.HiddenInput />
        </Slider.Thumb>
      </Slider.Control>
    </Slider.Root>
  );
}
```

### ファイルアップロード

```typescript
// components/file-upload-example.tsx
import { FileUpload } from "@ark-ui/react";

export function FileUploadExample() {
  return (
    <FileUpload.Root maxFiles={3} accept="image/*">
      <FileUpload.Label>Upload Images</FileUpload.Label>
      <FileUpload.Dropzone>
        Drag and drop images here or
        <FileUpload.Trigger>Browse</FileUpload.Trigger>
      </FileUpload.Dropzone>
      <FileUpload.ItemGroup>
        <FileUpload.Context>
          {({ acceptedFiles }) =>
            acceptedFiles.map((file) => (
              <FileUpload.Item key={file.name} file={file}>
                <FileUpload.ItemPreview type="image/*">
                  <FileUpload.ItemPreviewImage />
                </FileUpload.ItemPreview>
                <FileUpload.ItemName>{file.name}</FileUpload.ItemName>
                <FileUpload.ItemSizeText />
                <FileUpload.ItemDeleteTrigger>×</FileUpload.ItemDeleteTrigger>
              </FileUpload.Item>
            ))
          }
        </FileUpload.Context>
      </FileUpload.ItemGroup>
      <FileUpload.HiddenInput />
    </FileUpload.Root>
  );
}
```

## カスタマイズ

### テーマのカスタマイズ

Park UIのテーマは `panda.config.ts` で設定できます。

```typescript
// panda.config.ts
import { defineConfig } from "@pandacss/dev";
import { createPreset } from "@park-ui/panda-preset";

export default defineConfig({
  presets: [
    createPreset({
      accentColor: "purple", // blue, green, red, etc.
      grayColor: "neutral", // slate, gray, zinc, etc.
      borderRadius: "lg", // sm, md, lg, xl
    }),
  ],
  theme: {
    extend: {
      tokens: {
        colors: {
          brand: {
            50: { value: "#f5f3ff" },
            100: { value: "#ede9fe" },
            // ... 他の色
            900: { value: "#4c1d95" },
          },
        },
      },
    },
  },
});
```

### コンポーネントのスタイルカスタマイズ

```typescript
// components/ui/custom-button.tsx
import { ark } from "@ark-ui/react";
import { styled } from "@/styled-system/jsx";
import { button } from "@/styled-system/recipes";

export const CustomButton = styled(ark.button, button, {
  // カスタムスタイル
  base: {
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: "wide",
  },
});
```

### 独自のレシピ作成

```typescript
// panda.config.ts
export default defineConfig({
  theme: {
    extend: {
      recipes: {
        badge: {
          className: "badge",
          base: {
            display: "inline-flex",
            alignItems: "center",
            borderRadius: "full",
            px: 2,
            py: 1,
            fontSize: "xs",
            fontWeight: "semibold",
          },
          variants: {
            variant: {
              solid: {
                bg: "brand.500",
                color: "white",
              },
              outline: {
                border: "1px solid",
                borderColor: "brand.500",
                color: "brand.500",
              },
              subtle: {
                bg: "brand.100",
                color: "brand.700",
              },
            },
          },
          defaultVariants: {
            variant: "solid",
          },
        },
      },
    },
  },
});
```

使用例：

```typescript
import { styled } from "@/styled-system/jsx";
import { badge } from "@/styled-system/recipes";

const Badge = styled("span", badge);

export function BadgeExample() {
  return (
    <>
      <Badge>Default</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="subtle">Subtle</Badge>
    </>
  );
}
```

## 実践例

### データテーブル

```typescript
// components/data-table.tsx
import { Table } from "@ark-ui/react";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

const users: User[] = [
  { id: 1, name: "John Doe", email: "john@example.com", role: "Admin" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", role: "User" },
  { id: 3, name: "Bob Johnson", email: "bob@example.com", role: "User" },
];

export function DataTable() {
  return (
    <Table.Root>
      <Table.Head>
        <Table.Row>
          <Table.Header>Name</Table.Header>
          <Table.Header>Email</Table.Header>
          <Table.Header>Role</Table.Header>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {users.map((user) => (
          <Table.Row key={user.id}>
            <Table.Cell>{user.name}</Table.Cell>
            <Table.Cell>{user.email}</Table.Cell>
            <Table.Cell>{user.role}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
```

### ページネーション付きテーブル

```typescript
// components/paginated-table.tsx
import { Pagination } from "@ark-ui/react";
import { useState } from "react";

export function PaginatedTable() {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalItems = 100;

  return (
    <>
      <Table.Root>{/* テーブル内容 */}</Table.Root>

      <Pagination.Root
        count={totalItems}
        pageSize={pageSize}
        page={page}
        onPageChange={(details) => setPage(details.page)}
      >
        <Pagination.PrevTrigger>Previous</Pagination.PrevTrigger>
        <Pagination.Context>
          {({ pages }) =>
            pages.map((page, index) =>
              page.type === "page" ? (
                <Pagination.Item key={index} {...page}>
                  {page.value}
                </Pagination.Item>
              ) : (
                <Pagination.Ellipsis key={index} index={index}>
                  ...
                </Pagination.Ellipsis>
              )
            )
          }
        </Pagination.Context>
        <Pagination.NextTrigger>Next</Pagination.NextTrigger>
      </Pagination.Root>
    </>
  );
}
```

## ベストプラクティス

### 1. コンポーネントの再利用

```typescript
// components/ui/data-display.tsx
import { Card } from "@/components/ui/card";

interface DataDisplayProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: "up" | "down";
}

export function DataDisplay({
  title,
  value,
  description,
  trend,
}: DataDisplayProps) {
  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>{title}</Card.Title>
      </Card.Header>
      <Card.Body>
        <div className="text-3xl font-bold">{value}</div>
        {description && (
          <div className="text-sm text-gray-600">{description}</div>
        )}
        {trend && (
          <div className={trend === "up" ? "text-green-600" : "text-red-600"}>
            {trend === "up" ? "↑" : "↓"}
          </div>
        )}
      </Card.Body>
    </Card.Root>
  );
}
```

### 2. アクセシビリティの確保

Ark UIはデフォルトでアクセシブルですが、さらに改善できます。

```typescript
<Dialog.Root>
  <Dialog.Trigger aria-label="Open settings dialog">
    Settings
  </Dialog.Trigger>
  <Dialog.Content aria-describedby="dialog-description">
    <Dialog.Title>Settings</Dialog.Title>
    <div id="dialog-description">
      Customize your application preferences
    </div>
    {/* コンテンツ */}
  </Dialog.Content>
</Dialog.Root>
```

### 3. パフォーマンス最適化

```typescript
import { lazy, Suspense } from "react";

// 重いコンポーネントは遅延読み込み
const HeavyComponent = lazy(() => import("./HeavyComponent"));

export function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}
```

## まとめ

Ark UIとPark UIは、モダンなWebアプリケーションのUI構築に最適なツールです。主な利点は以下の通りです。

- **柔軟性**: ヘッドレス設計で完全なスタイル制御
- **アクセシビリティ**: ARIA準拠で標準対応
- **型安全性**: TypeScriptファーストで開発効率向上
- **美しいデザイン**: Park UIで即座に使えるコンポーネント

デザインの自由度を保ちつつ、堅牢なロジックとアクセシビリティを得られます。新しいプロジェクトでぜひ試してみてください。

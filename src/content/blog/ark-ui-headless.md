---
title: "Ark UI完全ガイド — ヘッドレスUIコンポーネントで自由なデザインと型安全を両立"
description: "スタイルを持たないヘッドレスUIコンポーネントライブラリArk UIの完全ガイド。React、Vue、Solidで使える高品質なアクセシブルコンポーネント、Panda CSSとの統合、実践例まで徹底解説します。実務で役立つポイントを厳選して解説。"
pubDate: "2025-02-06"
tags: ["Ark UI", "Headless UI", "React", "Vue", "Solid"]
heroImage: '../../assets/thumbnails/ark-ui-headless.jpg'
---
Ark UIは、Chakra UIチームが開発した、スタイルを持たないヘッドレスUIコンポーネントライブラリです。React、Vue、Solidで同じAPIが使え、完全なアクセシビリティとキーボード操作をサポートし、Panda CSSやTailwindと組み合わせて自由にスタイリングできます。この記事では、Ark UIの基本から実践的な使い方まで徹底的に解説します。

## Ark UIとは

Ark UIは、ビジュアルスタイルを持たず、機能とアクセシビリティのみを提供するヘッドレスUIライブラリです。Zag.jsというステートマシンライブラリをベースに構築されており、複雑なコンポーネントロジックを抽象化します。

### 主な特徴

- **ヘッドレスアーキテクチャ** - スタイルなし、完全に自由なデザイン
- **マルチフレームワーク対応** - React、Vue、Solidで同じAPI
- **完全アクセシブル** - WAI-ARIA準拠、スクリーンリーダー対応
- **キーボード操作** - 全コンポーネントがキーボードで操作可能
- **型安全** - TypeScriptで完全な型定義
- **ゼロランタイム可能** - Panda CSSと組み合わせでゼロランタイムCSS
- **状態管理内蔵** - 複雑な状態ロジックが組み込み済み
- **コンポジション重視** - 小さなパーツを組み合わせて構築

### なぜArk UIなのか

```tsx
// 従来のUIライブラリ（Material-UI、Chakra UI等）
// ❌ デザインが固定される
// ❌ カスタマイズが困難
// ❌ スタイルのオーバーライドが複雑
<Button variant="contained" color="primary">
  Click me
</Button>

// Ark UI + 自由なスタイリング
// ✅ 完全に自由なデザイン
// ✅ アクセシビリティは保証
// ✅ 複雑なロジックは任せられる
<Button.Root className={styles.button}>
  <Button.Label>Click me</Button.Label>
</Button.Root>
```

## インストール

### React

```bash
npm install @ark-ui/react
```

### Vue

```bash
npm install @ark-ui/vue
```

### Solid

```bash
npm install @ark-ui/solid
```

## 基本的な使い方（React）

### Buttonコンポーネント

```tsx
import { Button } from '@ark-ui/react';

export const MyButton = () => {
  return (
    <Button.Root className="my-button">
      <Button.Label>Click me</Button.Label>
    </Button.Root>
  );
};
```

CSS:

```css
.my-button {
  padding: 0.5rem 1rem;
  background: #0070f3;
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
}

.my-button:hover {
  background: #0051cc;
}

.my-button:active {
  transform: scale(0.98);
}
```

### Dialogコンポーネント

```tsx
import { Dialog, Portal } from '@ark-ui/react';

export const MyDialog = () => {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="trigger">Open Dialog</Dialog.Trigger>

      <Portal>
        <Dialog.Backdrop className="backdrop" />
        <Dialog.Positioner className="positioner">
          <Dialog.Content className="content">
            <Dialog.Title className="title">Dialog Title</Dialog.Title>
            <Dialog.Description className="description">
              This is a dialog description.
            </Dialog.Description>
            <Dialog.CloseTrigger className="close">×</Dialog.CloseTrigger>

            <div className="actions">
              <button>Cancel</button>
              <button>Confirm</button>
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
```

CSS:

```css
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  animation: fadeIn 0.2s;
}

.positioner {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.content {
  background: white;
  padding: 2rem;
  border-radius: 0.5rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  max-width: 500px;
  width: 90%;
  animation: slideUp 0.2s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

## 主要コンポーネント

### Accordion

```tsx
import { Accordion } from '@ark-ui/react';

export const MyAccordion = () => {
  return (
    <Accordion.Root defaultValue={['item-1']} multiple>
      <Accordion.Item value="item-1">
        <Accordion.ItemTrigger>
          <h3>Section 1</h3>
          <Accordion.ItemIndicator>▼</Accordion.ItemIndicator>
        </Accordion.ItemTrigger>
        <Accordion.ItemContent>
          <p>Content for section 1</p>
        </Accordion.ItemContent>
      </Accordion.Item>

      <Accordion.Item value="item-2">
        <Accordion.ItemTrigger>
          <h3>Section 2</h3>
          <Accordion.ItemIndicator>▼</Accordion.ItemIndicator>
        </Accordion.ItemTrigger>
        <Accordion.ItemContent>
          <p>Content for section 2</p>
        </Accordion.ItemContent>
      </Accordion.Item>
    </Accordion.Root>
  );
};
```

### Select

```tsx
import { Select, Portal } from '@ark-ui/react';

const items = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Orange', value: 'orange' },
];

export const MySelect = () => {
  return (
    <Select.Root items={items}>
      <Select.Label>Fruits</Select.Label>
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder="Select a fruit" />
          <Select.Indicator>▼</Select.Indicator>
        </Select.Trigger>
      </Select.Control>

      <Portal>
        <Select.Positioner>
          <Select.Content>
            {items.map((item) => (
              <Select.Item key={item.value} item={item}>
                <Select.ItemText>{item.label}</Select.ItemText>
                <Select.ItemIndicator>✓</Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  );
};
```

### Tabs

```tsx
import { Tabs } from '@ark-ui/react';

export const MyTabs = () => {
  return (
    <Tabs.Root defaultValue="tab-1">
      <Tabs.List>
        <Tabs.Trigger value="tab-1">Tab 1</Tabs.Trigger>
        <Tabs.Trigger value="tab-2">Tab 2</Tabs.Trigger>
        <Tabs.Trigger value="tab-3">Tab 3</Tabs.Trigger>
        <Tabs.Indicator />
      </Tabs.List>

      <Tabs.Content value="tab-1">
        <p>Content for Tab 1</p>
      </Tabs.Content>

      <Tabs.Content value="tab-2">
        <p>Content for Tab 2</p>
      </Tabs.Content>

      <Tabs.Content value="tab-3">
        <p>Content for Tab 3</p>
      </Tabs.Content>
    </Tabs.Root>
  );
};
```

### Menu (Dropdown)

```tsx
import { Menu, Portal } from '@ark-ui/react';

export const MyMenu = () => {
  return (
    <Menu.Root>
      <Menu.Trigger>Open Menu</Menu.Trigger>

      <Portal>
        <Menu.Positioner>
          <Menu.Content>
            <Menu.Item value="edit">
              <Menu.ItemText>Edit</Menu.ItemText>
              <Menu.ItemIndicator>⌘E</Menu.ItemIndicator>
            </Menu.Item>

            <Menu.Item value="duplicate">
              <Menu.ItemText>Duplicate</Menu.ItemText>
              <Menu.ItemIndicator>⌘D</Menu.ItemIndicator>
            </Menu.Item>

            <Menu.Separator />

            <Menu.Item value="delete">
              <Menu.ItemText>Delete</Menu.ItemText>
              <Menu.ItemIndicator>⌫</Menu.ItemIndicator>
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
};
```

### Popover

```tsx
import { Popover, Portal } from '@ark-ui/react';

export const MyPopover = () => {
  return (
    <Popover.Root>
      <Popover.Trigger>Open Popover</Popover.Trigger>

      <Portal>
        <Popover.Positioner>
          <Popover.Content>
            <Popover.Arrow>
              <Popover.ArrowTip />
            </Popover.Arrow>

            <Popover.Title>Popover Title</Popover.Title>
            <Popover.Description>This is a popover description.</Popover.Description>

            <Popover.CloseTrigger>Close</Popover.CloseTrigger>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
};
```

### Tooltip

```tsx
import { Tooltip, Portal } from '@ark-ui/react';

export const MyTooltip = () => {
  return (
    <Tooltip.Root openDelay={300} closeDelay={200}>
      <Tooltip.Trigger>Hover me</Tooltip.Trigger>

      <Portal>
        <Tooltip.Positioner>
          <Tooltip.Arrow>
            <Tooltip.ArrowTip />
          </Tooltip.Arrow>
          <Tooltip.Content>This is a tooltip</Tooltip.Content>
        </Tooltip.Positioner>
      </Portal>
    </Tooltip.Root>
  );
};
```

## フォームコンポーネント

### Checkbox

```tsx
import { Checkbox } from '@ark-ui/react';

export const MyCheckbox = () => {
  return (
    <Checkbox.Root>
      <Checkbox.Label>Accept terms</Checkbox.Label>
      <Checkbox.Control>
        <Checkbox.Indicator>✓</Checkbox.Indicator>
      </Checkbox.Control>
      <Checkbox.HiddenInput />
    </Checkbox.Root>
  );
};
```

### Radio Group

```tsx
import { RadioGroup } from '@ark-ui/react';

const options = [
  { label: 'Option 1', value: '1' },
  { label: 'Option 2', value: '2' },
  { label: 'Option 3', value: '3' },
];

export const MyRadioGroup = () => {
  return (
    <RadioGroup.Root>
      <RadioGroup.Label>Choose an option</RadioGroup.Label>

      {options.map((option) => (
        <RadioGroup.Item key={option.value} value={option.value}>
          <RadioGroup.ItemText>{option.label}</RadioGroup.ItemText>
          <RadioGroup.ItemControl>
            <RadioGroup.ItemIndicator />
          </RadioGroup.ItemControl>
          <RadioGroup.ItemHiddenInput />
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
};
```

### Slider

```tsx
import { Slider } from '@ark-ui/react';

export const MySlider = () => {
  return (
    <Slider.Root min={0} max={100} defaultValue={[50]}>
      <Slider.Label>Volume</Slider.Label>
      <Slider.Control>
        <Slider.Track>
          <Slider.Range />
        </Slider.Track>
        <Slider.Thumb index={0}>
          <Slider.HiddenInput />
        </Slider.Thumb>
      </Slider.Control>
      <Slider.ValueText />
    </Slider.Root>
  );
};
```

### Switch

```tsx
import { Switch } from '@ark-ui/react';

export const MySwitch = () => {
  return (
    <Switch.Root>
      <Switch.Label>Enable notifications</Switch.Label>
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
      <Switch.HiddenInput />
    </Switch.Root>
  );
};
```

## Panda CSSとの統合

Ark UIはPanda CSSと完璧に統合できます。

### インストール

```bash
npm install @ark-ui/react @pandacss/dev
npx panda init
```

### Park UIプリセット

Park UIは、Ark UI + Panda CSSのプリセットコンポーネントコレクションです。

```bash
npm install @park-ui/react
```

使用例:

```tsx
import { Button } from '@park-ui/react';

export const MyButton = () => {
  return (
    <Button variant="solid" size="lg">
      Click me
    </Button>
  );
};
```

### カスタムスタイリング

```tsx
import { Dialog, Portal } from '@ark-ui/react';
import { css } from '../styled-system/css';
import { dialog } from '../styled-system/recipes';

export const StyledDialog = () => {
  const styles = dialog();

  return (
    <Dialog.Root>
      <Dialog.Trigger className={styles.trigger}>Open</Dialog.Trigger>

      <Portal>
        <Dialog.Backdrop className={styles.backdrop} />
        <Dialog.Positioner className={styles.positioner}>
          <Dialog.Content className={styles.content}>
            <Dialog.Title className={styles.title}>Title</Dialog.Title>
            <Dialog.Description className={styles.description}>
              Description
            </Dialog.Description>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
```

Panda CSS設定:

```typescript
// panda.config.ts
import { defineConfig } from '@pandacss/dev';

export default defineConfig({
  theme: {
    extend: {
      recipes: {
        dialog: {
          className: 'dialog',
          base: {
            backdrop: {
              position: 'fixed',
              inset: 0,
              bg: 'blackAlpha.600',
            },
            positioner: {
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            },
            content: {
              bg: 'white',
              p: '6',
              borderRadius: 'lg',
              boxShadow: 'xl',
              maxW: '500px',
            },
            title: {
              fontSize: 'xl',
              fontWeight: 'bold',
              mb: '2',
            },
            description: {
              color: 'gray.600',
            },
          },
        },
      },
    },
  },
});
```

## Vueでの使用

```vue
<script setup lang="ts">
import { Dialog, Portal } from '@ark-ui/vue';
</script>

<template>
  <Dialog.Root>
    <Dialog.Trigger>Open Dialog</Dialog.Trigger>

    <Portal>
      <Dialog.Backdrop class="backdrop" />
      <Dialog.Positioner class="positioner">
        <Dialog.Content class="content">
          <Dialog.Title>Dialog Title</Dialog.Title>
          <Dialog.Description>This is a dialog.</Dialog.Description>
          <Dialog.CloseTrigger>Close</Dialog.CloseTrigger>
        </Dialog.Content>
      </Dialog.Positioner>
    </Portal>
  </Dialog.Root>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}

.positioner {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.content {
  background: white;
  padding: 2rem;
  border-radius: 0.5rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}
</style>
```

## Solidでの使用

```tsx
import { Dialog, Portal } from '@ark-ui/solid';

export const MyDialog = () => {
  return (
    <Dialog.Root>
      <Dialog.Trigger>Open Dialog</Dialog.Trigger>

      <Portal>
        <Dialog.Backdrop class="backdrop" />
        <Dialog.Positioner class="positioner">
          <Dialog.Content class="content">
            <Dialog.Title>Dialog Title</Dialog.Title>
            <Dialog.Description>This is a dialog.</Dialog.Description>
            <Dialog.CloseTrigger>Close</Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
```

## 制御されたコンポーネント

### 状態を外部管理

```tsx
import { Dialog, Portal } from '@ark-ui/react';
import { useState } from 'react';

export const ControlledDialog = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>

      <Dialog.Root open={open} onOpenChange={(details) => setOpen(details.open)}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Title>Controlled Dialog</Dialog.Title>
              <Dialog.Description>State is managed externally.</Dialog.Description>
              <button onClick={() => setOpen(false)}>Close</button>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  );
};
```

### フォームとの統合

```tsx
import { Select, Portal } from '@ark-ui/react';
import { useForm } from 'react-hook-form';

const fruits = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
];

export const FormWithSelect = () => {
  const { register, handleSubmit, setValue } = useForm();

  const onSubmit = (data) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Select.Root
        items={fruits}
        onValueChange={(details) => setValue('fruit', details.value[0])}
      >
        <Select.Label>Choose a fruit</Select.Label>
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Select" />
          </Select.Trigger>
        </Select.Control>

        <Portal>
          <Select.Positioner>
            <Select.Content>
              {fruits.map((item) => (
                <Select.Item key={item.value} item={item}>
                  <Select.ItemText>{item.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
        </Portal>

        <input type="hidden" {...register('fruit')} />
      </Select.Root>

      <button type="submit">Submit</button>
    </form>
  );
};
```

## アニメーション

### Framer Motionとの統合

```tsx
import { Dialog, Portal } from '@ark-ui/react';
import { motion, AnimatePresence } from 'framer-motion';

export const AnimatedDialog = () => {
  return (
    <Dialog.Root>
      <Dialog.Trigger>Open</Dialog.Trigger>

      <AnimatePresence>
        <Portal>
          <Dialog.Backdrop asChild>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          </Dialog.Backdrop>

          <Dialog.Positioner>
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Dialog.Title>Animated Dialog</Dialog.Title>
                <Dialog.Description>With smooth animations</Dialog.Description>
              </motion.div>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </AnimatePresence>
    </Dialog.Root>
  );
};
```

## アクセシビリティ

Ark UIは全コンポーネントがWAI-ARIA準拠で、アクセシビリティが組み込まれています。

### キーボード操作

- **Dialog**: Escape で閉じる、Tab でフォーカス移動
- **Menu**: 矢印キーで項目移動、Enter で選択
- **Select**: 矢印キーでオプション選択、Space で開閉
- **Tabs**: 矢印キーでタブ移動
- **Accordion**: 矢印キーで項目移動、Space/Enter で開閉

### スクリーンリーダー対応

全コンポーネントが適切なARIA属性を持ち、スクリーンリーダーで正しく読み上げられます。

### フォーカス管理

Dialog、Popover、Menuなどは自動的にフォーカストラップを実装し、適切なフォーカス管理を行います。

## 実践例: データテーブル

```tsx
import { Table, Pagination } from '@ark-ui/react';
import { useState } from 'react';

const data = [
  { id: 1, name: 'Alice', email: 'alice@example.com', role: 'Admin' },
  { id: 2, name: 'Bob', email: 'bob@example.com', role: 'User' },
  { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'User' },
];

export const DataTable = () => {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  return (
    <div>
      <Table.Root>
        <Table.Head>
          <Table.Row>
            <Table.Header>Name</Table.Header>
            <Table.Header>Email</Table.Header>
            <Table.Header>Role</Table.Header>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {data.map((item) => (
            <Table.Row key={item.id}>
              <Table.Cell>{item.name}</Table.Cell>
              <Table.Cell>{item.email}</Table.Cell>
              <Table.Cell>{item.role}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      <Pagination.Root
        count={100}
        pageSize={pageSize}
        page={page}
        onPageChange={(details) => setPage(details.page)}
      >
        <Pagination.PrevTrigger>Previous</Pagination.PrevTrigger>
        <Pagination.Context>
          {(api) =>
            api.pages.map((page, index) => {
              if (page.type === 'page')
                return (
                  <Pagination.Item key={index} {...page}>
                    {page.value}
                  </Pagination.Item>
                );
              return <Pagination.Ellipsis key={index}>...</Pagination.Ellipsis>;
            })
          }
        </Pagination.Context>
        <Pagination.NextTrigger>Next</Pagination.NextTrigger>
      </Pagination.Root>
    </div>
  );
};
```

## まとめ

Ark UIは、ヘッドレスUIライブラリの決定版です。

**主な利点:**
- 完全に自由なデザイン
- React、Vue、Solidで同じAPI
- 完全なアクセシビリティとキーボード操作
- 複雑なロジックが組み込み済み
- Panda CSSと完璧に統合

**こんなプロジェクトに最適:**
- 独自のデザインシステムを構築したい
- アクセシビリティが重要
- 複数フレームワークで一貫したコンポーネント
- ゼロランタイムCSSを実現したい

Ark UIは、デザインの自由度とアクセシビリティを両立させ、複雑なコンポーネントロジックを抽象化することで、高品質なUIを効率的に構築できる理想的なライブラリです。

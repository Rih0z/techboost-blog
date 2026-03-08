---
title: 'React Aria Components実践: Adobe製アクセシブルUIライブラリ'
description: 'React Aria Componentsを使ったアクセシブルなUI構築ガイド。基本コンポーネントからカスタムフック、スタイリング戦略、実践的なパターンまで徹底解説します。React・Accessibility・UI Componentsに関する実践情報。'
pubDate: '2025-11-18'
updatedDate: '2025-11-18'
tags: ['React', 'Accessibility', 'UI Components', 'TypeScript', 'Adobe']
heroImage: '../../assets/thumbnails/react-aria-components-guide.jpg'
---
React Aria Componentsは、Adobeが開発するアクセシビリティファーストのReact UIライブラリです。WCAG準拠、キーボードナビゲーション、スクリーンリーダー対応を標準実装し、完全にカスタマイズ可能なスタイルを提供します。

## React Aria Componentsとは

### 他のUIライブラリとの違い

```typescript
// Material-UI（スタイル込み、カスタマイズ困難）
import Button from '@mui/material/Button';

<Button variant="contained" color="primary">
  クリック
</Button>

// Headless UI（低レベルAPI、アクセシビリティは自己責任）
import { Menu } from '@headlessui/react';

<Menu>
  <Menu.Button>Options</Menu.Button>
  <Menu.Items>
    <Menu.Item>{({ active }) => <a>Item</a>}</Menu.Item>
  </Menu.Items>
</Menu>

// React Aria Components（アクセシビリティ完備、完全カスタマイズ可能）
import { Button } from 'react-aria-components';

<Button className="custom-btn">
  クリック
</Button>
```

### 主な特徴

1. **アクセシビリティ標準** - WCAG 2.1 AAA準拠
2. **キーボードサポート** - 全コンポーネントでキーボード操作可能
3. **スタイル非依存** - 完全にカスタマイズ可能
4. **TypeScript完全対応** - 型安全な開発
5. **国際化対応** - 40以上の言語サポート
6. **モバイル最適化** - タッチ操作対応

## セットアップ

```bash
# React Aria Componentsのインストール
npm install react-aria-components

# 追加の推奨パッケージ
npm install @internationalized/date @react-aria/i18n
```

```typescript
// app/layout.tsx（Next.js App Router）
import { RouterProvider } from 'react-aria-components';
import { useRouter } from 'next/navigation';

export default function RootLayout({ children }) {
  const router = useRouter();

  return (
    <html lang="ja">
      <body>
        <RouterProvider navigate={router.push}>
          {children}
        </RouterProvider>
      </body>
    </html>
  );
}
```

## 基本コンポーネント

### ボタン

```typescript
// components/Button.tsx
import { Button as AriaButton, ButtonProps } from 'react-aria-components';
import './Button.css';

export function Button(props: ButtonProps) {
  return (
    <AriaButton
      {...props}
      className={({ isPressed, isHovered, isDisabled }) => `
        btn
        ${isPressed ? 'btn-pressed' : ''}
        ${isHovered ? 'btn-hovered' : ''}
        ${isDisabled ? 'btn-disabled' : ''}
      `}
    />
  );
}
```

```css
/* Button.css */
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  background: #3b82f6;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  outline: none;
}

.btn:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.btn-hovered {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-pressed {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
}

.btn-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}
```

### テキストフィールド

```typescript
// components/TextField.tsx
import {
  TextField as AriaTextField,
  Label,
  Input,
  Text,
  FieldError,
  TextFieldProps,
} from 'react-aria-components';

interface CustomTextFieldProps extends TextFieldProps {
  label: string;
  description?: string;
  errorMessage?: string;
}

export function TextField({
  label,
  description,
  errorMessage,
  ...props
}: CustomTextFieldProps) {
  return (
    <AriaTextField {...props} className="text-field">
      <Label className="text-field-label">{label}</Label>
      {description && (
        <Text slot="description" className="text-field-description">
          {description}
        </Text>
      )}
      <Input className="text-field-input" />
      <FieldError className="text-field-error">{errorMessage}</FieldError>
    </AriaTextField>
  );
}
```

```typescript
// 使用例
import { Form } from 'react-aria-components';

<Form>
  <TextField
    name="email"
    type="email"
    label="メールアドレス"
    description="通知を受け取るメールアドレスを入力してください"
    isRequired
    validate={(value) => {
      if (!value.includes('@')) {
        return '有効なメールアドレスを入力してください';
      }
    }}
  />
  <TextField
    name="password"
    type="password"
    label="パスワード"
    isRequired
    minLength={8}
  />
  <Button type="submit">ログイン</Button>
</Form>
```

### セレクトボックス

```typescript
// components/Select.tsx
import {
  Select as AriaSelect,
  Label,
  Button,
  SelectValue,
  Popover,
  ListBox,
  ListBoxItem,
  SelectProps,
} from 'react-aria-components';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps extends Omit<SelectProps<Option>, 'children'> {
  label: string;
  options: Option[];
}

export function Select({ label, options, ...props }: CustomSelectProps) {
  return (
    <AriaSelect {...props} className="select">
      <Label className="select-label">{label}</Label>
      <Button className="select-button">
        <SelectValue className="select-value" />
        <span aria-hidden="true">▼</span>
      </Button>
      <Popover className="select-popover">
        <ListBox className="select-listbox">
          {options.map((option) => (
            <ListBoxItem
              key={option.value}
              id={option.value}
              className={({ isSelected, isFocused }) => `
                select-item
                ${isSelected ? 'select-item-selected' : ''}
                ${isFocused ? 'select-item-focused' : ''}
              `}
            >
              {option.label}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </AriaSelect>
  );
}
```

```typescript
// 使用例
const languages = [
  { value: 'ja', label: '日本語' },
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
];

<Select
  label="言語を選択"
  options={languages}
  defaultSelectedKey="ja"
  onSelectionChange={(key) => console.log('選択:', key)}
/>
```

### モーダルダイアログ

```typescript
// components/Dialog.tsx
import {
  Dialog as AriaDialog,
  DialogTrigger,
  Button,
  Modal,
  ModalOverlay,
  Heading,
  DialogProps,
} from 'react-aria-components';

interface CustomDialogProps extends DialogProps {
  trigger: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

export function Dialog({ trigger, title, children, ...props }: CustomDialogProps) {
  return (
    <DialogTrigger>
      <Button>{trigger}</Button>
      <ModalOverlay className="modal-overlay">
        <Modal className="modal">
          <AriaDialog {...props} className="dialog">
            {({ close }) => (
              <>
                <div className="dialog-header">
                  <Heading slot="title" className="dialog-title">
                    {title}
                  </Heading>
                  <Button onPress={close} className="dialog-close">
                    ×
                  </Button>
                </div>
                <div className="dialog-content">{children}</div>
              </>
            )}
          </AriaDialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}
```

```css
/* Dialog.css */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.dialog {
  padding: 2rem;
  outline: none;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.dialog-title {
  margin: 0;
  font-size: 1.5rem;
}

.dialog-close {
  background: transparent;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.dialog-close:hover {
  background: #f5f5f5;
}
```

### メニュー

```typescript
// components/Menu.tsx
import {
  MenuTrigger,
  Button,
  Popover,
  Menu as AriaMenu,
  MenuItem,
  Separator,
  MenuProps,
} from 'react-aria-components';

interface MenuItemData {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  separator?: boolean;
}

interface CustomMenuProps extends Omit<MenuProps<MenuItemData>, 'children'> {
  trigger: React.ReactNode;
  items: MenuItemData[];
}

export function Menu({ trigger, items, ...props }: CustomMenuProps) {
  return (
    <MenuTrigger>
      <Button>{trigger}</Button>
      <Popover className="menu-popover">
        <AriaMenu {...props} className="menu">
          {items.map((item) =>
            item.separator ? (
              <Separator key={item.id} className="menu-separator" />
            ) : (
              <MenuItem
                key={item.id}
                id={item.id}
                className={({ isFocused, isSelected }) => `
                  menu-item
                  ${isFocused ? 'menu-item-focused' : ''}
                  ${isSelected ? 'menu-item-selected' : ''}
                `}
              >
                {item.icon && <span className="menu-icon">{item.icon}</span>}
                <span className="menu-label">{item.label}</span>
                {item.shortcut && (
                  <span className="menu-shortcut">{item.shortcut}</span>
                )}
              </MenuItem>
            )
          )}
        </AriaMenu>
      </Popover>
    </MenuTrigger>
  );
}
```

```typescript
// 使用例
const menuItems = [
  { id: 'new', label: '新規作成', icon: '📄', shortcut: '⌘N' },
  { id: 'open', label: '開く', icon: '📂', shortcut: '⌘O' },
  { id: 'save', label: '保存', icon: '💾', shortcut: '⌘S' },
  { id: 'sep1', label: '', separator: true },
  { id: 'settings', label: '設定', icon: '⚙️' },
  { id: 'logout', label: 'ログアウト', icon: '🚪' },
];

<Menu
  trigger="メニュー"
  items={menuItems}
  onAction={(key) => console.log('選択:', key)}
/>
```

## 高度な機能

### 日付ピッカー

```typescript
// components/DatePicker.tsx
import {
  DatePicker as AriaDatePicker,
  Label,
  Button,
  DateInput,
  DateSegment,
  Dialog,
  Calendar,
  CalendarGrid,
  CalendarCell,
  Heading,
  Popover,
  DatePickerProps,
  DateValue,
} from 'react-aria-components';
import { CalendarDate } from '@internationalized/date';

export function DatePicker(props: DatePickerProps<DateValue>) {
  return (
    <AriaDatePicker {...props} className="date-picker">
      <Label className="date-picker-label">日付を選択</Label>
      <div className="date-picker-group">
        <DateInput className="date-picker-input">
          {(segment) => <DateSegment segment={segment} />}
        </DateInput>
        <Button className="date-picker-button">📅</Button>
      </div>
      <Popover className="date-picker-popover">
        <Dialog className="date-picker-dialog">
          <Calendar>
            <header className="calendar-header">
              <Button slot="previous">◀</Button>
              <Heading />
              <Button slot="next">▶</Button>
            </header>
            <CalendarGrid>
              {(date) => (
                <CalendarCell
                  date={date}
                  className={({ isSelected, isDisabled }) => `
                    calendar-cell
                    ${isSelected ? 'calendar-cell-selected' : ''}
                    ${isDisabled ? 'calendar-cell-disabled' : ''}
                  `}
                />
              )}
            </CalendarGrid>
          </Calendar>
        </Dialog>
      </Popover>
    </AriaDatePicker>
  );
}
```

```typescript
// 使用例
import { today, getLocalTimeZone } from '@internationalized/date';

<DatePicker
  defaultValue={today(getLocalTimeZone())}
  minValue={today(getLocalTimeZone())}
  onChange={(value) => console.log('選択日:', value)}
/>
```

### コンボボックス（オートコンプリート）

```typescript
// components/ComboBox.tsx
import {
  ComboBox as AriaComboBox,
  Label,
  Input,
  Button,
  Popover,
  ListBox,
  ListBoxItem,
  ComboBoxProps,
} from 'react-aria-components';

interface ComboBoxOption {
  id: string;
  name: string;
}

interface CustomComboBoxProps extends Omit<ComboBoxProps<ComboBoxOption>, 'children'> {
  label: string;
  options: ComboBoxOption[];
}

export function ComboBox({ label, options, ...props }: CustomComboBoxProps) {
  return (
    <AriaComboBox {...props} className="combobox">
      <Label className="combobox-label">{label}</Label>
      <div className="combobox-group">
        <Input className="combobox-input" />
        <Button className="combobox-button">▼</Button>
      </div>
      <Popover className="combobox-popover">
        <ListBox className="combobox-listbox">
          {options.map((option) => (
            <ListBoxItem
              key={option.id}
              id={option.id}
              textValue={option.name}
              className={({ isFocused, isSelected }) => `
                combobox-item
                ${isFocused ? 'combobox-item-focused' : ''}
                ${isSelected ? 'combobox-item-selected' : ''}
              `}
            >
              {option.name}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </AriaComboBox>
  );
}
```

### テーブル

```typescript
// components/Table.tsx
import {
  Table as AriaTable,
  TableHeader,
  Column,
  TableBody,
  Row,
  Cell,
  TableProps,
} from 'react-aria-components';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface CustomTableProps extends Omit<TableProps, 'children'> {
  users: User[];
}

export function Table({ users, ...props }: CustomTableProps) {
  return (
    <AriaTable {...props} className="table" selectionMode="multiple">
      <TableHeader>
        <Column isRowHeader className="table-column">
          名前
        </Column>
        <Column className="table-column">メール</Column>
        <Column className="table-column">役割</Column>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <Row
            key={user.id}
            id={user.id}
            className={({ isSelected, isFocused }) => `
              table-row
              ${isSelected ? 'table-row-selected' : ''}
              ${isFocused ? 'table-row-focused' : ''}
            `}
          >
            <Cell className="table-cell">{user.name}</Cell>
            <Cell className="table-cell">{user.email}</Cell>
            <Cell className="table-cell">{user.role}</Cell>
          </Row>
        ))}
      </TableBody>
    </AriaTable>
  );
}
```

## Tailwind CSS統合

```typescript
// components/Button.tsx（Tailwind版）
import { Button as AriaButton, ButtonProps } from 'react-aria-components';
import { tv } from 'tailwind-variants';

const button = tv({
  base: 'px-4 py-2 rounded-lg font-medium transition-all outline-none',
  variants: {
    variant: {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus-visible:ring-2 focus-visible:ring-gray-400',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500',
    },
    size: {
      sm: 'text-sm px-3 py-1.5',
      md: 'text-base px-4 py-2',
      lg: 'text-lg px-6 py-3',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

interface CustomButtonProps extends ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ variant, size, className, ...props }: CustomButtonProps) {
  return (
    <AriaButton
      {...props}
      className={button({ variant, size, className })}
    />
  );
}
```

## まとめ

React Aria Componentsの主な利点：

1. **アクセシビリティ** - WCAG準拠が標準
2. **カスタマイズ性** - 完全にスタイル自由
3. **型安全性** - TypeScript完全対応
4. **国際化** - 多言語サポート
5. **パフォーマンス** - 最適化されたレンダリング

Material-UIやChakra UIのような完成されたデザインは提供しませんが、アクセシブルで柔軟なコンポーネントを構築するための最適な基盤を提供します。

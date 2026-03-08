---
title: "Mantine UI完全ガイド — React UIライブラリの決定版"
description: "Mantine v7の特徴と使い方を徹底解説。100以上のコンポーネント、フック、テーマシステム、フォーム管理、shadcn/uiとの比較、実践例まで完全網羅。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。"
pubDate: "Feb 05 2026"
tags: ["Mantine", "React", "UI Library", "TypeScript", "フロントエンド"]
heroImage: '../../assets/thumbnails/mantine-ui-guide.jpg'
---
## Mantineとは

Mantineは、React向けの包括的なUIライブラリです。100以上のコンポーネントと40以上のフックを提供します。

### 特徴

- **豊富なコンポーネント**: 100以上の実用的なコンポーネント
- **強力なフック**: 状態管理、フォーム、UI制御
- **テーマシステム**: カスタマイズ可能なデザイントークン
- **型安全**: TypeScriptファーストで完全な型推論
- **アクセシビリティ**: WCAG準拠
- **ダークモード**: 標準対応

2026年現在、Material-UIに次ぐ人気のReact UIライブラリです。

## インストール

### Next.js（App Router）

```bash
npx create-next-app@latest my-mantine-app
cd my-mantine-app
npm install @mantine/core @mantine/hooks
```

### Vite + React

```bash
npm create vite@latest my-mantine-app -- --template react-ts
cd my-mantine-app
npm install @mantine/core @mantine/hooks
```

### PostCSS設定

`postcss.config.cjs`:

```javascript
module.exports = {
  plugins: {
    'postcss-preset-mantine': {},
    'postcss-simple-vars': {
      variables: {
        'mantine-breakpoint-xs': '36em',
        'mantine-breakpoint-sm': '48em',
        'mantine-breakpoint-md': '62em',
        'mantine-breakpoint-lg': '75em',
        'mantine-breakpoint-xl': '88em',
      },
    },
  },
}
```

インストール:

```bash
npm install -D postcss postcss-preset-mantine postcss-simple-vars
```

## セットアップ

### MantineProvider

`app/layout.tsx` (Next.js):

```typescript
import '@mantine/core/styles.css'
import { MantineProvider, ColorSchemeScript } from '@mantine/core'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider>{children}</MantineProvider>
      </body>
    </html>
  )
}
```

`main.tsx` (Vite):

```typescript
import '@mantine/core/styles.css'
import { MantineProvider } from '@mantine/core'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <MantineProvider>
    <App />
  </MantineProvider>
)
```

## 基本コンポーネント

### Button

```typescript
import { Button } from '@mantine/core'

function Demo() {
  return (
    <div>
      <Button>Default Button</Button>
      <Button variant="filled">Filled</Button>
      <Button variant="light">Light</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="subtle">Subtle</Button>
      <Button variant="white">White</Button>
    </div>
  )
}
```

サイズとカラー:

```typescript
<Button size="xs">Extra Small</Button>
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
<Button size="xl">Extra Large</Button>

<Button color="blue">Blue</Button>
<Button color="red">Red</Button>
<Button color="green">Green</Button>
<Button color="violet">Violet</Button>
```

### TextInput

```typescript
import { TextInput } from '@mantine/core'

function Demo() {
  return (
    <TextInput
      label="メールアドレス"
      placeholder="your@email.com"
      description="ログインに使用するメールアドレス"
      withAsterisk
    />
  )
}
```

エラー表示:

```typescript
import { useState } from 'react'
import { TextInput, Button } from '@mantine/core'

function Demo() {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  const validate = () => {
    if (!value.includes('@')) {
      setError('有効なメールアドレスを入力してください')
    } else {
      setError('')
    }
  }

  return (
    <div>
      <TextInput
        label="メールアドレス"
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        error={error}
        onBlur={validate}
      />
    </div>
  )
}
```

### Select

```typescript
import { Select } from '@mantine/core'

function Demo() {
  return (
    <Select
      label="都道府県"
      placeholder="選択してください"
      data={[
        { value: 'tokyo', label: '東京都' },
        { value: 'osaka', label: '大阪府' },
        { value: 'kyoto', label: '京都府' },
        { value: 'hokkaido', label: '北海道' },
      ]}
    />
  )
}
```

### Modal

```typescript
import { useState } from 'react'
import { Modal, Button } from '@mantine/core'

function Demo() {
  const [opened, setOpened] = useState(false)

  return (
    <>
      <Button onClick={() => setOpened(true)}>モーダルを開く</Button>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="確認"
      >
        <p>この操作を実行しますか？</p>
        <Button onClick={() => setOpened(false)}>OK</Button>
      </Modal>
    </>
  )
}
```

### Table

```typescript
import { Table } from '@mantine/core'

const data = [
  { id: 1, name: '田中太郎', email: 'tanaka@example.com', age: 28 },
  { id: 2, name: '佐藤花子', email: 'sato@example.com', age: 32 },
  { id: 3, name: '鈴木一郎', email: 'suzuki@example.com', age: 25 },
]

function Demo() {
  const rows = data.map((row) => (
    <Table.Tr key={row.id}>
      <Table.Td>{row.id}</Table.Td>
      <Table.Td>{row.name}</Table.Td>
      <Table.Td>{row.email}</Table.Td>
      <Table.Td>{row.age}</Table.Td>
    </Table.Tr>
  ))

  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>ID</Table.Th>
          <Table.Th>名前</Table.Th>
          <Table.Th>メール</Table.Th>
          <Table.Th>年齢</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  )
}
```

### Notification

```typescript
import { Button } from '@mantine/core'
import { notifications } from '@mantine/notifications'

function Demo() {
  return (
    <Button
      onClick={() =>
        notifications.show({
          title: '成功',
          message: 'データを保存しました',
          color: 'green',
        })
      }
    >
      通知を表示
    </Button>
  )
}
```

セットアップ（`layout.tsx`に追加）:

```typescript
import '@mantine/notifications/styles.css'
import { Notifications } from '@mantine/notifications'

<MantineProvider>
  <Notifications />
  {children}
</MantineProvider>
```

## レイアウトコンポーネント

### AppShell

```typescript
import { AppShell, Burger, Group, Text } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'

function Demo() {
  const [opened, { toggle }] = useDisclosure()

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Text size="xl" fw={700}>Mantine App</Text>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        Navbar
      </AppShell.Navbar>

      <AppShell.Main>
        Main Content
      </AppShell.Main>
    </AppShell>
  )
}
```

### Grid

```typescript
import { Grid } from '@mantine/core'

function Demo() {
  return (
    <Grid>
      <Grid.Col span={12}>Full Width</Grid.Col>
      <Grid.Col span={6}>Half Width</Grid.Col>
      <Grid.Col span={6}>Half Width</Grid.Col>
      <Grid.Col span={4}>1/3 Width</Grid.Col>
      <Grid.Col span={4}>1/3 Width</Grid.Col>
      <Grid.Col span={4}>1/3 Width</Grid.Col>
    </Grid>
  )
}
```

レスポンシブ:

```typescript
<Grid>
  <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
    Responsive Column
  </Grid.Col>
</Grid>
```

### Stack

```typescript
import { Stack, Button } from '@mantine/core'

function Demo() {
  return (
    <Stack gap="md">
      <Button>Button 1</Button>
      <Button>Button 2</Button>
      <Button>Button 3</Button>
    </Stack>
  )
}
```

### Group

```typescript
import { Group, Button } from '@mantine/core'

function Demo() {
  return (
    <Group gap="md" justify="center">
      <Button>Button 1</Button>
      <Button>Button 2</Button>
      <Button>Button 3</Button>
    </Group>
  )
}
```

## フォーム管理（@mantine/form）

### インストール

```bash
npm install @mantine/form
```

### 基本的なフォーム

```typescript
import { useForm } from '@mantine/form'
import { TextInput, Button, Box } from '@mantine/core'

function Demo() {
  const form = useForm({
    initialValues: {
      name: '',
      email: '',
      age: 0,
    },

    validate: {
      name: (value) => (value.length < 2 ? '2文字以上入力してください' : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : '無効なメールアドレス'),
      age: (value) => (value < 18 ? '18歳以上である必要があります' : null),
    },
  })

  return (
    <Box component="form" onSubmit={form.onSubmit((values) => console.log(values))}>
      <TextInput
        label="名前"
        placeholder="名前を入力"
        {...form.getInputProps('name')}
      />

      <TextInput
        label="メールアドレス"
        placeholder="your@email.com"
        {...form.getInputProps('email')}
      />

      <TextInput
        label="年齢"
        type="number"
        {...form.getInputProps('age')}
      />

      <Button type="submit" mt="md">
        送信
      </Button>
    </Box>
  )
}
```

### 動的バリデーション

```typescript
const form = useForm({
  initialValues: {
    password: '',
    confirmPassword: '',
  },

  validate: {
    password: (value) => {
      if (value.length < 8) return '8文字以上入力してください'
      if (!/[A-Z]/.test(value)) return '大文字を含めてください'
      if (!/[0-9]/.test(value)) return '数字を含めてください'
      return null
    },
    confirmPassword: (value, values) =>
      value !== values.password ? 'パスワードが一致しません' : null,
  },
})
```

### 配列フィールド

```typescript
import { useForm } from '@mantine/form'
import { TextInput, Button, Group } from '@mantine/core'

function Demo() {
  const form = useForm({
    initialValues: {
      users: [{ name: '', email: '' }],
    },
  })

  return (
    <div>
      {form.values.users.map((_, index) => (
        <Group key={index}>
          <TextInput
            label="名前"
            {...form.getInputProps(`users.${index}.name`)}
          />
          <TextInput
            label="メール"
            {...form.getInputProps(`users.${index}.email`)}
          />
          <Button onClick={() => form.removeListItem('users', index)}>
            削除
          </Button>
        </Group>
      ))}

      <Button onClick={() => form.insertListItem('users', { name: '', email: '' })}>
        追加
      </Button>
    </div>
  )
}
```

## カスタムフック

### useDisclosure

モーダル、ドロワー等の開閉状態管理:

```typescript
import { useDisclosure } from '@mantine/hooks'
import { Modal, Button } from '@mantine/core'

function Demo() {
  const [opened, { open, close }] = useDisclosure(false)

  return (
    <>
      <Button onClick={open}>開く</Button>
      <Modal opened={opened} onClose={close} title="モーダル">
        コンテンツ
      </Modal>
    </>
  )
}
```

### useLocalStorage

```typescript
import { useLocalStorage } from '@mantine/hooks'
import { TextInput, Button } from '@mantine/core'

function Demo() {
  const [value, setValue] = useLocalStorage({
    key: 'my-value',
    defaultValue: '',
  })

  return (
    <>
      <TextInput value={value} onChange={(e) => setValue(e.currentTarget.value)} />
      <p>LocalStorageの値: {value}</p>
    </>
  )
}
```

### useMediaQuery

```typescript
import { useMediaQuery } from '@mantine/hooks'
import { Text } from '@mantine/core'

function Demo() {
  const isMobile = useMediaQuery('(max-width: 768px)')

  return <Text>{isMobile ? 'モバイル' : 'デスクトップ'}</Text>
}
```

### useDebounce

```typescript
import { useState } from 'react'
import { useDebouncedValue } from '@mantine/hooks'
import { TextInput } from '@mantine/core'

function Demo() {
  const [value, setValue] = useState('')
  const [debounced] = useDebouncedValue(value, 500)

  // debouncedを使ってAPI呼び出し等
  useEffect(() => {
    if (debounced) {
      fetch(`/api/search?q=${debounced}`)
    }
  }, [debounced])

  return (
    <TextInput
      value={value}
      onChange={(e) => setValue(e.currentTarget.value)}
      placeholder="検索..."
    />
  )
}
```

### useIntersection

```typescript
import { useRef } from 'react'
import { useIntersection } from '@mantine/hooks'

function Demo() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { ref, entry } = useIntersection({
    root: containerRef.current,
    threshold: 1,
  })

  return (
    <div>
      <div ref={containerRef} style={{ height: 300, overflowY: 'scroll' }}>
        <div style={{ height: 600 }}>
          <div ref={ref}>
            {entry?.isIntersecting ? '表示中' : '表示外'}
          </div>
        </div>
      </div>
    </div>
  )
}
```

## テーマカスタマイズ

### カラースキーム

```typescript
import { MantineProvider, createTheme } from '@mantine/core'

const theme = createTheme({
  primaryColor: 'violet',
  colors: {
    brand: [
      '#f0f0ff',
      '#d9d9ff',
      '#b3b3ff',
      '#8c8cff',
      '#6666ff',
      '#4040ff',
      '#3333cc',
      '#262699',
      '#1a1a66',
      '#0d0d33',
    ],
  },
})

<MantineProvider theme={theme}>
  <App />
</MantineProvider>
```

### フォント

```typescript
const theme = createTheme({
  fontFamily: 'Noto Sans JP, sans-serif',
  headings: {
    fontFamily: 'Roboto, sans-serif',
  },
})
```

### ブレークポイント

```typescript
const theme = createTheme({
  breakpoints: {
    xs: '30em',
    sm: '48em',
    md: '64em',
    lg: '74em',
    xl: '90em',
  },
})
```

### コンポーネントデフォルト

```typescript
const theme = createTheme({
  components: {
    Button: {
      defaultProps: {
        size: 'md',
        variant: 'filled',
      },
    },
    TextInput: {
      defaultProps: {
        size: 'md',
      },
    },
  },
})
```

## ダークモード

### カラースキーム切り替え

```typescript
'use client'

import { useMantineColorScheme, Button } from '@mantine/core'

function Demo() {
  const { colorScheme, setColorScheme } = useMantineColorScheme()

  return (
    <Button
      onClick={() =>
        setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')
      }
    >
      {colorScheme === 'dark' ? 'ライト' : 'ダーク'}モード
    </Button>
  )
}
```

### システム設定対応

```typescript
import { MantineProvider } from '@mantine/core'

<MantineProvider defaultColorScheme="auto">
  <App />
</MantineProvider>
```

## shadcn/uiとの比較

### 哲学の違い

**Mantine**
- 完全なUIライブラリ
- インストールするだけで使える
- カスタマイズはテーマシステムで

**shadcn/ui**
- コンポーネントをコピペ
- 完全にカスタマイズ可能
- 自分でメンテナンス

### コンポーネント数

**Mantine**
- 100以上のコンポーネント
- データグリッド、カレンダー、リッチテキストエディタ等も含む

**shadcn/ui**
- 40程度のコンポーネント
- 基本的なUIのみ

### フック

**Mantine**
- 40以上の専用フック
- useForm、useLocalStorage等

**shadcn/ui**
- フックなし（React標準フックを使う）

### バンドルサイズ

**Mantine**
- コア: 約80KB (gzip)
- Tree-shakingで削減可能

**shadcn/ui**
- 使うコンポーネントのみ
- 約20-30KB (gzip)

### どちらを選ぶべきか

**Mantineを選ぶべき場合**
- 早く開発したい
- 豊富なコンポーネントが欲しい
- フック等のユーティリティも欲しい
- 管理画面、ダッシュボード

**shadcn/uiを選ぶべき場合**
- 完全にカスタマイズしたい
- バンドルサイズを最小化したい
- デザインシステムを自作する
- マーケティングサイト

## 実践例: 管理画面

```typescript
'use client'

import { useState } from 'react'
import {
  AppShell,
  Burger,
  Group,
  Text,
  NavLink,
  Table,
  Button,
  Modal,
  TextInput,
  Select,
  Stack,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'

const initialData = [
  { id: 1, name: '田中太郎', email: 'tanaka@example.com', role: 'admin' },
  { id: 2, name: '佐藤花子', email: 'sato@example.com', role: 'user' },
]

export default function AdminPage() {
  const [opened, { toggle }] = useDisclosure()
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false)
  const [users, setUsers] = useState(initialData)

  const form = useForm({
    initialValues: {
      name: '',
      email: '',
      role: 'user',
    },
    validate: {
      name: (value) => (value.length < 2 ? '2文字以上' : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : '無効なメール'),
    },
  })

  const handleSubmit = (values: typeof form.values) => {
    setUsers([...users, { id: users.length + 1, ...values }])
    notifications.show({
      title: '成功',
      message: 'ユーザーを追加しました',
      color: 'green',
    })
    form.reset()
    closeModal()
  }

  const rows = users.map((user) => (
    <Table.Tr key={user.id}>
      <Table.Td>{user.id}</Table.Td>
      <Table.Td>{user.name}</Table.Td>
      <Table.Td>{user.email}</Table.Td>
      <Table.Td>{user.role}</Table.Td>
      <Table.Td>
        <Button size="xs" variant="light" color="red">
          削除
        </Button>
      </Table.Td>
    </Table.Tr>
  ))

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Text size="xl" fw={700}>管理画面</Text>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavLink label="ダッシュボード" active />
        <NavLink label="ユーザー" />
        <NavLink label="設定" />
      </AppShell.Navbar>

      <AppShell.Main>
        <Group justify="space-between" mb="md">
          <Text size="xl" fw={700}>ユーザー一覧</Text>
          <Button onClick={openModal}>新規追加</Button>
        </Group>

        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ID</Table.Th>
              <Table.Th>名前</Table.Th>
              <Table.Th>メール</Table.Th>
              <Table.Th>ロール</Table.Th>
              <Table.Th>操作</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>

        <Modal opened={modalOpened} onClose={closeModal} title="ユーザー追加">
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack>
              <TextInput
                label="名前"
                placeholder="名前を入力"
                {...form.getInputProps('name')}
              />
              <TextInput
                label="メール"
                placeholder="your@email.com"
                {...form.getInputProps('email')}
              />
              <Select
                label="ロール"
                data={[
                  { value: 'admin', label: '管理者' },
                  { value: 'user', label: '一般ユーザー' },
                ]}
                {...form.getInputProps('role')}
              />
              <Button type="submit">追加</Button>
            </Stack>
          </form>
        </Modal>
      </AppShell.Main>
    </AppShell>
  )
}
```

## まとめ

Mantineは2026年現在、React UIライブラリの最有力候補の一つです。

### メリット

- **生産性**: 豊富なコンポーネントで開発が早い
- **強力なフック**: useForm、useLocalStorage等
- **型安全**: TypeScript完全対応
- **アクセシビリティ**: WCAG準拠
- **ドキュメント**: 詳細なドキュメントと例

### ユースケース

- 管理画面・ダッシュボード
- SaaSアプリケーション
- 社内ツール
- プロトタイプ

Material-UIより軽量で、shadcn/uiより機能豊富。バランスの取れた選択肢です。

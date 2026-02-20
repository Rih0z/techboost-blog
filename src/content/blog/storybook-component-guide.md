---
title: 'Storybook完全ガイド — コンポーネント駆動開発・Visual Testing・Chromatic'
description: 'StorybookでReact/TypeScriptコンポーネントを体系的に管理する完全ガイド。Story記述・Args・Controls・Decorators・Interaction Testing・Chromatic Visual Testing・CI/CD統合まで実装例付きで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-5.jpg'
tags: ['Storybook', 'React', 'TypeScript', 'コンポーネント', 'テスト']
---

フロントエンド開発において、UIコンポーネントを安全かつ効率よく管理することは永遠の課題だ。
Storybookはその課題を解決する業界標準ツールであり、React・Vue・Angular・Svelteなど主要なフレームワークに対応する。
本記事では、Storybook 8.x系をReact + TypeScript + Vite環境で使い倒すための完全ガイドを提供する。
セットアップから始まり、Story記述・Args・Controls・Decorators・Interaction Testing・Chromatic Visual Testing・CI/CD統合、さらにモノレポ構成まで、実装コード付きで網羅的に解説する。

---

## 1. Storybookとは — コンポーネント駆動開発（CDD）の考え方

### コンポーネント駆動開発とは

コンポーネント駆動開発（Component-Driven Development / CDD）は、UIをページ単位ではなくコンポーネント単位で構築するアプローチだ。
最小単位のUI部品（ボタン・入力フォームなど）を作り、それらを組み合わせてより大きな部品（カード・モーダルなど）を作り、最終的にページを組み上げる。

このアプローチの利点は以下のとおりだ。

- **再利用性**: 同じコンポーネントを複数の箇所で使い回せる
- **テスタビリティ**: コンポーネント単体を隔離してテストできる
- **並行開発**: デザイナーとエンジニアがコンポーネントレベルで協業できる
- **一貫性**: デザインシステムとして一元管理することでUIの一貫性が担保される

### Storybookの役割

Storybookは「コンポーネントのワークショップ」だ。
各コンポーネントを実際のアプリケーションから切り離した隔離環境で表示・操作できる。

```
アプリケーション全体
  └── ページ
        └── セクション
              └── コンポーネント  <-- Storybookはここを管理
                    └── アトム（最小単位）
```

Storybookを使うことで得られるメリット:

1. **カタログ化**: 全コンポーネントを一覧できるUIカタログ
2. **状態の可視化**: Props（Args）を変えてコンポーネントの各状態をすぐ確認
3. **ドキュメント**: MDXで自動生成されるAPIドキュメント
4. **テスト統合**: Interaction Testing、Visual Regression Testingが組み込める
5. **デザイナーとの協業**: Figmaプラグインでデザインと実装を紐付けられる

---

## 2. セットアップ（React + TypeScript + Vite）

### プロジェクト作成

まず、Vite + React + TypeScriptのプロジェクトを作成する。

```bash
npm create vite@latest my-design-system -- --template react-ts
cd my-design-system
npm install
```

### Storybookの初期化

```bash
npx storybook@latest init
```

このコマンドが自動的に以下を実行する。

- 必要なパッケージのインストール（`@storybook/react`、`@storybook/react-vite`など）
- `.storybook/` ディレクトリの作成
- `src/stories/` にサンプルStoryの生成
- `package.json` へのスクリプト追加

インストール後のディレクトリ構造:

```
my-design-system/
├── .storybook/
│   ├── main.ts          # Storybook設定
│   └── preview.ts       # グローバルデコレーター・パラメーター
├── src/
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.stories.tsx
│   │   │   └── Button.test.tsx
│   └── stories/
│       └── (自動生成サンプル)
├── package.json
└── vite.config.ts
```

### `.storybook/main.ts` の設定

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  // Storyファイルのパターン
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-essentials',    // Controls, Actions, Docs, Viewport, etc.
    '@storybook/addon-interactions',  // Interaction Testing
    '@storybook/addon-a11y',          // アクセシビリティチェック
    '@chromatic-com/storybook',       // Chromatic Visual Testing
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',  // 'autodocs' タグがついたStoryは自動でDocs生成
  },
  typescript: {
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) =>
        prop.parent ? !/node_modules/.test(prop.parent.fileName) : true,
    },
  },
};

export default config;
```

### `.storybook/preview.ts` の設定

```typescript
// .storybook/preview.ts
import type { Preview } from '@storybook/react';
import '../src/styles/global.css'; // グローバルCSSを読み込む

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' }, // on〜 の関数Propsを自動でActionとして登録
    controls: {
      matchers: {
        color: /(background|color)$/i, // colorの名前を持つPropsにカラーピッカーを表示
        date: /Date$/i,                // Dateの名前を持つPropsに日付ピッカーを表示
      },
    },
    viewport: {
      // レスポンシブテスト用ビューポートプリセット
      viewports: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '812px' } },
        tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' } },
        desktop: { name: 'Desktop', styles: { width: '1280px', height: '800px' } },
      },
    },
  },
};

export default preview;
```

### 起動確認

```bash
npm run storybook
# http://localhost:6006 でUIが開く
```

---

## 3. Story記述（CSF 3.0形式）

### CSF（Component Story Format）とは

CSFはStorybookが定義するStoryの標準記述形式だ。
Storybook 6.4以降はCSF 3.0が推奨される。ES Modulesベースで、TypeScriptとの相性が抜群だ。

### 基本的なButton コンポーネントとStory

まずコンポーネントを作成する。

```typescript
// src/components/Button/Button.tsx
import React from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  /** ボタンのラベルテキスト */
  label: string;
  /** ボタンのバリアント */
  variant?: ButtonVariant;
  /** ボタンのサイズ */
  size?: ButtonSize;
  /** 無効状態 */
  disabled?: boolean;
  /** 読み込み中状態 */
  loading?: boolean;
  /** クリックハンドラー */
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
}) => {
  return (
    <button
      className={`${styles.button} ${styles[variant]} ${styles[size]}`}
      disabled={disabled || loading}
      onClick={onClick}
      aria-busy={loading}
    >
      {loading ? (
        <span aria-hidden="true" className={styles.spinner} />
      ) : null}
      {label}
    </button>
  );
};
```

次に、StoryをCSF 3.0形式で記述する。

```typescript
// src/components/Button/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Button } from './Button';

// --- default export: メタデータ定義 ---
const meta: Meta<typeof Button> = {
  title: 'Components/Button',      // Storybookのサイドバー階層
  component: Button,
  tags: ['autodocs'],              // Docs自動生成を有効化
  args: {
    onClick: fn(),                 // fn()でAction自動記録
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'ghost'],
      description: 'ボタンの視覚的バリアント',
    },
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    label: { control: 'text' },
  },
};

export default meta;

// --- named export: 各Story ---
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    label: '送信する',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    label: 'キャンセル',
    variant: 'secondary',
  },
};

export const Danger: Story = {
  args: {
    label: '削除する',
    variant: 'danger',
  },
};

export const Loading: Story = {
  args: {
    label: '処理中...',
    loading: true,
  },
};

export const Disabled: Story = {
  args: {
    label: '利用不可',
    disabled: true,
  },
};

export const SmallSize: Story = {
  args: {
    label: '小さいボタン',
    size: 'sm',
  },
};

// 複数Storyを並べて表示する「Storyテーブル」パターン
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      {(['primary', 'secondary', 'danger', 'ghost'] as const).map((variant) => (
        <Button key={variant} label={variant} variant={variant} />
      ))}
    </div>
  ),
};
```

---

## 4. Args・ArgTypes（Controls パネル）

### Args とは

ArgsはStorybookのProps管理システムだ。
Storyの `args` オブジェクトに値を渡すと、ControlsパネルでインタラクティブにPropsを変更できる。

### ArgTypes で Controls をカスタマイズ

```typescript
// src/components/Badge/Badge.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  argTypes: {
    // テキスト入力
    text: {
      control: 'text',
      description: 'バッジに表示するテキスト',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'NEW' },
      },
    },
    // カラーピッカー
    color: {
      control: 'color',
      description: 'バッジの背景色',
    },
    // 数値スライダー
    count: {
      control: { type: 'range', min: 0, max: 999, step: 1 },
      description: '通知数',
    },
    // セレクト
    position: {
      control: 'select',
      options: ['top-right', 'top-left', 'bottom-right', 'bottom-left'],
    },
    // ラジオボタン
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    // チェックボックス
    visible: {
      control: 'boolean',
    },
    // JSONエディタ（オブジェクトProps）
    style: {
      control: 'object',
    },
    // Actionとして登録（クリックを記録）
    onClick: {
      action: 'clicked',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    text: 'NEW',
    size: 'md',
    visible: true,
    count: 5,
  },
};
```

### グローバルArgs（globals）

ダークモード切り替えなどのグローバル状態もArgsで管理できる。

```typescript
// .storybook/preview.ts
const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'カラーテーマ',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', icon: 'sun', title: 'Light' },
          { value: 'dark', icon: 'moon', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
    locale: {
      description: '言語',
      defaultValue: 'ja',
      toolbar: {
        title: 'Locale',
        icon: 'globe',
        items: [
          { value: 'ja', title: '日本語' },
          { value: 'en', title: 'English' },
        ],
      },
    },
  },
  // ...
};
```

---

## 5. Decorators（テーマ・プロバイダーラッピング）

### Decorator とは

DecoratorはStoryをラッピングするHOC（Higher-Order Component）だ。
テーマプロバイダー・認証プロバイダー・グローバルスタイルなどを注入するために使う。

### グローバルDecorator（全Storyに適用）

```typescript
// .storybook/preview.ts
import type { Preview, Decorator } from '@storybook/react';
import React from 'react';
import { ThemeProvider } from '../src/providers/ThemeProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

// テーマとRouterを注入するグローバルDecorator
const GlobalDecorators: Decorator = (Story, context) => {
  const theme = context.globals.theme ?? 'light';

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <div data-theme={theme} style={{ padding: '24px' }}>
            <Story />
          </div>
        </ThemeProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const preview: Preview = {
  decorators: [GlobalDecorators],
  // ...
};

export default preview;
```

### Story個別Decorator

特定のStoryにだけ適用したいDecoratorは `decorators` 配列で指定する。

```typescript
// src/components/Modal/Modal.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Modal } from './Modal';

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
  // Modalは特定のコンテナが必要なため専用Decoratorを使用
  decorators: [
    (Story) => (
      <div id="modal-root" style={{ position: 'relative', minHeight: '400px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isOpen: true,
    title: 'ダイアログタイトル',
    children: 'ダイアログの本文コンテンツです。',
  },
  // このStoryだけ追加のDecoratorを適用
  decorators: [
    (Story) => (
      <div style={{ background: 'rgba(0,0,0,0.5)', padding: '20px' }}>
        <Story />
      </div>
    ),
  ],
};
```

---

## 6. Addon（@storybook/addon-essentials・a11y・docs）

### addon-essentials に含まれるAddon

`@storybook/addon-essentials` は以下のAddonをまとめてインストールする。

| Addon | 機能 |
|-------|------|
| `addon-docs` | MDX・JSDoc・TypeScriptの型からドキュメント自動生成 |
| `addon-controls` | Props（Args）をUIから変更できるControlsパネル |
| `addon-actions` | イベントハンドラーの呼び出しを記録・表示 |
| `addon-viewport` | レスポンシブ確認用のビューポート切り替え |
| `addon-backgrounds` | 背景色切り替え |
| `addon-toolbars` | ツールバーにカスタムボタン追加 |
| `addon-measure` | 要素のサイズ・間隔を可視化 |
| `addon-outline` | レイアウトのアウトラインを可視化 |

### addon-a11y の設定

アクセシビリティチェックAddonをインストールして設定する。

```bash
npm install --save-dev @storybook/addon-a11y
```

```typescript
// .storybook/main.ts
const config: StorybookConfig = {
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
  ],
};
```

```typescript
// .storybook/preview.ts
// a11yのルールをグローバルでカスタマイズ
const preview: Preview = {
  parameters: {
    a11y: {
      config: {
        rules: [
          {
            // color-contrastルールを警告レベルに下げる（デザインシステムで保証済みの場合）
            id: 'color-contrast',
            reviewOnFail: true,
          },
        ],
      },
    },
  },
};
```

特定のStoryでa11yルールを無効化する方法:

```typescript
export const IconOnlyButton: Story = {
  args: {
    icon: 'close',
    'aria-label': '閉じる',
  },
  parameters: {
    a11y: {
      config: {
        rules: [{ id: 'button-name', enabled: false }],
      },
    },
  },
};
```

---

## 7. Interaction Testing（play関数）

### Interaction Testing とは

Interaction Testingは、Storybookのブラウザ環境でユーザー操作をシミュレートし、動作を検証する仕組みだ。
`@storybook/test` の `userEvent` と `expect` を使ってテストを記述し、`play` 関数で実行する。

### セットアップ

```bash
npm install --save-dev @storybook/test @storybook/addon-interactions
```

### Formコンポーネントのテスト例

```typescript
// src/components/LoginForm/LoginForm.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { userEvent, within, expect, fn } from '@storybook/test';
import { LoginForm } from './LoginForm';

const meta: Meta<typeof LoginForm> = {
  title: 'Components/LoginForm',
  component: LoginForm,
  args: {
    onSubmit: fn(),
    onForgotPassword: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// 正常なログインフロー
export const SuccessfulLogin: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // メールアドレス入力
    const emailInput = canvas.getByLabelText('メールアドレス');
    await userEvent.type(emailInput, 'user@example.com', { delay: 50 });

    // パスワード入力
    const passwordInput = canvas.getByLabelText('パスワード');
    await userEvent.type(passwordInput, 'securepassword123', { delay: 50 });

    // ログインボタンクリック
    const submitButton = canvas.getByRole('button', { name: 'ログイン' });
    await userEvent.click(submitButton);

    // onSubmitが正しい引数で呼ばれたか確認
    await expect(args.onSubmit).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'securepassword123',
    });
  },
};

// バリデーションエラーのテスト
export const ValidationError: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 空のフォームを送信
    const submitButton = canvas.getByRole('button', { name: 'ログイン' });
    await userEvent.click(submitButton);

    // エラーメッセージが表示されることを確認
    await expect(
      canvas.getByText('メールアドレスを入力してください')
    ).toBeInTheDocument();

    await expect(
      canvas.getByText('パスワードを入力してください')
    ).toBeInTheDocument();
  },
};

// キーボードナビゲーションのテスト
export const KeyboardNavigation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Tabキーで各フィールドをナビゲート
    await userEvent.tab();
    await expect(canvas.getByLabelText('メールアドレス')).toHaveFocus();

    await userEvent.tab();
    await expect(canvas.getByLabelText('パスワード')).toHaveFocus();

    await userEvent.tab();
    await expect(
      canvas.getByRole('button', { name: 'ログイン' })
    ).toHaveFocus();
  },
};
```

### Interaction Testをコマンドラインで実行

```bash
# Storybook起動中にInteraction Testをバッチ実行
npm install --save-dev @storybook/test-runner

# package.json に追加
# "test-storybook": "test-storybook"

npm run test-storybook
```

---

## 8. Visual Regression Testing（Chromatic）

### Chromatic とは

ChromaticはStorybookのためのクラウドVisual Regression Testingサービスだ。
StoryのスナップショットをCI毎に比較し、意図しない見た目の変化を自動検出する。
StorybookコアチームのDomitrius Markus氏らが設立した、Storybook公式の推奨サービスだ。

### セットアップ

```bash
npm install --save-dev chromatic
```

Chromaticの公式サイト（chromatic.com）でプロジェクトを作成し、プロジェクトトークンを取得する。

```bash
# 初回実行（ベースラインを作成）
npx chromatic --project-token=<your-project-token>
```

### Chromaticの設定ファイル

```typescript
// chromatic.config.ts
import { defineConfig } from 'chromatic';

export default defineConfig({
  projectId: 'your-project-id',
  // ビルドコマンド
  buildScriptName: 'build-storybook',
  // スナップショット対象外（アニメーションが不安定なStory等）
  skip: '**/*.skip-chromatic.stories.*',
  // 変化検出の閾値（0〜1、デフォルト0）
  diffThreshold: 0.063,
  // モード（Storyを複数バリエーションで撮影）
  modes: {
    mobile: { viewport: { width: 375, height: 812 } },
    desktop: { viewport: { width: 1280, height: 800 } },
    dark: { backgrounds: { value: '#1a1a1a' } },
  },
});
```

### Story単位でChromatic設定をカスタマイズ

```typescript
export const AnimatedButton: Story = {
  args: {
    label: 'ホバーミー',
  },
  parameters: {
    // このStoryはChromaticでアニメーションを無効化
    chromatic: {
      pauseAnimationAtEnd: true,
      delay: 300, // アニメーション完了後に撮影
    },
  },
};

export const SkipInChromatic: Story = {
  args: { label: 'スキップ' },
  parameters: {
    // このStoryはChromaticでスキップ
    chromatic: { disableSnapshot: true },
  },
};
```

---

## 9. MDXドキュメント（コンポーネントAPIドキュメント）

### MDX とは

MDXはMarkdownとJSXを組み合わせた形式だ。
StorybookのDocsタブで表示されるAPIドキュメントをMDXで記述できる。

### コンポーネントのAPIドキュメント例

```mdx
{/* src/components/Button/Button.mdx */}
import { Meta, Story, Controls, ArgTypes, Canvas, Primary } from '@storybook/blocks';
import * as ButtonStories from './Button.stories';

<Meta of={ButtonStories} />

# Button

基本的なインタラクションのためのボタンコンポーネント。
`primary`・`secondary`・`danger`・`ghost` の4つのバリアントと、3つのサイズに対応する。

## インタラクティブなプレビュー

<Primary />

Controlsパネルでプロパティを変更し、リアルタイムでプレビューを確認できる。

<Controls />

## 全バリアント

<Canvas of={ButtonStories.AllVariants} />

## Props一覧

<ArgTypes of={ButtonStories} />

## 使用ガイドライン

### Do

- フォームの送信には `primary` バリアントを使う
- 破壊的な操作（削除など）には `danger` バリアントを使う
- 副次的なアクションには `secondary` または `ghost` バリアントを使う

### Don't

- 一画面に `primary` ボタンを複数置かない
- `disabled` 状態のボタンのみを並べない（代わりに操作可能なフィードバックを提供する）
- ボタンラベルに動詞を含めない（「〇〇する」と明示する）

## アクセシビリティ

- `disabled` 状態でも `aria-disabled` でスクリーンリーダーに状態を伝える
- アイコンのみのボタンには必ず `aria-label` を付与する
- フォーカス状態のスタイルを削除しない
```

---

## 10. デザイントークン連携（CSS変数・Figma連携）

### CSS変数でデザイントークンを管理

```css
/* src/styles/tokens.css */
:root {
  /* カラートークン */
  --color-primary-50: #eff6ff;
  --color-primary-500: #3b82f6;
  --color-primary-900: #1e3a5f;

  --color-neutral-0: #ffffff;
  --color-neutral-100: #f3f4f6;
  --color-neutral-900: #111827;

  /* タイポグラフィトークン */
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;

  /* スペーシングトークン */
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-4: 16px;
  --spacing-8: 32px;

  /* ボーダーラジウス */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  /* シャドウ */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.10);
}

[data-theme='dark'] {
  --color-neutral-0: #111827;
  --color-neutral-100: #1f2937;
  --color-neutral-900: #f9fafb;
}
```

### Storybook Themeアドオンとトークンの連携

```typescript
// .storybook/preview.ts
const withThemeProvider: Decorator = (Story, context) => {
  const theme = context.globals.theme ?? 'light';
  // data-theme属性でCSSトークンを切り替え
  document.documentElement.setAttribute('data-theme', theme);

  return <Story />;
};
```

### `@storybook/addon-designs` でFigmaを埋め込む

```bash
npm install --save-dev @storybook/addon-designs
```

```typescript
export const Primary: Story = {
  args: { label: 'ボタン', variant: 'primary' },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/file/YOUR_FILE_ID/...',
    },
  },
};
```

Storybookの「Design」タブにFigmaのデザインが表示され、実装とデザインを並べて比較できる。

---

## 11. Next.js / Vite 統合設定

### Next.js との統合

Next.js 14+（App Router）でStorybookを使う場合は `@storybook/nextjs` フレームワークを使う。

```bash
npx storybook@latest init --type nextjs
# または既存プロジェクトへの追加
npx storybook@latest add @storybook/nextjs
```

```typescript
// .storybook/main.ts（Next.js用）
import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/nextjs',
    options: {
      // Next.jsのnext/imageをStorybookで動かす設定
      image: {
        loading: 'eager',
      },
      // next/navigationのモック設定
      nextConfigPath: '../next.config.mjs',
    },
  },
};

export default config;
```

```typescript
// Next.js用Story: next/linkやuseRouterをモックする
import type { Meta, StoryObj } from '@storybook/react';
import { NavLink } from './NavLink';

const meta: Meta<typeof NavLink> = {
  title: 'Components/NavLink',
  component: NavLink,
  parameters: {
    nextjs: {
      // usePathnameのモック値
      navigation: {
        pathname: '/dashboard',
        query: { tab: 'overview' },
      },
    },
  },
};
```

### Vite設定との統合

既存の `vite.config.ts` のエイリアスや環境変数をStorybookでも使いたい場合:

```typescript
// .storybook/main.ts
import { mergeConfig } from 'vite';
import path from 'path';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  async viteFinal(config) {
    return mergeConfig(config, {
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '../src'),
          '@components': path.resolve(__dirname, '../src/components'),
          '@hooks': path.resolve(__dirname, '../src/hooks'),
        },
      },
      define: {
        // 環境変数をStorybookで上書き
        'import.meta.env.VITE_API_URL': JSON.stringify('http://localhost:3001'),
      },
    });
  },
};
```

---

## 12. GitHub Actions CI（Build + Chromatic）

### Storybook Build + Chromaticの自動化

```yaml
# .github/workflows/storybook.yml
name: Storybook CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  # --- Storybookビルドチェック ---
  build-storybook:
    name: Build Storybook
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Chromaticに必要

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build Storybook
        run: npm run build-storybook
        env:
          NODE_OPTIONS: '--max_old_space_size=4096'

      - name: Upload Storybook artifact
        uses: actions/upload-artifact@v4
        with:
          name: storybook-static
          path: storybook-static/
          retention-days: 7

  # --- Interaction Test ---
  interaction-test:
    name: Interaction Tests
    runs-on: ubuntu-latest
    needs: build-storybook
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci

      - name: Download Storybook artifact
        uses: actions/download-artifact@v4
        with:
          name: storybook-static
          path: storybook-static/

      - name: Run Interaction Tests
        run: |
          npx concurrently -k -s first -n "SB,TEST" -c "magenta,blue" \
            "npx http-server storybook-static --port 6006 --silent" \
            "npx wait-on tcp:6006 && npm run test-storybook"

  # --- Chromatic Visual Testing ---
  chromatic:
    name: Chromatic Visual Test
    runs-on: ubuntu-latest
    needs: build-storybook
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Download Storybook artifact
        uses: actions/download-artifact@v4
        with:
          name: storybook-static
          path: storybook-static/

      - name: Publish to Chromatic
        uses: chromaui/action@latest
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          storybookBuildDir: storybook-static
          # PRごとに自動でベースラインと比較
          autoAcceptChanges: 'main'
          exitZeroOnChanges: true

  # --- アクセシビリティチェック ---
  accessibility:
    name: Accessibility Tests
    runs-on: ubuntu-latest
    needs: build-storybook
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci

      - name: Download Storybook artifact
        uses: actions/download-artifact@v4
        with:
          name: storybook-static
          path: storybook-static/

      - name: Run a11y tests
        run: |
          npx concurrently -k -s first -n "SB,TEST" \
            "npx http-server storybook-static --port 6006 --silent" \
            "npx wait-on tcp:6006 && npm run test-storybook -- --tags @a11y"
```

### package.json スクリプト

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "test-storybook": "test-storybook --url http://localhost:6006",
    "chromatic": "chromatic --project-token=${CHROMATIC_PROJECT_TOKEN}"
  }
}
```

---

## 13. モノレポでのStorybook共有設定

### モノレポ構成

```
monorepo/
├── packages/
│   ├── ui/                    # デザインシステムパッケージ
│   │   ├── src/
│   │   │   ├── components/
│   │   │   └── index.ts
│   │   ├── .storybook/        # UIパッケージのStorybook設定
│   │   └── package.json
│   ├── icons/                 # アイコンパッケージ
│   └── tokens/                # デザイントークンパッケージ
├── apps/
│   ├── web/                   # Next.jsアプリ
│   └── admin/                 # 管理画面
├── .storybook/                # ルートStorybook設定（全パッケージ統合）
└── package.json               # pnpm workspace
```

### pnpm workspaceの設定

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

### ルートのStorybook設定（全パッケージ統合）

```typescript
// .storybook/main.ts（ルート）
import type { StorybookConfig } from '@storybook/react-vite';
import path from 'path';

const config: StorybookConfig = {
  // 全パッケージのStoryを収集
  stories: [
    '../packages/ui/src/**/*.stories.@(ts|tsx)',
    '../packages/icons/src/**/*.stories.@(ts|tsx)',
    '../apps/web/src/**/*.stories.@(ts|tsx)',
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@chromatic-com/storybook',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  async viteFinal(config) {
    return {
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          // パッケージのエイリアスを設定
          '@myorg/ui': path.resolve(__dirname, '../packages/ui/src'),
          '@myorg/icons': path.resolve(__dirname, '../packages/icons/src'),
          '@myorg/tokens': path.resolve(__dirname, '../packages/tokens/src'),
        },
      },
    };
  },
};

export default config;
```

### パッケージ間依存のあるStory

```typescript
// packages/ui/src/components/Card/Card.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
// 同じモノレポの別パッケージからインポート
import { IconCheck } from '@myorg/icons';
import { colorTokens } from '@myorg/tokens';
import { Card } from './Card';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const WithIcon: Story = {
  render: () => (
    <Card
      icon={<IconCheck color={colorTokens.success[500]} />}
      title="完了しました"
      description="処理が正常に完了しました。"
    />
  ),
};
```

---

## 実践的なTips・よくある問題と解決策

### MSWでAPIをモックする

```bash
npm install --save-dev msw msw-storybook-addon
```

```typescript
// .storybook/preview.ts
import { initialize, mswLoader } from 'msw-storybook-addon';
initialize();

const preview: Preview = {
  loaders: [mswLoader],
};
```

```typescript
// src/components/UserProfile/UserProfile.stories.tsx
import { http, HttpResponse } from 'msw';

export const WithAPIData: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/user/123', () => {
          return HttpResponse.json({
            id: '123',
            name: '田中太郎',
            email: 'tanaka@example.com',
            role: 'admin',
          });
        }),
      ],
    },
  },
};
```

### Storybook 8.xでよく詰まる点

**1. next/fontが動かない**

```typescript
// .storybook/main.ts
const config: StorybookConfig = {
  framework: {
    name: '@storybook/nextjs',
    options: {
      // next/fontをStorybookで動かす
      nextConfigPath: '../next.config.mjs',
    },
  },
};
```

**2. CSS Modulesがimportできない**

Viteフレームワークを使っていれば通常は自動対応されるが、解決しない場合:

```typescript
// .storybook/main.ts
async viteFinal(config) {
  return mergeConfig(config, {
    css: {
      modules: {
        localsConvention: 'camelCase',
      },
    },
  });
},
```

**3. Storybookが遅い**

```typescript
// .storybook/main.ts
const config: StorybookConfig = {
  // 開発時は特定のディレクトリのみ監視
  stories: process.env.CI
    ? ['../src/**/*.stories.@(ts|tsx)']
    : ['../src/components/**/*.stories.@(ts|tsx)'], // 開発時は絞る
};
```

### コンポーネントPropsのJSON検証

複雑なオブジェクト型のPropsを開発中に手入力するのは面倒だ。
[DevToolBox](https://usedevtools.com/) の「JSON Formatter」ツールを使うと、PropとしてStorybookのControlsパネルに貼り付けるJSONを素早く整形・バリデーションできる。
ネストの深いオブジェクトや配列型のPropsをテストする際に特に役立つ。

---

## まとめ

本記事ではStorybookを中心としたコンポーネント駆動開発の全体像を解説した。

| ステップ | ツール | 効果 |
|---------|-------|------|
| 1. コンポーネント隔離 | Storybook | 依存なしで開発・確認 |
| 2. Props管理 | Args + Controls | インタラクティブなデバッグ |
| 3. 環境注入 | Decorators | テーマ・プロバイダーの統一 |
| 4. ドキュメント | MDX + autodocs | APIドキュメント自動生成 |
| 5. 動作テスト | Interaction Testing | ユーザーフローの自動検証 |
| 6. 見た目テスト | Chromatic | リグレッション自動検出 |
| 7. アクセシビリティ | addon-a11y | WCAG準拠の自動チェック |
| 8. CI統合 | GitHub Actions | PR毎に全テスト自動実行 |

Storybookは単なるコンポーネントカタログではない。
開発・テスト・ドキュメント・デザイン協業の全てを一箇所に集約するプラットフォームだ。
CDDの思想と合わせて実践することで、フロントエンドの品質と開発速度を同時に向上させられる。

まずは小さなコンポーネント（Buttonなど）からStoryを書き始め、徐々にInter action TestingとChromaticを追加していくのがおすすめだ。

---

*このガイドはStorybook 8.x、React 18、TypeScript 5.x、Vite 5.xを前提に記述されている。*

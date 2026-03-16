---
title: "Storybook 8でUIコンポーネント開発を効率化"
description: "Storybook 8 の新機能と実践的な使い方を徹底解説。React、Vue、Angular でのコンポーネント駆動開発を加速させる。テスト統合、インタラクションテスト、アドオン活用からCI/CDへの組み込みまで現場で使えるノウハウを網羅しています。"
pubDate: "2025-02-05"
tags: ['プログラミング', '開発ツール']
heroImage: '../../assets/thumbnails/storybook-8-guide.jpg'
---
## Storybook 8とは

Storybook は、UIコンポーネントを独立した環境で開発・テスト・ドキュメント化するためのツールです。バージョン8では、パフォーマンスの大幅な改善、新しいテストツール、React Server Components のサポートなど、多くの新機能が追加されました。

### Storybook 8 の主な新機能

- **パフォーマンス向上**: 起動時間が最大50%短縮、ビルド時間も大幅に改善
- **React Server Components 対応**: Next.js の App Router と完全互換
- **新しいテスト体験**: Vitest との統合、ポータブルストーリー
- **自動ドキュメント生成の改善**: TypeScript 型から自動生成
- **モバイルUI**: スマートフォンでのプレビューが容易に

## セットアップ

### 新規プロジェクトでのインストール

```bash
# React プロジェクトの作成
npx create-react-app my-app
cd my-app

# Storybook の初期化
npx storybook@latest init
```

Next.js プロジェクトの場合:

```bash
npx create-next-app@latest my-next-app
cd my-next-app
npx storybook@latest init
```

### 既存プロジェクトへの追加

```bash
npx storybook@latest init
```

このコマンドは自動的に:
- 必要な依存関係をインストール
- 設定ファイルを生成
- サンプルストーリーを作成

### 起動

```bash
npm run storybook
```

ブラウザで `http://localhost:6006` が開きます。

## 基本的なストーリーの作成

### コンポーネントの準備

`Button.tsx`:

```typescript
import React from 'react';

export interface ButtonProps {
  /**
   * ボタンのテキスト
   */
  label: string;
  /**
   * ボタンのスタイル
   */
  variant?: 'primary' | 'secondary' | 'danger';
  /**
   * サイズ
   */
  size?: 'small' | 'medium' | 'large';
  /**
   * 無効化するか
   */
  disabled?: boolean;
  /**
   * クリック時のハンドラー
   */
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  onClick,
}) => {
  const baseClasses = 'rounded font-semibold transition-colors';

  const variantClasses = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  };

  const sizeClasses = {
    small: 'px-3 py-1 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg',
  };

  const classes = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
  `.trim().replace(/\s+/g, ' ');

  return (
    <button
      className={classes}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
};
```

### ストーリーの作成

`Button.stories.tsx`:

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

// メタデータの定義
const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger'],
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
    onClick: { action: 'clicked' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// 基本的なストーリー
export const Primary: Story = {
  args: {
    label: 'Primary Button',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    label: 'Secondary Button',
    variant: 'secondary',
  },
};

export const Danger: Story = {
  args: {
    label: 'Danger Button',
    variant: 'danger',
  },
};

export const Small: Story = {
  args: {
    label: 'Small Button',
    size: 'small',
  },
};

export const Large: Story = {
  args: {
    label: 'Large Button',
    size: 'large',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled Button',
    disabled: true,
  },
};
```

## CSF 3.0（Component Story Format）

Storybook 8 では CSF 3.0 が標準となり、より簡潔な記法が可能になりました。

### 従来の書き方（CSF 2.0）

```typescript
export const Primary = () => <Button label="Primary" variant="primary" />;
```

### 新しい書き方（CSF 3.0）

```typescript
export const Primary: Story = {
  args: {
    label: 'Primary',
    variant: 'primary',
  },
};
```

### Play Function によるインタラクション

```typescript
import { userEvent, within } from '@storybook/test';

export const ClickTest: Story = {
  args: {
    label: 'Click Me',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');

    // ボタンをクリック
    await userEvent.click(button);

    // 状態の確認
    // expect(button).toHaveTextContent('Clicked!');
  },
};
```

## デコレーター

### グローバルデコレーター

`.storybook/preview.tsx`:

```typescript
import type { Preview } from '@storybook/react';
import '../src/index.css'; // Tailwind など

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ margin: '3em' }}>
        <Story />
      </div>
    ),
  ],
};

export default preview;
```

### ストーリー固有のデコレーター

```typescript
export const WithBackground: Story = {
  args: {
    label: 'Button with Background',
  },
  decorators: [
    (Story) => (
      <div style={{ backgroundColor: '#f0f0f0', padding: '2em' }}>
        <Story />
      </div>
    ),
  ],
};
```

## アドオン

### 主要なアドオン

```bash
# アクション（イベントログ）
npm install @storybook/addon-actions

# コントロール（Props編集）
npm install @storybook/addon-controls

# ビューポート（レスポンシブ）
npm install @storybook/addon-viewport

# アクセシビリティチェック
npm install @storybook/addon-a11y
```

### アドオンの設定

`.storybook/main.ts`:

```typescript
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
};

export default config;
```

## テスト統合

### Vitest との統合

Storybook 8 では、ストーリーをそのままテストとして実行できます。

```bash
npm install @storybook/test-runner vitest
```

`vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
  },
});
```

### ポータブルストーリー

ストーリーをテストファイルで再利用:

```typescript
import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as stories from './Button.stories';

const { Primary, Disabled } = composeStories(stories);

describe('Button', () => {
  it('renders primary button', () => {
    render(<Primary />);
    expect(screen.getByRole('button')).toHaveTextContent('Primary Button');
  });

  it('disables button when disabled prop is true', () => {
    render(<Disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Visual Regression Testing

```bash
npm install @storybook/addon-storyshots-puppeteer
```

```typescript
import initStoryshots from '@storybook/addon-storyshots';
import { imageSnapshot } from '@storybook/addon-storyshots-puppeteer';

initStoryshots({
  suite: 'Image storyshots',
  test: imageSnapshot({
    storybookUrl: 'http://localhost:6006',
  }),
});
```

## React Server Components 対応

Next.js App Router でのサーバーコンポーネント:

`ServerComponent.tsx`:

```typescript
// 'use server' ディレクティブ
async function getData() {
  const res = await fetch('https://api.example.com/data');
  return res.json();
}

export async function ServerComponent() {
  const data = await getData();

  return (
    <div>
      <h1>{data.title}</h1>
      <p>{data.description}</p>
    </div>
  );
}
```

`ServerComponent.stories.tsx`:

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { ServerComponent } from './ServerComponent';

const meta = {
  title: 'Server/ServerComponent',
  component: ServerComponent,
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
} satisfies Meta<typeof ServerComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
```

## カスタムテーマ

### Storybook UI のカスタマイズ

`.storybook/manager.ts`:

```typescript
import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming';

const theme = create({
  base: 'light',
  brandTitle: 'My Company',
  brandUrl: 'https://example.com',
  brandImage: 'https://example.com/logo.svg',
  brandTarget: '_self',

  colorPrimary: '#3B82F6',
  colorSecondary: '#10B981',

  // UI
  appBg: '#F9FAFB',
  appContentBg: '#FFFFFF',
  appBorderColor: '#E5E7EB',
  appBorderRadius: 4,

  // テキスト
  textColor: '#1F2937',
  textInverseColor: '#FFFFFF',

  // ツールバー
  barTextColor: '#6B7280',
  barSelectedColor: '#3B82F6',
  barBg: '#FFFFFF',

  // フォーム
  inputBg: '#FFFFFF',
  inputBorder: '#D1D5DB',
  inputTextColor: '#1F2937',
  inputBorderRadius: 4,
});

addons.setConfig({
  theme,
});
```

## ドキュメント自動生成

### MDX によるドキュメント

`Button.mdx`:

```mdx
import { Meta, Canvas, Controls } from '@storybook/blocks';
import * as ButtonStories from './Button.stories';

<Meta of={ButtonStories} />

# Button コンポーネント

汎用的なボタンコンポーネントです。

## 使い方

```tsx
import { Button } from './Button';

function App() {
  return (
    <Button label="クリック" variant="primary" onClick={() => alert('Clicked!')} />
  );
}
```

## プレビュー

<Canvas of={ButtonStories.Primary} />

## Props

<Controls of={ButtonStories.Primary} />

## バリエーション

### Primary
<Canvas of={ButtonStories.Primary} />

### Secondary
<Canvas of={ButtonStories.Secondary} />

### Danger
<Canvas of={ButtonStories.Danger} />

### サイズ

<Canvas of={ButtonStories.Small} />
<Canvas of={ButtonStories.Large} />

### 無効化

<Canvas of={ButtonStories.Disabled} />
```

## デプロイ

### 静的ビルド

```bash
npm run build-storybook
```

ビルドされた静的ファイルは `storybook-static` ディレクトリに出力されます。

### Chromatic へのデプロイ

Chromatic は Storybook 公式のホスティング・VRTサービスです。

```bash
npm install chromatic --save-dev
npx chromatic --project-token=<your-project-token>
```

### Vercel へのデプロイ

```bash
# storybook-static を public ディレクトリとして扱う
npm run build-storybook
```

`vercel.json`:

```json
{
  "buildCommand": "npm run build-storybook",
  "outputDirectory": "storybook-static"
}
```

### GitHub Pages へのデプロイ

`.github/workflows/deploy-storybook.yml`:

```yaml
name: Deploy Storybook

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build-storybook
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./storybook-static
```

## 実践的なパターン

### コンポジションパターン

```typescript
// Card.tsx
export const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="border rounded-lg shadow-md p-4">
    {children}
  </div>
);

// CardHeader.tsx
export const CardHeader: React.FC<{ title: string }> = ({ title }) => (
  <h2 className="text-xl font-bold mb-2">{title}</h2>
);

// CardBody.tsx
export const CardBody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-gray-700">{children}</div>
);
```

`Card.stories.tsx`:

```typescript
export const Complete: Story = {
  render: () => (
    <Card>
      <CardHeader title="カードタイトル" />
      <CardBody>
        <p>カードの内容がここに入ります。</p>
      </CardBody>
    </Card>
  ),
};
```

### モック データ

```typescript
// mocks/user.ts
export const mockUser = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  avatar: 'https://i.pravatar.cc/150?img=1',
};

// UserProfile.stories.tsx
import { mockUser } from '../mocks/user';

export const Default: Story = {
  args: {
    user: mockUser,
  },
};

export const Loading: Story = {
  args: {
    user: null,
    loading: true,
  },
};
```

---

## 関連記事

- [プログラミングスクール比較2026年版｜現役エンジニアが選ぶ厳選8校](/blog/2026-03-08-programming-school-comparison-2026)
- [エンジニア転職完全ガイド2026](/blog/2026-03-09-engineer-career-change-guide-2026)

## まとめ

Storybook 8 は、UIコンポーネント開発の効率を大幅に向上させるツールです。主な利点:

- **独立した開発環境**: アプリケーション全体を起動せずにコンポーネントを開発
- **ビジュアルテスト**: すべてのバリエーションを一目で確認
- **ドキュメント自動生成**: コードから Props ドキュメントを自動生成
- **テスト統合**: ストーリーをそのままテストとして活用
- **コラボレーション**: デザイナー、エンジニア、ステークホルダー間の連携を促進

React、Vue、Angular、Svelte、Web Components など、主要なフレームワークすべてに対応しているため、チームの開発フローに組み込みやすくなっています。ぜひプロジェクトに導入して、コンポーネント駆動開発を実践してみてください。

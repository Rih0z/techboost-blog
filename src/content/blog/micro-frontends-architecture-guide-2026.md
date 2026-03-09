---
title: 'マイクロフロントエンド実践ガイド2026｜Module Federation・Single-SPA・設計パターン'
description: 'マイクロフロントエンドの設計と実装を解説する2026年版ガイド。Module Federation・Single-SPA・Web Components方式の比較、チーム分割戦略、状態共有・ルーティング設計、独立デプロイのCI/CD構築までコード例付きで網羅。'
pubDate: '2026-03-05'
tags: ['マイクロフロントエンド', 'アーキテクチャ', 'React', 'TypeScript', 'Web開発']
heroImage: '../../assets/thumbnails/micro-frontends-architecture-guide-2026.jpg'
---

大規模Webアプリケーションの開発では、フロントエンドのコードベースが肥大化し、チーム間の依存関係がボトルネックになることが少なくない。マイクロフロントエンドは、バックエンドのマイクロサービスと同様に、フロントエンドを独立したユニットに分割するアーキテクチャパターンだ。本記事では、2026年時点の主要な実装方式を比較し、設計から運用まで実践的に解説する。

## マイクロフロントエンドとは

マイクロフロントエンドとは、1つの巨大なフロントエンドアプリケーションを、独立して開発・デプロイ可能な小さなアプリケーション群に分割するアーキテクチャのことだ。

### モノリスフロントエンドとの比較

| 観点 | モノリス | マイクロフロントエンド |
|------|---------|---------------------|
| デプロイ | 全体を一括デプロイ | 各チームが独立デプロイ |
| 技術スタック | 統一 | チームごとに選択可能 |
| チーム自律性 | 低い（調整コスト大） | 高い（独立して開発） |
| ビルド時間 | コード量に比例して増大 | 各ユニットは小さく高速 |
| 障害影響範囲 | 全体に波及 | 該当ユニットに限定 |
| 初期構築コスト | 低い | 高い |
| 運用複雑性 | 低い | 高い |

### いつ採用すべきか

マイクロフロントエンドが効果を発揮するのは、以下のような状況だ。

- 3チーム以上がフロントエンドに並行で機能開発している
- デプロイ頻度がチームごとに異なる
- 既存のモノリスに新技術を段階的に導入したい
- 各チームが独立したリリースサイクルを持ちたい

逆に、小規模チーム（1〜2チーム）やプロトタイプ段階では、モノリスの方が生産性が高い。

## 3つの実装方式比較

2026年現在、主要な実装方式は以下の3つだ。

### 方式比較表

| 特性 | Module Federation | Single-SPA | Web Components |
|------|------------------|------------|----------------|
| 粒度 | モジュール単位 | アプリケーション単位 | コンポーネント単位 |
| フレームワーク依存 | Webpack/Rspack/Vite | フレームワーク非依存 | ブラウザ標準API |
| 共有ライブラリ | ネイティブサポート | 手動管理 | Shadow DOMで分離 |
| 学習コスト | 中 | 高 | 低〜中 |
| ランタイムオーバーヘッド | 低 | 中 | 低 |
| エコシステム成熟度 | 高（2026年で最も普及） | 高 | 中 |
| TypeScriptサポート | 良好（型共有可能） | 良好 | 手動で型定義が必要 |

### 方式選定フローチャート

```
既存アプリにフレームワーク混在が必要？
  → Yes → Single-SPA
  → No → ビルドツールの統一が可能？
            → Yes → Module Federation（推奨）
            → No → Web Components
```

## Webpack Module Federation 2.0の実装

Module Federation 2.0は、Webpack 5のModule Federationを大幅に強化したバージョンだ。型の自動共有、ランタイムプラグインシステム、マニフェストプロトコルが追加されている。

### ホストアプリケーションの設定

```typescript
// host-app/webpack.config.ts
import { ModuleFederationPlugin } from '@module-federation/enhanced';

const config = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'host',
      remotes: {
        // ランタイムでリモートURLを解決
        product: 'product@http://localhost:3001/mf-manifest.json',
        cart: 'cart@http://localhost:3002/mf-manifest.json',
        checkout: 'checkout@http://localhost:3003/mf-manifest.json',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
        '@tanstack/react-query': { singleton: true },
      },
    }),
  ],
};

export default config;
```

### リモートアプリケーションの設定

```typescript
// product-app/webpack.config.ts
import { ModuleFederationPlugin } from '@module-federation/enhanced';

const config = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'product',
      filename: 'remoteEntry.js',
      exposes: {
        './ProductList': './src/components/ProductList',
        './ProductDetail': './src/components/ProductDetail',
        './useProduct': './src/hooks/useProduct',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
        '@tanstack/react-query': { singleton: true },
      },
    }),
  ],
};

export default config;
```

### リモートコンポーネントの読み込み

```tsx
// host-app/src/pages/ProductPage.tsx
import React, { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

const RemoteProductList = React.lazy(
  () => import('product/ProductList')
);

const RemoteCart = React.lazy(
  () => import('cart/CartSummary')
);

function ProductPage() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <main className="col-span-9">
        <ErrorBoundary fallback={<ProductListFallback />}>
          <Suspense fallback={<ProductListSkeleton />}>
            <RemoteProductList />
          </Suspense>
        </ErrorBoundary>
      </main>
      <aside className="col-span-3">
        <ErrorBoundary fallback={<CartFallback />}>
          <Suspense fallback={<CartSkeleton />}>
            <RemoteCart />
          </Suspense>
        </ErrorBoundary>
      </aside>
    </div>
  );
}

// リモートが読み込めない場合のフォールバック
function ProductListFallback() {
  return (
    <div className="p-4 bg-yellow-50 rounded">
      <p>商品一覧を読み込めません。再読み込みしてください。</p>
      <button onClick={() => window.location.reload()}>
        再読み込み
      </button>
    </div>
  );
}
```

### 型安全なリモートモジュール宣言

```typescript
// host-app/src/@types/remotes.d.ts

// Module Federation 2.0 では dts プラグインで自動生成も可能
declare module 'product/ProductList' {
  import type { FC } from 'react';
  interface ProductListProps {
    categoryId?: string;
    onProductClick?: (productId: string) => void;
  }
  const ProductList: FC<ProductListProps>;
  export default ProductList;
}

declare module 'product/useProduct' {
  interface Product {
    id: string;
    name: string;
    price: number;
    description: string;
  }
  function useProduct(id: string): {
    product: Product | null;
    isLoading: boolean;
    error: Error | null;
  };
  export { useProduct };
}

declare module 'cart/CartSummary' {
  import type { FC } from 'react';
  const CartSummary: FC;
  export default CartSummary;
}
```

## Rspack/Vite Module Federationの設定

2026年現在、Webpackに加えてRspackとViteでもModule Federationが利用できる。ビルド速度が重要なプロジェクトでは、これらの選択肢が有力だ。

### Rspack + Module Federation

RspackはRust製のWebpack互換バンドラで、Module Federationをネイティブサポートしている。

```typescript
// rspack.config.ts
import { defineConfig } from '@rspack/cli';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';

export default defineConfig({
  plugins: [
    new ModuleFederationPlugin({
      name: 'dashboard',
      filename: 'remoteEntry.js',
      exposes: {
        './Analytics': './src/components/Analytics',
        './RevenueChart': './src/components/RevenueChart',
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
      },
    }),
  ],
});
```

### Vite + Module Federation

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'settings',
      filename: 'remoteEntry.js',
      exposes: {
        './UserSettings': './src/components/UserSettings',
        './NotificationPrefs': './src/components/NotificationPrefs',
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
      },
    }),
  ],
});
```

### ビルドツール別比較

| 項目 | Webpack 5 | Rspack | Vite |
|------|-----------|--------|------|
| ビルド速度 | 基準 | 5〜10倍高速 | dev: 高速 / build: 同等 |
| HMR速度 | 普通 | 高速 | 非常に高速 |
| MF互換性 | 完全 | 完全（Webpack互換） | 良好（一部制約あり） |
| エコシステム | 最大 | Webpack互換 | 独自プラグイン |
| 設定互換性 | 基準 | ほぼ同一 | 異なる |

## Single-SPAによる実装

Single-SPAは、複数のフレームワーク（React、Vue、Angular等）を1つのページで共存させるためのフレームワークだ。既存のモノリスに段階的に新技術を導入する場合に特に有用である。

### ルートコンフィグ

```typescript
// root-config/src/index.ts
import {
  registerApplication,
  start,
  LifeCycles,
} from 'single-spa';

// ナビゲーションアプリ（常時表示）
registerApplication({
  name: '@myorg/navbar',
  app: () =>
    System.import<LifeCycles>('@myorg/navbar'),
  activeWhen: ['/'],
});

// 商品ページ（React）
registerApplication({
  name: '@myorg/products',
  app: () =>
    System.import<LifeCycles>('@myorg/products'),
  activeWhen: ['/products'],
  customProps: {
    apiBaseUrl: 'https://api.example.com',
  },
});

// 管理ページ（Vue）
registerApplication({
  name: '@myorg/admin',
  app: () =>
    System.import<LifeCycles>('@myorg/admin'),
  activeWhen: ['/admin'],
});

// アクティビティ関数でより複雑な条件も可能
registerApplication({
  name: '@myorg/checkout',
  app: () =>
    System.import<LifeCycles>('@myorg/checkout'),
  activeWhen: (location) => {
    return (
      location.pathname.startsWith('/checkout') &&
      isAuthenticated()
    );
  },
});

start({ urlRerouteOnly: true });
```

### Single-SPA Reactアプリケーション

```tsx
// products-app/src/root.component.tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductList } from './pages/ProductList';
import { ProductDetail } from './pages/ProductDetail';

const queryClient = new QueryClient();

interface CustomProps {
  apiBaseUrl: string;
}

export default function Root(props: CustomProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/products">
        <Routes>
          <Route index element={<ProductList />} />
          <Route
            path=":id"
            element={<ProductDetail apiBaseUrl={props.apiBaseUrl} />}
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

```typescript
// products-app/src/myorg-products.ts
import React from 'react';
import ReactDOMClient from 'react-dom/client';
import singleSpaReact from 'single-spa-react';
import Root from './root.component';

const lifecycles = singleSpaReact({
  React,
  ReactDOMClient,
  rootComponent: Root,
  errorBoundary() {
    return React.createElement(
      'div',
      { className: 'error-boundary' },
      '商品ページの読み込みに失敗しました'
    );
  },
});

export const { bootstrap, mount, unmount } = lifecycles;
```

## チーム分割とオーナーシップ

マイクロフロントエンドの成否は、技術以上にチーム設計に依存する。

### ドメイン境界によるチーム分割

```
┌─────────────────────────────────────────────┐
│                  Platform Team               │
│  (共有基盤・デザインシステム・CI/CD・監視)     │
└─────────────────────────────────────────────┘
        │            │            │
  ┌─────┴───┐  ┌─────┴───┐  ┌─────┴───┐
  │ Product  │  │  Cart   │  │Checkout │
  │  Team    │  │  Team   │  │  Team   │
  │          │  │         │  │         │
  │ 商品検索  │  │ カート   │  │ 決済    │
  │ 商品詳細  │  │ お気に入り│  │ 配送先  │
  │ レビュー  │  │ クーポン  │  │ 注文履歴│
  └─────────┘  └─────────┘  └─────────┘
```

### オーナーシップマトリクス

```typescript
// platform/src/config/ownership.ts
interface MicroFrontendConfig {
  name: string;
  team: string;
  repository: string;
  deployUrl: string;
  healthCheckUrl: string;
  onCallSlackChannel: string;
}

const microFrontends: MicroFrontendConfig[] = [
  {
    name: 'product',
    team: 'product-team',
    repository: 'github.com/myorg/mfe-product',
    deployUrl: 'https://product.mfe.example.com',
    healthCheckUrl: 'https://product.mfe.example.com/health',
    onCallSlackChannel: '#product-oncall',
  },
  {
    name: 'cart',
    team: 'cart-team',
    repository: 'github.com/myorg/mfe-cart',
    deployUrl: 'https://cart.mfe.example.com',
    healthCheckUrl: 'https://cart.mfe.example.com/health',
    onCallSlackChannel: '#cart-oncall',
  },
  {
    name: 'checkout',
    team: 'checkout-team',
    repository: 'github.com/myorg/mfe-checkout',
    deployUrl: 'https://checkout.mfe.example.com',
    healthCheckUrl: 'https://checkout.mfe.example.com/health',
    onCallSlackChannel: '#checkout-oncall',
  },
];
```

### チーム間の契約（コントラクト）

各マイクロフロントエンドが公開するインターフェースは、明示的な契約として管理する。

```typescript
// shared-contracts/src/product-contract.ts

/**
 * Product MFEが公開するイベント契約
 * このファイルを変更する際はproduct-teamとcart-teamの合意が必要
 */
export interface ProductSelectedEvent {
  type: 'product:selected';
  payload: {
    productId: string;
    name: string;
    price: number;
    currency: 'JPY' | 'USD';
  };
}

export interface CartUpdatedEvent {
  type: 'cart:updated';
  payload: {
    itemCount: number;
    totalPrice: number;
  };
}

export type MicroFrontendEvent =
  | ProductSelectedEvent
  | CartUpdatedEvent;
```

## 共有状態管理パターン

マイクロフロントエンド間で状態を共有する方法は複数ある。疎結合を保ちつつ、必要な情報を効率的に共有することが重要だ。

### パターン1: カスタムイベントバス

最もシンプルで疎結合な方式。

```typescript
// shared-lib/src/event-bus.ts
type EventHandler<T = unknown> = (payload: T) => void;

class MicroFrontendEventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  on<T>(eventType: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    const typedHandler = handler as EventHandler;
    this.handlers.get(eventType)!.add(typedHandler);

    // unsubscribe関数を返す
    return () => {
      this.handlers.get(eventType)?.delete(typedHandler);
    };
  }

  emit<T>(eventType: string, payload: T): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(payload);
        } catch (error) {
          console.error(
            `[EventBus] Error in handler for ${eventType}:`,
            error
          );
        }
      });
    }
  }

  // デバッグ用：登録されているイベントの一覧
  debug(): Record<string, number> {
    const result: Record<string, number> = {};
    this.handlers.forEach((handlers, type) => {
      result[type] = handlers.size;
    });
    return result;
  }
}

// グローバルシングルトン
const EVENT_BUS_KEY = '__MFE_EVENT_BUS__';

export function getEventBus(): MicroFrontendEventBus {
  if (!(window as any)[EVENT_BUS_KEY]) {
    (window as any)[EVENT_BUS_KEY] = new MicroFrontendEventBus();
  }
  return (window as any)[EVENT_BUS_KEY];
}
```

```tsx
// product-app/src/components/ProductCard.tsx
import { getEventBus } from '@myorg/shared-lib';
import type { ProductSelectedEvent } from '@myorg/contracts';

function ProductCard({ product }: { product: Product }) {
  const handleAddToCart = () => {
    getEventBus().emit<ProductSelectedEvent['payload']>(
      'product:selected',
      {
        productId: product.id,
        name: product.name,
        price: product.price,
        currency: 'JPY',
      }
    );
  };

  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <p>{product.price.toLocaleString()}円</p>
      <button onClick={handleAddToCart}>カートに追加</button>
    </div>
  );
}
```

### パターン2: 共有ストア（Zustand）

より強い状態共有が必要な場合は、軽量な共有ストアを使う。

```typescript
// shared-store/src/auth-store.ts
import { createStore, useStore } from 'zustand';

interface AuthState {
  user: { id: string; name: string; email: string } | null;
  isAuthenticated: boolean;
  login: (user: AuthState['user']) => void;
  logout: () => void;
}

const STORE_KEY = '__MFE_AUTH_STORE__';

function getOrCreateAuthStore() {
  if (!(window as any)[STORE_KEY]) {
    (window as any)[STORE_KEY] = createStore<AuthState>((set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }));
  }
  return (window as any)[STORE_KEY];
}

// 各MFEから利用するカスタムフック
export function useAuth() {
  const store = getOrCreateAuthStore();
  return useStore(store);
}
```

### パターン3: URL状態（検索・フィルタ等）

ブラウザのURLを状態管理に活用するパターン。ブックマーク可能で、MFE間の依存も生まれない。

```typescript
// shared-lib/src/url-state.ts
export function getUrlState<T extends Record<string, string>>(
  prefix: string
): Partial<T> {
  const params = new URLSearchParams(window.location.search);
  const state: Record<string, string> = {};

  params.forEach((value, key) => {
    if (key.startsWith(`${prefix}.`)) {
      const field = key.slice(prefix.length + 1);
      state[field] = value;
    }
  });

  return state as Partial<T>;
}

export function setUrlState(
  prefix: string,
  updates: Record<string, string | null>
): void {
  const params = new URLSearchParams(window.location.search);

  Object.entries(updates).forEach(([key, value]) => {
    const paramKey = `${prefix}.${key}`;
    if (value === null) {
      params.delete(paramKey);
    } else {
      params.set(paramKey, value);
    }
  });

  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, '', newUrl);
}
```

## ルーティング統合

マイクロフロントエンドでは、ホストアプリケーションが全体のルーティングを管理し、各MFEが自分の担当範囲のサブルーティングを処理する。

### ホストルーター

```tsx
// host-app/src/App.tsx
import React, { Suspense } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { AppShell } from './components/AppShell';

const RemoteProduct = React.lazy(
  () => import('product/App')
);
const RemoteCart = React.lazy(
  () => import('cart/App')
);
const RemoteCheckout = React.lazy(
  () => import('checkout/App')
);

function MFEErrorFallback({ error }: { error: Error }) {
  return (
    <div role="alert" className="p-8 text-center">
      <h2 className="text-xl font-bold mb-2">
        ページの読み込みに失敗しました
      </h2>
      <p className="text-gray-600 mb-4">{error.message}</p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        再読み込み
      </button>
    </div>
  );
}

function wrapMFE(Component: React.LazyExoticComponent<any>) {
  return (
    <ErrorBoundary FallbackComponent={MFEErrorFallback}>
      <Suspense fallback={<div className="animate-pulse h-96 bg-gray-100" />}>
        <Component />
      </Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/products" />} />
          <Route path="/products/*" element={wrapMFE(RemoteProduct)} />
          <Route path="/cart/*" element={wrapMFE(RemoteCart)} />
          <Route path="/checkout/*" element={wrapMFE(RemoteCheckout)} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
```

### リモート側のサブルーティング

```tsx
// product-app/src/App.tsx
import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { ProductList } from './pages/ProductList';
import { ProductDetail } from './pages/ProductDetail';
import { ProductReviews } from './pages/ProductReviews';

/**
 * リモートアプリケーションのルーター
 * ホストの BrowserRouter を共有するため、
 * 自前で BrowserRouter を作らない点に注意
 */
export default function App() {
  return (
    <Routes>
      <Route index element={<ProductList />} />
      <Route path=":productId" element={<ProductDetail />} />
      <Route path=":productId/reviews" element={<ProductReviews />} />
    </Routes>
  );
}
```

## 共有デザインシステム

マイクロフロントエンド間でUIの一貫性を保つには、共有デザインシステムが不可欠だ。

### デザイントークンの共有

```typescript
// design-system/src/tokens.ts
export const tokens = {
  color: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      900: '#1e3a5f',
    },
    semantic: {
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  fontSize: {
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    full: '9999px',
  },
} as const;
```

### 共有コンポーネントライブラリ

```tsx
// design-system/src/components/Button.tsx
import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
        danger: 'bg-red-600 text-white hover:bg-red-700',
        ghost: 'hover:bg-gray-100',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export function Button({
  variant,
  size,
  isLoading,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonVariants({ variant, size })}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Spinner className="mr-2" />}
      {children}
    </button>
  );
}
```

デザインシステムはnpmパッケージとして公開し、各MFEがバージョンを指定してインストールする。Module Federationの `shared` 設定で重複読み込みを防ぐ。

## CI/CDパイプライン

マイクロフロントエンドでは、各チームが独立してデプロイできるCI/CDパイプラインが必要だ。

### GitHub Actionsの設定例

```yaml
# .github/workflows/deploy-mfe.yml
name: Deploy Micro Frontend

on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'package.json'

env:
  MFE_NAME: product
  DEPLOY_BUCKET: s3://mfe-assets-prod

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm run test -- --coverage
      - run: npm run test:integration

  contract-test:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      # 公開インターフェースの破壊的変更を検知
      - run: npm run test:contract
      # 共有ライブラリとの互換性チェック
      - run: npm run test:compatibility

  build-and-deploy:
    runs-on: ubuntu-latest
    needs: contract-test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run build

      # バージョン付きパスにデプロイ（ロールバック可能）
      - name: Deploy to CDN
        run: |
          VERSION=$(git rev-parse --short HEAD)
          aws s3 sync dist/ $DEPLOY_BUCKET/$MFE_NAME/$VERSION/
          aws s3 sync dist/ $DEPLOY_BUCKET/$MFE_NAME/latest/

      # マニフェストの更新（ホストが参照するURL）
      - name: Update manifest
        run: |
          VERSION=$(git rev-parse --short HEAD)
          echo "{\"url\": \"https://cdn.example.com/$MFE_NAME/$VERSION/remoteEntry.js\", \"version\": \"$VERSION\", \"deployedAt\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
            > manifest.json
          aws s3 cp manifest.json $DEPLOY_BUCKET/$MFE_NAME/manifest.json

      # Smoke Test
      - name: Smoke test
        run: |
          curl -f https://cdn.example.com/$MFE_NAME/latest/remoteEntry.js
```

### ロールバック戦略

```typescript
// platform/src/config/mfe-registry.ts

interface MFEVersion {
  url: string;
  version: string;
  deployedAt: string;
}

/**
 * ランタイムでリモートURLを切り替えるレジストリ
 * 障害時は管理画面からバージョンを切り戻し可能
 */
async function resolveMFEUrl(mfeName: string): Promise<string> {
  // 管理画面で固定バージョンが指定されている場合はそちらを使用
  const override = await fetchVersionOverride(mfeName);
  if (override) {
    return override.url;
  }

  // 通常はlatestを使用
  const manifest = await fetch(
    `https://cdn.example.com/${mfeName}/manifest.json`
  );
  const { url } = (await manifest.json()) as MFEVersion;
  return url;
}
```

## パフォーマンス最適化

マイクロフロントエンドは、不適切に構成すると、バンドルサイズの増大やリクエスト数の増加でパフォーマンスが劣化する。以下の最適化を必ず実施すること。

### 共有ライブラリの重複排除

```typescript
// webpack.config.ts（各MFE共通）
const config = {
  plugins: [
    new ModuleFederationPlugin({
      shared: {
        // singletonで重複読み込みを防止
        react: {
          singleton: true,
          requiredVersion: '^19.0.0',
          eager: false, // 遅延読み込み（ホストが先にロード）
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^19.0.0',
          eager: false,
        },
        // 大きなライブラリも共有
        '@tanstack/react-query': { singleton: true },
        'date-fns': { singleton: true },
        // デザインシステム
        '@myorg/design-system': {
          singleton: true,
          requiredVersion: '^2.0.0',
        },
      },
    }),
  ],
};
```

### プリフェッチによるUX改善

```typescript
// host-app/src/utils/prefetch.ts

/**
 * ユーザーの行動予測に基づいてリモートモジュールをプリフェッチ
 */
export function setupPrefetch(): void {
  // ナビゲーションリンクへのhover時にプリフェッチ
  document.addEventListener('mouseover', (event) => {
    const link = (event.target as HTMLElement).closest('a[data-mfe]');
    if (!link) return;

    const mfeName = link.getAttribute('data-mfe');
    if (mfeName) {
      prefetchMFE(mfeName);
    }
  });

  // Intersection Observerでビューポート近くのMFEをプリフェッチ
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const mfeName = (entry.target as HTMLElement).dataset.mfe;
          if (mfeName) {
            prefetchMFE(mfeName);
            observer.unobserve(entry.target);
          }
        }
      });
    },
    { rootMargin: '200px' }
  );

  document
    .querySelectorAll('[data-mfe-prefetch]')
    .forEach((el) => observer.observe(el));
}

const prefetchedModules = new Set<string>();

async function prefetchMFE(name: string): Promise<void> {
  if (prefetchedModules.has(name)) return;
  prefetchedModules.add(name);

  try {
    // remoteEntryをプリフェッチ（実行はしない）
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = `https://cdn.example.com/${name}/latest/remoteEntry.js`;
    document.head.appendChild(link);
  } catch {
    // プリフェッチの失敗は無視
  }
}
```

### パフォーマンスモニタリング

```typescript
// shared-lib/src/performance.ts
export function measureMFELoadTime(mfeName: string): void {
  const startMark = `mfe-${mfeName}-start`;
  const endMark = `mfe-${mfeName}-end`;
  const measureName = `mfe-${mfeName}-load`;

  performance.mark(startMark);

  return {
    complete() {
      performance.mark(endMark);
      const measure = performance.measure(
        measureName,
        startMark,
        endMark
      );

      // 監視サービスに送信
      if (measure.duration > 3000) {
        console.warn(
          `[Performance] ${mfeName} の読み込みに ${measure.duration}ms かかりました`
        );
      }

      // Web Vitals的な閾値
      reportMetric({
        name: 'mfe_load_time',
        value: measure.duration,
        labels: { mfe: mfeName },
      });
    },
  };
}
```

## まとめ

マイクロフロントエンドは、大規模な組織でフロントエンド開発をスケールさせるための強力なアーキテクチャだ。しかし、すべてのプロジェクトに適しているわけではない。

### 向き・不向き判定表

| 条件 | 向いている | 向いていない |
|------|-----------|-------------|
| チーム規模 | 3チーム以上 | 1〜2チーム |
| アプリ規模 | 大規模（10画面以上） | 小〜中規模 |
| リリース頻度 | チームごとに異なる | 全体で統一 |
| 技術スタック | 混在の必要あり | 統一可能 |
| 開発フェーズ | 成長期・成熟期 | 立ち上げ期 |
| 組織構造 | 独立したプロダクトチーム | 機能横断チーム |
| 既存資産 | レガシー段階移行 | グリーンフィールド |

### 方式選定の最終判断

- **Module Federation（推奨）**: ビルドツールを統一でき、パフォーマンスと開発体験のバランスが最も良い。2026年時点でのデファクトスタンダード
- **Single-SPA**: 異なるフレームワークの共存が必要な場合。レガシーからの段階移行に最適
- **Web Components**: フレームワーク非依存を最優先にする場合。Shadow DOMによる完全なスタイル分離が必要な場面

### 導入チェックリスト

```
[ ] ドメイン境界の定義とチーム割り当て
[ ] 共有ライブラリ/デザインシステムの策定
[ ] チーム間の契約（インターフェース）定義
[ ] CI/CDパイプラインの構築
[ ] ロールバック手順の確立
[ ] パフォーマンスバジェットの設定
[ ] モニタリング・アラートの設定
[ ] 障害時のフォールバック戦略
[ ] ローカル開発環境の整備
[ ] 共有依存のバージョン管理ポリシー
```

マイクロフロントエンドの導入は、技術的な判断だけでなく組織設計の問題でもある。アーキテクチャを選定する前に、チームの自律性とシステムの一貫性のバランスをよく検討しよう。

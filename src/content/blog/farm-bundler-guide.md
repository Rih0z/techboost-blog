---
title: 'Farm完全ガイド - Rust製超高速バンドラーで開発体験を革新する'
description: 'Rust製の超高速バンドラーFarmを徹底解説。Vite互換のAPI、強力なプラグインシステム、爆速HMR、Next.jsライクな機能まで完全網羅。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。'
pubDate: '2026-02-05'
tags: ['Farm', 'Rust', 'バンドラー', 'プログラミング']
heroImage: '../../assets/thumbnails/farm-bundler-guide.jpg'
---

Farmは、Rustで書かれた超高速Webビルドツールです。Viteの10倍以上の速度を誇り、Vite互換のAPIを提供しながら、独自の強力な機能を備えています。この記事では、Farmの特徴、セットアップ、実践的な使い方を徹底的に解説します。

## Farmとは

Farmは、Viteの速度とDXを超えることを目指して開発されたRust製のビルドツールです。

### 主な特徴

- **圧倒的な速度** - Viteの10倍以上のビルド速度
- **Vite互換** - Viteプラグインがそのまま使える
- **ゼロ設定** - すぐに使い始められる
- **高速HMR** - ミリ秒単位の高速ホットリロード
- **強力なプラグイン** - Rustプラグインで拡張可能

### パフォーマンス比較

```
ビルド時間（1000モジュールのプロジェクト）:
Webpack: 12.3s
Vite: 2.1s
Farm: 0.18s (Viteの約12倍高速)

HMR速度:
Vite: 50-100ms
Farm: 5-15ms (約10倍高速)
```

## クイックスタート

### インストール

```bash
# npm
npm create farm@latest

# yarn
yarn create farm

# pnpm
pnpm create farm
```

### プロジェクト作成

```bash
npm create farm@latest my-app
cd my-app
npm install
npm start
```

### テンプレート選択

```
? Select a template:
  ❯ react
    react-ts
    vue
    vue-ts
    solid
    solid-ts
    vanilla
    vanilla-ts
```

## 基本設定

### farm.config.ts

```typescript
import { defineConfig } from '@farmfe/core';

export default defineConfig({
  // コンパイル設定
  compilation: {
    input: {
      index: './index.html',
    },
    output: {
      path: './dist',
      publicPath: '/',
    },
    // Vite互換の設定
    resolve: {
      alias: {
        '@': './src',
        '@components': './src/components',
        '@utils': './src/utils',
      },
    },
    // モジュール設定
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          loader: '@farmfe/plugin-react',
        },
      ],
    },
  },
  // 開発サーバー設定
  server: {
    port: 3000,
    open: true,
    hmr: true,
  },
  // プラグイン
  plugins: [],
});
```

### TypeScript設定

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@utils/*": ["./src/utils/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## Reactプロジェクトの構築

### React + TypeScript セットアップ

```typescript
// farm.config.ts
import { defineConfig } from '@farmfe/core';

export default defineConfig({
  compilation: {
    input: {
      index: './index.html',
    },
    resolve: {
      alias: {
        '@': './src',
      },
    },
  },
  plugins: [
    '@farmfe/plugin-react',
    '@farmfe/plugin-sass',
  ],
});
```

### プロジェクト構造

```
my-app/
├── src/
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.module.scss
│   │   │   └── index.ts
│   │   └── Header/
│   │       ├── Header.tsx
│   │       └── index.ts
│   ├── pages/
│   │   ├── Home.tsx
│   │   └── About.tsx
│   ├── hooks/
│   │   └── useCounter.ts
│   ├── utils/
│   │   └── helpers.ts
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── farm.config.ts
└── package.json
```

### サンプルコンポーネント

```tsx
// src/components/Button/Button.tsx
import { FC, ReactNode } from 'react';
import styles from './Button.module.scss';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
  disabled?: boolean;
}

export const Button: FC<ButtonProps> = ({
  children,
  variant = 'primary',
  onClick,
  disabled = false,
}) => {
  return (
    <button
      className={`${styles.button} ${styles[variant]}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
```

```scss
// src/components/Button/Button.module.scss
.button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.primary {
    background-color: #3b82f6;
    color: white;

    &:hover:not(:disabled) {
      background-color: #2563eb;
    }
  }

  &.secondary {
    background-color: #6b7280;
    color: white;

    &:hover:not(:disabled) {
      background-color: #4b5563;
    }
  }
}
```

## プラグインシステム

### 公式プラグイン

```typescript
// farm.config.ts
import { defineConfig } from '@farmfe/core';

export default defineConfig({
  plugins: [
    // React サポート
    '@farmfe/plugin-react',

    // Vue サポート
    '@farmfe/plugin-vue',

    // Solid サポート
    '@farmfe/plugin-solid',

    // CSS プリプロセッサ
    '@farmfe/plugin-sass',
    '@farmfe/plugin-less',

    // 画像最適化
    '@farmfe/plugin-image',

    // SVGスプライト
    '@farmfe/plugin-svg',
  ],
});
```

### Viteプラグインの使用

```typescript
import { defineConfig } from '@farmfe/core';
import viteReact from '@vitejs/plugin-react';
import viteSvgr from 'vite-plugin-svgr';

export default defineConfig({
  vitePlugins: [
    viteReact(),
    viteSvgr(),
  ],
});
```

### カスタムプラグインの作成

```typescript
// plugins/custom-plugin.ts
import { FarmPlugin } from '@farmfe/core';

export function customPlugin(): FarmPlugin {
  return {
    name: 'custom-plugin',

    // ビルド開始時
    buildStart() {
      console.log('Build started!');
    },

    // モジュール解決
    resolve(source, importer) {
      if (source.startsWith('virtual:')) {
        return {
          id: source,
          external: false,
        };
      }
    },

    // モジュールロード
    load(id) {
      if (id === 'virtual:config') {
        return {
          code: 'export default { version: "1.0.0" }',
          moduleType: 'js',
        };
      }
    },

    // コード変換
    transform(code, id) {
      if (id.endsWith('.custom')) {
        return {
          code: transformCustomFile(code),
          sourceMap: null,
        };
      }
    },

    // ビルド完了時
    buildEnd() {
      console.log('Build finished!');
    },
  };
}

function transformCustomFile(code: string): string {
  // カスタム変換ロジック
  return code.replace(/CUSTOM_TOKEN/g, 'PROCESSED');
}
```

```typescript
// farm.config.ts で使用
import { defineConfig } from '@farmfe/core';
import { customPlugin } from './plugins/custom-plugin';

export default defineConfig({
  plugins: [
    customPlugin(),
  ],
});
```

## HMR（ホットモジュールリプレースメント）

### HMRの設定

```typescript
// farm.config.ts
export default defineConfig({
  server: {
    hmr: {
      // HMRポート
      port: 3001,
      // HMRホスト
      host: 'localhost',
      // オーバーレイ表示
      overlay: true,
    },
  },
});
```

### HMR APIの使用

```typescript
// src/main.tsx
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(<App />);

// HMR対応
if (import.meta.hot) {
  import.meta.hot.accept('./App', (newApp) => {
    root.render(<newApp.default />);
  });

  // データの保持
  import.meta.hot.dispose((data) => {
    data.count = currentCount;
  });

  import.meta.hot.accept((data) => {
    if (data && data.count) {
      restoreCount(data.count);
    }
  });
}
```

### カスタムHMRハンドラ

```typescript
// src/components/Counter.tsx
import { useState, useEffect } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (import.meta.hot) {
      // HMR時に状態を保持
      const data = import.meta.hot.data || {};
      if (data.count !== undefined) {
        setCount(data.count);
      }

      import.meta.hot.dispose((data) => {
        data.count = count;
      });
    }
  }, [count]);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  );
}

export default Counter;
```

## 環境変数

### .env ファイル

```bash
# .env
FARM_PUBLIC_API_URL=https://api.example.com
FARM_PUBLIC_APP_NAME=MyApp

# .env.development
FARM_PUBLIC_API_URL=http://localhost:3000
FARM_PUBLIC_DEBUG=true

# .env.production
FARM_PUBLIC_API_URL=https://production-api.example.com
FARM_PUBLIC_DEBUG=false
```

### 環境変数の使用

```typescript
// src/config.ts
export const config = {
  apiUrl: import.meta.env.FARM_PUBLIC_API_URL,
  appName: import.meta.env.FARM_PUBLIC_APP_NAME,
  isDev: import.meta.env.MODE === 'development',
  isProd: import.meta.env.MODE === 'production',
};

// 型定義
interface ImportMetaEnv {
  readonly FARM_PUBLIC_API_URL: string;
  readonly FARM_PUBLIC_APP_NAME: string;
  readonly FARM_PUBLIC_DEBUG: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

```typescript
// farm.config.ts で定義
export default defineConfig({
  compilation: {
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
  },
});
```

## 最適化設定

### コード分割

```typescript
// farm.config.ts
export default defineConfig({
  compilation: {
    output: {
      targetEnv: 'browser',
    },
    partialBundling: {
      enforceResources: [
        {
          name: 'vendor',
          test: /node_modules/,
        },
        {
          name: 'common',
          test: /src\/components/,
        },
      ],
    },
  },
});
```

### 動的インポート

```typescript
// src/App.tsx
import { lazy, Suspense } from 'react';

// 遅延ロード
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

### Tree Shaking

```typescript
// farm.config.ts
export default defineConfig({
  compilation: {
    treeShaking: true,
    minify: {
      compress: true,
      mangle: true,
    },
  },
});
```

## CSS処理

### CSS Modules

```typescript
// Button.tsx
import styles from './Button.module.css';

export function Button({ children }) {
  return <button className={styles.button}>{children}</button>;
}
```

```css
/* Button.module.css */
.button {
  composes: base from './common.module.css';
  background-color: blue;
  color: white;
  padding: 10px 20px;
}

.button:hover {
  background-color: darkblue;
}
```

### SCSS/SASS

```typescript
// farm.config.ts
export default defineConfig({
  plugins: ['@farmfe/plugin-sass'],
  compilation: {
    css: {
      modules: {
        generateScopedName: '[name]__[local]___[hash:base64:5]',
      },
      preprocessor: {
        additionalData: `
          @import "@/styles/variables.scss";
          @import "@/styles/mixins.scss";
        `,
      },
    },
  },
});
```

```scss
// src/styles/variables.scss
$primary-color: #3b82f6;
$secondary-color: #6b7280;
$border-radius: 0.375rem;

// src/styles/mixins.scss
@mixin button-base {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: $border-radius;
  cursor: pointer;
  transition: all 0.2s;
}
```

### PostCSS

```typescript
// farm.config.ts
export default defineConfig({
  compilation: {
    css: {
      postcss: {
        plugins: [
          'autoprefixer',
          'postcss-preset-env',
          'cssnano',
        ],
      },
    },
  },
});
```

## アセット処理

### 画像の最適化

```typescript
// farm.config.ts
export default defineConfig({
  plugins: [
    [
      '@farmfe/plugin-image',
      {
        // WebP変換
        webp: {
          quality: 80,
        },
        // AVIF変換
        avif: {
          quality: 70,
        },
        // 画像圧縮
        compress: {
          quality: 85,
        },
      },
    ],
  ],
});
```

### 画像の使用

```typescript
// src/components/Hero.tsx
import heroImage from '@/assets/hero.jpg';
import heroWebp from '@/assets/hero.webp';

export function Hero() {
  return (
    <picture>
      <source srcSet={heroWebp} type="image/webp" />
      <img src={heroImage} alt="Hero" />
    </picture>
  );
}
```

### SVGの扱い

```typescript
// farm.config.ts
export default defineConfig({
  plugins: [
    [
      '@farmfe/plugin-svg',
      {
        svgo: true,
        svgoConfig: {
          plugins: [
            { name: 'removeViewBox', active: false },
            { name: 'removeDimensions', active: true },
          ],
        },
      },
    ],
  ],
});
```

```typescript
// SVGをReactコンポーネントとして使用
import { ReactComponent as Logo } from '@/assets/logo.svg';

export function Header() {
  return (
    <header>
      <Logo width={120} height={40} />
    </header>
  );
}
```

## ビルド最適化

### プロダクションビルド

```typescript
// farm.config.ts
export default defineConfig({
  compilation: {
    output: {
      path: './dist',
      publicPath: '/',
      filename: '[name].[hash].js',
      assetFilename: 'assets/[name].[hash][ext]',
    },
    minify: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      mangle: true,
      format: {
        comments: false,
      },
    },
    sourcemap: false,
  },
});
```

### バンドル分析

```typescript
import { defineConfig } from '@farmfe/core';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  vitePlugins: [
    visualizer({
      filename: './dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
});
```

### 圧縮設定

```typescript
// farm.config.ts
export default defineConfig({
  compilation: {
    output: {
      targetEnv: 'browser-es2017',
    },
    minify: {
      compress: {
        passes: 2,
        pure_getters: true,
        unsafe_comps: true,
        unsafe_math: true,
      },
    },
  },
  server: {
    compression: true,
  },
});
```

## パフォーマンス計測

### ビルド時間の計測

```typescript
// plugins/perf-plugin.ts
export function perfPlugin() {
  let startTime: number;

  return {
    name: 'perf-plugin',

    buildStart() {
      startTime = Date.now();
      console.log('🚀 Build started...');
    },

    buildEnd() {
      const duration = Date.now() - startTime;
      console.log(`✅ Build completed in ${duration}ms`);
    },
  };
}
```

### HMR速度の計測

```typescript
// src/main.tsx
if (import.meta.hot) {
  let updateStart: number;

  import.meta.hot.on('vite:beforeUpdate', () => {
    updateStart = Date.now();
  });

  import.meta.hot.on('vite:afterUpdate', () => {
    const duration = Date.now() - updateStart;
    console.log(`⚡ HMR updated in ${duration}ms`);
  });
}
```

## まとめ

Farmは、Rustの性能を活かした次世代のビルドツールです。

### 主な利点

1. **圧倒的な速度** - Viteの10倍以上
2. **Vite互換** - 既存のプラグインが使える
3. **ゼロ設定** - すぐに使い始められる
4. **強力な最適化** - 自動的にバンドル最適化

### 推奨する使用ケース

- 大規模なReact/Vueプロジェクト
- ビルド時間を短縮したい既存プロジェクト
- モノレポ構成のプロジェクト
- HMRの速度を最大化したい開発

Farmを活用して、爆速の開発体験を実現しましょう。

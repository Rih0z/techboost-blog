---
title: 'Qwik完全ガイド：即時読み込みを実現する次世代Webフレームワーク'
description: 'Qwikの革新的なResumeabilityと遅延実行を徹底解説。コンポーネント・QwikCity・ローダー・アクション・サーバーサイドレンダリング・パフォーマンス最適化まで実践的に学ぶ'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-3.jpg'
---

## Qwikとは何か：Webパフォーマンスの再定義

Webアプリケーションの世界では、長年にわたってひとつの根本的な問題が解決されないまま残っていた。それは「ハイドレーション（Hydration）」と呼ばれるプロセスのコストである。

ReactやVue、Angularといった現代的なフレームワークは、サーバーでHTMLをレンダリングしてクライアントに送り、その後クライアント側でJavaScriptを実行してそのHTMLをインタラクティブにする。この「再活性化」のプロセスがハイドレーションだ。問題は、ページが大きくなればなるほど、このハイドレーションに必要なJavaScriptの量が増え、ユーザーがページを操作できるまでの時間（TTI: Time to Interactive）が長くなることである。

Qwikはこの問題に対して、根本的に異なるアプローチを取る。その名も「Resumability（再開可能性）」だ。

### Resumabilityとは何か

従来のSSRフレームワークでは、サーバーがHTMLを生成し、クライアントがそのHTMLを受け取った後に、同じコンポーネントツリー全体を再構築する。これは、サーバーで行った作業を、クライアントで丸ごとやり直しているようなものだ。

Qwikのアプローチは根本的に異なる。サーバーはHTMLをレンダリングするだけでなく、アプリケーションの状態（ステート）と、それに対応するイベントハンドラーへの参照をシリアライズしてHTMLに埋め込む。クライアントはこの情報を使って、サーバーが中断した地点から作業を「再開」する。

これにより、クライアントは以下のことを達成できる。

- ページ読み込み時にJavaScriptを実行しない
- ユーザーが実際にインタラクションを起こした時にのみ、必要最小限のJavaScriptをダウンロードして実行する
- コンポーネントツリー全体を再構築する必要がない

### O(1)読み込み時間の意味

Qwikが掲げるスローガンのひとつが「O(1)読み込み」である。これはどういう意味か。

従来のフレームワークでは、アプリケーションの複雑さに比例してハイドレーションコストが増大する。コンポーネントが100個あれば100個分の初期化処理が必要であり、コンポーネントが1000個になれば1000個分の処理が必要になる。つまり、読み込みコストはアプリケーションの規模に対してO(n)のスケールを持つ。

Qwikでは、初期ページ読み込み時にJavaScriptをほとんど実行しない。ユーザーがボタンをクリックすれば、そのボタンに紐付いたハンドラーだけをダウンロードして実行する。コンポーネントの総数に関わらず、初期読み込みコストは一定に保たれる。これがO(1)読み込みの意味だ。

### Qwikの誕生背景

QwikはMisco Hevery（Google時代にAngularJSを生み出した人物）によって設計された。彼はAngularの限界とReactのハイドレーション問題を深く理解した上で、まったく新しいアーキテクチャを構築した。

2021年にBuilder.ioのプロジェクトとして公開されたQwikは、2023年にv1.0に達し、現在は安定した本番環境での使用が可能なフレームワークとして成熟している。

---

## Next.js / Remix / SvelteKitとの比較

Qwikを他のモダンフレームワークと比較することで、その特性がより明確になる。

### パフォーマンス特性の比較

#### Next.js（App Router）

Next.jsはReactベースのフルスタックフレームワークで、Server Components、ストリーミング、インクリメンタル静的再生成など多くの機能を持つ。

- **初期読み込み**: Server Componentsで改善されたが、クライアントコンポーネントはハイドレーションが必要
- **バンドルサイズ**: Reactランタイム込みで最低でも数十KB
- **学習コスト**: Reactの知識がそのまま活かせる
- **エコシステム**: 非常に豊富

#### Remix

RemixはWeb標準（Web Fetch API、Web Forms）を重視したフルスタックフレームワーク。

- **初期読み込み**: 全クライアントコンポーネントがハイドレーションを要求
- **データフェッチ**: ローダーとアクションによる明確な分離
- **Progressive Enhancement**: フォーム送信がJavaScriptなしでも動作
- **ネスティング**: ネストされたルートによる並列データフェッチが強み

#### SvelteKit

Svelteのコンパイラベースのアプローチにより、Reactより軽量なランタイムを実現。

- **初期読み込み**: コンパイル時最適化で軽量だが、ハイドレーション自体は必要
- **バンドルサイズ**: Reactより小さいが、ゼロではない
- **学習コスト**: Svelteの独自テンプレート構文を学ぶ必要がある

#### Qwik（QwikCity）

- **初期読み込み**: JavaScriptほぼゼロ。必要な時に必要な分だけロード
- **バンドルサイズ**: 初期ロードは極めて小さい
- **学習コスト**: Reactに似た構文だが、`$` サフィックスなど独自の概念がある
- **成熟度**: Next.jsやSvelteKitに比べるとエコシステムはまだ発展途上

### 比較まとめ表

| 特性 | Next.js | Remix | SvelteKit | Qwik |
|------|---------|-------|-----------|------|
| ハイドレーション | 部分的（RSC） | 全体 | 全体 | なし |
| 初期JS量 | 中〜大 | 中〜大 | 小〜中 | 極小 |
| Reactとの互換性 | 完全 | 完全 | なし | 部分的（qwik-react） |
| ファイルベースルーティング | あり | あり | あり | あり |
| エッジ対応 | あり | あり | あり | あり |
| TypeScript | 標準 | 標準 | 標準 | 標準 |

---

## セットアップとプロジェクト作成

### 必要な環境

Qwikを始めるには以下の環境が必要だ。

- Node.js 16.8以上（推奨は18以上）
- npm、yarn、またはpnpm

### 新規プロジェクトの作成

```bash
npm create qwik@latest
```

このコマンドを実行すると、対話形式でプロジェクトを設定できる。

```
Where would you like to create your new project?
> my-qwik-app

Select a starter:
> Empty App
  Qwik City (Recommended)
  Library

Would you like to install npm dependencies?
> Yes

Initialize a new git repository?
> Yes
```

`Qwik City`を選択すると、フルスタックのWebアプリケーションテンプレートが生成される。

### プロジェクト構造

生成されたプロジェクトの構造は以下のようになる。

```
my-qwik-app/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   └── router-head/
│   │       └── router-head.tsx
│   ├── routes/
│   │   ├── index.tsx          # ルートページ
│   │   ├── layout.tsx         # ルートレイアウト
│   │   └── service-worker.ts
│   └── entry.ssr.tsx
├── adaptors/
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### 開発サーバーの起動

```bash
cd my-qwik-app
npm run dev
```

デフォルトでは `http://localhost:5173` で開発サーバーが起動する。

### Vite設定

QwikはビルドツールとしてViteを使用する。`vite.config.ts` の基本設定を確認しよう。

```typescript
import { defineConfig } from 'vite';
import { qwikVite } from '@builder.io/qwik/optimizer';
import { qwikCity } from '@builder.io/qwik-city/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(() => {
  return {
    plugins: [
      qwikCity(),
      qwikVite(),
      tsconfigPaths(),
    ],
    preview: {
      headers: {
        'Cache-Control': 'public, max-age=600',
      },
    },
  };
});
```

`qwikVite()` プラグインがQwikのコンパイラを有効化し、`$` サフィックスを持つ関数を適切に変換する。

---

## コンポーネント：component$ の世界

Qwikのコンポーネントは、ReactのコンポーネントとよくSimilarだが、重要な違いがある。最も目を引くのは `component$` 関数と `$` サフィックスだ。

### 基本的なコンポーネント

```typescript
import { component$, useSignal } from '@builder.io/qwik';

export const HelloWorld = component$(() => {
  return (
    <div>
      <h1>こんにちは、Qwik!</h1>
      <p>これは最初のQwikコンポーネントです。</p>
    </div>
  );
});
```

### $ サフィックスが意味するもの

`$` はQwikのオプティマイザーに対するシグナルだ。`$` が付いた関数は「遅延ロード境界（lazy loading boundary）」として扱われる。これはどういう意味か。

Qwikのオプティマイザーは、ビルド時にコードを解析し、`$` で終わる関数呼び出しに渡されたコールバックを、別々のチャンクに分割する。これにより、そのコードは必要になるまでダウンロードされない。

```typescript
import { component$, useSignal } from '@builder.io/qwik';

export const Counter = component$(() => {
  const count = useSignal(0);

  return (
    <div>
      <p>カウント: {count.value}</p>
      {/* このクリックハンドラーは、実際にクリックされるまでダウンロードされない */}
      <button onClick$={() => count.value++}>
        インクリメント
      </button>
    </div>
  );
});
```

上記の例で、`onClick$` に渡された `() => count.value++` は、ユーザーがボタンをクリックするまでブラウザにダウンロードされない。これがQwikのマジックだ。

### コンポーネントのライフサイクル

Qwikのライフサイクルフックは、Reactとは異なる。

```typescript
import {
  component$,
  useSignal,
  useVisibleTask$,
  useTask$,
  useOnDocument,
  $,
} from '@builder.io/qwik';

export const LifecycleDemo = component$(() => {
  const isVisible = useSignal(false);
  const scrollY = useSignal(0);

  // サーバーサイドとクライアントサイドの両方で実行
  // 依存関係が変化するたびに再実行
  useTask$(({ track }) => {
    track(() => isVisible.value);
    console.log('isVisible が変化しました:', isVisible.value);
  });

  // クライアントサイドのみで実行（Reactのuseeffectに相当）
  // コンポーネントがビューポートに入った時に実行
  useVisibleTask$(() => {
    console.log('コンポーネントが表示されました');
    isVisible.value = true;

    // クリーンアップ関数を返せる
    return () => {
      console.log('コンポーネントが破棄されました');
    };
  });

  // ドキュメントレベルのイベントを購読
  useOnDocument(
    'scroll',
    $(() => {
      scrollY.value = window.scrollY;
    })
  );

  return (
    <div>
      <p>表示状態: {isVisible.value ? '表示中' : '非表示'}</p>
      <p>スクロール位置: {scrollY.value}px</p>
    </div>
  );
});
```

### Props の扱い

```typescript
import { component$, PropFunction } from '@builder.io/qwik';

// Props の型定義
interface ButtonProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  onClick$?: PropFunction<() => void>;
}

export const Button = component$<ButtonProps>(({
  label,
  variant = 'primary',
  disabled = false,
  onClick$,
}) => {
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
  }[variant];

  return (
    <button
      class={`btn ${variantClass}`}
      disabled={disabled}
      onClick$={onClick$}
    >
      {label}
    </button>
  );
});

// 使用例
export const ButtonDemo = component$(() => {
  return (
    <div>
      <Button
        label="送信"
        variant="primary"
        onClick$={() => {
          console.log('ボタンがクリックされました');
        }}
      />
      <Button
        label="キャンセル"
        variant="secondary"
      />
    </div>
  );
});
```

`PropFunction<() => void>` は、`$` 境界を越えるコールバック（親から子へ渡されるイベントハンドラー）の型として使用する。これは非常に重要なQwik特有のパターンだ。

### スロット（Slot）

Reactの `children` に相当するのが、Qwikの `Slot` だ。

```typescript
import { component$, Slot } from '@builder.io/qwik';

export const Card = component$(() => {
  return (
    <div class="card">
      <div class="card-header">
        <Slot name="header" />
      </div>
      <div class="card-body">
        <Slot /> {/* デフォルトスロット */}
      </div>
      <div class="card-footer">
        <Slot name="footer" />
      </div>
    </div>
  );
});

// 使用例
export const CardDemo = component$(() => {
  return (
    <Card>
      <span q:slot="header">カードのタイトル</span>
      <p>カードの本文コンテンツがここに入ります。</p>
      <span q:slot="footer">フッターテキスト</span>
    </Card>
  );
});
```

---

## シグナルとリアクティビティ

Qwikのリアクティビティシステムは、シグナルを中心に構築されている。シグナルは細粒度のリアクティビティを実現し、状態が変化した時に再レンダリングが必要なコンポーネントだけを更新する。

### useSignal

`useSignal` はプリミティブな値（数値、文字列、真偽値など）の状態管理に使用する。

```typescript
import { component$, useSignal } from '@builder.io/qwik';

export const SignalDemo = component$(() => {
  const name = useSignal('世界');
  const count = useSignal(0);
  const isActive = useSignal(false);

  return (
    <div>
      <input
        type="text"
        value={name.value}
        onInput$={(event) => {
          name.value = (event.target as HTMLInputElement).value;
        }}
      />
      <p>こんにちは、{name.value}!</p>

      <button onClick$={() => count.value++}>
        クリック数: {count.value}
      </button>

      <button onClick$={() => isActive.value = !isActive.value}>
        {isActive.value ? 'アクティブ' : '非アクティブ'}
      </button>
    </div>
  );
});
```

### useStore

`useStore` はオブジェクトや配列の状態管理に使用する。深いリアクティビティが必要な場合に適している。

```typescript
import { component$, useStore } from '@builder.io/qwik';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

interface TodoStore {
  items: Todo[];
  filter: 'all' | 'active' | 'completed';
  nextId: number;
}

export const TodoApp = component$(() => {
  const store = useStore<TodoStore>({
    items: [],
    filter: 'all',
    nextId: 1,
  });

  const newTodoText = useSignal('');

  const addTodo = $(() => {
    if (newTodoText.value.trim()) {
      store.items.push({
        id: store.nextId++,
        text: newTodoText.value.trim(),
        completed: false,
      });
      newTodoText.value = '';
    }
  });

  const toggleTodo = $((id: number) => {
    const todo = store.items.find(item => item.id === id);
    if (todo) {
      todo.completed = !todo.completed;
    }
  });

  const deleteTodo = $((id: number) => {
    store.items = store.items.filter(item => item.id !== id);
  });

  const filteredItems = store.items.filter(item => {
    if (store.filter === 'active') return !item.completed;
    if (store.filter === 'completed') return item.completed;
    return true;
  });

  return (
    <div class="todo-app">
      <h1>Todoリスト</h1>

      <div class="add-todo">
        <input
          type="text"
          value={newTodoText.value}
          placeholder="新しいTodoを追加..."
          onInput$={(e) => {
            newTodoText.value = (e.target as HTMLInputElement).value;
          }}
          onKeyDown$={(e) => {
            if (e.key === 'Enter') addTodo();
          }}
        />
        <button onClick$={addTodo}>追加</button>
      </div>

      <div class="filters">
        {(['all', 'active', 'completed'] as const).map(filter => (
          <button
            key={filter}
            class={store.filter === filter ? 'active' : ''}
            onClick$={() => store.filter = filter}
          >
            {filter === 'all' ? 'すべて' : filter === 'active' ? '未完了' : '完了'}
          </button>
        ))}
      </div>

      <ul class="todo-list">
        {filteredItems.map(todo => (
          <li key={todo.id} class={todo.completed ? 'completed' : ''}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange$={() => toggleTodo(todo.id)}
            />
            <span>{todo.text}</span>
            <button onClick$={() => deleteTodo(todo.id)}>削除</button>
          </li>
        ))}
      </ul>

      <p class="todo-count">
        残り: {store.items.filter(i => !i.completed).length} 件
      </p>
    </div>
  );
});
```

### useComputed$

派生した状態（computed values）には `useComputed$` を使用する。

```typescript
import { component$, useSignal, useComputed$ } from '@builder.io/qwik';

export const ComputedDemo = component$(() => {
  const price = useSignal(1000);
  const taxRate = useSignal(0.1);
  const quantity = useSignal(1);

  // 税込価格を計算（price または taxRate が変化すると自動再計算）
  const priceWithTax = useComputed$(() => {
    return price.value * (1 + taxRate.value);
  });

  // 合計金額
  const totalPrice = useComputed$(() => {
    return priceWithTax.value * quantity.value;
  });

  return (
    <div>
      <label>
        単価:
        <input
          type="number"
          value={price.value}
          onInput$={(e) => {
            price.value = Number((e.target as HTMLInputElement).value);
          }}
        />
      </label>

      <label>
        数量:
        <input
          type="number"
          value={quantity.value}
          min="1"
          onInput$={(e) => {
            quantity.value = Number((e.target as HTMLInputElement).value);
          }}
        />
      </label>

      <p>税込単価: {priceWithTax.value.toFixed(0)}円</p>
      <p>合計金額: {totalPrice.value.toFixed(0)}円</p>
    </div>
  );
});
```

### コンテキスト（Context）

グローバルな状態管理には、Reactの Context API に相当する `useContext` を使用する。

```typescript
import {
  component$,
  createContextId,
  useContext,
  useContextProvider,
  useStore,
} from '@builder.io/qwik';

// コンテキストIDの定義
interface AuthStore {
  user: { name: string; email: string } | null;
  isLoading: boolean;
}

export const AuthContext = createContextId<AuthStore>('auth-context');

// プロバイダーコンポーネント
export const AuthProvider = component$(() => {
  const authStore = useStore<AuthStore>({
    user: null,
    isLoading: false,
  });

  useContextProvider(AuthContext, authStore);

  return <Slot />;
});

// コンテキストを使用するコンポーネント
export const UserProfile = component$(() => {
  const auth = useContext(AuthContext);

  if (auth.isLoading) {
    return <p>読み込み中...</p>;
  }

  if (!auth.user) {
    return <p>ログインしてください</p>;
  }

  return (
    <div>
      <p>名前: {auth.user.name}</p>
      <p>メール: {auth.user.email}</p>
    </div>
  );
});
```

---

## QwikCity：ファイルベースルーティング

QwikCityはQwikのメタフレームワークで、Next.jsやRemixと同様にファイルシステムベースのルーティングを提供する。

### ルーティングの基本

`src/routes/` ディレクトリ以下のファイル構造がURLに対応する。

```
src/routes/
├── index.tsx              → /
├── about/
│   └── index.tsx          → /about
├── blog/
│   ├── index.tsx          → /blog
│   └── [slug]/
│       └── index.tsx      → /blog/:slug
├── products/
│   ├── index.tsx          → /products
│   └── [id]/
│       └── index.tsx      → /products/:id
└── (auth)/                → グループ（URLに含まれない）
    ├── login/
    │   └── index.tsx      → /login
    └── register/
        └── index.tsx      → /register
```

### 基本的なページコンポーネント

```typescript
// src/routes/index.tsx
import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';

export default component$(() => {
  return (
    <main>
      <h1>ホームページへようこそ</h1>
      <p>QwikCityで構築されたWebサイトです。</p>
    </main>
  );
});

// ページのメタ情報を設定
export const head: DocumentHead = {
  title: 'ホーム - Qwik サンプルサイト',
  meta: [
    {
      name: 'description',
      content: 'QwikとQwikCityで構築されたサンプルサイトです。',
    },
    {
      property: 'og:title',
      content: 'ホーム - Qwik サンプルサイト',
    },
  ],
};
```

### レイアウト

レイアウトは複数のページで共通のUIを共有するために使用する。

```typescript
// src/routes/layout.tsx
import { component$, Slot } from '@builder.io/qwik';
import { Link, useLocation } from '@builder.io/qwik-city';

export default component$(() => {
  const loc = useLocation();

  return (
    <div class="app-layout">
      <header class="header">
        <nav class="nav">
          <Link href="/" class={loc.url.pathname === '/' ? 'active' : ''}>
            ホーム
          </Link>
          <Link href="/about" class={loc.url.pathname === '/about' ? 'active' : ''}>
            About
          </Link>
          <Link href="/blog" class={loc.url.pathname.startsWith('/blog') ? 'active' : ''}>
            ブログ
          </Link>
        </nav>
      </header>

      <main class="content">
        <Slot /> {/* ページコンテンツがここに挿入される */}
      </main>

      <footer class="footer">
        <p>&copy; 2026 My Qwik App. All rights reserved.</p>
      </footer>
    </div>
  );
});
```

### ネストされたレイアウト

QwikCityでは、ネストされたレイアウトをサポートしている。

```typescript
// src/routes/dashboard/layout.tsx
import { component$, Slot } from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';

export default component$(() => {
  return (
    <div class="dashboard-layout">
      <aside class="sidebar">
        <nav>
          <Link href="/dashboard">ダッシュボード</Link>
          <Link href="/dashboard/analytics">分析</Link>
          <Link href="/dashboard/settings">設定</Link>
        </nav>
      </aside>
      <div class="dashboard-content">
        <Slot />
      </div>
    </div>
  );
});
```

### 動的ルート

```typescript
// src/routes/blog/[slug]/index.tsx
import { component$ } from '@builder.io/qwik';
import { useLocation, type DocumentHead } from '@builder.io/qwik-city';

export default component$(() => {
  const loc = useLocation();
  const slug = loc.params.slug;

  return (
    <article>
      <h1>記事: {slug}</h1>
      <p>この記事のスラッグは「{slug}」です。</p>
    </article>
  );
});

export const head: DocumentHead = ({ params }) => {
  return {
    title: `記事: ${params.slug}`,
    meta: [
      {
        name: 'description',
        content: `${params.slug} に関する記事`,
      },
    ],
  };
};
```

### Linkコンポーネントとナビゲーション

```typescript
import { component$ } from '@builder.io/qwik';
import { Link, useNavigate } from '@builder.io/qwik-city';

export const NavigationDemo = component$(() => {
  const nav = useNavigate();

  return (
    <div>
      {/* 基本的なリンク */}
      <Link href="/about">Aboutページへ</Link>

      {/* プログラムによるナビゲーション */}
      <button onClick$={async () => {
        await nav('/dashboard');
      }}>
        ダッシュボードへ
      </button>

      {/* 外部リンク */}
      <a href="https://qwik.builder.io" target="_blank" rel="noopener noreferrer">
        Qwik公式サイト
      </a>
    </div>
  );
});
```

---

## ローダー：routeLoader$ によるデータフェッチ

ローダーはサーバーサイドでデータを取得するための仕組みだ。Remixの `loader` 関数に相当するが、Qwik独自の型安全なAPIを提供する。

### 基本的なローダー

```typescript
// src/routes/blog/index.tsx
import { component$ } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  publishedAt: string;
  slug: string;
}

// ローダーは常にエクスポートされた名前付き定数として定義する
export const useBlogPosts = routeLoader$(async () => {
  // サーバーサイドでのみ実行される
  const response = await fetch('https://api.example.com/posts');
  const posts: BlogPost[] = await response.json();
  return posts;
});

export default component$(() => {
  // ローダーのデータにアクセス
  const posts = useBlogPosts();

  return (
    <div>
      <h1>ブログ記事一覧</h1>
      <ul>
        {posts.value.map(post => (
          <li key={post.id}>
            <a href={`/blog/${post.slug}`}>
              <h2>{post.title}</h2>
              <p>{post.excerpt}</p>
              <time>{post.publishedAt}</time>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
});
```

### エラーハンドリング付きローダー

```typescript
import { routeLoader$, RequestEvent } from '@builder.io/qwik-city';

export const useUserData = routeLoader$(async (requestEvent: RequestEvent) => {
  const userId = requestEvent.params.id;
  const authToken = requestEvent.cookie.get('auth-token')?.value;

  if (!authToken) {
    // 未認証の場合はリダイレクト
    throw requestEvent.redirect(302, '/login');
  }

  try {
    const response = await fetch(`https://api.example.com/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw requestEvent.error(404, 'ユーザーが見つかりません');
      }
      throw requestEvent.error(500, 'サーバーエラーが発生しました');
    }

    const user = await response.json();
    return user;
  } catch (error) {
    if (error instanceof Error) {
      throw requestEvent.error(500, error.message);
    }
    throw error;
  }
});
```

### 複数のローダー

同一ページで複数のローダーを使用できる。

```typescript
// src/routes/dashboard/index.tsx
import { component$ } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';

export const useStats = routeLoader$(async () => {
  const response = await fetch('https://api.example.com/stats');
  return response.json();
});

export const useRecentActivity = routeLoader$(async () => {
  const response = await fetch('https://api.example.com/activity?limit=10');
  return response.json();
});

export const useNotifications = routeLoader$(async () => {
  const response = await fetch('https://api.example.com/notifications');
  return response.json();
});

export default component$(() => {
  const stats = useStats();
  const activity = useRecentActivity();
  const notifications = useNotifications();

  return (
    <div class="dashboard">
      <div class="stats-panel">
        <h2>統計情報</h2>
        <p>総ユーザー数: {stats.value.totalUsers}</p>
        <p>今日の訪問者: {stats.value.todayVisitors}</p>
      </div>

      <div class="activity-panel">
        <h2>最近のアクティビティ</h2>
        <ul>
          {activity.value.map((item: any) => (
            <li key={item.id}>{item.description}</li>
          ))}
        </ul>
      </div>

      <div class="notifications-panel">
        <h2>通知 ({notifications.value.length})</h2>
        {notifications.value.map((notif: any) => (
          <div key={notif.id} class={notif.read ? 'read' : 'unread'}>
            {notif.message}
          </div>
        ))}
      </div>
    </div>
  );
});
```

### データベース連携の例

実際のプロジェクトでは、データベースと直接接続することも多い。

```typescript
import { routeLoader$, RequestEvent } from '@builder.io/qwik-city';

// データベースクライアントのインポート（例：Prisma）
// import { PrismaClient } from '@prisma/client';

export const useProducts = routeLoader$(async (requestEvent: RequestEvent) => {
  const { searchParams } = requestEvent.url;
  const category = searchParams.get('category') || 'all';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 20;

  // 実際のプロジェクトではここでDBクエリを実行
  // const prisma = new PrismaClient();
  // const products = await prisma.product.findMany({
  //   where: category !== 'all' ? { category } : undefined,
  //   skip: (page - 1) * pageSize,
  //   take: pageSize,
  //   orderBy: { createdAt: 'desc' },
  // });

  // サンプルデータ
  const products = [
    { id: 1, name: '商品A', price: 1000, category: 'electronics' },
    { id: 2, name: '商品B', price: 2000, category: 'clothing' },
  ];

  return {
    products,
    totalCount: products.length,
    currentPage: page,
    totalPages: Math.ceil(products.length / pageSize),
  };
});
```

---

## アクション：routeAction$ によるフォーム送信

アクションはフォーム送信やミューテーション（データの変更）を処理するためのサーバーサイド関数だ。

### 基本的なアクション

```typescript
// src/routes/contact/index.tsx
import { component$, useSignal } from '@builder.io/qwik';
import { routeAction$, Form, zod$, z } from '@builder.io/qwik-city';

// Zodを使ったバリデーションスキーマ
const contactSchema = z.object({
  name: z.string().min(1, '名前は必須です').max(100, '名前は100文字以内にしてください'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  subject: z.string().min(1, '件名は必須です').max(200),
  message: z.string().min(10, 'メッセージは10文字以上入力してください').max(1000),
});

export const useContactForm = routeAction$(async (data, requestEvent) => {
  // バリデーション済みのデータが入ってくる
  const { name, email, subject, message } = data;

  try {
    // メール送信処理（実際にはSendgridなどを使用）
    await sendEmail({
      to: 'support@example.com',
      from: email,
      subject: `[お問い合わせ] ${subject}`,
      body: `
        名前: ${name}
        メール: ${email}
        メッセージ: ${message}
      `,
    });

    return {
      success: true,
      message: 'お問い合わせを受け付けました。2営業日以内に返信いたします。',
    };
  } catch (error) {
    return {
      success: false,
      message: '送信に失敗しました。しばらく経ってから再度お試しください。',
    };
  }
}, zod$(contactSchema));

// ダミーのsendEmail関数
async function sendEmail(options: {
  to: string;
  from: string;
  subject: string;
  body: string;
}) {
  // 実際のメール送信処理
  console.log('メールを送信:', options);
}

export default component$(() => {
  const action = useContactForm();

  return (
    <div class="contact-page">
      <h1>お問い合わせ</h1>

      {action.value?.success && (
        <div class="success-message">
          {action.value.message}
        </div>
      )}

      {action.value?.success === false && (
        <div class="error-message">
          {action.value.message}
        </div>
      )}

      {/* Form コンポーネントを使うとJavaScriptなしでも動作する */}
      <Form action={action} class="contact-form">
        <div class="form-group">
          <label for="name">お名前 *</label>
          <input
            id="name"
            name="name"
            type="text"
            required
          />
          {action.value?.fieldErrors?.name && (
            <span class="error">{action.value.fieldErrors.name}</span>
          )}
        </div>

        <div class="form-group">
          <label for="email">メールアドレス *</label>
          <input
            id="email"
            name="email"
            type="email"
            required
          />
          {action.value?.fieldErrors?.email && (
            <span class="error">{action.value.fieldErrors.email}</span>
          )}
        </div>

        <div class="form-group">
          <label for="subject">件名 *</label>
          <input
            id="subject"
            name="subject"
            type="text"
            required
          />
        </div>

        <div class="form-group">
          <label for="message">メッセージ *</label>
          <textarea
            id="message"
            name="message"
            rows={6}
            required
          />
          {action.value?.fieldErrors?.message && (
            <span class="error">{action.value.fieldErrors.message}</span>
          )}
        </div>

        <button type="submit" disabled={action.isRunning}>
          {action.isRunning ? '送信中...' : '送信する'}
        </button>
      </Form>
    </div>
  );
});
```

### 認証付きアクション

```typescript
import { routeAction$, zod$, z } from '@builder.io/qwik-city';

const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上にしてください'),
  rememberMe: z.coerce.boolean().optional(),
});

export const useLogin = routeAction$(async (data, requestEvent) => {
  const { email, password, rememberMe } = data;

  // 認証処理（実際にはDBでユーザーを検索してパスワードを検証）
  const user = await authenticateUser(email, password);

  if (!user) {
    return requestEvent.fail(401, {
      message: 'メールアドレスまたはパスワードが正しくありません',
    });
  }

  // セッションを設定
  const sessionToken = generateSessionToken(user.id);
  requestEvent.cookie.set('session', sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: rememberMe ? 30 * 24 * 60 * 60 : undefined, // 30日またはセッション
    path: '/',
  });

  // ログイン後にダッシュボードへリダイレクト
  throw requestEvent.redirect(302, '/dashboard');
}, zod$(loginSchema));

// ダミー関数
async function authenticateUser(email: string, password: string) {
  // 実際の認証処理
  return { id: '1', email };
}

function generateSessionToken(userId: string): string {
  // 実際のトークン生成処理
  return `token-${userId}-${Date.now()}`;
}
```

### アクションとローダーの組み合わせ

```typescript
// src/routes/profile/index.tsx
import { component$ } from '@builder.io/qwik';
import { routeLoader$, routeAction$, Form, zod$, z } from '@builder.io/qwik-city';

export const useProfile = routeLoader$(async (requestEvent) => {
  const session = requestEvent.cookie.get('session')?.value;
  if (!session) {
    throw requestEvent.redirect(302, '/login');
  }
  // ユーザーデータを取得
  return { name: 'テストユーザー', email: 'test@example.com', bio: 'Qwikエンジニア' };
});

export const useUpdateProfile = routeAction$(
  async (data, requestEvent) => {
    const session = requestEvent.cookie.get('session')?.value;
    if (!session) {
      return requestEvent.fail(401, { message: '認証が必要です' });
    }

    // プロフィールを更新
    // await db.user.update({ where: { session }, data });

    return { success: true };
  },
  zod$(z.object({
    name: z.string().min(1),
    bio: z.string().max(500).optional(),
  }))
);

export default component$(() => {
  const profile = useProfile();
  const updateAction = useUpdateProfile();

  return (
    <div class="profile-page">
      <h1>プロフィール編集</h1>

      {updateAction.value?.success && (
        <div class="success">プロフィールを更新しました</div>
      )}

      <Form action={updateAction}>
        <label>
          名前:
          <input
            name="name"
            type="text"
            value={profile.value.name}
          />
        </label>

        <label>
          自己紹介:
          <textarea name="bio">
            {profile.value.bio}
          </textarea>
        </label>

        <button type="submit">
          {updateAction.isRunning ? '更新中...' : '更新する'}
        </button>
      </Form>
    </div>
  );
});
```

---

## エンドポイント：REST API の作成

QwikCityでは、ページコンポーネント以外に、APIエンドポイントを作成することもできる。

### 基本的なAPIエンドポイント

```typescript
// src/routes/api/posts/index.tsx
import type { RequestHandler } from '@builder.io/qwik-city';

// GETリクエストのハンドラー
export const onGet: RequestHandler = async ({ json, url }) => {
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '10', 10);

  // サンプルデータ
  const posts = [
    { id: 1, title: '記事1', content: 'コンテンツ1' },
    { id: 2, title: '記事2', content: 'コンテンツ2' },
  ];

  json(200, {
    data: posts,
    pagination: {
      page,
      limit,
      total: posts.length,
      totalPages: Math.ceil(posts.length / limit),
    },
  });
};

// POSTリクエストのハンドラー
export const onPost: RequestHandler = async ({ request, json }) => {
  const body = await request.json();

  // バリデーション
  if (!body.title || !body.content) {
    json(400, { error: 'タイトルとコンテンツは必須です' });
    return;
  }

  // 新しい記事を作成
  const newPost = {
    id: Date.now(),
    title: body.title,
    content: body.content,
    createdAt: new Date().toISOString(),
  };

  json(201, { data: newPost });
};
```

### 動的パラメータを持つエンドポイント

```typescript
// src/routes/api/posts/[id]/index.tsx
import type { RequestHandler } from '@builder.io/qwik-city';

// サンプルデータストア
const posts = new Map([
  [1, { id: 1, title: '記事1', content: 'コンテンツ1' }],
  [2, { id: 2, title: '記事2', content: 'コンテンツ2' }],
]);

export const onGet: RequestHandler = async ({ params, json, error }) => {
  const id = parseInt(params.id, 10);
  const post = posts.get(id);

  if (!post) {
    throw error(404, `記事 ${id} が見つかりません`);
  }

  json(200, { data: post });
};

export const onPut: RequestHandler = async ({ params, request, json, error }) => {
  const id = parseInt(params.id, 10);
  const post = posts.get(id);

  if (!post) {
    throw error(404, `記事 ${id} が見つかりません`);
  }

  const body = await request.json();
  const updatedPost = { ...post, ...body, id };
  posts.set(id, updatedPost);

  json(200, { data: updatedPost });
};

export const onDelete: RequestHandler = async ({ params, json, error }) => {
  const id = parseInt(params.id, 10);

  if (!posts.has(id)) {
    throw error(404, `記事 ${id} が見つかりません`);
  }

  posts.delete(id);
  json(204, null);
};
```

### 認証ミドルウェアと組み合わせたAPI

```typescript
// src/routes/api/protected/index.tsx
import type { RequestHandler } from '@builder.io/qwik-city';

export const onRequest: RequestHandler = async ({ request, json, next }) => {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    json(401, { error: '認証が必要です' });
    return;
  }

  const token = authHeader.slice(7);

  // トークンの検証
  const isValid = await validateToken(token);
  if (!isValid) {
    json(401, { error: '無効なトークンです' });
    return;
  }

  // 次のハンドラーへ
  await next();
};

export const onGet: RequestHandler = async ({ json }) => {
  json(200, { data: '保護されたリソース' });
};

async function validateToken(token: string): Promise<boolean> {
  // 実際のトークン検証処理
  return token.length > 0;
}
```

---

## ミドルウェア

QwikCityのミドルウェアは、リクエストの処理チェーンに割り込むことができる。

### グローバルミドルウェア

```typescript
// src/routes/plugin@auth.ts
// plugin@ プレフィックスを付けると全ルートに適用される
import type { RequestHandler } from '@builder.io/qwik-city';

export const onRequest: RequestHandler = async ({ cookie, url, redirect, next }) => {
  // 保護するパスのリスト
  const protectedPaths = ['/dashboard', '/profile', '/settings'];

  const isProtected = protectedPaths.some(path =>
    url.pathname.startsWith(path)
  );

  if (isProtected) {
    const session = cookie.get('session')?.value;

    if (!session) {
      throw redirect(302, `/login?returnUrl=${encodeURIComponent(url.pathname)}`);
    }
  }

  // 次のハンドラーへ進む
  await next();
};
```

### レート制限ミドルウェア

```typescript
// src/routes/api/plugin@rate-limit.ts
import type { RequestHandler } from '@builder.io/qwik-city';

// シンプルなインメモリレート制限（本番環境ではRedisを使うべき）
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export const onRequest: RequestHandler = async ({ request, json, next }) => {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1分
  const maxRequests = 100;

  const current = requestCounts.get(ip);

  if (current && current.resetAt > now) {
    if (current.count >= maxRequests) {
      json(429, {
        error: 'リクエスト制限を超えました',
        retryAfter: Math.ceil((current.resetAt - now) / 1000),
      });
      return;
    }
    current.count++;
  } else {
    requestCounts.set(ip, {
      count: 1,
      resetAt: now + windowMs,
    });
  }

  await next();
};
```

### CORSミドルウェア

```typescript
// src/routes/api/plugin@cors.ts
import type { RequestHandler } from '@builder.io/qwik-city';

export const onRequest: RequestHandler = async ({ request, headers, next }) => {
  const origin = request.headers.get('origin');
  const allowedOrigins = ['https://example.com', 'https://app.example.com'];

  if (origin && allowedOrigins.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  }

  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // プリフライトリクエストの処理
  if (request.method === 'OPTIONS') {
    headers.set('Access-Control-Max-Age', '86400');
    return;
  }

  await next();
};
```

---

## スタイリング：CSS Modules と Tailwind CSS

### CSS Modules

Qwikは標準でCSS Modulesをサポートしている。

```typescript
// src/components/card/card.tsx
import { component$ } from '@builder.io/qwik';
import styles from './card.module.css';

interface CardProps {
  title: string;
  description: string;
  imageUrl?: string;
}

export const Card = component$<CardProps>(({ title, description, imageUrl }) => {
  return (
    <div class={styles.card}>
      {imageUrl && (
        <img
          src={imageUrl}
          alt={title}
          class={styles.cardImage}
        />
      )}
      <div class={styles.cardBody}>
        <h2 class={styles.cardTitle}>{title}</h2>
        <p class={styles.cardDescription}>{description}</p>
      </div>
    </div>
  );
});
```

```css
/* src/components/card/card.module.css */
.card {
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  background: #ffffff;
  transition: box-shadow 0.2s ease;
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.cardImage {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.cardBody {
  padding: 1.5rem;
}

.cardTitle {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #1a1a2e;
}

.cardDescription {
  font-size: 0.875rem;
  color: #666;
  line-height: 1.6;
}
```

### Tailwind CSS の統合

Tailwind CSSはQwikプロジェクトに簡単に統合できる。

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          900: '#1e3a8a',
        },
      },
    },
  },
  plugins: [],
};
```

```typescript
// Tailwindを使ったコンポーネント例
import { component$ } from '@builder.io/qwik';

interface AlertProps {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export const Alert = component$<AlertProps>(({ type, message }) => {
  const typeClasses = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  };

  return (
    <div class={`border rounded-lg p-4 ${typeClasses[type]}`}>
      <p class="text-sm font-medium">{message}</p>
    </div>
  );
});
```

### グローバルスタイルの設定

```typescript
// src/global.css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --font-sans: 'Inter', system-ui, sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
  }

  html {
    font-family: var(--font-sans);
    scroll-behavior: smooth;
  }

  body {
    @apply bg-gray-50 text-gray-900;
  }

  h1, h2, h3, h4, h5, h6 {
    @apply font-semibold leading-tight;
  }
}

@layer components {
  .btn {
    @apply inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2;
  }

  .btn-primary {
    @apply bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500;
  }

  .btn-secondary {
    @apply bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500;
  }
}
```

---

## 最適化テクニック：遅延読み込みとプリフェッチ

### コンポーネントの遅延読み込み

Qwikは自動的に遅延読み込みを行うが、明示的に制御することもできる。

```typescript
import { component$, useSignal } from '@builder.io/qwik';

// 重いコンポーネントを条件付きでレンダリング
export const PageWithHeavyModal = component$(() => {
  const isModalOpen = useSignal(false);

  return (
    <div>
      <h1>メインページ</h1>
      <button onClick$={() => isModalOpen.value = true}>
        モーダルを開く
      </button>

      {/* モーダルは開かれた時にのみロードされる */}
      {isModalOpen.value && (
        <HeavyModal onClose$={() => isModalOpen.value = false} />
      )}
    </div>
  );
});
```

### プリフェッチの設定

```typescript
// src/routes/layout.tsx
import { component$, Slot } from '@builder.io/qwik';
import { RouterHead } from '../components/router-head/router-head';

export default component$(() => {
  return (
    <>
      <RouterHead />
      <main>
        <Slot />
      </main>
    </>
  );
});
```

```typescript
// vite.config.ts でプリフェッチ戦略を設定
import { defineConfig } from 'vite';
import { qwikVite } from '@builder.io/qwik/optimizer';
import { qwikCity } from '@builder.io/qwik-city/vite';

export default defineConfig({
  plugins: [
    qwikCity({
      trailingSlash: false,
    }),
    qwikVite({
      client: {
        // プリフェッチ戦略: 'hover' | 'visible' | 'idle' | 'load' | 'none'
        // デフォルトは 'hover'
        prefetchStrategy: {
          implementation: {
            prefetchEvent: 'always',
          },
        },
      },
    }),
  ],
});
```

### 画像の最適化

```typescript
import { component$ } from '@builder.io/qwik';
import { Image } from '@unpic/qwik';

export const OptimizedImage = component$(() => {
  return (
    <div>
      {/* @unpic/qwik で最適化された画像 */}
      <Image
        src="https://example.com/hero.jpg"
        alt="ヒーロー画像"
        width={1200}
        height={600}
        priority={true}
        layout="constrained"
      />
    </div>
  );
});
```

### パフォーマンスモニタリング

```typescript
// src/routes/layout.tsx
import { component$, Slot, useVisibleTask$ } from '@builder.io/qwik';

export default component$(() => {
  useVisibleTask$(() => {
    // Core Web Vitals の計測
    if ('PerformanceObserver' in window) {
      // LCP（Largest Contentful Paint）
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log('LCP:', lastEntry.startTime);
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // CLS（Cumulative Layout Shift）
      let clsScore = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsScore += (entry as any).value;
          }
        }
        console.log('CLS:', clsScore);
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    }
  });

  return (
    <>
      <Slot />
    </>
  );
});
```

### Service Worker の活用

```typescript
// src/routes/service-worker.ts
import { setupServiceWorker } from '@builder.io/qwik-city/service-worker';

setupServiceWorker();

// カスタムキャッシュ戦略の追加
addEventListener('install', () => self.skipWaiting());
addEventListener('activate', () => self.clients.claim());

// 静的アセットのキャッシュ
const CACHE_NAME = 'qwik-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
];

addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);

  // APIリクエストはネットワーク優先
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request) as Promise<Response>
      )
    );
    return;
  }

  // その他はキャッシュ優先
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      });
    })
  );
});
```

---

## デプロイ

### Vercel へのデプロイ

Qwikプロジェクトは Vercel に簡単にデプロイできる。

```bash
# Vercelアダプターを追加
npm run qwik add vercel-edge
```

このコマンドを実行すると、`src/entry.vercel-edge.tsx` が生成される。

```typescript
// src/entry.vercel-edge.tsx
import { createQwikCity } from '@builder.io/qwik-city/middleware/vercel-edge';
import qwikCityPlan from '@qwik-city-plan';
import { manifest } from '@qwik-client-manifest';
import render from './entry.ssr';

export default createQwikCity({ render, qwikCityPlan, manifest });
```

`vercel.json` を作成する。

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".vercel/output",
  "framework": "qwik"
}
```

```bash
# Vercel CLIでデプロイ
npx vercel deploy
```

### Cloudflare Pages へのデプロイ

```bash
# Cloudflare Pagesアダプターを追加
npm run qwik add cloudflare-pages
```

```typescript
// src/entry.cloudflare-pages.tsx
import {
  createQwikCity,
} from '@builder.io/qwik-city/middleware/cloudflare-pages';
import qwikCityPlan from '@qwik-city-plan';
import { manifest } from '@qwik-client-manifest';
import render from './entry.ssr';

const onRequest = createQwikCity({ render, qwikCityPlan, manifest });

export { onRequest };
```

`wrangler.toml` の設定。

```toml
name = "my-qwik-app"
compatibility_date = "2024-01-01"

[site]
bucket = "./dist"

[build]
command = "npm run build"
```

```bash
# Wrangler CLIでデプロイ
npx wrangler pages deploy dist
```

### Cloudflare Workers KV の活用

```typescript
// Cloudflare Workers KV をデータストアとして使用
export const onGet: RequestHandler = async ({ platform, json }) => {
  // platform.env は Cloudflare Workers の環境変数とバインディングを含む
  const kv = (platform.env as any).MY_KV_NAMESPACE;

  if (kv) {
    const data = await kv.get('my-key');
    json(200, { data });
  } else {
    json(200, { data: 'KV not available in development' });
  }
};
```

### Node.js サーバーへのデプロイ

```bash
npm run qwik add express
```

```typescript
// src/entry.express.tsx
import { createQwikCity } from '@builder.io/qwik-city/middleware/node';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import qwikCityPlan from '@qwik-city-plan';
import { manifest } from '@qwik-client-manifest';
import render from './entry.ssr';

const app = express();

const { router, notFound } = createQwikCity({
  render,
  qwikCityPlan,
  manifest,
});

app.use(router);
app.use(notFound);

const PORT = parseInt(process.env['PORT'] ?? '3000', 10);
app.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});
```

### Docker を使ったコンテナデプロイ

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/package*.json ./

RUN npm ci --only=production

EXPOSE 3000

CMD ["node", "server/entry.express.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@db:5432/mydb
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=mydb
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

---

## React / Next.js からの移行ガイド

Qwikの構文はReactに非常に似ているため、移行は比較的スムーズに進められる。しかし、いくつかの重要な違いを理解する必要がある。

### 概念の対応関係

| React | Qwik | 備考 |
|-------|------|------|
| `useState` | `useSignal` / `useStore` | シグナルベースのリアクティビティ |
| `useEffect` | `useVisibleTask$` | クライアントのみで実行 |
| `useEffect`（SSR対応） | `useTask$` | SSRとCSRの両方で実行 |
| `useMemo` | `useComputed$` | 派生値 |
| `useCallback` | `$()` で囲む | 遅延ロード境界 |
| `useRef` | `useSignal<Element>` | DOM参照 |
| `useContext` | `useContext` | コンテキストの使用 |
| `createContext` | `createContextId` | コンテキストIDの作成 |
| `children` | `<Slot />` | スロットシステム |
| `React.FC` | `component$` | コンポーネント定義 |

### 実際の移行例

#### Before（React）

```typescript
// React コンポーネント
import React, { useState, useEffect, useCallback } from 'react';

interface SearchProps {
  onSearch: (query: string) => void;
}

const Search: React.FC<SearchProps> = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/suggestions?q=${query}`);
        const data = await response.json();
        setSuggestions(data);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSearch = useCallback(() => {
    onSearch(query);
  }, [query, onSearch]);

  return (
    <div className="search">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="検索..."
      />
      <button onClick={handleSearch} disabled={isLoading}>
        {isLoading ? '検索中...' : '検索'}
      </button>
      {suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((s, i) => (
            <li key={i} onClick={() => setQuery(s)}>
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Search;
```

#### After（Qwik）

```typescript
// Qwik コンポーネント
import { component$, useSignal, useTask$, PropFunction, $ } from '@builder.io/qwik';

interface SearchProps {
  onSearch$?: PropFunction<(query: string) => void>;
}

export const Search = component$<SearchProps>(({ onSearch$ }) => {
  const query = useSignal('');
  const suggestions = useSignal<string[]>([]);
  const isLoading = useSignal(false);

  // useTask$ は依存関係が変化するたびに実行される
  useTask$(async ({ track, cleanup }) => {
    const currentQuery = track(() => query.value);

    if (currentQuery.length < 2) {
      suggestions.value = [];
      return;
    }

    // デバウンス処理
    const timer = setTimeout(async () => {
      isLoading.value = true;
      try {
        const response = await fetch(`/api/suggestions?q=${currentQuery}`);
        const data = await response.json();
        suggestions.value = data;
      } finally {
        isLoading.value = false;
      }
    }, 300);

    // クリーンアップ
    cleanup(() => clearTimeout(timer));
  });

  const handleSearch = $(() => {
    if (onSearch$) {
      onSearch$(query.value);
    }
  });

  return (
    <div class="search">
      <input
        type="text"
        value={query.value}
        onInput$={(e) => {
          query.value = (e.target as HTMLInputElement).value;
        }}
        placeholder="検索..."
      />
      <button onClick$={handleSearch} disabled={isLoading.value}>
        {isLoading.value ? '検索中...' : '検索'}
      </button>
      {suggestions.value.length > 0 && (
        <ul class="suggestions">
          {suggestions.value.map((s, i) => (
            <li key={i} onClick$={() => { query.value = s; }}>
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
```

### Next.js のデータフェッチパターンとの比較

#### Next.js（App Router）

```typescript
// Next.js App Router のページ
async function BlogPage({ params }: { params: { slug: string } }) {
  // サーバーコンポーネントでデータフェッチ
  const post = await fetch(`https://api.example.com/posts/${params.slug}`)
    .then(res => res.json());

  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}
```

#### Qwik（QwikCity）

```typescript
// QwikCity のページ
import { routeLoader$ } from '@builder.io/qwik-city';

export const usePost = routeLoader$(async ({ params }) => {
  const post = await fetch(`https://api.example.com/posts/${params.slug}`)
    .then(res => res.json());
  return post;
});

export default component$(() => {
  const post = usePost();

  return (
    <article>
      <h1>{post.value.title}</h1>
      <div dangerouslySetInnerHTML={post.value.content} />
    </article>
  );
});
```

### qwik-react による段階的移行

既存のReactコンポーネントをQwikアプリに統合するために、`@builder.io/qwik-react` パッケージが提供されている。

```bash
npm run qwik add react
```

```typescript
// src/integrations/react/index.tsx
/** @jsxImportSource react */
import { qwikify$ } from '@builder.io/qwik-react';
import { useState } from 'react';

// 既存のReactコンポーネント
function ReactCounter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>Reactカウンター: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>
        インクリメント
      </button>
    </div>
  );
}

// Qwikコンポーネントとしてラップ
export const QwikReactCounter = qwikify$(ReactCounter);

// 使用例
// src/routes/index.tsx
import { component$ } from '@builder.io/qwik';
import { QwikReactCounter } from '../integrations/react';

export default component$(() => {
  return (
    <div>
      <h1>Qwikページ</h1>
      {/* Reactコンポーネントをそのまま使用できる */}
      <QwikReactCounter />
    </div>
  );
});
```

この `qwik-react` アダプターを使えば、段階的な移行が可能だ。まずはQwikCityのルーティングとローダーを活用しつつ、既存のReactコンポーネントをそのまま使い続け、徐々にQwikネイティブなコンポーネントに置き換えていくことができる。

---

## 実践的なアプリケーション例：フルスタックブログ

ここまでの知識を組み合わせて、実践的なブログアプリケーションの構造を示す。

### プロジェクト構造

```
src/
├── routes/
│   ├── layout.tsx           # グローバルレイアウト
│   ├── index.tsx            # ホームページ
│   ├── blog/
│   │   ├── index.tsx        # 記事一覧
│   │   └── [slug]/
│   │       └── index.tsx    # 記事詳細
│   ├── admin/
│   │   ├── layout.tsx       # 管理画面レイアウト
│   │   ├── index.tsx        # 管理ダッシュボード
│   │   └── posts/
│   │       ├── index.tsx    # 記事管理一覧
│   │       ├── new.tsx      # 新規記事作成
│   │       └── [id]/
│   │           └── edit.tsx # 記事編集
│   ├── api/
│   │   └── posts/
│   │       ├── index.tsx    # 記事一覧API
│   │       └── [id]/
│   │           └── index.tsx # 記事詳細API
│   └── plugin@auth.ts       # 認証ミドルウェア
├── components/
│   ├── blog-card/
│   ├── markdown-renderer/
│   └── rich-text-editor/
└── lib/
    ├── db.ts                # データベース接続
    └── auth.ts              # 認証ユーティリティ
```

### 記事一覧ページ

```typescript
// src/routes/blog/index.tsx
import { component$ } from '@builder.io/qwik';
import { routeLoader$, Link } from '@builder.io/qwik-city';
import type { DocumentHead } from '@builder.io/qwik-city';

interface Post {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  publishedAt: string;
  author: { name: string };
  tags: string[];
  readingTime: number;
}

export const usePosts = routeLoader$(async ({ url }) => {
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const tag = url.searchParams.get('tag');

  // 実際にはDBから取得
  const posts: Post[] = [
    {
      id: '1',
      title: 'Qwikで高速なWebアプリを構築する',
      excerpt: 'Qwikの革新的なResumeabilityについて解説します。',
      slug: 'building-fast-web-apps-with-qwik',
      publishedAt: '2026-02-20',
      author: { name: '田中太郎' },
      tags: ['qwik', 'performance', 'web'],
      readingTime: 8,
    },
  ];

  return {
    posts,
    currentPage: page,
    totalPages: 5,
    selectedTag: tag,
  };
});

export default component$(() => {
  const data = usePosts();

  return (
    <div class="blog-page">
      <h1 class="page-title">ブログ</h1>

      {data.value.selectedTag && (
        <div class="tag-filter">
          タグ: <span class="tag">{data.value.selectedTag}</span>
          <Link href="/blog">フィルターを解除</Link>
        </div>
      )}

      <div class="posts-grid">
        {data.value.posts.map(post => (
          <article key={post.id} class="post-card">
            <div class="post-meta">
              <time>{post.publishedAt}</time>
              <span>{post.readingTime}分で読める</span>
            </div>
            <h2>
              <Link href={`/blog/${post.slug}`}>
                {post.title}
              </Link>
            </h2>
            <p class="post-excerpt">{post.excerpt}</p>
            <div class="post-tags">
              {post.tags.map(tag => (
                <Link
                  key={tag}
                  href={`/blog?tag=${tag}`}
                  class="tag"
                >
                  {tag}
                </Link>
              ))}
            </div>
            <div class="post-author">
              by {post.author.name}
            </div>
          </article>
        ))}
      </div>

      <nav class="pagination">
        {data.value.currentPage > 1 && (
          <Link href={`/blog?page=${data.value.currentPage - 1}`}>
            前のページ
          </Link>
        )}
        <span>{data.value.currentPage} / {data.value.totalPages}</span>
        {data.value.currentPage < data.value.totalPages && (
          <Link href={`/blog?page=${data.value.currentPage + 1}`}>
            次のページ
          </Link>
        )}
      </nav>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'ブログ - Qwik サンプルサイト',
  meta: [
    {
      name: 'description',
      content: 'Qwik、Web開発、パフォーマンス最適化に関する技術ブログ',
    },
  ],
};
```

---

## Qwikのエコシステムと周辺ツール

### Partytown との統合

Partytown はサードパーティスクリプト（Analytics、広告など）をWeb Workerで実行するためのライブラリで、メインスレッドの負荷を軽減する。

```bash
npm install @builder.io/partytown
```

```typescript
// src/routes/layout.tsx
import { component$, Slot } from '@builder.io/qwik';
import { QwikPartytown } from '@builder.io/partytown/react';

export default component$(() => {
  return (
    <>
      <head>
        <QwikPartytown forward={['gtag', 'dataLayer.push']} />
        {/* Google Analytics をPartytown経由で読み込む */}
        <script
          async
          type="text/partytown"
          src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
        />
        <script
          type="text/partytown"
          dangerouslySetInnerHTML={`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-XXXXXXXXXX');
          `}
        />
      </head>
      <body>
        <Slot />
      </body>
    </>
  );
});
```

### Zod によるバリデーション

Qwikは Zod と緊密に統合されており、`routeAction$` でのバリデーションが非常に簡単だ。

```typescript
import { routeAction$, zod$, z } from '@builder.io/qwik-city';

// 複雑なバリデーションスキーマ
const productSchema = z.object({
  name: z
    .string()
    .min(1, '商品名は必須です')
    .max(100, '商品名は100文字以内'),
  description: z
    .string()
    .min(10, '説明は10文字以上')
    .max(2000, '説明は2000文字以内'),
  price: z
    .number()
    .min(1, '価格は1円以上')
    .max(1000000, '価格は100万円以内'),
  category: z.enum(['electronics', 'clothing', 'food', 'other']),
  images: z
    .array(z.string().url('有効なURLを入力してください'))
    .min(1, '少なくとも1枚の画像が必要です')
    .max(10, '画像は最大10枚まで'),
  inStock: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
});

export const useCreateProduct = routeAction$(
  async (data, { redirect }) => {
    // data は productSchema に沿って型が付いている
    console.log('商品を作成:', data);

    // DBに保存
    const product = await createProduct(data);

    throw redirect(302, `/products/${product.id}`);
  },
  zod$(productSchema)
);

async function createProduct(data: z.infer<typeof productSchema>) {
  // 実際のDB処理
  return { id: '1', ...data };
}
```

---

## パフォーマンスベンチマーク

Qwikの実際のパフォーマンスを理解するために、実際の計測データを見てみよう。

### Lighthouse スコアの比較

一般的なEコマースサイトを想定したベンチマーク（2024年の公開データに基づく参考値）。

| フレームワーク | パフォーマンス | FCP | LCP | TTI | TBT |
|--------------|-------------|-----|-----|-----|-----|
| Qwik | 98 | 0.8s | 1.2s | 0.9s | 10ms |
| Next.js（RSC） | 85 | 1.2s | 2.0s | 2.8s | 150ms |
| Remix | 82 | 1.4s | 2.2s | 3.0s | 180ms |
| SvelteKit | 90 | 1.0s | 1.8s | 2.0s | 80ms |

Qwikが特に優れているのは TTI（Time to Interactive）と TBT（Total Blocking Time）だ。これは、初期ページ読み込み時にほとんどJavaScriptを実行しないQwikのResumeabilityアーキテクチャの恩恵だ。

### バンドルサイズの比較

初期ページ読み込み時に必要なJavaScript量（参考値）。

| フレームワーク | 初期JS（gzip後） |
|--------------|----------------|
| Qwik | 1-2KB |
| Next.js（RSC） | 70-100KB |
| Remix | 80-120KB |
| SvelteKit | 15-30KB |
| Astro（アイランド） | 0-5KB |

---

## Qwikを選ぶべきシナリオ

Qwikが特に適しているのは以下のシナリオだ。

### 適しているケース

**Eコマースサイト**: 商品ページは多くのコンテンツを持ち、インタラクションが豊富だが、初期表示速度が売上に直結する。QwikのResumeabilityにより、コンテンツを即座に表示しながら、カートへの追加などのインタラクションを遅延ロードできる。

**メディア・ニュースサイト**: 記事コンテンツの表示速度はSEOと読者体験に直結する。Qwikのゼロハイドレーションにより、ファーストビューを超高速に表示できる。

**マーケティングLP**: コンバージョン率はページ速度に影響される。Qwikで構築したLPは初期読み込みが極めて高速だ。

**企業・SaaSのダッシュボード**: 多くのデータを表示する複雑なダッシュボードでも、Qwikの細粒度リアクティビティにより効率的な更新が可能。

### 注意が必要なケース

**強いReactエコシステム依存**: Material UIやChakra UIなどReact専用のコンポーネントライブラリを多用している場合、qwik-reactアダプターを使う必要があり、Qwikのメリットが一部相殺される。

**小規模なシンプルなアプリ**: アプリケーションが非常にシンプルで、パフォーマンスよりも開発速度を優先する場合、Qwikの学習コストが見合わない場合もある。

**チームのReact習熟度が高い場合**: Qwikの構文はReactに似ているが、`$` サフィックス、Resumabilityの理解、シリアライズ制約など、Qwik特有の概念を学ぶ時間が必要だ。

---

## まとめ

Qwikは、ハイドレーション問題に正面から取り組む、革命的なアプローチを持つWebフレームワークだ。Resumabilityという新しいパラダイムにより、アプリケーションの規模に関わらず一定の初期読み込みパフォーマンスを実現する。

本記事で取り上げた主要なポイントを振り返ろう。

**Resumabilityの本質**: サーバーの実行結果をシリアライズしてHTMLに埋め込み、クライアントでの再初期化を不要にする。これにより、初期JavaScriptをほぼゼロにできる。

**$ サフィックスの重要性**: `component$`、`onClick$`、`useTask$` などの `$` は単なる命名規則ではなく、Qwikオプティマイザーへのシグナルであり、遅延ロード境界を定義する。

**QwikCityのフルスタック機能**: `routeLoader$` によるサーバーサイドデータフェッチ、`routeAction$` によるフォーム処理、エンドポイント定義など、フルスタックアプリケーションに必要な機能が揃っている。

**Reactからの移行のしやすさ**: `qwik-react` アダプターにより段階的な移行が可能であり、既存のReactコンポーネント資産を再利用できる。

Qwikはまだ比較的新しいフレームワークだが、そのパフォーマンス特性は他のフレームワークが達成できないレベルにある。特にCore Web VitalsのスコアとTTIの改善において、Qwikは業界トップクラスの結果を出している。

Webパフォーマンスがビジネス成果に直結する現代において、Qwikは真剣に検討すべき選択肢のひとつだ。

---

## 開発ツールの活用

Qwikでの開発を加速するために、適切な開発ツールを活用することが重要だ。

**DevToolBox** ([usedevtools.com](https://usedevtools.com)) は、Web開発者向けの総合ツールプラットフォームだ。JSONフォーマッター、Base64エンコード・デコード、正規表現テスター、カラーコードコンバーター、ユニットコンバーターなど、日常的な開発業務で必要なツールを一か所にまとめている。ブラウザ上で動作するため、インストール不要で即座に使い始められる。Qwikプロジェクトの開発中に発生するデータ変換やデバッグ作業にも役立つ。

### 参考リソース

- **Qwik公式ドキュメント**: https://qwik.builder.io/docs/
- **QwikCity公式ドキュメント**: https://qwik.builder.io/docs/qwikcity/
- **Qwik GitHub**: https://github.com/BuilderIO/qwik
- **Builder.io ブログ**: https://www.builder.io/blog
- **Qwik Discord**: https://discord.gg/eFVMB8Uxqk
- **DevToolBox（開発ツール）**: https://usedevtools.com

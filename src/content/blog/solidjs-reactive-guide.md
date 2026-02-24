---
title: 'Solid.js完全ガイド — 超高速リアクティブUIフレームワーク・SolidStart・TypeScript'
description: 'Solid.jsで高パフォーマンスなリアクティブUIを構築する完全ガイド。Signal・Store・Resource・createEffect・SolidStart（SSR/SSG）・Reactからの移行・パフォーマンス比較まで実装例付きで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-5.jpg'
tags: ['Solid.js', 'TypeScript', 'リアクティブ', 'SolidStart', 'フロントエンド']
---

## はじめに

フロントエンド開発において「高パフォーマンス」と「開発体験の良さ」を同時に実現することは、長らく難しい課題でした。ReactはJSXとコンポーネントモデルで開発体験を革新しましたが、仮想DOMの差分計算というコストを抱えています。一方、Svelteはコンパイラベースのアプローチでランタイムを削減しましたが、独自テンプレート構文への慣れが必要です。

**Solid.js**は、この両者の利点を組み合わせたような存在です。ReactライクなJSX構文を使いながら、仮想DOMを一切使用せず、Svelteを超えるパフォーマンスを実現します。2023年以降、Krausestベンチマークでは一貫してReactやVueを大きく上回る結果を示し、フロントエンドコミュニティでの注目度が急上昇しています。

本記事では、Solid.jsの核となる概念から実践的な応用まで、TypeScriptコード例を交えて徹底解説します。

---

## 1. Solid.jsとは — Reactとの違い・仮想DOM不使用・パフォーマンス

### Solid.jsの基本哲学

Solid.jsは**Ryan Carniato**によって開発されたUIライブラリで、2021年にv1.0がリリースされました。コアとなる設計思想は以下の3点です。

1. **Fine-grained Reactivity（細粒度リアクティビティ）** — データの変化を追跡し、変更が影響する最小限のDOM要素のみを更新
2. **No Virtual DOM** — 仮想DOMの差分計算を行わず、直接DOMを操作
3. **コンパイル時最適化** — JSXをコンパイル時に最適化されたDOM操作コードに変換

### 仮想DOMが不要な理由

Reactでは、状態が変化するとコンポーネント関数が再実行され、新旧の仮想DOMツリーの差分を計算し、必要な箇所のみDOMを更新します。この「差分計算」は巧妙ですが、コストゼロではありません。

Solid.jsは根本的に異なるアプローチをとります。

```typescript
// React のアプローチ — コンポーネント関数が再実行される
function Counter() {
  const [count, setCount] = useState(0);
  console.log('コンポーネント再レンダー'); // 状態更新のたびに実行される
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

// Solid.js のアプローチ — コンポーネント関数は一度だけ実行される
function Counter() {
  const [count, setCount] = createSignal(0);
  console.log('コンポーネントセットアップ'); // 初回のみ実行される
  return <button onClick={() => setCount(c => c + 1)}>{count()}</button>;
  //                                                    ^^^ 関数として呼び出す
}
```

Solid.jsでは、コンポーネント関数は**初回マウント時に一度だけ実行**されます。`count()` という関数呼び出しが「このSignalをここで使っている」という依存関係を登録し、Signalの値が変わったときにその場所だけが更新されます。

### コンパイル結果を見てみる

Solid.jsのJSXは、コンパイル後に以下のようなコードになります。

```typescript
// コンパイル前
function App() {
  const [name, setName] = createSignal('World');
  return <h1>Hello, {name()}!</h1>;
}

// コンパイル後（概略）
function App() {
  const [name, setName] = createSignal('World');
  const _el$ = document.createElement('h1');
  const _el2$ = document.createTextNode('Hello, ');
  const _el3$ = document.createTextNode('');
  const _el4$ = document.createTextNode('!');
  _el$.append(_el2$, _el3$, _el4$);
  
  // name が変わったときのみ _el3$ を更新
  createEffect(() => (_el3$.data = name()));
  
  return _el$;
}
```

テキストノードに直接アクセスして更新するため、ツリー全体の差分計算が不要です。

### パフォーマンス比較

**Krausest js-framework-benchmark**（2024年版）の主要指標：

| フレームワーク | 行作成 (ms) | 選択行更新 (ms) | メモリ使用量 (MB) |
|------------|-----------|-------------|----------------|
| Vanilla JS | 40.5 | 3.2 | 2.8 |
| **Solid.js** | **44.1** | **3.5** | **3.1** |
| Svelte | 49.8 | 4.1 | 3.6 |
| Vue 3 | 57.3 | 5.9 | 4.2 |
| React 18 | 65.2 | 7.8 | 5.1 |
| Angular | 72.1 | 8.4 | 6.3 |

Solid.jsはVanilla JSに迫るパフォーマンスを持ちながら、Reactライクな開発体験を提供します。

### インストール

```bash
# Solid.js + TypeScript プロジェクト作成
npx degit solidjs/templates/ts my-solid-app
cd my-solid-app
npm install

# または Vite を使う場合
npm create vite@latest my-solid-app -- --template solid-ts
cd my-solid-app
npm install
npm run dev
```

---

## 2. Signal — createSignal・読み書き分離・Fine-grained Reactivity

### createSignal の基本

Signalは、Solid.jsのリアクティビティシステムの基盤となるプリミティブです。

```typescript
import { createSignal } from 'solid-js';

// 基本的な使い方
const [count, setCount] = createSignal(0);

// 読み取り — 関数として呼び出す
console.log(count()); // 0

// 書き込み
setCount(1);
console.log(count()); // 1

// 関数形式で更新（前の値を受け取る）
setCount(prev => prev + 1);
console.log(count()); // 2
```

### 読み書き分離の設計意図

Reactの `useState` が `[state, setState]` を返すのと似ていますが、Solid.jsでは読み取りが `count` ではなく `count()` という関数呼び出しになります。これは重要な設計上の選択です。

```typescript
import { createSignal, createEffect } from 'solid-js';

const [name, setName] = createSignal('Alice');

// NG: 値をそのまま渡すと依存関係が追跡されない
createEffect(() => {
  const currentName = name; // これはゲッター関数自体への参照
  console.log(currentName()); // 呼び出したときにだけ追跡される
});

// OK: エフェクト内で関数を呼び出す
createEffect(() => {
  console.log(name()); // name が変わるたびにこのエフェクトが再実行される
});
```

関数として呼び出すことで「このコンテキストでこのSignalを購読する」という意思が明示されます。

### 型付きSignal

```typescript
import { createSignal, Accessor, Setter } from 'solid-js';

// 型推論が自動的に行われる
const [count, setCount] = createSignal(0);
// count: Accessor<number>
// setCount: Setter<number>

// 初期値がnullの場合は型引数を明示
const [user, setUser] = createSignal<User | null>(null);

// カスタム等値比較（デフォルトは === による比較）
const [position, setPosition] = createSignal(
  { x: 0, y: 0 },
  { equals: (prev, next) => prev.x === next.x && prev.y === next.y }
);

// equals: false にすると常に更新をトリガー
const [list, setList] = createSignal<number[]>([], { equals: false });
```

### Signalを使ったコンポーネント例

```typescript
import { createSignal } from 'solid-js';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

function TodoApp() {
  const [todos, setTodos] = createSignal<Todo[]>([]);
  const [input, setInput] = createSignal('');
  let nextId = 1;

  const addTodo = () => {
    if (!input().trim()) return;
    setTodos(prev => [
      ...prev,
      { id: nextId++, text: input(), completed: false }
    ]);
    setInput('');
  };

  const toggleTodo = (id: number) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  return (
    <div>
      <input
        value={input()}
        onInput={e => setInput(e.currentTarget.value)}
        placeholder="新しいタスクを入力..."
      />
      <button onClick={addTodo}>追加</button>
      <ul>
        {/* For コンポーネントについては後述 */}
      </ul>
    </div>
  );
}
```

---

## 3. Derived State — createMemo・createComputed

### createMemo による派生状態

`createMemo` は、他のSignalから計算される派生値を作成します。Reactの `useMemo` に相当しますが、依存関係を自動追跡します。

```typescript
import { createSignal, createMemo } from 'solid-js';

const [firstName, setFirstName] = createSignal('太郎');
const [lastName, setLastName] = createSignal('山田');

// fullName は firstName または lastName が変わったときのみ再計算される
const fullName = createMemo(() => `${lastName()} ${firstName()}`);

console.log(fullName()); // "山田 太郎"

setFirstName('花子');
console.log(fullName()); // "山田 花子"
```

### createMemo の最適化効果

```typescript
import { createSignal, createMemo, createEffect } from 'solid-js';

const [items, setItems] = createSignal([1, 2, 3, 4, 5]);
const [filter, setFilter] = createSignal('');

// フィルタリングされたリスト — items または filter が変わったときのみ再計算
const filteredItems = createMemo(() => {
  console.log('フィルタリング実行'); // 必要なときだけ実行される
  const f = filter().toLowerCase();
  return items().filter(item => item.toString().includes(f));
});

// filteredItems の値が変わったときのみ実行
createEffect(() => {
  console.log('フィルタ結果:', filteredItems());
});

// filter を変更しても filteredItems が変わらない場合、
// createEffect は実行されない（最適化）
setFilter('999'); // filteredItems は [] になる → createEffect 実行
setFilter('888'); // filteredItems は [] のまま → createEffect は実行されない!
```

### 計算チェーン

```typescript
import { createSignal, createMemo } from 'solid-js';

const [price, setPrice] = createSignal(1000);
const [quantity, setQuantity] = createSignal(3);
const [taxRate, setTaxRate] = createSignal(0.1);

const subtotal = createMemo(() => price() * quantity());
const tax = createMemo(() => subtotal() * taxRate());
const total = createMemo(() => subtotal() + tax());

// price を変更すると、subtotal → tax → total の順に再計算される
// ただし実際には Solid.js がバッチ処理を行い効率的に更新
setPrice(1500);
console.log(`小計: ${subtotal()}, 税: ${tax()}, 合計: ${total()}`);
// 小計: 4500, 税: 450, 合計: 4950
```

---

## 4. Effects — createEffect・onMount・onCleanup

### createEffect の基本

`createEffect` はリアクティブな副作用を定義します。依存するSignalが変化したとき自動的に再実行されます。

```typescript
import { createSignal, createEffect, onCleanup } from 'solid-js';

const [searchQuery, setSearchQuery] = createSignal('');

createEffect(() => {
  const query = searchQuery();
  
  if (!query) return;
  
  console.log(`「${query}」を検索中...`);
  
  const timerId = setTimeout(() => {
    // 実際の検索処理
    console.log(`検索完了: ${query}`);
  }, 500);
  
  // クリーンアップ — 次の実行前またはコンポーネントアンマウント時に呼ばれる
  onCleanup(() => clearTimeout(timerId));
});
```

### onMount と onCleanup

```typescript
import { createSignal, onMount, onCleanup } from 'solid-js';

function ResizeTracker() {
  const [windowWidth, setWindowWidth] = createSignal(window.innerWidth);

  onMount(() => {
    // コンポーネントがDOMにマウントされた後に実行
    console.log('コンポーネントがマウントされました');
    
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    
    // onMount 内で onCleanup を使うことも可能
    onCleanup(() => {
      window.removeEventListener('resize', handleResize);
      console.log('イベントリスナーを削除しました');
    });
  });

  return <p>ウィンドウ幅: {windowWidth()}px</p>;
}
```

### エフェクトの実行タイミング

```typescript
import { createSignal, createEffect, createRenderEffect } from 'solid-js';

const [count, setCount] = createSignal(0);

// createEffect — DOM更新後に実行（デフォルト、最もよく使う）
createEffect(() => {
  console.log('DOM更新後:', count());
});

// createRenderEffect — DOM更新前に実行（レアケース）
createRenderEffect(() => {
  console.log('DOM更新前:', count());
});

setCount(1);
// 出力順: "DOM更新前: 1" → "DOM更新後: 1"
```

### WebSocket 接続の管理例

```typescript
import { createSignal, createEffect, onCleanup } from 'solid-js';

function LiveDataFeed() {
  const [wsUrl, setWsUrl] = createSignal('wss://api.example.com/feed');
  const [messages, setMessages] = createSignal<string[]>([]);

  createEffect(() => {
    const url = wsUrl();
    const ws = new WebSocket(url);

    ws.onopen = () => console.log('WebSocket接続開始:', url);
    ws.onmessage = e => {
      setMessages(prev => [...prev, e.data]);
    };
    ws.onerror = e => console.error('WebSocketエラー:', e);

    onCleanup(() => {
      console.log('WebSocket切断:', url);
      ws.close();
    });
  });

  return (
    <div>
      <p>受信メッセージ数: {messages().length}</p>
    </div>
  );
}
```

---

## 5. Store — createStore・produce・reconcile

### createStore の基本

ネストされた状態管理には `createStore` が適しています。

```typescript
import { createStore } from 'solid-js/store';

interface AppState {
  user: {
    name: string;
    email: string;
    preferences: {
      theme: 'light' | 'dark';
      language: string;
    };
  };
  notifications: { id: number; message: string }[];
}

const [state, setState] = createStore<AppState>({
  user: {
    name: '山田太郎',
    email: 'yamada@example.com',
    preferences: {
      theme: 'light',
      language: 'ja',
    },
  },
  notifications: [],
});

// パス指定で深い更新
setState('user', 'preferences', 'theme', 'dark');
setState('user', 'name', '田中花子');

// 関数を使った更新
setState('notifications', prev => [
  ...prev,
  { id: Date.now(), message: '新しい通知' }
]);

// 読み取りは通常のプロパティアクセス
console.log(state.user.preferences.theme); // 'dark'
```

### produce による Immer ライクな更新

```typescript
import { createStore, produce } from 'solid-js/store';

interface CartState {
  items: { id: string; name: string; quantity: number; price: number }[];
  coupon: string | null;
}

const [cart, setCart] = createStore<CartState>({
  items: [],
  coupon: null,
});

// produce を使うとミュータブルに書ける（内部でイミュータブルに変換される）
const addItem = (id: string, name: string, price: number) => {
  setCart(produce(state => {
    const existing = state.items.find(item => item.id === id);
    if (existing) {
      existing.quantity++;
    } else {
      state.items.push({ id, name, quantity: 1, price });
    }
  }));
};

const removeItem = (id: string) => {
  setCart(produce(state => {
    state.items = state.items.filter(item => item.id !== id);
  }));
};
```

### reconcile による効率的な配列更新

```typescript
import { createStore, reconcile } from 'solid-js/store';

interface User {
  id: number;
  name: string;
  score: number;
}

const [leaderboard, setLeaderboard] = createStore<{ users: User[] }>({
  users: [],
});

// APIから新しいデータを受け取ったとき
const updateLeaderboard = async () => {
  const newData: User[] = await fetchLeaderboardData();
  
  // reconcile は既存のアイテムを再利用し、変更部分のみ更新する
  // 大量データの更新に最適
  setLeaderboard('users', reconcile(newData, { key: 'id', merge: true }));
};
```

### createStore と createSignal の使い分け

```typescript
// シンプルなプリミティブ値 → createSignal
const [count, setCount] = createSignal(0);
const [isOpen, setIsOpen] = createSignal(false);
const [name, setName] = createSignal('');

// ネストされたオブジェクト・配列 → createStore
const [formState, setFormState] = createStore({
  fields: {
    username: '',
    email: '',
    password: '',
  },
  errors: {} as Record<string, string>,
  isSubmitting: false,
});
```

---

## 6. Resource — createResource・非同期データフェッチ・Suspense

### createResource の基本

`createResource` は非同期データ取得をリアクティブに扱うための仕組みです。

```typescript
import { createSignal, createResource } from 'solid-js';

interface Post {
  id: number;
  title: string;
  body: string;
  userId: number;
}

// フェッチャー関数
const fetchPost = async (id: number): Promise<Post> => {
  const res = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`);
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
};

function PostViewer() {
  const [postId, setPostId] = createSignal(1);
  
  // postId が変わると自動的に再フェッチ
  const [post] = createResource(postId, fetchPost);

  return (
    <div>
      <select
        value={postId()}
        onChange={e => setPostId(Number(e.currentTarget.value))}
      >
        <option value={1}>Post 1</option>
        <option value={2}>Post 2</option>
        <option value={3}>Post 3</option>
      </select>
      
      {/* post.loading, post.error, post() でアクセス */}
      {post.loading && <p>読み込み中...</p>}
      {post.error && <p>エラー: {post.error.message}</p>}
      {post() && (
        <article>
          <h2>{post()!.title}</h2>
          <p>{post()!.body}</p>
        </article>
      )}
    </div>
  );
}
```

### Suspense と ErrorBoundary との組み合わせ

```typescript
import { createSignal, createResource, Suspense } from 'solid-js';
import { ErrorBoundary } from 'solid-js';

function PostViewerWithSuspense() {
  const [postId, setPostId] = createSignal(1);
  const [post] = createResource(postId, fetchPost);

  return (
    <ErrorBoundary
      fallback={err => (
        <div class="error-box">
          <h3>エラーが発生しました</h3>
          <p>{err.message}</p>
          <button onClick={() => setPostId(1)}>リセット</button>
        </div>
      )}
    >
      <Suspense fallback={<div class="skeleton">読み込み中...</div>}>
        <article>
          <h2>{post()?.title}</h2>
          <p>{post()?.body}</p>
        </article>
      </Suspense>
    </ErrorBoundary>
  );
}
```

### 手動リフレッシュと楽観的更新

```typescript
import { createSignal, createResource } from 'solid-js';

interface Comment {
  id: number;
  text: string;
  author: string;
  createdAt: string;
}

const fetchComments = async (): Promise<Comment[]> => {
  const res = await fetch('/api/comments');
  return res.json();
};

function CommentSection() {
  const [newComment, setNewComment] = createSignal('');
  const [comments, { refetch, mutate }] = createResource(fetchComments);

  const submitComment = async () => {
    const text = newComment().trim();
    if (!text) return;

    // 楽観的更新 — APIレスポンス前にUIを更新
    const optimisticComment: Comment = {
      id: Date.now(),
      text,
      author: '現在のユーザー',
      createdAt: new Date().toISOString(),
    };
    mutate(prev => prev ? [...prev, optimisticComment] : [optimisticComment]);

    try {
      await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      setNewComment('');
      // サーバーからの最新データで同期
      refetch();
    } catch (err) {
      // エラー時はロールバック
      mutate(prev => prev?.filter(c => c.id !== optimisticComment.id));
      console.error('コメント投稿失敗:', err);
    }
  };

  return (
    <div>
      <textarea
        value={newComment()}
        onInput={e => setNewComment(e.currentTarget.value)}
        placeholder="コメントを入力..."
      />
      <button onClick={submitComment} disabled={comments.loading}>
        投稿
      </button>
    </div>
  );
}
```

---

## 7. Component設計 — props・children・splitProps

### props の基本

```typescript
import { Component } from 'solid-js';

interface ButtonProps {
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

const Button: Component<ButtonProps> = (props) => {
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      class={`btn btn-${props.variant ?? 'primary'}`}
    >
      {props.label}
    </button>
  );
};
```

### splitProps — 重要な落とし穴と解決策

Solid.jsでは、propsをデストラクチャすると**リアクティビティが失われます**。`splitProps` を使うことで安全に分割できます。

```typescript
import { splitProps, mergeProps, Component } from 'solid-js';
import type { JSX } from 'solid-js';

interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  elevated?: boolean;
}

const Card: Component<CardProps> = (props) => {
  // NG: デストラクチャするとリアクティビティが失われる
  // const { title, subtitle, elevated, ...rest } = props;

  // OK: splitProps を使う
  const [local, rest] = splitProps(props, ['title', 'subtitle', 'elevated']);

  return (
    <div
      class={`card ${local.elevated ? 'card--elevated' : ''}`}
      {...rest}  // class, style, onClick など HTML 属性をそのまま渡せる
    >
      <h3>{local.title}</h3>
      {local.subtitle && <p class="subtitle">{local.subtitle}</p>}
      {props.children}
    </div>
  );
};

// mergeProps でデフォルト値を設定
const ButtonWithDefaults: Component<ButtonProps> = (props) => {
  const merged = mergeProps({ variant: 'primary', disabled: false }, props);
  // merged はリアクティブ
  return <button class={`btn-${merged.variant}`}>{merged.label}</button>;
};
```

### children の扱い

```typescript
import { children, Component } from 'solid-js';
import type { JSX } from 'solid-js';

interface ListProps {
  children: JSX.Element;
}

const AnimatedList: Component<ListProps> = (props) => {
  // children() はリアクティブだが、複数回アクセスする場合は children() で解決する
  const resolved = children(() => props.children);

  return (
    <ul class="animated-list">
      {resolved()}
    </ul>
  );
};
```

---

## 8. Control Flow — Show・For・Switch・Dynamic・Portal

Solid.jsは、条件分岐やリストレンダリングに専用コンポーネントを提供します。

### Show — 条件付きレンダリング

```typescript
import { createSignal, Show } from 'solid-js';

function LoginStatus() {
  const [user, setUser] = createSignal<{ name: string } | null>(null);

  return (
    <Show
      when={user()}
      fallback={<button onClick={() => setUser({ name: '田中' })}>ログイン</button>}
    >
      {/* when の値が型ガードとして機能する */}
      {(loggedInUser) => (
        <div>
          <p>ようこそ、{loggedInUser().name}さん</p>
          <button onClick={() => setUser(null)}>ログアウト</button>
        </div>
      )}
    </Show>
  );
}
```

### For — リストレンダリング

```typescript
import { createSignal, For } from 'solid-js';

interface Task {
  id: number;
  title: string;
  done: boolean;
}

function TaskList() {
  const [tasks, setTasks] = createSignal<Task[]>([
    { id: 1, title: 'Solid.jsを学ぶ', done: false },
    { id: 2, title: 'ドキュメントを読む', done: true },
    { id: 3, title: 'プロジェクトを作る', done: false },
  ]);

  return (
    <ul>
      <For each={tasks()} fallback={<li>タスクがありません</li>}>
        {(task, index) => (
          // task はリアクティブアクセサーではなく値そのもの（Storeと組み合わせる場合は異なる）
          <li>
            <span>{index() + 1}. </span>
            <input
              type="checkbox"
              checked={task.done}
              onChange={() => {
                setTasks(prev =>
                  prev.map(t => t.id === task.id ? { ...t, done: !t.done } : t)
                );
              }}
            />
            <span style={{ 'text-decoration': task.done ? 'line-through' : 'none' }}>
              {task.title}
            </span>
          </li>
        )}
      </For>
    </ul>
  );
}
```

### Switch・Match — 複数条件の分岐

```typescript
import { createSignal, Switch, Match } from 'solid-js';

type Status = 'idle' | 'loading' | 'success' | 'error';

function DataStatus() {
  const [status, setStatus] = createSignal<Status>('idle');

  return (
    <Switch fallback={<p>不明な状態</p>}>
      <Match when={status() === 'idle'}>
        <button onClick={() => setStatus('loading')}>データを読み込む</button>
      </Match>
      <Match when={status() === 'loading'}>
        <div class="spinner">読み込み中...</div>
      </Match>
      <Match when={status() === 'success'}>
        <p class="success">データの読み込みが完了しました</p>
      </Match>
      <Match when={status() === 'error'}>
        <p class="error">エラーが発生しました</p>
      </Match>
    </Switch>
  );
}
```

### Dynamic — 動的コンポーネント

```typescript
import { createSignal, Dynamic } from 'solid-js';
import type { Component } from 'solid-js';

const components = {
  home: () => <div>ホーム画面</div>,
  profile: () => <div>プロフィール画面</div>,
  settings: () => <div>設定画面</div>,
} as const;

type PageName = keyof typeof components;

function DynamicPage() {
  const [page, setPage] = createSignal<PageName>('home');

  return (
    <div>
      <nav>
        <button onClick={() => setPage('home')}>ホーム</button>
        <button onClick={() => setPage('profile')}>プロフィール</button>
        <button onClick={() => setPage('settings')}>設定</button>
      </nav>
      <Dynamic component={components[page()]} />
    </div>
  );
}
```

### Portal — DOMツリー外へのレンダリング

```typescript
import { createSignal, Portal, Show } from 'solid-js';

function Modal() {
  const [isOpen, setIsOpen] = createSignal(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>モーダルを開く</button>
      
      <Show when={isOpen()}>
        <Portal mount={document.body}>
          <div class="modal-overlay" onClick={() => setIsOpen(false)}>
            <div class="modal-content" onClick={e => e.stopPropagation()}>
              <h2>モーダルタイトル</h2>
              <p>body タグに直接レンダリングされます</p>
              <button onClick={() => setIsOpen(false)}>閉じる</button>
            </div>
          </div>
        </Portal>
      </Show>
    </>
  );
}
```

---

## 9. Context — createContext・useContext

### グローバル状態管理のパターン

```typescript
import {
  createContext,
  useContext,
  createSignal,
  createStore,
  Component,
} from 'solid-js';
import type { JSX } from 'solid-js';

// テーマコンテキスト
interface ThemeContextValue {
  theme: () => 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>();

export const ThemeProvider: Component<{ children: JSX.Element }> = (props) => {
  const [theme, setTheme] = createSignal<'light' | 'dark'>('light');

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {props.children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme は ThemeProvider の内部で使用してください');
  }
  return context;
}

// 使用例
function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button onClick={toggleTheme}>
      現在のテーマ: {theme()} → {theme() === 'light' ? 'ダーク' : 'ライト'}に切り替え
    </button>
  );
}
```

### 複雑な状態管理の例 — 認証コンテキスト

```typescript
import {
  createContext,
  useContext,
  createStore,
  Component,
} from 'solid-js';
import type { JSX } from 'solid-js';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextValue {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: () => boolean;
}

const AuthContext = createContext<AuthContextValue>();

export const AuthProvider: Component<{ children: JSX.Element }> = (props) => {
  const [state, setState] = createStore<AuthState>({
    user: null,
    isLoading: false,
    error: null,
  });

  const login = async (email: string, password: string) => {
    setState('isLoading', true);
    setState('error', null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) throw new Error('認証に失敗しました');

      const user: User = await res.json();
      setState('user', user);
    } catch (err) {
      setState('error', err instanceof Error ? err.message : '不明なエラー');
    } finally {
      setState('isLoading', false);
    }
  };

  const logout = () => {
    setState('user', null);
    fetch('/api/auth/logout', { method: 'POST' });
  };

  const isAuthenticated = () => state.user !== null;

  return (
    <AuthContext.Provider value={{ state, login, logout, isAuthenticated }}>
      {props.children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth は AuthProvider 内で使用してください');
  return ctx;
};
```

---

## 10. SolidStart — ファイルベースルーティング・Server Functions

### SolidStartとは

SolidStartは、Solid.jsのフルスタックメタフレームワークです。Next.jsのSolid.js版に相当し、SSR・SSG・ファイルベースルーティング・Server Functionsをサポートします。

### セットアップ

```bash
npm create solid@latest my-solidstart-app
cd my-solidstart-app
npm install
npm run dev
```

### ファイルベースルーティング

```
src/routes/
├── index.tsx              → /
├── about.tsx              → /about
├── blog/
│   ├── index.tsx          → /blog
│   ├── [slug].tsx         → /blog/:slug
│   └── (layout).tsx       → レイアウト（URLに影響しない）
├── api/
│   └── users.ts           → /api/users（APIルート）
└── [...404].tsx           → 404ページ
```

### 基本的なルートコンポーネント

```typescript
// src/routes/blog/[slug].tsx
import { useParams } from '@solidjs/router';
import { createResource, Show, Suspense } from 'solid-js';
import { Title, Meta } from '@solidjs/meta';

interface BlogPost {
  slug: string;
  title: string;
  content: string;
  publishedAt: string;
  author: string;
}

const fetchPost = async (slug: string): Promise<BlogPost> => {
  const res = await fetch(`/api/posts/${slug}`);
  if (!res.ok) throw new Error('記事が見つかりません');
  return res.json();
};

export default function BlogPostPage() {
  const params = useParams<{ slug: string }>();
  const [post] = createResource(() => params.slug, fetchPost);

  return (
    <Show when={post()} fallback={<Suspense fallback={<div>読み込み中...</div>} />}>
      {(data) => (
        <>
          <Title>{data().title} | TechBlog</Title>
          <Meta name="description" content={data().content.slice(0, 160)} />
          <article>
            <h1>{data().title}</h1>
            <time>{new Date(data().publishedAt).toLocaleDateString('ja-JP')}</time>
            <p>著者: {data().author}</p>
            <div innerHTML={data().content} />
          </article>
        </>
      )}
    </Show>
  );
}
```

### Server Functions（RPC）

SolidStartの強力な機能である**Server Functions**を使うと、クライアントコードからサーバーサイドの処理を直接呼び出せます。

```typescript
// src/lib/actions.ts
'use server'; // このディレクティブでサーバー専用になる

import { db } from './database';

export const createPost = async (formData: FormData) => {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  if (!title || !content) {
    throw new Error('タイトルと本文は必須です');
  }

  const post = await db.post.create({
    data: {
      title,
      content,
      publishedAt: new Date(),
    },
  });

  return post;
};

export const getPosts = async () => {
  return db.post.findMany({
    orderBy: { publishedAt: 'desc' },
    take: 10,
  });
};
```

```typescript
// src/routes/admin/new-post.tsx — クライアント側
import { createSignal } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { createPost } from '~/lib/actions';

export default function NewPostPage() {
  const navigate = useNavigate();
  const [error, setError] = createSignal<string | null>(null);

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);

    try {
      const post = await createPost(formData);
      navigate(`/blog/${post.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error() && <p class="error">{error()}</p>}
      <input name="title" placeholder="タイトル" required />
      <textarea name="content" placeholder="本文" required />
      <button type="submit">投稿する</button>
    </form>
  );
}
```

### ルートデータローダー

```typescript
// src/routes/blog/index.tsx
import { createAsync } from '@solidjs/router';
import { For, Suspense } from 'solid-js';
import { getPosts } from '~/lib/actions';

// route.ts でデータローダーを定義（Next.js の loader に相当）
export const route = {
  preload: () => getPosts(),
};

export default function BlogIndex() {
  const posts = createAsync(() => getPosts());

  return (
    <Suspense fallback={<div>記事を読み込み中...</div>}>
      <h1>ブログ記事一覧</h1>
      <ul>
        <For each={posts()}>
          {post => (
            <li>
              <a href={`/blog/${post.slug}`}>{post.title}</a>
              <time>{post.publishedAt}</time>
            </li>
          )}
        </For>
      </ul>
    </Suspense>
  );
}
```

---

## 11. TypeScript統合 — 型推論・JSX型定義

### tsconfig.json の設定

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "jsxImportSource": "solid-js",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "types": ["vite/client"]
  }
}
```

### Signal の型推論

```typescript
import { createSignal, Accessor, Setter } from 'solid-js';

// 型推論が自動的に行われる
const [count, setCount] = createSignal(0);
//     ^-- Accessor<number>  ^-- Setter<number>

// ユニオン型
const [status, setStatus] = createSignal<'active' | 'inactive' | 'pending'>('pending');

// null許容型
const [selectedId, setSelectedId] = createSignal<string | null>(null);

// カスタム型
interface Point {
  x: number;
  y: number;
}
const [cursor, setCursor] = createSignal<Point>({ x: 0, y: 0 });

// Accessor<T> と Setter<T> を型として使う
function createCounter(initial: number): [Accessor<number>, () => void, () => void] {
  const [count, setCount] = createSignal(initial);
  const increment = () => setCount(c => c + 1);
  const decrement = () => setCount(c => c - 1);
  return [count, increment, decrement];
}
```

### JSXの型定義

```typescript
import type { Component, JSX, ParentComponent, FlowComponent } from 'solid-js';

// 子要素なし
type ButtonProps = {
  label: string;
  onClick: () => void;
};
const Button: Component<ButtonProps> = (props) => (
  <button onClick={props.onClick}>{props.label}</button>
);

// 子要素あり (children を受け取る)
type CardProps = {
  title: string;
};
const Card: ParentComponent<CardProps> = (props) => (
  <div>
    <h2>{props.title}</h2>
    {props.children}
  </div>
);

// 子要素を関数として受け取る (render props パターン)
type ListProps<T> = {
  items: T[];
  children: (item: T, index: () => number) => JSX.Element;
};
function TypedList<T>(props: ListProps<T>) {
  return (
    <ul>
      <For each={props.items}>
        {props.children}
      </For>
    </ul>
  );
}

// HTML属性の拡張
interface IconButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  label: string;
}
const IconButton: Component<IconButtonProps> = (props) => {
  const [local, rest] = splitProps(props, ['icon', 'label']);
  return (
    <button {...rest} aria-label={local.label}>
      <span class="icon">{local.icon}</span>
    </button>
  );
};
```

### ジェネリックコンポーネント

```typescript
import { For, Show } from 'solid-js';
import type { Accessor } from 'solid-js';

interface SelectProps<T> {
  options: T[];
  value: Accessor<T | null>;
  onChange: (value: T) => void;
  getLabel: (item: T) => string;
  getValue: (item: T) => string;
  placeholder?: string;
}

// TypeScript ジェネリックコンポーネント
function Select<T>(props: SelectProps<T>) {
  return (
    <select
      value={props.getValue(props.value() as T)}
      onChange={e => {
        const selected = props.options.find(
          opt => props.getValue(opt) === e.currentTarget.value
        );
        if (selected) props.onChange(selected);
      }}
    >
      <Show when={props.placeholder}>
        <option value="" disabled>{props.placeholder}</option>
      </Show>
      <For each={props.options}>
        {option => (
          <option value={props.getValue(option)}>
            {props.getLabel(option)}
          </option>
        )}
      </For>
    </select>
  );
}
```

---

## 12. Reactからの移行 — 主要な違い・パターン変換

### 主要な違いの早見表

| 概念 | React | Solid.js |
|-----|-------|---------|
| 状態 | `useState()` → `[state, setState]` | `createSignal()` → `[getter(), setter]` |
| 派生状態 | `useMemo()` | `createMemo()` |
| 副作用 | `useEffect()` | `createEffect()` |
| コンテキスト | `createContext` + `useContext` | `createContext` + `useContext` |
| ref | `useRef()` | `let ref: HTMLElement; ref={el => ref = el}` |
| ライフサイクル | `useEffect(() => {}, [])` | `onMount(() => {})` |
| クリーンアップ | `useEffect(() => { return cleanup })` | `onCleanup(cleanup)` |
| 条件分岐 | `{condition && <JSX />}` | `<Show when={condition}>` |
| リスト | `array.map(item => <JSX />)` | `<For each={array}>` |
| コンポーネント再実行 | 状態変化ごと | 初回マウント時のみ |

### よくある移行パターン

```typescript
// === カウンター ===

// React
import { useState } from 'react';
function ReactCounter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

// Solid.js
import { createSignal } from 'solid-js';
function SolidCounter() {
  const [count, setCount] = createSignal(0);
  return <button onClick={() => setCount(c => c + 1)}>{count()}</button>;
  //                                                    ^^^ 関数呼び出しが必要
}
```

```typescript
// === データフェッチ ===

// React
import { useState, useEffect } from 'react';
function ReactDataFetch() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/data')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div>Loading...</div>;
  return <div>{JSON.stringify(data)}</div>;
}

// Solid.js
import { createResource, Show, Suspense } from 'solid-js';
function SolidDataFetch() {
  const [data] = createResource(() => fetch('/api/data').then(r => r.json()));

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Show when={data()}>
        <div>{JSON.stringify(data())}</div>
      </Show>
    </Suspense>
  );
}
```

```typescript
// === カスタムフック → カスタム関数 ===

// React カスタムフック
function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

// Solid.js カスタムプリミティブ
import { createSignal, createEffect } from 'solid-js';
function createLocalStorage<T>(key: string, defaultValue: T) {
  const stored = localStorage.getItem(key);
  const [value, setValue] = createSignal<T>(
    stored ? JSON.parse(stored) : defaultValue
  );

  createEffect(() => {
    localStorage.setItem(key, JSON.stringify(value()));
  });

  return [value, setValue] as const;
}
```

### 移行時の注意点

**1. コンポーネント内でのデストラクチャ禁止**

```typescript
// NG — リアクティビティが失われる
function BadComponent(props: { name: string; age: number }) {
  const { name, age } = props; // これをやると name と age がリアクティブでなくなる
  return <div>{name} ({age})</div>;
}

// OK
function GoodComponent(props: { name: string; age: number }) {
  return <div>{props.name} ({props.age})</div>;
}

// OK — splitProps を使う
function GoodComponent2(props: { name: string; age: number; class?: string }) {
  const [local, rest] = splitProps(props, ['name', 'age']);
  return <div {...rest}>{local.name} ({local.age})</div>;
}
```

**2. Signalは必ず関数として呼び出す**

```typescript
const [count, setCount] = createSignal(0);

// NG
createEffect(() => {
  console.log(count); // count はゲッター関数。呼び出さないと追跡されない
});

// OK
createEffect(() => {
  console.log(count()); // 関数として呼び出す
});
```

---

## 13. パフォーマンス計測 — Krausestベンチマーク・実測値

### js-framework-benchmark の読み方

[Krausest js-framework-benchmark](https://krausest.github.io/js-framework-benchmarks/)は、各フレームワークのDOM操作パフォーマンスを計測する標準的なベンチマークです。

**主要な計測項目：**

```
create rows       — 1000行のテーブルを作成
replace all rows  — 1000行を新しいデータで置き換え
partial update    — 10行ごとにデータを更新
select row        — 行を選択状態にする
swap rows         — 998行目と1行目を入れ替え
remove row        — 1行を削除
create many rows  — 10000行を作成
append rows       — 1000行を追加
clear rows        — 1000行を削除
```

### 実測値の比較（2024年Q4）

```
=== Chrome 128, MacBook Pro M3 Pro での計測 ===

create rows (ms)        — 低いほど良い
Solid.js:  44.1  ████
Svelte 5:  49.8  █████
Vue 3:     57.3  ██████
React 18:  65.2  ███████

select row (ms)         — 低いほど良い
Solid.js:   3.5  █
Svelte 5:   4.1  █
Vue 3:      5.9  ██
React 18:   7.8  ███

Memory (MB)             — 低いほど良い
Solid.js:  3.1   ███
Svelte 5:  3.6   ████
Vue 3:     4.2   █████
React 18:  5.1   ██████
```

### バンドルサイズの比較

```
フレームワーク本体のGzip後サイズ:
Solid.js:   ~7KB
Svelte:     ~2KB（ランタイムなし）
Preact:     ~4KB
Vue 3:      ~22KB
React + ReactDOM: ~45KB
Angular:    ~75KB
```

Solid.jsは7KBという非常に小さなバンドルサイズで、高パフォーマンスを実現します。

### アプリケーション規模での比較

実際のアプリケーションでは以下の点でも差が現れます。

```typescript
// Solid.js — コンポーネントの再実行なし
function ExpensiveList() {
  const [filter, setFilter] = createSignal('');
  const [items] = createResource(fetchItems);
  
  // items の変化時のみ再計算、filter の変化時のみフィルタリング
  const filtered = createMemo(() =>
    items()?.filter(item => item.name.includes(filter()))
  );

  // フィルターが変わっても ExpensiveList 関数は再実行されない
  // 変わるのは filtered の値だけ
  return (
    <div>
      <input value={filter()} onInput={e => setFilter(e.currentTarget.value)} />
      <For each={filtered()}>
        {item => <ListItem item={item} />}
      </For>
    </div>
  );
}
```

### パフォーマンス最適化テクニック

```typescript
import { createSignal, createMemo, batch } from 'solid-js';

// batch — 複数のSignal更新をまとめて行う
const [a, setA] = createSignal(0);
const [b, setB] = createSignal(0);

// NG: 2回の更新が発生
setA(1);
setB(2);

// OK: 1回の更新にまとまる
batch(() => {
  setA(1);
  setB(2);
});

// untrack — リアクティビティを無効化して読み取る
import { createEffect, untrack } from 'solid-js';
const [x, setX] = createSignal(0);
const [y, setY] = createSignal(0);

createEffect(() => {
  // x の変化のみ追跡、y は追跡しない
  const xValue = x();
  const yValue = untrack(() => y()); // y が変わってもこのエフェクトは再実行されない
  console.log(xValue, yValue);
});
```

---

## 実践: フルスタックTodoアプリ

これまでの概念を組み合わせた実践的なサンプルです。

```typescript
// src/lib/todo-store.ts
import { createStore, produce } from 'solid-js/store';

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
}

export interface TodoStore {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
}

export function createTodoStore() {
  const [state, setState] = createStore<TodoStore>({
    todos: [],
    filter: 'all',
  });

  const addTodo = (title: string) => {
    setState(produce(s => {
      s.todos.unshift({
        id: crypto.randomUUID(),
        title,
        completed: false,
        createdAt: new Date(),
      });
    }));
  };

  const toggleTodo = (id: string) => {
    setState(produce(s => {
      const todo = s.todos.find(t => t.id === id);
      if (todo) todo.completed = !todo.completed;
    }));
  };

  const deleteTodo = (id: string) => {
    setState('todos', todos => todos.filter(t => t.id !== id));
  };

  const setFilter = (filter: TodoStore['filter']) => {
    setState('filter', filter);
  };

  return { state, addTodo, toggleTodo, deleteTodo, setFilter };
}
```

---

## まとめと次のステップ

Solid.jsは、以下の点で現代のフロントエンド開発に革新をもたらしています。

**Solid.jsの強み:**
- 仮想DOM不使用による圧倒的なパフォーマンス
- Fine-grained Reactivityによる精密な更新制御
- ReactライクなJSX構文による低い学習コスト
- 7KBという小さなバンドルサイズ
- SolidStartによるSSR/SSGサポート

**向いているユースケース:**
- パフォーマンスクリティカルなアプリケーション
- リアルタイムデータを扱うダッシュボード
- 大量のリストやテーブルを持つデータ集約アプリ
- バンドルサイズを最小化したいプロジェクト

**学習リソース:**
- [公式ドキュメント](https://docs.solidjs.com/)
- [Solid.js Tutorial](https://www.solidjs.com/tutorial/introduction_basics)
- [SolidStart Documentation](https://start.solidjs.com/)

---

開発ワークフローを最適化したい方には、**[DevToolBox](https://usedevtools.com/)** がおすすめです。Solid.jsプロジェクトの開発でも活用できるJSON/YAML変換、正規表現テスター、カラーパレット生成など20以上のブラウザ完結型ツールを無料で提供しています。日々のコーディング作業をブラウザ上でシームレスにこなせるため、Solid.js開発のお供にぜひ試してみてください。

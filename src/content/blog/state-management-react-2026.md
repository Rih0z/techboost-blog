---
title: "React状態管理2026 - Zustand, Jotai, Redux徹底比較"
description: "2026年のReact状態管理ライブラリを完全網羅する比較ガイド。useState/Contextの限界、Zustand・Jotai・Redux Toolkitの使い分け、TanStack Queryによるサーバー状態管理、規模別の選定フローチャートをコード例付きで徹底解説。"
pubDate: "2026-02-05"
tags: ["React", "状態管理", "Zustand", "Jotai", "Redux"]
heroImage: '../../assets/thumbnails/state-management-react-2026.jpg'
---
## はじめに

React状態管理は、2026年現在**選択肢が多様化**しています。

「どれを選べばいいのか？」という疑問に答えるため、主要ライブラリの特徴・使い分けを徹底解説します。

### 状態管理の2つの種類

1. **クライアント状態** (Client State)
   - UIの状態（モーダル開閉、フォーム入力）
   - アプリケーション内で完結

2. **サーバー状態** (Server State)
   - APIから取得したデータ
   - キャッシュ・同期が必要

### 2026年の主要ライブラリ

**クライアント状態:**
- useState / useReducer / Context（ビルトイン）
- Zustand（軽量・シンプル）
- Jotai（アトミック）
- Redux Toolkit（大規模向け）

**サーバー状態:**
- TanStack Query（旧React Query）
- SWR
- Apollo Client（GraphQL）

## ビルトイン（useState/useContext）

### useState - 基本

```tsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

### useReducer - 複雑な状態

```tsx
import { useReducer } from 'react';

type State = {
  count: number;
  step: number;
};

type Action =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'setStep'; payload: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment':
      return { ...state, count: state.count + state.step };
    case 'decrement':
      return { ...state, count: state.count - state.step };
    case 'setStep':
      return { ...state, step: action.payload };
    default:
      return state;
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, { count: 0, step: 1 });

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => dispatch({ type: 'increment' })}>+</button>
      <button onClick={() => dispatch({ type: 'decrement' })}>-</button>
      <input
        type="number"
        value={state.step}
        onChange={(e) => dispatch({ type: 'setStep', payload: Number(e.target.value) })}
      />
    </div>
  );
}
```

### Context - グローバル状態

```tsx
import { createContext, useContext, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}

// 使用例
function App() {
  return (
    <ThemeProvider>
      <Header />
      <Main />
    </ThemeProvider>
  );
}

function Header() {
  const { theme, toggleTheme } = useTheme();
  return (
    <header className={theme}>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </header>
  );
}
```

### Contextの課題

- **パフォーマンス**: 値が変わると全コンポーネント再レンダリング
- **スケールしない**: 複数Contextをネストすると可読性低下

## Zustand - シンプル・軽量

### インストール

```bash
npm install zustand
```

### 基本的な使い方

```tsx
import { create } from 'zustand';

interface CounterStore {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

const useCounterStore = create<CounterStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}));

function Counter() {
  const { count, increment, decrement, reset } = useCounterStore();

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

### セレクター（部分購読）

```tsx
// 必要な値だけ購読 → 不要な再レンダリング防止
function CountDisplay() {
  const count = useCounterStore((state) => state.count);
  return <p>Count: {count}</p>;
}

function IncrementButton() {
  const increment = useCounterStore((state) => state.increment);
  return <button onClick={increment}>+</button>;
}
```

### ミドルウェア（persist）

```tsx
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useUserStore = create(
  persist<UserStore>(
    (set) => ({
      user: null,
      login: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    {
      name: 'user-storage', // localStorageのキー
    }
  )
);
```

### immer（イミュータブル更新を簡単に）

```tsx
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface TodoStore {
  todos: { id: number; text: string; done: boolean }[];
  addTodo: (text: string) => void;
  toggleTodo: (id: number) => void;
}

const useTodoStore = create<TodoStore>()(
  immer((set) => ({
    todos: [],
    addTodo: (text) =>
      set((state) => {
        state.todos.push({ id: Date.now(), text, done: false });
      }),
    toggleTodo: (id) =>
      set((state) => {
        const todo = state.todos.find((t) => t.id === id);
        if (todo) todo.done = !todo.done;
      }),
  }))
);
```

### 複数ストアの分割

```tsx
// stores/auth.ts
export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  login: (user) => set({ user }),
  logout: () => set({ user: null }),
}));

// stores/cart.ts
export const useCartStore = create<CartStore>((set) => ({
  items: [],
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  removeItem: (id) => set((state) => ({
    items: state.items.filter((item) => item.id !== id),
  })),
}));

// コンポーネントで使用
function Header() {
  const user = useAuthStore((state) => state.user);
  const itemCount = useCartStore((state) => state.items.length);

  return (
    <header>
      {user && <p>Welcome, {user.name}</p>}
      <p>Cart: {itemCount} items</p>
    </header>
  );
}
```

## Jotai - アトミック状態管理

### インストール

```bash
npm install jotai
```

### Atom（状態の最小単位）

```tsx
import { atom, useAtom } from 'jotai';

// プリミティブAtom
const countAtom = atom(0);

function Counter() {
  const [count, setCount] = useAtom(countAtom);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

### 派生Atom

```tsx
import { atom, useAtom, useAtomValue } from 'jotai';

const firstNameAtom = atom('John');
const lastNameAtom = atom('Doe');

// 読み取り専用の派生Atom
const fullNameAtom = atom((get) => {
  return `${get(firstNameAtom)} ${get(lastNameAtom)}`;
});

function FullName() {
  const fullName = useAtomValue(fullNameAtom);
  return <p>{fullName}</p>;
}

function NameForm() {
  const [firstName, setFirstName] = useAtom(firstNameAtom);
  const [lastName, setLastName] = useAtom(lastNameAtom);

  return (
    <div>
      <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
      <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
    </div>
  );
}
```

### 書き込み可能な派生Atom

```tsx
const priceAtom = atom(100);
const taxRateAtom = atom(0.1);

const priceWithTaxAtom = atom(
  (get) => get(priceAtom) * (1 + get(taxRateAtom)), // 読み取り
  (get, set, newPrice: number) => {
    // 税込価格から本体価格を逆算
    set(priceAtom, newPrice / (1 + get(taxRateAtom)));
  }
);
```

### 非同期Atom

```tsx
const userIdAtom = atom(1);

const userAtom = atom(async (get) => {
  const userId = get(userIdAtom);
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
});

function UserProfile() {
  const user = useAtomValue(userAtom); // Suspenseで待機
  return <p>{user.name}</p>;
}

// Suspenseでラップ
function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UserProfile />
    </Suspense>
  );
}
```

### atomWithStorage（永続化）

```tsx
import { atomWithStorage } from 'jotai/utils';

const darkModeAtom = atomWithStorage('darkMode', false);

function ThemeToggle() {
  const [darkMode, setDarkMode] = useAtom(darkModeAtom);

  return (
    <button onClick={() => setDarkMode(!darkMode)}>
      {darkMode ? '🌙' : '☀️'}
    </button>
  );
}
```

## Redux Toolkit - 大規模アプリ向け

### インストール

```bash
npm install @reduxjs/toolkit react-redux
```

### スライス定義

```typescript
// features/counter/counterSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CounterState {
  value: number;
  step: number;
}

const initialState: CounterState = {
  value: 0,
  step: 1,
};

const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    increment: (state) => {
      state.value += state.step;
    },
    decrement: (state) => {
      state.value -= state.step;
    },
    setStep: (state, action: PayloadAction<number>) => {
      state.step = action.payload;
    },
    reset: (state) => {
      state.value = 0;
    },
  },
});

export const { increment, decrement, setStep, reset } = counterSlice.actions;
export default counterSlice.reducer;
```

### ストア設定

```typescript
// app/store.ts
import { configureStore } from '@reduxjs/toolkit';
import counterReducer from '../features/counter/counterSlice';

export const store = configureStore({
  reducer: {
    counter: counterReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Hooks

```typescript
// app/hooks.ts
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
```

### コンポーネントで使用

```tsx
import { useAppDispatch, useAppSelector } from './app/hooks';
import { increment, decrement, reset } from './features/counter/counterSlice';

function Counter() {
  const count = useAppSelector((state) => state.counter.value);
  const dispatch = useAppDispatch();

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => dispatch(increment())}>+</button>
      <button onClick={() => dispatch(decrement())}>-</button>
      <button onClick={() => dispatch(reset())}>Reset</button>
    </div>
  );
}
```

### 非同期処理（createAsyncThunk）

```typescript
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export const fetchUser = createAsyncThunk(
  'user/fetchUser',
  async (userId: string) => {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState: {
    data: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});
```

## TanStack Query - サーバー状態管理

### インストール

```bash
npm install @tanstack/react-query
```

### セットアップ

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserList />
    </QueryClientProvider>
  );
}
```

### useQuery - データ取得

```tsx
import { useQuery } from '@tanstack/react-query';

function UserList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      return response.json();
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### useMutation - データ更新

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

function CreateUser() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (newUser: { name: string; email: string }) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      });
      return response.json();
    },
    onSuccess: () => {
      // キャッシュ無効化 → 再取得
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  return (
    <button
      onClick={() => mutation.mutate({ name: 'Alice', email: 'alice@example.com' })}
    >
      Create User
    </button>
  );
}
```

## 選定フローチャート

```
状態の種類は？
├─ サーバー状態（API取得データ）
│  └─ TanStack Query / SWR
│
└─ クライアント状態
   ├─ 単一コンポーネント
   │  └─ useState / useReducer
   │
   ├─ 親子間（浅い階層）
   │  └─ Props / Context
   │
   └─ グローバル（アプリ全体）
      ├─ シンプル・小〜中規模
      │  └─ Zustand
      │
      ├─ 細かい最適化が必要
      │  └─ Jotai
      │
      └─ 大規模・複雑なビジネスロジック
         └─ Redux Toolkit
```

## まとめ

### ライブラリ比較表

| ライブラリ | サイズ | 学習曲線 | 適用範囲 | おすすめ度 |
|---|---|---|---|---|
| useState/Context | 0KB | 低 | 小規模 | ⭐⭐⭐ |
| Zustand | 1.2KB | 低 | 小〜大 | ⭐⭐⭐⭐⭐ |
| Jotai | 3KB | 中 | 小〜中 | ⭐⭐⭐⭐ |
| Redux Toolkit | 12KB | 高 | 大規模 | ⭐⭐⭐ |
| TanStack Query | 13KB | 中 | サーバー状態 | ⭐⭐⭐⭐⭐ |

### 2026年のベストプラクティス

- **クライアント状態**: Zustand（シンプル・軽量）
- **サーバー状態**: TanStack Query（キャッシュ・同期）
- **大規模**: Redux Toolkit（チーム開発・標準化）

### 次のステップ

- Zustand: https://zustand-demo.pmnd.rs/
- Jotai: https://jotai.org/
- Redux Toolkit: https://redux-toolkit.js.org/
- TanStack Query: https://tanstack.com/query

状態管理ライブラリを適切に選び、保守性の高いReactアプリを構築しましょう。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)

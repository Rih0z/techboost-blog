---
title: "Zustand 完全ガイド — React状態管理の新標準。ReduxとJotaiとの比較"
description: "Zustandの完全ガイド。基本的な使い方、middleware、persist、devtools連携からRedux・Jotaiとの詳細比較まで、実践的なコード例とともに解説します。"
pubDate: "2026-03-04"
tags: ["Zustand", "React", "状態管理", "JavaScript", "TypeScript"]
---

## はじめに

**Zustand** は軽量でシンプルなReact状態管理ライブラリです。Reduxの複雑さを排除し、Reactの `useState` に近い感覚で使いながら、グローバル状態の管理ができます。2026年現在、多くのプロジェクトでReduxの代替として採用が進んでいます。

## なぜ Zustand が選ばれるのか

```
バンドルサイズ比較:
Redux Toolkit:  ~40KB (gzip)
Zustand:         ~1KB (gzip)
Jotai:           ~3KB (gzip)
Recoil:         ~20KB (gzip)
```

小さなバンドルサイズにもかかわらず、必要な機能はすべて揃っています。

## 基本的な使い方

```typescript
// store/useCountStore.ts
import { create } from 'zustand';

interface CountState {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  incrementBy: (amount: number) => void;
}

export const useCountStore = create<CountState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
  incrementBy: (amount) => set((state) => ({ count: state.count + amount })),
}));
```

```typescript
// components/Counter.tsx
import { useCountStore } from '@/store/useCountStore';

export function Counter() {
  // 必要な状態・アクションだけを選択してサブスクライブ
  const count = useCountStore((state) => state.count);
  const increment = useCountStore((state) => state.increment);
  const decrement = useCountStore((state) => state.decrement);
  const reset = useCountStore((state) => state.reset);

  return (
    <div className="flex items-center gap-4">
      <button onClick={decrement}>-</button>
      <span className="text-2xl font-bold">{count}</span>
      <button onClick={increment}>+</button>
      <button onClick={reset} className="text-sm text-gray-500">リセット</button>
    </div>
  );
}
```

## 実践的なストア設計（ユーザー管理）

```typescript
// store/useUserStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

interface UserState {
  users: User[];
  selectedUser: User | null;
  isLoading: boolean;
  error: string | null;

  // アクション
  fetchUsers: () => Promise<void>;
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  selectUser: (user: User | null) => void;
}

export const useUserStore = create<UserState>()(
  devtools(
    (set, get) => ({
      users: [],
      selectedUser: null,
      isLoading: false,
      error: null,

      fetchUsers: async () => {
        set({ isLoading: true, error: null }, false, 'fetchUsers/start');
        try {
          const response = await fetch('/api/users');
          const users = await response.json();
          set({ users, isLoading: false }, false, 'fetchUsers/success');
        } catch (error) {
          set(
            { error: 'ユーザーの取得に失敗しました', isLoading: false },
            false,
            'fetchUsers/error'
          );
        }
      },

      addUser: async (userData) => {
        set({ isLoading: true }, false, 'addUser/start');
        try {
          const response = await fetch('/api/users', {
            method: 'POST',
            body: JSON.stringify(userData),
            headers: { 'Content-Type': 'application/json' },
          });
          const newUser = await response.json();
          set(
            (state) => ({ users: [...state.users, newUser], isLoading: false }),
            false,
            'addUser/success'
          );
        } catch (error) {
          set({ error: 'ユーザーの追加に失敗しました', isLoading: false });
        }
      },

      updateUser: async (id, updates) => {
        const previousUsers = get().users;
        // 楽観的更新
        set(
          (state) => ({
            users: state.users.map((u) => (u.id === id ? { ...u, ...updates } : u)),
          }),
          false,
          'updateUser/optimistic'
        );

        try {
          await fetch(`/api/users/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (error) {
          // ロールバック
          set({ users: previousUsers, error: '更新に失敗しました' });
        }
      },

      deleteUser: async (id) => {
        set(
          (state) => ({ users: state.users.filter((u) => u.id !== id) }),
          false,
          'deleteUser'
        );
        await fetch(`/api/users/${id}`, { method: 'DELETE' });
      },

      selectUser: (user) => set({ selectedUser: user }),
    }),
    { name: 'UserStore' }
  )
);
```

## persist middleware（状態の永続化）

```typescript
// store/useSettingsStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface Settings {
  theme: 'light' | 'dark' | 'system';
  language: 'ja' | 'en';
  fontSize: 'small' | 'medium' | 'large';
  notifications: boolean;

  // アクション
  setTheme: (theme: Settings['theme']) => void;
  setLanguage: (lang: Settings['language']) => void;
  toggleNotifications: () => void;
}

export const useSettingsStore = create<Settings>()(
  persist(
    (set) => ({
      theme: 'system',
      language: 'ja',
      fontSize: 'medium',
      notifications: true,

      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      toggleNotifications: () =>
        set((state) => ({ notifications: !state.notifications })),
    }),
    {
      name: 'app-settings', // localStorageのキー名
      storage: createJSONStorage(() => localStorage),
      // 特定のフィールドのみ永続化
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        fontSize: state.fontSize,
        notifications: state.notifications,
      }),
    }
  )
);
```

## Redux との比較

```typescript
// Redux Toolkit での同じ実装
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// thunk アクション
export const fetchUsers = createAsyncThunk('users/fetchAll', async () => {
  const response = await fetch('/api/users');
  return response.json();
});

// slice
const usersSlice = createSlice({
  name: 'users',
  initialState: { users: [], isLoading: false, error: null },
  reducers: {
    selectUser: (state, action) => {
      state.selectedUser = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => { state.isLoading = true; })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message ?? null;
      });
  },
});

// ↑ Zustand と比べてボイラープレートが多い
```

| 項目 | Zustand | Redux Toolkit | Jotai |
|---|---|---|---|
| 学習コスト | 低 | 中〜高 | 低 |
| ボイラープレート | 少 | 多 | 少 |
| DevTools | 対応 | 優秀 | 対応 |
| バンドルサイズ | ~1KB | ~40KB | ~3KB |
| 大規模アプリ | 可 | 最適 | 可 |
| 非同期処理 | シンプル | RTK Query | 原子的 |

## Jotai との比較

Jotaiはアトムベースの状態管理で、コンポーネント単位での最適化が得意です。

```typescript
// Jotai での実装
import { atom, useAtom } from 'jotai';

const countAtom = atom(0);
const doubleCountAtom = atom((get) => get(countAtom) * 2);

function Counter() {
  const [count, setCount] = useAtom(countAtom);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

// Zustand と異なり、ストアなしでアトム単位で状態を定義
// コンポーネントツリーが複雑で細粒度の更新が必要な場合に有利
```

## まとめ

Zustandが2026年のReact状態管理で選ばれる理由をまとめます。

- **シンプルなAPI**: `create` 一つで状態とアクションを定義
- **選択的サブスクライブ**: 必要な状態のみ購読で不要な再レンダリングを防止
- **middleware**: devtools・persist・immerなど豊富なミドルウェア
- **TypeScript対応**: 完全な型推論
- **軽量**: ~1KBでReduxの40分の1

小〜中規模プロジェクトはZustand、マイクロ状態管理はJotai、大規模エンタープライズはRedux Toolkitという使い分けが2026年のベストプラクティスです。

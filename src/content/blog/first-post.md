---
title: 'React Hooksを完全理解する — useState, useEffect, useCallbackの実践ガイド'
description: 'React Hooksの基本から実践的なパターンまで。useState, useEffect, useCallback, useMemoの使い方を具体的なコード例で解説。'
pubDate: 'Feb 10 2026'
heroImage: '../../assets/blog-placeholder-3.jpg'
---

React Hooksは、関数コンポーネントで状態管理や副作用を扱うための仕組みです。この記事では、最も使用頻度の高い4つのHooksを実践的なコード例で解説します。

## useState — 状態管理の基本

`useState`は最もシンプルなHookです。コンポーネント内で状態を保持し、更新できます。

```tsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>カウント: {count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
      <button onClick={() => setCount(prev => prev - 1)}>-1</button>
    </div>
  );
}
```

### よくあるパターン: オブジェクト状態の更新

```tsx
const [user, setUser] = useState({ name: '', email: '' });

// スプレッド構文で部分更新
const updateName = (name: string) => {
  setUser(prev => ({ ...prev, name }));
};
```

**注意**: `setUser({ name: '太郎' })` とすると、`email`が消えます。必ずスプレッド構文で既存のプロパティを保持してください。

## useEffect — 副作用の管理

`useEffect`は、レンダリング後に実行される副作用（API呼び出し、DOM操作、タイマーなど）を管理します。

```tsx
import { useEffect, useState } from 'react';

function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => {
        setUser(data);
        setLoading(false);
      });
  }, [userId]); // userIdが変わるたびに再実行

  if (loading) return <p>読み込み中...</p>;
  return <div>{user?.name}</div>;
}
```

### 依存配列のルール

| 依存配列 | 実行タイミング |
|---------|-------------|
| `[]` | マウント時に1回だけ |
| `[dep1, dep2]` | dep1またはdep2が変わるたびに |
| なし | 毎回のレンダリング後（非推奨） |

### クリーンアップ関数

タイマーやイベントリスナーは、コンポーネントのアンマウント時にクリーンアップが必要です。

```tsx
useEffect(() => {
  const timer = setInterval(() => {
    console.log('tick');
  }, 1000);

  // クリーンアップ: コンポーネント破棄時に実行
  return () => clearInterval(timer);
}, []);
```

## useCallback — 関数のメモ化

`useCallback`は、依存配列が変わらない限り同じ関数参照を返します。子コンポーネントへのprops渡しで不要な再レンダリングを防ぎます。

```tsx
import { useCallback, useState } from 'react';

function TodoList() {
  const [todos, setTodos] = useState<string[]>([]);

  // todosが変わるたびに新しい関数を生成
  const addTodo = useCallback((text: string) => {
    setTodos(prev => [...prev, text]);
  }, []); // setTodosは安定しているので依存不要

  return <TodoForm onAdd={addTodo} />;
}
```

### いつ使うべきか

- `React.memo`でラップされた子コンポーネントにコールバックを渡す場合
- `useEffect`の依存配列に関数を含める場合
- 高コストな計算を含む処理を安定した参照で渡したい場合

## useMemo — 計算結果のメモ化

`useMemo`は、高コストな計算結果をキャッシュします。

```tsx
import { useMemo, useState } from 'react';

function FilteredList({ items }: { items: Item[] }) {
  const [query, setQuery] = useState('');

  // itemsまたはqueryが変わった時だけ再計算
  const filtered = useMemo(() => {
    return items.filter(item =>
      item.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [items, query]);

  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <ul>
        {filtered.map(item => <li key={item.id}>{item.name}</li>)}
      </ul>
    </>
  );
}
```

## まとめ

| Hook | 用途 | ポイント |
|------|------|---------|
| `useState` | 状態管理 | オブジェクト更新時はスプレッド構文 |
| `useEffect` | 副作用 | 依存配列とクリーンアップを忘れずに |
| `useCallback` | 関数メモ化 | React.memoとセットで使う |
| `useMemo` | 計算メモ化 | 高コストな計算にのみ使用 |

Hooksを正しく使いこなすことで、パフォーマンスが高く保守しやすいReactアプリケーションを構築できます。

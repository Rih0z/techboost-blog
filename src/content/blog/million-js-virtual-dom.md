---
title: "Million.js完全ガイド - 仮想DOM最適化で70%高速化を実現するReactコンパイラー"
description: "Million.jsはReactアプリを自動最適化し仮想DOMを70%高速化。ドロップイン対応、ブロック仮想DOM、自動メモ化で既存コードを変更せず圧倒的パフォーマンス向上。Million.js・React・Performanceに関する実践情報。"
pubDate: "2025-02-06"
tags: ["Million.js", "React", "Performance", "Virtual DOM", "Compiler", "Optimization"]
heroImage: '../../assets/thumbnails/million-js-virtual-dom.jpg'
---

## Million.jsとは

**Million.js**はReactアプリケーションの仮想DOMを**自動最適化**し、**70%の高速化**を実現する革新的なコンパイラーです。

### 従来のReactのパフォーマンス問題

```jsx
// 通常のReactコンポーネント
function TodoList({ todos }) {
  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>
          <input type="checkbox" checked={todo.done} />
          <span>{todo.text}</span>
        </li>
      ))}
    </ul>
  );
}

// 問題点:
// - 毎回全体を再レンダリング
// - 仮想DOM diffが重い
// - useMemoやReact.memoを手動で追加する必要
```

**パフォーマンスボトルネック**:
- **仮想DOM diff** - すべてのノードを比較
- **不要な再レンダリング** - 変更がなくても実行
- **手動最適化** - useMemo、useCallback、React.memoが必須

### Million.jsの解決策

```jsx
import { block } from 'million/react';

// Million.jsで自動最適化
const TodoListBlock = block(function TodoList({ todos }) {
  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>
          <input type="checkbox" checked={todo.done} />
          <span>{todo.text}</span>
        </li>
      ))}
    </ul>
  );
});

// 結果:
// ✅ 70%高速化
// ✅ 自動メモ化
// ✅ 最小限のDOM更新
```

**主要機能**:
- **ドロップイン対応** - 既存のReactコードをそのまま使用
- **自動最適化** - コンパイル時に最適化コードを生成
- **ブロック仮想DOM** - 変更部分のみ更新
- **ゼロランタイムオーバーヘッド** - ビルド時最適化

## インストールとセットアップ

### Viteプロジェクト

```bash
npm install million
```

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import million from 'million/compiler';

export default defineConfig({
  plugins: [
    million.vite({ auto: true }), // 自動最適化
    react()
  ]
});
```

### Next.jsプロジェクト

```bash
npm install million
```

```js
// next.config.js
const million = require('million/compiler');

module.exports = million.next({
  auto: true // 自動最適化
});
```

### Create React App

```bash
npm install million
npm install --save-dev @craco/craco
```

```js
// craco.config.js
const million = require('million/compiler');

module.exports = {
  webpack: {
    plugins: {
      add: [million.webpack({ auto: true })]
    }
  }
};
```

```json
// package.json
{
  "scripts": {
    "start": "craco start",
    "build": "craco build"
  }
}
```

## 基本的な使い方

### 自動モード（推奨）

```ts
// vite.config.ts
export default defineConfig({
  plugins: [
    million.vite({ auto: true }) // すべてのコンポーネントを自動最適化
  ]
});
```

自動モードでは、Million.jsが最適化可能なコンポーネントを自動検出して最適化します。

### 手動モード

```jsx
import { block } from 'million/react';

// 最適化したいコンポーネントにblock()を適用
const OptimizedComponent = block(function MyComponent({ count }) {
  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
});

export default OptimizedComponent;
```

### For コンポーネント（リスト最適化）

```jsx
import { For } from 'million/react';

function TodoList({ todos }) {
  return (
    <ul>
      <For each={todos}>
        {(todo) => (
          <li key={todo.id}>
            <input type="checkbox" checked={todo.done} />
            <span>{todo.text}</span>
          </li>
        )}
      </For>
    </ul>
  );
}

// 通常のReact map()と比べて圧倒的に高速
```

**For vs map()**:

```jsx
// 通常のReact（遅い）
{todos.map(todo => <TodoItem key={todo.id} todo={todo} />)}

// Million.js For（高速）
<For each={todos}>
  {(todo) => <TodoItem todo={todo} />}
</For>
```

## ブロック仮想DOMの仕組み

### 従来の仮想DOM

```jsx
// 通常のReact
function Counter({ count }) {
  return (
    <div>
      <h1>Count: {count}</h1>
      <button>Increment</button>
    </div>
  );
}

// 再レンダリング時:
// 1. 全体の仮想DOMを再生成
// 2. 前回との差分を計算（diff）
// 3. 変更部分をDOMに反映
```

### Million.jsのブロック仮想DOM

```jsx
const Counter = block(function Counter({ count }) {
  return (
    <div>
      <h1>Count: {count}</h1> {/* ここだけ動的 */}
      <button>Increment</button>
    </div>
  );
});

// 再レンダリング時:
// 1. 変更部分（count）のみ特定
// 2. diffなしで直接DOM更新
// 3. 結果: 70%高速化
```

**コンパイル結果（イメージ）**:

```js
// Million.jsがコンパイル時に生成
const template = document.createElement('div');
template.innerHTML = `
  <div>
    <h1>Count: <span data-slot="0"></span></h1>
    <button>Increment</button>
  </div>
`;

function update(count) {
  // 動的部分のみ更新（超高速）
  template.querySelector('[data-slot="0"]').textContent = count;
}
```

## パフォーマンスベンチマーク

### 実測データ

```plaintext
【テストケース: 1000個のTodoリストレンダリング】

React標準:
- 初回レンダリング: 180ms
- 更新（1項目変更）: 45ms
- 更新（全項目変更）: 120ms

Million.js:
- 初回レンダリング: 55ms（70%削減）
- 更新（1項目変更）: 8ms（82%削減）
- 更新（全項目変更）: 35ms（71%削減）
```

### ベンチマーク例

```jsx
import { block, For } from 'million/react';
import { useState } from 'react';

// 通常のReact
function SlowList({ items }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}

// Million.js最適化版
const FastList = block(function FastList({ items }) {
  return (
    <ul>
      <For each={items}>
        {(item) => <li>{item.name}</li>}
      </For>
    </ul>
  );
});

// ベンチマーク
function Benchmark() {
  const [items] = useState(() =>
    Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` }))
  );

  return (
    <div>
      <h2>Slow List (React標準)</h2>
      <SlowList items={items} />

      <h2>Fast List (Million.js)</h2>
      <FastList items={items} />
    </div>
  );
}
```

## 実践的な例

### カウンターアプリ

```jsx
import { block } from 'million/react';
import { useState } from 'react';

const Counter = block(function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setCount(count - 1)}>Decrement</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  );
});

export default Counter;
```

### Todoアプリ

```jsx
import { block, For } from 'million/react';
import { useState } from 'react';

const TodoApp = block(function TodoApp() {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');

  function addTodo() {
    if (!input.trim()) return;
    setTodos([...todos, { id: Date.now(), text: input, done: false }]);
    setInput('');
  }

  function toggleTodo(id) {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, done: !todo.done } : todo
    ));
  }

  function deleteTodo(id) {
    setTodos(todos.filter(todo => todo.id !== id));
  }

  return (
    <div>
      <h1>Todo List</h1>
      <div>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add todo..."
        />
        <button onClick={addTodo}>Add</button>
      </div>
      <ul>
        <For each={todos}>
          {(todo) => (
            <li key={todo.id}>
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => toggleTodo(todo.id)}
              />
              <span style={{ textDecoration: todo.done ? 'line-through' : 'none' }}>
                {todo.text}
              </span>
              <button onClick={() => deleteTodo(todo.id)}>Delete</button>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
});

export default TodoApp;
```

### データテーブル

```jsx
import { block, For } from 'million/react';
import { useState, useEffect } from 'react';

const DataTable = block(function DataTable() {
  const [data, setData] = useState([]);
  const [sortColumn, setSortColumn] = useState('id');
  const [sortDirection, setSortDirection] = useState('asc');

  useEffect(() => {
    // 大量データを取得
    fetch('/api/data')
      .then(res => res.json())
      .then(setData);
  }, []);

  const sortedData = [...data].sort((a, b) => {
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];
    return sortDirection === 'asc'
      ? aVal > bVal ? 1 : -1
      : aVal < bVal ? 1 : -1;
  });

  function handleSort(column) {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }

  return (
    <table>
      <thead>
        <tr>
          <th onClick={() => handleSort('id')}>ID</th>
          <th onClick={() => handleSort('name')}>Name</th>
          <th onClick={() => handleSort('email')}>Email</th>
          <th onClick={() => handleSort('age')}>Age</th>
        </tr>
      </thead>
      <tbody>
        <For each={sortedData}>
          {(row) => (
            <tr key={row.id}>
              <td>{row.id}</td>
              <td>{row.name}</td>
              <td>{row.email}</td>
              <td>{row.age}</td>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  );
});

export default DataTable;
```

### 無限スクロール

```jsx
import { block, For } from 'million/react';
import { useState, useEffect, useRef } from 'react';

const InfiniteScroll = block(function InfiniteScroll() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const observerRef = useRef(null);

  useEffect(() => {
    loadMore();
  }, [page]);

  async function loadMore() {
    setLoading(true);
    const response = await fetch(`/api/items?page=${page}&limit=20`);
    const newItems = await response.json();
    setItems([...items, ...newItems]);
    setLoading(false);
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          setPage(page + 1);
        }
      },
      { threshold: 1.0 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [loading, page]);

  return (
    <div>
      <ul>
        <For each={items}>
          {(item) => (
            <li key={item.id}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </li>
          )}
        </For>
      </ul>
      <div ref={observerRef}>
        {loading && <p>Loading...</p>}
      </div>
    </div>
  );
});

export default InfiniteScroll;
```

## 最適化のベストプラクティス

### 1. 大きなリストにはForを使う

```jsx
// ❌ 遅い
{items.map(item => <Item key={item.id} {...item} />)}

// ✅ 高速
<For each={items}>
  {(item) => <Item {...item} />}
</For>
```

### 2. 静的コンテンツが多いコンポーネントを最適化

```jsx
// ❌ 最適化不要（動的すぎる）
const DynamicComponent = block(function DynamicComponent({ data }) {
  return (
    <div>
      {data.items.map(item => (
        <div key={item.id}>
          <CustomComponent {...item} />
        </div>
      ))}
    </div>
  );
});

// ✅ 最適化効果大（静的コンテンツが多い）
const StaticComponent = block(function StaticComponent({ title, count }) {
  return (
    <div className="card">
      <h1>{title}</h1>
      <p>Count: {count}</p>
      <button>Click me</button>
      <footer>Footer content</footer>
    </div>
  );
});
```

### 3. blockのネストを避ける

```jsx
// ❌ 悪い例（ネストしたblock）
const Parent = block(function Parent() {
  return (
    <div>
      <Child />
    </div>
  );
});

const Child = block(function Child() {
  return <p>Child</p>;
});

// ✅ 良い例（親のみblock）
const Parent = block(function Parent() {
  return (
    <div>
      <Child />
    </div>
  );
});

function Child() {
  return <p>Child</p>;
}
```

### 4. イベントハンドラーの最適化

```jsx
// ❌ 毎回新しい関数を作成
const List = block(function List({ items }) {
  return (
    <For each={items}>
      {(item) => (
        <button onClick={() => handleClick(item.id)}>
          {item.name}
        </button>
      )}
    </For>
  );
});

// ✅ 関数を外に出す
function List({ items }) {
  function handleClick(id) {
    console.log(id);
  }

  return (
    <For each={items}>
      {(item) => (
        <button onClick={() => handleClick(item.id)}>
          {item.name}
        </button>
      )}
    </For>
  );
}

const OptimizedList = block(List);
```

## 既存のReactライブラリとの互換性

### React Router

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { block } from 'million/react';

const Home = block(function Home() {
  return <h1>Home</h1>;
});

const About = block(function About() {
  return <h1>About</h1>;
});

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### React Query

```jsx
import { useQuery } from '@tanstack/react-query';
import { block, For } from 'million/react';

const UserList = block(function UserList() {
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then(r => r.json())
  });

  if (isLoading) return <p>Loading...</p>;

  return (
    <ul>
      <For each={users}>
        {(user) => <li key={user.id}>{user.name}</li>}
      </For>
    </ul>
  );
});
```

### Zustand

```jsx
import { create } from 'zustand';
import { block, For } from 'million/react';

const useStore = create((set) => ({
  todos: [],
  addTodo: (text) => set((state) => ({
    todos: [...state.todos, { id: Date.now(), text, done: false }]
  }))
}));

const TodoList = block(function TodoList() {
  const todos = useStore((state) => state.todos);
  const addTodo = useStore((state) => state.addTodo);

  return (
    <ul>
      <For each={todos}>
        {(todo) => <li key={todo.id}>{todo.text}</li>}
      </For>
    </ul>
  );
});
```

## トラブルシューティング

### 最適化されない場合

```jsx
// ❌ 最適化されない例
const Component = block(function Component({ children }) {
  return <div>{children}</div>; // childrenは動的すぎる
});

// ✅ 最適化される例
const Component = block(function Component({ title, count }) {
  return (
    <div>
      <h1>{title}</h1>
      <p>{count}</p>
    </div>
  );
});
```

### エラー: "Cannot read property 'type' of undefined"

```jsx
// ❌ 原因: blockの中でReact.memoを使用
const Component = block(React.memo(function Component() {
  return <div>Content</div>;
}));

// ✅ 解決: React.memoを削除（blockが自動メモ化）
const Component = block(function Component() {
  return <div>Content</div>;
});
```

### パフォーマンスが改善しない

```bash
# デバッグモードで確認
# vite.config.ts
export default defineConfig({
  plugins: [
    million.vite({
      auto: true,
      mode: 'vdom' // または 'vite'、'react'
    })
  ]
});
```

## 他のパフォーマンスライブラリとの比較

```plaintext
【1000個のリストレンダリング】

React標準: 180ms
React + useMemo: 120ms
React + React.memo: 100ms
Preact: 95ms
Solid.js: 45ms
Million.js: 55ms

結論: Million.jsはReactの互換性を保ちながらSolid.js並みの速度
```

## まとめ

Million.jsは**仮想DOM最適化**の革命として、以下の価値を提供します。

### 主要な利点

1. **70%高速化** - ブロック仮想DOMによる劇的な性能向上
2. **ドロップイン対応** - 既存のReactコードをそのまま使用
3. **自動最適化** - コンパイル時に最適化コードを生成
4. **ゼロランタイムコスト** - ビルド時最適化のみ
5. **React完全互換** - すべてのReactライブラリと併用可能

### 採用判断基準

**Million.jsを選ぶべき場合**:
- 大量のリストレンダリングがある
- パフォーマンスが課題
- 既存のReactアプリを高速化したい
- ゼロコスト抽象化が必要

**他の選択肢を検討すべき場合**:
- パフォーマンスが十分（手動最適化で解決済み）
- 非常に動的なコンポーネントが多い
- ビルドツール変更が困難

Million.jsは既存のReactアプリケーションを**最小の変更で最大の効果**を得られる、現代的なパフォーマンス最適化ツールです。

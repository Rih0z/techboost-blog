---
title: 'Million.js完全ガイド - React仮想DOMを最適化する次世代コンパイラ'
description: 'Million.jsの基礎から実践まで徹底解説。React仮想DOM最適化、自動コンパイラ、70%高速化の仕組み、導入方法、パフォーマンスベンチマーク、実践的な活用事例を完全網羅。'
pubDate: 'Feb 05 2026'
tags: ['React', 'Performance', 'Million.js', 'Optimization', 'Compiler']
---

# Million.js完全ガイド

## はじめに

Million.js（ミリオンジェイエス）は、2023年に登場し、2026年現在、**Reactアプリケーションのパフォーマンス最適化**における標準ツールとして急速に普及しています。

### Million.jsとは

Million.jsは、**Reactの仮想DOMを最適化する軽量コンパイラ**で、以下の特徴があります。

- **70%高速化**: レンダリング速度が最大70%向上
- **自動最適化**: コンパイル時に自動で最適化
- **ゼロランタイムコスト**: バンドルサイズ増加なし（<1KB）
- **既存コード改変不要**: 既存Reactコードをそのまま使用可能
- **React互換**: Hooks、Server Components対応
- **Next.js/Vite対応**: 主要フレームワークと統合

### 仮想DOMの問題点

Reactの仮想DOMは便利ですが、パフォーマンスのボトルネックになります。

```
問題1: 差分計算のコスト
  全コンポーネントツリーを毎回比較
  → 大規模アプリで遅延発生

問題2: 不要な再レンダリング
  親コンポーネントが再レンダリングすると子も再レンダリング
  → useMemo/useCallbackで回避が必要

問題3: メモリ消費
  仮想DOMツリー全体をメモリに保持
  → メモリ使用量が増大
```

### Million.jsの解決策

Million.jsは**コンパイル時に静的解析**を行い、以下を実現します。

```
解決策1: 静的部分の検出
  変更されない部分を事前に識別
  → 差分計算をスキップ

解決策2: Block Virtual DOM
  変更される部分のみを追跡
  → 最小限の更新で済む

解決策3: 自動最適化
  開発者が何もしなくても最適化
  → useMemoを書く必要なし
```

## セットアップ

### Next.jsでのインストール

```bash
# Next.jsプロジェクトでインストール
npm install million

# または
pnpm add million
yarn add million
```

### next.config.jsの設定

```javascript
// next.config.js
const million = require('million/compiler');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = million.next(nextConfig, {
  auto: true, // 自動最適化を有効化
});
```

### Viteでのインストール

```bash
# Viteプロジェクトでインストール
npm install million
```

### vite.config.tsの設定

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import million from 'million/compiler';

export default defineConfig({
  plugins: [
    million.vite({ auto: true }),
    react(),
  ],
});
```

### Create React Appでの使用

```bash
# インストール
npm install million

# ejectが必要（CRAの制限）
npm run eject
```

```javascript
// webpack.config.js
const million = require('million/compiler');

module.exports = million.webpack({
  auto: true,
})(webpackConfig);
```

## 基本的な使い方

### 自動最適化（Auto Mode）

最も簡単な使い方は`auto: true`を設定するだけです。

```javascript
// next.config.js
module.exports = million.next(nextConfig, {
  auto: true,
});
```

これだけで、Million.jsが自動的にコンポーネントを解析し、最適化可能な部分を最適化します。

### 手動最適化（Block Mode）

特定のコンポーネントを明示的に最適化することも可能です。

```jsx
// components/UserCard.jsx
import { block } from 'million/react';

function UserCard({ name, email, avatar }) {
  return (
    <div className="user-card">
      <img src={avatar} alt={name} />
      <h2>{name}</h2>
      <p>{email}</p>
    </div>
  );
}

// Million.jsで最適化
export default block(UserCard);
```

### Forループの最適化

リスト表示は特にパフォーマンスの影響が大きいため、`For`コンポーネントを使います。

```jsx
import { For } from 'million/react';

function UserList({ users }) {
  return (
    <div>
      <For each={users}>
        {(user) => (
          <div key={user.id}>
            <h3>{user.name}</h3>
            <p>{user.email}</p>
          </div>
        )}
      </For>
    </div>
  );
}
```

### React標準のmapとの比較

```jsx
// ❌ React標準（遅い）
function UserList({ users }) {
  return (
    <div>
      {users.map(user => (
        <div key={user.id}>
          <h3>{user.name}</h3>
          <p>{user.email}</p>
        </div>
      ))}
    </div>
  );
}

// ✅ Million.js（速い）
import { For } from 'million/react';

function UserList({ users }) {
  return (
    <div>
      <For each={users}>
        {(user) => (
          <div key={user.id}>
            <h3>{user.name}</h3>
            <p>{user.email}</p>
          </div>
        )}
      </For>
    </div>
  );
}
```

## Block Virtual DOMの仕組み

### 従来の仮想DOM

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Counter</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  );
}
```

Reactの仮想DOM:

```
再レンダリング時:
1. 全体の仮想DOMを生成
2. 前回の仮想DOMと比較（diff）
3. 変更部分のみを実DOMに反映

問題: <h1>やbuttonは変わらないのに、毎回diffしている
```

### Block Virtual DOM

Million.jsの最適化:

```
コンパイル時の解析:
1. 静的部分を検出（<h1>、button）
2. 動的部分を検出（{count}）
3. 動的部分のみを追跡するコードに変換

再レンダリング時:
1. 動的部分（{count}）のみ更新
2. 静的部分はスキップ

結果: 差分計算が70%削減される
```

### コンパイル前後の比較

```jsx
// 元のコード
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <h1>Counter</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  );
}
```

```javascript
// Million.jsコンパイル後（簡略化）
function Counter() {
  const [count, setCount] = useState(0);

  // 静的部分は一度だけ生成
  const staticTree = createStaticTree(`
    <div>
      <h1>Counter</h1>
      <p>Count: $$SLOT$$</p>
      <button>+</button>
    </div>
  `);

  // 動的部分のみ更新
  updateSlot(staticTree, 0, count);

  return staticTree;
}
```

## パフォーマンスベンチマーク

### 公式ベンチマーク結果

```
テスト環境: 10,000要素のリストレンダリング

React (標準):           2,340ms
React + useMemo:        1,850ms
React + Million.js:       680ms  (70%高速化)
Svelte:                   720ms
Solid.js:                 650ms

結果: Million.jsはReactのまま、Svelte/Solid並みの速度を実現
```

### 実測例1: TodoListアプリ

```jsx
// components/TodoList.jsx
import { For } from 'million/react';

function TodoList({ todos, onToggle }) {
  return (
    <ul>
      <For each={todos}>
        {(todo) => (
          <li key={todo.id} onClick={() => onToggle(todo.id)}>
            <input type="checkbox" checked={todo.done} readOnly />
            <span style={{ textDecoration: todo.done ? 'line-through' : 'none' }}>
              {todo.text}
            </span>
          </li>
        )}
      </For>
    </ul>
  );
}
```

**結果**:

```
1,000個のTodo表示:
  React標準:      180ms
  Million.js:      52ms (3.5倍高速化)

10,000個のTodo表示:
  React標準:    2,340ms
  Million.js:     680ms (3.4倍高速化)
```

### 実測例2: データテーブル

```jsx
import { For } from 'million/react';
import { block } from 'million/react';

const TableRow = block(({ row }) => (
  <tr>
    <td>{row.id}</td>
    <td>{row.name}</td>
    <td>{row.email}</td>
    <td>{row.age}</td>
  </tr>
));

function DataTable({ data }) {
  return (
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Email</th>
          <th>Age</th>
        </tr>
      </thead>
      <tbody>
        <For each={data}>
          {(row) => <TableRow row={row} />}
        </For>
      </tbody>
    </table>
  );
}
```

**結果**:

```
5,000行のテーブル表示:
  React標準:    1,120ms
  Million.js:     320ms (3.5倍高速化)
```

### バンドルサイズへの影響

```
React標準アプリ:          142.3 KB
Million.js追加後:         142.8 KB (+0.5KB)

影響: ほぼゼロ（コンパイル時最適化のため）
```

## 最適化のベストプラクティス

### ルール1: 大量レンダリングには`For`を使う

```jsx
// ❌ 避けるべき
{items.map(item => <Item key={item.id} {...item} />)}

// ✅ 推奨
<For each={items}>
  {(item) => <Item {...item} />}
</For>
```

### ルール2: 純粋なコンポーネントに`block`を使う

```jsx
// ✅ blockに適している（純粋）
const UserCard = block(({ name, email }) => (
  <div>
    <h3>{name}</h3>
    <p>{email}</p>
  </div>
));

// ❌ blockに適していない（副作用あり）
const UserCard = block(({ userId }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);

  return <div>{user?.name}</div>;
});
```

### ルール3: 静的部分と動的部分を分離

```jsx
// ❌ 全体が再レンダリング
function Header({ user }) {
  return (
    <header>
      <h1>My App</h1>
      <nav>
        <a href="/">Home</a>
        <a href="/about">About</a>
      </nav>
      <div>Welcome, {user.name}</div>
    </header>
  );
}

// ✅ 動的部分のみ最適化
const UserGreeting = block(({ name }) => (
  <div>Welcome, {name}</div>
));

function Header({ user }) {
  return (
    <header>
      <h1>My App</h1>
      <nav>
        <a href="/">Home</a>
        <a href="/about">About</a>
      </nav>
      <UserGreeting name={user.name} />
    </header>
  );
}
```

### ルール4: Hooksは通常通り使用可能

```jsx
// ✅ useState/useEffectも問題なく動作
const Counter = block(() => {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  );
});
```

### ルール5: 条件分岐にも対応

```jsx
const ConditionalComponent = block(({ isLoggedIn, user }) => {
  if (!isLoggedIn) {
    return <div>Please login</div>;
  }

  return (
    <div>
      <h2>Welcome, {user.name}</h2>
      <p>Email: {user.email}</p>
    </div>
  );
});
```

## Next.js統合

### App Router（Server Components）

```jsx
// app/users/page.jsx
import { For } from 'million/react';

async function getUsersFromDB() {
  // サーバーサイドでデータ取得
  const users = await db.select().from(usersTable);
  return users;
}

export default async function UsersPage() {
  const users = await getUsersFromDB();

  return (
    <div>
      <h1>Users</h1>
      <For each={users}>
        {(user) => (
          <div key={user.id}>
            <h3>{user.name}</h3>
            <p>{user.email}</p>
          </div>
        )}
      </For>
    </div>
  );
}
```

### Client Components

```jsx
// components/InteractiveList.jsx
'use client';

import { useState } from 'react';
import { For } from 'million/react';
import { block } from 'million/react';

const ListItem = block(({ item, onDelete }) => (
  <li>
    {item.text}
    <button onClick={() => onDelete(item.id)}>Delete</button>
  </li>
));

export default function InteractiveList({ initialItems }) {
  const [items, setItems] = useState(initialItems);

  const handleDelete = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  return (
    <ul>
      <For each={items}>
        {(item) => <ListItem item={item} onDelete={handleDelete} />}
      </For>
    </ul>
  );
}
```

### API Routes

```javascript
// app/api/users/route.js
export async function GET() {
  const users = await db.select().from(usersTable);
  return Response.json(users);
}
```

Million.jsはサーバー側には影響せず、クライアント側の最適化のみ行います。

## Vite統合

### 基本的な使い方

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import million from 'million/compiler';

export default defineConfig({
  plugins: [
    million.vite({ auto: true }),
    react(),
  ],
});
```

### React Router統合

```jsx
// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { For } from 'million/react';
import Home from './pages/Home';
import Users from './pages/Users';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/users" element={<Users />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

### React Query統合

```jsx
import { useQuery } from '@tanstack/react-query';
import { For } from 'million/react';
import { block } from 'million/react';

const UserCard = block(({ user }) => (
  <div>
    <h3>{user.name}</h3>
    <p>{user.email}</p>
  </div>
));

function Users() {
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then(res => res.json()),
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Users</h1>
      <For each={users}>
        {(user) => <UserCard user={user} />}
      </For>
    </div>
  );
}
```

## 実践的なパターン

### パターン1: 無限スクロール

```jsx
import { useInfiniteQuery } from '@tanstack/react-query';
import { For } from 'million/react';
import { block } from 'million/react';

const PostCard = block(({ post }) => (
  <article>
    <h2>{post.title}</h2>
    <p>{post.excerpt}</p>
  </article>
));

function InfiniteScrollPosts() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: ({ pageParam = 0 }) =>
      fetch(`/api/posts?page=${pageParam}`).then(res => res.json()),
    getNextPageParam: (lastPage, pages) =>
      lastPage.hasMore ? pages.length : undefined,
  });

  const posts = data?.pages.flatMap(page => page.posts) ?? [];

  return (
    <div>
      <For each={posts}>
        {(post) => <PostCard post={post} />}
      </For>
      {hasNextPage && (
        <button onClick={() => fetchNextPage()}>Load More</button>
      )}
    </div>
  );
}
```

### パターン2: リアルタイムチャット

```jsx
import { useState, useEffect } from 'react';
import { For } from 'million/react';
import { block } from 'million/react';

const Message = block(({ message }) => (
  <div className="message">
    <strong>{message.user}</strong>: {message.text}
  </div>
));

function Chat() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3000');

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages(prev => [...prev, message]);
    };

    return () => ws.close();
  }, []);

  return (
    <div>
      <div className="messages">
        <For each={messages}>
          {(message) => <Message message={message} />}
        </For>
      </div>
    </div>
  );
}
```

### パターン3: 仮想スクロール

```jsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { block } from 'million/react';

const Row = block(({ item }) => (
  <div style={{ height: '50px' }}>
    {item.name}
  </div>
));

function VirtualList({ items }) {
  const parentRef = useRef();

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div ref={parentRef} style={{ height: '500px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <Row item={items[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

## デバッグとトラブルシューティング

### 最適化の確認

```bash
# ビルド時に最適化ログを出力
MILLION_DEBUG=true npm run build
```

出力例:

```
✓ Optimized: components/UserCard.jsx (block)
✓ Optimized: components/UserList.jsx (For)
✗ Skipped: components/ComplexForm.jsx (contains useEffect)
```

### よくあるエラー1: blockが動作しない

```
エラー: Component does not render with block

原因: コンポーネントに副作用がある

解決策: 副作用を持つコンポーネントはblockを使わない
```

```jsx
// ❌ blockに適していない
const UserProfile = block(({ userId }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch(`/api/users/${userId}`).then(res => res.json()).then(setUser);
  }, [userId]);

  return <div>{user?.name}</div>;
});

// ✅ 親コンポーネントでデータ取得
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch(`/api/users/${userId}`).then(res => res.json()).then(setUser);
  }, [userId]);

  if (!user) return <div>Loading...</div>;

  return <UserProfileDisplay user={user} />;
}

const UserProfileDisplay = block(({ user }) => (
  <div>
    <h2>{user.name}</h2>
    <p>{user.email}</p>
  </div>
));
```

### よくあるエラー2: Forが動作しない

```
エラー: For component requires 'each' prop

解決策: eachプロップに配列を渡す
```

```jsx
// ❌ 間違い
<For>{items.map(item => <div>{item}</div>)}</For>

// ✅ 正しい
<For each={items}>
  {(item) => <div>{item}</div>}
</For>
```

### パフォーマンス測定

```jsx
import { Profiler } from 'react';

function App() {
  const onRender = (id, phase, actualDuration) => {
    console.log(`${id} (${phase}): ${actualDuration}ms`);
  };

  return (
    <Profiler id="UserList" onRender={onRender}>
      <UserList />
    </Profiler>
  );
}
```

## まとめ

### Million.jsの強み

1. **高速**: React標準より最大70%高速化
2. **簡単**: 既存コードをほぼそのまま使える
3. **軽量**: バンドルサイズ増加が<1KB
4. **自動**: auto modeで自動最適化
5. **互換性**: React Hooks、Next.js対応

### いつMillion.jsを使うべきか

- 大量のリストレンダリングがある
- データテーブルを表示する
- リアルタイム更新が多い
- パフォーマンスがボトルネックになっている
- バンドルサイズを増やしたくない

### いつMillion.jsを避けるべきか

- アプリが十分に速い
- コンポーネント数が少ない
- 副作用（useEffect等）が多い

### ベストプラクティス

- `auto: true`でまず試す
- 大量レンダリングには`For`を使う
- 純粋なコンポーネントに`block`を使う
- パフォーマンス測定して効果を確認

### 次のステップ

- 公式ドキュメント: https://million.dev/
- GitHub: https://github.com/aidenybai/million
- Discord: コミュニティに参加
- ベンチマーク: https://million.dev/benchmarks

Million.jsで、Reactアプリケーションを次のレベルに引き上げましょう。

---
title: 'Next.js App Routerの使い方 — Server ComponentsとClient Componentsの違い'
description: 'Next.js 13以降のApp Routerを徹底解説。Server ComponentsとClient Componentsの使い分け、データフェッチ、Server Actionsまで。'
pubDate: 'Feb 12 2026'
heroImage: '../../assets/blog-placeholder-2.jpg'
---

Next.js 13で導入されたApp Routerは、Reactのサーバーコンポーネントを活用した新しいルーティングシステムです。この記事では、App Routerの基本から実践的なパターンまでを解説します。

## ファイルベースルーティング

App Routerでは、`app/`ディレクトリ内のフォルダ構造がそのままURLになります。

```
app/
├── page.tsx          → /
├── about/
│   └── page.tsx      → /about
├── blog/
│   ├── page.tsx      → /blog
│   └── [slug]/
│       └── page.tsx  → /blog/hello-world
├── layout.tsx        → 全ページ共通レイアウト
└── loading.tsx       → ローディングUI
```

### 特殊ファイル

| ファイル | 役割 |
|---------|------|
| `page.tsx` | ページのUI |
| `layout.tsx` | 共有レイアウト（再レンダリングされない） |
| `loading.tsx` | Suspenseベースのローディング |
| `error.tsx` | エラーバウンダリ |
| `not-found.tsx` | 404ページ |

## Server Components vs Client Components

App Routerの最大の特徴は、**デフォルトでServer Components**であることです。

### Server Components（デフォルト）

```tsx
// app/posts/page.tsx — Server Component（デフォルト）
async function PostsPage() {
  // サーバーサイドで直接データベースにアクセスできる
  const posts = await db.post.findMany();

  return (
    <ul>
      {posts.map(post => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}

export default PostsPage;
```

**Server Componentsのメリット**:
- データベースに直接アクセス可能
- APIキーなどの秘密情報をクライアントに露出しない
- JavaScriptバンドルサイズが減る（クライアントに送信されない）
- 初期表示が高速

### Client Components

```tsx
'use client'; // この宣言が必要

import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>カウント: {count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}
```

**Client Componentsが必要な場面**:
- `useState`, `useEffect` などのReact Hooksを使う
- ブラウザAPI（`window`, `document`）にアクセスする
- イベントリスナー（`onClick`, `onChange`）を使う
- `useRouter`などのクライアントサイドナビゲーション

### 使い分けの判断基準

| 要件 | Server | Client |
|------|--------|--------|
| データフェッチ | ○ | △（useEffect経由） |
| データベース直接アクセス | ○ | × |
| インタラクティブUI | × | ○ |
| ブラウザAPI | × | ○ |
| Hooks | × | ○ |
| 秘密情報の保持 | ○ | × |

## データフェッチ

Server Componentsでは、`async/await`で直接データを取得できます。

```tsx
// app/users/page.tsx
interface User {
  id: number;
  name: string;
  email: string;
}

async function UsersPage() {
  const res = await fetch('https://api.example.com/users', {
    next: { revalidate: 3600 }, // 1時間キャッシュ
  });
  const users: User[] = await res.json();

  return (
    <div>
      <h1>ユーザー一覧</h1>
      {users.map(user => (
        <div key={user.id}>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
        </div>
      ))}
    </div>
  );
}

export default UsersPage;
```

### キャッシュ戦略

```tsx
// 静的: ビルド時に1回だけ取得
fetch(url, { cache: 'force-cache' });

// 動的: リクエストのたびに取得
fetch(url, { cache: 'no-store' });

// 時間ベース: 指定秒後に再検証
fetch(url, { next: { revalidate: 60 } });
```

## Server Actions

Server Actionsは、フォーム送信やデータ変更をサーバーサイドで処理する仕組みです。

```tsx
// app/contact/page.tsx
async function ContactPage() {
  async function submitForm(formData: FormData) {
    'use server';

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const message = formData.get('message') as string;

    // データベースに保存
    await db.contact.create({
      data: { name, email, message },
    });
  }

  return (
    <form action={submitForm}>
      <input name="name" placeholder="お名前" required />
      <input name="email" type="email" placeholder="メール" required />
      <textarea name="message" placeholder="メッセージ" required />
      <button type="submit">送信</button>
    </form>
  );
}

export default ContactPage;
```

### Client ComponentからServer Actionを呼ぶ

```tsx
// actions.ts
'use server';

export async function addTodo(title: string) {
  await db.todo.create({ data: { title } });
}
```

```tsx
// components/TodoForm.tsx
'use client';

import { useState } from 'react';
import { addTodo } from './actions';

export function TodoForm() {
  const [title, setTitle] = useState('');

  return (
    <form action={async () => {
      await addTodo(title);
      setTitle('');
    }}>
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="新しいTodo"
      />
      <button type="submit">追加</button>
    </form>
  );
}
```

## レイアウトとテンプレート

```tsx
// app/layout.tsx — ルートレイアウト
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <header>
          <nav>ナビゲーション</nav>
        </header>
        <main>{children}</main>
        <footer>フッター</footer>
      </body>
    </html>
  );
}
```

レイアウトはページ遷移時に**再レンダリングされません**。状態が保持されるため、ナビゲーションが高速になります。

## まとめ

| 機能 | 説明 | ポイント |
|------|------|---------|
| App Router | ファイルベースルーティング | `app/`ディレクトリ構造 = URL |
| Server Components | サーバーで実行 | デフォルト。DBアクセス可、バンドルサイズ削減 |
| Client Components | ブラウザで実行 | `'use client'`宣言。Hooks・イベント使用時 |
| Server Actions | サーバー側の処理 | `'use server'`宣言。フォーム送信・データ変更 |
| レイアウト | 共有UI | 再レンダリングされず状態保持 |

App Routerを使いこなすことで、パフォーマンスに優れ、開発体験も良いWebアプリケーションを構築できます。

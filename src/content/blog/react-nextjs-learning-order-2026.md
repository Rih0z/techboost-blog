---
title: "React/Next.js学習の正しい順番2026：挫折しない段階的アプローチ"
description: "React/Next.js学習の正しい順番を段階的に解説。HTML/CSSからReact Hooks、Next.js App Routerまで各段階のミニプロジェクト例とコード付きで挫折しない学習法を紹介。"
pubDate: "2026-03-06"
tags: ['React', 'Next.js', 'school', 'TypeScript']
---

### はじめに：React/Next.js学習で挫折する本当の原因

React/Next.jsの学習で挫折する最大の原因は、**学習順序の間違い**です。

よくある失敗パターンを示します。

- HTML/CSSの基本を理解していないのにReactを始める
- JavaScriptの基礎が不十分なままJSXを書こうとする
- React Hooksを理解する前にNext.jsのApp Routerに手を出す
- 状態管理ライブラリ（Redux等）を最初から導入しようとする

この記事では、完全な初心者がNext.jsで実用的なWebアプリケーションを作れるようになるまでの正しい学習順序を、各段階のミニプロジェクト付きで解説します。

---

### 学習ロードマップの全体像

以下の7つのステップを順番に進めます。前のステップを飛ばさないことが重要です。

| ステップ | 内容 | 目安期間 | 前提知識 |
|---------|------|---------|---------|
| Step 1 | HTML/CSSの基本 | 2-3週間 | なし |
| Step 2 | JavaScriptの基礎 | 3-4週間 | Step 1 |
| Step 3 | React基礎（コンポーネント） | 2-3週間 | Step 2 |
| Step 4 | React Hooks | 2-3週間 | Step 3 |
| Step 5 | 状態管理とデータ取得 | 2-3週間 | Step 4 |
| Step 6 | Next.js App Router | 3-4週間 | Step 5 |
| Step 7 | 実プロジェクト構築 | 4-6週間 | Step 6 |

合計: 約18-26週間（4.5-6.5ヶ月）

---

### Step 1: HTML/CSSの基本（2-3週間）

#### なぜReactの前にHTML/CSSが必要なのか

Reactは最終的にHTMLを生成します。ReactのJSXはHTMLの構文をベースにしているため、HTMLを理解していないとJSXも理解できません。

#### 学習すべき項目

```html
<!-- セマンティックHTML -->
<main>
  <article>
    <header>
      <h1>記事タイトル</h1>
      <time datetime="2026-03-06">2026年3月6日</time>
    </header>
    <p>記事の本文です。</p>
    <footer>
      <p>著者: 田中太郎</p>
    </footer>
  </article>
</main>

<!-- フォーム要素 -->
<form>
  <div>
    <label for="email">メールアドレス</label>
    <input type="email" id="email" name="email" required />
  </div>
  <div>
    <label for="password">パスワード</label>
    <input type="password" id="password" name="password" minlength="8" required />
  </div>
  <button type="submit">ログイン</button>
</form>
```

#### CSSで重点的に学ぶべきこと

```css
/* Flexbox: 1次元レイアウト */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: #1e293b;
  color: #f8fafc;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
  list-style: none;
}

/* CSS Grid: 2次元レイアウト */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  padding: 2rem;
}

/* レスポンシブデザイン */
@media (max-width: 768px) {
  .navbar {
    flex-direction: column;
    gap: 1rem;
  }

  .card-grid {
    grid-template-columns: 1fr;
  }
}

/* CSS変数（カスタムプロパティ） */
:root {
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --radius: 0.5rem;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.button {
  background-color: var(--color-primary);
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  transition: background-color 0.2s;
}

.button:hover {
  background-color: var(--color-primary-hover);
}
```

#### ミニプロジェクト: プロフィールカード

HTMLとCSSだけで、レスポンシブなプロフィールカードを作成してください。

要件:
- プロフィール画像（丸形）
- 名前、肩書き、自己紹介文
- SNSリンクアイコン
- ダークモード対応
- モバイルでも崩れないレイアウト

---

### Step 2: JavaScriptの基礎（3-4週間）

#### Reactに必要なJavaScript知識

Reactを始める前に、以下のJavaScript機能を確実に理解する必要があります。

```javascript
// 1. アロー関数
const greet = (name) => `こんにちは、${name}さん`;

// 2. 分割代入（Reactのpropsで頻繁に使用）
const user = { name: '田中', age: 30, role: 'developer' };
const { name, age } = user;

const numbers = [1, 2, 3, 4, 5];
const [first, second, ...rest] = numbers;

// 3. スプレッド構文（Reactの状態更新で必須）
const updatedUser = { ...user, age: 31 };
const newArray = [...numbers, 6];

// 4. テンプレートリテラル
const message = `${name}さんは${age}歳です`;

// 5. 配列メソッド（map, filter, reduce）
// Reactのリスト表示で必須
const items = [
  { id: 1, name: 'りんご', price: 150, inStock: true },
  { id: 2, name: 'バナナ', price: 100, inStock: true },
  { id: 3, name: 'みかん', price: 200, inStock: false }
];

// mapで変換
const itemNames = items.map(item => item.name);
// ['りんご', 'バナナ', 'みかん']

// filterで絞り込み
const inStockItems = items.filter(item => item.inStock);
// [{ id: 1, ... }, { id: 2, ... }]

// reduceで集計
const totalPrice = items
  .filter(item => item.inStock)
  .reduce((sum, item) => sum + item.price, 0);
// 250

// 6. Promiseとasync/await
async function fetchPosts() {
  try {
    const response = await fetch('https://jsonplaceholder.typicode.com/posts');
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    const posts = await response.json();
    return posts;
  } catch (error) {
    console.error('取得エラー:', error);
    return [];
  }
}

// 7. モジュール（import/export）
// utils.js
export function formatDate(date) {
  return new Date(date).toLocaleDateString('ja-JP');
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY'
  }).format(amount);
}
```

#### ミニプロジェクト: Todoリスト（Vanilla JS版）

ReactなしのJavaScriptでTodoリストを作成します。この経験があると、Reactの便利さが理解できます。

```javascript
// todo-app.js
class TodoApp {
  constructor() {
    this.todos = JSON.parse(localStorage.getItem('todos') || '[]');
    this.filter = 'all'; // all, active, completed
    this.init();
  }

  init() {
    this.form = document.getElementById('todo-form');
    this.input = document.getElementById('todo-input');
    this.list = document.getElementById('todo-list');
    this.filterButtons = document.querySelectorAll('[data-filter]');

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.addTodo(this.input.value);
      this.input.value = '';
    });

    this.filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.filter = btn.dataset.filter;
        this.updateFilterButtons();
        this.render();
      });
    });

    this.render();
  }

  addTodo(text) {
    if (!text.trim()) return;
    this.todos.push({
      id: Date.now(),
      text: text.trim(),
      completed: false
    });
    this.save();
    this.render();
  }

  toggleTodo(id) {
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      this.save();
      this.render();
    }
  }

  deleteTodo(id) {
    this.todos = this.todos.filter(t => t.id !== id);
    this.save();
    this.render();
  }

  getFilteredTodos() {
    switch (this.filter) {
      case 'active':
        return this.todos.filter(t => !t.completed);
      case 'completed':
        return this.todos.filter(t => t.completed);
      default:
        return this.todos;
    }
  }

  save() {
    localStorage.setItem('todos', JSON.stringify(this.todos));
  }

  updateFilterButtons() {
    this.filterButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === this.filter);
    });
  }

  render() {
    const filtered = this.getFilteredTodos();
    this.list.innerHTML = filtered.map(todo => `
      <li class="todo-item ${todo.completed ? 'completed' : ''}">
        <input
          type="checkbox"
          ${todo.completed ? 'checked' : ''}
          onchange="app.toggleTodo(${todo.id})"
        />
        <span>${todo.text}</span>
        <button onclick="app.deleteTodo(${todo.id})">x</button>
      </li>
    `).join('');

    const remaining = this.todos.filter(t => !t.completed).length;
    document.getElementById('todo-count').textContent =
      `${remaining}件の未完了タスク`;
  }
}

const app = new TodoApp();
```

このVanilla JS版を作った後にReact版を作ると、Reactが解決する問題（状態管理の複雑さ、DOM操作の手動管理）が体感できます。

---

### Step 3: React基礎 -- コンポーネント（2-3週間）

#### Reactの環境構築

```bash
## Vite + React + TypeScriptのプロジェクト作成
npm create vite@latest my-react-app -- --template react-ts
cd my-react-app
npm install
npm run dev
```

参照: Vite公式ドキュメント（https://vitejs.dev/guide/）では、最新のプロジェクト作成方法を確認できます。

#### コンポーネントの基本

```tsx
// Button.tsx - 最もシンプルなコンポーネント
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

function Button({ label, onClick, variant = 'primary', disabled = false }: ButtonProps) {
  const baseStyles = 'px-4 py-2 rounded font-medium transition-colors';
  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}

export default Button;
```

#### propsとchildren

```tsx
// Card.tsx - childrenを使ったコンポーネント
interface CardProps {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

function Card({ title, children, footer }: CardProps) {
  return (
    <div className="border rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b bg-gray-50">
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="px-6 py-4">
        {children}
      </div>
      {footer && (
        <div className="px-6 py-3 border-t bg-gray-50">
          {footer}
        </div>
      )}
    </div>
  );
}

// 使用例
function App() {
  return (
    <Card
      title="ユーザー情報"
      footer={<Button label="編集" onClick={() => console.log('edit')} />}
    >
      <p>名前: 田中太郎</p>
      <p>メール: tanaka@example.com</p>
    </Card>
  );
}
```

#### コンポーネントのリスト表示

```tsx
// UserList.tsx
interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface UserListProps {
  users: User[];
  onSelectUser: (user: User) => void;
}

function UserList({ users, onSelectUser }: UserListProps) {
  if (users.length === 0) {
    return <p className="text-gray-500">ユーザーが見つかりません</p>;
  }

  return (
    <ul className="divide-y">
      {users.map(user => (
        <li
          key={user.id}
          className="py-3 px-4 hover:bg-gray-50 cursor-pointer"
          onClick={() => onSelectUser(user)}
        >
          <div className="font-medium">{user.name}</div>
          <div className="text-sm text-gray-500">{user.email}</div>
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
            {user.role}
          </span>
        </li>
      ))}
    </ul>
  );
}
```

注意: `key` propにはリスト内で一意な値を設定してください。配列のインデックスをkeyにするのはアンチパターンです（参照: React公式ドキュメント https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key）。

#### ミニプロジェクト: プロフィールカード一覧

React版のプロフィールカード一覧を作成してください。

```tsx
// ProfileCard.tsx
interface Profile {
  id: number;
  name: string;
  title: string;
  bio: string;
  skills: string[];
  avatarUrl: string;
}

function ProfileCard({ name, title, bio, skills, avatarUrl }: Profile) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-sm">
      <div className="flex items-center gap-4 mb-4">
        <img
          src={avatarUrl}
          alt={`${name}のアバター`}
          className="w-16 h-16 rounded-full object-cover"
        />
        <div>
          <h3 className="font-bold text-lg">{name}</h3>
          <p className="text-gray-500 text-sm">{title}</p>
        </div>
      </div>
      <p className="text-gray-700 mb-4">{bio}</p>
      <div className="flex flex-wrap gap-2">
        {skills.map(skill => (
          <span
            key={skill}
            className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full"
          >
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
}

// App.tsx
function App() {
  const profiles: Profile[] = [
    {
      id: 1,
      name: '田中太郎',
      title: 'フロントエンドエンジニア',
      bio: 'React/TypeScript歴3年。UIの設計が得意です。',
      skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS'],
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tanaka'
    },
    {
      id: 2,
      name: '佐藤花子',
      title: 'フルスタックエンジニア',
      bio: 'バックエンドからフロントまで幅広く対応します。',
      skills: ['Node.js', 'React', 'PostgreSQL', 'Docker'],
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sato'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-2xl font-bold mb-6">チームメンバー</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {profiles.map(profile => (
          <ProfileCard key={profile.id} {...profile} />
        ))}
      </div>
    </div>
  );
}
```

---

### Step 4: React Hooks（2-3週間）

#### useState -- 状態管理の基本

```tsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>カウント: {count}</p>
      <button onClick={() => setCount(prev => prev + 1)}>+1</button>
      <button onClick={() => setCount(prev => prev - 1)}>-1</button>
      <button onClick={() => setCount(0)}>リセット</button>
    </div>
  );
}

// オブジェクトの状態管理
interface FormData {
  name: string;
  email: string;
  message: string;
}

function ContactForm() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSubmitResult('送信が完了しました');
        setFormData({ name: '', email: '', message: '' });
      } else {
        setSubmitResult('送信に失敗しました');
      }
    } catch {
      setSubmitResult('通信エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="name">名前</label>
        <input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="email">メール</label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="message">メッセージ</label>
        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          required
        />
      </div>
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '送信中...' : '送信'}
      </button>
      {submitResult && <p>{submitResult}</p>}
    </form>
  );
}
```

#### useEffect -- 副作用の管理

```tsx
import { useState, useEffect } from 'react';

interface Post {
  id: number;
  title: string;
  body: string;
  userId: number;
}

function PostList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let isMounted = true;

    async function fetchPosts() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `https://jsonplaceholder.typicode.com/posts?_page=${page}&_limit=10`
        );

        if (!response.ok) {
          throw new Error('データの取得に失敗しました');
        }

        const data: Post[] = await response.json();

        if (isMounted) {
          setPosts(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : '不明なエラー');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchPosts();

    // クリーンアップ関数
    return () => {
      isMounted = false;
    };
  }, [page]); // pageが変更されたときに再実行

  if (loading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error}</div>;

  return (
    <div>
      <h2>投稿一覧（ページ {page}）</h2>
      <ul>
        {posts.map(post => (
          <li key={post.id}>
            <h3>{post.title}</h3>
            <p>{post.body.substring(0, 100)}...</p>
          </li>
        ))}
      </ul>
      <div>
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          前のページ
        </button>
        <span>ページ {page}</span>
        <button onClick={() => setPage(p => p + 1)}>
          次のページ
        </button>
      </div>
    </div>
  );
}
```

#### カスタムフック

```tsx
// useLocalStorage.ts - localStorageと同期するフック
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T | ((prev: T) => T)) => {
    const valueToStore = value instanceof Function ? value(storedValue) : value;
    setStoredValue(valueToStore);
    localStorage.setItem(key, JSON.stringify(valueToStore));
  };

  return [storedValue, setValue] as const;
}

// useDebounce.ts - 入力のデバウンス
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// 使用例: 検索フォーム
function SearchForm() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      return;
    }

    async function search() {
      const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
      const data = await response.json();
      setResults(data);
    }

    search();
  }, [debouncedQuery]);

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="検索..."
      />
      <ul>
        {results.map((result, index) => (
          <li key={index}>{result}</li>
        ))}
      </ul>
    </div>
  );
}
```

#### ミニプロジェクト: Todoアプリ（React版）

Step 2で作成したVanilla JS版のTodoアプリをReact + TypeScriptで書き直してください。

```tsx
// useTodos.ts - カスタムフック
interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

type Filter = 'all' | 'active' | 'completed';

function useTodos() {
  const [todos, setTodos] = useLocalStorage<Todo[]>('todos', []);
  const [filter, setFilter] = useState<Filter>('all');

  const addTodo = (text: string) => {
    if (!text.trim()) return;
    setTodos(prev => [
      ...prev,
      { id: Date.now(), text: text.trim(), completed: false }
    ]);
  };

  const toggleTodo = (id: number) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id: number) => {
    setTodos(prev => prev.filter(todo => todo.id !== id));
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const remaining = todos.filter(t => !t.completed).length;

  return {
    todos: filteredTodos,
    remaining,
    filter,
    setFilter,
    addTodo,
    toggleTodo,
    deleteTodo
  };
}
```

---

### Step 5: 状態管理とデータ取得（2-3週間）

#### 状態管理の選択肢

2026年時点でのReact状態管理ライブラリの比較を示します。

| ライブラリ | 学習コスト | バンドルサイズ | 特徴 |
|-----------|---------|------------|------|
| React Context | 低 | 0KB（組み込み） | 小規模アプリに最適 |
| Zustand | 低 | 1KB | シンプルで軽量。中規模以上推奨 |
| Jotai | 低 | 2KB | アトミック。細かい状態管理向き |
| Redux Toolkit | 中 | 11KB | 大規模向け。学習コスト高め |

初心者には**Zustand**を推奨します。APIがシンプルで直感的です。

```tsx
// store.ts - Zustandでの状態管理
import { create } from 'zustand';

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  totalPrice: () => number;
  totalItems: () => number;
}

const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (item) => set(state => {
    const existing = state.items.find(i => i.id === item.id);
    if (existing) {
      return {
        items: state.items.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      };
    }
    return { items: [...state.items, { ...item, quantity: 1 }] };
  }),

  removeItem: (id) => set(state => ({
    items: state.items.filter(i => i.id !== id)
  })),

  updateQuantity: (id, quantity) => set(state => ({
    items: quantity > 0
      ? state.items.map(i => i.id === id ? { ...i, quantity } : i)
      : state.items.filter(i => i.id !== id)
  })),

  clearCart: () => set({ items: [] }),

  totalPrice: () => get().items.reduce(
    (sum, item) => sum + item.price * item.quantity, 0
  ),

  totalItems: () => get().items.reduce(
    (sum, item) => sum + item.quantity, 0
  )
}));

// CartComponent.tsx
function Cart() {
  const { items, removeItem, updateQuantity, clearCart, totalPrice, totalItems } = useCartStore();

  return (
    <div>
      <h2>カート（{totalItems()}件）</h2>
      {items.length === 0 ? (
        <p>カートは空です</p>
      ) : (
        <>
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-4 py-2">
              <span>{item.name}</span>
              <span>{item.price.toLocaleString()}円</span>
              <input
                type="number"
                min="0"
                value={item.quantity}
                onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                className="w-16 border rounded px-2"
              />
              <button onClick={() => removeItem(item.id)}>削除</button>
            </div>
          ))}
          <div className="mt-4 pt-4 border-t">
            <p className="text-lg font-bold">合計: {totalPrice().toLocaleString()}円</p>
            <button onClick={clearCart}>カートを空にする</button>
          </div>
        </>
      )}
    </div>
  );
}
```

参照: Zustand公式ドキュメント（https://docs.pmnd.rs/zustand/getting-started/introduction）

---

### Step 6: Next.js App Router（3-4週間）

#### Next.jsの環境構築

```bash
npx create-next-app@latest my-next-app --typescript --tailwind --app --src-dir
cd my-next-app
npm run dev
```

参照: Next.js公式ドキュメント（https://nextjs.org/docs/getting-started/installation）

#### App Routerの基本構造

```
src/
  app/
    layout.tsx          # ルートレイアウト
    page.tsx            # / のページ
    loading.tsx         # ローディングUI
    error.tsx           # エラーUI
    not-found.tsx       # 404ページ
    blog/
      page.tsx          # /blog のページ
      [slug]/
        page.tsx        # /blog/:slug のページ
    api/
      posts/
        route.ts        # API Route: /api/posts
```

#### Server Componentsとデータ取得

```tsx
// app/blog/page.tsx - Server Component（デフォルト）
interface Post {
  id: number;
  title: string;
  excerpt: string;
  publishedAt: string;
}

async function getPosts(): Promise<Post[]> {
  const response = await fetch('https://api.example.com/posts', {
    next: { revalidate: 3600 } // 1時間キャッシュ
  });

  if (!response.ok) {
    throw new Error('投稿の取得に失敗しました');
  }

  return response.json();
}

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <main className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">ブログ記事一覧</h1>
      <div className="space-y-6">
        {posts.map(post => (
          <article key={post.id} className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">
              <a href={`/blog/${post.id}`} className="hover:text-blue-600">
                {post.title}
              </a>
            </h2>
            <p className="text-gray-600 mb-2">{post.excerpt}</p>
            <time className="text-sm text-gray-400">
              {new Date(post.publishedAt).toLocaleDateString('ja-JP')}
            </time>
          </article>
        ))}
      </div>
    </main>
  );
}

// app/blog/[slug]/page.tsx - 動的ルート
interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

async function getPost(slug: string) {
  const response = await fetch(`https://api.example.com/posts/${slug}`);
  if (!response.ok) return null;
  return response.json();
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return <div>記事が見つかりませんでした</div>;
  }

  return (
    <article className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
      <div className="prose" dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}
```

#### Client Components

```tsx
// app/components/SearchBar.tsx
'use client'; // Client Componentであることを宣言

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="flex gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="記事を検索..."
        className="flex-1 border rounded px-4 py-2"
      />
      <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded">
        検索
      </button>
    </form>
  );
}
```

#### API Routes

```typescript
// app/api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';

interface Post {
  id: number;
  title: string;
  content: string;
  createdAt: string;
}

const posts: Post[] = [
  { id: 1, title: '最初の投稿', content: 'こんにちは', createdAt: '2026-03-06' }
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  const start = (page - 1) * limit;
  const paginatedPosts = posts.slice(start, start + limit);

  return NextResponse.json({
    data: paginatedPosts,
    pagination: {
      page,
      limit,
      total: posts.length,
      totalPages: Math.ceil(posts.length / limit)
    }
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, content } = body;

  if (!title || !content) {
    return NextResponse.json(
      { error: 'タイトルと本文は必須です' },
      { status: 400 }
    );
  }

  const newPost: Post = {
    id: posts.length + 1,
    title,
    content,
    createdAt: new Date().toISOString()
  };

  posts.push(newPost);

  return NextResponse.json(newPost, { status: 201 });
}
```

---

### Step 7: 実プロジェクト構築（4-6週間）

#### 総合プロジェクト: ブックマーク管理アプリ

Step 1-6で学んだ全技術を統合した実用的なアプリケーションを構築します。

##### 機能要件

- ブックマークの追加・編集・削除（CRUD）
- タグによる分類と検索
- OGP情報の自動取得
- レスポンシブデザイン
- ダークモード対応

##### 技術スタック

| レイヤー | 技術 |
|---------|------|
| フレームワーク | Next.js 15 (App Router) |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS |
| 状態管理 | Zustand |
| DB | SQLite (better-sqlite3) |
| テスト | Vitest + Testing Library |

##### ディレクトリ構成

```
src/
  app/
    layout.tsx
    page.tsx
    bookmarks/
      page.tsx
      [id]/
        page.tsx
    api/
      bookmarks/
        route.ts
        [id]/
          route.ts
  components/
    BookmarkCard.tsx
    BookmarkForm.tsx
    SearchBar.tsx
    TagFilter.tsx
  lib/
    db.ts
    ogp.ts
  types/
    index.ts
```

このプロジェクトを完成させることで、実務レベルのNext.jsアプリケーション構築スキルが身につきます。

---

### 学習リソースまとめ

| リソース | URL | 特徴 |
|---------|-----|------|
| React公式ドキュメント | https://react.dev/ | 最も正確。チュートリアルが充実 |
| Next.js公式ドキュメント | https://nextjs.org/docs | App Routerの詳細が充実 |
| MDN Web Docs | https://developer.mozilla.org/ja/ | HTML/CSS/JSのリファレンス |
| TypeScript Handbook | https://www.typescriptlang.org/docs/ | TypeScriptの公式ガイド |

---

### まとめ

React/Next.js学習の成功の鍵は、**正しい順序で段階的に学ぶこと**です。

1. **Step 1-2**（HTML/CSS/JS）を飛ばさない -- 基礎なしにReactは理解できない
2. **Step 3-4**（React基礎/Hooks）で小さなコンポーネントを作る練習を積む
3. **Step 5**（状態管理）は複雑なライブラリより、まずZustandのシンプルなAPIから
4. **Step 6**（Next.js）はReactを十分に理解してから取り組む
5. **Step 7**（実プロジェクト）で全スキルを統合して定着させる

各ステップでミニプロジェクトを作成し、実際に手を動かすことが最も重要です。理論だけでは身につきません。

プログラミングスクールを活用する場合は、React/Next.jsのカリキュラムが充実しており、現役エンジニアのメンターがいるスクールを選ぶことをおすすめします。特にポートフォリオ制作（Step 7）のサポートが手厚いスクールが効果的です。

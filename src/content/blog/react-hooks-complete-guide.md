---
title: 'React Hooks完全ガイド — useState/useEffect/カスタムフック徹底解説'
description: 'React Hooksの全種類を実例付きで解説。useState、useEffect、useContext、useMemo、useCallbackからカスタムフック設計パターンまで完全網羅。'
pubDate: 'Feb 05 2026'
---

# React Hooks完全ガイド — useState/useEffect/カスタムフック徹底解説

**React Hooks**は2019年のReact 16.8で導入され、2026年現在もReact開発の標準です。クラスコンポーネントを使わず、関数コンポーネントだけで状態管理やライフサイクル処理が可能になりました。

この記事では、全Hooksの使い方、パフォーマンス最適化、カスタムフック設計パターンまで、**TypeScriptコード例付き**で徹底解説します。

## 目次
1. [基本的なHooks](#基本的なhooks)
2. [追加のHooks](#追加のhooks)
3. [パフォーマンス最適化](#パフォーマンス最適化)
4. [カスタムフック設計パターン](#カスタムフック設計パターン)
5. [よくある間違いと解決策](#よくある間違いと解決策)
6. [実践パターン集](#実践パターン集)

## 基本的なHooks

### 1. useState — 状態管理

最も基本的なHook。コンポーネントに状態を持たせます。

```typescript
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>カウント: {count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
      <button onClick={() => setCount(prev => prev + 1)}>+1 (関数型)</button>
    </div>
  );
}
```

**重要ポイント**:
- `setCount(count + 1)` より `setCount(prev => prev + 1)` が安全
- 前の状態に依存する場合は関数型更新を使う

#### 複数の状態管理

```typescript
function UserForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState(0);

  // オブジェクトでまとめる方法
  const [user, setUser] = useState({
    name: '',
    email: '',
    age: 0
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUser(prev => ({ ...prev, name: e.target.value }));
  };

  return (
    <form>
      <input value={user.name} onChange={handleNameChange} />
      <input value={user.email} onChange={e => setUser(prev => ({ ...prev, email: e.target.value }))} />
    </form>
  );
}
```

#### 配列・オブジェクトの更新

```typescript
function TodoList() {
  const [todos, setTodos] = useState<string[]>([]);

  // 追加
  const addTodo = (text: string) => {
    setTodos(prev => [...prev, text]);
  };

  // 削除
  const removeTodo = (index: number) => {
    setTodos(prev => prev.filter((_, i) => i !== index));
  };

  // 更新
  const updateTodo = (index: number, newText: string) => {
    setTodos(prev => prev.map((todo, i) => i === index ? newText : todo));
  };

  return (
    <ul>
      {todos.map((todo, index) => (
        <li key={index}>
          {todo}
          <button onClick={() => removeTodo(index)}>削除</button>
        </li>
      ))}
    </ul>
  );
}
```

### 2. useEffect — 副作用処理

データ取得、購読設定、DOM操作などの副作用を処理します。

```typescript
import { useState, useEffect } from 'react';

function DataFetcher() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // マウント時に実行
    fetch('https://api.example.com/data')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      });

    // クリーンアップ関数（アンマウント時）
    return () => {
      console.log('クリーンアップ');
    };
  }, []); // 空配列 = 初回のみ実行

  if (loading) return <div>Loading...</div>;
  return <div>{JSON.stringify(data)}</div>;
}
```

#### 依存配列の使い方

```typescript
function SearchComponent() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  // queryが変わるたびに実行
  useEffect(() => {
    if (!query) return;

    const fetchResults = async () => {
      const res = await fetch(`/api/search?q=${query}`);
      const data = await res.json();
      setResults(data);
    };

    fetchResults();
  }, [query]); // queryが依存

  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <ul>
        {results.map(item => <li key={item.id}>{item.name}</li>)}
      </ul>
    </div>
  );
}
```

#### タイマー・インターバルのクリーンアップ

```typescript
function Timer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);

    // クリーンアップでインターバル解除
    return () => clearInterval(interval);
  }, []);

  return <div>{seconds}秒</div>;
}
```

#### イベントリスナーの登録・解除

```typescript
function WindowSize() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <div>画面幅: {width}px</div>;
}
```

### 3. useContext — グローバル状態管理

Propsのバケツリレーを回避し、コンポーネントツリー全体で状態を共有します。

```typescript
import { createContext, useContext, useState, ReactNode } from 'react';

// Contextの型定義
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

// Context作成
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Provider
function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// カスタムフック
function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

// 使用例
function ThemedButton() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      style={{
        background: theme === 'light' ? '#fff' : '#333',
        color: theme === 'light' ? '#333' : '#fff'
      }}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}

// App
function App() {
  return (
    <ThemeProvider>
      <ThemedButton />
    </ThemeProvider>
  );
}
```

## 追加のHooks

### 4. useReducer — 複雑な状態管理

複数の状態が関連する場合や、複雑な状態ロジックに最適。

```typescript
import { useReducer } from 'react';

type State = {
  count: number;
  step: number;
};

type Action =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'reset' }
  | { type: 'setStep'; payload: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment':
      return { ...state, count: state.count + state.step };
    case 'decrement':
      return { ...state, count: state.count - state.step };
    case 'reset':
      return { count: 0, step: 1 };
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
      <p>Step: {state.step}</p>
      <button onClick={() => dispatch({ type: 'increment' })}>+{state.step}</button>
      <button onClick={() => dispatch({ type: 'decrement' })}>-{state.step}</button>
      <button onClick={() => dispatch({ type: 'reset' })}>Reset</button>
      <input
        type="number"
        value={state.step}
        onChange={e => dispatch({ type: 'setStep', payload: Number(e.target.value) })}
      />
    </div>
  );
}
```

### 5. useRef — 値の保持・DOM参照

再レンダリングをトリガーせずに値を保持、またはDOM要素に直接アクセスします。

```typescript
import { useRef, useEffect } from 'react';

// DOM参照
function AutoFocusInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return <input ref={inputRef} />;
}

// 前の値を保持
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

function Counter() {
  const [count, setCount] = useState(0);
  const prevCount = usePrevious(count);

  return (
    <div>
      <p>現在: {count}</p>
      <p>前回: {prevCount}</p>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
    </div>
  );
}

// レンダリング回数カウント（デバッグ用）
function useRenderCount() {
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current += 1;
  });

  return renderCount.current;
}
```

### 6. useCallback — 関数メモ化

関数の再生成を防ぎ、パフォーマンスを最適化します。

```typescript
import { useState, useCallback, memo } from 'react';

// 子コンポーネント（React.memoで最適化）
const ChildButton = memo(({ onClick, label }: { onClick: () => void; label: string }) => {
  console.log(`${label}がレンダリング`);
  return <button onClick={onClick}>{label}</button>;
});

function Parent() {
  const [count, setCount] = useState(0);
  const [other, setOther] = useState(0);

  // useCallbackなし → 毎回新しい関数が作られる
  const handleClickBad = () => {
    setCount(c => c + 1);
  };

  // useCallbackあり → 依存配列が変わらない限り同じ関数
  const handleClickGood = useCallback(() => {
    setCount(c => c + 1);
  }, []);

  return (
    <div>
      <p>Count: {count}</p>
      <p>Other: {other}</p>
      <ChildButton onClick={handleClickBad} label="Bad（毎回再レンダリング）" />
      <ChildButton onClick={handleClickGood} label="Good（最適化済み）" />
      <button onClick={() => setOther(o => o + 1)}>Other +1</button>
    </div>
  );
}
```

### 7. useMemo — 値のメモ化

計算コストの高い値をキャッシュします。

```typescript
import { useState, useMemo } from 'react';

function ExpensiveComponent() {
  const [count, setCount] = useState(0);
  const [input, setInput] = useState('');

  // 重い計算（例: 素数判定）
  const isPrime = useMemo(() => {
    console.log('素数判定実行');
    if (count < 2) return false;
    for (let i = 2; i <= Math.sqrt(count); i++) {
      if (count % i === 0) return false;
    }
    return true;
  }, [count]); // countが変わった時だけ再計算

  return (
    <div>
      <input value={input} onChange={e => setInput(e.target.value)} />
      <p>Count: {count}</p>
      <p>{count}は素数{isPrime ? 'です' : 'ではありません'}</p>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
    </div>
  );
}
```

### 8. その他のHooks

```typescript
// useLayoutEffect — DOM変更後、画面描画前に実行
import { useLayoutEffect, useRef } from 'react';

function Tooltip() {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    // DOM測定など、画面のちらつきを防ぎたい処理
    const rect = ref.current?.getBoundingClientRect();
    console.log('要素の位置:', rect);
  }, []);

  return <div ref={ref}>Tooltip</div>;
}

// useImperativeHandle — 親から子の関数を呼び出す（稀に使用）
import { forwardRef, useImperativeHandle, useRef } from 'react';

const CustomInput = forwardRef((props, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
    clear: () => {
      if (inputRef.current) inputRef.current.value = '';
    }
  }));

  return <input ref={inputRef} />;
});

// 使用例
function Parent() {
  const inputRef = useRef<{ focus: () => void; clear: () => void }>(null);

  return (
    <div>
      <CustomInput ref={inputRef} />
      <button onClick={() => inputRef.current?.focus()}>Focus</button>
      <button onClick={() => inputRef.current?.clear()}>Clear</button>
    </div>
  );
}
```

## パフォーマンス最適化

### React.memo — コンポーネントメモ化

```typescript
import { memo } from 'react';

const ExpensiveComponent = memo(({ data }: { data: string }) => {
  console.log('レンダリング');
  return <div>{data}</div>;
});

// カスタム比較関数
const CustomComponent = memo(
  ({ user }: { user: { id: number; name: string } }) => {
    return <div>{user.name}</div>;
  },
  (prevProps, nextProps) => {
    // trueを返すと再レンダリングをスキップ
    return prevProps.user.id === nextProps.user.id;
  }
);
```

### useTransition — 低優先度更新（React 18+）

```typescript
import { useState, useTransition } from 'react';

function SearchWithTransition() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value); // 即座に更新（高優先度）

    startTransition(() => {
      // 重い処理を低優先度で実行
      const filtered = heavySearch(value);
      setResults(filtered);
    });
  };

  return (
    <div>
      <input value={query} onChange={handleChange} />
      {isPending && <div>検索中...</div>}
      <ul>
        {results.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  );
}
```

### useDeferredValue — 値の遅延（React 18+）

```typescript
import { useState, useDeferredValue, useMemo } from 'react';

function DeferredList() {
  const [input, setInput] = useState('');
  const deferredInput = useDeferredValue(input);

  // 重いフィルタリング処理
  const filteredList = useMemo(() => {
    return largeList.filter(item => item.includes(deferredInput));
  }, [deferredInput]);

  return (
    <div>
      <input value={input} onChange={e => setInput(e.target.value)} />
      {/* inputは即座に更新、filteredListは遅延 */}
      <ul>
        {filteredList.map(item => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}
```

## カスタムフック設計パターン

### パターン1: データ取得

```typescript
import { useState, useEffect } from 'react';

function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isCancelled = false;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (!isCancelled) {
          setData(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!isCancelled) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [url]);

  return { data, loading, error };
}

// 使用例
function UserProfile({ userId }: { userId: number }) {
  const { data: user, loading, error } = useFetch<User>(`/api/users/${userId}`);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!user) return null;

  return <div>{user.name}</div>;
}
```

### パターン2: ローカルストレージ同期

```typescript
import { useState, useEffect } from 'react';

function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

// 使用例
function Settings() {
  const [theme, setTheme] = useLocalStorage('theme', 'light');
  const [fontSize, setFontSize] = useLocalStorage('fontSize', 16);

  return (
    <div>
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        テーマ切替
      </button>
      <input
        type="number"
        value={fontSize}
        onChange={e => setFontSize(Number(e.target.value))}
      />
    </div>
  );
}
```

### パターン3: デバウンス

```typescript
import { useState, useEffect } from 'react';

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

// 使用例
function SearchInput() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  useEffect(() => {
    if (debouncedSearch) {
      // API呼び出し（500ms待ってから）
      console.log('検索:', debouncedSearch);
    }
  }, [debouncedSearch]);

  return (
    <input
      value={search}
      onChange={e => setSearch(e.target.value)}
      placeholder="検索（500ms後に実行）"
    />
  );
}
```

### パターン4: ウィンドウサイズ監視

```typescript
function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

// 使用例
function ResponsiveComponent() {
  const { width } = useWindowSize();

  return (
    <div>
      {width < 768 ? <MobileView /> : <DesktopView />}
    </div>
  );
}
```

## よくある間違いと解決策

### 間違い1: useEffectの無限ループ

```typescript
// NG
function BadComponent() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(setData); // dataが更新 → useEffect再実行 → 無限ループ
  }, [data]); // 依存配列にdataを入れている

  return <div>{data.length}</div>;
}

// OK
function GoodComponent() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(setData);
  }, []); // 初回のみ実行

  return <div>{data.length}</div>;
}
```

### 間違い2: 依存配列の省略

```typescript
// NG
function BadComponent({ userId }: { userId: number }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, []); // userIdが変わっても再実行されない

  return <div>{user?.name}</div>;
}

// OK
function GoodComponent({ userId }: { userId: number }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]); // userIdが変わったら再実行

  return <div>{user?.name}</div>;
}
```

### 間違い3: useCallbackの過剰使用

```typescript
// NG: すべての関数にuseCallbackを使う（オーバーヘッド）
function OverOptimized() {
  const handleClick = useCallback(() => {
    console.log('clicked'); // 単純な処理にuseCallbackは不要
  }, []);

  return <button onClick={handleClick}>Click</button>;
}

// OK: パフォーマンス問題がある場合のみ使用
function ProperlyOptimized() {
  const handleClick = () => {
    console.log('clicked');
  };

  return <ExpensiveChild onClick={handleClick} />;
}
```

## まとめ

React Hooksは、関数コンポーネントで状態とライフサイクルを完全に管理できる強力な機能です。

**重要ポイント**:
1. `useState`は関数型更新を活用
2. `useEffect`の依存配列を正しく設定
3. `useCallback`/`useMemo`は必要な時だけ
4. カスタムフックで再利用性を高める
5. TypeScriptで型安全に

**関連記事**:
- [Tailwind CSS 実践テクニック集](/blog/tailwindcss-tips-tricks)
- [Webセキュリティ入門](/blog/web-security-basics-2026)

**関連ツール**:
- [DevToolBox](/tools) — JSON整形、色変換など開発ツール集

Happy Hacking with Hooks!
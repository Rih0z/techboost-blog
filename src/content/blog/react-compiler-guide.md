---
title: 'React Compiler完全ガイド - useMemo/useCallbackが不要になる自動メモ化の世界'
description: 'React 19で導入されるReact Compilerの仕組みと使い方を徹底解説。自動メモ化によるパフォーマンス最適化、導入方法、従来の手動最適化との違いまで完全網羅。React・React-Compiler・パフォーマンスに関する実践情報。'
pubDate: '2026-02-05'
tags: ['React', 'React-Compiler', 'パフォーマンス']
heroImage: '../../assets/thumbnails/react-compiler-guide.jpg'
---

React 19で正式導入されるReact Compilerは、開発者の手動によるメモ化（useMemo、useCallback）を不要にし、自動的にコンポーネントを最適化する革新的な機能です。この記事では、React Compilerの仕組み、導入方法、ベストプラクティスを徹底的に解説します。

## React Compilerとは

React Compilerは、Reactコードをビルド時に解析し、自動的にメモ化を追加するコンパイラです。従来、開発者が手動で行っていた`useMemo`や`useCallback`の最適化を、コンパイラが自動で行います。

### 従来の問題点

```tsx
// 従来: 手動でメモ化が必要
function UserList({ users, onSelect }) {
  // usersが変わらなくても毎回新しい配列が作られる
  const sortedUsers = users.sort((a, b) => a.name.localeCompare(b.name));

  // 毎回新しい関数が作られる
  const handleClick = (user) => {
    onSelect(user);
  };

  return (
    <div>
      {sortedUsers.map(user => (
        <UserItem key={user.id} user={user} onClick={handleClick} />
      ))}
    </div>
  );
}
```

### React Compilerによる自動最適化

```tsx
// React Compiler使用時: 自動的にメモ化される
function UserList({ users, onSelect }) {
  // コンパイラが自動的にメモ化
  const sortedUsers = users.sort((a, b) => a.name.localeCompare(b.name));

  // コンパイラが自動的にメモ化
  const handleClick = (user) => {
    onSelect(user);
  };

  return (
    <div>
      {sortedUsers.map(user => (
        <UserItem key={user.id} user={user} onClick={handleClick} />
      ))}
    </div>
  );
}
```

## React Compilerの仕組み

### 依存関係の自動追跡

React Compilerは、コンポーネント内の値や関数の依存関係を自動的に追跡し、最適なメモ化戦略を決定します。

```tsx
function ProductCard({ product, onAddToCart }) {
  // productの変更を自動追跡
  const price = product.price;
  const discount = product.discount || 0;

  // price と discount の変更を自動追跡
  const finalPrice = price * (1 - discount / 100);

  // finalPrice と onAddToCart の変更を自動追跡
  const handleAdd = () => {
    onAddToCart(product.id, finalPrice);
  };

  return (
    <div>
      <h3>{product.name}</h3>
      <p>¥{finalPrice.toLocaleString()}</p>
      <button onClick={handleAdd}>カートに追加</button>
    </div>
  );
}
```

### コンパイル結果の例

```tsx
// コンパイル前
function Counter() {
  const [count, setCount] = useState(0);

  const increment = () => setCount(c => c + 1);
  const decrement = () => setCount(c => c - 1);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </div>
  );
}

// コンパイル後（概念的な表現）
function Counter() {
  const [count, setCount] = useState(0);

  const increment = useMemo(() => () => setCount(c => c + 1), []);
  const decrement = useMemo(() => () => setCount(c => c - 1), []);

  const jsx = useMemo(() => (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </div>
  ), [count, increment, decrement]);

  return jsx;
}
```

## 導入方法

### 1. インストール

```bash
npm install --save-dev babel-plugin-react-compiler
```

または

```bash
yarn add -D babel-plugin-react-compiler
```

### 2. Babel設定

```json
// .babelrc
{
  "plugins": [
    ["react-compiler", {
      "runtimeModule": "react-compiler-runtime"
    }]
  ]
}
```

### 3. Next.js での設定

```javascript
// next.config.js
const ReactCompilerConfig = {
  compilationMode: 'annotation', // または 'all'
};

module.exports = {
  experimental: {
    reactCompiler: ReactCompilerConfig,
  },
};
```

### 4. Vite での設定

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ['react-compiler', {
            runtimeModule: 'react-compiler-runtime'
          }]
        ]
      }
    })
  ]
});
```

## コンパイルモード

### annotation モード（推奨）

特定のコンポーネントのみをコンパイルするモード。段階的な導入に最適です。

```tsx
'use memo';  // このディレクティブでコンパイル対象を明示

function ExpensiveComponent({ data }) {
  // 重い計算処理
  const processedData = data.map(item => ({
    ...item,
    computed: heavyComputation(item)
  }));

  return (
    <div>
      {processedData.map(item => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}
```

### all モード

すべてのコンポーネントを自動的にコンパイルするモード。

```javascript
// next.config.js
module.exports = {
  experimental: {
    reactCompiler: {
      compilationMode: 'all',
    },
  },
};
```

### infer モード

React Compilerがパフォーマンス向上が見込めるコンポーネントを自動判定してコンパイルします。

```javascript
// next.config.js
module.exports = {
  experimental: {
    reactCompiler: {
      compilationMode: 'infer',
    },
  },
};
```

## パフォーマンス最適化の実例

### 1. リスト表示の最適化

```tsx
'use memo';

interface TodoListProps {
  todos: Todo[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

function TodoList({ todos, onToggle, onDelete }: TodoListProps) {
  // フィルタリングが自動的にメモ化される
  const activeTodos = todos.filter(todo => !todo.completed);
  const completedTodos = todos.filter(todo => todo.completed);

  // ソートも自動的にメモ化される
  const sortedActive = activeTodos.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div>
      <section>
        <h2>アクティブ ({activeTodos.length})</h2>
        {sortedActive.map(todo => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        ))}
      </section>

      <section>
        <h2>完了 ({completedTodos.length})</h2>
        {completedTodos.map(todo => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        ))}
      </section>
    </div>
  );
}
```

### 2. フォーム処理の最適化

```tsx
'use memo';

function RegistrationForm() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // バリデーション関数が自動的にメモ化される
  const errors = {
    username: formData.username.length < 3
      ? 'ユーザー名は3文字以上必要です'
      : '',
    email: !formData.email.includes('@')
      ? '有効なメールアドレスを入力してください'
      : '',
    password: formData.password.length < 8
      ? 'パスワードは8文字以上必要です'
      : '',
    confirmPassword: formData.password !== formData.confirmPassword
      ? 'パスワードが一致しません'
      : '',
  };

  // isValidも自動的にメモ化される
  const isValid = Object.values(errors).every(error => error === '');

  // ハンドラー関数も自動的にメモ化される
  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    await submitRegistration(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input
          type="text"
          value={formData.username}
          onChange={handleChange('username')}
          placeholder="ユーザー名"
        />
        {errors.username && <span className="error">{errors.username}</span>}
      </div>

      <div>
        <input
          type="email"
          value={formData.email}
          onChange={handleChange('email')}
          placeholder="メールアドレス"
        />
        {errors.email && <span className="error">{errors.email}</span>}
      </div>

      <div>
        <input
          type="password"
          value={formData.password}
          onChange={handleChange('password')}
          placeholder="パスワード"
        />
        {errors.password && <span className="error">{errors.password}</span>}
      </div>

      <div>
        <input
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange('confirmPassword')}
          placeholder="パスワード（確認）"
        />
        {errors.confirmPassword && <span className="error">{errors.confirmPassword}</span>}
      </div>

      <button type="submit" disabled={!isValid}>
        登録
      </button>
    </form>
  );
}
```

### 3. データビジュアライゼーションの最適化

```tsx
'use memo';

interface ChartProps {
  data: DataPoint[];
  width: number;
  height: number;
}

function LineChart({ data, width, height }: ChartProps) {
  // スケール計算が自動的にメモ化される
  const xScale = width / (data.length - 1);
  const maxValue = Math.max(...data.map(d => d.value));
  const yScale = height / maxValue;

  // パス生成が自動的にメモ化される
  const pathData = data.map((point, index) => ({
    x: index * xScale,
    y: height - (point.value * yScale),
  }));

  const pathString = pathData
    .map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    )
    .join(' ');

  // グリッドラインの計算も自動的にメモ化される
  const gridLines = Array.from({ length: 5 }, (_, i) => ({
    y: (height / 4) * i,
    label: ((maxValue / 4) * (4 - i)).toFixed(0),
  }));

  return (
    <svg width={width} height={height}>
      {/* グリッドライン */}
      {gridLines.map((line, index) => (
        <g key={index}>
          <line
            x1={0}
            y1={line.y}
            x2={width}
            y2={line.y}
            stroke="#e0e0e0"
            strokeWidth={1}
          />
          <text x={5} y={line.y - 5} fontSize={12}>
            {line.label}
          </text>
        </g>
      ))}

      {/* データライン */}
      <path
        d={pathString}
        fill="none"
        stroke="#2196F3"
        strokeWidth={2}
      />

      {/* データポイント */}
      {pathData.map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r={4}
          fill="#2196F3"
        />
      ))}
    </svg>
  );
}
```

## 既存コードの移行

### useMemoの削除

```tsx
// Before: 手動メモ化
function ProductList({ products, category }) {
  const filteredProducts = useMemo(() =>
    products.filter(p => p.category === category),
    [products, category]
  );

  const sortedProducts = useMemo(() =>
    filteredProducts.sort((a, b) => b.rating - a.rating),
    [filteredProducts]
  );

  return (
    <div>
      {sortedProducts.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

// After: React Compiler使用
'use memo';

function ProductList({ products, category }) {
  const filteredProducts = products.filter(p => p.category === category);
  const sortedProducts = filteredProducts.sort((a, b) => b.rating - a.rating);

  return (
    <div>
      {sortedProducts.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### useCallbackの削除

```tsx
// Before: 手動メモ化
function SearchBar({ onSearch }) {
  const [query, setQuery] = useState('');

  const handleChange = useCallback((e) => {
    setQuery(e.target.value);
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    onSearch(query);
  }, [query, onSearch]);

  return (
    <form onSubmit={handleSubmit}>
      <input value={query} onChange={handleChange} />
      <button type="submit">検索</button>
    </form>
  );
}

// After: React Compiler使用
'use memo';

function SearchBar({ onSearch }) {
  const [query, setQuery] = useState('');

  const handleChange = (e) => {
    setQuery(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={query} onChange={handleChange} />
      <button type="submit">検索</button>
    </form>
  );
}
```

### React.memoの扱い

```tsx
// Before: 手動メモ化
const ExpensiveComponent = React.memo(function ExpensiveComponent({ data }) {
  return (
    <div>
      {data.map(item => <Item key={item.id} item={item} />)}
    </div>
  );
});

// After: React Compilerではmemoは不要だが、互換性のため残しても問題ない
'use memo';

function ExpensiveComponent({ data }) {
  return (
    <div>
      {data.map(item => <Item key={item.id} item={item} />)}
    </div>
  );
}
```

## デバッグとモニタリング

### React DevToolsでの確認

React DevTools Profilerを使用して、コンパイラによる最適化を確認できます。

```tsx
'use memo';

function MonitoredComponent({ data }) {
  // DevToolsで再レンダリングをトラッキング
  console.log('Render:', data.id);

  const processedData = heavyComputation(data);

  return <div>{processedData}</div>;
}
```

### コンパイルログの有効化

```javascript
// next.config.js
module.exports = {
  experimental: {
    reactCompiler: {
      compilationMode: 'annotation',
      logger: {
        level: 'debug',
        output: 'console', // または 'file'
      },
    },
  },
};
```

### パフォーマンス計測

```tsx
'use memo';

import { Profiler } from 'react';

function App() {
  const onRenderCallback = (
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime
  ) => {
    console.log({
      id,
      phase,
      actualDuration,
      baseDuration,
    });
  };

  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <MainContent />
    </Profiler>
  );
}
```

## ベストプラクティス

### 1. 段階的な導入

```tsx
// Step 1: 最もパフォーマンスが重要なコンポーネントから開始
'use memo';

function CriticalComponent({ data }) {
  // ...
}

// Step 2: 段階的に他のコンポーネントに適用
'use memo';

function SecondaryComponent({ data }) {
  // ...
}
```

### 2. 純粋なコンポーネントを書く

```tsx
'use memo';

// Good: 純粋な関数
function PureComponent({ value }) {
  const doubled = value * 2;
  return <div>{doubled}</div>;
}

// Bad: 副作用を含む
function ImpureComponent({ value }) {
  // コンパイラは副作用を最適化できない
  localStorage.setItem('value', value);
  return <div>{value}</div>;
}
```

### 3. 適切な状態管理

```tsx
'use memo';

function OptimizedForm() {
  // Good: 関連する状態をまとめる
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  // Bad: 個別の状態
  // const [name, setName] = useState('');
  // const [email, setEmail] = useState('');

  return (
    <form>
      <input
        value={formData.name}
        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
      />
      <input
        value={formData.email}
        onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
      />
    </form>
  );
}
```

### 4. 計算の分離

```tsx
'use memo';

function DataDashboard({ rawData }) {
  // Good: 計算ロジックを分離
  const processedData = processData(rawData);
  const statistics = calculateStatistics(processedData);
  const chartData = prepareChartData(processedData);

  return (
    <div>
      <Statistics data={statistics} />
      <Chart data={chartData} />
    </div>
  );
}

// 純粋な関数として定義
function processData(data) {
  return data.map(item => ({
    ...item,
    normalized: normalizeValue(item.value),
  }));
}

function calculateStatistics(data) {
  return {
    mean: data.reduce((sum, item) => sum + item.value, 0) / data.length,
    max: Math.max(...data.map(item => item.value)),
    min: Math.min(...data.map(item => item.value)),
  };
}
```

## トラブルシューティング

### 最適化されない場合

```tsx
'use memo';

function ProblematicComponent({ data }) {
  // 問題: 外部変数を参照
  const externalValue = window.globalValue; // コンパイラは最適化できない

  // 解決: propsとして渡す
  return <div>{data.value}</div>;
}
```

### ビルドエラー

```bash
# エラー: react-compilerが見つからない
npm install --save-dev babel-plugin-react-compiler

# エラー: runtime moduleが見つからない
npm install react-compiler-runtime
```

### TypeScript統合

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "strict": true,
    "moduleResolution": "bundler"
  }
}
```

## パフォーマンス比較

### ベンチマーク例

```tsx
// テストコンポーネント
function BenchmarkComponent({ items }) {
  const start = performance.now();

  const processed = items.map(item => ({
    ...item,
    computed: heavyComputation(item),
  }));

  const end = performance.now();
  console.log(`処理時間: ${end - start}ms`);

  return (
    <div>
      {processed.map(item => (
        <Item key={item.id} item={item} />
      ))}
    </div>
  );
}

// 手動メモ化の場合: 平均 50ms
// React Compiler使用時: 平均 12ms (約4倍高速)
```

## まとめ

React Compilerは、Reactアプリケーションのパフォーマンス最適化を劇的に簡素化します。

### 主な利点

1. **開発生産性の向上** - useMemo/useCallbackが不要
2. **パフォーマンス向上** - 自動的に最適化
3. **コードの可読性向上** - シンプルなコードを書ける
4. **バグの削減** - 依存配列の書き忘れがない

### 導入時の推奨フロー

1. annotation モードで導入開始
2. 重要なコンポーネントから段階的に適用
3. DevToolsでパフォーマンス計測
4. 既存のuseMemo/useCallbackを段階的に削除
5. all モードへの移行を検討

React Compilerを活用して、より高速で保守性の高いReactアプリケーションを構築しましょう。

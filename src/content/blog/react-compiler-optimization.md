---
title: 'React Compiler実践ガイド: 自動メモ化で実現するパフォーマンス最適化の新時代'
description: 'React Compilerを使った自動最適化の実践ガイド。手動のuseMemo/useCallbackが不要になる自動メモ化、最適化の仕組み、導入方法、ベンチマーク、トラブルシューティングを徹底解説。具体的なコード例とともに詳しく紹介します。'
pubDate: 2025-08-05
updatedDate: 2025-08-05
tags: ['React', 'React-Compiler', 'パフォーマンス', '最適化', 'メモ化']
heroImage: '../../assets/thumbnails/react-compiler-optimization.jpg'
---

React Compilerは、手動の`useMemo`や`useCallback`を不要にする革新的なコンパイラです。

本記事では、React Compilerの仕組み、導入方法、実践的な最適化テクニック、ベンチマーク、トラブルシューティングまで徹底解説します。

## React Compilerとは

### 従来のパフォーマンス最適化の課題

```jsx
// 従来: 手動でメモ化が必要
function TodoList({ todos, filter }) {
    // これを忘れると毎回再計算
    const filteredTodos = useMemo(() => {
        return todos.filter(todo => {
            if (filter === 'completed') return todo.completed;
            if (filter === 'active') return !todo.completed;
            return true;
        });
    }, [todos, filter]);

    // これも忘れると子コンポーネントが再レンダリング
    const handleToggle = useCallback((id) => {
        // ...
    }, []);

    return (
        <div>
            {filteredTodos.map(todo => (
                <TodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={handleToggle}
                />
            ))}
        </div>
    );
}

// さらに子コンポーネントもメモ化
const TodoItem = memo(({ todo, onToggle }) => {
    return (
        <div onClick={() => onToggle(todo.id)}>
            {todo.text}
        </div>
    );
});
```

問題点:
- **メンテナンス負担**: 依存配列の管理が煩雑
- **パフォーマンスリスク**: メモ化忘れによる無駄な再レンダリング
- **コード可読性低下**: 最適化コードがロジックを隠す
- **学習コスト**: 初心者には難解

### React Compilerの革新

```jsx
// React Compiler: 自動で最適化される
function TodoList({ todos, filter }) {
    // コンパイラが自動でメモ化
    const filteredTodos = todos.filter(todo => {
        if (filter === 'completed') return todo.completed;
        if (filter === 'active') return !todo.completed;
        return true;
    });

    // これも自動で最適化
    const handleToggle = (id) => {
        // ...
    };

    return (
        <div>
            {filteredTodos.map(todo => (
                <TodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={handleToggle}
                />
            ))}
        </div>
    );
}

// memo()も不要
function TodoItem({ todo, onToggle }) {
    return (
        <div onClick={() => onToggle(todo.id)}>
            {todo.text}
        </div>
    );
}
```

メリット:
- **自動最適化**: コンパイラが賢く判断
- **シンプルなコード**: メモ化のボイラープレート不要
- **保守性向上**: 依存配列の管理から解放
- **パフォーマンス向上**: 最適化の抜け漏れ防止

## React Compilerの仕組み

### コンパイル時の変換

React Compilerは、コード内の以下を自動検出します:

1. **値の再計算**: 高コストな処理を自動でメモ化
2. **関数の再生成**: コールバックを自動で安定化
3. **コンポーネントの再レンダリング**: 不要な再描画を防止
4. **JSXの再構築**: 仮想DOMの差分を最小化

### 内部動作の例

```jsx
// 元のコード
function Component({ data }) {
    const processed = data.map(item => item.value * 2);
    return <List items={processed} />;
}
```

コンパイラによる変換（イメージ）:

```jsx
// コンパイル後（概念的な例）
function Component({ data }) {
    const processed = useMemoInternal(() => {
        return data.map(item => item.value * 2);
    }, [data]);

    const jsx = useMemoInternal(() => {
        return <List items={processed} />;
    }, [processed]);

    return jsx;
}
```

## 導入方法

### 前提条件

- React 19以降
- Node.js 18以降
- Babel 7.24以降 または ESBuild/SWC対応版

### インストール（Next.js）

```bash
npm install next@latest react@latest react-dom@latest
```

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        reactCompiler: true,
    },
};

module.exports = nextConfig;
```

### インストール（Vite）

```bash
npm install vite-plugin-react-compiler -D
```

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import reactCompiler from 'vite-plugin-react-compiler';

export default defineConfig({
    plugins: [
        react(),
        reactCompiler(),
    ],
});
```

### インストール（CRA / カスタムWebpack）

```bash
npm install babel-plugin-react-compiler -D
```

```javascript
// babel.config.js
module.exports = {
    plugins: [
        ['babel-plugin-react-compiler', {
            // オプション設定
        }],
    ],
};
```

### ESLintプラグイン

```bash
npm install eslint-plugin-react-compiler -D
```

```javascript
// .eslintrc.js
module.exports = {
    plugins: ['react-compiler'],
    rules: {
        'react-compiler/react-compiler': 'error',
    },
};
```

## 実践的な最適化例

### 1. リスト処理の最適化

```jsx
// Before: 手動メモ化
function ProductList({ products, searchTerm, sortBy }) {
    const filtered = useMemo(() => {
        return products.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [products, searchTerm]);

    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            if (sortBy === 'price') return a.price - b.price;
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            return 0;
        });
    }, [filtered, sortBy]);

    return (
        <div>
            {sorted.map(product => (
                <ProductCard key={product.id} product={product} />
            ))}
        </div>
    );
}
```

```jsx
// After: React Compilerが自動最適化
function ProductList({ products, searchTerm, sortBy }) {
    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sorted = [...filtered].sort((a, b) => {
        if (sortBy === 'price') return a.price - b.price;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return 0;
    });

    return (
        <div>
            {sorted.map(product => (
                <ProductCard key={product.id} product={product} />
            ))}
        </div>
    );
}
```

### 2. イベントハンドラの最適化

```jsx
// Before: useCallbackだらけ
function Form({ onSubmit, initialValues }) {
    const [values, setValues] = useState(initialValues);

    const handleChange = useCallback((field, value) => {
        setValues(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        onSubmit(values);
    }, [values, onSubmit]);

    const handleReset = useCallback(() => {
        setValues(initialValues);
    }, [initialValues]);

    return (
        <form onSubmit={handleSubmit}>
            <Input
                value={values.name}
                onChange={(v) => handleChange('name', v)}
            />
            <Button type="submit">Submit</Button>
            <Button onClick={handleReset}>Reset</Button>
        </form>
    );
}
```

```jsx
// After: シンプルに
function Form({ onSubmit, initialValues }) {
    const [values, setValues] = useState(initialValues);

    const handleChange = (field, value) => {
        setValues(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(values);
    };

    const handleReset = () => {
        setValues(initialValues);
    };

    return (
        <form onSubmit={handleSubmit}>
            <Input
                value={values.name}
                onChange={(v) => handleChange('name', v)}
            />
            <Button type="submit">Submit</Button>
            <Button onClick={handleReset}>Reset</Button>
        </form>
    );
}
```

### 3. 複雑な計算の最適化

```jsx
// Before: ネストしたuseMemo
function Dashboard({ users, orders, startDate, endDate }) {
    const filteredOrders = useMemo(() => {
        return orders.filter(o =>
            o.date >= startDate && o.date <= endDate
        );
    }, [orders, startDate, endDate]);

    const stats = useMemo(() => {
        const revenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
        const avgOrderValue = revenue / filteredOrders.length;
        const topCustomers = calculateTopCustomers(filteredOrders, users);

        return { revenue, avgOrderValue, topCustomers };
    }, [filteredOrders, users]);

    const chartData = useMemo(() => {
        return prepareChartData(filteredOrders);
    }, [filteredOrders]);

    return (
        <div>
            <Stats data={stats} />
            <Chart data={chartData} />
        </div>
    );
}
```

```jsx
// After: クリーンなロジック
function Dashboard({ users, orders, startDate, endDate }) {
    const filteredOrders = orders.filter(o =>
        o.date >= startDate && o.date <= endDate
    );

    const revenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
    const avgOrderValue = revenue / filteredOrders.length;
    const topCustomers = calculateTopCustomers(filteredOrders, users);
    const stats = { revenue, avgOrderValue, topCustomers };

    const chartData = prepareChartData(filteredOrders);

    return (
        <div>
            <Stats data={stats} />
            <Chart data={chartData} />
        </div>
    );
}
```

### 4. Context使用時の最適化

```jsx
// Before: memo()とuseCallbackが必要
const UserContext = createContext();

function UserProvider({ children }) {
    const [user, setUser] = useState(null);

    const login = useCallback((credentials) => {
        // API call
        setUser(userData);
    }, []);

    const logout = useCallback(() => {
        setUser(null);
    }, []);

    const value = useMemo(() => ({
        user,
        login,
        logout,
    }), [user, login, logout]);

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
}

const UserProfile = memo(function UserProfile() {
    const { user } = useContext(UserContext);
    return <div>{user?.name}</div>;
});
```

```jsx
// After: 自然な記述
const UserContext = createContext();

function UserProvider({ children }) {
    const [user, setUser] = useState(null);

    const login = (credentials) => {
        // API call
        setUser(userData);
    };

    const logout = () => {
        setUser(null);
    };

    return (
        <UserContext.Provider value={{ user, login, logout }}>
            {children}
        </UserContext.Provider>
    );
}

function UserProfile() {
    const { user } = useContext(UserContext);
    return <div>{user?.name}</div>;
}
```

## 最適化の限界と注意点

### Compilerが最適化できないケース

```jsx
// 1. 副作用を含む処理
function Component({ data }) {
    // これは最適化されない（毎回実行される）
    const result = data.map(item => {
        console.log(item); // 副作用
        return item * 2;
    });

    return <div>{result}</div>;
}

// 2. ランダム値や日時
function Component() {
    // 毎回異なる値になるため最適化不可
    const random = Math.random();
    const now = new Date();

    return <div>{random}</div>;
}

// 3. 外部変数の参照
let globalCounter = 0;

function Component({ data }) {
    // グローバル変数の変更は追跡不可
    globalCounter++;
    return <div>{globalCounter}</div>;
}
```

### 手動最適化が必要な場合

```jsx
// 明示的に最適化を抑制したい場合
function Component({ data }) {
    // 'use no memo' ディレクティブ（将来的な機能）
    'use no memo';
    const result = expensiveOperation(data);
    return <div>{result}</div>;
}
```

## パフォーマンス計測

### React DevToolsでの確認

```jsx
// Profilerでレンダリング回数を計測
import { Profiler } from 'react';

function App() {
    return (
        <Profiler
            id="TodoList"
            onRender={(id, phase, actualDuration) => {
                console.log(`${id} rendered in ${actualDuration}ms`);
            }}
        >
            <TodoList />
        </Profiler>
    );
}
```

### ベンチマーク例

```jsx
// Before Compiler: 100アイテムのリスト
// - 平均レンダリング時間: 45ms
// - 再レンダリング回数: 検索ごとに全リスト

// After Compiler: 100アイテムのリスト
// - 平均レンダリング時間: 12ms (73%改善)
// - 再レンダリング回数: 変更されたアイテムのみ
```

### 実際の測定コード

```jsx
function BenchmarkComponent() {
    const [data, setData] = useState(generateLargeData(1000));
    const [filter, setFilter] = useState('');

    const start = performance.now();

    const filtered = data.filter(item =>
        item.name.includes(filter)
    );

    const end = performance.now();
    console.log(`Filter took ${end - start}ms`);

    return (
        <div>
            <input
                value={filter}
                onChange={e => setFilter(e.target.value)}
            />
            {filtered.map(item => (
                <Item key={item.id} item={item} />
            ))}
        </div>
    );
}
```

## トラブルシューティング

### ESLintエラーの対処

```javascript
// react-compiler/react-compiler エラーが出る場合
// 原因: Compilerが最適化できないパターン

// ❌ Bad
function Component({ data }) {
    let sum = 0;
    data.forEach(item => sum += item.value); // ミュータブルな変数
    return <div>{sum}</div>;
}

// ✅ Good
function Component({ data }) {
    const sum = data.reduce((acc, item) => acc + item.value, 0);
    return <div>{sum}</div>;
}
```

### ビルドエラーの対処

```bash
# Compilerのバージョンを確認
npm list babel-plugin-react-compiler

# キャッシュクリア
rm -rf node_modules/.cache
npm run build
```

### デバッグモード

```javascript
// next.config.js
const nextConfig = {
    experimental: {
        reactCompiler: {
            compilationMode: 'annotation', // 'all' | 'annotation'
        },
    },
};
```

```jsx
// 特定コンポーネントのみ有効化
'use memo';

function Component() {
    // このコンポーネントのみCompiler適用
}
```

## マイグレーション戦略

### 段階的導入

```javascript
// Step 1: 新規コンポーネントのみ有効化
const nextConfig = {
    experimental: {
        reactCompiler: {
            compilationMode: 'annotation',
        },
    },
};
```

```jsx
// Step 2: アノテーション追加
'use memo';

function NewComponent() {
    // React Compilerが適用される
}
```

### 既存コードのリファクタリング

```jsx
// Before
const Component = memo(function Component({ data }) {
    const processed = useMemo(() => process(data), [data]);
    const handler = useCallback(() => {}, []);

    return <div>{processed}</div>;
});

// After: 段階的に削除
function Component({ data }) {
    const processed = process(data);
    const handler = () => {};

    return <div>{processed}</div>;
}
```

## まとめ

React Compilerの実践的な活用方法を解説しました。

### キーポイント

- **自動最適化**: useMemo/useCallback/memo不要
- **シンプルなコード**: 可読性とパフォーマンスの両立
- **段階的導入**: 既存プロジェクトにも適用可能
- **ESLint連携**: 最適化不可パターンを検出

### 導入のベストプラクティス

1. **新規プロジェクトから**: フルに活用
2. **既存プロジェクト**: annotationモードで段階的に
3. **ESLint設定**: 早期にエラーを検出
4. **計測**: React DevToolsでパフォーマンス確認

React Compilerで、よりシンプルで高速なReactアプリケーションを開発しましょう。

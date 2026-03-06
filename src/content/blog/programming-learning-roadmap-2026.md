---
title: "プログラミング学習ロードマップ2026：初心者から実務レベルへ"
description: "2026年版プログラミング学習ロードマップ。言語選択から学習順序、教材比較、ポートフォリオ作成、実務スキルへの橋渡しまで体系的に解説。進捗管理ツールのコード例付き。"
pubDate: "2026-03-06"
tags: ['school', 'プログラミング', 'career']
---

### はじめに：2026年のプログラミング学習環境

2026年現在、プログラミングを学ぶ環境は大きく変化しています。AIコーディングアシスタントの普及、クラウド開発環境の進化、そしてリモートワークの定着により、プログラミングスキルへの需要はかつてないほど高まっています。

経済産業省の「IT人材需給に関する調査」によると、2030年には最大79万人のIT人材が不足すると予測されています（参照: 経済産業省「IT人材需給に関する調査」2019年3月）。この状況は2026年時点でも改善されておらず、未経験からでもプログラミングを習得すれば、エンジニアとして就職・転職できる可能性は十分にあります。

しかし、独学でプログラミングを始めた人の約90%が途中で挫折するというデータもあります。挫折の主な原因は以下の通りです。

- 何から学べばいいかわからない
- 学習の順序が間違っている
- 実務で使えるレベルがわからない
- モチベーションが維持できない
- エラーが解決できず詰まる

この記事では、完全初心者が実務レベルのエンジニアになるまでの体系的な学習計画を、具体的なコード例と進捗管理ツール付きで解説します。

---

### 全体像：6つのフェーズで実務レベルへ

学習は以下の6フェーズに分かれます。各フェーズの目安期間はフルタイム学習の場合です。パートタイム（1日2-3時間）の場合は約2倍の期間を見込んでください。

| フェーズ | 内容 | 目安期間（フルタイム） | 目安期間（パートタイム） |
|---------|------|---------------------|----------------------|
| Phase 1 | Web基礎（HTML/CSS/JS） | 4-6週間 | 8-12週間 |
| Phase 2 | プログラミング基礎（JavaScript深掘り） | 4-6週間 | 8-12週間 |
| Phase 3 | フレームワーク習得（React or Vue） | 6-8週間 | 12-16週間 |
| Phase 4 | バックエンド＋DB（Node.js/SQL） | 6-8週間 | 12-16週間 |
| Phase 5 | ポートフォリオ制作 | 4-6週間 | 8-12週間 |
| Phase 6 | 実務スキル（Git/テスト/CI/CD） | 2-4週間 | 4-8週間 |

合計で約6-9ヶ月（フルタイム）、12-18ヶ月（パートタイム）が目安です。

---

### Phase 1: Web基礎（HTML/CSS/JavaScript入門）

#### 目標

- HTMLでWebページの構造を作れる
- CSSでレイアウトとデザインを実装できる
- JavaScriptで簡単な動的処理を書ける

#### 学習内容

##### HTML（1-2週間）

HTMLはWebページの骨格です。以下の要素を確実に理解しましょう。

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>はじめてのWebページ</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header>
    <nav>
      <ul>
        <li><a href="#about">自己紹介</a></li>
        <li><a href="#skills">スキル</a></li>
        <li><a href="#works">作品</a></li>
      </ul>
    </nav>
  </header>

  <main>
    <section id="about">
      <h1>自己紹介</h1>
      <p>プログラミング学習中のエンジニア志望です。</p>
    </section>

    <section id="skills">
      <h2>学習中のスキル</h2>
      <ul>
        <li>HTML/CSS</li>
        <li>JavaScript</li>
        <li>React</li>
      </ul>
    </section>

    <section id="works">
      <h2>作品一覧</h2>
      <article>
        <h3>Todoアプリ</h3>
        <p>JavaScriptで作成したシンプルなTodoアプリです。</p>
      </article>
    </section>
  </main>

  <footer>
    <p>Copyright 2026 My Portfolio</p>
  </footer>
</body>
</html>
```

セマンティックHTML（`header`, `nav`, `main`, `section`, `article`, `footer`）を使う習慣を最初から身につけることが重要です。これはアクセシビリティとSEOの両面で役立ちます。

##### CSS（1-2週間）

CSSはレイアウトとデザインを担当します。2026年時点で必須のCSS知識を以下に示します。

```css
/* CSS変数（カスタムプロパティ）を活用する */
:root {
  --color-primary: #2563eb;
  --color-secondary: #64748b;
  --color-bg: #ffffff;
  --color-text: #1e293b;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 2rem;
  --border-radius: 0.5rem;
}

/* レスポンシブデザインの基本 */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-md);
}

/* Flexboxレイアウト */
.nav-list {
  display: flex;
  gap: var(--spacing-md);
  list-style: none;
  padding: 0;
}

/* CSS Gridレイアウト */
.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-lg);
}

/* メディアクエリ */
@media (max-width: 768px) {
  .nav-list {
    flex-direction: column;
  }

  .grid-layout {
    grid-template-columns: 1fr;
  }
}

/* カードコンポーネント */
.card {
  background: var(--color-bg);
  border-radius: var(--border-radius);
  padding: var(--spacing-lg);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
```

FlexboxとCSS Gridの2つのレイアウト手法は必ず習得してください。2026年時点で、floatベースのレイアウトはほぼ使われていません。

##### JavaScript入門（1-2週間）

JavaScriptはWeb開発の中核言語です。まず基本文法を習得します。

```javascript
// 変数宣言（letとconstを使う。varは非推奨）
const appName = 'My Todo App';
let taskCount = 0;

// 配列操作
const tasks = ['買い物に行く', 'レポートを書く', 'コードを書く'];

// 配列メソッド（map, filter, reduce）
const completedTasks = tasks.filter(task => task.includes('コード'));
const taskLabels = tasks.map((task, index) => `${index + 1}. ${task}`);

// オブジェクト
const user = {
  name: '田中太郎',
  age: 25,
  skills: ['HTML', 'CSS', 'JavaScript'],
  greet() {
    return `こんにちは、${this.name}です。`;
  }
};

// 分割代入
const { name, skills } = user;
console.log(`${name}のスキル: ${skills.join(', ')}`);

// スプレッド構文
const newSkills = [...skills, 'React'];
console.log(newSkills);

// 非同期処理（Promise / async-await）
async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('データ取得に失敗しました:', error.message);
    return null;
  }
}
```

#### Phase 1の教材比較

| 教材 | 形式 | 費用 | 特徴 | おすすめ度 |
|------|------|------|------|----------|
| MDN Web Docs | Web記事 | 無料 | Mozilla公式、最も正確な情報 | 最高（リファレンスとして） |
| Progate | インタラクティブ | 月額1,078円 | 手を動かして学べる。初心者に最適 | 高（最初の入口として） |
| freeCodeCamp | インタラクティブ | 無料 | 英語だが体系的 | 高（英語が読めるなら） |
| ドットインストール | 動画 | 月額1,080円 | 3分動画で学べる | 中 |
| Udemy | 動画 | セール時1,200-2,400円 | セール時にまとめ買い推奨 | 高（セール時） |

参照: MDN Web Docs（https://developer.mozilla.org/ja/）はMozillaが運営するWeb技術の公式ドキュメントです。

#### Phase 1の到達チェックリスト

```
[ ] HTMLでセマンティックなページを作成できる
[ ] CSSでFlexbox/Gridを使ったレスポンシブレイアウトが組める
[ ] JavaScriptで変数、関数、配列操作ができる
[ ] DOM操作でHTMLを動的に変更できる
[ ] 簡単なイベント処理（クリック、入力）が実装できる
```

---

### Phase 2: プログラミング基礎（JavaScript深掘り）

#### 目標

- JavaScriptの中級概念（クロージャ、プロトタイプ、イベントループ）を理解する
- DOM操作とイベント処理を使ったインタラクティブなWebアプリを作れる
- ES2024+の最新構文を使いこなせる

#### 学習内容

##### クロージャとスコープ

```javascript
// クロージャの実用例：カウンター
function createCounter(initialValue = 0) {
  let count = initialValue;

  return {
    increment() {
      count += 1;
      return count;
    },
    decrement() {
      count -= 1;
      return count;
    },
    getCount() {
      return count;
    },
    reset() {
      count = initialValue;
      return count;
    }
  };
}

const counter = createCounter(10);
console.log(counter.increment()); // 11
console.log(counter.increment()); // 12
console.log(counter.decrement()); // 11
console.log(counter.getCount()); // 11
```

##### 非同期処理の完全理解

```javascript
// Promise.allで並列処理
async function fetchMultipleAPIs() {
  const urls = [
    'https://api.example.com/users',
    'https://api.example.com/posts',
    'https://api.example.com/comments'
  ];

  try {
    const responses = await Promise.all(
      urls.map(url => fetch(url))
    );

    const data = await Promise.all(
      responses.map(res => {
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        return res.json();
      })
    );

    const [users, posts, comments] = data;
    return { users, posts, comments };
  } catch (error) {
    console.error('API取得エラー:', error);
    throw error;
  }
}

// Promise.allSettledで失敗を許容
async function fetchWithFallback() {
  const results = await Promise.allSettled([
    fetch('https://api.example.com/primary'),
    fetch('https://api.example.com/fallback')
  ]);

  const successfulResults = results
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value);

  return successfulResults;
}
```

##### DOM操作とイベント処理

```javascript
// シンプルなTodoアプリ
class TodoApp {
  constructor(containerSelector) {
    this.container = document.querySelector(containerSelector);
    this.todos = [];
    this.nextId = 1;
    this.render();
  }

  addTodo(text) {
    if (!text.trim()) return;
    this.todos.push({
      id: this.nextId++,
      text: text.trim(),
      completed: false,
      createdAt: new Date()
    });
    this.render();
  }

  toggleTodo(id) {
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      this.render();
    }
  }

  deleteTodo(id) {
    this.todos = this.todos.filter(t => t.id !== id);
    this.render();
  }

  getStats() {
    const total = this.todos.length;
    const completed = this.todos.filter(t => t.completed).length;
    const pending = total - completed;
    return { total, completed, pending };
  }

  render() {
    const stats = this.getStats();
    this.container.innerHTML = `
      <div class="todo-app">
        <h2>Todo App</h2>
        <div class="todo-stats">
          全${stats.total}件 / 完了${stats.completed}件 / 未完了${stats.pending}件
        </div>
        <form class="todo-form">
          <input type="text" placeholder="新しいタスクを入力" class="todo-input" />
          <button type="submit">追加</button>
        </form>
        <ul class="todo-list">
          ${this.todos.map(todo => `
            <li class="todo-item ${todo.completed ? 'completed' : ''}">
              <input
                type="checkbox"
                ${todo.completed ? 'checked' : ''}
                data-action="toggle"
                data-id="${todo.id}"
              />
              <span>${todo.text}</span>
              <button data-action="delete" data-id="${todo.id}">削除</button>
            </li>
          `).join('')}
        </ul>
      </div>
    `;

    // イベントリスナーの設定
    const form = this.container.querySelector('.todo-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('.todo-input');
      this.addTodo(input.value);
    });

    this.container.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', () => {
        const id = parseInt(el.dataset.id);
        if (el.dataset.action === 'toggle') this.toggleTodo(id);
        if (el.dataset.action === 'delete') this.deleteTodo(id);
      });
    });
  }
}

// 使用例
const app = new TodoApp('#app');
```

#### Phase 2のミニプロジェクト

以下のプロジェクトを順に作成してください。

1. **電卓アプリ**: 四則演算、計算履歴機能付き
2. **天気予報アプリ**: OpenWeatherMap APIを使ったデータ取得・表示
3. **クイズアプリ**: 問題データをJSONで管理し、スコア計算

---

### Phase 3: フレームワーク習得

#### なぜReactを選ぶべきか（2026年時点）

2026年時点でのフロントエンドフレームワークのシェアを見ると、Reactが依然として最大のシェアを維持しています。

| フレームワーク | 求人シェア（国内） | 学習リソースの充実度 | コミュニティ規模 |
|-------------|------------------|-------------------|--------------|
| React | 約55% | 非常に充実 | 最大 |
| Vue.js | 約25% | 充実 | 大きい |
| Angular | 約12% | 充実 | 大きい |
| Svelte | 約5% | 増加中 | 成長中 |

参照: Stack Overflow Developer Survey 2025（https://survey.stackoverflow.co/）、日本のエンジニア求人サイトの動向分析に基づく概算です。

#### Reactの基本

```jsx
import { useState, useEffect } from 'react';

// 関数コンポーネントの基本形
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchUser() {
      try {
        setLoading(true);
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) throw new Error('ユーザー情報の取得に失敗');
        const data = await response.json();
        if (isMounted) {
          setUser(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchUser();
    return () => { isMounted = false; };
  }, [userId]);

  if (loading) return <div className="loading">読み込み中...</div>;
  if (error) return <div className="error">エラー: {error}</div>;
  if (!user) return null;

  return (
    <div className="user-profile">
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <p>登録日: {new Date(user.createdAt).toLocaleDateString('ja-JP')}</p>
    </div>
  );
}

export default UserProfile;
```

---

### Phase 4: バックエンド＋データベース

#### Node.js + Express + SQLiteの構成例

```javascript
// server.js
import express from 'express';
import Database from 'better-sqlite3';

const app = express();
app.use(express.json());

// データベース初期化
const db = new Database('app.db');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// CRUD API
app.get('/api/tasks', (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
  res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'タイトルは必須です' });
  }
  const stmt = db.prepare('INSERT INTO tasks (title) VALUES (?)');
  const result = stmt.run(title.trim());
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(task);
});

app.patch('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { completed } = req.body;
  const stmt = db.prepare('UPDATE tasks SET completed = ? WHERE id = ?');
  const result = stmt.run(completed ? 1 : 0, id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'タスクが見つかりません' });
  }
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'タスクが見つかりません' });
  }
  res.status(204).send();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

#### SQLの基本

```sql
-- テーブル作成
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- データ挿入
INSERT INTO users (name, email) VALUES ('田中太郎', 'tanaka@example.com');

-- データ取得（条件付き）
SELECT u.name, COUNT(t.id) AS task_count
FROM users u
LEFT JOIN tasks t ON u.id = t.user_id
GROUP BY u.id
HAVING task_count > 5
ORDER BY task_count DESC;

-- インデックス作成（検索速度の改善）
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_completed ON tasks(completed);
```

---

### Phase 5: ポートフォリオ制作

#### ポートフォリオに含めるべきプロジェクト

転職活動でのポートフォリオには、以下の3つのプロジェクトを含めることを推奨します。

| プロジェクト | 技術スタック | アピールポイント |
|------------|------------|---------------|
| フルスタックWebアプリ | React + Node.js + DB | CRUD操作、認証、API設計 |
| 外部API連携アプリ | React + 外部API | API統合、エラーハンドリング |
| チーム開発シミュレーション | Git + CI/CD + テスト | 実務に近い開発フロー |

#### ポートフォリオサイトの構成例

```typescript
// ポートフォリオサイトの型定義（TypeScript）
interface Project {
  id: string;
  title: string;
  description: string;
  techStack: string[];
  githubUrl: string;
  liveUrl?: string;
  thumbnail: string;
  highlights: string[];
}

interface PortfolioData {
  name: string;
  title: string;
  bio: string;
  skills: {
    category: string;
    items: string[];
  }[];
  projects: Project[];
  contact: {
    email: string;
    github: string;
    linkedin?: string;
  };
}

// ポートフォリオデータの例
const portfolioData: PortfolioData = {
  name: '田中太郎',
  title: 'フロントエンドエンジニア志望',
  bio: 'プログラミングを独学で学び、フルスタックWebアプリを開発しています。',
  skills: [
    {
      category: 'フロントエンド',
      items: ['HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Next.js']
    },
    {
      category: 'バックエンド',
      items: ['Node.js', 'Express', 'SQL', 'REST API']
    },
    {
      category: 'ツール',
      items: ['Git', 'GitHub', 'VS Code', 'Docker']
    }
  ],
  projects: [
    {
      id: 'task-manager',
      title: 'タスク管理アプリ',
      description: '認証機能付きのフルスタックタスク管理アプリケーション',
      techStack: ['React', 'TypeScript', 'Node.js', 'SQLite'],
      githubUrl: 'https://github.com/username/task-manager',
      liveUrl: 'https://task-manager.example.com',
      thumbnail: '/images/task-manager.png',
      highlights: [
        'JWT認証によるユーザー管理',
        'ドラッグ&ドロップによるタスク並べ替え',
        'レスポンシブデザイン対応'
      ]
    }
  ],
  contact: {
    email: 'tanaka@example.com',
    github: 'https://github.com/username'
  }
};
```

---

### Phase 6: 実務スキル（Git/テスト/CI/CD）

#### Gitの実務的な使い方

```bash
## ブランチ戦略（Git Flow簡易版）
git checkout -b feature/add-user-auth  # 機能ブランチを作成
git add .
git commit -m "feat: ユーザー認証機能を追加"
git push origin feature/add-user-auth

## コミットメッセージの規約（Conventional Commits）
## feat: 新機能
## fix: バグ修正
## docs: ドキュメントのみの変更
## style: コードの意味に影響しない変更（空白、フォーマット等）
## refactor: バグ修正でも機能追加でもないコード変更
## test: テストの追加・修正
## chore: ビルドプロセスやツールの変更

## コンフリクトの解決
git fetch origin
git merge origin/main
## コンフリクト箇所を手動で修正
git add .
git commit -m "merge: mainブランチとのコンフリクトを解決"
```

#### テストの書き方

```typescript
// sum.ts
export function sum(a: number, b: number): number {
  return a + b;
}

export function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error('ゼロで除算はできません');
  }
  return a / b;
}

// sum.test.ts（Vitestを使用）
import { describe, it, expect } from 'vitest';
import { sum, divide } from './sum';

describe('sum', () => {
  it('正の数同士の加算が正しい', () => {
    expect(sum(1, 2)).toBe(3);
  });

  it('負の数を含む加算が正しい', () => {
    expect(sum(-1, 2)).toBe(1);
  });

  it('小数の加算が正しい', () => {
    expect(sum(0.1, 0.2)).toBeCloseTo(0.3);
  });
});

describe('divide', () => {
  it('正常な除算が正しい', () => {
    expect(divide(10, 2)).toBe(5);
  });

  it('ゼロ除算でエラーが発生する', () => {
    expect(() => divide(10, 0)).toThrow('ゼロで除算はできません');
  });
});
```

---

### 学習進捗管理ツール

以下のTypeScriptコードは、学習進捗を管理するためのCLIツールです。各フェーズの進捗を記録し、学習ペースを可視化できます。

```typescript
// learning-tracker.ts
interface LearningPhase {
  id: number;
  name: string;
  topics: Topic[];
  startDate?: string;
  endDate?: string;
  estimatedWeeks: number;
}

interface Topic {
  name: string;
  completed: boolean;
  completedDate?: string;
  notes?: string;
}

interface LearningProgress {
  studentName: string;
  startDate: string;
  phases: LearningPhase[];
  dailyLogs: DailyLog[];
}

interface DailyLog {
  date: string;
  hoursStudied: number;
  topics: string[];
  notes: string;
}

class LearningTracker {
  private progress: LearningProgress;

  constructor(studentName: string) {
    this.progress = {
      studentName,
      startDate: new Date().toISOString().split('T')[0],
      phases: this.initializePhases(),
      dailyLogs: []
    };
  }

  private initializePhases(): LearningPhase[] {
    return [
      {
        id: 1,
        name: 'Web基礎（HTML/CSS/JS）',
        estimatedWeeks: 5,
        topics: [
          { name: 'HTMLセマンティクス', completed: false },
          { name: 'CSSレイアウト（Flexbox/Grid）', completed: false },
          { name: 'CSSレスポンシブデザイン', completed: false },
          { name: 'JavaScript基本文法', completed: false },
          { name: 'DOM操作', completed: false },
          { name: 'イベント処理', completed: false }
        ]
      },
      {
        id: 2,
        name: 'プログラミング基礎',
        estimatedWeeks: 5,
        topics: [
          { name: 'クロージャ・スコープ', completed: false },
          { name: '非同期処理（Promise/async-await）', completed: false },
          { name: 'ES2024+構文', completed: false },
          { name: 'エラーハンドリング', completed: false },
          { name: 'ミニプロジェクト制作', completed: false }
        ]
      },
      {
        id: 3,
        name: 'フレームワーク習得',
        estimatedWeeks: 7,
        topics: [
          { name: 'Reactコンポーネント基礎', completed: false },
          { name: 'useState / useEffect', completed: false },
          { name: 'カスタムフック', completed: false },
          { name: '状態管理（Context/Zustand）', completed: false },
          { name: 'ルーティング', completed: false },
          { name: 'APIデータ取得', completed: false }
        ]
      },
      {
        id: 4,
        name: 'バックエンド＋DB',
        estimatedWeeks: 7,
        topics: [
          { name: 'Node.js基礎', completed: false },
          { name: 'Express REST API', completed: false },
          { name: 'SQL基礎', completed: false },
          { name: '認証（JWT）', completed: false },
          { name: 'データベース設計', completed: false }
        ]
      },
      {
        id: 5,
        name: 'ポートフォリオ制作',
        estimatedWeeks: 5,
        topics: [
          { name: '企画・設計', completed: false },
          { name: 'フロントエンド実装', completed: false },
          { name: 'バックエンド実装', completed: false },
          { name: 'デプロイ', completed: false },
          { name: 'ドキュメント作成', completed: false }
        ]
      },
      {
        id: 6,
        name: '実務スキル',
        estimatedWeeks: 3,
        topics: [
          { name: 'Git/GitHub実践', completed: false },
          { name: 'テスト（Vitest）', completed: false },
          { name: 'CI/CD（GitHub Actions）', completed: false },
          { name: 'Docker基礎', completed: false }
        ]
      }
    ];
  }

  completeTopic(phaseId: number, topicName: string): void {
    const phase = this.progress.phases.find(p => p.id === phaseId);
    if (!phase) {
      console.error(`Phase ${phaseId} が見つかりません`);
      return;
    }
    const topic = phase.topics.find(t => t.name === topicName);
    if (!topic) {
      console.error(`トピック "${topicName}" が見つかりません`);
      return;
    }
    topic.completed = true;
    topic.completedDate = new Date().toISOString().split('T')[0];
    console.log(`[完了] ${phase.name} > ${topicName}`);
  }

  addDailyLog(hoursStudied: number, topics: string[], notes: string): void {
    this.progress.dailyLogs.push({
      date: new Date().toISOString().split('T')[0],
      hoursStudied,
      topics,
      notes
    });
  }

  getOverallProgress(): string {
    const lines: string[] = [];
    lines.push(`=== 学習進捗レポート: ${this.progress.studentName} ===`);
    lines.push(`学習開始日: ${this.progress.startDate}`);
    lines.push('');

    let totalTopics = 0;
    let completedTopics = 0;

    for (const phase of this.progress.phases) {
      const phaseCompleted = phase.topics.filter(t => t.completed).length;
      const phaseTotal = phase.topics.length;
      totalTopics += phaseTotal;
      completedTopics += phaseCompleted;

      const percentage = Math.round((phaseCompleted / phaseTotal) * 100);
      const bar = this.createProgressBar(percentage);

      lines.push(`Phase ${phase.id}: ${phase.name}`);
      lines.push(`  ${bar} ${percentage}% (${phaseCompleted}/${phaseTotal})`);
      lines.push(`  推定期間: ${phase.estimatedWeeks}週間`);

      for (const topic of phase.topics) {
        const status = topic.completed ? '[x]' : '[ ]';
        const dateStr = topic.completedDate ? ` (${topic.completedDate})` : '';
        lines.push(`    ${status} ${topic.name}${dateStr}`);
      }
      lines.push('');
    }

    const totalPercentage = Math.round((completedTopics / totalTopics) * 100);
    lines.push(`--- 全体進捗: ${totalPercentage}% (${completedTopics}/${totalTopics}) ---`);

    // 学習時間の統計
    if (this.progress.dailyLogs.length > 0) {
      const totalHours = this.progress.dailyLogs.reduce(
        (sum, log) => sum + log.hoursStudied, 0
      );
      const avgHours = totalHours / this.progress.dailyLogs.length;
      lines.push(`累計学習時間: ${totalHours.toFixed(1)}時間`);
      lines.push(`平均学習時間: ${avgHours.toFixed(1)}時間/日`);
      lines.push(`学習日数: ${this.progress.dailyLogs.length}日`);
    }

    return lines.join('\n');
  }

  private createProgressBar(percentage: number): string {
    const filled = Math.round(percentage / 5);
    const empty = 20 - filled;
    return `[${'#'.repeat(filled)}${'-'.repeat(empty)}]`;
  }

  getWeeklyReport(): string {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weekStr = oneWeekAgo.toISOString().split('T')[0];

    const weekLogs = this.progress.dailyLogs.filter(
      log => log.date >= weekStr
    );

    const totalHours = weekLogs.reduce((sum, log) => sum + log.hoursStudied, 0);
    const studyDays = weekLogs.length;

    const lines: string[] = [];
    lines.push('=== 週次レポート ===');
    lines.push(`期間: ${weekStr} - ${new Date().toISOString().split('T')[0]}`);
    lines.push(`学習日数: ${studyDays}日 / 7日`);
    lines.push(`合計学習時間: ${totalHours.toFixed(1)}時間`);

    if (studyDays > 0) {
      lines.push(`1日あたり平均: ${(totalHours / studyDays).toFixed(1)}時間`);
    }

    const allTopics = weekLogs.flatMap(log => log.topics);
    const topicCounts = allTopics.reduce<Record<string, number>>((acc, topic) => {
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {});

    lines.push('');
    lines.push('学習トピック:');
    for (const [topic, count] of Object.entries(topicCounts)) {
      lines.push(`  - ${topic}: ${count}回`);
    }

    return lines.join('\n');
  }
}

// 使用例
const tracker = new LearningTracker('田中太郎');

// トピックを完了にする
tracker.completeTopic(1, 'HTMLセマンティクス');
tracker.completeTopic(1, 'CSSレイアウト（Flexbox/Grid）');

// 日次ログを追加
tracker.addDailyLog(3.5, ['HTML', 'CSS'], 'Flexboxの基本を理解できた');
tracker.addDailyLog(2.0, ['CSS', 'JavaScript'], 'Gridレイアウトの実践');

// 進捗レポートを出力
console.log(tracker.getOverallProgress());
console.log('');
console.log(tracker.getWeeklyReport());
```

---

### 言語選択ガイド：目的別おすすめ言語

#### 2026年の言語別需要と用途

| 言語 | 主な用途 | 求人需要 | 初心者おすすめ度 | 平均年収（国内） |
|------|---------|---------|---------------|--------------|
| JavaScript/TypeScript | Web開発（フロント＋バック） | 非常に高い | 最高 | 500-800万円 |
| Python | AI/ML、データ分析、自動化 | 非常に高い | 高い | 550-900万円 |
| Java | 企業システム、Android | 高い | 中程度 | 500-750万円 |
| Go | バックエンド、インフラ | 増加中 | 中程度 | 600-1000万円 |
| Rust | システムプログラミング | 増加中 | 低い（上級者向け） | 650-1100万円 |
| Swift | iOS/macOSアプリ | 安定 | 中程度 | 550-850万円 |

参照: 各言語の年収データはレバテックフリーランス「プログラミング言語別年収ランキング」等を参考にした概算値です。

#### 目的別の推奨パス

**Webエンジニアを目指すなら**: JavaScript/TypeScript → React → Node.js

```
HTML/CSS → JavaScript → TypeScript → React → Next.js → Node.js → SQL
```

**AI/データサイエンティストを目指すなら**: Python → pandas → scikit-learn → TensorFlow/PyTorch

```
Python基礎 → NumPy/pandas → 統計学 → scikit-learn → 深層学習
```

**モバイルエンジニアを目指すなら**: Swift(iOS) or Kotlin(Android) or React Native/Flutter

```
(iOS) Swift → UIKit/SwiftUI → CoreData → ネットワーキング
(Android) Kotlin → Jetpack Compose → Room → Retrofit
(クロスプラットフォーム) JavaScript → React → React Native
```

---

### 挫折しないための5つの戦略

#### 1. 学習時間を固定する

毎日決まった時間に学習する習慣を作ることが最も重要です。「やる気が出たらやる」では続きません。

```
推奨スケジュール例（会社員の場合）:
平日: 朝6:00-7:30（1.5時間）
土日: 午前9:00-12:00（3時間）
週合計: 13.5時間
```

#### 2. 小さな成功体験を積み重ねる

大きなプロジェクトに挑戦する前に、小さなプログラムを完成させる経験を積みましょう。

#### 3. コミュニティに参加する

学習仲間がいると挫折率が大幅に下がります。以下のコミュニティがおすすめです。

| コミュニティ | 特徴 | 費用 |
|------------|------|------|
| connpass（勉強会検索） | 実際の勉強会・もくもく会 | 無料-数千円 |
| Zenn | 技術記事の投稿・閲覧 | 無料 |
| Discord各種 | リアルタイムの質問・交流 | 無料 |
| Qiita | 技術記事の投稿・閲覧 | 無料 |

#### 4. アウトプットを習慣化する

学んだことをブログや技術記事にまとめることで、理解が深まります。

#### 5. プログラミングスクールの活用

独学で行き詰まった場合、プログラミングスクールの活用も有効な選択肢です。特にPhase 3以降で挫折しやすいフレームワーク学習やポートフォリオ制作において、メンターのサポートは大きな助けになります。

スクール選びのポイントは以下の通りです。

- カリキュラムが現在の市場ニーズに合っているか（React/TypeScript/Next.jsを扱っているか）
- 教育訓練給付金の対象かどうか（費用の最大70%が補助される制度あり）
- 転職サポートの実績があるか
- メンターが現役エンジニアかどうか

参照: 厚生労働省「教育訓練給付制度」（https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/jinzaikaihatsu/kyouiku.html）で対象スクールを確認できます。

---

### まとめ：学習ロードマップの全体像

プログラミング学習は長い道のりですが、正しい順序で段階的に学べば確実にスキルが身につきます。

1. **Phase 1（4-6週間）**: HTML/CSS/JavaScriptの基礎を固める
2. **Phase 2（4-6週間）**: JavaScript中級概念を深掘りし、ミニプロジェクトを作る
3. **Phase 3（6-8週間）**: Reactフレームワークを習得する
4. **Phase 4（6-8週間）**: バックエンドとデータベースの基本を学ぶ
5. **Phase 5（4-6週間）**: ポートフォリオを作成する
6. **Phase 6（2-4週間）**: Git/テスト/CI/CDなどの実務スキルを身につける

最も重要なのは「毎日手を動かすこと」です。理論だけでなく、実際にコードを書き、エラーに直面し、解決する経験を積み重ねてください。

この記事で紹介した学習進捗管理ツールを活用し、自分のペースで着実にスキルアップしていきましょう。

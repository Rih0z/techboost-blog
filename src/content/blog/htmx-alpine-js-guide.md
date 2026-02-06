---
title: "htmx + Alpine.js実践ガイド: JavaScriptフレームワークなしのモダンWeb開発"
description: "htmxとAlpine.jsを組み合わせて、React/Vueなしでモダンなインタラクティブウェブアプリを構築する方法を実例とともに解説。シンプルさと強力さを両立した開発手法を学びましょう。"
pubDate: "2025-06-18"
updatedDate: "2025-06-18"
tags: ["htmx", "Alpine.js", "Web開発", "JavaScript", "フロントエンド"]
category: "Development"
---

React、Vue、Angularといった大規模JavaScriptフレームワークが主流となっている現在ですが、htmxとAlpine.jsを組み合わせることで、はるかにシンプルかつ効率的にモダンなウェブアプリケーションを構築できます。本記事では、この強力な組み合わせを実践的に解説します。

## htmx + Alpine.jsの哲学

### なぜこの組み合わせなのか

**htmx**は、HTML属性を使ってAJAXリクエストや部分的なページ更新を実現します。サーバーからHTMLフラグメントを受け取り、DOMに直接挿入するシンプルなアプローチです。

**Alpine.js**は、「HTMLの中のTailwind CSS」と呼ばれるほど軽量で、インラインで動的な振る舞いを追加できます。

この2つを組み合わせることで:

- **htmx**: サーバーとの通信とページ遷移
- **Alpine.js**: クライアント側の UI ステート管理とインタラクション

という役割分担が明確になり、両者の強みを最大限に活かせます。

## 基本セットアップ

### インストール

CDN経由で簡単に始められます。

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>htmx + Alpine.js App</title>

  <!-- htmx -->
  <script src="https://unpkg.com/htmx.org@2.0.0"></script>

  <!-- Alpine.js -->
  <script defer src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js"></script>

  <!-- Tailwind CSS (オプション) -->
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <!-- アプリケーションコンテンツ -->
</body>
</html>
```

npmでの管理も可能です:

```bash
npm install htmx.org alpinejs
```

```javascript
// main.js
import 'htmx.org';
import Alpine from 'alpinejs';

window.Alpine = Alpine;
Alpine.start();
```

## 実践例1: インタラクティブなTodoアプリ

### クライアント側の状態管理 (Alpine.js)

```html
<div x-data="{
  todos: [],
  newTodo: '',
  filter: 'all',

  get filteredTodos() {
    if (this.filter === 'active') {
      return this.todos.filter(t => !t.completed);
    }
    if (this.filter === 'completed') {
      return this.todos.filter(t => t.completed);
    }
    return this.todos;
  },

  get stats() {
    return {
      total: this.todos.length,
      active: this.todos.filter(t => !t.completed).length,
      completed: this.todos.filter(t => t.completed).length
    };
  }
}">
  <!-- 統計表示 -->
  <div class="flex gap-4 mb-4">
    <div class="badge">
      全体: <span x-text="stats.total"></span>
    </div>
    <div class="badge">
      未完了: <span x-text="stats.active"></span>
    </div>
    <div class="badge">
      完了: <span x-text="stats.completed"></span>
    </div>
  </div>

  <!-- フィルター -->
  <div class="flex gap-2 mb-4">
    <button @click="filter = 'all'"
            :class="filter === 'all' ? 'btn-active' : 'btn'">
      すべて
    </button>
    <button @click="filter = 'active'"
            :class="filter === 'active' ? 'btn-active' : 'btn'">
      未完了
    </button>
    <button @click="filter = 'completed'"
            :class="filter === 'completed' ? 'btn-active' : 'btn'">
      完了
    </button>
  </div>

  <!-- Todo追加フォーム (htmx) -->
  <form hx-post="/api/todos"
        hx-target="#todo-list"
        hx-swap="beforeend"
        @htmx:after-request="newTodo = ''"
        class="mb-4">
    <input type="text"
           name="title"
           x-model="newTodo"
           placeholder="新しいタスク"
           class="input">
    <button type="submit" class="btn">追加</button>
  </form>

  <!-- Todoリスト -->
  <div id="todo-list">
    <template x-for="todo in filteredTodos" :key="todo.id">
      <div class="todo-item"
           :class="{ 'completed': todo.completed }"
           x-data="{ editing: false, editText: todo.title }">

        <div x-show="!editing" class="flex items-center gap-2">
          <!-- チェックボックス (htmx) -->
          <input type="checkbox"
                 :checked="todo.completed"
                 hx-patch="`/api/todos/${todo.id}/toggle`"
                 hx-swap="none">

          <span x-text="todo.title"
                @dblclick="editing = true"
                class="flex-1"></span>

          <button @click="editing = true" class="btn-sm">編集</button>

          <!-- 削除ボタン (htmx) -->
          <button hx-delete="`/api/todos/${todo.id}`"
                  hx-target="closest .todo-item"
                  hx-swap="outerHTML swap:0.5s"
                  class="btn-sm btn-danger">
            削除
          </button>
        </div>

        <!-- 編集モード -->
        <div x-show="editing" class="flex gap-2">
          <input type="text"
                 x-model="editText"
                 @keyup.enter="editing = false"
                 @keyup.escape="editing = false; editText = todo.title"
                 class="input flex-1">
          <button @click="editing = false" class="btn-sm">保存</button>
        </div>
      </div>
    </template>
  </div>
</div>
```

### サーバー側 (Node.js/Express)

```javascript
import express from 'express';

const app = express();
app.use(express.urlencoded({ extended: true }));

let todos = [
  { id: 1, title: 'htmxを学ぶ', completed: false },
  { id: 2, title: 'Alpine.jsを学ぶ', completed: false },
];
let nextId = 3;

// Todo追加
app.post('/api/todos', (req, res) => {
  const todo = {
    id: nextId++,
    title: req.body.title,
    completed: false,
  };
  todos.push(todo);

  // HTMLフラグメントを返す
  res.send(`
    <div class="todo-item" x-data="{ editing: false, editText: '${todo.title}' }">
      <!-- 上記と同じ構造 -->
    </div>
  `);
});

// Todo完了/未完了切り替え
app.patch('/api/todos/:id/toggle', (req, res) => {
  const todo = todos.find(t => t.id === parseInt(req.params.id));
  if (todo) {
    todo.completed = !todo.completed;
  }
  res.status(204).send();
});

// Todo削除
app.delete('/api/todos/:id', (req, res) => {
  todos = todos.filter(t => t.id !== parseInt(req.params.id));
  res.status(200).send(''); // 空のレスポンスで要素を削除
});

app.listen(3000);
```

## 実践例2: リアルタイム検索

### クライアント側

```html
<div x-data="{
  query: '',
  results: [],
  isSearching: false,
  selectedIndex: -1,

  // キーボードナビゲーション
  selectNext() {
    this.selectedIndex = Math.min(this.selectedIndex + 1, this.results.length - 1);
  },
  selectPrev() {
    this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
  },
  selectCurrent() {
    if (this.selectedIndex >= 0) {
      window.location.href = this.results[this.selectedIndex].url;
    }
  }
}">
  <!-- 検索フォーム -->
  <div class="relative">
    <input type="text"
           x-model="query"
           @input.debounce.300ms="$refs.searchForm.dispatchEvent(new Event('submit'))"
           @keydown.down.prevent="selectNext()"
           @keydown.up.prevent="selectPrev()"
           @keydown.enter.prevent="selectCurrent()"
           placeholder="検索..."
           class="input w-full">

    <!-- ローディングインジケーター -->
    <div x-show="isSearching" class="absolute right-3 top-3">
      <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
        <!-- スピナーアイコン -->
      </svg>
    </div>
  </div>

  <!-- 検索結果 -->
  <form x-ref="searchForm"
        hx-get="/api/search"
        hx-trigger="submit"
        hx-include="[x-model='query']"
        hx-target="#search-results"
        @htmx:before-request="isSearching = true"
        @htmx:after-request="isSearching = false">

    <div id="search-results" class="mt-4">
      <template x-for="(result, index) in results" :key="result.id">
        <a :href="result.url"
           class="search-result"
           :class="{ 'selected': index === selectedIndex }"
           @mouseenter="selectedIndex = index">
          <div class="font-bold" x-text="result.title"></div>
          <div class="text-sm text-gray-600" x-text="result.description"></div>
        </a>
      </template>

      <div x-show="query && results.length === 0 && !isSearching">
        検索結果が見つかりません
      </div>
    </div>
  </form>
</div>
```

### サーバー側

```javascript
app.get('/api/search', async (req, res) => {
  const query = req.query.q || '';

  if (!query) {
    return res.send('');
  }

  // データベース検索（例）
  const results = await db.search(query);

  // Alpine.jsで使用できるようにデータを埋め込む
  const html = results.map(r => `
    <a href="${r.url}"
       class="search-result"
       x-data="{ result: ${JSON.stringify(r)} }">
      <div class="font-bold" x-text="result.title"></div>
      <div class="text-sm text-gray-600" x-text="result.description"></div>
    </a>
  `).join('');

  res.send(html);
});
```

## 実践例3: モーダルとトースト通知

### 再利用可能なAlpine.jsコンポーネント

```html
<!-- Alpine.jsグローバルストア -->
<script>
  document.addEventListener('alpine:init', () => {
    // モーダル管理
    Alpine.store('modal', {
      isOpen: false,
      title: '',
      content: '',

      open(title, content) {
        this.title = title;
        this.content = content;
        this.isOpen = true;
      },

      close() {
        this.isOpen = false;
      }
    });

    // トースト通知
    Alpine.store('toast', {
      messages: [],

      show(message, type = 'info', duration = 3000) {
        const id = Date.now();
        this.messages.push({ id, message, type });

        setTimeout(() => {
          this.messages = this.messages.filter(m => m.id !== id);
        }, duration);
      },

      success(message) {
        this.show(message, 'success');
      },

      error(message) {
        this.show(message, 'error');
      }
    });
  });
</script>

<!-- モーダルコンポーネント -->
<div x-show="$store.modal.isOpen"
     x-cloak
     @keydown.escape.window="$store.modal.close()"
     class="modal-overlay">
  <div class="modal-content"
       @click.outside="$store.modal.close()">
    <div class="modal-header">
      <h2 x-text="$store.modal.title"></h2>
      <button @click="$store.modal.close()">×</button>
    </div>
    <div class="modal-body" x-html="$store.modal.content"></div>
  </div>
</div>

<!-- トースト通知コンポーネント -->
<div class="toast-container">
  <template x-for="toast in $store.toast.messages" :key="toast.id">
    <div class="toast"
         :class="`toast-${toast.type}`"
         x-transition:enter="transition ease-out duration-300"
         x-transition:leave="transition ease-in duration-200">
      <span x-text="toast.message"></span>
      <button @click="$store.toast.messages = $store.toast.messages.filter(m => m.id !== toast.id)">
        ×
      </button>
    </div>
  </template>
</div>

<!-- 使用例 -->
<button hx-get="/api/user/123"
        hx-target="#user-modal-content"
        @htmx:after-request="$store.modal.open('ユーザー詳細', $event.detail.xhr.response)">
  ユーザー情報を表示
</button>

<form hx-post="/api/save"
      @htmx:after-request="$store.toast.success('保存しました')">
  <!-- フォーム内容 -->
</form>
```

## 実践例4: 無限スクロール

```html
<div x-data="{
  page: 1,
  hasMore: true,
  isLoading: false
}"
     @scroll.window="
       if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 100 && hasMore && !isLoading) {
         page++;
         $refs.loadMore.click();
       }
     ">

  <div id="items-container">
    <!-- 初期アイテム -->
  </div>

  <!-- 無限スクロール用の隠しボタン -->
  <button x-ref="loadMore"
          hx-get="/api/items"
          hx-target="#items-container"
          hx-swap="beforeend"
          hx-vals="js:{ page: Alpine.$data($el).page }"
          @htmx:before-request="isLoading = true"
          @htmx:after-request="isLoading = false; hasMore = $event.detail.xhr.response.length > 0"
          style="display: none;">
  </button>

  <!-- ローディング表示 -->
  <div x-show="isLoading" class="text-center py-4">
    読み込み中...
  </div>

  <div x-show="!hasMore" class="text-center py-4">
    すべて読み込みました
  </div>
</div>
```

### サーバー側

```javascript
app.get('/api/items', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const perPage = 20;
  const items = fetchItems(page, perPage);

  const html = items.map(item => `
    <div class="item">
      <h3>${item.title}</h3>
      <p>${item.description}</p>
    </div>
  `).join('');

  res.send(html);
});
```

## 実践例5: フォームバリデーション

```html
<form x-data="{
  formData: {
    email: '',
    password: '',
    confirmPassword: ''
  },
  errors: {},
  touched: {},

  validateEmail() {
    if (!this.formData.email) {
      this.errors.email = 'メールアドレスは必須です';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.formData.email)) {
      this.errors.email = '有効なメールアドレスを入力してください';
    } else {
      delete this.errors.email;
    }
  },

  validatePassword() {
    if (!this.formData.password) {
      this.errors.password = 'パスワードは必須です';
    } else if (this.formData.password.length < 8) {
      this.errors.password = 'パスワードは8文字以上必要です';
    } else {
      delete this.errors.password;
    }
  },

  validateConfirmPassword() {
    if (this.formData.password !== this.formData.confirmPassword) {
      this.errors.confirmPassword = 'パスワードが一致しません';
    } else {
      delete this.errors.confirmPassword;
    }
  },

  get isValid() {
    return Object.keys(this.errors).length === 0 &&
           this.formData.email &&
           this.formData.password &&
           this.formData.confirmPassword;
  }
}"
      hx-post="/api/register"
      hx-disabled-elt="button[type='submit']"
      @htmx:after-request="$store.toast.success('登録しました')">

  <!-- メールアドレス -->
  <div class="form-group">
    <label>メールアドレス</label>
    <input type="email"
           x-model="formData.email"
           @blur="touched.email = true; validateEmail()"
           @input="touched.email && validateEmail()"
           :class="{ 'error': touched.email && errors.email }"
           class="input">
    <span x-show="touched.email && errors.email"
          x-text="errors.email"
          class="error-message"></span>
  </div>

  <!-- パスワード -->
  <div class="form-group">
    <label>パスワード</label>
    <input type="password"
           x-model="formData.password"
           @blur="touched.password = true; validatePassword()"
           @input="touched.password && validatePassword(); validateConfirmPassword()"
           :class="{ 'error': touched.password && errors.password }"
           class="input">
    <span x-show="touched.password && errors.password"
          x-text="errors.password"
          class="error-message"></span>
  </div>

  <!-- パスワード確認 -->
  <div class="form-group">
    <label>パスワード確認</label>
    <input type="password"
           x-model="formData.confirmPassword"
           @blur="touched.confirmPassword = true; validateConfirmPassword()"
           @input="touched.confirmPassword && validateConfirmPassword()"
           :class="{ 'error': touched.confirmPassword && errors.confirmPassword }"
           class="input">
    <span x-show="touched.confirmPassword && errors.confirmPassword"
          x-text="errors.confirmPassword"
          class="error-message"></span>
  </div>

  <button type="submit"
          :disabled="!isValid"
          class="btn">
    登録
  </button>
</form>
```

## パフォーマンス最適化

### 1. htmxのリクエストキャッシング

```html
<!-- 結果をキャッシュ -->
<button hx-get="/api/data"
        hx-cache="true">
  データを取得
</button>
```

### 2. Alpine.jsの遅延初期化

```html
<!-- ビューポートに入るまで初期化を遅延 -->
<div x-data="expensiveComponent()"
     x-intersect="$el._x_dataStack[0].init()">
  <!-- コンポーネント内容 -->
</div>
```

### 3. htmx拡張機能の活用

```html
<!-- 楽観的UI更新 -->
<button hx-post="/api/like"
        hx-ext="optimistic">
  いいね
</button>
```

## まとめ

htmxとAlpine.jsの組み合わせは、以下の利点があります:

- **学習コストが低い**: HTML中心のアプローチで直感的
- **バンドルサイズが小さい**: 合計約30KB (gzip圧縮後)
- **サーバーサイドレンダリング**: SEOに有利
- **段階的な導入**: 既存のアプリに少しずつ追加可能
- **開発速度**: ボイラープレートが少なく、素早く実装できる

React/Vueのような大規模SPAが必要ないプロジェクトでは、htmx + Alpine.jsの方がシンプルで保守しやすいコードベースを実現できます。ぜひ試してみてください。

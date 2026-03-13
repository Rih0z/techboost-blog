---
title: 'Angular Signals完全ガイド：signal(), computed(), effect()で始めるリア...'
description: 'Angular 16で導入されたSignalsの完全ガイド。signal(), computed(), effect()の使い方、RxJSとの共存、状態管理のベストプラクティスを実践的なコード例とともに解説します。'
pubDate: '2026-02-06'
tags: ['Angular', 'Signals', 'TypeScript', 'リアクティブプログラミング', 'フロントエンド']
heroImage: '../../assets/thumbnails/angular-signals-guide.jpg'
---
Angular Signalsは、Angular 16で導入された新しいリアクティブプログラミングモデルです。この記事では、Signalsの基本から実践的な活用法、RxJSとの共存方法まで詳しく解説します。

## Angular Signalsとは

Signalsは、Angular独自のリアクティブプリミティブで、状態管理とChange Detectionを劇的にシンプルかつ高速にします。

### 従来の問題点

```typescript
// 従来のAngular（Zone.js依存）
export class CounterComponent {
  count = 0;

  increment() {
    this.count++;  // Zone.jsが変更を検知してChange Detection
  }
}
```

この方法の問題点:

- **パフォーマンス** - コンポーネントツリー全体をチェック
- **予測不可能** - いつChange Detectionが走るか不明確
- **デバッグ困難** - Zone.jsのマジックが見えにくい

### Signalsによる解決

```typescript
// Signals（Angular 16+）
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-counter',
  template: `
    <p>Count: {{ count() }}</p>
    <button (click)="increment()">+1</button>
  `
})
export class CounterComponent {
  count = signal(0);  // Signal作成

  increment() {
    this.count.update(n => n + 1);  // 自動的にこのコンポーネントだけ更新
  }
}
```

## 基本的なSignal

### signal() - 書き込み可能なSignal

```typescript
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-user-profile',
  template: `
    <h1>{{ username() }}</h1>
    <p>Age: {{ age() }}</p>
    <button (click)="incrementAge()">Happy Birthday!</button>
  `
})
export class UserProfileComponent {
  // プリミティブ型
  username = signal('Alice');
  age = signal(25);

  // オブジェクト型
  user = signal({
    name: 'Alice',
    email: 'alice@example.com'
  });

  // 値の読み取り（関数呼び出し）
  getUsername() {
    return this.username();  // "Alice"
  }

  // 値の更新（set）
  setUsername(name: string) {
    this.username.set(name);
  }

  // 値の更新（update）
  incrementAge() {
    this.age.update(current => current + 1);
  }

  // オブジェクトの更新
  updateEmail(email: string) {
    this.user.update(current => ({
      ...current,
      email
    }));
  }
}
```

### set() vs update()

```typescript
// set() - 新しい値で完全に置き換える
count.set(10);

// update() - 現在の値を元に更新
count.update(n => n + 1);

// オブジェクトの場合
user.set({ name: 'Bob', email: 'bob@example.com' });
user.update(u => ({ ...u, name: 'Bob' }));
```

## computed() - 派生Signal

computed()は、他のSignalから自動的に計算される読み取り専用のSignalです。

```typescript
import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-shopping-cart',
  template: `
    <h2>Shopping Cart</h2>
    <p>Items: {{ itemCount() }}</p>
    <p>Total: ${{ total() }}</p>
    <p>Tax: ${{ tax() }}</p>
    <p>Grand Total: ${{ grandTotal() }}</p>
  `
})
export class ShoppingCartComponent {
  items = signal([
    { name: 'Apple', price: 1.2, quantity: 3 },
    { name: 'Banana', price: 0.8, quantity: 5 },
  ]);

  // アイテム数を自動計算
  itemCount = computed(() => {
    return this.items().reduce((sum, item) => sum + item.quantity, 0);
  });

  // 合計金額を自動計算
  total = computed(() => {
    return this.items().reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  });

  // 税金を自動計算（totalが変わると自動的に再計算）
  tax = computed(() => this.total() * 0.1);

  // 総計を自動計算（totalとtaxが変わると自動的に再計算）
  grandTotal = computed(() => this.total() + this.tax());

  addItem(item: Item) {
    this.items.update(items => [...items, item]);
    // itemCount, total, tax, grandTotal すべて自動更新
  }
}
```

### computed()の特徴

- **自動追跡** - 依存するSignalを自動的に追跡
- **メモ化** - 依存が変わらない限り再計算しない
- **遅延評価** - 実際に読み取られるまで計算しない
- **読み取り専用** - 値を直接変更できない

```typescript
// ネストしたcomputed
const firstName = signal('John');
const lastName = signal('Doe');

const fullName = computed(() => `${firstName()} ${lastName()}`);
const greeting = computed(() => `Hello, ${fullName()}!`);

console.log(greeting());  // "Hello, John Doe!"

firstName.set('Jane');
console.log(greeting());  // "Hello, Jane Doe!" (自動更新)
```

## effect() - 副作用の実行

effect()は、Signalが変更されたときに自動的に実行される副作用です。

```typescript
import { Component, signal, effect } from '@angular/core';

@Component({
  selector: 'app-theme-switcher',
  template: `
    <button (click)="toggleTheme()">
      Current: {{ theme() }}
    </button>
  `
})
export class ThemeSwitcherComponent {
  theme = signal<'light' | 'dark'>('light');

  constructor() {
    // themeが変わるたびに実行される
    effect(() => {
      const currentTheme = this.theme();
      console.log('Theme changed to:', currentTheme);

      // DOMを直接操作
      document.body.className = currentTheme;

      // LocalStorageに保存
      localStorage.setItem('theme', currentTheme);
    });

    // 初期化時にLocalStorageから読み込み
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      this.theme.set(savedTheme);
    }
  }

  toggleTheme() {
    this.theme.update(t => t === 'light' ? 'dark' : 'light');
  }
}
```

### effect()のクリーンアップ

```typescript
import { effect } from '@angular/core';

effect((onCleanup) => {
  const userId = this.userId();

  // WebSocket接続
  const ws = new WebSocket(`ws://api.example.com/users/${userId}`);

  ws.onmessage = (event) => {
    this.userData.set(JSON.parse(event.data));
  };

  // クリーンアップ（userIdが変わったときやコンポーネント破棄時）
  onCleanup(() => {
    ws.close();
    console.log('WebSocket closed');
  });
});
```

### effect()の実行タイミング制御

```typescript
import { effect } from '@angular/core';

// デフォルト（即座に実行）
effect(() => {
  console.log('Current count:', this.count());
});

// 最初は実行せず、変更時のみ実行
effect(() => {
  console.log('Count changed:', this.count());
}, { allowSignalWrites: false });
```

## フォームとSignals

### リアクティブフォームとの統合

```typescript
import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-user-form',
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <input formControlName="email" placeholder="Email">
      <input formControlName="password" type="password" placeholder="Password">

      <p *ngIf="isValid()">✓ Form is valid</p>
      <p *ngIf="!isValid()">✗ Form has errors</p>

      <button type="submit" [disabled]="!isValid()">Submit</button>
    </form>
  `
})
export class UserFormComponent {
  form: FormGroup;
  isValid = signal(false);

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });

    // フォームの状態をSignalに同期
    this.form.statusChanges.subscribe(status => {
      this.isValid.set(status === 'VALID');
    });
  }

  onSubmit() {
    if (this.isValid()) {
      console.log('Form data:', this.form.value);
    }
  }
}
```

### カスタムフォームコントロール

```typescript
import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-custom-input',
  template: `
    <input
      [value]="value()"
      (input)="onInput($event)"
      [class.error]="hasError()"
    >
    <span *ngIf="hasError()" class="error-message">
      {{ errorMessage() }}
    </span>
  `
})
export class CustomInputComponent {
  value = signal('');
  validators = signal<Array<(value: string) => string | null>>([]);

  // エラーメッセージを自動計算
  errorMessage = computed(() => {
    const val = this.value();
    for (const validator of this.validators()) {
      const error = validator(val);
      if (error) return error;
    }
    return null;
  });

  hasError = computed(() => this.errorMessage() !== null);

  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.value.set(input.value);
  }

  // バリデーターを追加
  addValidator(validator: (value: string) => string | null) {
    this.validators.update(validators => [...validators, validator]);
  }
}
```

## RxJSとの共存

SignalsとRxJSを組み合わせることで、両方の利点を活用できます。

### SignalをObservableに変換

```typescript
import { Component, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-search',
  template: `
    <input (input)="onSearch($event)" placeholder="Search...">
    <ul>
      <li *ngFor="let result of results()">{{ result }}</li>
    </ul>
  `
})
export class SearchComponent {
  searchTerm = signal('');
  results = signal<string[]>([]);

  constructor() {
    // SignalをObservableに変換
    const searchTerm$ = toObservable(this.searchTerm);

    searchTerm$
      .pipe(
        debounceTime(300),
        switchMap(term => this.searchApi(term))
      )
      .subscribe(results => {
        this.results.set(results);
      });
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  searchApi(term: string) {
    // APIコール（Observable）
    return this.http.get<string[]>(`/api/search?q=${term}`);
  }
}
```

### ObservableをSignalに変換

```typescript
import { Component, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

@Component({
  selector: 'app-timer',
  template: `<p>Elapsed: {{ elapsed() }} seconds</p>`
})
export class TimerComponent {
  // ObservableをSignalに変換
  elapsed = toSignal(interval(1000), { initialValue: 0 });
}
```

### HTTPリクエストとSignals

```typescript
import { Component, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';

interface User {
  id: number;
  name: string;
  email: string;
}

@Component({
  selector: 'app-user-list',
  template: `
    <div *ngIf="loading()">Loading...</div>
    <div *ngIf="error()">Error: {{ error() }}</div>
    <ul *ngIf="users()">
      <li *ngFor="let user of users()">
        {{ user.name }} ({{ user.email }})
      </li>
    </ul>
  `
})
export class UserListComponent {
  loading = signal(true);
  error = signal<string | null>(null);
  users = signal<User[]>([]);

  constructor(private http: HttpClient) {
    this.loadUsers();
  }

  loadUsers() {
    this.http.get<User[]>('/api/users')
      .subscribe({
        next: (users) => {
          this.users.set(users);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err.message);
          this.loading.set(false);
        }
      });
  }
}
```

## 状態管理

### シンプルなストア

```typescript
// store.service.ts
import { Injectable, signal, computed } from '@angular/core';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

@Injectable({ providedIn: 'root' })
export class TodoStore {
  // プライベートなSignal（内部状態）
  private todos = signal<Todo[]>([]);
  private nextId = signal(1);

  // パブリックなcomputed（読み取り専用）
  allTodos = computed(() => this.todos());
  completedTodos = computed(() => this.todos().filter(t => t.completed));
  activeTodos = computed(() => this.todos().filter(t => !t.completed));
  todoCount = computed(() => this.todos().length);

  // アクション
  addTodo(text: string) {
    const id = this.nextId();
    this.todos.update(todos => [
      ...todos,
      { id, text, completed: false }
    ]);
    this.nextId.update(id => id + 1);
  }

  toggleTodo(id: number) {
    this.todos.update(todos =>
      todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  }

  removeTodo(id: number) {
    this.todos.update(todos => todos.filter(t => t.id !== id));
  }

  clearCompleted() {
    this.todos.update(todos => todos.filter(t => !t.completed));
  }
}
```

### コンポーネントから利用

```typescript
@Component({
  selector: 'app-todo-list',
  template: `
    <h2>Todos ({{ store.todoCount() }})</h2>

    <input #input (keyup.enter)="addTodo(input.value); input.value = ''">

    <ul>
      <li *ngFor="let todo of store.allTodos()">
        <input
          type="checkbox"
          [checked]="todo.completed"
          (change)="store.toggleTodo(todo.id)"
        >
        <span [class.completed]="todo.completed">{{ todo.text }}</span>
        <button (click)="store.removeTodo(todo.id)">Delete</button>
      </li>
    </ul>

    <p>Active: {{ store.activeTodos().length }}</p>
    <p>Completed: {{ store.completedTodos().length }}</p>
    <button (click)="store.clearCompleted()">Clear Completed</button>
  `
})
export class TodoListComponent {
  constructor(public store: TodoStore) {}

  addTodo(text: string) {
    if (text.trim()) {
      this.store.addTodo(text.trim());
    }
  }
}
```

## パフォーマンス最適化

### OnPush戦略との組み合わせ

```typescript
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';

@Component({
  selector: 'app-optimized',
  template: `<p>{{ data() }}</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush  // 手動Change Detection
})
export class OptimizedComponent {
  data = signal('Initial');

  // SignalsはOnPushと完璧に連携
  // Signalが更新されると自動的にこのコンポーネントだけ更新
}
```

## まとめ

Angular Signalsの主な利点をまとめます。

- **シンプル** - Zone.jsなしでリアクティブに
- **高速** - 必要な部分だけ更新
- **型安全** - TypeScriptと完全統合
- **RxJS共存** - toObservable/toSignalで相互変換
- **デバッグ容易** - 明示的な依存関係

Angular 16以降の新規プロジェクトでは、Signalsを積極的に活用しましょう。従来のRxJSベースのコードも徐々にSignalsに移行することで、よりシンプルで保守しやすいコードベースを実現できます。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)

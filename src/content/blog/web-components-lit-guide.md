---
title: 'Lit + Web Components実践: フレームワーク非依存のコンポーネント開発'
description: 'Litを使ったモダンなWeb Componentsの開発方法を実践的に解説。リアクティビティ、ライフサイクル、スタイリング、イベント処理から、実際のコンポーネントライブラリ構築まで網羅します。'
pubDate: '2025-08-28'
updatedDate: '2025-08-28'
tags: ['Web Components', 'Lit', 'Custom Elements', 'Shadow DOM', 'Frontend']
category: 'frontend'
---

## はじめに

Litは、GoogleによってメンテナンスされているWeb Componentsライブラリです。わずか5KBの軽量さでありながら、リアクティビティ、宣言的テンプレート、そしてモダンな開発体験を提供します。

この記事では、Litを使った実践的なWeb Components開発を、基礎から応用まで包括的に解説します。

## LitとWeb Componentsの関係

### Web Componentsの基本

Web Componentsは、3つのブラウザ標準技術で構成されています。

1. **Custom Elements**: 独自のHTML要素を定義
2. **Shadow DOM**: カプセル化されたDOM
3. **HTML Templates**: 再利用可能なマークアップ

### Litが提供する価値

- リアクティブなプロパティとステート管理
- 宣言的なテンプレート記法
- 効率的な差分更新
- TypeScriptファーストの開発体験
- 最小限のボイラープレート

## セットアップ

### プロジェクトの作成

```bash
npm create vite@latest my-components -- --template lit-ts
cd my-components
npm install
```

### 基本的なコンポーネント

```typescript
// src/components/simple-greeting.ts
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('simple-greeting')
export class SimpleGreeting extends LitElement {
  static styles = css`
    :host {
      display: block;
      padding: 16px;
      font-family: sans-serif;
    }

    .greeting {
      color: #1e40af;
      font-size: 24px;
      font-weight: bold;
    }
  `;

  @property()
  name = 'World';

  render() {
    return html`
      <div class="greeting">
        Hello, ${this.name}!
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'simple-greeting': SimpleGreeting;
  }
}
```

使用例:

```html
<!DOCTYPE html>
<html>
  <head>
    <script type="module" src="/src/components/simple-greeting.ts"></script>
  </head>
  <body>
    <simple-greeting name="Alice"></simple-greeting>
    <simple-greeting name="Bob"></simple-greeting>
  </body>
</html>
```

## リアクティブプロパティとステート

### プロパティの種類

```typescript
// src/components/reactive-demo.ts
import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('reactive-demo')
export class ReactiveDemo extends LitElement {
  // 外部から設定可能なリアクティブプロパティ
  @property({ type: String })
  title = '';

  // 数値型
  @property({ type: Number })
  count = 0;

  // 真偽値型
  @property({ type: Boolean })
  disabled = false;

  // オブジェクト/配列（hasChangedを使って比較）
  @property({ type: Array })
  items: string[] = [];

  // 内部ステート（外部から設定不可）
  @state()
  private isExpanded = false;

  render() {
    return html`
      <div>
        <h2>${this.title}</h2>
        <p>Count: ${this.count}</p>
        <button ?disabled=${this.disabled} @click=${this.increment}>
          Increment
        </button>

        <button @click=${this.toggleExpanded}>
          ${this.isExpanded ? 'Collapse' : 'Expand'}
        </button>

        ${this.isExpanded
          ? html`
              <ul>
                ${this.items.map((item) => html`<li>${item}</li>`)}
              </ul>
            `
          : null}
      </div>
    `;
  }

  increment() {
    this.count++;
  }

  toggleExpanded() {
    this.isExpanded = !this.isExpanded;
  }
}
```

### カスタム変更検出

```typescript
// src/components/custom-changed.ts
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

interface User {
  id: string;
  name: string;
}

@customElement('user-card')
export class UserCard extends LitElement {
  @property({
    type: Object,
    // カスタム変更検出: IDが変わったときのみ再レンダリング
    hasChanged(newVal: User | undefined, oldVal: User | undefined) {
      return newVal?.id !== oldVal?.id;
    },
  })
  user?: User;

  render() {
    return html`
      <div class="card">
        ${this.user ? html`<h3>${this.user.name}</h3>` : html`<p>No user</p>`}
      </div>
    `;
  }
}
```

## テンプレート記法

### 条件分岐

```typescript
// src/components/conditional-render.ts
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('status-badge')
export class StatusBadge extends LitElement {
  @property()
  status: 'success' | 'warning' | 'error' = 'success';

  render() {
    // 三項演算子
    return html`
      <div class="badge">
        ${this.status === 'success'
          ? html`<span class="icon">✓</span>`
          : this.status === 'warning'
            ? html`<span class="icon">⚠</span>`
            : html`<span class="icon">✗</span>`}
      </div>
    `;
  }
}
```

### ループ処理

```typescript
// src/components/todo-list.ts
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

@customElement('todo-list')
export class TodoList extends LitElement {
  static styles = css`
    .todo-item {
      display: flex;
      gap: 8px;
      padding: 8px;
      border-bottom: 1px solid #e5e7eb;
    }

    .completed {
      text-decoration: line-through;
      opacity: 0.6;
    }
  `;

  @state()
  private todos: Todo[] = [
    { id: '1', text: 'Learn Lit', completed: false },
    { id: '2', text: 'Build components', completed: false },
    { id: '3', text: 'Ship to production', completed: false },
  ];

  render() {
    return html`
      <div class="todo-list">
        ${repeat(
          this.todos,
          (todo) => todo.id, // キー（パフォーマンス最適化）
          (todo) => html`
            <div class="todo-item">
              <input
                type="checkbox"
                .checked=${todo.completed}
                @change=${() => this.toggleTodo(todo.id)}
              />
              <span class=${todo.completed ? 'completed' : ''}>
                ${todo.text}
              </span>
              <button @click=${() => this.removeTodo(todo.id)}>Delete</button>
            </div>
          `
        )}
      </div>
    `;
  }

  toggleTodo(id: string) {
    this.todos = this.todos.map((todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
  }

  removeTodo(id: string) {
    this.todos = this.todos.filter((todo) => todo.id !== id);
  }
}
```

### クラスとスタイルのバインディング

```typescript
// src/components/dynamic-styles.ts
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';

@customElement('dynamic-button')
export class DynamicButton extends LitElement {
  static styles = css`
    button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .primary {
      background: #3b82f6;
      color: white;
    }

    .secondary {
      background: #6b7280;
      color: white;
    }

    .large {
      font-size: 18px;
      padding: 12px 24px;
    }

    .disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;

  @property()
  variant: 'primary' | 'secondary' = 'primary';

  @property({ type: Boolean })
  large = false;

  @property({ type: Boolean })
  disabled = false;

  @property()
  color?: string;

  render() {
    const classes = {
      primary: this.variant === 'primary',
      secondary: this.variant === 'secondary',
      large: this.large,
      disabled: this.disabled,
    };

    const styles = {
      backgroundColor: this.color || '',
    };

    return html`
      <button class=${classMap(classes)} style=${styleMap(styles)}>
        <slot></slot>
      </button>
    `;
  }
}
```

## イベント処理

### イベントリスナー

```typescript
// src/components/event-demo.ts
import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

@customElement('event-demo')
export class EventDemo extends LitElement {
  @state()
  private clickCount = 0;

  @state()
  private inputValue = '';

  render() {
    return html`
      <div>
        <p>Clicks: ${this.clickCount}</p>
        <button @click=${this.handleClick}>Click me</button>

        <input
          type="text"
          .value=${this.inputValue}
          @input=${this.handleInput}
          placeholder="Type something..."
        />
        <p>You typed: ${this.inputValue}</p>

        <!-- イベント修飾子 -->
        <form @submit=${this.handleSubmit}>
          <input type="text" />
          <button type="submit">Submit</button>
        </form>
      </div>
    `;
  }

  handleClick() {
    this.clickCount++;
  }

  handleInput(e: Event) {
    this.inputValue = (e.target as HTMLInputElement).value;
  }

  handleSubmit(e: Event) {
    e.preventDefault();
    console.log('Form submitted');
  }
}
```

### カスタムイベントの発火

```typescript
// src/components/custom-event.ts
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('star-rating')
export class StarRating extends LitElement {
  @property({ type: Number })
  rating = 0;

  @property({ type: Number })
  maxStars = 5;

  render() {
    return html`
      <div class="star-rating">
        ${Array.from({ length: this.maxStars }, (_, i) => i + 1).map(
          (star) => html`
            <button @click=${() => this.setRating(star)}>
              ${star <= this.rating ? '★' : '☆'}
            </button>
          `
        )}
      </div>
    `;
  }

  setRating(rating: number) {
    this.rating = rating;

    // カスタムイベントを発火
    this.dispatchEvent(
      new CustomEvent('rating-changed', {
        detail: { rating },
        bubbles: true,
        composed: true, // Shadow DOMの境界を超える
      })
    );
  }
}

// 使用例
@customElement('rating-container')
export class RatingContainer extends LitElement {
  @state()
  private currentRating = 0;

  render() {
    return html`
      <div>
        <star-rating
          .rating=${this.currentRating}
          @rating-changed=${this.handleRatingChange}
        ></star-rating>
        <p>Current rating: ${this.currentRating}</p>
      </div>
    `;
  }

  handleRatingChange(e: CustomEvent) {
    this.currentRating = e.detail.rating;
  }
}
```

## ライフサイクル

```typescript
// src/components/lifecycle-demo.ts
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lifecycle-demo')
export class LifecycleDemo extends LitElement {
  @property()
  message = '';

  // 1. コンストラクタ
  constructor() {
    super();
    console.log('1. constructor');
  }

  // 2. 接続された
  connectedCallback() {
    super.connectedCallback();
    console.log('2. connectedCallback');
  }

  // 3. プロパティが変更される前
  willUpdate(changedProperties: Map<PropertyKey, unknown>) {
    console.log('3. willUpdate', changedProperties);

    if (changedProperties.has('message')) {
      console.log('message changed:', this.message);
    }
  }

  // 4. レンダリング
  render() {
    console.log('4. render');
    return html`<div>${this.message}</div>`;
  }

  // 5. 最初のレンダリング完了後（1回のみ）
  firstUpdated() {
    console.log('5. firstUpdated');
  }

  // 6. 更新完了後
  updated(changedProperties: Map<PropertyKey, unknown>) {
    console.log('6. updated', changedProperties);
  }

  // 7. 切断された
  disconnectedCallback() {
    super.disconnectedCallback();
    console.log('7. disconnectedCallback');
  }
}
```

## スタイリング

### Shadow DOMのスタイリング

```typescript
// src/components/styled-card.ts
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('styled-card')
export class StyledCard extends LitElement {
  static styles = css`
    /* :host - コンポーネント自身 */
    :host {
      display: block;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
    }

    /* :host()関数 - 特定の状態 */
    :host([disabled]) {
      opacity: 0.5;
      pointer-events: none;
    }

    /* :host-context() - 親要素の状態 */
    :host-context(.dark-mode) {
      background: #1f2937;
      color: white;
    }

    .header {
      padding: 16px;
      background: #f3f4f6;
      border-bottom: 1px solid #e5e7eb;
    }

    .content {
      padding: 16px;
    }

    /* ::slotted() - スロットコンテンツ */
    ::slotted(h2) {
      margin: 0;
      font-size: 20px;
    }

    ::slotted(p) {
      margin: 8px 0 0;
      color: #6b7280;
    }
  `;

  @property({ type: Boolean, reflect: true })
  disabled = false;

  render() {
    return html`
      <div class="header">
        <slot name="header"></slot>
      </div>
      <div class="content">
        <slot></slot>
      </div>
    `;
  }
}
```

使用例:

```html
<styled-card>
  <h2 slot="header">Card Title</h2>
  <p>This is the card content.</p>
</styled-card>
```

### CSS変数での外部カスタマイズ

```typescript
// src/components/themeable-button.ts
import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('themeable-button')
export class ThemeableButton extends LitElement {
  static styles = css`
    button {
      /* CSS変数でカスタマイズ可能 */
      background: var(--button-bg, #3b82f6);
      color: var(--button-color, white);
      padding: var(--button-padding, 8px 16px);
      border: none;
      border-radius: var(--button-radius, 4px);
      font-size: var(--button-font-size, 16px);
      cursor: pointer;
    }

    button:hover {
      background: var(--button-hover-bg, #2563eb);
    }
  `;

  render() {
    return html` <button><slot></slot></button> `;
  }
}
```

使用例:

```html
<style>
  themeable-button {
    --button-bg: #10b981;
    --button-hover-bg: #059669;
    --button-radius: 8px;
  }
</style>

<themeable-button>Custom Styled Button</themeable-button>
```

## 実践例: データテーブルコンポーネント

```typescript
// src/components/data-table.ts
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

interface Column<T> {
  key: keyof T;
  header: string;
  sortable?: boolean;
  render?: (value: any, row: T) => unknown;
}

type SortDirection = 'asc' | 'desc' | null;

@customElement('data-table')
export class DataTable<T extends Record<string, any>> extends LitElement {
  static styles = css`
    table {
      width: 100%;
      border-collapse: collapse;
    }

    th,
    td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }

    th {
      background: #f3f4f6;
      font-weight: 600;
      cursor: pointer;
      user-select: none;
    }

    th:hover {
      background: #e5e7eb;
    }

    .sort-indicator {
      margin-left: 4px;
      opacity: 0.5;
    }

    tr:hover {
      background: #f9fafb;
    }
  `;

  @property({ type: Array })
  data: T[] = [];

  @property({ type: Array })
  columns: Column<T>[] = [];

  @state()
  private sortKey: keyof T | null = null;

  @state()
  private sortDirection: SortDirection = null;

  render() {
    const sortedData = this.getSortedData();

    return html`
      <table>
        <thead>
          <tr>
            ${this.columns.map(
              (col) => html`
                <th @click=${() => this.handleSort(col.key)}>
                  ${col.header}
                  ${this.sortKey === col.key
                    ? html`<span class="sort-indicator">
                        ${this.sortDirection === 'asc' ? '↑' : '↓'}
                      </span>`
                    : null}
                </th>
              `
            )}
          </tr>
        </thead>
        <tbody>
          ${repeat(
            sortedData,
            (row, index) => index,
            (row) => html`
              <tr>
                ${this.columns.map((col) => html`<td>${this.renderCell(col, row)}</td>`)}
              </tr>
            `
          )}
        </tbody>
      </table>
    `;
  }

  renderCell(col: Column<T>, row: T) {
    const value = row[col.key];
    return col.render ? col.render(value, row) : value;
  }

  handleSort(key: keyof T) {
    if (this.sortKey === key) {
      this.sortDirection =
        this.sortDirection === 'asc'
          ? 'desc'
          : this.sortDirection === 'desc'
            ? null
            : 'asc';
    } else {
      this.sortKey = key;
      this.sortDirection = 'asc';
    }

    if (this.sortDirection === null) {
      this.sortKey = null;
    }
  }

  getSortedData(): T[] {
    if (!this.sortKey || !this.sortDirection) {
      return this.data;
    }

    return [...this.data].sort((a, b) => {
      const aVal = a[this.sortKey!];
      const bVal = b[this.sortKey!];

      if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }
}

// 使用例
@customElement('table-demo')
export class TableDemo extends LitElement {
  @state()
  private users = [
    { id: 1, name: 'Alice', age: 28, email: 'alice@example.com' },
    { id: 2, name: 'Bob', age: 34, email: 'bob@example.com' },
    { id: 3, name: 'Charlie', age: 22, email: 'charlie@example.com' },
  ];

  private columns = [
    { key: 'id' as const, header: 'ID', sortable: true },
    { key: 'name' as const, header: 'Name', sortable: true },
    { key: 'age' as const, header: 'Age', sortable: true },
    {
      key: 'email' as const,
      header: 'Email',
      render: (email: string) => html`<a href="mailto:${email}">${email}</a>`,
    },
  ];

  render() {
    return html`
      <data-table .data=${this.users} .columns=${this.columns}></data-table>
    `;
  }
}
```

## まとめ

Litを使ったWeb Components開発は、軽量でありながらモダンな開発体験を提供します。フレームワーク非依存であるため、React、Vue、Angularなど、どのプロジェクトでも利用できる再利用可能なコンポーネントを構築できます。

主なメリット:

- わずか5KBの軽量ライブラリ
- リアクティブなプロパティとステート管理
- TypeScriptファーストの開発体験
- Shadow DOMによるカプセル化
- フレームワーク非依存

デザインシステム、UIライブラリ、そしてマイクロフロントエンドなど、様々な用途でLitとWeb Componentsを活用できます。

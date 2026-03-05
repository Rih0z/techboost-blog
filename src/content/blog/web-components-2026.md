---
title: "Web Components完全ガイド2026 — フレームワーク非依存のUI部品"
description: "Web Componentsの基本技術（Custom Elements、Shadow DOM、HTML Templates、Declarative Shadow DOM）からLit 3.x活用まで、実践的に解説します。"
pubDate: "2026-02-05"
tags: ["Web Components", "Custom Elements", "Shadow DOM", "Lit", "標準技術", "プログラミング"]
---

Web Componentsは、フレームワークに依存しない再利用可能なUI部品を作成するための標準技術です。2026年では、すべてのモダンブラウザで完全にサポートされ、実用性が大幅に向上しました。

## Web Componentsとは

Web Componentsは、以下の4つの標準技術から構成されます。

1. **Custom Elements**: 独自のHTMLタグを定義
2. **Shadow DOM**: カプセル化されたDOMツリー
3. **HTML Templates**: 再利用可能なHTMLテンプレート
4. **ES Modules**: モジュールとしてのインポート

これらを組み合わせることで、フレームワークに依存しない再利用可能なコンポーネントを作成できます。

## Custom Elements — カスタムタグの作成

### 基本的なCustom Element

```javascript
// my-counter.js
class MyCounter extends HTMLElement {
  constructor() {
    super();
    this.count = 0;
  }

  connectedCallback() {
    this.render();
    this.querySelector('button').addEventListener('click', () => {
      this.count++;
      this.render();
    });
  }

  render() {
    this.innerHTML = `
      <div>
        <p>Count: ${this.count}</p>
        <button>Increment</button>
      </div>
    `;
  }
}

// カスタムタグを登録
customElements.define('my-counter', MyCounter);
```

```html
<!-- 使用例 -->
<my-counter></my-counter>
```

### ライフサイクルメソッド

```javascript
class MyElement extends HTMLElement {
  constructor() {
    super();
    console.log('1. constructor: 要素が作成された');
  }

  connectedCallback() {
    console.log('2. connectedCallback: DOMに追加された');
    this.render();
  }

  disconnectedCallback() {
    console.log('3. disconnectedCallback: DOMから削除された');
    // イベントリスナーのクリーンアップなど
  }

  attributeChangedCallback(name, oldValue, newValue) {
    console.log(`4. 属性 "${name}" が "${oldValue}" から "${newValue}" に変更`);
    this.render();
  }

  adoptedCallback() {
    console.log('5. adoptedCallback: 別のドキュメントに移動');
  }

  // 監視する属性を指定
  static get observedAttributes() {
    return ['title', 'count'];
  }

  render() {
    this.innerHTML = `
      <h2>${this.getAttribute('title') || 'No Title'}</h2>
      <p>Count: ${this.getAttribute('count') || 0}</p>
    `;
  }
}

customElements.define('my-element', MyElement);
```

```html
<!-- 属性を指定 -->
<my-element title="Hello" count="5"></my-element>

<script>
  // 属性を動的に変更
  const el = document.querySelector('my-element');
  el.setAttribute('count', '10'); // attributeChangedCallback が呼ばれる
</script>
```

## Shadow DOM — カプセル化

Shadow DOMを使用すると、コンポーネント内部のスタイルとDOMツリーが外部から隔離されます。

```javascript
class MyCard extends HTMLElement {
  constructor() {
    super();
    // Shadow DOMを作成
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: white;
        }

        /* ホスト要素に属性がある場合 */
        :host([highlighted]) {
          border-color: #007bff;
          box-shadow: 0 0 10px rgba(0, 123, 255, 0.3);
        }

        h2 {
          margin: 0 0 10px;
          color: #333;
        }

        ::slotted(p) {
          color: #666;
          line-height: 1.6;
        }
      </style>

      <div class="card">
        <h2><slot name="title">Default Title</slot></h2>
        <div class="content">
          <slot></slot>
        </div>
      </div>
    `;
  }
}

customElements.define('my-card', MyCard);
```

```html
<!-- 使用例 -->
<my-card highlighted>
  <span slot="title">Card Title</span>
  <p>This is the card content.</p>
  <p>Styles from outside don't affect this!</p>
</my-card>
```

### CSS Shadow Parts

Shadow DOM内部の特定の要素にスタイルを適用可能にします。

```javascript
class StyledButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        button {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          background: #007bff;
          color: white;
          cursor: pointer;
        }
      </style>
      <button part="button">
        <slot></slot>
      </button>
    `;
  }
}

customElements.define('styled-button', StyledButton);
```

```html
<style>
  /* 外部から part を指定してスタイリング */
  styled-button::part(button) {
    background: #28a745;
    font-size: 18px;
  }

  styled-button::part(button):hover {
    background: #218838;
  }
</style>

<styled-button>Click Me</styled-button>
```

## HTML Templates

`<template>` タグを使用して、再利用可能なHTMLテンプレートを定義します。

```html
<template id="user-card-template">
  <style>
    .user-card {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 8px;
    }

    .avatar {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #007bff;
    }

    .info h3 {
      margin: 0 0 5px;
    }

    .info p {
      margin: 0;
      color: #666;
    }
  </style>

  <div class="user-card">
    <div class="avatar"></div>
    <div class="info">
      <h3 class="name"></h3>
      <p class="email"></p>
    </div>
  </div>
</template>

<script>
  class UserCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
      const template = document.getElementById('user-card-template');
      const clone = template.content.cloneNode(true);

      // データを挿入
      clone.querySelector('.name').textContent = this.getAttribute('name');
      clone.querySelector('.email').textContent = this.getAttribute('email');

      this.shadowRoot.appendChild(clone);
    }
  }

  customElements.define('user-card', UserCard);
</script>

<user-card name="John Doe" email="john@example.com"></user-card>
<user-card name="Jane Smith" email="jane@example.com"></user-card>
```

## Declarative Shadow DOM

サーバーサイドレンダリングでもShadow DOMを使用できます（2023年から標準化）。

```html
<my-card>
  <template shadowrootmode="open">
    <style>
      :host {
        display: block;
        padding: 20px;
        border: 1px solid #ddd;
      }
      h2 {
        color: #007bff;
      }
    </style>

    <h2><slot name="title">Title</slot></h2>
    <div><slot></slot></div>
  </template>

  <!-- Light DOM コンテンツ -->
  <span slot="title">Card Title</span>
  <p>Card content goes here.</p>
</my-card>
```

サーバーサイドで生成:

```javascript
// Node.js / Deno
function renderCard(title, content) {
  return `
    <my-card>
      <template shadowrootmode="open">
        <style>
          :host { display: block; padding: 20px; }
        </style>
        <h2><slot name="title">Title</slot></h2>
        <div><slot></slot></div>
      </template>
      <span slot="title">${title}</span>
      <p>${content}</p>
    </my-card>
  `;
}
```

## Lit 3.x — Web Componentsライブラリ

Litは、Web Componentsを簡単に作成できる軽量ライブラリです。

### インストール

```bash
npm install lit
```

### 基本的なコンポーネント

```typescript
// counter-element.ts
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('counter-element')
export class CounterElement extends LitElement {
  static styles = css`
    :host {
      display: block;
      padding: 20px;
      font-family: sans-serif;
    }

    button {
      padding: 10px 20px;
      font-size: 16px;
      cursor: pointer;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      margin: 0 5px;
    }

    button:hover {
      background: #0056b3;
    }

    .count {
      font-size: 24px;
      margin: 15px 0;
    }
  `;

  @property({ type: Number })
  initialCount = 0;

  @state()
  private count = 0;

  connectedCallback() {
    super.connectedCallback();
    this.count = this.initialCount;
  }

  private increment() {
    this.count++;
    this.dispatchEvent(new CustomEvent('count-changed', {
      detail: { count: this.count },
      bubbles: true,
      composed: true
    }));
  }

  private decrement() {
    this.count--;
    this.dispatchEvent(new CustomEvent('count-changed', {
      detail: { count: this.count }
    }));
  }

  render() {
    return html`
      <div>
        <div class="count">Count: ${this.count}</div>
        <button @click=${this.decrement}>-</button>
        <button @click=${this.increment}>+</button>
      </div>
    `;
  }
}
```

```html
<!-- 使用例 -->
<counter-element initial-count="5"></counter-element>

<script>
  document.querySelector('counter-element')
    .addEventListener('count-changed', (e) => {
      console.log('Count changed:', e.detail.count);
    });
</script>
```

### 条件レンダリングとループ

```typescript
import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

@customElement('todo-list')
export class TodoList extends LitElement {
  static styles = css`
    .todo-item {
      padding: 10px;
      border-bottom: 1px solid #ddd;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .todo-item.completed {
      text-decoration: line-through;
      opacity: 0.6;
    }
  `;

  @state()
  private todos: Todo[] = [
    { id: 1, text: 'Learn Web Components', completed: true },
    { id: 2, text: 'Build with Lit', completed: false },
  ];

  @state()
  private newTodoText = '';

  private addTodo() {
    if (this.newTodoText.trim()) {
      this.todos = [
        ...this.todos,
        {
          id: Date.now(),
          text: this.newTodoText,
          completed: false
        }
      ];
      this.newTodoText = '';
    }
  }

  private toggleTodo(id: number) {
    this.todos = this.todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
  }

  render() {
    return html`
      <div>
        <h2>Todo List</h2>

        <div>
          <input
            .value=${this.newTodoText}
            @input=${(e: InputEvent) => {
              this.newTodoText = (e.target as HTMLInputElement).value;
            }}
            @keyup=${(e: KeyboardEvent) => {
              if (e.key === 'Enter') this.addTodo();
            }}
            placeholder="Add new todo"
          />
          <button @click=${this.addTodo}>Add</button>
        </div>

        <div>
          ${this.todos.length === 0
            ? html`<p>No todos yet!</p>`
            : html`
                ${this.todos.map(todo => html`
                  <div class="todo-item ${todo.completed ? 'completed' : ''}">
                    <input
                      type="checkbox"
                      .checked=${todo.completed}
                      @change=${() => this.toggleTodo(todo.id)}
                    />
                    <span>${todo.text}</span>
                  </div>
                `)}
              `
          }
        </div>
      </div>
    `;
  }
}
```

## フレームワークとの統合

Web Componentsは、どのフレームワークからも使用可能です。

### React

```typescript
// ReactでWeb Componentsを使用
import { useEffect, useRef } from 'react';

function App() {
  const counterRef = useRef<any>(null);

  useEffect(() => {
    const counter = counterRef.current;
    const handleCountChange = (e: CustomEvent) => {
      console.log('Count:', e.detail.count);
    };

    counter?.addEventListener('count-changed', handleCountChange);
    return () => {
      counter?.removeEventListener('count-changed', handleCountChange);
    };
  }, []);

  return (
    <div>
      <h1>React + Web Components</h1>
      <counter-element ref={counterRef} initial-count={10} />
    </div>
  );
}
```

### Vue

```vue
<template>
  <div>
    <h1>Vue + Web Components</h1>
    <counter-element
      :initial-count="10"
      @count-changed="handleCountChange"
    />
  </div>
</template>

<script setup lang="ts">
const handleCountChange = (e: CustomEvent) => {
  console.log('Count:', e.detail.count);
};
</script>
```

## まとめ

Web Componentsは、フレームワークに依存しない標準技術として2026年には完全に成熟しました。

**主な利点:**
- フレームワーク非依存で長期的に使える
- すべてのモダンブラウザでネイティブサポート
- Lit等のライブラリで開発体験が向上
- デザインシステム構築に最適

**使用を検討すべき場合:**
- デザインシステム・UIライブラリの構築
- 複数のフレームワークで共有するコンポーネント
- 長期的なメンテナンス性を重視
- 標準技術へのこだわり

Web Componentsは、モダンWeb開発における重要な選択肢の一つとして、今後さらに普及していくでしょう。

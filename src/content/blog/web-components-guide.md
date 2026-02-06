---
title: 'Web Components完全ガイド：フレームワーク不要の再利用可能コンポーネント'
description: 'Custom Elements、Shadow DOM、HTML Templatesを使ったWeb Components開発を徹底解説。React/Vue/Svelteとの統合パターンも網羅'
pubDate: 'Feb 05 2026'
tags: ['Web Components', 'Custom Elements', 'Shadow DOM', 'Lit', 'JavaScript', 'フロントエンド']
---

# Web Components完全ガイド：フレームワーク不要の再利用可能コンポーネント

Web Componentsは、フレームワークに依存しない再利用可能なコンポーネントを作成するための標準技術です。このガイドでは、基本から実践的な開発パターンまで徹底解説します。

## Web Componentsとは？

Web Componentsは、カスタム要素を作成するための3つのWeb標準技術の総称です。

### 3つの主要技術

1. **Custom Elements**: 独自のHTML要素を定義
2. **Shadow DOM**: カプセル化されたDOMツリー
3. **HTML Templates**: 再利用可能なHTMLフラグメント

### 主な特徴

- **フレームワーク独立**: React、Vue、Svelteなど、どこでも使える
- **標準技術**: ブラウザネイティブサポート（ポリフィル不要）
- **カプセル化**: スタイルとロジックの衝突を防ぐ
- **再利用性**: 一度作れば、どのプロジェクトでも使える

### ブラウザサポート

2026年現在、すべてのモダンブラウザが完全にサポート:
- Chrome 54+
- Firefox 63+
- Safari 10.1+
- Edge 79+

## Custom Elements入門

### 基本的なカスタム要素

```javascript
// シンプルなカスタム要素
class MyElement extends HTMLElement {
  constructor() {
    super();
    this.innerHTML = '<p>Hello, Web Components!</p>';
  }
}

// カスタム要素の登録
customElements.define('my-element', MyElement);
```

```html
<!-- 使用 -->
<my-element></my-element>
```

### ライフサイクルコールバック

```javascript
class LifecycleElement extends HTMLElement {
  constructor() {
    super();
    console.log('Constructor called');
  }

  // 要素がDOMに挿入されたとき
  connectedCallback() {
    console.log('Element added to page');
    this.render();
  }

  // 要素がDOMから削除されたとき
  disconnectedCallback() {
    console.log('Element removed from page');
    this.cleanup();
  }

  // 要素が別のドキュメントに移動したとき
  adoptedCallback() {
    console.log('Element moved to new page');
  }

  // 監視対象の属性が変更されたとき
  attributeChangedCallback(name, oldValue, newValue) {
    console.log(`Attribute ${name} changed from ${oldValue} to ${newValue}`);
    this.render();
  }

  // 監視する属性を指定
  static get observedAttributes() {
    return ['name', 'age'];
  }

  render() {
    const name = this.getAttribute('name') || 'World';
    const age = this.getAttribute('age') || 'unknown';
    this.innerHTML = `
      <div>
        <p>Name: ${name}</p>
        <p>Age: ${age}</p>
      </div>
    `;
  }

  cleanup() {
    // イベントリスナーの削除など
  }
}

customElements.define('lifecycle-element', LifecycleElement);
```

```html
<lifecycle-element name="Alice" age="30"></lifecycle-element>
```

### プロパティとメソッド

```javascript
class CounterElement extends HTMLElement {
  constructor() {
    super();
    this._count = 0;
  }

  // Getter/Setter
  get count() {
    return this._count;
  }

  set count(value) {
    this._count = parseInt(value, 10);
    this.render();
  }

  connectedCallback() {
    this.render();
    this.querySelector('button').addEventListener('click', () => this.increment());
  }

  // パブリックメソッド
  increment() {
    this.count++;
  }

  decrement() {
    this.count--;
  }

  reset() {
    this.count = 0;
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

customElements.define('counter-element', CounterElement);
```

```javascript
// JavaScriptから操作
const counter = document.querySelector('counter-element');
counter.count = 10;
counter.increment();
console.log(counter.count); // 11
```

## Shadow DOM入門

Shadow DOMは、カプセル化されたDOMツリーを作成します。

### 基本的なShadow DOM

```javascript
class ShadowElement extends HTMLElement {
  constructor() {
    super();

    // Shadow Rootを作成
    this.attachShadow({ mode: 'open' });

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 1rem;
          border: 2px solid #333;
        }

        p {
          color: blue;
          font-weight: bold;
        }
      </style>
      <p>This is in the Shadow DOM</p>
    `;
  }
}

customElements.define('shadow-element', ShadowElement);
```

### Shadow DOMのモード

```javascript
// open: JavaScript から shadowRoot にアクセス可能
this.attachShadow({ mode: 'open' });
const root = element.shadowRoot; // アクセス可能

// closed: shadowRoot にアクセス不可
this.attachShadow({ mode: 'closed' });
const root = element.shadowRoot; // null
```

### スタイルのカプセル化

```javascript
class StyledCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.shadowRoot.innerHTML = `
      <style>
        /* :host - ホスト要素自身 */
        :host {
          display: block;
          max-width: 300px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          overflow: hidden;
        }

        /* :host() - 条件付きスタイル */
        :host(.featured) {
          border: 2px solid gold;
        }

        /* :host-context() - 親要素の状態に応じたスタイル */
        :host-context(.dark-theme) {
          background: #333;
          color: white;
        }

        /* Shadow DOM内のスタイル */
        .card-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1rem;
        }

        .card-body {
          padding: 1rem;
        }

        /* ::slotted() - スロットされた要素のスタイル */
        ::slotted(h2) {
          margin: 0;
          font-size: 1.5rem;
        }

        ::slotted(p) {
          color: #666;
          line-height: 1.6;
        }
      </style>

      <div class="card-header">
        <slot name="header">Default Header</slot>
      </div>
      <div class="card-body">
        <slot>Default Content</slot>
      </div>
    `;
  }
}

customElements.define('styled-card', StyledCard);
```

```html
<!-- 使用例 -->
<styled-card class="featured">
  <h2 slot="header">Custom Header</h2>
  <p>This is the card content</p>
</styled-card>
```

### CSS変数での外部制御

```javascript
class ThemeableButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --button-bg: #3b82f6;
          --button-color: white;
          --button-padding: 0.5rem 1rem;
          --button-radius: 4px;
        }

        button {
          background: var(--button-bg);
          color: var(--button-color);
          padding: var(--button-padding);
          border: none;
          border-radius: var(--button-radius);
          cursor: pointer;
          font-size: 1rem;
        }

        button:hover {
          opacity: 0.9;
        }
      </style>
      <button><slot>Click me</slot></button>
    `;
  }
}

customElements.define('themeable-button', ThemeableButton);
```

```html
<style>
  /* 外部からCSS変数で制御 */
  themeable-button {
    --button-bg: #ef4444;
    --button-padding: 1rem 2rem;
  }
</style>

<themeable-button>Custom Button</themeable-button>
```

## HTML Templates

### テンプレートの定義と使用

```html
<!-- テンプレート定義 -->
<template id="user-card-template">
  <style>
    .user-card {
      border: 1px solid #ddd;
      padding: 1rem;
      border-radius: 8px;
    }
    .avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
    }
  </style>
  <div class="user-card">
    <img class="avatar" src="" alt="">
    <h3 class="name"></h3>
    <p class="bio"></p>
  </div>
</template>
```

```javascript
class UserCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // テンプレートをクローン
    const template = document.getElementById('user-card-template');
    const content = template.content.cloneNode(true);

    this.shadowRoot.appendChild(content);
  }

  connectedCallback() {
    this.updateContent();
  }

  attributeChangedCallback() {
    this.updateContent();
  }

  static get observedAttributes() {
    return ['name', 'avatar', 'bio'];
  }

  updateContent() {
    const name = this.getAttribute('name');
    const avatar = this.getAttribute('avatar');
    const bio = this.getAttribute('bio');

    this.shadowRoot.querySelector('.name').textContent = name;
    this.shadowRoot.querySelector('.avatar').src = avatar;
    this.shadowRoot.querySelector('.bio').textContent = bio;
  }
}

customElements.define('user-card', UserCard);
```

```html
<user-card
  name="Alice"
  avatar="https://i.pravatar.cc/64?img=1"
  bio="Software Engineer"
></user-card>
```

## 実践的なコンポーネント例

### モーダルダイアログ

```javascript
class ModalDialog extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1000;
        }

        :host([open]) {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
        }

        .dialog {
          position: relative;
          background: white;
          border-radius: 8px;
          padding: 2rem;
          max-width: 500px;
          max-height: 80vh;
          overflow: auto;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }

        .close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
        }
      </style>

      <div class="overlay" part="overlay"></div>
      <div class="dialog" part="dialog">
        <button class="close" aria-label="Close">&times;</button>
        <slot></slot>
      </div>
    `;
  }

  connectedCallback() {
    const overlay = this.shadowRoot.querySelector('.overlay');
    const closeBtn = this.shadowRoot.querySelector('.close');

    overlay.addEventListener('click', () => this.close());
    closeBtn.addEventListener('click', () => this.close());

    // Escキーで閉じる
    this._handleEscape = (e) => {
      if (e.key === 'Escape' && this.hasAttribute('open')) {
        this.close();
      }
    };
    document.addEventListener('keydown', this._handleEscape);
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this._handleEscape);
  }

  open() {
    this.setAttribute('open', '');
    this.dispatchEvent(new CustomEvent('modal-open'));
  }

  close() {
    this.removeAttribute('open');
    this.dispatchEvent(new CustomEvent('modal-close'));
  }
}

customElements.define('modal-dialog', ModalDialog);
```

```html
<button id="open-modal">Open Modal</button>

<modal-dialog id="my-modal">
  <h2>Modal Title</h2>
  <p>This is the modal content.</p>
</modal-dialog>

<script>
  const modal = document.getElementById('my-modal');
  document.getElementById('open-modal').addEventListener('click', () => {
    modal.open();
  });

  modal.addEventListener('modal-close', () => {
    console.log('Modal closed');
  });
</script>
```

### タブコンポーネント

```javascript
class TabsElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._activeTab = 0;
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  render() {
    const tabs = Array.from(this.querySelectorAll('[slot^="tab-"]'));
    const panels = Array.from(this.querySelectorAll('[slot^="panel-"]'));

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .tab-list {
          display: flex;
          border-bottom: 2px solid #e5e7eb;
          gap: 0.5rem;
        }

        .tab {
          padding: 0.75rem 1.5rem;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          color: #6b7280;
          position: relative;
        }

        .tab[aria-selected="true"] {
          color: #3b82f6;
        }

        .tab[aria-selected="true"]::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 2px;
          background: #3b82f6;
        }

        .panel {
          padding: 1.5rem 0;
        }

        .panel[hidden] {
          display: none;
        }
      </style>

      <div class="tab-list" role="tablist">
        ${tabs.map((_, i) => `
          <button
            class="tab"
            role="tab"
            aria-selected="${i === this._activeTab}"
            aria-controls="panel-${i}"
            id="tab-${i}"
          >
            <slot name="tab-${i}"></slot>
          </button>
        `).join('')}
      </div>

      ${panels.map((_, i) => `
        <div
          class="panel"
          role="tabpanel"
          id="panel-${i}"
          aria-labelledby="tab-${i}"
          ${i !== this._activeTab ? 'hidden' : ''}
        >
          <slot name="panel-${i}"></slot>
        </div>
      `).join('')}
    `;
  }

  setupEventListeners() {
    this.shadowRoot.querySelectorAll('.tab').forEach((tab, index) => {
      tab.addEventListener('click', () => this.setActiveTab(index));
    });
  }

  setActiveTab(index) {
    this._activeTab = index;
    this.render();
    this.setupEventListeners();
    this.dispatchEvent(new CustomEvent('tab-change', { detail: { index } }));
  }
}

customElements.define('tabs-element', TabsElement);
```

```html
<tabs-element>
  <span slot="tab-0">Tab 1</span>
  <span slot="tab-1">Tab 2</span>
  <span slot="tab-2">Tab 3</span>

  <div slot="panel-0">
    <h3>Panel 1</h3>
    <p>Content for tab 1</p>
  </div>
  <div slot="panel-1">
    <h3>Panel 2</h3>
    <p>Content for tab 2</p>
  </div>
  <div slot="panel-2">
    <h3>Panel 3</h3>
    <p>Content for tab 3</p>
  </div>
</tabs-element>
```

## Litフレームワーク

Litは、Web Componentsを簡単に作成できる軽量ライブラリです。

### セットアップ

```bash
npm install lit
```

### 基本的なLitコンポーネント

```typescript
// my-element.ts
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('my-element')
export class MyElement extends LitElement {
  static styles = css`
    :host {
      display: block;
      padding: 1rem;
      border: 1px solid #ddd;
    }

    h1 {
      color: var(--title-color, #333);
    }
  `;

  @property({ type: String })
  name = 'World';

  @property({ type: Number })
  count = 0;

  render() {
    return html`
      <h1>Hello, ${this.name}!</h1>
      <p>Count: ${this.count}</p>
      <button @click=${this._increment}>Increment</button>
    `;
  }

  private _increment() {
    this.count++;
  }
}
```

### Litの高度な機能

```typescript
import { LitElement, html, css } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { repeat } from 'lit/directives/repeat.js';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

@customElement('todo-list')
export class TodoList extends LitElement {
  static styles = css`
    .todo-item {
      padding: 0.5rem;
      border-bottom: 1px solid #eee;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .completed {
      text-decoration: line-through;
      color: #999;
    }
  `;

  @property({ type: Array })
  todos: Todo[] = [];

  @state()
  private _newTodoText = '';

  @query('#new-todo')
  private _input!: HTMLInputElement;

  render() {
    return html`
      <div>
        <input
          id="new-todo"
          .value=${this._newTodoText}
          @input=${this._handleInput}
          @keypress=${this._handleKeyPress}
          placeholder="Add a todo"
        />
        <button @click=${this._addTodo}>Add</button>
      </div>

      <div>
        ${repeat(
          this.todos,
          (todo) => todo.id,
          (todo) => html`
            <div
              class=${classMap({
                'todo-item': true,
                'completed': todo.completed,
              })}
              style=${styleMap({
                opacity: todo.completed ? '0.6' : '1',
              })}
            >
              <input
                type="checkbox"
                .checked=${todo.completed}
                @change=${() => this._toggleTodo(todo.id)}
              />
              <span>${todo.text}</span>
              <button @click=${() => this._deleteTodo(todo.id)}>Delete</button>
            </div>
          `
        )}
      </div>
    `;
  }

  private _handleInput(e: Event) {
    this._newTodoText = (e.target as HTMLInputElement).value;
  }

  private _handleKeyPress(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      this._addTodo();
    }
  }

  private _addTodo() {
    if (!this._newTodoText.trim()) return;

    this.todos = [
      ...this.todos,
      {
        id: Date.now(),
        text: this._newTodoText,
        completed: false,
      },
    ];

    this._newTodoText = '';
    this._input.focus();
  }

  private _toggleTodo(id: number) {
    this.todos = this.todos.map((todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
  }

  private _deleteTodo(id: number) {
    this.todos = this.todos.filter((todo) => todo.id !== id);
  }
}
```

## フレームワークとの統合

### React

```typescript
// use-web-component.tsx
import { useEffect, useRef } from 'react';

interface CounterElementProps {
  count?: number;
  onIncrement?: () => void;
}

export function CounterElement({ count = 0, onIncrement }: CounterElementProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleIncrement = () => {
      onIncrement?.();
    };

    element.addEventListener('increment', handleIncrement);
    return () => element.removeEventListener('increment', handleIncrement);
  }, [onIncrement]);

  useEffect(() => {
    if (ref.current) {
      (ref.current as any).count = count;
    }
  }, [count]);

  return <counter-element ref={ref} />;
}
```

### Vue

```vue
<template>
  <counter-element
    ref="counter"
    :count="count"
    @increment="handleIncrement"
  />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const counter = ref<HTMLElement>();
const count = ref(0);

const handleIncrement = () => {
  count.value++;
};

onMounted(() => {
  // Web Componentの初期化
});
</script>
```

### Svelte

```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  let counter: HTMLElement;
  let count = 0;

  onMount(() => {
    counter.addEventListener('increment', () => {
      count++;
    });
  });

  $: if (counter) {
    counter.count = count;
  }
</script>

<counter-element bind:this={counter} />
```

## まとめ

Web Componentsは、フレームワークに依存しない再利用可能なコンポーネントを作成する強力な技術です。

### 主な利点

- **フレームワーク独立**: どこでも使える
- **標準技術**: 長期的に安定
- **カプセル化**: スタイル衝突を防ぐ
- **軽量**: ランタイムが不要

### いつ使うべきか

- **デザインシステム**: 複数プロジェクトで共有するコンポーネント
- **ウィジェット**: サードパーティに提供するUI部品
- **マイクロフロントエンド**: 異なるフレームワーク間の統合

Web Componentsで、真にポータブルなコンポーネントライブラリを構築しましょう。

---
title: "Web Components 2025年最新ガイド"
description: "Web Componentsの最新仕様と実践的な活用方法を解説。Shadow DOM、Custom Elements、HTML Templatesを使った再利用可能なコンポーネントの作り方"
pubDate: "2025-02-05"
tags: ["WebComponents", "JavaScript", "Frontend", "StandardAPI"]
---

Web Componentsは、フレームワークに依存しない再利用可能なコンポーネントを作成するためのWeb標準技術群です。2025年現在、主要ブラウザでの対応が完了し、実践的な開発が可能になっています。

## Web Componentsとは

Web Componentsは以下の3つの主要技術で構成されています。

### 1. Custom Elements

独自のHTMLタグを定義する仕組みです。

```javascript
class MyButton extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', () => {
      console.log('Button clicked!');
    });
  }

  connectedCallback() {
    this.innerHTML = `
      <button class="my-button">
        ${this.getAttribute('label') || 'Click me'}
      </button>
    `;
  }
}

customElements.define('my-button', MyButton);
```

使用例:

```html
<my-button label="送信"></my-button>
```

### 2. Shadow DOM

カプセル化されたDOMツリーを作成し、スタイルの衝突を防ぎます。

```javascript
class CardComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .title {
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 8px;
        }
        .content {
          color: #666;
        }
      </style>
      <div class="card">
        <div class="title"><slot name="title">タイトル</slot></div>
        <div class="content"><slot></slot></div>
      </div>
    `;
  }
}

customElements.define('card-component', CardComponent);
```

使用例:

```html
<card-component>
  <span slot="title">お知らせ</span>
  <p>これはカードコンポーネントのコンテンツです。</p>
</card-component>
```

### 3. HTML Templates

再利用可能なマークアップの雛形を定義します。

```html
<template id="product-card">
  <style>
    .product {
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 12px;
      margin: 8px;
    }
    .product-name {
      font-weight: bold;
      color: #333;
    }
    .product-price {
      color: #e53935;
      font-size: 1.2rem;
    }
  </style>
  <div class="product">
    <div class="product-name"></div>
    <div class="product-price"></div>
  </div>
</template>

<script>
class ProductCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    const template = document.getElementById('product-card');
    const content = template.content.cloneNode(true);

    content.querySelector('.product-name').textContent = this.getAttribute('name');
    content.querySelector('.product-price').textContent = `¥${this.getAttribute('price')}`;

    this.shadowRoot.appendChild(content);
  }
}

customElements.define('product-card', ProductCard);
</script>
```

## ライフサイクルコールバック

Custom Elementsには4つのライフサイクルメソッドがあります。

```javascript
class LifecycleDemo extends HTMLElement {
  // 要素が作成されたとき
  constructor() {
    super();
    console.log('constructor');
  }

  // DOMに追加されたとき
  connectedCallback() {
    console.log('connectedCallback');
    this.render();
  }

  // DOMから削除されたとき
  disconnectedCallback() {
    console.log('disconnectedCallback');
    // クリーンアップ処理
  }

  // 属性が変更されたとき
  attributeChangedCallback(name, oldValue, newValue) {
    console.log(`attributeChangedCallback: ${name} = ${newValue}`);
    this.render();
  }

  // 監視する属性を指定
  static get observedAttributes() {
    return ['title', 'count'];
  }

  render() {
    this.innerHTML = `
      <h2>${this.getAttribute('title') || 'Default Title'}</h2>
      <p>Count: ${this.getAttribute('count') || 0}</p>
    `;
  }
}

customElements.define('lifecycle-demo', LifecycleDemo);
```

## 実践例: カウンターコンポーネント

状態管理を含む完全なコンポーネントの例です。

```javascript
class CounterComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._count = 0;
  }

  connectedCallback() {
    this.render();
    this.shadowRoot.querySelector('.increment').addEventListener('click', () => {
      this.count++;
    });
    this.shadowRoot.querySelector('.decrement').addEventListener('click', () => {
      this.count--;
    });
    this.shadowRoot.querySelector('.reset').addEventListener('click', () => {
      this.count = 0;
    });
  }

  get count() {
    return this._count;
  }

  set count(value) {
    this._count = value;
    this.render();
    // カスタムイベントを発火
    this.dispatchEvent(new CustomEvent('countchange', {
      detail: { count: this._count },
      bubbles: true,
      composed: true
    }));
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          font-family: system-ui;
        }
        .counter {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border: 2px solid #2196F3;
          border-radius: 8px;
          background: #f5f5f5;
        }
        .count {
          font-size: 2rem;
          font-weight: bold;
          min-width: 60px;
          text-align: center;
        }
        button {
          padding: 8px 16px;
          font-size: 1rem;
          border: none;
          border-radius: 4px;
          background: #2196F3;
          color: white;
          cursor: pointer;
          transition: background 0.2s;
        }
        button:hover {
          background: #1976D2;
        }
        .reset {
          background: #f44336;
        }
        .reset:hover {
          background: #d32f2f;
        }
      </style>
      <div class="counter">
        <button class="decrement">-</button>
        <div class="count">${this._count}</div>
        <button class="increment">+</button>
        <button class="reset">Reset</button>
      </div>
    `;
  }
}

customElements.define('counter-component', CounterComponent);
```

使用例:

```html
<counter-component></counter-component>

<script>
  document.querySelector('counter-component').addEventListener('countchange', (e) => {
    console.log('Count changed:', e.detail.count);
  });
</script>
```

## スロットの活用

スロットを使うと、外部からコンテンツを注入できます。

```javascript
class TabsComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        .tabs {
          display: flex;
          border-bottom: 2px solid #e0e0e0;
          gap: 8px;
        }
        .tab-content {
          padding: 16px;
          border: 1px solid #e0e0e0;
          border-top: none;
        }
      </style>
      <div class="tabs">
        <slot name="tabs"></slot>
      </div>
      <div class="tab-content">
        <slot name="content"></slot>
      </div>
    `;
  }
}

customElements.define('tabs-component', TabsComponent);
```

使用例:

```html
<tabs-component>
  <button slot="tabs">Tab 1</button>
  <button slot="tabs">Tab 2</button>
  <button slot="tabs">Tab 3</button>
  <div slot="content">
    <p>This is the content area</p>
  </div>
</tabs-component>
```

## フォーム統合

Web Componentsをフォームと統合する方法です。

```javascript
class CustomInput extends HTMLElement {
  static formAssociated = true;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._internals = this.attachInternals();
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        input {
          padding: 8px 12px;
          font-size: 1rem;
          border: 2px solid #ccc;
          border-radius: 4px;
          outline: none;
          transition: border-color 0.2s;
        }
        input:focus {
          border-color: #2196F3;
        }
        :host([invalid]) input {
          border-color: #f44336;
        }
      </style>
      <input type="text" />
    `;

    const input = this.shadowRoot.querySelector('input');
    input.addEventListener('input', (e) => {
      this._internals.setFormValue(e.target.value);

      // バリデーション
      if (e.target.value.length < 3) {
        this._internals.setValidity(
          { tooShort: true },
          '3文字以上入力してください'
        );
        this.setAttribute('invalid', '');
      } else {
        this._internals.setValidity({});
        this.removeAttribute('invalid');
      }
    });
  }

  get value() {
    return this._internals.value;
  }

  set value(val) {
    this._internals.setFormValue(val);
    this.shadowRoot.querySelector('input').value = val;
  }
}

customElements.define('custom-input', CustomInput);
```

## リアクティブプロパティ

属性とプロパティを同期する実装パターンです。

```javascript
class ReactiveComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._data = {
      title: '',
      count: 0
    };
  }

  static get observedAttributes() {
    return ['title', 'count'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this[name] = newValue;
  }

  get title() {
    return this._data.title;
  }

  set title(value) {
    this._data.title = value;
    this.setAttribute('title', value);
    this.render();
  }

  get count() {
    return this._data.count;
  }

  set count(value) {
    this._data.count = parseInt(value, 10);
    this.setAttribute('count', value);
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .container {
          padding: 16px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
      </style>
      <div class="container">
        <h3>${this._data.title}</h3>
        <p>Count: ${this._data.count}</p>
      </div>
    `;
  }
}

customElements.define('reactive-component', ReactiveComponent);
```

## パフォーマンス最適化

### 1. レンダリングの最適化

```javascript
class OptimizedComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._renderScheduled = false;
  }

  scheduleRender() {
    if (this._renderScheduled) return;
    this._renderScheduled = true;
    requestAnimationFrame(() => {
      this.render();
      this._renderScheduled = false;
    });
  }

  attributeChangedCallback() {
    this.scheduleRender();
  }

  render() {
    // レンダリング処理
  }
}
```

### 2. メモリリーク防止

```javascript
class SafeComponent extends HTMLElement {
  connectedCallback() {
    this._handleClick = () => console.log('clicked');
    this.addEventListener('click', this._handleClick);
  }

  disconnectedCallback() {
    // イベントリスナーを削除
    this.removeEventListener('click', this._handleClick);
  }
}
```

## TypeScript対応

型安全なWeb Componentsの実装例です。

```typescript
interface CounterState {
  count: number;
  step: number;
}

class TypedCounter extends HTMLElement {
  private _state: CounterState;
  private _shadowRoot: ShadowRoot;

  constructor() {
    super();
    this._shadowRoot = this.attachShadow({ mode: 'open' });
    this._state = {
      count: 0,
      step: 1
    };
  }

  connectedCallback(): void {
    this.render();
    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    const incrementBtn = this._shadowRoot.querySelector('.increment') as HTMLButtonElement;
    const decrementBtn = this._shadowRoot.querySelector('.decrement') as HTMLButtonElement;

    incrementBtn?.addEventListener('click', () => this.increment());
    decrementBtn?.addEventListener('click', () => this.decrement());
  }

  private increment(): void {
    this._state.count += this._state.step;
    this.render();
  }

  private decrement(): void {
    this._state.count -= this._state.step;
    this.render();
  }

  private render(): void {
    this._shadowRoot.innerHTML = `
      <style>
        .counter { padding: 16px; }
        button { margin: 0 8px; }
      </style>
      <div class="counter">
        <button class="decrement">-</button>
        <span>${this._state.count}</span>
        <button class="increment">+</button>
      </div>
    `;
  }
}

customElements.define('typed-counter', TypedCounter);
```

## ベストプラクティス

### 1. 命名規則

```javascript
// 必ずハイフンを含める
customElements.define('my-component', MyComponent); // ✓ 正しい
customElements.define('mycomponent', MyComponent); // ✗ エラー
```

### 2. アクセシビリティ

```javascript
class AccessibleButton extends HTMLElement {
  connectedCallback() {
    // ARIA属性を設定
    this.setAttribute('role', 'button');
    this.setAttribute('tabindex', '0');

    this.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.click();
      }
    });
  }
}
```

### 3. プログレッシブエンハンスメント

```javascript
if ('customElements' in window) {
  import('./my-component.js');
} else {
  // フォールバック処理
  console.warn('Custom Elements not supported');
}
```

## 既存フレームワークとの連携

### React

```jsx
import { useRef, useEffect } from 'react';

function App() {
  const counterRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      console.log('Count:', e.detail.count);
    };
    counterRef.current?.addEventListener('countchange', handler);
    return () => {
      counterRef.current?.removeEventListener('countchange', handler);
    };
  }, []);

  return <counter-component ref={counterRef} />;
}
```

### Vue

```vue
<template>
  <counter-component @countchange="handleCountChange" />
</template>

<script setup>
const handleCountChange = (e) => {
  console.log('Count:', e.detail.count);
};
</script>
```

## まとめ

Web Componentsは、フレームワーク非依存の再利用可能なコンポーネントを作成するための強力な標準技術です。2025年現在、主要ブラウザでの対応が完了し、実践的な開発が可能になっています。

特にデザインシステムやUIライブラリの構築、マイクロフロントエンドアーキテクチャでの活用が期待されています。Shadow DOMによるスタイルのカプセル化、Custom Elementsによる独自タグの定義、HTML Templatesによる再利用可能なマークアップなど、Web標準の力を最大限活用できる技術です。

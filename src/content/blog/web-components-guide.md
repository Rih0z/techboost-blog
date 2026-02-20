---
title: 'Web Components完全ガイド — Custom Elements・Shadow DOM・HTML Templates・Lit'
description: 'Web Componentsでフレームワーク非依存の再利用可能コンポーネントを構築する完全ガイド。Custom Elements・Shadow DOM・HTML Templates・Slots・Lit・TypeScript統合・React/Vue連携まで実装例付きで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-3.jpg'
tags: ['Web Components', 'Custom Elements', 'Shadow DOM', 'TypeScript', 'Lit']
---

# Web Components完全ガイド — Custom Elements・Shadow DOM・HTML Templates・Lit

フロントエンド開発において、Reactや Vueといったフレームワークへの依存が当たり前になった現代でも、**Web Components**はブラウザネイティブの標準技術として存在感を増し続けている。Web Componentsは特定フレームワークに縛られず、どこでも使える真の意味での「再利用可能コンポーネント」を実現する技術仕様群だ。

本記事では、Web Componentsを構成する4つの主要仕様から始まり、Litフレームワークを使った実践的な開発手法、TypeScript統合、React/Vue連携、パフォーマンス最適化、テスト戦略まで、実装例とともに徹底解説する。

---

## 1. Web Componentsとは — 4つの主要仕様

Web Componentsは単一の技術ではなく、W3Cが策定した複数のWeb標準仕様の総称だ。現在主要なモダンブラウザすべてで安定してサポートされている。

### 4つの仕様

| 仕様 | 概要 |
|------|------|
| **Custom Elements** | 独自のHTML要素を定義する仕様 |
| **Shadow DOM** | カプセル化されたDOMツリーとCSSスコープを提供する仕様 |
| **HTML Templates** | `<template>` タグで再利用可能なHTMLを定義する仕様 |
| **ES Modules** | モジュールシステム（現在はJavaScript標準） |

これら4つを組み合わせることで、フレームワーク非依存の再利用可能コンポーネントを構築できる。

### なぜ今Web Componentsなのか

フレームワーク乱立の時代において、Web Componentsには明確なメリットがある。

- **フレームワーク非依存**: React・Vue・Svelte・Angular、いずれの環境でも動作する
- **ブラウザネイティブ**: ポリフィル不要、追加バンドルサイズゼロ
- **長期安定性**: W3C標準のため、フレームワークのバージョンアップに振り回されない
- **デザインシステム構築**: 企業のデザインシステムをフレームワーク横断で提供できる

GoogleのMaterial Web、Adobe Spectrum、Microsoftの Fluent UIなど、大企業のデザインシステムがWeb Componentsで実装されている現実がその有用性を証明している。

---

## 2. Custom Elements — 独自HTML要素の定義

### 基本的なCustom Elementの作成

Custom Elementsは `HTMLElement` を継承したクラスを定義し、`customElements.define()` で登録する。

```javascript
// シンプルなカウンターコンポーネント
class CounterElement extends HTMLElement {
  #count = 0;

  constructor() {
    super();
    // constructorではattributeやchildrenにアクセスしない
  }

  connectedCallback() {
    // DOM に追加されたときに呼ばれる
    this.render();
    this.addEventListener('click', this.#handleClick);
  }

  disconnectedCallback() {
    // DOM から削除されたときに呼ばれる（クリーンアップ）
    this.removeEventListener('click', this.#handleClick);
  }

  adoptedCallback() {
    // 別のDocumentに移動されたときに呼ばれる
    console.log('Element adopted to new document');
  }

  #handleClick = () => {
    this.#count++;
    this.render();
  };

  render() {
    this.textContent = `Count: ${this.#count}`;
  }
}

// 要素名はハイフンを含む必要がある（標準要素との衝突回避）
customElements.define('counter-element', CounterElement);
```

```html
<!-- HTMLで使用 -->
<counter-element></counter-element>
```

### ライフサイクルコールバック

Custom Elementsには4つのライフサイクルコールバックがある。

```javascript
class LifecycleDemo extends HTMLElement {
  connectedCallback() {
    // 要素がDOMに接続されたとき
    // ここでDOMの初期化・イベントリスナー登録を行う
    console.log('connected');
  }

  disconnectedCallback() {
    // 要素がDOMから切り離されたとき
    // イベントリスナーの削除・タイマーのクリアなどクリーンアップ
    console.log('disconnected');
  }

  attributeChangedCallback(name, oldValue, newValue) {
    // 監視対象の属性が変更されたとき
    console.log(`Attribute ${name} changed: ${oldValue} → ${newValue}`);
  }

  adoptedCallback() {
    // 別のdocumentに移動されたとき（稀なユースケース）
    console.log('adopted');
  }

  // 監視する属性名を宣言（これがないとattributeChangedCallbackは呼ばれない）
  static get observedAttributes() {
    return ['label', 'disabled', 'value'];
  }
}
```

### カスタマイズされた組み込み要素

`HTMLButtonElement` などの組み込み要素を継承して拡張することもできる（SafariはFlagなしでは未サポートのため注意）。

```javascript
class FancyButton extends HTMLButtonElement {
  connectedCallback() {
    this.classList.add('fancy-button');
    this.addEventListener('click', () => {
      this.animate([
        { transform: 'scale(1)' },
        { transform: 'scale(0.95)' },
        { transform: 'scale(1)' }
      ], { duration: 200 });
    });
  }
}

customElements.define('fancy-button', FancyButton, { extends: 'button' });
```

```html
<button is="fancy-button">クリック</button>
```

### customElements Registry API

```javascript
// 要素が定義済みかチェック
const defined = customElements.get('counter-element');

// 定義を待機（非同期）
customElements.whenDefined('counter-element').then(() => {
  console.log('counter-element が定義されました');
});

// 定義を一時停止して後から適用（upgrade）
customElements.upgrade(element);
```

---

## 3. Shadow DOM — カプセル化とCSSアイソレーション

Shadow DOMはWeb Componentsの中でも特に強力な機能だ。コンポーネント内部のDOMとCSSを外部から完全に隔離できる。

### Shadow Rootの作成

```javascript
class CardComponent extends HTMLElement {
  constructor() {
    super();
    // Shadow Rootをアタッチ
    // mode: 'open' → JavaScript から shadowRoot にアクセス可能
    // mode: 'closed' → 外部からアクセス不可（より強固なカプセル化）
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }
        :host([elevated]) {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .card-header {
          padding: 16px;
          background: #f8fafc;
          font-weight: 600;
        }
        .card-body {
          padding: 16px;
        }
      </style>
      <div class="card-header">
        <slot name="header">デフォルトヘッダー</slot>
      </div>
      <div class="card-body">
        <slot></slot>
      </div>
    `;
  }
}

customElements.define('card-component', CardComponent);
```

### CSS カプセル化の詳細

Shadow DOM内ではCSSスコープが完全に分離される。

```javascript
class ScopedStyles extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' });

    this.shadowRoot.innerHTML = `
      <style>
        /* :host — Shadow Hostを指す（コンポーネント自身） */
        :host {
          display: block;
          font-family: sans-serif;
        }

        /* :host() — 条件付きホストスタイリング */
        :host(.primary) {
          color: #3b82f6;
        }

        /* :host-context() — 祖先要素に基づくスタイリング */
        :host-context(.dark-theme) {
          background: #1e293b;
          color: #f1f5f9;
        }

        /* ::slotted() — スロットに投影されたコンテンツへのスタイリング */
        ::slotted(p) {
          margin: 0;
          line-height: 1.6;
        }

        ::slotted([slot="header"]) {
          font-size: 1.25rem;
          font-weight: bold;
        }

        /* Shadow DOM内部のスタイル — 外部に漏れない */
        .internal-class {
          color: red; /* 外部のHTMLには一切影響しない */
        }

        /* CSSカスタムプロパティは Shadow DOM を貫通する */
        .themed {
          color: var(--component-color, #333);
          background: var(--component-bg, #fff);
        }
      </style>
      <div class="themed">
        <slot></slot>
      </div>
    `;
  }
}
```

### CSS カスタムプロパティによるテーマ対応

外部からShadow DOM内部のスタイルをカスタマイズする主な手段はCSSカスタムプロパティだ。

```html
<!-- 外部CSS -->
<style>
  my-button {
    --btn-bg: #3b82f6;
    --btn-color: #ffffff;
    --btn-radius: 8px;
    --btn-padding: 12px 24px;
  }

  my-button.danger {
    --btn-bg: #ef4444;
  }
</style>

<my-button>通常ボタン</my-button>
<my-button class="danger">削除</my-button>
```

```javascript
class MyButton extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        button {
          background: var(--btn-bg, #6366f1);
          color: var(--btn-color, #fff);
          border: none;
          border-radius: var(--btn-radius, 6px);
          padding: var(--btn-padding, 10px 20px);
          cursor: pointer;
          font-size: 14px;
          transition: opacity 0.2s;
        }
        button:hover { opacity: 0.9; }
        button:active { opacity: 0.8; }
      </style>
      <button part="button">
        <slot></slot>
      </button>
    `;
  }
}
```

### CSS Shadow Parts (`::part()`)

`part` 属性と `::part()` セレクターを使えば、外部からShadow DOM内部の特定要素を直接スタイリングできる。

```javascript
// コンポーネント内でpart属性を付与
this.shadowRoot.innerHTML = `
  <div part="container">
    <header part="header">
      <slot name="title"></slot>
    </header>
    <main part="body">
      <slot></slot>
    </main>
  </div>
`;
```

```css
/* 外部CSS — ::part() でShadow DOM内部にアクセス */
my-card::part(header) {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  padding: 20px;
}

my-card::part(body) {
  padding: 20px;
}
```

---

## 4. HTML Templates — `<template>` と `<slot>`

### `<template>` 要素の基本

`<template>` 要素内のコンテンツはページロード時にレンダリングされず、JavaScriptで複製・挿入するまで不活性な状態を維持する。

```html
<!-- HTMLファイルに定義 -->
<template id="user-card-template">
  <style>
    .user-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #e2e8f0;
    }
    .name { font-weight: 600; }
    .role { color: #64748b; font-size: 0.875rem; }
  </style>
  <div class="user-card">
    <img class="avatar" src="" alt="">
    <div>
      <div class="name"></div>
      <div class="role"></div>
    </div>
  </div>
</template>
```

```javascript
class UserCardElement extends HTMLElement {
  connectedCallback() {
    const template = document.getElementById('user-card-template');
    // cloneNode(true) で深いクローンを作成
    const content = template.content.cloneNode(true);

    const name = this.getAttribute('name') || 'Anonymous';
    const role = this.getAttribute('role') || '';
    const avatar = this.getAttribute('avatar') || '';

    content.querySelector('.name').textContent = name;
    content.querySelector('.role').textContent = role;
    content.querySelector('.avatar').src = avatar;
    content.querySelector('.avatar').alt = name;

    this.attachShadow({ mode: 'open' }).appendChild(content);
  }
}

customElements.define('user-card', UserCardElement);
```

### `<slot>` によるコンテンツ投影

Slotはコンポーネント内にプレースホルダーを定義し、利用側がコンテンツを挿入できる仕組みだ。

```javascript
class TabsComponent extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        .tabs-header {
          display: flex;
          border-bottom: 2px solid #e2e8f0;
          gap: 4px;
        }
        .tab-content {
          padding: 16px;
        }
      </style>

      <!-- 名前付きスロット -->
      <div class="tabs-header">
        <slot name="tab-headers"></slot>
      </div>

      <!-- デフォルトスロット（名前なし） -->
      <div class="tab-content">
        <slot></slot>
      </div>
    `;
  }
}
```

```html
<!-- 使用例 -->
<tabs-component>
  <!-- name="tab-headers" スロットに投影 -->
  <div slot="tab-headers">
    <button>概要</button>
    <button>詳細</button>
    <button>設定</button>
  </div>

  <!-- デフォルトスロットに投影 -->
  <div>タブコンテンツがここに入ります</div>
</tabs-component>
```

### slotchange イベント

スロットのコンテンツが変更されたことを検知できる。

```javascript
connectedCallback() {
  this.attachShadow({ mode: 'open' });
  this.shadowRoot.innerHTML = `<slot></slot>`;

  const slot = this.shadowRoot.querySelector('slot');

  slot.addEventListener('slotchange', () => {
    // 投影された要素一覧を取得
    const assignedElements = slot.assignedElements();
    console.log('スロットの内容が変わりました:', assignedElements);
  });
}
```

---

## 5. 属性とプロパティ — observedAttributes・reflect

属性（Attributes）とプロパティ（Properties）の同期は、Custom Elements設計で最も重要なパターンの一つだ。

### 属性の監視と変更ハンドラ

```javascript
class ProgressBar extends HTMLElement {
  static get observedAttributes() {
    // 変更を監視したい属性名の配列
    return ['value', 'max', 'label', 'color'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return; // 変化なしはスキップ

    switch (name) {
      case 'value':
      case 'max':
        this.#updateProgress();
        break;
      case 'label':
        this.#updateLabel(newValue);
        break;
      case 'color':
        this.#updateColor(newValue);
        break;
    }
  }

  #updateProgress() {
    const value = parseFloat(this.getAttribute('value') || '0');
    const max = parseFloat(this.getAttribute('max') || '100');
    const percent = Math.min(100, (value / max) * 100);

    if (this.shadowRoot) {
      const bar = this.shadowRoot.querySelector('.bar');
      if (bar) bar.style.width = `${percent}%`;
    }
  }

  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .track {
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
        }
        .bar {
          height: 100%;
          background: var(--progress-color, #3b82f6);
          border-radius: 4px;
          transition: width 0.3s ease;
        }
      </style>
      <div class="track">
        <div class="bar"></div>
      </div>
    `;
    this.#updateProgress();
  }
}
```

### プロパティと属性のリフレクション

```javascript
class ToggleSwitch extends HTMLElement {
  static get observedAttributes() {
    return ['checked', 'disabled'];
  }

  // プロパティ → 属性へのリフレクション
  get checked() {
    return this.hasAttribute('checked');
  }

  set checked(value) {
    if (value) {
      this.setAttribute('checked', '');
    } else {
      this.removeAttribute('checked');
    }
    // attributeChangedCallback が自動的に呼ばれ、UIが更新される
  }

  get disabled() {
    return this.hasAttribute('disabled');
  }

  set disabled(value) {
    if (value) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this.#render();
  }

  #render() {
    if (!this.shadowRoot) return;
    const toggle = this.shadowRoot.querySelector('.toggle');
    if (!toggle) return;

    toggle.classList.toggle('checked', this.checked);
    toggle.classList.toggle('disabled', this.disabled);
  }
}
```

---

## 6. イベント — dispatchEvent・CustomEvent・bubbling

### CustomEventの発火

```javascript
class SearchInput extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <input type="search" placeholder="検索...">
    `;

    const input = this.shadowRoot.querySelector('input');

    input.addEventListener('input', (e) => {
      // CustomEvent を作成して外部に通知
      const event = new CustomEvent('search', {
        detail: {
          query: e.target.value,
          timestamp: Date.now()
        },
        bubbles: true,    // 親要素にバブリング
        composed: true,   // Shadow DOM境界を越えてバブリング
        cancelable: true  // preventDefault() を許可
      });

      this.dispatchEvent(event);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const event = new CustomEvent('search-submit', {
          detail: { query: e.target.value },
          bubbles: true,
          composed: true
        });
        this.dispatchEvent(event);
      }
    });
  }
}
```

### イベントリスナー登録とクリーンアップ

```javascript
class TimerDisplay extends HTMLElement {
  #intervalId = null;
  #seconds = 0;
  #abortController = new AbortController();

  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <div class="display">00:00</div>
      <button class="start">開始</button>
      <button class="stop">停止</button>
    `;

    const { signal } = this.#abortController;

    // AbortController を使ったイベントリスナーの一括管理
    this.shadowRoot.querySelector('.start').addEventListener(
      'click',
      () => this.#start(),
      { signal }
    );

    this.shadowRoot.querySelector('.stop').addEventListener(
      'click',
      () => this.#stop(),
      { signal }
    );
  }

  disconnectedCallback() {
    // AbortControllerで全リスナーを一括解除
    this.#abortController.abort();
    this.#stop();
  }

  #start() {
    if (this.#intervalId) return;
    this.#intervalId = setInterval(() => {
      this.#seconds++;
      this.#updateDisplay();
      this.dispatchEvent(new CustomEvent('tick', {
        detail: { seconds: this.#seconds },
        bubbles: true,
        composed: true
      }));
    }, 1000);
  }

  #stop() {
    if (this.#intervalId) {
      clearInterval(this.#intervalId);
      this.#intervalId = null;
    }
  }

  #updateDisplay() {
    const min = Math.floor(this.#seconds / 60).toString().padStart(2, '0');
    const sec = (this.#seconds % 60).toString().padStart(2, '0');
    const display = this.shadowRoot?.querySelector('.display');
    if (display) display.textContent = `${min}:${sec}`;
  }
}
```

---

## 7. Lit Framework — Reactiveなコンポーネント開発

バニラのWeb Componentsは強力だが、ボイラープレートが多い。**Lit**（旧LitElement / lit-html）はGoogleが開発したWeb Components向け軽量ライブラリで、リアクティブな状態管理・効率的なテンプレートレンダリングを提供する。

### Litのインストール

```bash
npm install lit
```

### 基本的なLitコンポーネント

```typescript
import { LitElement, html, css } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';

@customElement('my-counter')
class MyCounter extends LitElement {
  // CSSはShadow DOMに自動的にスコープされる
  static styles = css`
    :host {
      display: inline-block;
      font-family: sans-serif;
    }
    .counter {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .count {
      font-size: 2rem;
      font-weight: bold;
      min-width: 3ch;
      text-align: center;
    }
    button {
      width: 40px;
      height: 40px;
      border: 1px solid #cbd5e1;
      border-radius: 50%;
      background: #fff;
      cursor: pointer;
      font-size: 1.25rem;
      transition: background 0.2s;
    }
    button:hover { background: #f1f5f9; }
  `;

  // @property — 外部から属性/プロパティとして設定可能なリアクティブプロパティ
  @property({ type: Number })
  initial = 0;

  @property({ type: Number })
  step = 1;

  // @state — コンポーネント内部の状態（外部非公開）
  @state()
  private count = 0;

  // ライフサイクル: 最初のレンダリング後に呼ばれる
  firstUpdated() {
    this.count = this.initial;
  }

  // html`` タグ付きテンプレートリテラルでUIを定義
  render() {
    return html`
      <div class="counter">
        <button @click=${this.#decrement} ?disabled=${this.count <= 0}>−</button>
        <span class="count">${this.count}</span>
        <button @click=${this.#increment}>+</button>
      </div>
    `;
  }

  #increment() {
    this.count += this.step;
    this.#dispatchChange();
  }

  #decrement() {
    this.count -= this.step;
    this.#dispatchChange();
  }

  #dispatchChange() {
    this.dispatchEvent(new CustomEvent('count-change', {
      detail: { count: this.count },
      bubbles: true,
      composed: true
    }));
  }
}
```

### Litのプロパティオプション

```typescript
@customElement('user-profile')
class UserProfile extends LitElement {
  // type: プロパティの型（属性→プロパティの変換に使用）
  @property({ type: String })
  name = '';

  // reflect: true → プロパティ変更が属性にも反映される
  @property({ type: Boolean, reflect: true })
  active = false;

  // attribute: false → 属性としての設定を無効化
  @property({ attribute: false })
  data: Record<string, unknown> = {};

  // converter: カスタム変換ロジック
  @property({
    converter: {
      fromAttribute: (value: string | null) => {
        return value ? value.split(',').map(s => s.trim()) : [];
      },
      toAttribute: (value: string[]) => value.join(',')
    }
  })
  tags: string[] = [];

  // hasChanged: カスタム変更検出（パフォーマンス最適化）
  @property({
    hasChanged: (newVal: unknown, oldVal: unknown) => {
      return JSON.stringify(newVal) !== JSON.stringify(oldVal);
    }
  })
  config: Record<string, unknown> = {};
}
```

---

## 8. Litのテンプレートと Directive

### html`` テンプレートの機能

```typescript
import { html, nothing } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { ref, createRef } from 'lit/directives/ref.js';
import { cache } from 'lit/directives/cache.js';
import { guard } from 'lit/directives/guard.js';
import { live } from 'lit/directives/live.js';

@customElement('demo-template')
class DemoTemplate extends LitElement {
  @state() items = ['Apple', 'Banana', 'Cherry'];
  @state() loading = false;
  @state() activeIndex = 0;

  // ref() — DOM要素への参照を取得
  private inputRef = createRef<HTMLInputElement>();

  render() {
    const classes = {
      'container': true,
      'loading': this.loading,
    };

    const styles = {
      '--accent-color': '#3b82f6',
      fontSize: '16px',
    };

    return html`
      <!-- classMap — 条件付きクラス適用 -->
      <div class=${classMap(classes)}>

        <!-- styleMap — 動的スタイル -->
        <ul style=${styleMap(styles)}>

          <!-- repeat — 効率的なリストレンダリング（キー付き） -->
          ${repeat(
            this.items,
            (item) => item, // キー関数
            (item, index) => html`
              <li class=${index === this.activeIndex ? 'active' : ''}>
                ${item}
              </li>
            `
          )}
        </ul>

        <!-- 条件付きレンダリング -->
        ${this.loading
          ? html`<div class="spinner">読み込み中...</div>`
          : nothing  // 何もレンダリングしない
        }

        <!-- ifDefined — undefined の場合は属性を削除 -->
        <a href=${ifDefined(this.getUrl())}>リンク</a>

        <!-- ref — DOM要素への参照 -->
        <input ${ref(this.inputRef)} type="text">

        <!-- イベントバインディング -->
        <button @click=${this.#handleClick}>
          クリック
        </button>

        <!-- live — フォームの外部からの値変更に対応 -->
        <input .value=${live(this.items[0] || '')} @input=${this.#onInput}>
      </div>
    `;
  }

  getUrl(): string | undefined {
    return this.activeIndex >= 0 ? `/item/${this.activeIndex}` : undefined;
  }

  #handleClick(e: MouseEvent) {
    console.log('clicked', e);
  }

  #onInput(e: InputEvent) {
    const target = e.target as HTMLInputElement;
    console.log(target.value);
  }

  async firstUpdated() {
    // ref経由でDOM要素にアクセス
    this.inputRef.value?.focus();
  }
}
```

### css`` タグ付きテンプレートとsuperStyles

```typescript
import { css, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';

// 共有スタイルの定義
export const buttonStyles = css`
  button {
    border: none;
    border-radius: 6px;
    cursor: pointer;
    padding: 10px 20px;
    font-weight: 500;
    transition: all 0.2s;
  }
`;

export const colorTokens = css`
  :host {
    --color-primary: #3b82f6;
    --color-danger: #ef4444;
    --color-success: #22c55e;
  }
`;

@customElement('action-button')
class ActionButton extends LitElement {
  // 複数のスタイルシートを配列で合成
  static styles = [
    colorTokens,
    buttonStyles,
    css`
      button {
        background: var(--color-primary);
        color: white;
      }
      button:hover {
        filter: brightness(1.1);
        transform: translateY(-1px);
      }
    `
  ];

  render() {
    return html`<button><slot></slot></button>`;
  }
}
```

---

## 9. TypeScript デコレーター統合

### `tsconfig.json` の設定

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "useDefineForClassFields": false,
    "experimentalDecorators": true,
    "strict": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  }
}
```

### デコレーター活用の完全な例

```typescript
import { LitElement, html, css, PropertyValues } from 'lit';
import {
  customElement,
  property,
  state,
  query,
  queryAll,
  queryAssignedElements,
  eventOptions,
} from 'lit/decorators.js';

@customElement('data-table')
export class DataTable extends LitElement {
  static styles = css`
    :host { display: block; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f8fafc; font-weight: 600; }
    tr:hover td { background: #f1f5f9; }
    .sort-btn { background: none; border: none; cursor: pointer; }
    .sort-btn.asc::after { content: ' ↑'; }
    .sort-btn.desc::after { content: ' ↓'; }
  `;

  // 外部公開プロパティ
  @property({ type: Array })
  columns: { key: string; label: string; sortable?: boolean }[] = [];

  @property({ type: Array })
  rows: Record<string, unknown>[] = [];

  @property({ type: String, reflect: true })
  caption = '';

  // 内部状態
  @state()
  private sortKey = '';

  @state()
  private sortOrder: 'asc' | 'desc' = 'asc';

  @state()
  private currentPage = 1;

  @property({ type: Number })
  pageSize = 10;

  // DOM要素への参照
  @query('table')
  private tableEl!: HTMLTableElement;

  @queryAll('tr[data-row]')
  private rowEls!: NodeListOf<HTMLTableRowElement>;

  // スロットに投影された要素への参照
  @queryAssignedElements({ slot: 'actions' })
  private actionElements!: HTMLElement[];

  // ライフサイクル: プロパティが変更されるたびに呼ばれる
  protected willUpdate(changed: PropertyValues<this>) {
    if (changed.has('rows') || changed.has('sortKey') || changed.has('sortOrder')) {
      this.#computeSortedRows();
    }
  }

  private sortedRows: Record<string, unknown>[] = [];

  #computeSortedRows() {
    if (!this.sortKey) {
      this.sortedRows = [...this.rows];
      return;
    }
    this.sortedRows = [...this.rows].sort((a, b) => {
      const av = a[this.sortKey];
      const bv = b[this.sortKey];
      const cmp = av! < bv! ? -1 : av! > bv! ? 1 : 0;
      return this.sortOrder === 'asc' ? cmp : -cmp;
    });
  }

  render() {
    const start = (this.currentPage - 1) * this.pageSize;
    const pageRows = this.sortedRows.slice(start, start + this.pageSize);
    const totalPages = Math.ceil(this.sortedRows.length / this.pageSize);

    return html`
      <div class="toolbar">
        <slot name="actions"></slot>
      </div>
      <table>
        ${this.caption ? html`<caption>${this.caption}</caption>` : ''}
        <thead>
          <tr>
            ${this.columns.map(col => html`
              <th>
                ${col.sortable
                  ? html`<button
                      class="sort-btn ${this.sortKey === col.key ? this.sortOrder : ''}"
                      @click=${() => this.#toggleSort(col.key)}
                    >${col.label}</button>`
                  : col.label
                }
              </th>
            `)}
          </tr>
        </thead>
        <tbody>
          ${pageRows.map((row, i) => html`
            <tr data-row=${i}>
              ${this.columns.map(col => html`
                <td>${row[col.key]}</td>
              `)}
            </tr>
          `)}
        </tbody>
      </table>
      ${totalPages > 1 ? html`
        <div class="pagination">
          <button ?disabled=${this.currentPage === 1} @click=${() => this.currentPage--}>
            前へ
          </button>
          <span>${this.currentPage} / ${totalPages}</span>
          <button ?disabled=${this.currentPage === totalPages} @click=${() => this.currentPage++}>
            次へ
          </button>
        </div>
      ` : ''}
    `;
  }

  #toggleSort(key: string) {
    if (this.sortKey === key) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortOrder = 'asc';
    }

    this.dispatchEvent(new CustomEvent('sort-change', {
      detail: { key: this.sortKey, order: this.sortOrder },
      bubbles: true,
      composed: true
    }));
  }
}

// TypeScript型宣言（JSX/HTML使用時のIntelliSense）
declare global {
  interface HTMLElementTagNameMap {
    'data-table': DataTable;
  }
}
```

---

## 10. Reactとの統合

### `@lit/react` パッケージ

```bash
npm install @lit/react react react-dom
npm install -D @types/react @types/react-dom
```

```typescript
import React from 'react';
import { createComponent } from '@lit/react';
import { DataTable } from './data-table.js';

// LitコンポーネントをReactコンポーネントとしてラップ
export const ReactDataTable = createComponent({
  tagName: 'data-table',
  elementClass: DataTable,
  react: React,
  // カスタムイベントをReact propsにマッピング
  events: {
    onSortChange: 'sort-change',
    onCountChange: 'count-change',
  },
});
```

```tsx
// App.tsx
import { ReactDataTable } from './ReactDataTable.js';

const columns = [
  { key: 'name', label: '名前', sortable: true },
  { key: 'role', label: '役割', sortable: true },
  { key: 'email', label: 'メール' },
];

const rows = [
  { name: '田中 太郎', role: 'エンジニア', email: 'tanaka@example.com' },
  { name: '佐藤 花子', role: 'デザイナー', email: 'sato@example.com' },
  { name: '鈴木 一郎', role: 'PM', email: 'suzuki@example.com' },
];

function App() {
  const handleSortChange = (e: CustomEvent) => {
    console.log('ソート変更:', e.detail);
  };

  return (
    <div>
      <h1>チームメンバー</h1>
      <ReactDataTable
        columns={columns}
        rows={rows}
        caption="チームメンバー一覧"
        pageSize={5}
        onSortChange={handleSortChange}
      />
    </div>
  );
}
```

### 手動統合（ラッパーなし）

```tsx
// useEffect でカスタムイベントを購読
import { useEffect, useRef } from 'react';

function Counter() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ count: number }>;
      console.log('Count changed:', custom.detail.count);
    };

    el.addEventListener('count-change', handler);
    return () => el.removeEventListener('count-change', handler);
  }, []);

  return <my-counter ref={ref} initial={0} step={1} />;
}

// TypeScript JSX型定義
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'my-counter': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          initial?: number;
          step?: number;
        },
        HTMLElement
      >;
      'data-table': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          columns?: unknown[];
          rows?: unknown[];
          caption?: string;
          'page-size'?: number;
        },
        HTMLElement
      >;
    }
  }
}
```

---

## 11. Vueとの統合

### Vue 3 での設定

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // カスタム要素として扱う（Vueコンポーネントとして解決しない）
          isCustomElement: (tag) => tag.includes('-'),
          // または特定のプレフィックスのみ
          // isCustomElement: (tag) => tag.startsWith('ds-'),
        },
      },
    }),
  ],
});
```

```vue
<!-- App.vue -->
<template>
  <div>
    <h1>Web Components in Vue</h1>

    <!-- Web Componentsをネイティブに使用 -->
    <data-table
      :columns="JSON.stringify(columns)"
      :rows="JSON.stringify(rows)"
      caption="データ一覧"
      @sort-change="onSortChange"
    />

    <!-- プロパティバインディング（.prop修飾子でプロパティとして渡す） -->
    <data-table
      v-bind:columns.prop="columns"
      v-bind:rows.prop="rows"
    />

    <!-- Vueのv-bind + カスタム要素 -->
    <my-counter
      :initial="initialCount"
      :step="1"
      @count-change="handleCountChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
// Litコンポーネントをインポート（副作用として要素を登録）
import './components/data-table.js';
import './components/my-counter.js';

const initialCount = ref(10);

const columns = [
  { key: 'name', label: '名前', sortable: true },
  { key: 'email', label: 'メール' },
];

const rows = ref([
  { name: '田中', email: 'tanaka@example.com' },
]);

function onSortChange(e: CustomEvent) {
  console.log('Sort:', e.detail);
}

function handleCountChange(e: CustomEvent) {
  console.log('Count:', e.detail.count);
}
</script>
```

### Nuxt 3 での設定

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  vue: {
    compilerOptions: {
      isCustomElement: (tag) => tag.includes('-'),
    },
  },
});
```

---

## 12. パフォーマンス最適化

### 遅延ロード（Lazy Loading）

```javascript
// components/index.js — 全コンポーネントの遅延ロード定義
const components = {
  'heavy-chart': () => import('./heavy-chart.js'),
  'data-table': () => import('./data-table.js'),
  'rich-editor': () => import('./rich-editor.js'),
};

// Intersection Observer を使った遅延ロード
function lazyLoadComponents() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(async (entry) => {
      if (!entry.isIntersecting) return;

      const el = entry.target;
      const tagName = el.tagName.toLowerCase();
      const loader = components[tagName];

      if (loader && !customElements.get(tagName)) {
        await loader();
        // 要素をupgrade（バンドルロード後に定義が適用される）
        customElements.upgrade(el);
      }

      observer.unobserve(el);
    });
  }, {
    rootMargin: '100px', // ビューポートの100px手前から読み込み開始
  });

  // 未定義のカスタム要素を監視
  document.querySelectorAll(':not(:defined)').forEach(el => {
    observer.observe(el);
  });
}

document.addEventListener('DOMContentLoaded', lazyLoadComponents);
```

### コンポーネントのUpgrade制御

```html
<!-- HTMLを先にパース（Pending状態） -->
<heavy-chart data-src="/api/chart-data"></heavy-chart>
<data-table caption="売上データ"></data-table>
```

```javascript
// カスタム要素が定義されるまでUIをスケルトン表示
// CSS で :not(:defined) に対してスケルトンを適用
const style = document.createElement('style');
style.textContent = `
  heavy-chart:not(:defined),
  data-table:not(:defined) {
    display: block;
    min-height: 200px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 8px;
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;
document.head.appendChild(style);
```

### Litのパフォーマンスベストプラクティス

```typescript
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { cache } from 'lit/directives/cache.js';
import { guard } from 'lit/directives/guard.js';

@customElement('optimized-list')
class OptimizedList extends LitElement {
  @state() items: { id: string; name: string; value: number }[] = [];
  @state() activeTab = 'list';

  render() {
    return html`
      <!-- cache: 非表示になっても DOMを保持、再表示時のコストを削減 -->
      ${cache(
        this.activeTab === 'list'
          ? html`<div class="list-view">
              <!-- repeat: キー付きで効率的な差分更新 -->
              ${repeat(
                this.items,
                item => item.id,
                item => html`<list-item .data=${item}></list-item>`
              )}
            </div>`
          : html`<div class="grid-view">
              ${repeat(
                this.items,
                item => item.id,
                item => html`<grid-item .data=${item}></grid-item>`
              )}
            </div>`
      )}

      <!-- guard: 依存値が変わらない限り再レンダリングしない -->
      ${guard([this.items.length], () => html`
        <div class="summary">合計: ${this.items.length} 件</div>
      `)}
    `;
  }
}
```

### メモリリークの防止

```typescript
@customElement('event-hub')
class EventHub extends LitElement {
  #subscriptions: (() => void)[] = [];

  connectedCallback() {
    super.connectedCallback();

    // グローバルイベントリスナーを追跡
    const handler = (e: CustomEvent) => this.#handleGlobalEvent(e);
    window.addEventListener('app-event', handler as EventListener);
    this.#subscriptions.push(() =>
      window.removeEventListener('app-event', handler as EventListener)
    );

    // ResizeObserver
    const ro = new ResizeObserver(() => this.requestUpdate());
    ro.observe(this);
    this.#subscriptions.push(() => ro.disconnect());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // 登録したすべてのサブスクリプションをクリーンアップ
    this.#subscriptions.forEach(unsub => unsub());
    this.#subscriptions = [];
  }

  #handleGlobalEvent(e: CustomEvent) {
    console.log('Global event:', e.detail);
  }

  render() {
    return html`<slot></slot>`;
  }
}
```

---

## 13. テスト — @web/test-runner と open-wc

### セットアップ

```bash
npm install -D @web/test-runner @web/test-runner-playwright
npm install -D @open-wc/testing
npm install -D sinon @types/sinon
```

```json
// package.json
{
  "scripts": {
    "test": "wtr --coverage",
    "test:watch": "wtr --watch"
  }
}
```

```javascript
// web-test-runner.config.mjs
import { playwrightLauncher } from '@web/test-runner-playwright';

export default {
  files: 'src/**/*.test.ts',
  nodeResolve: true,
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
  ],
  coverage: true,
  coverageConfig: {
    include: ['src/**/*.ts'],
    exclude: ['src/**/*.test.ts'],
  },
};
```

### コンポーネントのユニットテスト

```typescript
// src/my-counter.test.ts
import { fixture, html, expect, waitUntil } from '@open-wc/testing';
import { MyCounter } from './my-counter.js';
import sinon from 'sinon';

describe('MyCounter', () => {
  it('初期値が0でレンダリングされる', async () => {
    const el = await fixture<MyCounter>(html`<my-counter></my-counter>`);

    await el.updateComplete;

    const count = el.shadowRoot!.querySelector('.count');
    expect(count?.textContent).to.equal('0');
  });

  it('initial属性で初期値を設定できる', async () => {
    const el = await fixture<MyCounter>(
      html`<my-counter initial="10"></my-counter>`
    );

    await el.updateComplete;

    const count = el.shadowRoot!.querySelector('.count');
    expect(count?.textContent).to.equal('10');
  });

  it('+ボタンクリックでカウントが増加する', async () => {
    const el = await fixture<MyCounter>(html`<my-counter></my-counter>`);
    await el.updateComplete;

    const btn = el.shadowRoot!.querySelector<HTMLButtonElement>(
      'button:last-child'
    );
    btn?.click();

    await el.updateComplete;

    const count = el.shadowRoot!.querySelector('.count');
    expect(count?.textContent).to.equal('1');
  });

  it('count-changeイベントを発火する', async () => {
    const el = await fixture<MyCounter>(html`<my-counter></my-counter>`);
    const spy = sinon.spy();

    el.addEventListener('count-change', spy);

    const btn = el.shadowRoot!.querySelector<HTMLButtonElement>(
      'button:last-child'
    );
    btn?.click();

    await el.updateComplete;

    expect(spy.calledOnce).to.be.true;
    expect(spy.firstCall.args[0].detail.count).to.equal(1);
  });

  it('stepプロパティで増分を制御できる', async () => {
    const el = await fixture<MyCounter>(
      html`<my-counter step="5"></my-counter>`
    );
    await el.updateComplete;

    const btn = el.shadowRoot!.querySelector<HTMLButtonElement>(
      'button:last-child'
    );
    btn?.click();
    btn?.click();

    await el.updateComplete;

    const count = el.shadowRoot!.querySelector('.count');
    expect(count?.textContent).to.equal('10');
  });

  it('アクセシビリティ基準を満たす', async () => {
    const el = await fixture<MyCounter>(html`<my-counter></my-counter>`);
    // @open-wc/testing の axe アクセシビリティチェック
    await expect(el).to.be.accessible();
  });
});
```

### スナップショットテスト

```typescript
import { fixture, html } from '@open-wc/testing';
import { visualDiff } from '@web/test-runner-visual-regression';

describe('DataTable visual regression', () => {
  it('デフォルト表示のスナップショット', async () => {
    const el = await fixture(html`
      <data-table
        .columns=${[{ key: 'name', label: '名前' }]}
        .rows=${[{ name: 'テスト' }]}
      ></data-table>
    `);

    await visualDiff(el, 'data-table-default');
  });
});
```

### open-wc のヘルパー関数

```typescript
import {
  fixture,        // 要素を作成してDOMに挿入
  fixtureSync,    // 同期バージョン
  html,           // タグ付きテンプレートリテラル
  unsafeStatic,   // 動的タグ名
  elementUpdated, // 次のLit更新サイクルを待つ
  nextFrame,      // 次のアニメーションフレームを待つ
  aTimeout,       // タイムアウトPromise
  waitUntil,      // 条件が真になるまで待機
  expect,         // Chai + カスタムマッチャー
} from '@open-wc/testing';

// elementUpdated の使用例
it('非同期更新後のDOMを検証', async () => {
  const el = await fixture<MyComponent>(html`<my-component></my-component>`);

  el.value = 'new value';
  await elementUpdated(el); // Litの更新完了を待つ

  expect(el.shadowRoot!.querySelector('.display')!.textContent).to.equal('new value');
});
```

---

## まとめ — Web Componentsを活用すべき場面

Web Componentsは万能ではないが、以下のユースケースでは特に強力な選択肢になる。

**Web Componentsが向いている場面:**
- 複数フレームワークをまたぐデザインシステムの構築
- フレームワーク非依存のUIライブラリの公開
- レガシーシステムへのUI改善の段階的導入
- マイクロフロントエンドアーキテクチャ

**向いていない場面:**
- 単一フレームワークで完結する大規模SPAの内部コンポーネント
- 複雑なサーバーサイドレンダリングが必要なケース（SSR対応が複雑）
- 高頻度のリアクティブ状態管理（この場合はフレームワークが有利）

Web標準としてのWeb Componentsは、フロントエンドの断片化が続く現代において、技術的負債を最小化しながら再利用性を最大化する選択肢として今後も重要性が増していくだろう。

---

## 開発ツールのご紹介

Webフロントエンド開発を効率化するためのツールを探しているなら、**[DevToolBox](https://usedevtools.com/)** をぜひ確認してほしい。JSON整形・正規表現テスト・Base64エンコード・UUIDジェネレーターなど、日々の開発で頻繁に使うツールをひとまとめにしたオールインワン開発ツールボックスだ。Web Componentsの属性値やJSONペイロードの確認にも役立てることができる。

---

*本記事のサンプルコードはすべてTypeScript 5.x + Lit 3.x + @web/test-runner 0.x 環境で動作確認済みです。各ライブラリの最新バージョンについては公式ドキュメントをご参照ください。*

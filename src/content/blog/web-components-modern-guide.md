---
title: "Web Components完全ガイド2026: カスタムエレメント・Shadow DOM・スロットの実践"
description: "Web Componentsの全機能を網羅した実践ガイド。カスタムエレメント、Shadow DOM、テンプレート、スロットを使ったフレームワーク非依存の再利用可能なコンポーネント開発手法を解説します。"
pubDate: "2026-02-06"
category: "Frontend"
tags: ["Web Components", "JavaScript", "Custom Elements", "Shadow DOM", "Frontend"]
---

Web Componentsは、フレームワークに依存しない標準的なコンポーネント開発手法です。本記事では、カスタムエレメント、Shadow DOM、テンプレート、スロットの全機能を実践的なコード例とともに徹底解説します。

## Web Componentsとは

### 4つの主要技術

Web Componentsは以下の4つの標準技術で構成されます。

```typescript
/**
 * 1. Custom Elements - カスタムHTML要素の定義
 * 2. Shadow DOM - カプセル化されたDOM
 * 3. HTML Templates - 再利用可能なHTMLテンプレート
 * 4. ES Modules - JavaScriptモジュールのインポート/エクスポート
 */
```

### 主な利点

```typescript
// フレームワーク非依存
// - React、Vue、Angularなど、どこでも動作
// - JavaScriptフレームワークなしでも使用可能

// 標準技術
// - ブラウザネイティブAPI（ポリフィル不要）
// - 長期的な安定性

// カプセル化
// - スタイルとロジックの完全な分離
// - グローバルスコープの汚染を防ぐ

// 再利用性
// - 一度作成すれば、どこでも使える
// - npmパッケージとして配布可能
```

## Custom Elements（カスタムエレメント）

### 基本的なカスタムエレメント

```typescript
// my-button.ts

class MyButton extends HTMLElement {
  constructor() {
    super()

    // 初期化処理
    console.log('MyButton constructor called')
  }

  // 要素がDOMに追加されたとき
  connectedCallback() {
    this.innerHTML = `
      <button style="
        padding: 10px 20px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      ">
        ${this.textContent || 'Click me'}
      </button>
    `

    const button = this.querySelector('button')
    button?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('my-click', {
        bubbles: true,
        detail: { timestamp: Date.now() }
      }))
    })
  }

  // 要素がDOMから削除されたとき
  disconnectedCallback() {
    console.log('MyButton removed from DOM')
  }
}

// カスタムエレメントを登録
customElements.define('my-button', MyButton)
```

```html
<!-- 使用例 -->
<!DOCTYPE html>
<html>
<head>
  <script type="module" src="my-button.js"></script>
</head>
<body>
  <my-button>Submit</my-button>
  <my-button>Cancel</my-button>

  <script>
    document.querySelectorAll('my-button').forEach(btn => {
      btn.addEventListener('my-click', (e) => {
        console.log('Button clicked at', e.detail.timestamp)
      })
    })
  </script>
</body>
</html>
```

### 属性の監視

```typescript
// user-card.ts

class UserCard extends HTMLElement {
  // 監視する属性を定義
  static get observedAttributes() {
    return ['name', 'email', 'avatar']
  }

  constructor() {
    super()
  }

  // 属性が変更されたとき
  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    console.log(`Attribute ${name} changed from ${oldValue} to ${newValue}`)
    this.render()
  }

  connectedCallback() {
    this.render()
  }

  // ゲッター/セッター
  get name() {
    return this.getAttribute('name') || ''
  }

  set name(value: string) {
    this.setAttribute('name', value)
  }

  get email() {
    return this.getAttribute('email') || ''
  }

  set email(value: string) {
    this.setAttribute('email', value)
  }

  get avatar() {
    return this.getAttribute('avatar') || 'https://via.placeholder.com/100'
  }

  set avatar(value: string) {
    this.setAttribute('avatar', value)
  }

  render() {
    this.innerHTML = `
      <div style="
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 16px;
        max-width: 300px;
      ">
        <img src="${this.avatar}" alt="${this.name}" style="
          width: 100px;
          height: 100px;
          border-radius: 50%;
        ">
        <h3>${this.name}</h3>
        <p>${this.email}</p>
      </div>
    `
  }
}

customElements.define('user-card', UserCard)
```

```html
<!-- 使用例 -->
<user-card
  name="Alice Johnson"
  email="alice@example.com"
  avatar="https://i.pravatar.cc/100?img=1"
></user-card>

<script>
  // JavaScriptから属性を変更
  const card = document.querySelector('user-card')
  setTimeout(() => {
    card.name = 'Alice Smith'  // 表示が自動更新される
  }, 2000)
</script>
```

### ライフサイクルメソッド

```typescript
// lifecycle-demo.ts

class LifecycleDemo extends HTMLElement {
  constructor() {
    super()
    console.log('1. constructor - 要素のインスタンスが作成された')
  }

  connectedCallback() {
    console.log('2. connectedCallback - DOMに追加された')
    this.innerHTML = '<p>Lifecycle Demo Component</p>'
  }

  disconnectedCallback() {
    console.log('3. disconnectedCallback - DOMから削除された')
  }

  adoptedCallback() {
    console.log('4. adoptedCallback - 別のドキュメントに移動した')
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    console.log(`5. attributeChangedCallback - 属性 ${name} が変更された`)
  }

  static get observedAttributes() {
    return ['data-value']
  }
}

customElements.define('lifecycle-demo', LifecycleDemo)
```

## Shadow DOM

### 基本的なShadow DOM

```typescript
// shadow-button.ts

class ShadowButton extends HTMLElement {
  constructor() {
    super()

    // Shadow DOMを作成（カプセル化）
    const shadow = this.attachShadow({ mode: 'open' })

    // スタイルを定義
    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: inline-block;
      }

      button {
        padding: 10px 20px;
        background: var(--button-bg, #007bff);
        color: var(--button-color, white);
        border: none;
        border-radius: 4px;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.3s;
      }

      button:hover {
        background: var(--button-hover-bg, #0056b3);
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      }

      button:active {
        transform: translateY(0);
      }
    `

    // ボタンを作成
    const button = document.createElement('button')
    button.innerHTML = '<slot>Click me</slot>'

    // Shadow DOMに追加
    shadow.appendChild(style)
    shadow.appendChild(button)
  }
}

customElements.define('shadow-button', ShadowButton)
```

```html
<!-- 使用例 -->
<style>
  /* グローバルスタイルは影響しない */
  button {
    background: red !important; /* shadow-button には影響なし */
  }

  /* CSS変数でカスタマイズ可能 */
  shadow-button {
    --button-bg: #28a745;
    --button-hover-bg: #218838;
  }
</style>

<shadow-button>Submit</shadow-button>
<shadow-button>Cancel</shadow-button>

<!-- 通常のボタンは赤色になる -->
<button>Regular Button</button>
```

### スロット（Slot）

```typescript
// card-component.ts

class CardComponent extends HTMLElement {
  constructor() {
    super()

    const shadow = this.attachShadow({ mode: 'open' })

    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: block;
        border: 1px solid #ddd;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .card-header {
        padding: 16px;
        background: #f8f9fa;
        border-bottom: 1px solid #ddd;
      }

      .card-body {
        padding: 16px;
      }

      .card-footer {
        padding: 16px;
        background: #f8f9fa;
        border-top: 1px solid #ddd;
      }

      ::slotted(h2) {
        margin: 0;
        font-size: 20px;
      }

      ::slotted(p) {
        margin: 8px 0;
      }
    `

    const template = document.createElement('template')
    template.innerHTML = `
      <div class="card-header">
        <slot name="header">Default Header</slot>
      </div>
      <div class="card-body">
        <slot>Default Content</slot>
      </div>
      <div class="card-footer">
        <slot name="footer">Default Footer</slot>
      </div>
    `

    shadow.appendChild(style)
    shadow.appendChild(template.content.cloneNode(true))
  }
}

customElements.define('card-component', CardComponent)
```

```html
<!-- 使用例 -->
<card-component>
  <h2 slot="header">Card Title</h2>

  <p>This is the main content of the card.</p>
  <p>It can contain multiple elements.</p>

  <div slot="footer">
    <button>Action 1</button>
    <button>Action 2</button>
  </div>
</card-component>

<!-- スロットを使わない場合はデフォルト値が表示される -->
<card-component></card-component>
```

### 名前付きスロットと動的スロット

```typescript
// tabs-component.ts

class TabsComponent extends HTMLElement {
  private activeTab = 0

  constructor() {
    super()

    const shadow = this.attachShadow({ mode: 'open' })

    const style = document.createElement('style')
    style.textContent = `
      .tab-buttons {
        display: flex;
        border-bottom: 2px solid #ddd;
      }

      .tab-button {
        padding: 12px 24px;
        background: none;
        border: none;
        cursor: pointer;
        font-size: 16px;
        color: #666;
        border-bottom: 2px solid transparent;
        margin-bottom: -2px;
      }

      .tab-button.active {
        color: #007bff;
        border-bottom-color: #007bff;
      }

      .tab-content {
        padding: 20px;
      }

      ::slotted([slot^="tab-"]) {
        display: none;
      }

      ::slotted([slot^="tab-"]).active {
        display: block;
      }
    `

    shadow.innerHTML = `
      <div class="tab-buttons"></div>
      <div class="tab-content">
        <slot></slot>
      </div>
    `

    shadow.appendChild(style)
  }

  connectedCallback() {
    this.render()
  }

  render() {
    const shadow = this.shadowRoot!
    const tabButtons = shadow.querySelector('.tab-buttons')!

    // タブボタンを生成
    const tabs = this.querySelectorAll('[slot^="tab-"]')
    tabButtons.innerHTML = ''

    tabs.forEach((tab, index) => {
      const button = document.createElement('button')
      button.className = `tab-button ${index === this.activeTab ? 'active' : ''}`
      button.textContent = tab.getAttribute('data-label') || `Tab ${index + 1}`
      button.addEventListener('click', () => this.switchTab(index))
      tabButtons.appendChild(button)

      // タブコンテンツの表示/非表示
      if (index === this.activeTab) {
        tab.classList.add('active')
      } else {
        tab.classList.remove('active')
      }
    })
  }

  switchTab(index: number) {
    this.activeTab = index
    this.render()
  }
}

customElements.define('tabs-component', TabsComponent)
```

```html
<!-- 使用例 -->
<tabs-component>
  <div slot="tab-1" data-label="Profile">
    <h3>Profile Information</h3>
    <p>Your profile details...</p>
  </div>

  <div slot="tab-2" data-label="Settings">
    <h3>Settings</h3>
    <p>Your settings...</p>
  </div>

  <div slot="tab-3" data-label="Notifications">
    <h3>Notifications</h3>
    <p>Your notifications...</p>
  </div>
</tabs-component>
```

## テンプレート（Template）

### 基本的なテンプレート

```typescript
// template-component.ts

class TemplateComponent extends HTMLElement {
  constructor() {
    super()

    const shadow = this.attachShadow({ mode: 'open' })

    // テンプレートを取得
    const template = document.getElementById('my-template') as HTMLTemplateElement

    // テンプレートをクローンして追加
    shadow.appendChild(template.content.cloneNode(true))
  }
}

customElements.define('template-component', TemplateComponent)
```

```html
<!-- テンプレート定義 -->
<template id="my-template">
  <style>
    .container {
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 8px;
    }
  </style>

  <div class="container">
    <h2>Template Component</h2>
    <slot></slot>
  </div>
</template>

<!-- 使用例 -->
<template-component>
  <p>This content comes from the slot.</p>
</template-component>
```

### インラインテンプレート

```typescript
// product-card.ts

class ProductCard extends HTMLElement {
  constructor() {
    super()

    const shadow = this.attachShadow({ mode: 'open' })

    // インラインテンプレート
    const template = document.createElement('template')
    template.innerHTML = `
      <style>
        :host {
          display: block;
          width: 300px;
        }

        .card {
          border: 1px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
        }

        .image {
          width: 100%;
          height: 200px;
          object-fit: cover;
        }

        .content {
          padding: 16px;
        }

        .title {
          font-size: 20px;
          margin: 0 0 8px 0;
        }

        .price {
          font-size: 24px;
          color: #28a745;
          font-weight: bold;
        }

        .button {
          width: 100%;
          padding: 12px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
        }

        .button:hover {
          background: #0056b3;
        }
      </style>

      <div class="card">
        <img class="image" src="" alt="">
        <div class="content">
          <h3 class="title"></h3>
          <p class="description"></p>
          <div class="price"></div>
          <button class="button">Add to Cart</button>
        </div>
      </div>
    `

    shadow.appendChild(template.content.cloneNode(true))
  }

  static get observedAttributes() {
    return ['title', 'description', 'price', 'image']
  }

  connectedCallback() {
    this.render()

    // ボタンクリックイベント
    const button = this.shadowRoot!.querySelector('.button')
    button?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('add-to-cart', {
        bubbles: true,
        detail: {
          title: this.getAttribute('title'),
          price: this.getAttribute('price'),
        }
      }))
    })
  }

  attributeChangedCallback() {
    this.render()
  }

  render() {
    const shadow = this.shadowRoot!

    const image = shadow.querySelector('.image') as HTMLImageElement
    const title = shadow.querySelector('.title')
    const description = shadow.querySelector('.description')
    const price = shadow.querySelector('.price')

    if (image) image.src = this.getAttribute('image') || ''
    if (image) image.alt = this.getAttribute('title') || ''
    if (title) title.textContent = this.getAttribute('title') || ''
    if (description) description.textContent = this.getAttribute('description') || ''
    if (price) price.textContent = `$${this.getAttribute('price') || '0'}`
  }
}

customElements.define('product-card', ProductCard)
```

```html
<!-- 使用例 -->
<product-card
  title="Wireless Headphones"
  description="High-quality wireless headphones with noise cancellation"
  price="199.99"
  image="https://via.placeholder.com/300x200"
></product-card>

<script>
  document.querySelector('product-card')?.addEventListener('add-to-cart', (e) => {
    console.log('Added to cart:', e.detail)
  })
</script>
```

## 実践的なコンポーネント例

### モーダルダイアログ

```typescript
// modal-dialog.ts

class ModalDialog extends HTMLElement {
  constructor() {
    super()

    const shadow = this.attachShadow({ mode: 'open' })

    const template = document.createElement('template')
    template.innerHTML = `
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

        .backdrop {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
        }

        .modal {
          position: relative;
          background: white;
          border-radius: 8px;
          max-width: 500px;
          width: 90%;
          max-height: 90%;
          overflow: auto;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        }

        .header {
          padding: 16px;
          border-bottom: 1px solid #ddd;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
        }

        .close:hover {
          color: #000;
        }

        .body {
          padding: 16px;
        }

        .footer {
          padding: 16px;
          border-top: 1px solid #ddd;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }
      </style>

      <div class="backdrop"></div>
      <div class="modal">
        <div class="header">
          <slot name="header">Modal Title</slot>
          <button class="close">&times;</button>
        </div>
        <div class="body">
          <slot></slot>
        </div>
        <div class="footer">
          <slot name="footer"></slot>
        </div>
      </div>
    `

    shadow.appendChild(template.content.cloneNode(true))
  }

  connectedCallback() {
    const shadow = this.shadowRoot!

    // 閉じるボタン
    shadow.querySelector('.close')?.addEventListener('click', () => {
      this.close()
    })

    // バックドロップクリック
    shadow.querySelector('.backdrop')?.addEventListener('click', () => {
      this.close()
    })

    // ESCキー
    this.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.close()
      }
    })
  }

  open() {
    this.setAttribute('open', '')
    this.dispatchEvent(new Event('modal-open'))
  }

  close() {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('modal-close'))
  }
}

customElements.define('modal-dialog', ModalDialog)
```

```html
<!-- 使用例 -->
<button id="open-modal">Open Modal</button>

<modal-dialog id="my-modal">
  <h2 slot="header">Confirmation</h2>

  <p>Are you sure you want to continue?</p>

  <div slot="footer">
    <button id="cancel">Cancel</button>
    <button id="confirm">Confirm</button>
  </div>
</modal-dialog>

<script>
  const modal = document.getElementById('my-modal')

  document.getElementById('open-modal').addEventListener('click', () => {
    modal.open()
  })

  document.getElementById('cancel').addEventListener('click', () => {
    modal.close()
  })

  document.getElementById('confirm').addEventListener('click', () => {
    console.log('Confirmed')
    modal.close()
  })
</script>
```

### トースト通知

```typescript
// toast-notification.ts

class ToastNotification extends HTMLElement {
  private timeoutId?: number

  constructor() {
    super()

    const shadow = this.attachShadow({ mode: 'open' })

    const template = document.createElement('template')
    template.innerHTML = `
      <style>
        :host {
          position: fixed;
          bottom: 20px;
          right: 20px;
          min-width: 300px;
          max-width: 500px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          opacity: 0;
          transform: translateX(400px);
          transition: all 0.3s;
          z-index: 9999;
        }

        :host([show]) {
          opacity: 1;
          transform: translateX(0);
        }

        :host([type="success"]) .icon {
          color: #28a745;
        }

        :host([type="error"]) .icon {
          color: #dc3545;
        }

        :host([type="warning"]) .icon {
          color: #ffc107;
        }

        :host([type="info"]) .icon {
          color: #17a2b8;
        }

        .icon {
          font-size: 24px;
          flex-shrink: 0;
        }

        .content {
          flex: 1;
        }

        .close {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #666;
          flex-shrink: 0;
        }
      </style>

      <div class="icon"></div>
      <div class="content">
        <slot></slot>
      </div>
      <button class="close">&times;</button>
    `

    shadow.appendChild(template.content.cloneNode(true))
  }

  static get observedAttributes() {
    return ['type', 'duration']
  }

  connectedCallback() {
    const shadow = this.shadowRoot!

    // アイコン設定
    const type = this.getAttribute('type') || 'info'
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
    }

    const icon = shadow.querySelector('.icon')
    if (icon) icon.textContent = icons[type as keyof typeof icons] || icons.info

    // 閉じるボタン
    shadow.querySelector('.close')?.addEventListener('click', () => {
      this.hide()
    })

    // 自動非表示
    const duration = parseInt(this.getAttribute('duration') || '3000')
    if (duration > 0) {
      this.timeoutId = setTimeout(() => {
        this.hide()
      }, duration) as unknown as number
    }
  }

  disconnectedCallback() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
    }
  }

  show() {
    this.setAttribute('show', '')
  }

  hide() {
    this.removeAttribute('show')
    setTimeout(() => {
      this.remove()
    }, 300)
  }
}

customElements.define('toast-notification', ToastNotification)

// ヘルパー関数
function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 3000) {
  const toast = document.createElement('toast-notification')
  toast.setAttribute('type', type)
  toast.setAttribute('duration', duration.toString())
  toast.textContent = message
  document.body.appendChild(toast)

  // 少し遅延させてアニメーション発火
  requestAnimationFrame(() => {
    toast.show()
  })
}
```

```html
<!-- 使用例 -->
<button onclick="showToast('Success!', 'success')">Show Success</button>
<button onclick="showToast('Error occurred', 'error')">Show Error</button>
<button onclick="showToast('Warning message', 'warning')">Show Warning</button>
<button onclick="showToast('Information', 'info')">Show Info</button>
```

### アコーディオン

```typescript
// accordion-item.ts

class AccordionItem extends HTMLElement {
  constructor() {
    super()

    const shadow = this.attachShadow({ mode: 'open' })

    const template = document.createElement('template')
    template.innerHTML = `
      <style>
        :host {
          display: block;
          border: 1px solid #ddd;
          border-radius: 4px;
          margin-bottom: 8px;
        }

        .header {
          padding: 16px;
          background: #f8f9fa;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          user-select: none;
        }

        .header:hover {
          background: #e9ecef;
        }

        .icon {
          transition: transform 0.3s;
        }

        :host([open]) .icon {
          transform: rotate(180deg);
        }

        .content {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease-out;
        }

        :host([open]) .content {
          max-height: 1000px;
        }

        .content-inner {
          padding: 16px;
        }
      </style>

      <div class="header">
        <slot name="header">Accordion Item</slot>
        <span class="icon">▼</span>
      </div>
      <div class="content">
        <div class="content-inner">
          <slot></slot>
        </div>
      </div>
    `

    shadow.appendChild(template.content.cloneNode(true))
  }

  connectedCallback() {
    const shadow = this.shadowRoot!

    shadow.querySelector('.header')?.addEventListener('click', () => {
      this.toggle()
    })
  }

  toggle() {
    if (this.hasAttribute('open')) {
      this.removeAttribute('open')
      this.dispatchEvent(new Event('accordion-close'))
    } else {
      this.setAttribute('open', '')
      this.dispatchEvent(new Event('accordion-open'))
    }
  }
}

customElements.define('accordion-item', AccordionItem)
```

```html
<!-- 使用例 -->
<accordion-item>
  <span slot="header">Section 1</span>
  <p>Content for section 1...</p>
</accordion-item>

<accordion-item open>
  <span slot="header">Section 2</span>
  <p>Content for section 2...</p>
</accordion-item>

<accordion-item>
  <span slot="header">Section 3</span>
  <p>Content for section 3...</p>
</accordion-item>
```

## TypeScript型定義

```typescript
// types.ts

// カスタムエレメントの型定義
declare global {
  interface HTMLElementTagNameMap {
    'my-button': MyButton
    'user-card': UserCard
    'shadow-button': ShadowButton
    'card-component': CardComponent
    'tabs-component': TabsComponent
    'product-card': ProductCard
    'modal-dialog': ModalDialog
    'toast-notification': ToastNotification
    'accordion-item': AccordionItem
  }
}

// 属性の型定義
interface UserCardAttributes {
  name: string
  email: string
  avatar?: string
}

// イベントの型定義
interface MyButtonClickEvent extends CustomEvent {
  detail: {
    timestamp: number
  }
}

// React用の型定義（JSX）
declare namespace JSX {
  interface IntrinsicElements {
    'my-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>
    'user-card': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & UserCardAttributes,
      HTMLElement
    >
  }
}
```

## フレームワーク統合

### React

```tsx
// React コンポーネントとして使用

import React, { useRef, useEffect } from 'react'
import './my-button' // Web Component をインポート

interface MyButtonProps {
  onClick?: (e: CustomEvent) => void
  children?: React.ReactNode
}

export function MyButtonWrapper({ onClick, children }: MyButtonProps) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = ref.current
    if (element && onClick) {
      element.addEventListener('my-click', onClick as EventListener)
      return () => {
        element.removeEventListener('my-click', onClick as EventListener)
      }
    }
  }, [onClick])

  return <my-button ref={ref}>{children}</my-button>
}

// 使用例
function App() {
  return (
    <div>
      <MyButtonWrapper onClick={(e) => console.log(e.detail)}>
        Click Me
      </MyButtonWrapper>
    </div>
  )
}
```

### Vue

```vue
<!-- Vue コンポーネントとして使用 -->
<template>
  <my-button @my-click="handleClick">
    {{ label }}
  </my-button>
</template>

<script setup lang="ts">
import './my-button' // Web Component をインポート

const props = defineProps<{
  label: string
}>()

const handleClick = (e: CustomEvent) => {
  console.log('Clicked:', e.detail)
}
</script>
```

### Angular

```typescript
// app.module.ts
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core'

@NgModule({
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // Web Components を許可
})
export class AppModule {}
```

```html
<!-- app.component.html -->
<my-button (my-click)="handleClick($event)">
  Click Me
</my-button>
```

## パフォーマンス最適化

### 遅延読み込み

```typescript
// lazy-load-component.ts

class LazyImage extends HTMLElement {
  private observer?: IntersectionObserver

  connectedCallback() {
    // Intersection Observer でビューポート内に入ったら読み込み
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          this.loadImage()
          this.observer?.disconnect()
        }
      })
    })

    this.observer.observe(this)
  }

  disconnectedCallback() {
    this.observer?.disconnect()
  }

  loadImage() {
    const src = this.getAttribute('data-src')
    if (src) {
      const img = document.createElement('img')
      img.src = src
      img.alt = this.getAttribute('alt') || ''
      this.appendChild(img)
    }
  }
}

customElements.define('lazy-image', LazyImage)
```

### 仮想スクロール

```typescript
// virtual-list.ts

class VirtualList extends HTMLElement {
  private items: any[] = []
  private itemHeight = 50
  private visibleCount = 10
  private scrollTop = 0

  constructor() {
    super()

    const shadow = this.attachShadow({ mode: 'open' })

    const template = document.createElement('template')
    template.innerHTML = `
      <style>
        :host {
          display: block;
          height: 500px;
          overflow-y: auto;
          position: relative;
        }

        .viewport {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
        }

        .item {
          height: ${this.itemHeight}px;
          border-bottom: 1px solid #ddd;
          padding: 12px;
        }
      </style>

      <div class="viewport"></div>
    `

    shadow.appendChild(template.content.cloneNode(true))
  }

  connectedCallback() {
    this.addEventListener('scroll', () => {
      this.scrollTop = this.scrollTop
      this.render()
    })
  }

  setItems(items: any[]) {
    this.items = items
    this.render()
  }

  render() {
    const shadow = this.shadowRoot!
    const viewport = shadow.querySelector('.viewport') as HTMLElement

    const startIndex = Math.floor(this.scrollTop / this.itemHeight)
    const endIndex = Math.min(startIndex + this.visibleCount, this.items.length)

    viewport.style.height = `${this.items.length * this.itemHeight}px`
    viewport.style.paddingTop = `${startIndex * this.itemHeight}px`

    viewport.innerHTML = this.items
      .slice(startIndex, endIndex)
      .map(item => `<div class="item">${item}</div>`)
      .join('')
  }
}

customElements.define('virtual-list', VirtualList)
```

## まとめ

Web Componentsは、フレームワークに依存しない標準的なコンポーネント開発手法です。

**主な利点**
- フレームワーク非依存（React、Vue、Angularで使用可能）
- 完全なカプセル化（Shadow DOM）
- ブラウザ標準API（ポリフィル不要）
- 長期的な安定性

**適用場面**
- デザインシステム・UIライブラリ
- マイクロフロントエンド
- レガシーシステムへの段階的導入
- フレームワーク間での再利用

**注意点**
- SEOに注意（Shadow DOMは検索エンジンに見えにくい）
- フレームワークの状態管理との統合が必要
- IE11非対応（モダンブラウザのみ）

2026年現在、主要ブラウザでWeb Componentsは完全サポートされており、本番環境での採用事例も増加しています。

**参考リンク**
- [MDN Web Components](https://developer.mozilla.org/en-US/docs/Web/Web_Components)
- [web.dev Custom Elements](https://web.dev/custom-elements-v1/)
- [lit.dev](https://lit.dev/) - Web Components開発ライブラリ

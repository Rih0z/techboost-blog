---
title: 'View Transitions API完全ガイド2026'
description: 'View Transitions APIを徹底解説。ページ遷移アニメーション、SPA/MPA対応、クロスドキュメントトランジション、Next.js統合、パフォーマンス最適化を実例付きで紹介。JavaScript・CSS・Web APIに関する実践情報。'
pubDate: '2026-02-05'
tags: ['JavaScript', 'CSS', 'Web API', 'アニメーション']
heroImage: '../../assets/thumbnails/view-transitions-api-guide.jpg'
---

View Transitions APIは、ページ遷移やDOM更新時にスムーズなアニメーションを実現する標準APIです。本記事では、基本から応用までを網羅的に解説します。

## 目次

1. View Transitions APIとは
2. 基本的な使い方
3. SPA（Single Page Application）での使用
4. MPA（Multi Page Application）での使用
5. クロスドキュメントトランジション
6. カスタムアニメーション
7. Next.js統合
8. パフォーマンス最適化
9. 実践パターン

## View Transitions APIとは

### 基本概念

```typescript
/**
 * View Transitions API の特徴
 *
 * 1. スムーズなページ遷移
 *    - DOM更新時の自動アニメーション
 *    - 要素間の位置・サイズ変化を補間
 *
 * 2. SPA/MPA両対応
 *    - 同一ドキュメント内の遷移
 *    - クロスドキュメント遷移（MPA）
 *
 * 3. カスタマイズ可能
 *    - CSS でアニメーション制御
 *    - JavaScript で動的制御
 *
 * 4. パフォーマンス
 *    - GPU 加速
 *    - 自動最適化
 */

// 最もシンプルな例
function updateView() {
  document.startViewTransition(() => {
    // DOM を更新
    document.querySelector('#content').textContent = '新しいコンテンツ'
  })
}
```

### ブラウザサポート

```typescript
// サポート検出
function supportsViewTransitions(): boolean {
  return 'startViewTransition' in document
}

// フォールバック付き実装
function safeViewTransition(callback: () => void): void {
  if (supportsViewTransitions()) {
    document.startViewTransition(callback)
  } else {
    callback()
  }
}
```

## 基本的な使い方

### シンプルなトランジション

```typescript
// 基本形
async function simpleTransition() {
  const transition = document.startViewTransition(() => {
    // DOM 更新処理
    document.getElementById('main').innerHTML = `
      <h1>新しいページ</h1>
      <p>コンテンツが更新されました</p>
    `
  })

  // トランジション完了を待つ
  await transition.finished
  console.log('トランジション完了')
}

// ready と finished の違い
async function transitionLifecycle() {
  const transition = document.startViewTransition(() => {
    updateDOM()
  })

  // ready: 古いスナップショット取得完了
  await transition.ready
  console.log('アニメーション開始準備完了')

  // finished: アニメーション完了
  await transition.finished
  console.log('アニメーション完了')
}
```

### デフォルトアニメーション

```css
/* ブラウザのデフォルトアニメーション */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.3s;
  animation-timing-function: ease;
}

/* 古いビュー（フェードアウト） */
::view-transition-old(root) {
  animation-name: -ua-view-transition-fade-out;
}

/* 新しいビュー（フェードイン） */
::view-transition-new(root) {
  animation-name: -ua-view-transition-fade-in;
}
```

### カスタムアニメーション

```css
/* スライドトランジション */
@keyframes slide-out {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(-100%);
    opacity: 0;
  }
}

@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

::view-transition-old(root) {
  animation: slide-out 0.3s ease-out;
}

::view-transition-new(root) {
  animation: slide-in 0.3s ease-out;
}
```

## SPA（Single Page Application）での使用

### ルーティングとの統合

```typescript
// シンプルなルーター
class ViewTransitionRouter {
  private routes = new Map<string, () => void>()

  register(path: string, handler: () => void): void {
    this.routes.set(path, handler)
  }

  async navigate(path: string): Promise<void> {
    const handler = this.routes.get(path)
    if (!handler) {
      console.error(`Route not found: ${path}`)
      return
    }

    // View Transition を使用してナビゲート
    const transition = document.startViewTransition(() => {
      handler()
      // URL 更新
      history.pushState(null, '', path)
    })

    await transition.finished
  }
}

// 使用例
const router = new ViewTransitionRouter()

router.register('/', () => {
  document.getElementById('app')!.innerHTML = '<h1>ホーム</h1>'
})

router.register('/about', () => {
  document.getElementById('app')!.innerHTML = '<h1>About</h1>'
})

// ナビゲーション
document.querySelectorAll('a[data-link]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault()
    const href = (e.currentTarget as HTMLAnchorElement).getAttribute('href')!
    router.navigate(href)
  })
})
```

### 名前付きトランジション

```typescript
// 特定の要素をアニメーション
function setupNamedTransition() {
  const items = document.querySelectorAll('.item')

  items.forEach((item, index) => {
    // view-transition-name を動的に設定
    ;(item as HTMLElement).style.viewTransitionName = `item-${index}`
  })

  // トランジション実行
  document.startViewTransition(() => {
    // アイテムを並び替え
    const container = document.querySelector('.container')!
    const shuffled = Array.from(items).sort(() => Math.random() - 0.5)
    shuffled.forEach(item => container.appendChild(item))
  })
}
```

```css
/* 各アイテムに個別のアニメーション */
::view-transition-old(item-0),
::view-transition-new(item-0) {
  animation-duration: 0.5s;
}

/* 位置とサイズの変化を自動補間 */
::view-transition-group(item-0) {
  animation-timing-function: ease-in-out;
}
```

### リスト遷移

```typescript
class AnimatedList {
  constructor(private container: HTMLElement) {}

  async addItem(content: string): Promise<void> {
    const transition = document.startViewTransition(() => {
      const item = document.createElement('div')
      item.className = 'list-item'
      item.textContent = content

      // 一意の view-transition-name を設定
      item.style.viewTransitionName = `item-${Date.now()}`

      this.container.appendChild(item)
    })

    await transition.finished
  }

  async removeItem(item: HTMLElement): Promise<void> {
    const transition = document.startViewTransition(() => {
      item.remove()
    })

    await transition.finished
  }

  async reorder(newOrder: HTMLElement[]): Promise<void> {
    const transition = document.startViewTransition(() => {
      newOrder.forEach(item => this.container.appendChild(item))
    })

    await transition.finished
  }
}

// 使用例
const list = new AnimatedList(document.querySelector('.list')!)

// アイテム追加
await list.addItem('新しいアイテム')

// アイテム削除
const item = document.querySelector('.list-item')!
await list.removeItem(item as HTMLElement)
```

```css
/* リストアイテムのトランジション */
.list-item {
  view-transition-name: auto;
}

::view-transition-old(.list-item),
::view-transition-new(.list-item) {
  animation-duration: 0.3s;
  animation-timing-function: ease-in-out;
}

/* 追加アニメーション */
@keyframes item-add {
  from {
    opacity: 0;
    transform: scale(0.8) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* 削除アニメーション */
@keyframes item-remove {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.8);
  }
}
```

## MPA（Multi Page Application）での使用

### クロスドキュメントトランジション

```html
<!-- ページ1: index.html -->
<!DOCTYPE html>
<html>
<head>
  <meta name="view-transition" content="same-origin" />
  <style>
    /* トランジションスタイル */
    ::view-transition-old(root) {
      animation: slide-out 0.3s ease-out;
    }

    ::view-transition-new(root) {
      animation: slide-in 0.3s ease-out;
    }
  </style>
</head>
<body>
  <img src="hero.jpg" style="view-transition-name: hero-image" />
  <a href="detail.html">詳細を見る</a>
</body>
</html>
```

```html
<!-- ページ2: detail.html -->
<!DOCTYPE html>
<html>
<head>
  <meta name="view-transition" content="same-origin" />
  <style>
    /* 同じトランジションスタイル */
  </style>
</head>
<body>
  <img src="hero.jpg" style="view-transition-name: hero-image" />
  <h1>詳細ページ</h1>
  <a href="index.html">戻る</a>
</body>
</html>
```

### プログレッシブエンハンスメント

```typescript
// クロスドキュメントトランジションのサポート検出
function supportsCrossDocumentTransitions(): boolean {
  return (
    'startViewTransition' in document &&
    'navigation' in window &&
    'types' in Navigation.prototype
  )
}

// インターセプト実装
if (supportsCrossDocumentTransitions()) {
  navigation.addEventListener('navigate', (e) => {
    // 外部リンクは除外
    if (e.destination.url.startsWith(location.origin)) {
      e.intercept({
        handler: async () => {
          const response = await fetch(e.destination.url)
          const html = await response.text()

          // View Transition でページ更新
          document.startViewTransition(() => {
            document.documentElement.innerHTML = html
          })
        }
      })
    }
  })
}
```

### 共有要素のトランジション

```typescript
// 画像ギャラリーの実装
class Gallery {
  setupTransitions(): void {
    document.querySelectorAll('.gallery-item').forEach((item, index) => {
      const img = item.querySelector('img') as HTMLElement
      // 一意の名前を設定
      img.style.viewTransitionName = `gallery-${index}`

      item.addEventListener('click', () => {
        this.openDetail(index)
      })
    })
  }

  async openDetail(index: number): Promise<void> {
    const transition = document.startViewTransition(async () => {
      // 詳細ビューに遷移
      const response = await fetch(`/detail/${index}`)
      const html = await response.text()
      document.body.innerHTML = html
    })

    await transition.finished
  }
}
```

```css
/* ギャラリー共有要素 */
[style*="view-transition-name: gallery-"] {
  contain: layout;
}

::view-transition-group(gallery-0),
::view-transition-group(gallery-1),
::view-transition-group(gallery-2) {
  animation-duration: 0.4s;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
```

## クロスドキュメントトランジション

### Navigation APIとの統合

```typescript
// 完全なクロスドキュメント実装
class CrossDocumentRouter {
  constructor() {
    if (!('navigation' in window)) {
      console.warn('Navigation API not supported')
      return
    }

    this.setupInterception()
  }

  private setupInterception(): void {
    navigation.addEventListener('navigate', (e) => {
      // 外部リンク、新しいタブ、フォーム送信は除外
      if (
        !e.canIntercept ||
        e.hashChange ||
        e.downloadRequest ||
        e.formData
      ) {
        return
      }

      e.intercept({
        handler: () => this.handleNavigation(e.destination.url)
      })
    })
  }

  private async handleNavigation(url: string): Promise<void> {
    try {
      // ページをフェッチ
      const response = await fetch(url)
      const html = await response.text()

      // View Transition でページ更新
      const transition = document.startViewTransition(() => {
        this.updateDOM(html)
      })

      await transition.ready
      console.log('Transition started')

      await transition.finished
      console.log('Transition finished')

    } catch (error) {
      console.error('Navigation failed:', error)
      // フォールバック: 通常のナビゲーション
      window.location.href = url
    }
  }

  private updateDOM(html: string): void {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    // title 更新
    document.title = doc.title

    // body 更新
    document.body = doc.body

    // scripts 再実行
    this.executeScripts(doc)
  }

  private executeScripts(doc: Document): void {
    const scripts = doc.querySelectorAll('script')
    scripts.forEach(script => {
      const newScript = document.createElement('script')
      newScript.textContent = script.textContent
      document.head.appendChild(newScript)
    })
  }
}

// 初期化
new CrossDocumentRouter()
```

### 条件付きトランジション

```typescript
// ナビゲーション方向によるアニメーション変更
class DirectionalTransition {
  private direction: 'forward' | 'back' = 'forward'

  navigate(url: string, direction: 'forward' | 'back'): void {
    this.direction = direction

    // data 属性でアニメーション制御
    document.documentElement.dataset.transitionDirection = direction

    const transition = document.startViewTransition(async () => {
      const html = await this.fetchPage(url)
      this.updatePage(html)
    })

    transition.finished.then(() => {
      delete document.documentElement.dataset.transitionDirection
    })
  }

  private async fetchPage(url: string): Promise<string> {
    const response = await fetch(url)
    return response.text()
  }

  private updatePage(html: string): void {
    document.body.innerHTML = html
  }
}
```

```css
/* 方向によるアニメーション変更 */
/* 前進 */
[data-transition-direction="forward"] {
  ::view-transition-old(root) {
    animation: slide-out-left 0.3s ease-out;
  }

  ::view-transition-new(root) {
    animation: slide-in-right 0.3s ease-out;
  }
}

/* 後退 */
[data-transition-direction="back"] {
  ::view-transition-old(root) {
    animation: slide-out-right 0.3s ease-out;
  }

  ::view-transition-new(root) {
    animation: slide-in-left 0.3s ease-out;
  }
}

@keyframes slide-out-left {
  to { transform: translateX(-100%); }
}

@keyframes slide-in-right {
  from { transform: translateX(100%); }
}

@keyframes slide-out-right {
  to { transform: translateX(100%); }
}

@keyframes slide-in-left {
  from { transform: translateX(-100%); }
}
```

## カスタムアニメーション

### 複雑なトランジション

```typescript
// カスタムアニメーションコントローラー
class TransitionController {
  async executeCustomTransition(
    callback: () => void,
    config: {
      duration?: number
      easing?: string
      animationType?: 'fade' | 'slide' | 'scale' | 'flip'
    } = {}
  ): Promise<void> {
    const {
      duration = 300,
      easing = 'ease-in-out',
      animationType = 'fade'
    } = config

    // CSS 変数で設定を注入
    document.documentElement.style.setProperty('--transition-duration', `${duration}ms`)
    document.documentElement.style.setProperty('--transition-easing', easing)
    document.documentElement.dataset.transitionType = animationType

    const transition = document.startViewTransition(callback)

    await transition.finished

    // クリーンアップ
    delete document.documentElement.dataset.transitionType
  }
}
```

```css
/* CSS変数を使用した動的アニメーション */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: var(--transition-duration, 300ms);
  animation-timing-function: var(--transition-easing, ease);
}

/* フェード */
[data-transition-type="fade"] {
  ::view-transition-old(root) {
    animation-name: fade-out;
  }

  ::view-transition-new(root) {
    animation-name: fade-in;
  }
}

/* スライド */
[data-transition-type="slide"] {
  ::view-transition-old(root) {
    animation-name: slide-out;
  }

  ::view-transition-new(root) {
    animation-name: slide-in;
  }
}

/* スケール */
[data-transition-type="scale"] {
  ::view-transition-old(root) {
    animation-name: scale-out;
  }

  ::view-transition-new(root) {
    animation-name: scale-in;
  }
}

/* フリップ */
[data-transition-type="flip"] {
  ::view-transition-old(root) {
    animation-name: flip-out;
  }

  ::view-transition-new(root) {
    animation-name: flip-in;
  }
}

@keyframes fade-out {
  to { opacity: 0; }
}

@keyframes fade-in {
  from { opacity: 0; }
}

@keyframes slide-out {
  to { transform: translateX(-100%); }
}

@keyframes slide-in {
  from { transform: translateX(100%); }
}

@keyframes scale-out {
  to { transform: scale(0.8); opacity: 0; }
}

@keyframes scale-in {
  from { transform: scale(0.8); opacity: 0; }
}

@keyframes flip-out {
  to { transform: rotateY(90deg); opacity: 0; }
}

@keyframes flip-in {
  from { transform: rotateY(-90deg); opacity: 0; }
}
```

### モーフィングトランジション

```typescript
// 要素間のモーフィング
class MorphTransition {
  async morph(
    fromElement: HTMLElement,
    toElement: HTMLElement
  ): Promise<void> {
    // 共通の view-transition-name を設定
    const transitionName = `morph-${Date.now()}`
    fromElement.style.viewTransitionName = transitionName
    toElement.style.viewTransitionName = transitionName

    const transition = document.startViewTransition(() => {
      // fromElement を非表示
      fromElement.style.display = 'none'
      // toElement を表示
      toElement.style.display = 'block'
    })

    await transition.finished

    // クリーンアップ
    fromElement.style.viewTransitionName = ''
    toElement.style.viewTransitionName = ''
  }
}

// 使用例: サムネイルから詳細画像へ
const morph = new MorphTransition()
const thumbnail = document.querySelector('.thumbnail') as HTMLElement
const fullImage = document.querySelector('.full-image') as HTMLElement

await morph.morph(thumbnail, fullImage)
```

## Next.js統合

### App Routerでの実装

```typescript
// app/components/ViewTransitionLink.tsx
'use client'

import { useRouter } from 'next/navigation'
import { startTransition } from 'react'

interface ViewTransitionLinkProps {
  href: string
  children: React.ReactNode
  className?: string
}

export function ViewTransitionLink({
  href,
  children,
  className
}: ViewTransitionLinkProps) {
  const router = useRouter()

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()

    if (!document.startViewTransition) {
      // フォールバック
      router.push(href)
      return
    }

    document.startViewTransition(() => {
      startTransition(() => {
        router.push(href)
      })
    })
  }

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  )
}
```

### カスタムフック

```typescript
// hooks/useViewTransition.ts
'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

export function useViewTransition() {
  const router = useRouter()

  const navigate = useCallback(
    (href: string) => {
      if (!document.startViewTransition) {
        router.push(href)
        return
      }

      document.startViewTransition(() => {
        router.push(href)
      })
    },
    [router]
  )

  return { navigate }
}

// 使用例
function MyComponent() {
  const { navigate } = useViewTransition()

  return (
    <button onClick={() => navigate('/about')}>
      Aboutへ移動
    </button>
  )
}
```

### レイアウトでの設定

```typescript
// app/layout.tsx
import './globals.css'

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <head>
        <meta name="view-transition" content="same-origin" />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

```css
/* globals.css */
/* デフォルトトランジション */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.3s;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

::view-transition-old(root) {
  animation-name: fade-out;
}

::view-transition-new(root) {
  animation-name: fade-in;
}

@keyframes fade-out {
  to {
    opacity: 0;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}
```

## パフォーマンス最適化

### スナップショットの最適化

```typescript
// 大きな要素のスナップショットを回避
class OptimizedTransition {
  async transition(callback: () => void): Promise<void> {
    // 重い要素を一時的に非表示
    const heavyElements = document.querySelectorAll('.heavy-content')
    heavyElements.forEach(el => {
      (el as HTMLElement).style.viewTransitionName = 'none'
    })

    const transition = document.startViewTransition(callback)

    await transition.finished

    // 復元
    heavyElements.forEach(el => {
      (el as HTMLElement).style.viewTransitionName = ''
    })
  }
}
```

### 条件付きトランジション

```typescript
// デバイスやネットワーク状態に応じて制御
class AdaptiveTransition {
  private shouldUseTransition(): boolean {
    // Reduced motion 設定をチェック
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (prefersReducedMotion) return false

    // デバイス性能をチェック
    const connection = (navigator as any).connection
    if (connection?.effectiveType === '2g') return false

    return true
  }

  async navigate(callback: () => void): Promise<void> {
    if (this.shouldUseTransition()) {
      const transition = document.startViewTransition(callback)
      await transition.finished
    } else {
      callback()
    }
  }
}
```

### メモリ管理

```typescript
// トランジション中のメモリリーク防止
class SafeTransition {
  private activeTransition: ViewTransition | null = null

  async execute(callback: () => void): Promise<void> {
    // 既存のトランジションをキャンセル
    if (this.activeTransition) {
      this.activeTransition.skipTransition()
    }

    this.activeTransition = document.startViewTransition(callback)

    try {
      await this.activeTransition.finished
    } finally {
      this.activeTransition = null
    }
  }
}
```

## 実践パターン

### ダッシュボード遷移

```typescript
// ダッシュボードビュー切り替え
class DashboardTransition {
  private currentView: string = 'overview'

  async switchView(newView: string): Promise<void> {
    if (this.currentView === newView) return

    // ビューの方向を検出
    const views = ['overview', 'analytics', 'settings']
    const fromIndex = views.indexOf(this.currentView)
    const toIndex = views.indexOf(newView)
    const direction = toIndex > fromIndex ? 'forward' : 'back'

    document.documentElement.dataset.transitionDirection = direction

    const transition = document.startViewTransition(() => {
      this.updateView(newView)
    })

    await transition.finished

    this.currentView = newView
    delete document.documentElement.dataset.transitionDirection
  }

  private updateView(view: string): void {
    // ビューコンテンツ更新
    const container = document.querySelector('.dashboard-content')!
    container.innerHTML = this.getViewContent(view)
  }

  private getViewContent(view: string): string {
    // ビュー別コンテンツを返す
    return `<div class="view-${view}">...</div>`
  }
}
```

### モーダル遷移

```typescript
// スムーズなモーダル表示
class ModalTransition {
  async open(modalId: string): Promise<void> {
    const modal = document.getElementById(modalId)!

    // view-transition-name 設定
    modal.style.viewTransitionName = 'modal'

    const transition = document.startViewTransition(() => {
      modal.style.display = 'flex'
      document.body.style.overflow = 'hidden'
    })

    await transition.finished
  }

  async close(modalId: string): Promise<void> {
    const modal = document.getElementById(modalId)!

    const transition = document.startViewTransition(() => {
      modal.style.display = 'none'
      document.body.style.overflow = ''
    })

    await transition.finished
    modal.style.viewTransitionName = ''
  }
}
```

```css
/* モーダルトランジション */
::view-transition-old(modal),
::view-transition-new(modal) {
  animation-duration: 0.25s;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

::view-transition-old(modal) {
  animation-name: modal-fade-out;
}

::view-transition-new(modal) {
  animation-name: modal-fade-in;
}

@keyframes modal-fade-out {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.95);
  }
}

@keyframes modal-fade-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

### タブ切り替え

```typescript
// タブUIのトランジション
class TabTransition {
  async switchTab(fromTab: HTMLElement, toTab: HTMLElement): Promise<void> {
    // view-transition-name を設定
    fromTab.style.viewTransitionName = 'tab-content'
    toTab.style.viewTransitionName = 'tab-content'

    const transition = document.startViewTransition(() => {
      fromTab.hidden = true
      toTab.hidden = false
    })

    await transition.finished

    // クリーンアップ
    fromTab.style.viewTransitionName = ''
    toTab.style.viewTransitionName = ''
  }
}

// 使用例
const tabTransition = new TabTransition()

document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => {
    const tabId = button.getAttribute('data-tab')!
    const currentTab = document.querySelector('.tab-content:not([hidden])') as HTMLElement
    const nextTab = document.getElementById(tabId) as HTMLElement

    tabTransition.switchTab(currentTab, nextTab)
  })
})
```

## まとめ

View Transitions APIは、ページ遷移とDOM更新を劇的に改善する強力なツールです。

**主要ポイント**:

1. **シンプルなAPI**: `startViewTransition`で自動アニメーション
2. **SPA/MPA対応**: 両方のアーキテクチャで使用可能
3. **カスタマイズ可能**: CSS で柔軟にアニメーション制御
4. **パフォーマンス**: GPU加速で滑らかな遷移
5. **プログレッシブエンハンスメント**: フォールバック簡単

**2026年のベストプラクティス**:

- Reduced motion を尊重
- クロスドキュメントトランジションを活用
- Next.jsなどのフレームワークと統合
- パフォーマンス最適化を意識
- 名前付きトランジションで細かく制御

View Transitions APIを活用して、ユーザー体験を次のレベルへ引き上げましょう。

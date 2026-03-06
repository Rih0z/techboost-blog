---
title: 'Web Animations API完全ガイド2026'
description: 'Web Animations APIを徹底解説。CSSアニメーションの代替、JavaScriptによるタイムライン制御、スクロール連動アニメーション、パフォーマンス最適化を実例付きで紹介。JavaScript・CSS・アニメーションに関する実践情報。'
pubDate: 'Feb 05 2026'
tags: ['JavaScript', 'CSS', 'アニメーション', 'Web API']
---
# Web Animations API完全ガイド2026

Web Animations API（WAAPI）は、JavaScriptでアニメーションを制御できる標準APIです。本記事では、CSSアニメーションを超える柔軟な実装方法を解説します。

## 目次

1. Web Animations APIとは
2. 基本的な使い方
3. タイムライン制御
4. キーフレームアニメーション
5. スクロール連動アニメーション
6. パフォーマンス最適化
7. 実践パターン
8. ライブラリとの統合

## Web Animations APIとは

### 基本概念

```typescript
/**
 * Web Animations API の特徴
 *
 * 1. JavaScript制御
 *    - 動的なアニメーション生成
 *    - 再生速度の変更
 *    - 一時停止・再開
 *
 * 2. CSSアニメーションと同等のパフォーマンス
 *    - GPU加速
 *    - 合成スレッドで実行
 *
 * 3. タイムライン制御
 *    - 複数アニメーションの同期
 *    - スクロール連動
 *
 * 4. ブラウザサポート
 *    - 主要ブラウザで標準サポート
 */

// 基本的なアニメーション
const element = document.querySelector('.box')

const animation = element.animate(
  [
    { transform: 'translateX(0px)' },
    { transform: 'translateX(100px)' }
  ],
  {
    duration: 1000,
    iterations: 1,
    easing: 'ease-in-out'
  }
)
```

### CSSアニメーションとの比較

```typescript
// CSS アニメーション
// @keyframes slide {
//   from { transform: translateX(0); }
//   to { transform: translateX(100px); }
// }
// .box { animation: slide 1s ease-in-out; }

// Web Animations API（同等の効果）
element.animate(
  [
    { transform: 'translateX(0)' },
    { transform: 'translateX(100px)' }
  ],
  {
    duration: 1000,
    easing: 'ease-in-out',
    fill: 'forwards'
  }
)

// 利点: JavaScript制御
const animation = element.animate(/* ... */)

// 再生速度変更
animation.playbackRate = 0.5 // 半分の速度

// 一時停止
animation.pause()

// 再開
animation.play()

// 逆再生
animation.reverse()

// 特定の時刻にシーク
animation.currentTime = 500 // 500ms地点へ

// 完了を待つ
await animation.finished
console.log('アニメーション完了')
```

## 基本的な使い方

### 単純なアニメーション

```typescript
// 要素を取得
const box = document.querySelector<HTMLElement>('.box')!

// フェードイン
function fadeIn(element: HTMLElement, duration = 300) {
  return element.animate(
    [
      { opacity: 0 },
      { opacity: 1 }
    ],
    {
      duration,
      easing: 'ease-out',
      fill: 'forwards'
    }
  )
}

// フェードアウト
function fadeOut(element: HTMLElement, duration = 300) {
  return element.animate(
    [
      { opacity: 1 },
      { opacity: 0 }
    ],
    {
      duration,
      easing: 'ease-in',
      fill: 'forwards'
    }
  )
}

// 使用例
await fadeIn(box)
await new Promise(resolve => setTimeout(resolve, 1000))
await fadeOut(box)
```

### 複数プロパティのアニメーション

```typescript
function scaleAndRotate(element: HTMLElement) {
  return element.animate(
    [
      {
        transform: 'scale(1) rotate(0deg)',
        opacity: 1
      },
      {
        transform: 'scale(1.5) rotate(180deg)',
        opacity: 0.5,
        offset: 0.5 // 50%地点
      },
      {
        transform: 'scale(1) rotate(360deg)',
        opacity: 1
      }
    ],
    {
      duration: 2000,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
  )
}

// より複雑な例
function complexAnimation(element: HTMLElement) {
  return element.animate(
    [
      {
        transform: 'translateX(0) scale(1)',
        backgroundColor: '#3b82f6',
        borderRadius: '0%'
      },
      {
        transform: 'translateX(50px) scale(1.2)',
        backgroundColor: '#8b5cf6',
        borderRadius: '20%',
        offset: 0.3
      },
      {
        transform: 'translateX(100px) scale(1)',
        backgroundColor: '#ec4899',
        borderRadius: '50%',
        offset: 0.7
      },
      {
        transform: 'translateX(0) scale(1)',
        backgroundColor: '#3b82f6',
        borderRadius: '0%'
      }
    ],
    {
      duration: 3000,
      iterations: Infinity,
      direction: 'alternate',
      easing: 'ease-in-out'
    }
  )
}
```

### イージング関数

```typescript
// 標準イージング
const easings = {
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',

  // カスタム cubic-bezier
  custom: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',

  // ステップ
  steps: 'steps(5, end)'
}

// カスタムイージング関数を使用
element.animate(
  [
    { transform: 'translateY(0)' },
    { transform: 'translateY(-100px)' }
  ],
  {
    duration: 1000,
    easing: easings.custom
  }
)

// 物理ベースのイージング
function springEasing(t: number): number {
  const c1 = 1.70158
  const c2 = c1 * 1.525
  const c3 = c1 + 1

  if (t < 0.5) {
    return (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
  }

  return (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2
}
```

## タイムライン制御

### アニメーションの制御

```typescript
class AnimationController {
  private animation: Animation

  constructor(element: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
    this.animation = element.animate(keyframes, options)
    this.animation.pause() // 初期状態は停止
  }

  // 再生
  play() {
    this.animation.play()
  }

  // 一時停止
  pause() {
    this.animation.pause()
  }

  // 停止（最初に戻す）
  stop() {
    this.animation.cancel()
  }

  // 逆再生
  reverse() {
    this.animation.reverse()
  }

  // 速度変更
  setPlaybackRate(rate: number) {
    this.animation.playbackRate = rate
  }

  // 特定の時刻にシーク
  seek(timeMs: number) {
    this.animation.currentTime = timeMs
  }

  // 進行度を取得（0-1）
  getProgress(): number {
    const currentTime = this.animation.currentTime as number
    const duration = this.animation.effect?.getTiming().duration as number
    return currentTime / duration
  }

  // 完了を待つ
  async waitForFinish(): Promise<void> {
    await this.animation.finished
  }
}

// 使用例
const controller = new AnimationController(
  box,
  [
    { transform: 'translateX(0)' },
    { transform: 'translateX(200px)' }
  ],
  { duration: 2000, fill: 'forwards' }
)

// UIとの連携
playButton.addEventListener('click', () => controller.play())
pauseButton.addEventListener('click', () => controller.pause())
speedSlider.addEventListener('input', (e) => {
  controller.setPlaybackRate(parseFloat(e.target.value))
})
```

### 複数アニメーションの同期

```typescript
class AnimationTimeline {
  private animations: Animation[] = []

  add(animation: Animation): void {
    this.animations.push(animation)
  }

  // すべて再生
  playAll(): void {
    const startTime = document.timeline.currentTime
    this.animations.forEach(animation => {
      animation.startTime = startTime
      animation.play()
    })
  }

  // すべて一時停止
  pauseAll(): void {
    this.animations.forEach(animation => animation.pause())
  }

  // すべて停止
  stopAll(): void {
    this.animations.forEach(animation => animation.cancel())
  }

  // すべて完了を待つ
  async waitForAll(): Promise<void> {
    await Promise.all(this.animations.map(a => a.finished))
  }

  // 進行度を設定（0-1）
  setProgress(progress: number): void {
    this.animations.forEach(animation => {
      const duration = animation.effect?.getTiming().duration as number
      animation.currentTime = duration * progress
    })
  }
}

// 使用例: 複数要素の同期アニメーション
const timeline = new AnimationTimeline()

document.querySelectorAll('.box').forEach((box, index) => {
  const animation = box.animate(
    [
      { transform: 'translateY(0)' },
      { transform: 'translateY(100px)' }
    ],
    {
      duration: 1000,
      delay: index * 100, // 順番にアニメーション
      fill: 'forwards'
    }
  )

  timeline.add(animation)
})

timeline.playAll()
```

### シーケンシャルアニメーション

```typescript
async function sequentialAnimation(elements: HTMLElement[]): Promise<void> {
  for (const element of elements) {
    await element.animate(
      [
        { opacity: 0, transform: 'translateY(20px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ],
      {
        duration: 300,
        easing: 'ease-out',
        fill: 'forwards'
      }
    ).finished
  }
}

// 並列アニメーション
async function parallelAnimation(elements: HTMLElement[]): Promise<void> {
  const animations = elements.map(element =>
    element.animate(
      [
        { opacity: 0, transform: 'scale(0.8)' },
        { opacity: 1, transform: 'scale(1)' }
      ],
      {
        duration: 500,
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        fill: 'forwards'
      }
    )
  )

  await Promise.all(animations.map(a => a.finished))
}

// スタガーアニメーション
async function staggerAnimation(
  elements: HTMLElement[],
  staggerDelay = 50
): Promise<void> {
  const animations = elements.map((element, index) =>
    element.animate(
      [
        { opacity: 0, transform: 'translateX(-20px)' },
        { opacity: 1, transform: 'translateX(0)' }
      ],
      {
        duration: 400,
        delay: index * staggerDelay,
        easing: 'ease-out',
        fill: 'forwards'
      }
    )
  )

  await Promise.all(animations.map(a => a.finished))
}
```

## キーフレームアニメーション

### 動的キーフレーム生成

```typescript
// パスに沿ったアニメーション
function createPathAnimation(path: SVGPathElement): Keyframe[] {
  const length = path.getTotalLength()
  const steps = 100

  const keyframes: Keyframe[] = []

  for (let i = 0; i <= steps; i++) {
    const point = path.getPointAtLength((length * i) / steps)

    keyframes.push({
      transform: `translate(${point.x}px, ${point.y}px)`,
      offset: i / steps
    })
  }

  return keyframes
}

// 使用例
const path = document.querySelector<SVGPathElement>('#motion-path')!
const element = document.querySelector<HTMLElement>('.moving-box')!

const keyframes = createPathAnimation(path)
element.animate(keyframes, {
  duration: 3000,
  easing: 'linear',
  iterations: Infinity
})
```

### ランダムアニメーション

```typescript
function randomFloating(element: HTMLElement): Animation {
  const randomX = () => Math.random() * 100 - 50
  const randomY = () => Math.random() * 100 - 50

  return element.animate(
    [
      { transform: 'translate(0, 0)' },
      { transform: `translate(${randomX()}px, ${randomY()}px)`, offset: 0.25 },
      { transform: `translate(${randomX()}px, ${randomY()}px)`, offset: 0.5 },
      { transform: `translate(${randomX()}px, ${randomY()}px)`, offset: 0.75 },
      { transform: 'translate(0, 0)' }
    ],
    {
      duration: 5000,
      easing: 'ease-in-out',
      iterations: Infinity
    }
  )
}

// パーティクル効果
function createParticles(container: HTMLElement, count: number): void {
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div')
    particle.className = 'particle'

    const angle = Math.random() * Math.PI * 2
    const distance = Math.random() * 200 + 50

    const x = Math.cos(angle) * distance
    const y = Math.sin(angle) * distance

    container.appendChild(particle)

    particle.animate(
      [
        {
          transform: 'translate(0, 0) scale(1)',
          opacity: 1
        },
        {
          transform: `translate(${x}px, ${y}px) scale(0)`,
          opacity: 0
        }
      ],
      {
        duration: Math.random() * 1000 + 500,
        easing: 'ease-out',
        fill: 'forwards'
      }
    )
  }
}
```

## スクロール連動アニメーション

### Scroll-driven Animations

```typescript
// Scroll Timeline API（実験的）
if ('ScrollTimeline' in window) {
  const element = document.querySelector('.parallax')!

  const scrollTimeline = new ScrollTimeline({
    source: document.documentElement,
    orientation: 'block',
    scrollOffsets: [
      { target: element, edge: 'start', threshold: 0 },
      { target: element, edge: 'start', threshold: 1 }
    ]
  })

  element.animate(
    [
      { transform: 'translateY(0)' },
      { transform: 'translateY(-100px)' }
    ],
    {
      timeline: scrollTimeline,
      fill: 'both'
    }
  )
} else {
  // フォールバック: Intersection Observer
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        const progress = entry.intersectionRatio
        const element = entry.target as HTMLElement

        element.style.transform = `translateY(${-100 * progress}px)`
      })
    },
    { threshold: Array.from({ length: 101 }, (_, i) => i / 100) }
  )

  observer.observe(element)
}
```

### カスタムスクロールアニメーション

```typescript
class ScrollAnimation {
  private element: HTMLElement
  private animation: Animation | null = null

  constructor(
    element: HTMLElement,
    private keyframes: Keyframe[],
    private options: {
      start?: number // 開始位置（0-1）
      end?: number   // 終了位置（0-1）
    } = {}
  ) {
    this.element = element
    this.init()
  }

  private init(): void {
    this.animation = this.element.animate(this.keyframes, {
      duration: 1000,
      fill: 'both'
    })
    this.animation.pause()

    window.addEventListener('scroll', () => this.update(), { passive: true })
    this.update()
  }

  private update(): void {
    if (!this.animation) return

    const rect = this.element.getBoundingClientRect()
    const windowHeight = window.innerHeight

    // 要素の進行度を計算（0-1）
    const start = this.options.start ?? 0
    const end = this.options.end ?? 1

    const scrollProgress = 1 - (rect.top / windowHeight)
    const progress = Math.max(0, Math.min(1,
      (scrollProgress - start) / (end - start)
    ))

    // アニメーションの進行度を設定
    this.animation.currentTime = progress * 1000
  }
}

// 使用例
new ScrollAnimation(
  document.querySelector('.fade-in')!,
  [
    { opacity: 0, transform: 'translateY(50px)' },
    { opacity: 1, transform: 'translateY(0)' }
  ],
  { start: 0, end: 0.5 }
)
```

### パララックス効果

```typescript
class ParallaxLayer {
  constructor(
    private element: HTMLElement,
    private speed: number = 0.5
  ) {
    window.addEventListener('scroll', () => this.update(), { passive: true })
    this.update()
  }

  private update(): void {
    const scrollY = window.scrollY
    const offset = scrollY * this.speed

    this.element.animate(
      [
        { transform: this.element.style.transform || 'translateY(0)' },
        { transform: `translateY(${offset}px)` }
      ],
      {
        duration: 0,
        fill: 'forwards'
      }
    )
  }
}

// 使用例: 多層パララックス
document.querySelectorAll('[data-parallax]').forEach(element => {
  const speed = parseFloat(element.getAttribute('data-parallax') || '0.5')
  new ParallaxLayer(element as HTMLElement, speed)
})
```

## パフォーマンス最適化

### GPU加速の活用

```typescript
// ✅ GPU加速されるプロパティ
const gpuAccelerated = [
  'transform',
  'opacity'
]

// ❌ GPU加速されないプロパティ（避ける）
const notGpuAccelerated = [
  'width',
  'height',
  'left',
  'top',
  'margin',
  'padding'
]

// 良い例: transform使用
element.animate(
  [
    { transform: 'translateX(0)' },
    { transform: 'translateX(100px)' }
  ],
  { duration: 300 }
)

// 悪い例: left使用
element.animate(
  [
    { left: '0px' },
    { left: '100px' }
  ],
  { duration: 300 }
)
```

### will-changeの使用

```typescript
function performantAnimation(element: HTMLElement): void {
  // アニメーション前にwill-changeを設定
  element.style.willChange = 'transform, opacity'

  const animation = element.animate(
    [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(1.5)', opacity: 0 }
    ],
    { duration: 500 }
  )

  // アニメーション完了後にwill-changeを解除
  animation.finished.then(() => {
    element.style.willChange = 'auto'
  })
}
```

### リクエストアニメーションフレーム

```typescript
// 複数の要素をまとめて更新
class BatchAnimator {
  private pending = new Set<() => void>()
  private rafId: number | null = null

  schedule(callback: () => void): void {
    this.pending.add(callback)

    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => this.flush())
    }
  }

  private flush(): void {
    this.pending.forEach(callback => callback())
    this.pending.clear()
    this.rafId = null
  }
}

const batchAnimator = new BatchAnimator()

// 使用例
elements.forEach(element => {
  batchAnimator.schedule(() => {
    element.animate(/* ... */)
  })
})
```

## 実践パターン

### モーダルアニメーション

```typescript
class AnimatedModal {
  private modal: HTMLElement
  private backdrop: HTMLElement
  private isOpen = false

  constructor(modalId: string) {
    this.modal = document.getElementById(modalId)!
    this.backdrop = document.querySelector('.modal-backdrop')!
  }

  async open(): Promise<void> {
    if (this.isOpen) return

    this.modal.style.display = 'block'
    this.backdrop.style.display = 'block'

    await Promise.all([
      this.backdrop.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: 200, easing: 'ease-out', fill: 'forwards' }
      ).finished,

      this.modal.animate(
        [
          { transform: 'scale(0.9)', opacity: 0 },
          { transform: 'scale(1)', opacity: 1 }
        ],
        { duration: 300, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'forwards' }
      ).finished
    ])

    this.isOpen = true
  }

  async close(): Promise<void> {
    if (!this.isOpen) return

    await Promise.all([
      this.backdrop.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: 200, easing: 'ease-in', fill: 'forwards' }
      ).finished,

      this.modal.animate(
        [
          { transform: 'scale(1)', opacity: 1 },
          { transform: 'scale(0.9)', opacity: 0 }
        ],
        { duration: 200, easing: 'ease-in', fill: 'forwards' }
      ).finished
    ])

    this.modal.style.display = 'none'
    this.backdrop.style.display = 'none'
    this.isOpen = false
  }
}
```

### ページトランジション

```typescript
class PageTransition {
  async transition(
    fromPage: HTMLElement,
    toPage: HTMLElement
  ): Promise<void> {
    // 退場アニメーション
    await fromPage.animate(
      [
        { opacity: 1, transform: 'translateX(0)' },
        { opacity: 0, transform: 'translateX(-100px)' }
      ],
      { duration: 300, easing: 'ease-in', fill: 'forwards' }
    ).finished

    fromPage.style.display = 'none'
    toPage.style.display = 'block'

    // 入場アニメーション
    await toPage.animate(
      [
        { opacity: 0, transform: 'translateX(100px)' },
        { opacity: 1, transform: 'translateX(0)' }
      ],
      { duration: 300, easing: 'ease-out', fill: 'forwards' }
    ).finished
  }
}
```

### ローディングアニメーション

```typescript
class LoadingSpinner {
  private container: HTMLElement

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!
    this.createSpinner()
  }

  private createSpinner(): void {
    const spinner = document.createElement('div')
    spinner.className = 'spinner'

    // 回転アニメーション
    spinner.animate(
      [
        { transform: 'rotate(0deg)' },
        { transform: 'rotate(360deg)' }
      ],
      {
        duration: 1000,
        iterations: Infinity,
        easing: 'linear'
      }
    )

    this.container.appendChild(spinner)
  }

  show(): void {
    this.container.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: 200, fill: 'forwards' }
    )
  }

  hide(): void {
    this.container.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: 200, fill: 'forwards' }
    )
  }
}
```

## ライブラリとの統合

### React統合

```typescript
import { useRef, useEffect } from 'react'

function useAnimation(
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions
) {
  const ref = useRef<HTMLElement>(null)
  const animationRef = useRef<Animation>()

  useEffect(() => {
    if (!ref.current) return

    animationRef.current = ref.current.animate(keyframes, options)

    return () => {
      animationRef.current?.cancel()
    }
  }, [keyframes, options])

  return {
    ref,
    play: () => animationRef.current?.play(),
    pause: () => animationRef.current?.pause(),
    reverse: () => animationRef.current?.reverse()
  }
}

// 使用例
function AnimatedBox() {
  const { ref, play, pause } = useAnimation(
    [
      { transform: 'translateX(0)' },
      { transform: 'translateX(100px)' }
    ],
    { duration: 1000, fill: 'forwards' }
  )

  return (
    <div>
      <div ref={ref} className="box" />
      <button onClick={play}>Play</button>
      <button onClick={pause}>Pause</button>
    </div>
  )
}
```

### Framer Motionとの比較

```typescript
// Framer Motion
import { motion } from 'framer-motion'

function FramerExample() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      Content
    </motion.div>
  )
}

// Web Animations API（同等の実装）
function WAAPIExample() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: 300, fill: 'forwards' }
    )
  }, [])

  return <div ref={ref}>Content</div>
}
```

## まとめ

Web Animations APIは、JavaScriptで柔軟かつパフォーマンスの高いアニメーションを実現できる強力なツールです。

**主要ポイント**:

1. **JavaScript制御**: 動的なアニメーション生成と制御
2. **パフォーマンス**: CSSアニメーションと同等のGPU加速
3. **タイムライン制御**: 再生速度、一時停止、シーク
4. **スクロール連動**: Scroll Timeline APIとの統合
5. **クロスブラウザ**: 主要ブラウザで標準サポート

**2026年のベストプラクティス**:

- transformとopacityでGPU加速
- will-changeを適切に使用
- 複数アニメーションをバッチ処理
- スクロールアニメーションは最適化
- Reactとの統合にカスタムフック

Web Animations APIを活用して、リッチなユーザー体験を提供しましょう。

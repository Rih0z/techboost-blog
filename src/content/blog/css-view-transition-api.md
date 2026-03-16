---
title: "View Transition APIでページ遷移アニメーション"
description: "モダンブラウザの新機能View Transition APIを使って、ネイティブアプリのようなスムーズなページ遷移とアニメーションを実装する完全ガイド。"
pubDate: "2025-02-06"
tags: ['CSS', 'フロントエンド']
heroImage: '../../assets/thumbnails/css-view-transition-api.jpg'
---

従来のWebアプリケーションでは、ページ遷移時のスムーズなアニメーションを実装するには複雑なJavaScriptやCSSが必要でした。しかし、新しい **View Transition API** により、わずか数行のコードでネイティブアプリのような美しい遷移効果を実現できるようになりました。

本記事では、View Transition APIの基本から実践的な使い方まで、サンプルコードを交えて詳しく解説します。

## View Transition APIとは

View Transition APIは、DOMの状態変更時に自動的にアニメーションを生成するブラウザネイティブのAPIです。

### 主な特徴

- **宣言的**: 複雑なアニメーションロジックが不要
- **パフォーマンス**: ブラウザによる最適化
- **柔軟性**: CSSでカスタマイズ可能
- **シンプル**: JavaScriptはわずか数行
- **アクセシビリティ**: 自動的に配慮される

### ブラウザサポート

2024年後半から主要ブラウザで順次サポートが開始されています。

```javascript
// 機能検出
if (document.startViewTransition) {
  // View Transition APIをサポート
} else {
  // フォールバック処理
}
```

## 基本的な使い方

### 最もシンプルな例

```javascript
// DOMの更新をView Transitionでラップ
document.startViewTransition(() => {
  // DOMを更新
  document.querySelector('.content').textContent = '新しいコンテンツ';
});
```

これだけで、要素がフェードイン・フェードアウトでスムーズに切り替わります。

### 非同期処理への対応

```javascript
async function updateContent() {
  // APIからデータを取得
  const response = await fetch('/api/data');
  const data = await response.json();

  // View Transitionを開始
  document.startViewTransition(() => {
    // DOMを更新
    document.querySelector('.content').innerHTML = renderData(data);
  });
}
```

### Promise対応

```javascript
const transition = document.startViewTransition(() => {
  updateDOM();
});

// 遷移完了を待つ
await transition.ready;     // 遷移の準備が完了
await transition.finished;  // 遷移が完全に終了
```

## CSSでカスタマイズ

View Transition APIは、特殊な疑似要素を使ってアニメーションをカスタマイズできます。

### 基本の疑似要素

```css
/* ルート遷移 */
::view-transition {
  /* 遷移全体のスタイル */
}

/* 旧ビューと新ビューのグループ */
::view-transition-group(root) {
  /* 遷移グループのスタイル */
}

/* 古いビュー（フェードアウトする側） */
::view-transition-old(root) {
  /* 古いコンテンツのスタイル */
}

/* 新しいビュー（フェードインする側） */
::view-transition-new(root) {
  /* 新しいコンテンツのスタイル */
}
```

### スライドアニメーション

```css
/* 左からスライドイン */
@keyframes slide-in-from-left {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

/* 右へスライドアウト */
@keyframes slide-out-to-right {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(100%);
  }
}

::view-transition-old(root) {
  animation: slide-out-to-right 0.3s ease-in-out;
}

::view-transition-new(root) {
  animation: slide-in-from-left 0.3s ease-in-out;
}
```

### ズームエフェクト

```css
@keyframes zoom-in {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes zoom-out {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(1.2);
  }
}

::view-transition-old(root) {
  animation: zoom-out 0.25s ease-in;
}

::view-transition-new(root) {
  animation: zoom-in 0.25s ease-out;
}
```

## 名前付き遷移

特定の要素に対して個別のアニメーションを適用できます。

### HTML

```html
<div class="card" style="view-transition-name: card-1">
  <img src="image1.jpg" style="view-transition-name: card-1-image">
  <h3 style="view-transition-name: card-1-title">タイトル</h3>
</div>
```

### CSS

```css
/* CSSでも指定可能 */
.card {
  view-transition-name: card-1;
}

.card img {
  view-transition-name: card-1-image;
}

.card h3 {
  view-transition-name: card-1-title;
}

/* 画像だけ特殊なアニメーション */
::view-transition-old(card-1-image),
::view-transition-new(card-1-image) {
  /* 画像はクロスフェードのみ */
  animation-duration: 0.5s;
}
```

### JavaScript

```javascript
function expandCard(cardElement) {
  document.startViewTransition(() => {
    cardElement.classList.add('expanded');
  });
}
```

## 実践例

### SPAのルーティング

```javascript
class Router {
  constructor() {
    this.routes = new Map();

    // ブラウザバック/フォワード対応
    window.addEventListener('popstate', () => {
      this.navigateTo(window.location.pathname, false);
    });
  }

  addRoute(path, handler) {
    this.routes.set(path, handler);
  }

  async navigateTo(path, pushState = true) {
    const handler = this.routes.get(path);
    if (!handler) return;

    if (pushState) {
      history.pushState(null, '', path);
    }

    // View Transitionを使用
    if (document.startViewTransition) {
      document.startViewTransition(async () => {
        await handler();
      });
    } else {
      // フォールバック
      await handler();
    }
  }
}

// 使用例
const router = new Router();

router.addRoute('/', async () => {
  document.querySelector('#app').innerHTML = '<h1>ホーム</h1>';
});

router.addRoute('/about', async () => {
  document.querySelector('#app').innerHTML = '<h1>アバウト</h1>';
});

// リンククリック処理
document.addEventListener('click', (e) => {
  if (e.target.matches('[data-link]')) {
    e.preventDefault();
    const path = e.target.getAttribute('href');
    router.navigateTo(path);
  }
});
```

### タブ切り替え

```html
<div class="tabs">
  <button class="tab-button active" data-tab="tab1">タブ1</button>
  <button class="tab-button" data-tab="tab2">タブ2</button>
  <button class="tab-button" data-tab="tab3">タブ3</button>
</div>

<div class="tab-content">
  <div id="tab1" class="tab-panel active" style="view-transition-name: tab-panel">
    タブ1のコンテンツ
  </div>
  <div id="tab2" class="tab-panel" style="view-transition-name: tab-panel">
    タブ2のコンテンツ
  </div>
  <div id="tab3" class="tab-panel" style="view-transition-name: tab-panel">
    タブ3のコンテンツ
  </div>
</div>
```

```javascript
function switchTab(tabId) {
  const transition = document.startViewTransition(() => {
    // すべてのタブを非表示
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.remove('active');
    });

    document.querySelectorAll('.tab-button').forEach(button => {
      button.classList.remove('active');
    });

    // 選択されたタブを表示
    document.getElementById(tabId).classList.add('active');
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
  });
}

// イベントリスナー
document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => {
    switchTab(button.dataset.tab);
  });
});
```

```css
.tab-panel {
  view-transition-name: tab-panel;
  display: none;
}

.tab-panel.active {
  display: block;
}

/* タブ切り替えアニメーション */
::view-transition-old(tab-panel) {
  animation: fade-out 0.2s ease-in;
}

::view-transition-new(tab-panel) {
  animation: fade-in 0.2s ease-out;
}

@keyframes fade-out {
  to { opacity: 0; }
}

@keyframes fade-in {
  from { opacity: 0; }
}
```

### ギャラリー展開

```html
<div class="gallery">
  <div class="thumbnail" data-id="1">
    <img src="thumb1.jpg" alt="Image 1">
  </div>
  <div class="thumbnail" data-id="2">
    <img src="thumb2.jpg" alt="Image 2">
  </div>
  <!-- more thumbnails -->
</div>

<div id="lightbox" class="lightbox" style="display: none;">
  <div class="lightbox-content">
    <img id="lightbox-image" src="" alt="">
    <button id="close-lightbox">閉じる</button>
  </div>
</div>
```

```javascript
function openLightbox(imageId) {
  const thumbnail = document.querySelector(`[data-id="${imageId}"]`);
  const imgSrc = thumbnail.querySelector('img').src;

  // view-transition-nameを動的に設定
  thumbnail.style.viewTransitionName = `image-${imageId}`;

  document.startViewTransition(() => {
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightbox-image');

    lightboxImage.src = imgSrc;
    lightboxImage.style.viewTransitionName = `image-${imageId}`;
    lightbox.style.display = 'flex';
  });
}

function closeLightbox() {
  document.startViewTransition(() => {
    document.getElementById('lightbox').style.display = 'none';

    // view-transition-nameをクリア
    document.querySelectorAll('[style*="view-transition-name"]').forEach(el => {
      el.style.viewTransitionName = '';
    });
  });
}

// イベントリスナー
document.querySelectorAll('.thumbnail').forEach(thumb => {
  thumb.addEventListener('click', () => {
    openLightbox(thumb.dataset.id);
  });
});

document.getElementById('close-lightbox').addEventListener('click', closeLightbox);
```

```css
.thumbnail {
  cursor: pointer;
  transition: transform 0.2s;
}

.thumbnail:hover {
  transform: scale(1.05);
}

.lightbox {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

/* ライトボックスのアニメーション */
::view-transition-old(root) {
  animation: none;
}

::view-transition-new(root) {
  animation: none;
}

/* 画像の拡大アニメーション */
::view-transition-group(*) {
  animation-duration: 0.4s;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### リスト項目の並び替え

```javascript
class SortableList {
  constructor(container) {
    this.container = container;
    this.items = Array.from(container.children);

    this.items.forEach((item, index) => {
      item.style.viewTransitionName = `item-${index}`;
    });
  }

  async sortBy(compareFn) {
    const sortedItems = [...this.items].sort(compareFn);

    // View Transitionで並び替え
    await document.startViewTransition(() => {
      sortedItems.forEach((item, index) => {
        this.container.appendChild(item);
        item.style.viewTransitionName = `item-${index}`;
      });

      this.items = sortedItems;
    }).finished;
  }
}

// 使用例
const list = new SortableList(document.querySelector('.sortable-list'));

document.getElementById('sort-alpha').addEventListener('click', () => {
  list.sortBy((a, b) => {
    return a.textContent.localeCompare(b.textContent);
  });
});

document.getElementById('sort-reverse').addEventListener('click', () => {
  list.sortBy((a, b) => {
    return b.textContent.localeCompare(a.textContent);
  });
});
```

## Reactとの統合

```javascript
import { useTransition } from 'react';

function App() {
  const [isPending, startTransition] = useTransition();
  const [page, setPage] = useState('home');

  const navigateTo = (newPage) => {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        startTransition(() => {
          setPage(newPage);
        });
      });
    } else {
      startTransition(() => {
        setPage(newPage);
      });
    }
  };

  return (
    <div>
      <nav>
        <button onClick={() => navigateTo('home')}>ホーム</button>
        <button onClick={() => navigateTo('about')}>アバウト</button>
      </nav>

      <main style={{ viewTransitionName: 'main-content' }}>
        {page === 'home' && <HomePage />}
        {page === 'about' && <AboutPage />}
      </main>
    </div>
  );
}
```

### カスタムフック

```javascript
import { useCallback } from 'react';

function useViewTransition() {
  const startViewTransition = useCallback((callback) => {
    if (document.startViewTransition) {
      return document.startViewTransition(callback);
    } else {
      // フォールバック
      callback();
      return {
        ready: Promise.resolve(),
        finished: Promise.resolve(),
      };
    }
  }, []);

  return startViewTransition;
}

// 使用例
function MyComponent() {
  const startViewTransition = useViewTransition();
  const [content, setContent] = useState('初期コンテンツ');

  const updateContent = () => {
    startViewTransition(() => {
      setContent('新しいコンテンツ');
    });
  };

  return (
    <div>
      <div style={{ viewTransitionName: 'content' }}>{content}</div>
      <button onClick={updateContent}>更新</button>
    </div>
  );
}
```

## パフォーマンス最適化

### 適切なタイミングで使用

```javascript
// Good: 大きな変更
document.startViewTransition(() => {
  renderNewPage();
});

// Bad: 頻繁な小さな変更
setInterval(() => {
  document.startViewTransition(() => {
    updateClock(); // 時計の更新には使わない
  });
}, 1000);
```

### 条件付き使用

```javascript
function updateContent(force = false) {
  const shouldAnimate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (shouldAnimate && document.startViewTransition && !force) {
    document.startViewTransition(() => {
      performUpdate();
    });
  } else {
    performUpdate();
  }
}
```

### メモリ管理

```javascript
class ViewTransitionManager {
  constructor() {
    this.activeTransitions = new Set();
  }

  async start(callback) {
    // 既存の遷移を待つ
    await Promise.all([...this.activeTransitions]);

    if (document.startViewTransition) {
      const transition = document.startViewTransition(callback);
      this.activeTransitions.add(transition.finished);

      transition.finished.finally(() => {
        this.activeTransitions.delete(transition.finished);
      });

      return transition;
    } else {
      callback();
    }
  }
}

const manager = new ViewTransitionManager();
manager.start(() => updatePage());
```

## アクセシビリティ配慮

### モーション設定の尊重

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none !important;
  }
}
```

### スクリーンリーダー対応

```javascript
function navigateWithAnnouncement(newPage) {
  // ページ遷移を通知
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.textContent = `${newPage}ページに移動しました`;
  document.body.appendChild(announcement);

  document.startViewTransition(() => {
    loadPage(newPage);
  }).finished.then(() => {
    // フォーカス管理
    document.querySelector('h1').focus();

    // アナウンスを削除
    setTimeout(() => announcement.remove(), 1000);
  });
}
```

## デバッグとトラブルシューティング

### DevToolsでの確認

```javascript
const transition = document.startViewTransition(() => {
  updateDOM();
});

transition.ready.then(() => {
  console.log('遷移準備完了');
});

transition.finished.then(() => {
  console.log('遷移完了');
}).catch((error) => {
  console.error('遷移エラー:', error);
});
```

### view-transition-nameの重複チェック

```javascript
function checkDuplicateTransitionNames() {
  const names = new Map();

  document.querySelectorAll('*').forEach(el => {
    const name = getComputedStyle(el).viewTransitionName;
    if (name && name !== 'none') {
      if (names.has(name)) {
        console.warn(`重複: ${name}`, [names.get(name), el]);
      } else {
        names.set(name, el);
      }
    }
  });
}
```

---

## 関連記事

- [プログラミングスクール比較2026年版｜現役エンジニアが選ぶ厳選8校](/blog/2026-03-08-programming-school-comparison-2026)
- [エンジニア転職完全ガイド2026](/blog/2026-03-09-engineer-career-change-guide-2026)

## まとめ

View Transition APIは、Webアプリケーションのユーザー体験を劇的に向上させる強力なツールです。

### 主な利点

- **シンプルな実装**: わずか数行のコードで実現
- **高パフォーマンス**: ブラウザネイティブの最適化
- **柔軟なカスタマイズ**: CSSで自由にデザイン可能
- **フレームワーク非依存**: あらゆる環境で使用可能

### ベストプラクティス

1. アクセシビリティを最優先に
2. モーション設定を尊重
3. フォールバックを用意
4. パフォーマンスを監視
5. view-transition-nameの重複を避ける

View Transition APIを活用して、ユーザーを魅了するスムーズなWebアプリケーションを作りましょう。

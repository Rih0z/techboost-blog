---
title: "Astro View Transitions完全ガイド: ページ遷移アニメーションの実装"
description: "Astro View Transitions APIを使った滑らかなページ遷移の実装。カスタムアニメーション、遷移ライフサイクル、パーシャルハイドレーション、パフォーマンス最適化まで徹底解説。"
pubDate: "2025-10-05"
updatedDate: "2025-10-05"
category: "frontend"
tags: ["Astro", "View Transitions", "アニメーション", "UX", "パフォーマンス"]
---

Astro 3.0で導入された**View Transitions API**により、MPAでもSPAのような滑らかなページ遷移が可能になりました。この記事では、基本から高度なカスタマイズまで、実践的な実装方法を解説します。

## View Transitions APIとは

View Transitions APIは、ページ遷移時に要素を滑らかにアニメーションさせるブラウザネイティブのAPIです。Astroはこれをラップし、より使いやすくしています。

### 基本的な有効化

```astro
---
// src/layouts/Layout.astro
import { ViewTransitions } from 'astro:transitions';
---

<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width" />
  <title>My Site</title>

  <!-- View Transitionsを有効化 -->
  <ViewTransitions />
</head>
<body>
  <slot />
</body>
</html>
```

これだけで、すべてのページ遷移が滑らかになります。

### 仕組み

```
1. ユーザーがリンクをクリック
   ↓
2. 次のページをフェッチ
   ↓
3. 現在のページのスナップショットを撮影
   ↓
4. 新しいページに切り替え
   ↓
5. アニメーション実行
```

## 基本的なトランジション

### デフォルトのフェードアニメーション

```astro
---
// src/pages/index.astro
import Layout from '../layouts/Layout.astro';
---

<Layout>
  <h1>トップページ</h1>
  <p>デフォルトのフェードアニメーション</p>
  <a href="/about">Aboutページへ</a>
</Layout>
```

### transition:nameで要素を追跡

```astro
---
// src/pages/blog/index.astro
import Layout from '../../layouts/Layout.astro';
import { getCollection } from 'astro:content';

const posts = await getCollection('blog');
---

<Layout>
  <h1>ブログ一覧</h1>

  <div class="posts">
    {posts.map(post => (
      <article class="post-card">
        <a href={`/blog/${post.slug}`}>
          <!-- 画像に transition:name を付けると、遷移先の同じ名前の要素にモーフィング -->
          <img
            src={post.data.image}
            alt={post.data.title}
            transition:name={`post-image-${post.slug}`}
          />
          <h2 transition:name={`post-title-${post.slug}`}>
            {post.data.title}
          </h2>
        </a>
      </article>
    ))}
  </div>
</Layout>
```

```astro
---
// src/pages/blog/[slug].astro
import Layout from '../../layouts/Layout.astro';
import { getEntry } from 'astro:content';

const { slug } = Astro.params;
const post = await getEntry('blog', slug);
const { Content } = await post.render();
---

<Layout>
  <article class="post">
    <!-- 一覧ページと同じ transition:name を使用 -->
    <img
      src={post.data.image}
      alt={post.data.title}
      transition:name={`post-image-${slug}`}
    />
    <h1 transition:name={`post-title-${slug}`}>
      {post.data.title}
    </h1>

    <Content />
  </article>
</Layout>
```

## カスタムアニメーション

### transition:animateディレクティブ

```astro
---
import { fade, slide } from 'astro:transitions';
---

<Layout>
  <!-- フェードイン -->
  <header transition:animate={fade({ duration: '0.3s' })}>
    <nav>...</nav>
  </header>

  <!-- スライドイン -->
  <main transition:animate={slide({ duration: '0.5s' })}>
    <slot />
  </main>

  <!-- 初期値に戻る（デフォルト動作） -->
  <aside transition:animate="initial">
    <slot name="sidebar" />
  </aside>

  <!-- アニメーションなし -->
  <footer transition:animate="none">
    <p>&copy; 2025</p>
  </footer>
</Layout>
```

### カスタムアニメーションの定義

```astro
---
// src/components/Hero.astro
---

<section class="hero" transition:animate="scaleUp">
  <h1>Welcome</h1>
</section>

<style>
  @keyframes scaleUp {
    from {
      transform: scale(0.8);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  ::view-transition-old(scaleUp) {
    animation: scaleUp 0.5s ease-out;
  }

  ::view-transition-new(scaleUp) {
    animation: scaleUp 0.5s ease-in;
  }
</style>
```

### 複雑なカスタムアニメーション

```astro
---
// src/pages/products/[id].astro
import Layout from '../../layouts/Layout.astro';
---

<Layout>
  <div class="product-detail">
    <!-- 商品画像：拡大しながらフェードイン -->
    <img
      src={product.image}
      alt={product.name}
      class="product-image"
      transition:name={`product-${product.id}`}
    />

    <!-- 商品情報：右からスライドイン -->
    <div class="product-info" transition:animate="slideFromRight">
      <h1>{product.name}</h1>
      <p class="price">${product.price}</p>
      <p class="description">{product.description}</p>
    </div>
  </div>
</Layout>

<style>
  @keyframes slideFromRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes zoomIn {
    from {
      transform: scale(0.5);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  ::view-transition-old(slideFromRight) {
    animation: slideFromRight 0.4s ease-out reverse;
  }

  ::view-transition-new(slideFromRight) {
    animation: slideFromRight 0.4s ease-out;
  }

  .product-image::view-transition-old(product) {
    animation: zoomIn 0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55) reverse;
  }

  .product-image::view-transition-new(product) {
    animation: zoomIn 0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55);
  }

  /* レスポンシブ対応：モバイルではアニメーションを簡素化 */
  @media (prefers-reduced-motion: reduce) {
    ::view-transition-old(*),
    ::view-transition-new(*) {
      animation: none !important;
    }
  }

  @media (max-width: 768px) {
    @keyframes slideFromRight {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  }
</style>
```

## 遷移ライフサイクルイベント

### イベントの種類

```typescript
// astro:before-preparation: 次のページのフェッチ前
// astro:after-preparation: 次のページのフェッチ後
// astro:before-swap: DOM交換前
// astro:after-swap: DOM交換後
// astro:page-load: ページロード完了
```

### ローディングインジケータの実装

```astro
---
// src/components/LoadingBar.astro
---

<div id="loading-bar" class="loading-bar"></div>

<script>
  const loadingBar = document.getElementById('loading-bar');

  // ページ遷移開始時
  document.addEventListener('astro:before-preparation', () => {
    loadingBar?.classList.add('active');
  });

  // ページ遷移完了時
  document.addEventListener('astro:after-swap', () => {
    loadingBar?.classList.remove('active');
  });

  // エラー時
  document.addEventListener('astro:transition-error', () => {
    loadingBar?.classList.remove('active');
    console.error('Page transition failed');
  });
</script>

<style>
  .loading-bar {
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 3px;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    transition: width 0.3s ease;
    z-index: 9999;
  }

  .loading-bar.active {
    width: 100%;
    transition: width 2s ease;
  }
</style>
```

### スクロール位置の復元

```astro
---
// src/layouts/Layout.astro
---

<script>
  // スクロール位置を保存
  const scrollPositions = new Map<string, number>();

  document.addEventListener('astro:before-preparation', (event) => {
    const currentPath = window.location.pathname;
    scrollPositions.set(currentPath, window.scrollY);
  });

  // スクロール位置を復元
  document.addEventListener('astro:after-swap', () => {
    const newPath = window.location.pathname;
    const savedPosition = scrollPositions.get(newPath);

    if (savedPosition !== undefined) {
      // 復元（ブラウザバック時）
      window.scrollTo(0, savedPosition);
    } else {
      // 新規訪問時は一番上へ
      window.scrollTo(0, 0);
    }
  });
</script>
```

### アナリティクスのページビュー送信

```astro
---
// src/layouts/Layout.astro
---

<script>
  // Google Analytics 4
  document.addEventListener('astro:page-load', () => {
    if (typeof gtag !== 'undefined') {
      gtag('config', 'GA_MEASUREMENT_ID', {
        page_path: window.location.pathname,
      });
    }
  });

  // Plausible Analytics
  document.addEventListener('astro:page-load', () => {
    if (typeof plausible !== 'undefined') {
      plausible('pageview');
    }
  });
</script>
```

### フォーム送信後の処理

```astro
---
// src/components/ContactForm.astro
---

<form id="contact-form" method="POST" action="/api/contact">
  <input type="text" name="name" required />
  <input type="email" name="email" required />
  <textarea name="message" required></textarea>
  <button type="submit">送信</button>
</form>

<script>
  const form = document.getElementById('contact-form') as HTMLFormElement;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        // 成功時は thank-you ページに遷移
        // View Transitions を手動でトリガー
        const { navigate } = await import('astro:transitions/client');
        navigate('/thank-you');
      } else {
        alert('送信に失敗しました');
      }
    } catch (error) {
      console.error(error);
      alert('エラーが発生しました');
    }
  });
</script>
```

## クライアントサイドルーティング

### プログラマティックなナビゲーション

```astro
---
// src/components/SearchResults.astro
---

<div id="search-results"></div>

<script>
  import { navigate } from 'astro:transitions/client';

  async function performSearch(query: string) {
    const response = await fetch(`/api/search?q=${query}`);
    const results = await response.json();

    // 検索結果を表示
    displayResults(results);

    // URLを更新（履歴に追加）
    navigate(`/search?q=${query}`);
  }

  function displayResults(results: any[]) {
    const container = document.getElementById('search-results');
    if (!container) return;

    container.innerHTML = results
      .map(
        (r) => `
        <article>
          <h2><a href="/blog/${r.slug}">${r.title}</a></h2>
          <p>${r.excerpt}</p>
        </article>
      `
      )
      .join('');
  }
</script>
```

### 条件付きナビゲーション

```astro
<script>
  import { navigate } from 'astro:transitions/client';

  async function handleDelete(id: string) {
    const confirmed = confirm('本当に削除しますか?');
    if (!confirmed) return;

    try {
      await fetch(`/api/posts/${id}`, { method: 'DELETE' });

      // 削除成功時は一覧ページへ
      navigate('/posts', { history: 'replace' });
    } catch (error) {
      console.error('削除に失敗しました', error);
    }
  }
</script>
```

## パーシャルハイドレーション対応

### Reactコンポーネントとの組み合わせ

```astro
---
// src/pages/dashboard.astro
import Layout from '../layouts/Layout.astro';
import InteractiveChart from '../components/InteractiveChart.tsx';
---

<Layout>
  <h1 transition:name="dashboard-title">ダッシュボード</h1>

  <!--
    client:load でハイドレーション
    transition:persist で状態を維持
  -->
  <InteractiveChart
    client:load
    transition:persist="chart"
    data={chartData}
  />
</Layout>
```

```tsx
// src/components/InteractiveChart.tsx
import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';

interface Props {
  data: number[];
}

export default function InteractiveChart({ data }: Props) {
  const [chartData, setChartData] = useState(data);

  useEffect(() => {
    // ページ遷移後もこのコンポーネントは破棄されない
    console.log('Chart hydrated, data:', chartData);
  }, []);

  return (
    <div className="chart-container">
      <Line
        data={{
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
          datasets: [{ data: chartData }],
        }}
      />
    </div>
  );
}
```

### transition:persistによる状態維持

```astro
---
// src/layouts/Layout.astro
import AudioPlayer from '../components/AudioPlayer.tsx';
---

<!DOCTYPE html>
<html>
<head>
  <ViewTransitions />
</head>
<body>
  <nav>...</nav>

  <main>
    <slot />
  </main>

  <!--
    音楽プレーヤーはページ遷移しても再生を継続
    transition:persist で DOMを保持
  -->
  <AudioPlayer
    client:load
    transition:persist="audio-player"
  />
</body>
</html>
```

## パフォーマンス最適化

### プリフェッチ戦略

```astro
---
// src/components/BlogPostCard.astro
interface Props {
  post: any;
}

const { post } = Astro.props;
---

<article class="post-card">
  <!--
    data-astro-prefetch でホバー時にプリフェッチ
    "hover" | "tap" | "viewport" | "load"
  -->
  <a
    href={`/blog/${post.slug}`}
    data-astro-prefetch="hover"
  >
    <img src={post.image} alt={post.title} />
    <h2>{post.title}</h2>
  </a>
</article>
```

### カスタムプリフェッチロジック

```astro
<script>
  import { prefetch } from 'astro:prefetch';

  // 重要なページを事前にプリフェッチ
  document.addEventListener('DOMContentLoaded', () => {
    // 優先度の高いページ
    const criticalPages = ['/about', '/contact', '/blog'];

    criticalPages.forEach((page) => {
      prefetch(page);
    });
  });

  // ビューポートに入ったリンクをプリフェッチ
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const link = entry.target as HTMLAnchorElement;
        const href = link.getAttribute('href');
        if (href && href.startsWith('/')) {
          prefetch(href);
        }
      }
    });
  });

  document.querySelectorAll('a[href^="/"]').forEach((link) => {
    observer.observe(link);
  });
</script>
```

### 遷移のフォールバック

```astro
---
// src/layouts/Layout.astro
import { ViewTransitions } from 'astro:transitions';
---

<head>
  <ViewTransitions fallback="animate" />
  <!--
    fallback="swap": アニメーションをスキップして即座に切り替え
    fallback="animate": デフォルトのフェードアニメーション（デフォルト）
    fallback="none": View Transitions 非対応ブラウザでは通常のページ遷移
  -->
</head>
```

## トラブルシューティング

### フラッシュ問題の解決

```astro
<style>
  /* ページ遷移中にコンテンツがちらつく場合 */
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation-duration: 0.15s;
  }

  /* 背景色を維持 */
  ::view-transition-old(root) {
    background: white;
  }
</style>
```

### JavaScriptエラーの回避

```astro
<script>
  // ページ遷移時にイベントリスナーをクリーンアップ
  let cleanup: (() => void) | null = null;

  function initialize() {
    const button = document.getElementById('my-button');

    const handler = () => {
      console.log('Clicked');
    };

    button?.addEventListener('click', handler);

    // クリーンアップ関数を保存
    cleanup = () => {
      button?.removeEventListener('click', handler);
    };
  }

  // 初回実行
  initialize();

  // ページ遷移前にクリーンアップ
  document.addEventListener('astro:before-preparation', () => {
    cleanup?.();
  });

  // ページ遷移後に再初期化
  document.addEventListener('astro:after-swap', () => {
    initialize();
  });
</script>
```

## まとめ

Astro View Transitionsを活用することで、MPAでありながらSPAのようなUXを実現できます。

### 重要なポイント

1. **transition:name**: 要素を追跡してモーフィングアニメーション
2. **transition:animate**: カスタムアニメーションの適用
3. **ライフサイクルイベント**: ローディング、アナリティクス、スクロール復元
4. **transition:persist**: クライアントコンポーネントの状態維持
5. **プリフェッチ**: パフォーマンス最適化

View Transitionsは**プログレッシブエンハンスメント**です。非対応ブラウザでも通常のページ遷移で動作します。

### 参考リンク

- [Astro View Transitions](https://docs.astro.build/en/guides/view-transitions/)
- [View Transitions API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
- [Chrome Developers: View Transitions](https://developer.chrome.com/docs/web-platform/view-transitions/)

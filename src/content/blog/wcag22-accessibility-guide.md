---
title: 'WCAG 2.2準拠ガイド — Webアクセシビリティ実装の完全手引き'
description: 'WCAG 2.2の新基準を含む全達成基準を解説。React/Next.jsでのアクセシブルなコンポーネント実装、ARIAラベル、カラーコントラスト、フォーカス管理など実践的なコード例で学ぶ完全ガイド。'
pubDate: '2026-02-20'
heroImage: '../../assets/blog-placeholder-1.jpg'
tags: ['アクセシビリティ', 'WCAG', 'ARIA', 'React', 'Next.js']
---

Webアクセシビリティは「あると便利な機能」ではなく、**すべてのユーザーが平等にWebを利用できるための基盤**だ。視覚障害・聴覚障害・運動障害・認知障害を持つユーザーはもちろん、強い日差しの中でスマートフォンを使うユーザーや、マウスが壊れてキーボードだけで操作するユーザーにとっても、アクセシビリティの高いサイトは使いやすい。

2023年10月にW3Cが正式勧告した **WCAG 2.2** は、9つの新達成基準を追加し、モバイルファーストの現代Webに対応した実践的な指針を提供している。本稿では、WCAG 2.2の全達成基準を体系的に解説し、React/Next.jsでの具体的な実装方法をコード例とともに紹介する。

---

## 1. Webアクセシビリティの4原則（POUR）

WCAG（Web Content Accessibility Guidelines）はすべての達成基準を4つの原則に基づいて整理している。この原則を理解することが、アクセシビリティ実装の出発点となる。

### 知覚可能（Perceivable）

情報とUIコンポーネントは、ユーザーが知覚できる方法で提示されなければならない。視覚だけに依存した情報提供は知覚可能とは言えない。

- 画像にはテキスト代替（alt属性）を提供する
- 動画には字幕・音声解説を付与する
- コンテンツは色だけで区別しない
- 十分なカラーコントラストを確保する

### 操作可能（Operable）

UIコンポーネントとナビゲーションは操作可能でなければならない。マウスを使えないユーザーがいることを常に意識する。

- すべての機能をキーボードだけで操作できる
- 点滅・フラッシュするコンテンツは3回/秒以下に制限する
- ページ内を移動するためのスキップリンクを提供する
- フォーカスインジケーターを明示的に表示する

### 理解可能（Understandable）

情報とUIの操作は理解可能でなければならない。

- テキストは読みやすく、専門用語には説明を付ける
- ページの言語を`lang`属性で指定する
- フォームの入力エラーを明確に示す
- 一貫したナビゲーション構造を維持する

### 堅牢（Robust）

コンテンツは、支援技術を含むさまざまなユーザーエージェントによって確実に解釈できるよう十分に堅牢でなければならない。

- 有効なHTMLマークアップを使用する
- ARIAを正しく実装する
- スクリーンリーダーとの互換性を確保する

---

## 2. WCAG 2.1 vs WCAG 2.2 — 何が変わったか

WCAG 2.2はWCAG 2.1との後方互換性を保ちながら、9つの新達成基準を追加した。また、WCAG 2.1で存在した達成基準4.1.1（構文解析）が廃止された点も重要な変更点だ。

### 追加された9つの達成基準

| 達成基準 | レベル | 内容 |
|---------|--------|------|
| 2.4.11 フォーカスの非隠蔽（最小） | AA | フォーカスを受けたコンポーネントが完全に隠れない |
| 2.4.12 フォーカスの非隠蔽（強化） | AAA | フォーカスを受けたコンポーネントが部分的にも隠れない |
| 2.4.13 フォーカスの外観 | AAA | フォーカスインジケーターの最小サイズと輝度比を規定 |
| 2.5.7 ドラッグ操作 | AA | ドラッグ操作はポインタシングルアクションでも実行可能 |
| 2.5.8 ターゲットサイズ（最小） | AA | タッチターゲットは最低24×24CSS px |
| 3.2.6 一貫したヘルプ | A | ヘルプ機能は複数ページで同じ相対的順序で提供 |
| 3.3.7 冗長な入力 | A | 同一セッション内で入力済み情報の再入力を不要に |
| 3.3.8 アクセシブルな認証（最小） | AA | 認知機能テストを認証に使用しない（例外あり） |
| 3.3.9 アクセシブルな認証（強化） | AAA | 認証に認知機能テストを一切使用しない |

### 廃止：4.1.1 構文解析

WCAG 2.1まで存在した「構文解析」（HTMLの構文的な正確さを求める基準）はWCAG 2.2で廃止された。現代のブラウザと支援技術は多くの構文エラーを自動修正できるようになったためだ。

---

## 3. AA vs AAA — 実務的な準拠レベルの判断

WCAG準拠には3つのレベルがある。

- **レベルA**: 最低限の要件。これを満たさないと、一部のユーザーがコンテンツにアクセスできない
- **レベルAA**: 推奨基準。多くの法律・規制が参照する標準的な準拠レベル
- **レベルAAA**: 最高基準。すべてのコンテンツで達成することは困難

実務上は**レベルAA準拠を目標**とするのが標準的だ。日本では「JIS X 8341-3:2016」がWCAG 2.0/2.1のAA準拠に対応し、公的機関のWebサイトに対して事実上義務付けられている。EUのENウェブアクセシビリティ標準、米国のSection 508もAA準拠を要求する。

AAAは達成できる部分から取り組むことが望ましいが、すべての基準を満たすことを最初から義務付けると開発が現実的でなくなる可能性がある。

---

## 4. カラーコントラスト実装

### 最低基準（WCAG AA）

- **通常テキスト**: 背景色との輝度コントラスト比が **4.5:1** 以上
- **大きなテキスト**（18pt以上、または14pt以上のボールド）: **3:1** 以上
- **UIコンポーネントとグラフィック**: **3:1** 以上（達成基準1.4.11）

### 強化基準（WCAG AAA）

- **通常テキスト**: **7:1** 以上
- **大きなテキスト**: **4.5:1** 以上

### TailwindCSSでのコントラスト確保例

```tsx
// 悪い例：グレーテキストがコントラスト不足になりやすい
<p className="text-gray-400 bg-white">
  このテキストはコントラスト比が低い可能性があります
</p>

// 良い例：コントラスト比を意識した配色
<p className="text-gray-700 bg-white">
  {/* gray-700 (#374151) / white (#fff) = 約10:1 */}
  十分なコントラスト比を持つテキスト
</p>

// プライマリボタン：十分なコントラスト比
<button className="bg-blue-700 text-white hover:bg-blue-800 focus:bg-blue-800">
  {/* blue-700 (#1d4ed8) / white (#fff) = 約7.2:1 */}
  送信する
</button>
```

カラーコントラスト比の確認には[DevToolBoxのカラーコントラストチェッカー](https://usedevtools.com/color-contrast)が便利です。WCAG AA/AAAレベルを即座に判定できます。

### CSS カスタムプロパティによるアクセシブルカラーシステム

```css
:root {
  /* テキスト色：背景白に対して4.5:1以上を保証 */
  --color-text-primary: #1a1a1a;    /* 16:1 */
  --color-text-secondary: #595959;  /* 7:1 */
  --color-text-muted: #767676;      /* 4.54:1 — AA最小値 */
  
  /* インタラクティブ要素 */
  --color-interactive: #0055cc;     /* 5.9:1 — AA適合 */
  --color-interactive-hover: #003d99;
  
  /* エラー・警告（色だけに依存しない） */
  --color-error: #cc0000;           /* アイコン + テキストで伝達 */
  --color-success: #006600;
}
```

---

## 5. ARIAラベルとrole属性の正しい使い方

ARIAは**Accessible Rich Internet Applications**の略。ネイティブHTMLのセマンティクスで表現できない複雑なUIパターンに対して補完的に使用する。

### ARIAの第一原則：ネイティブHTMLを優先する

```tsx
// 悪い例：divにroleを付けてボタンを模倣
<div role="button" onClick={handleClick}>
  クリック
</div>

// 良い例：ネイティブのbuttonを使う
<button onClick={handleClick} type="button">
  クリック
</button>
```

ネイティブ要素は`role`、フォーカス管理、キーボードイベントが自動的に適切に処理される。

### aria-label vs aria-labelledby vs aria-describedby

```tsx
// aria-label：要素にテキストラベルが見えない場合
<button aria-label="検索" type="button">
  <SearchIcon aria-hidden="true" />
</button>

// aria-labelledby：別の要素のテキストをラベルとして参照
<section aria-labelledby="section-heading">
  <h2 id="section-heading">お知らせ</h2>
  <p>最新のニュースはこちら...</p>
</section>

// aria-describedby：追加の説明テキストを関連付け
<input
  type="email"
  id="email"
  aria-describedby="email-hint email-error"
  aria-invalid={hasError}
/>
<p id="email-hint">例：user@example.com</p>
{hasError && (
  <p id="email-error" role="alert">
    有効なメールアドレスを入力してください
  </p>
)}
```

### ライブリージョン

動的に更新されるコンテンツをスクリーンリーダーに通知するには`aria-live`を使用する。

```tsx
// 検索結果の件数を通知
<div aria-live="polite" aria-atomic="true">
  {searchResults.length > 0
    ? `${searchResults.length}件の結果が見つかりました`
    : '結果が見つかりませんでした'}
</div>

// エラーメッセージは即座に通知（assertive）
<div role="alert" aria-live="assertive">
  {errorMessage}
</div>
```

`polite`は現在の読み上げが終わってから通知し、`assertive`は即座に割り込む。エラーや重要な通知以外では`polite`を使用する。

---

## 6. キーボードナビゲーションとフォーカス管理

### タブ順序の管理

```tsx
// tabIndex="0"：通常のタブ順序に追加
// tabIndex="-1"：プログラムでフォーカスできるが、タブ順序には入らない
// tabIndex正値：避けるべき（自然なDOM順序を崩す）

const FocusablePanel: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  
  // モーダル等でフォーカスをパネル内に閉じ込める
  const trapFocus = (e: KeyboardEvent) => {
    const focusableElements = panelRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusableElements || focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
    
    if (e.key === 'Escape') {
      onClose();
    }
  };
  
  return (
    <div ref={panelRef} onKeyDown={trapFocus}>
      {children}
    </div>
  );
};
```

### スキップリンク

ページの先頭に配置し、キーボードユーザーがメインコンテンツへ直接移動できるようにする。

```tsx
// layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        {/* スキップリンク：通常は視覚的に隠しフォーカス時に表示 */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4
                     focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-700 focus:text-white
                     focus:rounded focus:outline-none"
        >
          メインコンテンツへスキップ
        </a>
        <Header />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
```

---

## 7. フォーカスインジケーター（WCAG 2.2新基準）

WCAG 2.2で追加された達成基準2.4.11と2.4.12は、フォーカスインジケーターの視認性を厳格に定義している。

### 2.4.11 フォーカスの非隠蔽（AA）

スティッキーヘッダーやモーダルなど、フォーカスを受けたコンポーネントが固定要素に完全に隠れてはならない。

```css
/* スティッキーヘッダーがある場合のスクロールオフセット */
:target {
  scroll-margin-top: 80px; /* ヘッダーの高さ分 */
}

/* フォーカス時にも同様のオフセット */
:focus {
  scroll-margin-top: 80px;
}
```

### 2.4.13 フォーカスの外観（AAA）

フォーカスインジケーターに最小面積と輝度比を要求する。

```css
/* WCAG 2.4.13に準拠したフォーカスリング */
:focus-visible {
  outline: 3px solid #0055cc;
  outline-offset: 2px;
  /* アウトライン面積 >= フォーカスされた要素の周長の1/2 px */
  /* フォーカスリングと背景のコントラスト比 >= 3:1 */
}

/* ブラウザのデフォルトフォーカスリングを消さない */
/* :focus { outline: none; } は禁止 */

/* マウス操作時はフォーカスリングを隠してもよい */
:focus:not(:focus-visible) {
  outline: none;
}
```

---

## 8. タッチターゲットサイズ（2.5.8）

WCAG 2.2の達成基準2.5.8では、インタラクティブ要素のタッチターゲットサイズを最低**24×24 CSS px**と規定している。ただし例外として、要素が24×24pxに満たない場合でも、周囲にオフセットスペースがあり隣接するターゲットと重ならない場合は許容される。

実務上は、モバイルのタッチ操作を考慮して**44×44px**以上を推奨する（Appleのヒューマンインターフェースガイドラインに準拠）。

```css
/* 小さいアイコンボタンのタッチターゲット拡大 */
.icon-button {
  position: relative;
  width: 24px;
  height: 24px;
  /* 視覚的サイズは24px、タッチターゲットを44pxに拡大 */
}

.icon-button::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  min-width: 44px;
  min-height: 44px;
}
```

```tsx
// TailwindCSSを使ったタッチターゲット確保
const IconButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}> = ({ icon, label, onClick }) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    className="relative flex items-center justify-center w-6 h-6
               before:absolute before:inset-0 before:-m-2.5
               hover:bg-gray-100 rounded focus-visible:outline
               focus-visible:outline-2 focus-visible:outline-blue-600"
  >
    {icon}
  </button>
);
```

---

## 9. React/Next.jsでのアクセシブルなコンポーネントパターン

### アクセシブルなダイアログ（モーダル）

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const AccessibleDialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // ダイアログを開く前にフォーカスしていた要素を記録
      previousFocusRef.current = document.activeElement as HTMLElement;
      // ダイアログ内の最初のフォーカス可能な要素にフォーカス
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    } else {
      // ダイアログを閉じたら元の要素にフォーカスを戻す
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      
      if (e.key !== 'Tab') return;
      
      const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusableElements || focusableElements.length === 0) return;
      
      const firstEl = focusableElements[0];
      const lastEl = focusableElements[focusableElements.length - 1];
      
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        aria-hidden="true"
        onClick={onClose}
      />
      {/* ダイアログ本体 */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                   z-50 w-full max-w-md bg-white rounded-lg shadow-xl p-6"
      >
        <h2 id="dialog-title" className="text-xl font-bold mb-4">
          {title}
        </h2>
        <div>{children}</div>
        <button
          type="button"
          onClick={onClose}
          aria-label="ダイアログを閉じる"
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded"
        >
          ✕
        </button>
      </div>
    </>,
    document.body
  );
};
```

### アクセシブルなドロップダウンメニュー

```tsx
'use client';

import { useState, useRef, useEffect } from 'react';

interface DropdownProps {
  trigger: string;
  items: Array<{ label: string; href: string }>;
}

export const AccessibleDropdown: React.FC<DropdownProps> = ({ trigger, items }) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        setIsOpen((prev) => !prev);
        break;
      case 'Escape':
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          const firstItem = menuRef.current?.querySelector<HTMLAnchorElement>('a');
          firstItem?.focus();
        }
        break;
    }
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent, index: number) => {
    const menuItems = menuRef.current?.querySelectorAll<HTMLAnchorElement>('a');
    if (!menuItems) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        menuItems[Math.min(index + 1, menuItems.length - 1)]?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (index === 0) {
          triggerRef.current?.focus();
        } else {
          menuItems[index - 1]?.focus();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case 'Home':
        e.preventDefault();
        menuItems[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        menuItems[menuItems.length - 1]?.focus();
        break;
    }
  };

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !menuRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className="flex items-center gap-1 px-4 py-2 bg-white border rounded
                   hover:bg-gray-50 focus-visible:outline focus-visible:outline-2
                   focus-visible:outline-blue-600"
      >
        {trigger}
        <span aria-hidden="true">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <ul
          ref={menuRef}
          role="menu"
          className="absolute top-full left-0 mt-1 w-48 bg-white border rounded
                     shadow-lg z-10 py-1"
        >
          {items.map((item, index) => (
            <li key={item.href} role="none">
              <a
                href={item.href}
                role="menuitem"
                onKeyDown={(e) => handleMenuKeyDown(e, index)}
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100
                           focus-visible:outline focus-visible:outline-2
                           focus-visible:outline-blue-600 focus-visible:outline-offset-[-2px]"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

### アクセシブルなタブコンポーネント

```tsx
'use client';

import { useState, useRef } from 'react';

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

export const AccessibleTabs: React.FC<{ tabs: Tab[] }> = ({ tabs }) => {
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const handleKeyDown = (e: React.KeyboardEvent, currentId: string) => {
    const currentIndex = tabs.findIndex((t) => t.id === currentId);
    let nextIndex: number;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        nextIndex = (currentIndex + 1) % tabs.length;
        break;
      case 'ArrowLeft':
        e.preventDefault();
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    const nextTab = tabs[nextIndex];
    setActiveTab(nextTab.id);
    tabRefs.current.get(nextTab.id)?.focus();
  };

  return (
    <div>
      {/* タブリスト */}
      <div role="tablist" aria-label="コンテンツタブ" className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) tabRefs.current.set(tab.id, el);
            }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, tab.id)}
            className={`px-4 py-2 border-b-2 transition-colors focus-visible:outline
                        focus-visible:outline-2 focus-visible:outline-blue-600
                        ${
                          activeTab === tab.id
                            ? 'border-blue-600 text-blue-600 font-semibold'
                            : 'border-transparent text-gray-600 hover:text-gray-900'
                        }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* タブパネル */}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={activeTab !== tab.id}
          tabIndex={0}
          className="p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
};
```

---

## 10. 自動テストツール

### axe-coreとjest-axe

```bash
npm install --save-dev jest-axe @testing-library/react @testing-library/jest-dom
```

```tsx
// __tests__/AccessibleDialog.test.tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AccessibleDialog } from '../components/AccessibleDialog';

expect.extend(toHaveNoViolations);

describe('AccessibleDialog', () => {
  it('アクセシビリティ違反がないこと', async () => {
    const { container } = render(
      <AccessibleDialog isOpen={true} onClose={() => {}} title="テストダイアログ">
        <p>ダイアログの内容</p>
        <button type="button">確認</button>
      </AccessibleDialog>
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
  
  it('role="dialog"が正しく設定されていること', () => {
    const { getByRole } = render(
      <AccessibleDialog isOpen={true} onClose={() => {}} title="テスト">
        <p>内容</p>
      </AccessibleDialog>
    );
    expect(getByRole('dialog')).toBeInTheDocument();
  });
  
  it('aria-modal="true"が設定されていること', () => {
    const { getByRole } = render(
      <AccessibleDialog isOpen={true} onClose={() => {}} title="テスト">
        <p>内容</p>
      </AccessibleDialog>
    );
    expect(getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });
});
```

### Next.jsでのaxe-core統合（開発環境のみ）

```tsx
// app/layout.tsx（開発環境のみaxeを実行）
if (process.env.NODE_ENV !== 'production') {
  import('@axe-core/react').then(({ default: axeReact }) => {
    import('react-dom').then(({ default: ReactDOM }) => {
      axeReact(React, ReactDOM, 1000);
    });
  });
}
```

---

## 11. スクリーンリーダーでのテスト方法

自動テストは全問題の約30〜40%しか検出できない。スクリーンリーダーでの手動テストが不可欠だ。

### 主要なスクリーンリーダー

| スクリーンリーダー | OS | 無料/有料 | 主な使い方 |
|------------------|----|----------|-----------|
| **VoiceOver** | macOS / iOS | 無料（OS標準） | `Cmd + F5`で起動 |
| **NVDA** | Windows | 無料 | 最も普及したWindowsスクリーンリーダー |
| **JAWS** | Windows | 有料 | 業務用途で広く使用 |
| **TalkBack** | Android | 無料（OS標準） | モバイルテストに使用 |

### VoiceOverでのテスト手順（macOS）

1. `Cmd + F5`でVoiceOverを起動
2. `Tab`キーでインタラクティブ要素を順番に移動
3. `VO + Right`（`Ctrl + Option + →`）で次の要素に移動
4. ランドマーク一覧：`VO + U`でローターを開き`Landmarks`を選択
5. 見出し一覧：ローターで`Headings`を選択
6. フォームコントロール：ローターで`Form Controls`を選択

### テストチェックリスト

```markdown
## スクリーンリーダーテストチェックリスト

### 基本ナビゲーション
- [ ] スキップリンクが機能する
- [ ] 見出し構造が論理的（h1 → h2 → h3の順）
- [ ] ランドマーク（header, main, nav, footer）が適切に配置されている
- [ ] ページタイトルが一意で説明的

### フォーム
- [ ] すべての入力フィールドにラベルが関連付けられている
- [ ] 必須フィールドがスクリーンリーダーに伝わる
- [ ] エラーメッセージが入力フィールドと関連付けられている
- [ ] フォーム送信後のフィードバックが読み上げられる

### インタラクティブコンポーネント
- [ ] ボタンの目的が名前だけで理解できる
- [ ] 展開/折りたたみの状態が読み上げられる（aria-expanded）
- [ ] ダイアログ開閉時にフォーカスが適切に移動する
- [ ] 動的コンテンツの変更が通知される（aria-live）

### 画像・メディア
- [ ] 意味のある画像にalt属性がある
- [ ] 装飾用画像にalt=""が設定されている
- [ ] 動画に字幕が付いている
```

---

## まとめ

WCAG 2.2準拠は一度達成すれば終わりではなく、継続的なプロセスだ。新機能追加のたびにアクセシビリティを考慮し、定期的なテストを実施することが重要だ。

実装の優先順位をつけるなら:

1. **セマンティックHTMLの徹底**（最大の効果を得られる基盤）
2. **キーボードナビゲーション**（多くのユーザーに影響）
3. **カラーコントラスト確保**（自動化ツールで検出しやすい）
4. **ARIAの適切な使用**（複雑なUIコンポーネントに必須）
5. **フォーカス管理**（SPA・動的コンテンツでの品質を左右）

WCAG 2.2への準拠は、障害を持つユーザーへの配慮であると同時に、すべてのユーザーにとって使いやすいWebを作るための投資だ。アクセシビリティの高いサイトはSEOにも有利で、ビジネス面でもメリットがある。

カラーコントラスト比の確認には[DevToolBoxのカラーコントラストチェッカー](https://usedevtools.com/color-contrast)が便利です。WCAG AA/AAAレベルを即座に判定できます。

---

## 参考リソース

- [WCAG 2.2 仕様書（W3C）](https://www.w3.org/TR/WCAG22/)
- [WAI-ARIA Authoring Practices 1.2](https://www.w3.org/WAI/ARIA/apg/)
- [axe-core GitHub](https://github.com/dequelabs/axe-core)
- [jest-axe](https://github.com/nickcolley/jest-axe)
- [WebAIM：カラーコントラストチェッカー](https://webaim.org/resources/contrastchecker/)
- [MDN: アクセシビリティ](https://developer.mozilla.org/ja/docs/Web/Accessibility)

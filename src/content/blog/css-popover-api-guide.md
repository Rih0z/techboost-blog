---
title: 'Popover API完全ガイド: JavaScriptなしのポップオーバー実装'
description: 'ネイティブPopover APIを使った最新のポップオーバー実装ガイド。基本構文からアニメーション、アクセシビリティ、ブラウザ互換性まで徹底解説します。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。'
pubDate: '2025-10-23'
updatedDate: '2025-10-23'
tags: ['CSS', 'HTML', 'Popover API', 'Web標準', 'アクセシビリティ', 'プログラミング']
heroImage: '../../assets/thumbnails/css-popover-api-guide.jpg'
---
Popover APIは、JavaScriptなしでポップオーバー（ツールチップ、ドロップダウンメニュー、ダイアログなど）を実装できる新しいWeb標準APIです。2024年からモダンブラウザで広くサポートされ始めました。

## Popover APIとは

Popover APIは、HTML属性だけでポップオーバーを実装できる機能です。これまでJavaScriptやライブラリが必要だった以下の機能を、ブラウザがネイティブサポートします：

- トップレイヤー表示（z-index管理不要）
- Escキーで閉じる
- フォーカス管理
- 外側クリックで閉じる
- アクセシビリティ（ARIA属性自動付与）

### 従来の実装との比較

```html
<!-- 従来のJavaScript実装 -->
<button id="menuBtn">メニュー</button>
<div id="menu" class="hidden">
  <ul>
    <li>項目1</li>
    <li>項目2</li>
  </ul>
</div>

<script>
const btn = document.getElementById('menuBtn');
const menu = document.getElementById('menu');

btn.addEventListener('click', () => {
  menu.classList.toggle('hidden');
});

// 外側クリックで閉じる
document.addEventListener('click', (e) => {
  if (!menu.contains(e.target) && !btn.contains(e.target)) {
    menu.classList.add('hidden');
  }
});

// Escキーで閉じる
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    menu.classList.add('hidden');
  }
});
</script>

<!-- Popover API使用（JavaScriptゼロ） -->
<button popovertarget="menu">メニュー</button>
<div id="menu" popover>
  <ul>
    <li>項目1</li>
    <li>項目2</li>
  </ul>
</div>
```

たった2つの属性で、Escキー、外側クリック、フォーカス管理が自動で実装されます。

## 基本的な使い方

### シンプルなポップオーバー

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>Popover API デモ</title>
  <style>
    [popover] {
      padding: 1rem;
      border: 2px solid #333;
      border-radius: 8px;
      background: white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
  </style>
</head>
<body>
  <button popovertarget="info">詳細を表示</button>

  <div id="info" popover>
    <h3>追加情報</h3>
    <p>ここに詳細な情報を表示します。</p>
  </div>
</body>
</html>
```

### 3つのポップオーバータイプ

Popover APIには3つのモードがあります。

```html
<!-- auto（デフォルト） - 他のポップオーバーを自動で閉じる -->
<button popovertarget="menu1">メニュー1</button>
<div id="menu1" popover="auto">
  <p>メニュー1の内容</p>
</div>

<!-- manual - 明示的に閉じるまで開いたまま -->
<button popovertarget="notice" popovertargetaction="toggle">通知</button>
<div id="notice" popover="manual">
  <p>この通知は手動で閉じる必要があります。</p>
  <button popovertarget="notice" popovertargetaction="hide">閉じる</button>
</div>

<!-- hint - 軽量ヒント（aria-role="tooltip"相当） -->
<button popovertarget="tooltip1">ヘルプ</button>
<div id="tooltip1" popover="hint">
  クリックして詳細を確認
</div>
```

### popovertargetactionの種類

```html
<button popovertarget="demo" popovertargetaction="show">開く</button>
<button popovertarget="demo" popovertargetaction="hide">閉じる</button>
<button popovertarget="demo" popovertargetaction="toggle">切り替え</button>

<div id="demo" popover>
  <p>ポップオーバーコンテンツ</p>
</div>
```

## 実践的なユースケース

### ドロップダウンメニュー

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <style>
    nav {
      background: #2c3e50;
      padding: 1rem;
    }

    nav button {
      background: transparent;
      border: none;
      color: white;
      padding: 0.5rem 1rem;
      cursor: pointer;
      font-size: 16px;
    }

    nav button:hover {
      background: rgba(255,255,255,0.1);
      border-radius: 4px;
    }

    [popover] {
      margin: 0;
      padding: 0;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: white;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      min-width: 200px;
    }

    [popover] ul {
      list-style: none;
      margin: 0;
      padding: 0.5rem 0;
    }

    [popover] li a {
      display: block;
      padding: 0.75rem 1rem;
      color: #333;
      text-decoration: none;
    }

    [popover] li a:hover {
      background: #f5f5f5;
    }

    [popover] hr {
      margin: 0.5rem 0;
      border: none;
      border-top: 1px solid #eee;
    }
  </style>
</head>
<body>
  <nav>
    <button popovertarget="file-menu">ファイル</button>
    <button popovertarget="edit-menu">編集</button>
    <button popovertarget="view-menu">表示</button>
  </nav>

  <div id="file-menu" popover>
    <ul>
      <li><a href="#">新規作成</a></li>
      <li><a href="#">開く</a></li>
      <li><a href="#">保存</a></li>
      <hr>
      <li><a href="#">閉じる</a></li>
    </ul>
  </div>

  <div id="edit-menu" popover>
    <ul>
      <li><a href="#">元に戻す</a></li>
      <li><a href="#">やり直し</a></li>
      <hr>
      <li><a href="#">切り取り</a></li>
      <li><a href="#">コピー</a></li>
      <li><a href="#">貼り付け</a></li>
    </ul>
  </div>

  <div id="view-menu" popover>
    <ul>
      <li><a href="#">拡大</a></li>
      <li><a href="#">縮小</a></li>
      <li><a href="#">リセット</a></li>
    </ul>
  </div>
</body>
</html>
```

### ツールチップ

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <style>
    .tooltip-trigger {
      text-decoration: underline dotted;
      cursor: help;
      color: #3498db;
    }

    [popover]:popover-open {
      /* ツールチップスタイル */
      padding: 0.5rem 0.75rem;
      background: #333;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      max-width: 300px;
    }

    /* 矢印の追加 */
    [popover]::before {
      content: '';
      position: absolute;
      top: -8px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-bottom: 8px solid #333;
    }
  </style>
</head>
<body>
  <p>
    この機能は
    <span class="tooltip-trigger" popovertarget="tip1">ベータ版</span>
    です。利用にあたっては
    <span class="tooltip-trigger" popovertarget="tip2">利用規約</span>
    をご確認ください。
  </p>

  <div id="tip1" popover="hint">
    現在テスト中の機能です。予告なく仕様が変更される可能性があります。
  </div>

  <div id="tip2" popover="hint">
    サービス利用前に必ず規約をお読みください。
  </div>
</body>
</html>
```

### モーダルダイアログ

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <style>
    /* ポップオーバーをモーダル風にスタイル */
    [popover] {
      margin: auto;
      padding: 2rem;
      border: none;
      border-radius: 12px;
      background: white;
      max-width: 500px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }

    /* バックドロップ（疑似要素） */
    [popover]::backdrop {
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(4px);
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 1.5rem;
    }

    .close-btn {
      background: transparent;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #999;
    }

    .close-btn:hover {
      color: #333;
    }

    .dialog-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
      margin-top: 1.5rem;
    }

    button {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }

    .btn-primary {
      background: #3498db;
      color: white;
    }

    .btn-secondary {
      background: #ecf0f1;
      color: #333;
    }
  </style>
</head>
<body>
  <button popovertarget="confirm-dialog">削除</button>

  <div id="confirm-dialog" popover="manual">
    <div class="dialog-header">
      <h2>削除の確認</h2>
      <button class="close-btn" popovertarget="confirm-dialog" popovertargetaction="hide">
        ×
      </button>
    </div>

    <p>本当にこのアイテムを削除しますか？この操作は取り消せません。</p>

    <div class="dialog-actions">
      <button class="btn-secondary" popovertarget="confirm-dialog" popovertargetaction="hide">
        キャンセル
      </button>
      <button class="btn-primary">削除</button>
    </div>
  </div>
</body>
</html>
```

## アニメーション

### CSSトランジション

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <style>
    [popover] {
      padding: 2rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: white;

      /* 初期状態 */
      opacity: 0;
      transform: translateY(-20px);

      /* トランジション */
      transition: opacity 0.3s ease,
                  transform 0.3s ease,
                  display 0.3s allow-discrete,
                  overlay 0.3s allow-discrete;
    }

    /* 開いた状態 */
    [popover]:popover-open {
      opacity: 1;
      transform: translateY(0);
    }

    /* 閉じるアニメーション（starting-style） */
    @starting-style {
      [popover]:popover-open {
        opacity: 0;
        transform: translateY(-20px);
      }
    }
  </style>
</head>
<body>
  <button popovertarget="animated">アニメーション付きポップオーバー</button>

  <div id="animated" popover>
    <h3>滑らかなアニメーション</h3>
    <p>開閉時にフェードとスライドのアニメーションが適用されます。</p>
  </div>
</body>
</html>
```

### CSS Animations

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <style>
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: scale(0.8) translateY(-20px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    @keyframes slideOut {
      from {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
      to {
        opacity: 0;
        transform: scale(0.8) translateY(-20px);
      }
    }

    [popover]:popover-open {
      animation: slideIn 0.3s ease forwards;
    }

    [popover]:not(:popover-open) {
      animation: slideOut 0.3s ease forwards;
    }
  </style>
</head>
<body>
  <button popovertarget="bounce">バウンス効果</button>

  <div id="bounce" popover>
    <h3>バウンスアニメーション</h3>
    <p>開く時に弾むような動きをします。</p>
  </div>
</body>
</html>
```

## JavaScript連携

Popover APIはJavaScriptなしでも動作しますが、より高度な制御も可能です。

### イベントリスナー

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <style>
    .status {
      margin-top: 1rem;
      padding: 0.5rem;
      background: #f5f5f5;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <button popovertarget="tracked">ポップオーバー</button>

  <div id="tracked" popover>
    <p>イベント追跡が有効です</p>
  </div>

  <div class="status" id="status">
    ステータス: 閉じています
  </div>

  <script>
    const popover = document.getElementById('tracked');
    const status = document.getElementById('status');

    // ポップオーバーが開く前
    popover.addEventListener('beforetoggle', (event) => {
      console.log('beforetoggle:', event.newState);
      if (event.newState === 'open') {
        status.textContent = 'ステータス: 開いています...';
      }
    });

    // ポップオーバーが開いた後
    popover.addEventListener('toggle', (event) => {
      console.log('toggle:', event.newState);
      if (event.newState === 'open') {
        status.textContent = 'ステータス: 開いています';
        status.style.background = '#d4edda';
      } else {
        status.textContent = 'ステータス: 閉じています';
        status.style.background = '#f5f5f5';
      }
    });
  </script>
</body>
</html>
```

### プログラム的な制御

```html
<!DOCTYPE html>
<html lang="ja">
<body>
  <div id="controlled" popover>
    <p>JavaScriptで制御されるポップオーバー</p>
  </div>

  <button id="showBtn">表示</button>
  <button id="hideBtn">非表示</button>
  <button id="toggleBtn">切り替え</button>

  <script>
    const popover = document.getElementById('controlled');

    document.getElementById('showBtn').addEventListener('click', () => {
      popover.showPopover();
    });

    document.getElementById('hideBtn').addEventListener('click', () => {
      popover.hidePopover();
    });

    document.getElementById('toggleBtn').addEventListener('click', () => {
      popover.togglePopover();
    });

    // 条件付きで開く
    setTimeout(() => {
      if (Math.random() > 0.5) {
        popover.showPopover();
      }
    }, 3000);
  </script>
</body>
</html>
```

## アクセシビリティ

Popover APIは自動的にARIA属性を付与しますが、さらに改善できます。

```html
<!DOCTYPE html>
<html lang="ja">
<body>
  <!-- 説明的なラベル -->
  <button
    popovertarget="settings"
    aria-label="設定メニューを開く"
    aria-haspopup="menu">
    ⚙️ 設定
  </button>

  <!-- role属性で意味を明確に -->
  <div id="settings" popover role="menu">
    <ul>
      <li role="menuitem"><a href="#">プロフィール</a></li>
      <li role="menuitem"><a href="#">通知設定</a></li>
      <li role="menuitem"><a href="#">プライバシー</a></li>
    </ul>
  </div>

  <!-- フォーカス可能な要素を含む場合 -->
  <button popovertarget="form-popup">フォームを開く</button>

  <div id="form-popup" popover>
    <h2 id="form-title">お問い合わせ</h2>
    <form aria-labelledby="form-title">
      <label>
        お名前
        <input type="text" required>
      </label>
      <label>
        メールアドレス
        <input type="email" required>
      </label>
      <button type="submit">送信</button>
    </form>
  </div>
</body>
</html>
```

## ブラウザ互換性とポリフィル

### 対応状況（2025年10月時点）

- Chrome 114+
- Edge 114+
- Safari 17+
- Firefox 125+

### ポリフィル

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <script type="module">
    // Popover APIのサポートチェック
    if (!HTMLElement.prototype.hasOwnProperty('popover')) {
      // ポリフィル読み込み
      import('https://cdn.jsdelivr.net/npm/@oddbird/popover-polyfill@latest/dist/popover.min.js');
    }
  </script>
</head>
<body>
  <button popovertarget="demo">デモ</button>
  <div id="demo" popover>ポリフィルで動作します</div>
</body>
</html>
```

### フォールバック実装

```html
<style>
  /* Popover非対応ブラウザ向けフォールバック */
  [popover]:not(:popover-open) {
    display: none;
  }

  @supports (top: anchor(top)) {
    /* Anchor Positioning APIサポート時のスタイル */
  }
</style>
```

## まとめ

Popover APIは、以下の点で優れています：

1. **シンプル** - HTMLだけで実装可能
2. **パフォーマンス** - ブラウザネイティブ実装
3. **アクセシブル** - ARIA属性自動付与
4. **メンテナンス性** - JavaScriptライブラリ不要

既存のツールチップやドロップダウンライブラリの置き換えとして、積極的に採用を検討する価値があります。

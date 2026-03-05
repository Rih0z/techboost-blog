---
title: "htmx実践ガイド - JavaScriptを書かずに実現するモダンWeb開発の新常識"
description: "htmxを使ってJavaScriptフレームワークなしでSPAライクな体験を実現する実践ガイド。HATEOAS、部分更新、楽観的UI、WebSocketsの活用法を豊富なコード例とともに解説。"
pubDate: "2025-02-06"
tags: ["htmx", "html", "hypermedia", "backend", "progressive-enhancement", "プログラミング"]
---

htmxは「JavaScriptを書かずにモダンなWebアプリを作る」という革新的なアプローチを提供するライブラリです。HTML属性だけでAJAX、CSS Transitions、WebSockets、Server-Sent Eventsを扱えます。

この記事では、htmxの基本から高度なテクニックまで、実践的な例とともに解説します。

## htmxとは何か

htmxは**Hypermedia（HTML）をJavaScriptフレームワークの代替とする**思想に基づいたライブラリです。

### 従来の方法 vs htmx

```html
<!-- 従来: React/Vue/Svelteでクライアント管理 -->
<div id="root"></div>
<script>
  // 数百行のJavaScript...
  const App = () => {
    const [count, setCount] = useState(0);

    const increment = async () => {
      const res = await fetch('/api/increment', { method: 'POST' });
      const data = await res.json();
      setCount(data.count);
    };

    return (
      <div>
        <p>Count: {count}</p>
        <button onClick={increment}>Increment</button>
      </div>
    );
  };
</script>
```

```html
<!-- htmx: HTML属性だけで完結 -->
<div>
  <p>Count: <span id="count">0</span></p>
  <button
    hx-post="/increment"
    hx-target="#count"
    hx-swap="innerHTML">
    Increment
  </button>
</div>
```

**サーバーレスポンス例**:
```html
<!-- サーバーは純粋なHTMLを返すだけ -->
42
```

### htmxの哲学

**HATEOAS（Hypermedia As The Engine Of Application State）**: 状態管理をクライアントではなくサーバーで行う
**Progressive Enhancement**: JavaScriptなしでも動作し、htmxで体験を向上
**Less is More**: JavaScriptフレームワークの複雑さを排除
**HTML-over-the-wire**: JSONではなくHTMLをやり取り

## htmxの基本

### インストール

```html
<!-- CDN -->
<script src="https://unpkg.com/htmx.org@1.9.10"></script>
```

```bash
# npm
npm install htmx.org

# yarn
yarn add htmx.org
```

### 基本的な属性

```html
<!-- GET リクエスト -->
<button hx-get="/api/data" hx-target="#result">
  Load Data
</button>
<div id="result"></div>

<!-- POST リクエスト -->
<form hx-post="/api/submit" hx-target="#message">
  <input name="username" />
  <button type="submit">Submit</button>
</form>
<div id="message"></div>

<!-- PUT/PATCH/DELETE -->
<button hx-put="/api/update/123" hx-target="#status">Update</button>
<button hx-delete="/api/delete/123" hx-target="#status">Delete</button>
```

## まとめ

htmxは「JavaScriptフレームワークの複雑さに疲れた」開発者にとって魅力的な選択肢です。

**メリット**:
- HTML/CSS/バックエンド言語だけでモダンなWebアプリ構築
- バンドルサイズ極小、初期ロード高速
- プログレッシブエンハンスメント自然に実現
- サーバー側で状態管理、デバッグしやすい

**注意点**:
- サーバーレスポンスがHTMLなので、API再利用性は低い
- 複雑なクライアントロジックには向かない
- チームがバックエンド得意である必要あり

適切なユースケースでhtmxを使えば、開発速度とパフォーマンスを両立できます。

## 参考リンク

- [htmx公式サイト](https://htmx.org/)
- [Hypermedia Systems（無料書籍）](https://hypermedia.systems/)
- [_hyperscript](https://hyperscript.org/)

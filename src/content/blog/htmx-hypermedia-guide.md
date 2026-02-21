---
title: 'HTMX完全ガイド：JavaScriptを最小化したモダンWeb開発'
description: 'HTMXの基本から応用まで徹底解説。hx-get/post/put/delete・hx-trigger・hx-target・hx-swap・WebSocket・Server-Sent Events・Alpine.js連携・FastAPI/Express統合まで実践的に学ぶ'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-4.jpg'
tags: ['HTMX', 'Frontend', 'Hypermedia']
---

## HTMXとは何か、なぜ今注目されているのか

フロントエンド開発の世界は長らくJavaScriptフレームワークの支配下にあった。React、Vue、Angularといったシングルページアプリケーション（SPA）フレームワークが台頭し、クライアントサイドでのルーティング、状態管理、コンポーネントの仮想DOM差分更新が当たり前となった。しかしこの複雑さが、開発者に過大な認知負荷を与えているという声も多い。

HTMXはその逆張りとして生まれたライブラリだ。作者のCarson Grossは「Hypermedia as the Engine of Application State（HATEOAS）」という古典的なWebの原則に立ち返ることを提唱した。HTMXは2020年に公開され、2023年から2024年にかけて爆発的な注目を集めた。GitHub Starは急増し、Stack Overflow開発者調査でも「最も気になる技術」のランキングに登場した。

### HTMXの核心思想

HTMXの思想は一言で言えば「HTMLをより表現豊かにする」ことだ。従来のHTMLはリンクとフォームという限られた手段でのみサーバーと通信できた。HTMXはこの制約を取り払い、あらゆるHTML要素がサーバーと通信できるよう拡張する。

重要な概念を整理する。

**Hypermedia駆動アーキテクチャ**: クライアントはサーバーからHTMLを受け取り、そのHTMLに含まれるリンクやフォームをナビゲーションの手段として使う。サーバーがアプリケーションの状態を管理し、HTMLとして表現する。これはRoyfielding氏が2000年の博士論文で定義したREST本来の姿だ。

**JavaScriptを書かない選択肢**: HTMXはHTMLの属性だけでAJAX通信、CSSトランジション、WebSocket接続、Server-Sent Eventsを実現する。多くのユースケースでJavaScriptコードを一行も書かずに動的なUIを構築できる。

**ページ全体の置き換えではなく部分更新**: 従来のフォーム送信やリンクはページ全体をリロードする。HTMXは特定のHTML要素だけを更新できる。これがユーザー体験を損なわずに単純なサーバーサイドレンダリングを維持できる理由だ。

**バンドルサイズの極小化**: HTMXのminified+gzipサイズは約14KBだ。ReactのランタイムやVueのランタイムと比較すると桁違いに小さい。

```html
<!-- これだけでAJAX対応ボタンが完成する -->
<button hx-get="/api/data" hx-target="#result">
  データを取得
</button>
<div id="result"></div>
```

このシンプルさがHTMXの最大の魅力だ。

---

## SPAとHTMXの比較と使い分け

HTMXとSPAフレームワークはどちらが優れているという問題ではなく、適材適所の問題だ。それぞれの特性を理解することが重要だ。

### SPAが適している場面

SPAは以下のケースに強い。

- **高度にインタラクティブなUI**: ドラッグ&ドロップ、リアルタイムコラボレーション、複雑なフォームウィザード
- **オフライン対応**: Service Workerとの組み合わせで、ネットワーク切断時でも動作するアプリ
- **クライアント側の状態が複雑**: ユーザーの操作履歴、複数ステップのワークフロー、ショッピングカートのような状態
- **ネイティブアプリに近い体験**: タブ切り替え、モーダル、アニメーションが多用されるUI
- **大規模チーム開発**: コンポーネントの分離、TypeScriptによる型安全性、テストのしやすさ

### HTMXが適している場面

HTMXは以下のケースで真価を発揮する。

- **コンテンツ中心のWebサイト**: ブログ、ドキュメントサイト、ニュースサイト
- **管理画面・ダッシュボード**: CRUDオペレーションが主体のバックオフィスツール
- **既存のサーバーサイドアプリへの段階的な機能追加**: Rails、Django、Laravelなどのアプリに動的な要素を追加
- **SEOが重要なサイト**: サーバーサイドレンダリングが標準なので、SEOへの配慮が自然に組み込まれる
- **小規模チーム・個人開発者**: フロントエンドとバックエンドを分けずに1人で開発できる

### バンドルサイズと初期ロード時間の比較

```
フレームワーク         最小バンドルサイズ (gzip)
HTMX                   約 14 KB
Alpine.js              約 7 KB
Vue 3                  約 50 KB
React + ReactDOM       約 45 KB
Angular                約 130 KB以上
```

HTMXはバンドルサイズが小さいため、初期ロード時間が短い。特にネットワーク環境が劣悪な地域や、モバイルユーザーが多いサイトでは大きな差が出る。

### アーキテクチャパターンの違い

SPAのアーキテクチャでは、フロントエンドがJSONのAPIを呼び出し、クライアント側でHTMLを生成する。

```
SPA アーキテクチャ:
ブラウザ -> JSON API -> フロントエンドがHTMLに変換 -> DOM更新

HTMX アーキテクチャ:
ブラウザ -> HTMXリクエスト -> サーバーがHTMLを返す -> DOM更新
```

HTMXでは「HTMLを返すAPI」を作ることになる。これは一見古臭く見えるかもしれないが、サーバー側のテンプレートエンジンの知識がそのまま活かせるという利点がある。

---

## インストールと基本設定

HTMXの導入は非常に簡単だ。CDNから読み込むだけで使い始められる。

### CDNを使った導入

```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTMX入門</title>
    <script src="https://unpkg.com/htmx.org@2.0.4" 
            integrity="sha384-HGfztofotfshcF7+8n44JQL2oJmowVChPTg48S+jvZoztPfvwD79OC/LTtG6dMp+"
            crossorigin="anonymous"></script>
</head>
<body>
    <h1>Hello, HTMX!</h1>
</body>
</html>
```

### npmを使った導入

```bash
npm install htmx.org
```

```javascript
// main.js または index.js
import 'htmx.org';
```

### Astroプロジェクトへの導入

Astroでは`<script>`タグをレイアウトに追加するか、`is:inline`ディレクティブを使う。

```astro
---
// src/layouts/Layout.astro
---
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <script src="https://unpkg.com/htmx.org@2.0.4" is:inline></script>
</head>
<body>
    <slot />
</body>
</html>
```

### HTMXの設定オプション

HTMXはグローバル設定オブジェクトで動作をカスタマイズできる。

```html
<meta name="htmx-config" content='{
    "defaultSwapStyle": "outerHTML",
    "defaultSettleDelay": 100,
    "historyCacheSize": 10,
    "refreshOnHistoryMiss": true,
    "globalViewTransitions": true,
    "allowScriptTags": false,
    "selfRequestsOnly": true
}'>
```

主要な設定項目の解説。

- `defaultSwapStyle`: デフォルトのスワップ方式（デフォルトは`innerHTML`）
- `defaultSettleDelay`: スワップ後のセトルタイムラウンドのミリ秒
- `historyCacheSize`: 履歴キャッシュに保存するページ数
- `selfRequestsOnly`: 同一オリジンへのリクエストのみ許可するか（セキュリティ上推奨）

### 最初の動くサンプル

```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTMX最初のサンプル</title>
    <script src="https://unpkg.com/htmx.org@2.0.4"></script>
    <style>
        body { font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; }
        button { padding: 8px 16px; cursor: pointer; }
        #content { margin-top: 20px; padding: 16px; border: 1px solid #ddd; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>HTMXデモ</h1>
    <button hx-get="/hello" hx-target="#content" hx-swap="innerHTML">
        サーバーからデータを取得
    </button>
    <div id="content">ここに結果が表示されます</div>
</body>
</html>
```

サーバー側（Pythonのhttp.serverを使った簡単な例）:

```python
from http.server import HTTPServer, BaseHTTPRequestHandler

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/hello':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            html = '<p>サーバーからのレスポンスです！現在時刻: <strong>' + \
                   __import__('datetime').datetime.now().strftime('%H:%M:%S') + \
                   '</strong></p>'
            self.wfile.write(html.encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == '__main__':
    server = HTTPServer(('localhost', 8000), Handler)
    print('サーバー起動: http://localhost:8000')
    server.serve_forever()
```

---

## 基本属性：hx-get、hx-post、hx-put、hx-delete

HTMXの基本はHTTPメソッドに対応する4つの属性だ。これらを理解すれば、CRUD操作の大部分を実装できる。

### hx-get：データの取得

`hx-get`は最も基本的な属性で、GETリクエストを送信する。

```html
<!-- 基本的な使い方 -->
<button hx-get="/api/users">ユーザー一覧を取得</button>

<!-- クエリパラメータ付き -->
<button hx-get="/api/search?q=htmx&limit=10">検索</button>

<!-- ターゲットとスワップを指定 -->
<button 
    hx-get="/api/profile/1" 
    hx-target="#profile-section"
    hx-swap="outerHTML">
    プロフィールを表示
</button>
<div id="profile-section">プロフィールがここに表示されます</div>
```

リンク要素にも使える。

```html
<!-- aタグのデフォルト動作を上書き -->
<a href="/details/1" hx-get="/details/1" hx-target="#main-content">
    詳細を見る
</a>
```

### hx-post：データの送信・作成

`hx-post`はPOSTリクエストを送信する。フォームの送信や新規データ作成に使う。

```html
<!-- シンプルなフォーム -->
<form hx-post="/api/todos" hx-target="#todo-list" hx-swap="afterbegin">
    <input type="text" name="title" placeholder="タスクを入力" required>
    <button type="submit">追加</button>
</form>
<ul id="todo-list">
    <!-- 新しいタスクがここに追加される -->
</ul>
```

フォームの全フィールドが自動的にリクエストボディに含まれる。

```html
<!-- 複数フィールドを持つフォーム -->
<form hx-post="/api/users" hx-target="#result">
    <div>
        <label for="name">名前</label>
        <input type="text" id="name" name="name" required>
    </div>
    <div>
        <label for="email">メール</label>
        <input type="email" id="email" name="email" required>
    </div>
    <div>
        <label for="role">役割</label>
        <select name="role">
            <option value="user">一般ユーザー</option>
            <option value="admin">管理者</option>
        </select>
    </div>
    <button type="submit">ユーザー作成</button>
</form>
<div id="result"></div>
```

### hx-put：データの更新

`hx-put`はPUTリクエストを送信する。既存データの更新に使う。

```html
<!-- インライン編集パターン -->
<div id="user-1">
    <span>田中 太郎</span>
    <button 
        hx-get="/users/1/edit" 
        hx-target="#user-1"
        hx-swap="outerHTML">
        編集
    </button>
</div>
```

サーバーが編集フォームを返す例（Jinja2テンプレート）:

```html
<!-- /users/1/edit のレスポンス -->
<div id="user-1">
    <form hx-put="/users/1" hx-target="#user-1" hx-swap="outerHTML">
        <input type="text" name="name" value="田中 太郎">
        <button type="submit">保存</button>
        <button hx-get="/users/1" hx-target="#user-1" hx-swap="outerHTML" type="button">
            キャンセル
        </button>
    </form>
</div>
```

### hx-delete：データの削除

`hx-delete`はDELETEリクエストを送信する。

```html
<!-- 確認なしで削除 -->
<li id="todo-42">
    タスクの内容
    <button 
        hx-delete="/api/todos/42"
        hx-target="#todo-42"
        hx-swap="outerHTML swap:1s"
        hx-confirm="本当に削除しますか？">
        削除
    </button>
</li>
```

`hx-confirm`属性を使うと、実行前にブラウザの確認ダイアログを表示できる。

### 実践的なCRUDアプリケーション例

```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>タスク管理</title>
    <script src="https://unpkg.com/htmx.org@2.0.4"></script>
    <style>
        body { font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 0 20px; }
        .task-item { 
            display: flex; justify-content: space-between; align-items: center;
            padding: 12px; border: 1px solid #e0e0e0; border-radius: 4px; margin: 8px 0;
        }
        .task-item.htmx-swapping { opacity: 0; transition: opacity 0.5s ease-out; }
        form { display: flex; gap: 8px; margin-bottom: 20px; }
        input[type="text"] { flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
        button { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; }
        .btn-primary { background: #0066cc; color: white; }
        .btn-danger { background: #dc3545; color: white; }
    </style>
</head>
<body>
    <h1>タスク管理</h1>
    
    <form hx-post="/api/tasks" hx-target="#task-list" hx-swap="afterbegin">
        <input type="text" name="title" placeholder="新しいタスクを入力" required>
        <button type="submit" class="btn-primary">追加</button>
    </form>
    
    <div id="task-list" hx-get="/api/tasks" hx-trigger="load">
        <!-- タスクが動的に読み込まれる -->
    </div>
</body>
</html>
```

---

## ターゲットとスワップ：hx-target と hx-swap

HTMXの強力な機能の1つは、サーバーのレスポンスをDOMのどこに、どのように挿入するかを細かく制御できることだ。

### hx-target：更新する要素の指定

`hx-target`はCSSセレクターでレスポンスを挿入する要素を指定する。

```html
<!-- IDで指定（最も一般的） -->
<button hx-get="/content" hx-target="#main">読み込む</button>

<!-- クラスで指定 -->
<button hx-get="/content" hx-target=".content-area">読み込む</button>

<!-- 特殊なセレクター -->
<!-- this: ボタン自身 -->
<button hx-get="/new-text" hx-target="this">自分を更新</button>

<!-- closest: 最も近い祖先要素 -->
<button hx-delete="/item/1" hx-target="closest li">この項目を削除</button>

<!-- find: 子孫要素 -->
<div hx-get="/data" hx-target="find .result">
    <div class="result">ここが更新される</div>
</div>

<!-- next: 次の兄弟要素 -->
<label>名前</label>
<input type="text" name="name" hx-get="/validate/name" hx-target="next .error-msg">
<span class="error-msg"></span>

<!-- previous: 前の兄弟要素 -->
<span class="status"></span>
<button hx-post="/action" hx-target="previous .status">実行</button>
```

### hx-swap：置き換え方法の指定

`hx-swap`はレスポンスをどのように既存のDOMと置き換えるかを指定する。

```html
<!-- innerHTML（デフォルト）: ターゲットの内部HTMLを置き換え -->
<div hx-get="/content" hx-swap="innerHTML">
    元のコンテンツ
</div>

<!-- outerHTML: ターゲット要素全体を置き換え -->
<div id="card" hx-get="/new-card" hx-swap="outerHTML">
    元のカード
</div>

<!-- beforebegin: ターゲットの前に挿入 -->
<ul>
    <li hx-get="/new-item" hx-swap="beforebegin">先頭アイテム</li>
</ul>

<!-- afterbegin: ターゲットの内部の先頭に挿入 -->
<ul id="list" hx-get="/new-item" hx-swap="afterbegin">
    <!-- 新しいアイテムがここに追加される -->
    <li>既存のアイテム1</li>
    <li>既存のアイテム2</li>
</ul>

<!-- beforeend: ターゲットの内部の末尾に挿入（無限スクロールに便利） -->
<ul id="list" hx-get="/more-items" hx-swap="beforeend">
    <li>アイテム1</li>
    <li>アイテム2</li>
</ul>

<!-- afterend: ターゲットの後に挿入 -->
<div id="alert" hx-get="/notification" hx-swap="afterend">
    既存コンテンツ
</div>

<!-- delete: ターゲットを削除（レスポンスは無視） -->
<div id="modal" hx-delete="/close" hx-swap="delete">
    モーダルコンテンツ
</div>

<!-- none: DOMを更新しない（ヘッダーやイベントだけを使う場合） -->
<button hx-post="/track-click" hx-swap="none">クリック</button>
```

### スワップの修飾子

`hx-swap`にはアニメーションタイミングを制御する修飾子を追加できる。

```html
<!-- swap: 1s -- スワップを1秒遅延させる（フェードアウトアニメーション用） -->
<div id="item" hx-delete="/item/1" hx-swap="outerHTML swap:1s">
    削除されるアイテム
</div>

<!-- settle: 500ms -- セトル（クラス付与）のタイミングを調整 -->
<div hx-get="/content" hx-swap="innerHTML settle:500ms">
    コンテンツ
</div>

<!-- scroll: top -- スワップ後にスクロール位置をリセット -->
<div hx-get="/page" hx-swap="innerHTML scroll:top">
    ページコンテンツ
</div>

<!-- show: top -- スワップ後にターゲットをビューポートに表示 -->
<ul id="results" hx-get="/search" hx-swap="innerHTML show:top">
    検索結果
</ul>

<!-- transition: true -- View Transitions APIを使用 -->
<div hx-get="/new-page" hx-swap="innerHTML transition:true">
    ページ
</div>
```

### CSSアニメーションとの組み合わせ

HTMXはスワップのタイミングに合わせてCSSクラスを付与する。これを利用してスムーズなアニメーションを実現できる。

```css
/* 要素が追加されたときのアニメーション */
.htmx-added {
    opacity: 0;
}

/* セトル後（アニメーション完了）の状態 */
.htmx-settling {
    opacity: 1;
    transition: opacity 0.3s ease-in;
}

/* リクエスト中のスタイル */
.htmx-request .loading-indicator {
    display: block;
}

/* スワップ中のスタイル */
.htmx-swapping {
    opacity: 0;
    transition: opacity 0.5s ease-out;
}
```

```html
<style>
    .fade-in {
        animation: fadeIn 0.3s ease-in;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to   { opacity: 1; transform: translateY(0); }
    }
    
    #result.htmx-settling { animation: fadeIn 0.3s ease-in; }
</style>

<button hx-get="/data" hx-target="#result" hx-swap="innerHTML settle:300ms">
    データ取得
</button>
<div id="result"></div>
```

---

## トリガー：hx-trigger

`hx-trigger`は、いつHTMXリクエストを送信するかを制御する。デフォルトのトリガーは要素の種類によって異なる。

- `<button>`: クリック
- `<form>`: サブミット
- `<input>`, `<textarea>`, `<select>`: 変更（change）

### 基本的なトリガー

```html
<!-- クリック時（デフォルト） -->
<button hx-get="/data" hx-trigger="click">クリック</button>

<!-- マウスオーバー時 -->
<div hx-get="/preview" hx-trigger="mouseenter">ホバーでプレビュー</div>

<!-- マウスアウト時 -->
<div hx-get="/reset" hx-trigger="mouseleave">マウスが離れたとき</div>

<!-- フォーカス時 -->
<input hx-get="/suggestions" hx-trigger="focus" name="search">

<!-- キーアップ時（リアルタイム検索） -->
<input 
    type="text" 
    name="q" 
    hx-get="/search" 
    hx-trigger="keyup"
    hx-target="#search-results"
    placeholder="検索...">

<!-- ページロード時 -->
<div hx-get="/initial-data" hx-trigger="load">
    ロード中...
</div>

<!-- 独自のカスタムイベント -->
<div hx-get="/refresh" hx-trigger="refresh-data">データ更新エリア</div>
<button onclick="htmx.trigger('#refresh-area', 'refresh-data')">
    手動更新
</button>
```

### トリガー修飾子

```html
<!-- once: 一度だけ実行 -->
<div hx-get="/analytics" hx-trigger="load once">
    一度だけ読み込む
</div>

<!-- delay: 指定時間後に実行（デバウンス） -->
<input 
    type="text" 
    name="q" 
    hx-get="/search" 
    hx-trigger="keyup delay:500ms"
    hx-target="#results">

<!-- throttle: スロットリング（最短間隔を設定） -->
<input 
    type="range" 
    name="value"
    hx-get="/update"
    hx-trigger="input throttle:200ms">

<!-- from: 別の要素のイベントを監視 -->
<input id="search-input" type="text" name="q">
<div 
    hx-get="/search" 
    hx-trigger="keyup from:#search-input"
    hx-target="this">
    検索結果
</div>

<!-- target: 特定の子要素のイベントのみ反応（イベント委譲） -->
<div 
    hx-get="/item-detail"
    hx-trigger="click target:.item-link"
    hx-target="#detail">
    <a class="item-link" data-id="1" href="#">アイテム1</a>
    <a class="item-link" data-id="2" href="#">アイテム2</a>
    <a class="item-link" data-id="3" href="#">アイテム3</a>
</div>

<!-- consume: イベントのバブリングを停止 -->
<button hx-get="/data" hx-trigger="click consume">クリック</button>

<!-- changed: 値が変わったときだけ実行 -->
<input hx-get="/validate" hx-trigger="change changed" name="email">

<!-- 複数のトリガーを指定 -->
<input 
    name="username"
    hx-get="/check-username"
    hx-trigger="keyup delay:500ms, blur"
    hx-target="#username-feedback">
```

### ポーリング（定期的な更新）

HTMXはポーリングを簡単に実装できる。これはリアルタイムダッシュボードやステータス表示に便利だ。

```html
<!-- 5秒ごとにサーバーからデータを取得 -->
<div 
    id="stock-price"
    hx-get="/api/stock-price" 
    hx-trigger="every 5s"
    hx-target="this"
    hx-swap="innerHTML">
    読み込み中...
</div>

<!-- 条件付きポーリング（サーバーレスポンスで停止） -->
<!-- サーバーがステータス200以外を返すとポーリングが止まる -->
<div 
    id="job-status"
    hx-get="/api/job/123/status"
    hx-trigger="every 2s"
    hx-target="this">
    処理中...
</div>
```

サーバー側でポーリングを停止させるには、レスポンスヘッダーを使う。

```python
# FastAPI の例
@app.get("/api/job/{job_id}/status")
async def job_status(job_id: int, response: Response):
    job = get_job(job_id)
    if job.status == "completed":
        # ポーリングを停止させる
        response.headers["HX-Trigger"] = "jobCompleted"
        return HTMLResponse("<span>完了</span>")
    return HTMLResponse(f"<span>処理中... {job.progress}%</span>")
```

---

## フォームと入力：hx-include と hx-params

HTMXはフォームデータの送信を柔軟に制御できる。

### hx-include：追加データの包含

通常、HTMXリクエストはトリガー要素が属するフォームのデータを送信する。`hx-include`を使うと、フォーム外のデータも含められる。

```html
<!-- フォーム外の入力値をリクエストに含める -->
<input type="hidden" id="user-id" name="userId" value="42">

<button 
    hx-post="/api/action"
    hx-include="#user-id">
    実行
</button>

<!-- セレクターで複数要素を指定 -->
<div class="filter-options">
    <input type="checkbox" name="category" value="tech"> テクノロジー
    <input type="checkbox" name="category" value="design"> デザイン
</div>

<button 
    hx-get="/api/articles"
    hx-include=".filter-options input"
    hx-target="#article-list">
    フィルター適用
</button>

<!-- 親フォーム全体を含める -->
<form id="main-form">
    <input name="title" value="タイトル">
    <input name="body" value="本文">
</form>

<button 
    hx-post="/api/preview"
    hx-include="#main-form">
    プレビュー
</button>
```

### hx-params：送信パラメータの制御

```html
<!-- 特定のパラメータだけを送信 -->
<form hx-post="/api/update" hx-params="name email">
    <input name="name" value="田中">
    <input name="email" value="tanaka@example.com">
    <input name="password" value="secret">  <!-- これは送信されない -->
    <button type="submit">更新</button>
</form>

<!-- 特定のパラメータを除外 -->
<form hx-post="/api/save" hx-params="not csrf_token debug_mode">
    <input name="title" value="タイトル">
    <input name="csrf_token" value="abc123">  <!-- 除外される -->
    <input name="debug_mode" value="true">  <!-- 除外される -->
    <button type="submit">保存</button>
</form>

<!-- すべてのパラメータを送信（デフォルト） -->
<form hx-post="/api/save" hx-params="*">
    <input name="title" value="タイトル">
    <button type="submit">保存</button>
</form>

<!-- パラメータを送信しない -->
<button hx-get="/api/reset" hx-params="none">リセット</button>
```

### hx-vals：追加のカスタム値

```html
<!-- JSON形式で追加パラメータを指定 -->
<button 
    hx-post="/api/like"
    hx-vals='{"articleId": "42", "action": "like"}'>
    いいね
</button>

<!-- 動的な値はJavaScript式を使う -->
<button 
    hx-post="/api/action"
    hx-vals='js:{"timestamp": new Date().toISOString(), "userId": getCurrentUserId()}'>
    実行
</button>
```

### フォームのバリデーション

```html
<form hx-post="/api/register" hx-target="#form-feedback">
    <div class="field-group">
        <label for="username">ユーザー名</label>
        <input 
            type="text" 
            id="username"
            name="username"
            hx-get="/api/check-username"
            hx-trigger="blur"
            hx-target="#username-error"
            required
            minlength="3">
        <span id="username-error" class="error-text"></span>
    </div>
    
    <div class="field-group">
        <label for="email">メールアドレス</label>
        <input 
            type="email" 
            id="email"
            name="email"
            hx-get="/api/check-email"
            hx-trigger="blur"
            hx-target="#email-error">
        <span id="email-error" class="error-text"></span>
    </div>
    
    <button type="submit">登録</button>
    <div id="form-feedback"></div>
</form>
```

サーバー側のバリデーションレスポンス例。

```python
from fastapi import FastAPI, Form
from fastapi.responses import HTMLResponse

@app.get("/api/check-username")
async def check_username(username: str):
    if len(username) < 3:
        return HTMLResponse('<span style="color:red">3文字以上必要です</span>')
    if username_exists(username):
        return HTMLResponse('<span style="color:red">このユーザー名は使用中です</span>')
    return HTMLResponse('<span style="color:green">使用可能です</span>')
```

---

## インジケーターとローディング状態

ユーザー体験において、リクエスト中のフィードバックは非常に重要だ。HTMXはローディング状態の管理を簡単にする。

### htmx-indicator クラス

HTMXはリクエスト中に自動的にCSSクラスを付与する。

- `.htmx-request`: リクエスト中にトリガー要素に付与
- `.htmx-request .htmx-indicator`: インジケーター要素を表示するクラス

```html
<style>
    /* デフォルトでインジケーターを非表示 */
    .htmx-indicator {
        display: none;
    }
    /* リクエスト中に表示 */
    .htmx-request .htmx-indicator {
        display: inline-block;
    }
    /* リクエスト中にボタンを半透明に */
    .htmx-request.btn-submit {
        opacity: 0.7;
        cursor: not-allowed;
    }
    
    /* スピナーアニメーション */
    .spinner {
        width: 20px;
        height: 20px;
        border: 2px solid #f3f3f3;
        border-top: 2px solid #0066cc;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        0%  { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
</style>

<button class="btn-submit" hx-post="/api/submit" hx-target="#result">
    <span class="htmx-indicator">
        <span class="spinner"></span>
    </span>
    送信
</button>
<div id="result"></div>
```

### hx-indicator：外部インジケーターの指定

```html
<!-- グローバルなプログレスバー -->
<div id="global-spinner" class="htmx-indicator">
    <div class="progress-bar"></div>
</div>

<button 
    hx-post="/api/long-task"
    hx-indicator="#global-spinner"
    hx-target="#task-result">
    長い処理を実行
</button>
<div id="task-result"></div>
```

### 詳細なローディングUI

```html
<style>
    .loading-overlay {
        display: none;
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(0,0,0,0.3);
        z-index: 1000;
        align-items: center;
        justify-content: center;
    }
    
    .htmx-request .loading-overlay,
    .htmx-request.loading-overlay {
        display: flex;
    }
    
    .loading-card {
        background: white;
        padding: 24px 40px;
        border-radius: 8px;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    }
</style>

<div class="loading-overlay htmx-indicator" id="loading">
    <div class="loading-card">
        <div class="spinner"></div>
        <p>処理中です。しばらくお待ちください...</p>
    </div>
</div>

<button 
    hx-post="/api/process"
    hx-indicator="#loading"
    hx-target="#output">
    処理開始
</button>
```

### ボタンの二重送信防止

```html
<!-- hx-disabled-elt でリクエスト中にボタンを無効化 -->
<button 
    hx-post="/api/order"
    hx-disabled-elt="this"
    hx-target="#order-result">
    注文する
</button>

<!-- フォーム全体の送信ボタンを無効化 -->
<form hx-post="/api/submit" hx-disabled-elt="find button[type='submit']">
    <input name="data" type="text">
    <button type="submit">送信</button>
</form>
```

---

## WebSocketとServer-Sent Events

HTMXはリアルタイム通信のための2つの仕組みをサポートしている。

### WebSocket

WebSocketは双方向のリアルタイム通信を実現する。チャットアプリや、双方向のデータ同期に適している。

```html
<!-- WebSocket接続の確立 -->
<div hx-ext="ws" ws-connect="/ws/chat">
    <!-- この要素内でWebSocket通信が有効になる -->
    
    <div id="chat-messages">
        <!-- サーバーからのメッセージがここに追加される -->
    </div>
    
    <!-- ws-send でWebSocket経由でデータを送信 -->
    <form ws-send>
        <input type="text" name="message" placeholder="メッセージを入力">
        <button type="submit">送信</button>
    </form>
</div>
```

FastAPIでのWebSocket実装。

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from typing import List
import json

app = FastAPI()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # クライアントからのデータを受信
            data = await websocket.receive_text()
            form_data = json.loads(data)
            message = form_data.get("message", "")
            
            # HTMXが期待するHTML形式でブロードキャスト
            html_message = f'''
            <div id="chat-messages" hx-swap-oob="beforeend">
                <div class="message">
                    <strong>ユーザー:</strong> {message}
                </div>
            </div>
            '''
            await manager.broadcast(html_message)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
```

### Server-Sent Events（SSE）

SSEはサーバーからクライアントへの一方向リアルタイム通信だ。通知、ライブフィード、プログレス表示に適している。

```html
<!-- SSEの接続 -->
<div hx-ext="sse" sse-connect="/api/events">
    <!-- sse-swap でサーバーからのイベントを受け取る -->
    <div sse-swap="message" hx-target="#notifications" hx-swap="beforeend">
    </div>
    
    <div id="notifications">
        <!-- 通知がここに追加される -->
    </div>
</div>

<!-- 特定のイベント名でフィルタリング -->
<div hx-ext="sse" sse-connect="/api/progress">
    <div 
        sse-swap="progress-update"
        hx-target="#progress-bar"
        hx-swap="outerHTML">
    </div>
    
    <div id="progress-bar">
        <div style="width: 0%">0%</div>
    </div>
</div>
```

FastAPIでのSSE実装。

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import asyncio
import json
import time

app = FastAPI()

async def generate_events():
    """SSEイベントジェネレーター"""
    for i in range(10):
        await asyncio.sleep(1)
        
        # HTMXが期待するHTML断片を生成
        progress = (i + 1) * 10
        html = f'<div id="progress-bar" style="width:{progress}%">{progress}%</div>'
        
        # SSEフォーマット: "event: イベント名\ndata: データ\n\n"
        yield f"event: progress-update\ndata: {html}\n\n"
    
    # 完了イベント
    yield "event: progress-update\ndata: <div id='progress-bar' style='width:100%'>完了!</div>\n\n"

@app.get("/api/progress")
async def progress_stream():
    return StreamingResponse(
        generate_events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Nginx使用時に必要
        }
    )

# 通知のSSEエンドポイント
async def notification_stream(user_id: int):
    """ユーザー固有の通知ストリーム"""
    while True:
        # データベースや Redis から通知をポーリング
        notifications = await get_pending_notifications(user_id)
        
        for notification in notifications:
            html = f'''
            <div class="notification" data-id="{notification['id']}">
                <strong>{notification['title']}</strong>
                <p>{notification['body']}</p>
            </div>
            '''
            yield f"event: message\ndata: {html}\n\n"
            await mark_notification_sent(notification['id'])
        
        await asyncio.sleep(2)  # 2秒ごとにチェック

@app.get("/api/events")
async def events_stream(user_id: int):
    return StreamingResponse(
        notification_stream(user_id),
        media_type="text/event-stream"
    )
```

---

## Alpine.jsとの組み合わせ

HTMXはサーバーとの通信を担い、Alpine.jsはクライアントサイドの状態管理を担う。この組み合わせは「The HAML Stack」とも呼ばれ、非常に強力だ。

### Alpine.jsの基本

```html
<script src="https://unpkg.com/alpinejs@3.14.0" defer></script>
```

```html
<!-- Alpine.jsの基本的な使い方 -->
<div x-data="{ count: 0, name: '' }">
    <input x-model="name" placeholder="名前を入力">
    <p x-text="'こんにちは、' + name + 'さん'"></p>
    
    <button @click="count++">カウント: <span x-text="count"></span></button>
</div>
```

### HTMX + Alpine.js の実践パターン

#### パターン1: モーダルの制御

```html
<div x-data="{ open: false }">
    <!-- HTMX でモーダルのコンテンツを取得し、Alpine.js で表示を制御 -->
    <button 
        @click="open = true"
        hx-get="/modal/user-form"
        hx-target="#modal-content"
        hx-trigger="click">
        新規作成
    </button>
    
    <!-- Alpine.js でモーダルの表示/非表示 -->
    <div x-show="open" 
         @keydown.escape.window="open = false"
         x-transition:enter="transition ease-out duration-200"
         x-transition:enter-start="opacity-0"
         x-transition:enter-end="opacity-100"
         class="modal-overlay">
        <div class="modal-box" @click.outside="open = false">
            <div id="modal-content">
                <!-- HTMX がここにフォームを挿入する -->
            </div>
            <button @click="open = false">閉じる</button>
        </div>
    </div>
</div>
```

#### パターン2: タブUIとHTMX

```html
<div x-data="{ activeTab: 'profile' }">
    <nav class="tab-nav">
        <button 
            @click="activeTab = 'profile'"
            :class="{ 'active': activeTab === 'profile' }"
            hx-get="/tabs/profile"
            hx-target="#tab-content">
            プロフィール
        </button>
        <button 
            @click="activeTab = 'settings'"
            :class="{ 'active': activeTab === 'settings' }"
            hx-get="/tabs/settings"
            hx-target="#tab-content">
            設定
        </button>
        <button 
            @click="activeTab = 'notifications'"
            :class="{ 'active': activeTab === 'notifications' }"
            hx-get="/tabs/notifications"
            hx-target="#tab-content">
            通知
        </button>
    </nav>
    
    <div id="tab-content" hx-get="/tabs/profile" hx-trigger="load">
        読み込み中...
    </div>
</div>
```

#### パターン3: 無限スクロール

```html
<div x-data="{ page: 1, loading: false, hasMore: true }">
    <div id="items">
        <!-- アイテムが表示される -->
    </div>
    
    <!-- Alpine.js の x-intersect を使って自動ロード -->
    <div 
        x-show="hasMore"
        x-intersect="
            if (!loading && hasMore) {
                loading = true;
                $dispatch('load-more', { page: page });
            }
        ">
        <span x-show="loading">読み込み中...</span>
    </div>
    
    <!-- カスタムイベントでHTMXをトリガー -->
    <div 
        id="load-trigger"
        hx-get="/api/items"
        hx-target="#items"
        hx-swap="beforeend"
        hx-trigger="load-more from:body"
        hx-vals='js:{"page": $event.detail.page}'
        @htmx:after-request="
            loading = false;
            page++;
            // サーバーからmoreというデータがなければ終了
            hasMore = $event.detail.xhr.getResponseHeader('X-Has-More') === 'true';
        ">
    </div>
</div>
```

#### パターン4: リアルタイム検索とフィルタリング

```html
<div x-data="{ 
    query: '', 
    selectedCategory: 'all',
    sortBy: 'date'
}">
    <div class="search-controls">
        <input 
            type="text" 
            x-model.debounce.500ms="query"
            @input="$dispatch('search-changed')"
            placeholder="検索...">
        
        <select x-model="selectedCategory" @change="$dispatch('search-changed')">
            <option value="all">すべて</option>
            <option value="tech">テクノロジー</option>
            <option value="design">デザイン</option>
        </select>
        
        <select x-model="sortBy" @change="$dispatch('search-changed')">
            <option value="date">日付順</option>
            <option value="popular">人気順</option>
        </select>
    </div>
    
    <div 
        id="search-results"
        hx-get="/api/search"
        hx-trigger="search-changed from:body"
        hx-vals='js:{"q": query, "category": selectedCategory, "sort": sortBy}'
        hx-target="this">
        検索結果がここに表示されます
    </div>
</div>
```

### HTMX イベントと Alpine.js の連携

HTMXはリクエストのライフサイクルを通じて様々なイベントを発火する。

```html
<div 
    x-data="{ 
        isLoading: false,
        hasError: false,
        errorMessage: ''
    }"
    @htmx:before-request="isLoading = true; hasError = false"
    @htmx:after-request="isLoading = false"
    @htmx:response-error="
        hasError = true; 
        errorMessage = $event.detail.xhr.responseText;
        isLoading = false;
    ">
    
    <div x-show="isLoading" class="loading-indicator">
        処理中...
    </div>
    
    <div x-show="hasError" class="error-banner" x-text="errorMessage"></div>
    
    <button 
        hx-post="/api/submit"
        hx-target="#result"
        :disabled="isLoading">
        送信
    </button>
    
    <div id="result"></div>
</div>
```

---

## FastAPIとの統合

FastAPIはPythonの非同期Webフレームワークで、HTMXとの相性が非常に良い。

### プロジェクトセットアップ

```bash
pip install fastapi uvicorn jinja2 python-multipart
```

```python
# main.py
from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
import uvicorn

app = FastAPI()
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

# サンプルデータ（実際はデータベースを使う）
todos = [
    {"id": 1, "title": "HTMXを学ぶ", "done": True},
    {"id": 2, "title": "FastAPIを学ぶ", "done": False},
    {"id": 3, "title": "プロジェクトを作る", "done": False},
]
next_id = 4

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {
        "request": request,
        "todos": todos
    })

@app.get("/todos", response_class=HTMLResponse)
async def get_todos(request: Request):
    return templates.TemplateResponse("partials/todo-list.html", {
        "request": request,
        "todos": todos
    })

@app.post("/todos", response_class=HTMLResponse)
async def create_todo(request: Request, title: str = Form(...)):
    global next_id
    new_todo = {"id": next_id, "title": title, "done": False}
    todos.append(new_todo)
    next_id += 1
    
    # 新しいアイテムのHTMLだけを返す
    return templates.TemplateResponse("partials/todo-item.html", {
        "request": request,
        "todo": new_todo
    })

@app.put("/todos/{todo_id}/toggle", response_class=HTMLResponse)
async def toggle_todo(request: Request, todo_id: int):
    todo = next((t for t in todos if t["id"] == todo_id), None)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    
    todo["done"] = not todo["done"]
    return templates.TemplateResponse("partials/todo-item.html", {
        "request": request,
        "todo": todo
    })

@app.delete("/todos/{todo_id}", response_class=HTMLResponse)
async def delete_todo(todo_id: int):
    global todos
    todos = [t for t in todos if t["id"] != todo_id]
    # 空のレスポンスで要素を削除
    return HTMLResponse("")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### Jinja2テンプレート

```html
<!-- templates/index.html -->
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Todoアプリ - HTMX + FastAPI</title>
    <script src="https://unpkg.com/htmx.org@2.0.4"></script>
    <link rel="stylesheet" href="/static/style.css">
</head>
<body>
    <div class="container">
        <h1>TodoリストアプリHTMX</h1>
        
        <form hx-post="/todos" 
              hx-target="#todo-list" 
              hx-swap="afterbegin"
              hx-on:htmx:after-request="this.reset()">
            <input type="text" name="title" placeholder="新しいタスクを入力" required>
            <button type="submit">追加</button>
        </form>
        
        <ul id="todo-list">
            {% for todo in todos %}
                {% include "partials/todo-item.html" %}
            {% endfor %}
        </ul>
    </div>
</body>
</html>
```

```html
<!-- templates/partials/todo-item.html -->
<li id="todo-{{ todo.id }}" 
    class="todo-item {% if todo.done %}done{% endif %}">
    <input 
        type="checkbox" 
        {% if todo.done %}checked{% endif %}
        hx-put="/todos/{{ todo.id }}/toggle"
        hx-target="#todo-{{ todo.id }}"
        hx-swap="outerHTML">
    
    <span class="todo-title">{{ todo.title }}</span>
    
    <button 
        hx-delete="/todos/{{ todo.id }}"
        hx-target="#todo-{{ todo.id }}"
        hx-swap="outerHTML swap:0.5s"
        hx-confirm="削除しますか？"
        class="delete-btn">
        削除
    </button>
</li>
```

### HTMXレスポンスヘッダーの活用

FastAPIのHTMXヘッダーを使うと、クライアントへの高度な指示が可能だ。

```python
from fastapi import FastAPI, Response, Form
from fastapi.responses import HTMLResponse

@app.post("/api/create-item")
async def create_item(
    response: Response,
    name: str = Form(...),
    description: str = Form(...)
):
    item = create_in_db(name, description)
    
    # ブラウザのURLを変更（pushState）
    response.headers["HX-Push-Url"] = f"/items/{item.id}"
    
    # 別の要素もリフレッシュ
    response.headers["HX-Trigger"] = "itemCreated"
    
    # 複数のトリガーを発火
    import json
    response.headers["HX-Trigger"] = json.dumps({
        "itemCreated": {"id": item.id},
        "showNotification": {"message": "アイテムを作成しました"}
    })
    
    return HTMLResponse(f"<div id='item-{item.id}'>...</div>")

@app.delete("/api/items/{item_id}")
async def delete_item(item_id: int, response: Response):
    delete_from_db(item_id)
    
    # ページをリダイレクト
    response.headers["HX-Redirect"] = "/items"
    
    return HTMLResponse("")

@app.post("/api/process")
async def process(response: Response):
    result = do_processing()
    
    if result.success:
        # ページ全体を更新（ハードリロードなしで）
        response.headers["HX-Refresh"] = "true"
    
    return HTMLResponse(result.html)
```

### SQLAlchemy連携の実践例

```python
from sqlalchemy import create_engine, Column, Integer, String, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from fastapi import FastAPI, Request, Depends, Form
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

DATABASE_URL = "sqlite:///./todos.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Todo(Base):
    __tablename__ = "todos"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(String(1000))
    done = Column(Boolean, default=False)

Base.metadata.create_all(bind=engine)

app = FastAPI()
templates = Jinja2Templates(directory="templates")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/todos", response_class=HTMLResponse)
async def get_todos(
    request: Request,
    db: Session = Depends(get_db),
    page: int = 1,
    per_page: int = 10
):
    offset = (page - 1) * per_page
    todos = db.query(Todo).offset(offset).limit(per_page).all()
    total = db.query(Todo).count()
    has_more = offset + per_page < total
    
    response = templates.TemplateResponse(
        "partials/todo-list.html",
        {"request": request, "todos": todos, "page": page, "has_more": has_more}
    )
    response.headers["X-Has-More"] = str(has_more).lower()
    return response
```

---

## Express/Node.jsとの統合

Node.jsをバックエンドに使う場合の実装を解説する。

### セットアップ

```bash
npm init -y
npm install express ejs morgan
```

```javascript
// server.js
const express = require('express');
const path = require('path');
const morgan = require('morgan');

const app = express();
const PORT = 3000;

// ミドルウェア設定
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// テンプレートエンジン設定
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// サンプルデータ
let users = [
    { id: 1, name: '田中 太郎', email: 'tanaka@example.com', role: 'admin' },
    { id: 2, name: '佐藤 花子', email: 'sato@example.com', role: 'user' },
    { id: 3, name: '鈴木 次郎', email: 'suzuki@example.com', role: 'user' },
];
let nextId = 4;

// HTMX リクエストを判定するミドルウェア
app.use((req, res, next) => {
    req.isHTMX = req.headers['hx-request'] === 'true';
    req.htmxTarget = req.headers['hx-target'];
    req.htmxTrigger = req.headers['hx-trigger'];
    next();
});

// メインページ
app.get('/', (req, res) => {
    res.render('index', { users, title: 'ユーザー管理' });
});

// ユーザー一覧（HTMX用の部分更新）
app.get('/users', (req, res) => {
    const query = req.query.q || '';
    const filteredUsers = query
        ? users.filter(u => 
            u.name.includes(query) || u.email.includes(query))
        : users;
    
    res.render('partials/user-list', { users: filteredUsers });
});

// ユーザー詳細
app.get('/users/:id', (req, res) => {
    const user = users.find(u => u.id === parseInt(req.params.id));
    if (!user) {
        return res.status(404).send('<p>ユーザーが見つかりません</p>');
    }
    
    if (req.query.edit === 'true') {
        return res.render('partials/user-edit-form', { user });
    }
    
    res.render('partials/user-detail', { user });
});

// ユーザー作成
app.post('/users', (req, res) => {
    const { name, email, role } = req.body;
    
    if (!name || !email) {
        return res.status(400).send('<p class="error">名前とメールは必須です</p>');
    }
    
    const newUser = { id: nextId++, name, email, role: role || 'user' };
    users.push(newUser);
    
    // 新しいユーザーのHTML断片を返す
    res.render('partials/user-row', { user: newUser });
});

// ユーザー更新
app.put('/users/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
        return res.status(404).send('<p>ユーザーが見つかりません</p>');
    }
    
    const { name, email, role } = req.body;
    users[userIndex] = { ...users[userIndex], name, email, role };
    
    res.render('partials/user-row', { user: users[userIndex] });
});

// ユーザー削除
app.delete('/users/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    users = users.filter(u => u.id !== userId);
    
    // 空のレスポンスで要素を削除
    res.send('');
});

app.listen(PORT, () => {
    console.log(`サーバー起動: http://localhost:${PORT}`);
});
```

### EJSテンプレート

```html
<!-- views/index.ejs -->
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= title %></title>
    <script src="https://unpkg.com/htmx.org@2.0.4"></script>
    <style>
        * { box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0; }
        th { background: #f5f5f5; font-weight: 600; }
        tr:hover { background: #fafafa; }
        .btn { padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; }
        .btn-danger { background: #dc3545; color: white; }
        .btn-primary { background: #0066cc; color: white; }
        input, select { padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
        .search-bar { display: flex; gap: 8px; margin-bottom: 20px; }
        .search-bar input { flex: 1; }
    </style>
</head>
<body>
    <h1><%= title %></h1>
    
    <!-- リアルタイム検索 -->
    <div class="search-bar">
        <input 
            type="text" 
            name="q"
            placeholder="名前またはメールで検索..."
            hx-get="/users"
            hx-trigger="keyup delay:300ms"
            hx-target="#user-table-body"
            hx-swap="innerHTML">
    </div>
    
    <!-- 新規ユーザー作成フォーム -->
    <form hx-post="/users" hx-target="#user-table-body" hx-swap="afterbegin"
          hx-on:htmx:after-request="this.reset()">
        <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
            <input type="text" name="name" placeholder="名前" required>
            <input type="email" name="email" placeholder="メール" required>
            <select name="role">
                <option value="user">一般ユーザー</option>
                <option value="admin">管理者</option>
            </select>
            <button type="submit" class="btn btn-primary">追加</button>
        </div>
    </form>
    
    <!-- ユーザーテーブル -->
    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>名前</th>
                <th>メール</th>
                <th>役割</th>
                <th>操作</th>
            </tr>
        </thead>
        <tbody id="user-table-body">
            <%- include('partials/user-list', { users }) %>
        </tbody>
    </table>
</body>
</html>
```

```html
<!-- views/partials/user-list.ejs -->
<% users.forEach(user => { %>
    <%- include('user-row', { user }) %>
<% }); %>
```

```html
<!-- views/partials/user-row.ejs -->
<tr id="user-<%= user.id %>">
    <td><%= user.id %></td>
    <td><%= user.name %></td>
    <td><%= user.email %></td>
    <td><%= user.role %></td>
    <td>
        <button 
            class="btn btn-danger"
            hx-delete="/users/<%= user.id %>"
            hx-target="#user-<%= user.id %>"
            hx-swap="outerHTML swap:0.5s"
            hx-confirm="<%= user.name %> を削除しますか？">
            削除
        </button>
    </td>
</tr>
```

### Expressでのミドルウェアパターン

```javascript
// HTMXリクエスト専用のレスポンスヘルパー
function htmxHelpers(req, res, next) {
    // 部分テンプレートを簡単に返すヘルパー
    res.htmx = {
        // ページ全体をリフレッシュ
        refresh: () => {
            res.set('HX-Refresh', 'true');
            res.send('');
        },
        
        // URLをプッシュ
        pushUrl: (url) => {
            res.set('HX-Push-Url', url);
        },
        
        // クライアントサイドイベントを発火
        trigger: (event, detail = null) => {
            if (detail) {
                res.set('HX-Trigger', JSON.stringify({ [event]: detail }));
            } else {
                res.set('HX-Trigger', event);
            }
        },
        
        // リダイレクト
        redirect: (url) => {
            res.set('HX-Redirect', url);
            res.send('');
        },
        
        // スワップ方式を上書き
        reswap: (method) => {
            res.set('HX-Reswap', method);
        },
        
        // ターゲットを上書き
        retarget: (selector) => {
            res.set('HX-Retarget', selector);
        },
    };
    
    next();
}

app.use(htmxHelpers);

// 使用例
app.post('/api/critical-action', (req, res) => {
    try {
        const result = performAction(req.body);
        
        res.htmx.trigger('actionSuccess', { message: '成功しました' });
        res.htmx.pushUrl('/success');
        
        res.render('partials/success-message', { result });
    } catch (error) {
        res.status(500).render('partials/error-message', { error: error.message });
    }
});
```

---

## セキュリティ：CSRF対策

HTMXを使う場合、CSRF（クロスサイトリクエストフォージェリ）対策は必須だ。

### FastAPIでのCSRF対策

```python
import secrets
from fastapi import FastAPI, Request, HTTPException, Depends, Form, Cookie
from fastapi.responses import HTMLResponse, Response
import hmac
import hashlib
import time

app = FastAPI()

SECRET_KEY = secrets.token_hex(32)

def generate_csrf_token(session_id: str) -> str:
    """セッションIDからCSRFトークンを生成"""
    timestamp = str(int(time.time() // 3600))  # 1時間単位
    message = f"{session_id}:{timestamp}"
    signature = hmac.new(
        SECRET_KEY.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    return f"{timestamp}:{signature}"

def verify_csrf_token(token: str, session_id: str) -> bool:
    """CSRFトークンを検証"""
    try:
        parts = token.split(':')
        if len(parts) != 2:
            return False
        
        timestamp, signature = parts
        current_timestamp = str(int(time.time() // 3600))
        
        # 1時間以内のトークンのみ受け付ける
        if abs(int(current_timestamp) - int(timestamp)) > 1:
            return False
        
        message = f"{session_id}:{timestamp}"
        expected_signature = hmac.new(
            SECRET_KEY.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected_signature)
    except Exception:
        return False

def get_csrf_token(session_id: str = Cookie(default=None)) -> str:
    if not session_id:
        raise HTTPException(status_code=403, detail="セッションが無効です")
    return generate_csrf_token(session_id)

def validate_csrf(
    request: Request,
    session_id: str = Cookie(default=None)
) -> None:
    """CSRFトークンを検証するDependency"""
    # HTMXリクエストの判定
    if request.headers.get("HX-Request") != "true":
        return  # 通常のリクエストはスキップ
    
    csrf_token = request.headers.get("X-CSRF-Token")
    if not csrf_token:
        raise HTTPException(status_code=403, detail="CSRFトークンがありません")
    
    if not session_id or not verify_csrf_token(csrf_token, session_id):
        raise HTTPException(status_code=403, detail="CSRFトークンが無効です")

@app.get("/", response_class=HTMLResponse)
async def index(request: Request, session_id: str = Cookie(default=None)):
    if not session_id:
        session_id = secrets.token_urlsafe(32)
    
    csrf_token = generate_csrf_token(session_id)
    
    response = HTMLResponse(content=f"""
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <script src="https://unpkg.com/htmx.org@2.0.4"></script>
        <script>
            // すべてのHTMXリクエストにCSRFトークンを追加
            document.body.addEventListener('htmx:configRequest', function(event) {{
                event.detail.headers['X-CSRF-Token'] = '{csrf_token}';
            }});
        </script>
    </head>
    <body>
        <form hx-post="/api/action">
            <input type="text" name="data" placeholder="データを入力">
            <button type="submit">送信</button>
        </form>
    </body>
    </html>
    """)
    response.set_cookie(key="session_id", value=session_id, httponly=True, samesite="strict")
    return response

@app.post("/api/action", dependencies=[Depends(validate_csrf)])
async def action(data: str = Form(...)):
    return HTMLResponse(f"<p>受信: {data}</p>")
```

### ExpressでのCSRF対策

```javascript
const express = require('express');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');

const app = express();
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

const SECRET_KEY = crypto.randomBytes(32).toString('hex');

function generateCsrfToken(sessionId) {
    const timestamp = Math.floor(Date.now() / 3600000).toString(); // 1時間単位
    const message = `${sessionId}:${timestamp}`;
    const signature = crypto
        .createHmac('sha256', SECRET_KEY)
        .update(message)
        .digest('hex');
    return `${timestamp}:${signature}`;
}

function verifyCsrfToken(token, sessionId) {
    if (!token || !sessionId) return false;
    
    try {
        const [timestamp, signature] = token.split(':');
        const currentTimestamp = Math.floor(Date.now() / 3600000).toString();
        
        if (Math.abs(parseInt(currentTimestamp) - parseInt(timestamp)) > 1) {
            return false;
        }
        
        const message = `${sessionId}:${timestamp}`;
        const expectedSignature = crypto
            .createHmac('sha256', SECRET_KEY)
            .update(message)
            .digest('hex');
        
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    } catch {
        return false;
    }
}

// CSRFバリデーションミドルウェア
function csrfProtect(req, res, next) {
    // GETリクエストはスキップ
    if (req.method === 'GET' || req.method === 'HEAD') {
        return next();
    }
    
    // HTMXリクエストの判定
    if (req.headers['hx-request'] !== 'true') {
        return next(); // 通常のフォーム送信はSameSite Cookieで保護
    }
    
    const csrfToken = req.headers['x-csrf-token'];
    const sessionId = req.cookies.session_id;
    
    if (!verifyCsrfToken(csrfToken, sessionId)) {
        return res.status(403).send('<p class="error">CSRF検証に失敗しました</p>');
    }
    
    next();
}

app.use(csrfProtect);

// HTMXリクエストへのセキュリティヘッダー
app.use((req, res, next) => {
    res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
    });
    next();
});
```

### Content Security Policy（CSP）の設定

```python
# FastAPIでのCSPヘッダー設定
from fastapi import FastAPI
from fastapi.middleware.trustedhost import TrustedHostMiddleware

@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' https://unpkg.com; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "connect-src 'self' wss://;"
    )
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response
```

---

## パフォーマンス最適化とベストプラクティス

### 1. レスポンスの最適化

HTMXはサーバーからHTMLを受け取るため、サーバーサイドのレンダリングパフォーマンスが重要だ。

```python
from functools import lru_cache
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
import redis

app = FastAPI()
redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

@app.get("/api/popular-items")
async def get_popular_items():
    # Redisキャッシュを確認
    cached = redis_client.get("popular_items_html")
    if cached:
        return HTMLResponse(cached)
    
    # データベースから取得
    items = fetch_popular_items()
    html = render_items_html(items)
    
    # 10分間キャッシュ
    redis_client.setex("popular_items_html", 600, html)
    
    return HTMLResponse(html)
```

### 2. レスポンスのGzip圧縮

```python
from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(GZipMiddleware, minimum_size=1000)
```

```javascript
// Express
const compression = require('compression');
app.use(compression());
```

### 3. 部分テンプレートの設計原則

```html
<!-- 悪い例: テーブル全体を返す -->
<!-- /api/search のレスポンス -->
<table>
    <thead>...</thead>
    <tbody>
        <tr>...</tr>
    </tbody>
</table>

<!-- 良い例: tbody の内容だけを返す -->
<!-- /api/search のレスポンス -->
<tr>...</tr>
<tr>...</tr>
<tr>...</tr>
```

テンプレートの断片化を適切に設計することで、不必要なデータの転送を防げる。

### 4. hx-boost によるSPAライクな体験

`hx-boost`はページ全体のリンクとフォームをAJAXリクエストに変換し、ページ遷移をスムーズにする。

```html
<!-- body要素に付与すると全リンク・フォームに適用 -->
<body hx-boost="true">
    <nav>
        <a href="/">ホーム</a>
        <a href="/about">会社概要</a>
        <a href="/contact">お問い合わせ</a>
    </nav>
    
    <!-- これらのリンクはすべてAJAXで動く -->
    <main>
        <h1>コンテンツ</h1>
    </main>
</body>
```

```html
<!-- 特定のリンクだけに適用 -->
<nav hx-boost="true">
    <a href="/page1">ページ1</a>
    <a href="/page2">ページ2</a>
    <!-- hx-boost="false" で個別に無効化 -->
    <a href="/external-page" hx-boost="false" target="_blank">外部ページ</a>
</nav>
```

### 5. hx-push-url でブラウザ履歴を管理

```html
<!-- URLを更新してブラウザの戻るボタンを有効化 -->
<a 
    href="/articles/htmx-guide"
    hx-get="/articles/htmx-guide"
    hx-target="#main-content"
    hx-push-url="true">
    HTMX完全ガイドを読む
</a>

<!-- 特定のURLをプッシュ -->
<button 
    hx-post="/api/filter"
    hx-target="#results"
    hx-push-url="/articles?category=tech&sort=date">
    テクノロジー記事でフィルタ
</button>
```

### 6. hx-select で必要な部分だけを取り出す

```html
<!-- サーバーのレスポンスから特定の要素だけを取り出す -->
<button 
    hx-get="/full-page"
    hx-select="#sidebar-content"
    hx-target="#sidebar">
    サイドバーを更新
</button>

<!-- hx-select-oob: OOBスワップで複数箇所を更新 -->
```

### 7. OOB（Out-of-Band）スワップ

一度のリクエストで複数のDOM要素を更新できる。

```python
@app.post("/api/add-to-cart")
async def add_to_cart(product_id: int = Form(...)):
    cart = add_item_to_cart(product_id)
    
    # メインコンテンツ + カートカウンターの2箇所を更新
    html = f"""
    <div class="success-message">
        商品をカートに追加しました
    </div>
    
    <!-- hx-swap-oob="true" で追加の要素を更新 -->
    <span id="cart-count" hx-swap-oob="true">
        {cart.total_items}
    </span>
    
    <!-- カートサマリーも更新 -->
    <div id="cart-summary" hx-swap-oob="innerHTML">
        <p>合計: {cart.total_price}円</p>
    </div>
    """
    return HTMLResponse(html)
```

### 8. Lazy Loading パターン

```html
<!-- スクロールで画像が見えたときに読み込む -->
<img 
    src="placeholder.jpg"
    hx-get="/api/images/42"
    hx-trigger="intersect"
    hx-swap="outerHTML"
    alt="読み込み中">

<!-- コンテンツの遅延読み込み -->
<section 
    hx-get="/api/recommendations"
    hx-trigger="intersect once"
    hx-target="this"
    hx-swap="outerHTML"
    class="lazy-section">
    <div class="skeleton-loader">
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
    </div>
</section>
```

### 9. エラーハンドリング

```html
<script>
    // グローバルなエラーハンドリング
    document.body.addEventListener('htmx:responseError', function(event) {
        const status = event.detail.xhr.status;
        const message = (() => {
            switch(status) {
                case 400: return '入力内容に誤りがあります';
                case 401: return 'ログインが必要です';
                case 403: return 'この操作は許可されていません';
                case 404: return 'リソースが見つかりません';
                case 429: return 'リクエストが多すぎます。しばらくお待ちください';
                case 500: return 'サーバーエラーが発生しました';
                default:  return '予期しないエラーが発生しました';
            }
        })();
        
        showNotification(message, 'error');
    });
    
    // ネットワークエラーのハンドリング
    document.body.addEventListener('htmx:sendError', function(event) {
        showNotification('ネットワークエラーが発生しました。接続を確認してください', 'error');
    });
    
    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.getElementById('notifications').appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }
</script>

<div id="notifications" aria-live="polite"></div>
```

### 10. デバッグとロギング

```html
<script>
    // HTMXのデバッグログを有効化
    htmx.logger = function(elt, event, data) {
        if(console) {
            console.log("HTMX Event:", event, elt, data);
        }
    };
    
    // 特定のイベントを監視
    document.body.addEventListener('htmx:beforeRequest', function(event) {
        console.log('リクエスト開始:', event.detail.requestConfig);
    });
    
    document.body.addEventListener('htmx:afterRequest', function(event) {
        console.log('リクエスト完了:', event.detail.xhr.status);
    });
</script>
```

---

## テストの書き方

HTMXアプリケーションのテスト戦略を解説する。

### FastAPIのユニットテスト

```python
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_get_todos():
    """Todo一覧の取得テスト"""
    response = client.get(
        "/todos",
        headers={"HX-Request": "true"}
    )
    assert response.status_code == 200
    assert "<li" in response.text  # リストアイテムが存在する

def test_create_todo():
    """Todo作成テスト"""
    response = client.post(
        "/todos",
        data={"title": "テストタスク"},
        headers={"HX-Request": "true"}
    )
    assert response.status_code == 200
    assert "テストタスク" in response.text

def test_delete_todo():
    """Todo削除テスト"""
    # まずTodoを作成
    create_response = client.post("/todos", data={"title": "削除用タスク"})
    todo_id = extract_id_from_response(create_response.text)
    
    # 削除
    response = client.delete(f"/todos/{todo_id}")
    assert response.status_code == 200
    assert response.text == ""  # 空レスポンスで要素削除を確認

def test_toggle_todo():
    """Todo完了/未完了の切り替えテスト"""
    create_response = client.post("/todos", data={"title": "切り替えテスト"})
    todo_id = extract_id_from_response(create_response.text)
    
    # 未完了から完了へ
    response = client.put(f"/todos/{todo_id}/toggle")
    assert response.status_code == 200
    assert 'class="todo-item done"' in response.text

def test_csrf_protection():
    """CSRFトークンなしのリクエストがブロックされることを確認"""
    response = client.post(
        "/api/secure-endpoint",
        headers={"HX-Request": "true"}  # X-CSRF-Tokenなし
    )
    assert response.status_code == 403
```

### PlaywrightによるE2Eテスト

```python
# tests/e2e/test_htmx_app.py
from playwright.sync_api import Page, expect

def test_todo_crud(page: Page):
    """TodoのCRUD操作のE2Eテスト"""
    page.goto("http://localhost:8000")
    
    # タスクの追加
    page.fill('input[name="title"]', "E2Eテストタスク")
    page.click('button[type="submit"]')
    
    # タスクが追加されたことを確認
    expect(page.locator("#todo-list")).to_contain_text("E2Eテストタスク")
    
    # タスクの完了
    page.click('input[type="checkbox"]:last-child')
    
    # タスクが完了状態になったことを確認
    expect(page.locator(".todo-item.done")).to_be_visible()
    
    # タスクの削除
    page.click('.delete-btn:last-child')
    page.wait_for_timeout(600)  # アニメーション待ち
    
    # タスクが削除されたことを確認
    expect(page.locator("#todo-list")).not_to_contain_text("E2Eテストタスク")

def test_real_time_search(page: Page):
    """リアルタイム検索のE2Eテスト"""
    page.goto("http://localhost:8000/users")
    
    # 検索入力
    page.fill('input[name="q"]', "田中")
    page.wait_for_timeout(400)  # デバウンス待ち
    
    # 検索結果に田中が含まれることを確認
    expect(page.locator("#search-results")).to_contain_text("田中")
    
    # 田中以外のユーザーが表示されないことを確認
    expect(page.locator("#search-results")).not_to_contain_text("佐藤")
```

---

## まとめと今後の展望

HTMXは、Web開発を「シンプルさへの回帰」という観点から見直すための強力なツールだ。JavaScriptフレームワークの複雑さに疲れた開発者にとって、HTMXは清涼剤となる。

### HTMXが向いているプロジェクト

- スタートアップの初期MVP
- バックオフィスツールや管理画面
- コンテンツ管理システム
- 既存のサーバーサイドアプリへの動的機能追加

### HTMXを選ぶべきでないプロジェクト

- モバイルアプリと同等の体験が必要なプロダクト
- オフライン対応が必須のアプリ
- 複雑な状態管理が必要なもの（例: 大規模なeコマースの決済フロー）

### 今後の展望

HTMXは2.0系で大幅な改善が施された。今後はView Transitions APIとの統合、Web ComponentsやWeb Workerとの連携なども期待される。また、Leptos（Rust）、Phoenix LiveView（Elixir）、Rails Turbo（Ruby）など、同様のHypermedia駆動アーキテクチャを採用したフレームワークも台頭しており、「サーバーサイドHTMLを返す」アーキテクチャは一定の評価を得ていることが分かる。

---

## 開発ツールの紹介

HTMXを使った開発をより効率よく進めるために、**DevToolBox**（[https://usedevtools.com](https://usedevtools.com)）の活用を強くお勧めする。

DevToolBoxはWeb開発者のための統合ツールプラットフォームであり、HTMLの整形・バリデーション、JSONのビジュアライズ、HTTP APIのテスト、正規表現の検証、Markdownプレビューなど多数のツールを提供している。

HTMXの開発で特に役立つ機能として以下が挙げられる。

- **HTTP Request Tester**: HTMXがサーバーに送るリクエストを事前に確認し、レスポンスHTMLを検証できる
- **HTML Formatter/Validator**: Jinja2やEJSで生成したHTML断片の構文チェックと整形
- **JSON Formatter**: HTMXのレスポンスヘッダー（HX-Trigger）に含むJSONのデバッグ
- **Regex Tester**: HTMXのCSSセレクターのデバッグ補助

ブラウザだけで完結するため、インストール不要で即座に使い始められる。HTMXプロジェクトの開発効率を上げたい方はぜひ試してほしい。

---

HTMXは「最新技術を追い続ける」ことへの疲弊感が広まる中で、Webの本質であるシンプルさを取り戻す選択肢として注目を集めている。完璧な銀の弾丸は存在しないが、適切なユースケースでHTMXを選ぶことは、開発速度・保守性・パフォーマンスの三つを同時に向上させる賢明な判断になりうる。本記事が皆さんのHTMX入門の一助となれば幸いだ。

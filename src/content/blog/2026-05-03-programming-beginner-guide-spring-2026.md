---
title: "プログラミング学習の始め方2026春｜初心者が最短で成果を出す完全ガイド"
description: "2026年春からプログラミングを始める初心者向けの完全ガイド。目的別の言語選びフローチャート、VS Code環境構築の手順、最初の30日間ロードマップ、無料学習リソース一覧、挫折率90%を乗り越える5つの実践戦略まで網羅。AI時代に求められる学習法と未経験からの転職成功のコツも解説します。"
pubDate: "2026-02-25"
tags: ["school", "プログラミング学習", "プログラミング", "スキルアップ"]
heroImage: '../../assets/thumbnails/2026-05-03-programming-beginner-guide-spring-2026.jpg'
---

# プログラミング学習の始め方2026春｜初心者が最短で成果を出す完全ガイド

「プログラミングを始めたいけど、何から手をつければいいかわからない」。そんな悩みを抱えている人は多い。本記事では、2026年春からプログラミング学習を始める初心者に向けて、**言語選びから環境構築、30日間の学習計画、挫折対策**まで完全網羅する。

---

## なぜ2026年春がプログラミング学習の始めどきなのか

### 新年度のモチベーションを活かせる

4月・5月は新年度のスタート。転職・キャリアチェンジを考える人が増え、「今年こそ新しいスキルを身につけたい」という気持ちが最も高まる時期だ。この勢いを活かさない手はない。

### IT人材の需要は依然として拡大中

経済産業省の調査によると、2030年には最大79万人のIT人材が不足すると予測されている。2026年現在もエンジニア求人は増加傾向にあり、未経験からの転職を受け入れる企業も増えている。

具体的な求人動向を見てみよう。

- **Web開発エンジニア**: 未経験歓迎求人が前年比15%増加
- **データ分析・AI関連**: 年収500万円以上のポジションが急増
- **モバイルアプリ開発**: iOS/Androidともに人材不足が深刻化
- **インフラ・クラウド**: AWS/GCP関連のリモート求人が拡大

### 教育訓練給付金の活用チャンス

プログラミングスクールの受講料が最大70%オフになる**専門実践教育訓練給付金**制度がある。雇用保険に2年以上加入していれば対象となる可能性がある。2026年度も制度は継続中で、対象スクールも拡大している。

| 給付金の種類 | 給付率 | 上限額 |
|:---|:---|:---|
| 一般教育訓練給付金 | 受講料の20% | 10万円 |
| 特定一般教育訓練給付金 | 受講料の40% | 20万円 |
| 専門実践教育訓練給付金 | 受講料の最大70% | 56万円 |

この制度を活用すれば、50万円以上するスクールの受講料を大幅に抑えられる。

### 学習環境が過去最高に整っている

2026年現在、プログラミング学習の環境はかつてないほど充実している。

- **AIコーディングアシスタント**が普及し、初心者でもエラー解決が容易に
- **無料学習プラットフォーム**の質が大幅に向上
- **オンラインコミュニティ**での質問・交流が活発化
- **クラウド開発環境**で高性能PCがなくても開発可能

---

## まず何の言語を学ぶべき？目的別言語選びガイド

プログラミング初心者が最初にぶつかる壁が「どの言語を学ぶか」だ。結論から言うと、**目的で選ぶ**のが最も失敗しにくい。

### Web開発がしたい → JavaScript / TypeScript

Webサイトやwebアプリケーションを作りたいなら、**JavaScript**一択だ。フロントエンド（画面側）は必ずJavaScriptを使う。さらに、Node.jsを使えばバックエンド（サーバー側）もJavaScriptで書ける。

2026年の現場では、JavaScriptの上位互換である**TypeScript**が事実上の標準になっている。まずJavaScriptの基礎を固めてからTypeScriptに移行するのが王道ルートだ。

```javascript
// JavaScriptの基本例：画面にメッセージを表示
const greeting = "プログラミング学習スタート！";
console.log(greeting);

// 関数を定義して再利用する
function calculateAge(birthYear) {
  const currentYear = 2026;
  return currentYear - birthYear;
}

console.log(calculateAge(2000)); // 26
```

**JavaScriptを選ぶメリット**:
- 学習リソースが圧倒的に豊富
- ブラウザだけで動作確認できる
- フロントエンドもバックエンドも1言語で対応可能
- 求人数がプログラミング言語中トップクラス

### AI・データ分析がしたい → Python

機械学習、データサイエンス、AI開発に興味があるなら**Python**が最適だ。文法がシンプルで初心者にも読みやすく、ライブラリが非常に充実している。

```python
# Pythonの基本例：データ分析の入口
numbers = [85, 92, 78, 96, 88, 73, 91]

# 平均点を計算
average = sum(numbers) / len(numbers)
print(f"平均点: {average:.1f}")  # 平均点: 86.1

# 80点以上の数をカウント
high_scores = [n for n in numbers if n >= 80]
print(f"80点以上: {len(high_scores)}人")  # 80点以上: 5人
```

**Pythonを選ぶメリット**:
- 文法がシンプルで直感的
- AI/機械学習ライブラリ（TensorFlow, PyTorch）が充実
- データ分析（pandas, NumPy）との相性が抜群
- 自動化スクリプトにも活用可能

### モバイルアプリを作りたい → Swift / Kotlin

iPhoneアプリなら**Swift**、Androidアプリなら**Kotlin**を学ぶ。どちらも公式に推奨されている言語であり、学習情報も豊富だ。

両プラットフォームに対応したい場合は、**Flutter（Dart言語）**や**React Native（JavaScript）**というクロスプラットフォーム開発も選択肢に入る。

### ゲーム開発がしたい → C# / Unity

ゲーム開発なら**C#**と**Unity**の組み合わせが定番だ。Unityは個人開発者向けに無料プランを提供しており、2D/3Dゲームの制作が可能。インディーゲームの開発やVR/AR開発にも対応している。

### 目的別言語選び判定フローチャート

迷ったら以下のフローで判断しよう。

```
[何を作りたい？]
  │
  ├─ Webサイト・Webアプリ
  │   └─→ JavaScript → TypeScript
  │
  ├─ AI・データ分析・自動化
  │   └─→ Python
  │
  ├─ スマホアプリ
  │   ├─ iPhoneのみ → Swift
  │   ├─ Androidのみ → Kotlin
  │   └─ 両方 → Flutter (Dart) or React Native (JS)
  │
  ├─ ゲーム開発
  │   └─→ C# + Unity
  │
  └─ 特に決まっていない
      └─→ JavaScript（汎用性が最も高い）
```

**迷ったらJavaScript**。これが2026年時点でも変わらない鉄板の回答だ。Webブラウザだけで学習を始められ、成果物が目に見えやすいため、モチベーションを維持しやすい。

---

## 開発環境の構築

プログラミングを始めるには、まず開発環境を整える必要がある。難しそうに聞こえるが、2026年は驚くほど簡単にセットアップできる。

### VS Code（Visual Studio Code）のインストール

プログラミングエディタのデファクトスタンダードが**VS Code**だ。無料で、Windows/Mac/Linuxすべてに対応している。

**インストール手順**:

1. [https://code.visualstudio.com/](https://code.visualstudio.com/) にアクセス
2. 使用しているOSに合ったインストーラーをダウンロード
3. インストーラーを実行して画面の指示に従う
4. 起動して日本語拡張を追加する

### Mac向けセットアップ

Macは開発環境の構築が比較的簡単だ。

```bash
# 1. Homebrewのインストール（パッケージマネージャー）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Node.jsのインストール（JavaScript実行環境）
brew install node

# 3. バージョン確認
node --version   # v22.x.x と表示されればOK
npm --version    # 10.x.x と表示されればOK

# 4. Gitのインストール（バージョン管理）
brew install git
git --version
```

### Windows向けセットアップ

Windowsの場合は、**WSL2（Windows Subsystem for Linux）**の導入を推奨する。Linux環境が使えることで、実務に近い開発体験が得られる。

```powershell
# 1. PowerShellを管理者権限で開き、WSL2をインストール
wsl --install

# 2. 再起動後、Ubuntuが自動セットアップされる

# 3. Ubuntu上でNode.jsをインストール
sudo apt update
sudo apt install -y nodejs npm

# 4. バージョン確認
node --version
npm --version
```

WSL2が難しいと感じる場合は、[https://nodejs.org/](https://nodejs.org/) からNode.jsのインストーラーを直接ダウンロードしてもよい。

### VS Code おすすめ拡張機能5選

| 拡張機能 | 説明 |
|:---|:---|
| **Japanese Language Pack** | VS Codeの日本語化 |
| **ESLint** | JavaScriptのコード品質チェック |
| **Prettier** | コードの自動フォーマット |
| **Live Server** | HTMLファイルをリアルタイムプレビュー |
| **Auto Rename Tag** | HTMLタグの開始・終了を自動で連動修正 |

インストール方法は、VS Code左側の拡張機能アイコン（四角が4つのマーク）をクリックし、検索バーに名前を入力してインストールボタンを押すだけだ。

### ターミナルの基礎コマンド

ターミナル（コマンドライン）はプログラミングに必須のツール。最初に覚えるべきコマンドは5つだけだ。

```bash
# 現在のディレクトリを表示
pwd

# ディレクトリ内のファイル一覧を表示
ls

# ディレクトリを移動
cd フォルダ名

# 新しいディレクトリを作成
mkdir フォルダ名

# ファイルの中身を表示
cat ファイル名
```

これだけ覚えれば学習初期は十分だ。

---

## 最初の30日間ロードマップ

ここからが本題だ。**30日間の具体的な学習計画**を示す。1日あたり1〜2時間の学習を前提としている。

### Week 1（Day 1〜7）: HTML/CSS基礎

**目標**: 静的なWebページを1枚作れるようになる

| Day | 学習内容 | 成果物 |
|:---|:---|:---|
| Day 1 | HTMLの基本構造、見出し・段落・リスト | 自己紹介ページの骨組み |
| Day 2 | リンク、画像、テーブルの使い方 | 画像付きプロフィールページ |
| Day 3 | CSSの基礎（色、フォント、余白） | スタイル付き自己紹介ページ |
| Day 4 | CSSレイアウト（Flexbox） | 2カラムレイアウトのページ |
| Day 5 | CSSレイアウト（Grid） | ポートフォリオ風レイアウト |
| Day 6 | レスポンシブデザインの基礎 | スマホ対応ページ |
| Day 7 | Week 1の復習＋自己紹介サイト完成 | **成果物: 自己紹介サイト** |

```html
<!-- Day 1で作るHTMLの例 -->
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>自己紹介ページ</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header>
    <h1>山田太郎のポートフォリオ</h1>
    <nav>
      <a href="#about">自己紹介</a>
      <a href="#skills">スキル</a>
      <a href="#contact">連絡先</a>
    </nav>
  </header>
  <main>
    <section id="about">
      <h2>自己紹介</h2>
      <p>2026年春からプログラミングを学び始めました。</p>
    </section>
    <section id="skills">
      <h2>学習中のスキル</h2>
      <ul>
        <li>HTML / CSS</li>
        <li>JavaScript</li>
      </ul>
    </section>
  </main>
</body>
</html>
```

### Week 2（Day 8〜14）: JavaScript入門

**目標**: JavaScriptの基本文法を理解し、簡単な処理を書けるようになる

| Day | 学習内容 | 練習課題 |
|:---|:---|:---|
| Day 8 | 変数（let, const）、データ型 | 年齢計算プログラム |
| Day 9 | 条件分岐（if, switch） | おみくじプログラム |
| Day 10 | 繰り返し（for, while） | FizzBuzzプログラム |
| Day 11 | 関数の定義と呼び出し | BMI計算関数 |
| Day 12 | 配列とオブジェクト | 買い物リスト管理 |
| Day 13 | 配列メソッド（map, filter, reduce） | データ集計プログラム |
| Day 14 | Week 2の復習＋ミニプロジェクト | **成果物: じゃんけんゲーム** |

```javascript
// Day 9の練習：おみくじプログラム
function drawFortune() {
  const fortunes = [
    { result: "大吉", message: "最高の運勢です！何を始めるにも絶好の日。" },
    { result: "吉",   message: "良い運勢です。着実に進めましょう。" },
    { result: "中吉", message: "まずまずの運勢。努力が実を結びます。" },
    { result: "小吉", message: "穏やかな一日になるでしょう。" },
    { result: "凶",   message: "慎重に行動しましょう。明日に期待。" },
  ];

  const index = Math.floor(Math.random() * fortunes.length);
  const fortune = fortunes[index];

  console.log(`【${fortune.result}】${fortune.message}`);
}

drawFortune();
```

### Week 3（Day 15〜21）: DOM操作・イベント処理

**目標**: JavaScriptでWebページを動的に操作できるようになる

| Day | 学習内容 | 練習課題 |
|:---|:---|:---|
| Day 15 | DOM要素の取得と操作 | ボタンクリックで文字変更 |
| Day 16 | イベントリスナーの使い方 | カウンターアプリ |
| Day 17 | フォーム入力の取得と処理 | 入力バリデーション |
| Day 18 | 動的な要素の追加・削除 | Todoリストの基本機能 |
| Day 19 | ローカルストレージの活用 | データの永続化 |
| Day 20 | CSSクラスの動的切り替え | テーマ切り替え機能 |
| Day 21 | Week 3の復習＋機能統合 | **成果物: Todoアプリ** |

### Week 4（Day 22〜30）: 初めてのWebアプリ作成

**目標**: 学んだ知識を統合し、一つのWebアプリを完成させる

| Day | 学習内容 | 作業内容 |
|:---|:---|:---|
| Day 22 | プロジェクト設計・要件定義 | 機能一覧と画面設計を作成 |
| Day 23 | HTML構造の実装 | アプリの骨組みを作成 |
| Day 24 | CSSでデザイン実装 | レスポンシブ対応含む |
| Day 25 | JavaScriptで基本機能実装 | CRUD操作の実装 |
| Day 26 | 追加機能の実装 | フィルター・検索機能 |
| Day 27 | ローカルストレージ連携 | データ永続化 |
| Day 28 | デバッグ・リファクタリング | コード整理とバグ修正 |
| Day 29 | GitHubにコードを公開 | バージョン管理の実践 |
| Day 30 | GitHub Pagesでデプロイ | **成果物: 公開Webアプリ** |

### 30日後に完成するWebアプリの例

以下は、30日間の学習成果として作るTodoアプリのコード例だ。

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Todoアプリ</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 0 20px; }
    h1 { text-align: center; margin-bottom: 20px; color: #333; }
    .input-area { display: flex; gap: 8px; margin-bottom: 20px; }
    .input-area input {
      flex: 1; padding: 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 16px;
    }
    .input-area button {
      padding: 10px 20px; background: #4CAF50; color: white;
      border: none; border-radius: 6px; cursor: pointer; font-size: 16px;
    }
    .todo-item {
      display: flex; align-items: center; padding: 12px;
      border-bottom: 1px solid #eee; gap: 12px;
    }
    .todo-item.done span { text-decoration: line-through; color: #999; }
    .todo-item span { flex: 1; font-size: 16px; }
    .delete-btn {
      background: #ff4444; color: white; border: none;
      padding: 6px 12px; border-radius: 4px; cursor: pointer;
    }
    .stats { text-align: center; margin-top: 20px; color: #666; }
  </style>
</head>
<body>
  <h1>My Todo</h1>
  <div class="input-area">
    <input type="text" id="todoInput" placeholder="タスクを入力...">
    <button onclick="addTodo()">追加</button>
  </div>
  <div id="todoList"></div>
  <p class="stats" id="stats"></p>
  <script src="app.js"></script>
</body>
</html>
```

```javascript
// app.js
let todos = JSON.parse(localStorage.getItem("todos")) || [];

function saveTodos() {
  localStorage.setItem("todos", JSON.stringify(todos));
}

function renderTodos() {
  const list = document.getElementById("todoList");
  const stats = document.getElementById("stats");
  list.innerHTML = "";

  todos.forEach((todo, index) => {
    const item = document.createElement("div");
    item.className = `todo-item ${todo.done ? "done" : ""}`;
    item.innerHTML = `
      <input type="checkbox" ${todo.done ? "checked" : ""}
        onchange="toggleTodo(${index})">
      <span>${todo.text}</span>
      <button class="delete-btn" onclick="deleteTodo(${index})">削除</button>
    `;
    list.appendChild(item);
  });

  const doneCount = todos.filter((t) => t.done).length;
  stats.textContent = `完了: ${doneCount} / ${todos.length}`;
}

function addTodo() {
  const input = document.getElementById("todoInput");
  const text = input.value.trim();
  if (!text) return;

  todos.push({ text, done: false });
  input.value = "";
  saveTodos();
  renderTodos();
}

function toggleTodo(index) {
  todos[index].done = !todos[index].done;
  saveTodos();
  renderTodos();
}

function deleteTodo(index) {
  todos.splice(index, 1);
  saveTodos();
  renderTodos();
}

// Enterキーで追加
document.getElementById("todoInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") addTodo();
});

// 初期描画
renderTodos();
```

このTodoアプリには以下の機能が含まれている。

- タスクの追加・完了・削除（CRUD操作）
- ローカルストレージによるデータ永続化
- 完了数のカウント表示
- Enterキーでのタスク追加
- レスポンシブデザイン

30日間で**ここまで作れるようになる**というのが、プログラミング学習の魅力だ。

---

## 無料で使える学習リソースまとめ

お金をかけずに質の高い学習ができる時代だ。以下のリソースを活用しよう。

### 入門向け（Day 1〜14に最適）

| リソース | 特徴 | 料金 |
|:---|:---|:---|
| **Progate** | スライド形式で基礎を学べる | 無料（一部有料） |
| **ドットインストール** | 3分動画で短時間学習 | 無料（一部有料） |
| **MDN Web Docs** | Webの公式リファレンス | 完全無料 |
| **freeCodeCamp** | 実践課題が豊富（英語） | 完全無料 |

### 中級向け（Day 15〜30に最適）

| リソース | 特徴 | 料金 |
|:---|:---|:---|
| **YouTube（しまぶー等）** | 日本語の実践チュートリアル | 完全無料 |
| **Zenn** | 技術記事・本が読める | 完全無料 |
| **Qiita** | 技術情報の宝庫 | 完全無料 |
| **GitHub** | オープンソースからコードを学べる | 完全無料 |

### おすすめの学習フロー

```
Progate（基礎を理解）
  ↓
ドットインストール（動画で補強）
  ↓
MDN Web Docs（仕様を確認）
  ↓
YouTube チュートリアル（実践プロジェクト）
  ↓
GitHub（他人のコードを読む）
  ↓
自分のプロジェクトを作る
```

---

## 挫折率90%を乗り越える5つの戦略

プログラミング学習の挫折率は90%以上と言われている。しかし、正しい対策を取れば乗り越えられる。

### 1. 目標を「小さく・具体的に」する

❌ 悪い目標: 「エンジニアになる」
✅ 良い目標: 「今週中にHTMLで自己紹介ページを作る」

大きな目標は分解して、**今日・今週で達成できるサイズ**にする。小さな成功体験の積み重ねがモチベーションを維持する鍵だ。

### 2. 毎日少しでも書く

1日30分でも構わない。**「毎日コードに触れる」**習慣を作ることが最重要。3日以上空けると、覚えたことを忘れて振り出しに戻る感覚に陥り、そこで挫折する人が多い。

おすすめは、**毎朝の決まった時間に15分だけ**コードを書くこと。朝の習慣化が最も定着しやすい。

### 3. エラーを恐れない

初心者が最も心が折れるのが**エラーの連続**だ。しかし、プロのエンジニアもエラーと戦い続けている。エラーは「間違い」ではなく「ヒント」だと考えよう。

エラー解決の基本手順は以下の通り。

1. エラーメッセージを**そのまま**読む（英語でも翻訳すればOK）
2. エラーの発生箇所（行番号）を確認する
3. 直前に変更した箇所を確認する
4. エラーメッセージで検索する
5. AIアシスタントに質問する

### 4. コミュニティに参加する

一人で学習していると孤独感から挫折しやすい。以下のコミュニティに参加して仲間を見つけよう。

- **Discord**: プログラミング学習サーバーが多数存在
- **Twitter/X**: #プログラミング初心者 タグで仲間と繋がる
- **Qiita**: 学習記録をアウトプットして反応をもらう
- **もくもく会**: オフライン/オンラインで一緒に学習する会

### 5. 学んだことをアウトプットする

インプットだけの学習は定着率が低い。**学んだことを必ずアウトプット**しよう。

- ブログに学習記録を書く
- Twitterで今日やったことを投稿する
- GitHubにコードを公開する
- 友人や家族に説明してみる

教えることは最高の学習法だ。

---

## AI時代のプログラミング学習法

2026年のプログラミング学習では、**AIツールの活用**が大きなアドバンテージになる。ただし、使い方を間違えると逆効果になる。

### AIコーディングアシスタントの正しい使い方

**おすすめの活用法**:
- エラーメッセージの解説を依頼する
- 書いたコードのレビューを受ける
- 概念の理解が曖昧な部分を質問する
- リファクタリングの提案を受ける

**やってはいけない使い方**:
- コードを丸ごと生成させてコピペ
- 理解せずにAIの提案をそのまま採用
- 自分で考える前にすぐAIに聞く

### Claude Code / GitHub Copilotの活用

**Claude Code**は、ターミナルから直接AIに相談できるツールだ。コードの書き方がわからないとき、エラーで詰まったときに強力なサポートになる。

**GitHub Copilot**は、VS Code上でリアルタイムにコード補完してくれる。月額料金がかかるが、学生は無料で利用可能だ。

### AI時代に求められるスキル

AIがコードを書ける時代だからこそ、以下のスキルが重要になる。

- **設計力**: 何を作るか、どう構成するかを考える力
- **問題分解力**: 大きな問題を小さな課題に分ける力
- **コードリーディング力**: AIが生成したコードを理解・評価する力
- **デバッグ力**: 問題の原因を特定し修正する力

AIは「ツール」であり、それを使いこなすのは人間だ。基礎をしっかり学んだうえでAIを活用する人が、最も成長が早い。

---

## プログラミングスクールを検討すべきタイミング

独学には限界がある。以下のような状況になったら、**プログラミングスクールの受講**を真剣に検討しよう。

### スクールが必要なサイン

- 独学で1ヶ月以上進展がない
- エラーの解決に毎回何時間もかかる
- 何を学ぶべきかわからなくなった
- 転職活動でポートフォリオが作れない
- メンターや質問相手がいない

### スクール選びのチェックポイント

| チェック項目 | 確認すべきこと |
|:---|:---|
| カリキュラム | 学びたい言語・技術が含まれているか |
| 転職サポート | 転職保証やキャリア相談があるか |
| メンター制度 | 現役エンジニアが指導してくれるか |
| 受講形式 | オンライン/通学を選べるか |
| 料金 | 教育訓練給付金の対象か |
| 実績 | 卒業生の転職率・転職先 |

### 給付金を最大限活用する

前述の通り、**専門実践教育訓練給付金**を使えば受講料の最大70%が給付される。例えば60万円のスクールなら、実質18万円で受講可能だ。

ハローワークへの事前申請が必要なため、受講の1ヶ月以上前に手続きを始めることをおすすめする。

独学で基礎を学んだうえでスクールに通うと、カリキュラムの吸収速度が格段に上がる。この記事の30日間ロードマップをこなしてからスクールに入るのが最も効率的だ。

---

## 実際のコード例：TypeScriptで実践

30日間の学習を終えた後、次のステップとして**TypeScript**に進むことをおすすめする。以下はTypeScriptで書いた実践的なコード例だ。

### 型安全なTodoアプリ

```typescript
// types.ts - 型定義
interface Todo {
  id: number;
  text: string;
  done: boolean;
  createdAt: Date;
}

type FilterType = "all" | "active" | "done";

// todoManager.ts - ロジック
class TodoManager {
  private todos: Todo[] = [];
  private nextId: number = 1;

  add(text: string): Todo {
    const todo: Todo = {
      id: this.nextId++,
      text,
      done: false,
      createdAt: new Date(),
    };
    this.todos.push(todo);
    return todo;
  }

  toggle(id: number): Todo | undefined {
    const todo = this.todos.find((t) => t.id === id);
    if (todo) {
      todo.done = !todo.done;
    }
    return todo;
  }

  delete(id: number): boolean {
    const index = this.todos.findIndex((t) => t.id === id);
    if (index === -1) return false;
    this.todos.splice(index, 1);
    return true;
  }

  getFiltered(filter: FilterType): Todo[] {
    switch (filter) {
      case "active":
        return this.todos.filter((t) => !t.done);
      case "done":
        return this.todos.filter((t) => t.done);
      default:
        return [...this.todos];
    }
  }

  getStats(): { total: number; active: number; done: number } {
    const total = this.todos.length;
    const done = this.todos.filter((t) => t.done).length;
    return { total, active: total - done, done };
  }
}

// 使用例
const manager = new TodoManager();
manager.add("TypeScriptの型を学ぶ");
manager.add("インターフェースを理解する");
manager.add("ジェネリクスに挑戦する");

manager.toggle(1); // 最初のタスクを完了

console.log(manager.getStats());
// { total: 3, active: 2, done: 1 }

console.log(manager.getFiltered("active"));
// 未完了のタスク2件が表示される
```

### API連携の基礎コード

```typescript
// api.ts - 外部APIとの連携
interface Post {
  id: number;
  title: string;
  body: string;
  userId: number;
}

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

async function fetchPosts(): Promise<ApiResponse<Post[]>> {
  try {
    const response = await fetch(
      "https://jsonplaceholder.typicode.com/posts?_limit=5"
    );

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data: Post[] = await response.json();
    return { data, error: null, loading: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    return { data: null, error: message, loading: false };
  }
}

async function createPost(
  title: string,
  body: string
): Promise<ApiResponse<Post>> {
  try {
    const response = await fetch(
      "https://jsonplaceholder.typicode.com/posts",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, userId: 1 }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data: Post = await response.json();
    return { data, error: null, loading: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    return { data: null, error: message, loading: false };
  }
}

// 使用例
async function main() {
  // 記事一覧を取得
  const postsResult = await fetchPosts();
  if (postsResult.data) {
    postsResult.data.forEach((post) => {
      console.log(`[${post.id}] ${post.title}`);
    });
  }

  // 新しい記事を作成
  const newPost = await createPost(
    "TypeScript入門",
    "TypeScriptで型安全なコードを書こう"
  );
  if (newPost.data) {
    console.log(`作成成功: ID=${newPost.data.id}`);
  }
}

main();
```

JavaScriptの基礎ができていれば、TypeScriptへの移行は1〜2週間で可能だ。型があることで、エラーを実行前に検出できるため、大規模なプロジェクトでの開発効率が大幅に上がる。

---

## よくある質問

### Q1. プログラミングに数学は必要ですか？

**A.** Web開発やアプリ開発では、中学レベルの数学で十分だ。四則演算、条件判断（大小比較）、繰り返し（ループ回数の計算）ができれば問題ない。AI/機械学習の分野に進む場合は、線形代数や統計の知識が必要になるが、学習初期では気にしなくてよい。

### Q2. パソコンのスペックはどのくらい必要ですか？

**A.** Web開発の学習であれば、メモリ8GB以上のPCがあれば十分だ。理想はメモリ16GB。MacでもWindowsでも問題ない。ただし、10年以上前のPCや、Chromebookでは開発環境の構築に制限がある。予算が限られている場合は、**GitHub Codespaces**などのクラウド開発環境を使う手もある。

### Q3. 独学とスクール、どちらがいいですか？

**A.** まず独学で1ヶ月やってみることを推奨する。この記事の30日間ロードマップを試し、自分の適性と課題を把握してからスクールを検討するのが最も効率的だ。独学で十分に進められる人もいるし、メンターの指導が必要な人もいる。自分のタイプを見極めてから判断しよう。

### Q4. 何歳からでも始められますか？

**A.** 年齢制限はない。30代・40代からエンジニアに転職した事例は多数ある。ただし、未経験からの転職は若いほど有利なのも事実。転職を目指す場合は、年齢に関係なく**早く始めるほど有利**だ。副業やフリーランスとしてのスキル活用なら、年齢は全く問題にならない。

### Q5. 英語ができないと厳しいですか？

**A.** 日本語の学習リソースだけでも十分に学べる。ただし、エラーメッセージやドキュメントは英語が多い。Google翻訳やAI翻訳で十分対応できるので、英語力が理由で学習を諦める必要はない。学習を進めるうちに、技術英語は自然と身についていく。

### Q6. どのくらいの期間で仕事に就けますか？

**A.** 個人差が大きいが、目安は以下の通り。

| 学習方法 | 転職までの目安期間 |
|:---|:---|
| 独学（1日2時間） | 6ヶ月〜1年 |
| スクール（フルタイム） | 3〜6ヶ月 |
| スクール（パートタイム） | 6〜9ヶ月 |

重要なのは期間ではなく、**ポートフォリオの質**だ。自分で考えて作ったオリジナルのWebアプリが1〜2つあれば、未経験でも書類選考を突破しやすくなる。

### Q7. プログラミングはAIに奪われませんか？

**A.** AIはプログラミングの一部を自動化するが、**エンジニアの仕事をすべて奪うことは当面ない**。AIを使いこなせるエンジニアの需要はむしろ増えている。「AIに仕事を奪われるエンジニア」ではなく「AIを活用できるエンジニア」を目指そう。プログラミングの基礎力がある人ほど、AIツールを効果的に使いこなせる。

---

## まとめ：今日から始める3ステップ

2026年春はプログラミング学習を始める最高のタイミングだ。最後に、今日から実行できる3つのステップをまとめる。

**ステップ1**: VS Codeをインストールする（所要時間: 10分）

**ステップ2**: Progateの無料コースでHTML/CSSの基礎を触る（所要時間: 30分）

**ステップ3**: この記事の30日間ロードマップをブックマークし、Day 1から始める

完璧な準備は不要だ。**「今日、最初の1行を書く」**ことが、エンジニアへの第一歩になる。

---

## 関連記事

- [新年度エンジニアスキルアップ戦略2026](/blog/2026-04-03-new-year-engineer-skill-strategy-2026/)
- [エンジニアのリモートワーク環境構築2026](/blog/2026-04-05-engineer-remote-work-setup-2026/)
- [フリーランスエンジニア独立チェックリスト2026](/blog/2026-04-02-freelance-independence-checklist-2026/)
- [エンジニア開業届ガイド2026](/blog/2026-04-01-engineer-kaigyo-guide-2026/)
- [エンジニア春の転職ガイド2026](/blog/2026-04-07-engineer-spring-career-change-2026/)

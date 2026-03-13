---
title: 'VS Code ショートカットキー 完全一覧 — 生産性が10倍になる50選'
description: 'Visual Studio Codeの生産性を劇的に向上させるショートカットキー50選を厳選。編集、ナビゲーション、デバッグ、Git操作、ターミナル操作まで実務で即使えるテクニック集。Mac/Windows両対応の一覧表付きです。'
pubDate: '2026-02-05'
tags: ['プログラミング', '開発ツール']
heroImage: '../../assets/thumbnails/vscode-shortcuts-productivity.jpg'
---
## VS Codeショートカットキーで開発速度が10倍になる理由

Visual Studio Code（VS Code）は世界で最も使われているコードエディタですが、マウス操作中心では生産性の50%も引き出せていません。プロの開発者とアマチュアの差は、ショートカットキーの習熟度に直結しています。

この記事では、実務で即戦力となるショートカットキー50個を、使用頻度順に厳選して紹介します。

### ショートカットキー表記について

- **Mac**: `Cmd` = Command、`Opt` = Option
- **Windows/Linux**: `Ctrl` = Control、`Alt` = Alt
- 表記例: `Cmd+P` (Mac) / `Ctrl+P` (Win)

## 絶対に覚えるべき基本操作 TOP10

### 1. コマンドパレット — 全機能へのゲートウェイ

**Mac**: `Cmd+Shift+P`
**Win**: `Ctrl+Shift+P`

VS Codeの全機能にアクセス可能。拡張機能のコマンドも実行できる最重要ショートカット。

```
使用例:
- "Format Document" → コード整形
- "Change Language Mode" → 言語モード変更
- "Git: Commit" → Git操作
```

### 2. クイックオープン — ファイル瞬間移動

**Mac**: `Cmd+P`
**Win**: `Ctrl+P`

ファイル名の一部を入力して即座に開く。マウスでファイルツリーを探す時代は終わり。

```
使用テクニック:
- "comp" → component.tsx が候補に
- "user/mod" → src/user/model.ts
- "@:" → 行番号ジャンプ（後述）
```

### 3. サイドバー表示切替 — 画面を広く使う

**Mac**: `Cmd+B`
**Win**: `Ctrl+B`

サイドバーの表示/非表示を瞬時に切り替え。コーディング時は非表示で画面を広く使いましょう。

### 4. 統合ターミナル — エディタとターミナルを行き来

**Mac**: `Ctrl+` (バッククォート)
**Win**: `Ctrl+` (バッククォート)

ターミナルとエディタ間の切り替えが一瞬に。外部ターミナル不要。

```bash
# ターミナル内でよく使うコマンド
npm run dev          # 開発サーバー起動
git status           # Git状態確認
pytest tests/        # テスト実行
```

### 5. マルチカーソル — 複数箇所を同時編集

**Mac**: `Cmd+D`（次の同一文字列を選択）
**Win**: `Ctrl+D`

同じ単語を次々選択して一括変更。変数名リネームが爆速に。

```javascript
// "user" を3回 Cmd+D で選択 → "account" に一括変更
const user = getUser();
console.log(user.name);
return user;
```

**応用**: `Cmd+Shift+L` (Win: `Ctrl+Shift+L`) で一致する全ての文字列を一度に選択。

### 6. 行の移動 — コードブロックを瞬時に並び替え

**Mac**: `Opt+↑/↓`
**Win**: `Alt+↑/↓`

選択行を上下に移動。インデントも自動調整。

```python
# 関数の順序を変更したいとき
def function_b():  # Opt+↑ で上に移動
    pass

def function_a():
    pass
```

### 7. 行のコピー — コピペより高速

**Mac**: `Shift+Opt+↑/↓`
**Win**: `Shift+Alt+↑/↓`

現在行を上下に複製。テンプレートコードの量産に最適。

```jsx
{/* Shift+Opt+↓ で瞬時に複製 */}
<div className="card">Content 1</div>
<div className="card">Content 1</div>
<div className="card">Content 1</div>
```

### 8. 行削除 — Delete/Backspace不要

**Mac**: `Cmd+Shift+K`
**Win**: `Ctrl+Shift+K`

現在行を一発削除。選択不要で爆速。

### 9. 定義へジャンプ — コードリーディング必須

**Mac**: `F12` または `Cmd+クリック`
**Win**: `F12` または `Ctrl+クリック`

関数/変数の定義元に瞬間移動。大規模コードベースの読解に不可欠。

**戻る**: `Ctrl+-` (Mac/Win共通)

### 10. シンボル検索 — ファイル内の関数/クラスに瞬間移動

**Mac**: `Cmd+Shift+O`
**Win**: `Ctrl+Shift+O`

現在ファイル内の関数、クラス、変数一覧を表示して即ジャンプ。

```typescript
// 1000行のファイルでも "@componentDidMount" で即移動
class MyComponent {
  componentDidMount() { }  // ← ここに瞬間移動
  render() { }
}
```

## 編集効率が爆上がりする操作15選

### 11. 矩形選択（カラム選択）

**Mac**: `Shift+Opt+ドラッグ` または `Cmd+Opt+↑/↓`
**Win**: `Shift+Alt+ドラッグ` または `Ctrl+Alt+↑/↓`

縦方向に複数カーソルを配置。CSVデータや縦に揃ったコードの編集に。

```
Before:           After (縦選択 → 削除):
const user1 = 1;  const user1;
const user2 = 2;  const user2;
const user3 = 3;  const user3;
```

### 12. 行の結合

**Mac**: `Cmd+J`
**Win**: 標準なし（Ctrl+J はパネル表示）

複数行を1行に結合。長いSQL文やHTML属性の整理に。

### 13. インデント調整

**インデント追加**: `Cmd+]` (Win: `Ctrl+]`)
**インデント削除**: `Cmd+[` (Win: `Ctrl+[`)

コードブロックのインデントを一括調整。

### 14. コメントアウト

**行コメント**: `Cmd+/` (Win: `Ctrl+/`)
**ブロックコメント**: `Shift+Opt+A` (Win: `Shift+Alt+A`)

```javascript
// Cmd+/ でトグル
// const debug = true;

/* Shift+Opt+A でブロックコメント
const config = {
  api: 'localhost'
};
*/
```

### 15. 大文字/小文字変換

**コマンドパレット**: "Transform to Uppercase/Lowercase"

選択テキストの大文字/小文字を一括変換。

### 16. Emmet展開 — HTMLを爆速生成

**Tab** キー

```html
<!-- "div.container>ul>li*3" と入力して Tab -->
<div class="container">
  <ul>
    <li></li>
    <li></li>
    <li></li>
  </ul>
</div>
```

### 17. スニペット挿入

**コマンドパレット**: "Insert Snippet"

カスタムスニペットを即挿入。React、Vue、Djangoなど言語別スニペット拡張活用を。

### 18. 選択範囲の拡大/縮小

**拡大**: `Shift+Ctrl+Cmd+→` (Win: `Shift+Alt+→`)
**縮小**: `Shift+Ctrl+Cmd+←` (Win: `Shift+Alt+←`)

文法単位で選択範囲を拡大。関数全体、クラス全体を瞬時に選択。

### 19. 空行の挿入

**上に挿入**: `Cmd+Shift+Enter` (Win: `Ctrl+Shift+Enter`)
**下に挿入**: `Cmd+Enter` (Win: `Ctrl+Enter`)

カーソル位置に関係なく新しい行を作成。

### 20. 単語単位の削除

**前方削除**: `Opt+Delete` (Win: `Ctrl+Backspace`)
**後方削除**: `Opt+Fn+Delete` (Win: `Ctrl+Delete`)

1文字ずつ消すのは非効率。単語単位で削除。

### 21. 行の先頭/末尾に移動

**先頭**: `Cmd+←` (Win: `Home`)
**末尾**: `Cmd+→` (Win: `End`)

**応用**: `Cmd+Shift+←/→` で行全体を選択。

### 22. ファイルの先頭/末尾に移動

**先頭**: `Cmd+↑` (Win: `Ctrl+Home`)
**末尾**: `Cmd+↓` (Win: `Ctrl+End`)

### 23. 対応する括弧にジャンプ

**Mac**: `Cmd+Shift+\`
**Win**: `Ctrl+Shift+\`

ネストが深い関数で開始括弧と終了括弧を行き来。

### 24. Zen Mode — 究極の集中モード

**Mac**: `Cmd+K Z`
**Win**: `Ctrl+K Z`

全てのUI要素を非表示にして純粋なコーディング環境を実現。

### 25. Markdown プレビュー

**Mac**: `Cmd+Shift+V`
**Win**: `Ctrl+Shift+V`

Markdownファイルのプレビューを即表示。ドキュメント作成に。

## ナビゲーション・検索の達人技10選

### 26. ワークスペース全体からシンボル検索

**Mac**: `Cmd+T`
**Win**: `Ctrl+T`

プロジェクト全体から関数/クラス名で検索。数百ファイルでも一瞬。

```
"UserController" → 全ファイルからクラス定義を検索
```

### 27. ファイル内検索

**Mac**: `Cmd+F`
**Win**: `Ctrl+F`

**応用**: `Opt+Cmd+C` (Win: `Alt+C`) で大文字小文字区別切り替え。

### 28. ワークスペース全体検索

**Mac**: `Cmd+Shift+F`
**Win**: `Ctrl+Shift+F`

プロジェクト全体からテキスト検索。正規表現対応。

```regex
# 正規表現検索の例
console\.log\(.*\)  # 全てのconsole.log文を検索
TODO:.*             # 全てのTODOコメント検索
```

### 29. 置換

**ファイル内置換**: `Cmd+Opt+F` (Win: `Ctrl+H`)
**全体置換**: `Cmd+Shift+H` (Win: `Ctrl+Shift+H`)

### 30. 次の検索結果へ移動

**Mac**: `Cmd+G` / `Cmd+Shift+G`（前へ）
**Win**: `F3` / `Shift+F3`（前へ）

### 31. エディタグループ間の移動

**Mac**: `Cmd+1/2/3`
**Win**: `Ctrl+1/2/3`

分割したエディタ間を数字キーで瞬間移動。

### 32. タブ間の移動

**次のタブ**: `Ctrl+Tab`
**前のタブ**: `Ctrl+Shift+Tab`

**応用**: `Cmd+Opt+←/→` (Win: `Ctrl+PageUp/PageDown`) で順番に移動。

### 33. 最近開いたファイルを開く

**Mac**: `Ctrl+R`
**Win**: `Ctrl+R`

プロジェクト間の移動や、最近作業したファイルに即アクセス。

### 34. パンくずリストナビゲーション

**Mac**: `Cmd+Shift+.`
**Win**: `Ctrl+Shift+.`

現在のファイル構造をパンくずリストで表示して移動。

### 35. 参照箇所の表示

**Mac**: `Shift+F12`
**Win**: `Shift+F12`

関数/変数が使われている全ての箇所を一覧表示。リファクタリング前の影響確認に必須。

## Git操作を爆速化する5選

### 36. ソース管理パネルを開く

**Mac**: `Ctrl+Shift+G`
**Win**: `Ctrl+Shift+G`

Gitの変更ファイル一覧を即表示。

### 37. 変更内容の確認（Diff表示）

ソース管理パネルでファイルをクリック、または `Cmd+Shift+P` → "Git: Open Changes"

### 38. ファイルの Stage/Unstage

ソース管理パネルで `+`（Stage）、`-`（Unstage）アイコンクリック。

**ショートカット化**:
```json
// settings.json に追加
{
  "key": "cmd+k s",
  "command": "git.stage"
}
```

### 39. コミット

**Mac**: `Cmd+Enter`（ソース管理パネル内）
**Win**: `Ctrl+Enter`

コミットメッセージ入力後に実行。

### 40. GitLens連携（拡張機能）

**行の変更履歴**: `Cmd+Shift+P` → "GitLens: Show Line History"

誰がいつどの行を変更したか即座に確認。チーム開発必須。

## デバッグ効率化5選

### 41. デバッグ開始/停止

**開始**: `F5`
**停止**: `Shift+F5`

### 42. ブレークポイント設定

**Mac**: `F9`
**Win**: `F9`

クリックでも設定可能だが、キーボードの方が速い。

### 43. ステップ実行

- **ステップオーバー**: `F10`
- **ステップイン**: `F11`
- **ステップアウト**: `Shift+F11`
- **続行**: `F5`

```javascript
function processUser(user) {
  const data = fetchData(user);  // F11 で関数内部に入る
  return transform(data);         // F10 で次の行へ
}
```

### 44. デバッグコンソール表示

**Mac**: `Cmd+Shift+Y`
**Win**: `Ctrl+Shift+Y`

実行中の変数を即座に確認。

### 45. 条件付きブレークポイント

ブレークポイント右クリック → "Edit Breakpoint" → 条件式入力

```javascript
// userId === 123 の時だけ停止
if (userId === 123) {
  console.log(user);  // ここにブレークポイント設定
}
```

## ターミナル操作5選

### 46. 新しいターミナルを開く

**Mac**: `Ctrl+Shift+` (バッククォート)
**Win**: `Ctrl+Shift+` (バッククォート)

複数のターミナルを同時実行（dev server + test watcherなど）。

### 47. ターミナル間の切り替え

**次のターミナル**: `Cmd+Shift+]` (Win: なし、設定要)
**前のターミナル**: `Cmd+Shift+[`

### 48. ターミナルの分割

**Mac**: `Cmd+\`（ターミナルフォーカス時）
**Win**: `Ctrl+Shift+5`

### 49. ターミナルをクリア

**Mac**: `Cmd+K`（ターミナル内で）
**Win**: `Ctrl+K`

```bash
# 長いログ出力後にクリアしてリセット
npm run build
# Cmd+K でクリア
```

### 50. ターミナルとエディタのフォーカス切り替え

**エディタへ**: `Cmd+1`
**ターミナルへ**: `Ctrl+` (バッククォート)

## カスタムキーバインド設定で更に効率化

VS Codeは全てのショートカットをカスタマイズ可能。

### keybindings.json の開き方

`Cmd+Shift+P` → "Preferences: Open Keyboard Shortcuts (JSON)"

### 実用的なカスタム設定例

```json
[
  {
    "key": "cmd+shift+d",
    "command": "editor.action.duplicateSelection"
  },
  {
    "key": "cmd+k cmd+f",
    "command": "editor.action.formatSelection"
  },
  {
    "key": "ctrl+h",
    "command": "workbench.action.replaceInFiles"
  },
  {
    "key": "cmd+shift+r",
    "command": "workbench.action.tasks.runTask",
    "args": "npm: dev"
  }
]
```

## DevToolBox でショートカット一覧を常に確認

当サイトの開発者ツール集「DevToolBox」では、VS Codeショートカット検索ツールを提供しています。

**主な機能**:
- プラットフォーム別（Mac/Win/Linux）フィルター
- カテゴリ別検索（編集/ナビゲーション/デバッグ等）
- キーワード検索
- PDFダウンロード（印刷して手元に置ける）

[DevToolBox を今すぐチェック](/tools)

## ショートカットキー習得の3ステップ

### ステップ1: まず10個を1週間で身につける

上記の「絶対に覚えるべきTOP10」を1週間で習得。マウスに手を伸ばしたら負け、という意識で。

### ステップ2: 週に5個ずつ追加

毎週5個ずつ新しいショートカットを覚える。10週間で50個達成。

### ステップ3: チートシート作成

```markdown
# My VS Code Shortcuts Cheatsheet

## 毎日使う
- Cmd+P: ファイルオープン
- Cmd+Shift+P: コマンドパレット
- Cmd+D: マルチカーソル

## 週1回使う
- Shift+F12: 参照箇所表示
- Cmd+K Z: Zen Mode
```

デスクトップに貼っておくか、DevToolBoxでPDF化して印刷。

## まとめ: 1日30分で生産性10倍を実現

VS Codeのショートカットキーは、習得に1ヶ月かかっても、その後のキャリアで数千時間を節約してくれます。

**重要な3つのポイント**:

1. **マウスを使わない**意識を持つ
2. **週5個ペース**で無理なく習得
3. **カスタムキーバインド**で自分専用に最適化

今日から1つでも多くのショートカットを使い、プロの開発者への道を加速させましょう。

**関連記事**:
- AIコーディングツール比較2026 — ショートカット×AIで最強効率
- Docker Compose 実践ガイド — VS Code拡張機能で更に便利に
- データベース設計入門 — VS CodeでER図を描く方法

**便利ツール**: [DevToolBox](/tools) でショートカット検索・PDF化が可能です。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)

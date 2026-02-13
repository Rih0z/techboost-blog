---
title: 'Git/GitHub実践ガイド — チーム開発で使えるブランチ戦略とPRワークフロー'
description: 'Gitの基本操作からGitHub Flow、プルリクエストの書き方まで。チーム開発の現場で使える実践的なワークフローを解説。'
pubDate: 'Feb 09 2026'
heroImage: '../../assets/blog-placeholder-1.jpg'
---

Gitはソースコード管理の標準ツールですが、チーム開発では適切なブランチ戦略とワークフローが重要です。この記事では、実務で使えるGitの知識を解説します。

## 基本操作のおさらい

```bash
# リポジトリの作成
git init

# ファイルをステージング
git add index.html        # 個別ファイル
git add src/              # ディレクトリ
git add -A                # すべて

# コミット
git commit -m "feat: ログインページを追加"

# リモートにプッシュ
git push origin main
```

## コミットメッセージの書き方

良いコミットメッセージは、**何をしたか**と**なぜしたか**が一目で分かります。

### Conventional Commits

```
<type>: <description>

[optional body]
```

| type | 用途 |
|------|------|
| `feat` | 新機能 |
| `fix` | バグ修正 |
| `docs` | ドキュメント変更 |
| `style` | フォーマット変更（動作に影響なし） |
| `refactor` | リファクタリング |
| `test` | テストの追加・修正 |
| `chore` | ビルド・ツール設定など |

### 良い例 / 悪い例

```bash
# 良い例
git commit -m "feat: ユーザープロフィール画像のアップロード機能を追加"
git commit -m "fix: ログインフォームで空のメールアドレスが送信される問題を修正"

# 悪い例
git commit -m "修正"
git commit -m "update"
git commit -m "いろいろ変更"
```

## GitHub Flow

GitHub Flowは、シンプルで実践的なブランチ戦略です。

```
main ─────────────────────────────────────────→
  │                                    ↑
  └─── feature/login ─── commit ─── PR → merge
```

### ワークフロー

```bash
# 1. mainブランチから新しいブランチを作成
git checkout main
git pull origin main
git checkout -b feature/user-profile

# 2. 作業してコミット
git add .
git commit -m "feat: ユーザープロフィールページを追加"

# 3. リモートにプッシュ
git push origin feature/user-profile

# 4. GitHubでPull Requestを作成

# 5. レビュー後、mainにマージ

# 6. ローカルのmainを更新
git checkout main
git pull origin main
git branch -d feature/user-profile
```

### ブランチ命名規則

| 種類 | 命名 | 例 |
|------|------|---|
| 機能 | `feature/機能名` | `feature/user-auth` |
| バグ修正 | `fix/バグ内容` | `fix/login-redirect` |
| ホットフィックス | `hotfix/内容` | `hotfix/payment-error` |
| リリース | `release/バージョン` | `release/v1.2.0` |

## プルリクエストの書き方

良いPRは、レビューアが**素早く理解してレビューできる**ように書かれています。

### PRテンプレート

```markdown
## 概要
<!-- 何をしたか、なぜしたか -->

ユーザープロフィールページを追加しました。
ユーザーが自分の情報を確認・編集できるようになります。

## 変更内容
- プロフィール表示ページ（/profile）の追加
- プロフィール編集フォームの実装
- アバター画像アップロード機能

## テスト方法
1. ログイン後、ヘッダーのアイコンをクリック
2. プロフィール情報が表示されることを確認
3. 「編集」ボタンから情報を変更できることを確認

## スクリーンショット
<!-- UIの変更がある場合は画像を添付 -->
```

### PRのベストプラクティス

1. **小さく保つ** — 1PR = 1つの変更。300行以内が理想
2. **タイトルは具体的に** — 「fix: ログインフォームのバリデーションエラーを修正」
3. **WIP（作業中）PRを活用** — 早めにフィードバックをもらう
4. **セルフレビュー** — 提出前に自分でdiffを確認

## よく使うGitコマンド

### ブランチ操作

```bash
# ブランチ一覧
git branch           # ローカル
git branch -r        # リモート
git branch -a        # すべて

# ブランチ作成と切り替え
git checkout -b feature/new-feature

# ブランチ削除
git branch -d feature/old-feature    # マージ済みのみ
git branch -D feature/old-feature    # 強制削除
```

### 差分の確認

```bash
# ワーキングディレクトリの変更
git diff

# ステージング済みの変更
git diff --staged

# 特定のコミット間の差分
git diff HEAD~3..HEAD

# ファイル名のみ表示
git diff --name-only
```

### 履歴の確認

```bash
# コミット履歴
git log --oneline

# グラフ表示
git log --oneline --graph --all

# 特定ファイルの履歴
git log --follow -p -- src/App.tsx
```

### 取り消し操作

```bash
# 直前のコミットを修正（メッセージ変更）
git commit --amend -m "新しいメッセージ"

# ステージングを取り消し
git restore --staged file.txt

# ワーキングディレクトリの変更を取り消し
git restore file.txt

# 特定のコミットまで戻す（履歴は保持）
git revert HEAD
```

## .gitignore の設定

プロジェクトごとに適切な`.gitignore`を設定しましょう。

```gitignore
# Node.js
node_modules/
dist/
.next/

# 環境変数
.env
.env.local

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# ログ
*.log
```

## まとめ

| トピック | ポイント |
|---------|---------|
| コミットメッセージ | Conventional Commits形式で具体的に |
| ブランチ戦略 | GitHub Flow: main + featureブランチ |
| PR | 小さく、具体的に、テスト方法を記載 |
| .gitignore | 環境変数・node_modules・IDEファイルを除外 |

Gitの正しい使い方を身につけることで、チーム開発がスムーズになり、コードの品質も向上します。

---
title: 'Git上級テクニック完全ガイド：プロが使う高度な操作と効率化'
description: 'Gitの高度なテクニックを徹底解説。rebase・cherry-pick・bisect・worktree・sparse-checkout・reflog・フック・サブモジュール・大規模リポジトリ最適化・GitLens活用まで実践的に学ぶ'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-3.jpg'
---

Gitは現代のソフトウェア開発において不可欠なバージョン管理システムだが、多くの開発者は基本的な `add`・`commit`・`push` の繰り返しで終わってしまっている。本記事では、プロフェッショナルな開発現場で実際に使われる高度なGitテクニックを体系的に解説する。これらのテクニックをマスターすることで、コードの品質管理・チームコラボレーション・障害対応のスピードが劇的に向上する。

## 目次

1. Gitの基本の見直し
2. Rebaseの活用
3. Cherry-pickによる選択的コミット適用
4. Bisectによるバグの二分探索
5. Worktreeによる複数作業ディレクトリ管理
6. Sparse-checkoutによる部分的チェックアウト
7. Reflogによる失われたコミットの復元
8. Stashの上級テクニック
9. Git Hooksによる自動化
10. サブモジュールとサブツリー
11. 大規模リポジトリの最適化
12. コミットメッセージ規約
13. ブランチ戦略の選択
14. Git統合ツールとエコシステム

---

## 1. Gitの基本の見直し

### commitオブジェクトの内部構造

Gitを深く理解するには、その内部データモデルを把握する必要がある。Gitはすべてのデータを「オブジェクト」として管理しており、主に4種類のオブジェクトが存在する。

- **blob**: ファイルの内容そのもの
- **tree**: ディレクトリ構造（blob と tree への参照）
- **commit**: tree への参照 + 親コミット + メタデータ
- **tag**: 特定のオブジェクトへの参照

これらのオブジェクトは SHA-1（または SHA-256）ハッシュで識別される。以下のコマンドでオブジェクトの内容を確認できる。

```bash
# コミットオブジェクトの内容を確認
git cat-file -p HEAD

# ツリーオブジェクトの内容を確認
git cat-file -p HEAD^{tree}

# オブジェクトの種類を確認
git cat-file -t <hash>

# リポジトリ内の全オブジェクトを一覧表示
git cat-file --batch-all-objects --batch-check
```

### ブランチとHEADの仕組み

ブランチは単なるコミットへのポインタ（参照）にすぎない。`.git/refs/heads/` ディレクトリ以下にブランチ名と同名のファイルが存在し、その中にコミットハッシュが書かれているだけだ。

```bash
# ブランチが指しているコミットハッシュを確認
cat .git/refs/heads/main

# HEADが何を指しているか確認
cat .git/HEAD

# 全てのブランチとそのコミットを一覧表示
git branch -v --all

# ブランチ間の分岐点を探す
git merge-base main feature/new-feature
```

HEAD が特定のコミットを直接指している状態を「detached HEAD」と呼ぶ。この状態でコミットすると、どのブランチにも属さない浮遊したコミットが生まれる。

```bash
# 特定のコミットにcheckout（detached HEAD状態）
git checkout abc1234

# detached HEAD状態でブランチを作成して安全な状態に戻る
git checkout -b recovery-branch
```

### mergeの3つの戦略

マージには主に3つの戦略がある。それぞれの特性を理解して使い分けることが重要だ。

**Fast-forward merge（デフォルト）**

```bash
# メインブランチに移動してからマージ
git checkout main
git merge feature/simple-change

# Fast-forwardを強制する（できない場合はエラー）
git merge --ff-only feature/simple-change
```

Fast-forwardが可能な場合（分岐点以降にmainへのコミットがない場合）、Gitはマージコミットを作成せず、単純にブランチポインタを先に進める。履歴がきれいになる反面、どの変更がいつ統合されたかが履歴から読み取りにくくなる。

**3-way merge**

```bash
# マージコミットを強制的に作成する
git merge --no-ff feature/important-feature -m "Merge feature/important-feature into main"
```

マージコミットが作成されるため、「いつこのブランチが統合されたか」が明確になる。チーム開発では `--no-ff` を使うことが多い。

**Squash merge**

```bash
# 複数のコミットを1つにまとめてマージ
git merge --squash feature/many-small-commits
git commit -m "feat: Add new feature X (squashed)"
```

フィーチャーブランチの複数のコミットを1つにまとめてメインブランチに取り込む。WIP（作業中）のコミットが履歴に残らないためきれいだが、個々のコミットの履歴は失われる。

---

## 2. Rebaseの活用

### rebaseの基本的な動作原理

Rebaseはコミットを「再適用」する操作だ。`git rebase main` を実行すると、現在のブランチのコミットを一時的に退避させ、mainブランチの最新状態を基点として、退避させたコミットを順番に再適用する。

```
Before rebase:
      A---B---C  feature
     /
D---E---F---G  main

After: git rebase main (on feature branch)
              A'--B'--C'  feature
             /
D---E---F---G  main
```

```bash
# featureブランチでmainブランチにrebase
git checkout feature/my-feature
git rebase main

# または最新のmainを取得してからrebase
git fetch origin
git rebase origin/main

# rebase中にコンフリクトが発生した場合
# コンフリクトを解消した後
git add <conflicted-file>
git rebase --continue

# rebaseを中断して元の状態に戻す
git rebase --abort

# rebaseをスキップ（空のコミットになる場合）
git rebase --skip
```

### Interactive Rebase（対話的リベース）

Interactive rebaseはGitの中でも特に強力な機能の一つだ。コミット履歴を「編集」「統合」「分割」「並び替え」「削除」できる。

```bash
# 直近3つのコミットを対話的に操作
git rebase -i HEAD~3

# 特定のコミットから現在までを対話的に操作
git rebase -i abc1234

# リモートブランチとの分岐点から対話的に操作
git rebase -i origin/main
```

エディタが開き、以下のようなリストが表示される。

```
pick a1b2c3d feat: Add user authentication
pick e4f5a6b fix: Fix login validation bug
pick c7d8e9f refactor: Clean up auth code

# Rebase abc1234..c7d8e9f onto abc1234 (3 commands)
#
# Commands:
# p, pick <commit> = use commit
# r, reword <commit> = use commit, but edit the commit message
# e, edit <commit> = use commit, but stop for amending
# s, squash <commit> = use commit, but meld into previous commit
# f, fixup <commit> = like "squash", but discard this commit's log message
# x, exec <command> = run command (the rest of the line) using shell
# b, break = stop here (continue rebase later with 'git rebase --continue')
# d, drop <commit> = remove commit
# l, label <label> = label current HEAD with a name
# t, reset <label> = reset HEAD to a label
# m, merge [-C <commit> | -c <commit>] <label> [# <oneline>]
```

**コミットのsquash（統合）**

```
pick a1b2c3d feat: Add user authentication
squash e4f5a6b fix: Fix login validation bug
squash c7d8e9f refactor: Clean up auth code
```

この設定で保存すると、3つのコミットが1つに統合される。

**コミットのreword（メッセージ変更）**

```
reword a1b2c3d feat: Add user authentication
pick e4f5a6b fix: Fix login validation bug
```

保存後、指定したコミットのメッセージ編集画面が表示される。

**コミットのedit（内容変更）**

```
edit a1b2c3d feat: Add large monolithic commit
pick e4f5a6b fix: Fix login validation bug
```

edit を指定したコミットの直後で rebase が一時停止する。ここで変更を加えてコミットするか、コミットを分割できる。

```bash
# editで停止した状態でコミットを分割する手順
git reset HEAD~1          # コミットを取り消してステージングに戻す
git add src/auth.ts       # 一部のファイルだけをステージ
git commit -m "feat: Add authentication core logic"
git add src/auth.test.ts  # 残りのファイルをステージ
git commit -m "test: Add authentication tests"
git rebase --continue     # rebaseを再開
```

### --autosquashオプション

`fixup!` または `squash!` プレフィックスを付けたコミットメッセージを書いておくと、`--autosquash` オプションで自動的に対応するコミットの下に配置される。

```bash
# 元のコミット
git commit -m "feat: Add shopping cart feature"

# 後から修正コミットを作成（fixup!プレフィックスを使用）
git add src/cart.ts
git commit -m "fixup! feat: Add shopping cart feature"

# --autosquashで自動整理
git rebase -i --autosquash HEAD~5
```

`.gitconfig` に以下を設定しておくと常に autosquash が有効になる。

```bash
git config --global rebase.autoSquash true
```

### --update-refs オプション（Git 2.38以降）

スタックされたブランチ（依存関係のある複数のブランチ）をリベースする際に非常に便利なオプションだ。

```bash
# メインブランチに対してスタックされたブランチ群をまとめてリベース
git rebase --update-refs origin/main
```

このオプションなしでは、依存するブランチを一つずつ手動でリベースする必要があった。

---

## 3. Cherry-pickによる選択的コミット適用

### cherry-pickの基本

cherry-pick は特定のコミットの変更を現在のブランチに適用するコマンドだ。「あのブランチのあのコミットだけ取り込みたい」という場面で活躍する。

```bash
# 単一コミットをcherry-pick
git cherry-pick abc1234

# 複数コミットをcherry-pick
git cherry-pick abc1234 def5678 ghi9012

# コミット範囲をcherry-pick（abc1234は含まない）
git cherry-pick abc1234..ghi9012

# コミット範囲をcherry-pick（abc1234も含む）
git cherry-pick abc1234^..ghi9012
```

### cherry-pickの実践的シナリオ

**シナリオ1: ホットフィックスを複数のブランチに適用**

本番環境のバグを修正したコミットを、複数のリリースブランチにも適用する必要がある場合。

```bash
# mainブランチでバグを修正してコミット
git checkout main
git add src/critical-fix.ts
git commit -m "fix: Fix critical security vulnerability"
# コミットハッシュを確認
git log --oneline -1
# 出力例: f1a2b3c fix: Fix critical security vulnerability

# release/v1.x ブランチに同じ修正を適用
git checkout release/v1.x
git cherry-pick f1a2b3c

# release/v2.x ブランチにも適用
git checkout release/v2.x
git cherry-pick f1a2b3c
```

**シナリオ2: 誤ったブランチにコミットした場合の修正**

```bash
# 現在の状況：mainブランチに誤ってコミットしてしまった
git log --oneline -3
# 出力例:
# bad0001 feat: New experimental feature (間違えてmainにコミット)
# a1b2c3d Merge pull request #42
# e4f5g6h feat: Previous feature

# 正しいfeatureブランチを作成して修正をcherry-pick
git checkout -b feature/experimental
git cherry-pick bad0001

# mainブランチから間違ったコミットを削除
git checkout main
git reset --hard HEAD~1  # 注意: このコマンドは履歴を書き換える
```

### cherry-pickオプション詳解

```bash
# コミットを適用するがコミットはしない（ステージング状態で止める）
git cherry-pick --no-commit abc1234

# 複数のコミットをno-commitで取り込み、まとめて1つのコミットにする
git cherry-pick --no-commit abc1234 def5678 ghi9012
git commit -m "feat: Integrate multiple changes as single commit"

# コミットメッセージに元のコミット参照を追加する
git cherry-pick -x abc1234
# 結果のコミットメッセージに "(cherry picked from commit abc1234)" が追加される

# コミッター情報を元のコミットのものを使う
git cherry-pick --signoff abc1234

# マージコミットをcherry-pick（-mで親を指定）
git cherry-pick -m 1 abc1234
```

### cherry-pick時のコンフリクト解消

```bash
# コンフリクトが発生した場合
git cherry-pick abc1234
# エラー: CONFLICT (content): Merge conflict in src/app.ts

# コンフリクトを確認
git status
git diff

# コンフリクトを解消（エディタで編集）
# ...編集後...

# 解消済みとしてマーク
git add src/app.ts

# cherry-pickを継続
git cherry-pick --continue

# または中断
git cherry-pick --abort
```

---

## 4. Bisectによるバグの二分探索

### bisectの仕組み

`git bisect` は二分探索アルゴリズムを使ってバグが混入したコミットを特定するコマンドだ。「このバグはいつ混入したか？」という問いに対して効率的に答えてくれる。n個のコミットがある場合、最大 log2(n) 回の確認でバグコミットを特定できる。

```bash
# bisectセッションを開始
git bisect start

# 現在のコードはバグがある（bad）
git bisect bad

# バグがなかった既知のコミットを指定（good）
git bisect good v2.0.0
# または具体的なコミットハッシュで
git bisect good abc1234

# Gitが中間点のコミットにcheckoutする
# テストを実行してバグの有無を確認
npm test

# バグがある場合
git bisect bad

# バグがない場合
git bisect good

# 繰り返すことでGitがバグのあるコミットを特定する
# 最終的に以下のような出力が得られる:
# e4f5a6b is the first bad commit
# commit e4f5a6b
# Author: Developer <dev@example.com>
# Date:   Fri Jan 10 14:23:45 2025 +0900
#
#     feat: Refactor data processing pipeline

# bisectセッションを終了して元のHEADに戻る
git bisect reset
```

### bisectの自動化

テストスクリプトが用意できる場合、bisect を完全に自動化できる。

```bash
# bisectを自動テストスクリプトで実行
git bisect start
git bisect bad HEAD
git bisect good v2.0.0

# スクリプトが0を返せばgood、それ以外はbad
git bisect run npm test

# より複雑なテストの場合はスクリプトを用意
cat > /tmp/bisect-test.sh << 'EOF'
#!/bin/bash
npm install --silent 2>/dev/null
npm run build --silent 2>/dev/null || exit 1
node -e "
  const result = require('./dist/critical-function');
  if (result.calculate(10) === 100) {
    process.exit(0);  // good
  } else {
    process.exit(1);  // bad
  }
"
EOF
chmod +x /tmp/bisect-test.sh
git bisect run /tmp/bisect-test.sh

git bisect reset
```

### bisectの特殊なケース

```bash
# 現在のコミットがテスト不可能な場合（ビルドエラーなど）
git bisect skip

# 特定の範囲のコミットをまとめてskip
git bisect skip abc1234..def5678

# bisectのログを確認
git bisect log

# bisectのログをファイルに保存して後で再実行
git bisect log > bisect-session.log

# 保存したbisectセッションを再実行
git bisect start
git bisect replay bisect-session.log
```

### bisectの実践例

1000コミットの履歴の中からバグを探す場合：

```bash
# Step 1: 問題のあるバグを再現するテストを書く
cat > test-bug.js << 'EOF'
const { processData } = require('./src/data-processor');
const result = processData([1, 2, 3, 4, 5]);
if (result.total !== 15) {
  console.error('Bug found: total is ' + result.total);
  process.exit(1);
}
console.log('OK');
process.exit(0);
EOF

# Step 2: bisect開始
git bisect start
git bisect bad HEAD       # 現在: バグあり
git bisect good v3.0.0    # 3ヶ月前のバージョン: バグなし

# Step 3: 自動実行（1000コミットでも約10回で特定）
git bisect run node test-bug.js

# Step 4: 結果確認とリセット
git bisect reset
```

---

## 5. Worktreeによる複数作業ディレクトリ管理

### worktreeとは何か

`git worktree` は1つのリポジトリに対して複数の作業ディレクトリを作成できる機能だ。従来はブランチを切り替えるたびにファイルが変わっていたが、worktreeを使えば複数のブランチを同時に別ディレクトリで開いて作業できる。

従来の問題：
- フィーチャーブランチで作業中に緊急のバグ修正が必要になった場合、stashして切り替える必要があった
- `npm install` や `cargo build` などのビルドアーティファクトが毎回再生成される

worktreeの解決策：
- 別ディレクトリで別ブランチを常時開いておける
- ビルドアーティファクトもブランチごとに独立して維持できる

```bash
# メインリポジトリとは別のディレクトリにworktreeを作成
git worktree add ../hotfix-branch hotfix/critical-bug

# 新しいブランチを作成しながらworktreeを追加
git worktree add -b feature/new-dashboard ../dashboard-dev main

# 既存のworktreeを確認
git worktree list

# 特定のコミットでworktreeを作成（detached HEAD）
git worktree add --detach ../review-pr-123 origin/pr-123
```

### worktreeの実践的な使い方

```bash
# プロジェクト構造の例
# ~/projects/
#   myapp/           <- メインworktree（mainブランチ）
#   myapp-hotfix/    <- hotfixブランチ用worktree
#   myapp-feature/   <- featureブランチ用worktree

# 設定例
cd ~/projects/myapp
git worktree add ../myapp-hotfix hotfix/security-patch
git worktree add -b feature/user-profile ../myapp-feature origin/main

# それぞれのディレクトリで独立して作業できる
ls ../myapp-hotfix   # hotfixブランチのファイル
ls ../myapp-feature  # featureブランチのファイル

# worktreeを削除（作業ディレクトリも削除）
git worktree remove ../myapp-hotfix

# 強制削除（未コミット変更があっても削除）
git worktree remove --force ../myapp-hotfix

# 古いworktree参照をクリーンアップ
git worktree prune
```

### worktreeの注意点と制約

worktree には以下の制約がある：

- 同じブランチを複数のworktreeでチェックアウトすることはできない
- `.git` ディレクトリはメインworktreeにのみ存在し、サブworktreeには `.git` ファイル（リンク）が作成される
- `git submodule` との組み合わせには注意が必要

```bash
# 同じブランチを別worktreeでチェックアウトしようとするとエラー
git worktree add ../duplicate main
# fatal: 'main' is already checked out at '/home/user/projects/myapp'

# 解決策：--force オプション（通常は使わない方がいい）
# または別のブランチを作成する
git worktree add -b main-copy ../main-work main
```

---

## 6. Sparse-checkoutによる部分的チェックアウト

### sparse-checkoutの目的

大規模なモノリポジトリ（monorepo）では、全ファイルをチェックアウトすると時間とディスクスペースを大量に消費する。`git sparse-checkout` を使えば、必要なディレクトリやファイルだけをチェックアウトできる。

```bash
# sparse-checkoutを有効化
git sparse-checkout init

# 特定のディレクトリだけをチェックアウト
git sparse-checkout set apps/frontend packages/shared-utils

# 現在のsparse-checkout設定を確認
git sparse-checkout list

# coneモード（より高速、ディレクトリ単位）
git sparse-checkout init --cone
git sparse-checkout set apps/frontend

# nonconeモード（より柔軟、パターン指定可能）
git sparse-checkout init --no-cone
git sparse-checkout set "/*.json" "/apps/frontend/**"
```

### sparse-checkoutのパターン

```bash
# .git/info/sparse-checkout ファイルを直接編集
cat .git/info/sparse-checkout
# /
# /apps/frontend/
# /packages/shared-utils/
# !/packages/legacy/

# sparse-checkoutに追加
git sparse-checkout add apps/backend

# sparse-checkoutを無効化して全ファイルをチェックアウト
git sparse-checkout disable
```

### partial cloneとの組み合わせ

sparse-checkout を partial clone と組み合わせることで、さらに効率的なチェックアウトが実現できる（詳細は第11章で解説）。

```bash
# partial cloneとsparse-checkoutの組み合わせ
git clone --filter=blob:none --no-checkout https://github.com/large/monorepo.git
cd monorepo
git sparse-checkout init --cone
git sparse-checkout set apps/my-service
git checkout main
```

---

## 7. Reflogによる失われたコミットの復元

### reflogとは何か

`git reflog` はHEADと各ブランチの移動履歴を記録したログだ。通常のコミット履歴とは異なり、`reset --hard` や `rebase` などで「失われた」ように見えるコミットも reflog には残っている。reflogはデフォルトで90日間保持される。

```bash
# HEADのreflogを表示
git reflog

# 特定のブランチのreflogを表示
git reflog show main

# 全ブランチのreflogをまとめて表示
git reflog --all

# reflogの出力例：
# abc1234 (HEAD -> main) HEAD@{0}: commit: feat: Add new feature
# def5678 HEAD@{1}: reset: moving to HEAD~2
# ghi9012 HEAD@{2}: commit: fix: Fix critical bug
# jkl3456 HEAD@{3}: commit: feat: Add another feature
# mno7890 HEAD@{4}: merge feature/old: Merge branch 'feature/old'
```

### 失われたコミットの復元

**シナリオ1: reset --hard で失ったコミットの復元**

```bash
# 誤ってreset --hardを実行してしまった
git reset --hard HEAD~5

# reflogで失ったコミットのハッシュを確認
git reflog
# abc1234 HEAD@{0}: reset: moving to HEAD~5
# xyz9876 HEAD@{1}: commit: feat: Very important feature

# 失ったコミットに戻る
git reset --hard xyz9876

# またはブランチを作成して復元
git checkout -b recovered-feature xyz9876
```

**シナリオ2: 削除したブランチの復元**

```bash
# 誤ってブランチを削除してしまった
git branch -D feature/important-work

# reflogでブランチが指していたコミットを確認
git reflog | grep "feature/important-work"
# または全reflogから探す
git reflog --all | grep "checkout: moving from feature/important-work"

# ブランチを復元
git checkout -b feature/important-work abc1234
```

**シナリオ3: rebaseで失ったコミットの復元**

```bash
# rebaseを実行
git rebase -i HEAD~5
# 誤ってdropしてしまった

# reflogでrebase前のHEADを確認
git reflog
# HEAD@{0}: rebase (finish): returning to refs/heads/feature
# HEAD@{1}: rebase (pick): Last valid commit
# HEAD@{6}: rebase (start): checkout main
# HEAD@{7}: commit: Important commit (dropped!)

# rebase前のHEADに戻る（ORIG_HEADに保存されている場合が多い）
git reset --hard ORIG_HEAD

# またはreflogから特定のコミットを復元
git cherry-pick HEAD@{7}
```

### fsckによる到達不能オブジェクトの確認

```bash
# 到達不能なオブジェクト（dangling commits）を確認
git fsck --unreachable

# dangling commitsのみを表示
git fsck --lost-found

# .git/lost-found/commit/ に見つかったコミットが保存される
ls .git/lost-found/commit/

# 特定のコミットオブジェクトの内容を確認
git show abc1234
```

---

## 8. Stashの上級テクニック

### stashの基本と命名

stash の最も基本的な使い方は `git stash` だが、複数の stash を管理するためには命名が重要だ。

```bash
# 作業内容をstashに保存（メッセージなし）
git stash

# メッセージを付けてstash
git stash push -m "WIP: User authentication flow"

# 特定のファイルだけをstash
git stash push -m "Only auth changes" src/auth.ts src/auth.test.ts

# stash一覧を確認
git stash list
# stash@{0}: On main: WIP: User authentication flow
# stash@{1}: WIP on main: abc1234 Previous stash

# 最新のstashを適用（stashは削除しない）
git stash apply

# 特定のstashを適用
git stash apply stash@{2}

# 最新のstashを適用して削除
git stash pop

# stashを削除
git stash drop stash@{1}

# 全stashを削除
git stash clear
```

### 追跡されていないファイルもstashする

```bash
# 追跡されていないファイル（untracked files）もstashに含める
git stash push -u -m "Include new files"

# 追跡されていないファイルと.gitignoreされているファイルも含める
git stash push -a -m "Include all files"

# インタラクティブにstashするファイルを選択
git stash push -p -m "Partial stash"
```

### stashからブランチを作成

stash した変更を新しいブランチとして展開する機能は特に便利だ。

```bash
# stashからブランチを作成（stashは削除される）
git stash branch feature/extracted-from-stash stash@{0}

# この操作は以下の3つを順番に実行するのと同等
# 1. git checkout -b feature/extracted-from-stash <stash-base-commit>
# 2. git stash apply stash@{0}
# 3. git stash drop stash@{0}
```

### stashの詳細確認

```bash
# stashの内容を確認（差分として表示）
git stash show stash@{0}

# 詳細な差分を表示
git stash show -p stash@{0}

# stashのsummaryを確認
git stash list --stat
```

---

## 9. Git Hooksによる自動化

### Git Hooksの概要

Git Hooks はGitのライフサイクルの特定のタイミングで自動実行されるスクリプトだ。`.git/hooks/` ディレクトリに配置する。チームで共有するには外部ツール（husky など）を使う必要がある。

主要なフックの種類：

| フック名 | タイミング | 用途 |
|---------|-----------|------|
| pre-commit | コミット前 | リント・テスト・フォーマット |
| commit-msg | コミットメッセージ確定前 | メッセージの検証 |
| post-commit | コミット後 | 通知・ログ |
| pre-push | プッシュ前 | テスト・ビルド確認 |
| post-merge | マージ後 | 依存関係更新 |
| pre-rebase | リベース前 | 安全確認 |
| post-checkout | チェックアウト後 | 依存関係更新 |

### pre-commitフック

```bash
# .git/hooks/pre-commit ファイルを作成
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

# ステージされたTypeScriptファイルに対してリントを実行
STAGED_TS_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.tsx?$')

if [ -n "$STAGED_TS_FILES" ]; then
  echo "Running ESLint on staged TypeScript files..."
  npx eslint $STAGED_TS_FILES
  if [ $? -ne 0 ]; then
    echo "ESLint failed. Please fix the errors before committing."
    exit 1
  fi
fi

# TypeScriptの型チェック
echo "Running TypeScript type check..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo "TypeScript type check failed."
  exit 1
fi

echo "All checks passed!"
exit 0
EOF

chmod +x .git/hooks/pre-commit
```

### commit-msgフック

```bash
# .git/hooks/commit-msg ファイルを作成
cat > .git/hooks/commit-msg << 'EOF'
#!/bin/bash

# Conventional Commitsフォーマットを強制
COMMIT_MSG_FILE=$1
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

# パターン: type(scope): description
# 例: feat(auth): Add OAuth2 support
PATTERN="^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?: .{1,100}$"

if ! echo "$COMMIT_MSG" | grep -qE "$PATTERN"; then
  echo "ERROR: Invalid commit message format!"
  echo "Expected format: type(scope): description"
  echo "Valid types: feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert"
  echo "Example: feat(auth): Add OAuth2 login support"
  echo ""
  echo "Your message: $COMMIT_MSG"
  exit 1
fi

echo "Commit message format is valid."
exit 0
EOF

chmod +x .git/hooks/commit-msg
```

### pre-pushフック

```bash
# .git/hooks/pre-push ファイルを作成
cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash

# mainブランチへの直接pushを禁止
REMOTE=$1
URL=$2
BRANCH=$(git symbolic-ref HEAD 2>/dev/null | cut -d/ -f3)

if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  echo "ERROR: Direct push to $BRANCH is not allowed!"
  echo "Please create a feature branch and submit a pull request."
  exit 1
fi

# テストを実行
echo "Running tests before push..."
npm test
if [ $? -ne 0 ]; then
  echo "Tests failed. Push aborted."
  exit 1
fi

echo "All checks passed. Proceeding with push."
exit 0
EOF

chmod +x .git/hooks/pre-push
```

### Huskyによるチーム共有

Husky は Git Hooks をチームで共有するための Node.js ツールだ。`.git/hooks/` ではなく、バージョン管理されるディレクトリにフックを配置できる。

```bash
# huskyのインストール
npm install --save-dev husky

# huskyの初期化
npx husky init

# pre-commitフックの追加
echo "npx lint-staged" > .husky/pre-commit

# commit-msgフックの追加（commitlintと組み合わせ）
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg
```

**package.json の設定例**

```json
{
  "scripts": {
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml}": [
      "prettier --write"
    ]
  },
  "devDependencies": {
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0",
    "@commitlint/cli": "^18.0.0",
    "@commitlint/config-conventional": "^18.0.0"
  }
}
```

**commitlint.config.js の設定例**

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新機能
        'fix',      // バグ修正
        'docs',     // ドキュメント
        'style',    // フォーマット変更（機能変更なし）
        'refactor', // リファクタリング
        'perf',     // パフォーマンス改善
        'test',     // テスト追加・修正
        'build',    // ビルドシステム変更
        'ci',       // CI設定変更
        'chore',    // その他のメンテナンス
        'revert',   // コミットの取り消し
      ],
    ],
    'subject-max-length': [2, 'always', 100],
    'body-max-line-length': [2, 'always', 120],
  },
};
```

### post-mergeフックの活用

```bash
# .git/hooks/post-merge
cat > .git/hooks/post-merge << 'EOF'
#!/bin/bash

# マージ後にpackage.jsonが変更されていたらnpm installを実行
CHANGED=$(git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD | grep "package.json")
if [ -n "$CHANGED" ]; then
  echo "package.json was changed. Running npm install..."
  npm install
fi

# マージ後に.env.exampleが変更されていたら警告
ENV_CHANGED=$(git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD | grep ".env.example")
if [ -n "$ENV_CHANGED" ]; then
  echo "WARNING: .env.example was updated. Please update your .env file if necessary."
fi
EOF

chmod +x .git/hooks/post-merge
```

---

## 10. サブモジュールとサブツリー

### Git Submodules

サブモジュールは別のGitリポジトリを自分のリポジトリのサブディレクトリとして組み込む機能だ。親リポジトリは子リポジトリの特定のコミットを参照する。

```bash
# サブモジュールを追加
git submodule add https://github.com/team/shared-components.git packages/shared-components

# 特定のブランチを追跡するサブモジュールを追加
git submodule add -b main https://github.com/team/design-system.git packages/design-system

# .gitmodules ファイルが作成される
cat .gitmodules
# [submodule "packages/shared-components"]
#   path = packages/shared-components
#   url = https://github.com/team/shared-components.git

# サブモジュールの初期化と取得
git submodule update --init

# 再帰的に（ネストされたサブモジュールも含めて）初期化
git submodule update --init --recursive

# サブモジュールを含めてclone
git clone --recurse-submodules https://github.com/my/project.git
```

### サブモジュールの更新

```bash
# すべてのサブモジュールを最新に更新
git submodule update --remote

# 特定のサブモジュールを更新
git submodule update --remote packages/shared-components

# サブモジュールでの変更をコミット後、親リポジトリにも反映
cd packages/shared-components
git checkout main
git pull origin main
cd ../..
git add packages/shared-components
git commit -m "chore: Update shared-components to latest"
```

### サブモジュールの削除

```bash
# サブモジュールを削除する手順
# 1. .gitmodulesからエントリを削除
git config -f .gitmodules --remove-section submodule.packages/shared-components

# 2. .git/configからエントリを削除
git config --remove-section submodule.packages/shared-components

# 3. ステージングエリアとワーキングツリーから削除
git rm --cached packages/shared-components
rm -rf packages/shared-components

# 4. .git/modules/からのクリーンアップ
rm -rf .git/modules/packages/shared-components

# 5. コミット
git commit -m "chore: Remove shared-components submodule"
```

### Git Subtree（サブモジュールの代替）

Git Subtree はサブモジュールに代わるアプローチで、外部リポジトリのコードを自分のリポジトリに「コピー」として組み込む。サブモジュールと異なり、通常の `git clone` で全コードが取得できる。

```bash
# サブツリーとして外部リポジトリを追加
git subtree add --prefix=packages/shared-components \
  https://github.com/team/shared-components.git main --squash

# サブツリーを更新
git subtree pull --prefix=packages/shared-components \
  https://github.com/team/shared-components.git main --squash

# サブツリーへの変更を外部リポジトリにpush
git subtree push --prefix=packages/shared-components \
  https://github.com/team/shared-components.git main

# リモートを設定して短縮化
git remote add shared-components https://github.com/team/shared-components.git
git subtree add --prefix=packages/shared-components shared-components main --squash
git subtree pull --prefix=packages/shared-components shared-components main --squash
```

### サブモジュールとサブツリーの比較

| 比較項目 | Submodule | Subtree |
|---------|-----------|---------|
| 外部リポジトリとの連携 | 参照（ポインタ） | コピー |
| clone時の挙動 | 別途initが必要 | 通常のcloneで取得 |
| 外部への変更push | できる | できる（やや手間） |
| リポジトリサイズ | 小さい | 大きい |
| 複雑さ | 高い | 低い |
| 推奨される用途 | 頻繁に更新される外部依存 | 内部共有コード |

---

## 11. 大規模リポジトリの最適化

### Shallow Clone（浅いクローン）

shallow clone は指定した深さのコミット履歴のみをダウンロードする。CI/CDパイプラインでの高速化に特に有効だ。

```bash
# 直近1コミットのみをclone（最も浅い）
git clone --depth 1 https://github.com/large/project.git

# 直近10コミットをclone
git clone --depth 10 https://github.com/large/project.git

# 特定のブランチのみをclone（デフォルトブランチ以外）
git clone --depth 1 --branch feature/specific https://github.com/large/project.git

# shallow cloneを深くする（後から履歴を取得）
git fetch --unshallow

# 特定の深さまで履歴を取得
git fetch --depth=100
```

### Partial Clone（部分的クローン）

Git 2.19以降で使えるPartial Cloneは、必要なオブジェクトだけをダウンロードする高度な機能だ。

```bash
# blobオブジェクトを除外してclone（ファイルの内容は必要時に取得）
git clone --filter=blob:none https://github.com/large/project.git

# treeオブジェクトも除外（より積極的な遅延ロード）
git clone --filter=tree:0 https://github.com/large/project.git

# サイズ制限でフィルタリング（1MB以上のblobを除外）
git clone --filter=blob:limit=1m https://github.com/large/project.git

# partial cloneしたリポジトリで全オブジェクトを取得
git fetch --all --unshallow
```

### Git LFS（Large File Storage）

大きなバイナリファイルを効率的に管理するためのGit拡張機能。

```bash
# Git LFSのインストール（macOS）
brew install git-lfs
git lfs install

# 特定の拡張子をLFSで管理
git lfs track "*.psd"
git lfs track "*.mp4"
git lfs track "*.zip"
git lfs track "design-assets/**"

# .gitattributesに設定が追加される
cat .gitattributes
# *.psd filter=lfs diff=lfs merge=lfs -text
# *.mp4 filter=lfs diff=lfs merge=lfs -text

# LFS管理ファイルを確認
git lfs ls-files

# LFS統計情報の確認
git lfs status

# LFSオブジェクトを手動でpush
git lfs push --all origin
```

### gitコンフィグによるパフォーマンス最適化

```bash
# マルチコアを使ったパック処理の高速化
git config --global pack.threads 0  # 全コアを使用

# デルタ圧縮の設定
git config --global pack.windowMemory 256m
git config --global pack.packSizeLimit 2g

# プロトコル最適化（Git 2.26以降）
git config --global protocol.version 2

# ファイルシステムモニターの有効化（大規模リポジトリでのgit statusを高速化）
git config core.fsmonitor true
git config core.untrackedCache true

# HTTPSの接続設定
git config --global http.postBuffer 524288000  # 500MB
git config --global http.maxRequestBuffer 100m

# 定期的なガベージコレクション設定
git config --global gc.auto 6700
git config --global gc.autoPackLimit 50
```

### リポジトリの健全性確認とメンテナンス

```bash
# リポジトリの統計情報を確認
git count-objects -v

# ガベージコレクションの実行
git gc

# 積極的なパック最適化
git gc --aggressive

# リポジトリのサイズを膨らませているファイルを確認
git rev-list --objects --all | sort -k 2 > /tmp/allObjects.txt
git gc && git verify-pack -v .git/objects/pack/*.idx | \
  sort -k 3 -n -r | head -20 | \
  awk '{print $1}' | \
  xargs -I{} git rev-list --objects --all | \
  grep {} | \
  sort -k 2

# BFG Repo Cleanerを使った大きなファイルの削除（履歴から）
# https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --strip-blobs-bigger-than 50M repo.git
cd repo.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

---

## 12. コミットメッセージ規約

### Conventional Commits仕様

Conventional Commits は機械的に解析可能なコミットメッセージのフォーマット規約だ。これに従うことで、CHANGELOGの自動生成・セマンティックバージョニングの自動判定・コード変更の意図の明確化が実現できる。

**フォーマット**

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**実際のコミットメッセージ例**

```
feat(auth): Add OAuth2 login with Google

Implement Google OAuth2 authentication flow using the
official Google Identity Services library.

- Add GoogleOAuthButton component
- Implement token validation in backend
- Add user profile sync on first login

Closes #234
BREAKING CHANGE: The previous session token format is no longer supported.
Users will need to log in again after this update.
```

### タイプの使い分け

```bash
# 新機能の追加
git commit -m "feat(user): Add user avatar upload functionality"

# バグ修正
git commit -m "fix(cart): Fix quantity not updating on item removal"

# ドキュメント変更
git commit -m "docs(api): Update REST API authentication section"

# スタイル変更（機能に影響しない）
git commit -m "style(button): Apply consistent padding to all button variants"

# リファクタリング
git commit -m "refactor(db): Extract database connection to separate module"

# パフォーマンス改善
git commit -m "perf(images): Implement lazy loading for product gallery"

# テストの追加・修正
git commit -m "test(auth): Add integration tests for password reset flow"

# ビルドシステム・依存関係の変更
git commit -m "build(deps): Upgrade React from 18.2 to 19.0"

# CI設定の変更
git commit -m "ci(github): Add automatic deployment to staging on PR merge"

# その他のメンテナンス作業
git commit -m "chore(deps): Remove unused lodash dependency"

# 破壊的変更を含む場合（BREAKING CHANGE フッターまたは!を使用）
git commit -m "feat(api)!: Change authentication endpoint from /auth to /api/v2/auth"
```

### CHANGELOGの自動生成

Conventional Commits に従ったコミットメッセージがあれば、CHANGELOGを自動生成できる。

```bash
# conventional-changelogのインストール
npm install -g conventional-changelog-cli

# CHANGELOGを生成
conventional-changelog -p conventional -i CHANGELOG.md -s

# または @changesets/cli を使用
npm install --save-dev @changesets/cli
npx changeset init
```

### セマンティックリリースによる自動バージョニング

```bash
# semantic-releaseのインストール
npm install --save-dev semantic-release

# コミットメッセージに基づいてバージョンが自動決定される
# feat: -> minor version bump (1.0.0 -> 1.1.0)
# fix:  -> patch version bump (1.0.0 -> 1.0.1)
# feat!: または BREAKING CHANGE: -> major version bump (1.0.0 -> 2.0.0)
```

---

## 13. ブランチ戦略の選択

### GitHub Flow

シンプルで軽量なフロー。継続的デリバリーに適している。

```
main
  |
  +-- feature/add-search ----+
  |                          |
  +-- fix/login-bug ----+    |
  |                     |    |
  +<--------------------+    |
  |                          |
  +<-------------------------+
```

**運用ルール**

```bash
# 1. mainから作業ブランチを作成
git checkout main
git pull origin main
git checkout -b feature/add-search-functionality

# 2. 作業してコミット
git add src/search/
git commit -m "feat(search): Add full-text search with Elasticsearch"
git push origin feature/add-search-functionality

# 3. Pull Requestを作成してレビュー
# （GitHub UI またはgh CLI使用）
gh pr create --title "feat: Add full-text search" --body "Implements #123"

# 4. レビュー後にmainにマージ
# （マージ後にmainから自動デプロイ）

# 5. ブランチを削除
git branch -d feature/add-search-functionality
git push origin --delete feature/add-search-functionality
```

### Git Flow

より複雑な製品で、定期リリースサイクルがある場合に適している。

```
main (タグ付きリリース)
  |
develop (統合ブランチ)
  |
  +-- feature/new-dashboard ----+
  |                             |
  +-- feature/payment-v2 ----+  |
  |                          |  |
  |                          +->|
  |                             +-> develop
  |
  +-- release/v2.1.0 -> main (リリース時)
  |
  +-- hotfix/critical-bug -> main + develop
```

```bash
# git-flow ツールを使った場合
git flow init

# フィーチャーブランチの開始
git flow feature start new-payment-system
# 内部的には: git checkout -b feature/new-payment-system develop

# フィーチャー完了（developにマージ）
git flow feature finish new-payment-system
# 内部的には: git checkout develop && git merge --no-ff feature/new-payment-system

# リリースブランチの開始
git flow release start 2.1.0
# バグ修正のみ許可

# リリース完了（main + develop両方にマージ）
git flow release finish 2.1.0

# ホットフィックス
git flow hotfix start critical-security-patch
git flow hotfix finish critical-security-patch
```

### Trunk-Based Development（トランクベース開発）

全員が毎日（または数時間ごとに）mainブランチにコミットするアプローチ。Feature Flags と組み合わせることで、未完成の機能を隠しつつ継続的インテグレーションを実現する。

```bash
# 短命なブランチを作成（1〜2日以内にmerge）
git checkout -b feature/add-tooltip
# 作業
git commit -m "feat(ui): Add tooltip component with Feature Flag"
# Feature Flagで制御
# if (featureFlags.isEnabled('NEW_TOOLTIP')) { ... }
git push origin feature/add-tooltip
# 即座にPRを作成してマージ
gh pr create --title "feat: Add tooltip (behind flag)"
```

### ブランチ命名規約

```bash
# 推奨される命名規則
# feature/<issue-number>-<short-description>
git checkout -b feature/123-add-user-profile

# fix/<issue-number>-<short-description>
git checkout -b fix/456-login-redirect-bug

# hotfix/<version>-<short-description>
git checkout -b hotfix/v2.1.1-critical-xss-vulnerability

# release/<version>
git checkout -b release/v2.1.0

# chore/<short-description>
git checkout -b chore/update-dependencies

# ブランチ一覧をパターンでフィルタ
git branch -r | grep "feature/"
git branch -r | grep "^.*fix/"
```

### ブランチの保護設定

```bash
# GitHub CLIでブランチ保護ルールを設定
gh api repos/{owner}/{repo}/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["ci/test","ci/lint"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":2}' \
  --field restrictions=null
```

---

## 14. Git統合ツールとエコシステム

### GitLensとVSCode Git統合

GitLensはVSCodeで最も人気の高いGit拡張機能だ。コードの各行に誰がいつ変更したかを表示する「blame annotations」が特に有名だが、それ以外にも多数の機能がある。

**主要機能**

- **File Blame**: ファイル全体のblame情報をサイドバーに表示
- **Line Blame**: カーソルがある行のコミット情報をインラインに表示
- **CodeLens**: 関数・クラス定義の上にコミット情報を表示
- **Commit Graph**: グラフィカルなコミット履歴ビューア
- **Interactive Rebase Editor**: GUIでinteractive rebaseを操作

```bash
# VSCodeのターミナルからGitLensが提供するコマンドの例
# コマンドパレットで使用: Cmd/Ctrl + Shift + P

# GitLens: Show Branch History
# GitLens: Show File History
# GitLens: Show Line History
# GitLens: Open Revision File
# GitLens: Compare Working Tree with Branch...
```

### tig - CUIベースのGitブラウザ

tig はターミナル上でGitのログ・差分・ファイル状態などをインタラクティブに閲覧できるCUIツールだ。

```bash
# インストール（macOS）
brew install tig

# 基本的な使い方
tig                      # コミットログを表示
tig status               # git statusをインタラクティブに表示
tig log                  # ログをビューア表示
tig blame <file>         # ファイルのblame表示
tig show <commit>        # 特定のコミットを表示
tig stash                # stash一覧をインタラクティブに表示
tig refs                 # ブランチ・タグ一覧

# 全ブランチのログを表示
tig --all

# 特定のファイルの変更履歴
tig -- src/auth.ts

# キーバインド（tig内）
# j/k または 上下矢印: スクロール
# Enter: 選択した項目を開く
# q: 終了
# /: 検索
# R: リフレッシュ
# F: フェッチ
# C: チェリーピック（差分ビュー内で）
```

### lazygit - リッチなCUI Gitクライアント

lazygit はよりインタラクティブなCUI Gitクライアントで、マウス操作にも対応している。

```bash
# インストール（macOS）
brew install lazygit

# 起動
lazygit

# または特定のリポジトリで起動
lazygit -p /path/to/repo

# 主な操作パネル
# 1: Status（ファイルパネル）
# 2: Branches（ブランチパネル）
# 3: Commits（コミットパネル）
# 4: Stash（スタッシュパネル）
# 5: Files in diff（差分ファイルパネル）

# コミットパネルでの便利な操作
# r: コミットメッセージの編集（reword）
# s: スカッシュ（前のコミットと統合）
# d: ドロップ（コミットの削除）
# e: コミットの編集
# i: Interactive rebaseモードに入る
```

### git alias の活用

よく使うコマンドをエイリアスとして設定することで作業効率が向上する。

```bash
# 基本的なエイリアス
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.di diff
git config --global alias.dc "diff --cached"

# より高度なエイリアス
# グラフ付きログ表示
git config --global alias.lg "log --graph --oneline --decorate --all"

# 詳細なグラフ付きログ
git config --global alias.lga "log --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit --all"

# ファイルの変更なしに直近のコミットメッセージを修正
git config --global alias.amend "commit --amend --no-edit"

# ステージングをクリア（git addの取り消し）
git config --global alias.unstage "reset HEAD --"

# 直近のコミットを確認
git config --global alias.last "log -1 HEAD --stat"

# ブランチの整理（マージ済みブランチを削除）
git config --global alias.cleanup "!git branch --merged | grep -v '\\*\\|main\\|master\\|develop' | xargs -n 1 git branch -d"

# stashの一覧を詳しく表示
git config --global alias.sl "stash list --stat"

# リモートとの比較
git config --global alias.incoming "log HEAD..@{upstream} --oneline"
git config --global alias.outgoing "log @{upstream}..HEAD --oneline"
```

### gh CLI（GitHub CLI）の高度な活用

```bash
# PRの作成（インタラクティブ）
gh pr create

# PRのレビューをリクエスト
gh pr create --reviewer @username --assignee @me

# 特定のPRをチェックアウト
gh pr checkout 123

# PRの状態確認
gh pr status

# Issue一覧の表示
gh issue list --label "bug" --assignee "@me"

# Issueの作成
gh issue create --title "Bug: Login fails on mobile" --label "bug" --assignee "@me"

# GitHub Actionsのワークフロー実行
gh workflow run deploy.yml --ref main

# ワークフローの実行履歴確認
gh run list --workflow=deploy.yml

# リリースの作成
gh release create v2.1.0 --generate-notes

# リポジトリの検索
gh repo search "language:typescript stars:>1000" --limit 20

# PRのdiffをページャで表示
gh pr diff 123

# PRにコメント
gh pr comment 123 --body "LGTM! Changes look good."

# CIのステータス確認
gh pr checks 123
```

### git log の高度な使い方

```bash
# 特定の文字列が追加/削除されたコミットを検索
git log -S "processPayment" --oneline
git log -S "old-function-name" --oneline -p  # 差分も表示

# 正規表現でコミットメッセージを検索
git log --grep="fix.*auth" --oneline
git log --grep="^feat(" --oneline

# 特定の著者のコミット
git log --author="Yamada" --oneline

# 期間でフィルタ
git log --after="2025-01-01" --before="2025-12-31" --oneline
git log --since="2 weeks ago" --oneline

# ファイルの変更履歴（削除されたファイルも含む）
git log --all --full-history -- path/to/deleted/file.ts

# 統計情報付きログ
git log --stat --oneline -10

# 差分付きログ
git log -p -3  # 直近3コミットの差分

# 特定のブランチ間の差分コミット
git log main..feature/new-feature --oneline

# マージコミットを除外
git log --no-merges --oneline

# 各コミットのファイル変更数を表示
git log --format="%h %s" --name-status | head -30
```

### gitconfig の包括的な設定

```bash
# ユーザー情報
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# デフォルトエディタをVSCodeに設定
git config --global core.editor "code --wait"

# デフォルトブランチ名をmainに設定
git config --global init.defaultBranch main

# プッシュの挙動（現在のブランチのみpush）
git config --global push.default current

# pull の挙動（rebaseを使用）
git config --global pull.rebase true

# rebaseの自動スタッシュ（pullでローカル変更があっても実行）
git config --global rebase.autoStash true

# differのツール設定
git config --global diff.tool vimdiff
git config --global merge.tool vimdiff

# 大文字・小文字を区別（Linuxとの互換性のため）
git config --global core.ignoreCase false

# 行末の自動変換（Windows対応）
# Windows
git config --global core.autocrlf true
# macOS/Linux
git config --global core.autocrlf input

# URLの書き換え（HTTPSをSSHに）
git config --global url."git@github.com:".insteadOf "https://github.com/"

# カラー設定
git config --global color.ui auto
git config --global color.diff.old "red bold"
git config --global color.diff.new "green bold"

# セキュリティ設定
git config --global transfer.fsckObjects true
git config --global fetch.fsckObjects true
git config --global receive.fsckObjects true
```

### .gitignore のベストプラクティス

```bash
# グローバル.gitignoreの設定（全リポジトリ共通）
git config --global core.excludesfile ~/.gitignore_global

# ~/.gitignore_global の内容例
cat ~/.gitignore_global
# macOS
.DS_Store
.AppleDouble
.LSOverride

# エディタ
.idea/
.vscode/
*.swp
*.swo

# OS
Thumbs.db
Desktop.ini

# ログ
*.log

# プロジェクト固有の.gitignore に含めるべきもの
# node_modules/
# dist/
# .env
# .env.local
# coverage/
# .next/
# build/

# 既に追跡されているファイルを.gitignoreに追加する場合
git rm --cached <file>
git rm -r --cached <directory>
git add .
git commit -m "chore: Remove tracked files that should be ignored"

# gitignoreされているかチェック
git check-ignore -v src/.env.local
```

### Git Bisect + テスト自動化の実践パターン

```bash
# プロジェクト固有のbisect自動化スクリプト
cat > scripts/bisect-test.sh << 'EOF'
#!/bin/bash

# 依存関係のインストール（毎回実行）
npm ci --silent 2>/dev/null || exit 125  # 125はskipを意味する

# ビルド
npm run build --silent 2>/dev/null || exit 125

# 特定のテストだけを実行
npx jest src/payment/checkout.test.ts --silent 2>/dev/null
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "GOOD: Tests passed"
  exit 0
else
  echo "BAD: Tests failed"
  exit 1
fi
EOF
chmod +x scripts/bisect-test.sh

# bisectを実行
git bisect start
git bisect bad HEAD
git bisect good v3.2.0
git bisect run ./scripts/bisect-test.sh
git bisect reset
```

---

## まとめ：Git上級テクニックの活用指針

本記事で紹介したテクニックを整理すると以下のようになる。

### 日常的に使うべきテクニック

1. **Interactive Rebase**: PRを出す前にコミット履歴を整理する習慣をつける
2. **Stash with messages**: 複数の作業を並行して進める際に、各stashに意味のあるメッセージをつける
3. **Conventional Commits**: チームの共通言語としてコミットメッセージの規約を統一する
4. **Git Aliases**: よく使うコマンドをエイリアス化して効率化する

### トラブル時に使うテクニック

1. **Reflog**: 「やってしまった」ときの最後の砦として reflog を知っておく
2. **Bisect**: 「いつから壊れた？」の回答を効率的に得る
3. **Cherry-pick**: 必要な変更だけを選択的に取り込む

### チームワークに関するテクニック

1. **Git Hooks + Husky**: コード品質基準をチームで統一する
2. **ブランチ戦略の選択**: プロジェクトの性質に合ったブランチ戦略を選ぶ
3. **サブモジュール/サブツリー**: 大規模プロジェクトでのコード共有に活用する

### パフォーマンスと大規模開発

1. **Shallow/Partial Clone**: CI/CDや開発環境の初期化を高速化する
2. **Sparse-checkout**: 巨大なモノリポジトリで必要な部分のみを扱う
3. **Worktree**: 複数のブランチを同時並行で作業する

---

## 開発効率をさらに高めるツール

Gitの上級テクニックをマスターしたら、開発ワークフロー全体の効率化も検討してほしい。

**DevToolBox**（[https://usedevtools.com](https://usedevtools.com)）は、開発者の日常業務を効率化するためのオンラインツール集だ。JSON フォーマッター・Base64エンコーダー・UUID生成器・Cron式ビルダー・正規表現テスター・Diff ビューアなど、開発現場でよく使うツールが一箇所にまとまっている。

ブラウザからすぐにアクセスできるため、ローカルへのインストールなしに素早く使えるのが特徴だ。Git操作と組み合わせて使うと、差分確認・JSON検証・設定ファイルの編集などの作業がよりスムーズになる。

---

## 参考リソース

- [Pro Git Book](https://git-scm.com/book/ja/v2) - Gitの公式ドキュメント（日本語対応）
- [Conventional Commits仕様](https://www.conventionalcommits.org/ja/v1.0.0/) - コミットメッセージ規約の公式仕様
- [GitHub Flow](https://docs.github.com/ja/get-started/using-github/github-flow) - GitHubが推奨するワークフロー
- [Husky公式ドキュメント](https://typicode.github.io/husky/) - Git Hooksのチーム共有ツール
- [Git LFS公式ドキュメント](https://git-lfs.com/) - 大きなファイルの管理ツール
- [lazygit GitHub](https://github.com/jesseduffield/lazygit) - CUI Gitクライアント

Gitは「慣れ」が大切なツールだ。本記事で紹介したテクニックをひとつずつ日常の開発作業に取り入れていくことで、徐々に使いこなせるようになる。最初は難しく感じるコマンドも、何度も実践するうちに自然と手が動くようになる。焦らず、一つひとつのコマンドの意味を理解しながら習得していこう。

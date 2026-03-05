---
title: 'チーム開発のGitワークフロー完全ガイド'
description: 'チーム開発で使われる3大Gitワークフロー（Git Flow, GitHub Flow, Trunk-Based Development）を徹底比較。それぞれのメリット・デメリット、使い分け、実践例、よくある問題と解決策まで完全解説。'
pubDate: 'Feb 05 2026'
tags: ['プログラミング']
---

「チーム開発でどのGitワークフローを使うべきか？」この問いに明確な答えを持っているチームは少ないです。結果、各メンバーが好き勝手にブランチを切り、マージ地獄に陥ります。

この記事では、現場で使われる3大ワークフロー（**Git Flow**, **GitHub Flow**, **Trunk-Based Development**）を徹底比較し、チームに最適な選択をサポートします。

## 結論：どのワークフローを選ぶべきか

先に結論を示します。プロジェクトの性質で選んでください。

| ワークフロー | 適したプロジェクト | チーム規模 |
|-----------|----------------|---------|
| **Git Flow** | パッケージソフト、複数バージョン管理 | 5人以上 |
| **GitHub Flow** | SaaS、Webアプリ、継続的デプロイ | 2-10人 |
| **Trunk-Based** | ハイペース開発、CI/CD重視 | 10人以上 |

### 簡易判定フローチャート

```
リリースサイクルは？
├─ 不定期（v1.0, v2.0...） → Git Flow
├─ 毎日〜毎週 → GitHub Flow or Trunk-Based
└─ 1日複数回 → Trunk-Based

チームの成熟度は？
├─ Git初心者が多い → GitHub Flow
├─ 中級者以上 → Git Flow or Trunk-Based
└─ 上級者+自動テスト完備 → Trunk-Based

リリース方法は？
├─ 手動デプロイ → Git Flow or GitHub Flow
└─ 完全自動（CI/CD） → Trunk-Based
```

## 1. Git Flow

### 概要

Vincent Driessenが2010年に提唱した、**最も体系化されたワークフロー**。複数の長期ブランチと、明確なブランチ戦略を持つのが特徴。

### ブランチ構成

```
main (master)      ─────●─────────────●────────→
                        │             │
release              ┌──●──┐       ┌──●──┐
                     │     │       │     │
develop    ─────●────●─────●───●───●─────●────→
                │              │
feature         └──●──┐    ┌──●──┐
                      │    │     │
hotfix                     └─────●─→ main
```

#### 5種類のブランチ

1. **main（master）** - 本番環境と同じコード。タグでバージョン管理
2. **develop** - 次リリースの開発ベース
3. **feature/*** - 新機能開発（developから分岐）
4. **release/*** - リリース準備（developから分岐、main + developにマージ）
5. **hotfix/*** - 緊急バグ修正（mainから分岐、main + developにマージ）

### 実践例

#### 新機能開発

```bash
# developから新機能ブランチを作成
git checkout develop
git checkout -b feature/user-authentication

# 開発作業
git add .
git commit -m "Add login form"
git commit -m "Add authentication API"

# developにマージ
git checkout develop
git merge --no-ff feature/user-authentication
git branch -d feature/user-authentication
git push origin develop
```

**`--no-ff`フラグが重要:**
- Fast-forwardマージを禁止
- マージコミットを明示的に作る
- 履歴が「どの機能がいつマージされたか」追跡可能

#### リリース準備

```bash
# developからリリースブランチ作成
git checkout develop
git checkout -b release/v1.2.0

# バージョン番号更新、バグ修正のみ
sed -i 's/"version": "1.1.0"/"version": "1.2.0"/' package.json
git commit -am "Bump version to 1.2.0"

# 軽微なバグ修正
git commit -m "Fix typo in error message"

# mainにマージ（リリース）
git checkout main
git merge --no-ff release/v1.2.0
git tag -a v1.2.0 -m "Release version 1.2.0"
git push origin main --tags

# developにもマージ（バグ修正を反映）
git checkout develop
git merge --no-ff release/v1.2.0
git branch -d release/v1.2.0
```

#### 緊急バグ修正（Hotfix）

```bash
# mainから緊急修正ブランチ作成
git checkout main
git checkout -b hotfix/security-patch

# 修正作業
git commit -m "Fix critical security vulnerability"

# mainにマージ
git checkout main
git merge --no-ff hotfix/security-patch
git tag -a v1.2.1 -m "Hotfix: security patch"
git push origin main --tags

# developにもマージ
git checkout develop
git merge --no-ff hotfix/security-patch
git branch -d hotfix/security-patch
```

### メリット

- ✅ **明確なルール** - どのブランチで何をするか明確
- ✅ **複数バージョン管理** - v1.x と v2.x を同時開発可能
- ✅ **リリース品質の担保** - releaseブランチで最終調整
- ✅ **履歴が綺麗** - `--no-ff`で機能単位のマージが追跡可能

### デメリット

- ❌ **複雑** - 初心者には理解が難しい
- ❌ **ブランチが多い** - 切り替えミスが起きやすい
- ❌ **マージコンフリクト** - 長期ブランチで衝突頻発
- ❌ **CI/CD向きではない** - 継続的デプロイに不向き

### 使うべきケース

- パッケージソフトウェア（複数バージョンのサポート必要）
- モバイルアプリ（審査待ちの間も開発継続）
- 大規模プロジェクト（明確なルールが必要）

## 2. GitHub Flow

### 概要

GitHubが推奨する**シンプルで軽量なワークフロー**。継続的デプロイを前提とした設計。

### ブランチ構成

```
main    ─────●─────●─────●─────●─────●────→
              │     │     │     │     │
feature       └●●●─┘     │     │     │
feature             └●●●─┘     │     │
feature                   └●●●─┘     │
feature                         └●●●─┘
```

#### 2種類のブランチのみ

1. **main** - 常にデプロイ可能な状態（本番と同じ）
2. **feature/*** - 作業ブランチ（mainから分岐、mainにマージ）

### 実践例

#### 新機能開発（標準フロー）

```bash
# 1. mainから作業ブランチ作成
git checkout main
git pull origin main
git checkout -b feature/add-dark-mode

# 2. 開発作業（こまめにコミット）
git add .
git commit -m "Add dark mode toggle button"
git commit -m "Implement dark mode styles"
git commit -m "Add dark mode preference storage"

# 3. リモートにプッシュ
git push -u origin feature/add-dark-mode

# 4. GitHub上でPull Request作成
# ブラウザで操作 or gh CLI:
gh pr create --title "Add dark mode support" --body "Implements dark mode with user preference storage"

# 5. レビュー＆修正
# レビュー指摘を受けたら、同じブランチで修正してpush
git commit -m "Fix review feedback: improve contrast ratio"
git push origin feature/add-dark-mode

# 6. CI通過＋承認後、mainにマージ
# GitHub上でマージボタン or CLI:
gh pr merge --squash --delete-branch

# 7. ローカルのmainを更新
git checkout main
git pull origin main
```

### Pull Requestのベストプラクティス

#### PR説明テンプレート

```markdown
## 変更内容
ダークモード機能を追加しました。

## 変更理由
ユーザーからの要望が多く、アクセシビリティ向上のため。

## スクリーンショット
（UI変更の場合、Before/Afterの画像を添付）

## テスト
- [ ] ローカルで動作確認済み
- [ ] 既存のテストが通過
- [ ] 新規テストを追加（該当する場合）

## チェックリスト
- [ ] ESLintエラーなし
- [ ] コードレビューを受けた
- [ ] ドキュメント更新済み（必要な場合）
```

#### レビューのポイント

**レビュアーがチェックすべきこと:**
- コードの品質（可読性、保守性）
- バグの可能性
- パフォーマンスへの影響
- セキュリティリスク
- テストの有無

**コメント例:**

```
✅ Good:
「この関数、エッジケース（空配列）でエラーになりそうです。
 ガード節を追加してはどうでしょう？」

❌ Bad:
「ここ、バグってます。」
```

### メリット

- ✅ **シンプル** - 初心者でも理解しやすい
- ✅ **高速** - ブランチが短命、マージが早い
- ✅ **CI/CD向き** - mainが常にデプロイ可能
- ✅ **レビュー文化** - Pull Requestで品質担保

### デメリット

- ❌ **複数バージョン管理が困難** - mainが1つしかない
- ❌ **大規模チームでは衝突** - 同時に多数のPRがあると混乱
- ❌ **ロールバックが面倒** - mainを直接巻き戻す必要

### 使うべきケース

- SaaS、Webアプリ（継続的デプロイ）
- スタートアップ（スピード重視）
- 小〜中規模チーム（2-10人）

## 3. Trunk-Based Development

### 概要

**1つのメインブランチ（trunk）に直接コミット**、またはごく短命のブランチのみ使う、超高速ワークフロー。Google、Facebookなど巨大企業が採用。

### ブランチ構成

```
main    ─●─●─●─●─●─●─●─●─●─●─●─●─●─●─●─●─→
         │ │ │ │ │ │ │ │ │ │ │ │ │ │ │ │
短命     └┘ └┘ └┘ └┘ └┘ └┘ └┘ └┘
ブランチ  （全て24時間以内にマージ）
```

#### ルール

1. **mainブランチのみ**（developもない）
2. 作業ブランチは**24時間以内にマージ**
3. **常にデプロイ可能な状態**を保つ
4. **CI/CDが必須**（自動テスト、自動デプロイ）
5. **Feature Flag**で未完成機能を隠す

### 実践例

#### 小さな変更（直接コミット）

```bash
# mainに直接コミット
git checkout main
git pull origin main

# 小さな変更（1-2時間で完了）
git add .
git commit -m "Fix typo in homepage title"
git push origin main

# CI/CDが自動的にテスト→デプロイ
```

#### 中規模の変更（短命ブランチ）

```bash
# mainから作業ブランチ
git checkout main
git pull origin main
git checkout -b refactor-auth-logic

# 数時間で完了させる作業
git commit -m "Extract authentication logic"
git commit -m "Add unit tests for auth module"

# 当日中にマージ
git push -u origin refactor-auth-logic
gh pr create --title "Refactor authentication logic" --body "..."
# CI通過後、即マージ
gh pr merge --squash --delete-branch

# 24時間を超えそうなら、途中でもマージ（Feature Flagで隠す）
```

#### Feature Flagを使った大規模変更

```javascript
// 未完成機能をフラグで隠す
const features = {
  newCheckout: process.env.FEATURE_NEW_CHECKOUT === 'true',
};

app.get('/checkout', (req, res) => {
  if (features.newCheckout) {
    return newCheckoutFlow(req, res); // 開発中
  }
  return oldCheckoutFlow(req, res); // 既存
});
```

```bash
# 本番では新機能を無効化
FEATURE_NEW_CHECKOUT=false npm start

# ステージング環境では有効化
FEATURE_NEW_CHECKOUT=true npm start

# 完成したらフラグを削除し、新コードのみ残す
```

### メリット

- ✅ **超高速** - マージ待ち時間ゼロ
- ✅ **コンフリクト最小** - 短命ブランチで衝突しにくい
- ✅ **CI/CDと相性抜群** - 自動化前提の設計
- ✅ **シンプル** - ブランチ戦略がほぼ不要

### デメリット

- ❌ **高い技術力が必要** - 自動テスト、CI/CD必須
- ❌ **初心者には困難** - 「壊さない」スキルが必要
- ❌ **大規模リファクタリングが難しい** - 24時間制約
- ❌ **ツール依存** - Feature Flag管理ツールが必要

### 使うべきケース

- ハイペース開発（1日複数回デプロイ）
- 大規模チーム（自動化されたプロセス）
- CI/CDが完全に整備されている
- テストカバレッジが高い（80%以上）

## ワークフロー比較表

| 項目 | Git Flow | GitHub Flow | Trunk-Based |
|-----|---------|-------------|-------------|
| **ブランチ数** | 5種類 | 2種類 | 1種類（+短命） |
| **学習コスト** | 高 | 低 | 中 |
| **マージ頻度** | 週1-2回 | 日1-3回 | 日5-10回 |
| **リリース方法** | 手動 | 手動 or 自動 | 完全自動 |
| **CI/CD必須度** | 任意 | 推奨 | 必須 |
| **複数バージョン** | ✅ 得意 | ❌ 困難 | ❌ 困難 |
| **初心者向き** | ❌ | ✅ | ❌ |
| **チーム規模** | 5-20人 | 2-10人 | 10-100人 |

## よくある問題と解決策

### Q1: mainとdevelopの違いが分からない（Git Flow）

**A: こう覚えましょう。**

- **main** = 本番環境（顧客が使っているコード）
- **develop** = 次のリリース候補（開発中のコード）

```
main     v1.0 ────── v1.1 ────── v1.2
develop       v1.1開発 ── v1.2開発 ── v1.3開発
```

### Q2: マージコンフリクトが頻発する

**原因:**
- ブランチが長期化
- 同じファイルを複数人が編集

**解決策:**

```bash
# こまめにdevelopを自分のブランチにマージ
git checkout feature/my-feature
git merge develop
git push origin feature/my-feature

# または rebase（履歴が綺麗になる）
git rebase develop
git push --force-with-lease origin feature/my-feature
```

**ベストプラクティス:**
- 1日1回は親ブランチをマージ
- ブランチは3日以内にマージ
- 大きな変更は小さく分割

### Q3: レビュー待ちでブロックされる

**解決策:**

#### PRサイズを小さくする

```bash
# ❌ 悪い例: 1つのPRで全部
git commit -m "Implement entire user management system"

# ✅ 良い例: 複数のPRに分割
# PR1: データベーススキーマ
git commit -m "Add users table schema"

# PR2: API実装
git commit -m "Add user CRUD API endpoints"

# PR3: UI実装
git commit -m "Add user management UI"
```

#### レビュー時間のルール化

```
チームルール:
- PRは24時間以内にレビュー開始
- 緊急PRは2時間以内
- 1日1回は必ずレビュー時間を確保
```

### Q4: hotfixをdevelopに反映し忘れる（Git Flow）

**解決策: チェックリスト化**

```bash
# hotfix完了時のチェックリスト
echo "Hotfix checklist:
1. [ ] mainにマージ
2. [ ] タグ作成（git tag v1.2.1）
3. [ ] developにマージ ← これを忘れがち！
4. [ ] releaseブランチが存在すればそこにもマージ
5. [ ] デプロイ確認
" > hotfix-checklist.md
```

### Q5: Feature Flagが増えすぎて管理不能

**解決策: 定期削除ルール**

```javascript
// フラグに有効期限を設定
const features = {
  newCheckout: {
    enabled: process.env.FEATURE_NEW_CHECKOUT === 'true',
    expiresAt: '2026-03-01', // この日までに削除
    owner: 'team-checkout',
  },
};

// 期限切れフラグを警告
Object.entries(features).forEach(([name, config]) => {
  if (new Date(config.expiresAt) < new Date()) {
    console.warn(`Feature flag "${name}" is expired. Remove it!`);
  }
});
```

## 実践ツール

### 1. git-flow拡張（Git Flow用）

```bash
# インストール
brew install git-flow

# 初期化
git flow init

# 新機能開発
git flow feature start user-auth
git flow feature finish user-auth

# リリース
git flow release start v1.2.0
git flow release finish v1.2.0
```

### 2. GitHub CLI（GitHub Flow用）

```bash
# インストール
brew install gh

# Pull Request作成
gh pr create --title "Add feature" --body "Description"

# レビュー
gh pr review 123 --approve
gh pr review 123 --comment --body "LGTM"

# マージ
gh pr merge 123 --squash
```

### 3. Feature Flag管理（Trunk-Based用）

**LaunchDarkly（有料）:**
```javascript
const LaunchDarkly = require('launchdarkly-node-server-sdk');
const client = LaunchDarkly.init(process.env.LD_SDK_KEY);

app.get('/checkout', async (req, res) => {
  const showNewCheckout = await client.variation(
    'new-checkout',
    { key: req.user.id },
    false
  );

  if (showNewCheckout) {
    return newCheckoutFlow(req, res);
  }
  return oldCheckoutFlow(req, res);
});
```

**Unleash（オープンソース）:**
```javascript
const { initialize } = require('unleash-client');

const unleash = initialize({
  url: 'http://unleash.example.com/api/',
  appName: 'my-app',
  customHeaders: { Authorization: process.env.UNLEASH_API_KEY },
});

if (unleash.isEnabled('new-checkout')) {
  // 新機能
}
```

## チームでの導入ステップ

### ステップ1: 現状分析

```
質問リスト:
- リリース頻度は？（週1? 日1? 時間1?）
- チームサイズは？
- CI/CDは整備されている？
- テストカバレッジは？
- 複数バージョンの同時サポートが必要？
```

### ステップ2: ワークフロー選定

上記の表と照らし合わせて選択。

### ステップ3: ドキュメント化

```markdown
# プロジェクト名 Gitワークフロー

## 採用ワークフロー
GitHub Flow

## ブランチ命名規則
- feature/機能名（例: feature/user-authentication）
- fix/バグ名（例: fix/login-redirect）
- docs/ドキュメント名（例: docs/api-reference）

## PR作成ルール
1. タイトルは動詞で始める（Add, Fix, Update...）
2. 説明にスクリーンショット添付（UI変更時）
3. レビュアーを2名以上指定
4. CI通過必須

## マージルール
- Squash mergeを使用
- PRタイトルがコミットメッセージになる
- レビュー承認1名以上必須
```

### ステップ4: チーム教育

- 全員でワークフローを読み合わせ
- 模擬PRを作って練習
- 疑問点をドキュメントに追記

### ステップ5: 運用＆改善

- 1ヶ月後に振り返り
- 問題点を洗い出し
- ルールを調整

## DevToolBoxで開発効率化

Gitワークフローを決めたら、日々の開発作業を効率化しましょう。[DevToolBox](https://devtoolbox.app)には、JSON整形、Base64変換、正規表現テストなど、開発者向けツールが揃っています。

特に**APIレスポンスの検証**や**環境変数の生成**に便利。ブラウザだけで使えて、登録不要・完全無料です。

## まとめ

チーム開発の3大Gitワークフロー:

### Git Flow
- ✅ 複雑だが体系的
- ✅ 複数バージョン管理に強い
- 🎯 パッケージソフト、モバイルアプリ向け

### GitHub Flow
- ✅ シンプルで分かりやすい
- ✅ CI/CDと相性良し
- 🎯 SaaS、Webアプリ向け

### Trunk-Based Development
- ✅ 超高速、コンフリクト少ない
- ✅ 自動化必須
- 🎯 大規模チーム、ハイペース開発向け

**どれが正解ということはありません。** プロジェクトの性質、チームの成熟度、リリース頻度で選んでください。

そして最も重要なのは、**選んだワークフローをチーム全員が理解し、守ること**。ルールが曖昧なまま進めると、Git Flowを採用してもGitHub Flowを採用しても、結局混乱します。

まずは小さく始めて、チームに合わせて調整していきましょう。

---

**関連記事:**
- [Git コマンド完全ガイド — 現場で使える実践テクニック](/blog/git-workflow-best-practices)
- [GitHub Actions入門 — CI/CDパイプライン構築ガイド](/blog/github-actions-cicd-tutorial)
- [チーム開発ベストプラクティス — コードレビューの極意](/blog/web-security-basics-2026)

**ツール紹介:**
[DevToolBox](https://devtoolbox.app)は、エンジニアの日常業務を効率化する無料ツール集。JSON整形、Base64変換、パスワード生成、QRコード作成など、ブラウザだけで使える便利ツールが揃っています。環境構築不要、登録不要、完全無料。

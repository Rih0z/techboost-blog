---
title: '【初心者向け】Next.js + Vercel で無料Webアプリを公開する完全ガイド'
description: 'Next.jsで作ったWebアプリをVercelに無料でデプロイする方法を、ゼロから丁寧に解説。環境構築からデプロイ、カスタムドメイン設定まで。'
pubDate: 'Feb 04 2026'
tags: ['プログラミング']
---

Next.jsで作ったWebアプリを、Vercelの無料プランで世界に公開する方法を解説します。費用は完全にゼロです。

## 前提条件

- Node.js（v18以上）がインストール済み
- GitHubアカウントを持っている
- ターミナル（コマンドライン）の基本操作ができる

## Step 1: Next.jsプロジェクトの作成

```bash
npx create-next-app@latest my-app
cd my-app
npm run dev
```

ブラウザで `http://localhost:3000` を開き、アプリが表示されれば成功です。

## Step 2: GitHubリポジトリの作成

```bash
git init
git add .
git commit -m "initial commit"
gh repo create my-app --public --source=. --push
```

GitHub CLIを使うと、リポジトリの作成からプッシュまで1コマンドで完了します。

## Step 3: Vercelでデプロイ

### 方法A: Vercel Webサイトから

1. [vercel.com](https://vercel.com) にアクセス
2. GitHubアカウントでログイン
3. 「Import Project」をクリック
4. GitHubリポジトリを選択
5. 「Deploy」をクリック

### 方法B: Vercel CLIから

```bash
npm i -g vercel
vercel login
vercel --prod
```

数分でデプロイが完了し、`https://my-app.vercel.app` のようなURLが発行されます。

## Step 4: カスタムドメインの設定（任意）

独自ドメインを持っている場合:

1. Vercelダッシュボードでプロジェクトを選択
2. Settings → Domains
3. ドメインを入力
4. DNSレコードを設定

## Vercel無料プランの制限

| 項目 | 制限 |
|------|------|
| 帯域幅 | 100GB/月 |
| サーバーレス関数 | 100GB-hours/月 |
| ビルド時間 | 6,000分/月 |
| チームメンバー | 1人（Hobbyプラン） |

個人プロジェクトには十分すぎる無料枠です。

## よくある問題と解決法

### ビルドエラー
- `npm run build` をローカルで実行し、エラーがないか確認
- TypeScriptの型エラーは`tsconfig.json`の`strict`設定を確認

### 環境変数
- Vercelダッシュボードの Settings → Environment Variables で設定
- `.env.local`ファイルはGitにプッシュしない

### API Routes
- `src/app/api/` ディレクトリにAPIエンドポイントを作成可能
- サーバーレス関数として自動デプロイされる

## 自動デプロイの設定

GitHubにプッシュするだけで自動的にデプロイされます。プルリクエストを作ると、プレビューデプロイも自動生成されます。

```bash
git add .
git commit -m "update: 新機能追加"
git push
# → 自動でVercelにデプロイされる
```

## まとめ

Next.js + Vercelの組み合わせは、個人開発者にとって最強のスタックです。無料で、高速で、スケーラブル。まずは小さなプロジェクトから始めて、徐々にスケールアップしていきましょう。

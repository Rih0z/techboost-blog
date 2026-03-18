---
title: "GitHub ActionsでVPSに自動デプロイする方法2026【SSH+CI/CD】"
description: "GitHub ActionsのCIパイプラインでVPSへのSSH自動デプロイを構築する全手順を解説。Secrets設定・SSH鍵管理・Node.js/Docker対応・Nginx再起動・Slackへのデプロイ通知まで実践ワークフローを2026年最新版で徹底解説します。"
pubDate: "2026-03-06"
tags: ["server", "インフラ", "github"]
heroImage: '../../assets/thumbnails/2026-06-08-github-actions-vps-deploy-2026.jpg'
---

## はじめに

> *本記事にはアフィリエイト広告（A8.net）が含まれます。*

コードをGitHubにpushするたびに手動でサーバーにSSH接続してデプロイ作業を行うのは非効率だ。**GitHub ActionsによるCI/CDパイプライン**を構築すれば、pushをトリガーに自動でテスト・ビルド・VPSへのデプロイが実行される。

本記事ではGitHub ActionsからVPSへのSSH自動デプロイを0から構築する全手順を解説する。Node.js/Python/静的サイトなど幅広いアプリに対応した実践的なワークフロー設定を紹介する。

> **免責事項**: ツールのバージョン・設定は記事執筆時点の情報です。最新情報は各公式ドキュメントをご確認ください。

<div style="padding:1.5em;background:#f0f7ff;border-radius:8px;border-left:4px solid #0066cc;margin:1.5em 0;">
<strong>CI/CDデプロイ先に最適なVPS</strong><br>
高速NVMe SSD搭載・国内DCで低レイテンシなXServerVPSはGitHub ActionsのデプロイターゲットVPSとして最適。<br>
<a href="https://px.a8.net/svt/ejp?a8mat=4AZ9C2+2ZRJL6+5GDG+NTJWY" rel="noopener sponsored" target="_blank" style="display:inline-block;margin-top:0.75em;background:#0066cc;color:white;padding:10px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">→ XServerVPS 公式サイトで詳細を見る</a>
</div>

---

## 前提環境

- VPS: Ubuntu 22.04 LTS（初期設定済み、SSH鍵認証設定済み）
- GitHub リポジトリ：パブリック or プライベート（どちらでも可）
- Node.js/Python/静的サイト等のアプリがVPS上で稼働中
- Nginx インストール済み（リバースプロキシとして使用）

---

## 目次

1. CI/CD自動デプロイの全体フロー
2. VPS側のデプロイ準備
3. SSH鍵の生成とGitHub Secretsの設定
4. 基本的なデプロイワークフロー
5. Node.jsアプリのデプロイワークフロー
6. Dockerアプリのデプロイワークフロー
7. 静的サイト（Astro/Next.js）のデプロイワークフロー
8. デプロイ通知（Slack）の設定
9. ロールバック機能の実装
10. セキュリティのベストプラクティス

---

## 1. CI/CD自動デプロイの全体フロー

```
開発者がgit pushする
        ↓
GitHub Actionsがトリガー
        ↓
Runner（ubuntu-latest）で実行
  ├── コードのチェックアウト
  ├── テストの実行
  ├── ビルド（必要に応じて）
  └── VPSへSSHデプロイ
        ├── ファイル転送（rsync/scp）
        ├── 依存パッケージインストール
        ├── アプリの再起動
        └── ヘルスチェック
        ↓
Slack/メールで完了通知
```

---

## 2. VPS側のデプロイ準備

### デプロイ専用ユーザーの作成

セキュリティのためにデプロイ専用ユーザーを作成する。

```bash
# デプロイ専用ユーザーを作成
sudo useradd -m -s /bin/bash deploy

# パスワードの設定（SSH鍵認証のみにする場合は任意）
sudo passwd deploy

# sudo権限の追加（必要なコマンドのみ許可）
sudo visudo
```

```
# /etc/sudoers に追加
deploy ALL=(ALL) NOPASSWD: /bin/systemctl restart myapp, /bin/systemctl reload nginx
```

### アプリケーションディレクトリの準備

```bash
# アプリのデプロイ先ディレクトリを作成
sudo mkdir -p /var/www/myapp
sudo chown deploy:deploy /var/www/myapp

# deployユーザーでディレクトリにアクセスできるか確認
sudo -u deploy ls -la /var/www/myapp
```

---

## 3. SSH鍵の生成とGitHub Secretsの設定

### SSH鍵ペアの生成

GitHub Actionsがサーバーに接続するための専用SSH鍵を生成する。

```bash
# ローカルPCで実行（サーバー上では実行しない）
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy -N ""

# 生成されたファイルを確認
ls -la ~/.ssh/github_actions_deploy*
# github_actions_deploy     ← 秘密鍵（GitHub Secretsに登録）
# github_actions_deploy.pub ← 公開鍵（VPSに登録）

# 公開鍵の内容を確認
cat ~/.ssh/github_actions_deploy.pub

# 秘密鍵の内容をコピー（GitHub Secretsに登録する）
cat ~/.ssh/github_actions_deploy
```

### VPS側に公開鍵を登録

```bash
# VPSにSSH接続
ssh user@your-server-ip

# deployユーザーに切り替え
sudo -u deploy bash

# .sshディレクトリを作成
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# 公開鍵を追加
echo "ssh-ed25519 AAAA... github-actions-deploy" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# SSH接続確認（ローカルから）
ssh -i ~/.ssh/github_actions_deploy deploy@your-server-ip
```

### GitHub Secretsへの登録

GitHubリポジトリの `Settings > Secrets and variables > Actions` で以下を登録する。

| Secret名 | 値 |
|---------|---|
| `SERVER_HOST` | VPSのIPアドレスまたはホスト名 |
| `SERVER_USER` | `deploy` |
| `SSH_PRIVATE_KEY` | 秘密鍵の全内容（`-----BEGIN...`から末尾まで） |
| `SERVER_PORT` | SSHポート番号（デフォルト22、変更している場合はその番号） |

---

## 4. 基本的なデプロイワークフロー

```bash
# リポジトリのルートに以下のディレクトリ構造を作成
mkdir -p .github/workflows
```

```yaml
# .github/workflows/deploy.yml
name: Deploy to VPS

on:
  push:
    branches:
      - main  # mainブランチへのpushでトリガー

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      # 1. コードをチェックアウト
      - name: Checkout code
        uses: actions/checkout@v4

      # 2. SSH接続のセットアップ
      - name: Setup SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          ssh-keyscan -p ${{ secrets.SERVER_PORT || 22 }} ${{ secrets.SERVER_HOST }} >> ~/.ssh/known_hosts

      # 3. rsyncでファイルをVPSに転送
      - name: Deploy files to server
        run: |
          rsync -avz --delete \
            --exclude='.git' \
            --exclude='node_modules' \
            --exclude='.env*' \
            -e "ssh -i ~/.ssh/id_ed25519 -p ${{ secrets.SERVER_PORT || 22 }}" \
            ./ ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }}:/var/www/myapp/

      # 4. VPS上でデプロイ後の処理
      - name: Run post-deploy commands
        run: |
          ssh -i ~/.ssh/id_ed25519 \
            -p ${{ secrets.SERVER_PORT || 22 }} \
            ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }} \
            'cd /var/www/myapp && sudo systemctl restart myapp && sudo systemctl reload nginx'
```

---

## 5. Node.jsアプリのデプロイワークフロー

```yaml
# .github/workflows/deploy-nodejs.yml
name: Deploy Node.js App to VPS

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Build
        run: npm run build

  deploy:
    runs-on: ubuntu-latest
    needs: test  # testジョブが成功した場合のみデプロイ
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install & Build
        run: |
          npm ci --omit=dev
          npm run build

      - name: Setup SSH
        uses: webfactory/ssh-agent@v0.9.0
        with:
          ssh-private-key: ${{ secrets.SSH_PRIVATE_KEY }}

      - name: Add server to known hosts
        run: |
          ssh-keyscan -H ${{ secrets.SERVER_HOST }} >> ~/.ssh/known_hosts

      - name: Deploy to VPS
        env:
          DEPLOY_PATH: /var/www/myapp
        run: |
          # ファイル転送
          rsync -avz --delete \
            --exclude='.git' \
            --exclude='node_modules' \
            --exclude='.env' \
            -e "ssh" \
            ./dist/ ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }}:$DEPLOY_PATH/dist/

          # package.jsonも転送
          scp package.json \
            ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }}:$DEPLOY_PATH/

      - name: Restart application
        run: |
          ssh ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }} << 'EOF'
            set -e
            cd /var/www/myapp

            # 本番依存パッケージのインストール
            npm ci --omit=dev

            # PM2でアプリを再起動
            if pm2 list | grep -q "myapp"; then
              pm2 restart myapp
            else
              pm2 start dist/index.js --name myapp
            fi

            # PM2の設定を保存
            pm2 save

            # ヘルスチェック
            sleep 3
            curl -f http://localhost:3000/health || exit 1
            echo "Deploy successful!"
          EOF
```

---

## 6. Dockerアプリのデプロイワークフロー

```yaml
# .github/workflows/deploy-docker.yml
name: Build and Deploy Docker App

on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}

    steps:
      - uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract Docker metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=sha-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    runs-on: ubuntu-latest
    needs: build-and-push
    environment: production

    steps:
      - name: Setup SSH
        uses: webfactory/ssh-agent@v0.9.0
        with:
          ssh-private-key: ${{ secrets.SSH_PRIVATE_KEY }}

      - name: Add server to known hosts
        run: ssh-keyscan -H ${{ secrets.SERVER_HOST }} >> ~/.ssh/known_hosts

      - name: Deploy to VPS via Docker
        run: |
          ssh ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }} << EOF
            set -e

            # GitHub Container Registryにログイン
            echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin

            # 新しいイメージをpull
            docker pull ghcr.io/${{ github.repository }}:latest

            # 現在のコンテナを停止・削除
            docker stop myapp 2>/dev/null || true
            docker rm myapp 2>/dev/null || true

            # 新しいコンテナを起動
            docker run -d \
              --name myapp \
              --restart unless-stopped \
              -p 3000:3000 \
              --env-file /var/www/myapp/.env \
              ghcr.io/${{ github.repository }}:latest

            # ヘルスチェック
            sleep 5
            docker ps | grep myapp
            echo "Docker deploy successful!"
          EOF
```

---

## 7. 静的サイト（Astro/Next.js）のデプロイワークフロー

```yaml
# .github/workflows/deploy-static.yml
name: Deploy Static Site to VPS

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build static site
        run: npm run build
        env:
          NODE_ENV: production

      - name: Setup SSH
        uses: webfactory/ssh-agent@v0.9.0
        with:
          ssh-private-key: ${{ secrets.SSH_PRIVATE_KEY }}

      - name: Add server to known hosts
        run: ssh-keyscan -H ${{ secrets.SERVER_HOST }} >> ~/.ssh/known_hosts

      - name: Deploy to VPS
        run: |
          # distまたはoutディレクトリをVPSのNginxドキュメントルートに転送
          rsync -avz --delete \
            -e "ssh" \
            ./dist/ ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }}:/var/www/mysite/

      - name: Reload Nginx
        run: |
          ssh ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }} \
            'sudo systemctl reload nginx'
```

---

## 8. デプロイ通知（Slack）の設定

```yaml
# workflowのjobs.deployの最後に追加
      - name: Notify Slack on success
        if: success()
        uses: slackapi/slack-github-action@v1.26.0
        with:
          payload: |
            {
              "text": "✅ デプロイ成功",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "✅ *デプロイ成功* - ${{ github.repository }}\n• ブランチ: `${{ github.ref_name }}`\n• コミット: `${{ github.sha }}`\n• 実行者: ${{ github.actor }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

      - name: Notify Slack on failure
        if: failure()
        uses: slackapi/slack-github-action@v1.26.0
        with:
          payload: |
            {
              "text": "❌ デプロイ失敗",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "❌ *デプロイ失敗* - ${{ github.repository }}\n• ブランチ: `${{ github.ref_name }}`\n• 実行者: ${{ github.actor }}\n• <${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|ログを確認>"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## 9. ロールバック機能の実装

```bash
# VPS上でシンボリックリンクを使ったゼロダウンタイムデプロイ
# /var/www/releases/YYYYMMDD-HHMMSS/ に各リリースを保存
# /var/www/current -> 現在のリリースへのシンボリックリンク
```

```yaml
# .github/workflows/deploy-with-rollback.yml（デプロイ部分）
      - name: Deploy with rollback support
        run: |
          RELEASE_DIR="/var/www/releases/$(date +%Y%m%d-%H%M%S)"
          CURRENT_LINK="/var/www/current"
          MAX_RELEASES=5

          ssh ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }} << EOF
            set -e

            # 新しいリリースディレクトリを作成
            mkdir -p $RELEASE_DIR

            # 古いリリースをクリーンアップ（最新5件だけ保持）
            ls -dt /var/www/releases/*/ | tail -n +$((MAX_RELEASES + 1)) | xargs rm -rf 2>/dev/null || true
          EOF

          # ファイルを転送
          rsync -avz --delete \
            -e "ssh" \
            ./dist/ ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }}:$RELEASE_DIR/

          # シンボリックリンクを更新してデプロイを完了
          ssh ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }} << EOF
            set -e
            ln -sfn $RELEASE_DIR $CURRENT_LINK
            sudo systemctl reload nginx
            echo "Deployed to $RELEASE_DIR"
          EOF
```

```bash
# ロールバック用スクリプト（VPS上に配置）
# /var/www/rollback.sh

#!/bin/bash
RELEASES_DIR="/var/www/releases"
CURRENT_LINK="/var/www/current"

# 現在のリリースと1つ前のリリースを取得
CURRENT=$(readlink -f $CURRENT_LINK)
PREVIOUS=$(ls -dt $RELEASES_DIR/*/ | sed -n '2p')

if [ -z "$PREVIOUS" ]; then
    echo "No previous release found"
    exit 1
fi

echo "Rolling back from $CURRENT to $PREVIOUS"
ln -sfn $PREVIOUS $CURRENT_LINK
sudo systemctl reload nginx
echo "Rollback complete!"
```

---

## 10. セキュリティのベストプラクティス

### SSH設定の強化

```bash
# VPS側のSSH設定
sudo nano /etc/ssh/sshd_config
```

```
# GitHub ActionsからのSSH接続用の設定
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys

# デプロイユーザーのIPホワイトリスト（GitHub ActionsのIPを調べて設定）
# Match User deploy
#     AllowUsers deploy@<github-actions-ip>
```

### Secretsのローテーション

```bash
# SSH鍵のローテーション（定期的に実施）
# 1. 新しい鍵ペアを生成
ssh-keygen -t ed25519 -C "github-actions-deploy-new" -f ~/.ssh/github_actions_deploy_new -N ""

# 2. VPSの authorized_keys に新しい公開鍵を追加
# 3. GitHub SecretsのSSH_PRIVATE_KEYを新しい秘密鍵に更新
# 4. 動作確認後、古い公開鍵をauthorized_keysから削除
```

<div style="padding:1.5em;background:#f0f7ff;border-radius:8px;border-left:4px solid #0066cc;margin:1.5em 0;">
<strong>GitHub Actions自動デプロイの練習環境</strong><br>
ConoHa WINGなら初期費用無料で試せる。GitHub ActionsのCIパイプライン練習に最適。<br>
<a href="https://px.a8.net/svt/ejp?a8mat=4AZBO0+C968T6+50+5SJPS2" rel="noopener sponsored" target="_blank" style="display:inline-block;margin-top:0.75em;background:#0066cc;color:white;padding:10px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">→ ConoHa WING 公式サイトで詳細を見る</a>
</div>

---

## まとめ

本記事ではGitHub ActionsによるVPS自動デプロイの構築方法を解説した。

- **SSH鍵の生成**とGitHub Secretsへの安全な登録
- **Node.js・Docker・静的サイト**に対応したワークフロー設定
- **Slack通知**でデプロイの成否をリアルタイムで把握
- **ロールバック機能**でデプロイ失敗時に即時復旧
- **セキュリティのベストプラクティス**でSSH鍵を安全に管理

CI/CDパイプラインが整うと、コードの品質が上がりデプロイの心理的ハードルが大幅に下がる。ぜひ自分のプロジェクトに取り入れてほしい。

---

## 関連記事

- [NginxでWebサーバー構築完全ガイド2026](/blog/2026-06-06-nginx-web-server-setup-guide-2026/) — デプロイ先サーバーの構築方法
- [VPS初期設定完全ガイド2026](/blog/2026-06-02-vps-initial-setup-guide-2026/) — CI/CDデプロイ前のサーバー設定
- [Dockerをサーバーで本番運用する完全ガイド2026](/blog/2026-06-03-docker-production-server-guide-2026/) — DockerとGitHub Actionsを組み合わせたCI/CD
- [さくらのVPS vs XServerVPS 徹底比較2026](/blog/2026-06-04-sakura-vps-vs-xservervps-2026/) — CI/CDのデプロイ先VPS選びの参考に

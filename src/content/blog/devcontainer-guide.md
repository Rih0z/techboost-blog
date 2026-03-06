---
title: "Dev Container入門 - チームで統一された開発環境を構築する"
description: "Dev ContainerはDockerコンテナ上に再現可能な開発環境を構築する仕組みです。VS Code・GitHub Codespacesと連携し、devcontainer.jsonの書き方、Features、Docker Compose連携からチーム運用のベストプラクティスまで実践的に解説します。"
pubDate: "2026-03-05"
tags: ['Docker', '開発ツール', 'DevOps', 'チーム開発']
---

**Dev Container**（Development Container）は、Dockerコンテナ内に完全な開発環境を構築する仕組みです。VS CodeやJetBrains IDE、GitHub Codespacesと連携し、「自分の環境では動く」問題を根本的に解決します。

本記事では、Dev Containerの基本概念からdevcontainer.jsonの書き方、チームでの運用方法まで解説します。

## Dev Containerとは？

Dev Containerは、**開発環境をコードとして管理**するための仕様（Dev Container Specification）です。プロジェクトに`.devcontainer/devcontainer.json`を置くことで、誰でも同じ環境で開発を始められます。

### 主な特徴

- **再現可能**: 全員が同じツール、同じバージョンで開発
- **分離された環境**: ホストOSを汚さない
- **即座にセットアップ**: cloneしたらすぐ開発開始
- **GitHub Codespaces対応**: ブラウザから即座に開発可能
- **Feature**: 再利用可能な機能モジュールで拡張

### 従来の方法との比較

| 方法 | セットアップ時間 | 環境の一貫性 | ホストへの影響 |
|------|----------------|------------|-------------|
| ローカルインストール | 数時間 | 低い | 大きい |
| Docker Compose | 中程度 | 高い | 小さい |
| Vagrant | 長い | 高い | 小さい |
| **Dev Container** | **短い** | **最も高い** | **なし** |
| GitHub Codespaces | **即座** | **最も高い** | **なし** |

## セットアップ

### 前提条件

- Docker Desktop または Podman
- VS Code + Dev Containers拡張機能

```bash
# VS Code拡張機能のインストール
code --install-extension ms-vscode-remote.remote-containers
```

### 最小構成

プロジェクトルートに`.devcontainer/devcontainer.json`を作成します。

```json
// .devcontainer/devcontainer.json
{
  "name": "My Project",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:22",
  "postCreateCommand": "npm install"
}
```

VS Codeで`Cmd+Shift+P` → 「Dev Containers: Reopen in Container」でコンテナ内の開発環境が起動します。

## devcontainer.jsonの書き方

### 基本構造

```json
{
  // 表示名
  "name": "Node.js & TypeScript",

  // ベースイメージ（image または build を指定）
  "image": "mcr.microsoft.com/devcontainers/typescript-node:22",

  // Features（追加ツール）
  "features": {
    "ghcr.io/devcontainers/features/git:1": {},
    "ghcr.io/devcontainers/features/github-cli:1": {},
    "ghcr.io/devcontainers/features/docker-in-docker:2": {}
  },

  // ポートフォワーディング
  "forwardPorts": [3000, 5432],

  // VS Code設定
  "customizations": {
    "vscode": {
      "settings": {
        "editor.defaultFormatter": "esbenp.prettier-vscode",
        "editor.formatOnSave": true
      },
      "extensions": [
        "esbenp.prettier-vscode",
        "dbaeumer.vscode-eslint",
        "bradlc.vscode-tailwindcss"
      ]
    }
  },

  // ライフサイクルコマンド
  "postCreateCommand": "npm install",
  "postStartCommand": "npm run dev",
  "postAttachCommand": "echo 'Welcome to the dev container!'"
}
```

### カスタムDockerfileを使う

より細かいカスタマイズが必要な場合は、Dockerfileを使います。

```json
// .devcontainer/devcontainer.json
{
  "name": "Custom Environment",
  "build": {
    "dockerfile": "Dockerfile",
    "context": "..",
    "args": {
      "NODE_VERSION": "22"
    }
  }
}
```

```dockerfile
# .devcontainer/Dockerfile
ARG NODE_VERSION=22
FROM mcr.microsoft.com/devcontainers/typescript-node:${NODE_VERSION}

# 追加ツールのインストール
RUN apt-get update && apt-get install -y \
    postgresql-client \
    redis-tools \
    && rm -rf /var/lib/apt/lists/*

# グローバルnpmパッケージ
RUN npm install -g tsx prisma turbo
```

### Docker Composeとの連携

データベースなど複数のサービスが必要な場合:

```json
// .devcontainer/devcontainer.json
{
  "name": "Full Stack",
  "dockerComposeFile": "docker-compose.yml",
  "service": "app",
  "workspaceFolder": "/workspace",
  "forwardPorts": [3000, 5432, 6379],
  "postCreateCommand": "npm install && npx prisma migrate dev"
}
```

```yaml
# .devcontainer/docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: ..
      dockerfile: .devcontainer/Dockerfile
    volumes:
      - ..:/workspace:cached
    command: sleep infinity
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/myapp
      - REDIS_URL=redis://redis:6379
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=myapp
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine

volumes:
  pgdata:
```

## Features

Dev Container Featuresは、再利用可能な機能モジュールです。Dockerfileを書かなくても、必要なツールを宣言的に追加できます。

### よく使うFeatures

```json
{
  "features": {
    // Git
    "ghcr.io/devcontainers/features/git:1": {
      "version": "latest"
    },
    // GitHub CLI
    "ghcr.io/devcontainers/features/github-cli:1": {},
    // Docker in Docker
    "ghcr.io/devcontainers/features/docker-in-docker:2": {},
    // AWS CLI
    "ghcr.io/devcontainers/features/aws-cli:1": {},
    // Terraform
    "ghcr.io/devcontainers/features/terraform:1": {},
    // Python
    "ghcr.io/devcontainers/features/python:1": {
      "version": "3.12"
    },
    // Rust
    "ghcr.io/devcontainers/features/rust:1": {
      "version": "latest"
    },
    // Go
    "ghcr.io/devcontainers/features/go:1": {
      "version": "1.22"
    }
  }
}
```

### カスタムFeatureの作成

チーム固有のツールセットをFeatureとしてパッケージ化できます。

```json
// src/my-feature/devcontainer-feature.json
{
  "id": "my-team-tools",
  "version": "1.0.0",
  "name": "My Team Tools",
  "options": {
    "version": {
      "type": "string",
      "default": "latest"
    }
  }
}
```

```bash
#!/bin/bash
# src/my-feature/install.sh
set -e

# チーム固有のツールをインストール
npm install -g @team/cli-tool@${VERSION:-latest}

# 設定ファイルのコピー
cp /tmp/team-config.json /home/vscode/.team-config.json
```

## 実践例: フルスタックプロジェクト

### Next.js + Prisma + PostgreSQL

```json
// .devcontainer/devcontainer.json
{
  "name": "Next.js Full Stack",
  "dockerComposeFile": "docker-compose.yml",
  "service": "app",
  "workspaceFolder": "/workspace",
  "features": {
    "ghcr.io/devcontainers/features/github-cli:1": {}
  },
  "forwardPorts": [3000, 5555],
  "customizations": {
    "vscode": {
      "settings": {
        "editor.defaultFormatter": "esbenp.prettier-vscode",
        "editor.formatOnSave": true,
        "editor.codeActionsOnSave": {
          "source.fixAll.eslint": "explicit"
        },
        "typescript.preferences.importModuleSpecifier": "non-relative"
      },
      "extensions": [
        "esbenp.prettier-vscode",
        "dbaeumer.vscode-eslint",
        "bradlc.vscode-tailwindcss",
        "prisma.prisma",
        "ms-azuretools.vscode-docker"
      ]
    }
  },
  "postCreateCommand": "npm install && npx prisma generate && npx prisma migrate dev",
  "postStartCommand": "npx prisma studio &"
}
```

### Rust + WebAssembly

```json
{
  "name": "Rust + WASM",
  "image": "mcr.microsoft.com/devcontainers/rust:1",
  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "version": "22"
    }
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "rust-lang.rust-analyzer",
        "tamasfe.even-better-toml",
        "vadimcn.vscode-lldb"
      ]
    }
  },
  "postCreateCommand": "rustup target add wasm32-unknown-unknown && cargo install wasm-pack trunk"
}
```

### Python + FastAPI + ML

```json
{
  "name": "Python ML",
  "image": "mcr.microsoft.com/devcontainers/python:3.12",
  "features": {
    "ghcr.io/devcontainers/features/node:1": {}
  },
  "customizations": {
    "vscode": {
      "settings": {
        "python.defaultInterpreterPath": "/usr/local/bin/python",
        "python.formatting.provider": "black"
      },
      "extensions": [
        "ms-python.python",
        "ms-python.vscode-pylance",
        "ms-toolsai.jupyter"
      ]
    }
  },
  "postCreateCommand": "pip install -r requirements.txt && pip install -e '.[dev]'"
}
```

## GitHub Codespacesとの連携

Dev Containerの設定は、GitHub Codespacesでそのまま使えます。

### Codespaces用の最適化

```json
{
  "name": "Optimized for Codespaces",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:22",

  // Codespacesのマシンタイプ指定
  "hostRequirements": {
    "cpus": 4,
    "memory": "8gb",
    "storage": "32gb"
  },

  // プリビルドの最適化
  "updateContentCommand": "npm install",
  "postCreateCommand": "npm run build",

  // GitHub Codespaces固有の設定
  "customizations": {
    "codespaces": {
      "openFiles": ["README.md", "src/index.ts"]
    }
  }
}
```

### Prebuild設定

```yaml
# .github/workflows/codespaces-prebuild.yml
name: Codespaces Prebuild
on:
  push:
    branches: [main]
    paths:
      - '.devcontainer/**'
      - 'package-lock.json'

jobs:
  prebuild:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: devcontainers/ci@v0.3
        with:
          push: always
          imageName: ghcr.io/${{ github.repository }}/devcontainer
```

## チーム運用のベストプラクティス

### 1. 設定をリポジトリにコミットする

```bash
# .devcontainerディレクトリをGitに含める
git add .devcontainer/
git commit -m "Add dev container configuration"
```

### 2. 環境変数の管理

```json
// .devcontainer/devcontainer.json
{
  // 開発用のデフォルト値
  "containerEnv": {
    "NODE_ENV": "development",
    "LOG_LEVEL": "debug"
  },
  // シークレットはファイルで管理（.gitignoreに追加）
  "runArgs": ["--env-file", ".devcontainer/.env.local"]
}
```

```bash
# .devcontainer/.env.local（.gitignoreに追加）
API_KEY=your-api-key
DATABASE_URL=postgresql://...
```

### 3. パフォーマンスの最適化

```json
{
  // ボリュームマウントのキャッシュ
  "mounts": [
    "source=node-modules-cache,target=${containerWorkspaceFolder}/node_modules,type=volume",
    "source=pnpm-store,target=/home/vscode/.local/share/pnpm/store,type=volume"
  ],

  // .gitやnode_modulesの除外
  "workspaceMount": "source=${localWorkspaceFolder},target=/workspace,type=bind,consistency=cached"
}
```

### 4. マルチプラットフォーム対応

```json
{
  "build": {
    "dockerfile": "Dockerfile",
    "args": {
      "TARGETPLATFORM": "${localArch}"
    }
  }
}
```

## ライフサイクルコマンド

Dev Containerのライフサイクルに合わせて、適切なタイミングでコマンドを実行できます。

```
initializeCommand      → コンテナ作成前（ホスト側で実行）
onCreateCommand        → コンテナ初回作成時のみ
updateContentCommand   → コンテナ作成時 + コンテンツ更新時
postCreateCommand      → コンテナ作成後（初回 + リビルド時）
postStartCommand       → コンテナ起動時（毎回）
postAttachCommand      → VS Code接続時（毎回）
```

```json
{
  "initializeCommand": "echo 'ホスト側の準備...'",
  "onCreateCommand": "git config --global core.editor 'code --wait'",
  "updateContentCommand": "npm ci",
  "postCreateCommand": {
    "db-setup": "npx prisma migrate dev",
    "seed": "npx prisma db seed"
  },
  "postStartCommand": "npm run dev &",
  "postAttachCommand": "echo '開発環境の準備が完了しました'"
}
```

## トラブルシューティング

### コンテナが起動しない

```bash
# Dev Containerのログ確認
# VS Code: Cmd+Shift+P → "Dev Containers: Show Container Log"

# Docker側のログ
docker logs <container-id>
```

### ビルドが遅い

```json
{
  // レイヤーキャッシュの活用
  "build": {
    "cacheFrom": "ghcr.io/your-org/devcontainer:latest"
  }
}
```

### 拡張機能が動作しない

```json
{
  "customizations": {
    "vscode": {
      // コンテナ内にインストールする拡張機能
      "extensions": ["ms-python.python"],
      "settings": {
        // コンテナ内のパスを指定
        "python.defaultInterpreterPath": "/usr/local/bin/python"
      }
    }
  }
}
```

### ファイル権限の問題

```json
{
  // コンテナ内ユーザーの指定
  "remoteUser": "vscode",
  "containerUser": "vscode",

  // UID/GIDのマッピング
  "updateRemoteUserUID": true
}
```

## まとめ

Dev Containerは**開発環境の標準化**に最適な仕組みです。

### 導入すべきケース

- **チーム開発**: 新メンバーの環境構築を数分に短縮
- **OSS開発**: コントリビューターがすぐに開発を始められる
- **マルチプロジェクト**: プロジェクトごとに異なる環境を分離
- **CI/CD統合**: ローカルとCIで同じ環境を使用

### 学習リソース

- [Dev Container Specification](https://containers.dev/)
- [VS Code Dev Containers](https://code.visualstudio.com/docs/devcontainers/containers)
- [利用可能なFeatures一覧](https://containers.dev/features)
- [テンプレート一覧](https://containers.dev/templates)

まずは既存プロジェクトに`.devcontainer/devcontainer.json`を1つ追加することから始めてみてください。チーム全体の開発体験が大きく向上します。

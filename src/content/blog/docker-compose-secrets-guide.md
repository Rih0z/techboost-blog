---
title: "Docker Compose Secrets管理ガイド - 安全な機密情報の取り扱い"
description: "Docker Secretsの基本からdocker-compose.ymlでのシークレット定義、環境変数との使い分け、本番環境でのベストプラクティスまで詳しく解説します。"
pubDate: "2025-02-05"
tags: ['Docker', 'インフラ', '開発ツール']
heroImage: '../../assets/thumbnails/docker-compose-secrets-guide.jpg'
---
環境変数にDBパスワードを書いて`docker-compose.yml`をGitにpushしてしまった経験、ありませんか？ 私たちはあります。開発用のパスワードだったので実害はありませんでしたが、チーム全員にSlackで謝罪しました。

Docker Secretsは、まさにこの問題を根本的に解決する仕組みです。環境変数と違ってコンテナのメモリ内にだけ存在し、`docker inspect`でも見えません。一度使い始めると「なぜ最初からこうしなかったのか」と後悔するレベルの改善です。

この記事では、Docker Composeでの実装方法を**実際にやりがちなミスとその回避策**も含めて解説します。

## Docker Secretsとは

Docker Secretsは、コンテナに機密情報を安全に渡すための機能です。環境変数と異なり、メモリ内でのみ保持され、ファイルシステムには書き込まれません（tmpfs）。

### Secretsの特徴

- **暗号化**: Docker Swarmでは転送時・保存時に暗号化
- **アクセス制御**: 必要なサービスのみにアクセスを限定
- **tmpfs**: メモリ内のみに存在（`/run/secrets/`）
- **Git安全**: Secretファイルを`.gitignore`で除外可能

## 基本的な使い方

### ファイルベースのSecret

最もシンプルな方法はファイルからSecretを読み込む方法です。

```yaml
# docker-compose.yml
services:
  app:
    image: myapp:latest
    secrets:
      - db_password
      - api_key

secrets:
  db_password:
    file: ./secrets/db_password.txt
  api_key:
    file: ./secrets/api_key.txt
```

```bash
# Secretファイルの作成
mkdir -p secrets
echo "my_secure_password" > secrets/db_password.txt
echo "sk_live_abc123xyz" > secrets/api_key.txt

# .gitignoreに追加
echo "secrets/" >> .gitignore
```

### コンテナ内でのSecret利用

Secretは`/run/secrets/`ディレクトリにマウントされます。

```javascript
// Node.js例
const fs = require('fs');

// Secretの読み込み
const dbPassword = fs.readFileSync('/run/secrets/db_password', 'utf8').trim();
const apiKey = fs.readFileSync('/run/secrets/api_key', 'utf8').trim();

// データベース接続
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: dbPassword,  // Secretから読み込み
};
```

```python
# Python例
def read_secret(secret_name):
    try:
        with open(f'/run/secrets/{secret_name}', 'r') as f:
            return f.read().strip()
    except FileNotFoundError:
        # ローカル開発用フォールバック
        return os.environ.get(secret_name.upper())

db_password = read_secret('db_password')
api_key = read_secret('api_key')
```

## 環境別の設定

### 開発環境と本番環境の切り替え

```yaml
# docker-compose.yml（開発用）
services:
  app:
    image: myapp:latest
    environment:
      - DB_HOST=postgres
      - DB_USER=devuser
    secrets:
      - db_password
    env_file:
      - .env.development

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

```yaml
# docker-compose.prod.yml（本番用）
services:
  app:
    secrets:
      - db_password
      - api_key
      - ssl_cert
      - ssl_key
    environment:
      - DB_HOST=prod-db.example.com

secrets:
  db_password:
    external: true  # Docker Swarmで管理
  api_key:
    external: true
  ssl_cert:
    file: /var/secrets/ssl/cert.pem
  ssl_key:
    file: /var/secrets/ssl/key.pem
```

```bash
# 本番環境デプロイ
docker stack deploy -c docker-compose.yml -c docker-compose.prod.yml myapp
```

## 実践的な設定例

### Webアプリケーション + データベース

```yaml
services:
  web:
    build: ./web
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=db
      - DB_USER=appuser
      - DB_NAME=appdb
    secrets:
      - db_password
      - jwt_secret
      - api_key
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=appuser
      - POSTGRES_DB=appdb
    secrets:
      - db_password
    # Secretを環境変数として設定
    command: >
      sh -c '
        export POSTGRES_PASSWORD=$$(cat /run/secrets/db_password)
        docker-entrypoint.sh postgres
      '

volumes:
  postgres_data:

secrets:
  db_password:
    file: ./secrets/db_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  api_key:
    file: ./secrets/api_key.txt
```

### マイクロサービス構成

```yaml
services:
  auth-service:
    image: mycompany/auth:latest
    secrets:
      - db_password
      - jwt_private_key
      - oauth_client_secret

  api-service:
    image: mycompany/api:latest
    secrets:
      - db_password
      - jwt_public_key  # 公開鍵のみ
      - external_api_key

  worker:
    image: mycompany/worker:latest
    secrets:
      - db_password
      - redis_password
      - s3_access_key
      - s3_secret_key

secrets:
  db_password:
    file: ./secrets/db_password.txt
  jwt_private_key:
    file: ./secrets/jwt_private_key.pem
  jwt_public_key:
    file: ./secrets/jwt_public_key.pem
  oauth_client_secret:
    file: ./secrets/oauth_client_secret.txt
  external_api_key:
    file: ./secrets/external_api_key.txt
  redis_password:
    file: ./secrets/redis_password.txt
  s3_access_key:
    file: ./secrets/s3_access_key.txt
  s3_secret_key:
    file: ./secrets/s3_secret_key.txt
```

## 環境変数 vs Secrets

### 使い分けガイドライン

| 項目 | 環境変数 | Secrets |
|------|----------|---------|
| **用途** | 非機密な設定値 | パスワード、APIキー、証明書 |
| **例** | `NODE_ENV`, `PORT`, `LOG_LEVEL` | `DB_PASSWORD`, `JWT_SECRET` |
| **セキュリティ** | プロセス情報で見える | tmpfsでメモリ内のみ |
| **Git管理** | `.env.example`で管理可 | `.gitignore`で除外必須 |
| **変更頻度** | 高い | 低い |

### 組み合わせパターン

```yaml
services:
  app:
    # 非機密情報は環境変数
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DB_HOST=postgres
      - DB_USER=appuser
      - DB_NAME=appdb
      - REDIS_HOST=redis
      - LOG_LEVEL=info
      - API_TIMEOUT=30000

    # 機密情報はSecrets
    secrets:
      - db_password
      - redis_password
      - jwt_secret
      - stripe_api_key
      - aws_access_key
      - aws_secret_key
```

## セキュリティベストプラクティス

### 1. Secretファイルの権限設定

```bash
# Secretファイルは読み取り専用に
chmod 400 secrets/*.txt

# 所有者のみ読み取り可能
ls -l secrets/
# -r-------- 1 user user 24 Feb  5 10:00 db_password.txt
```

### 2. .gitignoreの徹底

```gitignore
# .gitignore
secrets/
*.pem
*.key
.env.local
.env.production
```

```bash
# テンプレートファイルは管理
secrets/
├── .gitkeep
├── README.md  # 作成手順を記載
└── db_password.txt.example  # テンプレート
```

### 3. Secret初期化スクリプト

```bash
#!/bin/bash
# scripts/init-secrets.sh

set -e

SECRETS_DIR="./secrets"
mkdir -p "$SECRETS_DIR"

# Secretファイルが存在しない場合のみ生成
generate_secret() {
  local name=$1
  local file="$SECRETS_DIR/$name.txt"

  if [ ! -f "$file" ]; then
    echo "Generating $name..."
    openssl rand -base64 32 > "$file"
    chmod 400 "$file"
    echo "✓ $name created"
  else
    echo "⊘ $name already exists"
  fi
}

generate_secret "db_password"
generate_secret "jwt_secret"
generate_secret "api_key"

echo "All secrets initialized!"
```

### 4. Docker Swarmでの外部Secret

```bash
# Swarm初期化
docker swarm init

# Secretを作成
echo "my_secure_password" | docker secret create db_password -
cat ./ssl/cert.pem | docker secret create ssl_cert -

# Secretの確認
docker secret ls

# Secretの詳細（内容は見えない）
docker secret inspect db_password
```

```yaml
# docker-compose.prod.yml
services:
  app:
    secrets:
      - db_password
      - ssl_cert

secrets:
  db_password:
    external: true  # 既存のSwarm secretを使用
  ssl_cert:
    external: true
```

## 実装パターン

### ヘルパー関数の実装

```typescript
// utils/secrets.ts
import { readFileSync } from 'fs';
import { join } from 'path';

const SECRETS_PATH = '/run/secrets';

export function getSecret(name: string): string {
  try {
    const secretPath = join(SECRETS_PATH, name);
    return readFileSync(secretPath, 'utf8').trim();
  } catch (error) {
    // ローカル開発環境では環境変数から読み込み
    const envValue = process.env[name.toUpperCase()];
    if (!envValue) {
      throw new Error(`Secret "${name}" not found`);
    }
    return envValue;
  }
}

// 使用例
export const config = {
  database: {
    host: process.env.DB_HOST!,
    user: process.env.DB_USER!,
    password: getSecret('db_password'),
    database: process.env.DB_NAME!,
  },
  jwt: {
    secret: getSecret('jwt_secret'),
    expiresIn: '7d',
  },
  stripe: {
    apiKey: getSecret('stripe_api_key'),
  },
};
```

### 初期化チェック

```javascript
// startup.js
const fs = require('fs');

const requiredSecrets = [
  'db_password',
  'jwt_secret',
  'api_key',
];

function checkSecrets() {
  const missing = [];

  for (const secret of requiredSecrets) {
    const path = `/run/secrets/${secret}`;
    if (!fs.existsSync(path)) {
      missing.push(secret);
    }
  }

  if (missing.length > 0) {
    console.error('Missing required secrets:', missing);
    process.exit(1);
  }

  console.log('✓ All required secrets are present');
}

checkSecrets();
```

## トラブルシューティング

### Secretが読めない場合

```bash
# コンテナ内でSecretを確認
docker compose exec app ls -la /run/secrets/

# Secretの内容確認（開発時のみ）
docker compose exec app cat /run/secrets/db_password
```

### パーミッション問題

```yaml
services:
  app:
    user: "1000:1000"  # ユーザーIDを指定
    secrets:
      - source: db_password
        target: db_password
        uid: '1000'      # Secret所有者
        gid: '1000'      # Secretグループ
        mode: 0400       # パーミッション
```

### ローカル開発での代替

```yaml
# docker-compose.override.yml（ローカル開発用）
services:
  app:
    environment:
      # ローカル開発では環境変数を使用
      - DB_PASSWORD=dev_password
      - JWT_SECRET=dev_secret
      - API_KEY=dev_key
```

## よくある失敗パターンと対策

### 1. Secretsファイルをgitignoreする前にコミット

最も多い失敗。`secrets/`ディレクトリを作ってからgitignoreを追加するまでの間にコミットしてしまうケース。

```bash
# ❌ 先にファイルを作ってしまう
echo "my-password" > secrets/db_password.txt
git add .
git commit -m "add docker config"  # secretsもコミットされる

# ✅ 先に.gitignoreを設定
echo "secrets/" >> .gitignore
git add .gitignore && git commit -m "ignore secrets dir"
mkdir secrets && echo "my-password" > secrets/db_password.txt
```

もし既にコミットしてしまった場合は、即座にパスワードを変更した上で`git filter-branch`で履歴から削除してください。

### 2. docker inspectでSecretの値が見える？

`docker inspect`では**Secretの値は表示されません**が、マウントパスは見えます。コンテナ内で`/run/secrets/`を直接catすれば値は読めるので、コンテナへのexec権限の管理も重要です。

### 3. Docker ComposeでSecretsが使えない？

Docker Compose v2（`docker compose`コマンド）では、Swarm Modeなしでも`secrets`が使えます。ただし暗号化はされず、バインドマウントとして扱われます。本番環境ではSwarm ModeまたはKubernetes Secretsを使いましょう。

### いつSecretsを使い、いつ環境変数でいいのか

| 情報の種類 | 推奨 | 理由 |
|-----------|------|------|
| DBパスワード | **Secrets** | 漏洩すると致命的 |
| APIキー | **Secrets** | 第三者に悪用される |
| `NODE_ENV` | 環境変数 | 機密情報ではない |
| `PORT` | 環境変数 | 設定値で秘密ではない |
| `DATABASE_URL` | **Secrets** | ホスト・パスワードを含む |
| `LOG_LEVEL` | 環境変数 | 運用設定で秘密ではない |

**判断基準**: その値がGitHubのpublicリポジトリに載ったら困るか？ 困るならSecrets、困らないなら環境変数。

## まとめ

Docker Secretsは「面倒だから後で」と先延ばしにしがちですが、一度セットアップすれば環境変数より安全で管理しやすくなります。

- **まず`.gitignore`を設定**してからSecretファイルを作る
- **機密情報は全てSecrets**に、設定値は環境変数に
- **ローカル開発では`docker-compose.override.yml`**で環境変数にフォールバック
- **本番ではSwarm Secret**または外部シークレットマネージャーを使う
- **コンテナへのexec権限**も合わせて管理する

「環境変数で十分」と思っている方は、一度`docker inspect`で自分のコンテナを見てみてください。全ての環境変数が平文で表示されます。それが本番環境でも起きています。
---

## 関連記事

- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
- [フリーランスエンジニアの収入完全ガイド2026【平均年収・単価・案件獲得】](/blog/2026-03-11-freelance-engineer-income-guide)
- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)

---
title: 'OpenAPI × API First開発ガイド2026｜スキーマ駆動・コード生成・モック・テスト'
description: 'OpenAPI仕様によるAPI First開発を解説。スキーマ定義、TypeScript/Pythonコード自動生成、Prismでのモックサーバー、Spectralによるリンティング、CI/CD連携まで。'
pubDate: '2026-03-05'
tags: ['OpenAPI', 'API', 'TypeScript', 'バックエンド', '設計']
heroImage: '../../assets/thumbnails/openapi-api-first-development-guide-2026.jpg'
---

## API First開発とは

API First開発は、**実装の前にAPI仕様を定義する**アプローチです。OpenAPI（旧Swagger）仕様書をSingle Source of Truthとし、そこからサーバー/クライアントのコード、ドキュメント、テストを自動生成します。

### 従来の開発 vs API First

```
従来（Code First）:
  サーバー実装 → API仕様を後付けで作成 → フロントエンドが待ち

API First:
  API仕様を定義 → サーバー/クライアント並行開発 → モックで即テスト
```

### メリット

| メリット | 説明 |
|---------|------|
| **並行開発** | フロント/バックが同時に開発できる |
| **型安全** | スキーマからコード生成で型の不一致なし |
| **ドキュメント** | 仕様書がそのままドキュメント |
| **モック** | 実装前にAPIをテスト可能 |
| **契約テスト** | 仕様と実装の乖離を自動検出 |

---

## OpenAPI仕様の書き方

### 基本構造

```yaml
# openapi.yaml
openapi: 3.1.0
info:
  title: My API
  version: 1.0.0
  description: ユーザー管理API

servers:
  - url: http://localhost:8080/api/v1
    description: ローカル開発
  - url: https://api.example.com/v1
    description: 本番環境

paths:
  /users:
    get:
      summary: ユーザー一覧取得
      operationId: listUsers
      tags: [Users]
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
            minimum: 1
        - name: per_page
          in: query
          schema:
            type: integer
            default: 20
            minimum: 1
            maximum: 100
        - name: search
          in: query
          schema:
            type: string
            maxLength: 100
      responses:
        '200':
          description: ユーザー一覧
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedUsers'

    post:
      summary: ユーザー作成
      operationId: createUser
      tags: [Users]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          description: 作成成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '409':
          description: メールアドレスが重複
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /users/{id}:
    get:
      summary: ユーザー詳細取得
      operationId: getUser
      tags: [Users]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: ユーザー詳細
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          $ref: '#/components/responses/NotFound'

components:
  schemas:
    User:
      type: object
      required: [id, name, email, createdAt]
      properties:
        id:
          type: integer
          example: 1
        name:
          type: string
          example: 田中太郎
        email:
          type: string
          format: email
          example: tanaka@example.com
        age:
          type: integer
          nullable: true
          minimum: 0
          maximum: 150
        createdAt:
          type: string
          format: date-time

    CreateUserRequest:
      type: object
      required: [name, email, password]
      properties:
        name:
          type: string
          minLength: 2
          maxLength: 50
        email:
          type: string
          format: email
        password:
          type: string
          minLength: 8
          maxLength: 100
        age:
          type: integer
          minimum: 0
          maximum: 150

    PaginatedUsers:
      type: object
      required: [items, total, page, perPage]
      properties:
        items:
          type: array
          items:
            $ref: '#/components/schemas/User'
        total:
          type: integer
        page:
          type: integer
        perPage:
          type: integer

    Error:
      type: object
      required: [message]
      properties:
        message:
          type: string
        errors:
          type: object
          additionalProperties:
            type: string

  responses:
    NotFound:
      description: リソースが見つかりません
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

security:
  - bearerAuth: []
```

---

## コード自動生成

### TypeScriptクライアント生成（openapi-typescript）

```bash
npx openapi-typescript openapi.yaml -o src/api/types.ts
```

```typescript
// 生成された型を使用
import type { paths, components } from './api/types';
import createClient from 'openapi-fetch';

const client = createClient<paths>({
  baseUrl: 'http://localhost:8080/api/v1',
});

// 完全に型安全なAPI呼び出し
const { data, error } = await client.GET('/users', {
  params: {
    query: { page: 1, per_page: 20 },
  },
});

// data は PaginatedUsers 型
if (data) {
  data.items.forEach(user => {
    console.log(user.name); // 型安全
  });
}

// POST
const { data: newUser } = await client.POST('/users', {
  body: {
    name: '田中太郎',
    email: 'tanaka@example.com',
    password: 'password123',
  },
});
```

### Zodスキーマ生成

```bash
npx openapi-zod-client openapi.yaml -o src/api/zodSchemas.ts
```

```typescript
// 生成されたZodスキーマでバリデーション
import { CreateUserRequestSchema } from './api/zodSchemas';

const result = CreateUserRequestSchema.safeParse(formData);
if (!result.success) {
  console.log(result.error.issues);
}
```

### Pythonクライアント生成

```bash
pip install openapi-python-client
openapi-python-client generate --path openapi.yaml
```

---

## モックサーバー（Prism）

```bash
# Prismのインストール
npm install -g @stoplight/prism-cli

# モックサーバー起動
prism mock openapi.yaml

# → http://localhost:4010 でモックAPIが使える
```

```bash
# リクエスト例
curl http://localhost:4010/users
# → OpenAPIのexampleに基づいたレスポンスが返る

curl -X POST http://localhost:4010/users \
  -H "Content-Type: application/json" \
  -d '{"name":"test","email":"test@example.com","password":"password123"}'
# → 201レスポンス

# バリデーション
curl -X POST http://localhost:4010/users \
  -H "Content-Type: application/json" \
  -d '{"name":"t"}'
# → 422エラー（minLength違反）
```

### Prismのプロキシモード

```bash
# 実際のAPIに対してリクエスト/レスポンスをOpenAPIに対して検証
prism proxy openapi.yaml http://localhost:8080
```

---

## リンティング（Spectral）

```bash
npm install -g @stoplight/spectral-cli
```

```yaml
# .spectral.yaml
extends:
  - spectral:oas

rules:
  # カスタムルール
  operation-description:
    severity: warn
    given: "$.paths[*][*]"
    then:
      field: description
      function: truthy

  # operationIdは必須
  operation-operationId:
    severity: error

  # 日本語でsummaryを書く
  operation-summary-length:
    severity: warn
    given: "$.paths[*][*].summary"
    then:
      function: length
      functionOptions:
        min: 5
        max: 50
```

```bash
spectral lint openapi.yaml

# 出力例
# /users:get.description - Operation should have a description (operation-description)
# ✖ 1 problem (0 errors, 1 warning)
```

---

## 契約テスト

### Schemathesisによる自動テスト

```bash
pip install schemathesis

# OpenAPIスキーマに基づいてファジングテスト
schemathesis run http://localhost:8080/openapi.json \
  --checks all \
  --base-url http://localhost:8080

# 見つかる問題の例:
# - 5xxエラーを返すエッジケース
# - スキーマと異なるレスポンス
# - 想定外の入力での挙動
```

### Prismでの契約テスト

```typescript
// テストでPrismを使って仕様との一致を検証
import { createClientFromPrism } from './test-helpers';

test('GET /users のレスポンスがスキーマに一致する', async () => {
  const response = await fetch('http://localhost:8080/api/v1/users');
  const data = await response.json();

  // Zodスキーマで検証
  const result = PaginatedUsersSchema.safeParse(data);
  expect(result.success).toBe(true);
});
```

---

## CI/CDとの統合

```yaml
# .github/workflows/api-check.yml
name: API Schema Check

on:
  pull_request:
    paths:
      - 'openapi.yaml'
      - 'src/api/**'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: OpenAPIリンティング
        run: npx @stoplight/spectral-cli lint openapi.yaml

  breaking-changes:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: 破壊的変更の検出
        run: |
          npx oasdiff breaking \
            <(git show main:openapi.yaml) \
            openapi.yaml

  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - name: 型生成
        run: npx openapi-typescript openapi.yaml -o src/api/types.ts
      - name: 差分確認
        run: git diff --exit-code src/api/types.ts
```

---

## まとめ

### API Firstの開発フロー

```
1. OpenAPIでAPI仕様を定義
2. Spectralでリンティング
3. Prismでモックサーバー起動
4. フロント: openapi-fetchで型安全にAPI呼び出し
5. バック: スキーマに合わせて実装
6. CI: 契約テスト + 破壊的変更検出
```

| ツール | 用途 |
|--------|------|
| openapi-typescript | TypeScript型生成 |
| openapi-fetch | 型安全HTTPクライアント |
| Prism | モックサーバー/プロキシ |
| Spectral | リンティング |
| oasdiff | 破壊的変更検出 |
| Schemathesis | ファジングテスト |

API Firstは初期コストがかかりますが、チーム開発のスピードと品質を大幅に向上させます。特にフロント/バック分業のプロジェクトでは、その効果は絶大です。

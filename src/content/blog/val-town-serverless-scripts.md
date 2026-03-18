---
title: 'Val Town：サーバーレスTypeScriptスクリプト実行プラットフォーム完全ガイド'
description: 'Val TownでTypeScriptコードをクラウド実行。API作成、CronJob、メール送信、Webhook処理を無料で実装する方法を実例付きで解説します。'
pubDate: '2025-02-06'
tags: ['Val Town', 'TypeScript', 'Serverless', 'API', 'Automation']
---

Val Townは、TypeScriptコードをブラウザで書いて即座にクラウドで実行できる革新的なサーバーレスプラットフォームです。関数をURLとして公開したり、Cronジョブとして定期実行したり、メールを送信したりと、様々な自動化タスクを無料で実装できます。

## Val Townとは

Val Townは「Val」と呼ばれる小さなTypeScript/JavaScriptコードスニペットをクラウドで実行するプラットフォームです。

### 主な特徴

- **即座に実行**: コードを書いたら即座にデプロイ、URLで公開
- **無料プラン充実**: 月10,000実行まで無料
- **TypeScript完全サポート**: 型安全なコード記述
- **組み込みライブラリ**: fetch、SQLite、メール送信などが標準装備
- **公開・非公開選択可能**: ValをPublicまたはPrivateで管理
- **バージョン管理**: Valの履歴を自動保存

### ユースケース

- APIエンドポイントの作成
- Cronジョブによる定期実行
- Webhook受信・処理
- データスクレイピング
- 通知・アラート送信
- 簡易データベース操作

## アカウント作成と基本操作

### 1. アカウント作成

```
1. https://val.town にアクセス
2. GitHubアカウントでログイン
3. ユーザー名を設定
```

### 2. 最初のVal作成

```typescript
// ボタン「New Val」をクリック → 「HTTP」を選択

export default async function handler(req: Request): Promise<Response> {
  return new Response("Hello, Val Town!");
}
```

保存すると即座にURLが発行されます。
```
https://your-username-valname.web.val.run
```

## HTTP API作成

### 基本的なGET API

```typescript
export default async function getUserAPI(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const userId = url.searchParams.get("id");

  if (!userId) {
    return Response.json(
      { error: "User ID is required" },
      { status: 400 }
    );
  }

  // ダミーユーザーデータ
  const user = {
    id: userId,
    name: "Taro Yamada",
    email: "taro@example.com",
  };

  return Response.json(user);
}
```

**使い方**:
```
https://your-username-getUserAPI.web.val.run?id=123
```

### POST API（フォーム処理）

```typescript
export default async function createUserAPI(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405 }
    );
  }

  const body = await req.json();
  const { name, email } = body;

  if (!name || !email) {
    return Response.json(
      { error: "Name and email are required" },
      { status: 400 }
    );
  }

  // データベース保存処理（後述）
  const userId = Math.random().toString(36).substr(2, 9);

  return Response.json({
    success: true,
    user: { id: userId, name, email },
  }, { status: 201 });
}
```

**curlでテスト**:
```bash
curl -X POST https://your-username-createUserAPI.web.val.run \
  -H "Content-Type: application/json" \
  -d '{"name":"Taro","email":"taro@example.com"}'
```

### CORS対応API

```typescript
export default async function corsAPI(req: Request): Promise<Response> {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // プリフライトリクエスト対応
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  const data = { message: "CORS enabled API" };
  return Response.json(data, { headers });
}
```

## Cronジョブ（定期実行）

### 毎日実行するジョブ

```typescript
import { email } from "https://esm.town/v/std/email";

export default async function dailyReport() {
  const today = new Date().toISOString().split('T')[0];

  // データ集計処理
  const stats = await fetchDailyStats();

  // メール送信
  await email({
    subject: `Daily Report - ${today}`,
    text: `
      Total Users: ${stats.users}
      Total Revenue: $${stats.revenue}
      New Signups: ${stats.signups}
    `,
  });

  console.log("Daily report sent:", today);
}

async function fetchDailyStats() {
  // 実際のデータ取得ロジック
  return {
    users: 1234,
    revenue: 5678,
    signups: 42,
  };
}
```

**Cron設定**:
1. Valの設定画面を開く
2. 「Schedule」タブを選択
3. `0 9 * * *` (毎日9時)を設定

### 5分ごとに実行するモニタリング

```typescript
export default async function monitorWebsite() {
  const url = "https://example.com";

  try {
    const response = await fetch(url, { method: "HEAD" });

    if (!response.ok) {
      await sendAlert(`Website down! Status: ${response.status}`);
    }
  } catch (error) {
    await sendAlert(`Website unreachable: ${error.message}`);
  }
}

async function sendAlert(message: string) {
  // Slack通知
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message }),
  });
}
```

**Cron設定**: `*/5 * * * *` (5分ごと)

## メール送信

### 基本的なメール送信

```typescript
import { email } from "https://esm.town/v/std/email";

export default async function sendWelcomeEmail(req: Request): Promise<Response> {
  const { userEmail, userName } = await req.json();

  await email({
    to: userEmail,
    subject: "Welcome to our service!",
    text: `Hi ${userName},\n\nWelcome aboard!`,
    html: `<h1>Hi ${userName}</h1><p>Welcome aboard!</p>`,
  });

  return Response.json({ success: true });
}
```

### HTMLメールテンプレート

```typescript
import { email } from "https://esm.town/v/std/email";

export default async function sendInvoice(req: Request): Promise<Response> {
  const { userEmail, invoiceData } = await req.json();

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #4CAF50; color: white; }
        </style>
      </head>
      <body>
        <h2>Invoice #${invoiceData.id}</h2>
        <table>
          <tr><th>Item</th><th>Price</th></tr>
          ${invoiceData.items.map(item =>
            `<tr><td>${item.name}</td><td>$${item.price}</td></tr>`
          ).join('')}
        </table>
        <p><strong>Total: $${invoiceData.total}</strong></p>
      </body>
    </html>
  `;

  await email({ to: userEmail, subject: `Invoice #${invoiceData.id}`, html });

  return Response.json({ success: true });
}
```

## SQLiteデータベース

Val TownにはSQLiteが組み込まれています。

### データ保存

```typescript
import { sqlite } from "https://esm.town/v/std/sqlite";

export default async function saveUserAPI(req: Request): Promise<Response> {
  const { name, email } = await req.json();

  // テーブル作成（初回のみ）
  await sqlite.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // データ挿入
  await sqlite.execute({
    sql: "INSERT INTO users (name, email) VALUES (?, ?)",
    args: [name, email],
  });

  return Response.json({ success: true });
}
```

### データ取得

```typescript
import { sqlite } from "https://esm.town/v/std/sqlite";

export default async function getUsersAPI(req: Request): Promise<Response> {
  const result = await sqlite.execute("SELECT * FROM users ORDER BY id DESC LIMIT 10");

  return Response.json({
    users: result.rows,
    total: result.rows.length,
  });
}
```

### データ検索

```typescript
import { sqlite } from "https://esm.town/v/std/sqlite";

export default async function searchUsersAPI(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const query = url.searchParams.get("q") || "";

  const result = await sqlite.execute({
    sql: "SELECT * FROM users WHERE name LIKE ? OR email LIKE ?",
    args: [`%${query}%`, `%${query}%`],
  });

  return Response.json({ users: result.rows });
}
```

## Webhook処理

### GitHub Webhook

```typescript
export default async function githubWebhook(req: Request): Promise<Response> {
  const payload = await req.json();
  const event = req.headers.get("X-GitHub-Event");

  if (event === "push") {
    const { repository, commits } = payload;

    console.log(`New push to ${repository.name}`);
    console.log(`${commits.length} commits`);

    // Slack通知
    await notifySlack(`New push to ${repository.name}: ${commits.length} commits`);
  }

  return Response.json({ received: true });
}

async function notifySlack(message: string) {
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message }),
  });
}
```

### Stripe Webhook（決済通知）

```typescript
export default async function stripeWebhook(req: Request): Promise<Response> {
  const payload = await req.json();
  const { type, data } = payload;

  switch (type) {
    case "payment_intent.succeeded":
      await handlePaymentSuccess(data.object);
      break;
    case "payment_intent.payment_failed":
      await handlePaymentFailed(data.object);
      break;
  }

  return Response.json({ received: true });
}

async function handlePaymentSuccess(paymentIntent: any) {
  console.log("Payment succeeded:", paymentIntent.id);
  // データベース更新、領収書送信など
}

async function handlePaymentFailed(paymentIntent: any) {
  console.log("Payment failed:", paymentIntent.id);
  // 管理者通知など
}
```

## 環境変数の使用

### 環境変数設定

```
1. Valの設定画面を開く
2. 「Secrets」タブを選択
3. キーと値を入力して保存
```

### コード内で使用

```typescript
export default async function useEnvAPI(req: Request): Promise<Response> {
  const apiKey = process.env.EXTERNAL_API_KEY;
  const dbUrl = process.env.DATABASE_URL;

  // 外部API呼び出し
  const response = await fetch("https://api.example.com/data", {
    headers: { "Authorization": `Bearer ${apiKey}` },
  });

  const data = await response.json();

  return Response.json(data);
}
```

## 実用例：URLショートナー

```typescript
import { sqlite } from "https://esm.town/v/std/sqlite";

export default async function urlShortener(req: Request): Promise<Response> {
  await initDatabase();

  const url = new URL(req.url);
  const path = url.pathname;

  // リダイレクト処理
  if (path.startsWith("/r/")) {
    const code = path.replace("/r/", "");
    return await redirect(code);
  }

  // URL短縮API
  if (req.method === "POST") {
    const { url: targetUrl } = await req.json();
    const code = await createShortUrl(targetUrl);
    return Response.json({ shortUrl: `/r/${code}`, code });
  }

  return Response.json({ error: "Invalid request" }, { status: 400 });
}

async function initDatabase() {
  await sqlite.execute(`
    CREATE TABLE IF NOT EXISTS urls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      url TEXT NOT NULL,
      clicks INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function createShortUrl(url: string): Promise<string> {
  const code = Math.random().toString(36).substr(2, 6);
  await sqlite.execute({
    sql: "INSERT INTO urls (code, url) VALUES (?, ?)",
    args: [code, url],
  });
  return code;
}

async function redirect(code: string): Promise<Response> {
  const result = await sqlite.execute({
    sql: "SELECT url FROM urls WHERE code = ?",
    args: [code],
  });

  if (result.rows.length === 0) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // クリック数更新
  await sqlite.execute({
    sql: "UPDATE urls SET clicks = clicks + 1 WHERE code = ?",
    args: [code],
  });

  return Response.redirect(result.rows[0].url, 302);
}
```

**使い方**:
```bash
# URL短縮
curl -X POST https://your-username-urlShortener.web.val.run \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/very/long/url"}'

# レスポンス: {"shortUrl":"/r/abc123","code":"abc123"}

# アクセス
curl https://your-username-urlShortener.web.val.run/r/abc123
```

## 料金プラン

### Free Plan
- 月10,000実行
- Public Valsは無制限閲覧可能
- 基本機能すべて利用可能

### Pro Plan ($10/月)
- 月100万実行
- Private Vals
- カスタムドメイン
- 優先サポート

## まとめ

Val Townは以下の点で優れています。

**メリット**:
- 無料で始められる
- TypeScript完全サポート
- デプロイが即座
- Cronジョブ標準装備
- SQLiteデータベース内蔵
- メール送信が簡単

**適したユースケース**:
- 簡易API開発
- 定期実行タスク
- Webhook処理
- プロトタイピング
- 個人プロジェクト

**注意点**:
- 大規模トラフィックには不向き
- 実行時間制限あり
- ストレージ容量制限

小規模なAPIやCronジョブ、個人プロジェクトには最適なプラットフォームです。ぜひ試してみてください。

**参考リンク**:
- [Val Town 公式サイト](https://val.town)
- [Val Town ドキュメント](https://docs.val.town)
- [Val Town Examples](https://val.town/explore)

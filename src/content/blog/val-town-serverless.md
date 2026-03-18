---
title: "Val Town サーバーレス開発ガイド - ブラウザで完結するバックエンド開発"
description: "Val Townを使ったサーバーレス開発の完全ガイド。API作成、スケジューリング、データベース、Webスクレイピングまで、コードエディタ不要のクラウド開発環境を徹底解説。"
pubDate: "2025-02-05"
tags: ["val-town", "serverless", "typescript", "api", "cloud-development"]
---

Val Townは、ブラウザ上でTypeScript/JavaScriptのコードを書いて即座にデプロイできる革新的なサーバーレスプラットフォームです。従来のサーバーレス開発の煩雑さを排除し、アイデアをすぐに形にできる開発体験を提供します。

本記事では、Val Townの基本から実践的な使い方まで、具体的なコード例とともに詳しく解説します。

## Val Townとは

### 主な特徴

1. **ブラウザで完結** - ローカル環境不要、全てWebで完結
2. **即座にデプロイ** - コードを書いたらすぐに本番環境で動作
3. **HTTPエンドポイント** - 自動でURLが付与される
4. **スケジューラー内蔵** - Cronジョブが簡単に設定できる
5. **データベース内蔵** - SQLiteベースのストレージ
6. **NPMパッケージ使用可能** - 既存ライブラリが使える
7. **無料で始められる** - フリープランでも実用的

### ユースケース

- **簡単なAPI作成** - REST API、Webhook受信
- **定期実行タスク** - データ収集、通知送信
- **Webスクレイピング** - データ抽出と自動化
- **プロトタイピング** - アイデアの迅速な検証
- **個人ツール** - 自分専用のユーティリティ

## セットアップ

### アカウント作成

1. [Val Town](https://www.val.town/)にアクセス
2. GitHubアカウントでサインアップ
3. すぐに開発開始

### 最初のVal作成

Val Townでは、コードの単位を「Val」と呼びます。

```typescript
// シンプルなHTTPハンドラー
export default async function(req: Request): Promise<Response> {
  return new Response("Hello from Val Town!");
}
```

保存すると自動的にURLが生成され、即座にアクセス可能になります。

## HTTPエンドポイント

### 基本的なAPI

```typescript
// GETリクエスト
export default async function(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const name = url.searchParams.get("name") || "World";

  return new Response(`Hello, ${name}!`, {
    headers: { "Content-Type": "text/plain" }
  });
}
```

### JSONレスポンス

```typescript
export default async function(req: Request): Promise<Response> {
  const data = {
    message: "Success",
    timestamp: new Date().toISOString(),
    users: [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" }
    ]
  };

  return Response.json(data);
}
```

### POSTリクエスト処理

```typescript
export default async function(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.json();

    // バリデーション
    if (!body.name || !body.email) {
      return Response.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    // 処理
    const result = {
      id: Math.random().toString(36).substr(2, 9),
      ...body,
      createdAt: new Date().toISOString()
    };

    return Response.json(result, { status: 201 });

  } catch (error) {
    return Response.json(
      { error: "Invalid JSON" },
      { status: 400 }
    );
  }
}
```

### CORS対応

```typescript
export default async function(req: Request): Promise<Response> {
  // CORSヘッダー
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  // プリフライトリクエスト
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  const data = { message: "CORS enabled!" };
  return new Response(JSON.stringify(data), { headers });
}
```

## データベース操作

Val Townには組み込みのSQLiteデータベースがあります。

### データ保存

```typescript
import { sqlite } from "https://esm.town/v/std/sqlite";

export default async function(req: Request): Promise<Response> {
  const db = sqlite("myDatabase");

  // テーブル作成
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // データ挿入
  const { name, email } = await req.json();

  try {
    await db.execute(
      "INSERT INTO users (name, email) VALUES (?, ?)",
      [name, email]
    );

    return Response.json({ message: "User created" }, { status: 201 });

  } catch (error) {
    return Response.json(
      { error: "Email already exists" },
      { status: 409 }
    );
  }
}
```

### データ取得

```typescript
import { sqlite } from "https://esm.town/v/std/sqlite";

export default async function(req: Request): Promise<Response> {
  const db = sqlite("myDatabase");

  const url = new URL(req.url);
  const userId = url.searchParams.get("id");

  if (userId) {
    // 単一ユーザー取得
    const user = await db.execute(
      "SELECT * FROM users WHERE id = ?",
      [userId]
    );

    if (user.rows.length === 0) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json(user.rows[0]);
  }

  // 全ユーザー取得
  const users = await db.execute("SELECT * FROM users ORDER BY created_at DESC");
  return Response.json(users.rows);
}
```

### データ更新・削除

```typescript
import { sqlite } from "https://esm.town/v/std/sqlite";

export default async function(req: Request): Promise<Response> {
  const db = sqlite("myDatabase");
  const url = new URL(req.url);
  const userId = url.searchParams.get("id");

  if (req.method === "PUT") {
    // 更新
    const { name, email } = await req.json();

    await db.execute(
      "UPDATE users SET name = ?, email = ? WHERE id = ?",
      [name, email, userId]
    );

    return Response.json({ message: "User updated" });
  }

  if (req.method === "DELETE") {
    // 削除
    await db.execute("DELETE FROM users WHERE id = ?", [userId]);
    return Response.json({ message: "User deleted" });
  }

  return new Response("Method not allowed", { status: 405 });
}
```

## スケジューラー

定期実行タスクを簡単に設定できます。

### 毎時実行

```typescript
import { email } from "https://esm.town/v/std/email";

// @schedule: 0 * * * * (毎時0分に実行)
export default async function() {
  const now = new Date().toISOString();

  // データ取得
  const response = await fetch("https://api.example.com/stats");
  const data = await response.json();

  // 通知送信
  if (data.value > 100) {
    await email({
      to: "you@example.com",
      subject: "Alert: Value exceeded threshold",
      text: `Current value: ${data.value} at ${now}`
    });
  }

  console.log(`Checked at ${now}: ${data.value}`);
}
```

### 毎日午前9時実行

```typescript
import { sqlite } from "https://esm.town/v/std/sqlite";

// @schedule: 0 9 * * * (毎日9:00に実行)
export default async function() {
  const db = sqlite("dailyStats");

  // 昨日のデータ集計
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = yesterday.toISOString().split('T')[0];

  const stats = await db.execute(`
    SELECT
      COUNT(*) as total_users,
      SUM(revenue) as total_revenue
    FROM users
    WHERE DATE(created_at) = ?
  `, [date]);

  // 統計を保存
  await db.execute(`
    INSERT INTO daily_reports (date, users, revenue)
    VALUES (?, ?, ?)
  `, [date, stats.rows[0].total_users, stats.rows[0].total_revenue]);

  console.log(`Daily report generated for ${date}`);
}
```

## Webスクレイピング

### HTMLパース

```typescript
import { DOMParser } from "https://esm.sh/linkedom@0.16.1";

export default async function(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    return Response.json({ error: "URL parameter required" }, { status: 400 });
  }

  try {
    // ページ取得
    const response = await fetch(targetUrl);
    const html = await response.text();

    // パース
    const document = new DOMParser().parseFromString(html, "text/html");

    // データ抽出
    const title = document.querySelector("title")?.textContent || "";
    const headings = Array.from(document.querySelectorAll("h1, h2"))
      .map(h => h.textContent?.trim())
      .filter(Boolean);

    const links = Array.from(document.querySelectorAll("a"))
      .map(a => ({
        text: a.textContent?.trim(),
        href: a.getAttribute("href")
      }))
      .filter(link => link.href);

    return Response.json({
      title,
      headings,
      links: links.slice(0, 10) // 最初の10件
    });

  } catch (error) {
    return Response.json(
      { error: "Failed to fetch URL" },
      { status: 500 }
    );
  }
}
```

### JSONデータ収集

```typescript
import { sqlite } from "https://esm.town/v/std/sqlite";

// @schedule: 0 */6 * * * (6時間ごと)
export default async function() {
  const db = sqlite("priceTracker");

  // テーブル作成
  await db.execute(`
    CREATE TABLE IF NOT EXISTS prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crypto TEXT NOT NULL,
      price REAL NOT NULL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 価格データ取得
  const response = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd"
  );
  const data = await response.json();

  // データ保存
  for (const [crypto, prices] of Object.entries(data)) {
    await db.execute(
      "INSERT INTO prices (crypto, price) VALUES (?, ?)",
      [crypto, prices.usd]
    );
  }

  console.log("Prices updated:", data);
}
```

## 外部API連携

### Slack通知

```typescript
export default async function(req: Request): Promise<Response> {
  const { message } = await req.json();

  const webhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");

  if (!webhookUrl) {
    return Response.json({ error: "Webhook URL not configured" }, { status: 500 });
  }

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: message,
      username: "Val Town Bot",
      icon_emoji: ":robot_face:"
    })
  });

  return Response.json({ message: "Sent to Slack" });
}
```

### Discord Webhook

```typescript
export default async function(req: Request): Promise<Response> {
  const { title, description, color } = await req.json();

  const webhookUrl = Deno.env.get("DISCORD_WEBHOOK_URL");

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [{
        title,
        description,
        color: parseInt(color || "0x00ff00", 16),
        timestamp: new Date().toISOString()
      }]
    })
  });

  return Response.json({ message: "Sent to Discord" });
}
```

### Twitter API

```typescript
export default async function(req: Request): Promise<Response> {
  const { text } = await req.json();

  const bearerToken = Deno.env.get("TWITTER_BEARER_TOKEN");

  const response = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${bearerToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text })
  });

  const result = await response.json();
  return Response.json(result);
}
```

## 環境変数とシークレット

Val Townでは環境変数を安全に管理できます。

```typescript
export default async function(req: Request): Promise<Response> {
  // 環境変数取得
  const apiKey = Deno.env.get("API_KEY");
  const dbPassword = Deno.env.get("DB_PASSWORD");

  if (!apiKey) {
    return Response.json({ error: "API key not configured" }, { status: 500 });
  }

  // 外部API呼び出し
  const response = await fetch("https://api.example.com/data", {
    headers: { "Authorization": `Bearer ${apiKey}` }
  });

  const data = await response.json();
  return Response.json(data);
}
```

## エラーハンドリング

```typescript
export default async function(req: Request): Promise<Response> {
  try {
    // メイン処理
    const result = await someAsyncOperation();
    return Response.json(result);

  } catch (error) {
    // エラーログ
    console.error("Error occurred:", error);

    // ユーザーフレンドリーなエラーレスポンス
    return Response.json(
      {
        error: "An error occurred",
        message: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
```

## ベストプラクティス

### 1. レート制限

```typescript
import { sqlite } from "https://esm.town/v/std/sqlite";

export default async function(req: Request): Promise<Response> {
  const db = sqlite("rateLimiter");
  const ip = req.headers.get("x-forwarded-for") || "unknown";

  // レート制限チェック
  const result = await db.execute(
    "SELECT COUNT(*) as count FROM requests WHERE ip = ? AND timestamp > datetime('now', '-1 minute')",
    [ip]
  );

  if (result.rows[0].count >= 10) {
    return Response.json(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  // リクエスト記録
  await db.execute(
    "INSERT INTO requests (ip, timestamp) VALUES (?, datetime('now'))",
    [ip]
  );

  // メイン処理
  return Response.json({ message: "Success" });
}
```

### 2. キャッシング

```typescript
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 1分

export default async function(req: Request): Promise<Response> {
  const cacheKey = req.url;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return Response.json(cached.data, {
      headers: { "X-Cache": "HIT" }
    });
  }

  // データ取得
  const data = await fetchExpensiveData();

  // キャッシュ保存
  cache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });

  return Response.json(data, {
    headers: { "X-Cache": "MISS" }
  });
}
```

## まとめ

Val Townは、サーバーレス開発を驚くほど簡単にするプラットフォームです。主な利点:

- **セットアップ不要** - ブラウザだけで開発完結
- **即座にデプロイ** - コードを書いたらすぐ本番稼働
- **データベース内蔵** - 別途DBサービス不要
- **スケジューラー完備** - Cronジョブが簡単
- **無料で始められる** - プロトタイピングに最適

個人プロジェクト、プロトタイピング、小規模APIなど、幅広い用途に活用できます。ぜひ試してみてください。

## 参考リンク

- [Val Town公式サイト](https://www.val.town/)
- [Val Townドキュメント](https://docs.val.town/)
- [Val Town Examples](https://www.val.town/explore)

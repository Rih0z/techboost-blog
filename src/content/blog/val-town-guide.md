---
title: 'Val Town完全ガイド - ブラウザで完結するサーバーレス開発'
description: 'Val Townの使い方を徹底解説。Deno互換のサーバーレス関数、APIエンドポイント作成、スケジュール実行、Webスクレイピング、データベース連携まで網羅的に学ぼう。'
pubDate: 'Feb 05 2026'
tags: ['ValTown', 'Serverless', 'Deno', 'API', 'インフラ']
---

# Val Town完全ガイド - ブラウザで完結するサーバーレス開発

Val Townは、ブラウザ上でサーバーレス関数を作成・実行できるプラットフォームです。Deno互換のランタイムを採用し、APIエンドポイント、スケジュール実行、Webhookなどを数秒でデプロイできます。

## Val Townとは

### 主な特徴

1. **ブラウザ完結** - コードエディタからデプロイまでブラウザで完結
2. **Deno互換** - TypeScript、npm、HTTPサーバーをネイティブサポート
3. **即座にデプロイ** - 保存するだけで自動デプロイ
4. **スケジュール実行** - Cron式でタスク自動化
5. **組み込みストレージ** - KVストレージ、SQLiteを標準装備
6. **公開・共有可能** - Valを公開して他のユーザーと共有

### Valの種類

```typescript
// 1. HTTP Val - HTTPエンドポイント
export default async function(req: Request): Promise<Response> {
  return new Response("Hello World")
}

// 2. Script Val - スクリプト実行
export default function() {
  console.log("This runs when called")
  return { status: "success" }
}

// 3. Interval Val - スケジュール実行
export default async function() {
  // 定期的に実行される
  console.log("Running scheduled task")
}
```

## 基本的な使い方

### HTTP Valの作成

```typescript
// シンプルなAPIエンドポイント
export default async function(req: Request): Promise<Response> {
  return Response.json({
    message: "Hello from Val Town!",
    timestamp: new Date().toISOString()
  })
}
```

### クエリパラメータの処理

```typescript
// URLクエリパラメータを扱う
export default async function(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const name = url.searchParams.get("name") || "World"
  const count = parseInt(url.searchParams.get("count") || "1")

  return Response.json({
    greeting: `Hello, ${name}!`,
    repeated: Array(count).fill(`Hi ${name}`).join(" ")
  })
}

// 使用例:
// https://yourval.web.val.run?name=Alice&count=3
```

### POSTリクエストの処理

```typescript
// POSTデータを受け取る
export default async function(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 })
  }

  try {
    const body = await req.json()

    // バリデーション
    if (!body.email || !body.message) {
      return Response.json(
        { error: "Email and message are required" },
        { status: 400 }
      )
    }

    // 処理
    console.log("Received:", body)

    return Response.json({
      success: true,
      data: {
        email: body.email,
        messageLength: body.message.length,
        receivedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    return Response.json(
      { error: "Invalid JSON" },
      { status: 400 }
    )
  }
}
```

## データストレージ

### KVストレージの使用

```typescript
import { blob } from "https://esm.town/v/std/blob"

// データの保存
export async function saveData(key: string, value: any) {
  await blob.setJSON(key, value)
  return { success: true, key }
}

// データの取得
export async function getData(key: string) {
  const data = await blob.getJSON(key)
  return data
}

// HTTP Valでの使用例
export default async function(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const action = url.searchParams.get("action")

  if (action === "save") {
    const data = await req.json()
    await blob.setJSON("mydata", data)
    return Response.json({ saved: true })
  }

  if (action === "get") {
    const data = await blob.getJSON("mydata")
    return Response.json(data || { message: "No data" })
  }

  return Response.json({ error: "Invalid action" }, { status: 400 })
}
```

### SQLiteデータベース

```typescript
import { sqlite } from "https://esm.town/v/std/sqlite"

// テーブル作成
export async function initDatabase() {
  await sqlite.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  return { initialized: true }
}

// データ挿入
export async function createUser(name: string, email: string) {
  const result = await sqlite.execute(
    "INSERT INTO users (name, email) VALUES (?, ?)",
    [name, email]
  )
  return { id: result.lastInsertRowId }
}

// データ取得
export async function getUsers() {
  const rows = await sqlite.execute("SELECT * FROM users ORDER BY created_at DESC")
  return rows
}

// HTTP APIとして公開
export default async function(req: Request): Promise<Response> {
  const url = new URL(req.url)

  if (req.method === "GET") {
    const users = await getUsers()
    return Response.json(users)
  }

  if (req.method === "POST") {
    const { name, email } = await req.json()

    try {
      const user = await createUser(name, email)
      return Response.json(user, { status: 201 })
    } catch (error) {
      return Response.json(
        { error: "Failed to create user" },
        { status: 400 }
      )
    }
  }

  return new Response("Method Not Allowed", { status: 405 })
}
```

## スケジュール実行

### Interval Valの作成

```typescript
// 1時間ごとに実行
export const interval = "1h"

export default async function() {
  console.log("Running scheduled task at", new Date().toISOString())

  // 外部APIを呼び出す
  const response = await fetch("https://api.example.com/data")
  const data = await response.json()

  // 結果を保存
  await blob.setJSON("latest_data", {
    data,
    fetchedAt: new Date().toISOString()
  })

  return { success: true, itemCount: data.length }
}
```

### Cron式でのスケジュール

```typescript
// 毎日午前9時（UTC）に実行
export const interval = "0 9 * * *"

export default async function() {
  // 日次レポート生成
  const stats = await generateDailyStats()

  // 通知送信
  await sendNotification({
    subject: "Daily Report",
    body: `Generated ${stats.total} reports`
  })

  return stats
}

async function generateDailyStats() {
  const data = await blob.getJSON("daily_data")
  return {
    total: data?.length || 0,
    date: new Date().toISOString().split("T")[0]
  }
}

async function sendNotification(msg: { subject: string; body: string }) {
  // Email APIやSlackなどに通知
  console.log("Notification:", msg)
}
```

## 外部API連携

### GitHub API

```typescript
// GitHubリポジトリ情報取得
export default async function(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const repo = url.searchParams.get("repo") || "denoland/deno"

  const response = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: {
      "User-Agent": "Val-Town-App",
      "Accept": "application/vnd.github.v3+json"
    }
  })

  if (!response.ok) {
    return Response.json(
      { error: "Repository not found" },
      { status: 404 }
    )
  }

  const data = await response.json()

  return Response.json({
    name: data.name,
    description: data.description,
    stars: data.stargazers_count,
    forks: data.forks_count,
    language: data.language,
    url: data.html_url
  })
}
```

### Webスクレイピング

```typescript
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts"

// ニュースサイトからタイトル抽出
export default async function(req: Request): Promise<Response> {
  const url = "https://news.ycombinator.com"

  const response = await fetch(url)
  const html = await response.text()

  const doc = new DOMParser().parseFromString(html, "text/html")
  const titles = doc?.querySelectorAll(".titleline > a")

  const articles = Array.from(titles || [])
    .slice(0, 10)
    .map((el: any) => ({
      title: el.textContent,
      url: el.getAttribute("href")
    }))

  return Response.json({
    source: "Hacker News",
    articles,
    fetchedAt: new Date().toISOString()
  })
}
```

### OpenAI API

```typescript
import { OpenAI } from "https://esm.sh/openai@4"

// 環境変数からAPIキー取得
const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY")
})

export default async function(req: Request): Promise<Response> {
  const { prompt } = await req.json()

  if (!prompt) {
    return Response.json(
      { error: "Prompt is required" },
      { status: 400 }
    )
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500
    })

    return Response.json({
      response: completion.choices[0].message.content,
      usage: completion.usage
    })
  } catch (error) {
    return Response.json(
      { error: "OpenAI API error" },
      { status: 500 }
    )
  }
}
```

## Webhook

### Slackへの通知

```typescript
// Slack Incoming Webhook
export async function sendSlackMessage(message: string) {
  const webhookUrl = Deno.env.get("SLACK_WEBHOOK_URL")

  if (!webhookUrl) {
    throw new Error("SLACK_WEBHOOK_URL not set")
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message })
  })

  return response.ok
}

// HTTP Valとして公開
export default async function(req: Request): Promise<Response> {
  const { message } = await req.json()

  try {
    await sendSlackMessage(message)
    return Response.json({ sent: true })
  } catch (error) {
    return Response.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}
```

### GitHub Webhook受信

```typescript
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts"

// GitHub Webhookの署名検証
async function verifySignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  )

  const expectedSignature = "sha256=" + Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")

  return expectedSignature === signature
}

export default async function(req: Request): Promise<Response> {
  const signature = req.headers.get("x-hub-signature-256")
  const event = req.headers.get("x-github-event")

  if (!signature || !event) {
    return new Response("Unauthorized", { status: 401 })
  }

  const payload = await req.text()
  const secret = Deno.env.get("GITHUB_WEBHOOK_SECRET") || ""

  const isValid = await verifySignature(payload, signature, secret)

  if (!isValid) {
    return new Response("Invalid signature", { status: 401 })
  }

  const data = JSON.parse(payload)

  // イベントごとの処理
  if (event === "push") {
    await handlePush(data)
  } else if (event === "pull_request") {
    await handlePullRequest(data)
  }

  return Response.json({ received: true })
}

async function handlePush(data: any) {
  console.log("Push event:", data.repository.full_name)
  console.log("Commits:", data.commits.length)
}

async function handlePullRequest(data: any) {
  console.log("PR event:", data.action)
  console.log("PR #:", data.pull_request.number)
}
```

## メール送信

### Resend APIを使用

```typescript
// Resend APIでメール送信
export async function sendEmail(params: {
  to: string
  subject: string
  html: string
}) {
  const apiKey = Deno.env.get("RESEND_API_KEY")

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "noreply@yourapp.com",
      to: params.to,
      subject: params.subject,
      html: params.html
    })
  })

  if (!response.ok) {
    throw new Error(`Failed to send email: ${response.statusText}`)
  }

  return await response.json()
}

// フォーム送信を受け取ってメール送信
export default async function(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 })
  }

  const { email, name, message } = await req.json()

  try {
    await sendEmail({
      to: "contact@yourapp.com",
      subject: `Contact form submission from ${name}`,
      html: `
        <h1>New Contact Form Submission</h1>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `
    })

    return Response.json({ success: true })
  } catch (error) {
    return Response.json(
      { error: "Failed to send email" },
      { status: 500 }
    )
  }
}
```

## RSS/Atom フィード

### RSSフィード生成

```typescript
import { sqlite } from "https://esm.town/v/std/sqlite"

interface Article {
  id: number
  title: string
  content: string
  published_at: string
  url: string
}

export default async function(req: Request): Promise<Response> {
  // データベースから記事取得
  const articles = await sqlite.execute(`
    SELECT * FROM articles
    ORDER BY published_at DESC
    LIMIT 20
  `) as Article[]

  // RSS XML生成
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>My Blog</title>
    <link>https://myblog.example.com</link>
    <description>Latest articles from my blog</description>
    <language>en</language>
    <atom:link href="https://yourval.web.val.run" rel="self" type="application/rss+xml"/>
    ${articles.map(article => `
    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${article.url}</link>
      <description>${escapeXml(article.content)}</description>
      <pubDate>${new Date(article.published_at).toUTCString()}</pubDate>
      <guid>${article.url}</guid>
    </item>`).join("")}
  </channel>
</rss>`

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  })
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}
```

## 認証

### Basic認証

```typescript
export default async function(req: Request): Promise<Response> {
  const auth = req.headers.get("Authorization")

  if (!auth) {
    return new Response("Unauthorized", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Secure Area"'
      }
    })
  }

  const [scheme, credentials] = auth.split(" ")

  if (scheme !== "Basic") {
    return new Response("Unauthorized", { status: 401 })
  }

  const decoded = atob(credentials)
  const [username, password] = decoded.split(":")

  // 環境変数から認証情報取得
  const validUsername = Deno.env.get("AUTH_USERNAME")
  const validPassword = Deno.env.get("AUTH_PASSWORD")

  if (username !== validUsername || password !== validPassword) {
    return new Response("Unauthorized", { status: 401 })
  }

  // 認証成功
  return Response.json({
    message: "Welcome!",
    user: username
  })
}
```

### JWT認証

```typescript
import { create, verify } from "https://deno.land/x/djwt@v3.0.1/mod.ts"

const SECRET = Deno.env.get("JWT_SECRET") || "your-secret-key"

// トークン生成
export async function generateToken(userId: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  )

  return await create(
    { alg: "HS256", typ: "JWT" },
    { sub: userId, exp: Date.now() / 1000 + 3600 }, // 1時間有効
    key
  )
}

// トークン検証
export async function verifyToken(token: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  )

  try {
    const payload = await verify(token, key)
    return payload
  } catch {
    return null
  }
}

// HTTP Valで使用
export default async function(req: Request): Promise<Response> {
  const url = new URL(req.url)

  // ログイン
  if (url.pathname === "/login") {
    const { userId } = await req.json()
    const token = await generateToken(userId)
    return Response.json({ token })
  }

  // 保護されたエンドポイント
  const auth = req.headers.get("Authorization")
  if (!auth?.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401 })
  }

  const token = auth.substring(7)
  const payload = await verifyToken(token)

  if (!payload) {
    return new Response("Invalid token", { status: 401 })
  }

  return Response.json({
    message: "Protected data",
    userId: payload.sub
  })
}
```

## デバッグとログ

### ログ出力

```typescript
export default async function(req: Request): Promise<Response> {
  // コンソールログ（Val Townのログビューアーで確認）
  console.log("Request received:", {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers)
  })

  try {
    const result = await processRequest(req)
    console.log("Success:", result)
    return Response.json(result)
  } catch (error) {
    console.error("Error:", error)
    return Response.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}

async function processRequest(req: Request) {
  // 処理ロジック
  return { status: "ok" }
}
```

## ベストプラクティス

### エラーハンドリング

```typescript
export default async function(req: Request): Promise<Response> {
  try {
    // 入力バリデーション
    const url = new URL(req.url)
    const id = url.searchParams.get("id")

    if (!id) {
      return Response.json(
        { error: "ID parameter is required" },
        { status: 400 }
      )
    }

    // 処理
    const data = await fetchData(id)

    if (!data) {
      return Response.json(
        { error: "Data not found" },
        { status: 404 }
      )
    }

    return Response.json(data)

  } catch (error) {
    console.error("Unexpected error:", error)

    return Response.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

async function fetchData(id: string) {
  // データ取得ロジック
  return { id, name: "Sample" }
}
```

### CORS設定

```typescript
export default async function(req: Request): Promise<Response> {
  // CORS対応
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  }

  // Preflightリクエスト
  if (req.method === "OPTIONS") {
    return new Response(null, { headers })
  }

  const data = { message: "CORS enabled" }

  return new Response(JSON.stringify(data), { headers })
}
```

## まとめ

Val Townは以下を提供します:

1. **即座のデプロイ** - 保存するだけでコードが公開される
2. **Deno互換** - TypeScript、npm、標準ライブラリ対応
3. **組み込みストレージ** - KV、SQLiteが標準装備
4. **スケジュール実行** - Cron式でタスク自動化
5. **簡単な共有** - URLで即座に公開・共有
6. **無料枠が充実** - 個人プロジェクトには十分

Val Townは、プロトタイピング、API開発、自動化スクリプト、Webhookなど、様々な用途に適したプラットフォームです。セットアップ不要で即座に始められるため、アイデアを素早く形にできます。

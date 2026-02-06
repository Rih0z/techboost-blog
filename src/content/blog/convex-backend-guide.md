---
title: "Convex完全ガイド2026 - リアルタイムバックエンドの決定版"
description: "Convexの基礎から実践まで徹底解説。リアルタイムデータベース、スキーマ定義、クエリ、ミューテーション、Next.js/React連携、Clerk認証統合まで完全網羅。"
pubDate: "Feb 05 2026"
tags: ["Convex", "バックエンド", "リアルタイム", "データベース", "Next.js"]
---

## はじめに

Convexは、**リアルタイムアプリケーション開発を劇的に簡単にする**次世代バックエンドプラットフォームです。

従来のREST APIやGraphQLとは異なり、**リアクティブなデータフロー**を標準で提供します。

### Convexの特徴

- **リアルタイム同期**: データ変更が即座に全クライアントに反映
- **型安全**: TypeScript完全対応、エンドツーエンドの型推論
- **サーバーレス**: インフラ管理不要、自動スケーリング
- **トランザクション**: ACID保証、データ整合性
- **認証統合**: Clerk、Auth0、カスタム認証対応
- **ファイルストレージ**: 画像・動画の保存も簡単

### いつConvexを選ぶべきか

**最適な用途:**
- リアルタイムチャット
- コラボレーションツール（Notion風エディタ等）
- ダッシュボード・分析ツール
- ソーシャルアプリ
- 在庫管理・予約システム

**不向きな用途:**
- 超大規模データ処理（数億レコード）
- 複雑な集計クエリ（PostgreSQLが適している）
- レガシーシステム連携が多い場合

## セットアップ

### プロジェクト作成

```bash
# Next.js + Convex
npx create-next-app@latest my-app
cd my-app
npm install convex

# Convex初期化
npx convex dev
```

### 手動セットアップ

```bash
npm install convex
npx convex init
```

プロジェクト構造:

```
my-app/
├── convex/
│   ├── _generated/
│   ├── schema.ts
│   ├── tasks.ts
│   └── users.ts
├── src/
│   └── app/
│       └── page.tsx
└── .env.local
```

### 環境変数

```bash
# .env.local
CONVEX_DEPLOYMENT=dev:your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

## スキーマ定義

### 基本スキーマ

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_createdAt", ["createdAt"]),

  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    completed: v.boolean(),
    userId: v.id("users"),
    dueDate: v.optional(v.number()),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    tags: v.array(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_completed", ["completed"])
    .index("by_user_and_completed", ["userId", "completed"]),

  messages: defineTable({
    text: v.string(),
    userId: v.id("users"),
    channelId: v.string(),
    timestamp: v.number(),
  })
    .index("by_channel", ["channelId", "timestamp"])
    .index("by_user", ["userId"]),
});
```

### バリデーション

```typescript
// convex/values.ts
import { v } from "convex/values";

// カスタムバリデーター
export const emailValidator = v.string(); // 実際はregex等でバリデーション

export const taskSchema = v.object({
  title: v.string(),
  description: v.optional(v.string()),
  completed: v.boolean(),
  userId: v.id("users"),
  priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
  tags: v.array(v.string()),
});
```

## クエリ（Query）

### 基本クエリ

```typescript
// convex/tasks.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

// 全タスク取得
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tasks").collect();
  },
});

// ユーザー別タスク取得
export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// 未完了タスク取得
export const getIncomplete = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_user_and_completed", (q) =>
        q.eq("userId", args.userId).eq("completed", false)
      )
      .order("desc")
      .take(20);
  },
});

// タスク詳細取得
export const get = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) {
      throw new Error("Task not found");
    }
    return task;
  },
});
```

### 複雑なクエリ

```typescript
// convex/tasks.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

// フィルタリング + ソート
export const search = query({
  args: {
    userId: v.id("users"),
    query: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    completedOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // テキスト検索
    if (args.query) {
      tasks = tasks.filter((task) =>
        task.title.toLowerCase().includes(args.query!.toLowerCase())
      );
    }

    // 優先度フィルタ
    if (args.priority) {
      tasks = tasks.filter((task) => task.priority === args.priority);
    }

    // 完了ステータス
    if (args.completedOnly !== undefined) {
      tasks = tasks.filter((task) => task.completed === args.completedOnly);
    }

    return tasks;
  },
});

// ユーザー情報と結合
export const getWithUser = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) return null;

    const user = await ctx.db.get(task.userId);
    return { ...task, user };
  },
});
```

## ミューテーション（Mutation）

### 基本ミューテーション

```typescript
// convex/tasks.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

// タスク作成
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    userId: v.id("users"),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      completed: false,
      userId: args.userId,
      priority: args.priority,
      tags: args.tags,
    });
    return taskId;
  },
});

// タスク更新
export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    completed: v.optional(v.boolean()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

// タスク削除
export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
```

### トランザクション

```typescript
// convex/tasks.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

// 複数操作をアトミックに実行
export const completeAndCreateNext = mutation({
  args: {
    taskId: v.id("tasks"),
    nextTitle: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // タスク完了
    await ctx.db.patch(args.taskId, { completed: true });

    // 次のタスク作成
    const nextTaskId = await ctx.db.insert("tasks", {
      title: args.nextTitle,
      completed: false,
      userId: args.userId,
      priority: "medium",
      tags: [],
    });

    return nextTaskId;
  },
});
```

## React/Next.js連携

### プロバイダー設定

```tsx
// src/app/providers.tsx
"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
```

```tsx
// src/app/layout.tsx
import { ConvexClientProvider } from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
```

### クエリ使用

```tsx
// src/app/tasks/page.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export default function TasksPage() {
  const userId = "user-id" as Id<"users">; // 実際は認証から取得
  const tasks = useQuery(api.tasks.getByUser, { userId });

  if (!tasks) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>My Tasks</h1>
      <ul>
        {tasks.map((task) => (
          <li key={task._id}>
            <input type="checkbox" checked={task.completed} readOnly />
            {task.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### ミューテーション使用

```tsx
// src/app/tasks/create-task.tsx
"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState } from "react";
import { Id } from "../../../convex/_generated/dataModel";

export function CreateTask({ userId }: { userId: Id<"users"> }) {
  const [title, setTitle] = useState("");
  const createTask = useMutation(api.tasks.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTask({
      title,
      userId,
      priority: "medium",
      tags: [],
    });
    setTitle("");
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="New task..."
      />
      <button type="submit">Add Task</button>
    </form>
  );
}
```

### リアルタイム更新

```tsx
// src/app/chat/page.tsx
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState } from "react";

export default function ChatPage() {
  const channelId = "general";
  const messages = useQuery(api.messages.list, { channelId });
  const sendMessage = useMutation(api.messages.send);
  const [text, setText] = useState("");

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage({ channelId, text });
    setText("");
  };

  return (
    <div>
      <div style={{ height: "400px", overflow: "auto" }}>
        {messages?.map((msg) => (
          <div key={msg._id}>
            <strong>{msg.userId}</strong>: {msg.text}
          </div>
        ))}
      </div>
      <form onSubmit={handleSend}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

## 認証（Clerk統合）

### セットアップ

```bash
npm install @clerk/nextjs
npx convex add clerk
```

### Clerk設定

```tsx
// src/app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="ja">
        <body>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

### Convex認証設定

```typescript
// convex/auth.config.ts
export default {
  providers: [
    {
      domain: process.env.CLERK_ISSUER_URL,
      applicationID: "convex",
    },
  ],
};
```

### 認証済みクエリ

```typescript
// convex/tasks.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const myTasks = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    // ユーザーIDでフィルタ
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    return await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});
```

### 認証済みミューテーション

```typescript
// convex/tasks.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createMyTask = mutation({
  args: {
    title: v.string(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      // 新規ユーザー作成
      const userId = await ctx.db.insert("users", {
        name: identity.name ?? "Anonymous",
        email: identity.email ?? "",
        tokenIdentifier: identity.tokenIdentifier,
        createdAt: Date.now(),
      });
      user = { _id: userId };
    }

    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      completed: false,
      userId: user._id,
      priority: args.priority,
      tags: [],
    });

    return taskId;
  },
});
```

## ファイルストレージ

### ファイルアップロード

```typescript
// convex/files.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveFile = mutation({
  args: {
    storageId: v.id("_storage"),
    name: v.string(),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    const fileId = await ctx.db.insert("files", {
      storageId: args.storageId,
      name: args.name,
      type: args.type,
      uploadedAt: Date.now(),
    });
    return fileId;
  },
});
```

### React側実装

```tsx
// src/app/upload/page.tsx
"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState } from "react";

export default function UploadPage() {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveFile = useMutation(api.files.saveFile);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // アップロードURL取得
      const uploadUrl = await generateUploadUrl();

      // ファイルアップロード
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const { storageId } = await result.json();

      // メタデータ保存
      await saveFile({
        storageId,
        name: file.name,
        type: file.type,
      });

      alert("Upload successful!");
    } catch (error) {
      console.error(error);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h1>Upload File</h1>
      <input type="file" onChange={handleUpload} disabled={uploading} />
      {uploading && <p>Uploading...</p>}
    </div>
  );
}
```

## アクション（Actions）

### HTTP API呼び出し

```typescript
// convex/actions.ts
import { action } from "./_generated/server";
import { v } from "convex/values";

export const fetchWeather = action({
  args: { city: v.string() },
  handler: async (ctx, args) => {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${args.city}&appid=${process.env.OPENWEATHER_API_KEY}`
    );
    const data = await response.json();
    return data;
  },
});

// 外部API + DB更新
export const processPayment = action({
  args: {
    userId: v.id("users"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    // Stripe API呼び出し
    const charge = await fetch("https://api.stripe.com/v1/charges", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },
      body: new URLSearchParams({
        amount: args.amount.toString(),
        currency: "usd",
      }),
    });

    const result = await charge.json();

    // DB更新
    await ctx.runMutation("payments.create", {
      userId: args.userId,
      amount: args.amount,
      stripeChargeId: result.id,
    });

    return result;
  },
});
```

## パフォーマンス最適化

### インデックス活用

```typescript
// convex/schema.ts
export default defineSchema({
  tasks: defineTable({
    title: v.string(),
    userId: v.id("users"),
    completed: v.boolean(),
    createdAt: v.number(),
  })
    // 複合インデックス
    .index("by_user_and_status", ["userId", "completed", "createdAt"])
    // 検索インデックス
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["userId"],
    }),
});
```

### ページネーション

```typescript
// convex/tasks.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const paginate = query({
  args: {
    userId: v.id("users"),
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .paginate(args.paginationOpts);
  },
});
```

## デプロイ

### 本番デプロイ

```bash
# 本番環境作成
npx convex deploy

# 環境変数設定
npx convex env set CLERK_ISSUER_URL https://your-clerk-domain.clerk.accounts.dev
```

### Vercelデプロイ

```bash
# Vercelにデプロイ
vercel

# Convex環境変数をVercelに設定
vercel env add NEXT_PUBLIC_CONVEX_URL
```

## まとめ

### Convexのメリット

1. **開発速度**: API設計不要、リアルタイム標準
2. **型安全**: エンドツーエンドTypeScript
3. **スケーラビリティ**: 自動スケーリング、インフラ管理不要
4. **リアルタイム**: WebSocketベースの自動同期
5. **DX**: ホットリロード、優れたエラーメッセージ

### ベストプラクティス

- スキーマ定義を最初に設計
- インデックスを適切に設定
- 認証は必ず実装
- ミューテーションは最小単位で
- リアルタイム更新を活用（不要なpollingを避ける）

### 次のステップ

- 公式ドキュメント: https://docs.convex.dev/
- Discord: コミュニティで質問
- サンプルアプリ: https://github.com/get-convex

Convexで、リアルタイムアプリを爆速開発しましょう。

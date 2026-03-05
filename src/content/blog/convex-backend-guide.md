---
title: "Convex入門：リアクティブバックエンドプラットフォーム完全ガイド"
description: "Convexを使ったリアルタイムバックエンド開発の基本から実践まで、データベース、認証、リアルタイム更新を詳しく解説します。"
pubDate: "2025-02-05"
tags: ['プログラミング']
---

# Convex入門：リアクティブバックエンドプラットフォーム完全ガイド

Convexは、リアルタイムアプリケーション開発を劇的に簡素化する次世代バックエンドプラットフォームです。データベース、API、リアルタイム更新、認証をすべて統合し、TypeScript完全対応で驚くほど簡単に使えます。

## Convexとは

Convexは、フロントエンドとバックエンドの境界を曖昧にする革新的なプラットフォームです。従来のREST APIやGraphQLの複雑さを排除し、TypeScriptの関数を書くだけでバックエンドが完成します。

### 主な特徴

- **リアルタイム**: すべてのクエリが自動でリアクティブ
- **型安全**: TypeScriptで完全な型推論
- **サーバーレス**: インフラ管理不要
- **トランザクショナル**: ACID準拠のデータベース
- **認証統合**: Auth0、Clerk、カスタム認証をサポート
- **ファイルストレージ**: 組み込みのファイル管理
- **スケジューリング**: Cron風のタスクスケジューリング

## セットアップ

新しいConvexプロジェクトを始めましょう。

```bash
# Next.jsプロジェクトを作成
npx create-next-app@latest my-convex-app
cd my-convex-app

# Convexをインストール
npm install convex

# Convexを初期化
npx convex dev
```

これにより、`convex`ディレクトリが作成され、開発サーバーが起動します。

```
my-convex-app/
├── convex/
│   ├── _generated/
│   ├── schema.ts       # データベーススキーマ
│   └── functions.ts    # バックエンド関数
├── src/
│   └── app/
└── package.json
```

## スキーマ定義

`convex/schema.ts`でデータベーススキーマを定義します。

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    age: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_created", ["createdAt"]),

  posts: defineTable({
    title: v.string(),
    content: v.string(),
    authorId: v.id("users"),
    tags: v.array(v.string()),
    published: v.boolean(),
    publishedAt: v.optional(v.number()),
    views: v.number(),
  })
    .index("by_author", ["authorId"])
    .index("by_published", ["published", "publishedAt"]),

  comments: defineTable({
    postId: v.id("posts"),
    userId: v.id("users"),
    content: v.string(),
    createdAt: v.number(),
  })
    .index("by_post", ["postId", "createdAt"])
    .index("by_user", ["userId"]),

  likes: defineTable({
    postId: v.id("posts"),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_post", ["postId"])
    .index("by_user_and_post", ["userId", "postId"]),
});
```

## クエリの作成

`convex/queries.ts`でデータを取得する関数を定義します。

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

// すべてのユーザーを取得
export const getUsers = query({
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

// 特定のユーザーを取得
export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// メールアドレスでユーザーを検索
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

// 公開済み記事を取得（ページネーション付き）
export const getPublishedPosts = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    let query = ctx.db
      .query("posts")
      .withIndex("by_published", (q) =>
        q.eq("published", true)
      )
      .order("desc");

    if (args.cursor) {
      query = query.paginate({ cursor: args.cursor, numItems: limit });
    } else {
      query = query.paginate({ numItems: limit });
    }

    return await query;
  },
});

// 特定の記事とその著者、コメントを取得
export const getPostWithDetails = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) return null;

    const author = await ctx.db.get(post.authorId);

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("asc")
      .collect();

    const commentsWithUsers = await Promise.all(
      comments.map(async (comment) => {
        const user = await ctx.db.get(comment.userId);
        return { ...comment, user };
      })
    );

    const likesCount = await ctx.db
      .query("likes")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect()
      .then((likes) => likes.length);

    return {
      post,
      author,
      comments: commentsWithUsers,
      likesCount,
    };
  },
});

// ユーザーの投稿一覧
export const getUserPosts = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("posts")
      .withIndex("by_author", (q) => q.eq("authorId", args.userId))
      .order("desc")
      .collect();
  },
});

// 検索機能
export const searchPosts = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const posts = await ctx.db
      .query("posts")
      .filter((q) => q.eq(q.field("published"), true))
      .collect();

    // テキスト検索（実装例）
    return posts.filter(
      (post) =>
        post.title.toLowerCase().includes(args.searchTerm.toLowerCase()) ||
        post.content.toLowerCase().includes(args.searchTerm.toLowerCase())
    );
  },
});
```

## ミューテーションの作成

`convex/mutations.ts`でデータを変更する関数を定義します。

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";

// ユーザー作成
export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    age: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 既存ユーザーチェック
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new Error("User with this email already exists");
    }

    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      age: args.age,
      createdAt: Date.now(),
    });

    return userId;
  },
});

// 投稿作成
export const createPost = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    authorId: v.id("users"),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const postId = await ctx.db.insert("posts", {
      title: args.title,
      content: args.content,
      authorId: args.authorId,
      tags: args.tags,
      published: false,
      views: 0,
    });

    return postId;
  },
});

// 投稿を公開
export const publishPost = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    if (post.published) {
      throw new Error("Post is already published");
    }

    await ctx.db.patch(args.postId, {
      published: true,
      publishedAt: Date.now(),
    });

    return { success: true };
  },
});

// 投稿更新
export const updatePost = mutation({
  args: {
    postId: v.id("posts"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { postId, ...updates } = args;

    await ctx.db.patch(postId, updates);

    return { success: true };
  },
});

// コメント追加
export const addComment = mutation({
  args: {
    postId: v.id("posts"),
    userId: v.id("users"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const commentId = await ctx.db.insert("comments", {
      postId: args.postId,
      userId: args.userId,
      content: args.content,
      createdAt: Date.now(),
    });

    return commentId;
  },
});

// いいね追加/削除
export const toggleLike = mutation({
  args: {
    postId: v.id("posts"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("likes")
      .withIndex("by_user_and_post", (q) =>
        q.eq("userId", args.userId).eq("postId", args.postId)
      )
      .first();

    if (existing) {
      // すでにいいね済み → 削除
      await ctx.db.delete(existing._id);
      return { liked: false };
    } else {
      // まだいいねしていない → 追加
      await ctx.db.insert("likes", {
        postId: args.postId,
        userId: args.userId,
        createdAt: Date.now(),
      });
      return { liked: true };
    }
  },
});

// 閲覧数をインクリメント
export const incrementViews = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) return;

    await ctx.db.patch(args.postId, {
      views: post.views + 1,
    });
  },
});

// 投稿削除
export const deletePost = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    // 関連するコメントも削除
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();

    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    // 関連するいいねも削除
    const likes = await ctx.db
      .query("likes")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();

    for (const like of likes) {
      await ctx.db.delete(like._id);
    }

    // 投稿本体を削除
    await ctx.db.delete(args.postId);

    return { success: true };
  },
});
```

## フロントエンドで使用（React）

`src/app/page.tsx`でConvexを使用します。

```typescript
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export default function Home() {
  // クエリ（自動でリアクティブ）
  const posts = useQuery(api.queries.getPublishedPosts, { limit: 10 });

  // ミューテーション
  const createPost = useMutation(api.mutations.createPost);
  const toggleLike = useMutation(api.mutations.toggleLike);

  const handleCreatePost = async () => {
    try {
      await createPost({
        title: "New Post",
        content: "This is a new post",
        authorId: "user123" as Id<"users">,
        tags: ["test", "demo"],
      });
      console.log("Post created!");
    } catch (error) {
      console.error("Error creating post:", error);
    }
  };

  const handleLike = async (postId: Id<"posts">, userId: Id<"users">) => {
    try {
      const result = await toggleLike({ postId, userId });
      console.log(result.liked ? "Liked!" : "Unliked!");
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  if (posts === undefined) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Posts</h1>

      <button
        onClick={handleCreatePost}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        Create New Post
      </button>

      <div className="space-y-4">
        {posts.page.map((post) => (
          <div key={post._id} className="border p-4 rounded">
            <h2 className="text-xl font-semibold">{post.title}</h2>
            <p className="text-gray-600 mt-2">{post.content}</p>
            <div className="flex gap-2 mt-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-gray-200 px-2 py-1 rounded text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
            <button
              onClick={() => handleLike(post._id, "user123" as Id<"users">)}
              className="mt-2 text-blue-500 hover:underline"
            >
              Like
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 認証の統合

Convexは複数の認証プロバイダーをサポートしています。

### Clerkとの統合

```bash
npm install @clerk/clerk-react
```

`convex/auth.config.ts`:

```typescript
export default {
  providers: [
    {
      domain: process.env.CLERK_DOMAIN,
      applicationID: "convex",
    },
  ],
};
```

`src/app/layout.tsx`:

```typescript
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
          <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
            {children}
          </ConvexProviderWithClerk>
        </ClerkProvider>
      </body>
    </html>
  );
}
```

認証済みユーザー情報を使用:

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createMyPost = mutation({
  args: {
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // 認証チェック
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // ユーザーIDを取得
    const userId = identity.subject;

    const postId = await ctx.db.insert("posts", {
      title: args.title,
      content: args.content,
      authorId: userId as any,
      tags: [],
      published: false,
      views: 0,
    });

    return postId;
  },
});
```

## アクション（外部API呼び出し）

アクションを使って外部APIを呼び出せます。

```typescript
import { action } from "./_generated/server";
import { v } from "convex/values";

export const sendEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    // 外部API（例: SendGrid）を呼び出し
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: args.to }] }],
        from: { email: "noreply@example.com" },
        subject: args.subject,
        content: [{ type: "text/plain", value: args.body }],
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to send email");
    }

    return { success: true };
  },
});
```

## スケジューリング

定期実行タスクを設定できます。

```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 毎日午前2時に実行
crons.daily(
  "clear-old-data",
  { hourUTC: 2, minuteUTC: 0 },
  internal.tasks.clearOldData
);

// 1時間ごとに実行
crons.hourly(
  "update-stats",
  { minuteUTC: 0 },
  internal.tasks.updateStatistics
);

export default crons;
```

`convex/tasks.ts`:

```typescript
import { internalMutation } from "./_generated/server";

export const clearOldData = internalMutation({
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const oldComments = await ctx.db
      .query("comments")
      .filter((q) => q.lt(q.field("createdAt"), thirtyDaysAgo))
      .collect();

    for (const comment of oldComments) {
      await ctx.db.delete(comment._id);
    }
  },
});
```

## まとめ

Convexは、リアルタイムアプリケーション開発を革新するプラットフォームです。TypeScriptの関数を書くだけでバックエンドが完成し、データベース、API、認証、リアルタイム更新がすべて統合されています。

従来のバックエンド開発の複雑さから解放され、フロントエンド開発者でも簡単に本格的なアプリケーションを構築できます。

---
title: "Supabase Edge Functions実践ガイド - Deno Runtimeでサーバーレスバックエンドを構築"
description: "Supabase Edge FunctionsをDeno Runtimeで実装する完全ガイド。データベース連携、認証、CORS設定、WebSocket、外部API統合、デプロイ戦略まで実践的に解説します。"
pubDate: "2025-02-05"
tags: ["supabase", "edge-functions", "deno", "serverless", "backend", "typescript"]
---

Supabase Edge Functionsは、Deno Runtimeで動作するサーバーレス関数サービスです。グローバルエッジネットワーク上で実行され、データベースや認証との統合が簡単で、高速なバックエンドAPIを構築できます。

この記事では、Supabase Edge Functionsの基礎から実践的な実装パターン、本番運用のベストプラクティスまで網羅的に解説します。

## Supabase Edge Functionsの特徴

### 他のサーバーレスとの比較

```typescript
// ✅ Supabase Edge Functions
// - Deno Runtime（セキュア、TypeScript標準）
// - グローバルエッジ配信
// - Supabaseデータベース直接アクセス
// - 認証情報自動取得
// - 無料枠: 50万リクエスト/月

// AWS Lambda比較
// - コールドスタート高速（<100ms）
// - 設定がシンプル
// - Supabaseエコシステムとの統合
```

**主な利点:**
- **Deno Runtime**: セキュアで高速、TypeScript/JSX標準対応
- **エッジ配信**: 世界中で低レイテンシー
- **Supabase統合**: データベース、Auth、Storageへ直接アクセス
- **簡単デプロイ**: `supabase functions deploy` 一発
- **ローカル開発**: `supabase start` でDocker環境

## セットアップと基本構造

### プロジェクト初期化

```bash
# Supabase CLI インストール
npm install -g supabase

# プロジェクト初期化
supabase init

# ローカルSupabase起動
supabase start

# Edge Function作成
supabase functions new hello-world
```

### 基本的な関数構造

```typescript
// supabase/functions/hello-world/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { name } = await req.json();

  const data = {
    message: `Hello ${name}!`,
  };

  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  );
});
```

### ローカルテスト

```bash
# 関数をローカルで実行
supabase functions serve hello-world

# 別ターミナルからテスト
curl -i --location --request POST 'http://localhost:54321/functions/v1/hello-world' \
  --header 'Authorization: Bearer eyJhbGc...' \
  --header 'Content-Type: application/json' \
  --data '{"name":"世界"}'
```

### デプロイ

```bash
# プロダクション環境へデプロイ
supabase functions deploy hello-world

# 環境変数付きデプロイ
supabase secrets set OPENAI_API_KEY=sk-...
supabase functions deploy hello-world
```

## データベース連携

### Supabase クライアントの使用

```typescript
// supabase/functions/get-posts/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    // リクエストからSupabaseクライアント作成
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // データベースクエリ
    const { data, error } = await supabaseClient
      .from("posts")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
```

### Row Level Security (RLS) との統合

```typescript
// RLSポリシーがユーザーのJWTトークンに基づいて自動適用される
serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: { Authorization: req.headers.get("Authorization")! },
      },
    }
  );

  // ログインユーザーの投稿のみ取得（RLSで制御）
  const { data: userPosts } = await supabaseClient
    .from("posts")
    .select("*")
    .eq("author_id", req.user.id); // RLSポリシーが適用される

  return new Response(JSON.stringify(userPosts), {
    headers: { "Content-Type": "application/json" },
  });
});
```

### トランザクション処理

```typescript
// supabase/functions/create-order/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const { productId, quantity } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "" // 管理者権限
  );

  try {
    // トランザクション: 在庫チェック→注文作成→在庫減少
    const { data: product, error: fetchError } = await supabase
      .from("products")
      .select("stock")
      .eq("id", productId)
      .single();

    if (fetchError || product.stock < quantity) {
      throw new Error("在庫不足");
    }

    // 注文作成
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        product_id: productId,
        quantity,
        status: "pending",
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 在庫更新
    const { error: updateError } = await supabase
      .from("products")
      .update({ stock: product.stock - quantity })
      .eq("id", productId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify(order), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
});
```

## 認証とセキュリティ

### JWT トークン検証

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return new Response(JSON.stringify({ error: "認証が必要です" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: { Authorization: authHeader },
      },
    }
  );

  // ユーザー情報取得
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response(JSON.stringify({ error: "無効なトークン" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ユーザー情報を使った処理
  const response = {
    message: `こんにちは、${user.email}さん`,
    userId: user.id,
  };

  return new Response(JSON.stringify(response), {
    headers: { "Content-Type": "application/json" },
  });
});
```

### ロールベースアクセス制御

```typescript
// カスタムクレームを使ったロール確認
serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // app_metadataからロール取得
  const userRole = user?.app_metadata?.role;

  if (userRole !== "admin") {
    return new Response(JSON.stringify({ error: "管理者のみアクセス可能" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 管理者向け処理
  const { data } = await supabase
    .from("admin_dashboard")
    .select("*");

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
});
```

### API キー認証（サービス間通信）

```typescript
serve(async (req) => {
  const apiKey = req.headers.get("X-API-Key");

  // 環境変数から正しいAPIキーを取得
  const validApiKey = Deno.env.get("SERVICE_API_KEY");

  if (apiKey !== validApiKey) {
    return new Response(JSON.stringify({ error: "無効なAPIキー" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // サービス間通信の処理
  // ...
});
```

## CORS 設定

### 基本的なCORS対応

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // プリフライトリクエスト対応
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { data } = await req.json();

    // 処理...

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

### 特定オリジンのみ許可

```typescript
const allowedOrigins = [
  "https://example.com",
  "https://app.example.com",
];

serve(async (req) => {
  const origin = req.headers.get("Origin");

  const corsHeaders = allowedOrigins.includes(origin ?? "")
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Headers": "authorization, content-type",
      }
    : {};

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 処理...

  return new Response(JSON.stringify({ data: "..." }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
```

## 外部API統合

### OpenAI API統合例

```typescript
// supabase/functions/ai-chat/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const { message } = await req.json();

  // OpenAI API呼び出し
  const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [{ role: "user", content: message }],
    }),
  });

  const aiData = await openaiResponse.json();
  const reply = aiData.choices[0].message.content;

  // 会話履歴をSupabaseに保存
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  await supabase.from("chat_history").insert({
    user_message: message,
    ai_response: reply,
    created_at: new Date().toISOString(),
  });

  return new Response(JSON.stringify({ reply }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

### Stripe決済統合

```typescript
// supabase/functions/create-checkout/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.0.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
});

serve(async (req) => {
  const { priceId, successUrl, cancelUrl } = await req.json();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

## ストリーミングレスポンス

### Server-Sent Events (SSE)

```typescript
// supabase/functions/stream-data/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      for (let i = 1; i <= 10; i++) {
        const message = `data: ${JSON.stringify({ count: i })}\n\n`;
        controller.enqueue(encoder.encode(message));
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
});
```

### OpenAI ストリーミング

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { prompt } = await req.json();

  const openaiStream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      stream: true,
    }),
  });

  // ストリームをそのまま返す
  return new Response(openaiStream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
});
```

## エラーハンドリングとロギング

### 包括的エラーハンドリング

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

serve(async (req) => {
  try {
    const { userId } = await req.json();

    if (!userId) {
      throw new AppError(400, "userIdが必要です");
    }

    // 処理...

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("エラー発生:", error);

    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof AppError
      ? error.message
      : "内部サーバーエラー";

    return new Response(
      JSON.stringify({ error: message }),
      {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
```

### 構造化ロギング

```typescript
// ロガーユーティリティ
const logger = {
  info: (message: string, meta = {}) => {
    console.log(JSON.stringify({ level: "info", message, ...meta, timestamp: new Date().toISOString() }));
  },
  error: (message: string, error: Error, meta = {}) => {
    console.error(JSON.stringify({
      level: "error",
      message,
      error: error.message,
      stack: error.stack,
      ...meta,
      timestamp: new Date().toISOString(),
    }));
  },
};

serve(async (req) => {
  const requestId = crypto.randomUUID();

  logger.info("リクエスト受信", {
    requestId,
    method: req.method,
    url: req.url,
  });

  try {
    // 処理...

    logger.info("リクエスト成功", { requestId });
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("リクエスト失敗", error, { requestId });
    throw error;
  }
});
```

## パフォーマンス最適化

### レスポンスキャッシュ

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // 5分間キャッシュ
  const response = new Response(JSON.stringify({ data: "..." }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });

  return response;
});
```

### 並列処理

```typescript
serve(async (req) => {
  // 複数のAPI呼び出しを並列実行
  const [userData, postsData, statsData] = await Promise.all([
    supabase.from("users").select("*").eq("id", userId).single(),
    supabase.from("posts").select("*").eq("author_id", userId),
    supabase.rpc("get_user_stats", { user_id: userId }),
  ]);

  return new Response(
    JSON.stringify({
      user: userData.data,
      posts: postsData.data,
      stats: statsData.data,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
```

## まとめ

Supabase Edge Functionsは以下のシナリオで特に優れています:

**最適なユースケース:**
- Supabase使用プロジェクトのバックエンドAPI
- 認証が必要なサーバーサイド処理
- 外部API統合（OpenAI、Stripe等）
- Webhookエンドポイント
- データベーストリガー後処理
- 画像処理・変換
- リアルタイムストリーミング

**ベストプラクティス:**
- 環境変数で機密情報を管理
- RLSポリシーと組み合わせてセキュリティ強化
- CORS設定を適切に行う
- エラーハンドリングと構造化ロギング
- Deno標準ライブラリを活用
- ローカル開発で十分テスト

Supabase Edge Functionsにより、フルスタックアプリケーションをSupabaseエコシステム内で完結させることができ、インフラ管理の負担を大幅に削減できます。

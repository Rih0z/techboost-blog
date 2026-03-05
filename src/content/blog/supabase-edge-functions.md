---
title: "Supabase Edge Functionsで始めるサーバーレス開発"
description: "Supabase Edge Functionsを使用して、グローバルに高速でスケーラブルなサーバーレス関数を構築する方法を詳しく解説します。"
pubDate: "2025-02-05"
tags: ['インフラ']
---

Supabaseは、Firebase代替のオープンソースBaaS（Backend as a Service）として急速に人気を集めています。その中でも特に注目されているのが **Supabase Edge Functions** です。これは、Deno Deployをベースにしたサーバーレス関数実行環境で、グローバルに分散されたエッジロケーションでコードを実行できます。

本記事では、Supabase Edge Functionsの特徴、セットアップ方法、実用例、ベストプラクティスについて詳しく解説します。

## Supabase Edge Functionsとは

Supabase Edge Functionsは、Denoランタイムで動作するサーバーレス関数です。世界中のエッジロケーションで実行されるため、低レイテンシーでグローバルなアプリケーションを構築できます。

### 主な特徴

- **グローバル分散**: 世界中のエッジロケーションで実行
- **Denoランタイム**: TypeScriptネイティブサポート、セキュアな実行環境
- **Supabase統合**: データベース、認証、ストレージと簡単に連携
- **無料枠**: 月50万リクエストまで無料
- **低コールドスタート**: 高速な起動時間
- **Web標準API**: Fetch API、Web Streams、Web Cryptoなど

## セットアップ

### 前提条件

- Node.js 18以上
- Supabaseアカウント
- Supabase CLI

### Supabase CLIのインストール

```bash
# npmでインストール
npm install -g supabase

# Homebrewでインストール（macOS/Linux）
brew install supabase/tap/supabase

# 確認
supabase --version
```

### プロジェクトの初期化

```bash
# 新しいディレクトリを作成
mkdir my-supabase-project
cd my-supabase-project

# Supabaseプロジェクトを初期化
supabase init

# ローカル開発環境を起動
supabase start
```

### Edge Functionの作成

```bash
# 新しいEdge Functionを作成
supabase functions new hello-world
```

これにより、`supabase/functions/hello-world/index.ts` ファイルが作成されます。

## 基本的なEdge Function

### Hello World

```typescript
// supabase/functions/hello-world/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { name } = await req.json();

  const data = {
    message: `Hello ${name || 'World'}!`,
  };

  return new Response(
    JSON.stringify(data),
    {
      headers: { "Content-Type": "application/json" },
      status: 200,
    },
  );
});
```

### ローカルでのテスト

```bash
# Edge Functionをローカルで実行
supabase functions serve hello-world

# 別のターミナルでテスト
curl -X POST http://localhost:54321/functions/v1/hello-world \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice"}'
```

### デプロイ

```bash
# Supabaseにログイン
supabase login

# プロジェクトをリンク
supabase link --project-ref <your-project-ref>

# デプロイ
supabase functions deploy hello-world
```

## Supabaseクライアントの使用

Edge Functions内でSupabaseデータベースやサービスにアクセスできます。

### データベース操作

```typescript
// supabase/functions/get-users/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ユーザー一覧を取得
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .limit(10);

    if (error) throw error;

    return new Response(
      JSON.stringify({ users }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
```

### 認証の統合

```typescript
// supabase/functions/protected-route/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // リクエストからJWTトークンを取得
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Missing authorization header' }),
      { status: 401 },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  });

  // ユーザー認証を確認
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401 },
    );
  }

  // 認証済みユーザーのデータを返す
  return new Response(
    JSON.stringify({
      message: 'Protected data',
      user: {
        id: user.id,
        email: user.email,
      },
    }),
    {
      headers: { "Content-Type": "application/json" },
      status: 200,
    },
  );
});
```

## 実践例

### 1. 画像リサイズAPI

```typescript
// supabase/functions/resize-image/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";

serve(async (req) => {
  try {
    const { imageUrl, width, height } = await req.json();

    // 画像を取得
    const response = await fetch(imageUrl);
    const imageBuffer = await response.arrayBuffer();

    // 画像をリサイズ
    const image = await Image.decode(new Uint8Array(imageBuffer));
    const resized = image.resize(width, height);
    const encoded = await resized.encodeJPEG(80);

    // Supabase Storageに保存
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const fileName = `resized-${Date.now()}.jpg`;
    const { data, error } = await supabase.storage
      .from('images')
      .upload(fileName, encoded, {
        contentType: 'image/jpeg',
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(fileName);

    return new Response(
      JSON.stringify({ url: publicUrl }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 },
    );
  }
});
```

### 2. Stripe Webhookハンドラ

```typescript
// supabase/functions/stripe-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.10.0?target=deno";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response('Missing signature', { status: 400 });
  }

  try {
    const body = await req.text();

    // Webhookイベントを検証
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // イベントタイプに応じて処理
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        // データベースを更新
        await supabase
          .from('subscriptions')
          .insert({
            user_id: session.client_reference_id,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            status: 'active',
          });

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;

        // サブスクリプションをキャンセル
        await supabase
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('stripe_subscription_id', subscription.id);

        break;
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200 },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400 },
    );
  }
});
```

### 3. メール送信API

```typescript
// supabase/functions/send-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

serve(async (req) => {
  try {
    const { to, subject, html } = await req.json();

    // Resend APIを使用してメール送信
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'noreply@yourdomain.com',
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 },
    );
  }
});
```

### 4. OpenAI統合

```typescript
// supabase/functions/ai-chat/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

serve(async (req) => {
  try {
    const { message, userId } = await req.json();

    // OpenAI APIを呼び出し
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant.',
          },
          {
            role: 'user',
            content: message,
          },
        ],
      }),
    });

    const data = await response.json();
    const reply = data.choices[0].message.content;

    // 会話履歴を保存
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    await supabase.from('chat_history').insert({
      user_id: userId,
      message,
      reply,
    });

    return new Response(
      JSON.stringify({ reply }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 },
    );
  }
});
```

## CORS設定

Edge Functionsでは、CORSヘッダーを手動で設定する必要があります。

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // プリフライトリクエストへの対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // メイン処理
    const data = { message: 'Hello' };

    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
```

## 環境変数の管理

```bash
# ローカル環境変数の設定
supabase secrets set MY_SECRET_KEY=your-secret-value --env-file .env.local

# 本番環境への設定
supabase secrets set MY_SECRET_KEY=your-secret-value
```

`.env.local` ファイル:

```
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_test_...
RESEND_API_KEY=re_...
```

## クライアントからの呼び出し

### JavaScriptクライアント

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
);

// Edge Functionを呼び出し
const { data, error } = await supabase.functions.invoke('hello-world', {
  body: { name: 'Alice' },
});

if (error) {
  console.error('Error:', error);
} else {
  console.log('Response:', data);
}
```

### 認証付きリクエスト

```typescript
// ユーザーがログインしている場合、自動的にJWTトークンが送信される
const { data, error } = await supabase.functions.invoke('protected-route');
```

## ベストプラクティス

### 1. エラーハンドリング

```typescript
serve(async (req) => {
  try {
    // メイン処理
    const result = await performOperation();

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200 },
    );
  } catch (error) {
    console.error('Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      { status: 500 },
    );
  }
});
```

### 2. タイムアウト設定

```typescript
// タイムアウト付きのfetch
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

try {
  const response = await fetch(url, {
    signal: controller.signal,
  });
  clearTimeout(timeoutId);
} catch (error) {
  if (error.name === 'AbortError') {
    // タイムアウト処理
  }
}
```

### 3. パフォーマンス最適化

```typescript
// 並列処理
const [users, posts, comments] = await Promise.all([
  supabase.from('users').select('*'),
  supabase.from('posts').select('*'),
  supabase.from('comments').select('*'),
]);

// キャッシング
const cacheKey = `user-${userId}`;
const cached = await kv.get(cacheKey);

if (cached) {
  return new Response(JSON.stringify(cached), { status: 200 });
}

const data = await fetchUserData(userId);
await kv.set(cacheKey, data, { ex: 3600 }); // 1時間キャッシュ
```

## まとめ

Supabase Edge Functionsは、グローバルに分散されたサーバーレス関数を簡単に構築できる強力なツールです。Denoランタイムによる高速な実行、TypeScriptネイティブサポート、Supabaseエコシステムとのシームレスな統合により、モダンなバックエンド開発を効率化できます。

**主な利点**:
- グローバルエッジでの低レイテンシー実行
- TypeScriptネイティブサポート
- Supabaseとの統合が容易
- 無料枠が充実

**注意点**:
- Deno特有の制約（Node.jsモジュールの一部が未対応）
- コールドスタートの可能性
- 実行時間の制限

Supabase Edge Functionsを活用して、スケーラブルで高速なアプリケーションを構築してみてください。

## 参考リンク

- [Supabase Edge Functions公式ドキュメント](https://supabase.com/docs/guides/functions)
- [Deno公式サイト](https://deno.land/)
- [Supabase Examples](https://github.com/supabase/supabase/tree/master/examples/edge-functions)

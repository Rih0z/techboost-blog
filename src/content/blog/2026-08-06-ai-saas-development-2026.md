---
title: "AI SaaSプロダクト開発ガイド2026【LLMを活用したWebサービス構築】"
description: "LLMを組み込んだAI SaaSプロダクトの開発手法を解説。アーキテクチャ設計、Next.js実装、課金システム統合、コスト管理、スケーリングまでTypeScript・Pythonコード付きで実践的に紹介します。"
pubDate: "2026-03-13"
tags: ["AI", "SaaS", "LLM", "Next.js", "プロダクト開発"]
heroImage: '../../assets/thumbnails/ai-agent-development-2026.jpg'
---

## はじめに

「AIを使ったWebサービスを作りたい」と考えるエンジニアが急増している。LLM APIの民主化により、個人開発者でもAI SaaSプロダクトを構築できる時代になった。

しかし、プロトタイプを作ることと、収益を上げるプロダクトを運用することは全く別の話だ。API呼び出しコスト管理、ユーザー認証、課金、スケーリング ── AI SaaS特有の課題は多い。

この記事では、LLMを組み込んだSaaSプロダクトの設計・実装・運用までを体系的に解説する。

---

## 1. AI SaaS アーキテクチャ設計

### 1.1 全体構成

```
┌──────────────────────────────────────────────────────┐
│                    フロントエンド                       │
│              Next.js (App Router)                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐   │
│  │ Dashboard │  │ Chat UI  │  │ Settings / Billing │  │
│  └──────────┘  └──────────┘  └───────────────────┘   │
└──────────────────┬───────────────────────────────────┘
                   │ tRPC / API Routes
┌──────────────────▼───────────────────────────────────┐
│                    バックエンド                         │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐   │
│  │ Auth     │  │ AI       │  │ Billing            │   │
│  │ (NextAuth)│  │ Service  │  │ (Stripe)           │   │
│  └──────────┘  └──────────┘  └───────────────────┘   │
│                    │                                   │
│  ┌─────────────────▼──────────────────────────────┐   │
│  │            LLM Gateway                         │   │
│  │  ┌────────┐  ┌────────┐  ┌──────────────────┐  │   │
│  │  │ OpenAI │  │ Claude │  │ Rate Limiter     │  │   │
│  │  └────────┘  └────────┘  │ + Cost Tracker   │  │   │
│  │                          └──────────────────┘  │   │
│  └────────────────────────────────────────────────┘   │
│                    │                                   │
│  ┌─────────────────▼──────────────────────────────┐   │
│  │  Database (PostgreSQL) + Redis (Cache/Queue)    │   │
│  └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### 1.2 技術スタック推奨

| レイヤー | 推奨技術 | 理由 |
|---------|---------|------|
| フロントエンド | Next.js 15 (App Router) | SSR/RSC対応、フルスタック |
| 認証 | NextAuth.js v5 / Clerk | OAuth対応、セッション管理 |
| データベース | PostgreSQL + Prisma | スキーマ管理、型安全 |
| キャッシュ | Redis (Upstash) | API応答キャッシュ、キュー |
| 課金 | Stripe | サブスク・従量課金 |
| LLM | OpenAI / Anthropic | 品質・安定性 |
| デプロイ | Vercel / Railway | ゼロ運用 |
| モニタリング | Sentry + PostHog | エラー追跡 + 利用分析 |

---

## 2. プロジェクトセットアップ

### 2.1 初期構築

```bash
# Next.js プロジェクト作成
npx create-next-app@latest ai-saas \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir

cd ai-saas

# 依存関係インストール
npm install openai @anthropic-ai/sdk    # LLM SDK
npm install @prisma/client prisma       # ORM
npm install next-auth@beta              # 認証
npm install stripe @stripe/stripe-js    # 決済
npm install @upstash/redis @upstash/ratelimit  # レート制限
npm install zod                         # バリデーション
npm install ai                          # Vercel AI SDK（ストリーミング）

# Prisma 初期化
npx prisma init --datasource-provider postgresql
```

### 2.2 データベーススキーマ

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  plan          Plan      @default(FREE)
  stripeId      String?   @unique
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  conversations Conversation[]
  usage         Usage[]
}

model Conversation {
  id        String    @id @default(cuid())
  title     String?
  userId    String
  user      User      @relation(fields: [userId], references: [id])
  messages  Message[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Message {
  id             String       @id @default(cuid())
  role           MessageRole
  content        String       @db.Text
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id])
  tokenCount     Int          @default(0)
  model          String?
  createdAt      DateTime     @default(now())
}

model Usage {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  date        DateTime @default(now()) @db.Date
  inputTokens Int      @default(0)
  outputTokens Int     @default(0)
  requests    Int      @default(0)
  costUsd     Float    @default(0)

  @@unique([userId, date])
}

enum Plan {
  FREE
  PRO
  ENTERPRISE
}

enum MessageRole {
  system
  user
  assistant
}
```

```bash
# マイグレーション実行
npx prisma migrate dev --name init
npx prisma generate
```

---

## 3. 認証システム

### 3.1 NextAuth.js v5 設定

```typescript
// src/auth.ts
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // プラン情報をセッションに追加
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { plan: true },
        });
        (session.user as any).plan = dbUser?.plan ?? 'FREE';
      }
      return session;
    },
  },
});
```

### 3.2 認証ミドルウェア

```typescript
// src/middleware.ts
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isApiRoute = req.nextUrl.pathname.startsWith('/api');
  const isAuthRoute = req.nextUrl.pathname.startsWith('/auth');
  const isPublicRoute = ['/', '/pricing', '/blog'].some((p) =>
    req.nextUrl.pathname.startsWith(p)
  );

  if (isPublicRoute || isAuthRoute) return NextResponse.next();

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

## 4. AIチャット機能の実装

### 4.1 LLMゲートウェイ

```typescript
// src/lib/llm-gateway.ts
import OpenAI from 'openai';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { prisma } from './prisma';

const openai = new OpenAI();

// レート制限設定
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 1分に10リクエスト
  analytics: true,
});

// プラン別制限
const PLAN_LIMITS = {
  FREE: { maxTokensPerDay: 10_000, maxRequestsPerMin: 5, model: 'gpt-4o-mini' },
  PRO: { maxTokensPerDay: 500_000, maxRequestsPerMin: 30, model: 'gpt-4o' },
  ENTERPRISE: { maxTokensPerDay: 5_000_000, maxRequestsPerMin: 100, model: 'gpt-4o' },
} as const;

interface ChatRequest {
  userId: string;
  plan: keyof typeof PLAN_LIMITS;
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  conversationId: string;
}

export async function processChatRequest(req: ChatRequest) {
  const limits = PLAN_LIMITS[req.plan];

  // 1. レート制限チェック
  const { success } = await ratelimit.limit(req.userId);
  if (!success) {
    throw new Error('レート制限に達しました。しばらくお待ちください。');
  }

  // 2. 日次使用量チェック
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dailyUsage = await prisma.usage.findUnique({
    where: {
      userId_date: {
        userId: req.userId,
        date: today,
      },
    },
  });

  const totalTokensToday = (dailyUsage?.inputTokens ?? 0) + (dailyUsage?.outputTokens ?? 0);
  if (totalTokensToday >= limits.maxTokensPerDay) {
    throw new Error(`本日の使用量上限（${limits.maxTokensPerDay.toLocaleString()}トークン）に達しました。`);
  }

  // 3. LLM API呼び出し
  const response = await openai.chat.completions.create({
    model: limits.model,
    messages: req.messages,
    max_tokens: 2048,
    stream: true,
  });

  return response;
}

// 使用量記録
export async function recordUsage(
  userId: string,
  inputTokens: number,
  outputTokens: number,
  model: string
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 料金計算
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 2.5, output: 10.0 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
  };
  const p = pricing[model] ?? pricing['gpt-4o-mini'];
  const cost =
    (inputTokens / 1_000_000) * p.input +
    (outputTokens / 1_000_000) * p.output;

  await prisma.usage.upsert({
    where: { userId_date: { userId, date: today } },
    update: {
      inputTokens: { increment: inputTokens },
      outputTokens: { increment: outputTokens },
      requests: { increment: 1 },
      costUsd: { increment: cost },
    },
    create: {
      userId,
      date: today,
      inputTokens,
      outputTokens,
      requests: 1,
      costUsd: cost,
    },
  });
}
```

### 4.2 ストリーミング API Route

```typescript
// src/app/api/chat/route.ts
import { auth } from '@/auth';
import { processChatRequest, recordUsage } from '@/lib/llm-gateway';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const ChatRequestSchema = z.object({
  message: z.string().min(1).max(10000),
  conversationId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  // 認証チェック
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // リクエストバリデーション
  const body = await req.json();
  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  const { message, conversationId } = parsed.data;
  const userId = session.user.id;
  const plan = (session.user as any).plan ?? 'FREE';

  try {
    // 会話の取得/作成
    let convId = conversationId;
    if (!convId) {
      const conv = await prisma.conversation.create({
        data: {
          userId,
          title: message.slice(0, 50),
        },
      });
      convId = conv.id;
    }

    // ユーザーメッセージを保存
    await prisma.message.create({
      data: {
        role: 'user',
        content: message,
        conversationId: convId,
      },
    });

    // 過去のメッセージを取得
    const history = await prisma.message.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: 'asc' },
      take: 20, // 最新20メッセージ
    });

    const messages = history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // LLM API呼び出し（ストリーミング）
    const stream = await processChatRequest({
      userId,
      plan,
      messages: [
        { role: 'system', content: 'あなたは親切なAIアシスタントです。' },
        ...messages,
      ],
      conversationId: convId,
    });

    // ストリーミングレスポンス
    const encoder = new TextEncoder();
    let fullContent = '';
    let totalTokens = { input: 0, output: 0 };

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              fullContent += content;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: content, conversationId: convId })}\n\n`)
              );
            }

            // 使用量を取得
            if (chunk.usage) {
              totalTokens.input = chunk.usage.prompt_tokens ?? 0;
              totalTokens.output = chunk.usage.completion_tokens ?? 0;
            }
          }

          // アシスタントメッセージを保存
          await prisma.message.create({
            data: {
              role: 'assistant',
              content: fullContent,
              conversationId: convId!,
              tokenCount: totalTokens.output,
              model: plan === 'FREE' ? 'gpt-4o-mini' : 'gpt-4o',
            },
          });

          // 使用量を記録
          await recordUsage(
            userId,
            totalTokens.input,
            totalTokens.output,
            plan === 'FREE' ? 'gpt-4o-mini' : 'gpt-4o'
          );

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (error) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return Response.json({ error: message }, { status: 429 });
  }
}
```

### 4.3 フロントエンド Chat UI

```typescript
// src/components/ChatInterface.tsx
'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API Error');
      }

      // SSE ストリーミング処理
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((line) => line.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              assistantContent += parsed.text;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: assistantContent,
                };
                return updated;
              });
            }
            if (parsed.conversationId) {
              setConversationId(parsed.conversationId);
            }
          } catch {
            // パースエラーは無視
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '通信エラー';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `エラー: ${errorMessage}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] border rounded-lg">
      {/* メッセージ表示エリア */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="メッセージを入力..."
            className="flex-1 border rounded-lg px-4 py-2"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg disabled:opacity-50"
          >
            {isLoading ? '...' : '送信'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 5. 課金システム（Stripe統合）

### 5.1 プラン定義と Webhook

```typescript
// src/lib/stripe.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export const PLANS = {
  FREE: { name: 'Free', price: 0, stripePriceId: null },
  PRO: { name: 'Pro', price: 2980, stripePriceId: 'price_xxxxx' },
  ENTERPRISE: { name: 'Enterprise', price: 9800, stripePriceId: 'price_yyyyy' },
} as const;
```

```typescript
// src/app/api/webhooks/stripe/route.ts
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            plan: 'PRO',
            stripeId: session.customer as string,
          },
        });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const user = await prisma.user.findFirst({
        where: { stripeId: subscription.customer as string },
      });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { plan: 'FREE' },
        });
      }
      break;
    }
  }

  return Response.json({ received: true });
}
```

---

## 6. コスト管理と最適化

### 6.1 コストモニタリング

```typescript
// src/lib/cost-monitor.ts

export async function getDailyCostReport(userId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const usage = await prisma.usage.findMany({
    where: {
      userId,
      date: { gte: thirtyDaysAgo },
    },
    orderBy: { date: 'asc' },
  });

  const totalCost = usage.reduce((sum, u) => sum + u.costUsd, 0);
  const totalRequests = usage.reduce((sum, u) => sum + u.requests, 0);
  const totalTokens = usage.reduce(
    (sum, u) => sum + u.inputTokens + u.outputTokens,
    0
  );

  return {
    period: '30日間',
    totalCostUsd: totalCost.toFixed(4),
    totalRequests,
    totalTokens,
    avgCostPerRequest: totalRequests > 0
      ? (totalCost / totalRequests).toFixed(6)
      : '0',
    dailyBreakdown: usage.map((u) => ({
      date: u.date.toISOString().split('T')[0],
      cost: u.costUsd.toFixed(4),
      requests: u.requests,
    })),
  };
}
```

### 6.2 コスト最適化戦略

```typescript
// src/lib/cost-optimizer.ts

// 1. プロンプトキャッシュ
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

async function cachedLLMCall(
  prompt: string,
  model: string,
  ttlSeconds: number = 3600
): Promise<string> {
  const cacheKey = `llm:${model}:${hashPrompt(prompt)}`;

  // キャッシュ確認
  const cached = await redis.get<string>(cacheKey);
  if (cached) return cached;

  // API呼び出し
  const response = await callLLM(prompt, model);

  // キャッシュ保存
  await redis.set(cacheKey, response, { ex: ttlSeconds });

  return response;
}

// 2. モデルルーティング
function selectModel(plan: string, taskType: string): string {
  if (plan === 'FREE') return 'gpt-4o-mini';

  switch (taskType) {
    case 'simple_qa':      return 'gpt-4o-mini';     // 簡単なQ&A
    case 'summarization':  return 'gpt-4o-mini';     // 要約
    case 'code_generation': return 'gpt-4o';         // コード生成
    case 'analysis':       return 'gpt-4o';          // 分析
    default:               return 'gpt-4o-mini';
  }
}

// 3. プロンプト圧縮
function compressHistory(
  messages: { role: string; content: string }[],
  maxTokens: number = 4000
): { role: string; content: string }[] {
  // 最新のN件を保持し、古いメッセージは要約する
  if (messages.length <= 6) return messages;

  const recent = messages.slice(-6);
  const older = messages.slice(0, -6);

  const summary = `[過去の会話要約: ${older.map((m) => m.content.slice(0, 50)).join(' / ')}]`;

  return [
    { role: 'system', content: summary },
    ...recent,
  ];
}
```

---

## 7. スケーリングと監視

### 7.1 キューベース処理

```python
# worker.py
# 重い処理はバックグラウンドキューで処理
from celery import Celery
import openai

app = Celery("ai_worker", broker="redis://localhost:6379")

@app.task(bind=True, max_retries=3, default_retry_delay=60)
def process_document(self, user_id: str, document_id: str, task_type: str):
    """文書処理の非同期タスク"""
    try:
        client = openai.OpenAI()

        # 文書を取得
        document = get_document(document_id)

        # LLM処理
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": f"以下の文書を{task_type}してください。"},
                {"role": "user", "content": document.content},
            ],
        )

        # 結果を保存
        save_result(document_id, response.choices[0].message.content)

        # 使用量記録
        record_usage(
            user_id,
            response.usage.prompt_tokens,
            response.usage.completion_tokens,
        )

    except openai.RateLimitError as e:
        self.retry(exc=e, countdown=120)
    except Exception as e:
        self.retry(exc=e)
```

### 7.2 モニタリングダッシュボード

```typescript
// src/app/api/admin/metrics/route.ts

export async function GET() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [totalUsers, activeUsers, dailyUsage, totalRevenue] = await Promise.all([
    prisma.user.count(),
    prisma.usage.groupBy({
      by: ['userId'],
      where: { date: { gte: oneDayAgo } },
    }),
    prisma.usage.aggregate({
      where: { date: { gte: oneDayAgo } },
      _sum: { costUsd: true, requests: true, inputTokens: true, outputTokens: true },
    }),
    prisma.user.count({ where: { plan: { not: 'FREE' } } }),
  ]);

  return Response.json({
    totalUsers,
    activeUsersToday: activeUsers.length,
    todayApiCostUsd: dailyUsage._sum.costUsd ?? 0,
    todayRequests: dailyUsage._sum.requests ?? 0,
    todayTokens: (dailyUsage._sum.inputTokens ?? 0) + (dailyUsage._sum.outputTokens ?? 0),
    paidUsers: totalRevenue,
    grossMargin: calculateGrossMargin(totalRevenue, dailyUsage._sum.costUsd ?? 0),
  });
}
```

---

## 8. 収益化のポイント

### 8.1 価格設定の考え方

```
┌──────────────────────────────────────────────────┐
│              AI SaaS 価格設定フレームワーク        │
├──────────┬─────────┬───────────┬─────────────────┤
│ プラン   │ 月額     │ 原価/ユーザー│ 粗利率        │
├──────────┼─────────┼───────────┼─────────────────┤
│ Free     │ ¥0      │ ~¥50      │ -100%（集客用） │
│ Pro      │ ¥2,980  │ ~¥300     │ ~90%           │
│ Enterprise│ ¥9,800 │ ~¥1,000   │ ~90%           │
└──────────┴─────────┴───────────┴─────────────────┘

粗利率90%を目標に:
- Free: 日次1万トークンまで（原価 ~¥2/日）
- Pro: 日次50万トークン（原価 ~¥10/日）
- Enterprise: 日次500万トークン（原価 ~¥100/日）
```

### 8.2 フリーミアム転換率の改善

```typescript
// src/lib/conversion.ts

// 無料ユーザーへのアップグレード促進
function shouldShowUpgradePrompt(usage: DailyUsage): boolean {
  const usagePercent = usage.requests / FREE_DAILY_LIMIT;

  // 制限の80%に達したら表示
  if (usagePercent >= 0.8) return true;

  // 高度な機能を使おうとした場合
  if (usage.attemptedProFeature) return true;

  return false;
}
```

---

## 9. まとめ

AI SaaSプロダクト開発の成功要因をまとめる。

1. **MVPは2週間で出す** ── 最小限の機能（チャット + 認証 + 使用量制限）で公開し、ユーザーフィードバックを得る
2. **コスト管理は初日から** ── APIコストの可視化、モデルルーティング、キャッシュを最初から組み込む
3. **フリーミアムで集客** ── 無料プランで十分な価値を提供し、パワーユーザーを有料プランに転換
4. **差別化はドメイン特化** ── 汎用チャットボットではなく、特定業界・ユースケースに特化する

---

## 関連記事

- [LLM APIアプリ開発入門2026](/blog/2026-08-01-llm-api-development-guide-2026)
- [AIエージェント開発入門2026](/blog/2026-08-03-ai-agent-development-2026)
- [AI/LLMアプリのテスト・評価手法](/blog/2026-08-09-ai-testing-evaluation-2026)
- [AIコーディングツール完全ガイド](/blog/ai-coding-tools-guide)

---

## FAQ

### Q. 個人開発でもAI SaaSは収益化できる？

A. 可能。月額¥2,980で100人の有料ユーザーを獲得すれば月30万円。APIコストを90%以上の粗利率で抑えれば、十分な利益が出る。ニッチな領域（法務AI、医療文書要約など）ほど参入障壁が高く、単価も上げやすい。

### Q. APIコストが心配。赤字にならない？

A. フリーミアムモデルでは無料ユーザーのコストを有料ユーザーの利益でカバーする。無料枠を日次1万トークン（原価約¥2）に制限すれば、1000人の無料ユーザーでも月¥60,000程度。Pro会員20人で賄える。

### Q. セキュリティで注意すべき点は？

A. ユーザーデータがLLMに送信される点を明示（プライバシーポリシー）。APIキーのサーバーサイド管理。プロンプトインジェクション対策。SOC 2準拠が企業向けには求められる場合がある。

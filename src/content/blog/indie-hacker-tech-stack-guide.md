---
title: 'インディーハッカーの技術スタック2026 - 一人開発で月100万円稼ぐ構成'
description: 'インディーハッカー向け技術スタック完全ガイド。Next.js + Supabase + Stripe + Vercelの構成で、一人で月100万円を稼ぐSaaS開発の実践手法を解説。インディーハッカー・SaaS・Next.jsに関する実践情報。'
pubDate: 'Feb 05 2026'
tags: ['インディーハッカー', 'SaaS', 'Next.js', 'プログラミング']
---
# インディーハッカーの技術スタック2026

一人でSaaSを開発し、月100万円の収益を目指す。そんなインディーハッカーのための実践的な技術スタックを紹介します。本記事では、コストを抑えながら素早く開発・リリースし、スケールさせるための技術選定とその理由を解説します。

## 目次

1. なぜこのスタックなのか
2. コア技術スタック
3. プロジェクト構成
4. 認証システムの実装
5. データベース設計
6. 決済システムの統合
7. メール送信
8. デプロイとCI/CD
9. モニタリングとアナリティクス
10. コスト試算

## 1. なぜこのスタックなのか

### 選定基準

- **無料枠が充実**: 初期コストゼロで始められる
- **一人で完結**: フロントからバックエンド、インフラまで一人で管理可能
- **素早い開発**: ボイラープレートが少なく、ビジネスロジックに集中できる
- **スケーラビリティ**: 収益が伸びても対応できる
- **エコシステム**: 豊富なライブラリとコミュニティサポート

### 選んだ技術

- **フロントエンド**: Next.js 15 (App Router)
- **スタイリング**: Tailwind CSS + shadcn/ui
- **バックエンド**: Next.js API Routes / Server Actions
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth
- **決済**: Stripe
- **メール**: Resend
- **ホスティング**: Vercel
- **ドメイン**: Cloudflare

## 2. コア技術スタック

### プロジェクトのセットアップ

```bash
# Next.jsプロジェクトの作成
npx create-next-app@latest my-saas --typescript --tailwind --app

cd my-saas

# 必要なパッケージのインストール
npm install @supabase/supabase-js @supabase/ssr
npm install stripe @stripe/stripe-js
npm install resend react-email
npm install zod react-hook-form @hookform/resolvers
npm install lucide-react
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
```

### 環境変数の設定

```env
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret

# Resend
RESEND_API_KEY=your-resend-api-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 3. プロジェクト構成

```
my-saas/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── signup/
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── settings/
│   │   └── layout.tsx
│   ├── api/
│   │   ├── webhooks/
│   │   │   └── stripe/
│   │   └── stripe/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   ├── auth/
│   ├── dashboard/
│   └── marketing/
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── stripe/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── email/
│   └── utils.ts
├── types/
│   ├── database.ts
│   └── index.ts
└── middleware.ts
```

## 4. 認証システムの実装

### Supabaseクライアントの設定

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

```typescript
// lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}
```

### ミドルウェアでの認証チェック

```typescript
// middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // 認証が必要なページ
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // ログイン済みユーザーが認証ページにアクセス
  if (request.nextUrl.pathname.startsWith('/login') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup'],
};
```

### ログイン/サインアップコンポーネント

```typescript
// app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      router.push('/dashboard');
      router.refresh();
    }

    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 p-8">
        <h1 className="text-3xl font-bold text-center">ログイン</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'ログイン中...' : 'ログイン'}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              または
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleLogin}
        >
          Googleでログイン
        </Button>
      </div>
    </div>
  );
}
```

## 5. データベース設計

### Supabaseのテーブル定義

```sql
-- ユーザープロファイル
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  stripe_customer_id text unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- サブスクリプション
create table subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  stripe_subscription_id text unique not null,
  stripe_price_id text not null,
  status text not null,
  current_period_start timestamp with time zone not null,
  current_period_end timestamp with time zone not null,
  cancel_at_period_end boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- プロジェクト（SaaSの主要機能）
create table projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  description text,
  settings jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS)
alter table profiles enable row level security;
alter table subscriptions enable row level security;
alter table projects enable row level security;

-- ポリシー
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Users can view own subscriptions"
  on subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can view own projects"
  on projects for select
  using (auth.uid() = user_id);

create policy "Users can create own projects"
  on projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on projects for update
  using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on projects for delete
  using (auth.uid() = user_id);
```

### TypeScript型の生成

```bash
# Supabaseの型を自動生成
npx supabase gen types typescript --project-id your-project-id > types/database.ts
```

```typescript
// types/index.ts
import { Database } from './database';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type Project = Database['public']['Tables']['projects']['Row'];

export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'trialing'
  | 'unpaid';
```

## 6. 決済システムの統合

### Stripeの設定

```typescript
// lib/stripe/server.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

// 価格設定
export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    priceId: null,
    features: [
      'プロジェクト3個まで',
      '基本機能',
      'コミュニティサポート',
    ],
  },
  pro: {
    name: 'Pro',
    price: 1980,
    priceId: process.env.STRIPE_PRICE_ID_PRO!,
    features: [
      'プロジェクト無制限',
      '全機能利用可能',
      '優先サポート',
      'API アクセス',
    ],
  },
} as const;
```

### チェックアウトセッションの作成

```typescript
// app/api/stripe/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, PLANS } from '@/lib/stripe/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ユーザープロファイルの取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    // Stripeカスタマーの取得または作成
    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          supabase_user_id: user.id,
        },
      });

      customerId = customer.id;

      // DBに保存
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // チェックアウトセッションの作成
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: PLANS.pro.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

### Webhookの処理

```typescript
// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Service Roleクライアント（RLSをバイパス）
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // イベントの処理
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      );

      await supabaseAdmin.from('subscriptions').insert({
        user_id: session.metadata!.user_id,
        stripe_subscription_id: subscription.id,
        stripe_price_id: subscription.items.data[0].price.id,
        status: subscription.status,
        current_period_start: new Date(
          subscription.current_period_start * 1000
        ).toISOString(),
        current_period_end: new Date(
          subscription.current_period_end * 1000
        ).toISOString(),
      });

      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;

      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: subscription.status,
          current_period_start: new Date(
            subscription.current_period_start * 1000
          ).toISOString(),
          current_period_end: new Date(
            subscription.current_period_end * 1000
          ).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        })
        .eq('stripe_subscription_id', subscription.id);

      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;

      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('stripe_subscription_id', subscription.id);

      break;
    }
  }

  return NextResponse.json({ received: true });
}
```

### 価格ページコンポーネント

```typescript
// app/pricing/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { PLANS } from '@/lib/stripe/server';

export default function PricingPage() {
  const handleSubscribe = async () => {
    const response = await fetch('/api/stripe/checkout', {
      method: 'POST',
    });

    const { url } = await response.json();
    window.location.href = url;
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-center mb-12">
        シンプルな料金プラン
      </h1>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Free Plan */}
        <div className="border rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-2">{PLANS.free.name}</h2>
          <div className="text-4xl font-bold mb-6">
            ¥{PLANS.free.price}
            <span className="text-lg font-normal text-muted-foreground">
              /月
            </span>
          </div>
          <ul className="space-y-3 mb-8">
            {PLANS.free.features.map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <Button variant="outline" className="w-full">
            無料で始める
          </Button>
        </div>

        {/* Pro Plan */}
        <div className="border-2 border-primary rounded-lg p-8 relative">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
            おすすめ
          </div>
          <h2 className="text-2xl font-bold mb-2">{PLANS.pro.name}</h2>
          <div className="text-4xl font-bold mb-6">
            ¥{PLANS.pro.price.toLocaleString()}
            <span className="text-lg font-normal text-muted-foreground">
              /月
            </span>
          </div>
          <ul className="space-y-3 mb-8">
            {PLANS.pro.features.map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <Button className="w-full" onClick={handleSubscribe}>
            Proにアップグレード
          </Button>
        </div>
      </div>
    </div>
  );
}
```

## 7. メール送信

### Resendの設定

```typescript
// lib/email/client.ts
import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);
```

### メールテンプレート（React Email）

```tsx
// emails/welcome.tsx
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
} from '@react-email/components';

interface WelcomeEmailProps {
  name: string;
}

export default function WelcomeEmail({ name }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f6f9fc', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ margin: '0 auto', padding: '40px 20px' }}>
          <Section style={{ backgroundColor: 'white', borderRadius: '8px', padding: '40px' }}>
            <Text style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
              ようこそ、{name}さん！
            </Text>
            <Text style={{ fontSize: '16px', lineHeight: '1.6', color: '#666' }}>
              ご登録ありがとうございます。さっそく始めましょう。
            </Text>
            <Hr style={{ margin: '24px 0', borderColor: '#e0e0e0' }} />
            <Button
              href={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`}
              style={{
                backgroundColor: '#000',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '6px',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              ダッシュボードを見る
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
```

### メール送信関数

```typescript
// lib/email/send.ts
import { resend } from './client';
import WelcomeEmail from '@/emails/welcome';

export async function sendWelcomeEmail(email: string, name: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'My SaaS <onboarding@yourdomain.com>',
      to: email,
      subject: 'My SaaSへようこそ！',
      react: WelcomeEmail({ name }),
    });

    if (error) {
      console.error('Failed to send welcome email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return { success: false, error };
  }
}
```

## 8. デプロイとCI/CD

### Vercelへのデプロイ

```bash
# Vercel CLIのインストール
npm i -g vercel

# デプロイ
vercel

# プロダクションデプロイ
vercel --prod
```

### GitHub Actionsでの自動デプロイ

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## 9. モニタリングとアナリティクス

### Vercel Analytics

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### カスタムイベントトラッキング

```typescript
// lib/analytics.ts
import { track } from '@vercel/analytics';

export const trackEvent = {
  signup: () => track('signup'),
  subscribe: (plan: string) => track('subscribe', { plan }),
  createProject: () => track('create_project'),
  cancelSubscription: () => track('cancel_subscription'),
};
```

## 10. コスト試算

### 月間利用者数別のコスト

#### ユーザー100人の場合

- **Vercel**: 無料（Hobby）
- **Supabase**: 無料（Free）
- **Stripe**: 売上の3.6%（有料ユーザー分のみ）
- **Resend**: 無料（月3,000通まで）
- **Cloudflare**: 無料
- **合計**: 実質¥0 + 決済手数料

#### ユーザー1,000人の場合

- **Vercel**: 無料〜$20/月
- **Supabase**: $25/月（Pro）
- **Stripe**: 売上の3.6%
- **Resend**: $20/月（月50,000通まで）
- **Cloudflare**: 無料
- **合計**: 約$65/月（約¥10,000） + 決済手数料

#### ユーザー10,000人の場合

- **Vercel**: $20/月
- **Supabase**: $599/月（Team）
- **Stripe**: 売上の3.6%
- **Resend**: $80/月（月500,000通まで）
- **Cloudflare**: 無料
- **合計**: 約$699/月（約¥110,000） + 決済手数料

### 収益シミュレーション

月額¥1,980のProプランで10%のコンバージョン率の場合:

- **ユーザー1,000人**: 100人課金 → 月¥198,000
  - コスト: 約¥10,000 + 決済手数料¥7,128 = 約¥17,000
  - 利益: 約¥181,000

- **ユーザー10,000人**: 1,000人課金 → 月¥1,980,000
  - コスト: 約¥110,000 + 決済手数料¥71,280 = 約¥181,000
  - 利益: 約¥1,799,000

## まとめ

このスタックで一人開発SaaSを構築するメリット:

1. **初期コスト最小**: 無料枠で開始し、成長に応じてスケール
2. **開発速度**: フルスタックを一人で完結、素早くMVPをリリース
3. **保守性**: TypeScriptによる型安全性、Next.jsの統合開発環境
4. **スケーラビリティ**: Vercel、Supabaseともに大規模トラフィックに対応
5. **収益化**: Stripeで簡単にサブスクリプション実装

このスタックで、アイデアから収益化までを最短で実現しましょう。

## 参考リンク

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Vercel Documentation](https://vercel.com/docs)

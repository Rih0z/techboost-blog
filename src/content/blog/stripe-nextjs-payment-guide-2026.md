---
title: "Stripe決済実装完全ガイド2026 — Next.js App Router + Stripeで定期課金・ワンタイム決済"
description: "Next.js App RouterとStripe SDKを使った決済実装を徹底解説。ワンタイム決済・サブスクリプション・Webhook処理・テスト・本番デプロイまで、実践的なコードで学べる2026年最新ガイドです。"
pubDate: "2026-03-05"
tags: ["Stripe", "決済", "Next.js", "SaaS", "TypeScript"]
heroImage: '../../assets/thumbnails/stripe-nextjs-payment-guide-2026.jpg'
---

## はじめに — なぜNext.js + Stripeなのか

SaaSやECサイトを構築する際、決済機能の実装は避けて通れません。2026年現在、Next.js App RouterとStripeの組み合わせは、決済システム構築のデファクトスタンダードとなっています。

Server ComponentsとServer Actionsを活用することで、APIキーの安全な管理、サーバーサイドでのStripe API呼び出し、クライアントサイドでの決済UIレンダリングを、シンプルかつ安全に実装できます。

本記事では、プロジェクトのセットアップから本番デプロイまでを、実践的なコードとともに一通り解説します。

---

## Stripeの概要と料金体系

### Stripeとは

Stripeは、オンライン決済のインフラを提供するプラットフォームです。RESTful APIとSDKを通じて、クレジットカード決済、銀行振込、コンビニ決済など多様な決済手段を統合できます。

### 主な特徴

- **開発者フレンドリー**: 充実したAPIドキュメントとSDK
- **日本の決済対応**: JCB、コンビニ決済、銀行振込に対応
- **PCI DSS準拠**: カード情報の取り扱いをStripe側で管理
- **テスト環境**: 本番と同等のサンドボックス環境を無料提供
- **リアルタイムWebhook**: 決済イベントを即座に通知

### 料金体系（2026年時点）

| 項目 | 料金 |
|------|------|
| 国内クレジットカード | 3.6% |
| JCB | 3.6% |
| コンビニ決済 | 3.6% |
| 月額固定費 | 無料 |
| 初期費用 | 無料 |

初期費用・月額固定費がゼロのため、スモールスタートに最適です。

---

## プロジェクトセットアップ

### Next.jsプロジェクトの作成

```bash
npx create-next-app@latest stripe-payment-app \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*"

cd stripe-payment-app
```

### Stripe SDKのインストール

```bash
# サーバーサイドSDK
npm install stripe

# クライアントサイドSDK（Stripe Elements用）
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### 環境変数の設定

Stripeダッシュボードから「開発者」→「APIキー」でキーを取得し、`.env.local` に設定します。

```env
# .env.local
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**注意**: `STRIPE_SECRET_KEY` には `NEXT_PUBLIC_` プレフィックスを付けないでください。サーバーサイドでのみ使用し、クライアントに露出させてはいけません。

### Stripeインスタンスの初期化

サーバーサイドとクライアントサイドでそれぞれ初期化ファイルを作成します。

```typescript
// src/lib/stripe.ts（サーバーサイド用）
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-18.acacia',
  typescript: true,
})
```

```typescript
// src/lib/stripe-client.ts（クライアントサイド用）
import { loadStripe } from '@stripe/stripe-js'

export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)
```

---

## ワンタイム決済の実装

### Stripe Checkoutを使った方法

最もシンプルな決済実装は、Stripe Checkoutセッションを使う方法です。Stripeが用意した決済ページにリダイレクトするため、UI構築の手間が不要です。

#### Server Actionで決済セッションを作成

```typescript
// src/app/actions/checkout.ts
'use server'

import { stripe } from '@/lib/stripe'
import { redirect } from 'next/navigation'

export async function createCheckoutSession(formData: FormData) {
  const priceId = formData.get('priceId') as string

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cancel`,
    metadata: {
      source: 'web',
    },
  })

  redirect(session.url!)
}
```

#### 商品一覧ページ

```typescript
// src/app/products/page.tsx
import { stripe } from '@/lib/stripe'
import { createCheckoutSession } from '@/app/actions/checkout'

export default async function ProductsPage() {
  // Stripeから商品情報を取得
  const products = await stripe.products.list({
    active: true,
    expand: ['data.default_price'],
  })

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">商品一覧</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {products.data.map((product) => {
          const price = product.default_price as Stripe.Price
          return (
            <div
              key={product.id}
              className="border rounded-lg p-6 shadow-sm"
            >
              <h2 className="text-xl font-semibold">{product.name}</h2>
              <p className="text-gray-600 mt-2">{product.description}</p>
              <p className="text-2xl font-bold mt-4">
                ¥{(price.unit_amount! / 1).toLocaleString()}
              </p>
              <form action={createCheckoutSession}>
                <input type="hidden" name="priceId" value={price.id} />
                <button
                  type="submit"
                  className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
                >
                  購入する
                </button>
              </form>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

#### 決済成功ページ

```typescript
// src/app/success/page.tsx
import { stripe } from '@/lib/stripe'

type Props = {
  searchParams: Promise<{ session_id?: string }>
}

export default async function SuccessPage({ searchParams }: Props) {
  const { session_id } = await searchParams

  if (!session_id) {
    return <p>セッション情報が見つかりません。</p>
  }

  const session = await stripe.checkout.sessions.retrieve(session_id, {
    expand: ['line_items', 'customer'],
  })

  return (
    <div className="max-w-2xl mx-auto p-8 text-center">
      <h1 className="text-3xl font-bold text-green-600 mb-4">
        決済が完了しました
      </h1>
      <p className="text-gray-600">
        注文ID: {session.id}
      </p>
      <p className="text-gray-600 mt-2">
        合計: ¥{(session.amount_total! / 1).toLocaleString()}
      </p>
    </div>
  )
}
```

### Payment Intentsを使ったカスタムUI

より柔軟な決済UIが必要な場合、Payment IntentsとStripe Elementsを組み合わせます。

#### Payment Intent作成のAPI Route

```typescript
// src/app/api/payment-intent/route.ts
import { stripe } from '@/lib/stripe'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { amount, currency = 'jpy' } = await request.json()

    if (!amount || amount < 50) {
      return NextResponse.json(
        { error: '金額は50円以上で指定してください' },
        { status: 400 }
      )
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        source: 'custom_form',
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    })
  } catch (error) {
    console.error('Payment Intent作成エラー:', error)
    return NextResponse.json(
      { error: '決済の初期化に失敗しました' },
      { status: 500 }
    )
  }
}
```

#### カスタム決済フォーム

```typescript
// src/components/PaymentForm.tsx
'use client'

import { useState } from 'react'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { stripePromise } from '@/lib/stripe-client'

function CheckoutForm() {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) return

    setIsProcessing(true)
    setMessage('')

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/success`,
      },
    })

    if (error) {
      setMessage(error.message ?? '決済に失敗しました')
    }

    setIsProcessing(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {message && (
        <p className="text-red-500 text-sm">{message}</p>
      )}
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-blue-600 text-white py-3 rounded-lg
                   hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {isProcessing ? '処理中...' : '支払う'}
      </button>
    </form>
  )
}

type PaymentFormProps = {
  amount: number
}

export default function PaymentForm({ amount }: PaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  useState(() => {
    fetch('/api/payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    })
      .then((res) => res.json())
      .then((data) => setClientSecret(data.clientSecret))
  })

  if (!clientSecret) {
    return <p className="text-center">決済フォームを読み込み中...</p>
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#2563eb',
          },
        },
        locale: 'ja',
      }}
    >
      <CheckoutForm />
    </Elements>
  )
}
```

---

## サブスクリプション（定期課金）の実装

### Stripe上での料金プラン設定

Stripeダッシュボードまたはコードで料金プランを作成します。

```typescript
// scripts/create-plans.ts（初回のみ実行）
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

async function createPlans() {
  const product = await stripe.products.create({
    name: 'プロプラン',
    description: 'すべての機能にアクセスできるプランです',
  })

  // 月額プラン
  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 2980,
    currency: 'jpy',
    recurring: { interval: 'month' },
    lookup_key: 'pro_monthly',
  })

  // 年額プラン（2ヶ月分お得）
  const yearlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 29800,
    currency: 'jpy',
    recurring: { interval: 'year' },
    lookup_key: 'pro_yearly',
  })

  console.log('月額プラン:', monthlyPrice.id)
  console.log('年額プラン:', yearlyPrice.id)
}

createPlans()
```

### サブスクリプション用Checkout

```typescript
// src/app/actions/subscription.ts
'use server'

import { stripe } from '@/lib/stripe'
import { redirect } from 'next/navigation'

export async function createSubscriptionCheckout(formData: FormData) {
  const priceId = formData.get('priceId') as string
  const customerEmail = formData.get('email') as string

  // 既存の顧客を検索、なければ作成
  let customer: Stripe.Customer
  const existingCustomers = await stripe.customers.list({
    email: customerEmail,
    limit: 1,
  })

  if (existingCustomers.data.length > 0) {
    customer = existingCustomers.data[0]
  } else {
    customer = await stripe.customers.create({
      email: customerEmail,
    })
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customer.id,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    subscription_data: {
      trial_period_days: 14,
      metadata: {
        source: 'pricing_page',
      },
    },
  })

  redirect(session.url!)
}
```

### 料金プラン選択ページ

```typescript
// src/app/pricing/page.tsx
import { stripe } from '@/lib/stripe'
import { createSubscriptionCheckout } from '@/app/actions/subscription'

const plans = [
  {
    name: 'フリー',
    description: '個人利用に最適',
    features: ['基本機能', 'メールサポート', '5プロジェクトまで'],
    lookupKey: null,
  },
  {
    name: 'プロ（月額）',
    description: 'チーム利用におすすめ',
    features: ['全機能利用可能', '優先サポート', '無制限プロジェクト', 'API利用'],
    lookupKey: 'pro_monthly',
    popular: true,
  },
  {
    name: 'プロ（年額）',
    description: '2ヶ月分お得',
    features: ['全機能利用可能', '優先サポート', '無制限プロジェクト', 'API利用'],
    lookupKey: 'pro_yearly',
  },
]

export default async function PricingPage() {
  const prices = await stripe.prices.list({
    lookup_keys: ['pro_monthly', 'pro_yearly'],
    expand: ['data.product'],
  })

  const priceMap = new Map(
    prices.data.map((p) => [p.lookup_key, p])
  )

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-4xl font-bold text-center mb-4">料金プラン</h1>
      <p className="text-center text-gray-600 mb-12">
        14日間の無料トライアル付き
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => {
          const price = plan.lookupKey
            ? priceMap.get(plan.lookupKey)
            : null

          return (
            <div
              key={plan.name}
              className={`border rounded-xl p-8 ${
                plan.popular
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : ''
              }`}
            >
              {plan.popular && (
                <span className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full">
                  人気
                </span>
              )}
              <h2 className="text-2xl font-bold mt-4">{plan.name}</h2>
              <p className="text-gray-600 mt-2">{plan.description}</p>
              <p className="text-4xl font-bold mt-6">
                {price
                  ? `¥${price.unit_amount!.toLocaleString()}`
                  : '¥0'}
                <span className="text-base font-normal text-gray-500">
                  {price?.recurring?.interval === 'month'
                    ? '/月'
                    : price?.recurring?.interval === 'year'
                    ? '/年'
                    : ''}
                </span>
              </p>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <span className="text-green-500">&#10003;</span>
                    {feature}
                  </li>
                ))}
              </ul>

              {price ? (
                <form action={createSubscriptionCheckout} className="mt-8">
                  <input type="hidden" name="priceId" value={price.id} />
                  <input
                    type="email"
                    name="email"
                    placeholder="メールアドレス"
                    required
                    className="w-full border rounded-lg px-4 py-2 mb-3"
                  />
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-3 rounded-lg
                               hover:bg-blue-700 transition"
                  >
                    無料トライアルを開始
                  </button>
                </form>
              ) : (
                <button
                  className="mt-8 w-full border border-gray-300 py-3
                             rounded-lg hover:bg-gray-50 transition"
                >
                  無料で始める
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

### サブスクリプション管理（カスタマーポータル）

Stripeのカスタマーポータルを使えば、プラン変更・解約・支払い方法の更新をユーザー自身が行えます。

```typescript
// src/app/actions/portal.ts
'use server'

import { stripe } from '@/lib/stripe'
import { redirect } from 'next/navigation'

export async function createPortalSession(customerId: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
  })

  redirect(session.url)
}
```

```typescript
// src/app/dashboard/page.tsx（抜粋）
import { createPortalSession } from '@/app/actions/portal'

// customerId はDBやセッションから取得する想定
export default function DashboardPage() {
  return (
    <form action={createPortalSession.bind(null, 'cus_XXXXX')}>
      <button
        type="submit"
        className="bg-gray-800 text-white px-6 py-2 rounded"
      >
        サブスクリプションを管理
      </button>
    </form>
  )
}
```

---

## Webhook処理

Webhookは、Stripeから送られるイベント通知です。決済完了、サブスクリプション更新、支払い失敗など、重要なイベントをリアルタイムに受け取れます。

### Webhookエンドポイントの実装

```typescript
// src/app/api/webhooks/stripe/route.ts
import { stripe } from '@/lib/stripe'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

// Webhookはraw bodyが必要なため、bodyParserを無効化
export const runtime = 'nodejs'

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`Webhook署名検証エラー: ${message}`)
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCreated(subscription)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }

      default:
        console.log(`未処理のイベント: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhookハンドラーエラー:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
) {
  console.log('決済完了:', session.id)

  // DBにオーダー情報を保存
  // await db.order.create({
  //   stripeSessionId: session.id,
  //   customerId: session.customer as string,
  //   amountTotal: session.amount_total,
  //   status: 'completed',
  // })

  // メール送信、在庫更新など
}

async function handleSubscriptionCreated(
  subscription: Stripe.Subscription
) {
  console.log('サブスクリプション作成:', subscription.id)

  // ユーザーのプランをDBで更新
  // await db.user.update({
  //   where: { stripeCustomerId: subscription.customer as string },
  //   data: {
  //     plan: 'pro',
  //     stripeSubscriptionId: subscription.id,
  //     subscriptionStatus: subscription.status,
  //   },
  // })
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
) {
  console.log('サブスクリプション更新:', subscription.id)

  // プラン変更、ステータス変更に対応
  // await db.user.update({
  //   where: { stripeCustomerId: subscription.customer as string },
  //   data: {
  //     subscriptionStatus: subscription.status,
  //     currentPeriodEnd: new Date(
  //       subscription.current_period_end * 1000
  //     ),
  //   },
  // })
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
) {
  console.log('サブスクリプション解約:', subscription.id)

  // ユーザーをフリープランに戻す
  // await db.user.update({
  //   where: { stripeCustomerId: subscription.customer as string },
  //   data: {
  //     plan: 'free',
  //     stripeSubscriptionId: null,
  //     subscriptionStatus: 'canceled',
  //   },
  // })
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('支払い失敗:', invoice.id)

  // ユーザーに通知メールを送信
  // await sendEmail({
  //   to: invoice.customer_email!,
  //   subject: 'お支払いに失敗しました',
  //   body: 'お支払い方法をご確認ください。',
  // })
}
```

### Webhook署名検証の重要性

Webhookエンドポイントは外部からアクセス可能なため、署名検証は必須です。`stripe.webhooks.constructEvent` が署名を検証し、不正なリクエストを排除します。

署名検証をスキップすると、第三者がWebhookを偽装して不正な注文を作成できてしまいます。

### ローカルでのWebhookテスト

Stripe CLIを使うと、ローカル環境でWebhookをテストできます。

```bash
# Stripe CLIのインストール（macOS）
brew install stripe/stripe-cli/stripe

# ログイン
stripe login

# ローカルにWebhookを転送
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

CLIが出力する `whsec_...` を `.env.local` の `STRIPE_WEBHOOK_SECRET` に設定します。

別のターミナルでテストイベントを発火させます。

```bash
# 決済完了イベントのテスト
stripe trigger checkout.session.completed

# サブスクリプション作成イベントのテスト
stripe trigger customer.subscription.created

# 支払い失敗イベントのテスト
stripe trigger invoice.payment_failed
```

---

## テスト戦略

### テスト用カード番号

Stripeはテスト環境用に複数のカード番号を用意しています。

| カード番号 | 説明 |
|-----------|------|
| `4242 4242 4242 4242` | 正常な決済 |
| `4000 0000 0000 3220` | 3Dセキュア認証が必要 |
| `4000 0000 0000 9995` | 残高不足で拒否 |
| `4000 0000 0000 0069` | 期限切れカード |
| `4000 0000 0000 0127` | CVC不正 |

有効期限は将来の任意の日付、CVCは任意の3桁を使用します。

### ユニットテスト

```typescript
// src/__tests__/checkout.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Stripeモジュールをモック化
vi.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
    customers: {
      list: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { stripe } from '@/lib/stripe'

describe('Checkout Session', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('正しいパラメータでセッションを作成する', async () => {
    const mockSession = {
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/test',
    }

    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue(
      mockSession as any
    )

    const result = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: 'price_123', quantity: 1 }],
      success_url: 'http://localhost:3000/success',
      cancel_url: 'http://localhost:3000/cancel',
    })

    expect(result.url).toBe('https://checkout.stripe.com/test')
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
      })
    )
  })
})
```

### Webhook処理のテスト

```typescript
// src/__tests__/webhook.test.ts
import { describe, it, expect, vi } from 'vitest'

describe('Webhook Handler', () => {
  it('有効な署名のリクエストを処理する', async () => {
    const mockEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          customer: 'cus_test_456',
          amount_total: 2980,
        },
      },
    }

    // stripe.webhooks.constructEventのモック
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(
      mockEvent as any
    )

    const response = await fetch(
      'http://localhost:3000/api/webhooks/stripe',
      {
        method: 'POST',
        headers: {
          'stripe-signature': 'test_signature',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockEvent),
      }
    )

    expect(response.status).toBe(200)
  })

  it('無効な署名のリクエストを拒否する', async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockImplementation(
      () => {
        throw new Error('Invalid signature')
      }
    )

    const response = await fetch(
      'http://localhost:3000/api/webhooks/stripe',
      {
        method: 'POST',
        headers: {
          'stripe-signature': 'invalid_signature',
        },
        body: 'invalid body',
      }
    )

    expect(response.status).toBe(400)
  })
})
```

### E2Eテスト（Playwright）

```typescript
// e2e/checkout.spec.ts
import { test, expect } from '@playwright/test'

test.describe('決済フロー', () => {
  test('商品一覧から決済ページに遷移できる', async ({ page }) => {
    await page.goto('/products')

    // 商品カードが表示されること
    const productCards = page.locator('[class*="border rounded-lg"]')
    await expect(productCards.first()).toBeVisible()

    // 購入ボタンをクリック
    await productCards.first().getByRole('button', { name: '購入する' }).click()

    // Stripe Checkoutページにリダイレクト
    await expect(page).toHaveURL(/checkout\.stripe\.com/)
  })
})
```

---

## 本番デプロイ

### 本番環境への切り替え手順

1. **Stripeダッシュボードで本番モードに切り替え**
   - 「開発者」→「APIキー」から本番用キーを取得
   - テストモードのトグルをオフにする

2. **環境変数を本番用に更新**

```env
# Vercelの環境変数設定（コマンドライン）
vercel env add STRIPE_SECRET_KEY production
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
```

3. **Webhookエンドポイントを登録**

Stripeダッシュボードの「開発者」→「Webhook」から、本番URLを登録します。

```
https://your-domain.com/api/webhooks/stripe
```

受信するイベントを選択します。

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`
- `invoice.paid`

### Vercelへのデプロイ

```bash
# Vercel CLIでデプロイ
npm i -g vercel
vercel --prod
```

### セキュリティチェックリスト

本番環境に移行する前に、以下を確認してください。

- [ ] `STRIPE_SECRET_KEY` がクライアントサイドに露出していないか
- [ ] Webhook署名検証が実装されているか
- [ ] テスト用APIキーが本番環境に含まれていないか
- [ ] エラーハンドリングが適切か（ユーザーにスタックトレースを表示しない）
- [ ] HTTPS通信が強制されているか
- [ ] レート制限が設定されているか
- [ ] CSRFトークンの検証が行われているか（カスタムフォームの場合）
- [ ] 冪等性キーを使用しているか（重複課金防止）

### 冪等性キーの実装

ネットワークエラー等でリクエストが重複した場合、二重課金を防ぐために冪等性キーを使用します。

```typescript
import { v4 as uuidv4 } from 'uuid'

const paymentIntent = await stripe.paymentIntents.create(
  {
    amount: 2980,
    currency: 'jpy',
  },
  {
    idempotencyKey: uuidv4(),
  }
)
```

### エラーハンドリングのベストプラクティス

```typescript
// src/lib/stripe-errors.ts
import Stripe from 'stripe'

export function handleStripeError(error: unknown): string {
  if (error instanceof Stripe.errors.StripeCardError) {
    // カードエラー（残高不足、期限切れなど）
    switch (error.code) {
      case 'card_declined':
        return 'カードが拒否されました。別のカードをお試しください。'
      case 'expired_card':
        return 'カードの有効期限が切れています。'
      case 'incorrect_cvc':
        return 'セキュリティコードが正しくありません。'
      case 'insufficient_funds':
        return '残高が不足しています。'
      default:
        return 'カードの処理中にエラーが発生しました。'
    }
  }

  if (error instanceof Stripe.errors.StripeRateLimitError) {
    return 'リクエストが多すぎます。しばらくしてから再試行してください。'
  }

  if (error instanceof Stripe.errors.StripeInvalidRequestError) {
    console.error('Stripe APIリクエストエラー:', error.message)
    return '決済処理中にエラーが発生しました。'
  }

  if (error instanceof Stripe.errors.StripeAuthenticationError) {
    console.error('Stripe認証エラー:', error.message)
    return 'システムエラーが発生しました。管理者にお問い合わせください。'
  }

  return '予期しないエラーが発生しました。'
}
```

---

## 実装パターンの比較

用途に応じて最適な実装パターンを選びましょう。

| パターン | 用途 | 実装コスト | カスタマイズ性 |
|---------|------|-----------|-------------|
| Stripe Checkout | EC、シンプルな決済 | 低 | 低 |
| Payment Intents + Elements | カスタムUI決済 | 中 | 高 |
| Subscription + Customer Portal | SaaS定期課金 | 中 | 中 |
| Stripe Connect | マーケットプレイス | 高 | 高 |

### おすすめの構成

- **MVP段階**: Stripe Checkout + Webhook で最速リリース
- **成長段階**: Payment Intents + Elements でブランド統一
- **エンタープライズ**: Stripe Connect + カスタムフロー

---

## まとめ

Next.js App RouterとStripeの組み合わせにより、以下のような決済システムを効率的に構築できます。

- **Server Actionsによる安全なAPI呼び出し**: シークレットキーがクライアントに露出しない
- **Stripe Checkout**: 最小限のコードで決済フローを実装
- **Payment Intents + Elements**: ブランドに合わせたカスタムUI
- **サブスクリプション**: 定期課金とカスタマーポータルによる自己管理
- **Webhook**: イベント駆動でDB更新やメール送信を自動化

Stripeは継続的にAPIを改善しており、2026年現在ではPayment Elementsの自動ローカライゼーションや、AIによる不正検知機能も標準搭載されています。公式ドキュメントを定期的にチェックし、最新の機能を活用していきましょう。

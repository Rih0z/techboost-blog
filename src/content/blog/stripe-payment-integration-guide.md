---
title: 'Stripe決済統合完全ガイド2026：WebサービスへのSaaS課金実装'
description: 'Stripeの決済実装を徹底解説。Checkout・Payment Intents・Subscriptions・Webhooks・Stripe Elements・Next.js統合・定期課金SaaS実装・不正検知まで実践的に学ぶ'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-2.jpg'
---

Webサービスを収益化する上で、決済機能の実装は避けて通れない重要なステップです。Stripeは世界中の開発者に支持されている決済インフラであり、そのAPIの設計品質・ドキュメントの充実度・開発者体験はほかの決済サービスを圧倒しています。本記事では、Stripeを使ったSaaS課金の実装を基礎から応用まで徹底的に解説します。

---

## 1. Stripeとは何か — 他決済サービスとの比較

### Stripeの特徴

Stripeは2010年にPatrick CollisionとJohn Collisionの兄弟によって創業された決済インフラ企業です。現在では世界135カ国以上でサービスを提供しており、Shopify・Salesforce・Amazon・Lyftといった企業も採用しています。

Stripeの最大の特徴は「開発者ファースト」という設計思想です。RESTful APIは直感的に理解でき、SDKは主要な言語・フレームワーク向けに整備されています。PCI DSS（Payment Card Industry Data Security Standard）準拠も自動的に担保されるため、セキュリティ設計の複雑さを大幅に削減できます。

### 主要決済サービスの比較

| 比較項目 | Stripe | PayPal | Square | PAY.JP |
|---|---|---|---|---|
| 日本円対応 | 対応 | 対応 | 対応 | 対応（日本専用） |
| 定期課金 | 標準機能 | 限定的 | 対応 | 対応 |
| Webhook | 充実 | 基本的 | 充実 | 基本的 |
| 手数料（国内） | 3.6% | 3.6%+ | 3.25% | 3.0% |
| API品質 | 非常に高い | 普通 | 高い | 普通 |
| ドキュメント | 非常に充実 | 充実 | 充実 | 日本語充実 |
| SaaS向け機能 | 非常に充実 | 限定的 | 限定的 | 限定的 |

### Stripeが選ばれる理由

**開発速度の圧倒的な優位性**

Stripeのテスト環境は本番環境と完全に同一のAPIを使用します。テストカード番号を使えば、実際に課金せずに全ての決済フローを検証できます。この設計は開発サイクルを大幅に短縮します。

**包括的なSaaS機能**

Stripe Billingを使えば、フリーミアム・月額課金・年額課金・使用量課金・ハイブリッド課金など、あらゆるSaaSビジネスモデルに対応できます。Stripe Taxを使えば消費税・VAT・GST の自動計算も可能です。

**高度な不正検知**

Stripe Radarは機械学習ベースの不正検知エンジンです。Stripeのネットワーク全体のデータを活用するため、個別に不正検知システムを構築するよりも高精度です。

---

## 2. アカウント作成とAPIキー設定

### Stripeアカウントの作成

まずstripe.comにアクセスしてアカウントを作成します。メールアドレス・パスワードを入力するだけで、テスト環境はすぐに利用できます。

本番環境を利用するには、ビジネス情報・銀行口座情報の登録と本人確認が必要です。法人の場合は登記情報の提出が求められます。

### APIキーの取得

Stripeダッシュボードの「開発者」→「APIキー」からキーを取得します。

```
公開可能キー（Publishable Key）: pk_test_xxxxxxxxxxxxxxxxxxxx
シークレットキー（Secret Key）:  sk_test_xxxxxxxxxxxxxxxxxxxx
```

**重要な注意点**

- シークレットキーは絶対にフロントエンドのコードに含めてはいけません
- シークレットキーはサーバーサイドのみで使用します
- `.env`ファイルに保存し、Gitリポジトリにはコミットしないようにします

### 環境変数の設定

```bash
# .env.local（Next.jsの場合）
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx
```

### Stripe SDKのインストール

```bash
# npmの場合
npm install stripe @stripe/stripe-js @stripe/react-stripe-js

# yarnの場合
yarn add stripe @stripe/stripe-js @stripe/react-stripe-js

# pnpmの場合
pnpm add stripe @stripe/stripe-js @stripe/react-stripe-js
```

### Stripeクライアントの初期化

```typescript
// lib/stripe.ts
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});
```

```typescript
// lib/stripe-client.ts（フロントエンド用）
import { loadStripe } from '@stripe/stripe-js';

if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
  throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not defined');
}

export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
);
```

---

## 3. Stripe Checkout — シンプルで安全な決済フロー

### Stripe Checkoutとは

Stripe Checkoutは、Stripeがホストする事前構築済みの決済ページです。自前でカード入力フォームを実装する必要がなく、最短数行のコードで決済機能を追加できます。Apple Pay・Google Pay・各種ローカル決済手段に自動対応しており、モバイルに最適化されたUIも標準装備です。

### セッションの作成（サーバーサイド）

```typescript
// app/api/checkout/route.ts（Next.js App Router）
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { priceId, customerId } = body;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment', // 'payment' | 'subscription' | 'setup'
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // 成功時のリダイレクト先
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      // キャンセル時のリダイレクト先
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing`,
      // 既存顧客IDがある場合は指定
      customer: customerId,
      // メタデータ（任意）
      metadata: {
        userId: 'user_123',
      },
      // 日本語対応
      locale: 'ja',
      // 税金の自動計算（Stripe Tax使用時）
      automatic_tax: {
        enabled: true,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout session creation failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### フロントエンドからCheckoutへリダイレクト

```typescript
// components/CheckoutButton.tsx
'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

interface CheckoutButtonProps {
  priceId: string;
  label: string;
}

export function CheckoutButton({ priceId, label }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      const { url, error } = await response.json();

      if (error) {
        console.error(error);
        return;
      }

      // Stripe Checkoutページへリダイレクト
      window.location.href = url;
    } catch (error) {
      console.error('Checkout failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className="px-6 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50"
    >
      {loading ? '処理中...' : label}
    </button>
  );
}
```

### 決済成功後の処理

```typescript
// app/success/page.tsx
import { stripe } from '@/lib/stripe';
import { redirect } from 'next/navigation';

interface SuccessPageProps {
  searchParams: { session_id?: string };
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const sessionId = searchParams.session_id;

  if (!sessionId) {
    redirect('/');
  }

  // セッション情報を取得して決済確認
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['customer', 'subscription', 'payment_intent'],
  });

  if (session.payment_status !== 'paid') {
    redirect('/pricing');
  }

  return (
    <div>
      <h1>決済が完了しました</h1>
      <p>ご購入ありがとうございます。</p>
      <p>確認番号: {session.id}</p>
    </div>
  );
}
```

### 価格の作成（Stripe Dashboard または API）

```typescript
// scripts/create-prices.ts（初期設定用スクリプト）
import { stripe } from '../lib/stripe';

async function createProducts() {
  // 商品の作成
  const product = await stripe.products.create({
    name: 'DevToolBox Pro',
    description: '開発者向けSaaSサービス プランプラン',
    metadata: {
      tier: 'pro',
    },
  });

  // 月額プランの作成
  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 1980, // 1,980円（単位は「円」の最小単位）
    currency: 'jpy',
    recurring: {
      interval: 'month',
    },
    nickname: 'Proプラン 月額',
  });

  // 年額プランの作成（約20%割引）
  const yearlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 19800, // 19,800円
    currency: 'jpy',
    recurring: {
      interval: 'year',
    },
    nickname: 'Proプラン 年額',
  });

  console.log('Monthly Price ID:', monthlyPrice.id);
  console.log('Yearly Price ID:', yearlyPrice.id);
}

createProducts().catch(console.error);
```

---

## 4. Payment Intents API — カスタム決済UIの実装

### Payment Intentsとは

Payment Intents APIはStripeの中核となるAPIです。Stripe Checkoutがホストページへのリダイレクトを使うのに対し、Payment Intents APIを使うと自分のサイト内にカスタム決済UIを構築できます。

Payment Intentオブジェクトは決済フローのライフサイクル全体を管理します。ステータスは `requires_payment_method` → `requires_confirmation` → `requires_action` → `processing` → `succeeded` と遷移します。

### Payment Intentの作成

```typescript
// app/api/payment-intent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getServerSession } from 'next-auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, currency = 'jpy', metadata } = await request.json();

    // 金額のバリデーション
    if (!amount || amount < 50) {
      return NextResponse.json(
        { error: '金額は50円以上である必要があります' },
        { status: 400 }
      );
    }

    // 顧客情報の取得または作成
    let customerId = await getStripeCustomerId(session.user.id);
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email!,
        name: session.user.name ?? undefined,
        metadata: {
          userId: session.user.id,
        },
      });
      customerId = customer.id;
      await saveStripeCustomerId(session.user.id, customerId);
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      // 支払い方法の設定
      payment_method_types: ['card'],
      // 手動キャプチャの場合（後で確定）
      // capture_method: 'manual',
      // 将来の支払いに備えてカードを保存
      setup_future_usage: 'off_session',
      metadata: {
        userId: session.user.id,
        ...metadata,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Payment intent creation failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ヘルパー関数（実装は自分のデータベースに合わせる）
async function getStripeCustomerId(userId: string): Promise<string | null> {
  // データベースからStripe Customer IDを取得
  // 実装例: return db.user.findUnique({ where: { id: userId } })?.stripeCustomerId
  return null;
}

async function saveStripeCustomerId(
  userId: string,
  customerId: string
): Promise<void> {
  // Stripe Customer IDをデータベースに保存
  // 実装例: await db.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } })
}
```

### Payment Intentの確認とキャプチャ

```typescript
// 手動キャプチャのケース（物販・仮押さえ）
// app/api/payment-intent/capture/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  const { paymentIntentId } = await request.json();

  try {
    // 在庫確認などのビジネスロジックをここで実行

    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);

    return NextResponse.json({
      status: paymentIntent.status,
    });
  } catch (error) {
    console.error('Capture failed:', error);
    return NextResponse.json({ error: 'Capture failed' }, { status: 500 });
  }
}
```

---

## 5. Stripe Elements — カード入力フォームの実装

### Stripe Elementsとは

Stripe Elementsは、Stripeが提供するUIコンポーネントのライブラリです。カード番号・有効期限・CVCなどの入力フォームをiframeで安全にレンダリングします。センシティブなカード情報はStripeのサーバーに直接送信されるため、PCI DSSの要件を大幅に軽減できます。

### 基本的なカード決済フォーム

```typescript
// components/PaymentForm.tsx
'use client';

import { useState, FormEvent } from 'react';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe-client';

// カード入力フォームのスタイル
const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#32325d',
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#fa755a',
      iconColor: '#fa755a',
    },
  },
  hidePostalCode: true, // 日本では郵便番号入力を非表示にすることが多い
};

interface CheckoutFormProps {
  amount: number;
  onSuccess: (paymentIntentId: string) => void;
}

function CheckoutForm({ amount, onSuccess }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Payment Intentのクライアントシークレットを取得
      const response = await fetch('/api/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      const { clientSecret, error: apiError } = await response.json();

      if (apiError) {
        setError(apiError);
        return;
      }

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) return;

      // 決済の確定
      const { error: stripeError, paymentIntent } =
        await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              // 請求先情報（任意）
            },
          },
        });

      if (stripeError) {
        setError(stripeError.message ?? '決済処理中にエラーが発生しました');
      } else if (paymentIntent?.status === 'succeeded') {
        setSucceeded(true);
        onSuccess(paymentIntent.id);
      }
    } catch (err) {
      setError('予期しないエラーが発生しました。');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-3 border rounded-lg">
        <CardElement options={CARD_ELEMENT_OPTIONS} />
      </div>

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing || succeeded}
        className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg disabled:opacity-50"
      >
        {processing
          ? '処理中...'
          : succeeded
          ? '決済完了'
          : `${amount.toLocaleString()}円を支払う`}
      </button>
    </form>
  );
}

// Elementsプロバイダーでラップ
export function PaymentForm({ amount, onSuccess }: CheckoutFormProps) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm amount={amount} onSuccess={onSuccess} />
    </Elements>
  );
}
```

### Payment Element（推奨の新しいアプローチ）

2022年以降、Stripeは個別のCardElementではなく、Payment Elementの使用を推奨しています。Payment Elementは複数の支払い方法を自動的に表示し、顧客の地域・ブラウザ・設定に応じて最適な支払い方法を提示します。

```typescript
// components/PaymentElementForm.tsx
'use client';

import { useState, FormEvent } from 'react';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe-client';

interface PaymentElementFormProps {
  clientSecret: string;
  returnUrl: string;
}

function PaymentForm({ clientSecret, returnUrl }: PaymentElementFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
    });

    if (error) {
      // リダイレクトが発生しなかった場合のみここに到達
      setError(error.message ?? '決済に失敗しました');
      setProcessing(false);
    }
    // リダイレクトが発生した場合は returnUrl へ遷移
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: 'tabs', // 'tabs' | 'accordion'
          defaultValues: {
            billingDetails: {
              address: {
                country: 'JP',
              },
            },
          },
        }}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium"
      >
        {processing ? '処理中...' : '支払いを確定する'}
      </button>
    </form>
  );
}

export function PaymentElementWrapper({
  clientSecret,
  returnUrl,
}: PaymentElementFormProps) {
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#4F46E5',
            colorBackground: '#ffffff',
            colorText: '#1a1a1a',
            borderRadius: '8px',
          },
        },
        locale: 'ja',
      }}
    >
      <PaymentForm clientSecret={clientSecret} returnUrl={returnUrl} />
    </Elements>
  );
}
```

---

## 6. Subscriptions — 定期課金の実装

### Subscriptionモデルの概念

Stripe Subscriptionsは、定期的な課金を管理するためのオブジェクト体系です。主要なオブジェクトの関係を理解することが実装の鍵になります。

```
Customer（顧客）
  └── Subscription（サブスクリプション）
        ├── SubscriptionItem（サブスクリプションアイテム）
        │     └── Price（価格）
        │           └── Product（商品）
        └── Invoice（請求書）
              └── InvoiceItem（請求明細）
                    └── PaymentIntent（決済意図）
```

### サブスクリプションの作成

```typescript
// app/api/subscriptions/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { customerId, priceId, trialDays } = await request.json();

    // 既存のサブスクリプションチェック
    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      price: priceId,
      limit: 1,
    });

    if (existingSubscriptions.data.length > 0) {
      return NextResponse.json(
        { error: '既にこのプランのサブスクリプションがあります' },
        { status: 400 }
      );
    }

    // サブスクリプションの作成
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      // 無料トライアル設定
      trial_period_days: trialDays,
      // 最初の請求書を即座に確定
      payment_behavior: 'default_incomplete',
      // 支払い設定
      payment_settings: {
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card'],
      },
      // Payment Intentのクライアントシークレットを展開
      expand: ['latest_invoice.payment_intent'],
      // メタデータ
      metadata: {
        tier: 'pro',
      },
    });

    // latest_invoiceとpayment_intentを取得
    const invoice = subscription.latest_invoice as any;
    const paymentIntent = invoice?.payment_intent as any;

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret,
      status: subscription.status,
    });
  } catch (error: any) {
    console.error('Subscription creation failed:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### プランのアップグレード・ダウングレード

```typescript
// app/api/subscriptions/update/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { subscriptionId, newPriceId, proration } = await request.json();

    // 現在のサブスクリプション取得
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const currentItem = subscription.items.data[0];

    // プランの変更
    const updatedSubscription = await stripe.subscriptions.update(
      subscriptionId,
      {
        items: [
          {
            id: currentItem.id,
            price: newPriceId,
          },
        ],
        // 日割り計算の設定
        proration_behavior: proration ? 'create_prorations' : 'none',
        // 変更をすぐに反映
        billing_cycle_anchor: proration ? 'unchanged' : 'now',
      }
    );

    return NextResponse.json({
      subscriptionId: updatedSubscription.id,
      status: updatedSubscription.status,
      currentPeriodEnd: new Date(
        updatedSubscription.current_period_end * 1000
      ).toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### サブスクリプションのキャンセル

```typescript
// app/api/subscriptions/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { subscriptionId, immediately } = await request.json();

    let subscription;

    if (immediately) {
      // 即時キャンセル（残り期間の返金なし）
      subscription = await stripe.subscriptions.cancel(subscriptionId);
    } else {
      // 現在の課金期間終了時にキャンセル
      subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }

    return NextResponse.json({
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      cancelAt: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000).toISOString()
        : null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### 使用量ベースの課金（Metered Billing）

```typescript
// 使用量の記録（メータードプラン）
// app/api/usage/record/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { subscriptionItemId, quantity, timestamp } = await request.json();

    const usageRecord = await stripe.subscriptionItems.createUsageRecord(
      subscriptionItemId,
      {
        quantity,
        timestamp: timestamp ?? Math.floor(Date.now() / 1000),
        action: 'increment', // 'increment' | 'set'
      }
    );

    return NextResponse.json({ usageRecordId: usageRecord.id });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

---

## 7. Webhooks — 決済イベントの非同期処理

### Webhookとは

Webhookは、Stripeで何か起きたときにStripeから自分のサーバーへHTTPリクエストを送信する仕組みです。決済の成功・失敗・サブスクリプションの更新などのイベントを受信し、それに応じたビジネスロジックを実行します。

### 重要なWebhookイベント一覧

| イベント | 発生タイミング | 対応アクション |
|---|---|---|
| `checkout.session.completed` | Checkoutが完了 | アクセス権の付与 |
| `payment_intent.succeeded` | 決済成功 | 注文の確定・メール送信 |
| `payment_intent.payment_failed` | 決済失敗 | ユーザーへの通知 |
| `customer.subscription.created` | サブスク作成 | アカウントのアップグレード |
| `customer.subscription.updated` | サブスク変更 | プランの更新 |
| `customer.subscription.deleted` | サブスクキャンセル | アクセス権の削除 |
| `invoice.payment_succeeded` | 請求書の支払い成功 | 継続利用の確認 |
| `invoice.payment_failed` | 請求書の支払い失敗 | 督促メールの送信 |
| `customer.updated` | 顧客情報の更新 | DBの同期 |

### Webhookエンドポイントの実装

```typescript
// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    // 署名の検証（セキュリティのために必須）
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message);
    return NextResponse.json(
      { error: `Webhook Error: ${error.message}` },
      { status: 400 }
    );
  }

  // べき等性の確保（同じイベントを2回処理しない）
  const processedEvent = await checkIfEventProcessed(event.id);
  if (processedEvent) {
    return NextResponse.json({ received: true });
  }

  try {
    await handleStripeEvent(event);
    await markEventAsProcessed(event.id);
  } catch (error) {
    console.error(`Webhook handler failed for event ${event.type}:`, error);
    // エラーを返すとStripeがリトライする
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionChange(subscription);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionCanceled(subscription);
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaymentSucceeded(invoice);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaymentFailed(invoice);
      break;
    }

    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentSucceeded(paymentIntent);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

// 各イベントハンドラ
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId) return;

  if (session.mode === 'subscription') {
    // サブスクリプションのアクセス権を付与
    await grantSubscriptionAccess(userId, session.subscription as string);
  } else if (session.mode === 'payment') {
    // 一回払いのアクセス権を付与
    await grantOneTimeAccess(userId, session.id);
  }

  // 確認メールの送信
  await sendConfirmationEmail(userId, session);
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const userId = await getUserIdByCustomerId(customerId);
  if (!userId) return;

  const status = subscription.status;
  const priceId = subscription.items.data[0]?.price.id;

  // データベースのサブスクリプション状態を更新
  await updateUserSubscription(userId, {
    subscriptionId: subscription.id,
    status,
    priceId,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const userId = await getUserIdByCustomerId(customerId);
  if (!userId) return;

  // アクセス権の剥奪
  await revokeSubscriptionAccess(userId);

  // キャンセル通知メールの送信
  await sendCancellationEmail(userId);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const userId = await getUserIdByCustomerId(customerId);
  if (!userId) return;

  // 支払い失敗の通知
  await sendPaymentFailedEmail(userId, invoice);

  // 猶予期間の設定（Stripeの自動リトライに任せることが多い）
}

// 以下はプレースホルダー関数（実際の実装は省略）
async function checkIfEventProcessed(eventId: string): Promise<boolean> {
  // データベースでイベントIDをチェック
  return false;
}
async function markEventAsProcessed(eventId: string): Promise<void> {}
async function grantSubscriptionAccess(userId: string, subscriptionId: string): Promise<void> {}
async function grantOneTimeAccess(userId: string, sessionId: string): Promise<void> {}
async function sendConfirmationEmail(userId: string, session: Stripe.Checkout.Session): Promise<void> {}
async function getUserIdByCustomerId(customerId: string): Promise<string | null> { return null; }
async function updateUserSubscription(userId: string, data: any): Promise<void> {}
async function revokeSubscriptionAccess(userId: string): Promise<void> {}
async function sendCancellationEmail(userId: string): Promise<void> {}
async function sendPaymentFailedEmail(userId: string, invoice: Stripe.Invoice): Promise<void> {}
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {}
async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {}
```

### ローカル開発でのWebhookテスト

```bash
# Stripe CLIのインストール（macOS）
brew install stripe/stripe-cli/stripe

# Stripe CLIでログイン
stripe login

# ローカルエンドポイントへのイベント転送
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# 特定のイベントをトリガー（テスト用）
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger invoice.payment_failed
```

---

## 8. Customer Portal — 顧客自己管理の実装

### Customer Portalとは

Stripe Customer Portalは、顧客が自分でサブスクリプションを管理できるホスト済みのポータルページです。次の機能をコード不要で提供します。

- プランの変更（アップグレード・ダウングレード）
- サブスクリプションのキャンセル
- 支払い方法の更新
- 請求書履歴の閲覧
- 請求先住所の変更

### ポータルセッションの作成

```typescript
// app/api/customer-portal/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getServerSession } from 'next-auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // データベースからStripe Customer IDを取得
    const customerId = await getStripeCustomerId(session.user.id);
    if (!customerId) {
      return NextResponse.json(
        { error: 'Stripeアカウントが見つかりません' },
        { status: 404 }
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`,
      // カスタム設定（ダッシュボードで事前に設定も可能）
      configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

async function getStripeCustomerId(userId: string): Promise<string | null> {
  // データベースから取得
  return null;
}
```

### ポータルボタンコンポーネント

```typescript
// components/CustomerPortalButton.tsx
'use client';

import { useState } from 'react';

export function CustomerPortalButton() {
  const [loading, setLoading] = useState(false);

  const handlePortalAccess = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/customer-portal', {
        method: 'POST',
      });
      const { url, error } = await response.json();

      if (error) {
        console.error(error);
        return;
      }

      window.location.href = url;
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePortalAccess}
      disabled={loading}
      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
    >
      {loading ? '読み込み中...' : '請求情報の管理'}
    </button>
  );
}
```

---

## 9. Next.js / React 統合 — 完全な実装例

### プロジェクト構成

```
src/
├── app/
│   ├── api/
│   │   ├── checkout/route.ts
│   │   ├── payment-intent/route.ts
│   │   ├── subscriptions/
│   │   │   ├── create/route.ts
│   │   │   ├── update/route.ts
│   │   │   └── cancel/route.ts
│   │   ├── customer-portal/route.ts
│   │   └── webhooks/
│   │       └── stripe/route.ts
│   ├── pricing/page.tsx
│   ├── checkout/page.tsx
│   ├── success/page.tsx
│   └── dashboard/page.tsx
├── components/
│   ├── PricingTable.tsx
│   ├── CheckoutButton.tsx
│   ├── PaymentForm.tsx
│   └── CustomerPortalButton.tsx
├── lib/
│   ├── stripe.ts
│   └── stripe-client.ts
└── hooks/
    └── useSubscription.ts
```

### サブスクリプション状態管理フック

```typescript
// hooks/useSubscription.ts
'use client';

import { useState, useEffect } from 'react';

interface SubscriptionStatus {
  isActive: boolean;
  tier: 'free' | 'pro' | 'team' | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  loading: boolean;
  error: string | null;
}

export function useSubscription(): SubscriptionStatus {
  const [status, setStatus] = useState<SubscriptionStatus>({
    isActive: false,
    tier: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch('/api/subscriptions/status');
      if (!response.ok) throw new Error('Failed to fetch subscription status');

      const data = await response.json();
      setStatus({
        isActive: data.status === 'active' || data.status === 'trialing',
        tier: data.tier,
        currentPeriodEnd: data.currentPeriodEnd
          ? new Date(data.currentPeriodEnd)
          : null,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      setStatus((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
    }
  };

  return status;
}
```

### 料金テーブルコンポーネント

```typescript
// components/PricingTable.tsx
'use client';

import { useState } from 'react';
import { CheckoutButton } from './CheckoutButton';

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  monthlyPriceId: string;
  yearlyPriceId: string;
  monthlyAmount: number;
  yearlyAmount: number;
  features: string[];
  highlighted: boolean;
}

const PLANS: PricingPlan[] = [
  {
    id: 'pro',
    name: 'Proプラン',
    description: '個人開発者・フリーランス向け',
    monthlyPriceId: 'price_pro_monthly',
    yearlyPriceId: 'price_pro_yearly',
    monthlyAmount: 1980,
    yearlyAmount: 19800,
    features: [
      'すべての開発ツール使用可能',
      'APIアクセス（月10,000リクエスト）',
      'プライオリティサポート',
      'チームメンバー 1名まで',
    ],
    highlighted: true,
  },
  {
    id: 'team',
    name: 'Teamプラン',
    description: '小規模チーム向け',
    monthlyPriceId: 'price_team_monthly',
    yearlyPriceId: 'price_team_yearly',
    monthlyAmount: 4980,
    yearlyAmount: 49800,
    features: [
      'Proプランの全機能',
      'APIアクセス（月100,000リクエスト）',
      '専任サポート',
      'チームメンバー 10名まで',
      '使用状況の詳細分析',
    ],
    highlighted: false,
  },
];

export function PricingTable() {
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>(
    'monthly'
  );

  const yearlyDiscount = 17; // 約17%割引

  return (
    <div className="max-w-4xl mx-auto">
      {/* 課金サイクルの切り替え */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-lg border border-gray-200 p-1">
          <button
            onClick={() => setBillingInterval('monthly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingInterval === 'monthly'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            月額払い
          </button>
          <button
            onClick={() => setBillingInterval('yearly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingInterval === 'yearly'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            年額払い
            <span className="ml-1 text-xs text-green-600 font-semibold">
              {yearlyDiscount}%OFF
            </span>
          </button>
        </div>
      </div>

      {/* プランカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PLANS.map((plan) => {
          const amount =
            billingInterval === 'monthly'
              ? plan.monthlyAmount
              : plan.yearlyAmount;
          const priceId =
            billingInterval === 'monthly'
              ? plan.monthlyPriceId
              : plan.yearlyPriceId;

          return (
            <div
              key={plan.id}
              className={`rounded-2xl p-8 ${
                plan.highlighted
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-600'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <h3
                className={`text-xl font-bold mb-2 ${
                  plan.highlighted ? 'text-white' : 'text-gray-900'
                }`}
              >
                {plan.name}
              </h3>
              <p
                className={`text-sm mb-6 ${
                  plan.highlighted ? 'text-indigo-200' : 'text-gray-500'
                }`}
              >
                {plan.description}
              </p>

              <div className="mb-6">
                <span className="text-4xl font-bold">
                  ¥{amount.toLocaleString()}
                </span>
                <span
                  className={`text-sm ml-1 ${
                    plan.highlighted ? 'text-indigo-200' : 'text-gray-500'
                  }`}
                >
                  /{billingInterval === 'monthly' ? '月' : '年'}
                </span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <span
                      className={
                        plan.highlighted ? 'text-indigo-200' : 'text-indigo-600'
                      }
                    >
                      &#10003;
                    </span>
                    <span
                      className={
                        plan.highlighted ? 'text-indigo-100' : 'text-gray-700'
                      }
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <CheckoutButton
                priceId={priceId}
                label={`${plan.name}を始める`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## 10. Node.js / Express バックエンド統合

### Express での Stripe 統合

```typescript
// server.ts
import express from 'express';
import Stripe from 'stripe';

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

// Webhookエンドポイントは生のボディが必要なので、先に登録する
app.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.log(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // イベント処理
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('PaymentIntent was successful:', paymentIntent.id);
        break;
      case 'payment_method.attached':
        const paymentMethod = event.data.object as Stripe.PaymentMethod;
        console.log('PaymentMethod was attached:', paymentMethod.id);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  }
);

// 残りのエンドポイントはJSONパーサーを使用
app.use(express.json());

// 支払いインテントの作成
app.post('/create-payment-intent', async (req, res) => {
  const { amount, currency } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency || 'jpy',
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 顧客の作成
app.post('/customers', async (req, res) => {
  const { email, name } = req.body;

  try {
    const customer = await stripe.customers.create({
      email,
      name,
    });

    res.json({ customerId: customer.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### エラーハンドリングのベストプラクティス

```typescript
// lib/stripe-errors.ts
import Stripe from 'stripe';

export class StripeErrorHandler {
  static handleError(error: unknown): {
    message: string;
    code: string;
    statusCode: number;
  } {
    if (error instanceof Stripe.errors.StripeCardError) {
      // カード固有のエラー（残高不足・カード期限切れなど）
      return {
        message: this.getCardErrorMessage(error.code),
        code: error.code ?? 'card_error',
        statusCode: 402,
      };
    }

    if (error instanceof Stripe.errors.StripeRateLimitError) {
      return {
        message: 'リクエストが多すぎます。しばらく待ってから再試行してください。',
        code: 'rate_limit',
        statusCode: 429,
      };
    }

    if (error instanceof Stripe.errors.StripeInvalidRequestError) {
      return {
        message: 'リクエストパラメータが無効です。',
        code: 'invalid_request',
        statusCode: 400,
      };
    }

    if (error instanceof Stripe.errors.StripeAPIError) {
      return {
        message: 'Stripe側でエラーが発生しました。しばらく待ってから再試行してください。',
        code: 'api_error',
        statusCode: 500,
      };
    }

    if (error instanceof Stripe.errors.StripeConnectionError) {
      return {
        message: 'ネットワークエラーが発生しました。',
        code: 'connection_error',
        statusCode: 503,
      };
    }

    if (error instanceof Stripe.errors.StripeAuthenticationError) {
      return {
        message: 'APIキーの認証に失敗しました。',
        code: 'authentication_error',
        statusCode: 401,
      };
    }

    return {
      message: '予期しないエラーが発生しました。',
      code: 'unknown_error',
      statusCode: 500,
    };
  }

  private static getCardErrorMessage(code?: string): string {
    const messages: Record<string, string> = {
      card_declined: 'カードが拒否されました。別のカードをお試しください。',
      insufficient_funds: 'カードの残高が不足しています。',
      lost_card: '紛失したカードです。',
      stolen_card: '盗難カードです。',
      expired_card: 'カードの有効期限が切れています。',
      incorrect_cvc: 'セキュリティコードが正しくありません。',
      processing_error: 'カードの処理中にエラーが発生しました。再試行してください。',
      incorrect_number: 'カード番号が正しくありません。',
    };

    return messages[code ?? ''] ?? 'カードの決済に失敗しました。';
  }
}
```

---

## 11. SaaS課金モデルの実装 — Free / Pro / Team

### データベーススキーマ設計

```typescript
// prisma/schema.prisma（Prismaを使用する場合）

// model User {
//   id                String    @id @default(cuid())
//   email             String    @unique
//   name              String?
//   stripeCustomerId  String?   @unique
//   subscription      Subscription?
//   createdAt         DateTime  @default(now())
//   updatedAt         DateTime  @updatedAt
// }

// model Subscription {
//   id                  String    @id @default(cuid())
//   userId              String    @unique
//   user                User      @relation(fields: [userId], references: [id])
//   stripeSubscriptionId String   @unique
//   stripePriceId       String
//   stripeCurrentPeriodEnd DateTime
//   tier                PlanTier
//   status              SubscriptionStatus
//   cancelAtPeriodEnd   Boolean   @default(false)
//   createdAt           DateTime  @default(now())
//   updatedAt           DateTime  @updatedAt
// }

// enum PlanTier {
//   FREE
//   PRO
//   TEAM
// }

// enum SubscriptionStatus {
//   ACTIVE
//   TRIALING
//   PAST_DUE
//   CANCELED
//   UNPAID
// }
```

### プランの機能制限管理

```typescript
// lib/plan-features.ts

export type PlanTier = 'free' | 'pro' | 'team';

export interface PlanFeatures {
  apiRequestsPerMonth: number;
  teamMembers: number;
  storageGB: number;
  customDomain: boolean;
  prioritySupport: boolean;
  analyticsRetentionDays: number;
  exportFormats: string[];
}

export const PLAN_FEATURES: Record<PlanTier, PlanFeatures> = {
  free: {
    apiRequestsPerMonth: 1000,
    teamMembers: 1,
    storageGB: 1,
    customDomain: false,
    prioritySupport: false,
    analyticsRetentionDays: 7,
    exportFormats: ['json'],
  },
  pro: {
    apiRequestsPerMonth: 10000,
    teamMembers: 5,
    storageGB: 10,
    customDomain: true,
    prioritySupport: true,
    analyticsRetentionDays: 90,
    exportFormats: ['json', 'csv', 'xlsx'],
  },
  team: {
    apiRequestsPerMonth: 100000,
    teamMembers: 25,
    storageGB: 100,
    customDomain: true,
    prioritySupport: true,
    analyticsRetentionDays: 365,
    exportFormats: ['json', 'csv', 'xlsx', 'pdf'],
  },
};

export function checkFeatureAccess(
  userTier: PlanTier,
  feature: keyof PlanFeatures,
  value?: number
): boolean {
  const features = PLAN_FEATURES[userTier];
  const featureValue = features[feature];

  if (typeof featureValue === 'boolean') {
    return featureValue;
  }

  if (typeof featureValue === 'number' && value !== undefined) {
    return value <= featureValue;
  }

  return false;
}
```

### ミドルウェアによるプラン制限

```typescript
// middleware/subscription-guard.ts（API Routeに適用）
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getUserSubscription } from '@/lib/db';
import { PLAN_FEATURES, PlanTier } from '@/lib/plan-features';

interface SubscriptionGuardOptions {
  requiredTier: PlanTier;
  feature?: string;
}

export function withSubscriptionGuard(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: SubscriptionGuardOptions
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await getUserSubscription(session.user.id);
    const userTier: PlanTier = subscription?.tier ?? 'free';

    const tierHierarchy: PlanTier[] = ['free', 'pro', 'team'];
    const userTierIndex = tierHierarchy.indexOf(userTier);
    const requiredTierIndex = tierHierarchy.indexOf(options.requiredTier);

    if (userTierIndex < requiredTierIndex) {
      return NextResponse.json(
        {
          error: 'この機能を使用するには上位プランへのアップグレードが必要です',
          requiredTier: options.requiredTier,
          currentTier: userTier,
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      );
    }

    return handler(req);
  };
}

// 使用例
// export const GET = withSubscriptionGuard(
//   async (req) => { ... },
//   { requiredTier: 'pro' }
// );
```

### APIレート制限の実装

```typescript
// lib/rate-limiter.ts
import { Redis } from '@upstash/redis';
import { PLAN_FEATURES, PlanTier } from './plan-features';

const redis = Redis.fromEnv();

export async function checkRateLimit(
  userId: string,
  tier: PlanTier
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const limit = PLAN_FEATURES[tier].apiRequestsPerMonth;
  const key = `rate_limit:${userId}:${getCurrentMonth()}`;

  const current = await redis.incr(key);

  // 初回アクセス時にTTLを設定
  if (current === 1) {
    const endOfMonth = getEndOfMonth();
    await redis.expireat(key, Math.floor(endOfMonth.getTime() / 1000));
  }

  const remaining = Math.max(0, limit - current);
  const resetAt = getEndOfMonth();

  return {
    allowed: current <= limit,
    remaining,
    resetAt,
  };
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getEndOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
}
```

---

## 12. 不正検知 — Stripe Radar

### Stripe Radarとは

Stripe Radarは、Stripeが提供するAIベースの不正検知サービスです。毎年数兆円規模の取引データを学習しており、個別に不正検知システムを構築するより高い精度を誇ります。

### Radarのルール設定

Stripeダッシュボードの「Radar」→「ルール」から不正検知ルールをカスタマイズできます。

```
// よく使用するカスタムルールの例（Radarlルール構文）

// 高額取引の3Dセキュア強制
request_3ds: :amount_in_jpy: > 50000

// リスクスコアが高い取引をブロック
block: :risk_score: > 75

// 特定の国からの取引をレビューキューに追加
review: :ip_country: = "XX"

// 新規顧客の高額取引をレビュー
review: :customer_email_count: <= 1 AND :amount_in_jpy: > 30000
```

### 3D Secure（3Dセキュア）の実装

```typescript
// 3Dセキュアに対応したPayment Intent確認
// components/SecurePaymentForm.tsx
'use client';

import { useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';

export function SecurePaymentForm({
  clientSecret,
}: {
  clientSecret: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    const { error, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      {
        payment_method: {
          card: cardElement,
        },
      }
    );

    if (error) {
      if (error.type === 'card_error' || error.type === 'validation_error') {
        setError(error.message ?? 'カードエラーが発生しました');
      } else {
        // 3Dセキュア認証失敗などその他のエラー
        setError('決済処理中にエラーが発生しました。');
      }
    } else if (paymentIntent?.status === 'requires_action') {
      // 3Dセキュア認証が必要（Stripeが自動的にポップアップを表示）
      const { error: confirmError } = await stripe.confirmCardPayment(
        clientSecret
      );
      if (confirmError) {
        setError('3Dセキュア認証に失敗しました。');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      {error && <div className="text-red-500">{error}</div>}
      <button type="submit">支払いを確定する</button>
    </form>
  );
}
```

### カスタム不正チェックの実装

```typescript
// lib/fraud-detection.ts
interface TransactionContext {
  userId: string;
  amount: number;
  ipAddress: string;
  userAgent: string;
  email: string;
}

export async function performFraudCheck(
  context: TransactionContext
): Promise<{ approved: boolean; reason?: string; requiresReview?: boolean }> {
  const checks = await Promise.all([
    checkVelocity(context.userId, context.amount),
    checkIPReputation(context.ipAddress),
    checkEmailAge(context.email),
  ]);

  // いずれかのチェックで問題があれば拒否
  const failed = checks.find((c) => !c.passed);
  if (failed) {
    return { approved: false, reason: failed.reason };
  }

  // リスクスコアが中程度ならレビュー
  const totalRisk = checks.reduce((sum, c) => sum + (c.riskScore ?? 0), 0);
  if (totalRisk > 50) {
    return { approved: true, requiresReview: true };
  }

  return { approved: true };
}

async function checkVelocity(
  userId: string,
  amount: number
): Promise<{ passed: boolean; reason?: string; riskScore?: number }> {
  // 直近24時間の取引回数・金額をチェック
  // 実装は省略
  return { passed: true, riskScore: 0 };
}

async function checkIPReputation(
  ip: string
): Promise<{ passed: boolean; reason?: string; riskScore?: number }> {
  // IPアドレスの評判チェック（VPN・Tor・既知の不正IP）
  // 実装は省略
  return { passed: true, riskScore: 0 };
}

async function checkEmailAge(
  email: string
): Promise<{ passed: boolean; reason?: string; riskScore?: number }> {
  // メールアドレスの登録からの経過時間をチェック
  // 実装は省略
  return { passed: true, riskScore: 0 };
}
```

---

## 13. 日本円・消費税対応

### 日本円の特殊性

日本円（JPY）は小数点以下のない「ゼロ小数通貨（zero-decimal currency）」です。他の多くの通貨と異なり、Stripeに渡す金額は円単位そのままです。

```typescript
// lib/currency.ts

// 注意: JPYは最小単位が1円（セントのような端数がない）
// USD $10.00 → amount: 1000（セント単位）
// JPY 1,000円 → amount: 1000（円単位そのまま）

export function formatAmountForStripe(
  amount: number,
  currency: string
): number {
  const zeroCurrencies = ['jpy', 'krw', 'vnd', 'gnf', 'bif'];

  if (zeroCurrencies.includes(currency.toLowerCase())) {
    // ゼロ小数通貨：そのまま
    return Math.round(amount);
  }

  // 通常の通貨：最小単位に変換（例: USDは100倍）
  return Math.round(amount * 100);
}

export function formatAmountFromStripe(
  amount: number,
  currency: string
): number {
  const zeroCurrencies = ['jpy', 'krw', 'vnd', 'gnf', 'bif'];

  if (zeroCurrencies.includes(currency.toLowerCase())) {
    return amount;
  }

  return amount / 100;
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}
```

### Stripe Taxによる消費税の自動計算

```typescript
// Stripe Taxを有効にした商品作成
const product = await stripe.products.create({
  name: 'DevToolBox Pro',
  tax_code: 'txcd_10000000', // サービス・デジタル商品のtax code
});

// Stripe Taxを有効にしたCheckoutセッション作成
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: priceId, quantity: 1 }],
  automatic_tax: {
    enabled: true, // 日本の消費税（10%）を自動計算
  },
  // 請求先住所を収集（税計算に使用）
  billing_address_collection: 'required',
  customer_update: {
    address: 'auto',
  },
  success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success`,
  cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing`,
});
```

### 手動での消費税計算

```typescript
// 消費税を手動で計算する場合
const TAX_RATE_JAPAN = 0.10; // 消費税10%

// Stripe Tax IDの作成（ダッシュボードでも作成可能）
const taxRate = await stripe.taxRates.create({
  display_name: '消費税',
  description: '日本消費税 10%',
  jurisdiction: 'JP',
  percentage: 10,
  inclusive: false, // 税抜き価格に加算
});

// 価格に消費税を適用
const lineItem = {
  price: priceId,
  quantity: 1,
  tax_rates: [taxRate.id],
};
```

### インボイス（適格請求書）対応

2023年10月から日本では「インボイス制度（適格請求書等保存方式）」が始まりました。

```typescript
// インボイス番号の設定
const invoice = await stripe.invoices.create({
  customer: customerId,
  // 法人番号または個人事業主の登録番号
  // Stripe側でインボイス番号を自動採番
  auto_advance: true,
  collection_method: 'charge_automatically',
  description: 'DevToolBox Pro - 月額利用料',
  // フッターにインボイス番号を表示
  footer: '登録番号: T-XXXX-XXXX-XXXX-XXXX',
  metadata: {
    invoiceType: 'qualified_invoice', // 適格請求書
  },
});
```

---

## 14. テスト・本番環境の切り替え

### テスト環境の徹底活用

```typescript
// lib/stripe-config.ts
const isProduction = process.env.NODE_ENV === 'production';

export const stripeConfig = {
  publishableKey: isProduction
    ? process.env.NEXT_PUBLIC_STRIPE_LIVE_PUBLISHABLE_KEY!
    : process.env.NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY!,
  secretKey: isProduction
    ? process.env.STRIPE_LIVE_SECRET_KEY!
    : process.env.STRIPE_TEST_SECRET_KEY!,
  webhookSecret: isProduction
    ? process.env.STRIPE_LIVE_WEBHOOK_SECRET!
    : process.env.STRIPE_TEST_WEBHOOK_SECRET!,
};
```

### テストカード番号一覧

```typescript
// テスト用カード番号（実際の課金は発生しない）
const TEST_CARDS = {
  // 正常に決済が成功するカード
  success: {
    number: '4242 4242 4242 4242',
    expiry: '12/34',
    cvc: '123',
    description: '通常の決済成功',
  },
  // 3Dセキュア認証が必要なカード
  threeDSecure: {
    number: '4000 0025 0000 3155',
    expiry: '12/34',
    cvc: '123',
    description: '3Dセキュア認証（成功）',
  },
  // 3Dセキュア認証が失敗するカード
  threeDSecureFail: {
    number: '4000 0000 0000 9987',
    expiry: '12/34',
    cvc: '123',
    description: '3Dセキュア認証（失敗）',
  },
  // 残高不足で決済が失敗するカード
  declined: {
    number: '4000 0000 0000 9995',
    expiry: '12/34',
    cvc: '123',
    description: '残高不足（card_declined）',
  },
  // 有効期限切れカード
  expired: {
    number: '4000 0000 0000 0069',
    expiry: '12/34',
    cvc: '123',
    description: '有効期限切れ（expired_card）',
  },
  // CVCエラー
  incorrectCvc: {
    number: '4000 0000 0000 0127',
    expiry: '12/34',
    cvc: '123',
    description: 'CVCエラー（incorrect_cvc）',
  },
  // 不正カードとして検出
  fraudulent: {
    number: '4100 0000 0000 0019',
    expiry: '12/34',
    cvc: '123',
    description: '不正カード（charge_exceeds_source_limit）',
  },
};
```

### E2Eテストの実装

```typescript
// tests/e2e/checkout.test.ts（Playwright使用）
import { test, expect } from '@playwright/test';

test.describe('Stripe Checkout フロー', () => {
  test('月額プランの購入が完了できる', async ({ page }) => {
    // 料金ページへ移動
    await page.goto('/pricing');

    // Proプランのボタンをクリック
    await page.getByRole('button', { name: 'Proプランを始める' }).click();

    // Stripe Checkoutページへのリダイレクトを待機
    await page.waitForURL(/checkout\.stripe\.com/);

    // テストカード情報を入力
    const cardFrame = page
      .frameLocator('[name="__privateStripeFrame"]')
      .first();

    await cardFrame
      .getByPlaceholder('カード番号')
      .fill('4242 4242 4242 4242');
    await cardFrame.getByPlaceholder('月/年').fill('12/34');
    await cardFrame.getByPlaceholder('CVV').fill('123');

    // 決済ボタンをクリック
    await page.getByRole('button', { name: '支払う' }).click();

    // 成功ページへのリダイレクトを確認
    await page.waitForURL(/\/success/);
    await expect(page.getByText('決済が完了しました')).toBeVisible();
  });
});
```

### ユニットテストの実装

```typescript
// tests/unit/stripe-utils.test.ts（Vitestを使用）
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatAmountForStripe, formatAmountFromStripe } from '@/lib/currency';
import { StripeErrorHandler } from '@/lib/stripe-errors';
import Stripe from 'stripe';

describe('formatAmountForStripe', () => {
  it('JPYはそのままの値を返す', () => {
    expect(formatAmountForStripe(1000, 'jpy')).toBe(1000);
    expect(formatAmountForStripe(1980, 'JPY')).toBe(1980);
  });

  it('USDは100倍の値を返す', () => {
    expect(formatAmountForStripe(10, 'usd')).toBe(1000);
    expect(formatAmountForStripe(19.99, 'usd')).toBe(1999);
  });
});

describe('formatAmountFromStripe', () => {
  it('JPYはそのままの値を返す', () => {
    expect(formatAmountFromStripe(1000, 'jpy')).toBe(1000);
  });

  it('USDは1/100の値を返す', () => {
    expect(formatAmountFromStripe(1000, 'usd')).toBe(10);
  });
});

describe('StripeErrorHandler', () => {
  it('カードエラーを正しく処理する', () => {
    const error = new Stripe.errors.StripeCardError({
      message: 'Your card has insufficient funds.',
      type: 'card_error',
      code: 'insufficient_funds',
      doc_url: '',
      charge: '',
      decline_code: '',
      payment_intent: undefined,
      payment_method: undefined,
      setup_intent: undefined,
      source: undefined,
      requestId: undefined,
      statusCode: 402,
      headers: {},
      raw: {} as any,
    });

    const result = StripeErrorHandler.handleError(error);
    expect(result.code).toBe('insufficient_funds');
    expect(result.statusCode).toBe(402);
    expect(result.message).toContain('残高');
  });

  it('レートリミットエラーを正しく処理する', () => {
    const error = new Stripe.errors.StripeRateLimitError({
      message: 'Too many requests',
      type: 'rate_limit_error',
      requestId: undefined,
      statusCode: 429,
      headers: {},
      raw: {} as any,
    });

    const result = StripeErrorHandler.handleError(error);
    expect(result.code).toBe('rate_limit');
    expect(result.statusCode).toBe(429);
  });
});
```

---

## 本番環境デプロイのチェックリスト

本番環境でStripeを使用する前に、以下の項目を必ず確認してください。

### セキュリティ

- シークレットキーが環境変数に正しく設定されている
- シークレットキーがGitリポジトリに含まれていない
- Webhook署名の検証を実装している
- HTTPSを使用している（テスト環境も含む）
- PCI DSSのSAQ Aを満たしている（Stripe.jsを使用していれば通常OK）

### 決済フロー

- テスト環境で全ての決済フローを検証済み
- 決済成功・失敗・キャンセルの全パターンをテスト済み
- Webhookの全イベントをテスト済み
- べき等性キーを使用している（重複処理の防止）

### ユーザーエクスペリエンス

- エラーメッセージを日本語で適切に表示している
- ローディング状態を適切にUI上で表示している
- 決済完了後のリダイレクトが正しく動作する
- モバイルでのカード入力UIを確認済み

### コンプライアンス

- 利用規約・プライバシーポリシーに決済に関する記載がある
- 特定商取引法に基づく表示がある（日本法人・個人事業主の場合）
- 返金ポリシーが明記されている
- Stripe Taxまたは手動で消費税を適切に計算・表示している

### モニタリング

- StripeダッシュボードのWebhookログを監視している
- 決済失敗率のアラートを設定している
- 本番環境のエラーログを監視している

---

## まとめ

Stripeは現代のWebサービス・SaaSにとって欠かせない決済インフラです。本記事で解説した内容を振り返ります。

- **Stripe Checkout** はシンプルな実装で堅牢な決済フローを構築できる最速の手段
- **Payment Intents API** はカスタムUIを構築する際の中核となるAPI
- **Stripe Elements / Payment Element** でPCI DSSに準拠した安全なカード入力フォームを実装できる
- **Subscriptions** を使えばあらゆる定期課金モデルに対応できる
- **Webhooks** は決済フローの非同期処理に不可欠で、べき等性の確保が重要
- **Customer Portal** でサブスクリプション管理画面をほぼゼロコストで提供できる
- **Stripe Radar** で高精度な不正検知を自動的に実現できる
- **日本円対応** はゼロ小数通貨の理解と消費税対応が必要

Stripeの実装を習得することで、あなたのWebサービスに安定した収益基盤を構築できます。本記事のコードをベースに、あなたのプロジェクトに合わせてカスタマイズしてみてください。

---

## 開発者向けツール

Stripe統合を含むWebサービス開発では、多くのユーティリティツールが必要になります。**[DevToolBox](https://usedevtools.com)** は、開発者向けのオンラインツールを集約したプラットフォームです。JSON整形・Base64エンコード・正規表現テスター・UUID生成など、Web開発で頻繁に使うツールをワンストップで提供しています。

StripeのWebhookイベントデバッグ時のJSON整形、APIキーのBase64変換など、日常的な開発作業を効率化できます。ブックマークしておくと便利です。

---

## 参考リソース

Stripeの公式ドキュメントは世界最高水準のAPIドキュメントとして知られています。本記事で紹介したトピックをより深く学ぶには、以下を参照してください。

- Stripe公式ドキュメント: https://stripe.com/docs
- Stripe API リファレンス: https://stripe.com/docs/api
- Stripe CLI ドキュメント: https://stripe.com/docs/stripe-cli
- Stripe Samples（GitHub）: https://github.com/stripe-samples
- Stripe Community Forum: https://github.com/stripe/stripe-node/discussions

実際にStripeを使った実装を始める際は、必ずテスト環境で十分に検証してから本番環境に適用してください。本番環境での決済ミスは顧客の信頼に直結するため、慎重なテストが不可欠です。

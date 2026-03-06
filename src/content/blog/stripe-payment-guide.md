---
title: 'Stripe決済実装完全ガイド - サブスクから単発決済まで【2026年版】'
description: 'Stripe APIを使った決済システムの実装方法を徹底解説。サブスクリプション、単発決済、Webhookの処理など、実際のコードで学べる実践ガイドです。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。'
pubDate: 'Feb 05 2026'
tags: ['Stripe', '決済', 'サブスクリプション', 'プログラミング']
---
Stripeは、世界中で利用されているオンライン決済プラットフォームです。強力なAPI、充実したドキュメント、日本の決済にも対応しており、スタートアップから大企業まで幅広く採用されています。

## Stripeの特徴

### なぜStripeを選ぶべきか

**主な利点:**
- API設計が洗練されている
- テスト環境が完全に独立している
- Webhookによるイベント駆動処理
- サブスクリプション管理が強力
- ダッシュボードが直感的
- セキュリティ対応（PCI DSS準拠）

**日本での利用:**
- クレジットカード決済（Visa、Mastercard、JCB、AMEX等）
- コンビニ決済（Konbini）
- 銀行振込
- PayPay、LINE Payなど

## 初期セットアップ

### 1. アカウント作成

[Stripe公式サイト](https://stripe.com/jp)でアカウント作成（無料）

### 2. APIキーの取得

ダッシュボードから以下のキーを取得:
- 公開可能キー（Publishable Key）: フロントエンドで使用
- シークレットキー（Secret Key）: バックエンドで使用

**重要:** シークレットキーは絶対にGitHubにpushしないこと。

### 3. Node.jsライブラリのインストール

```bash
npm install stripe @stripe/stripe-js
```

## 環境変数の設定

```env
# .env
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

## 単発決済（Checkout Session）

最もシンプルな決済フローです。Stripeホストの決済ページを使用します。

### バックエンド（Next.js API Route）

```typescript
// app/api/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

export async function POST(req: NextRequest) {
  try {
    const { priceId, quantity = 1 } = await req.json();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: quantity,
        },
      ],
      success_url: `${req.headers.get("origin")}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/cancel`,
      metadata: {
        userId: "user_123", // 自分のユーザーIDを設定
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### フロントエンド（React/Next.js）

```typescript
// app/components/CheckoutButton.tsx
"use client";

import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function CheckoutButton({
  priceId,
  children,
}: {
  priceId: string;
  children: React.ReactNode;
}) {
  const handleCheckout = async () => {
    const stripe = await stripePromise;
    if (!stripe) return;

    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId }),
    });

    const { sessionId } = await response.json();

    const { error } = await stripe.redirectToCheckout({ sessionId });

    if (error) {
      console.error("Checkout error:", error);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      className="bg-blue-600 text-white px-6 py-3 rounded-lg"
    >
      {children}
    </button>
  );
}
```

## サブスクリプション決済

継続課金（月額・年額）の実装です。

```typescript
// app/api/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

export async function POST(req: NextRequest) {
  try {
    const { priceId, userId, email } = await req.json();

    // 既存の顧客を検索または作成
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: email,
        metadata: { userId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: customer.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.get("origin")}/dashboard?success=true`,
      cancel_url: `${req.headers.get("origin")}/pricing`,
      subscription_data: {
        metadata: { userId },
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

## Webhook処理（重要）

決済完了やサブスク更新などのイベントを受け取ります。

```typescript
// app/api/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { headers } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = headers().get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  // イベントタイプごとに処理
  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;

    case "customer.subscription.created":
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionCreated(subscription);
      break;

    case "customer.subscription.updated":
      const updatedSub = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdated(updatedSub);
      break;

    case "customer.subscription.deleted":
      const deletedSub = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(deletedSub);
      break;

    case "invoice.payment_succeeded":
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaymentSucceeded(invoice);
      break;

    case "invoice.payment_failed":
      const failedInvoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaymentFailed(failedInvoice);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;

  if (session.mode === "subscription") {
    // サブスクリプションをDBに保存
    await db.subscription.create({
      data: {
        userId,
        stripeSubscriptionId: session.subscription as string,
        stripeCustomerId: session.customer as string,
        status: "active",
      },
    });
  } else {
    // 単発決済をDBに保存
    await db.payment.create({
      data: {
        userId,
        stripePaymentIntentId: session.payment_intent as string,
        amount: session.amount_total!,
        status: "succeeded",
      },
    });
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log("Subscription created:", subscription.id);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  await db.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: { status: subscription.status },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await db.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: { status: "canceled" },
  });
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log("Invoice payment succeeded:", invoice.id);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log("Invoice payment failed:", invoice.id);
  // ユーザーにメール通知などを送る
}
```

## Webhookのローカルテスト

Stripe CLIを使います。

```bash
# Stripe CLIをインストール（Mac）
brew install stripe/stripe-cli/stripe

# ログイン
stripe login

# Webhookをローカルにフォワード
stripe listen --forward-to localhost:3000/api/webhook
```

ターミナルに表示される `whsec_xxxxx` を `.env` の `STRIPE_WEBHOOK_SECRET` に設定します。

## 顧客ポータル（セルフサービス）

顧客が自分でサブスクリプションを管理できる画面を提供します。

```typescript
// app/api/customer-portal/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

export async function POST(req: NextRequest) {
  try {
    const { customerId } = await req.json();

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.headers.get("origin")}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

顧客はこのURLにアクセスすると、カード情報更新、プラン変更、キャンセルなどができます。

## テスト用カード番号

開発環境で使えるテストカード:

- 成功: `4242 4242 4242 4242`
- 3Dセキュア必要: `4000 0027 6000 3184`
- 決済失敗: `4000 0000 0000 0002`
- 有効期限: 未来の任意の日付
- CVC: 任意の3桁

## 料金プランの設定

ダッシュボードで「商品」を作成するか、APIで作成:

```typescript
const product = await stripe.products.create({
  name: "プレミアムプラン",
});

const price = await stripe.prices.create({
  product: product.id,
  unit_amount: 1000, // 1000円（Stripeは最小通貨単位）
  currency: "jpy",
  recurring: {
    interval: "month",
  },
});
```

## セキュリティのベストプラクティス

1. **シークレットキーを絶対に公開しない**
2. **Webhookの署名を必ず検証する**
3. **HTTPSを使用する（本番環境）**
4. **金額計算はサーバー側で行う**
5. **ユーザー入力を信頼しない**

## まとめ

Stripeは、最初は複雑に見えますが、以下の順番で学ぶとスムーズです:

1. 単発決済（Checkout Session）
2. Webhook処理
3. サブスクリプション
4. 顧客ポータル
5. より高度な機能（クーポン、トライアル、使用量課金など）

ドキュメントが非常に充実しているので、公式ドキュメントを読むことを強くおすすめします。

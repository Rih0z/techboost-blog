---
title: 'Resendで最新メール送信を実装する - Next.jsからのトランザクションメール配信'
description: 'Resendを使ったモダンなメール送信実装ガイド。React EmailでHTMLメールをコンポーネントとして作成し、Next.js APIルートから送信する方法を実践的に解説します。Resend・Next.js・Emailに関する実践情報。'
pubDate: '2026-02-05'
tags: ['Resend', 'Next.js', 'Email', 'React Email', 'TypeScript']
---
Resendは、開発者体験を重視した最新のメール配信サービスです。React Emailと組み合わせることで、HTMLメールをReactコンポーネントとして作成できます。この記事では、Next.jsアプリにResendを統合する方法を解説します。

## Resendとは？

Resendは2023年に登場した、開発者向けのメールAPI/SMTPサービスです。

### 主な特徴

- **シンプルなAPI** - 数行のコードでメール送信
- **React Email統合** - HTMLメールをReactコンポーネントで記述
- **優れたDX** - TypeScript完全対応、わかりやすいドキュメント
- **手頃な価格** - 月3,000通まで無料
- **高い到達率** - Amazon SES等のインフラを活用
- **Webhook対応** - 配信状況をリアルタイムで取得

### SendGridやMailgunとの違い

従来のメールサービスと比較して、Resendはよりモダンな開発者体験を提供します。

| 項目 | Resend | SendGrid | Mailgun |
|------|--------|----------|---------|
| 無料枠 | 3,000通/月 | 100通/日 | 5,000通/月 |
| React Email | ○ | × | × |
| TypeScript | ○ | △ | △ |
| API設計 | モダン | レガシー | レガシー |

## セットアップ

### アカウント作成とAPIキー取得

1. https://resend.com でアカウント作成
2. ダッシュボードから「API Keys」を選択
3. 「Create API Key」でキーを生成
4. キーをコピー（一度しか表示されません）

### インストール

```bash
npm install resend
```

### 環境変数の設定

`.env.local`にAPIキーを追加します。

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 基本的なメール送信

### Next.js Route Handlerでメール送信

`app/api/send-email/route.ts`

```typescript
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { to, subject, html } = await request.json();

    const { data, error } = await resend.emails.send({
      from: 'noreply@yourdomain.com',
      to: to,
      subject: subject,
      html: html,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### シンプルなテキストメール

```typescript
await resend.emails.send({
  from: 'hello@yourdomain.com',
  to: 'user@example.com',
  subject: 'ようこそ！',
  text: 'アカウント登録ありがとうございます。',
});
```

## React Emailでメールテンプレート作成

React Emailを使えば、HTMLメールをReactコンポーネントとして記述できます。

### React Emailのインストール

```bash
npm install react-email @react-email/components
```

### メールコンポーネントの作成

`emails/WelcomeEmail.tsx`

```typescript
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface WelcomeEmailProps {
  userName: string;
  loginUrl: string;
}

export default function WelcomeEmail({ userName, loginUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>ようこそ、{userName}さん</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src="https://yourdomain.com/logo.png"
            width="48"
            height="48"
            alt="ロゴ"
          />
          <Heading style={h1}>ようこそ、{userName}さん！</Heading>
          <Text style={text}>
            アカウント登録ありがとうございます。
            下のボタンからログインして、サービスを利用開始できます。
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={loginUrl}>
              ログインする
            </Button>
          </Section>
          <Text style={text}>
            または、以下のURLをコピーしてブラウザに貼り付けてください:
          </Text>
          <Link href={loginUrl} style={link}>
            {loginUrl}
          </Link>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
};

const buttonContainer = {
  padding: '27px 0',
};

const button = {
  backgroundColor: '#5469d4',
  borderRadius: '4px',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '12px',
};

const link = {
  color: '#5469d4',
  fontSize: '14px',
};
```

### React Emailコンポーネントを使ってメール送信

```typescript
import { Resend } from 'resend';
import WelcomeEmail from '@/emails/WelcomeEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const { userName, email } = await request.json();

  const { data, error } = await resend.emails.send({
    from: 'noreply@yourdomain.com',
    to: email,
    subject: 'ようこそ！',
    react: WelcomeEmail({
      userName: userName,
      loginUrl: 'https://yourdomain.com/login',
    }),
  });

  if (error) {
    return Response.json({ error }, { status: 400 });
  }

  return Response.json({ data }, { status: 200 });
}
```

## 実用的なメールテンプレート例

### パスワードリセットメール

`emails/PasswordResetEmail.tsx`

```typescript
import { Body, Button, Container, Heading, Html, Text } from '@react-email/components';

interface PasswordResetEmailProps {
  resetUrl: string;
}

export default function PasswordResetEmail({ resetUrl }: PasswordResetEmailProps) {
  return (
    <Html>
      <Body>
        <Container>
          <Heading>パスワードリセット</Heading>
          <Text>
            パスワードリセットのリクエストを受け付けました。
            下のボタンから新しいパスワードを設定してください。
          </Text>
          <Button href={resetUrl}>パスワードをリセット</Button>
          <Text>
            このリンクは24時間有効です。
            もしリクエストしていない場合は、このメールを無視してください。
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

### 注文確認メール

`emails/OrderConfirmationEmail.tsx`

```typescript
import {
  Body,
  Column,
  Container,
  Heading,
  Hr,
  Html,
  Row,
  Section,
  Text,
} from '@react-email/components';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface OrderConfirmationEmailProps {
  orderNumber: string;
  items: OrderItem[];
  total: number;
}

export default function OrderConfirmationEmail({
  orderNumber,
  items,
  total,
}: OrderConfirmationEmailProps) {
  return (
    <Html>
      <Body>
        <Container>
          <Heading>ご注文ありがとうございます</Heading>
          <Text>注文番号: {orderNumber}</Text>
          <Hr />
          {items.map((item, index) => (
            <Section key={index}>
              <Row>
                <Column>{item.name}</Column>
                <Column>数量: {item.quantity}</Column>
                <Column>¥{item.price.toLocaleString()}</Column>
              </Row>
            </Section>
          ))}
          <Hr />
          <Text style={{ fontSize: '18px', fontWeight: 'bold' }}>
            合計: ¥{total.toLocaleString()}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

## メールプレビュー開発サーバー

React Emailには開発サーバーが付属しており、ブラウザでメールをプレビューできます。

### package.jsonにスクリプトを追加

```json
{
  "scripts": {
    "email": "email dev"
  }
}
```

### プレビューサーバーの起動

```bash
npm run email
```

`http://localhost:3000`でメールプレビューが確認できます。

## 添付ファイルの送信

```typescript
await resend.emails.send({
  from: 'noreply@yourdomain.com',
  to: 'user@example.com',
  subject: '請求書',
  react: InvoiceEmail({ invoiceNumber: '12345' }),
  attachments: [
    {
      filename: 'invoice.pdf',
      content: Buffer.from(pdfData).toString('base64'),
    },
  ],
});
```

## バッチ送信

複数のメールを一度に送信できます。

```typescript
const emails = users.map((user) => ({
  from: 'newsletter@yourdomain.com',
  to: user.email,
  subject: '週刊ニュースレター',
  react: NewsletterEmail({ userName: user.name }),
}));

const { data, error } = await resend.batch.send(emails);
```

## Webhookで配信状況を追跡

Resendは配信、開封、クリック等のイベントをWebhookで通知できます。

### Webhookエンドポイントの作成

`app/api/webhooks/resend/route.ts`

```typescript
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const event = await request.json();

  switch (event.type) {
    case 'email.sent':
      console.log('メール送信完了:', event.data.email_id);
      break;
    case 'email.delivered':
      console.log('メール配信完了:', event.data.email_id);
      break;
    case 'email.bounced':
      console.log('メール配信失敗:', event.data.email_id);
      break;
  }

  return NextResponse.json({ received: true });
}
```

### Resendダッシュボードでの設定

1. ダッシュボードの「Webhooks」セクション
2. 「Add Webhook」
3. エンドポイントURL: `https://yourdomain.com/api/webhooks/resend`
4. イベントを選択（sent, delivered, bounced等）

## ドメイン認証

本番環境では独自ドメインからメールを送信するために、ドメイン認証が必要です。

### 手順

1. Resendダッシュボードで「Domains」を選択
2. 「Add Domain」でドメインを追加
3. 表示されるDNSレコード（MX, TXT, CNAME）をDNS設定に追加
4. 認証を待つ（通常数分〜24時間）

認証後は`noreply@yourdomain.com`のような独自ドメインから送信できます。

## まとめ

Resendは、React Emailとの組み合わせで、最高の開発者体験を提供するメールサービスです。

**主要な利点:**
- シンプルで直感的なAPI
- React Emailでコンポーネントベースのメール作成
- TypeScript完全対応
- 手頃な価格（月3,000通まで無料）
- Webhook対応で配信状況を追跡

公式ドキュメント: https://resend.com/docs

従来のメールサービスの複雑さに悩んでいたなら、Resendは最適な選択肢です。Next.jsアプリに今すぐ統合してみましょう。

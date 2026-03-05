---
title: "Supabase完全ガイド2026：Next.jsとの統合・認証・RLS設定の実践"
description: "SupabaseでBaaS開発を始める実践ガイド。PostgreSQL・Row Level Security・Edge Functions・Realtime・Auth（Google OAuth）とNext.js 15の統合を徹底解説。"
pubDate: "2026-03-17"
heroImage: '../../assets/thumbnails/supabase-complete-guide-2026.jpg'
tags:
  - "Supabase"
  - "PostgreSQL"
  - "Next.js"
  - "バックエンド"
  - "認証"
---

## SupabaseとFirebaseの違い：なぜ2026年にSupabaseが選ばれるか

```
Firebase:
✓ Googleのエコシステム統合
✗ NoSQL（スキーマレス → 大規模で崩壊しやすい）
✗ Vendor lock-in（移行コスト大）
✗ SQL使えない

Supabase:
✓ PostgreSQL（本物のRDB）
✓ オープンソース（self-hostも可能）
✓ Row Level Security（SQL定義のアクセス制御）
✓ Edge Functions（Deno）
✓ Realtimeサブスクリプション
```

---

## セットアップ

```bash
npm install @supabase/supabase-js @supabase/ssr
```

```typescript
// lib/supabase/client.ts（クライアント側）
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// lib/supabase/server.ts（Server Component用）
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
}
```

---

## Row Level Security（RLS）

```sql
-- テーブル作成
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS有効化
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- ポリシー: 自分の投稿のみ読み書き可能
CREATE POLICY "Users can read own posts"
  ON posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = user_id);
```

---

## Next.js 15 + Supabase Auth（Google OAuth）

```typescript
// app/auth/login/page.tsx
'use client'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <button onClick={handleGoogleLogin}>
      Googleでログイン
    </button>
  )
}
```

```typescript
// app/auth/callback/route.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(),
                   setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) =>
                     cookieStore.set(name, value, options)) } }
    )
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL('/dashboard', request.url))
}
```

---

## Edge Functions（サーバーサイドロジック）

```typescript
// supabase/functions/send-notification/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

serve(async (req) => {
  const { userId, message } = await req.json()

  // SendGrid / Resend などで送信
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'noreply@myapp.com',
      to: 'user@example.com',
      subject: '通知',
      html: `<p>${message}</p>`,
    }),
  })

  return new Response(JSON.stringify({ success: res.ok }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

---

## 料金（2026年3月）

| プラン | 月額 | DB | API calls | ユーザー数 |
|-------|------|-----|-----------|---------|
| Free | $0 | 500MB | 2M/月 | 50,000 |
| Pro | $25 | 8GB | 100M/月 | 無制限 |
| Team | $599 | 64GB | 無制限 | 無制限 |

**Free枠が充実** → プロトタイプ・個人開発なら十分。

---

## まとめ

Supabaseは「PostgreSQLをBaaSとして使えるFirebase代替」として急成長中。特に：
- **型安全DB操作**（自動生成の型定義）
- **Row Level Security**（SQLベースのアクセス制御）
- **Next.js 15との統合**（Server Component対応）

この3点が揃っており、2026年の個人開発・スタートアップに最適です。

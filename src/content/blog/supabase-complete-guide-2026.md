---
title: "Supabase入門ガイド2026：Next.jsとの統合・認証・RLS設定の実践"
description: "SupabaseでBaaS開発を始める実践ガイド。PostgreSQL・Row Level Security・Edge Functions・Realtime・Auth（Google OAuth）とNext.js 15の統合を徹底解説。サンプルコード付きで実践的に解説。"
pubDate: "2026-03-17"
tags: ["Supabase", "PostgreSQL", "Next.js", "バックエンド", "認証", "プログラミング"]
heroImage: '../../assets/thumbnails/supabase-complete-guide-2026.jpg'
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

## Realtime：リアルタイムサブスクリプション

```typescript
// リアルタイムでDBの変更を購読
'use client'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export function RealtimeChat({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const supabase = createClient()

  useEffect(() => {
    // 初回データ取得
    supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at')
      .then(({ data }) => setMessages(data ?? []))

    // リアルタイム購読
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [roomId])

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.id}>{msg.content}</div>
      ))}
    </div>
  )
}
```

---

## Storage：ファイルアップロード

```typescript
// ファイルアップロード
const uploadFile = async (file: File) => {
  const supabase = createClient()
  const fileName = `${Date.now()}-${file.name}`

  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) throw error

  // 公開URLを取得
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName)

  return publicUrl
}

// StorageにもRLSを設定
// Supabaseダッシュボード → Storage → Policies
```

```sql
-- Storage RLSポリシー
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
```

---

## 型安全なDB操作（supabase gen types）

```bash
# 型定義を自動生成
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/database.types.ts
```

```typescript
// 生成される型定義の例
export type Database = {
  public: {
    Tables: {
      posts: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string | null
          created_at?: string
        }
      }
    }
  }
}

// 使用例: 型安全なクエリ
const { data } = await supabase
  .from('posts')
  .select('id, title, created_at')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(10)

// data は自動的に Pick<Post, 'id' | 'title' | 'created_at'>[] に推論される
```

---

## テスト戦略

```typescript
// Vitest + Supabase のテスト例
import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // テスト用にservice_roleを使用
)

describe('Posts RLS', () => {
  it('ユーザーは自分の投稿のみ取得できる', async () => {
    // service_roleでテストデータ作成
    await supabase.from('posts').insert({
      user_id: 'user-a',
      title: 'User A Post',
    })

    // user-aとしてクエリ（JWTモック）
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', 'user-a')

    expect(data).toHaveLength(1)
    expect(data![0].title).toBe('User A Post')
  })
})
```

---

## Self-hosting（セルフホスト）

```bash
# Docker Composeでローカルにフルスタック起動
git clone https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
docker compose up -d

# 起動するサービス:
# - PostgreSQL (port 5432)
# - GoTrue (認証, port 9999)
# - PostgREST (API, port 3000)
# - Realtime (WebSocket, port 4000)
# - Storage (ファイル, port 5000)
# - Studio (管理画面, port 3001)
```

**Self-hostのメリット:**
- データを完全に自社管理
- 料金制限なし
- カスタムPostgreSQLの設定変更が自由

---

## まとめ

Supabaseは「PostgreSQLをBaaSとして使えるFirebase代替」として急成長中。特に：
- **型安全DB操作**（自動生成の型定義）
- **Row Level Security**（SQLベースのアクセス制御）
- **Next.js 15との統合**（Server Component対応）
- **Realtime + Storage**（リアルタイム＋ファイル管理）
- **Self-host可能**（ベンダーロックインなし）

この5点が揃っており、2026年の個人開発・スタートアップに最適です。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)

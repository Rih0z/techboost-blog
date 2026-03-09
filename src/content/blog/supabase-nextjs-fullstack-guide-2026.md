---
title: 'Supabase × Next.js フルスタック開発ガイド2026｜認証・DB・リアルタイム・Storage'
description: 'SupabaseとNext.js App Routerでフルスタックアプリを構築する方法を徹底解説。認証機能の実装、PostgreSQLデータベース設計、Row Level Securityによるアクセス制御、リアルタイム通信、ファイルストレージ連携までTypeScriptのコード例付きで紹介します。'
pubDate: '2026-03-05'
tags: ['Supabase', 'Next.js', 'PostgreSQL', 'フルスタック', 'TypeScript']
heroImage: '../../assets/thumbnails/supabase-nextjs-fullstack-guide-2026.jpg'
---

## Supabaseとは

Supabaseは**Firebase代替**として人気のオープンソースBaaS（Backend as a Service）です。PostgreSQLをベースに、認証・データベース・ストレージ・リアルタイム機能を提供します。

### SupabaseがFirebaseより選ばれる理由

| 比較項目 | Supabase | Firebase |
|---------|---------|---------|
| データベース | **PostgreSQL**（SQL） | Firestore（NoSQL） |
| 型安全性 | ◎（自動型生成） | △ |
| セルフホスト | ✅ 可能 | ❌ 不可 |
| 料金 | 無料枠大（500MB DB） | 無料枠あり |
| ベンダーロック | **低い**（標準SQL） | 高い |
| リアルタイム | ✅ | ✅ |
| Edge Functions | ✅（Deno） | ✅（Node.js） |

---

## プロジェクトセットアップ

### 1. Supabaseプロジェクト作成

```bash
# Supabase CLIのインストール
npm install -g supabase

# プロジェクト初期化
supabase init

# ローカル開発環境の起動
supabase start
```

### 2. Next.jsプロジェクト作成

```bash
npx create-next-app@latest my-app --typescript --tailwind --app
cd my-app

# Supabase SDKのインストール
npm install @supabase/supabase-js @supabase/ssr
```

### 3. 環境変数の設定

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Supabaseクライアントの作成

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}
```

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

---

## 型安全なデータベース操作

### 型の自動生成

```bash
# Supabaseのスキーマから TypeScript型を生成
supabase gen types typescript --project-id your-project-id > lib/database.types.ts
```

```typescript
// lib/database.types.ts（自動生成）
export type Database = {
  public: {
    Tables: {
      posts: {
        Row: {
          id: string;
          title: string;
          content: string;
          user_id: string;
          created_at: string;
          published: boolean;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          user_id: string;
          created_at?: string;
          published?: boolean;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          published?: boolean;
        };
      };
    };
  };
};
```

### CRUD操作

```typescript
// app/posts/page.tsx（Server Component）
import { createClient } from '@/lib/supabase/server';

export default async function PostsPage() {
  const supabase = await createClient();

  // 読み取り
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*, profiles(username, avatar_url)')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return <p>エラーが発生しました</p>;
  }

  return (
    <div>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>by {post.profiles.username}</p>
        </article>
      ))}
    </div>
  );
}
```

```typescript
// app/actions/post.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function createPost(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase
    .from('posts')
    .insert({
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      user_id: user.id,
    });

  if (error) {
    return { error: error.message };
  }

  redirect('/posts');
}
```

---

## 認証

### Supabase Auth + Middleware

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // 未認証ユーザーを保護ルートからリダイレクト
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### ログインフォーム

```tsx
// app/login/page.tsx
'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      <h1 className="text-2xl font-bold mb-6">ログイン</h1>

      <button onClick={handleGoogleLogin} className="w-full mb-4 p-3 border rounded">
        Googleでログイン
      </button>

      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="メールアドレス"
          className="w-full p-3 border rounded"
          required
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="パスワード"
          className="w-full p-3 border rounded"
          required
        />
        {error && <p className="text-red-500">{error}</p>}
        <button type="submit" className="w-full p-3 bg-blue-500 text-white rounded">
          ログイン
        </button>
      </form>
    </div>
  );
}
```

---

## Row Level Security（RLS）

RLSは**データベースレベル**でアクセス制御を行うPostgreSQLの機能です。

### ポリシー設定例

```sql
-- RLSを有効化
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 公開記事は誰でも読める
CREATE POLICY "公開記事は誰でも閲覧可能"
  ON posts FOR SELECT
  USING (published = true);

-- 自分の記事のみ全操作可能
CREATE POLICY "自分の記事は全操作可能"
  ON posts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- プロフィールは誰でも閲覧可能
CREATE POLICY "プロフィール閲覧"
  ON profiles FOR SELECT
  USING (true);

-- 自分のプロフィールのみ更新可能
CREATE POLICY "プロフィール更新"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

---

## リアルタイム

```tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function RealtimeMessages({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const supabase = createClient();

  useEffect(() => {
    // 初期データ取得
    supabase
      .from('messages')
      .select('*, profiles(username)')
      .eq('room_id', roomId)
      .order('created_at')
      .then(({ data }) => {
        if (data) setMessages(data);
      });

    // リアルタイム購読
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>
          <strong>{msg.profiles?.username}</strong>: {msg.content}
        </div>
      ))}
    </div>
  );
}
```

---

## Storage（ファイルアップロード）

```typescript
// アバター画像のアップロード
async function uploadAvatar(file: File, userId: string) {
  const supabase = createClient();

  const fileExt = file.name.split('.').pop();
  const filePath = `avatars/${userId}.${fileExt}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    });

  if (error) throw error;

  // 公開URLの取得
  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  return data.publicUrl;
}
```

```sql
-- Storageのアクセスポリシー
CREATE POLICY "アバター閲覧"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "自分のアバターのみアップロード"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'avatars'
    AND auth.uid()::text = (storage.filename(name))
  );
```

---

## Edge Functions

```typescript
// supabase/functions/send-welcome-email/index.ts
import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

serve(async (req) => {
  const { userId } = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: user } = await supabase
    .from('profiles')
    .select('email, username')
    .eq('id', userId)
    .single();

  // メール送信処理
  await sendEmail({
    to: user.email,
    subject: `ようこそ、${user.username}さん！`,
    body: 'サービスへのご登録ありがとうございます。',
  });

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

---

## まとめ

Supabase + Next.jsの組み合わせは、**個人開発からスタートアップまで**幅広いユースケースに対応できます。

| 機能 | Supabaseの提供 |
|------|---------------|
| 認証 | Email/OAuth/Magic Link |
| DB | PostgreSQL + 型自動生成 |
| セキュリティ | Row Level Security |
| リアルタイム | WebSocket購読 |
| ストレージ | S3互換オブジェクトストレージ |
| Edge Functions | Denoランタイム |

**無料枠で十分な開発が可能**（500MB DB、1GB Storage、50,000 MAU）。まずはローカルのSupabase CLIで開発を始め、本番はSupabaseのクラウドにデプロイするのがおすすめです。

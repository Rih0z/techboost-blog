---
title: "Supabase Authで実装するユーザー認証 完全ガイド【2026年版】"
description: "Supabase Authを使った認証システムの構築を完全解説。メール/パスワード、OAuth（Google、GitHub）、Row Level Security、Next.js統合まで実践的なコード例で学べます。"
pubDate: "2026-02-05"
tags: ["Supabase", "認証", "Auth", "Next.js", "OAuth"]
heroImage: '../../assets/thumbnails/supabase-auth-guide.jpg'
---
## Supabase Authとは

Supabase Authは、Supabaseが提供する認証サービスです。Firebase Authenticationの代替として設計されており、オープンソースで完全にセルフホスト可能です。

2026年現在、多くのスタートアップやSaaSプロダクトで採用されており、特にNext.js、Remix、SvelteKitなどのモダンなフレームワークとの相性が抜群です。

### 主な機能

- メール/パスワード認証
- OAuth（Google、GitHub、GitLab、Bitbucket等）
- Magic Link（パスワードレス認証）
- 電話番号認証（SMS）
- Row Level Security（RLS）による行レベルのアクセス制御
- JWT トークンベースのセッション管理

## プロジェクトのセットアップ

### Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)でアカウント作成
2. 新しいプロジェクトを作成
3. Project URLとanon keyを取得

### ローカル環境のセットアップ

```bash
# Next.jsプロジェクトの作成
npx create-next-app@latest my-app --typescript --tailwind --app

# Supabaseクライアントのインストール
cd my-app
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

### 環境変数の設定

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Supabaseクライアントの初期化

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## メール/パスワード認証の実装

### サインアップ

```typescript
// app/signup/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      return;
    }

    // 確認メールを送信した旨を表示
    alert('確認メールを送信しました。メールをご確認ください。');
    router.push('/login');
  };

  return (
    <form onSubmit={handleSignUp} className="max-w-md mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">新規登録</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <input
        type="email"
        placeholder="メールアドレス"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full p-2 border rounded mb-4"
        required
      />

      <input
        type="password"
        placeholder="パスワード（8文字以上）"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-2 border rounded mb-4"
        minLength={8}
        required
      />

      <button
        type="submit"
        className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
      >
        登録
      </button>
    </form>
  );
}
```

### ログイン

```typescript
// app/login/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      return;
    }

    router.push('/dashboard');
  };

  return (
    <form onSubmit={handleLogin} className="max-w-md mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">ログイン</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <input
        type="email"
        placeholder="メールアドレス"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full p-2 border rounded mb-4"
        required
      />

      <input
        type="password"
        placeholder="パスワード"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-2 border rounded mb-4"
        required
      />

      <button
        type="submit"
        className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
      >
        ログイン
      </button>
    </form>
  );
}
```

### ログアウト

```typescript
// components/LogoutButton.tsx
'use client';

import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <button
      onClick={handleLogout}
      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
    >
      ログアウト
    </button>
  );
}
```

## OAuth認証の実装

### Google認証

Supabaseダッシュボードで設定:
1. Authentication > Providers > Google
2. Google Cloud ConsoleでOAuth 2.0クライアントIDを作成
3. Client IDとClient Secretを入力

```typescript
// components/GoogleLoginButton.tsx
'use client';

import { supabase } from '@/lib/supabase';

export default function GoogleLoginButton() {
  const handleGoogleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('Google login error:', error);
    }
  };

  return (
    <button
      onClick={handleGoogleLogin}
      className="w-full bg-white border border-gray-300 text-gray-700 p-2 rounded hover:bg-gray-50 flex items-center justify-center gap-2"
    >
      <img src="/google-icon.svg" alt="Google" className="w-5 h-5" />
      Googleでログイン
    </button>
  );
}
```

### GitHub認証

Supabaseダッシュボードで設定:
1. Authentication > Providers > GitHub
2. GitHubでOAuth Appを作成
3. Client IDとClient Secretを入力

```typescript
// components/GitHubLoginButton.tsx
'use client';

import { supabase } from '@/lib/supabase';

export default function GitHubLoginButton() {
  const handleGitHubLogin = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('GitHub login error:', error);
    }
  };

  return (
    <button
      onClick={handleGitHubLogin}
      className="w-full bg-gray-900 text-white p-2 rounded hover:bg-gray-800"
    >
      GitHubでログイン
    </button>
  );
}
```

### コールバックハンドラー

```typescript
// app/auth/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
}
```

## Row Level Security（RLS）の設定

### ユーザープロファイルテーブルの作成

```sql
-- Supabase SQL Editor で実行
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  avatar_url text,
  created_at timestamp with time zone default now()
);

-- RLSを有効化
alter table public.profiles enable row level security;

-- 自分のプロファイルのみ閲覧可能
create policy "Users can view own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

-- 自分のプロファイルのみ更新可能
create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

-- サインアップ時に自動でプロファイルを作成
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### プロファイルの取得と更新

```typescript
// lib/profile.ts
import { supabase } from './supabase';

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, updates: any) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
  return data;
}
```

## セッション管理

### 認証状態の監視

```typescript
// components/AuthProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

const AuthContext = createContext<{ user: User | null }>({ user: null });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // 初期セッションの取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // セッション変更の監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

### 保護されたページの実装

```typescript
// app/dashboard/page.tsx
'use client';

import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) {
    return <div>読み込み中...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">ダッシュボード</h1>
      <p>ようこそ、{user.email}さん</p>
    </div>
  );
}
```

## まとめ

Supabase Authは、モダンなWeb アプリケーションに必要な認証機能を簡単に実装できる優れたサービスです。特に以下の点で優れています。

- セットアップが非常に簡単
- Row Level Securityによる強固なセキュリティ
- 主要なOAuthプロバイダーのサポート
- Next.jsなどのフレームワークとの統合が容易

まずは小規模なプロジェクトで試し、認証フローを理解してから本格的に導入することをお勧めします。

---
title: 'Supabaseフルスタック開発完全ガイド — 認証・DB・ストレージ・リアルタイム機能を徹底解説'
description: 'Supabaseの全機能を徹底解説。PostgreSQL、認証、ストレージ、リアルタイム、Edge Functionsまで、実践的なコード例とともに完全網羅。Next.js 15との統合パターンやベストプラクティスも紹介します。導入から応用まで段階的に学べます。'
pubDate: '2025-02-06'
tags: ['Supabase', 'PostgreSQL', 'Backend', 'Authentication', 'Database', 'インフラ']
---
Supabaseは「オープンソース版Firebase」として急成長しているBaaS（Backend as a Service）プラットフォームです。2026年現在、Next.js、Remix、SvelteKitなど主要フレームワークとの統合が充実し、フルスタック開発の定番ツールとなっています。

この記事では、Supabaseの全機能を実践的なコード例とともに徹底解説します。

## Supabaseとは

Supabaseは以下の機能を提供するオールインワンプラットフォームです。

- **PostgreSQL Database** - フル機能のリレーショナルデータベース
- **Authentication** - Email、OAuth、Magic Link、電話認証
- **Storage** - ファイルアップロード・管理
- **Realtime** - WebSocketベースのリアルタイム同期
- **Edge Functions** - Deno製のサーバーレス関数
- **Vector Database** - pgvectorによるAI・機械学習対応

すべて無料枠から始められ、PostgreSQLの全機能が使えるのが最大の強みです。

## プロジェクトセットアップ

### Supabaseプロジェクト作成

```bash
# Supabase CLIのインストール
npm install -g supabase

# ログイン
supabase login

# プロジェクト作成
supabase init

# ローカル開発環境の起動
supabase start

# 環境変数を確認
supabase status
```

`supabase start`を実行すると、Docker上にPostgreSQL、API、Studioが立ち上がります。

### Next.js 15プロジェクトとの統合

```bash
npx create-next-app@latest my-supabase-app --typescript --tailwind --app
cd my-supabase-app

# Supabaseクライアントのインストール
npm install @supabase/supabase-js @supabase/ssr
```

### 環境変数の設定

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Supabaseクライアントの初期化

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
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: any) {
          cookieStore.set(name, '', options);
        },
      },
    }
  );
}
```

## Database - PostgreSQL完全活用

Supabaseの心臓部はPostgreSQLです。SQL、RLS、Triggersなど、PostgreSQLの全機能が使えます。

### テーブル作成（SQL）

```sql
-- Supabase Studio > SQL Editor

-- postsテーブル
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- インデックス作成
CREATE INDEX posts_author_id_idx ON posts(author_id);
CREATE INDEX posts_created_at_idx ON posts(created_at DESC);

-- 自動更新タイムスタンプ
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

### Row Level Security (RLS)

RLSはPostgreSQLのセキュリティ機能で、ユーザーごとにデータアクセスを制御できます。

```sql
-- RLSを有効化
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 誰でも公開記事を読める
CREATE POLICY "Public posts are viewable by everyone"
ON posts FOR SELECT
USING (published = true);

-- 自分の記事のみ閲覧可能
CREATE POLICY "Users can view their own posts"
ON posts FOR SELECT
USING (auth.uid() = author_id);

-- 認証済みユーザーは記事を作成可能
CREATE POLICY "Authenticated users can create posts"
ON posts FOR INSERT
WITH CHECK (auth.uid() = author_id);

-- 自分の記事のみ更新可能
CREATE POLICY "Users can update their own posts"
ON posts FOR UPDATE
USING (auth.uid() = author_id);

-- 自分の記事のみ削除可能
CREATE POLICY "Users can delete their own posts"
ON posts FOR DELETE
USING (auth.uid() = author_id);
```

### TypeScript型生成

```bash
# データベーススキーマから型を自動生成
npx supabase gen types typescript --project-id your-project-id > lib/database.types.ts
```

```typescript
// lib/database.types.ts（自動生成）
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      posts: {
        Row: {
          id: string;
          title: string;
          content: string | null;
          author_id: string | null;
          published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content?: string | null;
          author_id?: string | null;
          published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string | null;
          author_id?: string | null;
          published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
```

型定義をクライアントに適用:

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '../database.types';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### CRUD操作

```typescript
// app/posts/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function PostsPage() {
  const supabase = await createServerSupabaseClient();

  // SELECT - 記事一覧取得
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching posts:', error);
    return <div>Error loading posts</div>;
  }

  return (
    <div>
      <h1>記事一覧</h1>
      {posts?.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.content}</p>
        </article>
      ))}
    </div>
  );
}
```

```typescript
// app/actions/posts.ts
'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createPost(formData: FormData) {
  const supabase = await createServerSupabaseClient();

  // ユーザー情報取得
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // INSERT - 記事作成
  const { data, error } = await supabase
    .from('posts')
    .insert({
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      author_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/posts');
  return { success: true, data };
}

export async function updatePost(id: string, formData: FormData) {
  const supabase = await createServerSupabaseClient();

  // UPDATE - 記事更新
  const { data, error } = await supabase
    .from('posts')
    .update({
      title: formData.get('title') as string,
      content: formData.get('content') as string,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/posts');
  return { success: true, data };
}

export async function deletePost(id: string) {
  const supabase = await createServerSupabaseClient();

  // DELETE - 記事削除
  const { error } = await supabase.from('posts').delete().eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/posts');
  return { success: true };
}
```

### 高度なクエリ

```typescript
// JOIN操作
const { data } = await supabase
  .from('posts')
  .select(`
    *,
    author:profiles(name, avatar_url),
    comments(count)
  `)
  .eq('published', true);

// FULL TEXT SEARCH
const { data } = await supabase
  .from('posts')
  .select('*')
  .textSearch('title', 'Next.js');

// 範囲検索
const { data } = await supabase
  .from('posts')
  .select('*')
  .gte('created_at', '2026-01-01')
  .lte('created_at', '2026-12-31');

// ILIKE（部分一致）
const { data } = await supabase
  .from('posts')
  .select('*')
  .ilike('title', '%React%');

// OR条件
const { data } = await supabase
  .from('posts')
  .select('*')
  .or('published.eq.true,author_id.eq.xxx');
```

## Authentication - 認証システム

Supabase Authは多様な認証方法をサポートしています。

### Email/Password認証

```typescript
// app/auth/signup/page.tsx
'use client';

import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const supabase = createClient();

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (error) {
      alert(error.message);
    } else {
      alert('確認メールを送信しました！');
    }
  }

  return (
    <form onSubmit={handleSignUp}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="メールアドレス"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="パスワード"
        required
      />
      <button type="submit">サインアップ</button>
    </form>
  );
}
```

```typescript
// app/auth/login/page.tsx
'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const { error } = await supabase.auth.signInWithPassword({
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    });

    if (error) {
      alert(error.message);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleLogin}>
      <input name="email" type="email" placeholder="メールアドレス" required />
      <input name="password" type="password" placeholder="パスワード" required />
      <button type="submit">ログイン</button>
    </form>
  );
}
```

### OAuth認証（GitHub、Google等）

```typescript
// app/auth/oauth/page.tsx
'use client';

import { createClient } from '@/lib/supabase/client';

export default function OAuthPage() {
  const supabase = createClient();

  async function signInWithGitHub() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (error) alert(error.message);
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) alert(error.message);
  }

  return (
    <div>
      <button onClick={signInWithGitHub}>GitHubでログイン</button>
      <button onClick={signInWithGoogle}>Googleでログイン</button>
    </div>
  );
}
```

### Magic Link認証（パスワードレス）

```typescript
// app/auth/magic-link/page.tsx
'use client';

import { createClient } from '@/lib/supabase/client';

export default function MagicLinkPage() {
  const supabase = createClient();

  async function sendMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const { error } = await supabase.auth.signInWithOtp({
      email: formData.get('email') as string,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (error) {
      alert(error.message);
    } else {
      alert('マジックリンクを送信しました！');
    }
  }

  return (
    <form onSubmit={sendMagicLink}>
      <input name="email" type="email" placeholder="メールアドレス" required />
      <button type="submit">マジックリンクを送信</button>
    </form>
  );
}
```

### 認証コールバック処理

```typescript
// app/auth/callback/route.ts
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(requestUrl.origin);
}
```

### ユーザー情報取得

```typescript
// app/profile/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/auth/login');
  }

  return (
    <div>
      <h1>プロフィール</h1>
      <p>Email: {user.email}</p>
      <p>ID: {user.id}</p>
      <pre>{JSON.stringify(user, null, 2)}</pre>
    </div>
  );
}
```

### ログアウト

```typescript
// app/actions/auth.ts
'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/');
}
```

```typescript
// app/components/SignOutButton.tsx
'use client';

import { signOut } from '@/app/actions/auth';

export function SignOutButton() {
  return (
    <button onClick={() => signOut()}>
      ログアウト
    </button>
  );
}
```

## Storage - ファイル管理

Supabase Storageは、画像、動画、PDF等のファイルを管理できます。

### バケット作成

```sql
-- Supabase Studio > Storage > Create bucket
-- または SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);
```

### ファイルアップロード

```typescript
// app/components/AvatarUpload.tsx
'use client';

import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';

export function AvatarUpload({ userId }: { userId: string }) {
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);

      if (!e.target.files || e.target.files.length === 0) {
        throw new Error('ファイルを選択してください');
      }

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // 公開URLを取得
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

      alert(`アップロード成功！ URL: ${data.publicUrl}`);
    } catch (error) {
      alert('アップロードエラー！');
      console.error(error);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label htmlFor="avatar">
        {uploading ? 'アップロード中...' : 'アバター画像を選択'}
      </label>
      <input
        type="file"
        id="avatar"
        accept="image/*"
        onChange={uploadAvatar}
        disabled={uploading}
      />
    </div>
  );
}
```

### ファイル一覧取得

```typescript
const { data, error } = await supabase
  .storage
  .from('avatars')
  .list('', {
    limit: 100,
    offset: 0,
    sortBy: { column: 'created_at', order: 'desc' },
  });
```

### ファイル削除

```typescript
const { error } = await supabase
  .storage
  .from('avatars')
  .remove(['path/to/file.jpg']);
```

### 画像変換（Resize）

```typescript
const { data } = supabase
  .storage
  .from('avatars')
  .getPublicUrl('path/to/image.jpg', {
    transform: {
      width: 200,
      height: 200,
      resize: 'cover',
    },
  });
```

## Realtime - リアルタイム同期

Supabase Realtimeは、データベース変更をWebSocketでリアルタイム同期できます。

### Realtimeの有効化

```sql
-- テーブルでRealtimeを有効化
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
```

### データベース変更の購読

```typescript
// app/components/RealtimePosts.tsx
'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import type { Database } from '@/lib/database.types';

type Post = Database['public']['Tables']['posts']['Row'];

export function RealtimePosts({ initialPosts }: { initialPosts: Post[] }) {
  const supabase = createClient();
  const [posts, setPosts] = useState(initialPosts);

  useEffect(() => {
    const channel = supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'posts',
        },
        (payload) => {
          console.log('Change received!', payload);

          if (payload.eventType === 'INSERT') {
            setPosts((current) => [payload.new as Post, ...current]);
          } else if (payload.eventType === 'UPDATE') {
            setPosts((current) =>
              current.map((post) =>
                post.id === payload.new.id ? (payload.new as Post) : post
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setPosts((current) => current.filter((post) => post.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <div>
      {posts.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.content}</p>
        </article>
      ))}
    </div>
  );
}
```

### Presence（オンライン状態共有）

```typescript
'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export function OnlineUsers() {
  const supabase = createClient();
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

  useEffect(() => {
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: 'user-id',
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineUsers(Object.values(state).flat());
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <div>
      <h3>オンライン: {onlineUsers.length}人</h3>
    </div>
  );
}
```

## Edge Functions - サーバーレス関数

Supabase Edge FunctionsはDeno製のサーバーレス関数です。

### Edge Function作成

```bash
# 新しい関数を作成
supabase functions new hello-world
```

```typescript
// supabase/functions/hello-world/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { name } = await req.json();

  return new Response(JSON.stringify({ message: `Hello, ${name}!` }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### デプロイ

```bash
supabase functions deploy hello-world
```

### クライアントから呼び出し

```typescript
const { data, error } = await supabase.functions.invoke('hello-world', {
  body: { name: 'World' },
});
```

## ベストプラクティス

### 1. RLSを必ず有効にする

```sql
-- すべてのテーブルでRLSを有効化
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

### 2. インデックスを適切に設定

```sql
-- よく検索するカラムにインデックス
CREATE INDEX posts_author_id_idx ON posts(author_id);
CREATE INDEX posts_created_at_idx ON posts(created_at DESC);

-- 複合インデックス
CREATE INDEX posts_author_published_idx ON posts(author_id, published);
```

### 3. Server Componentでデータフェッチをキャッシュ

```typescript
// app/posts/[id]/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server';

async function getPost(id: string) {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .single();

  return data;
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPost(id);

  return <article>{post.title}</article>;
}
```

### 4. 型安全を徹底

```typescript
// database.types.tsを使って型安全に
import type { Database } from '@/lib/database.types';

type Post = Database['public']['Tables']['posts']['Row'];
type PostInsert = Database['public']['Tables']['posts']['Insert'];
type PostUpdate = Database['public']['Tables']['posts']['Update'];
```

### 5. エラーハンドリング

```typescript
const { data, error } = await supabase.from('posts').select('*');

if (error) {
  console.error('Error:', error);
  // エラー処理
}

// dataは常にnullチェック
if (!data) {
  return <div>データが見つかりません</div>;
}
```

## まとめ

Supabaseはフルスタック開発に必要な機能がすべて揃った強力なプラットフォームです。

- **PostgreSQL** - フル機能のRDB、RLS、Triggers
- **Authentication** - Email、OAuth、Magic Link対応
- **Storage** - ファイル管理・画像変換
- **Realtime** - WebSocketでリアルタイム同期
- **Edge Functions** - Deno製サーバーレス関数
- **Type Safety** - TypeScript型自動生成

Next.js 15との組み合わせで、高速で型安全なフルスタックアプリケーションを簡単に構築できます。無料枠から始められるので、まずは試してみましょう。

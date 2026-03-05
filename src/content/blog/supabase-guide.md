---
title: 'Supabase完全ガイド2026 — Firebase代替のオープンソースBaaS'
description: 'Supabaseの完全ガイド。PostgreSQL、認証、ストレージ、リアルタイム機能を網羅。Firebaseからの移行方法や実践的な使い方を詳しく解説します。'
pubDate: 'Feb 05 2026'
tags: ['Supabase', 'BaaS', 'PostgreSQL', 'Backend', 'Database', 'インフラ']
---

Supabaseは「オープンソース版Firebase」として急速に普及しているBaaS（Backend as a Service）プラットフォームです。PostgreSQLベースのデータベース、認証、ストレージ、リアルタイム機能を提供し、2026年現在、多くの開発者に支持されています。この記事では、Supabaseの全機能を実践的に解説します。

## Supabaseとは

Supabaseは、以下の特徴を持つオープンソースのBaaSです。

- **PostgreSQLベース**: 本格的なRDBMSを使用
- **オープンソース**: GitHubで公開、セルフホスティング可能
- **REST/GraphQL API自動生成**: スキーマから自動でAPIを生成
- **リアルタイム機能**: WebSocketによるデータ同期
- **認証システム**: Email、OAuth、マジックリンクなど
- **ストレージ**: S3互換のファイルストレージ
- **Edge Functions**: Deno製のサーバーレス関数

## クイックスタート

### プロジェクト作成

```bash
# Supabase CLIインストール
npm install -g supabase

# プロジェクト初期化
mkdir my-supabase-app
cd my-supabase-app
supabase init

# ローカル開発環境起動
supabase start

# Supabaseクライアントインストール
npm install @supabase/supabase-js
```

### 基本的な接続設定

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

環境変数（`.env.local`）:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

## データベース操作

### テーブル作成（SQL）

Supabase Studioまたはマイグレーションファイルでテーブルを作成します。

```sql
-- supabase/migrations/20260205000000_create_posts.sql
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS)を有効化
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- ポリシー: 誰でも読める
CREATE POLICY "Posts are viewable by everyone"
  ON posts FOR SELECT
  USING (true);

-- ポリシー: 自分の投稿だけ作成・更新・削除できる
CREATE POLICY "Users can insert their own posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own posts"
  ON posts FOR DELETE
  USING (auth.uid() = author_id);
```

### データの取得（SELECT）

```typescript
// 全件取得
const { data, error } = await supabase
  .from('posts')
  .select('*');

// 特定のカラムのみ取得
const { data, error } = await supabase
  .from('posts')
  .select('id, title, created_at');

// フィルタリング
const { data, error } = await supabase
  .from('posts')
  .select('*')
  .eq('author_id', userId)
  .order('created_at', { ascending: false })
  .limit(10);

// 複雑な条件
const { data, error } = await supabase
  .from('posts')
  .select('*')
  .or('title.ilike.%typescript%,content.ilike.%typescript%')
  .gte('created_at', '2026-01-01')
  .order('created_at', { ascending: false });

// ページネーション
const pageSize = 20;
const page = 1;
const { data, error, count } = await supabase
  .from('posts')
  .select('*', { count: 'exact' })
  .range(page * pageSize, (page + 1) * pageSize - 1);
```

### JOINとリレーション

```sql
-- コメントテーブル
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

```typescript
// 投稿とコメントを同時取得
const { data, error } = await supabase
  .from('posts')
  .select(`
    *,
    comments (
      id,
      content,
      created_at,
      user_id
    )
  `)
  .eq('id', postId)
  .single();

// ネストしたリレーション
const { data, error } = await supabase
  .from('posts')
  .select(`
    *,
    author:author_id (
      id,
      email,
      user_metadata
    ),
    comments (
      id,
      content,
      user:user_id (
        email
      )
    )
  `);
```

### データの挿入（INSERT）

```typescript
// 1件挿入
const { data, error } = await supabase
  .from('posts')
  .insert({
    title: 'My First Post',
    content: 'Hello Supabase!',
    author_id: user.id,
  })
  .select()
  .single();

// 複数件挿入
const { data, error } = await supabase
  .from('posts')
  .insert([
    { title: 'Post 1', content: 'Content 1', author_id: user.id },
    { title: 'Post 2', content: 'Content 2', author_id: user.id },
  ])
  .select();

// upsert（存在すれば更新、なければ挿入）
const { data, error } = await supabase
  .from('posts')
  .upsert({
    id: existingId,
    title: 'Updated Title',
    content: 'Updated Content',
    author_id: user.id,
  })
  .select();
```

### データの更新（UPDATE）

```typescript
// 条件に一致するレコードを更新
const { data, error } = await supabase
  .from('posts')
  .update({ title: 'New Title' })
  .eq('id', postId)
  .select();

// 複数フィールドを更新
const { data, error } = await supabase
  .from('posts')
  .update({
    title: 'Updated Title',
    content: 'Updated Content',
    updated_at: new Date().toISOString(),
  })
  .eq('id', postId)
  .select();
```

### データの削除（DELETE）

```typescript
// 削除
const { error } = await supabase
  .from('posts')
  .delete()
  .eq('id', postId);

// 複数削除
const { error } = await supabase
  .from('posts')
  .delete()
  .in('id', [id1, id2, id3]);
```

## 認証機能

Supabaseの認証システムは非常に強力で、多くの認証方法をサポートしています。

### Email/Password認証

```typescript
// サインアップ
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password',
  options: {
    data: {
      username: 'john_doe',
      full_name: 'John Doe',
    },
  },
});

// サインイン
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure-password',
});

// サインアウト
const { error } = await supabase.auth.signOut();
```

### マジックリンク（パスワードレス認証）

```typescript
// マジックリンクを送信
const { data, error } = await supabase.auth.signInWithOtp({
  email: 'user@example.com',
  options: {
    emailRedirectTo: 'https://example.com/auth/callback',
  },
});
```

### OAuth認証

```typescript
// Google認証
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'https://example.com/auth/callback',
  },
});

// GitHub認証
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'github',
});

// サポートされるプロバイダー:
// - Google, GitHub, GitLab, Bitbucket
// - Facebook, Twitter, Discord, Slack
// - Apple, Microsoft, Notion, Spotify
// - Twitch, LinkedIn, WorkOS
```

### セッション管理

```typescript
// 現在のユーザー取得
const { data: { user } } = await supabase.auth.getUser();

// セッション取得
const { data: { session } } = await supabase.auth.getSession();

// 認証状態の監視
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event);
  if (event === 'SIGNED_IN') {
    console.log('User signed in:', session?.user);
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out');
  }
});
```

### パスワードリセット

```typescript
// パスワードリセットメール送信
const { data, error } = await supabase.auth.resetPasswordForEmail(
  'user@example.com',
  {
    redirectTo: 'https://example.com/reset-password',
  }
);

// 新しいパスワードを設定
const { data, error } = await supabase.auth.updateUser({
  password: 'new-secure-password',
});
```

### React/Next.jsでの認証フック

```typescript
// hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初期セッション取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
```

使用例:

```typescript
// app/dashboard/page.tsx
'use client';
import { useAuth } from '@/hooks/useAuth';
import { redirect } from 'next/navigation';

export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) redirect('/login');

  return <div>Welcome, {user.email}!</div>;
}
```

## ストレージ機能

Supabase Storageは、S3互換のファイルストレージを提供します。

### バケット作成

```typescript
// バケット作成（管理画面または）
const { data, error } = await supabase.storage.createBucket('avatars', {
  public: false, // true = 誰でもアクセス可能
  fileSizeLimit: 1024 * 1024 * 2, // 2MB
  allowedMimeTypes: ['image/png', 'image/jpeg'],
});
```

### ファイルアップロード

```typescript
// ファイルアップロード
async function uploadAvatar(file: File, userId: string) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  // 公開URLを取得
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  return publicUrl;
}
```

### ファイルダウンロード

```typescript
// ファイルダウンロード
const { data, error } = await supabase.storage
  .from('avatars')
  .download('avatars/user-123.png');

// Blob URLを作成
if (data) {
  const url = URL.createObjectURL(data);
  // <img src={url} />
}
```

### ファイル削除

```typescript
// 1ファイル削除
const { data, error } = await supabase.storage
  .from('avatars')
  .remove(['avatars/user-123.png']);

// 複数ファイル削除
const { data, error } = await supabase.storage
  .from('avatars')
  .remove(['avatars/user-1.png', 'avatars/user-2.png']);
```

### React での画像アップロード例

```typescript
'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export function AvatarUpload({ userId }: { userId: string }) {
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (error) {
      alert('Upload failed: ' + error.message);
    } else {
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
    }

    setUploading(false);
  };

  return (
    <div>
      {avatarUrl && <img src={avatarUrl} alt="Avatar" className="w-20 h-20" />}
      <input type="file" onChange={uploadAvatar} disabled={uploading} />
      {uploading && <p>Uploading...</p>}
    </div>
  );
}
```

## リアルタイム機能

Supabaseのリアルタイム機能を使うと、データベースの変更をリアルタイムで購読できます。

### Realtime購読の基本

```typescript
// テーブルの変更を監視
const channel = supabase
  .channel('posts-channel')
  .on(
    'postgres_changes',
    {
      event: '*', // INSERT, UPDATE, DELETE, *
      schema: 'public',
      table: 'posts',
    },
    (payload) => {
      console.log('Change received!', payload);
    }
  )
  .subscribe();

// 購読解除
channel.unsubscribe();
```

### INSERT/UPDATE/DELETE別の処理

```typescript
const channel = supabase
  .channel('posts-changes')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'posts' },
    (payload) => {
      console.log('New post:', payload.new);
    }
  )
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'posts' },
    (payload) => {
      console.log('Updated post:', payload.new);
      console.log('Old post:', payload.old);
    }
  )
  .on(
    'postgres_changes',
    { event: 'DELETE', schema: 'public', table: 'posts' },
    (payload) => {
      console.log('Deleted post:', payload.old);
    }
  )
  .subscribe();
```

### フィルタリング

```typescript
// 特定の条件でフィルタ
const channel = supabase
  .channel('my-posts')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'posts',
      filter: `author_id=eq.${userId}`,
    },
    (payload) => {
      console.log('My post changed:', payload);
    }
  )
  .subscribe();
```

### Reactでのリアルタイムデータ表示

```typescript
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Post = {
  id: string;
  title: string;
  content: string;
  created_at: string;
};

export function RealtimePosts() {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    // 初期データ取得
    const fetchPosts = async () => {
      const { data } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
      setPosts(data || []);
    };
    fetchPosts();

    // リアルタイム購読
    const channel = supabase
      .channel('posts-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          setPosts((prev) => [payload.new as Post, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'posts' },
        (payload) => {
          setPosts((prev) =>
            prev.map((post) =>
              post.id === payload.new.id ? (payload.new as Post) : post
            )
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'posts' },
        (payload) => {
          setPosts((prev) => prev.filter((post) => post.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

## Edge Functions

Supabase Edge Functionsは、Deno製のサーバーレス関数です。

### Edge Function作成

```bash
# Edge Function作成
supabase functions new hello-world
```

```typescript
// supabase/functions/hello-world/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { name } = await req.json();
  const data = {
    message: `Hello ${name}!`,
  };

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### Edge Functionデプロイ

```bash
# デプロイ
supabase functions deploy hello-world

# ローカルで実行
supabase functions serve hello-world
```

### Edge Functionを呼び出す

```typescript
const { data, error } = await supabase.functions.invoke('hello-world', {
  body: { name: 'Supabase' },
});

console.log(data); // { message: "Hello Supabase!" }
```

### 認証付きEdge Function

```typescript
// supabase/functions/protected/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    }
  );

  // ユーザー認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ message: `Hello ${user.email}!` }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

## 型安全性（TypeScript）

### データベース型の自動生成

```bash
# 型定義を自動生成
supabase gen types typescript --project-id your-project-id > types/supabase.ts
```

生成された型を使う:

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 型安全なクエリ
const { data } = await supabase.from('posts').select('*');
// dataの型は Database['public']['Tables']['posts']['Row'][]
```

## まとめ

Supabaseは、以下のような特徴を持つ強力なBaaSです。

**主な機能:**
- PostgreSQLベースのデータベース
- Row Level Securityによる柔軟な権限管理
- Email/OAuth/マジックリンク認証
- S3互換のストレージ
- リアルタイムデータ購読
- Deno製Edge Functions
- TypeScript型生成

**Supabaseが適しているケース:**
- 本格的なRDBMSが必要なアプリ
- リアルタイム性が重要なアプリ
- オープンソース/セルフホスティングを重視
- PostgreSQLの強力な機能を使いたい

**料金:**
- 無料プラン: 500MB DB、1GB ストレージ、50万 Edge Function実行
- Proプラン: $25/月〜

Supabaseは、Firebaseの代替として、またはそれ以上の機能を持つBaaSとして、2026年現在、最も注目されているプラットフォームの一つです。

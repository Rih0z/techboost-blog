---
title: 'Supabase完全ガイド — PostgreSQL・認証・Storage・Realtime・Edge Functions'
description: 'SupabaseでFirebase代替のバックエンドを構築する完全ガイド。PostgreSQL・Row Level Security・認証（Magic Link/OAuth）・Storage・Realtime・Edge Functions・Next.js統合まで実装例付きで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-4.jpg'
tags: ['Supabase', 'PostgreSQL', 'Firebase', 'TypeScript', 'バックエンド']
---

「Firebaseは使いやすいが、SQLが使えない」「データが増えるとNoSQLの設計限界が見えてきた」——そんな悩みを持つ開発者にとって、**Supabase**は理想的な回答を提示している。オープンソースのFirebase代替として急速に成長し、2024年時点で月間アクティブユーザー100万人を超えるプラットフォームになった。

本記事では、Supabaseのコア機能であるPostgreSQL・Row Level Security・認証・Storage・Realtime・Edge Functionsを、TypeScript/Next.js実装例とともに徹底解説する。

---

## 1. Supabaseとは — Firebaseとの比較・PostgreSQLベースの強み

### Supabaseの基本思想

Supabaseは「**オープンソースのFirebase代替**」として2020年にローンチされた。その最大の特徴は、バックエンドの核心にPostgreSQLを据えている点だ。Firebase（Firestore）がNoSQLドキュメントDBを採用するのに対し、Supabaseはリレーショナルデータベースの王道、PostgreSQLを採用する。

```
Supabaseのアーキテクチャ:
┌─────────────────────────────────────────────┐
│              Supabase Platform               │
├──────────────┬──────────────┬───────────────┤
│  PostgreSQL  │  PostgREST   │   GoTrue      │
│  (Database)  │  (REST API)  │   (Auth)      │
├──────────────┼──────────────┼───────────────┤
│  Storage     │  Realtime    │  Edge Funcs   │
│  (S3互換)    │  (WebSocket) │   (Deno)      │
└──────────────┴──────────────┴───────────────┘
```

これらすべてがオープンソースコンポーネントで構成されており、セルフホストも可能だ。ベンダーロックインを避けたい企業にとっても魅力的な選択肢となっている。

### FirebaseとSupabaseの比較

| 項目 | Supabase | Firebase |
|------|----------|----------|
| データベース | PostgreSQL（リレーショナル） | Firestore（NoSQL） |
| クエリ能力 | SQL全機能（JOIN・集計・全文検索） | 限定的（サブコレクション・複合クエリ制限） |
| スケーリング | PostgreSQLスケール | Googleインフラ（自動） |
| オープンソース | 完全オープンソース | クローズドソース |
| セルフホスト | 可能（Docker） | 不可 |
| 認証 | GoTrue（メール・OAuth・MFA） | Firebase Auth |
| ストレージ | S3互換ストレージ | Cloud Storage |
| リアルタイム | Postgres Changes・Broadcast | Firestore リアルタイム |
| Functions | Edge Functions（Deno） | Cloud Functions（Node.js） |
| 無料枠 | 2プロジェクト・500MB DB | 充実（Spark Plan） |
| 型安全 | TypeScript型自動生成 | 限定的 |

### PostgreSQLを選ぶ理由

PostgreSQLベースであることの最大の恩恵は、**SQLの全機能が使えること**だ。

```sql
-- Firebaseでは不可能なJOIN + 集計クエリ
SELECT
  users.name,
  COUNT(orders.id) AS order_count,
  SUM(orders.amount) AS total_amount,
  AVG(orders.amount) AS avg_amount
FROM users
LEFT JOIN orders ON users.id = orders.user_id
WHERE orders.created_at >= NOW() - INTERVAL '30 days'
GROUP BY users.id, users.name
HAVING COUNT(orders.id) > 5
ORDER BY total_amount DESC
LIMIT 10;
```

さらに、pg_trgm（全文検索）・PostGIS（地理情報）・pgvector（ベクトル検索）などPostgreSQLエクステンションをそのまま活用できる。

---

## 2. プロジェクト作成・ローカル開発環境

### Supabase CLIのインストール

```bash
# macOS（Homebrew）
brew install supabase/tap/supabase

# npm経由（全プラットフォーム）
npm install -g supabase

# バージョン確認
supabase --version
```

### ローカル開発環境の初期化

```bash
# プロジェクトディレクトリ作成
mkdir my-supabase-app && cd my-supabase-app

# Supabaseプロジェクト初期化
supabase init

# 生成されるディレクトリ構造:
# supabase/
# ├── config.toml        ← 設定ファイル
# ├── migrations/        ← SQLマイグレーション
# └── seed.sql           ← 初期データ
```

### Dockerでローカルサーバー起動

```bash
# Dockerが必要（Docker Desktop推奨）
supabase start

# 起動完了後の出力例:
# Started supabase local development setup.
#
#          API URL: http://127.0.0.1:54321
#      GraphQL URL: http://127.0.0.1:54321/graphql/v1
#   S3 Storage URL: http://127.0.0.1:54321/storage/v1/s3
#          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
#      Studio URL: http://127.0.0.1:54323
#    Inbucket URL: http://127.0.0.1:54324  ← メールプレビュー
#        anon key: eyJh...
#  service_role key: eyJh...
```

ローカルで起動すると、Supabase Studio（管理画面）が`http://127.0.0.1:54323`で利用可能になる。本番と同一の環境でテストできるため、開発効率が大幅に向上する。

### Next.jsプロジェクトとの統合初期設定

```bash
# Next.jsプロジェクト作成
npx create-next-app@latest my-app --typescript --tailwind --app

cd my-app

# Supabaseクライアントインストール
npm install @supabase/supabase-js @supabase/ssr

# 環境変数設定
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
EOF
```

---

## 3. データベース設計（テーブル・外部キー・RLS）

### マイグレーションファイルの作成

```bash
# 新規マイグレーション作成
supabase migration new create_users_and_posts
```

生成された`supabase/migrations/20260220000000_create_users_and_posts.sql`を編集する:

```sql
-- ユーザープロフィールテーブル
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- カテゴリテーブル
CREATE TABLE public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 投稿テーブル
CREATE TABLE public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  excerpt TEXT,
  cover_image_url TEXT,
  published BOOLEAN DEFAULT FALSE NOT NULL,
  published_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0 NOT NULL,
  -- 全文検索用（後述）
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('japanese', COALESCE(title, '') || ' ' || COALESCE(content, ''))
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- コメントテーブル
CREATE TABLE public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- インデックス
CREATE INDEX posts_author_id_idx ON public.posts(author_id);
CREATE INDEX posts_category_id_idx ON public.posts(category_id);
CREATE INDEX posts_published_idx ON public.posts(published, published_at DESC);
CREATE INDEX posts_search_vector_idx ON public.posts USING GIN(search_vector);
CREATE INDEX comments_post_id_idx ON public.comments(post_id);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 4. Row Level Security（RLS policies・認証連携）

RLSはSupabaseの**セキュリティの核心**だ。データベースレベルでアクセス制御を行うため、APIレイヤーを完全にバイパスされてもデータが守られる。

### RLSの有効化とポリシー設定

```sql
-- RLSを有効化
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- profiles テーブルのRLSポリシー
-- ============================================

-- 全ユーザーはプロフィールを閲覧可能
CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT
  USING (true);

-- 自分のプロフィールのみ更新可能
CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 認証時に自動でプロフィール作成（INSERT）
CREATE POLICY "profiles_insert_policy"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- posts テーブルのRLSポリシー
-- ============================================

-- 公開済み投稿は誰でも閲覧可能
CREATE POLICY "posts_select_published_policy"
  ON public.posts FOR SELECT
  USING (published = true);

-- 自分の下書きも閲覧可能
CREATE POLICY "posts_select_own_drafts_policy"
  ON public.posts FOR SELECT
  USING (auth.uid() = author_id);

-- ログインユーザーは投稿作成可能
CREATE POLICY "posts_insert_policy"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- 自分の投稿のみ更新可能
CREATE POLICY "posts_update_policy"
  ON public.posts FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- 自分の投稿のみ削除可能
CREATE POLICY "posts_delete_policy"
  ON public.posts FOR DELETE
  USING (auth.uid() = author_id);

-- ============================================
-- 管理者ロール（カスタムクレーム活用）
-- ============================================

-- JWTのapp_metadataからロール取得
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 管理者は全投稿を管理可能
CREATE POLICY "posts_admin_policy"
  ON public.posts FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
```

### ユーザー作成時に自動でプロフィールを生成するトリガー

```sql
-- auth.usersにINSERTされたらprofilesにも自動作成
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## 5. Supabase Client（TypeScript型生成・型安全クエリ）

### データベース型の自動生成

```bash
# ローカル環境から型生成
supabase gen types typescript --local > src/types/database.types.ts

# 本番プロジェクトから型生成
supabase gen types typescript --project-id your-project-id > src/types/database.types.ts
```

生成される型ファイルの構造:

```typescript
// src/types/database.types.ts（自動生成）
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          website: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          website?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          full_name?: string | null
          // ...
        }
      }
      posts: {
        Row: {
          id: string
          author_id: string
          category_id: string | null
          title: string
          slug: string
          content: string | null
          published: boolean
          published_at: string | null
          view_count: number
          created_at: string
          updated_at: string
        }
        // Insert, Update...
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      search_posts: {
        Args: { query: string; limit_count: number }
        Returns: Database['public']['Tables']['posts']['Row'][]
      }
    }
  }
}
```

### Supabaseクライアントの設定

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}
```

### 型安全なクエリの実装

```typescript
// src/lib/queries/posts.ts
import { createClient } from '@/lib/supabase/client'

// 型安全な投稿一覧取得
export async function getPublishedPosts(page = 1, perPage = 10) {
  const supabase = createClient()
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const { data, error, count } = await supabase
    .from('posts')
    .select(`
      id,
      title,
      slug,
      excerpt,
      cover_image_url,
      published_at,
      view_count,
      profiles (
        id,
        username,
        avatar_url
      ),
      categories (
        id,
        name,
        slug
      )
    `, { count: 'exact' })
    .eq('published', true)
    .order('published_at', { ascending: false })
    .range(from, to)

  if (error) throw error

  return { posts: data, total: count }
}

// 単一投稿取得（スラッグ検索）
export async function getPostBySlug(slug: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      profiles (*),
      categories (*),
      comments (
        id,
        content,
        created_at,
        profiles (
          id,
          username,
          avatar_url
        )
      )
    `)
    .eq('slug', slug)
    .eq('published', true)
    .single()

  if (error) throw error
  return data
}

// 閲覧数のインクリメント
export async function incrementViewCount(postId: string) {
  const supabase = createClient()

  await supabase.rpc('increment_view_count', { post_id: postId })
}
```

---

## 6. 認証（Magic Link・Google OAuth・GitHub OAuth・パスワード）

### Magic Link認証

```typescript
// src/components/auth/MagicLinkForm.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function MagicLinkForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // メール内のリダイレクト先
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        // ユーザーが存在しない場合は新規作成しない（招待制の場合）
        // shouldCreateUser: false,
      },
    })

    if (error) {
      console.error('Magic Link送信エラー:', error)
      setStatus('error')
    } else {
      setStatus('sent')
    }
  }

  if (status === 'sent') {
    return (
      <div className="text-center p-8">
        <h2 className="text-xl font-semibold mb-2">メールを確認してください</h2>
        <p className="text-gray-600">
          {email} にログインリンクを送信しました。
          メール内のリンクをクリックしてログインしてください。
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="メールアドレス"
        required
        className="w-full border rounded px-3 py-2"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full bg-green-600 text-white rounded px-4 py-2"
      >
        {status === 'loading' ? '送信中...' : 'ログインリンクを送信'}
      </button>
    </form>
  )
}
```

### Google・GitHub OAuth

```typescript
// src/components/auth/OAuthButtons.tsx
'use client'

import { createClient } from '@/lib/supabase/client'

export function OAuthButtons() {
  const supabase = createClient()

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'openid email profile',
        queryParams: {
          // Googleアカウント選択画面を常に表示
          prompt: 'select_account',
        },
      },
    })
  }

  const signInWithGitHub = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'user:email read:user',
      },
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={signInWithGoogle}
        className="flex items-center gap-3 border rounded px-4 py-2 hover:bg-gray-50"
      >
        <GoogleIcon />
        Googleでログイン
      </button>
      <button
        onClick={signInWithGitHub}
        className="flex items-center gap-3 bg-gray-900 text-white rounded px-4 py-2 hover:bg-gray-800"
      >
        <GitHubIcon />
        GitHubでログイン
      </button>
    </div>
  )
}
```

### メール・パスワード認証

```typescript
// src/lib/auth/actions.ts
'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signUp(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const username = formData.get('username') as string

  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        full_name: formData.get('full_name') as string,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: '確認メールを送信しました。メールを確認してください。' }
}

export async function signIn(formData: FormData) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  redirect('/')
}
```

---

## 7. Server-side認証（Next.js App Router・SSR）

### 認証コールバックルート

```typescript
// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}
```

### Middlewareでのセッション管理

```typescript
// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // セッションのリフレッシュ（重要: 必ずgetUser()を呼ぶ）
  const { data: { user } } = await supabase.auth.getUser()

  // 保護されたルートへのアクセス制御
  const protectedPaths = ['/dashboard', '/admin', '/profile/edit']
  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath && !user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // 管理者ルートの保護
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user!.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/403', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
```

### Server Componentでのデータ取得

```typescript
// src/app/dashboard/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()

  // サーバーサイドでユーザー確認（getUser()はAPIを叩いて検証するため安全）
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // ユーザーの投稿を取得（RLSにより自動的に本人の投稿のみ返される）
  const { data: posts } = await supabase
    .from('posts')
    .select('id, title, slug, published, created_at, view_count')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div>
      <h1>ダッシュボード</h1>
      <p>ようこそ、{user.email}</p>
      {/* posts一覧の表示 */}
    </div>
  )
}
```

---

## 8. Storage（ファイルアップロード・署名付きURL・変換API）

### バケット設定とRLS

```sql
-- Storage RLSポリシーの設定
-- Supabase管理画面またはマイグレーションで設定

-- アバター画像バケット（公開）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,           -- 公開バケット
  5242880,        -- 5MB制限
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- 投稿画像バケット（認証必須）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-images',
  'post-images',
  false,          -- 非公開バケット
  10485760,       -- 10MB制限
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Storage RLSポリシー（アバター）
CREATE POLICY "avatars_upload_policy"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "avatars_update_policy"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "avatars_select_policy"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
```

### ファイルアップロードの実装

```typescript
// src/components/upload/AvatarUpload.tsx
'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AvatarUploadProps {
  userId: string
  currentAvatarUrl?: string
  onUploadComplete: (url: string) => void
}

export function AvatarUpload({ userId, currentAvatarUrl, onUploadComplete }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const supabase = createClient()

  const handleUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // ファイルサイズチェック（5MB）
    if (file.size > 5 * 1024 * 1024) {
      alert('ファイルサイズは5MB以下にしてください')
      return
    }

    setUploading(true)
    setProgress(0)

    try {
      // ユニークなファイルパス生成
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${userId}/${fileName}`

      // アップロード
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      // 公開URLを取得
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Supabase Image Transformation API（プレミアム機能）
      // const transformedUrl = supabase.storage
      //   .from('avatars')
      //   .getPublicUrl(filePath, {
      //     transform: {
      //       width: 200,
      //       height: 200,
      //       resize: 'cover',
      //       format: 'webp',
      //       quality: 80,
      //     },
      //   }).data.publicUrl

      // プロフィール更新
      await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', userId)

      onUploadComplete(data.publicUrl)

      // 古いアバターを削除
      if (currentAvatarUrl) {
        const oldPath = currentAvatarUrl.split('/avatars/')[1]
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath])
        }
      }
    } catch (error) {
      console.error('アップロードエラー:', error)
      alert('アップロードに失敗しました')
    } finally {
      setUploading(false)
      setProgress(100)
    }
  }, [userId, currentAvatarUrl, supabase, onUploadComplete])

  return (
    <div className="flex flex-col items-center gap-4">
      {currentAvatarUrl && (
        <img src={currentAvatarUrl} alt="アバター" className="w-24 h-24 rounded-full object-cover" />
      )}
      <label className="cursor-pointer bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700">
        {uploading ? `アップロード中... ${progress}%` : '画像を選択'}
        <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
      </label>
    </div>
  )
}

// 署名付きURLの生成（非公開バケット向け）
export async function getSignedUrl(bucket: string, path: string, expiresIn = 3600) {
  const supabase = createClient()

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error) throw error
  return data.signedUrl
}

// 複数ファイルの一括ダウンロード用署名付きURL
export async function getSignedUrls(bucket: string, paths: string[]) {
  const supabase = createClient()

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(paths, 3600)

  if (error) throw error
  return data
}
```

---

## 9. Realtime（Postgres Changes・Broadcast・Presence）

Supabaseのリアルタイム機能はWebSocketを通じて提供され、3つのチャンネルタイプをサポートする。

### Postgres Changes（DBの変更をリアルタイム受信）

```typescript
// src/hooks/useRealtimeComments.ts
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Comment = Database['public']['Tables']['comments']['Row']

export function useRealtimeComments(postId: string, initialComments: Comment[]) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`comments:${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          const newComment = payload.new as Comment
          setComments((prev) => [...prev, newComment])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          const deletedId = payload.old.id
          setComments((prev) => prev.filter((c) => c.id !== deletedId))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [postId, supabase])

  return comments
}
```

### Broadcast（任意データの低遅延配信）

```typescript
// src/hooks/useCollaborativeEditor.ts
// 複数ユーザーでのリアルタイム共同編集
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface CursorPosition {
  userId: string
  username: string
  line: number
  column: number
}

export function useCollaborativeEditor(documentId: string) {
  const [cursors, setCursors] = useState<CursorPosition[]>([])
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    const channel = supabase.channel(`document:${documentId}`, {
      config: {
        broadcast: { self: false }, // 自分自身には送信しない
      },
    })

    channelRef.current = channel

    channel
      .on('broadcast', { event: 'cursor_move' }, ({ payload }: { payload: CursorPosition }) => {
        setCursors((prev) => {
          const existing = prev.findIndex((c) => c.userId === payload.userId)
          if (existing >= 0) {
            return prev.map((c, i) => (i === existing ? payload : c))
          }
          return [...prev, payload]
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [documentId, supabase])

  const broadcastCursorMove = (position: Omit<CursorPosition, 'userId' | 'username'>) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'cursor_move',
      payload: position,
    })
  }

  return { cursors, broadcastCursorMove }
}
```

### Presence（オンラインユーザー管理）

```typescript
// src/hooks/usePresence.ts
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UserPresence {
  userId: string
  username: string
  avatarUrl: string
  onlineAt: string
}

export function usePresence(roomId: string, currentUser: UserPresence) {
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([])
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase.channel(`room:${roomId}`)

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<UserPresence>()
        const users = Object.values(state).flat()
        setOnlineUsers(users)
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('ユーザーが参加:', newPresences)
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('ユーザーが退出:', leftPresences)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(currentUser)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, currentUser, supabase])

  return onlineUsers
}
```

---

## 10. Edge Functions（Deno・OpenAI連携・Webhook受信）

### Edge Functionの作成と構造

```bash
# Edge Function作成
supabase functions new openai-completion

# supabase/functions/openai-completion/index.ts が生成される
```

### OpenAI連携のEdge Function

```typescript
// supabase/functions/openai-completion/index.ts
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORSプリフライト
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Supabaseクライアント（JWTからユーザー取得）
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // 認証確認
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: '認証が必要です' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { prompt, postId } = await req.json()

    // OpenAI APIコール
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'あなたは技術ブログ記事の編集アシスタントです。日本語で回答してください。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    })

    const result = completion.choices[0].message.content

    // 使用量をDBに記録
    await supabaseClient
      .from('ai_usage_logs')
      .insert({
        user_id: user.id,
        post_id: postId,
        prompt_tokens: completion.usage?.prompt_tokens,
        completion_tokens: completion.usage?.completion_tokens,
      })

    return new Response(
      JSON.stringify({ result, usage: completion.usage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### Webhook受信（Stripe決済連携）

```typescript
// supabase/functions/stripe-webhook/index.ts
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // サービスロールキー使用（RLSバイパス）
  )

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.CheckoutSession
      const userId = session.metadata?.user_id

      if (userId) {
        await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            status: 'active',
            plan: session.metadata?.plan ?? 'pro',
          })
      }
      break
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      await supabase
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('stripe_subscription_id', subscription.id)
      break
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

### Edge Functionのデプロイ

```bash
# ローカルでの実行テスト
supabase functions serve openai-completion --env-file .env.local

# シークレットの設定
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# 本番デプロイ
supabase functions deploy openai-completion
supabase functions deploy stripe-webhook

# デプロイ済み関数の一覧
supabase functions list
```

---

## 11. Database Functions・Triggers（pg_functions）

### 複雑なビジネスロジックをDBレイヤーで実装

```sql
-- 閲覧数のアトミックなインクリメント
CREATE OR REPLACE FUNCTION increment_view_count(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.posts
  SET view_count = view_count + 1
  WHERE id = post_id AND published = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ユーザー統計を集計するFunction
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
RETURNS TABLE (
  total_posts BIGINT,
  published_posts BIGINT,
  total_views BIGINT,
  total_comments BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(p.id) AS total_posts,
    COUNT(p.id) FILTER (WHERE p.published = true) AS published_posts,
    COALESCE(SUM(p.view_count), 0) AS total_views,
    COUNT(c.id) AS total_comments
  FROM public.profiles pr
  LEFT JOIN public.posts p ON p.author_id = pr.id
  LEFT JOIN public.comments c ON c.post_id = p.id
  WHERE pr.id = user_uuid
  GROUP BY pr.id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 投稿公開時に通知を送るトリガー
CREATE OR REPLACE FUNCTION notify_post_published()
RETURNS TRIGGER AS $$
DECLARE
  author_name TEXT;
BEGIN
  -- 公開状態に変わった場合のみ実行
  IF NEW.published = true AND (OLD.published = false OR OLD.published IS NULL) THEN
    NEW.published_at = NOW();

    -- 著者名取得
    SELECT username INTO author_name
    FROM public.profiles
    WHERE id = NEW.author_id;

    -- 通知テーブルに挿入（フォロワーへの通知など）
    INSERT INTO public.notifications (
      type,
      title,
      body,
      data
    )
    VALUES (
      'post_published',
      '新しい記事が公開されました',
      author_name || 'さんが「' || NEW.title || '」を公開しました',
      jsonb_build_object(
        'post_id', NEW.id,
        'post_slug', NEW.slug,
        'author_id', NEW.author_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_post_published
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION notify_post_published();
```

### TypeScriptからのRPC呼び出し

```typescript
// src/lib/queries/rpc.ts
import { createClient } from '@/lib/supabase/client'

// get_user_statsの型安全な呼び出し
export async function getUserStats(userId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .rpc('get_user_stats', { user_uuid: userId })
    .single()

  if (error) throw error
  return data
}
```

---

## 12. Full-text Search（pg_trgm・tsvector）

### PostgreSQLの全文検索機能

```sql
-- 日本語全文検索の設定（pgroongaが理想だが、標準機能で実装）
-- postsテーブルのsearch_vectorは既に定義済み（テーブル定義参照）

-- 全文検索用Function
CREATE OR REPLACE FUNCTION search_posts(
  query TEXT,
  limit_count INTEGER DEFAULT 10,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  excerpt TEXT,
  cover_image_url TEXT,
  published_at TIMESTAMPTZ,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.title,
    p.slug,
    p.excerpt,
    p.cover_image_url,
    p.published_at,
    ts_rank(p.search_vector, websearch_to_tsquery('japanese', query)) AS rank
  FROM public.posts p
  WHERE
    p.published = true
    AND p.search_vector @@ websearch_to_tsquery('japanese', query)
  ORDER BY rank DESC, p.published_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- pg_trgmによるあいまい検索（タイポに強い）
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX posts_title_trgm_idx ON public.posts USING GIN(title gin_trgm_ops);

CREATE OR REPLACE FUNCTION fuzzy_search_posts(query TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  similarity REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.title,
    p.slug,
    similarity(p.title, query) AS similarity
  FROM public.posts p
  WHERE
    p.published = true
    AND similarity(p.title, query) > 0.2
  ORDER BY similarity DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

### Next.jsでの検索UI実装

```typescript
// src/app/search/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server'

interface SearchPageProps {
  searchParams: Promise<{ q?: string; page?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const query = params.q ?? ''
  const page = parseInt(params.page ?? '1')
  const perPage = 10

  const supabase = await createServerSupabaseClient()

  const { data: results, error } = await supabase
    .rpc('search_posts', {
      query,
      limit_count: perPage,
      offset_count: (page - 1) * perPage,
    })

  return (
    <div>
      <h1>「{query}」の検索結果</h1>
      {error && <p>検索エラー: {error.message}</p>}
      {results?.length === 0 && <p>検索結果が見つかりませんでした</p>}
      <ul>
        {results?.map((post) => (
          <li key={post.id}>
            <a href={`/posts/${post.slug}`}>
              <h2>{post.title}</h2>
              <p>{post.excerpt}</p>
              <span>関連度: {(post.rank * 100).toFixed(1)}%</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

---

## 13. 本番デプロイ（マイグレーション・バックアップ・監視）

### リモートプロジェクトへのリンクとマイグレーション

```bash
# Supabase CLIでリモートプロジェクトにリンク
supabase link --project-ref your-project-ref

# ローカルとリモートのスキーマ差分確認
supabase db diff

# マイグレーションをリモートに適用
supabase db push

# 本番DBの状態をローカルに同期（危険: 本番データが上書きされる）
# supabase db pull

# マイグレーション履歴の確認
supabase migration list
```

### GitHub Actionsによる自動デプロイ

```yaml
# .github/workflows/supabase-deploy.yml
name: Supabase Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
      PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}

    steps:
      - uses: actions/checkout@v4

      - name: Supabase CLI セットアップ
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: リモートプロジェクトにリンク
        run: supabase link --project-ref $PROJECT_ID

      - name: マイグレーション実行
        run: supabase db push

      - name: Edge Functions デプロイ
        run: |
          supabase functions deploy openai-completion
          supabase functions deploy stripe-webhook
```

### バックアップ戦略

```bash
# 手動バックアップ（pg_dump経由）
SUPABASE_DB_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# スキーマのみバックアップ
pg_dump --schema-only "$SUPABASE_DB_URL" > backup_schema_$(date +%Y%m%d).sql

# データ含む完全バックアップ
pg_dump "$SUPABASE_DB_URL" > backup_full_$(date +%Y%m%d).sql

# 特定テーブルのみバックアップ
pg_dump -t public.posts -t public.profiles "$SUPABASE_DB_URL" > backup_posts_$(date +%Y%m%d).sql
```

Supabase Proプラン以上では、**Point-in-Time Recovery（PITR）**が利用可能で、過去7日間の任意の時点に復元できる。本番環境では必須の機能だ。

### パフォーマンス監視とクエリ最適化

```sql
-- スロークエリの特定
-- Supabase管理画面 > Database > Query Performance で確認

-- 実行計画の確認（EXPLAINを活用）
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT p.*, pr.username
FROM public.posts p
JOIN public.profiles pr ON p.author_id = pr.id
WHERE p.published = true
ORDER BY p.published_at DESC
LIMIT 10;

-- インデックス使用状況の確認
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- テーブルサイズとブロート確認
SELECT
  relname AS table_name,
  pg_size_pretty(pg_total_relation_size(oid)) AS total_size,
  pg_size_pretty(pg_relation_size(oid)) AS table_size,
  pg_size_pretty(pg_total_relation_size(oid) - pg_relation_size(oid)) AS index_size
FROM pg_class
WHERE relkind = 'r' AND relnamespace = 'public'::regnamespace
ORDER BY pg_total_relation_size(oid) DESC;
```

### 本番運用チェックリスト

```
本番デプロイ前チェックリスト:

データベース:
□ 全テーブルでRLSが有効化されている
□ サービスロールキーがクライアントサイドで使用されていない
□ インデックスが適切に設定されている
□ マイグレーションがステージング環境でテスト済み

認証:
□ メール確認が有効化されている
□ OAuthリダイレクトURLが本番ドメインに設定されている
□ JWTの有効期限が適切に設定されている（デフォルト: 1時間）

Storage:
□ バケットのRLSポリシーが正しく設定されている
□ ファイルサイズ制限が設定されている
□ 許可するMIMEタイプが制限されている

Edge Functions:
□ 全シークレットがsupabase secrets setで設定されている
□ CORSヘッダーが適切に設定されている
□ エラーハンドリングが実装されている

監視:
□ Supabase管理画面のアラートが設定されている
□ DBコネクション数の上限を把握している
□ バックアップスケジュールが設定されている
```

---

## まとめ — SupabaseをTypeScriptプロジェクトで使い倒す

Supabaseは単なるFirebase代替にとどまらず、**PostgreSQLの全機能をバックエンドサービスとして提供する**プラットフォームだ。特に以下の点が他のBaaSと差別化されている。

**Supabaseを選ぶべき理由:**

1. **型安全なAPI** — `supabase gen types`で生成したTypeScript型により、フルスタックで型安全な開発が実現する
2. **SQLの全機能** — JOINや集計、ウィンドウ関数、全文検索など、NoSQLでは実現困難なクエリが書ける
3. **RLSによる多層防御** — DBレベルのアクセス制御で、APIが突破されてもデータが守られる
4. **オープンソース** — セルフホストが可能でベンダーロックインがない
5. **開発体験** — CLIによるローカル開発・マイグレーション管理・型生成が統合されている

SupabaseのAPIレスポンスはJSONオブジェクトとして返ってくるが、Supabase RPC・Edge FunctionsなどカスタムAPIのレスポンス検証には、**[DevToolBox](https://usedevtools.com/)のJSONバリデーター**が役立つ。複雑なネストされたJSONのスキーマ検証や、型定義生成のベースとして活用できる。

フロントエンドNext.js × バックエンドSupabaseという構成は、2026年現在のモダンWeb開発の定番スタックとなっている。本記事のコード例を参考に、本格的なプロダクション環境でSupabaseを使い倒してほしい。

---

## 参考リソース

- [Supabase公式ドキュメント](https://supabase.com/docs)
- [Supabase GitHub](https://github.com/supabase/supabase)
- [Supabase Discord](https://discord.supabase.com/)
- [Next.js × Supabase スターターテンプレート](https://github.com/vercel/next.js/tree/canary/examples/with-supabase)
- [Row Level Security完全ガイド](https://supabase.com/docs/guides/database/postgres/row-level-security)

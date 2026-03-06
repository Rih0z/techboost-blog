---
title: "Bolt.new完全ガイド2026｜AIでWeb開発を自動化"
description: "Bolt.newの使い方を徹底解説。自然言語プロンプトでWebアプリを生成・デプロイする手順とLovable・v0との比較を紹介。"
pubDate: "2026-03-05"
tags: ["AI", "開発ツール", "フロントエンド", "React", "開発効率化"]
---

## Bolt.newとは何か — ブラウザだけでフルスタック開発が完結する時代

「アプリのアイデアはあるけど、環境構築が面倒で手が止まる」。開発者なら一度はそう思ったことがあるはずだ。Bolt.newは、まさにその壁を壊すために生まれたプラットフォームである。

Bolt.newは、StackBlitzが開発したAI駆動のWebアプリケーションビルダーだ。ブラウザ上で自然言語のプロンプトを入力するだけで、フロントエンドからバックエンド、データベースのセットアップまで一括で生成してくれる。ローカルにNode.jsをインストールする必要もなければ、ターミナルを開く必要もない。

従来のAIコーディングツール（GitHub CopilotやCursorなど）がエディタ内のコード補完に特化しているのに対し、Bolt.newはプロジェクト全体の生成と実行環境をまるごと提供する。この違いは大きい。

AIコーディングツール全般に興味がある方は、[AIコーディングツール完全ガイド](/blog/ai-coding-tools-guide)も参考になるだろう。

### Bolt.newの技術的な仕組み

Bolt.newの中核にあるのは、StackBlitzのWebContainers技術だ。WebContainersは、Node.jsのランタイムをブラウザ内で動かすことを可能にした技術で、サーバーサイドの処理もブラウザのサンドボックス内で実行できる。

つまり、Bolt.newは以下のことをすべてブラウザ内で行う。

- npm パッケージのインストール
- 開発サーバーの起動
- ビルドプロセスの実行
- ライブプレビューの表示

これにより、クラウドのVMを借りる必要がなく、ローカルマシンのスペックにも依存しない。Chromebookからでもフルスタックアプリが開発できるということだ。

---

## Bolt.newの主要機能

### 1. 自然言語からのアプリ生成

Bolt.newの入力欄にやりたいことを書くだけで、プロジェクトが生成される。

```
プロンプト例：
「Todoアプリを作って。React + TypeScript + Tailwind CSS。
タスクの追加・完了・削除ができて、localStorageに保存する。
ダークモード切り替えボタンもつけて。」
```

このプロンプトだけで、ファイル構成、コンポーネント、スタイリング、状態管理がすべて生成される。

### 2. ブラウザ内IDE

生成されたプロジェクトは、そのままブラウザ上のエディタで編集できる。ファイルツリー、コードエディタ、ターミナル、ライブプレビューが一画面に収まっている。VS Codeに慣れている人なら、操作感は直感的に理解できるはずだ。

### 3. リアルタイムプレビュー

コードを変更するたびにプレビューが即座に更新される。Hot Module Replacement（HMR）が動いているので、ページ全体のリロードなしに変更が反映される。

### 4. Bolt Cloud

2026年に追加されたBolt Cloudは、データベース・ホスティング・外部サービス連携をワンクリックで提供する機能だ。SupabaseやFirebaseの設定を手動で行う手間が省ける。

### 5. ワンクリックデプロイ

開発が完了したら、VercelやNetlifyへのデプロイがボタン1つで完了する。CI/CDパイプラインの構築は不要だ。

---

## 対応フレームワーク — 主要なJS技術スタックをカバー

Bolt.newはStackBlitzのWebContainers上で動作するため、Node.jsベースのフレームワークなら基本的にすべて対応している。

| フレームワーク | 対応状況 | 得意な用途 |
|-------------|---------|----------|
| **React** | 完全対応 | SPA、コンポーネントベースのUI |
| **Next.js** | 完全対応 | SSR/SSG、フルスタックアプリ |
| **Astro** | 完全対応 | コンテンツサイト、ブログ |
| **Svelte / SvelteKit** | 完全対応 | 軽量SPA、パフォーマンス重視 |
| **Vue / Nuxt** | 完全対応 | プログレッシブフレームワーク |
| **Remix** | 完全対応 | Webスタンダード準拠のフルスタック |
| **Angular** | 対応 | エンタープライズアプリ |
| **Expo (React Native)** | 実験的対応 | モバイルアプリ（Web版プレビュー） |

特にReact、Next.js、Astroでの生成精度が高い。AIモデルの学習データにこれらのフレームワークのコードが豊富に含まれているためだろう。

---

## 料金プラン — 無料枠から始められる

Bolt.newの料金体系はトークンベースだ。AIへのプロンプト送信やコード生成で消費されるトークン量に応じてプランを選ぶ。

| プラン | 月額 | トークン | 主な特徴 |
|-------|------|---------|---------|
| **Free** | $0 | 1M/月（日300K制限） | Boltブランド表示あり |
| **Pro** | $25 | 10M/月（繰越あり） | カスタムドメイン、ブランド非表示、SEO機能 |
| **Teams** | $30/人 | Pro同等 | チーム管理、一括請求 |
| **Enterprise** | 要問合せ | カスタム | SLA、専任サポート |

無料プランでも十分に試せるが、本格的な開発ではProプランが現実的だ。トークンの繰越ができるのは地味にありがたい。月によって開発量にムラがある個人開発者には向いている。

---

## 実践チュートリアル — プロンプトからデプロイまで

ここからは、実際にBolt.newでアプリを作ってデプロイするまでの流れを解説する。

### Step 1：Bolt.newにアクセスしてプロジェクトを作成

1. https://bolt.new にアクセス
2. GitHubアカウントでサインイン（Googleアカウントでも可）
3. プロンプト入力欄が表示される

### Step 2：プロンプトを書く

まず、シンプルなブックマーク管理アプリを作ってみよう。

```
以下の仕様でブックマーク管理アプリを作ってください。

技術スタック：
- React 19 + TypeScript
- Tailwind CSS v4
- Zustand（状態管理）

機能：
- URLとタイトルを入力してブックマークを追加
- タグを複数付けられる（カンマ区切りで入力）
- タグでフィルタリング
- 検索機能（タイトルとURLで部分一致検索）
- ブックマークの編集と削除
- localStorageに永続化

デザイン：
- ミニマルでモダンなUI
- ダークモード対応
- レスポンシブ（モバイル対応）
```

### Step 3：生成結果を確認する

プロンプトを送信すると、Bolt.newが以下のファイルを自動生成する。

```
bookmark-app/
├── src/
│   ├── components/
│   │   ├── BookmarkForm.tsx
│   │   ├── BookmarkCard.tsx
│   │   ├── BookmarkList.tsx
│   │   ├── SearchBar.tsx
│   │   ├── TagFilter.tsx
│   │   └── ThemeToggle.tsx
│   ├── store/
│   │   └── useBookmarkStore.ts
│   ├── types/
│   │   └── bookmark.ts
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── package.json
```

生成されたストアのコードはこのような形になる。

```typescript
// src/store/useBookmarkStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Bookmark {
  id: string;
  url: string;
  title: string;
  tags: string[];
  createdAt: string;
}

interface BookmarkState {
  bookmarks: Bookmark[];
  searchQuery: string;
  selectedTags: string[];
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void;
  removeBookmark: (id: string) => void;
  updateBookmark: (id: string, updates: Partial<Bookmark>) => void;
  setSearchQuery: (query: string) => void;
  toggleTag: (tag: string) => void;
}

export const useBookmarkStore = create<BookmarkState>()(
  persist(
    (set) => ({
      bookmarks: [],
      searchQuery: '',
      selectedTags: [],

      addBookmark: (bookmark) =>
        set((state) => ({
          bookmarks: [
            {
              ...bookmark,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            },
            ...state.bookmarks,
          ],
        })),

      removeBookmark: (id) =>
        set((state) => ({
          bookmarks: state.bookmarks.filter((b) => b.id !== id),
        })),

      updateBookmark: (id, updates) =>
        set((state) => ({
          bookmarks: state.bookmarks.map((b) =>
            b.id === id ? { ...b, ...updates } : b
          ),
        })),

      setSearchQuery: (query) => set({ searchQuery: query }),

      toggleTag: (tag) =>
        set((state) => ({
          selectedTags: state.selectedTags.includes(tag)
            ? state.selectedTags.filter((t) => t !== tag)
            : [...state.selectedTags, tag],
        })),
    }),
    { name: 'bookmark-storage' }
  )
);
```

### Step 4：対話的に修正する

生成されたアプリを確認して、気になる点があれば自然言語で修正を指示する。

```
修正指示の例：

「ブックマークカードにファビコンを表示してほしい。
URLからドメインを抽出して、Google Favicon APIを使って取得して。
https://www.google.com/s2/favicons?domain={ドメイン}&sz=32
サイズは32x32で、タイトルの左に表示。」
```

Bolt.newはこの指示を受けて、該当するコンポーネントだけを修正してくれる。プロジェクト全体を再生成するわけではないので、他の部分は影響を受けない。

### Step 5：デプロイする

開発が完了したら、画面右上の「Deploy」ボタンをクリックする。

1. **Bolt Cloud**にデプロイ → もっとも簡単。URLが自動発行される
2. **Vercel**にデプロイ → Vercelアカウントと連携してワンクリック
3. **Netlify**にデプロイ → Netlifyアカウントと連携

デプロイ先を選んで認証するだけで、本番環境にアプリが公開される。

---

## Bolt.newのプロンプトエンジニアリング

Bolt.newから良い出力を得るためのプロンプトの書き方は、ChatGPTへの質問とはかなり異なる。ここでは実戦で効くテクニックを紹介する。

### 原則1：一度に1つの機能に集中する

大きなプロンプトを一発で投げるより、小さな単位で段階的に構築していく方が精度が高い。

```
❌ 悪い例：
「ECサイトを作って。商品一覧、カート、決済、ユーザー認証、
管理画面、在庫管理、レビュー機能を全部入れて。」

✅ 良い例：
Step 1：「商品一覧ページを作って。React + Tailwind。
         グリッド表示で、商品名・価格・画像を表示。」
Step 2：「カート機能を追加して。Zustandでカート状態を管理。」
Step 3：「決済ページを作って。Stripe Elementsを使用。」
```

### 原則2：技術スタックを明示する

フレームワークやライブラリを具体的に指定すると、生成されるコードの一貫性が上がる。

```
✅ 良い例：
「Next.js 15のApp Routerを使って、Server Componentsベースで
ブログサイトを作って。スタイリングはTailwind CSS v4、
MDXでコンテンツを管理。」
```

### 原則3：既存コードを変更させない指示

修正を依頼するときは、変更しない箇所を明示する。これを怠ると、意図しないファイルまで書き換えられることがある。

```
✅ 良い例：
「SearchBar.tsxのみ修正してください。
他のコンポーネントは一切変更しないでください。
検索時にデバウンスを追加して、300msの遅延後に検索を実行。」
```

### 原則4：プロンプトエンハンサーを活用する

Bolt.newには「Prompt Enhancer」機能がある。ざっくりしたアイデアを入力してエンハンサーボタンを押すと、AIが詳細なプロンプトに自動で展開してくれる。

```
入力：「天気アプリ」
↓ エンハンサーが展開
出力：「React + TypeScriptで天気予報アプリを作成してください。
OpenWeather APIを使用して、都市名で検索できるようにします。
現在の天気と5日間の予報を表示。温度は摂氏表示。
背景色を天気に応じて動的に変更。レスポンシブデザイン。」
```

初心者はまずエンハンサーを使って、出力されたプロンプトの構造を学ぶと上達が早い。

### 原則5：デザインの「雰囲気」を言葉で伝える

UIの見た目を指定するとき、具体的な色やフォントだけでなく「雰囲気」の形容詞を加えると、Bolt.newの出力が格段によくなる。

```
✅ 効果的な例：
「クリーンでミニマルなダッシュボード。余白を広くとって、
情報密度は低め。Notionのような落ち着いた配色。
カードのホバーエフェクトは控えめに。」
```

---

## 実践例：Next.jsでフルスタックアプリを作る

もう少し本格的な例として、Next.js + Supabaseを使ったメモアプリの開発プロセスを見てみよう。

### プロンプト

```
Next.js 15（App Router）+ Supabase + Tailwind CSS v4で
マークダウンメモアプリを作ってください。

要件：
- Supabase Authでメールアドレス認証
- メモのCRUD（作成・読み取り・更新・削除）
- マークダウンエディタ（プレビュー機能付き）
- メモにタグを付けてフィルタリング
- 全文検索

ページ構成：
- /login: ログインページ
- /signup: 新規登録ページ
- /dashboard: メモ一覧（認証必須）
- /notes/[id]: メモ編集ページ（認証必須）

データベーススキーマ：
- notesテーブル: id, user_id, title, content, tags(text[]), created_at, updated_at
- RLS（Row Level Security）を有効化して、自分のメモだけ操作できるようにする
```

### 生成されるコードの例

Bolt.newはこのプロンプトから、認証フローを含む完全なアプリケーションを生成する。たとえば、認証のミドルウェアは以下のようになる。

```typescript
// src/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/signup')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/dashboard/:path*', '/notes/:path*'],
};
```

Server Actionsを活用したメモの作成処理は以下の通りだ。

```typescript
// src/app/dashboard/actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createNote(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('認証が必要です');

  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const tagsRaw = formData.get('tags') as string;
  const tags = tagsRaw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const { error } = await supabase.from('notes').insert({
    user_id: user.id,
    title,
    content,
    tags,
  });

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard');
}

export async function deleteNote(noteId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId);

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard');
}
```

こうしたコードが対話的に生成・修正されていく体験は、従来の開発フローとは根本的に異なる。

---

## Lovable・Replit・v0との比較

Bolt.newと競合する主要なAIアプリビルダーを比較してみよう。それぞれに得意分野があるので、プロジェクトの性質に応じて使い分けるのが賢い。

### 比較表

| 項目 | Bolt.new | Lovable | Replit | Vercel v0 |
|-----|---------|---------|--------|----------|
| **得意分野** | フルスタックWeb | プロトタイプ・MVP | 多言語対応 | UIコンポーネント |
| **実行環境** | ブラウザ内（WebContainers） | クラウドVM | クラウドVM | クラウド |
| **FW対応** | React/Next/Astro/Vue/Svelte等 | React/Next.js中心 | 多言語多数 | React特化 |
| **DB統合** | Bolt Cloud / 外部連携 | Supabase統合 | Replit DB内蔵 | なし（UI特化） |
| **コラボレーション** | 個人向け中心 | マルチプレイヤー | リアルタイム共同編集 | 個人向け中心 |
| **コード移行性** | 中（npm export） | 高（GitHub同期） | 低〜中 | 最高（React部品） |
| **価格（Pro）** | $25/月 | $25/月 | $25/月 | $20/月 |
| **OSS** | あり（GitHub公開） | なし | 一部 | なし |

### 使い分けの指針

**Bolt.newを選ぶべきケース**
- 特定のフレームワーク（Astro、Svelte、Remixなど）を使いたい
- ブラウザ内で完結させたい（ローカル環境が限られる場合）
- OSSの安心感がほしい（自分でホストする選択肢）

**Lovableを選ぶべきケース**
- デザイナーやPMがプロトタイプを作る
- GitHubとの連携を重視する
- チームで同時に作業したい

**Replitを選ぶべきケース**
- Python、Go、Rustなど非JS言語も使いたい
- リアルタイムで共同編集したい
- 学習目的で気軽に試したい

**Vercel v0を選ぶべきケース**
- ReactのUIコンポーネントだけを素早く作りたい
- shadcn/uiベースのデザインシステムに統合したい
- 既存プロジェクトにパーツだけ組み込みたい

v0の詳しい使い方は[Vercel v0でAI駆動のUI開発ガイド](/blog/vercel-v0-ai-guide)を参照してほしい。

---

## Bolt.newの限界と注意点

Bolt.newは強力なツールだが、万能ではない。実際に使う前に、以下の制限を理解しておくべきだ。

### 1. 大規模プロジェクトには不向き

ファイル数が増えてくると、AIが全体のコンテキストを把握しきれなくなる。目安として、50ファイルを超えるとプロンプトの精度が落ちる傾向がある。

**対策**：大きなプロジェクトは、モジュールごとにBolt.newで生成してからローカルに統合する。

### 2. 複雑なバックエンド処理

決済処理、メール送信、外部APIとの複雑な連携など、ビジネスロジックが入り組む部分ではAIの生成結果をそのまま信用するのは危険だ。

**対策**：バックエンドのコアロジックはCursorやClaude Codeで精査する。Bolt.newはUI層とプロトタイプに活用。

### 3. トークン消費が読みにくい

「ちょっとした修正」のつもりでプロンプトを送っても、AIが内部で多くのファイルを参照するため、思ったよりトークンを消費することがある。

**対策**：修正対象のファイルを明示的に指定する。「SearchBar.tsxのみ修正」のように。

### 4. カスタムビルド設定の限界

WebpackやViteの複雑なカスタム設定、モノレポ構成、カスタムプラグインなどはBolt.newの自動設定では対応しきれないことがある。

**対策**：標準的な設定で始めて、必要に応じてローカルでカスタマイズ。

### 5. セキュリティの考慮

AIが生成するコードにセキュリティホールが含まれる可能性は常にある。特に認証・認可・入力バリデーションの部分は人間のレビューが必須だ。

**対策**：本番デプロイ前にセキュリティレビューを実施する。OWASP Top 10に照らし合わせて確認。

---

## ベストプラクティス10選

Bolt.newを日常の開発に取り入れるためのベストプラクティスをまとめた。

### 1. README駆動で始める

プロジェクトの目的・技術スタック・画面構成を先にまとめてから、Bolt.newに渡す。これが最初のプロンプトの土台になる。

### 2. 段階的に機能を追加する

一度にすべてを作ろうとしない。MVPをまず作り、そこから機能を足していく。Bolt.newは対話的な開発に最適化されている。

### 3. 生成コードは必ずレビューする

動いたからOKではなく、中身を読む。理解できない部分はBolt.newに「このコードの意味を説明して」と聞けばいい。

### 4. GitHubにエクスポートする

Bolt.newで作ったプロジェクトは早めにGitHubにエクスポートしておく。バージョン管理がないまま開発を続けるのは危険だ。

### 5. SupabaseやFirebaseの接続は後から

まずモックデータでUIを作り込んでから、バックエンドを接続する。同時にやると、どちらの問題なのかデバッグしにくくなる。

### 6. プロンプトのテンプレートを用意する

自分の開発スタイルに合ったプロンプトのテンプレートを作っておくと、プロジェクトごとに安定した品質の出力が得られる。

```
テンプレート例：
「以下の仕様で{アプリ名}を作ってください。

技術スタック：
- {フレームワーク} + TypeScript
- {CSSフレームワーク}
- {状態管理ライブラリ}

機能：
- {機能1}
- {機能2}
- {機能3}

デザイン：
- {デザインの方向性}
- レスポンシブ対応
- アクセシビリティ考慮」
```

### 7. エラーはそのまま貼り付ける

Bolt.newで実行時エラーが出たら、エラーメッセージをそのままプロンプトに貼り付ける。余計な解説は不要で、AIがエラーの原因を特定して修正してくれる。

### 8. コンポーネント単位でテストする

生成されたコンポーネントが期待通りに動くか、個別に確認してから次のステップに進む。

### 9. 外部連携はドキュメントを添える

Stripe、Supabase、OpenAIなどのAPIと連携する場合は、公式ドキュメントの該当部分をプロンプトに含めると精度が上がる。

### 10. Bolt.newとローカル開発を組み合わせる

プロトタイプはBolt.new、本格開発はCursorやClaude Codeというハイブリッドが現実的だ。AIと対話しながらコードを書く「Vibe Coding」のスタイルについては、[Vibe Coding入門ガイド2026](/blog/vibe-coding-guide-2026)で詳しく解説している。

---

## Bolt.newでAstroサイトを作る例

TechBoostのようなブログサイトをBolt.newで生成する例も紹介しておこう。

```
Astro 5でテック系ブログサイトを作ってください。

要件：
- Content Collectionsでマークダウン記事を管理
- タグ一覧ページ（/tags）と個別タグページ（/tags/[tag]）
- 記事の公開日でソート
- OGP画像の自動生成（satori使用）
- sitemap.xml自動生成
- RSS フィード対応
- Tailwind CSS v4でスタイリング
- ダークモード対応
- レスポンシブデザイン

ページ構成：
- /: トップ（最新記事一覧）
- /blog/[slug]: 記事詳細
- /tags: タグ一覧
- /tags/[tag]: タグ別記事一覧
- /about: Aboutページ
```

Astroの場合、Bolt.newは以下のような構成を生成する。

```
blog/
├── src/
│   ├── content/
│   │   ├── config.ts
│   │   └── blog/
│   │       └── hello-world.md
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── BlogPostLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── blog/
│   │   │   └── [...slug].astro
│   │   ├── tags/
│   │   │   ├── index.astro
│   │   │   └── [tag].astro
│   │   ├── about.astro
│   │   └── rss.xml.ts
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── BlogCard.astro
│   │   ├── TagList.astro
│   │   └── ThemeToggle.astro
│   └── styles/
│       └── global.css
├── astro.config.mjs
├── tailwind.config.ts
└── package.json
```

Content Collectionsのスキーマ定義も適切に生成される。

```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  blog: blogCollection,
};
```

このように、Bolt.newはフレームワーク固有のベストプラクティスを踏まえたコードを生成してくれる。

---

## Bolt.newのOSS版（bolt.diy）を自分でホストする

Bolt.newのソースコードはGitHubで公開されており、コミュニティによるフォーク「bolt.diy」（旧称 oTToDev）を使って自前のインスタンスをホストできる。

```bash
# bolt.diyのクローン
git clone https://github.com/stackblitz-labs/bolt.diy.git
cd bolt.diy

# 環境変数の設定
cp .env.example .env.local
# .env.localにAPIキーを設定
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...

# 依存パッケージのインストールと起動
pnpm install
pnpm run dev
```

自前でホストするメリットは以下の通りだ。

- **APIキーの自由選択**：OpenAI、Anthropic、Google、Ollamaなど好きなモデルを使える
- **トークン制限なし**：自分のAPIキーなので、月額のトークン制限に縛られない
- **プライバシー**：コードがStackBlitzのサーバーを経由しない

ただし、WebContainersの完全な再現はOSS版では難しい部分もある。企業の内部ツールとして使う場合やセキュリティ要件が厳しい場合に検討する価値がある。

---

## よくある質問（FAQ）

### Q. プログラミング未経験でもBolt.newは使える？

使える。プロンプトを自然言語で書くだけなので、コーディング経験がなくてもアプリは生成できる。ただし、生成されたコードの修正やデバッグには、最低限のプログラミング知識があると効率が上がる。

### Q. 生成されたコードの著作権は？

Bolt.newで生成されたコードの著作権はユーザーに帰属する。商用利用も可能だ。

### Q. オフラインで使える？

Bolt.newはオンラインサービスなのでインターネット接続が必須。ただしOSS版（bolt.diy）をローカルで動かせば、AIモデルのAPI呼び出し以外はオフラインで動作する。

### Q. モバイルアプリは作れる？

React Native + Expoを使ったモバイルアプリの生成に実験的に対応している。ただし、ネイティブ機能（カメラ、GPS等）のテストはBolt.new上では難しく、実機やシミュレーターでの確認が必要になる。

### Q. 既存プロジェクトをBolt.newにインポートできる？

GitHubリポジトリからのインポートに対応している。ただし、大規模なプロジェクトや特殊なビルド設定のものは、正しくインポートできないことがある。

### Q. 無料プランで十分？

学習目的やちょっとしたプロトタイプなら無料プランで十分だ。ただし、日に300Kトークンの制限があるので、本格的な開発にはProプランが必要になる。

---

## まとめ — Bolt.newはプロトタイプからMVPまでの最短距離

Bolt.newは、アイデアを形にするまでのリードタイムを劇的に短縮するツールだ。特に以下のような場面で真価を発揮する。

- **個人開発者のプロトタイピング**：週末の2日間でMVPを作る
- **スタートアップの検証フェーズ**：資金調達前にデモを用意する
- **学習用途**：フレームワークの使い方をAIに教わりながら学ぶ
- **デザイナーの技術検証**：Figmaのデザインを実際に動くコードにする

一方で、プロダクションレベルのアプリケーション開発では、Bolt.newで生成したコードを出発点として、CursorやClaude Codeでリファクタリング・テスト追加・セキュリティ強化を行う「ハイブリッドアプローチ」が現実的だ。

AI開発ツールの選択肢は増え続けている。Bolt.new、Lovable、Replit、v0、Cursor、Claude Code。大事なのは、それぞれの得意分野を理解して適材適所で使い分けることだ。ツールに振り回されるのではなく、ツールを使いこなす側に回ろう。

---

## 関連記事

- [AIコーディングツール完全ガイド — GitHub Copilot・Cursor・Claude Code比較と活用法](/blog/ai-coding-tools-guide)
- [Vercel v0でAI駆動のUI開発ガイド](/blog/vercel-v0-ai-guide)
- [Vibe Coding入門ガイド2026：AIと対話しながら開発するエンジニアの新常識](/blog/vibe-coding-guide-2026)

---
title: "Supabase vs Firebase 徹底比較2026 - BaaS選定の決定版ガイド"
description: "SupabaseとFirebaseを機能・料金・開発体験で徹底比較。認証、データベース、ストレージ、リアルタイム機能、Edge Functionsの違いと、プロジェクトに最適なBaaSの選び方を解説します。"
pubDate: "2026-02-05"
tags: ["Supabase", "Firebase", "BaaS", "Backend", "データベース", "プログラミング"]
---

## はじめに

バックエンド開発を劇的に効率化するBaaS（Backend as a Service）。その中でも、**Supabase**と**Firebase**は2026年現在、最も人気のある2大サービスです。

しかし、どちらを選ぶべきか迷っている方も多いのではないでしょうか？

この記事では、実際の開発現場での経験を基に、両サービスを徹底比較します。機能面、料金面、開発体験、そして実装例まで、プロジェクト選定に必要なすべての情報をお届けします。

## Supabaseとは？

Supabaseは「オープンソースのFirebase代替」として2020年に登場したBaaSです。

### 主な特徴

- **PostgreSQLベース**: 本格的なリレーショナルデータベース
- **完全オープンソース**: セルフホスティング可能
- **SQL直接実行**: SQLクエリをフルに活用できる
- **RESTful API自動生成**: テーブルから自動でAPI生成
- **リアルタイム機能**: PostgreSQLの変更をリアルタイム配信

### 主要機能

- **Database**: PostgreSQL（JSON、全文検索、空間データ対応）
- **Auth**: JWT認証、OAuth、MFA
- **Storage**: S3互換のオブジェクトストレージ
- **Edge Functions**: Deno Runtime
- **Realtime**: WebSocketによるリアルタイム更新

## Firebaseとは？

FirebaseはGoogleが提供する、世界最大級のBaaSプラットフォームです。

### 主な特徴

- **NoSQLデータベース**: Firestoreによる柔軟なスキーマ
- **Googleインフラ**: 世界規模のスケーラビリティ
- **リッチなエコシステム**: Analytics、Crashlytics、ML機能
- **モバイル最適化**: iOS/Android開発との統合

### 主要機能

- **Firestore**: NoSQLドキュメントデータベース
- **Authentication**: 豊富なプロバイダー（Google、Apple等）
- **Cloud Storage**: 画像・動画・ファイルストレージ
- **Cloud Functions**: Node.js / Python ランタイム
- **Hosting**: 静的サイトホスティング
- **Analytics**: 詳細なユーザー分析

## 機能別詳細比較

### 1. データベース

#### Supabase (PostgreSQL)

**長所:**
- SQL標準に準拠
- リレーショナルモデルでデータ整合性を保証
- 複雑なJOIN、トランザクション、ストアドプロシージャ
- JSON型でNoSQL的な使い方も可能
- 全文検索、空間データ（PostGIS）

**短所:**
- NoSQLに比べてスキーマ設計が必要
- 大量の同時書き込みでスケーリングが複雑

**使用例:**

```sql
-- テーブル作成
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  content TEXT,
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX posts_user_id_idx ON posts(user_id);
CREATE INDEX posts_tags_idx ON posts USING GIN(tags);

-- Row Level Security (RLS)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all posts"
  ON posts FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**クライアント側:**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// データ取得（JOIN）
const { data, error } = await supabase
  .from('posts')
  .select(`
    *,
    author:users(name, avatar)
  `)
  .eq('published', true)
  .order('created_at', { ascending: false })
  .limit(10)

// データ挿入
const { data, error } = await supabase
  .from('posts')
  .insert({
    title: 'Supabase入門',
    content: '...',
    tags: ['tutorial', 'database']
  })
```

#### Firebase (Firestore)

**長所:**
- スキーマレスで柔軟
- 自動スケーリング
- オフライン対応が強力
- ネストされたコレクションで階層構造を表現

**短所:**
- JOIN不可（クライアント側で複数クエリが必要）
- 複雑なクエリに制限あり（ORクエリ不可など）
- トランザクションの制約

**使用例:**

```typescript
import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore'

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// データ取得
const q = query(
  collection(db, 'posts'),
  where('published', '==', true),
  orderBy('createdAt', 'desc'),
  limit(10)
)
const snapshot = await getDocs(q)
const posts = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}))

// データ挿入
await addDoc(collection(db, 'posts'), {
  title: 'Firebase入門',
  content: '...',
  tags: ['tutorial', 'database'],
  createdAt: serverTimestamp()
})
```

**判断基準:**
- **リレーショナルデータ、複雑なクエリ → Supabase**
- **柔軟なスキーマ、自動スケーリング → Firebase**

### 2. 認証 (Authentication)

#### Supabase Auth

**特徴:**
- JWT認証（GoTrue実装）
- Email/Password、Magic Link、OAuth
- MFA（多要素認証）対応
- Row Level Security (RLS)との統合

**実装例:**

```typescript
// Email登録
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    data: {
      display_name: 'John Doe'
  },
    emailRedirectTo: 'https://example.com/welcome'
  }
})

// ソーシャルログイン（GitHub）
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'github',
  options: {
    redirectTo: 'https://example.com/callback'
  }
})

// セッション取得
const { data: { session } } = await supabase.auth.getSession()

// ログアウト
await supabase.auth.signOut()
```

#### Firebase Authentication

**特徴:**
- 豊富なプロバイダー（Google、Apple、Twitter、Facebook等）
- 電話番号認証
- Anonymous認証
- カスタム認証トークン

**実装例:**

```typescript
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth'

const auth = getAuth()

// Email登録
const userCredential = await createUserWithEmailAndPassword(
  auth,
  'user@example.com',
  'password123'
)

// Googleログイン
const provider = new GoogleAuthProvider()
const result = await signInWithPopup(auth, provider)
const user = result.user

// ログアウト
await signOut(auth)
```

**判断基準:**
- **PostgreSQLのRLSと統合したい → Supabase**
- **Googleエコシステム、電話番号認証 → Firebase**

### 3. ストレージ

#### Supabase Storage

**特徴:**
- S3互換API
- RLSでアクセス制御
- 画像変換（リサイズ、最適化）
- 公開/非公開バケット

**実装例:**

```typescript
// ファイルアップロード
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.png`, file, {
    cacheControl: '3600',
    upsert: true
  })

// 公開URL取得
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl(`${userId}/avatar.png`)

// 画像変換
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl(`${userId}/avatar.png`, {
    transform: {
      width: 200,
      height: 200,
      resize: 'cover'
    }
  })

// ファイル削除
await supabase.storage
  .from('avatars')
  .remove([`${userId}/avatar.png`])
```

#### Firebase Cloud Storage

**特徴:**
- Google Cloud Storageベース
- セキュリティルールで制御
- Firebase Storageトリガー（Cloud Functions）
- 自動的なリトライとレジューム

**実装例:**

```typescript
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'

const storage = getStorage()

// ファイルアップロード
const storageRef = ref(storage, `avatars/${userId}/avatar.png`)
await uploadBytes(storageRef, file)

// URL取得
const url = await getDownloadURL(storageRef)

// メタデータ付きアップロード
await uploadBytes(storageRef, file, {
  contentType: 'image/png',
  customMetadata: {
    'userId': userId
  }
})
```

**判断基準:**
- **画像変換機能が欲しい → Supabase**
- **大規模ストレージ、CDN配信 → Firebase**

### 4. リアルタイム機能

#### Supabase Realtime

**特徴:**
- PostgreSQLの変更をWebSocketで配信
- テーブル単位でサブスクライブ
- Presence（オンライン状態共有）
- Broadcast（任意メッセージ配信）

**実装例:**

```typescript
// データベース変更をリアルタイム受信
const channel = supabase
  .channel('posts-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'posts'
    },
    (payload) => {
      console.log('Change:', payload)
      // payload.eventType: 'INSERT' | 'UPDATE' | 'DELETE'
      // payload.new, payload.old
    }
  )
  .subscribe()

// Presence（オンラインユーザー追跡）
const presenceChannel = supabase.channel('room-1')
  .on('presence', { event: 'sync' }, () => {
    const state = presenceChannel.presenceState()
    console.log('Online users:', state)
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await presenceChannel.track({ user_id: userId, online_at: new Date() })
    }
  })
```

#### Firebase Realtime

**特徴:**
- Firestoreのスナップショットリスナー
- クライアントSDKで自動同期
- オフライン対応が強力

**実装例:**

```typescript
import { onSnapshot, doc } from 'firebase/firestore'

// ドキュメント変更をリアルタイム受信
const unsubscribe = onSnapshot(
  doc(db, 'posts', postId),
  (doc) => {
    console.log('Current data:', doc.data())
  },
  (error) => {
    console.error('Error:', error)
  }
)

// コレクション変更
const q = query(collection(db, 'posts'), where('published', '==', true))
const unsubscribe = onSnapshot(q, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === 'added') {
      console.log('New:', change.doc.data())
    }
    if (change.type === 'modified') {
      console.log('Modified:', change.doc.data())
    }
    if (change.type === 'removed') {
      console.log('Removed:', change.doc.data())
    }
  })
})
```

**判断基準:**
- **PostgreSQL変更の配信 → Supabase**
- **オフライン対応重視 → Firebase**

### 5. サーバーレス関数

#### Supabase Edge Functions

**特徴:**
- Deno Runtimeベース
- TypeScript標準サポート
- グローバルエッジ配信
- npm互換性（一部制限あり）

**実装例:**

```typescript
// supabase/functions/hello/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  )

  // 認証チェック
  const authHeader = req.headers.get('Authorization')
  const { data: { user }, error } = await supabase.auth.getUser(
    authHeader?.replace('Bearer ', '')
  )

  if (error || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // データベース操作
  const { data, error: dbError } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', user.id)

  return new Response(JSON.stringify({ data }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

#### Firebase Cloud Functions

**特徴:**
- Node.js / Python対応
- Firebaseトリガー（Auth、Firestore、Storage）
- スケジュール実行
- 豊富なエコシステム

**実装例:**

```typescript
import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

admin.initializeApp()

// HTTPトリガー
export const hello = functions.https.onRequest(async (req, res) => {
  const db = admin.firestore()
  const posts = await db.collection('posts').limit(10).get()
  const data = posts.docs.map(doc => doc.data())
  res.json({ data })
})

// Firestoreトリガー
export const onPostCreated = functions.firestore
  .document('posts/{postId}')
  .onCreate(async (snap, context) => {
    const post = snap.data()
    // 新規投稿時の処理（通知、集計など）
    await admin.firestore().collection('notifications').add({
      type: 'new_post',
      postId: context.params.postId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })
  })

// スケジュール実行
export const dailyCleanup = functions.pubsub
  .schedule('0 0 * * *')
  .onRun(async (context) => {
    // 毎日0時に実行
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)

    const oldPosts = await admin.firestore()
      .collection('posts')
      .where('createdAt', '<', cutoff)
      .get()

    const batch = admin.firestore().batch()
    oldPosts.docs.forEach(doc => batch.delete(doc.ref))
    await batch.commit()
  })
```

**判断基準:**
- **Deno/TypeScript、エッジ実行 → Supabase**
- **Firebaseトリガー、Node.js → Firebase**

## 料金比較

### Supabase 料金プラン（2026年2月時点）

#### Free（無料）
- Database: 500MB
- Storage: 1GB
- Bandwidth: 5GB/月
- Edge Functions: 500,000リクエスト/月
- 無制限プロジェクト
- コミュニティサポート

#### Pro ($25/月)
- Database: 8GB（追加 $0.125/GB）
- Storage: 100GB（追加 $0.021/GB）
- Bandwidth: 250GB/月（追加 $0.09/GB）
- Edge Functions: 2,000,000リクエスト/月
- 7日間ログ保持
- Emailサポート

#### Team ($599/月)
- Database: 最適化されたコンピューティング
- 優先サポート
- 28日間ログ保持
- SOC2対応

### Firebase 料金プラン（2026年2月時点）

#### Spark（無料）
- Firestore: 1GB、50,000読み取り/日、20,000書き込み/日
- Storage: 5GB、1GB/日ダウンロード
- Functions: 125,000呼び出し/月、40,000GB秒/月
- Hosting: 10GB/月

#### Blaze（従量課金）
- Firestore: $0.18/GB、$0.06/100,000読み取り、$0.18/100,000書き込み
- Storage: $0.026/GB、$0.12/GBダウンロード
- Functions: $0.40/100万呼び出し、$0.0000025/GB秒
- 無料枠あり（Sparkと同等）

### コスト比較シミュレーション

**小規模アプリ（MAU 1,000人）**
- データ: 2GB、10万リクエスト/月
- ストレージ: 5GB
- 関数: 50万呼び出し/月

| | Supabase | Firebase |
|---|---|---|
| **月額** | **$0（Freeで十分）** | **$0（Sparkで十分）** |

**中規模アプリ（MAU 10,000人）**
- データ: 20GB、500万リクエスト/月
- ストレージ: 50GB
- 関数: 200万呼び出し/月

| | Supabase | Firebase |
|---|---|---|
| Database | $26.5 | $15 |
| Storage | $3 | $1.3 |
| Functions | $0 | $0.8 |
| **合計** | **~$30** | **~$17** |

**大規模アプリ（MAU 100,000人）**
- データ: 200GB、5000万リクエスト/月
- ストレージ: 500GB
- 関数: 2000万呼び出し/月

| | Supabase | Firebase |
|---|---|---|
| Database | ~$150 | ~$100 |
| Storage | ~$50 | ~$13 |
| Functions | ~$50 | ~$8 |
| **合計** | **~$250** | **~$121** |

**料金面での結論:**
- **小規模なら両方とも無料で十分**
- **中〜大規模ではFirebaseの方が安価な傾向**
- **Supabaseはストレージ転送が高め**
- **Firebaseは書き込み操作が高額になる可能性**

## 開発体験 (DX) 比較

### Supabase

**優れている点:**
- **PostgreSQL直接アクセス**: pgAdminやTablePlusで操作可能
- **SQLクエリ**: 複雑なクエリも書ける
- **TypeScript型生成**: CLIでDBスキーマから型生成
- **セルフホスティング**: Docker Composeで簡単にローカル環境構築
- **マイグレーション管理**: SQLファイルでバージョン管理

**課題:**
- エコシステムがFirebaseより小さい
- ドキュメントは充実しているが、日本語リソースは少なめ

**開発フロー例:**

```bash
# Supabase CLIインストール
npm install -g supabase

# ローカル環境起動
supabase start

# マイグレーション作成
supabase migration new create_posts_table

# 型生成
supabase gen types typescript --local > src/types/database.ts
```

### Firebase

**優れている点:**
- **巨大なエコシステム**: ライブラリ、チュートリアル、Stack Overflow
- **Firebase Console**: 使いやすいWeb管理画面
- **Firebase CLI**: デプロイ、エミュレーター、拡張機能
- **オフライン対応**: SDKレベルで強力なサポート
- **モバイル統合**: iOS/Android開発との親和性

**課題:**
- ベンダーロックインのリスク
- Firestoreの制約（JOIN不可など）
- セルフホスティング不可

**開発フロー例:**

```bash
# Firebase CLIインストール
npm install -g firebase-tools

# プロジェクト初期化
firebase init

# ローカルエミュレーター起動
firebase emulators:start

# デプロイ
firebase deploy
```

## どちらを選ぶべきか？判断フロー

### Supabaseを選ぶべきケース

1. **SQLが必要**
   - 複雑なJOIN、トランザクション
   - 既存のPostgreSQLスキーマがある
   - リレーショナルモデルが適している

2. **オープンソース重視**
   - ベンダーロックイン回避
   - セルフホスティングしたい
   - カスタマイズ性が必要

3. **開発者がSQL得意**
   - バックエンドエンジニアが中心
   - データベース設計を重視

4. **Next.js / Remix等のフルスタックフレームワーク**
   - サーバーコンポーネントと相性良好
   - Edge Functionsでミドルウェア

### Firebaseを選ぶべきケース

1. **モバイルアプリ開発**
   - iOS/Android SDKが必要
   - オフライン対応が重要
   - Push通知、Analytics統合

2. **スキーマレスな柔軟性**
   - データ構造が頻繁に変わる
   - プロトタイプ開発
   - ドキュメント指向が適している

3. **Googleエコシステム活用**
   - Google Analytics
   - Google Cloud連携
   - BigQueryでデータ分析

4. **大規模スケーリング**
   - 自動スケールが必要
   - グローバル配信
   - レイテンシ最適化

### 判断チャート

```
データベース要件は？
├─ リレーショナル・SQL → Supabase
└─ NoSQL・柔軟性 → Firebase

オープンソース重視？
├─ はい（セルフホスティング含む） → Supabase
└─ いいえ（Google管理でOK） → Firebase

主要プラットフォームは？
├─ Web（特にNext.js等） → Supabase
├─ モバイル（iOS/Android） → Firebase
└─ フルスタック → どちらでも可

チームのスキルセットは？
├─ SQL得意 → Supabase
└─ NoSQL・JavaScript中心 → Firebase

コスト（大規模時）
├─ DB読み書き中心 → Supabase
└─ ストレージ転送多い → Firebase
```

## まとめ

### Supabase

**適している用途:**
- B2Bダッシュボード、管理システム
- データ整合性が重要なアプリ
- 複雑なクエリ・レポーティング
- セルフホスティング要件

**強み:**
- PostgreSQLの強力な機能
- オープンソース・透明性
- SQL直接実行

**弱み:**
- エコシステムが小さい
- モバイル統合はFirebaseに劣る

### Firebase

**適している用途:**
- モバイルアプリ（iOS/Android）
- リアルタイムチャット・コラボレーション
- オフライン対応が必要なアプリ
- プロトタイプ・MVP開発

**強み:**
- 巨大なエコシステム
- 自動スケーリング
- Google統合

**弱み:**
- ベンダーロックイン
- Firestoreのクエリ制約
- コストが予測しづらい

### 最終的なアドバイス

**迷ったら:**
- **Webアプリ中心 → Supabase**（Next.js等との相性◎）
- **モバイルアプリ → Firebase**（SDK・オフライン対応◎）
- **どちらも試して決める**（両方とも無料枠が充実）

どちらも優れたサービスですが、プロジェクトの性質によって最適な選択は異なります。この記事の比較を参考に、あなたのプロジェクトに最適なBaaSを選んでください。

Happy Coding!

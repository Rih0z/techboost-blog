---
title: 'GitHub Copilotカスタム指示: チーム開発でのAI活用最適化'
description: 'GitHub Copilotのカスタム指示(Custom Instructions)機能を活用したチーム開発の効率化手法を解説。プロジェクト固有のコーディング規約、アーキテクチャパターン、ベストプラクティスをAIに学習させる実践テクニックを紹介します。'
pubDate: 2025-10-05
updatedDate: 2025-10-05
tags: ['GitHub Copilot', 'AI', 'productivity', 'team-development', 'Best Practices', 'プログラミング']
heroImage: '../../assets/thumbnails/github-copilot-custom-instructions.jpg'
---
## カスタム指示(Custom Instructions)とは

GitHub Copilot Custom Instructionsは、プロジェクト固有のコーディング規約、アーキテクチャパターン、命名規則などをCopilotに学習させ、より的確なコード提案を受けられる機能です。2024年後半から利用可能になりました。

### なぜカスタム指示が必要か

```typescript
// カスタム指示なし: 一般的なReactコンポーネント
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(setUser);
  }, [userId]);

  return <div>{user?.name}</div>;
}

// カスタム指示あり: プロジェクトの規約に準拠
import { useQuery } from '@tanstack/react-query';
import { userApi } from '@/lib/api/user';
import type { User } from '@/types/user';

interface UserProfileProps {
  userId: string;
}

export function UserProfile({ userId }: UserProfileProps) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => userApi.getById(userId),
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!user) return null;

  return (
    <div className="user-profile">
      <h2>{user.name}</h2>
    </div>
  );
}
```

## セットアップ

### 1. `.github/copilot-instructions.md`の作成

```markdown
# GitHub Copilot Custom Instructions

## プロジェクト概要
このプロジェクトはNext.js 15 + TypeScriptを使用したEコマースプラットフォームです。

## コーディング規約

### TypeScript
- すべてのファイルで厳格な型定義を使用
- `any`型の使用禁止
- 関数の戻り値の型を明示
- interfaceよりtypeエイリアスを優先

### 命名規則
- コンポーネント: PascalCase (`UserProfile`, `ProductCard`)
- フック: use接頭辞 (`useUser`, `useCart`)
- 定数: UPPER_SNAKE_CASE (`API_BASE_URL`)
- 関数: camelCase (`fetchUser`, `calculateTotal`)

### インポート順序
1. React/Next.js
2. サードパーティライブラリ
3. 内部モジュール(@/から始まる)
4. 相対パス
5. 型定義
6. スタイル

### ファイル構造
```
src/
  app/           # App Router
  components/    # 再利用可能なコンポーネント
  lib/           # ユーティリティ、API client
  hooks/         # カスタムフック
  types/         # 型定義
  styles/        # グローバルスタイル
```

## 使用ライブラリ

### 状態管理
- React Query v5 (サーバー状態)
- Zustand (クライアント状態)

### UI
- shadcn/ui (コンポーネント)
- Tailwind CSS (スタイリング)

### バリデーション
- Zod (スキーマ検証)

### フォーム
- React Hook Form + Zod

## アーキテクチャパターン

### API呼び出し
- すべてのAPIコールは`lib/api/`配下に集約
- React Queryでラップ
- エラーハンドリングは統一

```typescript
// lib/api/user.ts
import { z } from 'zod';
import { apiClient } from './client';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

export const userApi = {
  getById: async (id: string) => {
    const response = await apiClient.get(`/users/${id}`);
    return UserSchema.parse(response.data);
  },
};
```

### コンポーネント設計
- Server Componentsをデフォルト
- インタラクションが必要な場合のみ'use client'
- propsはinterfaceで型定義
- childrenを受け取る場合はReact.ReactNodeを使用

## ベストプラクティス

### パフォーマンス
- 画像は必ずnext/imageを使用
- 動的インポートで大きなコンポーネントを遅延ロード
- useMemoとuseCallbackは必要な場合のみ使用

### アクセシビリティ
- すべてのボタンにaria-labelを設定
- フォーム要素にはlabelを関連付け
- セマンティックHTMLを優先

### エラーハンドリング
- すべての非同期処理にtry-catchを追加
- ユーザーフレンドリーなエラーメッセージ
- エラーログをSentryに送信

## 禁止事項
- console.logの使用(開発時のみ許可)
- 直接のfetch使用(apiClient経由)
- インラインスタイル
- varキーワード
```

### 2. VS Code設定の追加

```json
// .vscode/settings.json
{
  "github.copilot.enable": {
    "*": true,
    "yaml": false,
    "plaintext": false
  },
  "github.copilot.chat.codeGeneration.instructions": [
    {
      "file": ".github/copilot-instructions.md"
    }
  ]
}
```

## 実践例

### React Queryパターンの自動生成

```typescript
// コメントで指示
// Create a custom hook to fetch user by ID using React Query

// Copilotの生成結果
import { useQuery } from '@tanstack/react-query';
import { userApi } from '@/lib/api/user';
import type { User } from '@/types/user';

export function useUser(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => userApi.getById(userId),
    staleTime: 5 * 60 * 1000, // 5分
  });
}
```

### フォームバリデーションの自動生成

```typescript
// Create a form schema for user registration

// Copilotの生成結果
import { z } from 'zod';

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'ユーザー名は3文字以上必要です')
    .max(20, 'ユーザー名は20文字以内です'),
  email: z
    .string()
    .email('有効なメールアドレスを入力してください'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上必要です')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'パスワードは大文字、小文字、数字を含む必要があります'
    ),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'パスワードが一致しません',
  path: ['confirmPassword'],
});

export type RegisterInput = z.infer<typeof registerSchema>;
```

## チーム別のカスタム指示例

### バックエンドチーム

```markdown
# Backend Custom Instructions

## 使用技術
- Node.js 20 + TypeScript
- Hono (Web Framework)
- Drizzle ORM
- PostgreSQL

## API設計
- RESTful API
- OpenAPI 3.1仕様に準拠
- すべてのエンドポイントで認証必須(除: /health)

## エラーハンドリング
```typescript
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true
  ) {
    super(message);
  }
}

// 使用例
throw new AppError(404, 'User not found');
```

## データベース
- マイグレーションファイルは必ず作成
- トランザクションを適切に使用
- N+1クエリを避ける

## セキュリティ
- すべての入力をバリデーション
- SQLインジェクション対策(prepared statements)
- レート制限を設定
```

### フロントエンドチーム

```markdown
# Frontend Custom Instructions

## 状態管理
```typescript
// Zustandストアの標準パターン
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  devtools(
    persist(
      (set) => ({
        items: [],
        addItem: (item) =>
          set((state) => ({ items: [...state.items, item] })),
        removeItem: (id) =>
          set((state) => ({
            items: state.items.filter((item) => item.id !== id),
          })),
        clearCart: () => set({ items: [] }),
      }),
      { name: 'cart-storage' }
    )
  )
);
```

## コンポーネントパターン
- Compound Components パターンを優先
- Render Props は避ける
- カスタムフックでロジックを抽出

## テスト
- Testing Libraryを使用
- ユーザーの操作をテスト
- 実装詳細をテストしない
```

### インフラチーム

```markdown
# Infrastructure Custom Instructions

## IaC
- Terraform 1.6以上
- モジュール化を徹底
- 変数はvariables.tfに集約

```hcl
# 標準的なモジュール構造
module "vpc" {
  source = "./modules/vpc"

  vpc_cidr     = var.vpc_cidr
  environment  = var.environment
  project_name = var.project_name

  tags = merge(
    var.common_tags,
    {
      Name = "${var.project_name}-vpc"
    }
  )
}
```

## CI/CD
- GitHub Actionsを使用
- すべてのジョブにtimeoutを設定
- SecretsはGitHub Secretsで管理

## セキュリティ
- 最小権限の原則
- すべてのリソースにタグ付け
- 本番環境は別アカウント
```

## 高度なテクニック

### コンテキストファイルの活用

```markdown
# .github/copilot-context.md

## 現在のスプリント目標
- ユーザー認証機能の実装
- OAuth (Google, GitHub) 対応
- メール認証フロー

## 既知の問題
- Safari でのCookie問題 → SameSite=None対応済み
- iOS PWA のトークン保存 → IndexedDB使用

## 最近の設計決定
- セッション管理: JWTではなくsession token
- 理由: リフレッシュトークンの複雑さを避けるため
```

### プロジェクト固有の略語

```markdown
## 略語・専門用語
- SKU: Stock Keeping Unit (商品管理コード)
- PDP: Product Detail Page (商品詳細ページ)
- PLP: Product Listing Page (商品一覧ページ)
- CTA: Call To Action (行動喚起ボタン)

## 使用例
```typescript
// ✅ Good
interface ProductSKU {
  code: string;
  variant: string;
}

// ❌ Bad
interface ProductCode {
  code: string;
  variant: string;
}
```
```

### チーム固有のコメントスタイル

```markdown
## コメント規約

### TODOコメント
```typescript
// TODO(username): 説明 - 期日
// TODO(john): API v2への移行 - 2024-12-31

// FIXME: 緊急の修正が必要
// FIXME: メモリリークの可能性

// NOTE: 重要な情報
// NOTE: この関数は非推奨。代わりにnewFunctionを使用
```

### アーキテクチャ決定記録(ADR)
```typescript
/**
 * ADR-001: React Queryの採用
 *
 * 決定日: 2024-01-15
 * 理由:
 * - サーバー状態管理の統一
 * - 自動キャッシング・再検証
 * - Optimistic Updates対応
 *
 * 代替案:
 * - SWR: React Queryより機能が少ない
 * - Redux Toolkit Query: Reduxへの依存
 */
```
```

## チームでの運用

### 定期的なレビュー

```markdown
# カスタム指示レビュー (月次)

## チェックリスト
- [ ] 新しいライブラリの追加反映
- [ ] 非推奨パターンの削除
- [ ] チームフィードバックの反映
- [ ] 生成品質の確認

## メトリクス
- Copilot採用率: 提案の何%を受け入れたか
- 修正率: 生成コードの何%を修正したか
- 時間削減: コーディング時間の削減率
```

### オンボーディング

```markdown
# 新メンバー向けガイド

## 初日
1. `.github/copilot-instructions.md`を熟読
2. サンプルコードで動作確認
3. 既存コードの生成を試す

## 1週間目
- チームのコーディング規約に沿った提案か確認
- 不適切な提案があれば報告

## フィードバック方法
- Slackの#copilot-feedbackチャンネル
- 良い/悪い例を共有
```

## トラブルシューティング

### Copilotが規約を無視する場合

```typescript
// ❌ 規約無視の例
function fetchUser(id) {
  return fetch(`/api/users/${id}`);
}

// 解決策1: より具体的な指示
// Create a type-safe user fetcher using our apiClient from @/lib/api

// 解決策2: インラインコメントで補足
/**
 * Fetch user by ID
 * @requirements
 * - Use apiClient from @/lib/api
 * - Return type must be User from @/types/user
 * - Use Zod for validation
 */
```

### カスタム指示が反映されない

```bash
# VS Code の Copilot キャッシュをクリア
# Command Palette (Cmd+Shift+P)
> GitHub Copilot: Clear Chat History

# VS Code 再起動
```

## まとめ

GitHub Copilot Custom Instructionsを活用することで、チーム固有のコーディング規約やベストプラクティスに準拠したコード生成が可能になります。プロジェクトの成長に合わせて指示を更新し、チーム全体で品質の高いコードを効率的に生産できます。

### 次のステップ

- カスタム指示の定期的なレビューとアップデート
- チームメンバーからのフィードバック収集
- 生成コードの品質メトリクス測定
- 他のAIツール(Cursor, Codeium)との比較検討
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)

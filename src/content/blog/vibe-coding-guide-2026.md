---
title: "Vibe Coding入門ガイド2026：AIと対話しながら開発するエンジニアの新常識"
description: "Vibe Codingとは何か、Cursor・Claude Code・GitHub Copilot Workspaceを使った実践的なAI協調開発の手法を解説。コード品質を落とさずに10倍速で開発する方法。サンプルコード付きで実践的に解説。"
pubDate: "2026-03-05"
tags: ["Vibe Coding", "AI開発", "Cursor", "Claude Code", "GitHub Copilot", "プログラミング"]
heroImage: '../../assets/thumbnails/vibe-coding-guide-2026.jpg'
---
## Vibe Codingとは：自然言語で「意図を伝えて」コードを生成する開発スタイル

**Vibe Coding**は、2025年にAndrej Karpathy（元Tesla AI責任者）が提唱した概念で、「AIに完全に身を委ね、エラーメッセージをそのまま貼り付けて修正させる」開発スタイルです。

従来の開発：`設計 → コード記述 → デバッグ → リファクタリング`

Vibe Coding：`意図を自然言語で伝える → AIが実装 → 動作確認 → 修正を対話で依頼`

---

## Vibe Codingの3大ツール比較

| ツール | 価格 | 強み |
|-------|------|------|
| **Cursor** | $20/月 | コードベース全体の理解・マルチファイル編集 |
| **Claude Code** | Claudeプランに含む | ターミナル直接操作・ファイルシステムフルアクセス |
| **GitHub Copilot Workspace** | $10/月 | GitHubとの完全統合・Issue→PR自動化 |

### Cursorのキーバインド

```bash
Ctrl+K  → インラインコード生成・修正
Ctrl+L  → チャットでコードベースに質問
Ctrl+I  → Composer（複数ファイルを一括変更）
```

### Claude Codeの典型的な使い方

```bash
claude "このプロジェクトのREADMEを日本語で書いて"
claude "テストが失敗している原因を調べて修正して"
claude "Prismaスキーマを追加してマイグレーションを実行して"
```

---

## 実践：Vibe CodingでTodo APIを30分で作る

### Step 1：設計を自然言語で伝える

```
プロンプト例：
「HonoとDrizzle ORMを使ったTodo API を作って。
- GET /todos: 一覧取得（完了/未完了フィルター付き）
- POST /todos: 作成
- PATCH /todos/:id: 完了状態の更新
- DELETE /todos/:id: 削除
DBはSQLite（開発用）、TypeScript、テストはvitest。
まずプロジェクト構造から始めて。」
```

### Step 2：AIが生成したコードの例

```typescript
// schema.ts（AIが生成）
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const todos = sqliteTable('todos', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  completed: integer('completed', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;
```

### Step 3：エラーをそのまま貼り付ける

```
エラーが出たらそのままプロンプトに貼り付けるだけ：

「以下のエラーが出ました：
TypeError: Cannot read properties of undefined (reading 'prepare')
  at todos.ts:23:15
修正してください。」
```

---

## Vibe Codingで品質を保つ5つのルール

### ルール1：生成されたコードを必ず読む

```
❌ 悪い例：動いたからOKと判断してコードを確認しない
✅ 良い例：生成後にレビューし、理解できない部分をAIに説明させる
```

### ルール2：テストを先に書かせる（TDD）

```
「実装前にテストを書いて。
期待する動作：
- POST /todos でtitleが空の場合は400エラー
- 正常系は201でtodo objectを返す」
```

### ルール3：型安全性を妥協しない

```typescript
// AIがanyを使ったら即修正依頼
// ❌ 修正前
function createTodo(data: any) { ... }

// ✅ 修正指示：「anyを使わずに型を明示してください。zodでバリデーションも追加して。」
```

### ルール4：セキュリティチェックをAIに依頼

```
「このAPIにセキュリティの問題があればすべて指摘して。
SQLインジェクション・認証・レート制限・入力バリデーション等をチェックして。」
```

### ルール5：定期的に「説明を求める」

```
「このコードで一番複雑な部分はどこ？
なぜこのアプローチを選んだか説明して。
代替案と比較したトレードオフも教えて。」
```

---

## Vibe Codingの限界：向かない場面

```
❌ 向かない場面：
- 要件が曖昧なまま始める（ゴミが量産される）
- AIが知らない社内フレームワーク・独自設計
- セキュリティクリティカルな認証・暗号化実装

✅ 向いている場面：
- ボイラープレート・CRUD実装
- 既存コードのリファクタリング
- テスト生成
- ドキュメント・コメント生成
- 新しいライブラリの使い方の習得
```

---

## まとめ

Vibe Codingは「AIに依存する開発」ではなく「AIを道具として使いこなす開発」です。

- **Cursor**：大規模プロジェクトでコードベース全体を理解させたい場合
- **Claude Code**：ターミナルで自動化・スクリプト実行まで含めた開発
- **GitHub Copilot Workspace**：Issue→PR自動化のワークフローを重視する場合

**エンジニアの価値は「コードを書く速度」から「何を作るかを決める判断力」にシフトしています。**

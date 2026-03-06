---
title: "Deno Deploy実践ガイド: Fresh 2.0でフルスタックアプリを開発・デプロイする"
description: "Deno DeployとFresh 2.0を使ったフルスタックWebアプリの開発からデプロイまでを実践的に解説。エッジコンピューティング、Deno KV連携、API設計、パフォーマンス最適化のベストプラクティスを紹介します。"
pubDate: "2026-03-05"
tags: ["Deno", "TypeScript", "フルスタック", "Web開発", "サーバーレス", "Fresh", "エッジコンピューティング"]
category: "Backend"
---

Deno DeployとFresh 2.0を組み合わせると、TypeScriptだけでフロントエンドからバックエンド、データベースまで一貫したフルスタックアプリケーションを構築できます。本記事では、プロジェクトのセットアップからプロダクションデプロイまで、実践的なコード例を交えて解説します。

## 概要

### Deno Deployとは

Deno Deployは、Denoが提供するエッジコンピューティングプラットフォームです。世界35以上のリージョンにデプロイされ、ユーザーに最も近いエッジサーバーからレスポンスを返すことで、低レイテンシーを実現します。

```typescript
// Deno Deployの特徴
/**
 * 1. ゼロコンフィグデプロイ - GitHubリポジトリ連携で自動デプロイ
 * 2. エッジランタイム - 世界35+リージョンで実行
 * 3. Deno KV統合 - グローバル分散KVストアが組み込み
 * 4. Web標準API - fetch, Request, Response をネイティブサポート
 * 5. 無料枠あり - 月10万リクエストまで無料
 * 6. サブミリ秒コールドスタート - 従来のサーバーレスより高速
 */
```

### Fresh 2.0とは

Fresh 2.0は、Deno向けのフルスタックWebフレームワークです。Island Architectureを採用し、必要最小限のJavaScriptだけをクライアントに配信することで、卓越したパフォーマンスを実現します。

```typescript
// Fresh 2.0の主要な改善点
/**
 * - Preact Signalsによるリアクティブ状態管理
 * - 改善されたルーティングシステム
 * - プラグインアーキテクチャの強化
 * - Ahead-of-Time (AoT) ビルドモード
 * - Partials（部分更新）によるSPA風ナビゲーション
 * - Tailwind CSS統合の改善
 */
```

### なぜDeno Deploy + Fresh 2.0なのか

従来のフルスタック開発では、フロントエンドとバックエンドで異なるフレームワーク、異なるデプロイ先を使う必要がありました。Deno Deploy + Fresh 2.0では、これがすべて統一されます。

| 比較項目 | 従来のスタック | Deno Deploy + Fresh 2.0 |
|---------|-------------|----------------------|
| 言語 | JS + TS（設定必要） | TypeScript（ゼロ設定） |
| フロントエンド | React/Vue + Vite/Webpack | Preact + Island Architecture |
| バックエンド | Express/Fastify | Fresh ルートハンドラ |
| データベース | PostgreSQL/MongoDB（別途構築） | Deno KV（組み込み） |
| デプロイ | Vercel/AWS（設定複雑） | Deno Deploy（Git push） |
| コールドスタート | 数百ms〜数秒 | サブミリ秒 |

## セットアップ

### Deno 2のインストール

まず、Deno 2をインストールします。

```bash
# macOS / Linux
curl -fsSL https://deno.land/install.sh | sh

# Homebrew
brew install deno

# バージョン確認
deno --version
# deno 2.x.x
# v8 12.x.x
# typescript 5.x.x
```

### Fresh 2.0プロジェクトの作成

```bash
# Fresh 2.0プロジェクトを作成
deno run -A https://fresh.deno.dev my-fullstack-app

# プロジェクトに移動
cd my-fullstack-app

# 開発サーバーを起動
deno task dev
```

生成されるプロジェクト構造は以下の通りです。

```
my-fullstack-app/
├── deno.json          # Denoの設定ファイル
├── dev.ts             # 開発サーバーのエントリポイント
├── main.ts            # 本番サーバーのエントリポイント
├── fresh.gen.ts       # 自動生成のマニフェスト
├── components/        # 共有コンポーネント
│   └── Button.tsx
├── islands/           # インタラクティブコンポーネント（Island）
│   └── Counter.tsx
├── routes/            # ファイルベースルーティング
│   ├── _app.tsx       # アプリケーションラッパー
│   ├── _layout.tsx    # レイアウト
│   ├── index.tsx      # トップページ
│   └── api/           # APIルート
│       └── joke.ts
├── static/            # 静的ファイル
│   ├── favicon.ico
│   └── styles.css
└── tests/             # テストファイル
```

### deno.jsonの設定

```json
{
  "lock": false,
  "tasks": {
    "check": "deno fmt --check && deno lint && deno check **/*.ts && deno check **/*.tsx",
    "dev": "deno run -A --watch=static/,routes/ dev.ts",
    "build": "deno run -A dev.ts build",
    "start": "deno run -A main.ts",
    "preview": "deno run -A main.ts"
  },
  "imports": {
    "$fresh/": "https://deno.land/x/fresh@2.0.0/",
    "preact": "https://esm.sh/preact@10.22.0",
    "preact/": "https://esm.sh/preact@10.22.0/",
    "@preact/signals": "https://esm.sh/@preact/signals@1.2.3",
    "@preact/signals-core": "https://esm.sh/@preact/signals-core@1.6.0",
    "tailwindcss": "npm:tailwindcss@3.4.0",
    "tailwindcss/": "npm:tailwindcss@3.4.0/"
  },
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "preact"
  },
  "exclude": ["**/_fresh/*"]
}
```

## 実装

### ルーティングとページコンポーネント

Fresh 2.0のファイルベースルーティングで、ページとAPIを定義します。

```typescript
// routes/index.tsx - トップページ
import { define } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import TaskList from "../islands/TaskList.tsx";

export default define.page(function HomePage() {
  return (
    <>
      <Head>
        <title>タスク管理アプリ</title>
        <meta name="description" content="Deno Deploy + Fresh 2.0で構築したタスク管理アプリ" />
      </Head>
      <div class="max-w-4xl mx-auto p-6">
        <h1 class="text-3xl font-bold mb-6">タスク管理アプリ</h1>
        <p class="text-gray-600 mb-8">
          Deno Deploy + Fresh 2.0で構築されたフルスタックアプリです。
        </p>
        {/* Island: クライアントサイドで動的に動作 */}
        <TaskList />
      </div>
    </>
  );
});
```

### データ取得付きページ（Server-Side Rendering）

```typescript
// routes/tasks/[id].tsx - タスク詳細ページ
import { define } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import { getTask } from "../../services/task-service.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const taskId = ctx.params.id;
    const task = await getTask(taskId);

    if (!task) {
      return ctx.renderNotFound();
    }

    return ctx.render({ task });
  },
});

export default define.page<typeof handler>(function TaskDetailPage({ data }) {
  const { task } = data;

  return (
    <>
      <Head>
        <title>{task.title} - タスク管理</title>
      </Head>
      <div class="max-w-4xl mx-auto p-6">
        <a href="/" class="text-blue-600 hover:underline mb-4 inline-block">
          &larr; 一覧に戻る
        </a>
        <div class="bg-white rounded-lg shadow p-6">
          <h1 class="text-2xl font-bold mb-2">{task.title}</h1>
          <p class="text-gray-600 mb-4">{task.description}</p>
          <div class="flex gap-4 text-sm text-gray-500">
            <span>ステータス: {task.completed ? "完了" : "未完了"}</span>
            <span>作成日: {new Date(task.createdAt).toLocaleDateString("ja-JP")}</span>
          </div>
        </div>
      </div>
    </>
  );
});
```

### Islandコンポーネント（インタラクティブUI）

```typescript
// islands/TaskList.tsx
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: string;
}

export default function TaskList() {
  const tasks = useSignal<Task[]>([]);
  const newTitle = useSignal("");
  const newDescription = useSignal("");
  const isLoading = useSignal(true);
  const error = useSignal<string | null>(null);

  // タスク一覧を取得
  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    isLoading.value = true;
    try {
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error("タスクの取得に失敗しました");
      tasks.value = await res.json();
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      isLoading.value = false;
    }
  }

  async function addTask(e: Event) {
    e.preventDefault();
    if (!newTitle.value.trim()) return;

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.value,
          description: newDescription.value,
        }),
      });

      if (!res.ok) throw new Error("タスクの追加に失敗しました");

      const task = await res.json();
      tasks.value = [...tasks.value, task];
      newTitle.value = "";
      newDescription.value = "";
    } catch (e) {
      error.value = (e as Error).message;
    }
  }

  async function toggleTask(id: string) {
    const task = tasks.value.find((t) => t.id === id);
    if (!task) return;

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !task.completed }),
      });

      if (!res.ok) throw new Error("タスクの更新に失敗しました");

      const updated = await res.json();
      tasks.value = tasks.value.map((t) => (t.id === id ? updated : t));
    } catch (e) {
      error.value = (e as Error).message;
    }
  }

  async function deleteTask(id: string) {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("タスクの削除に失敗しました");
      tasks.value = tasks.value.filter((t) => t.id !== id);
    } catch (e) {
      error.value = (e as Error).message;
    }
  }

  if (isLoading.value) {
    return <div class="text-center py-8">読み込み中...</div>;
  }

  return (
    <div>
      {error.value && (
        <div class="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error.value}
        </div>
      )}

      {/* タスク追加フォーム */}
      <form onSubmit={addTask} class="bg-white rounded-lg shadow p-4 mb-6">
        <h2 class="text-lg font-semibold mb-3">新しいタスク</h2>
        <input
          type="text"
          placeholder="タイトル"
          value={newTitle.value}
          onInput={(e) => (newTitle.value = (e.target as HTMLInputElement).value)}
          class="w-full border rounded px-3 py-2 mb-2"
          required
        />
        <textarea
          placeholder="説明（任意）"
          value={newDescription.value}
          onInput={(e) => (newDescription.value = (e.target as HTMLTextAreaElement).value)}
          class="w-full border rounded px-3 py-2 mb-3"
          rows={2}
        />
        <button
          type="submit"
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          追加
        </button>
      </form>

      {/* タスク一覧 */}
      <div class="space-y-3">
        {tasks.value.length === 0 ? (
          <p class="text-gray-500 text-center py-8">タスクがありません</p>
        ) : (
          tasks.value.map((task) => (
            <div
              key={task.id}
              class={`bg-white rounded-lg shadow p-4 flex items-center gap-4 ${
                task.completed ? "opacity-60" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleTask(task.id)}
                class="w-5 h-5"
              />
              <div class="flex-1">
                <h3
                  class={`font-medium ${
                    task.completed ? "line-through text-gray-400" : ""
                  }`}
                >
                  {task.title}
                </h3>
                {task.description && (
                  <p class="text-sm text-gray-500">{task.description}</p>
                )}
              </div>
              <button
                onClick={() => deleteTask(task.id)}
                class="text-red-500 hover:text-red-700 text-sm"
              >
                削除
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

### APIルートの実装

```typescript
// routes/api/tasks/index.ts - タスクCRUD API
import { define } from "$fresh/server.ts";
import {
  createTask,
  getAllTasks,
} from "../../../services/task-service.ts";

export const handler = define.handlers({
  // GET /api/tasks - タスク一覧取得
  async GET(_ctx) {
    const tasks = await getAllTasks();
    return new Response(JSON.stringify(tasks), {
      headers: { "Content-Type": "application/json" },
    });
  },

  // POST /api/tasks - タスク作成
  async POST(ctx) {
    const body = await ctx.req.json();
    const { title, description } = body;

    if (!title || typeof title !== "string") {
      return new Response(
        JSON.stringify({ error: "タイトルは必須です" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const task = await createTask(title, description || "");
    return new Response(JSON.stringify(task), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  },
});
```

```typescript
// routes/api/tasks/[id].ts - 個別タスクAPI
import { define } from "$fresh/server.ts";
import {
  deleteTask,
  getTask,
  updateTask,
} from "../../../services/task-service.ts";

export const handler = define.handlers({
  // GET /api/tasks/:id
  async GET(ctx) {
    const task = await getTask(ctx.params.id);
    if (!task) {
      return new Response(
        JSON.stringify({ error: "タスクが見つかりません" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(JSON.stringify(task), {
      headers: { "Content-Type": "application/json" },
    });
  },

  // PATCH /api/tasks/:id
  async PATCH(ctx) {
    const body = await ctx.req.json();
    const task = await updateTask(ctx.params.id, body);
    if (!task) {
      return new Response(
        JSON.stringify({ error: "タスクが見つかりません" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(JSON.stringify(task), {
      headers: { "Content-Type": "application/json" },
    });
  },

  // DELETE /api/tasks/:id
  async DELETE(ctx) {
    const success = await deleteTask(ctx.params.id);
    if (!success) {
      return new Response(
        JSON.stringify({ error: "タスクが見つかりません" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(null, { status: 204 });
  },
});
```

### Deno KVを使ったサービス層

```typescript
// services/task-service.ts
interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

const kv = await Deno.openKv();

// タスク作成
export async function createTask(
  title: string,
  description: string,
): Promise<Task> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const task: Task = {
    id,
    title,
    description,
    completed: false,
    createdAt: now,
    updatedAt: now,
  };

  // プライマリキーとセカンダリインデックスをアトミックに設定
  const result = await kv.atomic()
    .set(["tasks", id], task)
    .set(["tasks_by_date", now, id], task)
    .commit();

  if (!result.ok) {
    throw new Error("タスクの作成に失敗しました");
  }

  return task;
}

// タスク取得
export async function getTask(id: string): Promise<Task | null> {
  const result = await kv.get<Task>(["tasks", id]);
  return result.value;
}

// タスク一覧取得
export async function getAllTasks(): Promise<Task[]> {
  const tasks: Task[] = [];
  const entries = kv.list<Task>({ prefix: ["tasks_by_date"] });

  for await (const entry of entries) {
    tasks.push(entry.value);
  }

  // 新しい順にソート
  return tasks.reverse();
}

// タスク更新
export async function updateTask(
  id: string,
  updates: Partial<Pick<Task, "title" | "description" | "completed">>,
): Promise<Task | null> {
  const existing = await kv.get<Task>(["tasks", id]);
  if (!existing.value) return null;

  const updated: Task = {
    ...existing.value,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  // バージョンチェック付きアトミック更新（楽観的ロック）
  const result = await kv.atomic()
    .check(existing) // バージョンが変わっていないか確認
    .set(["tasks", id], updated)
    .set(["tasks_by_date", existing.value.createdAt, id], updated)
    .commit();

  if (!result.ok) {
    throw new Error("競合が発生しました。再試行してください。");
  }

  return updated;
}

// タスク削除
export async function deleteTask(id: string): Promise<boolean> {
  const existing = await kv.get<Task>(["tasks", id]);
  if (!existing.value) return false;

  await kv.atomic()
    .delete(["tasks", id])
    .delete(["tasks_by_date", existing.value.createdAt, id])
    .commit();

  return true;
}
```

### ミドルウェアの実装

```typescript
// routes/_middleware.ts - グローバルミドルウェア
import { define } from "$fresh/server.ts";

export const handler = define.middleware([
  // CORS設定
  async function corsMiddleware(ctx) {
    const resp = await ctx.next();

    // APIルートにCORSヘッダーを追加
    if (ctx.url.pathname.startsWith("/api/")) {
      resp.headers.set("Access-Control-Allow-Origin", "*");
      resp.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PATCH, DELETE, OPTIONS",
      );
      resp.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization",
      );
    }

    return resp;
  },

  // リクエストログ
  async function loggingMiddleware(ctx) {
    const start = performance.now();
    const resp = await ctx.next();
    const duration = (performance.now() - start).toFixed(1);

    console.log(
      `${ctx.req.method} ${ctx.url.pathname} - ${resp.status} (${duration}ms)`,
    );

    return resp;
  },

  // レートリミット（簡易版）
  async function rateLimitMiddleware(ctx) {
    if (!ctx.url.pathname.startsWith("/api/")) {
      return ctx.next();
    }

    const ip = ctx.req.headers.get("x-forwarded-for") || "unknown";
    const kv = await Deno.openKv();
    const key = ["rate_limit", ip];
    const now = Date.now();
    const windowMs = 60_000; // 1分間
    const maxRequests = 100;

    const entry = await kv.get<{ count: number; resetAt: number }>(key);

    if (entry.value && entry.value.resetAt > now) {
      if (entry.value.count >= maxRequests) {
        return new Response(
          JSON.stringify({ error: "リクエスト制限を超えました" }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(
                Math.ceil((entry.value.resetAt - now) / 1000),
              ),
            },
          },
        );
      }

      await kv.set(key, {
        count: entry.value.count + 1,
        resetAt: entry.value.resetAt,
      });
    } else {
      await kv.set(key, {
        count: 1,
        resetAt: now + windowMs,
      }, { expireIn: windowMs });
    }

    return ctx.next();
  },
]);
```

### 認証機能の追加

```typescript
// services/auth-service.ts
import { encodeHex } from "https://deno.land/std/encoding/hex.ts";

const kv = await Deno.openKv();

interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

interface Session {
  userId: string;
  createdAt: string;
  expiresAt: string;
}

// パスワードハッシュ化
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return encodeHex(new Uint8Array(hash));
}

// ユーザー登録
export async function registerUser(
  email: string,
  password: string,
): Promise<{ success: boolean; error?: string }> {
  // 既存ユーザーチェック
  const existing = await kv.get(["users_by_email", email]);
  if (existing.value) {
    return { success: false, error: "このメールアドレスは既に登録されています" };
  }

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const user: User = {
    id,
    email,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  await kv.atomic()
    .check(existing) // 競合防止
    .set(["users", id], user)
    .set(["users_by_email", email], user)
    .commit();

  return { success: true };
}

// ログイン
export async function loginUser(
  email: string,
  password: string,
): Promise<{ sessionId: string } | { error: string }> {
  const userEntry = await kv.get<User>(["users_by_email", email]);
  if (!userEntry.value) {
    return { error: "メールアドレスまたはパスワードが正しくありません" };
  }

  const passwordHash = await hashPassword(password);
  if (userEntry.value.passwordHash !== passwordHash) {
    return { error: "メールアドレスまたはパスワードが正しくありません" };
  }

  // セッション作成
  const sessionId = crypto.randomUUID();
  const session: Session = {
    userId: userEntry.value.id,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };

  // 7日間で自動期限切れ
  await kv.set(["sessions", sessionId], session, {
    expireIn: 7 * 24 * 60 * 60 * 1000,
  });

  return { sessionId };
}

// セッション検証
export async function validateSession(
  sessionId: string,
): Promise<User | null> {
  const session = await kv.get<Session>(["sessions", sessionId]);
  if (!session.value) return null;

  if (new Date(session.value.expiresAt) < new Date()) {
    await kv.delete(["sessions", sessionId]);
    return null;
  }

  const user = await kv.get<User>(["users", session.value.userId]);
  return user.value;
}
```

### Scheduled Tasks（定期実行タスク）

Deno Deployでは、Deno.cronを使って定期実行タスクを簡単に設定できます。

```typescript
// tasks/scheduled.ts - 定期実行タスク
const kv = await Deno.openKv();

// 毎日午前3時に期限切れタスクを削除
Deno.cron("cleanup-expired-tasks", "0 3 * * *", async () => {
  console.log("期限切れタスクのクリーンアップを開始");

  const entries = kv.list<{ completed: boolean; updatedAt: string }>({
    prefix: ["tasks"],
  });

  let deletedCount = 0;
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  for await (const entry of entries) {
    if (
      entry.value.completed &&
      entry.value.updatedAt < thirtyDaysAgo
    ) {
      await kv.delete(entry.key);
      deletedCount++;
    }
  }

  console.log(`${deletedCount}件の期限切れタスクを削除しました`);
});

// 毎時間、統計情報を更新
Deno.cron("update-stats", "0 * * * *", async () => {
  const entries = kv.list({ prefix: ["tasks"] });

  let total = 0;
  let completed = 0;

  for await (const entry of entries) {
    total++;
    if ((entry.value as { completed: boolean }).completed) {
      completed++;
    }
  }

  await kv.set(["stats", "tasks"], {
    total,
    completed,
    pending: total - completed,
    updatedAt: new Date().toISOString(),
  });
});
```

### BroadcastChannelによるリアルタイム通知

Deno Deployのエッジインスタンス間でメッセージをブロードキャストできます。

```typescript
// services/realtime.ts - リアルタイム通知
const channel = new BroadcastChannel("task-updates");

// Server-Sent Events エンドポイント
// routes/api/events.ts
import { define } from "$fresh/server.ts";

export const handler = define.handlers({
  GET(_ctx) {
    const channel = new BroadcastChannel("task-updates");

    const stream = new ReadableStream({
      start(controller) {
        channel.onmessage = (event) => {
          const data = JSON.stringify(event.data);
          controller.enqueue(
            new TextEncoder().encode(`data: ${data}\n\n`),
          );
        };
      },
      cancel() {
        channel.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  },
});

// タスク更新時にブロードキャスト
export function notifyTaskUpdate(
  action: "created" | "updated" | "deleted",
  taskId: string,
) {
  const channel = new BroadcastChannel("task-updates");
  channel.postMessage({ action, taskId, timestamp: Date.now() });
  channel.close();
}
```

## デプロイ

### Deno Deployへのデプロイ手順

Deno Deployへのデプロイは、GitHub連携で自動化できます。

#### 1. GitHubリポジトリの準備

```bash
# Gitリポジトリを初期化（まだの場合）
git init
git add .
git commit -m "Initial commit: Fresh 2.0 fullstack app"

# GitHubにプッシュ
git remote add origin https://github.com/your-name/my-fullstack-app.git
git push -u origin main
```

#### 2. Deno Deployでプロジェクト作成

1. [dash.deno.com](https://dash.deno.com) にアクセスしてサインイン
2. 「New Project」をクリック
3. GitHubリポジトリを選択
4. エントリポイントに `main.ts` を指定
5. 「Link」をクリックしてデプロイ

以降は `main` ブランチへのpushで自動デプロイが実行されます。

#### 3. deployctlによるCLIデプロイ

CI/CDパイプラインや手動デプロイにはCLIツールを使います。

```bash
# deployctlをインストール
deno install -A --no-check -r -f https://deno.land/x/deploy/deployctl.ts

# デプロイ実行
deployctl deploy --project=my-fullstack-app --prod main.ts

# プレビューデプロイ（本番に影響しない）
deployctl deploy --project=my-fullstack-app main.ts
```

#### 4. 環境変数の設定

```bash
# Deno Deployダッシュボードで環境変数を設定
# Settings > Environment Variables

# または deployctl で設定
deployctl env set --project=my-fullstack-app API_KEY=your-secret-key
```

コード内での環境変数の参照方法は以下の通りです。

```typescript
// 環境変数の参照
const apiKey = Deno.env.get("API_KEY");

if (!apiKey) {
  throw new Error("API_KEY環境変数が設定されていません");
}
```

### GitHub Actionsとの連携

```yaml
# .github/workflows/deploy.yml
name: Deploy to Deno Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: denoland/setup-deno@v1
        with:
          deno-version: v2.x

      - name: Lint
        run: deno lint

      - name: Type Check
        run: deno check **/*.ts **/*.tsx

      - name: Test
        run: deno test -A

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: denoland/deployctl@v1
        with:
          project: my-fullstack-app
          entrypoint: main.ts
```

### カスタムドメインの設定

Deno Deployでは、カスタムドメインを簡単に設定できます。

1. ダッシュボードの「Settings」> 「Domains」で「Add Domain」
2. ドメインを入力（例: `app.example.com`）
3. DNSレコードを設定（CNAME: `app.example.com` -> `my-fullstack-app.deno.dev`）
4. SSL証明書が自動発行される

## ベストプラクティス

### 1. エラーハンドリングの統一

```typescript
// utils/api-response.ts - 統一レスポンスヘルパー
export function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function errorResponse(
  message: string,
  status = 500,
): Response {
  console.error(`[API Error] ${status}: ${message}`);
  return jsonResponse({ error: message }, status);
}

// routes/_500.tsx - グローバルエラーページ
import { define } from "$fresh/server.ts";

export default define.page(function ErrorPage({ error }) {
  return (
    <div class="max-w-4xl mx-auto p-6 text-center">
      <h1 class="text-4xl font-bold text-red-600 mb-4">
        エラーが発生しました
      </h1>
      <p class="text-gray-600 mb-6">
        申し訳ございません。問題が発生しました。しばらくしてからもう一度お試しください。
      </p>
      <a href="/" class="text-blue-600 hover:underline">
        トップページに戻る
      </a>
    </div>
  );
});
```

### 2. Deno KVのパフォーマンス最適化

```typescript
// services/optimized-task-service.ts

const kv = await Deno.openKv();

// バッチ取得で複数キーを効率的に取得
export async function getTasksByIds(ids: string[]): Promise<Task[]> {
  const keys = ids.map((id) => ["tasks", id] as const);
  const results = await kv.getMany<Task[]>(keys);
  return results
    .filter((r) => r.value !== null)
    .map((r) => r.value as Task);
}

// ページネーション付きリスト取得
export async function getTasksPaginated(
  cursor?: string,
  limit = 20,
): Promise<{ tasks: Task[]; cursor: string | null }> {
  const tasks: Task[] = [];
  const iter = kv.list<Task>(
    { prefix: ["tasks_by_date"] },
    { limit: limit + 1, cursor: cursor || undefined, reverse: true },
  );

  for await (const entry of iter) {
    tasks.push(entry.value);
  }

  // 次のページがあるかチェック
  const hasMore = tasks.length > limit;
  if (hasMore) tasks.pop();

  return {
    tasks,
    cursor: hasMore ? iter.cursor : null,
  };
}

// キャッシュ付きデータ取得
export async function getCachedStats(): Promise<{
  total: number;
  completed: number;
}> {
  const cached = await kv.get<{
    total: number;
    completed: number;
    updatedAt: string;
  }>(["stats", "tasks"]);

  // 5分以内のキャッシュがあればそれを返す
  if (cached.value) {
    const age = Date.now() - new Date(cached.value.updatedAt).getTime();
    if (age < 5 * 60 * 1000) {
      return {
        total: cached.value.total,
        completed: cached.value.completed,
      };
    }
  }

  // キャッシュが古い場合は再計算
  const entries = kv.list({ prefix: ["tasks"] });
  let total = 0;
  let completed = 0;
  for await (const entry of entries) {
    total++;
    if ((entry.value as Task).completed) completed++;
  }

  await kv.set(["stats", "tasks"], {
    total,
    completed,
    updatedAt: new Date().toISOString(),
  }, { expireIn: 5 * 60 * 1000 });

  return { total, completed };
}
```

### 3. テストの書き方

```typescript
// tests/task-service_test.ts
import { assertEquals, assertExists } from "https://deno.land/std/assert/mod.ts";
import {
  createTask,
  deleteTask,
  getAllTasks,
  getTask,
  updateTask,
} from "../services/task-service.ts";

Deno.test("タスクサービス", async (t) => {
  await t.step("タスクを作成できる", async () => {
    const task = await createTask("テストタスク", "テストの説明");
    assertExists(task.id);
    assertEquals(task.title, "テストタスク");
    assertEquals(task.description, "テストの説明");
    assertEquals(task.completed, false);

    // クリーンアップ
    await deleteTask(task.id);
  });

  await t.step("タスクを取得できる", async () => {
    const created = await createTask("取得テスト", "");
    const fetched = await getTask(created.id);
    assertExists(fetched);
    assertEquals(fetched!.title, "取得テスト");

    await deleteTask(created.id);
  });

  await t.step("タスクを更新できる", async () => {
    const created = await createTask("更新テスト", "");
    const updated = await updateTask(created.id, {
      completed: true,
      title: "更新済みタスク",
    });
    assertExists(updated);
    assertEquals(updated!.completed, true);
    assertEquals(updated!.title, "更新済みタスク");

    await deleteTask(created.id);
  });

  await t.step("タスクを削除できる", async () => {
    const created = await createTask("削除テスト", "");
    const result = await deleteTask(created.id);
    assertEquals(result, true);

    const fetched = await getTask(created.id);
    assertEquals(fetched, null);
  });

  await t.step("全タスクを取得できる", async () => {
    const task1 = await createTask("タスク1", "");
    const task2 = await createTask("タスク2", "");

    const tasks = await getAllTasks();
    assertEquals(tasks.length >= 2, true);

    await deleteTask(task1.id);
    await deleteTask(task2.id);
  });
});
```

```bash
# テスト実行
deno test -A

# 特定のテストファイルのみ実行
deno test -A tests/task-service_test.ts

# カバレッジ付き
deno test -A --coverage=coverage/
deno coverage coverage/
```

### 4. パフォーマンス最適化のポイント

Deno Deploy + Fresh 2.0のパフォーマンスを最大限に引き出すためのポイントをまとめます。

```typescript
// fresh.config.ts - ビルド最適化設定
import { defineConfig } from "$fresh/server.ts";
import tailwind from "$fresh/plugins/tailwind.ts";

export default defineConfig({
  plugins: [tailwind()],
  build: {
    // Ahead-of-Time ビルドで初回ロードを高速化
    target: ["chrome99", "firefox99", "safari15"],
  },
});
```

**Island Architectureを最大限活用する原則**

1. **Islandは最小限に** - インタラクティブな部分だけをIslandにする
2. **静的コンテンツはルートコンポーネントで** - JSが不要な部分はサーバーレンダリング
3. **Partialsで部分更新** - ページ全体の再レンダリングを避ける
4. **画像はstaticディレクトリに** - CDN経由で自動配信される

```typescript
// routes/about.tsx - 完全に静的なページ（JSゼロ）
import { define } from "$fresh/server.ts";

export default define.page(function AboutPage() {
  return (
    <div class="max-w-4xl mx-auto p-6">
      <h1 class="text-3xl font-bold mb-4">このアプリについて</h1>
      <p class="text-gray-600">
        Deno Deploy + Fresh 2.0で構築されたタスク管理アプリケーションです。
        エッジコンピューティングにより、世界中どこからでも高速にアクセスできます。
      </p>
      {/* このページはJavaScriptを一切送信しない */}
    </div>
  );
});
```

### 5. セキュリティのベストプラクティス

```typescript
// middleware/security.ts - セキュリティヘッダー
export function securityHeaders(resp: Response): Response {
  // XSS対策
  resp.headers.set("X-Content-Type-Options", "nosniff");
  resp.headers.set("X-Frame-Options", "DENY");
  resp.headers.set("X-XSS-Protection", "1; mode=block");

  // CSP設定
  resp.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self'",
    ].join("; "),
  );

  // HSTS
  resp.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );

  return resp;
}
```

## まとめ

Deno Deploy + Fresh 2.0を使ったフルスタックアプリ開発の全体像を解説しました。

**この構成の主なメリット**

- **TypeScript統一**: フロントエンドからバックエンド、データベース操作まですべてTypeScript
- **ゼロコンフィグ**: webpack/Viteなどのバンドラー設定が不要
- **エッジ実行**: 世界中のエッジサーバーで低レイテンシー
- **組み込みDB**: Deno KVでデータベースのセットアップ不要
- **自動デプロイ**: GitHub連携でpushするだけ
- **無料枠**: 個人プロジェクトや小規模サービスなら無料で運用可能

**開発フロー**

1. `deno run -A https://fresh.deno.dev` でプロジェクト作成
2. ルート、Island、サービス層を実装
3. `deno test -A` でテスト
4. GitHubにpushして自動デプロイ

サーバーレスでありながらフルスタックの開発体験を提供するDeno Deploy + Fresh 2.0は、次世代のWebアプリケーション開発に最適な選択肢の一つです。特に、TypeScriptを使ったプロジェクトで、インフラ管理のオーバーヘッドを最小限にしたい場合に強力な選択肢となるでしょう。

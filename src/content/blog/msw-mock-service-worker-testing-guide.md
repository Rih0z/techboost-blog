---
title: "MSW（Mock Service Worker）でAPI モックテスト実践"
description: "Mock Service Worker（MSW）を使ったAPIモックテストの実践方法を解説。REST/GraphQLのハンドラー定義からVitest・Playwright連携、ネットワーク境界テストまでTypeScriptの実装例付きで紹介します。"
pubDate: "2026-03-09"
tags: ["testing", "JavaScript", "TypeScript", "エンジニア"]
heroImage: '../../assets/thumbnails/msw-mock-service-worker-testing-guide.jpg'
---

## はじめに

フロントエンド開発において、APIとの通信をテストすることは避けて通れない。しかし、実際のバックエンドサーバーに依存したテストは不安定で遅い。

Mock Service Worker（MSW）は、Service Workerを活用してネットワークレベルでAPIリクエストをインターセプトし、モックレスポンスを返すライブラリだ。従来のaxiosやfetchのモックと異なり、アプリケーションコードを一切変更せずにAPIモックが実現できる。

この記事では、MSW 2.xの導入からREST/GraphQLのハンドラー定義、Vitest・Playwrightとの連携、ネットワーク境界テストのベストプラクティスまで、TypeScriptの実装例付きで解説する。

---

## MSWの基本概念

### なぜMSWなのか

従来のAPIモック手法とMSWの違いを理解しておこう。

| 手法 | 仕組み | メリット | デメリット |
|------|--------|---------|-----------|
| **jest.mock / vi.mock** | モジュール差し替え | 設定が簡単 | 実装の詳細に依存する |
| **nock** | Node.js httpモジュールをパッチ | サーバーサイドで使いやすい | ブラウザでは使えない |
| **json-server** | ローカルRESTサーバー | 実サーバーに近い | 別プロセスの起動が必要 |
| **MSW** | Service Worker / Node.jsインターセプター | ネットワークレベルでインターセプト | Service Workerの理解が必要 |

MSWの最大の強みは「ネットワーク境界でのインターセプト」だ。fetch、axios、GraphQLクライアントなど、どのHTTPクライアントを使っていても同じハンドラーでモックできる。

### MSW 2.xのアーキテクチャ

MSW 2.xは以下の2つの動作モードを持つ。

- **ブラウザモード**: Service Workerを登録してリクエストをインターセプト
- **Node.jsモード**: `@mswjs/interceptors`でNode.jsのHTTPモジュールをインターセプト

テスト環境（Vitest、Jest）ではNode.jsモード、ブラウザでの開発時にはブラウザモードを使い分ける。

---

## セットアップ

### インストール

```bash
# npmの場合
npm install msw --save-dev

# pnpmの場合
pnpm add -D msw

# yarnの場合
yarn add -D msw
```

### ブラウザモード用のService Worker生成

```bash
# publicディレクトリにService Workerファイルを生成
npx msw init public/ --save
```

このコマンドで`public/mockServiceWorker.js`が生成される。このファイルはMSWが管理するため、手動で編集しないこと。

### ディレクトリ構成

以下のような構成を推奨する。

```
src/
├── mocks/
│   ├── handlers/
│   │   ├── user.ts        # ユーザー関連のハンドラー
│   │   ├── post.ts        # 投稿関連のハンドラー
│   │   └── index.ts       # ハンドラーの集約
│   ├── fixtures/
│   │   ├── users.ts       # ユーザーのテストデータ
│   │   └── posts.ts       # 投稿のテストデータ
│   ├── browser.ts         # ブラウザモードのセットアップ
│   ├── server.ts          # Node.jsモードのセットアップ
│   └── handlers.ts        # 全ハンドラーのエクスポート
```

---

## RESTful APIのモック

### 型定義とフィクスチャ

まずはAPIレスポンスの型とテストデータを定義する。

```typescript
// src/mocks/fixtures/users.ts
export interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user" | "editor";
  createdAt: string;
}

export const mockUsers: User[] = [
  {
    id: 1,
    name: "田中太郎",
    email: "tanaka@example.com",
    role: "admin",
    createdAt: "2026-01-15T09:00:00Z",
  },
  {
    id: 2,
    name: "鈴木花子",
    email: "suzuki@example.com",
    role: "editor",
    createdAt: "2026-02-20T14:30:00Z",
  },
  {
    id: 3,
    name: "佐藤健一",
    email: "sato@example.com",
    role: "user",
    createdAt: "2026-03-01T10:00:00Z",
  },
];
```

```typescript
// src/mocks/fixtures/posts.ts
export interface Post {
  id: number;
  title: string;
  body: string;
  authorId: number;
  status: "draft" | "published" | "archived";
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export const mockPosts: Post[] = [
  {
    id: 1,
    title: "TypeScriptの型安全性について",
    body: "TypeScriptの型システムは...",
    authorId: 1,
    status: "published",
    tags: ["TypeScript", "programming"],
    createdAt: "2026-03-01T09:00:00Z",
    updatedAt: "2026-03-01T09:00:00Z",
  },
  {
    id: 2,
    title: "React Server Componentsの実践",
    body: "RSCを活用することで...",
    authorId: 2,
    status: "published",
    tags: ["React", "Next.js"],
    createdAt: "2026-03-05T14:00:00Z",
    updatedAt: "2026-03-06T10:00:00Z",
  },
];
```

### RESTハンドラーの定義

```typescript
// src/mocks/handlers/user.ts
import { http, HttpResponse, delay } from "msw";
import { mockUsers, type User } from "../fixtures/users";

const BASE_URL = "https://api.example.com";

// インメモリデータストア（テスト間で状態を保持）
let users = [...mockUsers];

export const userHandlers = [
  // GET /api/users - ユーザー一覧取得
  http.get(`${BASE_URL}/api/users`, async ({ request }) => {
    const url = new URL(request.url);
    const role = url.searchParams.get("role");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");

    let filtered = [...users];

    // ロールでフィルタリング
    if (role) {
      filtered = filtered.filter((u) => u.role === role);
    }

    // ページネーション
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    await delay(100); // ネットワーク遅延のシミュレーション

    return HttpResponse.json({
      data: paginated,
      total: filtered.length,
      page,
      limit,
    });
  }),

  // GET /api/users/:id - ユーザー詳細取得
  http.get(`${BASE_URL}/api/users/:id`, async ({ params }) => {
    const { id } = params;
    const user = users.find((u) => u.id === Number(id));

    if (!user) {
      return HttpResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    return HttpResponse.json({ data: user });
  }),

  // POST /api/users - ユーザー作成
  http.post(`${BASE_URL}/api/users`, async ({ request }) => {
    const body = (await request.json()) as Omit<User, "id" | "createdAt">;

    // バリデーション
    if (!body.name || !body.email) {
      return HttpResponse.json(
        {
          error: "Validation failed",
          details: {
            name: !body.name ? "Name is required" : undefined,
            email: !body.email ? "Email is required" : undefined,
          },
        },
        { status: 422 }
      );
    }

    // メール重複チェック
    if (users.some((u) => u.email === body.email)) {
      return HttpResponse.json(
        { error: "Email already exists", code: "DUPLICATE_EMAIL" },
        { status: 409 }
      );
    }

    const newUser: User = {
      ...body,
      id: Math.max(...users.map((u) => u.id)) + 1,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);

    return HttpResponse.json({ data: newUser }, { status: 201 });
  }),

  // PUT /api/users/:id - ユーザー更新
  http.put(`${BASE_URL}/api/users/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as Partial<User>;
    const index = users.findIndex((u) => u.id === Number(id));

    if (index === -1) {
      return HttpResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    users[index] = { ...users[index], ...body };

    return HttpResponse.json({ data: users[index] });
  }),

  // DELETE /api/users/:id - ユーザー削除
  http.delete(`${BASE_URL}/api/users/:id`, async ({ params }) => {
    const { id } = params;
    const index = users.findIndex((u) => u.id === Number(id));

    if (index === -1) {
      return HttpResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    users.splice(index, 1);

    return new HttpResponse(null, { status: 204 });
  }),
];

// テスト間でデータをリセットするヘルパー
export function resetUserData(): void {
  users = [...mockUsers];
}
```

### 投稿関連のハンドラー

```typescript
// src/mocks/handlers/post.ts
import { http, HttpResponse } from "msw";
import { mockPosts, type Post } from "../fixtures/posts";

const BASE_URL = "https://api.example.com";

let posts = [...mockPosts];

export const postHandlers = [
  http.get(`${BASE_URL}/api/posts`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const tag = url.searchParams.get("tag");
    const authorId = url.searchParams.get("authorId");

    let filtered = [...posts];

    if (status) {
      filtered = filtered.filter((p) => p.status === status);
    }
    if (tag) {
      filtered = filtered.filter((p) => p.tags.includes(tag));
    }
    if (authorId) {
      filtered = filtered.filter((p) => p.authorId === Number(authorId));
    }

    return HttpResponse.json({ data: filtered, total: filtered.length });
  }),

  http.get(`${BASE_URL}/api/posts/:id`, ({ params }) => {
    const post = posts.find((p) => p.id === Number(params.id));

    if (!post) {
      return HttpResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    return HttpResponse.json({ data: post });
  }),

  http.post(`${BASE_URL}/api/posts`, async ({ request }) => {
    const body = (await request.json()) as Omit<
      Post,
      "id" | "createdAt" | "updatedAt"
    >;

    const newPost: Post = {
      ...body,
      id: Math.max(...posts.map((p) => p.id)) + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    posts.push(newPost);
    return HttpResponse.json({ data: newPost }, { status: 201 });
  }),

  http.patch(`${BASE_URL}/api/posts/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Partial<Post>;
    const index = posts.findIndex((p) => p.id === Number(params.id));

    if (index === -1) {
      return HttpResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    posts[index] = {
      ...posts[index],
      ...body,
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json({ data: posts[index] });
  }),
];

export function resetPostData(): void {
  posts = [...mockPosts];
}
```

### ハンドラーの集約

```typescript
// src/mocks/handlers/index.ts
import { userHandlers } from "./user";
import { postHandlers } from "./post";

export const handlers = [...userHandlers, ...postHandlers];
```

---

## GraphQLのモック

MSWはGraphQLのモックにも対応している。

### GraphQL型定義

```typescript
// src/mocks/handlers/graphql.ts
import { graphql, HttpResponse } from "msw";
import { mockUsers } from "../fixtures/users";
import { mockPosts } from "../fixtures/posts";

// GraphQLスキーマに基づく型
interface GetUsersQuery {
  users: {
    id: number;
    name: string;
    email: string;
    role: string;
  }[];
}

interface GetUserQuery {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    posts: {
      id: number;
      title: string;
      status: string;
    }[];
  } | null;
}

interface CreateUserMutation {
  createUser: {
    id: number;
    name: string;
    email: string;
  };
}

export const graphqlHandlers = [
  // Query: users
  graphql.query("GetUsers", ({ variables }) => {
    const { role, limit = 10 } = variables;

    let filtered = [...mockUsers];
    if (role) {
      filtered = filtered.filter((u) => u.role === role);
    }

    return HttpResponse.json({
      data: {
        users: filtered.slice(0, limit),
      },
    });
  }),

  // Query: user(id)
  graphql.query("GetUser", ({ variables }) => {
    const user = mockUsers.find((u) => u.id === variables.id);

    if (!user) {
      return HttpResponse.json({
        data: { user: null },
        errors: [
          {
            message: "User not found",
            extensions: { code: "NOT_FOUND" },
          },
        ],
      });
    }

    const userPosts = mockPosts
      .filter((p) => p.authorId === user.id)
      .map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
      }));

    return HttpResponse.json({
      data: {
        user: { ...user, posts: userPosts },
      },
    });
  }),

  // Mutation: createUser
  graphql.mutation("CreateUser", async ({ variables }) => {
    const { input } = variables;

    if (!input.name || !input.email) {
      return HttpResponse.json({
        data: null,
        errors: [
          {
            message: "Validation failed",
            extensions: {
              code: "VALIDATION_ERROR",
              fields: {
                name: !input.name ? "Required" : null,
                email: !input.email ? "Required" : null,
              },
            },
          },
        ],
      });
    }

    const newUser = {
      id: mockUsers.length + 1,
      name: input.name,
      email: input.email,
    };

    return HttpResponse.json({
      data: { createUser: newUser },
    });
  }),

  // Mutation: deleteUser
  graphql.mutation("DeleteUser", ({ variables }) => {
    const user = mockUsers.find((u) => u.id === variables.id);

    if (!user) {
      return HttpResponse.json({
        data: null,
        errors: [
          {
            message: "User not found",
            extensions: { code: "NOT_FOUND" },
          },
        ],
      });
    }

    return HttpResponse.json({
      data: { deleteUser: { success: true, id: variables.id } },
    });
  }),
];
```

---

## Vitest連携

### サーバーセットアップ

```typescript
// src/mocks/server.ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

### Vitestのグローバルセットアップ

```typescript
// vitest.setup.ts
import { beforeAll, afterAll, afterEach } from "vitest";
import { server } from "./src/mocks/server";

// テスト開始前にMSWサーバーを起動
beforeAll(() => {
  server.listen({
    onUnhandledRequest: "warn", // モックされていないリクエストを警告
  });
});

// 各テスト後にハンドラーをリセット
afterEach(() => {
  server.resetHandlers();
});

// 全テスト完了後にサーバーを停止
afterAll(() => {
  server.close();
});
```

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./vitest.setup.ts"],
    environment: "jsdom",
  },
});
```

### テストの実装

```typescript
// src/api/__tests__/userApi.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server";
import { resetUserData } from "../../mocks/handlers/user";

// テスト対象のAPI関数
async function fetchUsers(
  params?: Record<string, string>
): Promise<{ data: any[]; total: number }> {
  const url = new URL("https://api.example.com/api/users");
  if (params) {
    Object.entries(params).forEach(([key, value]) =>
      url.searchParams.set(key, value)
    );
  }
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function createUser(
  data: Record<string, string>
): Promise<{ data: any }> {
  const response = await fetch("https://api.example.com/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  return response.json();
}

describe("User API", () => {
  beforeEach(() => {
    resetUserData();
  });

  describe("fetchUsers", () => {
    it("全ユーザーを取得できる", async () => {
      const result = await fetchUsers();

      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.data[0].name).toBe("田中太郎");
    });

    it("ロールでフィルタリングできる", async () => {
      const result = await fetchUsers({ role: "admin" });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].role).toBe("admin");
    });

    it("ページネーションが正しく動作する", async () => {
      const result = await fetchUsers({ page: "1", limit: "2" });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
    });
  });

  describe("createUser", () => {
    it("新しいユーザーを作成できる", async () => {
      const result = await createUser({
        name: "山田花子",
        email: "yamada@example.com",
        role: "user",
      });

      expect(result.data.id).toBe(4);
      expect(result.data.name).toBe("山田花子");
    });

    it("バリデーションエラーを返す", async () => {
      await expect(
        createUser({ name: "", email: "" })
      ).rejects.toThrow("Validation failed");
    });

    it("メール重複でエラーを返す", async () => {
      await expect(
        createUser({
          name: "テスト",
          email: "tanaka@example.com",
          role: "user",
        })
      ).rejects.toThrow("Email already exists");
    });
  });

  describe("エラーハンドリング", () => {
    it("サーバーエラーをハンドリングできる", async () => {
      // テスト固有のハンドラーで上書き
      server.use(
        http.get("https://api.example.com/api/users", () => {
          return HttpResponse.json(
            { error: "Internal server error" },
            { status: 500 }
          );
        })
      );

      await expect(fetchUsers()).rejects.toThrow("HTTP 500");
    });

    it("ネットワークエラーをハンドリングできる", async () => {
      server.use(
        http.get("https://api.example.com/api/users", () => {
          return HttpResponse.error();
        })
      );

      await expect(fetchUsers()).rejects.toThrow();
    });

    it("タイムアウトをシミュレーションできる", async () => {
      server.use(
        http.get("https://api.example.com/api/users", async () => {
          // 長時間の遅延をシミュレーション
          await new Promise((resolve) => setTimeout(resolve, 10000));
          return HttpResponse.json({ data: [] });
        })
      );

      const controller = new AbortController();
      setTimeout(() => controller.abort(), 100);

      await expect(
        fetch("https://api.example.com/api/users", {
          signal: controller.signal,
        })
      ).rejects.toThrow();
    });
  });
});
```

### リクエストの検証

MSWではリクエストの内容を検証することもできる。

```typescript
// src/api/__tests__/requestValidation.test.ts
import { describe, it, expect, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server";

describe("リクエストの検証", () => {
  it("送信されたヘッダーを検証できる", async () => {
    const headerSpy = vi.fn();

    server.use(
      http.get("https://api.example.com/api/users", ({ request }) => {
        headerSpy({
          authorization: request.headers.get("Authorization"),
          contentType: request.headers.get("Content-Type"),
        });
        return HttpResponse.json({ data: [] });
      })
    );

    await fetch("https://api.example.com/api/users", {
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
    });

    expect(headerSpy).toHaveBeenCalledWith({
      authorization: "Bearer test-token",
      contentType: "application/json",
    });
  });

  it("送信されたリクエストボディを検証できる", async () => {
    const bodySpy = vi.fn();

    server.use(
      http.post("https://api.example.com/api/users", async ({ request }) => {
        const body = await request.json();
        bodySpy(body);
        return HttpResponse.json({ data: { id: 1, ...body } }, { status: 201 });
      })
    );

    await fetch("https://api.example.com/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "テスト", email: "test@example.com" }),
    });

    expect(bodySpy).toHaveBeenCalledWith({
      name: "テスト",
      email: "test@example.com",
    });
  });
});
```

---

## ブラウザモードの設定

開発時にブラウザでMSWを使用する場合の設定を示す。

```typescript
// src/mocks/browser.ts
import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);
```

```typescript
// src/main.ts（アプリケーションのエントリーポイント）
async function enableMocking(): Promise<void> {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  const { worker } = await import("./mocks/browser");

  await worker.start({
    onUnhandledRequest: "bypass", // モック対象外のリクエストは通過させる
    serviceWorker: {
      url: "/mockServiceWorker.js",
    },
  });
}

enableMocking().then(() => {
  // アプリケーションの初期化
  const app = createApp();
  app.mount("#app");
});
```

---

## Playwright連携

E2Eテストでもキャッシュの効率化のためにMSWを活用できる。Playwrightと連携する場合は、`@mswjs/http-middleware`を使ってローカルサーバーとして動作させる方法がある。ただしより実践的なアプローチとして、Playwrightのネイティブなルーティング機能と組み合わせる方法を紹介する。

### Playwright用のMSWセットアップ

```typescript
// e2e/msw-setup.ts
import { http, HttpResponse } from "msw";
import type { Page } from "@playwright/test";

// Playwrightのrouteを使ってMSWライクなモックを実現
export async function setupMockApi(page: Page): Promise<void> {
  // ユーザー一覧
  await page.route("**/api/users", async (route) => {
    const method = route.request().method();

    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            { id: 1, name: "田中太郎", email: "tanaka@example.com", role: "admin" },
            { id: 2, name: "鈴木花子", email: "suzuki@example.com", role: "user" },
          ],
          total: 2,
        }),
      });
    } else if (method === "POST") {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          data: { id: 3, ...body, createdAt: new Date().toISOString() },
        }),
      });
    }
  });

  // ユーザー詳細
  await page.route("**/api/users/*", async (route) => {
    const url = new URL(route.request().url());
    const id = url.pathname.split("/").pop();

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          id: Number(id),
          name: "田中太郎",
          email: "tanaka@example.com",
          role: "admin",
        },
      }),
    });
  });
}
```

### E2Eテストの実装

```typescript
// e2e/users.spec.ts
import { test, expect } from "@playwright/test";
import { setupMockApi } from "./msw-setup";

test.describe("ユーザー管理画面", () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await page.goto("/users");
  });

  test("ユーザー一覧が表示される", async ({ page }) => {
    await expect(page.getByText("田中太郎")).toBeVisible();
    await expect(page.getByText("鈴木花子")).toBeVisible();
  });

  test("新しいユーザーを作成できる", async ({ page }) => {
    await page.getByRole("button", { name: "新規ユーザー" }).click();
    await page.getByLabel("名前").fill("山田花子");
    await page.getByLabel("メール").fill("yamada@example.com");
    await page.getByRole("button", { name: "作成" }).click();

    await expect(page.getByText("ユーザーを作成しました")).toBeVisible();
  });

  test("APIエラー時にエラーメッセージが表示される", async ({ page }) => {
    // テスト固有のエラーレスポンス
    await page.route("**/api/users", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error" }),
      });
    });

    await page.reload();
    await expect(page.getByText("データの取得に失敗しました")).toBeVisible();
  });
});
```

---

## ネットワーク境界テスト

MSWの真価は「ネットワーク境界」でテストできる点にある。以下にそのパターンを示す。

### 認証フローのテスト

```typescript
// src/api/__tests__/authFlow.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server";

describe("認証フロー", () => {
  it("トークン期限切れ時にリフレッシュを試みる", async () => {
    let refreshCalled = false;

    server.use(
      // 最初のリクエスト: 401を返す
      http.get(
        "https://api.example.com/api/profile",
        () => {
          return HttpResponse.json(
            { error: "Token expired" },
            { status: 401 }
          );
        },
        { once: true }
      ),

      // リフレッシュトークンリクエスト
      http.post("https://api.example.com/api/auth/refresh", () => {
        refreshCalled = true;
        return HttpResponse.json({
          accessToken: "new-access-token",
          expiresIn: 3600,
        });
      }),

      // リトライ: 正常レスポンスを返す
      http.get("https://api.example.com/api/profile", () => {
        return HttpResponse.json({
          data: { id: 1, name: "テストユーザー" },
        });
      })
    );

    // トークンリフレッシュ付きのfetch関数
    async function fetchWithRefresh(url: string): Promise<any> {
      let response = await fetch(url, {
        headers: { Authorization: "Bearer expired-token" },
      });

      if (response.status === 401) {
        const refreshResponse = await fetch(
          "https://api.example.com/api/auth/refresh",
          { method: "POST" }
        );
        const { accessToken } = await refreshResponse.json();

        response = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      }

      return response.json();
    }

    const result = await fetchWithRefresh(
      "https://api.example.com/api/profile"
    );

    expect(refreshCalled).toBe(true);
    expect(result.data.name).toBe("テストユーザー");
  });
});
```

### レート制限のテスト

```typescript
describe("レート制限", () => {
  it("429レスポンス後にリトライする", async () => {
    let requestCount = 0;

    server.use(
      http.get("https://api.example.com/api/data", () => {
        requestCount++;
        if (requestCount <= 2) {
          return HttpResponse.json(
            { error: "Too many requests" },
            {
              status: 429,
              headers: { "Retry-After": "1" },
            }
          );
        }
        return HttpResponse.json({ data: "success" });
      })
    );

    async function fetchWithRetry(
      url: string,
      maxRetries = 3
    ): Promise<any> {
      for (let i = 0; i <= maxRetries; i++) {
        const response = await fetch(url);
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          await new Promise((resolve) =>
            setTimeout(resolve, Number(retryAfter) * 1000)
          );
          continue;
        }
        return response.json();
      }
      throw new Error("Max retries exceeded");
    }

    const result = await fetchWithRetry(
      "https://api.example.com/api/data"
    );

    expect(result.data).toBe("success");
    expect(requestCount).toBe(3);
  });
});
```

---

## 高度なパターン

### レスポンスの動的生成

```typescript
import { http, HttpResponse, passthrough } from "msw";

// 条件付きパススルー
http.get("https://api.example.com/api/*", ({ request }) => {
  const url = new URL(request.url);

  // 特定のパスのみモックし、それ以外は実サーバーへ
  if (url.pathname.startsWith("/api/v2/")) {
    return passthrough();
  }

  return HttpResponse.json({ version: "v1", mocked: true });
});
```

### レスポンスリゾルバーの合成

```typescript
import { http, HttpResponse, delay } from "msw";

// 認証チェック付きハンドラーファクトリ
function withAuth(
  resolver: Parameters<typeof http.get>[1]
): Parameters<typeof http.get>[1] {
  return async (info) => {
    const authHeader = info.request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return HttpResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return resolver(info);
  };
}

// 使用例
const protectedHandlers = [
  http.get(
    "https://api.example.com/api/admin/dashboard",
    withAuth(async () => {
      await delay(50);
      return HttpResponse.json({
        data: { totalUsers: 1000, activeUsers: 750 },
      });
    })
  ),
];
```

### ストリーミングレスポンスのモック

```typescript
http.get("https://api.example.com/api/stream", () => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const events = [
        { type: "start", data: "Processing..." },
        { type: "progress", data: "50% complete" },
        { type: "complete", data: "Done!" },
      ];

      events.forEach((event, index) => {
        setTimeout(() => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
          if (index === events.length - 1) {
            controller.close();
          }
        }, index * 100);
      });
    },
  });

  return new HttpResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
});
```

---

## ベストプラクティス

MSWを効果的に活用するためのベストプラクティスをまとめる。

### 1. ハンドラーの粒度を適切にする

ハンドラーはエンドポイント単位で分割し、テストごとに`server.use()`で上書きする構成が最も管理しやすい。

```typescript
// 良い例: デフォルトハンドラー + テスト固有の上書き
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers()); // テスト固有のハンドラーをリセット

it("エラーケースをテストする", () => {
  server.use(
    http.get("/api/users", () => HttpResponse.json(null, { status: 500 }))
  );
  // テスト実行...
});
```

### 2. onUnhandledRequestを活用する

モックされていないリクエストの検出は、テストの信頼性を高める上で重要だ。

```typescript
server.listen({
  onUnhandledRequest(request, print) {
    // 静的アセットは無視
    if (request.url.includes("/assets/")) {
      return;
    }
    // それ以外は警告
    print.warning();
  },
});
```

### 3. テストデータはフィクスチャとして管理する

テストデータをハンドラー内にハードコードせず、フィクスチャファイルとして外部化することで、テスト間での再利用性と保守性が向上する。

### 4. ネットワーク遅延を意図的にテストする

本番環境では必ずネットワーク遅延が発生する。`delay()`を使ってローディング状態のテストを忘れずに行おう。

```typescript
server.use(
  http.get("/api/users", async () => {
    await delay(2000); // 2秒の遅延
    return HttpResponse.json({ data: [] });
  })
);

// ローディングインジケーターの表示を検証
```

---

## まとめ

MSW（Mock Service Worker）は、ネットワーク境界でAPIリクエストをインターセプトすることで、従来のモック手法が抱えていた「実装の詳細への依存」という問題を解決する。

本記事で紹介した内容を振り返る。

- **基本セットアップ**: msw 2.xのインストールとディレクトリ構成
- **RESTハンドラー**: CRUD操作、バリデーション、エラーレスポンスの定義
- **GraphQLハンドラー**: Query/Mutationのモック
- **Vitest連携**: サーバーセットアップとテスト実装パターン
- **Playwright連携**: E2Eテストでのモック活用
- **ネットワーク境界テスト**: 認証フロー、レート制限のテスト
- **高度なパターン**: 条件付きパススルー、ストリーミング、認証ミドルウェア

MSWを導入することで、テストの安定性と速度が大幅に改善される。まずはプロジェクトの単体テストにMSWを導入し、既存のモックを段階的に移行することを推奨する。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)

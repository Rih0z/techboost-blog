---
title: 'Model Context Protocol（MCP）完全ガイド -- AIとツールを繋ぐ標準プロトコル'
description: 'Model Context Protocol（MCP）の基礎から実装まで徹底解説。MCPサーバー・クライアントの構築方法、TypeScript/Pythonのコード例、Claude Desktop連携、セキュリティ設計、2026年の最新動向まで網羅した完全ガイド'
pubDate: 'Feb 20 2026'
tags: ['MCP', 'AI', 'LLM', 'TypeScript', 'Python']
---

# Model Context Protocol（MCP）完全ガイド -- AIとツールを繋ぐ標準プロトコル

AIアプリケーションが外部ツールやデータソースと連携する方法は、これまでバラバラでした。各AIモデルごとに異なるAPI、異なる接続方式、異なるデータフォーマット。開発者はツール連携のたびに一からインテグレーションを構築する必要がありました。

**Model Context Protocol（MCP）** は、この問題を解決するために Anthropic が2024年11月に公開したオープンプロトコルです。LLMアプリケーションと外部ツール・データソースの接続を標準化し、「一度書けばどこでも繋がる」世界を実現します。

この記事では、MCPの基本概念からサーバー・クライアントの実装、セキュリティ、2026年の最新動向まで包括的に解説します。

## MCPとは何か

MCPは、AIシステムと外部ツール・データソースの統合を標準化するオープンプロトコルです。JSON-RPC 2.0ベースのメッセージング仕様で、Language Server Protocol（LSP）にインスピレーションを得て設計されました。

LSPがプログラミング言語のサポートを開発ツールのエコシステム全体で標準化したように、MCPはAIアプリケーションのエコシステムにおけるツール・データ連携を標準化します。

### MCPが解決する課題

従来のAIツール連携には、次のような課題がありました。

- **N x M問題**: N個のAIモデルとM個のツールを連携するために N x M 個のカスタム実装が必要
- **再利用性の欠如**: あるAIアプリ用に作ったツール連携を他のアプリで再利用できない
- **型安全性の不足**: ツールの入出力仕様が曖昧で、実行時エラーが頻発
- **セキュリティの統一基準なし**: 各実装でセキュリティ設計がバラバラ

MCPでは、ツール側が「MCPサーバー」としてインターフェースを1回定義すれば、すべてのMCP対応AIアプリ（「MCPクライアント」）から利用可能になります。

### アーキテクチャ

MCPは3つの主要コンポーネントで構成されます。

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│   Host   │────▶│  Client  │────▶│  Server  │
│ (AI App) │     │(Connector)│     │ (Tool)   │
└──────────┘     └──────────┘     └──────────┘
```

- **Host**: LLMアプリケーション本体（Claude Desktop、VS Code、カスタムAIアプリなど）
- **Client**: Host内のコネクタ。サーバーとの通信を管理
- **Server**: ツールやデータを提供するサービス。データベース、API、ファイルシステムなど

1つのHostが複数のClientを持ち、各Clientが異なるServerに接続するというアーキテクチャです。

## MCPの3つの主要機能

MCPサーバーは、クライアントに対して3種類の機能を提供できます。

### 1. Tools（ツール）

AIモデルが実行できる関数です。ユーザーの承認を得た上で、LLMが自律的にツールを呼び出します。

```typescript
// ツールの定義例
server.registerTool(
  "search_database",
  {
    description: "データベースを検索する",
    inputSchema: {
      query: z.string().describe("検索クエリ"),
      limit: z.number().optional().describe("結果数の上限"),
    },
  },
  async ({ query, limit }) => {
    const results = await db.search(query, limit ?? 10);
    return {
      content: [{ type: "text", text: JSON.stringify(results) }],
    };
  }
);
```

### 2. Resources（リソース）

ファイルのようなデータで、クライアントが読み取れるコンテキスト情報です。APIレスポンスやファイル内容などが含まれます。

```typescript
// リソースの定義例
server.registerResource(
  "config://app/settings",
  {
    name: "アプリケーション設定",
    description: "現在のアプリケーション設定を返す",
    mimeType: "application/json",
  },
  async () => {
    const settings = await loadSettings();
    return {
      contents: [{
        uri: "config://app/settings",
        text: JSON.stringify(settings),
      }],
    };
  }
);
```

### 3. Prompts（プロンプト）

特定タスクのための事前定義テンプレートです。ユーザーがタスクを効率的に実行するためのワークフローを提供します。

```typescript
// プロンプトの定義例
server.registerPrompt(
  "code_review",
  {
    description: "コードレビュー用のプロンプト",
    arguments: [
      { name: "language", description: "プログラミング言語", required: true },
      { name: "code", description: "レビュー対象コード", required: true },
    ],
  },
  async ({ language, code }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `以下の${language}コードをレビューしてください:\n\n${code}`,
          },
        },
      ],
    };
  }
);
```

## MCPサーバーを構築する（TypeScript）

実際にMCPサーバーを構築してみましょう。ここでは、TypeScriptでTodoリスト管理サーバーを作成します。

### プロジェクトセットアップ

```bash
# プロジェクト作成
mkdir mcp-todo-server
cd mcp-todo-server

# npm初期化
npm init -y

# 依存関係インストール
npm install @modelcontextprotocol/sdk zod@3
npm install -D @types/node typescript

# ソースディレクトリ作成
mkdir src
```

`package.json` を更新します。

```json
{
  "type": "module",
  "bin": {
    "mcp-todo": "./build/index.js"
  },
  "scripts": {
    "build": "tsc && chmod 755 build/index.js"
  }
}
```

`tsconfig.json` を作成します。

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./build",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### サーバー実装

`src/index.ts` にサーバーのコードを書きます。

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// サーバーインスタンス作成
const server = new McpServer({
  name: "todo-server",
  version: "1.0.0",
});

// インメモリのTodoストア
interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

const todos: Map<string, Todo> = new Map();
let nextId = 1;

// ツール: Todoを追加
server.registerTool(
  "add_todo",
  {
    description: "新しいTodoを追加する",
    inputSchema: {
      title: z.string().describe("Todoのタイトル"),
    },
  },
  async ({ title }) => {
    const id = String(nextId++);
    const todo: Todo = {
      id,
      title,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    todos.set(id, todo);

    return {
      content: [
        {
          type: "text",
          text: `Todo追加: [${id}] ${title}`,
        },
      ],
    };
  }
);

// ツール: Todo一覧を取得
server.registerTool(
  "list_todos",
  {
    description: "すべてのTodoを一覧表示する",
    inputSchema: {
      showCompleted: z
        .boolean()
        .optional()
        .describe("完了済みも表示するか（デフォルト: true）"),
    },
  },
  async ({ showCompleted }) => {
    const includeCompleted = showCompleted ?? true;
    const filtered = Array.from(todos.values()).filter(
      (todo) => includeCompleted || !todo.completed
    );

    if (filtered.length === 0) {
      return {
        content: [{ type: "text", text: "Todoはありません" }],
      };
    }

    const list = filtered
      .map(
        (todo) =>
          `[${todo.id}] ${todo.completed ? "[完了]" : "[未完了]"} ${todo.title}`
      )
      .join("\n");

    return {
      content: [{ type: "text", text: list }],
    };
  }
);

// ツール: Todoを完了にする
server.registerTool(
  "complete_todo",
  {
    description: "指定したTodoを完了にする",
    inputSchema: {
      id: z.string().describe("TodoのID"),
    },
  },
  async ({ id }) => {
    const todo = todos.get(id);
    if (!todo) {
      return {
        content: [{ type: "text", text: `ID ${id} のTodoが見つかりません` }],
      };
    }

    todo.completed = true;

    return {
      content: [
        {
          type: "text",
          text: `完了: [${id}] ${todo.title}`,
        },
      ],
    };
  }
);

// ツール: Todoを削除
server.registerTool(
  "delete_todo",
  {
    description: "指定したTodoを削除する",
    inputSchema: {
      id: z.string().describe("TodoのID"),
    },
  },
  async ({ id }) => {
    const todo = todos.get(id);
    if (!todo) {
      return {
        content: [{ type: "text", text: `ID ${id} のTodoが見つかりません` }],
      };
    }

    todos.delete(id);

    return {
      content: [
        {
          type: "text",
          text: `削除: [${id}] ${todo.title}`,
        },
      ],
    };
  }
);

// サーバー起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Todo MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
```

### ビルドと動作確認

```bash
# ビルド
npm run build
```

ビルド後、Claude Desktopの設定ファイルで接続設定を追加します。

```json
{
  "mcpServers": {
    "todo": {
      "command": "node",
      "args": ["/path/to/mcp-todo-server/build/index.js"]
    }
  }
}
```

## MCPサーバーを構築する（Python）

Python版の実装も見てみましょう。PythonのMCP SDKは `FastMCP` クラスを提供しており、型ヒントとdocstringからツール定義を自動生成します。

### セットアップ

```bash
# uvを使ったプロジェクトセットアップ
uv init mcp-todo-python
cd mcp-todo-python

# 仮想環境作成
uv venv
source .venv/bin/activate

# 依存関係インストール
uv add "mcp[cli]"
```

### サーバー実装

```python
from datetime import datetime
from mcp.server.fastmcp import FastMCP

# FastMCPサーバー初期化
mcp = FastMCP("todo")

# インメモリストア
todos: dict[str, dict] = {}
next_id = 1


@mcp.tool()
async def add_todo(title: str) -> str:
    """新しいTodoを追加する

    Args:
        title: Todoのタイトル
    """
    global next_id
    todo_id = str(next_id)
    next_id += 1
    todos[todo_id] = {
        "id": todo_id,
        "title": title,
        "completed": False,
        "created_at": datetime.now().isoformat(),
    }
    return f"Todo追加: [{todo_id}] {title}"


@mcp.tool()
async def list_todos(show_completed: bool = True) -> str:
    """すべてのTodoを一覧表示する

    Args:
        show_completed: 完了済みも表示するか
    """
    filtered = [
        t for t in todos.values()
        if show_completed or not t["completed"]
    ]

    if not filtered:
        return "Todoはありません"

    lines = []
    for t in filtered:
        status = "[完了]" if t["completed"] else "[未完了]"
        lines.append(f'[{t["id"]}] {status} {t["title"]}')

    return "\n".join(lines)


@mcp.tool()
async def complete_todo(id: str) -> str:
    """指定したTodoを完了にする

    Args:
        id: TodoのID
    """
    if id not in todos:
        return f"ID {id} のTodoが見つかりません"

    todos[id]["completed"] = True
    return f'完了: [{id}] {todos[id]["title"]}'


@mcp.tool()
async def delete_todo(id: str) -> str:
    """指定したTodoを削除する

    Args:
        id: TodoのID
    """
    if id not in todos:
        return f"ID {id} のTodoが見つかりません"

    title = todos[id]["title"]
    del todos[id]
    return f"削除: [{id}] {title}"


def main():
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
```

Pythonでは `@mcp.tool()` デコレータと型ヒント・docstringだけでツール定義が完成します。TypeScript版と比較して、ボイラープレートが大幅に削減されているのが特徴です。

## MCPクライアントの実装

MCPサーバーに接続するクライアントも自作できます。ここではTypeScriptでの実装例を示します。

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  // クライアント作成
  const client = new Client({
    name: "my-mcp-client",
    version: "1.0.0",
  });

  // サーバーに接続（stdioトランスポート）
  const transport = new StdioClientTransport({
    command: "node",
    args: ["/path/to/server/build/index.js"],
  });

  await client.connect(transport);

  // 利用可能なツール一覧を取得
  const tools = await client.listTools();
  console.log("利用可能なツール:");
  for (const tool of tools.tools) {
    console.log(`  - ${tool.name}: ${tool.description}`);
  }

  // ツールを実行
  const result = await client.callTool({
    name: "add_todo",
    arguments: { title: "MCPのドキュメントを読む" },
  });

  console.log("実行結果:", result.content);

  // 接続を閉じる
  await client.close();
}

main().catch(console.error);
```

### Anthropic APIとの連携

MCPクライアントをClaude APIと組み合わせることで、AIが自律的にツールを呼び出すチャットボットを構築できます。

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const anthropic = new Anthropic();
const mcpClient = new Client({ name: "chatbot", version: "1.0.0" });

// MCPサーバーに接続
const transport = new StdioClientTransport({
  command: "node",
  args: ["/path/to/server/build/index.js"],
});
await mcpClient.connect(transport);

// MCPツールをClaude API形式に変換
const mcpTools = await mcpClient.listTools();
const tools = mcpTools.tools.map((tool) => ({
  name: tool.name,
  description: tool.description,
  input_schema: tool.inputSchema,
}));

// Claudeに質問を送信
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 1024,
  messages: [{ role: "user", content: "買い物リストにTodoを3つ追加して" }],
  tools,
});

// ツール呼び出しを処理
for (const content of response.content) {
  if (content.type === "tool_use") {
    const result = await mcpClient.callTool({
      name: content.name,
      arguments: content.input,
    });
    console.log(`ツール ${content.name} の結果:`, result.content);
  }
}
```

## Claude Desktopでの接続設定

Claude Desktopは、最も手軽にMCPサーバーを利用できるホストアプリケーションです。設定ファイルにサーバー情報を記述するだけで接続できます。

### 設定ファイルの場所

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%AppData%\Claude\claude_desktop_config.json`

### 設定例

```json
{
  "mcpServers": {
    "todo": {
      "command": "node",
      "args": ["/Users/you/mcp-todo-server/build/index.js"]
    },
    "weather": {
      "command": "python",
      "args": ["/Users/you/weather-server/weather.py"]
    },
    "database": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "postgresql://localhost/mydb"
      }
    }
  }
}
```

設定後、Claude Desktopを再起動すると、チャット画面にツールアイコンが表示されます。「Todoを追加して」のように自然言語で指示するだけで、AIがMCPツールを呼び出します。

## トランスポート方式

MCPは2つのトランスポート方式をサポートしています。

### stdio（標準入出力）

ローカルプロセス間通信に使用します。サーバーはstdinからリクエストを受け取り、stdoutにレスポンスを返します。

```typescript
// サーバー側
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const transport = new StdioServerTransport();
await server.connect(transport);
```

**注意点**: stdioベースのサーバーでは `console.log()` を使ってはいけません。stdoutへの出力がJSON-RPCメッセージを破損させます。デバッグ出力は `console.error()` を使用してください。

### HTTP + SSE（Server-Sent Events）

リモートサーバーとの通信に使用します。HTTPエンドポイントを通じてクライアントが接続し、SSEでリアルタイム通知を受け取ります。

```typescript
// HTTP + SSE トランスポート
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

const transport = new SSEServerTransport("/messages", response);
await server.connect(transport);
```

本番環境ではHTTP + SSEが推奨されます。

## セキュリティ設計

MCPは強力な機能を提供する反面、セキュリティ設計が不可欠です。

### 基本原則

1. **ユーザー同意**: すべてのデータアクセスとツール実行に明示的なユーザー同意を要求
2. **データプライバシー**: ユーザーデータの送信前に明示的な許可を取得
3. **ツール安全性**: ツールは任意コード実行であり、実行前にユーザー承認が必要
4. **サンプリング制御**: LLMへの送信内容をユーザーがコントロール可能にする

### 実装上の注意

```typescript
// ツールアノテーションでリスクレベルを明示
server.registerTool(
  "delete_file",
  {
    description: "ファイルを削除する",
    inputSchema: {
      path: z.string().describe("削除するファイルのパス"),
    },
    // ツールの挙動に関するメタデータ
    annotations: {
      destructive: true,    // 破壊的操作
      requiresAuth: true,   // 認証が必要
    },
  },
  async ({ path }) => {
    // 実装...
  }
);
```

### 入力バリデーション

MCPサーバーはクライアントからの入力を信頼せず、必ずバリデーションを行うべきです。

```typescript
server.registerTool(
  "query_database",
  {
    description: "データベースクエリを実行する",
    inputSchema: {
      query: z.string()
        .max(1000)
        .refine(
          (q) => !q.toLowerCase().includes("drop"),
          "DROP文は許可されていません"
        ),
    },
  },
  async ({ query }) => {
    // パラメータ化クエリを使用し、SQLインジェクションを防止
    const results = await db.query(query);
    return {
      content: [{ type: "text", text: JSON.stringify(results) }],
    };
  }
);
```

## 主要なMCPサーバー

2026年2月現在、1,000以上のコミュニティ製MCPサーバーが公開されています。代表的なものを紹介します。

### 公式サーバー

| サーバー | 機能 |
|---------|------|
| `@modelcontextprotocol/server-filesystem` | ファイル読み書き・検索 |
| `@modelcontextprotocol/server-postgres` | PostgreSQLデータベース操作 |
| `@modelcontextprotocol/server-github` | GitHubリポジトリ操作 |
| `@modelcontextprotocol/server-slack` | Slackメッセージ送受信 |
| `@modelcontextprotocol/server-brave-search` | Brave検索エンジン |
| `@modelcontextprotocol/server-google-drive` | Google Drive連携 |

### 使用例（npx経由）

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/dir"]
    }
  }
}
```

## 2026年の最新動向

### Linux Foundationへの移管

2025年12月、AnthropicはMCPを **Agentic AI Foundation（AAIF）** に寄贈しました。AAIFはLinux Foundation傘下の組織で、オープンガバナンスのもとでMCPの標準化が進められています。

### OpenAIの採用

2025年3月、OpenAIが公式にMCPを採用し、ChatGPTデスクトップアプリを含む製品群にMCPサポートを統合しました。これにより、MCPはAI業界のデファクトスタンダードとしての地位を確立しています。

### 2026年の主なアップデート

- **マルチモーダル対応**: 画像・動画・音声など、テキスト以外のメディアタイプをサポート
- **ストリーミング**: チャンク形式のメッセージ送信で、長い出力をリアルタイムで配信
- **オープンガバナンス**: 透明な意思決定プロセスで、開発者コミュニティの声を反映

### エンタープライズでの導入効果

MCPを導入した組織では、AIエージェントのデプロイ時間が **40-60%短縮** されたと報告されています。コンテナがクラウドインフラの標準レイヤーとなったように、MCPはAI開発の標準レイヤーになりつつあります。

## MCPサーバー開発のベストプラクティス

### 1. 単一責任の原則

1つのMCPサーバーは1つのドメインに集中させましょう。「データベースサーバー」「ファイルシステムサーバー」のように、機能を分離します。

### 2. エラーハンドリング

ツール実行エラーは、MCPプロトコルのエラーレスポンスとして返します。

```typescript
server.registerTool(
  "fetch_data",
  {
    description: "外部APIからデータを取得する",
    inputSchema: {
      url: z.string().url().describe("取得先URL"),
    },
  },
  async ({ url }) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return {
          content: [
            {
              type: "text",
              text: `エラー: HTTP ${response.status}`,
            },
          ],
          isError: true,
        };
      }
      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data) }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `接続エラー: ${error instanceof Error ? error.message : "不明なエラー"}`,
          },
        ],
        isError: true,
      };
    }
  }
);
```

### 3. ロギングはstderrに

stdioトランスポートを使う場合、ログ出力は必ずstderrに書き出します。

```typescript
// TypeScript
console.error("デバッグ情報"); // OK
console.log("これはNG");       // stdoutを汚染する
```

```python
# Python
import sys
print("デバッグ情報", file=sys.stderr)  # OK
print("これはNG")                       # stdoutを汚染する
```

### 4. 冪等性を意識する

ツールが複数回呼ばれても安全なように設計します。特にデータ変更を伴う操作では、重複実行チェックを入れましょう。

## まとめ

Model Context Protocol（MCP）は、AIアプリケーションと外部ツールの統合を根本的に変えるプロトコルです。

- **標準化**: JSON-RPC 2.0ベースの統一プロトコルで、N x M問題を解消
- **型安全**: Zodスキーマ（TypeScript）や型ヒント（Python）による堅牢な入出力定義
- **エコシステム**: 1,000以上のサーバーが公開され、OpenAIも採用
- **セキュリティ**: ユーザー同意ベースの設計で、安全なツール実行を保証
- **マルチ言語**: TypeScript、Python、Java、Kotlin、C#、Rustの公式SDKを提供

2026年現在、MCPはAI開発のインフラレイヤーとして急速に普及しています。AIアプリケーションを開発するなら、MCPの理解と活用は必須スキルです。

まずは公式のクイックスタートガイドでサーバーを1つ構築し、Claude Desktopで動作確認してみましょう。MCPの可能性を体感できるはずです。

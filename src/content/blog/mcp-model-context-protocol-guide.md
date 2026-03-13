---
title: "MCP（Model Context Protocol）完全ガイド — AIエージェントとツール連携の新標準"
description: "Anthropic発のMCP（Model Context Protocol）を徹底解説。アーキテクチャ、MCPサーバーの構築方法、Claude・VSCode・Cursorとの連携、TypeScript/Pythonでの実装例まで実践的に紹介します。"
pubDate: "2026-02-24"
tags: ["AI", "MCP", "Claude", "LLM", "TypeScript"]
heroImage: '../../assets/thumbnails/mcp-model-context-protocol-guide.jpg'
---

AIアシスタントがファイルを読み書きし、データベースを検索し、外部APIを呼び出す。2026年、こうした「AIとツールの連携」はもはや当たり前になりました。しかし、各ツールごとにバラバラなインテグレーションを書くのは非効率です。

そこで登場したのが **MCP（Model Context Protocol）**。Anthropicが提唱したオープン標準で、AIモデルと外部ツール・データソースを**統一的なプロトコル**で接続します。

この記事では、MCPのアーキテクチャから実装まで、実践的に解説します。

## MCPとは何か

**MCP（Model Context Protocol）** は、LLM（大規模言語モデル）と外部ツール・データソースを接続するためのオープンプロトコルです。Anthropicが2024年11月に発表し、2025〜2026年にかけてエコシステムが急速に拡大しました。

### なぜMCPが必要なのか

従来のLLMツール連携には、いくつかの課題がありました。

```
【従来のアプローチ】
┌─────────┐    独自API    ┌──────────┐
│  Claude  │──────────────│ ツールA   │
│          │    独自API    ├──────────┤
│          │──────────────│ ツールB   │
│          │    独自API    ├──────────┤
│          │──────────────│ ツールC   │
└─────────┘              └──────────┘
→ ツールごとに個別のインテグレーションが必要
→ 再利用性が低い、メンテナンスコスト大
```

```
【MCPアプローチ】
┌─────────┐              ┌──────────────┐
│  Claude  │    MCP       │ MCPサーバーA  │ → ファイルシステム
│  Cursor  │◄────────────►│ MCPサーバーB  │ → データベース
│  VSCode  │  統一プロトコル │ MCPサーバーC  │ → 外部API
└─────────┘              └──────────────┘
→ 統一プロトコルで接続
→ サーバーは任意のクライアントから再利用可能
```

MCPは、USBが周辺機器の接続を標準化したように、**AIとツールの接続を標準化**します。

### MCPの基本概念

MCPのアーキテクチャは、3つのコア概念で構成されます。

| 概念 | 役割 | 例 |
|------|------|------|
| **Host（ホスト）** | MCPクライアントを内蔵するアプリケーション | Claude Desktop, Cursor, VSCode |
| **Client（クライアント）** | MCPサーバーとの接続を管理 | Host内部のMCPクライアントモジュール |
| **Server（サーバー）** | ツール・データ・プロンプトを提供 | filesystem-server, git-server, etc. |

MCPサーバーは、3種類の機能を公開できます。

- **Tools（ツール）**: AIが実行できるアクション（ファイル読み書き、API呼び出し等）
- **Resources（リソース）**: AIが参照できるデータ（ファイル内容、DB行等）
- **Prompts（プロンプト）**: 定義済みのプロンプトテンプレート

## MCPの通信方式

MCPは**JSON-RPC 2.0**ベースのプロトコルで、2つのトランスポートをサポートします。

### stdio（標準入出力）

ローカル環境で最も一般的な方式です。Hostがサーバープロセスを起動し、stdin/stdoutで通信します。

```json
// クライアント → サーバー（ツール呼び出し）
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "read_file",
    "arguments": {
      "path": "/Users/dev/project/src/index.ts"
    }
  }
}

// サーバー → クライアント（結果）
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "import express from 'express';\n..."
      }
    ]
  }
}
```

### Streamable HTTP

リモートサーバーとの通信に使用します。HTTP POST + Server-Sent Events（SSE）で双方向通信を実現します。

```
POST /mcp HTTP/1.1
Content-Type: application/json

{"jsonrpc":"2.0","id":1,"method":"tools/list"}
```

用途に応じて使い分けましょう。

| トランスポート | 用途 | 特徴 |
|--------------|------|------|
| stdio | ローカルツール | 低レイテンシ、セットアップ簡単 |
| Streamable HTTP | リモートサービス | ネットワーク経由、認証対応 |

## MCPサーバーの使い方（クライアント設定）

まずは既存のMCPサーバーを使ってみましょう。Claude DesktopやCursorなど、主要なAIツールはMCPをサポートしています。

### Claude Desktopでの設定

Claude Desktopの設定ファイル（`claude_desktop_config.json`）にMCPサーバーを追加します。

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/dev/projects"
      ]
    },
    "git": {
      "command": "uvx",
      "args": [
        "mcp-server-git",
        "--repository", "/Users/dev/projects/my-app"
      ]
    }
  }
}
```

設定ファイルの場所は以下のとおりです。

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### Claude Code（CLI）での設定

Claude Codeでは、プロジェクトの `.claude/settings.json` でMCPサーバーを設定します。

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@anthropic/mcp-playwright"]
    },
    "fetch": {
      "command": "uvx",
      "args": ["mcp-server-fetch"]
    }
  }
}
```

### Cursor / VS Codeでの設定

プロジェクトルートに `.cursor/mcp.json` を作成します。

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "."
      ]
    }
  }
}
```

## 人気のMCPサーバー

2026年2月現在、エコシステムには数百のMCPサーバーが公開されています。特に利用頻度の高いものを紹介します。

### 公式サーバー（Anthropic / ModelContextProtocol提供）

| サーバー | 機能 | インストール |
|---------|------|------------|
| **filesystem** | ファイル読み書き、ディレクトリ操作 | `npx @modelcontextprotocol/server-filesystem` |
| **git** | Gitリポジトリ操作 | `uvx mcp-server-git` |
| **fetch** | Web取得（URL→テキスト変換） | `uvx mcp-server-fetch` |
| **postgres** | PostgreSQL操作 | `npx @modelcontextprotocol/server-postgres` |
| **sqlite** | SQLiteデータベース | `uvx mcp-server-sqlite` |
| **puppeteer** | ブラウザ自動操作 | `npx @modelcontextprotocol/server-puppeteer` |

### コミュニティサーバー

| サーバー | 機能 | 用途 |
|---------|------|------|
| **playwright** | E2Eブラウザ操作 | テスト自動化、スクレイピング |
| **github** | GitHub API操作 | Issue/PR管理、コードレビュー |
| **slack** | Slack連携 | メッセージ送受信 |
| **notion** | Notion API | ドキュメント管理 |
| **figma** | Figmaデザイン読み取り | デザイン→コード変換 |
| **sentry** | エラー監視 | バグ調査・修正 |

## TypeScriptでMCPサーバーを作る

ここからが本番です。自分だけのMCPサーバーを作ってみましょう。

### プロジェクトセットアップ

```bash
mkdir my-mcp-server && cd my-mcp-server
npm init -y
npm install @modelcontextprotocol/sdk zod
npm install -D typescript @types/node
```

`tsconfig.json` を作成します。

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

### 基本的なMCPサーバー

天気情報を返すシンプルなMCPサーバーを作ります。

```typescript
// src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "weather-server",
  version: "1.0.0",
});

// ツールを定義
server.tool(
  "get_weather",
  "指定した都市の天気情報を取得します",
  {
    city: z.string().describe("都市名（例: Tokyo, Osaka）"),
    unit: z.enum(["celsius", "fahrenheit"]).default("celsius")
      .describe("温度の単位"),
  },
  async ({ city, unit }) => {
    // 実際のAPIコールをここに実装
    const weatherData = await fetchWeather(city, unit);

    return {
      content: [
        {
          type: "text",
          text: `${city}の天気: ${weatherData.condition}, ${weatherData.temp}°${unit === "celsius" ? "C" : "F"}`,
        },
      ],
    };
  }
);

// リソースを定義
server.resource(
  "weather://forecast/{city}",
  "都市の週間天気予報",
  async (uri) => {
    const city = uri.pathname.split("/").pop() ?? "Tokyo";
    const forecast = await fetchForecast(city);

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(forecast, null, 2),
        },
      ],
    };
  }
);

// サーバー起動
const transport = new StdioServerTransport();
await server.connect(transport);

// --- ヘルパー関数（デモ用） ---
async function fetchWeather(city: string, unit: string) {
  // 実際にはOpenWeather API等を呼び出す
  return { condition: "晴れ", temp: unit === "celsius" ? 22 : 72 };
}

async function fetchForecast(city: string) {
  return [
    { date: "2026-02-25", condition: "晴れ", high: 18, low: 8 },
    { date: "2026-02-26", condition: "曇り", high: 15, low: 7 },
    { date: "2026-02-27", condition: "雨", high: 12, low: 6 },
  ];
}
```

### ビルドと実行

```bash
npx tsc
node dist/index.js
```

Claude Desktopから使うには、設定ファイルに追加します。

```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["/path/to/my-mcp-server/dist/index.js"]
    }
  }
}
```

## PythonでMCPサーバーを作る

Python版のSDKも充実しています。

### セットアップ

```bash
pip install mcp
# または
uv add mcp
```

### 実装例：データベース検索サーバー

```python
# server.py
from mcp.server.fastmcp import FastMCP
import sqlite3

mcp = FastMCP("database-search")

DB_PATH = "data/products.db"

@mcp.tool()
def search_products(query: str, limit: int = 10) -> str:
    """商品名やカテゴリで商品を検索します。

    Args:
        query: 検索キーワード
        limit: 最大取得件数（デフォルト: 10）
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT name, price, category
        FROM products
        WHERE name LIKE ? OR category LIKE ?
        ORDER BY price ASC
        LIMIT ?
        """,
        (f"%{query}%", f"%{query}%", limit),
    )
    rows = cursor.fetchall()
    conn.close()

    if not rows:
        return f"'{query}' に一致する商品は見つかりませんでした。"

    results = []
    for name, price, category in rows:
        results.append(f"- {name} ({category}): ¥{price:,}")
    return "\n".join(results)


@mcp.tool()
def get_product_stats() -> str:
    """商品データベースの統計情報を取得します。"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT category, COUNT(*), AVG(price) FROM products GROUP BY category"
    )
    rows = cursor.fetchall()
    conn.close()

    results = ["カテゴリ | 商品数 | 平均価格"]
    results.append("---|---|---")
    for category, count, avg_price in rows:
        results.append(f"{category} | {count} | ¥{avg_price:,.0f}")
    return "\n".join(results)


@mcp.resource("db://schema")
def get_schema() -> str:
    """データベースのスキーマ情報を返します。"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT sql FROM sqlite_master WHERE type='table'"
    )
    schemas = [row[0] for row in cursor.fetchall()]
    conn.close()
    return "\n\n".join(schemas)


if __name__ == "__main__":
    mcp.run(transport="stdio")
```

### 設定

```json
{
  "mcpServers": {
    "database-search": {
      "command": "python",
      "args": ["server.py"],
      "cwd": "/path/to/project"
    }
  }
}
```

## 実践的なユースケース

MCPが特に力を発揮するシナリオを紹介します。

### 1. 社内ナレッジベース検索

社内のConfluence、Notion、Google Driveなどのドキュメントを横断検索するMCPサーバーを作れば、AIアシスタントが社内知識にアクセスできます。

```typescript
server.tool(
  "search_knowledge",
  "社内ドキュメントを検索します",
  {
    query: z.string(),
    sources: z.array(z.enum(["confluence", "notion", "gdrive"])).optional(),
  },
  async ({ query, sources }) => {
    const results = await Promise.all([
      sources?.includes("confluence") !== false && searchConfluence(query),
      sources?.includes("notion") !== false && searchNotion(query),
      sources?.includes("gdrive") !== false && searchGDrive(query),
    ]);

    return {
      content: [{ type: "text", text: formatResults(results) }],
    };
  }
);
```

### 2. CI/CDパイプライン操作

GitHub ActionsやCircleCIのワークフローを操作するMCPサーバーを作れば、「最新のCIが失敗している原因を調べて」とAIに依頼できます。

### 3. モニタリング・アラート連携

DatadogやGrafanaのメトリクスを取得するMCPサーバーを作れば、「直近1時間のエラーレートが上昇している原因を分析して」といった調査をAIに依頼できます。

### 4. コードレビュー自動化

GitHubのPR情報を取得し、コード品質をチェックするMCPサーバーを組み合わせれば、AIベースのコードレビューパイプラインを構築できます。

## セキュリティのベストプラクティス

MCPサーバーは強力ですが、セキュリティには十分な注意が必要です。

### 最小権限の原則

ファイルシステムサーバーには、必要なディレクトリのみアクセスを許可しましょう。

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-filesystem",
        "/Users/dev/projects/my-app/src",
        "/Users/dev/projects/my-app/docs"
      ]
    }
  }
}
```

`/` や `~` のようなルートパスを指定するのは避けてください。

### 入力のバリデーション

MCPサーバー内でも、入力値は必ずバリデーションしましょう。

```typescript
server.tool(
  "query_database",
  "データベースにクエリを実行します",
  {
    table: z.enum(["users", "products", "orders"]),  // 許可するテーブルを限定
    conditions: z.record(z.string()),
  },
  async ({ table, conditions }) => {
    // プレースホルダを使用（SQLインジェクション防止）
    const where = Object.keys(conditions)
      .map((key) => `${sanitizeColumn(key)} = ?`)
      .join(" AND ");
    const values = Object.values(conditions);

    const result = await db.query(
      `SELECT * FROM ${table} WHERE ${where} LIMIT 100`,
      values
    );
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);
```

### 認証情報の管理

APIキーやトークンは環境変数で渡しましょう。

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "ghp_xxxxxxxxxxxx"
      }
    }
  }
}
```

## MCPサーバーのテスト

MCPサーバーは `@modelcontextprotocol/inspector` で対話的にテストできます。

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

ブラウザが開き、ツール一覧の確認、引数を指定した実行、レスポンスの検証が可能です。

プログラマティックなテストには、SDK のクライアントを使います。

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"],
});

const client = new Client({ name: "test-client", version: "1.0.0" });
await client.connect(transport);

// ツール一覧を取得
const tools = await client.listTools();
console.log("利用可能なツール:", tools);

// ツールを呼び出し
const result = await client.callTool({
  name: "get_weather",
  arguments: { city: "Tokyo" },
});
console.log("結果:", result);

await client.close();
```

## MCPサーバーの公開

作成したMCPサーバーをnpmパッケージとして公開すれば、他の開発者も利用できます。

`package.json` に以下を追加します。

```json
{
  "name": "@your-org/mcp-server-weather",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "mcp-server-weather": "dist/index.js"
  },
  "files": ["dist"],
  "keywords": ["mcp", "model-context-protocol", "ai"]
}
```

```bash
npm publish --access public
```

ユーザーは `npx @your-org/mcp-server-weather` で即座に利用開始できます。

## まとめ

MCP（Model Context Protocol）は、AIとツールの連携を**標準化**する画期的なプロトコルです。

**MCPの利点をまとめると以下のとおりです。**

- **統一プロトコル**: 一度作ったサーバーがClaude、Cursor、VSCodeなど複数のクライアントで再利用可能
- **エコシステム**: 公式・コミュニティサーバーが充実し、すぐに使い始められる
- **型安全**: Zod（TypeScript）やPydantic（Python）による堅牢なスキーマ定義
- **セキュリティ**: 権限制御、入力バリデーション、認証情報管理のベストプラクティスが確立

**始め方は簡単です。**

1. まずはClaude Desktopに `filesystem` サーバーを設定して体験する
2. 自分のワークフローに合わせたカスタムサーバーを作る
3. npmで公開してコミュニティに貢献する

AIエージェントの時代において、MCPはツール連携の**デファクトスタンダード**になりつつあります。今から習得しておけば、AIを活用した開発ワークフローで大きなアドバンテージを得られるでしょう。

## 参考リンク

- [MCP公式ドキュメント](https://modelcontextprotocol.io)
- [MCP GitHub リポジトリ](https://github.com/modelcontextprotocol)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)
- [MCP サーバー一覧](https://github.com/modelcontextprotocol/servers)
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)

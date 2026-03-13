---
title: 'MCP（Model Context Protocol）サーバー開発実践ガイド2026｜Claude連携・ツール作成'
description: 'AnthropicのModel Context Protocol（MCP）サーバーの開発方法を実践的に解説。TypeScript・PythonでのMCPサーバー構築手順、カスタムツール・リソース作成、Claude Desktop連携設定、JSON-RPC通信の仕組みまで具体的なコード例付きで紹介します。'
pubDate: '2026-03-05'
tags: ['MCP', 'AI', 'TypeScript', 'Python', 'Claude']
heroImage: '../../assets/thumbnails/mcp-server-practical-guide-2026.jpg'
---

## MCPとは

**MCP（Model Context Protocol）** は、Anthropicが提唱するAIモデルと外部ツール・データソースを接続するためのオープンプロトコルです。MCPサーバーを作ることで、Claude等のAIモデルにカスタムツールやデータアクセス能力を追加できます。

### MCPの仕組み

```
ユーザー → Claude Desktop / Claude Code
              ↓
         MCP クライアント
              ↓ (JSON-RPC over stdio/SSE)
         MCP サーバー
              ↓
         外部サービス（DB, API, ファイルシステム等）
```

### MCPで提供できる機能

| 機能 | 説明 | 例 |
|------|------|-----|
| **Tools** | AIが呼び出せる関数 | DB検索、API呼び出し |
| **Resources** | AIが読める情報源 | ファイル、ドキュメント |
| **Prompts** | 再利用可能なプロンプトテンプレート | コードレビュー、翻訳 |

---

## TypeScriptでMCPサーバーを作る

### セットアップ

```bash
mkdir my-mcp-server
cd my-mcp-server
npm init -y
npm install @modelcontextprotocol/sdk zod
npm install -D typescript @types/node
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*"]
}
```

### 基本的なMCPサーバー

```typescript
// src/index.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'my-tools',
  version: '1.0.0',
});

// ツール: 天気情報の取得
server.tool(
  'get_weather',
  '指定した都市の天気情報を取得します',
  {
    city: z.string().describe('都市名（例: 東京, 大阪）'),
  },
  async ({ city }) => {
    // 実際にはAPIを呼び出す
    const weather = await fetchWeather(city);
    return {
      content: [
        {
          type: 'text',
          text: `${city}の天気: ${weather.condition}, 気温: ${weather.temperature}°C`,
        },
      ],
    };
  }
);

// ツール: データベース検索
server.tool(
  'search_database',
  'データベースからレコードを検索します',
  {
    table: z.enum(['users', 'posts', 'comments']).describe('テーブル名'),
    query: z.string().describe('検索クエリ'),
    limit: z.number().optional().default(10).describe('最大件数'),
  },
  async ({ table, query, limit }) => {
    const results = await db.search(table, query, limit);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }
);

// リソース: 設定ファイルの提供
server.resource(
  'config://app',
  'アプリケーション設定',
  'application/json',
  async () => ({
    contents: [
      {
        uri: 'config://app',
        text: JSON.stringify({
          version: '1.0.0',
          environment: process.env.NODE_ENV,
          features: { darkMode: true, notifications: true },
        }),
      },
    ],
  })
);

// プロンプトテンプレート: コードレビュー
server.prompt(
  'code_review',
  'コードレビューを実施します',
  [
    {
      name: 'language',
      description: 'プログラミング言語',
      required: true,
    },
    {
      name: 'code',
      description: 'レビュー対象のコード',
      required: true,
    },
  ],
  async ({ language, code }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `以下の${language}コードをレビューしてください。\n\nバグ、セキュリティ問題、パフォーマンス改善、コードスタイルの観点でフィードバックをお願いします。\n\n\`\`\`${language}\n${code}\n\`\`\``,
        },
      },
    ],
  })
);

// サーバー起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP server running on stdio');
}

main().catch(console.error);
```

### ビルドと実行

```bash
npx tsc
node dist/index.js
```

---

## PythonでMCPサーバーを作る

```bash
pip install mcp
```

```python
# server.py
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
import json

app = Server("my-python-tools")

@app.tool()
async def analyze_csv(file_path: str, query: str) -> list[TextContent]:
    """CSVファイルを分析します"""
    import pandas as pd

    df = pd.read_csv(file_path)

    if query == "summary":
        result = df.describe().to_string()
    elif query == "columns":
        result = json.dumps(list(df.columns))
    elif query == "head":
        result = df.head(10).to_string()
    else:
        # 簡易的なフィルタリング
        result = str(df.query(query).head(20).to_string())

    return [TextContent(type="text", text=result)]


@app.tool()
async def run_sql(database_url: str, query: str) -> list[TextContent]:
    """SQLクエリを実行します（SELECT文のみ）"""
    import sqlite3

    if not query.strip().upper().startswith("SELECT"):
        return [TextContent(type="text", text="エラー: SELECT文のみ実行可能です")]

    conn = sqlite3.connect(database_url)
    cursor = conn.execute(query)
    columns = [desc[0] for desc in cursor.description]
    rows = cursor.fetchall()
    conn.close()

    result = {"columns": columns, "rows": rows, "count": len(rows)}
    return [TextContent(type="text", text=json.dumps(result, ensure_ascii=False, indent=2))]


async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
```

---

## Claude Desktopとの連携

### 設定ファイル

```json
// ~/Library/Application Support/Claude/claude_desktop_config.json (macOS)
// %APPDATA%/Claude/claude_desktop_config.json (Windows)
{
  "mcpServers": {
    "my-tools": {
      "command": "node",
      "args": ["/path/to/my-mcp-server/dist/index.js"],
      "env": {
        "DATABASE_URL": "sqlite:///path/to/db.sqlite"
      }
    },
    "python-tools": {
      "command": "python",
      "args": ["/path/to/server.py"]
    }
  }
}
```

### Claude Codeとの連携

```json
// .mcp.json（プロジェクトルート）
{
  "mcpServers": {
    "project-db": {
      "command": "node",
      "args": ["./mcp-server/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://localhost:5432/myapp"
      }
    }
  }
}
```

---

## 実用的なMCPサーバー例

### GitHub連携サーバー

```typescript
server.tool(
  'github_search_issues',
  'GitHubリポジトリのIssueを検索します',
  {
    repo: z.string().describe('owner/repo形式'),
    query: z.string().describe('検索クエリ'),
    state: z.enum(['open', 'closed', 'all']).default('open'),
  },
  async ({ repo, query, state }) => {
    const response = await fetch(
      `https://api.github.com/search/issues?q=${encodeURIComponent(query)}+repo:${repo}+state:${state}`,
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    const data = await response.json();
    const issues = data.items.slice(0, 10).map((issue: any) => ({
      number: issue.number,
      title: issue.title,
      state: issue.state,
      labels: issue.labels.map((l: any) => l.name),
      url: issue.html_url,
    }));

    return {
      content: [{ type: 'text', text: JSON.stringify(issues, null, 2) }],
    };
  }
);
```

### Slack通知サーバー

```typescript
server.tool(
  'slack_send_message',
  'Slackチャンネルにメッセージを送信します',
  {
    channel: z.string().describe('チャンネル名（#general等）'),
    message: z.string().describe('送信するメッセージ'),
  },
  async ({ channel, message }) => {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel, text: message }),
    });

    const result = await response.json();

    return {
      content: [{
        type: 'text',
        text: result.ok
          ? `メッセージを ${channel} に送信しました`
          : `エラー: ${result.error}`,
      }],
    };
  }
);
```

---

## テスト

```typescript
// tests/server.test.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

describe('MCP Server', () => {
  let server: McpServer;
  let client: Client;

  beforeEach(async () => {
    server = createServer(); // サーバーのファクトリ関数

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await server.connect(serverTransport);

    client = new Client({ name: 'test-client', version: '1.0.0' });
    await client.connect(clientTransport);
  });

  test('ツール一覧が取得できる', async () => {
    const tools = await client.listTools();
    expect(tools.tools.length).toBeGreaterThan(0);
    expect(tools.tools.find(t => t.name === 'get_weather')).toBeDefined();
  });

  test('天気ツールが正しく動作する', async () => {
    const result = await client.callTool({
      name: 'get_weather',
      arguments: { city: '東京' },
    });

    expect(result.content[0].text).toContain('東京');
  });
});
```

---

## デプロイ

### npxで実行可能にする

```json
// package.json
{
  "name": "my-mcp-server",
  "version": "1.0.0",
  "bin": {
    "my-mcp-server": "./dist/index.js"
  },
  "files": ["dist"],
  "type": "module"
}
```

```typescript
// dist/index.js の先頭に追加
#!/usr/bin/env node
```

### npmに公開

```bash
npm publish
```

利用者側の設定:

```json
{
  "mcpServers": {
    "my-tools": {
      "command": "npx",
      "args": ["-y", "my-mcp-server"]
    }
  }
}
```

---

## まとめ

MCPサーバー開発のポイント：

1. **シンプルに始める**: まずは1〜2個のツールから
2. **型安全**: zodでパラメータを厳密に定義
3. **エラーハンドリング**: ツール内で例外をキャッチし、わかりやすいメッセージを返す
4. **テスト**: InMemoryTransportでユニットテスト
5. **セキュリティ**: 環境変数でシークレット管理、危険な操作は制限

MCPはAIエージェントの能力を拡張する強力な仕組みです。自社サービスのAPIをMCPサーバーとして公開すれば、Claude等のAIモデルから直接操作できるようになります。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)

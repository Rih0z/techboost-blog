---
title: "MCPサーバー開発入門ガイド2026：Model Context Protocolで自分専用AIツールを作る"
description: "Anthropicが策定したModel Context Protocol（MCP）の仕組みを解説し、TypeScriptでカスタムMCPサーバーを実装する方法を実践的なコードとともに紹介。MCP・Model Context Protocol・Anthropicに関する実践情報。"
pubDate: "2026-03-06"
tags: ["MCP", "Model Context Protocol", "Anthropic", "Claude", "AI開発", "プログラミング"]
heroImage: '../../assets/thumbnails/mcp-server-development-guide-2026.jpg'
---
## MCPとは：AIとツールを繋ぐ標準規格

**Model Context Protocol（MCP）**は、Anthropicが2024年11月に発表したオープン規格です。AIアシスタント（Claude, GPT等）が外部ツール・データソースと安全に通信するための標準インターフェースを定義します。

```
従来：各AI製品が独自のプラグイン仕様を持つ → エコシステムが分断
MCP後：標準規格でどのAIも同じサーバーに接続できる
```

### MCPの3つの基本概念

```
Resources（リソース）: AIが読めるデータ（ファイル、DB、API結果）
Tools（ツール）: AIが実行できる関数（ファイル作成、API呼び出し）
Prompts（プロンプト）: 再利用可能なプロンプトテンプレート
```

---

## 開発環境のセットアップ

```bash
mkdir my-mcp-server && cd my-mcp-server
npm init -y
npm install @modelcontextprotocol/sdk zod
npm install -D typescript @types/node tsx
```

---

## 実践：天気情報MCPサーバーを作る

```typescript
// src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  { name: 'weather-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// ツール一覧を返すハンドラ
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_weather',
      description: '指定した都市の現在の天気を取得します',
      inputSchema: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: '都市名（例：Tokyo, Osaka）',
          },
        },
        required: ['city'],
      },
    },
  ],
}));

// ツール実行ハンドラ
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'get_weather') {
    const { city } = args as { city: string };

    // Open-Meteo API（無料）を使用
    const geoResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
    );
    const geoData = await geoResponse.json() as any;

    if (!geoData.results?.length) {
      throw new McpError(ErrorCode.InvalidParams, `都市が見つかりません: ${city}`);
    }

    const { latitude, longitude, name: cityName } = geoData.results[0];
    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
    );
    const weatherData = await weatherResponse.json() as any;
    const current = weatherData.current_weather;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          city: cityName,
          temperature: `${current.temperature}°C`,
          windspeed: `${current.windspeed} km/h`,
          isDay: current.is_day === 1,
        }, null, 2),
      }],
    };
  }

  throw new McpError(ErrorCode.MethodNotFound, `未知のツール: ${name}`);
});

// サーバー起動
const transport = new StdioServerTransport();
await server.connect(transport);
```

---

## Claude Desktopへの統合

```json
// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["/absolute/path/to/my-mcp-server/dist/index.js"]
    }
  }
}
```

---

## 応用：npmパッケージとして配布

```json
// MCPサーバーをnpmで公開する場合
{
  "mcpServers": {
    "weather": {
      "command": "npx",
      "args": ["my-weather-mcp-server"]
    }
  }
}
```

---

## Resourcesの実装：AIにデータを読ませる

```typescript
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

// サーバー初期化時にresourcesを有効化
const server = new Server(
  { name: 'notes-mcp', version: '1.0.0' },
  { capabilities: { tools: {}, resources: {} } }
);

const NOTES_DIR = './notes';

// リソース一覧
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const files = await readdir(NOTES_DIR);
  return {
    resources: files
      .filter(f => f.endsWith('.md'))
      .map(f => ({
        uri: `notes:///${f}`,
        name: f.replace('.md', ''),
        mimeType: 'text/markdown',
      })),
  };
});

// リソース読み取り
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  const filename = uri.replace('notes:///', '');
  const content = await readFile(join(NOTES_DIR, filename), 'utf-8');

  return {
    contents: [{
      uri,
      mimeType: 'text/markdown',
      text: content,
    }],
  };
});
```

---

## Promptsの実装：再利用可能なテンプレート

```typescript
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [
    {
      name: 'code_review',
      description: 'コードレビューを依頼するプロンプト',
      arguments: [
        { name: 'language', description: 'プログラミング言語', required: true },
        { name: 'code', description: 'レビュー対象のコード', required: true },
      ],
    },
  ],
}));

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'code_review') {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `以下の${args?.language}コードをレビューしてください。
バグ・セキュリティ・パフォーマンスの観点で改善点を指摘してください。

\`\`\`${args?.language}
${args?.code}
\`\`\``,
          },
        },
      ],
    };
  }
  throw new McpError(ErrorCode.InvalidParams, `未知のプロンプト: ${name}`);
});
```

---

## テスト：Vitestで品質を保証する

```typescript
// src/__tests__/weather.test.ts
import { describe, it, expect, vi } from 'vitest';

// fetch をモック
vi.stubGlobal('fetch', vi.fn());

describe('get_weather tool', () => {
  it('正常な都市名で天気情報を返す', async () => {
    const mockFetch = vi.mocked(fetch);

    // Geocoding APIのモック
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        results: [{ latitude: 35.68, longitude: 139.76, name: 'Tokyo' }],
      }),
    } as Response);

    // Weather APIのモック
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        current_weather: {
          temperature: 22.5,
          windspeed: 10.2,
          is_day: 1,
        },
      }),
    } as Response);

    // ツール実行
    const result = await handleGetWeather({ city: 'Tokyo' });
    const data = JSON.parse(result.content[0].text);

    expect(data.city).toBe('Tokyo');
    expect(data.temperature).toBe('22.5°C');
    expect(data.isDay).toBe(true);
  });

  it('存在しない都市名でエラーを返す', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({ results: [] }),
    } as Response);

    await expect(handleGetWeather({ city: 'XXXXX' }))
      .rejects.toThrow('都市が見つかりません');
  });
});
```

```bash
# テスト実行
npx vitest run
# カバレッジ付き
npx vitest run --coverage
```

---

## 実践例：SQLiteメモ帳MCPサーバー

```typescript
// SQLiteを使ったノート管理MCPサーバー
import Database from 'better-sqlite3';

const db = new Database('notes.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// ツール定義
const tools = [
  {
    name: 'create_note',
    description: 'ノートを作成',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'search_notes',
    description: 'ノートを全文検索',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '検索キーワード' },
      },
      required: ['query'],
    },
  },
  {
    name: 'list_notes',
    description: '最新のノート一覧を取得',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: '取得件数（デフォルト10）' },
      },
    },
  },
];
```

---

## Dockerでのデプロイ

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
CMD ["node", "dist/index.js"]
```

```json
// claude_desktop_config.json（Docker経由）
{
  "mcpServers": {
    "notes": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "my-notes-mcp:latest"]
    }
  }
}
```

---

## セキュリティのベストプラクティス

```typescript
import { z } from 'zod';

// 入力バリデーション（zodで厳密に）
const CreateNoteSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
});

// ツール実行時のバリデーション
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'create_note') {
    // zodでバリデーション
    const parsed = CreateNoteSchema.safeParse(args);
    if (!parsed.success) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `入力エラー: ${parsed.error.message}`
      );
    }
    // SQLインジェクション対策：プレースホルダを使用
    const stmt = db.prepare(
      'INSERT INTO notes (title, content) VALUES (?, ?)'
    );
    const result = stmt.run(parsed.data.title, parsed.data.content);
    return {
      content: [{ type: 'text', text: `ノートID: ${result.lastInsertRowid}` }],
    };
  }
});
```

**MCPサーバー開発のセキュリティチェックリスト：**

```
✅ 入力値は必ずzod等でバリデーション
✅ SQLはプレースホルダ（パラメータバインド）を使用
✅ ファイルパスはサンドボックス内に制限（パストラバーサル防止）
✅ 外部APIキーは環境変数から読み込み
✅ エラーメッセージに内部情報を含めない
✅ レート制限を実装（DoS防止）
```

---

## 公式MCPサーバーの活用

[GitHub公式MCPリポジトリ](https://github.com/modelcontextprotocol/servers)では以下が公開されています：

| サーバー | 機能 |
|---------|------|
| `@modelcontextprotocol/server-github` | GitHub Issues・PR操作 |
| `@modelcontextprotocol/server-postgres` | PostgreSQL直接クエリ |
| `@modelcontextprotocol/server-puppeteer` | ブラウザ自動操作 |
| `@modelcontextprotocol/server-slack` | Slackメッセージ送受信 |

---

## まとめ

MCPが変えるAI開発の未来：

- **一度作ったMCPサーバーは複数のAIクライアントで使い回せる**
- **社内ツール・社内DBへのAIアクセスを安全に制御できる**
- **npmで公開してエコシステムを作れる**

まずは[公式サーバー](https://github.com/modelcontextprotocol/servers)を使ってから、自作に挑戦してください。
---

## 関連記事

- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)
- [フリーランスエンジニアの収入完全ガイド2026【平均年収・単価・案件獲得】](/blog/2026-03-11-freelance-engineer-income-guide)
- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)

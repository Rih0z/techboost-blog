---
title: "MCPサーバー開発入門ガイド2026：Model Context Protocolで自分専用AIツールを作る"
description: "Anthropicが策定したModel Context Protocol（MCP）の仕組みを解説し、TypeScriptでカスタムMCPサーバーを実装する方法を実践的なコードとともに紹介。MCP・Model Context Protocol・Anthropicに関する実践情報。"
pubDate: "2026-03-06"
heroImage: '../../assets/thumbnails/mcp-server-development-guide-2026.jpg'
tags: ["MCP", "Model Context Protocol", "Anthropic", "Claude", "AI開発", "プログラミング"]
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

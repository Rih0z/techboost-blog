---
title: 'AI Function Calling実践ガイド: LLMとツール連携でインテリジェントなアプリ構築'
description: 'OpenAI、Anthropic Claude、Geminiなど主要LLMのFunction Calling機能を活用したインテリジェントアプリケーション開発ガイド。実装パターン、エラーハンドリング、ベストプラクティスを詳しく解説します。具体的なコード例とともに詳しく紹介します。'
pubDate: 2025-05-28
updatedDate: 2025-05-28
tags: ['AI', 'Function Calling', 'OpenAI', 'Claude', 'LLM', 'プログラミング']
heroImage: '../../assets/thumbnails/ai-function-calling-guide.jpg'
---

Function Calling（関数呼び出し）は、LLMが外部ツールやAPIを呼び出せるようにする機能です。この記事では、OpenAI、Anthropic Claude、GeminiなどのFunction Calling実装を完全解説します。

## Function Callingとは

Function Callingは、LLMが構造化された関数呼び出しを生成し、外部システムと連携できるようにする機能です。これにより、LLMは最新情報の取得、データベース操作、外部APIの実行など、様々なタスクを実行できます。

### 主な用途

- **データ取得**: 天気情報、株価、ニュースなど
- **操作実行**: メール送信、カレンダー登録、タスク作成
- **計算処理**: 複雑な計算、データ分析
- **外部連携**: CRM、データベース、サードパーティAPI

## OpenAI Function Calling

### 基本的な実装

```typescript
// src/openai/function-calling.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 関数の定義
const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: '指定された場所の現在の天気を取得します',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: '都市名（例: 東京、大阪）',
          },
          unit: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
            description: '温度の単位',
          },
        },
        required: ['location'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_web',
      description: 'Web検索を実行して最新情報を取得します',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '検索クエリ',
          },
          max_results: {
            type: 'number',
            description: '取得する結果の最大数',
            default: 5,
          },
        },
        required: ['query'],
      },
    },
  },
];

// 実際の関数実装
async function getWeather(location: string, unit: string = 'celsius'): Promise<string> {
  // 実際のAPIを呼び出す（ここではダミーデータ）
  const weatherData = {
    location,
    temperature: unit === 'celsius' ? 22 : 72,
    condition: 'sunny',
    humidity: 60,
  };

  return JSON.stringify(weatherData);
}

async function searchWeb(query: string, maxResults: number = 5): Promise<string> {
  // 実際の検索APIを呼び出す（ここではダミーデータ）
  const results = Array.from({ length: maxResults }, (_, i) => ({
    title: `Result ${i + 1} for "${query}"`,
    url: `https://example.com/result${i + 1}`,
    snippet: `This is a snippet for result ${i + 1}`,
  }));

  return JSON.stringify(results);
}

// Function Callingの実行
export async function runConversation(userMessage: string): Promise<string> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'user', content: userMessage },
  ];

  // 最初のAPI呼び出し
  let response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages,
    tools,
    tool_choice: 'auto',
  });

  let responseMessage = response.choices[0].message;

  // Function Callingのループ
  while (responseMessage.tool_calls) {
    messages.push(responseMessage);

    // 各tool callを実行
    for (const toolCall of responseMessage.tool_calls) {
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      console.log(`Calling function: ${functionName}`, functionArgs);

      let functionResponse: string;

      // 関数を実行
      switch (functionName) {
        case 'get_weather':
          functionResponse = await getWeather(
            functionArgs.location,
            functionArgs.unit
          );
          break;
        case 'search_web':
          functionResponse = await searchWeb(
            functionArgs.query,
            functionArgs.max_results
          );
          break;
        default:
          functionResponse = JSON.stringify({ error: 'Unknown function' });
      }

      // 関数の結果をメッセージに追加
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: functionResponse,
      });
    }

    // 関数の結果を含めて再度API呼び出し
    response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages,
      tools,
    });

    responseMessage = response.choices[0].message;
  }

  return responseMessage.content || 'No response';
}

// 使用例
const result = await runConversation('東京の天気を教えてください');
console.log(result);
```

## Anthropic Claude Tool Use

Claudeでは「Tool Use」という名前でFunction Calling機能を提供しています。

```typescript
// src/claude/tool-use.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ツールの定義
const tools: Anthropic.Tool[] = [
  {
    name: 'get_weather',
    description: '指定された場所の現在の天気を取得します',
    input_schema: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: '都市名（例: 東京、大阪）',
        },
        unit: {
          type: 'string',
          enum: ['celsius', 'fahrenheit'],
          description: '温度の単位',
        },
      },
      required: ['location'],
    },
  },
  {
    name: 'calculate',
    description: '数式を評価して計算結果を返します',
    input_schema: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: '計算式（例: "2 + 2 * 3"）',
        },
      },
      required: ['expression'],
    },
  },
];

// ツールの実装
async function executeTools(toolName: string, toolInput: any): Promise<string> {
  switch (toolName) {
    case 'get_weather': {
      const { location, unit = 'celsius' } = toolInput;
      const weatherData = {
        location,
        temperature: unit === 'celsius' ? 22 : 72,
        condition: 'sunny',
        humidity: 60,
      };
      return JSON.stringify(weatherData);
    }

    case 'calculate': {
      const { expression } = toolInput;
      try {
        // 注意: evalは危険なので、実際にはmath.jsなどを使用
        const result = eval(expression);
        return JSON.stringify({ result });
      } catch (error) {
        return JSON.stringify({ error: 'Invalid expression' });
      }
    }

    default:
      return JSON.stringify({ error: 'Unknown tool' });
  }
}

// Tool Useの実行
export async function runConversationWithClaude(userMessage: string): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userMessage },
  ];

  let response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages,
    tools,
  });

  console.log('Initial response:', response);

  // Tool Useのループ
  while (response.stop_reason === 'tool_use') {
    // ツール使用の結果を収集
    const toolResults: Anthropic.MessageParam[] = [];

    for (const content of response.content) {
      if (content.type === 'tool_use') {
        console.log(`Using tool: ${content.name}`, content.input);

        const toolResult = await executeTools(content.name, content.input);

        toolResults.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: content.id,
              content: toolResult,
            },
          ],
        });
      }
    }

    // アシスタントのレスポンスを追加
    messages.push({
      role: 'assistant',
      content: response.content,
    });

    // ツール結果を追加
    messages.push(...toolResults);

    // 再度API呼び出し
    response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages,
      tools,
    });

    console.log('Follow-up response:', response);
  }

  // 最終的なテキスト応答を抽出
  const textContent = response.content.find(c => c.type === 'text');
  return textContent?.type === 'text' ? textContent.text : 'No response';
}

// 使用例
const result = await runConversationWithClaude('東京の天気を教えて、その気温を華氏に変換して');
console.log(result);
```

## 実践的なユースケース

### 1. データベース操作エージェント

```typescript
// src/agents/database-agent.ts
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'query_users',
      description: 'ユーザーデータベースを検索します',
      parameters: {
        type: 'object',
        properties: {
          filters: {
            type: 'object',
            description: 'フィルター条件',
            properties: {
              email: { type: 'string' },
              role: { type: 'string' },
              created_after: { type: 'string' },
            },
          },
          limit: {
            type: 'number',
            description: '取得する最大件数',
            default: 10,
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_user',
      description: '新しいユーザーを作成します',
      parameters: {
        type: 'object',
        properties: {
          email: { type: 'string' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'user'] },
        },
        required: ['email', 'name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_user',
      description: 'ユーザー情報を更新します',
      parameters: {
        type: 'object',
        properties: {
          user_id: { type: 'string' },
          updates: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              role: { type: 'string' },
            },
          },
        },
        required: ['user_id', 'updates'],
      },
    },
  },
];

async function queryUsers(filters: any, limit: number = 10) {
  let query = supabase.from('users').select('*').limit(limit);

  if (filters.email) {
    query = query.eq('email', filters.email);
  }
  if (filters.role) {
    query = query.eq('role', filters.role);
  }
  if (filters.created_after) {
    query = query.gte('created_at', filters.created_after);
  }

  const { data, error } = await query;
  if (error) throw error;

  return JSON.stringify(data);
}

async function createUser(email: string, name: string, role: string = 'user') {
  const { data, error } = await supabase
    .from('users')
    .insert([{ email, name, role }])
    .select();

  if (error) throw error;
  return JSON.stringify(data);
}

async function updateUser(userId: string, updates: any) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select();

  if (error) throw error;
  return JSON.stringify(data);
}

export async function databaseAgent(userQuery: string): Promise<string> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: 'あなたはデータベース操作を支援するアシスタントです。ユーザーの自然言語での要求を適切なデータベース操作に変換します。',
    },
    { role: 'user', content: userQuery },
  ];

  let response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages,
    tools,
    tool_choice: 'auto',
  });

  let responseMessage = response.choices[0].message;

  while (responseMessage.tool_calls) {
    messages.push(responseMessage);

    for (const toolCall of responseMessage.tool_calls) {
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      let functionResponse: string;

      try {
        switch (functionName) {
          case 'query_users':
            functionResponse = await queryUsers(
              functionArgs.filters || {},
              functionArgs.limit
            );
            break;
          case 'create_user':
            functionResponse = await createUser(
              functionArgs.email,
              functionArgs.name,
              functionArgs.role
            );
            break;
          case 'update_user':
            functionResponse = await updateUser(
              functionArgs.user_id,
              functionArgs.updates
            );
            break;
          default:
            functionResponse = JSON.stringify({ error: 'Unknown function' });
        }
      } catch (error) {
        functionResponse = JSON.stringify({ error: (error as Error).message });
      }

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: functionResponse,
      });
    }

    response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages,
      tools,
    });

    responseMessage = response.choices[0].message;
  }

  return responseMessage.content || 'No response';
}

// 使用例
const result = await databaseAgent('管理者権限を持つユーザーを全員検索してください');
console.log(result);
```

### 2. マルチツールエージェント

```typescript
// src/agents/multi-tool-agent.ts
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'send_email',
      description: 'メールを送信します',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: '送信先メールアドレス' },
          subject: { type: 'string', description: '件名' },
          body: { type: 'string', description: '本文' },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_calendar_event',
      description: 'カレンダーにイベントを追加します',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'イベントタイトル' },
          start_time: { type: 'string', description: '開始時刻（ISO 8601形式）' },
          end_time: { type: 'string', description: '終了時刻（ISO 8601形式）' },
          attendees: {
            type: 'array',
            items: { type: 'string' },
            description: '参加者のメールアドレスリスト',
          },
        },
        required: ['title', 'start_time', 'end_time'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_documents',
      description: 'ドキュメントを検索します',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '検索クエリ' },
          filter: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['pdf', 'docx', 'txt'] },
              date_from: { type: 'string' },
              date_to: { type: 'string' },
            },
          },
        },
        required: ['query'],
      },
    },
  },
];

async function sendEmail(to: string, subject: string, body: string): Promise<string> {
  // 実際のメール送信処理
  console.log(`Sending email to ${to}: ${subject}`);
  return JSON.stringify({ success: true, message_id: crypto.randomUUID() });
}

async function createCalendarEvent(
  title: string,
  startTime: string,
  endTime: string,
  attendees: string[] = []
): Promise<string> {
  // 実際のカレンダーイベント作成処理
  console.log(`Creating event: ${title} from ${startTime} to ${endTime}`);
  return JSON.stringify({
    success: true,
    event_id: crypto.randomUUID(),
    attendees,
  });
}

async function searchDocuments(query: string, filter?: any): Promise<string> {
  // 実際のドキュメント検索処理
  console.log(`Searching documents: ${query}`, filter);
  return JSON.stringify({
    results: [
      { title: 'Document 1', url: 'https://example.com/doc1' },
      { title: 'Document 2', url: 'https://example.com/doc2' },
    ],
  });
}

export async function multiToolAgent(userRequest: string): Promise<string> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: 'あなたは複数のツールを使いこなすアシスタントです。ユーザーの要求に応じて、メール送信、カレンダー登録、ドキュメント検索などを実行できます。',
    },
    { role: 'user', content: userRequest },
  ];

  let response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages,
    tools,
    tool_choice: 'auto',
  });

  let responseMessage = response.choices[0].message;

  while (responseMessage.tool_calls) {
    messages.push(responseMessage);

    for (const toolCall of responseMessage.tool_calls) {
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      console.log(`Executing: ${functionName}`, functionArgs);

      let functionResponse: string;

      try {
        switch (functionName) {
          case 'send_email':
            functionResponse = await sendEmail(
              functionArgs.to,
              functionArgs.subject,
              functionArgs.body
            );
            break;
          case 'create_calendar_event':
            functionResponse = await createCalendarEvent(
              functionArgs.title,
              functionArgs.start_time,
              functionArgs.end_time,
              functionArgs.attendees
            );
            break;
          case 'search_documents':
            functionResponse = await searchDocuments(
              functionArgs.query,
              functionArgs.filter
            );
            break;
          default:
            functionResponse = JSON.stringify({ error: 'Unknown function' });
        }
      } catch (error) {
        functionResponse = JSON.stringify({ error: (error as Error).message });
      }

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: functionResponse,
      });
    }

    response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages,
      tools,
    });

    responseMessage = response.choices[0].message;
  }

  return responseMessage.content || 'No response';
}

// 使用例
const result = await multiToolAgent(
  '明日14時から1時間、チームミーティングをスケジュールして、参加者にメールで通知してください'
);
console.log(result);
```

## エラーハンドリングとベストプラクティス

### 1. リトライ機能付きFunction Calling

```typescript
async function executeWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.log(`Retry ${i + 1}/${maxRetries} after error:`, error);
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
  }

  throw lastError;
}
```

### 2. タイムアウト制御

```typescript
async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    ),
  ]);
}
```

## まとめ

Function Callingを活用することで、LLMは外部システムと連携し、より実用的なアプリケーションを構築できます。主なポイントは以下の通りです。

- **明確な関数定義**: パラメータとその説明を詳細に記述
- **適切なエラーハンドリング**: リトライ、タイムアウト、バリデーション
- **セキュリティ**: 実行権限の制御、入力検証
- **ログとモニタリング**: 関数呼び出しの追跡と分析

これらの手法を組み合わせることで、インテリジェントで信頼性の高いAIアプリケーションを開発できます。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)

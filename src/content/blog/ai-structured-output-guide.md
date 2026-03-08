---
title: 'AI構造化出力実践: LLMからJSON/TypeScriptの型安全なレスポンスを取得'
description: 'OpenAI、Anthropic、GeminiなどのLLMから構造化出力を取得する実践ガイド。Zod、TypeBox、JSON Schemaを使った型安全な実装、エラーハンドリング、パフォーマンス最適化まで解説。ベストプラクティスと注意点も紹介します。'
pubDate: '2025-12-12'
updatedDate: 'Dec 12 2025'
tags: ['AI', 'LLM', 'TypeScript', 'OpenAI', 'Claude']
heroImage: '../../assets/thumbnails/ai-structured-output-guide.jpg'
---

LLM（Large Language Model）からの出力を構造化データとして扱うことで、アプリケーション統合が劇的に容易になります。この記事では、OpenAI、Anthropic Claude、Google Geminiから型安全な構造化出力を取得する実践的な方法を解説します。

## 構造化出力とは

### 従来の問題点

```typescript
// 従来のプロンプト
const prompt = "Extract the user's name, email, and age from this text: ..."
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: prompt }]
})

// レスポンス例
const text = response.choices[0].message.content
// "The user's name is John, email is john@example.com, and age is 30."

// パースが必要（エラーの可能性）
const extracted = parseText(text) // 手動実装が必要
```

### 構造化出力のメリット

```typescript
// 構造化出力
const response = await openai.chat.completions.create({
  model: "gpt-4o-2024-08-06",
  messages: [{ role: "user", content: "Extract user info from: ..." }],
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "user_extraction",
      schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string" },
          age: { type: "number" }
        },
        required: ["name", "email"],
        additionalProperties: false
      }
    }
  }
})

// 直接JSONとして取得
const data = JSON.parse(response.choices[0].message.content)
// { name: "John", email: "john@example.com", age: 30 }
```

## OpenAI Structured Outputs

### 基本的な使い方

```typescript
import OpenAI from 'openai'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Zodスキーマ定義
const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().int().min(0).max(150).optional(),
  interests: z.array(z.string()).max(10)
})

type User = z.infer<typeof UserSchema>

// 構造化出力を取得
async function extractUser(text: string): Promise<User> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-2024-08-06",
    messages: [
      {
        role: "system",
        content: "You are a data extraction assistant. Extract user information from the provided text."
      },
      {
        role: "user",
        content: text
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "user_extraction",
        schema: zodToJsonSchema(UserSchema),
        strict: true
      }
    }
  })

  const data = JSON.parse(response.choices[0].message.content!)
  return UserSchema.parse(data) // Zodでバリデーション
}

// 使用例
const result = await extractUser(
  "My name is Alice, I'm 28 years old. Contact me at alice@example.com. I love programming and hiking."
)
console.log(result)
// { name: "Alice", email: "alice@example.com", age: 28, interests: ["programming", "hiking"] }
```

### 複雑なスキーマ

```typescript
// ネストされた構造
const BlogPostSchema = z.object({
  title: z.string(),
  summary: z.string().max(200),
  author: z.object({
    name: z.string(),
    bio: z.string().optional()
  }),
  tags: z.array(z.string()).min(1).max(5),
  sections: z.array(
    z.object({
      heading: z.string(),
      content: z.string(),
      subsections: z.array(
        z.object({
          heading: z.string(),
          content: z.string()
        })
      ).optional()
    })
  ),
  metadata: z.object({
    readTime: z.number().int().positive(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    publishDate: z.string().datetime()
  })
})

type BlogPost = z.infer<typeof BlogPostSchema>

async function generateBlogPost(topic: string): Promise<BlogPost> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-2024-08-06",
    messages: [
      {
        role: "system",
        content: "You are a technical blog writer. Generate a detailed blog post structure."
      },
      {
        role: "user",
        content: `Create a blog post about: ${topic}`
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "blog_post",
        schema: zodToJsonSchema(BlogPostSchema),
        strict: true
      }
    }
  })

  const data = JSON.parse(response.choices[0].message.content!)
  return BlogPostSchema.parse(data)
}
```

### リスト抽出

```typescript
const ProductListSchema = z.object({
  products: z.array(
    z.object({
      name: z.string(),
      price: z.number().positive(),
      category: z.string(),
      inStock: z.boolean(),
      rating: z.number().min(0).max(5).optional()
    })
  )
})

type ProductList = z.infer<typeof ProductListSchema>

async function extractProducts(html: string): Promise<ProductList> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-2024-08-06",
    messages: [
      {
        role: "system",
        content: "Extract all product information from the HTML."
      },
      {
        role: "user",
        content: html
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "product_list",
        schema: zodToJsonSchema(ProductListSchema),
        strict: true
      }
    }
  })

  const data = JSON.parse(response.choices[0].message.content!)
  return ProductListSchema.parse(data)
}
```

## Anthropic Claude Structured Outputs

### Claude 3.5 Sonnet

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

const RecipeSchema = z.object({
  name: z.string(),
  description: z.string(),
  servings: z.number().int().positive(),
  prepTime: z.number().int().positive(),
  cookTime: z.number().int().positive(),
  ingredients: z.array(
    z.object({
      name: z.string(),
      amount: z.string(),
      unit: z.string()
    })
  ),
  instructions: z.array(z.string()),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  tags: z.array(z.string())
})

type Recipe = z.infer<typeof RecipeSchema>

async function generateRecipe(dish: string): Promise<Recipe> {
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `Generate a detailed recipe for ${dish}. Return ONLY valid JSON matching this schema:\n${JSON.stringify(RecipeSchema.shape, null, 2)}`
      }
    ]
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Expected text response')
  }

  // JSON抽出（コードブロック内の場合）
  let jsonText = content.text
  const jsonMatch = jsonText.match(/```json\n([\s\S]*?)\n```/)
  if (jsonMatch) {
    jsonText = jsonMatch[1]
  }

  const data = JSON.parse(jsonText)
  return RecipeSchema.parse(data)
}
```

### Tool Use（Function Calling）

```typescript
const tools = [
  {
    name: 'extract_contact_info',
    description: 'Extracts contact information from text',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        company: { type: 'string' }
      },
      required: ['name']
    }
  }
] as const

async function extractContactInfo(text: string) {
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1000,
    tools,
    messages: [
      {
        role: 'user',
        content: `Extract contact information from: ${text}`
      }
    ]
  })

  const toolUse = response.content.find((block) => block.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('No tool use found')
  }

  return toolUse.input as {
    name: string
    email?: string
    phone?: string
    company?: string
  }
}

// 使用例
const contact = await extractContactInfo(
  "John Smith works at Acme Corp. Email: john@acme.com, Phone: 555-1234"
)
// { name: "John Smith", email: "john@acme.com", phone: "555-1234", company: "Acme Corp" }
```

## Google Gemini Structured Outputs

### Gemini 2.0

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)

const EventSchema = z.object({
  title: z.string(),
  description: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  location: z.object({
    name: z.string(),
    address: z.string(),
    coordinates: z.object({
      latitude: z.number(),
      longitude: z.number()
    }).optional()
  }),
  attendees: z.array(
    z.object({
      name: z.string(),
      email: z.string().email(),
      role: z.enum(['organizer', 'speaker', 'attendee'])
    })
  ),
  categories: z.array(z.string())
})

type Event = z.infer<typeof EventSchema>

async function extractEvent(text: string): Promise<Event> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          location: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              address: { type: 'string' }
            }
          },
          attendees: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string', enum: ['organizer', 'speaker', 'attendee'] }
              }
            }
          },
          categories: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  })

  const result = await model.generateContent(
    `Extract event information from: ${text}`
  )

  const data = JSON.parse(result.response.text())
  return EventSchema.parse(data)
}
```

## TypeBox統合

### TypeBoxスキーマ

```typescript
import { Type, Static } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'

// TypeBoxスキーマ定義
const TaskSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  title: Type.String({ minLength: 1, maxLength: 200 }),
  description: Type.String(),
  priority: Type.Union([
    Type.Literal('low'),
    Type.Literal('medium'),
    Type.Literal('high'),
    Type.Literal('urgent')
  ]),
  dueDate: Type.Optional(Type.String({ format: 'date-time' })),
  assignees: Type.Array(
    Type.Object({
      id: Type.String(),
      name: Type.String(),
      email: Type.String({ format: 'email' })
    })
  ),
  tags: Type.Array(Type.String(), { maxItems: 10 }),
  completed: Type.Boolean({ default: false })
})

type Task = Static<typeof TaskSchema>

async function generateTasks(projectDescription: string): Promise<Task[]> {
  const TaskListSchema = Type.Object({
    tasks: Type.Array(TaskSchema)
  })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-2024-08-06',
    messages: [
      {
        role: 'system',
        content: 'Generate a task list for the given project description.'
      },
      {
        role: 'user',
        content: projectDescription
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'task_list',
        schema: TaskListSchema as any,
        strict: true
      }
    }
  })

  const data = JSON.parse(response.choices[0].message.content!)

  // TypeBoxでバリデーション
  if (!Value.Check(TaskListSchema, data)) {
    const errors = [...Value.Errors(TaskListSchema, data)]
    throw new Error(`Validation failed: ${JSON.stringify(errors)}`)
  }

  return data.tasks
}
```

## エラーハンドリング

### リトライロジック

```typescript
import pRetry from 'p-retry'

async function extractWithRetry<T>(
  schema: z.ZodType<T>,
  prompt: string,
  maxRetries = 3
): Promise<T> {
  return pRetry(
    async () => {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-2024-08-06',
        messages: [{ role: 'user', content: prompt }],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'extraction',
            schema: zodToJsonSchema(schema),
            strict: true
          }
        }
      })

      const data = JSON.parse(response.choices[0].message.content!)

      // Zodバリデーション（失敗時は自動リトライ）
      return schema.parse(data)
    },
    {
      retries: maxRetries,
      onFailedAttempt: (error) => {
        console.log(
          `Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`
        )
      }
    }
  )
}
```

### フォールバック処理

```typescript
async function extractUserWithFallback(text: string): Promise<User | null> {
  try {
    // 構造化出力を試行
    return await extractUser(text)
  } catch (error) {
    console.error('Structured output failed, falling back to manual parsing:', error)

    // フォールバック: 通常のプロンプト
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Extract user info and respond with: name, email, age, interests (comma-separated).'
        },
        {
          role: 'user',
          content: text
        }
      ]
    })

    // 手動パース
    const content = response.choices[0].message.content!
    const lines = content.split('\n')
    const user: Partial<User> = {}

    for (const line of lines) {
      if (line.startsWith('name:')) user.name = line.split(':')[1].trim()
      if (line.startsWith('email:')) user.email = line.split(':')[1].trim()
      if (line.startsWith('age:')) user.age = parseInt(line.split(':')[1])
      if (line.startsWith('interests:')) {
        user.interests = line.split(':')[1].split(',').map(s => s.trim())
      }
    }

    return user.name && user.email ? (user as User) : null
  }
}
```

## パフォーマンス最適化

### バッチ処理

```typescript
async function extractMultipleUsers(texts: string[]): Promise<User[]> {
  const batchSize = 5
  const results: User[] = []

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)

    // 並列実行
    const batchResults = await Promise.all(
      batch.map(text => extractUser(text))
    )

    results.push(...batchResults)
  }

  return results
}
```

### キャッシング

```typescript
import NodeCache from 'node-cache'

const cache = new NodeCache({ stdTTL: 3600 }) // 1時間キャッシュ

async function extractUserCached(text: string): Promise<User> {
  const cacheKey = `user_${hashText(text)}`

  // キャッシュチェック
  const cached = cache.get<User>(cacheKey)
  if (cached) {
    return cached
  }

  // API呼び出し
  const user = await extractUser(text)

  // キャッシュに保存
  cache.set(cacheKey, user)

  return user
}

function hashText(text: string): string {
  return require('crypto').createHash('md5').update(text).digest('hex')
}
```

## 実世界のユースケース

### フォーム自動入力

```typescript
const FormDataSchema = z.object({
  personalInfo: z.object({
    firstName: z.string(),
    lastName: z.string(),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    nationality: z.string()
  }),
  contactInfo: z.object({
    email: z.string().email(),
    phone: z.string(),
    address: z.object({
      street: z.string(),
      city: z.string(),
      postalCode: z.string(),
      country: z.string()
    })
  }),
  employment: z.object({
    company: z.string(),
    position: z.string(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    salary: z.number().optional()
  })
})

async function fillFormFromCV(cvText: string) {
  const formData = await extractWithRetry(
    FormDataSchema,
    `Extract information from this CV and fill the form:\n${cvText}`
  )
  return formData
}
```

### データクリーニング

```typescript
const CleanedProductSchema = z.object({
  name: z.string(),
  normalizedPrice: z.number(),
  currency: z.string(),
  category: z.string(),
  specifications: z.record(z.string())
})

async function cleanProductData(rawData: string[]): Promise<typeof CleanedProductSchema[]> {
  return extractMultipleUsers(rawData) // 並列バッチ処理
}
```

## まとめ

### 構造化出力の利点

1. **型安全性** - TypeScriptの型システムと統合
2. **エラー削減** - パースエラーの排除
3. **開発効率** - 手動パース不要
4. **保守性** - スキーマ駆動開発

### モデル選択の指針

- **OpenAI GPT-4o** - 最も強力、複雑なスキーマに対応
- **Claude 3.5 Sonnet** - バランスが良い、Tool Use対応
- **Gemini 2.0** - コスト効率が高い、JSON Schema対応

### ベストプラクティス

1. **スキーマは明確に** - 曖昧な定義を避ける
2. **バリデーション必須** - Zod/TypeBoxで二重チェック
3. **エラーハンドリング** - リトライとフォールバックを実装
4. **キャッシング活用** - コスト削減とレスポンス向上

構造化出力は、LLMをアプリケーションに統合する際の強力な武器です。適切なスキーマ設計とエラーハンドリングにより、本番環境で信頼性の高いAI機能を実現できます。

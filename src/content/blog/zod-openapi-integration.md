---
title: "Zod + OpenAPI連携：型安全なAPIドキュメント自動生成"
description: "ZodスキーマからOpenAPI仕様を自動生成し、型安全性とドキュメントの一貫性を保つ方法を実践的なコード例とともに詳しく解説します。Swagger UIの自動生成やzod-to-openapi/zodiosの使い分け、Express/Hono連携の実装例も紹介します。"
pubDate: "2025-02-06"
tags: ["Zod", "OpenAPI", "型安全", "API設計", "TypeScript"]
heroImage: '../../assets/thumbnails/zod-openapi-integration.jpg'
---
## Zod + OpenAPI統合の価値

ZodとOpenAPIを連携させることで、以下のメリットが得られます:

- **単一の真実の情報源**: スキーマ定義を一箇所に集約
- **型安全性**: TypeScriptの型とランタイムバリデーションが一致
- **自動ドキュメント生成**: OpenAPI仕様から Swagger UI などを自動生成
- **クライアント生成**: OpenAPI仕様からクライアントコードを自動生成
- **テストの容易性**: スキーマベースのテストが可能

## セットアップ

### 必要なパッケージのインストール

```bash
npm install zod @asteasolutions/zod-to-openapi
npm install -D @types/node
```

### Honoとの統合（推奨）

```bash
npm install hono @hono/zod-openapi
```

## 基本的な使い方

### シンプルなスキーマ定義

```typescript
// schemas/user.ts
import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

// ZodにOpenAPI拡張を追加
extendZodWithOpenApi(z);

export const UserSchema = z.object({
  id: z.string().uuid().openapi({
    description: 'ユーザーの一意識別子',
    example: '123e4567-e89b-12d3-a456-426614174000'
  }),
  name: z.string().min(1).max(100).openapi({
    description: 'ユーザー名',
    example: '山田太郎'
  }),
  email: z.string().email().openapi({
    description: 'メールアドレス',
    example: 'yamada@example.com'
  }),
  age: z.number().int().min(0).max(150).optional().openapi({
    description: '年齢',
    example: 25
  }),
  role: z.enum(['admin', 'user', 'guest']).openapi({
    description: 'ユーザーロール',
    example: 'user'
  }),
  createdAt: z.string().datetime().openapi({
    description: '作成日時',
    example: '2024-01-01T00:00:00Z'
  })
}).openapi('User');

export type User = z.infer<typeof UserSchema>;
```

### OpenAPI仕様の生成

```typescript
// openapi/generator.ts
import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { UserSchema } from '../schemas/user';

// レジストリの作成
const registry = new OpenAPIRegistry();

// スキーマを登録
registry.register('User', UserSchema);

// パスの定義
registry.registerPath({
  method: 'get',
  path: '/users/{id}',
  summary: 'ユーザー情報を取得',
  tags: ['Users'],
  request: {
    params: z.object({
      id: z.string().uuid()
    })
  },
  responses: {
    200: {
      description: 'ユーザー情報',
      content: {
        'application/json': {
          schema: UserSchema
        }
      }
    },
    404: {
      description: 'ユーザーが見つかりません'
    }
  }
});

// OpenAPI仕様を生成
const generator = new OpenApiGeneratorV3(registry.definitions);

export const openApiDocument = generator.generateDocument({
  openapi: '3.0.0',
  info: {
    title: 'User API',
    version: '1.0.0',
    description: 'ユーザー管理API'
  },
  servers: [
    {
      url: 'https://api.example.com',
      description: 'Production'
    },
    {
      url: 'http://localhost:3000',
      description: 'Development'
    }
  ]
});
```

## Honoとの統合

### APIルートの定義

```typescript
// routes/users.ts
import { createRoute, z } from '@hono/zod-openapi';
import { UserSchema } from '../schemas/user';

// エラーレスポンススキーマ
const ErrorSchema = z.object({
  success: z.boolean().openapi({ example: false }),
  error: z.object({
    code: z.string().openapi({ example: 'NOT_FOUND' }),
    message: z.string().openapi({ example: 'User not found' })
  })
}).openapi('Error');

// ユーザー一覧取得
export const listUsersRoute = createRoute({
  method: 'get',
  path: '/users',
  summary: 'ユーザー一覧を取得',
  tags: ['Users'],
  request: {
    query: z.object({
      page: z.string().regex(/^\d+$/).transform(Number).optional().openapi({
        description: 'ページ番号',
        example: '1'
      }),
      limit: z.string().regex(/^\d+$/).transform(Number).optional().openapi({
        description: '1ページあたりの件数',
        example: '10'
      }),
      role: z.enum(['admin', 'user', 'guest']).optional().openapi({
        description: 'ロールでフィルター'
      })
    })
  },
  responses: {
    200: {
      description: 'ユーザー一覧',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().openapi({ example: true }),
            data: z.array(UserSchema),
            pagination: z.object({
              page: z.number().openapi({ example: 1 }),
              limit: z.number().openapi({ example: 10 }),
              total: z.number().openapi({ example: 100 })
            })
          })
        }
      }
    }
  }
});

// ユーザー取得
export const getUserRoute = createRoute({
  method: 'get',
  path: '/users/{id}',
  summary: 'ユーザー情報を取得',
  tags: ['Users'],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        description: 'ユーザーID',
        example: '123e4567-e89b-12d3-a456-426614174000'
      })
    })
  },
  responses: {
    200: {
      description: 'ユーザー情報',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().openapi({ example: true }),
            data: UserSchema
          })
        }
      }
    },
    404: {
      description: 'ユーザーが見つかりません',
      content: {
        'application/json': {
          schema: ErrorSchema
        }
      }
    }
  }
});

// ユーザー作成
export const createUserRoute = createRoute({
  method: 'post',
  path: '/users',
  summary: 'ユーザーを作成',
  tags: ['Users'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: UserSchema.omit({ id: true, createdAt: true })
        }
      }
    }
  },
  responses: {
    201: {
      description: 'ユーザーが作成されました',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().openapi({ example: true }),
            data: UserSchema
          })
        }
      }
    },
    400: {
      description: 'バリデーションエラー',
      content: {
        'application/json': {
          schema: ErrorSchema
        }
      }
    }
  }
});

// ユーザー更新
export const updateUserRoute = createRoute({
  method: 'put',
  path: '/users/{id}',
  summary: 'ユーザー情報を更新',
  tags: ['Users'],
  request: {
    params: z.object({
      id: z.string().uuid()
    }),
    body: {
      content: {
        'application/json': {
          schema: UserSchema.omit({ id: true, createdAt: true }).partial()
        }
      }
    }
  },
  responses: {
    200: {
      description: 'ユーザー情報が更新されました',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().openapi({ example: true }),
            data: UserSchema
          })
        }
      }
    },
    404: {
      description: 'ユーザーが見つかりません',
      content: {
        'application/json': {
          schema: ErrorSchema
        }
      }
    }
  }
});

// ユーザー削除
export const deleteUserRoute = createRoute({
  method: 'delete',
  path: '/users/{id}',
  summary: 'ユーザーを削除',
  tags: ['Users'],
  request: {
    params: z.object({
      id: z.string().uuid()
    })
  },
  responses: {
    204: {
      description: 'ユーザーが削除されました'
    },
    404: {
      description: 'ユーザーが見つかりません',
      content: {
        'application/json': {
          schema: ErrorSchema
        }
      }
    }
  }
});
```

### アプリケーションの実装

```typescript
// app.ts
import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import {
  listUsersRoute,
  getUserRoute,
  createUserRoute,
  updateUserRoute,
  deleteUserRoute
} from './routes/users';

const app = new OpenAPIHono();

// ユーザールートの実装
app.openapi(listUsersRoute, async (c) => {
  const { page = 1, limit = 10, role } = c.req.valid('query');
  
  // データベースから取得（仮実装）
  const users = await fetchUsers({ page, limit, role });
  
  return c.json({
    success: true,
    data: users,
    pagination: {
      page,
      limit,
      total: 100
    }
  });
});

app.openapi(getUserRoute, async (c) => {
  const { id } = c.req.valid('param');
  
  const user = await fetchUserById(id);
  
  if (!user) {
    return c.json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'User not found'
      }
    }, 404);
  }
  
  return c.json({
    success: true,
    data: user
  });
});

app.openapi(createUserRoute, async (c) => {
  const userData = c.req.valid('json');
  
  const user = await createUser(userData);
  
  return c.json({
    success: true,
    data: user
  }, 201);
});

app.openapi(updateUserRoute, async (c) => {
  const { id } = c.req.valid('param');
  const userData = c.req.valid('json');
  
  const user = await updateUser(id, userData);
  
  if (!user) {
    return c.json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'User not found'
      }
    }, 404);
  }
  
  return c.json({
    success: true,
    data: user
  });
});

app.openapi(deleteUserRoute, async (c) => {
  const { id } = c.req.valid('param');
  
  const deleted = await deleteUser(id);
  
  if (!deleted) {
    return c.json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'User not found'
      }
    }, 404);
  }
  
  return c.body(null, 204);
});

// OpenAPI仕様を公開
app.doc('/openapi.json', {
  openapi: '3.0.0',
  info: {
    title: 'User API',
    version: '1.0.0'
  }
});

// Swagger UIを追加
app.get('/docs', swaggerUI({ url: '/openapi.json' }));

export default app;
```

## 高度なスキーマ定義

### 再利用可能なスキーマ

```typescript
// schemas/common.ts
import { z } from 'zod';

// ページネーションスキーマ
export const PaginationQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('10')
}).openapi('PaginationQuery');

export const PaginationResponseSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number()
}).openapi('PaginationResponse');

// タイムスタンプスキーマ
export const TimestampsSchema = z.object({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}).openapi('Timestamps');

// IDスキーマ
export const UUIDSchema = z.string().uuid().openapi({
  description: 'UUID v4形式の識別子',
  example: '123e4567-e89b-12d3-a456-426614174000'
});
```

### リレーション付きスキーマ

```typescript
// schemas/post.ts
import { z } from 'zod';
import { UserSchema } from './user';
import { TimestampsSchema, UUIDSchema } from './common';

export const PostSchema = z.object({
  id: UUIDSchema,
  title: z.string().min(1).max(200).openapi({
    description: '投稿タイトル',
    example: 'TypeScript入門'
  }),
  content: z.string().min(1).openapi({
    description: '投稿内容',
    example: 'TypeScriptは...'
  }),
  authorId: UUIDSchema.openapi({
    description: '投稿者ID'
  }),
  author: UserSchema.optional().openapi({
    description: '投稿者情報（展開時のみ）'
  }),
  tags: z.array(z.string()).openapi({
    description: 'タグ一覧',
    example: ['TypeScript', 'JavaScript']
  }),
  published: z.boolean().openapi({
    description: '公開状態',
    example: true
  })
}).merge(TimestampsSchema).openapi('Post');

export type Post = z.infer<typeof PostSchema>;
```

### ネストされた配列とオブジェクト

```typescript
// schemas/order.ts
import { z } from 'zod';

const OrderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
  subtotal: z.number().positive()
}).openapi('OrderItem');

const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string().regex(/^\d{3}-\d{4}$/),
  country: z.string().length(2)
}).openapi('Address');

export const OrderSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  items: z.array(OrderItemSchema).min(1).openapi({
    description: '注文商品一覧'
  }),
  shippingAddress: AddressSchema.openapi({
    description: '配送先住所'
  }),
  billingAddress: AddressSchema.optional().openapi({
    description: '請求先住所（未指定の場合は配送先と同じ）'
  }),
  total: z.number().positive(),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
  createdAt: z.string().datetime()
}).openapi('Order');
```

## バリデーションとエラーハンドリング

### カスタムバリデーション

```typescript
// schemas/validators.ts
import { z } from 'zod';

// カスタムバリデーター
const phoneNumber = z.string().refine(
  (val) => /^0\d{9,10}$/.test(val),
  {
    message: '有効な電話番号を入力してください'
  }
).openapi({
  description: '電話番号（ハイフンなし）',
  example: '09012345678'
});

const strongPassword = z.string()
  .min(8, '8文字以上必要です')
  .regex(/[A-Z]/, '大文字を1文字以上含める必要があります')
  .regex(/[a-z]/, '小文字を1文字以上含める必要があります')
  .regex(/[0-9]/, '数字を1文字以上含める必要があります')
  .openapi({
    description: '強力なパスワード',
    example: 'MyP@ssw0rd'
  });

// 日付範囲バリデーション
const dateRange = z.object({
  startDate: z.string().date(),
  endDate: z.string().date()
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  {
    message: '終了日は開始日以降である必要があります',
    path: ['endDate']
  }
);
```

### グローバルエラーハンドラー

```typescript
// middleware/error-handler.ts
import { Context } from 'hono';
import { ZodError } from 'zod';

export const errorHandler = (err: Error, c: Context) => {
  // Zodバリデーションエラー
  if (err instanceof ZodError) {
    return c.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message
        }))
      }
    }, 400);
  }
  
  // その他のエラー
  console.error(err);
  
  return c.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  }, 500);
};

// app.ts で使用
app.onError(errorHandler);
```

## テスト

### スキーマベースのテスト

```typescript
// tests/schemas.test.ts
import { describe, it, expect } from 'vitest';
import { UserSchema } from '../schemas/user';

describe('UserSchema', () => {
  it('有効なユーザーデータを受け入れる', () => {
    const validUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: '山田太郎',
      email: 'yamada@example.com',
      role: 'user',
      createdAt: '2024-01-01T00:00:00Z'
    };
    
    const result = UserSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });
  
  it('無効なメールアドレスを拒否する', () => {
    const invalidUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: '山田太郎',
      email: 'invalid-email',
      role: 'user',
      createdAt: '2024-01-01T00:00:00Z'
    };
    
    const result = UserSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path).toContain('email');
    }
  });
});
```

### APIエンドポイントのテスト

```typescript
// tests/api.test.ts
import { describe, it, expect } from 'vitest';
import app from '../app';

describe('User API', () => {
  it('GET /users - ユーザー一覧を取得', async () => {
    const res = await app.request('/users?page=1&limit=10');
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.pagination).toBeDefined();
  });
  
  it('POST /users - ユーザーを作成', async () => {
    const newUser = {
      name: '田中花子',
      email: 'tanaka@example.com',
      role: 'user'
    };
    
    const res = await app.request('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });
    const data = await res.json();
    
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.name).toBe(newUser.name);
  });
  
  it('POST /users - バリデーションエラー', async () => {
    const invalidUser = {
      name: '',
      email: 'invalid-email'
    };
    
    const res = await app.request('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidUser)
    });
    const data = await res.json();
    
    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });
});
```

## クライアント生成

### openapi-typescript-codegenの使用

```bash
npm install -D openapi-typescript-codegen
```

```json
// package.json
{
  "scripts": {
    "generate:client": "openapi --input ./openapi.json --output ./src/client --client axios"
  }
}
```

生成されたクライアントの使用:

```typescript
// client-usage.ts
import { UsersService } from './client';

// 型安全なAPI呼び出し
const users = await UsersService.listUsers({
  page: 1,
  limit: 10,
  role: 'user'
});

const user = await UsersService.getUser('123e4567-e89b-12d3-a456-426614174000');

const newUser = await UsersService.createUser({
  name: '佐藤次郎',
  email: 'sato@example.com',
  role: 'user'
});
```

## ベストプラクティス

### 1. スキーマの分離と再利用

```typescript
// 良い例: 小さく分割された再利用可能なスキーマ
const EmailSchema = z.string().email();
const UUIDSchema = z.string().uuid();

const UserBaseSchema = z.object({
  name: z.string(),
  email: EmailSchema
});

const UserWithIdSchema = UserBaseSchema.extend({
  id: UUIDSchema
});
```

### 2. 適切なドキュメント

```typescript
const UserSchema = z.object({
  id: z.string().uuid().openapi({
    description: 'ユーザーの一意識別子',
    example: '123e4567-e89b-12d3-a456-426614174000'
  }),
  name: z.string().openapi({
    description: 'ユーザーの表示名。公開プロフィールで使用されます。',
    example: '山田太郎'
  })
});
```

### 3. バージョニング

```typescript
// v1/schemas/user.ts
export const UserSchemaV1 = z.object({
  id: z.string(),
  name: z.string()
}).openapi('UserV1');

// v2/schemas/user.ts
export const UserSchemaV2 = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email()
}).openapi('UserV2');
```

## まとめ

Zod + OpenAPI統合により:

- 型安全性とドキュメントの一致を保証
- スキーマ定義を単一の情報源に
- 自動ドキュメント生成による開発効率向上
- クライアントコードの自動生成
- テストの容易性向上

適切なスキーマ設計とドキュメント化により、保守性の高いAPIを構築できます。

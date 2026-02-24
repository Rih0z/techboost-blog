---
title: 'APIテスト完全ガイド2026：Vitest・Supertest・Hoppscotch・k6による品質保証'
description: 'APIテストの理論から実践まで徹底解説。Unit Test・Integration Test・E2E Test・Vitest・Supertest・Hoppscotch・Thunder Client・k6負荷テスト・OpenAPIテスト自動化まで実践的に学ぶ'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-5.jpg'
tags: ['API', 'Testing', 'Backend']
---

APIテストは現代のソフトウェア開発において欠かせない品質保証の柱である。マイクロサービスアーキテクチャが主流になり、フロントエンドとバックエンドが分離した開発スタイルが普及した今、APIの信頼性を担保することはプロダクトの成否を左右する。本記事では、APIテストの理論的基盤から最新ツールの実践的な使い方まで、2026年現在のベストプラクティスを体系的に解説する。

## 目次

1. APIテストの種類と戦略
2. Vitestによるユニットテスト
3. Supertestによる統合テスト
4. MSWによるモッキング
5. Hoppscotch / Thunder ClientによるAPIクライアントテスト
6. OpenAPI仕様からのテスト自動生成
7. Contract Testing（Pact）
8. k6による負荷テスト
9. Artillery.ioによる負荷テスト
10. TestContainersによるDockerベースのテスト環境
11. CI/CDパイプラインでのAPIテスト自動化
12. データベーステスト・トランザクションロールバック
13. セキュリティテスト（OWASP ZAP）
14. テストカバレッジとレポート

---

## 1. APIテストの種類と戦略

### テストピラミッドとAPIテスト

テストピラミッドはソフトウェアテスト戦略の基本モデルである。底辺に大量のユニットテスト、中段に統合テスト、頂点に少数のE2Eテストを配置する。APIテストはこのピラミッド全層にまたがる。

```
        /\
       /  \
      / E2E\
     /------\
    /  統合   \
   /----------\
  /  ユニット   \
 /--------------\
```

ユニットテストは個々の関数やモジュールを孤立した状態で検証する。統合テストは複数のコンポーネントが協調して動作することを確認する。E2Eテストは実際のユーザーシナリオを端から端まで検証する。

### Unit Test（ユニットテスト）

ユニットテストはAPIのビジネスロジック層を個別に検証する。データ変換ロジック、バリデーション関数、ユーティリティ関数などが対象となる。外部依存（データベース、外部API）はすべてモックに置き換える。

特徴：
- 実行速度が非常に速い（ミリ秒単位）
- 失敗箇所の特定が容易
- 開発中のフィードバックループが短い
- テスト数が最も多い（全テストの60〜70%）

### Integration Test（統合テスト）

統合テストはAPIエンドポイント全体の動作を検証する。HTTPリクエストを送信し、レスポンスのステータスコード、ヘッダー、ボディを確認する。データベースへの実際の書き込みと読み込みも含める。

特徴：
- 実行速度はユニットテストより遅い（秒単位）
- 実際の動作に近い検証が可能
- データベーススキーマの変更を検出できる
- テスト数は中程度（全テストの20〜30%）

### E2E Test（エンドツーエンドテスト）

E2Eテストは本番に近い環境で、ユーザーが実際に行う操作シナリオを再現する。認証フロー、複数APIにまたがるビジネスプロセス、外部サービスとの連携を検証する。

特徴：
- 実行速度が最も遅い（分単位）
- 最も信頼性の高い検証
- 環境依存が高く、不安定になりやすい（Flaky Tests）
- テスト数は最小限（全テストの5〜10%）

### Contract Testing（コントラクトテスト）

コントラクトテストはマイクロサービス間のインターフェース仕様（コントラクト）を検証する。サービスプロバイダーとコンシューマー間のAPIスキーマの互換性を継続的に確認し、サービス間の結合を最小化しながら品質を保証する。

### テスト戦略の設計原則

効果的なAPIテスト戦略を設計する際の原則を以下に示す。

**1. フィードバックループの最小化**
テストが失敗したとき、開発者が問題を認識するまでの時間を最小化する。ローカル開発中はユニットテストと統合テストを常時実行する。

**2. テストの独立性**
各テストケースは他のテストに依存しない。テストの実行順序が結果に影響しないよう設計する。テストデータはテスト毎に作成・削除する。

**3. テスト環境の再現性**
本番環境と同等の構成をテスト環境でも再現する。Dockerとコンテナ技術を活用してインフラを一致させる。

**4. テストコードの品質**
テストコードもプロダクションコードと同等の品質で書く。重複を排除し、リファクタリングに強いテストを設計する。

### プロジェクト構成の例

```
my-api/
├── src/
│   ├── controllers/
│   │   └── userController.ts
│   ├── services/
│   │   └── userService.ts
│   ├── repositories/
│   │   └── userRepository.ts
│   ├── middleware/
│   │   └── authMiddleware.ts
│   └── app.ts
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   │   └── userService.test.ts
│   │   └── middleware/
│   │       └── authMiddleware.test.ts
│   ├── integration/
│   │   ├── users.test.ts
│   │   └── auth.test.ts
│   ├── e2e/
│   │   └── userFlow.test.ts
│   └── fixtures/
│       └── userData.ts
├── vitest.config.ts
└── package.json
```

---

## 2. Vitestによるユニットテスト

### Vitestとは

VitestはViteベースの高速なJavaScript/TypeScriptテストフレームワークである。Jest互換のAPIを提供しながら、ESMネイティブサポートと並列実行による高速化を実現している。2025年現在、多くのモダンプロジェクトでJestの代替として採用されている。

### セットアップ

```bash
npm install --save-dev vitest @vitest/coverage-v8 supertest
```

`vitest.config.ts`の設定：

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/fixtures/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

テストセットアップファイル（`tests/setup.ts`）：

```typescript
import { beforeAll, afterAll, afterEach } from 'vitest';

// グローバルなテスト設定
beforeAll(async () => {
  // テスト全体の初期化処理
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/test_db';
});

afterEach(async () => {
  // 各テスト後のクリーンアップ
});

afterAll(async () => {
  // テスト全体の後処理
});
```

### サービス層のユニットテスト

ユーザーサービスのテスト例：

```typescript
// src/services/userService.ts
import { UserRepository } from '@/repositories/userRepository';
import { hashPassword, comparePassword } from '@/utils/crypto';
import { CreateUserDto, UpdateUserDto } from '@/dto/user.dto';
import { User } from '@/types';

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async createUser(dto: CreateUserDto): Promise<User> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }

    const hashedPassword = await hashPassword(dto.password);
    return this.userRepository.create({
      ...dto,
      password: hashedPassword,
    });
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) return null;

    const isValid = await comparePassword(password, user.password);
    if (!isValid) return null;

    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    return this.userRepository.update(id, dto);
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    await this.userRepository.delete(id);
  }
}
```

```typescript
// tests/unit/services/userService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '@/services/userService';
import { UserRepository } from '@/repositories/userRepository';
import * as crypto from '@/utils/crypto';

// モジュール全体をモック
vi.mock('@/utils/crypto');
vi.mock('@/repositories/userRepository');

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: vi.Mocked<UserRepository>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashed-password',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserRepository = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findAll: vi.fn(),
    } as unknown as vi.Mocked<UserRepository>;

    userService = new UserService(mockUserRepository);
  });

  describe('createUser', () => {
    it('新しいユーザーを正常に作成できる', async () => {
      // Arrange
      const dto = { email: 'new@example.com', name: 'New User', password: 'password123' };
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(crypto.hashPassword).mockResolvedValue('hashed-password');
      vi.mocked(mockUserRepository.create).mockResolvedValue({ ...mockUser, ...dto });

      // Act
      const result = await userService.createUser(dto);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(dto.email);
      expect(crypto.hashPassword).toHaveBeenCalledWith(dto.password);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        ...dto,
        password: 'hashed-password',
      });
      expect(result.email).toBe(dto.email);
    });

    it('既存のメールアドレスでエラーをスローする', async () => {
      // Arrange
      const dto = { email: 'existing@example.com', name: 'User', password: 'password' };
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(mockUser);

      // Act & Assert
      await expect(userService.createUser(dto)).rejects.toThrow('EMAIL_ALREADY_EXISTS');
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('validateUser', () => {
    it('正しい認証情報でユーザーを返す', async () => {
      // Arrange
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(mockUser);
      vi.mocked(crypto.comparePassword).mockResolvedValue(true);

      // Act
      const result = await userService.validateUser('test@example.com', 'password123');

      // Assert
      expect(result).toEqual(mockUser);
    });

    it('存在しないユーザーにnullを返す', async () => {
      // Arrange
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);

      // Act
      const result = await userService.validateUser('nonexistent@example.com', 'password');

      // Assert
      expect(result).toBeNull();
      expect(crypto.comparePassword).not.toHaveBeenCalled();
    });

    it('不正なパスワードにnullを返す', async () => {
      // Arrange
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(mockUser);
      vi.mocked(crypto.comparePassword).mockResolvedValue(false);

      // Act
      const result = await userService.validateUser('test@example.com', 'wrong-password');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('存在するユーザーを正常に更新できる', async () => {
      // Arrange
      const dto = { name: 'Updated Name' };
      const updatedUser = { ...mockUser, ...dto };
      vi.mocked(mockUserRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(mockUserRepository.update).mockResolvedValue(updatedUser);

      // Act
      const result = await userService.updateUser('user-123', dto);

      // Assert
      expect(result.name).toBe('Updated Name');
      expect(mockUserRepository.update).toHaveBeenCalledWith('user-123', dto);
    });

    it('存在しないユーザーIDでエラーをスローする', async () => {
      // Arrange
      vi.mocked(mockUserRepository.findById).mockResolvedValue(null);

      // Act & Assert
      await expect(userService.updateUser('nonexistent', {})).rejects.toThrow('USER_NOT_FOUND');
    });
  });

  describe('deleteUser', () => {
    it('存在するユーザーを正常に削除できる', async () => {
      // Arrange
      vi.mocked(mockUserRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(mockUserRepository.delete).mockResolvedValue(undefined);

      // Act
      await userService.deleteUser('user-123');

      // Assert
      expect(mockUserRepository.delete).toHaveBeenCalledWith('user-123');
    });

    it('存在しないユーザーIDでエラーをスローする', async () => {
      // Arrange
      vi.mocked(mockUserRepository.findById).mockResolvedValue(null);

      // Act & Assert
      await expect(userService.deleteUser('nonexistent')).rejects.toThrow('USER_NOT_FOUND');
    });
  });
});
```

### バリデーションロジックのテスト

```typescript
// src/validators/userValidator.ts
import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  name: z.string().min(2, '名前は2文字以上必要です').max(50, '名前は50文字以内にしてください'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上必要です')
    .regex(/[A-Z]/, '大文字を1文字以上含む必要があります')
    .regex(/[0-9]/, '数字を1文字以上含む必要があります'),
  role: z.enum(['user', 'admin', 'moderator']).default('user'),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export function validateCreateUser(input: unknown) {
  return CreateUserSchema.safeParse(input);
}
```

```typescript
// tests/unit/validators/userValidator.test.ts
import { describe, it, expect } from 'vitest';
import { validateCreateUser } from '@/validators/userValidator';

describe('validateCreateUser', () => {
  const validInput = {
    email: 'user@example.com',
    name: 'Test User',
    password: 'Password1',
    role: 'user',
  };

  it('有効な入力データをパースできる', () => {
    const result = validateCreateUser(validInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
      expect(result.data.role).toBe('user');
    }
  });

  it('roleのデフォルト値がuserになる', () => {
    const { role: _, ...withoutRole } = validInput;
    const result = validateCreateUser(withoutRole);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe('user');
    }
  });

  it('無効なメールアドレスでエラーを返す', () => {
    const result = validateCreateUser({ ...validInput, email: 'invalid-email' });

    expect(result.success).toBe(false);
    if (!result.success) {
      const emailError = result.error.issues.find(i => i.path[0] === 'email');
      expect(emailError?.message).toBe('有効なメールアドレスを入力してください');
    }
  });

  it('短いパスワードでエラーを返す', () => {
    const result = validateCreateUser({ ...validInput, password: 'Short1' });

    expect(result.success).toBe(false);
    if (!result.success) {
      const pwError = result.error.issues.find(i => i.path[0] === 'password');
      expect(pwError?.message).toBe('パスワードは8文字以上必要です');
    }
  });

  it('大文字なしパスワードでエラーを返す', () => {
    const result = validateCreateUser({ ...validInput, password: 'password1' });

    expect(result.success).toBe(false);
  });

  it.each([
    ['短すぎる名前', 'A', '名前は2文字以上必要です'],
    ['長すぎる名前', 'A'.repeat(51), '名前は50文字以内にしてください'],
  ])('%s でエラーを返す', (_label, name, expectedMsg) => {
    const result = validateCreateUser({ ...validInput, name });

    expect(result.success).toBe(false);
    if (!result.success) {
      const nameError = result.error.issues.find(i => i.path[0] === 'name');
      expect(nameError?.message).toBe(expectedMsg);
    }
  });
});
```

### ミドルウェアのテスト

```typescript
// src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: '認証トークンが必要です' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
      role: string;
    };
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'TOKEN_EXPIRED', message: 'トークンの有効期限が切れています' });
    }
    return res.status(401).json({ error: 'INVALID_TOKEN', message: '無効なトークンです' });
  }
}
```

```typescript
// tests/unit/middleware/authMiddleware.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthRequest } from '@/middleware/authMiddleware';

vi.mock('jsonwebtoken');

describe('authMiddleware', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      headers: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  it('有効なトークンで認証成功しnextを呼ぶ', () => {
    // Arrange
    const payload = { id: 'user-123', email: 'test@example.com', role: 'user' };
    mockReq.headers = { authorization: 'Bearer valid-token' };
    vi.mocked(jwt.verify).mockReturnValue(payload as any);

    // Act
    authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalled();
    expect(mockReq.user).toEqual(payload);
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('Authorizationヘッダーなしで401を返す', () => {
    // Act
    authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

    // Assert
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'UNAUTHORIZED',
      message: '認証トークンが必要です',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('Bearerプレフィックスなしで401を返す', () => {
    // Arrange
    mockReq.headers = { authorization: 'Token some-token' };

    // Act
    authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

    // Assert
    expect(mockRes.status).toHaveBeenCalledWith(401);
  });

  it('期限切れトークンで401を返す', () => {
    // Arrange
    mockReq.headers = { authorization: 'Bearer expired-token' };
    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new jwt.TokenExpiredError('jwt expired', new Date());
    });

    // Act
    authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

    // Assert
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'TOKEN_EXPIRED',
      message: 'トークンの有効期限が切れています',
    });
  });

  it('無効なトークンで401を返す', () => {
    // Arrange
    mockReq.headers = { authorization: 'Bearer invalid-token' };
    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new jwt.JsonWebTokenError('invalid token');
    });

    // Act
    authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

    // Assert
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'INVALID_TOKEN',
      message: '無効なトークンです',
    });
  });
});
```

---

## 3. Supertestによる統合テスト

### Supertestとは

SupertestはHTTPアサーションライブラリで、Node.jsのHTTPサーバーに対してテストリクエストを送信し、レスポンスを検証する。実際のHTTPサーバーを起動せずにAPIエンドポイントをテストできるため、統合テストに最適である。

### Expressアプリのセットアップ

```typescript
// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { userRouter } from '@/routes/users';
import { authRouter } from '@/routes/auth';
import { errorHandler } from '@/middleware/errorHandler';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ルーティング
  app.use('/api/auth', authRouter);
  app.use('/api/users', userRouter);

  // ヘルスチェック
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // エラーハンドリング
  app.use(errorHandler);

  return app;
}
```

### ユーザーAPIの統合テスト

```typescript
// tests/integration/users.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '@/app';
import { prisma } from '@/db/client';
import { generateToken } from '@/utils/jwt';

const app = createApp();

describe('Users API', () => {
  let adminToken: string;
  let userToken: string;
  let createdUserId: string;

  beforeAll(async () => {
    // テスト用ユーザーとトークンを事前に作成
    adminToken = generateToken({ id: 'admin-1', email: 'admin@test.com', role: 'admin' });
    userToken = generateToken({ id: 'user-1', email: 'user@test.com', role: 'user' });
  });

  beforeEach(async () => {
    // 各テスト前にデータをクリーンアップ
    await prisma.user.deleteMany({
      where: { email: { endsWith: '@integration-test.com' } },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { endsWith: '@integration-test.com' } },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/users', () => {
    it('新しいユーザーを作成して201を返す', async () => {
      const userData = {
        email: 'new@integration-test.com',
        name: 'New User',
        password: 'SecurePass1',
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        email: userData.email,
        name: userData.name,
      });
      expect(response.body).not.toHaveProperty('password');
      createdUserId = response.body.id;
    });

    it('重複メールアドレスで409を返す', async () => {
      // 最初のユーザーを作成
      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'dup@integration-test.com', name: 'User', password: 'Pass123A' });

      // 同じメールで2回目の作成
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'dup@integration-test.com', name: 'User2', password: 'Pass123A' })
        .expect(409);

      expect(response.body.error).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('認証なしで401を返す', async () => {
      await request(app)
        .post('/api/users')
        .send({ email: 'test@integration-test.com', name: 'User', password: 'Pass123A' })
        .expect(401);
    });

    it('admin権限なしで403を返す', async () => {
      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ email: 'test@integration-test.com', name: 'User', password: 'Pass123A' })
        .expect(403);
    });

    it('不正なデータで422を返す', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'invalid-email', name: 'U', password: '123' })
        .expect(422);

      expect(response.body.errors).toBeInstanceOf(Array);
      expect(response.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/users', () => {
    it('ユーザー一覧を取得して200を返す', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        data: expect.any(Array),
        total: expect.any(Number),
        page: 1,
        limit: 20,
      });
    });

    it('ページネーションが動作する', async () => {
      const response = await request(app)
        .get('/api/users?page=2&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.page).toBe(2);
      expect(response.body.limit).toBe(10);
    });

    it('メールでフィルタリングできる', async () => {
      // テスト用ユーザーを作成
      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'filter@integration-test.com', name: 'Filter User', password: 'Pass123A' });

      const response = await request(app)
        .get('/api/users?email=filter@integration-test.com')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].email).toBe('filter@integration-test.com');
    });
  });

  describe('GET /api/users/:id', () => {
    it('存在するユーザーを取得して200を返す', async () => {
      // ユーザーを作成
      const created = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'get@integration-test.com', name: 'Get User', password: 'Pass123A' });

      const response = await request(app)
        .get(`/api/users/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.email).toBe('get@integration-test.com');
    });

    it('存在しないIDで404を返す', async () => {
      await request(app)
        .get('/api/users/nonexistent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/users/:id', () => {
    it('ユーザー情報を更新して200を返す', async () => {
      const created = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'update@integration-test.com', name: 'Update User', password: 'Pass123A' });

      const response = await request(app)
        .patch(`/api/users/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('ユーザーを削除して204を返す', async () => {
      const created = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'delete@integration-test.com', name: 'Delete User', password: 'Pass123A' });

      await request(app)
        .delete(`/api/users/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // 削除確認
      await request(app)
        .get(`/api/users/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
```

### Fastifyアプリのテスト

```typescript
// tests/integration/fastify-users.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { userPlugin } from '@/plugins/users';

describe('Fastify Users API', () => {
  const fastify = Fastify({ logger: false });

  beforeAll(async () => {
    await fastify.register(userPlugin, { prefix: '/api/users' });
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  it('GET /api/users が200を返す', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/api/users',
      headers: {
        Authorization: 'Bearer valid-test-token',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toBeInstanceOf(Array);
  });

  it('POST /api/users が201を返す', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/users',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer admin-test-token',
      },
      payload: {
        email: 'fastify@test.com',
        name: 'Fastify User',
        password: 'SecurePass1',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.email).toBe('fastify@test.com');
  });
});
```

---

## 4. MSW（Mock Service Worker）によるモッキング

### MSWとは

MSW（Mock Service Worker）はService Workerを使ってネットワークリクエストをインターセプトするAPIモッキングライブラリである。ブラウザとNode.jsの両方で動作し、実際のHTTPリクエストをモックできるため、フロントエンドのテストやAPIクライアントのテストに最適である。

### セットアップ

```bash
npm install --save-dev msw
```

```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

const users = [
  { id: '1', email: 'alice@example.com', name: 'Alice', role: 'admin' },
  { id: '2', email: 'bob@example.com', name: 'Bob', role: 'user' },
];

export const handlers = [
  // GET /api/users
  http.get('https://api.example.com/api/users', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    const start = (page - 1) * limit;
    const data = users.slice(start, start + limit);

    return HttpResponse.json({
      data,
      total: users.length,
      page,
      limit,
    });
  }),

  // GET /api/users/:id
  http.get('https://api.example.com/api/users/:id', ({ params }) => {
    const user = users.find(u => u.id === params.id);
    if (!user) {
      return HttpResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    return HttpResponse.json(user);
  }),

  // POST /api/users
  http.post('https://api.example.com/api/users', async ({ request }) => {
    const body = await request.json() as any;
    const newUser = {
      id: String(users.length + 1),
      ...body,
      password: undefined,
    };
    users.push(newUser);
    return HttpResponse.json(newUser, { status: 201 });
  }),

  // PATCH /api/users/:id
  http.patch('https://api.example.com/api/users/:id', async ({ params, request }) => {
    const index = users.findIndex(u => u.id === params.id);
    if (index === -1) {
      return HttpResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    const body = await request.json() as any;
    users[index] = { ...users[index], ...body };
    return HttpResponse.json(users[index]);
  }),

  // DELETE /api/users/:id
  http.delete('https://api.example.com/api/users/:id', ({ params }) => {
    const index = users.findIndex(u => u.id === params.id);
    if (index === -1) {
      return HttpResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    users.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // 認証エンドポイント
  http.post('https://api.example.com/api/auth/login', async ({ request }) => {
    const body = await request.json() as any;
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        token: 'mock-jwt-token',
        user: { id: '1', email: body.email, role: 'user' },
      });
    }
    return HttpResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 });
  }),
];
```

```typescript
// tests/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

```typescript
// tests/setup.ts (MSW統合)
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### APIクライアントのテスト

```typescript
// src/api/userApi.ts
export class UserApi {
  constructor(private readonly baseUrl: string, private token?: string) {}

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async getUsers(params?: { page?: number; limit?: number }) {
    const url = new URL(`${this.baseUrl}/api/users`);
    if (params?.page) url.searchParams.set('page', String(params.page));
    if (params?.limit) url.searchParams.set('limit', String(params.limit));

    const response = await fetch(url.toString(), { headers: this.getHeaders() });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async createUser(data: { email: string; name: string; password: string }) {
    const response = await fetch(`${this.baseUrl}/api/users`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
}
```

```typescript
// tests/unit/api/userApi.test.ts
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { UserApi } from '@/api/userApi';

describe('UserApi', () => {
  const api = new UserApi('https://api.example.com', 'test-token');

  describe('getUsers', () => {
    it('ユーザー一覧を取得できる', async () => {
      const result = await api.getUsers();

      expect(result.data).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('ページネーションパラメータが正しく渡される', async () => {
      let capturedUrl: string = '';
      server.use(
        http.get('https://api.example.com/api/users', ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ data: [], total: 0, page: 2, limit: 5 });
        })
      );

      await api.getUsers({ page: 2, limit: 5 });

      expect(capturedUrl).toContain('page=2');
      expect(capturedUrl).toContain('limit=5');
    });

    it('APIエラー時に例外をスローする', async () => {
      server.use(
        http.get('https://api.example.com/api/users', () => {
          return HttpResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
        })
      );

      await expect(api.getUsers()).rejects.toThrow('HTTP 500');
    });
  });

  describe('createUser', () => {
    it('新しいユーザーを作成できる', async () => {
      const userData = {
        email: 'new@example.com',
        name: 'New User',
        password: 'Password1',
      };

      const result = await api.createUser(userData);

      expect(result.email).toBe(userData.email);
      expect(result.name).toBe(userData.name);
      expect(result).not.toHaveProperty('password');
    });
  });
});
```

---

## 5. Hoppscotch / Thunder ClientによるAPIクライアントテスト

### Hoppscotchとは

HoppscotchはオープンソースのAPIクライアントツールで、PostmanやInsomnia代替として広く使われている。ブラウザベースで動作し、REST、GraphQL、WebSocket、gRPCに対応している。コレクション・環境変数・テストスクリプトの機能を持ち、チームでのAPI開発に適している。

### Hoppscotchのコレクション設定

HoppscotchではJSONベースのコレクションをエクスポート・インポートできる。以下にコレクション定義の例を示す。

```json
{
  "v": 1,
  "name": "User Management API",
  "folders": [],
  "requests": [
    {
      "v": "1",
      "id": "req_001",
      "name": "Create User",
      "method": "POST",
      "endpoint": "<<base_url>>/api/users",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/json",
          "active": true
        },
        {
          "key": "Authorization",
          "value": "Bearer <<auth_token>>",
          "active": true
        }
      ],
      "body": {
        "contentType": "application/json",
        "body": "{\n  \"email\": \"test@example.com\",\n  \"name\": \"Test User\",\n  \"password\": \"SecurePass1\"\n}"
      },
      "testScript": "pw.test(\"Status is 201\", () => {\n  pw.expect(pw.response.status).toBe(201);\n});\n\npw.test(\"Response has user id\", () => {\n  const body = pw.response.body;\n  pw.expect(body).toHaveProperty(\"id\");\n  pw.expect(typeof body.id).toBe(\"string\");\n});\n\npw.test(\"Password is not exposed\", () => {\n  pw.expect(pw.response.body).not.toHaveProperty(\"password\");\n});\n\n// 次のリクエスト用に変数を設定\npw.env.set(\"user_id\", pw.response.body.id);"
    },
    {
      "v": "1",
      "id": "req_002",
      "name": "Get User",
      "method": "GET",
      "endpoint": "<<base_url>>/api/users/<<user_id>>",
      "headers": [
        {
          "key": "Authorization",
          "value": "Bearer <<auth_token>>",
          "active": true
        }
      ],
      "testScript": "pw.test(\"Status is 200\", () => {\n  pw.expect(pw.response.status).toBe(200);\n});\n\npw.test(\"Returns correct user\", () => {\n  pw.expect(pw.response.body.id).toBe(pw.env.get(\"user_id\"));\n});"
    }
  ]
}
```

### Thunder ClientによるVSCode統合テスト

Thunder ClientはVSCodeの拡張機能として動作するAPIクライアントである。`thunder-tests`ディレクトリにテストコレクションを保存でき、CIパイプラインでも実行可能である。

```json
// thunder-tests/thunder-collection_users.json
{
  "_id": "col_001",
  "colName": "Users API Tests",
  "created": "2026-01-01T00:00:00.000Z",
  "requests": [
    {
      "_id": "req_001",
      "colId": "col_001",
      "name": "Health Check",
      "url": "{{baseUrl}}/health",
      "method": "GET",
      "headers": [],
      "tests": [
        {
          "type": "res-status",
          "custom": "",
          "action": "equal",
          "value": "200"
        },
        {
          "type": "res-body",
          "custom": "json.status",
          "action": "equal",
          "value": "ok"
        }
      ]
    },
    {
      "_id": "req_002",
      "colId": "col_001",
      "name": "Login",
      "url": "{{baseUrl}}/api/auth/login",
      "method": "POST",
      "headers": [
        { "name": "Content-Type", "value": "application/json" }
      ],
      "body": {
        "type": "json",
        "raw": "{\"email\": \"{{testEmail}}\", \"password\": \"{{testPassword}}\"}"
      },
      "tests": [
        {
          "type": "res-status",
          "action": "equal",
          "value": "200"
        },
        {
          "type": "set-env-var",
          "custom": "json.token",
          "value": "authToken"
        }
      ]
    }
  ]
}
```

Thunder ClientをCLIから実行する設定：

```bash
# Thunder Client CLIのインストール
npm install --save-dev @thunderclient/cli

# テスト実行
npx tc-cli run --collection thunder-tests/thunder-collection_users.json \
  --env thunder-tests/thunder-environment.json \
  --reporter junit \
  --output test-results/thunder-results.xml
```

### 環境変数の管理

```json
// thunder-tests/thunder-environment.json
{
  "_id": "env_001",
  "name": "Development",
  "data": [
    { "name": "baseUrl", "value": "http://localhost:3000" },
    { "name": "testEmail", "value": "test@example.com" },
    { "name": "testPassword", "value": "TestPass123" }
  ]
}
```

---

## 6. OpenAPI仕様からのテスト自動生成

### OpenAPI仕様の活用

OpenAPI（Swagger）仕様からテストを自動生成することで、APIドキュメントとテストの一貫性を保証できる。仕様変更が即座にテストに反映され、ドキュメントのドリフトを防ぐ。

### dredd による契約テスト

DreddはOpenAPI仕様に基づいてAPIをテストするツールである。

```bash
npm install --save-dev dredd
```

```yaml
# dredd.yml
dry-run: null
hookfiles: tests/dredd-hooks.ts
language: nodejs
sandbox: false
server: npm run start:test
server-wait: 10
init: false
custom: {}
names: false
only: []
reporter: []
output: []
header: []
sorted: false
user: null
inline-errors: false
details: false
method: []
color: true
level: info
timestamp: false
silent: false
path: []
blueprint: openapi/api-spec.yaml
endpoint: http://localhost:3000
```

### Prism によるAPIモック・バリデーション

Prismは OpenAPI仕様からモックサーバーを自動生成し、リクエスト/レスポンスのバリデーションも行う。

```bash
npm install --save-dev @stoplight/prism-cli

# モックサーバーの起動
npx prism mock openapi/api-spec.yaml

# バリデーションモードで起動
npx prism proxy openapi/api-spec.yaml http://localhost:3000
```

### OpenAPI仕様の定義例

```yaml
# openapi/api-spec.yaml
openapi: '3.0.0'
info:
  title: User Management API
  version: '1.0.0'
  description: ユーザー管理APIの仕様

servers:
  - url: http://localhost:3000
    description: 開発環境

paths:
  /api/users:
    get:
      summary: ユーザー一覧取得
      operationId: listUsers
      security:
        - bearerAuth: []
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
      responses:
        '200':
          description: 成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserListResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'
    post:
      summary: ユーザー作成
      operationId: createUser
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          description: 作成成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '409':
          description: メールアドレス重複
        '422':
          description: バリデーションエラー

  /api/users/{id}:
    get:
      summary: ユーザー取得
      operationId: getUser
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          $ref: '#/components/responses/NotFound'

components:
  schemas:
    User:
      type: object
      required: [id, email, name, role, createdAt]
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        name:
          type: string
        role:
          type: string
          enum: [user, admin, moderator]
        createdAt:
          type: string
          format: date-time

    CreateUserRequest:
      type: object
      required: [email, name, password]
      properties:
        email:
          type: string
          format: email
        name:
          type: string
          minLength: 2
          maxLength: 50
        password:
          type: string
          minLength: 8

    UserListResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/User'
        total:
          type: integer
        page:
          type: integer
        limit:
          type: integer

  responses:
    Unauthorized:
      description: 認証エラー
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string
    NotFound:
      description: リソースが見つかりません

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

### openapi-typescript によるTypeScript型生成

```bash
npm install --save-dev openapi-typescript

# 型の自動生成
npx openapi-typescript openapi/api-spec.yaml -o src/types/api.ts
```

生成されたファイルをテストで活用する：

```typescript
// tests/integration/typeSafe.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '@/app';
import type { paths } from '@/types/api';

type CreateUserRequest = paths['/api/users']['post']['requestBody']['content']['application/json'];
type UserResponse = paths['/api/users/{id}']['get']['responses']['200']['content']['application/json'];

describe('型安全なAPIテスト', () => {
  it('ユーザー作成のリクエスト・レスポンス型が一致する', async () => {
    const requestBody: CreateUserRequest = {
      email: 'typed@test.com',
      name: 'Typed User',
      password: 'SecurePass1',
    };

    const response = await request(app)
      .post('/api/users')
      .set('Authorization', 'Bearer admin-token')
      .send(requestBody)
      .expect(201);

    // TypeScriptの型推論を活用したアサーション
    const user = response.body as UserResponse;
    expect(user.id).toBeDefined();
    expect(user.email).toBe(requestBody.email);
  });
});
```

---

## 7. Contract Testing（Pact）

### Contract Testingの概念

コントラクトテストはサービス間のインターフェース契約を検証するテスト手法である。コンシューマー（APIを呼び出す側）が期待するレスポンス形式を定義したコントラクトファイルを作成し、プロバイダー（APIを提供する側）がそのコントラクトを満たすことを検証する。

### Pactのセットアップ

```bash
npm install --save-dev @pact-foundation/pact
```

### コンシューマー側のテスト

```typescript
// tests/pact/userConsumer.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pact, Matchers } from '@pact-foundation/pact';
import path from 'path';
import { UserApi } from '@/api/userApi';

const { like, eachLike, term } = Matchers;

const provider = new Pact({
  consumer: 'UserDashboard',
  provider: 'UserService',
  port: 8181,
  log: path.resolve(process.cwd(), 'logs', 'pact.log'),
  dir: path.resolve(process.cwd(), 'pacts'),
  logLevel: 'warn',
});

describe('UserService Consumer Tests', () => {
  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());

  describe('GET /api/users', () => {
    beforeAll(() => {
      return provider.addInteraction({
        state: 'ユーザーが存在する',
        uponReceiving: 'ユーザー一覧の取得リクエスト',
        withRequest: {
          method: 'GET',
          path: '/api/users',
          headers: {
            Authorization: term({
              generate: 'Bearer valid-token',
              matcher: '^Bearer .+$',
            }),
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            data: eachLike({
              id: like('user-123'),
              email: like('user@example.com'),
              name: like('Test User'),
              role: term({
                generate: 'user',
                matcher: '^(user|admin|moderator)$',
              }),
            }),
            total: like(1),
            page: like(1),
            limit: like(20),
          },
        },
      });
    });

    it('ユーザー一覧を正しい形式で取得できる', async () => {
      const api = new UserApi('http://localhost:8181', 'valid-token');
      const result = await api.getUsers();

      expect(result.data).toBeInstanceOf(Array);
      expect(result.data[0]).toHaveProperty('id');
      expect(result.data[0]).toHaveProperty('email');
      expect(result.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('POST /api/users', () => {
    beforeAll(() => {
      return provider.addInteraction({
        state: '管理者として認証済み',
        uponReceiving: '新しいユーザーの作成リクエスト',
        withRequest: {
          method: 'POST',
          path: '/api/users',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer admin-token',
          },
          body: {
            email: 'new@example.com',
            name: 'New User',
            password: like('SecurePass1'),
          },
        },
        willRespondWith: {
          status: 201,
          body: {
            id: like('user-456'),
            email: 'new@example.com',
            name: 'New User',
            role: 'user',
          },
        },
      });
    });

    it('ユーザーを作成してコントラクト通りのレスポンスを受け取る', async () => {
      const api = new UserApi('http://localhost:8181', 'admin-token');
      const result = await api.createUser({
        email: 'new@example.com',
        name: 'New User',
        password: 'SecurePass1',
      });

      expect(result.id).toBeDefined();
      expect(result.email).toBe('new@example.com');
    });
  });
});
```

### プロバイダー側の検証

```typescript
// tests/pact/userProvider.test.ts
import { describe, it } from 'vitest';
import { Verifier } from '@pact-foundation/pact';
import path from 'path';
import { createApp } from '@/app';
import { prisma } from '@/db/client';

describe('UserService Provider Verification', () => {
  it('すべてのコンシューマーコントラクトを満たす', async () => {
    const app = createApp();
    const server = app.listen(3001);

    await new Verifier({
      provider: 'UserService',
      providerBaseUrl: 'http://localhost:3001',
      pactUrls: [path.resolve(__dirname, '../../pacts/userdashboard-userservice.json')],
      stateHandlers: {
        'ユーザーが存在する': async () => {
          await prisma.user.createMany({
            data: [
              { id: 'user-123', email: 'user@example.com', name: 'Test User', role: 'user', password: 'hashed' },
            ],
            skipDuplicates: true,
          });
        },
        '管理者として認証済み': async () => {
          // 管理者トークンを有効化する準備
        },
      },
      requestFilter: (req, res, next) => {
        // テスト用の認証バイパス
        req.headers.authorization = req.headers.authorization || 'Bearer test-token';
        next();
      },
    }).verifyProvider();

    server.close();
  });
});
```

---

## 8. k6による負荷テスト

### k6とは

k6はGrafana Labsが開発するオープンソースの負荷テストツールである。JavaScriptでテストスクリプトを記述でき、HTTPリクエストのパフォーマンスを詳細に計測できる。VU（Virtual User）による同時接続シミュレーション、レイテンシ計測、スループット測定が可能である。

### インストールと基本設定

```bash
# macOS
brew install k6

# Docker
docker pull grafana/k6
```

### 基本的な負荷テストスクリプト

```javascript
// k6/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// カスタムメトリクスの定義
const errorRate = new Rate('errors');
const createUserTrend = new Trend('create_user_duration');
const successCounter = new Counter('successful_requests');

// テストオプション
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // ウォームアップ: 30秒かけて10VUに増加
    { duration: '1m', target: 50 },    // 負荷増加: 1分かけて50VUに増加
    { duration: '2m', target: 50 },    // 安定負荷: 2分間50VUを維持
    { duration: '30s', target: 100 },  // ピーク負荷: 30秒かけて100VUに増加
    { duration: '1m', target: 100 },   // ピーク維持: 1分間100VUを維持
    { duration: '30s', target: 0 },    // クールダウン: 30秒かけてVUを0に
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],  // 95%ile < 500ms, 99%ile < 1000ms
    http_req_failed: ['rate<0.01'],                   // エラー率 < 1%
    errors: ['rate<0.05'],                            // カスタムエラー率 < 5%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// テストデータの準備
function generateUserData(vuId, iteration) {
  return {
    email: `load-test-${vuId}-${iteration}@example.com`,
    name: `Load Test User ${vuId}`,
    password: 'LoadTest123',
  };
}

// 認証トークンを取得
function getAuthToken() {
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: 'admin@test.com', password: 'AdminPass1' }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (loginRes.status === 200) {
    return JSON.parse(loginRes.body).token;
  }
  return null;
}

// メインテストシナリオ
export default function () {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // シナリオ1: ユーザー一覧取得
  const listRes = http.get(`${BASE_URL}/api/users`, { headers });
  check(listRes, {
    'GET /api/users - status 200': (r) => r.status === 200,
    'GET /api/users - response time OK': (r) => r.timings.duration < 300,
    'GET /api/users - has data array': (r) => {
      const body = JSON.parse(r.body);
      return Array.isArray(body.data);
    },
  }) || errorRate.add(1);

  sleep(0.5);

  // シナリオ2: ユーザー作成
  const userData = generateUserData(__VU, __ITER);
  const createStartTime = Date.now();
  const createRes = http.post(
    `${BASE_URL}/api/users`,
    JSON.stringify(userData),
    { headers }
  );
  createUserTrend.add(Date.now() - createStartTime);

  const createSuccess = check(createRes, {
    'POST /api/users - status 201': (r) => r.status === 201,
    'POST /api/users - has id': (r) => {
      const body = JSON.parse(r.body);
      return Boolean(body.id);
    },
  });

  if (createSuccess) {
    successCounter.add(1);
    const userId = JSON.parse(createRes.body).id;

    sleep(0.2);

    // シナリオ3: 作成したユーザーの取得
    const getRes = http.get(`${BASE_URL}/api/users/${userId}`, { headers });
    check(getRes, {
      'GET /api/users/:id - status 200': (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(0.2);

    // シナリオ4: ユーザー更新
    const updateRes = http.patch(
      `${BASE_URL}/api/users/${userId}`,
      JSON.stringify({ name: 'Updated Name' }),
      { headers }
    );
    check(updateRes, {
      'PATCH /api/users/:id - status 200': (r) => r.status === 200,
    }) || errorRate.add(1);
  } else {
    errorRate.add(1);
  }

  sleep(1);
}

// テスト終了時のサマリー出力
export function handleSummary(data) {
  return {
    'k6-results/summary.json': JSON.stringify(data),
    'k6-results/summary.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
```

### スモークテスト・ストレステスト

```javascript
// k6/smoke-test.js
// スモークテスト: システムが動作することを確認する最小限のテスト
export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.001'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/health`);
  check(res, {
    'Health check OK': (r) => r.status === 200,
  });
  sleep(1);
}
```

```javascript
// k6/stress-test.js
// ストレステスト: システムの限界を特定する
export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 300 },
    { duration: '5m', target: 300 },
    { duration: '2m', target: 400 },
    { duration: '5m', target: 400 },
    { duration: '10m', target: 0 },
  ],
};
```

```javascript
// k6/soak-test.js
// ソークテスト（耐久テスト）: 長時間稼働でのメモリリーク等を検出
export const options = {
  vus: 50,
  duration: '4h',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};
```

---

## 9. Artillery.ioによる負荷テスト

### Artilleryとは

ArtilleryはNode.js製の負荷テストツールで、YAMLベースのシナリオ定義が特徴である。HTTPだけでなくWebSocketやSocket.ioのテストにも対応している。プラグインエコシステムが充実しており、カスタム拡張が容易である。

### インストール

```bash
npm install --save-dev artillery @artillery/plugin-metrics-by-endpoint
```

### 基本設定ファイル

```yaml
# artillery/load-test.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 5
      name: "ウォームアップ"
    - duration: 120
      arrivalRate: 20
      name: "通常負荷"
    - duration: 60
      arrivalRate: 50
      name: "ピーク負荷"
  defaults:
    headers:
      Content-Type: 'application/json'
  plugins:
    metrics-by-endpoint: {}
  ensure:
    p95: 500
    p99: 1000
    maxErrorRate: 1
  processor: './artillery/processor.js'

scenarios:
  - name: "ユーザー管理フロー"
    weight: 70
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "{{ $randomEmail() }}"
            password: "TestPass123"
          capture:
            - json: "$.token"
              as: "authToken"
          expect:
            - statusCode: 200
            - hasProperty: "token"

      - get:
          url: "/api/users"
          headers:
            Authorization: "Bearer {{ authToken }}"
          expect:
            - statusCode: 200
            - hasProperty: "data"
            - contentType: "application/json"

      - post:
          url: "/api/users"
          headers:
            Authorization: "Bearer {{ authToken }}"
          json:
            email: "{{ $randomEmail() }}"
            name: "Artillery Test User"
            password: "ArtilleryPass1"
          capture:
            - json: "$.id"
              as: "userId"
          expect:
            - statusCode: 201

      - get:
          url: "/api/users/{{ userId }}"
          headers:
            Authorization: "Bearer {{ authToken }}"
          expect:
            - statusCode: 200

      - patch:
          url: "/api/users/{{ userId }}"
          headers:
            Authorization: "Bearer {{ authToken }}"
          json:
            name: "Updated Artillery User"
          expect:
            - statusCode: 200

  - name: "読み取り専用フロー"
    weight: 30
    flow:
      - get:
          url: "/health"
          expect:
            - statusCode: 200

      - get:
          url: "/api/users?page=1&limit=10"
          headers:
            Authorization: "Bearer {{ authToken }}"
          expect:
            - statusCode: 200
```

### カスタムプロセッサー

```javascript
// artillery/processor.js
'use strict';

module.exports = {
  generateTestEmail,
  logResponse,
  handleError,
};

function generateTestEmail(context, events, done) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  context.vars.email = `test-${timestamp}-${random}@artillery-test.com`;
  return done();
}

function logResponse(requestParams, response, context, events, done) {
  if (response.statusCode >= 400) {
    console.error(`Error: ${response.statusCode} for ${requestParams.url}`);
    events.emit('counter', 'error_responses', 1);
  }
  return done();
}

function handleError(err, context) {
  console.error('Request error:', err.message);
}
```

### Artilleryテストの実行とレポート

```bash
# テスト実行
npx artillery run artillery/load-test.yml

# HTML形式のレポート出力
npx artillery run artillery/load-test.yml --output artillery-report.json
npx artillery report artillery-report.json

# クイックテスト（簡易負荷確認）
npx artillery quick --count 20 --num 10 http://localhost:3000/health
```

---

## 10. TestContainersによるDockerベースのテスト環境

### TestContainersとは

TestContainersはDockerコンテナをテスト内でプログラム的に起動・管理するライブラリである。テスト実行時に実際のデータベース（PostgreSQL、MySQL、Redis等）をコンテナで起動し、テスト終了後に自動削除する。本番環境に近い状態でテストを実行でき、モックの不一致問題を排除できる。

### インストール

```bash
npm install --save-dev testcontainers
```

### PostgreSQLを使ったテスト

```typescript
// tests/integration/database.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

describe('データベース統合テスト（TestContainers）', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // PostgreSQLコンテナを起動
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .start();

    const databaseUrl = container.getConnectionUri();
    process.env.DATABASE_URL = databaseUrl;

    // Prismaのマイグレーションを実行
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });

    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  }, 60000); // タイムアウト60秒（コンテナ起動に時間がかかるため）

  afterAll(async () => {
    await prisma.$disconnect();
    await container.stop();
  });

  it('ユーザーをデータベースに保存・取得できる', async () => {
    // データ作成
    const created = await prisma.user.create({
      data: {
        email: 'test@testcontainers.com',
        name: 'TestContainers User',
        password: 'hashed-password',
        role: 'user',
      },
    });

    expect(created.id).toBeDefined();
    expect(created.email).toBe('test@testcontainers.com');

    // データ取得
    const found = await prisma.user.findUnique({
      where: { id: created.id },
    });

    expect(found).not.toBeNull();
    expect(found!.name).toBe('TestContainers User');
  });

  it('一意制約が機能する', async () => {
    await prisma.user.create({
      data: {
        email: 'unique@testcontainers.com',
        name: 'First User',
        password: 'hashed',
        role: 'user',
      },
    });

    await expect(
      prisma.user.create({
        data: {
          email: 'unique@testcontainers.com',
          name: 'Second User',
          password: 'hashed',
          role: 'user',
        },
      })
    ).rejects.toThrow();
  });
});
```

### RedisとAPIの統合テスト

```typescript
// tests/integration/cache.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { createClient } from 'redis';
import request from 'supertest';
import { createApp } from '@/app';

describe('Redisキャッシュ統合テスト', () => {
  let redisContainer: StartedRedisContainer;
  let redisClient: ReturnType<typeof createClient>;

  beforeAll(async () => {
    redisContainer = await new RedisContainer('redis:7-alpine').start();

    const redisUrl = `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`;
    process.env.REDIS_URL = redisUrl;

    redisClient = createClient({ url: redisUrl });
    await redisClient.connect();
  }, 30000);

  afterAll(async () => {
    await redisClient.disconnect();
    await redisContainer.stop();
  });

  it('キャッシュヒット時にレスポンスが速い', async () => {
    const app = createApp();

    // 最初のリクエスト（キャッシュミス）
    const firstStart = Date.now();
    await request(app).get('/api/users').set('Authorization', 'Bearer test-token');
    const firstDuration = Date.now() - firstStart;

    // 2回目のリクエスト（キャッシュヒット）
    const secondStart = Date.now();
    await request(app).get('/api/users').set('Authorization', 'Bearer test-token');
    const secondDuration = Date.now() - secondStart;

    // キャッシュヒット時は著しく速いはず
    expect(secondDuration).toBeLessThan(firstDuration * 0.5);
  });

  it('キャッシュが正しい値を返す', async () => {
    // Redisに直接データをセット
    await redisClient.setEx('user:test-123', 3600, JSON.stringify({
      id: 'test-123',
      email: 'cache@test.com',
      name: 'Cache User',
    }));

    const app = createApp();
    const response = await request(app)
      .get('/api/users/test-123')
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    expect(response.body.email).toBe('cache@test.com');
  });
});
```

---

## 11. CI/CDパイプラインでのAPIテスト自動化

### GitHub Actionsでのテスト自動化

```yaml
# .github/workflows/api-tests.yml
name: API Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '22'
  POSTGRES_USER: test_user
  POSTGRES_PASSWORD: test_password
  POSTGRES_DB: test_db

jobs:
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Upload coverage report
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/lcov.info
          fail_ci_if_error: true

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: ${{ env.POSTGRES_USER }}
          POSTGRES_PASSWORD: ${{ env.POSTGRES_PASSWORD }}
          POSTGRES_DB: ${{ env.POSTGRES_DB }}
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: Run database migrations
        env:
          DATABASE_URL: postgresql://${{ env.POSTGRES_USER }}:${{ env.POSTGRES_PASSWORD }}@localhost:5432/${{ env.POSTGRES_DB }}
        run: npx prisma migrate deploy

      - name: Run integration tests
        env:
          DATABASE_URL: postgresql://${{ env.POSTGRES_USER }}:${{ env.POSTGRES_PASSWORD }}@localhost:5432/${{ env.POSTGRES_DB }}
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: test-secret-key
        run: npm run test:integration

  contract-tests:
    name: Contract Tests
    runs-on: ubuntu-latest
    needs: integration-tests
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci

      - name: Run consumer contract tests
        run: npm run test:pact:consumer

      - name: Publish pacts to Pact Broker
        if: github.ref == 'refs/heads/main'
        env:
          PACT_BROKER_URL: ${{ secrets.PACT_BROKER_URL }}
          PACT_BROKER_TOKEN: ${{ secrets.PACT_BROKER_TOKEN }}
        run: |
          npx pact-broker publish ./pacts \
            --consumer-app-version ${{ github.sha }} \
            --branch ${{ github.ref_name }}

  load-tests:
    name: Load Tests
    runs-on: ubuntu-latest
    needs: integration-tests
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Start application
        run: |
          npm ci
          npm run build
          npm start &
          sleep 10

      - name: Run k6 smoke test
        uses: grafana/k6-action@v0.3.1
        with:
          filename: k6/smoke-test.js
          flags: --out json=k6-results.json
        env:
          BASE_URL: http://localhost:3000

      - name: Upload k6 results
        uses: actions/upload-artifact@v4
        with:
          name: k6-results
          path: k6-results.json

  security-tests:
    name: Security Tests
    runs-on: ubuntu-latest
    needs: integration-tests
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Run OWASP ZAP baseline scan
        uses: zaproxy/action-baseline@v0.12.0
        with:
          target: 'http://localhost:3000'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'
```

### package.jsonのスクリプト設定

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "vitest run tests/e2e",
    "test:pact:consumer": "vitest run tests/pact",
    "test:coverage": "vitest run --coverage",
    "test:ci": "vitest run --coverage --reporter=junit --outputFile=test-results/junit.xml",
    "test:load:smoke": "k6 run k6/smoke-test.js",
    "test:load:load": "k6 run k6/load-test.js",
    "test:load:stress": "k6 run k6/stress-test.js",
    "test:artillery": "artillery run artillery/load-test.yml"
  }
}
```

---

## 12. データベーステスト・トランザクションロールバック

### トランザクションを使ったテスト分離

テスト間のデータ汚染を防ぐ最良の方法は、各テストをトランザクション内で実行し、テスト後にロールバックすることである。

```typescript
// tests/helpers/dbTransaction.ts
import { PrismaClient } from '@prisma/client';

export async function withTransaction<T>(
  prisma: PrismaClient,
  fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const result = await fn(tx);
    throw new Error('ROLLBACK_SENTINEL'); // ロールバックを強制
  }).catch((err) => {
    if (err.message === 'ROLLBACK_SENTINEL') {
      return null as T;
    }
    throw err;
  });
}
```

### データベーステストのパターン

```typescript
// tests/integration/userRepository.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { UserRepository } from '@/repositories/userRepository';

describe('UserRepository', () => {
  let prisma: PrismaClient;
  let repo: UserRepository;

  beforeAll(async () => {
    prisma = new PrismaClient();
    repo = new UserRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // テストデータのクリーンアップ戦略1: beforeEach/afterEach
  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: '@db-test.com' } } });
  });

  describe('findByEmail', () => {
    it('存在するメールアドレスでユーザーを取得する', async () => {
      // テストデータを作成
      const created = await prisma.user.create({
        data: {
          email: 'find@db-test.com',
          name: 'Find User',
          password: 'hashed',
          role: 'user',
        },
      });

      const found = await repo.findByEmail('find@db-test.com');

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
    });

    it('存在しないメールアドレスでnullを返す', async () => {
      const result = await repo.findByEmail('notexist@db-test.com');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('新しいユーザーを作成してidを返す', async () => {
      const result = await repo.create({
        email: 'create@db-test.com',
        name: 'Create User',
        password: 'hashed-password',
        role: 'user',
      });

      expect(result.id).toBeDefined();
      expect(result.email).toBe('create@db-test.com');
      expect(result.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('findAll', () => {
    it('ページネーションが正しく動作する', async () => {
      // 複数のテストデータを作成
      await prisma.user.createMany({
        data: Array.from({ length: 15 }, (_, i) => ({
          email: `page${i}@db-test.com`,
          name: `Page User ${i}`,
          password: 'hashed',
          role: 'user' as const,
        })),
      });

      const page1 = await repo.findAll({ page: 1, limit: 10 });
      const page2 = await repo.findAll({ page: 2, limit: 10 });

      expect(page1.data).toHaveLength(10);
      expect(page2.data.length).toBeGreaterThan(0);

      // ページ間でIDが重複しないことを確認
      const page1Ids = page1.data.map(u => u.id);
      const page2Ids = page2.data.map(u => u.id);
      const overlap = page1Ids.filter(id => page2Ids.includes(id));
      expect(overlap).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('指定されたフィールドのみ更新する', async () => {
      const user = await prisma.user.create({
        data: { email: 'update@db-test.com', name: 'Original Name', password: 'hashed', role: 'user' },
      });

      const updated = await repo.update(user.id, { name: 'Updated Name' });

      expect(updated.name).toBe('Updated Name');
      expect(updated.email).toBe('update@db-test.com'); // 変更されていない
    });
  });

  describe('delete', () => {
    it('ユーザーを削除してデータベースから消える', async () => {
      const user = await prisma.user.create({
        data: { email: 'delete@db-test.com', name: 'Delete User', password: 'hashed', role: 'user' },
      });

      await repo.delete(user.id);

      const found = await prisma.user.findUnique({ where: { id: user.id } });
      expect(found).toBeNull();
    });
  });
});
```

### シードデータとフィクスチャ管理

```typescript
// tests/fixtures/userData.ts
import { PrismaClient } from '@prisma/client';

export const userFixtures = {
  adminUser: {
    email: 'admin@fixture.com',
    name: 'Admin User',
    password: 'hashed-admin-password',
    role: 'admin' as const,
  },
  regularUser: {
    email: 'user@fixture.com',
    name: 'Regular User',
    password: 'hashed-user-password',
    role: 'user' as const,
  },
};

export async function seedTestDatabase(prisma: PrismaClient) {
  const admin = await prisma.user.upsert({
    where: { email: userFixtures.adminUser.email },
    update: {},
    create: userFixtures.adminUser,
  });

  const user = await prisma.user.upsert({
    where: { email: userFixtures.regularUser.email },
    update: {},
    create: userFixtures.regularUser,
  });

  return { admin, user };
}

export async function cleanTestDatabase(prisma: PrismaClient) {
  await prisma.user.deleteMany({
    where: {
      email: { in: Object.values(userFixtures).map(f => f.email) },
    },
  });
}
```

---

## 13. セキュリティテスト（OWASP ZAP）

### APIのセキュリティテストの重要性

APIセキュリティはOWASP API Security Top 10として体系化されている。主要な脆弱性には以下が含まれる。

- **API1: オブジェクトレベルの認可の不備（BOLA）** - 他ユーザーのリソースへの不正アクセス
- **API2: 認証の不備** - 弱い認証メカニズム
- **API3: オブジェクトプロパティレベルの認可の不備** - 機密フィールドの過剰公開
- **API4: 無制限リソース消費** - レート制限の欠如
- **API5: 機能レベルの認可の不備** - 管理機能への不正アクセス

### OWASP ZAPを使ったスキャン

```bash
# Docker経由でZAPを実行
docker run -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t http://localhost:3000 \
  -r zap-report.html \
  -J zap-report.json
```

ZAP設定ファイル（`.zap/rules.tsv`）：

```tsv
10202	IGNORE	(Absence of Anti-CSRF Tokens)
10015	IGNORE	(Incomplete or No Cache-control Header Set)
```

### セキュリティテストの実装例

```typescript
// tests/security/authSecurity.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '@/app';

const app = createApp();

describe('認証セキュリティテスト', () => {
  describe('SQLインジェクション対策', () => {
    it('SQLインジェクション文字列でもエラーにならず正常レスポンスを返す', async () => {
      const maliciousInputs = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "admin'--",
        "1 UNION SELECT * FROM users",
      ];

      for (const input of maliciousInputs) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({ email: input, password: input });

        // 500エラー（DBエラーの漏洩）ではなく400/401を返すべき
        expect(response.status).not.toBe(500);
        expect([400, 401, 422]).toContain(response.status);
      }
    });
  });

  describe('ブルートフォース対策', () => {
    it('連続した失敗ログインでレート制限が発動する', async () => {
      const loginAttempts = Array.from({ length: 10 }, () =>
        request(app).post('/api/auth/login').send({
          email: 'test@example.com',
          password: 'wrong-password',
        })
      );

      const responses = await Promise.all(loginAttempts);
      const statusCodes = responses.map(r => r.status);

      // 多くの試行後に429（Too Many Requests）が返るはず
      expect(statusCodes).toContain(429);
    });
  });

  describe('認可の検証', () => {
    it('他のユーザーのリソースにアクセスできない（BOLA対策）', async () => {
      // ユーザー1のトークンでユーザー2のデータにアクセス試行
      const user1Token = 'token-for-user-1';
      const user2Id = 'user-2-id';

      const response = await request(app)
        .get(`/api/users/${user2Id}/private-data`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect([403, 404]).toContain(response.status);
    });

    it('機密フィールドがレスポンスに含まれない', async () => {
      const response = await request(app)
        .get('/api/users/user-1')
        .set('Authorization', 'Bearer valid-token');

      if (response.status === 200) {
        expect(response.body).not.toHaveProperty('password');
        expect(response.body).not.toHaveProperty('passwordHash');
        expect(response.body).not.toHaveProperty('salt');
        expect(response.body).not.toHaveProperty('secretKey');
      }
    });
  });

  describe('入力バリデーション', () => {
    it('異常に大きなペイロードで413を返す', async () => {
      const largePayload = { data: 'x'.repeat(1024 * 1024 * 11) }; // 11MB

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', 'Bearer admin-token')
        .send(largePayload);

      expect(response.status).toBe(413);
    });

    it('XSS文字列がサニタイズされる', async () => {
      const xssPayload = {
        email: 'xss@test.com',
        name: '<script>alert("xss")</script>',
        password: 'Password1',
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', 'Bearer admin-token')
        .send(xssPayload);

      if (response.status === 201) {
        expect(response.body.name).not.toContain('<script>');
      }
    });
  });

  describe('セキュリティヘッダー', () => {
    it('必要なセキュリティヘッダーが設定されている', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    it('機密情報がヘッダーに露出しない', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['x-powered-by']).toBeUndefined();
      expect(response.headers['server']).toBeUndefined();
    });
  });
});
```

### レート制限のテスト

```typescript
// tests/security/rateLimit.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '@/app';

describe('レート制限テスト', () => {
  const app = createApp();

  it('APIエンドポイントへの過剰なリクエストでレート制限が発動する', async () => {
    const responses: number[] = [];

    // 大量のリクエストを送信
    for (let i = 0; i < 110; i++) {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer test-token');
      responses.push(response.status);
    }

    // 429が含まれるはず
    expect(responses).toContain(429);

    // Retry-Afterヘッダーが含まれるはず
    const lastResponse = await request(app)
      .get('/api/users')
      .set('Authorization', 'Bearer test-token');

    if (lastResponse.status === 429) {
      expect(lastResponse.headers['retry-after']).toBeDefined();
    }
  });
});
```

---

## 14. テストカバレッジとレポート

### カバレッジの種類と目標値

テストカバレッジには複数の指標がある。

| 指標 | 説明 | 推奨目標値 |
|------|------|----------|
| Line Coverage | 実行された行の割合 | 80% 以上 |
| Branch Coverage | 条件分岐の網羅率 | 75% 以上 |
| Function Coverage | 呼び出された関数の割合 | 80% 以上 |
| Statement Coverage | 実行されたステートメントの割合 | 80% 以上 |

### Vitest カバレッジの設定

```typescript
// vitest.config.ts (カバレッジ詳細設定)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'cobertura'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/fixtures/**',
        '**/mocks/**',
        '**/__tests__/**',
        'tests/**',
      ],
      thresholds: {
        global: {
          lines: 80,
          functions: 80,
          branches: 75,
          statements: 80,
        },
        // ファイル別の閾値
        'src/services/**': {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90,
        },
        'src/middleware/**': {
          lines: 95,
          functions: 95,
          branches: 90,
          statements: 95,
        },
      },
      // v8 プロバイダー固有設定
      all: true,          // テストのないファイルもカバレッジに含める
      clean: true,        // 前回の結果を削除
      cleanOnRerun: true,
    },
  },
});
```

### カバレッジレポートの解釈

```bash
# テストカバレッジの実行
npm run test:coverage

# 出力例:
# Coverage report from v8
# --------------------------------|---------|----------|---------|---------|
# File                            | % Stmts | % Branch | % Funcs | % Lines |
# --------------------------------|---------|----------|---------|---------|
# All files                       |   87.45 |    82.13 |   88.24 |   87.45 |
#  src/services                   |   92.31 |    88.46 |   94.12 |   92.31 |
#   userService.ts                |   94.12 |    90.00 |   95.65 |   94.12 |
#   authService.ts                |   90.00 |    86.67 |   92.31 |   90.00 |
#  src/middleware                 |   96.43 |    91.67 |   97.14 |   96.43 |
#   authMiddleware.ts             |   97.14 |    93.33 |   97.14 |   97.14 |
# --------------------------------|---------|----------|---------|---------|
```

### Jest/Vitest ベンチマークテスト

```typescript
// tests/benchmarks/apiPerformance.bench.ts
import { bench, describe } from 'vitest';
import { validateCreateUser } from '@/validators/userValidator';
import { hashPassword, comparePassword } from '@/utils/crypto';

describe('パフォーマンスベンチマーク', () => {
  bench('バリデーション処理', () => {
    validateCreateUser({
      email: 'bench@test.com',
      name: 'Bench User',
      password: 'BenchPass1',
    });
  });

  bench('パスワードハッシュ化', async () => {
    await hashPassword('BenchmarkPassword1');
  });

  bench('パスワード照合', async () => {
    await comparePassword('BenchmarkPassword1', '$2b$10$somehashedvalue');
  });
});
```

### テストレポートの集約と可視化

```typescript
// scripts/generateTestReport.ts
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

interface TestSummary {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  coverageLines: number;
  coverageBranches: number;
  coverageFunctions: number;
  duration: number;
}

function generateReport(): void {
  // Vitestの結果を読み込む
  const junitXml = readFileSync('test-results/junit.xml', 'utf-8');
  const coverageJson = readFileSync('coverage/coverage-summary.json', 'utf-8');
  const coverage = JSON.parse(coverageJson);

  const summary: TestSummary = {
    timestamp: new Date().toISOString(),
    totalTests: 0, // JUnit XMLから解析
    passed: 0,
    failed: 0,
    skipped: 0,
    coverageLines: coverage.total.lines.pct,
    coverageBranches: coverage.total.branches.pct,
    coverageFunctions: coverage.total.functions.pct,
    duration: 0,
  };

  writeFileSync('test-results/summary.json', JSON.stringify(summary, null, 2));

  console.log('テストレポートを生成しました: test-results/summary.json');
  console.log(`カバレッジ: Lines ${summary.coverageLines}% | Branches ${summary.coverageBranches}% | Functions ${summary.coverageFunctions}%`);
}

generateReport();
```

### レポート通知の自動化

```typescript
// scripts/notifyTestResults.ts
import { readFileSync } from 'fs';

interface SlackPayload {
  blocks: Array<{
    type: string;
    text?: { type: string; text: string };
    fields?: Array<{ type: string; text: string }>;
  }>;
}

async function sendSlackNotification(summary: any) {
  const color = summary.failed > 0 ? '#ff0000' : '#36a64f';
  const status = summary.failed > 0 ? 'FAILED' : 'PASSED';

  const payload: SlackPayload = {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `テスト結果: ${status}` },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*合計テスト数:* ${summary.totalTests}` },
          { type: 'mrkdwn', text: `*成功:* ${summary.passed}` },
          { type: 'mrkdwn', text: `*失敗:* ${summary.failed}` },
          { type: 'mrkdwn', text: `*カバレッジ:* ${summary.coverageLines}%` },
        ],
      },
    ],
  };

  await fetch(process.env.SLACK_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

const summary = JSON.parse(readFileSync('test-results/summary.json', 'utf-8'));
sendSlackNotification(summary);
```

---

## まとめ

本記事では、APIテストの全体像を体系的に解説した。

**ユニットテスト**では、Vitestを使って個々のサービス・バリデーター・ミドルウェアを高速かつ正確に検証する方法を示した。モックを活用して外部依存を排除し、ビジネスロジックに集中したテストを実現できる。

**統合テスト**では、Supertestを使ってAPIエンドポイント全体をHTTPレベルで検証する方法を解説した。実際のデータベースと連携したリアルなテストシナリオを構築できる。

**MSW**によるモッキングは、フロントエンドとAPIクライアントのテストにおいて、実際のネットワークレイヤーに近い形でのモックを実現する。テストの信頼性が大幅に向上する。

**Hoppscotch / Thunder Client**のようなAPIクライアントツールは、開発時の手動テストとCI/CDでの自動テストを統合できる。コレクション管理によってチーム全体でAPIの動作検証を共有できる。

**OpenAPI仕様**からのテスト自動生成は、ドキュメントと実装の乖離を防ぐ強力なアプローチである。型安全なテストコードの生成も可能になる。

**Contract Testing（Pact）**はマイクロサービス間の依存関係を安全に管理する手法として、複数チームが協調開発する場面で特に有効である。

**k6・Artillery**による負荷テストは、スケーラビリティとパフォーマンスの問題を本番リリース前に発見するために不可欠である。ウォームアップ・通常負荷・ピーク負荷・ストレステストの段階的な実施が重要である。

**TestContainers**は本番環境に近い形でのテスト実行を可能にし、モックでは検出できない実際のデータベース固有の挙動を捉えられる。

**CI/CDパイプライン**への統合によって、テストを開発フローの必須ステップとして組み込み、品質ゲートとして機能させることができる。

**セキュリティテスト**はAPIの脆弱性を早期発見するために、開発サイクルに組み込むべき重要な工程である。OWASP API Security Top 10を網羅的に検証することで、セキュリティインシデントのリスクを大幅に低減できる。

**テストカバレッジ**は品質の代理指標として有効だが、80%超のカバレッジを目標としつつも、カバレッジの数値よりもテストの質（境界値・異常系・セキュリティ）を重視することが重要である。

これらのツールと手法を組み合わせ、プロジェクトの規模・フェーズに合わせて適切なテスト戦略を選択することで、APIの品質と信頼性を継続的に高めることができる。

---

## 参考リソース

- [Vitest公式ドキュメント](https://vitest.dev)
- [Supertest GitHub](https://github.com/ladjs/supertest)
- [MSW公式ドキュメント](https://mswjs.io)
- [Hoppscotch](https://hoppscotch.io)
- [k6公式ドキュメント](https://k6.io/docs)
- [Artillery公式ドキュメント](https://www.artillery.io/docs)
- [Pact Foundation](https://pact.io)
- [TestContainers for Node.js](https://node.testcontainers.org)
- [OWASP API Security Top 10](https://owasp.org/API-Security)
- [OpenAPI Specification](https://swagger.io/specification)

---

開発ツールの一元管理には、**[DevToolBox](https://usedevtools.com)** が役立つ。API テストのワークフロー管理、チーム間のコレクション共有、テスト結果のダッシュボード表示など、開発者の生産性向上に直結する機能を提供している。ぜひ一度試してみてほしい。

---
title: 'Vitest高度テスティング: モック・スナップショット・並列実行の完全ガイド'
description: 'Vitestの高度な機能を活用したテスト実装の完全ガイド。モック、スパイ、スナップショットテスト、並列実行、カバレッジ計測など実践的なテスティング手法を詳しく解説します。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。'
pubDate: 2025-05-25
updatedDate: 2025-05-25
tags: ['Vitest', 'Testing', 'TypeScript', 'Unit Testing', 'モック']
---

Vitestは、Viteベースの高速なテストフレームワークです。この記事では、モッキング、スナップショットテスト、並列実行など、Vitestの高度な機能を活用した実践的なテスティング手法を解説します。

## Vitestのセットアップ

### インストールと基本設定

```bash
# Vitestとテストユーティリティのインストール
npm install -D vitest @vitest/ui @vitest/coverage-v8
npm install -D @testing-library/react @testing-library/jest-dom
npm install -D happy-dom # またはjsdom
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
      ],
    },
    // 並列実行の設定
    threads: true,
    maxThreads: 4,
    minThreads: 2,
    // タイムアウト設定
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
```

```typescript
// src/test/setup.ts
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import matchers from '@testing-library/jest-dom/matchers';

// カスタムマッチャーの追加
expect.extend(matchers);

// 各テスト後にクリーンアップ
afterEach(() => {
  cleanup();
});
```

## モッキングの完全ガイド

### 1. 関数のモック

```typescript
// src/utils/api.ts
export async function fetchUser(id: string) {
  const response = await fetch(`https://api.example.com/users/${id}`);
  return response.json();
}

export async function updateUser(id: string, data: Record<string, any>) {
  const response = await fetch(`https://api.example.com/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}
```

```typescript
// src/utils/api.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchUser, updateUser } from './api';

// グローバルなfetchをモック
global.fetch = vi.fn();

describe('API Functions', () => {
  beforeEach(() => {
    // 各テスト前にモックをリセット
    vi.clearAllMocks();
  });

  afterEach(() => {
    // すべてのモックを復元
    vi.restoreAllMocks();
  });

  describe('fetchUser', () => {
    it('should fetch user data', async () => {
      const mockUser = { id: '1', name: 'Alice', email: 'alice@example.com' };

      // fetchのモック実装
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => mockUser,
      });

      const user = await fetchUser('1');

      expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/users/1');
      expect(user).toEqual(mockUser);
    });

    it('should handle fetch errors', async () => {
      // エラーをスロー
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchUser('1')).rejects.toThrow('Network error');
    });
  });

  describe('updateUser', () => {
    it('should update user data', async () => {
      const updateData = { name: 'Alice Updated' };
      const mockResponse = { id: '1', ...updateData };

      (global.fetch as any).mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const result = await updateUser('1', updateData);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/users/1',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        }
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
```

### 2. モジュール全体のモック

```typescript
// src/services/logger.ts
export class Logger {
  info(message: string) {
    console.log(`[INFO] ${message}`);
  }

  error(message: string, error?: Error) {
    console.error(`[ERROR] ${message}`, error);
  }
}

export const logger = new Logger();
```

```typescript
// src/services/userService.ts
import { logger } from './logger';
import { fetchUser } from '../utils/api';

export async function getUserById(id: string) {
  logger.info(`Fetching user ${id}`);
  try {
    const user = await fetchUser(id);
    logger.info(`User ${id} fetched successfully`);
    return user;
  } catch (error) {
    logger.error(`Failed to fetch user ${id}`, error as Error);
    throw error;
  }
}
```

```typescript
// src/services/userService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserById } from './userService';

// モジュール全体をモック
vi.mock('./logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../utils/api', () => ({
  fetchUser: vi.fn(),
}));

import { logger } from './logger';
import { fetchUser } from '../utils/api';

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserById', () => {
    it('should log and fetch user', async () => {
      const mockUser = { id: '1', name: 'Alice' };
      (fetchUser as any).mockResolvedValueOnce(mockUser);

      const user = await getUserById('1');

      expect(logger.info).toHaveBeenCalledWith('Fetching user 1');
      expect(fetchUser).toHaveBeenCalledWith('1');
      expect(logger.info).toHaveBeenCalledWith('User 1 fetched successfully');
      expect(user).toEqual(mockUser);
    });

    it('should log errors', async () => {
      const error = new Error('Network error');
      (fetchUser as any).mockRejectedValueOnce(error);

      await expect(getUserById('1')).rejects.toThrow('Network error');

      expect(logger.error).toHaveBeenCalledWith('Failed to fetch user 1', error);
    });
  });
});
```

### 3. スパイ（Spy）の活用

```typescript
// src/utils/storage.ts
export class Storage {
  private data: Map<string, any> = new Map();

  set(key: string, value: any): void {
    this.data.set(key, value);
    this.notify('set', key, value);
  }

  get(key: string): any {
    const value = this.data.get(key);
    this.notify('get', key, value);
    return value;
  }

  delete(key: string): boolean {
    const result = this.data.delete(key);
    this.notify('delete', key);
    return result;
  }

  private notify(action: string, key: string, value?: any): void {
    console.log(`Storage ${action}: ${key}`, value);
  }
}
```

```typescript
// src/utils/storage.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Storage } from './storage';

describe('Storage', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = new Storage();
  });

  it('should notify on set', () => {
    // privateメソッドnotifyにスパイを設定
    const notifySpy = vi.spyOn(storage as any, 'notify');

    storage.set('key1', 'value1');

    expect(notifySpy).toHaveBeenCalledWith('set', 'key1', 'value1');
    expect(notifySpy).toHaveBeenCalledTimes(1);
  });

  it('should notify on get', () => {
    const notifySpy = vi.spyOn(storage as any, 'notify');

    storage.set('key1', 'value1');
    notifySpy.mockClear(); // setでの呼び出しをクリア

    const value = storage.get('key1');

    expect(value).toBe('value1');
    expect(notifySpy).toHaveBeenCalledWith('get', 'key1', 'value1');
  });

  it('should notify on delete', () => {
    const notifySpy = vi.spyOn(storage as any, 'notify');

    storage.set('key1', 'value1');
    notifySpy.mockClear();

    const result = storage.delete('key1');

    expect(result).toBe(true);
    expect(notifySpy).toHaveBeenCalledWith('delete', 'key1');
  });
});
```

## スナップショットテスト

### 1. オブジェクトのスナップショット

```typescript
// src/utils/formatter.ts
export function formatUser(user: {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    displayName: `${user.name} <${user.email}>`,
    createdAt: user.createdAt.toISOString(),
    age: Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
  };
}
```

```typescript
// src/utils/formatter.test.ts
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { formatUser } from './formatter';

describe('formatUser', () => {
  beforeAll(() => {
    // 現在時刻を固定してテストの再現性を確保
    vi.setSystemTime(new Date('2025-05-25T00:00:00Z'));
  });

  it('should format user correctly', () => {
    const user = {
      id: '1',
      name: 'Alice',
      email: 'alice@example.com',
      createdAt: new Date('2025-01-01T00:00:00Z'),
    };

    const formatted = formatUser(user);

    // スナップショットと比較
    expect(formatted).toMatchSnapshot();
  });

  it('should handle inline snapshots', () => {
    const user = {
      id: '2',
      name: 'Bob',
      email: 'bob@example.com',
      createdAt: new Date('2025-05-01T00:00:00Z'),
    };

    const formatted = formatUser(user);

    // インラインスナップショット
    expect(formatted).toMatchInlineSnapshot(`
      {
        "age": 144,
        "createdAt": "2025-01-01T00:00:00.000Z",
        "displayName": "Alice <alice@example.com>",
        "email": "alice@example.com",
        "id": "1",
        "name": "Alice",
      }
    `);
  });
});
```

### 2. Reactコンポーネントのスナップショット

```typescript
// src/components/UserCard.tsx
interface UserCardProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'user';
  };
  onEdit?: () => void;
  onDelete?: () => void;
}

export function UserCard({ user, onEdit, onDelete }: UserCardProps) {
  return (
    <div className="user-card">
      <div className="user-card__header">
        <h3>{user.name}</h3>
        <span className={`badge badge--${user.role}`}>{user.role}</span>
      </div>
      <div className="user-card__body">
        <p>{user.email}</p>
      </div>
      <div className="user-card__actions">
        {onEdit && <button onClick={onEdit}>Edit</button>}
        {onDelete && <button onClick={onDelete}>Delete</button>}
      </div>
    </div>
  );
}
```

```typescript
// src/components/UserCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { UserCard } from './UserCard';

describe('UserCard', () => {
  it('should match snapshot for admin user', () => {
    const user = {
      id: '1',
      name: 'Alice Admin',
      email: 'alice@example.com',
      role: 'admin' as const,
    };

    const { container } = render(<UserCard user={user} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot with actions', () => {
    const user = {
      id: '2',
      name: 'Bob User',
      email: 'bob@example.com',
      role: 'user' as const,
    };

    const { container } = render(
      <UserCard user={user} onEdit={() => {}} onDelete={() => {}} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
```

## 並列実行とパフォーマンス最適化

### 1. テストの並列実行制御

```typescript
// src/tests/performance.test.ts
import { describe, it, expect } from 'vitest';

// 並列実行（デフォルト）
describe('Parallel Tests', () => {
  it('test 1', async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(true).toBe(true);
  });

  it('test 2', async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(true).toBe(true);
  });
});

// 順次実行
describe.sequential('Sequential Tests', () => {
  it('test 1 must run first', async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(true).toBe(true);
  });

  it('test 2 runs after test 1', async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(true).toBe(true);
  });
});

// 並行実行（同時実行数の制御）
describe.concurrent('Concurrent Tests', () => {
  it('concurrent test 1', async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(true).toBe(true);
  });

  it('concurrent test 2', async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(true).toBe(true);
  });
});
```

### 2. テストのシャーディング

```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:shard1": "vitest --shard=1/3",
    "test:shard2": "vitest --shard=2/3",
    "test:shard3": "vitest --shard=3/3",
    "test:ci": "npm run test:shard1 & npm run test:shard2 & npm run test:shard3"
  }
}
```

## カバレッジとレポート

### カバレッジの設定と実行

```bash
# カバレッジ付きでテスト実行
npm run test -- --coverage

# カバレッジしきい値を設定
npm run test -- --coverage --coverage.lines=80 --coverage.functions=80
```

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
        'src/main.tsx',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
```

### UIモードでのテスト実行

```bash
# UIモードで実行
npm run test -- --ui

# watchモードとUIモードを併用
npm run test -- --ui --watch
```

## まとめ

Vitestの高度な機能を活用することで、効率的で保守性の高いテストコードを書くことができます。主なポイントは以下の通りです。

- **モッキング**: 外部依存を完全にコントロールし、テストの独立性を確保
- **スナップショット**: UIコンポーネントやデータ構造の変更を簡単に検知
- **並列実行**: テストの実行速度を大幅に改善
- **カバレッジ**: コード品質を定量的に評価

これらの手法を組み合わせることで、信頼性の高いアプリケーション開発が実現できます。

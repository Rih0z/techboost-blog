---
title: "Effect-TS入門ガイド - 型安全な副作用管理で実現する堅牢なTypeScriptアプリケーション"
description: "Effect-TSを使った型安全な副作用管理の実践ガイド。エラーハンドリング、依存性注入、並行処理、リトライ戦略など、実戦で使える高度なパターンを豊富なコード例とともに解説。"
pubDate: "2025-02-06"
tags: ["typescript", "effect", "functional-programming", "error-handling", "backend"]
---

Effect-TSは、TypeScriptで**型安全に副作用を扱う**ための強力なライブラリです。従来の`Promise`や`async/await`では実現できなかった、エラー型の追跡、依存性注入、リソース管理を提供します。

この記事では、Effect-TSの基本から実践的なパターンまで、実際のアプリケーション開発で役立つ知識を提供します。

## Effect-TSとは何か

Effect-TSは、関数型プログラミングの概念をTypeScriptに持ち込み、**副作用を一級市民として扱う**ライブラリです。

### 従来の問題点

```typescript
// 従来のPromise: エラー型が失われる
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch user'); // どんなエラーかわからない
  }
  return response.json();
}

// 呼び出し側
try {
  const user = await fetchUser('123');
} catch (error) {
  // errorは unknown、型安全性ゼロ
  console.error(error);
}
```

### Effect-TSでの解決

```typescript
import { Effect, pipe } from 'effect';

// エラー型が明示される
type FetchError =
  | { _tag: 'NetworkError'; cause: Error }
  | { _tag: 'NotFoundError'; id: string }
  | { _tag: 'ParseError'; body: string };

function fetchUser(id: string): Effect.Effect<User, FetchError, never> {
  return pipe(
    Effect.tryPromise({
      try: () => fetch(`/api/users/${id}`),
      catch: (error) => ({ _tag: 'NetworkError' as const, cause: error as Error }),
    }),
    Effect.flatMap(response =>
      response.ok
        ? Effect.tryPromise({
            try: () => response.json(),
            catch: (error) => ({ _tag: 'ParseError' as const, body: String(error) }),
          })
        : response.status === 404
          ? Effect.fail({ _tag: 'NotFoundError' as const, id })
          : Effect.fail({ _tag: 'NetworkError' as const, cause: new Error(`HTTP ${response.status}`) })
    ),
  );
}
```

## まとめ

Effect-TSは以下の点で優れています。

**型安全性**: エラー型を含めて完全に型で保証
**合成可能性**: 小さなEffectを組み合わせて複雑なロジックを構築
**依存性注入**: 型安全なDI標準装備
**リソース管理**: 自動的なクリーンアップ保証
**並行処理**: 並列実行、リトライ、タイムアウトを簡単に扱える

特に、エラーハンドリングが重要なバックエンドアプリケーションや、複雑なビジネスロジックを持つアプリケーションに最適です。

## 参考リンク

- [Effect公式サイト](https://effect.website/)
- [Effect GitHub](https://github.com/Effect-TS/effect)
- [Effect Documentation](https://effect.website/docs/introduction)

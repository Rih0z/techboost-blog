---
title: "パスキー認証（WebAuthn）完全実装ガイド2026"
description: "パスキー（Passkey）とWebAuthn APIを使った次世代認証の実装方法を解説。パスワードレス認証のセットアップからReact/Node.jsでの実装例、FIDO2標準準拠のセキュリティ設計まで、実践的なコード付きで紹介します。"
pubDate: "2026-03-09"
tags: ["security", "WebAuthn", "TypeScript", "エンジニア"]
heroImage: "../../assets/blog-placeholder-3.jpg"
---

## はじめに

パスワード認証は長年にわたりWebアプリケーションの標準であったが、フィッシング攻撃、パスワードリスト攻撃、ブルートフォース攻撃といった脅威に対して根本的な脆弱性を抱えている。2026年現在、Apple、Google、Microsoftの主要プラットフォームがパスキー（Passkey）を標準サポートし、パスワードレス認証は実用段階に入った。

本記事では、FIDO2/WebAuthn標準に基づくパスキー認証の仕組みを解説し、React + Node.js（Express）で実際に動作する認証システムを構築する方法を紹介する。

### 対象読者

- パスワードレス認証をプロダクションに導入したいエンジニア
- WebAuthn APIの内部動作を理解したい開発者
- FIDO2標準に準拠したセキュリティ設計を学びたい方

### 前提知識

- TypeScript/JavaScriptの基本的な知識
- Node.js（Express）でのAPI開発経験
- React（Hooks）の基本的な理解

## パスキーとWebAuthnの基本概念

### パスキーとは何か

パスキー（Passkey）は、FIDO Allianceが推進するパスワードレス認証技術である。公開鍵暗号方式を基盤とし、ユーザーのデバイスに保存された秘密鍵と、サーバーに保存された公開鍵のペアで認証を行う。

従来のパスワード認証との根本的な違いは、**秘密情報（秘密鍵）がサーバーに送信されない**点にある。これにより、サーバー側のデータ漏洩が発生しても認証情報が流出しない。

### WebAuthn APIの役割

WebAuthn（Web Authentication）は、W3Cが策定したWeb標準APIであり、ブラウザとAuthenticator（認証器）間の通信プロトコルを定義する。パスキーの技術基盤となっている。

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   ブラウザ    │────▶│ WebAuthn API │────▶│  Authenticator    │
│（Relying     │◀────│              │◀────│（TouchID/FaceID/  │
│  Party Client│     │              │     │ Windows Hello/    │
│              │     │              │     │ セキュリティキー） │
└──────────────┘     └──────────────┘     └──────────────────┘
       │                                          │
       │         ┌──────────────┐                 │
       └────────▶│ RPサーバー    │◀────────────────┘
                 │（認証サーバー）│   Challenge/Response
                 └──────────────┘
```

### FIDO2標準の構成要素

FIDO2は以下の2つの仕様で構成される。

| 構成要素 | 役割 | 管轄 |
|---------|------|------|
| **WebAuthn** | ブラウザとサーバー間の認証プロトコル | W3C |
| **CTAP2** | ブラウザとAuthenticator間の通信プロトコル | FIDO Alliance |

### パスワード認証との比較

| 項目 | パスワード認証 | パスキー認証 |
|------|--------------|-------------|
| フィッシング耐性 | なし（偽サイトで入力可能） | あり（Origin紐づけ） |
| リプレイ攻撃耐性 | なし | あり（Challenge方式） |
| サーバー漏洩リスク | ハッシュ化されていても危険 | 公開鍵のみ（安全） |
| ユーザー体験 | パスワード記憶が必要 | 生体認証で完了 |
| クロスデバイス | クラウド同期が必要 | プラットフォーム同期 |

## 開発環境のセットアップ

### プロジェクト構成

```
passkey-auth/
├── server/
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   │   └── auth.ts
│   │   ├── services/
│   │   │   └── webauthn.ts
│   │   └── models/
│   │       └── user.ts
│   ├── package.json
│   └── tsconfig.json
├── client/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── hooks/
│   │   │   └── useWebAuthn.ts
│   │   └── components/
│   │       ├── RegisterForm.tsx
│   │       └── LoginForm.tsx
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

### サーバー側の初期化

```bash
mkdir -p passkey-auth/server && cd passkey-auth/server
npm init -y
npm install express cors express-session @simplewebauthn/server
npm install -D typescript @types/express @types/cors @types/express-session ts-node
```

`tsconfig.json`を作成する。

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### クライアント側の初期化

```bash
cd ../
npx create-react-app client --template typescript
cd client
npm install @simplewebauthn/browser
```

## SimpleWebAuthnライブラリの概要

SimpleWebAuthnは、WebAuthn APIの複雑なバイナリ処理を抽象化し、TypeScript型付きのインターフェースを提供するライブラリである。サーバー側（`@simplewebauthn/server`）とクライアント側（`@simplewebauthn/browser`）の2パッケージで構成される。

### 主要な関数

```typescript
// サーバー側（@simplewebauthn/server）
import {
  generateRegistrationOptions,   // 登録オプション生成
  verifyRegistrationResponse,    // 登録レスポンス検証
  generateAuthenticationOptions, // 認証オプション生成
  verifyAuthenticationResponse,  // 認証レスポンス検証
} from '@simplewebauthn/server';

// クライアント側（@simplewebauthn/browser）
import {
  startRegistration,     // 登録フロー開始
  startAuthentication,   // 認証フロー開始
  browserSupportsWebAuthn, // WebAuthnサポート確認
} from '@simplewebauthn/browser';
```

## サーバー側の実装

### ユーザーモデルの定義

まず、ユーザーと認証情報を管理するモデルを定義する。本番環境ではデータベースを使用するが、ここではインメモリストアで説明する。

```typescript
// server/src/models/user.ts
import type {
  AuthenticatorTransportFuture,
  CredentialDeviceType,
} from '@simplewebauthn/types';

export interface StoredCredential {
  credentialID: string;
  credentialPublicKey: Uint8Array;
  counter: number;
  credentialDeviceType: CredentialDeviceType;
  credentialBackedUp: boolean;
  transports?: AuthenticatorTransportFuture[];
}

export interface User {
  id: string;
  username: string;
  credentials: StoredCredential[];
  currentChallenge?: string;
}

// インメモリストア（本番ではDB使用）
const users = new Map<string, User>();

export function findUserByUsername(username: string): User | undefined {
  for (const user of users.values()) {
    if (user.username === username) {
      return user;
    }
  }
  return undefined;
}

export function findUserById(id: string): User | undefined {
  return users.get(id);
}

export function createUser(username: string): User {
  const id = crypto.randomUUID();
  const user: User = {
    id,
    username,
    credentials: [],
  };
  users.set(id, user);
  return user;
}

export function addCredentialToUser(
  userId: string,
  credential: StoredCredential
): void {
  const user = users.get(userId);
  if (!user) {
    throw new Error('User not found');
  }
  user.credentials.push(credential);
}

export function updateUserChallenge(
  userId: string,
  challenge: string
): void {
  const user = users.get(userId);
  if (user) {
    user.currentChallenge = challenge;
  }
}
```

### WebAuthnサービスの実装

WebAuthnの中核ロジックを担うサービス層を実装する。

```typescript
// server/src/services/webauthn.ts
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  GenerateRegistrationOptionsOpts,
  GenerateAuthenticationOptionsOpts,
  VerifyRegistrationResponseOpts,
  VerifyAuthenticationResponseOpts,
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';
import type { User, StoredCredential } from '../models/user';

// Relying Party（自サイト）の設定
const rpName = 'My Passkey App';
const rpID = 'localhost';
const origin = 'http://localhost:3000';

export async function createRegistrationOptions(
  user: User
): Promise<ReturnType<typeof generateRegistrationOptions>> {
  const opts: GenerateRegistrationOptionsOpts = {
    rpName,
    rpID,
    userID: new TextEncoder().encode(user.id),
    userName: user.username,
    userDisplayName: user.username,
    // タイムアウト: 5分
    timeout: 300000,
    // 既存のクレデンシャルを除外（二重登録防止）
    excludeCredentials: user.credentials.map((cred) => ({
      id: cred.credentialID,
      type: 'public-key',
      transports: cred.transports,
    })),
    // 認証器の要件
    authenticatorSelection: {
      // プラットフォーム認証器を優先（TouchID等）
      authenticatorAttachment: 'platform',
      // Discoverable Credential必須（パスキー対応）
      residentKey: 'required',
      // ユーザー検証必須
      userVerification: 'required',
    },
    // サポートするアルゴリズム
    supportedAlgorithmIDs: [-7, -257], // ES256, RS256
  };

  return generateRegistrationOptions(opts);
}

export async function verifyRegistration(
  user: User,
  response: RegistrationResponseJSON,
  expectedChallenge: string
): Promise<VerifiedRegistrationResponse> {
  const opts: VerifyRegistrationResponseOpts = {
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
  };

  return verifyRegistrationResponse(opts);
}

export async function createAuthenticationOptions(
  user?: User
): Promise<ReturnType<typeof generateAuthenticationOptions>> {
  const opts: GenerateAuthenticationOptionsOpts = {
    timeout: 300000,
    rpID,
    userVerification: 'required',
    // ユーザーが特定されている場合、許可するクレデンシャルを指定
    ...(user && {
      allowCredentials: user.credentials.map((cred) => ({
        id: cred.credentialID,
        type: 'public-key' as const,
        transports: cred.transports,
      })),
    }),
  };

  return generateAuthenticationOptions(opts);
}

export async function verifyAuthentication(
  credential: StoredCredential,
  response: AuthenticationResponseJSON,
  expectedChallenge: string
): Promise<VerifiedAuthenticationResponse> {
  const opts: VerifyAuthenticationResponseOpts = {
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: credential.credentialID,
      publicKey: credential.credentialPublicKey,
      counter: credential.counter,
      transports: credential.transports,
    },
    requireUserVerification: true,
  };

  return verifyAuthenticationResponse(opts);
}
```

### 認証ルーターの実装

Express Router で登録・認証のエンドポイントを構築する。

```typescript
// server/src/routes/auth.ts
import { Router, Request, Response } from 'express';
import {
  findUserByUsername,
  createUser,
  addCredentialToUser,
  updateUserChallenge,
} from '../models/user';
import {
  createRegistrationOptions,
  verifyRegistration,
  createAuthenticationOptions,
  verifyAuthentication,
} from '../services/webauthn';

const router = Router();

// ==========================================
// 登録フロー
// ==========================================

// Step 1: 登録オプションの取得
router.post(
  '/register/options',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { username } = req.body;

      if (!username || typeof username !== 'string') {
        res.status(400).json({ error: 'usernameは必須です' });
        return;
      }

      // 既存ユーザーチェック
      let user = findUserByUsername(username);
      if (!user) {
        user = createUser(username);
      }

      // 登録オプション生成
      const options = await createRegistrationOptions(user);

      // Challengeをセッションに保存
      updateUserChallenge(user.id, options.challenge);

      // セッションにユーザーIDを保存
      (req.session as any).userId = user.id;

      res.json(options);
    } catch (error) {
      console.error('登録オプション生成エラー:', error);
      res.status(500).json({ error: '内部エラーが発生しました' });
    }
  }
);

// Step 2: 登録レスポンスの検証
router.post(
  '/register/verify',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        res.status(401).json({ error: 'セッションが無効です' });
        return;
      }

      const user = findUserByUsername(userId) ?? (() => {
        const { findUserById } = require('../models/user');
        return findUserById(userId);
      })();

      if (!user || !user.currentChallenge) {
        res.status(400).json({ error: 'チャレンジが見つかりません' });
        return;
      }

      const verification = await verifyRegistration(
        user,
        req.body,
        user.currentChallenge
      );

      if (verification.verified && verification.registrationInfo) {
        const {
          credential,
          credentialDeviceType,
          credentialBackedUp,
        } = verification.registrationInfo;

        // クレデンシャルをユーザーに紐づけて保存
        addCredentialToUser(user.id, {
          credentialID: credential.id,
          credentialPublicKey: credential.publicKey,
          counter: credential.counter,
          credentialDeviceType,
          credentialBackedUp,
          transports: req.body.response?.transports,
        });

        // Challengeをクリア
        updateUserChallenge(user.id, '');

        res.json({ verified: true });
      } else {
        res.status(400).json({ verified: false, error: '検証に失敗しました' });
      }
    } catch (error) {
      console.error('登録検証エラー:', error);
      res.status(500).json({ error: '内部エラーが発生しました' });
    }
  }
);

// ==========================================
// 認証フロー
// ==========================================

// Step 1: 認証オプションの取得
router.post(
  '/authenticate/options',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { username } = req.body;
      const user = username ? findUserByUsername(username) : undefined;

      // Discoverable Credentialsの場合はユーザー指定不要
      const options = await createAuthenticationOptions(user);

      // Challengeをセッションに保存
      if (user) {
        updateUserChallenge(user.id, options.challenge);
        (req.session as any).userId = user.id;
      }
      (req.session as any).challenge = options.challenge;

      res.json(options);
    } catch (error) {
      console.error('認証オプション生成エラー:', error);
      res.status(500).json({ error: '内部エラーが発生しました' });
    }
  }
);

// Step 2: 認証レスポンスの検証
router.post(
  '/authenticate/verify',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const expectedChallenge = (req.session as any).challenge;
      if (!expectedChallenge) {
        res.status(401).json({ error: 'チャレンジが見つかりません' });
        return;
      }

      const { id: credentialID } = req.body;

      // クレデンシャルIDからユーザーを特定
      const { findUserById } = require('../models/user');
      let matchedUser = null;
      let matchedCredential = null;

      // 全ユーザーからクレデンシャルを検索
      // 本番ではDBクエリで最適化する
      const userId = (req.session as any).userId;
      if (userId) {
        const user = findUserById(userId);
        if (user) {
          matchedCredential = user.credentials.find(
            (c: any) => c.credentialID === credentialID
          );
          if (matchedCredential) {
            matchedUser = user;
          }
        }
      }

      if (!matchedUser || !matchedCredential) {
        res.status(400).json({ error: 'クレデンシャルが見つかりません' });
        return;
      }

      const verification = await verifyAuthentication(
        matchedCredential,
        req.body,
        expectedChallenge
      );

      if (verification.verified) {
        // カウンターを更新（リプレイ攻撃防止）
        matchedCredential.counter =
          verification.authenticationInfo.newCounter;

        // セッション確立
        (req.session as any).authenticated = true;
        (req.session as any).username = matchedUser.username;

        res.json({
          verified: true,
          username: matchedUser.username,
        });
      } else {
        res.status(400).json({ verified: false });
      }
    } catch (error) {
      console.error('認証検証エラー:', error);
      res.status(500).json({ error: '内部エラーが発生しました' });
    }
  }
);

export default router;
```

### Expressサーバーのエントリーポイント

```typescript
// server/src/index.ts
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import authRouter from './routes/auth';

const app = express();
const PORT = 8080;

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24時間
  },
}));

app.use('/api/auth', authRouter);

// ヘルスチェック
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

## クライアント側の実装

### WebAuthnカスタムフックの作成

React Hooksで WebAuthn の登録・認証ロジックをカプセル化する。

```typescript
// client/src/hooks/useWebAuthn.ts
import { useState, useCallback } from 'react';
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser';

const API_BASE = 'http://localhost:8080/api/auth';

interface WebAuthnState {
  isSupported: boolean;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  username: string | null;
}

export function useWebAuthn() {
  const [state, setState] = useState<WebAuthnState>({
    isSupported: browserSupportsWebAuthn(),
    isLoading: false,
    error: null,
    isAuthenticated: false,
    username: null,
  });

  const setLoading = (isLoading: boolean) =>
    setState((prev) => ({ ...prev, isLoading, error: null }));

  const setError = (error: string) =>
    setState((prev) => ({ ...prev, isLoading: false, error }));

  // パスキー登録
  const register = useCallback(async (username: string) => {
    setLoading(true);

    try {
      // Step 1: サーバーから登録オプションを取得
      const optionsRes = await fetch(`${API_BASE}/register/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username }),
      });

      if (!optionsRes.ok) {
        throw new Error('登録オプションの取得に失敗しました');
      }

      const options = await optionsRes.json();

      // Step 2: ブラウザのWebAuthn APIを呼び出し
      // ここでユーザーに生体認証のプロンプトが表示される
      const registrationResponse = await startRegistration({
        optionsJSON: options,
      });

      // Step 3: 登録レスポンスをサーバーに送信して検証
      const verifyRes = await fetch(`${API_BASE}/register/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(registrationResponse),
      });

      const verifyResult = await verifyRes.json();

      if (verifyResult.verified) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isAuthenticated: true,
          username,
        }));
        return true;
      } else {
        setError('パスキーの登録に失敗しました');
        return false;
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '不明なエラーが発生しました';
      setError(message);
      return false;
    }
  }, []);

  // パスキー認証
  const authenticate = useCallback(async (username?: string) => {
    setLoading(true);

    try {
      // Step 1: サーバーから認証オプションを取得
      const optionsRes = await fetch(`${API_BASE}/authenticate/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username }),
      });

      if (!optionsRes.ok) {
        throw new Error('認証オプションの取得に失敗しました');
      }

      const options = await optionsRes.json();

      // Step 2: ブラウザのWebAuthn APIを呼び出し
      const authResponse = await startAuthentication({
        optionsJSON: options,
      });

      // Step 3: 認証レスポンスをサーバーに送信して検証
      const verifyRes = await fetch(`${API_BASE}/authenticate/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(authResponse),
      });

      const verifyResult = await verifyRes.json();

      if (verifyResult.verified) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isAuthenticated: true,
          username: verifyResult.username,
        }));
        return true;
      } else {
        setError('認証に失敗しました');
        return false;
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '不明なエラーが発生しました';
      setError(message);
      return false;
    }
  }, []);

  // ログアウト
  const logout = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isAuthenticated: false,
      username: null,
    }));
  }, []);

  return {
    ...state,
    register,
    authenticate,
    logout,
  };
}
```

### 登録コンポーネント

```tsx
// client/src/components/RegisterForm.tsx
import React, { useState } from 'react';
import { useWebAuthn } from '../hooks/useWebAuthn';

export function RegisterForm() {
  const [username, setUsername] = useState('');
  const { register, isLoading, error, isSupported } = useWebAuthn();

  if (!isSupported) {
    return (
      <div className="error-banner">
        このブラウザはパスキー認証に対応していません。
        Chrome、Safari、Edgeの最新版をご利用ください。
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    const success = await register(username.trim());
    if (success) {
      alert('パスキーの登録が完了しました');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>パスキー登録</h2>
      <div>
        <label htmlFor="username">ユーザー名</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="ユーザー名を入力"
          disabled={isLoading}
          autoComplete="username webauthn"
        />
      </div>
      <button type="submit" disabled={isLoading || !username.trim()}>
        {isLoading ? '処理中...' : 'パスキーを登録'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
```

### 認証コンポーネント

```tsx
// client/src/components/LoginForm.tsx
import React, { useState } from 'react';
import { useWebAuthn } from '../hooks/useWebAuthn';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const { authenticate, isLoading, error, isAuthenticated, username: authedUser } = useWebAuthn();

  if (isAuthenticated) {
    return (
      <div>
        <p>ログイン済み: {authedUser}</p>
      </div>
    );
  }

  const handleUsernameLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await authenticate(username.trim() || undefined);
  };

  // パスキー自動検出（Discoverable Credentials）
  const handlePasskeyLogin = async () => {
    await authenticate();
  };

  return (
    <div>
      <h2>ログイン</h2>

      {/* Discoverable Credentials: ユーザー名入力不要 */}
      <button onClick={handlePasskeyLogin} disabled={isLoading}>
        {isLoading ? '処理中...' : 'パスキーでログイン'}
      </button>

      <hr />

      {/* ユーザー名指定ログイン */}
      <form onSubmit={handleUsernameLogin}>
        <div>
          <label htmlFor="login-username">ユーザー名（任意）</label>
          <input
            id="login-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ユーザー名を入力"
            disabled={isLoading}
            autoComplete="username webauthn"
          />
        </div>
        <button type="submit" disabled={isLoading}>
          ユーザー名を指定してログイン
        </button>
      </form>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

## 認証フローの詳細解説

### 登録フロー（Registration Ceremony）

パスキー登録は以下の4ステップで行われる。

1. **サーバーがChallengeを生成**: ランダムなバイト列を生成し、セッションに保存する
2. **ブラウザがAuthenticatorに登録を要求**: `navigator.credentials.create()` を呼び出す
3. **Authenticatorが鍵ペアを生成**: 秘密鍵をデバイスに保存、公開鍵を含むAttestationObjectを返す
4. **サーバーがレスポンスを検証**: Challenge一致、Origin一致、公開鍵の妥当性を確認し、クレデンシャルを保存する

```typescript
// 登録フローの内部動作（SimpleWebAuthnが抽象化）
// navigator.credentials.create() に渡されるオプション
const publicKeyCredentialCreationOptions = {
  challenge: Uint8Array.from(serverChallenge),
  rp: {
    name: 'My Passkey App',
    id: 'localhost',
  },
  user: {
    id: Uint8Array.from(userId),
    name: 'user@example.com',
    displayName: 'User',
  },
  pubKeyCredParams: [
    { alg: -7, type: 'public-key' },   // ES256 (ECDSA P-256)
    { alg: -257, type: 'public-key' },  // RS256 (RSASSA-PKCS1-v1_5)
  ],
  authenticatorSelection: {
    authenticatorAttachment: 'platform',
    residentKey: 'required',
    userVerification: 'required',
  },
  timeout: 300000,
  attestation: 'none',
};
```

### 認証フロー（Authentication Ceremony）

1. **サーバーがChallengeを生成**: 登録時と同様にランダムなバイト列を生成する
2. **ブラウザがAuthenticatorに認証を要求**: `navigator.credentials.get()` を呼び出す
3. **Authenticatorが署名を生成**: 保存された秘密鍵でChallengeに署名する
4. **サーバーが署名を検証**: 保存された公開鍵で署名を検証し、カウンターを更新する

### カウンター（署名回数）の重要性

WebAuthnの認証レスポンスには `signCount`（署名回数）が含まれる。サーバーは前回の値より大きいことを検証する。もし前回以下の値が送られてきた場合、クレデンシャルが複製された可能性がある。

```typescript
// カウンター検証のロジック（SimpleWebAuthnが内部で実行）
function verifyCounter(
  storedCounter: number,
  responseCounter: number
): boolean {
  if (responseCounter > 0 || storedCounter > 0) {
    if (responseCounter <= storedCounter) {
      // 警告: クレデンシャルが複製された可能性
      console.warn(
        `Counter mismatch: stored=${storedCounter}, response=${responseCounter}`
      );
      return false;
    }
  }
  return true;
}
```

## クレデンシャル管理の実装

### 複数パスキーの管理

ユーザーは複数のデバイスにパスキーを登録できる。管理UIでクレデンシャルの一覧表示と削除を実装する。

```typescript
// server/src/routes/credentials.ts
import { Router, Request, Response } from 'express';
import { findUserById } from '../models/user';

const router = Router();

// クレデンシャル一覧の取得
router.get('/', (req: Request, res: Response): void => {
  const userId = (req.session as any).userId;
  if (!userId) {
    res.status(401).json({ error: '認証が必要です' });
    return;
  }

  const user = findUserById(userId);
  if (!user) {
    res.status(404).json({ error: 'ユーザーが見つかりません' });
    return;
  }

  // 秘密情報を除外してレスポンス
  const credentials = user.credentials.map((cred) => ({
    id: cred.credentialID,
    deviceType: cred.credentialDeviceType,
    backedUp: cred.credentialBackedUp,
    transports: cred.transports,
    // 最終使用日やデバイス名は別途管理が必要
  }));

  res.json({ credentials });
});

// クレデンシャルの削除
router.delete('/:credentialId', (req: Request, res: Response): void => {
  const userId = (req.session as any).userId;
  if (!userId) {
    res.status(401).json({ error: '認証が必要です' });
    return;
  }

  const user = findUserById(userId);
  if (!user) {
    res.status(404).json({ error: 'ユーザーが見つかりません' });
    return;
  }

  const index = user.credentials.findIndex(
    (c) => c.credentialID === req.params.credentialId
  );

  if (index === -1) {
    res.status(404).json({ error: 'クレデンシャルが見つかりません' });
    return;
  }

  // 最後の1つは削除不可（ロックアウト防止）
  if (user.credentials.length <= 1) {
    res.status(400).json({
      error: '最後のクレデンシャルは削除できません',
    });
    return;
  }

  user.credentials.splice(index, 1);
  res.json({ success: true });
});

export default router;
```

## セキュリティベストプラクティス

### 1. Origin検証の厳格化

本番環境では、Originを厳密に設定する。ワイルドカードやサブドメインの許可は最小限にする。

```typescript
// 本番向けOrigin設定
const ALLOWED_ORIGINS = [
  'https://app.example.com',
  'https://www.example.com',
];

const rpID = 'example.com';

// 検証時にOriginリストを渡す
const verification = await verifyRegistrationResponse({
  response,
  expectedChallenge,
  expectedOrigin: ALLOWED_ORIGINS,
  expectedRPID: rpID,
  requireUserVerification: true,
});
```

### 2. Challengeの管理

Challengeは必ず一度きりの使用とし、有効期限を設ける。

```typescript
// Redis等を使ったChallenge管理の例
import { createClient } from 'redis';

const redis = createClient();

async function storeChallenge(
  userId: string,
  challenge: string,
  ttlSeconds: number = 300
): Promise<void> {
  await redis.setEx(
    `webauthn:challenge:${userId}`,
    ttlSeconds,
    challenge
  );
}

async function consumeChallenge(
  userId: string
): Promise<string | null> {
  const key = `webauthn:challenge:${userId}`;
  const challenge = await redis.get(key);
  if (challenge) {
    await redis.del(key); // 一度使ったら即削除
  }
  return challenge;
}
```

### 3. Attestation（認証器の真正性検証）

高セキュリティが求められる場合、Attestationを検証して認証器の種類を制限できる。

```typescript
// Attestation検証の設定
const options = await generateRegistrationOptions({
  // ...
  attestationType: 'direct', // Attestation証明書を要求
});

// 検証時にMetadata Serviceを使って認証器を確認
import { MetadataService } from '@simplewebauthn/server';

const metadataService = new MetadataService({
  mdsServers: [
    { url: 'https://mds3.fidoalliance.org' },
  ],
});

await metadataService.initialize();
```

### 4. レート制限の実装

認証エンドポイントには必ずレート制限を設ける。

```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 10, // 最大10回
  message: {
    error: '認証試行回数の上限に達しました。しばらくお待ちください。',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 認証エンドポイントに適用
app.use('/api/auth/authenticate', authLimiter);
app.use('/api/auth/register', authLimiter);
```

### 5. HTTPS必須化

WebAuthn APIはセキュアコンテキスト（HTTPS）でのみ動作する。localhost以外では必ずHTTPSを使用する。

```typescript
// Helmet.jsによるセキュリティヘッダー設定
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

## データベーススキーマ設計

本番環境では、クレデンシャルをリレーショナルデータベースに保存する。以下はPostgreSQLのスキーマ例である。

```sql
-- ユーザーテーブル
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- クレデンシャルテーブル
CREATE TABLE webauthn_credentials (
  id VARCHAR(512) PRIMARY KEY,     -- Base64URLエンコードされたクレデンシャルID
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_key BYTEA NOT NULL,       -- 公開鍵（バイナリ）
  counter BIGINT NOT NULL DEFAULT 0,
  device_type VARCHAR(32) NOT NULL, -- 'singleDevice' or 'multiDevice'
  backed_up BOOLEAN NOT NULL DEFAULT FALSE,
  transports TEXT[],                -- ['internal', 'hybrid', 'usb', etc.]
  device_name VARCHAR(255),         -- ユーザーが設定するデバイス名
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_credentials_user_id ON webauthn_credentials(user_id);
CREATE INDEX idx_credentials_last_used ON webauthn_credentials(last_used_at);
```

```typescript
// Prismaを使ったスキーマ定義の例
// prisma/schema.prisma
/*
model User {
  id          String   @id @default(uuid())
  username    String   @unique
  displayName String?  @map("display_name")
  credentials WebAuthnCredential[]
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("users")
}

model WebAuthnCredential {
  id              String   @id
  userId          String   @map("user_id")
  publicKey       Bytes    @map("public_key")
  counter         BigInt   @default(0)
  deviceType      String   @map("device_type")
  backedUp        Boolean  @default(false) @map("backed_up")
  transports      String[]
  deviceName      String?  @map("device_name")
  lastUsedAt      DateTime? @map("last_used_at")
  createdAt       DateTime @default(now()) @map("created_at")
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("webauthn_credentials")
}
*/
```

## 条件付きUI（Conditional UI）の実装

Conditional UIは、ブラウザのオートコンプリートUIにパスキーの選択肢を表示する機能である。ユーザー名の入力フィールドにフォーカスしただけでパスキーの候補が表示される。

```typescript
// Conditional UIの実装
import {
  startAuthentication,
  browserSupportsWebAuthnAutofill,
} from '@simplewebauthn/browser';

async function initConditionalUI() {
  // Conditional UIがサポートされているか確認
  const supported = await browserSupportsWebAuthnAutofill();
  if (!supported) {
    console.log('Conditional UI is not supported');
    return;
  }

  try {
    // サーバーから認証オプションを取得
    const optionsRes = await fetch('/api/auth/authenticate/options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({}),
    });
    const options = await optionsRes.json();

    // useBrowserAutofill: true でConditional UIを有効化
    const authResponse = await startAuthentication({
      optionsJSON: options,
      useBrowserAutofill: true,
    });

    // 認証レスポンスをサーバーに送信
    const verifyRes = await fetch('/api/auth/authenticate/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(authResponse),
    });

    const result = await verifyRes.json();
    if (result.verified) {
      window.location.href = '/dashboard';
    }
  } catch (err) {
    console.error('Conditional UI error:', err);
  }
}

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', initConditionalUI);
```

HTMLの input 要素には `autocomplete="username webauthn"` を指定する。

```html
<input
  type="text"
  name="username"
  autocomplete="username webauthn"
  placeholder="ユーザー名を入力"
/>
```

## パスワードとの併用（ハイブリッド認証）

既存のパスワード認証からパスキーへ段階的に移行する場合、ハイブリッド認証が必要になる。

```typescript
// server/src/routes/hybrid-auth.ts
import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { findUserByUsername } from '../models/user';
import { createAuthenticationOptions, verifyAuthentication } from '../services/webauthn';

const router = Router();

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password, webauthnResponse } = req.body;

  const user = findUserByUsername(username);
  if (!user) {
    res.status(401).json({ error: '認証に失敗しました' });
    return;
  }

  // パスキー認証が提供された場合
  if (webauthnResponse) {
    try {
      const challenge = (req.session as any).challenge;
      const credential = user.credentials.find(
        (c) => c.credentialID === webauthnResponse.id
      );

      if (credential && challenge) {
        const verification = await verifyAuthentication(
          credential,
          webauthnResponse,
          challenge
        );

        if (verification.verified) {
          credential.counter = verification.authenticationInfo.newCounter;
          (req.session as any).authenticated = true;
          res.json({ success: true, method: 'passkey' });
          return;
        }
      }
    } catch {
      // パスキー認証失敗時はパスワード認証にフォールバック
    }
  }

  // パスワード認証
  if (password) {
    // 注: 実際のユーザーモデルにはpasswordHashフィールドが必要
    const passwordHash = (user as any).passwordHash;
    if (passwordHash && await bcrypt.compare(password, passwordHash)) {
      (req.session as any).authenticated = true;

      // パスキー未登録の場合、登録を促す
      if (user.credentials.length === 0) {
        res.json({
          success: true,
          method: 'password',
          suggestPasskey: true,
        });
        return;
      }

      res.json({ success: true, method: 'password' });
      return;
    }
  }

  res.status(401).json({ error: '認証に失敗しました' });
});

export default router;
```

## テストの実装

### サーバー側のユニットテスト

```typescript
// server/src/__tests__/webauthn.test.ts
import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
} from '@simplewebauthn/server';
import { createRegistrationOptions, createAuthenticationOptions } from '../services/webauthn';
import { createUser } from '../models/user';

describe('WebAuthn Service', () => {
  describe('createRegistrationOptions', () => {
    it('正しいRPIDとユーザー情報で登録オプションを生成する', async () => {
      const user = createUser('testuser');
      const options = await createRegistrationOptions(user);

      expect(options.rp.name).toBe('My Passkey App');
      expect(options.rp.id).toBe('localhost');
      expect(options.user.name).toBe('testuser');
      expect(options.challenge).toBeTruthy();
      expect(options.pubKeyCredParams).toContainEqual(
        expect.objectContaining({ alg: -7 })
      );
    });

    it('既存のクレデンシャルを除外リストに含める', async () => {
      const user = createUser('testuser2');
      user.credentials.push({
        credentialID: 'existing-cred-id',
        credentialPublicKey: new Uint8Array(32),
        counter: 0,
        credentialDeviceType: 'singleDevice',
        credentialBackedUp: false,
      });

      const options = await createRegistrationOptions(user);
      expect(options.excludeCredentials).toHaveLength(1);
    });
  });

  describe('createAuthenticationOptions', () => {
    it('ユーザー指定なしでDiscoverableCredentials用オプションを生成する', async () => {
      const options = await createAuthenticationOptions();

      expect(options.challenge).toBeTruthy();
      expect(options.rpId).toBe('localhost');
      expect(options.userVerification).toBe('required');
    });
  });
});
```

## まとめ

本記事では、パスキー（Passkey）認証をReact + Node.jsで実装する方法を解説した。以下に要点をまとめる。

### 導入のポイント

- **SimpleWebAuthnライブラリ**を使うことで、WebAuthn APIの複雑なバイナリ処理を抽象化できる
- **Discoverable Credentials**を有効にすることで、ユーザー名入力不要のパスキーログインが実現する
- **Conditional UI**により、既存のログインフォームにパスキーの選択肢をシームレスに統合できる
- **ハイブリッド認証**で既存のパスワード認証から段階的に移行できる

### セキュリティ上の注意点

- Challengeは必ず一度きりの使用とし、有効期限を設ける
- カウンター検証を実装してリプレイ攻撃を防止する
- 本番環境ではOriginとRPIDを厳密に設定する
- レート制限を必ず実装する
- クレデンシャルの最後の1つは削除不可とし、ロックアウトを防止する

### 今後の展望

2026年はパスキーのクロスデバイス同期がさらに普及し、iCloudキーチェーン、Googleパスワードマネージャー、Windows Helloの相互運用性が向上している。新規プロジェクトでは、パスワード認証を設けずパスキーのみで認証を完結させる設計も現実的な選択肢となっている。

パスキー認証の導入は、ユーザー体験の向上とセキュリティの強化を同時に実現する。本記事のコードを基盤として、自プロジェクトへの導入を検討してほしい。

## 参考資料

- [WebAuthn Guide (FIDO Alliance)](https://fidoalliance.org/fido2-2/fido2-web-authentication-webauthn/)
- [SimpleWebAuthn Documentation](https://simplewebauthn.dev/)
- [Passkeys.dev - Apple/Google/Microsoft](https://passkeys.dev/)
- [W3C Web Authentication Specification](https://www.w3.org/TR/webauthn-3/)
- [MDN Web Docs - Web Authentication API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API)
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)

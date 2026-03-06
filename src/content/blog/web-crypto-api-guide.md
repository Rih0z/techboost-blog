---
title: 'Web Crypto API完全ガイド2026 - 暗号化、署名、ハッシュ、鍵管理、実践パターン'
description: 'Web Crypto APIを徹底解説。AES暗号化、RSA署名、SHA-256ハッシュ、鍵管理、セキュアストレージ、HTTPS通信、パスワードハッシュ化を実例付きで紹介。JavaScript・セキュリティ・Web APIに関する実践情報。'
pubDate: '2026-02-05'
tags: ['JavaScript', 'セキュリティ', 'Web API', '暗号化']
---

Web Crypto APIは、ブラウザで暗号化処理を安全に実行できる標準APIです。本記事では、暗号化の基本から実践的な使い方まで解説します。

## 目次

1. Web Crypto APIとは
2. 基本概念
3. ハッシュ化
4. 対称鍵暗号（AES）
5. 非対称鍵暗号（RSA）
6. デジタル署名
7. 鍵管理
8. 実践パターン
9. セキュリティベストプラクティス

## Web Crypto APIとは

### 特徴と用途

```typescript
/**
 * Web Crypto API の特徴
 *
 * 1. ブラウザネイティブ
 *    - 追加ライブラリ不要
 *    - すべてのモダンブラウザでサポート
 *
 * 2. セキュア
 *    - 暗号化処理はネイティブコード
 *    - 鍵をメモリに安全に保持
 *
 * 3. 非同期API
 *    - Promise ベース
 *    - メインスレッドをブロックしない
 *
 * 4. 標準アルゴリズム
 *    - AES, RSA, ECDSA
 *    - SHA-256, SHA-384, SHA-512
 *    - HMAC, PBKDF2
 */

// Web Crypto API へのアクセス
const crypto = window.crypto
const subtle = crypto.subtle
```

### サポート状況

```typescript
// ブラウザサポートチェック
function checkCryptoSupport(): boolean {
  return (
    typeof window !== 'undefined' &&
    'crypto' in window &&
    'subtle' in window.crypto
  )
}

if (!checkCryptoSupport()) {
  throw new Error('Web Crypto API not supported')
}
```

## 基本概念

### CryptoKey

```typescript
// CryptoKey の型
interface CryptoKeyDetails {
  type: 'secret' | 'private' | 'public'
  extractable: boolean
  algorithm: Algorithm
  usages: KeyUsage[]
}

// KeyUsage の種類
type KeyUsage =
  | 'encrypt'      // 暗号化
  | 'decrypt'      // 復号
  | 'sign'         // 署名
  | 'verify'       // 検証
  | 'deriveKey'    // 鍵導出
  | 'deriveBits'   // ビット導出
  | 'wrapKey'      // 鍵ラップ
  | 'unwrapKey'    // 鍵アンラップ
```

### データ型変換

```typescript
// ユーティリティ関数
class CryptoUtils {
  // 文字列 → ArrayBuffer
  static stringToBuffer(str: string): ArrayBuffer {
    return new TextEncoder().encode(str)
  }

  // ArrayBuffer → 文字列
  static bufferToString(buffer: ArrayBuffer): string {
    return new TextDecoder().decode(buffer)
  }

  // ArrayBuffer → Base64
  static bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  // Base64 → ArrayBuffer
  static base64ToBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }

  // ArrayBuffer → Hex
  static bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  // Hex → ArrayBuffer
  static hexToBuffer(hex: string): ArrayBuffer {
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
    }
    return bytes.buffer
  }
}
```

## ハッシュ化

### SHA-256ハッシュ

```typescript
// SHA-256 ハッシュ生成
async function sha256(data: string): Promise<string> {
  const buffer = CryptoUtils.stringToBuffer(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return CryptoUtils.bufferToHex(hashBuffer)
}

// 使用例
const hash = await sha256('Hello, World!')
console.log(hash) // b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9

// ファイルのハッシュ計算
async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return CryptoUtils.bufferToHex(hashBuffer)
}
```

### その他のハッシュアルゴリズム

```typescript
// 汎用ハッシュ関数
async function hash(
  data: string,
  algorithm: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'
): Promise<string> {
  const buffer = CryptoUtils.stringToBuffer(data)
  const hashBuffer = await crypto.subtle.digest(algorithm, buffer)
  return CryptoUtils.bufferToHex(hashBuffer)
}

// 各アルゴリズムの使用例
const sha1 = await hash('data', 'SHA-1')       // 160 bits
const sha256 = await hash('data', 'SHA-256')   // 256 bits
const sha384 = await hash('data', 'SHA-384')   // 384 bits
const sha512 = await hash('data', 'SHA-512')   // 512 bits
```

### HMAC（メッセージ認証コード）

```typescript
// HMAC 鍵生成
async function generateHMACKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: 'HMAC',
      hash: 'SHA-256',
    },
    true,  // extractable
    ['sign', 'verify']
  )
}

// HMAC 署名生成
async function createHMAC(
  key: CryptoKey,
  data: string
): Promise<string> {
  const buffer = CryptoUtils.stringToBuffer(data)
  const signature = await crypto.subtle.sign('HMAC', key, buffer)
  return CryptoUtils.bufferToBase64(signature)
}

// HMAC 検証
async function verifyHMAC(
  key: CryptoKey,
  data: string,
  signature: string
): Promise<boolean> {
  const dataBuffer = CryptoUtils.stringToBuffer(data)
  const signatureBuffer = CryptoUtils.base64ToBuffer(signature)

  return await crypto.subtle.verify(
    'HMAC',
    key,
    signatureBuffer,
    dataBuffer
  )
}
```

## 対称鍵暗号（AES）

### AES-GCM暗号化

```typescript
// AES-GCM 鍵生成
async function generateAESKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256, // 128, 192, または 256
    },
    true,  // extractable
    ['encrypt', 'decrypt']
  )
}

// 暗号化
async function encryptAES(
  key: CryptoKey,
  plaintext: string
): Promise<{ ciphertext: string; iv: string }> {
  // 初期化ベクトル（IV）生成
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const buffer = CryptoUtils.stringToBuffer(plaintext)

  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    buffer
  )

  return {
    ciphertext: CryptoUtils.bufferToBase64(encrypted),
    iv: CryptoUtils.bufferToBase64(iv),
  }
}

// 復号
async function decryptAES(
  key: CryptoKey,
  ciphertext: string,
  iv: string
): Promise<string> {
  const ciphertextBuffer = CryptoUtils.base64ToBuffer(ciphertext)
  const ivBuffer = CryptoUtils.base64ToBuffer(iv)

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBuffer,
    },
    key,
    ciphertextBuffer
  )

  return CryptoUtils.bufferToString(decrypted)
}

// 使用例
const key = await generateAESKey()
const { ciphertext, iv } = await encryptAES(key, 'Secret message')
const decrypted = await decryptAES(key, ciphertext, iv)
console.log(decrypted) // 'Secret message'
```

### パスワードベースの暗号化（PBKDF2）

```typescript
// パスワードから鍵を導出
async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  // パスワードを CryptoKey に変換
  const passwordBuffer = CryptoUtils.stringToBuffer(password)
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  )

  // PBKDF2 で鍵導出
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000, // 推奨値
      hash: 'SHA-256',
    },
    passwordKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,  // extractable = false（セキュリティ向上）
    ['encrypt', 'decrypt']
  )
}

// パスワードで暗号化
async function encryptWithPassword(
  password: string,
  plaintext: string
): Promise<{ ciphertext: string; iv: string; salt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await deriveKeyFromPassword(password, salt)

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const buffer = CryptoUtils.stringToBuffer(plaintext)

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    buffer
  )

  return {
    ciphertext: CryptoUtils.bufferToBase64(encrypted),
    iv: CryptoUtils.bufferToBase64(iv),
    salt: CryptoUtils.bufferToBase64(salt),
  }
}

// パスワードで復号
async function decryptWithPassword(
  password: string,
  ciphertext: string,
  iv: string,
  salt: string
): Promise<string> {
  const saltBuffer = CryptoUtils.base64ToBuffer(salt)
  const key = await deriveKeyFromPassword(password, new Uint8Array(saltBuffer))

  const ciphertextBuffer = CryptoUtils.base64ToBuffer(ciphertext)
  const ivBuffer = CryptoUtils.base64ToBuffer(iv)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    key,
    ciphertextBuffer
  )

  return CryptoUtils.bufferToString(decrypted)
}
```

## 非対称鍵暗号（RSA）

### RSA鍵ペア生成

```typescript
// RSA 鍵ペア生成
async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048, // または 4096
      publicExponent: new Uint8Array([1, 0, 1]), // 65537
      hash: 'SHA-256',
    },
    true,  // extractable
    ['encrypt', 'decrypt']
  )
}

// RSA 暗号化（公開鍵で暗号化）
async function encryptRSA(
  publicKey: CryptoKey,
  plaintext: string
): Promise<string> {
  const buffer = CryptoUtils.stringToBuffer(plaintext)

  const encrypted = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    buffer
  )

  return CryptoUtils.bufferToBase64(encrypted)
}

// RSA 復号（秘密鍵で復号）
async function decryptRSA(
  privateKey: CryptoKey,
  ciphertext: string
): Promise<string> {
  const buffer = CryptoUtils.base64ToBuffer(ciphertext)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    buffer
  )

  return CryptoUtils.bufferToString(decrypted)
}

// 使用例
const keyPair = await generateRSAKeyPair()
const encrypted = await encryptRSA(keyPair.publicKey, 'Secret message')
const decrypted = await decryptRSA(keyPair.privateKey, encrypted)
console.log(decrypted) // 'Secret message'
```

### 楕円曲線暗号（ECDH）

```typescript
// ECDH 鍵ペア生成
async function generateECDHKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256', // または 'P-384', 'P-521'
    },
    true,
    ['deriveKey', 'deriveBits']
  )
}

// 共有秘密鍵の導出
async function deriveSharedSecret(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<CryptoKey> {
  return await crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: publicKey,
    },
    privateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  )
}

// 使用例（Diffie-Hellman 鍵交換）
const aliceKeyPair = await generateECDHKeyPair()
const bobKeyPair = await generateECDHKeyPair()

// Alice と Bob がお互いの公開鍵から同じ共有秘密を導出
const aliceSharedSecret = await deriveSharedSecret(
  aliceKeyPair.privateKey,
  bobKeyPair.publicKey
)
const bobSharedSecret = await deriveSharedSecret(
  bobKeyPair.privateKey,
  aliceKeyPair.publicKey
)

// 同じ共有秘密を使って暗号化通信
```

## デジタル署名

### RSA署名

```typescript
// RSA 署名用鍵ペア生成
async function generateRSASignKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    {
      name: 'RSA-PSS',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  )
}

// 署名生成
async function signRSA(
  privateKey: CryptoKey,
  data: string
): Promise<string> {
  const buffer = CryptoUtils.stringToBuffer(data)

  const signature = await crypto.subtle.sign(
    {
      name: 'RSA-PSS',
      saltLength: 32,
    },
    privateKey,
    buffer
  )

  return CryptoUtils.bufferToBase64(signature)
}

// 署名検証
async function verifyRSA(
  publicKey: CryptoKey,
  data: string,
  signature: string
): Promise<boolean> {
  const dataBuffer = CryptoUtils.stringToBuffer(data)
  const signatureBuffer = CryptoUtils.base64ToBuffer(signature)

  return await crypto.subtle.verify(
    {
      name: 'RSA-PSS',
      saltLength: 32,
    },
    publicKey,
    signatureBuffer,
    dataBuffer
  )
}
```

### ECDSA署名

```typescript
// ECDSA 署名用鍵ペア生成
async function generateECDSAKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign', 'verify']
  )
}

// 署名生成
async function signECDSA(
  privateKey: CryptoKey,
  data: string
): Promise<string> {
  const buffer = CryptoUtils.stringToBuffer(data)

  const signature = await crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: 'SHA-256',
    },
    privateKey,
    buffer
  )

  return CryptoUtils.bufferToBase64(signature)
}

// 署名検証
async function verifyECDSA(
  publicKey: CryptoKey,
  data: string,
  signature: string
): Promise<boolean> {
  const dataBuffer = CryptoUtils.stringToBuffer(data)
  const signatureBuffer = CryptoUtils.base64ToBuffer(signature)

  return await crypto.subtle.verify(
    {
      name: 'ECDSA',
      hash: 'SHA-256',
    },
    publicKey,
    signatureBuffer,
    dataBuffer
  )
}
```

## 鍵管理

### 鍵のエクスポート・インポート

```typescript
// 鍵をエクスポート（JSON形式）
async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey(
    key.type === 'secret' ? 'raw' : 'jwk',
    key
  )

  if (exported instanceof ArrayBuffer) {
    return CryptoUtils.bufferToBase64(exported)
  } else {
    return JSON.stringify(exported)
  }
}

// 鍵をインポート
async function importAESKey(keyData: string): Promise<CryptoKey> {
  const buffer = CryptoUtils.base64ToBuffer(keyData)

  return await crypto.subtle.importKey(
    'raw',
    buffer,
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt']
  )
}

async function importRSAKey(
  jwk: JsonWebKey,
  isPublic: boolean
): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    isPublic ? ['encrypt'] : ['decrypt']
  )
}
```

### セキュアストレージ

```typescript
// IndexedDB で鍵を保存
class KeyStore {
  private dbName = 'crypto-keys'
  private storeName = 'keys'
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = () => {
        const db = request.result
        db.createObjectStore(this.storeName)
      }
    })
  }

  async saveKey(name: string, key: CryptoKey): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const exported = await exportKey(key)

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.put(exported, name)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async loadKey(
    name: string,
    algorithm: string
  ): Promise<CryptoKey | null> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(name)

      request.onerror = () => reject(request.error)
      request.onsuccess = async () => {
        if (!request.result) {
          resolve(null)
          return
        }

        const key = await importAESKey(request.result)
        resolve(key)
      }
    })
  }
}
```

## 実践パターン

### セキュアなローカルストレージ

```typescript
// 暗号化されたストレージ
class SecureStorage {
  private key: CryptoKey | null = null

  async init(password: string): Promise<void> {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    this.key = await deriveKeyFromPassword(password, salt)

    // salt を保存（平文で OK）
    localStorage.setItem('salt', CryptoUtils.bufferToBase64(salt))
  }

  async set(key: string, value: string): Promise<void> {
    if (!this.key) throw new Error('Not initialized')

    const { ciphertext, iv } = await encryptAES(this.key, value)

    localStorage.setItem(
      key,
      JSON.stringify({ ciphertext, iv })
    )
  }

  async get(key: string): Promise<string | null> {
    if (!this.key) throw new Error('Not initialized')

    const data = localStorage.getItem(key)
    if (!data) return null

    const { ciphertext, iv } = JSON.parse(data)
    return await decryptAES(this.key, ciphertext, iv)
  }
}

// 使用例
const storage = new SecureStorage()
await storage.init('user-password')
await storage.set('secret', 'My secret data')
const secret = await storage.get('secret')
```

### ファイル暗号化

```typescript
// ファイル暗号化
async function encryptFile(
  file: File,
  password: string
): Promise<Blob> {
  // パスワードから鍵を導出
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await deriveKeyFromPassword(password, salt)

  // ファイルを読み込み
  const fileBuffer = await file.arrayBuffer()

  // 暗号化
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    fileBuffer
  )

  // salt + iv + ciphertext を結合
  const result = new Uint8Array(
    salt.length + iv.length + encrypted.byteLength
  )
  result.set(salt, 0)
  result.set(iv, salt.length)
  result.set(new Uint8Array(encrypted), salt.length + iv.length)

  return new Blob([result])
}

// ファイル復号
async function decryptFile(
  encryptedBlob: Blob,
  password: string
): Promise<Blob> {
  const buffer = await encryptedBlob.arrayBuffer()
  const data = new Uint8Array(buffer)

  // salt, iv, ciphertext を分離
  const salt = data.slice(0, 16)
  const iv = data.slice(16, 28)
  const ciphertext = data.slice(28)

  // 鍵を導出
  const key = await deriveKeyFromPassword(password, salt)

  // 復号
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )

  return new Blob([decrypted])
}
```

## セキュリティベストプラクティス

### 安全な実装ガイドライン

```typescript
/**
 * セキュリティベストプラクティス
 *
 * 1. ランダム値生成
 *    ✅ crypto.getRandomValues() を使用
 *    ❌ Math.random() は使用しない
 *
 * 2. 鍵管理
 *    ✅ extractable=false で鍵をエクスポート不可に
 *    ✅ IndexedDB や SessionStorage で保存
 *    ❌ LocalStorage に平文で保存しない
 *
 * 3. アルゴリズム選択
 *    ✅ AES-256-GCM（対称鍵）
 *    ✅ RSA-2048 以上（非対称鍵）
 *    ✅ SHA-256 以上（ハッシュ）
 *    ❌ 古いアルゴリズム（MD5, SHA-1）
 *
 * 4. パスワードハッシュ
 *    ✅ PBKDF2 100,000回以上
 *    ✅ ランダムな salt 使用
 *    ❌ 単純な SHA-256 ハッシュ
 *
 * 5. HTTPS 必須
 *    ✅ 本番環境は必ず HTTPS
 *    ❌ HTTP では Web Crypto API 制限あり
 */

// 安全な実装例
class CryptoService {
  // ✅ 安全なランダム値生成
  generateRandomBytes(length: number): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length))
  }

  // ✅ 安全な鍵生成（extractable=false）
  async generateSecureKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,  // extractable=false
      ['encrypt', 'decrypt']
    )
  }

  // ✅ 安全なパスワードハッシュ
  async hashPassword(password: string): Promise<{
    hash: string
    salt: string
  }> {
    const salt = this.generateRandomBytes(16)

    const passwordBuffer = CryptoUtils.stringToBuffer(password)
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits']
    )

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      passwordKey,
      256
    )

    return {
      hash: CryptoUtils.bufferToBase64(hashBuffer),
      salt: CryptoUtils.bufferToBase64(salt),
    }
  }
}
```

## まとめ

Web Crypto APIは、ブラウザで暗号化処理を安全に実行できる強力なツールです。

**主要ポイント**:

1. **ネイティブAPI**: ライブラリ不要、全ブラウザ対応
2. **多様なアルゴリズム**: AES, RSA, ECDSA, SHA-256
3. **非同期処理**: Promise ベースで使いやすい
4. **セキュア**: ネイティブコードで高速・安全
5. **標準準拠**: W3C標準仕様

**2026年のベストプラクティス**:

- AES-256-GCM で対称鍵暗号化
- RSA-2048 以上で非対称鍵暗号化
- PBKDF2 100,000回以上でパスワードハッシュ
- extractable=false で鍵を保護
- HTTPS 環境で使用

Web Crypto APIを活用して、セキュアなWebアプリケーションを構築しましょう。

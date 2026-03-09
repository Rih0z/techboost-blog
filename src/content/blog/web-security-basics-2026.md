---
title: 'Webセキュリティ入門 — エンジニアが知るべき10の脅威と対策'
description: 'XSS、CSRF、SQLインジェクション等のWeb攻撃手法と防御策を実例付きで解説。HTTPS、CORS、CSPの実装方法も網羅した2026年版セキュリティガイド。セキュリティヘッダー設定やペネトレーションテストの実践手順も紹介します。セキュリティヘッダーの設定例やペネトレーションテストの手順も紹介します。'
pubDate: '2026-02-05'
tags: ['Web開発', 'セキュリティ', 'プログラミング']
heroImage: '../../assets/thumbnails/web-security-basics-2026.jpg'
---

Webアプリケーションのセキュリティは、**開発者の必須スキル**です。2026年現在、サイバー攻撃の80%以上がWebアプリケーションを標的にしています。

この記事では、エンジニアが必ず知っておくべき**10の脅威とその対策**を、実際のコード例とともに解説します。明日から使える実践的な内容です。

## 目次
1. [XSS（クロスサイトスクリプティング）](#1-xssクロスサイトスクリプティング)
2. [CSRF（クロスサイトリクエストフォージェリ）](#2-csrfクロスサイトリクエストフォージェリ)
3. [SQLインジェクション](#3-sqlインジェクション)
4. [認証・セッション管理の脆弱性](#4-認証セッション管理の脆弱性)
5. [HTTPS化とセキュアな通信](#5-https化とセキュアな通信)
6. [CORS（オリジン間リソース共有）](#6-corsオリジン間リソース共有)
7. [CSP（コンテンツセキュリティポリシー）](#7-cspコンテンツセキュリティポリシー)
8. [安全でないデシリアライゼーション](#8-安全でないデシリアライゼーション)
9. [機密情報の露出](#9-機密情報の露出)
10. [セキュリティヘッダー](#10-セキュリティヘッダー)

## 1. XSS（クロスサイトスクリプティング）

### 脅威の概要

攻撃者が悪意あるJavaScriptを注入し、他のユーザーのブラウザで実行させる攻撃。Cookie盗難、セッションハイジャック、フィッシングに悪用されます。

### 攻撃例

```html
<!-- 脆弱なコード -->
<div>ようこそ、<?php echo $_GET['name']; ?>さん</div>
```

攻撃者が以下のURLにアクセスさせると:
```
https://example.com/?name=<script>alert(document.cookie)</script>
```

ユーザーのCookieが盗まれます。

### 対策1: エスケープ処理

```php
// PHP
<div>ようこそ、<?php echo htmlspecialchars($_GET['name'], ENT_QUOTES, 'UTF-8'); ?>さん</div>
```

```javascript
// JavaScript (React)
function Welcome({ name }) {
  // Reactは自動でエスケープ
  return <div>ようこそ、{name}さん</div>;
}

// 生HTMLを挿入する場合（危険、避ける）
<div dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />
```

```python
# Python (Flask)
from flask import render_template_string, escape

@app.route('/welcome')
def welcome():
    name = request.args.get('name', '')
    return render_template_string('<div>ようこそ、{{ name }}さん</div>', name=name)
    # Jinjaテンプレートは自動エスケープ
```

### 対策2: DOMPurifyでサニタイズ

```javascript
import DOMPurify from 'dompurify';

const dirtyHTML = '<img src=x onerror=alert(1)>';
const cleanHTML = DOMPurify.sanitize(dirtyHTML);
// 結果: '<img src="x">' （onerrorが除去される）
```

### XSSの3タイプ

1. **反射型XSS** — URLパラメータ経由（上記の例）
2. **格納型XSS** — DBに保存され、他ユーザーが閲覧時に発火
3. **DOM-based XSS** — JavaScriptの不適切な処理

```javascript
// 危険なコード
const url = new URL(location.href);
const message = url.searchParams.get('message');
document.getElementById('output').innerHTML = message; // XSS脆弱性

// 安全なコード
document.getElementById('output').textContent = message;
```

## 2. CSRF（クロスサイトリクエストフォージェリ）

### 脅威の概要

ユーザーが意図しない操作（送金、パスワード変更等）を強制的に実行させる攻撃。

### 攻撃例

```html
<!-- 攻撃者のサイト -->
<img src="https://bank.example.com/transfer?to=attacker&amount=10000" style="display:none">
```

ユーザーが銀行サイトにログイン中にこのページを開くと、意図せず送金されます。

### 対策1: CSRFトークン

```html
<!-- フォームにトークンを埋め込む -->
<form method="POST" action="/transfer">
  <input type="hidden" name="csrf_token" value="ランダムな文字列">
  <input name="to" placeholder="送金先">
  <input name="amount" placeholder="金額">
  <button type="submit">送金</button>
</form>
```

```python
# Flask
from flask_wtf.csrf import CSRFProtect

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
csrf = CSRFProtect(app)

@app.route('/transfer', methods=['POST'])
def transfer():
    # CSRFトークンが自動検証される
    # 不正なリクエストは400エラー
    pass
```

### 対策2: SameSite Cookie属性

```javascript
// Express.js
app.use(session({
  secret: 'your-secret',
  cookie: {
    sameSite: 'strict', // または 'lax'
    secure: true, // HTTPS必須
    httpOnly: true
  }
}));
```

- `strict`: 他サイトからのリクエストでCookie送信しない
- `lax`: GET等の安全なメソッドのみ許可
- `none`: 全て許可（非推奨）

### 対策3: カスタムヘッダー検証

```javascript
// Axios (React/Vue等)
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// サーバー側で検証
app.post('/api/transfer', (req, res) => {
  if (req.get('X-Requested-With') !== 'XMLHttpRequest') {
    return res.status(403).send('Forbidden');
  }
  // 処理続行
});
```

## 3. SQLインジェクション

### 脅威の概要

SQL文に悪意あるコードを注入し、DBの不正操作（データ漏洩、改ざん、削除）を行う攻撃。

### 攻撃例

```php
// 危険なコード
$username = $_POST['username'];
$password = $_POST['password'];
$query = "SELECT * FROM users WHERE username='$username' AND password='$password'";
$result = mysqli_query($conn, $query);
```

攻撃者が以下を入力:
```
username: admin' --
password: （任意）
```

実行されるSQL:
```sql
SELECT * FROM users WHERE username='admin' -- ' AND password='...'
-- 「--」以降はコメント扱いになり、パスワードチェックが無効化
```

### 対策1: プリペアドステートメント

```php
// PHP (PDO)
$stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? AND password = ?");
$stmt->execute([$username, $password]);
$user = $stmt->fetch();
```

```python
# Python (psycopg2 for PostgreSQL)
cursor.execute(
    "SELECT * FROM users WHERE username = %s AND password = %s",
    (username, password)
)
user = cursor.fetchone()
```

```javascript
// Node.js (mysql2)
connection.execute(
  'SELECT * FROM users WHERE username = ? AND password = ?',
  [username, password],
  (err, results) => {
    // ...
  }
);
```

### 対策2: ORM使用

```javascript
// Prisma (Node.js)
const user = await prisma.user.findFirst({
  where: {
    username: username,
    password: password // 実際はハッシュ化すべき
  }
});
```

```python
# Django ORM
user = User.objects.filter(username=username, password=password).first()
```

### 重要: パスワードは必ずハッシュ化

```javascript
// bcrypt使用例
const bcrypt = require('bcrypt');

// 登録時
const hashedPassword = await bcrypt.hash(password, 10);
await prisma.user.create({
  data: { username, password: hashedPassword }
});

// ログイン時
const user = await prisma.user.findUnique({ where: { username } });
const isValid = await bcrypt.compare(password, user.password);
```

## 4. 認証・セッション管理の脆弱性

### 脅威の概要

不適切なセッション管理により、他人のアカウントにログインされる、セッション固定攻撃などのリスク。

### 対策1: セッションIDの安全な生成

```javascript
// Express.js
const session = require('express-session');

app.use(session({
  secret: process.env.SESSION_SECRET, // 環境変数から
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,      // HTTPS必須
    httpOnly: true,    // JavaScriptからアクセス不可
    maxAge: 1800000,   // 30分
    sameSite: 'strict'
  }
}));
```

### 対策2: ログイン後のセッションID再生成

```javascript
app.post('/login', async (req, res) => {
  const user = await authenticate(req.body.username, req.body.password);

  if (user) {
    // セッション固定攻撃対策
    req.session.regenerate((err) => {
      req.session.userId = user.id;
      res.redirect('/dashboard');
    });
  }
});
```

### 対策3: JWT使用時の注意点

```javascript
const jwt = require('jsonwebtoken');

// トークン生成
const token = jwt.sign(
  { userId: user.id },
  process.env.JWT_SECRET,
  { expiresIn: '1h' } // 有効期限必須
);

// トークン検証
const decoded = jwt.verify(token, process.env.JWT_SECRET);

// ⚠️ JWTの注意点
// - 秘密鍵は絶対に漏らさない
// - alg: "none"攻撃に注意（ライブラリの最新版使用）
// - 機密情報をpayloadに入れない（Base64エンコードされるだけ）
```

### 対策4: 多要素認証（MFA）

```javascript
// TOTP (Time-based One-Time Password)
const speakeasy = require('speakeasy');

// シークレット生成（登録時）
const secret = speakeasy.generateSecret({ name: 'MyApp (user@example.com)' });

// QRコード表示
const qrcode = require('qrcode');
qrcode.toDataURL(secret.otpauth_url, (err, dataUrl) => {
  // dataUrlをユーザーに表示
});

// 検証（ログイン時）
const verified = speakeasy.totp.verify({
  secret: secret.base32,
  encoding: 'base32',
  token: userInputCode,
  window: 2 // 時刻ズレ許容
});
```

## 5. HTTPS化とセキュアな通信

### なぜHTTPSが必須なのか

- 通信内容の暗号化（盗聴防止）
- 改ざん検知
- なりすまし防止
- SEO効果（Googleが優遇）
- 最新Web API（Geolocation等）はHTTPS必須

### Let's Encryptで無料SSL証明書

```bash
# Certbot インストール（Ubuntu）
sudo apt update
sudo apt install certbot python3-certbot-nginx

# 証明書取得
sudo certbot --nginx -d example.com -d www.example.com

# 自動更新設定
sudo certbot renew --dry-run
```

### Node.jsでHTTPSサーバー

```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('private-key.pem'),
  cert: fs.readFileSync('certificate.pem')
};

https.createServer(options, app).listen(443);

// HTTPからHTTPSへリダイレクト
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
  res.end();
}).listen(80);
```

### HSTS（HTTP Strict Transport Security）

```javascript
// Express.js
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  next();
});
```

これにより、ブラウザは常にHTTPSでアクセスするようになります。

## 6. CORS（オリジン間リソース共有）

### CORSとは

異なるオリジン（ドメイン・ポート・プロトコル）間でのリソース共有を制御する仕組み。

```
例:
https://example.com        → オリジンA
https://api.example.com    → オリジンB（サブドメイン違い）
https://example.com:3000   → オリジンC（ポート違い）
```

### 脆弱な設定（NG）

```javascript
// すべてのオリジンを許可（危険）
app.use(cors({ origin: '*' }));
```

### 安全な設定

```javascript
const cors = require('cors');

// ホワイトリスト方式
const allowedOrigins = ['https://example.com', 'https://www.example.com'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true, // Cookieを含める場合
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### プリフライトリクエスト

```javascript
// ブラウザが自動的にOPTIONSリクエストを送信
// サーバー側で適切に処理する必要がある

app.options('*', cors()); // プリフライトに対応
```

## 7. CSP（コンテンツセキュリティポリシー）

### CSPとは

読み込み可能なリソース（スクリプト、スタイル、画像等）の出所を制限し、XSS攻撃を緩和。

### 基本設定

```javascript
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' https://cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "connect-src 'self' https://api.example.com;"
  );
  next();
});
```

### ディレクティブ解説

- `default-src 'self'` — デフォルトは同一オリジンのみ
- `script-src` — JavaScriptの読み込み元
  - `'self'` — 同一オリジン
  - `'unsafe-inline'` — インラインスクリプト許可（非推奨）
  - `'unsafe-eval'` — eval()許可（非推奨）
  - `https://cdn.example.com` — 特定CDN許可
- `style-src` — CSSの読み込み元
- `img-src` — 画像の読み込み元
  - `data:` — Data URI許可
- `connect-src` — fetch/XHRの接続先

### Nonce方式（推奨）

```javascript
const crypto = require('crypto');

app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  res.setHeader(
    'Content-Security-Policy',
    `script-src 'nonce-${res.locals.nonce}'`
  );
  next();
});
```

```html
<!-- テンプレート -->
<script nonce="<%= nonce %>">
  console.log('This script is allowed');
</script>
```

### レポート機能

```javascript
res.setHeader(
  'Content-Security-Policy',
  "default-src 'self'; report-uri /csp-violation-report"
);

app.post('/csp-violation-report', (req, res) => {
  console.log('CSP violation:', req.body);
  res.status(204).end();
});
```

## 8. 安全でないデシリアライゼーション

### 脅威の概要

信頼できないデータをデシリアライズすることで、リモートコード実行やDoS攻撃のリスク。

### 危険な例

```python
# Python (pickle)
import pickle

# 攻撃者が細工したデータ
data = request.POST['data']
obj = pickle.loads(data)  # 危険！任意コード実行の可能性
```

### 対策

```python
# JSON使用（安全）
import json

data = request.POST['data']
obj = json.loads(data)  # データのみ、コードは実行されない
```

```javascript
// Node.js
// NG
const obj = eval(userInput); // 絶対NG

// OK
const obj = JSON.parse(userInput);
```

## 9. 機密情報の露出

### 環境変数の使用

```javascript
// NG: ハードコード
const apiKey = 'sk-1234567890abcdef';

// OK: 環境変数
const apiKey = process.env.API_KEY;
```

```.env
# .env ファイル（Gitに含めない！）
API_KEY=sk-1234567890abcdef
DATABASE_URL=postgresql://user:pass@localhost/db
JWT_SECRET=your-secret-key
```

```.gitignore
.env
.env.local
.env.production
```

### シークレットスキャン

```bash
# git-secrets インストール
brew install git-secrets

# リポジトリに設定
git secrets --install
git secrets --register-aws

# コミット前に自動チェック
git secrets --scan
```

### エラーメッセージの適切な処理

```javascript
// NG: 詳細なエラーを返す
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.stack });
});

// OK: 本番環境では一般的なメッセージ
app.use((err, req, res, next) => {
  console.error(err.stack); // サーバー側でログ

  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).json({ error: err.message });
  }
});
```

## 10. セキュリティヘッダー

### Helmet.js（Node.js）

```javascript
const helmet = require('helmet');

app.use(helmet()); // 一括設定

// または個別設定
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "https://cdn.jsdelivr.net"]
  }
}));
app.use(helmet.hsts({
  maxAge: 31536000,
  includeSubDomains: true,
  preload: true
}));
```

### 主要なセキュリティヘッダー

```javascript
// X-Frame-Options（クリックジャッキング防止）
res.setHeader('X-Frame-Options', 'DENY');

// X-Content-Type-Options（MIMEスニッフィング防止）
res.setHeader('X-Content-Type-Options', 'nosniff');

// Referrer-Policy（リファラー情報制御）
res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

// Permissions-Policy（機能制限）
res.setHeader('Permissions-Policy', 'geolocation=(), microphone=()');
```

## セキュリティチェックリスト

開発・デプロイ前に必ずチェック:

### 入力検証
- [ ] 全ユーザー入力をサニタイズ・バリデーション
- [ ] ホワイトリスト方式で検証
- [ ] ファイルアップロードの拡張子・サイズ制限

### 認証・認可
- [ ] パスワードのハッシュ化（bcrypt等）
- [ ] セッションIDの安全な生成・再生成
- [ ] JWT使用時は有効期限設定
- [ ] 多要素認証の実装（重要な操作）

### 通信
- [ ] HTTPS化（Let's Encrypt等）
- [ ] HSTS設定
- [ ] CORS適切に設定

### ヘッダー
- [ ] CSP設定
- [ ] セキュリティヘッダー（Helmet等）
- [ ] Cookie属性（Secure, HttpOnly, SameSite）

### データベース
- [ ] プリペアドステートメント使用
- [ ] 最小権限の原則（DB権限）
- [ ] バックアップ暗号化

### その他
- [ ] 依存パッケージの脆弱性スキャン（npm audit, Snyk）
- [ ] エラーメッセージの適切な処理
- [ ] ログ監視
- [ ] レート制限（ブルートフォース対策）

## セキュリティツール

### 1. OWASP ZAP（脆弱性スキャン）

```bash
# Docker版
docker run -t owasp/zap2docker-stable zap-baseline.py -t https://example.com
```

### 2. npm audit（Node.js）

```bash
# 脆弱性チェック
npm audit

# 自動修正
npm audit fix
```

### 3. Snyk

```bash
# インストール
npm install -g snyk

# 脆弱性スキャン
snyk test

# 監視
snyk monitor
```

## まとめ

Webセキュリティは**開発の一部**であり、後付けではありません。この記事で紹介した10の脅威と対策を実装するだけで、大半の攻撃を防げます。

**重要ポイント**:
1. ユーザー入力は常に疑う
2. HTTPS必須
3. プリペアドステートメント使用
4. セキュリティヘッダー設定
5. 定期的な脆弱性スキャン

2026年、Webセキュリティは法的義務にもなりつつあります。今日から実践しましょう。

**関連記事**:
- [Python入門完全ガイド](/blog/python-beginner-guide-2026)
- [Linux/Macコマンドチートシート](/blog/linux-command-cheatsheet)

**関連ツール**:
- [DevToolBox](/tools) — Base64エンコード、JWT解析等
- [chmod計算機](/tools/chmod-calculator) — ファイル権限の安全な設定

Stay Secure!
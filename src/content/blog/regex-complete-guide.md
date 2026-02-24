---
title: '正規表現（Regex）完全ガイド — JavaScriptで使えるパターン50選と実践例'
description: '正規表現の基礎から応用まで徹底解説。JavaScript/TypeScriptでよく使うパターン50選、メールバリデーション・URL解析・ログ解析など実務で使える実践例を豊富なコード付きで紹介。'
pubDate: '2026-02-20'
heroImage: '../../assets/blog-placeholder-3.jpg'
tags: ['正規表現', 'Regex', 'JavaScript', 'TypeScript', 'バリデーション']
---

正規表現（Regular Expression、略してRegex）は、テキストパターンを記述するための強力なミニ言語だ。一見すると暗号のような記号の羅列に見えるが、一度マスターすれば文字列処理の生産性が飛躍的に向上する。この記事では基礎概念から実践的なパターン集まで、JavaScriptを中心に体系的に解説する。

---

## 1. 正規表現とは何か

正規表現とは、「文字列のパターン」を表現するための記法だ。たとえば「数字3桁のあとにハイフン、さらに数字4桁」という条件を、コードで愚直に書けば何行にもなるが、正規表現なら `\d{3}-\d{4}` の一行で表現できる。

### 正規表現が活きる場面

- **バリデーション**: メールアドレス、電話番号、パスワード強度チェック
- **テキスト検索・置換**: ログファイルからエラー行を抽出、一括フォーマット修正
- **データ解析**: URLのパス解析、ヘッダー情報の抽出
- **スクレイピング**: HTMLやJSONから特定情報を抜き出す

JavaScriptでは正規表現はビルトインのオブジェクトとして提供されており、追加ライブラリ不要で使える。

```javascript
// リテラル記法（スラッシュで囲む）
const pattern1 = /hello/;

// コンストラクタ記法（動的なパターンに使う）
const pattern2 = new RegExp('hello');
const keyword = 'world';
const dynamic = new RegExp(keyword, 'gi'); // 変数を使った動的パターン
```

---

## 2. 基本メタ文字一覧

正規表現の根幹をなすメタ文字（特殊な意味を持つ文字）を覚えることが最初のステップだ。

| メタ文字 | 意味 | 例 | マッチ例 |
|---------|------|-----|---------|
| `.` | 任意の1文字（改行除く） | `a.c` | `abc`, `a1c`, `a_c` |
| `*` | 直前の要素が0回以上 | `ab*c` | `ac`, `abc`, `abbc` |
| `+` | 直前の要素が1回以上 | `ab+c` | `abc`, `abbc`（`ac`は不可） |
| `?` | 直前の要素が0回か1回 | `colou?r` | `color`, `colour` |
| `^` | 行の先頭 | `^Hello` | 行頭の`Hello` |
| `$` | 行の末尾 | `world$` | 行末の`world` |
| `\` | 次の文字をエスケープ | `\.` | リテラルのピリオド |
| `[]` | 文字クラス | `[aeiou]` | 母音1文字 |
| `[^]` | 否定文字クラス | `[^0-9]` | 数字以外の文字 |
| `{n}` | ちょうどn回 | `\d{4}` | 数字4桁 |
| `{n,m}` | n回以上m回以下 | `\d{2,4}` | 数字2〜4桁 |
| `{n,}` | n回以上 | `\d{2,}` | 数字2桁以上 |
| `\|` | OR（選択） | `cat\|dog` | `cat`または`dog` |

```javascript
// メタ文字の基本例
const text = 'The price is $42.50';

// . は任意の1文字
console.log(/pr.ce/.test(text)); // true ('price'にマッチ)

// エスケープが必要なケース
console.log(/\$[\d.]+/.exec(text)?.[0]); // '$42.50'

// 量指定子
console.log(/\d+/.exec(text)?.[0]); // '42'
console.log(/\d{1,2}\.\d{2}/.exec(text)?.[0]); // '42.50'
```

---

## 3. 文字クラスとショートハンド

頻繁に使うパターンにはショートハンド（省略記法）が用意されている。

| ショートハンド | 意味 | 同等の表現 |
|-------------|------|-----------|
| `\d` | 数字 | `[0-9]` |
| `\D` | 数字以外 | `[^0-9]` |
| `\w` | 単語文字（英数字+アンダースコア） | `[a-zA-Z0-9_]` |
| `\W` | 単語文字以外 | `[^a-zA-Z0-9_]` |
| `\s` | 空白文字（スペース、タブ、改行等） | `[ \t\r\n\f\v]` |
| `\S` | 空白以外 | `[^ \t\r\n\f\v]` |
| `\b` | 単語の境界 | — |
| `\B` | 単語境界以外 | — |

```javascript
// ショートハンドの活用例
const logLine = '2026-02-20 ERROR: Connection timeout after 30s';

// 日付部分を抽出
const dateMatch = logLine.match(/\d{4}-\d{2}-\d{2}/);
console.log(dateMatch?.[0]); // '2026-02-20'

// ログレベルを抽出
const levelMatch = logLine.match(/\b(DEBUG|INFO|WARN|ERROR|FATAL)\b/);
console.log(levelMatch?.[0]); // 'ERROR'

// 数値を全て抽出
const numbers = logLine.match(/\d+/g);
console.log(numbers); // ['2026', '02', '20', '30']

// 単語境界の重要性
const text2 = 'cat concatenate category';
console.log(text2.match(/\bcat\b/g)); // ['cat'] ← 単語としての'cat'だけ
console.log(text2.match(/cat/g));    // ['cat', 'cat', 'cat'] ← 全ての'cat'
```

### カスタム文字クラス

```javascript
// 日本語のひらがなにマッチ
const hiragana = /[\u3041-\u3096]/g;
console.log('Hello こんにちは World'.match(hiragana));
// ['こ', 'ん', 'に', 'ち', 'は']

// 全角・半角英数字
const alphanumFull = /[a-zA-Z0-9Ａ-Ｚａ-ｚ０-９]/g;

// 記号を除外
const noSymbol = /[^!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g;
```

---

## 4. グループとキャプチャ

グループは複数の要素をまとめたり、マッチした部分を後で参照するために使う。

### キャプチャグループ `()`

```javascript
const dateStr = '2026-02-20';
const dateRegex = /(\d{4})-(\d{2})-(\d{2})/;
const match = dateStr.match(dateRegex);

console.log(match?.[0]); // '2026-02-20' (全体マッチ)
console.log(match?.[1]); // '2026' (グループ1: 年)
console.log(match?.[2]); // '02'   (グループ2: 月)
console.log(match?.[3]); // '20'   (グループ3: 日)

// 後方参照: \1, \2 で同じグループを参照
const duplicateWord = /\b(\w+)\s+\1\b/;
console.log(duplicateWord.test('the the cat')); // true（重複単語を検出）
```

### 非キャプチャグループ `(?:)`

キャプチャが不要なグループには `(?:)` を使う。パフォーマンス向上と、グループ番号の混乱防止に役立つ。

```javascript
// (?:) を使った例: http または https にマッチするが、キャプチャしない
const urlProtocol = /(?:https?):\/\/([\w.-]+)/;
const url = 'https://example.com/path';
const m = url.match(urlProtocol);
console.log(m?.[1]); // 'example.com' (グループ1がドメイン)
// (?:) はカウントされないので、インデックスが正確
```

### 名前付きキャプチャグループ `(?<name>)`

ES2018以降で使える強力な機能。グループに名前をつけてアクセスできる。

```javascript
const dateRegexNamed = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/;
const result = '2026-02-20'.match(dateRegexNamed);

console.log(result?.groups?.year);  // '2026'
console.log(result?.groups?.month); // '02'
console.log(result?.groups?.day);   // '20'

// replace での活用
const reformatted = '2026-02-20'.replace(
  /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/,
  '$<day>/$<month>/$<year>'
);
console.log(reformatted); // '20/02/2026'
```

---

## 5. 先読み・後読みアサーション

アサーションは「マッチするが、消費しない（文字列中の位置を検証する）」パターンだ。

### 先読み（Lookahead）

```javascript
// 肯定先読み (?=): 後ろに特定パターンが続く場合にマッチ
const price = '100円 200ドル 300円';
// 「円」の前の数値だけを取得
const yenAmounts = price.match(/\d+(?=円)/g);
console.log(yenAmounts); // ['100', '300']

// 否定先読み (?!): 後ろに特定パターンが続かない場合にマッチ
// 「ドル」の前の数値だけを取得
const nonYen = price.match(/\d+(?!円|ドル\d)/g);
// ※ 否定先読みは慎重に設計すること

// パスワード強度チェック（全条件を先読みで同時検証）
const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
console.log(strongPassword.test('Abcdef1!')); // true
console.log(strongPassword.test('abcdef1!')); // false（大文字なし）
console.log(strongPassword.test('ABCDEF1!')); // false（小文字なし）
```

### 後読み（Lookbehind）

```javascript
// 肯定後読み (?<=): 前に特定パターンがある場合にマッチ
const html = '<p>Hello</p><span>World</span>';
// タグの内容だけ抽出
const tagContent = html.match(/(?<=<[^>]+>)[^<]+(?=<\/)/g);
console.log(tagContent); // ['Hello', 'World']

// 否定後読み (?<!): 前に特定パターンがない場合にマッチ
const code = 'color: #ff0000; background: #fff; font-size: 16px';
// # で始まらない16進数値だけ（pxの数値）
const pixelValues = code.match(/(?<!#)\b\d+(?=px)/g);
console.log(pixelValues); // ['16']
```

---

## 6. JavaScriptの正規表現メソッド

### `RegExp.test()` — マッチ確認

```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return emailRegex.test(email);
}

console.log(isValidEmail('user@example.com')); // true
console.log(isValidEmail('invalid-email'));    // false
```

### `String.match()` — マッチ結果取得

```javascript
const text = 'Call us at 03-1234-5678 or 06-9876-5432';

// フラグなし: 最初のマッチのみ、グループ情報あり
const first = text.match(/\d{2}-\d{4}-\d{4}/);
console.log(first?.[0]); // '03-1234-5678'

// gフラグ: 全マッチを配列で返す（グループ情報なし）
const all = text.match(/\d{2}-\d{4}-\d{4}/g);
console.log(all); // ['03-1234-5678', '06-9876-5432']
```

### `String.matchAll()` — 全マッチをイテレート（ES2020）

```javascript
const csv = 'name,age,city\nAlice,30,Tokyo\nBob,25,Osaka';
const rowRegex = /^(?<name>\w+),(?<age>\d+),(?<city>\w+)$/gm;

for (const match of csv.matchAll(rowRegex)) {
  const { name, age, city } = match.groups!;
  console.log(`${name}: ${age}歳 (${city})`);
}
// Alice: 30歳 (Tokyo)
// Bob: 25歳 (Osaka)
```

### `String.replace()` / `String.replaceAll()` — 置換

```javascript
// 基本的な置換
const text2 = 'Hello World, Hello JavaScript!';
console.log(text2.replace(/Hello/g, 'Hi'));
// 'Hi World, Hi JavaScript!'

// コールバック関数による動的置換
const camelToSnake = (str: string): string =>
  str.replace(/([A-Z])/g, (match) => `_${match.toLowerCase()}`);

console.log(camelToSnake('myVariableName')); // 'my_variable_name'
console.log(camelToSnake('getUserById'));    // 'get_user_by_id'

// テンプレート変数の展開
const template = 'Hello, {{name}}! You have {{count}} messages.';
const vars: Record<string, string> = { name: 'Alice', count: '5' };
const rendered = template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
console.log(rendered); // 'Hello, Alice! You have 5 messages.'
```

### `RegExp.exec()` — ループでの詳細取得

```javascript
const log = `
[2026-02-20 10:00:01] ERROR: Database connection failed
[2026-02-20 10:00:05] INFO: Retrying connection...
[2026-02-20 10:00:10] ERROR: Timeout exceeded
`;

const logRegex = /\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] (ERROR|INFO|WARN): (.+)/g;
let match;

const errors: Array<{ timestamp: string; message: string }> = [];
while ((match = logRegex.exec(log)) !== null) {
  const [, timestamp, level, message] = match;
  if (level === 'ERROR') {
    errors.push({ timestamp, message });
  }
}

console.log(errors);
// [
//   { timestamp: '2026-02-20 10:00:01', message: 'Database connection failed' },
//   { timestamp: '2026-02-20 10:00:10', message: 'Timeout exceeded' }
// ]
```

---

## 7. フラグ

フラグはパターンの動作を制御するオプションだ。

| フラグ | 意味 |
|-------|------|
| `g` | グローバル検索（全マッチを探す） |
| `i` | 大文字・小文字を区別しない |
| `m` | マルチライン（`^`と`$`が各行の先頭・末尾にマッチ） |
| `s` | dotAll（`.`が改行にもマッチ） |
| `u` | Unicodeモード（サロゲートペアを正しく扱う） |
| `y` | sticky（`lastIndex`から検索を開始） |
| `d` | インデックス情報を返す（ES2022） |

```javascript
// mフラグ: 複数行のテキスト処理
const multiline = `
  function hello() {
  function world() {
  const x = 1;
`;
const functions = multiline.match(/^\s*function \w+/gm);
console.log(functions);
// ['  function hello()', '  function world()']

// sフラグ: 複数行にまたがるパターン
const html2 = '<div>\n  <p>Hello</p>\n</div>';
const divContent = html2.match(/<div>(.*?)<\/div>/s)?.[1];
console.log(divContent); // '\n  <p>Hello</p>\n'

// uフラグ: 絵文字や漢字の正確な処理
const emoji = '🎉🎊🎈';
console.log(emoji.match(/./g)?.length);  // 6（壊れた文字として数える）
console.log(emoji.match(/./gu)?.length); // 3（正しく3文字として数える）
```

---

## 8. よく使うパターン集（厳選50選）

### メールアドレス

```typescript
// 基本（RFC 5322の簡易版）
const emailBasic = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// より厳密なバリデーション
const emailStrict =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

const testEmails = [
  'user@example.com',       // valid
  'user.name+tag@example.co.jp', // valid
  'invalid@',               // invalid
  '@no-local.com',          // invalid
  'no-at-sign.com',         // invalid
];

testEmails.forEach(email => {
  console.log(`${email}: ${emailStrict.test(email)}`);
});
```

### URL・URI

```typescript
// HTTP/HTTPSのURL
const urlRegex =
  /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;

// URLの構成要素を分解
const urlParser =
  /^(?<protocol>https?):\/\/(?<host>[^/:?#]+)(?::(?<port>\d+))?(?<path>\/[^?#]*)?(?:\?(?<query>[^#]*))?(?:#(?<fragment>.*))?$/;

const parsedUrl = 'https://api.example.com:8080/users?page=1&limit=10#results'.match(urlParser);
console.log(parsedUrl?.groups);
// { protocol: 'https', host: 'api.example.com', port: '8080',
//   path: '/users', query: 'page=1&limit=10', fragment: 'results' }
```

### 電話番号（日本）

```typescript
// 固定電話（市外局番形式）
const jaPhoneFixed = /^0\d{1,4}-\d{1,4}-\d{4}$/;

// 携帯電話
const jaPhoneMobile = /^0[789]0-\d{4}-\d{4}$/;

// フリーダイヤル
const jaPhoneFree = /^0120-\d{3}-\d{3}$/;

// ハイフンあり・なし両対応（汎用）
const jaPhoneGeneral = /^0\d{9,10}$|^0\d{1,4}-\d{1,4}-\d{4}$/;

// 電話番号の正規化（ハイフン除去）
function normalizePhone(phone: string): string {
  return phone.replace(/[-\s()]/g, '');
}

console.log(normalizePhone('03-1234-5678')); // '0312345678'
console.log(normalizePhone('(03) 1234 5678')); // '0312345678'
```

### 郵便番号（日本）

```javascript
const jpPostalCode = /^\d{3}-?\d{4}$/;

console.log(jpPostalCode.test('123-4567')); // true
console.log(jpPostalCode.test('1234567'));  // true
console.log(jpPostalCode.test('123456'));   // false

// 郵便番号のフォーマット統一
const formatPostal = (code: string): string =>
  code.replace(/^(\d{3})-?(\d{4})$/, '$1-$2');

console.log(formatPostal('1234567'));  // '123-4567'
console.log(formatPostal('123-4567')); // '123-4567'
```

### IPアドレス

```typescript
// IPv4
const ipv4Regex =
  /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;

console.log(ipv4Regex.test('192.168.1.1'));  // true
console.log(ipv4Regex.test('255.255.255.255')); // true
console.log(ipv4Regex.test('256.0.0.1'));    // false（256は範囲外）
console.log(ipv4Regex.test('192.168.1'));    // false（オクテット不足）

// IPv6（簡易版）
const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

// CIDR表記
const cidrRegex =
  /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\/(\d|[1-2]\d|3[0-2])$/;
console.log(cidrRegex.test('192.168.0.0/24')); // true
```

### クレジットカード番号

```javascript
// Visa (16桁、4で始まる)
const visaRegex = /^4\d{15}$/;

// Mastercard (16桁、51-55または2221-2720で始まる)
const mastercardRegex = /^(?:5[1-5]\d{14}|2(?:2[2-9][1-9]|[3-6]\d{2}|7[01]\d|720)\d{12})$/;

// ルーンアルゴリズム（チェックサム検証）
function luhnCheck(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '').split('').reverse().map(Number);
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let digit = digits[i];
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

// カード番号のマスキング
const maskCard = (num: string): string =>
  num.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '$1-****-****-$4');

console.log(maskCard('1234567890123456')); // '1234-****-****-3456'
```

### 日付と時刻

```typescript
// YYYY-MM-DD形式
const dateISO = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

// 日本語日付（令和対応）
const dateJP = /^(令和|平成|昭和|大正|明治)\d{1,2}年(0?[1-9]|1[0-2])月(0?[1-9]|[12]\d|3[01])日$/;

// 時刻 HH:MM:SS
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

// ISO 8601 日時
const datetimeISO =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

// 日付バリデーション（うるう年対応）
function isValidDate(dateStr: string): boolean {
  if (!dateISO.test(dateStr)) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year &&
         date.getMonth() === month - 1 &&
         date.getDate() === day;
}

console.log(isValidDate('2024-02-29')); // true（うるう年）
console.log(isValidDate('2023-02-29')); // false（非うるう年）
```

### パスワード強度

```typescript
// レベル別パスワード検証
const passwordRules = {
  hasMinLength:    (p: string) => /^.{8,}$/.test(p),
  hasLowercase:   (p: string) => /[a-z]/.test(p),
  hasUppercase:   (p: string) => /[A-Z]/.test(p),
  hasDigit:       (p: string) => /\d/.test(p),
  hasSpecialChar: (p: string) => /[@$!%*?&#^()_\-+=]/.test(p),
  noSpaces:       (p: string) => !/\s/.test(p),
};

function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  const passed = Object.values(passwordRules).filter(fn => fn(password)).length;
  if (passed <= 2) return 'weak';
  if (passed <= 4) return 'medium';
  return 'strong';
}

console.log(getPasswordStrength('abc'));         // 'weak'
console.log(getPasswordStrength('Abcdef1'));    // 'medium'
console.log(getPasswordStrength('Abcdef1!'));   // 'strong'
```

### HTMLとCSS

```javascript
// CSSカラーコード（#RGB、#RRGGBB、#RGBA、#RRGGBBAA）
const cssColor = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

// RGBおよびRGBA
const rgbColor = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+))?\s*\)$/;

// CSSのピクセル値
const cssPixel = /^-?\d+(\.\d+)?px$/;

// CSSクラス・ID名
const cssIdentifier = /^-?[a-zA-Z_][a-zA-Z0-9_-]*$/;

// HTMLタグの属性値抽出（※後述の注意点参照）
const attrExtract = /(\w+)="([^"]*)"/g;
const htmlTag = '<a href="https://example.com" class="link" data-id="42">';
for (const [, attr, value] of htmlTag.matchAll(attrExtract)) {
  console.log(`${attr} = ${value}`);
}
// href = https://example.com
// class = link
// data-id = 42
```

### コードとプログラミング関連

```typescript
// キャメルケース → スネークケース変換
const camelToSnakeCase = (str: string): string =>
  str.replace(/([a-z\d])([A-Z])/g, '$1_$2').toLowerCase();

// スネークケース → キャメルケース変換
const snakeToCamelCase = (str: string): string =>
  str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

console.log(camelToSnakeCase('getUserByIdAndName')); // 'get_user_by_id_and_name'
console.log(snakeToCamelCase('get_user_by_id'));     // 'getUserById'

// セマンティックバージョン（SemVer）
const semverRegex =
  /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

console.log(semverRegex.test('1.0.0'));          // true
console.log(semverRegex.test('2.3.4-beta.1'));   // true
console.log(semverRegex.test('1.2'));            // false

// Markdownのリンク抽出
const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
const markdown = 'Check out [Google](https://google.com) and [GitHub](https://github.com)!';
for (const [, text, url] of markdown.matchAll(mdLinkRegex)) {
  console.log(`${text} -> ${url}`);
}
// Google -> https://google.com
// GitHub -> https://github.com
```

---

## 9. 高度なパターン：ログ解析

実務で最も役立つのがログ解析だ。

```typescript
// Apacheアクセスログの解析
const apacheLogRegex =
  /^(?<ip>\S+) \S+ \S+ \[(?<datetime>[^\]]+)\] "(?<method>\w+) (?<path>\S+) \S+" (?<status>\d{3}) (?<bytes>\d+|-)/;

const sampleLogs = [
  '192.168.1.1 - alice [20/Feb/2026:10:00:01 +0900] "GET /api/users HTTP/1.1" 200 1234',
  '10.0.0.1 - - [20/Feb/2026:10:00:02 +0900] "POST /api/login HTTP/1.1" 401 89',
  '203.0.113.1 - bob [20/Feb/2026:10:00:03 +0900] "GET /admin HTTP/1.1" 403 512',
];

interface LogEntry {
  ip: string;
  datetime: string;
  method: string;
  path: string;
  status: number;
  bytes: number;
}

const parsedLogs: LogEntry[] = sampleLogs
  .map(line => line.match(apacheLogRegex)?.groups)
  .filter((g): g is NonNullable<typeof g> => g != null)
  .map(g => ({
    ip: g.ip,
    datetime: g.datetime,
    method: g.method,
    path: g.path,
    status: parseInt(g.status),
    bytes: g.bytes === '-' ? 0 : parseInt(g.bytes),
  }));

// ステータスコード別集計
const errorRequests = parsedLogs.filter(log => log.status >= 400);
console.log('エラーリクエスト:', errorRequests.length); // 2

// 特定IPのアクセス抽出
const suspiciousIP = parsedLogs.filter(log => /^203\./.test(log.ip));
console.log('外部IPアクセス:', suspiciousIP.map(l => l.path));
```

### HTMLタグ解析の注意点

正規表現はHTMLの完全な解析には向いていない。ネストしたタグや自己閉じタグなど、エッジケースが多すぎるためだ。

```javascript
// 危険なアプローチ（ネスト対応不可）
const dangerousHTML = /<div>(.*?)<\/div>/g;

// 推奨: ブラウザ環境ではDOMParser、Node.jsではcheerioを使う
import { JSDOM } from 'jsdom';

function extractTextFromHTML(html: string): string {
  const dom = new JSDOM(html);
  return dom.window.document.body.textContent ?? '';
}

// 正規表現が有効なHTMLの限定的なユースケース
// ✓ 特定の属性値を取り出す（単純なケース）
// ✓ HTMLタグを除去して平文を取り出す
// ✗ ネストしたタグの内容を取り出す
// ✗ 複雑なHTML構造を解析する

// タグ除去（シンプルなケース向け）
const stripTags = (html: string): string =>
  html.replace(/<[^>]+>/g, '');

console.log(stripTags('<p>Hello <strong>World</strong>!</p>')); // 'Hello World!'
```

---

## 10. パフォーマンスとCatastrophic Backtracking

正規表現には「壊滅的なバックトラッキング」と呼ばれる深刻なパフォーマンス問題がある。

### 問題のパターン

```javascript
// 危険なパターン: 指数的バックトラッキングを引き起こす
const dangerous = /^(a+)+$/;

// 'aaaaaab' のような文字列でマッチが失敗する場合、
// エンジンが全ての組み合わせを試みて計算量が爆発する
// console.log(dangerous.test('a'.repeat(30) + 'b')); // タイムアウトの可能性

// 安全なパターンに書き換え
const safe = /^a+$/; // そもそもこれで十分

// ネストした量指定子の書き換え
// 危険: /(a|aa)+/
// 安全: /a+/ または /(?:a+)(?:a+)*/
```

### パフォーマンス最適化のベストプラクティス

```typescript
// 1. 正規表現をモジュールレベルで事前コンパイル（ループ内で再生成しない）
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 悪い例
function validateEmailBad(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); // 毎回コンパイル
}

// 良い例
function validateEmailGood(email: string): boolean {
  return EMAIL_REGEX.test(email); // 事前コンパイル済みを再利用
}

// 2. 具体的なパターンを使う（ドットを避ける）
// 悪い: /.+@.+\..+/
// 良い: /[^\s@]+@[^\s@]+\.[^\s@]+/

// 3. 早期失敗を利用する（具体的なアンカーや文字クラスで開始）
// 悪い: /.*error.*/i  ← 先頭から全文を試みる
// 良い: /error/i      ← 必要最小限

// 4. アトミックグループや所有量指定子（使えない場合は書き直し）
// 一部のエンジン: /(?>a+)/ でバックトラック禁止
// JSでは: 所有量指定子未対応なので、パターン設計で回避する

// 5. 入力の前処理でRegexの負担を減らす
function extractErrorLines(logContent: string): string[] {
  return logContent
    .split('\n')                    // まず行分割
    .filter(line => line.length > 0) // 空行を除去
    .filter(line => /ERROR/.test(line)); // 正規表現の適用範囲を絞る
}
```

### タイムアウト対策（Node.js）

```typescript
// タイムアウト付き正規表現テスト（ワーカーを使う本番級対策）
function testWithTimeout(
  regex: RegExp,
  input: string,
  timeoutMs: number = 100
): boolean | null {
  const start = Date.now();

  try {
    // 簡易版: 同期処理ではタイムアウトを完全には防げないが
    // 入力長の上限チェックで大部分のケースをカバーできる
    if (input.length > 10000) {
      console.warn('Input too long for regex test');
      return null;
    }
    return regex.test(input);
  } catch {
    return null;
  } finally {
    const elapsed = Date.now() - start;
    if (elapsed > timeoutMs) {
      console.warn(`Regex took ${elapsed}ms`);
    }
  }
}
```

---

## まとめ：正規表現マスターへの道

正規表現は一朝一夕で完全に習得できるものではないが、コアとなるパターンを押さえることで、実務の大半はカバーできる。

**優先して習得すべき事項:**

1. **基本メタ文字**: `.`, `*`, `+`, `?`, `^`, `$`, `[]`, `{n,m}`
2. **ショートハンド**: `\d`, `\w`, `\s` とその大文字版
3. **グループ**: `()`, `(?:)`, `(?<name>)`
4. **Jsメソッド**: `test()`, `match()`, `replace()`, `matchAll()`
5. **フラグ**: `g`, `i`, `m`, `s`, `u`

**パフォーマンスの鉄則:**
- 正規表現はモジュールレベルで宣言・再利用する
- ネストした量指定子は避ける
- HTMLの完全な解析にはDOMParserやcheerioを使う

正規表現のテストには[DevToolBoxの正規表現テスター](https://usedevtools.com/regex-tester)が便利だ。リアルタイムでマッチ結果を確認できるので、パターンの開発・デバッグが大幅に効率化できる。ブラウザで開いてすぐ使えるため、開発中のブックマークにぜひ追加してほしい。

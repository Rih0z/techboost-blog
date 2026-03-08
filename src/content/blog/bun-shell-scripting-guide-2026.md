---
title: "Bun Shell完全ガイド｜JSでシェルスクリプト"
description: "Bun Shellの使い方を徹底解説。$テンプレートリテラルでパイプ・環境変数・glob・リダイレクトをJavaScript/TypeScriptで扱う方法をコード例付きで紹介。Bash置き換えの実践パターンやCI/CDでの活用法まで網羅。"
pubDate: "2026-03-05"
tags: ["Bun", "JavaScript", "TypeScript", "開発ツール", "Web開発"]
heroImage: '../../assets/thumbnails/bun-shell-scripting-guide-2026.jpg'
---

Bun Shellは、Bunに組み込まれたクロスプラットフォーム対応のシェルです。JavaScriptの`$`タグ付きテンプレートリテラルを使って、シェルスクリプトをJavaScript/TypeScriptで記述できます。macOS、Linux、Windowsで同じコードが動作し、Bashやzshへの依存を排除した次世代のスクリプティング環境です。

この記事では、Bun Shellの基本から高度な使い方まで、実践的なコード例とともに徹底解説します。

## Bun Shellとは

### 概要

Bun Shellは、Bun v1.0.24で導入されたクロスプラットフォームのシェル機能です。従来のシェルスクリプト（Bash/zsh/PowerShell）が抱えていたOS依存の問題を解決し、JavaScriptのテンプレートリテラル構文で統一的にシェルコマンドを記述できます。

### 主な特徴

- **クロスプラットフォーム**: macOS、Linux、Windowsで同一コードが動作
- **`$`テンプレートリテラル**: JavaScriptの構文でシェルコマンドを記述
- **パイプ・リダイレクト対応**: Unix系シェルと同様のパイプライン処理
- **環境変数の型安全な操作**: JavaScriptオブジェクトとして環境変数を管理
- **globパターン対応**: ファイルパターンマッチングをネイティブサポート
- **エスケープ処理の自動化**: インジェクション攻撃を防ぐ安全なコマンド構築
- **高速起動**: Bunランタイムの高速性をそのまま活用

### なぜBun Shellが必要なのか

従来のシェルスクリプトには以下の課題がありました。

```bash
# 従来のBashスクリプトの問題点

# 1. OS依存: WindowsではBashが使えない
#!/bin/bash
find . -name "*.ts" -exec wc -l {} +

# 2. 変数展開の罠: スペースを含むパスで壊れる
FILE_PATH="my project/src"
ls $FILE_PATH  # "my" と "project/src" に分割される

# 3. エラーハンドリングが難しい
set -e  # これだけでは不十分なケースが多い
command1 | command2  # パイプ内のエラーは無視される

# 4. 複雑なロジックが書きにくい
# 配列操作、非同期処理、HTTP通信などが困難
```

Bun Shellはこれらの問題をすべて解決します。

```typescript
// Bun Shell: 安全で移植可能なスクリプティング
import { $ } from "bun";

// 1. クロスプラットフォーム: どのOSでも動作
const files = await $`find . -name "*.ts"`.text();

// 2. 変数は自動的にエスケープされる
const filePath = "my project/src";
await $`ls ${filePath}`;  // 安全にエスケープされる

// 3. エラーハンドリングが容易
try {
  await $`command1`;
} catch (err) {
  console.error("コマンドが失敗しました:", err.exitCode);
}

// 4. JavaScriptの全機能が使える
const results = await Promise.all(
  urls.map(url => $`curl -s ${url}`.json())
);
```

## セットアップ

### Bunのインストール

```bash
# macOS / Linux
curl -fsSL https://bun.sh/install | bash

# Windows
powershell -c "irm bun.sh/install.ps1|iex"

# Homebrew
brew install oven-sh/bun/bun

# バージョン確認（v1.0.24以上が必要）
bun --version
```

### プロジェクトの初期化

```bash
# 新規プロジェクト作成
mkdir my-shell-scripts
cd my-shell-scripts
bun init

# TypeScriptの型定義は自動で含まれる
# bun-types にBun Shellの型が含まれている
```

### 基本的なスクリプトファイル

```typescript
// scripts/hello.ts
import { $ } from "bun";

await $`echo "Hello from Bun Shell!"`;
```

```bash
# 実行
bun run scripts/hello.ts
# => Hello from Bun Shell!
```

## $テンプレートリテラルの基本

### コマンドの実行

Bun Shellの中心は`$`タグ付きテンプレートリテラルです。`bun`モジュールから`$`をインポートして使用します。

```typescript
import { $ } from "bun";

// 基本的なコマンド実行
await $`echo "Hello, World!"`;
// => Hello, World!

// 複数行コマンド
await $`
  echo "Step 1: Creating directory"
  mkdir -p build
  echo "Step 2: Done"
`;
```

### 出力の取得

コマンドの出力をさまざまな形式で取得できます。

```typescript
import { $ } from "bun";

// テキストとして取得（末尾の改行は自動除去）
const text = await $`echo "Hello"`.text();
console.log(text); // => "Hello"

// JSON として取得
const json = await $`echo '{"name": "bun", "version": "1.1"}'`.json();
console.log(json.name); // => "bun"

// 行ごとの配列として取得
const lines = await $`ls -la`.lines();
for (const line of lines) {
  console.log(line);
}

// ArrayBufferとして取得（バイナリデータ）
const buffer = await $`cat image.png`.arrayBuffer();
console.log(buffer.byteLength);

// Blobとして取得
const blob = await $`cat document.pdf`.blob();
console.log(blob.size);
```

### 終了コードの確認

```typescript
import { $ } from "bun";

// exitCodeの取得
const result = await $`exit 0`.nothrow();
console.log(result.exitCode); // => 0

// 失敗するコマンド
const failed = await $`exit 1`.nothrow();
console.log(failed.exitCode); // => 1

// デフォルトでは非ゼロの終了コードで例外がスローされる
try {
  await $`exit 1`;
} catch (err) {
  console.error(`終了コード: ${err.exitCode}`); // => 終了コード: 1
}
```

### 変数の埋め込みとエスケープ

```typescript
import { $ } from "bun";

// JavaScript変数の安全な埋め込み
const name = "Bun Shell";
const version = "1.1";
await $`echo ${name} version ${version}`;
// => Bun Shell version 1.1

// 特殊文字を含む変数も安全
const dangerous = '"; rm -rf / #';
await $`echo ${dangerous}`;
// => "; rm -rf / #  （安全にエスケープされる）

// 数値も自動変換
const count = 42;
await $`echo ${count}`;
// => 42

// 配列は展開される
const args = ["--verbose", "--color", "auto"];
await $`ls ${args}`;
// => ls --verbose --color auto
```

## パイプライン

### 基本的なパイプ

Bun Shellではシェルのパイプ構文がそのまま使えます。

```typescript
import { $ } from "bun";

// シェル構文でのパイプ
const result = await $`cat package.json | grep "name"`.text();
console.log(result);

// 複数段のパイプ
const count = await $`ls -la | grep ".ts" | wc -l`.text();
console.log(`TypeScriptファイル数: ${count.trim()}`);

// sortとuniqの組み合わせ
const uniqueExtensions = await $`
  find . -type f | sed 's/.*\.//' | sort | uniq -c | sort -rn
`.text();
console.log(uniqueExtensions);
```

### .pipe()メソッド

JavaScriptのメソッドチェーンでパイプラインを構築することもできます。

```typescript
import { $ } from "bun";

// .pipe()を使ったパイプライン
const result = await $`cat access.log`
  .pipe($`grep "ERROR"`)
  .pipe($`wc -l`)
  .text();

console.log(`エラー件数: ${result.trim()}`);

// 動的なパイプライン構築
const grepPattern = "WARNING";
const output = await $`cat server.log`
  .pipe($`grep ${grepPattern}`)
  .pipe($`sort`)
  .pipe($`uniq -c`)
  .text();

console.log(output);
```

### Bun.fileへのパイプ

コマンドの出力を直接ファイルに書き込めます。

```typescript
import { $ } from "bun";

// ファイルへの出力パイプ
await $`echo "Hello, World!"`.pipe(Bun.file("output.txt"));

// コマンド出力をファイルに保存
await $`ls -la`.pipe(Bun.file("directory-listing.txt"));

// 圧縮ファイルの作成
await $`tar czf - src/`.pipe(Bun.file("src-backup.tar.gz"));
```

### Response オブジェクトへのパイプ

HTTPレスポンスとしてコマンド出力を返すことも可能です。

```typescript
import { $ } from "bun";

// HTTPサーバーでのパイプ活用
Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/api/disk-usage") {
      // コマンド出力を直接HTTPレスポンスとして返す
      return new Response(
        await $`df -h`.text(),
        { headers: { "Content-Type": "text/plain" } }
      );
    }

    if (url.pathname === "/api/processes") {
      const json = await $`ps aux --sort=-%mem | head -20`.text();
      return new Response(json, {
        headers: { "Content-Type": "text/plain" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});
```

## リダイレクト

### 出力リダイレクト

```typescript
import { $ } from "bun";

// 標準出力をファイルに書き込み（上書き）
await $`echo "Hello" > output.txt`;

// 標準出力をファイルに追記
await $`echo "World" >> output.txt`;

// 標準エラー出力のリダイレクト
await $`command_that_fails 2> error.log`.nothrow();

// 標準出力と標準エラー出力の両方をリダイレクト
await $`some-command > stdout.log 2> stderr.log`.nothrow();

// 標準エラー出力を標準出力にマージ
await $`some-command 2>&1 > all-output.log`.nothrow();
```

### 入力リダイレクト

```typescript
import { $ } from "bun";

// ファイルからの入力
await $`wc -l < input.txt`;

// ヒアドキュメント風の入力
const inputData = "line1\nline2\nline3";
const lineCount = await $`echo ${inputData} | wc -l`.text();
console.log(`行数: ${lineCount.trim()}`);
```

### /dev/nullへのリダイレクト

```typescript
import { $ } from "bun";

// 出力を捨てる（クロスプラットフォーム対応）
await $`noisy-command > /dev/null 2>&1`.nothrow();

// .quiet()メソッドで出力を抑制
await $`echo "This will be silenced"`.quiet();
```

## 環境変数

### 環境変数の設定と参照

```typescript
import { $ } from "bun";

// コマンド内で環境変数を参照
await $`echo $HOME`;
await $`echo $PATH`;

// JavaScriptから環境変数を設定
$.env.MY_VARIABLE = "hello";
await $`echo $MY_VARIABLE`;
// => hello

// 環境変数を一括設定
$.env = {
  ...$.env,
  NODE_ENV: "production",
  DATABASE_URL: "postgres://localhost:5432/mydb",
  API_KEY: "secret123",
};

await $`echo $NODE_ENV`;
// => production
```

### コマンド単位の環境変数

```typescript
import { $ } from "bun";

// インラインで環境変数を設定（そのコマンドのみ有効）
await $`FOO=bar echo $FOO`;
// => bar

// 複数の環境変数を同時設定
await $`NODE_ENV=test PORT=3001 bun run server.ts`;

// .env()メソッドで設定
await $`echo $CUSTOM_VAR`.env({
  CUSTOM_VAR: "custom_value",
  ANOTHER_VAR: "another",
});
```

### process.envとの連携

```typescript
import { $ } from "bun";

// process.envから読み取り
const dbUrl = process.env.DATABASE_URL ?? "sqlite://local.db";
await $`echo "Connecting to: ${dbUrl}"`;

// Bun Shellの$.envはprocess.envを継承する
console.log($.env.HOME === process.env.HOME); // => true

// $.envを変更してもprocess.envには影響しない
$.env.SHELL_ONLY = "true";
console.log(process.env.SHELL_ONLY); // => undefined
```

### .envファイルの読み込み

```typescript
import { $ } from "bun";

// Bunは.envファイルを自動読み込みする
// .env ファイル:
// DATABASE_URL=postgres://localhost:5432/mydb
// API_KEY=secret123

// 自動的に利用可能
await $`echo $DATABASE_URL`;

// 手動で読み込む場合
const envContent = await Bun.file(".env.production").text();
const envVars: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const [key, ...valueParts] = line.split("=");
  if (key && !key.startsWith("#")) {
    envVars[key.trim()] = valueParts.join("=").trim();
  }
}

$.env = { ...$.env, ...envVars };
await $`echo "Production DB: $DATABASE_URL"`;
```

## globパターン

### ファイルパターンマッチング

```typescript
import { $ } from "bun";

// ワイルドカード: すべてのTypeScriptファイル
await $`ls *.ts`;

// 再帰的glob: ディレクトリを再帰的に検索
await $`ls **/*.ts`;

// 複数パターン
await $`ls **/*.{ts,tsx,js,jsx}`;

// 除外パターン
const files = await $`ls **/*.ts`.text();
const filtered = files.split("\n").filter(f => !f.includes("node_modules"));
console.log(filtered);
```

### globを使ったファイル操作

```typescript
import { $ } from "bun";
import { Glob } from "bun";

// Bun.Globを組み合わせた高度なパターンマッチング
const glob = new Glob("src/**/*.test.ts");
const testFiles: string[] = [];

for await (const file of glob.scan({ cwd: "." })) {
  testFiles.push(file);
}

console.log(`テストファイル数: ${testFiles.length}`);

// Bun Shellでglobの結果を使う
for (const file of testFiles) {
  const lineCount = await $`wc -l < ${file}`.text();
  console.log(`${file}: ${lineCount.trim()} lines`);
}
```

## エラーハンドリング

### デフォルトのエラー動作

Bun Shellはデフォルトで非ゼロの終了コードを例外としてスローします。

```typescript
import { $ } from "bun";

// デフォルト: 失敗すると例外がスローされる
try {
  await $`cat nonexistent-file.txt`;
} catch (err) {
  console.error("コマンド失敗:", err.message);
  console.error("終了コード:", err.exitCode);
  console.error("標準エラー出力:", err.stderr.toString());
}
```

### .nothrow()でエラーを抑制

```typescript
import { $ } from "bun";

// .nothrow()で例外を抑制
const result = await $`cat nonexistent-file.txt`.nothrow();

if (result.exitCode !== 0) {
  console.log("コマンドは失敗しましたが、プログラムは継続します");
  console.log("終了コード:", result.exitCode);
  console.log("stderr:", result.stderr.toString());
}

// グローバルに.nothrow()を設定
$.nothrow();
// 以降のすべてのコマンドで例外がスローされなくなる
await $`false`; // 例外なし
```

### .throws()で例外動作を明示

```typescript
import { $ } from "bun";

// .throws(false)でnothrowと同じ動作
const result = await $`exit 1`.throws(false);
console.log(result.exitCode); // => 1

// .throws(true)がデフォルト動作
try {
  await $`exit 1`.throws(true);
} catch (err) {
  console.error("期待通り例外がスローされました");
}
```

### 実践的なエラーハンドリングパターン

```typescript
import { $ } from "bun";

// リトライパターン
async function runWithRetry(
  command: string,
  maxRetries: number = 3
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    const result = await $`${{ raw: command }}`.nothrow();
    if (result.exitCode === 0) {
      return result.text();
    }
    console.warn(
      `試行 ${i + 1}/${maxRetries} 失敗 (終了コード: ${result.exitCode})`
    );
    // 指数バックオフ
    await Bun.sleep(1000 * Math.pow(2, i));
  }
  throw new Error(`${maxRetries}回の試行後もコマンドが失敗: ${command}`);
}

// タイムアウト付き実行
async function runWithTimeout(
  timeout: number
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const result = await $`long-running-command`.nothrow();
    return result.text();
  } finally {
    clearTimeout(timer);
  }
}

// 複数コマンドの並列実行とエラー集約
async function runParallel(commands: string[]): Promise<{
  successes: string[];
  failures: { command: string; error: string }[];
}> {
  const results = await Promise.allSettled(
    commands.map(cmd => $`${{ raw: cmd }}`.text())
  );

  const successes: string[] = [];
  const failures: { command: string; error: string }[] = [];

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      successes.push(result.value);
    } else {
      failures.push({
        command: commands[i],
        error: result.reason.message,
      });
    }
  });

  return { successes, failures };
}
```

## .quiet()と出力制御

### 出力の抑制

```typescript
import { $ } from "bun";

// 標準出力を抑制（コンソールに表示しない）
await $`echo "This won't be printed"`.quiet();

// 出力は取得可能
const text = await $`echo "Silent but captured"`.quiet().text();
console.log(text); // => "Silent but captured"

// グローバルにquietを設定
$.quiet();
await $`echo "Globally silenced"`;

// 特定のコマンドだけ出力する
$.quiet();
const output = await $`ls -la`.text();
console.log(output); // 手動で出力
```

## カスタムシェルの作成

### $.escape()によるカスタムエスケープ

```typescript
import { $ } from "bun";

// カスタムエスケープ関数
const custom$ = new $.Shell();

custom$.escape = (input: string) => {
  // カスタムエスケープロジック
  if (/^[a-zA-Z0-9_/.-]+$/.test(input)) {
    return input;
  }
  return `'${input.replace(/'/g, "'\\''")}'`;
};

await custom$`echo ${"Hello World"}`;
```

### cwd（作業ディレクトリ）の設定

```typescript
import { $ } from "bun";

// グローバルに作業ディレクトリを変更
$.cwd("/tmp");
await $`pwd`; // => /tmp

// コマンド単位で作業ディレクトリを指定
await $`pwd`.cwd("/home");
// => /home

// 元のディレクトリには影響しない
await $`pwd`;
// => /tmp（グローバル設定のまま）

// プロジェクトルートを基準にする例
const projectRoot = import.meta.dir;
await $`ls src/`.cwd(projectRoot);
```

## rawコマンドの実行

### ${{ raw: string }}の使い方

変数をエスケープせずにそのまま展開したい場合は`raw`を使います。

```typescript
import { $ } from "bun";

// 通常の変数埋め込み（エスケープされる）
const pattern = "*.ts";
await $`ls ${pattern}`;
// => ls '*.ts' （リテラルとして扱われる）

// rawで展開（エスケープされない）
await $`ls ${{ raw: pattern }}`;
// => ls *.ts （globとして展開される）

// 動的なコマンド構築
const sortFlag = "--sort=size";
const grepPattern = "error|warning";
await $`ls -la ${{ raw: sortFlag }} | grep -E ${{ raw: grepPattern }}`;

// 注意: rawはインジェクションリスクがあるため、
// 信頼できない入力には絶対に使わないこと
```

## zx・execaとの比較

### Google zx との比較

```typescript
// === Google zx ===
// 外部パッケージのインストールが必要: npm install zx
import { $ } from "zx";

// zx: Node.js上で動作、child_processベース
await $`echo "Hello from zx"`;
const result = await $`ls -la`;
console.log(result.stdout);

// zx: Windowsでの互換性に問題
// zx: 起動時間が遅い（Node.js + npmのオーバーヘッド）


// === Bun Shell ===
// 組み込み: 追加インストール不要
import { $ } from "bun";

// Bun Shell: クロスプラットフォーム対応
await $`echo "Hello from Bun Shell"`;
const output = await $`ls -la`.text();
console.log(output);

// Bun Shell: 起動が高速（Bunランタイムに組み込み）
// Bun Shell: Windowsでもネイティブ対応
```

### 機能比較表

```typescript
/**
 * 機能比較表
 *
 * | 機能                    | Bun Shell      | zx             | execa          |
 * |------------------------|----------------|----------------|----------------|
 * | インストール            | 不要（組み込み）| npm install zx | npm install execa |
 * | ランタイム              | Bun            | Node.js        | Node.js        |
 * | テンプレートリテラル     | $`cmd`         | $`cmd`         | $`cmd` (v9+)   |
 * | クロスプラットフォーム   | ◎ ネイティブ   | △ 部分対応     | △ 部分対応     |
 * | パイプ                  | ◎ .pipe()      | ◎ .pipe()      | ○ pipeStdout   |
 * | 自動エスケープ          | ◎              | ○              | ◎              |
 * | glob対応               | ◎ ネイティブ   | △ 外部依存     | × なし         |
 * | 起動速度               | ◎ 3ms          | △ 150ms+       | △ 150ms+       |
 * | TypeScript             | ◎ ネイティブ   | ○ ts-nodeが必要 | ○ ts-nodeが必要 |
 * | .env自動読み込み       | ◎              | × 手動         | × 手動         |
 * | quiet/nothrow          | ◎              | ○ $.verbose    | △              |
 * | Node.js互換            | △ Bun専用      | ◎              | ◎              |
 */
```

### execaとの比較

```typescript
// === execa ===
import { execa, $ as execa$ } from "execa";

// execa: 関数ベースの呼び出し
const { stdout } = await execa("echo", ["Hello"]);
console.log(stdout);

// execa v9+: テンプレートリテラル対応
const result = await execa$`echo Hello`;
console.log(result.stdout);


// === Bun Shell ===
import { $ } from "bun";

// Bun Shell: より自然なシェル構文
const output = await $`echo Hello`.text();
console.log(output);

// Bun Shell: パイプがシェル構文そのまま
await $`cat file.txt | grep pattern | sort | uniq`;

// execa: パイプは明示的に記述が必要
// const result = await execa("cat", ["file.txt"]);
// const grepped = await execa("grep", ["pattern"], { input: result.stdout });
```

## パフォーマンス比較

### Bash vs Bun Shell

```typescript
import { $ } from "bun";

// ベンチマーク: 1000個のファイル作成
console.time("bun-shell");
for (let i = 0; i < 1000; i++) {
  await $`touch /tmp/bun-test-${i}.txt`.quiet();
}
console.timeEnd("bun-shell");

// Bashの場合（同等のスクリプト）:
// #!/bin/bash
// for i in $(seq 0 999); do
//   touch /tmp/bash-test-$i.txt
// done
//
// 結果例:
// Bash: ~2.5秒
// Bun Shell: ~1.2秒

// クリーンアップ
await $`rm -f /tmp/bun-test-*.txt`.quiet();
```

### 起動時間の比較

```typescript
/**
 * 起動時間比較（`time` コマンドによる計測）
 *
 * echo "hello" を実行するだけのスクリプト:
 *
 * bash script.sh:      ~3ms
 * bun script.ts:       ~7ms（TypeScript解析含む）
 * node + zx script.mjs: ~180ms
 * node + execa script.mjs: ~160ms
 *
 * Bun ShellはBash並みの起動速度でありながら、
 * TypeScriptの型安全性とJavaScriptの表現力を提供する
 */
```

### 大量ファイル処理のベンチマーク

```typescript
import { $ } from "bun";

// 10,000行のログファイルを処理するベンチマーク

// Bun Shell: パイプライン
console.time("bun-pipeline");
const errorCount = await $`cat large-log.txt | grep "ERROR" | wc -l`.text();
console.timeEnd("bun-pipeline");

// Bun JavaScript: ネイティブ処理
console.time("bun-native");
const file = Bun.file("large-log.txt");
const content = await file.text();
const nativeCount = content
  .split("\n")
  .filter(line => line.includes("ERROR")).length;
console.timeEnd("bun-native");

// 結果例:
// bun-pipeline: ~45ms
// bun-native: ~12ms
// bash equivalent: ~50ms
//
// JavaScript直接処理が最も高速だが、
// パイプラインは可読性で有利
```

## 実践例: ビルドスクリプト

### プロジェクトビルドの自動化

```typescript
// scripts/build.ts
import { $ } from "bun";

const startTime = performance.now();

console.log("=== ビルド開始 ===\n");

// Step 1: クリーンアップ
console.log("1. クリーンアップ...");
await $`rm -rf dist`.quiet();
await $`mkdir -p dist`.quiet();

// Step 2: 型チェック
console.log("2. 型チェック...");
try {
  await $`bunx tsc --noEmit`.quiet();
  console.log("   型チェック: OK");
} catch {
  console.error("   型チェック: エラーあり");
  process.exit(1);
}

// Step 3: リント
console.log("3. リント...");
await $`bunx biome check src/`.quiet();
console.log("   リント: OK");

// Step 4: テスト
console.log("4. テスト実行...");
await $`bun test`.quiet();
console.log("   テスト: OK");

// Step 5: ビルド
console.log("5. ビルド...");
await $`bun build src/index.ts --outdir dist --target node`.quiet();
console.log("   ビルド: OK");

// Step 6: ビルドサイズの確認
const size = await $`du -sh dist/`.text();
console.log(`\n   ビルドサイズ: ${size.trim()}`);

const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
console.log(`\n=== ビルド完了 (${elapsed}秒) ===`);
```

### モノレポ向けビルドスクリプト

```typescript
// scripts/build-all.ts
import { $ } from "bun";
import { Glob } from "bun";

interface PackageInfo {
  name: string;
  path: string;
  dependencies: string[];
}

// パッケージの検出
const glob = new Glob("packages/*/package.json");
const packages: PackageInfo[] = [];

for await (const file of glob.scan({ cwd: "." })) {
  const pkg = await Bun.file(file).json();
  packages.push({
    name: pkg.name,
    path: file.replace("/package.json", ""),
    dependencies: Object.keys(pkg.dependencies || {}),
  });
}

console.log(`検出されたパッケージ: ${packages.length}`);

// 依存関係順にビルド
for (const pkg of packages) {
  console.log(`\nビルド中: ${pkg.name}`);

  await $`bun run build`.cwd(pkg.path).quiet();

  // ビルド成果物の確認
  const distExists = await $`test -d ${pkg.path}/dist`.nothrow();
  if (distExists.exitCode === 0) {
    const size = await $`du -sh ${pkg.path}/dist`.text();
    console.log(`  完了: ${size.trim()}`);
  } else {
    console.log("  完了: (distなし)");
  }
}

console.log("\n全パッケージのビルドが完了しました");
```

## 実践例: ファイル処理

### ログファイルの分析

```typescript
// scripts/analyze-logs.ts
import { $ } from "bun";

const logDir = process.argv[2] || "./logs";

console.log(`=== ログ分析: ${logDir} ===\n`);

// エラーログの集計
const errorLines = await $`grep -r "ERROR" ${logDir} 2>/dev/null | wc -l`
  .nothrow()
  .text();
console.log(`エラー件数: ${errorLines.trim()}`);

// 警告ログの集計
const warnLines = await $`grep -r "WARN" ${logDir} 2>/dev/null | wc -l`
  .nothrow()
  .text();
console.log(`警告件数: ${warnLines.trim()}`);

// 最も多いエラーのTOP10
console.log("\n--- エラーTOP10 ---");
const topErrors = await $`
  grep -rh "ERROR" ${logDir} 2>/dev/null
    | sed 's/.*ERROR //'
    | sort
    | uniq -c
    | sort -rn
    | head -10
`.nothrow().text();

if (topErrors.trim()) {
  console.log(topErrors);
} else {
  console.log("エラーはありません");
}

// 時間帯別エラー分布
console.log("\n--- 時間帯別エラー分布 ---");
for (let hour = 0; hour < 24; hour++) {
  const h = hour.toString().padStart(2, "0");
  const count = await $`
    grep -r "^${h}:" ${logDir} 2>/dev/null | grep "ERROR" | wc -l
  `.nothrow().text();
  const bar = "█".repeat(parseInt(count.trim()) || 0);
  console.log(`${h}時: ${bar} (${count.trim()})`);
}
```

### CSVファイルの処理

```typescript
// scripts/process-csv.ts
import { $ } from "bun";

// CSVの基本操作
const inputFile = "data/sales.csv";

// ヘッダーの取得
const header = await $`head -1 ${inputFile}`.text();
console.log("カラム:", header.trim());

// 行数の取得（ヘッダー除く）
const rowCount = await $`tail -n +2 ${inputFile} | wc -l`.text();
console.log(`データ行数: ${rowCount.trim()}`);

// 特定カラムの集計（3列目が金額の場合）
const total = await $`
  tail -n +2 ${inputFile}
    | cut -d',' -f3
    | paste -sd+
    | bc
`.nothrow().text();
console.log(`合計金額: ¥${total.trim()}`);

// 月別集計
console.log("\n--- 月別売上 ---");
const monthlySales = await $`
  tail -n +2 ${inputFile}
    | awk -F',' '{split($1,d,"-"); print d[1]"-"d[2], $3}'
    | awk '{a[$1]+=$2} END {for(k in a) print k, a[k]}'
    | sort
`.nothrow().text();
console.log(monthlySales);

// フィルタリングして新規CSVに出力
await $`
  head -1 ${inputFile} > data/filtered.csv
  tail -n +2 ${inputFile} | awk -F',' '$3 >= 10000' >> data/filtered.csv
`;
console.log("\n10,000円以上のデータを data/filtered.csv に出力しました");
```

### 画像ファイルの一括処理

```typescript
// scripts/optimize-images.ts
import { $ } from "bun";
import { Glob } from "bun";

const imageDir = "public/images";

// 画像ファイルの検出
const glob = new Glob("**/*.{png,jpg,jpeg,webp}");
const images: string[] = [];

for await (const file of glob.scan({ cwd: imageDir })) {
  images.push(file);
}

console.log(`画像ファイル数: ${images.length}`);

// ファイルサイズの一覧
let totalSize = 0;
for (const img of images) {
  const fullPath = `${imageDir}/${img}`;
  const size = await $`stat -f%z ${fullPath} 2>/dev/null || stat -c%s ${fullPath}`.nothrow().text();
  const sizeNum = parseInt(size.trim()) || 0;
  totalSize += sizeNum;
  if (sizeNum > 500_000) {
    console.log(`  警告: ${img} (${(sizeNum / 1024).toFixed(0)}KB) - 500KB超過`);
  }
}
console.log(`合計サイズ: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);

// WebPへの変換（cwebpが利用可能な場合）
const cwebpExists = await $`which cwebp`.nothrow();
if (cwebpExists.exitCode === 0) {
  console.log("\nWebP変換を開始...");
  for (const img of images.filter(f => !f.endsWith(".webp"))) {
    const fullPath = `${imageDir}/${img}`;
    const webpPath = fullPath.replace(/\.(png|jpg|jpeg)$/, ".webp");
    await $`cwebp -q 80 ${fullPath} -o ${webpPath}`.quiet();
    console.log(`  変換: ${img} → ${img.replace(/\.(png|jpg|jpeg)$/, ".webp")}`);
  }
} else {
  console.log("\ncwebpが見つかりません。brew install webp でインストールしてください。");
}
```

## 実践例: デプロイ自動化

### Vercelへのデプロイ

```typescript
// scripts/deploy.ts
import { $ } from "bun";

const env = process.argv[2] || "preview";

console.log(`=== デプロイ開始: ${env} ===\n`);

// 事前チェック
console.log("1. 事前チェック...");

// 未コミットの変更がないか確認
const status = await $`git status --porcelain`.text();
if (status.trim()) {
  console.error("未コミットの変更があります:");
  console.error(status);
  process.exit(1);
}

// 現在のブランチ確認
const branch = await $`git branch --show-current`.text();
console.log(`   ブランチ: ${branch.trim()}`);

// ビルド
console.log("2. ビルド...");
await $`bun run build`.quiet();
console.log("   ビルド完了");

// テスト
console.log("3. テスト...");
await $`bun test`.quiet();
console.log("   テスト完了");

// デプロイ
console.log("4. デプロイ中...");
if (env === "production") {
  const commitHash = await $`git rev-parse --short HEAD`.text();
  console.log(`   コミット: ${commitHash.trim()}`);
  await $`bunx vercel --prod --yes`.quiet();
  console.log("   本番デプロイ完了");
} else {
  await $`bunx vercel --yes`.quiet();
  console.log("   プレビューデプロイ完了");
}

// デプロイ後のヘルスチェック
console.log("5. ヘルスチェック...");
const siteUrl =
  env === "production"
    ? "https://mysite.vercel.app"
    : "https://mysite-preview.vercel.app";

const healthCheck = await $`curl -s -o /dev/null -w "%{http_code}" ${siteUrl}`.nothrow().text();

if (healthCheck.trim() === "200") {
  console.log(`   ${siteUrl}: OK (200)`);
} else {
  console.error(`   ${siteUrl}: 異常 (${healthCheck.trim()})`);
}

console.log(`\n=== デプロイ完了: ${env} ===`);
```

### Docker/コンテナデプロイ

```typescript
// scripts/docker-deploy.ts
import { $ } from "bun";

const IMAGE_NAME = "myapp";
const REGISTRY = "ghcr.io/myorg";
const VERSION = await $`git describe --tags --always`.text();
const TAG = VERSION.trim();

console.log(`=== Dockerイメージビルド: ${IMAGE_NAME}:${TAG} ===\n`);

// Step 1: Dockerイメージのビルド
console.log("1. Dockerイメージビルド...");
await $`docker build -t ${IMAGE_NAME}:${TAG} -t ${IMAGE_NAME}:latest .`;
console.log("   ビルド完了");

// Step 2: イメージサイズの確認
const imageSize = await $`docker images ${IMAGE_NAME}:${TAG} --format "{{.Size}}"`.text();
console.log(`   イメージサイズ: ${imageSize.trim()}`);

// Step 3: コンテナのテスト実行
console.log("2. コンテナテスト...");
await $`docker run --rm -d --name ${IMAGE_NAME}-test -p 3001:3000 ${IMAGE_NAME}:${TAG}`.quiet();

// ヘルスチェック
await Bun.sleep(3000);
const health = await $`curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health`.nothrow().text();
console.log(`   ヘルスチェック: ${health.trim()}`);

// テストコンテナの停止
await $`docker stop ${IMAGE_NAME}-test`.quiet();
console.log("   テスト完了");

// Step 4: レジストリへのプッシュ
console.log("3. レジストリへプッシュ...");
await $`docker tag ${IMAGE_NAME}:${TAG} ${REGISTRY}/${IMAGE_NAME}:${TAG}`;
await $`docker tag ${IMAGE_NAME}:latest ${REGISTRY}/${IMAGE_NAME}:latest`;
await $`docker push ${REGISTRY}/${IMAGE_NAME}:${TAG}`;
await $`docker push ${REGISTRY}/${IMAGE_NAME}:latest`;
console.log(`   プッシュ完了: ${REGISTRY}/${IMAGE_NAME}:${TAG}`);

console.log(`\n=== デプロイ完了 ===`);
```

## 実践例: CI/CDスクリプト

### GitHub Actions用スクリプト

```typescript
// scripts/ci.ts
import { $ } from "bun";

const isCI = process.env.CI === "true";
const isPR = !!process.env.GITHUB_HEAD_REF;

console.log(`=== CI パイプライン ===`);
console.log(`環境: ${isCI ? "CI" : "ローカル"}`);
console.log(`PR: ${isPR ? "はい" : "いいえ"}\n`);

// Step 1: 依存関係のインストール
console.log("📦 依存関係インストール...");
await $`bun install --frozen-lockfile`.quiet();

// Step 2: 型チェック
console.log("🔍 型チェック...");
try {
  await $`bunx tsc --noEmit`.quiet();
  console.log("   OK");
} catch {
  console.error("   型エラーが見つかりました");
  process.exit(1);
}

// Step 3: リント
console.log("🧹 リント...");
try {
  await $`bunx biome check src/ --error-on-warnings`.quiet();
  console.log("   OK");
} catch {
  console.error("   リントエラーが見つかりました");
  process.exit(1);
}

// Step 4: テスト
console.log("🧪 テスト...");
try {
  await $`bun test --coverage`.quiet();
  console.log("   OK");
} catch {
  console.error("   テストが失敗しました");
  process.exit(1);
}

// Step 5: ビルド
console.log("🏗️ ビルド...");
await $`bun run build`.quiet();
console.log("   OK");

// Step 6: ビルド成果物のサイズチェック
console.log("📊 ビルドサイズ...");
const distSize = await $`du -sh dist/`.text();
console.log(`   ${distSize.trim()}`);

// サイズ制限チェック（10MB超過で警告）
const sizeBytes = await $`du -sb dist/ | cut -f1`.text();
const sizeMB = parseInt(sizeBytes.trim()) / 1024 / 1024;
if (sizeMB > 10) {
  console.warn(`   警告: ビルドサイズが10MBを超えています (${sizeMB.toFixed(2)}MB)`);
}

// PRの場合: 変更されたファイルの一覧
if (isPR) {
  console.log("\n📋 変更ファイル...");
  const changedFiles = await $`git diff --name-only origin/main...HEAD`.text();
  console.log(changedFiles);
}

console.log("\n=== CI パイプライン完了 ===");
```

### GitHub Actionsワークフローとの連携

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Run CI Pipeline
        run: bun run scripts/ci.ts
        env:
          CI: true
```

### リリース自動化スクリプト

```typescript
// scripts/release.ts
import { $ } from "bun";

const bumpType = process.argv[2]; // "patch" | "minor" | "major"

if (!["patch", "minor", "major"].includes(bumpType)) {
  console.error("使い方: bun run scripts/release.ts <patch|minor|major>");
  process.exit(1);
}

// 現在のバージョン取得
const pkgJson = await Bun.file("package.json").json();
const currentVersion = pkgJson.version;
console.log(`現在のバージョン: v${currentVersion}`);

// バージョンバンプ
const [major, minor, patch] = currentVersion.split(".").map(Number);
let newVersion: string;

switch (bumpType) {
  case "major":
    newVersion = `${major + 1}.0.0`;
    break;
  case "minor":
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case "patch":
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
  default:
    throw new Error("不正なバンプタイプ");
}

console.log(`新バージョン: v${newVersion}\n`);

// テスト実行
console.log("テスト実行中...");
await $`bun test`.quiet();
console.log("テスト: OK\n");

// バージョン更新
pkgJson.version = newVersion;
await Bun.write("package.json", JSON.stringify(pkgJson, null, 2) + "\n");

// CHANGELOG生成
console.log("CHANGELOG生成中...");
const lastTag = await $`git describe --tags --abbrev=0 2>/dev/null || echo ""`.nothrow().text();

let changelog: string;
if (lastTag.trim()) {
  changelog = await $`git log ${lastTag.trim()}..HEAD --pretty=format:"- %s (%h)"`.text();
} else {
  changelog = await $`git log --pretty=format:"- %s (%h)" -20`.text();
}

const changelogEntry = `## v${newVersion} (${new Date().toISOString().split("T")[0]})\n\n${changelog}\n\n`;
const existingChangelog = await Bun.file("CHANGELOG.md").text().catch(() => "# Changelog\n\n");
await Bun.write("CHANGELOG.md", existingChangelog.replace("# Changelog\n\n", `# Changelog\n\n${changelogEntry}`));

// コミットとタグ
console.log("コミット & タグ作成...");
await $`git add package.json CHANGELOG.md`;
await $`git commit -m "chore: release v${newVersion}"`;
await $`git tag v${newVersion}`;

console.log(`\nリリース v${newVersion} の準備完了`);
console.log("プッシュするには: git push && git push --tags");
```

## 実践例: 開発ユーティリティ

### データベースマイグレーション

```typescript
// scripts/db-migrate.ts
import { $ } from "bun";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL が設定されていません");
  process.exit(1);
}

const command = process.argv[2] || "status";

switch (command) {
  case "status":
    console.log("マイグレーション状態:");
    await $`bunx prisma migrate status`;
    break;

  case "up":
    console.log("マイグレーション実行中...");
    await $`bunx prisma migrate deploy`;
    console.log("完了");
    break;

  case "create": {
    const name = process.argv[3];
    if (!name) {
      console.error("マイグレーション名を指定してください");
      process.exit(1);
    }
    await $`bunx prisma migrate dev --name ${name}`;
    break;
  }

  case "reset":
    console.log("データベースをリセットします...");
    await $`bunx prisma migrate reset --force`;
    console.log("リセット完了");
    break;

  case "seed":
    console.log("シードデータ投入中...");
    await $`bun run prisma/seed.ts`;
    console.log("完了");
    break;

  default:
    console.log("使い方: bun run scripts/db-migrate.ts <status|up|create|reset|seed>");
}
```

### 開発サーバー管理

```typescript
// scripts/dev.ts
import { $ } from "bun";

// 複数のサービスを並行起動
console.log("=== 開発環境起動 ===\n");

// ポートが使用中でないか確認
const ports = [3000, 3001, 5432];
for (const port of ports) {
  const inUse = await $`lsof -i :${port} -t`.nothrow().text();
  if (inUse.trim()) {
    console.log(`ポート ${port} は使用中です (PID: ${inUse.trim()})`);
    const kill = process.argv.includes("--force");
    if (kill) {
      await $`kill -9 ${inUse.trim()}`.nothrow();
      console.log(`  → 強制終了しました`);
    }
  }
}

// 依存関係チェック
console.log("依存関係チェック...");
const nodeModulesExists = await $`test -d node_modules`.nothrow();
if (nodeModulesExists.exitCode !== 0) {
  console.log("node_modules が見つかりません。インストールします...");
  await $`bun install`;
}

// 型生成（Prisma等）
console.log("型生成...");
await $`bunx prisma generate`.quiet().nothrow();

// 開発サーバー起動
console.log("\nサービス起動中...\n");

const processes = [
  $`bun run --watch src/server.ts`.nothrow(),
  $`bunx tailwindcss -i src/input.css -o dist/output.css --watch`.quiet().nothrow(),
];

console.log("開発サーバー: http://localhost:3000");
console.log("終了するには Ctrl+C を押してください\n");

await Promise.all(processes);
```

### ヘルスチェックスクリプト

```typescript
// scripts/health-check.ts
import { $ } from "bun";

interface ServiceStatus {
  name: string;
  url: string;
  status: "OK" | "ERROR";
  responseTime: number;
  statusCode: string;
}

const services = [
  { name: "API Server", url: "http://localhost:3000/health" },
  { name: "Frontend", url: "http://localhost:3001" },
  { name: "Database", url: "http://localhost:5432" },
];

const results: ServiceStatus[] = [];

for (const service of services) {
  const start = performance.now();
  const result = await $`
    curl -s -o /dev/null -w "%{http_code}" --max-time 5 ${service.url}
  `.nothrow().text();
  const elapsed = performance.now() - start;

  results.push({
    name: service.name,
    url: service.url,
    status: result.trim() === "200" ? "OK" : "ERROR",
    responseTime: Math.round(elapsed),
    statusCode: result.trim(),
  });
}

// 結果表示
console.log("=== ヘルスチェック結果 ===\n");
console.log("サービス名       | ステータス | レスポンス時間 | HTTPコード");
console.log("---------------- | --------- | ------------- | ---------");

for (const r of results) {
  const statusIcon = r.status === "OK" ? "OK   " : "ERROR";
  console.log(
    `${r.name.padEnd(16)} | ${statusIcon}     | ${String(r.responseTime).padStart(8)}ms    | ${r.statusCode}`
  );
}

// 異常があれば終了コード1
const hasError = results.some(r => r.status === "ERROR");
if (hasError) {
  console.log("\n異常のあるサービスがあります");
  process.exit(1);
}
```

## 実践例: Git操作の自動化

### コミット前のチェックスクリプト

```typescript
// scripts/pre-commit.ts
import { $ } from "bun";

console.log("=== Pre-commit チェック ===\n");

// ステージされたファイルの取得
const stagedFiles = await $`git diff --cached --name-only --diff-filter=ACM`.text();
const files = stagedFiles.trim().split("\n").filter(Boolean);

if (files.length === 0) {
  console.log("ステージされたファイルがありません");
  process.exit(0);
}

console.log(`チェック対象: ${files.length} ファイル\n`);

// TypeScript/JavaScriptファイルのリント
const tsFiles = files.filter(f => /\.(ts|tsx|js|jsx)$/.test(f));
if (tsFiles.length > 0) {
  console.log("TypeScript/JSリント...");
  try {
    await $`bunx biome check ${tsFiles.join(" ")}`.quiet();
    console.log("  OK\n");
  } catch {
    console.error("  リントエラーがあります。修正してください。\n");
    process.exit(1);
  }
}

// 大きなファイルのチェック
console.log("ファイルサイズチェック...");
for (const file of files) {
  const size = await $`stat -f%z ${file} 2>/dev/null || stat -c%s ${file}`.nothrow().text();
  const sizeKB = parseInt(size.trim()) / 1024;
  if (sizeKB > 500) {
    console.error(`  警告: ${file} が500KBを超えています (${sizeKB.toFixed(0)}KB)`);
  }
}
console.log("  OK\n");

// 秘密情報のチェック
console.log("秘密情報チェック...");
const secrets = ["API_KEY", "SECRET", "PASSWORD", "TOKEN", "PRIVATE_KEY"];
for (const file of files) {
  for (const keyword of secrets) {
    const found = await $`grep -l "${keyword}=" ${file} 2>/dev/null`.nothrow().text();
    if (found.trim()) {
      console.error(`  警告: ${file} に ${keyword} が含まれている可能性があります`);
    }
  }
}
console.log("  OK\n");

console.log("=== 全チェック通過 ===");
```

### ブランチ管理ユーティリティ

```typescript
// scripts/branch-cleanup.ts
import { $ } from "bun";

console.log("=== ブランチクリーンアップ ===\n");

// マージ済みブランチの一覧
const mergedBranches = await $`
  git branch --merged main | grep -v "main" | grep -v "\\*"
`.nothrow().text();

const branches = mergedBranches
  .trim()
  .split("\n")
  .map(b => b.trim())
  .filter(Boolean);

if (branches.length === 0) {
  console.log("削除対象のブランチはありません");
  process.exit(0);
}

console.log("マージ済みブランチ:");
for (const branch of branches) {
  const lastCommit = await $`git log -1 --format="%ar" ${branch}`.text();
  console.log(`  - ${branch} (最終コミット: ${lastCommit.trim()})`);
}

// ドライランモード
const isDryRun = !process.argv.includes("--delete");
if (isDryRun) {
  console.log("\n削除するには --delete オプションを付けてください");
  console.log("例: bun run scripts/branch-cleanup.ts --delete");
} else {
  console.log("\nブランチを削除中...");
  for (const branch of branches) {
    await $`git branch -d ${branch}`;
    console.log(`  削除: ${branch}`);
  }
  console.log("完了");
}
```

## 高度なテクニック

### ShellPromiseの連鎖

```typescript
import { $ } from "bun";

// 条件付きコマンド実行
const nodeVersion = await $`node --version 2>/dev/null`.nothrow().text();
if (nodeVersion.trim()) {
  console.log(`Node.js: ${nodeVersion.trim()}`);
} else {
  console.log("Node.jsがインストールされていません");
}

// 並列実行
const [gitBranch, gitStatus, gitLog] = await Promise.all([
  $`git branch --show-current`.text(),
  $`git status --short`.text(),
  $`git log --oneline -5`.text(),
]);

console.log(`ブランチ: ${gitBranch.trim()}`);
console.log(`ステータス:\n${gitStatus}`);
console.log(`最近のコミット:\n${gitLog}`);
```

### Bun.spawnとの組み合わせ

```typescript
import { $ } from "bun";

// Bun.spawnでより細かい制御が必要な場合
const proc = Bun.spawn(["ffmpeg", "-i", "input.mp4", "-c:v", "libx264", "output.mp4"], {
  stdout: "pipe",
  stderr: "pipe",
  onExit(proc, exitCode) {
    console.log(`ffmpeg 終了: ${exitCode}`);
  },
});

// Bun Shellで簡単な前後処理を行う
const inputSize = await $`du -sh input.mp4`.text();
console.log(`入力ファイル: ${inputSize.trim()}`);

await proc.exited;

const outputSize = await $`du -sh output.mp4`.nothrow().text();
console.log(`出力ファイル: ${outputSize.trim()}`);
```

### プラットフォーム判定

```typescript
import { $ } from "bun";

// OS判定によるコマンド分岐
const platform = process.platform;

async function openBrowser(url: string) {
  switch (platform) {
    case "darwin":
      await $`open ${url}`;
      break;
    case "linux":
      await $`xdg-open ${url}`;
      break;
    case "win32":
      await $`start ${url}`;
      break;
  }
}

async function copyToClipboard(text: string) {
  switch (platform) {
    case "darwin":
      await $`echo ${text} | pbcopy`;
      break;
    case "linux":
      await $`echo ${text} | xclip -selection clipboard`;
      break;
    case "win32":
      await $`echo ${text} | clip`;
      break;
  }
}

async function getSystemInfo(): Promise<string> {
  if (platform === "darwin") {
    return await $`sw_vers`.text();
  } else if (platform === "linux") {
    return await $`cat /etc/os-release`.text();
  }
  return "Unknown OS";
}

// 使用例
await openBrowser("http://localhost:3000");
await copyToClipboard("Hello from Bun Shell!");
console.log(await getSystemInfo());
```

## package.jsonとの統合

### scriptsフィールドでの活用

```json
{
  "name": "my-project",
  "scripts": {
    "dev": "bun run scripts/dev.ts",
    "build": "bun run scripts/build.ts",
    "test": "bun test",
    "lint": "bun run scripts/lint.ts",
    "deploy": "bun run scripts/deploy.ts",
    "deploy:prod": "bun run scripts/deploy.ts production",
    "db:migrate": "bun run scripts/db-migrate.ts up",
    "db:seed": "bun run scripts/db-migrate.ts seed",
    "health": "bun run scripts/health-check.ts",
    "release": "bun run scripts/release.ts"
  }
}
```

### bunfig.tomlの設定

```toml
# bunfig.toml

[run]
# シェルの設定
shell = "bun"

[install]
# パッケージインストールの設定
auto = "disable"

[test]
# テストの設定
coverage = true
coverageDir = "coverage"
```

## セキュリティのベストプラクティス

### 入力のバリデーション

```typescript
import { $ } from "bun";

// 安全: テンプレートリテラルによる自動エスケープ
const userInput = "hello; rm -rf /";
await $`echo ${userInput}`;
// => hello; rm -rf /  （安全にエスケープされる）

// 危険: rawの不適切な使用
// await $`${{ raw: userInput }}`; // 絶対にやらない！

// 入力バリデーションの例
function validateFileName(name: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(name);
}

const fileName = process.argv[2] || "";
if (!validateFileName(fileName)) {
  console.error("不正なファイル名です");
  process.exit(1);
}

// バリデーション済みの値は安全に使用可能
await $`cat ${fileName}`;
```

### 機密情報の管理

```typescript
import { $ } from "bun";

// .envファイルから機密情報を読み込み
// Bunは.envを自動読み込みする

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.error("API_KEY が設定されていません");
  process.exit(1);
}

// 環境変数として渡す（コマンドラインに表示されない）
await $`curl -H "Authorization: Bearer $API_KEY" https://api.example.com/data`.env({
  API_KEY,
});

// ログに機密情報を出力しない
console.log("APIキー:", API_KEY.substring(0, 4) + "****");
```

## トラブルシューティング

### よくある問題と解決策

```typescript
import { $ } from "bun";

// 問題1: コマンドが見つからない
try {
  await $`some-command`;
} catch (err) {
  // PATHを確認
  const path = await $`echo $PATH`.text();
  console.log("現在のPATH:", path);

  // コマンドの場所を検索
  const which = await $`which some-command`.nothrow().text();
  if (!which.trim()) {
    console.log("コマンドがインストールされていません");
  }
}

// 問題2: 権限エラー
const result = await $`ls /root`.nothrow();
if (result.exitCode === 1) {
  console.log("権限がありません。sudoが必要かもしれません。");
}

// 問題3: エンコーディング
// Bun ShellはUTF-8をデフォルトで使用
const japaneseText = await $`echo "日本語テスト"`.text();
console.log(japaneseText); // => 日本語テスト

// 問題4: 長時間実行コマンドの監視
const longRunning = $`sleep 30`.nothrow();
const timeout = Bun.sleep(5000).then(() => {
  console.log("タイムアウト: 5秒経過");
});
await Promise.race([longRunning, timeout]);
```

### デバッグテクニック

```typescript
import { $ } from "bun";

// $.verbose()でコマンドの詳細を表示
// 実行されるコマンドがコンソールに出力される

// 実行前にコマンドを確認
const cmd = "ls -la";
console.log(`実行するコマンド: ${cmd}`);
await $`${{ raw: cmd }}`;

// stderrの取得
const result = await $`ls nonexistent 2>&1`.nothrow();
console.log("stdout:", result.stdout.toString());
console.log("stderr:", result.stderr.toString());
console.log("exitCode:", result.exitCode);
```

## まとめ

Bun Shellは、JavaScript/TypeScript開発者にとってシェルスクリプティングを根本から変革するツールです。

### Bun Shellを選ぶべき理由

1. **クロスプラットフォーム**: macOS、Linux、Windowsで同じスクリプトが動作
2. **型安全**: TypeScriptの恩恵をスクリプティングでも享受
3. **高速起動**: Bash並みの起動速度でzx/execaを大きく上回る
4. **ゼロセットアップ**: Bunをインストールするだけで使える
5. **安全なエスケープ**: シェルインジェクションを自動防止
6. **JavaScriptエコシステム**: npm/bunパッケージをそのまま活用可能

### 使い分けの指針

| ユースケース | 推奨ツール |
|-------------|-----------|
| 簡単なワンライナー | Bash/zsh |
| クロスプラットフォームスクリプト | **Bun Shell** |
| CI/CDパイプライン | **Bun Shell** |
| ビルドスクリプト | **Bun Shell** |
| Node.jsプロジェクトのスクリプト | Bun Shell / zx |
| システム管理（root操作） | Bash |

Bun Shellを導入することで、プロジェクトのスクリプティング環境を統一し、チーム全体の生産性を向上させましょう。

## 関連記事

- [Bun完全ガイド2026](/blog/bun-complete-guide-2026)
- [Bun vs Node.js比較2026](/blog/bun-vs-nodejs-2026)
- [Bunテスト完全ガイド](/blog/bun-test-guide)
- [Bun + Honoフルスタック開発](/blog/bun-hono-fullstack)
- [GitHub Actions CI/CDガイド](/blog/github-actions-advanced-guide)

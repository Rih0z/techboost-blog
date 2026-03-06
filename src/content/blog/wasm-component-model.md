---
title: "WebAssembly Component Model 入門 - 次世代のコンポーネント指向開発"
description: "WebAssembly Component Modelの基本から実践まで。WASI、WIT、コンポーネント間通信、言語間の相互運用性を実現する新しいWebAssembly標準を徹底解説。webassembly・wasm・component-modelに関する実践情報。"
pubDate: "2025-02-05"
tags: ['webassembly', 'wasm', 'component-model', 'wasi', 'wit', 'Rust', 'プログラミング']
---
WebAssembly Component Model（WASM Component Model）は、WebAssemblyモジュールを再利用可能なコンポーネントとして構成するための新しい標準です。異なる言語で書かれたコンポーネント同士が型安全に通信できる、次世代のソフトウェア開発パラダイムを実現します。

本記事では、Component Modelの基本概念から実践的な使い方まで、コード例を交えて詳しく解説します。

## Component Modelとは

### 背景

従来のWebAssembly（Core WASM）には以下の制約がありました:

- **プリミティブ型のみ** - 数値（i32, i64, f32, f64）のみサポート
- **メモリ共有の複雑さ** - 文字列や構造体の受け渡しが困難
- **言語依存の境界** - 各言語の独自ABI
- **再利用性の低さ** - モジュール間の連携が難しい

Component Modelはこれらの問題を解決します。

### 主な特徴

1. **豊富な型システム** - 文字列、レコード、バリアント、リストなど
2. **インターフェース定義言語（WIT）** - 明確なコントラクト定義
3. **言語非依存** - Rust、C、C++、Go、JavaScriptなど多言語対応
4. **コンポーザビリティ** - コンポーネントの組み合わせが容易
5. **WASI統合** - システムAPIへの標準アクセス

## セットアップ

### 必要なツール

```bash
# Rust (Component Modelのツールチェーン)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# wasm32-wasi ターゲット
rustup target add wasm32-wasi

# cargo-component (コンポーネントビルドツール)
cargo install cargo-component

# wasm-tools (コンポーネント検査・変換)
cargo install wasm-tools

# wasmtime (ランタイム)
curl https://wasmtime.dev/install.sh -sSf | bash
```

### バージョン確認

```bash
cargo-component --version
wasm-tools --version
wasmtime --version
```

## WIT (WebAssembly Interface Type)

WITはComponent Modelのインターフェース定義言語です。

### 基本構文

```wit
// calculator.wit

package example:calculator@0.1.0;

// インターフェース定義
interface operations {
  // 関数シグネチャ
  add: func(a: s32, b: s32) -> s32;
  subtract: func(a: s32, b: s32) -> s32;
  multiply: func(a: s32, b: s32) -> s32;
  divide: func(a: s32, b: s32) -> result<f64, string>;
}

// ワールド定義（コンポーネントの境界）
world calculator {
  export operations;
}
```

### 型定義

```wit
// types.wit

package example:types@0.1.0;

interface common {
  // レコード（構造体）
  record user {
    id: u64,
    name: string,
    email: string,
    age: u8,
  }

  // バリアント（列挙型）
  variant status {
    active,
    inactive,
    suspended(string), // 値を持つ
  }

  // リスト
  type user-list = list<user>;

  // オプション
  type optional-email = option<string>;

  // 結果型
  type user-result = result<user, string>;

  // 関数
  get-user: func(id: u64) -> user-result;
  list-users: func() -> user-list;
  update-status: func(id: u64, status: status) -> result<_, string>;
}
```

### 複雑な型

```wit
// advanced.wit

package example:advanced@0.1.0;

interface data-structures {
  // ネストした構造
  record address {
    street: string,
    city: string,
    zip: string,
  }

  record person {
    name: string,
    address: address,
    contacts: list<string>,
  }

  // タプル
  type coordinates = tuple<f64, f64>;

  // フラグ（ビットフィールド）
  flags permissions {
    read,
    write,
    execute,
  }

  // リソース（状態を持つ型）
  resource file {
    constructor(path: string);
    read: func() -> result<list<u8>, string>;
    write: func(data: list<u8>) -> result<_, string>;
    close: func();
  }
}
```

## Rustでコンポーネント作成

### プロジェクト作成

```bash
cargo component new hello-component
cd hello-component
```

### WIT定義

```wit
// wit/world.wit

package example:hello@0.1.0;

world hello {
  export greet: func(name: string) -> string;
}
```

### 実装

```rust
// src/lib.rs

cargo_component_bindings::generate!();

use bindings::Guest;

struct Component;

impl Guest for Component {
    fn greet(name: String) -> String {
        format!("Hello, {}!", name)
    }
}

bindings::export!(Component with_types_in bindings);
```

### ビルド

```bash
cargo component build --release
```

生成されたコンポーネント: `target/wasm32-wasi/release/hello_component.wasm`

## コンポーネントの実行

### Wasmtimeで実行

```bash
wasmtime run \
  target/wasm32-wasi/release/hello_component.wasm \
  --invoke greet "World"
```

### プログラムから実行（Rust）

```rust
use wasmtime::component::*;
use wasmtime::{Config, Engine, Store};

fn main() -> anyhow::Result<()> {
    // エンジン設定
    let mut config = Config::new();
    config.wasm_component_model(true);
    let engine = Engine::new(&config)?;

    // コンポーネント読み込み
    let component = Component::from_file(
        &engine,
        "hello_component.wasm"
    )?;

    // リンカー設定
    let mut linker = Linker::new(&engine);

    // ストア作成
    let mut store = Store::new(&engine, ());

    // インスタンス化
    let (instance, _) = linker.instantiate(&mut store, &component)?;

    // 関数取得
    let greet = instance.get_typed_func::<(&str,), (String,)>(&mut store, "greet")?;

    // 実行
    let (result,) = greet.call(&mut store, ("Alice",))?;
    println!("{}", result); // Hello, Alice!

    Ok(())
}
```

## コンポーネント合成

### 複数コンポーネントの組み合わせ

```wit
// wit/logger.wit

package example:logger@0.1.0;

interface logging {
  enum level {
    debug,
    info,
    warn,
    error,
  }

  log: func(level: level, message: string);
}

world logger {
  export logging;
}
```

```wit
// wit/app.wit

package example:app@0.1.0;

interface app-logic {
  use example:logger/logging.{level, log};

  process: func(data: string) -> result<string, string>;
}

world app {
  import example:logger/logging;
  export app-logic;
}
```

### アプリケーション実装

```rust
// src/lib.rs

cargo_component_bindings::generate!();

use bindings::{Guest, example::logger::logging::{log, Level}};

struct Component;

impl Guest for Component {
    fn process(data: String) -> Result<String, String> {
        log(Level::Info, &format!("Processing: {}", data));

        if data.is_empty() {
            log(Level::Error, "Empty data received");
            return Err("Data cannot be empty".to_string());
        }

        let result = data.to_uppercase();
        log(Level::Info, &format!("Result: {}", result));

        Ok(result)
    }
}

bindings::export!(Component with_types_in bindings);
```

## WASI Preview 2

Component ModelはWASI Preview 2と統合されています。

### ファイルシステム

```wit
// wit/file-ops.wit

package example:file@0.1.0;

world file-operations {
  import wasi:filesystem/types@0.2.0;
  import wasi:filesystem/preopens@0.2.0;

  export read-file: func(path: string) -> result<string, string>;
  export write-file: func(path: string, content: string) -> result<_, string>;
}
```

```rust
use std::fs;

cargo_component_bindings::generate!();

use bindings::Guest;

struct Component;

impl Guest for Component {
    fn read_file(path: String) -> Result<String, String> {
        fs::read_to_string(&path)
            .map_err(|e| e.to_string())
    }

    fn write_file(path: String, content: String) -> Result<(), String> {
        fs::write(&path, content)
            .map_err(|e| e.to_string())
    }
}

bindings::export!(Component with_types_in bindings);
```

### HTTP クライアント

```wit
// wit/http.wit

package example:http@0.1.0;

world http-client {
  import wasi:http/types@0.2.0;
  import wasi:http/outgoing-handler@0.2.0;

  export fetch: func(url: string) -> result<string, string>;
}
```

## JavaScriptとの統合

### jco（JavaScript Component Tools）

```bash
npm install -g @bytecodealliance/jco
```

### コンポーネントをJSにトランスパイル

```bash
jco transpile hello_component.wasm -o dist
```

### Node.jsから使用

```javascript
// index.js

import { greet } from './dist/hello_component.js';

const result = greet('JavaScript');
console.log(result); // Hello, JavaScript!
```

### ブラウザで使用

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module">
    import { greet } from './dist/hello_component.js';

    document.getElementById('btn').addEventListener('click', () => {
      const name = document.getElementById('name').value;
      const result = greet(name);
      document.getElementById('output').textContent = result;
    });
  </script>
</head>
<body>
  <input id="name" type="text" placeholder="Enter name" />
  <button id="btn">Greet</button>
  <p id="output"></p>
</body>
</html>
```

## 実践例: プラグインシステム

### プラグインインターフェース

```wit
// wit/plugin.wit

package example:plugin@0.1.0;

interface plugin-api {
  record config {
    name: string,
    version: string,
    enabled: bool,
  }

  variant event {
    startup,
    shutdown,
    custom(string),
  }

  // プラグインが実装すべきメソッド
  init: func(config: config) -> result<_, string>;
  handle-event: func(event: event) -> result<_, string>;
  get-info: func() -> string;
}

world plugin {
  export plugin-api;
}
```

### プラグイン実装

```rust
cargo_component_bindings::generate!();

use bindings::{Guest, exports::example::plugin::plugin_api::*};

struct MyPlugin {
    config: Option<Config>,
}

impl Guest for MyPlugin {
    fn init(config: Config) -> Result<(), String> {
        println!("Initializing plugin: {}", config.name);
        // 初期化処理
        Ok(())
    }

    fn handle_event(event: Event) -> Result<(), String> {
        match event {
            Event::Startup => {
                println!("Plugin started");
                Ok(())
            }
            Event::Shutdown => {
                println!("Plugin stopping");
                Ok(())
            }
            Event::Custom(data) => {
                println!("Custom event: {}", data);
                Ok(())
            }
        }
    }

    fn get_info() -> String {
        "MyPlugin v1.0.0".to_string()
    }
}

bindings::export!(MyPlugin with_types_in bindings);
```

### ホストアプリケーション

```rust
use wasmtime::component::*;
use wasmtime::{Config, Engine, Store};

fn main() -> anyhow::Result<()> {
    let mut config = Config::new();
    config.wasm_component_model(true);
    let engine = Engine::new(&config)?;

    // プラグイン読み込み
    let component = Component::from_file(&engine, "plugin.wasm")?;
    let mut linker = Linker::new(&engine);
    let mut store = Store::new(&engine, ());

    let (instance, _) = linker.instantiate(&mut store, &component)?;

    // プラグイン初期化
    let init = instance.get_typed_func::<(PluginConfig,), (Result<(), String>,)>(
        &mut store, "init"
    )?;

    let plugin_config = PluginConfig {
        name: "my-plugin".to_string(),
        version: "1.0.0".to_string(),
        enabled: true,
    };

    init.call(&mut store, (plugin_config,))?;

    // イベント送信
    let handle_event = instance.get_typed_func::<(Event,), (Result<(), String>,)>(
        &mut store, "handle-event"
    )?;

    handle_event.call(&mut store, (Event::Startup,))?;

    Ok(())
}
```

## デバッグとツール

### コンポーネント検査

```bash
# コンポーネント情報表示
wasm-tools component wit hello_component.wasm

# コンポーネント検証
wasm-tools validate hello_component.wasm

# Core WASMに変換
wasm-tools component embed --world hello wit/world.wit module.wasm
```

### パフォーマンス測定

```rust
use std::time::Instant;

let start = Instant::now();
let (result,) = greet.call(&mut store, ("Alice",))?;
let duration = start.elapsed();

println!("Execution time: {:?}", duration);
```

## ベストプラクティス

### 1. エラーハンドリング

WITでは`result`型を使用:

```wit
fetch-data: func(url: string) -> result<list<u8>, error-info>;

record error-info {
  code: u32,
  message: string,
}
```

### 2. バージョニング

パッケージにバージョンを明記:

```wit
package example:mylib@1.2.3;
```

### 3. ドキュメント

WITにコメントを追加:

```wit
/// ユーザー情報を取得します
///
/// # Parameters
/// - id: ユーザーID
///
/// # Returns
/// ユーザー情報、または存在しない場合はエラー
get-user: func(id: u64) -> result<user, string>;
```

## まとめ

WebAssembly Component Modelは、WebAssemblyを単なるバイナリフォーマットから、真のコンポーネント指向プラットフォームへと進化させます。

主な利点:

- **言語非依存** - 複数言語の自然な統合
- **型安全** - コンパイル時の型チェック
- **再利用性** - コンポーネントの組み合わせが容易
- **標準化** - WASI統合によるポータビリティ
- **パフォーマンス** - ネイティブに近い速度

まだ開発中の技術ですが、将来のソフトウェア開発に大きな影響を与える可能性を秘めています。

## 参考リンク

- [Component Model 仕様](https://github.com/WebAssembly/component-model)
- [cargo-component](https://github.com/bytecodealliance/cargo-component)
- [WIT仕様](https://github.com/WebAssembly/component-model/blob/main/design/mvp/WIT.md)
- [WASI Preview 2](https://github.com/WebAssembly/WASI/tree/main/preview2)
- [Wasmtime](https://wasmtime.dev/)
- [jco - JavaScript Component Tools](https://github.com/bytecodealliance/jco)

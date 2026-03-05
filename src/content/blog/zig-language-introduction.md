---
title: "Zig言語入門ガイド - C/C++の未来を担うシステムプログラミング言語"
description: "Zig言語の基本から実践的な使い方まで詳しく解説。メモリ安全性、コンパイル時実行、C言語との相互運用性など、Zigの特徴と実際のコード例を紹介します。"
pubDate: "2025-02-05"
tags: ['プログラミング']
---

# Zig言語入門ガイド

Zigは、C/C++の後継を目指して開発されている現代的なシステムプログラミング言語です。シンプルで明示的な言語設計、優れたコンパイル時実行機能、C言語との高い互換性により、システムプログラミングの新しい選択肢として注目を集めています。

この記事では、Zigの基本的な特徴から実践的なコード例まで、包括的に解説します。

## Zigの特徴

### 1. シンプルで明示的な言語設計

Zigは「隠れた制御フロー」を排除し、コードの動作を明確にすることを重視しています。

```zig
// 明示的なエラーハンドリング
const result = try doSomething();

// 隠れた例外は存在しない
// メモリアロケーションも明示的
const allocator = std.heap.page_allocator;
const buffer = try allocator.alloc(u8, 1024);
defer allocator.free(buffer);
```

### 2. コンパイル時実行（comptime）

Zigの最も強力な機能の一つが、コンパイル時にコードを実行できることです。

```zig
const std = @import("std");

fn fibonacci(n: u32) u32 {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

// コンパイル時に計算される
const fib_10 = comptime fibonacci(10);

pub fn main() void {
    std.debug.print("Fibonacci(10) = {}\n", .{fib_10});
}
```

### 3. C言語との相互運用性

ZigはCコードを直接インポートして使用できます。

```zig
const c = @cImport({
    @cInclude("stdio.h");
    @cInclude("stdlib.h");
});

pub fn main() void {
    _ = c.printf("Hello from C!\n");
}
```

### 4. 手動メモリ管理とアロケーター

Zigは明示的なメモリ管理を提供しますが、アロケーターパターンにより柔軟性を保っています。

```zig
const std = @import("std");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();

    const allocator = gpa.allocator();

    const items = try allocator.alloc(i32, 10);
    defer allocator.free(items);

    for (items, 0..) |*item, i| {
        item.* = @intCast(i * 2);
    }

    for (items) |item| {
        std.debug.print("{} ", .{item});
    }
}
```

## 開発環境のセットアップ

### Zigのインストール

```bash
# macOS (Homebrew)
brew install zig

# Linux (snap)
snap install zig --classic --beta

# Windows (Scoop)
scoop install zig

# 公式バイナリをダウンロード
# https://ziglang.org/download/
```

### プロジェクトの作成

```bash
# 新規プロジェクト作成
zig init-exe

# または
zig init-lib

# プロジェクト構造
# .
# ├── build.zig
# └── src
#     └── main.zig
```

### ビルドと実行

```bash
# ビルド
zig build

# 実行
zig build run

# テスト
zig build test

# 最適化ビルド
zig build -Doptimize=ReleaseFast
```

## 基本文法

### 変数と定数

```zig
const std = @import("std");

pub fn main() void {
    // 定数（変更不可）
    const x: i32 = 42;

    // 変数（変更可能）
    var y: i32 = 10;
    y += 5;

    // 型推論
    const z = 100; // i32と推論される

    // アンダースコア代入（未使用の値）
    _ = x;

    std.debug.print("y = {}, z = {}\n", .{y, z});
}
```

### データ型

```zig
// 整数型
const u8_val: u8 = 255;        // 0〜255
const i8_val: i8 = -128;       // -128〜127
const u32_val: u32 = 4294967295;
const i64_val: i64 = -9223372036854775808;

// 浮動小数点型
const f32_val: f32 = 3.14;
const f64_val: f64 = 2.718281828459045;

// ブール型
const bool_val: bool = true;

// 文字型（Unicodeコードポイント）
const char: u8 = 'A';
const unicode: u21 = '🦎'; // Zigのマスコット

// 配列
const array: [5]i32 = .{ 1, 2, 3, 4, 5 };

// スライス
const slice: []const i32 = array[0..3];

// 文字列（UTF-8のu8スライス）
const string: []const u8 = "Hello, Zig!";

// ポインタ
var num: i32 = 42;
const ptr: *i32 = &num;
ptr.* = 100; // デリファレンス
```

### 制御構造

```zig
const std = @import("std");

pub fn main() void {
    // if式
    const x = 10;
    const result = if (x > 5) "big" else "small";
    std.debug.print("{s}\n", .{result});

    // while文
    var i: u32 = 0;
    while (i < 5) : (i += 1) {
        std.debug.print("{} ", .{i});
    }
    std.debug.print("\n", .{});

    // for文
    const items = [_]i32{ 1, 2, 3, 4, 5 };
    for (items) |item| {
        std.debug.print("{} ", .{item});
    }
    std.debug.print("\n", .{});

    // インデックス付きfor
    for (items, 0..) |item, idx| {
        std.debug.print("[{}]={} ", .{ idx, item });
    }
    std.debug.print("\n", .{});

    // switch式
    const value = 2;
    const text = switch (value) {
        1 => "one",
        2 => "two",
        3 => "three",
        else => "other",
    };
    std.debug.print("{s}\n", .{text});
}
```

### 関数

```zig
const std = @import("std");

// 基本的な関数
fn add(a: i32, b: i32) i32 {
    return a + b;
}

// エラーを返す可能性がある関数
fn divide(a: f64, b: f64) !f64 {
    if (b == 0) {
        return error.DivisionByZero;
    }
    return a / b;
}

// ジェネリック関数
fn max(comptime T: type, a: T, b: T) T {
    return if (a > b) a else b;
}

pub fn main() !void {
    const sum = add(10, 20);
    std.debug.print("10 + 20 = {}\n", .{sum});

    // エラーハンドリング
    const result = try divide(10.0, 2.0);
    std.debug.print("10 / 2 = {d:.2}\n", .{result});

    // エラーをキャッチ
    const safe_result = divide(10.0, 0.0) catch {
        std.debug.print("Division by zero!\n", .{});
        return;
    };
    _ = safe_result;

    // ジェネリック関数の使用
    const max_int = max(i32, 10, 20);
    const max_float = max(f64, 3.14, 2.71);
    std.debug.print("max(10, 20) = {}\n", .{max_int});
    std.debug.print("max(3.14, 2.71) = {d:.2}\n", .{max_float});
}
```

### 構造体

```zig
const std = @import("std");

const Point = struct {
    x: f64,
    y: f64,

    // メソッド
    pub fn distance(self: Point, other: Point) f64 {
        const dx = self.x - other.x;
        const dy = self.y - other.y;
        return @sqrt(dx * dx + dy * dy);
    }

    // 関連関数（静的メソッド）
    pub fn origin() Point {
        return Point{ .x = 0, .y = 0 };
    }
};

const Rectangle = struct {
    width: f64,
    height: f64,

    pub fn area(self: Rectangle) f64 {
        return self.width * self.height;
    }

    pub fn perimeter(self: Rectangle) f64 {
        return 2 * (self.width + self.height);
    }
};

pub fn main() void {
    const p1 = Point{ .x = 0, .y = 0 };
    const p2 = Point{ .x = 3, .y = 4 };

    const dist = p1.distance(p2);
    std.debug.print("Distance: {d:.2}\n", .{dist});

    const origin = Point.origin();
    std.debug.print("Origin: ({d:.1}, {d:.1})\n", .{ origin.x, origin.y });

    const rect = Rectangle{ .width = 10, .height = 5 };
    std.debug.print("Area: {d:.1}, Perimeter: {d:.1}\n", .{
        rect.area(),
        rect.perimeter(),
    });
}
```

### エラーハンドリング

```zig
const std = @import("std");

// エラーセット定義
const FileError = error{
    FileNotFound,
    PermissionDenied,
    InvalidFormat,
};

fn readFile(path: []const u8) FileError![]const u8 {
    _ = path;
    // ファイル読み込みの実装
    return error.FileNotFound;
}

fn processFile(path: []const u8) !void {
    // エラーを伝播
    const content = try readFile(path);
    _ = content;

    std.debug.print("File processed successfully\n", .{});
}

pub fn main() void {
    // エラーをキャッチして処理
    processFile("test.txt") catch |err| {
        switch (err) {
            error.FileNotFound => {
                std.debug.print("File not found\n", .{});
            },
            error.PermissionDenied => {
                std.debug.print("Permission denied\n", .{});
            },
            error.InvalidFormat => {
                std.debug.print("Invalid format\n", .{});
            },
        }
    };

    // エラーを無視（非推奨）
    const content = readFile("test.txt") catch unreachable;
    _ = content;
}
```

## 実践例

### 1. HTTPクライアント

```zig
const std = @import("std");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    // HTTPクライアント作成
    var client = std.http.Client{ .allocator = allocator };
    defer client.deinit();

    // リクエスト送信
    const uri = try std.Uri.parse("https://api.github.com/users/ziglang");

    var req = try client.open(.GET, uri, .{
        .server_header_buffer = try allocator.alloc(u8, 8192),
    });
    defer req.deinit();

    try req.send();
    try req.wait();

    // レスポンス読み取り
    const body = try req.reader().readAllAlloc(allocator, 1024 * 1024);
    defer allocator.free(body);

    std.debug.print("Response:\n{s}\n", .{body});
}
```

### 2. JSONパース

```zig
const std = @import("std");

const User = struct {
    id: u32,
    name: []const u8,
    email: []const u8,
    active: bool,
};

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const json_str =
        \\{
        \\  "id": 1,
        \\  "name": "John Doe",
        \\  "email": "john@example.com",
        \\  "active": true
        \\}
    ;

    // JSONをパース
    const parsed = try std.json.parseFromSlice(
        User,
        allocator,
        json_str,
        .{},
    );
    defer parsed.deinit();

    const user = parsed.value;
    std.debug.print("User: {s} ({})\n", .{ user.name, user.id });
    std.debug.print("Email: {s}\n", .{user.email});
    std.debug.print("Active: {}\n", .{user.active});
}
```

### 3. ファイルI/O

```zig
const std = @import("std");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    // ファイル書き込み
    const file = try std.fs.cwd().createFile("output.txt", .{});
    defer file.close();

    const writer = file.writer();
    try writer.writeAll("Hello, Zig!\n");
    try writer.print("Number: {}\n", .{42});

    // ファイル読み込み
    const read_file = try std.fs.cwd().openFile("output.txt", .{});
    defer read_file.close();

    const content = try read_file.readToEndAlloc(allocator, 1024);
    defer allocator.free(content);

    std.debug.print("File content:\n{s}", .{content});
}
```

### 4. マルチスレッド

```zig
const std = @import("std");

fn workerThread(id: usize) void {
    std.debug.print("Thread {} started\n", .{id});

    // 作業をシミュレート
    std.time.sleep(1 * std.time.ns_per_s);

    std.debug.print("Thread {} finished\n", .{id});
}

pub fn main() !void {
    const thread_count = 4;
    var threads: [thread_count]std.Thread = undefined;

    // スレッド起動
    for (&threads, 0..) |*thread, i| {
        thread.* = try std.Thread.spawn(.{}, workerThread, .{i});
    }

    // スレッド終了を待機
    for (threads) |thread| {
        thread.join();
    }

    std.debug.print("All threads completed\n", .{});
}
```

### 5. コマンドラインツール

```zig
const std = @import("std");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    // コマンドライン引数取得
    const args = try std.process.argsAlloc(allocator);
    defer std.process.argsFree(allocator, args);

    if (args.len < 2) {
        std.debug.print("Usage: {s} <name>\n", .{args[0]});
        return;
    }

    const name = args[1];
    std.debug.print("Hello, {s}!\n", .{name});

    // 環境変数取得
    const home = std.os.getenv("HOME") orelse "unknown";
    std.debug.print("Home directory: {s}\n", .{home});
}
```

## ビルドシステム

### build.zigの設定

```zig
const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    // 実行可能ファイル
    const exe = b.addExecutable(.{
        .name = "myapp",
        .root_source_file = .{ .path = "src/main.zig" },
        .target = target,
        .optimize = optimize,
    });

    b.installArtifact(exe);

    // 実行コマンド
    const run_cmd = b.addRunArtifact(exe);
    run_cmd.step.dependOn(b.getInstallStep());

    if (b.args) |args| {
        run_cmd.addArgs(args);
    }

    const run_step = b.step("run", "Run the app");
    run_step.dependOn(&run_cmd.step);

    // テスト
    const tests = b.addTest(.{
        .root_source_file = .{ .path = "src/main.zig" },
        .target = target,
        .optimize = optimize,
    });

    const run_tests = b.addRunArtifact(tests);
    const test_step = b.step("test", "Run tests");
    test_step.dependOn(&run_tests.step);
}
```

## まとめ

Zigは、C/C++の複雑さを解消しながら、システムプログラミングに必要な制御と性能を提供する言語です。

**主な特徴：**

- シンプルで明示的な言語設計
- 強力なコンパイル時実行機能
- C言語との高い互換性
- 手動メモリ管理とアロケーター
- 優れたクロスコンパイル

**適用分野：**

- システムプログラミング
- 組み込みシステム
- ゲーム開発
- ネットワークプログラミング
- パフォーマンスクリティカルなアプリケーション

Zigは、現代的でありながら低レベルな制御を可能にする、システムプログラミングの新しい選択肢です。

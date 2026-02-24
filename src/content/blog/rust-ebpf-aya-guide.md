---
title: 'Rust + eBPF + Aya フレームワーク完全入門ガイド【2026年版】'
description: 'RustでeBPFプログラムを書くためのAyaフレームワーク完全入門。環境構築からXDPパケットカウンター、eBPF Maps、ネットワーク監視ツールの実装まで実践的に解説。Rust中級エンジニア向け。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-3.jpg'
tags: ['Rust', 'eBPF', 'Aya', 'Linux', 'ネットワーク', 'システムプログラミング']
---

## はじめに

2026年現在、eBPF（extended Berkeley Packet Filter）はLinuxカーネルプログラミングの主役に躍り出た。Cloudflare、Facebook（Meta）、Google、Netflixといった大手が本番環境で大規模採用し、Kubernetes/クラウドネイティブスタックの根幹を支えている。そしてその世界に「Rust」という新しいプレイヤーが力強く登場した。

従来のeBPFプログラムはC言語で書くのが当たり前だった。しかし、Rustの安全性とAyaフレームワークの登場により、メモリバグを型システムで防ぎながらeBPFを書くことが現実となった。

本記事では、Rustの基礎知識はあるがeBPFは初めてというエンジニアに向けて、Ayaフレームワークを用いたeBPF開発を基礎から実践まで徹底的に解説する。XDPパケットカウンターの実装からネットワーク監視ツールの構築まで、動作するコードとともに学んでいく。

---

## 1. eBPFとは何か

### 1.1 eBPFの本質

eBPF（extended Berkeley Packet Filter）は、Linuxカーネル内でユーザーが定義したプログラムを**安全に**実行するための仮想マシン機構だ。「カーネルモジュールを書かずにカーネルの挙動を変更できる」と言えば、その革命性が伝わるだろう。

eBPFプログラムは以下の特徴を持つ。

- **カーネル空間で動作**：ユーザー空間とカーネル空間の境界を越えるオーバーヘッドがない
- **安全性が保証されている**：ロード前にVerifierがプログラムの安全性を検証する
- **JITコンパイル**：カーネル内でネイティブマシンコードにコンパイルされ高速動作
- **イベント駆動**：ネットワークパケット受信、システムコール、kprobe等のイベントにアタッチ

### 1.2 eBPFの歴史：BPFからeBPFへ

1992年にBSD Packet Filterとして誕生したBPFは、当初はネットワークパケットフィルタリング専用の64ビット仮想マシンだった。2014年、Linuxカーネル3.18でeBPFとして拡張され、汎用プログラミング基盤へと進化した。

```
BPF (1992)        → パケットフィルタのみ
eBPF (Linux 3.18) → 汎用カーネル内プログラミング
eBPF (Linux 5.x+) → CO-RE、BTF、リングバッファ、全機能揃う
```

### 1.3 eBPFの主要ユースケース

**ネットワーク処理（XDP/TC）**

XDP（eXpress Data Path）はNICドライバレベルで動作し、カーネルのネットワークスタックに入る前にパケットを処理できる。DDoS防御、ロードバランサ（Facebookの「Katran」）、高性能ファイアウォールに活用されている。

**オブザーバビリティ（kprobe/tracepoint）**

システムコールやカーネル関数の引数・戻り値をリアルタイムに観測できる。Pixie、Datadog Agent、Ciliumなどが採用している。

**セキュリティ（LSM/seccomp）**

プロセスの挙動を監視し、不審な動作をリアルタイムで遮断できる。Falco、TetragonなどのセキュリティツールがeBPFを活用している。

### 1.4 eBPFプログラムの構成

eBPFプログラムは2つの部分から成る。

| 部分 | 動作環境 | 役割 |
|------|---------|------|
| eBPFプログラム（カーネル側） | Linuxカーネル | イベントをフック、データ収集 |
| ユーザー空間プログラム | ユーザー空間 | eBPFをロード、データを受信・表示 |

この2つはeBPF Mapsと呼ばれるデータ構造を通じてデータをやり取りする。

---

## 2. なぜRustでeBPFを書くのか

### 2.1 従来のC言語eBPF開発の課題

従来のeBPF開発はCで行われてきたが、以下の課題があった。

**メモリ安全性の欠如**

Verifierはプログラムの安全性を検証するが、すべてのバグを検出できるわけではない。Cのポインタ操作ミスはVerifierをすり抜けることがある。また、eBPFのVerifierはユーザー空間のCコードのバグを検出しない。

**ツールチェーンの複雑さ**

libbpf + clang/LLVM のセットアップは複雑で、Linuxカーネルのヘッダに依存する。CO-REへの移行で改善されたが、依然として敷居が高い。

**型安全性の欠如**

Cでは型チェックが弱く、カーネル空間とユーザー空間で共有するデータ構造の整合性を手動で管理しなければならない。

### 2.2 Rustの優位性

**コンパイル時メモリ安全性**

Rustの所有権システムとボローチェッカーは、コンパイル時にメモリ安全性を保証する。ダングリングポインタ、バッファオーバーフロー、データ競合をコンパイル段階で検出する。

**型システムによるカーネル/ユーザー空間の整合性**

同一のRustの型定義をカーネル側・ユーザー空間側の両方で共有できる。`#[repr(C)]` アトリビュートで両サイドのメモリレイアウトを保証する。

**モダンなツールチェーン（cargo）**

`cargo`で依存関係を管理でき、`cargo generate`でプロジェクトテンプレートを展開できる。C言語のヘッダ依存から解放される。

**パフォーマンス**

RustはC言語と同等のパフォーマンスを実現する。ゼロコスト抽象化により、安全性のための実行時オーバーヘッドがほとんど発生しない。

---

## 3. Ayaフレームワークの概要

### 3.1 Ayaとは

Aya（読み：アヤ）は、RustネイティブのeBPFフレームワークだ。`libbpf-rs`（libcバインディング）とは異なり、Ayaは**libbpfもlibcも不要**なピュアRust実装として設計されている。

```
                  ┌─────────────────────┐
                  │   aya-bpf (カーネル側)  │
                  │   ─────────────────   │
                  │   XDP / TC / kprobe   │
                  │   BPF Map マクロ      │
                  └──────────┬──────────┘
                             │ eBPF Maps
                  ┌──────────▼──────────┐
                  │   aya (ユーザー空間側)  │
                  │   ─────────────────   │
                  │   プログラムロード      │
                  │   Map 読み書き         │
                  │   perf/ring buffer    │
                  └─────────────────────┘
```

### 3.2 Ayaの主要コンポーネント

| クレート | 役割 |
|---------|------|
| `aya` | ユーザー空間のメインライブラリ |
| `aya-bpf` | カーネル側eBPFプログラム用ライブラリ |
| `aya-log` | eBPFプログラム内でのログ出力 |
| `aya-log-ebpf` | カーネル側ログ出力マクロ |
| `aya-obj` | eBPFオブジェクトファイルのパーサー |

### 3.3 AyaとlibBPF-rsとの比較

| 項目 | Aya | libbpf-rs |
|------|-----|-----------|
| libbpf依存 | なし | あり（C FFI） |
| libc依存 | なし | あり |
| 純Rust実装 | はい | 部分的 |
| 成熟度 | 活発な開発中 | 安定 |
| CO-REサポート | あり | あり |
| async対応 | tokio/async対応 | 限定的 |

AyaはGitHub Starsが急増しており、2026年現在はRustでeBPFを書く場合のデファクトスタンダードになりつつある。

---

## 4. 環境構築

### 4.1 必要なシステム要件

- **OS**: Linux（カーネル 5.8以上推奨。Ubuntu 22.04/24.04、Fedora 39+、Arch等）
- **Rust**: 1.79以上（stable）
- **LLVM**: 14以上（bpf-linker が必要）

macOSやWindowsではeBPFプログラムは実行できない。開発・テストにはLinux環境が必須だ。WSL2（Windows Subsystem for Linux 2）でも動作する。

### 4.2 Rustのインストールと設定

```bash
# Rustのインストール（未インストールの場合）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# BPFターゲットの追加（eBPFプログラムのコンパイルに必須）
rustup target add bpfel-unknown-none

# nightly toolchainの追加（bpf-linkerのビルドに必要な場合がある）
rustup toolchain install nightly
rustup component add rust-src --toolchain nightly
```

### 4.3 bpf-linkerのインストール

`bpf-linker`はRustコードをeBPF bytecodeにリンクするためのツールだ。

```bash
# LLVMが既にある場合
cargo install bpf-linker

# LLVMが無い場合（内蔵LLVMを使用）
cargo install bpf-linker --no-default-features --features system-llvm

# インストール確認
bpf-linker --version
```

Ubuntu/Debianの場合、先にLLVMをインストールしておくと安定する。

```bash
# Ubuntu 22.04/24.04
sudo apt-get install llvm-14 clang-14 libelf-dev
```

### 4.4 cargo-generateとaya-cliのインストール

```bash
# cargo-generate：プロジェクトテンプレート生成ツール
cargo install cargo-generate

# cargo-bpf（オプション：Ayaテンプレートが別途あるため必須ではない）
# Ayaではcargo-generateを使うのが主流
```

### 4.5 Ayaプロジェクトの生成

```bash
# Ayaのテンプレートからプロジェクトを生成
cargo generate --git https://github.com/aya-rs/aya-template

# プロンプトが出る
# Project Name: my-ebpf-app
# Which eBPF program type do you want to create? → xdp を選択
```

これにより以下の構造のプロジェクトが生成される。

```
my-ebpf-app/
├── Cargo.toml                  # ワークスペース設定
├── my-ebpf-app/               # ユーザー空間プログラム
│   ├── Cargo.toml
│   └── src/
│       └── main.rs
├── my-ebpf-app-ebpf/          # カーネル側eBPFプログラム
│   ├── Cargo.toml
│   └── src/
│       └── main.rs
└── my-ebpf-app-common/        # 共有データ構造
    ├── Cargo.toml
    └── src/
        └── lib.rs
```

この3クレート構成がAyaの基本パターンだ。共通のデータ型を`-common`クレートに置くことで、カーネル/ユーザー空間間の型整合性を保つ。

---

## 5. ハローワールド：最初のeBPFプログラム（XDPパケットカウンター）

### 5.1 XDPとは

XDP（eXpress Data Path）は、NICドライバのレベルでパケットを処理するeBPFフックポイントだ。カーネルのネットワークスタック（TCP/IPスタック等）よりも前に実行されるため、非常に高速なパケット処理が可能だ。

XDPプログラムの戻り値は以下のいずれかになる。

| 戻り値 | 意味 |
|--------|------|
| `XDP_PASS` | パケットをカーネルのネットワークスタックに渡す |
| `XDP_DROP` | パケットを破棄する（DDoS防御等） |
| `XDP_TX` | パケットを受信したNICから送り返す |
| `XDP_REDIRECT` | 別のNICやCPUにリダイレクト |
| `XDP_ABORTED` | エラー、パケットを破棄 |

### 5.2 共有データ構造（-common クレート）

まず、カーネル/ユーザー空間で共有するデータ型を定義する。

```rust
// my-ebpf-app-common/src/lib.rs

#![no_std]

// カーネル空間でもユーザー空間でも使う共通型
// no_stdにする必要がある（カーネル側はstdが使えない）
```

シンプルなパケットカウンターでは共通型は不要だが、後でPacketInfoを追加する。

### 5.3 カーネル側eBPFプログラム

```rust
// my-ebpf-app-ebpf/src/main.rs

#![no_std]
#![no_main]

use aya_bpf::{
    bindings::xdp_action,
    macros::{map, xdp},
    maps::HashMap,
    programs::XdpContext,
};
use aya_log_ebpf::info;

// eBPF Mapの定義
// キー: u32（プロトコル番号）、値: u64（パケット数）
#[map(name = "PACKET_COUNT")]
static mut PACKET_COUNT: HashMap<u32, u64> =
    HashMap::<u32, u64>::with_max_entries(256, 0);

// XDPフックポイントのアトリビュート
// "xdp_packet_counter" はプログラム名（ロード時に使用）
#[xdp(name = "xdp_packet_counter")]
pub fn xdp_packet_counter(ctx: XdpContext) -> u32 {
    match try_xdp_packet_counter(ctx) {
        Ok(ret) => ret,
        Err(_) => xdp_action::XDP_ABORTED,
    }
}

fn try_xdp_packet_counter(ctx: XdpContext) -> Result<u32, u64> {
    // パケットデータへのポインタを取得
    let data_start = ctx.data() as usize;
    let data_end = ctx.data_end() as usize;

    // Ethernet ヘッダのサイズチェック（必須！Verifierが要求する）
    let eth_size = core::mem::size_of::<EthHdr>();
    if data_start + eth_size > data_end {
        return Ok(xdp_action::XDP_PASS);
    }

    // Ethernet ヘッダの読み取り
    let eth_hdr = unsafe { &*(data_start as *const EthHdr) };

    // Ethertype を取得（ネットワークバイトオーダー → ホストバイトオーダー）
    let ether_type = u16::from_be(eth_hdr.ether_type);

    // プロトコル番号をキーとしてカウントをインクリメント
    let key = ether_type as u32;
    unsafe {
        let count = PACKET_COUNT.get(&key).copied().unwrap_or(0);
        PACKET_COUNT.insert(&key, &(count + 1), 0).ok();
    }

    // パケットをカーネルのネットワークスタックへ渡す
    Ok(xdp_action::XDP_PASS)
}

// Ethernetヘッダ構造体の定義
// #[repr(C)] でC言語と同じメモリレイアウトを保証する
#[repr(C)]
struct EthHdr {
    dst_mac: [u8; 6],
    src_mac: [u8; 6],
    ether_type: u16,
}

// パニック時のハンドラ（no_std環境では必須）
#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    unsafe { core::hint::unreachable_unchecked() }
}
```

### 5.4 ユーザー空間プログラム

```rust
// my-ebpf-app/src/main.rs

use anyhow::Context;
use aya::{
    include_bytes_aligned,
    maps::HashMap,
    programs::{Xdp, XdpFlags},
    Bpf,
};
use aya_log::BpfLogger;
use clap::Parser;
use log::{info, warn};
use std::net::Ipv4Addr;
use tokio::signal;

/// XDPパケットカウンター
#[derive(Debug, Parser)]
struct Opt {
    /// 監視するネットワークインターフェース名（例: eth0, lo）
    #[clap(short, long, default_value = "eth0")]
    iface: String,
}

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    let opt = Opt::parse();

    // ロギングの初期化
    env_logger::init();

    // eBPFオブジェクトファイルをバイナリとして埋め込む
    // ビルド時にmy-ebpf-app-ebpfクレートのバイトコードがここに埋め込まれる
    #[cfg(debug_assertions)]
    let mut bpf = Bpf::load(include_bytes_aligned!(
        "../../target/bpfel-unknown-none/debug/my-ebpf-app"
    ))?;
    #[cfg(not(debug_assertions))]
    let mut bpf = Bpf::load(include_bytes_aligned!(
        "../../target/bpfel-unknown-none/release/my-ebpf-app"
    ))?;

    // eBPFプログラムのログをユーザー空間で受信する設定
    if let Err(e) = BpfLogger::init(&mut bpf) {
        warn!("failed to initialize eBPF logger: {}", e);
    }

    // XDPプログラムをロードしてネットワークインターフェースにアタッチ
    let program: &mut Xdp = bpf
        .program_mut("xdp_packet_counter")
        .unwrap()
        .try_into()?;
    program.load()?;
    program.attach(&opt.iface, XdpFlags::default())
        .context(format!("failed to attach XDP to {}", opt.iface))?;

    info!("XDP program loaded. Monitoring interface: {}", opt.iface);
    info!("Press Ctrl+C to stop...");

    // メインループ：1秒ごとにカウントを表示
    let mut packet_count_map: HashMap<_, u32, u64> =
        HashMap::try_from(bpf.map("PACKET_COUNT").unwrap())?;

    loop {
        tokio::select! {
            _ = signal::ctrl_c() => {
                info!("Received Ctrl+C, exiting...");
                break;
            }
            _ = tokio::time::sleep(tokio::time::Duration::from_secs(1)) => {
                // Ethertypeとパケット数を表示
                for item in packet_count_map.iter() {
                    if let Ok((key, count)) = item {
                        let proto = match key {
                            0x0800 => "IPv4",
                            0x0806 => "ARP",
                            0x86DD => "IPv6",
                            0x8100 => "VLAN",
                            _ => "Other",
                        };
                        info!("Protocol: {} (0x{:04X}) → {} packets", proto, key, count);
                    }
                }
                info!("---");
            }
        }
    }

    Ok(())
}
```

### 5.5 ビルドと実行

```bash
# カーネル側eBPFプログラムをビルド
cargo build --package my-ebpf-app-ebpf \
  --target bpfel-unknown-none \
  -Z build-std=core

# ユーザー空間プログラムをビルド
cargo build --package my-ebpf-app

# root権限で実行（eBPFのロードにはCAP_BPF権限が必要）
sudo ./target/debug/my-ebpf-app --iface lo

# 別ターミナルでトラフィックを発生させる
ping -c 5 127.0.0.1
curl http://localhost:8080
```

実行すると以下のような出力が得られる。

```
[INFO] XDP program loaded. Monitoring interface: lo
[INFO] Press Ctrl+C to stop...
[INFO] Protocol: IPv4 (0x0800) → 42 packets
[INFO] Protocol: ARP (0x0806) → 3 packets
[INFO] ---
[INFO] Protocol: IPv4 (0x0800) → 87 packets
[INFO] Protocol: ARP (0x0806) → 3 packets
[INFO] ---
```

---

## 6. eBPF Mapsの使い方

### 6.1 eBPF Mapsとは

eBPF Mapsはカーネル空間とユーザー空間の間でデータを共有するためのデータ構造だ。複数のCPUコア間でも共有でき、アトミックな操作が可能だ。

### 6.2 主要なMap型

| Map型 | 用途 | Ayaでの型 |
|-------|------|----------|
| `BPF_MAP_TYPE_HASH` | キー/バリューストア | `HashMap<K, V>` |
| `BPF_MAP_TYPE_ARRAY` | 固定長配列 | `Array<V>` |
| `BPF_MAP_TYPE_PERF_EVENT_ARRAY` | カーネル→ユーザーへのイベント通知 | `PerfEventArray` |
| `BPF_MAP_TYPE_RING_BUF` | リングバッファ（Linux 5.8+） | `RingBuf` |
| `BPF_MAP_TYPE_LRU_HASH` | LRUキャッシュ付きハッシュマップ | `LruHashMap<K, V>` |
| `BPF_MAP_TYPE_PERCPU_HASH` | CPU毎のハッシュマップ（高速） | `PerCpuHashMap<K, V>` |

### 6.3 HashMapの詳細な使い方

```rust
// カーネル側（eBPFプログラム）での定義と使用

use aya_bpf::{
    macros::map,
    maps::HashMap,
};

// 最大1024エントリのHashMap
#[map(name = "CONNECTION_TABLE")]
static mut CONNECTION_TABLE: HashMap<ConnectionKey, ConnectionStats> =
    HashMap::<ConnectionKey, ConnectionStats>::with_max_entries(1024, 0);

// 共通クレートで定義する型（#[repr(C)]必須）
#[repr(C)]
#[derive(Clone, Copy)]
pub struct ConnectionKey {
    pub src_ip: u32,
    pub dst_ip: u32,
    pub src_port: u16,
    pub dst_port: u16,
    pub protocol: u8,
    pub _pad: [u8; 3],  // アライメント調整
}

#[repr(C)]
#[derive(Clone, Copy, Default)]
pub struct ConnectionStats {
    pub packets: u64,
    pub bytes: u64,
    pub last_seen: u64,
}

// eBPFプログラム内でのMap操作
fn update_connection(key: &ConnectionKey, packet_size: u64) {
    unsafe {
        let stats = CONNECTION_TABLE.get(key).copied().unwrap_or_default();
        let new_stats = ConnectionStats {
            packets: stats.packets + 1,
            bytes: stats.bytes + packet_size,
            last_seen: bpf_ktime_get_ns(),
        };
        // flags=0: 既存エントリの更新も許可
        CONNECTION_TABLE.insert(key, &new_stats, 0).ok();
    }
}
```

### 6.4 PerfEventArrayを使ったリアルタイムイベント通知

PerfEventArrayを使うと、カーネル側からユーザー空間へリアルタイムでイベントを送れる。

```rust
// カーネル側
use aya_bpf::{
    macros::map,
    maps::PerfEventArray,
};

#[map(name = "EVENTS")]
static mut EVENTS: PerfEventArray<PacketEvent> =
    PerfEventArray::<PacketEvent>::new(0);

#[repr(C)]
pub struct PacketEvent {
    pub src_ip: u32,
    pub dst_ip: u32,
    pub src_port: u16,
    pub dst_port: u16,
    pub packet_size: u32,
    pub timestamp: u64,
}

fn send_event(ctx: &XdpContext, event: &PacketEvent) {
    unsafe {
        // CPUごとのPerfイベントとして送信
        EVENTS.output(ctx, event, 0);
    }
}
```

```rust
// ユーザー空間側
use aya::maps::perf::AsyncPerfEventArray;
use bytes::BytesMut;

let mut perf_array = AsyncPerfEventArray::try_from(
    bpf.map_mut("EVENTS").unwrap()
)?;

// 各CPUのイベントを受信
for cpu_id in online_cpus()? {
    let mut buf = perf_array.open(cpu_id, None)?;

    tokio::spawn(async move {
        let mut buffers = (0..10)
            .map(|_| BytesMut::with_capacity(4096))
            .collect::<Vec<_>>();

        loop {
            let events = buf.read_events(&mut buffers).await.unwrap();
            for i in 0..events.read {
                let buf = &buffers[i];
                // PacketEventとして解釈
                let event = unsafe {
                    &*(buf.as_ptr() as *const PacketEvent)
                };
                println!(
                    "Packet: {:?} -> {:?} size={}",
                    Ipv4Addr::from(event.src_ip),
                    Ipv4Addr::from(event.dst_ip),
                    event.packet_size
                );
            }
        }
    });
}
```

### 6.5 RingBuf：PerfEventArrayの後継（Linux 5.8+）

```rust
// カーネル側でRingBufを使う
use aya_bpf::{macros::map, maps::RingBuf};

#[map(name = "RING_EVENTS")]
static mut RING_EVENTS: RingBuf = RingBuf::with_byte_size(4096 * 1024, 0);

fn send_ring_event(event: &PacketEvent) {
    unsafe {
        if let Some(mut entry) = RING_EVENTS.reserve::<PacketEvent>(0) {
            *entry = *event;
            entry.submit(0);
        }
    }
}
```

RingBufはPerfEventArrayと比べてメモリ効率が高く、イベントのドロップが発生しにくい。Linux 5.8以上では積極的にRingBufを採用することを推奨する。

---

## 7. 実践例：ネットワーク監視ツールの実装

### 7.1 実装の全体設計

ここでは、TCPコネクションをリアルタイムに監視し、送受信バイト数とコネクション数を表示するツールを実装する。

```
eBPFプログラム（カーネル側）
├── kprobe: tcp_v4_connect → 新規TCP接続を検出
├── kretprobe: tcp_v4_connect → 接続完了を記録
├── kprobe: tcp_sendmsg → 送信バイト数を記録
├── kprobe: tcp_cleanup_rbuf → 受信バイト数を記録
└── kprobe: tcp_close → コネクション終了を記録

ユーザー空間プログラム
├── eBPFプログラムのロード
├── PerfEventArrayでイベントを受信
└── ターミナルにリアルタイム表示
```

### 7.2 共通データ型の定義

```rust
// network-monitor-common/src/lib.rs

#![no_std]

/// TCPイベント種別
#[repr(u32)]
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum TcpEventType {
    Connect = 1,
    Send = 2,
    Recv = 3,
    Close = 4,
}

/// TCPイベント（カーネルからユーザー空間へ送信するデータ）
#[repr(C)]
#[derive(Clone, Copy)]
pub struct TcpEvent {
    pub event_type: TcpEventType,
    pub pid: u32,
    pub src_addr: u32,       // IPv4アドレス（ネットワークバイトオーダー）
    pub dst_addr: u32,
    pub src_port: u16,
    pub dst_port: u16,
    pub bytes: u64,          // Send/Recvイベントのデータ量
    pub timestamp: u64,      // nanoseconds since boot
    pub comm: [u8; 16],      // プロセス名
}
```

### 7.3 カーネル側eBPFプログラム

```rust
// network-monitor-ebpf/src/main.rs

#![no_std]
#![no_main]

use aya_bpf::{
    helpers::{bpf_get_current_comm, bpf_get_current_pid_tgid, bpf_ktime_get_ns},
    macros::{kprobe, map},
    maps::PerfEventArray,
    programs::ProbeContext,
    BpfContext,
};
use network_monitor_common::{TcpEvent, TcpEventType};

/// eBPFイベント送信用のPerfEventArray
#[map(name = "TCP_EVENTS")]
static mut TCP_EVENTS: PerfEventArray<TcpEvent> =
    PerfEventArray::<TcpEvent>::new(0);

/// tcp_v4_connect kprobe: 新規TCP接続の開始を検出
#[kprobe(name = "kprobe_tcp_v4_connect")]
pub fn kprobe_tcp_v4_connect(ctx: ProbeContext) -> u32 {
    match try_kprobe_tcp_v4_connect(&ctx) {
        Ok(ret) => ret,
        Err(_) => 0,
    }
}

fn try_kprobe_tcp_v4_connect(ctx: &ProbeContext) -> Result<u32, i64> {
    // プロセスIDとスレッドグループIDを取得
    let pid_tgid = bpf_get_current_pid_tgid();
    let pid = (pid_tgid >> 32) as u32;

    // プロセス名を取得（最大15文字 + null終端）
    let mut comm = [0u8; 16];
    bpf_get_current_comm(&mut comm);

    // sock構造体からアドレス情報を取得
    // sock * は第1引数として渡される
    // 注意: カーネルの内部構造体へのアクセスには注意が必要
    // 実際の実装ではBTF（BPF Type Format）を使った安全なアクセスが推奨
    let sock_ptr: *const u8 = ctx.arg(0).ok_or(1i64)?;

    // イベントを送信
    let event = TcpEvent {
        event_type: TcpEventType::Connect,
        pid,
        src_addr: 0,  // kretprobeで補完
        dst_addr: 0,
        src_port: 0,
        dst_port: 0,
        bytes: 0,
        timestamp: unsafe { bpf_ktime_get_ns() },
        comm,
    };

    unsafe {
        TCP_EVENTS.output(ctx, &event, 0);
    }

    Ok(0)
}

/// tcp_sendmsg kprobe: TCP送信を検出
#[kprobe(name = "kprobe_tcp_sendmsg")]
pub fn kprobe_tcp_sendmsg(ctx: ProbeContext) -> u32 {
    match try_kprobe_tcp_sendmsg(&ctx) {
        Ok(ret) => ret,
        Err(_) => 0,
    }
}

fn try_kprobe_tcp_sendmsg(ctx: &ProbeContext) -> Result<u32, i64> {
    let pid_tgid = bpf_get_current_pid_tgid();
    let pid = (pid_tgid >> 32) as u32;

    // size_t size (第3引数) = 送信バイト数
    let size: u64 = ctx.arg(2).ok_or(1i64)?;

    let mut comm = [0u8; 16];
    bpf_get_current_comm(&mut comm);

    let event = TcpEvent {
        event_type: TcpEventType::Send,
        pid,
        src_addr: 0,
        dst_addr: 0,
        src_port: 0,
        dst_port: 0,
        bytes: size,
        timestamp: unsafe { bpf_ktime_get_ns() },
        comm,
    };

    unsafe {
        TCP_EVENTS.output(ctx, &event, 0);
    }

    Ok(0)
}

#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    unsafe { core::hint::unreachable_unchecked() }
}
```

### 7.4 ユーザー空間プログラム（完全版）

```rust
// network-monitor/src/main.rs

use anyhow::{Context, Result};
use aya::{
    include_bytes_aligned,
    maps::perf::AsyncPerfEventArray,
    programs::KProbe,
    util::online_cpus,
    Bpf,
};
use aya_log::BpfLogger;
use bytes::BytesMut;
use log::info;
use network_monitor_common::{TcpEvent, TcpEventType};
use std::{
    collections::HashMap,
    net::Ipv4Addr,
    sync::{Arc, Mutex},
};
use tokio::signal;

/// プロセスごとの統計情報
#[derive(Default, Debug)]
struct ProcessStats {
    connections: u64,
    bytes_sent: u64,
    bytes_recv: u64,
}

#[tokio::main]
async fn main() -> Result<()> {
    env_logger::builder()
        .filter_level(log::LevelFilter::Info)
        .init();

    // eBPFオブジェクトのロード
    #[cfg(debug_assertions)]
    let mut bpf = Bpf::load(include_bytes_aligned!(
        "../../target/bpfel-unknown-none/debug/network-monitor"
    ))?;
    #[cfg(not(debug_assertions))]
    let mut bpf = Bpf::load(include_bytes_aligned!(
        "../../target/bpfel-unknown-none/release/network-monitor"
    ))?;

    if let Err(e) = BpfLogger::init(&mut bpf) {
        log::warn!("eBPF logger init failed: {}", e);
    }

    // kprobeをアタッチ
    let probes = [
        ("kprobe_tcp_v4_connect", "tcp_v4_connect"),
        ("kprobe_tcp_sendmsg", "tcp_sendmsg"),
    ];

    for (prog_name, fn_name) in &probes {
        let program: &mut KProbe = bpf
            .program_mut(prog_name)
            .context(format!("program {} not found", prog_name))?
            .try_into()?;
        program.load()?;
        program.attach(fn_name, 0)
            .context(format!("failed to attach to {}", fn_name))?;
        info!("Attached kprobe to {}", fn_name);
    }

    // 統計情報をスレッド間で共有
    let stats: Arc<Mutex<HashMap<u32, ProcessStats>>> =
        Arc::new(Mutex::new(HashMap::new()));

    // PerfEventArrayのセットアップ
    let mut perf_array = AsyncPerfEventArray::try_from(
        bpf.map_mut("TCP_EVENTS")
            .context("TCP_EVENTS map not found")?
    )?;

    // 各CPUのイベントを並列で処理
    let cpus = online_cpus()?;
    for cpu_id in cpus {
        let mut buf = perf_array.open(cpu_id, None)?;
        let stats_clone = Arc::clone(&stats);

        tokio::spawn(async move {
            let mut buffers = (0..10)
                .map(|_| BytesMut::with_capacity(4096))
                .collect::<Vec<_>>();

            loop {
                let events = match buf.read_events(&mut buffers).await {
                    Ok(e) => e,
                    Err(e) => {
                        log::error!("Error reading events: {}", e);
                        break;
                    }
                };

                for i in 0..events.read {
                    let buf = &buffers[i];
                    if buf.len() < core::mem::size_of::<TcpEvent>() {
                        continue;
                    }

                    // バイト列をTcpEventとして解釈
                    let event = unsafe {
                        &*(buf.as_ptr() as *const TcpEvent)
                    };

                    process_event(event, &stats_clone);
                }
            }
        });
    }

    // Ctrl+Cで終了するまでループ
    info!("Monitoring TCP connections... Press Ctrl+C to stop.");
    let stats_for_display = Arc::clone(&stats);

    loop {
        tokio::select! {
            _ = signal::ctrl_c() => {
                info!("Exiting...");
                break;
            }
            _ = tokio::time::sleep(tokio::time::Duration::from_secs(2)) => {
                display_stats(&stats_for_display);
            }
        }
    }

    Ok(())
}

fn process_event(event: &TcpEvent, stats: &Arc<Mutex<HashMap<u32, ProcessStats>>>) {
    let mut stats = stats.lock().unwrap();
    let entry = stats.entry(event.pid).or_default();

    match event.event_type {
        TcpEventType::Connect => entry.connections += 1,
        TcpEventType::Send => entry.bytes_sent += event.bytes,
        TcpEventType::Recv => entry.bytes_recv += event.bytes,
        TcpEventType::Close => {}
    }
}

fn display_stats(stats: &Arc<Mutex<HashMap<u32, ProcessStats>>>) {
    let stats = stats.lock().unwrap();
    if stats.is_empty() {
        return;
    }

    println!("\n{:<10} {:>12} {:>14} {:>14}", "PID", "Connections", "Bytes Sent", "Bytes Recv");
    println!("{:-<55}", "");

    let mut entries: Vec<_> = stats.iter().collect();
    entries.sort_by_key(|(_, s)| -(s.bytes_sent as i64));

    for (pid, s) in entries.iter().take(10) {
        println!(
            "{:<10} {:>12} {:>14} {:>14}",
            pid,
            s.connections,
            format_bytes(s.bytes_sent),
            format_bytes(s.bytes_recv),
        );
    }
}

fn format_bytes(bytes: u64) -> String {
    if bytes >= 1024 * 1024 {
        format!("{:.1} MB", bytes as f64 / (1024.0 * 1024.0))
    } else if bytes >= 1024 {
        format!("{:.1} KB", bytes as f64 / 1024.0)
    } else {
        format!("{} B", bytes)
    }
}
```

---

## 8. デバッグとトラブルシューティング

### 8.1 eBPFプログラムのデバッグ基本方針

eBPFのデバッグは通常のプログラムと比べて独特の難しさがある。カーネル空間で動作するため、デバッガを直接アタッチできない。以下の方法を組み合わせる。

### 8.2 aya-logによるカーネル側ログ出力

`aya-log`を使うと、カーネル側からログを出力してユーザー空間で受信できる。

```rust
// Cargo.toml (eBPF側)
// [dependencies]
// aya-log-ebpf = "0.1"

// カーネル側コード
use aya_log_ebpf::{debug, error, info, warn};

#[xdp(name = "xdp_debug")]
pub fn xdp_debug(ctx: XdpContext) -> u32 {
    let data_end = ctx.data_end();
    let data_start = ctx.data();

    // デバッグログを出力（ユーザー空間のログとして受信される）
    info!(&ctx, "Received packet: {} bytes", data_end - data_start);

    if data_end - data_start > 1500 {
        warn!(&ctx, "Jumbo frame detected: {} bytes", data_end - data_start);
    }

    xdp_action::XDP_PASS
}
```

### 8.3 よくあるエラーとその解決方法

**エラー: `EPERM (Operation not permitted)`**

```bash
# eBPFのロードにはroot権限が必要
sudo ./my-ebpf-app

# または CAP_BPF + CAP_NET_ADMIN を付与
sudo setcap cap_bpf,cap_net_admin+eip ./my-ebpf-app
```

**エラー: `verifier log: invalid memory access`**

```rust
// 原因: バウンダリチェックなしにパケットデータにアクセスしている
// 修正前（Verifierに拒否される）
let eth_hdr = unsafe { &*(ctx.data() as *const EthHdr) };

// 修正後（バウンダリチェックを先に行う）
let data_start = ctx.data() as usize;
let data_end = ctx.data_end() as usize;

if data_start + core::mem::size_of::<EthHdr>() > data_end {
    return Ok(xdp_action::XDP_PASS);
}
let eth_hdr = unsafe { &*(data_start as *const EthHdr) };
```

**エラー: `bpf_linker` not found**

```bash
# bpf-linkerをインストール
cargo install bpf-linker

# パスを確認
which bpf-linker
# → $HOME/.cargo/bin/bpf-linker
```

**エラー: カーネルバージョンが古い**

```bash
# カーネルバージョン確認
uname -r
# 5.8未満の場合はRingBufが使えない
# 5.3未満の場合はeBPF機能が大幅に制限される

# Ubuntu 22.04はカーネル5.15、Ubuntu 24.04はカーネル6.8なので問題なし
```

### 8.4 bpftool でのデバッグ

`bpftool`はカーネルにロードされたeBPFプログラムやMapを確認できる便利ツールだ。

```bash
# ロード済みのeBPFプログラム一覧
sudo bpftool prog list

# 特定のプログラムのbytecodeを逆アセンブル
sudo bpftool prog dump xlated id <prog_id>

# eBPF Mapの一覧
sudo bpftool map list

# Mapの内容を確認
sudo bpftool map dump id <map_id>

# eBPFプログラムの統計情報
sudo bpftool prog show id <prog_id>
```

### 8.5 カーネルログの確認

```bash
# カーネルのeBPF Verifierログを確認
dmesg | grep -i bpf | tail -20

# より詳細なログ（カーネル5.2以降）
cat /sys/kernel/debug/tracing/trace_pipe
```

---

## 9. まとめと参考リンク

### 9.1 本記事のまとめ

本記事では、Rust + eBPF + Ayaフレームワークの組み合わせについて、以下の内容を解説した。

- **eBPFの基礎**: カーネル内でコードを安全に実行するための仮想マシン機構。XDP、kprobe、tracepoint等のフックポイントを通じてイベントを処理できる。

- **なぜRustか**: Cと同等のパフォーマンスを維持しながら、コンパイル時のメモリ安全性保証と型システムによる整合性チェックが得られる。カーネル/ユーザー空間で共通の型定義を再利用できる。

- **Ayaフレームワーク**: libbpf・libc非依存のピュアRust実装。`cargo`によるモダンなビルド体験と、`aya-log`によるデバッグ支援が特徴。

- **XDPパケットカウンター**: 最もシンプルなeBPFプログラムの実装例。Verifierのバウンダリチェック要件、eBPF Map操作、ユーザー空間でのデータ受信を学べる。

- **eBPF Maps**: HashMap、PerfEventArray、RingBufなど用途に応じたMap型の選択方法。

- **実践例**: kprobeを使ったTCP接続監視ツールの実装。PidごとのバイトカウントをPerfEventArrayでリアルタイムに受信・集計する。

### 9.2 次のステップ

eBPF/Ayaをさらに深く学ぶためのロードマップを示す。

1. **TC（Traffic Control）プログラム**: XDPより柔軟な処理が可能。egress（送信方向）のパケットも制御できる。
2. **LSM（Linux Security Module）フック**: `aya_bpf::programs::LsmContext`でセキュリティポリシーをeBPFで実装する。
3. **CO-RE（Compile Once, Run Everywhere）**: BTFを活用して、異なるカーネルバージョンでも動作するポータブルなeBPFプログラムを書く。
4. **Cilium/eBPF Go**: Rustだけでなく、Go言語向けのeBPFライブラリとの比較・連携。
5. **本番環境でのeBPF**: 権限管理（CAP_BPF）、性能チューニング、カーネルバージョン互換性の管理。

### 9.3 参考リンク

**公式リソース**

- [Aya GitHub リポジトリ](https://github.com/aya-rs/aya)：ソースコード・サンプル・ドキュメント
- [Aya Book（公式ドキュメント）](https://aya-rs.dev/book/)：最も信頼できる入門ガイド
- [kernel.org: BPF Documentation](https://www.kernel.org/doc/html/latest/bpf/)：カーネル公式のeBPF仕様

**学習リソース**

- [eBPF.io](https://ebpf.io/)：eBPFの概念・ユースケース・ツール一覧
- [BCC Tools](https://github.com/iovisor/bcc)：Python/Lua/C で書かれたeBPFツール集（参照実装として有用）
- [Cilium eBPF Library](https://github.com/cilium/ebpf)：Go言語の成熟したeBPFライブラリ（アーキテクチャ参考に）

**深掘りリソース**

- Brendan Gregg「BPF Performance Tools」（書籍）：eBPFパフォーマンス分析の決定版
- [Linux カーネルのeBPFサンプル](https://github.com/torvalds/linux/tree/master/samples/bpf)：カーネル内蔵サンプルコード

---

## 開発を加速するツール・リソース

### Claude Code開発プロンプト完全パック（BOOTH）

eBPFやRustの開発で、コード生成・レビュー・デバッグに特化したAIプロンプトセットをBOOTHで販売している。

**「Claude Code開発プロンプト完全パック（¥1,480）」**

- Rustコード生成・リファクタリングプロンプト
- eBPFデバッグ支援プロンプト
- システムプログラミング向けセキュリティレビュープロンプト
- テスト駆動開発（TDD）補助プロンプト

[BOOTH ストアで購入する](https://ezark.booth.pm/)

### DevToolBox — 開発者向けオールインワンツール

Rustの開発中によく使う以下のツールをブラウザ上で即座に利用できる。インストール不要。

**[DevToolBox（usedevtools.com）](https://usedevtools.com)**

| ツール | eBPF/Rust開発での用途 |
|--------|---------------------|
| **JSON Formatter** | eBPFイベントのJSON出力を整形 |
| **Hex Converter** | パケットデータの16進数変換 |
| **Regex Tester** | ログ解析の正規表現検証 |
| **JWT Decoder** | 認証トークンのデバッグ |
| **Unix Timestamp** | bpf_ktime_get_ns()の変換 |
| **Bit Calculator** | フラグ・マスク値の計算 |

### note での技術発信

Rustシステムプログラミング・eBPF・クラウドネイティブ技術に関する深掘り記事を定期的に公開している。

[noteプロフィールをフォローする](https://note.com/)で最新記事の通知を受け取れる。特に以下のトピックで継続的に発信している。

- Rust + WebAssembly の実践
- eBPFによるKubernetes可観測性
- システムプログラミングのパフォーマンスチューニング
- Linuxカーネル内部構造の解説

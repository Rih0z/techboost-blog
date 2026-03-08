---
title: 'WebGPU Compute Shader入門ガイド: ブラウザでGPU並列計算を実現'
description: 'WebGPU Compute Shaderの完全ガイド。GPU計算、WGSL言語、パイプライン構築、バッファ管理、並列処理の実装パターンを実践的に解説。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。'
pubDate: 2025-02-05
tags: ['WebGPU', 'GPU', 'WGSL', 'Compute Shader', '並列計算', 'プログラミング']
heroImage: '../../assets/thumbnails/webgpu-compute-guide.jpg'
---

WebGPUは、ブラウザからGPUの計算能力を直接活用できる次世代Web標準APIです。本記事では、Compute Shaderを使ったGPU並列計算の基本から実践的な実装パターンまで徹底解説します。

## WebGPUとは

### 主な特徴

- **高性能**: GPUの並列計算能力をフル活用
- **モダンAPI**: Vulkan、Metal、DirectX 12ベースの設計
- **クロスプラットフォーム**: Chrome、Edge、Safari（実験的）対応
- **Compute Shader**: グラフィックスだけでなく汎用計算も可能
- **型安全**: 厳密な型システムと検証

### WebGLとの違い

| 特徴 | WebGPU | WebGL 2.0 |
|------|--------|-----------|
| API設計 | モダン | レガシー |
| Compute Shader | あり | なし |
| 並列処理 | 最適化されている | 限定的 |
| パフォーマンス | 高い | 中程度 |
| オーバーヘッド | 低い | 高い |

## 環境セットアップ

### ブラウザ対応確認

```javascript
// WebGPU対応チェック
if (!navigator.gpu) {
    console.error('WebGPU is not supported');
    throw new Error('WebGPU not available');
}

console.log('WebGPU is supported!');
```

### 基本的な初期化

```javascript
// GPUアダプタとデバイスの取得
async function initWebGPU() {
    // アダプタ取得（GPU選択）
    const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
    });

    if (!adapter) {
        throw new Error('No GPU adapter found');
    }

    // デバイス取得
    const device = await adapter.requestDevice();

    // エラーハンドリング
    device.lost.then((info) => {
        console.error(`Device lost: ${info.message}`);
    });

    return { adapter, device };
}

// 使用例
const { adapter, device } = await initWebGPU();
console.log('GPU initialized:', adapter.info);
```

## WGSL（WebGPU Shading Language）基礎

### 基本文法

```wgsl
// 変数宣言
var<private> count: u32 = 0;
const PI: f32 = 3.14159;

// 構造体
struct Particle {
    position: vec3<f32>,
    velocity: vec3<f32>,
    mass: f32,
}

// 関数
fn calculate_distance(a: vec3<f32>, b: vec3<f32>) -> f32 {
    let diff = a - b;
    return length(diff);
}

// エントリーポイント
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    // 計算処理
}
```

### データ型

```wgsl
// スカラー型
var i: i32 = -10;      // 符号付き整数
var u: u32 = 10;       // 符号なし整数
var f: f32 = 3.14;     // 浮動小数点
var b: bool = true;    // 真偽値

// ベクトル型
var v2: vec2<f32> = vec2(1.0, 2.0);
var v3: vec3<f32> = vec3(1.0, 2.0, 3.0);
var v4: vec4<f32> = vec4(1.0, 2.0, 3.0, 4.0);

// 行列型
var m2: mat2x2<f32>;
var m3: mat3x3<f32>;
var m4: mat4x4<f32>;

// 配列
var arr: array<f32, 10>;
```

## シンプルな配列加算（Hello, Compute Shader）

### JavaScript側の実装

```javascript
async function arrayAddition() {
    const { device } = await initWebGPU();

    // 入力データ
    const arrayLength = 1000;
    const inputA = new Float32Array(arrayLength).map(() => Math.random());
    const inputB = new Float32Array(arrayLength).map(() => Math.random());

    // バッファ作成
    const bufferA = device.createBuffer({
        size: inputA.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const bufferB = device.createBuffer({
        size: inputB.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const bufferResult = device.createBuffer({
        size: inputA.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    // データをGPUにコピー
    device.queue.writeBuffer(bufferA, 0, inputA);
    device.queue.writeBuffer(bufferB, 0, inputB);

    // Compute Shader
    const shaderCode = `
        @group(0) @binding(0) var<storage, read> inputA: array<f32>;
        @group(0) @binding(1) var<storage, read> inputB: array<f32>;
        @group(0) @binding(2) var<storage, read_write> output: array<f32>;

        @compute @workgroup_size(64)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let index = global_id.x;
            if (index < arraysize(&inputA)) {
                output[index] = inputA[index] + inputB[index];
            }
        }
    `;

    // シェーダーモジュール作成
    const shaderModule = device.createShaderModule({
        code: shaderCode,
    });

    // バインドグループレイアウト
    const bindGroupLayout = device.createBindGroupLayout({
        entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
            { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        ],
    });

    // パイプラインレイアウト
    const pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
    });

    // Compute Pipeline
    const computePipeline = device.createComputePipeline({
        layout: pipelineLayout,
        compute: {
            module: shaderModule,
            entryPoint: 'main',
        },
    });

    // バインドグループ
    const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
            { binding: 0, resource: { buffer: bufferA } },
            { binding: 1, resource: { buffer: bufferB } },
            { binding: 2, resource: { buffer: bufferResult } },
        ],
    });

    // コマンドエンコーダー
    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(computePipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(Math.ceil(arrayLength / 64));
    passEncoder.end();

    // 結果を読み取るためのバッファ
    const readBuffer = device.createBuffer({
        size: inputA.byteLength,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    commandEncoder.copyBufferToBuffer(bufferResult, 0, readBuffer, 0, inputA.byteLength);

    // コマンド送信
    device.queue.submit([commandEncoder.finish()]);

    // 結果読み取り
    await readBuffer.mapAsync(GPUMapMode.READ);
    const result = new Float32Array(readBuffer.getMappedRange());
    console.log('Result:', result.slice(0, 10));

    readBuffer.unmap();

    // クリーンアップ
    bufferA.destroy();
    bufferB.destroy();
    bufferResult.destroy();
    readBuffer.destroy();
}
```

## 行列乗算（実用的な例）

```wgsl
// 行列乗算シェーダー
@group(0) @binding(0) var<storage, read> matrixA: array<f32>;
@group(0) @binding(1) var<storage, read> matrixB: array<f32>;
@group(0) @binding(2) var<storage, read_write> result: array<f32>;
@group(0) @binding(3) var<uniform> dimensions: vec3<u32>; // M, N, K

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let row = global_id.y;
    let col = global_id.x;

    let M = dimensions.x;
    let N = dimensions.y;
    let K = dimensions.z;

    if (row >= M || col >= N) {
        return;
    }

    var sum = 0.0;
    for (var i = 0u; i < K; i = i + 1u) {
        let a_index = row * K + i;
        let b_index = i * N + col;
        sum = sum + matrixA[a_index] * matrixB[b_index];
    }

    result[row * N + col] = sum;
}
```

```javascript
async function matrixMultiply(matrixA, matrixB, M, N, K) {
    const { device } = await initWebGPU();

    // バッファ作成
    const bufferA = createStorageBuffer(device, matrixA);
    const bufferB = createStorageBuffer(device, matrixB);
    const bufferResult = device.createBuffer({
        size: M * N * 4, // 4 bytes per f32
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    // Uniform バッファ（行列サイズ）
    const dimensionsBuffer = device.createBuffer({
        size: 12, // 3 * u32
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(dimensionsBuffer, 0, new Uint32Array([M, N, K]));

    // Shader、Pipeline、BindGroup設定
    const shaderModule = device.createShaderModule({ code: shaderCode });
    // ... (省略)

    // ディスパッチ
    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(computePipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(Math.ceil(N / 16), Math.ceil(M / 16));
    passEncoder.end();

    // 実行と結果取得
    const readBuffer = createReadBuffer(device, M * N * 4);
    commandEncoder.copyBufferToBuffer(bufferResult, 0, readBuffer, 0, M * N * 4);
    device.queue.submit([commandEncoder.finish()]);

    await readBuffer.mapAsync(GPUMapMode.READ);
    const result = new Float32Array(readBuffer.getMappedRange());
    readBuffer.unmap();

    return result;
}
```

## 画像処理（ガウシアンブラー）

```wgsl
@group(0) @binding(0) var inputTexture: texture_2d<f32>;
@group(0) @binding(1) var outputTexture: texture_storage_2d<rgba8unorm, write>;

const KERNEL_SIZE: u32 = 5u;
const KERNEL: array<f32, 25> = array<f32, 25>(
    1.0/273.0, 4.0/273.0, 7.0/273.0, 4.0/273.0, 1.0/273.0,
    4.0/273.0, 16.0/273.0, 26.0/273.0, 16.0/273.0, 4.0/273.0,
    7.0/273.0, 26.0/273.0, 41.0/273.0, 26.0/273.0, 7.0/273.0,
    4.0/273.0, 16.0/273.0, 26.0/273.0, 16.0/273.0, 4.0/273.0,
    1.0/273.0, 4.0/273.0, 7.0/273.0, 4.0/273.0, 1.0/273.0
);

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let dimensions = textureDimensions(inputTexture);
    let coords = vec2<i32>(global_id.xy);

    if (coords.x >= i32(dimensions.x) || coords.y >= i32(dimensions.y)) {
        return;
    }

    var color = vec4<f32>(0.0);
    let offset = i32(KERNEL_SIZE / 2u);

    for (var y = -offset; y <= offset; y = y + 1) {
        for (var x = -offset; x <= offset; x = x + 1) {
            let sample_coords = coords + vec2<i32>(x, y);
            let clamped = clamp(sample_coords, vec2<i32>(0), vec2<i32>(dimensions - 1u));
            let sample_color = textureLoad(inputTexture, clamped, 0);
            let kernel_index = (y + offset) * i32(KERNEL_SIZE) + (x + offset);
            color = color + sample_color * KERNEL[kernel_index];
        }
    }

    textureStore(outputTexture, coords, color);
}
```

## パーティクルシミュレーション

```wgsl
struct Particle {
    position: vec2<f32>,
    velocity: vec2<f32>,
}

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform> params: SimulationParams;

struct SimulationParams {
    deltaTime: f32,
    particleCount: u32,
    gravity: vec2<f32>,
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (index >= params.particleCount) {
        return;
    }

    var particle = particles[index];

    // 重力適用
    particle.velocity = particle.velocity + params.gravity * params.deltaTime;

    // 速度減衰
    particle.velocity = particle.velocity * 0.99;

    // 位置更新
    particle.position = particle.position + particle.velocity * params.deltaTime;

    // 境界チェック
    if (particle.position.x < -1.0 || particle.position.x > 1.0) {
        particle.velocity.x = -particle.velocity.x * 0.8;
        particle.position.x = clamp(particle.position.x, -1.0, 1.0);
    }

    if (particle.position.y < -1.0 || particle.position.y > 1.0) {
        particle.velocity.y = -particle.velocity.y * 0.8;
        particle.position.y = clamp(particle.position.y, -1.0, 1.0);
    }

    particles[index] = particle;
}
```

## パフォーマンス最適化

### Workgroupサイズの最適化

```wgsl
// 小さいデータ（< 1000要素）
@compute @workgroup_size(64)
fn small_data_kernel() { }

// 中規模データ（1000-100000要素）
@compute @workgroup_size(256)
fn medium_data_kernel() { }

// 大規模データ（> 100000要素）
@compute @workgroup_size(512)
fn large_data_kernel() { }

// 2D処理
@compute @workgroup_size(16, 16)
fn image_processing_kernel() { }
```

### 共有メモリの活用

```wgsl
var<workgroup> shared_data: array<f32, 256>;

@compute @workgroup_size(256)
fn optimized_sum(@builtin(global_invocation_id) global_id: vec3<u32>,
                  @builtin(local_invocation_id) local_id: vec3<u32>) {
    let tid = local_id.x;
    let gid = global_id.x;

    // グローバルメモリからロード
    shared_data[tid] = input_data[gid];
    workgroupBarrier();

    // リダクション（並列合計）
    for (var stride = 128u; stride > 0u; stride = stride / 2u) {
        if (tid < stride) {
            shared_data[tid] = shared_data[tid] + shared_data[tid + stride];
        }
        workgroupBarrier();
    }

    // 結果を書き込み
    if (tid == 0u) {
        output_data[global_id.x / 256u] = shared_data[0];
    }
}
```

### バッファ管理のベストプラクティス

```javascript
class GPUBufferManager {
    constructor(device) {
        this.device = device;
        this.buffers = new Map();
    }

    createBuffer(id, size, usage) {
        const buffer = this.device.createBuffer({ size, usage });
        this.buffers.set(id, buffer);
        return buffer;
    }

    getBuffer(id) {
        return this.buffers.get(id);
    }

    destroyBuffer(id) {
        const buffer = this.buffers.get(id);
        if (buffer) {
            buffer.destroy();
            this.buffers.delete(id);
        }
    }

    destroyAll() {
        for (const buffer of this.buffers.values()) {
            buffer.destroy();
        }
        this.buffers.clear();
    }
}
```

## デバッグとプロファイリング

### エラーハンドリング

```javascript
// シェーダーコンパイルエラーのキャッチ
device.pushErrorScope('validation');
const shaderModule = device.createShaderModule({ code: shaderCode });
const error = await device.popErrorScope();
if (error) {
    console.error('Shader compilation error:', error.message);
}

// タイムスタンプクエリ
const querySet = device.createQuerySet({
    type: 'timestamp',
    count: 2,
});

const commandEncoder = device.createCommandEncoder();
commandEncoder.writeTimestamp(querySet, 0);
// ... compute pass
commandEncoder.writeTimestamp(querySet, 1);

const resolveBuffer = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
});

commandEncoder.resolveQuerySet(querySet, 0, 2, resolveBuffer, 0);
```

## まとめ

WebGPU Compute Shaderの基本から実践的な実装パターンまで解説しました。

### キーポイント

- **並列計算**: GPUの強力な並列処理能力を活用
- **WGSL**: 型安全でモダンなシェーディング言語
- **高パフォーマンス**: WebGLの数倍〜数十倍の性能
- **汎用計算**: グラフィックスだけでなく科学計算、機械学習にも対応

### ユースケース

1. **画像処理**: フィルタ、変換、生成
2. **物理シミュレーション**: パーティクル、流体、衝突検出
3. **機械学習**: ニューラルネットワークの推論
4. **データ処理**: 大規模配列操作、統計計算
5. **暗号処理**: ハッシュ計算、暗号化

WebGPUで、ブラウザ上での高性能計算を実現しましょう。

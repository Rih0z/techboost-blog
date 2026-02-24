---
title: 'Three.js完全ガイド — 3Dグラフィックス・WebGL・アニメーション・React Three Fiber'
description: 'Three.jsで3DウェブグラフィックスをJavaScript/TypeScriptで実装する完全ガイド。Scene・Camera・Renderer・Geometry・Material・Light・Shadow・Animation・React Three Fiber（R3F）まで実装例付きで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-4.jpg'
tags: ['Three.js', 'WebGL', '3D', 'React Three Fiber', 'JavaScript']
---

ウェブブラウザ上でリッチな3Dグラフィックスを実現する技術として、**Three.js** は長年にわたって第一線で使われ続けている。WebGLの低レベルAPIを直接扱う複雑さを隠蔽しつつ、プロダクション品質の3Dシーンを短時間で構築できる強力なライブラリだ。本記事では、Three.jsの基礎から応用、そしてReact Three Fiber（R3F）によるReact統合まで、実装コードを交えながら徹底解説する。

---

## 1. Three.jsとは — WebGL抽象化と採用事例

### WebGLの複雑さを解決する

WebGLはOpenGL ES 2.0をベースにしたブラウザネイティブの3D描画API。しかし生のWebGLコードは非常に冗長で、シェーダーの記述・バッファの管理・行列計算など、単純な立方体を描くだけでも数百行のコードが必要になる。

Three.jsはこの複雑さを抽象化し、直感的なオブジェクト指向APIを提供する。2010年にRicardo Cabelloによってスタートし、現在はGitHubで10万スター以上を獲得しているオープンソースライブラリだ（MITライセンス）。

### 主な採用事例

Three.jsは様々な場面で採用されている。

- **Apple製品ページ**: MacBook・iPhone等のインタラクティブ3D展示
- **Google Earth Web**: ブラウザベースの地球儀表示
- **NASAの可視化プロジェクト**: 宇宙探査データの3Dビジュアライゼーション
- **ゲーム・インタラクティブ体験**: ブラウザゲーム・インスタレーションアート
- **データビジュアライゼーション**: 3Dグラフ・ネットワーク図
- **製品コンフィギュレーター**: 家具・自動車・ファッションの3Dプレビュー

### Three.jsのエコシステム

```
Three.js本体
├── React Three Fiber (R3F) — Reactバインディング
├── Drei — R3F向けユーティリティコレクション
├── Rapier / Cannon.js — 物理演算エンジン統合
├── Postprocessing — エフェクトコンポーザー
├── Leva — GUI コントロールパネル
└── Zustand — 3Dシーン状態管理
```

---

## 2. 基本セットアップ

### インストール

```bash
# npmの場合
npm install three
npm install --save-dev @types/three

# pnpmの場合
pnpm add three
pnpm add -D @types/three
```

### 最小構成のシーン

Three.jsの基本要素は **Scene（シーン）**・**Camera（カメラ）**・**Renderer（レンダラー）** の3つ。

```typescript
// src/main.ts
import * as THREE from 'three';

// 1. シーンの作成
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// 2. カメラの作成（透視投影）
const camera = new THREE.PerspectiveCamera(
  75,                                    // 視野角（FOV）
  window.innerWidth / window.innerHeight, // アスペクト比
  0.1,                                   // ニアクリッピング面
  1000                                   // ファークリッピング面
);
camera.position.set(0, 0, 5);
camera.lookAt(0, 0, 0);

// 3. WebGLレンダラーの作成
const renderer = new THREE.WebGLRenderer({
  antialias: true,       // アンチエイリアス有効化
  alpha: false,          // 透明背景不要
  powerPreference: 'high-performance',
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

// 4. 基本的なメッシュ（立方体）の追加
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0x4f9cf9 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// 5. ライトの追加
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

// 6. アニメーションループ
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  // 毎フレームの更新
  cube.rotation.x += delta * 0.5;
  cube.rotation.y += delta * 0.8;

  renderer.render(scene, camera);
}

animate();

// 7. リサイズ対応
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
```

### カメラの種類

```typescript
// 透視投影カメラ（最も一般的）
const perspectiveCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);

// 平行投影カメラ（2D風・建築・CAD向け）
const orthographicCamera = new THREE.OrthographicCamera(
  -width / 2,   // left
  width / 2,    // right
  height / 2,   // top
  -height / 2,  // bottom
  0.1,          // near
  1000          // far
);

// カメラコントロール（OrbitControls）
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;   // 慣性を持たせた滑らかな操作
controls.dampingFactor = 0.05;
controls.minDistance = 1;
controls.maxDistance = 100;
controls.maxPolarAngle = Math.PI / 2; // 地面より下を見ない

// アニメーションループ内で更新
function animate() {
  requestAnimationFrame(animate);
  controls.update(); // dampingを有効にした場合は必須
  renderer.render(scene, camera);
}
```

---

## 3. Geometry（ジオメトリ）

### 組み込みジオメトリ

```typescript
// 直方体
const boxGeometry = new THREE.BoxGeometry(
  width,    // X方向のサイズ
  height,   // Y方向のサイズ
  depth,    // Z方向のサイズ
  widthSegments,  // X方向の分割数（デフォルト:1）
  heightSegments, // Y方向の分割数
  depthSegments   // Z方向の分割数
);

// 球体
const sphereGeometry = new THREE.SphereGeometry(
  radius,         // 半径
  widthSegments,  // 経度方向の分割数（最低8推奨）
  heightSegments  // 緯度方向の分割数
);

// 平面
const planeGeometry = new THREE.PlaneGeometry(
  width, height,
  widthSegments, heightSegments
);

// 円柱（円錐も作れる）
const cylinderGeometry = new THREE.CylinderGeometry(
  radiusTop,    // 上部半径
  radiusBottom, // 下部半径（0にすると円錐）
  height,
  radialSegments
);

// トーラス（ドーナツ形状）
const torusGeometry = new THREE.TorusGeometry(
  radius,          // 中心からチューブ中心までの距離
  tube,            // チューブの半径
  radialSegments,
  tubularSegments
);

// トーラスノット（複雑な結び目形状）
const torusKnotGeometry = new THREE.TorusKnotGeometry(
  radius, tube, tubularSegments, radialSegments, p, q
);

// 正二十面体（ローポリ球）
const icosahedronGeometry = new THREE.IcosahedronGeometry(radius, detail);
```

### カスタムジオメトリ（BufferGeometry）

```typescript
// 独自の頂点データからジオメトリを作成
const geometry = new THREE.BufferGeometry();

// 三角形の頂点座標（3頂点 × XYZ = 9要素）
const vertices = new Float32Array([
  -1.0, -1.0,  0.0,  // 頂点0
   1.0, -1.0,  0.0,  // 頂点1
   0.0,  1.0,  0.0,  // 頂点2
]);

// 法線ベクトル（ライティング計算用）
const normals = new Float32Array([
  0, 0, 1,
  0, 0, 1,
  0, 0, 1,
]);

// UV座標（テクスチャマッピング用）
const uvs = new Float32Array([
  0.0, 0.0,
  1.0, 0.0,
  0.5, 1.0,
]);

geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

// インデックスバッファで頂点を再利用（メモリ節約）
const indices = new Uint16Array([0, 1, 2]);
geometry.setIndex(new THREE.BufferAttribute(indices, 1));

// 法線の自動計算（手動設定しない場合）
geometry.computeVertexNormals();

// バウンディングボックス・スフィアの計算（フラスタムカリング用）
geometry.computeBoundingBox();
geometry.computeBoundingSphere();

const mesh = new THREE.Mesh(
  geometry,
  new THREE.MeshStandardMaterial({ color: 0xff6b6b, side: THREE.DoubleSide })
);
scene.add(mesh);
```

### 手続き的なジオメトリ生成

```typescript
// ハイトマップから地形を生成する例
function createTerrain(width: number, height: number, resolution: number) {
  const geometry = new THREE.PlaneGeometry(width, height, resolution, resolution);
  const positions = geometry.attributes.position;

  // Simplex Noiseなどで高さを設定
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    // ノイズ関数で高さを計算（ここでは簡略化）
    const y = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 2;
    positions.setY(i, y);
  }

  geometry.computeVertexNormals();
  return geometry;
}
```

---

## 4. Material（マテリアル）

### 基本マテリアル

```typescript
// ライティング非依存（シェーダー不使用）— 最も軽量
const basicMaterial = new THREE.MeshBasicMaterial({
  color: 0xff0000,
  wireframe: false,
  transparent: false,
  opacity: 1.0,
  side: THREE.FrontSide, // FrontSide / BackSide / DoubleSide
});

// ランバートシェーディング（拡散反射のみ）— 中間的な品質
const lambertMaterial = new THREE.MeshLambertMaterial({
  color: 0x00ff00,
  emissive: 0x111111, // 自己発光色
});

// フォンシェーディング（鏡面反射あり）
const phongMaterial = new THREE.MeshPhongMaterial({
  color: 0x0000ff,
  specular: 0xffffff,  // 鏡面反射色
  shininess: 100,       // 鏡面反射の鋭さ
});

// PBR（物理ベースレンダリング）— 最高品質・最重量
const standardMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  metalness: 0.5,  // 金属度（0: 非金属, 1: 金属）
  roughness: 0.3,  // 粗さ（0: 鏡面, 1: 完全拡散）
  envMapIntensity: 1.0,
  normalMap: normalTexture,
  roughnessMap: roughnessTexture,
  metalnessMap: metalnessTexture,
  aoMap: aoTexture,           // アンビエントオクルージョン
  aoMapIntensity: 1.0,
  displacementMap: heightMap, // 変位マップ
  displacementScale: 0.1,
});

// より高性能なPBRマテリアル
const physicalMaterial = new THREE.MeshPhysicalMaterial({
  ...standardMaterial,
  clearcoat: 1.0,         // クリアコート（車のペイント風）
  clearcoatRoughness: 0.1,
  transmission: 0.9,      // 透過（ガラス風）
  thickness: 0.5,
  ior: 1.5,               // 屈折率
  iridescence: 1.0,       // 虹彩（シャボン玉風）
});
```

### ShaderMaterial（カスタムシェーダー）

```typescript
// GLSL シェーダーを直接記述
const shaderMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0.0 },
    uColor: { value: new THREE.Color(0x4f9cf9) },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
  },
  vertexShader: /* glsl */ `
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vPosition = position;

      // 頂点を波打たせる
      vec3 pos = position;
      pos.y += sin(pos.x * 2.0 + uTime) * 0.2;
      pos.y += cos(pos.z * 2.0 + uTime * 0.5) * 0.2;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform vec3 uColor;
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      // 時間変化するグラデーション
      vec3 color = uColor;
      color.r += sin(vUv.x * 10.0 + uTime) * 0.2;
      color.b += cos(vUv.y * 10.0 + uTime * 0.7) * 0.2;

      // フレネル効果（エッジを光らせる）
      float fresnel = pow(1.0 - dot(normalize(vPosition), vec3(0.0, 0.0, 1.0)), 3.0);
      color += fresnel * 0.5;

      gl_FragColor = vec4(color, 1.0);
    }
  `,
  side: THREE.DoubleSide,
});

// アニメーションループ内でuniformを更新
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  shaderMaterial.uniforms.uTime.value = clock.getElapsedTime();
  renderer.render(scene, camera);
}
```

---

## 5. Light（ライト）

### ライトの種類と使い方

```typescript
// アンビエントライト（環境光）— 全方向から均等に照らす
const ambientLight = new THREE.AmbientLight(
  0xffffff, // 色
  0.5       // 強度
);
scene.add(ambientLight);

// 平行光源（太陽光）— 無限遠からの平行光
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(10, 20, 10);
directionalLight.target.position.set(0, 0, 0);
scene.add(directionalLight);
scene.add(directionalLight.target);

// シャドウ設定
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;  // シャドウマップ解像度
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 100;
directionalLight.shadow.camera.left = -20;
directionalLight.shadow.camera.right = 20;
directionalLight.shadow.camera.top = 20;
directionalLight.shadow.camera.bottom = -20;
directionalLight.shadow.bias = -0.0001;        // シャドウアクネ対策
directionalLight.shadow.normalBias = 0.02;

// ポイントライト（点光源）— 電球・炎
const pointLight = new THREE.PointLight(
  0xff6600, // オレンジ色
  2.0,      // 強度
  20.0,     // 光の届く最大距離
  2.0       // 減衰係数
);
pointLight.position.set(0, 5, 0);
pointLight.castShadow = true;
scene.add(pointLight);

// スポットライト — 舞台照明
const spotLight = new THREE.SpotLight(
  0xffffff,
  2.0,      // 強度
  30,       // 距離
  Math.PI / 6, // 角度（コーン半角）
  0.3,      // penumbra（エッジのぼかし 0-1）
  2.0       // 減衰
);
spotLight.position.set(5, 10, 5);
spotLight.castShadow = true;
spotLight.shadow.mapSize.set(1024, 1024);
scene.add(spotLight);

// 半球ライト（空と地面からの環境光）
const hemisphereLight = new THREE.HemisphereLight(
  0x87ceeb, // 空の色
  0x8b7355, // 地面の色
  0.5       // 強度
);
scene.add(hemisphereLight);

// RectAreaLight（面光源）— スタジオのソフトボックス
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper.js';

RectAreaLightUniformsLib.init();

const rectAreaLight = new THREE.RectAreaLight(0xffffff, 5, 4, 4);
rectAreaLight.position.set(-5, 5, 0);
rectAreaLight.lookAt(0, 0, 0);
scene.add(rectAreaLight);

// シャドウを受け取るオブジェクトの設定
mesh.castShadow = true;
mesh.receiveShadow = true;

// デバッグ用ヘルパー
const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, 2);
scene.add(directionalLightHelper);

const shadowCameraHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
scene.add(shadowCameraHelper);
```

---

## 6. Texture（テクスチャ）

### 基本的なテクスチャ読み込み

```typescript
const textureLoader = new THREE.TextureLoader();

// 単一テクスチャの読み込み
const texture = textureLoader.load(
  '/textures/wood_diffuse.jpg',
  // onLoad コールバック
  (texture) => {
    console.log('テクスチャ読み込み完了', texture);
  },
  // onProgress
  undefined,
  // onError
  (error) => {
    console.error('テクスチャ読み込みエラー', error);
  }
);

// テクスチャのパラメータ設定
texture.wrapS = THREE.RepeatWrapping;  // 水平方向の繰り返し
texture.wrapT = THREE.RepeatWrapping;  // 垂直方向の繰り返し
texture.repeat.set(4, 4);             // 4x4で繰り返し
texture.anisotropy = renderer.capabilities.getMaxAnisotropy(); // 異方性フィルタリング

// LoadingManagerで複数テクスチャを一括管理
const loadingManager = new THREE.LoadingManager();
loadingManager.onStart = (url, itemsLoaded, itemsTotal) => {
  console.log(`読み込み開始: ${url} (${itemsLoaded}/${itemsTotal})`);
};
loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
  const progress = (itemsLoaded / itemsTotal) * 100;
  updateProgressBar(progress);
};
loadingManager.onLoad = () => {
  console.log('全アセット読み込み完了');
  startScene();
};
loadingManager.onError = (url) => {
  console.error(`読み込みエラー: ${url}`);
};

const managedLoader = new THREE.TextureLoader(loadingManager);
```

### PBRテクスチャセットの適用

```typescript
// PBR テクスチャセット（Metal/Roughness ワークフロー）
const material = new THREE.MeshStandardMaterial();

// TextureLoader でまとめて読み込み
const [colorMap, normalMap, roughnessMap, metalnessMap, aoMap] = await Promise.all([
  textureLoader.loadAsync('/textures/metal_color.jpg'),
  textureLoader.loadAsync('/textures/metal_normal.jpg'),
  textureLoader.loadAsync('/textures/metal_roughness.jpg'),
  textureLoader.loadAsync('/textures/metal_metalness.jpg'),
  textureLoader.loadAsync('/textures/metal_ao.jpg'),
]);

// 各マップを設定
material.map = colorMap;
material.normalMap = normalMap;
material.normalScale.set(1, 1);
material.roughnessMap = roughnessMap;
material.metalnessMap = metalnessMap;
material.aoMap = aoMap;
material.aoMapIntensity = 1.0;

// 環境マップ（IBL — Image Based Lighting）
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { PMREMGenerator } from 'three';

const rgbeLoader = new RGBELoader();
const pmremGenerator = new PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

rgbeLoader.load('/hdr/studio_small_08_1k.hdr', (hdrTexture) => {
  const envMap = pmremGenerator.fromEquirectangular(hdrTexture).texture;

  scene.environment = envMap;  // 全マテリアルに適用
  scene.background = envMap;   // 背景としても使用

  hdrTexture.dispose();
  pmremGenerator.dispose();
});
```

### キャンバスで動的テクスチャを生成

```typescript
// Canvas2Dで動的テクスチャ生成
function createDynamicTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // 背景
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, 512, 512);

  // テキスト
  ctx.fillStyle = '#4f9cf9';
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// VideoTextureで動画をテクスチャとして使用
const video = document.createElement('video');
video.src = '/videos/demo.mp4';
video.loop = true;
video.muted = true;
video.play();

const videoTexture = new THREE.VideoTexture(video);
videoTexture.minFilter = THREE.LinearFilter;
videoTexture.magFilter = THREE.LinearFilter;
```

---

## 7. Animation（アニメーション）

### AnimationMixerとKeyframeTrack

```typescript
// GLTFモデルに含まれるアニメーションの再生
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
let mixer: THREE.AnimationMixer;

loader.load('/models/character.glb', (gltf) => {
  const model = gltf.scene;
  scene.add(model);

  // AnimationMixer の作成
  mixer = new THREE.AnimationMixer(model);

  // 全アニメーションクリップを確認
  console.log('利用可能なアニメーション:', gltf.animations.map(a => a.name));

  // 特定のアニメーションを再生
  const idleAction = mixer.clipAction(
    THREE.AnimationClip.findByName(gltf.animations, 'Idle')
  );
  idleAction.play();

  // 複数アニメーションのクロスフェード
  const walkAction = mixer.clipAction(
    THREE.AnimationClip.findByName(gltf.animations, 'Walk')
  );

  // 歩行アニメーションへのトランジション
  function transitionToWalk() {
    walkAction.enabled = true;
    walkAction.setEffectiveTimeScale(1);
    walkAction.setEffectiveWeight(1);
    walkAction.play();
    idleAction.crossFadeTo(walkAction, 0.5, true); // 0.5秒でフェード
  }
});

// アニメーションループ内でMixerを更新
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  renderer.render(scene, camera);
}
```

### 手動でKeyframeTrackを作成

```typescript
// KeyframeTrackでプロパティをアニメーション
const times = [0, 1, 2, 3];
const positionValues = [
  0, 0, 0,    // t=0: 原点
  2, 0, 0,    // t=1: 右
  2, 2, 0,    // t=2: 右上
  0, 0, 0,    // t=3: 原点に戻る
];

const positionTrack = new THREE.VectorKeyframeTrack(
  'mesh.position',
  times,
  positionValues
);

const scaleValues = [
  1, 1, 1,
  1.5, 1.5, 1.5,
  0.5, 0.5, 0.5,
  1, 1, 1,
];

const scaleTrack = new THREE.VectorKeyframeTrack(
  'mesh.scale',
  times,
  scaleValues
);

// QuaternionKeyframeTrackで回転アニメーション
const quaternionValues = [
  0, 0, 0, 1,
  0, Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4), // Y軸90度
  0, Math.sin(Math.PI / 2), 0, Math.cos(Math.PI / 2), // Y軸180度
  0, 0, 0, 1,
];

const rotationTrack = new THREE.QuaternionKeyframeTrack(
  'mesh.quaternion',
  times,
  quaternionValues
);

const clip = new THREE.AnimationClip('custom-animation', 3, [
  positionTrack,
  scaleTrack,
  rotationTrack,
]);

const mixer = new THREE.AnimationMixer(mesh);
const action = mixer.clipAction(clip);
action.setLoop(THREE.LoopRepeat, Infinity);
action.play();
```

### GSAPとの統合

```typescript
// GSAPをThree.jsと組み合わせる
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// スクロール連動の3Dアニメーション
ScrollTrigger.create({
  trigger: '#scroll-container',
  start: 'top top',
  end: 'bottom bottom',
  onUpdate: (self) => {
    const progress = self.progress;

    // スクロール量に応じてカメラ移動
    camera.position.x = progress * 10 - 5;
    camera.position.y = Math.sin(progress * Math.PI) * 3;
    camera.lookAt(0, 0, 0);

    // モデルの回転
    model.rotation.y = progress * Math.PI * 2;
  }
});

// GSAP Timelineで複雑なアニメーション
const tl = gsap.timeline({ repeat: -1, yoyo: true });

tl.to(cube.position, {
  x: 3,
  duration: 1,
  ease: 'power2.inOut',
})
.to(cube.rotation, {
  y: Math.PI * 2,
  duration: 1,
  ease: 'linear',
}, '<') // 前のアニメーションと同時に開始
.to(cube.material, {
  opacity: 0.3,
  duration: 0.5,
});
```

---

## 8. 3Dモデル読み込み（GLTFLoader・Draco圧縮）

### GLTFLoaderの基本

```typescript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// Draco圧縮デコーダーの設定
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/'); // CDNも使用可能
// dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

// GLTFLoaderにDracoLoaderを紐付け
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

// モデルの読み込み
gltfLoader.load(
  '/models/scene.glb',
  (gltf) => {
    const model = gltf.scene;

    // シーン内の全メッシュにシャドウを設定
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        // マテリアルの調整
        if (child.material instanceof THREE.MeshStandardMaterial) {
          child.material.envMapIntensity = 1.5;
        }
      }
    });

    // モデルのサイズを調整
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim;
    model.scale.setScalar(scale);

    // モデルを中心に配置
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center.multiplyScalar(scale));

    scene.add(model);
  },
  // 進捗コールバック
  (xhr) => {
    const percent = (xhr.loaded / xhr.total) * 100;
    console.log(`${percent.toFixed(1)}% 読み込み済み`);
  },
  (error) => {
    console.error('モデル読み込みエラー:', error);
  }
);
```

### モデルメタデータのJSON管理

3Dモデルを大量に扱うプロジェクトでは、モデルのメタデータ（パス・スケール・アニメーション一覧・マテリアル設定など）をJSONで管理するのが一般的だ。

```typescript
// model-registry.json の例
interface ModelMetadata {
  id: string;
  name: string;
  path: string;
  scale: number;
  position: [number, number, number];
  rotation: [number, number, number];
  animations: string[];
  tags: string[];
  compressed: boolean;
  fileSize: number; // KB
}

const modelRegistry: ModelMetadata[] = [
  {
    id: 'character-01',
    name: '主人公キャラクター',
    path: '/models/character.glb',
    scale: 1.0,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    animations: ['Idle', 'Walk', 'Run', 'Jump', 'Attack'],
    tags: ['character', 'humanoid'],
    compressed: true,
    fileSize: 2048,
  },
];
```

このようなJSONデータを扱う際は、スキーマのバリデーションが重要になる。**[DevToolBox](https://usedevtools.com/)** のJSON Validatorを使うと、モデルメタデータのJSONスキーマ検証・整形・差分確認をブラウザ上で手軽に行える。特に複数人での開発時や、外部のアセットパイプラインからJSONを受け取る際に、期待するスキーマに合致しているかをリアルタイムで確認できて便利だ。

---

## 9. ポストプロセッシング

### EffectComposerの設定

```typescript
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';

// EffectComposer の初期化
const composer = new EffectComposer(renderer);

// 1. シーンのレンダリング（基本パス）
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// 2. Bloom（発光エフェクト）
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5,  // strength（強度）
  0.4,  // radius（半径）
  0.85  // threshold（閾値）
);
composer.addPass(bloomPass);

// 3. SSAO（スクリーンスペースアンビエントオクルージョン）
const ssaoPass = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
ssaoPass.kernelRadius = 16;
ssaoPass.minDistance = 0.005;
ssaoPass.maxDistance = 0.1;
composer.addPass(ssaoPass);

// 4. FXAA（アンチエイリアス）— 最後に適用
const fxaaPass = new ShaderPass(FXAAShader);
fxaaPass.material.uniforms['resolution'].value.x = 1 / (window.innerWidth * renderer.getPixelRatio());
fxaaPass.material.uniforms['resolution'].value.y = 1 / (window.innerHeight * renderer.getPixelRatio());
composer.addPass(fxaaPass);

// アニメーションループ内ではcomposerを使ってレンダリング
function animate() {
  requestAnimationFrame(animate);
  composer.render(); // renderer.render(scene, camera) の代わり
}

// リサイズ対応
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  composer.setSize(width, height);

  fxaaPass.material.uniforms['resolution'].value.x = 1 / (width * renderer.getPixelRatio());
  fxaaPass.material.uniforms['resolution'].value.y = 1 / (height * renderer.getPixelRatio());
});
```

### カスタムポストプロセッシングパス

```typescript
// 独自のポストプロセッシングシェーダー（ヴィネット + カラーグレーディング）
const customShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignetteIntensity: { value: 0.5 },
    uContrast: { value: 1.1 },
    uBrightness: { value: 0.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uVignetteIntensity;
    uniform float uContrast;
    uniform float uBrightness;
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // コントラスト・ブライトネス調整
      color.rgb = (color.rgb - 0.5) * uContrast + 0.5 + uBrightness;

      // ヴィネット効果
      vec2 center = vUv - 0.5;
      float vignette = 1.0 - dot(center, center) * uVignetteIntensity * 4.0;
      color.rgb *= vignette;

      gl_FragColor = color;
    }
  `,
};

const customPass = new ShaderPass(customShader);
composer.addPass(customPass);
```

---

## 10. React Three Fiber（R3F）

### セットアップ

```bash
npm install @react-three/fiber @react-three/drei three
npm install --save-dev @types/three
```

### 基本的なシーン構築

```tsx
// src/components/Scene3D.tsx
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useRef, useState } from 'react';
import * as THREE from 'three';

// 回転する立方体コンポーネント
function RotatingCube() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);

  // 毎フレーム実行（アニメーションループ）
  useFrame((state, delta) => {
    meshRef.current.rotation.x += delta * 0.5;
    meshRef.current.rotation.y += delta * 0.8;

    // ホバー時に浮き上がる
    meshRef.current.position.y = hovered
      ? Math.sin(state.clock.elapsedTime * 2) * 0.1 + 0.5
      : 0;
  });

  return (
    <mesh
      ref={meshRef}
      scale={clicked ? 1.5 : 1}
      onClick={() => setClicked(!clicked)}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={hovered ? '#ff6b6b' : '#4f9cf9'}
        metalness={0.3}
        roughness={0.4}
      />
    </mesh>
  );
}

// シーン設定コンポーネント（useThreeで状態にアクセス）
function SceneSetup() {
  const { scene, camera, gl } = useThree();

  useFrame(() => {
    // ここでThree.jsの生のAPIにアクセスできる
  });

  return null;
}

// メインのCanvasコンポーネント
export function Scene3D() {
  return (
    <Canvas
      shadows                          // シャドウ有効化
      camera={{ position: [3, 3, 5], fov: 60 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      style={{ width: '100%', height: '600px', background: '#1a1a2e' }}
    >
      {/* 照明 */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <pointLight position={[-5, 5, -5]} intensity={0.5} color="#4f9cf9" />

      {/* メッシュ */}
      <RotatingCube />

      {/* 地面 */}
      <mesh rotation-x={-Math.PI / 2} position-y={-1} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#2a2a3e" roughness={0.8} />
      </mesh>

      <SceneSetup />
    </Canvas>
  );
}
```

### useFrameの高度な使い方

```tsx
// src/components/ParticleSystem.tsx
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

const PARTICLE_COUNT = 5000;

export function ParticleSystem() {
  const meshRef = useRef<THREE.Points>(null!);

  // メモ化でジオメトリの再生成を防ぐ
  const [positions, velocities] = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      // 球状に分布
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random() * 5;

      positions[i3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = r * Math.cos(phi);

      // ランダムな速度
      velocities[i3]     = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    return [positions, velocities];
  }, []);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const pos = meshRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      pos[i3]     += Math.sin(time + i) * 0.001;
      pos[i3 + 1] += velocities[i3 + 1];
      pos[i3 + 2] += Math.cos(time + i) * 0.001;

      // 範囲外に出たら反対側から
      if (Math.abs(pos[i3 + 1]) > 5) velocities[i3 + 1] *= -1;
    }

    meshRef.current.geometry.attributes.position.needsUpdate = true;
    meshRef.current.rotation.y = time * 0.05;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#4f9cf9"
        sizeAttenuation
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
```

---

## 11. Drei（DreiユーティリティとOrbitControls）

### Dreiの主要コンポーネント

```tsx
import {
  OrbitControls,
  Text,
  Html,
  useGLTF,
  Environment,
  Stars,
  Float,
  Sparkles,
  MeshReflectorMaterial,
  PerspectiveCamera,
  PresentationControls,
  useProgress,
  Loader,
  ScrollControls,
  useScroll,
  Cloud,
  Sky,
} from '@react-three/drei';
import { Suspense } from 'react';
import { useFrame } from '@react-three/fiber';

// OrbitControls — カメラコントロール
function Scene() {
  return (
    <>
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2}
        dampingFactor={0.05}
        autoRotate
        autoRotateSpeed={1.0}
      />

      {/* 3Dテキスト */}
      <Text
        position={[0, 2, 0]}
        fontSize={0.5}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Inter-Bold.woff"
        letterSpacing={0.02}
        lineHeight={1}
      >
        Three.js
      </Text>

      {/* HTMLオーバーレイ（3D空間内にHTMLを配置） */}
      <Html
        position={[2, 1, 0]}
        center
        occlude            // 他のオブジェクトで隠れる
        transform         // 3Dトランスフォームに追従
      >
        <div style={{
          background: 'rgba(0,0,0,0.8)',
          padding: '8px 16px',
          borderRadius: '4px',
          color: 'white',
          fontSize: '14px',
          whiteSpace: 'nowrap',
        }}>
          Interactive 3D Object
        </div>
      </Html>

      {/* 環境マップ */}
      <Environment preset="studio" background blur={0.5} />

      {/* 星空 */}
      <Stars
        radius={100}
        depth={50}
        count={5000}
        factor={4}
        saturation={0}
        fade
      />

      {/* 浮遊アニメーション */}
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <mesh>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#4f9cf9" wireframe />
        </mesh>
      </Float>

      {/* パーティクル */}
      <Sparkles count={100} scale={5} size={2} speed={0.3} color="#4f9cf9" />

      {/* 反射床 */}
      <mesh rotation-x={-Math.PI / 2} position-y={-2}>
        <planeGeometry args={[20, 20]} />
        <MeshReflectorMaterial
          blur={[300, 100]}
          resolution={1024}
          mixBlur={1}
          mixStrength={80}
          roughness={1}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#101010"
          metalness={0.5}
          mirror={0.5}
        />
      </mesh>
    </>
  );
}

// useGLTF — GLTFモデル読み込みフック（キャッシュ付き）
function Model({ url }: { url: string }) {
  const { scene, animations } = useGLTF(url);

  // プリロードで読み込みを事前開始
  useGLTF.preload(url);

  return <primitive object={scene} />;
}

// ローディングUI
function LoadingScreen() {
  const { progress, active } = useProgress();

  return (
    <Html center>
      {active && (
        <div style={{ color: 'white', textAlign: 'center' }}>
          <p>{progress.toFixed(0)}% 読み込み中...</p>
          <div style={{
            width: '200px',
            height: '4px',
            background: '#333',
            borderRadius: '2px',
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: '#4f9cf9',
              borderRadius: '2px',
              transition: 'width 0.3s',
            }} />
          </div>
        </div>
      )}
    </Html>
  );
}

// スクロール連動アニメーション
function ScrollScene() {
  return (
    <ScrollControls pages={5} damping={0.1}>
      <ScrollLinkedContent />
    </ScrollControls>
  );
}

function ScrollLinkedContent() {
  const scroll = useScroll();
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(() => {
    groupRef.current.rotation.y = scroll.offset * Math.PI * 2;
    groupRef.current.position.y = -scroll.offset * 10;
  });

  return (
    <group ref={groupRef}>
      {/* スクロールに追従するコンテンツ */}
    </group>
  );
}

// メインCanvas
export function DreiFeaturesDemo() {
  return (
    <Canvas shadows camera={{ position: [0, 2, 8], fov: 60 }}>
      <Suspense fallback={<LoadingScreen />}>
        <Scene />
        <Suspense fallback={null}>
          <Model url="/models/scene.glb" />
        </Suspense>
      </Suspense>
    </Canvas>
  );
}
```

---

## 12. パフォーマンス最適化

### インスタンス化（Instancing）

```tsx
// InstancedMeshで大量オブジェクトを効率的に描画
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const INSTANCE_COUNT = 10000;

function InstancedCubes() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);

  const { matrices, colors } = useMemo(() => {
    const matrices: THREE.Matrix4[] = [];
    const colors: THREE.Color[] = [];
    const dummy = new THREE.Object3D();

    for (let i = 0; i < INSTANCE_COUNT; i++) {
      dummy.position.set(
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50
      );
      dummy.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      dummy.scale.setScalar(Math.random() * 0.5 + 0.1);
      dummy.updateMatrix();
      matrices.push(dummy.matrix.clone());

      colors.push(new THREE.Color().setHSL(Math.random(), 0.8, 0.6));
    }

    return { matrices, colors };
  }, []);

  // 初期化
  useMemo(() => {
    if (!meshRef.current) return;
    matrices.forEach((matrix, i) => {
      meshRef.current.setMatrixAt(i, matrix);
      meshRef.current.setColorAt(i, colors[i]);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [matrices, colors]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < INSTANCE_COUNT; i++) {
      meshRef.current.getMatrixAt(i, dummy.matrix);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
      dummy.rotation.y = time * 0.5 + i * 0.001;
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, INSTANCE_COUNT]}
      castShadow
    >
      <boxGeometry args={[0.3, 0.3, 0.3]} />
      <meshStandardMaterial roughness={0.5} metalness={0.3} />
    </instancedMesh>
  );
}
```

### LOD（Level of Detail）

```typescript
// 距離に応じてジオメトリの詳細度を変える
const lod = new THREE.LOD();

// 近距離（高詳細）
const highDetailMesh = new THREE.Mesh(
  new THREE.SphereGeometry(1, 64, 64),
  material
);
lod.addLevel(highDetailMesh, 0);   // 距離0〜に使用

// 中距離（中詳細）
const medDetailMesh = new THREE.Mesh(
  new THREE.SphereGeometry(1, 16, 16),
  material
);
lod.addLevel(medDetailMesh, 10);   // 距離10〜に使用

// 遠距離（低詳細）
const lowDetailMesh = new THREE.Mesh(
  new THREE.SphereGeometry(1, 4, 4),
  material
);
lod.addLevel(lowDetailMesh, 30);   // 距離30〜に使用

scene.add(lod);

// アニメーションループ内でLODを更新
function animate() {
  requestAnimationFrame(animate);
  lod.update(camera); // カメラとの距離でLODを自動切替
  renderer.render(scene, camera);
}
```

### フラスタムカリングとその他の最適化

```typescript
// フラスタムカリング — カメラに写らないオブジェクトをスキップ
mesh.frustumCulled = true; // デフォルトはtrue（無効化する場合のみ設定）

// ジオメトリの使い回し（同じジオメトリを複数メッシュで共有）
const sharedGeometry = new THREE.BoxGeometry(1, 1, 1);
const mesh1 = new THREE.Mesh(sharedGeometry, material1);
const mesh2 = new THREE.Mesh(sharedGeometry, material2); // 同じジオメトリを参照

// マテリアルの使い回し
const sharedMaterial = new THREE.MeshStandardMaterial({ color: 0x4f9cf9 });

// メモリ解放（コンポーネントアンマウント時）
function cleanup() {
  geometry.dispose();
  material.dispose();
  texture.dispose();
  renderer.dispose();
}

// レンダラーの最適化設定
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 高DPIで過負荷防止
renderer.powerPreference = 'high-performance';

// Stats.js でパフォーマンス計測
import Stats from 'three/examples/jsm/libs/stats.module.js';
const stats = new Stats();
document.body.appendChild(stats.dom);

function animate() {
  stats.begin();
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  stats.end();
}

// R3Fでのパフォーマンス最適化
import { Instances, Instance } from '@react-three/drei';
import { memo } from 'react';

// Memoでコンポーネントの再レンダリングを防ぐ
const OptimizedMesh = memo(function OptimizedMesh() {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame((_, delta) => {
    ref.current.rotation.y += delta;
  });

  return (
    <mesh ref={ref}>
      <boxGeometry />
      <meshStandardMaterial />
    </mesh>
  );
});

// Drei の Instances コンポーネント（R3F版インスタンシング）
function OptimizedInstances() {
  return (
    <Instances limit={1000} range={1000}>
      <boxGeometry args={[0.2, 0.2, 0.2]} />
      <meshStandardMaterial />
      {Array.from({ length: 1000 }, (_, i) => (
        <Instance
          key={i}
          position={[
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20,
          ]}
          rotation={[Math.random(), Math.random(), Math.random()]}
          color={new THREE.Color().setHSL(Math.random(), 0.8, 0.6)}
        />
      ))}
    </Instances>
  );
}
```

### R3Fのパフォーマンスモニタリング

```tsx
import { PerformanceMonitor } from '@react-three/drei';

export function AdaptiveScene() {
  const [dpr, setDpr] = useState(1.5);

  return (
    <Canvas dpr={dpr}>
      {/* パフォーマンスモニタリング — FPSに応じてDPRを自動調整 */}
      <PerformanceMonitor
        onIncline={() => setDpr(2)}      // FPS良好→高品質
        onDecline={() => setDpr(1)}      // FPS低下→品質下げる
        flipflops={3}                    // 3回フリップフロップで確定
        factor={0.5}
        bounds={(refreshrate) => [refreshrate / 2, refreshrate - 5]}
      >
        <Scene />
      </PerformanceMonitor>
    </Canvas>
  );
}
```

---

## 13. デプロイ（Vercel・アセット最適化）

### Vite + Vercelでのデプロイ

```bash
# Viteプロジェクトのセットアップ
npm create vite@latest my-threejs-app -- --template vanilla-ts
cd my-threejs-app
npm install three @types/three
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Three.jsを別チャンクに分割
        manualChunks: {
          three: ['three'],
          'three-addons': [
            'three/examples/jsm/loaders/GLTFLoader',
            'three/examples/jsm/controls/OrbitControls',
            'three/examples/jsm/postprocessing/EffectComposer',
          ],
        },
      },
    },
    // チャンクサイズ警告の閾値を調整（Three.jsは大きい）
    chunkSizeWarningLimit: 800,
  },
  // publicディレクトリの3Dアセットはそのままコピー
  publicDir: 'public',
  // 開発サーバーでCORSを許可（モデルファイル読み込みのため）
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
```

### アセット最適化のベストプラクティス

```bash
# GLBモデルの最適化（gltf-transform使用）
npm install -g @gltf-transform/cli

# 最適化パイプライン
gltf-transform optimize model.glb model-optimized.glb

# Draco圧縮（ジオメトリ圧縮）
gltf-transform draco model.glb model-draco.glb

# テクスチャをWebPに変換（容量削減）
gltf-transform webp model.glb model-webp.glb --quality 80

# KTX2/Basisテクスチャ圧縮（GPU圧縮）
gltf-transform etc1s model.glb model-basis.glb  # モバイル向け
gltf-transform uastc model.glb model-uastc.glb  # デスクトップ向け

# 全最適化を一括実行
gltf-transform optimize model.glb model-final.glb \
  --texture-compress webp \
  --texture-size 1024
```

### Vercelへのデプロイ設定

```json
// vercel.json
{
  "headers": [
    {
      "source": "/models/(.*)\\.glb",
      "headers": [
        { "key": "Content-Type", "value": "model/gltf-binary" },
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/textures/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/hdr/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=86400" }
      ]
    }
  ],
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Next.js + R3Fのデプロイ

```tsx
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['three'],
  webpack: (config) => {
    // GLSLシェーダーファイルをインポート可能にする
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      use: ['raw-loader', 'glslify-loader'],
    });
    return config;
  },
};

export default nextConfig;
```

```tsx
// src/app/scene/page.tsx
import dynamic from 'next/dynamic';

// Three.jsはSSR非対応なのでクライアントサイドのみで読み込む
const Scene3D = dynamic(
  () => import('@/components/Scene3D').then((mod) => mod.Scene3D),
  {
    ssr: false,
    loading: () => (
      <div style={{
        width: '100%',
        height: '600px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a2e',
        color: '#fff',
      }}>
        3Dシーンを読み込み中...
      </div>
    ),
  }
);

export default function ScenePage() {
  return (
    <main>
      <h1>Three.js デモ</h1>
      <Scene3D />
    </main>
  );
}
```

---

## まとめ

Three.jsは、WebGLの複雑さを隠蔽しながらプロダクション品質の3Dグラフィックスをウェブ上で実現できる強力なツールだ。本記事で解説した主要なポイントを振り返ろう。

| 分野 | ポイント |
|------|---------|
| **基本構成** | Scene・Camera・Renderer の3要素。アニメーションループはrequestAnimationFrame |
| **Geometry** | 組み込みジオメトリとBufferGeometryカスタム実装。法線・UV・インデックスを理解する |
| **Material** | 用途に合わせてBasic→Standard→Physical→ShaderMaterialを選択 |
| **Light** | PBRにはDirectional+Ambient+Hemisphereの組み合わせ。シャドウマップは解像度に注意 |
| **Texture** | PBRセット（color/normal/roughness/metalness/ao）でリアルな表現。LoadingManagerで一括管理 |
| **Animation** | AnimationMixerでGLTFアニメーション再生。GSAPでUI連動アニメーション |
| **モデル読み込み** | GLTFLoader+DracoLoaderでファイルサイズを最小化 |
| **ポストプロセッシング** | EffectComposer+BloomPassでシネマティックな映像表現 |
| **React Three Fiber** | Reactのエコシステムと3Dを統合。useFrameで毎フレーム更新 |
| **Drei** | OrbitControls・Text・Environment等の便利なユーティリティを積極活用 |
| **パフォーマンス** | InstancedMesh・LOD・ジオメトリ共有・dispose()でメモリ解放 |
| **デプロイ** | Viteでコード分割。gltf-transformでアセット最適化。Vercelのキャッシュヘッダー設定 |

3Dウェブの世界は広大で、物理演算（Rapier）・XR/VR（WebXR）・リアルタイム協調（WebRTC）などさらなる発展領域が待っている。まずは本記事の基礎をしっかり身につけて、段階的に応用していこう。

---

開発中に3Dモデルのメタデータや設定JSONの検証・デバッグが必要になったときは、**[DevToolBox](https://usedevtools.com/)** のJSON Validator・Formatter・Diff Toolが役に立つ。GLTFのエクスポート設定や、Three.jsのシーン設定をJSONで管理する際の構造確認に、ブラウザ上でサクッと使えるので開発効率が上がる。ぜひ試してみてほしい。

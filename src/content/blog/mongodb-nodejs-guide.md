---
title: 'MongoDB完全ガイド — Node.js・Mongoose・集計パイプライン・インデックス・Atlas'
description: 'MongoDBをNode.js/TypeScriptで使いこなす完全ガイド。ドキュメント設計・Mongoose・CRUD・集計パイプライン・インデックス最適化・トランザクション・MongoDB Atlas・時系列コレクションまで解説。'
pubDate: 'Feb 20 2026'
heroImage: '../../assets/blog-placeholder-3.jpg'
tags: ['MongoDB', 'Node.js', 'Mongoose', 'TypeScript', 'データベース']
---

MongoDBは、現代のWebアプリケーション開発で最も広く採用されているNoSQLデータベースの一つだ。JSONライクなドキュメント形式でデータを扱えるため、JavaScriptエコシステムとの親和性が高く、Node.jsアプリケーションのバックエンドとして非常に人気がある。

本記事では、MongoDBの基礎概念からNode.js・TypeScriptでの実践的な使い方、集計パイプライン、インデックス戦略、トランザクション、MongoDB Atlas、時系列コレクションまで、プロダクションレベルの知識を体系的に解説する。

---

## 1. MongoDBとは — RDBとの比較・適用場面

### ドキュメント指向データベース

MongoDBはドキュメント指向データベースだ。データはBSON（Binary JSON）形式のドキュメントとして保存され、コレクションという単位でグループ化される。RDB（リレーショナルデータベース）の「テーブル・行・列」という概念に対し、MongoDBは「コレクション・ドキュメント・フィールド」という概念を持つ。

```
RDB             MongoDB
─────────────   ──────────────
Database     ←→ Database
Table        ←→ Collection
Row          ←→ Document
Column       ←→ Field
JOIN         ←→ $lookup / 埋め込みドキュメント
PRIMARY KEY  ←→ _id (ObjectId)
```

### RDBとの主な違い

**スキーマレス（柔軟なスキーマ）**

RDBではテーブル定義が固定であり、列の追加・変更にはALTER TABLEが必要だ。MongoDBではドキュメントごとに異なるフィールドを持てるため、スキーマの進化が容易になる。ただし、Mongooseなどのライブラリを使えばアプリケーション層でスキーマを強制できる。

**水平スケーリング（シャーディング）**

MongoDBはシャーディングによる水平スケールアウトを標準でサポートする。大量データや高トラフィックのシステムでも、複数サーバーにデータを分散して処理できる。RDBでの水平スケールは複雑な設計が必要になることが多い。

**集計パイプライン**

MongoDBはSQL JOINに相当する`$lookup`と、強力な集計パイプラインを持つ。MapReduceより高速で、複雑なデータ変換・集計処理をサーバーサイドで実行できる。

### MongoDBが向いているユースケース

- **コンテンツ管理システム**: 記事・商品・ユーザープロフィールなどスキーマが可変なデータ
- **リアルタイムアプリ**: Change Streamsを使ったリアルタイム通知・チャット
- **IoT・センサーデータ**: 時系列コレクションで大量の時系列データを効率的に保存
- **カタログデータ**: 商品カテゴリごとに異なる属性を持つECサイト商品データ
- **ゲームユーザーデータ**: プレイヤーの進行状況・アイテム・スコアなど構造が複雑なデータ

### MongoDBが向かないユースケース

- **複雑なトランザクション**: 銀行勘定元帳など厳密なACIDトランザクションが多数必要な場合
- **正規化されたリレーショナルデータ**: 多対多の複雑なリレーションが頻繁にあるデータ
- **レポート・BI**: 複雑なアドホッククエリが多い場合はRDBの方が向いていることがある

---

## 2. ドキュメント設計 — 埋め込み vs 参照・スキーマ設計原則

MongoDBのスキーマ設計でもっとも重要な判断が「埋め込み（Embedding）」か「参照（Referencing）」かだ。

### 埋め込みドキュメント

関連データを親ドキュメントの中に入れ子として保存する方法だ。

```json
{
  "_id": "ObjectId('...')",
  "title": "MongoDBチュートリアル",
  "author": {
    "name": "田中太郎",
    "email": "tanaka@example.com"
  },
  "comments": [
    {
      "user": "山田花子",
      "body": "とても参考になりました",
      "createdAt": "2026-02-20T10:00:00Z"
    }
  ],
  "tags": ["MongoDB", "NoSQL", "データベース"]
}
```

**埋め込みが適するケース**
- 1対1、1対少数のリレーション
- データが一緒に読み書きされることが多い
- サブドキュメントが独立して参照されることがない
- 配列要素が際限なく増えない（ドキュメントは16MBが上限）

### 参照（リファレンス）

他コレクションのドキュメントのIDを保持する方法だ。

```json
// postsコレクション
{
  "_id": "ObjectId('post123')",
  "title": "MongoDBチュートリアル",
  "authorId": "ObjectId('user456')",
  "tags": ["MongoDB", "NoSQL"]
}

// usersコレクション
{
  "_id": "ObjectId('user456')",
  "name": "田中太郎",
  "email": "tanaka@example.com",
  "bio": "バックエンドエンジニア"
}
```

**参照が適するケース**
- 1対多・多対多のリレーション
- サブドキュメントが頻繁に単独で参照・更新される
- 配列要素が際限なく増加する可能性がある
- 複数の親ドキュメントから同じデータが参照される

### スキーマ設計の基本原則

1. **アプリのクエリパターンに合わせて設計する** — RDBのような正規化ファーストではなく、どう読み書きするかを先に考える
2. **一緒に読むデータは一緒に格納する** — ネットワークラウンドトリップを最小化する
3. **配列の無制限成長を避ける** — ドキュメントサイズの上限（16MB）に注意
4. **頻繁に更新されるフィールドは分離を検討する** — 更新のたびに大きなドキュメントを書き換えるのは非効率

---

## 3. Mongoose セットアップ — TypeScript・接続設定

### インストール

```bash
npm install mongoose
npm install -D @types/mongoose  # TypeScript 4.x以前
# mongoose 6.x以降は型定義が同梱されているので不要
```

### 接続設定

```typescript
// src/lib/database.ts
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/myapp';

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) {
    console.log('MongoDB: 既存の接続を再利用');
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      // 接続プールサイズ（デフォルト: 5）
      maxPoolSize: 10,
      // サーバー選択タイムアウト
      serverSelectionTimeoutMS: 5000,
      // ソケットタイムアウト
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log('MongoDB: 接続成功');

    // 接続エラーのハンドリング
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB接続エラー:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB: 切断されました');
      isConnected = false;
    });

  } catch (error) {
    console.error('MongoDB: 接続失敗', error);
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  console.log('MongoDB: 切断完了');
}
```

### Next.jsでの接続（開発環境のホットリロード対策）

```typescript
// src/lib/mongodb.ts
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI環境変数が設定されていません');
}

// グローバルキャッシュを使ってホットリロード時の重複接続を防ぐ
declare global {
  // eslint-disable-next-line no-var
  var mongoose: { conn: typeof import('mongoose') | null; promise: Promise<typeof import('mongoose')> | null };
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((mongoose) => mongoose);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
```

---

## 4. スキーマ定義 — 型・バリデーション・virtuals・methods

### 基本的なスキーマ定義（TypeScript）

```typescript
// src/models/User.ts
import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// TypeScriptインターフェース定義
export interface IUser {
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin' | 'moderator';
  profile: {
    bio?: string;
    avatar?: string;
    website?: string;
  };
  isActive: boolean;
  loginCount: number;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// メソッドの型定義
export interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
  getPublicProfile(): Partial<IUser>;
}

// Documentの型（DB操作時に使用）
export type UserDocument = Document & IUser & IUserMethods;

// Modelの型（静的メソッドがある場合に拡張）
export interface UserModel extends Model<IUser, {}, IUserMethods> {
  findByEmail(email: string): Promise<UserDocument | null>;
}

// スキーマ定義
const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    name: {
      type: String,
      required: [true, '名前は必須です'],
      trim: true,
      minlength: [2, '名前は2文字以上で入力してください'],
      maxlength: [50, '名前は50文字以内で入力してください'],
    },
    email: {
      type: String,
      required: [true, 'メールアドレスは必須です'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, '有効なメールアドレスを入力してください'],
    },
    password: {
      type: String,
      required: [true, 'パスワードは必須です'],
      minlength: [8, 'パスワードは8文字以上で設定してください'],
      select: false, // デフォルトでクエリ結果に含めない
    },
    role: {
      type: String,
      enum: {
        values: ['user', 'admin', 'moderator'],
        message: '無効なロールです: {VALUE}',
      },
      default: 'user',
    },
    profile: {
      bio: { type: String, maxlength: 500 },
      avatar: { type: String },
      website: {
        type: String,
        match: [/^https?:\/\/.+/, '有効なURLを入力してください'],
      },
    },
    isActive: { type: Boolean, default: true },
    loginCount: { type: Number, default: 0, min: 0 },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true, // createdAt・updatedAtを自動管理
    toJSON: { virtuals: true }, // JSON変換時にvirtualsを含める
    toObject: { virtuals: true },
  }
);

// Virtual（DBに保存されない仮想フィールド）
userSchema.virtual('fullDisplayName').get(function (this: UserDocument) {
  return `${this.name} (${this.role})`;
});

// インスタンスメソッド
userSchema.methods.comparePassword = async function (
  this: UserDocument,
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.getPublicProfile = function (this: UserDocument) {
  return {
    name: this.name,
    email: this.email,
    role: this.role,
    profile: this.profile,
    createdAt: this.createdAt,
  };
};

// 静的メソッド
userSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

// ミドルウェア（Pre hook）: 保存前にパスワードをハッシュ化
userSchema.pre('save', async function (this: UserDocument, next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Post hook: 保存後にログ出力
userSchema.post('save', function (doc: UserDocument) {
  console.log(`ユーザー保存完了: ${doc.email}`);
});

// インデックス
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ createdAt: -1 });

export const User = mongoose.model<IUser, UserModel>('User', userSchema);
```

### Postスキーマの例（参照と埋め込みの組み合わせ）

```typescript
// src/models/Post.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IComment {
  author: mongoose.Types.ObjectId;
  body: string;
  likes: number;
  createdAt: Date;
}

export interface IPost extends Document {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  author: mongoose.Types.ObjectId;
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  viewCount: number;
  comments: IComment[];
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, maxlength: 2000 },
    likes: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const postSchema = new Schema<IPost>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true },
    content: { type: String, required: true },
    excerpt: { type: String, maxlength: 500 },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tags: [{ type: String, trim: true, lowercase: true }],
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    viewCount: { type: Number, default: 0 },
    comments: [commentSchema], // 埋め込みドキュメント（配列）
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

// 公開前にpublishedAtをセット
postSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// テキストインデックス（全文検索用）
postSchema.index({ title: 'text', content: 'text', tags: 'text' });
postSchema.index({ slug: 1 }, { unique: true });
postSchema.index({ author: 1, status: 1 });
postSchema.index({ publishedAt: -1 });

export const Post = mongoose.model<IPost>('Post', postSchema);
```

---

## 5. CRUD操作 — find・findOne・create・updateOne・deleteOne

### Create（作成）

```typescript
// src/services/userService.ts
import { User, IUser } from '../models/User';

// 単一ドキュメント作成
async function createUser(data: Partial<IUser>) {
  // 方法1: newしてsave()
  const user = new User(data);
  const saved = await user.save();
  return saved;

  // 方法2: create()（内部的にnew + save()と同じ）
  // const saved = await User.create(data);
  // return saved;
}

// 複数ドキュメントの一括作成
async function createUsers(dataArray: Partial<IUser>[]) {
  // ordered: false で一部失敗してもほかを続行
  const result = await User.insertMany(dataArray, { ordered: false });
  return result;
}
```

### Read（取得）

```typescript
// 全件取得
async function getAllUsers() {
  return User.find({});
}

// 条件付き取得
async function getActiveAdmins() {
  return User.find({ role: 'admin', isActive: true });
}

// 単一ドキュメント取得
async function getUserById(id: string) {
  return User.findById(id);
  // 同等: User.findOne({ _id: id });
}

// 条件付き単一取得
async function getUserByEmail(email: string) {
  return User.findOne({ email });
}

// パスワードフィールドを含めて取得（select: falseを上書き）
async function getUserWithPassword(email: string) {
  return User.findOne({ email }).select('+password');
}

// 特定フィールドのみ取得（プロジェクション）
async function getUserNames() {
  return User.find({}, { name: 1, email: 1, _id: 0 });
  // または: User.find({}).select('name email -_id');
}

// ページネーション
async function getUsersPaginated(page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find({ isActive: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-password'),
    User.countDocuments({ isActive: true }),
  ]);
  return { users, total, page, totalPages: Math.ceil(total / limit) };
}
```

### Update（更新）

```typescript
// 単一ドキュメントの更新
async function updateUser(id: string, data: Partial<IUser>) {
  // new: true で更新後のドキュメントを返す
  return User.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true, runValidators: true }
  );
}

// 複数ドキュメントの更新
async function deactivateInactiveUsers(days: number) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await User.updateMany(
    { lastLoginAt: { $lt: cutoffDate }, isActive: true },
    { $set: { isActive: false } }
  );
  return result.modifiedCount; // 更新された件数
}

// カウンターのインクリメント
async function incrementLoginCount(id: string) {
  return User.findByIdAndUpdate(
    id,
    {
      $inc: { loginCount: 1 },
      $set: { lastLoginAt: new Date() },
    },
    { new: true }
  );
}

// 配列への要素追加
async function addTagToPost(postId: string, tag: string) {
  return Post.findByIdAndUpdate(
    postId,
    { $addToSet: { tags: tag } }, // $push は重複を許可、$addToSet は重複を排除
    { new: true }
  );
}

// upsert（なければ作成・あれば更新）
async function upsertUserPreferences(userId: string, prefs: object) {
  return User.findOneAndUpdate(
    { _id: userId },
    { $set: { preferences: prefs } },
    { upsert: true, new: true, runValidators: true }
  );
}
```

### Delete（削除）

```typescript
// 単一削除
async function deleteUser(id: string) {
  return User.findByIdAndDelete(id);
}

// 条件付き削除
async function deleteInactiveUsers() {
  const result = await User.deleteMany({ isActive: false });
  return result.deletedCount;
}

// 論理削除（フラグを立てる）
async function softDeleteUser(id: string) {
  return User.findByIdAndUpdate(
    id,
    { $set: { isActive: false, deletedAt: new Date() } },
    { new: true }
  );
}
```

---

## 6. クエリビルダー — where・sort・limit・skip・select・populate

### メソッドチェーンによるクエリ構築

```typescript
// src/repositories/postRepository.ts
import { Post } from '../models/Post';

async function getPublishedPosts(options: {
  tag?: string;
  authorId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
}) {
  const { tag, authorId, search, page = 1, limit = 10, sortBy = '-publishedAt' } = options;

  const query = Post.find({ status: 'published' });

  // 条件を動的に追加
  if (tag) {
    query.where('tags').in([tag]);
  }

  if (authorId) {
    query.where('author').equals(authorId);
  }

  if (search) {
    query.where({ $text: { $search: search } });
  }

  // ソート・ページネーション・フィールド選択
  const posts = await query
    .sort(sortBy)
    .skip((page - 1) * limit)
    .limit(limit)
    .select('title slug excerpt author tags viewCount publishedAt')
    .populate('author', 'name email profile.avatar') // 参照解決
    .lean(); // POJOとして返す（パフォーマンス向上）

  return posts;
}
```

### populate の活用

```typescript
// 単純なpopulate
const post = await Post.findById(postId)
  .populate('author');

// フィールド選択付きpopulate
const post = await Post.findById(postId)
  .populate('author', 'name email -_id');

// ネストしたpopulate
const post = await Post.findById(postId)
  .populate({
    path: 'comments.author',
    select: 'name profile.avatar',
  });

// 複数フィールドのpopulate
const post = await Post.findById(postId)
  .populate('author', 'name')
  .populate({
    path: 'comments.author',
    select: 'name profile.avatar',
  });

// 条件付きpopulate
const post = await Post.findById(postId)
  .populate({
    path: 'author',
    match: { isActive: true },
    select: 'name email',
  });
```

### 比較・論理演算子

```typescript
// 比較演算子
await User.find({ loginCount: { $gt: 10 } });             // 10より大きい
await User.find({ loginCount: { $gte: 10 } });            // 10以上
await User.find({ loginCount: { $lt: 100 } });            // 100未満
await User.find({ loginCount: { $lte: 100 } });           // 100以下
await User.find({ role: { $ne: 'admin' } });              // admin以外
await User.find({ role: { $in: ['user', 'moderator'] } }); // どれかに一致
await User.find({ role: { $nin: ['admin'] } });           // どれにも一致しない

// 論理演算子
await User.find({ $and: [{ isActive: true }, { role: 'admin' }] });
await User.find({ $or: [{ role: 'admin' }, { loginCount: { $gt: 100 } }] });
await User.find({ $nor: [{ isActive: false }, { role: 'banned' }] });

// フィールド存在確認
await User.find({ lastLoginAt: { $exists: true } });
await User.find({ 'profile.website': { $exists: false } });

// 正規表現
await User.find({ name: { $regex: /田中/i } });
await User.find({ email: { $regex: '@gmail.com$' } });

// 配列クエリ
await Post.find({ tags: 'mongodb' });                        // 配列に要素が含まれる
await Post.find({ tags: { $all: ['mongodb', 'nodejs'] } }); // 全要素が含まれる
await Post.find({ tags: { $size: 3 } });                     // 配列サイズが3
```

---

## 7. 集計パイプライン — $match・$group・$lookup・$project・$unwind

集計パイプラインはMongoDBの最も強力な機能の一つだ。データをステージ単位で変換・集計する。

### 基本的な集計パイプライン

```typescript
// src/analytics/postAnalytics.ts
import { Post } from '../models/Post';

// 月別投稿数の集計
async function getMonthlyPostStats(year: number) {
  return Post.aggregate([
    // Stage 1: 対象年の公開済み記事を絞り込む
    {
      $match: {
        status: 'published',
        publishedAt: {
          $gte: new Date(`${year}-01-01`),
          $lt: new Date(`${year + 1}-01-01`),
        },
      },
    },
    // Stage 2: 月ごとにグループ化
    {
      $group: {
        _id: { $month: '$publishedAt' },
        count: { $sum: 1 },
        totalViews: { $sum: '$viewCount' },
        avgViews: { $avg: '$viewCount' },
        tags: { $push: '$tags' }, // 全タグを配列に蓄積
      },
    },
    // Stage 3: 月番号でソート
    { $sort: { _id: 1 } },
    // Stage 4: フィールド名を変換
    {
      $project: {
        _id: 0,
        month: '$_id',
        postCount: '$count',
        totalViews: 1,
        avgViews: { $round: ['$avgViews', 1] },
      },
    },
  ]);
}
```

### $lookup（JOINに相当）

```typescript
// 投稿と著者情報を結合して集計
async function getTopAuthorStats(limit: number = 10) {
  return Post.aggregate([
    { $match: { status: 'published' } },
    // usersコレクションとJOIN
    {
      $lookup: {
        from: 'users',          // 結合するコレクション名
        localField: 'author',   // 自コレクションのフィールド
        foreignField: '_id',    // 相手コレクションのフィールド
        as: 'authorData',       // 結果を格納するフィールド名
      },
    },
    // $lookupの結果は配列なので最初の要素を取り出す
    { $unwind: '$authorData' },
    // 著者でグループ化
    {
      $group: {
        _id: '$author',
        authorName: { $first: '$authorData.name' },
        authorEmail: { $first: '$authorData.email' },
        postCount: { $sum: 1 },
        totalViews: { $sum: '$viewCount' },
        avgViews: { $avg: '$viewCount' },
      },
    },
    // 投稿数でソート
    { $sort: { postCount: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        authorId: '$_id',
        authorName: 1,
        authorEmail: 1,
        postCount: 1,
        totalViews: 1,
        avgViews: { $round: ['$avgViews', 0] },
      },
    },
  ]);
}
```

### $unwind でネスト配列を展開

```typescript
// タグ別の投稿数ランキング
async function getTagRanking() {
  return Post.aggregate([
    { $match: { status: 'published' } },
    // tagsの配列を個々のドキュメントに展開
    { $unwind: '$tags' },
    {
      $group: {
        _id: '$tags',
        count: { $sum: 1 },
        totalViews: { $sum: '$viewCount' },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 20 },
    {
      $project: {
        _id: 0,
        tag: '$_id',
        postCount: '$count',
        totalViews: 1,
      },
    },
  ]);
}
```

### $facet（複数の集計を並列実行）

```typescript
// 検索結果とファセット情報を同時取得
async function searchPostsWithFacets(query: string, page: number = 1) {
  const limit = 10;
  const skip = (page - 1) * limit;

  const result = await Post.aggregate([
    { $match: { $text: { $search: query }, status: 'published' } },
    {
      $facet: {
        // ページネーション済み検索結果
        results: [
          { $sort: { score: { $meta: 'textScore' }, publishedAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          { $project: { title: 1, slug: 1, excerpt: 1, tags: 1, publishedAt: 1 } },
        ],
        // 総件数
        totalCount: [{ $count: 'count' }],
        // タグ別件数
        tagFacets: [
          { $unwind: '$tags' },
          { $group: { _id: '$tags', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ],
      },
    },
    {
      $project: {
        results: 1,
        total: { $arrayElemAt: ['$totalCount.count', 0] },
        tagFacets: 1,
      },
    },
  ]);

  return result[0];
}
```

### $addFields・$set・$bucket

```typescript
// ビュー数でバケット分類
async function classifyPostsByViews() {
  return Post.aggregate([
    { $match: { status: 'published' } },
    {
      $bucket: {
        groupBy: '$viewCount',
        boundaries: [0, 100, 1000, 10000, 100000],
        default: '100000+',
        output: {
          count: { $sum: 1 },
          posts: { $push: { title: '$title', views: '$viewCount' } },
        },
      },
    },
  ]);
}

// 計算フィールドの追加
async function getPostsWithEngagement() {
  return Post.aggregate([
    { $match: { status: 'published' } },
    {
      $addFields: {
        commentCount: { $size: '$comments' },
        engagementScore: {
          $add: [
            '$viewCount',
            { $multiply: [{ $size: '$comments' }, 10] },
          ],
        },
        daysSincePublished: {
          $divide: [
            { $subtract: [new Date(), '$publishedAt'] },
            1000 * 60 * 60 * 24,
          ],
        },
      },
    },
    { $sort: { engagementScore: -1 } },
    { $limit: 20 },
  ]);
}
```

---

## 8. インデックス — シングル・複合・テキスト・地理空間・TTL

インデックスはMongoDBのパフォーマンスを左右する最も重要な要素だ。

### インデックスの種類と使い方

```typescript
// src/models/Product.ts（インデックス例）
import mongoose, { Schema } from 'mongoose';

const productSchema = new Schema({
  name: String,
  sku: String,
  category: String,
  price: Number,
  stock: Number,
  description: String,
  location: {
    type: { type: String, enum: ['Point'] },
    coordinates: { type: [Number] }, // [longitude, latitude]
  },
  tags: [String],
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date, // TTLインデックス用
  isAvailable: Boolean,
});

// シングルフィールドインデックス
productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 }); // -1は降順

// 複合インデックス（クエリパターンに合わせてESRルールで設計）
// ESR: Equality（等値）→ Sort（ソート）→ Range（範囲）の順
productSchema.index({ category: 1, price: 1, stock: -1 });
productSchema.index({ category: 1, isAvailable: 1, createdAt: -1 });

// テキストインデックス（全文検索）
productSchema.index(
  { name: 'text', description: 'text', tags: 'text' },
  {
    weights: { name: 10, tags: 5, description: 1 }, // フィールドの重み付け
    name: 'product_text_index',
    default_language: 'none', // 日本語の場合はnoneを指定
  }
);

// 地理空間インデックス（2dsphere）
productSchema.index({ location: '2dsphere' });

// TTLインデックス（有効期限付きドキュメントの自動削除）
productSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 } // expiresAtの時刻にドキュメントを削除
);

// パーシャルインデックス（条件付きインデックス）
// isAvailable: trueのドキュメントのみインデックス化
productSchema.index(
  { price: 1 },
  { partialFilterExpression: { isAvailable: true } }
);

// スパースインデックス（フィールドが存在するドキュメントのみ）
productSchema.index({ 'profile.website': 1 }, { sparse: true });
```

### 地理空間クエリの使用例

```typescript
// 現在地から5km以内の店舗を検索
async function findNearbyStores(longitude: number, latitude: number, radiusKm: number) {
  return Store.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        $maxDistance: radiusKm * 1000, // メートル単位
      },
    },
    isOpen: true,
  }).limit(20);
}
```

### インデックスの管理

```typescript
// インデックス一覧の取得
async function listIndexes() {
  const indexes = await User.collection.indexes();
  console.log(JSON.stringify(indexes, null, 2));
  return indexes;
}

// 不要なインデックスの削除
async function dropIndex() {
  await User.collection.dropIndex('old_index_name');
}

// バックグラウンドでインデックスを作成（プロダクション環境）
async function createIndexInBackground() {
  await Product.collection.createIndex(
    { category: 1, price: 1 },
    { background: true, name: 'category_price_idx' }
  );
}
```

---

## 9. トランザクション — session・withTransaction

MongoDB 4.0以降でマルチドキュメントACIDトランザクションがサポートされた。レプリカセット環境（またはAtlas）で使用可能だ。

### 基本的なトランザクション

```typescript
// src/services/orderService.ts
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { Product } from '../models/Product';

// 手動セッション管理
async function createOrderManual(
  userId: string,
  items: { productId: string; quantity: number }[]
) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 在庫確認・減算
    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);
      if (!product) throw new Error(`商品が見つかりません: ${item.productId}`);
      if (product.stock < item.quantity) {
        throw new Error(`在庫不足: ${product.name}`);
      }
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -item.quantity } },
        { session }
      );
    }

    // 注文作成
    const [order] = await Order.create([{ userId, items, status: 'pending' }], { session });

    // ユーザーの注文履歴に追加
    await User.findByIdAndUpdate(
      userId,
      { $push: { orderHistory: order._id } },
      { session }
    );

    await session.commitTransaction();
    console.log('注文処理成功:', order._id);
    return order;

  } catch (error) {
    await session.abortTransaction();
    console.error('注文処理失敗、ロールバック実施:', error);
    throw error;

  } finally {
    session.endSession();
  }
}

// withTransaction を使った簡潔な書き方（推奨）
async function createOrderWithTransaction(
  userId: string,
  items: { productId: string; quantity: number }[]
) {
  const session = await mongoose.startSession();

  try {
    const order = await session.withTransaction(async () => {
      for (const item of items) {
        const result = await Product.findOneAndUpdate(
          { _id: item.productId, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { session, new: true }
        );
        if (!result) {
          throw new Error(`在庫不足または商品なし: ${item.productId}`);
        }
      }

      const [newOrder] = await Order.create(
        [{ userId, items, status: 'pending' }],
        { session }
      );

      return newOrder;
    });

    return order;
  } finally {
    session.endSession();
  }
}
```

### トランザクションの注意点

- **レプリカセットが必要**: スタンドアロンMongoDBではトランザクションは使えない
- **タイムアウト**: デフォルトで60秒のトランザクションタイムアウトがある
- **パフォーマンス**: トランザクションはロックが発生するため、必要な場合のみ使用する
- **ドキュメント設計で回避できることも多い**: 埋め込みドキュメントを活用すれば単一ドキュメントの更新で済む場合がある

---

## 10. MongoDB Atlas — クラスター作成・接続・バックアップ

MongoDB Atlasはフルマネージドのクラウドデータベースサービスだ。無料ティア（M0）から利用できる。

### Atlasクラスターの作成手順

1. [MongoDB Atlas](https://www.mongodb.com/atlas)にアクセスしてアカウント作成
2. 「Create a cluster」を選択
3. クラウドプロバイダー（AWS/GCP/Azure）とリージョンを選択
4. Free Tier（M0 Sandbox）を選択して作成
5. データベースユーザーを作成（Database Access）
6. IPホワイトリストを設定（Network Access）

### 接続文字列の設定

```typescript
// .env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<dbname>?retryWrites=true&w=majority

// src/lib/database.ts
import mongoose from 'mongoose';

const options: mongoose.ConnectOptions = {
  // Atlas推奨設定
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4, // IPv4を強制
};

export async function connectAtlas() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not defined');

  try {
    await mongoose.connect(uri, options);
    console.log('Atlas接続成功');
  } catch (error) {
    console.error('Atlas接続失敗:', error);
    process.exit(1);
  }
}
```

### Atlas Search（全文検索）

Atlas Search はApache Lucene ベースの全文検索機能だ。Atlasコンソールで検索インデックスを設定し、`$search`ステージで利用できる。

```typescript
// Atlas Search クエリ
async function searchWithAtlasSearch(query: string) {
  return Post.aggregate([
    {
      $search: {
        index: 'default',
        text: {
          query: query,
          path: ['title', 'content', 'tags'],
          fuzzy: { maxEdits: 1 }, // ファジー検索
        },
      },
    },
    {
      $project: {
        title: 1,
        excerpt: 1,
        score: { $meta: 'searchScore' },
      },
    },
    { $sort: { score: -1 } },
    { $limit: 10 },
  ]);
}
```

### Atlasのバックアップ

- **M0 Free Tier**: 自動バックアップなし（手動スナップショット不可）
- **M2/M5以上**: クラウドバックアップが利用可能
- **プロダクション環境**: Continuous Cloud Backupで特定時点へのリストアが可能

```bash
# mongodump を使った手動バックアップ（Atlas Data Federation等でも可）
mongodump \
  --uri="mongodb+srv://user:pass@cluster.mongodb.net/mydb" \
  --out=/backup/$(date +%Y%m%d)
```

---

## 11. Change Streams — リアルタイム変更監視

Change Streamsを使うと、コレクションに対する変更（insert/update/delete）をリアルタイムで監視できる。チャットアプリ・通知システム・データ同期に活用できる。

```typescript
// src/watchers/postWatcher.ts
import { Post } from '../models/Post';
import { ChangeStreamDocument } from 'mongodb';

export function watchPostChanges() {
  // コレクション全体を監視
  const changeStream = Post.watch(
    [
      // フィルタ: publishedに変更されたものだけ
      {
        $match: {
          operationType: { $in: ['insert', 'update', 'replace'] },
          'fullDocument.status': 'published',
        },
      },
    ],
    {
      fullDocument: 'updateLookup', // 更新後のドキュメント全体を取得
    }
  );

  changeStream.on('change', (change: ChangeStreamDocument) => {
    console.log('変更検知:', change.operationType);

    if (change.operationType === 'insert' || change.operationType === 'update') {
      const doc = change.fullDocument;
      // 通知システムにイベントを送信
      notifySubscribers(doc);
    }
  });

  changeStream.on('error', (error) => {
    console.error('ChangeStream エラー:', error);
    // 再起動ロジック
    setTimeout(watchPostChanges, 5000);
  });

  return changeStream;
}

// Next.jsのAPIルートでSSEを使ったリアルタイム通知
export async function streamChanges(res: Response) {
  const changeStream = Post.watch([], { fullDocument: 'updateLookup' });

  changeStream.on('change', (change) => {
    const data = JSON.stringify({ type: change.operationType, data: change.fullDocument });
    res.write(`data: ${data}\n\n`);
  });

  // クライアント切断時にストリームを閉じる
  res.on('close', () => {
    changeStream.close();
  });
}
```

---

## 12. 時系列コレクション — Time Series Collection

MongoDB 5.0以降で追加された時系列コレクションは、IoTセンサーデータ・メトリクス・ログなど時系列データを効率的に保存・クエリするために最適化されている。

```typescript
// 時系列コレクションの作成
async function createTimeSeriesCollection() {
  const db = mongoose.connection.db;

  await db.createCollection('sensor_readings', {
    timeseries: {
      timeField: 'timestamp',      // 時刻フィールド名
      metaField: 'sensorId',       // メタデータフィールド（センサーIDなど）
      granularity: 'seconds',      // 粒度: seconds / minutes / hours
    },
    expireAfterSeconds: 60 * 60 * 24 * 90, // 90日後に自動削除
  });

  console.log('時系列コレクション作成完了');
}

// データの挿入
interface SensorReading {
  timestamp: Date;
  sensorId: string;
  temperature: number;
  humidity: number;
  pressure: number;
}

async function insertSensorData(readings: SensorReading[]) {
  const collection = mongoose.connection.collection('sensor_readings');
  await collection.insertMany(readings);
}

// 時系列データの集計
async function getHourlyAverages(sensorId: string, from: Date, to: Date) {
  const collection = mongoose.connection.collection('sensor_readings');

  return collection.aggregate([
    {
      $match: {
        sensorId,
        timestamp: { $gte: from, $lte: to },
      },
    },
    {
      $group: {
        _id: {
          $dateTrunc: { date: '$timestamp', unit: 'hour' },
        },
        avgTemperature: { $avg: '$temperature' },
        avgHumidity: { $avg: '$humidity' },
        minTemp: { $min: '$temperature' },
        maxTemp: { $max: '$temperature' },
        readingCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]).toArray();
}

// $setWindowFields を使った移動平均
async function getMovingAverage(sensorId: string, windowSize: number = 5) {
  const collection = mongoose.connection.collection('sensor_readings');

  return collection.aggregate([
    { $match: { sensorId } },
    { $sort: { timestamp: 1 } },
    {
      $setWindowFields: {
        partitionBy: '$sensorId',
        sortBy: { timestamp: 1 },
        output: {
          movingAvgTemp: {
            $avg: '$temperature',
            window: { documents: [-windowSize + 1, 0] },
          },
        },
      },
    },
    {
      $project: {
        timestamp: 1,
        temperature: 1,
        movingAvgTemp: { $round: ['$movingAvgTemp', 2] },
      },
    },
  ]).toArray();
}
```

---

## 13. パフォーマンス最適化 — EXPLAIN・インデックス戦略

### EXPLAINでクエリプランを確認

```typescript
// src/utils/queryAnalyzer.ts
import { Post } from '../models/Post';

async function analyzeQuery() {
  // explain()でクエリ実行計画を取得
  const explanation = await Post.find({ status: 'published' })
    .sort({ publishedAt: -1 })
    .limit(10)
    .explain('executionStats');

  const stats = explanation.executionStats;
  console.log({
    // インデックスが使われているかどうか
    stage: explanation.queryPlanner.winningPlan.stage,
    // 実際に調査したドキュメント数
    totalDocsExamined: stats.totalDocsExamined,
    // 実際に返したドキュメント数
    totalDocsReturned: stats.totalDocsReturned,
    // 実行時間（ミリ秒）
    executionTimeMillis: stats.executionTimeMillis,
    // インデックスキーを調査した数
    totalKeysExamined: stats.totalKeysExamined,
  });

  // totalDocsExamined >> totalDocsReturned の場合はインデックスが効いていない
  if (stats.totalDocsExamined > stats.totalDocsReturned * 10) {
    console.warn('インデックスが最適化されていない可能性があります');
  }
}
```

### インデックス戦略のベストプラクティス

**ESRルール（Equality / Sort / Range）**

複合インデックスのフィールド順序は「等値フィルタ → ソート → 範囲フィルタ」の順が最効率だ。

```typescript
// クエリ例
Post.find({ status: 'published', category: 'tech' })
  .sort({ publishedAt: -1 })
  .where('viewCount').gt(100);

// このクエリに最適なインデックス
postSchema.index({
  status: 1,       // Equality（等値条件）
  category: 1,     // Equality（等値条件）
  publishedAt: -1, // Sort（ソート）
  viewCount: 1,    // Range（範囲条件）
});
```

### プロジェクションとlean()の活用

```typescript
// 非効率: 全フィールドを取得してJSオブジェクトに変換
const posts = await Post.find({ status: 'published' });

// 効率的: 必要なフィールドのみ取得 + lean()でPOJOとして返す
const posts = await Post.find({ status: 'published' })
  .select('title slug excerpt publishedAt')
  .lean(); // Mongooseドキュメントではなく純粋なJSオブジェクト
// lean()でメモリ使用量とCPU負荷を大幅削減
```

### バルク操作によるパフォーマンス向上

```typescript
// 個別の更新（N回のDB往復）
for (const item of items) {
  await Product.findByIdAndUpdate(item.id, { $inc: { viewCount: 1 } });
}

// bulkWrite（1回のDB往復）
const operations = items.map((item) => ({
  updateOne: {
    filter: { _id: item.id },
    update: { $inc: { viewCount: 1 } },
  },
}));
await Product.bulkWrite(operations, { ordered: false });
```

### 接続プール最適化

```typescript
// プロダクション環境の接続設定
const options: mongoose.ConnectOptions = {
  maxPoolSize: 20,       // 最大接続数（CPUコア数の2〜4倍が目安）
  minPoolSize: 5,        // 最小維持接続数
  maxIdleTimeMS: 30000,  // アイドル接続を30秒で閉じる
  waitQueueTimeoutMS: 10000, // 接続待ちタイムアウト
  serverSelectionTimeoutMS: 5000,
};
```

### 集計パイプラインの最適化

```typescript
// 非効率: $matchが後ろにある
Post.aggregate([
  { $lookup: { from: 'users', localField: 'author', foreignField: '_id', as: 'author' } },
  { $match: { status: 'published' } }, // JOINの後でフィルタ（非効率）
]);

// 効率的: $matchを最初に配置して処理件数を絞る
Post.aggregate([
  { $match: { status: 'published' } }, // 先にフィルタ（インデックス活用可能）
  { $lookup: { from: 'users', localField: 'author', foreignField: '_id', as: 'author' } },
]);

// $limitは早めに配置する
Post.aggregate([
  { $match: { status: 'published' } },
  { $sort: { publishedAt: -1 } },
  { $limit: 10 },   // 先にlimitして処理件数を絞る
  { $lookup: { ... } },  // 10件だけJOIN
]);
```

### モニタリング設定

```typescript
// Mongoose デバッグモード（開発環境）
if (process.env.NODE_ENV === 'development') {
  mongoose.set('debug', (collectionName: string, method: string, query: object, doc: object) => {
    console.log(`Mongoose: ${collectionName}.${method}`, JSON.stringify(query));
  });
}

// スロークエリのログ
mongoose.connection.on('commandStarted', (event) => {
  // MongoDB Node.js Driver のCommandMonitoring
});
```

---

## まとめ

MongoDBはドキュメント指向の柔軟なデータモデルと、強力な集計パイプライン・インデックス機能を持つ。Node.js/TypeScript環境ではMongooseを使うことでスキーマの型安全性を確保しながら、生産性高く開発できる。

### 本記事のキーポイント

| 機能 | ポイント |
|------|---------|
| ドキュメント設計 | 埋め込み vs 参照はクエリパターンで決める |
| インデックス | ESRルールで複合インデックスを設計する |
| 集計パイプライン | $matchを先頭に、$limitを早めに配置 |
| トランザクション | withTransaction()を使うと再試行ロジックが自動化 |
| パフォーマンス | lean()・select()・bulkWriteを活用する |
| 時系列 | Time Series CollectionはIoT・メトリクスに最適 |

---

## 開発ツールの活用

MongoDBのドキュメント設計では、JSONスキーマのバリデーションやフォーマット確認が頻繁に必要になる。**[DevToolBox](https://usedevtools.com/)** には JSON Formatter/Validator が含まれており、MongoDBのクエリ結果や集計パイプラインのテストデータを素早くチェック・整形できる。ブラウザ上でBSONライクなJSONドキュメントを可視化したいときに役立つツールだ。

また、REST APIとMongoDBを組み合わせたバックエンド開発では、エンドポイントのレスポンス確認やJWTトークンのデバッグにも使える。開発フローを効率化する各種ツールを [DevToolBox](https://usedevtools.com/) で試してみてほしい。


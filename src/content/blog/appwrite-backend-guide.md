---
title: "Appwriteオープンソースバックエンド入門"
description: "Firebase代替として注目のAppwriteで、認証・データベース・ストレージ・関数を備えた完全なバックエンドを構築。オープンソースでセルフホスト可能なBaaS完全ガイド。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。"
pubDate: "2025-02-06"
tags: ['プログラミング', '開発ツール']
---
# Appwriteオープンソースバックエンド入門

バックエンド開発の複雑さを解消するBaaS（Backend as a Service）として、**Appwrite** が注目を集めています。FirebaseやSupabaseと同様の機能を提供しながら、完全なオープンソースでセルフホスト可能な点が大きな特徴です。

本記事では、Appwriteの基本から実践的なアプリケーション構築まで、詳しく解説します。

## Appwriteとは

Appwriteは、Webやモバイルアプリのバックエンドを提供するオープンソースプラットフォームです。

### 主な特徴

- **完全オープンソース**: MIT/BSD-3ライセンス
- **セルフホスト可能**: 自社サーバーで運用可能
- **マルチプラットフォーム**: Web、iOS、Android、Flutter対応
- **豊富な機能**: 認証、DB、ストレージ、関数など
- **RESTful API**: 使いやすいAPI設計
- **リアルタイム**: WebSocketによるリアルタイム更新
- **セキュリティ**: ビルトインの権限管理

### Firebase/Supabaseとの比較

| 機能 | Appwrite | Firebase | Supabase |
|------|----------|----------|----------|
| オープンソース | ✓ | ✗ | ✓ |
| セルフホスト | ✓ | ✗ | ✓ |
| リアルタイムDB | ✓ | ✓ | ✓ |
| 認証 | ✓ | ✓ | ✓ |
| ストレージ | ✓ | ✓ | ✓ |
| 関数 | ✓ | ✓ | ✓ |
| SQL | ✗ | ✗ | ✓ |
| GraphQL | ✗ | ✗ | ✓ |

## セットアップ

### Dockerでの起動

最も簡単な方法はDockerを使用することです。

```bash
# Appwriteのインストール
docker run -it --rm \
    --volume /var/run/docker.sock:/var/run/docker.sock \
    --volume "$(pwd)"/appwrite:/usr/src/code/appwrite:rw \
    --entrypoint="install" \
    appwrite/appwrite:1.5.0

# サーバー起動
cd appwrite
docker compose up -d
```

デフォルトで `http://localhost` にアクセスできます。

### Appwrite Cloud

セルフホストが不要な場合は、公式のクラウド版も利用できます。

1. https://cloud.appwrite.io にアクセス
2. アカウント作成
3. プロジェクト作成

### プロジェクト初期設定

1. Appwriteコンソールにアクセス
2. 新規プロジェクトを作成
3. プラットフォーム（Web/iOS/Android）を追加
4. APIキーを取得

## クライアント SDK

### JavaScript/TypeScript

```bash
npm install appwrite
```

```javascript
import { Client, Account, Databases, Storage } from 'appwrite';

const client = new Client()
    .setEndpoint('http://localhost/v1') // Appwrite Endpoint
    .setProject('your-project-id');      // Project ID

const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

export { client, account, databases, storage };
```

### React統合

```javascript
// src/lib/appwrite.js
import { Client, Account, Databases } from 'appwrite';

const client = new Client();
client
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT);

export const account = new Account(client);
export const databases = new Databases(client);

// src/hooks/useAuth.js
import { useState, useEffect } from 'react';
import { account } from '../lib/appwrite';

export function useAuth() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        try {
            const user = await account.get();
            setUser(user);
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        await account.createEmailSession(email, password);
        await checkUser();
    };

    const logout = async () => {
        await account.deleteSession('current');
        setUser(null);
    };

    return { user, loading, login, logout };
}
```

## 認証（Authentication）

### メール/パスワード認証

```javascript
import { account } from './appwrite';
import { ID } from 'appwrite';

// サインアップ
async function signup(email, password, name) {
    try {
        const user = await account.create(
            ID.unique(),
            email,
            password,
            name
        );

        // 自動的にログイン
        await account.createEmailSession(email, password);

        return user;
    } catch (error) {
        console.error('Signup error:', error);
        throw error;
    }
}

// ログイン
async function login(email, password) {
    try {
        const session = await account.createEmailSession(email, password);
        return session;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

// ログアウト
async function logout() {
    try {
        await account.deleteSession('current');
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
}

// 現在のユーザー取得
async function getCurrentUser() {
    try {
        return await account.get();
    } catch (error) {
        return null;
    }
}
```

### OAuth認証

```javascript
import { account } from './appwrite';

// Google OAuth
async function loginWithGoogle() {
    account.createOAuth2Session(
        'google',
        'http://localhost:3000/auth/callback',  // Success URL
        'http://localhost:3000/auth/failure'    // Failure URL
    );
}

// GitHub OAuth
async function loginWithGitHub() {
    account.createOAuth2Session(
        'github',
        'http://localhost:3000/auth/callback',
        'http://localhost:3000/auth/failure'
    );
}

// コールバック処理
// pages/auth/callback.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { account } from '../../lib/appwrite';

export function AuthCallback() {
    const navigate = useNavigate();

    useEffect(() => {
        checkAuth();
    }, []);

    async function checkAuth() {
        try {
            const user = await account.get();
            if (user) {
                navigate('/dashboard');
            }
        } catch (error) {
            navigate('/login');
        }
    }

    return <div>認証中...</div>;
}
```

### メール確認とパスワードリセット

```javascript
// メール確認送信
async function sendVerificationEmail() {
    try {
        await account.createVerification(
            'http://localhost:3000/verify-email'
        );
    } catch (error) {
        console.error('Error sending verification:', error);
    }
}

// メール確認完了
async function verifyEmail(userId, secret) {
    try {
        await account.updateVerification(userId, secret);
    } catch (error) {
        console.error('Error verifying email:', error);
    }
}

// パスワードリセット要求
async function requestPasswordReset(email) {
    try {
        await account.createRecovery(
            email,
            'http://localhost:3000/reset-password'
        );
    } catch (error) {
        console.error('Error requesting reset:', error);
    }
}

// パスワードリセット完了
async function resetPassword(userId, secret, password) {
    try {
        await account.updateRecovery(
            userId,
            secret,
            password,
            password
        );
    } catch (error) {
        console.error('Error resetting password:', error);
    }
}
```

## データベース

### コレクション作成

AppwriteコンソールでGUIから作成、またはAPIで作成できます。

```javascript
import { databases } from './appwrite';
import { ID, Permission, Role } from 'appwrite';

// コレクション作成（通常はコンソールから）
async function createCollection() {
    try {
        const collection = await databases.createCollection(
            'main-db',           // Database ID
            ID.unique(),         // Collection ID
            'posts',             // Collection name
            [
                Permission.read(Role.any()),
                Permission.create(Role.users()),
                Permission.update(Role.users()),
                Permission.delete(Role.users()),
            ]
        );
        return collection;
    } catch (error) {
        console.error('Error creating collection:', error);
    }
}
```

### CRUD操作

```javascript
import { databases } from './appwrite';
import { ID, Query } from 'appwrite';

const DATABASE_ID = 'main-db';
const POSTS_COLLECTION_ID = 'posts';

// 作成
async function createPost(title, content, userId) {
    try {
        const post = await databases.createDocument(
            DATABASE_ID,
            POSTS_COLLECTION_ID,
            ID.unique(),
            {
                title,
                content,
                userId,
                createdAt: new Date().toISOString(),
            }
        );
        return post;
    } catch (error) {
        console.error('Error creating post:', error);
        throw error;
    }
}

// 読み取り（単一）
async function getPost(postId) {
    try {
        const post = await databases.getDocument(
            DATABASE_ID,
            POSTS_COLLECTION_ID,
            postId
        );
        return post;
    } catch (error) {
        console.error('Error getting post:', error);
        throw error;
    }
}

// 読み取り（複数）
async function getPosts(userId = null) {
    try {
        const queries = [
            Query.orderDesc('createdAt'),
            Query.limit(20)
        ];

        if (userId) {
            queries.push(Query.equal('userId', userId));
        }

        const response = await databases.listDocuments(
            DATABASE_ID,
            POSTS_COLLECTION_ID,
            queries
        );
        return response.documents;
    } catch (error) {
        console.error('Error getting posts:', error);
        throw error;
    }
}

// 更新
async function updatePost(postId, data) {
    try {
        const post = await databases.updateDocument(
            DATABASE_ID,
            POSTS_COLLECTION_ID,
            postId,
            data
        );
        return post;
    } catch (error) {
        console.error('Error updating post:', error);
        throw error;
    }
}

// 削除
async function deletePost(postId) {
    try {
        await databases.deleteDocument(
            DATABASE_ID,
            POSTS_COLLECTION_ID,
            postId
        );
    } catch (error) {
        console.error('Error deleting post:', error);
        throw error;
    }
}
```

### クエリとフィルタリング

```javascript
import { Query } from 'appwrite';

// 検索
async function searchPosts(searchTerm) {
    const posts = await databases.listDocuments(
        DATABASE_ID,
        POSTS_COLLECTION_ID,
        [
            Query.search('title', searchTerm),
            Query.orderDesc('createdAt')
        ]
    );
    return posts.documents;
}

// フィルタリング
async function getPublishedPosts() {
    const posts = await databases.listDocuments(
        DATABASE_ID,
        POSTS_COLLECTION_ID,
        [
            Query.equal('status', 'published'),
            Query.greaterThan('publishedAt', '2024-01-01'),
            Query.orderDesc('publishedAt'),
            Query.limit(10),
            Query.offset(0)
        ]
    );
    return posts.documents;
}

// 複雑なクエリ
async function getFilteredPosts(filters) {
    const queries = [Query.orderDesc('createdAt')];

    if (filters.userId) {
        queries.push(Query.equal('userId', filters.userId));
    }

    if (filters.category) {
        queries.push(Query.equal('category', filters.category));
    }

    if (filters.tags && filters.tags.length > 0) {
        queries.push(Query.equal('tags', filters.tags));
    }

    const posts = await databases.listDocuments(
        DATABASE_ID,
        POSTS_COLLECTION_ID,
        queries
    );
    return posts.documents;
}
```

## ストレージ

### ファイルアップロード

```javascript
import { storage } from './appwrite';
import { ID, Permission, Role } from 'appwrite';

const BUCKET_ID = 'images';

// ファイルアップロード
async function uploadFile(file) {
    try {
        const response = await storage.createFile(
            BUCKET_ID,
            ID.unique(),
            file,
            [
                Permission.read(Role.any()),
                Permission.update(Role.user(userId)),
                Permission.delete(Role.user(userId)),
            ]
        );
        return response;
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
}

// ファイルURL取得
function getFileUrl(fileId) {
    return storage.getFileView(BUCKET_ID, fileId);
}

// ファイルプレビュー（画像リサイズ）
function getFilePreview(fileId, width = 400, height = 400) {
    return storage.getFilePreview(
        BUCKET_ID,
        fileId,
        width,
        height,
        'center',
        100  // Quality
    );
}

// ファイルダウンロード
function downloadFile(fileId) {
    return storage.getFileDownload(BUCKET_ID, fileId);
}

// ファイル削除
async function deleteFile(fileId) {
    try {
        await storage.deleteFile(BUCKET_ID, fileId);
    } catch (error) {
        console.error('Error deleting file:', error);
        throw error;
    }
}
```

### React画像アップロードコンポーネント

```javascript
import { useState } from 'react';
import { uploadFile, getFilePreview } from '../lib/appwrite';

export function ImageUpload({ onUpload }) {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const response = await uploadFile(file);
            const previewUrl = getFilePreview(response.$id);
            setPreview(previewUrl);
            onUpload(response);
        } catch (error) {
            console.error('Upload failed:', error);
            alert('アップロードに失敗しました');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div>
            <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
            />

            {uploading && <p>アップロード中...</p>}

            {preview && (
                <img src={preview} alt="Preview" style={{ maxWidth: '400px' }} />
            )}
        </div>
    );
}
```

## リアルタイム機能

```javascript
import { client } from './appwrite';

// リアルタイムサブスクリプション
function subscribeToCollection(collectionId, callback) {
    const unsubscribe = client.subscribe(
        `databases.${DATABASE_ID}.collections.${collectionId}.documents`,
        (response) => {
            callback(response);
        }
    );

    return unsubscribe;
}

// 使用例
function useRealtimePosts() {
    const [posts, setPosts] = useState([]);

    useEffect(() => {
        // 初期データ取得
        getPosts().then(setPosts);

        // リアルタイム更新を購読
        const unsubscribe = subscribeToCollection(
            POSTS_COLLECTION_ID,
            (response) => {
                if (response.events.includes('databases.*.collections.*.documents.*.create')) {
                    // 新規作成
                    setPosts(prev => [response.payload, ...prev]);
                } else if (response.events.includes('databases.*.collections.*.documents.*.update')) {
                    // 更新
                    setPosts(prev => prev.map(post =>
                        post.$id === response.payload.$id ? response.payload : post
                    ));
                } else if (response.events.includes('databases.*.collections.*.documents.*.delete')) {
                    // 削除
                    setPosts(prev => prev.filter(post => post.$id !== response.payload.$id));
                }
            }
        );

        return () => unsubscribe();
    }, []);

    return posts;
}
```

## Cloud Functions

Appwrite Functionsで、サーバーサイドロジックを実装できます。

### Node.js関数

```javascript
// functions/sendEmail/index.js
const sdk = require('node-appwrite');

module.exports = async ({ req, res, log, error }) => {
    const client = new sdk.Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const users = new sdk.Users(client);

    try {
        const { userId, message } = JSON.parse(req.body);

        // ユーザー情報取得
        const user = await users.get(userId);

        // メール送信処理（実際にはSendGridなどを使用）
        log(`Sending email to ${user.email}: ${message}`);

        return res.json({ success: true });
    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};
```

### 関数の呼び出し

```javascript
import { Functions } from 'appwrite';
import { client } from './appwrite';

const functions = new Functions(client);

async function sendEmail(userId, message) {
    try {
        const response = await functions.createExecution(
            'sendEmail',  // Function ID
            JSON.stringify({ userId, message })
        );
        return response;
    } catch (error) {
        console.error('Function execution failed:', error);
        throw error;
    }
}
```

## 実践例：ブログアプリ

完全なブログアプリケーションの実装例です。

```javascript
// src/lib/blog.js
import { databases, storage } from './appwrite';
import { ID, Query, Permission, Role } from 'appwrite';

const DATABASE_ID = 'blog';
const POSTS_COLLECTION = 'posts';
const COMMENTS_COLLECTION = 'comments';
const IMAGES_BUCKET = 'post-images';

export async function createBlogPost(data, userId) {
    const { title, content, coverImage, tags } = data;

    // 画像をアップロード
    let coverImageId = null;
    if (coverImage) {
        const upload = await storage.createFile(
            IMAGES_BUCKET,
            ID.unique(),
            coverImage
        );
        coverImageId = upload.$id;
    }

    // 投稿を作成
    const post = await databases.createDocument(
        DATABASE_ID,
        POSTS_COLLECTION,
        ID.unique(),
        {
            title,
            content,
            coverImageId,
            tags: tags || [],
            authorId: userId,
            publishedAt: new Date().toISOString(),
            status: 'published'
        },
        [
            Permission.read(Role.any()),
            Permission.update(Role.user(userId)),
            Permission.delete(Role.user(userId)),
        ]
    );

    return post;
}

export async function addComment(postId, content, userId) {
    const comment = await databases.createDocument(
        DATABASE_ID,
        COMMENTS_COLLECTION,
        ID.unique(),
        {
            postId,
            content,
            authorId: userId,
            createdAt: new Date().toISOString()
        }
    );
    return comment;
}

export async function getPostWithComments(postId) {
    const [post, comments] = await Promise.all([
        databases.getDocument(DATABASE_ID, POSTS_COLLECTION, postId),
        databases.listDocuments(
            DATABASE_ID,
            COMMENTS_COLLECTION,
            [
                Query.equal('postId', postId),
                Query.orderDesc('createdAt')
            ]
        )
    ]);

    return { post, comments: comments.documents };
}
```

## まとめ

Appwriteは、モダンなアプリケーション開発に必要な機能を包括的に提供するBaaSプラットフォームです。

### 主な利点

- **オープンソース**: 完全な透明性と自由
- **セルフホスト**: データ主権とプライバシー
- **包括的機能**: 認証からストレージまで一元管理
- **開発効率**: バックエンド構築時間を大幅短縮
- **スケーラビリティ**: Docker Composeで簡単スケール

### 向いているユースケース

- スタートアップのMVP開発
- 社内ツール・管理画面
- モバイルアプリのバックエンド
- プライバシー重視のアプリケーション

Appwriteで、バックエンド開発の煩雑さから解放され、ビジネスロジックに集中しましょう。

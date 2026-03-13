---
title: "TanStack Query楽観的更新パターン: リアルタイムUXの実装テクニック"
description: "TanStack Query (React Query) の楽観的更新を使って、即座に反応する最高のユーザー体験を実現する方法を、実践的なパターンとコード例で解説します。ロールバック処理やエラーハンドリングのベストプラクティスも詳しく紹介します。"
pubDate: "2025-06-25"
updatedDate: "2025-06-25"
tags: ["React", "TanStack Query", "UX", "パフォーマンス", "フロントエンド"]
heroImage: '../../assets/thumbnails/react-query-optimistic-updates.jpg'
---
ユーザーがボタンをクリックした瞬間に、サーバーからのレスポンスを待たずにUIを更新する「楽観的更新(Optimistic Updates)」は、モダンなWebアプリケーションには欠かせないUXテクニックです。本記事では、TanStack Queryを使った楽観的更新の実装方法を、実践的なパターンとともに解説します。

## 楽観的更新とは

### 従来のフロー

```
ユーザーがクリック
  ↓
ローディング表示
  ↓
サーバーにリクエスト (500ms~2s)
  ↓
レスポンス受信
  ↓
UI更新
```

ユーザーは更新が完了するまで待たされ、操作感が重くなります。

### 楽観的更新のフロー

```
ユーザーがクリック
  ↓
即座にUI更新 (楽観的)
  ↓
バックグラウンドでサーバーにリクエスト
  ↓
成功 → そのまま
失敗 → 元に戻す(ロールバック)
```

ユーザーは待たされることなく、瞬時にフィードバックを得られます。

## 基本的な楽観的更新

### 1. シンプルな「いいね」機能

```typescript
// hooks/useLikePost.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface Post {
  id: string;
  title: string;
  likes: number;
  isLiked: boolean;
}

export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to like post');
      }

      return response.json();
    },

    // 楽観的更新
    onMutate: async (postId) => {
      // 進行中のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: ['posts', postId] });

      // 現在のデータを取得（ロールバック用）
      const previousPost = queryClient.getQueryData<Post>(['posts', postId]);

      // 楽観的にUIを更新
      queryClient.setQueryData<Post>(['posts', postId], (old) => {
        if (!old) return old;

        return {
          ...old,
          likes: old.isLiked ? old.likes - 1 : old.likes + 1,
          isLiked: !old.isLiked,
        };
      });

      // ロールバック用のデータを返す
      return { previousPost };
    },

    // エラー時のロールバック
    onError: (err, postId, context) => {
      // 元のデータに戻す
      queryClient.setQueryData(['posts', postId], context?.previousPost);

      // エラー通知
      toast.error('いいねに失敗しました');
    },

    // 成功時の処理（オプション）
    onSuccess: (data, postId) => {
      // サーバーからの正確なデータで更新
      queryClient.setQueryData(['posts', postId], data);
    },

    // 完了時の処理
    onSettled: (data, error, postId) => {
      // リスト全体を再検証
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

// コンポーネントでの使用
function PostCard({ post }: { post: Post }) {
  const likePost = useLikePost();

  return (
    <div className="post-card">
      <h3>{post.title}</h3>
      <button
        onClick={() => likePost.mutate(post.id)}
        disabled={likePost.isPending}
        className={post.isLiked ? 'liked' : ''}
      >
        {post.isLiked ? '❤️' : '🤍'} {post.likes}
      </button>
    </div>
  );
}
```

### 2. リストの楽観的更新

```typescript
// hooks/useAddTodo.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export function useAddTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (text: string) => {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Failed to add todo');
      }

      return response.json();
    },

    onMutate: async (text) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      const previousTodos = queryClient.getQueryData<Todo[]>(['todos']);

      // 一時的なIDで楽観的に追加
      const optimisticTodo: Todo = {
        id: `temp-${Date.now()}`,
        text,
        completed: false,
        createdAt: Date.now(),
      };

      queryClient.setQueryData<Todo[]>(['todos'], (old = []) => [
        optimisticTodo,
        ...old,
      ]);

      return { previousTodos };
    },

    onError: (err, text, context) => {
      queryClient.setQueryData(['todos'], context?.previousTodos);
      toast.error('追加に失敗しました');
    },

    onSuccess: (newTodo) => {
      // 一時IDを実際のIDに置き換え
      queryClient.setQueryData<Todo[]>(['todos'], (old = []) =>
        old.map((todo) =>
          todo.id.startsWith('temp-') ? newTodo : todo
        )
      );
    },
  });
}

// 使用例
function TodoForm() {
  const [text, setText] = useState('');
  const addTodo = useAddTodo();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    addTodo.mutate(text, {
      onSuccess: () => setText(''),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="新しいタスク"
      />
      <button type="submit">追加</button>
    </form>
  );
}
```

## 高度なパターン

### 1. 複数のクエリを同時に更新

```typescript
// hooks/useUpdateUserProfile.ts
interface User {
  id: string;
  name: string;
  avatar: string;
  bio: string;
}

interface Post {
  id: string;
  author: User;
  content: string;
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<User>) => {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update profile');

      return response.json();
    },

    onMutate: async (updates) => {
      // 複数のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: ['user'] });
      await queryClient.cancelQueries({ queryKey: ['posts'] });

      const previousUser = queryClient.getQueryData<User>(['user']);
      const previousPosts = queryClient.getQueryData<Post[]>(['posts']);

      // ユーザープロフィールを更新
      queryClient.setQueryData<User>(['user'], (old) => {
        if (!old) return old;
        return { ...old, ...updates };
      });

      // ユーザーの投稿すべての著者情報を更新
      queryClient.setQueryData<Post[]>(['posts'], (old = []) =>
        old.map((post) => ({
          ...post,
          author: { ...post.author, ...updates },
        }))
      );

      return { previousUser, previousPosts };
    },

    onError: (err, updates, context) => {
      // すべてロールバック
      if (context?.previousUser) {
        queryClient.setQueryData(['user'], context.previousUser);
      }
      if (context?.previousPosts) {
        queryClient.setQueryData(['posts'], context.previousPosts);
      }

      toast.error('プロフィール更新に失敗しました');
    },

    onSettled: () => {
      // 関連するクエリを再検証
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}
```

### 2. 無限スクロールリストの楽観的更新

```typescript
// hooks/useDeletePost.ts
export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
    },

    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] });

      // 無限クエリのデータ構造を取得
      const previousData = queryClient.getQueryData<InfiniteData<Post[]>>(['posts']);

      // すべてのページから該当の投稿を削除
      queryClient.setQueryData<InfiniteData<Post[]>>(['posts'], (old) => {
        if (!old) return old;

        return {
          ...old,
          pages: old.pages.map((page) =>
            page.filter((post) => post.id !== postId)
          ),
        };
      });

      return { previousData };
    },

    onError: (err, postId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['posts'], context.previousData);
      }
      toast.error('削除に失敗しました');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}
```

### 3. ドラッグ&ドロップの順序変更

```typescript
// hooks/useReorderTodos.ts
export function useReorderTodos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newOrder: string[]) => {
      const response = await fetch('/api/todos/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: newOrder }),
      });

      if (!response.ok) throw new Error('Failed to reorder');

      return response.json();
    },

    onMutate: async (newOrder) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      const previousTodos = queryClient.getQueryData<Todo[]>(['todos']);

      // 新しい順序でTodoを並び替え
      queryClient.setQueryData<Todo[]>(['todos'], (old = []) => {
        const todoMap = new Map(old.map((todo) => [todo.id, todo]));
        return newOrder.map((id) => todoMap.get(id)!).filter(Boolean);
      });

      return { previousTodos };
    },

    onError: (err, newOrder, context) => {
      queryClient.setQueryData(['todos'], context?.previousTodos);
      toast.error('並び替えに失敗しました');
    },
  });
}

// React DnDとの統合例
function TodoList() {
  const { data: todos = [] } = useQuery({ queryKey: ['todos'] });
  const reorderTodos = useReorderTodos();

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(todos);
    const [removed] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, removed);

    const newOrder = items.map((item) => item.id);
    reorderTodos.mutate(newOrder);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="todos">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {todos.map((todo, index) => (
              <Draggable key={todo.id} draggableId={todo.id} index={index}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    {todo.text}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
```

### 4. リアルタイムコラボレーション

```typescript
// hooks/useCollaborativeDocument.ts
interface Document {
  id: string;
  title: string;
  content: string;
  version: number;
  lastModified: number;
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      content,
      version,
    }: {
      id: string;
      content: string;
      version: number;
    }) => {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, version }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      return response.json();
    },

    onMutate: async ({ id, content }) => {
      await queryClient.cancelQueries({ queryKey: ['document', id] });

      const previousDoc = queryClient.getQueryData<Document>(['document', id]);

      // 楽観的に更新
      queryClient.setQueryData<Document>(['document', id], (old) => {
        if (!old) return old;

        return {
          ...old,
          content,
          version: old.version + 1,
          lastModified: Date.now(),
        };
      });

      return { previousDoc };
    },

    onError: (err, { id }, context) => {
      // バージョンコンフリクトの場合は特別な処理
      if (err.message.includes('version conflict')) {
        toast.error('他のユーザーが編集しています。最新版を取得します。');
        queryClient.invalidateQueries({ queryKey: ['document', id] });
      } else {
        // 通常のロールバック
        queryClient.setQueryData(['document', id], context?.previousDoc);
        toast.error('保存に失敗しました');
      }
    },

    onSuccess: (data, { id }) => {
      // サーバーからの正確なバージョンで更新
      queryClient.setQueryData(['document', id], data);
    },
  });
}

// デバウンスを使った自動保存
function DocumentEditor({ documentId }: { documentId: string }) {
  const { data: document } = useQuery({
    queryKey: ['document', documentId],
  });
  const updateDocument = useUpdateDocument();

  const [content, setContent] = useState(document?.content || '');

  // デバウンスされた保存
  const debouncedUpdate = useMemo(
    () =>
      debounce((newContent: string) => {
        updateDocument.mutate({
          id: documentId,
          content: newContent,
          version: document?.version || 0,
        });
      }, 1000),
    [documentId, document?.version]
  );

  useEffect(() => {
    if (content !== document?.content) {
      debouncedUpdate(content);
    }
  }, [content, debouncedUpdate]);

  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full h-96 p-4"
      />
      <div className="text-sm text-gray-500">
        {updateDocument.isPending && '保存中...'}
        {updateDocument.isSuccess && '保存しました'}
        {updateDocument.isError && '保存に失敗しました'}
      </div>
    </div>
  );
}
```

## アニメーションとの統合

### 楽観的更新 + Framer Motion

```typescript
// components/TodoItem.tsx
import { motion, AnimatePresence } from 'framer-motion';

function TodoItem({ todo }: { todo: Todo }) {
  const deleteTodo = useDeleteTodo();
  const toggleTodo = useToggleTodo();

  return (
    <AnimatePresence>
      <motion.div
        layout
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -100 }}
        transition={{ duration: 0.2 }}
        className="todo-item"
      >
        <motion.input
          type="checkbox"
          checked={todo.completed}
          onChange={() => toggleTodo.mutate(todo.id)}
          whileTap={{ scale: 1.2 }}
        />

        <span className={todo.completed ? 'line-through' : ''}>
          {todo.text}
        </span>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => deleteTodo.mutate(todo.id)}
        >
          削除
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}
```

## エラーハンドリングのベストプラクティス

### 1. リトライ戦略

```typescript
export function useLikePostWithRetry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: likePost,
    onMutate: /* 楽観的更新 */,

    retry: 3, // 3回までリトライ
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

    onError: (err, postId, context) => {
      // 最終的に失敗した場合のみロールバック
      queryClient.setQueryData(['posts', postId], context?.previousPost);
      toast.error('いいねに失敗しました。後でもう一度お試しください。');
    },
  });
}
```

### 2. オフライン対応

```typescript
import { onlineManager } from '@tanstack/react-query';

export function useOfflineAwareMutation() {
  const queryClient = useQueryClient();
  const isOnline = onlineManager.isOnline();

  return useMutation({
    mutationFn: updateData,

    onMutate: async (newData) => {
      // オフライン時は楽観的更新のみ
      if (!isOnline) {
        toast.info('オフラインです。オンライン復帰時に同期されます。');
      }

      // 楽観的更新
      await queryClient.cancelQueries({ queryKey: ['data'] });
      const previousData = queryClient.getQueryData(['data']);
      queryClient.setQueryData(['data'], newData);

      return { previousData };
    },

    // オンライン復帰時に自動的に再試行
    networkMode: 'offlineFirst',
  });
}
```

## まとめ

TanStack Queryの楽観的更新を活用することで、以下が実現できます:

- **即座のフィードバック**: ユーザーは待たされない
- **スムーズなUX**: ローディング状態が目立たない
- **安全なロールバック**: エラー時は自動的に元に戻る
- **複雑な状態管理**: 複数のクエリを一貫性を保ちながら更新
- **リアルタイム感**: コラボレーション機能も実現可能

楽観的更新は、モダンなWebアプリケーションに欠かせないテクニックです。ユーザー体験を劇的に向上させるために、ぜひ実装してみてください。
---

## 関連記事

- [プログラミングスクール比較2026年版【現役エンジニアが選ぶ厳選8校】](/blog/2026-03-08-programming-school-comparison-2026)
- [Coloso評判・口コミ2026｜利用者の本音と徹底レビュー](/blog/2026-03-23-coloso-review-reputation-2026)
- [エンジニア転職完全ガイド2026【未経験・経験者別ロードマップ】](/blog/2026-03-09-engineer-career-change-guide-2026)

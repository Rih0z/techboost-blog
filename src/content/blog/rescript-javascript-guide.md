---
title: "ReScript言語によるJavaScript開発ガイド"
description: "型安全で高速なJavaScript開発を実現するReScript言語の基礎から実践まで、詳しく解説します"
pubDate: "2025-02-05"
tags: ["rescript", "javascript", "typescript", "functional-programming"]
---

ReScriptは、JavaScriptにコンパイルされる型安全な関数型プログラミング言語です。OCamlをベースにしており、Reactとの親和性が高く、型安全性とパフォーマンスを両立させた開発が可能です。本記事では、ReScriptの基礎から実践的な使い方まで詳しく解説します。

## ReScriptとは

ReScriptは、元々BuckleScriptとして知られていたOCamlからJavaScriptへのコンパイラです。2020年にReScriptとしてリブランドされ、独自の言語仕様を持つようになりました。

### 主な特徴

**1. 100%型安全**
- null/undefinedの問題を言語レベルで解決
- 実行時エラーをコンパイル時に検出
- 完全な型推論

**2. 高速なコンパイル**
- インクリメンタルコンパイルにより数ミリ秒でコンパイル完了
- 大規模プロジェクトでも高速

**3. 読みやすいJavaScript出力**
- 手書きのJavaScriptと同等の可読性
- デバッグが容易
- バンドルサイズが小さい

**4. JavaScriptとの相互運用性**
- 既存のJavaScriptライブラリを簡単に利用可能
- 段階的な導入が可能

## セットアップ

### プロジェクトの作成

```bash
# 新規プロジェクト作成
npm create rescript-app@latest my-rescript-app

cd my-rescript-app
npm install
```

### プロジェクト構造

```
my-rescript-app/
├── src/
│   └── Demo.res
├── bsconfig.json
├── package.json
└── index.html
```

`bsconfig.json`はReScriptコンパイラの設定ファイルです。

```json
{
  "name": "my-rescript-app",
  "version": "0.1.0",
  "sources": {
    "dir": "src",
    "subdirs": true
  },
  "package-specs": {
    "module": "es6",
    "in-source": true
  },
  "suffix": ".bs.js",
  "bs-dependencies": []
}
```

## 基本文法

### 変数とデータ型

```rescript
// 変数宣言
let greeting = "Hello"
let age = 25
let isActive = true

// 型注釈（オプション）
let name: string = "Alice"
let count: int = 10

// letバインディングは不変
// greeting = "Hi" // エラー！

// 可変変数が必要な場合
let message = ref("Initial")
message := "Updated"
Console.log(message.contents)
```

### 関数

```rescript
// 基本的な関数
let add = (x, y) => x + y

// 型注釈付き
let multiply = (x: int, y: int): int => x * y

// 複数行の関数
let greet = name => {
  let message = `Hello, ${name}!`
  Console.log(message)
  message
}

// カリー化された関数
let addThree = (x, y, z) => x + y + z
let addFive = addThree(2, 3)
let result = addFive(5) // 10

// パイプ演算子
let result = 5
  ->multiply(3)
  ->add(2)
  ->Int.toString
// "17"
```

### Option型

null/undefinedの代わりにOption型を使用します。

```rescript
// Option型の定義
type option<'a> = None | Some('a)

// 使用例
let findUser = (id: int): option<string> => {
  if id == 1 {
    Some("Alice")
  } else {
    None
  }
}

// パターンマッチング
let userName = findUser(1)
switch userName {
| Some(name) => Console.log(`Found: ${name}`)
| None => Console.log("User not found")
}

// Option関数
let user = findUser(1)
let displayName = user->Option.getWithDefault("Unknown")
```

### Result型

エラーハンドリングにはResult型を使用します。

```rescript
type result<'a, 'b> = Ok('a) | Error('b)

let divide = (a: float, b: float): result<float, string> => {
  if b == 0.0 {
    Error("Division by zero")
  } else {
    Ok(a /. b)
  }
}

let result = divide(10.0, 2.0)
switch result {
| Ok(value) => Console.log(`Result: ${Float.toString(value)}`)
| Error(msg) => Console.log(`Error: ${msg}`)
}
```

### レコードとバリアント

```rescript
// レコード型
type user = {
  id: int,
  name: string,
  email: string,
}

let alice = {
  id: 1,
  name: "Alice",
  email: "alice@example.com",
}

// イミュータブルな更新
let updatedAlice = {...alice, email: "newalice@example.com"}

// バリアント型
type color = Red | Green | Blue | Custom(string)

let toHex = color =>
  switch color {
  | Red => "#FF0000"
  | Green => "#00FF00"
  | Blue => "#0000FF"
  | Custom(hex) => hex
  }
```

## React統合

ReScriptはReactとの統合が非常に優れています。

### セットアップ

```bash
npm install @rescript/react
```

`bsconfig.json`に依存を追加:

```json
{
  "bs-dependencies": ["@rescript/react"],
  "jsx": { "version": 4 }
}
```

### Reactコンポーネント

```rescript
// Button.res
module Button = {
  @react.component
  let make = (~text: string, ~onClick: unit => unit) => {
    <button onClick={_ => onClick()}>
      {React.string(text)}
    </button>
  }
}

// App.res
module App = {
  @react.component
  let make = () => {
    let (count, setCount) = React.useState(() => 0)

    let handleClick = () => {
      setCount(prev => prev + 1)
    }

    <div>
      <h1>{React.string("Counter App")}</h1>
      <p>{React.string(`Count: ${Int.toString(count)}`)}</p>
      <Button text="Increment" onClick={handleClick} />
    </div>
  }
}
```

### Hooks

```rescript
// カスタムフック
let useFetch = (url: string) => {
  let (data, setData) = React.useState(() => None)
  let (loading, setLoading) = React.useState(() => true)
  let (error, setError) = React.useState(() => None)

  React.useEffect(() => {
    setLoading(_ => true)

    Fetch.fetch(url)
    ->Promise.then(Response.json)
    ->Promise.then(json => {
      setData(_ => Some(json))
      setLoading(_ => false)
      Promise.resolve()
    })
    ->Promise.catch(err => {
      setError(_ => Some(err))
      setLoading(_ => false)
      Promise.resolve()
    })
    ->ignore

    None
  }, [url])

  (data, loading, error)
}

// 使用例
@react.component
let make = () => {
  let (data, loading, error) = useFetch("https://api.example.com/users")

  if loading {
    <div>{React.string("Loading...")}</div>
  } else {
    switch (data, error) {
    | (Some(d), _) => <div>/* データ表示 */</div>
    | (_, Some(e)) => <div>{React.string("Error occurred")}</div>
    | _ => <div>{React.string("No data")}</div>
    }
  }
}
```

## JavaScript相互運用

### JavaScriptからReScriptへ

```rescript
// 外部JavaScript関数をバインド
@val external alert: string => unit = "alert"
@val external setTimeout: (unit => unit, int) => unit = "setTimeout"

// オブジェクトメソッド
@send external push: (array<'a>, 'a) => unit = "push"

// オブジェクト作成
type config = {
  apiKey: string,
  timeout: int,
}

@module("some-library") external init: config => unit = "init"

// 使用例
init({apiKey: "abc123", timeout: 5000})
```

### JavaScriptライブラリのバインディング

```rescript
// axios.res
type response<'a> = {
  data: 'a,
  status: int,
}

@module("axios")
external get: string => Promise.t<response<'a>> = "get"

@module("axios")
external post: (string, 'a) => Promise.t<response<'b>> = "post"

// 使用例
let fetchUser = async (id: int) => {
  try {
    let response = await get(`https://api.example.com/users/${Int.toString(id)}`)
    Console.log(response.data)
  } catch {
  | error => Console.error(error)
  }
}
```

## 実践例: Todoアプリ

```rescript
// Todo.res
type todo = {
  id: int,
  text: string,
  completed: bool,
}

module TodoItem = {
  @react.component
  let make = (~todo: todo, ~onToggle: int => unit, ~onDelete: int => unit) => {
    <li>
      <input
        type_="checkbox"
        checked={todo.completed}
        onChange={_ => onToggle(todo.id)}
      />
      <span
        style={ReactDOM.Style.make(
          ~textDecoration=todo.completed ? "line-through" : "none",
          (),
        )}>
        {React.string(todo.text)}
      </span>
      <button onClick={_ => onDelete(todo.id)}>
        {React.string("Delete")}
      </button>
    </li>
  }
}

module TodoApp = {
  @react.component
  let make = () => {
    let (todos, setTodos) = React.useState(() => [])
    let (input, setInput) = React.useState(() => "")
    let (nextId, setNextId) = React.useState(() => 1)

    let addTodo = () => {
      if input != "" {
        let newTodo = {
          id: nextId,
          text: input,
          completed: false,
        }
        setTodos(prev => Array.concat(prev, [newTodo]))
        setNextId(prev => prev + 1)
        setInput(_ => "")
      }
    }

    let toggleTodo = (id: int) => {
      setTodos(prev =>
        prev->Array.map(todo =>
          if todo.id == id {
            {...todo, completed: !todo.completed}
          } else {
            todo
          }
        )
      )
    }

    let deleteTodo = (id: int) => {
      setTodos(prev => prev->Array.filter(todo => todo.id != id))
    }

    <div>
      <h1>{React.string("Todo App")}</h1>
      <div>
        <input
          type_="text"
          value={input}
          onChange={e => setInput(_ => ReactEvent.Form.target(e)["value"])}
          placeholder="Enter todo..."
        />
        <button onClick={_ => addTodo()}>
          {React.string("Add")}
        </button>
      </div>
      <ul>
        {todos
        ->Array.map(todo =>
          <TodoItem
            key={Int.toString(todo.id)}
            todo
            onToggle={toggleTodo}
            onDelete={deleteTodo}
          />
        )
        ->React.array}
      </ul>
    </div>
  }
}
```

## ベストプラクティス

### 1. 型を活用する

```rescript
// 文字列より具体的な型を使う
type userId = UserId(int)
type email = Email(string)

type user = {
  id: userId,
  email: email,
  name: string,
}

let createUser = (id: int, email: string, name: string): user => {
  {
    id: UserId(id),
    email: Email(email),
    name: name,
  }
}
```

### 2. パターンマッチングを活用

```rescript
// 網羅的なチェック
type status = Idle | Loading | Success(string) | Error(string)

let renderStatus = status =>
  switch status {
  | Idle => <div>{React.string("Ready")}</div>
  | Loading => <div>{React.string("Loading...")}</div>
  | Success(data) => <div>{React.string(data)}</div>
  | Error(msg) => <div>{React.string(`Error: ${msg}`)}</div>
  }
```

### 3. パイプライン演算子

```rescript
// データ変換のパイプライン
let processData = data =>
  data
  ->Array.filter(x => x > 0)
  ->Array.map(x => x * 2)
  ->Array.reduce(0, (acc, x) => acc + x)
```

## まとめ

ReScriptは型安全性とパフォーマンスを重視したJavaScript開発を実現する優れた選択肢です。主な利点は以下の通りです。

- **型安全性**: コンパイル時にほとんどのエラーを検出
- **高速**: ミリ秒単位のコンパイル時間
- **JavaScript互換**: 既存のエコシステムを活用可能
- **React統合**: 優れたReactサポート

学習コストはありますが、大規模プロジェクトや長期運用を考えると、ReScriptの投資価値は高いでしょう。

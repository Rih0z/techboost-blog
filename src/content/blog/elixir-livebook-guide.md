---
title: "Elixir Livebookでインタラクティブな開発環境を構築"
description: "Elixir Livebook を使ったインタラクティブなデータ分析、機械学習、Web開発の実践ガイド。Jupyter風のノートブック環境をElixirで実現。実践的な解説と具体的なコード例で、基礎から応用まで段階的に学べる技術ガイドです。開発効率の向上に役立ちます。"
pubDate: "2025-02-05"
tags: ['プログラミング', '開発ツール']
---
## Elixir Livebookとは

Elixir Livebook は、Elixir のためのインタラクティブなノートブック環境です。Jupyter Notebook に似た使い心地で、データ分析、機械学習、プロトタイピング、ドキュメント作成など、幅広い用途に活用できます。

### Livebookの主な特徴

- **リアルタイム実行**: コードセルを実行すると即座に結果が表示される
- **ビジュアライゼーション**: グラフやチャートを簡単に描画
- **リアクティブ**: 変数が更新されると依存するセルが自動再実行
- **共有とコラボレーション**: ノートブックを簡単に共有・公開可能
- **Elixir エコシステムとの統合**: Mix プロジェクトとの連携、依存関係の管理
- **Phoenix LiveView ベース**: Web ベースのインターフェース、リアルタイム通信

## インストールとセットアップ

### 方法1: スタンドアロンアプリケーション

最も簡単な方法は、Livebook の公式サイトからスタンドアロンアプリケーションをダウンロードすることです。

macOS の場合:

```bash
brew install livebook
```

または、手動でダウンロード:

```bash
# macOS
curl -L https://livebook.dev/install/macos -o livebook
chmod +x livebook
./livebook server
```

### 方法2: Elixir から直接起動

Elixir がインストールされている場合:

```bash
# Elixir インストール（macOS）
brew install elixir

# Livebook を escript としてインストール
mix escript.install hex livebook

# Livebook 起動
livebook server
```

### 方法3: Docker

Docker を使う方法:

```bash
docker run -p 8080:8080 -p 8081:8081 --pull always livebook/livebook
```

環境変数を設定して起動:

```bash
docker run -p 8080:8080 -p 8081:8081 \
  -e LIVEBOOK_PASSWORD="secret" \
  -v $(pwd)/notebooks:/data \
  --pull always livebook/livebook
```

### 初回起動

Livebook を起動すると、ブラウザが自動的に開き、認証トークンが表示されます。このトークンを入力してアクセスします。

```bash
livebook server

# 出力例:
# [Livebook] Application running at http://localhost:8080/?token=xxxxx
```

## 基本的な使い方

### ノートブックの作成

1. Livebook のホーム画面で「New notebook」をクリック
2. ノートブックの名前を入力
3. コードセルとマークダウンセルを追加して実行

### コードセルの実行

```elixir
# シンプルな計算
IO.puts("Hello, Livebook!")

result = 1 + 1
IO.inspect(result)
```

実行結果:

```
Hello, Livebook!
2
```

### マークダウンセル

マークダウンセルを使ってドキュメントを作成:

```markdown
# データ分析プロジェクト

このノートブックでは、売上データを分析します。

## データの読み込み

まずは CSV ファイルを読み込みます。
```

### セルの依存関係

Livebook は自動的にセル間の依存関係を解析します:

```elixir
# セル 1
name = "Alice"
```

```elixir
# セル 2（セル1に依存）
greeting = "Hello, #{name}!"
IO.puts(greeting)
```

セル1を更新すると、セル2も自動的に再実行されます。

## データ分析の実践

### CSVデータの読み込みと処理

```elixir
Mix.install([
  {:explorer, "~> 0.8"},
  {:kino_explorer, "~> 0.1"}
])
```

```elixir
alias Explorer.DataFrame
alias Explorer.Series

# CSV ファイルの読み込み
df = DataFrame.from_csv!("sales_data.csv")

# データの確認
Kino.DataTable.new(df)
```

### データの集計と変換

```elixir
# 売上金額の合計を計算
total_sales =
  df
  |> DataFrame.select(["amount"])
  |> DataFrame.to_series()
  |> Map.get("amount")
  |> Series.sum()

IO.puts("合計売上: ¥#{total_sales}")
```

```elixir
# 商品カテゴリごとの売上集計
category_sales =
  df
  |> DataFrame.group_by(["category"])
  |> DataFrame.summarise(total: sum(amount), count: count(amount))
  |> DataFrame.sort_by(desc: total)

Kino.DataTable.new(category_sales)
```

### データのビジュアライゼーション

VegaLite を使ってグラフを描画:

```elixir
Mix.install([
  {:kino_vega_lite, "~> 0.1"},
  {:explorer, "~> 0.8"}
])
```

```elixir
alias VegaLite, as: Vl

# 売上推移のグラフ
Vl.new(width: 600, height: 400)
|> Vl.data_from_values(DataFrame.to_rows(df))
|> Vl.mark(:line)
|> Vl.encode_field(:x, "date", type: :temporal)
|> Vl.encode_field(:y, "amount", type: :quantitative)
|> Vl.encode_field(:color, "category", type: :nominal)
```

```elixir
# カテゴリ別売上の棒グラフ
Vl.new(width: 600, height: 400)
|> Vl.data_from_values(DataFrame.to_rows(category_sales))
|> Vl.mark(:bar)
|> Vl.encode_field(:x, "category", type: :nominal)
|> Vl.encode_field(:y, "total", type: :quantitative)
|> Vl.encode(:color, field: "category", type: :nominal)
```

## 機械学習の実装

### Scholar による機械学習

Elixir の機械学習ライブラリ Scholar を使った例:

```elixir
Mix.install([
  {:scholar, "~> 0.2"},
  {:explorer, "~> 0.8"},
  {:nx, "~> 0.6"}
])
```

```elixir
alias Scholar.Linear.LinearRegression
alias Explorer.DataFrame
alias Explorer.Series

# データの準備
train_data = DataFrame.from_csv!("train.csv")

x_train =
  train_data
  |> DataFrame.select(["feature1", "feature2", "feature3"])
  |> DataFrame.to_columns()
  |> Enum.map(fn {_name, series} -> Series.to_list(series) end)
  |> Nx.tensor()

y_train =
  train_data
  |> DataFrame.pull("target")
  |> Series.to_tensor()

# モデルの学習
model = LinearRegression.fit(x_train, y_train)

IO.puts("モデルの学習が完了しました")
IO.inspect(model)
```

```elixir
# 予測の実行
test_data = DataFrame.from_csv!("test.csv")

x_test =
  test_data
  |> DataFrame.select(["feature1", "feature2", "feature3"])
  |> DataFrame.to_columns()
  |> Enum.map(fn {_name, series} -> Series.to_list(series) end)
  |> Nx.tensor()

predictions = LinearRegression.predict(model, x_test)

IO.puts("予測結果:")
IO.inspect(predictions)
```

### Nx によるニューラルネットワーク

```elixir
Mix.install([
  {:nx, "~> 0.6"},
  {:axon, "~> 0.6"},
  {:kino, "~> 0.12"}
])
```

```elixir
# シンプルなニューラルネットワークの定義
model =
  Axon.input("input", shape: {nil, 784})
  |> Axon.dense(128, activation: :relu)
  |> Axon.dropout(rate: 0.2)
  |> Axon.dense(10, activation: :softmax)

# モデルの可視化
Axon.Display.as_graph(model, Nx.template({1, 784}, :f32))
```

```elixir
# 学習の実行
trained_model =
  model
  |> Axon.Loop.trainer(:categorical_cross_entropy, :adam)
  |> Axon.Loop.metric(:accuracy)
  |> Axon.Loop.run(train_data, epochs: 10, compiler: EXLA)

IO.puts("学習完了")
```

## インタラクティブUI

### Kino による入力フォーム

```elixir
# テキスト入力
name_input = Kino.Input.text("名前を入力してください")
```

```elixir
# 入力値の取得
name = Kino.Input.read(name_input)
IO.puts("こんにちは、#{name}さん!")
```

```elixir
# 数値入力
age_input = Kino.Input.number("年齢を入力してください", default: 25)
```

```elixir
# セレクトボックス
category_input = Kino.Input.select("カテゴリを選択", [
  {"電子機器", :electronics},
  {"書籍", :books},
  {"食品", :food}
])
```

### 動的なダッシュボード

```elixir
Mix.install([
  {:kino, "~> 0.12"},
  {:kino_vega_lite, "~> 0.1"}
])
```

```elixir
# リアルタイムグラフの作成
alias VegaLite, as: Vl

graph =
  Vl.new(width: 600, height: 400)
  |> Vl.mark(:line)
  |> Vl.encode_field(:x, "time", type: :temporal)
  |> Vl.encode_field(:y, "value", type: :quantitative)
  |> Kino.VegaLite.new()

Kino.render(graph)

# データを定期的に更新
for i <- 1..100 do
  point = %{
    time: DateTime.utc_now(),
    value: :rand.uniform() * 100
  }

  Kino.VegaLite.push(graph, point)
  Process.sleep(100)
end
```

### フォームとボタン

```elixir
# ボタンの作成
button = Kino.Control.button("実行")

# ボタンのイベント監視
Kino.listen(button, fn event ->
  IO.puts("ボタンがクリックされました: #{inspect(event)}")
end)

Kino.render(button)
```

## Mix プロジェクトとの連携

### 既存プロジェクトの読み込み

```elixir
# Mix プロジェクトのパスを設定
Mix.install([],
  path: "/path/to/your/project",
  config_path: "config/config.exs"
)
```

```elixir
# プロジェクトのモジュールを使用
alias MyApp.Accounts
alias MyApp.Repo

users = Accounts.list_users()
IO.inspect(users)
```

### カスタム依存関係の管理

```elixir
Mix.install([
  {:phoenix, "~> 1.7"},
  {:ecto, "~> 3.11"},
  {:postgrex, "~> 0.17"},
  {:httpoison, "~> 2.0"},
  {:jason, "~> 1.4"}
])
```

## データベース操作

### Ecto によるデータベースクエリ

```elixir
Mix.install([
  {:ecto_sql, "~> 3.11"},
  {:postgrex, "~> 0.17"},
  {:kino, "~> 0.12"}
])
```

```elixir
# データベース接続の設定
defmodule Repo do
  use Ecto.Repo,
    otp_app: :livebook,
    adapter: Ecto.Adapters.Postgres
end

# Repo の起動
Repo.start_link(
  hostname: "localhost",
  username: "postgres",
  password: "postgres",
  database: "myapp_dev"
)
```

```elixir
# スキーマの定義
defmodule User do
  use Ecto.Schema

  schema "users" do
    field :name, :string
    field :email, :string
    field :age, :integer

    timestamps()
  end
end
```

```elixir
import Ecto.Query

# ユーザーの取得
users =
  User
  |> where([u], u.age > 18)
  |> order_by([u], desc: u.inserted_at)
  |> limit(10)
  |> Repo.all()

Kino.DataTable.new(users)
```

## Web スクレイピング

### Req によるHTTPリクエスト

```elixir
Mix.install([
  {:req, "~> 0.4"},
  {:floki, "~> 0.35"},
  {:kino, "~> 0.12"}
])
```

```elixir
# Webページの取得
{:ok, response} = Req.get("https://example.com")

html = response.body

# HTMLのパース
{:ok, document} = Floki.parse_document(html)

# タイトルの抽出
title =
  document
  |> Floki.find("title")
  |> Floki.text()

IO.puts("ページタイトル: #{title}")
```

```elixir
# リンクの抽出
links =
  document
  |> Floki.find("a")
  |> Floki.attribute("href")
  |> Enum.take(10)

Kino.DataTable.new(
  Enum.map(links, fn link -> %{url: link} end)
)
```

## ノートブックの共有と公開

### ノートブックのエクスポート

Livebook は以下の形式でエクスポート可能:

1. **Live Markdown (.livemd)**: Livebook ネイティブ形式
2. **Elixir Script (.exs)**: 通常の Elixir スクリプトとして実行可能
3. **HTML**: 静的HTMLとして共有

### GitHub との連携

```bash
# ノートブックを Git リポジトリに保存
git add notebook.livemd
git commit -m "Add data analysis notebook"
git push origin main
```

### Livebook Teams での共有

Livebook Teams（有料サービス）を使うと、チームでノートブックを共有・コラボレーション可能:

- リアルタイム共同編集
- アクセス制御
- スケジュール実行
- シークレット管理

## 実践的なユースケース

### ログ分析ダッシュボード

```elixir
Mix.install([
  {:explorer, "~> 0.8"},
  {:kino_vega_lite, "~> 0.1"}
])
```

```elixir
# ログファイルの解析
logs =
  File.stream!("app.log")
  |> Stream.map(&String.trim/1)
  |> Stream.reject(&(&1 == ""))
  |> Enum.to_list()

IO.puts("ログ行数: #{length(logs)}")
```

```elixir
# エラーログの抽出
error_logs =
  logs
  |> Enum.filter(&String.contains?(&1, "ERROR"))
  |> Enum.take(10)

Kino.DataTable.new(
  Enum.map(error_logs, fn log -> %{message: log} end)
)
```

### APIテストと監視

```elixir
Mix.install([
  {:req, "~> 0.4"},
  {:kino, "~> 0.12"}
])
```

```elixir
# API エンドポイントのテスト
defmodule APIMonitor do
  def check_endpoint(url) do
    start_time = System.monotonic_time(:millisecond)

    result = case Req.get(url) do
      {:ok, %{status: 200} = response} ->
        {:ok, response}
      {:ok, response} ->
        {:error, "Status: #{response.status}"}
      {:error, error} ->
        {:error, inspect(error)}
    end

    end_time = System.monotonic_time(:millisecond)
    duration = end_time - start_time

    {result, duration}
  end
end

# テスト実行
{result, duration} = APIMonitor.check_endpoint("https://api.example.com/health")

IO.puts("結果: #{inspect(result)}")
IO.puts("レスポンスタイム: #{duration}ms")
```

## まとめ

Elixir Livebook は、インタラクティブな開発環境として非常に強力なツールです。主な利点:

- **即座のフィードバック**: コードを書いてすぐに結果を確認
- **ビジュアル化**: データやグラフを美しく表示
- **ドキュメント化**: コードと説明を一体化
- **共有とコラボレーション**: ノートブックを簡単に共有
- **プロトタイピング**: アイデアを素早く試せる

データサイエンス、機械学習、Web開発、システム監視など、幅広い用途で活用できるので、ぜひプロジェクトに導入してみてください。

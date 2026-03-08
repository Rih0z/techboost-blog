---
title: 'Elixir Phoenix LiveView入門ガイド: リアルタイムUIをサーバーサイドで実装'
description: 'Phoenix LiveViewの完全ガイド。リアルタイムUI、サーバーサイドレンダリング、フォーム処理、WebSocket通信、最適化テクニックまで実践的に解説。最新の技術動向を踏まえた実践的なガイドです。開発者必見の内容を網羅しています。'
pubDate: 2025-02-05
tags: ['Elixir', 'Phoenix', 'LiveView', 'リアルタイム', 'WebSocket', 'インフラ']
heroImage: '../../assets/thumbnails/elixir-phoenix-liveview-guide.jpg'
---

Phoenix LiveViewは、JavaScriptをほとんど書かずにリアルタイムでインタラクティブなWebアプリケーションを構築できる革新的なフレームワークです。本記事では、基本概念から実践的な実装パターンまで徹底解説します。

## Phoenix LiveViewとは

### 主な特徴

- **サーバーサイドレンダリング**: UIロジックはすべてElixirで記述
- **リアルタイム更新**: WebSocketを使った双方向通信
- **JavaScriptレス**: 複雑なフロントエンド管理が不要
- **高パフォーマンス**: ErlangVMの並行処理能力を活用
- **SEO対応**: 初回レンダリングはサーバーサイド

### 従来のSPAとの違い

| 特徴 | LiveView | React/Vue SPA |
|------|----------|---------------|
| レンダリング | サーバーサイド | クライアントサイド |
| 状態管理 | サーバーメモリ | クライアントメモリ |
| 通信方式 | WebSocket | REST/GraphQL |
| JavaScript | 最小限 | 必須 |
| SEO | 優れている | 要工夫 |

## 環境セットアップ

### Elixirのインストール

```bash
# macOS (Homebrew)
brew install elixir

# Ubuntu
sudo apt-get install elixir

# Windows
# https://elixir-lang.org/install.html からインストーラーをダウンロード

# バージョン確認
elixir --version
```

### Phoenixプロジェクト作成

```bash
# Phoenix generatorインストール
mix archive.install hex phx_new

# プロジェクト作成
mix phx.new my_app --live

# 依存関係インストール
cd my_app
mix deps.get

# データベースセットアップ
mix ecto.setup

# サーバー起動
mix phx.server
```

http://localhost:4000 でアプリケーションが起動します。

## LiveViewの基本構造

### シンプルなカウンターの実装

```elixir
# lib/my_app_web/live/counter_live.ex
defmodule MyAppWeb.CounterLive do
  use MyAppWeb, :live_view

  # マウント時の初期化
  def mount(_params, _session, socket) do
    {:ok, assign(socket, count: 0)}
  end

  # テンプレートレンダリング
  def render(assigns) do
    ~H"""
    <div class="counter">
      <h1>Counter: <%= @count %></h1>
      <button phx-click="increment">+</button>
      <button phx-click="decrement">-</button>
      <button phx-click="reset">Reset</button>
    </div>
    """
  end

  # イベントハンドラー
  def handle_event("increment", _params, socket) do
    {:noreply, assign(socket, count: socket.assigns.count + 1)}
  end

  def handle_event("decrement", _params, socket) do
    {:noreply, assign(socket, count: socket.assigns.count - 1)}
  end

  def handle_event("reset", _params, socket) do
    {:noreply, assign(socket, count: 0)}
  end
end
```

### ルーティング設定

```elixir
# lib/my_app_web/router.ex
defmodule MyAppWeb.Router do
  use MyAppWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, {MyAppWeb.LayoutView, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  scope "/", MyAppWeb do
    pipe_through :browser

    live "/counter", CounterLive
    live "/", PageLive, :index
  end
end
```

## フォーム処理

### バリデーション付きフォーム

```elixir
# lib/my_app/accounts/user.ex
defmodule MyApp.Accounts.User do
  use Ecto.Schema
  import Ecto.Changeset

  schema "users" do
    field :name, :string
    field :email, :string
    field :age, :integer

    timestamps()
  end

  def changeset(user, attrs) do
    user
    |> cast(attrs, [:name, :email, :age])
    |> validate_required([:name, :email])
    |> validate_format(:email, ~r/@/)
    |> validate_number(:age, greater_than: 0, less_than: 150)
    |> unique_constraint(:email)
  end
end
```

### LiveViewフォーム実装

```elixir
# lib/my_app_web/live/user_form_live.ex
defmodule MyAppWeb.UserFormLive do
  use MyAppWeb, :live_view
  alias MyApp.Accounts
  alias MyApp.Accounts.User

  def mount(_params, _session, socket) do
    changeset = Accounts.change_user(%User{})

    socket =
      socket
      |> assign(:changeset, changeset)
      |> assign(:users, Accounts.list_users())

    {:ok, socket}
  end

  def render(assigns) do
    ~H"""
    <div class="user-form">
      <h1>Create User</h1>

      <.form
        for={@changeset}
        phx-change="validate"
        phx-submit="save"
      >
        <div class="field">
          <.input field={@changeset[:name]} type="text" label="Name" />
        </div>

        <div class="field">
          <.input field={@changeset[:email]} type="email" label="Email" />
        </div>

        <div class="field">
          <.input field={@changeset[:age]} type="number" label="Age" />
        </div>

        <button type="submit">Save</button>
      </.form>

      <h2>Users</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Age</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <%= for user <- @users do %>
            <tr>
              <td><%= user.name %></td>
              <td><%= user.email %></td>
              <td><%= user.age %></td>
              <td>
                <button phx-click="delete" phx-value-id={user.id}>Delete</button>
              </td>
            </tr>
          <% end %>
        </tbody>
      </table>
    </div>
    """
  end

  # リアルタイムバリデーション
  def handle_event("validate", %{"user" => user_params}, socket) do
    changeset =
      %User{}
      |> Accounts.change_user(user_params)
      |> Map.put(:action, :validate)

    {:noreply, assign(socket, changeset: changeset)}
  end

  # フォーム送信
  def handle_event("save", %{"user" => user_params}, socket) do
    case Accounts.create_user(user_params) do
      {:ok, _user} ->
        socket =
          socket
          |> put_flash(:info, "User created successfully!")
          |> assign(:changeset, Accounts.change_user(%User{}))
          |> assign(:users, Accounts.list_users())

        {:noreply, socket}

      {:error, %Ecto.Changeset{} = changeset} ->
        {:noreply, assign(socket, changeset: changeset)}
    end
  end

  # ユーザー削除
  def handle_event("delete", %{"id" => id}, socket) do
    user = Accounts.get_user!(id)
    {:ok, _} = Accounts.delete_user(user)

    {:noreply, assign(socket, users: Accounts.list_users())}
  end
end
```

## リアルタイム機能

### PubSubによるブロードキャスト

```elixir
# lib/my_app_web/live/chat_live.ex
defmodule MyAppWeb.ChatLive do
  use MyAppWeb, :live_view

  @topic "chat:lobby"

  def mount(_params, _session, socket) do
    if connected?(socket) do
      Phoenix.PubSub.subscribe(MyApp.PubSub, @topic)
    end

    socket =
      socket
      |> assign(:messages, [])
      |> assign(:message, "")

    {:ok, socket}
  end

  def render(assigns) do
    ~H"""
    <div class="chat">
      <div class="messages">
        <%= for message <- @messages do %>
          <div class="message">
            <strong><%= message.username %>:</strong>
            <%= message.text %>
            <span class="timestamp"><%= message.timestamp %></span>
          </div>
        <% end %>
      </div>

      <form phx-submit="send-message">
        <input
          type="text"
          name="message"
          value={@message}
          placeholder="Type a message..."
          autocomplete="off"
        />
        <button type="submit">Send</button>
      </form>
    </div>
    """
  end

  def handle_event("send-message", %{"message" => message}, socket) do
    if message != "" do
      Phoenix.PubSub.broadcast(MyApp.PubSub, @topic, {:new_message, message})
    end

    {:noreply, assign(socket, message: "")}
  end

  def handle_info({:new_message, message}, socket) do
    message_data = %{
      username: "User",
      text: message,
      timestamp: DateTime.utc_now() |> DateTime.to_string()
    }

    {:noreply, assign(socket, messages: socket.assigns.messages ++ [message_data])}
  end
end
```

### LiveComponent（再利用可能なコンポーネント）

```elixir
# lib/my_app_web/live/components/search_component.ex
defmodule MyAppWeb.SearchComponent do
  use MyAppWeb, :live_component

  def update(assigns, socket) do
    socket =
      socket
      |> assign(assigns)
      |> assign(:query, "")
      |> assign(:results, [])

    {:ok, socket}
  end

  def render(assigns) do
    ~H"""
    <div class="search-component">
      <input
        type="text"
        value={@query}
        phx-keyup="search"
        phx-target={@myself}
        phx-debounce="300"
        placeholder="Search..."
      />

      <div class="results">
        <%= if @query != "" do %>
          <%= for result <- @results do %>
            <div class="result-item" phx-click="select" phx-value-id={result.id} phx-target={@myself}>
              <%= result.name %>
            </div>
          <% end %>
        <% end %>
      </div>
    </div>
    """
  end

  def handle_event("search", %{"value" => query}, socket) do
    results = search_items(query)
    {:noreply, assign(socket, query: query, results: results)}
  end

  def handle_event("select", %{"id" => id}, socket) do
    send(self(), {:item_selected, id})
    {:noreply, socket}
  end

  defp search_items(query) do
    # 実際の検索ロジック
    []
  end
end
```

### コンポーネントの使用

```elixir
def render(assigns) do
  ~H"""
  <div>
    <.live_component
      module={MyAppWeb.SearchComponent}
      id="search"
    />
  </div>
  """
end

def handle_info({:item_selected, id}, socket) do
  # 選択されたアイテムの処理
  {:noreply, socket}
end
```

## ファイルアップロード

```elixir
defmodule MyAppWeb.UploadLive do
  use MyAppWeb, :live_view

  def mount(_params, _session, socket) do
    socket =
      socket
      |> assign(:uploaded_files, [])
      |> allow_upload(:avatar,
        accept: ~w(.jpg .jpeg .png),
        max_entries: 1,
        max_file_size: 5_000_000
      )

    {:ok, socket}
  end

  def render(assigns) do
    ~H"""
    <div>
      <form phx-submit="save" phx-change="validate">
        <.live_file_input upload={@uploads.avatar} />

        <button type="submit">Upload</button>
      </form>

      <%= for entry <- @uploads.avatar.entries do %>
        <div>
          <.live_img_preview entry={entry} />
          <progress value={entry.progress} max="100"><%= entry.progress %>%</progress>
          <button phx-click="cancel-upload" phx-value-ref={entry.ref}>Cancel</button>
        </div>
      <% end %>

      <%= for file <- @uploaded_files do %>
        <img src={file} />
      <% end %>
    </div>
    """
  end

  def handle_event("validate", _params, socket) do
    {:noreply, socket}
  end

  def handle_event("save", _params, socket) do
    uploaded_files =
      consume_uploaded_entries(socket, :avatar, fn %{path: path}, entry ->
        dest = Path.join("priv/static/uploads", entry.client_name)
        File.cp!(path, dest)
        {:ok, "/uploads/#{entry.client_name}"}
      end)

    {:noreply, update(socket, :uploaded_files, &(&1 ++ uploaded_files))}
  end

  def handle_event("cancel-upload", %{"ref" => ref}, socket) do
    {:noreply, cancel_upload(socket, :avatar, ref)}
  end
end
```

## パフォーマンス最適化

### Temporary assigns

```elixir
def mount(_params, _session, socket) do
  socket =
    socket
    |> assign(:items, load_items())
    |> assign(:page_title, "Items")

  # itemsは一度だけ送信され、以降はメモリに保持されない
  {:ok, socket, temporary_assigns: [items: []]}
end
```

### Stream（大量データの効率的な処理）

```elixir
def mount(_params, _session, socket) do
  socket =
    socket
    |> stream(:items, load_items())

  {:ok, socket}
end

def render(assigns) do
  ~H"""
  <div id="items" phx-update="stream">
    <%= for {id, item} <- @streams.items do %>
      <div id={id}>
        <%= item.name %>
      </div>
    <% end %>
  </div>
  """
end

# 新しいアイテムを追加
def handle_event("add", %{"item" => item_params}, socket) do
  {:ok, item} = create_item(item_params)
  {:noreply, stream_insert(socket, :items, item, at: 0)}
end

# アイテムを削除
def handle_event("delete", %{"id" => id}, socket) do
  {:noreply, stream_delete(socket, :items, id)}
end
```

### Debouncing（イベント頻度制御）

```elixir
def render(assigns) do
  ~H"""
  <input
    type="text"
    phx-keyup="search"
    phx-debounce="500"
    placeholder="Search..."
  />
  """
end
```

## JavaScript Hooks（カスタムクライアント処理）

```javascript
// assets/js/app.js
let Hooks = {}

Hooks.ScrollToTop = {
  mounted() {
    this.el.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }
}

let liveSocket = new LiveSocket("/live", Socket, {
  params: {_csrf_token: csrfToken},
  hooks: Hooks
})
```

```elixir
def render(assigns) do
  ~H"""
  <button id="scroll-top" phx-hook="ScrollToTop">
    Scroll to Top
  </button>
  """
end
```

## テスト

```elixir
# test/my_app_web/live/counter_live_test.exs
defmodule MyAppWeb.CounterLiveTest do
  use MyAppWeb.ConnCase
  import Phoenix.LiveViewTest

  test "increments counter", %{conn: conn} do
    {:ok, view, html} = live(conn, "/counter")

    assert html =~ "Counter: 0"

    view
    |> element("button", "+")
    |> render_click()

    assert render(view) =~ "Counter: 1"
  end

  test "decrements counter", %{conn: conn} do
    {:ok, view, _html} = live(conn, "/counter")

    view
    |> element("button", "-")
    |> render_click()

    assert render(view) =~ "Counter: -1"
  end
end
```

## まとめ

Phoenix LiveViewの基本から実践的な実装パターンまで解説しました。

### キーポイント

- **サーバーサイドレンダリング**: JavaScriptなしでリアルタイムUI
- **WebSocket**: 効率的な双方向通信
- **Elixir/Erlang VM**: 高い並行処理性能
- **開発者体験**: シンプルなAPI、強力な機能

### ベストプラクティス

1. **Temporary assigns**: 大量データの効率的な管理
2. **Stream**: リスト更新の最適化
3. **Debouncing**: 不要なイベントの抑制
4. **LiveComponent**: コンポーネントの再利用
5. **PubSub**: リアルタイム通信の実装

Phoenix LiveViewで、高パフォーマンスなリアルタイムWebアプリケーションを構築しましょう。

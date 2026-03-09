---
title: "Vim/Neovim入門2026 — エンジニア必須のテキストエディタ"
description: "Vim/Neovimの基本操作から実践的なカスタマイズまで。モード、移動、編集コマンド、Neovimの特徴とLua設定、おすすめプラグイン、VS Code Vim拡張との比較を徹底解説。Lazy.nvimやTreesitter、LSP設定の実例付きです。"
pubDate: "2026-02-05"
tags: ["Vim", "Neovim", "エディタ", "開発環境", "効率化", "プログラミング"]
heroImage: '../../assets/thumbnails/vim-neovim-guide-2026.jpg'
---
## Vimとは

Vimは1991年にリリースされたテキストエディタで、30年以上経った今でも多くのエンジニアに愛用されています。

### なぜVimを学ぶべきか

- **どこでも使える**: Linux/Mac/Windowsすべてで動作、サーバーにも標準搭載
- **高速**: マウス不要、キーボードだけで完結
- **拡張性**: プラグインで無限にカスタマイズ可能
- **生涯使える**: 30年以上前のコマンドが今でも通用する

### Vim vs Neovim

**Neovim**はVimのフォークで、モダンな機能を追加したバージョンです。

| 機能 | Vim | Neovim |
|------|-----|--------|
| 基本操作 | 同じ | 同じ |
| 設定ファイル | .vimrc | init.vim / init.lua |
| プラグイン | VimScript | VimScript + Lua |
| LSP | 要プラグイン | ネイティブサポート |
| 非同期処理 | あり | より強力 |
| UI | 基本的 | より柔軟 |

2026年現在、**新しく始めるならNeovim一択**です。

## インストール

### Neovimのインストール

**Mac**
```bash
brew install neovim
```

**Ubuntu/Debian**
```bash
sudo apt install neovim
```

**Windows**
```bash
winget install Neovim.Neovim
```

### 起動方法

```bash
nvim filename.txt
```

## Vim基本操作

Vimには複数の「モード」があります。これが初心者の最大の関門ですが、慣れると非常に効率的です。

### モード

**ノーマルモード（デフォルト）**
- カーソル移動、削除、コピー等
- Escキーで常に戻れる

**インサートモード（挿入）**
- テキスト入力
- `i`で入入る

**ビジュアルモード（選択）**
- テキスト選択
- `v`で入る

**コマンドモード**
- ファイル保存、終了等
- `:`で入る

### 基本的な流れ

1. `nvim file.txt`でファイルを開く（ノーマルモード）
2. `i`でインサートモードに入る
3. テキストを入力
4. `Esc`でノーマルモードに戻る
5. `:w`で保存
6. `:q`で終了

または`:wq`で保存して終了。

### 終了コマンド

- `:q` - 終了
- `:q!` - 保存せず強制終了
- `:w` - 保存
- `:wq` または `ZZ` - 保存して終了

## カーソル移動

Vimではマウスではなくキーボードでカーソルを移動します。

### 基本移動

```
h - 左
j - 下
k - 上
l - 右
```

矢印キーも使えますが、ホームポジションから手を動かさなくて済むhkjlの方が速いです。

### 単語移動

```
w - 次の単語の先頭
b - 前の単語の先頭
e - 次の単語の末尾
```

### 行内移動

```
0 - 行頭
^ - 行の最初の非空白文字
$ - 行末
```

### ファイル内移動

```
gg - ファイルの先頭
G - ファイルの末尾
10G - 10行目
Ctrl-u - 半画面上にスクロール
Ctrl-d - 半画面下にスクロール
Ctrl-f - 1画面下にスクロール（Forward）
Ctrl-b - 1画面上にスクロール（Backward）
```

### 検索移動

```
/pattern - 前方検索
?pattern - 後方検索
n - 次の検索結果
N - 前の検索結果
* - カーソル下の単語を前方検索
# - カーソル下の単語を後方検索
```

## 編集コマンド

### 挿入

```
i - カーソルの前に挿入
a - カーソルの後に挿入
I - 行頭に挿入
A - 行末に挿入
o - 下に新しい行を作成して挿入
O - 上に新しい行を作成して挿入
```

### 削除

```
x - 1文字削除
dd - 1行削除
dw - 単語を削除
d$ - カーソルから行末まで削除
d0 - カーソルから行頭まで削除
```

### コピー&ペースト

```
yy - 1行コピー（yank）
yw - 単語をコピー
y$ - カーソルから行末までコピー
p - カーソルの後にペースト
P - カーソルの前にペースト
```

### 変更

```
r - 1文字置換
cw - 単語を変更（削除して挿入モード）
cc - 行を変更
C - カーソルから行末まで変更
s - 文字を削除して挿入モード
S - 行を削除して挿入モード
```

### 取り消し・やり直し

```
u - 取り消し（Undo）
Ctrl-r - やり直し（Redo）
. - 直前のコマンドを繰り返し
```

## 実践的なコマンド集

### コメントアウト

```
# 5行をコメントアウト（#を追加）
Ctrl-v → jjjj → I → # → Esc

# コメント解除
Ctrl-v → jjjj → x
```

### インデント

```
>> - 行を右にインデント
<< - 行を左にインデント
== - 行を自動インデント
gg=G - ファイル全体を自動インデント
```

### 複数行編集

```
Ctrl-v - ビジュアルブロックモード
j/k - 複数行選択
I - 挿入
Esc - 全行に適用
```

### 検索置換

```
:%s/old/new/g - ファイル全体で置換
:%s/old/new/gc - 確認しながら置換
:10,20s/old/new/g - 10〜20行で置換
```

### マクロ

繰り返し作業を自動化できます。

```
qa - マクロ記録開始（aレジスタに保存）
（操作を実行）
q - 記録終了
@a - マクロ実行
10@a - マクロを10回実行
```

**例: 各行の先頭に番号を追加**

```
qa      # 記録開始
I       # 行頭に挿入
1.      # "1. "を入力
Esc     # ノーマルモードに戻る
j       # 下の行へ
q       # 記録終了

10@a    # 10行に適用
```

## Neovimの特徴とLua設定

Neovimの最大の特徴は**Luaで設定できる**ことです。

### 設定ファイルの場所

```
~/.config/nvim/init.lua
```

### 基本設定（init.lua）

```lua
-- 行番号を表示
vim.opt.number = true
vim.opt.relativenumber = true

-- タブ設定
vim.opt.tabstop = 2
vim.opt.shiftwidth = 2
vim.opt.expandtab = true

-- 検索設定
vim.opt.ignorecase = true
vim.opt.smartcase = true
vim.opt.hlsearch = true
vim.opt.incsearch = true

-- 見た目
vim.opt.termguicolors = true
vim.opt.cursorline = true
vim.opt.signcolumn = "yes"

-- クリップボード連携
vim.opt.clipboard = "unnamedplus"

-- キーマップ
vim.g.mapleader = " "  -- Spaceをリーダーキーに

-- Esc2回で検索ハイライトを消す
vim.keymap.set("n", "<Esc><Esc>", ":nohlsearch<CR>", { silent = true })

-- 保存
vim.keymap.set("n", "<leader>w", ":w<CR>")

-- 分割ウィンドウ移動
vim.keymap.set("n", "<C-h>", "<C-w>h")
vim.keymap.set("n", "<C-j>", "<C-w>j")
vim.keymap.set("n", "<C-k>", "<C-w>k")
vim.keymap.set("n", "<C-l>", "<C-w>l")
```

### プラグインマネージャー: lazy.nvim

```lua
-- ~/.config/nvim/init.lua

-- lazy.nvimのブートストラップ
local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.loop.fs_stat(lazypath) then
  vim.fn.system({
    "git",
    "clone",
    "--filter=blob:none",
    "https://github.com/folke/lazy.nvim.git",
    "--branch=stable",
    lazypath,
  })
end
vim.opt.rtp:prepend(lazypath)

-- プラグイン設定
require("lazy").setup({
  -- ここにプラグインを追加
})
```

## おすすめプラグイン

### Telescope（ファジーファインダー）

ファイル検索、grep検索が超高速にできます。

```lua
{
  "nvim-telescope/telescope.nvim",
  dependencies = { "nvim-lua/plenary.nvim" },
  config = function()
    local builtin = require("telescope.builtin")
    vim.keymap.set("n", "<leader>ff", builtin.find_files)
    vim.keymap.set("n", "<leader>fg", builtin.live_grep)
    vim.keymap.set("n", "<leader>fb", builtin.buffers)
  end,
}
```

**使い方**
- `Space` + `ff` - ファイル検索
- `Space` + `fg` - grep検索
- `Space` + `fb` - バッファ一覧

### Treesitter（シンタックスハイライト）

コードの構文を理解して、正確なシンタックスハイライトを提供します。

```lua
{
  "nvim-treesitter/nvim-treesitter",
  build = ":TSUpdate",
  config = function()
    require("nvim-treesitter.configs").setup({
      ensure_installed = { "lua", "javascript", "typescript", "python", "rust" },
      highlight = { enable = true },
      indent = { enable = true },
    })
  end,
}
```

### LSP（Language Server Protocol）

コード補完、エラーチェック、定義ジャンプ等が使えます。

```lua
{
  "neovim/nvim-lspconfig",
  dependencies = {
    "williamboman/mason.nvim",
    "williamboman/mason-lspconfig.nvim",
  },
  config = function()
    require("mason").setup()
    require("mason-lspconfig").setup({
      ensure_installed = { "ts_ls", "lua_ls", "pyright" },
    })

    local lspconfig = require("lspconfig")
    lspconfig.ts_ls.setup({})
    lspconfig.lua_ls.setup({})
    lspconfig.pyright.setup({})

    -- キーマップ
    vim.keymap.set("n", "gd", vim.lsp.buf.definition)
    vim.keymap.set("n", "K", vim.lsp.buf.hover)
    vim.keymap.set("n", "<leader>rn", vim.lsp.buf.rename)
  end,
}
```

### nvim-cmp（補完）

強力なコード補完を提供します。

```lua
{
  "hrsh7th/nvim-cmp",
  dependencies = {
    "hrsh7th/cmp-nvim-lsp",
    "hrsh7th/cmp-buffer",
    "hrsh7th/cmp-path",
    "L3MON4D3/LuaSnip",
  },
  config = function()
    local cmp = require("cmp")
    cmp.setup({
      snippet = {
        expand = function(args)
          require("luasnip").lsp_expand(args.body)
        end,
      },
      mapping = cmp.mapping.preset.insert({
        ["<C-Space>"] = cmp.mapping.complete(),
        ["<CR>"] = cmp.mapping.confirm({ select = true }),
      }),
      sources = {
        { name = "nvim_lsp" },
        { name = "buffer" },
        { name = "path" },
      },
    })
  end,
}
```

### nvim-tree（ファイルエクスプローラー）

サイドバーにファイルツリーを表示します。

```lua
{
  "nvim-tree/nvim-tree.lua",
  config = function()
    require("nvim-tree").setup()
    vim.keymap.set("n", "<leader>e", ":NvimTreeToggle<CR>")
  end,
}
```

### その他おすすめプラグイン

- **Comment.nvim**: コメントアウトを簡単に
- **gitsigns.nvim**: Gitの変更を表示
- **lualine.nvim**: ステータスライン
- **tokyonight.nvim**: カラースキーム
- **indent-blankline.nvim**: インデントガイド
- **trouble.nvim**: エラー一覧表示

## VS Code Vim拡張との比較

### VS Code Vim拡張

**メリット**
- VS Codeの便利な機能をそのまま使える
- GUIで操作しやすい
- 学習コストが低い

**デメリット**
- Vimの全機能は使えない
- 動作が若干遅い
- リモート環境では使えない

### Neovim本体

**メリット**
- 完全なVim体験
- カスタマイズ性が無限
- 軽量で高速
- どこでも使える

**デメリット**
- 学習コストが高い
- 設定に時間がかかる
- デバッグ機能はVS Codeに劣る

### どちらを選ぶべきか

**VS Code Vim拡張がおすすめな人**
- VS Codeを主に使っている
- GUIが好き
- Vimの操作だけ覚えたい

**Neovim本体がおすすめな人**
- サーバーで作業することが多い
- カスタマイズが好き
- 完全にキーボードで完結したい

**両方使う（ハイブリッド）**

実際には両方使うのがベストです。

- ローカルの大きなプロジェクト: VS Code + Vim拡張
- サーバー作業: Neovim
- 小さなファイル編集: Neovim

## まとめ

Vimは学習コストが高いですが、一度習得すれば一生使えるスキルです。

### 学習ロードマップ

**1週目: 基本操作**
- モードの理解
- 移動（hjkl, w, b, 0, $）
- 挿入（i, a, o）
- 保存・終了

**2週目: 編集コマンド**
- 削除（dd, dw, x）
- コピー&ペースト（yy, p）
- 取り消し（u, Ctrl-r）
- 検索置換（/pattern, :%s///)

**3週目: 効率化**
- ビジュアルモード
- マクロ
- 分割ウィンドウ
- バッファ操作

**4週目: Neovim設定**
- init.lua作成
- プラグインインストール
- LSP設定
- カスタムキーマップ

### 練習方法

- `vimtutor` - Vim公式チュートリアル
- 日常の作業をVimで行う
- VS Code Vim拡張から始めるのもあり

Vimをマスターすれば、コーディング速度が飛躍的に向上します。頑張ってください。

---
title: "uv完全ガイド: Rustで作られた超高速Pythonパッケージマネージャー"
description: "uvはpipの10〜100倍高速なPythonパッケージマネージャーです。インストール方法、仮想環境管理、pyproject.toml対応、Pythonバージョン管理まで実践的に解説します。Python・uv・パッケージ管理に関する実践情報。"
pubDate: "2026-02-24"
updatedDate: "2026-02-24"
tags: ["Python", "uv", "パッケージ管理", "Rust", "開発環境", "ツール"]
---
Pythonのパッケージ管理はこれまで`pip`や`poetry`、`pipenv`など様々なツールが使われてきましたが、2024年から急速に普及している**uv**が開発者の間で大きな話題になっています。Rustで書かれたuvはpipの**10〜100倍**の速度を実現し、仮想環境管理、Pythonバージョン管理まで一つのツールで完結させることができます。本記事では、uvの基本から実践的な使い方まで徹底解説します。

## uvとは何か

uvは[Astral](https://astral.sh/)が開発したPython向けの超高速パッケージマネージャーです。同社が開発した高速Pythonリンター[ruff](https://docs.astral.sh/ruff/)と同様に、Rustで実装されることで圧倒的なパフォーマンスを実現しています。

### uvの主な特徴

- **超高速インストール**: pipより10〜100倍高速
- **pip互換**: `pip install`コマンドの代替として動作
- **仮想環境管理**: `venv`の代替として使用可能
- **Pythonバージョン管理**: `pyenv`のような機能も内蔵
- **pyproject.toml完全対応**: モダンなPythonプロジェクト構成に対応
- **ロックファイル生成**: 再現可能な環境を保証
- **ワークスペース対応**: モノレポ構成をサポート

## インストール

### macOS / Linux

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Windows (PowerShell)

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### pipからインストール

```bash
pip install uv
```

### インストール確認

```bash
uv --version
# uv 0.5.x (例)
```

## pipの代替として使う

uvはpipのドロップイン代替として設計されています。既存のワークフローをそのまま活用できます。

### パッケージインストール

```bash
# pip の代わりに uv pip を使う
uv pip install requests
uv pip install "fastapi[all]"
uv pip install -r requirements.txt

# 開発用依存関係
uv pip install pytest --dev
```

### パッケージのアンインストール

```bash
uv pip uninstall requests
```

### インストール済みパッケージ確認

```bash
uv pip list
uv pip show requests
```

### パッケージのアップグレード

```bash
uv pip install --upgrade requests
uv pip install --upgrade-package requests -r requirements.txt
```

## 仮想環境の管理

### 仮想環境の作成

```bash
# カレントディレクトリに .venv を作成
uv venv

# 名前を指定して作成
uv venv myenv

# Pythonバージョンを指定
uv venv --python 3.12
uv venv --python 3.11.5
```

### 仮想環境の有効化

```bash
# macOS / Linux
source .venv/bin/activate

# Windows
.venv\Scripts\activate
```

### uvを使ったワンライナー実行

uvは自動的に仮想環境を検出・使用します。明示的に有効化しなくても動作します。

```bash
# .venv が存在する場合、自動的に使用される
uv pip install fastapi
uv run python main.py
```

## プロジェクト管理（モダンなワークフロー）

uvはpyproject.tomlを使ったプロジェクト管理もサポートしています。

### 新規プロジェクトの作成

```bash
uv init myproject
cd myproject
```

作成されるファイル構成:

```
myproject/
├── pyproject.toml
├── README.md
├── src/
│   └── myproject/
│       └── __init__.py
└── .python-version
```

生成される`pyproject.toml`:

```toml
[project]
name = "myproject"
version = "0.1.0"
description = "Add your description here"
readme = "README.md"
requires-python = ">=3.12"
dependencies = []

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

### 依存関係の追加

```bash
# 本番依存関係を追加
uv add fastapi
uv add "sqlalchemy>=2.0"
uv add httpx pydantic

# 開発用依存関係を追加
uv add --dev pytest pytest-asyncio
uv add --dev ruff mypy

# オプション依存関係を追加
uv add "fastapi[all]"
```

依存関係を追加すると`pyproject.toml`が自動更新されます:

```toml
[project]
dependencies = [
  "fastapi>=0.115.0",
  "sqlalchemy>=2.0",
  "httpx>=0.27.0",
  "pydantic>=2.0",
]

[dependency-groups]
dev = [
  "pytest>=8.0",
  "pytest-asyncio>=0.24",
  "ruff>=0.7.0",
  "mypy>=1.11",
]
```

### 依存関係の削除

```bash
uv remove requests
uv remove --dev pytest
```

### ロックファイルの生成と同期

```bash
# uv.lock を生成（または更新）
uv lock

# ロックファイルから環境を同期
uv sync

# 開発用依存関係を除いて同期
uv sync --no-dev

# 特定のグループのみ同期
uv sync --group dev
```

`uv.lock`はgitにコミットすることで、チーム全員が同一の環境を再現できます。

## Pythonバージョン管理

uvはPythonのインストールと管理もサポートしています。`pyenv`のような別ツールが不要になります。

### 利用可能なPythonバージョン確認

```bash
uv python list
```

### Pythonのインストール

```bash
uv python install 3.12
uv python install 3.11 3.12 3.13

# 最新バージョンをインストール
uv python install
```

### Pythonバージョンの固定

```bash
# プロジェクトのPythonバージョンを固定（.python-versionファイルが作成される）
uv python pin 3.12
```

### Pythonバージョンを指定して実行

```bash
uv run --python 3.11 python --version
uv venv --python 3.12 .venv
```

## スクリプトの実行

### uvを使ったスクリプト実行

```bash
# 仮想環境を自動検出してスクリプトを実行
uv run python main.py
uv run python -m pytest
uv run fastapi dev

# 依存関係を指定してスクリプト実行
uv run --with requests python fetch_data.py
```

### インラインスクリプトメタデータ対応

PEP 723に従ったインラインメタデータをサポートしています:

```python
#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.12"
# dependencies = [
#   "requests>=2.31",
#   "rich>=13.0",
# ]
# ///

import requests
from rich import print

response = requests.get("https://api.github.com/zen")
print(f"[bold green]{response.text}[/bold green]")
```

このスクリプトを実行するだけで、依存関係が自動的にインストールされます:

```bash
uv run script.py
# または
chmod +x script.py
./script.py
```

## ツールの管理

uvはCLIツールのインストールと管理も対応しています。`pipx`の代替として使用できます。

### ツールのインストールと実行

```bash
# ツールを一時的に実行（インストール不要）
uv tool run ruff check .
uvx ruff check .  # uvx は uv tool run の短縮形

# ツールをグローバルにインストール
uv tool install ruff
uv tool install black
uv tool install httpie

# インストール済みツールの確認
uv tool list

# ツールのアップデート
uv tool upgrade ruff
uv tool upgrade --all
```

## CI/CDでの活用

GitHub Actionsでuvを使う例:

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install uv
        uses: astral-sh/setup-uv@v4
        with:
          version: "latest"

      - name: Set up Python
        run: uv python install

      - name: Install dependencies
        run: uv sync --all-extras --dev

      - name: Run tests
        run: uv run pytest

      - name: Run linter
        run: uv run ruff check .

      - name: Run type checker
        run: uv run mypy src/
```

## pipとのパフォーマンス比較

実際の計測結果（packages数が多いプロジェクトでの比較）:

| ツール | インストール時間 |
|--------|----------------|
| pip | 約45秒 |
| pip + cache | 約12秒 |
| poetry | 約30秒 |
| uv | 約1.5秒 |
| uv + cache | 約0.2秒 |

uvのキャッシュ機能により、同一パッケージは2回目以降ほぼ瞬時にインストールが完了します。

## 既存プロジェクトへの移行

### pipからuvへの移行

```bash
# requirements.txt がある場合
uv init
uv pip install -r requirements.txt
uv pip freeze > requirements.txt  # 必要に応じて

# または pyproject.toml に移行
uv init
cat requirements.txt | xargs uv add
```

### poetryからuvへの移行

```bash
# pyproject.toml はそのまま使えることが多い
# poetry.lock → uv.lock への変換
uv lock

# 依存関係の同期
uv sync
```

### pipenvからuvへの移行

```bash
# Pipfile から pyproject.toml に変換
uv init
# Pipfile の [packages] セクションのパッケージを手動で追加
uv add requests flask sqlalchemy
uv add --dev pytest black
```

## uvの設定

`pyproject.toml`または`uv.toml`で設定をカスタマイズできます:

```toml
# uv.toml または pyproject.toml の [tool.uv] セクション
[tool.uv]
# パッケージキャッシュの場所
cache-dir = "~/.cache/uv"

# デフォルトのPythonバージョン
python = "3.12"

# インデックス設定
index-url = "https://pypi.org/simple"

# プライベートリポジトリの追加
[[tool.uv.index]]
name = "company-private"
url = "https://private.company.com/simple/"
```

## よくある使用パターン

### FastAPIプロジェクトの素早いセットアップ

```bash
uv init fastapi-project
cd fastapi-project
uv add "fastapi[all]" sqlalchemy alembic pydantic-settings
uv add --dev pytest httpx pytest-asyncio ruff mypy
uv run fastapi dev src/main.py
```

### データサイエンスプロジェクト

```bash
uv init data-analysis
cd data-analysis
uv add numpy pandas matplotlib seaborn scikit-learn jupyter
uv run jupyter lab
```

### CLIツールの開発

```bash
uv init mycli
cd mycli
uv add typer rich click
uv add --dev pytest
# エントリーポイントを pyproject.toml に設定
uv run mycli --help
```

## まとめ

uvはPythonエコシステムに革命をもたらすツールです。その主なメリットをまとめます:

1. **圧倒的な速度**: Rustで実装されたuv はpipの10〜100倍高速で、CI/CD時間を大幅に短縮できます
2. **一つで完結**: pip、venv、pyenv、pipxの機能をuvひとつで代替できます
3. **pip互換**: 既存のワークフローをほぼそのまま移行できます
4. **モダンなPythonサポート**: pyproject.toml、ロックファイル、ワークスペースを標準でサポートします
5. **活発な開発**: Astralチームによる継続的な改善と活発なコミュニティがあります

2026年現在、uvはPythonプロジェクトのデファクトスタンダードになりつつあります。新規プロジェクトはuvで始め、既存プロジェクトも段階的に移行することを強くお勧めします。

## 参考リンク

- [uv公式ドキュメント](https://docs.astral.sh/uv/)
- [uv GitHubリポジトリ](https://github.com/astral-sh/uv)
- [Astral公式サイト](https://astral.sh/)
- [PEP 723 – Inline script metadata](https://peps.python.org/pep-0723/)

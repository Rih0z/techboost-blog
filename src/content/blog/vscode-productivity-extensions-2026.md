---
title: "VS Code生産性向上エクステンション厳選2026"
description: "2026年版VS Codeの生産性向上に直結するエクステンション厳選ガイド。AI系・フロントエンド系・バックエンド系・Git系を網羅し、settings.jsonやkeybindingsの設定例も掲載します。"
pubDate: "2026-03-06"
tags: ['開発ツール', 'プログラミング', 'career', 'TypeScript']
heroImage: '../../assets/thumbnails/vscode-productivity-extensions-2026.jpg'
---

VS Codeの拡張機能は数万種類あり、どれを選ぶべきか迷うエンジニアは多い。闇雲にインストールすると起動速度が低下し、逆に生産性が下がる場合もある。

本記事では、2026年時点で本当に生産性を向上させるエクステンションを厳選し、カテゴリ別に紹介する。各エクステンションのsettings.json設定例も掲載しているので、インストール後すぐに最適な状態で使い始められる。

---

### 1. 必須10選（全エンジニア共通）

まずはジャンルを問わず、全てのエンジニアに推奨する10のエクステンションを紹介する。

#### 1-1. Prettier - Code formatter

コードの自動整形ツール。チームでスタイルを統一するために不可欠だ。

```json
// settings.json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.formatOnPaste": false,
  "prettier.semi": true,
  "prettier.singleQuote": true,
  "prettier.trailingComma": "all",
  "prettier.printWidth": 100,
  "prettier.tabWidth": 2
}
```

出典: Prettier公式 https://prettier.io/

#### 1-2. ESLint

JavaScript/TypeScriptの静的解析ツール。Prettierと組み合わせて使うのが定番だ。

```json
// settings.json
{
  "eslint.enable": true,
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.useFlatConfig": true
}
```

出典: ESLint公式 https://eslint.org/

#### 1-3. EditorConfig for VS Code

プロジェクト間で一貫したコーディングスタイルを維持する。`.editorconfig` ファイルの設定を自動適用する。

```ini
## .editorconfig
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false

[Makefile]
indent_style = tab
```

出典: EditorConfig公式 https://editorconfig.org/

#### 1-4. GitLens

Gitの情報をエディタ内で可視化する。blame表示、コミット履歴の閲覧、ブランチ比較が直感的に行える。

```json
// settings.json
{
  "gitlens.currentLine.enabled": true,
  "gitlens.currentLine.format": "${author}, ${agoOrDate} - ${message}",
  "gitlens.hovers.currentLine.over": "line",
  "gitlens.codeLens.enabled": true,
  "gitlens.codeLens.authors.enabled": true,
  "gitlens.codeLens.recentChange.enabled": true,
  "gitlens.views.repositories.branches.layout": "tree"
}
```

出典: GitLens公式 https://gitlens.amod.io/

#### 1-5. Error Lens

エラーや警告をインライン表示する。Problems パネルを開かなくてもコード上で直接確認できるため、問題の発見が圧倒的に速くなる。

```json
// settings.json
{
  "errorLens.enabled": true,
  "errorLens.enabledDiagnosticLevels": ["error", "warning", "info"],
  "errorLens.messageTemplate": "$message ($source - $code)",
  "errorLens.delay": 500,
  "errorLens.fontStyleItalic": true
}
```

#### 1-6. Todo Tree

コード中の`TODO`、`FIXME`、`HACK`などのコメントを一覧表示する。放置されたタスクの管理に役立つ。

```json
// settings.json
{
  "todo-tree.general.tags": [
    "TODO",
    "FIXME",
    "HACK",
    "BUG",
    "NOTE",
    "REVIEW",
    "PERF"
  ],
  "todo-tree.highlights.defaultHighlight": {
    "icon": "alert",
    "type": "text",
    "foreground": "#ffffff",
    "background": "#ff8c00"
  },
  "todo-tree.highlights.customHighlight": {
    "FIXME": {
      "icon": "flame",
      "background": "#ff0000"
    },
    "BUG": {
      "icon": "bug",
      "background": "#ff0000"
    },
    "HACK": {
      "icon": "tools",
      "background": "#ffa500"
    }
  }
}
```

#### 1-7. Path Intellisense

ファイルパスの自動補完。import文やrequire文のパス入力が格段に楽になる。

```json
// settings.json
{
  "path-intellisense.mappings": {
    "@": "${workspaceFolder}/src",
    "~": "${workspaceFolder}/src"
  },
  "path-intellisense.extensionOnImport": true,
  "path-intellisense.showHiddenFiles": false
}
```

#### 1-8. Auto Rename Tag

HTMLやJSXの開始タグを変更すると、対応する閉じタグも自動で更新される。フロントエンド開発の時短に直結する。

```json
// settings.json
{
  "auto-rename-tag.activationOnLanguage": [
    "html",
    "xml",
    "php",
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact",
    "vue",
    "svelte"
  ]
}
```

#### 1-9. Bracket Pair Colorization（ビルトイン）

VS Codeにビルトインされている括弧の色分け機能。拡張機能のインストールは不要だが、設定で有効化する必要がある。

```json
// settings.json
{
  "editor.bracketPairColorization.enabled": true,
  "editor.bracketPairColorization.independentColorPoolPerBracketType": true,
  "editor.guides.bracketPairs": "active",
  "editor.guides.bracketPairsHorizontal": "active"
}
```

#### 1-10. Better Comments

コメントの種類（TODO, ?, !, etc.）に応じて色分けする。コードの意図や注意点が一目で分かるようになる。

```json
// settings.json
{
  "better-comments.tags": [
    {
      "tag": "!",
      "color": "#FF2D00",
      "strikethrough": false,
      "underline": false,
      "backgroundColor": "transparent",
      "bold": true,
      "italic": false
    },
    {
      "tag": "?",
      "color": "#3498DB",
      "strikethrough": false,
      "underline": false,
      "backgroundColor": "transparent",
      "bold": false,
      "italic": false
    },
    {
      "tag": "//",
      "color": "#474747",
      "strikethrough": true,
      "underline": false,
      "backgroundColor": "transparent",
      "bold": false,
      "italic": false
    },
    {
      "tag": "todo",
      "color": "#FF8C00",
      "strikethrough": false,
      "underline": false,
      "backgroundColor": "transparent",
      "bold": false,
      "italic": false
    }
  ]
}
```

---

### 2. AI系エクステンション

2026年のVS Code開発において、AIアシスタントは必須ツールになっている。主要な3つのAIエクステンションを比較する。

#### 2-1. GitHub Copilot

Microsoftが提供する最も広く使われているAIコーディングアシスタント。コード補完、チャット、インライン提案に対応している。

```json
// settings.json
{
  "github.copilot.enable": {
    "*": true,
    "yaml": true,
    "plaintext": false,
    "markdown": true,
    "scminput": false
  },
  "github.copilot.editor.enableAutoCompletions": true,
  "github.copilot.chat.localeOverride": "ja",
  "editor.inlineSuggest.enabled": true
}
```

```json
// keybindings.json
[
  {
    "key": "ctrl+shift+i",
    "command": "github.copilot.chat.open"
  },
  {
    "key": "alt+\\",
    "command": "editor.action.inlineSuggest.trigger"
  },
  {
    "key": "tab",
    "command": "editor.action.inlineSuggest.commit",
    "when": "inlineSuggestionVisible && !editorHoverFocused && !editorTabMovesFocus && !suggestWidgetVisible"
  }
]
```

**料金**: Individual $10/月、Business $19/月/ユーザー

出典: GitHub Copilot公式 https://github.com/features/copilot

#### 2-2. Cody (Sourcegraph)

Sourcegraphが提供するAIコーディングアシスタント。コードベース全体のコンテキストを理解し、より精度の高い提案を行うのが特徴だ。

```json
// settings.json
{
  "cody.autocomplete.enabled": true,
  "cody.autocomplete.advanced.provider": "default",
  "cody.chat.preInstruction": "日本語で回答してください。TypeScriptのコードを生成する際はstrict modeを前提としてください。",
  "cody.codeActions.enabled": true,
  "cody.commandCodeLenses": true
}
```

**料金**: Free（月500回のオートコンプリート+月20回のチャット）、Pro $9/月（無制限）

出典: Cody公式 https://sourcegraph.com/cody

#### 2-3. Continue

オープンソースのAIコーディングアシスタント。自分で選んだAI API（Claude, GPT, Llama等）と連携できるのが最大の特徴だ。

```json
// settings.json -- Continue基本設定
{
  "continue.enableTabAutocomplete": true,
  "continue.telemetryEnabled": false
}
```

```json
// ~/.continue/config.json -- Continue詳細設定
{
  "models": [
    {
      "title": "Claude Sonnet 4",
      "provider": "anthropic",
      "model": "claude-sonnet-4-20250514",
      "apiKey": "YOUR_API_KEY"
    },
    {
      "title": "GPT-4o",
      "provider": "openai",
      "model": "gpt-4o",
      "apiKey": "YOUR_API_KEY"
    }
  ],
  "tabAutocompleteModel": {
    "title": "Claude Haiku",
    "provider": "anthropic",
    "model": "claude-haiku-4-20250514"
  },
  "customCommands": [
    {
      "name": "review",
      "prompt": "Review the selected code for bugs, security issues, and performance problems. Provide suggestions in Japanese.",
      "description": "コードレビュー"
    },
    {
      "name": "refactor",
      "prompt": "Refactor the selected code to improve readability and maintainability. Explain changes in Japanese.",
      "description": "リファクタリング"
    }
  ]
}
```

**料金**: 無料（APIキーは自前で用意）

出典: Continue公式 https://continue.dev/

#### AI系エクステンション比較表

| 機能 | GitHub Copilot | Cody | Continue |
|------|---------------|------|----------|
| コード補完 | 高精度 | 高精度 | API依存 |
| チャット | 対応 | 対応 | 対応 |
| コードベース理解 | リポジトリレベル | プロジェクト全体 | カスタマイズ可能 |
| モデル選択 | 固定 | 固定 | 自由 |
| オフライン | 不可 | 不可 | ローカルモデル可 |
| 料金 | $10-19/月 | 無料-$9/月 | 無料 |
| OSS | 非公開 | 公開 | 公開 |

---

### 3. フロントエンド系エクステンション

#### 3-1. Tailwind CSS IntelliSense

Tailwind CSSのクラス名の自動補完、プレビュー、lint機能を提供する。

```json
// settings.json
{
  "tailwindCSS.includeLanguages": {
    "typescriptreact": "html",
    "javascriptreact": "html"
  },
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cx\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ],
  "tailwindCSS.emmetCompletions": true,
  "editor.quickSuggestions": {
    "strings": "on"
  }
}
```

出典: Tailwind CSS IntelliSense https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss

#### 3-2. CSS Modules

CSS Modulesの自動補完とGo to Definitionを提供する。React/Next.jsでCSS Modulesを使っている場合に便利だ。

```json
// settings.json
{
  "cssModules.camelCase": true,
  "cssModules.hintGrep": ".module.css"
}
```

#### 3-3. Console Ninja

console.logの出力をエディタのインラインに直接表示する。ブラウザのDevToolsとエディタを行き来する必要がなくなり、デバッグが高速化する。

```json
// settings.json
{
  "console-ninja.featureSet": "Community",
  "console-ninja.toolsToEnableCoverageFor": [
    "vitest",
    "jest"
  ]
}
```

#### 3-4. i18n Ally

国際化（i18n）の管理ツール。翻訳キーのインライン表示、自動検出、翻訳の不足検出を行う。

```json
// settings.json
{
  "i18n-ally.localesPaths": ["src/locales"],
  "i18n-ally.keystyle": "nested",
  "i18n-ally.sourceLanguage": "ja",
  "i18n-ally.displayLanguage": "ja",
  "i18n-ally.framework": "react"
}
```

---

### 4. バックエンド系エクステンション

#### 4-1. REST Client

VS Code内でHTTPリクエストを送信できる。Postmanを開く必要がなくなる。`.http` ファイルにリクエストを定義し、チームで共有できる。

```
## api-test.http

#### 認証トークンの取得
## @name login
POST http://localhost:8080/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}

#### ユーザー一覧の取得（認証済み）
@authToken = {{login.response.body.token}}

GET http://localhost:8080/api/users
Authorization: Bearer {{authToken}}
Accept: application/json

#### ユーザーの作成
POST http://localhost:8080/api/users
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "name": "New User",
  "email": "newuser@example.com",
  "role": "member"
}

#### ヘルスチェック
GET http://localhost:8080/health
```

```json
// settings.json
{
  "rest-client.environmentVariables": {
    "$shared": {
      "baseUrl": "http://localhost:8080"
    },
    "development": {
      "baseUrl": "http://localhost:8080",
      "token": "dev-token-xxx"
    },
    "staging": {
      "baseUrl": "https://staging.example.com",
      "token": "staging-token-xxx"
    }
  },
  "rest-client.previewResponseInUntitledDocument": true,
  "rest-client.defaultHeaders": {
    "User-Agent": "vscode-restclient"
  }
}
```

出典: REST Client https://marketplace.visualstudio.com/items?itemName=humao.rest-client

#### 4-2. Thunder Client

GUIベースのAPI テストツール。Postmanライクなインターフェースで、コレクション管理や環境変数の設定が可能だ。

```json
// settings.json
{
  "thunder-client.saveToWorkspace": true,
  "thunder-client.workspaceRelativePath": ".thunder-client",
  "thunder-client.showActivityBarIcon": true
}
```

#### 4-3. Database Client (Weijan Chen)

VS Code内でデータベースに接続し、クエリの実行やテーブルの閲覧が行える。PostgreSQL、MySQL、SQLite、MongoDB等に対応している。

```json
// settings.json
{
  "database-client.autoCompletionTrigger": ".",
  "database-client.showFilter": true
}
```

#### 4-4. Docker

Docker公式のVS Code拡張。コンテナの管理、イメージのビルド、docker-compose.ymlの編集支援が統合されている。

```json
// settings.json
{
  "docker.containers.sortBy": "CreatedTime",
  "docker.containers.groupBy": "Compose Project Name",
  "docker.images.sortBy": "CreatedTime",
  "docker.showStartPage": false,
  "docker.languageserver.formatter.ignoreMultilineInstructions": true
}
```

出典: Docker VS Code Extension https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-docker

---

### 5. Git系エクステンション

#### 5-1. Git Graph

Gitのブランチ・コミット履歴をグラフで可視化する。ブランチの分岐・マージの状況が一目で分かる。

```json
// settings.json
{
  "git-graph.defaultColumnVisibility": {
    "Date": true,
    "Author": true,
    "Commit": true
  },
  "git-graph.graph.style": "angular",
  "git-graph.date.format": "ISO Date & Time"
}
```

#### 5-2. Conventional Commits

コミットメッセージをConventional Commits形式で入力するためのGUIを提供する。`feat:`, `fix:`, `chore:` 等のprefixを選択式で入力できる。

```json
// settings.json
{
  "conventionalCommits.scopes": [
    "api",
    "web",
    "db",
    "auth",
    "ci",
    "docs"
  ],
  "conventionalCommits.showNewVersionNotes": false,
  "conventionalCommits.lineBreak": "\\n"
}
```

出典: Conventional Commits仕様 https://www.conventionalcommits.org/

#### 5-3. Git History

ファイルやブランチのGit履歴を詳細に閲覧できる。特定のファイルの変更履歴を追跡するのに便利だ。

```json
// settings.json
{
  "gitHistory.showEditorTitleMenuBarIcons": true,
  "gitHistory.pageSize": 50
}
```

---

### 6. テスト・デバッグ系エクステンション

#### 6-1. Vitest

Vitestの公式VS Code拡張。テストの実行、デバッグ、カバレッジの表示がエディタ内で完結する。

```json
// settings.json
{
  "vitest.enable": true,
  "vitest.commandLine": "npx vitest",
  "vitest.include": ["**/*.{test,spec}.{ts,tsx,js,jsx}"],
  "vitest.exclude": ["**/node_modules/**", "**/dist/**"]
}
```

出典: Vitest VS Code Extension https://marketplace.visualstudio.com/items?itemName=vitest.explorer

#### 6-2. Test Explorer UI

テストフレームワークを問わず、テストの実行結果をツリービューで表示する。Jest、Vitest、Mocha、pytest等に対応している。

```json
// settings.json
{
  "testExplorer.useNativeTesting": true,
  "testExplorer.codeLens": true,
  "testExplorer.gutterDecoration": true
}
```

---

### 7. テーマ・UI系エクステンション

#### 7-1. One Dark Pro

Atom由来の人気カラーテーマ。長時間のコーディングでも目が疲れにくい配色だ。

```json
// settings.json
{
  "workbench.colorTheme": "One Dark Pro Darker",
  "oneDarkPro.bold": true,
  "oneDarkPro.italic": true,
  "oneDarkPro.vivid": true
}
```

#### 7-2. Material Icon Theme

ファイルアイコンを Material Design ベースのアイコンに変更する。ファイルの種類が一目で分かるようになる。

```json
// settings.json
{
  "workbench.iconTheme": "material-icon-theme",
  "material-icon-theme.folders.theme": "specific",
  "material-icon-theme.folders.color": "#42a5f5",
  "material-icon-theme.hidesExplorerArrows": false,
  "material-icon-theme.saturation": 1.0
}
```

---

### 8. 推奨settings.json完全版

ここまで紹介したエクステンションの設定をまとめた完全版のsettings.jsonを掲載する。

```json
// settings.json（完全版）
{
  // --- エディタ基本設定 ---
  "editor.fontSize": 14,
  "editor.fontFamily": "'JetBrains Mono', 'Fira Code', Menlo, Monaco, monospace",
  "editor.fontLigatures": true,
  "editor.lineHeight": 1.6,
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "editor.wordWrap": "on",
  "editor.minimap.enabled": false,
  "editor.cursorBlinking": "smooth",
  "editor.cursorSmoothCaretAnimation": "on",
  "editor.smoothScrolling": true,
  "editor.renderWhitespace": "boundary",
  "editor.linkedEditing": true,
  "editor.stickyScroll.enabled": true,

  // --- フォーマット ---
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },

  // --- Prettier ---
  "prettier.semi": true,
  "prettier.singleQuote": true,
  "prettier.trailingComma": "all",
  "prettier.printWidth": 100,
  "prettier.tabWidth": 2,

  // --- ESLint ---
  "eslint.enable": true,
  "eslint.useFlatConfig": true,

  // --- ブラケット ---
  "editor.bracketPairColorization.enabled": true,
  "editor.guides.bracketPairs": "active",

  // --- ファイル ---
  "files.autoSave": "onFocusChange",
  "files.trimTrailingWhitespace": true,
  "files.insertFinalNewline": true,
  "files.trimFinalNewlines": true,
  "files.exclude": {
    "**/.git": true,
    "**/node_modules": true,
    "**/dist": true,
    "**/.next": true
  },

  // --- ターミナル ---
  "terminal.integrated.fontSize": 13,
  "terminal.integrated.cursorBlinking": true,
  "terminal.integrated.copyOnSelection": true,
  "terminal.integrated.defaultProfile.osx": "zsh",
  "terminal.integrated.defaultProfile.linux": "bash",

  // --- Git ---
  "git.autofetch": true,
  "git.confirmSync": false,
  "git.enableSmartCommit": true,

  // --- 検索 ---
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/coverage": true,
    "**/.next": true,
    "**/package-lock.json": true
  },

  // --- ワークベンチ ---
  "workbench.colorTheme": "One Dark Pro Darker",
  "workbench.iconTheme": "material-icon-theme",
  "workbench.startupEditor": "none",
  "workbench.editor.enablePreview": false,
  "workbench.tree.indent": 16,

  // --- TypeScript ---
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.updateImportsOnFileMove.enabled": "always",
  "typescript.suggest.autoImports": true,
  "typescript.inlayHints.parameterNames.enabled": "literals",
  "typescript.inlayHints.variableTypes.enabled": true
}
```

---

### 9. 推奨keybindings.json完全版

効率的な操作のためのキーバインド設定を掲載する。

```json
// keybindings.json
[
  // --- ファイル操作 ---
  {
    "key": "cmd+p",
    "command": "workbench.action.quickOpen",
    "when": "!inQuickOpen"
  },
  {
    "key": "cmd+shift+p",
    "command": "workbench.action.showCommands"
  },

  // --- エディタ操作 ---
  {
    "key": "cmd+d",
    "command": "editor.action.addSelectionToNextFindMatch"
  },
  {
    "key": "cmd+shift+l",
    "command": "editor.action.selectHighlights"
  },
  {
    "key": "alt+up",
    "command": "editor.action.moveLinesUpAction",
    "when": "editorTextFocus && !editorReadonly"
  },
  {
    "key": "alt+down",
    "command": "editor.action.moveLinesDownAction",
    "when": "editorTextFocus && !editorReadonly"
  },
  {
    "key": "shift+alt+up",
    "command": "editor.action.copyLinesUpAction",
    "when": "editorTextFocus && !editorReadonly"
  },
  {
    "key": "shift+alt+down",
    "command": "editor.action.copyLinesDownAction",
    "when": "editorTextFocus && !editorReadonly"
  },

  // --- パネル操作 ---
  {
    "key": "cmd+b",
    "command": "workbench.action.toggleSidebarVisibility"
  },
  {
    "key": "cmd+j",
    "command": "workbench.action.togglePanel"
  },
  {
    "key": "cmd+\\",
    "command": "workbench.action.splitEditor"
  },

  // --- ターミナル ---
  {
    "key": "ctrl+`",
    "command": "workbench.action.terminal.toggleTerminal"
  },
  {
    "key": "ctrl+shift+`",
    "command": "workbench.action.terminal.new"
  },

  // --- Git操作 ---
  {
    "key": "cmd+shift+g",
    "command": "workbench.view.scm"
  },

  // --- コード操作 ---
  {
    "key": "f2",
    "command": "editor.action.rename",
    "when": "editorHasRenameProvider && editorTextFocus && !editorReadonly"
  },
  {
    "key": "f12",
    "command": "editor.action.revealDefinition",
    "when": "editorHasDefinitionProvider && editorTextFocus"
  },
  {
    "key": "shift+f12",
    "command": "editor.action.goToReferences",
    "when": "editorHasReferenceProvider && editorTextFocus"
  },
  {
    "key": "cmd+.",
    "command": "editor.action.quickFix",
    "when": "editorHasCodeActionsProvider && editorTextFocus && !editorReadonly"
  },

  // --- 検索・置換 ---
  {
    "key": "cmd+shift+h",
    "command": "workbench.action.replaceInFiles"
  },
  {
    "key": "cmd+shift+f",
    "command": "workbench.action.findInFiles"
  },

  // --- AI（Copilot） ---
  {
    "key": "ctrl+shift+i",
    "command": "github.copilot.chat.open"
  },

  // --- テスト ---
  {
    "key": "cmd+shift+t",
    "command": "testing.runAll"
  }
]
```

---

### 10. パフォーマンス最適化

エクステンションを入れすぎるとVS Codeの起動速度やレスポンスが低下する。以下の方法でパフォーマンスを維持しよう。

#### 10-1. 起動時間の測定

```
Developer: Startup Performance
```

コマンドパレットから上記を実行すると、VS Codeの起動にかかった時間と、各エクステンションの読み込み時間を確認できる。

#### 10-2. エクステンションの無効化

プロジェクトごとに不要なエクステンションを無効化する。ワークスペース単位での有効化・無効化が可能だ。

```
手順:
1. 拡張機能パネルを開く（Cmd+Shift+X）
2. 不要なエクステンションの歯車アイコンをクリック
3.「ワークスペースで無効にする」を選択
```

#### 10-3. プロファイル機能の活用

VS Codeのプロファイル機能を使うと、プロジェクトの種類に応じてエクステンションの組み合わせを切り替えられる。

```
推奨プロファイル:
- Frontend: Tailwind + React + Prettier + ESLint + Copilot
- Backend: REST Client + Docker + Database Client + ESLint + Copilot
- Writing: Markdown All in One + テーマ のみ
```

```json
// プロファイルの切替コマンド
// コマンドパレット > Profiles: Switch Profile
// または Cmd+K Cmd+P
```

出典: VS Code公式「Profiles」 https://code.visualstudio.com/docs/editor/profiles

#### 10-4. テレメトリの無効化

```json
// settings.json
{
  "telemetry.telemetryLevel": "off",
  "workbench.enableExperiments": false,
  "extensions.autoCheckUpdates": true,
  "extensions.autoUpdate": "onlyEnabledExtensions"
}
```

---

### 11. チームでの設定共有

プロジェクトの`.vscode/`ディレクトリに設定ファイルを配置することで、チーム全体で統一された開発環境を構築できる。

#### 11-1. 推奨エクステンション

```json
// .vscode/extensions.json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "EditorConfig.EditorConfig",
    "eamodio.gitlens",
    "usernamehw.errorlens",
    "Gruntfuggly.todo-tree",
    "christian-kohler.path-intellisense",
    "formulahendry.auto-rename-tag",
    "bradlc.vscode-tailwindcss",
    "humao.rest-client",
    "ms-azuretools.vscode-docker",
    "vitest.explorer"
  ],
  "unwantedRecommendations": []
}
```

#### 11-2. ワークスペース設定

```json
// .vscode/settings.json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "files.eol": "\n"
}
```

#### 11-3. デバッグ設定

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug API Server",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["tsx", "src/server.ts"],
      "env": {
        "NODE_ENV": "development",
        "LOG_LEVEL": "debug"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "Debug Current Test File",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["vitest", "run", "${relativeFile}"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "Attach to Docker",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "address": "localhost",
      "localRoot": "${workspaceFolder}",
      "remoteRoot": "/app",
      "restart": true
    }
  ]
}
```

---

### まとめ

本記事では、2026年のVS Code開発に推奨するエクステンションをカテゴリ別に紹介した。

| カテゴリ | 必須 | 推奨 |
|---------|------|------|
| 共通 | Prettier, ESLint, EditorConfig, GitLens, Error Lens | Todo Tree, Path Intellisense, Auto Rename Tag, Better Comments |
| AI | GitHub Copilot または Continue | Cody |
| フロントエンド | Tailwind CSS IntelliSense | Console Ninja, CSS Modules, i18n Ally |
| バックエンド | REST Client, Docker | Thunder Client, Database Client |
| Git | Git Graph | Conventional Commits, Git History |
| テスト | Vitest | Test Explorer UI |

重要なのは、エクステンションを入れすぎないことだ。プロファイル機能を活用してプロジェクトごとに最適な組み合わせを使い分け、起動速度とレスポンスを維持しながら生産性を最大化しよう。

---

**参考文献**

- VS Code公式ドキュメント https://code.visualstudio.com/docs
- VS Code公式「Profiles」 https://code.visualstudio.com/docs/editor/profiles
- GitHub Copilot公式 https://github.com/features/copilot
- Sourcegraph Cody公式 https://sourcegraph.com/cody
- Continue公式 https://continue.dev/
- Prettier公式 https://prettier.io/
- ESLint公式 https://eslint.org/
- EditorConfig公式 https://editorconfig.org/
- Conventional Commits仕様 https://www.conventionalcommits.org/

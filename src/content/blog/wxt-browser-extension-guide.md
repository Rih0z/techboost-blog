---
title: 'WXTブラウザ拡張機能開発ガイド - 次世代の拡張機能フレームワーク'
description: 'WXTフレームワークでのブラウザ拡張機能開発を徹底解説。Manifest V3対応、TypeScript、Vue/React対応、Chrome/Firefox/Safari対応、HMRによる高速開発を習得しよう。ベストプラクティスと注意点も紹介します。'
pubDate: 'Feb 05 2026'
tags: ['WXT', 'BrowserExtension', 'ManifestV3', 'TypeScript']
---
# WXTブラウザ拡張機能開発ガイド - 次世代の拡張機能フレームワーク

WXTは、モダンなブラウザ拡張機能開発のためのフレームワークです。TypeScript、Vue/React、Manifest V3をサポートし、HMRによる高速開発体験を提供します。

## WXTとは

### 主な特徴

1. **Manifest V3ネイティブ対応** - 最新の拡張機能仕様をサポート
2. **TypeScript完全サポート** - 型安全な開発環境
3. **HMR対応** - 変更が即座に反映される開発体験
4. **マルチブラウザ対応** - Chrome、Firefox、Safari、Edge
5. **フレームワーク統合** - Vue、React、Svelte、Solid対応
6. **自動バンドル最適化** - Viteベースの高速ビルド

### アーキテクチャ

```
WXT Project
├── entrypoints/
│   ├── background.ts      # Service Worker
│   ├── content.ts         # Content Script
│   ├── popup/            # Popup UI
│   │   ├── index.html
│   │   └── App.tsx
│   ├── options/          # Options Page
│   └── sidepanel/        # Side Panel
├── components/           # 共有コンポーネント
├── utils/               # ユーティリティ
├── public/              # 静的ファイル
└── wxt.config.ts        # WXT設定
```

## セットアップ

### プロジェクト作成

```bash
# WXTプロジェクト作成（対話形式）
npm create wxt@latest

# または、テンプレート指定
npm create wxt@latest my-extension -- --template react
npm create wxt@latest my-extension -- --template vue
npm create wxt@latest my-extension -- --template svelte
npm create wxt@latest my-extension -- --template vanilla
```

### 手動セットアップ

```bash
# プロジェクト作成
mkdir my-extension && cd my-extension
npm init -y

# WXTインストール
npm install -D wxt

# TypeScript設定
npm install -D typescript @types/chrome
npx tsc --init
```

### WXT設定ファイル

```typescript
// wxt.config.ts
import { defineConfig } from 'wxt'

export default defineConfig({
  manifest: {
    name: 'My Extension',
    version: '1.0.0',
    permissions: ['storage', 'tabs', 'activeTab'],
    host_permissions: ['https://*/*']
  },
  modules: ['@wxt-dev/module-react'],
  runner: {
    chromiumArgs: ['--auto-open-devtools-for-tabs']
  }
})
```

## エントリーポイント

### Background Service Worker

```typescript
// entrypoints/background.ts
export default defineBackground(() => {
  console.log('Background service worker started')

  // インストール時
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      console.log('Extension installed')
      chrome.storage.local.set({ initialized: true })
    }
  })

  // メッセージリスナー
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_DATA') {
      chrome.storage.local.get('data', (result) => {
        sendResponse({ data: result.data })
      })
      return true // 非同期レスポンス
    }
  })

  // アラーム設定
  chrome.alarms.create('periodic-task', {
    periodInMinutes: 5
  })

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'periodic-task') {
      console.log('Periodic task triggered')
    }
  })
})
```

### Content Script

```typescript
// entrypoints/content.ts
export default defineContentScript({
  matches: ['https://*.example.com/*'],
  runAt: 'document_end',

  main() {
    console.log('Content script loaded')

    // DOM操作
    const banner = document.createElement('div')
    banner.id = 'my-extension-banner'
    banner.textContent = 'Extension Active'
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #4CAF50;
      color: white;
      padding: 10px;
      text-align: center;
      z-index: 10000;
    `
    document.body.prepend(banner)

    // Backgroundへメッセージ送信
    chrome.runtime.sendMessage(
      { type: 'GET_DATA' },
      (response) => {
        console.log('Response:', response.data)
      }
    )

    // ページイベント監視
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      console.log('Clicked:', target.tagName)
    })
  }
})
```

### Content Script with CSS Injection

```typescript
// entrypoints/content/index.ts
import './style.css'

export default defineContentScript({
  matches: ['*://*/*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'my-extension-ui',
      position: 'inline',
      onMount: (container) => {
        const app = document.createElement('div')
        app.className = 'my-extension-container'
        app.innerHTML = '<button>Click me</button>'
        container.append(app)
      }
    })

    ui.mount()
  }
})
```

```css
/* entrypoints/content/style.css */
.my-extension-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
}

.my-extension-container button {
  padding: 10px 20px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}

.my-extension-container button:hover {
  background: #1976D2;
}
```

### Popup (React)

```typescript
// entrypoints/popup/App.tsx
import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([])

  useEffect(() => {
    // ストレージから読み込み
    chrome.storage.local.get('count', (result) => {
      setCount(result.count || 0)
    })

    // 現在のタブ取得
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      setTabs(tabs)
    })
  }, [])

  const handleIncrement = () => {
    const newCount = count + 1
    setCount(newCount)
    chrome.storage.local.set({ count: newCount })
  }

  const handleSendMessage = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    })

    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'POPUP_MESSAGE',
        data: 'Hello from popup'
      })
    }
  }

  return (
    <div className="popup-container">
      <h1>My Extension</h1>

      <div className="counter">
        <p>Count: {count}</p>
        <button onClick={handleIncrement}>Increment</button>
      </div>

      <div className="tabs">
        <h2>Open Tabs ({tabs.length})</h2>
        <ul>
          {tabs.map((tab) => (
            <li key={tab.id}>
              <img src={tab.favIconUrl} width="16" height="16" />
              <span>{tab.title}</span>
            </li>
          ))}
        </ul>
      </div>

      <button onClick={handleSendMessage}>
        Send Message to Content Script
      </button>
    </div>
  )
}

export default App
```

```typescript
// entrypoints/popup/index.html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Popup</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

```typescript
// entrypoints/popup/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

### Options Page (Vue)

```vue
<!-- entrypoints/options/App.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Settings {
  enabled: boolean
  interval: number
  apiKey: string
}

const settings = ref<Settings>({
  enabled: true,
  interval: 5,
  apiKey: ''
})

const saved = ref(false)

onMounted(async () => {
  const result = await chrome.storage.sync.get('settings')
  if (result.settings) {
    settings.value = result.settings
  }
})

const saveSettings = async () => {
  await chrome.storage.sync.set({ settings: settings.value })
  saved.value = true
  setTimeout(() => {
    saved.value = false
  }, 2000)
}

const resetSettings = () => {
  settings.value = {
    enabled: true,
    interval: 5,
    apiKey: ''
  }
}
</script>

<template>
  <div class="options-container">
    <h1>Extension Settings</h1>

    <form @submit.prevent="saveSettings">
      <div class="form-group">
        <label>
          <input
            v-model="settings.enabled"
            type="checkbox"
          />
          Enable Extension
        </label>
      </div>

      <div class="form-group">
        <label>
          Check Interval (minutes)
          <input
            v-model.number="settings.interval"
            type="number"
            min="1"
            max="60"
          />
        </label>
      </div>

      <div class="form-group">
        <label>
          API Key
          <input
            v-model="settings.apiKey"
            type="password"
            placeholder="Enter your API key"
          />
        </label>
      </div>

      <div class="actions">
        <button type="submit">Save Settings</button>
        <button type="button" @click="resetSettings">Reset</button>
      </div>

      <div v-if="saved" class="success-message">
        Settings saved successfully!
      </div>
    </form>
  </div>
</template>

<style scoped>
.options-container {
  max-width: 600px;
  margin: 40px auto;
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

.form-group input[type="number"],
.form-group input[type="password"] {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.actions button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.actions button[type="submit"] {
  background: #4CAF50;
  color: white;
}

.actions button[type="button"] {
  background: #f44336;
  color: white;
}

.success-message {
  margin-top: 20px;
  padding: 10px;
  background: #d4edda;
  color: #155724;
  border-radius: 4px;
}
</style>
```

## ストレージ管理

### 型安全なストレージ

```typescript
// utils/storage.ts
import { storage } from 'wxt/storage'

// ストレージスキーマ定義
interface StorageSchema {
  'user:preferences': {
    theme: 'light' | 'dark'
    notifications: boolean
  }
  'cache:data': {
    items: Array<{ id: string; name: string }>
    lastUpdated: number
  }
  'sync:count': number
}

// 型安全なヘルパー
export const storageHelper = {
  async getPreferences() {
    return await storage.getItem<StorageSchema['user:preferences']>(
      'local:user:preferences'
    )
  },

  async setPreferences(prefs: StorageSchema['user:preferences']) {
    await storage.setItem('local:user:preferences', prefs)
  },

  async getCount() {
    return await storage.getItem<number>('sync:count') ?? 0
  },

  async incrementCount() {
    const count = await this.getCount()
    await storage.setItem('sync:count', count + 1)
    return count + 1
  },

  async getCachedData() {
    return await storage.getItem<StorageSchema['cache:data']>(
      'local:cache:data'
    )
  },

  async setCachedData(data: StorageSchema['cache:data']) {
    await storage.setItem('local:cache:data', data)
  }
}
```

### ストレージの監視

```typescript
// entrypoints/background.ts
import { storage } from 'wxt/storage'

export default defineBackground(() => {
  // ストレージ変更監視
  storage.watch('local:user:preferences', (newValue, oldValue) => {
    console.log('Preferences changed:', { oldValue, newValue })

    if (newValue?.theme !== oldValue?.theme) {
      // テーマ変更時の処理
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              type: 'THEME_CHANGED',
              theme: newValue.theme
            })
          }
        })
      })
    }
  })
})
```

## メッセージング

### 型安全なメッセージング

```typescript
// types/messages.ts
export type MessageType =
  | { type: 'GET_TAB_INFO'; tabId: number }
  | { type: 'UPDATE_BADGE'; text: string }
  | { type: 'FETCH_DATA'; url: string }

export type MessageResponse<T extends MessageType> =
  T extends { type: 'GET_TAB_INFO' }
    ? { title: string; url: string }
    : T extends { type: 'UPDATE_BADGE' }
      ? { success: boolean }
      : T extends { type: 'FETCH_DATA' }
        ? { data: any }
        : never

// メッセージングヘルパー
export async function sendMessage<T extends MessageType>(
  message: T
): Promise<MessageResponse<T>> {
  return await chrome.runtime.sendMessage(message)
}
```

```typescript
// entrypoints/background.ts
import type { MessageType, MessageResponse } from '@/types/messages'

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((message: MessageType, sender, sendResponse) => {
    ;(async () => {
      try {
        switch (message.type) {
          case 'GET_TAB_INFO': {
            const tab = await chrome.tabs.get(message.tabId)
            sendResponse({
              title: tab.title ?? '',
              url: tab.url ?? ''
            } as MessageResponse<typeof message>)
            break
          }

          case 'UPDATE_BADGE': {
            await chrome.action.setBadgeText({ text: message.text })
            sendResponse({ success: true } as MessageResponse<typeof message>)
            break
          }

          case 'FETCH_DATA': {
            const response = await fetch(message.url)
            const data = await response.json()
            sendResponse({ data } as MessageResponse<typeof message>)
            break
          }
        }
      } catch (error) {
        console.error('Message handling error:', error)
        sendResponse({ error: String(error) } as any)
      }
    })()

    return true // 非同期レスポンス
  })
})
```

## Web Accessible Resources

### 画像・CSSのインジェクション

```typescript
// wxt.config.ts
import { defineConfig } from 'wxt'

export default defineConfig({
  manifest: {
    web_accessible_resources: [
      {
        resources: ['icon/*.png', 'styles/*.css'],
        matches: ['https://*/*']
      }
    ]
  }
})
```

```typescript
// entrypoints/content.ts
export default defineContentScript({
  matches: ['*://*/*'],

  main() {
    // Web Accessible Resourceの使用
    const iconUrl = chrome.runtime.getURL('icon/icon-48.png')
    const img = document.createElement('img')
    img.src = iconUrl
    document.body.append(img)

    // CSS注入
    const cssUrl = chrome.runtime.getURL('styles/content.css')
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = cssUrl
    document.head.append(link)
  }
})
```

## 権限管理

### Optional Permissions

```typescript
// wxt.config.ts
export default defineConfig({
  manifest: {
    permissions: ['storage', 'tabs'],
    optional_permissions: ['bookmarks', 'history'],
    optional_host_permissions: ['https://*.github.com/*']
  }
})
```

```typescript
// utils/permissions.ts
export async function requestBookmarksPermission(): Promise<boolean> {
  return await chrome.permissions.request({
    permissions: ['bookmarks']
  })
}

export async function checkBookmarksPermission(): Promise<boolean> {
  return await chrome.permissions.contains({
    permissions: ['bookmarks']
  })
}

export async function removeBookmarksPermission(): Promise<boolean> {
  return await chrome.permissions.remove({
    permissions: ['bookmarks']
  })
}
```

## ビルドとデプロイ

### 開発モード

```bash
# Chrome
npm run dev

# Firefox
npm run dev:firefox

# 特定のブラウザ
wxt dev --browser chrome
wxt dev --browser firefox
```

### プロダクションビルド

```bash
# すべてのブラウザ向けビルド
npm run build

# 特定のブラウザ
npm run build -- --browser chrome
npm run build -- --browser firefox

# ZIP作成（ストア提出用）
npm run zip
```

### ビルド設定

```typescript
// wxt.config.ts
export default defineConfig({
  outDir: 'dist',

  build: {
    target: 'chrome110',
    minify: true,
    sourcemap: true
  },

  zip: {
    artifactTemplate: '{{name}}-{{version}}-{{browser}}.zip',
    excludeSources: [
      'node_modules/**',
      'src/**',
      '.git/**'
    ]
  }
})
```

## デバッグとテスト

### デバッグ設定

```typescript
// wxt.config.ts
export default defineConfig({
  runner: {
    disabled: false,
    chromiumArgs: [
      '--auto-open-devtools-for-tabs',
      '--disable-extensions-except={{profilePath}}',
      '--load-extension={{profilePath}}'
    ],
    chromiumProfile: '.wxt/chrome-data'
  }
})
```

### E2Eテスト (Playwright)

```typescript
// tests/extension.spec.ts
import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Extension Tests', () => {
  test('popup should open and display content', async ({ page, context }) => {
    // 拡張機能読み込み
    const extensionPath = path.join(__dirname, '../.output/chrome-mv3')

    const extensionId = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/popup.html`)

    // Popup要素確認
    await expect(page.locator('h1')).toHaveText('My Extension')

    // ボタンクリック
    await page.click('button:has-text("Increment")')

    // カウント確認
    await expect(page.locator('.counter p')).toContainText('Count: 1')
  })

  test('content script should inject elements', async ({ page }) => {
    await page.goto('https://example.com')

    // Content Scriptによる要素確認
    const banner = await page.locator('#my-extension-banner')
    await expect(banner).toBeVisible()
    await expect(banner).toHaveText('Extension Active')
  })
})
```

## まとめ

WXTは以下を提供します:

1. **モダンな開発体験** - TypeScript、HMR、Viteベース
2. **Manifest V3対応** - 最新の拡張機能仕様
3. **マルチブラウザ対応** - Chrome、Firefox、Safari、Edge
4. **フレームワーク統合** - React、Vue、Svelte対応
5. **型安全** - エンドツーエンドの型サポート
6. **開発者フレンドリー** - 直感的なAPI、豊富なドキュメント

ブラウザ拡張機能開発において、WXTは最もモダンで生産性の高い選択肢です。従来の煩雑な設定から解放され、アプリケーションロジックに集中できます。

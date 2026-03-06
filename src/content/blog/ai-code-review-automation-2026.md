---
title: "AIコードレビュー自動化2026 CI/CD統合ガイド"
description: "GitHub ActionsとAI APIを使ったPRレビュー自動化の実装方法を解説。Claude/GPT API連携、ESLint統合、セキュリティスキャンまでTypeScriptで実践的に構築します。"
pubDate: "2026-03-06"
tags: ['AI', 'DevOps', '開発ツール', 'TypeScript', 'career']
---

コードレビューはソフトウェア開発の品質を担保する重要なプロセスだ。しかし、レビュアーの負担は大きく、レビュー待ちがボトルネックになるチームも少なくない。2026年現在、AIを活用したコードレビュー自動化は実用段階に入っている。

本記事では、GitHub ActionsとAI API（Claude / GPT）を組み合わせて、Pull Requestに対する自動コードレビューをCI/CDパイプラインに統合する方法を解説する。

---

### 1. AIコードレビューの全体像

#### 1-1. 何を自動化するのか

AIコードレビューで自動化できる領域と、人間が担当すべき領域を明確に分ける。

```
AIが担当する領域:
- コーディング規約・スタイル違反の検出
- 潜在的なバグ・ロジックエラーの指摘
- パフォーマンスのアンチパターンの発見
- セキュリティ上の懸念の検出
- ドキュメント・コメントの不備の指摘
- テストカバレッジの確認

人間が担当する領域:
- ビジネスロジックの妥当性
- アーキテクチャの設計判断
- チームの方針・コンテキストに基づく判断
- コードの意図・目的の確認
```

#### 1-2. アーキテクチャ

```
Pull Request作成
      |
      v
GitHub Actions トリガー
      |
      v
+------------------+
| 差分取得 (diff)  |
+--------+---------+
         |
    +----+----+
    |         |
    v         v
+--------+ +--------+
| ESLint | | AI API |
| 解析   | | レビュー|
+--------+ +--------+
    |         |
    +----+----+
         |
         v
+------------------+
| レビューコメント  |
| PR に投稿        |
+------------------+
```

---

### 2. プロジェクトのセットアップ

#### 2-1. ディレクトリ構造

```
.github/
  workflows/
    ai-review.yml          # GitHub Actionsワークフロー
  scripts/
    ai-review/
      package.json
      tsconfig.json
      src/
        index.ts           # エントリポイント
        diff-parser.ts     # Git diff の解析
        ai-reviewer.ts     # AI API との通信
        eslint-runner.ts   # ESLint 実行
        security-scan.ts   # セキュリティスキャン
        github-client.ts   # GitHub API クライアント
        types.ts           # 型定義
```

#### 2-2. 依存関係

```json
{
  "name": "ai-code-review",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc",
    "review": "tsx src/index.ts",
    "test": "vitest"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "@octokit/rest": "^21.0.0",
    "openai": "^4.80.0",
    "eslint": "^9.0.0",
    "typescript-eslint": "^8.0.0"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "@types/node": "^22.0.0"
  }
}
```

---

### 3. 型定義

```typescript
// src/types.ts

/** PRの差分情報 */
export interface DiffFile {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  patch: string;
  language: string;
}

/** AIからのレビュー結果 */
export interface ReviewComment {
  file: string;
  line: number;
  severity: 'error' | 'warning' | 'info' | 'suggestion';
  category: 'bug' | 'security' | 'performance' | 'style' | 'documentation' | 'test';
  message: string;
  suggestion?: string;
}

/** レビュー全体の結果 */
export interface ReviewResult {
  summary: string;
  comments: ReviewComment[];
  overallScore: number;  // 0-100
  metrics: {
    totalFiles: number;
    totalAdditions: number;
    totalDeletions: number;
    issuesFound: number;
    criticalIssues: number;
  };
}

/** ESLintの結果 */
export interface ESLintIssue {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
  ruleId: string;
  message: string;
}

/** セキュリティスキャンの結果 */
export interface SecurityFinding {
  file: string;
  line: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  description: string;
  cwe?: string;
}

/** AI APIの設定 */
export interface AIConfig {
  provider: 'claude' | 'openai';
  model: string;
  maxTokens: number;
  temperature: number;
}

/** GitHub PR情報 */
export interface PRInfo {
  owner: string;
  repo: string;
  pullNumber: number;
  baseBranch: string;
  headBranch: string;
  title: string;
  body: string;
}
```

---

### 4. Git Diff解析モジュール

```typescript
// src/diff-parser.ts
import { Octokit } from '@octokit/rest';
import type { DiffFile, PRInfo } from './types.js';

const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.rb': 'ruby',
  '.php': 'php',
  '.css': 'css',
  '.scss': 'scss',
  '.html': 'html',
  '.sql': 'sql',
  '.yml': 'yaml',
  '.yaml': 'yaml',
  '.json': 'json',
  '.md': 'markdown',
};

function detectLanguage(filename: string): string {
  const ext = filename.substring(filename.lastIndexOf('.'));
  return LANGUAGE_MAP[ext] || 'unknown';
}

/** レビュー不要なファイルを除外 */
function shouldReview(filename: string): boolean {
  const SKIP_PATTERNS = [
    /^package-lock\.json$/,
    /^yarn\.lock$/,
    /^pnpm-lock\.yaml$/,
    /^\.gitignore$/,
    /\.min\.(js|css)$/,
    /^dist\//,
    /^node_modules\//,
    /^\.next\//,
    /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/,
  ];
  return !SKIP_PATTERNS.some((pattern) => pattern.test(filename));
}

export async function fetchPRDiff(
  octokit: Octokit,
  prInfo: PRInfo
): Promise<DiffFile[]> {
  const { data: files } = await octokit.pulls.listFiles({
    owner: prInfo.owner,
    repo: prInfo.repo,
    pull_number: prInfo.pullNumber,
    per_page: 100,
  });

  return files
    .filter((f) => shouldReview(f.filename))
    .filter((f) => f.patch) // patchがないファイル（バイナリ等）は除外
    .map((f) => ({
      filename: f.filename,
      status: f.status as DiffFile['status'],
      additions: f.additions,
      deletions: f.deletions,
      patch: f.patch || '',
      language: detectLanguage(f.filename),
    }));
}

/** 差分を適切なサイズのチャンクに分割 */
export function chunkDiffs(
  files: DiffFile[],
  maxChunkSize: number = 8000
): DiffFile[][] {
  const chunks: DiffFile[][] = [];
  let currentChunk: DiffFile[] = [];
  let currentSize = 0;

  for (const file of files) {
    const fileSize = file.patch.length;
    if (currentSize + fileSize > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentSize = 0;
    }
    currentChunk.push(file);
    currentSize += fileSize;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}
```

---

### 5. AIレビューモジュール

#### 5-1. Claude API連携

```typescript
// src/ai-reviewer.ts
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { AIConfig, DiffFile, ReviewComment, ReviewResult } from './types.js';

const REVIEW_SYSTEM_PROMPT = `あなたは経験豊富なシニアソフトウェアエンジニアです。
Pull Requestのコードレビューを行います。

レビュー方針:
1. バグやロジックエラーの検出を最優先
2. セキュリティ上の懸念は必ず指摘
3. パフォーマンスの問題を指摘
4. コーディング規約・ベストプラクティスからの逸脱を指摘
5. テストの不足を指摘
6. ドキュメントの不備を指摘

出力形式:
必ず以下のJSON形式で回答してください。
{
  "summary": "レビュー全体の要約（日本語）",
  "overallScore": 85,
  "comments": [
    {
      "file": "src/example.ts",
      "line": 42,
      "severity": "warning",
      "category": "security",
      "message": "SQLインジェクションの脆弱性があります",
      "suggestion": "プレースホルダーを使用してください"
    }
  ]
}

注意事項:
- 重要度の高い問題のみ指摘（些末なスタイル指摘は不要）
- 具体的な修正案を提示
- コードが正しい場合は無理に問題を指摘しない
- overallScoreは0-100で、100が完璧なコード`;

function buildReviewPrompt(files: DiffFile[], prTitle: string): string {
  const diffText = files
    .map((f) => `--- ${f.filename} (${f.language}) ---\n${f.patch}`)
    .join('\n\n');

  return `以下のPull Request「${prTitle}」の差分をレビューしてください。

${diffText}`;
}

export async function reviewWithClaude(
  files: DiffFile[],
  prTitle: string,
  config: AIConfig
): Promise<ReviewComment[]> {
  const client = new Anthropic();

  const prompt = buildReviewPrompt(files, prTitle);

  const response = await client.messages.create({
    model: config.model,
    max_tokens: config.maxTokens,
    temperature: config.temperature,
    system: REVIEW_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude API');
  }

  try {
    const result = JSON.parse(content.text);
    return result.comments || [];
  } catch (error) {
    console.error('Failed to parse Claude response:', content.text);
    return [];
  }
}

// 出典: Anthropic API Reference https://docs.anthropic.com/en/api/messages
```

#### 5-2. OpenAI API連携（代替）

```typescript
export async function reviewWithOpenAI(
  files: DiffFile[],
  prTitle: string,
  config: AIConfig
): Promise<ReviewComment[]> {
  const client = new OpenAI();

  const prompt = buildReviewPrompt(files, prTitle);

  const response = await client.chat.completions.create({
    model: config.model,
    max_tokens: config.maxTokens,
    temperature: config.temperature,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: REVIEW_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from OpenAI API');
  }

  try {
    const result = JSON.parse(content);
    return result.comments || [];
  } catch (error) {
    console.error('Failed to parse OpenAI response:', content);
    return [];
  }
}

// 出典: OpenAI API Reference https://platform.openai.com/docs/api-reference
```

#### 5-3. プロバイダー切り替え

```typescript
export async function runAIReview(
  files: DiffFile[],
  prTitle: string,
  config: AIConfig
): Promise<ReviewComment[]> {
  switch (config.provider) {
    case 'claude':
      return reviewWithClaude(files, prTitle, config);
    case 'openai':
      return reviewWithOpenAI(files, prTitle, config);
    default:
      throw new Error(`Unsupported AI provider: ${config.provider}`);
  }
}
```

---

### 6. ESLint統合モジュール

```typescript
// src/eslint-runner.ts
import { ESLint } from 'eslint';
import type { DiffFile, ESLintIssue } from './types.js';

/** 差分に含まれるファイルのみESLintを実行 */
export async function runESLintOnDiff(
  files: DiffFile[]
): Promise<ESLintIssue[]> {
  const targetFiles = files
    .filter((f) => f.language === 'typescript' || f.language === 'javascript')
    .map((f) => f.filename);

  if (targetFiles.length === 0) {
    return [];
  }

  const eslint = new ESLint({
    overrideConfigFile: 'eslint.config.mjs',
  });

  const results = await eslint.lintFiles(targetFiles);
  const issues: ESLintIssue[] = [];

  for (const result of results) {
    for (const message of result.messages) {
      issues.push({
        file: result.filePath,
        line: message.line,
        column: message.column,
        severity: message.severity === 2 ? 'error' : 'warning',
        ruleId: message.ruleId || 'unknown',
        message: message.message,
      });
    }
  }

  return issues;
}

/** ESLintの結果をレビューコメント形式に変換 */
export function eslintToReviewComments(
  issues: ESLintIssue[]
): Array<{
  file: string;
  line: number;
  severity: 'error' | 'warning';
  message: string;
}> {
  return issues.map((issue) => ({
    file: issue.file,
    line: issue.line,
    severity: issue.severity,
    message: `[ESLint: ${issue.ruleId}] ${issue.message}`,
  }));
}
```

出典: ESLint公式ドキュメント「Node.js API」 https://eslint.org/docs/latest/integrate/nodejs-api

---

### 7. セキュリティスキャンモジュール

```typescript
// src/security-scan.ts
import type { DiffFile, SecurityFinding } from './types.js';

/** セキュリティパターンの定義 */
const SECURITY_PATTERNS: Array<{
  pattern: RegExp;
  type: string;
  severity: SecurityFinding['severity'];
  description: string;
  cwe: string;
}> = [
  {
    pattern: /eval\s*\(/g,
    type: 'code-injection',
    severity: 'critical',
    description: 'eval() の使用はコードインジェクションのリスクがあります',
    cwe: 'CWE-94',
  },
  {
    pattern: /innerHTML\s*=/g,
    type: 'xss',
    severity: 'high',
    description: 'innerHTML への直接代入はXSSのリスクがあります。textContent または sanitize を使用してください',
    cwe: 'CWE-79',
  },
  {
    pattern: /document\.write\s*\(/g,
    type: 'xss',
    severity: 'high',
    description: 'document.write() はXSSのリスクがあります',
    cwe: 'CWE-79',
  },
  {
    pattern: /(password|secret|api[_-]?key|token)\s*[:=]\s*['"]/gi,
    type: 'hardcoded-credentials',
    severity: 'critical',
    description: '認証情報がハードコードされている可能性があります。環境変数を使用してください',
    cwe: 'CWE-798',
  },
  {
    pattern: /https?:\/\/[^\s'"]+/g,
    type: 'url-check',
    severity: 'low',
    description: 'HTTP URLが使用されています。HTTPSを使用してください',
    cwe: 'CWE-319',
  },
  {
    pattern: /console\.(log|debug|info)\s*\(/g,
    type: 'information-disclosure',
    severity: 'medium',
    description: '本番コードにconsole.log が残っています。機密情報がログに出力される可能性があります',
    cwe: 'CWE-532',
  },
  {
    pattern: /\.exec\s*\(|child_process|spawn\s*\(/g,
    type: 'command-injection',
    severity: 'high',
    description: 'コマンド実行が検出されました。ユーザー入力の検証を確認してください',
    cwe: 'CWE-78',
  },
  {
    pattern: /dangerouslySetInnerHTML/g,
    type: 'xss',
    severity: 'high',
    description: 'dangerouslySetInnerHTML はXSSのリスクがあります。入力のサニタイズを確認してください',
    cwe: 'CWE-79',
  },
  {
    pattern: /Math\.random\(\)/g,
    type: 'weak-cryptography',
    severity: 'medium',
    description: 'Math.random() は暗号学的に安全ではありません。crypto.randomUUID() を使用してください',
    cwe: 'CWE-338',
  },
  {
    pattern: /SELECT\s+.*FROM\s+.*WHERE\s+.*\$\{/gi,
    type: 'sql-injection',
    severity: 'critical',
    description: 'テンプレートリテラルを使ったSQL文はSQLインジェクションのリスクがあります。パラメータ化クエリを使用してください',
    cwe: 'CWE-89',
  },
];

/** パッチテキストから行番号を抽出 */
function getLineFromPatch(patch: string, matchIndex: number): number {
  const lines = patch.substring(0, matchIndex).split('\n');
  let currentLine = 0;

  for (const line of lines) {
    const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
    if (hunkMatch) {
      currentLine = parseInt(hunkMatch[1], 10) - 1;
      continue;
    }
    if (line.startsWith('+') || !line.startsWith('-')) {
      currentLine++;
    }
  }

  return currentLine;
}

export function scanForSecurityIssues(
  files: DiffFile[]
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  for (const file of files) {
    // HTTPのURLチェックはhttpで始まるURLのみ
    for (const rule of SECURITY_PATTERNS) {
      if (rule.type === 'url-check') {
        // http:// のみ検出（https:// は除外）
        const httpPattern = /http:\/\/[^\s'"]+/g;
        let match;
        while ((match = httpPattern.exec(file.patch)) !== null) {
          // localhost や 127.0.0.1 は除外
          if (match[0].includes('localhost') || match[0].includes('127.0.0.1')) {
            continue;
          }
          findings.push({
            file: file.filename,
            line: getLineFromPatch(file.patch, match.index),
            severity: rule.severity,
            type: rule.type,
            description: rule.description,
            cwe: rule.cwe,
          });
        }
        continue;
      }

      let match;
      const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
      while ((match = pattern.exec(file.patch)) !== null) {
        findings.push({
          file: file.filename,
          line: getLineFromPatch(file.patch, match.index),
          severity: rule.severity,
          type: rule.type,
          description: rule.description,
          cwe: rule.cwe,
        });
      }
    }
  }

  return findings;
}
```

出典: OWASP「Code Review Guide」 https://owasp.org/www-project-code-review-guide/

---

### 8. GitHub APIクライアント

```typescript
// src/github-client.ts
import { Octokit } from '@octokit/rest';
import type { ReviewComment, ReviewResult, PRInfo } from './types.js';

export function createOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }
  return new Octokit({ auth: token });
}

export function parsePRInfo(): PRInfo {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    throw new Error('GITHUB_EVENT_PATH is not set');
  }

  const event = JSON.parse(
    require('fs').readFileSync(eventPath, 'utf-8')
  );

  const pr = event.pull_request;
  const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');

  return {
    owner,
    repo,
    pullNumber: pr.number,
    baseBranch: pr.base.ref,
    headBranch: pr.head.ref,
    title: pr.title,
    body: pr.body || '',
  };
}

/** PRにレビューコメントを投稿 */
export async function postReviewComments(
  octokit: Octokit,
  prInfo: PRInfo,
  result: ReviewResult
): Promise<void> {
  // サマリーコメントをPRに投稿
  const summaryBody = buildSummaryComment(result);
  await octokit.issues.createComment({
    owner: prInfo.owner,
    repo: prInfo.repo,
    issue_number: prInfo.pullNumber,
    body: summaryBody,
  });

  // ファイル単位のレビューコメントを投稿
  if (result.comments.length > 0) {
    const reviewComments = result.comments
      .filter((c) => c.line > 0)
      .map((c) => ({
        path: c.file,
        line: c.line,
        body: formatCommentBody(c),
      }));

    if (reviewComments.length > 0) {
      await octokit.pulls.createReview({
        owner: prInfo.owner,
        repo: prInfo.repo,
        pull_number: prInfo.pullNumber,
        event: 'COMMENT',
        comments: reviewComments,
      });
    }
  }
}

function buildSummaryComment(result: ReviewResult): string {
  const { metrics } = result;
  const scoreEmoji = result.overallScore >= 80 ? 'PASS' : result.overallScore >= 60 ? 'WARN' : 'FAIL';

  return `## AI Code Review Report

**Score**: ${result.overallScore}/100 (${scoreEmoji})

#### Summary
${result.summary}

#### Metrics
| Metric | Value |
|--------|-------|
| Files reviewed | ${metrics.totalFiles} |
| Lines added | +${metrics.totalAdditions} |
| Lines removed | -${metrics.totalDeletions} |
| Issues found | ${metrics.issuesFound} |
| Critical issues | ${metrics.criticalIssues} |

#### Issue Breakdown
${result.comments.length === 0
    ? 'No issues found.'
    : result.comments
        .map((c) => `- **[${c.severity.toUpperCase()}]** ${c.file}:${c.line} - ${c.message}`)
        .join('\n')}

---
*Automated review by AI Code Review Bot*`;
}

function formatCommentBody(comment: ReviewComment): string {
  const severityBadge = {
    error: 'BUG',
    warning: 'WARNING',
    info: 'INFO',
    suggestion: 'SUGGESTION',
  };

  let body = `**${severityBadge[comment.severity]}** [${comment.category}]\n\n${comment.message}`;

  if (comment.suggestion) {
    body += `\n\n**Suggestion:**\n\`\`\`suggestion\n${comment.suggestion}\n\`\`\``;
  }

  return body;
}
```

出典: Octokit.js公式ドキュメント https://octokit.github.io/rest.js/

---

### 9. エントリポイント

```typescript
// src/index.ts
import { createOctokit, parsePRInfo, postReviewComments } from './github-client.js';
import { fetchPRDiff, chunkDiffs } from './diff-parser.js';
import { runAIReview } from './ai-reviewer.js';
import { runESLintOnDiff, eslintToReviewComments } from './eslint-runner.js';
import { scanForSecurityIssues } from './security-scan.js';
import type { AIConfig, ReviewComment, ReviewResult } from './types.js';

async function main(): Promise<void> {
  console.log('AI Code Review: Starting...');

  // 1. 環境情報の取得
  const octokit = createOctokit();
  const prInfo = parsePRInfo();
  console.log(`Reviewing PR #${prInfo.pullNumber}: ${prInfo.title}`);

  // 2. 差分の取得
  const files = await fetchPRDiff(octokit, prInfo);
  console.log(`Found ${files.length} files to review`);

  if (files.length === 0) {
    console.log('No reviewable files found. Skipping.');
    return;
  }

  // 3. AI設定
  const aiConfig: AIConfig = {
    provider: (process.env.AI_PROVIDER as 'claude' | 'openai') || 'claude',
    model: process.env.AI_MODEL || 'claude-sonnet-4-20250514',
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4096', 10),
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.3'),
  };

  // 4. 並列実行: AIレビュー + ESLint + セキュリティスキャン
  const chunks = chunkDiffs(files);
  console.log(`Split into ${chunks.length} chunks for AI review`);

  const [aiComments, eslintIssues, securityFindings] = await Promise.all([
    // AIレビュー（チャンクごとに実行）
    Promise.all(
      chunks.map((chunk) => runAIReview(chunk, prInfo.title, aiConfig))
    ).then((results) => results.flat()),

    // ESLint
    runESLintOnDiff(files).catch((err) => {
      console.warn('ESLint failed:', err.message);
      return [];
    }),

    // セキュリティスキャン
    Promise.resolve(scanForSecurityIssues(files)),
  ]);

  // 5. 結果の統合
  const allComments: ReviewComment[] = [
    ...aiComments,
    ...eslintToReviewComments(eslintIssues).map((c) => ({
      ...c,
      category: 'style' as const,
      severity: c.severity as ReviewComment['severity'],
    })),
    ...securityFindings.map((f) => ({
      file: f.file,
      line: f.line,
      severity: f.severity === 'critical' ? 'error' as const
        : f.severity === 'high' ? 'error' as const
        : 'warning' as const,
      category: 'security' as const,
      message: `[${f.cwe || f.type}] ${f.description}`,
    })),
  ];

  const result: ReviewResult = {
    summary: generateSummary(allComments, files),
    comments: allComments,
    overallScore: calculateScore(allComments, files),
    metrics: {
      totalFiles: files.length,
      totalAdditions: files.reduce((sum, f) => sum + f.additions, 0),
      totalDeletions: files.reduce((sum, f) => sum + f.deletions, 0),
      issuesFound: allComments.length,
      criticalIssues: allComments.filter(
        (c) => c.severity === 'error'
      ).length,
    },
  };

  // 6. PRにコメントを投稿
  await postReviewComments(octokit, prInfo, result);
  console.log(`Review complete. Score: ${result.overallScore}/100, Issues: ${allComments.length}`);

  // 7. 重大な問題がある場合はCIを失敗させる
  if (result.metrics.criticalIssues > 0) {
    console.error(`Found ${result.metrics.criticalIssues} critical issues!`);
    process.exit(1);
  }
}

function generateSummary(
  comments: ReviewComment[],
  files: import('./types.js').DiffFile[]
): string {
  const errorCount = comments.filter((c) => c.severity === 'error').length;
  const warningCount = comments.filter((c) => c.severity === 'warning').length;
  const securityCount = comments.filter((c) => c.category === 'security').length;

  if (comments.length === 0) {
    return `${files.length}ファイルをレビューしました。問題は検出されませんでした。`;
  }

  const parts = [];
  if (errorCount > 0) parts.push(`重大な問題: ${errorCount}件`);
  if (warningCount > 0) parts.push(`警告: ${warningCount}件`);
  if (securityCount > 0) parts.push(`セキュリティ: ${securityCount}件`);

  return `${files.length}ファイルをレビューしました。${parts.join('、')}を検出しました。`;
}

function calculateScore(
  comments: ReviewComment[],
  files: import('./types.js').DiffFile[]
): number {
  let score = 100;
  for (const comment of comments) {
    switch (comment.severity) {
      case 'error': score -= 15; break;
      case 'warning': score -= 5; break;
      case 'info': score -= 1; break;
      case 'suggestion': score -= 0; break;
    }
  }
  return Math.max(0, Math.min(100, score));
}

main().catch((error) => {
  console.error('AI Code Review failed:', error);
  process.exit(1);
});
```

---

### 10. GitHub Actions ワークフロー

```yaml
## .github/workflows/ai-review.yml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

env:
  NODE_VERSION: '22'

jobs:
  ai-review:
    runs-on: ubuntu-latest
    # Draft PRはスキップ
    if: github.event.pull_request.draft == false
    timeout-minutes: 10

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: '.github/scripts/ai-review/package-lock.json'

      - name: Install dependencies
        working-directory: .github/scripts/ai-review
        run: npm ci

      - name: Build
        working-directory: .github/scripts/ai-review
        run: npm run build

      - name: Run AI Code Review
        working-directory: .github/scripts/ai-review
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          # OpenAI APIを使う場合
          # OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          AI_PROVIDER: claude
          AI_MODEL: claude-sonnet-4-20250514
          AI_MAX_TOKENS: 4096
          AI_TEMPERATURE: 0.3
        run: npm run review

      - name: Upload review artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: ai-review-report
          path: .github/scripts/ai-review/review-report.json
          retention-days: 30
```

出典: GitHub Actions公式ドキュメント https://docs.github.com/ja/actions

---

### 11. ESLint設定例

```javascript
// eslint.config.mjs
import tseslint from 'typescript-eslint';

export default tseslint.config(
  tseslint.configs.recommended,
  tseslint.configs.strict,
  {
    rules: {
      // セキュリティ関連
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',

      // 品質関連
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
      }],
      '@typescript-eslint/strict-boolean-expressions': 'warn',
      'no-console': ['warn', {
        allow: ['warn', 'error'],
      }],

      // パフォーマンス関連
      'no-await-in-loop': 'warn',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '*.config.*'],
  }
);
```

出典: typescript-eslint公式ドキュメント https://typescript-eslint.io/

---

### 12. コスト管理

AIコードレビューのAPI利用にはコストがかかる。以下のテーブルを参考にコストを見積もる。

```
API利用コストの目安（2026年3月時点）:

Claude API (claude-sonnet-4-20250514):
  入力:  $3.00 / 1M tokens
  出力:  $15.00 / 1M tokens

OpenAI API (gpt-4o):
  入力:  $2.50 / 1M tokens
  出力:  $10.00 / 1M tokens

1PRあたりの平均コスト試算:
  差分サイズ: 平均500行 = 約2,000 tokens
  レスポンス: 約1,000 tokens
  Claude: ($3 * 2 + $15 * 1) / 1000 = 約$0.021 / PR
  OpenAI: ($2.5 * 2 + $10 * 1) / 1000 = 約$0.015 / PR

月間100 PRの場合:
  Claude: 約$2.1 / 月（約315円）
  OpenAI: 約$1.5 / 月（約225円）
```

出典: Anthropic Pricing https://www.anthropic.com/pricing / OpenAI Pricing https://openai.com/pricing

#### コスト削減のヒント

```typescript
// 大きな差分はAIレビューをスキップ
const MAX_DIFF_LINES = 1000;
const totalLines = files.reduce((sum, f) => sum + f.additions + f.deletions, 0);

if (totalLines > MAX_DIFF_LINES) {
  console.warn(`Diff too large (${totalLines} lines). Running ESLint and security scan only.`);
  // ESLintとセキュリティスキャンのみ実行
}

// ファイルタイプでフィルタリング（テストファイルはAIレビュー対象外にする等）
const codeFiles = files.filter(
  (f) => !f.filename.includes('.test.') && !f.filename.includes('.spec.')
);
```

---

### 13. 本番導入のベストプラクティス

#### 13-1. 段階的な導入

```
Phase 1: 情報提供のみ（1-2週間）
  - CIは常にパス（exit 0）
  - レビューコメントのみ投稿
  - チームが品質を評価

Phase 2: 警告モード（2-4週間）
  - critical issuesのみCIを失敗させる
  - warning以下は情報提供のみ

Phase 3: 本番モード
  - critical + high issuesでCIを失敗させる
  - レビュー必須のブランチ保護ルールと組み合わせ
```

#### 13-2. AIの限界と注意点

```
AIコードレビューの限界:
1. ビジネスロジックの正しさは判断できない
2. コンテキスト（チーム方針・歴史的経緯）を知らない
3. 誤検知（False Positive）がある
4. 大きな差分では精度が下がる
5. 新しいライブラリ・APIは知識がない場合がある

対策:
- AIレビューは人間レビューの代替ではなく補完
- 誤検知はseverity: infoに格下げするルールを追加
- 定期的にレビュー精度を評価してプロンプトを改善
- 大きなPRは分割を促す（500行以上は警告）
```

---

### まとめ

本記事では、GitHub ActionsとAI API（Claude / GPT）を統合したコードレビュー自動化システムの構築方法を解説した。

1. **差分解析**: PRの変更ファイルを取得し、レビュー対象を自動選定
2. **AIレビュー**: Claude / GPT APIでバグ・パフォーマンス・設計上の問題を検出
3. **ESLint統合**: コーディング規約の違反を自動検出
4. **セキュリティスキャン**: 正規表現ベースで一般的な脆弱性パターンを検出
5. **GitHub API連携**: レビュー結果をPRコメントとして自動投稿
6. **コスト管理**: 月額数百円で運用可能

AIコードレビューは人間のレビュアーを置き換えるものではないが、レビュー品質の底上げとレビュアーの負担軽減に大きく貢献する。段階的に導入し、チームに合ったルールにチューニングしていくことが成功の鍵だ。

---

**参考文献**

- Anthropic API Reference https://docs.anthropic.com/en/api/messages
- OpenAI API Reference https://platform.openai.com/docs/api-reference
- GitHub Actions公式ドキュメント https://docs.github.com/ja/actions
- Octokit.js公式ドキュメント https://octokit.github.io/rest.js/
- ESLint公式ドキュメント https://eslint.org/docs/latest/
- typescript-eslint公式ドキュメント https://typescript-eslint.io/
- OWASP Code Review Guide https://owasp.org/www-project-code-review-guide/

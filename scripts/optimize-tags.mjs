#!/usr/bin/env node
/**
 * TechBoost Blog Tag Optimizer
 *
 * 1. Normalize tag casing to canonical form
 * 2. Merge JP/EN duplicate tags
 * 3. Add missing tags based on filename/content patterns
 * 4. Add affiliate-relevant tags (career, server, school)
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const BLOG_DIR = join(import.meta.dirname, '..', 'src', 'content', 'blog');

// ─── Canonical tag mapping (lowercase → preferred form) ───
const CANONICAL_TAGS = {
  'typescript': 'TypeScript',
  'react': 'React',
  'javascript': 'JavaScript',
  'ai': 'AI',
  'css': 'CSS',
  'html': 'HTML',
  'next.js': 'Next.js',
  'nextjs': 'Next.js',
  'node.js': 'Node.js',
  'nodejs': 'Node.js',
  'vue.js': 'Vue.js',
  'vuejs': 'Vue.js',
  'nuxt.js': 'Nuxt.js',
  'nuxtjs': 'Nuxt.js',
  'svelte': 'Svelte',
  'sveltekit': 'SvelteKit',
  'rust': 'Rust',
  'go': 'Go',
  'python': 'Python',
  'docker': 'Docker',
  'kubernetes': 'Kubernetes',
  'graphql': 'GraphQL',
  'sql': 'SQL',
  'postgresql': 'PostgreSQL',
  'sqlite': 'SQLite',
  'mysql': 'MySQL',
  'redis': 'Redis',
  'mongodb': 'MongoDB',
  'supabase': 'Supabase',
  'prisma': 'Prisma',
  'drizzle': 'Drizzle',
  'devops': 'DevOps',
  'cicd': 'CICD',
  'ci/cd': 'CICD',
  'linux': 'Linux',
  'aws': 'AWS',
  'azure': 'Azure',
  'gcp': 'GCP',
  'cloudflare': 'Cloudflare',
  'vercel': 'Vercel',
  'github': 'GitHub',
  'git': 'Git',
  'vscode': 'VSCode',
  'wordpress': 'WordPress',
  'tailwind': 'Tailwind CSS',
  'tailwind css': 'Tailwind CSS',
  'webassembly': 'WebAssembly',
  'wasm': 'WebAssembly',
  'ssr': 'SSR',
  'ssg': 'SSG',
  'pwa': 'PWA',
  'api': 'API',
  'rest': 'REST',
  'jwt': 'JWT',
  'oauth': 'OAuth',
  'llm': 'LLM',
  'rag': 'RAG',
  'orm': 'ORM',
  'deno': 'Deno',
  'bun': 'Bun',
  'vite': 'Vite',
  'webpack': 'Webpack',
  'eslint': 'ESLint',
  'vitest': 'Vitest',
  'playwright': 'Playwright',
  'stripe': 'Stripe',
  'astro': 'Astro',
  'remix': 'Remix',
  'hono': 'Hono',
  'angular': 'Angular',
  'solid.js': 'Solid.js',
  'solidjs': 'Solid.js',
  'htmx': 'htmx',
  'trpc': 'tRPC',
  'zod': 'Zod',
  'zustand': 'Zustand',
  'tanstack': 'TanStack',
  'shadcn': 'shadcn-ui',
  'shadcn/ui': 'shadcn-ui',
  'shadcn-ui': 'shadcn-ui',
  'cursor': 'Cursor',
  'claude': 'Claude',
  'claude code': 'Claude Code',
  'openai': 'OpenAI',
  'chatgpt': 'ChatGPT',
  'github copilot': 'GitHub Copilot',
  'copilot': 'GitHub Copilot',
  'terraform': 'Terraform',
  'biome': 'Biome',
  'rspack': 'Rspack',
  'tauri': 'Tauri',
  'electron': 'Electron',
  'turso': 'Turso',
  'neon': 'Neon',
  'fly.io': 'Fly.io',
  'railway': 'Railway',
  'render': 'Render',
  'coolify': 'Coolify',
  // Japanese tag normalization (merge to Japanese canonical)
  'frontend': 'フロントエンド',
  'フロントエンド': 'フロントエンド',
  'backend': 'バックエンド',
  'バックエンド': 'バックエンド',
  'database': 'データベース',
  'データベース': 'データベース',
  'performance': 'パフォーマンス',
  'パフォーマンス': 'パフォーマンス',
  'security': 'セキュリティ',
  'セキュリティ': 'セキュリティ',
  'serverless': 'サーバーレス',
  'サーバーレス': 'サーバーレス',
  'testing': 'テスト',
  'テスト': 'テスト',
  'authentication': '認証',
  '認証': '認証',
  'animation': 'アニメーション',
  'アニメーション': 'アニメーション',
  'accessibility': 'アクセシビリティ',
  'アクセシビリティ': 'アクセシビリティ',
  'automation': '自動化',
  '自動化': '自動化',
  'optimization': '最適化',
  '最適化': '最適化',
  'infrastructure': 'インフラ',
  'インフラ': 'インフラ',
  'deploy': 'デプロイ',
  'deployment': 'デプロイ',
  'デプロイ': 'デプロイ',
  'monorepo': 'モノレポ',
  'モノレポ': 'モノレポ',
  'microservices': 'マイクロサービス',
  'マイクロサービス': 'マイクロサービス',
  'container': 'コンテナ',
  'コンテナ': 'コンテナ',
  'build tools': 'ビルドツール',
  'ビルドツール': 'ビルドツール',
  'edge computing': 'エッジコンピューティング',
  'エッジコンピューティング': 'エッジコンピューティング',
  'realtime': 'リアルタイム',
  'real-time': 'リアルタイム',
  'リアルタイム': 'リアルタイム',
  'bundler': 'バンドラー',
  'バンドラー': 'バンドラー',
  'routing': 'ルーティング',
  'ルーティング': 'ルーティング',
  'type safety': '型安全',
  '型安全': '型安全',
  '型安全性': '型安全',
  'プログラミング': 'プログラミング',
  'キャリア': 'キャリア',
  'server': 'サーバー',
  'サーバー': 'サーバー',
};

// ─── Filename pattern → tags to ADD ───
const FILENAME_TAG_RULES = [
  // Career/転職 articles → add キャリア tag
  { pattern: /career|freelance|salary|engineer-(career|salary|side)|indie-hacker|programming-(career|school)|online-learning|self-study|roadmap|side-income|転職/, tags: ['キャリア'] },
  // Server/hosting articles → add サーバー tag
  { pattern: /server|hosting|vps|deploy|vercel|cloudflare|netlify|railway|fly-io|render|coolify|heroku|aws-|azure-|gcp-/, tags: ['サーバー'] },
  // Programming school articles → add プログラミングスクール tag
  { pattern: /school|bootcamp|learning|beginner-guide|beginner-tutorial|self-study|online-learning/, tags: ['プログラミングスクール'] },
  // Database articles → add sql/データベース tags for DevToolBoxCTA
  { pattern: /postgres|sqlite|mysql|database|neon-|turso-|supabase|drizzle|prisma(?!-)|(?:^|-)orm(?:-|$)|redis|clickhouse|upstash|xata|tigris|pocketbase|signaldb|inngest|temporal-workflow|kysely|sqlc/, tags: ['データベース'] },
  // Docker/container → add docker tag
  { pattern: /docker|kubernetes|k8s|container|podman/, tags: ['Docker'] },
  // API articles → add API tag
  { pattern: /api|rest-|graphql|trpc|openapi|swagger|hono|express|fastify/, tags: ['API'] },
  // Linux/system → add Linux tag
  { pattern: /linux|bash|shell|terminal|chmod|systemd/, tags: ['Linux'] },
  // Security → add セキュリティ tag
  { pattern: /security|auth|oauth|jwt|csrf|xss|cors|csp|vulnerability/, tags: ['セキュリティ'] },
  // CSS articles → add CSS tag for DevToolBoxCTA
  { pattern: /^css-|tailwind|styling|animation|responsive|grid-|flexbox|anchor-position/, tags: ['CSS'] },
  // AI/ML articles → add AI tag
  { pattern: /ai-|llm|claude|cursor|copilot|chatgpt|openai|deepseek|vibe-coding|rag-|langchain|prompt/, tags: ['AI'] },
  // Git articles → add Git tag
  { pattern: /^git-|github-actions|conventional-commits|monorepo/, tags: ['Git'] },
  // Testing → add テスト tag
  { pattern: /test|vitest|playwright|cypress|jest|tdd|storybook/, tags: ['テスト'] },
  // TypeScript → ensure TypeScript tag
  { pattern: /typescript|^ts-/, tags: ['TypeScript'] },
  // React → ensure React tag
  { pattern: /^react-|react19|tanstack|zustand|jotai|recoil/, tags: ['React'] },
  // Markdown → add markdown tag for DevToolBoxCTA
  { pattern: /markdown|mdx/, tags: ['markdown'] },
  // YAML → add yaml tag for DevToolBoxCTA
  { pattern: /yaml|docker-compose/, tags: ['yaml'] },
  // Rust
  { pattern: /^rust-|tauri|wasm/, tags: ['Rust'] },
  // WordPress → add WordPress tag
  { pattern: /wordpress/, tags: ['WordPress'] },
  // URL-related → add url tag
  { pattern: /url-|seo-|sitemap|canonical/, tags: ['url'] },
  // JSON-related → add json tag
  { pattern: /json-|jsonpath/, tags: ['json'] },
  // HTML → add html/HTML tag
  { pattern: /^html-|web-component|shadow-dom|custom-element/, tags: ['HTML'] },
  // Deno/Bun → ensure TypeScript tag
  { pattern: /^deno|^bun-|^fresh-/, tags: ['TypeScript'] },
  // Next.js → ensure Next.js tag
  { pattern: /^next-|^nextjs/, tags: ['Next.js'] },
  // Nuxt → ensure Nuxt.js + Vue.js tags
  { pattern: /^nuxt/, tags: ['Nuxt.js', 'Vue.js'] },
  // Svelte → ensure Svelte tag
  { pattern: /^svelte/, tags: ['Svelte'] },
  // Astro → ensure Astro tag
  { pattern: /^astro/, tags: ['Astro'] },
  // Remix → ensure Remix tag
  { pattern: /^remix/, tags: ['Remix'] },
  // Go
  { pattern: /^golang|^go-/, tags: ['Go'] },
  // Python
  { pattern: /^python/, tags: ['Python'] },
  // Cloudflare → ensure Cloudflare tag + サーバー
  { pattern: /cloudflare/, tags: ['Cloudflare', 'サーバー'] },
  // CI/CD
  { pattern: /github-actions|ci-cd|cicd|gitlab-ci/, tags: ['CICD', 'DevOps'] },
  // Stripe/Payment
  { pattern: /stripe|payment/, tags: ['API'] },
  // Performance articles → add パフォーマンス tag
  { pattern: /performance|optimization|lighthouse|core-web-vitals|web-vitals|lazy-load/, tags: ['パフォーマンス'] },
];

// ─── Parse frontmatter from markdown file ───
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const fmText = match[1];
  const fmEnd = match[0].length;
  const body = content.slice(fmEnd);

  // Extract tags
  let tags = [];

  // Try inline format: tags: ['a', 'b'] or tags: ["a", "b"]
  const inlineMatch = fmText.match(/^tags:\s*\[(.*)\]\s*$/m);
  if (inlineMatch) {
    tags = inlineMatch[1]
      .split(',')
      .map(t => t.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
  } else {
    // Try multi-line format:
    // tags:
    //   - tag1
    //   - tag2
    const multiMatch = fmText.match(/^tags:\s*\n((?:\s+-\s+.+\n?)*)/m);
    if (multiMatch) {
      tags = multiMatch[1]
        .split('\n')
        .map(line => line.replace(/^\s+-\s+/, '').trim())
        .filter(Boolean)
        .map(t => t.replace(/^['"]|['"]$/g, ''));
    }
  }

  return { fmText, body, tags, fullMatch: match[0] };
}

// ─── Normalize a single tag ───
function normalizeTag(tag) {
  const key = tag.toLowerCase().trim();
  return CANONICAL_TAGS[key] || CANONICAL_TAGS[tag] || tag;
}

// ─── Get tags to add based on filename ───
function getFilenameTags(filename) {
  const name = filename.replace('.md', '').toLowerCase();
  const tagsToAdd = new Set();

  for (const rule of FILENAME_TAG_RULES) {
    if (rule.pattern.test(name)) {
      for (const tag of rule.tags) {
        tagsToAdd.add(tag);
      }
    }
  }

  return [...tagsToAdd];
}

// ─── Rebuild frontmatter with new tags ───
function rebuildTags(content, oldParsed, newTags) {
  const { fmText } = oldParsed;

  // Build new tags line (inline format for consistency)
  const escapedTags = newTags.map(t => {
    // Use quotes if tag contains special chars
    if (t.includes(',') || t.includes(':') || t.includes("'") || t.includes('"') || t.includes('#') || t.includes('/')) {
      return `'${t.replace(/'/g, "''")}'`;
    }
    return `'${t}'`;
  });
  const newTagsLine = `tags: [${escapedTags.join(', ')}]`;

  // Replace the tags line(s) in frontmatter
  let newFm = fmText;

  // Remove inline tags
  const inlineRegex = /^tags:\s*\[.*\]\s*$/m;
  if (inlineRegex.test(newFm)) {
    newFm = newFm.replace(inlineRegex, newTagsLine);
  } else {
    // Remove multi-line tags
    const multiRegex = /^tags:\s*\n(?:\s+-\s+.+\n?)*/m;
    if (multiRegex.test(newFm)) {
      newFm = newFm.replace(multiRegex, newTagsLine + '\n');
    } else {
      // No tags field found, add it
      newFm = newFm.trimEnd() + '\n' + newTagsLine + '\n';
    }
  }

  return content.replace(oldParsed.fullMatch, `---\n${newFm}\n---`);
}

// ─── Main ───
async function main() {
  const files = (await readdir(BLOG_DIR)).filter(f => f.endsWith('.md'));
  console.log(`Processing ${files.length} blog posts...\n`);

  let modified = 0;
  let tagsAdded = 0;
  let tagsNormalized = 0;
  const tagStats = new Map();
  const errors = [];

  for (const file of files) {
    const filePath = join(BLOG_DIR, file);
    const content = await readFile(filePath, 'utf-8');
    const parsed = parseFrontmatter(content);

    if (!parsed) {
      errors.push(`${file}: Could not parse frontmatter`);
      continue;
    }

    const originalTags = [...parsed.tags];

    // Step 1: Normalize existing tags
    let newTags = parsed.tags.map(normalizeTag);
    const normalizedCount = newTags.filter((t, i) => t !== originalTags[i]).length;

    // Step 2: Add filename-based tags
    const filenameTags = getFilenameTags(file);
    const existingLower = new Set(newTags.map(t => t.toLowerCase()));

    for (const tag of filenameTags) {
      if (!existingLower.has(tag.toLowerCase())) {
        newTags.push(tag);
        existingLower.add(tag.toLowerCase());
      }
    }

    // Step 3: Deduplicate (case-insensitive, keep first occurrence)
    const seen = new Map();
    const deduped = [];
    for (const tag of newTags) {
      const key = tag.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, true);
        deduped.push(tag);
      }
    }
    newTags = deduped;

    // Check if anything changed
    const changed = JSON.stringify(newTags) !== JSON.stringify(originalTags);

    if (changed) {
      const newContent = rebuildTags(content, parsed, newTags);
      await writeFile(filePath, newContent, 'utf-8');
      modified++;

      const added = newTags.filter(t => !originalTags.map(o => o.toLowerCase()).includes(t.toLowerCase()));
      tagsAdded += added.length;
      tagsNormalized += normalizedCount;

      if (added.length > 0) {
        console.log(`  ${file}: +${added.join(', ')}`);
      }
    }

    // Collect tag stats
    for (const tag of newTags) {
      tagStats.set(tag, (tagStats.get(tag) || 0) + 1);
    }
  }

  // ─── Report ───
  console.log('\n' + '='.repeat(60));
  console.log('TAG OPTIMIZATION REPORT');
  console.log('='.repeat(60));
  console.log(`Total posts processed: ${files.length}`);
  console.log(`Posts modified: ${modified}`);
  console.log(`Tags normalized (case fix): ${tagsNormalized}`);
  console.log(`Tags added: ${tagsAdded}`);
  console.log(`Unique tags after optimization: ${tagStats.size}`);

  if (errors.length > 0) {
    console.log(`\nErrors: ${errors.length}`);
    errors.forEach(e => console.log(`  - ${e}`));
  }

  // Show top tags
  const sorted = [...tagStats.entries()].sort((a, b) => b[1] - a[1]);
  console.log('\nTop 30 tags:');
  sorted.slice(0, 30).forEach(([tag, count]) => {
    console.log(`  ${tag}: ${count}`);
  });

  // Show CTA-relevant tag coverage
  console.log('\n--- CTA-Relevant Tag Coverage ---');
  const ctaTags = ['キャリア', 'サーバー', 'プログラミングスクール', 'データベース',
                   'Docker', 'API', 'Linux', 'セキュリティ', 'CSS', 'AI', 'Git',
                   'テスト', 'TypeScript', 'React', 'Next.js', 'WordPress', 'json',
                   'yaml', 'markdown', 'HTML', 'Rust', 'Python', 'Go'];
  for (const tag of ctaTags) {
    const count = tagStats.get(tag) || 0;
    const pct = ((count / files.length) * 100).toFixed(1);
    console.log(`  ${tag}: ${count} posts (${pct}%)`);
  }
}

main().catch(console.error);

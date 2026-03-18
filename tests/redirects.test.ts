import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * リダイレクト整合性テスト
 * astro.config.mjs のリダイレクト設定が正しいことを検証
 */

// astro.config.mjs から抽出したリダイレクトマッピング
const REDIRECTS: Record<string, string> = {
  '/blog/tailwind-css-practical-guide': '/blog/tailwind-css-v4-guide/',
  '/blog/react-19-upgrade-guide': '/blog/react-19-features-guide/',
  '/blog/react-19-complete-guide': '/blog/react-19-features-guide/',
  '/blog/bun-runtime-guide-2026': '/blog/bun-complete-guide-2026/',
  '/blog/supabase-guide': '/blog/supabase-complete-guide-2026/',
  '/blog/next-js-14-guide': '/blog/nextjs-15-complete-guide/',
  '/blog/typescript-5-guide': '/blog/typescript-advanced-patterns/',
  '/blog/docker-compose-guide': '/blog/docker-multi-stage-build-guide/',
  '/blog/git-advanced-guide': '/blog/git-advanced-techniques-guide/',
  '/blog/supabase-authentication-guide': '/blog/supabase-auth-guide/',
  '/blog/nextjs-14-app-router-guide': '/blog/nextjs-15-complete-guide/',
  '/blog/react-server-components-guide': '/blog/react-19-features-guide/',
  '/blog/vite-5-guide': '/blog/vite-6-new-features/',
  '/blog/prisma-guide': '/blog/prisma-orm-complete-guide/',
  '/blog/astro-3-guide': '/blog/astro-framework-guide-2026/',
  '/blog/bun-runtime-guide': '/blog/bun-complete-guide-2026/',
  '/blog/hono-web-framework': '/blog/hono-web-framework-guide/',
  '/blog/shadcn-ui-components': '/blog/shadcn-ui-complete-guide/',
  '/blog/vercel-ai-sdk-guide': '/blog/ai-coding-tools-guide/',
  '/blog/temporal-api-javascript': '/blog/javascript-temporal-api-guide-2026/',
  '/blog/drizzle-orm-v1-guide': '/blog/drizzle-orm-guide/',
  '/blog/tauri-v2-desktop-apps': '/blog/tauri-2-desktop-app-guide-2026/',
  '/blog/biome-linter-formatter': '/blog/biome-linter-formatter-guide/',
  '/blog/ai-coding-tools-comparison': '/blog/ai-coding-assistant-comparison/',
  '/blog/opentelemetry-observability-guide': '/blog/opentelemetry-guide/',
  '/blog/github-actions-guide': '/blog/github-actions-advanced-guide/',
  '/blog/react-server-components-patterns': '/blog/react-server-components-guide/',
  '/blog/css-anchor-positioning': '/blog/css-anchor-positioning-guide/',
  '/blog/val-town-serverless': '/blog/val-town-guide/',
  '/blog/redis-for-developers': '/blog/redis-practical-guide/',
};

const BLOG_DIR = join(__dirname, '..', 'src', 'content', 'blog');

function slugToFilename(slug: string): string {
  // /blog/some-slug/ -> some-slug.md
  return slug.replace(/^\/blog\//, '').replace(/\/$/, '') + '.md';
}

describe('リダイレクト整合性', () => {
  it('リダイレクトが30件設定されている', () => {
    expect(Object.keys(REDIRECTS).length).toBe(30);
  });

  describe('全リダイレクト先の記事が存在する', () => {
    for (const [source, target] of Object.entries(REDIRECTS)) {
      const filename = slugToFilename(target);
      it(`${source} → ${filename} が存在する`, () => {
        const filepath = join(BLOG_DIR, filename);
        expect(existsSync(filepath)).toBe(true);
      });
    }
  });

  describe('リダイレクト元の記事が存在しない（削除済み確認）', () => {
    for (const source of Object.keys(REDIRECTS)) {
      const filename = slugToFilename(source + '/');
      it(`${filename} が存在しない（リダイレクト元は削除済み）`, () => {
        const filepath = join(BLOG_DIR, filename);
        expect(existsSync(filepath)).toBe(false);
      });
    }
  });

  it('リダイレクトにループがない', () => {
    const targets = new Set(Object.values(REDIRECTS).map(t => t.replace(/\/$/, '')));
    const sources = new Set(Object.keys(REDIRECTS));
    const loops = [...targets].filter(t => sources.has(t));
    expect(loops).toEqual([]);
  });

  it('同一ソースの重複リダイレクトがない', () => {
    const sources = Object.keys(REDIRECTS);
    const unique = new Set(sources);
    expect(sources.length).toBe(unique.size);
  });
});

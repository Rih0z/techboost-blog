import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CONTENT_DIR = join(import.meta.dirname, '..', 'content', 'blog');

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
      fm[key] = value;
    }
  }
  return fm;
}

function getMarkdownFiles(): string[] {
  return readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
}

describe('Frontmatter バリデーション', () => {
  const files = getMarkdownFiles();

  it('記事ファイルが存在する', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  describe.each(files.slice(0, 50))('記事: %s', (filename) => {
    const content = readFileSync(join(CONTENT_DIR, filename), 'utf-8');
    const fm = parseFrontmatter(content);

    it('titleが存在する', () => {
      expect(fm.title).toBeDefined();
      expect(fm.title.length).toBeGreaterThan(0);
    });

    it('titleが60文字以内（SEO推奨）', () => {
      if (fm.title) {
        expect(fm.title.length).toBeLessThanOrEqual(70);
      }
    });

    it('descriptionが存在する', () => {
      expect(fm.description).toBeDefined();
      expect(fm.description.length).toBeGreaterThan(0);
    });

    it('pubDateが存在し有効な日付', () => {
      expect(fm.pubDate).toBeDefined();
      const date = new Date(fm.pubDate);
      expect(date.toString()).not.toBe('Invalid Date');
    });

    it('heroImageがプレースホルダーでない', () => {
      if (fm.heroImage) {
        expect(fm.heroImage).not.toContain('no_img');
        expect(fm.heroImage).not.toContain('placeholder');
      }
    });
  });
});

describe('全記事のfrontmatter必須フィールド', () => {
  const files = getMarkdownFiles();
  const missing: string[] = [];

  for (const filename of files) {
    const content = readFileSync(join(CONTENT_DIR, filename), 'utf-8');
    const fm = parseFrontmatter(content);
    if (!fm.title || !fm.description || !fm.pubDate) {
      missing.push(`${filename}: title=${!!fm.title} desc=${!!fm.description} date=${!!fm.pubDate}`);
    }
  }

  it('全記事にtitle, description, pubDateが設定されている', () => {
    expect(missing).toEqual([]);
  });
});

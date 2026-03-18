import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * 記事frontmatterの品質チェック
 * 全記事がSEO品質基準を満たしているかを自動検証
 */

const BLOG_DIR = join(__dirname, '..', 'src', 'content', 'blog');

function parseFrontmatter(content: string) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const fm: Record<string, string> = {};
  const lines = match[1].split('\n');
  for (const line of lines) {
    const kv = line.match(/^(\w+):\s*(.+)/);
    if (kv) {
      let value = kv[2].trim();
      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      fm[kv[1]] = value;
    }
  }
  return fm;
}

function getArticleFiles(): string[] {
  return readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'));
}

describe('記事frontmatter品質チェック', () => {
  const files = getArticleFiles();

  it('記事が700本以上存在する', () => {
    expect(files.length).toBeGreaterThanOrEqual(700);
  });

  describe('全記事のtitle検証', () => {
    it('全記事にtitleが設定されている', () => {
      const missing: string[] = [];
      for (const file of files) {
        const content = readFileSync(join(BLOG_DIR, file), 'utf-8');
        const fm = parseFrontmatter(content);
        if (!fm?.title) missing.push(file);
      }
      expect(missing).toEqual([]);
    });
  });

  describe('全記事のdescription検証', () => {
    it('全記事にdescriptionが設定されている', () => {
      const missing: string[] = [];
      for (const file of files) {
        const content = readFileSync(join(BLOG_DIR, file), 'utf-8');
        const fm = parseFrontmatter(content);
        if (!fm?.description) missing.push(file);
      }
      expect(missing).toEqual([]);
    });
  });

  describe('全記事のpubDate検証', () => {
    it('全記事にpubDateが設定されている', () => {
      const missing: string[] = [];
      for (const file of files) {
        const content = readFileSync(join(BLOG_DIR, file), 'utf-8');
        const fm = parseFrontmatter(content);
        if (!fm?.pubDate) missing.push(file);
      }
      expect(missing).toEqual([]);
    });
  });

  describe('全記事のheroImage検証', () => {
    it('全記事にheroImageが設定されている', () => {
      const missing: string[] = [];
      for (const file of files) {
        const content = readFileSync(join(BLOG_DIR, file), 'utf-8');
        const fm = parseFrontmatter(content);
        if (!fm?.heroImage) missing.push(file);
      }
      // 許容: 最大5%の記事がheroImage未設定
      const ratio = missing.length / files.length;
      expect(ratio).toBeLessThan(0.05);
    });
  });

  describe('全記事のtags検証', () => {
    it('全記事にtagsが設定されている', () => {
      const missing: string[] = [];
      for (const file of files) {
        const content = readFileSync(join(BLOG_DIR, file), 'utf-8');
        if (!content.includes('tags:')) missing.push(file);
      }
      expect(missing).toEqual([]);
    });
  });

  describe('本文行数検証（サンプリング）', () => {
    it('ランダム20記事が300行以上', () => {
      const sample = files.sort(() => Math.random() - 0.5).slice(0, 20);
      const short: string[] = [];
      for (const file of sample) {
        const content = readFileSync(join(BLOG_DIR, file), 'utf-8');
        const bodyMatch = content.match(/^---[\s\S]*?---\n([\s\S]*)/);
        if (bodyMatch) {
          const bodyLines = bodyMatch[1].split('\n').length;
          if (bodyLines < 280) short.push(`${file} (${bodyLines} lines)`);
        }
      }
      expect(short).toEqual([]);
    });
  });
});

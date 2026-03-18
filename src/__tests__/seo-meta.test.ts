import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_DIR = join(import.meta.dirname, '..');

describe('SEOメタデータ設定', () => {
  describe('BaseHead.astro', () => {
    const baseHead = readFileSync(join(SRC_DIR, 'components', 'BaseHead.astro'), 'utf-8');

    it('canonical URLが設定されている', () => {
      expect(baseHead).toContain('rel="canonical"');
    });

    it('OGPメタタグが設定されている', () => {
      expect(baseHead).toContain('og:title');
      expect(baseHead).toContain('og:description');
      expect(baseHead).toContain('og:image');
      expect(baseHead).toContain('og:type');
    });

    it('Twitter Cardが設定されている', () => {
      expect(baseHead).toContain('twitter:card');
      expect(baseHead).toContain('summary_large_image');
    });

    it('Google Analyticsが設定されている', () => {
      expect(baseHead).toContain('G-HGCVQ13PYZ');
    });

    it('AdSenseが設定されている', () => {
      expect(baseHead).toContain('ca-pub-3306648647011539');
    });

    it('Google Search Console verificationが設定されている', () => {
      expect(baseHead).toContain('google-site-verification');
    });

    it('不要なAtkinsonフォントpreloadが削除されている', () => {
      expect(baseHead).not.toContain('preload" href="/fonts/atkinson');
    });
  });

  describe('BlogPost.astro', () => {
    const blogPost = readFileSync(join(SRC_DIR, 'layouts', 'BlogPost.astro'), 'utf-8');

    it('JSON-LD BlogPostingスキーマが設定されている', () => {
      expect(blogPost).toContain('BlogPosting');
      expect(blogPost).toContain('schema.org');
    });

    it('BreadcrumbListスキーマが設定されている', () => {
      expect(blogPost).toContain('BreadcrumbList');
    });

    it('GA4アフィリエイトクリックトラッキングが設定されている', () => {
      expect(blogPost).toContain('affiliate_click');
      expect(blogPost).toContain('gtag');
    });

    it('全CTAタイプ（school/server/career/accounting/default）が実装されている', () => {
      expect(blogPost).toContain("affiliateCTAType === 'school'");
      expect(blogPost).toContain("affiliateCTAType === 'server'");
      expect(blogPost).toContain("affiliateCTAType === 'career'");
      expect(blogPost).toContain("affiliateCTAType === 'accounting'");
      expect(blogPost).toContain("affiliateCTAType === 'default'");
    });

    it('アフィリエイトリンクにrel="noopener sponsored"が設定されている', () => {
      const sponsoredLinks = blogPost.match(/rel="noopener sponsored"/g);
      expect(sponsoredLinks).not.toBeNull();
      expect(sponsoredLinks!.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('index.astro', () => {
    const indexPage = readFileSync(join(SRC_DIR, 'pages', 'index.astro'), 'utf-8');

    it('記事サムネイルにalt属性が設定されている（空でない）', () => {
      expect(indexPage).not.toContain('alt=""');
    });

    it('カテゴリナビにaria-labelが設定されている', () => {
      expect(indexPage).toContain('aria-label="カテゴリナビ"');
    });

    it('セクション名が日本語化されている', () => {
      expect(indexPage).toContain('最新記事');
      expect(indexPage).toContain('カテゴリから探す');
    });
  });
});

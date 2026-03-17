// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://techboostblog.com',
	trailingSlash: 'always',
	redirects: {
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
	},
	integrations: [
		mdx(),
		sitemap({
			filter(page) {
				// Exclude paginated listing pages (/blog/2/, /blog/3/, etc.)
				if (/\/blog\/\d+\/?$/.test(page)) return false;
				return true;
			},
			serialize(item) {
				// Tag pages: lower priority, weekly
				if (item.url.includes('/blog/tag/')) {
					item.priority = 0.3;
					item.changefreq = 'weekly';
				} else if (item.url.includes('/blog/') && !item.url.endsWith('/blog/')) {
					// Blog articles: use pubDate from slug if available
					const slugMatch = item.url.match(/\/blog\/(\d{4}-\d{2}-\d{2})-/);
					if (slugMatch) {
						item.lastmod = new Date(slugMatch[1]).toISOString();
					}
					item.priority = 0.7;
					item.changefreq = 'monthly';
				}
				return item;
			},
		}),
	],
});

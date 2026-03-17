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
	},
	integrations: [
		mdx(),
		sitemap({
			filter(page) {
				// Exclude paginated listing pages (/blog/2/, /blog/3/, etc.)
				if (/\/blog\/\d+\/?$/.test(page)) return false;
				// Exclude redirect pages
				if (/\/(tailwind-css-practical-guide|react-19-(upgrade|complete)-guide|bun-runtime-guide-2026|supabase-guide|next-js-14-guide|typescript-5-guide|docker-compose-guide|git-advanced-guide|supabase-authentication-guide|nextjs-14-app-router-guide|react-server-components-guide|vite-5-guide|prisma-guide|astro-3-guide|bun-runtime-guide|hono-web-framework|shadcn-ui-components|vercel-ai-sdk-guide|temporal-api-javascript|drizzle-orm-v1-guide|tauri-v2-desktop-apps|biome-linter-formatter|ai-coding-tools-comparison|opentelemetry-observability-guide|github-actions-guide|react-server-components-patterns|css-anchor-positioning|val-town-serverless|redis-for-developers)\/?$/.test(page)) return false;
				return true;
			},
			serialize(item) {
				// Tag pages: lower priority, weekly
				if (item.url.includes('/blog/tag/')) {
					item.priority = 0.3;
					item.changefreq = 'weekly';
				} else if (item.url.includes('/blog/') && !item.url.endsWith('/blog/')) {
					// Blog articles: use pubDate from slug if available, otherwise current date
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

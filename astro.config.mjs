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
				return true;
			},
			serialize(item) {
				item.lastmod = new Date().toISOString();
				// Lower priority for tag pages
				if (item.url.includes('/blog/tag/')) {
					item.priority = 0.3;
					item.changefreq = 'weekly';
				} else if (item.url.includes('/blog/') && !item.url.endsWith('/blog/')) {
					item.priority = 0.7;
					item.changefreq = 'monthly';
				}
				return item;
			},
		}),
	],
});

// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://techboostblog.com',
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

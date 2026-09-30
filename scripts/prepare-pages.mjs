import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const root = new URL('../dist/', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const locales = ['zh', 'en', 'ja', 'ko'];
// 博客文章 slug 从数据文件里读，避免这里再维护一份
const blogSource = readFileSync(new URL('../src/website/data/blog.ts', import.meta.url), 'utf8');
const blogSlugs = [...blogSource.matchAll(/^\s*slug:\s*'([^']+)'/gm)].map(match => match[1]);
const pages = ['', 'gallery', 'creators', 'journal', 'blog', 'team', 'feedback', 'doodle', 'moodboard', ...blogSlugs.map(slug => `blog/${slug}`)];
for (const route of ['website', ...locales.flatMap(locale => pages.map(page => `website/${locale}${page ? `/${page}` : ''}`))]) {
  const dir = new URL(`${route}/`, root);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL('index.html', dir), html);
}
writeFileSync(new URL('404.html', root), html);
writeFileSync(new URL('.nojekyll', root), '');
console.log('GitHub Pages route entries prepared.');

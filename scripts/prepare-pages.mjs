import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const root = new URL('../dist/', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const locales = ['zh', 'en', 'ja', 'ko'];
const pages = ['', 'gallery', 'creators', 'journal', 'feedback', 'doodle', 'moodboard'];
for (const route of ['website', ...locales.flatMap(locale => pages.map(page => `website/${locale}${page ? `/${page}` : ''}`))]) {
  const dir = new URL(`${route}/`, root);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL('index.html', dir), html);
}
writeFileSync(new URL('404.html', root), html);
writeFileSync(new URL('.nojekyll', root), '');
console.log('GitHub Pages route entries prepared.');

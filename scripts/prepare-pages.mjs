import { access, writeFile } from 'node:fs/promises';
const root = new URL('../dist/', import.meta.url);
// The build now emits localized content. Never overwrite it with a generic SPA shell.
for (const language of ['zh', 'en', 'ja', 'ko']) await access(new URL(`website/${language}/index.html`, root));
await access(new URL('404.html', root));
await writeFile(new URL('.nojekyll', root), '');
console.log('Localized GitHub Pages entries verified.');

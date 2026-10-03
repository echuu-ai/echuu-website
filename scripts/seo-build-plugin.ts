import { createServer, loadEnv, type Plugin, type ResolvedConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

export function seoBuild(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'echuu-static-content', apply: 'build',
    configResolved(value) { config = value; },
    async closeBundle() {
      const env = { ...loadEnv(config.mode, config.root, 'VITE_'), ...process.env };
      const origin = env.VITE_SITE_ORIGIN?.trim() || 'https://echuu.ai';
      const parsed = new URL(origin);
      if (parsed.protocol !== 'https:' || parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.username || parsed.password) throw Error('VITE_SITE_ORIGIN must be an HTTPS origin without a path or credentials.');
      const indexable = env.VITE_SITE_INDEXABLE === '1';
      const server = await createServer({ configFile: false, root: config.root, mode: config.mode, base: config.base, plugins: [react()], resolve: { alias: config.resolve.alias }, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true }, appType: 'custom' });
      try {
        const { staticPages } = await server.ssrLoadModule('/scripts/static-pages.tsx');
        const out = resolve(config.root, config.build.outDir);
        const template = await readFile(join(out, 'index.html'), 'utf8');
        const pages = staticPages(template, { origin, base: config.base, indexable });
        for (const [path, html] of Object.entries(pages)) {
          await mkdir(dirname(join(out, path)), { recursive: true });
          await writeFile(join(out, path), html as string);
        }
        console.log(`SEO: ${Object.keys(pages).length} static files; indexing ${indexable ? 'enabled' : 'disabled (preview)'}.`);
      } finally { await server.close(); }
    },
  };
}

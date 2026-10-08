import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { seoBuild } from './scripts/seo-build-plugin';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig(({ command }) => ({
  plugins: [react(), seoBuild()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }, dedupe: ['three'] },
  server: { host: 'localhost', port: 5180, strictPort: true },
  // 产物保护：不输出 sourcemap（不泄露原始源码）、去掉注释，生产构建再去掉 console/debugger。
  // 只保护 JS 产物，不动预渲染的 SEO 文字——那些文字必须可读才能被收录。
  esbuild: { legalComments: 'none', ...(command === 'build' ? { drop: ['console', 'debugger'] as ('console' | 'debugger')[] } : {}) },
  build: { assetsDir: 'app-build', target: 'esnext', sourcemap: false },
  test: { environment: 'happy-dom', include: ['src/**/*.test.{ts,tsx}'] },
}));

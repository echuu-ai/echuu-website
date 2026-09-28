import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({plugins:[react()], resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url))},dedupe:['three']}, server:{host:'localhost',port:5180,strictPort:true},build:{assetsDir:'app-build',target:'esnext'},test:{environment:'happy-dom',include:['src/**/*.test.{ts,tsx}']}});

#!/usr/bin/env node
/**
 * 开场 FBX 动作预烘焙：把「FBX → VRM 重定向」后的片段写成 public/assets/animation/baked/*.clip.bin（无损，格式见 src/lib/retarget/bakedClip.ts）。
 *
 * 1. 开发环境打开 http://localhost:5180/website/zh?bakeclips ，等开场模型就绪；
 *    控制台执行 copy(JSON.stringify(window.__hvBakedClips)) ，存成一个 json 文件；
 * 2. node scripts/bake-opening-motions.mjs <那个 json 文件>
 *
 * 换了开场模型（corynorootbone）或换了 FBX 动作后必须重跑：片段是按这个模型的骨骼算出来的。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { encodeBakedClip } from '../src/lib/retarget/bakedClip.ts';

const KEYS = { sleep: 'sleeping-idle', standUp: 'stand-up' };
const input = process.argv[2];
if (!input) throw new Error('usage: node scripts/bake-opening-motions.mjs <exported-clips.json>');
const clips = JSON.parse(readFileSync(input, 'utf8'));
const out = new URL('../public/assets/animation/baked/', import.meta.url);
mkdirSync(out, { recursive: true });
for (const [key, file] of Object.entries(KEYS)) {
  if (!clips[key]) throw new Error(`missing clip ${key}`);
  const clip = THREE.AnimationClip.parse(clips[key]);
  const buffer = Buffer.from(encodeBakedClip(clip));
  writeFileSync(new URL(`${file}.clip.bin`, out), buffer);
  console.log(`${key}: ${clip.tracks.length} tracks, ${clip.duration.toFixed(2)} s → ${file}.clip.bin ${(buffer.length / 1024).toFixed(0)} KB`);
}

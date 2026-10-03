// Kling 图生视频（首尾帧同一张图 → 可循环）。在 scripts/loops/work/ 里运行：
//   [START=<首帧.jpg>] node ../kling.mjs submit <name> "<prompt>" [model]   读 <name>-green.jpg（透明图铺在 #00FF00 上）
//   node ../kling.mjs poll <name>                        成功后下载 <name>-raw.mp4
// key 只从仓库根目录 .env.local 的 KLING_API_KEY 读（已 gitignore，不要写进代码 / 文档）；这个 key 走北京节点。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const env = readFileSync(new URL('../../.env.local', import.meta.url), 'utf8');
const KEY = env.match(/^KLING_API_KEY=(.+)$/m)[1].trim();
const HOST = 'https://api-beijing.klingai.com';
const H = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const [cmd, name, prompt, model = 'kling-v3'] = process.argv.slice(2);
const state = existsSync('tasks.json') ? JSON.parse(readFileSync('tasks.json', 'utf8')) : {};
if (cmd === 'submit') {
  const img = readFileSync(`${name}-green.jpg`).toString('base64');
  const body = {
    model_name: model, mode: 'pro', duration: '5', cfg_scale: 0.6,
    // 默认首尾同图做循环；START=<首帧图> 时用它做首帧、<name>-green.jpg 做尾帧（播一次，停在原图上）。
    // Kling 不接受只有尾帧，必须给首帧。
    image: process.env.START ? readFileSync(process.env.START).toString('base64') : img, image_tail: img, prompt,
    negative_prompt: 'camera movement, zoom, pan, background change, new objects, text, watermark, extra people, distortion',
  };
  const r = await fetch(`${HOST}/v1/videos/image2video`, { method: 'POST', headers: H, body: JSON.stringify(body) });
  const j = await r.json();
  console.log(r.status, j.code, j.message, j.data?.task_id);
  if (j.data?.task_id) { state[name] = j.data.task_id; writeFileSync('tasks.json', JSON.stringify(state, null, 2)); }
} else if (cmd === 'poll') {
  const id = state[name];
  const r = await fetch(`${HOST}/v1/videos/image2video/${id}`, { headers: H });
  const j = await r.json();
  const st = j.data?.task_status;
  console.log(name, st, j.data?.task_status_msg || '');
  const url = j.data?.task_result?.videos?.[0]?.url;
  if (st === 'succeed' && url) {
    const v = Buffer.from(await (await fetch(url)).arrayBuffer());
    writeFileSync(`${name}-raw.mp4`, v);
    console.log('saved', `${name}-raw.mp4`, v.length);
  }
}

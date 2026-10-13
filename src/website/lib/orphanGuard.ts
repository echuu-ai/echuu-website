/**
 * 防孤字：任何一行都不能只剩一个词，或「一个字 + 标点」（排版大忌，2026-10-13 Cory 定为硬性规定）。
 *
 * `text-wrap: pretty` 对中文不可靠（Chromium 实测仍会留下两个字的末行），旧版 Safari 也不支持，
 * 所以在浏览器里确定性地处理每个文字块的结尾：
 * - 中日韩：最后 3 个字（连同末尾标点）之间插零宽连接符 U+2060，换行时不会被拆开，末行至少 3 个字；
 * - 拉丁文：最后两个词之间的空格换成不换行空格，末行至少 2 个词。
 * 只改屏幕上的文字节点，不动文案源文件；预渲染给搜索引擎的 HTML 不受影响。内容变化（切换语言等）后自动重做。
 */

const BLOCKS = 'p, h1, h2, h3, h4, li, dd, dt, summary, figcaption, blockquote, label, .hv-lede__line';
// .hv-paper：开场纸面上的手写字是设计稿手动断的两行（white-space: pre），纸还整体旋转，不参与
const SKIP = 'input, textarea, select, code, pre, [contenteditable], .seam-tune, .hv-paper, [data-no-orphan-guard]';
const WJ = '⁠';
const NBSP = ' ';
const CJK = /[぀-ヿ㐀-鿿가-힯豈-﫿]/;

type Pos = { node: Text; i: number };

/** 只取直接属于这个块的文字节点（嵌套的块各自处理） */
function ownTextNodes(block: Element): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const parent = (node as Text).parentElement;
    if (!parent || parent.closest(BLOCKS) !== block || parent.closest(SKIP)) continue;
    out.push(node as Text);
  }
  return out;
}

const LETTER = /[\p{L}\p{N}]/u;
const MAX_GLUE = 30; // 粘住的末尾最多这么多字符，防止长邮箱、长网址整段不能断行
/** 处理后的文字：内容没变就不重复处理；React 改了文字（切换语言等）就重新处理 */
const processed = new WeakMap<Element, string>();

type Kind = 'cjk' | 'latin' | 'space' | 'punct';
const kindOf = (c: string): Kind => (/\s/.test(c) ? 'space' : CJK.test(c) ? 'cjk' : LETTER.test(c) ? 'latin' : 'punct');

function guardBlock(block: Element) {
  if (processed.get(block) === block.textContent) return;
  const nodes = ownTextNodes(block);
  if (!nodes.length) return;
  // 从末尾往前取字符位置（跳过结尾空白和已插入的零宽连接符）
  const tail: Pos[] = [];
  for (let n = nodes.length - 1; n >= 0 && tail.length <= MAX_GLUE; n -= 1) {
    const text = nodes[n].data;
    for (let i = text.length - 1; i >= 0 && tail.length <= MAX_GLUE; i -= 1) {
      if (text[i] === WJ) continue;
      if (!tail.length && /\s/.test(text[i])) continue;
      tail.push({ node: nodes[n], i });
    }
  }
  if (tail.length < 2) { processed.set(block, block.textContent ?? ''); return; }
  const kind = (j: number) => kindOf(tail[j].node.data[tail[j].i]);

  // 从末尾往前数单位：一个汉字 = 1，一个拉丁词 = 1，标点跟着邻字。凑够「3 个单位」或「2 个拉丁词」为止，
  // 而且要停在单位边界上（不把拉丁词从中间切开）
  let cjk = 0;
  let words = 0;
  let stop = -1;
  for (let j = 0; j < tail.length; j += 1) {
    const k = kind(j);
    if (k === 'cjk') cjk += 1;
    if (k === 'latin' && (j === 0 || kind(j - 1) !== 'latin')) words += 1;
    const atBoundary = j + 1 >= tail.length || !(k === 'latin' && kind(j + 1) === 'latin');
    if (atBoundary && (cjk + words >= 3 || words >= 2)) { stop = j; break; }
  }
  if (stop < 0) { processed.set(block, block.textContent ?? ''); return; } // 整段都很短，本来就不会出现孤字

  const edits: Array<{ node: Text; i: number; mode: 'join-after' | 'nbsp' }> = [];
  for (let j = 1; j <= stop; j += 1) {
    const here = kind(j);
    const next = kind(j - 1);
    if (here === 'space') { edits.push({ node: tail[j].node, i: tail[j].i, mode: 'nbsp' }); continue; }
    if (next === 'space') continue;
    if (here === 'latin' && next === 'latin') continue; // 拉丁词内部不插，免得影响字距和连字
    edits.push({ node: tail[j].node, i: tail[j].i, mode: 'join-after' });
  }

  // 按文字节点分组，组内从后往前改，前面的下标不受影响
  const byNode = new Map<Text, typeof edits>();
  for (const e of edits) byNode.set(e.node, [...(byNode.get(e.node) ?? []), e]);
  for (const [node, list] of byNode) {
    let d = node.data;
    for (const e of list.sort((a, b) => b.i - a.i)) {
      d = e.mode === 'nbsp' ? d.slice(0, e.i) + NBSP + d.slice(e.i + 1) : d.slice(0, e.i + 1) + WJ + d.slice(e.i + 1);
    }
    node.data = d;
  }
  processed.set(block, block.textContent ?? '');
}

export function guardOrphans(root: ParentNode = document) {
  root.querySelectorAll(BLOCKS).forEach((block) => {
    if (block.closest(SKIP)) return;
    guardBlock(block);
  });
}

/** 挂在站点根节点上：首屏渲染后处理一次，之后 DOM 有变化时防抖重做。
 * 用定时器而不是 requestAnimationFrame：后台标签页会暂停动画帧，页面在后台打开时就永远不处理了。 */
export function watchOrphans(root: Element) {
  let timer = 0;
  const OPTIONS: MutationObserverInit = { childList: true, subtree: true, characterData: true };
  const run = () => { timer = 0; observer.disconnect(); guardOrphans(root); observer.observe(root, OPTIONS); };
  const schedule = () => { window.clearTimeout(timer); timer = window.setTimeout(run, 50); };
  const observer = new MutationObserver(schedule);
  run();
  return () => { observer.disconnect(); window.clearTimeout(timer); };
}

export type OrphanReport = { block: string; reason: string; lastLine: string; text: string };

/**
 * 检查当前页面有没有孤字（开发环境在控制台跑 `window.__findOrphans()`）。
 * 按文字实际渲染位置拆行：用每个字 / 词矩形的垂直中心归行（容差 = 行高 40%，小字号标签不会被误判成另起一行），
 * 最后一行只剩 1 个拉丁词、≤ 2 个中日韩字，或任一行只有标点，都算孤字。
 */
export function findOrphans(root: ParentNode = document): OrphanReport[] {
  const PUNCT = /^[\p{P}\p{S}]+$/u;
  const token = /[぀-ヿ㐀-鿿가-힯豈-﫿]|[\p{L}\p{N}'’-]+|[^\s⁠ ]/gu;
  const out: OrphanReport[] = [];
  root.querySelectorAll(BLOCKS).forEach((block) => {
    if (block.closest(SKIP)) return;
    const rect = block.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const style = getComputedStyle(block);
    if (style.visibility === 'hidden') return;
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.3;
    if (rect.height < lineHeight * 1.5) return;
    const tolerance = Math.max(6, lineHeight * 0.4);
    const lines: Array<{ cy: number; tokens: string[] }> = [];
    for (const node of ownTextNodes(block)) {
      for (const m of node.data.matchAll(token)) {
        const range = document.createRange();
        range.setStart(node, m.index ?? 0);
        range.setEnd(node, (m.index ?? 0) + m[0].length);
        const rects = [...range.getClientRects()].filter((r) => r.width > 0);
        if (!rects.length) continue;
        const r = rects[rects.length - 1];
        const cy = (r.top + r.bottom) / 2;
        const line = lines.find((l) => Math.abs(l.cy - cy) < tolerance);
        if (line) line.tokens.push(m[0]); else lines.push({ cy, tokens: [m[0]] });
      }
    }
    if (lines.length < 2) return;
    lines.sort((a, b) => a.cy - b.cy);
    const last = lines[lines.length - 1].tokens;
    const words = last.filter((t) => !PUNCT.test(t));
    const cjk = words.filter((t) => CJK.test(t)).length;
    const latin = words.length - cjk;
    const reason = !words.length ? '末行只有标点'
      : latin === 0 && cjk <= 2 ? `末行只有 ${cjk} 个字`
      : cjk === 0 && latin === 1 ? '末行只有 1 个词'
      : lines.some((l) => l.tokens.every((t) => PUNCT.test(t))) ? '有一行只有标点' : '';
    if (reason) {
      out.push({
        block: (block.getAttribute('class')?.split(' ')[0] || block.tagName.toLowerCase()).slice(0, 32),
        reason,
        lastLine: last.join(''),
        text: (block.textContent ?? '').replace(/[\s⁠]+/g, ' ').trim().slice(0, 60),
      });
    }
  });
  return out;
}

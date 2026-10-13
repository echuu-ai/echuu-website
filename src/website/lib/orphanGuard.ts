/**
 * 防孤字：任何一行都不能只剩一个词，或「一个字 + 标点」，也不能有只含标点的行（排版大忌，2026-10-13 Cory 定为硬性规定）。
 *
 * `text-wrap: pretty` 对中文不可靠（Chromium 实测仍会留下两个字的末行），旧版 Safari 也不支持，
 * 所以在浏览器里确定性地处理每段文字的结尾：
 * - 中日韩：末尾 3 个字（连同末尾标点）之间插零宽连接符 U+2060，换行时不会被拆开；
 * - 拉丁文：最后两个词之间的空格换成不换行空格；
 * - 中英混排按单位数：一个汉字 = 1，一个拉丁词 = 1，凑够 3 个单位或 2 个拉丁词为止。
 *
 * 「段」怎么划：
 * - 不按标签名列清单（会漏掉 <div> / <span> / <a> 写的文字），而是按实际显示方式：文字节点归属于最近的
 *   非 inline 祖先（块级、行内块、flex / grid 项、列表项……），这个祖先就是一个文字块；
 * - 文字块里的 <br> 是强制换行，<br> 前后各算一段，每段结尾都要处理
 *   （首屏引言「… out of life.」<br> 作者署名，第一段结尾就是漏在这里）。
 *
 * 只改屏幕上的文字节点，不动文案源文件；预渲染给搜索引擎的 HTML 不受影响。内容变化（切换语言等）后自动重做。
 */

// .hv-paper：开场纸面上的手写字是设计稿手动断的两行（white-space: pre），纸还整体旋转，不参与
const SKIP = 'input, textarea, select, option, code, pre, script, style, svg, [contenteditable], .seam-tune, .hv-paper, [data-no-orphan-guard]';
const WJ = '⁠';
const NBSP = ' ';
const CJK = /[぀-ヿ㐀-鿿가-힯豈-﫿]/;
const LETTER = /[\p{L}\p{N}]/u;
const MAX_GLUE = 30; // 粘住的末尾最多这么多字符，防止长邮箱、长网址整段不能断行

type Kind = 'cjk' | 'latin' | 'space' | 'punct';
const kindOf = (c: string): Kind => (/\s/.test(c) ? 'space' : CJK.test(c) ? 'cjk' : LETTER.test(c) ? 'latin' : 'punct');

/** 文字块 = 最近的非 inline 祖先；不会换行的（nowrap / pre）返回 null */
function ownerBlock(node: Node): Element | null {
  let el = node.parentElement;
  while (el) {
    const display = getComputedStyle(el).display;
    if (display !== 'inline' && display !== 'contents') break;
    el = el.parentElement;
  }
  if (!el) return null;
  const ws = getComputedStyle(el).whiteSpace;
  return ws === 'nowrap' || ws === 'pre' ? null : el;
}

/** 把 root 下所有可换行的文字按文字块分组，块内按 <br> 切段（顺序与文档顺序一致） */
function collectSegments(root: ParentNode): Map<Element, Text[][]> {
  const blocks = new Map<Element, Text[][]>();
  const lastBreak = new Map<Element, Element>(); // 每个块里最近遇到、还没切过段的 <br>
  const walker = document.createTreeWalker(root as Node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: (n) => {
      if (n.nodeType === Node.ELEMENT_NODE) {
        const el = n as Element;
        if (el.matches(SKIP)) return NodeFilter.FILTER_REJECT;
        return el.tagName === 'BR' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
      return (n as Text).data.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      // <br>：记到它所在的文字块上，下一个属于这个块的文字节点开新段
      const block = ownerBlock(node);
      if (block) lastBreak.set(block, node as Element);
      continue;
    }
    const text = node as Text;
    const block = ownerBlock(text);
    if (!block) continue;
    let segments = blocks.get(block);
    if (!segments) { segments = [[]]; blocks.set(block, segments); }
    if (lastBreak.has(block)) {
      if (segments[segments.length - 1].length) segments.push([]);
      lastBreak.delete(block);
    }
    segments[segments.length - 1].push(text);
  }
  return blocks;
}

type Pos = { node: Text; i: number };

/** 粘住一段文字的结尾 */
function glueTail(nodes: Text[]) {
  const tail: Pos[] = [];
  for (let n = nodes.length - 1; n >= 0 && tail.length <= MAX_GLUE; n -= 1) {
    const text = nodes[n].data;
    for (let i = text.length - 1; i >= 0 && tail.length <= MAX_GLUE; i -= 1) {
      if (text[i] === WJ) continue;
      if (!tail.length && /\s/.test(text[i])) continue;
      tail.push({ node: nodes[n], i });
    }
  }
  if (tail.length < 2) return;
  const kind = (j: number) => kindOf(tail[j].node.data[tail[j].i]);

  // 从末尾往前数单位，凑够「3 个单位」或「2 个拉丁词」为止，停在单位边界上（不把拉丁词从中间切开）
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
  if (stop < 0) return; // 整段很短，本来就不会出现孤字

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
    if (d !== node.data) node.data = d;
  }
}

/** 处理后的文字：内容没变就不重复处理；React 改了文字（切换语言等）就重新处理 */
const processed = new WeakMap<Element, string>();

export function guardOrphans(root: ParentNode = document) {
  for (const [block, segments] of collectSegments(root)) {
    if (processed.get(block) === block.textContent) continue;
    for (const segment of segments) glueTail(segment);
    processed.set(block, block.textContent ?? '');
  }
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
 * 段的划分和自动处理完全一致（按显示方式找文字块、按 <br> 切段）；按文字实际渲染位置拆行，
 * 用字 / 词矩形的垂直中心归行（容差 = 行高 40%，小字号标签不会被误判成另起一行）。
 * 每段的最后一行只剩 1 个拉丁词、≤ 2 个中日韩字，或任一行只有标点，都算孤字。
 */
export function findOrphans(root: ParentNode = document): OrphanReport[] {
  const PUNCT = /^[\p{P}\p{S}]+$/u;
  const token = /[぀-ヿ㐀-鿿가-힯豈-﫿]|[\p{L}\p{N}'’-]+|[^\s⁠ ]/gu;
  const out: OrphanReport[] = [];
  for (const [block, segments] of collectSegments(root)) {
    const rect = block.getBoundingClientRect();
    if (!rect.width || !rect.height) continue;
    const style = getComputedStyle(block);
    if (style.visibility === 'hidden') continue;
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.3;
    const tolerance = Math.max(6, lineHeight * 0.4);
    for (const segment of segments) {
      const lines: Array<{ cy: number; tokens: string[] }> = [];
      for (const node of segment) {
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
      if (lines.length < 2) continue;
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
          text: segment.map((n) => n.data).join('').replace(/[\s⁠]+/g, ' ').trim().slice(0, 60),
        });
      }
    }
  }
  return out;
}

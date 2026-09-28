/**
 * 大体积资产的 S3 地址。
 *
 * 这些文件不进仓库：Git LFS 配额有限，而音频/模型动辄几十上百 MB，放进去每次
 * clone 和 CI 都要重新拉。桶已配 `Access-Control-Allow-Origin: *` 和一年的
 * immutable 缓存，首次下载后走浏览器缓存。
 *
 * **不要用 `publicUrl()` 包这里的地址** —— 它会把每个路径段做 encodeURIComponent，
 * `https://` 会变成 `https%3A/`。这里自己按段编码。
 */

const S3_BASE = 'https://nextjs-vtuber-assets.s3.us-east-2.amazonaws.com';

/** 按段编码，保留 `/` 分隔符；文件名里的空格和中文都能正确转义。 */
export function s3Asset(keyFromBucketRoot: string): string {
  const encoded = keyFromBucketRoot
    .replace(/^\/+/, '')
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');
  return `${S3_BASE}/${encoded}`;
}

/**
 * 提前把音频塞进浏览器缓存。
 *
 * 礼物命中音要求「零延迟播放」，走 S3 后首次命中会多一次网络往返。进直播间时
 * 后台预取一遍就没有这个问题了 —— 用 `fetch` 而不是 `<audio preload>`，因为前者
 * 命中的是同一份 HTTP 缓存，且不会占用音频解码资源。
 */
export function prefetchAudio(urls: readonly string[]): void {
  if (typeof fetch !== 'function') return;
  for (const url of urls) {
    // 失败无所谓：真正播放时还会再请求一次，这里只是暖缓存
    void fetch(url, { mode: 'cors', cache: 'force-cache' }).catch(() => {});
  }
}

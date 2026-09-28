/**
 * `public/` 目录资源在浏览器中的 URL。
 *
 * 标准 Vite 下必须得到 **`/figma/...`** 这种「站点根」绝对路径；若误成 **`figma/...`**
 * 会变成相对当前 URL 的路径，在任意非根路径打开页面时会整站图片 404（裂图）。
 */
export function publicUrl(pathFromPublic: string): string {
  const path = pathFromPublic.replace(/^\/+/, '');
  const segments = path.split('/').filter((segment) => segment.length > 0);
  const encodedPath = segments.map((segment) => encodeURIComponent(segment)).join('/');

  let rawBase: string = import.meta.env.BASE_URL as string;
  if (rawBase == null || rawBase === '' || rawBase === 'undefined') {
    rawBase = '/';
  }

  if (rawBase === '/') {
    return encodedPath ? `/${encodedPath}` : '/';
  }

  const trimmed = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;
  return encodedPath ? `${trimmed}/${encodedPath}` : trimmed;
}

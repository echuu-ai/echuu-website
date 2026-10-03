import { useEffect, useRef, useState } from 'react';

/**
 * 透明底短片（Kling 生成、抠绿后转码），两种放法：
 * - 循环（默认）：静态图打底，进视口才加载、出视口就暂停；
 * - once：划到这里（露出约 40%）播一次，停在最后一帧。最后一帧就是原图（poster），
 *   播之前显示短片第一帧（startPoster），不会先闪原图再跳回开头。
 * 视频格式：Chrome / Firefox / Edge 用 WebM VP9 alpha；Safari 用 HEVC alpha（Safari 的 WebM 没有 alpha，会出黑底），按 UA 选源。
 * prefers-reduced-motion、或视频加载失败：一直是静态原图。
 */
export function LoopArt({ className, poster, startPoster, webm, hevc, once = false, alt = '', width, height }: {
  className: string;
  /** 原图：循环模式的底图；once 模式的最后一帧与降级图 */
  poster: string;
  /** once 模式：短片第一帧（透明底），播放前显示 */
  startPoster?: string;
  webm: string;
  hevc: string;
  once?: boolean;
  alt?: string;
  width?: number;
  height?: number;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [near, setNear] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reduced] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const [src] = useState(() => {
    if (typeof navigator === 'undefined') return webm;
    const safari = /^((?!chrome|chromium|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);
    return safari ? hevc : webm;
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reduced || failed) return;
    if (once) {
      // 提前 300px 开始加载；露出约 40% 时播一次
      let played = false;
      const loader = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setNear(true); }, { rootMargin: '300px 0px' });
      const player = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting || played) return;
        played = true;
        setNear(true);
        const start = () => video.play().catch(() => {});
        if (video.readyState >= 2) start(); else video.addEventListener('loadeddata', start, { once: true });
        player.disconnect();
      }, { threshold: 0.4 });
      loader.observe(video);
      player.observe(video);
      return () => { loader.disconnect(); player.disconnect(); };
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        // 第一次进来时 src 才挂上，autoPlay 负责开播；之后再进来直接 play
        setNear(true);
        if (video.currentSrc) video.play().catch(() => {});
      } else {
        video.pause();
      }
    }, { rootMargin: '300px 0px' });
    observer.observe(video);
    return () => observer.disconnect();
  }, [reduced, failed, once]);

  if (reduced || failed) {
    return <img className={className} src={poster} alt={alt} width={width} height={height} loading="lazy" decoding="async" aria-hidden={alt ? undefined : true} />;
  }
  return (
    <video
      ref={videoRef}
      className={className}
      poster={once ? startPoster ?? poster : poster}
      src={near ? src : undefined}
      width={width}
      height={height}
      autoPlay={!once}
      muted
      loop={!once}
      playsInline
      preload={once ? 'auto' : 'none'}
      disablePictureInPicture
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      onError={() => setFailed(true)}
    />
  );
}

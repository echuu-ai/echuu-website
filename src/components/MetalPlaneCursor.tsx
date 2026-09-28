import { forwardRef, memo, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { publicUrl } from '../lib/publicUrl';

export type MetalPlaneCursorHandle = { draw: (roll: number, pitch: number, heading: number, sparkle?: number, blurX?: number, blurY?: number) => boolean };

/** Lazy WebGL enhancement: the supplied SVG remains visible until a real frame is ready. */
export const MetalPlaneCursor = memo(forwardRef<MetalPlaneCursorHandle>(function MetalPlaneCursor(_, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<{ draw: (roll: number, pitch: number, heading: number, sparkle?: number, blurX?: number, blurY?: number) => void; dispose: () => void }>();
  const [ready, setReady] = useState(false);
  const [generation, setGeneration] = useState(0);
  const readyRef = useRef(false);
  useImperativeHandle(ref, () => ({ draw: (roll, pitch, heading, sparkle, blurX, blurY) => {
    if (!readyRef.current) return false;
    rendererRef.current?.draw(roll, pitch, heading, sparkle, blurX, blurY);
    return true;
  } }), []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !matchMedia('(pointer: fine) and (hover: hover)').matches) return;
    let cancelled = false;
    const lost = (event: Event) => { event.preventDefault(); readyRef.current = false; setReady(false); };
    const restored = () => setGeneration(value => value + 1);
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', restored);
    import('./three/paper-plane-cursor-renderer').then(({ createPaperPlaneRenderer }) => {
      if (cancelled) return;
      return createPaperPlaneRenderer(canvas, publicUrl('assets/cursor/crystal-arrow.glb'));
    }).then(renderer => {
      if (!renderer) return;
      if (cancelled) { renderer.dispose(); return; }
      rendererRef.current = renderer;
      readyRef.current = true;
      setReady(true);
    }).catch(() => { if (!cancelled) setReady(false); });
    return () => {
      cancelled = true;
      readyRef.current = false;
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
      rendererRef.current?.dispose();
      rendererRef.current = undefined;
    };
  }, [generation]);
  return <canvas ref={canvasRef} className="metal-plane-canvas" data-ready={ready} aria-hidden />;
}));

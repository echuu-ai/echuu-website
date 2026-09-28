import { memo } from 'react';
import { Canvas as FiberCanvas, type CanvasProps } from '@react-three/fiber';
import { ScenePaperPlane } from './ScenePaperPlane';

/** Every live 3D surface participates in cursor flight using its own depth buffer. */
export const FlightCanvas = memo(function FlightCanvas({ children, ...props }: CanvasProps) {
  return <FiberCanvas {...props}>{children}<ScenePaperPlane /></FiberCanvas>;
});

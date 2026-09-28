import * as THREE from 'three';
import { allPresets, mixamoPreset } from './presets';
import type { RigPreset } from './types';

/**
 * Score each preset against the source scene + first animation clip.
 *
 * Heuristic:
 *  - +3 for each `objectNames` candidate that exists in the scene
 *  - +1 for each `trackPatterns` regex that matches at least one track
 *  - +5 if any explicit boneMap key is found as an object in the scene
 *
 * Returns the highest-scoring preset, or null if no preset scored.
 */
export function detectRigPreset(
  source: THREE.Object3D,
  clip?: THREE.AnimationClip | null,
): RigPreset | null {
  const sceneNames = new Set<string>();
  source.traverse((child) => sceneNames.add(child.name));
  const trackNames = clip?.tracks.map((track) => track.name) ?? [];

  let best: { preset: RigPreset; score: number } | null = null;
  for (const preset of allPresets) {
    let score = 0;

    if (preset.detect?.objectNames) {
      for (const candidate of preset.detect.objectNames) {
        if (sceneNames.has(candidate)) score += 3;
      }
    }

    if (preset.detect?.trackPatterns) {
      for (const re of preset.detect.trackPatterns) {
        if (trackNames.some((name) => re.test(name))) score += 1;
      }
    }

    // Also count direct boneMap key matches in the scene — a strong signal
    let directBoneHits = 0;
    for (const key of Object.keys(preset.boneMap)) {
      if (sceneNames.has(key)) directBoneHits += 1;
      if (directBoneHits >= 4) break;
    }
    score += directBoneHits >= 4 ? 5 : directBoneHits;

    if (score > 0 && (!best || score > best.score)) {
      best = { preset, score };
    }
  }

  return best?.preset ?? null;
}

/**
 * Fallback preset when detection fails. Mixamo is the current default since
 * the library ships with a Mixamo running clip.
 */
export const fallbackPreset = mixamoPreset;

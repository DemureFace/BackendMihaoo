export const ALLOWED_SCALES = [1, 1.5, 2, 3, 4] as const;

export const DEFAULT_SCALE = 1.5;

export function normalizeScale(scale?: number) {
  return scale ?? DEFAULT_SCALE;
}

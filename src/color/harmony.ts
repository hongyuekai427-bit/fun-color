// Color Harmony Generation
import { RGB, HSL, wrapHue, hslToRgb, rgbToHsl } from './conversions';

export type HarmonyType = 'complementary' | 'analogous' | 'triadic' | 'split-complementary' | 'tetradic' | 'monochromatic';

export function getComplementary(hsl: HSL): RGB[] {
  return [
    hslToRgb(hsl),
    hslToRgb({ h: wrapHue(hsl.h + 180), s: hsl.s, l: hsl.l }),
  ];
}

export function getAnalogous(hsl: HSL): RGB[] {
  return [
    hslToRgb({ h: wrapHue(hsl.h - 30), s: hsl.s, l: hsl.l }),
    hslToRgb(hsl),
    hslToRgb({ h: wrapHue(hsl.h + 30), s: hsl.s, l: hsl.l }),
  ];
}

export function getTriadic(hsl: HSL): RGB[] {
  return [
    hslToRgb(hsl),
    hslToRgb({ h: wrapHue(hsl.h + 120), s: hsl.s, l: hsl.l }),
    hslToRgb({ h: wrapHue(hsl.h + 240), s: hsl.s, l: hsl.l }),
  ];
}

export function getSplitComplementary(hsl: HSL): RGB[] {
  return [
    hslToRgb(hsl),
    hslToRgb({ h: wrapHue(hsl.h + 150), s: hsl.s, l: hsl.l }),
    hslToRgb({ h: wrapHue(hsl.h + 210), s: hsl.s, l: hsl.l }),
  ];
}

export function getTetradic(hsl: HSL): RGB[] {
  return [
    hslToRgb(hsl),
    hslToRgb({ h: wrapHue(hsl.h + 90), s: hsl.s, l: hsl.l }),
    hslToRgb({ h: wrapHue(hsl.h + 180), s: hsl.s, l: hsl.l }),
    hslToRgb({ h: wrapHue(hsl.h + 270), s: hsl.s, l: hsl.l }),
  ];
}

export function getMonochromatic(hsl: HSL, steps: number = 5): RGB[] {
  const colors: RGB[] = [];
  const step = 80 / (steps - 1);
  for (let i = 0; i < steps; i++) {
    const l = 10 + i * step;
    colors.push(hslToRgb({ h: hsl.h, s: hsl.s, l: clamp(l, 5, 95) }));
  }
  return colors;
}

function clamp(v: number, min: number, max: number) { return Math.min(Math.max(v, min), max); }

export function getHarmony(type: HarmonyType, hsl: HSL): RGB[] {
  switch (type) {
    case 'complementary': return getComplementary(hsl);
    case 'analogous': return getAnalogous(hsl);
    case 'triadic': return getTriadic(hsl);
    case 'split-complementary': return getSplitComplementary(hsl);
    case 'tetradic': return getTetradic(hsl);
    case 'monochromatic': return getMonochromatic(hsl);
    default: return [hslToRgb(hsl)];
  }
}

export function getHarmonyAngles(type: HarmonyType): number[] {
  switch (type) {
    case 'complementary': return [0, 180];
    case 'analogous': return [-30, 0, 30];
    case 'triadic': return [0, 120, 240];
    case 'split-complementary': return [0, 150, 210];
    case 'tetradic': return [0, 90, 180, 270];
    case 'monochromatic': return [0];
    default: return [0];
  }
}

// Tint: mix with white
export function getTints(rgb: RGB, steps: number = 5): RGB[] {
  const colors: RGB[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    colors.push({
      r: Math.round(rgb.r + (255 - rgb.r) * t),
      g: Math.round(rgb.g + (255 - rgb.g) * t),
      b: Math.round(rgb.b + (255 - rgb.b) * t),
    });
  }
  return colors;
}

// Shade: mix with black
export function getShades(rgb: RGB, steps: number = 5): RGB[] {
  const colors: RGB[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    colors.push({
      r: Math.round(rgb.r * (1 - t)),
      g: Math.round(rgb.g * (1 - t)),
      b: Math.round(rgb.b * (1 - t)),
    });
  }
  return colors;
}

// Tone: mix with gray
export function getTones(rgb: RGB, steps: number = 5): RGB[] {
  const colors: RGB[] = [];
  const gray = { r: 128, g: 128, b: 128 };
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    colors.push({
      r: Math.round(rgb.r + (gray.r - rgb.r) * t),
      g: Math.round(rgb.g + (gray.g - rgb.g) * t),
      b: Math.round(rgb.b + (gray.b - rgb.b) * t),
    });
  }
  return colors;
}

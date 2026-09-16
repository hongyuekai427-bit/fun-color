// Delta E - Perceptual Color Difference
// Implements CIE76 (simplified) and CIEDE2000 approximation
import { RGB, rgbToOklab, rgbToOklch, rgbToHsl } from './conversions';

// CIE76 Delta E (simplified, fast)
export function deltaE76(a: RGB, b: RGB): number {
  const labA = rgbToOklab(a);
  const labB = rgbToOklab(b);
  const dL = labA.l - labB.l;
  const da = labA.a - labB.a;
  const db = labA.b - labB.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

// OKLCH-based perceptual difference (more perceptually uniform)
export function deltaEOK(a: RGB, b: RGB): number {
  const oklchA = rgbToOklch(a);
  const oklchB = rgbToOklch(b);
  const dL = oklchA.l - oklchB.l;
  const dC = oklchA.c - oklchB.c;
  // Handle hue difference with wrapping
  let dH = Math.abs(oklchA.h - oklchB.h);
  if (dH > 180) dH = 360 - dH;
  const dH_rad = dH * Math.PI / 180;
  const avgC = (oklchA.c + oklchB.c) / 2;
  return Math.sqrt(dL * dL + dC * dC + (avgC * dH_rad) * (avgC * dH_rad));
}

// Convert deltaE to a 0-100 score (approximate)
export function deltaEToScore(deltaE: number): number {
  // deltaE of 0 = perfect match (100)
  // deltaE of ~1 = just noticeable difference
  // deltaE of ~5 = clearly different
  // deltaE of ~10+ = very different
  // Map to 0-100 score
  const score = Math.max(0, 100 - deltaE * 10);
  return Math.round(score * 10) / 10;
}

// Get detailed color difference breakdown
export function getColorDifference(a: RGB, b: RGB) {
  const hslA = rgbToHsl(a);
  const hslB = rgbToHsl(b);
  
  let hueDiff = Math.abs(hslA.h - hslB.h);
  if (hueDiff > 180) hueDiff = 360 - hueDiff;
  
  const satDiff = hslA.s - hslB.s;
  const lightDiff = hslA.l - hslB.l;
  const deltaE = deltaEOK(a, b);
  const score = deltaEToScore(deltaE);
  
  return {
    deltaE: Math.round(deltaE * 100) / 100,
    score,
    hueDiff: Math.round(hueDiff * 10) / 10,
    satDiff: Math.round(satDiff * 10) / 10,
    lightDiff: Math.round(lightDiff * 10) / 10,
    primaryError: getPrimaryError(hueDiff, Math.abs(satDiff), Math.abs(lightDiff)),
  };
}

function getPrimaryError(hueDiff: number, satDiff: number, lightDiff: number): 'hue' | 'saturation' | 'lightness' | 'balanced' {
  const errors = [
    { type: 'hue' as const, value: hueDiff / 360 * 100 },
    { type: 'saturation' as const, value: satDiff },
    { type: 'lightness' as const, value: lightDiff },
  ];
  errors.sort((a, b) => b.value - a.value);
  if (errors[0].value - errors[1].value < 10) return 'balanced';
  return errors[0].type;
}

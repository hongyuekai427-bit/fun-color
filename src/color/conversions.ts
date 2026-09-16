// Color Conversion Engine
// Supports: HEX, RGB, HSL, HSV, OKLCH

export interface RGB { r: number; g: number; b: number; }
export interface RGBA { r: number; g: number; b: number; a: number; }
export interface HSL { h: number; s: number; l: number; }
export interface HSV { h: number; s: number; v: number; }
export interface OKLCH { l: number; c: number; h: number; }

// Clamp utility
export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

// Wrap hue to 0-360
export function wrapHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

// HEX to RGB
export function hexToRgb(hex: string): RGB | null {
  const cleaned = hex.replace(/^#/, '');
  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return { r, g, b };
  }
  if (cleaned.length === 6) {
    const r = parseInt(cleaned.substring(0, 2), 16);
    const g = parseInt(cleaned.substring(2, 4), 16);
    const b = parseInt(cleaned.substring(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return { r, g, b };
  }
  return null;
}

// RGB to HEX
export function rgbToHex(rgb: RGB): string {
  const r = clamp(Math.round(rgb.r), 0, 255);
  const g = clamp(Math.round(rgb.g), 0, 255);
  const b = clamp(Math.round(rgb.b), 0, 255);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

// RGB to HSL
export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  
  return { h: h * 360, s: s * 100, l: l * 100 };
}

// HSL to RGB
export function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;
  
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  
  return {
    r: Math.round(hue2rgb(p, q, h + 1/3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1/3) * 255),
  };
}

// RGB to HSV
export function rgbToHsv(rgb: RGB): HSV {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  
  return { h: h * 360, s: s * 100, v: v * 100 };
}

// HSV to RGB
export function hsvToRgb(hsv: HSV): RGB {
  const h = hsv.h / 360;
  const s = hsv.s / 100;
  const v = hsv.v / 100;
  
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  
  let r: number, g: number, b: number;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
    default: r = 0; g = 0; b = 0;
  }
  
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

// sRGB linearization
function srgbToLinear(c: number): number {
  c = c / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1/2.4) - 0.055;
  return Math.round(clamp(v, 0, 1) * 255);
}

// RGB to OKLab (via XYZ D65)
export function rgbToOklab(rgb: RGB): { l: number; a: number; b: number } {
  const lr = srgbToLinear(rgb.r);
  const lg = srgbToLinear(rgb.g);
  const lb = srgbToLinear(rgb.b);
  
  const l_ = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m_ = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s_ = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  
  const l_c = Math.cbrt(l_);
  const m_c = Math.cbrt(m_);
  const s_c = Math.cbrt(s_);
  
  return {
    l: 0.2104542553 * l_c + 0.7936177850 * m_c - 0.0040720468 * s_c,
    a: 1.9779984951 * l_c - 2.4285922050 * m_c + 0.4505937099 * s_c,
    b: 0.0259040371 * l_c + 0.7827717662 * m_c - 0.8086757660 * s_c,
  };
}

function oklabToRgb(lab: { l: number; a: number; b: number }): RGB {
  const l_ = lab.l + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
  const m_ = lab.l - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
  const s_ = lab.l - 0.0894841775 * lab.a - 1.2914855480 * lab.b;
  
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  
  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  
  return {
    r: linearToSrgb(r),
    g: linearToSrgb(g),
    b: linearToSrgb(b),
  };
}

// RGB to OKLCH
export function rgbToOklch(rgb: RGB): OKLCH {
  const lab = rgbToOklab(rgb);
  const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  let h = Math.atan2(lab.b, lab.a) * 180 / Math.PI;
  if (h < 0) h += 360;
  return { l: lab.l, c, h };
}

// OKLCH to RGB
export function oklchToRgb(oklch: OKLCH): RGB {
  const hRad = oklch.h * Math.PI / 180;
  const a = oklch.c * Math.cos(hRad);
  const b = oklch.c * Math.sin(hRad);
  return oklabToRgb({ l: oklch.l, a, b });
}

// Format helpers
export function formatHex(rgb: RGB): string {
  return rgbToHex(rgb);
}

export function formatRgb(rgb: RGB): string {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

export function formatHsl(hsl: HSL): string {
  return `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`;
}

export function formatOklch(oklch: OKLCH): string {
  return `oklch(${(oklch.l * 100).toFixed(1)}% ${oklch.c.toFixed(3)} ${oklch.h.toFixed(1)})`;
}

// Parse any color string
export function parseColor(input: string): RGB | null {
  input = input.trim();
  
  // Try HEX
  if (input.startsWith('#')) {
    return hexToRgb(input);
  }
  
  // Try rgb()
  const rgbMatch = input.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (rgbMatch) {
    return { r: parseInt(rgbMatch[1]), g: parseInt(rgbMatch[2]), b: parseInt(rgbMatch[3]) };
  }
  
  // Try hsl()
  const hslMatch = input.match(/hsl\(\s*(\d+\.?\d*)\s*,\s*(\d+\.?\d*)%?\s*,\s*(\d+\.?\d*)%?\s*\)/);
  if (hslMatch) {
    return hslToRgb({ h: parseFloat(hslMatch[1]), s: parseFloat(hslMatch[2]), l: parseFloat(hslMatch[3]) });
  }
  
  return null;
}

// Get relative luminance (WCAG)
export function relativeLuminance(rgb: RGB): number {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Contrast ratio (WCAG 2.x)
export function contrastRatio(fg: RGB, bg: RGB): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// WCAG compliance levels
export function wcagLevel(ratio: number, isLargeText: boolean = false): { aa: boolean; aaa: boolean } {
  if (isLargeText) {
    return { aa: ratio >= 3, aaa: ratio >= 4.5 };
  }
  return { aa: ratio >= 4.5, aaa: ratio >= 7 };
}

// Perceptual lightness approximation
export function perceivedLightness(rgb: RGB): number {
  return relativeLuminance(rgb) * 100;
}

// Is color "light" or "dark" - for text color decisions
export function isLightColor(rgb: RGB): boolean {
  return relativeLuminance(rgb) > 0.179;
}

// Get contrasting text color
export function getContrastText(rgb: RGB): string {
  return isLightColor(rgb) ? '#000000' : '#ffffff';
}

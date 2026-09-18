// Color Vision Simulation
// Simulates common forms of color vision deficiency
import { RGB, clamp } from './conversions';

// Brettel/Viénot simulation matrices for color vision deficiency
// Based on research by Brettel, Viénot, and Mollon (1997)

type SimMatrix = [[number, number, number], [number, number, number], [number, number, number]];

function multiplyMatrix(matrix: SimMatrix, rgb: RGB): RGB {
  return {
    r: clamp(Math.round(matrix[0][0] * rgb.r + matrix[0][1] * rgb.g + matrix[0][2] * rgb.b), 0, 255),
    g: clamp(Math.round(matrix[1][0] * rgb.r + matrix[1][1] * rgb.g + matrix[1][2] * rgb.b), 0, 255),
    b: clamp(Math.round(matrix[2][0] * rgb.r + matrix[2][1] * rgb.g + matrix[2][2] * rgb.b), 0, 255),
  };
}

// Protanopia (red-blind) simulation matrix
const protanopiaMatrix: SimMatrix = [
  [0.567, 0.433, 0.000],
  [0.558, 0.442, 0.000],
  [0.000, 0.242, 0.758],
];

// Deuteranopia (green-blind) simulation matrix
const deuteranopiaMatrix: SimMatrix = [
  [0.625, 0.375, 0.000],
  [0.700, 0.300, 0.000],
  [0.000, 0.300, 0.700],
];

// Tritanopia (blue-blind) simulation matrix
const tritanopiaMatrix: SimMatrix = [
  [0.950, 0.050, 0.000],
  [0.000, 0.433, 0.567],
  [0.000, 0.475, 0.525],
];

// Achromatopsia (total color blindness) - grayscale
function achromatopsia(rgb: RGB): RGB {
  const gray = Math.round(0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b);
  return { r: gray, g: gray, b: gray };
}

export type CVDeficiency = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

export function simulateColorVision(rgb: RGB, type: CVDeficiency): RGB {
  switch (type) {
    case 'protanopia': return multiplyMatrix(protanopiaMatrix, rgb);
    case 'deuteranopia': return multiplyMatrix(deuteranopiaMatrix, rgb);
    case 'tritanopia': return multiplyMatrix(tritanopiaMatrix, rgb);
    case 'achromatopsia': return achromatopsia(rgb);
    default: return rgb;
  }
}

export const cvDeficiencyLabels: Record<CVDeficiency, string> = {
  normal: 'Normal Vision',
  protanopia: 'Protanopia (Red-blind)',
  deuteranopia: 'Deuteranopia (Green-blind)',
  tritanopia: 'Tritanopia (Blue-blind)',
  achromatopsia: 'Achromatopsia (Total)',
};

// Extract all colors from image data, sorted by frequency
export function extractAllColors(imageData: ImageData): { color: RGB; count: number }[] {
  const data = imageData.data;
  const colorMap = new Map<string, { color: RGB; count: number }>();
  
  // Quantize colors to reduce palette (group similar colors)
  const quantize = (v: number) => Math.round(v / 16) * 16;
  
  for (let i = 0; i < data.length; i += 4) { // Process every pixel
    const r = quantize(data[i]);
    const g = quantize(data[i + 1]);
    const b = quantize(data[i + 2]);
    const a = data[i + 3];
    
    if (a < 128) continue; // Skip transparent pixels
    
    const key = `${r},${g},${b}`;
    const existing = colorMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      colorMap.set(key, { color: { r, g, b }, count: 1 });
    }
  }
  
  // Sort by frequency (most common first)
  const sorted = Array.from(colorMap.values())
    .sort((a, b) => b.count - a.count);
  
  return sorted;
}

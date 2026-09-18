import React, { createContext, useContext, useState, ReactNode } from 'react';
import { RGB, HSL, HSV, OKLCH, rgbToHsl, rgbToHsv, rgbToOklch, hslToRgb, hsvToRgb, oklchToRgb, rgbToHex, hexToRgb } from './color';

interface GlobalColorState {
  rgb: RGB;
  hex: string;
  hsl: HSL;
  hsv: HSV;
  oklch: OKLCH;
}

interface GlobalColorContextType {
  color: GlobalColorState;
  setColor: (rgb: RGB) => void;
  setFromHex: (hex: string) => void;
  setFromHsl: (hsl: HSL) => void;
  setFromHsv: (hsv: HSV) => void;
  setFromOklch: (oklch: OKLCH) => void;
}

const defaultColor: RGB = { r: 108, g: 99, b: 255 };

const GlobalColorContext = createContext<GlobalColorContextType | undefined>(undefined);

export function GlobalColorProvider({ children }: { children: ReactNode }) {
  const [rgb, setRgb] = useState<RGB>(defaultColor);

  const color: GlobalColorState = {
    rgb,
    hex: rgbToHex(rgb),
    hsl: rgbToHsl(rgb),
    hsv: rgbToHsv(rgb),
    oklch: rgbToOklch(rgb),
  };

  const setColor = (newRgb: RGB) => {
    setRgb(newRgb);
  };

  const setFromHex = (hex: string) => {
    const parsed = hexToRgb(hex);
    if (parsed) setRgb(parsed);
  };

  const setFromHsl = (hsl: HSL) => {
    setRgb(hslToRgb(hsl));
  };

  const setFromHsv = (hsv: HSV) => {
    setRgb(hsvToRgb(hsv));
  };

  const setFromOklch = (oklch: OKLCH) => {
    setRgb(oklchToRgb(oklch));
  };

  return (
    <GlobalColorContext.Provider value={{ color, setColor, setFromHex, setFromHsl, setFromHsv, setFromOklch }}>
      {children}
    </GlobalColorContext.Provider>
  );
}

export function useGlobalColor() {
  const context = useContext(GlobalColorContext);
  if (!context) {
    throw new Error('useGlobalColor must be used within GlobalColorProvider');
  }
  return context;
}

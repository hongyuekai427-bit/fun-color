import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTheme, useLocalStorage, useCopyToClipboard } from './hooks';
import {
  RGB, HSL, HSV, OKLCH,
  hexToRgb, rgbToHex, rgbToHsl, hslToRgb, rgbToHsv, hsvToRgb,
  rgbToOklch, oklchToRgb, formatHex, formatRgb, formatHsl, formatOklch,
  parseColor, contrastRatio, wcagLevel, isLightColor, getContrastText, wrapHue, clamp,
  getHarmony, getHarmonyAngles, getTints, getShades, getTones, HarmonyType,
  deltaEOK, deltaEToScore, getColorDifference,
  simulateColorVision, extractAllColors, cvDeficiencyLabels, CVDeficiency,
} from './color';

// ==================== SHARED COMPONENTS ====================

function ColorSwatch({ color, size = 'md', label, onClick, showHex = true, className = '' }: {
  color: RGB | string; size?: 'sm' | 'md' | 'lg' | 'xl'; label?: string; onClick?: () => void; showHex?: boolean; className?: string;
}) {
  const hex = typeof color === 'string' ? color : rgbToHex(color);
  const sizes = { sm: 'w-8 h-8', md: 'w-12 h-12', lg: 'w-16 h-16', xl: 'w-24 h-24' };
  const textSizes = { sm: 'text-[8px]', md: 'text-[9px]', lg: 'text-[10px]', xl: 'text-xs' };
  
  return (
    <button
      onClick={onClick}
      className={`${sizes[size]} rounded-lg color-swatch flex flex-col items-center justify-center cursor-pointer relative overflow-hidden ${className}`}
      style={{ backgroundColor: hex }}
      aria-label={label || `Color ${hex}`}
      title={label || hex}
    >
      {showHex && size !== 'sm' && (
        <span className={`${textSizes[size]} font-mono font-medium`} style={{ color: getContrastText(hexToRgb(hex)!) }}>
          {hex.toUpperCase()}
        </span>
      )}
    </button>
  );
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const { copied, copy } = useCopyToClipboard();
  const isCopied = copied === text;
  return (
    <button
      onClick={() => copy(text)}
      className="px-2 py-1 text-xs rounded bg-[var(--bg-elevated)] hover:bg-[var(--border)] text-[var(--text-secondary)] transition-colors"
      aria-label={`${label}: ${text}`}
    >
      {isCopied ? '✓ Copied' : label}
    </button>
  );
}

function Slider({ value, onChange, min, max, step = 1, label, gradient }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step?: number; label: string; gradient?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-[var(--text-secondary)]">
        <label>{label}</label>
        <span className="font-mono">{Math.round(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={gradient ? { background: gradient } : undefined}
        aria-label={label}
        className="w-full"
      />
    </div>
  );
}

function SectionTitle({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-[var(--text-primary)]">{children}</h2>
      {subtitle && <p className="text-[var(--text-secondary)] mt-1">{subtitle}</p>}
    </div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl p-6 bg-[var(--bg-surface)] border border-[var(--border)] ${className}`}>
      {children}
    </div>
  );
}

// ==================== NAVIGATION ====================

const navItems = [
  { path: '/', label: 'Home', icon: '🏠' },
  { path: '/lab', label: 'Color Lab', icon: '🔬' },
  { path: '/wheel', label: 'Color Wheel', icon: '🎡' },
  { path: '/harmony', label: 'Harmony', icon: '🎵' },
  { path: '/palette', label: 'Palette', icon: '🎨' },
  { path: '/image', label: 'Image', icon: '🖼️' },
  { path: '/theory', label: 'Theory', icon: '📚' },
  { path: '/games', label: 'Games', icon: '🎮' },
  { path: '/accessibility', label: 'A11y', icon: '♿' },
  { path: '/science', label: 'Science', icon: '🔭' },
  { path: '/dev', label: 'Dev Tools', icon: '⚡' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

function Layout({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
            <span className="hidden sm:inline">Color Theory Lab</span>
            <span className="sm:hidden">CTL</span>
          </NavLink>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1" role="navigation" aria-label="Main navigation">
            {navItems.slice(1).map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `px-3 py-1.5 text-sm rounded-lg transition-colors ${isActive ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
              aria-label="Search (Ctrl+K)"
            >
              🔍
            </button>
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-[var(--bg-elevated)]"
              aria-label="Toggle menu"
              aria-expanded={mobileNavOpen}
            >
              {mobileNavOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileNavOpen && (
          <nav className="lg:hidden border-t border-[var(--border)] p-4 grid grid-cols-3 gap-2 animate-fade-in" role="navigation" aria-label="Mobile navigation">
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 p-3 rounded-lg text-xs ${isActive ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`
                }
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      {/* Search Modal */}
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-6 text-center text-sm text-[var(--text-muted)]">
        <p>Color Theory Lab — Learn color by seeing it. Play with color by matching it.</p>
        <p className="mt-1">Privacy-first • No tracking • All data stays local</p>
      </footer>
    </div>
  );
}

// ==================== SEARCH MODAL ====================

function SearchModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const results = query.length > 0 ? navItems.filter(item =>
    item.label.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8) : [];

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg mx-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-2xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-[var(--border)]">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search pages, tools, concepts..."
            className="w-full bg-transparent text-lg outline-none placeholder:text-[var(--text-muted)]"
            aria-label="Search"
          />
        </div>
        {results.length > 0 && (
          <div className="p-2 max-h-80 overflow-y-auto">
            {results.map(item => (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); onClose(); }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bg-elevated)] text-left transition-colors"
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}
        <div className="p-3 border-t border-[var(--border)] text-xs text-[var(--text-muted)] flex justify-between">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}

// ==================== HOME PAGE ====================

function HomePage() {
  const navigate = useNavigate();
  
  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="text-center py-12 md:py-20">
        <div className="inline-block mb-6">
          <ColorWheelMini />
        </div>
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          <span className="gradient-text">Color Theory Lab</span>
        </h1>
        <p className="text-xl text-[var(--text-secondary)] mb-8 max-w-2xl mx-auto">
          Learn color by seeing it. Play with color by matching it.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={() => navigate('/theory')} className="px-6 py-3 rounded-xl bg-[var(--accent)] text-white font-medium hover:opacity-90 transition-opacity">
            📚 Explore Color Theory
          </button>
          <button onClick={() => navigate('/lab')} className="px-6 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] font-medium hover:bg-[var(--bg-elevated)] transition-colors">
            🔬 Open Color Lab
          </button>
          <button onClick={() => navigate('/games/match')} className="px-6 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] font-medium hover:bg-[var(--bg-elevated)] transition-colors">
            🎯 Color Match
          </button>
          <button onClick={() => navigate('/games/memory')} className="px-6 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] font-medium hover:bg-[var(--bg-elevated)] transition-colors">
            🧠 Color Memory
          </button>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 py-12">
        <FeatureCard
          icon="📚"
          title="Learn"
          description="Understand hue, saturation, lightness, value, chroma, tint, shade, tone, warm vs cool colors, harmony, interaction, contrast, and accessibility."
          onClick={() => navigate('/theory')}
        />
        <FeatureCard
          icon="🎨"
          title="Create"
          description="Color picking, palette generation, harmony generation, image palette extraction, gradients, and color conversions."
          onClick={() => navigate('/palette')}
        />
        <FeatureCard
          icon="🎮"
          title="Play"
          description="Color Match, Color Memory, Color Sequence, and Odd Color challenges."
          onClick={() => navigate('/games')}
        />
        <FeatureCard
          icon="🔭"
          title="Understand"
          description="RGB, HSL, HSV, OKLCH, sRGB, Display-P3, color gamut, perceptual difference, and color science."
          onClick={() => navigate('/science')}
        />
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description, onClick }: { icon: string; title: string; description: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left p-6 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] hover:border-[var(--accent)] transition-all group">
      <span className="text-3xl mb-3 block">{icon}</span>
      <h3 className="text-lg font-semibold mb-2 group-hover:text-[var(--accent)] transition-colors">{title}</h3>
      <p className="text-sm text-[var(--text-secondary)]">{description}</p>
    </button>
  );
}

// Mini color wheel for hero
function ColorWheelMini() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const size = 160;
    canvas.width = size;
    canvas.height = size;
    const center = size / 2;
    const radius = size / 2 - 4;
    
    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = (angle - 1) * Math.PI / 180;
      const endAngle = (angle + 1) * Math.PI / 180;
      
      const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius);
      gradient.addColorStop(0, `hsl(${angle}, 10%, 50%)`);
      gradient.addColorStop(0.5, `hsl(${angle}, 70%, 50%)`);
      gradient.addColorStop(1, `hsl(${angle}, 100%, 50%)`);
      
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    }
    
    // Center hole
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim() || '#0a0a0f';
    ctx.fill();
  }, []);
  
  return <canvas ref={canvasRef} className="w-40 h-40 rounded-full" aria-label="Interactive color wheel" />;
}

// ==================== COLOR LAB PAGE ====================

type LabMode = 'HEX' | 'RGB' | 'HSL' | 'HSV' | 'OKLCH';

function ColorLabPage() {
  const [hex, setHex] = useState('#6C63FF');
  const [rgb, setRgb] = useState<RGB>({ r: 108, g: 99, b: 255 });
  const [hsl, setHsl] = useState<HSL>({ h: 243, s: 100, l: 69 });
  const [hsv, setHsv] = useState<HSV>({ h: 243, s: 61, v: 100 });
  const [oklch, setOklch] = useState<OKLCH>({ l: 0.55, c: 0.22, h: 290 });
  const [mode, setMode] = useState<LabMode>('HSL');
  const { copy, copied } = useCopyToClipboard();

  const syncFromRgb = (newRgb: RGB) => {
    setRgb(newRgb);
    setHex(rgbToHex(newRgb));
    setHsl(rgbToHsl(newRgb));
    setHsv(rgbToHsv(newRgb));
    setOklch(rgbToOklch(newRgb));
  };

  const updateFromHex = (newHex: string) => {
    const parsed = hexToRgb(newHex);
    if (!parsed) return;
    syncFromRgb(parsed);
  };

  const updateFromHsl = (newHsl: HSL) => syncFromRgb(hslToRgb(newHsl));
  const updateFromHsv = (newHsv: HSV) => syncFromRgb(hsvToRgb(newHsv));
  const updateFromOklch = (newOklch: OKLCH) => {
    const newRgb = oklchToRgb(newOklch);
    setOklch(newOklch);
    setRgb(newRgb);
    setHex(rgbToHex(newRgb));
    setHsl(rgbToHsl(newRgb));
    setHsv(rgbToHsv(newRgb));
  };

  return (
    <div className="animate-fade-in">
      <SectionTitle subtitle="Select and manipulate colors across all color models">Color Lab</SectionTitle>
      
      {/* Mode Selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['HEX', 'RGB', 'HSL', 'HSV', 'OKLCH'] as LabMode[]).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === m ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`}>
            {m}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Preview + Controls */}
        <Card>
          <div className="w-full h-48 rounded-xl mb-4 relative overflow-hidden" style={{ backgroundColor: hex }}>
            <span className="absolute bottom-3 right-3 px-2 py-1 rounded text-xs font-mono bg-black/30 text-white">
              {hex.toUpperCase()}
            </span>
          </div>

          {/* Native color picker always available */}
          <div className="flex items-center gap-2 mb-4">
            <input
              type="color"
              value={hex}
              onChange={e => updateFromHex(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer border-0"
              aria-label="Color picker"
            />
            <span className="text-sm text-[var(--text-secondary)]">Native picker</span>
          </div>
          
          {/* Mode-specific controls */}
          {mode === 'HEX' && (
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] mb-1 block">HEX Value</label>
              <input
                type="text"
                value={hex}
                onChange={e => {
                  const val = e.target.value;
                  setHex(val);
                  const parsed = hexToRgb(val.startsWith('#') ? val : '#' + val);
                  if (parsed) syncFromRgb(parsed);
                }}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] font-mono text-sm"
                aria-label="Hex color value"
              />
            </div>
          )}

          {mode === 'RGB' && (
            <div className="space-y-3">
              <Slider label="Red (R)" value={rgb.r} onChange={v => syncFromRgb({ ...rgb, r: v })} min={0} max={255}
                gradient={`linear-gradient(to right, rgb(0,${rgb.g},${rgb.b}), rgb(255,${rgb.g},${rgb.b}))`} />
              <Slider label="Green (G)" value={rgb.g} onChange={v => syncFromRgb({ ...rgb, g: v })} min={0} max={255}
                gradient={`linear-gradient(to right, rgb(${rgb.r},0,${rgb.b}), rgb(${rgb.r},255,${rgb.b}))`} />
              <Slider label="Blue (B)" value={rgb.b} onChange={v => syncFromRgb({ ...rgb, b: v })} min={0} max={255}
                gradient={`linear-gradient(to right, rgb(${rgb.r},${rgb.g},0), rgb(${rgb.r},${rgb.g},255))`} />
              <div className="grid grid-cols-3 gap-2 mt-2">
                {(['r', 'g', 'b'] as const).map(ch => (
                  <div key={ch}>
                    <label className="text-xs text-[var(--text-muted)] uppercase">{ch}</label>
                    <input type="number" min={0} max={255} value={rgb[ch]}
                      onChange={e => syncFromRgb({ ...rgb, [ch]: clamp(parseInt(e.target.value) || 0, 0, 255) })}
                      className="w-full px-2 py-1 rounded bg-[var(--bg-elevated)] border border-[var(--border)] font-mono text-sm"
                      aria-label={`${ch} channel`} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {mode === 'HSL' && (
            <div className="space-y-3">
              <Slider label="Hue" value={hsl.h} onChange={v => updateFromHsl({ ...hsl, h: v })} min={0} max={360}
                gradient="linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))" />
              <Slider label="Saturation" value={hsl.s} onChange={v => updateFromHsl({ ...hsl, s: v })} min={0} max={100}
                gradient={`linear-gradient(to right, hsl(${hsl.h},0%,${hsl.l}%), hsl(${hsl.h},100%,${hsl.l}%))`} />
              <Slider label="Lightness" value={hsl.l} onChange={v => updateFromHsl({ ...hsl, l: v })} min={0} max={100}
                gradient={`linear-gradient(to right, hsl(${hsl.h},${hsl.s}%,0%), hsl(${hsl.h},${hsl.s}%,50%), hsl(${hsl.h},${hsl.s}%,100%))`} />
            </div>
          )}

          {mode === 'HSV' && (
            <div className="space-y-3">
              <Slider label="Hue" value={hsv.h} onChange={v => updateFromHsv({ ...hsv, h: v })} min={0} max={360}
                gradient="linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))" />
              <Slider label="Saturation" value={hsv.s} onChange={v => updateFromHsv({ ...hsv, s: v })} min={0} max={100}
                gradient={`linear-gradient(to right, rgb(${Math.round(hsvToRgb({ ...hsv, s: 0 }).r)},${Math.round(hsvToRgb({ ...hsv, s: 0 }).g)},${Math.round(hsvToRgb({ ...hsv, s: 0 }).b)}), ${rgbToHex(hsvToRgb({ ...hsv, s: 100 }))})`} />
              <Slider label="Value" value={hsv.v} onChange={v => updateFromHsv({ ...hsv, v: v })} min={0} max={100}
                gradient={`linear-gradient(to right, #000000, ${rgbToHex(hsvToRgb({ ...hsv, v: 100 }))})`} />
            </div>
          )}

          {mode === 'OKLCH' && (
            <div className="space-y-3">
              <Slider label="Lightness (L)" value={oklch.l * 100} onChange={v => updateFromOklch({ ...oklch, l: v / 100 })} min={0} max={100}
                gradient="linear-gradient(to right, #000, #fff)" />
              <Slider label="Chroma (C)" value={oklch.c * 100} onChange={v => updateFromOklch({ ...oklch, c: v / 100 })} min={0} max={40} step={0.1} />
              <Slider label="Hue (H)" value={oklch.h} onChange={v => updateFromOklch({ ...oklch, h: v })} min={0} max={360}
                gradient="linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))" />
            </div>
          )}
        </Card>

        {/* Values */}
        <Card>
          <h3 className="font-semibold mb-4">All Color Values</h3>
          <div className="space-y-3">
            <ValueRow label="HEX" value={hex.toUpperCase()} onCopy={() => copy(hex.toUpperCase())} copied={copied === hex.toUpperCase()} />
            <ValueRow label="RGB" value={formatRgb(rgb)} onCopy={() => copy(formatRgb(rgb))} copied={copied === formatRgb(rgb)} />
            <ValueRow label="HSL" value={formatHsl(hsl)} onCopy={() => copy(formatHsl(hsl))} copied={copied === formatHsl(hsl)} />
            <ValueRow label="HSV" value={`hsv(${Math.round(hsv.h)}, ${Math.round(hsv.s)}%, ${Math.round(hsv.v)}%)`} onCopy={() => copy(`hsv(${Math.round(hsv.h)}, ${Math.round(hsv.s)}%, ${Math.round(hsv.v)}%)`)} copied={copied === `hsv(${Math.round(hsv.h)}, ${Math.round(hsv.s)}%, ${Math.round(hsv.v)}%)`} />
            <ValueRow label="OKLCH" value={formatOklch(oklch)} onCopy={() => copy(formatOklch(oklch))} copied={copied === formatOklch(oklch)} />
            <ValueRow label="CSS" value={`color: ${hex};`} onCopy={() => copy(`color: ${hex};`)} copied={copied === `color: ${hex};`} />
            <ValueRow label="JSON" value={`{"hex":"${hex}","r":${rgb.r},"g":${rgb.g},"b":${rgb.b}}`} onCopy={() => copy(`{"hex":"${hex}","r":${rgb.r},"g":${rgb.g},"b":${rgb.b}}`)} copied={copied === `{"hex":"${hex}","r":${rgb.r},"g":${rgb.g},"b":${rgb.b}}`} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function ValueRow({ label, value, onCopy, copied }: { label: string; value: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-elevated)]">
      <span className="text-xs font-medium text-[var(--text-muted)] w-16">{label}</span>
      <span className="font-mono text-sm flex-1 truncate px-2">{value}</span>
      <button onClick={onCopy} className="text-xs px-2 py-1 rounded hover:bg-[var(--border)] transition-colors" aria-label={`Copy ${label}`}>
        {copied ? '✓' : '📋'}
      </button>
    </div>
  );
}

// ==================== COLOR WHEEL PAGE ====================

function ColorWheelPage() {
  const [baseHue, setBaseHue] = useState(240);
  const [harmonyType, setHarmonyType] = useState<HarmonyType>('complementary');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const baseHsl: HSL = { h: baseHue, s: 80, l: 55 };
  const harmonyColors = getHarmony(harmonyType, baseHsl);
  const angles = getHarmonyAngles(harmonyType);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = Math.min(canvas.parentElement?.clientWidth || 400, 400);
    canvas.width = size;
    canvas.height = size;
    const center = size / 2;
    const radius = size / 2 - 20;

    // Draw wheel
    for (let angle = 0; angle < 360; angle += 0.5) {
      const startAngle = (angle - 1) * Math.PI / 180;
      const endAngle = (angle + 1) * Math.PI / 180;
      
      const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius);
      gradient.addColorStop(0, `hsl(${angle}, 10%, 50%)`);
      gradient.addColorStop(0.4, `hsl(${angle}, 60%, 50%)`);
      gradient.addColorStop(1, `hsl(${angle}, 100%, 50%)`);
      
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Draw center
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-surface').trim() || '#1a1a25';
    ctx.fill();

    // Draw harmony lines and markers
    angles.forEach((offset, i) => {
      const angle = (baseHue + offset) * Math.PI / 180;
      const x = center + Math.cos(angle) * radius * 0.75;
      const y = center + Math.sin(angle) * radius * 0.75;
      const color = harmonyColors[i];
      const hex = rgbToHex(color);

      // Line from center
      if (i > 0) {
        const prevAngle = (baseHue + angles[i - 1]) * Math.PI / 180;
        const px = center + Math.cos(prevAngle) * radius * 0.75;
        const py = center + Math.sin(prevAngle) * radius * 0.75;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(x, y);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Marker
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fillStyle = hex;
      ctx.fill();
      ctx.strokeStyle = i === 0 ? '#ffffff' : 'rgba(255,255,255,0.7)';
      ctx.lineWidth = i === 0 ? 3 : 2;
      ctx.stroke();
    });

    // Close the polygon
    if (angles.length > 2) {
      const firstAngle = (baseHue + angles[0]) * Math.PI / 180;
      const lastAngle = (baseHue + angles[angles.length - 1]) * Math.PI / 180;
      const fx = center + Math.cos(firstAngle) * radius * 0.75;
      const fy = center + Math.sin(firstAngle) * radius * 0.75;
      const lx = center + Math.cos(lastAngle) * radius * 0.75;
      const ly = center + Math.sin(lastAngle) * radius * 0.75;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(fx, fy);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [baseHue, harmonyType, harmonyColors, angles]);

  const handleCanvasInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left - rect.width / 2;
    const y = clientY - rect.top - rect.height / 2;
    let angle = Math.atan2(y, x) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    setBaseHue(Math.round(angle));
  };

  return (
    <div className="animate-fade-in">
      <SectionTitle subtitle="Explore color relationships visually">Color Wheel</SectionTitle>
      
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="flex flex-col items-center">
          <div className="relative w-full max-w-[400px] aspect-square">
            <canvas
              ref={canvasRef}
              className="w-full h-full rounded-full cursor-crosshair"
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              onMouseMove={e => { if (isDragging) handleCanvasInteraction(e); }}
              onClick={handleCanvasInteraction}
              onTouchStart={() => setIsDragging(true)}
              onTouchEnd={() => setIsDragging(false)}
              onTouchMove={handleCanvasInteraction}
              aria-label="Interactive color wheel. Click or drag to select hue."
              role="img"
            />
          </div>
          <Slider
            label="Hue"
            value={baseHue}
            onChange={setBaseHue}
            min={0} max={360}
            gradient="linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))"
          />
        </Card>

        <Card>
          <h3 className="font-semibold mb-3">Harmony Mode</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
            {(['complementary', 'analogous', 'triadic', 'split-complementary', 'tetradic', 'monochromatic'] as HarmonyType[]).map(type => (
              <button
                key={type}
                onClick={() => setHarmonyType(type)}
                className={`px-3 py-2 rounded-lg text-sm capitalize transition-colors ${harmonyType === type ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border)]'}`}
              >
                {type}
              </button>
            ))}
          </div>

          <h3 className="font-semibold mb-3">Harmony Colors</h3>
          <div className="flex flex-wrap gap-3">
            {harmonyColors.map((color, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <ColorSwatch color={color} size="lg" />
                <span className="text-xs font-mono text-[var(--text-muted)]">{rgbToHex(color).toUpperCase()}</span>
                <span className="text-xs text-[var(--text-muted)]">{angles[i] !== undefined ? `${angles[i]}°` : ''}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 p-3 rounded-lg bg-[var(--bg-elevated)]">
            <p className="text-sm text-[var(--text-secondary)]">
              <strong className="text-[var(--text-primary)]">Base hue: {baseHue}°</strong>
              {' — '}
              {harmonyType === 'complementary' && 'The complement is directly opposite on the wheel (180° apart).'}
              {harmonyType === 'analogous' && 'Analogous colors are neighbors on the wheel (±30°).'}
              {harmonyType === 'triadic' && 'Triadic colors are evenly spaced at 120° intervals.'}
              {harmonyType === 'split-complementary' && 'Split-complementary uses the two colors adjacent to the complement.'}
              {harmonyType === 'tetradic' && 'Tetradic uses four colors at 90° intervals.'}
              {harmonyType === 'monochromatic' && 'Monochromatic varies lightness while keeping hue constant.'}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ==================== HARMONY LAB PAGE ====================

function HarmonyLabPage() {
  const [baseHue, setBaseHue] = useState(240);
  const [baseSat, setBaseSat] = useState(80);
  const [baseLight, setBaseLight] = useState(55);
  const [locked, setLocked] = useState<Set<number>>(new Set());
  const [harmonyType, setHarmonyType] = useState<HarmonyType>('complementary');
  const { copy } = useCopyToClipboard();

  const baseHsl: HSL = { h: baseHue, s: baseSat, l: baseLight };
  const harmonyColors = getHarmony(harmonyType, baseHsl);

  const toggleLock = (i: number) => {
    const newLocked = new Set(locked);
    if (newLocked.has(i)) newLocked.delete(i);
    else newLocked.add(i);
    setLocked(newLocked);
  };

  const exportCSS = () => {
    const vars = harmonyColors.map((c, i) => `  --color-${i + 1}: ${rgbToHex(c)};`).join('\n');
    return `:root {\n${vars}\n}`;
  };

  return (
    <div className="animate-fade-in">
      <SectionTitle subtitle="Generate and explore color harmonies">Harmony Lab</SectionTitle>
      
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <h3 className="font-semibold mb-4">Base Color</h3>
          <div className="w-full h-24 rounded-xl mb-4" style={{ backgroundColor: rgbToHex(hslToRgb(baseHsl)) }} />
          <Slider label="Hue" value={baseHue} onChange={setBaseHue} min={0} max={360}
            gradient="linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))" />
          <div className="mt-3">
            <Slider label="Saturation" value={baseSat} onChange={setBaseSat} min={0} max={100} />
          </div>
          <div className="mt-3">
            <Slider label="Lightness" value={baseLight} onChange={setBaseLight} min={0} max={100} />
          </div>
          
          <h4 className="text-sm font-medium mt-6 mb-2">Harmony Type</h4>
          <div className="grid grid-cols-2 gap-2">
            {(['complementary', 'analogous', 'triadic', 'split-complementary', 'tetradic', 'monochromatic'] as HarmonyType[]).map(type => (
              <button key={type} onClick={() => setHarmonyType(type)}
                className={`px-3 py-2 rounded-lg text-xs capitalize transition-colors ${harmonyType === type ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border)]'}`}>
                {type}
              </button>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="font-semibold mb-4">Generated Harmony</h3>
          <div className="flex flex-wrap gap-4 mb-6">
            {harmonyColors.map((color, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="relative">
                  <ColorSwatch color={color} size="xl" />
                  <button
                    onClick={() => toggleLock(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white text-xs flex items-center justify-center"
                    aria-label={locked.has(i) ? 'Unlock color' : 'Lock color'}
                  >
                    {locked.has(i) ? '🔒' : '🔓'}
                  </button>
                </div>
                <span className="text-xs font-mono">{rgbToHex(color).toUpperCase()}</span>
                <span className="text-xs text-[var(--text-muted)]">{formatHsl(rgbToHsl(color))}</span>
                <button onClick={() => copy(rgbToHex(color))} className="text-xs text-[var(--accent)] hover:underline">Copy</button>
              </div>
            ))}
          </div>

          {/* Palette strip */}
          <div className="flex rounded-xl overflow-hidden h-16 mb-4">
            {harmonyColors.map((color, i) => (
              <div key={i} className="flex-1" style={{ backgroundColor: rgbToHex(color) }} />
            ))}
          </div>

          {/* Export */}
          <div className="p-3 rounded-lg bg-[var(--bg-elevated)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">CSS Variables</span>
              <button onClick={() => copy(exportCSS())} className="text-xs px-2 py-1 rounded bg-[var(--bg-surface)] hover:bg-[var(--border)]">Copy CSS</button>
            </div>
            <pre className="text-xs font-mono text-[var(--text-secondary)] overflow-x-auto">{exportCSS()}</pre>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ==================== PALETTE LAB PAGE ====================

function PaletteLabPage() {
  const [palette, setPalette] = useLocalStorage<RGB[]>('color-lab-palette', [
    { r: 108, g: 99, b: 255 },
    { r: 255, g: 206, b: 99 },
    { r: 76, g: 201, b: 240 },
    { r: 255, g: 107, b: 107 },
    { r: 46, g: 213, b: 115 },
  ]);
  const [paletteName, setPaletteName] = useState('My Palette');
  const [savedPalettes, setSavedPalettes] = useLocalStorage<Array<{ name: string; colors: RGB[] }>>('color-lab-saved-palettes', []);
  const { copy } = useCopyToClipboard();
  const [newColorHex, setNewColorHex] = useState('#6C63FF');
  const [newColorPicker, setNewColorPicker] = useState('#6C63FF');

  const addColor = (color?: RGB) => {
    if (color) {
      setPalette([...palette, color]);
    } else {
      const randomHue = Math.random() * 360;
      setPalette([...palette, hslToRgb({ h: randomHue, s: 70, l: 55 })]);
    }
  };

  const addManualColor = () => {
    const rgb = hexToRgb(newColorHex) || hexToRgb(newColorPicker);
    if (rgb) {
      setPalette([...palette, rgb]);
      setNewColorHex(rgbToHex(rgb));
      setNewColorPicker(rgbToHex(rgb));
    }
  };

  const removeColor = (i: number) => {
    setPalette(palette.filter((_, idx) => idx !== i));
  };

  const updateColor = (i: number, color: RGB) => {
    const newPalette = [...palette];
    newPalette[i] = color;
    setPalette(newPalette);
  };

  const savePalette = () => {
    setSavedPalettes([...savedPalettes, { name: paletteName, colors: palette }]);
  };

  const exportCSS = () => {
    const vars = palette.map((c, i) => `  --color-${i + 1}: ${rgbToHex(c)};`).join('\n');
    return `:root {\n${vars}\n}`;
  };

  const exportJSON = () => JSON.stringify(palette.map((c, i) => ({ name: `color-${i + 1}`, hex: rgbToHex(c) })), null, 2);

  return (
    <div className="animate-fade-in">
      <SectionTitle subtitle="Create, edit, and export color palettes">Palette Lab</SectionTitle>
      
      {/* Palette Strip */}
      <div className="flex rounded-xl overflow-hidden h-24 mb-6 border border-[var(--border)]">
        {palette.map((color, i) => (
          <div key={i} className="flex-1 relative group cursor-pointer" style={{ backgroundColor: rgbToHex(color) }}>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
              <button onClick={() => removeColor(i)} className="text-white text-lg" aria-label="Remove color">✕</button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Color Editor */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <input
              type="text"
              value={paletteName}
              onChange={e => setPaletteName(e.target.value)}
              className="text-lg font-semibold bg-transparent border-b border-transparent hover:border-[var(--border)] focus:border-[var(--accent)] outline-none"
              aria-label="Palette name"
            />
            <button onClick={() => addColor()} className="px-3 py-1 rounded-lg bg-[var(--accent)] text-white text-sm">+ Add Random</button>
          </div>
          
          {/* Manual Color Input */}
          <div className="mb-4 p-3 rounded-lg bg-[var(--bg-elevated)]">
            <h4 className="text-sm font-medium mb-2">Add Color Manually</h4>
            <div className="flex gap-2">
              <input
                type="color"
                value={newColorPicker}
                onChange={e => {
                  setNewColorPicker(e.target.value);
                  setNewColorHex(e.target.value);
                }}
                className="w-10 h-10 rounded cursor-pointer border-0"
                aria-label="Color picker"
              />
              <input
                type="text"
                value={newColorHex}
                onChange={e => {
                  setNewColorHex(e.target.value);
                  const rgb = hexToRgb(e.target.value);
                  if (rgb) setNewColorPicker(rgbToHex(rgb));
                }}
                placeholder="#RRGGBB"
                className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] font-mono text-sm"
                aria-label="Hex color value"
              />
              <button
                onClick={addManualColor}
                className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Add
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {palette.map((color, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-elevated)]">
                <input
                  type="color"
                  value={rgbToHex(color)}
                  onChange={e => {
                    const rgb = hexToRgb(e.target.value);
                    if (rgb) updateColor(i, rgb);
                  }}
                  className="w-8 h-8 rounded cursor-pointer border-0"
                  aria-label={`Color ${i + 1}`}
                />
                <span className="font-mono text-sm flex-1">{rgbToHex(color).toUpperCase()}</span>
                <button onClick={() => copy(rgbToHex(color))} className="text-xs px-2 py-1 rounded hover:bg-[var(--border)]" aria-label="Copy hex">📋</button>
                <button onClick={() => removeColor(i)} className="text-xs px-2 py-1 rounded hover:bg-[var(--border)] text-[var(--error)]" aria-label="Remove">✕</button>
              </div>
            ))}
          </div>
        </Card>

        {/* Export */}
        <Card>
          <h3 className="font-semibold mb-4">Export</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">CSS Variables</span>
                <button onClick={() => copy(exportCSS())} className="text-xs px-2 py-1 rounded bg-[var(--bg-elevated)] hover:bg-[var(--border)]">Copy</button>
              </div>
              <pre className="text-xs font-mono p-3 rounded-lg bg-[var(--bg-elevated)] overflow-x-auto text-[var(--text-secondary)]">{exportCSS()}</pre>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">JSON</span>
                <button onClick={() => copy(exportJSON())} className="text-xs px-2 py-1 rounded bg-[var(--bg-elevated)] hover:bg-[var(--border)]">Copy</button>
              </div>
              <pre className="text-xs font-mono p-3 rounded-lg bg-[var(--bg-elevated)] overflow-x-auto text-[var(--text-secondary)]">{exportJSON()}</pre>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Tailwind-friendly</span>
                <button onClick={() => copy(palette.map((c, i) => `'color-${i + 1}': '${rgbToHex(c)}'`).join(',\n'))} className="text-xs px-2 py-1 rounded bg-[var(--bg-elevated)] hover:bg-[var(--border)]">Copy</button>
              </div>
              <pre className="text-xs font-mono p-3 rounded-lg bg-[var(--bg-elevated)] overflow-x-auto text-[var(--text-secondary)]">
{palette.map((c, i) => `'color-${i + 1}': '${rgbToHex(c)}'`).join(',\n')}
              </pre>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <button onClick={savePalette} className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm">💾 Save Palette</button>
          </div>

          {savedPalettes.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Saved Palettes</h4>
              <div className="space-y-2">
                {savedPalettes.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-elevated)]">
                    <div className="flex gap-1">
                      {p.colors.slice(0, 5).map((c, j) => (
                        <div key={j} className="w-4 h-4 rounded" style={{ backgroundColor: rgbToHex(c) }} />
                      ))}
                    </div>
                    <span className="text-sm flex-1">{p.name}</span>
                    <button onClick={() => setPalette(p.colors)} className="text-xs px-2 py-1 rounded hover:bg-[var(--border)]">Load</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ==================== IMAGE PALETTE PAGE ====================

function ImagePalettePage() {
  const [colors, setColors] = useState<{ color: RGB; count: number }[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { copy } = useCopyToClipboard();

  const processImage = (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Downsample for performance
        const maxSize = 200;
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const extracted = extractAllColors(imageData);
        setColors(extracted);
        setImageUrl(e.target?.result as string);
        setIsProcessing(false);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) processImage(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  const totalPixels = colors.reduce((sum, c) => sum + c.count, 0);
  const [showAll, setShowAll] = useState(false);
  const navigate = useNavigate();
  const [savedPalette, setSavedPalette] = useLocalStorage<RGB[]>('color-lab-palette', []);

  const sendToPalette = () => {
    const topColors = colors.slice(0, 8).map(c => c.color);
    setSavedPalette(topColors);
    navigate('/palette');
  };

  const displayColors = showAll ? colors : colors.slice(0, 30);

  return (
    <div className="animate-fade-in">
      <SectionTitle subtitle="Extract all colors from any image — sorted by frequency, processed locally">Image Palette Extractor</SectionTitle>
      
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            className="border-2 border-dashed border-[var(--border)] rounded-xl p-8 text-center hover:border-[var(--accent)] transition-colors cursor-pointer relative"
          >
            {imageUrl ? (
              <img src={imageUrl} alt="Uploaded" className="max-h-64 mx-auto rounded-lg" />
            ) : (
              <div>
                <span className="text-4xl mb-3 block">🖼️</span>
                <p className="text-[var(--text-secondary)]">Drop an image here or click to upload</p>
                <p className="text-xs text-[var(--text-muted)] mt-2">Images are processed locally — nothing is uploaded</p>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="absolute inset-0 opacity-0 cursor-pointer"
              aria-label="Upload image"
            />
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </Card>

        <Card>
          <h3 className="font-semibold mb-2">Extracted Colors {colors.length > 0 && `(${colors.length} unique)`}</h3>
          {colors.length > 0 && (
            <p className="text-xs text-[var(--text-muted)] mb-4">Total pixels analyzed: {totalPixels.toLocaleString()}</p>
          )}
          {isProcessing && <p className="text-[var(--text-secondary)]">Processing image...</p>}
          {colors.length > 0 && (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {displayColors.map((item, i) => {
                const pct = ((item.count / totalPixels) * 100);
                return (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors">
                    <div className="w-10 h-10 rounded-lg flex-shrink-0 border border-[var(--border)]" style={{ backgroundColor: rgbToHex(item.color) }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{rgbToHex(item.color).toUpperCase()}</span>
                        <span className="text-xs text-[var(--text-muted)]">{pct.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded bg-[var(--bg-elevated)] mt-1">
                        <div className="h-full rounded" style={{ width: `${Math.max(pct, 0.5)}%`, backgroundColor: rgbToHex(item.color) }} />
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <span className="text-xs text-[var(--text-muted)] w-16 text-right font-mono">{item.count.toLocaleString()}px</span>
                      <button onClick={() => copy(rgbToHex(item.color))} className="text-xs px-2 py-1 rounded hover:bg-[var(--border)]" aria-label="Copy hex">📋</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {colors.length > 30 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-3 w-full py-2 rounded-lg bg-[var(--bg-elevated)] text-sm text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors"
            >
              {showAll ? `Show top 30` : `Show all ${colors.length} colors`}
            </button>
          )}
          {colors.length > 0 && (
            <div className="flex gap-2 mt-4">
              <button onClick={() => copy(colors.map(c => rgbToHex(c.color)).join('\n'))} className="px-3 py-2 rounded-lg bg-[var(--bg-elevated)] text-sm hover:bg-[var(--border)]">Copy All HEX</button>
              <button onClick={sendToPalette} className="px-3 py-2 rounded-lg bg-[var(--accent)] text-white text-sm">Send Top 8 to Palette →</button>
            </div>
          )}
          {colors.length === 0 && !isProcessing && (
            <p className="text-[var(--text-muted)]">Upload an image to extract all its colors, sorted by frequency.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

// ==================== COLOR THEORY PAGE ====================

function ColorTheoryPage() {
  const [activeLesson, setActiveLesson] = useState('hue');
  const [demoHue, setDemoHue] = useState(200);
  const [demoSat, setDemoSat] = useState(80);
  const [demoLight, setDemoLight] = useState(50);

  const lessons = [
    { id: 'hue', title: 'Hue', icon: '🌈' },
    { id: 'saturation', title: 'Saturation', icon: '💧' },
    { id: 'lightness', title: 'Lightness', icon: '☀️' },
    { id: 'value', title: 'Value / Brightness', icon: '🔆' },
    { id: 'tint', title: 'Tint', icon: '🤍' },
    { id: 'shade', title: 'Shade', icon: '🖤' },
    { id: 'tone', title: 'Tone', icon: '🩶' },
    { id: 'temperature', title: 'Warm & Cool', icon: '🌡️' },
    { id: 'interaction', title: 'Color Interaction', icon: '👁️' },
  ];

  const baseRgb = hslToRgb({ h: demoHue, s: demoSat, l: demoLight });

  return (
    <div className="animate-fade-in">
      <SectionTitle subtitle="Interactive lessons on color theory fundamentals">Color Theory</SectionTitle>
      
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Lesson Navigation */}
        <nav className="lg:col-span-1 space-y-1">
          {lessons.map(lesson => (
            <button
              key={lesson.id}
              onClick={() => setActiveLesson(lesson.id)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm flex items-center gap-2 transition-colors ${activeLesson === lesson.id ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`}
            >
              <span>{lesson.icon}</span>
              <span>{lesson.title}</span>
            </button>
          ))}
        </nav>

        {/* Lesson Content */}
        <div className="lg:col-span-3">
          <Card>
            {activeLesson === 'hue' && (
              <div>
                <h3 className="text-xl font-bold mb-3">Hue</h3>
                <p className="text-[var(--text-secondary)] mb-4">
                  Hue is the attribute of a color that distinguishes it as red, green, blue, etc. It corresponds to the dominant wavelength of light and is represented as an angle (0°–360°) on the color wheel.
                </p>
                <p className="text-[var(--text-secondary)] mb-4">
                  On the color wheel, 0° is red, 120° is green, and 240° is blue. Rotating through all 360° cycles through every hue.
                </p>
                <div className="space-y-4 mt-6">
                  <Slider label="Hue" value={demoHue} onChange={setDemoHue} min={0} max={360}
                    gradient="linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))" />
                  <div className="w-full h-32 rounded-xl" style={{ backgroundColor: rgbToHex(baseRgb) }}>
                    <div className="flex items-center justify-center h-full">
                      <span className="text-lg font-mono font-bold" style={{ color: getContrastText(baseRgb) }}>H = {demoHue}°</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeLesson === 'saturation' && (
              <div>
                <h3 className="text-xl font-bold mb-3">Saturation</h3>
                <p className="text-[var(--text-secondary)] mb-4">
                  Saturation describes the intensity or purity of a color. A fully saturated color is vivid and pure. As saturation decreases, the color becomes more gray and muted. At 0% saturation, the color is a shade of gray.
                </p>
                <div className="space-y-4 mt-6">
                  <Slider label="Saturation" value={demoSat} onChange={setDemoSat} min={0} max={100} />
                  <div className="flex gap-1 rounded-xl overflow-hidden h-24">
                    {[0, 20, 40, 60, 80, 100].map(s => (
                      <div key={s} className="flex-1 flex items-center justify-center" style={{ backgroundColor: `hsl(${demoHue}, ${s}%, 50%)` }}>
                        <span className="text-xs font-mono" style={{ color: getContrastText(hslToRgb({ h: demoHue, s, l: 50 })) }}>{s}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeLesson === 'lightness' && (
              <div>
                <h3 className="text-xl font-bold mb-3">Lightness</h3>
                <p className="text-[var(--text-secondary)] mb-4">
                  Lightness (or L in HSL) describes how light or dark a color appears. At 0% lightness, any color becomes black. At 100%, it becomes white. At 50%, the color is at its most "pure" or saturated appearance.
                </p>
                <div className="space-y-4 mt-6">
                  <Slider label="Lightness" value={demoLight} onChange={setDemoLight} min={0} max={100} />
                  <div className="flex gap-1 rounded-xl overflow-hidden h-24">
                    {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(l => (
                      <div key={l} className={`flex-1 flex items-center justify-center ${Math.abs(l - demoLight) < 5 ? 'ring-2 ring-white' : ''}`} style={{ backgroundColor: `hsl(${demoHue}, ${demoSat}%, ${l}%)` }}>
                        <span className="text-[9px] font-mono" style={{ color: getContrastText(hslToRgb({ h: demoHue, s: demoSat, l })) }}>{l}%</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">Current: {demoLight}% (highlighted)</p>
                </div>
              </div>
            )}

            {activeLesson === 'value' && (
              <div>
                <h3 className="text-xl font-bold mb-3">Value / Brightness</h3>
                <p className="text-[var(--text-secondary)] mb-4">
                  Value (in HSV) or Brightness describes the amount of light in a color. Unlike HSL lightness, HSV value of 100% doesn't mean white — it means the color channel at its maximum. A color at V=100%, S=100% is fully vivid.
                </p>
                <p className="text-[var(--text-secondary)] mb-4">
                  <strong>Key distinction:</strong> HSL Lightness of 50% gives the "purest" hue, while HSV Value of 100% gives the brightest version. These are different models and should not be confused.
                </p>
                <div className="p-4 rounded-lg bg-[var(--bg-elevated)] mt-4">
                  <p className="text-sm text-[var(--text-secondary)]">
                    💡 HSL Lightness = 50% → Most saturated appearance<br/>
                    HSV Value = 100% → Maximum brightness of any channel<br/>
                    These produce different results for the same hue/saturation.
                  </p>
                </div>
              </div>
            )}

            {activeLesson === 'tint' && (
              <div>
                <h3 className="text-xl font-bold mb-3">Tint</h3>
                <p className="text-[var(--text-secondary)] mb-4">
                  A tint is created by mixing a color with white. This increases lightness while reducing saturation. Tints are lighter, softer versions of a color.
                </p>
                <div className="space-y-3 mt-4">
                  <div className="flex gap-2 items-center">
                    <label className="text-sm text-[var(--text-secondary)] w-24">Base hue:</label>
                    <input type="range" min={0} max={360} value={demoHue} onChange={e => setDemoHue(parseFloat(e.target.value))} className="flex-1" aria-label="Tint base hue" />
                  </div>
                  <div className="w-full h-16 rounded-lg mb-2" style={{ backgroundColor: `hsl(${demoHue}, 80%, 50%)` }} />
                  <p className="text-xs text-[var(--text-muted)] mb-2">Base color → mixed with increasing amounts of white:</p>
                  <div className="flex gap-1 rounded-xl overflow-hidden h-20">
                    {getTints(hslToRgb({ h: demoHue, s: 80, l: 50 }), 8).map((c, i) => (
                      <div key={i} className="flex-1 flex items-end justify-center pb-1" style={{ backgroundColor: rgbToHex(c) }} title={rgbToHex(c)}>
                        <span className="text-[8px] font-mono" style={{ color: getContrastText(c) }}>{Math.round((i / 7) * 100)}%</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">← Pure color (0% white) ——— Increasing white ——— Mostly white (100%) →</p>
                </div>
              </div>
            )}

            {activeLesson === 'shade' && (
              <div>
                <h3 className="text-xl font-bold mb-3">Shade</h3>
                <p className="text-[var(--text-secondary)] mb-4">
                  A shade is created by mixing a color with black. This decreases lightness while maintaining hue character. Shades are darker, deeper versions of a color.
                </p>
                <div className="space-y-3 mt-4">
                  <div className="w-full h-16 rounded-lg" style={{ backgroundColor: `hsl(${demoHue}, 80%, 50%)` }} />
                  <p className="text-xs text-[var(--text-muted)] mb-2">Base color → mixed with increasing amounts of black:</p>
                  <div className="flex gap-1 rounded-xl overflow-hidden h-20">
                    {getShades(hslToRgb({ h: demoHue, s: 80, l: 50 }), 8).map((c, i) => (
                      <div key={i} className="flex-1 flex items-end justify-center pb-1" style={{ backgroundColor: rgbToHex(c) }} title={rgbToHex(c)}>
                        <span className="text-[8px] font-mono" style={{ color: getContrastText(c) }}>{Math.round((i / 7) * 100)}%</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">← Pure color (0% black) ——— Increasing black ——— Mostly black (100%) →</p>
                </div>
              </div>
            )}

            {activeLesson === 'tone' && (
              <div>
                <h3 className="text-xl font-bold mb-3">Tone</h3>
                <p className="text-[var(--text-secondary)] mb-4">
                  A tone is created by mixing a color with gray (equal parts black and white). This reduces saturation while keeping lightness more stable than tints or shades alone. Tones are muted, sophisticated versions of a color.
                </p>
                <p className="text-[var(--text-secondary)] mb-4">
                  <strong>Distinction:</strong> Tint = color + white. Shade = color + black. Tone = color + gray. The key difference is that tones reduce chroma without drastically shifting lightness.
                </p>
                <div className="space-y-3 mt-4">
                  <div className="w-full h-16 rounded-lg" style={{ backgroundColor: `hsl(${demoHue}, 80%, 50%)` }} />
                  <p className="text-xs text-[var(--text-muted)] mb-2">Base color → mixed with increasing amounts of gray:</p>
                  <div className="flex gap-1 rounded-xl overflow-hidden h-20">
                    {getTones(hslToRgb({ h: demoHue, s: 80, l: 50 }), 8).map((c, i) => (
                      <div key={i} className="flex-1 flex items-end justify-center pb-1" style={{ backgroundColor: rgbToHex(c) }} title={rgbToHex(c)}>
                        <span className="text-[8px] font-mono" style={{ color: getContrastText(c) }}>{Math.round((i / 7) * 100)}%</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">← Pure color (0% gray) ——— Increasing gray ——— Mostly gray (100%) →</p>
                </div>
              </div>
            )}

            {activeLesson === 'temperature' && (
              <div>
                <h3 className="text-xl font-bold mb-3">Warm & Cool Colors</h3>
                <p className="text-[var(--text-secondary)] mb-4">
                  Colors are often described as "warm" (reds, oranges, yellows) or "cool" (blues, greens, purples). However, this classification is largely a design and art convention — it's context-dependent rather than an absolute physical property.
                </p>
                <p className="text-[var(--text-secondary)] mb-4">
                  A color's perceived temperature can shift depending on surrounding colors. A blue that feels cool next to red may feel warm next to a cooler blue.
                </p>
                <div className="flex gap-1 rounded-xl overflow-hidden h-20 mt-4">
                  {Array.from({ length: 36 }, (_, i) => {
                    const hue = i * 10;
                    const isWarm = hue < 60 || hue > 240;
                    return (
                      <div key={i} className="flex-1 relative" style={{ backgroundColor: `hsl(${hue}, 80%, 50%)` }}>
                        <span className="absolute bottom-0 left-0 right-0 text-center text-[8px]" style={{ color: isWarm ? '#fff' : '#fff' }}>
                          {isWarm ? 'W' : 'C'}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-2">W = Warm | C = Cool — This is a convention, not an absolute rule</p>
              </div>
            )}

            {activeLesson === 'interaction' && (
              <div>
                <h3 className="text-xl font-bold mb-3">Color Interaction</h3>
                <p className="text-[var(--text-secondary)] mb-4">
                  The same color can appear different depending on what surrounds it. This is called simultaneous contrast — our visual system interprets colors relative to their context.
                </p>
                <p className="text-[var(--text-secondary)] mb-4">
                  Below, the same gray square appears on different backgrounds. Notice how it seems to change.
                </p>
                <div className="grid grid-cols-3 gap-4 mt-6">
                  {[
                    { bg: '#ffffff', label: 'White bg' },
                    { bg: '#000000', label: 'Black bg' },
                    { bg: `hsl(${demoHue}, 80%, 50%)`, label: 'Saturated bg' },
                  ].map((item, i) => (
                    <div key={i} className="aspect-square rounded-xl flex items-center justify-center" style={{ backgroundColor: item.bg }}>
                      <div className="w-16 h-16 rounded-lg" style={{ backgroundColor: '#808080' }} title="Same gray: #808080" />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-3 text-center">All three center squares are exactly #808080</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ==================== ACCESSIBILITY PAGE ====================

function AccessibilityPage() {
  const [fg, setFg] = useState('#1a1a2e');
  const [bg, setBg] = useState('#fafafa');
  const [simType, setSimType] = useState<CVDeficiency>('normal');

  const fgRgb = hexToRgb(fg) || { r: 0, g: 0, b: 0 };
  const bgRgb = hexToRgb(bg) || { r: 255, g: 255, b: 255 };
  const ratio = contrastRatio(fgRgb, bgRgb);
  const normalLevel = wcagLevel(ratio, false);
  const largeLevel = wcagLevel(ratio, true);

  const simFg = simulateColorVision(fgRgb, simType);
  const simBg = simulateColorVision(bgRgb, simType);
  const simRatio = contrastRatio(simFg, simBg);

  return (
    <div className="animate-fade-in">
      <SectionTitle subtitle="Check contrast ratios and simulate color vision deficiencies">Accessibility Lab</SectionTitle>
      
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Contrast Checker */}
        <Card>
          <h3 className="font-semibold mb-4">Contrast Checker (WCAG 2.x)</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-[var(--text-secondary)]">Foreground</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={fg} onChange={e => setFg(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" aria-label="Foreground color" />
                <input type="text" value={fg} onChange={e => setFg(e.target.value)} className="flex-1 px-2 py-1 rounded bg-[var(--bg-elevated)] border border-[var(--border)] font-mono text-sm" aria-label="Foreground hex" />
              </div>
            </div>
            <div>
              <label className="text-sm text-[var(--text-secondary)]">Background</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={bg} onChange={e => setBg(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" aria-label="Background color" />
                <input type="text" value={bg} onChange={e => setBg(e.target.value)} className="flex-1 px-2 py-1 rounded bg-[var(--bg-elevated)] border border-[var(--border)] font-mono text-sm" aria-label="Background hex" />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl p-6 mb-4" style={{ backgroundColor: bg, color: fg }}>
            <p className="text-lg font-bold">Sample Text (Normal)</p>
            <p className="text-sm mt-1">This is how your text appears on this background.</p>
            <p className="text-2xl font-bold mt-2">Large Text (18pt+)</p>
          </div>

          {/* Results */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-elevated)]">
              <span className="font-medium">Contrast Ratio</span>
              <span className="text-2xl font-bold font-mono">{ratio.toFixed(2)}:1</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ResultBadge label="Normal Text AA" pass={normalLevel.aa} />
              <ResultBadge label="Normal Text AAA" pass={normalLevel.aaa} />
              <ResultBadge label="Large Text AA" pass={largeLevel.aa} />
              <ResultBadge label="Large Text AAA" pass={largeLevel.aaa} />
            </div>
          </div>
        </Card>

        {/* Color Vision Simulation */}
        <Card>
          <h3 className="font-semibold mb-4">Color Vision Simulation</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            These are educational simulations and are not medical tests or diagnoses.
          </p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {(Object.keys(cvDeficiencyLabels) as CVDeficiency[]).map(type => (
              <button key={type} onClick={() => setSimType(type)}
                className={`px-3 py-2 rounded-lg text-xs transition-colors ${simType === type ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border)]'}`}>
                {cvDeficiencyLabels[type]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1">Original</p>
              <div className="rounded-xl p-4" style={{ backgroundColor: bg }}>
                <div className="w-full h-16 rounded-lg flex items-center justify-center font-bold" style={{ backgroundColor: fg, color: getContrastText(fgRgb) }}>
                  Aa
                </div>
              </div>
              <p className="text-xs font-mono mt-1 text-[var(--text-muted)]">Ratio: {ratio.toFixed(2)}:1</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1">Simulated ({cvDeficiencyLabels[simType]})</p>
              <div className="rounded-xl p-4" style={{ backgroundColor: rgbToHex(simBg) }}>
                <div className="w-full h-16 rounded-lg flex items-center justify-center font-bold" style={{ backgroundColor: rgbToHex(simFg), color: getContrastText(simFg) }}>
                  Aa
                </div>
              </div>
              <p className="text-xs font-mono mt-1 text-[var(--text-muted)]">Ratio: {simRatio.toFixed(2)}:1</p>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-[var(--bg-elevated)]">
            <p className="text-xs text-[var(--text-secondary)]">
              ⚠️ These simulations use simplified matrices and are for educational purposes only. They do not represent individual experiences of color vision deficiency and should not be used for medical assessment.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ResultBadge({ label, pass }: { label: string; pass: boolean }) {
  return (
    <div className={`p-3 rounded-lg text-center ${pass ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
      <span className="text-lg">{pass ? '✅' : '❌'}</span>
      <p className="text-xs mt-1 font-medium">{label}</p>
      <p className="text-xs text-[var(--text-muted)]">{pass ? 'Pass' : 'Fail'}</p>
    </div>
  );
}

// ==================== COLOR SCIENCE PAGE ====================

function ColorSciencePage() {
  const [activeTopic, setActiveTopic] = useState('light');
  
  const topics = [
    { id: 'light', title: 'Visible Light' },
    { id: 'perception', title: 'Human Perception' },
    { id: 'additive', title: 'Additive (RGB)' },
    { id: 'subtractive', title: 'Subtractive (CMYK)' },
    { id: 'models', title: 'Color Models' },
    { id: 'spaces', title: 'Color Spaces' },
    { id: 'gamut', title: 'Color Gamut' },
    { id: 'deltaE', title: 'Delta E' },
  ];

  return (
    <div className="animate-fade-in">
      <SectionTitle subtitle="Understanding the science behind digital color">Color Science</SectionTitle>
      
      <div className="grid lg:grid-cols-4 gap-6">
        <nav className="lg:col-span-1 space-y-1">
          {topics.map(t => (
            <button key={t.id} onClick={() => setActiveTopic(t.id)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-colors ${activeTopic === t.id ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`}>
              {t.title}
            </button>
          ))}
        </nav>

        <div className="lg:col-span-3">
          <Card>
            {activeTopic === 'light' && (
              <div>
                <h3 className="text-xl font-bold mb-3">Visible Light</h3>
                <p className="text-[var(--text-secondary)] mb-4">Visible light is electromagnetic radiation with wavelengths approximately between 380nm (violet) and 700nm (red). Color is how our visual system interprets different wavelengths.</p>
                <p className="text-[var(--text-secondary)] mb-4">Important: Digital RGB values do not correspond directly to physical wavelengths. RGB is a device-dependent encoding system for displaying color, not a measurement of light.</p>
                <div className="flex rounded-xl overflow-hidden h-12">
                  {Array.from({ length: 32 }, (_, i) => {
                    const wavelength = 380 + (i / 31) * 320;
                    const hue = wavelengthToHue(wavelength);
                    return <div key={i} className="flex-1" style={{ backgroundColor: `hsl(${hue}, 100%, 50%)` }} />;
                  })}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-2">Approximate visible spectrum (380nm – 700nm)</p>
              </div>
            )}
            {activeTopic === 'perception' && (
              <div>
                <h3 className="text-xl font-bold mb-3">Human Color Perception</h3>
                <p className="text-[var(--text-secondary)] mb-4">The human eye has three types of cone cells sensitive to short (S/blue), medium (M/green), and long (L/red) wavelengths. The brain combines signals from these cones to produce our experience of color.</p>
                <p className="text-[var(--text-secondary)] mb-4">Color is not an inherent property of light — it's a construct of our visual system. Different species perceive color differently, and some individuals have variations in cone sensitivity.</p>
              </div>
            )}
            {activeTopic === 'additive' && (
              <div>
                <h3 className="text-xl font-bold mb-3">Additive Color (RGB)</h3>
                <p className="text-[var(--text-secondary)] mb-4">Additive color mixing starts with darkness and adds light. Red + Green + Blue light at full intensity produces white. This is how screens work — each pixel emits combinations of red, green, and blue light.</p>
                <div className="relative w-64 h-64 mx-auto my-6 bg-black rounded-xl overflow-hidden">
                  <div className="absolute w-32 h-32 rounded-full bg-red-500 mix-blend-screen" style={{ top: '10%', left: '50%', transform: 'translateX(-50%)' }} />
                  <div className="absolute w-32 h-32 rounded-full bg-green-500 mix-blend-screen" style={{ bottom: '10%', left: '15%' }} />
                  <div className="absolute w-32 h-32 rounded-full bg-blue-500 mix-blend-screen" style={{ bottom: '10%', right: '15%' }} />
                </div>
                <p className="text-xs text-[var(--text-muted)] text-center">Red + Green + Blue light = White (on dark background)</p>
              </div>
            )}
            {activeTopic === 'subtractive' && (
              <div>
                <h3 className="text-xl font-bold mb-3">Subtractive Color (CMY/CMYK)</h3>
                <p className="text-[var(--text-secondary)] mb-4">Subtractive color mixing starts with white (paper) and absorbs light. Cyan + Magenta + Yellow inks at full coverage theoretically produce black (in practice, a dedicated K/black ink is added). This is how printing works.</p>
                <div className="relative w-64 h-64 mx-auto my-6 bg-white rounded-xl overflow-hidden border border-[var(--border)]">
                  <div className="absolute w-32 h-32 rounded-full mix-blend-multiply" style={{ top: '10%', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#00bcd4' }} />
                  <div className="absolute w-32 h-32 rounded-full mix-blend-multiply" style={{ bottom: '10%', left: '15%', backgroundColor: '#e91e63' }} />
                  <div className="absolute w-32 h-32 rounded-full mix-blend-multiply" style={{ bottom: '10%', right: '15%', backgroundColor: '#ffeb3b' }} />
                </div>
                <p className="text-xs text-[var(--text-muted)] text-center">Cyan + Magenta + Yellow ink = Black (on white paper)</p>
                <p className="text-[var(--text-secondary)] mt-4">CMYK is used for print because it more efficiently produces dark colors and reduces ink usage.</p>
              </div>
            )}
            {activeTopic === 'models' && (
              <div>
                <h3 className="text-xl font-bold mb-3">Color Models</h3>
                <div className="space-y-4 text-[var(--text-secondary)]">
                  <p><strong>RGB:</strong> Device-dependent additive model. Values 0-255 per channel. Most common for screens.</p>
                  <p><strong>HSL:</strong> Hue (0-360°), Saturation (0-100%), Lightness (0-100%). Intuitive for humans. 50% lightness = most saturated.</p>
                  <p><strong>HSV:</strong> Hue, Saturation, Value. Similar to HSL but Value=100% means maximum brightness, not white.</p>
                  <p><strong>OKLCH:</strong> Perceptually uniform color space. Lightness, Chroma, Hue. Better for generating consistent-looking palettes.</p>
                </div>
              </div>
            )}
            {activeTopic === 'spaces' && (
              <div>
                <h3 className="text-xl font-bold mb-3">Color Spaces</h3>
                <p className="text-[var(--text-secondary)] mb-4"><strong>sRGB:</strong> The standard color space for the web. Most monitors approximate sRGB. Limited gamut compared to human vision.</p>
                <p className="text-[var(--text-secondary)] mb-4"><strong>Display-P3:</strong> A wider-gamut color space used by many modern displays (Apple, some Android). Can show more saturated reds and greens than sRGB.</p>
                <p className="text-[var(--text-secondary)]"><strong>OKLab/OKLCH:</strong> Perceptually uniform spaces designed for modern color work. Changes in values correspond more consistently to perceived changes in color.</p>
              </div>
            )}
            {activeTopic === 'gamut' && (
              <div>
                <h3 className="text-xl font-bold mb-3">Color Gamut</h3>
                <p className="text-[var(--text-secondary)] mb-4">A color gamut is the range of colors that a device or color space can reproduce. No display can show all colors visible to humans.</p>
                <p className="text-[var(--text-secondary)]">When converting colors between spaces, colors outside the target gamut must be "clipped" or "compressed" — they can't be accurately displayed. This is why the same color may look different on different screens.</p>
              </div>
            )}
            {activeTopic === 'deltaE' && (
              <div>
                <h3 className="text-xl font-bold mb-3">Delta E (Color Difference)</h3>
                <p className="text-[var(--text-secondary)] mb-4">Delta E (ΔE) measures the perceived difference between two colors. Lower values mean more similar colors.</p>
                <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                  <p>• ΔE &lt; 1: Not perceptible to human eye</p>
                  <p>• ΔE 1-2: Perceptible through close observation</p>
                  <p>• ΔE 2-10: Perceptible at a glance</p>
                  <p>• ΔE 10+: Clearly different colors</p>
                </div>
                <p className="text-[var(--text-secondary)] mt-4">This application uses an OKLCH-based perceptual difference metric, which is more perceptually uniform than simple RGB Euclidean distance.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function wavelengthToHue(wavelength: number): number {
  if (wavelength < 440) return 270 + (wavelength - 380) / 60 * 30;
  if (wavelength < 490) return 240 - (wavelength - 440) / 50 * 60;
  if (wavelength < 510) return 180 - (wavelength - 490) / 20 * 60;
  if (wavelength < 580) return 120 - (wavelength - 510) / 70 * 60;
  if (wavelength < 645) return 60 - (wavelength - 580) / 65 * 60;
  return 0;
}

// ==================== DEVELOPER TOOLS PAGE ====================

function DeveloperToolsPage() {
  const [color, setColor] = useState('#6C63FF');
  const [gradientFrom, setGradientFrom] = useState('#6C63FF');
  const [gradientTo, setGradientTo] = useState('#FF6CB4');
  const [gradientAngle, setGradientAngle] = useState(135);
  const [gradientStops, setGradientStops] = useState(5);
  const { copy } = useCopyToClipboard();

  const rgb = hexToRgb(color) || { r: 108, g: 99, b: 255 };
  const hsl = rgbToHsl(rgb);

  const cssVars = `:root {\n  --primary: ${color};\n  --primary-rgb: ${rgb.r}, ${rgb.g}, ${rgb.b};\n  --primary-hsl: ${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%;\n}`;
  const jsObj = `const colors = {\n  primary: "${color}",\n  primaryRgb: { r: ${rgb.r}, g: ${rgb.g}, b: ${rgb.b} },\n  primaryHsl: { h: ${Math.round(hsl.h)}, s: ${Math.round(hsl.s)}, l: ${Math.round(hsl.l)} },\n};`;
  const json = JSON.stringify({ primary: color, rgb, hsl: { h: Math.round(hsl.h), s: Math.round(hsl.s), l: Math.round(hsl.l) } }, null, 2);
  const tailwind = `'primary': '${color}',\n'primary-light': '${rgbToHex(hslToRgb({ h: hsl.h, s: hsl.s, l: Math.min(hsl.l + 20, 95) }))}',\n'primary-dark': '${rgbToHex(hslToRgb({ h: hsl.h, s: hsl.s, l: Math.max(hsl.l - 20, 5) }))}',`;

  // Gradient
  const gradientCSS = `linear-gradient(${gradientAngle}deg, ${gradientFrom}, ${gradientTo})`;
  const gradientStopsArr = Array.from({ length: gradientStops }, (_, i) => {
    const t = i / (gradientStops - 1);
    const fromRgb = hexToRgb(gradientFrom) || { r: 0, g: 0, b: 0 };
    const toRgb = hexToRgb(gradientTo) || { r: 255, g: 255, b: 255 };
    return rgbToHex({
      r: Math.round(fromRgb.r + (toRgb.r - fromRgb.r) * t),
      g: Math.round(fromRgb.g + (toRgb.g - fromRgb.g) * t),
      b: Math.round(fromRgb.b + (toRgb.b - fromRgb.b) * t),
    });
  });

  return (
    <div className="animate-fade-in">
      <SectionTitle subtitle="Generate developer-ready color code">Developer Tools</SectionTitle>
      
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Color Code Generator */}
        <Card>
          <h3 className="font-semibold mb-4">Color Code Generator</h3>
          <div className="flex items-center gap-3 mb-4">
            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-12 h-12 rounded-lg cursor-pointer border-0" aria-label="Base color" />
            <input type="text" value={color} onChange={e => setColor(e.target.value)} className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] font-mono" aria-label="Color value" />
          </div>

          <div className="space-y-4">
            <CodeBlock title="CSS Variables" code={cssVars} onCopy={() => copy(cssVars)} />
            <CodeBlock title="JavaScript" code={jsObj} onCopy={() => copy(jsObj)} />
            <CodeBlock title="JSON" code={json} onCopy={() => copy(json)} />
            <CodeBlock title="Tailwind-friendly" code={tailwind} onCopy={() => copy(tailwind)} />
          </div>
        </Card>

        {/* Gradient Lab */}
        <Card>
          <h3 className="font-semibold mb-4">Gradient Lab</h3>
          <div className="w-full h-32 rounded-xl mb-4" style={{ background: gradientCSS }} />
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--text-muted)]">From</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={gradientFrom} onChange={e => setGradientFrom(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" aria-label="Gradient start" />
                  <span className="font-mono text-xs">{gradientFrom}</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)]">To</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={gradientTo} onChange={e => setGradientTo(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" aria-label="Gradient end" />
                  <span className="font-mono text-xs">{gradientTo}</span>
                </div>
              </div>
            </div>
            <Slider label="Angle" value={gradientAngle} onChange={setGradientAngle} min={0} max={360} />
            <Slider label="Stops" value={gradientStops} onChange={setGradientStops} min={2} max={10} />
          </div>

          <div className="flex gap-1 rounded-lg overflow-hidden h-8 mt-4">
            {gradientStopsArr.map((c, i) => (
              <div key={i} className="flex-1" style={{ backgroundColor: c }} title={c} />
            ))}
          </div>

          <CodeBlock title="CSS" code={`background: ${gradientCSS};`} onCopy={() => copy(`background: ${gradientCSS};`)} />
        </Card>
      </div>
    </div>
  );
}

function CodeBlock({ title, code, onCopy }: { title: string; code: string; onCopy: () => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-[var(--text-muted)]">{title}</span>
        <button onClick={onCopy} className="text-xs px-2 py-0.5 rounded hover:bg-[var(--border)] text-[var(--text-secondary)]">Copy</button>
      </div>
      <pre className="text-xs font-mono p-3 rounded-lg bg-[var(--bg-elevated)] overflow-x-auto text-[var(--text-secondary)] whitespace-pre-wrap">{code}</pre>
    </div>
  );
}

// ==================== SETTINGS PAGE ====================

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [exportData, setExportData] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleExport = () => {
    const data: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('color-lab-')) {
        data[key] = localStorage.getItem(key);
      }
    }
    setExportData(JSON.stringify(data, null, 2));
  };

  const handleImport = (json: string) => {
    try {
      const data = JSON.parse(json);
      if (typeof data !== 'object') throw new Error('Invalid format');
      Object.entries(data).forEach(([key, value]) => {
        if (key.startsWith('color-lab-') && typeof value === 'string') {
          localStorage.setItem(key, value);
        }
      });
      alert('Data imported successfully. Refresh to see changes.');
    } catch {
      alert('Invalid JSON data. Please check the format.');
    }
  };

  const handleClear = () => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('color-lab-')) keysToRemove.push(key);
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    setShowClearConfirm(false);
    alert('All Color Theory Lab data cleared.');
  };

  return (
    <div className="animate-fade-in">
      <SectionTitle subtitle="Manage your preferences and data">Settings</SectionTitle>
      
      <div className="max-w-2xl space-y-6">
        <Card>
          <h3 className="font-semibold mb-4">Appearance</h3>
          <div className="flex gap-3">
            {(['light', 'dark', 'system'] as const).map(t => (
              <button key={t} onClick={() => setTheme(t)}
                className={`px-4 py-2 rounded-lg capitalize transition-colors ${theme === t ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border)]'}`}>
                {t === 'light' ? '☀️' : t === 'dark' ? '🌙' : '💻'} {t}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-4">Data Management</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            All your data (palettes, game scores, settings) is stored locally in your browser. Nothing is sent to any server.
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={handleExport} className="px-4 py-2 rounded-lg bg-[var(--bg-elevated)] text-sm hover:bg-[var(--border)]">📤 Export Data</button>
            <label className="px-4 py-2 rounded-lg bg-[var(--bg-elevated)] text-sm hover:bg-[var(--border)] cursor-pointer">
              📥 Import Data
              <input type="file" accept=".json" className="hidden" onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => handleImport(ev.target?.result as string);
                  reader.readAsText(file);
                }
              }} />
            </label>
            <button onClick={() => setShowClearConfirm(true)} className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30">🗑️ Clear All Data</button>
          </div>

          {exportData && (
            <div className="mt-4">
              <textarea readOnly value={exportData} className="w-full h-32 p-3 rounded-lg bg-[var(--bg-elevated)] font-mono text-xs" />
              <button onClick={() => { navigator.clipboard.writeText(exportData); }} className="mt-2 text-xs px-3 py-1 rounded bg-[var(--bg-elevated)] hover:bg-[var(--border)]">Copy to clipboard</button>
            </div>
          )}

          {showClearConfirm && (
            <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-[var(--text-secondary)] mb-3">This will delete all locally stored data including:</p>
              <ul className="text-sm text-[var(--text-secondary)] list-disc list-inside mb-3">
                <li>Saved palettes</li>
                <li>Game scores and history</li>
                <li>Theme preferences</li>
                <li>All other Color Theory Lab data</li>
              </ul>
              <div className="flex gap-2">
                <button onClick={handleClear} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm">Confirm Clear</button>
                <button onClick={() => setShowClearConfirm(false)} className="px-4 py-2 rounded-lg bg-[var(--bg-elevated)] text-sm">Cancel</button>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold mb-4">About</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Color Theory Lab is a privacy-first, open-source educational application. No analytics, no tracking, no accounts. All processing happens in your browser.
          </p>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            Game scores are entertainment/educational metrics only. They do not measure color vision ability, intelligence, or any medical condition.
          </p>
        </Card>
      </div>
    </div>
  );
}

// ==================== GAMES HUB ====================

function GamesHubPage() {
  const navigate = useNavigate();
  const games = [
    { id: 'match', title: 'Color Match', desc: 'Recreate a target color as closely as possible', icon: '🎯' },
    { id: 'memory', title: 'Color Memory', desc: 'Memorize a color, then recreate it from memory', icon: '🧠' },
    { id: 'sequence', title: 'Color Sequence', desc: 'Remember and recreate a sequence of colors', icon: '🔢' },
    { id: 'odd', title: 'Odd Color', desc: 'Find the one tile that is different', icon: '🔍' },
  ];

  return (
    <div className="animate-fade-in">
      <SectionTitle subtitle="Test and train your color perception">Color Games</SectionTitle>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        These games are for fun and education. Scores are game metrics only — they do not measure vision ability or any medical condition.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map(game => (
          <button key={game.id} onClick={() => navigate(`/games/${game.id}`)}
            className="text-left p-6 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] hover:border-[var(--accent)] transition-all group">
            <span className="text-4xl mb-3 block">{game.icon}</span>
            <h3 className="text-lg font-semibold mb-1 group-hover:text-[var(--accent)] transition-colors">{game.title}</h3>
            <p className="text-sm text-[var(--text-secondary)]">{game.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ==================== GAME: COLOR MATCH ====================

type GameControlMode = 'HSL' | 'RGB' | 'HSV';

function ColorMatchGame() {
  const [started, setStarted] = useState(false);
  const [controlMode, setControlMode] = useState<GameControlMode>('HSL');
  const [target, setTarget] = useState<RGB>(() => randomColor());
  const [playerRgb, setPlayerRgb] = useState<RGB>({ r: 128, g: 128, b: 128 });
  const [submitted, setSubmitted] = useState(false);
  const [scores, setScores] = useLocalStorage<number[]>('color-lab-match-scores', []);
  const [round, setRound] = useState(1);

  const diff = submitted ? getColorDifference(target, playerRgb) : null;

  const handleSubmit = () => {
    setSubmitted(true);
    if (diff) {
      setScores([...scores, diff.score]);
    }
  };

  const handleNext = () => {
    setTarget(randomColor());
    setPlayerRgb({ r: 128, g: 128, b: 128 });
    setSubmitted(false);
    setRound(r => r + 1);
  };

  if (!started) {
    return (
      <div className="animate-fade-in max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">🎯 Color Match</h2>
        <Card>
          <p className="text-[var(--text-secondary)] mb-6">Recreate the target color as closely as you can using your preferred color model.</p>
          <div className="mb-6">
            <p className="text-sm font-medium mb-3">Control Mode</p>
            <div className="grid grid-cols-3 gap-2">
              {(['HSL', 'RGB', 'HSV'] as GameControlMode[]).map(m => (
                <button key={m} onClick={() => setControlMode(m)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${controlMode === m ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border)]'}`}>
                  {m}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              {controlMode === 'HSL' && 'Hue, Saturation, Lightness — intuitive for most people'}
              {controlMode === 'RGB' && 'Red, Green, Blue — additive color channels'}
              {controlMode === 'HSV' && 'Hue, Saturation, Value — brightness-based model'}
            </p>
          </div>
          <button onClick={() => setStarted(true)} className="w-full py-3 rounded-xl bg-[var(--accent)] text-white font-medium">Start Game</button>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">🎯 Color Match</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs px-2 py-1 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)]">{controlMode}</span>
          <span className="text-sm text-[var(--text-muted)]">Round {round}</span>
        </div>
      </div>

      {!submitted ? (
        <Card>
          <p className="text-sm text-[var(--text-secondary)] mb-4">Recreate the target color as closely as you can.</p>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1">Target</p>
              <div className="w-full h-32 rounded-xl" style={{ backgroundColor: rgbToHex(target) }} />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1">Your Color</p>
              <div className="w-full h-32 rounded-xl" style={{ backgroundColor: rgbToHex(playerRgb) }} />
            </div>
          </div>

          {controlMode === 'HSL' && (() => {
            const hsl = rgbToHsl(playerRgb);
            return (
              <div className="space-y-3 mb-6">
                <Slider label="Hue" value={hsl.h} onChange={v => setPlayerRgb(hslToRgb({ ...hsl, h: v }))} min={0} max={360}
                  gradient="linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))" />
                <Slider label="Saturation" value={hsl.s} onChange={v => setPlayerRgb(hslToRgb({ ...hsl, s: v }))} min={0} max={100} />
                <Slider label="Lightness" value={hsl.l} onChange={v => setPlayerRgb(hslToRgb({ ...hsl, l: v }))} min={0} max={100} />
              </div>
            );
          })()}

          {controlMode === 'RGB' && (
            <div className="space-y-3 mb-6">
              <Slider label="Red (R)" value={playerRgb.r} onChange={v => setPlayerRgb({ ...playerRgb, r: v })} min={0} max={255}
                gradient={`linear-gradient(to right, rgb(0,${playerRgb.g},${playerRgb.b}), rgb(255,${playerRgb.g},${playerRgb.b}))`} />
              <Slider label="Green (G)" value={playerRgb.g} onChange={v => setPlayerRgb({ ...playerRgb, g: v })} min={0} max={255}
                gradient={`linear-gradient(to right, rgb(${playerRgb.r},0,${playerRgb.b}), rgb(${playerRgb.r},255,${playerRgb.b}))`} />
              <Slider label="Blue (B)" value={playerRgb.b} onChange={v => setPlayerRgb({ ...playerRgb, b: v })} min={0} max={255}
                gradient={`linear-gradient(to right, rgb(${playerRgb.r},${playerRgb.g},0), rgb(${playerRgb.r},${playerRgb.g},255))`} />
            </div>
          )}

          {controlMode === 'HSV' && (() => {
            const hsv = rgbToHsv(playerRgb);
            return (
              <div className="space-y-3 mb-6">
                <Slider label="Hue" value={hsv.h} onChange={v => setPlayerRgb(hsvToRgb({ ...hsv, h: v }))} min={0} max={360}
                  gradient="linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))" />
                <Slider label="Saturation" value={hsv.s} onChange={v => setPlayerRgb(hsvToRgb({ ...hsv, s: v }))} min={0} max={100} />
                <Slider label="Value" value={hsv.v} onChange={v => setPlayerRgb(hsvToRgb({ ...hsv, v: v }))} min={0} max={100} />
              </div>
            );
          })()}

          <button onClick={handleSubmit} className="w-full py-3 rounded-xl bg-[var(--accent)] text-white font-medium hover:opacity-90 transition-opacity">
            Lock In
          </button>
        </Card>
      ) : (
        <Card>
          <div className="text-center mb-6">
            <p className="text-4xl font-bold mb-1">{diff?.score}%</p>
            <p className="text-[var(--text-secondary)]">Match Score</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1">Target</p>
              <div className="w-full h-24 rounded-xl" style={{ backgroundColor: rgbToHex(target) }} />
              <p className="text-xs font-mono mt-1 text-center">{rgbToHex(target)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1">Your Color</p>
              <div className="w-full h-24 rounded-xl" style={{ backgroundColor: rgbToHex(playerRgb) }} />
              <p className="text-xs font-mono mt-1 text-center">{rgbToHex(playerRgb)}</p>
            </div>
          </div>

          {diff && (
            <div className="space-y-2 mb-6 p-4 rounded-lg bg-[var(--bg-elevated)]">
              <div className="flex justify-between text-sm"><span>Hue error</span><span className="font-mono">{diff.hueDiff}°</span></div>
              <div className="flex justify-between text-sm"><span>Saturation error</span><span className="font-mono">{diff.satDiff > 0 ? '+' : ''}{diff.satDiff}%</span></div>
              <div className="flex justify-between text-sm"><span>Lightness error</span><span className="font-mono">{diff.lightDiff > 0 ? '+' : ''}{diff.lightDiff}%</span></div>
              <div className="flex justify-between text-sm"><span>Perceptual ΔE</span><span className="font-mono">{diff.deltaE}</span></div>
            </div>
          )}

          {diff && diff.primaryError !== 'balanced' && (
            <div className="p-3 rounded-lg bg-[var(--bg-elevated)] mb-4">
              <p className="text-sm text-[var(--text-secondary)]">
                {diff.primaryError === 'hue' && "Most of your difference came from hue. Try focusing on the color's position on the wheel."}
                {diff.primaryError === 'saturation' && "Most of your difference came from saturation. The target was more/less vivid than your choice."}
                {diff.primaryError === 'lightness' && "Most of your difference came from lightness. The target was lighter/darker than your choice."}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handleNext} className="flex-1 py-3 rounded-xl bg-[var(--accent)] text-white font-medium">Next Round</button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ==================== GAME: COLOR MEMORY ====================

type MemoryPhase = 'idle' | 'look' | 'recreate' | 'reveal';
type Difficulty = 'easy' | 'normal' | 'hard' | 'expert';

function ColorMemoryGame() {
  const [phase, setPhase] = useState<MemoryPhase>('idle');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [controlMode, setControlMode] = useState<GameControlMode>('HSL');
  const [target, setTarget] = useState<RGB>({ r: 128, g: 128, b: 128 });
  const [playerRgb, setPlayerRgb] = useState<RGB>({ r: 128, g: 128, b: 128 });
  const [countdown, setCountdown] = useState(3);
  const [round, setRound] = useState(1);
  const [totalRounds] = useState(5);
  const [scores, setScores] = useLocalStorage<number[]>('color-lab-memory-scores', []);
  const [roundScores, setRoundScores] = useState<number[]>([]);
  const [diff, setDiff] = useState<ReturnType<typeof getColorDifference> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const difficultyConfig = {
    easy: { time: 5, satRange: [40, 90] as [number, number], label: 'Easy' },
    normal: { time: 3, satRange: [30, 90] as [number, number], label: 'Normal' },
    hard: { time: 2, satRange: [20, 70] as [number, number], label: 'Hard' },
    expert: { time: 1, satRange: [10, 60] as [number, number], label: 'Expert' },
  };

  const generateTarget = useCallback(() => {
    const config = difficultyConfig[difficulty];
    const h = Math.random() * 360;
    const s = config.satRange[0] + Math.random() * (config.satRange[1] - config.satRange[0]);
    const l = 25 + Math.random() * 50;
    return hslToRgb({ h, s, l });
  }, [difficulty]);

  const startGame = () => {
    const t = generateTarget();
    setTarget(t);
    setRoundScores([]);
    setRound(1);
    startLookPhase(t);
  };

  const startLookPhase = (t: RGB) => {
    setTarget(t);
    setPhase('look');
    const config = difficultyConfig[difficulty];
    setCountdown(config.time);
    
    if (intervalRef.current) clearInterval(intervalRef.current);
    let remaining = config.time;
    intervalRef.current = setInterval(() => {
      remaining -= 0.1;
      setCountdown(Math.max(0, remaining));
      if (remaining <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setPhase('recreate');
      }
    }, 100);
  };

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const handleLockIn = () => {
    const d = getColorDifference(target, playerRgb);
    setDiff(d);
    setRoundScores([...roundScores, d.score]);
    setPhase('reveal');
  };

  const handleContinue = () => {
    if (round >= totalRounds) {
      const avg = roundScores.reduce((a, b) => a + b, 0) / roundScores.length;
      setScores([...scores, Math.round(avg * 10) / 10]);
      setPhase('idle');
    } else {
      const t = generateTarget();
      setRound(r => r + 1);
      setPlayerRgb({ r: 128, g: 128, b: 128 });
      startLookPhase(t);
    }
  };

  const avgScore = roundScores.length > 0 ? Math.round(roundScores.reduce((a, b) => a + b, 0) / roundScores.length * 10) / 10 : 0;

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">🧠 Color Memory</h2>
        {phase !== 'idle' && <span className="text-sm text-[var(--text-muted)]">Round {round}/{totalRounds}</span>}
      </div>

      {phase === 'idle' && (
        <Card>
          <p className="text-[var(--text-secondary)] mb-6">
            A color will appear briefly. Memorize it, then recreate it from memory.
          </p>
          <div className="mb-6">
            <p className="text-sm font-medium mb-2">Difficulty</p>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(difficultyConfig) as Difficulty[]).map(d => (
                <button key={d} onClick={() => setDifficulty(d)}
                  className={`px-3 py-2 rounded-lg text-sm capitalize transition-colors ${difficulty === d ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border)]'}`}>
                  {d}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              {difficultyConfig[difficulty].time}s viewing time • {difficulty === 'easy' ? 'vivid colors' : difficulty === 'normal' ? 'mixed colors' : difficulty === 'hard' ? 'subtle colors' : 'very subtle colors'}
            </p>
          </div>
          <div className="mb-6">
            <p className="text-sm font-medium mb-2">Control Mode</p>
            <div className="grid grid-cols-3 gap-2">
              {(['HSL', 'RGB', 'HSV'] as GameControlMode[]).map(m => (
                <button key={m} onClick={() => setControlMode(m)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${controlMode === m ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border)]'}`}>
                  {m}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              {controlMode === 'HSL' && 'Hue, Saturation, Lightness — intuitive for most people'}
              {controlMode === 'RGB' && 'Red, Green, Blue — additive color channels'}
              {controlMode === 'HSV' && 'Hue, Saturation, Value — brightness-based model'}
            </p>
          </div>
          <button onClick={startGame} className="w-full py-3 rounded-xl bg-[var(--accent)] text-white font-medium hover:opacity-90">
            Start Game
          </button>
          {scores.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-[var(--bg-elevated)]">
              <p className="text-xs text-[var(--text-muted)]">Best: {Math.max(...scores)}% | Average: {Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10}% | Games: {scores.length}</p>
            </div>
          )}
        </Card>
      )}

      {phase === 'look' && (
        <Card>
          <div className="text-center">
            <p className="text-sm text-[var(--text-muted)] mb-2">MEMORIZE THIS COLOR</p>
            <div className="w-full h-64 rounded-xl mb-4" style={{ backgroundColor: rgbToHex(target) }} />
            <p className="text-5xl font-bold animate-countdown" key={Math.floor(countdown)}>{Math.ceil(countdown)}</p>
          </div>
        </Card>
      )}

      {phase === 'recreate' && (
        <Card>
          <p className="text-sm text-[var(--text-muted)] mb-4 text-center">RECREATE THE COLOR</p>
          <div className="w-full h-40 rounded-xl mb-4" style={{ backgroundColor: rgbToHex(playerRgb) }} />
          
          {controlMode === 'HSL' && (() => {
            const hsl = rgbToHsl(playerRgb);
            return (
              <div className="space-y-3 mb-6">
                <Slider label="Hue" value={hsl.h} onChange={v => setPlayerRgb(hslToRgb({ ...hsl, h: v }))} min={0} max={360}
                  gradient="linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))" />
                <Slider label="Saturation" value={hsl.s} onChange={v => setPlayerRgb(hslToRgb({ ...hsl, s: v }))} min={0} max={100} />
                <Slider label="Lightness" value={hsl.l} onChange={v => setPlayerRgb(hslToRgb({ ...hsl, l: v }))} min={0} max={100} />
              </div>
            );
          })()}

          {controlMode === 'RGB' && (
            <div className="space-y-3 mb-6">
              <Slider label="Red (R)" value={playerRgb.r} onChange={v => setPlayerRgb({ ...playerRgb, r: v })} min={0} max={255}
                gradient={`linear-gradient(to right, rgb(0,${playerRgb.g},${playerRgb.b}), rgb(255,${playerRgb.g},${playerRgb.b}))`} />
              <Slider label="Green (G)" value={playerRgb.g} onChange={v => setPlayerRgb({ ...playerRgb, g: v })} min={0} max={255}
                gradient={`linear-gradient(to right, rgb(${playerRgb.r},0,${playerRgb.b}), rgb(${playerRgb.r},255,${playerRgb.b}))`} />
              <Slider label="Blue (B)" value={playerRgb.b} onChange={v => setPlayerRgb({ ...playerRgb, b: v })} min={0} max={255}
                gradient={`linear-gradient(to right, rgb(${playerRgb.r},${playerRgb.g},0), rgb(${playerRgb.r},${playerRgb.g},255))`} />
            </div>
          )}

          {controlMode === 'HSV' && (() => {
            const hsv = rgbToHsv(playerRgb);
            return (
              <div className="space-y-3 mb-6">
                <Slider label="Hue" value={hsv.h} onChange={v => setPlayerRgb(hsvToRgb({ ...hsv, h: v }))} min={0} max={360}
                  gradient="linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))" />
                <Slider label="Saturation" value={hsv.s} onChange={v => setPlayerRgb(hsvToRgb({ ...hsv, s: v }))} min={0} max={100} />
                <Slider label="Value" value={hsv.v} onChange={v => setPlayerRgb(hsvToRgb({ ...hsv, v: v }))} min={0} max={100} />
              </div>
            );
          })()}

          <button onClick={handleLockIn} className="w-full py-3 rounded-xl bg-[var(--accent)] text-white font-medium">Lock In</button>
        </Card>
      )}

      {phase === 'reveal' && diff && (
        <Card>
          <div className="text-center mb-6">
            <p className="text-4xl font-bold mb-1">{diff.score}%</p>
            <p className="text-[var(--text-secondary)]">Match Score</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1 text-center">Target</p>
              <div className="w-full h-24 rounded-xl" style={{ backgroundColor: rgbToHex(target) }} />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1 text-center">Your Color</p>
              <div className="w-full h-24 rounded-xl" style={{ backgroundColor: rgbToHex(playerRgb) }} />
            </div>
          </div>
          <div className="space-y-2 mb-6 p-4 rounded-lg bg-[var(--bg-elevated)]">
            <div className="flex justify-between text-sm"><span>Hue error</span><span className="font-mono">{diff.hueDiff}°</span></div>
            <div className="flex justify-between text-sm"><span>Saturation error</span><span className="font-mono">{diff.satDiff > 0 ? '+' : ''}{diff.satDiff}%</span></div>
            <div className="flex justify-between text-sm"><span>Lightness error</span><span className="font-mono">{diff.lightDiff > 0 ? '+' : ''}{diff.lightDiff}%</span></div>
            <div className="flex justify-between text-sm"><span>ΔE</span><span className="font-mono">{diff.deltaE}</span></div>
          </div>
          {diff.primaryError !== 'balanced' && (
            <div className="p-3 rounded-lg bg-[var(--bg-elevated)] mb-4">
              <p className="text-sm text-[var(--text-secondary)]">
                {diff.primaryError === 'hue' && "Your hue was off. The color was more red/orange or more blue/green than you chose."}
                {diff.primaryError === 'saturation' && "Your saturation was off. The color was more/less vivid than you chose."}
                {diff.primaryError === 'lightness' && "Your lightness was off. The color was lighter/darker than you chose."}
              </p>
            </div>
          )}
          <button onClick={handleContinue} className="w-full py-3 rounded-xl bg-[var(--accent)] text-white font-medium">
            {round >= totalRounds ? 'See Results' : 'Continue'}
          </button>
        </Card>
      )}
    </div>
  );
}

// ==================== GAME: COLOR SEQUENCE ====================

function ColorSequenceGame() {
  const [phase, setPhase] = useState<'idle' | 'show' | 'recreate' | 'result'>('idle');
  const [sequenceLength, setSequenceLength] = useState(3);
  const [targets, setTargets] = useState<RGB[]>([]);
  const [playerColors, setPlayerColors] = useState<HSL[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useLocalStorage<number[]>('color-lab-sequence-scores', []);
  const [result, setResult] = useState<{ score: number; details: number[] } | null>(null);

  const startGame = () => {
    const seq = Array.from({ length: sequenceLength }, () => {
      const h = Math.random() * 360;
      const s = 40 + Math.random() * 50;
      const l = 30 + Math.random() * 40;
      return hslToRgb({ h, s, l });
    });
    setTargets(seq);
    setPlayerColors(Array.from({ length: sequenceLength }, () => ({ h: 180, s: 50, l: 50 })));
    setCurrentIndex(0);
    setPhase('show');
    
    // Show sequence briefly then go to recreate
    setTimeout(() => setPhase('recreate'), sequenceLength * 1000 + 1000);
  };

  const handleSubmit = () => {
    const details = targets.map((t, i) => {
      const p = hslToRgb(playerColors[i]);
      const d = getColorDifference(t, p);
      return d.score;
    });
    const avg = details.reduce((a, b) => a + b, 0) / details.length;
    setResult({ score: Math.round(avg * 10) / 10, details });
    setScores([...scores, Math.round(avg * 10) / 10]);
    setPhase('result');
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">🔢 Color Sequence</h2>

      {phase === 'idle' && (
        <Card>
          <p className="text-[var(--text-secondary)] mb-4">Colors will flash briefly. Memorize them in order, then recreate them.</p>
          <div className="mb-4">
            <Slider label="Sequence Length" value={sequenceLength} onChange={setSequenceLength} min={3} max={7} />
          </div>
          <button onClick={startGame} className="w-full py-3 rounded-xl bg-[var(--accent)] text-white font-medium">Start</button>
        </Card>
      )}

      {phase === 'show' && (
        <Card>
          <p className="text-center text-[var(--text-muted)] mb-4">MEMORIZE THE SEQUENCE</p>
          <div className="flex gap-2 justify-center">
            {targets.map((c, i) => (
              <div key={i} className="w-20 h-20 rounded-xl animate-fade-in" style={{ backgroundColor: rgbToHex(c), animationDelay: `${i * 0.3}s` }} />
            ))}
          </div>
        </Card>
      )}

      {phase === 'recreate' && (
        <Card>
          <p className="text-center text-[var(--text-muted)] mb-4">RECREATE EACH COLOR IN ORDER</p>
          <div className="space-y-4 mb-6">
            {targets.map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm font-mono text-[var(--text-muted)] w-6">#{i + 1}</span>
                <div className="w-12 h-12 rounded-lg" style={{ backgroundColor: rgbToHex(hslToRgb(playerColors[i])) }} />
                <div className="flex-1 space-y-1">
                  <input type="range" min={0} max={360} value={playerColors[i].h} onChange={e => {
                    const newColors = [...playerColors];
                    newColors[i] = { ...newColors[i], h: parseFloat(e.target.value) };
                    setPlayerColors(newColors);
                  }} className="w-full h-2" aria-label={`Color ${i + 1} hue`} />
                  <div className="flex gap-2">
                    <input type="range" min={0} max={100} value={playerColors[i].s} onChange={e => {
                      const newColors = [...playerColors];
                      newColors[i] = { ...newColors[i], s: parseFloat(e.target.value) };
                      setPlayerColors(newColors);
                    }} className="flex-1 h-2" aria-label={`Color ${i + 1} saturation`} />
                    <input type="range" min={0} max={100} value={playerColors[i].l} onChange={e => {
                      const newColors = [...playerColors];
                      newColors[i] = { ...newColors[i], l: parseFloat(e.target.value) };
                      setPlayerColors(newColors);
                    }} className="flex-1 h-2" aria-label={`Color ${i + 1} lightness`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={handleSubmit} className="w-full py-3 rounded-xl bg-[var(--accent)] text-white font-medium">Submit</button>
        </Card>
      )}

      {phase === 'result' && result && (
        <Card>
          <div className="text-center mb-6">
            <p className="text-4xl font-bold">{result.score}%</p>
            <p className="text-[var(--text-secondary)]">Sequence Score</p>
          </div>
          <div className="flex gap-2 justify-center mb-4">
            {targets.map((t, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="w-14 h-14 rounded-lg" style={{ backgroundColor: rgbToHex(t) }} />
                <span className="text-xs font-mono">{result.details[i]}%</span>
              </div>
            ))}
          </div>
          <button onClick={() => setPhase('idle')} className="w-full py-3 rounded-xl bg-[var(--accent)] text-white font-medium">Play Again</button>
        </Card>
      )}
    </div>
  );
}

// ==================== GAME: ODD COLOR ====================

function OddColorGame() {
  const [gridSize, setGridSize] = useState(4);
  const [phase, setPhase] = useState<'idle' | 'playing' | 'result'>('idle');
  const [baseColor, setBaseColor] = useState<RGB>({ r: 100, g: 150, b: 200 });
  const [oddIndex, setOddIndex] = useState(0);
  const [oddColor, setOddColor] = useState<RGB>({ r: 110, g: 155, b: 195 });
  const [selected, setSelected] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useLocalStorage('color-lab-odd-streak', 0);
  const [difficulty, setDifficulty] = useState(15);
  const [startTime, setStartTime] = useState(0);
  const [reactionTime, setReactionTime] = useState(0);
  const [scores, setScores] = useLocalStorage<number[]>('color-lab-odd-scores', []);

  const startRound = () => {
    const h = Math.random() * 360;
    const s = 40 + Math.random() * 40;
    const l = 35 + Math.random() * 30;
    const base = hslToRgb({ h, s, l });
    
    // Create odd color with perceptual difference
    const deltaH = (Math.random() > 0.5 ? 1 : -1) * difficulty * 0.3;
    const deltaS = (Math.random() > 0.5 ? 1 : -1) * difficulty * 0.5;
    const deltaL = (Math.random() > 0.5 ? 1 : -1) * difficulty * 0.4;
    const odd = hslToRgb({ h: wrapHue(h + deltaH), s: clamp(s + deltaS, 0, 100), l: clamp(l + deltaL, 5, 95) });
    
    const totalTiles = gridSize * gridSize;
    const oddIdx = Math.floor(Math.random() * totalTiles);
    
    setBaseColor(base);
    setOddColor(odd);
    setOddIndex(oddIdx);
    setSelected(null);
    setPhase('playing');
    setStartTime(Date.now());
  };

  const handleSelect = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    setReactionTime(Date.now() - startTime);
    
    if (i === oddIndex) {
      setStreak(s => {
        const newStreak = s + 1;
        if (newStreak > bestStreak) setBestStreak(newStreak);
        return newStreak;
      });
      setScores([...scores, Math.round(1000 / Math.max(reactionTime, 100) * 100)]);
      setTimeout(() => startRound(), 800);
    } else {
      setStreak(0);
      setPhase('result');
    }
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">🔍 Odd Color</h2>

      {phase === 'idle' && (
        <Card>
          <p className="text-[var(--text-secondary)] mb-4">Find the tile that's a different color. It might be subtle!</p>
          <div className="mb-4">
            <Slider label="Difficulty (subtlety)" value={difficulty} onChange={setDifficulty} min={3} max={30} />
            <p className="text-xs text-[var(--text-muted)] mt-1">Lower = harder (more subtle difference)</p>
          </div>
          <div className="mb-4">
            <Slider label="Grid Size" value={gridSize} onChange={setGridSize} min={3} max={6} />
          </div>
          <button onClick={startRound} className="w-full py-3 rounded-xl bg-[var(--accent)] text-white font-medium">Start</button>
          {bestStreak > 0 && <p className="text-sm text-[var(--text-muted)] mt-3 text-center">Best streak: {bestStreak}</p>}
        </Card>
      )}

      {(phase === 'playing' || phase === 'result') && (
        <Card>
          <div className="flex justify-between mb-4">
            <span className="text-sm text-[var(--text-muted)]">Streak: {streak}</span>
            {reactionTime > 0 && <span className="text-sm text-[var(--text-muted)]">{reactionTime}ms</span>}
          </div>
          <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
            {Array.from({ length: gridSize * gridSize }, (_, i) => {
              const isOdd = i === oddIndex;
              const color = isOdd ? oddColor : baseColor;
              const isSelected = selected === i;
              const isRevealed = phase === 'result';
              return (
                <button
                  key={i}
                  onClick={() => handleSelect(i)}
                  className={`aspect-square rounded-xl transition-all ${isSelected ? 'ring-4 ring-[var(--accent)]' : ''} ${isRevealed && isOdd ? 'ring-4 ring-green-500' : ''} ${isRevealed && isSelected && !isOdd ? 'ring-4 ring-red-500' : ''}`}
                  style={{ backgroundColor: rgbToHex(color) }}
                  aria-label={`Tile ${i + 1}${isOdd && isRevealed ? ' (odd one)' : ''}`}
                  disabled={phase === 'result'}
                />
              );
            })}
          </div>
          {phase === 'result' && (
            <div className="mt-4 text-center">
              <p className="text-lg font-bold text-[var(--error)]">Wrong tile!</p>
              <p className="text-sm text-[var(--text-muted)]">The odd one was highlighted in green.</p>
              <button onClick={() => { setPhase('idle'); setStreak(0); }} className="mt-3 px-6 py-2 rounded-xl bg-[var(--accent)] text-white">Try Again</button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ==================== UTILITY FUNCTIONS ====================

function randomColor(): RGB {
  const h = Math.random() * 360;
  const s = 30 + Math.random() * 60;
  const l = 25 + Math.random() * 50;
  return hslToRgb({ h, s, l });
}

// ==================== MAIN APP ====================

export default function App() {
  useTheme(); // Initialize theme

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/lab" element={<ColorLabPage />} />
          <Route path="/wheel" element={<ColorWheelPage />} />
          <Route path="/harmony" element={<HarmonyLabPage />} />
          <Route path="/palette" element={<PaletteLabPage />} />
          <Route path="/image" element={<ImagePalettePage />} />
          <Route path="/theory" element={<ColorTheoryPage />} />
          <Route path="/games" element={<GamesHubPage />} />
          <Route path="/games/match" element={<ColorMatchGame />} />
          <Route path="/games/memory" element={<ColorMemoryGame />} />
          <Route path="/games/sequence" element={<ColorSequenceGame />} />
          <Route path="/games/odd" element={<OddColorGame />} />
          <Route path="/accessibility" element={<AccessibilityPage />} />
          <Route path="/science" element={<ColorSciencePage />} />
          <Route path="/dev" element={<DeveloperToolsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

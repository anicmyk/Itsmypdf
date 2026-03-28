
import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, degrees, StandardFonts, BlendMode } from 'pdf-lib';
import { PagePreviewModal } from '../shared/PagePreviewModal';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { LazyThumbnail } from '../shared/LazyThumbnail';
import { PdfUploadHero } from '../shared/PdfUploadHero';
import { PdfPageCard } from '../shared/PdfPageCard';
import { MobileLayout } from '../shared/MobileLayout';
import { ToolCTAs } from '../shared/ToolCTAs';

import {
  Plus, X, ArrowRight, Type, Image as ImageIcon, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight, Layers, Move, Grid3x3,
  RotateCw, Palette, ChevronDown, Check, MousePointer2, Settings, ArrowLeft, Trash2, ArrowUpLeft, CornerLeftUp
} from 'lucide-react';
import { toast } from 'sonner';

// Set up PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;
}

// From types.ts
export type WatermarkType = 'text' | 'image';

export type WatermarkPosition = 'top-left' | 'top-center' | 'top-right' | 'middle-left' | 'middle-center' | 'middle-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface WatermarkOptions {
  type: WatermarkType;
  text: string;
  font: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color: string;
  textAlign: 'left' | 'center' | 'right';
  image?: File | string | null;
  position: WatermarkPosition;
  offsetX: number;
  offsetY: number;
  offsetXNorm?: number;
  offsetYNorm?: number;
  mosaic: boolean;
  transparency: number; // 0-1
  rotation: number; // degrees
  pages: 'all' | 'custom';
  startPage: number;
  endPage: number;
  layer: 'over' | 'below';
}

export const FONT_OPTIONS = [
  'Arial', 'Times New Roman', 'Courier'
];

export const FONT_SIZES = [14, 18, 24, 36, 48, 72, 96, 144];

export const TRANSPARENCY_OPTIONS = [
  { label: 'No transparency', value: 0 },
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
];

// Removed arbitrary adjustment constants - using proper coordinate conversion instead
// Preview and PDF now use consistent positioning logic

export const ROTATION_OPTIONS = [
  { label: 'Do not rotate', value: 0 },
  { label: '45 degrees', value: 45 },
  { label: '90 degrees', value: 90 },
  { label: '180 degrees', value: 180 },
  { label: '270 degrees', value: 270 },
];

export const PRESET_COLORS = [
  '#000000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc', '#ffffff'
];

// Professional Watermark Presets
export const WATERMARK_PRESETS = [
  {
    id: 'standard-copyright',
    name: 'Standard Copyright',
    description: 'Most common, low-opacity watermark for casual users and businesses',
    icon: '©',
    config: {
      type: 'text' as WatermarkType,
      text: '© Your Company',
      font: 'Arial',
      fontSize: 24, // Will be calculated as 2.5% of page width
      bold: false,
      italic: false,
      underline: false,
      color: '#000000',
      textAlign: 'center' as const,
      position: 'bottom-right' as WatermarkPosition,
      offsetX: 0,
      offsetY: 0,
      transparency: 0.82, // 18% opacity
      rotation: 0,
      mosaic: false,
      layer: 'over' as const,
    }
  },
  {
    id: 'social-share',
    name: 'Social Share Protection',
    description: 'Prevents reuse and screenshots on public sharing',
    icon: '🔒',
    config: {
      type: 'text' as WatermarkType,
      text: 'PROTECTED',
      font: 'Arial',
      fontSize: 48, // 6% of page width
      bold: true,
      italic: false,
      underline: false,
      color: '#000000',
      textAlign: 'center' as const,
      position: 'middle-center' as WatermarkPosition,
      offsetX: 0,
      offsetY: 0,
      transparency: 0.90, // 10% opacity
      rotation: -35,
      mosaic: false,
      layer: 'over' as const,
    }
  },
  {
    id: 'minimal-branding',
    name: 'Minimal Branding',
    description: 'Discreet branding for freelancers and agencies',
    icon: '✨',
    config: {
      type: 'text' as WatermarkType,
      text: 'Your Brand',
      font: 'Arial',
      fontSize: 36, // 5% of page width
      bold: false,
      italic: false,
      underline: false,
      color: '#000000',
      textAlign: 'center' as const,
      position: 'top-left' as WatermarkPosition,
      offsetX: 0,
      offsetY: 0,
      transparency: 0.85, // 15% opacity
      rotation: 0,
      mosaic: false,
      layer: 'over' as const,
    }
  },
  {
    id: 'confidential',
    name: 'Confidential Document',
    description: 'Clear internal or legal document marking',
    icon: '⚠️',
    config: {
      type: 'text' as WatermarkType,
      text: 'CONFIDENTIAL',
      font: 'Arial',
      fontSize: 56, // 7% of page width
      bold: true,
      italic: false,
      underline: false,
      color: '#b40000', // Dark red
      textAlign: 'center' as const,
      position: 'middle-center' as WatermarkPosition,
      offsetX: 0,
      offsetY: 0,
      transparency: 0.88, // 12% opacity
      rotation: 0,
      mosaic: false,
      layer: 'over' as const,
    }
  },
  {
    id: 'full-page-protection',
    name: 'Full-Page Protection',
    description: 'Strong theft prevention for paid or sensitive content',
    icon: '🛡️',
    config: {
      type: 'text' as WatermarkType,
      text: 'PROTECTED',
      font: 'Arial',
      fontSize: 32, // 4% of page width
      bold: false,
      italic: false,
      underline: false,
      color: '#000000',
      textAlign: 'center' as const,
      position: 'middle-center' as WatermarkPosition,
      offsetX: 0,
      offsetY: 0,
      transparency: 0.93, // 7% opacity
      rotation: -30,
      mosaic: true, // Repeated pattern
      layer: 'over' as const,
    }
  },
  {
    id: 'photo-safe',
    name: 'Photo-Safe Watermark',
    description: 'Suitable for image-heavy PDFs and portfolios',
    icon: '📷',
    config: {
      type: 'text' as WatermarkType,
      text: 'SAMPLE',
      font: 'Arial',
      fontSize: 64, // 8% of page width
      bold: false,
      italic: false,
      underline: false,
      color: '#ffffff', // White
      textAlign: 'center' as const,
      position: 'middle-center' as WatermarkPosition,
      offsetX: 0,
      offsetY: 0,
      transparency: 0.92, // 8% opacity
      rotation: 0,
      mosaic: false,
      layer: 'over' as const,
    }
  },
  {
    id: 'draft-preview',
    name: 'Draft / Preview',
    description: 'Signals unfinished or review-stage documents',
    icon: '📝',
    config: {
      type: 'text' as WatermarkType,
      text: 'DRAFT',
      font: 'Arial',
      fontSize: 80, // 10% of page width
      bold: true,
      italic: false,
      underline: false,
      color: '#787878', // Grey
      textAlign: 'center' as const,
      position: 'middle-center' as WatermarkPosition,
      offsetX: 0,
      offsetY: 0,
      transparency: 0.85, // 15% opacity
      rotation: -25,
      mosaic: false,
      layer: 'over' as const,
    }
  }
];

// Default preset for first-time users
export const DEFAULT_PRESET_ID = 'standard-copyright';


// From components/hooks/useDraggable.ts
interface Position {
  x: number;
  y: number;
}

interface DraggableOptions {
  initialPosition: Position;
  onDrag?: (position: Position) => void;
  onDragEnd?: (position: Position) => void;
}

const useDraggable = ({ initialPosition, onDrag, onDragEnd }: DraggableOptions) => {
  const [position, setPosition] = useState<Position>(initialPosition);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, elX: 0, elY: 0 });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const newPos = {
      x: dragStartRef.current.elX + dx,
      y: dragStartRef.current.elY + dy,
    };
    setPosition(newPos);
    if (onDrag) {
      onDrag(newPos);
    }
  }, [onDrag]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    if (onDragEnd) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      onDragEnd({
        x: dragStartRef.current.elX + dx,
        y: dragStartRef.current.elY + dy,
      });
    }

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
  }, [handleMouseMove, onDragEnd]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      elX: position.x,
      elY: position.y,
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'grabbing';
  }, [handleMouseMove, handleMouseUp, position]);

  useEffect(() => {
    // Sync position if initialPosition changes from outside
    setPosition(initialPosition);
  }, [initialPosition]);

  // Cleanup event listeners on unmount if dragging
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = ''; // Ensure cursor is reset
    };
  }, [handleMouseMove, handleMouseUp]);

  return { position, handleMouseDown };
};

// From components/ColorPicker.tsx
interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

// Color conversion utilities
const hexToRgbaPicker = (hex: string) => {
  let c: any;
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    c = hex.substring(1).split('');
    if (c.length === 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = '0x' + c.join('');
    return { r: (c >> 16) & 255, g: (c >> 8) & 255, b: c & 255, a: 1 };
  }
  const rgbaMatch = hex.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
  if (rgbaMatch) {
    return { r: parseInt(rgbaMatch[1]), g: parseInt(rgbaMatch[2]), b: parseInt(rgbaMatch[3]), a: rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1 };
  }
  return { r: 255, g: 0, b: 0, a: 1 };
};

const rgbaToHex = (r: number, g: number, b: number) => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toLowerCase();
};

const rgbaToHsla = (r: number, g: number, b: number, a: number) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100, a };
};

const hslaToRgba = (h: number, s: number, l: number, a: number) => {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (0 <= h && h < 60) { [r, g, b] = [c, x, 0]; }
  else if (60 <= h && h < 120) { [r, g, b] = [x, c, 0]; }
  else if (120 <= h && h < 180) { [r, g, b] = [0, c, x]; }
  else if (180 <= h && h < 240) { [r, g, b] = [0, x, c]; }
  else if (240 <= h && h < 300) { [r, g, b] = [x, 0, c]; }
  else if (300 <= h && h < 360) { [r, g, b] = [c, 0, x]; }
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  return { r, g, b, a };
};

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange }) => {
  const initialRgba = hexToRgbaPicker(color);
  const initialHsla = rgbaToHsla(initialRgba.r, initialRgba.g, initialRgba.b, initialRgba.a);

  const [hsla, setHsla] = useState(initialHsla);
  const [hexInput, setHexInput] = useState(rgbaToHex(initialRgba.r, initialRgba.g, initialRgba.b));
  const satValRef = useRef<HTMLDivElement>(null);

  const handleColorChange = (newHsla: { h: number, s: number, l: number, a: number }) => {
    setHsla(newHsla);
    const newRgba = hslaToRgba(newHsla.h, newHsla.s, newHsla.l, newHsla.a);
    const newHex = rgbaToHex(newRgba.r, newRgba.g, newRgba.b);
    setHexInput(newHex);
    onChange(`rgba(${newRgba.r}, ${newRgba.g}, ${newRgba.b}, ${newRgba.a})`);
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value;
    setHexInput(newHex);
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(newHex)) {
      const newRgba = hexToRgbaPicker(newHex);
      const newHsla = rgbaToHsla(newRgba.r, newRgba.g, newRgba.b, hsla.a);
      setHsla(newHsla);
      onChange(`rgba(${newRgba.r}, ${newRgba.g}, ${newRgba.b}, ${newHsla.a})`);
    }
  };

  const handleSatValDrag = useCallback((e: React.MouseEvent) => {
    if (satValRef.current && e.buttons === 1) {
      const rect = satValRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
      const s = (x / rect.width) * 100;
      const l = (1 - y / rect.height) * (100 - s / 2);
      handleColorChange({ ...hsla, s, l: 50 * (2 - s / 100) * (1 - y / rect.height) });
    }
  }, [hsla, handleColorChange]);

  useEffect(() => {
    const newRgba = hexToRgbaPicker(color);
    const newHsla = rgbaToHsla(newRgba.r, newRgba.g, newRgba.b, newRgba.a);
    setHsla(newHsla);
    setHexInput(rgbaToHex(newRgba.r, newRgba.g, newRgba.b));
  }, [color]);

  const satValStyle = { backgroundColor: `hsl(${hsla.h}, 100%, 50%)` };

  return (
    <div className="p-3 bg-white w-[256px] space-y-3">
      <div ref={satValRef} onMouseMove={handleSatValDrag} onMouseDown={handleSatValDrag} className="w-full h-40 rounded-md cursor-crosshair relative" style={satValStyle}>
        <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
        <div className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md" style={{ left: `${hsla.s}%`, top: `${100 - (hsla.l / (1 - hsla.s / 200))}%`, transform: 'translate(-50%, -50%)' }} />
      </div>

      <div className="space-y-2">
        <input type="range" min="0" max="360" value={hsla.h} onChange={e => handleColorChange({ ...hsla, h: +e.target.value })} className="w-full h-2 rounded-lg appearance-none cursor-pointer" style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }} />
        <input type="range" min="0" max="1" step="0.01" value={hsla.a} onChange={e => handleColorChange({ ...hsla, a: +e.target.value })} className="w-full h-2 rounded-lg appearance-none cursor-pointer" style={{ background: `linear-gradient(to right, transparent, ${rgbaToHex(hslaToRgba(hsla.h, hsla.s, hsla.l, 1).r, hslaToRgba(hsla.h, hsla.s, hsla.l, 1).g, hslaToRgba(hsla.h, hsla.s, hsla.l, 1).b)}), url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAADBJREFUOE9jZGBgEGHAD97/B4RqrJAQZaC44uODs2TssklctmMygyYGjBoEAFkaIE3y3sYtAAAAAElFTkSuQmCC')` }} />
      </div>

      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-md border" style={{ backgroundColor: `rgba(${hslaToRgba(hsla.h, hsla.s, hsla.l, hsla.a).r}, ${hslaToRgba(hsla.h, hsla.s, hsla.l, hsla.a).g}, ${hslaToRgba(hsla.h, hsla.s, hsla.l, hsla.a).b}, ${hsla.a})` }}></div>
        <input type="text" value={hexInput} onChange={handleHexChange} className="flex-1 px-2 py-1 border rounded-md text-sm" />
      </div>

      <div className="grid grid-cols-10 gap-1">
        {PRESET_COLORS.map(c => (
          <button key={c} onClick={() => onChange(c)} className="w-full aspect-square rounded-sm border" style={{ backgroundColor: c }} />
        ))}
      </div>
    </div>
  );
};


// From components/hooks/useClickOutside.ts
const useClickOutside = (ref: React.RefObject<HTMLElement>, handler: () => void) => {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};

const positionToClasses: { [key in WatermarkPosition]: string } = {
  'top-left': 'top-3 left-3',
  'top-center': 'top-3 left-1/2 -translate-x-1/2',
  'top-right': 'top-3 right-3',
  'middle-left': 'top-1/2 -translate-y-1/2 left-3',
  'middle-center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  'middle-right': 'top-1/2 -translate-y-1/2 right-3',
  'bottom-left': 'bottom-3 left-3',
  'bottom-center': 'bottom-3 left-1/2 -translate-x-1/2',
  'bottom-right': 'bottom-3 right-3',
};

const PagePlaceholder = () => (
  <div className="w-full h-full border-2 border-dashed border-gray-200 rounded-md flex flex-col items-start p-3 text-xs text-gray-400 overflow-hidden space-y-2">
    <div className="w-1/3 h-2 bg-gray-300 rounded-full"></div>
    <div className="w-3/4 h-2 bg-gray-200 rounded-full"></div>
    <div className="w-full h-2 bg-gray-200 rounded-full"></div>
    <div className="w-full h-2 bg-gray-200 rounded-full"></div>
    <div className="w-1/2 h-2 bg-gray-200 rounded-full"></div>
    <div className="w-full h-2 bg-gray-200 rounded-full mt-2"></div>
    <div className="w-3/4 h-2 bg-gray-200 rounded-full"></div>
    <div className="w-full h-2 bg-gray-200 rounded-full"></div>
    <div className="w-2/3 h-2 bg-gray-200 rounded-full"></div>
  </div>
);


interface PageThumbnailProps {
  pageNumber: number;
  onClick?: () => void;
  isSelected?: boolean;
  isMosaic?: boolean;
  position?: WatermarkPosition;
  isWatermarked?: boolean;
  watermarkOptions?: WatermarkOptions;
  file?: File | null;
  pdfDoc?: any; // PDFDocumentProxy
  registerRef?: (el: HTMLDivElement | null) => void;
}



const PageThumbnail: React.FC<PageThumbnailProps> = React.memo(({ pageNumber, onClick, isSelected, isMosaic, position = 'middle-center', isWatermarked, watermarkOptions, file }) => {
  const renderContent = () => {
    if (!watermarkOptions) return <div className="w-3 h-3 bg-brand-blue-600 rounded-full shadow-sm ring-1 ring-white" />;

    if (watermarkOptions.type === 'image' && watermarkOptions.image) {
      return (
        <img
          src={typeof watermarkOptions.image === 'string' ? watermarkOptions.image : ''}
          style={{
            width: `${Math.max(10, watermarkOptions.fontSize * 0.2)}px`,
            opacity: 1 - (watermarkOptions.transparency || 0),
            transform: `rotate(${watermarkOptions.rotation}deg)`,
            filter: 'drop-shadow(0 0 1px white)'
          }}
          className="select-none block"
        />
      );
    }

    return (
      <div className="relative">
        <span style={{
          fontSize: `${Math.max(4, watermarkOptions.fontSize * 0.2)}px`,
          fontFamily: watermarkOptions.font,
          fontWeight: watermarkOptions.bold ? 'bold' : 'normal',
          fontStyle: watermarkOptions.italic ? 'italic' : 'normal',
          color: watermarkOptions.color,
          opacity: 1 - (watermarkOptions.transparency || 0),
          transform: `rotate(${watermarkOptions.rotation}deg)`,
          whiteSpace: 'nowrap',
          userSelect: 'none',
          textShadow: '0 0 2px white',
        }}>{watermarkOptions.text}</span>
      </div>
    );
  };

  return (
    <div className="group flex flex-col items-center space-y-2 flex-shrink-0">
      <PdfPageCard
        pageNumber={pageNumber}
        file={file || undefined} // passed file
        pageIndex={pageNumber - 1} // 0-indexed
        isSelected={isSelected}
        onClick={onClick}
        rotation={0}
      >
        {/* Blue position indicators - 9 dots for mosaic, 1 dot for single position */}
        {watermarkOptions && (
          isMosaic ? (
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-2 z-50 pointer-events-none">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="flex items-center justify-center">
                  <div className="w-4 h-4 bg-brand-blue-500 rounded-full border-2 border-white" />
                </div>
              ))}
            </div>
          ) : (
            <div
              className={`absolute w-4 h-4 bg-brand-blue-500 rounded-full border-2 border-white z-50 ${positionToClasses[position]}`}
            />
          )
        )}

      </PdfPageCard>
      <span className="text-sm font-medium text-gray-600">
        Page {pageNumber}
      </span>
    </div>
  );
});

// ... (keep helpers)

// In WatermarkPreview:
// Remove renderPage and intersection observer effects.




// From components/WatermarkSettings.tsx
interface WatermarkSettingsProps {
  options: WatermarkOptions;
  setOptions: React.Dispatch<React.SetStateAction<WatermarkOptions>>;
  fileCount: number;
  totalPages: number;
  onApply: (options: WatermarkOptions) => void;
}

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">{children}</label>
);

const PositionGrid: React.FC<{ value: WatermarkPosition, onChange: (pos: WatermarkPosition) => void, disabled?: boolean }> = React.memo(({ value, onChange, disabled = false }) => {
  const positions: WatermarkPosition[] = [
    'top-left', 'top-center', 'top-right',
    'middle-left', 'middle-center', 'middle-right',
    'bottom-left', 'bottom-center', 'bottom-right'
  ];
  return (
    <div className="grid grid-cols-3 gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
      {positions.map(pos => (
        <button
          key={pos}
          onClick={() => { if (!disabled) onChange(pos); }}
          disabled={disabled}
          className={`h-8 w-8 rounded flex items-center justify-center transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 ${disabled ? 'opacity-30 cursor-not-allowed' : ''} ${value === pos ? 'bg-brand-blue-600 shadow-md transform scale-105' : 'bg-white border border-gray-200 hover:border-gray-300'}`}
          aria-pressed={value === pos}
          aria-label={pos}
        >
          <div className={`w-2 h-2 rounded-full ${value === pos ? 'bg-white' : 'bg-gray-300'}`}></div>
        </button>
      ))}
    </div>
  );
});


const TypeButton: React.FC<{ type: WatermarkType, value: WatermarkType, label: string, icon: React.ReactNode, onClick: (type: WatermarkType) => void }> = React.memo(({ value, label, icon, type, onClick }) => {
  const isSelected = type === value;
  return (
    <button
      onClick={() => onClick(value)}
      className={`flex-1 py-3 px-2 rounded-lg border transition-all duration-200 flex flex-col items-center justify-center gap-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue-500 relative ${isSelected ? 'bg-brand-blue-50 border-brand-blue-500 text-brand-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 ring-1 ring-transparent'
        }`}
    >
      {isSelected && (
        <div className="absolute top-1.5 right-1.5 text-brand-blue-600">
          <Check className="w-3.5 h-3.5" />
        </div>
      )}
      <div className={isSelected ? 'text-brand-blue-600' : 'text-gray-400'}>{icon}</div>
      <span>{label}</span>
    </button>
  )
});

const LayerButton: React.FC<{ layer: 'over' | 'below', value: 'over' | 'below', label: string, icon: React.ReactNode, onClick: (layer: 'over' | 'below') => void }> = React.memo(({ value, label, icon, layer, onClick }) => {
  const isSelected = layer === value;
  return (
    <button
      onClick={() => onClick(value)}
      className={`flex-1 py-3 px-2 rounded-lg border transition-all duration-200 flex flex-col items-center justify-center gap-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue-500 ${isSelected ? 'bg-brand-blue-50 border-brand-blue-500 text-brand-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
        }`}
    >
      <div className={isSelected ? 'text-brand-blue-600' : 'text-gray-400'}>{icon}</div>
      <span className="text-center text-xs">{label}</span>
      <span className="text-[10px] text-gray-400 font-normal">{value === 'over' ? 'On top of content' : 'Behind content'}</span>
    </button>
  )
});


const WatermarkControls: React.FC<{
  options: WatermarkOptions;
  onChange: <K extends keyof WatermarkOptions>(key: K, value: WatermarkOptions[K]) => void;
  showPagesOption?: boolean;
  fileCount?: number;
  totalPages?: number;
  disabled?: boolean;
}> = ({ options, onChange, showPagesOption = true, fileCount = 1, totalPages = 1, disabled = false }) => {
  const [isFontPopoverOpen, setFontPopoverOpen] = useState(false);
  const [isSizePopoverOpen, setSizePopoverOpen] = useState(false);
  const [isColorPopoverOpen, setColorPopoverOpen] = useState(false);
  const [isAlignPopoverOpen, setAlignPopoverOpen] = useState(false);

  const fontRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef<HTMLDivElement>(null);
  const alignRef = useRef<HTMLDivElement>(null);

  // Auto-set reasonable default width for image watermarks
  useEffect(() => {
    if (options.type === 'image' && options.fontSize < 50) {
      onChange('fontSize', 200);
    }
  }, [options.type]);

  useClickOutside(fontRef, () => setFontPopoverOpen(false));
  useClickOutside(sizeRef, () => setSizePopoverOpen(false));
  useClickOutside(colorRef, () => setColorPopoverOpen(false));
  useClickOutside(alignRef, () => setAlignPopoverOpen(false));

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;

        // Normalize the image by converting to PNG with white background
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d', { alpha: false });

          if (ctx) {
            // Fill white background first to prevent transparency issues
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Draw image on top
            ctx.drawImage(img, 0, 0);

            // Convert to PNG data URL
            const normalizedDataUrl = canvas.toDataURL('image/png');
            onChange('image', normalizedDataUrl);
          } else {
            // Fallback to original if canvas context fails
            onChange('image', dataUrl);
          }
        };
        img.onerror = () => {
          // Fallback to original if image load fails
          onChange('image', dataUrl);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const alignIcons = {
    left: <AlignLeft className="w-4 h-4" />,
    center: <AlignCenter className="w-4 h-4" />,
    right: <AlignRight className="w-4 h-4" />,
  };

  const baseInputStyles = "w-full px-3 py-2 text-center bg-white border border-gray-300 rounded-md focus:ring-brand-blue-500 focus:border-brand-blue-500 text-sm";

  return (
    <div className={`flex flex-col space-y-6 ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* Type Selection */}
      <div className="flex items-center gap-3">
        <TypeButton type={options.type} value="text" label="Text" icon={<Type className="w-6 h-6" />} onClick={type => onChange('type', type)} />
        <TypeButton type={options.type} value="image" label="Image" icon={<ImageIcon className="w-6 h-6" />} onClick={type => onChange('type', type)} />
      </div>


      {/* Watermark Presets - Compact Dropdown */}
      <div className="space-y-2">
        <details className="group">
          <summary className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-lg cursor-pointer transition-all border border-blue-200">
            <span className="text-sm font-semibold text-brand-blue-700 flex items-center gap-2">
              ✨ Quick Presets
              <span className="text-xs bg-white text-brand-blue-600 px-2 py-0.5 rounded-full">7 templates</span>
            </span>
            <svg className="w-4 h-4 text-brand-blue-600 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
            {WATERMARK_PRESETS.map((preset) => {
              const isActive = options.text === preset.config.text &&
                options.position === preset.config.position &&
                options.rotation === preset.config.rotation;

              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    if (isActive) {
                      // If clicking on an already active preset, reset to default values
                      onChange('text', '© Your Company');
                      onChange('font', 'Arial');
                      onChange('fontSize', 24);
                      onChange('bold', false);
                      onChange('italic', false);
                      onChange('underline', false);
                      onChange('color', '#000000');
                      onChange('textAlign', 'center');
                      onChange('position', 'middle-center');
                      onChange('offsetX', 0);
                      onChange('offsetY', 0);
                      onChange('transparency', 0.5);
                      onChange('rotation', 0);
                      onChange('mosaic', false);
                      onChange('layer', 'over');
                    } else {
                      // Apply the preset configuration
                      Object.entries(preset.config).forEach(([key, value]) => {
                        onChange(key as keyof WatermarkOptions, value);
                      });
                    }
                  }}
                  className={`
                    w-full flex items-center gap-3 p-2.5 rounded-lg transition-all text-left
                    ${isActive
                      ? 'bg-brand-blue-600 text-white shadow-md'
                      : 'bg-white hover:bg-brand-blue-50 border border-gray-200 hover:border-brand-blue-300'
                    }
                  `}
                  title={isActive ? 'Click to deselect' : preset.description}
                >
                  <span className="text-xl flex-shrink-0">{preset.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-gray-800'}`}>
                      {preset.name}
                    </div>
                    <div className={`text-xs ${isActive ? 'text-blue-100' : 'text-gray-500'} truncate`}>
                      {preset.description}
                    </div>
                  </div>
                  {isActive && (
                    <svg className="w-4 h-4 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </details>
      </div>

      {/* Text Options */}
      {options.type === 'text' && (
        <div className="space-y-4 animate-fade-in-up">
          <div>
            <Label>Content</Label>
            <textarea
              value={options.text}
              onChange={(e) => onChange('text', e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue-500 focus:border-brand-blue-500 text-sm min-h-[80px] resize-y"
              placeholder="Enter watermark text..."
            />
          </div>
          <div>
            <Label>Formatting</Label>
            <div className="flex items-center p-1 bg-gray-50 rounded-lg border border-gray-200">
              {/* Font Family */}
              <div ref={fontRef} className="relative flex-1">
                <button onClick={() => setFontPopoverOpen(!isFontPopoverOpen)} className="w-full flex items-center justify-between text-sm px-3 py-1.5 hover:bg-white rounded transition-colors text-gray-700">
                  <span className="truncate max-w-[80px]">{options.font}</span>
                  <ChevronDown className="w-3 h-3 text-gray-400 ml-1" />
                </button>
                {isFontPopoverOpen && (
                  <div className="absolute z-50 top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-100 animate-fade-in-up overflow-hidden">
                    <div className="max-h-60 overflow-y-auto p-1">
                      {FONT_OPTIONS.map(font => (
                        <button key={font} onClick={() => { onChange('font', font); setFontPopoverOpen(false); }} className={`w-full text-left text-sm px-3 py-2 rounded-md transition-colors ${options.font === font ? 'bg-brand-blue-50 text-brand-blue-600' : 'hover:bg-gray-50 text-gray-700'}`} style={{ fontFamily: font }}>
                          {font}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="w-px h-5 bg-gray-300 mx-1"></div>

              {/* Font Size Slider */}
              <div className="flex items-center gap-2 px-2">
                <input
                  type="range"
                  min="8"
                  max="144"
                  value={options.fontSize}
                  onChange={(e) => onChange('fontSize', parseInt(e.target.value))}
                  className="w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-blue-600"
                  style={{
                    background: `linear-gradient(to right, #2563eb 0%, #2563eb ${((options.fontSize - 8) / (144 - 8)) * 100}%, #e5e7eb ${((options.fontSize - 8) / (144 - 8)) * 100}%, #e5e7eb 100%)`
                  }}
                />
                <span className="text-sm text-gray-700 min-w-[35px]">{options.fontSize}<span className="text-xs text-gray-400">px</span></span>
              </div>

              <div className="w-px h-5 bg-gray-300 mx-1"></div>

              {/* Alignment */}
              <div ref={alignRef} className="relative">
                <button onClick={() => setAlignPopoverOpen(!isAlignPopoverOpen)} className="p-1.5 hover:bg-white rounded text-gray-600">
                  {alignIcons[options.textAlign]}
                </button>
                {isAlignPopoverOpen && (
                  <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded-lg shadow-xl border border-gray-100 p-1 flex gap-1 animate-fade-in-up">
                    {(['left', 'center', 'right'] as const).map(align => (
                      <button key={align} onClick={() => { onChange('textAlign', align); setAlignPopoverOpen(false); }} className={`p-1.5 rounded-md ${options.textAlign === align ? 'bg-brand-blue-50 text-brand-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>
                        {alignIcons[align]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-px h-5 bg-gray-300 mx-1"></div>

              {/* Color */}
              <div ref={colorRef} className="relative">
                <button onClick={() => setColorPopoverOpen(!isColorPopoverOpen)} className="p-1.5 hover:bg-white rounded flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full border border-gray-300 shadow-sm" style={{ backgroundColor: options.color }}></div>
                </button>
                {isColorPopoverOpen && (
                  <div className="absolute z-50 top-full right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-100 animate-fade-in-up">
                    <ColorPicker color={options.color} onChange={color => onChange('color', color)} />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <button onClick={() => onChange('bold', !options.bold)} className={`flex-1 flex items-center justify-center py-1.5 rounded-md border text-sm transition-colors ${options.bold ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}><Bold className="w-4 h-4 mr-1.5" /> Bold</button>
              <button onClick={() => onChange('italic', !options.italic)} className={`flex-1 flex items-center justify-center py-1.5 rounded-md border text-sm transition-colors ${options.italic ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}><Italic className="w-4 h-4 mr-1.5" /> Italic</button>
              <button onClick={() => onChange('underline', !options.underline)} className={`flex-1 flex items-center justify-center py-1.5 rounded-md border text-sm transition-colors ${options.underline ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}><Underline className="w-4 h-4 mr-1.5" /> Line</button>
            </div>
          </div>
        </div>
      )}

      {/* Image Options */}
      {options.type === 'image' && (
        <div className="space-y-4 animate-fade-in-up">
          <input type="file" id="image-upload" className="hidden" onChange={handleImageUpload} accept="image/png, image/jpeg" />
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-brand-blue-50 hover:border-brand-blue-400 transition-colors">
            {options.image ? (
              <div className="relative group">
                <img src={options.image as string} alt="Watermark" className="max-h-40 mx-auto rounded shadow-sm object-contain" />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded">
                  <label htmlFor="image-upload" className="text-white text-sm font-medium cursor-pointer hover:underline">Change Image</label>
                </div>
              </div>
            ) : (
              <label htmlFor="image-upload" className="cursor-pointer block">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mx-auto mb-3 border border-gray-200">
                  <ImageIcon className="w-6 h-6 text-brand-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-900 block">Click to upload image</span>
                <span className="text-xs text-gray-500 mt-1 block">PNG or JPG supported</span>
              </label>
            )}
          </div>
          {options.image && (
            <div>
              <Label>Image Size (Width)</Label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="10"
                  value={options.fontSize < 50 ? 200 : options.fontSize}
                  onChange={(e) => onChange('fontSize', parseInt(e.target.value))}
                  className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-blue-600"
                />
                <span className="text-xs text-gray-500 w-12 text-right">{options.fontSize}px</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="w-full h-px bg-gray-100 my-2"></div>

      {/* Position */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <Label>Position</Label>
          <PositionGrid
            value={options.position}
            onChange={pos => {
              onChange('position', pos);
              // Reset manual offsets when switching preset positions
              onChange('offsetX', 0);
              onChange('offsetY', 0);
              onChange('offsetXNorm', 0);
              onChange('offsetYNorm', 0);
            }}
            disabled={options.mosaic}
          />
          <div className="mt-3 flex items-center">
            <input id="mosaic" type="checkbox" checked={options.mosaic} onChange={e => onChange('mosaic', e.target.checked)} className="h-4 w-4 text-brand-blue-600 border-gray-300 rounded focus:ring-brand-blue-500" />
            <label htmlFor="mosaic" className="ml-2 block text-sm font-medium text-gray-700 flex items-center gap-1">
              <Grid3x3 className="w-3.5 h-3.5 text-gray-400" />
              Mosaic Tile
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Opacity</Label>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-gray-600 w-full text-right">{Math.round((1 - options.transparency) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0" max="1" step="0.05"
              value={1 - options.transparency}
              onChange={e => onChange('transparency', 1 - parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-blue-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Rotation</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">{options.rotation}°</span>
              </div>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={options.rotation}
              onChange={e => onChange('rotation', parseInt(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-blue-600"
            />
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>-180°</span>
              <button
                onClick={() => onChange('rotation', 0)}
                className="text-brand-blue-600 hover:text-brand-blue-700 font-medium"
              >
                Reset
              </button>
              <span>180°</span>
            </div>
          </div>
        </div>
      </div>

      {showPagesOption && <div className="w-full h-px bg-gray-100 my-2"></div>}

      {/* Pages Range */}
      {showPagesOption && (
        <div>
          <Label>Pages</Label>
          {fileCount > 1 ? (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-md text-xs text-blue-800 flex items-start gap-2">
              <MousePointer2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>Watermark will be applied to <strong>all pages</strong> across {fileCount} files.</p>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 pl-1">Page</span>
              <input type="number" value={options.startPage} onChange={e => onChange('startPage', parseInt(e.target.value))} min={1} max={totalPages} className={baseInputStyles} />
              <span className="text-sm text-gray-500">to</span>
              <input type="number" value={options.endPage} onChange={e => onChange('endPage', parseInt(e.target.value))} min={options.startPage} max={totalPages} className={baseInputStyles} />
            </div>
          )}
        </div>
      )}

      <div>
        <Label>Layering</Label>
        <div className="flex items-center gap-3">
          <LayerButton layer={options.layer} value="over" label="Over content" icon={<Layers className="w-5 h-5" />} onClick={layer => onChange('layer', layer)} />
          <LayerButton layer={options.layer} value="below" label="Behind content" icon={<Layers className="w-5 h-5 opacity-50" />} onClick={layer => onChange('layer', layer)} />
        </div>
      </div>
    </div>
  );
};

const WatermarkModalPanel: React.FC<{
  options: WatermarkOptions;
  setOptions: React.Dispatch<React.SetStateAction<WatermarkOptions>>;
  onApplyAll: () => void;
  onCancel: () => void;
  totalPages: number;
}> = ({ options, setOptions, onApplyAll, onCancel }) => {
  const handleChange = useCallback(<K extends keyof WatermarkOptions>(key: K, value: WatermarkOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  }, [setOptions]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-800">Watermark Editor</h3>
        <p className="text-xs text-gray-500 mt-1">Adjust position and style. Click apply to save global settings.</p>
      </div>
      <div className="flex-grow p-4 overflow-y-auto custom-scrollbar">
        <WatermarkControls options={options} onChange={handleChange} showPagesOption={false} />
      </div>
      <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 px-3 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors text-sm">
          Cancel
        </button>
        <button onClick={onApplyAll} className="flex-1 py-2.5 px-3 rounded-lg bg-brand-blue-600 text-white font-medium hover:bg-brand-blue-700 transition-colors text-sm shadow-sm">
          Apply Changes
        </button>
      </div>
    </div>
  );
};


const WatermarkSettings: React.FC<WatermarkSettingsProps> = ({ options, setOptions, fileCount, totalPages, onApply }) => {
  const handleChange = useCallback(<K extends keyof WatermarkOptions>(key: K, value: WatermarkOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  }, [setOptions]);

  // Extract settings content for mobile
  const settingsContent = (
    <div className="p-5">
      <WatermarkControls
        options={options}
        onChange={handleChange}
        fileCount={fileCount}
        totalPages={totalPages}
      />
    </div>
  );

  return (
    <>
      {/* Mobile Layout */}
      <MobileLayout
        settingsTitle="Watermark Options"
        settingsContent={settingsContent}
        actionButton={{
          label: 'Add Watermark',
          onClick: () => onApply(options),
          disabled: false,
        }}
      >
        <></>
      </MobileLayout>

      {/* Desktop Sidebar - hidden on mobile */}
      <aside className="hidden md:flex w-96 flex-shrink-0 bg-white border-l border-gray-200 flex-col h-full shadow-lg z-20">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-brand-blue-600" />
            Watermark Options
          </h2>
        </div>

        <div className="flex-grow p-5 overflow-y-auto overflow-x-visible custom-scrollbar">
          <WatermarkControls
            options={options}
            onChange={handleChange}
            fileCount={fileCount}
            totalPages={totalPages}
          />
        </div>

        <div className="p-5 border-t border-gray-200 bg-gray-50 mt-auto">
          <button
            onClick={() => onApply(options)}
            className="w-full bg-brand-blue-600 text-white font-bold py-4 px-4 rounded-xl hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center text-lg"
          >
            Add Watermark
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>

          {/* Bookmark and Share CTAs */}
          <ToolCTAs variant="sidebar" />
        </div>
      </aside>
    </>
  );
};

// From components/PageDetailView.tsx
interface InteractivePageDetailViewProps {
  pageNumber: number;
  totalPages: number;
  onClose: () => void;
  initialOptions: WatermarkOptions;
  onApplyChanges: (options: WatermarkOptions, scope: 'single' | 'all') => void;
  onNavigate: (page: number) => void;
  pdfDoc: any;
}

const positionToFlex: { [key in WatermarkPosition]: string } = {
  'top-left': 'justify-start items-start',
  'top-center': 'justify-center items-start',
  'top-right': 'justify-end items-start',
  'middle-left': 'justify-start items-center',
  'middle-center': 'justify-center items-center',
  'middle-right': 'justify-end items-center',
  'bottom-left': 'justify-start items-end',
  'bottom-center': 'justify-center items-end',
  'bottom-right': 'justify-end items-end',
};

const hexToRgba = (hex: string, alpha: number) => {
  let c: any;
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    c = hex.substring(1).split('');
    if (c.length == 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = '0x' + c.join('');
    return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
  }
  if (hex.startsWith('rgb')) {
    const alphaString = `,${alpha})`;
    if (hex.startsWith('rgba')) {
      return hex.replace(/,[\d.]+\)$/, alphaString);
    }
    return hex.replace(')', alphaString).replace('rgb', 'rgba');
  }
  return hex;
}


const InteractivePageDetailViewShared: React.FC<InteractivePageDetailViewProps> = ({ pageNumber, totalPages, onClose, initialOptions, onApplyChanges, onNavigate, pdfDoc }) => {
  const [options, setOptions] = useState<WatermarkOptions>(initialOptions);
  const [cssSize, setCssSize] = useState<{ width: number; height: number } | null>(null);
  const { position, handleMouseDown } = useDraggable({
    initialPosition: {
      x: options.offsetX,
      y: options.offsetY,
    },
    onDrag: (pos) => setOptions(prev => ({
      ...prev,
      offsetXNorm: cssSize ? pos.x / cssSize.width : prev.offsetXNorm,
      offsetYNorm: cssSize ? pos.y / cssSize.height : prev.offsetYNorm,
      offsetX: pos.x,
      offsetY: pos.y,
    })),
  });

  const textRef = useRef<HTMLSpanElement>(null);
  const [textRectH, setTextRectH] = useState<number>(0);
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setTextRectH(Math.round(rect.height));
  }, [options.text, options.font, options.fontSize, options.bold, options.italic, options.underline]);



  useEffect(() => {
    if (cssSize && options.offsetXNorm != null && options.offsetYNorm != null) {
      setOptions(prev => ({
        ...prev,
        offsetX: options.offsetXNorm! * cssSize.width,
        offsetY: options.offsetYNorm! * cssSize.height,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cssSize]);

  const resolvePreviewFontFamily = (font: string) => {
    const base = (() => {
      if (font === 'Times New Roman') return 'Times';
      if (font === 'Courier') return 'Courier';
      return 'Helvetica';
    })();
    if (base === 'Helvetica') return 'Helvetica, Arial, sans-serif';
    if (base === 'Times') return 'Times New Roman, Times, serif';
    return 'Courier New, Courier, monospace';
  };

  const watermarkStyle: React.CSSProperties = {
    fontFamily: resolvePreviewFontFamily(options.font),
    fontSize: `${Math.round(options.fontSize * 1.1)}px`,
    fontWeight: options.bold ? 'bold' : 'normal',
    fontStyle: options.italic ? 'italic' : 'normal',
    textDecoration: options.underline ? 'underline' : 'none',
    color: hexToRgba(options.color, 1 - options.transparency),
    textAlign: options.textAlign,
    lineHeight: 1,
    transform: `translate(${position.x}px, ${position.y}px) rotate(${options.rotation}deg)`,
    whiteSpace: 'nowrap',
    padding: '10px 20px',
    userSelect: 'none',
    zIndex: 1,
    cursor: 'grab',
    // Bounding box to show watermark location without changing appearance
    outline: '2px dashed rgba(59, 130, 246, 0.5)',
    outlineOffset: '4px',
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in"
      onClick={() => {
        const next = { ...options };
        if (cssSize) {
          next.offsetXNorm = position.x / cssSize.width;
          next.offsetYNorm = position.y / cssSize.height;
        }
        onApplyChanges(next, 'single');
        onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <PagePreviewModal
        currentPage={pageNumber}
        totalPages={totalPages}
        pdfDoc={pdfDoc}
        onClose={() => {
          const next = { ...options };
          if (cssSize) {
            next.offsetXNorm = position.x / cssSize.width;
            next.offsetYNorm = position.y / cssSize.height;
          }
          onApplyChanges(next, 'single');
          onClose();
        }}
        onNavigate={(dir) => onNavigate(dir === 'prev' ? Math.max(1, pageNumber - 1) : Math.min(totalPages, pageNumber + 1))}
        onBack={onClose}
        onMetrics={({ cssWidth, cssHeight }) => {
          setCssSize({ width: cssWidth, height: cssHeight });
        }}
        rightPanel={(
          <WatermarkModalPanel
            options={options}
            setOptions={setOptions}
            onApplyAll={() => {
              const next = { ...options };
              if (cssSize) {
                next.offsetXNorm = position.x / cssSize.width;
                next.offsetYNorm = position.y / cssSize.height;
              }
              onApplyChanges(next, 'all');
              onClose();
            }}
            onCancel={onClose}
            totalPages={totalPages}
          />
        )}
        overlay={(
          <div className="w-full h-full relative">
            {options.mosaic ? (
              <div className="w-full h-full grid grid-cols-3 grid-rows-3 place-items-center opacity-70">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-center">
                    {options.type === 'text' ? (
                      <span style={{
                        ...watermarkStyle,
                        position: 'static',
                        transform: `rotate(${options.rotation}deg)`,
                        cursor: 'default',
                        padding: 0,
                        fontSize: `${Math.max(10, options.fontSize * 0.8)}px` // Scale down slightly for grid
                      }}>
                        {options.text}
                      </span>
                    ) : (
                      options.image ? (
                        <img
                          src={typeof options.image === 'string' ? options.image : ''}
                          style={{
                            width: `${Math.max(20, options.fontSize * 0.8)}px`,
                            opacity: 1 - (options.transparency ?? 0),
                            transform: `rotate(${options.rotation}deg)`,
                            userSelect: 'none',
                            cursor: 'default',
                          }}
                        />
                      ) : null
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={`w-full h-full flex ${positionToFlex[options.position]} relative`}>
                {options.type === 'text' ? (
                  <span ref={textRef} style={watermarkStyle} onMouseDown={handleMouseDown}>{options.text}</span>
                ) : (
                  options.image ? (
                    <img
                      src={typeof options.image === 'string' ? options.image : ''}
                      style={{
                        transform: `translate(${position.x}px, ${position.y}px) rotate(${options.rotation}deg)`,
                        opacity: 1 - (options.transparency ?? 0),
                        userSelect: 'none',
                        cursor: 'grab',
                      }}
                      onMouseDown={handleMouseDown}
                    />
                  ) : null
                )}
              </div>
            )}
          </div>
        )}
      />

    </div>
  );
};

// From components/FileDropzone.tsx
interface FileDropzoneProps {
  onFilesSelect: (files: FileList) => void;
}

const FileDropzone: React.FC<FileDropzoneProps> = ({ onFilesSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onFilesSelect(event.target.files);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // FIX: Explicitly type 'f' as 'File' to fix error: Property 'type' does not exist on type 'unknown'.
      const allPdf = Array.from(e.dataTransfer.files).every((f: File) => f.type === 'application/pdf');
      if (allPdf) {
        onFilesSelect(e.dataTransfer.files);
      } else {
        alert('Please drop PDF files only.');
      }
      e.dataTransfer.clearData();
    }
  }, [onFilesSelect]);


  return (
    <div
      className="flex-grow flex items-center justify-center p-8"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div
        className={`text-center transition-transform duration-300 ${isDragging ? 'scale-105' : ''}`}
      >
        <div className={`p-10 rounded-xl ${isDragging ? 'bg-brand-blue-50 ring-4 ring-brand-blue-200' : ''}`}>
          <h1 className="text-5xl font-bold text-gray-800">Add Watermark to PDF</h1>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            Easily stamp an image or text over your PDF files in seconds.
          </p>
          <div className="mt-10">
            <button
              onClick={handleButtonClick}
              className="bg-brand-blue-600 text-white font-bold py-4 px-10 rounded-lg hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl text-xl inline-flex items-center justify-center"
              aria-label="Select PDF file to watermark"
            >
              <Plus className="h-6 w-6 mr-3" />
              Select PDF files
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="application/pdf"
              multiple
            />
          </div>
          <p className="mt-4 text-gray-500">or drop PDFs here</p>
        </div>
      </div>
    </div>
  );
};

// From components/WatermarkPreview.tsx
const FileSelector: React.FC<{
  files: File[],
  activeFile: File,
  onFileChange: (file: File) => void,
  onRemoveFile: (file: File) => void
}> = ({ files, activeFile, onFileChange, onRemoveFile }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useClickOutside(wrapperRef, () => setIsOpen(false));

  const truncate = (name: string, len: number) => {
    return name.length > len ? name.substring(0, len - 3) + '...' : name;
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center bg-white border border-gray-300 rounded-lg pl-3 pr-2 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue-500"
      >
        <span>{truncate(activeFile.name, 30)}</span>
        <ChevronDown className="w-5 h-5 ml-2 text-gray-400" />
      </button>
      {isOpen && (
        <div className="absolute z-10 top-full mt-2 w-72 bg-white rounded-lg shadow-xl border animate-fade-in-up origin-top">
          <div className="p-2 max-h-60 overflow-y-auto">
            {files.map(file => (
              <div key={file.name} className={`flex items-center justify-between p-2 rounded-md ${file.name === activeFile.name ? 'bg-brand-blue-50' : 'hover:bg-gray-100'}`}>
                <button onClick={() => { onFileChange(file); setIsOpen(false); }} className="text-left flex-grow truncate text-sm">
                  {file.name}
                </button>
                <button onClick={(e) => { e.stopPropagation(); onRemoveFile(file); }} className="p-1 text-gray-400 hover:text-brand-blue-600 ml-2 flex-shrink-0" aria-label={`Remove ${file.name}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface WatermarkPreviewProps {
  files: File[];
  onRemoveFile: (file: File) => void;
  onAddMoreFiles: (files: FileList) => void;
  totalPages: number;
  watermarkOptions: WatermarkOptions;
  setWatermarkOptions: React.Dispatch<React.SetStateAction<WatermarkOptions>>;
}

const WatermarkPreview: React.FC<WatermarkPreviewProps> = ({ files, onRemoveFile, onAddMoreFiles, totalPages, watermarkOptions, setWatermarkOptions }) => {
  const [activeFile, setActiveFile] = useState<File | null>(files[0] || null);
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const addFilesInputRef = useRef<HTMLInputElement>(null);
  const [pageNumbers, setPageNumbers] = useState<number[]>([]);
  const [goToPage, setGoToPage] = useState<number | ''>('');

  // Refs for cleanup
  const pdfDocRef = useRef<any>(null);
  const loadingTaskRef = useRef<any>(null);

  // Load PDF document when active file changes
  useEffect(() => {
    let isMounted = true;

    const loadPdf = async () => {
      if (!activeFile) return;

      // Cleanup previous doc if any
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy().catch(() => { });
        pdfDocRef.current = null;
      }

      setIsLoading(true);
      try {
        const arrayBuffer = await activeFile.arrayBuffer();
        if (!isMounted) return;

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        loadingTaskRef.current = loadingTask;

        const pdf = await loadingTask.promise;

        if (!isMounted) {
          pdf.destroy().catch(() => { });
          return;
        }

        pdfDocRef.current = pdf;
        setPdfDoc(pdf);

        // Update page numbers
        const pages = Array.from({ length: pdf.numPages }, (_, i) => i + 1);
        setPageNumbers(pages);

        // Update watermark options with the new page count
        setWatermarkOptions(prev => ({
          ...prev,
          startPage: 1,
          endPage: pdf.numPages
        }));

      } catch (error) {
        console.error('Error loading PDF:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
      if (loadingTaskRef.current) {
        loadingTaskRef.current.destroy().catch(() => { });
      }
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy().catch(() => { });
      }
    };
  }, [activeFile]);

  // Update pdfDocRef when state changes to ensure cleanup has access to latest
  useEffect(() => {
    pdfDocRef.current = pdfDoc;
  }, [pdfDoc]);


  // Update active file when files change
  useEffect(() => {
    if (files.length === 0) {
      setActiveFile(null);
      setPdfDoc(null);
      setPageNumbers([]);
    } else if (!activeFile || !files.includes(activeFile)) {
      setActiveFile(files[0]);
    }
  }, [files, activeFile]);

  // Render a single page
  // Optimized: Use LazyThumbnail inside PageThumbnail instead of this centralized approach
  // const renderPage = ... (removed)

  // Intersection Observer for lazy rendering
  // Optimized: Use LazyThumbnail inside PageThumbnail instead of this centralized approach
  // useEffect(() => ... (removed)





  const handleAddClick = () => {
    addFilesInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onAddMoreFiles(event.target.files);
    }
  };

  const handleApplyChanges = (newOptions: WatermarkOptions, scope: 'single' | 'all') => {
    const pageCount = pdfDoc?.numPages || totalPages;
    if (scope === 'single' && selectedPage) {
      setWatermarkOptions({
        ...newOptions,
        startPage: selectedPage,
        endPage: selectedPage,
      });
    } else {
      setWatermarkOptions({
        ...newOptions,
        startPage: 1,
        endPage: pageCount,
      });
    }
  };

  // State for active page in center preview
  const [activePage, setActivePage] = useState<number>(1);

  // Canvas refs for large page preview (2-layer system)
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);       // Layer 1: PDF (Base)
  const watermarkCanvasRef = useRef<HTMLCanvasElement>(null); // Layer 2: Watermark (On top)
  const renderTaskRef = useRef<any>(null);

  // Cache for watermark image
  const watermarkImageCache = useRef<HTMLImageElement | null>(null);

  // Load watermark image when it changes
  useEffect(() => {
    if (watermarkOptions.type === 'image' && watermarkOptions.image && typeof watermarkOptions.image === 'string') {
      const img = new Image();
      img.src = watermarkOptions.image;
      img.onload = () => {
        watermarkImageCache.current = img;
        renderWatermark(); // Re-render when image loads
      };
    } else {
      watermarkImageCache.current = null;
    }
  }, [watermarkOptions.image, watermarkOptions.type]);

  // Render PDF Page (Static Layer)
  const renderPdfPage = useCallback(async () => {
    if (!pdfDoc || !pdfCanvasRef.current || !watermarkCanvasRef.current || !previewContainerRef.current) return;

    // Cancel previous render task if it exists
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch (e) {
        // Ignore cancellation errors
      }
    }

    try {
      const page = await pdfDoc.getPage(activePage);
      const pdfCanvas = pdfCanvasRef.current;
      const watermarkCanvas = watermarkCanvasRef.current;
      const container = previewContainerRef.current;

      // Calculate scale to fit container
      const containerWidth = container.clientWidth - 40;
      const containerHeight = container.clientHeight - 40;

      const viewport = page.getViewport({ scale: 1 });
      const scaleX = containerWidth / viewport.width;
      const scaleY = containerHeight / viewport.height;
      const scale = Math.min(scaleX, scaleY, 2.0);

      const scaledViewport = page.getViewport({ scale });

      // Set dimensions for all canvases
      [pdfCanvas, watermarkCanvas].forEach(canvas => {
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
      });

      const ctx = pdfCanvas.getContext('2d', { alpha: false });
      if (ctx) {
        // Fill white background for PDF layer (crucial for multiply blend)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pdfCanvas.width, pdfCanvas.height);

        // Render PDF content
        const renderTask = page.render({ canvasContext: ctx, viewport: scaledViewport });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        renderTaskRef.current = null;
      }

      // Trigger watermark render to ensure it matches new size
      renderWatermark();
    } catch (e: any) {
      if (e?.name === 'RenderingCancelledException') return;
      console.error(`Error rendering page ${activePage}:`, e);
    }
  }, [pdfDoc, activePage]);

  // Render Watermark (Interactive Layer - Sync & Fast)
  const renderWatermark = useCallback(() => {
    if (!watermarkCanvasRef.current) return;
    const ctx = watermarkCanvasRef.current.getContext('2d', { alpha: true });
    if (!ctx) return;

    const canvas = watermarkCanvasRef.current;

    // Clear canvas with transparency
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Ensure we're using normal composite operation (not multiply)
    ctx.globalCompositeOperation = 'source-over';

    // Check if watermark should be applied to this page
    if (activePage < watermarkOptions.startPage || activePage > watermarkOptions.endPage) {
      return; // Don't render watermark on this page
    }

    const opacity = 1 - (watermarkOptions.transparency || 0);

    if (watermarkOptions.type === 'text') {
      // Render text watermark
      const text = watermarkOptions.text || 'itsmypdf';
      const fontSize = Math.max(8, watermarkOptions.fontSize * 1.1);

      // Set font properties
      let fontStyle = '';
      if (watermarkOptions.italic) fontStyle += 'italic ';
      if (watermarkOptions.bold) fontStyle += 'bold ';
      ctx.font = `${fontStyle}${fontSize}px ${watermarkOptions.font}`;

      // Use left alignment and alphabetic baseline to match PDF-lib
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';

      // Measure text width
      const textWidth = ctx.measureText(text).width;

      // Parse color
      ctx.fillStyle = watermarkOptions.color;
      ctx.globalAlpha = opacity;

      if (watermarkOptions.mosaic) {
        // Mosaic mode - 3x3 grid
        const cols = 3;
        const rows = 3;
        const marginPts = 15;

        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            // Smart 9-point grid: Inset content so it touches margins but doesn't cut off
            let cx;
            if (col === 0) cx = marginPts + (textWidth / 2);
            else if (col === 1) cx = canvas.width / 2;
            else cx = canvas.width - marginPts - (textWidth / 2);

            let cy;
            // Canvas Y: 0 is Top
            if (row === 0) cy = marginPts + (fontSize / 2);
            else if (row === 1) cy = canvas.height / 2;
            else cy = canvas.height - marginPts - (fontSize / 2);

            ctx.save();
            // Translate to center point
            ctx.translate(cx, cy);
            // Negate rotation to match PDF's bottom-up coordinate system
            ctx.rotate((-watermarkOptions.rotation * Math.PI) / 180);
            // Draw text centered at origin
            ctx.fillText(text, -textWidth / 2, fontSize / 2);

            // Draw underline if enabled
            if (watermarkOptions.underline) {
              const underlineY = fontSize / 2 + 2;
              ctx.strokeStyle = watermarkOptions.color;
              ctx.lineWidth = Math.max(1, fontSize * 0.05);
              ctx.beginPath();
              ctx.moveTo(-textWidth / 2, underlineY);
              ctx.lineTo(textWidth / 2, underlineY);
              ctx.stroke();
            }

            ctx.restore();
          }
        }
      } else {
        // Single watermark - match PDF export positioning exactly
        const marginLeft = 15;
        const marginTop = 15;
        const marginRight = 15;
        const marginBottom = 15;

        let x = marginLeft;
        let yBaseline = marginBottom;

        // Horizontal positioning - match PDF export
        if (watermarkOptions.position.endsWith('center')) {
          x = (canvas.width / 2) - (textWidth / 2);
        } else if (watermarkOptions.position.endsWith('right')) {
          x = canvas.width - marginRight - textWidth;
        } else if (watermarkOptions.position.endsWith('left')) {
          x = marginLeft;
        }

        // Vertical positioning - match PDF export (PDF coordinates are bottom-up, canvas is top-down)
        if (watermarkOptions.position.startsWith('top')) {
          yBaseline = marginTop + fontSize;
        } else if (watermarkOptions.position.startsWith('middle')) {
          yBaseline = (canvas.height / 2) + (fontSize / 2);
        } else if (watermarkOptions.position.startsWith('bottom')) {
          yBaseline = canvas.height - marginBottom;
        }

        // Apply user offsets
        const offsetX = watermarkOptions.offsetXNorm != null ? watermarkOptions.offsetXNorm * canvas.width : (watermarkOptions.offsetX || 0);
        const offsetY = watermarkOptions.offsetYNorm != null ? watermarkOptions.offsetYNorm * canvas.height : (watermarkOptions.offsetY || 0);
        x += offsetX;
        yBaseline -= offsetY;

        // Calculate center point for rotation
        const cx = x + (textWidth / 2);
        const cy = yBaseline - (fontSize / 2);

        ctx.save();
        // Translate to center point
        ctx.translate(cx, cy);
        // Negate rotation to match PDF's bottom-up coordinate system
        ctx.rotate((-watermarkOptions.rotation * Math.PI) / 180);
        // Draw text centered at origin
        ctx.fillText(text, -textWidth / 2, fontSize / 2);

        // Draw underline if enabled
        if (watermarkOptions.underline) {
          const underlineY = fontSize / 2 + 2;
          ctx.strokeStyle = watermarkOptions.color;
          ctx.lineWidth = Math.max(1, fontSize * 0.05);
          ctx.beginPath();
          ctx.moveTo(-textWidth / 2, underlineY);
          ctx.lineTo(textWidth / 2, underlineY);
          ctx.stroke();
        }

        ctx.restore();
      }

      ctx.globalAlpha = 1;
    } else if (watermarkOptions.type === 'image' && watermarkImageCache.current) {
      // Render image watermark
      const img = watermarkImageCache.current;
      ctx.globalAlpha = opacity;

      const targetWidth = Math.max(48, watermarkOptions.fontSize * 1.5);
      const scale = targetWidth / img.width;
      const drawWidth = img.width * scale;
      const drawHeight = img.height * scale;

      if (watermarkOptions.mosaic) {
        // Mosaic mode - 3x3 grid
        const cols = 3;
        const rows = 3;
        const marginPts = 15;

        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            // Smart 9-point grid
            let cx;
            if (col === 0) cx = marginPts + (drawWidth / 2);
            else if (col === 1) cx = canvas.width / 2;
            else cx = canvas.width - marginPts - (drawWidth / 2);

            let cy;
            // Canvas Y: 0 is Top
            if (row === 0) cy = marginPts + (drawHeight / 2);
            else if (row === 1) cy = canvas.height / 2;
            else cy = canvas.height - marginPts - (drawHeight / 2);

            ctx.save();
            // Translate to center point
            ctx.translate(cx, cy);
            // Negate rotation to match PDF's bottom-up coordinate system
            ctx.rotate((-watermarkOptions.rotation * Math.PI) / 180);
            // Draw image centered at origin
            ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
            ctx.restore();
          }
        }
      } else {
        // Single image
        let x = 0;
        let y = 0;

        const marginLeft = 15;
        const marginTop = 15;
        const marginRight = 15;
        const marginBottom = 15;

        // Horizontal positioning
        if (watermarkOptions.position.endsWith('center')) {
          x = (canvas.width / 2) - (drawWidth / 2);
        } else if (watermarkOptions.position.endsWith('right')) {
          x = canvas.width - marginRight - drawWidth;
        } else if (watermarkOptions.position.endsWith('left')) {
          x = marginLeft;
        }

        // Vertical positioning
        if (watermarkOptions.position.startsWith('top')) {
          y = marginTop;
        } else if (watermarkOptions.position.startsWith('middle')) {
          y = (canvas.height / 2) - (drawHeight / 2);
        } else if (watermarkOptions.position.startsWith('bottom')) {
          y = canvas.height - marginBottom - drawHeight;
        }

        // Apply user offsets
        const offsetX = watermarkOptions.offsetXNorm != null ? watermarkOptions.offsetXNorm * canvas.width : (watermarkOptions.offsetX || 0);
        const offsetY = watermarkOptions.offsetYNorm != null ? watermarkOptions.offsetYNorm * canvas.height : (watermarkOptions.offsetY || 0);
        x += offsetX;
        y -= offsetY;

        // Calculate center point for rotation
        const cx = x + (drawWidth / 2);
        const cy = y + (drawHeight / 2);

        ctx.save();
        // Translate to center point
        ctx.translate(cx, cy);
        // Negate rotation to match PDF's bottom-up coordinate system
        ctx.rotate((-watermarkOptions.rotation * Math.PI) / 180);
        // Draw image centered at origin
        ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        ctx.restore();
      }

      ctx.globalAlpha = 1;
    }
  }, [watermarkOptions, activePage]);

  // Effect for PDF Rendering (Only when doc/page changes)
  useEffect(() => {
    renderPdfPage();
  }, [renderPdfPage]);

  // Effect for Watermark Rendering (When watermark options change)
  useEffect(() => {
    renderWatermark();
  }, [renderWatermark]);

  return (
    <div className="flex-grow flex min-h-0">
      {/* Modal for detailed editing */}
      {selectedPage !== null && pdfDoc && (
        <InteractivePageDetailViewShared
          pageNumber={selectedPage}
          totalPages={pdfDoc?.numPages || totalPages}
          onClose={() => setSelectedPage(null)}
          initialOptions={watermarkOptions}
          onApplyChanges={handleApplyChanges}
          onNavigate={setSelectedPage}
          pdfDoc={pdfDoc}
        />
      )}

      {/* Left Sidebar - Page Thumbnails */}
      <aside className="w-48 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
              Pages
            </h3>
            <button
              onClick={handleAddClick}
              className="w-8 h-8 bg-brand-blue-600 text-white rounded-full flex items-center justify-center hover:bg-brand-blue-700 transition-transform hover:scale-105"
              aria-label="Add more PDF files"
              title="Add more files"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500">{pageNumbers.length} total</p>

          {/* Go to page input */}
          <div className="flex items-center gap-1 mt-2">
            <input
              type="number"
              min={1}
              max={pageNumbers.length || 1}
              value={goToPage === '' ? '' : goToPage}
              onChange={(e) => {
                const v = e.target.value;
                setGoToPage(v === '' ? '' : Math.max(1, Math.min(Number(v), pageNumbers.length || 1)));
              }}
              placeholder="Go to page"
              className="flex-1 px-2 py-1 bg-white border border-gray-300 rounded text-xs focus:ring-brand-blue-500 focus:border-brand-blue-500"
            />
            <button
              onClick={() => {
                if (typeof goToPage === 'number') {
                  setActivePage(goToPage);
                  setGoToPage('');
                }
              }}
              className="px-2 py-1 bg-brand-blue-600 text-white rounded text-xs hover:bg-brand-blue-700"
            >
              Go
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-3 space-y-3 custom-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            pageNumbers.map((pageNum) => (
              <div key={pageNum} onClick={() => setActivePage(pageNum)} className="group cursor-pointer transition-all duration-200">
                <div
                  className={`overflow-hidden transition-all ${pageNum === activePage
                    ? 'ring-2 ring-brand-blue-500 shadow-md'
                    : 'hover:ring-1 hover:ring-gray-300'
                    }`}
                >
                  <PdfPageCard
                    pageNumber={pageNum}
                    file={activeFile || undefined}
                    pageIndex={pageNum - 1}
                    isSelected={false}
                    onClick={() => setActivePage(pageNum)}
                    rotation={0}
                  />
                </div>
                <div
                  className={`text-center text-xs font-medium mt-1.5 transition-colors ${pageNum === activePage ? 'text-brand-blue-600 font-semibold' : 'text-gray-500'
                    }`}
                >
                  {pageNum}
                </div>
              </div>
            ))
          )}
        </div>

        <input
          type="file"
          ref={addFilesInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="application/pdf"
          multiple
        />
      </aside>

      {/* Center - Main Preview Area */}
      <div className="flex-grow flex flex-col bg-gray-100">
        {/* Large Page Preview - Canvas Based */}
        <div
          ref={previewContainerRef}
          className="flex-grow flex flex-col items-center justify-center bg-gray-100 p-8 relative"
        >
          {isLoading ? (
            <div className="flex items-center justify-center w-full h-full">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="relative flex items-center justify-center w-full h-full">
              <div className="relative inline-block shadow-2xl">
                {/* Layer 1: PDF Page (Base) */}
                <canvas
                  ref={pdfCanvasRef}
                  className="block"
                />

                {/* Layer 2: Watermark (On top, normal blend) */}
                <canvas
                  ref={watermarkCanvasRef}
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// From components/WatermarkToolLayout.tsx
interface WatermarkToolLayoutProps {
  files: File[];
  onRemoveFile: (file: File) => void;
  onAddMoreFiles: (files: FileList) => void;
}

const WatermarkToolLayout: React.FC<WatermarkToolLayoutProps> = ({ files, onRemoveFile, onAddMoreFiles }) => {
  const [watermarkOptions, setWatermarkOptions] = useState<WatermarkOptions>({
    type: 'text',
    text: 'itsmypdf',
    font: 'Arial',
    fontSize: 12,
    bold: false,
    italic: false,
    underline: false,
    color: '#000000',
    textAlign: 'center',
    image: null,
    position: 'middle-center',
    offsetX: 0,
    offsetY: 0,
    mosaic: false,
    transparency: 0,
    rotation: 0,
    pages: 'all',
    startPage: 1,
    endPage: 1,
    layer: 'over',
  });

  const [totalPages, setTotalPages] = useState(1);

  // Load the first PDF to get total pages on mount
  useEffect(() => {
    const loadFirstPdf = async () => {
      if (files.length > 0) {
        try {
          const arrayBuffer = await files[0].arrayBuffer();
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;
          setTotalPages(pdf.numPages);
          setWatermarkOptions(prev => ({
            ...prev,
            endPage: pdf.numPages
          }));
          pdf.destroy();
        } catch (error) {
          console.error('Error loading PDF:', error);
        }
      }
    };
    loadFirstPdf();
  }, [files]);

  const applyWatermark = useCallback(async (options: WatermarkOptions) => {
    if (files.length === 0) {
      return;
    }

    // Helper to calculate start coordinates for PDF-lib to ensure rotation happens around center
    const getCenteredRotationPosition = (
      cx: number,
      cy: number,
      width: number,
      height: number,
      angleDegrees: number
    ) => {
      const rad = (angleDegrees * Math.PI) / 180;
      // Vector from Start -> Center (unrotated)
      // We want: Start + Rotated(Vector) = Center
      // So: Start = Center - Rotated(Vector)

      const vecX = width / 2;
      const vecY = height / 2;

      const rotatedVecX = vecX * Math.cos(rad) - vecY * Math.sin(rad);
      const rotatedVecY = vecX * Math.sin(rad) + vecY * Math.cos(rad);

      return {
        x: cx - rotatedVecX,
        y: cy - rotatedVecY
      };
    };

    // Helper to convert any image to PNG format
    const convertImageToPng = (dataUrl: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          // Fill white background first to prevent transparency issues
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          // Draw image on top
          ctx.drawImage(img, 0, 0);
          try {
            const pngDataUrl = canvas.toDataURL('image/png');
            resolve(pngDataUrl);
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };
        img.src = dataUrl;
      });
    };


    const processFile = async (file: File) => {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDocInstance = await PDFDocument.load(arrayBuffer);
      const pages = pdfDocInstance.getPages();

      // If endPage is still at default (1) or invalid, apply to all pages
      // This handles the case when user clicks "Add Watermark" without opening preview
      const shouldApplyToAllPages = options.endPage === 1 || options.endPage < options.startPage;
      const start = Math.max(1, options.startPage || 1);
      const end = shouldApplyToAllPages ? pages.length : Math.min(pages.length, options.endPage || pages.length);

      const resolveColor = () => {
        if (typeof options.color === 'string') {
          if (options.color.startsWith('#')) {
            const hex = options.color.replace('#', '');
            const fullHex = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
            const bigint = parseInt(fullHex, 16);
            const r = ((bigint >> 16) & 255) / 255;
            const g = ((bigint >> 8) & 255) / 255;
            const b = (bigint & 255) / 255;
            return rgb(r, g, b);
          }
          const m = options.color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
          if (m) {
            const r = parseInt(m[1], 10) / 255;
            const g = parseInt(m[2], 10) / 255;
            const b = parseInt(m[3], 10) / 255;
            return rgb(r, g, b);
          }
        }
        return rgb(0, 0, 0);
      };

      const opacity = 1 - (options.transparency ?? 0);
      const color = resolveColor();

      let fontName = StandardFonts.Helvetica;
      const base = (() => {
        if (options.font === 'Times New Roman') return 'TimesRoman';
        if (options.font === 'Courier') return 'Courier';
        return 'Helvetica';
      })();
      if (base === 'Helvetica') {
        fontName = options.bold && options.italic
          ? StandardFonts.HelveticaBoldOblique
          : options.bold
            ? StandardFonts.HelveticaBold
            : options.italic
              ? StandardFonts.HelveticaOblique
              : StandardFonts.Helvetica;
      } else if (base === 'TimesRoman') {
        fontName = options.bold && options.italic
          ? StandardFonts.TimesRomanBoldItalic
          : options.bold
            ? StandardFonts.TimesRomanBold
            : options.italic
              ? StandardFonts.TimesRomanItalic
              : StandardFonts.TimesRoman;
      } else if (base === 'Courier') {
        fontName = options.bold && options.italic
          ? StandardFonts.CourierBoldOblique
          : options.bold
            ? StandardFonts.CourierBold
            : options.italic
              ? StandardFonts.CourierOblique
              : StandardFonts.Courier;
      }
      const embeddedFont = await pdfDocInstance.embedStandardFont(fontName);

      for (let i = start; i <= end; i++) {
        const page = pages[i - 1];
        const { width, height } = page.getSize();
        const margin = 8;

        const computeAnchoredRect = (rectWidth: number, rectHeight: number) => {
          let x = margin;
          let y = height - margin - rectHeight;
          switch (options.position) {
            case 'top-left':
              x = margin;
              y = height - margin - rectHeight;
              break;
            case 'top-center':
              x = width / 2 - rectWidth / 2;
              y = height - margin - rectHeight;
              break;
            case 'top-right':
              x = width - margin - rectWidth;
              y = height - margin - rectHeight;
              break;
            case 'middle-left':
              x = margin;
              y = height / 2 - rectHeight / 2;
              break;
            case 'middle-center':
              x = width / 2 - rectWidth / 2;
              y = height / 2 - rectHeight / 2;
              break;
            case 'middle-right':
              x = width - margin - rectWidth;
              y = height / 2 - rectHeight / 2;
              break;
            case 'bottom-left':
              x = margin;
              y = margin;
              break;
            case 'bottom-center':
              x = width / 2 - rectWidth / 2;
              y = margin;
              break;
            case 'bottom-right':
              x = width - margin - rectWidth;
              y = margin;
              break;
            default:
              break;
          }
          const offsetX = options.offsetXNorm != null ? options.offsetXNorm * width : (options.offsetX || 0);
          const offsetY = options.offsetYNorm != null ? options.offsetYNorm * height : (options.offsetY || 0);
          x += offsetX;
          y -= offsetY;
          return { x, y };
        };

        if (options.type === 'text') {
          const text = options.text || 'itsmypdf';
          const size = Math.max(8, options.fontSize * 1.1);
          const textWidth = embeddedFont.widthOfTextAtSize(text, size);

          if (options.mosaic) {
            // Create a perfect 3x3 grid layout matching reference image
            const cols = 3;
            const rows = 3;
            const marginPts = 15; // Balanced margin for standard professional look (approx 20px)

            for (let row = 0; row < rows; row++) {
              for (let col = 0; col < cols; col++) {
                // Smart 9-point grid
                let cx;
                if (col === 0) cx = marginPts + (textWidth / 2);
                else if (col === 1) cx = width / 2;
                else cx = width - marginPts - (textWidth / 2);

                let cy;
                // PDF Y: 0 is Bottom so row 0 is bottom items
                if (row === 0) cy = marginPts + (size / 2);
                else if (row === 1) cy = height / 2;
                else cy = height - marginPts - (size / 2);

                // Get corrected start position for center-based rotation
                const { x, y } = getCenteredRotationPosition(cx, cy, textWidth, size, options.rotation || 0);

                page.drawText(text, {
                  x,
                  y,
                  size,
                  rotate: degrees(options.rotation || 0),
                  color,
                  opacity,
                  font: embeddedFont,
                  blendMode: options.layer === 'below' ? BlendMode.Multiply : BlendMode.Normal,
                });

                if (options.underline) {
                  const underlineOffsetY = -2; // Slightly below baseline
                  const rad = ((options.rotation || 0) * Math.PI) / 180;
                  const startX = -textWidth / 2;
                  const startY = -size / 2 + underlineOffsetY;
                  const endX = textWidth / 2;
                  const endY = -size / 2 + underlineOffsetY;

                  const rotatedStartX = startX * Math.cos(rad) - startY * Math.sin(rad);
                  const rotatedStartY = startX * Math.sin(rad) + startY * Math.cos(rad);
                  const rotatedEndX = endX * Math.cos(rad) - endY * Math.sin(rad);
                  const rotatedEndY = endX * Math.sin(rad) + endY * Math.cos(rad);

                  page.drawLine({
                    start: { x: cx + rotatedStartX, y: cy + rotatedStartY },
                    end: { x: cx + rotatedEndX, y: cy + rotatedEndY },
                    thickness: Math.max(0.5, size * 0.03),
                    color,
                    opacity,
                  });
                }
              }
            }
          } else {
            // Single watermark with precise positioning
            // Using balanced 15pt margin (approx 20px) to match visual reference
            // This provides a cleaner professional look than the ultra-tight 6pt
            const marginLeft = 15;
            const marginTop = 15;
            const marginRight = 15;
            const marginBottom = 15;
            let x = marginLeft;
            let yBaseline = marginBottom;

            // Horizontal positioning
            if (options.position.endsWith('center')) {
              x = (width / 2) - (textWidth / 2);
            } else if (options.position.endsWith('right')) {
              x = width - marginRight - textWidth;
            } else if (options.position.endsWith('left')) {
              x = marginLeft;
            }

            // Vertical positioning
            if (options.position.startsWith('top')) {
              yBaseline = height - marginTop - size;
            } else if (options.position.startsWith('middle')) {
              yBaseline = (height / 2) - (size / 2);
            } else if (options.position.startsWith('bottom')) {
              yBaseline = marginBottom;
            }

            // Apply user offsets
            const offsetX = options.offsetXNorm != null ? options.offsetXNorm * width : (options.offsetX || 0);
            const offsetY = options.offsetYNorm != null ? options.offsetYNorm * height : (options.offsetY || 0);
            x += offsetX;
            yBaseline -= offsetY;

            // Calculate center point for rotation
            const cx = x + (textWidth / 2);
            const cy = yBaseline + (size / 2);

            // Get corrected start position for center-based rotation
            const rotatedPos = getCenteredRotationPosition(cx, cy, textWidth, size, options.rotation || 0);

            page.drawText(text, {
              x: rotatedPos.x,
              y: rotatedPos.y,
              size,
              rotate: degrees(options.rotation || 0),
              color,
              opacity,
              font: embeddedFont,
              blendMode: options.layer === 'below' ? BlendMode.Multiply : BlendMode.Normal,
            });

            if (options.underline) {
              // Underline needs to be drawn relative to the rotated text position
              const underlineOffsetY = -2; // Slightly below baseline
              const rad = (options.rotation * Math.PI) / 180;

              // Calculate underline start and end points relative to center
              const startX = -textWidth / 2;
              const startY = -size / 2 + underlineOffsetY;
              const endX = textWidth / 2;
              const endY = -size / 2 + underlineOffsetY;

              // Rotate these points around origin
              const rotatedStartX = startX * Math.cos(rad) - startY * Math.sin(rad);
              const rotatedStartY = startX * Math.sin(rad) + startY * Math.cos(rad);
              const rotatedEndX = endX * Math.cos(rad) - endY * Math.sin(rad);
              const rotatedEndY = endX * Math.sin(rad) + endY * Math.cos(rad);

              // Translate to center position
              page.drawLine({
                start: { x: cx + rotatedStartX, y: cy + rotatedStartY },
                end: { x: cx + rotatedEndX, y: cy + rotatedEndY },
                thickness: Math.max(0.5, size * 0.03),
                color,
                opacity,
              });
            }
          }
        } else if (options.type === 'image' && options.image) {
          const dataUrl = typeof options.image === 'string' ? options.image : '';
          let imageRef;

          try {
            // Try to embed as PNG first (more reliable)
            if (dataUrl.startsWith('data:image/png')) {
              imageRef = await pdfDocInstance.embedPng(dataUrl);
            } else if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
              // Try JPEG embedding
              try {
                imageRef = await pdfDocInstance.embedJpg(dataUrl);
              } catch (jpegError) {
                console.warn('JPEG embedding failed, converting to PNG:', jpegError);
                // Convert to PNG if JPEG fails
                const pngDataUrl = await convertImageToPng(dataUrl);
                imageRef = await pdfDocInstance.embedPng(pngDataUrl);
              }
            } else {
              // For any other format, convert to PNG
              const pngDataUrl = await convertImageToPng(dataUrl);
              imageRef = await pdfDocInstance.embedPng(pngDataUrl);
            }
          } catch (embedError) {
            console.error('Error embedding image:', embedError);
            throw new Error('Could not embed watermark image. Please ensure it is a valid PNG or JPEG.');
          }
          const targetWidth = Math.max(48, options.fontSize * 1.5);
          const scale = targetWidth / imageRef.width;
          const drawWidth = imageRef.width * scale;
          const drawHeight = imageRef.height * scale;

          if (options.mosaic) {
            // Create a perfect 3x3 grid layout matching reference image
            const cols = 3;
            const rows = 3;
            const marginPts = 15; // Balanced margin for standard professional look (approx 20px)

            for (let row = 0; row < rows; row++) {
              for (let col = 0; col < cols; col++) {
                // Smart 9-point grid
                let cx;
                if (col === 0) cx = marginPts + (drawWidth / 2);
                else if (col === 1) cx = width / 2;
                else cx = width - marginPts - (drawWidth / 2);

                let cy;
                // PDF Y: 0 is Bottom so row 0 is bottom items
                if (row === 0) cy = marginPts + (drawHeight / 2);
                else if (row === 1) cy = height / 2;
                else cy = height - marginPts - (drawHeight / 2);

                // Get corrected start position for center-based rotation
                const { x, y } = getCenteredRotationPosition(cx, cy, drawWidth, drawHeight, options.rotation || 0);

                page.drawImage(imageRef, {
                  x,
                  y,
                  width: drawWidth,
                  height: drawHeight,
                  rotate: degrees(options.rotation || 0),
                  opacity,
                  blendMode: options.layer === 'below' ? BlendMode.Multiply : BlendMode.Normal,
                });
              }
            }
          } else {
            // Single image with precise positioning
            // Using balanced 15pt margin (approx 20px) to match visual reference
            const marginLeft = 15;
            const marginTop = 15;
            const marginRight = 15;
            const marginBottom = 15;
            let x = marginLeft;
            let y = marginBottom;

            // Horizontal positioning
            if (options.position.endsWith('center')) {
              x = (width / 2) - (drawWidth / 2);
            } else if (options.position.endsWith('right')) {
              x = width - marginRight - drawWidth;
            } else if (options.position.endsWith('left')) {
              x = marginLeft;
            }

            // Vertical positioning  
            if (options.position.startsWith('top')) {
              y = height - marginTop - drawHeight;
            } else if (options.position.startsWith('middle')) {
              y = (height / 2) - (drawHeight / 2);
            } else if (options.position.startsWith('bottom')) {
              y = marginBottom;
            }

            // Apply user offsets
            const offsetX = options.offsetXNorm != null ? options.offsetXNorm * width : (options.offsetX || 0);
            const offsetY = options.offsetYNorm != null ? options.offsetYNorm * height : (options.offsetY || 0);
            x += offsetX;
            y -= offsetY;

            // Calculate center point for rotation
            const cx = x + (drawWidth / 2);
            const cy = y + (drawHeight / 2);

            // Get corrected start position for center-based rotation
            const rotatedPos = getCenteredRotationPosition(cx, cy, drawWidth, drawHeight, options.rotation || 0);

            page.drawImage(imageRef, {
              x: rotatedPos.x,
              y: rotatedPos.y,
              width: drawWidth,
              height: drawHeight,
              rotate: degrees(options.rotation || 0),
              opacity,
              blendMode: options.layer === 'below' ? BlendMode.Multiply : BlendMode.Normal,
            });
          }
        }
      }

      const pdfBytes = await pdfDocInstance.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name.replace(/\.pdf$/i, '-watermarked.pdf');
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    try {
      for (const f of files) {
        await processFile(f);
      }
      toast.success(`Watermark applied successfully to ${files.length} file${files.length > 1 ? 's' : ''}!`);
    } catch (error) {
      console.error('Error applying watermark:', error);
      toast.error('Failed to apply watermark. Please try again.');
    }
  }, [files]);

  return (
    <main className="flex-grow flex min-h-0">
      <WatermarkPreview
        files={files}
        onRemoveFile={onRemoveFile}
        onAddMoreFiles={onAddMoreFiles}
        totalPages={totalPages}
        watermarkOptions={watermarkOptions}
        setWatermarkOptions={setWatermarkOptions}
      />
      <WatermarkSettings
        options={watermarkOptions}
        setOptions={setWatermarkOptions}
        fileCount={files.length}
        totalPages={totalPages}
        onApply={applyWatermark}
      />
    </main>
  );
};

// From App.tsx - combined and simplified as the main component
const WatermarkTool: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);

  const handleFilesSelect = useCallback((selectedFiles: FileList) => {
    setFiles(prevFiles => [...prevFiles, ...Array.from(selectedFiles)]);
  }, []);

  const handleRemoveFile = useCallback((fileToRemove: File) => {
    setFiles(prevFiles => prevFiles.filter(file => file !== fileToRemove));
  }, []);

  const handleAddMoreFiles = useCallback((addedFiles: FileList) => {
    setFiles(prevFiles => [...prevFiles, ...Array.from(addedFiles)]);
  }, []);

  if (files.length === 0) {
    return (
      <div className="flex flex-col h-full bg-gray-50 font-sans">
        <PdfUploadHero
          onFilesSelect={handleFilesSelect}
          title="Add Watermark to PDF"
          description="Protect your documents by adding text or image watermarks."
          icon={<Type className="h-6 w-6 mr-3" />}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden font-sans">
      <WatermarkToolLayout
        files={files}
        onRemoveFile={handleRemoveFile}
        onAddMoreFiles={handleAddMoreFiles}
      />
    </div>
  );
};

export default WatermarkTool;


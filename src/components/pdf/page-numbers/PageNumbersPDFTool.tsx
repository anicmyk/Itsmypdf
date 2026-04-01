
import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PagePreviewModal } from '../shared/PagePreviewModal';
import { PdfPageCard } from '../shared/PdfPageCard';
import { MobileLayout } from '../shared/MobileLayout';
import { ToolCTAs } from '../shared/ToolCTAs';
import { TOOL_HERO_UI } from '@/lib/toolHeroConfig';

import {
    Plus, X, ArrowRight, Settings, ChevronDown, Check, Trash2, CornerLeftUp
} from 'lucide-react';
import { toast } from 'sonner';

// Set up PDF.js worker
if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;
}

// Types
export type PageNumberPosition = 'top-left' | 'top-center' | 'top-right' | 'middle-left' | 'middle-center' | 'middle-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

export type MarginPreset = 'narrow' | 'normal' | 'wide';

export interface PageNumberOptions {
    position: PageNumberPosition;
    format: string;
    font: string;
    fontSize: number;
    color: string;
    opacity: number;
    margin: MarginPreset;
}

// Constants
export const FORMAT_OPTIONS = [
    { label: '1', value: '{n}', description: 'Just the number' },
    { label: 'Page 1', value: 'Page {n}', description: 'With "Page" prefix' },
    { label: 'Page 1 of 10', value: 'Page {n} of {p}', description: 'With total pages' },
];

export const MARGIN_OPTIONS: { label: string; value: MarginPreset; points: number }[] = [
    { label: 'Narrow', value: 'narrow', points: 25 },
    { label: 'Normal', value: 'normal', points: 50 },
    { label: 'Wide', value: 'wide', points: 75 },
];

export const FONT_OPTIONS = ['Helvetica', 'Times New Roman', 'Courier'];

export const PRESET_COLORS = [
    '#000000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
    '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc', '#ffffff'
];

const positionToClasses: { [key in PageNumberPosition]: string } = {
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

// Color Picker Component (same as watermark)
interface ColorPickerProps {
    color: string;
    onChange: (color: string) => void;
}

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

// UI Components
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">{children}</label>
);

const PositionGrid: React.FC<{ value: PageNumberPosition, onChange: (pos: PageNumberPosition) => void }> = React.memo(({ value, onChange }) => {
    const positions: PageNumberPosition[] = [
        'top-left', 'top-center', 'top-right',
        'middle-left', 'middle-center', 'middle-right',
        'bottom-left', 'bottom-center', 'bottom-right'
    ];
    return (
        <div className="grid grid-cols-3 gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
            {positions.map(pos => (
                <button
                    key={pos}
                    onClick={() => onChange(pos)}
                    className={`h-8 w-8 rounded flex items-center justify-center transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 ${value === pos ? 'bg-brand-blue-600 shadow-md transform scale-105' : 'bg-white border border-gray-200 hover:border-gray-300'}`}
                    aria-pressed={value === pos}
                    aria-label={pos}
                >
                    <div className={`w-2 h-2 rounded-full ${value === pos ? 'bg-white' : 'bg-gray-300'}`}></div>
                </button>
            ))}
        </div>
    );
});

// Page Number Controls Component (copied from watermark)
const PageNumberControls: React.FC<{
    options: PageNumberOptions;
    onChange: <K extends keyof PageNumberOptions>(key: K, value: PageNumberOptions[K]) => void;
}> = ({ options, onChange }) => {
    const [isColorPopoverOpen, setColorPopoverOpen] = useState(false);
    const [isFontPopoverOpen, setFontPopoverOpen] = useState(false);
    const [isMarginPopoverOpen, setMarginPopoverOpen] = useState(false);
    const [isFormatPopoverOpen, setFormatPopoverOpen] = useState(false);

    const colorRef = useRef<HTMLDivElement>(null);
    const fontRef = useRef<HTMLDivElement>(null);
    const marginRef = useRef<HTMLDivElement>(null);
    const formatRef = useRef<HTMLDivElement>(null);

    useClickOutside(colorRef, () => setColorPopoverOpen(false));
    useClickOutside(fontRef, () => setFontPopoverOpen(false));
    useClickOutside(marginRef, () => setMarginPopoverOpen(false));
    useClickOutside(formatRef, () => setFormatPopoverOpen(false));

    return (
        <div className="flex flex-col space-y-6">
            {/* Margins Dropdown */}
            <div>
                <Label>Margins</Label>
                <div ref={marginRef} className="relative">
                    <button
                        onClick={() => setMarginPopoverOpen(!isMarginPopoverOpen)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                    >
                        <span>{MARGIN_OPTIONS.find(m => m.value === options.margin)?.label || 'Normal'}</span>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    </button>
                    {isMarginPopoverOpen && (
                        <div className="absolute z-50 top-full left-0 mt-1 w-full bg-white rounded-lg shadow-xl border border-gray-100 animate-fade-in-up overflow-hidden">
                            <div className="p-1">
                                {MARGIN_OPTIONS.map(margin => (
                                    <button
                                        key={margin.value}
                                        onClick={() => { onChange('margin', margin.value); setMarginPopoverOpen(false); }}
                                        className={`w-full text-left text-sm px-3 py-2 rounded-md transition-colors ${options.margin === margin.value ? 'bg-brand-blue-50 text-brand-blue-600' : 'hover:bg-gray-50 text-gray-700'}`}
                                    >
                                        {margin.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="w-full h-px bg-gray-100 my-2"></div>

            {/* Format Dropdown */}
            <div>
                <Label>Format</Label>
                <div ref={formatRef} className="relative">
                    <button
                        onClick={() => setFormatPopoverOpen(!isFormatPopoverOpen)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                    >
                        <div className="flex flex-col items-start">
                            <span className="font-medium">{FORMAT_OPTIONS.find(f => f.value === options.format)?.label || '1'}</span>
                            <span className="text-xs text-gray-500">{FORMAT_OPTIONS.find(f => f.value === options.format)?.description || 'Just the number'}</span>
                        </div>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    </button>
                    {isFormatPopoverOpen && (
                        <div className="absolute z-50 top-full left-0 mt-1 w-full bg-white rounded-lg shadow-xl border border-gray-100 animate-fade-in-up overflow-hidden">
                            <div className="p-1">
                                {FORMAT_OPTIONS.map(fmt => (
                                    <button
                                        key={fmt.value}
                                        onClick={() => { onChange('format', fmt.value); setFormatPopoverOpen(false); }}
                                        className={`w-full text-left text-sm px-3 py-2 rounded-md transition-colors ${options.format === fmt.value ? 'bg-brand-blue-50 text-brand-blue-600' : 'hover:bg-gray-50 text-gray-700'}`}
                                    >
                                        <div className="font-medium">{fmt.label}</div>
                                        <div className="text-xs text-gray-500">{fmt.description}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="w-full h-px bg-gray-100 my-2"></div>

            {/* Formatting - Exact copy from watermark */}
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
            </div>

            <div className="w-full h-px bg-gray-100 my-2"></div>

            {/* Position and Opacity - Exact copy from watermark */}
            <div className="grid grid-cols-2 gap-6">
                <div>
                    <Label>Position</Label>
                    <PositionGrid
                        value={options.position}
                        onChange={pos => onChange('position', pos)}
                    />
                </div>
                <div className="space-y-4">
                    <div>
                        <Label>Opacity</Label>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-gray-600 w-full text-right">{Math.round(options.opacity * 100)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0" max="1" step="0.05"
                            value={options.opacity}
                            onChange={e => onChange('opacity', parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-blue-600"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

// Page Number Modal Panel Component (for the modal right panel)
interface PageNumberModalPanelProps {
    options: PageNumberOptions;
    setOptions: React.Dispatch<React.SetStateAction<PageNumberOptions>>;
    onApplyAll: () => void;
    onCancel: () => void;
    totalPages: number;
}

const PageNumberModalPanel: React.FC<PageNumberModalPanelProps> = ({
    options,
    setOptions,
    onApplyAll,
    onCancel,
}) => {
    const [isColorPopoverOpen, setColorPopoverOpen] = useState(false);
    const [isFontPopoverOpen, setFontPopoverOpen] = useState(false);
    const [isMarginPopoverOpen, setMarginPopoverOpen] = useState(false);
    const [isFormatPopoverOpen, setFormatPopoverOpen] = useState(false);

    const colorRef = useRef<HTMLDivElement>(null);
    const fontRef = useRef<HTMLDivElement>(null);
    const marginRef = useRef<HTMLDivElement>(null);
    const formatRef = useRef<HTMLDivElement>(null);

    useClickOutside(colorRef, () => setColorPopoverOpen(false));
    useClickOutside(fontRef, () => setFontPopoverOpen(false));
    useClickOutside(marginRef, () => setMarginPopoverOpen(false));
    useClickOutside(formatRef, () => setFormatPopoverOpen(false));

    const handleChange = <K extends keyof PageNumberOptions>(key: K, value: PageNumberOptions[K]) => {
        setOptions(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="w-80 bg-white rounded-r-xl flex flex-col h-full shadow-lg">
            <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800 mb-1">Page Number Editor</h2>
                <p className="text-sm text-gray-500">Adjust position and style. Click apply to save global settings.</p>
            </div>

            <div className="flex-grow p-6 overflow-y-auto space-y-6">
                {/* Margins Dropdown - Moved to top */}
                <div>
                    <Label>Margins</Label>
                    <div ref={marginRef} className="relative">
                        <button
                            onClick={() => setMarginPopoverOpen(!isMarginPopoverOpen)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                        >
                            <span>{MARGIN_OPTIONS.find(m => m.value === options.margin)?.label || 'Normal'}</span>
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                        </button>
                        {isMarginPopoverOpen && (
                            <div className="absolute z-50 top-full left-0 mt-1 w-full bg-white rounded-lg shadow-xl border border-gray-100 animate-fade-in-up overflow-hidden">
                                <div className="p-1">
                                    {MARGIN_OPTIONS.map(margin => (
                                        <button
                                            key={margin.value}
                                            onClick={() => { handleChange('margin', margin.value); setMarginPopoverOpen(false); }}
                                            className={`w-full text-left text-sm px-3 py-2 rounded-md transition-colors ${options.margin === margin.value ? 'bg-brand-blue-50 text-brand-blue-600' : 'hover:bg-gray-50 text-gray-700'}`}
                                        >
                                            {margin.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Format Dropdown */}
                <div>
                    <Label>Format</Label>
                    <div ref={formatRef} className="relative">
                        <button
                            onClick={() => setFormatPopoverOpen(!isFormatPopoverOpen)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                        >
                            <div className="flex flex-col items-start">
                                <span className="font-medium">{FORMAT_OPTIONS.find(f => f.value === options.format)?.label || '1'}</span>
                                <span className="text-xs text-gray-500">{FORMAT_OPTIONS.find(f => f.value === options.format)?.description || 'Just the number'}</span>
                            </div>
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                        </button>
                        {isFormatPopoverOpen && (
                            <div className="absolute z-50 top-full left-0 mt-1 w-full bg-white rounded-lg shadow-xl border border-gray-100 animate-fade-in-up overflow-hidden">
                                <div className="p-1">
                                    {FORMAT_OPTIONS.map(fmt => (
                                        <button
                                            key={fmt.value}
                                            onClick={() => { handleChange('format', fmt.value); setFormatPopoverOpen(false); }}
                                            className={`w-full text-left text-sm px-3 py-2 rounded-md transition-colors ${options.format === fmt.value ? 'bg-brand-blue-50 text-brand-blue-600' : 'hover:bg-gray-50 text-gray-700'}`}
                                        >
                                            <div className="font-medium">{fmt.label}</div>
                                            <div className="text-xs text-gray-500">{fmt.description}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Formatting */}
                <div>
                    <Label>Formatting</Label>
                    <div className="flex items-center p-1 bg-gray-50 rounded-lg border border-gray-200 overflow-visible">
                        {/* Font Family */}
                        <div ref={fontRef} className="relative flex-1 min-w-0">
                            <button onClick={() => setFontPopoverOpen(!isFontPopoverOpen)} className="w-full flex items-center justify-between text-sm px-2 py-1.5 hover:bg-white rounded transition-colors text-gray-700">
                                <span className="truncate max-w-[60px]">{options.font}</span>
                                <ChevronDown className="w-3 h-3 text-gray-400 ml-1" />
                            </button>
                            {isFontPopoverOpen && (
                                <div className="absolute z-50 top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-100 animate-fade-in-up overflow-hidden">
                                    <div className="max-h-60 overflow-y-auto p-1">
                                        {FONT_OPTIONS.map(font => (
                                            <button key={font} onClick={() => { handleChange('font', font); setFontPopoverOpen(false); }} className={`w-full text-left text-sm px-3 py-2 rounded-md transition-colors ${options.font === font ? 'bg-brand-blue-50 text-brand-blue-600' : 'hover:bg-gray-50 text-gray-700'}`} style={{ fontFamily: font }}>
                                                {font}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="w-px h-5 bg-gray-300 mx-1"></div>

                        {/* Font Size Slider */}
                        <div className="flex items-center gap-1 px-1">
                            <input
                                type="range"
                                min="8"
                                max="144"
                                value={options.fontSize}
                                onChange={(e) => handleChange('fontSize', parseInt(e.target.value))}
                                className="w-16 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-blue-600"
                                style={{
                                    background: `linear-gradient(to right, #2563eb 0%, #2563eb ${((options.fontSize - 8) / (144 - 8)) * 100}%, #e5e7eb ${((options.fontSize - 8) / (144 - 8)) * 100}%, #e5e7eb 100%)`
                                }}
                            />
                            <span className="text-xs text-gray-700 min-w-[28px]">{options.fontSize}<span className="text-xs text-gray-400">px</span></span>
                        </div>

                        <div className="w-px h-5 bg-gray-300 mx-1"></div>

                        {/* Color */}
                        <div ref={colorRef} className="relative">
                            <button onClick={() => setColorPopoverOpen(!isColorPopoverOpen)} className="p-1 hover:bg-white rounded flex items-center justify-center">
                                <div className="w-4 h-4 rounded-full border border-gray-300 shadow-sm" style={{ backgroundColor: options.color }}></div>
                            </button>
                            {isColorPopoverOpen && (
                                <div className="absolute z-50 top-full right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-100 animate-fade-in-up">
                                    <ColorPicker color={options.color} onChange={color => handleChange('color', color)} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Position and Opacity */}
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <Label>Position</Label>
                        <PositionGrid
                            value={options.position}
                            onChange={pos => handleChange('position', pos)}
                        />
                    </div>
                    <div className="space-y-4">
                        <div>
                            <Label>Opacity</Label>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono text-gray-600 w-full text-right">{Math.round(options.opacity * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0" max="1" step="0.05"
                                value={options.opacity}
                                onChange={e => handleChange('opacity', parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-blue-600"
                            />
                        </div>
                    </div>
                </div>

            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-gray-200 flex gap-2">
                <button
                    onClick={onCancel}
                    className="flex-1 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors text-sm"
                >
                    Cancel
                </button>
                <button
                    onClick={onApplyAll}
                    className="flex-1 px-3 py-1.5 bg-brand-blue-600 text-white rounded-lg hover:bg-brand-blue-700 font-medium transition-colors text-sm"
                >
                    Apply Changes
                </button>
            </div>
        </div>
    );
};

// Page Thumbnail Component (copied from watermark)
interface PageThumbnailProps {
    pageNumber: number;
    onClick?: () => void;
    isSelected?: boolean;
    position?: PageNumberPosition;
    pageNumberOptions?: PageNumberOptions;
    file?: File | null;
    totalPages?: number;
}

const PageThumbnail: React.FC<PageThumbnailProps> = React.memo(({
    pageNumber,
    onClick,
    position = 'bottom-center',
    pageNumberOptions,
    file,
    totalPages = 1
}) => {
    const renderContent = () => {
        if (!pageNumberOptions) return <div className="w-4 h-4 bg-brand-blue-500 rounded-full border-2 border-white" />;

        const previewText = pageNumberOptions.format
            .replace('{n}', pageNumber.toString())
            .replace('{p}', totalPages.toString());

        return (
            <div className="relative">
                <span style={{
                    fontSize: `${Math.max(4, pageNumberOptions.fontSize * 0.2)}px`,
                    fontFamily: pageNumberOptions.font,
                    color: pageNumberOptions.color,
                    opacity: pageNumberOptions.opacity,
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                    textShadow: '0 0 2px white',
                }}>{previewText}</span>
            </div>
        );
    };

    return (
        <div className="group flex flex-col items-center space-y-2 flex-shrink-0">
            <PdfPageCard
                pageNumber={pageNumber}
                file={file || undefined}
                pageIndex={pageNumber - 1}
                onClick={onClick}
                rotation={0}
            >
                {pageNumberOptions && (
                    <div
                        className={`absolute w-4 h-4 bg-brand-blue-500 rounded-full border-2 border-white z-50 ${positionToClasses[position]}`}
                    />
                )}
            </PdfPageCard>
            <span className="text-sm font-medium text-gray-600">
                Page {pageNumber}
            </span>
        </div>
    );
});

// Settings Sidebar Component
interface PageNumberSettingsProps {
    options: PageNumberOptions;
    setOptions: React.Dispatch<React.SetStateAction<PageNumberOptions>>;
    totalPages: number;
    onApply: (options: PageNumberOptions) => void;
}

const PageNumberSettings: React.FC<PageNumberSettingsProps> = ({ options, setOptions, totalPages, onApply }) => {
    const handleChange = useCallback(<K extends keyof PageNumberOptions>(key: K, value: PageNumberOptions[K]) => {
        setOptions(prev => ({ ...prev, [key]: value }));
    }, [setOptions]);

    // Extract settings content for mobile
    const settingsContent = (
        <div className="p-5">
            <PageNumberControls
                options={options}
                onChange={handleChange}
            />
        </div>
    );

    return (
        <>
            {/* Mobile Layout */}
            <MobileLayout
                settingsTitle="Page Number Options"
                settingsContent={settingsContent}
                actionButton={{
                    label: 'Add Page Numbers',
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
                        Page Number Options
                    </h2>
                </div>

                <div className="flex-grow p-5 overflow-y-auto overflow-x-visible custom-scrollbar">
                    <PageNumberControls
                        options={options}
                        onChange={handleChange}
                    />
                </div>

                <div className="p-5 border-t border-gray-200 bg-gray-50 mt-auto">
                    <button
                        onClick={() => onApply(options)}
                        className="w-full bg-brand-blue-600 text-white font-bold py-4 px-4 rounded-xl hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center text-lg"
                    >
                        Add Page Numbers
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </button>

                    {/* Bookmark and Share CTAs */}
                    <ToolCTAs variant="sidebar" />
                </div>
            </aside>
        </>
    );
};

// File Selector Component (copied from watermark)
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

// Preview Component (copied structure from watermark)
interface PageNumberPreviewProps {
    files: File[];
    onRemoveFile: (file: File) => void;
    onAddMoreFiles: (files: FileList) => void;
    totalPages: number;
    pageNumberOptions: PageNumberOptions;
    setPageNumberOptions: React.Dispatch<React.SetStateAction<PageNumberOptions>>;
}

const PageNumberPreview: React.FC<PageNumberPreviewProps> = ({
    files,
    onRemoveFile,
    onAddMoreFiles,
    totalPages,
    pageNumberOptions,
    setPageNumberOptions
}) => {
    const [activeFile, setActiveFile] = useState<File | null>(files[0] || null);
    const [selectedPage, setSelectedPage] = useState<number | null>(null);
    const [showHint, setShowHint] = useState(true);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const addFilesInputRef = useRef<HTMLInputElement>(null);
    const [pageNumbers, setPageNumbers] = useState<number[]>([]);
    const gridRef = useRef<HTMLDivElement>(null);
    const thumbRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const [hintPos, setHintPos] = useState<{ left: number; top: number } | null>(null);
    const [goToPage, setGoToPage] = useState<number | ''>('');

    const pdfDocRef = useRef<any>(null);
    const loadingTaskRef = useRef<any>(null);

    // Load PDF document when active file changes
    useEffect(() => {
        let isMounted = true;

        const loadPdf = async () => {
            if (!activeFile) return;

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

                const pages = Array.from({ length: pdf.numPages }, (_, i) => i + 1);
                setPageNumbers(pages);

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

    useEffect(() => {
        pdfDocRef.current = pdfDoc;
    }, [pdfDoc]);

    useEffect(() => {
        if (files.length === 0) {
            setActiveFile(null);
            setPdfDoc(null);
            setPageNumbers([]);
        } else if (!activeFile || !files.includes(activeFile)) {
            setActiveFile(files[0]);
        }
    }, [files, activeFile]);

    useEffect(() => {
        const timer = setTimeout(() => setShowHint(false), 5000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!gridRef.current || pageNumbers.length === 0 || isLoading) return;
        const targetIndex = Math.min(pageNumbers.length, 5) - 1;
        const targetPage = pageNumbers[targetIndex];
        const el = thumbRefs.current[targetPage];
        if (!el) return;
        const gridRect = gridRef.current.getBoundingClientRect();
        const rect = el.getBoundingClientRect();
        const left = rect.left - gridRect.left - 48;
        const top = rect.top - gridRect.top - 12;
        setHintPos({ left, top });
    }, [pageNumbers, isLoading]);

    const handleAddClick = () => {
        addFilesInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            onAddMoreFiles(event.target.files);
        }
    };

    // Modal-specific options state
    const [modalOptions, setModalOptions] = useState<PageNumberOptions>(pageNumberOptions);

    // Update modal options when page changes or when main options change
    useEffect(() => {
        setModalOptions(pageNumberOptions);
    }, [selectedPage, pageNumberOptions]);

    const handleApplyChanges = () => {
        setPageNumberOptions(modalOptions);
        setSelectedPage(null);
    };

    return (
        <div className="flex-grow p-8 flex flex-col items-center overflow-y-auto bg-gray-100 relative">
            {selectedPage !== null && pdfDoc && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setSelectedPage(null)}
                    role="dialog"
                    aria-modal="true"
                >
                    <PagePreviewModal
                        currentPage={selectedPage}
                        totalPages={pdfDoc?.numPages || totalPages}
                        pdfDoc={pdfDoc}
                        onClose={() => setSelectedPage(null)}
                        onNavigate={(dir) => setSelectedPage(dir === 'prev' ? Math.max(1, selectedPage - 1) : Math.min(totalPages, selectedPage + 1))}
                        onBack={() => setSelectedPage(null)}
                        rightPanel={
                            <PageNumberModalPanel
                                options={modalOptions}
                                setOptions={setModalOptions}
                                onApplyAll={handleApplyChanges}
                                onCancel={() => setSelectedPage(null)}
                                totalPages={totalPages}
                            />
                        }
                        overlay={
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                <div className={`absolute ${positionToClasses[modalOptions.position]}`}>
                                    <span style={{
                                        fontSize: `${modalOptions.fontSize}px`,
                                        fontFamily: modalOptions.font,
                                        color: modalOptions.color,
                                        opacity: modalOptions.opacity,
                                        whiteSpace: 'nowrap',
                                        userSelect: 'none',
                                        fontWeight: 'bold',
                                        textShadow: '0 0 4px rgba(255,255,255,0.5)'
                                    }}>
                                        {modalOptions.format
                                            .replace('{n}', selectedPage.toString())
                                            .replace('{p}', totalPages.toString())}
                                    </span>
                                </div>
                            </div>
                        }
                    />
                </div>
            )}
            <div className="w-full max-w-5xl flex items-center justify-center gap-2 mb-8">
                <div className="flex items-center gap-2 flex-wrap">
                    <FileSelector
                        files={files}
                        activeFile={activeFile!}
                        onFileChange={setActiveFile}
                        onRemoveFile={onRemoveFile}
                    />
                </div>
                <button
                    onClick={handleAddClick}
                    className="flex-shrink-0 w-10 h-10 bg-brand-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-brand-blue-700 transition-transform hover:scale-105"
                    aria-label="Add more PDF files"
                >
                    <Plus className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-2 ml-2">
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
                        className="w-28 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-brand-blue-500 focus:border-brand-blue-500"
                    />
                    <button
                        onClick={() => {
                            if (typeof goToPage === 'number') setSelectedPage(goToPage);
                        }}
                        className="px-3 py-2 bg-brand-blue-600 text-white rounded-md text-sm hover:bg-brand-blue-700 shadow-sm"
                    >
                        Go
                    </button>
                </div>
                <input
                    type="file"
                    ref={addFilesInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="application/pdf"
                    multiple
                />
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center w-full py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 max-w-6xl mx-auto w-full pb-20">
                    {pageNumbers.map((pageNum) => {
                        return (
                            <PageThumbnail
                                key={pageNum}
                                pageNumber={pageNum}
                                position={pageNumberOptions.position}
                                pageNumberOptions={pageNumberOptions}
                                onClick={() => setSelectedPage(pageNum)}
                                file={activeFile}
                                totalPages={totalPages}
                            />
                        );
                    })}
                    {showHint && hintPos && (
                        <div className="absolute pointer-events-none" style={{ left: hintPos.left, top: hintPos.top }}>
                            <span style={{ fontFamily: "'Kalam', cursive" }} className="text-lg text-purple-600 whitespace-nowrap drop-shadow-sm -mb-1">Click a page to preview!</span>
                            <CornerLeftUp className="w-12 h-12 text-purple-600" />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Main Layout Component
interface PageNumberToolLayoutProps {
    files: File[];
    onRemoveFile: (file: File) => void;
    onAddMoreFiles: (files: FileList) => void;
}

const PageNumberToolLayout: React.FC<PageNumberToolLayoutProps> = ({
    files,
    onRemoveFile,
    onAddMoreFiles
}) => {
    const [totalPages, setTotalPages] = useState(1);
    const [pageNumberOptions, setPageNumberOptions] = useState<PageNumberOptions>({
        position: 'bottom-center',
        format: '{n}',
        font: 'Helvetica',
        fontSize: 12,
        color: '#000000',
        opacity: 1,
        margin: 'normal'
    });

    useEffect(() => {
        const loadFirstPdf = async () => {
            if (files.length > 0) {
                try {
                    const arrayBuffer = await files[0].arrayBuffer();
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    setTotalPages(pdf.numPages);
                    pdf.destroy();
                } catch (error) {
                    console.error('Error loading PDF:', error);
                }
            }
        };
        loadFirstPdf();
    }, [files]);

    const applyPageNumbers = useCallback(async (options: PageNumberOptions) => {
        if (files.length === 0) {
            return;
        }

        const processFile = async (file: File) => {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDocInstance = await PDFDocument.load(arrayBuffer);
            const pages = pdfDocInstance.getPages();

            const marginPts = MARGIN_OPTIONS.find(m => m.value === options.margin)?.points || 50;

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

            const color = resolveColor();
            const fontName = StandardFonts.Helvetica;
            const embeddedFont = await pdfDocInstance.embedStandardFont(fontName);

            for (let i = 0; i < pages.length; i++) {
                const page = pages[i];
                const { width, height } = page.getSize();

                const text = options.format
                    .replace('{n}', (i + 1).toString())
                    .replace('{p}', pages.length.toString());

                const size = options.fontSize;
                const textWidth = embeddedFont.widthOfTextAtSize(text, size);

                let x = marginPts;
                let yBaseline = marginPts;

                if (options.position.endsWith('center')) {
                    x = (width / 2) - (textWidth / 2);
                } else if (options.position.endsWith('right')) {
                    x = width - marginPts - textWidth;
                } else if (options.position.endsWith('left')) {
                    x = marginPts;
                }

                if (options.position.startsWith('top')) {
                    yBaseline = height - marginPts - size;
                } else if (options.position.startsWith('middle')) {
                    yBaseline = (height / 2) - (size / 2);
                } else if (options.position.startsWith('bottom')) {
                    yBaseline = marginPts;
                }

                page.drawText(text, {
                    x,
                    y: yBaseline,
                    size,
                    color,
                    opacity: options.opacity,
                    font: embeddedFont,
                });
            }

            const pdfBytes = await pdfDocInstance.save();
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = file.name.replace(/\.pdf$/i, '-numbered.pdf');
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
            toast.success(`Page numbers added successfully to ${files.length} file${files.length > 1 ? 's' : ''}!`);
        } catch (error) {
            console.error('Error adding page numbers:', error);
            toast.error('Failed to add page numbers. Please try again.');
        }
    }, [files]);

    return (
        <main className="flex-grow flex min-h-0">
            <PageNumberPreview
                files={files}
                onRemoveFile={onRemoveFile}
                onAddMoreFiles={onAddMoreFiles}
                totalPages={totalPages}
                pageNumberOptions={pageNumberOptions}
                setPageNumberOptions={setPageNumberOptions}
            />
            <PageNumberSettings
                options={pageNumberOptions}
                setOptions={setPageNumberOptions}
                totalPages={totalPages}
                onApply={applyPageNumbers}
            />
        </main>
    );
};

// Upload Hero Component (copied from watermark)
interface PageNumberUploadHeroProps {
    onFilesSelect: (files: FileList) => void;
}

const pageNumberHero = TOOL_HERO_UI['add-page-numbers-to-pdf'];

const PageNumberUploadHero: React.FC<PageNumberUploadHeroProps> = ({ onFilesSelect }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            onFilesSelect(event.target.files);
        }
    };

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
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
                    <h1 className="text-5xl font-bold text-gray-800">{pageNumberHero.title}</h1>
                    <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
                        {pageNumberHero.description}
                    </p>
                    <div className="mt-10">
                        <button
                            onClick={handleButtonClick}
                            className="bg-brand-blue-600 text-white font-bold py-4 px-10 rounded-lg hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl text-xl inline-flex items-center justify-center"
                            aria-label="Select PDF file to add page numbers"
                        >
                            <Plus className="h-6 w-6 mr-3" />
                            {pageNumberHero.buttonLabel ?? 'Select PDF files'}
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept={pageNumberHero.accept ?? 'application/pdf'}
                            multiple
                        />
                    </div>
                    <p className="mt-4 text-gray-500">{pageNumberHero.dropLabel ?? 'or drop PDFs here'}</p>
                </div>
            </div>
        </div>
    );
};

// Main Tool Component
const PageNumbersTool: React.FC = () => {
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
                <PageNumberUploadHero onFilesSelect={handleFilesSelect} />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-hidden font-sans">
            <PageNumberToolLayout
                files={files}
                onRemoveFile={handleRemoveFile}
                onAddMoreFiles={handleAddMoreFiles}
            />
        </div>
    );
};

export default PageNumbersTool;


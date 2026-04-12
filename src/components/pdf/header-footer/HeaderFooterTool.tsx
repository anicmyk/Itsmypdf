
import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { PdfUploadHero } from '../shared/PdfUploadHero';
import { PdfPageCard } from '../shared/PdfPageCard';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { MobileLayout } from '../shared/MobileLayout';
import { ToolCTAs } from '../shared/ToolCTAs';
import { TOOL_HERO_UI } from '@/lib/toolHeroConfig';

import {
    Plus, ArrowRight, Type, Bold, Italic, Underline,
    AlignLeft, AlignCenter, AlignRight, Grid3x3,
    ChevronDown, Settings, PanelTop, Hash, Calendar, FileText
} from 'lucide-react';
import { toast } from 'sonner';

// Set up PDF.js worker
if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;
}

const hero = TOOL_HERO_UI['add-header-footer-to-pdf'];

// Types - matching watermark structure
export type HeaderFooterPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface HeaderFooterOptions {
    text: string;
    font: string;
    fontSize: number;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    color: string;
    textAlign: 'left' | 'center' | 'right';
    position: HeaderFooterPosition;
    transparency: number;
    rotation: number;
    mosaic: boolean;
    pages: 'all' | 'custom';
    startPage: number;
    endPage: number;
}

export const FONT_OPTIONS = ['Arial', 'Times New Roman', 'Courier'];
export const PRESET_COLORS = [
    '#000000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
    '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc', '#ffffff'
];

// Smart Tags for Header/Footer
export const SMART_TAGS = [
    { label: 'Page Number', tag: '[Page]', icon: Hash },
    { label: 'Total Pages', tag: '[Total]', icon: Hash },
    { label: 'Date', tag: '[Date]', icon: Calendar },
    { label: 'Filename', tag: '[File]', icon: FileText },
];

// Color utilities (same as watermark)
const hexToRgbaPicker = (hex: string) => {
    let c: any;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split('');
        if (c.length === 3) c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        c = '0x' + c.join('');
        return { r: (c >> 16) & 255, g: (c >> 8) & 255, b: c & 255, a: 1 };
    }
    const rgbaMatch = hex.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
    if (rgbaMatch) return { r: parseInt(rgbaMatch[1]), g: parseInt(rgbaMatch[2]), b: parseInt(rgbaMatch[3]), a: rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1 };
    return { r: 0, g: 0, b: 0, a: 1 };
};

const rgbaToHex = (r: number, g: number, b: number) => "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toLowerCase();

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
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else[r, g, b] = [c, 0, x];
    return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255), a };
};

// ColorPicker component (same as watermark)
const ColorPicker: React.FC<{ color: string; onChange: (color: string) => void }> = ({ color, onChange }) => {
    const initialRgba = hexToRgbaPicker(color);
    const initialHsla = rgbaToHsla(initialRgba.r, initialRgba.g, initialRgba.b, initialRgba.a);
    const [hsla, setHsla] = useState(initialHsla);
    const [hexInput, setHexInput] = useState(rgbaToHex(initialRgba.r, initialRgba.g, initialRgba.b));
    const satValRef = useRef<HTMLDivElement>(null);

    const handleColorChange = (newHsla: { h: number, s: number, l: number, a: number }) => {
        setHsla(newHsla);
        const newRgba = hslaToRgba(newHsla.h, newHsla.s, newHsla.l, newHsla.a);
        setHexInput(rgbaToHex(newRgba.r, newRgba.g, newRgba.b));
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
            handleColorChange({ ...hsla, s, l: 50 * (2 - s / 100) * (1 - y / rect.height) });
        }
    }, [hsla]);

    useEffect(() => {
        const newRgba = hexToRgbaPicker(color);
        const newHsla = rgbaToHsla(newRgba.r, newRgba.g, newRgba.b, newRgba.a);
        setHsla(newHsla);
        setHexInput(rgbaToHex(newRgba.r, newRgba.g, newRgba.b));
    }, [color]);

    return (
        <div className="p-3 bg-white w-[256px] space-y-3">
            <div ref={satValRef} onMouseMove={handleSatValDrag} onMouseDown={handleSatValDrag} className="w-full h-40 rounded-md cursor-crosshair relative" style={{ backgroundColor: `hsl(${hsla.h}, 100%, 50%)` }}>
                <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                <div className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md" style={{ left: `${hsla.s}%`, top: `${100 - (hsla.l / (1 - hsla.s / 200))}%`, transform: 'translate(-50%, -50%)' }} />
            </div>
            <input type="range" min="0" max="360" value={hsla.h} onChange={e => handleColorChange({ ...hsla, h: +e.target.value })} className="w-full h-2 rounded-lg appearance-none cursor-pointer" style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }} />
            <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-md border" style={{ backgroundColor: `rgba(${hslaToRgba(hsla.h, hsla.s, hsla.l, hsla.a).r}, ${hslaToRgba(hsla.h, hsla.s, hsla.l, hsla.a).g}, ${hslaToRgba(hsla.h, hsla.s, hsla.l, hsla.a).b}, ${hsla.a})` }} />
                <input type="text" value={hexInput} onChange={handleHexChange} className="flex-1 px-2 py-1 border rounded-md text-sm" />
            </div>
  <div className="grid grid-cols-5 gap-1 sm:grid-cols-10">
                {PRESET_COLORS.map(c => (<button key={c} onClick={() => onChange(c)} className="w-full aspect-square rounded-sm border" style={{ backgroundColor: c }} />))}
            </div>
        </div>
    );
};

// Click outside hook
const useClickOutside = (ref: React.RefObject<HTMLElement>, handler: () => void) => {
    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            if (!ref.current || ref.current.contains(event.target as Node)) return;
            handler();
        };
        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);
        return () => { document.removeEventListener('mousedown', listener); document.removeEventListener('touchstart', listener); };
    }, [ref, handler]);
};

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">{children}</label>
);

// Position Grid (same as watermark but 6 positions for header/footer)
const PositionGrid: React.FC<{ value: HeaderFooterPosition, onChange: (pos: HeaderFooterPosition) => void, disabled?: boolean }> = React.memo(({ value, onChange, disabled = false }) => {
    const positions: HeaderFooterPosition[] = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'];
    return (
  <div className="grid grid-cols-1 gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 sm:grid-cols-3">
            {positions.map(pos => (
                <button key={pos} onClick={() => { if (!disabled) onChange(pos); }} disabled={disabled}
                    className={`h-8 w-8 rounded flex items-center justify-center transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 ${disabled ? 'opacity-30 cursor-not-allowed' : ''} ${value === pos ? 'bg-brand-blue-600 shadow-md transform scale-105' : 'bg-white border border-gray-200 hover:border-gray-300'}`}
                    aria-pressed={value === pos} aria-label={pos}>
                    <div className={`w-2 h-2 rounded-full ${value === pos ? 'bg-white' : 'bg-gray-300'}`} />
                </button>
            ))}
        </div>
    );
});

// Controls Component (matching watermark layout exactly)
const HeaderFooterControls: React.FC<{
    options: HeaderFooterOptions;
    onChange: <K extends keyof HeaderFooterOptions>(key: K, value: HeaderFooterOptions[K]) => void;
    fileCount?: number;
    totalPages?: number;
}> = ({ options, onChange, fileCount = 1, totalPages = 1 }) => {
    const [isFontPopoverOpen, setFontPopoverOpen] = useState(false);
    const [isColorPopoverOpen, setColorPopoverOpen] = useState(false);
    const [isAlignPopoverOpen, setAlignPopoverOpen] = useState(false);

    const fontRef = useRef<HTMLDivElement>(null);
    const colorRef = useRef<HTMLDivElement>(null);
    const alignRef = useRef<HTMLDivElement>(null);

    useClickOutside(fontRef, () => setFontPopoverOpen(false));
    useClickOutside(colorRef, () => setColorPopoverOpen(false));
    useClickOutside(alignRef, () => setAlignPopoverOpen(false));

    const alignIcons = { left: <AlignLeft className="w-4 h-4" />, center: <AlignCenter className="w-4 h-4" />, right: <AlignRight className="w-4 h-4" /> };
    const baseInputStyles = "w-full px-3 py-2 text-center bg-white border border-gray-300 rounded-md focus:ring-brand-blue-500 focus:border-brand-blue-500 text-sm";

    const insertTag = (tag: string) => onChange('text', options.text + tag);

    return (
        <div className="flex flex-col space-y-6">
            {/* Content */}
            <div>
                <Label>Content</Label>
                <textarea value={options.text} onChange={(e) => onChange('text', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue-500 focus:border-brand-blue-500 text-sm min-h-[80px] resize-y"
                    placeholder="Enter header/footer text..." />
                {/* Smart Tags */}
                <div className="flex flex-wrap gap-1 mt-2">
                    {SMART_TAGS.map(({ label, tag, icon: Icon }) => (
                        <button key={tag} onClick={() => insertTag(tag)} className="flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded text-xs text-blue-700">
                            <Icon className="w-3 h-3" />{label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Formatting (same layout as watermark) */}
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
                                        <button key={font} onClick={() => { onChange('font', font); setFontPopoverOpen(false); }}
                                            className={`w-full text-left text-sm px-3 py-2 rounded-md transition-colors ${options.font === font ? 'bg-brand-blue-50 text-brand-blue-600' : 'hover:bg-gray-50 text-gray-700'}`} style={{ fontFamily: font }}>{font}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="w-px h-5 bg-gray-300 mx-1" />
                    {/* Font Size Slider */}
                    <div className="flex items-center gap-2 px-2">
                        <input type="range" min="8" max="48" value={options.fontSize} onChange={(e) => onChange('fontSize', parseInt(e.target.value))}
                            className="w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-blue-600"
                            style={{ background: `linear-gradient(to right, #2563eb 0%, #2563eb ${((options.fontSize - 8) / 40) * 100}%, #e5e7eb ${((options.fontSize - 8) / 40) * 100}%, #e5e7eb 100%)` }} />
                        <span className="text-sm text-gray-700 min-w-[35px]">{options.fontSize}<span className="text-xs text-gray-400">px</span></span>
                    </div>
                    <div className="w-px h-5 bg-gray-300 mx-1" />
                    {/* Alignment */}
                    <div ref={alignRef} className="relative">
                        <button onClick={() => setAlignPopoverOpen(!isAlignPopoverOpen)} className="p-1.5 hover:bg-white rounded text-gray-600">{alignIcons[options.textAlign]}</button>
                        {isAlignPopoverOpen && (
                            <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded-lg shadow-xl border border-gray-100 p-1 flex gap-1 animate-fade-in-up">
                                {(['left', 'center', 'right'] as const).map(align => (
                                    <button key={align} onClick={() => { onChange('textAlign', align); setAlignPopoverOpen(false); }}
                                        className={`p-1.5 rounded-md ${options.textAlign === align ? 'bg-brand-blue-50 text-brand-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>{alignIcons[align]}</button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="w-px h-5 bg-gray-300 mx-1" />
                    {/* Color */}
                    <div ref={colorRef} className="relative">
                        <button onClick={() => setColorPopoverOpen(!isColorPopoverOpen)} className="p-1.5 hover:bg-white rounded flex items-center justify-center">
                            <div className="w-4 h-4 rounded-full border border-gray-300 shadow-sm" style={{ backgroundColor: options.color }} />
                        </button>
                        {isColorPopoverOpen && (
                            <div className="absolute z-50 top-full right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-100 animate-fade-in-up">
                                <ColorPicker color={options.color} onChange={color => onChange('color', color)} />
                            </div>
                        )}
                    </div>
                </div>
                {/* Bold, Italic, Underline */}
                <div className="flex gap-2 mt-2">
                    <button onClick={() => onChange('bold', !options.bold)} className={`flex-1 flex items-center justify-center py-1.5 rounded-md border text-sm transition-colors ${options.bold ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}><Bold className="w-4 h-4 mr-1.5" /> Bold</button>
                    <button onClick={() => onChange('italic', !options.italic)} className={`flex-1 flex items-center justify-center py-1.5 rounded-md border text-sm transition-colors ${options.italic ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}><Italic className="w-4 h-4 mr-1.5" /> Italic</button>
                    <button onClick={() => onChange('underline', !options.underline)} className={`flex-1 flex items-center justify-center py-1.5 rounded-md border text-sm transition-colors ${options.underline ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}><Underline className="w-4 h-4 mr-1.5" /> Line</button>
                </div>
            </div>

            <div className="w-full h-px bg-gray-100 my-2" />

            {/* Position & Opacity/Rotation grid (same as watermark) */}
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                <div>
                    <Label>Position</Label>
                    <PositionGrid value={options.position} onChange={pos => onChange('position', pos)} disabled={options.mosaic} />
                    <div className="mt-3 flex items-center">
                        <input id="mosaic" type="checkbox" checked={options.mosaic} onChange={e => onChange('mosaic', e.target.checked)} className="h-4 w-4 text-brand-blue-600 border-gray-300 rounded focus:ring-brand-blue-500" />
                        <label htmlFor="mosaic" className="ml-2 block text-sm font-medium text-gray-700 flex items-center gap-1"><Grid3x3 className="w-3.5 h-3.5 text-gray-400" /> Mosaic Tile</label>
                    </div>
                </div>
                <div className="space-y-4">
                    <div>
                        <Label>Opacity</Label>
                        <div className="flex items-center gap-2 mb-1"><span className="text-xs font-mono text-gray-600 w-full text-right">{Math.round((1 - options.transparency) * 100)}%</span></div>
                        <input type="range" min="0" max="1" step="0.05" value={1 - options.transparency} onChange={e => onChange('transparency', 1 - parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-blue-600" />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-2"><Label>Rotation</Label><span className="text-sm font-semibold text-gray-700">{options.rotation}°</span></div>
                        <input type="range" min="-180" max="180" step="1" value={options.rotation} onChange={e => onChange('rotation', parseInt(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-blue-600" />
                        <div className="flex justify-between mt-1 text-xs text-gray-500">
                            <span>-180°</span>
                            <button onClick={() => onChange('rotation', 0)} className="text-brand-blue-600 hover:text-brand-blue-700 font-medium">Reset</button>
                            <span>180°</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full h-px bg-gray-100 my-2" />

            {/* Pages Range */}
            <div>
                <Label>Pages</Label>
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 pl-1">Page</span>
                    <input type="number" value={options.startPage} onChange={e => onChange('startPage', parseInt(e.target.value))} min={1} max={totalPages} className={baseInputStyles} />
                    <span className="text-sm text-gray-500">to</span>
                    <input type="number" value={options.endPage} onChange={e => onChange('endPage', parseInt(e.target.value))} min={options.startPage} max={totalPages} className={baseInputStyles} />
                </div>
            </div>
        </div>
    );
};

// Settings Sidebar (same structure as watermark)
const HeaderFooterSettings: React.FC<{
    options: HeaderFooterOptions;
    setOptions: React.Dispatch<React.SetStateAction<HeaderFooterOptions>>;
    fileCount: number;
    totalPages: number;
    onApply: (options: HeaderFooterOptions) => void;
    pagesPanelContent?: React.ReactNode; // Optional pages panel content from preview
}> = ({ options, setOptions, fileCount, totalPages, onApply, pagesPanelContent }) => {
    const handleChange = useCallback(<K extends keyof HeaderFooterOptions>(key: K, value: HeaderFooterOptions[K]) => {
        setOptions(prev => ({ ...prev, [key]: value }));
    }, [setOptions]);

    // Extract settings content for mobile
    const settingsContent = (
        <div className="p-5">
            <HeaderFooterControls options={options} onChange={handleChange} fileCount={fileCount} totalPages={totalPages} />
        </div>
    );

    return (
        <>
            {/* Mobile Layout */}
            <MobileLayout
                settingsTitle="Header & Footer"
                settingsContent={settingsContent}
                pagesPanel={pagesPanelContent ? {
                    content: pagesPanelContent,
                    title: 'Pages'
                } : undefined}
                actionButton={{
                    label: 'Apply Header & Footer',
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
                        Header & Footer
                    </h2>
                </div>
                <div className="flex-grow p-5 overflow-y-auto overflow-x-visible custom-scrollbar">
                    <HeaderFooterControls options={options} onChange={handleChange} fileCount={fileCount} totalPages={totalPages} />
                </div>
                <div className="p-5 border-t border-gray-200 bg-gray-50 mt-auto">
                    <button onClick={() => onApply(options)} className="w-full bg-brand-blue-600 text-white font-bold py-4 px-4 rounded-xl hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center text-lg">
                        Apply Header & Footer
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </button>

                    {/* Bookmark and Share CTAs */}
                    <ToolCTAs variant="sidebar" />
                </div>
            </aside>
        </>
    );
};

// Preview Component
const HeaderFooterPreview: React.FC<{
    files: File[];
    onAddMoreFiles: (files: FileList) => void;
    totalPages: number;
    options: HeaderFooterOptions;
    setOptions: React.Dispatch<React.SetStateAction<HeaderFooterOptions>>;
    activePage: number;
    setActivePage: (page: number) => void;
}> = ({ files, onAddMoreFiles, totalPages, options, setOptions, activePage, setActivePage }) => {
    const [activeFile, setActiveFile] = useState<File | null>(files[0] || null);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [pageNumbers, setPageNumbers] = useState<number[]>([]);
    const [goToPage, setGoToPage] = useState<number | ''>('');
    const addFilesInputRef = useRef<HTMLInputElement>(null);

    const previewContainerRef = useRef<HTMLDivElement>(null);
    const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const renderTaskRef = useRef<any>(null);
    const pdfDocRef = useRef<any>(null);

    useEffect(() => {
        let isMounted = true;
        const loadPdf = async () => {
            if (!activeFile) return;
            if (pdfDocRef.current) { pdfDocRef.current.destroy().catch(() => { }); pdfDocRef.current = null; }
            setIsLoading(true);
            try {
                const arrayBuffer = await activeFile.arrayBuffer();
                if (!isMounted) return;
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;
                if (!isMounted) { pdf.destroy().catch(() => { }); return; }
                pdfDocRef.current = pdf;
                setPdfDoc(pdf);
                setPageNumbers(Array.from({ length: pdf.numPages }, (_, i) => i + 1));
                setOptions(prev => ({ ...prev, startPage: 1, endPage: pdf.numPages }));
            } catch (error) { console.error('Error loading PDF:', error); }
            finally { if (isMounted) setIsLoading(false); }
        };
        loadPdf();
        return () => { isMounted = false; if (pdfDocRef.current) pdfDocRef.current.destroy().catch(() => { }); };
    }, [activeFile]);

    useEffect(() => {
        if (files.length === 0) { setActiveFile(null); setPdfDoc(null); setPageNumbers([]); }
        else if (!activeFile || !files.includes(activeFile)) setActiveFile(files[0]);
    }, [files, activeFile]);


    // Render PDF page with proper scaling (matching CropPDFTool approach)
    const renderPdfPage = useCallback(async () => {
        if (!pdfDoc || !pdfCanvasRef.current || !overlayCanvasRef.current || !previewContainerRef.current) return;
        if (renderTaskRef.current) { try { renderTaskRef.current.cancel(); } catch (e) { } }
        try {
            const page = await pdfDoc.getPage(activePage);
            const container = previewContainerRef.current;

            // Calculate scale to fit container while maintaining aspect ratio
            const isMobile = window.innerWidth < 768;

            // CRITICAL FIX: Subtract bottom bar height on mobile to prevent cutoff
            const bottomBarHeight = isMobile ? 140 : 0;
            const padding = isMobile ? 16 : 40;

            const containerWidth = container.clientWidth - padding;
            // Subtract bottom reserved space from available height
            const containerHeight = container.clientHeight - padding - bottomBarHeight;

            // Get page viewport at scale 1
            const viewport = page.getViewport({ scale: 1 });
            const scaleX = containerWidth / viewport.width;
            const scaleY = containerHeight / viewport.height;

            // Always use the smaller scale to ensure entire page fits
            // Use 15% reduction to ensure all corners visible on all page sizes
            const scale = Math.min(scaleX, scaleY) * 0.85;

            const scaledViewport = page.getViewport({ scale });

            // Set canvas dimensions
            [pdfCanvasRef.current, overlayCanvasRef.current].forEach(canvas => {
                canvas.width = scaledViewport.width;
                canvas.height = scaledViewport.height;
            });

            // Render PDF page
            const ctx = pdfCanvasRef.current.getContext('2d', { alpha: false });
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, pdfCanvasRef.current.width, pdfCanvasRef.current.height);
                const renderTask = page.render({ canvasContext: ctx, viewport: scaledViewport });
                renderTaskRef.current = renderTask;
                await renderTask.promise;
                renderTaskRef.current = null;
            }
            renderOverlay();
        } catch (e: any) { if (e?.name === 'RenderingCancelledException') return; console.error(`Error rendering page:`, e); }
    }, [pdfDoc, activePage]);


    // Add resize observer to handle dynamic screen size changes
    useEffect(() => {
        if (!previewContainerRef.current) return;

        const resizeObserver = new ResizeObserver(() => {
            // Re-render when container size changes
            renderPdfPage();
        });

        resizeObserver.observe(previewContainerRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, [renderPdfPage]);

    // Process smart tags
    const processSmartTags = (text: string, pageNum: number, total: number, filename: string) => {
        return text.replace(/\[Page\]/g, pageNum.toString()).replace(/\[Total\]/g, total.toString()).replace(/\[Date\]/g, new Date().toLocaleDateString()).replace(/\[File\]/g, filename);
    };

    // Render overlay
    const renderOverlay = useCallback(() => {
        if (!overlayCanvasRef.current) return;
        const ctx = overlayCanvasRef.current.getContext('2d', { alpha: true });
        if (!ctx) return;
        const canvas = overlayCanvasRef.current;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (activePage < options.startPage || activePage > options.endPage) return;

        const fontSize = Math.max(8, options.fontSize * 1.1);
        let fontStyle = '';
        if (options.italic) fontStyle += 'italic ';
        if (options.bold) fontStyle += 'bold ';
        ctx.font = `${fontStyle}${fontSize}px ${options.font}`;
        ctx.fillStyle = options.color;
        ctx.globalAlpha = 1 - options.transparency;
        ctx.textBaseline = 'alphabetic';

        const filename = activeFile?.name.replace('.pdf', '') || 'document';
        const text = processSmartTags(options.text, activePage, pdfDoc?.numPages || totalPages, filename);
        const textWidth = ctx.measureText(text).width;
        const margin = 20;

        if (options.mosaic) {
            // 6-position mosaic for header/footer
            const positions: HeaderFooterPosition[] = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'];
            positions.forEach(pos => {
                let x = margin, y = margin + fontSize;
                if (pos.endsWith('center')) x = (canvas.width / 2) - (textWidth / 2);
                else if (pos.endsWith('right')) x = canvas.width - margin - textWidth;
                if (pos.startsWith('bottom')) y = canvas.height - margin;
                ctx.save();
                const cx = x + textWidth / 2, cy = y - fontSize / 2;
                ctx.translate(cx, cy);
                ctx.rotate((-options.rotation * Math.PI) / 180);
                ctx.fillText(text, -textWidth / 2, fontSize / 2);
                if (options.underline) { ctx.strokeStyle = options.color; ctx.lineWidth = Math.max(1, fontSize * 0.05); ctx.beginPath(); ctx.moveTo(-textWidth / 2, fontSize / 2 + 2); ctx.lineTo(textWidth / 2, fontSize / 2 + 2); ctx.stroke(); }
                ctx.restore();
            });
        } else {
            let x = margin, y = margin + fontSize;
            if (options.position.endsWith('center')) x = (canvas.width / 2) - (textWidth / 2);
            else if (options.position.endsWith('right')) x = canvas.width - margin - textWidth;
            if (options.position.startsWith('bottom')) y = canvas.height - margin;
            ctx.save();
            const cx = x + textWidth / 2, cy = y - fontSize / 2;
            ctx.translate(cx, cy);
            ctx.rotate((-options.rotation * Math.PI) / 180);
            ctx.fillText(text, -textWidth / 2, fontSize / 2);
            if (options.underline) { ctx.strokeStyle = options.color; ctx.lineWidth = Math.max(1, fontSize * 0.05); ctx.beginPath(); ctx.moveTo(-textWidth / 2, fontSize / 2 + 2); ctx.lineTo(textWidth / 2, fontSize / 2 + 2); ctx.stroke(); }
            ctx.restore();
        }
        ctx.globalAlpha = 1;
    }, [options, activePage, pdfDoc, totalPages, activeFile]);

    useEffect(() => { renderPdfPage(); }, [renderPdfPage]);
    useEffect(() => { renderOverlay(); }, [renderOverlay]);

    return (
        <div className="flex-grow flex min-h-0">
            {/* Left Sidebar - Thumbnails - HIDDEN on mobile */}
            <aside className="hidden md:flex w-48 flex-shrink-0 bg-white border-r border-gray-200 flex-col shadow-sm">
                <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Pages</h3>
                        <button onClick={() => addFilesInputRef.current?.click()} className="w-8 h-8 bg-brand-blue-600 text-white rounded-full flex items-center justify-center hover:bg-brand-blue-700 transition-transform hover:scale-105" aria-label="Add more PDF files" title="Add more files"><Plus className="w-4 h-4" /></button>
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
                    {isLoading ? <div className="flex items-center justify-center py-8"><LoadingSpinner /></div> : pageNumbers.map((pageNum) => (
                        <div key={pageNum} onClick={() => setActivePage(pageNum)} className="group cursor-pointer">
                            <div className={`overflow-hidden transition-all ${pageNum === activePage ? 'ring-2 ring-brand-blue-500 shadow-md' : 'hover:ring-1 hover:ring-gray-300'}`}>
                                <PdfPageCard pageNumber={pageNum} file={activeFile || undefined} pageIndex={pageNum - 1} isSelected={false} onClick={() => setActivePage(pageNum)} rotation={0} />
                            </div>
                            <div className={`text-center text-xs font-medium mt-1.5 ${pageNum === activePage ? 'text-brand-blue-600 font-semibold' : 'text-gray-500'}`}>{pageNum}</div>
                        </div>
                    ))}
                </div>
                <input type="file" ref={addFilesInputRef} onChange={e => e.target.files && onAddMoreFiles(e.target.files)} className="hidden" accept="application/pdf" multiple />
            </aside>
            {/* Center - Main Preview Area */}
            <div className="flex-grow flex flex-col bg-gray-100">
                {/* Large Page Preview - Canvas Based */}
                <div
                    ref={previewContainerRef}
                    className="flex-grow flex flex-col items-center justify-center bg-gray-100 p-4 pb-28 md:pb-4 relative"
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
                                    className="block max-w-full max-h-full"
                                />

                                {/* Layer 2: Header/Footer (On top) */}
                                <canvas
                                    ref={overlayCanvasRef}
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

// Main Layout
const HeaderFooterToolLayout: React.FC<{ files: File[]; onRemoveFile: (file: File) => void; onAddMoreFiles: (files: FileList) => void }> = ({ files, onRemoveFile, onAddMoreFiles }) => {
    const [totalPages, setTotalPages] = useState(0);
    const [options, setOptions] = useState<HeaderFooterOptions>({
        text: 'Page [Page] of [Total]',
        font: 'Arial',
        fontSize: 12,
        bold: false,
        italic: false,
        underline: false,
        color: '#000000',
        textAlign: 'center',
        position: 'bottom-center',
        transparency: 0,
        rotation: 0,
        mosaic: false,
        pages: 'all',
        startPage: 1,
        endPage: 1,
    });

    useEffect(() => {
        const calcPages = async () => {
            let total = 0;
            for (const file of files) {
                try {
                    const ab = await file.arrayBuffer();
                    const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
                    total += pdf.numPages;
                    pdf.destroy();
                } catch (e) { }
            }
            setTotalPages(total);
        };
        if (files.length > 0) calcPages();
    }, [files]);

    const processSmartTagsExport = (text: string, pageNum: number, total: number, filename: string) => {
        return text.replace(/\[Page\]/g, pageNum.toString()).replace(/\[Total\]/g, total.toString()).replace(/\[Date\]/g, new Date().toLocaleDateString()).replace(/\[File\]/g, filename);
    };

    const applyHeaderFooter = useCallback(async (opts: HeaderFooterOptions) => {
        const processFile = async (file: File) => {
            const ab = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(ab);
            const pages = pdfDoc.getPages();
            const colorRgba = hexToRgbaPicker(opts.color);
            const color = rgb(colorRgba.r / 255, colorRgba.g / 255, colorRgba.b / 255);
            let font;
            if (opts.font === 'Times New Roman') font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
            else if (opts.font === 'Courier') font = await pdfDoc.embedFont(StandardFonts.Courier);
            else font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const filename = file.name.replace('.pdf', '');
            const opacity = 1 - opts.transparency;
            const margin = 20;

            for (let i = 0; i < pages.length; i++) {
                const pageNum = i + 1;
                if (pageNum < opts.startPage || pageNum > opts.endPage) continue;
                const page = pages[i];
                const { width, height } = page.getSize();
                const text = processSmartTagsExport(opts.text, pageNum, pages.length, filename);
                const textWidth = font.widthOfTextAtSize(text, opts.fontSize);

                const drawText = (pos: HeaderFooterPosition) => {
                    let x = margin, y = margin;
                    if (pos.endsWith('center')) x = (width / 2) - (textWidth / 2);
                    else if (pos.endsWith('right')) x = width - margin - textWidth;
                    if (pos.startsWith('top')) y = height - margin - opts.fontSize;

                    page.drawText(text, { x, y, size: opts.fontSize, color, opacity, font, rotate: degrees(opts.rotation) });

                    if (opts.underline) {
                        const underlineOffsetY = -2;
                        const rad = (opts.rotation * Math.PI) / 180;
                        const startX = 0;
                        const startY = underlineOffsetY;
                        const endX = textWidth;
                        const endY = underlineOffsetY;

                        const rotatedStartX = startX * Math.cos(rad) - startY * Math.sin(rad);
                        const rotatedStartY = startX * Math.sin(rad) + startY * Math.cos(rad);
                        const rotatedEndX = endX * Math.cos(rad) - endY * Math.sin(rad);
                        const rotatedEndY = endX * Math.sin(rad) + endY * Math.cos(rad);

                        page.drawLine({
                            start: { x: x + rotatedStartX, y: y + rotatedStartY },
                            end: { x: x + rotatedEndX, y: y + rotatedEndY },
                            thickness: Math.max(0.5, opts.fontSize * 0.03),
                            color,
                            opacity,
                        });
                    }
                };

                if (opts.mosaic) {
                    (['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'] as HeaderFooterPosition[]).forEach(drawText);
                } else {
                    drawText(opts.position);
                }
            }
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = file.name.replace(/\.pdf$/i, '-header-footer.pdf');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        };
        try {
            for (const f of files) await processFile(f);
            toast.success(`Header & Footer applied to ${files.length} file${files.length > 1 ? 's' : ''}!`);
        } catch (error) { console.error(error); toast.error('Failed to apply header & footer.'); }
    }, [files]);

    // State for active page (shared between preview and pages panel)
    const [activePage, setActivePage] = useState<number>(1);

    const pagesPanelContent = (
        <div className="p-3 space-y-3">
            {/* Page thumbnails for mobile */}
            {files.length > 0 && Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                // ... inside pagesPanelContent
                <div
                    key={pageNum}
                    className="group cursor-pointer"
                    onClick={() => setActivePage(pageNum)}
                >
                    <div className={`transition-all rounded flex justify-center ${pageNum === activePage
                        ? ''
                        : 'hover:opacity-80'
                        }`}>
                        <PdfPageCard
                            pageNumber={pageNum}
                            file={files[0]}
                            pageIndex={pageNum - 1}
                            isSelected={pageNum === activePage}
                            rotation={0}
                        />
                    </div>
                    <div className={`text-center text-xs font-medium mt-1.5 ${pageNum === activePage ? 'text-brand-blue-600 font-semibold' : 'text-gray-600'
                        }`}>
                        Page {pageNum}
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <main className="flex-grow flex min-h-0">
            <HeaderFooterPreview
                files={files}
                onAddMoreFiles={onAddMoreFiles}
                totalPages={totalPages}
                options={options}
                setOptions={setOptions}
                activePage={activePage}
                setActivePage={setActivePage}
            />
            <HeaderFooterSettings
                options={options}
                setOptions={setOptions}
                fileCount={files.length}
                totalPages={totalPages}
                onApply={applyHeaderFooter}
                pagesPanelContent={pagesPanelContent}
            />
        </main>
    );
};

// Main Component
const HeaderFooterTool: React.FC = () => {
    const [files, setFiles] = useState<File[]>([]);
    const handleFilesSelect = useCallback((selectedFiles: FileList) => { setFiles(prev => [...prev, ...Array.from(selectedFiles)]); }, []);
    const handleRemoveFile = useCallback((fileToRemove: File) => { setFiles(prev => prev.filter(file => file !== fileToRemove)); }, []);
    const handleAddMoreFiles = useCallback((addedFiles: FileList) => { setFiles(prev => [...prev, ...Array.from(addedFiles)]); }, []);

    if (files.length === 0) {
        return (
            <div className="flex flex-col h-full bg-gray-50 font-sans">
                <PdfUploadHero
                    onFilesSelect={handleFilesSelect}
                    title={hero.title}
                    description={hero.description}
                    accept={hero.accept}
                    multiple={hero.multiple}
                    icon={<PanelTop className="h-6 w-6 mr-3" />}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-hidden font-sans">
            <HeaderFooterToolLayout files={files} onRemoveFile={handleRemoveFile} onAddMoreFiles={handleAddMoreFiles} />
        </div>
    );
};

export default HeaderFooterTool;


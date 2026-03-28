
import React, { useState, useEffect, useRef, useCallback } from 'react';

import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import * as pdfjsLib from 'pdfjs-dist';
import {
    Crop as CropIcon,
    ArrowRight,
    RefreshCw,
    AlertCircle,
    Settings,
    Maximize2,
    Minimize2,
    Square,
    FileText,
    Scissors,
    Check
} from 'lucide-react';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { PdfUploadHero } from '../shared/PdfUploadHero';
import { PdfPageCard } from '../shared/PdfPageCard';
import { toast } from 'sonner';
import { MobileLayout } from '../shared/MobileLayout';
import { ToolCTAs } from '../shared/ToolCTAs';

// Set up PDF.js worker
if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;
}

// Crop Presets - Industry standard crop options
const CROP_PRESETS = [
    {
        id: 'custom',
        name: 'Custom',
        icon: <Scissors className="w-4 h-4" />,
        crop: null, // User draws their own
    },
    {
        id: 'remove-margins',
        name: 'Auto Remove Margins',
        icon: <Minimize2 className="w-4 h-4" />,
        crop: { unit: '%' as const, x: 5, y: 5, width: 90, height: 90 },
    },
    {
        id: 'center-content',
        name: 'Center Content',
        icon: <Square className="w-4 h-4" />,
        crop: { unit: '%' as const, x: 10, y: 10, width: 80, height: 80 },
    },
    {
        id: 'letterhead',
        name: 'Remove Header',
        icon: <FileText className="w-4 h-4" />,
        crop: { unit: '%' as const, x: 0, y: 15, width: 100, height: 85 },
    },
    {
        id: 'footer',
        name: 'Remove Footer',
        icon: <FileText className="w-4 h-4" />,
        crop: { unit: '%' as const, x: 0, y: 0, width: 100, height: 90 },
    },
];

// Page Thumbnail Component for Left Sidebar
const PageThumbnail: React.FC<{
    pageNumber: number;
    file: File;
    isActive: boolean;
    onClick: () => void;
}> = React.memo(({ pageNumber, file, isActive, onClick }) => {
    return (
        <div onClick={onClick} className="group cursor-pointer transition-all duration-200">
            <div className={`overflow-hidden transition-all ${isActive
                ? 'ring-2 ring-brand-blue-500 shadow-md'
                : 'hover:ring-1 hover:ring-gray-300'
                }`}>
                <PdfPageCard
                    pageNumber={pageNumber}
                    file={file}
                    pageIndex={pageNumber - 1}
                    isSelected={false}
                    onClick={onClick}
                    rotation={0}
                />
            </div>
            <div className={`text-center text-xs font-medium mt-1.5 transition-colors ${isActive ? 'text-brand-blue-600 font-semibold' : 'text-gray-500'
                }`}>
                {pageNumber}
            </div>
        </div>
    );
});

const CropPDFTool: React.FC = () => {
    // State
    const [activeFile, setActiveFile] = useState<File | null>(null);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [pageNumbers, setPageNumbers] = useState<number[]>([]);
    const [activePage, setActivePage] = useState<number>(1);
    const [scale, setScale] = useState(1);
    const [crop, setCrop] = useState<Crop>();
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [applyToAll, setApplyToAll] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPreset, setSelectedPreset] = useState<string>('custom');
    const [showPageDropdown, setShowPageDropdown] = useState(false);

    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef<number>();

    // Load PDF Document
    useEffect(() => {
        const loadPdf = async () => {
            if (!activeFile) return;

            setIsLoading(true);
            setError(null);
            try {
                const arrayBuffer = await activeFile.arrayBuffer();
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;
                setPdfDoc(pdf);
                setPageNumbers(Array.from({ length: pdf.numPages }, (_, i) => i + 1));
                setActivePage(1);
                // Set default to CUSTOM (freehand) instead of preset
                setSelectedPreset('custom');
                setCrop(undefined);
            } catch (err) {
                console.error('Error loading PDF:', err);
                setError('Failed to load PDF file.');
                toast.error('Failed to load PDF file.');
            } finally {
                setIsLoading(false);
            }
        };

        loadPdf();
    }, [activeFile]);

    // Render active page
    useEffect(() => {
        const renderPage = async () => {
            if (!pdfDoc || !canvasRef.current || !previewContainerRef.current) return;

            try {
                const page = await pdfDoc.getPage(activePage);
                const canvas = canvasRef.current;
                const container = previewContainerRef.current;

                // Calculate scale to fit container while maintaining aspect ratio
                // Always fit the entire page in viewport (no parts cut off)
                const isMobile = window.innerWidth < 768;
                const padding = isMobile ? 16 : 40; // 16px on mobile, 40px on desktop
                const containerWidth = container.clientWidth - padding;
                const containerHeight = container.clientHeight - padding;

                const viewport = page.getViewport({ scale: 1 });
                const scaleX = containerWidth / viewport.width;
                const scaleY = containerHeight / viewport.height;

                // Always use the smaller scale to ensure entire page fits
                // Use 15% reduction to ensure all corners visible on all page sizes
                const newScale = Math.min(scaleX, scaleY) * 0.85;

                setScale(newScale);

                const scaledViewport = page.getViewport({ scale: newScale });
                const ctx = canvas.getContext('2d');

                if (ctx) {
                    // Clear any previous content
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    // Set new dimensions
                    canvas.width = scaledViewport.width;
                    canvas.height = scaledViewport.height;

                    // Render the page
                    await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
                }
            } catch (e) {
                console.error(`Error rendering page ${activePage}:`, e);
            }
        };

        renderPage();
    }, [pdfDoc, activePage]);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            // Trigger re-render on resize
            if (pdfDoc && activePage) {
                const renderPage = async () => {
                    if (!canvasRef.current || !previewContainerRef.current) return;

                    const page = await pdfDoc.getPage(activePage);
                    const canvas = canvasRef.current;
                    const container = previewContainerRef.current;

                    const containerWidth = container.clientWidth - 40;
                    const containerHeight = container.clientHeight - 40;

                    // Use same improved scaling logic
                    const isMobile = window.innerWidth < 768;
                    const padding = isMobile ? 16 : 40;
                    const adjustedWidth = container.clientWidth - padding;
                    const adjustedHeight = container.clientHeight - padding;

                    const viewport = page.getViewport({ scale: 1 });
                    const scaleX = adjustedWidth / viewport.width;
                    const scaleY = adjustedHeight / viewport.height;

                    // Always use the smaller scale to ensure entire page fits
                    // Add 10% reduction to ensure all corners are visible
                    const newScale = Math.min(scaleX, scaleY) * 0.85;

                    setScale(newScale);

                    const scaledViewport = page.getViewport({ scale: newScale });
                    const ctx = canvas.getContext('2d');

                    if (ctx) {
                        // Clear any previous content
                        ctx.clearRect(0, 0, canvas.width, canvas.height);

                        // Set new dimensions
                        canvas.width = scaledViewport.width;
                        canvas.height = scaledViewport.height;

                        // Render the page
                        await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
                    }
                };
                renderPage();
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [pdfDoc, activePage]);

    // Cleanup RAF on unmount
    useEffect(() => {
        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, []);

    // Handle Preset Selection
    const handlePresetSelect = (presetId: string) => {
        setSelectedPreset(presetId);
        const preset = CROP_PRESETS.find(p => p.id === presetId);
        if (preset?.crop) {
            setCrop(preset.crop);
        } else {
            // Custom - let user draw
            setCrop(undefined);
        }
    };

    // Handle Crop Logic
    const handleCrop = async () => {
        if (!activeFile || !crop || !pdfDoc) {
            toast.error('Please select a crop area first.');
            return;
        }

        setIsProcessing(true);
        toast.loading('Cropping PDF...', { id: 'crop-progress' });

        try {
            const { PDFDocument } = await import('pdf-lib');
            const arrayBuffer = await activeFile.arrayBuffer();
            const pdf = await PDFDocument.load(arrayBuffer);
            const pages = pdf.getPages();

            // Convert Visual Selection to PDF Points
            const page = await pdfDoc.getPage(activePage);
            const viewport = page.getViewport({ scale });
            const { width: pdfPageWidth, height: pdfPageHeight } = pages[activePage - 1].getSize();

            const ratioX = pdfPageWidth / viewport.width;
            const ratioY = pdfPageHeight / viewport.height;

            const cropX = crop.x * ratioX;
            const cropY = (viewport.height - crop.y - crop.height) * ratioY; // Flip Y axis
            const cropWidth = crop.width * ratioX;
            const cropHeight = crop.height * ratioY;

            // Apply to pages
            const pagesToProcess = applyToAll ? pages : [pages[activePage - 1]];

            pagesToProcess.forEach(p => {
                p.setCropBox(cropX, cropY, cropWidth, cropHeight);
                p.setMediaBox(cropX, cropY, cropWidth, cropHeight);
            });

            // Save and Download
            const pdfBytes = await pdf.save();
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = activeFile.name.replace('.pdf', '-cropped.pdf');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success('PDF cropped successfully!', { id: 'crop-progress' });

        } catch (err) {
            console.error('Error cropping PDF:', err);
            setError('Failed to crop PDF. Please try again.');
            toast.error('Failed to crop PDF. Please try again.', { id: 'crop-progress' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = () => {
        setCrop(undefined);
        setSelectedPreset('custom');
    };

    // Upload View
    if (!activeFile) {
        return (
            <PdfUploadHero
                onFilesSelect={(files) => {
                    if (files.length > 0) setActiveFile(files[0]);
                }}
                title="Crop PDF"
                description="Remove margins, trim pages, and focus on what matters."
                icon={<CropIcon className="h-6 w-6 mr-3" />}
            />
        );
    }

    // Use 'any' cast workaround for ReactCrop type issue
    const ReactCropComponent = ReactCrop as any;

    // Main Tool View - 3 Column Layout
    return (
        <>
            {/* Performance optimizations for ReactCrop */}
            <style>{`
                .ReactCrop {
                    will-change: transform;
                    transform: translate3d(0, 0, 0);
                }
                .ReactCrop__crop-selection {
                    will-change: transform;
                    transform: translate3d(0, 0, 0);
                    transition: none !important;
                }
                .ReactCrop__drag-handle {
                    will-change: transform;
                    transform: translate3d(0, 0, 0);
                }
            `}</style>

            <div className="flex flex-col h-full bg-gray-50 overflow-hidden font-sans">
                <main className="flex-grow flex min-h-0">
                    {/* Left Sidebar - Page Thumbnails - Hidden on mobile */}
                    <aside className="hidden md:flex w-48 flex-shrink-0 bg-white border-r border-gray-200 flex-col shadow-sm">
                        <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Pages</h3>
                            <p className="text-xs text-gray-500 mt-0.5">{pageNumbers.length} total</p>
                        </div>

                        <div className="flex-grow overflow-y-auto p-3 space-y-3 custom-scrollbar">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <LoadingSpinner />
                                </div>
                            ) : (
                                pageNumbers.map(pageNum => (
                                    <PageThumbnail
                                        key={pageNum}
                                        pageNumber={pageNum}
                                        file={activeFile}
                                        isActive={pageNum === activePage}
                                        onClick={() => setActivePage(pageNum)}
                                    />
                                ))
                            )}
                        </div>
                    </aside>

                    {/* Center - Canvas Area - FULL HEIGHT from header */}
                    <div
                        ref={previewContainerRef}
                        className="flex-grow flex bg-gray-100 relative overflow-auto"
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center w-full h-full">
                                <LoadingSpinner />
                            </div>
                        ) : (
                            <div className="w-full h-full overflow-auto flex items-start justify-center p-4 md:p-8">
                                <ReactCropComponent
                                    key={`crop-${activePage}`}
                                    crop={crop}
                                    onChange={(c: any) => {
                                        // Use RAF for smoother updates
                                        if (rafRef.current) {
                                            cancelAnimationFrame(rafRef.current);
                                        }
                                        rafRef.current = requestAnimationFrame(() => {
                                            setCrop(c);
                                        });
                                    }}
                                    className="shadow-2xl overflow-hidden"
                                    style={{
                                        touchAction: 'none',
                                        willChange: 'transform', // GPU acceleration hint
                                        transform: 'translate3d(0, 0, 0)', // Force GPU layer
                                    }}
                                >
                                    <canvas
                                        ref={canvasRef}
                                        className="block bg-white"
                                        style={{
                                            willChange: 'auto',
                                            imageRendering: 'crisp-edges', // Sharper rendering
                                        }}
                                    />
                                </ReactCropComponent>
                            </div>
                        )}
                    </div>

                    {/* Mobile Layout - Settings panel, floating button, action button */}
                    <MobileLayout
                        settingsTitle="Crop Options"
                        settingsContent={
                            <div className="p-4 space-y-3">
                                <div className="bg-gradient-to-br from-brand-blue-50 to-indigo-50 border border-brand-blue-200 rounded-lg p-2.5">
                                    <div className="flex items-start gap-2">
                                        <div className="p-1.5 bg-white rounded-lg text-brand-blue-600">
                                            <CropIcon className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-brand-blue-900 text-xs mb-0.5">How to Crop</h3>
                                            <p className="text-[11px] text-brand-blue-700 leading-snug">Choose preset or draw custom area</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Crop Presets</label>
                                    <div className="space-y-1.5">
                                        {CROP_PRESETS.map((preset) => (
                                            <button key={preset.id} onClick={() => handlePresetSelect(preset.id)} className={`w-full flex items-center gap-2 p-2 rounded-lg border transition-all duration-200 text-left min-h-[48px] ${selectedPreset === preset.id ? 'bg-brand-blue-50 border-brand-blue-500' : 'bg-white border-gray-200  hover:border-brand-blue-300'}`}>
                                                <div className={`p-1.5 rounded ${selectedPreset === preset.id ? 'bg-brand-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{preset.icon}</div>
                                                <div className="flex-1 min-w-0"><h4 className={`text-xs font-semibold ${selectedPreset === preset.id ? 'text-brand-blue-900' : 'text-gray-800'}`}>{preset.name}</h4></div>
                                                {selectedPreset === preset.id && <Check className="w-3.5 h-3.5 text-brand-blue-600 flex-shrink-0" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-gray-200">
                                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Application</label>
                                    <div className="flex items-center justify-between p-2.5 border-2 border-gray-200 rounded-lg hover:border-brand-blue-300 transition-all cursor-pointer bg-white min-h-[48px]" onClick={() => setApplyToAll(!applyToAll)}>
                                        <div className="flex-1"><label className="text-xs font-semibold text-gray-800 cursor-pointer block">Apply to all pages</label></div>
                                        <div className={`w-11 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${applyToAll ? 'bg-brand-blue-600' : 'bg-gray-300'}`}>
                                            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${applyToAll ? 'translate-x-5' : ''}`}></div>
                                        </div>
                                    </div>
                                </div>

                                <button onClick={handleReset} disabled={!crop} className="w-full flex items-center justify-center px-3 py-2 border-2 border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all min-h-[48px]">
                                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reset Selection
                                </button>

                                {error && (
                                    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-2 flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-red-700 font-medium">{error}</p>
                                    </div>
                                )}
                            </div>
                        }
                        aboveActionContent={
                            pageNumbers.length > 1 ? (
                                <div className="flex items-center justify-center gap-2 relative">
                                    <button
                                        onClick={() => setActivePage(Math.max(1, activePage - 1))}
                                        disabled={activePage === 1}
                                        className="flex items-center gap-1 px-3 py-2 bg-brand-blue-100 text-brand-blue-700 font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all text-sm"
                                    >
                                        ← Previous
                                    </button>

                                    {/* Page selector with dropdown */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowPageDropdown(!showPageDropdown)}
                                            className="px-3 py-1.5 bg-gray-100 rounded-lg border border-gray-200 hover:border-brand-blue-300 active:bg-gray-200 transition-all min-w-[120px]"
                                        >
                                            <span className="text-sm font-medium text-gray-700">Page {activePage} / {pageNumbers.length}</span>
                                        </button>

                                        {/* Dropdown menu */}
                                        {showPageDropdown && (
                                            <>
                                                {/* Backdrop */}
                                                <div
                                                    className="fixed inset-0 z-40"
                                                    onClick={() => setShowPageDropdown(false)}
                                                />

                                                {/* Dropdown list */}
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200 origin-bottom">
                                                    <div className="p-2 space-y-1">
                                                        {pageNumbers.map((pageNum) => (
                                                            <button
                                                                key={pageNum}
                                                                onClick={() => {
                                                                    setActivePage(pageNum);
                                                                    setShowPageDropdown(false);
                                                                }}
                                                                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${pageNum === activePage
                                                                    ? 'bg-brand-blue-100 text-brand-blue-700'
                                                                    : 'text-gray-700 hover:bg-gray-100'
                                                                    }`}
                                                            >
                                                                Page {pageNum}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => setActivePage(Math.min(pageNumbers.length, activePage + 1))}
                                        disabled={activePage === pageNumbers.length}
                                        className="flex items-center gap-1 px-3 py-2 bg-brand-blue-100 text-brand-blue-700 font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all text-sm"
                                    >
                                        Next →
                                    </button>
                                </div>
                            ) : undefined
                        }
                        actionButton={{
                            label: 'Crop PDF',
                            onClick: handleCrop,
                            disabled: !crop,
                            isProcessing: isProcessing,
                            processingText: 'Processing...'
                        }}
                    >
                        <></>
                    </MobileLayout>

                    {/* Right Sidebar - Crop Options - hidden on mobile */}
                    <aside className="hidden md:flex w-96 flex-shrink-0 bg-white border-l border-gray-200 flex-col h-full shadow-lg z-20">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                                <Settings className="w-4 h-4 text-brand-blue-600" />
                                Crop Options
                            </h2>
                        </div>

                        <div className="flex-grow p-4 space-y-3 overflow-hidden flex flex-col">
                            {/* Info Box - Compact */}
                            <div className="bg-gradient-to-br from-brand-blue-50 to-indigo-50 border border-brand-blue-200 rounded-lg p-2.5 flex-shrink-0">
                                <div className="flex items-start gap-2">
                                    <div className="p-1.5 bg-white rounded-lg text-brand-blue-600">
                                        <CropIcon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-brand-blue-900 text-xs mb-0.5">How to Crop</h3>
                                        <p className="text-[11px] text-brand-blue-700 leading-snug">
                                            Choose preset or draw custom area
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Crop Presets - Compact */}
                            <div className="space-y-2 flex-shrink-0">
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                                    Crop Presets
                                </label>
                                <div className="space-y-1.5">
                                    {CROP_PRESETS.map((preset) => (
                                        <button
                                            key={preset.id}
                                            onClick={() => handlePresetSelect(preset.id)}
                                            className={`
                                            w-full flex items-center gap-2 p-2 rounded-lg border transition-all duration-200 text-left
                                            ${selectedPreset === preset.id
                                                    ? 'bg-brand-blue-50 border-brand-blue-500'
                                                    : 'bg-white border-gray-200 hover:border-brand-blue-300'
                                                }
                                        `}
                                        >
                                            <div className={`p-1.5 rounded ${selectedPreset === preset.id ? 'bg-brand-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                                {preset.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`text-xs font-semibold ${selectedPreset === preset.id ? 'text-brand-blue-900' : 'text-gray-800'}`}>
                                                    {preset.name}
                                                </h4>
                                            </div>
                                            {selectedPreset === preset.id && (
                                                <Check className="w-3.5 h-3.5 text-brand-blue-600 flex-shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Apply to All Toggle - Compact */}
                            <div className="space-y-2 pt-2 border-t border-gray-200 flex-shrink-0">
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                                    Application
                                </label>
                                <div
                                    className="flex items-center justify-between p-2.5 border-2 border-gray-200 rounded-lg hover:border-brand-blue-300 transition-all cursor-pointer bg-white"
                                    onClick={() => setApplyToAll(!applyToAll)}
                                >
                                    <div className="flex-1">
                                        <label className="text-xs font-semibold text-gray-800 cursor-pointer block">
                                            Apply to all pages
                                        </label>
                                    </div>
                                    <div className={`w-11 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${applyToAll ? 'bg-brand-blue-600' : 'bg-gray-300'}`}>
                                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${applyToAll ? 'translate-x-5' : ''}`}></div>
                                    </div>
                                </div>
                            </div>

                            {/* Reset Button - Compact */}
                            <button
                                onClick={handleReset}
                                disabled={!crop}
                                className="w-full flex items-center justify-center px-3 py-2 border-2 border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
                            >
                                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                                Reset Selection
                            </button>

                            {error && (
                                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-2 flex items-start gap-2 flex-shrink-0">
                                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-red-700 font-medium">{error}</p>
                                </div>
                            )}
                        </div>

                        <div className="p-5 border-t border-gray-200 bg-gray-50 mt-auto">
                            <button
                                onClick={handleCrop}
                                disabled={!crop || isProcessing}
                                className="relative overflow-hidden w-full text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center text-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-blue-700 hover:shadow-xl"
                                style={{
                                    background: isProcessing ? '#e5e7eb' : '#2563eb'
                                }}
                            >
                                {/* Progress fill animation */}
                                {isProcessing && (
                                    <div
                                        className="absolute inset-0 bg-brand-blue-600 transition-all duration-300 ease-out"
                                        style={{ width: '100%' }}
                                    />
                                )}

                                {/* Button content */}
                                <span className="relative z-10 flex items-center">
                                    {isProcessing ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                            Cropping...
                                        </>
                                    ) : (
                                        <>
                                            Crop PDF
                                            <ArrowRight className="w-5 h-5 ml-2" />
                                        </>
                                    )}
                                </span>
                            </button>

                            {/* Bookmark and Share CTAs */}
                            <ToolCTAs variant="sidebar" />
                        </div>
                    </aside>
                </main>
            </div>
        </>
    );
};

export default CropPDFTool;


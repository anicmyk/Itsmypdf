import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb } from 'pdf-lib';
import { PdfUploadHero } from '../shared/PdfUploadHero';
import { PdfPageCard } from '../shared/PdfPageCard';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { MobileLayout } from '../shared/MobileLayout';
import { ToolCTAs } from '../shared/ToolCTAs';
import { toast } from 'sonner';
import { TOOL_HERO_UI } from '@/lib/toolHeroConfig';
import {
    Palette,
    ArrowRight,
    RefreshCw,
    AlertCircle,
    Settings,
    Check,
    Image as ImageIcon,
    Type,
    Upload,
    Move,
    Trash2
} from 'lucide-react';

// Set up PDF.js worker
if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;
}

const hero = TOOL_HERO_UI['add-background-to-pdf'];

// Background Type
// Background Type (UI Mode)
type BackgroundType = 'color' | 'image';

// Image Layer Interface
interface ImageLayer {
    id: string;
    file: File;
    previewUrl: string;
    width: number;
    height: number;
    x: number;
    y: number;
    scale: number;
    opacity: number;
    name: string;
}

// Color Presets
const COLOR_PRESETS = [
    { id: 'cream', name: 'Subtle Cream', color: '#FFF8E7', opacity: 0.3 },
    { id: 'blue', name: 'Light Blue', color: '#E3F2FD', opacity: 0.4 },
    { id: 'green', name: 'Soft Green', color: '#E8F5E9', opacity: 0.35 },
    { id: 'yellow', name: 'Pale Yellow', color: '#FFFDE7', opacity: 0.4 },
    { id: 'gray', name: 'Light Gray', color: '#F5F5F5', opacity: 0.5 },
];

// Color conversion utilities
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255,
        }
        : { r: 1, g: 1, b: 1 };
};

// Page Thumbnail Component
const PageThumbnail: React.FC<{
    pageNumber: number;
    file: File;
    isActive: boolean;
    onClick: () => void;
}> = React.memo(({ pageNumber, file, isActive, onClick }) => {
    return (
        <div onClick={onClick} className="group cursor-pointer transition-all duration-200">
            <div
                className={`overflow-hidden transition-all ${isActive
                    ? 'ring-2 ring-brand-blue-500 shadow-md'
                    : 'hover:ring-1 hover:ring-gray-300'
                    }`}
            >
                <PdfPageCard
                    pageNumber={pageNumber}
                    file={file}
                    pageIndex={pageNumber - 1}
                    isSelected={false}
                    onClick={onClick}
                    rotation={0}
                />
            </div>
            <div
                className={`text-center text-xs font-medium mt-1.5 transition-colors ${isActive ? 'text-brand-blue-600 font-semibold' : 'text-gray-500'
                    }`}
            >
                {pageNumber}
            </div>
        </div>
    );
});

const AddBackgroundTool: React.FC = () => {
    // State
    const [activeFile, setActiveFile] = useState<File | null>(null);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [pageNumbers, setPageNumbers] = useState<number[]>([]);
    const [activePage, setActivePage] = useState<number>(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Background options
    const [backgroundType, setBackgroundType] = useState<BackgroundType>('color');
    const [backgroundColor, setBackgroundColor] = useState<string>('#FFF8E7');
    const [opacity, setOpacity] = useState<number>(1);
    const [applyToAll, setApplyToAll] = useState(true);

    // Image Layers State
    const [layers, setLayers] = useState<ImageLayer[]>([]);
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

    // Helpers to access selected layer safely
    const selectedLayer = layers.find(l => l.id === selectedLayerId) || null;

    // Transform controls
    const [showTransformControls, setShowTransformControls] = useState(true);
    const [transformMode, setTransformMode] = useState<'move' | 'resize' | null>(null);
    const [activeHandle, setActiveHandle] = useState<string | null>(null);
    const [resizeStart, setResizeStart] = useState<{
        mouseX: number;
        mouseY: number;
        scale: number;
        position: { x: number; y: number };
    } | null>(null);

    // Refs
    const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
    const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const loadedImageRef = useRef<HTMLImageElement | null>(null);
    const renderTaskRef = useRef<any>(null);

    // Load and cache the background image
    // Load images when they are added to layers (Pre-loading logic moved to handleImageUpload or render)
    // Actually, we use previewUrl which is synchronous. We just need to ensure HTMLImageElements are created for rendering.
    // For React canvas rendering, we usually create new Image() objects inside the render loop or cache them.
    // Let's implement a simple cache to avoid reloading images every frame.
    const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

    useEffect(() => {
        // Preload images into cache specifically when layers change
        layers.forEach(layer => {
            if (!imageCache.current.has(layer.id)) {
                const img = new Image();
                img.src = layer.previewUrl;
                imageCache.current.set(layer.id, img);
            }
        });
        // Cleanup removed layers
        const activeIds = new Set(layers.map(l => l.id));
        for (const id of imageCache.current.keys()) {
            if (!activeIds.has(id)) {
                imageCache.current.delete(id);
            }
        }
    }, [layers]);

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

    // Render PDF Page (Static Layer)
    const renderPdf = useCallback(async () => {
        if (!pdfDoc || !pdfCanvasRef.current || !backgroundCanvasRef.current || !overlayCanvasRef.current || !previewContainerRef.current) return;

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
            const bgCanvas = backgroundCanvasRef.current;
            const overlayCanvas = overlayCanvasRef.current;
            const container = previewContainerRef.current;

            // Calculate scale to fit container
            const containerWidth = container.clientWidth - 40;
            const containerHeight = container.clientHeight - 40;

            const viewport = page.getViewport({ scale: 1 });
            const scaleX = containerWidth / viewport.width;
            const scaleY = containerHeight / viewport.height;
            const scale = Math.min(scaleX, scaleY, 1.5);

            const scaledViewport = page.getViewport({ scale });

            // Set dimensions for all canvases
            [pdfCanvas, bgCanvas, overlayCanvas].forEach(canvas => {
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

            // Trigger background render to ensure it matches new size
            renderBackground();
        } catch (e: any) {
            if (e?.name === 'RenderingCancelledException') return;
            console.error(`Error rendering page ${activePage}:`, e);
        }
    }, [pdfDoc, activePage]);

    // Render Background (Interactive Layer - Sync & Fast)
    const renderBackground = useCallback(() => {
        if (!backgroundCanvasRef.current) return;
        const ctx = backgroundCanvasRef.current.getContext('2d', { alpha: false });
        if (!ctx) return;

        const canvas = backgroundCanvasRef.current;

        // Clear canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 1. Draw Background Color (Base)
        if (backgroundColor) {
            ctx.fillStyle = backgroundColor;
            ctx.globalAlpha = opacity; // Base opacity (global setting)
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1;
        }

        // 2. Draw Image Layers
        layers.forEach(layer => {
            const img = imageCache.current.get(layer.id);
            if (img) {
                ctx.globalAlpha = layer.opacity;

                // Calculate dimensions
                // layer.scale is relative to canvas width? Or original size?
                // Let's stick to: layer.scale is simplified multiplier.
                // Re-using previous logic: "imgWidth = canvas.width * imageScale"
                // This means scale 1 = full width.
                const imgWidth = canvas.width * layer.scale;
                const imgHeight = (img.height / img.width) * imgWidth;

                const x = (canvas.width - imgWidth) / 2 + layer.x;
                const y = (canvas.height - imgHeight) / 2 + layer.y;

                ctx.drawImage(img, x, y, imgWidth, imgHeight);
            }
        });
        ctx.globalAlpha = 1;

    }, [layers, backgroundColor, opacity]);

    // Effect for PDF Rendering (Only when doc/page changes)
    useEffect(() => {
        renderPdf();
    }, [renderPdf]);

    // Effect for Background Rendering (Interactive changes)
    useEffect(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        animationFrameRef.current = requestAnimationFrame(() => {
            renderBackground();
        });
        // Force redraw of transform controls when background moves
        drawTransformControls();
    }, [renderBackground]);

    /*
    // Render page with background preview (optimized, no flickering)
    const renderPage_LEGACY = useCallback(async () => {
        if (!pdfDoc || !canvasRef.current || !previewContainerRef.current) return;

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
            const canvas = canvasRef.current;
            const container = previewContainerRef.current;

            // Calculate scale to fit container
            const containerWidth = container.clientWidth - 40;
            const containerHeight = container.clientHeight - 40;

            const viewport = page.getViewport({ scale: 1 });
            const scaleX = containerWidth / viewport.width;
            const scaleY = containerHeight / viewport.height;
            const scale = Math.min(scaleX, scaleY, 1.5);

            const scaledViewport = page.getViewport({ scale });
            const ctx = canvas.getContext('2d', { alpha: false });

            if (ctx) {
                canvas.width = scaledViewport.width;
                canvas.height = scaledViewport.height;

                // Clear canvas
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw background first
                if (backgroundType === 'image' && loadedImageRef.current) {
                    // Draw image background using cached image
                    const img = loadedImageRef.current;

                    ctx.globalAlpha = opacity;

                    // Calculate image dimensions with scale
                    const imgWidth = canvas.width * imageScale;
                    const imgHeight = (img.height / img.width) * imgWidth;

                    // Calculate position (centered + offset)
                    const x = (canvas.width - imgWidth) / 2 + imagePosition.x;
                    const y = (canvas.height - imgHeight) / 2 + imagePosition.y;

                    ctx.drawImage(img, x, y, imgWidth, imgHeight);
                    ctx.globalAlpha = 1;
                } else if (backgroundType === 'color') {
                    // Draw color background
                    ctx.fillStyle = backgroundColor;
                    ctx.globalAlpha = opacity;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.globalAlpha = 1;
                }

                // Render PDF page on top with multiply blending
                // This ensures the white background of the PDF becomes transparent
                // so the user's custom background shows through
                ctx.globalCompositeOperation = 'multiply';

                const renderTask = page.render({ canvasContext: ctx, viewport: scaledViewport });
                renderTaskRef.current = renderTask;
                await renderTask.promise;
                renderTaskRef.current = null;

                ctx.globalCompositeOperation = 'source-over';
            }
        } catch (e: any) {
            // Ignore rendering cancelled exceptions
            if (e?.name === 'RenderingCancelledException') {
                return;
            }
            console.error(`Error rendering page ${activePage}:`, e);
        }
    }, [pdfDoc, activePage, backgroundColor, opacity, backgroundType, imageLoaded, imageScale, imagePosition]);
    */



    // Transform control helper functions
    const calculateTransformBounds = useCallback(() => {
        if (!selectedLayer || !backgroundCanvasRef.current) return null;

        const canvas = backgroundCanvasRef.current;
        const img = imageCache.current.get(selectedLayer.id);

        if (!img) return null;

        const imgWidth = canvas.width * selectedLayer.scale;
        const imgHeight = (img.height / img.width) * imgWidth;
        const x = (canvas.width - imgWidth) / 2 + selectedLayer.x;
        const y = (canvas.height - imgHeight) / 2 + selectedLayer.y;

        return { x, y, width: imgWidth, height: imgHeight };
    }, [selectedLayer]);

    const detectHandle = useCallback((mouseX: number, mouseY: number) => {
        const bounds = calculateTransformBounds();

        // Handle Logic (Resize) - Priority
        if (bounds) {
            const handleSize = 12;
            const handles = {
                'tl': { x: bounds.x, y: bounds.y, cursor: 'nwse-resize' },
                'tr': { x: bounds.x + bounds.width, y: bounds.y, cursor: 'nesw-resize' },
                'bl': { x: bounds.x, y: bounds.y + bounds.height, cursor: 'nesw-resize' },
                'br': { x: bounds.x + bounds.width, y: bounds.y + bounds.height, cursor: 'nwse-resize' },
                't': { x: bounds.x + bounds.width / 2, y: bounds.y, cursor: 'ns-resize' },
                'r': { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2, cursor: 'ew-resize' },
                'b': { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height, cursor: 'ns-resize' },
                'l': { x: bounds.x, y: bounds.y + bounds.height / 2, cursor: 'ew-resize' },
            };

            for (const [handle, pos] of Object.entries(handles)) {
                if (Math.abs(mouseX - pos.x) < handleSize &&
                    Math.abs(mouseY - pos.y) < handleSize) {
                    return { type: 'handle', id: handle, cursor: pos.cursor };
                }
            }
            // Check if inside bounds for move (Current Selected Layer)
            if (mouseX >= bounds.x && mouseX <= bounds.x + bounds.width &&
                mouseY >= bounds.y && mouseY <= bounds.y + bounds.height) {
                return { type: 'move', id: selectedLayerId, cursor: 'move' };
            }
        }

        // Hit Selection Logic (Select other layers)
        // Iterate in reverse (Top to Bottom)
        for (let i = layers.length - 1; i >= 0; i--) {
            const layer = layers[i];
            // Skip currently selected (already checked above)
            if (layer.id === selectedLayerId) continue;

            const img = imageCache.current.get(layer.id);
            if (!img || !backgroundCanvasRef.current) continue;

            const canvas = backgroundCanvasRef.current;
            const imgWidth = canvas.width * layer.scale;
            const imgHeight = (img.height / img.width) * imgWidth;
            const x = (canvas.width - imgWidth) / 2 + layer.x;
            const y = (canvas.height - imgHeight) / 2 + layer.y;

            if (mouseX >= x && mouseX <= x + imgWidth &&
                mouseY >= y && mouseY <= y + imgHeight) {
                return { type: 'select', id: layer.id, cursor: 'pointer' };
            }
        }

        return null;
    }, [calculateTransformBounds, layers, selectedLayerId]);

    const drawTransformControls = useCallback(() => {
        if (!overlayCanvasRef.current || !backgroundCanvasRef.current) return;

        const overlay = overlayCanvasRef.current;
        const canvas = backgroundCanvasRef.current;
        const ctx = overlay.getContext('2d');

        if (!ctx) return;

        // Match overlay canvas size to main canvas (ensure sync)
        if (overlay.width !== canvas.width || overlay.height !== canvas.height) {
            overlay.width = canvas.width;
            overlay.height = canvas.height;
        }

        // Always clear overlay first
        ctx.clearRect(0, 0, overlay.width, overlay.height);

        // Validation - if shouldn't show, return (canvas is now clean)
        // "backgroundType !== 'image'" check removed because we want to allow selecting images even in color mode?
        // Actually, user wants "images not image". So we are always in "Multi-Layer" mode.
        // But let's keep the check for now if we want to hide controls.
        // Wait, if I have layers, I want to see them.
        // Let's just check if we have a selected layer.
        if (!showTransformControls || !selectedLayerId || !selectedLayer) return;

        const bounds = calculateTransformBounds();
        if (!bounds) return;

        // Draw bounding box
        ctx.strokeStyle = '#ffffff'; // White border
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]); // Dashed line
        ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        ctx.setLineDash([]); // Reset dash for handles

        // Draw handles
        const handleSize = 10;
        const handles = [
            { x: bounds.x, y: bounds.y }, // tl
            { x: bounds.x + bounds.width, y: bounds.y }, // tr
            { x: bounds.x, y: bounds.y + bounds.height }, // bl
            { x: bounds.x + bounds.width, y: bounds.y + bounds.height }, // br
            { x: bounds.x + bounds.width / 2, y: bounds.y }, // t
            { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 }, // r
            { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height }, // b
            { x: bounds.x, y: bounds.y + bounds.height / 2 }, // l
        ];

        handles.forEach(handle => {
            ctx.fillStyle = '#d1d5db'; // Gray-300
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.rect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
            ctx.fill();
            ctx.stroke();
        });
    }, [calculateTransformBounds, showTransformControls, selectedLayerId, selectedLayer]);

    // Draw transform controls whenever image changes
    useEffect(() => {
        drawTransformControls();
    }, [layers, selectedLayerId, showTransformControls, drawTransformControls]);

    // Handle Image Upload
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                const newLayer: ImageLayer = {
                    id: crypto.randomUUID(),
                    file,
                    previewUrl: url,
                    width: img.width,
                    height: img.height,
                    x: 0,
                    y: 0,
                    scale: 1,
                    opacity: 1,
                    name: `Image ${layers.length + 1}`
                };
                setLayers(prev => [...prev, newLayer]);
                setSelectedLayerId(newLayer.id);
                setBackgroundType('image'); // Switch to image tab to show layers
                toast.success('Image added successfully!');
            };
            img.src = url;
        } else {
            toast.error('Please upload a valid image file.');
        }
    };

    // Handle mouse interactions for transform controls
    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!overlayCanvasRef.current) return;

        const canvas = overlayCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const detected = detectHandle(mouseX, mouseY);

        if (detected) {
            if (detected.type === 'select') {
                // Select different layer
                setSelectedLayerId(detected.id!);
                // And start moving immediately? Standard behavior is select on down, move on drag.
                // Let's just select. User can click-drag.
                // Actually if I click 'select', I expect to be able to drag immediately usually.
                setTransformMode('move');
                const clickedLayer = layers.find(l => l.id === detected.id);
                if (clickedLayer) {
                    setDragStart({ x: mouseX - clickedLayer.x, y: mouseY - clickedLayer.y });
                }
            } else if (detected.type === 'move') {
                setTransformMode('move');
                if (selectedLayer) {
                    setDragStart({ x: mouseX - selectedLayer.x, y: mouseY - selectedLayer.y });
                }
            } else if (detected.type === 'handle') {
                setTransformMode('resize');
                setActiveHandle(detected.id!);
                if (selectedLayer) {
                    setResizeStart({
                        mouseX,
                        mouseY,
                        scale: selectedLayer.scale,
                        position: { x: selectedLayer.x, y: selectedLayer.y }
                    });
                }
            }
        } else {
            // Clicked empty space - Deselect
            setSelectedLayerId(null);
        }
    };

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!overlayCanvasRef.current) return;

        const canvas = overlayCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Update cursor based on hover
        if (!transformMode) {
            const detected = detectHandle(mouseX, mouseY);
            canvas.style.cursor = detected ? detected.cursor : 'default';
        }

        // Handle move
        if (transformMode === 'move' && dragStart && selectedLayerId) {
            setLayers(prev => prev.map(layer => {
                if (layer.id === selectedLayerId) {
                    return {
                        ...layer,
                        x: mouseX - dragStart.x,
                        y: mouseY - dragStart.y
                    };
                }
                return layer;
            }));
        }

        // Handle resize
        if (transformMode === 'resize' && activeHandle && resizeStart && selectedLayerId && overlayCanvasRef.current) {
            const dx = mouseX - resizeStart.mouseX;
            const dy = mouseY - resizeStart.mouseY;

            let scaleChange = 0;

            if (activeHandle.includes('r')) {
                scaleChange = dx / (overlayCanvasRef.current.width * resizeStart.scale);
            } else if (activeHandle.includes('l')) {
                scaleChange = -dx / (overlayCanvasRef.current.width * resizeStart.scale);
            } else if (activeHandle.includes('b')) {
                scaleChange = dy / (overlayCanvasRef.current.height * resizeStart.scale);
            } else if (activeHandle.includes('t')) {
                scaleChange = -dy / (overlayCanvasRef.current.height * resizeStart.scale);
            }

            const newScale = Math.max(0.1, Math.min(3, resizeStart.scale + scaleChange));

            setLayers(prev => prev.map(layer => {
                if (layer.id === selectedLayerId) {
                    return { ...layer, scale: newScale };
                }
                return layer;
            }));
        }
    };

    const handleCanvasMouseUp = () => {
        setTransformMode(null);
        setActiveHandle(null);
        setDragStart(null);
        setResizeStart(null);
        if (overlayCanvasRef.current) {
            overlayCanvasRef.current.style.cursor = 'default';
        }
    };

    // Handle Background Application
    const handleApplyBackground = async () => {
        if (!activeFile || !pdfDoc) {
            toast.error('Please upload a PDF file first.');
            return;
        }

        setIsProcessing(true);
        toast.loading('Adding background to PDF...', { id: 'background-progress' });

        try {
            const arrayBuffer = await activeFile.arrayBuffer();
            const pdf = await PDFDocument.load(arrayBuffer);
            const pages = pdf.getPages();

            // Apply to pages
            const pagesToProcess = applyToAll ? pages : [pages[activePage - 1]];

            // 1. Draw Background Color (Base)
            // Always draw background color if set (it acts as base)
            if (backgroundType === 'color' || backgroundType === 'image') {
                // Note: Logic allows color to be behind images.
                // Currently UI has 'backgroundType' toggle, but we want layers to be on top.
                // So we always draw background color if it's the selected mode OR if we treat it as base.
                // Let's assume Color is ALWAYS the base.
                if (backgroundColor) {
                    const rgb_color = hexToRgb(backgroundColor);

                    for (const page of pagesToProcess) {
                        const { width, height } = page.getSize();
                        page.drawRectangle({
                            x: 0,
                            y: 0,
                            width,
                            height,
                            color: rgb(rgb_color.r, rgb_color.g, rgb_color.b),
                            opacity: opacity, // Base opacity
                            borderWidth: 0,
                        });
                    }
                }
            }

            // 2. Draw Image Layers
            if (layers.length > 0) {
                // cache check
                const canvas = backgroundCanvasRef.current;
                let previewScaleRatio = 1;

                if (canvas && pages.length > 0) {
                    const activePdfPage = pages[activePage - 1];
                    const { width: previewPageWidth } = activePdfPage.getSize();
                    previewScaleRatio = canvas.width / previewPageWidth;
                }

                // Loop layers
                for (const layer of layers) {
                    const imageBytes = await layer.file.arrayBuffer();
                    let embeddedImage;

                    if (layer.file.type === 'image/png') {
                        embeddedImage = await pdf.embedPng(imageBytes);
                    } else if (layer.file.type === 'image/jpeg' || layer.file.type === 'image/jpg') {
                        embeddedImage = await pdf.embedJpg(imageBytes);
                    } else {
                        continue; // Skip
                    }

                    // Calculate Position & Scale for this layer
                    // Normalize Coordinate Systems
                    const pdfTranslateX = layer.x / previewScaleRatio;
                    const pdfTranslateY = layer.y / previewScaleRatio;

                    for (const page of pagesToProcess) {
                        const { width, height } = page.getSize();

                        const targetWidth = width * layer.scale;
                        const targetHeight = (embeddedImage.height / embeddedImage.width) * targetWidth;

                        let x = (width - targetWidth) / 2;
                        let y = (height - targetHeight) / 2;

                        x += pdfTranslateX;
                        y -= pdfTranslateY;

                        page.drawImage(embeddedImage, {
                            x,
                            y,
                            width: targetWidth,
                            height: targetHeight,
                            opacity: layer.opacity,
                        });
                    }
                }
            }

            // Save and Download
            const pdfBytes = await pdf.save();
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = activeFile.name.replace('.pdf', '-background.pdf');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success('Background added successfully!', { id: 'background-progress' });
        } catch (err) {
            console.error('Error adding background:', err);
            setError('Failed to add background. Please try again.');
            toast.error('Failed to add background. Please try again.', {
                id: 'background-progress',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = () => {
        setBackgroundType('color');
        setBackgroundColor('#FFF8E7');
        setOpacity(1);
        setLayers([]);
        setSelectedLayerId(null);
    };

    // Upload View
    if (!activeFile) {
        return (
            <PdfUploadHero
                onFilesSelect={(files) => {
                    if (files.length > 0) setActiveFile(files[0]);
                }}
                title={hero.title}
                description={hero.description}
                accept={hero.accept}
                multiple={hero.multiple}
                icon={<Palette className="h-6 w-6 mr-3" />}
            />
        );
    }

    // Extract pages panel content for mobile
    const pagesPanelContent = (
        <div className="p-3 space-y-3">
            {isLoading ? (
                <div className="flex items-center justify-center py-8">
                    <LoadingSpinner />
                </div>
            ) : (
                pageNumbers.map((pageNum) => (
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
    );

    // Extract settings content for mobile
    const settingsContent = (
        <div className="p-4 space-y-4">
            {/* Type Selection */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => setBackgroundType('color')}
                    className={`flex-1 py-3 px-2 rounded-lg border transition-all duration-200 flex flex-col items-center justify-center gap-2 text-sm font-medium relative min-h-[48px] ${backgroundType === 'color'
                        ? 'bg-brand-blue-50 border-brand-blue-500 text-brand-blue-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                >
                    {backgroundType === 'color' && (
                        <div className="absolute top-1.5 right-1.5 text-brand-blue-600">
                            <Check className="w-3.5 h-3.5" />
                        </div>
                    )}
                    <Type className="w-6 h-6" />
                    <span>Color</span>
                </button>
                <button
                    onClick={() => setBackgroundType('image')}
                    className={`flex-1 py-3 px-2 rounded-lg border transition-all duration-200 flex flex-col items-center justify-center gap-2 text-sm font-medium relative min-h-[48px] ${backgroundType === 'image'
                        ? 'bg-brand-blue-50 border-brand-blue-500 text-brand-blue-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                >
                    {backgroundType === 'image' && (
                        <div className="absolute top-1.5 right-1.5 text-brand-blue-600">
                            <Check className="w-3.5 h-3.5" />
                        </div>
                    )}
                    <ImageIcon className="w-6 h-6" />
                    <span>Image</span>
                </button>
            </div>

            {/* Color Background Options */}
            {backgroundType === 'color' && (
                <>
                    {/* Quick Presets Dropdown */}
                    <details className="group">
                        <summary className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-lg cursor-pointer transition-all border border-blue-200 min-h-[48px]">
                            <span className="text-sm font-semibold text-brand-blue-700 flex items-center gap-2">
                                ✨ Quick Presets
                                <span className="text-xs bg-white text-brand-blue-600 px-2 py-0.5 rounded-full">{COLOR_PRESETS.length} colors</span>
                            </span>
                            <svg className="w-4 h-4 text-brand-blue-600 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </summary>
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                            {COLOR_PRESETS.map((preset) => (
                                <button
                                    key={preset.id}
                                    onClick={() => {
                                        setBackgroundColor(preset.color);
                                        setOpacity(preset.opacity);
                                    }}
                                    className="w-full flex items-center gap-3 p-2.5 rounded-lg transition-all text-left bg-white hover:bg-brand-blue-50 border border-gray-200 hover:border-brand-blue-300 min-h-[48px]"
                                >
                                    <div
                                        className="w-8 h-8 rounded-md border-2 border-gray-300"
                                        style={{ backgroundColor: preset.color }}
                                    />
                                    <span className="text-sm font-medium text-gray-700">{preset.name}</span>
                                </button>
                            ))}
                        </div>
                    </details>

                    {/* Custom Color */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                            Custom Color
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={backgroundColor}
                                onChange={(e) => setBackgroundColor(e.target.value)}
                                className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                            />
                            <input
                                type="text"
                                value={backgroundColor}
                                onChange={(e) => setBackgroundColor(e.target.value)}
                                className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:border-brand-blue-500 min-h-[48px]"
                                placeholder="#FFFFFF"
                            />
                        </div>
                    </div>
                </>
            )}

            {/* Image Layer UI */}
            {backgroundType === 'image' && (
                <div className="space-y-4">
                    {/* Add New Image Button */}
                    <div className="relative group">
                        <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg"
                            onChange={handleImageUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 flex flex-col items-center justify-center text-center transition-all group-hover:border-brand-blue-500 group-hover:bg-brand-blue-50 min-h-[120px]">
                            <div className="p-2 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                                <Upload className="h-5 w-5 text-brand-blue-600" />
                            </div>
                            <p className="text-sm font-medium text-gray-700">Click to add image</p>
                            <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</p>
                        </div>
                    </div>

                    {/* Layers List */}
                    {layers.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Layers</h4>
                                <button
                                    onClick={() => setLayers([])}
                                    className="text-xs text-red-500 hover:text-red-600 hover:underline min-h-[44px] px-2"
                                >
                                    Remove all
                                </button>
                            </div>

                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                {layers.map((layer, index) => (
                                    <div
                                        key={layer.id}
                                        onClick={() => setSelectedLayerId(layer.id)}
                                        className={`
                                                     group flex items-center p-2 bg-white border rounded-md shadow-sm cursor-pointer transition-all min-h-[56px]
                                                     ${selectedLayerId === layer.id ? 'ring-2 ring-brand-blue-500 border-transparent' : 'hover:border-gray-300'}
                                                 `}
                                    >
                                        {/* Small Preview */}
                                        <div className="w-10 h-10 flex-shrink-0 bg-gray-100 rounded border border-gray-200 overflow-hidden relative">
                                            <img
                                                src={layer.previewUrl}
                                                alt="Layer preview"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>

                                        {/* Info */}
                                        <div className="ml-3 flex-grow min-w-0">
                                            <p className="text-sm font-medium text-gray-700 truncate">{layer.name}</p>
                                            <p className="text-xs text-gray-400">Layer {index + 1}</p>
                                        </div>

                                        {/* Controls */}
                                        <div className="flex items-center space-x-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setLayers(prev => prev.filter(l => l.id !== layer.id));
                                                    if (selectedLayerId === layer.id) setSelectedLayerId(null);
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
                                                title="Remove layer"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Opacity Slider - For Layers or Base */}
            <div className="space-y-2 pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        {selectedLayerId ? 'Layer Opacity' : 'Background Opacity'}
                    </label>
                    <span className="text-xs font-semibold text-brand-blue-600">
                        {selectedLayerId
                            ? Math.round((layers.find(l => l.id === selectedLayerId)?.opacity || 1) * 100)
                            : Math.round(opacity * 100)
                        }%
                    </span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={selectedLayerId
                        ? (layers.find(l => l.id === selectedLayerId)?.opacity || 1)
                        : opacity
                    }
                    onChange={(e) => {
                        const newOpacity = parseFloat(e.target.value);
                        if (selectedLayerId) {
                            setLayers(prev => prev.map(l => l.id === selectedLayerId ? { ...l, opacity: newOpacity } : l));
                        } else {
                            setOpacity(newOpacity);
                        }
                    }}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                />
            </div>

            {/* Apply to All Toggle */}
            <div className="space-y-2 pt-2 border-t border-gray-200">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    Application
                </label>
                <div
                    className="flex items-center justify-between p-2.5 border-2 border-gray-200 rounded-lg hover:border-brand-blue-300 transition-all cursor-pointer bg-white min-h-[48px]"
                    onClick={() => setApplyToAll(!applyToAll)}
                >
                    <div className="flex-1">
                        <label className="text-xs font-semibold text-gray-800 cursor-pointer block">
                            Apply to all pages
                        </label>
                    </div>
                    <div
                        className={`w-11 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${applyToAll ? 'bg-brand-blue-600' : 'bg-gray-300'
                            }`}
                    >
                        <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${applyToAll ? 'translate-x-5' : ''
                                }`}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Reset Button */}
            <button
                onClick={handleReset}
                className="w-full flex items-center justify-center px-3 py-2 border-2 border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-500 transition-all min-h-[48px]"
            >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Reset to Default
            </button>

            {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-2 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 font-medium">{error}</p>
                </div>
            )}
        </div>
    );

    // Main Tool View - 3 Column Layout
    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-hidden font-sans">
            <main className="flex-grow flex min-h-0">
                {/* Left Sidebar - Page Thumbnails - HIDDEN on mobile */}
                <aside className="hidden md:flex w-48 flex-shrink-0 bg-white border-r border-gray-200 flex-col shadow-sm">
                    <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                            Pages
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">{pageNumbers.length} total</p>
                    </div>

                    <div className="flex-grow overflow-y-auto p-3 space-y-3 custom-scrollbar">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <LoadingSpinner />
                            </div>
                        ) : (
                            pageNumbers.map((pageNum) => (
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

                {/* Center - Main Preview Area */}
                <div
                    ref={previewContainerRef}
                    className="flex-grow flex flex-col items-center justify-center bg-gray-100 p-4 pb-28 md:p-8 md:pb-8 relative"
                >
                    {isLoading ? (
                        <div className="flex items-center justify-center w-full h-full">
                            <LoadingSpinner />
                        </div>
                    ) : (
                        <div className="relative flex items-center justify-center w-full h-full">
                            <div className="relative inline-block shadow-2xl">
                                {/* Layer 1: Background (Sync, Layout Anchor) */}
                                <canvas
                                    ref={backgroundCanvasRef}
                                    className="block"
                                />

                                {/* Layer 2: PDF Page (Static, Multiply Blend) */}
                                <canvas
                                    ref={pdfCanvasRef}
                                    className="absolute top-0 left-0 w-full h-full pointer-events-none mix-blend-multiply"
                                />

                                {/* Layer 3: Controls (Interactive) */}
                                <canvas
                                    ref={overlayCanvasRef}
                                    className="absolute top-0 left-0 w-full h-full"
                                    onMouseDown={handleCanvasMouseDown}
                                    onMouseMove={handleCanvasMouseMove}
                                    onMouseUp={handleCanvasMouseUp}
                                    onMouseLeave={handleCanvasMouseUp}
                                />
                            </div>
                            {backgroundType === 'image' && layers.length > 0 && (
                                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/75 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                                    <Move className="w-4 h-4" />
                                    Drag corners to resize • Drag image to move
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Mobile Layout - Settings panel, floating buttons, action button */}
                <MobileLayout
                    settingsTitle="Background Options"
                    settingsContent={settingsContent}
                    pagesPanel={{
                        content: pagesPanelContent,
                        title: 'Pages'
                    }}
                    actionButton={{
                        label: 'Add Background',
                        onClick: handleApplyBackground,
                        disabled: isProcessing,
                        isProcessing: isProcessing,
                        processingText: 'Processing...'
                    }}
                >
                    <></>
                </MobileLayout>

                {/* Right Sidebar - Background Options - HIDDEN on mobile */}
                <aside className="hidden md:flex w-96 flex-shrink-0 bg-white border-l border-gray-200 flex-col h-full shadow-lg z-20">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                            <Settings className="w-4 h-4 text-brand-blue-600" />
                            Background Options
                        </h2>
                    </div>

                    <div className="flex-grow p-4 space-y-4 overflow-y-auto custom-scrollbar">
                        {/* Type Selection */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setBackgroundType('color')}
                                className={`flex-1 py-3 px-2 rounded-lg border transition-all duration-200 flex flex-col items-center justify-center gap-2 text-sm font-medium relative ${backgroundType === 'color'
                                    ? 'bg-brand-blue-50 border-brand-blue-500 text-brand-blue-700'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                                    }`}
                            >
                                {backgroundType === 'color' && (
                                    <div className="absolute top-1.5 right-1.5 text-brand-blue-600">
                                        <Check className="w-3.5 h-3.5" />
                                    </div>
                                )}
                                <Type className="w-6 h-6" />
                                <span>Color</span>
                            </button>
                            <button
                                onClick={() => setBackgroundType('image')}
                                className={`flex-1 py-3 px-2 rounded-lg border transition-all duration-200 flex flex-col items-center justify-center gap-2 text-sm font-medium relative ${backgroundType === 'image'
                                    ? 'bg-brand-blue-50 border-brand-blue-500 text-brand-blue-700'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                                    }`}
                            >
                                {backgroundType === 'image' && (
                                    <div className="absolute top-1.5 right-1.5 text-brand-blue-600">
                                        <Check className="w-3.5 h-3.5" />
                                    </div>
                                )}
                                <ImageIcon className="w-6 h-6" />
                                <span>Image</span>
                            </button>
                        </div>

                        {/* Color Background Options */}
                        {backgroundType === 'color' && (
                            <>
                                {/* Quick Presets Dropdown */}
                                <details className="group">
                                    <summary className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-lg cursor-pointer transition-all border border-blue-200">
                                        <span className="text-sm font-semibold text-brand-blue-700 flex items-center gap-2">
                                            ✨ Quick Presets
                                            <span className="text-xs bg-white text-brand-blue-600 px-2 py-0.5 rounded-full">{COLOR_PRESETS.length} colors</span>
                                        </span>
                                        <svg className="w-4 h-4 text-brand-blue-600 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </summary>
                                    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                                        {COLOR_PRESETS.map((preset) => (
                                            <button
                                                key={preset.id}
                                                onClick={() => {
                                                    setBackgroundColor(preset.color);
                                                    setOpacity(preset.opacity);
                                                }}
                                                className="w-full flex items-center gap-3 p-2.5 rounded-lg transition-all text-left bg-white hover:bg-brand-blue-50 border border-gray-200 hover:border-brand-blue-300"
                                            >
                                                <div
                                                    className="w-8 h-8 rounded-md border-2 border-gray-300"
                                                    style={{ backgroundColor: preset.color }}
                                                />
                                                <span className="text-sm font-medium text-gray-700">{preset.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </details>

                                {/* Custom Color */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                                        Custom Color
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={backgroundColor}
                                            onChange={(e) => setBackgroundColor(e.target.value)}
                                            className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={backgroundColor}
                                            onChange={(e) => setBackgroundColor(e.target.value)}
                                            className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:border-brand-blue-500"
                                            placeholder="#FFFFFF"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Image Layer UI */}
                        {backgroundType === 'image' && (
                            <div className="space-y-4">
                                {/* Add New Image Button */}
                                <div className="relative group">
                                    <input
                                        type="file"
                                        accept="image/png, image/jpeg, image/jpg"
                                        onChange={handleImageUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 flex flex-col items-center justify-center text-center transition-all group-hover:border-brand-blue-500 group-hover:bg-brand-blue-50">
                                        <div className="p-2 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                                            <Upload className="h-5 w-5 text-brand-blue-600" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-700">Click to add image</p>
                                        <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</p>
                                    </div>
                                </div>

                                {/* Layers List */}
                                {layers.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Layers</h4>
                                            <button
                                                onClick={() => setLayers([])}
                                                className="text-xs text-red-500 hover:text-red-600 hover:underline"
                                            >
                                                Remove all
                                            </button>
                                        </div>

                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                            {layers.map((layer, index) => (
                                                <div
                                                    key={layer.id}
                                                    onClick={() => setSelectedLayerId(layer.id)}
                                                    className={`
                                                             group flex items-center p-2 bg-white border rounded-md shadow-sm cursor-pointer transition-all
                                                             ${selectedLayerId === layer.id ? 'ring-2 ring-brand-blue-500 border-transparent' : 'hover:border-gray-300'}
                                                         `}
                                                >
                                                    {/* Small Preview */}
                                                    <div className="w-10 h-10 flex-shrink-0 bg-gray-100 rounded border border-gray-200 overflow-hidden relative">
                                                        <img
                                                            src={layer.previewUrl}
                                                            alt="Layer preview"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>

                                                    {/* Info */}
                                                    <div className="ml-3 flex-grow min-w-0">
                                                        <p className="text-sm font-medium text-gray-700 truncate">{layer.name}</p>
                                                        <p className="text-xs text-gray-400">Layer {index + 1}</p>
                                                    </div>

                                                    {/* Controls */}
                                                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setLayers(prev => prev.filter(l => l.id !== layer.id));
                                                                if (selectedLayerId === layer.id) setSelectedLayerId(null);
                                                            }}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                            title="Remove layer"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Opacity Slider - For Layers or Base */}
                        <div className="space-y-2 pt-2 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    {selectedLayerId ? 'Layer Opacity' : 'Background Opacity'}
                                </label>
                                <span className="text-xs font-semibold text-brand-blue-600">
                                    {selectedLayerId
                                        ? Math.round((layers.find(l => l.id === selectedLayerId)?.opacity || 1) * 100)
                                        : Math.round(opacity * 100)
                                    }%
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={selectedLayerId
                                    ? (layers.find(l => l.id === selectedLayerId)?.opacity || 1)
                                    : opacity
                                }
                                onChange={(e) => {
                                    const newOpacity = parseFloat(e.target.value);
                                    if (selectedLayerId) {
                                        setLayers(prev => prev.map(l => l.id === selectedLayerId ? { ...l, opacity: newOpacity } : l));
                                    } else {
                                        setOpacity(newOpacity);
                                    }
                                }}
                                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                            />
                        </div>

                        {/* Apply to All Toggle */}
                        <div className="space-y-2 pt-2 border-t border-gray-200">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
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
                                <div
                                    className={`w-11 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${applyToAll ? 'bg-brand-blue-600' : 'bg-gray-300'
                                        }`}
                                >
                                    <div
                                        className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${applyToAll ? 'translate-x-5' : ''
                                            }`}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        {/* Reset Button */}
                        <button
                            onClick={handleReset}
                            className="w-full flex items-center justify-center px-3 py-2 border-2 border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-500 transition-all"
                        >
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                            Reset to Default
                        </button>

                        {error && (
                            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-2 flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-red-700 font-medium">{error}</p>
                            </div>
                        )}
                    </div>

                    <div className="p-5 border-t border-gray-200 bg-gray-50">
                        <button
                            onClick={handleApplyBackground}
                            disabled={isProcessing}
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

                            <span className="relative z-10 flex items-center">
                                {isProcessing ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                        Adding Background...
                                    </>
                                ) : (
                                    <>
                                        Add Background
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
    );
};

export default AddBackgroundTool;



import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PdfUploadHero } from '../shared/PdfUploadHero';
import { PdfPageCard } from '../shared/PdfPageCard';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { MobileLayout } from '../shared/MobileLayout';
import { ToolCTAs } from '../shared/ToolCTAs';
import { toast } from 'sonner';
import { TOOL_HERO_UI } from '@/lib/toolHeroConfig';
import { PdfiumEditEngineClient } from '@/lib/pdf-edit/pdfiumClient';
import type { EngineEditRequest, EngineTextRun } from '@/lib/pdf-edit/types';
import {
    ArrowRight,
    AlertCircle,
    Settings,
    RefreshCw,
    Type,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Edit3
} from 'lucide-react';

if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;
}

const hero = TOOL_HERO_UI['edit-pdf'];

type TextAlignment = 'left' | 'center' | 'right';
type StageStatus = 'idle' | 'loading' | 'ready' | 'error';
type TextStageStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

interface TextRegion {
    id: string;
    runId: string;
    pageNumber: number;
    originalText: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number;
    fontName: string;
    fontFamily: string;
    color: string;
    rotation: number;
    objectId?: string;
    charRange?: {
        start: number;
        end: number;
    };
    lineCount?: number;
    canEdit: boolean;
    supportReason?: string;
}

interface TextEditOverrides {
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    alignment?: TextAlignment;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}

interface RegionSupport {
    supported: boolean;
    reasons: string[];
}

const FONT_OPTIONS = [
    { label: 'Preserve Original', value: '' },
    { label: 'Helvetica (Sans)', value: 'Helvetica' },
    { label: 'Times (Serif)', value: 'TimesRoman' },
    { label: 'Courier (Mono)', value: 'Courier' }
];

const DEFAULT_TEXT_COLOR = '#111827';

/*
Implementation note:
- The edit tool preserves the existing UI shell and PDF.js rendering.
- Text selection and editing now route through a PDFium WASM worker for true content edits.
- The preview is a re-render of the edited PDF bytes; no masking or overlay drawing is used for supported edits.
*/

const sanitizeColor = (value?: string) => {
    if (!value) return DEFAULT_TEXT_COLOR;
    const trimmed = value.trim();
    if (/^#([a-f\d]{3}|[a-f\d]{6})$/i.test(trimmed)) {
        if (trimmed.length === 4) {
            return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toLowerCase();
        }
        return trimmed.toLowerCase();
    }
    if (/^rgb\((\s*\d+\s*,){2}\s*\d+\s*\)$/i.test(trimmed)) {
        return trimmed;
    }
    return DEFAULT_TEXT_COLOR;
};

const getInteractionPadding = (fontSize: number) => ({
    x: Math.max(fontSize * 0.14, 3),
    y: Math.max(fontSize * 0.2, 3)
});

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

const toUiRegion = (run: EngineTextRun, pageHeight: number): TextRegion => {
    const width = Math.max(run.bounds.right - run.bounds.left, 1);
    const height = Math.max(run.bounds.top - run.bounds.bottom, 1);

    return {
        id: run.id,
        runId: run.id,
        pageNumber: run.pageIndex + 1,
        originalText: run.text,
        x: run.bounds.left,
        y: pageHeight - run.bounds.top,
        width,
        height,
        fontSize: run.fontSize ?? Math.max(height, 1),
        fontName: run.fontName ?? 'Unknown',
        fontFamily: run.fontName ?? 'Unknown',
        color: DEFAULT_TEXT_COLOR,
        rotation: run.rotation,
        objectId: run.objectId,
        charRange: run.charRange,
        lineCount: run.lineCount,
        canEdit: run.canEdit,
        supportReason: run.supportReason
    };
};

const EditPdfTool: React.FC = () => {
    const [activeFile, setActiveFile] = useState<File | null>(null);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [isPreviewActive, setIsPreviewActive] = useState(false);
    const [pageNumbers, setPageNumbers] = useState<number[]>([]);
    const [activePage, setActivePage] = useState(1);
    const [pdfLoadStatus, setPdfLoadStatus] = useState<StageStatus>('idle');
    const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);
    const [previewStatus, setPreviewStatus] = useState<StageStatus>('idle');
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [engineStatus, setEngineStatus] = useState<StageStatus>('idle');
    const [engineError, setEngineError] = useState<string | null>(null);
    const [textStatus, setTextStatus] = useState<TextStageStatus>('idle');
    const [textError, setTextError] = useState<string | null>(null);

    const [pageRegions, setPageRegions] = useState<Record<number, TextRegion[]>>({});
    const [textEdits, setTextEdits] = useState<Record<string, TextEditOverrides>>({});
    const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
    const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);

    const [renderScale, setRenderScale] = useState(1);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const [debugRegionOverlay, setDebugRegionOverlay] = useState(false);
    const inlineEditorRef = useRef<HTMLInputElement | null>(null);
    const lastSingleLineWarningRef = useRef(0);

    const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const renderTaskRef = useRef<any>(null);
    const hiddenEditorRef = useRef<HTMLTextAreaElement>(null);
    const engineRef = useRef<PdfiumEditEngineClient | null>(null);
    const engineDocIdRef = useRef<string | null>(null);
    const originalPdfBytesRef = useRef<ArrayBuffer | null>(null);
    const loadRequestRef = useRef(0);
    const editedPreviewDocRef = useRef<any>(null);
    const previewEditRequestRef = useRef(0);

    useEffect(() => {
        const loadPdf = async () => {
            if (!activeFile) return;

            const loadId = ++loadRequestRef.current;
            console.info('[edit-pdf] File selected', {
                name: activeFile.name,
                size: activeFile.size,
                type: activeFile.type || 'unknown'
            });

            if (renderTaskRef.current) {
                try {
                    renderTaskRef.current.cancel();
                } catch {
                    // ignore stale render cancellation
                }
                renderTaskRef.current = null;
            }

            const existingEngine = engineRef.current;
            const existingDocId = engineDocIdRef.current;
            if (existingEngine && existingDocId) {
                void existingEngine.closeDocument(existingDocId).catch((closeError) => {
                    console.warn('[edit-pdf] Failed to close previous engine document', closeError);
                });
            }
            existingEngine?.terminate();
            engineRef.current = null;
            engineDocIdRef.current = null;
            if (editedPreviewDocRef.current) {
                editedPreviewDocRef.current.destroy?.();
                editedPreviewDocRef.current = null;
            }

            setPdfDoc(null);
            setPageNumbers([]);
            setPageRegions({});
            setTextEdits({});
            setSelectedRegionId(null);
            setHoveredRegionId(null);
            setCanvasSize({ width: 0, height: 0 });
            setRenderScale(1);
            setActivePage(1);
            setIsPreviewActive(false);
            setPdfLoadStatus('loading');
            setPdfLoadError(null);
            setPreviewStatus('idle');
            setPreviewError(null);
            setActionError(null);
            setEngineError(null);
            setEngineStatus('idle');
            setTextStatus('idle');
            setTextError(null);

            const loadGuard = window.setTimeout(() => {
                if (loadRequestRef.current !== loadId) return;
                console.error('[edit-pdf] Load guard timeout fired while waiting for preview readiness.');
                setPreviewStatus((current) => current === 'loading' ? 'error' : current);
                setPreviewError((current) => current || 'PDF preview is taking too long to render.');
            }, 15000);

            try {
                console.info('[edit-pdf] Reading file as ArrayBuffer...');
                const arrayBuffer = await activeFile.arrayBuffer();
                if (loadRequestRef.current !== loadId) return;
                console.info('[edit-pdf] ArrayBuffer created', { byteLength: arrayBuffer.byteLength });
                console.info('[edit-pdf] Loading PDF.js document...');
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;
                if (loadRequestRef.current !== loadId) return;
                console.info('[edit-pdf] PDF.js load succeeded', { numPages: pdf.numPages });

                setPdfDoc(pdf);
                originalPdfBytesRef.current = arrayBuffer;
                setPageNumbers(Array.from({ length: pdf.numPages }, (_, index) => index + 1));
                setPdfLoadStatus('ready');
                setPreviewStatus('loading');

                setEngineStatus('loading');
                console.info('[edit-pdf] Initializing PDFium worker...');
                const engine = new PdfiumEditEngineClient();
                engineRef.current = engine;
                try {
                    const engineBuffer = arrayBuffer.slice(0);
                    const engineDoc = await engine.loadDocument(engineBuffer, 10000);
                    if (loadRequestRef.current !== loadId) return;
                    engineDocIdRef.current = engineDoc.docId;
                    setEngineStatus('ready');
                    console.info('[edit-pdf] PDFium loadDocument succeeded', {
                        docId: engineDoc.docId,
                        pageCount: engineDoc.pageCount
                    });
                } catch (engineLoadError) {
                    if (loadRequestRef.current !== loadId) return;
                    console.error('[edit-pdf] PDFium loadDocument failed', engineLoadError);
                    engineDocIdRef.current = null;
                    setEngineStatus('error');
                    setEngineError(engineLoadError instanceof Error ? engineLoadError.message : String(engineLoadError));
                }

            } catch (err) {
                if (loadRequestRef.current !== loadId) return;
                console.error('[edit-pdf] PDF.js load failed', err);
                setPdfDoc(null);
                setPageNumbers([]);
                setPdfLoadStatus('error');
                setPdfLoadError(err instanceof Error ? err.message : 'Failed to load PDF file.');
                setPreviewStatus('idle');
                setEngineStatus('idle');
                toast.error('Failed to load PDF file.');
            } finally {
                window.clearTimeout(loadGuard);
            }
        };

        loadPdf();
        return () => {
            loadRequestRef.current += 1;
            if (renderTaskRef.current) {
                try {
                    renderTaskRef.current.cancel();
                } catch {
                    // ignore stale render cancellation
                }
                renderTaskRef.current = null;
            }
            const engine = engineRef.current;
            const docId = engineDocIdRef.current;
            if (engine && docId) {
                void engine.closeDocument(docId).catch((closeError) => {
                    console.warn('[edit-pdf] Failed to close engine document during cleanup', closeError);
                });
                engineDocIdRef.current = null;
            }
        };
    }, [activeFile]);

    const extractRegionsForPage = useCallback(async (pageNumber: number) => {
        if (!pdfDoc) return;
        if (pageRegions[pageNumber]) return;

        try {
            if (engineStatus === 'loading') {
                setTextStatus('loading');
                setTextError(null);
                console.info('[edit-pdf] Waiting for PDFium before extracting text runs', { pageNumber });
                return;
            }

            if (engineStatus !== 'ready') {
                setTextStatus('idle');
                return;
            }
            const engine = engineRef.current;
            const docId = engineDocIdRef.current;
            if (!engine || !docId) return;

            setTextStatus('loading');
            setTextError(null);
            console.info('[edit-pdf] Extracting text runs for page', pageNumber);
            const page = await pdfDoc.getPage(pageNumber);
            const viewport = page.getViewport({ scale: 1 });
            const runs = await engine.getPageTextRuns(docId, pageNumber - 1);
            const regions = runs.map((run) => toUiRegion(run, viewport.height));
            console.info('[edit-pdf] Text extraction succeeded', {
                pageNumber,
                runCount: regions.length,
                sampleRegions: regions.slice(0, 3).map((region) => ({
                    id: region.id,
                    text: region.originalText,
                    objectId: region.objectId,
                    charRange: region.charRange,
                    lineCount: region.lineCount,
                    x: region.x,
                    y: region.y,
                    width: region.width,
                    height: region.height,
                    rotation: region.rotation,
                    canEdit: region.canEdit
                }))
            });

            setPageRegions(prev => ({
                ...prev,
                [pageNumber]: regions
            }));
            setTextStatus(regions.length > 0 ? 'ready' : 'empty');
        } catch (err) {
            console.error('[edit-pdf] Text extraction failed', err);
            setTextStatus('error');
            setTextError(err instanceof Error ? err.message : 'Failed to extract editable text from this page.');
        }
    }, [engineStatus, pageRegions, pdfDoc]);

    const renderPdf = useCallback(async (docOverride?: any) => {
        const docToRender = docOverride ?? editedPreviewDocRef.current ?? pdfDoc;
        if (!docToRender || !pdfCanvasRef.current || !previewContainerRef.current) return;

        if (renderTaskRef.current) {
            try {
                renderTaskRef.current.cancel();
            } catch {
                // ignore stale render cancellation
            }
        }

        try {
            console.info('[edit-pdf] Rendering main preview page', { activePage });
            setPreviewStatus('loading');
            setPreviewError(null);
            const page = await docToRender.getPage(activePage);
            const pdfCanvas = pdfCanvasRef.current;
            const container = previewContainerRef.current;

            const containerWidth = Math.max(container.clientWidth - 40, 100);
            const containerHeight = Math.max(container.clientHeight - 40, 100);
            console.info('[edit-pdf] Main preview container metrics', {
                activePage,
                containerWidth,
                containerHeight
            });

            const viewport = page.getViewport({ scale: 1 });
            const scaleX = containerWidth / viewport.width;
            const scaleY = containerHeight / viewport.height;
            const scale = Math.min(scaleX, scaleY, 1.5);
            const scaledViewport = page.getViewport({ scale });

            pdfCanvas.width = scaledViewport.width;
            pdfCanvas.height = scaledViewport.height;
            setCanvasSize({ width: scaledViewport.width, height: scaledViewport.height });
            setRenderScale(scale);

            const pdfContext = pdfCanvas.getContext('2d', { alpha: false });
            if (pdfContext) {
                pdfContext.fillStyle = '#ffffff';
                pdfContext.fillRect(0, 0, pdfCanvas.width, pdfCanvas.height);

                const renderTask = page.render({ canvasContext: pdfContext, viewport: scaledViewport });
                renderTaskRef.current = renderTask;
                await renderTask.promise;
                renderTaskRef.current = null;
                setPreviewStatus('ready');
                console.info('[edit-pdf] Main preview render succeeded', {
                    activePage,
                    width: scaledViewport.width,
                    height: scaledViewport.height,
                    scale,
                    source: docOverride ? 'edited-preview' : editedPreviewDocRef.current ? 'edited-preview-ref' : 'base-pdf'
                });
            }
        } catch (err: any) {
            if (err?.name === 'RenderingCancelledException') return;
            console.error(`[edit-pdf] Main preview render failed for page ${activePage}`, err);
            setPreviewStatus('error');
            setPreviewError(err instanceof Error ? err.message : 'Failed to render PDF preview.');
        }
    }, [activePage, pdfDoc]);

    const loadPdfFromBytes = useCallback(async (bytes: ArrayBuffer) => {
        console.info('[edit-pdf] Reloading PDF.js preview from bytes', { byteLength: bytes.byteLength });
        const loadingTask = pdfjsLib.getDocument({ data: bytes });
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setPreviewStatus('loading');
    }, []);

    useEffect(() => {
        renderPdf();
    }, [renderPdf]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const debugFlag = params.get('debugTextRegions') === '1'
            || window.localStorage.getItem('editPdfDebugRegions') === '1';
        setDebugRegionOverlay(import.meta.env.DEV ? debugFlag : false);
    }, []);

    useEffect(() => {
        return () => {
            engineRef.current?.terminate();
            engineRef.current = null;
            if (editedPreviewDocRef.current) {
                editedPreviewDocRef.current.destroy?.();
                editedPreviewDocRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!pdfDoc) return;
        setTextStatus(engineStatus === 'ready' ? 'loading' : 'idle');
        setTextError(null);
        extractRegionsForPage(activePage);
    }, [activePage, engineStatus, extractRegionsForPage, pdfDoc]);

    const activeRegions = pageRegions[activePage] || [];
    const selectedRegion = activeRegions.find(region => region.id === selectedRegionId) || null;

    const getEditForRegion = useCallback((regionId: string) => {
        return textEdits[regionId] || {};
    }, [textEdits]);

    const updateEditForRegion = useCallback((regionId: string, updates: TextEditOverrides) => {
        setTextEdits(prev => ({
            ...prev,
            [regionId]: {
                ...prev[regionId],
                ...updates
            }
        }));
    }, []);

    const normalizeSingleLineInput = useCallback((value: string) => {
        if (!value.includes('\n') && !value.includes('\r')) {
            return value;
        }

        const normalized = value.replace(/\r?\n/g, ' ');
        const now = Date.now();
        if (now - lastSingleLineWarningRef.current > 1500) {
            toast.error('This selection supports single-line editing only. New lines are not supported yet.');
            lastSingleLineWarningRef.current = now;
        }
        return normalized;
    }, []);

    const updateRegionText = useCallback((regionId: string, nextText: string) => {
        const normalized = normalizeSingleLineInput(nextText);
        updateEditForRegion(regionId, { text: normalized });
        console.info('[edit-pdf] Updated text draft', {
            regionId,
            length: normalized.length
        });
    }, [normalizeSingleLineInput, updateEditForRegion]);

    const getPreviewRegion = useCallback((region: TextRegion) => {
        const edit = getEditForRegion(region.id);
        return {
            ...region,
            text: edit.text ?? region.originalText,
            x: region.x,
            y: region.y,
            width: region.width,
            height: region.height,
            fontSize: Math.max(6, region.fontSize),
            fontFamily: region.fontFamily,
            color: sanitizeColor(region.color),
            alignment: 'left'
        } as TextRegion & { text: string; alignment: TextAlignment };
    }, [getEditForRegion]);

    useEffect(() => {
        if (!activeRegions.length) {
            console.info('[edit-pdf] Overlay mount check', {
                activePage,
                regionCount: 0,
                canvasSize,
                renderScale
            });
            return;
        }

        const sampleRegions = activeRegions.slice(0, 3).map((region) => {
            const previewRegion = getPreviewRegion(region);
            const interactionPadding = getInteractionPadding(previewRegion.fontSize);
            return {
                id: region.id,
                text: previewRegion.text,
                pdfBounds: {
                    x: previewRegion.x,
                    y: previewRegion.y,
                    width: previewRegion.width,
                    height: previewRegion.height
                },
                viewportBounds: {
                    left: (previewRegion.x - interactionPadding.x) * renderScale,
                    top: (previewRegion.y - interactionPadding.y) * renderScale,
                    width: (previewRegion.width + interactionPadding.x * 2) * renderScale,
                    height: (previewRegion.height + interactionPadding.y * 2) * renderScale
                },
                canEdit: region.canEdit
            };
        });

        console.info('[edit-pdf] Overlay mount check', {
            activePage,
            regionCount: activeRegions.length,
            canvasSize,
            renderScale,
            sampleRegions
        });
    }, [activePage, activeRegions, canvasSize, getPreviewRegion, renderScale]);

    const hasMeaningfulEdit = useCallback((region: TextRegion) => {
        const edit = getEditForRegion(region.id);
        return Boolean(
            edit.text !== undefined && edit.text !== region.originalText
        );
    }, [getEditForRegion]);

    const getEditSupport = useCallback((region: TextRegion): RegionSupport => {
        const edit = getEditForRegion(region.id);
        const reasons: string[] = [];

        if (engineStatus === 'error') {
            reasons.push(engineError || 'PDF editing engine failed to initialize.');
        }

        if (!region.canEdit) {
            reasons.push(region.supportReason || 'This text block cannot be mapped to a single PDF text object.');
        }

        if ((edit.text ?? region.originalText).includes('\n')) {
            reasons.push('Multi-line edits are not supported yet.');
        }

        if (edit.x !== undefined || edit.y !== undefined || edit.width !== undefined || edit.height !== undefined) {
            reasons.push('Moving or resizing text is not supported yet.');
        }

        return { supported: reasons.length === 0, reasons };
    }, [engineError, engineStatus, getEditForRegion]);

    const selectedPreviewRegion = selectedRegion ? getPreviewRegion(selectedRegion) : null;
    const selectedSupport = selectedRegion ? getEditSupport(selectedRegion) : null;
    const selectedTextEditable = Boolean(selectedSupport?.supported);

    const collectEdits = useCallback(() => {
        const edits: EngineEditRequest[] = [];
        const unsupported: { region: TextRegion; reasons: string[] }[] = [];

        pageNumbers.forEach((pageNumber) => {
            const regions = pageRegions[pageNumber] || [];
            regions.forEach((region) => {
                if (!hasMeaningfulEdit(region)) return;
                const support = getEditSupport(region);
                const edit = getEditForRegion(region.id);
                const nextText = edit.text ?? region.originalText;

                if (!support.supported) {
                    unsupported.push({ region, reasons: support.reasons });
                    return;
                }

                if (nextText !== region.originalText) {
                    edits.push({ runId: region.runId, text: nextText });
                }
            });
        });

        return { edits, unsupported };
    }, [pageNumbers, pageRegions, hasMeaningfulEdit, getEditSupport, getEditForRegion]);

    useEffect(() => {
        if (!selectedRegion || !selectedSupport?.supported || !hiddenEditorRef.current) return;

        hiddenEditorRef.current.focus();
        const value = getPreviewRegion(selectedRegion).text;
        const end = value.length;
        hiddenEditorRef.current.setSelectionRange(end, end);
    }, [getPreviewRegion, selectedRegion, selectedSupport]);

    useEffect(() => {
        if (!selectedRegion || !selectedSupport?.supported) return;
        inlineEditorRef.current?.focus();
    }, [selectedRegion, selectedSupport]);

    useEffect(() => {
        const engine = engineRef.current;
        const docId = engineDocIdRef.current;
        const sourceBytes = originalPdfBytesRef.current;

        if (!engine || !docId || !sourceBytes) return;

        const { edits, unsupported } = collectEdits();

        if (edits.length === 0 || unsupported.length > 0) {
            if (editedPreviewDocRef.current) {
                editedPreviewDocRef.current.destroy?.();
                editedPreviewDocRef.current = null;
                console.info('[edit-pdf] Cleared edited preview, reverting to base PDF');
            }
            renderPdf();
            return;
        }

        const requestId = ++previewEditRequestRef.current;
        const timeout = setTimeout(async () => {
            try {
                console.info('[edit-pdf] Generating edited preview', { editCount: edits.length });
                const bytes = await engine.applyEdits(docId, edits);
                if (previewEditRequestRef.current !== requestId) return;

                const loadingTask = pdfjsLib.getDocument({ data: bytes });
                const doc = await loadingTask.promise;
                if (previewEditRequestRef.current !== requestId) {
                    doc.destroy?.();
                    return;
                }

                if (editedPreviewDocRef.current && editedPreviewDocRef.current !== doc) {
                    editedPreviewDocRef.current.destroy?.();
                }
                editedPreviewDocRef.current = doc;
                await renderPdf(doc);
                console.info('[edit-pdf] Edited preview rendered', { editCount: edits.length });
            } catch (err) {
                console.error('[edit-pdf] Failed to generate edited preview', err);
            }
        }, 250);

        return () => clearTimeout(timeout);
    }, [collectEdits, renderPdf]);

    useEffect(() => {
        if (!selectedRegion) return;
        if (!selectedSupport) return;
        console.info('[edit-pdf] Selection support status', {
            id: selectedRegion.id,
            supported: selectedSupport.supported,
            reasons: selectedSupport.reasons
        });
    }, [selectedRegion, selectedSupport]);

    const resetEditForRegion = useCallback((regionId: string) => {
        setTextEdits(prev => {
            const next = { ...prev };
            delete next[regionId];
            return next;
        });
    }, []);

    const resetAllEdits = () => {
        setTextEdits({});
        setSelectedRegionId(null);
        toast.success('Edits reset.');
    };

    const handleApplyEdits = async () => {
        if (!activeFile || pdfLoadStatus !== 'ready') {
            toast.error('Please upload a PDF file first.');
            return;
        }

        if (engineStatus !== 'ready' || !engineRef.current || !engineDocIdRef.current) {
            toast.error('The edit engine is not ready for this PDF.');
            return;
        }

        const { edits, unsupported } = collectEdits();

        if (edits.length === 0) {
            toast.error('No edits to apply. Select a text region and make changes first.');
            return;
        }

        if (unsupported.length > 0) {
            setActionError(`There are ${unsupported.length} edits that are not yet supported for true PDF editing.`);
            toast.error('Some edits are not supported for true PDF editing yet.');
            return;
        }

        setIsProcessing(true);
        setActionError(null);

        try {
            const bytes = await engineRef.current.applyEdits(engineDocIdRef.current, edits);
            await loadPdfFromBytes(bytes);
            setIsPreviewActive(true);

            const blob = new Blob([bytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = activeFile.name.replace(/\.pdf$/i, '-edited.pdf');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success('Edited PDF ready for download.');
        } catch (err) {
            console.error('Failed to apply edits:', err);
            setActionError('Failed to apply edits.');
            toast.error('Failed to apply edits.');
        } finally {
            setIsProcessing(false);
        }
    };

    const editSummary = collectEdits();
    const hasUnsupportedEdits = editSummary.unsupported.length > 0;
    const isPdfLoading = pdfLoadStatus === 'loading';
    const isPreviewLoading = previewStatus === 'loading';
    const canShowPreview = pdfLoadStatus === 'ready' && previewStatus !== 'error' && !!pdfDoc;
    const canShowNoEditableText = pdfLoadStatus === 'ready' && previewStatus === 'ready' && engineStatus === 'ready' && textStatus === 'empty';
    const stageRows = [
        {
            label: 'PDF loaded',
            status: pdfLoadStatus,
            detail:
                pdfLoadStatus === 'error'
                    ? pdfLoadError || 'PDF.js could not open this file.'
                    : pdfLoadStatus === 'ready'
                        ? `${pageNumbers.length} page${pageNumbers.length === 1 ? '' : 's'} detected`
                        : 'Waiting for a PDF file'
        },
        {
            label: 'Preview rendered',
            status: previewStatus,
            detail:
                previewStatus === 'error'
                    ? previewError || 'The main preview canvas could not render.'
                    : previewStatus === 'ready'
                        ? `Page ${activePage} rendered successfully`
                        : pdfLoadStatus === 'ready'
                            ? 'Rendering the main page preview'
                            : 'Waiting for PDF load'
        },
        {
            label: 'PDFium ready',
            status: engineStatus,
            detail:
                engineStatus === 'error'
                    ? engineError || 'PDFium could not initialize.'
                    : engineStatus === 'ready'
                        ? 'True-edit engine ready'
                        : pdfLoadStatus === 'ready'
                            ? 'Preparing the edit engine'
                            : 'Waiting for PDF load'
        },
        {
            label: 'Editable text detected',
            status: textStatus === 'empty' ? 'ready' : textStatus,
            detail:
                textStatus === 'error'
                    ? textError || 'Text extraction failed for this page.'
                    : textStatus === 'empty'
                        ? 'No editable text runs found on this page'
                        : textStatus === 'ready'
                            ? `${activeRegions.length} text region${activeRegions.length === 1 ? '' : 's'} found on page ${activePage}`
                            : engineStatus === 'ready'
                                ? 'Scanning the active page for text runs'
                                : 'Waiting for the edit engine'
        }
    ] as const;

    useEffect(() => {
        if (!selectedRegion) return;
        console.info('[edit-pdf] Selected text region diagnostics', {
            id: selectedRegion.id,
            text: selectedRegion.originalText,
            objectId: selectedRegion.objectId,
            charRange: selectedRegion.charRange,
            lineCount: selectedRegion.lineCount,
            bounds: {
                x: selectedRegion.x,
                y: selectedRegion.y,
                width: selectedRegion.width,
                height: selectedRegion.height
            },
            canEdit: selectedRegion.canEdit,
            supportReasons: selectedSupport?.reasons ?? [],
            textEditingEnabled: selectedSupport?.supported ?? false,
            movementEnabled: false
        });
    }, [selectedRegion, selectedSupport]);

    const pagesPanelContent = (
        <div className="p-3 space-y-3">
            {isPdfLoading && pageNumbers.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                    <LoadingSpinner />
                </div>
            ) : (
                pageNumbers.map((pageNum) => (
                    <PageThumbnail
                        key={pageNum}
                        pageNumber={pageNum}
                        file={activeFile!}
                        isActive={pageNum === activePage}
                        onClick={() => setActivePage(pageNum)}
                    />
                ))
            )}
        </div>
    );

    const settingsContent = (
        <div className="p-4 space-y-4">
            <div className="bg-blue-50 border-2 border-blue-100 rounded-xl p-3">
                <div className="flex items-start gap-2">
                    <Edit3 className="w-4 h-4 text-brand-blue-600 mt-0.5" />
                    <div>
                        <p className="text-xs font-semibold text-brand-blue-700">True PDF text editing (PDFium)</p>
                        <p className="text-[11px] text-brand-blue-600 mt-1">
                            Edits now flow through the PDFium engine in a Web Worker and are saved into the PDF content. Supported today: single-line, horizontal text replacement only.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Load Status</p>
                <div className="space-y-2">
                    {stageRows.map((stage) => {
                        const dotClass =
                            stage.status === 'error'
                                ? 'bg-red-500'
                                : stage.status === 'ready'
                                    ? 'bg-emerald-500'
                                    : stage.status === 'loading'
                                        ? 'bg-blue-500'
                                        : 'bg-gray-300';

                        return (
                            <div key={stage.label} className="flex items-start gap-2">
                                <span className={`mt-1 h-2.5 w-2.5 rounded-full ${dotClass}`} />
                                <div>
                                    <p className="text-xs font-semibold text-gray-700">{stage.label}</p>
                                    <p className="text-[11px] text-gray-500 mt-0.5">{stage.detail}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {engineStatus === 'loading' && pdfLoadStatus === 'ready' && (
                <div className="bg-blue-50 border-2 border-blue-100 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                        <LoadingSpinner />
                        <div>
                            <p className="text-xs font-semibold text-brand-blue-700">Preparing edit engine</p>
                            <p className="text-[11px] text-brand-blue-600 mt-1">
                                PDF.js preview is loading separately from PDFium text editing.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {engineStatus === 'error' && pdfLoadStatus === 'ready' && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                        <div>
                            <p className="text-xs font-semibold text-red-700">Edit engine unavailable</p>
                            <p className="text-[11px] text-red-600 mt-1">
                                {engineError || 'PDFium could not initialize for this file.'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {textStatus === 'error' && pdfLoadStatus === 'ready' && previewStatus === 'ready' && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                        <div>
                            <p className="text-xs font-semibold text-red-700">Text extraction failed</p>
                            <p className="text-[11px] text-red-600 mt-1">
                                {textError || 'Editable text regions could not be extracted from this page.'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {canShowNoEditableText && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                        <div>
                            <p className="text-xs font-semibold text-amber-700">No editable text regions detected on this page</p>
                            <p className="text-[11px] text-amber-600 mt-1">
                                This page appears scanned or image-based. True text editing is not available here without OCR.
                            </p>
                            <a
                                href="/ocr-pdf"
                                className="inline-flex items-center gap-1 text-xs text-brand-blue-600 font-semibold mt-2 hover:underline"
                            >
                                Go to OCR PDF
                                <ArrowRight className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {selectedRegion && selectedSupport && !selectedSupport.supported && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                        <div>
                            <p className="text-xs font-semibold text-amber-700">This text block is not yet supported</p>
                            <p className="text-[11px] text-amber-600 mt-1">
                                These edits cannot be saved as true PDF text yet:
                            </p>
                            <ul className="text-[11px] text-amber-700 mt-2 list-disc list-inside space-y-1">
                                {selectedSupport.reasons.map((reason) => (
                                    <li key={reason}>{reason}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    Selected Region
                </label>

                {selectedRegion && selectedPreviewRegion ? (
                    <div className="space-y-3">
                        {!selectedTextEditable && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                                <p className="text-[11px] font-semibold text-amber-700">Read-only selection</p>
                                <p className="text-[11px] text-amber-600 mt-1">
                                    This block can be inspected, but true PDF editing is disabled until it maps cleanly to a supported single-line text object.
                                </p>
                            </div>
                        )}
                        <textarea
                            value={selectedPreviewRegion.text}
                            onChange={(e) => updateRegionText(selectedRegion.id, e.target.value)}
                            onKeyDown={(event) => {
                                if (!selectedTextEditable) return;
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    toast.error('This selection supports single-line editing only. New lines are not supported yet.');
                                }
                            }}
                            readOnly={!selectedTextEditable}
                            className={`w-full min-h-[96px] rounded-lg border-2 px-3 py-2 text-sm ${selectedTextEditable
                                ? 'border-gray-200 focus:outline-none focus:border-brand-blue-500'
                                : 'border-amber-200 bg-amber-50 text-gray-600 cursor-not-allowed'
                                }`}
                        />

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-gray-600">Font size</label>
                                <span className="text-xs font-semibold text-brand-blue-600">
                                    {Math.round(selectedPreviewRegion.fontSize)}
                                </span>
                            </div>
                            <input
                                type="range"
                                min="6"
                                max="72"
                                step="1"
                                value={selectedPreviewRegion.fontSize}
                                onChange={(e) => updateEditForRegion(selectedRegion.id, { fontSize: Number(e.target.value) })}
                                disabled
                                className="w-full h-2 rounded-lg appearance-none cursor-not-allowed bg-gray-200 opacity-60"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-600">Font family</label>
                            <select
                                value={getEditForRegion(selectedRegion.id).fontFamily ?? ''}
                                onChange={(e) => updateEditForRegion(selectedRegion.id, { fontFamily: e.target.value })}
                                disabled
                                className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                            >
                                {FONT_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-600">Text color</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={selectedPreviewRegion.color.startsWith('#') ? selectedPreviewRegion.color : '#111827'}
                                    onChange={(e) => updateEditForRegion(selectedRegion.id, { color: e.target.value })}
                                    disabled
                                    className="w-10 h-10 rounded-lg border-2 border-gray-300 cursor-not-allowed opacity-60"
                                />
                                <input
                                    type="text"
                                    value={selectedPreviewRegion.color}
                                    onChange={(e) => updateEditForRegion(selectedRegion.id, { color: e.target.value })}
                                    readOnly
                                    className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-mono bg-gray-50 text-gray-400 cursor-not-allowed"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-600">Alignment</label>
                            <div className="flex items-center gap-2">
                                {([
                                    { value: 'left', icon: AlignLeft, label: 'Left' },
                                    { value: 'center', icon: AlignCenter, label: 'Center' },
                                    { value: 'right', icon: AlignRight, label: 'Right' }
                                ] as const).map(option => {
                                    const Icon = option.icon;
                                    const active = selectedPreviewRegion.alignment === option.value;

                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => updateEditForRegion(selectedRegion.id, { alignment: option.value })}
                                            disabled
                                            className={`flex-1 py-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 cursor-not-allowed ${active
                                                ? 'bg-brand-blue-50 border-brand-blue-500 text-brand-blue-700 opacity-60'
                                                : 'bg-white border-gray-200 text-gray-400 opacity-60'
                                                }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            {option.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <button
                            onClick={() => resetEditForRegion(selectedRegion.id)}
                            disabled={!hasMeaningfulEdit(selectedRegion)}
                            className="w-full flex items-center justify-center px-3 py-2 border-2 border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                            Reset Selected Region
                        </button>
                    </div>
                ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                        <Type className="w-6 h-6 text-gray-400 mx-auto" />
                        <p className="text-xs text-gray-500 mt-2">Hover a text region, then click to edit it in place.</p>
                    </div>
                )}
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-200">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    Edits Summary
                </label>
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-600">
                        {editSummary.edits.length + editSummary.unsupported.length} edited regions across the document
                    </p>
                    {editSummary.unsupported.length > 0 && (
                        <p className="text-[11px] text-amber-600 mt-1">
                            {editSummary.unsupported.length} edits are not yet supported for true PDF editing.
                        </p>
                    )}
                    <button
                        onClick={resetAllEdits}
                        className="text-xs text-red-500 hover:text-red-600 hover:underline mt-2"
                    >
                        Clear all edits
                    </button>
                </div>
            </div>

            {actionError && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-2 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 font-medium">{actionError}</p>
                </div>
            )}
        </div>
    );

    if (!activeFile) {
        return (
            <PdfUploadHero
                onFilesSelect={(files) => {
                    if (files.length > 0) {
                        setActiveFile(files[0]);
                    }
                }}
                accept={hero.accept}
                multiple={hero.multiple}
                title={hero.title}
                description={hero.description}
                buttonLabel={hero.buttonLabel}
                dropLabel={hero.dropLabel}
            />
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-hidden font-sans">
            <textarea
                ref={hiddenEditorRef}
                value={selectedRegion ? getPreviewRegion(selectedRegion).text : ''}
                onChange={(e) => {
                    if (!selectedRegion || !selectedTextEditable) return;
                    updateRegionText(selectedRegion.id, e.target.value);
                }}
                className="fixed -left-[9999px] top-0 h-px w-px opacity-0 pointer-events-none"
                tabIndex={selectedTextEditable ? 0 : -1}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
            />

            <main className="flex-grow flex min-h-0">
                <aside className="hidden md:flex w-48 flex-shrink-0 bg-white border-r border-gray-200 flex-col shadow-sm">
                    <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                            Pages
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">{pageNumbers.length} total</p>
                    </div>

                    <div className="flex-grow overflow-y-auto p-3 space-y-3 custom-scrollbar">
                        {isPdfLoading && pageNumbers.length === 0 ? (
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

                <div
                    ref={previewContainerRef}
                    className="flex-grow flex flex-col items-center justify-center bg-gray-100 p-4 pb-28 md:p-8 md:pb-8 relative"
                >
                    {isPdfLoading || (!canShowPreview && isPreviewLoading) ? (
                        <div className="flex items-center justify-center w-full h-full">
                            <LoadingSpinner />
                        </div>
                    ) : pdfLoadStatus === 'error' ? (
                        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center max-w-md">
                            <AlertCircle className="w-6 h-6 text-red-500 mx-auto" />
                            <p className="text-sm text-gray-700 mt-2 font-semibold">Unable to load this PDF.</p>
                            <p className="text-xs text-gray-500 mt-1">
                                {pdfLoadError || 'Please try a different file.'}
                            </p>
                        </div>
                    ) : previewStatus === 'error' ? (
                        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center max-w-md">
                            <AlertCircle className="w-6 h-6 text-red-500 mx-auto" />
                            <p className="text-sm text-gray-700 mt-2 font-semibold">Unable to render the PDF preview.</p>
                            <p className="text-xs text-gray-500 mt-1">
                                {previewError || 'Please try a different file.'}
                            </p>
                        </div>
                    ) : (
                        <div className="relative flex items-center justify-center w-full h-full">
                            <div className="relative inline-block shadow-2xl">
                                <canvas ref={pdfCanvasRef} className="block" />

                                <div
                                    className="absolute top-0 left-0"
                                    style={{ width: canvasSize.width, height: canvasSize.height }}
                                    onClick={() => {
                                        setSelectedRegionId(null);
                                        setHoveredRegionId(null);
                                    }}
                                >
                                    {activeRegions.map((region) => {
                                        const previewRegion = getPreviewRegion(region);
                                        const regionSupport = getEditSupport(region);
                                        const isSelected = selectedRegionId === region.id;
                                        const isHovered = hoveredRegionId === region.id;
                                        const interactionPadding = getInteractionPadding(previewRegion.fontSize);

                                        const left = (previewRegion.x - interactionPadding.x) * renderScale;
                                        const top = (previewRegion.y - interactionPadding.y) * renderScale;
                                        const width = (previewRegion.width + interactionPadding.x * 2) * renderScale;
                                        const height = (previewRegion.height + interactionPadding.y * 2) * renderScale;

                                        return (
                                            <div
                                                key={region.id}
                                                data-edit-region-id={region.id}
                                                data-edit-region-text={previewRegion.text}
                                                data-edit-region-editable={region.canEdit ? 'true' : 'false'}
                                                className={`absolute ${isSelected ? 'z-20' : 'z-10'}`}
                                                style={{
                                                    left,
                                                    top,
                                                    width,
                                                    height,
                                                    transformOrigin: 'top left',
                                                    transform: `rotate(${previewRegion.rotation}rad)`
                                                }}
                                                onMouseEnter={() => {
                                                    console.info('[edit-pdf] Hover entered text region', {
                                                        id: region.id,
                                                        text: previewRegion.text,
                                                        page: activePage,
                                                        viewportBounds: { left, top, width, height },
                                                        canEdit: region.canEdit
                                                    });
                                                    setHoveredRegionId(region.id);
                                                }}
                                                onMouseLeave={() => setHoveredRegionId(current => current === region.id ? null : current)}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    console.info('[edit-pdf] Clicked text region', {
                                                        id: region.id,
                                                        text: previewRegion.text,
                                                        page: activePage,
                                                        canEdit: region.canEdit,
                                                        supportReasons: regionSupport.reasons
                                                    });
                                                    setSelectedRegionId(region.id);
                                                    if (regionSupport.supported) {
                                                        hiddenEditorRef.current?.focus();
                                                        inlineEditorRef.current?.focus();
                                                    }
                                                }}
                                            >
                                                <div
                                                    className={`absolute inset-[1px] rounded-sm transition-all ${debugRegionOverlay
                                                        ? isSelected
                                                            ? regionSupport.supported
                                                                ? 'border-2 border-brand-blue-500 bg-brand-blue-500/15 shadow-[0_10px_28px_-18px_rgba(37,99,235,0.7)]'
                                                                : 'border-2 border-amber-500 bg-amber-400/15 shadow-[0_10px_28px_-18px_rgba(217,119,6,0.45)]'
                                                            : isHovered
                                                                ? regionSupport.supported
                                                                    ? 'border border-dashed border-brand-blue-400/90 bg-brand-blue-400/10'
                                                                    : 'border border-dashed border-amber-400/90 bg-amber-400/10'
                                                                : regionSupport.supported
                                                                    ? 'border border-emerald-500/70 bg-emerald-400/10'
                                                                    : 'border border-amber-500/70 bg-amber-300/10'
                                                        : isSelected
                                                            ? regionSupport.supported
                                                                ? 'border-2 border-brand-blue-500 shadow-[0_10px_28px_-18px_rgba(37,99,235,0.7)]'
                                                                : 'border-2 border-amber-500 shadow-[0_10px_28px_-18px_rgba(217,119,6,0.45)]'
                                                            : isHovered
                                                                ? regionSupport.supported
                                                                    ? 'border border-dashed border-brand-blue-400/90'
                                                                    : 'border border-dashed border-amber-400/90'
                                                                : 'border border-transparent'
                                                        }`}
                                                />

                                                {isSelected && regionSupport.supported && (
                                                    <input
                                                        ref={inlineEditorRef}
                                                        type="text"
                                                        value={previewRegion.text}
                                                        onChange={(event) => updateRegionText(region.id, event.target.value)}
                                                        onKeyDown={(event) => {
                                                            if (event.key === 'Enter') {
                                                                event.preventDefault();
                                                                toast.error('This selection supports single-line editing only. New lines are not supported yet.');
                                                            }
                                                            event.stopPropagation();
                                                        }}
                                                        className="absolute inset-0 bg-transparent border-none outline-none text-gray-900"
                                                        style={{
                                                            fontSize: `${previewRegion.fontSize * renderScale}px`,
                                                            fontFamily: previewRegion.fontFamily || 'inherit',
                                                            color: previewRegion.color,
                                                            lineHeight: `${previewRegion.height * renderScale}px`,
                                                            height: `${previewRegion.height * renderScale}px`,
                                                            padding: 0,
                                                            margin: 0,
                                                            caretColor: previewRegion.color
                                                        }}
                                                        spellCheck={false}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {selectedRegion && selectedSupport?.supported && (
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/75 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                                    <Edit3 className="w-4 h-4" />
                                    True-edit preview active. Typing updates the selected text region directly.
                                </div>
                            )}
                            {selectedRegion && selectedSupport && !selectedSupport.supported && (
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-amber-600 text-white px-4 py-2 rounded-lg text-sm">
                                    This text block is not yet supported for true editing.
                                </div>
                            )}

                            {canShowNoEditableText && (
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-amber-600 text-white px-4 py-2 rounded-lg text-sm">
                                    No editable text found on this page
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <MobileLayout
                    settingsTitle="Edit Options"
                    settingsContent={settingsContent}
                    pagesPanel={{
                        content: pagesPanelContent,
                        title: 'Pages'
                    }}
                    actionButton={{
                        label: 'Export Edited PDF',
                        onClick: handleApplyEdits,
                        disabled: isProcessing || hasUnsupportedEdits || engineStatus !== 'ready',
                        isProcessing: isProcessing,
                        processingText: 'Processing...'
                    }}
                >
                    <></>
                </MobileLayout>

                <aside className="hidden md:flex w-96 flex-shrink-0 bg-white border-l border-gray-200 flex-col h-full shadow-lg z-20">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                            <Settings className="w-4 h-4 text-brand-blue-600" />
                            Edit Options
                        </h2>
                    </div>

                    <div className="flex-grow overflow-y-auto custom-scrollbar">
                        {settingsContent}
                    </div>

                    <div className="p-5 border-t border-gray-200 bg-gray-50">
                        <button
                            onClick={handleApplyEdits}
                            disabled={isProcessing || hasUnsupportedEdits || engineStatus !== 'ready'}
                            className="relative overflow-hidden w-full text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center text-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-blue-700 hover:shadow-xl"
                            style={{
                                background: isProcessing ? '#e5e7eb' : '#2563eb'
                            }}
                        >
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
                                        Applying Edits...
                                    </>
                                ) : (
                                    <>
                                        Export Edited PDF
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </>
                                )}
                            </span>
                        </button>

                        <ToolCTAs variant="sidebar" />
                    </div>
                </aside>
            </main>
        </div>
    );
};

export default EditPdfTool;

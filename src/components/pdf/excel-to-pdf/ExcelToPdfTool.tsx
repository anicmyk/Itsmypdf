import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import {
    Plus,
    FileSpreadsheet,
    Download,
    ChevronDown,
    Grid3X3,
    Minimize2,
    RotateCcw,
    FileText,
    Settings,
    Layers,
    ArrowRight,
    Loader2,
    AlertTriangle,
    Table,
    Eye
} from 'lucide-react';
import { ToolCTAs } from '@/components/pdf/shared/ToolCTAs';
import { PdfPageCard } from '@/components/pdf/shared/PdfPageCard';
import { LoadingSpinner } from '@/components/pdf/shared/LoadingSpinner';
import { MobileLayout } from '@/components/pdf/shared/MobileLayout';
import { TOOL_HERO_UI } from '@/lib/toolHeroConfig';

// Set up PDF.js worker
if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;
}

// Type definitions
interface SheetData {
    name: string;
    data: any[][];
    headers: string[];
}

interface ConversionSettings {
    orientation: 'portrait' | 'landscape' | 'auto';
    fitToWidth: boolean;
    showGridlines: boolean;
    selectedSheets: string[] | 'all';
    repeatHeader: boolean;
    margin: 'normal' | 'narrow' | 'none';
}

// Helper to get Excel column letter
const getColumnLetter = (index: number): string => {
    let letter = '';
    let temp = index;
    while (temp >= 0) {
        letter = String.fromCharCode((temp % 26) + 65) + letter;
        temp = Math.floor(temp / 26) - 1;
    }
    return letter;
};

// Upload Hero Component
const excelHero = TOOL_HERO_UI['excel-to-pdf'];

const ExcelUploadHero: React.FC<{
    onFileSelect: (file: File) => void;
}> = ({ onFileSelect }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.types.includes('Files')) {
            setIsDragging(true);
            if (dragTimeoutRef.current) {
                clearTimeout(dragTimeoutRef.current);
                dragTimeoutRef.current = null;
            }
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.types.includes('Files')) {
            setIsDragging(true);
            if (dragTimeoutRef.current) {
                clearTimeout(dragTimeoutRef.current);
                dragTimeoutRef.current = null;
            }
        }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (dragTimeoutRef.current) {
            clearTimeout(dragTimeoutRef.current);
        }
        dragTimeoutRef.current = setTimeout(() => {
            setIsDragging(false);
            dragTimeoutRef.current = null;
        }, 50);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (dragTimeoutRef.current) {
            clearTimeout(dragTimeoutRef.current);
            dragTimeoutRef.current = null;
        }
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.name.match(/\.(xlsx|xls|csv)$/i)) {
                onFileSelect(file);
            } else {
                toast.error('Please upload an Excel file (.xlsx, .xls) or CSV');
            }
        }
    }, [onFileSelect]);

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            onFileSelect(event.target.files[0]);
        }
    };

    useEffect(() => {
        return () => {
            if (dragTimeoutRef.current) {
                clearTimeout(dragTimeoutRef.current);
            }
        };
    }, []);

    return (
        <div
            className="flex-grow h-full flex items-center justify-center p-8 relative"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {isDragging && (
                <div className="fixed top-16 inset-x-0 bottom-0 bg-gray-900/95 backdrop-blur-md flex items-center justify-center z-[9999] pointer-events-none">
                    <div className="text-center">
                        <div className="mb-6">
                            <div className="w-32 h-32 mx-auto bg-brand-blue-500/20 rounded-full flex items-center justify-center">
                                <FileSpreadsheet className="w-16 h-16 text-brand-blue-400" />
                            </div>
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
                            Drop Excel file here
                        </h2>
                        <p className="text-base sm:text-xl text-gray-300">
                            Release to upload
                        </p>
                    </div>
                </div>
            )}

            <div className="text-center">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-800">{excelHero.title}</h1>
                <p className="mt-4 text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto">
                    {excelHero.description}
                </p>
                <div className="mt-10">
                    <button
                        onClick={handleButtonClick}
                        className="w-full sm:w-auto bg-brand-blue-600 text-white font-bold py-3.5 sm:py-4 px-6 sm:px-10 rounded-lg hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl text-lg sm:text-xl inline-flex items-center justify-center"
                    >
                        <Plus className="h-6 w-6 mr-3" />
                        {excelHero.buttonLabel ?? 'Select Excel File'}
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept={excelHero.accept ?? '.xlsx,.xls,.csv'}
                    />
                </div>
                <p className="mt-4 text-gray-500">{excelHero.dropLabel ?? 'or drop Excel file here'}</p>
                <ToolCTAs variant="hero" />
            </div>
        </div>
    );
};

// Main Component
const ExcelToPdfTool: React.FC = () => {
    const [activeFile, setActiveFile] = useState<File | null>(null);
    const [sheets, setSheets] = useState<SheetData[]>([]);
    const [activeSheetIndex, setActiveSheetIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [settings, setSettings] = useState<ConversionSettings>({
        orientation: 'auto',
        fitToWidth: true,
        showGridlines: true,
        selectedSheets: 'all',
        repeatHeader: true,
        margin: 'normal'
    });
    const [sheetDropdownOpen, setSheetDropdownOpen] = useState(false);
    const [hasCharts, setHasCharts] = useState(false);

    // PDF Preview state
    const [previewMode, setPreviewMode] = useState<'source' | 'pdf'>('source');
    const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [pdfPages, setPdfPages] = useState<number[]>([]);
    const [activePdfPage, setActivePdfPage] = useState<number>(1);
    const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
    const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
    const previewContainerRef = useRef<HTMLDivElement>(null);

    // Parse Excel file
    const parseExcel = useCallback(async (file: File) => {
        setIsLoading(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });

            // Detect charts (check for chart sheets or embedded charts)
            const chartDetected = workbook.SheetNames.some(name => {
                const sheet = workbook.Sheets[name];
                return sheet['!charts'] || name.toLowerCase().includes('chart');
            });
            setHasCharts(chartDetected);

            const parsedSheets: SheetData[] = workbook.SheetNames.map(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
                const headers = jsonData[0]?.map(h => String(h ?? '')) ?? [];
                const data = jsonData.slice(1);

                return { name: sheetName, headers, data };
            });

            setSheets(parsedSheets);
            setActiveSheetIndex(0);
            toast.success(`Loaded ${parsedSheets.length} sheet${parsedSheets.length > 1 ? 's' : ''}`);
        } catch (error) {
            console.error('Error parsing Excel:', error);
            toast.error('Failed to parse Excel file');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleFileSelect = useCallback((file: File) => {
        setActiveFile(file);
        parseExcel(file);
    }, [parseExcel]);

    const getEffectiveOrientation = useCallback((columnCount: number): 'portrait' | 'landscape' => {
        if (settings.orientation === 'auto') {
            return columnCount > 5 ? 'landscape' : 'portrait';
        }
        return settings.orientation;
    }, [settings.orientation]);

    const handleConvertToPdf = useCallback(async () => {
        if (sheets.length === 0) {
            toast.error('No data to convert');
            return;
        }

        setIsConverting(true);
        toast.loading('Converting to PDF...', { id: 'pdf-convert' });

        try {
            const sheetsToConvert = settings.selectedSheets === 'all'
                ? sheets
                : sheets.filter(s => (settings.selectedSheets as string[]).includes(s.name));

            if (sheetsToConvert.length === 0) {
                toast.error('No sheets selected', { id: 'pdf-convert' });
                setIsConverting(false);
                return;
            }

            const maxColumns = Math.max(...sheetsToConvert.map(s => s.headers.length));
            const orientation = getEffectiveOrientation(maxColumns);

            const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

            sheetsToConvert.forEach((sheet, sheetIndex) => {
                if (sheetIndex > 0) doc.addPage();

                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.text(sheet.name, 14, 15);

                const tableHeaders = sheet.headers.map(h => ({ header: h, dataKey: h }));
                const tableBody = sheet.data.map(row => {
                    const rowObj: Record<string, any> = {};
                    sheet.headers.forEach((header, idx) => {
                        rowObj[header] = row[idx] ?? '';
                    });
                    return rowObj;
                });

                // Calculate margins based on preset
                const marginValues = {
                    normal: { top: 25, right: 25, bottom: 25, left: 25 },
                    narrow: { top: 12, right: 12, bottom: 12, left: 12 },
                    none: { top: 5, right: 5, bottom: 5, left: 5 }
                };
                const margins = marginValues[settings.margin];

                const tableStyles: any = {
                    startY: 22,
                    theme: settings.showGridlines ? 'grid' : 'plain',
                    showHead: settings.repeatHeader ? 'everyPage' : 'firstPage',
                    headStyles: {
                        fillColor: settings.showGridlines ? [37, 99, 235] : [255, 255, 255],
                        textColor: settings.showGridlines ? [255, 255, 255] : [0, 0, 0],
                        fontStyle: 'bold',
                        lineWidth: settings.showGridlines ? 0.1 : 0
                    },
                    bodyStyles: { lineWidth: settings.showGridlines ? 0.1 : 0 },
                    tableWidth: settings.fitToWidth ? 'auto' : undefined,
                    styles: { overflow: 'linebreak', cellPadding: 2, fontSize: 9 },
                    columnStyles: {},
                    margin: margins
                };

                if (settings.fitToWidth && sheet.headers.length > 0) {
                    const pageWidth = orientation === 'landscape' ? 297 : 210;
                    const usableWidth = pageWidth - (margins.left + margins.right);
                    const columnWidth = usableWidth / sheet.headers.length;
                    sheet.headers.forEach((_, idx) => {
                        tableStyles.columnStyles[idx] = { cellWidth: columnWidth };
                    });
                }

                autoTable(doc, { columns: tableHeaders, body: tableBody, ...tableStyles });
            });

            const fileName = activeFile?.name.replace(/\.(xlsx|xls|csv)$/i, '') ?? 'spreadsheet';
            doc.save(`${fileName}.pdf`);
            toast.success('PDF created successfully!', { id: 'pdf-convert' });
        } catch (error) {
            console.error('Error converting to PDF:', error);
            toast.error('Failed to convert to PDF', { id: 'pdf-convert' });
        } finally {
            setIsConverting(false);
        }
    }, [sheets, settings, activeFile, getEffectiveOrientation]);

    // Generate PDF for preview (in-memory, no download)
    const generatePdfPreview = useCallback(async () => {
        if (sheets.length === 0) return;

        setIsGeneratingPreview(true);
        try {
            const sheetsToConvert = settings.selectedSheets === 'all'
                ? sheets
                : sheets.filter(s => (settings.selectedSheets as string[]).includes(s.name));

            if (sheetsToConvert.length === 0) {
                toast.error('No sheets selected');
                return;
            }

            const maxColumns = Math.max(...sheetsToConvert.map(s => s.headers.length));
            const orientation = getEffectiveOrientation(maxColumns);

            const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

            sheetsToConvert.forEach((sheet, sheetIndex) => {
                if (sheetIndex > 0) doc.addPage();

                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.text(sheet.name, 14, 15);

                const tableHeaders = sheet.headers.map(h => ({ header: h, dataKey: h }));
                const tableBody = sheet.data.map(row => {
                    const rowObj: Record<string, any> = {};
                    sheet.headers.forEach((header, idx) => {
                        rowObj[header] = row[idx] ?? '';
                    });
                    return rowObj;
                });

                const marginValues = {
                    normal: { top: 25, right: 25, bottom: 25, left: 25 },
                    narrow: { top: 12, right: 12, bottom: 12, left: 12 },
                    none: { top: 5, right: 5, bottom: 5, left: 5 }
                };
                const margins = marginValues[settings.margin];

                const tableStyles: any = {
                    startY: 22,
                    theme: settings.showGridlines ? 'grid' : 'plain',
                    showHead: settings.repeatHeader ? 'everyPage' : 'firstPage',
                    headStyles: {
                        fillColor: settings.showGridlines ? [37, 99, 235] : [255, 255, 255],
                        textColor: settings.showGridlines ? [255, 255, 255] : [0, 0, 0],
                        fontStyle: 'bold',
                        lineWidth: settings.showGridlines ? 0.1 : 0
                    },
                    bodyStyles: { lineWidth: settings.showGridlines ? 0.1 : 0 },
                    tableWidth: settings.fitToWidth ? 'auto' : undefined,
                    styles: { overflow: 'linebreak', cellPadding: 2, fontSize: 9 },
                    columnStyles: {},
                    margin: margins
                };

                if (settings.fitToWidth && sheet.headers.length > 0) {
                    const pageWidth = orientation === 'landscape' ? 297 : 210;
                    const usableWidth = pageWidth - (margins.left + margins.right);
                    const columnWidth = usableWidth / sheet.headers.length;
                    sheet.headers.forEach((_, idx) => {
                        tableStyles.columnStyles[idx] = { cellWidth: columnWidth };
                    });
                }

                autoTable(doc, { columns: tableHeaders, body: tableBody, ...tableStyles });
            });

            // Get PDF as blob for preview
            const pdfOutput = doc.output('arraybuffer');
            const blob = new Blob([pdfOutput], { type: 'application/pdf' });
            setPdfBlob(blob);

            // Load with PDF.js
            const loadingTask = pdfjsLib.getDocument({ data: pdfOutput });
            const pdf = await loadingTask.promise;
            setPdfDoc(pdf);
            setPdfPages(Array.from({ length: pdf.numPages }, (_, i) => i + 1));
            setActivePdfPage(1);

        } catch (error) {
            console.error('Error generating PDF preview:', error);
            toast.error('Failed to generate preview');
        } finally {
            setIsGeneratingPreview(false);
        }
    }, [sheets, settings, getEffectiveOrientation]);

    // Render PDF page to canvas
    const renderPdfPage = useCallback(async () => {
        if (!pdfDoc || !pdfCanvasRef.current || !previewContainerRef.current) return;

        try {
            const page = await pdfDoc.getPage(activePdfPage);
            const canvas = pdfCanvasRef.current;
            const container = previewContainerRef.current;

            const containerWidth = container.clientWidth - 40;
            const containerHeight = container.clientHeight - 40;

            const viewport = page.getViewport({ scale: 1 });
            const scaleX = containerWidth / viewport.width;
            const scaleY = containerHeight / viewport.height;
            const scale = Math.min(scaleX, scaleY, 1.5);

            const scaledViewport = page.getViewport({ scale });
            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;

            const ctx = canvas.getContext('2d', { alpha: false });
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
            }
        } catch (error) {
            console.error('Error rendering PDF page:', error);
        }
    }, [pdfDoc, activePdfPage]);

    // Effect to render PDF page when it changes
    useEffect(() => {
        if (previewMode === 'pdf' && pdfDoc) {
            renderPdfPage();
        }
    }, [previewMode, pdfDoc, activePdfPage, renderPdfPage]);

    // Handle switching to PDF preview mode
    const handlePreviewModeChange = useCallback(async (mode: 'source' | 'pdf') => {
        setPreviewMode(mode);
        if (mode === 'pdf' && !pdfDoc) {
            await generatePdfPreview();
        }
    }, [pdfDoc, generatePdfPreview]);

    const handleReset = () => {
        setActiveFile(null);
        setSheets([]);
        setActiveSheetIndex(0);
        setHasCharts(false);
        setPreviewMode('source');
        setPdfBlob(null);
        setPdfDoc(null);
        setPdfPages([]);
        setActivePdfPage(1);
        setSettings({ orientation: 'auto', fitToWidth: true, showGridlines: true, selectedSheets: 'all', repeatHeader: true, margin: 'normal' });
    };

    const currentSheet = sheets[activeSheetIndex];

    if (!activeFile) {
        return (
            <div className="flex flex-col h-full bg-gray-50 font-sans">
                <ExcelUploadHero onFileSelect={handleFileSelect} />
            </div>
        );
    }

    // Settings content for mobile
    const settingsContent = (
        <div className="p-5 space-y-6">
            {sheets.length > 1 && (
                <>
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Sheets to include:</label>
                        <div className="relative">
                            <button onClick={() => setSheetDropdownOpen(!sheetDropdownOpen)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-left flex items-center justify-between">
                                <span className="text-sm">{settings.selectedSheets === 'all' ? 'All Sheets' : `${(settings.selectedSheets as string[]).length} selected`}</span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${sheetDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                        </div>
                    </div>
                    <div className="h-px bg-gray-100" />
                </>
            )}
            <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Page orientation:</label>
                <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setSettings(s => ({ ...s, orientation: 'auto' }))} className={`px-3 py-2.5 text-sm rounded-xl border transition-all font-medium ${settings.orientation === 'auto' ? 'bg-brand-blue-600 text-white border-brand-blue-600' : 'bg-white text-gray-700 border-gray-200'}`}>Smart</button>
                    <button onClick={() => setSettings(s => ({ ...s, orientation: 'portrait' }))} className={`px-3 py-2.5 text-sm rounded-xl border transition-all font-medium ${settings.orientation === 'portrait' ? 'bg-brand-blue-600 text-white border-brand-blue-600' : 'bg-white text-gray-700 border-gray-200'}`}>Portrait</button>
                    <button onClick={() => setSettings(s => ({ ...s, orientation: 'landscape' }))} className={`px-3 py-2.5 text-sm rounded-xl border transition-all font-medium ${settings.orientation === 'landscape' ? 'bg-brand-blue-600 text-white border-brand-blue-600' : 'bg-white text-gray-700 border-gray-200'}`}>Landscape</button>
                </div>
            </div>
            <div className="h-px bg-gray-100" />
            <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Table style:</label>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setSettings(s => ({ ...s, showGridlines: true }))} className={`flex flex-col items-center justify-center p-4 bg-white border rounded-xl transition-all ${settings.showGridlines ? 'border-brand-blue-600 bg-brand-blue-50' : 'border-gray-200'}`}>
                        <Grid3X3 className={`w-6 h-6 mb-2 ${settings.showGridlines ? 'text-brand-blue-500' : 'text-gray-400'}`} />
                        <span className="text-sm font-medium">With Borders</span>
                    </button>
                    <button onClick={() => setSettings(s => ({ ...s, showGridlines: false }))} className={`flex flex-col items-center justify-center p-4 bg-white border rounded-xl transition-all ${!settings.showGridlines ? 'border-brand-blue-600 bg-brand-blue-50' : 'border-gray-200'}`}>
                        <FileText className={`w-6 h-6 mb-2 ${!settings.showGridlines ? 'text-brand-blue-500' : 'text-gray-400'}`} />
                        <span className="text-sm font-medium">No Borders</span>
                    </button>
                </div>
            </div>
        </div>
    );

    // Pages panel for PDF preview mode
    const pagesPanelContent = previewMode === 'pdf' && pdfPages.length > 0 ? (
        <div className="p-3 space-y-3">
            {pdfPages.map((pageNum) => (
                <div key={pageNum} onClick={() => setActivePdfPage(pageNum)} className="cursor-pointer">
                    <div className={`transition-all rounded ${activePdfPage === pageNum ? 'ring-2 ring-brand-blue-500' : ''}`}>
                        <PdfPageCard pageNumber={pageNum} file={pdfBlob ? new File([pdfBlob], 'preview.pdf') : undefined} pageIndex={pageNum - 1} isSelected={activePdfPage === pageNum} rotation={0} />
                    </div>
                    <div className={`text-center text-xs font-medium mt-1.5 ${activePdfPage === pageNum ? 'text-brand-blue-600' : 'text-gray-600'}`}>Page {pageNum}</div>
                </div>
            ))}
        </div>
    ) : undefined;

    return (
        <div className="flex h-[calc(100vh-64px)] bg-gray-100 font-sans">
            <MobileLayout
                settingsTitle="Export Options"
                settingsContent={settingsContent}
                pagesPanel={pagesPanelContent ? { content: pagesPanelContent, title: 'PDF Pages' } : undefined}
                actionButton={{
                    label: 'Convert to PDF',
                    onClick: handleConvertToPdf,
                    disabled: isConverting || sheets.length === 0,
                    isProcessing: isConverting,
                    processingText: 'Converting...'
                }}
            >
                <></>
            </MobileLayout>

            {/* PDF Preview - Left Sidebar Thumbnails (only visible in PDF mode) - HIDDEN ON MOBILE */}
            {previewMode === 'pdf' && (
                <aside className="hidden md:flex w-48 flex-shrink-0 bg-white border-r border-gray-200 flex-col shadow-sm">
                    <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Pages</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{pdfPages.length} total</p>
                    </div>
                    <div className="flex-grow overflow-y-auto p-3 space-y-3 custom-scrollbar">
                        {isGeneratingPreview ? (
                            <div className="flex items-center justify-center py-8">
                                <LoadingSpinner />
                            </div>
                        ) : pdfBlob ? (
                            pdfPages.map((pageNum) => (
                                <div key={pageNum} onClick={() => setActivePdfPage(pageNum)} className="group cursor-pointer transition-all duration-200">
                                    <div className={`overflow-hidden transition-all ${activePdfPage === pageNum
                                        ? 'ring-2 ring-brand-blue-500 shadow-md'
                                        : 'hover:ring-1 hover:ring-gray-300'
                                        }`}>
                                        <PdfPageCard
                                            pageNumber={pageNum}
                                            file={new File([pdfBlob], 'preview.pdf', { type: 'application/pdf' })}
                                            pageIndex={pageNum - 1}
                                            isSelected={false}
                                            onClick={() => setActivePdfPage(pageNum)}
                                            rotation={0}
                                        />
                                    </div>
                                    <div className={`text-center text-xs font-medium mt-1.5 transition-colors ${activePdfPage === pageNum ? 'text-brand-blue-600 font-semibold' : 'text-gray-500'}`}>
                                        {pageNum}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-gray-400 py-4 text-sm">No preview</div>
                        )}
                    </div>
                </aside>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-gray-100 p-6 overflow-hidden">
                {/* View Toggle Tabs */}
                <div className="flex items-center gap-2 mb-4">
                    <button
                        onClick={() => handlePreviewModeChange('source')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${previewMode === 'source'
                            ? 'bg-white text-brand-blue-600 shadow-md border border-brand-blue-200'
                            : 'bg-white/50 text-gray-600 hover:bg-white hover:shadow-sm border border-transparent'
                            }`}
                    >
                        <Table className="w-4 h-4" />
                        Source Data
                    </button>
                    <button
                        onClick={() => handlePreviewModeChange('pdf')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${previewMode === 'pdf'
                            ? 'bg-white text-brand-blue-600 shadow-md border border-brand-blue-200'
                            : 'bg-white/50 text-gray-600 hover:bg-white hover:shadow-sm border border-transparent'
                            }`}
                    >
                        <Eye className="w-4 h-4" />
                        PDF Preview
                        {isGeneratingPreview && <Loader2 className="w-3 h-3 animate-spin" />}
                    </button>
                </div>

                {/* Content Area */}
                {previewMode === 'source' ? (
                    /* Source Data View - Excel Table */
                    <div className="flex-1 flex flex-col bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                        {/* Excel Toolbar */}
                        <div className="flex items-center justify-between px-4 py-2 bg-[#217346] text-white">
                            <div className="flex items-center gap-3">
                                <FileSpreadsheet className="w-5 h-5" />
                                <span className="font-medium truncate max-w-[300px]">{activeFile.name}</span>
                            </div>
                            <button onClick={handleReset} className="text-white/80 hover:text-white p-1.5 rounded hover:bg-white/10 transition-colors" title="Upload new file">
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Formula Bar */}
                        <div className="flex items-center border-b border-gray-200 bg-gray-50">
                            <div className="px-3 py-1.5 border-r border-gray-200 bg-white min-w-[80px] text-center text-sm font-medium text-gray-600">
                                {currentSheet?.name || 'Sheet1'}
                            </div>
                            <div className="flex-1 px-3 py-1.5 text-sm text-gray-500 italic">
                                {currentSheet ? `${currentSheet.headers.length} columns × ${currentSheet.data.length} rows` : ''}
                            </div>
                        </div>

                        {/* Table Preview */}
                        <div className="flex-1 overflow-auto">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <div className="w-12 h-12 border-4 border-brand-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                        <p className="text-gray-600">Loading spreadsheet...</p>
                                    </div>
                                </div>
                            ) : currentSheet ? (
                                <table className="w-full text-[13px]" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                                    <thead className="sticky top-0 z-10">
                                        <tr>
                                            <th className="px-3 py-2 text-center font-medium text-gray-400 bg-gradient-to-b from-gray-100 to-gray-50 border-b border-r border-gray-200 min-w-[50px] text-xs tracking-wide"></th>
                                            {currentSheet.headers.map((_, idx) => (
                                                <th key={idx} className="px-3 py-2 text-center font-medium text-gray-500 bg-gradient-to-b from-gray-100 to-gray-50 border-b border-r border-gray-200 min-w-[140px] text-xs tracking-wide">
                                                    {getColumnLetter(idx)}
                                                </th>
                                            ))}
                                        </tr>
                                        <tr className="bg-gradient-to-r from-brand-blue-600 to-brand-blue-500 text-white shadow-md">
                                            <th className="px-3 py-3 text-center font-semibold bg-brand-blue-700 min-w-[50px] text-xs border-r border-brand-blue-400/50">1</th>
                                            {currentSheet.headers.map((header, idx) => (
                                                <th key={idx} className="px-4 py-3 text-left font-semibold border-r border-brand-blue-400/30 min-w-[140px] tracking-wide">
                                                    {header || `Column ${idx + 1}`}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentSheet.data.slice(0, 100).map((row, rowIdx) => (
                                            <tr key={rowIdx} className={`transition-colors duration-150 ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-blue-50/50'} hover:bg-brand-blue-50`}>
                                                <td className="px-3 py-2.5 text-center text-gray-400 bg-gradient-to-b from-gray-50 to-gray-100 font-medium text-xs border-b border-r border-gray-200">
                                                    {rowIdx + 2}
                                                </td>
                                                {currentSheet.headers.map((_, colIdx) => (
                                                    <td key={colIdx} className="px-4 py-2.5 border-b border-r border-gray-100 text-gray-700">
                                                        {row[colIdx] ?? ''}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-500">No data to display</div>
                            )}
                        </div>

                        {currentSheet && currentSheet.data.length > 100 && (
                            <div className="px-4 py-2 bg-amber-50 text-amber-800 text-sm border-t">
                                Showing first 100 rows of {currentSheet.data.length} total rows
                            </div>
                        )}

                        {/* Sheet Tabs */}
                        {sheets.length > 1 && (
                            <div className="flex items-center gap-0 border-t border-gray-200 bg-[#E6E6E6]">
                                {sheets.map((sheet, idx) => (
                                    <button key={sheet.name} onClick={() => setActiveSheetIndex(idx)}
                                        className={`px-4 py-2 text-sm font-medium border-r border-gray-300 transition-colors ${idx === activeSheetIndex
                                            ? 'bg-white text-gray-800 border-t-2 border-t-[#217346]'
                                            : 'bg-[#E6E6E6] text-gray-600 hover:bg-[#D4D4D4]'
                                            }`}>
                                        {sheet.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    /* PDF Preview View */
                    <div ref={previewContainerRef} className="flex-1 flex flex-col items-center justify-center bg-gray-200 rounded-lg overflow-hidden">
                        {isGeneratingPreview ? (
                            <div className="flex flex-col items-center justify-center">
                                <LoadingSpinner />
                                <p className="mt-4 text-gray-600">Generating PDF preview...</p>
                            </div>
                        ) : pdfDoc ? (
                            <div className="relative flex items-center justify-center w-full h-full p-4">
                                <canvas ref={pdfCanvasRef} className="shadow-2xl bg-white" />
                            </div>
                        ) : (
                            <div className="text-gray-500 text-center">
                                <Eye className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                <p>Click "PDF Preview" to generate preview</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Right Panel - Export Options Sidebar - HIDDEN ON MOBILE */}
            <div className="hidden md:flex w-96 bg-white border-l border-gray-200 h-full flex-col flex-shrink-0 z-20 shadow-xl">
                <div className="p-5 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-brand-blue-600" />
                        Export Options
                    </h2>
                </div>

                <div className="p-5 space-y-6 flex-grow overflow-y-auto custom-scrollbar">
                    {/* Sheet Selection - only if multiple sheets */}
                    {sheets.length > 1 && (
                        <>
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">Sheets to include:</label>
                                <div className="relative">
                                    <button
                                        onClick={() => setSheetDropdownOpen(!sheetDropdownOpen)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-left flex items-center justify-between hover:border-brand-blue-300 transition-colors"
                                    >
                                        <span className="text-sm">{settings.selectedSheets === 'all' ? 'All Sheets' : `${(settings.selectedSheets as string[]).length} selected`}</span>
                                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${sheetDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {sheetDropdownOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 py-1">
                                            <button onClick={() => { setSettings(s => ({ ...s, selectedSheets: 'all' })); setSheetDropdownOpen(false); }}
                                                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${settings.selectedSheets === 'all' ? 'bg-brand-blue-50 text-brand-blue-700' : ''}`}>
                                                All Sheets
                                            </button>
                                            {sheets.map(sheet => {
                                                const isSelected = settings.selectedSheets !== 'all' && (settings.selectedSheets as string[]).includes(sheet.name);
                                                return (
                                                    <button key={sheet.name} onClick={() => setSettings(s => {
                                                        const current = s.selectedSheets === 'all' ? [] : [...s.selectedSheets as string[]];
                                                        return isSelected ? { ...s, selectedSheets: current.filter(n => n !== sheet.name) } : { ...s, selectedSheets: [...current, sheet.name] };
                                                    })} className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${isSelected ? 'bg-brand-blue-50 text-brand-blue-700' : ''}`}>
                                                        <div className={`w-4 h-4 border rounded flex items-center justify-center text-xs ${isSelected ? 'bg-brand-blue-600 border-brand-blue-600 text-white' : 'border-gray-300'}`}>
                                                            {isSelected && '✓'}
                                                        </div>
                                                        {sheet.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="h-px bg-gray-100" />
                        </>
                    )}

                    {/* Page Orientation */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Page orientation:</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => setSettings(s => ({ ...s, orientation: 'auto' }))}
                                className={`px-3 py-2.5 text-sm rounded-xl border transition-all font-medium ${settings.orientation === 'auto'
                                    ? 'bg-brand-blue-600 text-white border-brand-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:border-brand-blue-200'}`}>
                                Smart
                            </button>
                            <button onClick={() => setSettings(s => ({ ...s, orientation: 'portrait' }))}
                                className={`px-3 py-2.5 text-sm rounded-xl border transition-all font-medium ${settings.orientation === 'portrait'
                                    ? 'bg-brand-blue-600 text-white border-brand-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:border-brand-blue-200'}`}>
                                Portrait
                            </button>
                            <button onClick={() => setSettings(s => ({ ...s, orientation: 'landscape' }))}
                                className={`px-3 py-2.5 text-sm rounded-xl border transition-all font-medium ${settings.orientation === 'landscape'
                                    ? 'bg-brand-blue-600 text-white border-brand-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:border-brand-blue-200'}`}>
                                Landscape
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1.5">Smart: Automatically picks best fit based on columns</p>
                    </div>

                    <div className="h-px bg-gray-100" />

                    {/* Table Style */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Table style:</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setSettings(s => ({ ...s, showGridlines: true }))}
                                className={`flex flex-col items-center justify-center p-4 bg-white border rounded-xl transition-all ${settings.showGridlines
                                    ? 'border-brand-blue-600 bg-brand-blue-50 text-brand-blue-700 shadow-sm' : 'border-gray-200 hover:border-brand-blue-200'}`}>
                                <Grid3X3 className={`w-6 h-6 mb-2 ${settings.showGridlines ? 'text-brand-blue-500' : 'text-gray-400'}`} />
                                <span className="text-sm font-medium">With Borders</span>
                            </button>
                            <button onClick={() => setSettings(s => ({ ...s, showGridlines: false }))}
                                className={`flex flex-col items-center justify-center p-4 bg-white border rounded-xl transition-all ${!settings.showGridlines
                                    ? 'border-brand-blue-600 bg-brand-blue-50 text-brand-blue-700 shadow-sm' : 'border-gray-200 hover:border-brand-blue-200'}`}>
                                <FileText className={`w-6 h-6 mb-2 ${!settings.showGridlines ? 'text-brand-blue-500' : 'text-gray-400'}`} />
                                <span className="text-sm font-medium">No Borders</span>
                            </button>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100" />

                    {/* Scale Option */}
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-sm font-medium text-gray-700">Fit columns to page</span>
                            <p className="text-xs text-gray-500">Scale table to fit page width</p>
                        </div>
                        <button onClick={() => setSettings(s => ({ ...s, fitToWidth: !s.fitToWidth }))}
                            className={`relative w-11 h-6 rounded-full transition-colors ${settings.fitToWidth ? 'bg-brand-blue-600' : 'bg-gray-300'}`}>
                            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.fitToWidth ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    <div className="h-px bg-gray-100" />

                    {/* Repeat Header Row */}
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-sm font-medium text-gray-700">Repeat column headers</span>
                            <p className="text-xs text-gray-500">Show headers on every page</p>
                        </div>
                        <button onClick={() => setSettings(s => ({ ...s, repeatHeader: !s.repeatHeader }))}
                            className={`relative w-11 h-6 rounded-full transition-colors ${settings.repeatHeader ? 'bg-brand-blue-600' : 'bg-gray-300'}`}>
                            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.repeatHeader ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    <div className="h-px bg-gray-100" />

                    {/* Page Margins */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Page margins:</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => setSettings(s => ({ ...s, margin: 'normal' }))}
                                className={`px-3 py-2.5 text-sm rounded-xl border transition-all font-medium ${settings.margin === 'normal'
                                    ? 'bg-brand-blue-600 text-white border-brand-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:border-brand-blue-200'}`}>
                                Normal
                            </button>
                            <button onClick={() => setSettings(s => ({ ...s, margin: 'narrow' }))}
                                className={`px-3 py-2.5 text-sm rounded-xl border transition-all font-medium ${settings.margin === 'narrow'
                                    ? 'bg-brand-blue-600 text-white border-brand-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:border-brand-blue-200'}`}>
                                Narrow
                            </button>
                            <button onClick={() => setSettings(s => ({ ...s, margin: 'none' }))}
                                className={`px-3 py-2.5 text-sm rounded-xl border transition-all font-medium ${settings.margin === 'none'
                                    ? 'bg-brand-blue-600 text-white border-brand-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:border-brand-blue-200'}`}>
                                None
                            </button>
                        </div>
                    </div>

                    {/* Chart Warning */}
                    {hasCharts && (
                        <>
                            <div className="h-px bg-gray-100" />
                            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-amber-800">Charts detected</p>
                                    <p className="text-xs text-amber-700 mt-0.5">Charts may appear differently in the PDF output.</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Convert Button */}
                <div className="p-5 border-t border-gray-200 bg-gray-50 mt-auto">
                    <button onClick={handleConvertToPdf} disabled={isConverting || sheets.length === 0}
                        className="w-full text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center text-lg shadow-lg transition-all duration-200 disabled:cursor-not-allowed hover:bg-brand-blue-700 hover:shadow-xl"
                        style={{ background: isConverting ? '#9ca3af' : '#2563eb' }}>
                        {isConverting ? (
                            <><Loader2 className="animate-spin h-5 w-5 mr-2" />Converting...</>
                        ) : (
                            <>Convert to PDF<ArrowRight className="w-5 h-5 ml-2" /></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExcelToPdfTool;


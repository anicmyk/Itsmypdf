import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, degrees } from 'pdf-lib';
import { Settings, Trash2, RotateCw, GripVertical, Plus, ArrowRight } from 'lucide-react';
import { LoadingSpinner } from '@/components/pdf/shared/LoadingSpinner';
import { MobileLayout } from '@/components/pdf/shared/MobileLayout';
import { ToolCTAs } from '@/components/pdf/shared/ToolCTAs';
import { PdfUploadHero } from '@/components/pdf/shared/PdfUploadHero';
import { PdfPageCard } from '../shared/PdfPageCard';
import { TOOL_HERO_UI } from '@/lib/toolHeroConfig';
import OrganizePdfSEOContent from './OrganizePdfSEOContent';
import { ORGANIZE_PDF_TRUST_POINTS } from '@/lib/organizePdfPageData';

// Set up PDF.js worker
if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;
}

const hero = TOOL_HERO_UI['organize-pdf'];

// --- TYPES ---
interface Page {
    id: string;
    originalFile?: File;
    originalIndex: number;
    rotation: number;
    isBlank?: boolean;
    // We need pdfDoc for PdfPageCard if we use it, OR we keep LazyThumbnail if PdfPageCard is too complex to adapt.
    // PdfPageCard requires a pdfDoc proxy object, which we get from pdfjsLib.getDocument().
    // OrganizePDFTool currently loads `pdf` in `updatePages` loop. We can store it.
    pdfDocProxy?: any;
}

// --- ICONS ---
const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
);

const FileTextIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);


// --- SUB-COMPONENTS ---



const OrganizeSettings: React.FC<{
    files: File[];
    onRemoveFile: (fileToRemove: File) => void;
    onResetAll: () => void;
    onOrganize: () => void;
    onAddMoreFiles: () => void;
    onReorderFiles: (newFiles: File[]) => void;
    isLoading: boolean;
    progress: number;
}> = ({ files, onRemoveFile, onResetAll, onOrganize, onAddMoreFiles, onReorderFiles, isLoading, progress }) => {
    const dragFileIndex = useRef<number | null>(null);

    const onDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        dragFileIndex.current = index;
        e.dataTransfer.effectAllowed = 'move';
    };

    const onDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.preventDefault();
        if (dragFileIndex.current === null || dragFileIndex.current === index) return;
    };

    const onDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
        e.preventDefault();
        if (dragFileIndex.current === null) return;

        const dragIndex = dragFileIndex.current;
        if (dragIndex === dropIndex) return;

        const newFiles = [...files];
        const [movedFile] = newFiles.splice(dragIndex, 1);
        newFiles.splice(dropIndex, 0, movedFile);

        onReorderFiles(newFiles);
        dragFileIndex.current = null;
    };

    // Extract settings content for mobile
    const settingsContent = (
        <div className="p-4 space-y-4">
            <div className="bg-brand-blue-50 border border-brand-blue-100 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-brand-blue-100 rounded-full text-brand-blue-600 mt-1">
                        <div className="w-4 h-4 rounded-sm border-2 border-current"></div>
                    </div>
                    <div>
                        <h3 className="font-bold text-brand-blue-800 text-sm">How to organize?</h3>
                        <p className="text-xs text-brand-blue-700 mt-1 leading-relaxed">
                            Drag and drop pages to reorder. Tap a page to rotate or delete it.
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between mt-2">
                <label className="text-sm font-semibold text-gray-700">Files ({files.length})</label>
                <button
                    onClick={onAddMoreFiles}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1 min-h-[44px]"
                >
                    <PlusIcon className="w-3 h-3" />
                    Add File
                </button>
            </div>

            <div className="space-y-2">
                {files.map((file, index) => (
                    <div
                        key={`${file.name}-${index}`}
                        draggable
                        onDragStart={(e) => onDragStart(e, index)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => onDrop(e, index)}
                        className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-200/75 group hover:border-brand-blue-200 transition-all cursor-move active:cursor-grabbing hover:shadow-sm min-h-[56px]"
                    >
                        <div className="flex items-center min-w-0">
                            <GripVertical className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0 cursor-grab active:cursor-grabbing" />
                            <FileTextIcon className="w-5 h-5 text-gray-400 flex-shrink-0 mr-3 group-hover:text-brand-blue-500 transition-colors" />
                            <span className="text-sm text-gray-800 truncate" title={file.name}>{file.name}</span>
                        </div>
                        <button
                            onClick={() => onRemoveFile(file)}
                            className="p-1 text-gray-400 hover:text-brand-blue-600 ml-2 flex-shrink-0 rounded-full hover:bg-blue-50 transition-all md:opacity-0 md:group-hover:opacity-100 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
                            aria-label={`Remove ${file.name}`}
                            disabled={isLoading}
                        >
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            <button
                onClick={onResetAll}
                className="w-full text-sm font-medium text-brand-blue-600 hover:text-brand-blue-700 disabled:text-gray-400 transition-colors py-2 px-3 border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[48px]"
                disabled={isLoading}
            >
                Reset all
            </button>
        </div>
    );

    return (
        <>
            {/* Mobile Layout */}
            <MobileLayout
                settingsTitle="Organize PDF"
                settingsContent={settingsContent}
                actionButton={{
                    label: 'Organize',
                    onClick: onOrganize,
                    disabled: isLoading,
                    isProcessing: isLoading,
                    processingText: `Organizing... ${progress}%`,
                    progress: progress
                }}
            >
                <></>
            </MobileLayout>

            {/* Desktop Sidebar - HIDDEN on mobile */}
            <aside className="hidden md:flex w-96 flex-shrink-0 bg-white border-l border-gray-200 flex-col h-full shadow-lg z-20">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-brand-blue-600" />
                        Organize PDF
                    </h2>
                    <button
                        onClick={onResetAll}
                        className="text-sm font-medium text-brand-blue-600 hover:text-brand-blue-700 disabled:text-gray-400 transition-colors"
                        disabled={isLoading}
                    >
                        Reset all
                    </button>
                </div>

                <div className="flex-grow p-5 flex flex-col space-y-4 overflow-y-auto custom-scrollbar">
                    <div className="bg-brand-blue-50 border border-brand-blue-100 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-brand-blue-100 rounded-full text-brand-blue-600 mt-1">
                                <div className="w-4 h-4 rounded-sm border-2 border-current"></div>
                            </div>
                            <div>
                                <h3 className="font-bold text-brand-blue-800 text-sm">How to organize?</h3>
                                <p className="text-xs text-brand-blue-700 mt-1 leading-relaxed">
                                    Drag and drop pages to reorder. Hover over a page to rotate or delete it.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                        <label className="text-sm font-semibold text-gray-700">Files ({files.length})</label>
                        <button
                            onClick={onAddMoreFiles}
                            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1"
                        >
                            <PlusIcon className="w-3 h-3" />
                            Add File
                        </button>
                    </div>

                    <div className="space-y-2">
                        {files.map((file, index) => (
                            <div
                                key={`${file.name}-${index}`}
                                draggable
                                onDragStart={(e) => onDragStart(e, index)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => onDrop(e, index)}
                                className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-200/75 group hover:border-brand-blue-200 transition-all cursor-move active:cursor-grabbing hover:shadow-sm"
                            >
                                <div className="flex items-center min-w-0">
                                    <GripVertical className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0 cursor-grab active:cursor-grabbing" />
                                    <FileTextIcon className="w-5 h-5 text-gray-400 flex-shrink-0 mr-3 group-hover:text-brand-blue-500 transition-colors" />
                                    <span className="text-sm text-gray-800 truncate" title={file.name}>{file.name}</span>
                                </div>
                                <button
                                    onClick={() => onRemoveFile(file)}
                                    className="p-1 text-gray-400 hover:text-brand-blue-600 ml-2 flex-shrink-0 rounded-full hover:bg-blue-50 transition-all opacity-0 group-hover:opacity-100"
                                    aria-label={`Remove ${file.name}`}
                                    disabled={isLoading}
                                >
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-5 border-t border-gray-200 bg-gray-50 mt-auto flex-shrink-0">
                    <button
                        onClick={onOrganize}
                        disabled={isLoading || files.length === 0}
                        className="relative overflow-hidden w-full text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center text-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-blue-700 hover:shadow-xl"
                        style={{
                            background: isLoading ? '#e5e7eb' : '#2563eb'
                        }}
                    >
                        {/* Progress fill animation */}
                        {isLoading && (
                            <div
                                className="absolute inset-0 bg-brand-blue-600 transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        )}

                        <span className="relative z-10 flex items-center">
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                    Organizing... {progress}%
                                </>
                            ) : (
                                <>
                                    Organize
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </>
                            )}
                        </span>
                    </button>
                    
                    {/* Bookmark and Share CTAs */}
                    <ToolCTAs variant="sidebar" />
                </div>
            </aside>
        </>
    );
};

const OrganizePreview: React.FC<{
    files: File[];
    pages: Page[];
    setPages: React.Dispatch<React.SetStateAction<Page[]>>;
    isProcessing: boolean;
}> = ({ files, pages, setPages, isProcessing }) => {
    const dragPageId = useRef<string | null>(null);
    const [dropIndex, setDropIndex] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleRotatePage = useCallback((pageId: string) => {
        setPages(currentPages => currentPages.map(p =>
            p.id === pageId ? { ...p, rotation: (p.rotation + 90) % 360 } : p
        ));
    }, [setPages]);

    const handleDeletePage = useCallback((pageId: string) => {
        setPages(currentPages => currentPages.filter(p => p.id !== pageId));
    }, [setPages]);

    const handleAddBlankPage = useCallback((index: number, position: 'left' | 'right') => {
        setPages(currentPages => {
            const newPages = [...currentPages];
            const insertIndex = position === 'left' ? index : index + 1;
            const newPage: Page = {
                id: `blank-${Date.now()}-${Math.random()}`,
                originalIndex: -1,
                rotation: 0,
                isBlank: true
            };
            newPages.splice(insertIndex, 0, newPage);
            return newPages;
        });
    }, [setPages]);

    const onDragStart = (e: React.DragEvent<HTMLDivElement>, pageId: string) => {
        dragPageId.current = pageId;
        setIsDragging(true);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', pageId);
    };

    const onDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.preventDefault();
        if (dragPageId.current === null) return;

        const draggedPageIndex = pages.findIndex(p => p.id === dragPageId.current);
        if (draggedPageIndex === index) {
            setDropIndex(null);
            return;
        }

        setDropIndex(index);
    };

    const onDragLeave = () => {
        // setDropIndex(null);
    };

    const onDrop = (index: number) => {
        if (dragPageId.current === null) return;

        const draggedPageIndex = pages.findIndex(p => p.id === dragPageId.current);
        if (draggedPageIndex === -1) return;

        const draggedPage = pages[draggedPageIndex];

        const newPages = [...pages];
        newPages.splice(draggedPageIndex, 1);
        newPages.splice(index, 0, draggedPage);

        setPages(newPages);
        dragPageId.current = null;
        setDropIndex(null);
    };

    const onDragEnd = () => {
        dragPageId.current = null;
        setIsDragging(false);
        setDropIndex(null);
    };

    return (
        <div className="flex-grow p-4 pb-28 md:p-8 md:pb-8 flex flex-col items-center overflow-y-auto bg-gray-100">
            {isProcessing && pages.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-grow">
                    <LoadingSpinner />
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 max-w-6xl mx-auto w-full pb-4">
                    {pages.map((page, index) => (
                        <div
                            key={page.id}
                            className="relative"
                            onDragOver={(e) => onDragOver(e, index)}
                            onDrop={() => onDrop(index)}
                            onDragLeave={onDragLeave}
                        >
                            {dropIndex === index && <div className="absolute top-0 bottom-0 -left-3 w-1 bg-brand-blue-500 rounded-full animate-fade-in z-20" />}

                            <div
                                className="flex flex-col items-center space-y-2 flex-shrink-0 relative"
                                draggable
                                onDragStart={(e) => onDragStart(e, page.id)}
                                onDragEnd={onDragEnd}
                            >
                                <div className="relative group/pagecard flex-shrink-0">
                                    {/* Add Buttons - centered on card edges */}
                                    {!isDragging && (
                                        <>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleAddBlankPage(index, 'left'); }}
                                                className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 opacity-0 group-hover/pagecard:opacity-100 transition-opacity duration-200 bg-brand-blue-600 text-white rounded-full p-1.5 shadow-lg hover:bg-brand-blue-700 hover:scale-110"
                                                title="Insert blank page before"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleAddBlankPage(index, 'right'); }}
                                                className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 z-20 opacity-0 group-hover/pagecard:opacity-100 transition-opacity duration-200 bg-brand-blue-600 text-white rounded-full p-1.5 shadow-lg hover:bg-brand-blue-700 hover:scale-110"
                                                title="Insert blank page after"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}

                                    <PdfPageCard
                                        pageNumber={page.originalIndex + 1}
                                        pdfDoc={page.pdfDocProxy}
                                        rotation={page.rotation}
                                        className={`cursor-grab active:cursor-grabbing overflow-hidden group-hover/pagecard:shadow-lg group-hover/pagecard:-translate-y-1 group-hover/pagecard:border-brand-blue-300 transition-all duration-200 ${isDragging && dragPageId.current === page.id ? 'opacity-50' : ''}`}
                                    >
                                        {/* Overlay Actions */}
                                        <div className="absolute top-2 right-2 z-20 opacity-0 group-hover/pagecard:opacity-100 transition-opacity flex items-center gap-1.5">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleRotatePage(page.id); }}
                                                className="h-7 w-7 flex items-center justify-center bg-white/95 backdrop-blur-sm rounded-full shadow-md hover:bg-white text-gray-700 hover:text-brand-blue-600 transition-all hover:scale-110 active:scale-95 border border-gray-200 flex-shrink-0"
                                                aria-label="Rotate page"
                                            >
                                                <RotateCw className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeletePage(page.id); }}
                                                className="h-7 w-7 flex items-center justify-center bg-white/95 backdrop-blur-sm rounded-full shadow-md hover:bg-white text-gray-700 hover:text-brand-blue-600 transition-all hover:scale-110 active:scale-95 border border-gray-200 flex-shrink-0"
                                                aria-label="Delete page"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        {page.isBlank && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-white text-gray-300 text-xs italic z-10">
                                                Blank Page
                                            </div>
                                        )}
                                    </PdfPageCard>
                                </div>
                                <span className="text-sm font-medium text-gray-600">
                                    {page.isBlank ? 'Blank' : `Page ${page.originalIndex + 1}`}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


const OrganizeToolLayout: React.FC<{
    files: File[];
    onRemoveFile: (file: File) => void;
    onAddMoreFiles: (files: FileList) => void;
    onReorderFiles: (newFiles: File[]) => void;
}> = ({ files, onRemoveFile, onAddMoreFiles, onReorderFiles }) => {
    const [pages, setPages] = useState<Page[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isOrganizing, setIsOrganizing] = useState(false);
    const [organizeProgress, setOrganizeProgress] = useState(0);
    const addFilesInputRef = useRef<HTMLInputElement>(null);

    // Initial load and file parsing
    useEffect(() => {
        const updatePages = async () => {
            const currentFileSet = new Set(files);
            
            // Keep existing valid pages & blank pages
            const pagesToKeep = pages.filter(p => !p.originalFile || currentFileSet.has(p.originalFile));

            // Identify processed files
            const processedFiles = new Set(pagesToKeep.map(p => p.originalFile).filter(Boolean));
            const newFiles = files.filter(f => !processedFiles.has(f));

            // Check if file order changed
            const existingOrder = Array.from(processedFiles);
            let orderChanged = existingOrder.length !== files.length;
            if (!orderChanged) {
                for (let i = 0; i < files.length; i++) {
                    if (files[i] !== existingOrder[i]) {
                        orderChanged = true;
                        break;
                    }
                }
            }

            if (newFiles.length === 0 && !orderChanged && pagesToKeep.length === pages.length) return;

            const newPagesByFile = new Map<File, Page[]>();

            if (newFiles.length > 0) {
                setIsProcessing(true);
                for (const file of newFiles) {
                    try {
                        const arrayBuffer = await file.arrayBuffer();
                        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                        const filePages: Page[] = [];
                        for (let i = 0; i < pdf.numPages; i++) {
                            filePages.push({
                                id: `${file.name}-${i}-${Math.random().toString(36).substr(2, 9)}`,
                                originalFile: file,
                                originalIndex: i,
                                rotation: 0,
                                pdfDocProxy: pdf
                            });
                        }
                        newPagesByFile.set(file, filePages);
                    } catch (error) {
                        console.error("Failed to process file:", file.name, error);
                    }
                }
                setIsProcessing(false);
            }

            const nextPages: Page[] = [];

            // Add pages in the new file order to reflect sidebar ordering
            for (const file of files) {
                if (newPagesByFile.has(file)) {
                    nextPages.push(...newPagesByFile.get(file)!);
                } else {
                    const filePages = pagesToKeep.filter(p => p.originalFile === file);
                    nextPages.push(...filePages);
                }
            }

            // Append floating blank pages (if any) to the end
            const blankPages = pagesToKeep.filter(p => !p.originalFile);
            nextPages.push(...blankPages);

            setPages(nextPages);
        };

        updatePages();
    }, [files]);

    const handleResetAll = () => {
        // Reset means reloading all pages from current files in default order with 0 rotation
        // We can trigger this by clearing pages and letting the effect re-run, or manually re-running logic.
        // Simplest: clear pages, let effect rebuild.
        setPages([]);
        // Note: the effect above checks "processedFiles" against "pages". If pages is empty, it will re-process everything.
    };

    const handleOrganize = async () => {
        if (pages.length === 0) return;
        setIsOrganizing(true);
        setOrganizeProgress(0);

        try {
            const newPdfDoc = await PDFDocument.create();
            const pdfCache = new Map<File, PDFDocument>();

            setOrganizeProgress(10);
            const totalPages = pages.length;

            for (let i = 0; i < totalPages; i++) {
                const page = pages[i];
                if (page.isBlank) {
                    const { width, height } = { width: 595.28, height: 841.89 };
                    const blankPage = newPdfDoc.addPage([width, height]);
                    blankPage.setRotation(degrees(page.rotation));
                } else if (page.originalFile) {
                    let sourcePdfDoc = pdfCache.get(page.originalFile);
                    if (!sourcePdfDoc) {
                        const arrayBuffer = await page.originalFile.arrayBuffer();
                        sourcePdfDoc = await PDFDocument.load(arrayBuffer);
                        pdfCache.set(page.originalFile, sourcePdfDoc);
                    }

                    const [copiedPage] = await newPdfDoc.copyPages(sourcePdfDoc, [page.originalIndex]);
                    copiedPage.setRotation(degrees(copiedPage.getRotation().angle + page.rotation));
                    newPdfDoc.addPage(copiedPage);
                }
                
                // Update progress: 10-80% for processing pages
                setOrganizeProgress(10 + Math.floor((i + 1) / totalPages * 70));
            }

            setOrganizeProgress(85);
            const pdfBytes = await newPdfDoc.save();
            
            setOrganizeProgress(95);
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `organized_pdf_${Date.now()}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            setOrganizeProgress(100);

        } catch (error) {
            console.error("Error organizing PDF:", error);
            alert("An error occurred while organizing the PDF.");
        } finally {
            setIsOrganizing(false);
            setOrganizeProgress(0);
        }
    };

    const handleAddMoreClick = () => {
        addFilesInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            onAddMoreFiles(event.target.files);
        }
    };

    return (
        <main className="flex-grow flex min-h-0">
            <input
                type="file"
                ref={addFilesInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="application/pdf"
                multiple
            />
            <OrganizePreview
                files={files}
                pages={pages}
                setPages={setPages}
                isProcessing={isProcessing}
            />
            <OrganizeSettings
                files={files}
                onRemoveFile={onRemoveFile}
                onResetAll={handleResetAll}
                onOrganize={handleOrganize}
                onAddMoreFiles={handleAddMoreClick}
                onReorderFiles={onReorderFiles}
                isLoading={isOrganizing}
                progress={organizeProgress}
            />
        </main>
    );
};


const OrganizeTool: React.FC = () => {
    const [files, setFiles] = useState<File[]>([]);

    const handleFilesSelect = useCallback((selectedFiles: FileList) => {
        const newFiles = Array.from(selectedFiles);
        setFiles(prevFiles => {
            const combined = [...prevFiles, ...newFiles];
            return combined;
        });
    }, []);

    const handleAddMoreFiles = useCallback((addedFiles: FileList) => {
        setFiles(prevFiles => [...prevFiles, ...Array.from(addedFiles)]);
    }, []);

    const handleRemoveFile = useCallback((fileToRemove: File) => {
        setFiles(prevFiles => prevFiles.filter(file => file !== fileToRemove));
    }, []);

    const handleReorderFiles = useCallback((newFiles: File[]) => {
        setFiles(newFiles);
    }, []);

    return (
        <>
            <div
                className={`flex flex-col h-full w-full bg-gray-50 font-sans overflow-y-scroll ${files.length > 0 ? 'hidden' : ''}`}
                style={{ scrollbarGutter: 'stable' }}
            >
                {/* Tool container taking up most of the viewport */}
                <div className="flex-grow flex items-center justify-center p-4 md:p-8">
                    <PdfUploadHero
                        onFilesSelect={handleFilesSelect}
                        title={hero.title}
                        description={hero.description}
                        accept={hero.accept}
                        multiple={hero.multiple}
                        icon={<PlusIcon className="h-6 w-6 mr-3" />}
                        trustPoints={ORGANIZE_PDF_TRUST_POINTS}
                    />
                </div>

                <OrganizePdfSEOContent />
            </div>

            <div className={`flex flex-col h-full bg-gray-50 overflow-hidden font-sans ${files.length === 0 ? 'hidden' : ''}`}>
                <OrganizeToolLayout
                    files={files}
                    onRemoveFile={handleRemoveFile}
                    onAddMoreFiles={handleAddMoreFiles}
                    onReorderFiles={handleReorderFiles}
                />
            </div>
        </>
    );
};

export default OrganizeTool;




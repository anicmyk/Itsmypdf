import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Plus, ArrowRight, Settings, CheckCircle, Zap, X, AlertTriangle, Info } from 'lucide-react';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { compressPdf } from '@/utils/pdfProcessor';
import { toast } from 'sonner';
import { PdfUploadHero } from '../shared/PdfUploadHero';
import { PdfPageCard } from '../shared/PdfPageCard';
import { MobileLayout } from '../shared/MobileLayout';
import { ToolCTAs } from '../shared/ToolCTAs';
import { TOOL_HERO_UI } from '@/lib/toolHeroConfig';

// Set up PDF.js
if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;
}

const hero = TOOL_HERO_UI['compress-pdf'];

interface PDFFile {
    id: string;
    file: File;
    pdfDoc: any;
    pageCount: number;
}

const CompressPDFTool: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCompressing, setIsCompressing] = useState(false);
    const [compressionProgress, setCompressionProgress] = useState(0);
    const [compressionLevel, setCompressionLevel] = useState<'recommended' | 'extreme'>('recommended');
    const [compressionMode, setCompressionMode] = useState<'smart' | 'aggressive' | 'lossless'>('smart');

    // Load PDFs
    const handleFileSelect = async (files: FileList | File[]) => {
        const fileArray = Array.from(files);
        const pdfFilesToAdd: PDFFile[] = [];

        setIsLoading(true);

        try {
            for (const file of fileArray) {
                if (file.type !== 'application/pdf') {
                    continue;
                }

                const url = URL.createObjectURL(file);
                try {
                    const loadedPdfDoc = await pdfjsLib.getDocument({ url }).promise;
                    const pageCount = loadedPdfDoc.numPages;

                    pdfFilesToAdd.push({
                        id: `${Date.now()}-${Math.random()}`,
                        file,
                        pdfDoc: loadedPdfDoc,
                        pageCount
                    });
                } catch (error) {
                    console.error('Error loading PDF:', file.name, error);
                } finally {
                    URL.revokeObjectURL(url);
                }
            }

            if (pdfFilesToAdd.length > 0) {
                setPdfFiles(prev => [...prev, ...pdfFilesToAdd]);
            }

            setIsLoading(false);
        } catch (error) {
            console.error('Error processing files:', error);
            setIsLoading(false);
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileSelect(files);
        }
    };

    const handleDropZoneClick = () => {
        fileInputRef.current?.click();
    };

    const removePDF = (id: string) => {
        setPdfFiles(prev => {
            const fileToRemove = prev.find(f => f.id === id);
            if (fileToRemove && fileToRemove.pdfDoc && fileToRemove.pdfDoc.destroy) {
                fileToRemove.pdfDoc.destroy().catch(() => { });
            }
            return prev.filter(f => f.id !== id);
        });
    };

    // Cleanup on unmount
    const pdfFilesRef = useRef(pdfFiles);
    useEffect(() => {
        pdfFilesRef.current = pdfFiles;
    }, [pdfFiles]);

    useEffect(() => {
        return () => {
            pdfFilesRef.current.forEach(pdfFile => {
                if (pdfFile.pdfDoc && pdfFile.pdfDoc.destroy) {
                    pdfFile.pdfDoc.destroy().catch(() => { });
                }
            });
        };
    }, []);

    const handleCompress = async () => {
        if (pdfFiles.length === 0) return;

        setIsCompressing(true);
        setCompressionProgress(0);

        try {
            const totalFiles = pdfFiles.length;

            for (let i = 0; i < totalFiles; i++) {
                const pdfFile = pdfFiles[i];

                // Calculate base progress for this file
                const baseProgress = Math.floor((i / totalFiles) * 100);
                const progressPerFile = Math.floor(100 / totalFiles);

                // Show initial progress for this file
                setCompressionProgress(baseProgress);

                // Add intermediate progress updates for better UX
                const progressInterval = setInterval(() => {
                    setCompressionProgress(prev => {
                        const target = baseProgress + Math.floor(progressPerFile * 0.9);
                        if (prev < target) {
                            return Math.min(prev + 5, target);
                        }
                        return prev;
                    });
                }, 100);

                const result = await compressPdf(pdfFile.file, compressionLevel, compressionMode);

                // Clear the interval
                clearInterval(progressInterval);

                if (result.success && result.blob) {
                    const url = URL.createObjectURL(result.blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = result.filename || 'compressed.pdf';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);

                    const originalSize = (pdfFile.file.size / 1024 / 1024).toFixed(2);
                    const compressedSize = (result.blob.size / 1024 / 1024).toFixed(2);
                    const reduction = ((1 - result.blob.size / pdfFile.file.size) * 100).toFixed(0);
                    const method = (result as any).method || 'Compressed';
                    toast.success(`${method}: ${originalSize}MB → ${compressedSize}MB (${reduction}% reduction)`);
                } else {
                    throw new Error(result.error);
                }

                // Update progress: file completed
                setCompressionProgress(Math.floor(((i + 1) / totalFiles) * 100));
            }

            setCompressionProgress(100);
        } catch (err) {
            console.error('Error compressing PDF:', err);
            toast.error('Failed to compress PDF');
        } finally {
            setTimeout(() => {
                setIsCompressing(false);
                setCompressionProgress(0);
            }, 500);
        }
    };

    if (pdfFiles.length === 0) {
        return (
            <PdfUploadHero
                onFilesSelect={handleFileSelect}
                title={hero.title}
                description={hero.description}
                accept={hero.accept}
                multiple={hero.multiple}
                icon={<Zap className="h-6 w-6 mr-3" />}
            />
        );
    }

    // Extract settings content for mobile panel
    const settingsContent = (
        <div className="p-5 space-y-6">
            <div className="space-y-3">
                <button
                    onClick={handleDropZoneClick}
                    className="w-full bg-brand-blue-600 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-brand-blue-700 active:bg-brand-blue-800 transition-colors duration-200 shadow-sm flex items-center justify-center gap-2 min-h-[48px]"
                >
                    <Plus className="h-5 w-5" />
                    Add PDF files
                    {pdfFiles.length > 0 && (
                        <span className="bg-white/20 text-white text-xs font-bold rounded-full px-2 py-0.5 ml-1">
                            {pdfFiles.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Compression Mode Selection */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    Compression Mode
                </h3>

                {/* Smart Mode (Default) */}
                <button
                    onClick={() => setCompressionMode('smart')}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all min-h-[48px] ${compressionMode === 'smart' ? 'border-brand-blue-500 bg-brand-blue-50' : 'border-gray-200 hover:border-brand-blue-200'}`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-gray-800">Smart (Recommended)</span>
                        {compressionMode === 'smart' && <CheckCircle className="w-5 h-5 text-brand-blue-600" />}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">Compresses images only, preserves text quality.</p>
                    <p className="text-xs text-gray-500">Best for: Documents with photos</p>
                </button>

                {/* Aggressive Mode */}
                <button
                    onClick={() => setCompressionMode('aggressive')}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all min-h-[48px] ${compressionMode === 'aggressive' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-amber-200'}`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-gray-800 flex items-center gap-2">
                            Aggressive (Raster)
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                        </span>
                        {compressionMode === 'aggressive' && <CheckCircle className="w-5 h-5 text-amber-600" />}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">Converts pages to images.</p>
                    <p className="text-xs text-amber-700 font-medium">⚠️ Text will become non-searchable and may appear blurry</p>
                    <p className="text-xs text-gray-500 mt-1">Best for: Scanned documents only</p>
                </button>

                {/* Lossless Mode */}
                <button
                    onClick={() => setCompressionMode('lossless')}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all min-h-[48px] ${compressionMode === 'lossless' ? 'border-brand-blue-500 bg-brand-blue-50' : 'border-gray-200 hover:border-brand-blue-200'}`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-gray-800">Lossless (Metadata Only)</span>
                        {compressionMode === 'lossless' && <CheckCircle className="w-5 h-5 text-brand-blue-600" />}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">Removes metadata only. No quality loss.</p>
                    <p className="text-xs text-gray-500">Best for: When quality must be preserved 100%</p>
                </button>
            </div>

            {/* Warning Banner for Aggressive Mode */}
            {compressionMode === 'aggressive' && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-amber-900">Warning: Aggressive Mode</p>
                            <p className="text-xs text-amber-800 mt-1">
                                This mode will convert text to images. Text will no longer be searchable or selectable. Only use for scanned documents.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Quality Level (only show for Smart and Aggressive modes) */}
            {compressionMode !== 'lossless' && (
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-700">Quality Level</h3>

                    <button
                        onClick={() => setCompressionLevel('recommended')}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all min-h-[48px] ${compressionLevel === 'recommended' ? 'border-brand-blue-500 bg-brand-blue-50' : 'border-gray-200 hover:border-brand-blue-200'}`}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-gray-800">Recommended</span>
                            {compressionLevel === 'recommended' && <CheckCircle className="w-5 h-5 text-brand-blue-600" />}
                        </div>
                        <p className="text-sm text-gray-600">Balanced quality and size.</p>
                    </button>

                    <button
                        onClick={() => setCompressionLevel('extreme')}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all min-h-[48px] ${compressionLevel === 'extreme' ? 'border-brand-blue-500 bg-brand-blue-50' : 'border-gray-200 hover:border-brand-blue-200'}`}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-gray-800">Extreme</span>
                            {compressionLevel === 'extreme' && <CheckCircle className="w-5 h-5 text-brand-blue-600" />}
                        </div>
                        <p className="text-sm text-gray-600">Maximum compression. Lower quality.</p>
                        <p className="text-xs text-amber-700 mt-1">⚠️ May significantly reduce image quality</p>
                    </button>
                </div>
            )}

            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Total Files</span>
                    <span className="font-medium text-gray-900">{pdfFiles.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Total Size</span>
                    <span className="font-medium text-gray-900">
                        {(pdfFiles.reduce((sum, f) => sum + f.file.size, 0) / 1024 / 1024).toFixed(2)} MB
                    </span>
                </div>
                <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200">
                    <span className="text-gray-500">Expected Reduction</span>
                    <span className="font-bold text-brand-blue-600">
                        {compressionMode === 'lossless' ? '~5-15%' :
                            compressionMode === 'aggressive' ?
                                (compressionLevel === 'recommended' ? '~70-80%' : '~85-90%') :
                                '~30-70% (images only)'}
                    </span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-hidden font-sans">
            <main className="flex-grow flex flex-col md:flex-row min-h-0 overflow-hidden">
                <input
                    type="file"
                    ref={fileInputRef}
                    accept="application/pdf"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleFileInputChange}
                />

                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/75 backdrop-blur-sm z-50 animate-fade-in">
                        <div className="text-center">
                            <div className="w-12 h-12 border-4 border-brand-blue-200 border-t-brand-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-gray-600 font-medium">Loading PDFs...</p>
                        </div>
                    </div>
                )}

                {/* Main content: PDF Thumbnails Grid */}
                <div className="flex-grow p-4 md:p-8 flex flex-col items-center overflow-y-auto bg-gray-100 relative pb-24 md:pb-8">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 max-w-6xl mx-auto w-full">
                        {pdfFiles.map((pdfFile) => (
                            <div key={pdfFile.id} className="relative">
                                <div className="group flex flex-col items-center flex-shrink-0">
                                    <PdfPageCard
                                        pageNumber={1}
                                        file={pdfFile.file}
                                        pageIndex={0}
                                    >
                                        {/* Remove button - only show on hover */}
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                                            <button
                                                onClick={() => removePDF(pdfFile.id)}
                                                className="bg-brand-blue-500 text-white rounded-full p-1.5 hover:bg-brand-blue-600 transition-colors duration-200 shadow-lg"
                                                aria-label="Remove PDF"
                                                title="Remove"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>

                                        {/* Filename inside card at bottom */}
                                        <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm px-2 py-1.5 border-t border-gray-200">
                                            <p className="text-xs font-medium text-gray-800 text-center truncate" title={pdfFile.file.name}>
                                                {pdfFile.file.name}
                                            </p>
                                        </div>
                                    </PdfPageCard>

                                    {/* Hover tooltip - shows file size and page count */}
                                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
                                        <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl whitespace-nowrap">
                                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-gray-900" />
                                            {(pdfFile.file.size / 1024 / 1024).toFixed(2)} MB • {pdfFile.pageCount} {pdfFile.pageCount === 1 ? 'page' : 'pages'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Mobile Layout - Settings panel, floating button, action button */}
                <MobileLayout
                    settingsTitle="Compression Options"
                    settingsContent={settingsContent}
                    actionButton={{
                        label: 'Compress PDF',
                        onClick: handleCompress,
                        disabled: false,
                        isProcessing: isCompressing,
                        processingText: 'Compressing...',
                        progress: compressionProgress
                    }}
                >
                    {/* Empty - main content rendered above */}
                    <></>
                </MobileLayout>

                {/* Desktop Sidebar - hidden on mobile */}
                <aside className="hidden md:flex w-96 flex-shrink-0 bg-white border-l border-gray-200 flex-col h-full shadow-lg z-20">
                    <div className="p-5 border-b border-gray-100">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Settings className="w-5 h-5 text-brand-blue-600" />
                            Compression Options
                        </h2>
                    </div>

                    <div className="flex-grow p-5 space-y-6 overflow-y-auto">
                        <div className="space-y-3">
                            <button
                                onClick={handleDropZoneClick}
                                className="w-full bg-brand-blue-600 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-brand-blue-700 transition-colors duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                            >
                                <Plus className="h-5 w-5" />
                                Add PDF files
                                {pdfFiles.length > 0 && (
                                    <span className="bg-white/20 text-white text-xs font-bold rounded-full px-2 py-0.5 ml-1">
                                        {pdfFiles.length}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Compression Mode Selection */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                Compression Mode
                            </h3>

                            {/* Smart Mode (Default) */}
                            <button
                                onClick={() => setCompressionMode('smart')}
                                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${compressionMode === 'smart' ? 'border-brand-blue-500 bg-brand-blue-50' : 'border-gray-200 hover:border-brand-blue-200'}`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-gray-800">Smart (Recommended)</span>
                                    {compressionMode === 'smart' && <CheckCircle className="w-5 h-5 text-brand-blue-600" />}
                                </div>
                                <p className="text-sm text-gray-600 mb-2">Compresses images only, preserves text quality.</p>
                                <p className="text-xs text-gray-500">Best for: Documents with photos</p>
                            </button>

                            {/* Aggressive Mode */}
                            <button
                                onClick={() => setCompressionMode('aggressive')}
                                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${compressionMode === 'aggressive' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-amber-200'}`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-gray-800 flex items-center gap-2">
                                        Aggressive (Raster)
                                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                                    </span>
                                    {compressionMode === 'aggressive' && <CheckCircle className="w-5 h-5 text-amber-600" />}
                                </div>
                                <p className="text-sm text-gray-600 mb-2">Converts pages to images.</p>
                                <p className="text-xs text-amber-700 font-medium">⚠️ Text will become non-searchable and may appear blurry</p>
                                <p className="text-xs text-gray-500 mt-1">Best for: Scanned documents only</p>
                            </button>

                            {/* Lossless Mode */}
                            <button
                                onClick={() => setCompressionMode('lossless')}
                                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${compressionMode === 'lossless' ? 'border-brand-blue-500 bg-brand-blue-50' : 'border-gray-200 hover:border-brand-blue-200'}`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-gray-800">Lossless (Metadata Only)</span>
                                    {compressionMode === 'lossless' && <CheckCircle className="w-5 h-5 text-brand-blue-600" />}
                                </div>
                                <p className="text-sm text-gray-600 mb-2">Removes metadata only. No quality loss.</p>
                                <p className="text-xs text-gray-500">Best for: When quality must be preserved 100%</p>
                            </button>
                        </div>

                        {/* Warning Banner for Aggressive Mode */}
                        {compressionMode === 'aggressive' && (
                            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold text-amber-900">Warning: Aggressive Mode</p>
                                        <p className="text-xs text-amber-800 mt-1">
                                            This mode will convert text to images. Text will no longer be searchable or selectable. Only use for scanned documents.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Quality Level (only show for Smart and Aggressive modes) */}
                        {compressionMode !== 'lossless' && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-gray-700">Quality Level</h3>

                                <button
                                    onClick={() => setCompressionLevel('recommended')}
                                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${compressionLevel === 'recommended' ? 'border-brand-blue-500 bg-brand-blue-50' : 'border-gray-200 hover:border-brand-blue-200'}`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-gray-800">Recommended</span>
                                        {compressionLevel === 'recommended' && <CheckCircle className="w-5 h-5 text-brand-blue-600" />}
                                    </div>
                                    <p className="text-sm text-gray-600">Balanced quality and size.</p>
                                </button>

                                <button
                                    onClick={() => setCompressionLevel('extreme')}
                                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${compressionLevel === 'extreme' ? 'border-brand-blue-500 bg-brand-blue-50' : 'border-gray-200 hover:border-brand-blue-200'}`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-gray-800">Extreme</span>
                                        {compressionLevel === 'extreme' && <CheckCircle className="w-5 h-5 text-brand-blue-600" />}
                                    </div>
                                    <p className="text-sm text-gray-600">Maximum compression. Lower quality.</p>
                                    <p className="text-xs text-amber-700 mt-1">⚠️ May significantly reduce image quality</p>
                                </button>
                            </div>
                        )}



                        <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Total Files</span>
                                <span className="font-medium text-gray-900">{pdfFiles.length}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Total Size</span>
                                <span className="font-medium text-gray-900">
                                    {(pdfFiles.reduce((sum, f) => sum + f.file.size, 0) / 1024 / 1024).toFixed(2)} MB
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200">
                                <span className="text-gray-500">Expected Reduction</span>
                                <span className="font-bold text-brand-blue-600">
                                    {compressionMode === 'lossless' ? '~5-15%' :
                                        compressionMode === 'aggressive' ?
                                            (compressionLevel === 'recommended' ? '~70-80%' : '~85-90%') :
                                            '~30-70% (images only)'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="p-5 border-t border-gray-200 bg-gray-50 mt-auto">
                        <button
                            onClick={handleCompress}
                            disabled={isCompressing}
                            className="relative overflow-hidden w-full text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center text-lg shadow-lg transition-all duration-200 disabled:cursor-not-allowed hover:bg-brand-blue-700 hover:shadow-xl"
                            style={{
                                background: isCompressing ? '#e5e7eb' : '#2563eb'
                            }}
                        >
                            {/* Progress fill animation */}
                            {isCompressing && (
                                <div
                                    className="absolute inset-0 bg-brand-blue-600 transition-all duration-300 ease-out"
                                    style={{ width: `${compressionProgress}%` }}
                                />
                            )}

                            {/* Button content */}
                            <span className="relative z-10 flex items-center">
                                {isCompressing ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                        Compressing... {compressionProgress}%
                                    </>
                                ) : (
                                    <>
                                        Compress PDF
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

export default CompressPDFTool;


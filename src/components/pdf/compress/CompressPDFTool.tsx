import React, { useMemo, useRef, useState } from 'react';
import { Plus, ArrowRight, Settings, CheckCircle, X, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { compressPdf } from '@/utils/pdfProcessor';
import { PdfPageCard } from '../shared/PdfPageCard';
import { MobileLayout } from '../shared/MobileLayout';
import { ToolCTAs } from '../shared/ToolCTAs';
import { CompressPdfEmptyState } from './CompressPdfEmptyState';
import { TOOL_HERO_UI } from '@/lib/toolHeroConfig';
import {
    analyzePdfCompression,
    buildCompressionSummary,
    type CompressionLevel,
    type CompressionMode,
    type PdfCompressionAnalysis
} from '@/utils/pdfCompressionAnalysis';

const hero = TOOL_HERO_UI['compress-pdf'];

interface PDFFile {
    id: string;
    file: File;
    pageCount: number;
    analysis: PdfCompressionAnalysis;
}

const MODE_META: Record<CompressionMode, {
    label: string;
    description: string;
    accent: string;
    badge: string;
}> = {
    smart: {
        label: 'Smart compression',
        description: 'Good default for most files.',
        accent: 'border-brand-blue-500 bg-brand-blue-50',
        badge: 'Recommended'
    },
    aggressive: {
        label: 'Aggressive rasterization',
        description: 'Best for scans. Searchable text is lost.',
        accent: 'border-amber-500 bg-amber-50',
        badge: 'Highest shrink'
    },
    lossless: {
        label: 'Metadata cleanup only',
        description: 'Keeps quality. Usually smaller savings.',
        accent: 'border-brand-blue-500 bg-brand-blue-50',
        badge: 'Safest'
    }
};

const LEVEL_META: Record<CompressionLevel, { label: string; description: string }> = {
    low: { label: 'Low compression', description: 'Gentle.' },
    balanced: { label: 'Balanced', description: 'Best default.' },
    strong: { label: 'Strong compression', description: 'Smaller file.' },
    maximum: { label: 'Maximum possible', description: 'Smallest file.' }
};

const MODE_HELPER: Record<CompressionMode, string> = {
    smart: 'Best for most PDFs.',
    aggressive: 'Best for scans. Searchable text is lost.',
    lossless: 'Keeps quality. Usually smaller savings.'
};

const LEVEL_HELPER: Record<CompressionLevel, string> = {
    low: 'Gentle compression.',
    balanced: 'Best default.',
    strong: 'Smaller file.',
    maximum: 'Smallest file.'
};

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}

function classifyLabel(analysis: PdfCompressionAnalysis) {
    switch (analysis.contentType) {
        case 'small':
            return 'Already small';
        case 'text-heavy':
            return 'Text-heavy';
        case 'mixed':
            return 'Mixed content';
        case 'image-heavy':
            return 'Image-heavy';
        case 'scanned':
            return 'Scanned';
        case 'already-optimized':
            return 'Already optimized';
        default:
            return 'Unknown structure';
    }
}

function getRecommendedCombo(analysis: PdfCompressionAnalysis) {
    return `${MODE_META[analysis.recommendedMode].label} + ${LEVEL_META[analysis.recommendedLevel].label}`;
}

function getLikelySavingsLabel(analysis: PdfCompressionAnalysis, summary?: ReturnType<typeof buildCompressionSummary>) {
    if (analysis.contentType === 'small' || analysis.contentType === 'already-optimized') {
        return 'Already optimized';
    }

    const maxReduction = summary?.maxReductionPercent ?? 0;
    if (maxReduction <= 8) return 'Small savings likely';
    if (maxReduction <= 24) return 'Modest savings likely';
    if (maxReduction <= 50) return 'Moderate savings likely';
    return 'Large savings likely';
}

function combineAnalyses(files: PDFFile[]): PdfCompressionAnalysis | null {
    if (files.length === 0) return null;
    if (files.length === 1) return files[0].analysis;

    const first = files[0].analysis;
    const totals = files.reduce(
        (acc, file) => {
            acc.fileSizeBytes += file.analysis.fileSizeBytes;
            acc.pageCount += file.analysis.pageCount;
            acc.textPages += file.analysis.textPages;
            acc.imagePages += file.analysis.imagePages;
            acc.imageCount += file.analysis.imageCount;
            acc.imageBytes += file.analysis.imageBytes;
            acc.maxImageWidth = Math.max(acc.maxImageWidth, file.analysis.maxImageWidth);
            acc.maxImageHeight = Math.max(acc.maxImageHeight, file.analysis.maxImageHeight);
            acc.embeddedFontCount += file.analysis.embeddedFontCount;
            acc.embeddedFontSubsetCount += file.analysis.embeddedFontSubsetCount;
            acc.metadataFieldCount += file.analysis.metadataFieldCount;
            acc.metadataStreamBytes += file.analysis.metadataStreamBytes;
            acc.notes.push(...file.analysis.notes);
            acc.warnings.push(...file.analysis.warnings);
            acc.canCompressMeaningfully = acc.canCompressMeaningfully || file.analysis.canCompressMeaningfully;
            acc.riskRank = Math.max(acc.riskRank, file.analysis.riskLevel === 'high' ? 3 : file.analysis.riskLevel === 'medium' ? 2 : 1);
            return acc;
        },
        {
            fileSizeBytes: 0,
            pageCount: 0,
            textPages: 0,
            imagePages: 0,
            imageCount: 0,
            imageBytes: 0,
            maxImageWidth: 0,
            maxImageHeight: 0,
            embeddedFontCount: 0,
            embeddedFontSubsetCount: 0,
            metadataFieldCount: 0,
            metadataStreamBytes: 0,
            notes: [] as string[],
            warnings: [] as string[],
            canCompressMeaningfully: false,
            riskRank: 1
        }
    );

    const contentType: PdfCompressionAnalysis['contentType'] =
        totals.imagePages >= Math.max(1, Math.ceil(totals.pageCount * 0.75))
            ? 'scanned'
            : totals.imagePages >= Math.max(1, Math.ceil(totals.pageCount * 0.45))
                ? 'image-heavy'
                : totals.textPages >= Math.max(1, Math.ceil(totals.pageCount * 0.7))
                    ? 'text-heavy'
                    : totals.fileSizeBytes <= 256 * 1024 || totals.pageCount <= 2
                        ? 'small'
                        : totals.imageCount > 0 || totals.embeddedFontCount > 0
                            ? 'mixed'
                            : 'unknown';

    const recommendedMode: CompressionMode =
        contentType === 'scanned' || contentType === 'image-heavy'
            ? 'smart'
            : contentType === 'small'
                ? 'lossless'
                : 'smart';

    const recommendedLevel: CompressionLevel =
        contentType === 'scanned' || contentType === 'image-heavy'
            ? 'strong'
            : contentType === 'small'
                ? 'low'
                : 'balanced';

    return {
        ...first,
        fileName: `${files.length} PDFs`,
        fileSizeBytes: totals.fileSizeBytes,
        pageCount: totals.pageCount,
        contentType,
        textPages: totals.textPages,
        imagePages: totals.imagePages,
        imageCount: totals.imageCount,
        imageBytes: totals.imageBytes,
        maxImageWidth: totals.maxImageWidth,
        maxImageHeight: totals.maxImageHeight,
        embeddedFontCount: totals.embeddedFontCount,
        embeddedFontSubsetCount: totals.embeddedFontSubsetCount,
        metadataFieldCount: totals.metadataFieldCount,
        metadataStreamBytes: totals.metadataStreamBytes,
        hasMetadataStream: totals.metadataStreamBytes > 0,
        notes: Array.from(new Set(totals.notes)),
        warnings: Array.from(new Set(totals.warnings)),
        canCompressMeaningfully: totals.canCompressMeaningfully,
        recommendedMode,
        recommendedLevel,
        riskLevel: totals.riskRank === 3 ? 'high' : totals.riskRank === 2 ? 'medium' : 'low'
    };
}

const CompressPDFTool: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCompressing, setIsCompressing] = useState(false);
    const [compressionProgress, setCompressionProgress] = useState(0);
    const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('balanced');
    const [compressionMode, setCompressionMode] = useState<CompressionMode>('smart');

    const aggregateAnalysis = useMemo(() => combineAnalyses(pdfFiles), [pdfFiles]);
    const selectedSummary = useMemo(() => {
        if (!aggregateAnalysis) return null;
        return buildCompressionSummary(aggregateAnalysis, compressionMode, compressionLevel);
    }, [aggregateAnalysis, compressionMode, compressionLevel]);

    const handleFileSelect = async (files: FileList | File[]) => {
        const fileArray = Array.from(files);
        const nextFiles: PDFFile[] = [];
        const failures: string[] = [];

        setIsLoading(true);
        try {
            for (const file of fileArray) {
                if (file.type !== 'application/pdf') {
                    failures.push(`${file.name}: not a PDF`);
                    continue;
                }

                try {
                    const analysis = await analyzePdfCompression(file);
                    if (analysis.status !== 'ready') {
                        failures.push(`${file.name}: ${analysis.status === 'encrypted' ? 'password-protected' : 'corrupted or unreadable'}`);
                        continue;
                    }

                    nextFiles.push({
                        id: `${Date.now()}-${Math.random()}`,
                        file,
                        pageCount: analysis.pageCount,
                        analysis
                    });
                } catch (error) {
                    console.error('Error analyzing PDF:', file.name, error);
                    failures.push(`${file.name}: could not be analyzed`);
                }
            }

            if (nextFiles.length > 0) {
                setPdfFiles(prev => [...prev, ...nextFiles]);
            }

            if (failures.length > 0 && nextFiles.length === 0) {
                toast.error('No usable PDFs were loaded.');
            } else if (failures.length > 0) {
                toast.warning(`Skipped ${failures.length} file${failures.length > 1 ? 's' : ''} that were not usable.`);
            }
        } finally {
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
        setPdfFiles(prev => prev.filter(f => f.id !== id));
    };

    const handleCompress = async () => {
        if (pdfFiles.length === 0) return;

        setIsCompressing(true);
        setCompressionProgress(0);

        try {
            const totalFiles = pdfFiles.length;

            for (let i = 0; i < totalFiles; i += 1) {
                const pdfFile = pdfFiles[i];
                const baseProgress = Math.floor((i / totalFiles) * 100);
                const progressPerFile = Math.floor(100 / totalFiles);

                setCompressionProgress(baseProgress);

                const progressInterval = setInterval(() => {
                    setCompressionProgress(prev => {
                        const target = baseProgress + Math.floor(progressPerFile * 0.9);
                        return prev < target ? Math.min(prev + 5, target) : prev;
                    });
                }, 100);

                const result = await compressPdf(pdfFile.file, compressionLevel, compressionMode, pdfFile.analysis);
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
                    const note = result.note ? ` ${result.note}` : '';

                    if (result.preservedOriginal) {
                        toast.info(`${result.method || 'Compression'}: kept the original file because the output was not smaller.${note}`);
                    } else if (result.blob.size >= pdfFile.file.size) {
                        toast.info(`No meaningful reduction for ${pdfFile.file.name}. The original file was kept.${note}`);
                    } else {
                        toast.success(`${result.method || 'Compression'}: ${originalSize} MB -> ${compressedSize} MB (${reduction}% reduction).${note}`);
                    }
                } else {
                    throw new Error(result.error);
                }

                setCompressionProgress(Math.floor(((i + 1) / totalFiles) * 100));
            }

            setCompressionProgress(100);
        } catch (error) {
            console.error('Error compressing PDF:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to compress PDF');
        } finally {
            setTimeout(() => {
                setIsCompressing(false);
                setCompressionProgress(0);
            }, 500);
        }
    };

    if (pdfFiles.length === 0) {
        return (
            <CompressPdfEmptyState
                onFilesSelect={handleFileSelect}
                title={hero.title}
                description={hero.description}
                accept={hero.accept ?? 'application/pdf'}
                multiple={hero.multiple ?? true}
            />
        );
    }

    const totalFiles = pdfFiles.length;
    const analysis = aggregateAnalysis;

    const settingsContent = (
        <div className="space-y-3">
            <button
                onClick={handleDropZoneClick}
                className="w-full bg-brand-blue-600 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-brand-blue-700 active:bg-brand-blue-800 transition-colors duration-200 shadow-sm flex items-center justify-center gap-2 min-h-[46px]"
            >
                <Plus className="h-5 w-5" />
                Add PDF files
                <span className="bg-white/20 text-white text-xs font-bold rounded-full px-2 py-0.5 ml-1">
                    {totalFiles}
                </span>
            </button>

            {analysis && (
                <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-500">Recommended</p>
                            <p className="text-sm font-medium text-gray-900 truncate">{getRecommendedCombo(analysis)}</p>
                            <p className="text-xs text-gray-600">{getLikelySavingsLabel(analysis, selectedSummary ?? undefined)}</p>
                        </div>
                        <CheckCircle className="w-4 h-4 text-brand-blue-600 flex-shrink-0" />
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-800">Compression mode</label>
                <div className="relative">
                    <select
                        value={compressionMode}
                        onChange={(e) => setCompressionMode(e.target.value as CompressionMode)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 pr-10 text-sm text-gray-900 shadow-sm outline-none transition-colors hover:border-brand-blue-200 focus:border-brand-blue-500 focus:ring-2 focus:ring-brand-blue-100"
                    >
                        {Object.entries(MODE_META).map(([modeKey, meta]) => (
                            <option key={modeKey} value={modeKey}>
                                {meta.label}
                            </option>
                        ))}
                    </select>
                </div>
                <p className="text-xs text-gray-600">{MODE_HELPER[compressionMode]}</p>
            </div>

            {compressionMode === 'aggressive' && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-amber-900">Searchable text will be lost.</p>
                            <p className="text-xs text-amber-800 mt-1">Use this only for scans or image-based PDFs.</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-800">Compression strength</label>
                <div className="relative">
                    <select
                        value={compressionLevel}
                        onChange={(e) => setCompressionLevel(e.target.value as CompressionLevel)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 pr-10 text-sm text-gray-900 shadow-sm outline-none transition-colors hover:border-brand-blue-200 focus:border-brand-blue-500 focus:ring-2 focus:ring-brand-blue-100"
                    >
                        {(['low', 'balanced', 'strong', 'maximum'] as CompressionLevel[]).map((level) => (
                            <option key={level} value={level}>
                                {LEVEL_META[level].label}
                            </option>
                        ))}
                    </select>
                </div>
                <p className="text-xs text-gray-600">{LEVEL_HELPER[compressionLevel]}</p>
            </div>

            {analysis && (
                <details className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
                    <summary className="cursor-pointer list-none text-sm font-medium text-gray-900 flex items-center justify-between">
                        <span>View detailed analysis</span>
                        <span className="text-gray-500 text-xs font-normal">Optional</span>
                    </summary>
                    <div className="mt-3 space-y-3 text-sm text-gray-700">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                                <p className="text-xs text-gray-500">Pages</p>
                                <p className="mt-1 font-medium text-gray-900">{analysis.pageCount}</p>
                            </div>
                            <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                                <p className="text-xs text-gray-500">Current size</p>
                                <p className="mt-1 font-medium text-gray-900">{formatBytes(analysis.fileSizeBytes)}</p>
                            </div>
                            <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                                <p className="text-xs text-gray-500">Largest image</p>
                                <p className="mt-1 font-medium text-gray-900">
                                    {analysis.maxImageWidth > 0 && analysis.maxImageHeight > 0
                                        ? `${analysis.maxImageWidth} x ${analysis.maxImageHeight}px`
                                        : 'Not fully detected'}
                                </p>
                            </div>
                            <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                                <p className="text-xs text-gray-500">File type</p>
                                <p className="mt-1 font-medium text-gray-900">{classifyLabel(analysis)}</p>
                            </div>
                        </div>

                        {analysis.notes.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-gray-500">Notes</p>
                                <ul className="mt-2 space-y-1.5 text-sm text-gray-700">
                                    {analysis.notes.slice(0, 3).map((note) => (
                                        <li key={note} className="flex gap-2">
                                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                                            <span>{note}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {analysis.warnings.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-gray-500">Warnings</p>
                                <ul className="mt-2 space-y-1.5 text-sm text-amber-700">
                                    {analysis.warnings.slice(0, 2).map((warning) => (
                                        <li key={warning} className="flex gap-2">
                                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                                            <span>{warning}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </details>
            )}

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
                            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-brand-blue-600" />
                            <p className="text-gray-600 font-medium">Analyzing PDFs...</p>
                        </div>
                    </div>
                )}

                <div className="flex-grow p-4 md:p-8 flex flex-col items-center overflow-y-auto bg-gray-100 relative pb-24 md:pb-8">
                    <div className="w-full max-w-6xl mx-auto">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 w-full">
                            {pdfFiles.map((pdfFile) => {
                                return (
                                    <div key={pdfFile.id} className="relative">
                                        <div className="group flex flex-col items-center flex-shrink-0">
                                            <PdfPageCard pageNumber={1} file={pdfFile.file} pageIndex={0}>
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

                                                <div className="absolute inset-x-0 bottom-0 bg-white/95 backdrop-blur-sm px-2 py-1.5 border-t border-gray-200">
                                                    <p className="text-xs font-medium text-gray-800 text-center truncate" title={pdfFile.file.name}>
                                                        {pdfFile.file.name}
                                                    </p>
                                                </div>
                                            </PdfPageCard>

                                            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
                                                <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl whitespace-nowrap">
                                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-gray-900" />
                                                    {(pdfFile.file.size / 1024 / 1024).toFixed(2)} MB • {pdfFile.pageCount} {pdfFile.pageCount === 1 ? 'page' : 'pages'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <MobileLayout
                    settingsTitle="Compression options"
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
                    <></>
                </MobileLayout>

                <aside className="hidden md:flex w-96 flex-shrink-0 bg-white border-l border-gray-200 flex-col h-full shadow-lg z-20">
                    <div className="p-5 border-b border-gray-100">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Settings className="w-5 h-5 text-brand-blue-600" />
                            Compression options
                        </h2>
                    </div>

                    <div className="flex-grow p-5 space-y-6 overflow-y-auto">
                        {settingsContent}
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
                            {isCompressing && (
                                <div
                                    className="absolute inset-0 bg-brand-blue-600 transition-all duration-300 ease-out"
                                    style={{ width: `${compressionProgress}%` }}
                                />
                            )}

                            <span className="relative z-10 flex items-center">
                                {isCompressing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
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

                        <ToolCTAs variant="sidebar" />
                    </div>
                </aside>
            </main>
        </div>
    );
};

export default CompressPDFTool;


import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Plus, ArrowRight, Settings, Image as ImageIcon, Download } from 'lucide-react';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import JSZip from 'jszip';

// Set up PDF.js
if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;
}

import { PdfUploadHero } from '../shared/PdfUploadHero';
import { PdfPageCard } from '../shared/PdfPageCard';
import { MobileLayout } from '../shared/MobileLayout';
import { ToolCTAs } from '../shared/ToolCTAs';

const PdfToJpgTool: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeFile, setActiveFile] = useState<File | null>(null);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [dragOver, setDragOver] = useState(false);
    const [pageNumbers, setPageNumbers] = useState<number[]>([]);

    // Load PDF
    useEffect(() => {
        const loadPdf = async () => {
            if (!activeFile) return;

            setIsLoading(true);
            try {
                const arrayBuffer = await activeFile.arrayBuffer();
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;
                setPdfDoc(pdf);

                const pages = Array.from({ length: pdf.numPages }, (_, i) => i + 1);
                setPageNumbers(pages);
            } catch (error) {
                console.error('Error loading PDF:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadPdf();
    }, [activeFile]);

    // Optimized render logic for thumbnails
    const renderPage = useCallback(async (canvas: HTMLCanvasElement) => {
        if (!pdfDoc) return;
        const pageNum = parseInt(canvas.getAttribute('data-page') || '0');
        if (!pageNum || canvas.getAttribute('data-rendered') === 'true') return;

        try {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 0.25 }); // Low scale for thumbnail

            const ctx = canvas.getContext('2d', { alpha: false });
            if (ctx) {
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                // White background
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                await page.render({
                    canvasContext: ctx,
                    viewport,
                    intent: 'display'
                }).promise;

                canvas.setAttribute('data-rendered', 'true');
            }

            const container = document.querySelector(`div[data-spinner-page="${pageNum}"]`);
            if (container) {
                const spinner = container.firstElementChild as HTMLElement;
                if (spinner) spinner.style.display = 'none';
            }
        } catch (e) {
            console.error('Render error page ' + pageNum, e);
        }
    }, [pdfDoc]);

    // Intersection Observer for lazy rendering
    useEffect(() => {
        if (!pdfDoc || isLoading) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    renderPage(entry.target as HTMLCanvasElement);
                }
            });
        }, { rootMargin: '50% 0px' });

        const canvases = document.querySelectorAll('canvas[data-page]');
        canvases.forEach(c => observer.observe(c));

        return () => observer.disconnect();
    }, [pdfDoc, isLoading, renderPage, pageNumbers]);

    // Handle file select
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setActiveFile(e.target.files[0]);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0] && e.dataTransfer.files[0].type === 'application/pdf') {
            setActiveFile(e.dataTransfer.files[0]);
        }
    };

    const handleConvertToJpg = async () => {
        if (!pdfDoc || !activeFile) return;
        setIsConverting(true);
        setProgress(0);

        try {
            const zip = new JSZip();
            const totalPages = pdfDoc.numPages;

            for (let i = 1; i <= totalPages; i++) {
                const page = await pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: 2.0 }); // High quality scale

                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                const ctx = canvas.getContext('2d', { alpha: false });
                if (!ctx) continue;

                // White background for JPG
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                await page.render({
                    canvasContext: ctx,
                    viewport,
                    intent: 'display'
                }).promise;

                const imgData = canvas.toDataURL('image/jpeg', 0.9); // 0.9 quality
                // Remove data:image/jpeg;base64, prefix
                const base64Data = imgData.replace(/^data:image\/jpeg;base64,/, "");

                // Pad page number for better sorting
                const pageNumPadded = i.toString().padStart(Math.max(2, totalPages.toString().length), '0');
                zip.file(`page-${pageNumPadded}.jpg`, base64Data, { base64: true });

                setProgress(Math.round((i / totalPages) * 100));
            }

            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = activeFile.name.replace('.pdf', '-jpgs.zip');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error converting to JPG:', err);
            alert('Failed to convert pages to JPG.');
        } finally {
            setIsConverting(false);
            setProgress(0);
        }
    };

    const truncate = (name: string, len: number) => {
        return name.length > len ? name.substring(0, len - 3) + '...' : name;
    };

    if (!activeFile) {
        return (
            <PdfUploadHero
                onFilesSelect={(files) => {
                    if (files.length > 0) setActiveFile(files[0]);
                }}
                title="PDF to JPG"
                description="Convert PDF pages to high-quality JPG images."
                icon={<ImageIcon className="h-6 w-6 mr-3" />}
            />
        );
    }

    // Extract settings content for mobile panel
    const settingsContent = (
        <div className="p-5 space-y-6">
            <div className="bg-brand-blue-50 border border-brand-blue-100 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-brand-blue-100 rounded-full text-brand-blue-600 mt-1">
                        <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="font-bold text-brand-blue-800 text-sm">Convert to JPG</h3>
                        <p className="text-xs text-brand-blue-700 mt-1 leading-relaxed">
                            All pages will be converted to high-quality JPG images and downloaded as a ZIP file.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-hidden font-sans">
            <main className="flex-grow flex flex-col md:flex-row min-h-0 overflow-hidden">
                <div className="flex-grow p-4 md:p-8 flex flex-col items-center overflow-y-auto bg-gray-100 relative pb-24 md:pb-8">

                    {/* Top Toolbar matching Watermark Tool */}
                    <div className="w-full max-w-5xl flex items-center justify-center gap-2 mb-8">
                        <div className="flex items-center bg-white border border-gray-300 rounded-lg pl-3 pr-2 py-1.5 text-sm font-medium text-gray-700 shadow-sm">
                            <span>{truncate(activeFile.name, 30)}</span>
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-shrink-0 w-10 h-10 bg-brand-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-brand-blue-700 transition-transform hover:scale-105"
                            aria-label="Replace PDF file"
                        >
                            <Plus className="w-6 h-6" />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                            accept="application/pdf"
                        />
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center w-full py-12">
                            <LoadingSpinner />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 max-w-6xl mx-auto w-full pb-20">
                            {pdfDoc && pageNumbers.map(pageNum => (
                                <div key={pageNum} className="group flex flex-col items-center space-y-2 flex-shrink-0">
                                    <PdfPageCard
                                        pageNumber={pageNum}
                                        pdfDoc={pdfDoc}
                                        className="group-hover:shadow-lg group-hover:-translate-y-1 group-hover:border-brand-blue-300 transition-all duration-200"
                                    />
                                    <span className="text-sm font-medium text-gray-600">
                                        Page {pageNum}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Mobile Layout Settings panel, floating button, action button */}
                <MobileLayout
                    settingsTitle="Conversion Options"
                    settingsContent={settingsContent}
                    actionButton={{
                        label: 'Convert to JPG',
                        onClick: handleConvertToJpg,
                        disabled: false,
                        isProcessing: isConverting,
                        processingText: 'Converting...',
                        progress
                    }}
                >
                    <></>
                </MobileLayout>

                {/* Desktop Sidebar - hidden on mobile */}
                <aside className="hidden md:flex w-96 flex-shrink-0 bg-white border-l border-gray-200 flex-col h-full shadow-lg z-20">
                    <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Settings className="w-5 h-5 text-brand-blue-600" />
                            Conversion Options
                        </h2>
                    </div>

                    <div className="flex-grow p-5 overflow-y-auto overflow-x-hidden custom-scrollbar space-y-6">
                        <div className="bg-brand-blue-50 border border-brand-blue-100 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-brand-blue-100 rounded-full text-brand-blue-600 mt-1">
                                    <ImageIcon className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-brand-blue-800 text-sm">Convert to JPG</h3>
                                    <p className="text-xs text-brand-blue-700 mt-1 leading-relaxed">
                                        All pages will be converted to high-quality JPG images and downloaded as a ZIP file.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-5 border-t border-gray-200 bg-gray-50 mt-auto">
                        <button
                            onClick={handleConvertToJpg}
                            disabled={isConverting}
                            className={`
                relative overflow-hidden w-full text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center text-lg shadow-lg transition-all duration-200
                ${isConverting ? 'cursor-not-allowed' : 'bg-brand-blue-600 hover:bg-brand-blue-700 hover:shadow-xl hover:-translate-y-0.5'}
              `}
                            style={{
                                background: isConverting ? '#e5e7eb' : undefined
                            }}
                        >
                            {/* Progress fill animation */}
                            {isConverting && (
                                <div
                                    className="absolute inset-0 bg-brand-blue-600 transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                />
                            )}

                            {/* Button content */}
                            <span className="relative z-10 flex items-center">
                                {isConverting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                        Converting... {progress}%
                                    </>
                                ) : (
                                    <>
                                        Convert to JPG
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

export default PdfToJpgTool;


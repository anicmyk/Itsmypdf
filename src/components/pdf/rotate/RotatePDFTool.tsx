import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, degrees } from 'pdf-lib';
import { toast } from 'sonner';
import {
  RotateCw,
  RotateCcw,
  Trash2,
  Plus,
  Undo,
  Loader2,
  Settings,
  ArrowRight
} from 'lucide-react';
import { LazyThumbnail } from '../shared/LazyThumbnail';
import { PdfUploadHero } from '../shared/PdfUploadHero';
import { PdfPageCard } from '../shared/PdfPageCard';
import { MobileLayout } from '../shared/MobileLayout';
import { ToolCTAs } from '../shared/ToolCTAs';

// Set up PDF.js worker with the "fast" CDN config
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

// --- TYPES ---
interface Page {
  id: string;
  originalFile: File;
  originalIndex: number;
  rotation: number;
  pageNumber: number;
}

// --- COMPONENTS ---

// RotateUploadHero and RotatePageThumbnail removed in favor of shared components

// Desktop-only component
const RotateSettings: React.FC<{
  onRotateAllCW: () => void;
  onRotateAllCCW: () => void;
  onReset: () => void;
  onSave: () => void;
  isSaving: boolean;
  fileCount: number;
  onAddFiles: () => void;
  onClearAll: () => void;
}> = ({ onRotateAllCW, onRotateAllCCW, onReset, onSave, isSaving, fileCount, onAddFiles, onClearAll }) => {
  return (
    <div className="hidden md:flex w-96 bg-white border-l border-gray-200 h-full flex-col flex-shrink-0 z-20 shadow-xl">
      <div className="p-5 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Settings className="w-5 h-5 text-brand-blue-600" />
          Rotate Options
        </h2>
        <p className="text-sm text-gray-500 mt-1">{fileCount} file(s) loaded</p>
      </div>

      <div className="p-5 space-y-8 flex-grow overflow-y-auto custom-scrollbar">
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Rotate All Pages</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onRotateAllCCW}
              className="flex flex-col items-center justify-center p-4 bg-white border border-gray-200 rounded-xl hover:bg-brand-blue-50 hover:border-brand-blue-200 hover:text-brand-blue-600 transition-all group shadow-sm hover:shadow-md"
            >
              <RotateCcw className="w-8 h-8 mb-3 text-gray-400 group-hover:text-brand-blue-500 transition-colors" />
              <span className="text-sm font-semibold">Left 90°</span>
            </button>
            <button
              onClick={onRotateAllCW}
              className="flex flex-col items-center justify-center p-4 bg-white border border-gray-200 rounded-xl hover:bg-brand-blue-50 hover:border-brand-blue-200 hover:text-brand-blue-600 transition-all group shadow-sm hover:shadow-md"
            >
              <RotateCw className="w-8 h-8 mb-3 text-gray-400 group-hover:text-brand-blue-500 transition-colors" />
              <span className="text-sm font-semibold">Right 90°</span>
            </button>
          </div>
        </div>

        <div className="h-px bg-gray-100" />

        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</h3>
          <button
            onClick={onReset}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 border border-gray-200 transition-all font-medium text-sm hover:shadow-sm"
          >
            <Undo className="w-4 h-4" />
            Reset all rotations
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onAddFiles}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-brand-blue-200 text-brand-blue-600 rounded-lg hover:bg-brand-blue-50 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Files
            </button>
            <button
              onClick={onClearAll}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          </div>
        </div>
      </div>

      <div className="p-5 border-t border-gray-200 bg-gray-50 mt-auto">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="relative overflow-hidden w-full text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center text-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-blue-700 hover:shadow-xl"
          style={{
            background: isSaving ? '#e5e7eb' : '#2563eb'
          }}
        >
          {/* Progress fill animation */}
          {isSaving && (
            <div
              className="absolute inset-0 bg-brand-blue-600 transition-all duration-300 ease-out"
              style={{ width: '100%' }}
            />
          )}

          {/* Button content */}
          <span className="relative z-10 flex items-center">
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Rotating...
              </>
            ) : (
              <>
                Rotate PDF
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </span>
        </button>

        {/* Bookmark and Share CTAs */}
        <ToolCTAs variant="sidebar" />
      </div>
    </div>
  );
};

const RotatePDFTool: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUploaded, setHasUploaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // NOTE: Removed pagesRef and renderPage/Observer logic as it's now handled by LazyThumbnail

  // Load pages from files
  useEffect(() => {
    const objectUrls: string[] = [];
    const loadPages = async () => {
      if (files.length === 0) {
        setPages([]);
        setHasUploaded(false);
        return;
      }

      setHasUploaded(true);
      setIsProcessing(true);

      try {
        const newPages: Page[] = [];
        let globalIndex = 0;

        for (const file of files) {
          const url = URL.createObjectURL(file);
          objectUrls.push(url);

          const loadingTask = pdfjsLib.getDocument(url);
          const pdfDoc = await loadingTask.promise;

          for (let i = 0; i < pdfDoc.numPages; i++) {
            globalIndex++;
            newPages.push({
              id: `${file.name}-${i}-${Math.random().toString(36).substr(2, 9)}`,
              originalFile: file,
              originalIndex: i,
              rotation: 0,
              pageNumber: globalIndex,
            });
          }
        }
        setPages(newPages);
      } catch (err) {
        toast.error('Failed to load PDF pages');
        console.error(err);
      } finally {
        setIsProcessing(false);
      }
    };

    loadPages();

    // Cleanup object URLs
    return () => {
      objectUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [files]);


  const handleFilesSelect = (newFiles: FileList) => {
    setFiles(prev => [...prev, ...Array.from(newFiles)]);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelect(e.dataTransfer.files);
    }
  };

  const handleRotatePage = (pageId: string, direction: 'cw' | 'ccw') => {
    setPages(prev => prev.map(p => {
      if (p.id === pageId) {
        const delta = direction === 'cw' ? 90 : -90;
        return { ...p, rotation: (p.rotation + delta) % 360 };
      }
      return p;
    }));
  };

  const handleRotateAll = (direction: 'cw' | 'ccw') => {
    setPages(prev => prev.map(p => {
      const delta = direction === 'cw' ? 90 : -90;
      return { ...p, rotation: (p.rotation + delta) % 360 };
    }));
  };

  const handleDeletePage = (pageId: string) => {
    setPages(prev => prev.filter(p => p.id !== pageId));
  };

  const handleReset = () => {
    setPages(prev => prev.map(p => ({ ...p, rotation: 0 })));
  };

  const handleClearAll = () => {
    setFiles([]);
    setPages([]);
  };

  const handleSave = async () => {
    if (pages.length === 0) return;
    setIsSaving(true);

    try {
      const newPdfDoc = await PDFDocument.create();
      const pdfCache = new Map<File, PDFDocument>();

      for (const page of pages) {
        let sourcePdfDoc = pdfCache.get(page.originalFile);
        if (!sourcePdfDoc) {
          const arrayBuffer = await page.originalFile.arrayBuffer();
          sourcePdfDoc = await PDFDocument.load(arrayBuffer);
          pdfCache.set(page.originalFile, sourcePdfDoc);
        }

        const [copiedPage] = await newPdfDoc.copyPages(sourcePdfDoc, [page.originalIndex]);

        const currentRotation = copiedPage.getRotation().angle;
        copiedPage.setRotation(degrees(currentRotation + page.rotation));

        newPdfDoc.addPage(copiedPage);
      }

      const pdfBytes = await newPdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rotated-pdf-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Error saving PDF:', error);
      toast.error('Failed to save PDF');
    } finally {
      setIsSaving(false);
    }
  };

  if (!hasUploaded) {
    return (
      <div className="flex flex-col h-full bg-gray-50 font-sans">
        <PdfUploadHero
          onFilesSelect={handleFilesSelect}
          title="Rotate PDF Pages"
          description="Simply click on a page to rotate it or use the controls to rotate all."
          icon={<Plus className="h-6 w-6 mr-3" />}
        />
      </div>
    );
  }

  // Extract settings content for mobile panel
  const settingsContent = (
    <div className="p-5 space-y-8">
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Rotate All Pages</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleRotateAll('ccw')}
            className="flex flex-col items-center justify-center p-4 bg-white border border-gray-200 rounded-xl hover:bg-brand-blue-50 hover:border-brand-blue-200 hover:text-brand-blue-600 active:bg-brand-blue-100 transition-all group shadow-sm min-h-[48px]"
          >
            <RotateCcw className="w-8 h-8 mb-3 text-gray-400 group-hover:text-brand-blue-500 transition-colors" />
            <span className="text-sm font-semibold">Left 90°</span>
          </button>
          <button
            onClick={() => handleRotateAll('cw')}
            className="flex flex-col items-center justify-center p-4 bg-white border border-gray-200 rounded-xl hover:bg-brand-blue-50 hover:border-brand-blue-200 hover:text-brand-blue-600 active:bg-brand-blue-100 transition-all group shadow-sm min-h-[48px]"
          >
            <RotateCw className="w-8 h-8 mb-3 text-gray-400 group-hover:text-brand-blue-500 transition-colors" />
            <span className="text-sm font-semibold">Right 90°</span>
          </button>
        </div>
      </div>

      <div className="h-px bg-gray-100" />

      <div className="space-y-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</h3>
        <button
          onClick={handleReset}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 active:bg-gray-200 border border-gray-200 transition-all font-medium text-sm min-h-[48px]"
        >
          <Undo className="w-4 h-4" />
          Reset all rotations
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-brand-blue-200 text-brand-blue-600 rounded-lg hover:bg-brand-blue-50 active:bg-brand-blue-100 transition-colors text-sm font-medium min-h-[48px]"
          >
            <Plus className="w-4 h-4" />
            Add Files
          </button>
          <button
            onClick={handleClearAll}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 active:bg-red-100 transition-colors text-sm font-medium min-h-[48px]"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
        </div>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Total Files</span>
          <span className="font-medium text-gray-900">{files.length}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden font-sans">
      <main className="flex flex-col md:flex-row h-full overflow-hidden">
        <div className="flex-grow p-4 md:p-8 flex flex-col items-center overflow-y-auto bg-gray-100 relative pb-24 md:pb-8">
          {isProcessing && !pages.length ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-blue-600"></div>
              <p className="mt-4 text-gray-600 font-medium">Processing your PDF...</p>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto w-full pb-20">
              {/* Header spacer to match Watermark tool layout without buttons */}
              <div className="w-full h-10 mb-8" />

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {pages.map((page) => (
                  <div key={page.id} className="group flex flex-col items-center space-y-2">
                    <PdfPageCard
                      pageNumber={page.pageNumber}
                      file={page.originalFile}
                      pageIndex={page.originalIndex}
                      rotation={page.rotation}
                      onClick={() => handleRotatePage(page.id, 'cw')}
                    >
                      {/* Rotation indicator badge */}
                      {page.rotation !== 0 && (
                        <div className="absolute top-2 left-2 bg-brand-blue-500 text-white text-xs font-medium px-2 py-1 rounded-md shadow-sm z-20">
                          {page.rotation}°
                        </div>
                      )}

                      {/* Professional floating action bar */}
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20">
                        <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 p-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRotatePage(page.id, 'ccw'); }}
                            className="p-2 rounded-full text-gray-600 hover:text-brand-blue-600 hover:bg-brand-blue-50 transition-all active:scale-95"
                            title="Rotate Left"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <div className="w-px h-4 bg-gray-200" />
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRotatePage(page.id, 'cw'); }}
                            className="p-2 rounded-full text-gray-600 hover:text-brand-blue-600 hover:bg-brand-blue-50 transition-all active:scale-95"
                            title="Rotate Right"
                          >
                            <RotateCw className="w-4 h-4" />
                          </button>
                          <div className="w-px h-4 bg-gray-200" />
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeletePage(page.id); }}
                            className="p-2 rounded-full text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all active:scale-95"
                            title="Delete Page"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </PdfPageCard>
                    <span className="text-sm font-medium text-gray-600">
                      Page {page.pageNumber}
                    </span>
                  </div>
                ))}

                <div
                  className="w-40 h-56 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-brand-blue-400 hover:text-brand-blue-500 hover:bg-white transition-all cursor-pointer group bg-gray-50/50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform mb-3">
                    <Plus className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium">Add Pages</span>
                </div>
              </div>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files && handleFilesSelect(e.target.files)}
            className="hidden"
            accept="application/pdf"
            multiple
          />
        </div>

        {/* Mobile Layout - Settings panel, floating button, action button */}
        <MobileLayout
          settingsTitle="Rotate Options"
          settingsContent={settingsContent}
          actionButton={{
            label: 'Rotate PDF',
            onClick: handleSave,
            disabled: false,
            isProcessing: isSaving,
            processingText: 'Rotating...'
          }}
        >
          {/* Empty - main content rendered above */}
          <></>
        </MobileLayout>

        <RotateSettings
          onRotateAllCW={() => handleRotateAll('cw')}
          onRotateAllCCW={() => handleRotateAll('ccw')}
          onReset={handleReset}
          onSave={handleSave}
          isSaving={isSaving}
          fileCount={files.length}
          onAddFiles={() => fileInputRef.current?.click()}
          onClearAll={handleClearAll}
        />
      </main>
    </div>
  );
};

export default RotatePDFTool;


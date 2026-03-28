import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Plus, X, ArrowRight, Settings, Trash2 } from 'lucide-react';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { PdfRenderer } from '@/utils/pdf-renderer';
import { PdfPageCard } from '../shared/PdfPageCard';
import { PdfUploadHero } from '../shared/PdfUploadHero';
import { MobileLayout } from '../shared/MobileLayout';
import { ToolCTAs } from '../shared/ToolCTAs';

// Set up PDF.js
if (typeof window !== 'undefined') {
  // Worker is handled by PdfRenderer now, but kept for safety if used elsewhere directly
  // pdfjsLib.GlobalWorkerOptions.workerSrc = ...
}



const RemovePagesTool: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeProgress, setRemoveProgress] = useState(0);
  const [pagesInput, setPagesInput] = useState<string>('');
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const isInputUpdatingRef = useRef(false);
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

        setLastSelectedIndex(null);
      } catch (error) {
        console.error('Error loading PDF:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPdf();

    return () => {
      // Cleanup PDF Renderer resources on unmount
      PdfRenderer.getInstance().cleanup();
    };
  }, [activeFile]);

  // Handle file select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setActiveFile(e.target.files[0]);
    }
  };

  const handlePageClick = useCallback((pageNum: number, e: React.MouseEvent) => {
    e.preventDefault();

    let newSelection: number[];
    if (e.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, pageNum);
      const end = Math.max(lastSelectedIndex, pageNum);
      const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);

      newSelection = [...selectedPages];
      range.forEach(p => {
        if (!newSelection.includes(p)) newSelection.push(p);
      });
    } else {
      if (selectedPages.includes(pageNum)) {
        newSelection = selectedPages.filter(p => p !== pageNum);
      } else {
        newSelection = [...selectedPages, pageNum];
      }
      setLastSelectedIndex(pageNum);
    }
    setSelectedPages(newSelection.sort((a, b) => a - b));
  }, [selectedPages, lastSelectedIndex]);

  // Sync Input from Selection
  useEffect(() => {
    if (!pdfDoc || isInputUpdatingRef.current) return;

    const sorted = [...selectedPages].sort((a, b) => a - b);
    if (sorted.length === 0) {
      setPagesInput('');
      return;
    }

    const ranges: string[] = [];
    let start: number | null = null;
    let prev: number | null = null;

    sorted.forEach(page => {
      if (start === null) {
        start = page;
      } else if (prev !== null && page !== prev + 1) {
        ranges.push(start === prev ? String(start) : `${start}-${prev}`);
        start = page;
      }
      prev = page;
    });

    if (start !== null && prev !== null) {
      ranges.push(start === prev ? String(start) : `${start}-${prev}`);
    }

    setPagesInput(ranges.join(', '));
  }, [selectedPages, pdfDoc]);

  // Parse Input
  const parsePagesInput = (input: string) => {
    if (!pdfDoc) return;
    isInputUpdatingRef.current = true;

    if (!input.trim()) {
      setSelectedPages([]);
      setLastSelectedIndex(null);
      isInputUpdatingRef.current = false;
      return;
    }

    const maxPage = pdfDoc.numPages;
    const pages = new Set<number>();
    const parts = input.split(',').map(p => p.trim()).filter(p => p);

    parts.forEach(part => {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(n => parseInt(n));
        if (!isNaN(start) && !isNaN(end)) {
          const s = Math.max(1, Math.min(start, maxPage));
          const e = Math.min(maxPage, Math.max(end, 1));
          for (let i = Math.min(s, e); i <= Math.max(s, e); i++) pages.add(i);
        }
      } else {
        const num = parseInt(part);
        if (!isNaN(num) && num >= 1 && num <= maxPage) pages.add(num);
      }
    });

    setSelectedPages(Array.from(pages).sort((a, b) => a - b));
    isInputUpdatingRef.current = false;
  };

  const handleRemovePages = async () => {
    if (!activeFile || selectedPages.length === 0) return;
    setIsRemoving(true);
    setRemoveProgress(0);

    try {
      setRemoveProgress(10);
      const { PDFDocument } = await import('pdf-lib');
      const arrayBuffer = await activeFile.arrayBuffer();
      
      setRemoveProgress(30);
      const pdf = await PDFDocument.load(arrayBuffer);

      const totalPages = pdf.getPageCount();
      const pagesToKeep = Array.from({ length: totalPages }, (_, i) => i)
        .filter(i => !selectedPages.includes(i + 1));

      if (pagesToKeep.length === 0) {
        alert("Cannot remove all pages!");
        setIsRemoving(false);
        setRemoveProgress(0);
        return;
      }

      setRemoveProgress(40);
      const newPdf = await PDFDocument.create();
      
      setRemoveProgress(60);
      const copiedPages = await newPdf.copyPages(pdf, pagesToKeep);
      copiedPages.forEach(page => newPdf.addPage(page));

      setRemoveProgress(80);
      const pdfBytes = await newPdf.save();
      
      setRemoveProgress(95);
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = activeFile.name.replace('.pdf', '-modified.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setRemoveProgress(100);
    } catch (err) {
      console.error('Error removing pages:', err);
      alert('Failed to remove pages.');
      setRemoveProgress(0);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <>
      <div className={`flex flex-col h-full w-full bg-gray-50 font-sans overflow-y-auto ${activeFile ? 'hidden' : ''}`}>
        {/* Tool container taking up most of the viewport */}
        <div className="flex flex-col justify-center items-center w-full min-h-[65vh] sm:min-h-[70vh] flex-shrink-0">
          <PdfUploadHero
            onFilesSelect={(files) => {
              if (files.length > 0 && files[0].type === 'application/pdf') {
                setActiveFile(files[0]);
              }
            }}
            title="Delete & Remove PDF Pages Online for Free"
            description="Securely delete unwanted pages from your document directly in your browser. No sign-ups, no watermarks, and completely free."
            multiple={false}
          />
        </div>

        {/* SEO Intent Section */}
        <div className="w-full bg-white border-t border-gray-200 flex-shrink-0">
          <div className="max-w-3xl mx-auto px-6 py-16 text-gray-800">
            <h2 className="text-3xl font-bold mb-6 text-brand-blue-800">How to Delete Pages from a PDF</h2>
            <p className="mb-4 text-lg text-gray-700">Remove one page or multiple sections in three simple steps:</p>
            <ol className="list-decimal pl-6 mb-12 space-y-3 text-gray-700">
              <li><strong>Select your file:</strong> Choose the document from your device using the button above. The file stays on your device.</li>
              <li><strong>Choose pages to delete:</strong> Click on the specific pages you want to remove. Hold 'Shift' to select a bulk range.</li>
              <li><strong>Save your file:</strong> Click 'Remove Pages' to instantly export your updated, watermark-free PDF directly to your device.</li>
            </ol>

            <h2 className="text-3xl font-bold mb-6 text-brand-blue-800">Why Use itsmypdf to Remove Pages?</h2>
            <ul className="list-disc pl-6 mb-12 space-y-3 text-gray-700">
              <li><strong>100% Private (No Uploads):</strong> Your files are processed entirely inside your web browser using client-side technology. We never upload, store, or see your sensitive documents.</li>
              <li><strong>No Watermarks:</strong> We never alter your document or add branding. Your exported PDF looks exactly how you want it.</li>
              <li><strong>No Account Required:</strong> Skip the registration process entirely. Start working immediately, just open your file, edit, and save.</li>
              <li><strong>Completely Free:</strong> No hidden paywalls or premium subscriptions after you've already done the work.</li>
            </ul>

            <h2 className="text-3xl font-bold mb-6 text-brand-blue-800">Frequently Asked Questions</h2>
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-2 text-gray-900">Can I remove multiple pages at once?</h3>
              <p className="text-gray-700">Yes! Our online PDF page remover allows you to select as many individual pages or page ranges as you need to delete before saving the new file.</p>
            </div>
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-2 text-gray-900">Is there a file size limit?</h3>
              <p className="text-gray-700">There are no strict file size limits! Because our tool processes the document directly on your device, you can easily handle large PDF files. The processing speed simply depends on your device's available memory.</p>
            </div>
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-2 text-gray-900">Is it safe to use itsmypdf for sensitive documents?</h3>
              <p className="text-gray-700">Absolutely. Since your files are processed entirely on your device, your sensitive data never leaves your browser. This makes it one of the most secure ways to manage private PDF documents.</p>
            </div>
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-2 text-gray-900">Does this tool work on mobile devices?</h3>
              <p className="text-gray-700">Yes! itsmypdf is fully responsive and works perfectly across all devices. You can securely remove PDF pages on your iPhone, Android, or tablet directly through your web browser.</p>
            </div>
            
            <div className="pt-8 mt-12 border-t border-gray-200">
              <h2 className="text-2xl font-bold mb-6 text-brand-blue-800 text-center">Related Tools</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <a href="/merge-pdf" className="p-4 bg-gray-50 rounded-xl hover:bg-brand-blue-50 hover:text-brand-blue-600 transition-colors duration-200 border border-gray-100 hover:border-brand-blue-100">
                  <p className="font-semibold text-gray-800 mb-1">Need to combine files?</p>
                  <span className="text-sm text-brand-blue-600 font-medium">Merge PDF &rarr;</span>
                </a>
                <a href="/organize-pdf" className="p-4 bg-gray-50 rounded-xl hover:bg-brand-blue-50 hover:text-brand-blue-600 transition-colors duration-200 border border-gray-100 hover:border-brand-blue-100">
                  <p className="font-semibold text-gray-800 mb-1">Need to change the order?</p>
                  <span className="text-sm text-brand-blue-600 font-medium">Organize PDF &rarr;</span>
                </a>
                <a href="/compress-pdf" className="p-4 bg-gray-50 rounded-xl hover:bg-brand-blue-50 hover:text-brand-blue-600 transition-colors duration-200 border border-gray-100 hover:border-brand-blue-100">
                  <p className="font-semibold text-gray-800 mb-1">File too large?</p>
                  <span className="text-sm text-brand-blue-600 font-medium">Compress PDF &rarr;</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`flex flex-col h-full bg-gray-50 overflow-hidden font-sans ${!activeFile ? 'hidden' : ''}`}>
        <main className="flex-grow flex flex-col md:flex-row min-h-0 overflow-hidden">
        <div className="flex-grow p-4 md:p-8 flex flex-col items-center overflow-y-auto bg-gray-100 relative pb-24 md:pb-8">
          {isLoading ? (
            <div className="flex items-center justify-center w-full py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 relative max-w-6xl mx-auto w-full pb-20">
              {pdfDoc && pageNumbers.map(pageNum => (
                <div key={pageNum} className="group flex flex-col items-center space-y-2 flex-shrink-0">
                  <PdfPageCard
                    pageNumber={pageNum}
                    pdfDoc={pdfDoc}
                    isSelected={selectedPages.includes(pageNum)}
                    onClick={(e) => handlePageClick(pageNum, e)}
                    className="group-hover:shadow-lg group-hover:-translate-y-1 group-hover:border-brand-blue-300 transition-all duration-200"
                  >
                    {selectedPages.includes(pageNum) && (
                      <div className="absolute inset-0 z-20 bg-brand-blue-500/10 flex items-center justify-center animate-in fade-in duration-200">
                        <div className="bg-brand-blue-500 text-white rounded-full p-2 shadow-sm">
                          <Trash2 className="w-6 h-6" />
                        </div>
                      </div>
                    )}
                  </PdfPageCard>
                  <span className={`text-sm font-medium ${selectedPages.includes(pageNum) ? 'text-brand-blue-600 font-bold' : 'text-gray-600'}`}>
                    Page {pageNum}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mobile Layout - Settings panel, floating button, action button */}
        <MobileLayout
          settingsTitle="Remove Options"
          settingsContent={
            <div className="p-5 space-y-6">
              <div className="bg-brand-blue-50 border border-brand-blue-100 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-brand-blue-100 rounded-full text-brand-blue-600 mt-1">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-brand-blue-800 text-sm">Select Pages to Remove</h3>
                    <p className="text-xs text-brand-blue-700 mt-1 leading-relaxed">
                      Click on pages to mark them for removal. Holding <kbd className="font-mono bg-brand-blue-200/50 px-1 rounded">Shift</kbd> allows range selection.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Selected Pages</label>
                <input
                  type="text"
                  value={pagesInput}
                  onChange={(e) => setPagesInput(e.target.value)}
                  onBlur={(e) => parsePagesInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && parsePagesInput(pagesInput)}
                  placeholder="e.g. 1, 3-5, 8"
                  className="w-full px-3 py-2 text-center bg-white border border-gray-300 rounded-md focus:ring-brand-blue-500 focus:border-brand-blue-500 text-sm min-h-[48px]"
                />
                <p className="text-xs text-center text-gray-400">
                  {selectedPages.length} of {pdfDoc?.numPages || 0} pages selected
                </p>
              </div>
            </div>
          }
          actionButton={{
            label: 'Remove Pages',
            onClick: handleRemovePages,
            disabled: selectedPages.length === 0,
            isProcessing: isRemoving,
            processingText: 'Removing...',
            progress: removeProgress
          }}
        >
          <></>
        </MobileLayout>

        {/* Desktop Sidebar - hidden on mobile */}
        <aside className="hidden md:flex w-96 flex-shrink-0 bg-white border-l border-gray-200 flex-col h-full shadow-lg z-20">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Settings className="w-5 h-5 text-brand-blue-600" />
              Remove Options
            </h2>
          </div>

          <div className="flex-grow p-5 overflow-y-auto overflow-x-hidden custom-scrollbar space-y-6">
            <div className="bg-brand-blue-50 border border-brand-blue-100 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-brand-blue-100 rounded-full text-brand-blue-600 mt-1">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-brand-blue-800 text-sm">Select Pages to Remove</h3>
                  <p className="text-xs text-brand-blue-700 mt-1 leading-relaxed">
                    Click on pages to mark them for removal. Holding <kbd className="font-mono bg-brand-blue-200/50 px-1 rounded">Shift</kbd> allows range selection.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Selected Pages</label>
              <input
                type="text"
                value={pagesInput}
                onChange={(e) => setPagesInput(e.target.value)}
                onBlur={(e) => parsePagesInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && parsePagesInput(pagesInput)}
                placeholder="e.g. 1, 3-5, 8"
                className="w-full px-3 py-2 text-center bg-white border border-gray-300 rounded-md focus:ring-brand-blue-500 focus:border-brand-blue-500 text-sm"
              />
              <p className="text-xs text-center text-gray-400">
                {selectedPages.length} of {pdfDoc?.numPages || 0} pages selected
              </p>
            </div>
          </div>

          <div className="p-5 border-t border-gray-200 bg-gray-50 mt-auto flex-shrink-0">
            <button
              onClick={handleRemovePages}
              disabled={selectedPages.length === 0 || isRemoving}
              className="relative overflow-hidden w-full text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center text-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-blue-700 hover:shadow-xl"
              style={{
                background: isRemoving ? '#e5e7eb' : '#2563eb'
              }}
            >
              {/* Progress fill animation */}
              {isRemoving && (
                <div
                  className="absolute inset-0 bg-brand-blue-600 transition-all duration-300 ease-out"
                  style={{ width: `${removeProgress}%` }}
                />
              )}

              {/* Button content */}
              <span className="relative z-10 flex items-center text-white min-h-[28px]">
                {isRemoving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Removing... {removeProgress}%
                  </>
                ) : (
                  <>
                    Remove Pages
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

export default RemovePagesTool;


import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Plus, ArrowRight, Settings } from 'lucide-react';
import { PdfUploadHero } from '@/components/pdf/shared/PdfUploadHero';
import { PdfPageCard } from '@/components/pdf/shared/PdfPageCard';
import { MobileLayout } from '@/components/pdf/shared/MobileLayout';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

type OcrOptions = {
  language: string;
  mode: 'fast' | 'accurate';
  deskew: boolean;
  clean: boolean;
};

const OcrPDFTool: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNumbers, setPageNumbers] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string>('Upload a scanned PDF to apply OCR.');
  const [options, setOptions] = useState<OcrOptions>({ language: 'eng', mode: 'accurate', deskew: true, clean: true });

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setFile(files[0]);
    }
  };

  const handleDropZoneClick = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    let active = true;
    let loadingTask: any = null;
    let url: string | null = null;
    let doc: any = null;

    const run = async () => {
      if (!file) return;
      setIsLoading(true);
      try {
        url = URL.createObjectURL(file);
        loadingTask = pdfjsLib.getDocument({ url, disableAutoFetch: false, disableStream: false });
        doc = await loadingTask.promise;

        if (!active) {
          if (doc && doc.destroy) doc.destroy().catch(() => { });
          if (url) URL.revokeObjectURL(url);
          return;
        }

        setPdfDoc(doc);
        const total = doc.numPages;
        const nums = Array.from({ length: Math.min(10, total) }, (_, i) => i + 1);
        setPageNumbers(nums);
        setInfoMessage(`Loaded ${file.name}. ${total} page(s).`);
      } catch (err) {
        if (active) setInfoMessage('Failed to open PDF');
      } finally {
        if (active) setIsLoading(false);
        // We do NOT revoke URL here as pdf.js might need it (stream), 
        // but since we are loading small files, usually ok. 
        // However, better to keep it alive while doc is alive? 
        // PDf.js with disableStream: false might assume url is valid.
        // We will revoke it in cleanup.
      }
    };
    run();

    return () => {
      active = false;
      if (doc && doc.destroy) {
        doc.destroy().catch(() => { });
      } else if (loadingTask && loadingTask.destroy) {
        loadingTask.destroy().catch(() => { });
      }
      if (url) {
        URL.revokeObjectURL(url);
      }
      setPdfDoc(null);
    };
  }, [file]);

  const renderPageThumb = async (canvas: HTMLCanvasElement, pageNumber: number) => {
    if (!pdfDoc) return;
    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 0.3 });
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;
  };

  const checkHasSelectableText = async (): Promise<boolean> => {
    if (!pdfDoc) return false;
    const sample = Math.min(pdfDoc.numPages, 3);
    for (let i = 1; i <= sample; i++) {
      const page = await pdfDoc.getPage(i);
      const text = await page.getTextContent();
      if (text.items && text.items.length > 10) return true;
    }
    return false;
  };

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const applyClientOcr = async () => {
    if (!file || !pdfDoc) return;
    const arrayBuffer = await file.arrayBuffer();
    const srcPdf = await PDFDocument.load(arrayBuffer);
    const outPdf = await PDFDocument.create();
    const font = await outPdf.embedStandardFont(StandardFonts.Helvetica);
    const total = srcPdf.getPageCount();
    const { default: Tesseract } = await import('tesseract.js');
    for (let i = 0; i < total; i++) {
      const [copied] = await outPdf.copyPages(srcPdf, [i]);
      outPdf.addPage(copied);
      const pageNum = i + 1;
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL('image/png');
      const result = await Tesseract.recognize(dataUrl, options.language, { logger: () => { } });
      const text = result.data.text || '';
      const words = (result.data as any).words || [];
      const pdfPage = outPdf.getPage(i);
      const { width, height } = pdfPage.getSize();
      const scaleX = width / canvas.width;
      const scaleY = height / canvas.height;
      if (words && words.length > 0) {
        for (const w of words) {
          const bx = w.bbox?.x0 ?? 0;
          const by = w.bbox?.y0 ?? 0;
          const bw = (w.bbox?.x1 ?? 0) - bx;
          const bh = (w.bbox?.y1 ?? 0) - by;
          const tx = bx * scaleX;
          const ty = height - (by * scaleY) - (bh * scaleY);
          const size = Math.max(8, bh * scaleY * 0.85);
          const content = w.text ?? '';
          if (!content.trim()) continue;
          pdfPage.drawText(content, {
            x: tx,
            y: ty,
            size,
            font,
            color: rgb(0, 0, 0),
            opacity: 0.02
          });
        }
      } else if (text.trim().length > 0) {
        pdfPage.drawText(text, {
          x: 24,
          y: height - 48,
          size: 12,
          font,
          color: rgb(0, 0, 0),
          opacity: 0.02,
          lineHeight: 14,
        });
      }
    }
    const outBytes = await outPdf.save();
    const outBlob = new Blob([outBytes as any], { type: 'application/pdf' });
    const name = file.name.replace(/\.pdf$/i, '-ocr.pdf');
    downloadBlob(outBlob, name);
    setInfoMessage('Your PDF is now selectable and searchable.');
  };

  const handleApplyOcr = async () => {
    if (!file) return;
    setIsLoading(true);
    setInfoMessage('Applying OCR...');
    try {
      const endpoint = (import.meta as any)?.env?.VITE_OCR_ENDPOINT;
      if (endpoint) {
        const form = new FormData();
        form.append('file', file);
        form.append('language', options.language);
        form.append('mode', options.mode);
        form.append('deskew', String(options.deskew));
        form.append('clean', String(options.clean));
        const res = await fetch(endpoint, { method: 'POST', body: form });
        if (!res.ok) {
          setInfoMessage('OCR failed. Try again later.');
          setIsLoading(false);
          return;
        }
        const blob = await res.blob();
        downloadBlob(blob, file.name.replace(/\.pdf$/i, '-ocr.pdf'));
        setInfoMessage('Your PDF is now selectable and searchable.');
        setIsLoading(false);
        return;
      }
      const hasText = await checkHasSelectableText();
      if (hasText) {
        downloadBlob(file, file.name.replace(/\.pdf$/i, '-copy.pdf'));
        setInfoMessage('This PDF already contains selectable text.');
      } else {
        await applyClientOcr();
      }
    } catch (err) {
      setInfoMessage('Unexpected error while processing OCR.');
    }
    setIsLoading(false);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 font-sans overflow-hidden">
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {!file ? (
          <div className="flex-grow flex items-center justify-center p-8">
            <PdfUploadHero
              onFilesSelect={(files) => {
                if (files && files.length > 0) setFile(files[0]);
              }}
              title="OCR PDF"
              description="Make scanned PDFs selectable and searchable."
              multiple={false}
              icon={<Plus className="h-6 w-6 mr-3" />}
            />
          </div>
        ) : (
          <>
            <input type="file" ref={fileInputRef} onChange={handleFileInputChange} className="hidden" accept="application/pdf" />
            <div className="flex-grow p-4 md:p-8 flex flex-col items-center overflow-y-auto bg-gray-100 relative pb-24 md:pb-8">
              <div className="max-w-6xl mx-auto w-full">
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-50">
                    <div className="w-12 h-12 border-4 border-brand-blue-200 border-t-brand-blue-600 rounded-full animate-spin"></div>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {pageNumbers.map((num) => (
                    <div key={num} className="group flex flex-col items-center space-y-2 flex-shrink-0">
                      <PdfPageCard
                        pageNumber={num}
                        file={file || undefined}
                        pageIndex={num - 1}
                        className="group-hover:shadow-lg group-hover:-translate-y-1 group-hover:border-brand-blue-300 transition-all duration-200"
                      />
                      <span className="text-sm font-medium text-gray-600">
                        Page {num}
                      </span>
                    </div>
                  ))}
                </div>
                {infoMessage && (
                  <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">{infoMessage}</div>
                )}
              </div>
            </div>

            {/* Mobile Layout - Settings panel, floating button, action button */}
            <MobileLayout
              settingsTitle="OCR PDF Options"
              settingsContent={
                <div className="p-5 space-y-4">
                  <p className="text-sm text-gray-500">Your PDF will be selectable and searchable.</p>
                  <div>
                    <label className="block text-gray-700 mb-1 text-sm font-medium">Language</label>
                    <select value={options.language} onChange={(e) => setOptions((prev) => ({ ...prev, language: e.target.value }))} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-brand-blue-500 focus:border-brand-blue-500 text-sm min-h-[48px]">
                      <option value="eng">English</option>
                      <option value="spa">Spanish</option>
                      <option value="fra">French</option>
                      <option value="deu">German</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-1 text-sm font-medium">Mode</label>
                    <select value={options.mode} onChange={(e) => setOptions((prev) => ({ ...prev, mode: e.target.value as any }))} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-brand-blue-500 focus:border-brand-blue-500 text-sm min-h-[48px]">
                      <option value="fast">Fast</option>
                      <option value="accurate">Accurate</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700 text-sm font-medium">Deskew pages</span>
                    <input type="checkbox" checked={options.deskew} onChange={(e) => setOptions((prev) => ({ ...prev, deskew: e.target.checked }))} className="w-5 h-5" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700 text-sm font-medium">Clean background</span>
                    <input type="checkbox" checked={options.clean} onChange={(e) => setOptions((prev) => ({ ...prev, clean: e.target.checked }))} className="w-5 h-5" />
                  </div>
                  {infoMessage && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">{infoMessage}</div>
                  )}
                </div>
              }
              actionButton={{
                label: 'Apply OCR',
                onClick: handleApplyOcr,
                disabled: !file,
                isProcessing: isLoading,
                processingText: 'Processing...'
              }}
            >
              <></>
            </MobileLayout>

            {/* Desktop Sidebar - hidden on mobile */}
            <aside className="hidden md:flex w-96 flex-shrink-0 bg-white border-l border-gray-200 flex-col h-full overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex-shrink-0">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-brand-blue-600" />
                  OCR PDF Options
                </h2>
                <p className="text-sm text-gray-500 mt-1">Your PDF will be selectable and searchable.</p>
              </div>
              <div className="flex-1 p-5 flex flex-col space-y-4 overflow-hidden min-h-0">
                <div>
                  <label className="block text-gray-700 mb-1">Language</label>
                  <select value={options.language} onChange={(e) => setOptions((prev) => ({ ...prev, language: e.target.value }))} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-brand-blue-500 focus:border-brand-blue-500 text-sm">
                    <option value="eng">English</option>
                    <option value="spa">Spanish</option>
                    <option value="fra">French</option>
                    <option value="deu">German</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Mode</label>
                  <select value={options.mode} onChange={(e) => setOptions((prev) => ({ ...prev, mode: e.target.value as any }))} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-brand-blue-500 focus:border-brand-blue-500 text-sm">
                    <option value="fast">Fast</option>
                    <option value="accurate">Accurate</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Deskew pages</span>
                  <input type="checkbox" checked={options.deskew} onChange={(e) => setOptions((prev) => ({ ...prev, deskew: e.target.checked }))} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Clean background</span>
                  <input type="checkbox" checked={options.clean} onChange={(e) => setOptions((prev) => ({ ...prev, clean: e.target.checked }))} />
                </div>
              </div>
              <div className="p-5 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                <button
                  onClick={handleApplyOcr}
                  disabled={!file || isLoading}
                  className="w-full text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center text-lg shadow-lg transition-all duration-200 disabled:cursor-not-allowed hover:bg-brand-blue-700 hover:shadow-xl"
                  style={{
                    background: isLoading ? '#9ca3af' : (!file ? '#9ca3af' : '#2563eb')
                  }}
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      Apply OCR
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </button>
              </div>
            </aside>
          </>
        )}
      </main>
    </div>
  );
};

export default OcrPDFTool;

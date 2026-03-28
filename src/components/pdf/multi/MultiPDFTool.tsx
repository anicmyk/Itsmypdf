import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, degrees, rgb } from 'pdf-lib';
import JSZip from 'jszip';
import { Plus, Trash2, RotateCw, Copy, FilePlus, Scissors, Move, Download, ArrowRight, Hash, Type, GripVertical, Search, Settings } from 'lucide-react';
import Sortable from 'sortablejs';
import type { SortableEvent } from 'sortablejs';
import { PagePreviewModal } from '@/components/pdf/shared/PagePreviewModal';
import { PdfUploadHero } from '@/components/pdf/shared/PdfUploadHero';
import { PdfPageCard } from '@/components/pdf/shared/PdfPageCard';
import { MobileLayout } from '@/components/pdf/shared/MobileLayout';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

type UploadedFile = {
  id: string;
  file: File;
  pdfDocJS?: any;
  pageCount?: number;
  arrayBuffer?: ArrayBuffer;
};

type PageItem = {
  id: string;
  fileId: string | 'blank';
  pageIndex: number; // 0-based
  rotation: number; // 0, 90, 180, 270
  isSelected?: boolean;
  splitAfter?: boolean;
};

const MultiPDFTool: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string>('Upload one or more PDFs to begin.');
  const [exportPrefix, setExportPrefix] = useState('multi');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [dragSize, setDragSize] = useState<{ w: number; h: number } | null>(null);
  const [dropPosition, setDropPosition] = useState<{ idx: number; before: boolean } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [history, setHistory] = useState<PageItem[][]>([]);
  const [future, setFuture] = useState<PageItem[][]>([]);
  const canvasCache = useRef<Map<string, string>>(new Map());
  const [preview, setPreview] = useState<{ idx: number } | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const pushHistory = useCallback((next: PageItem[]) => {
    setHistory((h) => [...h.slice(-50), pages]);
    setPages(next);
    setFuture([]);
  }, [pages]);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [pages, ...f].slice(0, 50));
      setPages(prev);
      return h.slice(0, -1);
    });
  }, [pages]);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../../../workers/pdfOpsWorker.ts', import.meta.url), { type: 'module' });
    return () => { workerRef.current?.terminate(); workerRef.current = null; };
  }, []);

  // Sync ref for cleanup
  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  // Cleanup PDF docs on unmount
  useEffect(() => {
    return () => {
      filesRef.current.forEach(f => {
        if (f.pdfDocJS && f.pdfDocJS.destroy) {
          f.pdfDocJS.destroy().catch(() => { });
        }
      });
    };
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      setHistory((h) => [...h, pages].slice(-50));
      setPages(next);
      return f.slice(1);
    });
  }, [pages]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
      if (e.ctrlKey && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
      if (e.key.toLowerCase() === 'r') { e.preventDefault(); rotateSelected(); }
      if (e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelected(); }
      if (e.key.toLowerCase() === 'b') { e.preventDefault(); insertBlankAfterSelected(); }
      if (e.key.toLowerCase() === 'm') { e.preventDefault(); toggleSplitAfterSelected(); }
      if (e.key === 'Delete') { e.preventDefault(); deleteSelected(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || list.length === 0) return;
    await addFiles(list);
  };

  const handleDropZoneClick = () => fileInputRef.current?.click();

  const addFiles = async (list: FileList | File[]) => {
    setIsLoading(true);
    const arr = Array.from(list);
    const newFiles: UploadedFile[] = [];
    for (const f of arr) {
      if (f.type !== 'application/pdf') { setInfoMessage(`Skipping ${f.name}: not a PDF`); continue; }
      const id = `${Date.now()}-${Math.random()}`;
      const url = URL.createObjectURL(f);
      try {
        const doc = await pdfjsLib.getDocument({ url, disableAutoFetch: false, disableStream: false }).promise;
        const ab = await f.arrayBuffer();
        newFiles.push({ id, file: f, pdfDocJS: doc, pageCount: doc.numPages, arrayBuffer: ab });
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    setFiles((prev) => [...prev, ...newFiles]);
    const newPages: PageItem[] = [];
    for (const nf of newFiles) {
      const count = nf.pageCount || 0;
      for (let i = 0; i < count; i++) {
        newPages.push({ id: `${nf.id}-${i}`, fileId: nf.id, pageIndex: i, rotation: 0, isSelected: false, splitAfter: false });
      }
    }
    pushHistory([...pages, ...newPages]);
    setIsLoading(false);
    setInfoMessage(`Loaded ${newFiles.length} PDF(s).`);
  };

  const toggleSelect = (idx: number) => {
    const next = pages.map((p, i) => i === idx ? { ...p, isSelected: !p.isSelected } : p);
    pushHistory(next);
  };

  const rotateSelected = () => {
    const next = pages.map((p) => p.isSelected ? { ...p, rotation: (p.rotation + 90) % 360 } : p);
    pushHistory(next);
  };

  const duplicateSelected = () => {
    const next: PageItem[] = [];
    pages.forEach((p) => { next.push(p); if (p.isSelected) next.push({ ...p, id: `${p.id}-dup-${Math.random()}` }); });
    pushHistory(next);
  };

  const deleteSelected = () => {
    const next = pages.filter((p) => !p.isSelected);
    pushHistory(next);
  };

  const deleteAt = (idx: number) => {
    const next = pages.filter((_, i) => i !== idx);
    pushHistory(next);
  };

  const insertBlankAfterSelected = () => {
    const next: PageItem[] = [];
    pages.forEach((p) => { next.push(p); if (p.isSelected) next.push({ id: `blank-${Math.random()}`, fileId: 'blank', pageIndex: 0, rotation: 0 }); });
    pushHistory(next);
  };

  const toggleSplitAfterSelected = () => {
    const next = pages.map((p) => p.isSelected ? { ...p, splitAfter: !p.splitAfter } : p);
    pushHistory(next);
  };

  const startDrag = (_e: React.PointerEvent, idx: number) => { setDragIdx(idx); };

  useEffect(() => {
    if (!gridRef.current) return;
    const sortable = Sortable.create(gridRef.current, {
      animation: 150,
      draggable: '.page-card',
      ghostClass: 'opacity-50',
      onEnd: (evt: SortableEvent) => {
        const from = evt.oldIndex ?? 0;
        const to = evt.newIndex ?? 0;
        if (from === to) return;
        const next = [...pages];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        pushHistory(next);
      },
    });
    return () => sortable.destroy();
  }, [pages]);

  const renderThumb = async (container: HTMLCanvasElement, fileId: string, pageIndex: number, rotation: number) => {
    const key = `${fileId}-${pageIndex}-${rotation}`;
    const cached = canvasCache.current.get(key);
    if (cached) {
      const img = new Image(); img.src = cached;
      img.onload = () => {
        const ctx = container.getContext('2d'); if (!ctx) return;
        container.width = img.width; container.height = img.height;
        ctx.drawImage(img, 0, 0);
      };
      return;
    }
    const f = files.find((x) => x.id === fileId);
    if (!f?.pdfDocJS) return;
    const page = await f.pdfDocJS.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale: 0.2, rotation });
    const ctx = container.getContext('2d'); if (!ctx) return;
    container.width = viewport.width; container.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const url = container.toDataURL('image/png');
    canvasCache.current.set(key, url);
  };

  const getThumbUrl = (fileId: string, pageIndex: number, rotation: number) => canvasCache.current.get(`${fileId}-${pageIndex}-${rotation}`) || '';

  const postToWorker = async <T = any>(payload: any, timeoutMs = 15000): Promise<T> => {
    const worker = workerRef.current;
    return await new Promise<T>((resolve) => {
      if (!worker) { resolve({ ok: false, error: 'no_worker' } as any); return; }
      const onMsg = (ev: MessageEvent) => { worker.removeEventListener('message', onMsg); resolve(ev.data as T); };
      worker.addEventListener('message', onMsg);
      worker.postMessage(payload);
      const to = setTimeout(() => { worker.removeEventListener('message', onMsg); resolve({ ok: false, error: 'timeout' } as any); }, timeoutMs);
    });
  };

  const ensurePdfLibDocs = async () => {
    const map = new Map<string, PDFDocument>();
    for (const f of files) {
      if (!f.arrayBuffer) continue;
      map.set(f.id, await PDFDocument.load(f.arrayBuffer));
    }
    return map;
  };

  const exportAsSingle = async () => {
    setIsLoading(true);
    try {
      const buffers = files.filter(f => f.arrayBuffer).map(f => ({ id: f.id, buffer: f.arrayBuffer! }));
      const res = await postToWorker<{ ok: boolean; kind?: 'single'; bytes?: ArrayBuffer }>({ type: 'single', pages, buffers });
      if (res.ok && res.kind === 'single' && res.bytes) {
        const blob = new Blob([res.bytes], { type: 'application/pdf' });
        downloadBlob(blob, `${exportPrefix}-combined.pdf`);
      } else {
        const docs = await ensurePdfLibDocs();
        const out = await PDFDocument.create();
        let defaultSize: { width: number; height: number } | null = null;
        for (const p of pages) {
          if (p.fileId === 'blank') { const w = defaultSize?.width ?? 595; const h = defaultSize?.height ?? 842; const blank = out.addPage([w, h]); if (p.rotation) blank.setRotation(degrees(p.rotation)); continue; }
          const src = docs.get(p.fileId); if (!src) continue;
          const [copied] = await out.copyPages(src, [p.pageIndex]);
          out.addPage(copied);
          const added = out.getPage(out.getPageCount() - 1);
          if (p.rotation) added.setRotation(degrees(p.rotation));
          if (!defaultSize) { const s = added.getSize(); defaultSize = { width: s.width, height: s.height }; }
        }
        const bytes = await out.save({ useObjectStreams: true });
        const blob = new Blob([bytes as any], { type: 'application/pdf' });
        downloadBlob(blob, `${exportPrefix}-combined.pdf`);
      }
    } catch (e) {
      setInfoMessage('Export failed');
    }
    setIsLoading(false);
  };

  const exportByMarkers = async () => {
    setIsLoading(true);
    try {
      const buffers = files.filter(f => f.arrayBuffer).map(f => ({ id: f.id, buffer: f.arrayBuffer! }));
      const res = await postToWorker<{ ok: boolean; kind?: 'zip' | 'single'; bytes?: ArrayBuffer; reason?: string }>({ type: 'markers', pages, buffers, prefix: exportPrefix });
      if (res.ok && res.kind === 'zip' && res.bytes) {
        const blob = new Blob([res.bytes], { type: 'application/zip' });
        downloadBlob(blob, `${exportPrefix}-segments.zip`);
      } else {
        await exportAsSingle();
      }
    } catch (e) {
      setInfoMessage('Export failed');
    }
    setIsLoading(false);
  };

  const exportSelected = async () => {
    setIsLoading(true);
    try {
      const buffers = files.filter(f => f.arrayBuffer).map(f => ({ id: f.id, buffer: f.arrayBuffer! }));
      const worker = workerRef.current!;
      const res = await new Promise<{ ok: boolean; kind: 'single'; bytes: ArrayBuffer }>((resolve) => {
        const onMsg = (ev: MessageEvent) => { worker.removeEventListener('message', onMsg); resolve(ev.data); };
        worker.addEventListener('message', onMsg);
        worker.postMessage({ type: 'selected', pages, buffers });
      });
      if (res.ok && res.kind === 'single') {
        const blob = new Blob([res.bytes], { type: 'application/pdf' });
        downloadBlob(blob, `${exportPrefix}-selected.pdf`);
      } else {
        setInfoMessage('Export selected failed');
      }
    } catch (e) {
      setInfoMessage('Export selected failed');
    }
    setIsLoading(false);
  };

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.style.display = 'none';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const anySelected = pages.some((p) => p.isSelected);

  const sortPages = (mode: 'source-asc' | 'source-desc' | 'page-asc' | 'page-desc' | 'rotation') => {
    const next = [...pages];
    if (mode === 'source-asc') next.sort((a, b) => (a.fileId as string).localeCompare(b.fileId as string) || a.pageIndex - b.pageIndex);
    if (mode === 'source-desc') next.sort((a, b) => (b.fileId as string).localeCompare(a.fileId as string) || b.pageIndex - a.pageIndex);
    if (mode === 'page-asc') next.sort((a, b) => a.pageIndex - b.pageIndex);
    if (mode === 'page-desc') next.sort((a, b) => b.pageIndex - a.pageIndex);
    if (mode === 'rotation') next.sort((a, b) => a.rotation - b.rotation);
    pushHistory(next);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 font-sans overflow-hidden">
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {files.length === 0 ? (
          <div className="flex-grow flex items-center justify-center p-8">
            <PdfUploadHero
              onFilesSelect={addFiles}
              title="Multi PDF Tool"
              description="Upload, reorder, rotate, split, and export – all in your browser."
              icon={<Plus className="h-6 w-6 mr-3" />}
            />
          </div>
        ) : (
          <>
            <div className="flex-grow p-4 md:p-8 flex flex-col items-center overflow-y-auto bg-gray-100 relative pb-24 md:pb-8">
              <div className="max-w-6xl mx-auto w-full">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <button onClick={rotateSelected} disabled={!anySelected} className={`px-3 py-2 rounded-md border ${anySelected ? 'bg-white hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'}`}><RotateCw className="w-4 h-4 inline mr-1" />Rotate 90°</button>
                  <button onClick={duplicateSelected} disabled={!anySelected} className={`px-3 py-2 rounded-md border ${anySelected ? 'bg-white hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'}`}><Copy className="w-4 h-4 inline mr-1" />Duplicate</button>
                  <button onClick={insertBlankAfterSelected} disabled={!anySelected} className={`px-3 py-2 rounded-md border ${anySelected ? 'bg-white hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'}`}><FilePlus className="w-4 h-4 inline mr-1" />Insert blank</button>
                  <button onClick={toggleSplitAfterSelected} disabled={!anySelected} className={`px-3 py-2 rounded-md border ${anySelected ? 'bg-white hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'}`}><Scissors className="w-4 h-4 inline mr-1" />Toggle split</button>
                  <button onClick={deleteSelected} disabled={!anySelected} className={`px-3 py-2 rounded-md border ${anySelected ? 'bg-white hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'}`}><Trash2 className="w-4 h-4 inline mr-1" />Delete</button>
                  <div className="ml-auto flex items-center gap-2">
                    <button onClick={undo} className="px-3 py-2 rounded-md border bg-white hover:bg-gray-50">Undo</button>
                    <button onClick={redo} className="px-3 py-2 rounded-md border bg-white hover:bg-gray-50">Redo</button>
                    <select onChange={(e) => sortPages(e.target.value as any)} className="px-2 py-2 rounded-md border bg-white text-sm">
                      <option value="source-asc">Sort: File A→Z</option>
                      <option value="source-desc">Sort: File Z→A</option>
                      <option value="page-asc">Sort: Page 1→N</option>
                      <option value="page-desc">Sort: Page N→1</option>
                      <option value="rotation">Sort: Rotation</option>
                    </select>
                  </div>
                </div>

                {/* Grid */}
                <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {pages.map((p, idx) => {
                    const f = files.find(x => x.id === p.fileId);
                    const isBlank = p.fileId === 'blank';

                    if (isBlank) {
                      return (
                        <div key={p.id} className="group relative flex-shrink-0 flex justify-center">
                          <div onClick={() => toggleSelect(idx)} className={`group relative w-40 h-56 bg-white border rounded-lg border-gray-300 overflow-hidden shadow-sm flex items-center justify-center p-2 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${p.isSelected ? 'ring-2 ring-brand-blue-500 border-brand-blue-500' : ''}`}>
                            <div className="w-full h-full bg-gray-50 rounded-[4px] flex items-center justify-center text-gray-400 text-sm italic">Blank Page</div>
                            {/* Copy overlays from PdfPageCard style or reusing them similarly */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1 bg-white/80 backdrop-blur-sm rounded-md p-1 ring-1 ring-gray-200">
                              <button aria-label="Preview" onClick={(e) => { e.stopPropagation(); setPreview({ idx }); }} className="bg-white text-gray-700 rounded-full p-1 shadow"><Search className="h-4 w-4" /></button>
                              <button aria-label="Delete" onClick={(e) => { e.stopPropagation(); deleteAt(idx); }} className="bg-red-600 text-white rounded-full p-1 shadow ring-1 ring-red-300"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div key={p.id} className="group relative flex-shrink-0 flex justify-center">
                        <PdfPageCard
                          pageNumber={p.pageIndex + 1}
                          file={f?.file}
                          pageIndex={p.pageIndex}
                          rotation={p.rotation}
                          isSelected={p.isSelected}
                          onClick={() => toggleSelect(idx)}
                          className="group-hover:shadow-lg transition-all duration-200"
                        >
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1 bg-white/80 backdrop-blur-sm rounded-md p-1 ring-1 ring-gray-200">
                            <button aria-label="Preview" onClick={(e) => { e.stopPropagation(); setPreview({ idx }); }} className="bg-white text-gray-700 rounded-full p-1 shadow"><Search className="h-4 w-4" /></button>
                            <button aria-label="Delete" onClick={(e) => { e.stopPropagation(); deleteAt(idx); }} className="bg-red-600 text-white rounded-full p-1 shadow ring-1 ring-red-300"><Trash2 className="h-4 w-4" /></button>
                          </div>
                          <div className="absolute right-2 top-12 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex flex-col gap-1 bg-white/80 backdrop-blur-sm rounded-md p-1 ring-1 ring-gray-200">
                            <button aria-label="Rotate" onClick={(e) => { e.stopPropagation(); const next = pages.map((pp, i) => i === idx ? { ...pp, rotation: (pp.rotation + 90) % 360 } : pp); pushHistory(next); }} className="bg-white text-gray-800 rounded-full p-1.5 shadow ring-1 ring-gray-300"><RotateCw className="h-4 w-4" /></button>
                            <button aria-label="Duplicate" onClick={(e) => { e.stopPropagation(); const next = [...pages]; const pLocal = next[idx]; next.splice(idx + 1, 0, { ...pLocal, id: `${pLocal.id}-dup-${Math.random()}` }); pushHistory(next); }} className="bg-white text-gray-800 rounded-full p-1.5 shadow ring-1 ring-gray-300"><Copy className="h-4 w-4" /></button>
                            <button aria-label="Toggle split" onClick={(e) => { e.stopPropagation(); const next = pages.map((pp, i) => i === idx ? { ...pp, splitAfter: !pp.splitAfter } : pp); pushHistory(next); }} className="bg-white text-gray-800 rounded-full p-1.5 shadow ring-1 ring-gray-300"><Scissors className="h-4 w-4" /></button>
                          </div>
                          {p.splitAfter && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500"></div>
                          )}
                          <div className="absolute bottom-2 right-2 bg-white/90 text-gray-800 text-xs px-2 py-0.5 rounded ring-1 ring-gray-300">#{p.pageIndex + 1}</div>
                          {p.isSelected && <div className="absolute inset-0 border-2 border-brand-blue-500 pointer-events-none rounded-lg"></div>}
                        </PdfPageCard>
                      </div>
                    );
                  })}
                </div>

                {infoMessage && <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">{infoMessage}</div>}
              </div>
            </div>

            {/* Mobile Layout - Settings panel, floating button, action button */}
            <MobileLayout
              settingsTitle="Multi PDF"
              settingsContent={
                <div className="p-5 space-y-4">
                  <input type="file" ref={fileInputRef} onChange={handleFileInputChange} className="hidden" accept="application/pdf" multiple />
                  <button onClick={handleDropZoneClick} className="w-full bg-brand-blue-600 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-brand-blue-700 active:bg-brand-blue-800 transition-colors duration-200 shadow-sm flex items-center justify-center gap-2 min-h-[48px]">
                    <Plus className="h-5 w-5" /> Add PDF files
                  </button>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">Drag pages to reorder. Use hover controls for actions.</div>
                  <div>
                    <label className="block text-gray-700 mb-1 text-sm font-medium">Output filename prefix</label>
                    <input value={exportPrefix} onChange={(e) => setExportPrefix(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-brand-blue-500 focus:border-brand-blue-500 text-sm min-h-[48px]" />
                  </div>
                  <div className="space-y-2">
                    <button onClick={exportByMarkers} className="w-full bg-white border border-gray-300 text-gray-700 font-medium py-2.5 px-4 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors duration-200 flex items-center justify-center gap-2 min-h-[48px]">
                      <ArrowRight className="h-5 w-5" /> Download split ZIP
                    </button>
                    <button onClick={exportSelected} disabled={!anySelected} className="w-full bg-white border border-gray-300 text-gray-700 font-medium py-2.5 px-4 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 min-h-[48px]">
                      <ArrowRight className="h-5 w-5" /> Download selected pages
                    </button>
                  </div>
                  {infoMessage && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">{infoMessage}</div>
                  )}
                </div>
              }
              actionButton={{
                label: 'Download single PDF',
                onClick: exportAsSingle,
                disabled: false,
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
                  Multi PDF
                </h2>
              </div>
              <div className="flex-1 p-5 flex flex-col space-y-4 overflow-hidden min-h-0">
                <div className="space-y-3">
                  <input type="file" ref={fileInputRef} onChange={handleFileInputChange} className="hidden" accept="application/pdf" multiple />
                  <button onClick={handleDropZoneClick} className="w-full bg-brand-blue-600 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-brand-blue-700 transition-colors duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2">
                    <Plus className="h-5 w-5" />
                    Add PDF files
                  </button>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">Drag pages to reorder. Use hover controls for actions.</div>
                <div>
                  <label className="block text-gray-700 mb-1">Output filename prefix</label>
                  <input value={exportPrefix} onChange={(e) => setExportPrefix(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-brand-blue-500 focus:border-brand-blue-500 text-sm" />
                </div>
                {infoMessage && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">{infoMessage}</div>
                )}
              </div>
              <div className="p-5 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                <div className="grid grid-cols-1 gap-2">
                  <button onClick={exportAsSingle} className="w-full bg-brand-blue-600 text-white font-bold py-4 px-4 rounded-xl hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center text-lg">
                    Download single PDF
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </button>
                  <button onClick={exportByMarkers} className="w-full bg-white border border-gray-300 text-gray-700 font-medium py-2.5 px-4 rounded-xl hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center gap-2">
                    <ArrowRight className="h-5 w-5" /> Download split ZIP
                  </button>
                  <button onClick={exportSelected} disabled={!anySelected} className="w-full bg-white border border-gray-300 text-gray-700 font-medium py-2.5 px-4 rounded-xl hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50">
                    <ArrowRight className="h-5 w-5" /> Download selected pages
                  </button>
                </div>
              </div>
            </aside>

          </>
        )}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-50">
            <div className="w-12 h-12 border-4 border-brand-blue-200 border-t-brand-blue-600 rounded-full animate-spin"></div>
          </div>
        )}
      </main>
      {preview && (() => {
        const p = pages[preview.idx];
        if (!p || p.fileId === 'blank') return null;
        const f = files.find((x) => x.id === p.fileId);
        const pdfDocJS = f?.pdfDocJS;
        const totalPages = f?.pageCount || 1;
        const currentPage = p.pageIndex + 1;
        const navigateWithinFile = (direction: 'prev' | 'next') => {
          const delta = direction === 'prev' ? -1 : 1;
          const nextPageIndex = p.pageIndex + delta;
          if (nextPageIndex < 0 || nextPageIndex >= totalPages) return;
          const nextGlobalIdx = pages.findIndex((g) => g.fileId === p.fileId && g.pageIndex === nextPageIndex);
          if (nextGlobalIdx !== -1) setPreview({ idx: nextGlobalIdx });
        };
        return (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
            <PagePreviewModal
              currentPage={currentPage}
              totalPages={totalPages}
              pdfDoc={pdfDocJS}
              onClose={() => setPreview(null)}
              onNavigate={navigateWithinFile}
              onBack={() => setPreview(null)}
              onRotateLeft={() => {
                const next = pages.map((item, i) => i === preview.idx ? { ...item, rotation: (item.rotation + 270) % 360 } : item);
                pushHistory(next);
              }}
              onRotateRight={() => {
                const next = pages.map((item, i) => i === preview.idx ? { ...item, rotation: (item.rotation + 90) % 360 } : item);
                pushHistory(next);
              }}
              onDelete={() => {
                const next = pages.filter((_, i) => i !== preview.idx);
                pushHistory(next);
                setPreview(null);
              }}
            />
          </div>
        );
      })()}
    </div>
  );
};

export default MultiPDFTool;

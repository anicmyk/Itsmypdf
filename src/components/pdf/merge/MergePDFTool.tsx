import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Plus, X, GripVertical, ArrowRight, ArrowDownUp, ChevronDown, FileText, Calendar, FileStack, HardDrive, Settings, RotateCw } from 'lucide-react';
import { PdfUploadHero } from '@/components/pdf/shared/PdfUploadHero';
import { PdfPageCard } from '@/components/pdf/shared/PdfPageCard';
import { ToolCTAs } from '@/components/pdf/shared/ToolCTAs';
import { MobileLayout } from '@/components/pdf/shared/MobileLayout';
import { TOOL_HERO_UI } from '@/lib/toolHeroConfig';

// Set up PDF.js with the WORKING worker configuration
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

const hero = TOOL_HERO_UI['merge-pdf'];

interface PDFFile {
  id: string;
  file: File;
  pdfDoc: any;
  pageCount: number;
  rotation: number; // 0, 90, 180, 270
}

const MergePDFTool: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State management
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<{ id: string; before: boolean } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [dragSize, setDragSize] = useState<{ w: number; h: number } | null>(null);
  const [cardRects, setCardRects] = useState<Record<string, DOMRect>>({});
  const thumbsRef = useRef<HTMLDivElement>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState(0);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  // File upload handlers
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
          const loadedPdfDoc = await pdfjsLib.getDocument({ url, disableAutoFetch: false, disableStream: false }).promise;
          const pageCount = loadedPdfDoc.numPages;

          // No need to render thumbnail, PdfPageCard handles it lazily using the file
          pdfFilesToAdd.push({
            id: `${Date.now()}-${Math.random()}`,
            file,
            pdfDoc: loadedPdfDoc,
            pageCount,
            rotation: 0 // Initialize with 0 rotation
          });
        } catch (error) {
          console.error('Error loading PDF:', file.name, error);

        } finally {
          // Revoke URL after document is loaded (pdf.js loads it into memory)
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



  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleFileDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
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

  // Sync ref for cleanup
  const pdfFilesRef = useRef(pdfFiles);
  useEffect(() => {
    pdfFilesRef.current = pdfFiles;
  }, [pdfFiles]);

  // Cleanup PDF docs on unmount
  useEffect(() => {
    return () => {
      pdfFilesRef.current.forEach(pdfFile => {
        if (pdfFile.pdfDoc && pdfFile.pdfDoc.destroy) {
          pdfFile.pdfDoc.destroy().catch(() => { });
        }
      });
    };
  }, []);

  const removePDF = (id: string) => {
    setPdfFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove && fileToRemove.pdfDoc && fileToRemove.pdfDoc.destroy) {
        fileToRemove.pdfDoc.destroy().catch(() => { });
      }

      const newFiles = prev.filter(f => f.id !== id);
      if (newFiles.length === 0) {

      } else {

      }
      return newFiles;
    });
  };

  // Rotate PDF - cycles through 0, 90, 180, 270
  const rotatePDF = (id: string) => {
    setPdfFiles(prev => prev.map(pdf =>
      pdf.id === id
        ? { ...pdf, rotation: (pdf.rotation + 90) % 360 }
        : pdf
    ));
  };

  // Drag and drop handlers for reordering PDFs
  const startPointerDrag = (e: React.PointerEvent, index: number, id: string) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    setDraggedIndex(index);
    setIsDragging(true);
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDragPos({ x: e.clientX, y: e.clientY });
    setDragSize({ w: rect.width, h: rect.height });
    const map: Record<string, DOMRect> = {};
    thumbsRef.current?.querySelectorAll('[data-pdf-id]').forEach((el) => {
      const node = el as HTMLElement;
      const key = node.getAttribute('data-pdf-id') || '';
      map[key] = node.getBoundingClientRect();
    });
    setCardRects(map);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  useEffect(() => {
    const onMove = (ev: PointerEvent) => {
      if (!isDragging) return;
      setDragPos({ x: ev.clientX, y: ev.clientY });
      const entries = Object.entries(cardRects);
      if (entries.length === 0) return;
      let hoverId = entries[0][0];
      let hoverRect = entries[0][1];
      let minDist = Infinity;
      for (const [id, r] of entries) {
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const d = Math.hypot(ev.clientX - cx, ev.clientY - cy);
        if (d < minDist) {
          minDist = d;
          hoverId = id;
          hoverRect = r;
        }
      }
      const before = ev.clientX < hoverRect.left + hoverRect.width / 2;
      setDropPosition({ id: hoverId, before });
      const idx = Object.keys(cardRects).indexOf(hoverId);
      setDragOverIndex(idx === -1 ? null : idx);
    };
    const onUp = () => {
      if (!isDragging) return;
      if (draggedIndex !== null && dropPosition) {
        const droppedOnIndex = pdfFiles.findIndex((f) => f.id === dropPosition.id);
        if (droppedOnIndex !== -1 && draggedIndex !== droppedOnIndex) {
          const next = [...pdfFiles];
          const dragged = next[draggedIndex];
          next.splice(draggedIndex, 1);
          const insertIndex = dropPosition.before ? droppedOnIndex : droppedOnIndex + 1;
          next.splice(insertIndex, 0, dragged);
          setPdfFiles(next);
        }
      }
      setIsDragging(false);
      setDraggedIndex(null);
      setDragOverIndex(null);
      setDropPosition(null);
      setDragPos(null);
      setDragOffset(null);
      setDragSize(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [isDragging, cardRects, draggedIndex, dropPosition, pdfFiles]);

  const handleDragOver = (e: React.DragEvent, fileId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null || pdfFiles[draggedIndex]?.id === fileId) {
      if (dropPosition) setDropPosition(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    // For horizontal layout, check if dragging from left or right
    const isBefore = e.clientX < rect.left + rect.width / 2;
    const fileIndex = pdfFiles.findIndex(f => f.id === fileId);
    if (dropPosition?.id !== fileId || dropPosition?.before !== isBefore) {
      setDropPosition({ id: fileId, before: isBefore });
      setDragOverIndex(fileIndex);
    }
  };

  const handleDragLeave = () => {
    setDropPosition(null);
  };

  const handlePDFDrop = (e: React.DragEvent, droppedOnId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedIndex !== null && dropPosition) {
      const droppedOnIndex = pdfFiles.findIndex(f => f.id === droppedOnId);
      if (droppedOnIndex !== -1 && draggedIndex !== droppedOnIndex) {
        const newFiles = [...pdfFiles];
        const draggedFile = newFiles[draggedIndex];
        newFiles.splice(draggedIndex, 1);
        const insertIndex = dropPosition.before ? droppedOnIndex : droppedOnIndex + 1;
        newFiles.splice(insertIndex, 0, draggedFile);
        setPdfFiles(newFiles);
      }
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
    setDropPosition(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDropPosition(null);
  };

  // Sort PDFs by different criteria
  const handleSort = (sortBy: 'name' | 'date' | 'pages' | 'size') => {
    let sorted = [...pdfFiles];

    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => a.file.name.localeCompare(b.file.name));
        break;
      case 'date':
        // Sort by upload order (most recent first)
        sorted.reverse();
        break;
      case 'pages':
        sorted.sort((a, b) => b.pageCount - a.pageCount);
        break;
      case 'size':
        sorted.sort((a, b) => b.file.size - a.file.size);
        break;
    }

    setPdfFiles(sorted);
    setShowSortMenu(false);
  };

  // Close sort menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false);
      }
    };

    if (showSortMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSortMenu]);

  // Merge PDFs
  const handleMerge = async () => {
    if (pdfFiles.length < 2) {

      return;
    }

    setIsMerging(true);
    setMergeProgress(0);


    try {
      const { PDFDocument, degrees } = await import('pdf-lib');
      const mergedPdf = await PDFDocument.create();

      setMergeProgress(10);
      const totalFiles = pdfFiles.length;

      for (let i = 0; i < totalFiles; i++) {
        const pdfFile = pdfFiles[i];
        const arrayBuffer = await pdfFile.file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());

        // Apply rotation to each page
        copiedPages.forEach((page) => {
          if (pdfFile.rotation !== 0) {
            page.setRotation(degrees(pdfFile.rotation));
          }
          mergedPdf.addPage(page);
        });

        // Update progress: 10-70% for processing files
        setMergeProgress(10 + Math.floor((i + 1) / totalFiles * 60));
      }

      setMergeProgress(75);
      const pdfBytes = await mergedPdf.save();
      setMergeProgress(90);
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });

      // Download the merged PDF
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'merged.pdf';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);


      setMergeProgress(100);
      setIsMerging(false);
    } catch (error) {
      console.error('Merge error:', error);

      setIsMerging(false);
      setMergeProgress(0);
    }
  };

  // Extract settings content for mobile panel
  const settingsContent = (
    <div className="p-5 space-y-4">
      <button
        onClick={handleDropZoneClick}
        className="w-full bg-brand-blue-600 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-brand-blue-700 active:bg-brand-blue-800 transition-colors duration-200 shadow-sm flex items-center justify-center gap-2 min-h-[48px]"
        aria-label="Add PDF files"
      >
        <Plus className="h-5 w-5" />
        Add PDF files
        {pdfFiles.length > 0 && (
          <span className="bg-white/20 text-white text-xs font-bold rounded-full px-2 py-0.5 ml-1">
            {pdfFiles.length}
          </span>
        )}
      </button>

      <div className="relative">
        <button
          onClick={() => setShowSortMenu(!showSortMenu)}
          disabled={pdfFiles.length < 2}
          className="w-full bg-white border border-gray-300 text-gray-700 font-medium py-2.5 px-4 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[48px]"
          aria-label="Sort PDFs"
        >
          <ArrowDownUp className="h-5 w-5" />
          Sort PDFs
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showSortMenu ? 'rotate-180' : ''}`} />
        </button>

        {showSortMenu && pdfFiles.length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
            <button
              onClick={() => handleSort('name')}
              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 active:bg-gray-100 transition-colors duration-150 flex items-center gap-3 text-sm text-gray-700 min-h-[48px]"
            >
              <FileText className="h-4 w-4 text-gray-500" />
              <span>Sort by name</span>
            </button>
            <button
              onClick={() => handleSort('date')}
              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 active:bg-gray-100 transition-colors duration-150 flex items-center gap-3 text-sm text-gray-700 min-h-[48px]"
            >
              <Calendar className="h-4 w-4 text-gray-500" />
              <span>Sort by date added</span>
            </button>
            <button
              onClick={() => handleSort('pages')}
              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 active:bg-gray-100 transition-colors duration-150 flex items-center gap-3 text-sm text-gray-700 min-h-[48px]"
            >
              <FileStack className="h-4 w-4 text-gray-500" />
              <span>Sort by page count</span>
            </button>
            <button
              onClick={() => handleSort('size')}
              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 active:bg-gray-100 transition-colors duration-150 flex items-center gap-3 text-sm text-gray-700 border-t border-gray-100 min-h-[48px]"
            >
              <HardDrive className="h-4 w-4 text-gray-500" />
              <span>Sort by file size</span>
            </button>
          </div>
        )}
      </div>

      {/* Helpful instructions */}
      {pdfFiles.length === 1 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          <strong>Add at least one more PDF</strong> to merge them together.
        </div>
      ) : pdfFiles.length > 1 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          <strong>Drag and drop</strong> to reorder your PDFs.
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gray-50 font-sans overflow-hidden">
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {pdfFiles.length === 0 ? (
          <div className="flex-grow flex items-center justify-center p-4 md:p-8">
            <PdfUploadHero
              onFilesSelect={handleFileSelect}
              title={hero.title}
              description={hero.description}
              accept={hero.accept}
              multiple={hero.multiple}
              icon={<Plus className="h-6 w-6 mr-3" />}
            />
          </div>
        ) : (
          <>
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

            {/* Main content: PDF Thumbnails */}
            <div className="flex-grow p-4 md:p-8 flex flex-col items-center overflow-y-auto bg-gray-100 relative pb-24 md:pb-8">
              <div ref={thumbsRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 max-w-6xl mx-auto w-full">
                {pdfFiles.map((pdfFile, index) => {
                  const isDragged = draggedIndex === index;
                  return (
                    <div
                      key={pdfFile.id}
                      data-pdf-id={pdfFile.id}
                      className="relative"
                    >
                      {/* Professional drop indicator */}
                      {dropPosition?.id === pdfFile.id && draggedIndex !== index && (
                        <div
                          className={`absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-brand-blue-400 to-brand-blue-600 shadow-lg z-10 ${dropPosition.before ? '-left-2' : '-right-2'}`}
                          style={{
                            boxShadow: dropPosition.before
                              ? '-2px 0 8px rgba(59, 130, 246, 0.5)'
                              : '2px 0 8px rgba(59, 130, 246, 0.5)'
                          }}
                        />
                      )}
                      <div
                        onPointerDown={(e) => startPointerDrag(e, index, pdfFile.id)}
                        className={`group flex flex-col items-center flex-shrink-0 transition-opacity duration-200 cursor-move relative transform-none ${isDragged && isDragging ? 'opacity-30' : 'opacity-100'}`}
                      >
                        <PdfPageCard
                          pageNumber={1}
                          file={pdfFile.file}
                          pageIndex={0}
                          rotation={pdfFile.rotation}
                        >
                          {/* Action buttons - always visible on mobile, hover on desktop */}
                          <div className="absolute top-2 right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 z-10 flex gap-1">
                            <button
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => { e.stopPropagation(); rotatePDF(pdfFile.id); }}
                              className="bg-brand-blue-500 text-white rounded-full p-2 md:p-1.5 hover:bg-brand-blue-600 active:bg-brand-blue-700 transition-colors duration-200 shadow-lg min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
                              aria-label="Rotate PDF"
                            >
                              <RotateCw className="h-5 w-5 md:h-4 md:w-4" />
                            </button>
                            <button
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => { e.stopPropagation(); removePDF(pdfFile.id); }}
                              className="bg-brand-blue-500 text-white rounded-full p-2 md:p-1.5 hover:bg-brand-blue-600 active:bg-brand-blue-700 transition-colors duration-200 shadow-lg min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
                              aria-label="Remove PDF"
                            >
                              <X className="h-5 w-5 md:h-4 md:w-4" />
                            </button>
                          </div>

                          {/* Filename */}
                          <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm px-2 py-1.5 border-t border-gray-200">
                            <p className="text-xs font-medium text-gray-800 text-center truncate" title={pdfFile.file.name}>
                              {pdfFile.file.name}
                            </p>
                          </div>
                        </PdfPageCard>

                        {/* Tooltip - desktop only */}
                        <div className="hidden md:block absolute -bottom-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
                          <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl whitespace-nowrap">
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-gray-900" />
                            {(pdfFile.file.size / 1024 / 1024).toFixed(2)} MB • {pdfFile.pageCount} {pdfFile.pageCount === 1 ? 'page' : 'pages'}
                          </div>
                        </div>
                      </div>
                      {isDragged && isDragging && dragPos && dragOffset && (
                        <div
                          className="pointer-events-none fixed z-50"
                          style={{ left: dragPos.x - dragOffset.x, top: dragPos.y - dragOffset.y, width: '160px' }}
                        >
                          <PdfPageCard
                            pageNumber={1}
                            file={pdfFile.file}
                            pageIndex={0}
                            rotation={pdfFile.rotation}
                          >
                            <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm px-2 py-1.5 border-t border-gray-200">
                              <p className="text-xs font-medium text-gray-800 text-center truncate">
                                {pdfFile.file.name}
                              </p>
                            </div>
                          </PdfPageCard>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile Layout - Settings panel, floating button, action button */}
            <MobileLayout
              settingsTitle="Merge Options"
              settingsContent={settingsContent}
              actionButton={{
                label: 'Merge PDF',
                onClick: handleMerge,
                disabled: pdfFiles.length < 2,
                isProcessing: isMerging,
                processingText: 'Merging...',
                progress: mergeProgress
              }}
            >
              {/* Empty - main content is rendered above for drag-and-drop functionality */}
              <></>
            </MobileLayout>

            {/* Desktop Sidebar - hidden on mobile */}
            <aside className="hidden md:flex w-96 flex-shrink-0 bg-white border-l border-gray-200 flex-col h-full overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-brand-blue-600" />
                  Merge Options
                </h2>
              </div>

              <div className="flex-1 p-5 flex flex-col space-y-4 overflow-hidden min-h-0">
                <div className="space-y-3">
                  <button
                    onClick={handleDropZoneClick}
                    className="w-full bg-brand-blue-600 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-brand-blue-700 transition-colors duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                    aria-label="Add PDF files"
                  >
                    <Plus className="h-5 w-5" />
                    Add PDF files
                    {pdfFiles.length > 0 && (
                      <span className="bg-white/20 text-white text-xs font-bold rounded-full px-2 py-0.5 ml-1">
                        {pdfFiles.length}
                      </span>
                    )}
                  </button>

                  <div className="relative" ref={sortMenuRef}>
                    <button
                      onClick={() => setShowSortMenu(!showSortMenu)}
                      disabled={pdfFiles.length < 2}
                      className="w-full bg-white border border-gray-300 text-gray-700 font-medium py-2.5 px-4 rounded-lg hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      aria-label="Sort PDFs"
                    >
                      <ArrowDownUp className="h-5 w-5" />
                      Sort PDFs
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showSortMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {showSortMenu && pdfFiles.length >= 2 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                        <button
                          onClick={() => handleSort('name')}
                          className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors duration-150 flex items-center gap-3 text-sm text-gray-700"
                        >
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span>Sort by name</span>
                        </button>
                        <button
                          onClick={() => handleSort('date')}
                          className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors duration-150 flex items-center gap-3 text-sm text-gray-700"
                        >
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span>Sort by date added</span>
                        </button>
                        <button
                          onClick={() => handleSort('pages')}
                          className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors duration-150 flex items-center gap-3 text-sm text-gray-700"
                        >
                          <FileStack className="h-4 w-4 text-gray-500" />
                          <span>Sort by page count</span>
                        </button>
                        <button
                          onClick={() => handleSort('size')}
                          className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors duration-150 flex items-center gap-3 text-sm text-gray-700 border-t border-gray-100"
                        >
                          <HardDrive className="h-4 w-4 text-gray-500" />
                          <span>Sort by file size</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Helpful instructions */}
                {pdfFiles.length === 1 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                    <strong>Add at least one more PDF</strong> to merge them together.
                  </div>
                ) : pdfFiles.length > 1 ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                    <strong>Drag and drop</strong> to reorder your PDFs.
                  </div>
                ) : null}
              </div>

              <div className="p-5 border-t border-gray-200 bg-gray-50 mt-auto flex-shrink-0">
                <button
                  onClick={handleMerge}
                  disabled={pdfFiles.length < 2 || isMerging}
                  title={pdfFiles.length < 2 ? 'Add at least 2 PDFs to merge' : ''}
                  className="relative overflow-hidden w-full text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center text-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-blue-700 hover:shadow-xl"
                  style={{
                    background: isMerging ? '#e5e7eb' : '#2563eb'
                  }}
                >
                  {/* Progress fill animation */}
                  {isMerging && (
                    <div
                      className="absolute inset-0 bg-brand-blue-600 transition-all duration-300 ease-out"
                      style={{ width: `${mergeProgress}%` }}
                    />
                  )}

                  {/* Button content */}
                  <span className="relative z-10 flex items-center">
                    {isMerging ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Merging... {mergeProgress}%
                      </>
                    ) : (
                      <>
                        Merge PDF
                        <ArrowRight className="h-5 w-5 ml-2" />
                      </>
                    )}
                  </span>
                </button>

                {/* Bookmark and Share CTAs */}
                <ToolCTAs variant="sidebar" />
              </div>
            </aside>
          </>
        )}
      </main>
    </div>
  );
};

export default MergePDFTool;



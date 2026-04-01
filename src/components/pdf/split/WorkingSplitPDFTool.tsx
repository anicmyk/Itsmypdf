import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Grid, FileStack, Maximize2, Plus, X, GripVertical } from 'lucide-react';
import type { CustomRange } from './splitTypes';
import { RangePagesView } from './RangePagesView';
import { PageDetailView } from './PageDetailView';

import { PdfUploadHero } from '@/components/pdf/shared/PdfUploadHero';
import { SplitToolLayout } from './SplitToolLayout';
import { TOOL_HERO_UI } from '@/lib/toolHeroConfig';

// Set up PDF.js with the WORKING worker configuration
// Set up PDF.js with the WORKING worker configuration
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
const hero = TOOL_HERO_UI['split-pdf'];

const WorkingSplitPDFTool: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State management
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null); // Store the original file
  const [hasUploaded, setHasUploaded] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<'range' | 'pages' | 'size'>('range');
  const [mode, setMode] = useState<'custom' | 'fixed'>('custom');
  const [customRanges, setCustomRanges] = useState<CustomRange[]>([{ id: 1, from: 1, to: 1 }]);
  const [nextRangeId, setNextRangeId] = useState<number>(2);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [extractMode, setExtractMode] = useState<'all' | 'select'>('all');
  const [pagesToExtractValue, setPagesToExtractValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string>('Upload a PDF file to begin.');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalPageNumber, setModalPageNumber] = useState<number>(0);
  const modalCanvasRef = useRef<HTMLCanvasElement>(null);
  const [viewingRange, setViewingRange] = useState<CustomRange | null>(null);
  const [viewingRangeIndex, setViewingRangeIndex] = useState<number | null>(null);
  const [detailedPage, setDetailedPage] = useState<{ range: CustomRange; pageNumber: number } | null>(null);
  const [mergeRanges, setMergeRanges] = useState<boolean>(false);
  const [mergePages, setMergePages] = useState<boolean>(false);
  const [rangeSize, setRangeSize] = useState<number>(2);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<{ id: number; before: boolean } | null>(null);
  const [sizeValue, setSizeValue] = useState<number>(10);
  const [sizeUnit, setSizeUnit] = useState<'MB' | 'KB'>('MB');
  const [splitProgress, setSplitProgress] = useState(0);
  const [isSplitting, setIsSplitting] = useState(false);
  const sizePreviewCanvasRef = useRef<HTMLCanvasElement>(null);

  // File info for Size tab
  const [fileSizeStr, setFileSizeStr] = useState<string>('');
  const [estimatedFiles, setEstimatedFiles] = useState<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncTabWithHash = () => {
      if (window.location.hash === '#extract') {
        setCurrentTab('pages');
      }
    };

    syncTabWithHash();
    window.addEventListener('hashchange', syncTabWithHash);
    return () => window.removeEventListener('hashchange', syncTabWithHash);
  }, []);

  // State for cleanup
  const fileUrlRef = useRef<string | null>(null);

  // Cleanup effect for PDF document and File URL
  useEffect(() => {
    return () => {
      if (fileUrlRef.current) {
        URL.revokeObjectURL(fileUrlRef.current);
        fileUrlRef.current = null;
      }
      if (pdfDoc) {
        // Attempt to destroy if method exists (depends on PDF.js version)
        if (pdfDoc.destroy) {
          pdfDoc.destroy().catch(() => { });
        }
      }
    };
  }, [pdfDoc]);

  // File upload handlers - WORKING approach (from the working code)
  const handleFileSelect = async (file: File) => {
    if (!file || file.type !== 'application/pdf') {
      setInfoMessage('Please select a valid PDF file.');
      return;
    }

    // Cleanup previous file URL if exists
    if (fileUrlRef.current) {
      URL.revokeObjectURL(fileUrlRef.current);
    }

    const url = URL.createObjectURL(file);
    fileUrlRef.current = url; // Store for cleanup

    setIsLoading(true);
    setInfoMessage('Loading PDF document...');

    try {
      const loadedPdfDoc = await pdfjsLib.getDocument(url).promise;

      // Store the original file for later use in splitting
      setPdfFile(file);
      setPdfDoc(loadedPdfDoc);
      setHasUploaded(true);
      setIsLoading(false);
      setSelectedPages([]);

      // Calculate file size string
      const sizeMB = file.size / (1024 * 1024);
      setFileSizeStr(sizeMB < 1
        ? `${(file.size / 1024).toFixed(0)} KB`
        : `${sizeMB.toFixed(2)} MB`
      );

      // Initialize with one range for custom mode - update to use actual page count
      setCustomRanges([{ id: 1, from: 1, to: loadedPdfDoc.numPages }]);
      setNextRangeId(2);

      // Initialize Pages tab state if on Pages tab
      if (currentTab === 'pages') {
        const allPages = Array.from({ length: loadedPdfDoc.numPages }, (_, i) => i + 1);
        setSelectedPages(allPages);
        setExtractMode('all');
        updatePagesToExtract(allPages);
        const pdfCount = loadedPdfDoc.numPages;
        setInfoMessage(`Selected pages will be converted into separate PDF files. ${pdfCount} PDF will be created.`);
      }

      // Update UI based on current tab
      if (currentTab === 'range') {
        renderRanges();
      } else if (currentTab === 'pages') {
        renderPages();
      }

      setInfoMessage(`PDF loaded successfully with ${loadedPdfDoc.numPages} pages.`);

    } catch (error) {
      console.error('Error loading PDF:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown name'
      });
      setIsLoading(false);
      setPdfFile(null); // Clear file on error

      // Cleanup on error
      if (fileUrlRef.current) {
        URL.revokeObjectURL(fileUrlRef.current);
        fileUrlRef.current = null;
      }

      setInfoMessage(`Error loading PDF: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
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

  // Instant rendering when ranges change - no delays


  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDropZoneClick = () => {
    fileInputRef.current?.click();
  };

  // Tab switching
  const handleTabClick = (tabIndex: number) => {
    const tabs = ['range', 'pages', 'size'] as const;
    const newTab = tabs[tabIndex];
    setCurrentTab(newTab);

    if (hasUploaded && pdfDoc) {
      if (newTab === 'range') {
        renderRanges();
        setInfoMessage(`You have defined ${customRanges.length} custom ranges.`);
        // Rendering will be triggered automatically by useEffect
      } else if (newTab === 'pages') {
        // Preserve state - don't reset if already set
        if (selectedPages.length === 0 && extractMode === 'all') {
          // Only initialize if nothing is selected
          const allPages = Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1);
          setSelectedPages(allPages);
          setExtractMode('all');
          updatePagesToExtract(allPages);
        }
        renderPages();

        // Update info message based on current mode
        if (extractMode === 'all') {
          const pdfCount = pdfDoc.numPages;
          setInfoMessage(`Selected pages will be converted into separate PDF files. ${pdfCount} PDF will be created.`);
        } else if (extractMode === 'select' && selectedPages.length > 0) {
          const pdfCount = mergePages ? 1 : selectedPages.length;
          setInfoMessage(`Selected pages will be converted into separate PDF files. ${pdfCount} PDF${pdfCount !== 1 ? 's' : ''} will be created.`);
        } else {
          setInfoMessage(`Ready to select pages for extraction.`);
        }

        // Always re-render pages when switching to Pages tab to ensure clean state
        // Always re-render pages when switching to Pages tab to ensure clean state
        // Lazy loading handles this now
        /*
        requestAnimationFrame(() => {
          setTimeout(() => {
            // Force re-render by clearing all canvases first
            const pageCards = document.querySelectorAll('canvas[data-page]');
            pageCards.forEach(canvas => {
              const ctx = (canvas as HTMLCanvasElement).getContext('2d');
              if (ctx) {
                (canvas as HTMLCanvasElement).width = 0;
                (canvas as HTMLCanvasElement).height = 0;
              }
            });
            renderPagesForSelection();
          }, 100);
        });
        */
      } else if (newTab === 'size') {
        const unit = sizeUnit;
        const val = sizeValue;
        setInfoMessage(`PDF will be split into files of maximum ${val}${unit} each.`);

        // Render preview if PDF is loaded
        if (pdfDoc) {
          setTimeout(() => {
            renderSizePreview();
          }, 100);
        }
      }
    } else {
      // Pre-upload state messages
      if (newTab === 'range') {
        setInfoMessage('Configure range-based splitting settings. Upload a PDF to begin.');
      } else if (newTab === 'pages') {
        setInfoMessage('Configure page-based extraction settings. Upload a PDF to begin.');
      } else if (newTab === 'size') {
        setInfoMessage('Configure size-based splitting settings. Upload a PDF to begin.');
      }
    }
  };

  // Range mode handlers
  const handleCustomMode = () => {
    setMode('custom');
    if (hasUploaded && pdfDoc) {
      renderRanges();
      // Rendering will be triggered automatically by useEffect
    }
  };

  const handleFixedMode = () => {
    setMode('fixed');
    if (hasUploaded && pdfDoc) {
      renderRanges();
      // Update info message for fixed mode
      const totalRanges = Math.ceil(pdfDoc.numPages / rangeSize);
      setInfoMessage(`PDF will be split into ${totalRanges} range${totalRanges !== 1 ? 's' : ''} of ${rangeSize} page${rangeSize !== 1 ? 's' : ''} each.`);
    }
  };

  // Custom range handlers
  const addCustomRange = (start = 1, end?: number) => {
    const defaultEnd = end ?? (pdfDoc?.numPages || 1);
    const newRange: CustomRange = { id: nextRangeId, from: start, to: defaultEnd };
    setCustomRanges(prev => [...prev, newRange]);
    setNextRangeId(prev => prev + 1);

    if (hasUploaded && pdfDoc) {
      renderRanges();
      // Rendering will be triggered automatically by useEffect
    }
  };

  const removeCustomRange = (index: number) => {
    // Prevent deleting the last remaining range
    if (customRanges.length <= 1) {
      return;
    }
    setCustomRanges(prev => prev.filter((_, i) => i !== index));
    if (hasUploaded && pdfDoc) {
      renderRanges();
    }
  };

  const updateCustomRange = (index: number, field: 'from' | 'to', value: number) => {
    setCustomRanges(prev => prev.map((range, i) => {
      if (i === index) {
        // Clamp value to valid page range
        const maxPages = pdfDoc?.numPages || 1000;
        const clampedValue = Math.max(1, Math.min(value, maxPages));

        const updated = { ...range, [field]: clampedValue };
        // Ensure 'to' is always >= 'from'
        if (field === 'from' && updated.to < updated.from) {
          updated.to = updated.from;
        } else if (field === 'to' && updated.to < updated.from) {
          updated.to = updated.from;
        }
        return updated;
      }
      return range;
    }));
    if (hasUploaded && pdfDoc) {
      renderRanges();
    }
  };

  // Drag and drop handlers for reordering ranges
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, rangeId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null || customRanges[draggedIndex]?.id === rangeId) {
      if (dropPosition) setDropPosition(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const isBefore = e.clientY < rect.top + rect.height / 2;
    const rangeIndex = customRanges.findIndex(r => r.id === rangeId);
    if (dropPosition?.id !== rangeId || dropPosition?.before !== isBefore) {
      setDropPosition({ id: rangeId, before: isBefore });
      setDragOverIndex(rangeIndex);
    }
  };

  const handleDragLeave = () => {
    setDropPosition(null);
  };

  const handleRangeDrop = (e: React.DragEvent, droppedOnId: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedIndex !== null && dropPosition) {
      const droppedOnIndex = customRanges.findIndex(r => r.id === droppedOnId);
      if (droppedOnIndex !== -1 && draggedIndex !== droppedOnIndex) {
        const newRanges = [...customRanges];
        const draggedRange = newRanges[draggedIndex];
        newRanges.splice(draggedIndex, 1);
        const insertIndex = dropPosition.before ? droppedOnIndex : droppedOnIndex + 1;
        newRanges.splice(insertIndex, 0, draggedRange);
        setCustomRanges(newRanges);

        if (hasUploaded && pdfDoc) {
          renderRanges();
        }
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

  // Extract mode handlers
  const handleExtractAll = () => {
    setExtractMode('all');
    if (pdfDoc) {
      const allPages = Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1);
      setSelectedPages(allPages);
      updatePagesToExtract(allPages);
      const pdfCount = pdfDoc.numPages;
      setInfoMessage(`Selected pages will be converted into separate PDF files. ${pdfCount} PDF will be created.`);
    }
  };

  const handleSelectPages = () => {
    setExtractMode('select');
    // Uncheck all boxes when switching to Select pages mode
    setSelectedPages([]);
    setPagesToExtractValue('');
    setInfoMessage(`Ready to select pages for extraction.`);
  };

  // Page selection handlers
  const togglePageSelection = (pageNum: number) => {
    setSelectedPages(prev => {
      const newSelection = prev.includes(pageNum)
        ? prev.filter(p => p !== pageNum)
        : [...prev, pageNum];

      // Auto-switch mode based on selection
      if (pdfDoc) {
        const total = pdfDoc.numPages;
        if (newSelection.length === total) {
          setExtractMode('all');
          const pdfCount = total;
          setInfoMessage(`Selected pages will be converted into separate PDF files. ${pdfCount} PDF will be created.`);
        } else {
          setExtractMode('select');
          if (newSelection.length > 0) {
            const pdfCount = mergePages ? 1 : newSelection.length;
            setInfoMessage(`Selected pages will be converted into separate PDF files. ${pdfCount} PDF${pdfCount !== 1 ? 's' : ''} will be created.`);
          } else {
            setInfoMessage(`Ready to select pages for extraction.`);
          }
        }
      }

      updatePagesToExtract(newSelection);
      return newSelection;
    });
  };

  // Modal handlers
  const openModal = async (pageNum: number) => {
    setModalPageNumber(pageNum);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalPageNumber(0);
  };

  const handleViewRange = (range: CustomRange, index?: number) => {
    setViewingRange(range);
    setViewingRangeIndex(index !== undefined ? index : customRanges.findIndex(r => r.id === range.id));
  };

  const handleSelectPage = (pageNumber: number) => {
    if (viewingRange) {
      setDetailedPage({ range: viewingRange, pageNumber });
      setViewingRange(null);
      setViewingRangeIndex(null);
    }
  };

  const handleCloseDetailedPage = () => {
    setDetailedPage(null);
  };

  const handleCloseAllModals = () => {
    setViewingRange(null);
    setViewingRangeIndex(null);
    setDetailedPage(null);
    setShowModal(false);
  };

  const handleBackToRangeView = () => {
    if (detailedPage) {
      const range = detailedPage.range;
      setDetailedPage(null);
      // Find the range index to restore the viewing range with correct index
      // For custom mode, find by ID; for fixed mode, calculate from page numbers
      let rangeIndex: number | null = null;
      if (mode === 'custom') {
        rangeIndex = customRanges.findIndex(r => r.id === range.id);
      } else if (mode === 'fixed' && pdfDoc) {
        // In fixed mode, calculate index from the range start page
        const calculatedIndex = Math.floor((range.from - 1) / rangeSize);
        rangeIndex = calculatedIndex >= 0 ? calculatedIndex : null;
      }
      setViewingRange(range);
      setViewingRangeIndex(rangeIndex);
    }
  };

  const handleNavigateDetailedPage = (direction: 'prev' | 'next') => {
    if (!detailedPage) return;

    const { range, pageNumber } = detailedPage;
    let newPageNumber = pageNumber;

    if (direction === 'prev' && pageNumber > range.from) {
      newPageNumber = pageNumber - 1;
    } else if (direction === 'next' && pageNumber < range.to) {
      newPageNumber = pageNumber + 1;
    }

    if (newPageNumber !== pageNumber) {
      setDetailedPage({ ...detailedPage, pageNumber: newPageNumber });
    }
  };

  // Render page to modal when modal opens
  useEffect(() => {
    if (showModal && modalPageNumber > 0 && pdfDoc && modalCanvasRef.current) {
      renderPageToCanvas(modalPageNumber, modalCanvasRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal, modalPageNumber, pdfDoc]);



  // WORKING page rendering for modal preview (from the working code)
  const renderPageToCanvas = async (pageNum: number, canvas: HTMLCanvasElement) => {
    if (!pdfDoc || !canvas) {
      return;
    }

    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get 2D context from canvas');
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (error) {
      console.error('Error rendering page to canvas', pageNum, ':', error);
      // Fill canvas with error indication
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#666';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Error loading page ${pageNum}`, canvas.width / 2, canvas.height / 2);
      }
    }
  };

  const renderRanges = async () => {
    if (!pdfDoc || !hasUploaded) return;

    const total = pdfDoc.numPages;
    let totalPages = 0;

    if (mode === 'custom') {
      customRanges.forEach(({ from, to }) => {
        if (from > 0 && to >= from && from <= total && to <= total) {
          totalPages += (to - from + 1);
        }
      });

      setInfoMessage(`You have defined ${customRanges.length} custom ranges totaling ${totalPages} pages.`);
    } else if (mode === 'fixed') {
      const totalRanges = Math.ceil(total / rangeSize);
      setInfoMessage(`PDF will be split into ${totalRanges} range${totalRanges !== 1 ? 's' : ''} of ${rangeSize} page${rangeSize !== 1 ? 's' : ''} each.`);
    }
  };

  const renderPages = () => {
    if (!pdfDoc || !hasUploaded) return;

    const total = pdfDoc.numPages;

    // Initialize selected pages if empty and extractMode is 'all'
    if (selectedPages.length === 0 && extractMode === 'all') {
      const allPages = Array.from({ length: total }, (_, i) => i + 1);
      setSelectedPages(allPages);
    }

    // Update info based on extract mode
    if (extractMode === 'all') {
      setInfoMessage(`Selected pages will be converted into separate PDF files. ${total} PDF will be created.`);
    } else {
      setInfoMessage(`Selected pages will be converted into separate PDF files. ${selectedPages.length} PDF will be created.`);
    }
  };

  const updatePagesToExtract = (pages: number[]) => {
    const sortedPages = [...pages].sort((a, b) => a - b);

    // Convert to range format (e.g., 1-5,7,9-10)
    let ranges: string[] = [];
    let start: number | null = null;
    let prev: number | null = null;

    sortedPages.forEach(page => {
      if (start === null) {
        start = page;
      } else if (prev !== null && page !== prev + 1) {
        if (start === prev) {
          ranges.push(String(start));
        } else {
          ranges.push(`${start}-${prev}`);
        }
        start = page;
      }
      prev = page;
    });

    if (start !== null) {
      if (start === prev) {
        ranges.push(String(start));
      } else {
        ranges.push(`${start}-${prev}`);
      }
    }

    const pagesValue = ranges.join(',');
    setPagesToExtractValue(pagesValue);
  };

  const parsePagesInput = (input: string) => {
    if (!pdfDoc) return;

    // Don't parse if input is empty or just whitespace
    if (!input.trim()) {
      return;
    }

    const maxPage = pdfDoc.numPages;
    const pages: number[] = [];
    const parts = input.split(',').map(p => p.trim()).filter(p => p);

    parts.forEach(part => {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
        if (start && end && start >= 1 && end <= maxPage && start <= end) {
          for (let i = start; i <= end; i++) {
            if (!pages.includes(i)) {
              pages.push(i);
            }
          }
        }
      } else {
        const pageNum = parseInt(part);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= maxPage) {
          if (!pages.includes(pageNum)) {
            pages.push(pageNum);
          }
        }
      }
    });

    if (pages.length > 0) {
      const sortedPages = [...pages].sort((a, b) => a - b);
      setSelectedPages(sortedPages);
      setExtractMode('select');
      // Don't update the input value here to allow free typing
    }
  };

  // Split button handler
  const handleSplit = async () => {
    if (!hasUploaded || !pdfDoc) {
      setInfoMessage('Please upload a PDF first.');
      return;
    }

    setIsSplitting(true);
    setSplitProgress(0);

    try {
      if (currentTab === 'range') {
        if (mode === 'custom') {
          setInfoMessage(`Splitting into ${customRanges.length} custom ranges...`);
          // Convert CustomRange[] to [number, number][] for the function
          const rangesAsTuples = customRanges.map(range => [range.from, range.to]) as Array<[number, number]>;
          await splitPDFByRanges(rangesAsTuples, mergeRanges);
        } else {
          const totalRanges = Math.ceil(pdfDoc.numPages / rangeSize);
          setInfoMessage(`Splitting into ${totalRanges} ranges of ${rangeSize} pages...`);
          await splitPDFBySize(rangeSize);
        }
      } else if (currentTab === 'size') {
        const multiplier = sizeUnit === 'MB' ? 1024 * 1024 : 1024;
        const maxBytes = sizeValue * multiplier;
        setInfoMessage(`Splitting into files max ${sizeValue}${sizeUnit}...`);
        await splitPDFByFileSize(maxBytes);
      } else if (currentTab === 'pages') {
        if (extractMode === 'all') {
          setInfoMessage(`Extracting all ${pdfDoc.numPages} pages...`);
          await extractAllPages(mergePages);
        } else {
          setInfoMessage(`Extracting ${selectedPages.length} selected pages...`);
          await extractSelectedPages(mergePages);
        }
      }
    } finally {
      setIsSplitting(false);
    }
  };

  // Real PDF splitting functions
  const splitPDFByRanges = async (ranges: Array<[number, number]>, mergeIntoOne: boolean = false) => {
    try {
      setInfoMessage('Loading PDF processing library...');
      setSplitProgress(5);

      const { PDFDocument } = await import('pdf-lib');
      setSplitProgress(10);

      // Get the stored PDF file
      if (!pdfFile) {
        setInfoMessage('Error: No PDF file found');
        setSplitProgress(0);
        return;
      }

      const baseFileName = pdfFile.name.replace(/\.pdf$/i, '');

      setInfoMessage('Loading PDF document...');
      setSplitProgress(15);
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      if (mergeIntoOne) {
        // Merge all ranges into one PDF
        setInfoMessage('Creating merged PDF...');
        const mergedPdf = await PDFDocument.create();

        for (let i = 0; i < ranges.length; i++) {
          const [startPage, endPage] = ranges[i];

          const pages = await mergedPdf.copyPages(pdfDoc,
            Array.from({ length: endPage - startPage + 1 }, (_, k) => startPage - 1 + k));
          pages.forEach(page => mergedPdf.addPage(page));
        }

        const pdfBytes = await mergedPdf.save();
        downloadPDF(pdfBytes, 'merged_ranges.pdf');
        setInfoMessage(`Successfully created merged PDF! Download started.`);
      } else if (ranges.length === 1) {
        // Single range - download as single PDF
        const [startPage, endPage] = ranges[0];
        const rangeNumber = 1;
        setInfoMessage('Creating PDF...');

        const newPdf = await PDFDocument.create();
        const pages = await newPdf.copyPages(pdfDoc,
          Array.from({ length: endPage - startPage + 1 }, (_, k) => startPage - 1 + k));
        pages.forEach(page => newPdf.addPage(page));

        const pdfBytes = await newPdf.save();
        downloadPDF(pdfBytes, `${baseFileName}-${startPage}-${endPage}.pdf`);
        setInfoMessage(`Successfully created PDF! Download started.`);
      } else {
        // Multiple ranges - download as ZIP
        setInfoMessage('Creating ZIP file...');
        setSplitProgress(20);
        try {
          const JSZip = (await import('jszip')).default;
          const zip = new JSZip();

          const totalRanges = ranges.length;

          for (let i = 0; i < totalRanges; i++) {
            const [startPage, endPage] = ranges[i];
            const rangeNumber = i + 1;

            const newPdf = await PDFDocument.create();
            const pages = await newPdf.copyPages(pdfDoc,
              Array.from({ length: endPage - startPage + 1 }, (_, k) => startPage - 1 + k));
            pages.forEach(page => newPdf.addPage(page));

            const pdfBytes = await newPdf.save();
            // Use range number in filename to ensure uniqueness
            zip.file(`${baseFileName}-range${rangeNumber}-pages${startPage}-${endPage}.pdf`, pdfBytes);

            // Update progress: 20-80% for processing ranges
            setSplitProgress(20 + Math.floor((i + 1) / totalRanges * 60));
          }

          setSplitProgress(85);
          const zipBlob = await zip.generateAsync({ type: 'blob' });
          setSplitProgress(95);
          const url = URL.createObjectURL(zipBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'split_pdfs.zip';
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 100); // Revoke after download trigger

          setSplitProgress(100);
          setInfoMessage(`Successfully created ZIP with ${ranges.length} files! Download started.`);
        } catch (zipError) {
          // Fallback: download files individually if ZIP fails
          console.warn('ZIP creation failed, downloading files individually:', zipError);
          for (let i = 0; i < ranges.length; i++) {
            const [startPage, endPage] = ranges[i];
            const rangeNumber = i + 1;
            const newPdf = await PDFDocument.create();
            const pages = await newPdf.copyPages(pdfDoc,
              Array.from({ length: endPage - startPage + 1 }, (_, k) => startPage - 1 + k));
            pages.forEach(page => newPdf.addPage(page));
            const pdfBytes = await newPdf.save();
            downloadPDF(pdfBytes, `${baseFileName}-${startPage}-${endPage}.pdf`);
          }
          setInfoMessage(`Successfully created ${ranges.length} files! Downloads started.`);
        }
      }

    } catch (error) {
      console.error('Split error:', error);
      setInfoMessage(`Error splitting PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const splitPDFByFileSize = async (maxBytes: number) => {
    try {
      setInfoMessage('Loading PDF processing library...');

      const { PDFDocument } = await import('pdf-lib');

      if (!pdfFile) {
        setInfoMessage('Error: No PDF file found');
        return;
      }

      const baseFileName = pdfFile.name.replace(/\.pdf$/i, '');
      setInfoMessage('Calculating split points...');

      const arrayBuffer = await pdfFile.arrayBuffer();
      const sourcePdfDoc = await PDFDocument.load(arrayBuffer);
      const totalPages = sourcePdfDoc.getPageCount();

      const createdFiles: Uint8Array[] = [];
      const createdFileNames: string[] = [];

      let currentPdf = await PDFDocument.create();
      let currentPageCount = 0;
      let rangeStart = 1;

      for (let i = 0; i < totalPages; i++) {
        // Copy page i to current PDF
        const [page] = await currentPdf.copyPages(sourcePdfDoc, [i]);
        currentPdf.addPage(page);
        currentPageCount++;

        // Check size
        const pdfBytes = await currentPdf.save();

        if (pdfBytes.length > maxBytes) {
          if (currentPageCount === 1) {
            // Single page is too big, accept it anyway and start new file
            createdFiles.push(pdfBytes);
            createdFileNames.push(`${baseFileName}-${rangeStart}-${i + 1}.pdf`);

            // Reset
            currentPdf = await PDFDocument.create();
            currentPageCount = 0;
            rangeStart = i + 2;
          } else {
            // Remove last page (it caused overflow)
            currentPdf.removePage(currentPageCount - 1);

            // Save the valid PDF
            const validBytes = await currentPdf.save();
            createdFiles.push(validBytes);
            createdFileNames.push(`${baseFileName}-${rangeStart}-${i}.pdf`);

            // Start new PDF with the current page
            currentPdf = await PDFDocument.create();
            const [retryPage] = await currentPdf.copyPages(sourcePdfDoc, [i]);
            currentPdf.addPage(retryPage);
            currentPageCount = 1;
            rangeStart = i + 1;
          }
        }
      }

      // Add the final PDF if it has pages
      if (currentPageCount > 0) {
        const finalBytes = await currentPdf.save();
        createdFiles.push(finalBytes);
        createdFileNames.push(`${baseFileName}-${rangeStart}-${totalPages}.pdf`);
      }

      // Download
      if (createdFiles.length === 1) {
        downloadPDF(createdFiles[0], createdFileNames[0]);
        setInfoMessage(`Successfully created PDF! Download started.`);
      } else {
        setInfoMessage('Creating ZIP file...');
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        createdFiles.forEach((bytes, idx) => {
          zip.file(createdFileNames[idx], bytes);
        });

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'split_pdfs_size.zip';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setInfoMessage(`Successfully created ZIP with ${createdFiles.length} files! Download started.`);
      }

    } catch (error) {
      console.error('Split error:', error);
      setInfoMessage(`Error splitting PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const splitPDFBySize = async (pageSize: number) => {
    try {
      setInfoMessage('Loading PDF processing library...');

      const { PDFDocument } = await import('pdf-lib');

      // Get the stored PDF file
      if (!pdfFile) {
        setInfoMessage('Error: No PDF file found');
        return;
      }

      const baseFileName = pdfFile.name.replace(/\.pdf$/i, '');

      setInfoMessage('Loading PDF document...');
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      const totalPages = pdfDoc.getPageCount();
      const totalRanges = Math.ceil(totalPages / pageSize);

      if (totalRanges === 1) {
        // Single range - download as single PDF
        const startPage = 0;
        const endPage = totalPages - 1;
        setInfoMessage('Creating PDF...');

        const newPdf = await PDFDocument.create();
        const pages = await newPdf.copyPages(pdfDoc,
          Array.from({ length: endPage - startPage + 1 }, (_, k) => startPage + k));
        pages.forEach(page => newPdf.addPage(page));

        const pdfBytes = await newPdf.save();
        downloadPDF(pdfBytes, `${baseFileName}-${startPage + 1}-${endPage + 1}.pdf`);
        setInfoMessage(`Successfully created PDF! Download started.`);
      } else {
        // Multiple ranges - download as ZIP
        setInfoMessage('Creating ZIP file...');
        try {
          const JSZip = (await import('jszip')).default;
          const zip = new JSZip();

          for (let i = 0; i < totalRanges; i++) {
            const startPage = i * pageSize;
            const endPage = Math.min(startPage + pageSize - 1, totalPages - 1);
            const rangeNumber = i + 1;

            const newPdf = await PDFDocument.create();
            const pages = await newPdf.copyPages(pdfDoc,
              Array.from({ length: endPage - startPage + 1 }, (_, k) => startPage + k));
            pages.forEach(page => newPdf.addPage(page));

            const pdfBytes = await newPdf.save();
            zip.file(`${baseFileName}-${startPage + 1}-${endPage + 1}.pdf`, pdfBytes);
          }

          const zipBlob = await zip.generateAsync({ type: 'blob' });
          const url = URL.createObjectURL(zipBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'split_pdfs.zip';
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          setInfoMessage(`Successfully created ZIP with ${totalRanges} files! Download started.`);
        } catch (zipError) {
          // Fallback: download files individually if ZIP fails
          console.warn('ZIP creation failed, downloading files individually:', zipError);
          for (let i = 0; i < totalRanges; i++) {
            const startPage = i * pageSize;
            const endPage = Math.min(startPage + pageSize - 1, totalPages - 1);
            const rangeNumber = i + 1;
            const newPdf = await PDFDocument.create();
            const pages = await newPdf.copyPages(pdfDoc,
              Array.from({ length: endPage - startPage + 1 }, (_, k) => startPage + k));
            pages.forEach(page => newPdf.addPage(page));
            const pdfBytes = await newPdf.save();
            downloadPDF(pdfBytes, `${baseFileName}-${startPage + 1}-${endPage + 1}.pdf`);
          }
          setInfoMessage(`Successfully created ${totalRanges} files! Downloads started.`);
        }
      }

    } catch (error) {
      console.error('Split error:', error);
      setInfoMessage(`Error splitting PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const extractAllPages = async (mergeIntoOne: boolean = false) => {
    try {
      const { PDFDocument } = await import('pdf-lib');

      // Get the stored PDF file
      if (!pdfFile) {
        setInfoMessage('Error: No PDF file found');
        return;
      }

      const originalFileName = pdfFile.name;
      const baseFileName = originalFileName.replace(/\.pdf$/i, '');
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const totalPages = pdfDoc.getPageCount();

      if (mergeIntoOne) {
        // Merge all pages into one PDF
        setInfoMessage('Creating merged PDF...');
        const mergedPdf = await PDFDocument.create();

        for (let i = 0; i < totalPages; i++) {
          const [page] = await mergedPdf.copyPages(pdfDoc, [i]);
          mergedPdf.addPage(page);
        }

        const pdfBytes = await mergedPdf.save();
        downloadPDF(pdfBytes, `${baseFileName}_all_pages.pdf`);
        setInfoMessage(`Successfully created merged PDF! Download started.`);
      } else if (totalPages === 1) {
        // Single page - download as single PDF
        const newPdf = await PDFDocument.create();
        const [page] = await newPdf.copyPages(pdfDoc, [0]);
        newPdf.addPage(page);
        const pdfBytes = await newPdf.save();
        downloadPDF(pdfBytes, `${baseFileName}_page_1.pdf`);
        setInfoMessage(`Successfully extracted page! Download started.`);
      } else {
        // Multiple pages - download as ZIP
        setInfoMessage('Creating ZIP file...');
        try {
          const JSZip = (await import('jszip')).default;
          const zip = new JSZip();

          for (let i = 0; i < totalPages; i++) {
            const newPdf = await PDFDocument.create();
            const [page] = await newPdf.copyPages(pdfDoc, [i]);
            newPdf.addPage(page);
            const pdfBytes = await newPdf.save();
            zip.file(`${baseFileName}_page_${i + 1}.pdf`, pdfBytes);
          }

          const zipBlob = await zip.generateAsync({ type: 'blob' });
          const url = URL.createObjectURL(zipBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'extracted_pages.zip';
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          setInfoMessage(`Successfully created ZIP with ${totalPages} files! Download started.`);
        } catch (zipError) {
          // Fallback: download files individually if ZIP fails
          console.warn('ZIP creation failed, downloading files individually:', zipError);
          for (let i = 0; i < totalPages; i++) {
            const newPdf = await PDFDocument.create();
            const [page] = await newPdf.copyPages(pdfDoc, [i]);
            newPdf.addPage(page);
            const pdfBytes = await newPdf.save();
            downloadPDF(pdfBytes, `${baseFileName}_page_${i + 1}.pdf`);
          }
          setInfoMessage(`Successfully extracted ${totalPages} pages! Downloads started.`);
        }
      }
    } catch (error) {
      console.error('Extract error:', error);
      setInfoMessage('Error extracting pages. Please try again.');
    }
  };

  const extractSelectedPages = async (mergeIntoOne: boolean = false) => {
    try {
      const { PDFDocument } = await import('pdf-lib');

      // Get the stored PDF file
      if (!pdfFile) {
        setInfoMessage('Error: No PDF file found');
        return;
      }

      const originalFileName = pdfFile.name;
      const baseFileName = originalFileName.replace(/\.pdf$/i, '');
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      if (mergeIntoOne) {
        // Merge selected pages into one PDF
        setInfoMessage('Creating merged PDF...');
        const mergedPdf = await PDFDocument.create();

        for (let i = 0; i < selectedPages.length; i++) {
          const pageIndex = selectedPages[i] - 1; // Convert to 0-based index
          const [page] = await mergedPdf.copyPages(pdfDoc, [pageIndex]);
          mergedPdf.addPage(page);
        }

        const pdfBytes = await mergedPdf.save();
        downloadPDF(pdfBytes, `${baseFileName}_selected_pages.pdf`);
        setInfoMessage(`Successfully created merged PDF! Download started.`);
      } else if (selectedPages.length === 1) {
        // Single page - download as single PDF
        const pageIndex = selectedPages[0] - 1;
        const newPdf = await PDFDocument.create();
        const [page] = await newPdf.copyPages(pdfDoc, [pageIndex]);
        newPdf.addPage(page);
        const pdfBytes = await newPdf.save();
        downloadPDF(pdfBytes, `${baseFileName}_page_${selectedPages[0]}.pdf`);
        setInfoMessage(`Successfully extracted page! Download started.`);
      } else {
        // Multiple pages - download as ZIP
        setInfoMessage('Creating ZIP file...');
        try {
          const JSZip = (await import('jszip')).default;
          const zip = new JSZip();

          for (let i = 0; i < selectedPages.length; i++) {
            const pageIndex = selectedPages[i] - 1; // Convert to 0-based index
            const newPdf = await PDFDocument.create();
            const [page] = await newPdf.copyPages(pdfDoc, [pageIndex]);
            newPdf.addPage(page);
            const pdfBytes = await newPdf.save();
            zip.file(`${baseFileName}_page_${selectedPages[i]}.pdf`, pdfBytes);
          }

          const zipBlob = await zip.generateAsync({ type: 'blob' });
          const url = URL.createObjectURL(zipBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'extracted_pages.zip';
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          setInfoMessage(`Successfully created ZIP with ${selectedPages.length} files! Download started.`);
        } catch (zipError) {
          // Fallback: download files individually if ZIP fails
          console.warn('ZIP creation failed, downloading files individually:', zipError);
          for (let i = 0; i < selectedPages.length; i++) {
            const pageIndex = selectedPages[i] - 1; // Convert to 0-based index
            const newPdf = await PDFDocument.create();
            const [page] = await newPdf.copyPages(pdfDoc, [pageIndex]);
            newPdf.addPage(page);
            const pdfBytes = await newPdf.save();
            downloadPDF(pdfBytes, `${baseFileName}_page_${selectedPages[i]}.pdf`);
          }
          setInfoMessage(`Successfully extracted ${selectedPages.length} pages! Downloads started.`);
        }
      }
    } catch (error) {
      console.error('Extract error:', error);
      setInfoMessage('Error extracting pages. Please try again.');
    }
  };

  const downloadPDF = (pdfBytes: Uint8Array, filename: string) => {
    try {
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });

      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;

      // Add to DOM temporarily
      link.style.display = 'none';
      document.body.appendChild(link);

      // Trigger download
      link.click();

      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Download error:', error);
      setInfoMessage(`Error downloading ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Initialize with Extract all pages mode when PDF is uploaded
  // Update info message when mergePages or selectedPages changes in Pages tab
  useEffect(() => {
    if (currentTab === 'pages' && pdfDoc) {
      if (extractMode === 'all') {
        const pdfCount = pdfDoc.numPages;
        setInfoMessage(`Selected pages will be converted into separate PDF files. ${pdfCount} PDF will be created.`);
      } else if (extractMode === 'select' && selectedPages.length > 0) {
        const pdfCount = mergePages ? 1 : selectedPages.length;
        setInfoMessage(`Selected pages will be converted into separate PDF files. ${pdfCount} PDF${pdfCount !== 1 ? 's' : ''} will be created.`);
      } else if (extractMode === 'select' && selectedPages.length === 0) {
        setInfoMessage(`Ready to select pages for extraction.`);
      }
    }
  }, [currentTab, extractMode, selectedPages, mergePages, pdfDoc]);



  // Calculate total pages selected for info display
  const getTotalPagesSelected = () => {
    if (!pdfDoc) return 0;
    if (currentTab === 'range') {
      if (mode === 'custom') {
        return customRanges.reduce((total, range) => {
          const totalPages = pdfDoc.numPages;
          if (
            range.from > 0 &&
            range.to >= range.from &&
            range.from <= totalPages &&
            range.to <= totalPages
          ) {
            return total + (range.to - range.from + 1);
          }
          return total;
        }, 0);
      }
      return pdfDoc.numPages;
    }
    if (currentTab === 'pages') {
      return selectedPages.length;
    }
    return 0;
  };

  const getRangeCount = () => {
    if (currentTab === 'range') {
      if (mode === 'custom') {
        return customRanges.length;
      }
      if (pdfDoc) {
        return Math.ceil(pdfDoc.numPages / rangeSize);
      }
    }
    return 0;
  };

  const handleRangeSizeChange = (newSize: number) => {
    setRangeSize(newSize);
    if (hasUploaded && pdfDoc) {
      renderRanges();
    }
  };

  // Recalculate estimated files when size params change
  useEffect(() => {
    if (currentTab === 'size' && pdfFile) {
      const multiplier = sizeUnit === 'MB' ? 1024 * 1024 : 1024;
      const maxBytes = sizeValue * multiplier;
      // Rough estimation: total size / max size
      // Cap at total pages since we can't have more files than pages
      const rawEst = Math.ceil(pdfFile.size / maxBytes);
      const est = Math.min(rawEst, pdfDoc ? pdfDoc.numPages : rawEst);
      setEstimatedFiles(est);
    }
  }, [sizeValue, sizeUnit, pdfFile, currentTab, pdfDoc]);

  // Render first page for Size view preview
  const renderSizePreview = async () => {
    if (!pdfDoc || !sizePreviewCanvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(1);
      const viewport = page.getViewport({ scale: 0.8 });
      const canvas = sizePreviewCanvasRef.current;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
      }
    } catch (error) {
      console.error('Error rendering size preview:', error);
    }
  };

  // Render size preview when tab changes or doc loads
  useEffect(() => {
    if (currentTab === 'size' && pdfDoc) {
      // Small delay to ensure canvas is mounted
      setTimeout(renderSizePreview, 100);
    }
  }, [currentTab, pdfDoc]);

  return (
    <div className="h-full flex flex-col bg-gray-50 font-sans overflow-hidden">
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {!hasUploaded ? (
          <PdfUploadHero
            onFilesSelect={(files) => {
              if (files.length > 0) handleFileSelect(files[0]);
            }}
            title={hero.title}
            description={hero.description}
            accept={hero.accept}
            multiple={hero.multiple}
            icon={<Grid className="h-6 w-6 mr-3" />}
          />
        ) : (
          <>
            {/* Left side: Document Preview - Matching new UI design */}
            {/* Right side: Split Settings */}
            <SplitToolLayout
              fileInputRef={fileInputRef}
              isLoading={isLoading}
              currentTab={currentTab}
              mode={mode}
              customRanges={customRanges}
              pdfDoc={pdfDoc}
              rangeSize={rangeSize}
              selectedPages={selectedPages}
              draggedIndex={draggedIndex}
              dropPosition={dropPosition}
              mergeRanges={mergeRanges}
              mergePages={mergePages}
              extractMode={extractMode}
              pagesToExtractValue={pagesToExtractValue}
              infoMessage={infoMessage}
              handleFileInputChange={handleFileInputChange}
              handleTabClick={handleTabClick}
              handleCustomMode={handleCustomMode}
              handleFixedMode={handleFixedMode}
              handleDragStart={handleDragStart}
              handleDragOver={handleDragOver}
              handleDragLeave={handleDragLeave}
              handleRangeDrop={handleRangeDrop}
              handleDragEnd={handleDragEnd}
              updateCustomRange={updateCustomRange}
              removeCustomRange={removeCustomRange}
              togglePageSelection={togglePageSelection}
              handleExtractAll={handleExtractAll}
              handleSelectPages={handleSelectPages}
              handleRangeSizeChange={handleRangeSizeChange}
              addCustomRange={addCustomRange}
              setMergeRanges={(value) => setMergeRanges(value)}
              setMergePages={(value) => setMergePages(value)}
              setPagesToExtractValue={setPagesToExtractValue}
              parsePagesInput={parsePagesInput}
              handleSplit={handleSplit}
              handleViewRange={handleViewRange}
              onOpenDetailedPage={({ range, pageNumber }) =>
                setDetailedPage({ range, pageNumber })
              }
              sizeValue={sizeValue}
              sizeUnit={sizeUnit}
              setSizeValue={setSizeValue}
              setSizeUnit={setSizeUnit}
              fileSizeStr={fileSizeStr}
              totalPages={pdfDoc?.numPages}
              estimatedFiles={estimatedFiles}
              sizePreviewCanvasRef={sizePreviewCanvasRef}
              splitProgress={splitProgress}
              isSplitting={isSplitting}
            />
          </>
        )}
      </main>

      {/* Modal for page preview (old style - kept for backward compatibility) */}
      {showModal && !viewingRange && !detailedPage && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 flex items-center justify-center p-4 animate-fade-in"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto m-4 animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Page {modalPageNumber} of {pdfDoc?.numPages}</h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 flex justify-center bg-[#f1f3f4]">
              <canvas ref={modalCanvasRef} className="max-w-full max-h-[70vh] rounded-sm shadow-xl"></canvas>
            </div>
          </div>
        </div>
      )}

      {/* Range Pages View Modal */}
      {(viewingRange || detailedPage) && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 flex items-center justify-center p-4 animate-fade-in"
          onClick={handleCloseAllModals}
        >
          {viewingRange && (
            <RangePagesView
              range={viewingRange}
              rangeNumber={viewingRangeIndex !== null ? viewingRangeIndex + 1 : 1}
              pdfDoc={pdfDoc}
              onClose={() => {
                setViewingRange(null);
                setViewingRangeIndex(null);
              }}
              onSelectPage={handleSelectPage}
            />
          )}

          {detailedPage && (
            <PageDetailView
              range={detailedPage.range}
              currentPage={detailedPage.pageNumber}
              totalPages={pdfDoc?.numPages || 0}
              pdfDoc={pdfDoc}
              onClose={handleCloseDetailedPage}
              onNavigate={handleNavigateDetailedPage}
              onBack={handleBackToRangeView}
            />
          )}
        </div>
      )}
    </div>
  );
};

// Export the component as default
export default WorkingSplitPDFTool;


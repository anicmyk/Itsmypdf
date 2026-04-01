import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, GripVertical, ArrowRight, ArrowDownUp, ChevronDown, FileText, Calendar, Image as ImageIcon, HardDrive, Check, Settings } from 'lucide-react';
import { jpgToPdf } from '@/utils/pdfProcessor';
import { PdfUploadHero } from '../shared/PdfUploadHero';
import { PdfPageCard } from '../shared/PdfPageCard';
import { ToolCTAs } from '../shared/ToolCTAs';
import { MobileLayout } from '../shared/MobileLayout';
import { TOOL_HERO_UI } from '@/lib/toolHeroConfig';

interface ImageFile {
  id: string;
  file: File;
  thumbnailUrl: string;
}

type PageOrientation = 'portrait' | 'landscape';
type PageSize = 'A4' | 'Letter' | 'Legal' | 'A3' | 'A5';
type Margin = 'none' | 'small' | 'big';

const PAGE_SIZES: Record<PageSize, { width: number; height: number; label: string }> = {
  A4: { width: 595, height: 842, label: 'A4 (297x210 mm)' },
  Letter: { width: 612, height: 792, label: 'Letter (8.5x11 in)' },
  Legal: { width: 612, height: 1008, label: 'Legal (8.5x14 in)' },
  A3: { width: 842, height: 1191, label: 'A3 (297x420 mm)' },
  A5: { width: 420, height: 595, label: 'A5 (210x148 mm)' },
};

const hero = TOOL_HERO_UI['jpg-to-pdf'];

const JpgToPdfTool: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State management
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<{ id: string; before: boolean } | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string>('Upload image files to begin converting.');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  // Conversion options
  const [orientation, setOrientation] = useState<PageOrientation>('portrait');
  const [pageSize, setPageSize] = useState<PageSize>('A4');
  const [margin, setMargin] = useState<Margin>('none');
  const [mergeAll, setMergeAll] = useState(true);

  // File upload handlers
  const handleFileSelect = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const imageFilesToAdd: ImageFile[] = [];

    setIsLoading(true);
    setInfoMessage('Loading images...');

    try {
      for (const file of fileArray) {
        // Accept JPG, JPEG, PNG images
        if (!file.type.match(/^image\/(jpeg|jpg|png)$/i)) {
          setInfoMessage(`Skipping ${file.name}: Please select a valid image file (JPG, PNG).`);
          continue;
        }

        try {
          // Create thumbnail URL
          const thumbnailUrl = URL.createObjectURL(file);

          imageFilesToAdd.push({
            id: `${Date.now()}-${Math.random()}`,
            file,
            thumbnailUrl
          });
        } catch (error) {
          console.error('Error loading image:', file.name, error);
          setInfoMessage(`Error loading ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (imageFilesToAdd.length > 0) {
        setImageFiles(prev => {
          const newFiles = [...prev, ...imageFilesToAdd];
          setInfoMessage(`${newFiles.length} image(s) ready to convert.`);
          return newFiles;
        });
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error processing files:', error);
      setIsLoading(false);
      setInfoMessage(`Error processing files: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDropZoneClick = () => {
    fileInputRef.current?.click();
  };

  const removeImage = (id: string) => {
    setImageFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.thumbnailUrl);
      }
      const newFiles = prev.filter(f => f.id !== id);
      if (newFiles.length === 0) {
        setInfoMessage('Upload image files to begin converting.');
      } else {
        setInfoMessage(`${newFiles.length} image(s) ready to convert.`);
      }
      return newFiles;
    });
  };

  // Sync ref for cleanup
  const imageFilesRef = useRef(imageFiles);
  useEffect(() => {
    imageFilesRef.current = imageFiles;
  }, [imageFiles]);

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      if (imageFilesRef.current) {
        imageFilesRef.current.forEach(img => URL.revokeObjectURL(img.thumbnailUrl));
      }
    };
  }, []);

  // Drag and drop handlers for reordering images
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, fileId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null || imageFiles[draggedIndex]?.id === fileId) {
      if (dropPosition) setDropPosition(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const isBefore = e.clientX < rect.left + rect.width / 2;
    const fileIndex = imageFiles.findIndex(f => f.id === fileId);
    if (dropPosition?.id !== fileId || dropPosition?.before !== isBefore) {
      setDropPosition({ id: fileId, before: isBefore });
      setDragOverIndex(fileIndex);
    }
  };

  const handleDragLeave = () => {
    setDropPosition(null);
  };

  const handleImageDrop = (e: React.DragEvent, droppedOnId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedIndex !== null && dropPosition) {
      const droppedOnIndex = imageFiles.findIndex(f => f.id === droppedOnId);
      if (droppedOnIndex !== -1 && draggedIndex !== droppedOnIndex) {
        const newFiles = [...imageFiles];
        const draggedFile = newFiles[draggedIndex];
        newFiles.splice(draggedIndex, 1);
        const insertIndex = dropPosition.before ? droppedOnIndex : droppedOnIndex + 1;
        newFiles.splice(insertIndex, 0, draggedFile);
        setImageFiles(newFiles);
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

  // Sort images by different criteria
  const handleSort = (sortBy: 'name' | 'date' | 'size') => {
    let sorted = [...imageFiles];

    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => a.file.name.localeCompare(b.file.name));
        setInfoMessage(`Sorted ${sorted.length} image(s) by name.`);
        break;
      case 'date':
        sorted.reverse();
        setInfoMessage(`Sorted ${sorted.length} image(s) by date.`);
        break;
      case 'size':
        sorted.sort((a, b) => b.file.size - a.file.size);
        setInfoMessage(`Sorted ${sorted.length} image(s) by file size.`);
        break;
    }

    setImageFiles(sorted);
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

  // Convert images to PDF
  const handleConvert = async () => {
    if (imageFiles.length === 0) {
      setInfoMessage('Please upload at least 1 image file to convert.');
      return;
    }

    setIsConverting(true);
    setInfoMessage('Converting images to PDF...');

    try {
      const files = imageFiles.map(img => img.file);
      const result = await jpgToPdf(files, {
        orientation,
        pageSize,
        margin,
        mergeAll
      });

      if (result.success && result.blob) {
        // Download the PDF or ZIP file
        const url = URL.createObjectURL(result.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename || (mergeAll ? 'converted.pdf' : 'converted-images.zip');
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        if (mergeAll) {
          setInfoMessage('PDF created successfully! Download started.');
        } else {
          setInfoMessage(`ZIP file with ${imageFiles.length} PDF(s) created successfully! Download started.`);
        }
        setIsConverting(false);
      } else {
        setInfoMessage(`Error converting to PDF: ${result.error || 'Unknown error'}`);
        setIsConverting(false);
      }
    } catch (error) {
      console.error('Convert error:', error);
      setInfoMessage(`Error converting to PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsConverting(false);
    }
  };

  // Extract settings content for mobile panel
  const settingsContent = imageFiles.length > 0 ? (
    <div className="p-5 space-y-4">
      <button
        onClick={handleDropZoneClick}
        className="w-full bg-brand-blue-600 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-brand-blue-700 active:bg-brand-blue-800 transition-colors duration-200 shadow-sm flex items-center justify-center gap-2 min-h-[48px]"
      >
        <Plus className="h-5 w-5" />
        Add images
        {imageFiles.length > 0 && (
          <span className="bg-white/20 text-white text-xs font-bold rounded-full px-2 py-0.5 ml-1">
            {imageFiles.length}
          </span>
        )}
      </button>

      {imageFiles.length >= 2 && (
        <div className="relative" ref={sortMenuRef}>
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="w-full bg-white border border-gray-300 text-gray-700 font-medium py-2.5 px-4 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors duration-200 flex items-center justify-center gap-2 min-h-[48px]"
          >
            <ArrowDownUp className="h-5 w-5" />
            Sort images
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showSortMenu ? 'rotate-180' : ''}`} />
          </button>

          {showSortMenu && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
              <button onClick={() => handleSort('name')} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 active:bg-gray-100 transition-colors duration-150 flex items-center gap-3 text-sm text-gray-700 min-h-[48px]">
                <FileText className="h-4 w-4 text-gray-500" />
                <span>Sort by name</span>
              </button>
              <button onClick={() => handleSort('date')} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 active:bg-gray-100 transition-colors duration-150 flex items-center gap-3 text-sm text-gray-700 min-h-[48px]">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>Sort by date added</span>
              </button>
              <button onClick={() => handleSort('size')} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 active:bg-gray-100 transition-colors duration-150 flex items-center gap-3 text-sm text-gray-700 border-t border-gray-100 min-h-[48px]">
                <HardDrive className="h-4 w-4 text-gray-500" />
                <span>Sort by file size</span>
              </button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Page orientation</label>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setOrientation('portrait')} className={`flex flex-col items-center justify-center p-3 border rounded-lg transition-all duration-200 min-h-[48px] ${orientation === 'portrait' ? 'border-brand-blue-500 bg-brand-blue-50' : 'border-gray-300 hover:border-gray-400 bg-white'}`}>
            <span className={`text-xs font-medium ${orientation === 'portrait' ? 'text-brand-blue-600' : 'text-gray-600'}`}>Portrait</span>
          </button>
          <button onClick={() => setOrientation('landscape')} className={`flex flex-col items-center justify-center p-3 border rounded-lg transition-all duration-200 min-h-[48px] ${orientation === 'landscape' ? 'border-brand-blue-500 bg-brand-blue-50' : 'border-gray-300 hover:border-gray-400 bg-white'}`}>
            <span className={`text-xs font-medium ${orientation === 'landscape' ? 'text-brand-blue-600' : 'text-gray-600'}`}>Landscape</span>
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Page size</label>
        <select value={pageSize} onChange={(e) => setPageSize(e.target.value as PageSize)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue-500 focus:border-brand-blue-500 transition-colors duration-200 bg-white text-gray-700 text-sm min-h-[48px]">
          {Object.entries(PAGE_SIZES).map(([key, value]) => (
            <option key={key} value={key}>{value.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Margin</label>
        <div className="grid grid-cols-3 gap-2">
          {(['none', 'small', 'big'] as Margin[]).map((marginOption) => (
            <button key={marginOption} onClick={() => setMargin(marginOption)} className={`flex flex-col items-center justify-center p-2.5 border rounded-lg transition-all duration-200 min-h-[48px] ${margin === marginOption ? 'border-brand-blue-500 bg-brand-blue-50' : 'border-gray-300 hover:border-gray-400 bg-white'}`}>
              <span className={`text-xs font-medium capitalize ${margin === marginOption ? 'text-brand-blue-600' : 'text-gray-600'}`}>
                {marginOption === 'none' ? 'No margin' : marginOption}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <button onClick={() => setMergeAll(!mergeAll)} className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors duration-200 flex-shrink-0 min-h-[48px] ${mergeAll ? 'bg-brand-blue-500 border-brand-blue-500' : 'bg-white border-gray-300'}`}>
          {mergeAll && <Check className="h-3 w-3 text-white" />}
        </button>
        <label onClick={() => setMergeAll(!mergeAll)} className="flex-1 text-sm font-medium text-gray-700 cursor-pointer">
          Merge all images in one PDF file
        </label>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-xs text-blue-800">
        To change the order of your images, drag and drop them as you want.
      </div>

      {infoMessage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-xs text-blue-800">
          {infoMessage}
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="h-full flex flex-col bg-gray-50 font-sans overflow-hidden">
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {imageFiles.length === 0 ? (
          <PdfUploadHero
            onFilesSelect={handleFileSelect}
            title={hero.title}
            description={hero.description}
            accept={hero.accept}
            multiple={hero.multiple}
            icon={<ImageIcon className="h-6 w-6 mr-3" />}
          />
        ) : (
          <>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/jpg,image/png"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />

            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/75 backdrop-blur-sm z-50 animate-fade-in">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-brand-blue-200 border-t-brand-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600 font-medium">Loading images...</p>
                </div>
              </div>
            )}

            {/* Main content: Image Thumbnails */}
            <div className="flex-grow p-4 md:p-8 flex flex-col items-center overflow-y-auto bg-gray-100 relative pb-24 md:pb-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 max-w-6xl mx-auto w-full">
                {imageFiles.map((imageFile, index) => {
                  const isDragged = draggedIndex === index;
                  return (
                    <div
                      key={imageFile.id}
                      onDragOver={(e) => handleDragOver(e, imageFile.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleImageDrop(e, imageFile.id)}
                      onDragEnd={handleDragEnd}
                      className="relative"
                    >
                      {dropPosition?.id === imageFile.id && draggedIndex !== index && (
                        <div className={`absolute top-0 bottom-0 w-1 bg-brand-blue-500 rounded-full z-10 ${dropPosition.before ? '-left-3' : '-right-3'}`} />
                      )}
                      <div className={`flex flex-col items-center space-y-2 transition-all duration-200 ${isDragged ? 'opacity-30' : 'opacity-100'}`}>

                        <PdfPageCard
                          pageNumber={index + 1}
                          imageSrc={imageFile.thumbnailUrl}
                          draggable
                          onDragStart={() => handleDragStart(index)}
                          className={`w-full relative bg-gray-50 border-gray-300 cursor-grab active:cursor-grabbing hover:shadow-lg transition-all duration-200 group`}
                          style={{
                            aspectRatio: orientation === 'portrait' ? '1 / 1.414' : '1.414 / 1',
                            padding: margin === 'none' ? '2px' : margin === 'small' ? '8px' : '16px',
                          }}
                        >
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button
                              onClick={(e) => { e.stopPropagation(); removeImage(imageFile.id); }}
                              className="bg-brand-blue-500 text-white rounded-full p-1.5 hover:bg-brand-blue-600 transition-colors duration-200 shadow-lg"
                              aria-label={`Remove ${imageFile.file.name}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <div className="bg-gray-800/75 text-white rounded-full p-1.5 shadow-lg">
                              <GripVertical className="h-4 w-4" />
                            </div>
                          </div>
                        </PdfPageCard>

                        <p className="text-sm font-medium text-gray-800 text-center w-full truncate px-1" title={imageFile.file.name}>{imageFile.file.name}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile Layout - Settings panel, floating button, action button */}
            <MobileLayout
              settingsTitle="JPG to PDF Options"
              settingsContent={settingsContent}
              actionButton={{
                label: 'Convert to PDF',
                onClick: handleConvert,
                disabled: imageFiles.length === 0,
                isProcessing: isConverting,
                processingText: 'Converting...'
              }}
            >
              <></>
            </MobileLayout>

            {/* Desktop Sidebar - hidden on mobile */}
            <aside className="hidden md:flex w-96 flex-shrink-0 bg-white border-l border-gray-200 flex-col h-full shadow-lg z-20">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-brand-blue-600" />
                  JPG to PDF options
                </h2>
              </div>

              <div className="flex-grow p-5 flex flex-col space-y-4 overflow-y-auto overflow-x-hidden custom-scrollbar">
                {/* Add Images Button in Sidebar */}
                <button
                  onClick={handleDropZoneClick}
                  className="w-full bg-brand-blue-600 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-brand-blue-700 transition-colors duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 flex-shrink-0"
                  aria-label="Add images"
                >
                  <Plus className="h-5 w-5" />
                  Add images
                  {imageFiles.length > 0 && (
                    <span className="bg-white/20 text-white text-xs font-bold rounded-full px-2 py-0.5 ml-1">
                      {imageFiles.length}
                    </span>
                  )}
                </button>

                {/* Sort Button in Sidebar */}
                {imageFiles.length >= 2 && (
                  <div className="relative flex-shrink-0" ref={sortMenuRef}>
                    <button
                      onClick={() => setShowSortMenu(!showSortMenu)}
                      className="w-full bg-white border border-gray-300 text-gray-700 font-medium py-2.5 px-4 rounded-lg hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center gap-2"
                      aria-label="Sort images"
                    >
                      <ArrowDownUp className="h-5 w-5" />
                      Sort images
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showSortMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {showSortMenu && (
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
                          onClick={() => handleSort('size')}
                          className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors duration-150 flex items-center gap-3 text-sm text-gray-700 border-t border-gray-100"
                        >
                          <HardDrive className="h-4 w-4 text-gray-500" />
                          <span>Sort by file size</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Page Orientation */}
                <div className="space-y-2 flex-shrink-0">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Page orientation</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setOrientation('portrait')}
                      className={`flex-1 flex flex-col items-center justify-center p-3 border rounded-lg transition-all duration-200 ${orientation === 'portrait'
                        ? 'border-brand-blue-500 bg-brand-blue-50'
                        : 'border-gray-300 hover:border-gray-400 bg-white'
                        }`}
                    >
                      <svg
                        width="28"
                        height="40"
                        viewBox="0 0 32 48"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className={`mb-1.5 ${orientation === 'portrait' ? 'text-brand-blue-500' : 'text-gray-400'}`}
                      >
                        <rect x="2" y="2" width="28" height="44" rx="2" stroke="currentColor" strokeWidth="2" fill="white" />
                      </svg>
                      <span className={`text-xs font-medium ${orientation === 'portrait' ? 'text-brand-blue-600' : 'text-gray-600'}`}>
                        Portrait
                      </span>
                    </button>
                    <button
                      onClick={() => setOrientation('landscape')}
                      className={`flex-1 flex flex-col items-center justify-center p-3 border rounded-lg transition-all duration-200 ${orientation === 'landscape'
                        ? 'border-brand-blue-500 bg-brand-blue-50'
                        : 'border-gray-300 hover:border-gray-400 bg-white'
                        }`}
                    >
                      <svg
                        width="40"
                        height="28"
                        viewBox="0 0 48 32"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className={`mb-1.5 ${orientation === 'landscape' ? 'text-brand-blue-500' : 'text-gray-400'}`}
                      >
                        <rect x="2" y="2" width="44" height="28" rx="2" stroke="currentColor" strokeWidth="2" fill="white" />
                      </svg>
                      <span className={`text-xs font-medium ${orientation === 'landscape' ? 'text-brand-blue-600' : 'text-gray-600'}`}>
                        Landscape
                      </span>
                    </button>
                  </div>
                </div>

                {/* Page Size */}
                <div className="space-y-2 flex-shrink-0">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Page size</label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value as PageSize)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue-500 focus:border-brand-blue-500 transition-colors duration-200 bg-white text-gray-700 text-sm"
                  >
                    {Object.entries(PAGE_SIZES).map(([key, value]) => (
                      <option key={key} value={key}>{value.label}</option>
                    ))}
                  </select>
                </div>

                {/* Margin */}
                <div className="space-y-2 flex-shrink-0">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Margin</label>
                  <div className="flex gap-2">
                    {(['none', 'small', 'big'] as Margin[]).map((marginOption) => (
                      <button
                        key={marginOption}
                        onClick={() => setMargin(marginOption)}
                        className={`flex-1 flex flex-col items-center justify-center p-2.5 border rounded-lg transition-all duration-200 ${margin === marginOption
                          ? 'border-brand-blue-500 bg-brand-blue-50'
                          : 'border-gray-300 hover:border-gray-400 bg-white'
                          }`}
                      >
                        <div className="mb-1.5 w-10 h-14 flex items-center justify-center">
                          {/* SVG Icons for margin options */}
                          {marginOption === 'none' ? (
                            <svg width="40" height="56" viewBox="0 0 48 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={margin === marginOption ? 'text-brand-blue-600' : 'text-gray-400'}>
                              <rect x="2" y="2" width="44" height="60" stroke="currentColor" strokeWidth="2" fill="white" rx="2" />
                              <rect x="6" y="6" width="36" height="52" fill="currentColor" fillOpacity="0.1" rx="1" />
                            </svg>
                          ) : marginOption === 'small' ? (
                            <svg width="40" height="56" viewBox="0 0 48 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={margin === marginOption ? 'text-brand-blue-600' : 'text-gray-400'}>
                              <rect x="2" y="2" width="44" height="60" stroke="currentColor" strokeWidth="2" fill="white" rx="2" />
                              <rect x="8" y="8" width="32" height="48" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" rx="1" />
                            </svg>
                          ) : (
                            <svg width="40" height="56" viewBox="0 0 48 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={margin === marginOption ? 'text-brand-blue-600' : 'text-gray-400'}>
                              <rect x="2" y="2" width="44" height="60" stroke="currentColor" strokeWidth="2" fill="white" rx="2" />
                              <rect x="12" y="12" width="24" height="40" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.1" rx="1" />
                            </svg>
                          )}
                        </div>
                        <span className={`text-xs font-medium capitalize ${margin === marginOption ? 'text-brand-blue-600' : 'text-gray-600'}`}>
                          {marginOption === 'none' ? 'No margin' : marginOption}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Merge All Checkbox */}
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200 flex-shrink-0">
                  <button
                    onClick={() => setMergeAll(!mergeAll)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors duration-200 flex-shrink-0 ${mergeAll
                      ? 'bg-brand-blue-500 border-brand-blue-500'
                      : 'bg-white border-gray-300'
                      }`}
                  >
                    {mergeAll && <Check className="h-3 w-3 text-white" />}
                  </button>
                  <label
                    onClick={() => setMergeAll(!mergeAll)}
                    className="flex-1 text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    Merge all images in one PDF file
                  </label>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-xs text-blue-800 flex-shrink-0">
                  To change the order of your images, drag and drop them as you want.
                </div>

                {infoMessage && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-xs text-blue-800 flex-shrink-0">
                    {infoMessage}
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-gray-200 bg-gray-50 mt-auto">
                <button
                  onClick={handleConvert}
                  disabled={imageFiles.length === 0 || isConverting}
                  className="w-full text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center text-lg shadow-lg transition-all duration-200 disabled:cursor-not-allowed hover:bg-brand-blue-700 hover:shadow-xl"
                  style={{
                    background: isConverting ? '#9ca3af' : (imageFiles.length === 0 ? '#9ca3af' : '#2563eb')
                  }}
                >
                  {isConverting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Converting...
                    </>
                  ) : (
                    <>
                      Convert to PDF
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </button>
                <ToolCTAs variant="sidebar" />
              </div>
            </aside>
          </>
        )}
      </main>
    </div>
  );
};

export default JpgToPdfTool;


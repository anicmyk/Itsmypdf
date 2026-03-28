import React from 'react';
import { Grid, FileStack, Maximize2, Plus, X, GripVertical, Settings, ArrowRight } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/segmented-control';
import type { Option } from '@/components/ui/segmented-control';
import { Button } from '@/components/ui/button';
import type { CustomRange } from './splitTypes';
import { ToolCTAs } from '../shared/ToolCTAs';
import { RangePreview } from './RangePreview';
import { PagesPreviewGrid } from './PagesPreviewGrid';
import { PdfPageCard } from '@/components/pdf/shared/PdfPageCard';
import { MobileLayout } from '@/components/pdf/shared/MobileLayout';

interface SplitToolLayoutProps {
  fileInputRef: React.RefObject<HTMLInputElement>;
  isLoading: boolean;
  currentTab: 'range' | 'pages' | 'size';
  mode: 'custom' | 'fixed';
  customRanges: CustomRange[];
  pdfDoc: any;
  rangeSize: number;
  selectedPages: number[];
  draggedIndex: number | null;
  dropPosition: { id: number; before: boolean } | null;
  mergeRanges: boolean;
  mergePages: boolean;
  extractMode: 'all' | 'select';
  pagesToExtractValue: string;
  infoMessage: string;
  handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleTabClick: (index: number) => void;
  handleCustomMode: () => void;
  handleFixedMode: () => void;
  handleDragStart: (index: number) => void;
  handleDragOver: (e: React.DragEvent, id: number) => void;
  handleDragLeave: () => void;
  handleRangeDrop: (e: React.DragEvent, id: number) => void;
  handleDragEnd: () => void;
  updateCustomRange: (index: number, field: 'from' | 'to', value: number) => void;
  removeCustomRange: (index: number) => void;
  togglePageSelection: (page: number) => void;
  handleExtractAll: () => void;
  handleSelectPages: () => void;
  handleRangeSizeChange: (newSize: number) => void;
  addCustomRange: (start?: number, end?: number) => void;
  setMergeRanges: (value: boolean) => void;
  setMergePages: (value: boolean) => void;
  setPagesToExtractValue: (value: string) => void;
  parsePagesInput: (value: string) => void;
  handleSplit: () => void | Promise<void>;
  handleViewRange: (range: CustomRange, index?: number) => void;
  onOpenDetailedPage: (args: { range: CustomRange; pageNumber: number }) => void;
  sizeValue: number;
  sizeUnit: 'MB' | 'KB';
  setSizeValue: (value: number) => void;
  setSizeUnit: (value: 'MB' | 'KB') => void;
  fileSizeStr?: string;
  totalPages?: number;
  estimatedFiles?: number;
  sizePreviewCanvasRef?: React.RefObject<HTMLCanvasElement>;
  splitProgress: number;
  isSplitting: boolean;
}

export const SplitToolLayout: React.FC<SplitToolLayoutProps> = ({
  fileInputRef,
  isLoading,
  currentTab,
  mode,
  customRanges,
  pdfDoc,
  rangeSize,
  selectedPages,
  draggedIndex,
  dropPosition,
  mergeRanges,
  mergePages,
  extractMode,
  pagesToExtractValue,
  infoMessage,
  handleFileInputChange,
  handleTabClick,
  handleCustomMode,
  handleFixedMode,
  handleDragStart,
  handleDragOver,
  handleDragLeave,
  handleRangeDrop,
  handleDragEnd,
  updateCustomRange,
  removeCustomRange,
  togglePageSelection,
  handleExtractAll,
  handleSelectPages,
  handleRangeSizeChange,
  addCustomRange,
  setMergeRanges,
  setMergePages,
  setPagesToExtractValue,
  parsePagesInput,
  handleSplit,
  handleViewRange,
  onOpenDetailedPage,
  sizeValue,
  sizeUnit,
  setSizeValue,
  setSizeUnit,
  fileSizeStr,
  totalPages,
  estimatedFiles,
  sizePreviewCanvasRef,
  splitProgress,
  isSplitting,
}) => {
  const viewModeOptions: Option<'range' | 'pages' | 'size'>[] = [
    { value: 'range', label: 'Range', icon: <Grid className="h-5 w-5" /> },
    { value: 'pages', label: 'Pages', icon: <FileStack className="h-5 w-5" /> },
    { value: 'size', label: 'Size', icon: <Maximize2 className="h-5 w-5" /> },
  ];

  const rangeModeOptions: Option<'custom' | 'fixed'>[] = [
    { value: 'custom', label: 'Custom ranges' },
    { value: 'fixed', label: 'Fixed ranges' },
  ];

  // Extract settings content for mobile
  const settingsContent = (
    <div className="p-5 flex flex-col space-y-6">
      <div className="space-y-3">
        <label className="text-sm font-semibold text-gray-700 block">View mode:</label>
        <SegmentedControl
          options={viewModeOptions}
          value={currentTab}
          onChange={(value) => {
            const tabMap: Record<string, 'range' | 'pages' | 'size'> = {
              range: 'range',
              pages: 'pages',
              size: 'size',
            };
            handleTabClick(['range', 'pages', 'size'].indexOf(tabMap[value]));
          }}
        />
      </div>

      {currentTab === 'range' && (
        <>
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 block">Range mode:</label>
            <div className="flex gap-2">
              {rangeModeOptions.map((opt) => (
                <Button
                  key={opt.value}
                  onClick={() => {
                    if (opt.value === 'custom') handleCustomMode();
                    if (opt.value === 'fixed') handleFixedMode();
                  }}
                  variant={mode === opt.value ? 'tool-option-active' : 'tool-option'}
                  className="flex-1"
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {mode === 'custom' && (
            <div className="flex-grow space-y-4 -mx-6 px-6 overflow-y-scroll max-h-96">
              {customRanges.map((range, index) => {
                const isDragged = draggedIndex === index;
                return (
                  <div
                    key={range.id}
                    onDragOver={(e) => mode === 'custom' && handleDragOver(e, range.id)}
                    onDragLeave={() => mode === 'custom' && handleDragLeave()}
                    onDrop={(e) => mode === 'custom' && handleRangeDrop(e, range.id)}
                    onDragEnd={() => mode === 'custom' && handleDragEnd()}
                    className="relative"
                  >
                    {dropPosition?.id === range.id && draggedIndex !== index && (
                      <div
                        className={`absolute left-2 right-2 border-t-2 border-dashed border-brand-blue-500 z-10 ${dropPosition.before ? '-top-2' : 'bottom-[-0.5rem]'
                          }`}
                      />
                    )}
                    <div
                      draggable={mode === 'custom'}
                      onDragStart={() => mode === 'custom' && handleDragStart(index)}
                      className={`p-3 bg-white rounded-lg border border-gray-300 space-y-2 relative shadow-sm transition-all duration-200 ${mode === 'custom'
                        ? 'group hover:border-gray-400 hover:shadow-md cursor-grab active:cursor-grabbing'
                        : ''
                        } ${isDragged ? 'opacity-30' : 'opacity-100'}`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-gray-500">
                          {mode === 'custom' && (
                            <div className="cursor-grab active:cursor-grabbing">
                              <GripVertical className="h-5 w-5" />
                            </div>
                          )}
                          <label className="text-sm font-semibold text-gray-800">Range {index + 1}</label>
                        </div>
                        {customRanges.length > 1 && mode === 'custom' && (
                          <button
                            onClick={() => removeCustomRange(index)}
                            className="text-gray-400 hover:text-brand-blue-500 transition-all duration-200 p-1 rounded-full absolute top-2 right-2 opacity-0 group-hover:opacity-100 hover:scale-110"
                            aria-label={`Remove range ${index + 1}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <label className="text-xs text-gray-500 mb-1 block">from page</label>
                          <input
                            type="number"
                            value={range.from}
                            onChange={(e) =>
                              updateCustomRange(index, 'from', parseInt(e.target.value, 10) || 1)
                            }
                            min={1}
                            max={pdfDoc?.numPages || 1000}
                            className="w-full px-3 py-2 text-center bg-gray-50 border border-gray-300 rounded-md focus:ring-brand-blue-500 focus:border-brand-blue-500"
                            aria-label={`Start page for range ${index + 1}`}
                          />
                        </div>
                        <span className="text-gray-500 pt-5">-</span>
                        <div className="flex-1">
                          <label className="text-xs text-gray-500 mb-1 block">to</label>
                          <input
                            type="number"
                            value={range.to}
                            onChange={(e) =>
                              updateCustomRange(index, 'to', parseInt(e.target.value, 10) || 1)
                            }
                            min={range.from}
                            max={pdfDoc?.numPages || 1000}
                            className="w-full px-3 py-2 text-center bg-gray-50 border border-gray-300 rounded-md focus:ring-brand-blue-500 focus:border-brand-blue-500"
                            aria-label={`End page for range ${index + 1}`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {mode === 'custom' && (
            <button
              onClick={() => {
                const total = pdfDoc?.numPages || 10;
                const lastRange = customRanges[customRanges.length - 1];
                let start = lastRange ? lastRange.to + 1 : 1;
                // If start exceeds total pages, wrap around to 1
                if (start > total) start = 1;
                const end = Math.min(start, total); // Start with single page range
                addCustomRange(start, end);
              }}
              className="w-full flex items-center justify-center px-4 py-2 border border-brand-blue-600 rounded-lg text-sm font-medium text-brand-blue-600 hover:bg-brand-blue-50 transition-colors duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Range
            </button>
          )}

          {mode === 'fixed' && (
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 block">Split into page ranges of:</label>
              <input
                type="number"
                min={1}
                value={rangeSize}
                onChange={(e) => {
                  const newSize = parseInt(e.target.value, 10) || 1;
                  handleRangeSizeChange(newSize);
                }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:ring-brand-blue-500 focus:border-brand-blue-500"
              />
            </div>
          )}

          <div className="relative flex items-start mt-4">
            <div className="flex items-center h-5">
              <input
                id="merge"
                name="merge"
                type="checkbox"
                checked={mergeRanges}
                onChange={(e) => setMergeRanges(e.target.checked)}
                className="focus:ring-brand-blue-500 h-4 w-4 text-brand-blue-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="merge" className="font-medium text-gray-700">
                Merge all ranges in one PDF file
              </label>
            </div>
          </div>
        </>
      )}

      {currentTab === 'pages' && (
        <>
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 block">Extract mode:</label>
            <div className="flex gap-2">
              <button
                onClick={handleExtractAll}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md border transition-colors ${extractMode === 'all'
                  ? 'bg-white border-brand-blue-500 text-brand-blue-600 shadow-sm'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
              >
                Extract All
              </button>
              <button
                onClick={handleSelectPages}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md border transition-colors ${extractMode === 'select'
                  ? 'bg-white border-brand-blue-500 text-brand-blue-600 shadow-sm'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
              >
                Select Pages
              </button>
            </div>
          </div>

          {extractMode === 'select' && (
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 block">Pages to extract:</label>
              <input
                type="text"
                value={pagesToExtractValue}
                placeholder="e.g., 1-5,7,9-10"
                onChange={(e) => {
                  const value = e.target.value;
                  setPagesToExtractValue(value);
                  parsePagesInput(value);
                }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:ring-brand-blue-500 focus:border-brand-blue-500"
              />
            </div>
          )}

          {extractMode === 'select' && (
            <div className="relative flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="merge-pages"
                  type="checkbox"
                  checked={mergePages}
                  onChange={(e) => setMergePages(e.target.checked)}
                  className="focus:ring-brand-blue-500 h-4 w-4 text-brand-blue-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="merge-pages" className="font-medium text-gray-700">
                  Merge extracted pages into one PDF file
                </label>
              </div>
            </div>
          )}
        </>
      )}

      {currentTab === 'size' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 block">Split by max file size:</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                value={sizeValue}
                onChange={(e) => setSizeValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:ring-brand-blue-500 focus:border-brand-blue-500 outline-none"
                placeholder="Max size"
              />
              <div className="flex rounded-md shadow-sm">
                <button
                  onClick={() => setSizeUnit('MB')}
                  className={`px-4 py-2 text-sm font-medium border rounded-l-md transition-colors ${sizeUnit === 'MB'
                    ? 'bg-brand-blue-50 text-brand-blue-600 border-brand-blue-500 z-10'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  MB
                </button>
                <button
                  onClick={() => setSizeUnit('KB')}
                  className={`px-4 py-2 text-sm font-medium border border-l-0 rounded-r-md transition-colors ${sizeUnit === 'KB'
                    ? 'bg-brand-blue-50 text-brand-blue-600 border-brand-blue-500 z-10'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  KB
                </button>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 space-y-2 text-sm text-blue-900">
            <div className="flex justify-between">
              <span className="text-blue-700">File size:</span>
              <span className="font-medium">{fileSizeStr || '0 MB'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Total pages:</span>
              <span className="font-medium">{totalPages || 0}</span>
            </div>
            <div className="pt-2 border-t border-blue-200 flex justify-between font-semibold">
              <span className="text-blue-700">Approx. files:</span>
              <span>{estimatedFiles || 0}</span>
            </div>
          </div>
        </div>
      )}

      {infoMessage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          {infoMessage}
        </div>
      )}
    </div>
  );

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/75 backdrop-blur-sm z-50 animate-fade-in">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-brand-blue-200 border-t-brand-blue-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Loading PDF...</p>
          </div>
        </div>
      )}

      <div className="flex-grow p-8 flex flex-col items-center overflow-y-auto bg-gray-100">
        {currentTab === 'range' && (
          <RangePreview
            mode={mode}
            customRanges={customRanges}
            pdfDoc={pdfDoc}
            rangeSize={rangeSize}
            onOpenDetailedPage={onOpenDetailedPage}
            onViewRange={handleViewRange}
          />
        )}

        {currentTab === 'pages' && pdfDoc && (
          <PagesPreviewGrid
            pdfDoc={pdfDoc}
            selectedPages={selectedPages}
            onTogglePageSelection={togglePageSelection}
          />
        )}

        {currentTab === 'size' && pdfDoc && (
          <div className="flex justify-center pt-8 p-8 overflow-hidden">
            <div className="group flex flex-col items-center space-y-2 flex-shrink-0">
              <PdfPageCard
                pageNumber={1}
                pdfDoc={pdfDoc}
                className="w-40 h-56"
              />
              <span className="text-sm font-medium text-gray-600">1</span>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Layout */}
      <MobileLayout
        settingsTitle="Split Options"
        settingsContent={settingsContent}
        actionButton={{
          label: 'Split PDF',
          onClick: handleSplit,
          disabled: isSplitting,
          isProcessing: isSplitting,
          processingText: 'Splitting...',
          progress: splitProgress,
        }}
      >
        <></>
      </MobileLayout>

      {/* Desktop Sidebar - hidden on mobile */}
      <aside className="hidden md:flex w-96 flex-shrink-0 bg-white border-l border-gray-200 flex-col h-full overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-brand-blue-600" />
            Split Options
          </h2>
        </div>

        <div className="flex-1 p-5 flex flex-col space-y-6 overflow-hidden min-h-0">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 block">View mode:</label>
            <SegmentedControl
              options={viewModeOptions}
              value={currentTab}
              onChange={(value) => {
                const tabMap: Record<string, 'range' | 'pages' | 'size'> = {
                  range: 'range',
                  pages: 'pages',
                  size: 'size',
                };
                handleTabClick(['range', 'pages', 'size'].indexOf(tabMap[value]));
              }}
            />
          </div>

          {currentTab === 'range' && (
            <>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 block">Range mode:</label>
                <div className="flex gap-2">
                  {rangeModeOptions.map((opt) => (
                    <Button
                      key={opt.value}
                      onClick={() => {
                        if (opt.value === 'custom') handleCustomMode();
                        if (opt.value === 'fixed') handleFixedMode();
                      }}
                      variant={mode === opt.value ? 'tool-option-active' : 'tool-option'}
                      className="flex-1"
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              {mode === 'custom' && (
                <div className="flex-grow space-y-4 -mx-6 px-6 overflow-y-scroll">
                  {customRanges.map((range, index) => {
                    const isDragged = draggedIndex === index;
                    return (
                      <div
                        key={range.id}
                        onDragOver={(e) => mode === 'custom' && handleDragOver(e, range.id)}
                        onDragLeave={() => mode === 'custom' && handleDragLeave()}
                        onDrop={(e) => mode === 'custom' && handleRangeDrop(e, range.id)}
                        onDragEnd={() => mode === 'custom' && handleDragEnd()}
                        className="relative"
                      >
                        {dropPosition?.id === range.id && draggedIndex !== index && (
                          <div
                            className={`absolute left-2 right-2 border-t-2 border-dashed border-brand-blue-500 z-10 ${dropPosition.before ? '-top-2' : 'bottom-[-0.5rem]'
                              }`}
                          />
                        )}
                        <div
                          draggable={mode === 'custom'}
                          onDragStart={() => mode === 'custom' && handleDragStart(index)}
                          className={`p-3 bg-white rounded-lg border border-gray-300 space-y-2 relative shadow-sm transition-all duration-200 ${mode === 'custom'
                            ? 'group hover:border-gray-400 hover:shadow-md cursor-grab active:cursor-grabbing'
                            : ''
                            } ${isDragged ? 'opacity-30' : 'opacity-100'}`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2 text-gray-500">
                              {mode === 'custom' && (
                                <div className="cursor-grab active:cursor-grabbing">
                                  <GripVertical className="h-5 w-5" />
                                </div>
                              )}
                              <label className="text-sm font-semibold text-gray-800">Range {index + 1}</label>
                            </div>
                            {customRanges.length > 1 && mode === 'custom' && (
                              <button
                                onClick={() => removeCustomRange(index)}
                                className="text-gray-400 hover:text-brand-blue-500 transition-all duration-200 p-1 rounded-full absolute top-2 right-2 opacity-0 group-hover:opacity-100 hover:scale-110"
                                aria-label={`Remove range ${index + 1}`}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="flex-1">
                              <label className="text-xs text-gray-500 mb-1 block">from page</label>
                              <input
                                type="number"
                                value={range.from}
                                onChange={(e) =>
                                  updateCustomRange(index, 'from', parseInt(e.target.value, 10) || 1)
                                }
                                min={1}
                                max={pdfDoc?.numPages || 1000}
                                className="w-full px-3 py-2 text-center bg-gray-50 border border-gray-300 rounded-md focus:ring-brand-blue-500 focus:border-brand-blue-500"
                                aria-label={`Start page for range ${index + 1}`}
                              />
                            </div>
                            <span className="text-gray-500 pt-5">-</span>
                            <div className="flex-1">
                              <label className="text-xs text-gray-500 mb-1 block">to</label>
                              <input
                                type="number"
                                value={range.to}
                                onChange={(e) =>
                                  updateCustomRange(index, 'to', parseInt(e.target.value, 10) || 1)
                                }
                                min={range.from}
                                max={pdfDoc?.numPages || 1000}
                                className="w-full px-3 py-2 text-center bg-gray-50 border border-gray-300 rounded-md focus:ring-brand-blue-500 focus:border-brand-blue-500"
                                aria-label={`End page for range ${index + 1}`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {mode === 'custom' && (
                <button
                  onClick={() => {
                    const total = pdfDoc?.numPages || 10;
                    const lastRange = customRanges[customRanges.length - 1];
                    let start = lastRange ? lastRange.to + 1 : 1;
                    // If start exceeds total pages, wrap around to 1
                    if (start > total) start = 1;
                    const end = Math.min(start, total); // Start with single page range
                    addCustomRange(start, end);
                  }}
                  className="w-full flex items-center justify-center px-4 py-2 border border-brand-blue-600 rounded-lg text-sm font-medium text-brand-blue-600 hover:bg-brand-blue-50 transition-colors duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Range
                </button>
              )}

              {mode === 'fixed' && (
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700 block">Split into page ranges of:</label>
                  <input
                    type="number"
                    min={1}
                    value={rangeSize}
                    onChange={(e) => {
                      const newSize = parseInt(e.target.value, 10) || 1;
                      handleRangeSizeChange(newSize);
                    }}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:ring-brand-blue-500 focus:border-brand-blue-500"
                  />
                </div>
              )}

              <div className="relative flex items-start mt-4">
                <div className="flex items-center h-5">
                  <input
                    id="merge"
                    name="merge"
                    type="checkbox"
                    checked={mergeRanges}
                    onChange={(e) => setMergeRanges(e.target.checked)}
                    className="focus:ring-brand-blue-500 h-4 w-4 text-brand-blue-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="merge" className="font-medium text-gray-700">
                    Merge all ranges in one PDF file
                  </label>
                </div>
              </div>
            </>
          )}

          {currentTab === 'pages' && (
            <>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 block">Extract mode:</label>
                <div className="flex gap-2">
                  <button
                    onClick={handleExtractAll}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-md border transition-colors ${extractMode === 'all'
                      ? 'bg-white border-brand-blue-500 text-brand-blue-600 shadow-sm'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                  >
                    Extract All
                  </button>
                  <button
                    onClick={handleSelectPages}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-md border transition-colors ${extractMode === 'select'
                      ? 'bg-white border-brand-blue-500 text-brand-blue-600 shadow-sm'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                  >
                    Select Pages
                  </button>
                </div>
              </div>

              {extractMode === 'select' && (
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700 block">Pages to extract:</label>
                  <input
                    type="text"
                    value={pagesToExtractValue}
                    placeholder="e.g., 1-5,7,9-10"
                    onChange={(e) => {
                      const value = e.target.value;
                      setPagesToExtractValue(value);
                      parsePagesInput(value);
                    }}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:ring-brand-blue-500 focus:border-brand-blue-500"
                  />
                </div>
              )}

              {extractMode === 'select' && (
                <div className="relative flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="merge-pages"
                      type="checkbox"
                      checked={mergePages}
                      onChange={(e) => setMergePages(e.target.checked)}
                      className="focus:ring-brand-blue-500 h-4 w-4 text-brand-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="merge-pages" className="font-medium text-gray-700">
                      Merge extracted pages into one PDF file
                    </label>
                  </div>
                </div>
              )}
            </>
          )}

          {currentTab === 'size' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 block">Split by max file size:</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    value={sizeValue}
                    onChange={(e) => setSizeValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:ring-brand-blue-500 focus:border-brand-blue-500 outline-none"
                    placeholder="Max size"
                  />
                  <div className="flex rounded-md shadow-sm">
                    <button
                      onClick={() => setSizeUnit('MB')}
                      className={`px-4 py-2 text-sm font-medium border rounded-l-md transition-colors ${sizeUnit === 'MB'
                        ? 'bg-brand-blue-50 text-brand-blue-600 border-brand-blue-500 z-10'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      MB
                    </button>
                    <button
                      onClick={() => setSizeUnit('KB')}
                      className={`px-4 py-2 text-sm font-medium border border-l-0 rounded-r-md transition-colors ${sizeUnit === 'KB'
                        ? 'bg-brand-blue-50 text-brand-blue-600 border-brand-blue-500 z-10'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      KB
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 space-y-2 text-sm text-blue-900">
                <div className="flex justify-between">
                  <span className="text-blue-700">File size:</span>
                  <span className="font-medium">{fileSizeStr || '0 MB'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Total pages:</span>
                  <span className="font-medium">{totalPages || 0}</span>
                </div>
                <div className="pt-2 border-t border-blue-200 flex justify-between font-semibold">
                  <span className="text-blue-700">Approx. files:</span>
                  <span>{estimatedFiles || 0}</span>
                </div>
              </div>
            </div>
          )}

          {infoMessage && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              {infoMessage}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-200 bg-gray-50 mt-auto flex-shrink-0">
          <button
            onClick={handleSplit}
            disabled={isSplitting}
            className="w-full text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center text-lg shadow-lg transition-all duration-200 hover:bg-brand-blue-700 hover:shadow-xl disabled:cursor-not-allowed"
            style={{
              background: isSplitting ? '#9ca3af' : '#2563eb'
            }}
          >
            {isSplitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Splitting...
              </>
            ) : (
              <>
                Split PDF
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </button>
          <ToolCTAs variant="sidebar" />
        </div>
      </aside>
    </>
  );
};

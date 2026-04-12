import React from 'react';
import { Plus } from 'lucide-react';
import { ToolCTAs } from '../shared/ToolCTAs';

interface SplitUploadHeroProps {
  fileInputRef: React.RefObject<HTMLInputElement>;
  dragOver: boolean;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDropZoneClick: () => void;
  onFileDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  isExtractMode?: boolean;
}

export const SplitUploadHero: React.FC<SplitUploadHeroProps> = ({
  fileInputRef,
  dragOver,
  onFileInputChange,
  onDropZoneClick,
  onFileDragOver,
  onFileDragLeave,
  onFileDrop,
  isExtractMode = false,
}) => {
  return (
    <div
      className="flex-grow flex items-center justify-center px-4 py-8 sm:p-8"
      onDragEnter={onFileDragOver}
      onDragLeave={onFileDragLeave}
      onDragOver={onFileDragOver}
      onDrop={onFileDrop}
    >
      <div
        className={`text-center transition-transform duration-300 ${dragOver ? 'scale-105' : ''
          }`}
      >
        <div
          className={`p-6 sm:p-10 rounded-xl transition-all duration-300 ${dragOver ? 'bg-brand-blue-50 ring-4 ring-brand-blue-200' : ''
            }`}
        >
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-800">
            {isExtractMode ? 'Extract PDF pages' : 'Split PDF file'}
          </h1>
          <p className="mt-4 text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto">
            {isExtractMode
              ? 'Get a new PDF document with only the desired pages.'
              : 'Separate one page or a whole set for easy conversion into independent PDF files.'}
          </p>
          <div className="mt-10">
            <input
              type="file"
              ref={fileInputRef}
              onChange={onFileInputChange}
              className="hidden"
              accept="application/pdf"
            />
            <button
              onClick={onDropZoneClick}
              className="w-full sm:w-auto bg-brand-blue-600 text-white font-bold py-3.5 sm:py-4 px-6 sm:px-10 rounded-lg hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl text-lg sm:text-xl inline-flex items-center justify-center"
              aria-label="Select PDF file to split"
            >
              <Plus className="h-6 w-6 mr-3" />
              Select PDF file
            </button>
          </div>
          <p className="mt-4 text-sm sm:text-base text-gray-500">or drop PDF here</p>
          <ToolCTAs variant="hero" />
        </div>
      </div>
    </div>
  );
};

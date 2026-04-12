import React from 'react';
import { X } from 'lucide-react';
import type { CustomRange } from './splitTypes';
import { PdfPageCard } from '@/components/pdf/shared/PdfPageCard';

interface RangePagesViewProps {
  range: CustomRange;
  rangeNumber?: number;
  pdfDoc: any;
  onClose: () => void;
  onSelectPage: (pageNumber: number) => void;
}

export const RangePagesView: React.FC<RangePagesViewProps> = ({
  range,
  rangeNumber = 1,
  pdfDoc,
  onClose,
  onSelectPage,
}) => {
  const pageCount = range.to >= range.from ? range.to - range.from + 1 : 0;
  const pages = Array.from({ length: pageCount }, (_, i) => range.from + i);

  return (
    <div
      className="bg-gray-100 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col animate-fade-in-up"
      onClick={(e) => e.stopPropagation()}
    >
      <header className="p-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
        <h2 className="text-lg font-bold text-gray-800">
          Range {rangeNumber}: Pages {range.from} - {range.to}
        </h2>
        <button
          onClick={onClose}
          className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors duration-200"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>
      </header>
      <div className="p-6 overflow-y-auto">
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {pages.map((pageNum) => (
            <div key={pageNum} className="flex flex-col items-center gap-2">
              <PdfPageCard
                pageNumber={pageNum}
                pdfDoc={pdfDoc}
                onClick={() => onSelectPage(pageNum)}
                className="w-full h-full"
              />
              <div className="text-center text-sm font-medium text-gray-700">
                Page {pageNum}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { PdfPageCard } from '@/components/pdf/shared/PdfPageCard';

interface PagesPreviewGridProps {
  pdfDoc: any;
  selectedPages: number[];
  onTogglePageSelection: (pageNum: number) => void;
}

export const PagesPreviewGrid: React.FC<PagesPreviewGridProps> = ({
  pdfDoc,
  selectedPages,
  onTogglePageSelection,
}) => {
  return (
    <div className="max-w-6xl mx-auto w-full pb-20">
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
        {Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1).map((pageNum) => (
          <div key={pageNum} className="flex flex-col items-center gap-2">
            <PdfPageCard
              pageNumber={pageNum}
              pdfDoc={pdfDoc}
              isSelected={selectedPages.includes(pageNum)}
              onClick={() => onTogglePageSelection(pageNum)}
              className="group-hover:shadow-lg group-hover:-translate-y-1 group-hover:border-brand-blue-300 transition-all duration-200"
            />
            <div className="text-center text-sm font-medium text-gray-700">
              Page {pageNum}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

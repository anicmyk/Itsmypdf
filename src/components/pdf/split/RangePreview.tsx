import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import type { CustomRange } from './splitTypes';
import { PdfPageCard } from '@/components/pdf/shared/PdfPageCard';

interface RangePreviewProps {
  mode: 'custom' | 'fixed';
  customRanges: CustomRange[];
  pdfDoc: any;
  rangeSize: number;
  onOpenDetailedPage: (params: { range: CustomRange; pageNumber: number }) => void;
  onViewRange: (range: CustomRange, index?: number) => void;
}

export const RangePreview: React.FC<RangePreviewProps> = ({
  mode,
  customRanges,
  pdfDoc,
  rangeSize,
  onOpenDetailedPage,
  onViewRange,
}) => {
  return (
    <div className="flex flex-wrap justify-center items-start gap-6 sm:gap-8">
      {mode === 'custom' &&
        customRanges.map((range, index) => {
          const pageCount = range.to >= range.from ? range.to - range.from + 1 : 0;

          return (
            <div key={range.id} className="flex flex-col" data-range-section>
              <h3 className="text-lg font-semibold text-gray-700 mb-4 text-center">Range {index + 1}</h3>
              <div className="flex items-start justify-center p-6 bg-white border-2 border-dashed border-gray-300 rounded-xl min-h-[20rem]">
                {pageCount === 0 ? (
                  <div className="text-center text-gray-500 self-center">
                    <p className="font-medium">Empty range</p>
                    <p className="text-sm">Please select a valid page range.</p>
                  </div>
                ) : (
                  <div className="flex items-start justify-center gap-6">
                    {pageCount > 0 && (
                      <div className="group flex flex-col items-center space-y-2 flex-shrink-0">
                        <div className="w-full max-w-40">
                          <PdfPageCard
                            pageNumber={range.from}
                            pdfDoc={pdfDoc}
                            onClick={() => onOpenDetailedPage({ range, pageNumber: range.from })}
                            className="w-full h-full"
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-600">{range.from}</span>
                      </div>
                    )}
                    {pageCount > 2 && (
                      <div className="flex flex-col items-center self-center pt-16 text-center">
                        <MoreHorizontal className="w-10 h-10 text-gray-400" />
                        <span className="text-sm font-medium text-gray-500 mt-1">
                          {pageCount - 2} page{pageCount - 2 > 1 ? 's' : ''}
                        </span>
                        <button
                          onClick={() => onViewRange(range, index)}
                          className="mt-4 px-4 py-2 text-sm font-semibold text-brand-blue-600 bg-brand-blue-50 rounded-md hover:bg-brand-blue-200/75 transition-colors duration-200"
                        >
                          View all pages
                        </button>
                      </div>
                    )}
                    {pageCount > 1 && (
                      <div className="group flex flex-col items-center space-y-2 flex-shrink-0">
                        <div className="w-full max-w-40">
                          <PdfPageCard
                            pageNumber={range.to}
                            pdfDoc={pdfDoc}
                            onClick={() => onOpenDetailedPage({ range, pageNumber: range.to })}
                            className="w-full h-full"
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-600">{range.to}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

      {mode === 'fixed' &&
        pdfDoc &&
        (() => {
          const total = pdfDoc.numPages;
          const totalRanges = Math.ceil(total / rangeSize);

          return Array.from({ length: totalRanges }, (_, i) => {
            const start = i * rangeSize + 1;
            const end = Math.min(start + rangeSize - 1, total);
            const pageCount = end - start + 1;
            const range: CustomRange = { id: i + 1, from: start, to: end };

            return (
              <div key={i} className="flex flex-col" data-range-section>
                <h3 className="text-lg font-semibold text-gray-700 mb-4 text-center">Range {i + 1}</h3>
                <div className="flex items-start justify-center p-4 sm:p-6 bg-white border-2 border-dashed border-gray-300 rounded-xl min-h-[20rem]">
                  <div className="flex items-start justify-center gap-6">
                    {pageCount > 0 && (
                      <div className="group flex flex-col items-center space-y-2 flex-shrink-0">
                        <div className="w-full max-w-40">
                          <PdfPageCard
                            pageNumber={start}
                            pdfDoc={pdfDoc}
                            onClick={() => onOpenDetailedPage({ range, pageNumber: start })}
                            className="w-full h-full"
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-600">{start}</span>
                      </div>
                    )}
                    {pageCount > 2 && (
                      <div className="flex flex-col items-center self-center pt-16 text-center">
                        <MoreHorizontal className="w-10 h-10 text-gray-400" />
                        <span className="text-sm font-medium text-gray-500 mt-1">
                          {pageCount - 2} page{pageCount - 2 > 1 ? 's' : ''}
                        </span>
                        <button
                          onClick={() => onViewRange(range, i)}
                          className="mt-4 px-4 py-2 text-sm font-semibold text-brand-blue-600 bg-brand-blue-50 rounded-md hover:bg-brand-blue-200/75 transition-colors duration-200"
                        >
                          View all pages
                        </button>
                      </div>
                    )}
                    {pageCount > 1 && (
                      <div className="group flex flex-col items-center space-y-2 flex-shrink-0">
                        <div className="w-full max-w-40">
                          <PdfPageCard
                            pageNumber={end}
                            pdfDoc={pdfDoc}
                            onClick={() => onOpenDetailedPage({ range, pageNumber: end })}
                            className="w-full h-full"
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-600">{end}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          });
        })()}
    </div>
  );
};

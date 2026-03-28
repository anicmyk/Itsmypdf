import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { PreviewToolbar } from './PreviewToolbar';
import { LoadingSpinner } from '@/components/pdf/shared/LoadingSpinner';

interface CustomRange {
  id: number;
  from: number;
  to: number;
}

interface PagePreviewModalProps {
  range?: CustomRange;
  currentPage: number;
  totalPages: number;
  pdfDoc: any;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onBack: () => void;
  overlay?: React.ReactNode;
  onMetrics?: (m: { canvasWidth: number; canvasHeight: number; cssWidth: number; cssHeight: number; scale: number }) => void;
  onRotateLeft?: () => void;
  onRotateRight?: () => void;
  onDelete?: () => void;
  rightPanel?: React.ReactNode;
  size?: 'default' | 'large';
}

export const PagePreviewModal: React.FC<PagePreviewModalProps> = ({
  range,
  currentPage,
  totalPages,
  pdfDoc,
  onClose,
  onNavigate,
  onBack,
  overlay,
  onMetrics,
  onRotateLeft,
  onRotateRight,
  onDelete,
  rightPanel,
  size = 'default',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [overlaySize, setOverlaySize] = useState<{ width: number; height: number } | null>(null);
  const [initialRenderMetrics, setInitialRenderMetrics] = useState<{ canvasWidth: number; canvasHeight: number; scale: number } | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ x: 0, y: 0 });

  const totalPagesInScope = range ? range.to - range.from + 1 : totalPages;
  const currentIndexInScope = range ? currentPage - range.from : currentPage - 1;
  const canGoPrev = range ? currentPage > range.from : currentPage > 1;
  const canGoNext = range ? currentPage < range.to : currentPage < totalPages;

  useEffect(() => {
    if (pdfDoc && canvasRef.current) {
      const renderPage = async () => {
        try {
          const page = await pdfDoc.getPage(currentPage);
          // Always render at 1.0 scale, zoom is handled by CSS transform
          const scale = 1.0;
          const viewport = page.getViewport({ scale });
          canvasRef.current!.width = viewport.width;
          canvasRef.current!.height = viewport.height;
          const ctx = canvasRef.current!.getContext('2d');
          if (ctx) {
            // Render immediately without showing loading state for instant navigation
            await page.render({ canvasContext: ctx, viewport }).promise;
          }
          setIsRendering(false);
          setInitialRenderMetrics({ canvasWidth: viewport.width, canvasHeight: viewport.height, scale });
          // Initial measurement after rendering
          const rect = canvasRef.current!.getBoundingClientRect();
          setOverlaySize({ width: rect.width, height: rect.height });
          if (onMetrics) {
            onMetrics({
              canvasWidth: viewport.width,
              canvasHeight: viewport.height,
              cssWidth: rect.width,
              cssHeight: rect.height,
              scale,
            });
          }
        } catch (error) {
          console.error('Error rendering page', currentPage);
          setIsRendering(false);
        }
      };
      renderPage();
    }
  }, [pdfDoc, currentPage]); // Removed zoom from dependencies

  const handleCanvasResize = useCallback(() => {
    if (canvasRef.current && initialRenderMetrics) {
      const rect = canvasRef.current.getBoundingClientRect();
      // Only update if dimensions have actually changed to prevent unnecessary re-renders
      if (rect.width !== overlaySize?.width || rect.height !== overlaySize?.height) {
        setOverlaySize({ width: rect.width, height: rect.height });
        if (onMetrics) {
          onMetrics({
            canvasWidth: initialRenderMetrics.canvasWidth,
            canvasHeight: initialRenderMetrics.canvasHeight,
            cssWidth: rect.width,
            cssHeight: rect.height,
            scale: initialRenderMetrics.scale,
          });
        }
      }
    }
  }, [onMetrics, initialRenderMetrics, overlaySize]);

  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    const resizeObserver = new ResizeObserver(() => {
      handleCanvasResize();
    });

    resizeObserver.observe(canvasElement);

    return () => {
      resizeObserver.unobserve(canvasElement);
    };
  }, [handleCanvasResize]);

  // Hand tool panning handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1.0 && scrollContainerRef.current) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setScrollStart({
        x: scrollContainerRef.current.scrollLeft,
        y: scrollContainerRef.current.scrollTop,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && scrollContainerRef.current) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      scrollContainerRef.current.scrollLeft = scrollStart.x - dx;
      scrollContainerRef.current.scrollTop = scrollStart.y - dy;
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
  };

  const outerMaxW = size === 'large' ? 'max-w-[80vw]' : 'max-w-4xl';
  const outerMaxH = size === 'large' ? 'max-h-[90vh]' : 'max-h-[95vh]';
  const canvasMax = size === 'large' ? 'max-w-[78vw] max-h-[85vh]' : 'max-w-full max-h-full';

  return (
    <div
      className={`w-full ${outerMaxW} h-full ${outerMaxH} flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up`}
      onClick={(e) => e.stopPropagation()}
    >
      <header className="w-full bg-[#323639] text-white flex items-center justify-between px-6 py-3 flex-shrink-0">
        <div className="w-10" />
        <h2 className="text-sm font-medium opacity-90 uppercase tracking-widest">
          Page {currentPage} of {totalPages}
        </h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 transition-all duration-200"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-grow w-full bg-[#f1f3f4] min-h-0 relative flex flex-row">
        <div
          ref={scrollContainerRef}
          className="flex-grow flex items-center justify-center p-4 relative overflow-auto select-none"
          style={{
            cursor: zoom > 1.0 ? (isPanning ? 'grabbing' : 'grab') : 'default',
            scrollBehavior: isPanning ? 'auto' : 'smooth'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          <div
            className="relative shadow-[0_0_20px_rgba(0,0,0,0.15)] bg-white transition-transform duration-300 ease-out origin-top"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
          >
            <canvas
              ref={canvasRef}
              className="block"
              style={{
                maxWidth: rightPanel ? 'calc(100vw - 450px)' : 'calc(100vw - 200px)',
                maxHeight: 'calc(100vh - 180px)',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                pointerEvents: 'none' // Prevent canvas from interfering with pan
              }}
            />
            {overlay && overlaySize && (
              <div
                className="absolute overflow-hidden z-30"
                style={{
                  width: overlaySize.width,
                  height: overlaySize.height,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {overlay}
              </div>
            )}
          </div>
        </div>
        {rightPanel && (
          <aside className="border-l bg-white flex-shrink-0 overflow-y-auto">
            {rightPanel}
          </aside>
        )}
      </div>

      <div className="bg-[#323639] p-3 flex-shrink-0 flex items-center justify-center">
        <PreviewToolbar
          currentPageIndex={currentIndexInScope}
          totalPagesInRange={totalPagesInScope}
          onBack={onBack}
          onNavigate={onNavigate}
          onRotateLeft={onRotateLeft ?? (() => { })}
          onRotateRight={onRotateRight ?? (() => { })}
          onDelete={onDelete ?? (() => { })}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
          zoom={zoom}
          onZoomIn={() => setZoom(prev => Math.min(prev + 0.25, 3))}
          onZoomOut={() => setZoom(prev => Math.max(prev - 0.25, 0.5))}
        />
      </div>
    </div>
  );
};
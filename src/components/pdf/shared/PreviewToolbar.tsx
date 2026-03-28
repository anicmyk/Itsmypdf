// src/shared/PreviewToolbar.tsx
import React from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

interface PreviewToolbarProps {
  currentPageIndex: number;
  totalPagesInRange: number;
  onBack: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onRotateLeft?: () => void;
  onRotateRight?: () => void;
  onDelete?: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
  zoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}

export const PreviewToolbar: React.FC<PreviewToolbarProps> = ({
  currentPageIndex,
  totalPagesInRange,
  onBack,
  onNavigate,
  canGoPrev,
  canGoNext,
  zoom = 1.0,
  onZoomIn,
  onZoomOut,
}) => {
  return (
    <footer className="w-fit mx-auto flex-shrink-0">
      <div className="flex items-center text-white gap-3">
        <button
          onClick={onBack}
          className="p-2.5 rounded-lg transition-all duration-200 hover:bg-white/10 active:scale-95"
          aria-label="Back to range view"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="w-px h-5 bg-white/20" />

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('prev')}
            disabled={!canGoPrev}
            className={`p-2.5 rounded-lg transition-all duration-200 ${canGoPrev
              ? 'hover:bg-white/10 active:scale-95'
              : 'opacity-30 cursor-not-allowed'
              }`}
            aria-label="Previous page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="px-4 py-1.5 text-sm font-medium min-w-[90px] text-center">
            <span className="text-white">{currentPageIndex + 1}</span>
            <span className="text-white/40 mx-1.5">/</span>
            <span className="text-white/60">{totalPagesInRange}</span>
          </div>

          <button
            onClick={() => onNavigate('next')}
            disabled={!canGoNext}
            className={`p-2.5 rounded-lg transition-all duration-200 ${canGoNext
              ? 'hover:bg-white/10 active:scale-95'
              : 'opacity-30 cursor-not-allowed'
              }`}
            aria-label="Next page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="w-px h-5 bg-white/20" />

        <div className="flex items-center gap-2">
          <button
            onClick={onZoomOut}
            disabled={!onZoomOut || zoom <= 0.5}
            className={`p-2.5 rounded-lg transition-all duration-200 ${onZoomOut && zoom > 0.5
              ? 'hover:bg-white/10 active:scale-95'
              : 'opacity-30 cursor-not-allowed'
              }`}
            aria-label="Zoom out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>

          <div className="px-2 py-1 text-xs font-medium min-w-[50px] text-center text-white/80">
            {Math.round(zoom * 100)}%
          </div>

          <button
            onClick={onZoomIn}
            disabled={!onZoomIn || zoom >= 3}
            className={`p-2.5 rounded-lg transition-all duration-200 ${onZoomIn && zoom < 3
              ? 'hover:bg-white/10 active:scale-95'
              : 'opacity-30 cursor-not-allowed'
              }`}
            aria-label="Zoom in"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
        </div>
      </div>
    </footer>
  );
};
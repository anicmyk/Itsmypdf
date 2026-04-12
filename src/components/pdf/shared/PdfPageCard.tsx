import React, { useEffect, useRef, useState } from 'react';
import { PdfRenderer } from '@/utils/pdf-renderer';
import { LoadingSpinner } from '@/components/pdf/shared/LoadingSpinner';
import { LazyThumbnail } from './LazyThumbnail';

interface PdfPageCardProps {
    pageNumber: number; // 1-based index expected by PdfRenderer
    pdfDoc?: any; // PDFDocumentProxy (Optional if file is provided)
    file?: File; // Optional: If provided, uses LazyThumbnail
    pageIndex?: number; // Optional: 0-based index for LazyThumbnail
    isSelected?: boolean;
    onClick?: (e: React.MouseEvent) => void;
    className?: string; // Additional classes for wrapper
    children?: React.ReactNode; // Overlays
    scale?: number;
    rotation?: number; // Rotation in degrees
    imageSrc?: string; // Optional: For image thumbnails
    // For drag and drop support or other props
    [key: string]: any;
}

export const PdfPageCard: React.FC<PdfPageCardProps> = ({
    pageNumber,
    pdfDoc,
    file,
    pageIndex,
    isSelected = false,
    onClick,
    className = '',
    children,
    scale = 0.25,
    rotation = 0,
    ...props
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isRendered, setIsRendered] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    // Wrapper Styles - use flexible sizing if aspectRatio is provided (for image-to-PDF tools)
    const hasCustomAspectRatio = props.style?.aspectRatio;
    const wrapperClass = `
        relative ${hasCustomAspectRatio ? 'w-full max-w-40' : 'w-full max-w-40 aspect-[10/14]'} bg-white border rounded-lg shadow-sm flex items-center justify-center p-2 transition-all duration-200 will-change-transform
        ${onClick ? 'cursor-pointer group-hover:shadow-lg group-hover:-translate-y-1 group-hover:border-brand-blue-300' : ''}
        ${isSelected ? 'border-brand-blue-500 border-2' : 'border-gray-300 hover:border-gray-400'}
        ${className}
    `.trim();

    // OPTION A: File-based rendering using LazyThumbnail
    if (file && pageIndex !== undefined) {
        return (
            <div
                className={wrapperClass}
                onClick={onClick}
                {...props}
            >
                <div className="w-full h-full relative overflow-hidden">
                    <LazyThumbnail
                        file={file}
                        pageIndex={pageIndex}
                        rotation={rotation}
                        className="w-full h-full"
                    />
                    {children}
                    {isSelected && (
                        <div className="absolute top-1 right-1 w-6 h-6 bg-brand-blue-500 rounded-full flex items-center justify-center shadow-md z-30">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // OPTION C: Image URL rendering (For JpgToPdf, PngToPdf)
    if (props.imageSrc) {
        return (
            <div
                className={wrapperClass}
                onClick={onClick}
                {...props}
            >
                <div className="w-full h-full relative overflow-hidden flex items-center justify-center bg-gray-50 rounded-[4px]">
                    <img
                        src={props.imageSrc}
                        alt="Thumbnail"
                        className="max-w-full max-h-full object-contain shadow-sm"
                        loading="lazy"
                    />
                    {children}
                    {isSelected && (
                        <div className="absolute top-1 right-1 w-6 h-6 bg-brand-blue-500 rounded-full flex items-center justify-center shadow-md z-30">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // OPTION B: pdfDoc-based rendering using internal PdfRenderer (Legacy / RemovePages support)

    // Reset state if pageNumber or doc changes
    useEffect(() => {
        setIsRendered(false);
    }, [pageNumber, pdfDoc]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsVisible(true);
                    } else {
                        setIsVisible(false);
                    }
                });
            },
            { rootMargin: '200px 0px' } // Load when 200px away for faster perceived loading
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!isVisible || !pdfDoc || isRendered || !canvasRef.current) return;

        const renderer = PdfRenderer.getInstance();
        let cancelRender: (() => void) | undefined;

        const render = async () => {
            try {
                const page = await pdfDoc.getPage(pageNumber);

                if (!canvasRef.current) return;

                const { promise, cancel } = renderer.renderPage(
                    page,
                    canvasRef.current,
                    scale,
                    1 // Priority
                );
                cancelRender = cancel;

                await promise;
                setIsRendered(true);
            } catch (err) {
                console.error("Render error", err);
            }
        };

        render();

        return () => {
            if (cancelRender) {
                cancelRender();
            }
        };
    }, [isVisible, pdfDoc, pageNumber, isRendered, scale]);

    return (
        <div
            ref={containerRef}
            className={wrapperClass}
            onClick={onClick}
            {...props}
        >
            <div className="w-full h-full relative bg-gray-50 rounded-[4px] flex items-center justify-center overflow-hidden">
                {!isRendered && (
                    <div className="absolute inset-0 flex items-center justify-center z-0">
                        <LoadingSpinner />
                    </div>
                )}

                <canvas
                    ref={canvasRef}
                    className={`max-w-full max-h-full object-contain relative z-10 shadow-sm transition-opacity duration-300 ${isRendered ? 'opacity-100' : 'opacity-0'}`}
                    style={{ transform: `rotate(${rotation}deg)` }}
                />

                {children}
                {isSelected && (
                    <div className="absolute top-1 right-1 w-6 h-6 bg-brand-blue-500 rounded-full flex items-center justify-center shadow-md z-30">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                )}
            </div>
        </div>
    );
};

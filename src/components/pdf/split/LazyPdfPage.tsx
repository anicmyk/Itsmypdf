import React, { useEffect, useRef, useState } from 'react';
import { LoadingSpinner } from '@/components/pdf/shared/LoadingSpinner';

interface LazyPdfPageProps {
    pageNumber: number;
    pdfDoc: any; // PDFDocumentProxy
    selected: boolean;
    onToggle: (pageNumber: number) => void;
}

export const LazyPdfPage: React.FC<LazyPdfPageProps> = ({
    pageNumber,
    pdfDoc,
    selected,
    onToggle,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isRendered, setIsRendered] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [error, setError] = useState(false);

    // 1. Intersection Observer Integration
    // This is the core "Idea": Detect visibility before doing work.
    // Standard Browser API: https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsVisible(true);
                        observer.disconnect(); // Optimization: Only trigger once
                    }
                });
            },
            {
                rootMargin: '200px', // "Eager" load when 200px away (better UX)
                threshold: 0.1,
            }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    // 2. Rendering Logic (Only runs if visible)
    useEffect(() => {
        if (!isVisible || isRendered || !pdfDoc || !canvasRef.current) return;

        let isCancelled = false;

        const renderPage = async () => {
            try {
                const page = await pdfDoc.getPage(pageNumber);

                // Thumbnail scale (adjust as needed for grid size)
                const viewport = page.getViewport({ scale: 0.25 });

                if (isCancelled || !canvasRef.current) return;

                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d', { alpha: false }); // Optimization: alpha false for speed

                if (!ctx) throw new Error('No context');

                canvas.width = viewport.width;
                canvas.height = viewport.height;

                // Visual feedback: White background
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                await page.render({
                    canvasContext: ctx,
                    viewport,
                    intent: 'display', // Hint to PDF.js
                }).promise;

                if (!isCancelled) {
                    setIsRendered(true);
                }
            } catch (err) {
                console.error(`Error rendering page ${pageNumber}`, err);
                if (!isCancelled) setError(true);
            }
        };

        // 3. UI Thread Optimization
        // requestAnimationFrame ensures we don't block the UI thread immediately
        const rafId = requestAnimationFrame(() => {
            renderPage();
        });

        return () => {
            isCancelled = true;
            cancelAnimationFrame(rafId);
        };
    }, [isVisible, isRendered, pdfDoc, pageNumber]);

    return (
        <div
            ref={containerRef}
            onClick={() => onToggle(pageNumber)}
            className={`relative border rounded-lg overflow-hidden cursor-pointer transition-all ${selected
                    ? 'border-brand-blue-500 ring-2 ring-brand-blue-200'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
            // Min height is CRITICAL for the intersection observer to work before content loads
            style={{ minHeight: '200px', aspectRatio: '3/4' }}
        >
            {/* Checkbox Overlay */}
            <div className="absolute top-2 left-2 z-10">
                <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selected
                            ? 'bg-brand-blue-600 border-brand-blue-600'
                            : 'bg-white border-gray-400'
                        }`}
                >
                    {selected && <span className="text-white text-xs font-bold">✓</span>}
                </div>
            </div>

            <div className="w-full h-full bg-gray-100 flex items-center justify-center relative">
                {!isRendered && !error && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <LoadingSpinner />
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 flex items-center justify-center text-red-500 text-xs text-center p-2">
                        Page {pageNumber}<br />Error
                    </div>
                )}

                {/* Canvas is always present but hidden until rendered to avoid layout shift */}
                <canvas
                    ref={canvasRef}
                    className={`w-full h-full object-contain ${!isRendered ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}`}
                />
            </div>

            <div className="p-2 text-center text-sm font-medium text-gray-700 bg-white border-t border-gray-100">
                Page {pageNumber}
            </div>
        </div>
    );
};

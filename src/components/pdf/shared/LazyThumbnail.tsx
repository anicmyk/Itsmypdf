import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { LoadingSpinner } from './LoadingSpinner';

// Simple in-memory cache to prevent reloading the same file repeatedly
const docCache = new Map<File, Promise<any>>();

const getPdfDoc = (file: File) => {
    if (!docCache.has(file)) {
        const loadingTask = pdfjsLib.getDocument(URL.createObjectURL(file));
        docCache.set(file, loadingTask.promise);
    }
    return docCache.get(file)!;
};

interface LazyThumbnailProps {
    file?: File;
    pageIndex: number;
    rotation: number;
    className?: string;
    children?: React.ReactNode;
}

export const LazyThumbnail: React.FC<LazyThumbnailProps> = ({
    file,
    pageIndex,
    rotation,
    className = "",
    children
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isRendered, setIsRendered] = useState(false);
    const [error, setError] = useState(false);

    // 1. Intersection Observer to detect visibility
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '200px' }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    // 2. Render Page when visible
    useEffect(() => {
        if (!isVisible || !file || isRendered) return;

        let isCancelled = false;

        const render = async () => {
            try {
                const pdfDoc = await getPdfDoc(file);
                if (isCancelled) return;

                const page = await pdfDoc.getPage(pageIndex + 1); // PDF.js is 1-indexed
                if (isCancelled) return;

                const viewport = page.getViewport({ scale: 0.25 });
                const canvas = canvasRef.current;

                if (canvas) {
                    const ctx = canvas.getContext('2d', { alpha: false });
                    if (ctx) {
                        canvas.width = viewport.width;
                        canvas.height = viewport.height;

                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);

                        await page.render({
                            canvasContext: ctx,
                            viewport,
                            intent: 'display'
                        }).promise;

                        if (!isCancelled) setIsRendered(true);
                    }
                }
            } catch (err) {
                console.error("Render error:", err);
                if (!isCancelled) setError(true);
            }
        };

        requestAnimationFrame(render);

        return () => {
            isCancelled = true;
        };
    }, [isVisible, file, pageIndex, isRendered]);

    // Reset state if file/page changes
    useEffect(() => {
        setIsRendered(false);
        setIsVisible(false); // Re-trigger observer
        setError(false);
    }, [file, pageIndex]);

    return (
        <div
            ref={containerRef}
            className={`relative bg-gray-50 flex items-center justify-center overflow-hidden ${className}`}
        // Min dimensions to prevent collapse before render
        >
            {!isRendered && !error && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <LoadingSpinner />
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex items-center justify-center text-red-500 text-xs text-center p-2 z-10">
                    Error
                </div>
            )}

            <canvas
                ref={canvasRef}
                className={`max-w-full max-h-full object-contain shadow-sm transition-opacity duration-300 ${isRendered ? 'opacity-100' : 'opacity-0'}`}
                style={{ transform: `rotate(${rotation}deg)` }}
            />
            {children}
        </div>
    );
};

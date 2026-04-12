import React, { useRef, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, Plus } from 'lucide-react';
import { ToolCTAs } from './ToolCTAs';

interface PdfUploadHeroProps {
    onFilesSelect: (files: FileList) => void;
    title?: string;
    description?: string;
    accept?: string;
    multiple?: boolean;
    icon?: React.ReactNode;
    buttonLabel?: string;
    dropLabel?: string;
    trustPoints?: string[];
    compact?: boolean;
}

export const PdfUploadHero: React.FC<PdfUploadHeroProps> = ({
    onFilesSelect,
    title = "Upload PDF",
    description = "Drag and drop your PDF files here or click to select.",
    accept = "application/pdf",
    multiple = true,
    icon,
    buttonLabel,
    dropLabel,
    trustPoints,
    compact = false
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.dataTransfer.types.includes('Files')) {
            setIsDragging(true);
            // Clear any pending timeout
            if (dragTimeoutRef.current) {
                clearTimeout(dragTimeoutRef.current);
                dragTimeoutRef.current = null;
            }
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        // Keep the overlay visible while dragging over
        if (e.dataTransfer.types.includes('Files')) {
            setIsDragging(true);
            // Clear any pending timeout
            if (dragTimeoutRef.current) {
                clearTimeout(dragTimeoutRef.current);
                dragTimeoutRef.current = null;
            }
        }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        // Use timeout to prevent flickering when moving between child elements
        if (dragTimeoutRef.current) {
            clearTimeout(dragTimeoutRef.current);
        }

        dragTimeoutRef.current = setTimeout(() => {
            setIsDragging(false);
            dragTimeoutRef.current = null;
        }, 50);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        // Clear timeout and hide overlay immediately
        if (dragTimeoutRef.current) {
            clearTimeout(dragTimeoutRef.current);
            dragTimeoutRef.current = null;
        }
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFilesSelect(e.dataTransfer.files);
        }
    }, [onFilesSelect]);

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            onFilesSelect(event.target.files);
        }
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (dragTimeoutRef.current) {
                clearTimeout(dragTimeoutRef.current);
            }
        };
    }, []);

    return (
        <div
            className={compact
                ? 'w-full flex items-start justify-center px-4 py-8 sm:px-6 sm:py-10 relative'
                : 'flex-grow h-full flex items-center justify-center px-4 py-8 sm:p-8 relative'}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {/* Full-screen professional drag overlay */}
            {isDragging && (
                <div className="fixed top-16 inset-x-0 bottom-0 bg-gray-900/95 backdrop-blur-md flex items-center justify-center z-[9999] pointer-events-none">
                    <div className="text-center">
                        <div className="mb-6">
                            <div className="w-32 h-32 mx-auto bg-brand-blue-500/20 rounded-full flex items-center justify-center">
                                <Plus className="w-16 h-16 text-brand-blue-400" />
                            </div>
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
                            Drop {multiple ? 'PDFs' : 'PDF'} here
                        </h2>
                        <p className="text-base sm:text-xl text-gray-300">
                            Release to upload
                        </p>
                    </div>
                </div>
            )}

            <div className={compact ? 'w-full max-w-3xl text-center' : 'text-center'}>
                <h1 className={compact ? 'text-3xl sm:text-4xl font-bold text-gray-800' : 'text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-800'}>{title}</h1>
                <p className={compact ? 'mt-3 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto' : 'mt-4 text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto'}>
                    {description}
                </p>
                <div className={compact ? 'mt-8' : 'mt-8 sm:mt-10'}>
                    <button
                        onClick={handleButtonClick}
                        className={compact
                            ? 'w-full sm:w-auto bg-brand-blue-600 text-white font-bold py-3.5 px-6 sm:px-8 rounded-lg hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-500 transition-all duration-200 shadow-sm hover:shadow-md text-base sm:text-lg inline-flex items-center justify-center'
                            : 'w-full sm:w-auto bg-brand-blue-600 text-white font-bold py-3.5 sm:py-4 px-6 sm:px-10 rounded-lg hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl text-lg sm:text-xl inline-flex items-center justify-center'}
                    >
                        <Plus className="h-6 w-6 mr-3" />
                        {buttonLabel ?? (multiple ? 'Select PDF Files' : 'Select PDF File')}
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept={accept}
                        multiple={multiple}
                    />
                </div>
                <p className="mt-4 text-sm sm:text-base text-gray-500">{dropLabel ?? `or drop ${multiple ? 'PDFs' : 'PDF'} here`}</p>

                {trustPoints && trustPoints.length > 0 && (
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                        {trustPoints.map((point) => (
                            <span
                                key={point}
                                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm"
                            >
                                <CheckCircle2 className="h-3.5 w-3.5 text-brand-blue-600" />
                                {point}
                            </span>
                        ))}
                    </div>
                )}

                {/* Bookmark and Share CTAs */}
                <ToolCTAs variant="hero" />
            </div>
        </div>
    );
};

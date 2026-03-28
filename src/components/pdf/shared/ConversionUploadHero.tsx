import React from 'react';
import { Plus } from 'lucide-react';
import { ToolCTAs } from './ToolCTAs';

interface ConversionUploadHeroProps {
    fileInputRef: React.RefObject<HTMLInputElement>;
    dragOver: boolean;
    onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDropZoneClick: () => void;
    onFileDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onFileDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
    onFileDrop: (e: React.DragEvent<HTMLDivElement>) => void;
    title: string;
    description: string;
    accept: string;
    buttonText: string;
}

export const ConversionUploadHero: React.FC<ConversionUploadHeroProps> = ({
    fileInputRef,
    dragOver,
    onFileInputChange,
    onDropZoneClick,
    onFileDragOver,
    onFileDragLeave,
    onFileDrop,
    title,
    description,
    accept,
    buttonText
}) => {
    return (
        <div
            className="flex-grow flex items-center justify-center p-8"
            onDragEnter={onFileDragOver}
            onDragLeave={onFileDragLeave}
            onDragOver={onFileDragOver}
            onDrop={onFileDrop}
        >
            <div className={`text-center transition-transform duration-300 ${dragOver ? 'scale-105' : ''}`}>
                <div className={`p-10 rounded-xl transition-all duration-300 ${dragOver ? 'bg-brand-blue-50 ring-4 ring-brand-blue-200' : ''}`}>
                    <h1 className="text-5xl font-bold text-gray-800">{title}</h1>
                    <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
                        {description}
                    </p>
                    <div className="mt-10">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={onFileInputChange}
                            className="hidden"
                            accept={accept}
                            multiple
                        />
                        <button
                            onClick={onDropZoneClick}
                            className="bg-brand-blue-600 text-white font-bold py-4 px-10 rounded-lg hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl text-xl inline-flex items-center justify-center"
                            aria-label={buttonText}
                        >
                            <Plus className="h-6 w-6 mr-3" />
                            {buttonText}
                        </button>
                    </div>
                    <p className="mt-4 text-gray-500">or drop files here</p>
                    <ToolCTAs variant="hero" />
                </div>
            </div>
        </div>
    );
};

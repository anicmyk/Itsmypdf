import React from 'react';
import { ArrowRight, CheckCircle2, ChevronDown, FileText, Gauge, Upload } from 'lucide-react';
import { PdfUploadHero } from '../shared/PdfUploadHero';
import {
    COMPRESS_PDF_BEST_RESULTS,
    COMPRESS_PDF_FAQ,
    COMPRESS_PDF_OVERVIEW,
    COMPRESS_PDF_RELATED_TOOLS,
    COMPRESS_PDF_STEPS,
    COMPRESS_PDF_TARGET_NOTE,
    COMPRESS_PDF_EXPECTATIONS,
    COMPRESS_PDF_TRUST_POINTS
} from '@/lib/compressPdfPageData';

interface CompressPdfEmptyStateProps {
    onFilesSelect: (files: FileList) => void;
    title: string;
    description: string;
    accept: string;
    multiple: boolean;
}

export const CompressPdfEmptyState: React.FC<CompressPdfEmptyStateProps> = ({
    onFilesSelect,
    title,
    description,
    accept,
    multiple
}) => {
    return (
        <div className="flex h-full flex-col overflow-y-auto bg-gray-50 font-sans">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">
                <PdfUploadHero
                    onFilesSelect={onFilesSelect}
                    title={title}
                    description={description}
                    accept={accept}
                    multiple={multiple}
                    buttonLabel="Select PDF files"
                    dropLabel="or drop PDFs here"
                    trustPoints={COMPRESS_PDF_TRUST_POINTS}
                    compact
                />

                <section className="mt-10 overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
                        <div className="p-6 md:p-7">
                            <div className="flex items-center gap-2 text-gray-900">
                                <FileText className="h-4 w-4 text-brand-blue-600" />
                                <h2 className="text-lg font-semibold">{COMPRESS_PDF_OVERVIEW.title}</h2>
                            </div>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-700">
                                {COMPRESS_PDF_OVERVIEW.intro}
                            </p>

                            <div className="mt-6 space-y-4">
                                {COMPRESS_PDF_OVERVIEW.points.map((item) => (
                                    <div key={item.title} className="flex gap-3">
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-brand-blue-600" />
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
                                            <p className="mt-1 text-sm leading-6 text-gray-700">{item.body}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-gray-200 bg-gray-50/70 p-6 md:p-7 lg:border-l lg:border-t-0">
                            <div className="flex items-center gap-2 text-gray-900">
                                <Gauge className="h-4 w-4 text-brand-blue-600" />
                                <h2 className="text-lg font-semibold">What to expect</h2>
                            </div>
                            <ul className="mt-5 space-y-3">
                                {COMPRESS_PDF_EXPECTATIONS.map((item) => (
                                    <li key={item} className="flex gap-3 text-sm leading-6 text-gray-700">
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-brand-blue-600" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
                                <p className="text-sm font-semibold text-gray-900">{COMPRESS_PDF_TARGET_NOTE.title}</p>
                                <p className="mt-2 text-sm leading-6 text-gray-700">{COMPRESS_PDF_TARGET_NOTE.body}</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mt-10">
                    <div className="flex items-center gap-2 text-gray-900">
                        <Upload className="h-4 w-4 text-brand-blue-600" />
                        <h2 className="text-lg font-semibold">How to compress a PDF online</h2>
                    </div>
                    <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
                        {COMPRESS_PDF_STEPS.map((step, index) => (
                            <div
                                key={step}
                                className={`flex gap-4 px-5 py-4 ${index < COMPRESS_PDF_STEPS.length - 1 ? 'border-b border-gray-200' : ''}`}
                            >
                                <span className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-900">
                                    {index + 1}
                                </span>
                                <p className="text-sm leading-6 text-gray-700">{step}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mt-10 rounded-xl border border-gray-200 bg-white p-6 md:p-7">
                    <div className="flex items-center gap-2 text-gray-900">
                        <ArrowRight className="h-4 w-4 text-brand-blue-600" />
                        <h2 className="text-lg font-semibold">Can I compress a PDF to 500KB or 1MB?</h2>
                    </div>
                    <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-700">
                        {COMPRESS_PDF_TARGET_NOTE.body}
                    </p>

                    <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <p className="text-sm font-semibold text-gray-900">When compression works best</p>
                            <ul className="mt-3 space-y-3">
                                {COMPRESS_PDF_BEST_RESULTS.map((item) => (
                                    <li key={item.title} className="flex gap-3 text-sm leading-6 text-gray-700">
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-brand-blue-600" />
                                        <span>
                                            <span className="font-medium text-gray-900">{item.title}:</span> {item.body}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                            <p className="text-sm font-semibold text-gray-900">A simple rule of thumb</p>
                            <p className="mt-2 text-sm leading-6 text-gray-700">
                                Start with balanced compression. It is usually the safest mix of smaller file size and predictable quality.
                                If the PDF is a scan or a slide deck, stronger settings may help more. If it is mostly text, the gains will usually be modest.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="mt-10">
                    <div className="flex items-center gap-2 text-gray-900">
                        <ArrowRight className="h-4 w-4 text-brand-blue-600" />
                        <h2 className="text-lg font-semibold">Frequently asked questions</h2>
                    </div>
                    <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
                        {COMPRESS_PDF_FAQ.map((item, index) => (
                            <details
                                key={item.question}
                                className={`group ${index < COMPRESS_PDF_FAQ.length - 1 ? 'border-b border-gray-200' : ''}`}
                            >
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left">
                                    <span className="text-sm font-medium text-gray-900">{item.question}</span>
                                    <ChevronDown className="h-4 w-4 flex-none text-gray-400 transition-transform duration-200 group-open:rotate-180" />
                                </summary>
                                <div className="px-5 pb-4 text-sm leading-6 text-gray-700">
                                    {item.answer}
                                </div>
                            </details>
                        ))}
                    </div>
                </section>

                <section className="mt-10">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Related tools</h2>
                            <p className="mt-1 text-sm text-gray-600">
                                Useful when you want to split, merge, trim, or convert a PDF before sharing it.
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        {COMPRESS_PDF_RELATED_TOOLS.map((tool) => (
                            <a
                                key={tool.href}
                                href={tool.href}
                                className="group rounded-lg border border-gray-200 bg-white p-4 text-left transition-colors hover:border-brand-blue-200 hover:bg-gray-50"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">{tool.title}</p>
                                        <p className="mt-1 text-sm leading-6 text-gray-600">{tool.body}</p>
                                    </div>
                                    <ArrowRight className="mt-0.5 h-4 w-4 flex-none text-gray-400 transition-colors group-hover:text-brand-blue-600" />
                                </div>
                                <span className="mt-3 block text-sm font-medium text-brand-blue-600">{tool.cta}</span>
                            </a>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

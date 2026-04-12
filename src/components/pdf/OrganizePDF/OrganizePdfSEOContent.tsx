import React from 'react';
import { ArrowRight, CheckCircle2, ChevronDown, FileText, MoveHorizontal, RotateCw } from 'lucide-react';
import {
  ORGANIZE_PDF_EXPECTATIONS,
  ORGANIZE_PDF_FAQ,
  ORGANIZE_PDF_OVERVIEW,
  ORGANIZE_PDF_RELATED_TOOLS,
  ORGANIZE_PDF_STEPS,
  ORGANIZE_PDF_USE_CASES
} from '@/lib/organizePdfPageData';

const OrganizePdfSEOContent: React.FC = () => {
  return (
    <div className="w-full bg-white border-t border-gray-200 flex-shrink-0">
      <div className="max-w-5xl mx-auto px-4 py-12 md:px-6 md:py-16 text-gray-800">
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="p-6 md:p-7">
              <div className="flex items-center gap-2 text-gray-900">
                <FileText className="h-4 w-4 text-brand-blue-600" />
                <h2 className="text-lg font-semibold">{ORGANIZE_PDF_OVERVIEW.title}</h2>
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-700">
                {ORGANIZE_PDF_OVERVIEW.intro}
              </p>

              <div className="mt-6 space-y-4">
                {ORGANIZE_PDF_OVERVIEW.points.map((item) => (
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
                <MoveHorizontal className="h-4 w-4 text-brand-blue-600" />
                <h2 className="text-lg font-semibold">What to expect</h2>
              </div>
              <ul className="mt-5 space-y-3">
                {ORGANIZE_PDF_EXPECTATIONS.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-gray-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-brand-blue-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm font-semibold text-gray-900">When page order matters most</p>
                <p className="mt-2 text-sm leading-6 text-gray-700">
                  The right order matters when you are fixing a scan, cleaning up a merge, preparing a file to share, or getting a document ready to print.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-center gap-2 text-gray-900">
            <RotateCw className="h-4 w-4 text-brand-blue-600" />
            <h2 className="text-lg font-semibold">How to organize a PDF online</h2>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
            {ORGANIZE_PDF_STEPS.map((step, index) => (
              <div
                key={step}
                className={`flex gap-4 px-5 py-4 ${index < ORGANIZE_PDF_STEPS.length - 1 ? 'border-b border-gray-200' : ''}`}
              >
                <span className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-900">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-gray-700">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-center gap-2 text-gray-900">
            <ArrowRight className="h-4 w-4 text-brand-blue-600" />
            <h2 className="text-lg font-semibold">When people use a PDF organizer</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {ORGANIZE_PDF_USE_CASES.map((item) => (
              <article key={item.title} className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-700">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-center gap-2 text-gray-900">
            <ChevronDown className="h-4 w-4 text-brand-blue-600" />
            <h2 className="text-lg font-semibold">Frequently asked questions</h2>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
            {ORGANIZE_PDF_FAQ.map((item, index) => (
              <details
                key={item.question}
                className={`group ${index < ORGANIZE_PDF_FAQ.length - 1 ? 'border-b border-gray-200' : ''}`}
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
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Related tools</h2>
            <p className="mt-1 text-sm text-gray-600">
              Helpful if you want to split, merge, trim, or convert a PDF before you finish organizing it.
            </p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ORGANIZE_PDF_RELATED_TOOLS.map((tool) => (
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

export default OrganizePdfSEOContent;

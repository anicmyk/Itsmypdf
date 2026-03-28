import React from 'react';
import { CheckCircle, XCircle, Minus, ArrowRight } from 'lucide-react';

/**
 * SEO content for the Merge PDF tool page.
 * ~800 words, E-E-A-T structured, schema-ready FAQ.
 */
const MergePDFSEOContent: React.FC = () => {
    return (
        <div className="bg-white border-t border-gray-200">
            <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">

                {/* ── H2: Main keyword heading ── */}
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 leading-tight">
                    How to Merge PDF No Upload in 2026 &mdash; 100% Private &amp; Free
                </h2>

                {/* ── Intro ── */}
                <p className="text-gray-600 text-base leading-relaxed mb-8">
                    Every time you drag a PDF into an online merger, that file quietly travels to a remote server. Your contracts, medical records, or financial statements
                    sit on infrastructure you do not control. I built{' '}
                    <strong className="text-gray-900">itsmypdf.com/merge-pdf</strong> so every file stays 100% on your device &mdash; no uploads, no
                    accounts, no cloud processing. The entire merge happens right here in your browser, using JavaScript that runs locally. Your documents never leave
                    your machine.
                </p>

                {/* ── Step-by-step guide ── */}
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Step-by-Step: Merge PDFs Without Uploading
                </h3>

                <ol className="space-y-5 mb-10">
                    {[
                        {
                            title: 'Open the Merge PDF tool',
                            desc: 'Navigate to itsmypdf.com/merge-pdf. No sign-up required \u2014 the tool loads instantly in any modern browser.',
                            imgPrompt: 'Screenshot of the itsmypdf merge PDF upload hero screen. Clean white background, blue accent Upload button centered, minimal UI, sans-serif font. Matches itsmypdf.com blue-and-white clean theme.',
                        },
                        {
                            title: 'Drag and drop your PDF files',
                            desc: 'Drop two or more PDF files onto the upload area, or click "Add PDF files" to browse. Each file loads a page-one thumbnail preview instantly.',
                            imgPrompt: 'Screenshot showing 3 PDF thumbnail cards in a grid on the itsmypdf merge tool. Each card shows page 1 preview with filename below. Clean gray-100 background, rounded-lg cards, blue action buttons. White UI, no stock imagery.',
                        },
                        {
                            title: 'Reorder by dragging',
                            desc: 'Grab any PDF card and drag it to a new position. A blue drop indicator shows exactly where the file will land. The order you see is the order in the final merged file.',
                            imgPrompt: 'GIF-style frame of a PDF card being dragged between two other cards on itsmypdf. Blue vertical drop indicator line visible. Clean gray background, rounded cards, minimal style matching itsmypdf.com design.',
                        },
                        {
                            title: 'Rotate pages if needed',
                            desc: 'Click the rotate button on any PDF card to fix landscape or upside-down pages before merging. Each click rotates the document 90 degrees.',
                            imgPrompt: 'Screenshot of a single PDF card on itsmypdf with the blue rotate button highlighted in the top-right corner. Shows rotation icon (RotateCw). Clean white card, blue accent, gray-100 background.',
                        },
                        {
                            title: 'Sort your files',
                            desc: 'Use the "Sort PDFs" dropdown in the sidebar to quickly organize files by name, date, page count, or file size \u2014 especially useful when merging large batches.',
                            imgPrompt: 'Screenshot of the itsmypdf sidebar showing the Sort PDFs dropdown expanded, with options: Sort by name, Sort by date added, Sort by page count, Sort by file size. Clean white sidebar, gray text, blue heading accent.',
                        },
                        {
                            title: 'Click "Merge PDF"',
                            desc: 'Hit the large Merge PDF button at the bottom of the sidebar. The progress bar fills as each file is combined. Your merged PDF downloads automatically \u2014 zero upload, zero wait.',
                            imgPrompt: 'Screenshot of the itsmypdf sidebar bottom section with a large blue "Merge PDF" button and a progress bar at 75%. Clean white sidebar, blue-600 button color, rounded-xl corners. Matches itsmypdf.com brand.',
                        },
                    ].map((step, i) => (
                        <li key={i} className="flex gap-4">
                            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center mt-0.5">
                                {i + 1}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 text-base mb-1">{step.title}</h4>
                                <p className="text-gray-600 text-sm leading-relaxed">{step.desc}</p>
                                {/* Image placeholder */}
                                <div className="mt-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-xs text-gray-400 italic">
                                    <span className="text-gray-500 font-medium not-italic">[Screenshot]</span>{' '}
                                    {step.imgPrompt}
                                </div>
                            </div>
                        </li>
                    ))}
                </ol>

                {/* ── Comparison table ── */}
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                    How itsmypdf Compares
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                    See how our <strong className="text-gray-800">merge PDF without uploading</strong> approach stacks up against the most popular alternatives.
                </p>

                <div className="overflow-x-auto mb-10">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="border-b-2 border-gray-200">
                                <th className="text-left py-3 pr-4 font-semibold text-gray-900">Feature</th>
                                <th className="text-center py-3 px-4 font-semibold text-blue-600">itsmypdf</th>
                                <th className="text-center py-3 px-4 font-semibold text-gray-600">iLovePDF</th>
                                <th className="text-center py-3 px-4 font-semibold text-gray-600">Smallpdf</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700">
                            {[
                                { feature: 'No file upload', itsmypdf: true, ilovepdf: false, smallpdf: false },
                                { feature: '100% browser-based', itsmypdf: true, ilovepdf: false, smallpdf: false },
                                { feature: 'Free &mdash; no limits', itsmypdf: true, ilovepdf: 'partial', smallpdf: false },
                                { feature: 'No account required', itsmypdf: true, ilovepdf: true, smallpdf: false },
                                { feature: 'Drag-to-reorder', itsmypdf: true, ilovepdf: true, smallpdf: true },
                                { feature: 'Rotate before merge', itsmypdf: true, ilovepdf: false, smallpdf: false },
                                { feature: 'Works offline', itsmypdf: true, ilovepdf: false, smallpdf: false },
                            ].map((row, i) => (
                                <tr key={i} className="border-b border-gray-100">
                                    <td className="py-2.5 pr-4" dangerouslySetInnerHTML={{ __html: row.feature }} />
                                    <td className="py-2.5 px-4 text-center">
                                        {row.itsmypdf === true ? <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /> :
                                            row.itsmypdf === false ? <XCircle className="w-4 h-4 text-red-400 mx-auto" /> :
                                                <Minus className="w-4 h-4 text-gray-400 mx-auto" />}
                                    </td>
                                    <td className="py-2.5 px-4 text-center">
                                        {row.ilovepdf === true ? <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /> :
                                            row.ilovepdf === false ? <XCircle className="w-4 h-4 text-red-400 mx-auto" /> :
                                                <Minus className="w-4 h-4 text-amber-400 mx-auto" />}
                                    </td>
                                    <td className="py-2.5 px-4 text-center">
                                        {row.smallpdf === true ? <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /> :
                                            row.smallpdf === false ? <XCircle className="w-4 h-4 text-red-400 mx-auto" /> :
                                                <Minus className="w-4 h-4 text-amber-400 mx-auto" />}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ── Real user scenarios ── */}
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Who Uses This &mdash; Real Scenarios
                </h3>

                <div className="space-y-4 mb-10">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                        <h4 className="font-semibold text-gray-900 text-sm mb-1">Freelancer merging contracts</h4>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            You have an NDA, a scope-of-work, and an invoice &mdash; three separate PDFs that need to go to one client as a single file.
                            With itsmypdf, you drop all three, drag them into the right order, and download one clean document. No sensitive contract data ever touches
                            a third-party server.
                        </p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                        <h4 className="font-semibold text-gray-900 text-sm mb-1">Student combining lecture notes</h4>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Finals week. You have 12 weeks of PDF lecture slides. Instead of flipping between files, merge them into one scrollable document.
                            Sort by name to get them in chronological order automatically.
                        </p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                        <h4 className="font-semibold text-gray-900 text-sm mb-1">Office worker organizing reports</h4>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Monthly reports from four departments, each exported as a separate PDF. Merge them into one file, rotate the landscape chart that
                            accounting always exports sideways, and send a polished single document to your manager &mdash; all without IT approving a new SaaS tool.
                        </p>
                    </div>
                </div>

                {/* ── FAQ (schema-ready) ── */}
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Frequently Asked Questions
                </h3>

                <div className="space-y-4 mb-10" itemScope itemType="https://schema.org/FAQPage">
                    {[
                        {
                            q: 'Is itsmypdf really free to merge PDFs?',
                            a: 'Yes. There are no limits, no watermarks, and no premium tiers. Every tool on itsmypdf is completely free.',
                        },
                        {
                            q: 'Do my files get uploaded to a server?',
                            a: 'No. All processing happens in your browser using client-side JavaScript. Your files never leave your device.',
                        },
                        {
                            q: 'Is there a file size limit?',
                            a: 'Most browsers handle files up to 50 MB comfortably. For very large files, we recommend splitting them first with our Split PDF tool, then merging the parts you need.',
                        },
                        {
                            q: 'Can I merge more than two PDFs at once?',
                            a: 'Absolutely. Drop as many PDFs as you want. Use drag-and-drop to reorder, or the Sort button to organize by name, date, page count, or file size.',
                        },
                        {
                            q: 'Does the merge tool work on mobile?',
                            a: 'Yes. itsmypdf is fully responsive. On mobile you get the same upload, reorder, and merge experience with touch-friendly controls.',
                        },
                        {
                            q: 'Can I rotate a PDF before merging?',
                            a: 'Yes. Click the rotate icon on any PDF card to rotate it 90 degrees. This is especially useful for landscape pages or scans that need to be straightened.',
                        },
                    ].map((faq, i) => (
                        <details
                            key={i}
                            className="group border border-gray-200 rounded-lg overflow-hidden"
                            itemScope
                            itemProp="mainEntity"
                            itemType="https://schema.org/Question"
                        >
                            <summary className="flex items-center justify-between cursor-pointer px-5 py-3.5 text-sm font-medium text-gray-900 hover:bg-gray-50 transition select-none list-none">
                                <span itemProp="name">{faq.q}</span>
                                <span className="text-gray-400 group-open:rotate-45 transition-transform text-lg font-light">+</span>
                            </summary>
                            <div
                                className="px-5 pb-4 text-sm text-gray-600 leading-relaxed"
                                itemScope
                                itemProp="acceptedAnswer"
                                itemType="https://schema.org/Answer"
                            >
                                <p itemProp="text">{faq.a}</p>
                            </div>
                        </details>
                    ))}
                </div>

                {/* ── Internal links + CTA ── */}
                <div className="border-t border-gray-200 pt-8">
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">
                        Need to do more with your PDFs? Try our{' '}
                        <a href="/compress-pdf" className="text-blue-600 hover:text-blue-700 font-medium">Compress PDF</a> tool to shrink file sizes, or{' '}
                        <a href="/split-pdf" className="text-blue-600 hover:text-blue-700 font-medium">Split PDF</a> to extract specific pages. Every tool
                        works the same way &mdash; privately in your browser, no uploads, no accounts.
                    </p>
                    <p className="text-gray-800 font-semibold text-sm mb-5">
                        Everything on itsmypdf is completely free. No hidden costs, ever.
                    </p>
                    <button
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition shadow-sm"
                    >
                        Merge your PDFs now
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </article>
        </div>
    );
};

export default MergePDFSEOContent;

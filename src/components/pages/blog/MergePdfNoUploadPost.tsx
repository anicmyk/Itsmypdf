import {
    ArrowRight,
    CheckCircle,
    ChevronRight,
    Shield,
    Clock,
    User,
    Zap,
    FileText,
    Briefcase,
    GraduationCap,
    Building2,
    Lock,
    Wifi,
    Globe,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Blog Post: How to Merge PDF No Upload                              */
/*  ~2,000 words | 12 sections | E-E-A-T + Helpful Content format      */
/* ------------------------------------------------------------------ */

export default function MergePdfNoUploadPost() {
    return (
            

            <div className="min-h-screen bg-white">

                {/* ──────────────────────────────────────────────────────────── */}
                {/* 1. HERO                                                      */}
                {/* ──────────────────────────────────────────────────────────── */}
                <div className="border-b border-gray-100">
                    <nav className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-1.5 text-xs text-gray-400">
                        <a href="/" className="hover:text-gray-600 transition">Home</a>
                        <ChevronRight className="w-3 h-3" />
                        <a href="/blog" className="hover:text-gray-600 transition">Blog</a>
                        <ChevronRight className="w-3 h-3" />
                        <span className="text-gray-600 font-medium">Merge PDF No Upload</span>
                    </nav>
                </div>

                <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">

                    {/* Meta row */}
                    <header className="mb-10">
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium border border-blue-100">
                                <Shield className="w-3 h-3" />
                                How-to Guide
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                8 min read
                            </span>
                            <span>Feb 28, 2026</span>
                        </div>

                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">
                            How to Merge PDF No Upload &ndash; 100% Private &amp; Free
                        </h1>
                        <p className="text-gray-500 text-base sm:text-lg leading-relaxed">
                            A step-by-step guide to combining multiple PDF files entirely in your browser, without uploading a single page to any server.
                        </p>

                        {/* Hero illustration */}
                        <div className="mt-8 rounded-xl overflow-hidden border border-gray-200">
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 h-52 sm:h-72 flex items-center justify-center relative">
                                <div className="absolute inset-0 opacity-[0.12]">
                                    <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white" />
                                    <div className="absolute bottom-6 -left-6 w-24 h-24 rounded-full bg-white" />
                                </div>
                                <div className="relative flex flex-col items-center gap-3 text-white select-none">
                                    <div className="flex gap-2.5">
                                        <div className="w-11 h-14 rounded-md bg-white/90 shadow-sm flex items-center justify-center">
                                            <FileText className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <div className="w-11 h-14 rounded-md bg-white/90 shadow-sm flex items-center justify-center">
                                            <FileText className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <div className="w-11 h-14 rounded-md bg-white/90 shadow-sm flex items-center justify-center">
                                            <FileText className="w-4 h-4 text-blue-400" />
                                        </div>
                                    </div>
                                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="text-white/70">
                                        <path d="M8 3v10M5 10l3 3 3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <div className="w-14 h-[72px] rounded-md bg-white shadow-lg flex items-center justify-center">
                                        <FileText className="w-5 h-5 text-blue-600" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* ──────────────────────────────────────────────────────────── */}
                    {/* 2. INTRO                                                     */}
                    {/* ──────────────────────────────────────────────────────────── */}
                    <section className="space-y-4 text-gray-700 text-[15px] leading-relaxed mb-10">
                        <p>
                            Every time you use a typical online PDF tool, your files take a quiet trip to a remote server. Your contracts,
                            tax returns, medical records, and personal documents sit on infrastructure you do not control. In 2026, with
                            data breaches making headlines weekly and privacy regulations tightening across every industry, that is a risk
                            worth thinking twice about.
                        </p>
                        <p>
                            I built <strong>itsmypdf</strong> because I was tired of uploading sensitive documents just to combine two
                            files. Every tool on the site processes files locally in your browser using client-side JavaScript &mdash; no
                            uploads, no tracking, no cost. The{' '}
                            <a href="/merge-pdf" className="text-blue-600 hover:text-blue-700 font-medium">Merge PDF</a> tool is no
                            exception: it lets you <strong>merge PDF files without uploading</strong> anything, anywhere, on any device.
                        </p>
                        <p>
                            Below is a complete, step-by-step walkthrough of how to <strong>merge PDF no upload</strong> using itsmypdf,
                            along with real-world scenarios where this matters most and answers to the questions people ask most often.
                        </p>
                    </section>

                    {/* ──────────────────────────────────────────────────────────── */}
                    {/* 3. CTA BANNER                                                */}
                    {/* ──────────────────────────────────────────────────────────── */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-12">
                        <div className="flex-1">
                            <p className="font-semibold text-gray-900 text-sm mb-0.5">Ready to merge?</p>
                            <p className="text-xs text-gray-500">Jump straight to the tool &mdash; no sign-up, no upload.</p>
                        </div>
                        <a
                            href="/merge-pdf"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition shadow-sm shrink-0"
                        >
                            Open Merge PDF
                            <ArrowRight className="w-4 h-4" />
                        </a>
                    </div>

                    {/* ──────────────────────────────────────────────────────────── */}
                    {/* 4. EIGHT NUMBERED STEPS                                      */}
                    {/* ──────────────────────────────────────────────────────────── */}
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                        Step-by-Step: Combine PDFs Without Uploading
                    </h2>

                    <p className="text-gray-600 text-sm mb-8 leading-relaxed">
                        The entire process takes under a minute. Here is exactly how the <strong>no upload PDF merge tool</strong> works,
                        from start to finish.
                    </p>

                    <ol className="space-y-6 mb-12">
                        {[
                            {
                                title: 'Open the Merge PDF page',
                                body: 'Head to the itsmypdf Merge PDF page. The tool loads instantly in any modern browser \u2014 Chrome, Firefox, Safari, or Edge. There is nothing to download, no extension to install, and no account to create. The clean upload area appears the moment the page renders, ready for your files.',
                            },
                            {
                                title: 'Drop your PDF files',
                                body: 'Drag two or more PDF documents from your desktop or file manager directly onto the drop zone. You can also click the upload button to browse your device manually. Each file immediately generates a page-one thumbnail preview so you can visually confirm you have the right documents. Since this is a genuine browser only PDF merger, all file parsing happens locally in your browser \u2014 no network request is made at any point during this step.',
                            },
                            {
                                title: 'Reorder by dragging',
                                body: 'The order of your files matters because the final merged document follows the exact sequence you set. Click and hold any PDF card, then drag it to a new position in the grid. A blue vertical indicator appears between cards, showing you precisely where the file will land when you release. This makes it easy to arrange chapters, sections, or pages in exactly the order you want \u2014 no guessing required.',
                            },
                            {
                                title: 'Rotate pages if needed',
                                body: 'Sometimes a scanned document comes in sideways, or a chart is oriented in landscape when the rest of your files are portrait. Click the rotate icon on that PDF card and the entire document rotates 90 degrees per click. You can rotate as many times as needed to get the correct orientation. This feature is built directly into the merger, so there is no need to open a separate tool or re-export anything.',
                            },
                            {
                                title: 'Sort files automatically',
                                body: 'When you are working with a large batch of files \u2014 say, twelve weeks of lecture slides or a stack of monthly invoices \u2014 manual dragging becomes tedious. That is where the Sort button comes in. Open the \u201CSort PDFs\u201D dropdown in the sidebar and choose to organize by filename, date added, page count, or file size. The grid instantly rearranges. Sorting by name is especially useful when your files are named sequentially, letting you merge multiple PDFs no upload in perfect chronological order with a single click.',
                            },
                            {
                                title: 'Review the sidebar',
                                body: 'The sidebar on the right side of the screen serves as your control panel. It displays the current file count, lets you add more PDFs to the batch at any time, and shows context-sensitive tips. If you have only uploaded one file, it reminds you to add at least one more before merging. With two or more files loaded, it confirms you are ready to proceed. The sidebar also houses the sort controls and the main merge action button.',
                            },
                            {
                                title: 'Click \u201CMerge PDF\u201D',
                                body: 'When you are satisfied with the order and orientation of every file, hit the large blue Merge PDF button at the bottom of the sidebar. A progress bar fills in real time, showing you exactly how far along the operation is. Because this is a true client-side PDF merge, every byte of processing happens right inside your browser. The JavaScript reads your files from local memory, combines them using pdf-lib, and generates the result without making a single network request. Even if your internet connection drops mid-merge, the operation still completes.',
                            },
                            {
                                title: 'Download the result',
                                body: 'Once the progress bar reaches 100%, the merged PDF downloads automatically as a file called \u201Cmerged.pdf.\u201D You can rename it to anything you like. Your original source files remain completely untouched on your device \u2014 they are never modified, never copied to a server, and never stored anywhere beyond your own machine. The entire process is finished.',
                            },
                        ].map((step, i) => (
                            <li key={i} className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center mt-0.5">
                                    {i + 1}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900 text-base mb-1.5">{step.title}</h3>
                                    <p className="text-gray-600 text-sm leading-relaxed">{step.body}</p>
                                </div>
                            </li>
                        ))}
                    </ol>

                    {/* ──────────────────────────────────────────────────────────── */}
                    {/* 5. PRO TIPS                                                  */}
                    {/* ──────────────────────────────────────────────────────────── */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 sm:p-6 mb-12">
                        <h3 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-blue-600" />
                            Pro tips for faster merging
                        </h3>
                        <ul className="space-y-2.5 text-sm text-gray-600">
                            <li className="flex items-start gap-2.5">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                <span>You can keep adding files after the first batch &mdash; click <strong>&ldquo;Add PDF files&rdquo;</strong> as many times as you need without losing your current queue.</span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                <span>Made a mistake? Click the <strong>X</strong> button on any card to remove that file instantly. No need to start the entire process from scratch.</span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                <span>After merging, run the result through <a href="/compress-pdf" className="text-blue-600 hover:text-blue-700 font-medium">Compress PDF</a> to shrink the file size for email attachments &mdash; same privacy, same speed, same browser-only approach.</span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                <span>Need to extract specific pages from the merged file later? Use <a href="/split-pdf" className="text-blue-600 hover:text-blue-700 font-medium">Split PDF</a> to pull out exactly the pages you need.</span>
                            </li>
                        </ul>
                    </div>

                    {/* ──────────────────────────────────────────────────────────── */}
                    {/* 6. WHAT MAKES ITSMYPDF DIFFERENT                             */}
                    {/* ──────────────────────────────────────────────────────────── */}
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        What Makes This Tool Different
                    </h2>

                    <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                        Most online PDF tools follow the same pattern: upload your files to a server, wait for processing, then download the result.
                        itsmypdf takes a completely different approach. Here is what sets this <strong>private PDF merger online</strong> apart.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
                        <div className="border border-gray-200 rounded-xl p-5">
                            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
                                <Lock className="w-4 h-4 text-blue-600" />
                            </div>
                            <h3 className="font-semibold text-gray-900 text-sm mb-1.5">Zero uploads</h3>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                Every file stays on your device. The JavaScript running in your browser reads, processes, and outputs the merged PDF without
                                making a single network request. Your documents never touch any external server.
                            </p>
                        </div>
                        <div className="border border-gray-200 rounded-xl p-5">
                            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center mb-3">
                                <Zap className="w-4 h-4 text-emerald-600" />
                            </div>
                            <h3 className="font-semibold text-gray-900 text-sm mb-1.5">Instant processing</h3>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                No upload means no waiting for a server response. Files are merged in seconds, limited only by your device&rsquo;s processing
                                power. There is no queue, no delay, and no dependency on internet speed.
                            </p>
                        </div>
                        <div className="border border-gray-200 rounded-xl p-5">
                            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
                                <Wifi className="w-4 h-4 text-amber-600" />
                            </div>
                            <h3 className="font-semibold text-gray-900 text-sm mb-1.5">Works offline</h3>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                Once the page has loaded, you can disconnect from the internet entirely. The merge will still work because the processing engine
                                runs locally. This is especially useful on flights, in areas with poor connectivity, or on restricted networks.
                            </p>
                        </div>
                    </div>

                    {/* ──────────────────────────────────────────────────────────── */}
                    {/* 7. THREE REAL-WORLD SCENARIOS                                */}
                    {/* ──────────────────────────────────────────────────────────── */}
                    <h2 className="text-2xl font-bold text-gray-900 mb-5">
                        Real-World Scenarios
                    </h2>
                    <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                        Who actually needs to <strong>combine PDF no upload</strong>? More people than you might think. Here are three
                        common situations where a <strong>browser only PDF merger</strong> is the smartest choice.
                    </p>

                    <div className="space-y-5 mb-12">
                        <div className="border border-gray-200 rounded-xl p-5 sm:p-6">
                            <div className="flex items-center gap-2.5 mb-2">
                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                                    <Briefcase className="w-4 h-4 text-blue-600" />
                                </div>
                                <h3 className="font-semibold text-gray-900 text-sm">Freelancer merging contracts</h3>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                You have an NDA, a scope-of-work document, and a final invoice &mdash; three separate PDFs that need to reach
                                your client as one clean email attachment. These documents contain sensitive financial terms, personal details,
                                and legally binding clauses. Using itsmypdf&rsquo;s <strong>no upload PDF merge tool</strong>, you drop all
                                three files into the browser, drag them into the correct order, and download a single merged document in under
                                thirty seconds. Every byte of data stays on your laptop. No server, no risk, no second thoughts about where
                                your contracts might end up.
                            </p>
                        </div>

                        <div className="border border-gray-200 rounded-xl p-5 sm:p-6">
                            <div className="flex items-center gap-2.5 mb-2">
                                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                                    <GraduationCap className="w-4 h-4 text-emerald-600" />
                                </div>
                                <h3 className="font-semibold text-gray-900 text-sm">Student combining lecture notes</h3>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Finals are approaching and you have twelve weeks of PDF lecture slides scattered across a downloads folder.
                                Switching between a dozen files while studying wastes time and mental energy that should go toward the actual
                                material. Using the <strong>free PDF merger browser only</strong> approach, you drop every slide deck into
                                itsmypdf, use the Sort button to arrange them alphabetically by filename (which puts them in chronological
                                order if your professor named them sensibly), and merge everything into one scrollable, searchable document.
                                Now Ctrl+F works across all your notes at once, and you have a single reference file for each subject.
                            </p>
                        </div>

                        <div className="border border-gray-200 rounded-xl p-5 sm:p-6">
                            <div className="flex items-center gap-2.5 mb-2">
                                <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
                                    <Building2 className="w-4 h-4 text-amber-600" />
                                </div>
                                <h3 className="font-semibold text-gray-900 text-sm">Office worker organizing reports</h3>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Monthly reports arrive from four departments, each exported as a separate PDF. Your company&rsquo;s IT policy
                                restricts the use of third-party cloud-based tools, which means most online PDF services are off the table. With
                                itsmypdf, you can <strong>merge multiple PDFs no upload</strong> directly on your work machine without violating
                                any policy. Drop all four reports into the tool, rotate the landscape chart that the finance team always exports
                                sideways, arrange the sections in the order your manager prefers, and download one polished document. No IT ticket
                                required, no SaaS approval needed, no compliance headaches.
                            </p>
                        </div>
                    </div>

                    {/* ──────────────────────────────────────────────────────────── */}
                    {/* 8. WHY NO UPLOAD MATTERS                                     */}
                    {/* ──────────────────────────────────────────────────────────── */}
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        Why &ldquo;No Upload&rdquo; Matters for PDF Merging
                    </h2>

                    <div className="text-gray-700 text-[15px] leading-relaxed space-y-4 mb-12">
                        <p>
                            A <strong>client-side PDF merge</strong> tool like itsmypdf eliminates that trust requirement entirely. The
                            JavaScript code that runs in your browser does all the heavy lifting: it reads your files from your local disk,
                            processes them in memory using the{' '}
                            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs text-gray-700 font-mono">pdf-lib</code> library,
                            and generates the merged result as a Blob object that downloads directly to your device. No network request ever
                            carries your document data. If you open your browser&rsquo;s DevTools and watch the Network tab during a merge,
                            you will see zero upload requests. The data never leaves your machine.
                        </p>
                        <p>
                            This architecture matters for anyone handling confidential documents &mdash; contracts, medical forms, financial
                            statements, legal briefs, student transcripts, HR files, or anything else that could cause real damage if it
                            ended up in the wrong hands. The <strong>browser only PDF merger</strong> model is not just a nice-to-have
                            convenience feature. It is a deliberate privacy and security decision that changes the entire risk profile
                            of the operation.
                        </p>
                        <p>
                            And because there is no server involved in the processing, there is no infrastructure cost to pass on to users.
                            That is why itsmypdf is completely free &mdash; with no usage limits, no watermarks, and no premium subscription
                            tiers. The tool costs nothing to run at scale because the &ldquo;server&rdquo; is your own browser.
                        </p>
                    </div>

                    {/* ──────────────────────────────────────────────────────────── */}
                    {/* 9. FAQ (schema-ready)                                        */}
                    {/* ──────────────────────────────────────────────────────────── */}
                    <h2 className="text-2xl font-bold text-gray-900 mb-5">
                        Frequently Asked Questions
                    </h2>

                    <div className="space-y-3 mb-12" itemScope itemType="https://schema.org/FAQPage">
                        {[
                            {
                                q: 'Is it really 100% private \u2014 no data sent anywhere?',
                                a: 'Yes. itsmypdf runs entirely in your browser using client-side JavaScript. No file data is ever transmitted over the network. You can verify this yourself by opening your browser\u2019s DevTools Network tab during a merge \u2014 you will see zero upload requests. Your documents never leave your device.',
                            },
                            {
                                q: 'Is the merge tool completely free to use?',
                                a: 'Yes. There are no usage limits, no watermarks added to your output, and no premium subscription tiers. Every tool on itsmypdf is free to use without restrictions on the number of files, number of pages, or total file size.',
                            },
                            {
                                q: 'Does it work on mobile phones and tablets?',
                                a: 'Absolutely. itsmypdf is fully responsive with a mobile-optimized layout. On smaller screens, the merge options appear in a slide-out panel with touch-friendly buttons sized for comfortable tapping. You get the same upload, reorder, rotate, and merge experience on iOS and Android devices.',
                            },
                            {
                                q: 'Is there a limit on file size or number of files?',
                                a: 'There is no hard limit enforced by itsmypdf. Most modern browsers comfortably handle individual PDFs up to around 50 MB each. For very large files or massive batches, you can use the Split PDF tool first to extract only the pages you need, then merge the smaller files together.',
                            },
                            {
                                q: 'Can I reorder and rotate files before merging?',
                                a: 'Yes. Drag any PDF card to a new position in the grid to change the merge order. Click the rotate icon on any card to turn that document 90 degrees per click. You can also auto-sort the entire batch by name, date added, page count, or file size using the Sort dropdown in the sidebar.',
                            },
                            {
                                q: 'What happens to my files after the merge is complete?',
                                a: 'Nothing \u2014 your original files remain completely untouched on your device. The merged PDF downloads as a brand new file called \u201Cmerged.pdf.\u201D No copies are stored anywhere because no server was ever involved in the process. When you close the browser tab, even the in-memory data is released.',
                            },
                        ].map((faq, i) => (
                            <details
                                key={i}
                                className="group border border-gray-200 rounded-lg overflow-hidden"
                                itemScope
                                itemProp="mainEntity"
                                itemType="https://schema.org/Question"
                            >
                                <summary className="flex items-center justify-between cursor-pointer px-5 py-4 text-sm font-medium text-gray-900 hover:bg-gray-50 transition select-none list-none">
                                    <span itemProp="name">{faq.q}</span>
                                    <span className="text-gray-400 group-open:rotate-45 transition-transform duration-200 text-lg font-light ml-4 shrink-0">+</span>
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

                    {/* ──────────────────────────────────────────────────────────── */}
                    {/* 10. MORE FREE PDF TOOLS                                      */}
                    {/* ──────────────────────────────────────────────────────────── */}
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">
                        More Free PDF Tools
                    </h2>
                    <p className="text-gray-600 text-sm leading-relaxed mb-5">
                        Every tool below works the same way as the merger &mdash; privately in your browser, with zero uploads, and completely free.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-12">
                        {[
                            { name: 'Compress PDF', path: '/compress-pdf', desc: 'Shrink file sizes' },
                            { name: 'Split PDF', path: '/split-pdf', desc: 'Extract specific pages' },
                            { name: 'Rotate PDF', path: '/rotate-pdf', desc: 'Fix page orientation' },
                            { name: 'PDF to JPG', path: '/pdf-to-jpg', desc: 'Export pages as images' },
                            { name: 'Watermark PDF', path: '/watermark-pdf', desc: 'Add text or image overlays' },
                            { name: 'Remove Pages', path: '/remove-pages', desc: 'Delete unwanted pages' },
                        ].map((tool) => (
                            <a
                                key={tool.path}
                                href={tool.path}
                                className="group border border-gray-200 rounded-lg p-4 hover:border-blue-200 hover:bg-blue-50/50 transition-all duration-200"
                            >
                                <p className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">{tool.name}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{tool.desc}</p>
                            </a>
                        ))}
                    </div>

                    {/* ──────────────────────────────────────────────────────────── */}
                    {/* 11. AUTHOR BOX                                               */}
                    {/* ──────────────────────────────────────────────────────────── */}
                    <div className="border border-gray-200 rounded-xl p-5 sm:p-6 mb-12 bg-gray-50">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                                <User className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 text-sm mb-1">About the author</p>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    I built itsmypdf because I was tired of uploading sensitive documents to random websites just to merge
                                    two PDFs. Every tool on the site processes files locally in your browser &mdash; no uploads, no tracking,
                                    no cost. If you have feedback, a feature request, or an idea for a new tool, I would love to hear it.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ──────────────────────────────────────────────────────────── */}
                    {/* 12. FINAL CTA                                                */}
                    {/* ──────────────────────────────────────────────────────────── */}
                    <div className="border-t border-gray-200 pt-10 pb-4 text-center">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                            Ready to merge your PDFs?
                        </h2>
                        <p className="text-gray-500 text-sm mb-6">
                            Everything on itsmypdf is completely free. No hidden costs, ever.
                        </p>
                        <a
                            href="/merge-pdf"
                            className="inline-flex items-center gap-2 px-7 py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition shadow-sm hover:shadow-md"
                        >
                            Open Merge PDF Tool
                            <ArrowRight className="w-4 h-4" />
                        </a>
                    </div>

                </article>
            </div>
  );
}


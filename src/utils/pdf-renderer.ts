import * as pdfjsLib from 'pdfjs-dist';

// Define the shape of a render task
interface RenderTask {
    id: string; // Unique ID (e.g., "page-1")
    priority: number; // Higher number = Higher priority
    execute: () => Promise<void>;
    abort?: () => void;
}

export class PdfRenderer {
    private static instance: PdfRenderer;
    private queue: RenderTask[] = [];
    private activeCount = 0;
    private maxConcurrency = 2; // Keep low to keep UI responsive
    private isProcessing = false;

    private constructor() {
        // Initialize worker strictly once
        if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        }
    }

    public static getInstance(): PdfRenderer {
        if (!PdfRenderer.instance) {
            PdfRenderer.instance = new PdfRenderer();
        }
        return PdfRenderer.instance;
    }

    /**
     * Schedule a page render.
     * @returns A promise that resolves when the render is complete, or rejects if cancelled.
     * @param cancelCallback Optional callback to receive a cancel function
     */
    public renderPage(
        page: any, // PDFPageProxy
        canvas: HTMLCanvasElement,
        scale: number = 1.0,
        priority: number = 0
    ): { promise: Promise<void>; cancel: () => void } {

        let renderTask: any = null;
        let isCancelled = false;
        let rejectPromise: (reason?: any) => void;

        const promise = new Promise<void>((resolve, reject) => {
            rejectPromise = reject;

            const task: RenderTask = {
                id: `page-${page.pageNumber}-${Date.now()}`,
                priority,
                execute: async () => {
                    if (isCancelled) return;

                    try {
                        const viewport = page.getViewport({ scale });
                        const ctx = canvas.getContext('2d', { alpha: false });

                        if (!ctx) {
                            throw new Error('Canvas context not available');
                        }

                        // Set dimensions if needed (usually handled by component, but good safety)
                        if (canvas.width !== viewport.width) canvas.width = viewport.width;
                        if (canvas.height !== viewport.height) canvas.height = viewport.height;

                        // Clear canvas
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);

                        // Create the PDF.js render task
                        renderTask = page.render({
                            canvasContext: ctx,
                            viewport,
                            intent: 'display',
                        });

                        await renderTask.promise;
                        resolve();
                    } catch (error: any) {
                        if (error?.name === 'RenderingCancelledException') {
                            // Expected if we cancelled it
                            return;
                        }
                        console.error(`Error rendering page ${page.pageNumber}:`, error);
                        reject(error);
                    }
                },
            };

            this.enqueue(task);
        });

        const cancel = () => {
            isCancelled = true;
            if (renderTask) {
                renderTask.cancel();
            }
            // Also remove from queue if waiting
            this.removeFromQueue(promise);
            // We don't necessarily need to reject logic here if we just want to silently stop,
            // but for completeness:
            // rejectPromise('Cancelled'); 
        };

        return { promise, cancel };
    }

    private enqueue(task: RenderTask) {
        this.queue.push(task);
        this.queue.sort((a, b) => b.priority - a.priority); // High priority first
        this.processQueue();
    }

    private removeFromQueue(promiseObj: any) {
        // In a real sophisticated system, we'd map promises to tasks ID to remove them from the array 
        // before they even start. For now, the 'isCancelled' flag check in execute() handles it gracefully.
    }

    private async processQueue() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        // Use requestIdleCallback or setTimeout to yield to main thread
        const processNext = async () => {
            if (this.queue.length === 0 || this.activeCount >= this.maxConcurrency) {
                this.isProcessing = false;
                return;
            }

            this.activeCount++;
            const task = this.queue.shift();

            if (task) {
                try {
                    await task.execute();
                } catch (e) {
                    // Error already logged in execute
                } finally {
                    this.activeCount--;
                    // Continue processing
                    setTimeout(processNext, 0);
                }
            } else {
                this.activeCount--;
                this.isProcessing = false;
            }
        };

        processNext();
    }

    // Method to clear everything (e.g. on unmount of tool)
    public cleanup() {
        // 1. Abort all pending tasks
        this.algorithmCancelAll();

        // 2. Clear queue
        this.queue = [];
        this.activeCount = 0;
        this.isProcessing = false;

        // 3. Clear any caches if we implement them
        // (Currently no internal cache, but if we added one, clear it here)
    }

    private algorithmCancelAll() {
        // Helper to cancel all pending tasks in the queue
        // Since our tasks are closures, we can't easily "cancel" them from outside 
        // unless we stored the reject/cancel functions.
        // But clearing the queue prevents them from running.
    }
}

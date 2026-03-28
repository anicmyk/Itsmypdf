import { PDFDocument, rgb, degrees, PDFName, PDFDict, PDFStream, PDFNumber } from 'pdf-lib';

export interface ProcessingResult {
  success: boolean;
  blob?: Blob;
  filename?: string;
  error?: string;
}

interface PdfToJpgOptions {
  quality: number;
  dpi: number;
  grayscale: boolean;
  isZip?: boolean;
}

/**
 * Convert PDF to JPG images
 */
export async function pdfToJpg(files: File[], options: PdfToJpgOptions): Promise<ProcessingResult & { isZip: boolean }> {
  try {
    const { quality, dpi, grayscale, isZip = true } = options;
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const pdfjsLib = await import('pdfjs-dist');

    // Set worker source
    if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;
    }

    const images: { name: string, blob: Blob }[] = [];

    // Calculate scale based on DPI (standard 72dpi vs requested dpi)
    // standard PDF point is 1/72 inch.
    // user wants DPI. scale = DPI / 72. 
    // Wait, PDF-lib uses 72dpi effectively. pdf.js uses viewport scale.
    // viewport(1.0) is 72dpi. So scale = dpi / 72.
    const scale = dpi / 72;

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not create canvas context');

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        if (grayscale) {
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          for (let j = 0; j < data.length; j += 4) {
            const avg = (data[j] + data[j + 1] + data[j + 2]) / 3;
            data[j] = avg;
            data[j + 1] = avg;
            data[j + 2] = avg;
          }
          context.putImageData(imageData, 0, 0);
        }

        const blob = await new Promise<Blob | null>(resolve =>
          canvas.toBlob(resolve, 'image/jpeg', quality / 100)
        );

        if (blob) {
          // Filename: original-page-X.jpg
          const baseName = file.name.replace(/\.pdf$/i, '');
          // If single file single page and not zip, handled later.
          // But we collect all here.
          images.push({
            name: `${baseName}-page-${i}.jpg`,
            blob
          });
        }
      }
    }

    if (images.length === 0) {
      return { success: false, error: 'No images generated', isZip: false };
    }

    if (images.length === 1 && !isZip) {
      return {
        success: true,
        blob: images[0].blob,
        filename: images[0].name,
        isZip: false
      };
    }

    // Add all to zip
    images.forEach(img => {
      zip.file(img.name, img.blob);
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    return {
      success: true,
      blob: zipBlob,
      filename: 'converted-images.zip',
      isZip: true
    };

  } catch (error) {
    console.error("PDF to JPG conversion error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PDF to JPG conversion failed',
      isZip: false
    };
  }
}

export interface JpgToPdfOptions {
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'A4' | 'Letter' | 'Legal' | 'A3' | 'A5';
  margin?: 'none' | 'small' | 'big';
  mergeAll?: boolean;
}

const PAGE_SIZES: Record<string, { width: number; height: number }> = {
  A4: { width: 595, height: 842 },
  Letter: { width: 612, height: 792 },
  Legal: { width: 612, height: 1008 },
  A3: { width: 842, height: 1191 },
  A5: { width: 420, height: 595 },
};

/**
 * Convert JPG/PNG images to PDF
 */
export async function jpgToPdf(files: File[], options?: JpgToPdfOptions): Promise<ProcessingResult> {
  try {
    if (!files || files.length === 0) {
      return {
        success: false,
        error: 'No image files provided'
      };
    }

    const orientation = options?.orientation || 'portrait';
    const pageSize = options?.pageSize || 'A4';
    const margin = options?.margin || 'none';
    const mergeAll = options?.mergeAll !== false; // Default to true

    // Get page dimensions
    const size = PAGE_SIZES[pageSize] || PAGE_SIZES.A4;
    let pageWidth = size.width;
    let pageHeight = size.height;

    // Apply orientation
    if (orientation === 'landscape') {
      [pageWidth, pageHeight] = [pageHeight, pageWidth];
    }

    // Get margin in points (1 point = 1/72 inch)
    let marginValue = 0;
    switch (margin) {
      case 'small':
        marginValue = 20; // ~0.28 inches
        break;
      case 'big':
        marginValue = 40; // ~0.56 inches
        break;
      case 'none':
      default:
        marginValue = 0;
        break;
    }

    const contentWidth = pageWidth - (marginValue * 2);
    const contentHeight = pageHeight - (marginValue * 2);

    if (mergeAll) {
      // Merge all images into one PDF
      const pdfDoc = await PDFDocument.create();

      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        let image;

        if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
          image = await pdfDoc.embedJpg(arrayBuffer);
        } else if (file.type === 'image/png') {
          image = await pdfDoc.embedPng(arrayBuffer);
        } else {
          continue; // Skip unsupported formats
        }

        // Calculate scaling to fit image within content area while maintaining aspect ratio
        const imageAspectRatio = image.width / image.height;
        const contentAspectRatio = contentWidth / contentHeight;

        let drawWidth: number;
        let drawHeight: number;
        let drawX: number;
        let drawY: number;

        if (imageAspectRatio > contentAspectRatio) {
          // Image is wider - fit to width
          drawWidth = contentWidth;
          drawHeight = contentWidth / imageAspectRatio;
          drawX = marginValue;
          drawY = marginValue + (contentHeight - drawHeight) / 2;
        } else {
          // Image is taller - fit to height
          drawHeight = contentHeight;
          drawWidth = contentHeight * imageAspectRatio;
          drawX = marginValue + (contentWidth - drawWidth) / 2;
          drawY = marginValue;
        }

        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        page.drawImage(image, {
          x: drawX,
          y: drawY,
          width: drawWidth,
          height: drawHeight,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });

      return {
        success: true,
        blob,
        filename: 'images-converted.pdf'
      };
    } else {
      // Create separate PDFs for each image and return as ZIP
      try {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        for (const file of files) {
          // Create a new PDF document for each image
          const singlePdfDoc = await PDFDocument.create();
          const arrayBuffer = await file.arrayBuffer();
          let embeddedImage;

          // Embed image based on file type
          if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
            embeddedImage = await singlePdfDoc.embedJpg(arrayBuffer);
          } else if (file.type === 'image/png') {
            embeddedImage = await singlePdfDoc.embedPng(arrayBuffer);
          } else {
            continue; // Skip unsupported formats
          }

          // Calculate scaling to fit image within content area while maintaining aspect ratio
          const imageAspectRatio = embeddedImage.width / embeddedImage.height;
          const contentAspectRatio = contentWidth / contentHeight;

          let drawWidth: number;
          let drawHeight: number;
          let drawX: number;
          let drawY: number;

          if (imageAspectRatio > contentAspectRatio) {
            drawWidth = contentWidth;
            drawHeight = contentWidth / imageAspectRatio;
            drawX = marginValue;
            drawY = marginValue + (contentHeight - drawHeight) / 2;
          } else {
            drawHeight = contentHeight;
            drawWidth = contentHeight * imageAspectRatio;
            drawX = marginValue + (contentWidth - drawWidth) / 2;
            drawY = marginValue;
          }

          const page = singlePdfDoc.addPage([pageWidth, pageHeight]);
          page.drawImage(embeddedImage, {
            x: drawX,
            y: drawY,
            width: drawWidth,
            height: drawHeight,
          });

          const pdfBytes = await singlePdfDoc.save();

          // Create filename from original image filename (keep original name, just change extension)
          const baseName = file.name.replace(/\.(jpg|jpeg|png)$/i, '');
          const pdfFileName = `${baseName}.pdf`;
          zip.file(pdfFileName, pdfBytes);
        }

        // Generate ZIP file
        const zipBlob = await zip.generateAsync({ type: 'blob' });

        return {
          success: true,
          blob: zipBlob,
          filename: 'converted-images.zip'
        };
      } catch (zipError) {
        console.error('ZIP creation failed:', zipError);
        // Fallback: return first PDF if ZIP fails
        const fallbackPdfDoc = await PDFDocument.create();
        const file = files[0];
        const arrayBuffer = await file.arrayBuffer();
        let image;

        if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
          image = await fallbackPdfDoc.embedJpg(arrayBuffer);
        } else if (file.type === 'image/png') {
          image = await fallbackPdfDoc.embedPng(arrayBuffer);
        } else {
          return {
            success: false,
            error: 'Unsupported image format'
          };
        }

        // Calculate scaling to fit image within content area while maintaining aspect ratio
        const imageAspectRatio = image.width / image.height;
        const contentAspectRatio = contentWidth / contentHeight;

        let drawWidth: number;
        let drawHeight: number;
        let drawX: number;
        let drawY: number;

        if (imageAspectRatio > contentAspectRatio) {
          drawWidth = contentWidth;
          drawHeight = contentWidth / imageAspectRatio;
          drawX = marginValue;
          drawY = marginValue + (contentHeight - drawHeight) / 2;
        } else {
          drawHeight = contentHeight;
          drawWidth = contentHeight * imageAspectRatio;
          drawX = marginValue + (contentWidth - drawWidth) / 2;
          drawY = marginValue;
        }

        const page = fallbackPdfDoc.addPage([pageWidth, pageHeight]);
        page.drawImage(image, {
          x: drawX,
          y: drawY,
          width: drawWidth,
          height: drawHeight,
        });

        const pdfBytes = await fallbackPdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });

        return {
          success: true,
          blob,
          filename: file.name.replace(/\.(jpg|jpeg|png)$/i, '.pdf')
        };
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Image to PDF conversion failed'
    };
  }
}

/**
 * Merge multiple PDF files
 */
export async function mergePdfs(files: File[]): Promise<ProcessingResult> {
  try {
    const mergedPdf = await PDFDocument.create();

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const pdfBytes = await mergedPdf.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    return {
      success: true,
      blob,
      filename: 'merged.pdf'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PDF merge failed'
    };
  }
}

export interface SplitOptions {
  mode: 'range' | 'pages' | 'size';
  ranges?: Array<{ from: number; to: number }>; // For range mode
  pageNumbers?: number[]; // For pages mode
  targetSize?: number; // For size mode (in MB)
  mergeAll?: boolean; // If true, merge all ranges into one file
}

/**
 * Split PDF into separate pages
 */
export async function splitPdf(file: File, options?: SplitOptions): Promise<ProcessingResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pageCount = pdfDoc.getPageCount();

    // Default: extract first page if no options provided
    if (!options) {
      const newPdf = await PDFDocument.create();
      const [firstPage] = await newPdf.copyPages(pdfDoc, [0]);
      newPdf.addPage(firstPage);
      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      return {
        success: true,
        blob,
        filename: `${file.name.replace('.pdf', '')}-page1.pdf`
      };
    }

    const mode = options.mode;
    const mergeAll = options.mergeAll || false;

    // RANGE MODE: Split by page ranges
    if (mode === 'range' && options.ranges) {
      const ranges = options.ranges.filter(r => r.from > 0 && r.to > 0 && r.from <= r.to && r.from <= pageCount);

      if (ranges.length === 0) {
        return { success: false, error: 'No valid ranges specified' };
      }

      if (mergeAll) {
        // Merge all ranges into one PDF
        const mergedPdf = await PDFDocument.create();
        for (const range of ranges) {
          const startPage = Math.max(1, range.from) - 1;
          const endPage = Math.min(pageCount, range.to);
          const pageIndices = Array.from({ length: endPage - startPage }, (_, i) => startPage + i);
          const copiedPages = await mergedPdf.copyPages(pdfDoc, pageIndices);
          copiedPages.forEach(page => mergedPdf.addPage(page));
        }
        const pdfBytes = await mergedPdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        return {
          success: true,
          blob,
          filename: `${file.name.replace('.pdf', '')}-ranges-merged.pdf`
        };
      } else {
        // Create separate PDFs for each range
        // For now, return the first range (will be enhanced to return multiple files)
        const range = ranges[0];
        const startPage = Math.max(1, range.from) - 1;
        const endPage = Math.min(pageCount, range.to);
        const pageIndices = Array.from({ length: endPage - startPage }, (_, i) => startPage + i);

        const newPdf = await PDFDocument.create();
        const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
        copiedPages.forEach(page => newPdf.addPage(page));

        const pdfBytes = await newPdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        return {
          success: true,
          blob,
          filename: `${file.name.replace('.pdf', '')}-pages-${range.from}-${range.to}.pdf`
        };
      }
    }

    // PAGES MODE: Extract specific page numbers
    if (mode === 'pages' && options.pageNumbers) {
      const validPages = options.pageNumbers
        .filter(p => p > 0 && p <= pageCount)
        .map(p => p - 1); // Convert to 0-indexed

      if (validPages.length === 0) {
        return { success: false, error: 'No valid page numbers specified' };
      }

      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(pdfDoc, validPages);
      copiedPages.forEach(page => newPdf.addPage(page));

      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const pagesList = options.pageNumbers.filter(p => p > 0 && p <= pageCount).join('-');
      return {
        success: true,
        blob,
        filename: `${file.name.replace('.pdf', '')}-pages-${pagesList}.pdf`
      };
    }

    // SIZE MODE: Split by target file size
    if (mode === 'size' && options.targetSize) {
      const targetSizeBytes = options.targetSize * 1024 * 1024; // Convert MB to bytes
      const chunks: number[][] = [];
      let currentChunk: number[] = [];

      // Simple approach: add pages until size limit is reached
      for (let i = 0; i < pageCount; i++) {
        currentChunk.push(i);

        // Check current chunk size
        const testPdf = await PDFDocument.create();
        const testPages = await testPdf.copyPages(pdfDoc, currentChunk);
        testPages.forEach(page => testPdf.addPage(page));
        const testBytes = await testPdf.save();

        if (testBytes.length >= targetSizeBytes && currentChunk.length > 1) {
          // Remove last page and start new chunk
          currentChunk.pop();
          chunks.push([...currentChunk]);
          currentChunk = [i];
        }
      }

      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }

      // For now, return first chunk (will be enhanced to return multiple files)
      if (chunks.length > 0) {
        const newPdf = await PDFDocument.create();
        const copiedPages = await newPdf.copyPages(pdfDoc, chunks[0]);
        copiedPages.forEach(page => newPdf.addPage(page));

        const pdfBytes = await newPdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        return {
          success: true,
          blob,
          filename: `${file.name.replace('.pdf', '')}-part-1.pdf`
        };
      }
    }

    return {
      success: false,
      error: 'Invalid split options provided'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PDF split failed'
    };
  }
}

/**
 * ADVANCED PDF COMPRESSION SYSTEM
 * Implements Smart Vector Compression, Raster Compression, and Automatic mode
 */

// Compression level configurations
interface CompressionConfig {
  vector: {
    quality: number;
    maxDimensions: number;
    skipSizeKB: number;
    replaceThreshold: number;
  };
  raster: {
    scale: number;
    quality: number;
  };
}

const COMPRESSION_CONFIGS: Record<string, CompressionConfig> = {
  recommended: {
    vector: { quality: 0.5, maxDimensions: 1800, skipSizeKB: 3, replaceThreshold: 0.95 },
    raster: { scale: 1.5, quality: 0.6 }
  },
  highQuality: {
    vector: { quality: 0.7, maxDimensions: 2500, skipSizeKB: 5, replaceThreshold: 0.98 },
    raster: { scale: 2.0, quality: 0.9 }
  },
  smallSize: {
    vector: { quality: 0.3, maxDimensions: 1200, skipSizeKB: 2, replaceThreshold: 0.95 },
    raster: { scale: 1.2, quality: 0.4 }
  },
  extreme: {
    vector: { quality: 0.1, maxDimensions: 1000, skipSizeKB: 1, replaceThreshold: 0.95 },
    raster: { scale: 1.0, quality: 0.2 }
  }
};

// Helper: Convert data URL to bytes
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper: Calculate scaled dimensions
function calculateScaledDimensions(
  originalWidth: number,
  originalHeight: number,
  maxDimensions: number
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;

  let newWidth = originalWidth;
  let newHeight = originalHeight;

  if (originalWidth > maxDimensions || originalHeight > maxDimensions) {
    if (originalWidth > originalHeight) {
      newWidth = maxDimensions;
      newHeight = Math.round(maxDimensions / aspectRatio);
    } else {
      newHeight = maxDimensions;
      newWidth = Math.round(maxDimensions * aspectRatio);
    }
  }

  // Don't resize below minimum
  newWidth = Math.max(50, newWidth);
  newHeight = Math.max(50, newHeight);

  return { width: newWidth, height: newHeight };
}

/**
 * Smart Vector Compression: Compresses embedded images while preserving text
 * Uses pdf-lib's low-level context API for direct stream manipulation
 */
async function smartVectorCompress(
  file: File,
  config: CompressionConfig['vector']
): Promise<{ blob: Blob; method: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const context = pdfDoc.context;

  let imagesProcessed = 0;
  let imagesCompressed = 0;

  // Process each page
  const pages = pdfDoc.getPages();
  for (const page of pages) {
    try {
      // Access page resources using low-level API
      const pageDict = page.node;
      const resources = pageDict.get(PDFName.of('Resources'));
      if (!resources || !(resources instanceof PDFDict)) continue;

      const xObjects = resources.get(PDFName.of('XObject'));
      if (!xObjects || !(xObjects instanceof PDFDict)) continue;

      // Process each XObject (potential image)
      const xObjectKeys = xObjects.keys();
      for (const key of xObjectKeys) {
        const xObjectRef = xObjects.get(key);
        if (!xObjectRef) continue;

        // Use context.lookup to get the actual stream object
        const xObject = context.lookup(xObjectRef);
        if (!xObject || !(xObject instanceof PDFStream)) continue;

        const dict = xObject.dict;
        const subtype = dict.get(PDFName.of('Subtype'));

        // Check if it's an image
        if (!subtype || subtype.toString() !== '/Image') continue;

        imagesProcessed++;

        try {
          // Get image properties
          const width = dict.get(PDFName.of('Width'));
          const height = dict.get(PDFName.of('Height'));
          if (!width || !height) continue;

          const widthNum = (width as any).value || width;
          const heightNum = (height as any).value || height;

          // Get image data using getContents
          const imageBytes = xObject.getContents();
          const imageSizeKB = imageBytes.length / 1024;

          // Skip small images
          if (imageSizeKB < config.skipSizeKB) continue;

          // Calculate new dimensions
          const newDims = calculateScaledDimensions(widthNum, heightNum, config.maxDimensions);

          // Skip if no resize needed and dimensions are already small
          if (newDims.width === widthNum && newDims.height === heightNum && imageSizeKB < 50) {
            continue;
          }

          // Create canvas and compress image
          const canvas = document.createElement('canvas');
          canvas.width = newDims.width;
          canvas.height = newDims.height;
          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) continue;

          // Load and draw image
          const blob = new Blob([imageBytes]);
          const imageUrl = URL.createObjectURL(blob);
          const img = new Image();

          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, newDims.width, newDims.height);
              URL.revokeObjectURL(imageUrl);
              resolve();
            };
            img.onerror = () => {
              URL.revokeObjectURL(imageUrl);
              reject();
            };
            img.src = imageUrl;
          });

          // Convert to JPEG
          const compressedBlob = await new Promise<Blob | null>(resolve =>
            canvas.toBlob(resolve, 'image/jpeg', config.quality)
          );

          if (!compressedBlob) continue;

          const compressedBytes = new Uint8Array(await compressedBlob.arrayBuffer());

          // Only replace if significantly smaller
          if (compressedBytes.length < imageBytes.length * config.replaceThreshold) {
            // Update stream contents directly (cast to any as TypeScript doesn't expose this)
            (xObject as any).contents = compressedBytes;

            // Update stream dictionary
            dict.set(PDFName.of('Length'), PDFNumber.of(compressedBytes.length));
            dict.set(PDFName.of('Width'), PDFNumber.of(newDims.width));
            dict.set(PDFName.of('Height'), PDFNumber.of(newDims.height));
            dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
            dict.set(PDFName.of('BitsPerComponent'), PDFNumber.of(8));

            // Remove DecodeParms if exists
            if (dict.has(PDFName.of('DecodeParms'))) {
              dict.delete(PDFName.of('DecodeParms'));
            }

            imagesCompressed++;
          }
        } catch (imgError) {
          console.warn('Failed to compress individual image:', imgError);
          // Continue with next image
        }
      }
    } catch (pageError) {
      console.warn('Failed to process page:', pageError);
      // Continue with next page
    }
  }

  // Remove metadata
  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setKeywords([]);
  pdfDoc.setProducer('');
  pdfDoc.setCreator('');

  // Save with optimization
  const pdfBytes = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false });
  const resultBlob = new Blob([pdfBytes], { type: 'application/pdf' });



  return {
    blob: resultBlob,
    method: `Smart Vector (${imagesCompressed}/${imagesProcessed} images compressed)`
  };
}

/**
 * Raster Compression: Converts pages to images
 */
async function rasterCompress(
  file: File,
  config: CompressionConfig['raster']
): Promise<{ blob: Blob; method: string }> {
  const pdfjsLib = await import('pdfjs-dist');
  if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const newPdfDoc = await PDFDocument.create();

  // Process pages in batches
  const CONCURRENCY = 3;
  const results: Array<{ pageIndex: number, imageBuffer: ArrayBuffer, width: number, height: number }> = [];
  const queue = Array.from({ length: numPages }, (_, i) => i + 1);

  const processPage = async (pageIndex: number) => {
    const page = await pdf.getPage(pageIndex);
    const viewport = page.getViewport({ scale: config.scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not create canvas context');

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport,
      intent: 'print'
    }).promise;

    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', config.quality)
    );

    if (!blob) throw new Error(`Failed to compress page ${pageIndex}`);

    const imageBuffer = await blob.arrayBuffer();
    const originalViewport = page.getViewport({ scale: 1.0 });

    return {
      pageIndex,
      imageBuffer,
      width: originalViewport.width,
      height: originalViewport.height
    };
  };

  const worker = async () => {
    while (queue.length > 0) {
      const pageIndex = queue.shift();
      if (pageIndex) {
        const result = await processPage(pageIndex);
        results.push(result);
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(numPages, CONCURRENCY) }, () => worker()));
  results.sort((a, b) => a.pageIndex - b.pageIndex);

  for (const result of results) {
    const embeddedImage = await newPdfDoc.embedJpg(result.imageBuffer);
    const newPage = newPdfDoc.addPage([result.width, result.height]);
    newPage.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: result.width,
      height: result.height,
    });
  }

  const pdfBytes = await newPdfDoc.save({ useObjectStreams: true });
  const resultBlob = new Blob([pdfBytes], { type: 'application/pdf' });

  return {
    blob: resultBlob,
    method: 'Raster Compression'
  };
}

/**
 * Main compression function with mode selection
 * @param mode - 'smart' (default), 'aggressive', or 'lossless'
 */
export async function compressPdf(
  file: File,
  level: 'recommended' | 'extreme' = 'recommended',
  mode: 'smart' | 'aggressive' | 'lossless' = 'smart'
): Promise<ProcessingResult & { method?: string }> {
  try {
    // Map level to config
    const configKey = level === 'extreme' ? 'extreme' : 'recommended';
    const config = COMPRESSION_CONFIGS[configKey];

    // LOSSLESS MODE: Metadata removal only
    if (mode === 'lossless') {

      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('');
      pdfDoc.setCreator('');
      const optimizedBytes = await pdfDoc.save({ useObjectStreams: true });
      const optimizedBlob = new Blob([optimizedBytes], { type: 'application/pdf' });

      return {
        success: true,
        blob: optimizedBlob,
        filename: file.name.replace('.pdf', '-optimized.pdf'),
        method: 'Lossless (Metadata Only)'
      };
    }

    // AGGRESSIVE MODE: Always use raster compression
    if (mode === 'aggressive') {

      const rasterResult = await rasterCompress(file, config.raster);
      return {
        success: true,
        blob: rasterResult.blob,
        filename: file.name.replace('.pdf', '-compressed.pdf'),
        method: rasterResult.method
      };
    }

    // SMART MODE: Try vector first, NEVER raster text-only PDFs

    const vectorResult = await smartVectorCompress(file, config.vector);

    // Extract number of images compressed from the method string
    const match = vectorResult.method.match(/(\d+)\/(\d+) images compressed/);
    const imagesCompressed = match ? parseInt(match[1]) : 0;

    // Check if vector compression was effective
    const vectorRatio = vectorResult.blob.size / file.size;

    // If we compressed at least one image OR got >5% reduction, use vector result
    if (imagesCompressed > 0 || vectorRatio < 0.95) {

      return {
        success: true,
        blob: vectorResult.blob,
        filename: file.name.replace('.pdf', '-compressed.pdf'),
        method: vectorResult.method
      };
    }

    // No images were compressed - this is a text-only PDF
    // DO NOT rasterize! Just return metadata-optimized version

    return {
      success: true,
      blob: vectorResult.blob,
      filename: file.name.replace('.pdf', '-optimized.pdf'),
      method: 'Smart Vector (Text-only PDF - Metadata optimized)'
    };
  } catch (error) {
    console.error("Compression error:", error);

    // Fallback: metadata removal only
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      const optimizedBytes = await pdfDoc.save({ useObjectStreams: true });
      const optimizedBlob = new Blob([optimizedBytes], { type: 'application/pdf' });

      return {
        success: true,
        blob: optimizedBlob,
        filename: file.name.replace('.pdf', '-optimized.pdf'),
        method: 'Metadata Removal Only'
      };
    } catch (fallbackError) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF compression failed'
      };
    }
  }
}

/**
 * Rotate PDF pages
 */
export async function rotatePdf(file: File, rotation: number = 90): Promise<ProcessingResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    const pages = pdfDoc.getPages();
    pages.forEach(page => {
      page.setRotation(degrees(rotation));
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    return {
      success: true,
      blob,
      filename: file.name.replace('.pdf', '-rotated.pdf')
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PDF rotation failed'
    };
  }
}

/**
 * Add watermark to PDF
 */
export async function addWatermark(file: File, text: string): Promise<ProcessingResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    const pages = pdfDoc.getPages();

    pages.forEach(page => {
      const { width, height } = page.getSize();
      page.drawText(text, {
        x: width / 2 - (text.length * 10),
        y: height / 2,
        size: 50,
        color: rgb(0.7, 0.7, 0.7),
        opacity: 0.3,
      });
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    return {
      success: true,
      blob,
      filename: file.name.replace('.pdf', '-watermarked.pdf')
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Watermark addition failed'
    };
  }
}

/**
 * Extract specific pages from PDF
 */
export async function extractPages(file: File, pageNumbers: number[]): Promise<ProcessingResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    const newPdf = await PDFDocument.create();
    const pages = await newPdf.copyPages(pdfDoc, pageNumbers.map(n => n - 1));
    pages.forEach(page => newPdf.addPage(page));

    const pdfBytes = await newPdf.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    return {
      success: true,
      blob,
      filename: file.name.replace('.pdf', '-extracted.pdf')
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Page extraction failed'
    };
  }
}

/**
 * Remove specific pages from PDF
 */
export async function removePages(file: File, pageNumbers: number[]): Promise<ProcessingResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const totalPages = pdfDoc.getPageCount();

    const pagesToKeep = Array.from({ length: totalPages }, (_, i) => i)
      .filter(i => !pageNumbers.includes(i + 1));

    const newPdf = await PDFDocument.create();
    const pages = await newPdf.copyPages(pdfDoc, pagesToKeep);
    pages.forEach(page => newPdf.addPage(page));

    const pdfBytes = await newPdf.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    return {
      success: true,
      blob,
      filename: file.name.replace('.pdf', '-modified.pdf')
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Page removal failed'
    };
  }
}

/**
 * Organize PDF pages (reorder)
 */
export async function organizePdf(file: File, pageOrder: number[]): Promise<ProcessingResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    const newPdf = await PDFDocument.create();
    const pages = await newPdf.copyPages(pdfDoc, pageOrder.map(n => n - 1));
    pages.forEach(page => newPdf.addPage(page));

    const pdfBytes = await newPdf.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    return {
      success: true,
      blob,
      filename: file.name.replace('.pdf', '-organized.pdf')
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PDF organization failed'
    };
  }
}

/**
 * Add page numbers to PDF
 */
export async function addPageNumbers(file: File, position: string = 'bottom-center'): Promise<ProcessingResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    const pages = pdfDoc.getPages();
    const fontSize = 10;

    pages.forEach((page, index) => {
      const { width } = page.getSize();
      const pageNumber = (index + 1).toString();

      let x;
      if (position === 'bottom-center') {
        x = width / 2 - 15;
      } else if (position === 'bottom-left') {
        x = 30;
      } else { // bottom-right
        x = width - 30 - 30;
      }

      page.drawText(pageNumber, {
        x,
        y: 20,
        size: fontSize,
        color: rgb(0.5, 0.5, 0.5),
      });
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    return {
      success: true,
      blob,
      filename: file.name.replace('.pdf', '-numbered.pdf')
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Page numbering failed'
    };
  }
}

/**
 * Crop PDF pages
 */
export async function cropPdf(file: File, cropBox: { x: number; y: number; width: number; height: number }): Promise<ProcessingResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    const pages = pdfDoc.getPages();
    pages.forEach(page => {
      // Set crop box (requires page.setMediaBox)
      const { width: originalWidth, height: originalHeight } = page.getSize();
      page.setMediaBox(cropBox.x, cropBox.y, cropBox.width, cropBox.height);
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    return {
      success: true,
      blob,
      filename: file.name.replace('.pdf', '-cropped.pdf')
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PDF cropping failed'
    };
  }
}

/**
 * Compare two PDF files and generate a comparison report
 */
export async function comparePdfs(files: File[]): Promise<ProcessingResult> {
  try {
    if (files.length !== 2) {
      return {
        success: false,
        error: 'Please upload exactly 2 PDF files to compare'
      };
    }

    const [file1, file2] = files;
    const arrayBuffer1 = await file1.arrayBuffer();
    const arrayBuffer2 = await file2.arrayBuffer();

    const pdf1 = await PDFDocument.load(arrayBuffer1);
    const pdf2 = await PDFDocument.load(arrayBuffer2);

    const pageCount1 = pdf1.getPageCount();
    const pageCount2 = pdf2.getPageCount();
    const fileSize1 = file1.size;
    const fileSize2 = file2.size;

    // Create a comparison report as PDF
    const reportPdf = await PDFDocument.create();
    const page = reportPdf.addPage([612, 792]); // Letter size

    const fontSize = 12;
    let yPosition = 750;

    // Title
    page.drawText('PDF Comparison Report', {
      x: 50,
      y: yPosition,
      size: 18,
      color: rgb(0, 0, 0),
    });
    yPosition -= 40;

    // File 1 info
    page.drawText('File 1:', {
      x: 50,
      y: yPosition,
      size: fontSize,
      color: rgb(0, 0, 0),
    });
    yPosition -= 20;

    page.drawText(`Name: ${file1.name}`, {
      x: 70,
      y: yPosition,
      size: fontSize,
      color: rgb(0.3, 0.3, 0.3),
    });
    yPosition -= 15;

    page.drawText(`Pages: ${pageCount1}`, {
      x: 70,
      y: yPosition,
      size: fontSize,
      color: rgb(0.3, 0.3, 0.3),
    });
    yPosition -= 15;

    page.drawText(`Size: ${(fileSize1 / 1024 / 1024).toFixed(2)} MB`, {
      x: 70,
      y: yPosition,
      size: fontSize,
      color: rgb(0.3, 0.3, 0.3),
    });
    yPosition -= 30;

    // File 2 info
    page.drawText('File 2:', {
      x: 50,
      y: yPosition,
      size: fontSize,
      color: rgb(0, 0, 0),
    });
    yPosition -= 20;

    page.drawText(`Name: ${file2.name}`, {
      x: 70,
      y: yPosition,
      size: fontSize,
      color: rgb(0.3, 0.3, 0.3),
    });
    yPosition -= 15;

    page.drawText(`Pages: ${pageCount2}`, {
      x: 70,
      y: yPosition,
      size: fontSize,
      color: rgb(0.3, 0.3, 0.3),
    });
    yPosition -= 15;

    page.drawText(`Size: ${(fileSize2 / 1024 / 1024).toFixed(2)} MB`, {
      x: 70,
      y: yPosition,
      size: fontSize,
      color: rgb(0.3, 0.3, 0.3),
    });
    yPosition -= 30;

    // Comparison results
    page.drawText('Comparison Results:', {
      x: 50,
      y: yPosition,
      size: fontSize,
      color: rgb(0, 0, 0),
    });
    yPosition -= 20;

    if (pageCount1 === pageCount2 && fileSize1 === fileSize2) {
      page.drawText('Files appear to be identical', {
        x: 70,
        y: yPosition,
        size: fontSize,
        color: rgb(0, 0.6, 0), // Green
      });
    } else {
      page.drawText('Files are different:', {
        x: 70,
        y: yPosition,
        size: fontSize,
        color: rgb(0.6, 0, 0), // Red
      });
      yPosition -= 15;

      if (pageCount1 !== pageCount2) {
        page.drawText(`• Different page counts: ${pageCount1} vs ${pageCount2}`, {
          x: 70,
          y: yPosition,
          size: fontSize,
          color: rgb(0.6, 0, 0),
        });
        yPosition -= 15;
      }

      if (fileSize1 !== fileSize2) {
        page.drawText(`• Different file sizes: ${(fileSize1 / 1024 / 1024).toFixed(2)} MB vs ${(fileSize2 / 1024 / 1024).toFixed(2)} MB`, {
          x: 70,
          y: yPosition,
          size: fontSize,
          color: rgb(0.6, 0, 0),
        });
      }
    }

    const pdfBytes = await reportPdf.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    return {
      success: true,
      blob,
      filename: 'comparison-report.pdf'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PDF comparison failed'
    };
  }
}

/**
 * Convert PDF to PNG images (first page)
 */
export async function pdfToPng(file: File): Promise<ProcessingResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    // For now, extract first page as PNG conversion placeholder
    // Real PNG conversion requires canvas rendering
    const newPdf = await PDFDocument.create();
    const [firstPage] = await newPdf.copyPages(pdfDoc, [0]);
    newPdf.addPage(firstPage);

    const pdfBytes = await newPdf.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    return {
      success: true,
      blob,
      filename: file.name.replace('.pdf', '-page1.pdf')
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PDF to PNG conversion failed'
    };
  }
}

/**
 * Convert PNG images to PDF
 */
export async function pngToPdf(files: File[]): Promise<ProcessingResult> {
  return jpgToPdf(files); // PNG to PDF uses same logic as JPG to PDF
}

/**
 * Extract text from PDF
 */
export async function extractText(file: File): Promise<ProcessingResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pageCount = pdfDoc.getPageCount();

    // For now, create a summary PDF with basic info
    // Real text extraction requires PDF parsing libraries
    const resultPdf = await PDFDocument.create();
    const page = resultPdf.addPage([612, 792]);

    page.drawText('PDF Text Extraction Report', {
      x: 50,
      y: 750,
      size: 18,
      color: rgb(0, 0, 0),
    });

    page.drawText(`File: ${file.name}`, {
      x: 50,
      y: 720,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
    });

    page.drawText(`Pages: ${pageCount}`, {
      x: 50,
      y: 700,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
    });

    page.drawText('For full text extraction, use the OCR tool.', {
      x: 50,
      y: 680,
      size: 12,
      color: rgb(0.5, 0.5, 0.5),
    });

    const pdfBytes = await resultPdf.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    return {
      success: true,
      blob,
      filename: file.name.replace('.pdf', '-text-extract.pdf')
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Text extraction failed'
    };
  }
}

/**
 * Create PDF from text
 */
export async function textToPdf(text: string): Promise<ProcessingResult> {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);

    const lines = text.split('\n');
    let yPosition = 750;
    const lineHeight = 15;

    for (const line of lines) {
      if (yPosition < 50) {
        // Add new page if needed
        const newPage = pdfDoc.addPage([612, 792]);
        yPosition = 750;
        newPage.drawText(line, {
          x: 50,
          y: yPosition,
          size: 12,
          color: rgb(0, 0, 0),
        });
      } else {
        page.drawText(line, {
          x: 50,
          y: yPosition,
          size: 12,
          color: rgb(0, 0, 0),
        });
      }
      yPosition -= lineHeight;
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    return {
      success: true,
      blob,
      filename: 'text-document.pdf'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Text to PDF conversion failed'
    };
  }
}

/**
 * Add background color to PDF
 */
export async function addBackground(
  file: File,
  color: string = '#f0f0f0',
  opacity: number = 0.3,
  applyToAll: boolean = true,
  pageNumber?: number
): Promise<ProcessingResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    const pages = pdfDoc.getPages();

    // Convert hex color to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // Determine which pages to apply background to
    const pagesToProcess = applyToAll
      ? pages
      : pageNumber !== undefined
        ? [pages[pageNumber - 1]]
        : pages;

    pagesToProcess.forEach(page => {
      const { width, height } = page.getSize();

      // Add background rectangle
      page.drawRectangle({
        x: 0,
        y: 0,
        width,
        height,
        color: rgb(r, g, b),
        opacity: opacity,
      });
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    return {
      success: true,
      blob,
      filename: file.name.replace('.pdf', '-background.pdf')
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Background addition failed'
    };
  }
}

/**
 * Add header and footer to PDF
 */
export async function addHeaderFooter(file: File, header: string = '', footer: string = ''): Promise<ProcessingResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    const pages = pdfDoc.getPages();
    const pageCount = pages.length;

    pages.forEach((page, index) => {
      const { width } = page.getSize();

      // Add header
      if (header) {
        page.drawText(header, {
          x: 50,
          y: page.getSize().height - 30,
          size: 10,
          color: rgb(0.5, 0.5, 0.5),
        });
      }

      // Add footer with page number
      if (footer || pageCount > 1) {
        const footerText = footer || `Page ${index + 1} of ${pageCount}`;
        page.drawText(footerText, {
          x: width - 150,
          y: 20,
          size: 10,
          color: rgb(0.5, 0.5, 0.5),
        });
      }
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    return {
      success: true,
      blob,
      filename: file.name.replace('.pdf', '-header-footer.pdf')
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Header/Footer addition failed'
    };
  }
}





/**
 * Get PDF information
 */
export async function getPdfInfo(file: File): Promise<{
  pageCount: number;
  fileSize: number;
  fileName: string;
}> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    return {
      pageCount: pdfDoc.getPageCount(),
      fileSize: file.size,
      fileName: file.name
    };
  } catch (error) {
    return {
      pageCount: 0,
      fileSize: file.size,
      fileName: file.name
    };
  }
}

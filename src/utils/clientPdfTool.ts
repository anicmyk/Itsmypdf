import {
  mergePdfs,
  splitPdf,
  extractPages,
  removePages,
  organizePdf,
  compressPdf,
  pdfToJpg,
  jpgToPdf,
  pdfToPng,
  pngToPdf,
  rotatePdf,
  addWatermark,
  addPageNumbers,
  cropPdf,
  addBackground,
  addHeaderFooter,

  extractText,
  textToPdf,
  comparePdfs,
  getPdfInfo
} from './pdfProcessor';

export interface ClientToolResult {
  success: boolean;
  blob?: Blob;
  filename?: string;
  error?: string;
  downloadUrl?: string;
}

/**
 * Process PDF tool client-side without authentication
 */
export async function processClientTool(
  toolId: string,
  files: File[],
  parameters: Record<string, any> = {}
): Promise<ClientToolResult> {
  try {
    let result;

    switch (toolId) {
      case 'merge':
        if (files.length < 2) {
          throw new Error('Please upload at least 2 PDF files to merge');
        }
        result = await mergePdfs(files);
        break;

      case 'split':
        if (files.length !== 1) {
          throw new Error('Please upload exactly 1 PDF file to split');
        }
        result = await splitPdf(files[0], {
          mode: 'pages',
          pageNumbers: [1]
        });
        break;

      case 'extract-pages': {
        if (files.length !== 1) {
          throw new Error('Please upload exactly 1 PDF file');
        }
        const pagesToExtract = parameters.pages || [1];
        result = await extractPages(files[0], pagesToExtract);
        break;
      }

      case 'remove-pages': {
        if (files.length !== 1) {
          throw new Error('Please upload exactly 1 PDF file');
        }
        const pagesToRemove = parameters.pages || [1];
        result = await removePages(files[0], pagesToRemove);
        break;
      }

      case 'organize': {
        if (files.length !== 1) {
          throw new Error('Please upload exactly 1 PDF file');
        }
        const pageOrder = parameters.pageOrder || [1];
        result = await organizePdf(files[0], pageOrder);
        break;
      }

      case 'compress':
        if (files.length !== 1) {
          throw new Error('Please upload exactly 1 PDF file');
        }
        result = await compressPdf(files[0]);
        break;

      case 'to-jpg': {
        if (files.length !== 1) {
          throw new Error('Please upload exactly 1 PDF file');
        }
        const quality = parameters.quality ?? 80;
        const dpi = parameters.dpi ?? 300;
        const grayscale = parameters.grayscale ?? false;
        const isZip = parameters.isZip ?? false;
        result = await pdfToJpg(files, { quality, dpi, grayscale, isZip });
        break;
      }

      case 'from-jpg':
        if (files.length === 0) {
          throw new Error('Please upload at least 1 image file');
        }
        result = await jpgToPdf(files);
        break;

      case 'to-png':
        if (files.length !== 1) {
          throw new Error('Please upload exactly 1 PDF file');
        }
        result = await pdfToPng(files[0]);
        break;

      case 'from-png':
        if (files.length === 0) {
          throw new Error('Please upload at least 1 PNG file');
        }
        result = await pngToPdf(files);
        break;

      case 'rotate': {
        if (files.length !== 1) {
          throw new Error('Please upload exactly 1 PDF file');
        }
        const rotation = parameters.rotation || 90;
        result = await rotatePdf(files[0], rotation);
        break;
      }

      case 'watermark': {
        if (files.length !== 1) {
          throw new Error('Please upload exactly 1 PDF file');
        }
        const watermarkText = parameters.text || 'Watermarked';
        result = await addWatermark(files[0], watermarkText);
        break;
      }

      case 'page-numbers': {
        if (files.length !== 1) {
          throw new Error('Please upload exactly 1 PDF file');
        }
        const position = parameters.position || 'bottom-center';
        result = await addPageNumbers(files[0], position);
        break;
      }

      case 'crop': {
        if (files.length !== 1) {
          throw new Error('Please upload exactly 1 PDF file');
        }
        const cropBox = parameters.cropBox || { x: 0, y: 0, width: 612, height: 792 };
        result = await cropPdf(files[0], cropBox);
        break;
      }

      case 'background': {
        if (files.length !== 1) {
          throw new Error('Please upload exactly 1 PDF file');
        }
        const backgroundColor = parameters.color || '#f0f0f0';
        result = await addBackground(files[0], backgroundColor);
        break;
      }

      case 'header-footer': {
        if (files.length !== 1) {
          throw new Error('Please upload exactly 1 PDF file');
        }
        const header = parameters.header || '';
        const footer = parameters.footer || '';
        result = await addHeaderFooter(files[0], header, footer);
        break;
      }



      case 'to-text':
        if (files.length !== 1) {
          throw new Error('Please upload exactly 1 PDF file');
        }
        result = await extractText(files[0]);
        break;

      case 'text-to-pdf': {
        const text = parameters.text || '';
        if (!text.trim()) {
          throw new Error('Please enter some text to convert');
        }
        result = await textToPdf(text);
        break;
      }

      case 'compare':
        if (files.length !== 2) {
          throw new Error('Please upload exactly 2 PDF files to compare');
        }
        result = await comparePdfs(files);
        break;

      case 'metadata': {
        if (files.length !== 1) {
          throw new Error('Please upload exactly 1 PDF file');
        }
        const info = await getPdfInfo(files[0]);
        result = await textToPdf(
          `PDF Metadata Report\n\n` +
          `File: ${info.fileName}\n` +
          `Pages: ${info.pageCount}\n` +
          `Size: ${(info.fileSize / 1024 / 1024).toFixed(2)} MB`
        );
        break;
      }

      default:
        throw new Error(`Tool '${toolId}' is not supported`);
    }

    if (!result.success) {
      throw new Error(result.error || 'Processing failed');
    }

    // Create download URL
    const downloadUrl = URL.createObjectURL(result.blob!);

    return {
      success: true,
      blob: result.blob,
      filename: result.filename,
      downloadUrl
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}

/**
 * Download processed file
 */
export function downloadResult(result: ClientToolResult, filename?: string) {
  if (!result.success || !result.downloadUrl) {
    throw new Error('No valid result to download');
  }

  const link = document.createElement('a');
  link.href = result.downloadUrl;
  link.download = filename || result.filename || 'processed.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object after download
  setTimeout(() => {
    URL.revokeObjectURL(result.downloadUrl!);
  }, 100);
}
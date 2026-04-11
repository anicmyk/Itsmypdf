import { PDFDocument, PDFDict, PDFName, PDFStream } from 'pdf-lib';

export type CompressionMode = 'smart' | 'aggressive' | 'lossless';
export type CompressionLevel = 'low' | 'balanced' | 'strong' | 'maximum';

export type PdfContentType =
  | 'small'
  | 'text-heavy'
  | 'mixed'
  | 'image-heavy'
  | 'scanned'
  | 'already-optimized'
  | 'unknown';

export type AnalysisStatus = 'ready' | 'encrypted' | 'corrupted';

export interface CompressionEstimate {
  minBytes: number;
  maxBytes: number;
  minReductionPercent: number;
  maxReductionPercent: number;
  confidence: 'low' | 'medium' | 'high';
  summary: string;
  bestEffort: boolean;
}

export interface PdfCompressionAnalysis {
  fileName: string;
  fileSizeBytes: number;
  pageCount: number;
  status: AnalysisStatus;
  contentType: PdfContentType;
  textPages: number;
  imagePages: number;
  imageCount: number;
  imageBytes: number;
  maxImageWidth: number;
  maxImageHeight: number;
  embeddedFontCount: number;
  embeddedFontSubsetCount: number;
  metadataFieldCount: number;
  metadataStreamBytes: number;
  hasMetadataStream: boolean;
  notes: string[];
  warnings: string[];
  canCompressMeaningfully: boolean;
  recommendedMode: CompressionMode;
  recommendedLevel: CompressionLevel;
  riskLevel: 'low' | 'medium' | 'high';
  estimateByMode: Record<CompressionMode, CompressionEstimate>;
}

const MIN_REASONABLE_OUTPUT_BYTES = 1024;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

function formatPercent(value: number) {
  return `${Math.max(0, Math.round(value))}%`;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (!value || typeof value !== 'object') return null;
  const maybeNumber = value as { asNumber?: () => number; value?: number; number?: number };
  if (typeof maybeNumber.asNumber === 'function') {
    const n = maybeNumber.asNumber();
    return Number.isFinite(n) ? n : null;
  }
  if (typeof maybeNumber.value === 'number' && Number.isFinite(maybeNumber.value)) return maybeNumber.value;
  if (typeof maybeNumber.number === 'number' && Number.isFinite(maybeNumber.number)) return maybeNumber.number;
  return null;
}

function buildRangeLabel(minBytes: number, maxBytes: number) {
  return `${formatBytes(minBytes)} to ${formatBytes(maxBytes)}`;
}

function isLikelyPasswordError(error: unknown) {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /password|encrypted|permission|authentication/i.test(message);
}

function isLikelyCorruptionError(error: unknown) {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /corrupt|invalid|xref|unexpected|failed to parse|malformed/i.test(message);
}

function getPdfjsOps(pdfjsLib: any) {
  const ops = pdfjsLib.OPS ?? {};
  return new Set<number>([
    ops.paintImageXObject,
    ops.paintImageMaskXObject,
    ops.paintJpegXObject,
    ops.paintInlineImageXObject,
    ops.paintInlineImageXObjectGroup
  ].filter((value): value is number => typeof value === 'number'));
}

function countMetadataFields(pdfDoc: PDFDocument, hasMetadataStream: boolean) {
  const fields = [
    pdfDoc.getTitle?.(),
    pdfDoc.getAuthor?.(),
    pdfDoc.getSubject?.(),
    pdfDoc.getKeywords?.(),
    pdfDoc.getCreator?.(),
    pdfDoc.getProducer?.()
  ];

  return fields.filter((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return typeof value === 'string' && value.trim().length > 0;
  }).length + (hasMetadataStream ? 1 : 0);
}

function inspectPageResources(pdfDoc: PDFDocument) {
  const context = pdfDoc.context;
  const pages = pdfDoc.getPages();

  let imageCount = 0;
  let imageBytes = 0;
  let maxImageWidth = 0;
  let maxImageHeight = 0;
  let embeddedFontCount = 0;
  let embeddedFontSubsetCount = 0;

  for (const page of pages) {
    const pageDict = page.node as unknown as PDFDict;
    const resources = pageDict.get(PDFName.of('Resources'));
    if (!(resources instanceof PDFDict)) continue;

    const xObjects = resources.get(PDFName.of('XObject'));
    if (xObjects instanceof PDFDict) {
      for (const key of xObjects.keys()) {
        const ref = xObjects.get(key);
        if (!ref) continue;

        const xObject = context.lookup(ref);
        if (!(xObject instanceof PDFStream)) continue;

        const dict = xObject.dict;
        const subtype = dict.get(PDFName.of('Subtype'));
        if (!subtype || subtype.toString() !== '/Image') continue;

        imageCount += 1;
        const width = toNumber(dict.get(PDFName.of('Width')));
        const height = toNumber(dict.get(PDFName.of('Height')));
        if (width) maxImageWidth = Math.max(maxImageWidth, Math.round(width));
        if (height) maxImageHeight = Math.max(maxImageHeight, Math.round(height));

        try {
          imageBytes += xObject.getContents().length;
        } catch {
          // If contents cannot be inspected, keep going with the count only.
        }
      }
    }

    const fonts = resources.get(PDFName.of('Font'));
    if (fonts instanceof PDFDict) {
      for (const key of fonts.keys()) {
        const ref = fonts.get(key);
        if (!ref) continue;

        const font = context.lookup(ref);
        if (!(font instanceof PDFDict)) continue;

        const baseFont = font.get(PDFName.of('BaseFont'))?.toString() ?? '';
        if (baseFont.includes('+')) {
          embeddedFontSubsetCount += 1;
        }

        const descriptor = font.get(PDFName.of('FontDescriptor'));
        if (descriptor) {
          const descriptorDict = context.lookup(descriptor);
          if (descriptorDict instanceof PDFDict) {
            const embeddedFont =
              descriptorDict.get(PDFName.of('FontFile')) ||
              descriptorDict.get(PDFName.of('FontFile2')) ||
              descriptorDict.get(PDFName.of('FontFile3'));
            if (embeddedFont) {
              embeddedFontCount += 1;
            }
          }
        }
      }
    }
  }

  return { imageCount, imageBytes, maxImageWidth, maxImageHeight, embeddedFontCount, embeddedFontSubsetCount };
}

async function inspectPageContent(arrayBuffer: ArrayBuffer, pdfjsLib: any) {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  try {
    const pdf = await loadingTask.promise;
    const ops = getPdfjsOps(pdfjsLib);
    const pageCount = pdf.numPages ?? 0;
    let textPages = 0;
    let imagePages = 0;

    for (let i = 1; i <= pageCount; i += 1) {
      const page = await pdf.getPage(i);
      const [textContent, operatorList] = await Promise.all([
        page.getTextContent(),
        page.getOperatorList()
      ]);

      const textItems = (textContent.items as Array<{ str?: string }>).filter((item) => {
        return typeof item.str === 'string' && item.str.trim().length > 0;
      }).length;

      if (textItems > 0) {
        textPages += 1;
      }

      const hasImageOps = operatorList.fnArray.some((fn: number) => ops.has(fn));
      if (hasImageOps) {
        imagePages += 1;
      }
    }

    return { status: 'ready' as const, pageCount, textPages, imagePages };
  } catch (error) {
    if (isLikelyPasswordError(error)) {
      return { status: 'encrypted' as const, pageCount: 0, textPages: 0, imagePages: 0, error };
    }

    if (isLikelyCorruptionError(error)) {
      return { status: 'corrupted' as const, pageCount: 0, textPages: 0, imagePages: 0, error };
    }

    return { status: 'corrupted' as const, pageCount: 0, textPages: 0, imagePages: 0, error };
  } finally {
    loadingTask.destroy?.();
  }
}

function classifyContentType(input: {
  fileSizeBytes: number;
  pageCount: number;
  textPages: number;
  imagePages: number;
  imageCount: number;
  imageBytes: number;
  maxImageWidth: number;
  maxImageHeight: number;
  embeddedFontCount: number;
  metadataFieldCount: number;
}) {
  const {
    fileSizeBytes,
    pageCount,
    textPages,
    imagePages,
    imageCount,
    imageBytes,
    maxImageWidth,
    maxImageHeight,
    embeddedFontCount,
    metadataFieldCount
  } = input;

  if (fileSizeBytes <= 256 * 1024 || pageCount <= 2) {
    return 'small' as const;
  }

  const textRatio = pageCount > 0 ? textPages / pageCount : 0;
  const imageRatio = pageCount > 0 ? imagePages / pageCount : 0;
  const imageShare = fileSizeBytes > 0 ? imageBytes / fileSizeBytes : 0;
  const hasLargeImages = maxImageWidth >= 2400 || maxImageHeight >= 2400;

  if (imageRatio >= 0.8 && textRatio <= 0.2) {
    return 'scanned' as const;
  }

  if (imageRatio >= 0.45 && textRatio <= 0.65) {
    return 'image-heavy' as const;
  }

  if (hasLargeImages && imageCount > 0 && textRatio <= 0.8) {
    return 'image-heavy' as const;
  }

  if (textRatio >= 0.7 && imageCount <= Math.max(1, Math.ceil(pageCount * 0.35))) {
    return 'text-heavy' as const;
  }

  if (imageShare <= 0.18 && metadataFieldCount === 0 && embeddedFontCount > 0) {
    return 'already-optimized' as const;
  }

  if (imageCount > 0 || embeddedFontCount > 0) {
    return 'mixed' as const;
  }

  return 'unknown' as const;
}

function estimateReductionRange(contentType: PdfContentType, mode: CompressionMode, level: CompressionLevel) {
  const baseByMode: Record<CompressionMode, Record<PdfContentType, [number, number]>> = {
    lossless: {
      small: [0.01, 0.03],
      'text-heavy': [0.02, 0.08],
      mixed: [0.02, 0.10],
      'image-heavy': [0.01, 0.08],
      scanned: [0.01, 0.08],
      'already-optimized': [0.00, 0.05],
      unknown: [0.01, 0.08]
    },
    smart: {
      small: [0.00, 0.05],
      'text-heavy': [0.03, 0.10],
      mixed: [0.12, 0.38],
      'image-heavy': [0.18, 0.45],
      scanned: [0.22, 0.55],
      'already-optimized': [0.02, 0.12],
      unknown: [0.08, 0.30]
    },
    aggressive: {
      small: [0.02, 0.10],
      'text-heavy': [0.10, 0.35],
      mixed: [0.25, 0.60],
      'image-heavy': [0.35, 0.75],
      scanned: [0.40, 0.82],
      'already-optimized': [0.10, 0.35],
      unknown: [0.20, 0.55]
    }
  };

  const levelAdjustments: Record<CompressionLevel, [number, number]> = {
    low: [0.65, 0.85],
    balanced: [1, 1],
    strong: [1.12, 1.18],
    maximum: [1.25, 1.35]
  };

  const [baseMin, baseMax] = baseByMode[mode][contentType];
  const [minAdjust, maxAdjust] = levelAdjustments[level];

  const minReduction = clamp(baseMin * minAdjust, 0, 0.95);
  const maxReduction = clamp(baseMax * maxAdjust, minReduction, 0.97);

  return { minReduction, maxReduction };
}

function deriveBestEffortSummary(contentType: PdfContentType, mode: CompressionMode, pageCount: number) {
  if (mode === 'lossless') {
    return 'Metadata cleanup only. Quality stays intact, but savings are usually small.';
  }

  if (contentType === 'small') {
    return 'This PDF is already small, so only minor savings are realistic.';
  }

  if (contentType === 'text-heavy') {
    return 'Text-heavy PDFs usually compress only a little unless the metadata is noisy.';
  }

  if (contentType === 'scanned' || contentType === 'image-heavy') {
    return `This looks image-heavy across ${pageCount} pages, so larger savings are possible if you accept some quality loss.`;
  }

  if (contentType === 'already-optimized') {
    return 'This PDF already looks optimized. Compression gains will likely be modest.';
  }

  return 'This file looks compressible, but exact savings depend on image quality, fonts, and existing encoding.';
}

export function estimateCompressionOutcome(
  analysis: PdfCompressionAnalysis,
  mode: CompressionMode,
  level: CompressionLevel
): CompressionEstimate {
  const { minReduction, maxReduction } = estimateReductionRange(analysis.contentType, mode, level);
  const minBytes = Math.max(
    MIN_REASONABLE_OUTPUT_BYTES,
    Math.round(analysis.fileSizeBytes * (1 - maxReduction))
  );
  const maxBytes = Math.max(
    minBytes,
    Math.round(analysis.fileSizeBytes * (1 - minReduction))
  );

  const confidence =
    analysis.status !== 'ready'
      ? 'low'
      : analysis.contentType === 'small' || analysis.contentType === 'already-optimized'
        ? 'medium'
        : analysis.contentType === 'unknown'
          ? 'low'
          : 'high';

  const summary = buildRangeLabel(minBytes, maxBytes);

  return {
    minBytes,
    maxBytes,
    minReductionPercent: Math.round(minReduction * 100),
    maxReductionPercent: Math.round(maxReduction * 100),
    confidence,
    summary,
    bestEffort: true
  };
}

export function estimateReadableCompressionOutcome(
  analysis: PdfCompressionAnalysis,
  mode: CompressionMode,
  level: CompressionLevel
) {
  const estimate = estimateCompressionOutcome(analysis, mode, level);
  const reductionRange = `${formatPercent(estimate.minReductionPercent)} to ${formatPercent(estimate.maxReductionPercent)}`;

  return {
    ...estimate,
    reductionRange,
    outputRangeLabel: buildRangeLabel(estimate.minBytes, estimate.maxBytes),
    fileSizeLabel: formatBytes(analysis.fileSizeBytes)
  };
}

export async function analyzePdfCompression(file: File): Promise<PdfCompressionAnalysis> {
  const arrayBuffer = await file.arrayBuffer();

  const pdfjsLib = await import('pdfjs-dist');
  if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  }

  const inspectResult = await inspectPageContent(arrayBuffer, pdfjsLib);
  if (inspectResult.status !== 'ready') {
    return {
      fileName: file.name,
      fileSizeBytes: file.size,
      pageCount: inspectResult.pageCount,
      status: inspectResult.status,
      contentType: 'unknown',
      textPages: inspectResult.textPages,
      imagePages: inspectResult.imagePages,
      imageCount: 0,
      imageBytes: 0,
      maxImageWidth: 0,
      maxImageHeight: 0,
      embeddedFontCount: 0,
      embeddedFontSubsetCount: 0,
      metadataFieldCount: 0,
      metadataStreamBytes: 0,
      hasMetadataStream: false,
      notes: inspectResult.status === 'encrypted'
        ? ['This PDF appears to be password-protected or encrypted.']
        : ['This PDF could not be parsed cleanly. It may be corrupted.'],
      warnings: inspectResult.status === 'encrypted'
        ? ['Password-protected PDFs cannot be compressed in the browser until unlocked.']
        : ['Corrupted PDFs may fail during compression or export.'],
      canCompressMeaningfully: false,
      recommendedMode: 'lossless',
      recommendedLevel: 'balanced',
      riskLevel: 'high',
      estimateByMode: {
        lossless: {
          minBytes: file.size,
          maxBytes: file.size,
          minReductionPercent: 0,
          maxReductionPercent: 0,
          confidence: 'low',
          summary: formatBytes(file.size),
          bestEffort: true
        },
        smart: {
          minBytes: file.size,
          maxBytes: file.size,
          minReductionPercent: 0,
          maxReductionPercent: 0,
          confidence: 'low',
          summary: formatBytes(file.size),
          bestEffort: true
        },
        aggressive: {
          minBytes: file.size,
          maxBytes: file.size,
          minReductionPercent: 0,
          maxReductionPercent: 0,
          confidence: 'low',
          summary: formatBytes(file.size),
          bestEffort: true
        }
      }
    };
  }

  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const resourceStats = inspectPageResources(pdfDoc);

  const catalog = (pdfDoc as unknown as { catalog?: PDFDict }).catalog;
  const metadataRef = catalog?.get?.(PDFName.of('Metadata'));
  let metadataStreamBytes = 0;
  let hasMetadataStream = false;

  try {
    const metadataStream = metadataRef ? pdfDoc.context.lookup(metadataRef) : null;
    if (metadataStream instanceof PDFStream) {
      hasMetadataStream = true;
      metadataStreamBytes = metadataStream.getContents().length;
    }
  } catch {
    // Ignore catalog lookup issues and keep going with field-based metadata detection.
  }

  const metadataFieldCount = countMetadataFields(pdfDoc, hasMetadataStream);
  const contentType = classifyContentType({
    fileSizeBytes: file.size,
    pageCount: inspectResult.pageCount,
    textPages: inspectResult.textPages,
    imagePages: inspectResult.imagePages,
    imageCount: resourceStats.imageCount,
    imageBytes: resourceStats.imageBytes,
    maxImageWidth: resourceStats.maxImageWidth,
    maxImageHeight: resourceStats.maxImageHeight,
    embeddedFontCount: resourceStats.embeddedFontCount,
    metadataFieldCount
  });

  const notes: string[] = [];
  const warnings: string[] = [];

  if (contentType === 'small') {
    notes.push('This PDF is already small. Only minor compression is likely.');
  } else if (contentType === 'text-heavy') {
    notes.push('This is mostly text. Compression usually comes from metadata cleanup and object stream packing.');
  } else if (contentType === 'mixed') {
    notes.push('This file mixes text and images. Smart compression can reduce image sizes without rasterizing everything.');
  } else if (contentType === 'image-heavy' || contentType === 'scanned') {
    notes.push('This looks image-heavy or scanned. Larger savings are possible, but quality loss becomes more likely.');
  } else if (contentType === 'already-optimized') {
    notes.push('This PDF already looks optimized. Only modest gains are likely.');
  } else {
    notes.push('The file structure is unusual, so compression estimates are conservative.');
  }

  if (metadataFieldCount > 0) {
    notes.push('Metadata fields were detected, so cleanup can help a little.');
  }

  if (resourceStats.embeddedFontCount > 0) {
    notes.push('Embedded fonts were detected. Font data usually does not compress much.');
  }

  if (resourceStats.embeddedFontSubsetCount > 0) {
    notes.push('Some fonts appear to be subset-embedded already, which limits additional savings.');
  }

  if (resourceStats.maxImageWidth > 0 || resourceStats.maxImageHeight > 0) {
    notes.push(
      resourceStats.maxImageWidth > 0 && resourceStats.maxImageHeight > 0
        ? `Largest embedded image: ${resourceStats.maxImageWidth} x ${resourceStats.maxImageHeight}px.`
        : 'Embedded image dimensions were partially detected.'
    );
  }

  if (resourceStats.maxImageWidth >= 2400 || resourceStats.maxImageHeight >= 2400) {
    notes.push('Large images were detected, so downsampling may create meaningful savings.');
  }

  if (resourceStats.imageCount === 0 && inspectResult.textPages === inspectResult.pageCount && inspectResult.pageCount > 0) {
    warnings.push('This is a text-only PDF. Large size reductions are unlikely.');
  }

  if (file.size < 150 * 1024) {
    warnings.push('Very small PDFs can become slightly larger after re-saving.');
  }

  const smartEstimate = estimateCompressionOutcome(
    {
      fileName: file.name,
      fileSizeBytes: file.size,
      pageCount: inspectResult.pageCount,
      status: 'ready',
      contentType,
      textPages: inspectResult.textPages,
      imagePages: inspectResult.imagePages,
      imageCount: resourceStats.imageCount,
      imageBytes: resourceStats.imageBytes,
      maxImageWidth: resourceStats.maxImageWidth,
      maxImageHeight: resourceStats.maxImageHeight,
      embeddedFontCount: resourceStats.embeddedFontCount,
      embeddedFontSubsetCount: resourceStats.embeddedFontSubsetCount,
      metadataFieldCount,
      metadataStreamBytes,
      hasMetadataStream,
      notes,
      warnings,
      canCompressMeaningfully: true,
      recommendedMode: 'smart',
      recommendedLevel: 'balanced',
      riskLevel: 'medium',
      estimateByMode: {} as Record<CompressionMode, CompressionEstimate>
    },
    'smart',
    'balanced'
  );

  const aggressiveEstimate = estimateCompressionOutcome(
    {
      fileName: file.name,
      fileSizeBytes: file.size,
      pageCount: inspectResult.pageCount,
      status: 'ready',
      contentType,
      textPages: inspectResult.textPages,
      imagePages: inspectResult.imagePages,
      imageCount: resourceStats.imageCount,
      imageBytes: resourceStats.imageBytes,
      maxImageWidth: resourceStats.maxImageWidth,
      maxImageHeight: resourceStats.maxImageHeight,
      embeddedFontCount: resourceStats.embeddedFontCount,
      embeddedFontSubsetCount: resourceStats.embeddedFontSubsetCount,
      metadataFieldCount,
      metadataStreamBytes,
      hasMetadataStream,
      notes,
      warnings,
      canCompressMeaningfully: true,
      recommendedMode: 'smart',
      recommendedLevel: 'balanced',
      riskLevel: 'medium',
      estimateByMode: {} as Record<CompressionMode, CompressionEstimate>
    },
    'aggressive',
    contentType === 'small' ? 'balanced' : 'maximum'
  );

  const losslessEstimate = estimateCompressionOutcome(
    {
      fileName: file.name,
      fileSizeBytes: file.size,
      pageCount: inspectResult.pageCount,
      status: 'ready',
      contentType,
      textPages: inspectResult.textPages,
      imagePages: inspectResult.imagePages,
      imageCount: resourceStats.imageCount,
      imageBytes: resourceStats.imageBytes,
      maxImageWidth: resourceStats.maxImageWidth,
      maxImageHeight: resourceStats.maxImageHeight,
      embeddedFontCount: resourceStats.embeddedFontCount,
      embeddedFontSubsetCount: resourceStats.embeddedFontSubsetCount,
      metadataFieldCount,
      metadataStreamBytes,
      hasMetadataStream,
      notes,
      warnings,
      canCompressMeaningfully: true,
      recommendedMode: 'smart',
      recommendedLevel: 'balanced',
      riskLevel: 'medium',
      estimateByMode: {} as Record<CompressionMode, CompressionEstimate>
    },
    'lossless',
    'balanced'
  );

  const canCompressMeaningfully =
    contentType !== 'small' &&
    contentType !== 'already-optimized' &&
    (resourceStats.imageCount > 0 || metadataFieldCount > 0 || inspectResult.textPages < inspectResult.pageCount);

  const recommendedMode: CompressionMode =
    contentType === 'scanned' || contentType === 'image-heavy'
      ? 'smart'
      : contentType === 'small'
        ? 'lossless'
        : 'smart';

  const recommendedLevel: CompressionLevel =
    contentType === 'scanned' || contentType === 'image-heavy'
      ? 'strong'
      : contentType === 'mixed'
        ? 'balanced'
        : 'low';

  return {
    fileName: file.name,
    fileSizeBytes: file.size,
    pageCount: inspectResult.pageCount,
    status: 'ready',
    contentType,
    textPages: inspectResult.textPages,
    imagePages: inspectResult.imagePages,
    imageCount: resourceStats.imageCount,
    imageBytes: resourceStats.imageBytes,
    maxImageWidth: resourceStats.maxImageWidth,
    maxImageHeight: resourceStats.maxImageHeight,
    embeddedFontCount: resourceStats.embeddedFontCount,
    embeddedFontSubsetCount: resourceStats.embeddedFontSubsetCount,
    metadataFieldCount,
    metadataStreamBytes,
    hasMetadataStream,
    notes,
    warnings,
    canCompressMeaningfully,
    recommendedMode,
    recommendedLevel,
    riskLevel:
      contentType === 'small' || contentType === 'already-optimized'
        ? 'low'
        : contentType === 'scanned' || contentType === 'image-heavy'
          ? 'high'
          : 'medium',
    estimateByMode: {
      lossless: losslessEstimate,
      smart: smartEstimate,
      aggressive: aggressiveEstimate
    }
  };
}

export function buildCompressionSummary(
  analysis: PdfCompressionAnalysis,
  mode: CompressionMode,
  level: CompressionLevel
) {
  const estimate = estimateCompressionOutcome(analysis, mode, level);
  const bestEffortPrefix = estimate.bestEffort ? 'Best effort estimate: ' : '';
  return {
    ...estimate,
    summary: `${bestEffortPrefix}${estimate.summary}`,
    outputRangeLabel: buildRangeLabel(estimate.minBytes, estimate.maxBytes),
    fileSizeLabel: formatBytes(analysis.fileSizeBytes),
    reductionLabel: `${formatPercent(estimate.minReductionPercent)} to ${formatPercent(estimate.maxReductionPercent)}`,
    note: deriveBestEffortSummary(analysis.contentType, mode, analysis.pageCount)
  };
}

export function hasMeaningfulCompressionEstimate(analysis: PdfCompressionAnalysis) {
  return analysis.canCompressMeaningfully;
}

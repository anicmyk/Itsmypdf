import { init } from '@embedpdf/pdfium';
import type { EngineEditRequest, EngineTextRun } from '../lib/pdf-edit/types';

type WorkerRequest =
  | { id: number; type: 'init'; wasmUrl?: string }
  | { id: number; type: 'load'; data: ArrayBuffer }
  | { id: number; type: 'getPageTextRuns'; docId: string; pageIndex: number }
  | { id: number; type: 'applyEdits'; docId: string; edits: EngineEditRequest[] }
  | { id: number; type: 'close'; docId: string };

type WorkerErrorCode =
  | 'worker_init_failed'
  | 'wasm_fetch_failed'
  | 'pdfium_init_failed'
  | 'load_failed'
  | 'text_extraction_failed'
  | 'apply_edits_failed'
  | 'close_failed';

type WorkerStatusStage =
  | 'worker-script-loaded'
  | 'init-started'
  | 'wasm-fetch-started'
  | 'wasm-fetch-succeeded'
  | 'pdfium-init-started'
  | 'pdfium-init-succeeded';

type WorkerStatusMessage = {
  kind: 'status';
  stage: WorkerStatusStage;
  detail?: string;
  workerUrl?: string;
  wasmUrl?: string;
  statusCode?: number;
  requestId?: number;
};

type WorkerResponse =
  | { kind: 'response'; id: number; ok: true; result: any }
  | { kind: 'response'; id: number; ok: false; error: string; errorCode?: WorkerErrorCode; errorStage?: string };

type RunInternal = {
  id: string;
  pageIndex: number;
  text: string;
  bounds: { left: number; right: number; top: number; bottom: number };
  rotation: number;
  fontName?: string;
  fontSize?: number;
  objectId?: string;
  charStart: number;
  charEnd: number;
  lineCount: number;
  canEdit: boolean;
  supportReason?: string;
};

type DocState = {
  id: string;
  sourceBytes: Uint8Array;
  runsById: Map<string, RunInternal>;
};

let pdfium: any = null;
let moduleInstance: any = null;
let initialized = false;
let wasmUrl = '/pdfium.wasm';

const docs = new Map<string, DocState>();

type WorkerErrorInfo = Error & {
  code?: WorkerErrorCode;
  stage?: string;
};

const postStatus = (message: WorkerStatusMessage) => {
  (self as any).postMessage(message);
};

const createWorkerError = (message: string, code: WorkerErrorCode, stage: string): WorkerErrorInfo => {
  const error = new Error(message) as WorkerErrorInfo;
  error.code = code;
  error.stage = stage;
  return error;
};

const normalizeWorkerError = (err: unknown, fallbackCode: WorkerErrorCode, fallbackStage: string) => {
  if (err instanceof Error) {
    const typedError = err as WorkerErrorInfo;
    return {
      message: typedError.message,
      code: typedError.code ?? fallbackCode,
      stage: typedError.stage ?? fallbackStage
    };
  }

  return {
    message: String(err),
    code: fallbackCode,
    stage: fallbackStage
  };
};

const ensurePdfium = async (requestId?: number) => {
  if (initialized) return;
  postStatus({
    kind: 'status',
    stage: 'init-started',
    requestId,
    wasmUrl,
    detail: 'Worker is starting PDFium initialization.'
  });
  postStatus({
    kind: 'status',
    stage: 'wasm-fetch-started',
    requestId,
    wasmUrl,
    detail: `Fetching PDFium WASM from ${wasmUrl}.`
  });
  console.info('[edit-pdf][worker] Fetching PDFium WASM from', wasmUrl);
  let response: Response;
  try {
    response = await fetch(wasmUrl);
  } catch (err) {
    throw createWorkerError(
      `Failed to fetch PDFium WASM from ${wasmUrl}.`,
      'wasm_fetch_failed',
      'wasm-fetch'
    );
  }
  if (!response.ok) {
    throw createWorkerError(
      `Failed to fetch PDFium WASM (${response.status}) from ${wasmUrl}.`,
      'wasm_fetch_failed',
      'wasm-fetch'
    );
  }
  postStatus({
    kind: 'status',
    stage: 'wasm-fetch-succeeded',
    requestId,
    wasmUrl,
    statusCode: response.status,
    detail: `Fetched PDFium WASM with status ${response.status}.`
  });
  console.info('[edit-pdf][worker] PDFium WASM fetch succeeded', {
    url: wasmUrl,
    status: response.status
  });
  const wasmBinary = await response.arrayBuffer();
  postStatus({
    kind: 'status',
    stage: 'pdfium-init-started',
    requestId,
    wasmUrl,
    detail: `Initializing PDFium from ${wasmBinary.byteLength} bytes.`
  });
  try {
    pdfium = await init({ wasmBinary });
  } catch (err) {
    throw createWorkerError(
      err instanceof Error ? err.message : 'PDFium initialization failed.',
      'pdfium_init_failed',
      'pdfium-init'
    );
  }
  moduleInstance = pdfium.pdfium;
  if (pdfium.PDFiumExt_Init) {
    pdfium.PDFiumExt_Init();
  } else if (pdfium.FPDF_InitLibrary) {
    pdfium.FPDF_InitLibrary();
  }
  initialized = true;
  postStatus({
    kind: 'status',
    stage: 'pdfium-init-succeeded',
    requestId,
    wasmUrl,
    detail: 'PDFium initialized successfully.'
  });
  console.info('[edit-pdf][worker] PDFium initialized successfully');
};

const allocBytes = (bytes: Uint8Array) => {
  const ptr = moduleInstance.wasmExports.malloc(bytes.length);
  moduleInstance.HEAPU8.set(bytes, ptr);
  return { ptr, length: bytes.length };
};

const freePtr = (ptr: number) => {
  if (ptr) moduleInstance.wasmExports.free(ptr);
};

const loadDocumentFromBytes = (bytes: Uint8Array) => {
  const { ptr, length } = allocBytes(bytes);
  const docPtr = pdfium.FPDF_LoadMemDocument(ptr, length, 0);
  if (!docPtr) {
    const err = pdfium.FPDF_GetLastError?.() ?? 'unknown';
    freePtr(ptr);
    throw new Error(`Failed to load PDF document: ${err}`);
  }
  return { docPtr, dataPtr: ptr, dataLength: length };
};

const closeDocument = (docPtr: number, dataPtr: number) => {
  if (docPtr) pdfium.FPDF_CloseDocument(docPtr);
  if (dataPtr) freePtr(dataPtr);
};

const getCharBox = (textPage: number, index: number) => {
  // PDFium writes char boxes as doubles, so we need 4 * 8 bytes.
  const ptr = moduleInstance.wasmExports.malloc(32);
  const leftPtr = ptr;
  const rightPtr = ptr + 8;
  const bottomPtr = ptr + 16;
  const topPtr = ptr + 24;
  const ok = pdfium.FPDFText_GetCharBox(textPage, index, leftPtr, rightPtr, bottomPtr, topPtr);
  if (!ok) {
    freePtr(ptr);
    return null;
  }
  const left = moduleInstance.HEAPF64[leftPtr / 8];
  const right = moduleInstance.HEAPF64[rightPtr / 8];
  const bottom = moduleInstance.HEAPF64[bottomPtr / 8];
  const top = moduleInstance.HEAPF64[topPtr / 8];
  freePtr(ptr);
  return { left, right, bottom, top };
};

const getUtf16Text = (bufferPtr: number, byteLength: number) => {
  if (!bufferPtr || byteLength <= 2) return '';
  const length = byteLength / 2 - 1;
  const u16 = new Uint16Array(moduleInstance.HEAPU16.buffer, bufferPtr, length);
  let result = '';
  for (let i = 0; i < u16.length; i += 1) {
    result += String.fromCharCode(u16[i]);
  }
  return result;
};

const readFontName = (textObject: number) => {
  if (!pdfium.FPDFTextObj_GetFontName) return undefined;
  const needed = pdfium.FPDFTextObj_GetFontName(textObject, 0, 0);
  if (!needed) return undefined;
  const ptr = moduleInstance.wasmExports.malloc(needed);
  const written = pdfium.FPDFTextObj_GetFontName(textObject, ptr, needed);
  const name = getUtf16Text(ptr, written);
  freePtr(ptr);
  return name || undefined;
};

const decodeUnicode = (code: number) => {
  if (!code) return '';
  if (code <= 0xffff) return String.fromCharCode(code);
  return String.fromCodePoint(code);
};

const normalizeExtractedChar = (char: string) => {
  if (!char) return '';
  if (char === '\u0000' || char === '\r') return '';
  if (char === '\t' || char === '\f') return ' ';
  return char;
};

const normalizeExtractedText = (text: string) => (
  text
    .replace(/\u0000/g, '')
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
);

const utf16leBuffer = (text: string) => {
  const buffer = new Uint16Array(text.length + 1);
  for (let i = 0; i < text.length; i += 1) {
    buffer[i] = text.charCodeAt(i);
  }
  buffer[text.length] = 0;
  return buffer;
};

const setTextObjectText = (textObject: number, text: string) => {
  if (!pdfium.FPDFText_SetText) return false;
  const utf16 = utf16leBuffer(text);
  const byteLength = utf16.byteLength;
  const ptr = moduleInstance.wasmExports.malloc(byteLength);
  moduleInstance.HEAPU16.set(utf16, ptr / 2);
  const ok = pdfium.FPDFText_SetText(textObject, ptr);
  freePtr(ptr);
  return !!ok;
};

const saveDocumentToBuffer = (docPtr: number) => {
  if (!moduleInstance.addFunction || !moduleInstance.removeFunction) {
    throw new Error('PDFium WASM module does not expose addFunction; save is unavailable.');
  }

  const chunks: Uint8Array[] = [];
  const writeBlock = (pThis: number, dataPtr: number, size: number) => {
    const data = moduleInstance.HEAPU8.slice(dataPtr, dataPtr + size);
    chunks.push(data);
    return 1;
  };

  const writePtr = moduleInstance.addFunction(writeBlock, 'iiii');
  const structPtr = moduleInstance.wasmExports.malloc(8);
  moduleInstance.HEAPU32[structPtr / 4] = 1;
  moduleInstance.HEAPU32[structPtr / 4 + 1] = writePtr;

  const ok = pdfium.FPDF_SaveAsCopy(docPtr, structPtr, 0);

  moduleInstance.removeFunction(writePtr);
  freePtr(structPtr);

  if (!ok) {
    throw new Error('FPDF_SaveAsCopy failed');
  }

  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    out.set(chunk, offset);
    offset += chunk.length;
  });

  return out.buffer;
};

const buildRunsForPage = (docId: string, docPtr: number, pageIndex: number) => {
  const pagePtr = pdfium.FPDF_LoadPage(docPtr, pageIndex);
  if (!pagePtr) return [] as RunInternal[];
  const textPage = pdfium.FPDFText_LoadPage(pagePtr);
  if (!textPage) {
    pdfium.FPDF_ClosePage(pagePtr);
    return [] as RunInternal[];
  }

  const charCount = pdfium.FPDFText_CountChars(textPage);
  const chars: {
    index: number;
    text: string;
    left: number;
    right: number;
    bottom: number;
    top: number;
    centerY: number;
    fontSize: number;
    angle: number;
    objectPtr?: number;
  }[] = [];

  for (let i = 0; i < charCount; i += 1) {
    const box = getCharBox(textPage, i);
    if (!box) continue;
    const code = pdfium.FPDFText_GetUnicode(textPage, i);
    const char = normalizeExtractedChar(decodeUnicode(code));
    if (!char) continue;

    const fontSize = pdfium.FPDFText_GetFontSize ? pdfium.FPDFText_GetFontSize(textPage, i) : box.top - box.bottom;
    const angle = pdfium.FPDFText_GetCharAngle ? pdfium.FPDFText_GetCharAngle(textPage, i) : 0;
    const objectPtr = pdfium.FPDFText_GetTextObject ? pdfium.FPDFText_GetTextObject(textPage, i) : undefined;

    chars.push({
      index: i,
      text: char,
      left: box.left,
      right: box.right,
      bottom: box.bottom,
      top: box.top,
      centerY: (box.top + box.bottom) / 2,
      fontSize,
      angle,
      objectPtr
    });
  }

  chars.sort((a, b) => a.index - b.index);

  const segments: typeof chars[] = [];
  let currentSegment: typeof chars[number][] = [];

  chars.forEach((char) => {
    const previous = currentSegment[currentSegment.length - 1];
    if (!previous || previous.objectPtr === char.objectPtr) {
      currentSegment.push(char);
      return;
    }

    segments.push(currentSegment);
    currentSegment = [char];
  });

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  const runs: RunInternal[] = [];
  let runIndex = 0;

  segments.forEach((segment) => {
    if (segment.length === 0) return;

    const fontSize = Math.max(...segment.map((c) => c.fontSize));
    const rotation = segment.reduce((sum, c) => sum + c.angle, 0) / segment.length;
    const left = Math.min(...segment.map((c) => c.left));
    const right = Math.max(...segment.map((c) => c.right));
    const bottom = Math.min(...segment.map((c) => c.bottom));
    const top = Math.max(...segment.map((c) => c.top));
    const text = normalizeExtractedText(segment.map((char) => char.text).join(''));
    const objectPtr = segment[0]?.objectPtr;
    const lineCenters: number[] = [];

    segment
      .slice()
      .sort((a, b) => {
        const yDiff = b.centerY - a.centerY;
        if (Math.abs(yDiff) > 1) return yDiff;
        return a.left - b.left;
      })
      .forEach((char) => {
        const threshold = Math.max(char.fontSize * 0.55, 2);
        const clusterIndex = lineCenters.findIndex((center) => Math.abs(center - char.centerY) <= threshold);
        if (clusterIndex === -1) {
          lineCenters.push(char.centerY);
          return;
        }
        lineCenters[clusterIndex] = (lineCenters[clusterIndex] + char.centerY) / 2;
      });

    const lineCount = Math.max(lineCenters.length, 1);
    const hasExplicitLineBreak = /\n/.test(text);
    const trimmedText = text.trim();

    let canEdit = Boolean(objectPtr) && lineCount === 1 && !hasExplicitLineBreak && Math.abs(rotation) < 0.05 && trimmedText.length > 0;
    let supportReason = '';
    if (!objectPtr) {
      canEdit = false;
      supportReason = 'Text could not be mapped to a PDF text object.';
    } else if (lineCount > 1 || hasExplicitLineBreak) {
      canEdit = false;
      supportReason = 'Multi-line text is not yet supported for true editing.';
    } else if (Math.abs(rotation) >= 0.05) {
      canEdit = false;
      supportReason = 'Rotated text is not yet supported.';
    } else if (!trimmedText.length) {
      canEdit = false;
      supportReason = 'This text object does not contain editable text.';
    }

    const fontName = objectPtr ? readFontName(objectPtr) : undefined;
    const runId = `${docId}-${pageIndex}-${runIndex}`;
    runIndex += 1;

    const run: RunInternal = {
      id: runId,
      pageIndex,
      text: trimmedText,
      bounds: { left, right, top, bottom },
      rotation,
      fontName,
      fontSize,
      objectId: objectPtr ? String(objectPtr) : undefined,
      charStart: segment[0].index,
      charEnd: segment[segment.length - 1].index,
      lineCount,
      canEdit,
      supportReason
    };

    runs.push(run);
  });

  pdfium.FPDFText_ClosePage(textPage);
  pdfium.FPDF_ClosePage(pagePtr);

  return runs;
};

const resolveRunTextObject = (docPtr: number, run: RunInternal) => {
  const pagePtr = pdfium.FPDF_LoadPage(docPtr, run.pageIndex);
  if (!pagePtr) {
    throw new Error('Failed to load page for edit.');
  }

  const textPage = pdfium.FPDFText_LoadPage(pagePtr);
  if (!textPage) {
    pdfium.FPDF_ClosePage(pagePtr);
    throw new Error('Failed to load page text for edit.');
  }

  const objectPtr = pdfium.FPDFText_GetTextObject ? pdfium.FPDFText_GetTextObject(textPage, run.charStart) : 0;
  if (!objectPtr) {
    pdfium.FPDFText_ClosePage(textPage);
    pdfium.FPDF_ClosePage(pagePtr);
    throw new Error('Failed to resolve PDF text object for edit.');
  }

  for (let index = run.charStart; index <= run.charEnd; index += 1) {
    const currentObject = pdfium.FPDFText_GetTextObject ? pdfium.FPDFText_GetTextObject(textPage, index) : 0;
    if (currentObject !== objectPtr) {
      pdfium.FPDFText_ClosePage(textPage);
      pdfium.FPDF_ClosePage(pagePtr);
      throw new Error('This text block spans multiple PDF objects and cannot be edited safely.');
    }
  }

  pdfium.FPDFText_ClosePage(textPage);
  return { pagePtr, objectPtr };
};

const applyEditsToDocument = (docPtr: number, edits: EngineEditRequest[], runsById: Map<string, RunInternal>) => {
  const pagesTouched = new Set<number>();

  for (const edit of edits) {
    const run = runsById.get(edit.runId);
    if (!run) {
      throw new Error('Missing text object mapping for edit.');
    }
    if (!run.canEdit) {
      throw new Error(run.supportReason || 'This text run is not supported for true editing yet.');
    }

    const { pagePtr, objectPtr } = resolveRunTextObject(docPtr, run);

    const ok = setTextObjectText(objectPtr, edit.text);
    if (!ok) {
      pdfium.FPDF_ClosePage(pagePtr);
      throw new Error('Failed to set text for PDF object.');
    }

    pdfium.FPDFPage_GenerateContent(pagePtr);
    pdfium.FPDF_ClosePage(pagePtr);
    pagesTouched.add(run.pageIndex);
  }

  return pagesTouched;
};

postStatus({
  kind: 'status',
  stage: 'worker-script-loaded',
  workerUrl: self.location?.href,
  detail: 'Worker script loaded and waiting for messages.'
});

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const data = event.data;
  const respond = (payload: WorkerResponse) => {
    (self as any).postMessage(payload);
  };

  try {
    if (data.type === 'init') {
      if (data.wasmUrl) wasmUrl = data.wasmUrl;
      console.info('[edit-pdf][worker] init request received', { wasmUrl });
      await ensurePdfium(data.id);
      respond({ kind: 'response', id: data.id, ok: true, result: { ok: true } });
      return;
    }

    await ensurePdfium(data.id);

    if (data.type === 'load') {
      console.info('[edit-pdf][worker] load request received', { byteLength: data.data.byteLength });
      const bytes = new Uint8Array(data.data);
      const docId = `doc-${Math.random().toString(36).slice(2)}`;
      const { docPtr, dataPtr } = loadDocumentFromBytes(bytes);
      const pageCount = pdfium.FPDF_GetPageCount(docPtr);
      closeDocument(docPtr, dataPtr);

      docs.set(docId, {
        id: docId,
        sourceBytes: bytes,
        runsById: new Map()
      });

      respond({ kind: 'response', id: data.id, ok: true, result: { docId, pageCount } });
      console.info('[edit-pdf][worker] load request succeeded', { docId, pageCount });
      return;
    }

    if (data.type === 'getPageTextRuns') {
      console.info('[edit-pdf][worker] getPageTextRuns request received', {
        docId: data.docId,
        pageIndex: data.pageIndex
      });
      const state = docs.get(data.docId);
      if (!state) throw new Error('Document not loaded');

      const { docPtr, dataPtr } = loadDocumentFromBytes(state.sourceBytes);
      const runs = buildRunsForPage(state.id, docPtr, data.pageIndex);
      closeDocument(docPtr, dataPtr);

      runs.forEach((run) => state.runsById.set(run.id, run));

      const responseRuns: EngineTextRun[] = runs.map((run) => ({
        id: run.id,
        pageIndex: run.pageIndex,
        text: run.text,
        bounds: run.bounds,
        rotation: run.rotation,
        fontName: run.fontName,
        fontSize: run.fontSize,
        objectId: run.objectId,
        charRange: {
          start: run.charStart,
          end: run.charEnd
        },
        lineCount: run.lineCount,
        canEdit: run.canEdit,
        supportReason: run.supportReason
      }));

      respond({ kind: 'response', id: data.id, ok: true, result: { runs: responseRuns } });
      console.info('[edit-pdf][worker] getPageTextRuns request succeeded', {
        docId: data.docId,
        pageIndex: data.pageIndex,
        runCount: responseRuns.length,
        sampleRuns: responseRuns.slice(0, 6).map((run) => ({
          id: run.id,
          text: run.text,
          objectId: run.objectId,
          charRange: run.charRange,
          lineCount: run.lineCount,
          bounds: run.bounds,
          canEdit: run.canEdit,
          supportReason: run.supportReason
        }))
      });
      return;
    }

    if (data.type === 'applyEdits') {
      console.info('[edit-pdf][worker] applyEdits request received', {
        docId: data.docId,
        editCount: data.edits.length
      });
      const state = docs.get(data.docId);
      if (!state) throw new Error('Document not loaded');
      const { docPtr, dataPtr } = loadDocumentFromBytes(state.sourceBytes);

      applyEditsToDocument(docPtr, data.edits, state.runsById);
      const buffer = saveDocumentToBuffer(docPtr);

      closeDocument(docPtr, dataPtr);

      respond({ kind: 'response', id: data.id, ok: true, result: { bytes: buffer } });
      console.info('[edit-pdf][worker] applyEdits request succeeded', {
        docId: data.docId,
        byteLength: buffer.byteLength
      });
      return;
    }

    if (data.type === 'close') {
      console.info('[edit-pdf][worker] close request received', { docId: data.docId });
      docs.delete(data.docId);
      respond({ kind: 'response', id: data.id, ok: true, result: { ok: true } });
      return;
    }
  } catch (err: any) {
    const fallbackCodeByType: Record<WorkerRequest['type'], WorkerErrorCode> = {
      init: 'worker_init_failed',
      load: 'load_failed',
      getPageTextRuns: 'text_extraction_failed',
      applyEdits: 'apply_edits_failed',
      close: 'close_failed'
    };
    const fallbackStageByType: Record<WorkerRequest['type'], string> = {
      init: 'init',
      load: 'load',
      getPageTextRuns: 'text-extraction',
      applyEdits: 'apply-edits',
      close: 'close'
    };
    const normalized = normalizeWorkerError(
      err,
      fallbackCodeByType[data.type],
      fallbackStageByType[data.type]
    );
    console.error('[edit-pdf][worker] request failed', {
      type: data.type,
      error: normalized.message,
      errorCode: normalized.code,
      errorStage: normalized.stage
    });
    respond({
      kind: 'response',
      id: data.id,
      ok: false,
      error: normalized.message,
      errorCode: normalized.code,
      errorStage: normalized.stage
    });
  }
};

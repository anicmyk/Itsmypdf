# Edit PDF Engine Architecture

## Overview
The edit tool now separates the UI shell from the PDF engine. The UI still uses PDF.js for rendering and selection overlays, but real text edits are routed through PDFium (WebAssembly) running in a Web Worker. This removes the old "white patch overlay" approach and replaces it with true PDF content edits for supported cases.

## Implementation Plan (Concise)
1. Remove the canvas masking/overlay text replacement pipeline from the edit tool.
2. Keep the existing UI shell, selection UX, thumbnails, and edit panel unchanged.
3. Introduce a PDF engine adapter (`pdfiumClient.ts`) and a dedicated worker (`pdfEditWorker.ts`).
4. Map visible text runs to PDFium text objects using geometry and text object IDs.
5. Apply supported edits by updating the underlying text objects and re-rendering the edited PDF bytes.
6. Gate unsupported edits explicitly in the UI and block export when necessary.

## Old vs New Behavior
- Old: PDF.js text positions were used to mask the original canvas region and draw replacement text on top. Export used pdf-lib to draw a white rectangle and new text.
- New: PDFium is used to locate the underlying text objects and replace the text content in the PDF itself. Export saves a real PDF with modified content. The preview is a re-render of the edited PDF bytes.

## Supported True-Edit Cases (Current)
- Single-line, horizontal text runs (rotation near 0).
- Text runs that map to a single PDF text object.
- Same page, no reflow or OCR content.
- Text replacement only (font, color, alignment, and resizing are not yet applied in the engine).

## Unsupported Cases (Explicitly Gated)
- Rotated text.
- Text that spans multiple PDF objects/runs.
- Multi-line reflow, paragraph edits, or complex layout changes.
- Font or color changes, alignment changes, or moving/resizing the text box.
- OCR-only scanned pages.

## Engine + Worker Architecture
- UI layer: `src/components/pdf/edit/EditPdfTool.tsx`
- Engine adapter: `src/lib/pdf-edit/pdfiumClient.ts`
- Worker: `src/workers/pdfEditWorker.ts`

### Worker Message Contracts
- `init`: load PDFium WASM (`/pdfium.wasm`).
- `load`: cache the original PDF bytes and return `docId` and `pageCount`.
- `getPageTextRuns`: extract text runs (with bounds and object mapping).
- `applyEdits`: re-open from original bytes, apply edits, generate content, and export to `ArrayBuffer`.
- `close`: release document state.

## Mapping Visible Text to PDF Objects
PDFium text extraction uses character bounds to build single-line runs. Each run is mapped to the underlying PDF text object using `FPDFText_GetTextObject` and is flagged as editable only when the run resolves to a single object with no rotation.

## Font Strategy
- For true edits, the engine edits the original PDF text object, which preserves the embedded font and size when possible.
- If font metadata is missing or the text object cannot be edited, the run is marked unsupported and the UI blocks export.

## Future Extension Points
- Add support for multi-object runs by splitting and rebuilding text objects.
- Add font changes by inserting new text objects with custom fonts.
- Add color changes by reading and setting fill color on text objects.
- Add rotated text support by preserving the text matrix.

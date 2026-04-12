export type ToolHeroUI = {
  title: string;
  description: string;
  accept?: string;
  multiple?: boolean;
  buttonLabel?: string;
  dropLabel?: string;
};

export const TOOL_HERO_UI: Record<string, ToolHeroUI> = {
  'merge-pdf': {
    title: 'Merge PDF file',
    description: 'Combine multiple PDF files into a single document.',
    accept: 'application/pdf',
    multiple: true
  },
  'split-pdf': {
    title: 'Split PDF',
    description: 'Split PDF pages into multiple files',
    accept: 'application/pdf',
    multiple: false
  },
  'remove-pages': {
    title: 'Delete & Remove PDF Pages Online for Free',
    description: 'Securely delete unwanted pages from your document directly in your browser. No sign-ups, no watermarks, and completely free.',
    accept: 'application/pdf',
    multiple: false
  },
  'organize-pdf': {
    title: 'Organize PDF Pages Online Free',
    description: 'Rearrange, reorder, and move PDF pages in your browser. No sign-ups, no watermarks, and visual page previews.',
    accept: 'application/pdf',
    multiple: true
  },
  'compress-pdf': {
    title: 'Compress PDF Online Free',
    description: 'Reduce PDF file size with honest best-effort estimates, no signup, and no watermarks.',
    accept: 'application/pdf',
    multiple: true
  },
  'pdf-to-jpg': {
    title: 'PDF to JPG',
    description: 'Convert PDF pages to high-quality JPG images.',
    accept: 'application/pdf',
    multiple: true
  },
  'jpg-to-pdf': {
    title: 'JPG to PDF',
    description: 'Convert your images to PDF files instantly. Drag and drop or select images to get started.',
    accept: 'image/jpeg,image/jpg,image/png',
    multiple: true
  },
  'ocr-pdf': {
    title: 'OCR PDF',
    description: 'Make scanned PDFs selectable and searchable.',
    accept: 'application/pdf',
    multiple: false
  },
  'multi-pdf': {
    title: 'Multi PDF Tool',
    description: 'Upload, reorder, rotate, split, and export – all in your browser.',
    accept: 'application/pdf',
    multiple: true
  },
  'pdf-to-png': {
    title: 'PDF to PNG',
    description: 'Convert PDF pages to high-quality PNG images.',
    accept: 'application/pdf',
    multiple: true
  },
  'png-to-pdf': {
    title: 'PNG to PDF',
    description: 'Convert your PNG images to PDF files instantly. Drag and drop or select images to get started.',
    accept: 'image/png',
    multiple: true
  },
  'rotate-pdf': {
    title: 'Rotate PDF Pages',
    description: 'Simply click on a page to rotate it or use the controls to rotate all.',
    accept: 'application/pdf',
    multiple: true
  },
  'watermark-pdf': {
    title: 'Add Watermark to PDF',
    description: 'Protect your documents by adding text or image watermarks.',
    accept: 'application/pdf',
    multiple: true
  },
  'add-page-numbers-to-pdf': {
    title: 'Add Page Numbers to PDF',
    description: 'Automatically add page numbers to all pages of your PDF documents.',
    accept: 'application/pdf',
    multiple: true,
    buttonLabel: 'Select PDF files',
    dropLabel: 'or drop PDFs here'
  },
  'add-background-to-pdf': {
    title: 'Add Background to PDF',
    description: 'Add professional background colors or images to your PDF documents.',
    accept: 'application/pdf',
    multiple: true
  },
  'add-header-footer-to-pdf': {
    title: 'Add Header & Footer to PDF',
    description: 'Add professional headers and footers with page numbers, dates, and custom text.',
    accept: 'application/pdf',
    multiple: true
  },
  'crop-pdf': {
    title: 'Crop PDF',
    description: 'Remove margins, trim pages, and focus on what matters.',
    accept: 'application/pdf',
    multiple: true
  },
  'excel-to-pdf': {
    title: 'Excel to PDF',
    description: 'Convert your Excel spreadsheets to PDF with smart formatting, auto-orientation, and professional styling.',
    accept: '.xlsx,.xls,.csv',
    multiple: false,
    buttonLabel: 'Select Excel File',
    dropLabel: 'or drop Excel file here'
  }
};

export const PDF_TOOLS = [
  {
    id: 'merge-pdf',
    name: 'Merge PDF',
    description: 'Combine multiple PDF files into one document',
    icon: 'Combine',
    category: 'organize',
    multipleFiles: true
  },
  {
    id: 'split-pdf',
    name: 'Split PDF',
    description: 'Divide PDF into multiple files',
    icon: 'Split',
    category: 'organize',
    multipleFiles: false
  },
  {
    id: 'split-pdf#extract',
    name: 'Extract Pages',
    description: 'Extract specific pages from PDF',
    icon: 'Files',
    category: 'organize',
    multipleFiles: false
  },
  {
    id: 'excel-to-pdf',
    name: 'Excel to PDF',
    description: 'Convert Excel spreadsheets to PDF with smart formatting',
    icon: 'FileSpreadsheet',
    category: 'convert',
    multipleFiles: false
  },
  {
    id: 'remove-pages',
    name: 'Remove Pages',
    description: 'Delete unwanted pages',
    icon: 'Trash2',
    category: 'organize',
    multipleFiles: false
  },
  {
    id: 'organize-pdf',
    name: 'Organize PDF',
    description: 'Sort, add and delete PDF pages',
    icon: 'Layout',
    category: 'organize',
    multipleFiles: false
  },
  {
    id: 'compress-pdf',
    name: 'Compress PDF',
    description: 'Reduce file size while optimizing for best quality',
    icon: 'Minimize2',
    category: 'optimize',
    multipleFiles: false
  },
  {
    id: 'pdf-to-jpg',
    name: 'PDF to JPG',
    description: 'Convert PDF pages to images',
    icon: 'Image',
    category: 'convert',
    multipleFiles: false
  },
  {
    id: 'jpg-to-pdf',
    name: 'JPG to PDF',
    description: 'Create PDF from images',
    icon: 'FileImage',
    category: 'convert',
    multipleFiles: true
  },
  {
    id: 'pdf-to-png',
    name: 'PDF to PNG',
    description: 'Convert PDF pages to PNG images',
    icon: 'Image',
    category: 'convert',
    multipleFiles: false
  },
  {
    id: 'png-to-pdf',
    name: 'PNG to PDF',
    description: 'Create PDF from PNG images',
    icon: 'Image',
    category: 'convert',
    multipleFiles: true
  },
  {
    id: 'rotate-pdf',
    name: 'Rotate PDF',
    description: 'Rotate pages in PDF',
    icon: 'RotateCw',
    category: 'edit',
    multipleFiles: false
  },
  {
    id: 'watermark-pdf',
    name: 'Watermark PDF',
    description: 'Add text or image watermark',
    icon: 'Droplet',
    category: 'edit',
    multipleFiles: false
  },
  {
    id: 'add-page-numbers-to-pdf',
    name: 'Page Numbers',
    description: 'Add page numbers to PDF documents',
    icon: 'Hash',
    category: 'edit',
    multipleFiles: false
  },
  {
    id: 'crop-pdf',
    name: 'Crop PDF',
    description: 'Crop PDF pages to a selected area',
    icon: 'Crop',
    category: 'edit',
    multipleFiles: false
  },
  {
    id: 'add-background-to-pdf',
    name: 'Add Background',
    description: 'Add image or color background to PDF',
    icon: 'Image',
    category: 'edit',
    multipleFiles: false
  },
  {
    id: 'add-header-footer-to-pdf',
    name: 'Header & Footer',
    description: 'Add header and footer to PDF pages',
    icon: 'PanelTop',
    category: 'edit',
    multipleFiles: false
  },

  {
    id: 'ocr-pdf',
    name: 'OCR PDF',
    description: 'Make scanned PDFs searchable',
    icon: 'Search',
    category: 'utility',
    multipleFiles: false
  },
  {
    id: 'multi-pdf',
    name: 'Multi PDF Tool',
    description: 'Upload, reorder, rotate, split, and export',
    icon: 'PanelsTopLeft',
    category: 'organize',
    multipleFiles: true
  },

];

export const CATEGORIES = [
  { id: 'all', name: 'All Tools' },
  { id: 'organize', name: 'Organize' },
  { id: 'optimize', name: 'Optimize' },
  { id: 'convert', name: 'Convert' },
  { id: 'edit', name: 'Edit' },
  { id: 'utility', name: 'Utility' }
];

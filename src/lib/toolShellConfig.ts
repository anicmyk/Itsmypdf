type ToolShellConfig = {
  multiple?: boolean;
  accept?: string;
};

export const TOOL_SHELL_CONFIG: Record<string, ToolShellConfig> = {
  'merge-pdf': { multiple: true, accept: 'application/pdf' },
  'split-pdf': { multiple: false, accept: 'application/pdf' },
  'remove-pages': { multiple: false, accept: 'application/pdf' },
  'compress-pdf': { multiple: false, accept: 'application/pdf' },
  'pdf-to-jpg': { multiple: false, accept: 'application/pdf' },
  'jpg-to-pdf': { multiple: true, accept: 'image/jpeg,image/jpg,image/png' },
  'ocr-pdf': { multiple: false, accept: 'application/pdf' },
  'multi-pdf': { multiple: true, accept: 'application/pdf' },
  'organize-pdf': { multiple: true, accept: 'application/pdf' },
  'pdf-to-png': { multiple: false, accept: 'application/pdf' },
  'png-to-pdf': { multiple: true, accept: 'image/png,image/jpeg,image/jpg' },
  'rotate-pdf': { multiple: false, accept: 'application/pdf' },
  'watermark-pdf': { multiple: false, accept: 'application/pdf' },
  'add-page-numbers-to-pdf': { multiple: false, accept: 'application/pdf' },
  'add-background-to-pdf': { multiple: false, accept: 'application/pdf' },
  'edit-pdf': { multiple: false, accept: 'application/pdf' },
  'add-header-footer-to-pdf': { multiple: false, accept: 'application/pdf' },
  'crop-pdf': { multiple: false, accept: 'application/pdf' },
  'excel-to-pdf': { multiple: false, accept: '.xlsx,.xls,.csv' }
};

declare module '@embedpdf/pdfium' {
  export function init(options: { wasmBinary: ArrayBuffer }): Promise<any>;
}

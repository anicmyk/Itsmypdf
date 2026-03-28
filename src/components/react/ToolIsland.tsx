import { Suspense, lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';

interface Props {
  toolId: string;
}

const toolLoaders = {
  'split-pdf': () => import('@/components/pdf/split/WorkingSplitPDFTool'),
  'merge-pdf': () => import('@/components/pdf/merge/MergePDFTool'),
  'remove-pages': () => import('@/components/pdf/remove-pages/RemovePagesTool'),
  'organize-pdf': () => import('@/components/pdf/OrganizePDF/OrganizePDFTool'),
  'compress-pdf': () => import('@/components/pdf/compress/CompressPDFTool'),
  'pdf-to-jpg': () => import('@/components/pdf/PdfToJpgTool/PdfToJpgTool'),
  'jpg-to-pdf': () => import('@/components/pdf/jpg-to-pdf/JpgToPdfTool'),
  'pdf-to-png': () => import('@/components/pdf/pdf-to-png/PdfToPngTool'),
  'png-to-pdf': () => import('@/components/pdf/PngToPdfTool'),
  'rotate-pdf': () => import('@/components/pdf/rotate/RotatePDFTool'),
  'watermark-pdf': () => import('@/components/pdf/watermark/WatermarkPDFTool'),
  'add-page-numbers-to-pdf': () => import('@/components/pdf/page-numbers/PageNumbersPDFTool'),
  'crop-pdf': () => import('@/components/pdf/crop/CropPDFTool'),
  'add-background-to-pdf': () => import('@/components/pdf/add-background/AddBackgroundTool'),
  'add-header-footer-to-pdf': () => import('@/components/pdf/header-footer/HeaderFooterTool'),
  'ocr-pdf': () => import('@/components/pdf/ocr/OcrPDFTool'),
  'multi-pdf': () => import('@/components/pdf/multi/MultiPDFTool'),
  'excel-to-pdf': () => import('@/components/pdf/excel-to-pdf/ExcelToPdfTool'),
} as const;

type ToolId = keyof typeof toolLoaders;

const toolComponents = Object.fromEntries(
  Object.entries(toolLoaders).map(([id, loader]) => [id, lazy(loader)])
) as Record<ToolId, LazyExoticComponent<ComponentType>>;

function isToolId(value: string): value is ToolId {
  return value in toolComponents;
}

export default function ToolIsland({ toolId }: Props) {
  if (!isToolId(toolId)) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center">Tool not found.</div>;
  }

  const ToolComponent = toolComponents[toolId];

  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-500">Loading tool...</div>}>
      <ToolComponent />
    </Suspense>
  );
}

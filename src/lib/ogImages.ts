/**
 * OG (Open Graph) Image mapping for all PDF tools
 * Maps tool IDs to their corresponding OG image filenames
 * Images are served from /og-images/ directory
 */

// Base URL for production - used for absolute OG image URLs
export const SITE_URL = 'https://itsmypdf.com';

// OG Images directory path
export const OG_IMAGES_PATH = '/og-images';

/**
 * Mapping of tool IDs to their OG image filenames
 * Note: Some tools share the same image (e.g., split-pdf and split-pdf#extract)
 */
export const OG_IMAGES_MAP: Record<string, string> = {
  // Merge & Split
  'merge-pdf': 'merge-pdf.jpeg',
  'split-pdf': 'split-pdf.jpeg',
  'split-pdf#extract': 'split-pdf#extract.jpeg',
  
  // Page Operations
  'remove-pages': 'remove-pages.jpeg',
  'organize-pdf': 'organize-pdf.jpeg',
  'rotate-pdf': 'rotate-pdf.jpeg',
  'crop-pdf': 'crop-pdf.jpeg',
  
  // Convert to PDF
  'jpg-to-pdf': 'jpg-to-pdf.jpeg',
  'png-to-pdf': 'png-to-pdf.jpeg',
  'excel-to-pdf': 'excel-to-pdf.jpeg',
  'word-to-pdf': 'word-to-pdf-tool.jpeg',
  
  // Convert from PDF
  'pdf-to-jpg': 'pdf-to-jpg.jpeg',
  'pdf-to-png': 'pdf-to-png.jpeg',
  
  // Enhance & Edit
  'watermark-pdf': 'watermark-pdf.jpeg',
  'add-page-numbers-to-pdf': 'add-page-numbers-to-pdf.jpeg',
  'add-background-to-pdf': 'add-background-to-pdf.jpeg',
  'add-header-footer-to-pdf': 'add-header-footer-to-pdf.jpeg',
  
  // Optimize
  'compress-pdf': 'compress-pdf.jpeg',
  'ocr-pdf': 'ocr-pdf.jpeg',
  
  // Multi-tool
  'multi-pdf': 'multi-pdf-tool.jpeg',
};

/**
 * Get the absolute OG image URL for a tool
 * @param toolId - The tool identifier
 * @returns Absolute URL to the OG image, or default OG image if not found
 */
export function getOgImageUrl(toolId: string): string {
  const imageFile = OG_IMAGES_MAP[toolId];
  
  if (imageFile) {
    return `${SITE_URL}${OG_IMAGES_PATH}/${imageFile}`;
  }
  
  // Return default OG image if no specific image is found
  return `${SITE_URL}/og-image.jpg`;
}

/**
 * Get the relative OG image path for a tool (for local development)
 * @param toolId - The tool identifier
 * @returns Relative path to the OG image
 */
export function getOgImagePath(toolId: string): string {
  const imageFile = OG_IMAGES_MAP[toolId];
  
  if (imageFile) {
    return `${OG_IMAGES_PATH}/${imageFile}`;
  }
  
  return '/og-image.jpg';
}

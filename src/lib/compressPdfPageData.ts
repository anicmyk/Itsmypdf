export const COMPRESS_PDF_TRUST_POINTS = [
  'No watermark',
  'No sign-up',
  'Free to use',
  'Honest estimates'
];

export const COMPRESS_PDF_OVERVIEW = {
  title: 'Why people compress PDFs',
  intro:
    'Smaller PDFs are easier to email, upload, store, and share. This compressor shows a realistic estimate first, so you can tell whether the file is likely to shrink in a useful way.',
  points: [
    {
      title: 'Easier to send',
      body: 'Compression helps when an email attachment limit, upload form, or slow connection is getting in the way.'
    },
    {
      title: 'Best for image-heavy files',
      body: 'Scans, slide decks, and other image-heavy PDFs usually have more room to shrink than text-only documents.'
    },
    {
      title: 'Honest about limits',
      body: 'Text-heavy or already-optimized PDFs often shrink only a little, and exact targets like 500KB or 1MB are not always realistic.'
    }
  ]
};

export const COMPRESS_PDF_EXPECTATIONS = [
  'Balanced compression is a good place to start for most files.',
  'Stronger settings can shrink more, but they may soften images or flatten document structure.',
  'If the file is already small or mostly text, the final result may stay close to the original.'
];

export const COMPRESS_PDF_TARGET_NOTE = {
  title: 'Can a PDF be compressed to 500KB or 1MB?',
  body:
    'Sometimes, yes. Large image-based PDFs often have enough room to shrink. Text-heavy or already optimized files may not reach those exact sizes, and the estimate on the page is there to show what is realistic before you start.'
};

export const COMPRESS_PDF_BEST_RESULTS = [
  {
    title: 'Scanned PDFs',
    body: 'Usually the best candidates for a bigger reduction because they are mostly images.'
  },
  {
    title: 'Slide decks and exports',
    body: 'Presentation-style PDFs often contain large embedded images that can be reduced.'
  },
  {
    title: 'Text-heavy documents',
    body: 'These can still be cleaned up, but the size drop is usually smaller.'
  }
];

export const COMPRESS_PDF_STEPS = [
  'Upload a PDF from your device.',
  'Check the recommended mode and strength.',
  'Press Compress PDF and keep the result only if it is worth saving.'
];

export const COMPRESS_PDF_FAQ = [
  {
    question: 'How do I compress a PDF online?',
    answer:
      'Upload the file, review the suggested settings, and click Compress PDF. The tool gives you a realistic estimate first so you can choose a sensible level of compression before downloading.'
  },
  {
    question: 'Can I compress a PDF to 500KB?',
    answer:
      'Sometimes. It depends on the file size, the number of images, and whether the PDF is already optimized. Very small or text-heavy PDFs may not shrink that far.'
  },
  {
    question: 'Can I compress a PDF to 1MB?',
    answer:
      'Also sometimes. Large image-heavy PDFs are the best candidates. If the file is mostly text or already compressed, the result may stay above 1MB.'
  },
  {
    question: 'Will compressing a PDF reduce quality?',
    answer:
      'Light and balanced compression usually keeps the file looking the same. Stronger compression can reduce image quality a little, and aggressive rasterization can remove searchable text.'
  },
  {
    question: 'Why is my PDF not getting much smaller?',
    answer:
      'Text-heavy and already optimized PDFs do not have much extra space to remove. The biggest gains usually come from files with large images, scans, or exported slide decks.'
  },
  {
    question: 'Can I compress scanned PDFs?',
    answer:
      'Yes. Scanned PDFs are often good candidates for compression because they are image-based. That is also the type of file where stronger compression can help the most.'
  },
  {
    question: 'Is this PDF compressor free?',
    answer:
      'Yes. You can use it free without creating an account.'
  }
];

export const COMPRESS_PDF_RELATED_TOOLS = [
  { href: '/split-pdf', title: 'Split PDF', cta: 'Separate pages', body: 'Split a large document into smaller files.' },
  { href: '/merge-pdf', title: 'Merge PDF', cta: 'Combine files', body: 'Bring multiple PDFs into one document.' },
  { href: '/remove-pages', title: 'Remove Pages', cta: 'Delete pages', body: 'Trim out pages you do not need.' },
  { href: '/pdf-to-jpg', title: 'PDF to JPG', cta: 'Convert pages', body: 'Turn PDF pages into images.' },
  { href: '/jpg-to-pdf', title: 'JPG to PDF', cta: 'Create PDFs', body: 'Turn image files into a PDF.' }
];

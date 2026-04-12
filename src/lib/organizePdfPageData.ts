export const ORGANIZE_PDF_TRUST_POINTS = [
  'No watermark',
  'No sign-up',
  'Free to use',
  'Visual page previews',
  'Easy page reordering'
];

export const ORGANIZE_PDF_OVERVIEW = {
  title: 'Why people organize PDF pages',
  intro:
    'Page order shapes how a PDF reads. When a scan is out of sequence or a merged file feels clunky, rearranging pages makes the document easier to follow before you share, print, or submit it.',
  points: [
    {
      title: 'Fix scan order',
      body: 'Phones and scanners do not always capture pages in the right sequence. Reordering helps clean up pages that landed out of order.'
    },
    {
      title: 'Clean up merged files',
      body: 'When several PDFs get combined, the final file can feel messy. Organizing the pages puts the content back into a clear flow.'
    },
    {
      title: 'Prepare files to share',
      body: 'If a document is going to a client, teacher, manager, or teammate, putting the most important pages first makes it easier to review.'
    },
    {
      title: 'Get ready to print',
      body: 'Reordering pages before printing helps keep packets, handouts, and submissions readable from the first page onward.'
    }
  ]
};

export const ORGANIZE_PDF_EXPECTATIONS = [
  'Drag and drop is the fastest way to move pages into the right order.',
  'You can rotate pages, remove pages, or insert blank pages when a file needs a little cleanup.',
  'Reorganizing pages does not reduce quality because the tool is rearranging the document, not recompressing it.'
];

export const ORGANIZE_PDF_STEPS = [
  'Upload one or more PDFs from your device.',
  'Drag the page thumbnails into the order you want, then rotate or delete any pages that need cleanup.',
  'Download the organized PDF when the preview looks right.'
];

export const ORGANIZE_PDF_USE_CASES = [
  {
    title: 'Fix scan order',
    body: 'Scanned stacks often come in upside down, duplicated, or out of sequence. Reordering the pages makes the file read the way it should.'
  },
  {
    title: 'Clean up merged PDFs',
    body: 'If a combined document feels like pages were dropped in at random, moving them around helps the whole file make sense again.'
  },
  {
    title: 'Prepare before sharing',
    body: 'Reports, proposals, and forms are easier to review when the best opening pages are at the top of the stack.'
  },
  {
    title: 'Sort before printing',
    body: 'When a packet needs to be printed or submitted, correct page order prevents confusion and saves time at the last minute.'
  }
];

export const ORGANIZE_PDF_FAQ = [
  {
    question: 'How do I organize PDF pages online?',
    answer:
      'Upload your PDF, drag the page thumbnails into the order you want, then download the updated file. You can also rotate pages or remove pages that do not belong.'
  },
  {
    question: 'Can I rearrange PDF pages for free?',
    answer:
      'Yes. itsmypdf is free to use, with no sign-up and no watermark on the output file.'
  },
  {
    question: 'How do I reorder PDF pages before printing?',
    answer:
      'Open the file, move the pages into the right sequence, and check the preview before you print. That helps keep packets, handouts, and forms in a readable order.'
  },
  {
    question: 'Can I move pages after merging PDFs?',
    answer:
      'Yes. If a merged file came together in the wrong order, you can drag the pages into the right position and save a cleaner version.'
  },
  {
    question: 'Will organizing a PDF affect quality?',
    answer:
      'No. Reordering pages does not compress the file or change the page content. It only changes how the pages are arranged in the final PDF.'
  },
  {
    question: 'Can I organize scanned PDFs?',
    answer:
      'Yes. Scanned PDFs are a common reason to use this tool, especially when pages were captured in the wrong order or need a quick cleanup.'
  },
  {
    question: 'Can I preview pages before reordering?',
    answer:
      'Yes. Visual page previews let you check the order before you save the updated PDF.'
  }
];

export const ORGANIZE_PDF_RELATED_TOOLS = [
  {
    href: '/split-pdf',
    title: 'Split PDF',
    cta: 'Separate pages',
    body: 'Break a large document into smaller files.'
  },
  {
    href: '/merge-pdf',
    title: 'Merge PDF',
    cta: 'Combine files',
    body: 'Bring multiple PDFs into one document.'
  },
  {
    href: '/remove-pages',
    title: 'Remove Pages',
    cta: 'Delete pages',
    body: 'Trim out pages you do not need.'
  },
  {
    href: '/compress-pdf',
    title: 'Compress PDF',
    cta: 'Shrink files',
    body: 'Reduce file size before you send it.'
  },
  {
    href: '/pdf-to-jpg',
    title: 'PDF to JPG',
    cta: 'Convert pages',
    body: 'Turn PDF pages into images.'
  },
  {
    href: '/jpg-to-pdf',
    title: 'JPG to PDF',
    cta: 'Create PDFs',
    body: 'Turn image files into a PDF.'
  }
];

export type ToolLongform = {
  howTo: {
    title: string;
    intro: string;
    steps: string[];
  };
  why: {
    title: string;
    bullets: string[];
  };
  faq: Array<{ question: string; answer: string }>;
  related: {
    title: string;
    items: Array<{ href: string; title: string; cta: string }>;
  };
};

export const TOOL_LONGFORM: Record<string, ToolLongform> = {
  'remove-pages': {
    howTo: {
      title: 'How to Delete Pages from a PDF',
      intro: 'Remove one page or multiple sections in three simple steps:',
      steps: [
        "<strong>Select your file:</strong> Choose the document from your device using the button above. The file stays on your device.",
        "<strong>Choose pages to delete:</strong> Click on the specific pages you want to remove. Hold 'Shift' to select a bulk range.",
        "<strong>Save your file:</strong> Click 'Remove Pages' to instantly export your updated, watermark-free PDF directly to your device."
      ]
    },
    why: {
      title: 'Why Use itsmypdf to Remove Pages?',
      bullets: [
        "<strong>100% Private (No Uploads):</strong> Your files are processed entirely inside your web browser using client-side technology. We never upload, store, or see your sensitive documents.",
        "<strong>No Watermarks:</strong> We never alter your document or add branding. Your exported PDF looks exactly how you want it.",
        "<strong>No Account Required:</strong> Skip the registration process entirely. Start working immediately, just open your file, edit, and save.",
        "<strong>Completely Free:</strong> No hidden paywalls or premium subscriptions after you've already done the work."
      ]
    },
    faq: [
      {
        question: 'Can I remove multiple pages at once?',
        answer: 'Yes! Our online PDF page remover allows you to select as many individual pages or page ranges as you need to delete before saving the new file.'
      },
      {
        question: 'Is there a file size limit?',
        answer: 'There are no strict file size limits! Because our tool processes the document directly on your device, you can easily handle large PDF files. The processing speed simply depends on your device\'s available memory.'
      },
      {
        question: 'Is it safe to use itsmypdf for sensitive documents?',
        answer: 'Absolutely. Since your files are processed entirely on your device, your sensitive data never leaves your browser. This makes it one of the most secure ways to manage private PDF documents.'
      },
      {
        question: 'Does this tool work on mobile devices?',
        answer: 'Yes! itsmypdf is fully responsive and works perfectly across all devices. You can securely remove PDF pages on your iPhone, Android, or tablet directly through your web browser.'
      }
    ],
    related: {
      title: 'Related Tools',
      items: [
        { href: '/merge-pdf', title: 'Need to combine files?', cta: 'Merge PDF &rarr;' },
        { href: '/organize-pdf', title: 'Need to change the order?', cta: 'Organize PDF &rarr;' },
        { href: '/compress-pdf', title: 'File too large?', cta: 'Compress PDF &rarr;' }
      ]
    }
  },
  'organize-pdf': {
    howTo: {
      title: 'How to Rearrange and Organize a PDF',
      intro: 'Move, add, or reorder pages in three simple steps:',
      steps: [
        "<strong>Select your file:</strong> Choose the document from your device using the button above. The file stays on your device.",
        "<strong>Rearrange and organize:</strong> Drag and drop the page thumbnails to move them into the perfect order. You can also add new pages or delete unwanted ones.",
        "<strong>Save your file:</strong> Click 'Organize PDF' to instantly export your updated, watermark-free PDF directly to your device."
      ]
    },
    why: {
      title: 'Why Use itsmypdf to Organize Pages?',
      bullets: [
        "<strong>100% Private (No Uploads):</strong> Your files are processed entirely inside your web browser using client-side technology. We never upload, store, or see your sensitive documents.",
        "<strong>Drag and Drop Simplicity:</strong> Visually sort, add, and move PDF pages with a lightning-fast interface designed for speed.",
        "<strong>No Watermarks:</strong> We never alter your document or add branding. Your exported PDF looks exactly how you organized it.",
        "<strong>No Account Required:</strong> Skip the registration process entirely. Start working immediately &mdash; just open your file, arrange it, and save."
      ]
    },
    faq: [
      {
        question: 'How do I move or add pages in a PDF?',
        answer: 'Simply upload your file, click on the page thumbnail you want to move, and drag it to its new position. You can also use the menu to add extra pages seamlessly before saving.'
      },
      {
        question: 'Is there a file size limit?',
        answer: 'There are no strict file size limits! Because our tool processes the document directly on your device, you can easily handle large PDF files. The processing speed simply depends on your device\'s available memory.'
      },
      {
        question: 'Is it safe to use itsmypdf for sensitive documents?',
        answer: 'Absolutely. Since your files are processed entirely on your device, your sensitive data never leaves your browser. This makes it one of the most secure ways to manage private PDF documents.'
      },
      {
        question: 'Does this tool work on mobile devices?',
        answer: 'Yes! itsmypdf is fully responsive. You can easily drag, drop, and rearrange PDF pages on your iPhone, Android, or tablet directly through your web browser.'
      }
    ],
    related: {
      title: 'Related Tools',
      items: [
        { href: '/remove-pages', title: 'Need to delete pages?', cta: 'Remove PDF Pages &rarr;' },
        { href: '/merge-pdf', title: 'Need to combine files?', cta: 'Merge PDF &rarr;' },
        { href: '/compress-pdf', title: 'File too large?', cta: 'Compress PDF &rarr;' }
      ]
    }
  }
};

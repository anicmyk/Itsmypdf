import { useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Menu, X } from 'lucide-react';
import NavDropdown from './NavDropdown';
import { PDF_TOOLS } from '@/lib/constants';

function getCurrentPath() {
  if (typeof window === 'undefined') return '';
  return `${window.location.pathname.replace(/^\//, '')}${window.location.hash}`;
}

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const currentPath = getCurrentPath();

  const isActive = (path: string) => {
    const targetPath = path.replace(/^\//, '');
    const basePath = targetPath.split('#')[0];
    if (basePath === '') {
      return currentPath === '' || currentPath === '/';
    }
    return currentPath === path || currentPath === basePath || currentPath.startsWith(`${basePath}#`);
  };

  const convertTools = useMemo(() => PDF_TOOLS.filter((tool) => tool.category === 'convert'), []);
  const organizeTools = useMemo(() => PDF_TOOLS.filter((tool) => tool.category === 'organize'), []);
  const editTools = useMemo(() => PDF_TOOLS.filter((tool) => tool.category === 'edit' || tool.category === 'utility'), []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };

    const handlePopState = () => setMobileMenuOpen(false);

    window.addEventListener('resize', handleResize);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const mobileSections = [
    {
      title: 'Primary',
      items: [
        { href: '/', label: 'All PDF Tools' },
        { href: '/split-pdf', label: 'Split PDF' },
        { href: '/merge-pdf', label: 'Merge PDF' },
        { href: '/compress-pdf', label: 'Compress PDF' },
      ],
    },
    {
      title: 'Convert PDF',
      items: convertTools.map((tool) => ({ href: `/${tool.id}`, label: tool.name })),
    },
    {
      title: 'Organize PDF',
      items: organizeTools.map((tool) => ({ href: `/${tool.id}`, label: tool.name })),
    },
    {
      title: 'Edit and Utility',
      items: editTools.map((tool) => ({ href: `/${tool.id}`, label: tool.name })),
    },
    {
      title: 'Company',
      items: [
        { href: '/blog', label: 'Blog' },
        { href: '/about', label: 'About' },
        { href: '/privacy', label: 'Privacy Policy' },
        { href: '/terms', label: 'Terms of Service' },
      ],
    },
  ];

  return (
    <header className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-[100] shadow-sm">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <a href="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
              <img src="/itsmypdf.svg" alt="itsmypdf logo" className="h-7 w-7" />
              <span className="text-xl font-bold text-gray-800">
                itsmy<span className="text-blue-600">pdf</span>
              </span>
            </a>
            <nav className="hidden md:flex items-center gap-2 border-l border-gray-200 pl-6">
              <a
                href="/split-pdf"
                className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  isActive('split-pdf') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Split PDF
              </a>
              <a
                href="/merge-pdf"
                className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  isActive('merge-pdf') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Merge PDF
              </a>
              <a
                href="/compress-pdf"
                className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  isActive('compress-pdf') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Compress PDF
              </a>

              <NavDropdown
                label="Convert PDF"
                items={convertTools}
                isActive={convertTools.some((tool) => isActive(tool.id))}
              />

              <NavDropdown label="All PDF Tools" items={PDF_TOOLS} showCategories={true} />
            </nav>
          </div>

          <Dialog.Root open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <Dialog.Trigger asChild>
              <button
                type="button"
                className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 text-gray-700 transition-colors hover:bg-gray-100 active:bg-gray-200"
                aria-label="Open navigation menu"
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
            </Dialog.Trigger>

            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-[120] bg-black/30" />
              <Dialog.Content
                id="mobile-navigation"
                className="fixed inset-y-0 right-0 z-[121] w-full max-w-sm border-l border-gray-200 bg-white shadow-xl outline-none transition-transform duration-200 data-[state=closed]:translate-x-full data-[state=open]:translate-x-0"
              >
                <div className="flex h-full flex-col">
                  <Dialog.Title className="sr-only">Mobile navigation menu</Dialog.Title>
                  <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4">
                    <a href="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                      <img src="/itsmypdf.svg" alt="itsmypdf logo" className="h-7 w-7" />
                      <span className="text-lg font-bold text-gray-800">
                        itsmy<span className="text-blue-600">pdf</span>
                      </span>
                    </a>
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200"
                        aria-label="Close navigation menu"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </Dialog.Close>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-4">
                    <div className="space-y-5">
                      {mobileSections.map((section) => (
                        <section key={section.title} className="space-y-2">
                          <h2 className="text-sm font-semibold text-gray-500">{section.title}</h2>
                          <div className="space-y-1">
                            {section.items.map((item) => {
                              const active = isActive(item.href);
                              return (
                                <a
                                  key={item.href}
                                  href={item.href}
                                  onClick={() => setMobileMenuOpen(false)}
                                  className={`flex items-center justify-between rounded-md border px-3 py-3 text-sm font-medium transition-colors ${
                                    active
                                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                                      : 'border-transparent text-gray-700 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                                  }`}
                                >
                                  <span>{item.label}</span>
                                  <span className={`h-2 w-2 rounded-full ${active ? 'bg-blue-600' : 'bg-transparent'}`} />
                                </a>
                              );
                            })}
                          </div>
                        </section>
                      ))}
                    </div>
                  </div>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </header>
  );
}

import { useMemo } from 'react';
import NavDropdown from './NavDropdown';
import { PDF_TOOLS } from '@/lib/constants';

function getCurrentPath() {
  if (typeof window === 'undefined') return '';
  return window.location.pathname.replace(/^\//, '');
}

export default function Header() {
  const currentPath = getCurrentPath();

  const isActive = (path: string) => {
    const basePath = path.split('#')[0];
    return currentPath === path || currentPath === basePath || currentPath.startsWith(basePath + '#');
  };

  const convertTools = useMemo(() => PDF_TOOLS.filter((tool) => tool.category === 'convert'), []);

  return (
    <header className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-[100] shadow-sm">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <a href="/" className="flex items-center gap-2">
              <img src="/itsmypdf.svg" alt="itsmypdf logo" className="h-7 w-7" />
              <span className="text-xl font-bold text-gray-800">
                itsmy<span className="text-blue-600">pdf</span>
              </span>
            </a>
            <nav className="hidden md:flex items-center gap-2 border-l border-gray-200 pl-6">
              <a
                href="/split-pdf"
                className={`
                  px-3 py-2 text-sm font-medium rounded-md transition-all duration-200
                  ${isActive('split-pdf') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}
                `}
              >
                Split PDF
              </a>
              <a
                href="/merge-pdf"
                className={`
                  px-3 py-2 text-sm font-medium rounded-md transition-all duration-200
                  ${isActive('merge-pdf') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}
                `}
              >
                Merge PDF
              </a>
              <a
                href="/compress-pdf"
                className={`
                  px-3 py-2 text-sm font-medium rounded-md transition-all duration-200
                  ${isActive('compress-pdf') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}
                `}
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
        </div>
      </div>
    </header>
  );
}


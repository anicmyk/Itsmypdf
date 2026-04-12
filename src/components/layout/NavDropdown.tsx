import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import * as icons from 'lucide-react';
import { CATEGORIES } from '@/lib/constants';

interface DropdownItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  category?: string;
}

interface NavDropdownProps {
  label: string;
  items: DropdownItem[];
  isActive?: boolean;
  showCategories?: boolean;
}

export default function NavDropdown({
  label,
  items,
  isActive = false,
  showCategories = false,
}: NavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const getCategorizedItems = () => {
    const grouped: { [key: string]: DropdownItem[] } = {};

    CATEGORIES.forEach((cat) => {
      if (cat.id !== 'all') {
        grouped[cat.id] = items.filter((item) => item.category === cat.id);
      }
    });

    return grouped;
  };

  const categorizedItems = showCategories ? getCategorizedItems() : null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          px-3 py-2 text-sm font-medium rounded-md transition-all duration-200
          flex items-center gap-1
          ${isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}
        `}
      >
        {label}
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-1/2 mt-2 w-[min(92vw,56rem)] -translate-x-1/2 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden z-[9999] animate-dropdown-enter max-h-[calc(100vh-5rem)] overflow-y-auto"
        >
          <div className="p-4">
            {showCategories ? (
              <div className="space-y-4">
                {CATEGORIES.filter((cat) => cat.id !== 'all').map((category) => {
                  const categoryItems = categorizedItems?.[category.id] || [];
                  if (categoryItems.length === 0) return null;

                  return (
                    <div key={category.id}>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2 px-1">
                        {category.name}
                      </h3>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {categoryItems.map((item) => {
                          const IconComponent = (icons as any)[item.icon] || icons.File;

                          return (
                            <a
                              key={item.id}
                              href={`/${item.id}`}
                              onClick={() => setIsOpen(false)}
                              className="group flex items-start gap-2 px-2 py-2 rounded-md transition-all duration-150 hover:bg-blue-50 border border-transparent hover:border-blue-100"
                            >
                              <div className="flex-shrink-0 p-1.5 bg-blue-50 rounded group-hover:bg-blue-100 transition mt-0.5">
                                <IconComponent className="w-4 h-4 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 text-sm mb-0.5 group-hover:text-blue-600 transition-colors leading-tight">
                                  {item.name}
                                </div>
                                <div className="text-xs text-gray-500 line-clamp-2 leading-tight">
                                  {item.description}
                                </div>
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" >
                {items.map((item) => {
                  const IconComponent = (icons as any)[item.icon] || icons.File;

                  return (
                    <a
                      key={item.id}
                      href={`/${item.id}`}
                      onClick={() => setIsOpen(false)}
                      className="group flex items-start gap-2 px-2 py-2 rounded-md transition-all duration-150 hover:bg-blue-50 border border-transparent hover:border-blue-100"
                    >
                      <div className="flex-shrink-0 p-1.5 bg-blue-50 rounded group-hover:bg-blue-100 transition mt-0.5">
                        <IconComponent className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm mb-0.5 group-hover:text-blue-600 transition-colors leading-tight">
                          {item.name}
                        </div>
                        <div className="text-xs text-gray-500 line-clamp-2 leading-tight">{item.description}</div>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


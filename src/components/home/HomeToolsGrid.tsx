import { useState } from 'react';
import { PDF_TOOLS, CATEGORIES } from '@/lib/constants';
import * as Icons from 'lucide-react';
import { ArrowRight } from 'lucide-react';

export default function HomeToolsGrid() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredTools = selectedCategory === 'all'
    ? PDF_TOOLS
    : PDF_TOOLS.filter(tool => tool.category === selectedCategory);

  return (
    <>
      <div className="flex flex-wrap justify-center gap-2 mb-6 px-4">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-5 py-2 rounded-full font-medium transition text-sm ${selectedCategory === category.id
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-2">
        {filteredTools.map((tool) => {
          const IconComponent = (Icons as any)[tool.icon] || Icons.FileText;
          return (
            <a key={tool.id} href={`/${tool.id}`}>
              <div className="bg-white rounded-lg p-6 shadow-sm transition border border-gray-200 group min-h-[140px] flex flex-col justify-between hover:shadow-md" style={{ minWidth: '286px' }}>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-50 rounded group-hover:bg-blue-100 transition">
                        <IconComponent className="h-5 w-5 text-blue-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm">{tool.name}</h3>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{tool.description}</p>
                </div>
                <div className="flex items-center text-blue-600 text-sm font-medium group-hover:text-blue-700">
                  <span>Use tool</span>
                  <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </>
  );
}

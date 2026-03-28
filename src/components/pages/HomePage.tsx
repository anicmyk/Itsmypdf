import { useState } from 'react';
import { PDF_TOOLS, CATEGORIES } from '@/lib/constants';
import * as Icons from 'lucide-react';
import { Zap, Lock, CheckCircle, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredTools = selectedCategory === 'all'
    ? PDF_TOOLS
    : PDF_TOOLS.filter(tool => tool.category === selectedCategory);

  return (
      
      
      

      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
          <div className="text-center mb-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-3">
              Your Files Never Leave Your Device
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto mb-6 px-4">
              Your files stay on your computer while you merge, split, compress, and convert. Completely free to use.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6 px-4">
              <div className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-full text-blue-600 font-medium text-sm shadow-sm">
                <CheckCircle className="w-5 h-5 mr-2 text-blue-600" />
                No Account Required
              </div>
              <div className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-full text-blue-600 font-medium text-sm shadow-sm">
                <Zap className="w-5 h-5 mr-2 text-blue-600" />
                Instant Processing
              </div>
              <div className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-full text-blue-600 font-medium text-sm shadow-sm">
                <Lock className="w-5 h-5 mr-2 text-blue-600" />
                100% Private
              </div>
            </div>

            {/* Category Filter */}
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

            {/* Tools Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-2">
              {filteredTools.map((tool) => {
                const IconComponent = (Icons as any)[tool.icon] || Icons.FileText;
                return (
                  <a
                    key={tool.id}
                    href={`/${tool.id}`}
                  >
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
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-gray-50 py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-lg text-gray-600">
                Everything you need to know about our PDF tools
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg p-8 shadow-sm min-h-[140px]">
                <h3 className="font-semibold text-gray-900 mb-2">Is this really free?</h3>
                <p className="text-gray-600">Yes! All our PDF tools are completely free to use with no hidden fees, subscriptions, or limits.</p>
              </div>

              <div className="bg-white rounded-lg p-8 shadow-sm min-h-[140px]">
                <h3 className="font-semibold text-gray-900 mb-2">How does local processing work?</h3>
                <p className="text-gray-600">All file processing happens directly in your browser using advanced JavaScript. Your files never leave your device, ensuring complete privacy and security.</p>
              </div>

              <div className="bg-white rounded-lg p-8 shadow-sm min-h-[140px]">
                <h3 className="font-semibold text-gray-900 mb-2">What about my privacy?</h3>
                <p className="text-gray-600">Your privacy is our top priority. We don't store, track, or access any of your files. Everything is processed locally and securely.</p>
              </div>

              <div className="bg-white rounded-lg p-8 shadow-sm min-h-[140px]">
                <h3 className="font-semibold text-gray-900 mb-2">Are there file size limits?</h3>
                <p className="text-gray-600">Most tools can handle files up to 50MB. For larger files, we recommend splitting them into smaller chunks for optimal performance.</p>
              </div>

              <div className="bg-white rounded-lg p-8 shadow-sm min-h-[140px]">
                <h3 className="font-semibold text-gray-900 mb-2">What browsers are supported?</h3>
                <p className="text-gray-600">Our tools work on all modern browsers including Chrome, Firefox, Safari, and Edge. No downloads or installations required.</p>
              </div>

              <div className="bg-white rounded-lg p-8 shadow-sm min-h-[140px]">
                <h3 className="font-semibold text-gray-900 mb-2">How can I report a bug or suggest a feature?</h3>
                <p className="text-gray-600">We'd love to hear from you! Contact us through the support section below with any feedback, bug reports, or feature requests.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
  );
}

import React from 'react';
import { TOOL_LONGFORM } from '@/lib/toolLongform';

type Props = {
  toolId: string;
};

const ToolLongformReact: React.FC<Props> = ({ toolId }) => {
  const content = TOOL_LONGFORM[toolId];

  if (!content) return null;

  return (
    <div className="w-full bg-white border-t border-gray-200 flex-shrink-0">
      <div className="max-w-3xl mx-auto px-6 py-16 text-gray-800">
        <h2 className="text-3xl font-bold mb-6 text-brand-blue-800">{content.howTo.title}</h2>
        <p className="mb-4 text-lg text-gray-700">{content.howTo.intro}</p>
        <ol className="list-decimal pl-6 mb-12 space-y-3 text-gray-700">
          {content.howTo.steps.map((step) => (
            <li key={step} dangerouslySetInnerHTML={{ __html: step }} />
          ))}
        </ol>

        <h2 className="text-3xl font-bold mb-6 text-brand-blue-800">{content.why.title}</h2>
        <ul className="list-disc pl-6 mb-12 space-y-3 text-gray-700">
          {content.why.bullets.map((bullet) => (
            <li key={bullet} dangerouslySetInnerHTML={{ __html: bullet }} />
          ))}
        </ul>

        <h2 className="text-3xl font-bold mb-6 text-brand-blue-800">Frequently Asked Questions</h2>
        {content.faq.map((item) => (
          <div key={item.question} className="mb-8">
            <h3 className="text-xl font-bold mb-2 text-gray-900">{item.question}</h3>
            <p className="text-gray-700">{item.answer}</p>
          </div>
        ))}

        <div className="pt-8 mt-12 border-t border-gray-200">
          <h2 className="text-2xl font-bold mb-6 text-brand-blue-800 text-center">{content.related.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            {content.related.items.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="p-4 bg-gray-50 rounded-xl hover:bg-brand-blue-50 hover:text-brand-blue-600 transition-colors duration-200 border border-gray-100 hover:border-brand-blue-100"
              >
                <p className="font-semibold text-gray-800 mb-1">{item.title}</p>
                <span className="text-sm text-brand-blue-600 font-medium" dangerouslySetInnerHTML={{ __html: item.cta }} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolLongformReact;

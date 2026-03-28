import React from 'react';

export interface Option<T extends string> {
  value: T;
  label?: string;
  icon?: React.ReactNode;
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  isIconOnly?: boolean;
}

export function SegmentedControl<T extends string>({ 
  options, 
  value, 
  onChange, 
  isIconOnly = false 
}: SegmentedControlProps<T>) {
  return (
    <div className="flex w-full bg-gray-100 rounded-lg p-1 border border-gray-200/75 items-stretch">
      {options.map((option, index) => {
        const isSelected = value === option.value;
        const prevOption = index > 0 ? options[index - 1] : null;
        const prevIsSelected = prevOption ? value === prevOption.value : false;
        const showDivider = index > 0 && !isSelected && !prevIsSelected;

        return (
          <React.Fragment key={option.value}>
            {showDivider && (
              <div className="w-px bg-gray-200 my-1.5" />
            )}
            <button
              onClick={() => onChange(option.value)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100
                ${isSelected 
                  ? 'bg-white text-brand-blue-500 shadow-sm border border-gray-200' 
                  : 'bg-transparent text-gray-500 hover:text-gray-800'
                }`}
              aria-pressed={isSelected}
              title={isIconOnly ? option.label : undefined}
            >
              {option.icon && <span className={'h-5 w-5'}>{option.icon}</span>}
              {!isIconOnly && option.label}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}


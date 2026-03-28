import React from 'react';

export const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center w-full py-12">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);
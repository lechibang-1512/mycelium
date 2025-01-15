import React from 'react';
import { Loader2 } from 'lucide-react';

export function Spinner({ message, fullPage = false, className = '' }) {
  const content = (
    <div className={`flex flex-col items-center justify-center p-6 ${className}`}>
      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      {message && <p className="mt-3 text-sm font-medium text-slate-500 animate-pulse">{message}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}

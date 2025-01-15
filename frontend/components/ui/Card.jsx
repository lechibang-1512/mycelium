import React from 'react';

export function Card({ children, className = '', noPadding = false, ...props }) {
  return (
    <div 
      className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`}
      {...props}
    >
      {noPadding ? children : <div className="p-5">{children}</div>}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`px-5 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between gap-4 ${className}`}>
      <div>
        <h3 className="font-semibold text-slate-800 text-lg leading-tight">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function CardContent({ children, className = '' }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
  return <div className={`px-5 py-4 bg-slate-50 border-t border-slate-100 ${className}`}>{children}</div>;
}

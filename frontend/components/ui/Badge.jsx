import React from 'react';

const variantClasses = {
  success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  danger: 'bg-rose-100 text-rose-800 border-rose-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-200',
  info: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  secondary: 'bg-slate-100 text-slate-700 border-slate-200',
  primary: 'bg-blue-100 text-blue-800 border-blue-200',
};

export function Badge({ children, variant = 'secondary', className = '' }) {
  const classes = variantClasses[variant] || variantClasses.secondary;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${classes} ${className}`}>
      {children}
    </span>
  );
}


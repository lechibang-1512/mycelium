import React from 'react';

export function PageHeader({ title, subtitle, icon: Icon, action, breadcrumbs }) {
  return (
    <div className="mt-2 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        {breadcrumbs && (
          <nav className="flex text-sm text-slate-500 mb-2 font-medium">
            {breadcrumbs.map((bc, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="mx-2 text-slate-300">/</span>}
                {bc.href ? (
                  <a href={bc.href} className="hover:text-indigo-600 transition-colors">{bc.label}</a>
                ) : (
                  <span className="text-slate-700">{bc.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2 bg-indigo-50 rounded-lg shrink-0">
              <Icon className="w-6 h-6 text-indigo-600" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
          </div>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

import React from 'react';
import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, children, wide = false }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
                onClick={onClose}
            ></div>
            <div className={`relative bg-white rounded-xl shadow-xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} z-10 flex flex-col max-h-[90vh] animate-fade-in`}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                    <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors focus:ring-2 focus:ring-slate-200"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
}

export function ModalFooter({ children }) {
    return (
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0 rounded-b-xl">
            {children}
        </div>
    );
}

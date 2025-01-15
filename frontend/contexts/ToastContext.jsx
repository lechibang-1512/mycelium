import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within a ToastProvider");
    return ctx;
};

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    const toast = {
        success: (msg, dur = 3000) => addToast(msg, 'success', dur),
        error: (msg, dur = 5000) => addToast(msg, 'error', dur),
        info: (msg, dur = 4000) => addToast(msg, 'info', dur),
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => (
                    <div key={t.id} className={`padding-3 rounded-lg shadow-lg text-sm flex items-center gap-2 pointer-events-auto transition-all ${
                        t.type === 'success' ? 'bg-[#198754] text-white' :
                        t.type === 'error' ? 'bg-[#dc3545] text-white' :
                        'bg-white text-[#363636] border border-[#dee2e6]'
                    }`} style={{ padding: '0.75rem 1rem' }}>
                        <i className={`fas ${
                            t.type === 'success' ? 'fa-check-circle' :
                            t.type === 'error' ? 'fa-exclamation-circle' :
                            'fa-info-circle'
                        }`}></i>
                        <span>{t.message}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

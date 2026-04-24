import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-4 w-full max-w-md px-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className="pointer-events-auto"
            >
              <div className="bg-white/90 backdrop-blur-xl border border-[#2D2926]/5 shadow-2xl rounded-[30px] p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    toast.type === 'success' ? 'bg-[#27AE60]/10 text-[#27AE60]' :
                    toast.type === 'error' ? 'bg-rose-500/10 text-rose-500' :
                    'bg-blue-500/10 text-blue-500'
                  }`}>
                    {toast.type === 'success' && <CheckCircle2 size={20} />}
                    {toast.type === 'error' && <AlertCircle size={20} />}
                    {toast.type === 'info' && <Info size={20} />}
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#2D2926]">
                    {toast.message}
                  </p>
                </div>
                <button 
                  onClick={() => removeToast(toast.id)}
                  className="w-8 h-8 rounded-full hover:bg-[#2D2926]/5 flex items-center justify-center text-[#2D2926]/20 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

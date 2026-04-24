import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message }: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#2D2926]/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-sm p-10 space-y-8 overflow-hidden"
          >
            <div className="w-16 h-16 rounded-3xl bg-rose-50 flex items-center justify-center text-rose-500">
              <AlertTriangle size={32} />
            </div>
            
            <div className="space-y-3">
              <h3 className="text-2xl font-serif italic font-black text-[#1A1A1A]">{title}</h3>
              <p className="text-xs font-medium leading-relaxed text-[#2D2926]/60 italic">
                "{message}"
              </p>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-4 bg-[#F5F1EA] text-[#2D2926] text-[10px] uppercase tracking-widest font-bold rounded-full hover:bg-[#EBE7DF] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="flex-1 py-4 bg-rose-600 text-white text-[10px] uppercase tracking-widest font-bold rounded-full hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/20"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

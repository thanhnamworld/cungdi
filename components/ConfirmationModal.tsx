
import React from 'react';
import { X, AlertTriangle, CheckCircle2, Info, HelpCircle, LucideIcon } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'success' | 'info' | 'warning';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'OK',
  cancelText,
  variant = 'info',
}) => {
  if (!isOpen) return null;

  const config: { [key: string]: { Icon: LucideIcon, iconBg: string, iconColor: string, buttonBg: string, buttonHoverBg: string } } = {
    danger: {
      Icon: AlertTriangle,
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-600',
      buttonBg: 'bg-rose-600',
      buttonHoverBg: 'hover:bg-rose-700',
    },
    warning: {
      Icon: AlertTriangle,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      buttonBg: 'bg-amber-600',
      buttonHoverBg: 'hover:bg-amber-700',
    },
    success: {
      Icon: CheckCircle2,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      buttonBg: 'bg-emerald-600',
      buttonHoverBg: 'hover:bg-emerald-700',
    },
    info: {
      Icon: Info,
      iconBg: 'bg-sky-100',
      iconColor: 'text-sky-600',
      buttonBg: 'bg-sky-600',
      buttonHoverBg: 'hover:bg-sky-700',
    },
  };

  const { Icon, iconBg, iconColor, buttonBg, buttonHoverBg } = config[variant];

  return (
    <div 
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-[28px] shadow-2xl overflow-hidden animate-modal-content"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-8 text-center">
          <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center ${iconBg}`}>
            <Icon size={32} className={iconColor} />
          </div>
          <h3 className="mt-5 text-lg font-bold text-slate-800">{title}</h3>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed">{message}</p>
        </div>
        
        <div className="px-6 py-5 bg-slate-50 flex flex-col-reverse sm:flex-row sm:justify-center sm:gap-4 gap-3">
          {cancelText && (
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-3 bg-white text-slate-700 font-bold rounded-xl border border-slate-200 hover:bg-slate-100 transition-all text-sm"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={`w-full sm:w-auto px-6 py-3 text-white font-bold rounded-xl transition-all text-sm shadow-lg ${buttonBg} ${buttonHoverBg}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;

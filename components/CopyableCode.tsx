
import React, { useState } from 'react';
import { Copy, CheckCircle2 } from 'lucide-react';

interface CopyableCodeProps {
  code: string;
  label?: string;
  className?: string;
  onCopy?: () => void;
}

const CopyableCode: React.FC<CopyableCodeProps> = ({ code, label, className = "", onCopy }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!code) return;
    navigator.clipboard.writeText(code.toUpperCase());
    setCopied(true);
    if (onCopy) onCopy();
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const displayLabel = label === undefined ? code : label;
  const hasVisibleLabel = displayLabel && displayLabel.trim() !== '';

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`group relative flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${className}`}
      title={`Bấm để sao chép: ${code}`}
    >
      {displayLabel}
      {copied ? (
        <CheckCircle2 size={12} className="text-emerald-400 animate-in zoom-in" />
      ) : (
        <Copy size={12} className={`transition-opacity text-indigo-400 ${hasVisibleLabel ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`} />
      )}
    </button>
  );
};

export default CopyableCode;

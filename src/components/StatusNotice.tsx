import { AlertTriangle, Info } from 'lucide-react';

interface StatusNoticeProps {
  tone: 'milestone' | 'safety';
  label: string;
  message: string;
}

export function StatusNotice({ tone, label, message }: StatusNoticeProps) {
  const isSafety = tone === 'safety';

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border ${
        isSafety
          ? 'bg-[#171212] border-[#D9532F]/40'
          : 'bg-[#111318] border-[#232732]'
      }`}
    >
      {isSafety ? (
        <AlertTriangle className="w-4 h-4 text-[#E57350] shrink-0 mt-0.5" />
      ) : (
        <Info className="w-4 h-4 text-[#D9822B] shrink-0 mt-0.5" />
      )}
      <div className="min-w-0">
        <div
          className={`text-xs font-semibold tracking-wide uppercase mb-1 ${
            isSafety ? 'text-[#F09A7E]' : 'text-[#E5A952]'
          }`}
        >
          {label}
        </div>
        <p className="text-sm text-[#C7CCD6] leading-relaxed">{message}</p>
      </div>
    </div>
  );
}

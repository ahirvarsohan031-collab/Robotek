"use client";

interface ActionStatusModalProps {
  isOpen: boolean;
  status: 'loading' | 'success' | 'error';
  message: string;
}

export default function ActionStatusModal({ isOpen, status, message }: ActionStatusModalProps) {
  if (!isOpen || status !== 'loading') return null;

  return (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
      <div className="relative bg-white dark:bg-navy-900 rounded-3xl shadow-2xl p-8 w-full max-w-[280px] text-center animate-in fade-in zoom-in duration-300 border border-orange-100 dark:border-navy-700">
        <div className="flex flex-col items-center gap-4">
          {/* Theme Loader Spinner */}
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-[#FFD500]/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-[#FFD500] border-t-transparent rounded-full animate-spin" />
          </div>
          
          <div className="space-y-1">
            <h3 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">
              Processing
            </h3>
            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest whitespace-pre-wrap">
              {message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

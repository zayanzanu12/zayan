import React, { useState } from 'react';
import {
  Sparkles,
  Briefcase,
  Smile,
  Zap,
  CheckCheck,
  PlusCircle,
  RefreshCw,
  X,
} from 'lucide-react';
import { api } from '../../services/api';

interface AiComposerToolbarProps {
  currentText: string;
  onApplyText: (newText: string) => void;
  onClose: () => void;
}

export const AiComposerToolbar: React.FC<AiComposerToolbarProps> = ({
  currentText,
  onApplyText,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);

  const options = [
    { id: 'polish', label: 'Polish & Elevate', icon: Sparkles, color: 'text-emerald-400' },
    { id: 'professional', label: 'Make Professional', icon: Briefcase, color: 'text-cyan-400' },
    { id: 'friendly', label: 'Warm & Friendly', icon: Smile, color: 'text-amber-400' },
    { id: 'concise', label: 'Short & Punchy', icon: Zap, color: 'text-rose-400' },
    { id: 'fix_grammar', label: 'Fix Grammar & Typos', icon: CheckCheck, color: 'text-teal-400' },
    { id: 'expand', label: 'Expand Thoughts', icon: PlusCircle, color: 'text-purple-400' },
  ];

  const handleExecuteRewrite = async (mode: any) => {
    if (!currentText.trim()) return;
    setLoading(true);
    setSelectedMode(mode);

    try {
      const res = await api.aiWrite(currentText, mode);
      if (res.result) {
        onApplyText(res.result);
        onClose();
      }
    } catch (err) {
      console.error('AI Write error:', err);
    } finally {
      setLoading(false);
      setSelectedMode(null);
    }
  };

  return (
    <div className="p-3 bg-[#0D1E18] border border-[#294438] rounded-2xl shadow-2xl mb-2 animate-in fade-in slide-in-from-bottom-2 ring-1 ring-[#00C98D]/30">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#294438]">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#F4FFF9]">
          <Sparkles className="w-4 h-4 text-[#00C98D]" />
          <span>Zapp AI Writing Assistant</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-[#91A99C] hover:text-[#F4FFF9] hover:bg-[#142A22]"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {!currentText.trim() ? (
        <p className="text-[11px] text-[#91A99C] italic py-1">
          Type a thought in the message input first, then choose a tone to refine it.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {options.map((opt) => {
            const Icon = opt.icon;
            const isCurrent = selectedMode === opt.id && loading;

            return (
              <button
                key={opt.id}
                type="button"
                disabled={loading}
                onClick={() => handleExecuteRewrite(opt.id)}
                className="flex items-center gap-2 p-2 rounded-xl bg-[#142A22] hover:bg-[#00C98D]/15 border border-[#294438] hover:border-[#00C98D]/40 text-left text-xs transition-all cursor-pointer group disabled:opacity-50"
              >
                {isCurrent ? (
                  <RefreshCw className="w-3.5 h-3.5 text-[#00C98D] animate-spin shrink-0" />
                ) : (
                  <Icon className={`w-3.5 h-3.5 ${opt.color} shrink-0 group-hover:scale-110 transition-transform`} />
                )}
                <span className="text-[11px] font-medium text-[#F4FFF9] group-hover:text-[#63F5C0] truncate">
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Sparkles, Tag, CheckSquare, RefreshCw, X, FileText, Check } from 'lucide-react';
import { api } from '../../services/api';

interface AiTopicsModalProps {
  conversationId?: string;
  conversationName?: string;
  friendId?: string;
  friendName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AiTopicsModal: React.FC<AiTopicsModalProps> = ({
  conversationId,
  conversationName,
  friendId,
  friendName,
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    summary: string;
    topics: string[];
    actionItems: string[];
  } | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  const activeConvId = conversationId || friendId || 'global';
  const activeConvName = conversationName || friendName || 'Conversation';

  const loadTopics = async () => {
    setLoading(true);
    try {
      const res = await api.aiGetTopics(activeConvId);
      setData(res);
    } catch (err) {
      console.error('Failed to get AI topics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCheckedItems({});
      loadTopics();
    }
  }, [isOpen, activeConvId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-90 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in select-none">
      <div className="bg-[#0D1E18] border border-[#294438] rounded-3xl w-full max-w-lg shadow-2xl shadow-emerald-950/80 overflow-hidden animate-in zoom-in-95 ring-1 ring-[#00C98D]/25">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#294438] bg-[#142A22]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00C98D]/20 border border-[#00C98D]/40 text-[#63F5C0] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F4FFF9] tracking-wide font-heading">
                AI Conversation Insights
              </h3>
              <p className="text-xs text-[#91A99C]">
                Analysis for <span className="text-[#00C98D] font-medium">{activeConvName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadTopics}
              disabled={loading}
              className="p-1.5 rounded-xl text-[#91A99C] hover:text-[#00C98D] hover:bg-[#142A22] transition-colors cursor-pointer"
              title="Re-analyze discussion"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#91A99C] hover:text-[#F4FFF9] hover:bg-[#142A22] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full border-2 border-[#00C98D]/30 border-t-[#00C98D] animate-spin mb-3" />
              <p className="text-xs text-[#91A99C] font-mono">
                Extracting dialogue semantics with Gemini 3.8 Flash...
              </p>
            </div>
          ) : (
            <>
              {/* Executive Summary */}
              <div className="p-4 rounded-2xl bg-[#142A22]/80 border border-[#294438] space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#00C98D]">
                  <FileText className="w-4 h-4" />
                  <span>Discussion Summary</span>
                </div>
                <p className="text-xs text-[#F4FFF9] leading-relaxed">
                  {data?.summary || 'No summary available for this conversation.'}
                </p>
              </div>

              {/* Topics */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#63F5C0]">
                  <Tag className="w-4 h-4" />
                  <span>Key Discussion Topics</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data?.topics && data.topics.length > 0 ? (
                    data.topics.map((topic, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-xl bg-[#071310] border border-[#294438] text-xs font-mono text-[#F4FFF9]"
                      >
                        #{topic}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[#91A99C]">No specific topics identified yet.</span>
                  )}
                </div>
              </div>

              {/* Action items */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <CheckSquare className="w-4 h-4" />
                  <span>Decisions &amp; Action Items</span>
                </div>
                {data?.actionItems && data.actionItems.length > 0 ? (
                  <div className="space-y-1.5">
                    {data.actionItems.map((item, idx) => {
                      const isDone = Boolean(checkedItems[idx]);
                      return (
                        <div
                          key={idx}
                          onClick={() => setCheckedItems((prev) => ({ ...prev, [idx]: !isDone }))}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                            isDone
                              ? 'bg-[#142A22]/30 border-[#294438] text-[#91A99C] line-through'
                              : 'bg-[#071310] border-[#294438] text-[#F4FFF9] hover:border-[#00C98D]/40'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center shrink-0 border ${
                              isDone ? 'bg-[#00C98D] border-[#00C98D] text-[#071310]' : 'border-[#294438]'
                            }`}
                          >
                            {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="flex-1">{item}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-[#91A99C] italic">No pending action items detected.</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#071310] border-t border-[#294438] flex items-center justify-between text-[11px] text-[#91A99C]">
          <span className="font-mono">Spatial Intelligence v2.0</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#142A22] hover:bg-[#294438] text-[#F4FFF9] text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

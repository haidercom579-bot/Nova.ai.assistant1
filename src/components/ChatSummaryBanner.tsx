import React, { useState } from 'react';
import {
  Pin,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { ConversationSummary } from '../types';

interface ChatSummaryBannerProps {
  summary?: ConversationSummary;
  isSummarizing: boolean;
  error: string | null;
  currentMessageCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onRefresh: () => void;
  onDismiss: () => void;
}

export const ChatSummaryBanner: React.FC<ChatSummaryBannerProps> = ({
  summary,
  isSummarizing,
  error,
  currentMessageCount,
  isCollapsed,
  onToggleCollapse,
  onRefresh,
  onDismiss,
}) => {
  const [copied, setCopied] = useState(false);

  if (!summary && !isSummarizing && !error) {
    return null;
  }

  const isOutdated =
    Boolean(summary?.messageCount) && currentMessageCount > (summary?.messageCount || 0);

  const modelLabel =
    summary?.model === 'gemini-3.1-flash-lite'
      ? 'Gemini 3.1 Flash-Lite'
      : 'Gemini 4 Hydrogen';

  const handleCopy = async () => {
    if (!summary?.text) return;
    try {
      await navigator.clipboard.writeText(summary.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="shrink-0 px-3 md:px-6 pt-2.5 pb-1 z-20">
      <div className="max-w-3xl mx-auto rounded-2xl border border-indigo-200/80 dark:border-violet-500/30 bg-indigo-50/80 dark:bg-[#131526]/95 backdrop-blur-md shadow-sm">
        {/* Top Bar of Pinned Note */}
        <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-b border-indigo-200/50 dark:border-violet-500/15">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-violet-600/20 text-indigo-600 dark:text-violet-300 flex items-center justify-center shrink-0">
              {isSummarizing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Pin className="w-3.5 h-3.5" />
              )}
            </span>
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100 whitespace-nowrap">
                Pinned Summary
              </span>
              {summary && !isSummarizing && (
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                  {modelLabel}
                  {isOutdated ? ' · New messages added' : ''}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {summary?.text && !isSummarizing && (
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-indigo-100/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Copy summary"
                aria-label="Copy summary"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onRefresh}
              disabled={isSummarizing}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-indigo-700 dark:text-violet-300 hover:bg-indigo-100/80 dark:hover:bg-violet-600/20 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
              title="Regenerate summary with current model"
            >
              <RefreshCw className={`w-3 h-3 ${isSummarizing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isOutdated ? 'Update' : 'Refresh'}</span>
            </button>

            {summary?.text && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-indigo-100/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title={isCollapsed ? 'Expand summary' : 'Collapse summary'}
                aria-label={isCollapsed ? 'Expand summary' : 'Collapse summary'}
              >
                {isCollapsed ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onDismiss}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-indigo-100/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Unpin summary"
              aria-label="Unpin summary"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Summary Body */}
        {!isCollapsed && (
          <div className="px-3.5 py-2.5">
            {isSummarizing ? (
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-300">
                <span>Summarizing conversation with the current model...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-between gap-2 text-xs text-rose-700 dark:text-rose-300">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="truncate">{error}</span>
                </div>
                <button
                  type="button"
                  onClick={onRefresh}
                  className="px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-900/40 hover:bg-rose-200 dark:hover:bg-rose-900/60 text-xs font-semibold whitespace-nowrap cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : summary?.text ? (
              <p className="text-xs sm:text-[13px] text-slate-700 dark:text-zinc-200 leading-relaxed whitespace-pre-line">
                {summary.text}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

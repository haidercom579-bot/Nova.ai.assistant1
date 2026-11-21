import React, { useState } from 'react';
import {
  Menu,
  Sun,
  Moon,
  QrCode,
  Mic,
  ChevronDown,
  Check,
  Download,
  FileText,
  FileCode,
  MoreHorizontal,
  Settings,
  Plus,
  Sparkles,
  Loader2,
  CreditCard,
  ShoppingCart,
  KeyRound,
  Cpu,
} from 'lucide-react';
import { ThemeMode, GeminiModel } from '../types';
import { ExportFormat } from '../services/export';

interface HeaderProps {
  isSidebarOpen?: boolean;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
  onOpenQRCode: () => void;
  onOpenVoiceMode: () => void;
  currentTheme: ThemeMode;
  onToggleTheme: () => void;
  selectedModel?: GeminiModel;
  onSelectModel?: (model: GeminiModel) => void;
  canExport?: boolean;
  onExportConversation?: (format: ExportFormat) => void;
  canSummarize?: boolean;
  isSummarizing?: boolean;
  hasSummary?: boolean;
  onSummarize?: () => void;
  isPricingActive?: boolean;
  onOpenPricing?: () => void;
  isCartActive?: boolean;
  cartCount?: number;
  onOpenCart?: () => void;
  isEnablesActive?: boolean;
  isEnableKeyActive?: boolean;
  onOpenEnables?: () => void;
  isWorkActive?: boolean;
  activeWorkAgentId?: string | null;
  onOpenWork?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isSidebarOpen = false,
  onNewChat,
  onOpenSettings,
  onToggleSidebar,
  onOpenQRCode,
  onOpenVoiceMode,
  currentTheme,
  onToggleTheme,
  selectedModel = 'gemini-4-hydrogen',
  onSelectModel,
  canExport = false,
  onExportConversation,
  canSummarize = false,
  isSummarizing = false,
  hasSummary = false,
  onSummarize,
  isPricingActive = false,
  onOpenPricing,
  isCartActive = false,
  cartCount = 0,
  onOpenCart,
  isEnablesActive = false,
  isEnableKeyActive = false,
  onOpenEnables,
  isWorkActive = false,
  activeWorkAgentId = null,
  onOpenWork,
}) => {
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [exportedJustNow, setExportedJustNow] = useState(false);

  const handleExport = (format: ExportFormat) => {
    onExportConversation?.(format);
    setIsExportMenuOpen(false);
    setIsMoreMenuOpen(false);
    setExportedJustNow(true);
    setTimeout(() => setExportedJustNow(false), 2000);
  };

  const modelLabels: Record<GeminiModel, { name: string; desc: string }> = {
    'gemini-4-hydrogen': {
      name: 'Gemini 4 Hydrogen',
      desc: 'Highest intelligence, reasoning & web search',
    },
    'gemini-3.1-flash-lite': {
      name: 'Gemini 3.1 Flash-Lite',
      desc: 'Ultra-low latency & speed',
    },
  };

  return (
    <header className="h-14 px-3 md:px-5 flex items-center justify-between shrink-0 z-30 border-b border-slate-200/60 dark:border-zinc-800/50 bg-white/75 dark:bg-[#0B0C14]/75 backdrop-blur-md">
      {/* Left: Sidebar Trigger (when closed / mobile) + Clean Model Selector */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleSidebar}
          className={`p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer ${
            isSidebarOpen ? 'md:hidden' : ''
          }`}
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Model Selector Pill Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsModelMenuOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-zinc-900/90 hover:bg-slate-200/70 dark:hover:bg-zinc-800 border border-slate-200/90 dark:border-zinc-800 transition-colors text-xs font-medium text-slate-800 dark:text-zinc-200 cursor-pointer whitespace-nowrap"
            title="Select Gemini Model Version"
          >
            <span>{modelLabels[selectedModel]?.name || 'Gemini 4 Hydrogen'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isModelMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsModelMenuOpen(false)}
              />
              <div className="absolute top-full left-0 mt-1.5 w-64 p-1.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xl z-50">
                <div className="px-2.5 py-1.5 text-[11px] font-medium text-slate-400">
                  Model Version
                </div>
                {(Object.keys(modelLabels) as GeminiModel[]).map((key) => {
                  const info = modelLabels[key];
                  const isSelected = selectedModel === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        onSelectModel?.(key);
                        setIsModelMenuOpen(false);
                      }}
                      className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-violet-950/50 text-indigo-900 dark:text-violet-200'
                          : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold">{info.name}</div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                          {info.desc}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-indigo-600 dark:text-violet-400 shrink-0 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: Compact Action Cluster (Voice Mode, Export when active, More Menu) */}
      <div className="flex items-center gap-1.5">
        {!isSidebarOpen && (
          <button
            type="button"
            onClick={onNewChat}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer whitespace-nowrap"
            title="New Chat"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        )}

        {onOpenPricing && (
          <button
            type="button"
            onClick={onOpenPricing}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl border transition-colors cursor-pointer whitespace-nowrap ${
              isPricingActive
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-slate-100 dark:bg-zinc-900/90 hover:bg-slate-200/80 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 border-slate-200/80 dark:border-zinc-800'
            }`}
            title="View NOVA Plans (All Plans Free: Startup, Pro, Max)"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pricing</span>
          </button>
        )}

        {onOpenCart && (cartCount > 0 || isCartActive) && (
          <button
            type="button"
            onClick={onOpenCart}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl border transition-colors cursor-pointer whitespace-nowrap ${
              isCartActive
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-violet-50 dark:bg-violet-950/50 hover:bg-violet-100 dark:hover:bg-violet-900/60 text-violet-700 dark:text-violet-200 border-violet-200/80 dark:border-violet-700/60'
            }`}
            title="View Cart"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span className="tabular-nums font-semibold">({cartCount})</span>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={onOpenVoiceMode}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl bg-indigo-50 dark:bg-violet-950/50 hover:bg-indigo-100 dark:hover:bg-violet-900/50 text-indigo-700 dark:text-violet-200 border border-indigo-200/70 dark:border-violet-800/60 transition-colors cursor-pointer whitespace-nowrap"
          title="Open Voice Mode"
        >
          <Mic className="w-3.5 h-3.5 text-indigo-600 dark:text-violet-400" />
          <span className="hidden sm:inline">Voice Mode</span>
        </button>

        {onOpenEnables && (
          <button
            type="button"
            onClick={onOpenEnables}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl border transition-colors cursor-pointer whitespace-nowrap ${
              isEnablesActive
                ? 'bg-blue-600 text-white border-blue-600'
                : isEnableKeyActive
                ? 'bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-200 border-blue-200/80 dark:border-blue-700/60'
                : 'bg-slate-100 dark:bg-zinc-900/90 hover:bg-slate-200/80 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 border-slate-200/80 dark:border-zinc-800'
            }`}
            title="Open Enables & Quick Access Key"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Enables</span>
          </button>
        )}

        {onOpenWork && (
          <button
            type="button"
            onClick={onOpenWork}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer whitespace-nowrap ${
              isWorkActive
                ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                : 'bg-blue-50 dark:bg-[#0E1730] hover:bg-blue-100 dark:hover:bg-blue-950/80 text-blue-700 dark:text-blue-200 border-blue-200/80 dark:border-blue-700/60'
            }`}
            title={activeWorkAgentId ? `Open WORK Agent ${activeWorkAgentId}` : 'Launch WORK AI Agent'}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>WORK</span>
          </button>
        )}

        {canSummarize && onSummarize && (
          <button
            type="button"
            onClick={onSummarize}
            disabled={isSummarizing}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl border transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60 ${
              hasSummary
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40'
                : 'bg-slate-100 dark:bg-zinc-900/90 hover:bg-slate-200/80 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 border-slate-200/80 dark:border-zinc-800'
            }`}
            title="Summarize this conversation with the current model"
            aria-label="Auto-Summarize conversation"
          >
            {isSummarizing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-violet-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-violet-400" />
            )}
            <span className="hidden sm:inline">
              {isSummarizing ? 'Summarizing...' : 'Auto-Summarize'}
            </span>
          </button>
        )}

        {canExport && onExportConversation && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
                exportedJustNow
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'text-slate-600 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/80'
              }`}
              aria-label="Export current conversation"
              aria-expanded={isExportMenuOpen}
              title="Export conversation (.md or .txt)"
            >
              {exportedJustNow ? (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span className="hidden md:inline">
                {exportedJustNow ? 'Exported' : 'Export'}
              </span>
            </button>

            {isExportMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsExportMenuOpen(false)}
                />
                <div className="absolute top-full right-0 mt-1.5 w-60 p-1.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xl z-50">
                  <div className="px-2.5 py-1.5 text-[11px] font-medium text-slate-400">
                    Export Conversation
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExport('md')}
                    className="w-full flex items-start gap-2.5 p-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer"
                  >
                    <FileCode className="w-4 h-4 text-indigo-600 dark:text-violet-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold whitespace-nowrap">Markdown (.md)</div>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                        Preserves formatting & sources
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('txt')}
                    className="w-full flex items-start gap-2.5 p-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-slate-500 dark:text-zinc-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold whitespace-nowrap">Plain Text (.txt)</div>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                        Clean readable transcript
                      </p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Overflow Actions Menu (Matches clean "..." button on top right) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMoreMenuOpen((prev) => !prev)}
            className="w-8 h-8 rounded-full flex items-center justify-center border border-slate-200 dark:border-zinc-800 bg-slate-100/80 dark:bg-zinc-900/90 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="More options"
            aria-expanded={isMoreMenuOpen}
            title="More options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {isMoreMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsMoreMenuOpen(false)}
              />
              <div className="absolute top-full right-0 mt-1.5 w-52 p-1.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xl z-50 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    onToggleTheme();
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {currentTheme === 'dark' ? (
                    <>
                      <Sun className="w-4 h-4 text-amber-400" />
                      <span>Switch to Light Mode</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4 text-slate-600" />
                      <span>Switch to Dark Mode</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenQRCode();
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <QrCode className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
                  <span>Open Mobile QR Code</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenSettings();
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Settings className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
                  <span>Settings & About</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

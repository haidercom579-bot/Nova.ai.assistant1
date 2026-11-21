import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  X,
  Settings,
  QrCode,
  Mic,
  Download,
  FileCode,
  FileText,
  History,
  ChevronDown,
  ChevronUp,
  PanelLeftClose,
  Sparkles,
  LogOut,
  CreditCard,
  ShoppingCart,
  Home,
  KeyRound,
  Cpu,
} from 'lucide-react';
import { Conversation, GeminiModel, PlanTier } from '../types';
import { ExportFormat } from '../services/export';
import { UserProfile } from '../services/auth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onOpenSettings: () => void;
  onOpenQRCode: () => void;
  onOpenVoiceMode: () => void;
  canExport?: boolean;
  onExportConversation?: (format: ExportFormat) => void;
  selectedModel?: GeminiModel;
  currentUser?: UserProfile | null;
  onLogout?: () => void;
  currentPlan?: PlanTier;
  isPricingActive?: boolean;
  onOpenPricing?: () => void;
  isCartActive?: boolean;
  cartCount?: number;
  onOpenCart?: () => void;
  isHomeActive?: boolean;
  onGoHome?: () => void;
  isEnablesActive?: boolean;
  isEnableKeyActive?: boolean;
  onOpenEnables?: () => void;
  isWorkActive?: boolean;
  activeWorkAgentId?: string | null;
  onOpenWork?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onOpenSettings,
  onOpenQRCode,
  onOpenVoiceMode,
  canExport = false,
  onExportConversation,
  selectedModel = 'gemini-4-hydrogen',
  currentUser,
  onLogout,
  currentPlan = 'startup',
  isPricingActive = false,
  onOpenPricing,
  isCartActive = false,
  cartCount = 0,
  onOpenCart,
  isHomeActive = true,
  onGoHome,
  isEnablesActive = false,
  isEnableKeyActive = false,
  onOpenEnables,
  isWorkActive = false,
  activeWorkAgentId = null,
  onOpenWork,
}) => {
  const [showAllChats, setShowAllChats] = useState(false);

  const visibleConversations = showAllChats ? conversations : conversations.slice(0, 6);
  const hasMoreChats = conversations.length > 6;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Persistent Desktop / Slide-over Mobile Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-[268px] shrink-0 flex flex-col bg-slate-50 dark:bg-[#0D0E17] border-r border-slate-200/80 dark:border-zinc-800/70 transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0 flex' : '-translate-x-full md:hidden'
        }`}
      >
        {/* Top Brand Row */}
        <div className="h-14 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <img
              src="/app-icon.jpg"
              alt="NOVA"
              className="w-7 h-7 rounded-full object-cover ring-1 ring-indigo-500/40 shadow-xs"
            />
            <span className="font-display font-bold text-base tracking-tight text-slate-900 dark:text-zinc-100">
              NOVA
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4 hidden md:block" />
            <X className="w-4 h-4 md:hidden" />
          </button>
        </div>

        {/* Primary New Chat CTA */}
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 768) onClose();
            }}
            className="w-full flex items-center gap-2.5 py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-xs font-semibold text-white shadow-md shadow-violet-600/20 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Recent Conversations & Quick Nav */}
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-4">
          {/* Recent Threads */}
          <div>
            <div className="flex items-center gap-2 px-1.5 pb-2 text-xs font-medium text-slate-500 dark:text-zinc-400">
              <History className="w-3.5 h-3.5" />
              <span>Recent</span>
            </div>

            {conversations.length === 0 ? (
              <div className="ml-2 pl-3 border-l border-slate-200 dark:border-zinc-800/80 py-2">
                <p className="text-xs text-slate-400 dark:text-zinc-500">No recent conversations yet.</p>
              </div>
            ) : (
              <div className="ml-2 pl-2.5 border-l border-slate-200 dark:border-zinc-800/80 space-y-0.5">
                {visibleConversations.map((conv) => {
                  const isActive = conv.id === activeId;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        onSelectConversation(conv.id);
                        if (window.innerWidth < 768) onClose();
                      }}
                      className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-indigo-50 dark:bg-zinc-800/90 text-indigo-900 dark:text-zinc-100 font-medium'
                          : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-zinc-800/50 hover:text-slate-900 dark:hover:text-zinc-200'
                      }`}
                    >
                      <span className="truncate pr-2">{conv.title || 'Untitled Chat'}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(conv.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-rose-500 transition-opacity shrink-0"
                        title="Delete chat"
                        aria-label="Delete chat"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}

                {hasMoreChats && (
                  <button
                    type="button"
                    onClick={() => setShowAllChats((prev) => !prev)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-500 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                  >
                    <span>{showAllChats ? 'Less' : 'More'}</span>
                    {showAllChats ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Utility Links — Arranged Line-Wise: Home, Settings, Pricing, Voice Mode, Enables */}
          <div className="space-y-0.5 pt-1">
            <button
              type="button"
              onClick={() => {
                if (onGoHome) {
                  onGoHome();
                } else {
                  onNewChat();
                }
                if (window.innerWidth < 768) onClose();
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                isHomeActive
                  ? 'bg-indigo-50 dark:bg-violet-950/60 text-indigo-800 dark:text-violet-200 font-semibold'
                  : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-200/60 dark:hover:bg-zinc-800/60'
              }`}
            >
              <Home className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
              <span>Home</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenSettings();
                if (window.innerWidth < 768) onClose();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-200/60 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Settings className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0" />
              <span>Settings</span>
            </button>

            {onOpenPricing && (
              <button
                type="button"
                onClick={() => {
                  onOpenPricing();
                  if (window.innerWidth < 768) onClose();
                }}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isPricingActive
                    ? 'bg-indigo-50 dark:bg-violet-950/60 text-indigo-800 dark:text-violet-200 font-semibold'
                    : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-200/60 dark:hover:bg-zinc-800/60'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-indigo-500 dark:text-violet-400 shrink-0" />
                  <span>Pricing</span>
                </span>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {currentPlan === 'max' ? 'Max · Free' : currentPlan === 'pro' ? 'Pro · Free' : 'Free'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onOpenVoiceMode();
                if (window.innerWidth < 768) onClose();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-200/60 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Mic className="w-4 h-4 text-violet-500 dark:text-violet-400 shrink-0" />
              <span>Voice Mode</span>
            </button>

            {onOpenEnables && (
              <button
                type="button"
                onClick={() => {
                  onOpenEnables();
                  if (window.innerWidth < 768) onClose();
                }}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isEnablesActive
                    ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-800 dark:text-blue-200 font-semibold'
                    : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-200/60 dark:hover:bg-zinc-800/60'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <KeyRound className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
                  <span>Enables</span>
                </span>
                <span
                  className={`text-[11px] font-semibold ${
                    isEnableKeyActive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-400 dark:text-zinc-500'
                  }`}
                >
                  {isEnableKeyActive ? 'Active' : 'Off'}
                </span>
              </button>
            )}

            {onOpenWork && (
              <button
                type="button"
                onClick={() => {
                  onOpenWork();
                  if (window.innerWidth < 768) onClose();
                }}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isWorkActive
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-700 dark:text-zinc-300 hover:bg-blue-50 dark:hover:bg-blue-950/50'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Cpu
                    className={`w-4 h-4 shrink-0 ${
                      isWorkActive ? 'text-white' : 'text-blue-600 dark:text-blue-400'
                    }`}
                  />
                  <span>WORK</span>
                </span>
                <span
                  className={`text-[11px] font-mono font-semibold tabular-nums ${
                    isWorkActive
                      ? 'text-blue-100'
                      : activeWorkAgentId
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-400 dark:text-zinc-500'
                  }`}
                >
                  {activeWorkAgentId ? `#${activeWorkAgentId}` : 'Agent'}
                </span>
              </button>
            )}

            {onOpenCart && cartCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  onOpenCart();
                  if (window.innerWidth < 768) onClose();
                }}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isCartActive
                    ? 'bg-indigo-50 dark:bg-violet-950/60 text-indigo-800 dark:text-violet-200 font-semibold'
                    : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-200/60 dark:hover:bg-zinc-800/60'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <ShoppingCart className="w-4 h-4 text-violet-500 dark:text-violet-400 shrink-0" />
                  <span>Cart</span>
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-violet-100 dark:bg-violet-600/30 text-[11px] font-semibold text-violet-700 dark:text-violet-200 tabular-nums">
                  {cartCount}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onOpenQRCode();
                if (window.innerWidth < 768) onClose();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-200/60 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer whitespace-nowrap"
            >
              <QrCode className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0" />
              <span>Mobile QR Code</span>
            </button>
          </div>
        </div>

        {/* Bottom Workspace & Export Card */}
        <div className="p-3 space-y-2.5 border-t border-slate-200/70 dark:border-zinc-800/70">
          {canExport && onExportConversation && (
            <div>
              <div className="flex items-center gap-1.5 px-1 pb-1.5 text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                <Download className="w-3.5 h-3.5" />
                <span>Export Current Chat</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onExportConversation('md')}
                  className="flex items-center justify-center gap-1.5 min-h-[34px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-medium text-slate-700 dark:text-zinc-200 whitespace-nowrap transition-colors cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                  <span>Markdown</span>
                </button>
                <button
                  type="button"
                  onClick={() => onExportConversation('txt')}
                  className="flex items-center justify-center gap-1.5 min-h-[34px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-medium text-slate-700 dark:text-zinc-200 whitespace-nowrap transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400 shrink-0" />
                  <span>Text (.txt)</span>
                </button>
              </div>
            </div>
          )}

          {/* Active Plan & Engine Card */}
          <div className="rounded-2xl p-3.5 bg-white dark:bg-[#131522] border border-slate-200/80 dark:border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-500 dark:text-violet-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100">
                  {currentPlan === 'max'
                    ? 'NOVA Max'
                    : currentPlan === 'pro'
                    ? 'NOVA Pro'
                    : 'NOVA Startup'}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                Free ($0)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
              Running {selectedModel === 'gemini-3.1-flash-lite' ? 'Gemini 3.1 Flash-Lite' : 'Gemini 4 Hydrogen'}.
            </p>
            <button
              type="button"
              onClick={() => {
                if (onOpenPricing) {
                  onOpenPricing();
                  if (window.innerWidth < 768) onClose();
                } else {
                  onOpenSettings();
                }
              }}
              className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-violet-600/20 hover:bg-slate-200 dark:hover:bg-violet-600/30 border border-slate-200 dark:border-violet-500/30 text-xs font-semibold text-slate-800 dark:text-violet-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              {currentPlan === 'startup' ? 'Explore Pro & Max (Free)' : 'Manage Plan (Free)'}
            </button>
          </div>

          {/* Signed-in User Profile Row */}
          {currentUser && (
            <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-xl bg-slate-100/80 dark:bg-zinc-900/80 border border-slate-200/70 dark:border-zinc-800/80">
              <button
                type="button"
                onClick={() => {
                  onOpenSettings();
                  if (window.innerWidth < 768) onClose();
                }}
                className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer group"
                title="Manage account & phone number"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs">
                  {currentUser.name.trim().charAt(0).toUpperCase() || 'N'}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate group-hover:text-indigo-600 dark:group-hover:text-violet-300 transition-colors">
                    {currentUser.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                    {currentUser.phoneNumber
                      ? `${currentUser.phoneCountryCode || ''} ${currentUser.phoneNumber}`.trim()
                      : currentUser.email}
                  </div>
                </div>
              </button>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200/70 dark:hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
                  title="Log out"
                  aria-label="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

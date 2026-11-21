import React, { useState, useEffect, useRef } from 'react';
import {
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  Eye,
  EyeOff,
  Power,
  Send,
  ExternalLink,
  ArrowRight,
  Trash2,
  Mic,
  Smartphone,
  AlertTriangle,
  Loader2,
  Bot,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { AgentAction, AgentKeyConfig, WorkAgentMessage } from '../types';

interface EnableKeyWorkspaceProps {
  activeAgentId?: string;
  config: AgentKeyConfig | null;
  messages: WorkAgentMessage[];
  isSending: boolean;
  keyError: string | null;
  onGenerateKey: () => Promise<void>;
  onToggleKeyActive: () => Promise<void>;
  onToggleQuickAccess: () => Promise<void>;
  onToggleFloatingIcon: () => Promise<void>;
  onRevokeKey: () => Promise<void>;
  onSendCommand: (command: string, source: 'dashboard' | 'quick_access') => Promise<void>;
  onClearAgentHistory: () => void;
  onNavigateView: (targetView: NonNullable<AgentAction['targetView']>) => void;
  onBackToHome: () => void;
}

export const EnableKeyWorkspace: React.FC<EnableKeyWorkspaceProps> = ({
  activeAgentId = '101',
  config,
  messages,
  isSending,
  keyError,
  onGenerateKey,
  onToggleKeyActive,
  onToggleQuickAccess,
  onToggleFloatingIcon,
  onRevokeKey,
  onSendCommand,
  onClearAgentHistory,
  onNavigateView,
  onBackToHome,
}) => {
  const [revealKey, setRevealKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const displayAgentId = config?.agentId || activeAgentId;
  const [micPermission, setMicPermission] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>(
    'unknown'
  );
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((status) => {
          setMicPermission(status.state as 'granted' | 'denied' | 'prompt');
          status.onchange = () => {
            setMicPermission(status.state as 'granted' | 'denied' | 'prompt');
          };
        })
        .catch(() => setMicPermission('unknown'));
    }
  }, []);

  const handleRequestMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicPermission('granted');
    } catch {
      setMicPermission('denied');
    }
  };

  const handleCopyKey = async () => {
    if (!config?.accessKey) return;
    try {
      await navigator.clipboard.writeText(config.accessKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleGenerateClick = async () => {
    setIsGenerating(true);
    try {
      await onGenerateKey();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async (e?: React.FormEvent, preset?: string) => {
    e?.preventDefault();
    const cmd = (preset ?? commandInput).trim();
    if (!cmd || isSending) return;
    if (!preset) setCommandInput('');
    await onSendCommand(cmd, 'dashboard');
  };

  const isKeyActive = config?.status === 'active';
  const isQuickAccessOn = Boolean(config?.quickAccessEnabled);
  const isFloatingOn = Boolean(config?.floatingIconEnabled);

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header + Return Home */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToHome}
              className="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Home</span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-xl sm:text-2xl text-slate-900 dark:text-white">
                  Enables · Quick Access
                </h1>
                <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/70 border border-blue-200/80 dark:border-blue-700/50 text-[11px] font-semibold text-blue-700 dark:text-blue-300 font-mono tabular-nums">
                  Agent #{config?.agentId || activeAgentId}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Manage ENABLE KEY authentication, Quick Access shortcuts, and quick command console.
              </p>
            </div>
          </div>

          {/* Live Agent Connection Strip */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#0E1325] border border-slate-200 dark:border-blue-800/50 flex items-center gap-2">
              <Bot className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-slate-500 dark:text-zinc-400">Agent ID:</span>
              <strong className="text-slate-900 dark:text-white font-mono tabular-nums">
                {config?.agentId || activeAgentId}
              </strong>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#0E1325] border border-slate-200 dark:border-blue-800/50 flex items-center gap-2">
              <span className="text-slate-500 dark:text-zinc-400">Key Status:</span>
              <strong
                className={
                  isKeyActive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }
              >
                {isKeyActive ? 'Active' : 'Inactive'}
              </strong>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#0E1325] border border-slate-200 dark:border-blue-800/50 flex items-center gap-2">
              <span className="text-slate-500 dark:text-zinc-400">Quick Access:</span>
              <strong
                className={
                  isQuickAccessOn && isKeyActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-zinc-400'
                }
              >
                {isQuickAccessOn && isKeyActive ? 'Enabled' : 'Disabled'}
              </strong>
            </div>
          </div>
        </div>

        {keyError && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-200">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{keyError}</span>
          </div>
        )}

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: ENABLE KEY CARD + PERMISSIONS + FLOATING PREVIEW */}
          <div className="lg:col-span-5 space-y-5">
            {/* ENABLE KEY CARD */}
            <div className="rounded-3xl bg-white dark:bg-[#0D1224] border border-blue-200/80 dark:border-blue-700/40 shadow-lg p-5 sm:p-6 space-y-5 relative overflow-hidden">
              <div
                className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400"
                aria-hidden="true"
              />

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-600/25 shrink-0">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                      ENABLE KEY
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      NOVA AI Quick Access &amp; Agent Auth
                    </p>
                  </div>
                </div>

                {/* Key Active/Inactive Toggle */}
                {config && (
                  <button
                    type="button"
                    onClick={onToggleKeyActive}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
                      isKeyActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-100 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-300'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{isKeyActive ? 'Active' : 'Inactive'}</span>
                  </button>
                )}
              </div>

              {/* Key Display Panel */}
              {config ? (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#070B17] border border-slate-200 dark:border-blue-900/50 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                      <span>Agent #{config.agentId} Access Key</span>
                      <span>Created {new Date(config.createdAt).toLocaleTimeString()}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <code className="text-xs font-mono text-blue-700 dark:text-blue-300 break-all">
                        {revealKey ? config.accessKey : config.maskedKey}
                      </code>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setRevealKey((prev) => !prev)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-zinc-800 cursor-pointer"
                          title={revealKey ? 'Hide key' : 'Reveal key'}
                          aria-label={revealKey ? 'Hide key' : 'Reveal key'}
                        >
                          {revealKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyKey}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Key</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Regenerate & Revoke Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={handleGenerateClick}
                      className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-700/50 text-xs font-semibold text-blue-700 dark:text-blue-200 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                      <span>Regenerate Key</span>
                    </button>

                    <button
                      type="button"
                      onClick={onRevokeKey}
                      className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/50 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Revoke Key</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#080C1A] border border-dashed border-blue-300 dark:border-blue-800/60 text-center space-y-3">
                  <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                    Generate a unique access key to authenticate WORK Agent #{displayAgentId} and unlock NOVA AI Quick Access.
                  </p>
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={handleGenerateClick}
                    className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-blue-600/25 transition-all cursor-pointer whitespace-nowrap"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <KeyRound className="w-4 h-4" />
                    )}
                    <span>Generate Key</span>
                  </button>
                </div>
              )}

              {/* Quick Access & Floating Icon Controls */}
              <div className="pt-4 border-t border-slate-100 dark:border-blue-900/40 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-zinc-100">
                      NOVA AI Quick Access
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Allow compact chatbot access across NOVA screens
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!config}
                    onClick={onToggleQuickAccess}
                    className={`min-h-[34px] px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap ${
                      isQuickAccessOn
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700'
                    }`}
                  >
                    {isQuickAccessOn ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-zinc-100">
                      Floating NOVA Icon (Optional)
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Show floating shortcut button at bottom-right
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!config || !isQuickAccessOn}
                    onClick={onToggleFloatingIcon}
                    className={`min-h-[34px] px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap ${
                      isFloatingOn && isQuickAccessOn
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700'
                    }`}
                  >
                    {isFloatingOn && isQuickAccessOn ? 'Visible' : 'Hidden'}
                  </button>
                </div>
              </div>
            </div>

            {/* PERMISSIONS & SECURITY CARD */}
            <div className="rounded-3xl bg-white dark:bg-[#0D1224] border border-slate-200/80 dark:border-blue-900/40 p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Permissions & Security</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-[#070B17] border border-slate-200/70 dark:border-blue-900/40">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Mic className="w-4 h-4 text-blue-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-zinc-100">
                        Microphone Access
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                        Status: <span className="capitalize font-medium">{micPermission}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRequestMicrophone}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold cursor-pointer whitespace-nowrap"
                  >
                    {micPermission === 'granted' ? 'Verified' : 'Allow Mic'}
                  </button>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-[#070B17] border border-slate-200/70 dark:border-blue-900/40">
                  <Smartphone className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">
                    Quick Access runs strictly inside NOVA&apos;s supported browser &amp; Android Chrome workspace. Private server keys are never exposed, other apps are never monitored, and native OS-level actions outside web capabilities are clearly declined rather than faked.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: SHARED WORK AGENT #101 CONSOLE & FLOATING PREVIEW */}
          <div className="lg:col-span-7 space-y-5">
            <div className="rounded-3xl bg-white dark:bg-[#0D1224] border border-slate-200/80 dark:border-blue-800/40 shadow-lg overflow-hidden flex flex-col">
              {/* Console Header */}
              <div className="px-5 py-4 bg-gradient-to-r from-[#0B1228] via-[#111B3D] to-[#0E1630] text-white flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src="/app-icon.jpg"
                    alt="WORK Agent 101"
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-400/40"
                  />
                  <div>
                    <div className="text-sm font-bold flex items-center gap-2">
                      <span>Quick Access Agent #{config?.agentId || activeAgentId} Console</span>
                      <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                    </div>
                    <p className="text-[11px] text-blue-200/80">
                      Synced live with the Floating Quick Access chatbot
                    </p>
                  </div>
                </div>

                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearAgentHistory}
                    className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-medium text-blue-100 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Clear History
                  </button>
                )}
              </div>

              {/* Quick Test Commands */}
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-[#090D1B] border-b border-slate-200/70 dark:border-blue-900/40 flex flex-wrap items-center gap-1.5">
                {[
                  'Open ChatGPT',
                  'Open YouTube',
                  'Open Google',
                  'Search latest Gemini AI features',
                  'Open Pricing',
                ].map((cmd) => (
                  <button
                    key={cmd}
                    type="button"
                    disabled={!config || !isKeyActive || isSending}
                    onClick={() => handleSend(undefined, cmd)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#111936] hover:bg-blue-50 dark:hover:bg-blue-900/50 border border-slate-200 dark:border-blue-800/50 text-[11px] font-medium text-slate-700 dark:text-blue-100 disabled:opacity-45 transition-colors cursor-pointer"
                  >
                    {cmd}
                  </button>
                ))}
              </div>

              {/* Shared Message Feed */}
              <div className="h-[340px] overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-slate-50/50 dark:bg-[#070A15]">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-2.5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 flex items-center justify-center">
                      <Bot className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-zinc-100">
                      {config && isKeyActive
                        ? `WORK Agent #${displayAgentId} is ready`
                        : 'Generate & activate a key to unlock commands'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                      Commands sent here and commands sent from the floating Quick Access panel share this exact conversation thread.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.role === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                            : msg.isError
                            ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-200'
                            : 'bg-white dark:bg-[#111830] border border-slate-200 dark:border-blue-800/50 text-slate-800 dark:text-zinc-100 shadow-2xs'
                        }`}
                      >
                        <p>{msg.content}</p>

                        {msg.action && (
                          <div className="mt-2.5 pt-2 border-t border-slate-200/70 dark:border-blue-700/40">
                            {msg.action.url && (
                              <a
                                href={msg.action.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold transition-colors"
                              >
                                <span>{msg.action.label || 'Open Link'}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}

                            {msg.action.targetView && (
                              <button
                                type="button"
                                onClick={() => onNavigateView(msg.action!.targetView!)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                <span>{msg.action.label || `Go to ${msg.action.targetView}`}</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}

                            {msg.action.type === 'unsupported_device_action' && (
                              <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-300">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>Requires native Android OS permissions</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 px-1">
                        {msg.source === 'quick_access' ? 'via Floating Quick Access' : 'via Enables Console'}
                      </span>
                    </div>
                  ))
                )}

                {isSending && (
                  <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-300">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>WORK Agent #{displayAgentId} is processing...</span>
                  </div>
                )}

                <div ref={feedEndRef} />
              </div>

              {/* Command Input */}
              <form
                onSubmit={(e) => handleSend(e)}
                className="p-3 bg-white dark:bg-[#0C1122] border-t border-slate-200 dark:border-blue-900/40 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  disabled={!config || !isKeyActive || isSending}
                  placeholder={
                    !config
                      ? 'Click Generate Key on the left to start...'
                      : !isKeyActive
                      ? 'Key is Inactive — toggle Active to send commands...'
                      : `Ask Agent #${displayAgentId} to open ChatGPT, YouTube, search the web...`
                  }
                  className="flex-1 min-w-0 min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#070B17] border border-slate-200 dark:border-blue-900/50 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 disabled:opacity-55"
                />
                <button
                  type="submit"
                  disabled={!commandInput.trim() || !config || !isKeyActive || isSending}
                  className="min-h-[42px] px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-45 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>

            {/* Floating Chatbot Preview Card */}
            <div className="rounded-3xl bg-gradient-to-br from-[#0A1024] via-[#0E1632] to-[#0A1228] border border-blue-700/40 p-5 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-blue-300">
                  Floating Shortcut Preview
                </div>
                <p className="text-xs text-blue-100/80 leading-relaxed max-w-md">
                  {isQuickAccessOn && isKeyActive && isFloatingOn
                    ? 'The floating NOVA icon is live in the bottom-right corner across Home, Settings, Pricing, and Cart.'
                    : 'Enable Quick Access and turn on the Floating Icon to display the quick launcher across all NOVA screens.'}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0 px-4 py-2.5 rounded-2xl bg-[#070A16]/80 border border-blue-500/30">
                <div className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5">
                  <img
                    src="/app-icon.jpg"
                    alt="NOVA Shortcut Preview"
                    className="w-full h-full rounded-full object-cover"
                  />
                  <span
                    className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#070A16] ${
                      isQuickAccessOn && isKeyActive ? 'bg-emerald-400' : 'bg-zinc-500'
                    }`}
                  />
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold text-white">NOVA Shortcut</div>
                  <div className="text-[11px] text-blue-300">
                    {isQuickAccessOn && isKeyActive && isFloatingOn ? 'Live on screen' : 'Hidden'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

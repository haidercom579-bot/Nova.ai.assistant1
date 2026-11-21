import React, { useState, useEffect } from 'react';
import {
  Cpu,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  UserCheck,
  Lock,
  Layers,
  Scale,
  CheckCircle2,
  X,
} from 'lucide-react';
import { WorkAgentProfile } from '../types';
import { WorkAgentService } from '../services/workAgent';

interface WorkOnboardingProps {
  existingAgents: WorkAgentProfile[];
  onAgentCreated: (agent: WorkAgentProfile) => void;
  onExit: () => void;
}

type OnboardingStage = 'entry' | 'terms' | 'creating';

interface TermSection {
  number: number;
  title: string;
  description: string;
  details: string[];
  icon: React.FC<{ className?: string }>;
}

const TERM_SECTIONS: TermSection[] = [
  {
    number: 1,
    title: 'Agent Permissions',
    description: 'Your WORK agent requires your permission before performing supported actions.',
    details: [
      'Your WORK agent only performs actions after checking which permissions or browser capabilities are required.',
      'Voice command capture uses your microphone strictly when you tap the microphone button and grant browser permission.',
      'External websites and supported web applications open through explicit, verifiable browser links.',
    ],
    icon: ShieldCheck,
  },
  {
    number: 2,
    title: 'User Authorization',
    description: 'Sensitive or external actions require your explicit approval before execution.',
    details: [
      'Whenever you ask your agent to launch an external service such as ChatGPT, YouTube, or another website, it pauses at Waiting for Permission.',
      'You remain in control: approve the specific target link to execute or deny it immediately.',
      'You can adjust approval behavior anytime inside WORK Agent Settings.',
    ],
    icon: UserCheck,
  },
  {
    number: 3,
    title: 'Privacy & Security',
    description: 'Your personal data, agent history, and access credentials are handled securely.',
    details: [
      'Your Agent ID, local command history, and optional Quick Access keys stay protected and are never used to monitor other applications.',
      'Private server API credentials are kept strictly on the server side and are never exposed to the browser.',
      'You can clear your agent history or revoke access keys at any moment.',
    ],
    icon: Lock,
  },
  {
    number: 4,
    title: 'Supported Actions',
    description: 'Available actions depend on your device permissions and supported platform capabilities.',
    details: [
      'WORK supports opening web applications, navigating websites, searching live web information, and controlling NOVA AI Assistant screens.',
      'Operating-system or hardware actions outside browser permissions are never faked—your agent will transparently explain why and suggest an alternative.',
    ],
    icon: Layers,
  },
  {
    number: 5,
    title: 'Responsible Usage',
    description: 'Your agent follows platform safety rules and executes your instructions responsibly.',
    details: [
      'Your WORK agent executes tasks strictly according to your instructions while respecting platform safety guidelines.',
      'Commands are logged transparently in your Activity Timeline and Command History with accurate timestamps.',
      'By continuing, you agree to operate your numbered WORK agent responsibly.',
    ],
    icon: Scale,
  },
];

export const WorkOnboarding: React.FC<WorkOnboardingProps> = ({
  existingAgents,
  onAgentCreated,
  onExit,
}) => {
  const [stage, setStage] = useState<OnboardingStage>('entry');
  const [termIndex, setTermIndex] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsWarning, setTermsWarning] = useState(false);

  const [pendingAgent, setPendingAgent] = useState<WorkAgentProfile | null>(null);
  const [isCreationComplete, setIsCreationComplete] = useState(false);

  const nextNumericId = pendingAgent?.id || WorkAgentService.getNextNumericAgentId(existingAgents);
  const currentTerm = TERM_SECTIONS[termIndex];
  const TermIcon = currentTerm.icon;

  // Trigger animated automatic agent creation sequence
  useEffect(() => {
    if (stage !== 'creating') return;
    setIsCreationComplete(false);

    const newAgent = WorkAgentService.createAgent(existingAgents);
    setPendingAgent(newAgent);

    const timer = window.setTimeout(() => {
      setIsCreationComplete(true);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [stage]);

  const handleTermsNext = () => {
    if (termIndex < TERM_SECTIONS.length - 1) {
      setTermIndex((prev) => prev + 1);
      setTermsWarning(false);
      return;
    }

    if (!acceptedTerms) {
      setTermsWarning(true);
      return;
    }

    setTermsWarning(false);
    setStage('creating');
  };

  const handleTermsBack = () => {
    setTermsWarning(false);
    if (termIndex > 0) {
      setTermIndex((prev) => prev - 1);
    } else {
      setStage('entry');
    }
  };

  const handleEnterWorkspace = () => {
    if (!pendingAgent || !isCreationComplete) return;
    onAgentCreated(pendingAgent);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#050914] text-slate-100 overflow-y-auto">
      {/* Subtle Blue Radial Atmosphere */}
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.22),_transparent_58%)]"
        aria-hidden="true"
      />

      {/* Minimal Top Bar */}
      <header className="relative z-10 h-16 px-5 sm:px-8 flex items-center justify-between border-b border-blue-900/40 bg-[#070C1B]/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-600/30">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-white">
            WORK
          </span>
        </div>

        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl border border-blue-800/50 bg-[#0B1226] hover:bg-blue-950/70 text-xs font-medium text-blue-100 transition-colors cursor-pointer whitespace-nowrap"
        >
          <X className="w-4 h-4" />
          <span>Back to NOVA</span>
        </button>
      </header>

      {/* Main Content Viewport */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-5 sm:p-8">
        {stage === 'entry' && (
          <div className="w-full max-w-xl text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-600/25 to-indigo-700/25 border border-blue-500/40 flex items-center justify-center shadow-2xl shadow-blue-900/40">
              <Cpu className="w-12 h-12 text-blue-400" />
            </div>

            <div className="space-y-3">
              <h1 className="font-display font-bold text-4xl sm:text-5xl tracking-tight text-white">
                Welcome to WORK
              </h1>
              <p className="text-base sm:text-lg text-blue-100/75 max-w-md mx-auto leading-relaxed">
                Your personal AI agent, ready to execute your commands.
              </p>
            </div>

            <div className="pt-2 flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={() => setStage('terms')}
                className="inline-flex items-center justify-center gap-2.5 min-h-[48px] px-8 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-xl shadow-blue-600/30 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-xs text-slate-400">
                Create your unique numbered WORK agent after reviewing five brief terms.
              </p>
            </div>
          </div>
        )}

        {stage === 'terms' && (
          <div className="w-full max-w-2xl rounded-3xl bg-[#0A1022]/90 backdrop-blur-xl border border-blue-700/40 shadow-2xl overflow-hidden animate-in fade-in duration-200">
            {/* Step Progress Header */}
            <div className="px-6 py-5 border-b border-blue-900/50 bg-[#080D1C]">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="font-display font-bold text-lg sm:text-xl text-white">
                    WORK Agent Terms &amp; Conditions
                  </h2>
                  <p className="text-xs text-blue-200/70 mt-0.5">
                    Section {termIndex + 1} of {TERM_SECTIONS.length}
                  </p>
                </div>

                <span className="text-xs font-mono tabular-nums text-blue-300 font-semibold">
                  0{termIndex + 1} / 0{TERM_SECTIONS.length}
                </span>
              </div>

              {/* 5-Section Progress Bar */}
              <div className="grid grid-cols-5 gap-2">
                {TERM_SECTIONS.map((sec, idx) => (
                  <button
                    key={sec.number}
                    type="button"
                    onClick={() => {
                      setTermIndex(idx);
                      setTermsWarning(false);
                    }}
                    className={`h-1.5 rounded-full transition-colors cursor-pointer ${
                      idx <= termIndex
                        ? 'bg-blue-500'
                        : 'bg-blue-950 hover:bg-blue-900'
                    }`}
                    aria-label={`View section ${sec.number}: ${sec.title}`}
                    title={`${sec.number}. ${sec.title}`}
                  />
                ))}
              </div>
            </div>

            {/* Active Term Section Content */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/35 text-blue-400 flex items-center justify-center shrink-0">
                  <TermIcon className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-blue-400 tabular-nums">
                    {currentTerm.number}. {currentTerm.title}
                  </div>
                  <h3 className="font-display font-bold text-xl text-white">
                    {currentTerm.title}
                  </h3>
                  <p className="text-sm text-blue-100/80 leading-relaxed">
                    {currentTerm.description}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-[#070B17] border border-blue-900/45 p-5 space-y-3">
                {currentTerm.details.map((line, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span>{line}</span>
                  </div>
                ))}
              </div>

              {/* Accept Terms Checkbox (highlighted clearly on section 5, accessible cleanly) */}
              {termIndex === TERM_SECTIONS.length - 1 ? (
                <div className="space-y-2.5">
                  <label className="flex items-start gap-3 p-4 rounded-2xl bg-blue-950/35 border border-blue-600/40 hover:border-blue-500/70 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => {
                        setAcceptedTerms(e.target.checked);
                        if (e.target.checked) setTermsWarning(false);
                      }}
                      className="mt-0.5 w-4 h-4 rounded accent-blue-500 cursor-pointer shrink-0"
                    />
                    <span className="text-xs sm:text-sm font-medium text-white leading-relaxed">
                      Accept Terms &amp; Conditions — I confirm that I have reviewed all five WORK Agent principles (Agent Permissions, User Authorization, Privacy &amp; Security, Supported Actions, and Responsible Usage).
                    </span>
                  </label>

                  {termsWarning && (
                    <p className="text-xs text-rose-400 font-medium px-1">
                      Please check &ldquo;Accept Terms &amp; Conditions&rdquo; above before continuing.
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span>Review all 5 sections to activate your WORK agent.</span>
                  <button
                    type="button"
                    onClick={() => setTermIndex(TERM_SECTIONS.length - 1)}
                    className="text-blue-400 hover:text-blue-300 font-medium cursor-pointer whitespace-nowrap"
                  >
                    Jump to Acceptance
                  </button>
                </div>
              )}

              {/* Navigation Footer */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-blue-900/40">
                <button
                  type="button"
                  onClick={handleTermsBack}
                  className="inline-flex items-center gap-2 min-h-[42px] px-4 py-2 rounded-xl border border-blue-800/50 bg-[#0D152B] hover:bg-blue-950/70 text-xs font-semibold text-blue-100 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={handleTermsNext}
                  disabled={termIndex === TERM_SECTIONS.length - 1 && !acceptedTerms}
                  className="inline-flex items-center gap-2 min-h-[42px] px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-45 disabled:cursor-not-allowed text-xs font-semibold text-white shadow-lg shadow-blue-600/25 transition-all cursor-pointer whitespace-nowrap"
                >
                  <span>
                    {termIndex === TERM_SECTIONS.length - 1 ? 'Create Agent' : 'Next'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {stage === 'creating' && (
          <div className="w-full max-w-xl text-center space-y-8 animate-in fade-in duration-300">
            {/* Animated Ring Visual */}
            <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
              <div
                className={`absolute inset-0 rounded-full border-2 border-blue-500/30 ${
                  !isCreationComplete ? 'animate-ping' : ''
                }`}
              />
              <div
                className={`absolute inset-2 rounded-full border-2 border-t-blue-400 border-r-indigo-500 border-b-transparent border-l-transparent ${
                  !isCreationComplete ? 'animate-spin' : 'border-emerald-400/70'
                }`}
              />
              <div className="w-20 h-20 rounded-full bg-[#0C1530] border border-blue-500/40 flex items-center justify-center shadow-xl">
                {isCreationComplete ? (
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                ) : (
                  <Cpu className="w-9 h-9 text-blue-400" />
                )}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm sm:text-base font-medium text-blue-300">
                {isCreationComplete ? 'Your Agent Is Ready' : 'Creating Your AI Agent...'}
              </p>

              {/* Huge Numbered Agent ID */}
              <div className="font-display font-bold text-5xl sm:text-7xl md:text-8xl tracking-tight text-white tabular-nums">
                AGENT {nextNumericId}
              </div>

              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                {isCreationComplete
                  ? `Agent ${nextNumericId} is initialized and connected to the NOVA WORK control center.`
                  : 'Allocating unique numerical Agent ID, command interpreter, and activity pipeline...'}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={!isCreationComplete}
                onClick={handleEnterWorkspace}
                className="inline-flex items-center justify-center gap-2 min-h-[48px] px-8 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-xl shadow-blue-600/30 transition-all cursor-pointer whitespace-nowrap"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

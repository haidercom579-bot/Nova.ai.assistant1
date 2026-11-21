import React from 'react';
import { Code2, Compass, Lightbulb, Cpu, ArrowRight } from 'lucide-react';

interface WelcomeScreenProps {
  onSelectPrompt: (prompt: string) => void;
  onOpenWork?: () => void;
  activeWorkAgentId?: string | null;
}

const STARTER_PROMPTS = [
  {
    icon: Code2,
    title: 'Explain this Code',
    preview: '"Can you find the bug in this JavaScript snippet..."',
    prompt:
      'Can you find the bug in a JavaScript async loop using setTimeout and explain how to fix it cleanly?',
  },
  {
    icon: Compass,
    title: 'Plan a Trip',
    preview: '"Create a 5-day, budget-friendly itinerary for Kyoto..."',
    prompt:
      'Create a 5-day, budget-friendly itinerary for Kyoto with great neighborhoods, transit tips, and local food.',
  },
  {
    icon: Lightbulb,
    title: 'Brainstorm Ideas',
    preview: '"I want to start a podcast about sustainable tech..."',
    prompt:
      'I want to start a podcast about sustainable tech. Brainstorm 5 unique show concepts and first-episode topics.',
  },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onSelectPrompt,
  onOpenWork,
  activeWorkAgentId,
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 max-w-3xl mx-auto w-full text-center relative">
      {/* Glowing Cosmic Orb */}
      <div className="relative mb-6">
        <div
          className="absolute -inset-3 rounded-full bg-gradient-to-tr from-indigo-500/35 via-violet-500/35 to-sky-400/30 blur-xl pointer-events-none"
          aria-hidden="true"
        />
        <img
          src="/app-icon.jpg"
          alt="NOVA cosmic orb"
          className="relative w-16 h-16 rounded-full object-cover shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400/40"
        />
      </div>

      {/* Main Greeting */}
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-50 mb-2 font-display text-balance">
        Welcome to your cognitive co-pilot
      </h1>
      <p className="text-sm text-slate-600 dark:text-zinc-400 mb-8 max-w-md">
        I am NOVA. You can ask me to write, code, plan, or explore any idea.
      </p>

      {/* 3-Card Starter Prompts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left">
        {STARTER_PROMPTS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectPrompt(item.prompt)}
              className="group p-4 rounded-2xl bg-white/80 dark:bg-[#141624]/80 hover:bg-white dark:hover:bg-[#191C2E] border border-slate-200/80 dark:border-zinc-800/80 hover:border-indigo-400/70 dark:hover:border-violet-500/50 shadow-xs hover:shadow-md transition-all text-left flex flex-col gap-2 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-indigo-600 dark:text-zinc-300 shrink-0" />
                <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100 whitespace-nowrap">
                  {item.title}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                {item.preview}
              </p>
            </button>
          );
        })}
      </div>

      {/* Dedicated WORK AI Agent Entry Card */}
      {onOpenWork && (
        <button
          type="button"
          onClick={onOpenWork}
          className="mt-4 w-full p-4 rounded-2xl bg-gradient-to-r from-[#0A132C] via-[#101C3F] to-[#0B1531] hover:from-[#0D1838] hover:to-[#13224A] border border-blue-500/40 text-white shadow-lg shadow-blue-950/30 transition-all flex items-center justify-between gap-4 text-left cursor-pointer group"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600/25 border border-blue-400/40 text-blue-300 flex items-center justify-center shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold flex items-center gap-2">
                <span>WORK AI Agent Control Center</span>
                {activeWorkAgentId && (
                  <span className="font-mono text-[11px] text-blue-300 tabular-nums">
                    AGENT {activeWorkAgentId}
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-200/75 truncate">
                {activeWorkAgentId
                  ? 'Give natural-language or voice commands with live task activity'
                  : 'Create your numbered AI agent to open apps, search, and automate tasks'}
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 group-hover:bg-blue-500 text-white text-xs font-semibold shrink-0 whitespace-nowrap transition-colors">
            <span>{activeWorkAgentId ? 'Open WORK' : 'Launch WORK'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </button>
      )}
    </div>
  );
};


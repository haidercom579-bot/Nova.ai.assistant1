import React from 'react';
import {
  ArrowLeft,
  Check,
  Sparkles,
  Rocket,
  Crown,
  Zap,
  ShieldCheck,
  ShoppingCart,
} from 'lucide-react';
import { CartItem, PlanTier } from '../types';

interface PricingPageProps {
  currentPlan: PlanTier;
  cartItem: CartItem | null;
  onSelectFreePlan: () => void;
  onAddToCart: (plan: 'pro' | 'max') => void;
  onOpenCart: () => void;
  onBackToChat: () => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({
  currentPlan,
  cartItem,
  onSelectFreePlan,
  onAddToCart,
  onOpenCart,
  onBackToChat,
}) => {
  const startupFeatures = [
    'Free forever — no credit card required',
    'Unlimited chat with Gemini 4 Hydrogen & Flash-Lite',
    'Voice Mode & live speech transcription',
    'File, code, and image upload analysis',
    'Auto-Summarize pinned conversation notes',
    'Export conversations to Markdown & Plain Text',
  ];

  const proFeatures = [
    'Everything in Startup, included',
    'Priority Deep Reasoning (XHIGH) depth',
    'Real-time Google Search grounding priority',
    'Extended multi-file & large document synthesis',
    'Early access to upcoming NOVA capabilities',
    'Dedicated workspace configuration & controls',
  ];

  const maxFeatures = [
    'Everything in Pro, included',
    'Maximum workspace compute & highest throughput',
    'Multi-seat collaboration & shared prompt library',
    'Long-context research & deep project memory',
    'Priority voice & multimedia processing',
    'VIP priority support & custom model tuning',
  ];

  const activePlanLabel =
    currentPlan === 'max'
      ? 'Max (Free)'
      : currentPlan === 'pro'
      ? 'Pro (Free)'
      : 'Startup (Free)';

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackToChat}
            className="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Chat</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
              Active plan:{' '}
              <strong className="text-slate-900 dark:text-zinc-100">{activePlanLabel}</strong>
            </span>

            {cartItem && (
              <button
                type="button"
                onClick={onOpenCart}
                className="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer whitespace-nowrap"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>
                  Cart ({cartItem.quantity}) · Free ($0)
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Hero Heading */}
        <div className="text-center max-w-xl mx-auto space-y-2.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-violet-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>NOVA Plans — 100% Free</span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight text-slate-900 dark:text-white">
            Every plan is now completely free
          </h1>
          <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
            Startup, Pro, and Max are all unlocked at $0. Switch directly to Startup or add Pro or Max to your cart for instant free activation.
          </p>
        </div>

        {/* Three-Column Pricing Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
          {/* 1. STARTUP TIER — FREE */}
          <div
            className={`rounded-3xl p-6 flex flex-col justify-between border transition-all ${
              currentPlan === 'startup'
                ? 'bg-white dark:bg-[#131522] border-indigo-500/70 dark:border-indigo-400/60 shadow-lg shadow-indigo-500/10'
                : 'bg-white dark:bg-[#131522] border-slate-200/90 dark:border-zinc-800/90 shadow-sm'
            }`}
          >
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-zinc-800/90 text-slate-700 dark:text-zinc-200 flex items-center justify-center shrink-0">
                    <Rocket className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-lg text-slate-900 dark:text-zinc-50">
                      Startup
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      Everyday personal &amp; study use
                    </p>
                  </div>
                </div>

                {currentPlan === 'startup' && (
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-700/50 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 whitespace-nowrap">
                    Active
                  </span>
                )}
              </div>

              <div className="pt-1 pb-2 border-b border-slate-100 dark:border-zinc-800/80">
                <div className="flex items-baseline gap-2">
                  <span className="font-display font-bold text-4xl tracking-tight text-slate-900 dark:text-white tabular-nums">
                    Free
                  </span>
                  <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 tabular-nums">
                    $0 forever
                  </span>
                </div>
              </div>

              <ul className="space-y-2.5">
                {startupFeatures.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-zinc-300"
                  >
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-6">
              <button
                type="button"
                disabled={currentPlan === 'startup'}
                onClick={onSelectFreePlan}
                className={`w-full min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  currentPlan === 'startup'
                    ? 'bg-slate-100 dark:bg-zinc-800/80 text-slate-500 dark:text-zinc-400 cursor-default'
                    : 'border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-900 dark:text-zinc-100'
                }`}
              >
                {currentPlan === 'startup' ? 'Current Plan (Free)' : 'Switch to Startup (Free)'}
              </button>
            </div>
          </div>

          {/* 2. PRO TIER — FREE ($0) */}
          <div
            className={`rounded-3xl p-6 flex flex-col justify-between border relative overflow-hidden transition-all ${
              currentPlan === 'pro'
                ? 'bg-white dark:bg-[#151629] border-violet-500 shadow-xl shadow-violet-600/15'
                : 'bg-white dark:bg-[#141627] border-violet-400/60 dark:border-violet-500/40 shadow-lg shadow-violet-600/10'
            }`}
          >
            <div
              className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-blue-500"
              aria-hidden="true"
            />

            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-violet-600/25">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-lg text-slate-900 dark:text-zinc-50">
                      Pro
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      Full power for demanding work
                    </p>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap ${
                    currentPlan === 'pro'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-300'
                      : 'bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-700/50 text-violet-700 dark:text-violet-300'
                  }`}
                >
                  {currentPlan === 'pro' ? 'Active' : 'Free Plan'}
                </span>
              </div>

              <div className="pt-1 pb-2 border-b border-slate-100 dark:border-zinc-800/80">
                <div className="flex items-baseline gap-2">
                  <span className="font-display font-bold text-4xl tracking-tight text-slate-900 dark:text-white tabular-nums">
                    Free
                  </span>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                    $0 / month
                  </span>
                </div>
              </div>

              <ul className="space-y-2.5">
                {proFeatures.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-zinc-200"
                  >
                    <Check className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-6">
              <button
                type="button"
                onClick={() => onAddToCart('pro')}
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/25 transition-all cursor-pointer whitespace-nowrap"
              >
                <ShoppingCart className="w-4 h-4 shrink-0" />
                <span>
                  {currentPlan === 'pro'
                    ? 'Manage Pro Seats — Free ($0)'
                    : 'Choose Pro (Free) · Add to Cart'}
                </span>
              </button>
            </div>
          </div>

          {/* 3. MAX TIER — FREE ($0) */}
          <div
            className={`rounded-3xl p-6 flex flex-col justify-between border relative overflow-hidden transition-all ${
              currentPlan === 'max'
                ? 'bg-white dark:bg-[#17152B] border-amber-400/80 shadow-xl shadow-amber-500/15'
                : 'bg-white dark:bg-[#141326] border-amber-400/50 dark:border-amber-500/40 shadow-lg shadow-amber-500/10'
            }`}
          >
            <div
              className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500"
              aria-hidden="true"
            />

            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-600/25">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-lg text-slate-900 dark:text-zinc-50">
                      Max
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      Maximum scale &amp; team capacity
                    </p>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap ${
                    currentPlan === 'max'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-700/50 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {currentPlan === 'max' ? 'Active' : 'All Unlocked'}
                </span>
              </div>

              <div className="pt-1 pb-2 border-b border-slate-100 dark:border-zinc-800/80">
                <div className="flex items-baseline gap-2">
                  <span className="font-display font-bold text-4xl tracking-tight text-slate-900 dark:text-white tabular-nums">
                    Free
                  </span>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                    $0 / month
                  </span>
                </div>
              </div>

              <ul className="space-y-2.5">
                {maxFeatures.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-zinc-200"
                  >
                    <Check className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-6">
              <button
                type="button"
                onClick={() => onAddToCart('max')}
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:via-orange-400 hover:to-rose-400 text-white text-xs font-semibold shadow-md shadow-orange-600/20 transition-all cursor-pointer whitespace-nowrap"
              >
                <ShoppingCart className="w-4 h-4 shrink-0" />
                <span>
                  {currentPlan === 'max'
                    ? 'Manage Max Seats — Free ($0)'
                    : 'Choose Max (Free) · Add to Cart'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-zinc-400 pb-4">
          <ShieldCheck className="w-4 h-4 text-indigo-500 dark:text-violet-400 shrink-0" />
          <span>All plans (Startup, Pro, and Max) are 100% free. Selecting Pro or Max opens your cart for free activation.</span>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  ArrowLeft,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Crown,
  Zap,
  CheckCircle2,
  ShieldCheck,
  User,
  Phone,
  Mail,
} from 'lucide-react';
import { CartItem, PlanTier } from '../types';
import { UserProfile } from '../services/auth';

interface CartPageProps {
  cartItem: CartItem | null;
  currentUser: UserProfile | null;
  onUpdateQuantity: (quantity: number) => void;
  onSwitchPlan: (plan: 'pro' | 'max') => void;
  onRemoveItem: () => void;
  onConfirmOrder: (plan: 'pro' | 'max') => void;
  onBackToPricing: () => void;
  onBackToChat: () => void;
}

export const CartPage: React.FC<CartPageProps> = ({
  cartItem,
  currentUser,
  onUpdateQuantity,
  onSwitchPlan,
  onRemoveItem,
  onConfirmOrder,
  onBackToPricing,
  onBackToChat,
}) => {
  const [completedOrder, setCompletedOrder] = useState<{
    plan: PlanTier;
    name: string;
    total: number;
    quantity: number;
    orderId: string;
  } | null>(null);

  const handleCheckout = () => {
    if (!cartItem) return;
    const total = cartItem.unitPrice * cartItem.quantity;
    setCompletedOrder({
      plan: cartItem.plan,
      name: cartItem.name,
      total,
      quantity: cartItem.quantity,
      orderId: `NOVA-${Math.floor(100000 + Math.random() * 900000)}`,
    });
    onConfirmOrder(cartItem.plan);
  };

  // --- ORDER CONFIRMED STATE ---
  if (completedOrder) {
    return (
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
        <div className="max-w-xl mx-auto rounded-3xl bg-white dark:bg-[#131522] border border-emerald-300/70 dark:border-emerald-700/50 shadow-xl p-6 sm:p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Plan Activated · {completedOrder.orderId}
            </div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white">
              Welcome to {completedOrder.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400">
              Your NOVA workspace is now upgraded to{' '}
              <strong className="text-slate-900 dark:text-zinc-100">
                {completedOrder.name}
              </strong>
              .
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 dark:bg-zinc-900/70 border border-slate-200/80 dark:border-zinc-800 p-4 text-left space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-zinc-400">Selected Plan</span>
              <span className="font-semibold text-slate-900 dark:text-zinc-100">
                {completedOrder.name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-zinc-400">Seats / Quantity</span>
              <span className="font-semibold text-slate-900 dark:text-zinc-100 tabular-nums">
                {completedOrder.quantity}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-zinc-800">
              <span className="font-semibold text-slate-700 dark:text-zinc-200">Monthly Total</span>
              <span className="font-display font-bold text-base text-emerald-600 dark:text-emerald-400 tabular-nums">
                Free ($0 / mo)
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onBackToChat}
              className="w-full sm:flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/20 cursor-pointer whitespace-nowrap"
            >
              Start Using {completedOrder.name}
            </button>
            <button
              type="button"
              onClick={() => {
                setCompletedOrder(null);
                onBackToPricing();
              }}
              className="w-full sm:w-auto min-h-[44px] py-2.5 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer whitespace-nowrap"
            >
              Back to Pricing
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- EMPTY CART STATE ---
  if (!cartItem) {
    return (
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
        <div className="max-w-lg mx-auto rounded-3xl bg-white dark:bg-[#131522] border border-slate-200/80 dark:border-zinc-800/90 shadow-lg p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 flex items-center justify-center mx-auto">
            <ShoppingCart className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="font-display font-bold text-xl text-slate-900 dark:text-white">
              Your cart is empty
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
              Choose Pro (Free) or Max (Free) from the Pricing page to add it to your cart at $0.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onBackToPricing}
              className="w-full sm:w-auto min-h-[42px] px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              Browse Pricing Plans
            </button>
            <button
              type="button"
              onClick={onBackToChat}
              className="w-full sm:w-auto min-h-[42px] px-5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer whitespace-nowrap"
            >
              Back to Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  const subtotal = cartItem.unitPrice * cartItem.quantity;

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Back Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackToPricing}
            className="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Pricing</span>
          </button>

          <button
            type="button"
            onClick={onBackToChat}
            className="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>Return to Chat</span>
          </button>
        </div>

        {/* Page Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-violet-950/60 border border-indigo-200/80 dark:border-violet-700/50 text-indigo-600 dark:text-violet-300 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white">
              Your Plan Cart
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
              Review your selected NOVA plan and seats before confirming.
            </p>
          </div>
        </div>

        {/* Cart Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left 2 Columns: Cart Item + Plan Switcher */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-3xl bg-white dark:bg-[#131522] border border-slate-200/80 dark:border-zinc-800/90 shadow-sm p-5 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-2xl text-white flex items-center justify-center shrink-0 shadow-md ${
                      cartItem.plan === 'max'
                        ? 'bg-gradient-to-tr from-amber-500 to-orange-600 shadow-orange-600/20'
                        : 'bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-violet-600/20'
                    }`}
                  >
                    {cartItem.plan === 'max' ? (
                      <Zap className="w-6 h-6" />
                    ) : (
                      <Crown className="w-6 h-6" />
                    )}
                  </div>

                  <div>
                    <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                      {cartItem.name} Plan
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                      {cartItem.plan === 'max'
                        ? 'Maximum compute, multi-seat collaboration & VIP priority'
                        : 'Priority deep reasoning, search grounding & extended synthesis'}
                    </p>
                    <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1.5 tabular-nums">
                      $0 / month · 100% Free
                    </div>
                  </div>
                </div>

                {/* Quantity Controls + Remove */}
                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900">
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(Math.max(1, cartItem.quantity - 1))}
                      disabled={cartItem.quantity <= 1}
                      className="w-9 h-9 flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 cursor-pointer"
                      aria-label="Decrease seats"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 text-xs font-semibold text-slate-900 dark:text-zinc-100 tabular-nums">
                      {cartItem.quantity} {cartItem.quantity === 1 ? 'seat' : 'seats'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(Math.min(25, cartItem.quantity + 1))}
                      className="w-9 h-9 flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                      aria-label="Increase seats"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={onRemoveItem}
                    className="p-2.5 rounded-xl border border-rose-200/80 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    title="Remove plan from cart"
                    aria-label="Remove plan from cart"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick Toggle Between Pro (Free) and Max (Free) */}
              <div className="pt-4 border-t border-slate-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-slate-500 dark:text-zinc-400">
                  Switch tier in cart:
                </span>
                <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 gap-1">
                  <button
                    type="button"
                    onClick={() => onSwitchPlan('pro')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      cartItem.plan === 'pro'
                        ? 'bg-white dark:bg-violet-600 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    Pro · Free ($0)
                  </button>
                  <button
                    type="button"
                    onClick={() => onSwitchPlan('max')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      cartItem.plan === 'max'
                        ? 'bg-white dark:bg-amber-500 text-slate-900 dark:text-slate-950 shadow-xs'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    Max · Free ($0)
                  </button>
                </div>
              </div>
            </div>

            {/* Account Summary attached to Cart */}
            {currentUser && (
              <div className="rounded-3xl bg-white dark:bg-[#131522] border border-slate-200/80 dark:border-zinc-800/90 p-5 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Account Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-zinc-200 min-w-0">
                    <User className="w-4 h-4 text-indigo-500 dark:text-violet-400 shrink-0" />
                    <span className="truncate font-medium">{currentUser.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-300 min-w-0">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{currentUser.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-300 min-w-0">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate font-mono">
                      {currentUser.phoneNumber
                        ? `${currentUser.phoneCountryCode || ''} ${currentUser.phoneNumber}`.trim()
                        : 'Not set'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Order Summary */}
          <div className="rounded-3xl bg-white dark:bg-[#131522] border border-slate-200/80 dark:border-zinc-800/90 shadow-lg p-6 space-y-5">
            <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">
              Order Summary
            </h2>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-zinc-400">
                  {cartItem.name} (${cartItem.unitPrice} × {cartItem.quantity})
                </span>
                <span className="font-semibold text-slate-900 dark:text-zinc-100 tabular-nums">
                  ${subtotal}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-zinc-400">Billing cycle</span>
                <span className="font-medium text-slate-700 dark:text-zinc-300">Monthly</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-zinc-800">
                <span className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                  Total
                </span>
                <span className="font-display font-bold text-2xl text-emerald-600 dark:text-emerald-400 tabular-nums">
                  Free
                  <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 ml-1">
                    (${subtotal}/mo)
                  </span>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              className={`w-full min-h-[46px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white text-xs font-semibold shadow-md transition-all cursor-pointer whitespace-nowrap ${
                cartItem.plan === 'max'
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:via-orange-400 hover:to-rose-400 shadow-orange-600/20'
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-violet-600/20'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Activate {cartItem.name} for Free</span>
            </button>

            <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                All NOVA plans (Startup, Pro, and Max) are 100% free — switch anytime from Pricing.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

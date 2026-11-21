import React, { useEffect, useState } from 'react';
import { X, Moon, Sun, Monitor, Trash2, Info, AlertTriangle, Check, QrCode, Phone, LogOut, User } from 'lucide-react';
import { ThemeMode, GeminiModel } from '../types';
import { UserProfile } from '../services/auth';

const COUNTRY_CODES = [
  { code: '+1', label: '+1 (US/CA)' },
  { code: '+92', label: '+92 (PK)' },
  { code: '+91', label: '+91 (IN)' },
  { code: '+44', label: '+44 (UK)' },
  { code: '+971', label: '+971 (UAE)' },
  { code: '+966', label: '+966 (SA)' },
  { code: '+61', label: '+61 (AU)' },
  { code: '+49', label: '+49 (DE)' },
  { code: '+81', label: '+81 (JP)' },
  { code: '+65', label: '+65 (SG)' },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onClearHistory: () => void;
  onOpenQRCode: () => void;
  currentModel?: GeminiModel;
  onModelChange?: (model: GeminiModel) => void;
  currentUser?: UserProfile | null;
  onUpdatePhone?: (countryCode: string, phoneNumber: string) => void;
  onLogout?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onThemeChange,
  onClearHistory,
  onOpenQRCode,
  currentModel = 'gemini-4-hydrogen',
  onModelChange,
  currentUser,
  onUpdatePhone,
  onLogout,
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearedSuccess, setClearedSuccess] = useState(false);
  const [phoneCode, setPhoneCode] = useState(currentUser?.phoneCountryCode || '+92');
  const [phoneValue, setPhoneValue] = useState(currentUser?.phoneNumber || '');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneSaved, setPhoneSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPhoneCode(currentUser?.phoneCountryCode || '+92');
      setPhoneValue(currentUser?.phoneNumber || '');
      setPhoneError(null);
      setPhoneSaved(false);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSavePhone = (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);
    const digitsOnly = phoneValue.replace(/\D/g, '');
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      setPhoneError('Enter a valid mobile number (7 to 15 digits).');
      return;
    }
    onUpdatePhone?.(phoneCode, phoneValue.trim());
    setPhoneSaved(true);
    setTimeout(() => setPhoneSaved(false), 2000);
  };

  const handleConfirmClear = () => {
    onClearHistory();
    setShowClearConfirm(false);
    setClearedSuccess(true);
    setTimeout(() => {
      setClearedSuccess(false);
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xl overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800/80">
          <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-50 font-display">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[72vh] overflow-y-auto">
          {/* Account & Profile Section */}
          {currentUser && (
            <div className="pb-5 border-b border-slate-100 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                  <User className="w-3.5 h-3.5" />
                  <span>Account & Phone</span>
                </label>
                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onLogout();
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/70 dark:border-zinc-800 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
                  {currentUser.name.trim().charAt(0).toUpperCase() || 'N'}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate">
                    {currentUser.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                    {currentUser.email}
                  </div>
                </div>
              </div>

              {onUpdatePhone && (
                <form onSubmit={handleSavePhone} className="space-y-2">
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400">
                    Mobile Number
                  </label>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={phoneCode}
                      onChange={(e) => setPhoneCode(e.target.value)}
                      aria-label="Country code"
                      className="min-h-[38px] px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <div className="relative flex-1 min-w-0">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        inputMode="tel"
                        value={phoneValue}
                        onChange={(e) => setPhoneValue(e.target.value)}
                        placeholder="300 1234567"
                        className="w-full min-h-[38px] pl-8 pr-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-mono text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="min-h-[38px] px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {phoneSaved ? 'Saved' : 'Save'}
                    </button>
                  </div>
                  {phoneError && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400">{phoneError}</p>
                  )}
                </form>
              )}
            </div>
          )}

          {/* Theme Section */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2.5">
              Appearance & Theme
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onThemeChange('light')}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all ${
                  currentTheme === 'light'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/50'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>Light</span>
              </button>

              <button
                type="button"
                onClick={() => onThemeChange('dark')}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all ${
                  currentTheme === 'dark'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/50'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>Dark</span>
              </button>

              <button
                type="button"
                onClick={() => onThemeChange('system')}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all ${
                  currentTheme === 'system'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/50'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>System</span>
              </button>
            </div>
          </div>

          {/* About NOVA Section */}
          <div className="pt-4 border-t border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2.5">
              <Info className="w-3.5 h-3.5" />
              <span>About NOVA</span>
            </div>
            <div className="rounded-xl p-3.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/70 dark:border-zinc-800 text-xs text-slate-600 dark:text-zinc-300 space-y-1.5 leading-relaxed">
              <div className="flex items-center gap-2.5">
                <img
                  src="/app-icon.jpg"
                  alt="NOVA app icon"
                  className="w-8 h-8 rounded-lg object-cover ring-1 ring-blue-500/30 shrink-0"
                />
                <p className="font-semibold text-slate-900 dark:text-zinc-100">
                  NOVA — Personal AI Assistant (v1.0.0)
                </p>
              </div>
              <p>
                Powered by Google Gemini for fast, thoughtful, and accurate assistance.
              </p>
              <p className="text-slate-600 dark:text-zinc-300">
                Designed to answer questions, brainstorm, study concepts, and craft writing.
              </p>
            </div>
          </div>

          {/* Model Selection Section */}
          <div className="pt-4 border-t border-slate-100 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-2.5">
              <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                Gemini AI Engine
              </label>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 uppercase">
                Highest Version
              </span>
            </div>
            <div className="space-y-1.5">
              {[
                { id: 'gemini-4-hydrogen' as GeminiModel, name: 'Gemini 4 Hydrogen', tag: 'Highest Version', desc: 'Highest reasoning, intelligence & Google Search grounding' },
                { id: 'gemini-3.1-flash-lite' as GeminiModel, name: 'Gemini 3.1 Flash-Lite', tag: 'Fast', desc: 'Ultra-low latency for instant responses' },
              ].map((m) => {
                const isSelected = currentModel === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onModelChange?.(m.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-slate-900 dark:text-zinc-100 shadow-2xs'
                        : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100">{m.name}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                          {m.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">{m.desc}</p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile QR Code Section */}
          <div className="pt-4 border-t border-slate-100 dark:border-zinc-800">
            <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2.5">
              Mobile Access
            </label>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenQRCode();
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100/50 dark:hover:bg-indigo-950/40 text-xs font-medium text-indigo-900 dark:text-indigo-200 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <QrCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Show App QR Code</span>
              </div>
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                Scan with phone →
              </span>
            </button>
          </div>

          {/* Data & History Section */}
          <div className="pt-4 border-t border-slate-100 dark:border-zinc-800">
            <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2.5">
              Conversation History
            </label>

            {clearedSuccess ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>All chat history has been cleared.</span>
              </div>
            ) : showClearConfirm ? (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">
                    Are you sure? This will delete all saved conversations on this device.
                  </p>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-zinc-300 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmClear}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors"
                  >
                    Yes, Clear All
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-2 w-full px-3.5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear All Chat History</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-zinc-950/60 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-slate-800 dark:hover:bg-zinc-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import {
  Check,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Phone,
  AlertCircle,
  Loader2,
  CheckCheck,
} from 'lucide-react';
import { AuthService, UserProfile } from '../services/auth';

export type OnboardingStep = 'splash' | 'terms' | 'auth' | 'phone' | 'ready';

interface OnboardingFlowProps {
  step: OnboardingStep;
  currentUser: UserProfile | null;
  onSplashComplete: () => void;
  onTermsAccepted: () => void;
  onAuthSuccess: (user: UserProfile) => void;
  onPhoneComplete: (user: UserProfile) => void;
  onSkipPhone: () => void;
  onBackToAuth: () => void;
}

const TERMS_ITEMS = [
  {
    id: 1,
    title: 'Responsible & Ethical Use',
    description:
      'I agree to use NOVA respectfully and lawfully, without generating harmful, abusive, or deceptive content.',
  },
  {
    id: 2,
    title: 'AI Accuracy & Verification',
    description:
      'I understand responses are AI-generated and I will independently verify critical medical, legal, or financial decisions.',
  },
  {
    id: 3,
    title: 'Privacy & Device Storage',
    description:
      'I consent to storing my profile, preferences, and chat history securely on this device for seamless sessions.',
  },
  {
    id: 4,
    title: 'Microphone & File Access',
    description:
      'I understand voice capture and attached files are processed only when I actively initiate a voice or upload action.',
  },
  {
    id: 5,
    title: 'Continuous Service Improvements',
    description:
      'I acknowledge that NOVA features and Gemini AI models may evolve over time to improve quality and safety.',
  },
];

const COUNTRY_CODES = [
  { code: '+1', label: 'US / CA (+1)' },
  { code: '+92', label: 'Pakistan (+92)' },
  { code: '+91', label: 'India (+91)' },
  { code: '+44', label: 'UK (+44)' },
  { code: '+971', label: 'UAE (+971)' },
  { code: '+966', label: 'Saudi Arabia (+966)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+49', label: 'Germany (+49)' },
  { code: '+81', label: 'Japan (+81)' },
  { code: '+65', label: 'Singapore (+65)' },
];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  step,
  currentUser,
  onSplashComplete,
  onTermsAccepted,
  onAuthSuccess,
  onPhoneComplete,
  onSkipPhone,
  onBackToAuth,
}) => {
  // Splash progress state
  const [splashProgress, setSplashProgress] = useState(12);

  // Terms state (5 checkboxes)
  const [checkedTerms, setCheckedTerms] = useState<boolean[]>([false, false, false, false, false]);

  // Auth state
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // Phone state
  const [countryCode, setCountryCode] = useState('+92');
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Splash animation timer
  useEffect(() => {
    if (step !== 'splash') return;
    setSplashProgress(18);
    const t1 = setTimeout(() => setSplashProgress(65), 250);
    const t2 = setTimeout(() => setSplashProgress(100), 950);
    const t3 = setTimeout(() => onSplashComplete(), 1550);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [step, onSplashComplete]);

  if (step === 'ready') return null;

  const acceptedCount = checkedTerms.filter(Boolean).length;
  const allTermsChecked = acceptedCount === TERMS_ITEMS.length;

  const toggleTerm = (index: number) => {
    setCheckedTerms((prev) => prev.map((v, idx) => (idx === index ? !v : v)));
  };

  const toggleAllTerms = () => {
    const target = !allTermsChecked;
    setCheckedTerms(TERMS_ITEMS.map(() => target));
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (authMode === 'signup' && password !== confirmPassword) {
      setAuthError('Passwords do not match. Please check and try again.');
      return;
    }

    setIsSubmittingAuth(true);
    try {
      const result =
        authMode === 'signup'
          ? await AuthService.signUp({ name, email, password })
          : await AuthService.logIn({ email, password });

      if (!result.success || !result.user) {
        setAuthError(result.error || 'Authentication failed. Please try again.');
        return;
      }

      onAuthSuccess(result.user);
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);

    const digitsOnly = phoneInput.replace(/\D/g, '');
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      setPhoneError('Please enter a valid mobile number (7 to 15 digits).');
      return;
    }

    const updated = AuthService.updatePhoneNumber(countryCode, phoneInput.trim());
    if (updated) {
      onPhoneComplete(updated);
    } else {
      setPhoneError('Session expired. Please log in again.');
    }
  };

  // --- STEP 1: SPLASH SCREEN ---
  if (step === 'splash') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#080910] text-white px-6 select-none overflow-hidden">
        {/* Ambient Radial Nebula Glow */}
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(79,70,229,0.24)_0%,_rgba(124,58,237,0.08)_38%,_transparent_70%)] pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full animate-in fade-in zoom-in-95 duration-500">
          {/* App Logo / Icon with cosmic halo */}
          <div className="relative mb-6">
            <div
              className="absolute -inset-4 rounded-full bg-gradient-to-tr from-blue-500/40 via-indigo-500/35 to-violet-500/35 blur-2xl"
              aria-hidden="true"
            />
            <img
              src="/app-icon.jpg"
              alt="NOVA App Logo"
              className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover shadow-2xl shadow-blue-600/35 ring-2 ring-blue-400/40"
            />
          </div>

          <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight bg-gradient-to-r from-white via-indigo-100 to-violet-300 bg-clip-text text-transparent mb-2">
            NOVA
          </h1>
          <p className="text-sm text-slate-400 mb-8">
            Your personal cognitive co-pilot
          </p>

          {/* Smooth Startup Progress Bar */}
          <div className="w-48 h-1.5 rounded-full bg-slate-800/90 overflow-hidden mb-5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 transition-all duration-700 ease-out"
              style={{ width: `${splashProgress}%` }}
            />
          </div>

          <button
            type="button"
            onClick={onSplashComplete}
            className="text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors cursor-pointer py-1 px-3"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // --- SHARED ONBOARDING SHELL (AUTH -> TERMS -> PHONE) ---
  const stepIndex = step === 'auth' ? 1 : step === 'terms' ? 2 : 3;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0B0C14] text-slate-900 dark:text-zinc-100 px-4 py-8 relative overflow-y-auto dark:bg-[radial-gradient(ellipse_at_top,_rgba(79,70,229,0.18),_transparent_60%)]">
      <div className="w-full max-w-lg">
        {/* Top Brand + Step Indicator */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3">
            <div
              className="absolute -inset-2 rounded-full bg-indigo-500/25 blur-lg pointer-events-none"
              aria-hidden="true"
            />
            <img
              src="/app-icon.jpg"
              alt="NOVA"
              className="relative w-12 h-12 rounded-2xl object-cover ring-1 ring-blue-400/40 shadow-md"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 font-medium">
            <span>Step {stepIndex} of 3</span>
            <span aria-hidden="true">·</span>
            <span>
              {step === 'auth'
                ? authMode === 'signup'
                  ? 'Create Account'
                  : 'Welcome Back'
                : step === 'terms'
                ? 'Terms & Conditions'
                : 'Add Phone Number'}
            </span>
          </div>

          {/* 3-Segment Progress Bar */}
          <div className="grid grid-cols-3 gap-1.5 w-40 mt-2.5">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`h-1 rounded-full transition-colors ${
                  idx <= stepIndex
                    ? 'bg-gradient-to-r from-indigo-500 to-violet-500'
                    : 'bg-slate-200 dark:bg-zinc-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Main Onboarding Card */}
        <div className="rounded-3xl bg-white dark:bg-[#131522] border border-slate-200/80 dark:border-zinc-800/90 shadow-xl p-6 sm:p-7">
          {/* STEP 2: 5 TERMS & CONDITIONS */}
          {step === 'terms' && (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display font-bold text-xl text-slate-900 dark:text-zinc-50 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-500 dark:text-violet-400 shrink-0" />
                    <span>Terms & Conditions</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    Please tick all 5 terms below to continue.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={toggleAllTerms}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-zinc-800/80 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 whitespace-nowrap transition-colors cursor-pointer shrink-0"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-indigo-500 dark:text-violet-400" />
                  <span>{allTermsChecked ? 'Uncheck All' : 'Tick All 5'}</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {TERMS_ITEMS.map((term, idx) => {
                  const isChecked = checkedTerms[idx];
                  return (
                    <button
                      key={term.id}
                      type="button"
                      onClick={() => toggleTerm(idx)}
                      role="checkbox"
                      aria-checked={isChecked}
                      className={`w-full flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer min-h-[44px] ${
                        isChecked
                          ? 'border-indigo-500/70 dark:border-violet-500/60 bg-indigo-50/60 dark:bg-violet-950/30'
                          : 'border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/50 hover:border-slate-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <span
                        className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-indigo-600 dark:bg-violet-600 border-indigo-600 dark:border-violet-600 text-white'
                            : 'border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-950'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 dark:text-zinc-100">
                          {term.id}. {term.title}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
                          {term.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-1 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 tabular-nums">
                  {acceptedCount} / {TERMS_ITEMS.length} ticked
                </span>

                <button
                  type="button"
                  disabled={!allTermsChecked}
                  onClick={() => {
                    AuthService.setAcceptedTerms(true);
                    onTermsAccepted();
                  }}
                  className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-slate-300 disabled:to-slate-300 dark:disabled:from-zinc-800 dark:disabled:to-zinc-800 disabled:text-slate-500 dark:disabled:text-zinc-500 text-white text-xs font-semibold shadow-md shadow-violet-600/20 disabled:shadow-none transition-all cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                >
                  <span>Go Next</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SIGN UP / LOG IN */}
          {step === 'auth' && (
            <div className="space-y-5">
              {/* Segmented Sign Up / Log In Switcher */}
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setAuthError(null);
                  }}
                  className={`min-h-[40px] rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    authMode === 'signup'
                      ? 'bg-white dark:bg-violet-600 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                  }`}
                >
                  Sign Up
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError(null);
                  }}
                  className={`min-h-[40px] rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    authMode === 'login'
                      ? 'bg-white dark:bg-violet-600 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                  }`}
                >
                  Log In
                </button>
              </div>

              <div>
                <h2 className="font-display font-bold text-xl text-slate-900 dark:text-zinc-50">
                  {authMode === 'signup' ? 'Create your NOVA account' : 'Sign in to NOVA'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  {authMode === 'signup'
                    ? 'Get started with personalized conversations and voice mode.'
                    : 'Enter your email and password to continue.'}
                </p>
              </div>

              {authError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex Morgan"
                        className="w-full min-h-[44px] pl-10 pr-3.5 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 dark:focus:border-violet-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full min-h-[44px] pl-10 pr-3.5 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 dark:focus:border-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full min-h-[44px] pl-10 pr-10 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 dark:focus:border-violet-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {authMode === 'signup' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full min-h-[44px] pl-10 pr-3.5 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 dark:focus:border-violet-500"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingAuth}
                  className="w-full min-h-[46px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-md shadow-violet-600/20 transition-all cursor-pointer disabled:opacity-60 mt-2"
                >
                  {isSubmittingAuth ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>{authMode === 'signup' ? 'Sign Up & Next' : 'Log In'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* STEP 4: ADD YOUR PHONE NUMBER */}
          {step === 'phone' && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display font-bold text-xl text-slate-900 dark:text-zinc-50 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-indigo-500 dark:text-violet-400 shrink-0" />
                  <span>Add your phone number</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  {currentUser?.name
                    ? `Welcome, ${currentUser.name}! Add your mobile number to complete your NOVA profile.`
                    : 'Add your mobile number to complete your NOVA profile setup.'}
                </p>
              </div>

              {phoneError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{phoneError}</span>
                </div>
              )}

              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                    Mobile Number
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      aria-label="Country code"
                      className="min-h-[44px] px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 dark:focus:border-violet-500"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>

                    <input
                      type="tel"
                      inputMode="tel"
                      required
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="300 1234567"
                      className="flex-1 min-w-0 min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 dark:focus:border-violet-500 font-mono tabular-nums"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full min-h-[46px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-md shadow-violet-600/20 transition-all cursor-pointer"
                >
                  <span>Save Number & Enter NOVA</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={onBackToAuth}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors cursor-pointer py-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Switch account</span>
                </button>

                <button
                  type="button"
                  onClick={onSkipPhone}
                  className="text-xs font-medium text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-violet-400 transition-colors cursor-pointer py-1"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

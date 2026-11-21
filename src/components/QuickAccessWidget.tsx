import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Mic,
  MicOff,
  ExternalLink,
  KeyRound,
  Power,
  Loader2,
  ArrowRight,
  AlertTriangle,
  Minimize2,
} from 'lucide-react';
import { AgentAction, AgentKeyConfig, WorkAgentMessage } from '../types';
import { voiceService } from '../services/voice';
import { transcribeAudio } from '../services/api';

interface QuickAccessWidgetProps {
  config: AgentKeyConfig | null;
  messages: WorkAgentMessage[];
  isSending: boolean;
  onSendCommand: (command: string, source: 'dashboard' | 'quick_access') => Promise<void>;
  onDisableQuickAccess: () => void;
  onNavigateView: (targetView: NonNullable<AgentAction['targetView']>) => void;
  onOpenEnables: () => void;
}

const QUICK_CHIPS = [
  'Open ChatGPT',
  'Open YouTube',
  'Open Google',
  'Search AI news',
];

export const QuickAccessWidget: React.FC<QuickAccessWidgetProps> = ({
  config,
  messages,
  isSending,
  onSendCommand,
  onDisableQuickAccess,
  onNavigateView,
  onOpenEnables,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [listenMode, setListenMode] = useState<'none' | 'speech' | 'recorder'>('none');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isSending]);

  useEffect(() => {
    return () => {
      voiceService.stopListening();
      voiceService.cancelRecording();
    };
  }, []);

  if (!config || !config.quickAccessEnabled || !config.floatingIconEnabled) {
    return null;
  }

  const isKeyActive = config.status === 'active';

  const handleSubmit = async (e?: React.FormEvent, overrideText?: string) => {
    e?.preventDefault();
    const cmd = (overrideText ?? input).trim();
    if (!cmd || isSending) return;
    if (!overrideText) setInput('');
    await onSendCommand(cmd, 'quick_access');
  };

  const mapMicError = (errCode: string): string => {
    const code = errCode.toLowerCase();
    if (code.includes('insecure-context')) {
      return 'Microphone access requires HTTPS or localhost.';
    }
    if (code.includes('not-allowed') || code.includes('permission') || code.includes('denied')) {
      return 'Microphone access was denied. Enable mic permission in Enables or your browser.';
    }
    if (code.includes('not-supported')) {
      return 'Voice capture is not supported in this browser.';
    }
    if (code.includes('audio-capture')) {
      return 'No microphone detected. Connect a microphone or type your command below.';
    }
    return 'Microphone unavailable. Please try again or type your command below.';
  };

  const startFallbackRecording = async () => {
    if (!voiceService.isAudioRecordingSupported()) {
      setVoiceError('Voice capture is unavailable in this browser.');
      setIsListening(false);
      setListenMode('none');
      return;
    }

    const started = await voiceService.startRecording({
      onStart: () => {
        setIsListening(true);
        setListenMode('recorder');
      },
      onError: (errCode) => {
        setIsListening(false);
        setListenMode('none');
        setVoiceError(mapMicError(errCode));
      },
    });

    if (!started) {
      setIsListening(false);
      setListenMode('none');
    }
  };

  const liveTranscriptRef = useRef<string>('');

  const handleToggleVoice = async () => {
    setVoiceError(null);
    if (isTranscribing) return;

    if (isListening) {
      if (listenMode === 'speech') {
        const captured = (liveTranscriptRef.current || input).trim();
        liveTranscriptRef.current = '';
        voiceService.stopListening();
        setIsListening(false);
        setListenMode('none');
        if (captured) {
          setInput('');
          await handleSubmit(undefined, captured);
        }
        return;
      }

      if (listenMode === 'recorder') {
        setIsListening(false);
        setListenMode('none');
        setIsTranscribing(true);
        try {
          const recording = await voiceService.stopRecording();
          if (!recording?.audioBase64) {
            setVoiceError('Recording was too short. Tap the mic, speak, then tap again.');
            return;
          }
          const result = await transcribeAudio(recording.audioBase64, recording.mimeType);
          if (result.success && result.text?.trim()) {
            await handleSubmit(undefined, result.text.trim());
          } else {
            setVoiceError(result.error || 'Could not transcribe voice command.');
          }
        } finally {
          setIsTranscribing(false);
        }
        return;
      }

      setIsListening(false);
      setListenMode('none');
      return;
    }

    // Prefer SpeechRecognition first, falling back to MediaRecorder + /api/transcribe
    if (voiceService.isSpeechRecognitionSupported()) {
      liveTranscriptRef.current = '';
      const started = voiceService.startListening({
        onStart: () => {
          setIsListening(true);
          setListenMode('speech');
        },
        onResult: (transcript: string, isFinal: boolean) => {
          liveTranscriptRef.current = transcript;
          setInput(transcript);
          if (isFinal && transcript.trim()) {
            liveTranscriptRef.current = '';
            voiceService.stopListening();
            setIsListening(false);
            setListenMode('none');
            setInput('');
            void handleSubmit(undefined, transcript.trim());
          }
        },
        onError: (errCode) => {
          if (errCode === 'no-speech') {
            liveTranscriptRef.current = '';
            setIsListening(false);
            setListenMode('none');
            setVoiceError('No speech detected. Tap the mic and speak clearly.');
            return;
          }
          if (errCode === 'not-allowed' || errCode === 'insecure-context') {
            liveTranscriptRef.current = '';
            voiceService.stopListening();
            setIsListening(false);
            setListenMode('none');
            setVoiceError(mapMicError(errCode));
            return;
          }
          liveTranscriptRef.current = '';
          voiceService.stopListening();
          void startFallbackRecording();
        },
        onEnd: () => {
          const leftover = liveTranscriptRef.current.trim();
          liveTranscriptRef.current = '';
          setIsListening(false);
          setListenMode('none');
          if (leftover) {
            setInput('');
            void handleSubmit(undefined, leftover);
          }
        },
      });
      if (started) return;
    }

    await startFallbackRecording();
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end gap-3">
      {/* Compact Expandable Quick Access Panel */}
      {isOpen && (
        <div
          className="w-[calc(100vw-2rem)] sm:w-[370px] max-h-[75vh] flex flex-col rounded-3xl bg-[#0D1120] text-zinc-100 border border-blue-500/35 shadow-2xl shadow-blue-950/70 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
          role="dialog"
          aria-label="NOVA AI Quick Access"
        >
          {/* Navy Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-[#0B1228] via-[#111B3D] to-[#0E1630] border-b border-blue-500/25 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src="/app-icon.jpg"
                alt="NOVA Quick Access"
                className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-400/50 shrink-0"
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                  <span>NOVA Quick Access</span>
                </div>
                <div className="text-[11px] text-blue-200/80 flex items-center gap-1.5 truncate">
                  <span>Agent #{config.agentId}</span>
                  <span>·</span>
                  <span
                    className={
                      isKeyActive ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'
                    }
                  >
                    {isKeyActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={onDisableQuickAccess}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 text-[11px] font-medium text-rose-200 transition-colors cursor-pointer"
                title="Disable Quick Access"
              >
                <Power className="w-3 h-3" />
                <span>Disable</span>
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-blue-200/70 hover:text-white hover:bg-blue-500/20 transition-colors cursor-pointer"
                aria-label="Minimize Quick Access"
                title="Minimize"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Inactive Key Warning Bar */}
          {!isKeyActive && (
            <div className="px-3.5 py-2 bg-amber-950/50 border-b border-amber-500/30 flex items-center justify-between gap-2 text-[11px] text-amber-200">
              <span>Key is Inactive. Enable it to run commands.</span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenEnables();
                }}
                className="px-2 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 font-semibold text-amber-100 cursor-pointer whitespace-nowrap"
              >
                Open Enables
              </button>
            </div>
          )}

          {/* Quick Command Chips */}
          <div className="px-3 py-2 bg-[#0B0F1E] border-b border-blue-900/40 flex items-center gap-1.5 overflow-x-auto">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={!isKeyActive || isSending}
                onClick={() => handleSubmit(undefined, chip)}
                className="px-2.5 py-1 rounded-lg bg-blue-950/70 hover:bg-blue-900/70 border border-blue-700/40 text-[11px] font-medium text-blue-100 whitespace-nowrap disabled:opacity-45 transition-colors cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Shared Agent #101 Message Feed */}
          <div className="flex-1 min-h-[210px] max-h-[320px] overflow-y-auto p-3.5 space-y-3 bg-[#090C18]">
            {messages.length === 0 ? (
              <div className="text-center py-8 px-3 space-y-2">
                <KeyRound className="w-7 h-7 text-blue-400/70 mx-auto" />
                <p className="text-xs font-semibold text-blue-100">
                  Connected to WORK Agent #{config.agentId}
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Type or speak a command like &ldquo;Open ChatGPT&rdquo;, &ldquo;Open YouTube&rdquo;, or &ldquo;Search the internet&rdquo;.
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
                    className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : msg.isError
                        ? 'bg-rose-950/70 border border-rose-700/50 text-rose-200'
                        : 'bg-[#131A33] border border-blue-800/40 text-zinc-100'
                    }`}
                  >
                    <p>{msg.content}</p>

                    {/* Action Result Card */}
                    {msg.action && (
                      <div className="mt-2 pt-2 border-t border-blue-400/20">
                        {msg.action.url && (
                          <a
                            href={msg.action.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-[11px] font-semibold transition-colors"
                          >
                            <span>{msg.action.label || 'Open Link'}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}

                        {msg.action.targetView && (
                          <button
                            type="button"
                            onClick={() => onNavigateView(msg.action!.targetView!)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <span>{msg.action.label || `Go to ${msg.action.targetView}`}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}

                        {msg.action.type === 'unsupported_device_action' && (
                          <div className="flex items-center gap-1.5 text-[11px] text-amber-300">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>Not supported from web browser runtime</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 px-1">
                    {msg.source === 'quick_access' ? 'Quick Access' : 'Enables Console'}
                  </span>
                </div>
              ))
            )}

            {isSending && (
              <div className="flex items-center gap-2 text-xs text-blue-300 px-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Agent #{config.agentId} processing...</span>
              </div>
            )}

            <div ref={feedEndRef} />
          </div>

          {voiceError && (
            <div className="px-3.5 py-1.5 bg-rose-950/60 border-t border-rose-700/40 text-[11px] text-rose-200 flex items-center justify-between gap-2">
              <span className="truncate">{voiceError}</span>
              <button
                type="button"
                onClick={() => setVoiceError(null)}
                className="text-rose-300 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Input & Voice Command Bar */}
          <form
            onSubmit={(e) => handleSubmit(e)}
            className="p-2.5 bg-[#0C1122] border-t border-blue-800/40 flex items-center gap-1.5"
          >
            <button
              type="button"
              onClick={handleToggleVoice}
              disabled={!isKeyActive || isSending || isTranscribing}
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:opacity-45 ${
                isListening
                  ? 'bg-rose-600 text-white'
                  : 'bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-700/40'
              }`}
              title={
                isTranscribing
                  ? 'Transcribing audio...'
                  : isListening
                  ? 'Stop voice command'
                  : 'Speak command'
              }
              aria-label={
                isTranscribing
                  ? 'Transcribing audio'
                  : isListening
                  ? 'Stop voice command'
                  : 'Speak command'
              }
            >
              {isTranscribing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isListening ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!isKeyActive || isSending || isTranscribing}
              placeholder={
                isTranscribing
                  ? 'Transcribing...'
                  : isListening
                  ? 'Listening...'
                  : isKeyActive
                  ? `Command Agent #${config.agentId}...`
                  : 'Key inactive...'
              }
              className="flex-1 min-w-0 h-9 px-3 rounded-xl bg-[#070A14] border border-blue-900/60 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={!input.trim() || !isKeyActive || isSending || isTranscribing}
              className="w-9 h-9 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white flex items-center justify-center shrink-0 transition-all cursor-pointer"
              aria-label="Send command"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating NOVA AI Shortcut Orb */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group relative w-14 h-14 rounded-full bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-500 p-0.5 shadow-xl shadow-blue-900/50 hover:scale-105 active:scale-95 transition-transform cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
        title="NOVA AI Quick Access"
        aria-label={isOpen ? 'Close NOVA Quick Access' : 'Open NOVA Quick Access'}
      >
        <img
          src="/app-icon.jpg"
          alt="NOVA Quick Access"
          className="w-full h-full rounded-full object-cover"
        />
        <span
          className={`absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0B0C14] ${
            isKeyActive ? 'bg-emerald-400' : 'bg-amber-400'
          }`}
        />
      </button>
    </div>
  );
};

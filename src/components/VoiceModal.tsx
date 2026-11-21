import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Mic,
  Volume2,
  VolumeX,
  Loader2,
  AlertCircle,
  RefreshCw,
  Send,
  Radio,
  AudioLines,
} from 'lucide-react';
import { voiceService } from '../services/voice';
import { sendChatMessage, transcribeAudio } from '../services/api';
import { GeminiModel, GroundingSource, Message } from '../types';

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewMessage: (
    userText: string,
    aiText: string,
    model?: string,
    groundingSources?: GroundingSource[]
  ) => void;
  conversationHistory: Message[];
  selectedModel?: GeminiModel;
  useSearchGrounding?: boolean;
}

type VoiceState = 'idle' | 'listening' | 'recording' | 'transcribing' | 'thinking' | 'speaking';
type CaptureMode = 'speech' | 'gemini-mic';

interface VoiceErrorState {
  code: string;
  title: string;
  detail: string;
  canTryGeminiMic: boolean;
}

function mapVoiceError(code: string, currentMode: CaptureMode): VoiceErrorState {
  const normalized = code.toLowerCase();

  if (normalized.includes('insecure-context')) {
    return {
      code: 'insecure-context',
      title: 'Secure HTTPS connection required',
      detail:
        'Microphone access requires HTTPS or localhost. Open NOVA over a secure link, or type your question below.',
      canTryGeminiMic: false,
    };
  }

  if (normalized.includes('not-allowed') || normalized.includes('permission') || normalized.includes('denied')) {
    return {
      code: 'not-allowed',
      title: 'Microphone access was blocked',
      detail:
        'Allow microphone permission for this site in your browser settings, then tap Retry Mic — or type your question below.',
      canTryGeminiMic: currentMode === 'speech' && voiceService.isAudioRecordingSupported(),
    };
  }

  if (normalized.includes('audio-capture') || normalized.includes('notfound') || normalized.includes('device')) {
    return {
      code: 'audio-capture',
      title: 'No microphone detected',
      detail:
        'Connect or enable a microphone and tap Retry Mic, or type your question directly below.',
      canTryGeminiMic: currentMode === 'speech' && voiceService.isAudioRecordingSupported(),
    };
  }

  if (normalized.includes('network') || normalized.includes('service-not-allowed')) {
    return {
      code: normalized,
      title: 'Browser speech service unavailable',
      detail:
        'Use Gemini Mic recording for reliable server-side transcription, or type your question below.',
      canTryGeminiMic: voiceService.isAudioRecordingSupported(),
    };
  }

  if (normalized.includes('not-supported')) {
    return {
      code: 'not-supported',
      title: 'Speech capture is not supported here',
      detail: 'Try switching capture mode or type your question directly below.',
      canTryGeminiMic: currentMode === 'speech' && voiceService.isAudioRecordingSupported(),
    };
  }

  return {
    code: code || 'unknown',
    title: 'Could not capture voice audio',
    detail: 'Tap the microphone orb to try again, switch capture mode, or type your question below.',
    canTryGeminiMic: currentMode === 'speech' && voiceService.isAudioRecordingSupported(),
  };
}

export const VoiceModal: React.FC<VoiceModalProps> = ({
  isOpen,
  onClose,
  onNewMessage,
  conversationHistory,
  selectedModel = 'gemini-4-hydrogen',
  useSearchGrounding = false,
}) => {
  const speechSupported = voiceService.isSpeechRecognitionSupported();
  const recordingSupported = voiceService.isAudioRecordingSupported();

  const [captureMode, setCaptureMode] = useState<CaptureMode>(() =>
    speechSupported ? 'speech' : 'gemini-mic'
  );
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [userTranscript, setUserTranscript] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [typedFallback, setTypedFallback] = useState<string>('');
  const [errorState, setErrorState] = useState<VoiceErrorState | null>(null);

  const activeSessionIdRef = useRef<number>(0);
  const liveTranscriptRef = useRef<string>('');
  const isSubmittingRef = useRef<boolean>(false);

  const cleanupAllAudio = useCallback(() => {
    activeSessionIdRef.current += 1;
    isSubmittingRef.current = false;
    liveTranscriptRef.current = '';
    voiceService.stopListening();
    voiceService.cancelRecording();
    voiceService.stopSpeaking();
  }, []);

  const handleCloseModal = useCallback(() => {
    cleanupAllAudio();
    onClose();
  }, [cleanupAllAudio, onClose]);

  const processVoiceQuery = useCallback(
    async (rawQuery: string, sessionId: number) => {
      const query = rawQuery.trim();
      if (!query || isSubmittingRef.current) {
        if (activeSessionIdRef.current === sessionId) {
          setVoiceState('idle');
        }
        return;
      }

      isSubmittingRef.current = true;
      setVoiceState('thinking');
      setAiResponse('');
      setErrorState(null);

      try {
        const newUserMsg: Message = {
          id: `voice-usr-${Date.now()}`,
          role: 'user',
          content: query,
          timestamp: Date.now(),
        };

        const messagesForApi = [...conversationHistory, newUserMsg];
        const result = await sendChatMessage(messagesForApi, useSearchGrounding, selectedModel);

        if (activeSessionIdRef.current !== sessionId) return;

        if (result.success && result.text) {
          const cleanAnswer = result.text;
          setAiResponse(cleanAnswer);
          setVoiceState('speaking');

          onNewMessage(query, cleanAnswer, result.model, result.groundingSources);

          voiceService.speak(cleanAnswer, `voice-resp-${Date.now()}`, () => {
            if (activeSessionIdRef.current === sessionId) {
              setVoiceState('idle');
            }
          });
        } else {
          setErrorState({
            code: 'chat-failed',
            title: 'NOVA could not reply',
            detail: result.error || 'Please try asking again.',
            canTryGeminiMic: false,
          });
          setVoiceState('idle');
        }
      } catch (e: any) {
        if (activeSessionIdRef.current !== sessionId) return;
        setErrorState({
          code: 'network',
          title: 'Connection error',
          detail: e?.message || 'Error communicating with NOVA. Please try again.',
          canTryGeminiMic: false,
        });
        setVoiceState('idle');
      } finally {
        isSubmittingRef.current = false;
      }
    },
    [conversationHistory, onNewMessage, selectedModel, useSearchGrounding]
  );

  const startGeminiRecording = useCallback(
    async (sessionId: number) => {
      if (!voiceService.isAudioRecordingSupported()) {
        setErrorState(mapVoiceError('not-supported', 'gemini-mic'));
        setVoiceState('idle');
        return;
      }

      setErrorState(null);
      setUserTranscript('');
      liveTranscriptRef.current = '';
      setVoiceState('recording');

      const started = await voiceService.startRecording({
        onStart: () => {
          if (activeSessionIdRef.current === sessionId) {
            setVoiceState('recording');
          }
        },
        onError: (errCode) => {
          if (activeSessionIdRef.current !== sessionId) return;
          setErrorState(mapVoiceError(errCode, 'gemini-mic'));
          setVoiceState('idle');
        },
      });

      if (!started && activeSessionIdRef.current === sessionId) {
        setVoiceState('idle');
      }
    },
    []
  );

  const startCaptureSession = useCallback(
    async (requestedMode?: CaptureMode) => {
      const modeToUse = requestedMode || captureMode;

      activeSessionIdRef.current += 1;
      const sessionId = activeSessionIdRef.current;
      isSubmittingRef.current = false;
      liveTranscriptRef.current = '';

      voiceService.stopSpeaking();
      voiceService.stopListening();
      voiceService.cancelRecording();

      setErrorState(null);
      setUserTranscript('');

      if (modeToUse === 'gemini-mic' || !voiceService.isSpeechRecognitionSupported()) {
        if (modeToUse !== 'gemini-mic') {
          setCaptureMode('gemini-mic');
        }
        await startGeminiRecording(sessionId);
        return;
      }

      setVoiceState('listening');

      const started = voiceService.startListening({
        onStart: () => {
          if (activeSessionIdRef.current === sessionId) {
            setVoiceState('listening');
          }
        },
        onResult: (text) => {
          if (activeSessionIdRef.current !== sessionId) return;
          liveTranscriptRef.current = text;
          setUserTranscript(text);
        },
        onError: (errCode) => {
          if (activeSessionIdRef.current !== sessionId) return;
          if (errCode === 'no-speech') {
            setVoiceState('idle');
            return;
          }

          // Automatically fall back to Gemini audio transcription if Web Speech fails
          if (
            (errCode === 'network' ||
              errCode === 'service-not-allowed' ||
              errCode === 'not-supported' ||
              errCode === 'audio-capture' ||
              errCode === 'aborted') &&
            voiceService.isAudioRecordingSupported()
          ) {
            voiceService.stopListening();
            setCaptureMode('gemini-mic');
            void startGeminiRecording(sessionId);
            return;
          }

          if (errCode === 'aborted') {
            setVoiceState('idle');
            return;
          }

          setErrorState(mapVoiceError(errCode, 'speech'));
          setVoiceState('idle');
        },
        onEnd: () => {
          if (activeSessionIdRef.current !== sessionId) return;
          const captured = liveTranscriptRef.current.trim();
          if (captured.length > 0) {
            processVoiceQuery(captured, sessionId);
          } else {
            setVoiceState('idle');
          }
        },
      });

      if (!started && activeSessionIdRef.current === sessionId) {
        if (voiceService.isAudioRecordingSupported()) {
          setCaptureMode('gemini-mic');
          await startGeminiRecording(sessionId);
        } else {
          setVoiceState('idle');
        }
      }
    },
    [captureMode, processVoiceQuery, startGeminiRecording]
  );

  const stopCaptureAndSend = useCallback(async () => {
    const sessionId = activeSessionIdRef.current;

    if (voiceState === 'listening') {
      const captured = liveTranscriptRef.current.trim();
      voiceService.stopListening();
      if (captured.length > 0) {
        await processVoiceQuery(captured, sessionId);
      } else {
        setErrorState({
          code: 'no-speech',
          title: 'No speech detected',
          detail: 'Tap the orb and speak clearly, or try Gemini Mic recording.',
          canTryGeminiMic: voiceService.isAudioRecordingSupported(),
        });
        setVoiceState('idle');
      }
      return;
    }

    if (voiceState === 'recording') {
      setVoiceState('transcribing');
      const recording = await voiceService.stopRecording();
      if (activeSessionIdRef.current !== sessionId) return;

      if (!recording) {
        setErrorState({
          code: 'no-speech',
          title: 'Recording was too short',
          detail: 'Tap the orb, speak your question, then tap again when finished.',
          canTryGeminiMic: false,
        });
        setVoiceState('idle');
        return;
      }

      const transcription = await transcribeAudio(recording.audioBase64, recording.mimeType);
      if (activeSessionIdRef.current !== sessionId) return;

      const text = transcription.text?.trim() || '';
      if (transcription.success && text.length > 0) {
        setUserTranscript(text);
        await processVoiceQuery(text, sessionId);
      } else {
        setErrorState({
          code: 'transcribe-failed',
          title: 'Could not transcribe audio',
          detail: transcription.error || 'Please speak a bit louder or type your question below.',
          canTryGeminiMic: false,
        });
        setVoiceState('idle');
      }
    }
  }, [processVoiceQuery, voiceState]);

  const handleInterruptSpeech = useCallback(() => {
    voiceService.stopSpeaking();
    setVoiceState('idle');
  }, []);

  const handleSwitchCaptureMode = useCallback(
    (nextMode: CaptureMode) => {
      if (nextMode === captureMode) return;
      if (nextMode === 'speech' && !speechSupported) return;
      if (nextMode === 'gemini-mic' && !recordingSupported) return;

      cleanupAllAudio();
      setErrorState(null);
      setVoiceState('idle');
      setCaptureMode(nextMode);
    },
    [captureMode, cleanupAllAudio, recordingSupported, speechSupported]
  );

  const handleTypedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = typedFallback.trim();
    if (!text || voiceState === 'thinking' || voiceState === 'transcribing') return;

    cleanupAllAudio();
    const sessionId = activeSessionIdRef.current;
    setTypedFallback('');
    setUserTranscript(text);
    await processVoiceQuery(text, sessionId);
  };

  // Start or reset when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      cleanupAllAudio();
      setVoiceState('idle');
      setUserTranscript('');
      setAiResponse('');
      setTypedFallback('');
      setErrorState(null);
      return;
    }

    const defaultMode: CaptureMode = speechSupported ? 'speech' : 'gemini-mic';
    setCaptureMode(defaultMode);
    startCaptureSession(defaultMode);

    return () => {
      cleanupAllAudio();
    };
    // Only trigger open/close lifecycle intentionally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Escape key closes modal cleanly
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleCloseModal, isOpen]);

  if (!isOpen) return null;

  const isBusy = voiceState === 'thinking' || voiceState === 'transcribing';
  const isCapturing = voiceState === 'listening' || voiceState === 'recording';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md max-h-[92vh] rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col overflow-hidden text-white relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nova-voice-mode-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 z-10 shrink-0">
          <div className="flex items-center gap-2.5">
            <img
              src="/app-icon.jpg"
              alt="NOVA"
              className="w-7 h-7 rounded-lg object-cover ring-1 ring-blue-500/30"
            />
            <span
              id="nova-voice-mode-title"
              className="font-display font-semibold text-sm tracking-tight text-zinc-100 whitespace-nowrap"
            >
              NOVA Voice Mode
            </span>
          </div>

          <button
            type="button"
            onClick={handleCloseModal}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close voice mode"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Capture Mode Switcher */}
        {(speechSupported || recordingSupported) && (
          <div className="px-4 pt-3 flex items-center justify-center z-10 shrink-0">
            <div
              className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-950/80 border border-slate-800"
              role="group"
              aria-label="Voice capture method"
            >
              {speechSupported && (
                <button
                  type="button"
                  onClick={() => handleSwitchCaptureMode('speech')}
                  className={`inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    captureMode === 'speech'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-zinc-200'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Live Speech</span>
                </button>
              )}
              {recordingSupported && (
                <button
                  type="button"
                  onClick={() => handleSwitchCaptureMode('gemini-mic')}
                  className={`inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    captureMode === 'gemini-mic'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-zinc-200'
                  }`}
                >
                  <AudioLines className="w-3.5 h-3.5" />
                  <span>Gemini Mic</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Central Ambient Orb Visualizer */}
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-4 text-center relative overflow-y-auto">
          <div
            className={`w-48 h-48 rounded-full blur-3xl transition-all duration-500 pointer-events-none absolute ${
              isCapturing
                ? 'bg-rose-500/25 scale-125'
                : isBusy
                ? 'bg-amber-500/25 scale-110'
                : voiceState === 'speaking'
                ? 'bg-indigo-500/35 scale-125'
                : 'bg-indigo-600/20 scale-100'
            }`}
          />

          {/* Interactive Voice Orb Button */}
          <div className="relative mb-5 z-10">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                if (isCapturing) {
                  stopCaptureAndSend();
                } else if (voiceState === 'speaking') {
                  handleInterruptSpeech();
                } else if (voiceState === 'idle') {
                  startCaptureSession();
                }
              }}
              className={`w-28 h-28 rounded-full flex items-center justify-center transition-transform duration-200 shadow-xl cursor-pointer disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-400 ${
                isCapturing
                  ? 'bg-gradient-to-tr from-rose-600 to-pink-500 text-white ring-8 ring-rose-500/30 scale-105'
                  : isBusy
                  ? 'bg-gradient-to-tr from-amber-600 to-orange-500 text-white ring-8 ring-amber-500/20'
                  : voiceState === 'speaking'
                  ? 'bg-gradient-to-tr from-indigo-600 to-violet-500 text-white ring-8 ring-indigo-500/30'
                  : 'bg-gradient-to-tr from-indigo-700 to-violet-600 text-white hover:scale-105 active:scale-95 ring-4 ring-indigo-500/20'
              }`}
              aria-label={
                isCapturing
                  ? 'Stop listening and send'
                  : voiceState === 'speaking'
                  ? 'Stop speaking'
                  : isBusy
                  ? 'Processing voice request'
                  : 'Tap to start speaking'
              }
            >
              {isCapturing && <Mic className="w-10 h-10" />}
              {isBusy && <Loader2 className="w-10 h-10 animate-spin" />}
              {voiceState === 'speaking' && <Volume2 className="w-10 h-10" />}
              {voiceState === 'idle' && <Mic className="w-10 h-10 opacity-95" />}
            </button>
          </div>

          {/* Status Label */}
          <div className="z-10 mb-4">
            <p className="text-xs uppercase tracking-widest font-semibold text-indigo-300 mb-1">
              {voiceState === 'listening' && 'Listening to you...'}
              {voiceState === 'recording' && 'Recording microphone...'}
              {voiceState === 'transcribing' && 'Transcribing audio...'}
              {voiceState === 'thinking' && 'NOVA is thinking...'}
              {voiceState === 'speaking' && 'NOVA is speaking...'}
              {voiceState === 'idle' && 'Tap the orb to speak'}
            </p>
            <p className="text-xs text-slate-400">
              {isCapturing && 'Tap the orb again when finished'}
              {voiceState === 'transcribing' && 'Processing your voice with Gemini'}
              {voiceState === 'thinking' && 'Generating response'}
              {voiceState === 'speaking' && 'Tap the orb to interrupt'}
              {voiceState === 'idle' &&
                (captureMode === 'gemini-mic'
                  ? 'Using Gemini Mic audio capture'
                  : 'Ask any question or study out loud')}
            </p>
          </div>

          {/* Error Recovery Card or Live Transcript Box */}
          {errorState ? (
            <div className="w-full rounded-2xl bg-rose-950/50 border border-rose-500/40 p-3.5 text-left z-10 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-rose-200">{errorState.title}</p>
                  <p className="text-xs text-rose-200/80 mt-0.5 leading-relaxed">
                    {errorState.detail}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => startCaptureSession()}
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white whitespace-nowrap transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Mic</span>
                </button>
                {errorState.canTryGeminiMic && (
                  <button
                    type="button"
                    onClick={() => {
                      setCaptureMode('gemini-mic');
                      startCaptureSession('gemini-mic');
                    }}
                    className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-zinc-100 whitespace-nowrap transition-colors cursor-pointer"
                  >
                    <AudioLines className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Try Gemini Mic</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full max-h-36 overflow-y-auto rounded-2xl bg-slate-950/60 border border-slate-800/80 p-3.5 text-left text-xs leading-relaxed z-10">
              {userTranscript && (
                <div className="mb-2">
                  <span className="font-semibold text-slate-400 block mb-0.5">You:</span>
                  <span className="text-slate-100">"{userTranscript}"</span>
                </div>
              )}
              {aiResponse && (
                <div>
                  <span className="font-semibold text-indigo-400 block mb-0.5">NOVA:</span>
                  <span className="text-zinc-200">{aiResponse}</span>
                </div>
              )}
              {!userTranscript && !aiResponse && (
                <p className="text-slate-400 text-center italic py-1.5">
                  "Hi NOVA, can you summarize the solar system?"
                </p>
              )}
            </div>
          )}
        </div>

        {/* Inline Typed Fallback + Footer Controls (Thumb Zone) */}
        <div className="p-4 bg-slate-950/85 border-t border-slate-800/80 space-y-2.5 z-10 shrink-0">
          <form onSubmit={handleTypedSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={typedFallback}
              onChange={(e) => setTypedFallback(e.target.value)}
              disabled={isBusy}
              placeholder="Or type a question for voice reply..."
              className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-zinc-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isBusy || !typedFallback.trim()}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white transition-colors cursor-pointer disabled:cursor-not-allowed"
              aria-label="Send typed question"
              title="Send typed question"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                if (voiceState === 'speaking') {
                  handleInterruptSpeech();
                } else if (isCapturing) {
                  stopCaptureAndSend();
                } else {
                  startCaptureSession();
                }
              }}
              className="flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-100 whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50"
            >
              {voiceState === 'speaking' ? (
                <>
                  <VolumeX className="w-4 h-4 text-rose-400" />
                  <span>Mute Reply</span>
                </>
              ) : isCapturing ? (
                <>
                  <Mic className="w-4 h-4 text-rose-400" />
                  <span>Send Audio</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-indigo-400" />
                  <span>New Question</span>
                </>
              )}
            </button>

            <span className="text-[11px] text-slate-400 whitespace-nowrap">
              Press Esc to return to text
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

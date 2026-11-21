import React, { useRef, useEffect, useState } from 'react';
import {
  Send,
  Loader2,
  Mic,
  MicOff,
  Globe,
  Paperclip,
  Lightbulb,
  X,
  FileText,
} from 'lucide-react';
import { voiceService } from '../services/voice';
import { transcribeAudio } from '../services/api';
import { MessageAttachment } from '../types';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: (attachment?: MessageAttachment) => void;
  isLoading: boolean;
  disabled?: boolean;
  useSearchGrounding?: boolean;
  onToggleSearchGrounding?: () => void;
  reasoningMode?: boolean;
  onToggleReasoningMode?: () => void;
}

const TEXT_EXTENSIONS = new Set([
  'txt',
  'md',
  'markdown',
  'json',
  'js',
  'jsx',
  'ts',
  'tsx',
  'py',
  'css',
  'html',
  'csv',
  'yaml',
  'yml',
  'xml',
  'sql',
  'sh',
]);

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onSend,
  isLoading,
  disabled = false,
  useSearchGrounding = false,
  onToggleSearchGrounding,
  reasoningMode = false,
  onToggleReasoningMode,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [listenMode, setListenMode] = useState<'none' | 'speech' | 'recorder'>('none');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<MessageAttachment | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const speechSupported = voiceService.isSpeechRecognitionSupported();
  const recordingSupported = voiceService.isAudioRecordingSupported();
  const micSupported = speechSupported || recordingSupported;

  useEffect(() => {
    return () => {
      voiceService.stopListening();
      voiceService.cancelRecording();
    };
  }, []);

  // Auto-resize textarea height up to 180px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleFileObject = async (file: File) => {
    setVoiceError(null);
    const maxBytes = 8 * 1024 * 1024;
    if (file.size > maxBytes) {
      setVoiceError('File is too large. Please choose a file under 8 MB.');
      return;
    }

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        const commaIdx = result.indexOf(',');
        const base64 = commaIdx >= 0 ? result.slice(commaIdx + 1) : result;
        setAttachment({
          name: file.name,
          kind: 'image',
          mimeType: file.type,
          content: base64,
        });
      };
      reader.readAsDataURL(file);
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (file.type.startsWith('text/') || TEXT_EXTENSIONS.has(ext) || file.type === 'application/json') {
      const textContent = await file.text();
      setAttachment({
        name: file.name,
        kind: 'text',
        mimeType: file.type || 'text/plain',
        content: textContent,
      });
      return;
    }

    setVoiceError('Supported files: images (PNG, JPG, WebP) or code/text files (.txt, .md, .js, .ts, .py, .json, .csv).');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileObject(file);
    }
    e.target.value = '';
  };

  const triggerSend = () => {
    if (isLoading || isTranscribing || (!input.trim() && !attachment)) return;
    if (isListening) {
      voiceService.stopListening();
      voiceService.cancelRecording();
      setIsListening(false);
      setListenMode('none');
    }
    const attached = attachment || undefined;
    setAttachment(null);
    onSend(attached);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      triggerSend();
    }
  };

  const mapMicErrorMessage = (errCode: string): string => {
    const code = errCode.toLowerCase();
    if (code.includes('insecure-context')) {
      return 'Microphone access requires a secure HTTPS connection or localhost.';
    }
    if (code.includes('not-allowed') || code.includes('permission') || code.includes('denied')) {
      return 'Microphone permission was blocked. Allow microphone access in your browser settings.';
    }
    if (code.includes('audio-capture') || code.includes('notfound') || code.includes('device')) {
      return 'No microphone was detected. Connect a microphone and try again.';
    }
    if (code.includes('not-supported')) {
      return 'Microphone recording is not supported in this browser.';
    }
    return 'Could not capture voice audio. Please try again or type your message.';
  };

  const startFallbackRecording = async () => {
    if (!recordingSupported) {
      setIsListening(false);
      setListenMode('none');
      setVoiceError('Microphone recording is not supported in this browser.');
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
        setVoiceError(mapMicErrorMessage(errCode));
      },
    });

    if (!started) {
      setIsListening(false);
      setListenMode('none');
    }
  };

  const toggleListening = async () => {
    setVoiceError(null);
    if (isTranscribing) return;

    if (isListening) {
      if (listenMode === 'speech') {
        voiceService.stopListening();
        setIsListening(false);
        setListenMode('none');
        return;
      }

      if (listenMode === 'recorder') {
        setIsListening(false);
        setListenMode('none');
        setIsTranscribing(true);
        try {
          const recording = await voiceService.stopRecording();
          if (!recording?.audioBase64) {
            setVoiceError('Recording was too short. Tap the mic, speak clearly, then tap Done.');
            return;
          }
          const result = await transcribeAudio(recording.audioBase64, recording.mimeType);
          const transcribedText = result.text?.trim() || '';
          if (result.success && transcribedText) {
            setInput(input.trim() ? `${input.trim()} ${transcribedText}` : transcribedText);
          } else {
            setVoiceError(result.error || 'Could not transcribe audio. Please speak clearly and try again.');
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

    if (speechSupported) {
      const previousText = input.trim();
      const started = voiceService.startListening({
        onStart: () => {
          setIsListening(true);
          setListenMode('speech');
        },
        onResult: (transcript) => {
          const combined = previousText ? `${previousText} ${transcript}` : transcript;
          setInput(combined);
        },
        onError: (err) => {
          if (err === 'no-speech') {
            setIsListening(false);
            setListenMode('none');
            setVoiceError('No speech detected. Tap the microphone and speak clearly.');
            return;
          }
          if (err === 'not-allowed' || err === 'insecure-context') {
            setIsListening(false);
            setListenMode('none');
            setVoiceError(mapMicErrorMessage(err));
            return;
          }
          // Fall back to Gemini audio recording + /api/transcribe when browser SpeechRecognition fails
          if (recordingSupported) {
            voiceService.stopListening();
            void startFallbackRecording();
            return;
          }
          setIsListening(false);
          setListenMode('none');
          if (err !== 'aborted') {
            setVoiceError(mapMicErrorMessage(err));
          }
        },
        onEnd: () => {
          setIsListening(false);
          setListenMode('none');
        },
      });

      if (started) return;
    }

    await startFallbackRecording();
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4 pt-1">
      {/* Error / Dictation Notice */}
      {voiceError && (
        <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
          <span>{voiceError}</span>
          <button
            type="button"
            onClick={() => setVoiceError(null)}
            className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {isListening && (
        <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
          <span className="font-medium">
            {listenMode === 'recorder'
              ? 'Recording audio... Speak now, then tap Done.'
              : 'Listening to your voice... Speak now.'}
          </span>
          <button
            type="button"
            onClick={toggleListening}
            className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
          >
            Done
          </button>
        </div>
      )}

      {isTranscribing && (
        <div className="flex items-center gap-2 px-3 py-1.5 mb-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 text-xs text-indigo-700 dark:text-indigo-300">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span className="font-medium">Transcribing your voice with Gemini...</span>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.txt,.md,.json,.js,.jsx,.ts,.tsx,.py,.csv,.html,.css,.sql,.yml,.yaml"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Floating Composer Card */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) handleFileObject(dropped);
        }}
        className={`relative flex flex-col p-3 rounded-2xl bg-white dark:bg-[#141624]/95 border shadow-sm transition-all ${
          isDragging
            ? 'border-violet-500 ring-2 ring-violet-500/30'
            : isListening
            ? 'border-rose-400 dark:border-rose-500/60 ring-2 ring-rose-500/20'
            : 'border-slate-200/90 dark:border-zinc-800/90 focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-500/60'
        }`}
      >
        {/* Attached File Preview */}
        {attachment && (
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 mb-2 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              {attachment.kind === 'image' ? (
                <img
                  src={`data:${attachment.mimeType};base64,${attachment.content}`}
                  alt={attachment.name}
                  className="w-7 h-7 rounded-md object-cover shrink-0"
                />
              ) : (
                <FileText className="w-4 h-4 text-indigo-500 dark:text-violet-400 shrink-0" />
              )}
              <span className="truncate font-medium text-slate-700 dark:text-zinc-200">
                {attachment.name}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 cursor-pointer"
              aria-label="Remove attachment"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isListening
              ? 'Listening to you... speak your question'
              : useSearchGrounding
              ? 'Ask NOVA with live Google Search grounding...'
              : 'Send a message or drop a file...'
          }
          rows={2}
          disabled={disabled || isLoading}
          className="w-full max-h-[180px] px-1 py-1 bg-transparent text-sm md:text-[15px] text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 resize-none outline-none leading-relaxed disabled:opacity-60"
        />

        {/* Composer Action Toolbar */}
        <div className="flex items-center justify-between gap-2 pt-2.5 mt-1">
          {/* Left Tools: Files, Web Search, Reasoning */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isLoading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200/80 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-800 transition-colors whitespace-nowrap cursor-pointer"
              title="Attach image or code/text file"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>Files</span>
            </button>

            {onToggleSearchGrounding && (
              <button
                type="button"
                onClick={onToggleSearchGrounding}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                  useSearchGrounding
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700'
                    : 'bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200/80 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200/80 dark:border-zinc-800'
                }`}
                title="Toggle live Google Search Grounding"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
            )}

            {onToggleReasoningMode && (
              <button
                type="button"
                onClick={onToggleReasoningMode}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                  reasoningMode
                    ? 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-700'
                    : 'bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200/80 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200/80 dark:border-zinc-800'
                }`}
                title="Toggle deep reasoning mode"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Reasoning</span>
              </button>
            )}
          </div>

          {/* Right Tools: Mic + Violet Circular Send Button */}
          <div className="flex items-center gap-2 shrink-0">
            {micSupported && (
              <button
                type="button"
                onClick={toggleListening}
                disabled={disabled || isLoading || isTranscribing}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer disabled:opacity-60 ${
                  isListening
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-500/30'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800'
                }`}
                title={
                  isTranscribing
                    ? 'Transcribing audio...'
                    : isListening
                    ? 'Stop voice dictation'
                    : 'Dictate with microphone'
                }
                aria-label={
                  isTranscribing
                    ? 'Transcribing audio'
                    : isListening
                    ? 'Stop voice dictation'
                    : 'Dictate with microphone'
                }
              >
                {isTranscribing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                ) : isListening ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={triggerSend}
              disabled={disabled || isLoading || isTranscribing || (!input.trim() && !attachment)}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-violet-600 hover:bg-violet-500 active:scale-95 text-white disabled:bg-slate-200 dark:disabled:bg-zinc-800 disabled:text-slate-400 dark:disabled:text-zinc-600 disabled:scale-100 transition-all shadow-sm shadow-violet-600/30 cursor-pointer disabled:cursor-not-allowed"
              title="Send message"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

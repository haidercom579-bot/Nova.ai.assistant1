import React, { useState, useEffect } from 'react';
import { Message } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { User, Copy, Check, RotateCcw, AlertCircle, Volume2, VolumeX, Globe, ExternalLink, FileText } from 'lucide-react';
import { voiceService } from '../services/voice';

interface ChatMessageProps {
  message: Message;
  onRetry?: (message: Message) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onRetry }) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isUser = message.role === 'user';
  const isError = Boolean(message.isError);

  useEffect(() => {
    const unsubscribe = voiceService.subscribeToSpeakingChange((activeId) => {
      setIsSpeaking(activeId === message.id);
    });
    return () => unsubscribe();
  }, [message.id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleSpeak = () => {
    if (isSpeaking) {
      voiceService.stopSpeaking();
    } else {
      voiceService.speak(message.content, message.id);
    }
  };

  const formattedTime = new Intl.DateTimeFormat([], {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(message.timestamp));

  return (
    <div
      className={`group relative w-full flex justify-center px-4 py-3 md:px-6 transition-colors ${
        isUser
          ? 'bg-transparent'
          : 'bg-white/60 dark:bg-zinc-900/40 border-y border-slate-100 dark:border-zinc-800/60'
      }`}
    >
      <div
        className={`flex gap-3.5 max-w-3xl w-full ${
          isUser ? 'flex-row-reverse justify-start' : 'flex-row'
        }`}
      >
        {/* Avatar */}
        <div className="shrink-0 mt-0.5">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 flex items-center justify-center shadow-xs">
              <User className="w-4 h-4" />
            </div>
          ) : (
            <img
              src="/app-icon.jpg"
              alt="NOVA"
              className="w-8 h-8 rounded-full object-cover shadow-sm shadow-blue-500/20 ring-2 ring-blue-500/30"
            />
          )}
        </div>

        {/* Message Content Container */}
        <div
          className={`flex-1 min-w-0 ${
            isUser
              ? 'max-w-[85%] md:max-w-[75%]'
              : 'w-full'
          }`}
        >
          {/* Header info */}
          <div
            className={`flex items-center gap-2 mb-1.5 text-xs text-slate-600 dark:text-zinc-300 font-medium ${
              isUser ? 'justify-end' : 'justify-start'
            }`}
          >
            <span className="font-semibold text-slate-700 dark:text-zinc-300">
              {isUser ? 'You' : 'NOVA'}
            </span>
            {!isUser && message.model && (
              <span className="px-1.5 py-0.2 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-mono font-medium border border-indigo-200/50 dark:border-indigo-800/50">
                {message.model === 'gemini-4-hydrogen'
                  ? 'Gemini 4 Hydrogen'
                  : message.model === 'gemini-3.1-flash-lite'
                  ? 'Gemini 3.1 Flash-Lite'
                  : message.model.replace('gemini-', 'Gemini ')}
              </span>
            )}
            <span aria-hidden="true" className="opacity-40">·</span>
            <span className="text-[11px] font-mono tabular-nums opacity-80">{formattedTime}</span>
          </div>

          {/* Message Bubble / Body */}
          {isError ? (
            <div className="rounded-xl p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="font-medium mb-1">Response could not be generated</p>
                  <p className="text-xs text-rose-700 dark:text-rose-300 mb-3">{message.content}</p>
                  {onRetry && (
                    <button
                      onClick={() => onRetry(message)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 active:scale-95 transition-all shadow-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Try Again
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : isUser ? (
            <div className="bg-indigo-600 dark:bg-violet-600 text-white rounded-2xl rounded-tr-xs px-4 py-3 text-[15px] shadow-sm leading-relaxed whitespace-pre-wrap space-y-2">
              {message.attachment && (
                <div className="flex items-center gap-2 rounded-xl bg-black/20 px-2.5 py-1.5 text-xs">
                  {message.attachment.kind === 'image' ? (
                    <img
                      src={`data:${message.attachment.mimeType};base64,${message.attachment.content}`}
                      alt={message.attachment.name}
                      className="w-10 h-10 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <FileText className="w-4 h-4 shrink-0 opacity-90" />
                  )}
                  <span className="truncate font-medium">{message.attachment.name}</span>
                </div>
              )}
              {message.content && <div>{message.content}</div>}
            </div>
          ) : (
            <div className="text-slate-800 dark:text-zinc-200">
              <MarkdownRenderer content={message.content} />

              {/* Grounding Sources from Google Search */}
              {message.groundingSources && message.groundingSources.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-zinc-800">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mb-1.5">
                    <Globe className="w-3 h-3 text-indigo-500" />
                    <span>Sources from Google Search</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {message.groundingSources.map((source, idx) => (
                      <a
                        key={idx}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-[11px] text-slate-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/60 dark:border-zinc-700/60 transition-colors"
                        title={source.title}
                      >
                        <span className="truncate max-w-[180px]">{source.title}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Footer (for AI messages) */}
          {!isUser && !isError && (
            <div className="mt-2.5 flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={handleToggleSpeak}
                className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors ${
                  isSpeaking
                    ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800'
                }`}
                title={isSpeaking ? 'Stop speaking' : 'Read aloud with voice'}
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-[11px]">Stop</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Read Aloud</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                title="Copy message"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Copy</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

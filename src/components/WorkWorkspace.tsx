import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Settings,
  Mic,
  MicOff,
  Send,
  ExternalLink,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Loader2,
  Trash2,
  Plus,
  KeyRound,
  X,
  ArrowLeft,
  Globe,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  AgentKeyConfig,
  GeminiModel,
  WorkActivityStage,
  WorkActivityStep,
  WorkAgentProfile,
  WorkAgentStatus,
  WorkCommandExecution,
  WorkErrorDetails,
} from '../types';
import { WorkAgentService } from '../services/workAgent';
import { voiceService } from '../services/voice';
import { transcribeAudio } from '../services/api';

interface WorkWorkspaceProps {
  agents: WorkAgentProfile[];
  activeAgent: WorkAgentProfile;
  executions: WorkCommandExecution[];
  selectedModel: GeminiModel;
  agentKeyConfig: AgentKeyConfig | null;
  onSelectAgent: (agentId: string) => void;
  onCreateNewAgent: () => void;
  onUpdateAgentProfile: (updated: WorkAgentProfile) => void;
  onSaveExecutions: (next: WorkCommandExecution[]) => void;
  onNavigateAppView: (view: 'chat' | 'settings' | 'pricing' | 'voice' | 'enables' | 'cart') => void;
  onExitWork: () => void;
}

const SUGGESTED_COMMANDS = [
  'Open ChatGPT',
  'Open Google',
  'Open YouTube',
  'Open Nova AI settings',
  'Search for latest AI breakthroughs',
];

function createStep(
  stage: WorkActivityStage,
  label: string,
  detail?: string,
  errorDetails?: WorkErrorDetails
): WorkActivityStep {
  return {
    id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    stage,
    label,
    detail,
    timestamp: Date.now(),
    errorDetails,
  };
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export const WorkWorkspace: React.FC<WorkWorkspaceProps> = ({
  agents,
  activeAgent,
  executions,
  selectedModel,
  agentKeyConfig,
  onSelectAgent,
  onCreateNewAgent,
  onUpdateAgentProfile,
  onSaveExecutions,
  onNavigateAppView,
  onExitWork,
}) => {
  const [commandInput, setCommandInput] = useState('');
  const [agentStatus, setAgentStatus] = useState<WorkAgentStatus>('idle');
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [expandedDiagnosticIds, setExpandedDiagnosticIds] = useState<Record<string, boolean>>({});

  // Voice capture states
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [listenMode, setListenMode] = useState<'none' | 'speech' | 'recorder'>('none');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const executionsRef = useRef<WorkCommandExecution[]>(executions);

  useEffect(() => {
    executionsRef.current = executions;
  }, [executions]);

  // Scope command history to the active numbered agent
  const agentExecutions = executions.filter((ex) => ex.agentId === activeAgent.id);
  const currentExecution =
    agentExecutions.find((ex) => ex.id === selectedExecutionId) || agentExecutions[0] || null;

  useEffect(() => {
    return () => {
      voiceService.stopListening();
      voiceService.cancelRecording();
    };
  }, []);

  const commitExecutions = (next: WorkCommandExecution[]) => {
    executionsRef.current = next;
    WorkAgentService.saveExecutions(next);
    onSaveExecutions(next);
  };

  // Helper to update a specific execution synchronously against the latest ref snapshot
  const updateExecutionById = (
    execId: string,
    updater: (prev: WorkCommandExecution) => WorkCommandExecution
  ) => {
    const updated = executionsRef.current.map((ex) => (ex.id === execId ? updater(ex) : ex));
    commitExecutions(updated);
  };

  const toggleDiagnosticLog = (stepId: string) => {
    setExpandedDiagnosticIds((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  const handleRunCommand = async (e?: React.FormEvent, preset?: string) => {
    e?.preventDefault();
    const rawCmd = (preset ?? commandInput).trim();
    if (!rawCmd || agentStatus === 'working') return;
    if (!preset) setCommandInput('');
    setVoiceError(null);

    const execId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const initialExec: WorkCommandExecution = {
      id: execId,
      agentId: activeAgent.id,
      command: rawCmd,
      source: 'work_workspace',
      createdAt: Date.now(),
      status: 'running',
      steps: [
        createStep(
          'understanding',
          'Understanding Command',
          `Parsing "${rawCmd}" for Agent ${activeAgent.id}`
        ),
      ],
    };

    const startingList = [initialExec, ...executionsRef.current];
    commitExecutions(startingList);
    setSelectedExecutionId(execId);
    setAgentStatus('working');

    try {
      // Brief planning transition so live stages remain transparent and legible
      await new Promise((r) => window.setTimeout(r, 200));
      updateExecutionById(execId, (prev) => ({
        ...prev,
        steps: [
          ...prev.steps,
          createStep(
            'planning',
            'Planning Task',
            'Identifying target app or action and verifying supported web capabilities'
          ),
        ],
      }));

      const result = await WorkAgentService.executeCommand({
        agentId: activeAgent.id,
        command: rawCmd,
        history: agentExecutions,
        requestedModel: selectedModel,
      });

      if (!result.success) {
        const errorDetails: WorkErrorDetails = {
          code: result.errorCode || 'EXECUTION_FAILED',
          stage: result.errorStage || 'Execution Planning',
          reason: result.error || 'Command could not be processed by the WORK agent.',
          suggestion:
            result.suggestion ||
            'Check your command wording or try a direct action such as "Open ChatGPT" or "Search ...".',
          httpStatus: result.httpStatus,
          technicalDetail: result.technicalDetail,
        };

        updateExecutionById(execId, (prev) => ({
          ...prev,
          status: 'failed',
          resultText: errorDetails.reason,
          errorDetails,
          steps: [
            ...prev.steps,
            createStep(
              'failed',
              `Task Failed · ${errorDetails.code}`,
              errorDetails.reason,
              errorDetails
            ),
          ],
        }));
        setAgentStatus('idle');
        return;
      }

      // Case 1: Unsupported device / OS-level command -> honest Task Failed with capability diagnostics
      if (!result.isSupported || result.actionType === 'unsupported_device_action') {
        const reason =
          result.unsupportedReason ||
          'This action requires native OS permissions outside browser capabilities.';
        const errorDetails: WorkErrorDetails = {
          code: result.errorCode || 'UNSUPPORTED_DEVICE_CAPABILITY',
          stage: result.errorStage || 'Capability Verification',
          reason,
          suggestion:
            result.alternativeSuggestion ||
            'Perform this toggle manually from your device Quick Settings or use an equivalent web app.',
          technicalDetail: `Command="${rawCmd}" mapped to target "${result.targetAppOrSite || 'Native OS'}" which is outside web runtime permissions.`,
        };

        updateExecutionById(execId, (prev) => ({
          ...prev,
          status: 'failed',
          interpretedIntent: result.interpretedIntent,
          targetAppOrSite: result.targetAppOrSite,
          actionType: 'unsupported_device_action',
          resultText: result.reply || reason,
          unsupportedReason: reason,
          alternativeSuggestion: result.alternativeSuggestion,
          errorDetails,
          steps: [
            ...prev.steps,
            createStep(
              'failed',
              `Blocked · ${errorDetails.code}`,
              reason,
              errorDetails
            ),
          ],
        }));
        setAgentStatus('idle');
        return;
      }

      // Case 2: External URL requiring user authorization ("Open ChatGPT", "Open YouTube", etc.)
      const needsApproval =
        activeAgent.requirePermissionForExternal &&
        (result.actionType === 'open_url' || Boolean(result.requiresPermission));

      if (needsApproval) {
        updateExecutionById(execId, (prev) => ({
          ...prev,
          status: 'waiting_permission',
          interpretedIntent: result.interpretedIntent,
          targetAppOrSite: result.targetAppOrSite,
          actionType: result.actionType,
          actionLabel: result.actionLabel,
          url: result.url,
          resultText: result.reply,
          steps: [
            ...prev.steps,
            createStep(
              'waiting_permission',
              'Waiting for Permission',
              `Requesting user approval to ${result.actionLabel || `open ${result.targetAppOrSite}`}`
            ),
          ],
        }));
        setAgentStatus('active');
        return;
      }

      // Case 3: Search web / chat reply / internal NOVA navigation
      updateExecutionById(execId, (prev) => ({
        ...prev,
        status: 'running',
        interpretedIntent: result.interpretedIntent,
        targetAppOrSite: result.targetAppOrSite,
        actionType: result.actionType,
        actionLabel: result.actionLabel,
        url: result.url,
        targetView: result.targetView,
        resultText: result.reply,
        groundingSources: result.groundingSources,
        steps: [
          ...prev.steps,
          createStep(
            'executing',
            'Executing Action',
            result.actionType === 'navigate_app'
              ? `Navigating to NOVA ${result.targetView}`
              : `Running ${result.targetAppOrSite || 'task'}`
          ),
        ],
      }));

      await new Promise((r) => window.setTimeout(r, 180));

      updateExecutionById(execId, (prev) => ({
        ...prev,
        status: 'completed',
        steps: [
          ...prev.steps,
          createStep(
            'completed',
            'Task Completed',
            result.actionType === 'search_web'
              ? `Retrieved web search action for "${result.query || rawCmd}"`
              : `Completed ${result.targetAppOrSite || 'request'}`
          ),
        ],
      }));
      setAgentStatus('active');

      if (result.actionType === 'navigate_app' && result.targetView) {
        window.setTimeout(() => {
          onNavigateAppView(result.targetView!);
        }, 350);
      }
    } catch (unexpectedErr: any) {
      const errorDetails: WorkErrorDetails = {
        code: 'UNEXPECTED_CLIENT_ERROR',
        stage: 'Workspace Execution',
        reason: unexpectedErr?.message || 'An unexpected runtime error interrupted execution.',
        suggestion: 'Click Retry Command to run the task again.',
        technicalDetail: unexpectedErr?.stack ? String(unexpectedErr.stack).slice(0, 260) : String(unexpectedErr),
      };
      updateExecutionById(execId, (prev) => ({
        ...prev,
        status: 'failed',
        resultText: errorDetails.reason,
        errorDetails,
        steps: [
          ...prev.steps,
          createStep('failed', `Task Failed · ${errorDetails.code}`, errorDetails.reason, errorDetails),
        ],
      }));
      setAgentStatus('idle');
    }
  };

  // Called when user clicks real <a target="_blank" rel="noopener noreferrer"> Approve & Open button
  const handleApproveExternalLaunch = (exec: WorkCommandExecution) => {
    setAgentStatus('working');
    updateExecutionById(exec.id, (prev) => ({
      ...prev,
      status: 'completed',
      steps: [
        ...prev.steps,
        createStep(
          'executing',
          'Executing Action',
          `Launching ${exec.targetAppOrSite || exec.url} via authorized browser tab`
        ),
        createStep(
          'completed',
          'Task Completed',
          `Opened ${exec.targetAppOrSite || exec.url}`
        ),
      ],
    }));
    setAgentStatus('active');
  };

  const handleDenyPermission = (exec: WorkCommandExecution) => {
    const errorDetails: WorkErrorDetails = {
      code: 'PERMISSION_DENIED',
      stage: 'Waiting for Permission',
      reason: 'Authorization declined by user. External action was blocked before opening.',
      suggestion: 'Click Retry Command and approve the launch prompt if you wish to open this target.',
      technicalDetail: `User denied external browser launch for ${exec.targetAppOrSite || exec.url || 'target'}.`,
    };
    updateExecutionById(exec.id, (prev) => ({
      ...prev,
      status: 'failed',
      unsupportedReason: 'Action cancelled: user denied permission.',
      errorDetails,
      steps: [
        ...prev.steps,
        createStep(
          'failed',
          'Task Cancelled · PERMISSION_DENIED',
          errorDetails.reason,
          errorDetails
        ),
      ],
    }));
    setAgentStatus('idle');
  };

  const mapMicError = (errCode: string): string => {
    const code = errCode.toLowerCase();
    if (code.includes('insecure-context')) {
      return 'Microphone access requires a secure HTTPS connection or localhost.';
    }
    if (code.includes('not-allowed') || code.includes('permission') || code.includes('denied')) {
      return 'Microphone permission denied. Allow microphone access in your browser settings to use voice commands.';
    }
    if (code.includes('not-supported')) {
      return 'Microphone recording is not supported in this browser.';
    }
    if (code.includes('audio-capture')) {
      return 'No microphone was detected. Connect a microphone or type your command directly.';
    }
    return 'Microphone unavailable. Please try again or type your command directly.';
  };

  // Voice capture for WORK workspace
  const startFallbackRecording = async () => {
    if (!voiceService.isAudioRecordingSupported()) {
      setVoiceError('Microphone recording is not supported in this browser.');
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
        const captured = (liveTranscriptRef.current || commandInput).trim();
        liveTranscriptRef.current = '';
        voiceService.stopListening();
        setIsListening(false);
        setListenMode('none');
        if (captured) {
          setCommandInput('');
          void handleRunCommand(undefined, captured);
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
            setVoiceError('Recording was too short. Tap the mic, speak your command, then tap again.');
            return;
          }
          const transcribed = await transcribeAudio(recording.audioBase64, recording.mimeType);
          if (transcribed.success && transcribed.text?.trim()) {
            void handleRunCommand(undefined, transcribed.text.trim());
          } else {
            setVoiceError(transcribed.error || 'Could not transcribe audio. Please speak clearly and try again.');
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

    if (voiceService.isSpeechRecognitionSupported()) {
      liveTranscriptRef.current = '';
      const started = voiceService.startListening({
        onStart: () => {
          setIsListening(true);
          setListenMode('speech');
        },
        onResult: (transcript: string, isFinal: boolean) => {
          liveTranscriptRef.current = transcript;
          setCommandInput(transcript);
          if (isFinal && transcript.trim()) {
            liveTranscriptRef.current = '';
            voiceService.stopListening();
            setIsListening(false);
            setListenMode('none');
            setCommandInput('');
            void handleRunCommand(undefined, transcript.trim());
          }
        },
        onError: (errCode) => {
          if (errCode === 'no-speech') {
            liveTranscriptRef.current = '';
            setIsListening(false);
            setListenMode('none');
            setVoiceError('No speech detected. Tap the mic again and speak clearly.');
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
            setCommandInput('');
            void handleRunCommand(undefined, leftover);
          }
        },
      });
      if (started) return;
    }

    await startFallbackRecording();
  };

  const statusMeta: Record<
    WorkAgentStatus,
    { label: string; colorClass: string; ringClass: string }
  > = {
    active: {
      label: 'Active',
      colorClass: 'text-emerald-300 border-emerald-500/40 bg-emerald-950/50',
      ringClass: 'bg-emerald-400',
    },
    working: {
      label: 'Working',
      colorClass: 'text-blue-200 border-blue-400/50 bg-blue-950/70',
      ringClass: 'bg-blue-400 animate-ping',
    },
    idle: {
      label: 'Idle',
      colorClass: 'text-slate-300 border-blue-800/60 bg-[#0D1429]',
      ringClass: 'bg-slate-400',
    },
  };

  const activeMeta = statusMeta[agentStatus];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#050814] text-slate-100 overflow-hidden">
      {/* Subtle Architectural Blue Backdrop */}
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.20),_transparent_55%)]"
        aria-hidden="true"
      />

      {/* TOP CONTROL BAR */}
      <header className="relative z-20 h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 border-b border-blue-900/50 bg-[#070C1B]/85 backdrop-blur-xl shrink-0">
        {/* Left: WORK Logo + Agent ID */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={onExitWork}
            className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-xl border border-blue-800/50 bg-[#0B1226] hover:bg-blue-950/70 text-xs font-medium text-blue-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Return to NOVA Chat"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">NOVA</span>
          </button>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-600/30">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-base sm:text-lg tracking-tight text-white">
              WORK
            </span>
          </div>

          <span className="text-blue-800/80 hidden sm:inline" aria-hidden="true">
            /
          </span>

          {/* Agent ID Indicator / Switcher */}
          <div className="flex items-center gap-2 min-w-0">
            {agents.length > 1 ? (
              <select
                value={activeAgent.id}
                onChange={(e) => {
                  onSelectAgent(e.target.value);
                  setSelectedExecutionId(null);
                  setAgentStatus('idle');
                }}
                aria-label="Select active WORK Agent"
                className="px-3 py-1.5 rounded-xl bg-[#0C142B] border border-blue-700/50 text-xs font-mono font-bold text-blue-200 focus:outline-none focus:border-blue-400 cursor-pointer tabular-nums"
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    AGENT {a.id}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-mono text-xs sm:text-sm font-bold tracking-wide text-blue-200 tabular-nums whitespace-nowrap">
                AGENT {activeAgent.id}
              </span>
            )}
          </div>
        </div>

        {/* Right: Live Status + Activity Indicator + Settings */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Real Agent Activity & Status Indicator */}
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap ${activeMeta.colorClass}`}
          >
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              {agentStatus === 'working' && (
                <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${activeMeta.ringClass}`} />
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  agentStatus === 'active'
                    ? 'bg-emerald-400'
                    : agentStatus === 'working'
                    ? 'bg-blue-400'
                    : 'bg-slate-400'
                }`}
              />
            </span>
            <span>{activeMeta.label}</span>
          </div>

          {/* WORK Settings Trigger */}
          <button
            type="button"
            onClick={() => setIsSettingsDrawerOpen(true)}
            className="w-10 h-10 rounded-xl bg-[#0C142B] hover:bg-blue-950/80 border border-blue-800/50 text-blue-200 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="WORK Agent Settings"
            title="WORK Agent Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN FULL-SCREEN WORKSPACE BODY */}
      <main className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Welcome Hero & Command Input Panel */}
          <section className="rounded-3xl bg-[#0A1022]/85 backdrop-blur-xl border border-blue-700/40 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-1.5">
                <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight text-white">
                  Hello! I&apos;m Agent {activeAgent.id}.
                </h1>
                <p className="text-sm sm:text-base text-blue-100/75">
                  Give me a command. I&apos;ll handle the task.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400 tabular-nums">
                <span>Agent ID: {activeAgent.id}</span>
                <span aria-hidden="true">·</span>
                <span>
                  ENABLE KEY:{' '}
                  <strong
                    className={
                      agentKeyConfig?.status === 'active' ? 'text-emerald-400' : 'text-slate-300'
                    }
                  >
                    {agentKeyConfig?.status === 'active' ? 'Connected' : 'Not Linked'}
                  </strong>
                </span>
              </div>
            </div>

            {/* Large Futuristic Command Input */}
            <form onSubmit={(e) => handleRunCommand(e)} className="space-y-3">
              <div className="flex items-center gap-2.5 p-2 rounded-2xl bg-[#060A16] border border-blue-700/50 focus-within:border-blue-400 transition-colors shadow-inner">
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  disabled={agentStatus === 'working' || isTranscribing}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:opacity-50 ${
                    isListening
                      ? 'bg-rose-600 text-white'
                      : 'bg-[#0D1633] hover:bg-blue-900/70 text-blue-300 border border-blue-700/40'
                  }`}
                  title={
                    isTranscribing
                      ? 'Transcribing audio...'
                      : isListening
                      ? 'Stop Voice Command'
                      : 'Speak Command'
                  }
                  aria-label={
                    isTranscribing
                      ? 'Transcribing audio'
                      : isListening
                      ? 'Stop Voice Command'
                      : 'Speak Command'
                  }
                >
                  {isTranscribing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isListening ? (
                    <MicOff className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  disabled={agentStatus === 'working' || isTranscribing}
                  placeholder={
                    isTranscribing
                      ? 'Transcribing your voice command...'
                      : isListening
                      ? 'Listening for voice command...'
                      : `Tell Agent ${activeAgent.id} what to do (e.g. "Open ChatGPT", "Open YouTube", "Open Nova AI settings")...`
                  }
                  className="flex-1 min-w-0 bg-transparent px-2 py-2.5 text-sm sm:text-base text-white placeholder:text-slate-500 focus:outline-none disabled:opacity-60"
                />

                <button
                  type="submit"
                  disabled={!commandInput.trim() || agentStatus === 'working' || isTranscribing}
                  className="min-h-[46px] px-5 sm:px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  {agentStatus === 'working' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>Send</span>
                </button>
              </div>

              {voiceError && (
                <p className="text-xs text-rose-400 px-1">{voiceError}</p>
              )}

              {/* Natural-Language Quick Command Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {SUGGESTED_COMMANDS.map((cmd) => (
                  <button
                    key={cmd}
                    type="button"
                    disabled={agentStatus === 'working'}
                    onClick={() => handleRunCommand(undefined, cmd)}
                    className="px-3 py-1.5 rounded-xl bg-[#0D152B] hover:bg-blue-900/50 border border-blue-800/50 text-xs font-medium text-blue-100 transition-colors cursor-pointer disabled:opacity-45 whitespace-nowrap"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </form>
          </section>

          {/* 2-COLUMN WORKSPACE: LIVE TASK ACTIVITY PANEL (LEFT) + COMMAND HISTORY (RIGHT) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* TASK ACTIVITY PANEL */}
            <section className="lg:col-span-7 rounded-3xl bg-[#0A1022]/85 backdrop-blur-xl border border-blue-800/45 overflow-hidden">
              <div className="px-6 py-4 border-b border-blue-900/50 bg-[#080D1D] flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display font-bold text-base text-white">
                    Live Agent Activity
                  </h2>
                  <p className="text-xs text-slate-400">
                    Real-time task breakdown, permission checks, and execution result
                  </p>
                </div>

                {currentExecution && (
                  <span className="text-xs font-mono tabular-nums text-blue-300">
                    {formatTime(currentExecution.createdAt)}
                  </span>
                )}
              </div>

              {!currentExecution ? (
                <div className="p-10 text-center space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-[#0E1836] border border-blue-800/50 flex items-center justify-center text-blue-400">
                    <Cpu className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">
                    No active task yet
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Enter or speak a command above—such as &ldquo;Open ChatGPT&rdquo; or &ldquo;Search for latest AI breakthroughs&rdquo;—to watch Agent {activeAgent.id} plan and execute it live.
                  </p>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {/* Command Summary Header */}
                  <div className="p-4 rounded-2xl bg-[#060A16] border border-blue-900/50 space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                      <span>Command</span>
                      <span
                        className={`font-semibold ${
                          currentExecution.status === 'completed'
                            ? 'text-emerald-400'
                            : currentExecution.status === 'failed'
                            ? 'text-rose-400'
                            : currentExecution.status === 'waiting_permission'
                            ? 'text-amber-300'
                            : 'text-blue-300'
                        }`}
                      >
                        {currentExecution.status === 'completed'
                          ? 'Task Completed'
                          : currentExecution.status === 'failed'
                          ? 'Task Failed'
                          : currentExecution.status === 'waiting_permission'
                          ? 'Waiting for Permission'
                          : 'Running'}
                      </span>
                    </div>

                    <div className="text-sm sm:text-base font-semibold text-white">
                      &ldquo;{currentExecution.command}&rdquo;
                    </div>

                    {currentExecution.targetAppOrSite && (
                      <div className="flex items-center gap-2 text-xs text-blue-200/80 pt-1">
                        <span>Target: {currentExecution.targetAppOrSite}</span>
                        {currentExecution.interpretedIntent && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate">{currentExecution.interpretedIntent}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Interactive Permission Request Card (when Waiting for Permission) */}
                  {currentExecution.status === 'waiting_permission' && (
                    <div className="p-5 rounded-2xl bg-blue-950/35 border border-blue-500/45 space-y-4">
                      <div className="flex items-start gap-3">
                        <ShieldAlert className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h3 className="text-sm font-bold text-white">
                            Permission Required
                          </h3>
                          <p className="text-xs text-blue-100/85 leading-relaxed">
                            Agent {activeAgent.id} identified{' '}
                            <strong>{currentExecution.targetAppOrSite}</strong>
                            {currentExecution.url ? ` (${currentExecution.url})` : ''}. Approve below to launch it in a new browser tab.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        {currentExecution.url && (
                          <a
                            href={currentExecution.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => handleApproveExternalLaunch(currentExecution)}
                            className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-blue-600/25 transition-all whitespace-nowrap"
                          >
                            <span>Approve &amp; {currentExecution.actionLabel || 'Open Link'}</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDenyPermission(currentExecution)}
                          className="inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 rounded-xl border border-rose-500/40 bg-rose-950/30 hover:bg-rose-950/60 text-rose-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Deny</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Activity Timeline with Timestamps & Detailed Error Diagnostics */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-300">
                        Activity Timeline
                      </span>
                      {currentExecution.status === 'failed' && (
                        <button
                          type="button"
                          onClick={() => void handleRunCommand(undefined, currentExecution.command)}
                          disabled={agentStatus === 'working'}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/40 text-[11px] font-semibold text-blue-200 transition-colors cursor-pointer disabled:opacity-45"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Retry Command</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      {currentExecution.steps.map((step) => {
                        const isDone = step.stage === 'completed';
                        const isFail = step.stage === 'failed';
                        const isWait = step.stage === 'waiting_permission';
                        const errInfo = step.errorDetails;
                        const isExpanded = Boolean(expandedDiagnosticIds[step.id]);

                        return (
                          <div
                            key={step.id}
                            className={`p-3 rounded-xl border ${
                              isFail
                                ? 'bg-rose-950/20 border-rose-500/35'
                                : 'bg-[#070B17] border-blue-900/40'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                <div className="mt-0.5 shrink-0">
                                  {isDone ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  ) : isFail ? (
                                    <XCircle className="w-4 h-4 text-rose-400" />
                                  ) : isWait ? (
                                    <Clock className="w-4 h-4 text-amber-300" />
                                  ) : (
                                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-semibold text-white">
                                      {step.label}
                                    </span>
                                    {errInfo?.httpStatus && (
                                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/30 text-[10px] font-mono text-rose-200">
                                        HTTP {errInfo.httpStatus}
                                      </span>
                                    )}
                                  </div>

                                  {step.detail && (
                                    <p
                                      className={`text-[11px] mt-0.5 leading-relaxed ${
                                        isFail ? 'text-rose-200/90' : 'text-slate-400'
                                      }`}
                                    >
                                      {step.detail}
                                    </p>
                                  )}

                                  {errInfo && (
                                    <div className="mt-2.5 pt-2 border-t border-rose-500/20 space-y-1.5 text-[11px]">
                                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-rose-300/90">
                                        <span>
                                          Blocked Stage:{' '}
                                          <strong className="text-rose-200">{errInfo.stage}</strong>
                                        </span>
                                        <span>
                                          Code:{' '}
                                          <code className="font-mono text-rose-200">{errInfo.code}</code>
                                        </span>
                                      </div>

                                      {errInfo.suggestion && (
                                        <p className="text-blue-200/85 leading-relaxed">
                                          <strong className="text-blue-200">Suggested Fix:</strong>{' '}
                                          {errInfo.suggestion}
                                        </p>
                                      )}

                                      {errInfo.technicalDetail && (
                                        <div>
                                          <button
                                            type="button"
                                            onClick={() => toggleDiagnosticLog(step.id)}
                                            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-300 hover:text-white cursor-pointer"
                                          >
                                            <AlertTriangle className="w-3 h-3 text-amber-300" />
                                            <span>{isExpanded ? 'Hide Technical Log' : 'View Technical Log'}</span>
                                            {isExpanded ? (
                                              <ChevronUp className="w-3 h-3" />
                                            ) : (
                                              <ChevronDown className="w-3 h-3" />
                                            )}
                                          </button>

                                          {isExpanded && (
                                            <pre className="mt-1.5 p-2.5 rounded-lg bg-[#050814] border border-rose-500/25 text-[10px] font-mono text-rose-200/85 whitespace-pre-wrap break-all leading-relaxed">
                                              {`[${formatTime(step.timestamp)}] Stage: ${errInfo.stage}\nCode: ${errInfo.code}${errInfo.httpStatus ? ` (HTTP ${errInfo.httpStatus})` : ''}\nDetail: ${errInfo.technicalDetail}`}
                                            </pre>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <span className="text-[11px] font-mono tabular-nums text-slate-500 shrink-0">
                                {formatTime(step.timestamp)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Execution Output / Verified Links / Honest Alternative */}
                  {(currentExecution.resultText ||
                    currentExecution.unsupportedReason ||
                    currentExecution.groundingSources?.length) && (
                    <div className="p-4 rounded-2xl bg-[#070B17] border border-blue-800/40 space-y-3">
                      {currentExecution.resultText && (
                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {currentExecution.resultText}
                        </p>
                      )}

                      {currentExecution.unsupportedReason && (
                        <div className="space-y-1.5 text-xs">
                          <div className="font-semibold text-rose-300">
                            Why this could not be executed: {currentExecution.unsupportedReason}
                          </div>
                          {currentExecution.alternativeSuggestion && (
                            <p className="text-blue-200/80">
                              Alternative: {currentExecution.alternativeSuggestion}
                            </p>
                          )}
                        </div>
                      )}

                      {currentExecution.status === 'completed' && currentExecution.url && (
                        <div className="pt-1 flex flex-wrap gap-2">
                          <a
                            href={currentExecution.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
                          >
                            <span>{currentExecution.actionLabel || 'Open Target'}</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}

                      {currentExecution.groundingSources &&
                        currentExecution.groundingSources.length > 0 && (
                          <div className="pt-2 border-t border-blue-900/40 space-y-1.5">
                            <div className="text-[11px] font-semibold text-slate-400">
                              Verified Web Sources
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {currentExecution.groundingSources.slice(0, 4).map((src, i) => (
                                <a
                                  key={i}
                                  href={src.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0D152B] hover:bg-blue-900/50 border border-blue-800/50 text-[11px] text-blue-200 transition-colors"
                                >
                                  <Globe className="w-3 h-3 shrink-0" />
                                  <span className="truncate max-w-[180px]">{src.title}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* COMMAND HISTORY PANEL */}
            <section className="lg:col-span-5 rounded-3xl bg-[#0A1022]/85 backdrop-blur-xl border border-blue-800/45 overflow-hidden">
              <div className="px-5 py-4 border-b border-blue-900/50 bg-[#080D1D] flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display font-bold text-base text-white">
                    Command History
                  </h2>
                  <p className="text-xs text-slate-400 tabular-nums">
                    {agentExecutions.length} recorded for Agent {activeAgent.id}
                  </p>
                </div>

                {agentExecutions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const remaining = executionsRef.current.filter((ex) => ex.agentId !== activeAgent.id);
                      commitExecutions(remaining);
                      setSelectedExecutionId(null);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-[11px] font-medium text-slate-300 hover:text-rose-200 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              <div className="max-h-[460px] overflow-y-auto divide-y divide-blue-900/35">
                {agentExecutions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Your executed commands for Agent {activeAgent.id} will appear here.
                  </div>
                ) : (
                  agentExecutions.map((item) => {
                    const isSelected = currentExecution?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedExecutionId(item.id)}
                        className={`p-4 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-950/45'
                            : 'hover:bg-[#0D152B]/70'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 space-y-1">
                            <div className="text-xs font-semibold text-white truncate">
                              {item.command}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 tabular-nums">
                              <span>{item.targetAppOrSite || 'Command'}</span>
                              <span aria-hidden="true">·</span>
                              <span>{formatTime(item.createdAt)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`text-[11px] font-semibold ${
                                item.status === 'completed'
                                  ? 'text-emerald-400'
                                  : item.status === 'failed'
                                  ? 'text-rose-400'
                                  : item.status === 'waiting_permission'
                                  ? 'text-amber-300'
                                  : 'text-blue-300'
                              }`}
                            >
                              {item.status === 'completed'
                                ? 'Done'
                                : item.status === 'failed'
                                ? 'Failed'
                                : item.status === 'waiting_permission'
                                ? 'Approval'
                                : 'Active'}
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleRunCommand(undefined, item.command);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-300 hover:bg-blue-900/40 cursor-pointer"
                              title="Re-run command"
                              aria-label="Re-run command"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* WORK AGENT SETTINGS DRAWER MODAL */}
      {isSettingsDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-[#0A1022] border border-blue-700/50 shadow-2xl overflow-hidden text-slate-100">
            <div className="px-6 py-4 border-b border-blue-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Cpu className="w-5 h-5 text-blue-400" />
                <h2 className="font-display font-bold text-base text-white">
                  WORK Settings · AGENT {activeAgent.id}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-blue-900/40 cursor-pointer"
                aria-label="Close settings"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {/* Approval Requirement Toggle */}
              <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[#070B17] border border-blue-900/45">
                <div>
                  <div className="font-semibold text-white">
                    Require Permission Prompt
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Pause at Waiting for Permission before opening external apps &amp; websites
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateAgentProfile({
                      ...activeAgent,
                      requirePermissionForExternal: !activeAgent.requirePermissionForExternal,
                    })
                  }
                  className={`px-3 py-1.5 rounded-xl font-semibold border transition-colors cursor-pointer shrink-0 ${
                    activeAgent.requirePermissionForExternal
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {activeAgent.requirePermissionForExternal ? 'On' : 'Off'}
                </button>
              </div>

              {/* Create Additional Numbered Agent */}
              <div className="p-4 rounded-2xl bg-[#070B17] border border-blue-900/45 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">Create New Numbered Agent</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Next assigned ID: AGENT {WorkAgentService.getNextNumericAgentId(agents)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsDrawerOpen(false);
                      onCreateNewAgent();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Agent</span>
                  </button>
                </div>
              </div>

              {/* Manage ENABLE KEY Quick Access */}
              <div className="p-4 rounded-2xl bg-[#070B17] border border-blue-900/45 flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-white">ENABLE KEY &amp; Quick Access</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Configure Agent {activeAgent.id} access key &amp; floating launcher
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsDrawerOpen(false);
                    onNavigateAppView('enables');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#111B3D] hover:bg-blue-900/60 border border-blue-700/50 text-blue-200 font-semibold transition-colors cursor-pointer whitespace-nowrap"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Enables</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

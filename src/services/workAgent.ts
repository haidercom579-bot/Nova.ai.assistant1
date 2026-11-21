import {
  AgentActionType,
  GroundingSource,
  WorkAgentProfile,
  WorkCommandExecution,
} from '../types';

const KEYS = {
  AGENTS: 'nova_work_agents_v1',
  ACTIVE_AGENT_ID: 'nova_work_active_agent_id_v1',
  EXECUTIONS: 'nova_work_executions_v1',
};

export interface WorkExecuteApiResult {
  success: boolean;
  agentId?: string;
  interpretedIntent?: string;
  targetAppOrSite?: string;
  actionType?: AgentActionType;
  isSupported?: boolean;
  requiresPermission?: boolean;
  actionLabel?: string;
  url?: string;
  targetView?: 'chat' | 'settings' | 'pricing' | 'voice' | 'enables' | 'cart';
  query?: string;
  reply?: string;
  groundingSources?: GroundingSource[];
  unsupportedReason?: string;
  alternativeSuggestion?: string;
  error?: string;
  errorCode?: string;
  errorStage?: string;
  httpStatus?: number;
  technicalDetail?: string;
  suggestion?: string;
}

export const WorkAgentService = {
  getAgents(): WorkAgentProfile[] {
    try {
      const raw = localStorage.getItem(KEYS.AGENTS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveAgents(agents: WorkAgentProfile[]): void {
    try {
      localStorage.setItem(KEYS.AGENTS, JSON.stringify(agents));
    } catch (e) {
      console.error('Failed to persist WORK agents:', e);
    }
  },

  getActiveAgentId(): string | null {
    try {
      return localStorage.getItem(KEYS.ACTIVE_AGENT_ID);
    } catch {
      return null;
    }
  },

  setActiveAgentId(agentId: string | null): void {
    try {
      if (agentId) {
        localStorage.setItem(KEYS.ACTIVE_AGENT_ID, agentId);
      } else {
        localStorage.removeItem(KEYS.ACTIVE_AGENT_ID);
      }
    } catch (e) {
      console.error('Failed to persist active agent ID:', e);
    }
  },

  getNextNumericAgentId(existingAgents: WorkAgentProfile[]): string {
    const numericIds = existingAgents
      .map((a) => parseInt(a.id, 10))
      .filter((n) => !Number.isNaN(n) && n >= 101);
    if (numericIds.length === 0) return '101';
    const maxId = Math.max(...numericIds);
    return String(maxId + 1);
  },

  createAgent(existingAgents: WorkAgentProfile[]): WorkAgentProfile {
    const id = this.getNextNumericAgentId(existingAgents);
    const now = Date.now();
    return {
      id,
      name: `AGENT ${id}`,
      createdAt: now,
      termsAcceptedAt: now,
      requirePermissionForExternal: true,
    };
  },

  getExecutions(): WorkCommandExecution[] {
    try {
      const raw = localStorage.getItem(KEYS.EXECUTIONS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveExecutions(executions: WorkCommandExecution[]): void {
    try {
      localStorage.setItem(KEYS.EXECUTIONS, JSON.stringify(executions.slice(0, 80)));
    } catch (e) {
      console.error('Failed to persist WORK command history:', e);
    }
  },

  async executeCommand(params: {
    agentId: string;
    command: string;
    history: WorkCommandExecution[];
    requestedModel: string;
  }): Promise<WorkExecuteApiResult> {
    const trimmedCmd = params.command.trim();
    if (!trimmedCmd) {
      return {
        success: false,
        error: 'Command is empty. Enter or speak an instruction before sending.',
        errorCode: 'EMPTY_COMMAND',
        errorStage: 'Understanding Command',
        suggestion: 'Type a command such as "Open ChatGPT" or "Search for AI news".',
      };
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 16000);

    try {
      const res = await fetch('/api/work/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          agentId: params.agentId,
          command: trimmedCmd,
          history: params.history.slice(0, 8).map((h) => ({
            command: h.command,
            status: h.status,
            targetAppOrSite: h.targetAppOrSite,
            actionType: h.actionType,
          })),
          requestedModel: params.requestedModel,
        }),
      });

      const rawText = await res.text();
      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        return {
          success: false,
          error: `WORK server returned an invalid response (HTTP ${res.status}).`,
          errorCode: 'INVALID_SERVER_RESPONSE',
          errorStage: 'Server Communication',
          httpStatus: res.status,
          technicalDetail: rawText.slice(0, 240) || 'Empty or non-JSON response body',
          suggestion: 'Retry the command in a moment. If the issue persists, verify the backend server is running.',
        };
      }

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'WORK Agent could not process the command.',
          errorCode: data.errorCode || `HTTP_${res.status || 500}`,
          errorStage: data.errorStage || 'Execution Planning',
          httpStatus: data.httpStatus ?? (res.ok ? undefined : res.status),
          technicalDetail: data.technicalDetail,
          suggestion:
            data.suggestion ||
            'Try rephrasing your command or use direct commands like "Open ChatGPT", "Open YouTube", or "Search ...".',
        };
      }

      return data as WorkExecuteApiResult;
    } catch (e: any) {
      const isAbort = e?.name === 'AbortError';
      return {
        success: false,
        error: isAbort
          ? 'WORK Agent timed out while waiting for a response (16s).'
          : e?.message || 'Network error while reaching WORK Agent.',
        errorCode: isAbort ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR',
        errorStage: 'Server Connection',
        technicalDetail: e?.message || 'Fetch failed before reaching /api/work/execute',
        suggestion: isAbort
          ? 'The AI planner took too long to respond. Click Retry or try a direct command like "Open ChatGPT".'
          : 'Check that your connection and NOVA server are online, then retry.',
      };
    } finally {
      window.clearTimeout(timeoutId);
    }
  },
};

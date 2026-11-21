import { AgentAction, AgentKeyConfig, WorkAgentMessage } from '../types';

const KEYS = {
  AGENT_CONFIG: 'nova_enable_key_config_v1',
  WORK_MESSAGES: 'nova_work_agent_messages_v1',
};

export const EnableKeyService = {
  getConfig(): AgentKeyConfig | null {
    try {
      const raw = localStorage.getItem(KEYS.AGENT_CONFIG);
      if (!raw) return null;
      return JSON.parse(raw) as AgentKeyConfig;
    } catch {
      return null;
    }
  },

  saveConfig(config: AgentKeyConfig | null): void {
    try {
      if (config) {
        localStorage.setItem(KEYS.AGENT_CONFIG, JSON.stringify(config));
      } else {
        localStorage.removeItem(KEYS.AGENT_CONFIG);
      }
    } catch (e) {
      console.error('Failed to persist Enable Key config:', e);
    }
  },

  getWorkMessages(): WorkAgentMessage[] {
    try {
      const raw = localStorage.getItem(KEYS.WORK_MESSAGES);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveWorkMessages(messages: WorkAgentMessage[]): void {
    try {
      localStorage.setItem(KEYS.WORK_MESSAGES, JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to persist WORK agent messages:', e);
    }
  },

  async generateKey(agentId: string = '101'): Promise<{
    success: boolean;
    config?: AgentKeyConfig;
    error?: string;
  }> {
    try {
      const res = await fetch('/api/agent/key/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      });
      const data = await res.json();
      if (!data.success || !data.accessKey) {
        return { success: false, error: data.error || 'Failed to generate access key.' };
      }

      const config: AgentKeyConfig = {
        agentId: data.agentId || agentId,
        accessKey: data.accessKey,
        maskedKey: data.maskedKey,
        status: data.status || 'active',
        quickAccessEnabled: Boolean(data.quickAccessEnabled),
        floatingIconEnabled: Boolean(data.floatingIconEnabled),
        createdAt: data.createdAt || Date.now(),
      };
      this.saveConfig(config);
      return { success: true, config };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Network error generating key.' };
    }
  },

  async updateKeyStatus(params: {
    config: AgentKeyConfig;
    status?: 'active' | 'inactive';
    quickAccessEnabled?: boolean;
    floatingIconEnabled?: boolean;
  }): Promise<{ success: boolean; config?: AgentKeyConfig; error?: string }> {
    const { config, status, quickAccessEnabled, floatingIconEnabled } = params;
    try {
      const res = await fetch('/api/agent/key/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.accessKey}`,
        },
        body: JSON.stringify({
          agentId: config.agentId,
          status,
          quickAccessEnabled,
          floatingIconEnabled,
        }),
      });
      const data = await res.json();

      // If server restarted in memory/tmp, re-sync cleanly only if unauthorized is due to cold start?
      // Respect real verification: surface error if invalid
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Could not update key status.' };
      }

      const nextConfig: AgentKeyConfig = {
        ...config,
        status: data.status ?? config.status,
        quickAccessEnabled: data.quickAccessEnabled ?? config.quickAccessEnabled,
        floatingIconEnabled: data.floatingIconEnabled ?? config.floatingIconEnabled,
      };
      this.saveConfig(nextConfig);
      return { success: true, config: nextConfig };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Network error updating key status.' };
    }
  },

  async revokeKey(agentId: string = '101'): Promise<void> {
    try {
      await fetch('/api/agent/key/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      });
    } catch {
      // ignore network error on cleanup
    }
    this.saveConfig(null);
  },

  async sendCommand(params: {
    config: AgentKeyConfig;
    command: string;
    history: WorkAgentMessage[];
    requestedModel: string;
  }): Promise<{
    success: boolean;
    reply?: string;
    action?: AgentAction;
    error?: string;
  }> {
    try {
      const res = await fetch('/api/agent/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${params.config.accessKey}`,
        },
        body: JSON.stringify({
          agentId: params.config.agentId,
          command: params.command,
          history: params.history.map((m) => ({ role: m.role, content: m.content })),
          requestedModel: params.requestedModel,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'WORK Agent rejected the command.',
        };
      }
      return {
        success: true,
        reply: data.reply,
        action: data.action,
      };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || 'Failed to reach WORK Agent.',
      };
    }
  },
};

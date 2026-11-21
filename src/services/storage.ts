import { Conversation, AppSettings } from '../types';

const STORAGE_KEYS = {
  CONVERSATIONS: 'nova_conversations_v1',
  ACTIVE_ID: 'nova_active_conversation_id_v1',
  SETTINGS: 'nova_settings_v1',
};

const VALID_MODELS = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'] as const;

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  selectedModel: 'gemini-4-hydrogen',
  selectedPlan: 'startup',
};

export const StorageService = {
  getConversations(): Conversation[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to load conversations from storage:', e);
      return [];
    }
  },

  saveConversations(conversations: Conversation[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
    } catch (e) {
      console.error('Failed to save conversations to storage:', e);
    }
  },

  getActiveConversationId(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_ID);
    } catch (e) {
      return null;
    }
  },

  setActiveConversationId(id: string | null): void {
    try {
      if (id) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_ID, id);
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_ID);
      }
    } catch (e) {
      console.error('Failed to set active conversation ID:', e);
    }
  },

  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(data);
      const selectedModel = VALID_MODELS.includes(parsed?.selectedModel)
        ? parsed.selectedModel
        : 'gemini-4-hydrogen';
      return { ...DEFAULT_SETTINGS, ...parsed, selectedModel };
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  },

  clearAllData(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.CONVERSATIONS);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_ID);
    } catch (e) {
      console.error('Failed to clear storage:', e);
    }
  },
};

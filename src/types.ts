export type Role = 'user' | 'model';

export interface GroundingSource {
  title: string;
  url: string;
}

export interface MessageAttachment {
  name: string;
  kind: 'text' | 'image';
  mimeType: string;
  content: string; // plain text content for text files, or base64 data (without prefix) for images
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  isError?: boolean;
  groundingSources?: GroundingSource[];
  model?: string;
  attachment?: MessageAttachment;
}

export interface ConversationSummary {
  text: string;
  updatedAt: number;
  model?: string;
  messageCount?: number;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  summary?: ConversationSummary;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export type GeminiModel = 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';

export type PlanTier = 'startup' | 'pro' | 'max';

export interface CartItem {
  plan: 'pro' | 'max';
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface AppSettings {
  theme: ThemeMode;
  selectedModel?: GeminiModel;
  selectedPlan?: PlanTier;
}

export type AppView = 'chat' | 'pricing' | 'cart' | 'enables' | 'work';

export type AgentActionType =
  | 'open_url'
  | 'search_web'
  | 'navigate_app'
  | 'chat_reply'
  | 'unsupported_device_action';

export interface AgentAction {
  type: AgentActionType;
  label: string;
  url?: string;
  targetView?: 'chat' | 'settings' | 'pricing' | 'voice' | 'enables' | 'cart' | 'work';
  query?: string;
}

export interface AgentKeyConfig {
  agentId: string;
  accessKey: string;
  maskedKey: string;
  status: 'active' | 'inactive';
  quickAccessEnabled: boolean;
  floatingIconEnabled: boolean;
  createdAt: number;
}

export interface WorkAgentMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
  source: 'dashboard' | 'quick_access';
  agentId: string;
  action?: AgentAction;
  isError?: boolean;
}

export type WorkAgentStatus = 'active' | 'idle' | 'working';

export type WorkActivityStage =
  | 'understanding'
  | 'planning'
  | 'waiting_permission'
  | 'executing'
  | 'completed'
  | 'failed';

export interface WorkErrorDetails {
  code: string;
  stage: string;
  reason: string;
  suggestion?: string;
  httpStatus?: number;
  technicalDetail?: string;
}

export interface WorkActivityStep {
  id: string;
  stage: WorkActivityStage;
  label: string;
  detail?: string;
  timestamp: number;
  errorDetails?: WorkErrorDetails;
}

export interface WorkAgentProfile {
  id: string;
  name: string;
  createdAt: number;
  termsAcceptedAt: number;
  requirePermissionForExternal: boolean;
}

export interface WorkCommandExecution {
  id: string;
  agentId: string;
  command: string;
  source: 'work_workspace' | 'quick_access' | 'enables_console';
  createdAt: number;
  status: 'running' | 'waiting_permission' | 'completed' | 'failed';
  steps: WorkActivityStep[];
  interpretedIntent?: string;
  targetAppOrSite?: string;
  actionType?: AgentActionType;
  actionLabel?: string;
  url?: string;
  targetView?: 'chat' | 'settings' | 'pricing' | 'voice' | 'enables' | 'cart';
  resultText?: string;
  groundingSources?: GroundingSource[];
  unsupportedReason?: string;
  alternativeSuggestion?: string;
  errorDetails?: WorkErrorDetails;
}


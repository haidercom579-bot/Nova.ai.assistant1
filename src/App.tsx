/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Conversation,
  Message,
  MessageAttachment,
  ThemeMode,
  GeminiModel,
  GroundingSource,
  PlanTier,
  CartItem,
  AppView,
  AgentKeyConfig,
  WorkAgentMessage,
  AgentAction,
  WorkAgentProfile,
  WorkCommandExecution,
} from './types';
import { StorageService } from './services/storage';
import { AuthService, UserProfile } from './services/auth';
import { EnableKeyService } from './services/enableKey';
import { WorkAgentService } from './services/workAgent';
import { sendChatMessage, summarizeConversation } from './services/api';
import { downloadConversationFile, ExportFormat } from './services/export';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { ChatSummaryBanner } from './components/ChatSummaryBanner';
import { PricingPage } from './components/PricingPage';
import { CartPage } from './components/CartPage';
import { EnableKeyWorkspace } from './components/EnableKeyWorkspace';
import { QuickAccessWidget } from './components/QuickAccessWidget';
import { WorkOnboarding } from './components/WorkOnboarding';
import { WorkWorkspace } from './components/WorkWorkspace';
import { SettingsModal } from './components/SettingsModal';
import { QRCodeModal } from './components/QRCodeModal';
import { VoiceModal } from './components/VoiceModal';
import { OnboardingFlow, OnboardingStep } from './components/OnboardingFlow';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    StorageService.getConversations()
  );
  const [activeId, setActiveId] = useState<string | null>(() =>
    StorageService.getActiveConversationId()
  );
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQRCodeOpen, setIsQRCodeOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [useSearchGrounding, setUseSearchGrounding] = useState(false);
  const [reasoningMode, setReasoningMode] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GeminiModel>(() =>
    StorageService.getSettings().selectedModel || 'gemini-4-hydrogen'
  );
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>(() =>
    StorageService.getSettings().selectedPlan || 'startup'
  );
  const [activeView, setActiveView] = useState<AppView>('chat');
  const [cartItem, setCartItem] = useState<CartItem | null>(null);
  const [agentKeyConfig, setAgentKeyConfig] = useState<AgentKeyConfig | null>(() =>
    EnableKeyService.getConfig()
  );
  const [workMessages, setWorkMessages] = useState<WorkAgentMessage[]>(() =>
    EnableKeyService.getWorkMessages()
  );
  const [isSendingWorkCommand, setIsSendingWorkCommand] = useState(false);
  const [agentKeyError, setAgentKeyError] = useState<string | null>(null);
  const [workAgents, setWorkAgents] = useState<WorkAgentProfile[]>(() =>
    WorkAgentService.getAgents()
  );
  const [activeWorkAgentId, setActiveWorkAgentId] = useState<string | null>(() => {
    const stored = WorkAgentService.getActiveAgentId();
    const list = WorkAgentService.getAgents();
    return stored && list.some((a) => a.id === stored) ? stored : list[0]?.id || null;
  });
  const [workExecutions, setWorkExecutions] = useState<WorkCommandExecution[]>(() =>
    WorkAgentService.getExecutions()
  );
  const [isWorkOnboardingOpen, setIsWorkOnboardingOpen] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summarizeError, setSummarizeError] = useState<string | null>(null);
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);

  // Onboarding & Auth state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() =>
    AuthService.getCurrentUser()
  );
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('splash');
  const [phoneSkipped, setPhoneSkipped] = useState(false);

  // Theme management
  const [theme, setTheme] = useState<ThemeMode>(() => StorageService.getSettings().theme);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Apply theme to DOM
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      if (theme === 'dark' || (theme === 'system' && mediaQuery.matches)) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    const listener = () => {
      if (theme === 'system') applyTheme();
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  // Persist conversations
  useEffect(() => {
    StorageService.saveConversations(conversations);
  }, [conversations]);

  // Persist active ID
  useEffect(() => {
    StorageService.setActiveConversationId(activeId);
  }, [activeId]);

  // Active conversation object
  const activeConversation = conversations.find((c) => c.id === activeId);
  const messages = activeConversation?.messages || [];

  // Scroll to bottom when messages change or loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Toggle theme between dark and light
  const handleToggleTheme = () => {
    const isDark = document.documentElement.classList.contains('dark');
    const newTheme: ThemeMode = isDark ? 'light' : 'dark';
    setTheme(newTheme);
    const current = StorageService.getSettings();
    StorageService.saveSettings({ ...current, theme: newTheme });
  };

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    const current = StorageService.getSettings();
    StorageService.saveSettings({ ...current, theme: newTheme });
  };

  const handleModelChange = (newModel: GeminiModel) => {
    setSelectedModel(newModel);
    const current = StorageService.getSettings();
    StorageService.saveSettings({ ...current, selectedModel: newModel });
  };

  const handlePlanChange = (newPlan: PlanTier) => {
    setSelectedPlan(newPlan);
    const current = StorageService.getSettings();
    StorageService.saveSettings({ ...current, selectedPlan: newPlan });
  };

  const handleAddToCart = (plan: 'pro' | 'max') => {
    setCartItem({
      plan,
      name: plan === 'max' ? 'NOVA Max' : 'NOVA Pro',
      unitPrice: 0,
      quantity: cartItem && cartItem.plan === plan ? cartItem.quantity : 1,
    });
    setActiveView('cart');
  };

  const handleUpdateCartQuantity = (quantity: number) => {
    setCartItem((prev) => (prev ? { ...prev, quantity: Math.max(1, quantity) } : null));
  };

  const handleSwitchCartPlan = (plan: 'pro' | 'max') => {
    setCartItem((prev) => ({
      plan,
      name: plan === 'max' ? 'NOVA Max' : 'NOVA Pro',
      unitPrice: 0,
      quantity: prev?.quantity || 1,
    }));
  };

  const handleRemoveFromCart = () => {
    setCartItem(null);
  };

  const handleConfirmOrder = (plan: 'pro' | 'max') => {
    handlePlanChange(plan);
    setCartItem(null);
  };

  // Persist WORK Agent #101 shared history & agents
  useEffect(() => {
    EnableKeyService.saveWorkMessages(workMessages);
  }, [workMessages]);

  useEffect(() => {
    WorkAgentService.saveAgents(workAgents);
  }, [workAgents]);

  useEffect(() => {
    WorkAgentService.setActiveAgentId(activeWorkAgentId);
  }, [activeWorkAgentId]);

  useEffect(() => {
    WorkAgentService.saveExecutions(workExecutions);
  }, [workExecutions]);

  const activeWorkAgent =
    workAgents.find((a) => a.id === activeWorkAgentId) || workAgents[0] || null;

  const handleOpenWork = () => {
    if (workAgents.length === 0) {
      setIsWorkOnboardingOpen(true);
    } else {
      setActiveView('work');
    }
  };

  const handleWorkAgentCreated = (newAgent: WorkAgentProfile) => {
    setWorkAgents((prev) => [...prev, newAgent]);
    setActiveWorkAgentId(newAgent.id);
    setIsWorkOnboardingOpen(false);
    setActiveView('work');
  };

  const handleUpdateWorkAgentProfile = (updated: WorkAgentProfile) => {
    setWorkAgents((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  // WORK Agent ENABLE KEY handlers
  const handleGenerateAgentKey = async () => {
    setAgentKeyError(null);
    const targetId = activeWorkAgent?.id || '101';
    const res = await EnableKeyService.generateKey(targetId);
    if (res.success && res.config) {
      setAgentKeyConfig(res.config);
    } else {
      setAgentKeyError(res.error || 'Could not generate access key.');
    }
  };

  const handleToggleAgentKeyActive = async () => {
    if (!agentKeyConfig) return;
    setAgentKeyError(null);
    const nextStatus = agentKeyConfig.status === 'active' ? 'inactive' : 'active';
    const res = await EnableKeyService.updateKeyStatus({
      config: agentKeyConfig,
      status: nextStatus,
    });
    if (res.success && res.config) {
      setAgentKeyConfig(res.config);
    } else {
      setAgentKeyError(res.error || 'Please regenerate your key to sync status.');
    }
  };

  const handleToggleQuickAccess = async () => {
    if (!agentKeyConfig) return;
    setAgentKeyError(null);
    const res = await EnableKeyService.updateKeyStatus({
      config: agentKeyConfig,
      quickAccessEnabled: !agentKeyConfig.quickAccessEnabled,
    });
    if (res.success && res.config) {
      setAgentKeyConfig(res.config);
    } else {
      setAgentKeyError(res.error || 'Could not update Quick Access state.');
    }
  };

  const handleToggleFloatingIcon = async () => {
    if (!agentKeyConfig) return;
    setAgentKeyError(null);
    const res = await EnableKeyService.updateKeyStatus({
      config: agentKeyConfig,
      floatingIconEnabled: !agentKeyConfig.floatingIconEnabled,
    });
    if (res.success && res.config) {
      setAgentKeyConfig(res.config);
    } else {
      setAgentKeyError(res.error || 'Could not update floating shortcut.');
    }
  };

  const handleDisableQuickAccess = async () => {
    if (!agentKeyConfig) return;
    const res = await EnableKeyService.updateKeyStatus({
      config: agentKeyConfig,
      quickAccessEnabled: false,
    });
    if (res.success && res.config) {
      setAgentKeyConfig(res.config);
    } else {
      const next = { ...agentKeyConfig, quickAccessEnabled: false };
      EnableKeyService.saveConfig(next);
      setAgentKeyConfig(next);
    }
  };

  const handleRevokeAgentKey = async () => {
    setAgentKeyError(null);
    await EnableKeyService.revokeKey(agentKeyConfig?.agentId || '101');
    setAgentKeyConfig(null);
  };

  const handleNavigateFromAgent = (targetView: NonNullable<AgentAction['targetView']>) => {
    if (targetView === 'voice') {
      if (activeView === 'work') setActiveView('chat');
      setIsVoiceModalOpen(true);
      return;
    }
    if (targetView === 'settings') {
      if (activeView === 'work') setActiveView('chat');
      setIsSettingsOpen(true);
      return;
    }
    setActiveView(targetView);
  };

  const handleSendWorkAgentCommand = async (
    command: string,
    source: 'dashboard' | 'quick_access'
  ) => {
    if (!agentKeyConfig || isSendingWorkCommand) return;
    setAgentKeyError(null);

    const userMsg: WorkAgentMessage = {
      id: `wk-${Date.now()}-u`,
      role: 'user',
      content: command,
      timestamp: Date.now(),
      source,
      agentId: agentKeyConfig.agentId,
    };

    const nextHistory = [...workMessages, userMsg];
    setWorkMessages(nextHistory);
    setIsSendingWorkCommand(true);

    try {
      const res = await EnableKeyService.sendCommand({
        config: agentKeyConfig,
        command,
        history: nextHistory,
        requestedModel: selectedModel,
      });

      const agentReply: WorkAgentMessage = {
        id: `wk-${Date.now()}-a`,
        role: 'agent',
        content: res.success
          ? res.reply || 'Command processed.'
          : res.error || 'Command rejected by WORK Agent.',
        timestamp: Date.now(),
        source,
        agentId: agentKeyConfig.agentId,
        action: res.action,
        isError: !res.success,
      };
      setWorkMessages((prev) => [...prev, agentReply]);
    } finally {
      setIsSendingWorkCommand(false);
    }
  };

  // Onboarding flow transitions: Splash -> Sign Up / Log In (Step 1) -> 5 Terms (Step 2) -> Phone (Step 3) -> Ready
  const handleSplashComplete = useCallback(() => {
    const existingUser = AuthService.getCurrentUser();
    if (!existingUser) {
      setOnboardingStep('auth');
      return;
    }
    setCurrentUser(existingUser);
    if (!AuthService.hasAcceptedTerms()) {
      setOnboardingStep('terms');
      return;
    }
    if (!existingUser.phoneNumber && !phoneSkipped) {
      setOnboardingStep('phone');
      return;
    }
    setOnboardingStep('ready');
  }, [phoneSkipped]);

  const handleTermsAccepted = () => {
    const existingUser = AuthService.getCurrentUser();
    if (!existingUser) {
      setOnboardingStep('auth');
      return;
    }
    setCurrentUser(existingUser);
    setOnboardingStep(existingUser.phoneNumber || phoneSkipped ? 'ready' : 'phone');
  };

  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setPhoneSkipped(false);
    if (!AuthService.hasAcceptedTerms()) {
      setOnboardingStep('terms');
      return;
    }
    setOnboardingStep(user.phoneNumber ? 'ready' : 'phone');
  };

  const handlePhoneComplete = (updatedUser: UserProfile) => {
    setCurrentUser(updatedUser);
    setOnboardingStep('ready');
  };

  const handleSkipPhone = () => {
    setPhoneSkipped(true);
    setOnboardingStep('ready');
  };

  const handleBackToAuth = () => {
    AuthService.logout();
    setCurrentUser(null);
    setOnboardingStep('auth');
  };

  const handleUpdatePhone = (countryCode: string, phoneNumber: string) => {
    const updated = AuthService.updatePhoneNumber(countryCode, phoneNumber);
    if (updated) {
      setCurrentUser(updated);
    }
  };

  const handleLogout = () => {
    AuthService.logout();
    setCurrentUser(null);
    setPhoneSkipped(false);
    setIsSettingsOpen(false);
    setOnboardingStep('auth');
  };

  // Start a new chat
  const handleNewChat = () => {
    setActiveView('chat');
    setActiveId(null);
    setInput('');
    setSummarizeError(null);
    setIsSummaryCollapsed(false);
  };

  // Select a conversation from sidebar
  const handleSelectConversation = (id: string) => {
    setActiveView('chat');
    setActiveId(id);
    setInput('');
    setSummarizeError(null);
    setIsSummaryCollapsed(false);
  };

  // Delete a conversation
  const handleDeleteConversation = (id: string) => {
    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);
    if (activeId === id) {
      setActiveId(updated.length > 0 ? updated[0].id : null);
    }
  };

  // Clear all conversations
  const handleClearHistory = () => {
    StorageService.clearAllData();
    setConversations([]);
    setActiveId(null);
    setInput('');
  };

  // Export current conversation as text or markdown
  const handleExportConversation = (format: ExportFormat) => {
    if (!activeConversation || activeConversation.messages.length === 0) return;
    downloadConversationFile(activeConversation, format);
  };

  // Auto-Summarize current conversation using the currently selected model
  const handleAutoSummarize = async () => {
    if (!activeConversation || activeConversation.messages.length === 0 || isSummarizing) return;
    const targetConvId = activeConversation.id;
    const targetMessageCount = activeConversation.messages.length;

    setIsSummaryCollapsed(false);
    setSummarizeError(null);
    setIsSummarizing(true);

    try {
      const result = await summarizeConversation(activeConversation.messages, selectedModel);
      if (result.success && result.summary) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === targetConvId
              ? {
                  ...c,
                  summary: {
                    text: result.summary!,
                    updatedAt: Date.now(),
                    model: result.model || selectedModel,
                    messageCount: targetMessageCount,
                  },
                }
              : c
          )
        );
      } else {
        setSummarizeError(result.error || 'Could not generate a summary.');
      }
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleDismissSummary = () => {
    if (!activeConversation) {
      setSummarizeError(null);
      return;
    }
    const targetConvId = activeConversation.id;
    setSummarizeError(null);
    setConversations((prev) =>
      prev.map((c) => (c.id === targetConvId ? { ...c, summary: undefined } : c))
    );
  };

  // Send message
  const handleSend = async (customPrompt?: string, attachment?: MessageAttachment) => {
    const textToSend = (customPrompt ?? input).trim();
    if ((!textToSend && !attachment) || isLoading) return;

    if (!customPrompt) setInput('');

    const userMessage: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
      attachment,
    };

    const titleSeed = textToSend || attachment?.name || 'New Chat';
    let targetConvId = activeId;
    let currentConv = conversations.find((c) => c.id === targetConvId);

    // If starting a brand new conversation
    if (!currentConv) {
      const generatedTitle =
        titleSeed.length > 36 ? `${titleSeed.slice(0, 36).trim()}...` : titleSeed;

      const newConversation: Conversation = {
        id: `conv-${Date.now()}`,
        title: generatedTitle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [userMessage],
      };

      targetConvId = newConversation.id;
      setConversations((prev) => [newConversation, ...prev]);
      setActiveId(targetConvId);
      currentConv = newConversation;
    } else {
      // Append user message to existing conversation
      const updatedMessages = [...currentConv.messages, userMessage];
      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetConvId
            ? { ...c, updatedAt: Date.now(), messages: updatedMessages }
            : c
        )
      );
    }

    setIsLoading(true);

    try {
      const messagesForApi = currentConv ? [...currentConv.messages, userMessage] : [userMessage];
      const result = await sendChatMessage(
        messagesForApi,
        useSearchGrounding,
        selectedModel,
        reasoningMode
      );

      if (result.success && result.text) {
        const aiMessage: Message = {
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          role: 'model',
          content: result.text,
          timestamp: Date.now(),
          model: result.model,
          groundingSources: result.groundingSources,
        };

        setConversations((prev) =>
          prev.map((c) =>
            c.id === targetConvId
              ? { ...c, updatedAt: Date.now(), messages: [...c.messages, aiMessage] }
              : c
          )
        );
      } else {
        const errorMessage: Message = {
          id: `msg-err-${Date.now()}`,
          role: 'model',
          content: result.error || 'Failed to get a response from NOVA. Please try again.',
          timestamp: Date.now(),
          isError: true,
        };

        setConversations((prev) =>
          prev.map((c) =>
            c.id === targetConvId
              ? { ...c, updatedAt: Date.now(), messages: [...c.messages, errorMessage] }
              : c
          )
        );
      }
    } catch (e: any) {
      const errorMessage: Message = {
        id: `msg-err-${Date.now()}`,
        role: 'model',
        content: e?.message || 'A network error occurred. Please check your connection and retry.',
        timestamp: Date.now(),
        isError: true,
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetConvId
            ? { ...c, updatedAt: Date.now(), messages: [...c.messages, errorMessage] }
            : c
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Retry a failed message
  const handleRetry = async (failedMsg: Message) => {
    if (!activeConversation) return;

    // Find previous messages up to the user message that prompted this
    const msgIndex = activeConversation.messages.findIndex((m) => m.id === failedMsg.id);
    if (msgIndex <= 0) return;

    // The user query is the message right before the error
    const precedingUserMsg = activeConversation.messages[msgIndex - 1];
    if (precedingUserMsg && precedingUserMsg.role === 'user') {
      // Filter out the error message from the conversation
      const cleanedMessages = activeConversation.messages.filter((m) => m.id !== failedMsg.id);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id ? { ...c, messages: cleanedMessages } : c
        )
      );

      // Trigger AI call with cleaned messages
      setIsLoading(true);
      try {
        const result = await sendChatMessage(
          cleanedMessages,
          useSearchGrounding,
          selectedModel,
          reasoningMode
        );
        if (result.success && result.text) {
          const aiMessage: Message = {
            id: `msg-${Date.now()}`,
            role: 'model',
            content: result.text,
            timestamp: Date.now(),
            model: result.model,
            groundingSources: result.groundingSources,
          };
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeConversation.id
                ? { ...c, updatedAt: Date.now(), messages: [...cleanedMessages, aiMessage] }
                : c
            )
          );
        } else {
          const errMessage: Message = {
            id: `msg-err-${Date.now()}`,
            role: 'model',
            content: result.error || 'Retry request failed. Please try again later.',
            timestamp: Date.now(),
            isError: true,
          };
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeConversation.id
                ? { ...c, updatedAt: Date.now(), messages: [...cleanedMessages, errMessage] }
                : c
            )
          );
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handle voice session messages
  const handleVoiceMessage = (
    userText: string,
    aiText: string,
    model?: string,
    groundingSources?: GroundingSource[]
  ) => {
    const userMsg: Message = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      content: userText,
      timestamp: Date.now(),
    };
    const aiMsg: Message = {
      id: `msg-${Date.now()}-a`,
      role: 'model',
      content: aiText,
      timestamp: Date.now(),
      model,
      groundingSources,
    };

    let targetConvId = activeId;
    if (!targetConvId) {
      const generatedTitle =
        userText.length > 36 ? `${userText.slice(0, 36).trim()}...` : userText;

      const newConversation: Conversation = {
        id: `conv-${Date.now()}`,
        title: generatedTitle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [userMsg, aiMsg],
      };

      setConversations((prev) => [newConversation, ...prev]);
      setActiveId(newConversation.id);
    } else {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetConvId
            ? { ...c, updatedAt: Date.now(), messages: [...c.messages, userMsg, aiMsg] }
            : c
        )
      );
    }
  };

  if (onboardingStep !== 'ready') {
    return (
      <OnboardingFlow
        step={onboardingStep}
        currentUser={currentUser}
        onSplashComplete={handleSplashComplete}
        onTermsAccepted={handleTermsAccepted}
        onAuthSuccess={handleAuthSuccess}
        onPhoneComplete={handlePhoneComplete}
        onSkipPhone={handleSkipPhone}
        onBackToAuth={handleBackToAuth}
      />
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-[#0B0C14] text-slate-900 dark:text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar for conversations */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenQRCode={() => setIsQRCodeOpen(true)}
        onOpenVoiceMode={() => setIsVoiceModalOpen(true)}
        canExport={Boolean(activeConversation && activeConversation.messages.length > 0)}
        onExportConversation={handleExportConversation}
        selectedModel={selectedModel}
        currentUser={currentUser}
        onLogout={handleLogout}
        currentPlan={selectedPlan}
        isPricingActive={activeView === 'pricing'}
        onOpenPricing={() => setActiveView((prev) => (prev === 'pricing' ? 'chat' : 'pricing'))}
        isCartActive={activeView === 'cart'}
        cartCount={cartItem ? cartItem.quantity : 0}
        onOpenCart={() => setActiveView((prev) => (prev === 'cart' ? 'chat' : 'cart'))}
        isHomeActive={activeView === 'chat'}
        onGoHome={() => setActiveView('chat')}
        isEnablesActive={activeView === 'enables'}
        isEnableKeyActive={Boolean(agentKeyConfig?.status === 'active' && agentKeyConfig?.quickAccessEnabled)}
        onOpenEnables={() => setActiveView((prev) => (prev === 'enables' ? 'chat' : 'enables'))}
        isWorkActive={activeView === 'work'}
        activeWorkAgentId={activeWorkAgent?.id || null}
        onOpenWork={handleOpenWork}
      />

      {/* Main Chat Area with subtle cosmic nebula atmosphere in dark mode */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative dark:bg-[radial-gradient(ellipse_at_top,_rgba(79,70,229,0.14),_transparent_58%)]">
        {/* Header */}
        <Header
          isSidebarOpen={isSidebarOpen}
          onNewChat={handleNewChat}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onOpenQRCode={() => setIsQRCodeOpen(true)}
          onOpenVoiceMode={() => setIsVoiceModalOpen(true)}
          currentTheme={theme}
          onToggleTheme={handleToggleTheme}
          selectedModel={selectedModel}
          onSelectModel={handleModelChange}
          canExport={activeView === 'chat' && Boolean(activeConversation && activeConversation.messages.length > 0)}
          onExportConversation={handleExportConversation}
          canSummarize={activeView === 'chat' && Boolean(activeConversation && activeConversation.messages.length > 0)}
          isSummarizing={isSummarizing}
          hasSummary={Boolean(activeConversation?.summary?.text)}
          onSummarize={handleAutoSummarize}
          isPricingActive={activeView === 'pricing'}
          onOpenPricing={() => setActiveView((prev) => (prev === 'pricing' ? 'chat' : 'pricing'))}
          isCartActive={activeView === 'cart'}
          cartCount={cartItem ? cartItem.quantity : 0}
          onOpenCart={() => setActiveView((prev) => (prev === 'cart' ? 'chat' : 'cart'))}
          isEnablesActive={activeView === 'enables'}
          isEnableKeyActive={Boolean(agentKeyConfig?.status === 'active' && agentKeyConfig?.quickAccessEnabled)}
          onOpenEnables={() => setActiveView((prev) => (prev === 'enables' ? 'chat' : 'enables'))}
          isWorkActive={activeView === 'work'}
          activeWorkAgentId={activeWorkAgent?.id || null}
          onOpenWork={handleOpenWork}
        />

        {activeView === 'pricing' ? (
          <PricingPage
            currentPlan={selectedPlan}
            cartItem={cartItem}
            onSelectFreePlan={() => handlePlanChange('startup')}
            onAddToCart={handleAddToCart}
            onOpenCart={() => setActiveView('cart')}
            onBackToChat={() => setActiveView('chat')}
          />
        ) : activeView === 'cart' ? (
          <CartPage
            cartItem={cartItem}
            currentUser={currentUser}
            onUpdateQuantity={handleUpdateCartQuantity}
            onSwitchPlan={handleSwitchCartPlan}
            onRemoveItem={handleRemoveFromCart}
            onConfirmOrder={handleConfirmOrder}
            onBackToPricing={() => setActiveView('pricing')}
            onBackToChat={() => setActiveView('chat')}
          />
        ) : activeView === 'enables' ? (
          <EnableKeyWorkspace
            activeAgentId={activeWorkAgent?.id || '101'}
            config={agentKeyConfig}
            messages={workMessages}
            isSending={isSendingWorkCommand}
            keyError={agentKeyError}
            onGenerateKey={handleGenerateAgentKey}
            onToggleKeyActive={handleToggleAgentKeyActive}
            onToggleQuickAccess={handleToggleQuickAccess}
            onToggleFloatingIcon={handleToggleFloatingIcon}
            onRevokeKey={handleRevokeAgentKey}
            onSendCommand={handleSendWorkAgentCommand}
            onClearAgentHistory={() => setWorkMessages([])}
            onNavigateView={handleNavigateFromAgent}
            onBackToHome={() => setActiveView('chat')}
          />
        ) : (
          <>
            {/* Pinned Conversation Summary Note */}
            {messages.length > 0 && (
              <ChatSummaryBanner
                summary={activeConversation?.summary}
                isSummarizing={isSummarizing}
                error={summarizeError}
                currentMessageCount={messages.length}
                isCollapsed={isSummaryCollapsed}
                onToggleCollapse={() => setIsSummaryCollapsed((prev) => !prev)}
                onRefresh={handleAutoSummarize}
                onDismiss={handleDismissSummary}
              />
            )}

            {/* Chat Feed */}
            <main className="flex-1 overflow-y-auto flex flex-col">
              {messages.length === 0 ? (
                <WelcomeScreen
                  onSelectPrompt={(prompt) => handleSend(prompt)}
                  onOpenWork={handleOpenWork}
                  activeWorkAgentId={activeWorkAgent?.id || null}
                />
              ) : (
                <div className="flex-1 py-4">
                  {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} onRetry={handleRetry} />
                  ))}

                  {/* Real-time Loading Indicator */}
                  {isLoading && (
                    <div className="w-full flex justify-center px-4 py-3.5 md:px-6 bg-white/60 dark:bg-zinc-900/40 border-y border-slate-100 dark:border-zinc-800/60">
                      <div className="max-w-3xl w-full flex items-center gap-3.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white flex items-center justify-center shadow-sm shadow-indigo-500/20 ring-2 ring-indigo-500/20 shrink-0">
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 font-medium">
                          <span>{reasoningMode ? 'NOVA is reasoning deeply' : 'NOVA is thinking'}</span>
                          <span className="inline-flex gap-0.5">
                            <span className="animate-bounce delay-0">.</span>
                            <span className="animate-bounce delay-150">.</span>
                            <span className="animate-bounce delay-300">.</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </main>

            {/* Input Bar */}
            <footer className="shrink-0 bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent dark:from-[#0B0C14] dark:via-[#0B0C14]/95 dark:to-transparent pt-2">
              <ChatInput
                input={input}
                setInput={setInput}
                onSend={(attachment) => handleSend(undefined, attachment)}
                isLoading={isLoading}
                useSearchGrounding={useSearchGrounding}
                onToggleSearchGrounding={() => setUseSearchGrounding((prev) => !prev)}
                reasoningMode={reasoningMode}
                onToggleReasoningMode={() => setReasoningMode((prev) => !prev)}
              />
            </footer>
          </>
        )}
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentTheme={theme}
        onThemeChange={handleThemeChange}
        onClearHistory={handleClearHistory}
        onOpenQRCode={() => setIsQRCodeOpen(true)}
        currentModel={selectedModel}
        onModelChange={handleModelChange}
        currentUser={currentUser}
        onUpdatePhone={handleUpdatePhone}
        onLogout={handleLogout}
      />

      {/* QR Code Modal for Mobile Access */}
      <QRCodeModal
        isOpen={isQRCodeOpen}
        onClose={() => setIsQRCodeOpen(false)}
      />

      {/* Voice Mode Modal */}
      <VoiceModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onNewMessage={handleVoiceMessage}
        conversationHistory={messages}
        selectedModel={selectedModel}
        useSearchGrounding={useSearchGrounding}
      />

      {/* Floating NOVA AI Quick Access Widget (Optional, Controlled by ENABLE KEY) */}
      <QuickAccessWidget
        config={agentKeyConfig}
        messages={workMessages}
        isSending={isSendingWorkCommand}
        onSendCommand={handleSendWorkAgentCommand}
        onDisableQuickAccess={handleDisableQuickAccess}
        onNavigateView={handleNavigateFromAgent}
        onOpenEnables={() => setActiveView('enables')}
      />

      {/* Full-Screen WORK Agent Workspace */}
      {activeView === 'work' && activeWorkAgent && !isWorkOnboardingOpen && (
        <WorkWorkspace
          agents={workAgents}
          activeAgent={activeWorkAgent}
          executions={workExecutions}
          selectedModel={selectedModel}
          agentKeyConfig={agentKeyConfig}
          onSelectAgent={(id) => setActiveWorkAgentId(id)}
          onCreateNewAgent={() => setIsWorkOnboardingOpen(true)}
          onUpdateAgentProfile={handleUpdateWorkAgentProfile}
          onSaveExecutions={setWorkExecutions}
          onNavigateAppView={(view) => handleNavigateFromAgent(view)}
          onExitWork={() => setActiveView('chat')}
        />
      )}

      {/* Full-Screen WORK Agent Step-by-Step Onboarding */}
      {isWorkOnboardingOpen && (
        <WorkOnboarding
          existingAgents={workAgents}
          onAgentCreated={handleWorkAgentCreated}
          onExit={() => setIsWorkOnboardingOpen(false)}
        />
      )}
    </div>
  );
}

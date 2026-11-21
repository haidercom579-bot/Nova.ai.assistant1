import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '15mb' }));

// Health / Status endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    model: 'gemini-4-hydrogen',
  });
});

// Download project archive endpoint
app.get('/api/download-project', (req: Request, res: Response) => {
  const zipPath = path.resolve(__dirname, 'nova-app-project.zip');
  if (!fs.existsSync(zipPath)) {
    return res.status(404).json({ success: false, error: 'Project zip archive not found.' });
  }
  return res.download(zipPath, 'nova-app-project.zip');
});

// Candidate models in order of preference (per Google AI Studio guidelines)
// Highest free-tier model: gemini-4-hydrogen, followed by fast fallback gemini-3.1-flash-lite
const CANDIDATE_MODELS = [
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
];

async function withServerTimeout<T>(fn: () => Promise<T>, ms: number, label: string): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([fn(), timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

interface ParsedApiError {
  code: string;
  httpStatus?: number;
  message: string;
  technicalDetail: string;
  suggestion: string;
}

function parseGeminiApiError(err: any): ParsedApiError {
  const raw = String(err?.message || err || 'Unknown error');
  let extractedMessage = raw;
  let httpStatus: number | undefined = typeof err?.status === 'number' ? err.status : undefined;

  if (raw.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.error?.message) extractedMessage = String(parsed.error.message);
      if (typeof parsed?.error?.code === 'number') httpStatus = parsed.error.code;
    } catch {
      // keep raw
    }
  }

  const lower = extractedMessage.toLowerCase();
  if (httpStatus === 429 || lower.includes('quota') || lower.includes('resource_exhausted') || lower.includes('rate limit')) {
    return {
      code: 'AI_QUOTA_EXCEEDED',
      httpStatus: 429,
      message: 'AI model quota or rate limit exceeded right now.',
      technicalDetail: extractedMessage.slice(0, 260),
      suggestion: 'Wait a moment and retry, switch model in Settings, or use direct commands like "Open ChatGPT", "Open YouTube", or "Search ...".',
    };
  }
  if (lower.includes('timed out') || lower.includes('timeout')) {
    return {
      code: 'AI_TIMEOUT',
      httpStatus: 504,
      message: 'The AI planner took too long to respond.',
      technicalDetail: extractedMessage.slice(0, 260),
      suggestion: 'Click Retry Command, or switch to a faster model in Settings.',
    };
  }
  if (lower.includes('api_key') || lower.includes('api key') || httpStatus === 401 || httpStatus === 403) {
    return {
      code: 'INVALID_API_KEY',
      httpStatus: httpStatus || 401,
      message: 'Gemini API key is missing, invalid, or lacks permission.',
      technicalDetail: extractedMessage.slice(0, 260),
      suggestion: 'Verify GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (httpStatus === 503 || lower.includes('unavailable') || lower.includes('overloaded')) {
    return {
      code: 'AI_SERVICE_UNAVAILABLE',
      httpStatus: 503,
      message: 'The AI service is temporarily busy.',
      technicalDetail: extractedMessage.slice(0, 260),
      suggestion: 'Wait a few seconds and click Retry Command.',
    };
  }
  return {
    code: 'AI_EXECUTION_ERROR',
    httpStatus: httpStatus || 500,
    message: extractedMessage.length > 180 ? `${extractedMessage.slice(0, 177)}...` : extractedMessage,
    technicalDetail: extractedMessage.slice(0, 260),
    suggestion: 'Review the command wording and try again.',
  };
}

const KNOWN_WEB_APPS: {
  aliases: string[];
  name: string;
  url: string;
}[] = [
  { aliases: ['chatgpt', 'chat gpt', 'openai chat'], name: 'ChatGPT', url: 'https://chatgpt.com' },
  { aliases: ['youtube', 'you tube'], name: 'YouTube', url: 'https://www.youtube.com' },
  { aliases: ['google maps', 'maps'], name: 'Google Maps', url: 'https://maps.google.com' },
  { aliases: ['google drive', 'drive'], name: 'Google Drive', url: 'https://drive.google.com' },
  { aliases: ['google', 'google search'], name: 'Google', url: 'https://www.google.com' },
  { aliases: ['gmail', 'google mail', 'email'], name: 'Gmail', url: 'https://mail.google.com' },
  { aliases: ['github', 'git hub'], name: 'GitHub', url: 'https://github.com' },
  { aliases: ['gemini'], name: 'Google Gemini', url: 'https://gemini.google.com' },
  { aliases: ['claude'], name: 'Claude', url: 'https://claude.ai' },
  { aliases: ['whatsapp', 'whatsapp web'], name: 'WhatsApp Web', url: 'https://web.whatsapp.com' },
  { aliases: ['wikipedia', 'wiki'], name: 'Wikipedia', url: 'https://www.wikipedia.org' },
  { aliases: ['reddit'], name: 'Reddit', url: 'https://www.reddit.com' },
  { aliases: ['twitter', 'x.com'], name: 'X (Twitter)', url: 'https://x.com' },
  { aliases: ['instagram'], name: 'Instagram', url: 'https://www.instagram.com' },
  { aliases: ['facebook'], name: 'Facebook', url: 'https://www.facebook.com' },
  { aliases: ['linkedin'], name: 'LinkedIn', url: 'https://www.linkedin.com' },
  { aliases: ['spotify'], name: 'Spotify', url: 'https://open.spotify.com' },
  { aliases: ['netflix'], name: 'Netflix', url: 'https://www.netflix.com' },
  { aliases: ['amazon'], name: 'Amazon', url: 'https://www.amazon.com' },
  { aliases: ['notion'], name: 'Notion', url: 'https://www.notion.so' },
  { aliases: ['figma'], name: 'Figma', url: 'https://www.figma.com' },
  { aliases: ['perplexity'], name: 'Perplexity', url: 'https://www.perplexity.ai' },
  { aliases: ['stack overflow', 'stackoverflow'], name: 'Stack Overflow', url: 'https://stackoverflow.com' },
];

interface DeterministicWorkResolution {
  interpretedIntent: string;
  targetAppOrSite: string;
  actionType: 'open_url' | 'navigate_app' | 'search_web' | 'unsupported_device_action';
  isSupported: boolean;
  requiresPermission: boolean;
  actionLabel: string;
  url?: string;
  targetView?: 'chat' | 'settings' | 'pricing' | 'voice' | 'enables' | 'cart';
  query?: string;
  reply: string;
  unsupportedReason?: string;
  alternativeSuggestion?: string;
  errorCode?: string;
  errorStage?: string;
}

function resolveDeterministicWorkCommand(
  rawCommand: string,
  agentId: string
): DeterministicWorkResolution | null {
  const cmd = rawCommand.trim();
  const normalized = cmd.toLowerCase().replace(/[.!?]+$/g, '').replace(/\s+/g, ' ').trim();
  if (!normalized) return null;

  // 1. Honest guard for native Android / hardware / background OS commands
  const unsupportedPatterns: {
    regex: RegExp;
    target: string;
    reason: string;
    alternative: string;
  }[] = [
    {
      regex: /\b(turn on|turn off|toggle|enable|disable|switch on|switch off)\b.*\b(wi-?fi|bluetooth|flashlight|torch|airplane mode|mobile data|cellular data|hotspot|nfc|gps|location|battery saver|dark mode on phone)\b/,
      target: 'Device System Controls',
      reason: 'Web browsers cannot directly modify native Android/iOS hardware toggles such as Wi-Fi, Bluetooth, Flashlight, or Airplane Mode.',
      alternative: 'Open your device Quick Settings panel from the status bar to toggle hardware radios safely.',
    },
    {
      regex: /\b(set|change|increase|decrease|mute|unmute)\b.*\b(volume|brightness|ringtone)\b/,
      target: 'Device Audio & Display',
      reason: 'System hardware volume and screen brightness controls are restricted outside native OS permissions.',
      alternative: 'Use your physical device volume keys or system Quick Settings slider.',
    },
    {
      regex: /\b(take|capture)\b.*\b(screenshot|screen shot)\b|\b(lock screen|restart phone|reboot|shut down phone|power off)\b/,
      target: 'OS Power & Screen Action',
      reason: 'Operating system power and global screenshot triggers require privileged system permissions not exposed to web apps.',
      alternative: 'Use your device hardware button shortcut to capture a screenshot or lock your screen.',
    },
    {
      regex: /\b(send|read|delete|check)\b.*\b(sms|text message|whatsapp messages|notifications)\b|\b(make a call|phone call|dial \d|call \+?\d)\b/,
      target: 'Private Telephony & Messaging',
      reason: 'Reading private SMS/notifications or placing silent phone calls requires native Android Telephony/Notification Listener permissions and cannot be executed silently from a browser.',
      alternative: 'Open WhatsApp Web or Google Messages manually from an approved browser tab.',
    },
    {
      regex: /\b(install|uninstall|force close|kill app|clear cache of)\b/,
      target: 'Native App Package Manager',
      reason: 'Installing, uninstalling, or terminating other native apps requires Android OS package privileges unavailable inside a browser.',
      alternative: 'Manage installed apps through your device Settings > Apps menu.',
    },
  ];

  for (const pat of unsupportedPatterns) {
    if (pat.regex.test(normalized)) {
      return {
        interpretedIntent: `Attempted restricted OS action: "${cmd}"`,
        targetAppOrSite: pat.target,
        actionType: 'unsupported_device_action',
        isSupported: false,
        requiresPermission: false,
        actionLabel: 'Unsupported in Web Runtime',
        reply: `I cannot complete "${cmd}" automatically because ${pat.reason}`,
        unsupportedReason: pat.reason,
        alternativeSuggestion: pat.alternative,
        errorCode: 'UNSUPPORTED_DEVICE_CAPABILITY',
        errorStage: 'Capability Verification',
      };
    }
  }

  // 2. Internal NOVA AI screen navigation
  if (
    /\b(nova ai settings|nova settings|open settings|go to settings|app settings|settings page)\b/.test(normalized) ||
    normalized === 'settings'
  ) {
    return {
      interpretedIntent: 'Open NOVA AI Settings panel',
      targetAppOrSite: 'NOVA AI Settings',
      actionType: 'navigate_app',
      isSupported: true,
      requiresPermission: false,
      actionLabel: 'Open NOVA Settings',
      targetView: 'settings',
      reply: `Opening NOVA AI Settings now for Agent ${agentId}.`,
    };
  }

  if (/\b(open pricing|go to pricing|pricing page|view pricing|show plans|open plans)\b/.test(normalized)) {
    return {
      interpretedIntent: 'Navigate to NOVA Pricing page',
      targetAppOrSite: 'NOVA Pricing',
      actionType: 'navigate_app',
      isSupported: true,
      requiresPermission: false,
      actionLabel: 'Open Pricing',
      targetView: 'pricing',
      reply: `Navigating to NOVA Pricing now.`,
    };
  }

  if (/\b(open cart|go to cart|view cart|cart page|checkout)\b/.test(normalized)) {
    return {
      interpretedIntent: 'Navigate to NOVA Cart page',
      targetAppOrSite: 'NOVA Cart',
      actionType: 'navigate_app',
      isSupported: true,
      requiresPermission: false,
      actionLabel: 'Open Cart',
      targetView: 'cart',
      reply: `Opening your NOVA Cart page now.`,
    };
  }

  if (/\b(open voice|voice mode|start voice|open microphone)\b/.test(normalized)) {
    return {
      interpretedIntent: 'Launch NOVA Voice Mode',
      targetAppOrSite: 'NOVA Voice Mode',
      actionType: 'navigate_app',
      isSupported: true,
      requiresPermission: false,
      actionLabel: 'Open Voice Mode',
      targetView: 'voice',
      reply: `Launching NOVA Voice Mode now.`,
    };
  }

  if (/\b(open enables|enable key|quick access settings)\b/.test(normalized)) {
    return {
      interpretedIntent: 'Navigate to NOVA Enables & Quick Access',
      targetAppOrSite: 'NOVA Enables',
      actionType: 'navigate_app',
      isSupported: true,
      requiresPermission: false,
      actionLabel: 'Open Enables',
      targetView: 'enables',
      reply: `Opening NOVA Enables & Quick Access now.`,
    };
  }

  if (/\b(open home|go home|nova home|open chat|main chat)\b/.test(normalized)) {
    return {
      interpretedIntent: 'Return to NOVA Home Chat',
      targetAppOrSite: 'NOVA Home',
      actionType: 'navigate_app',
      isSupported: true,
      requiresPermission: false,
      actionLabel: 'Open Home',
      targetView: 'chat',
      reply: `Returning to the NOVA Home chat screen.`,
    };
  }

  // 3. Explicit search intents ("search ...", "google ...", "look up ...")
  const searchMatch = cmd.match(
    /^(?:please\s+)?(?:search(?:\s+(?:the\s+)?(?:internet|web|online))?(?:\s+for)?|look\s+up|find\s+(?:info|information|news|results)?\s*(?:on|about|for)?|google\s+(?:for\s+)?)\s+(.+)$/i
  );
  if (searchMatch && searchMatch[1]?.trim()) {
    const query = searchMatch[1].trim();
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    return {
      interpretedIntent: `Search the web for "${query}"`,
      targetAppOrSite: 'Web Search',
      actionType: 'search_web',
      isSupported: true,
      requiresPermission: false,
      actionLabel: 'Open Google Search',
      url: searchUrl,
      query,
      reply: `Prepared web search results for "${query}".`,
    };
  }

  // 4. Known web applications ("Open ChatGPT", "Launch YouTube", "Open Google", etc.)
  const openVerbMatch = normalized.match(
    /^(?:please\s+)?(?:open|launch|start|visit|go to|navigate to|load|show)\s+(.+)$/i
  );
  const candidateTarget = (openVerbMatch ? openVerbMatch[1] : normalized)
    .replace(/^(the\s+)?(website|app|application|site|page)\s+/i, '')
    .trim();

  for (const appEntry of KNOWN_WEB_APPS) {
    if (
      appEntry.aliases.some(
        (alias) =>
          candidateTarget === alias ||
          candidateTarget === `${alias} app` ||
          candidateTarget === `${alias} website` ||
          (openVerbMatch && candidateTarget.includes(alias) && candidateTarget.length <= alias.length + 12)
      )
    ) {
      return {
        interpretedIntent: `Open ${appEntry.name} in browser`,
        targetAppOrSite: appEntry.name,
        actionType: 'open_url',
        isSupported: true,
        requiresPermission: true,
        actionLabel: `Open ${appEntry.name}`,
        url: appEntry.url,
        reply: `Agent ${agentId} identified ${appEntry.name} (${appEntry.url}). Approve the launch prompt to open it in a new browser tab.`,
      };
    }
  }

  // 5. Explicit domain or URL ("https://example.com" or "open openai.com" / "navigate to bbc.co.uk")
  const explicitUrlMatch = cmd.match(/\bhttps?:\/\/[^\s"'<>]+/i);
  if (explicitUrlMatch && isSafeHttpsUrl(explicitUrlMatch[0])) {
    const cleanUrl = explicitUrlMatch[0];
    let host = cleanUrl;
    try {
      host = new URL(cleanUrl).hostname.replace(/^www\./, '');
    } catch {
      // keep raw
    }
    return {
      interpretedIntent: `Navigate to ${host}`,
      targetAppOrSite: host,
      actionType: 'open_url',
      isSupported: true,
      requiresPermission: true,
      actionLabel: `Open ${host}`,
      url: cleanUrl,
      reply: `Agent ${agentId} verified ${cleanUrl}. Approve below to open it safely in a new tab.`,
    };
  }

  if (openVerbMatch) {
    const domainMatch = candidateTarget.match(/^([a-z0-9-]+(?:\.[a-z0-9-]+)+)(?:\/[^\s]*)?$/i);
    if (domainMatch) {
      const normalizedUrl = `https://${domainMatch[0]}`;
      if (isSafeHttpsUrl(normalizedUrl)) {
        const host = domainMatch[1].replace(/^www\./, '');
        return {
          interpretedIntent: `Navigate to ${host}`,
          targetAppOrSite: host,
          actionType: 'open_url',
          isSupported: true,
          requiresPermission: true,
          actionLabel: `Open ${host}`,
          url: normalizedUrl,
          reply: `Agent ${agentId} prepared ${normalizedUrl}. Approve below to launch it in a new tab.`,
        };
      }
    }
  }

  return null;
}

// Chat endpoint
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { messages, systemInstruction, useSearchGrounding, requestedModel, reasoningMode } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(200).json({
        success: false,
        error: 'Please enter a message to begin chatting.',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        success: false,
        error: 'API key is not configured. Please check your environment variables in Settings > Secrets.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Clean and validate messages (including optional text/image attachments)
    const cleaned = messages
      .filter(
        (m: any) =>
          m &&
          !m.isError &&
          ((typeof m.content === 'string' && m.content.trim().length > 0) || Boolean(m.attachment))
      )
      .map((m: any) => {
        const parts: any[] = [];
        const rawText = typeof m.content === 'string' ? m.content.trim() : '';

        if (m.attachment && typeof m.attachment === 'object') {
          if (m.attachment.kind === 'image' && m.attachment.content && m.attachment.mimeType) {
            parts.push({
              inlineData: {
                mimeType: m.attachment.mimeType,
                data: m.attachment.content,
              },
            });
          } else if (m.attachment.kind === 'text' && m.attachment.content) {
            const fileHeader = `[Attached file: ${m.attachment.name || 'file'}]\n\`\`\`\n${String(m.attachment.content).slice(0, 60000)}\n\`\`\``;
            parts.push({ text: rawText ? `${fileHeader}\n\n${rawText}` : fileHeader });
          }
        }

        if (parts.length === 0 || (m.attachment?.kind === 'image' && rawText)) {
          parts.push({ text: rawText || 'Please analyze the attached file.' });
        }

        return {
          role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
          parts,
        };
      });

    if (cleaned.length === 0) {
      return res.status(200).json({
        success: false,
        error: 'Please enter a valid message.',
      });
    }

    // Merge consecutive messages from the same role
    const mergedContents: { role: 'user' | 'model'; parts: any[] }[] = [];
    for (const msg of cleaned) {
      if (mergedContents.length > 0 && mergedContents[mergedContents.length - 1].role === msg.role) {
        mergedContents[mergedContents.length - 1].parts.push(...msg.parts);
      } else {
        mergedContents.push({
          role: msg.role,
          parts: [...msg.parts],
        });
      }
    }

    while (mergedContents.length > 0 && mergedContents[0].role !== 'user') {
      mergedContents.shift();
    }

    if (mergedContents.length === 0) {
      mergedContents.push({
        role: 'user',
        parts: [...cleaned[cleaned.length - 1].parts],
      });
    }

    const defaultSystemInstruction =
      "You are NOVA, a personal AI assistant. Your tone is warm, friendly, helpful, articulate, and honest.\n" +
      "Guidelines:\n" +
      "- Answer questions accurately and explain complex or technical topics in simple, intuitive terms.\n" +
      "- Enthusiastically assist with studying, brainstorming, writing, editing, problem-solving, and creative projects.\n" +
      "- If you do not know the answer or lack verified facts, clearly state that you don't know instead of inventing information.\n" +
      "- Use structured formatting like short paragraphs, bullet points, numbered steps, or markdown code blocks to make reading easy.\n" +
      "- Keep your responses focused, helpful, and supportive.";

    // Normalize requested model so stale/deprecated model IDs map cleanly to gemini-4-hydrogen
    const normalizedRequestedModel =
      typeof requestedModel === 'string' && CANDIDATE_MODELS.includes(requestedModel)
        ? requestedModel
        : 'gemini-4-hydrogen';

    // Determine models to try, prioritizing requested model with fallback
    const modelsToTry: string[] = [
      normalizedRequestedModel,
      ...CANDIDATE_MODELS.filter((m) => m !== normalizedRequestedModel),
    ];

    let lastError: any = null;
    let successfulText = '';
    let usedModel = '';
    let groundingSources: { title: string; url: string }[] = [];

    for (const model of modelsToTry) {
      try {
        const generateConfig: any = {
          systemInstruction: systemInstruction || defaultSystemInstruction,
        };

        if (reasoningMode && model === 'gemini-4-hydrogen') {
          generateConfig.thinkingConfig = {
            thinkingLevel: ThinkingLevel.XHIGH,
          };
        }

        if (useSearchGrounding) {
          generateConfig.tools = [{ googleSearch: {} }];
        }

        const withTimeout = async (fn: () => Promise<any>, ms: number = 25000) => {
          let timer: any;
          const timeoutPromise = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error(`Model ${model} timed out after ${ms}ms`)), ms);
          });
          try {
            return await Promise.race([fn(), timeoutPromise]);
          } finally {
            clearTimeout(timer);
          }
        };

        let response: any;
        try {
          response = await withTimeout(() =>
            ai.models.generateContent({
              model,
              contents: mergedContents,
              config: generateConfig,
            })
          );
        } catch (groundingErr: any) {
          // If search grounding hits rate limit / quota, fall back to generation without tools
          if (useSearchGrounding) {
            delete generateConfig.tools;
            response = await withTimeout(() =>
              ai.models.generateContent({
                model,
                contents: mergedContents,
                config: generateConfig,
              })
            );
          } else {
            throw groundingErr;
          }
        }

        const text = response.text;
        if (text) {
          successfulText = text;
          usedModel = model;

          // Extract grounding metadata if present
          const candidate = response.candidates?.[0];
          const metadata = (candidate as any)?.groundingMetadata;
          if (metadata && Array.isArray(metadata.groundingChunks)) {
            for (const chunk of metadata.groundingChunks) {
              if (chunk?.web?.uri) {
                groundingSources.push({
                  title: chunk.web.title || chunk.web.uri,
                  url: chunk.web.uri,
                });
              }
            }
          }
          break;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || '');
        console.warn(`Model ${model} attempt failed: ${errMsg.slice(0, 120)}. Trying fallback...`);
      }
    }

    if (successfulText) {
      return res.status(200).json({
        success: true,
        text: successfulText,
        model: usedModel,
        groundingSources: groundingSources.length > 0 ? groundingSources : undefined,
      });
    }

    const parsedErr = parseGeminiApiError(lastError);
    return res.status(200).json({
      success: false,
      error: parsedErr.message,
    });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    return res.status(200).json({
      success: false,
      error: 'An unexpected error occurred while communicating with NOVA. Please try again.',
    });
  }
});

// Auto-Summarize conversation endpoint
app.post('/api/summarize', async (req: Request, res: Response) => {
  try {
    const { messages, requestedModel } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(200).json({
        success: false,
        error: 'There are no messages to summarize yet.',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        success: false,
        error: 'API key is not configured. Please check your environment variables in Settings > Secrets.',
      });
    }

    const transcriptLines = messages
      .filter(
        (m: any) =>
          m &&
          !m.isError &&
          ((typeof m.content === 'string' && m.content.trim().length > 0) || Boolean(m.attachment))
      )
      .map((m: any) => {
        const speaker = m.role === 'user' ? 'User' : 'NOVA';
        const text = typeof m.content === 'string' ? m.content.trim() : '';
        const attachmentNote = m.attachment?.name ? `[Attachment: ${m.attachment.name}] ` : '';
        return `${speaker}: ${attachmentNote}${text}`.trim();
      });

    if (transcriptLines.length === 0) {
      return res.status(200).json({
        success: false,
        error: 'No valid conversation messages found to summarize.',
      });
    }

    const transcript = transcriptLines.join('\n\n').slice(-45000);

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const normalizedRequestedModel =
      typeof requestedModel === 'string' && CANDIDATE_MODELS.includes(requestedModel)
        ? requestedModel
        : 'gemini-4-hydrogen';

    const modelsToTry: string[] = [
      normalizedRequestedModel,
      ...CANDIDATE_MODELS.filter((m) => m !== normalizedRequestedModel),
    ];

    let summaryText = '';
    let usedModel = '';
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const response = await withServerTimeout(
          () =>
            ai.models.generateContent({
              model,
              contents: `Summarize the following conversation concisely:\n\n${transcript}`,
              config: {
                systemInstruction:
                  'You are a concise conversation summarizer. Summarize the conversation history in 2 to 4 clear sentences (under 85 words total) covering the main topic, key answers or decisions, and any next steps. Do not use markdown headers or filler.',
              },
            }),
          15000,
          `Summarize (${model})`
        );

        const text = response.text?.trim();
        if (text) {
          summaryText = text;
          usedModel = model;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Summarize with ${model} failed: ${String(err?.message || '').slice(0, 120)}`);
      }
    }

    if (summaryText) {
      return res.status(200).json({
        success: true,
        summary: summaryText,
        model: usedModel,
      });
    }

    const parsedSummaryErr = parseGeminiApiError(lastError);
    return res.status(200).json({
      success: false,
      error: parsedSummaryErr.message || 'Could not generate a summary right now. Please try again.',
    });
  } catch (error: any) {
    console.error('Error in /api/summarize:', error);
    return res.status(200).json({
      success: false,
      error: 'An unexpected error occurred while summarizing the conversation.',
    });
  }
});

// Audio transcription endpoint using gemini-3.5-transcribe with reliable fallback
app.post('/api/transcribe', async (req: Request, res: Response) => {
  try {
    const rawAudio = typeof req.body?.audioBase64 === 'string' ? req.body.audioBase64.trim() : '';
    const cleanedBase64 = rawAudio.includes(',') ? rawAudio.split(',').pop() || '' : rawAudio;
    const rawMimeType = typeof req.body?.mimeType === 'string' ? req.body.mimeType : 'audio/webm';
    const normalizedMime = rawMimeType.split(';')[0].trim() || 'audio/webm';

    if (!cleanedBase64 || cleanedBase64.length < 32) {
      return res.status(200).json({
        success: false,
        error: 'No voice audio detected. Please speak clearly into your microphone and try again.',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        success: false,
        error: 'API key is not configured in Settings > Secrets.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const audioPart = {
      inlineData: {
        mimeType: normalizedMime,
        data: cleanedBase64,
      },
    };

    const transcribeModels = ['gemini-3.5-transcribe', 'gemini-3.1-flash-lite'];
    let lastErr: any = null;

    for (const model of transcribeModels) {
      try {
        const generatePromise = ai.models.generateContent({
          model,
          contents: {
            parts: [
              audioPart,
              {
                text: 'Transcribe the spoken words from this audio accurately into plain text. Return only the spoken words without extra commentary.',
              },
            ],
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Transcription request timed out.')), 9000)
        );

        const response = await Promise.race([generatePromise, timeoutPromise]);

        const transcript = (response.text || '').trim();
        if (transcript) {
          return res.status(200).json({
            success: true,
            text: transcript,
            model,
          });
        }
      } catch (err: any) {
        lastErr = err;
        const msg = String(err?.message || '');
        console.warn(`Transcription with ${model} failed:`, msg.slice(0, 120));
        // Stop retrying if quota/key itself is exhausted
        if (msg.includes('"code":429') || msg.toLowerCase().includes('quota')) {
          break;
        }
      }
    }

    const rawMsg = String(lastErr?.message || '');
    let friendlyError = 'Could not detect clear speech in the recording. Please try again.';
    if (rawMsg.startsWith('{')) {
      try {
        const parsed = JSON.parse(rawMsg);
        friendlyError = parsed?.error?.message || friendlyError;
      } catch {
        // use default
      }
    } else if (rawMsg) {
      friendlyError = rawMsg;
    }

    return res.status(200).json({
      success: false,
      error: friendlyError,
    });
  } catch (error: any) {
    console.error('Transcription error:', error);
    return res.status(200).json({
      success: false,
      error: 'Could not transcribe audio. Please try again or type your message.',
    });
  }
});

// --- WORK AGENT & ENABLE KEY AUTHENTICATION ---
interface ServerAgentKeyRecord {
  agentId: string;
  keyHash: string;
  maskedKey: string;
  status: 'active' | 'inactive';
  quickAccessEnabled: boolean;
  floatingIconEnabled: boolean;
  createdAt: number;
}

const AGENT_KEY_STORE_PATH = '/tmp/nova-agent-keys.json';
const agentKeyStore = new Map<string, ServerAgentKeyRecord>();

function loadAgentKeyStore() {
  try {
    if (fs.existsSync(AGENT_KEY_STORE_PATH)) {
      const raw = JSON.parse(fs.readFileSync(AGENT_KEY_STORE_PATH, 'utf-8'));
      if (Array.isArray(raw)) {
        for (const rec of raw) {
          if (rec?.agentId && rec?.keyHash) {
            agentKeyStore.set(rec.agentId, rec);
          }
        }
      }
    }
  } catch (e) {
    console.warn('Could not load agent key store:', e);
  }
}

function persistAgentKeyStore() {
  try {
    fs.writeFileSync(
      AGENT_KEY_STORE_PATH,
      JSON.stringify(Array.from(agentKeyStore.values()), null, 2)
    );
  } catch (e) {
    console.warn('Could not persist agent key store:', e);
  }
}

loadAgentKeyStore();

function hashAccessKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

function maskAccessKey(rawKey: string): string {
  if (rawKey.length <= 12) return 'nova_wk_••••';
  return `${rawKey.slice(0, 11)}••••••••${rawKey.slice(-4)}`;
}

function isSafeHttpsUrl(rawUrl?: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

// Generate or regenerate a secure WORK Agent access key
app.post('/api/agent/key/generate', (req: Request, res: Response) => {
  const agentId = typeof req.body?.agentId === 'string' && req.body.agentId.trim()
    ? req.body.agentId.trim()
    : '101';

  const randomToken = crypto.randomBytes(24).toString('base64url');
  const rawKey = `nova_wk_${randomToken}`;
  const maskedKey = maskAccessKey(rawKey);
  const existing = agentKeyStore.get(agentId);

  const record: ServerAgentKeyRecord = {
    agentId,
    keyHash: hashAccessKey(rawKey),
    maskedKey,
    status: 'active',
    quickAccessEnabled: existing ? existing.quickAccessEnabled : true,
    floatingIconEnabled: existing ? existing.floatingIconEnabled : true,
    createdAt: Date.now(),
  };

  agentKeyStore.set(agentId, record);
  persistAgentKeyStore();

  return res.status(200).json({
    success: true,
    agentId: record.agentId,
    accessKey: rawKey,
    maskedKey: record.maskedKey,
    status: record.status,
    quickAccessEnabled: record.quickAccessEnabled,
    floatingIconEnabled: record.floatingIconEnabled,
    createdAt: record.createdAt,
  });
});

// Update key / Quick Access status
app.post('/api/agent/key/status', (req: Request, res: Response) => {
  const { agentId = '101', status, quickAccessEnabled, floatingIconEnabled } = req.body || {};
  const authHeader = req.headers.authorization || '';
  const bearerKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  const record = agentKeyStore.get(String(agentId));
  if (!record) {
    return res.status(404).json({
      success: false,
      error: 'No access key found for this agent. Generate a key first.',
    });
  }

  if (bearerKey && hashAccessKey(bearerKey) !== record.keyHash) {
    return res.status(401).json({
      success: false,
      error: 'Invalid access key for this WORK Agent.',
    });
  }

  if (status === 'active' || status === 'inactive') {
    record.status = status;
  }
  if (typeof quickAccessEnabled === 'boolean') {
    record.quickAccessEnabled = quickAccessEnabled;
  }
  if (typeof floatingIconEnabled === 'boolean') {
    record.floatingIconEnabled = floatingIconEnabled;
  }

  agentKeyStore.set(String(agentId), record);
  persistAgentKeyStore();

  return res.status(200).json({
    success: true,
    agentId: record.agentId,
    maskedKey: record.maskedKey,
    status: record.status,
    quickAccessEnabled: record.quickAccessEnabled,
    floatingIconEnabled: record.floatingIconEnabled,
  });
});

// Revoke key
app.post('/api/agent/key/revoke', (req: Request, res: Response) => {
  const agentId = String(req.body?.agentId || '101');
  agentKeyStore.delete(agentId);
  persistAgentKeyStore();
  return res.status(200).json({ success: true });
});

// Execute a WORK Agent command (requires valid active access key)
app.post('/api/agent/command', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization || '';
    const bearerKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const {
      agentId = '101',
      command,
      history = [],
      requestedModel,
    } = req.body || {};

    if (!bearerKey) {
      return res.status(401).json({
        success: false,
        error: 'Missing Agent Access Key. Generate and activate a key in Enables.',
      });
    }

    const record = agentKeyStore.get(String(agentId));
    if (!record || hashAccessKey(bearerKey) !== record.keyHash) {
      return res.status(401).json({
        success: false,
        error: 'Access key could not be verified. Please regenerate your key in Enables.',
      });
    }

    if (record.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Access key is currently Inactive. Enable the key in the WORK dashboard first.',
      });
    }

    if (!command || typeof command !== 'string' || !command.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please enter or speak a command for the WORK Agent.',
      });
    }

    // Deterministic resolution first so core web/app/navigation/search & unsupported OS commands work reliably without quota blockage
    const deterministic = resolveDeterministicWorkCommand(command, String(record.agentId));
    if (deterministic) {
      if (deterministic.actionType === 'unsupported_device_action') {
        return res.status(200).json({
          success: true,
          agentId: record.agentId,
          reply: deterministic.reply,
          action: {
            type: 'unsupported_device_action',
            label: deterministic.actionLabel,
          },
        });
      }
      return res.status(200).json({
        success: true,
        agentId: record.agentId,
        reply: deterministic.reply,
        action: {
          type: deterministic.actionType,
          label: deterministic.actionLabel,
          url: deterministic.url,
          targetView: deterministic.targetView,
          query: deterministic.query,
        },
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        success: false,
        error: 'GEMINI_API_KEY is not configured in Settings > Secrets.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const normalizedModel =
      typeof requestedModel === 'string' && CANDIDATE_MODELS.includes(requestedModel)
        ? requestedModel
        : 'gemini-4-hydrogen';

    const modelsToTry = [
      normalizedModel,
      ...CANDIDATE_MODELS.filter((m) => m !== normalizedModel),
    ];

    const recentHistoryText = Array.isArray(history)
      ? history
          .slice(-8)
          .map((m: any) => `${m.role === 'user' ? 'User' : `Agent ${agentId}`}: ${m.content}`)
          .join('\n')
      : '';

    const prompt = [
      recentHistoryText ? `Recent WORK Agent #${agentId} History:\n${recentHistoryText}\n` : '',
      `New Command: "${command.trim()}"`,
    ]
      .filter(Boolean)
      .join('\n');

    let response: any = null;
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        response = await withServerTimeout(
          () =>
            ai.models.generateContent({
              model,
              contents: prompt,
              config: {
                systemInstruction:
                  `You are NOVA WORK Agent #${agentId}, connected via an authenticated Quick Access key.\n` +
                  `Interpret the user's natural language command and return structured JSON.\n` +
                  `Supported actions:\n` +
                  `1. "open_url": When the user asks to open a web app or website (e.g., ChatGPT -> https://chatgpt.com, YouTube -> https://www.youtube.com, Google -> https://www.google.com, GitHub -> https://github.com, Gmail -> https://mail.google.com, or any explicit domain/website).\n` +
                  `2. "search_web": When the user asks to search the internet or look something up -> url MUST be "https://www.google.com/search?q=" + URL-encoded query, and query set to the search terms.\n` +
                  `3. "navigate_app": When the user asks to switch to a screen inside NOVA itself -> targetView must be one of "chat", "settings", "pricing", "voice", "enables", "cart".\n` +
                  `4. "unsupported_device_action": If the user asks for an OS-level / native Android hardware or background action that a web browser cannot execute directly (e.g., changing phone Wi-Fi/Bluetooth, taking a system screenshot, reading SMS, drawing over other native apps, force-closing another app). NEVER pretend you executed an unsupported device action; clearly state it requires native Android system permissions not available from the web client.\n` +
                  `5. "chat_reply": For general questions, brainstorming, or conversational help.\n` +
                  `Keep replies crisp, honest, and 1-3 sentences.`,
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    actionType: {
                      type: Type.STRING,
                      description:
                        'One of: open_url, search_web, navigate_app, chat_reply, unsupported_device_action',
                    },
                    label: {
                      type: Type.STRING,
                      description: 'Short button label such as "Open YouTube" or "Search Google"',
                    },
                    url: {
                      type: Type.STRING,
                      description: 'Safe https:// URL for open_url or search_web actions',
                    },
                    targetView: {
                      type: Type.STRING,
                      description: 'For navigate_app: chat, settings, pricing, voice, enables, or cart',
                    },
                    query: {
                      type: Type.STRING,
                      description: 'Search query string for search_web actions',
                    },
                    reply: {
                      type: Type.STRING,
                      description: 'Clear, helpful response message from Agent #101',
                    },
                  },
                  required: ['actionType', 'label', 'reply'],
                },
              },
            }),
          11000,
          `Agent command (${model})`
        );
        if (response?.text) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Agent command with ${model} failed:`, String(err?.message || '').slice(0, 120));
      }
    }

    if (!response?.text) {
      const parsedErr = parseGeminiApiError(lastError);
      return res.status(200).json({
        success: false,
        error: parsedErr.message,
      });
    }

    const parsed = JSON.parse(response.text.trim());
    const allowedActions = [
      'open_url',
      'search_web',
      'navigate_app',
      'chat_reply',
      'unsupported_device_action',
    ];
    const actionType = allowedActions.includes(parsed.actionType)
      ? parsed.actionType
      : 'chat_reply';

    const safeUrl =
      (actionType === 'open_url' || actionType === 'search_web') && isSafeHttpsUrl(parsed.url)
        ? parsed.url
        : actionType === 'search_web' && parsed.query
        ? `https://www.google.com/search?q=${encodeURIComponent(String(parsed.query))}`
        : undefined;

    const validViews = ['chat', 'settings', 'pricing', 'voice', 'enables', 'cart', 'work'];
    const targetView =
      actionType === 'navigate_app' && validViews.includes(parsed.targetView)
        ? parsed.targetView
        : undefined;

    return res.status(200).json({
      success: true,
      agentId: record.agentId,
      reply: parsed.reply || 'Command processed by WORK Agent.',
      action:
        actionType === 'chat_reply'
          ? undefined
          : {
              type: actionType,
              label: parsed.label || 'Continue',
              url: safeUrl,
              targetView,
              query: parsed.query,
            },
    });
  } catch (error: any) {
    console.error('Error in /api/agent/command:', error);
    const parsedErr = parseGeminiApiError(error);
    return res.status(200).json({
      success: false,
      error: parsedErr.message || 'Failed to process WORK Agent command.',
    });
  }
});

// WORK Full-Screen Agent Execution Endpoint (deterministic resolver + AI multi-model planning + detailed diagnostics)
app.post('/api/work/execute', async (req: Request, res: Response) => {
  try {
    const {
      agentId = '101',
      command,
      history = [],
      requestedModel,
    } = req.body || {};

    if (!command || typeof command !== 'string' || !command.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please enter or speak a command for your WORK Agent.',
        errorCode: 'EMPTY_COMMAND',
        errorStage: 'Understanding Command',
        httpStatus: 400,
        suggestion: 'Type a command such as "Open ChatGPT", "Open Nova AI settings", or "Search for AI news".',
      });
    }

    const trimmedCommand = command.trim();
    const apiKey = process.env.GEMINI_API_KEY;
    const normalizedModel =
      typeof requestedModel === 'string' && CANDIDATE_MODELS.includes(requestedModel)
        ? requestedModel
        : 'gemini-4-hydrogen';
    const modelsToTry = [
      normalizedModel,
      ...CANDIDATE_MODELS.filter((m) => m !== normalizedModel),
    ];

    const runSearchGrounding = async (searchQueryText: string): Promise<{
      reply?: string;
      groundingSources: { title: string; url: string }[];
    }> => {
      const groundingSources: { title: string; url: string }[] = [];
      if (!apiKey) return { groundingSources };

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      for (const model of modelsToTry) {
        try {
          const searchResponse = await withServerTimeout(
            () =>
              ai.models.generateContent({
                model,
                contents: `Provide a crisp, accurate, helpful summary answering: "${searchQueryText}"`,
                config: {
                  tools: [{ googleSearch: {} }],
                  systemInstruction: `You are WORK Agent #${agentId}. Summarize real search findings clearly in 2-4 concise sentences or bullet points.`,
                },
              }),
            9000,
            `WORK Search Grounding (${model})`
          );

          const chunks = (searchResponse.candidates?.[0] as any)?.groundingMetadata?.groundingChunks;
          if (Array.isArray(chunks)) {
            for (const chunk of chunks) {
              if (chunk?.web?.uri && isSafeHttpsUrl(chunk.web.uri)) {
                groundingSources.push({
                  title: chunk.web.title || chunk.web.uri,
                  url: chunk.web.uri,
                });
              }
            }
          }

          if (searchResponse.text) {
            return { reply: searchResponse.text, groundingSources };
          }
        } catch (searchErr: any) {
          console.warn(
            `WORK search grounding fallback (${model}):`,
            String(searchErr?.message || '').slice(0, 120)
          );
        }
      }
      return { groundingSources };
    };

    // 1. Run deterministic resolver first so known apps, URLs, NOVA screens, searches & unsupported OS checks execute reliably
    const deterministic = resolveDeterministicWorkCommand(trimmedCommand, String(agentId));
    if (deterministic) {
      let finalReply = deterministic.reply;
      let groundingSources: { title: string; url: string }[] = [];

      if (deterministic.actionType === 'search_web' && deterministic.query) {
        const grounded = await runSearchGrounding(deterministic.query);
        if (grounded.reply) {
          finalReply = grounded.reply;
          groundingSources = grounded.groundingSources;
        } else {
          finalReply = `Live AI search summary is temporarily unavailable, so Agent ${agentId} prepared a direct Google Search link for "${deterministic.query}".`;
        }
      }

      return res.status(200).json({
        success: true,
        agentId: String(agentId),
        interpretedIntent: deterministic.interpretedIntent,
        targetAppOrSite: deterministic.targetAppOrSite,
        actionType: deterministic.actionType,
        isSupported: deterministic.isSupported,
        requiresPermission: deterministic.requiresPermission,
        actionLabel: deterministic.actionLabel,
        url: deterministic.url,
        targetView: deterministic.targetView,
        query: deterministic.query,
        reply: finalReply,
        groundingSources,
        unsupportedReason: deterministic.unsupportedReason,
        alternativeSuggestion: deterministic.alternativeSuggestion,
        errorCode: deterministic.errorCode,
        errorStage: deterministic.errorStage,
      });
    }

    // 2. Open-ended natural language planning via Gemini with fallback & timeout
    if (!apiKey) {
      return res.status(200).json({
        success: false,
        error: 'GEMINI_API_KEY is not configured in Settings > Secrets.',
        errorCode: 'MISSING_API_KEY',
        errorStage: 'Understanding & AI Planning',
        httpStatus: 401,
        technicalDetail: 'process.env.GEMINI_API_KEY is empty on the backend server.',
        suggestion: 'Configure GEMINI_API_KEY in Secrets, or use direct commands like "Open ChatGPT", "Open Google", or "Search ...".',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const recentHistoryText = Array.isArray(history)
      ? history
          .slice(-6)
          .map((h: any) => `- "${h.command}" -> ${h.status} (${h.targetAppOrSite || h.actionType || 'reply'})`)
          .join('\n')
      : '';

    const planPrompt = [
      recentHistoryText ? `Recent Agent #${agentId} Commands:\n${recentHistoryText}\n` : '',
      `User Command: "${trimmedCommand}"`,
    ]
      .filter(Boolean)
      .join('\n');

    let planResponse: any = null;
    let lastPlanError: any = null;

    for (const model of modelsToTry) {
      try {
        planResponse = await withServerTimeout(
          () =>
            ai.models.generateContent({
              model,
              contents: planPrompt,
              config: {
                systemInstruction:
                  `You are WORK Agent #${agentId}, an AI control center inside NOVA AI Assistant.\n` +
                  `Analyze the user's natural language command and return structured JSON describing your execution plan.\n` +
                  `Available actionType values:\n` +
                  `1. "open_url": User wants to open an external web application or website (examples: ChatGPT -> https://chatgpt.com, Google -> https://www.google.com, YouTube -> https://www.youtube.com, GitHub -> https://github.com, Gmail -> https://mail.google.com, WhatsApp Web -> https://web.whatsapp.com, Wikipedia -> https://www.wikipedia.org, or any domain/website mentioned).\n` +
                  `   - Set isSupported: true, requiresPermission: true, url: exact valid https:// URL, targetAppOrSite: friendly app/site name.\n` +
                  `2. "navigate_app": User wants to open or navigate to a screen inside NOVA AI Assistant itself ("settings", "pricing", "cart", "enables", "voice", or "chat" for home/chat).\n` +
                  `   - Set isSupported: true, requiresPermission: false, targetView: one of "chat", "settings", "pricing", "voice", "enables", "cart".\n` +
                  `3. "search_web": User wants to search the internet or find real-time / factual information.\n` +
                  `   - Set isSupported: true, requiresPermission: false, query: clean search query, url: "https://www.google.com/search?q=" + URL-encoded query, targetAppOrSite: "Web Search".\n` +
                  `4. "unsupported_device_action": User asks for a hardware, OS-level, or private native app action that a web browser CANNOT execute directly without native device privileges (e.g., toggle Wi-Fi/Bluetooth/flashlight, make phone calls, read/send native SMS, uninstall apps, change phone volume, take system screenshots, silently control native apps in the background).\n` +
                  `   - Set isSupported: false, requiresPermission: false, unsupportedReason: honest explanation of why browser sandbox cannot perform this action, alternativeSuggestion: practical web alternative.\n` +
                  `5. "chat_reply": Conversational question, drafting, brainstorming, or general assistance that doesn't require opening a URL or searching the web.\n` +
                  `   - Set isSupported: true, requiresPermission: false.\n` +
                  `CRITICAL HONESTY RULE: Never claim a native OS or device action was completed when running in a web environment.`,
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    interpretedIntent: {
                      type: Type.STRING,
                      description: 'Concise 1-sentence summary of what the user asked to do.',
                    },
                    targetAppOrSite: {
                      type: Type.STRING,
                      description: 'Identified application, website, NOVA section, or topic name.',
                    },
                    actionType: {
                      type: Type.STRING,
                      description: 'One of: open_url, navigate_app, search_web, unsupported_device_action, chat_reply',
                    },
                    isSupported: {
                      type: Type.BOOLEAN,
                      description: 'Whether the action can genuinely be executed or launched from NOVA web runtime.',
                    },
                    requiresPermission: {
                      type: Type.BOOLEAN,
                      description: 'True when launching an external site/app in a new tab.',
                    },
                    actionLabel: {
                      type: Type.STRING,
                      description: 'Button label like "Open ChatGPT", "Open Settings", "Open Search Results".',
                    },
                    url: {
                      type: Type.STRING,
                      description: 'Safe https:// URL when actionType is open_url or search_web.',
                    },
                    targetView: {
                      type: Type.STRING,
                      description: 'For navigate_app: chat, settings, pricing, voice, enables, or cart.',
                    },
                    query: {
                      type: Type.STRING,
                      description: 'Clean search query when actionType is search_web.',
                    },
                    reply: {
                      type: Type.STRING,
                      description: 'Clear 1-3 sentence agent response explaining the plan or answer.',
                    },
                    unsupportedReason: {
                      type: Type.STRING,
                      description: 'Honest explanation if isSupported is false.',
                    },
                    alternativeSuggestion: {
                      type: Type.STRING,
                      description: 'Helpful alternative suggestion if isSupported is false.',
                    },
                  },
                  required: ['interpretedIntent', 'targetAppOrSite', 'actionType', 'isSupported', 'requiresPermission', 'actionLabel', 'reply'],
                },
              },
            }),
          11000,
          `WORK Plan (${model})`
        );
        if (planResponse?.text) break;
      } catch (err: any) {
        lastPlanError = err;
        console.warn(`WORK planning (${model}) failed:`, String(err?.message || '').slice(0, 120));
      }
    }

    if (!planResponse?.text) {
      const parsedErr = parseGeminiApiError(lastPlanError);
      return res.status(200).json({
        success: false,
        error: parsedErr.message,
        errorCode: parsedErr.code,
        errorStage: 'Understanding & AI Planning',
        httpStatus: parsedErr.httpStatus,
        technicalDetail: parsedErr.technicalDetail,
        suggestion: parsedErr.suggestion,
      });
    }

    let parsed: any = {};
    try {
      parsed = JSON.parse(planResponse.text.trim());
    } catch (parseErr: any) {
      return res.status(200).json({
        success: false,
        error: 'WORK Agent planner returned malformed structured output.',
        errorCode: 'PLAN_PARSE_ERROR',
        errorStage: 'Planning Task',
        technicalDetail: String(parseErr?.message || 'JSON parse failed'),
        suggestion: 'Click Retry Command or rephrase your instruction concisely.',
      });
    }

    const allowedActions = [
      'open_url',
      'navigate_app',
      'search_web',
      'unsupported_device_action',
      'chat_reply',
    ];
    const actionType = allowedActions.includes(parsed.actionType)
      ? parsed.actionType
      : 'chat_reply';

    const safeUrl =
      (actionType === 'open_url' || actionType === 'search_web') && isSafeHttpsUrl(parsed.url)
        ? parsed.url
        : actionType === 'search_web' && parsed.query
        ? `https://www.google.com/search?q=${encodeURIComponent(String(parsed.query))}`
        : undefined;

    const validNavViews = ['chat', 'settings', 'pricing', 'voice', 'enables', 'cart'];
    const targetView =
      actionType === 'navigate_app' && validNavViews.includes(parsed.targetView)
        ? parsed.targetView
        : undefined;

    let finalReply = parsed.reply || `Processed command for ${parsed.targetAppOrSite || 'task'}.`;
    let groundingSources: { title: string; url: string }[] = [];

    if (actionType === 'search_web') {
      const grounded = await runSearchGrounding(String(parsed.query || trimmedCommand));
      if (grounded.reply) {
        finalReply = grounded.reply;
        groundingSources = grounded.groundingSources;
      }
    }

    return res.status(200).json({
      success: true,
      agentId: String(agentId),
      interpretedIntent: parsed.interpretedIntent || trimmedCommand,
      targetAppOrSite: parsed.targetAppOrSite || 'WORK Task',
      actionType,
      isSupported: actionType === 'unsupported_device_action' ? false : Boolean(parsed.isSupported ?? true),
      requiresPermission: Boolean(parsed.requiresPermission),
      actionLabel: parsed.actionLabel || 'Continue',
      url: safeUrl,
      targetView,
      query: parsed.query,
      reply: finalReply,
      groundingSources,
      unsupportedReason: parsed.unsupportedReason,
      alternativeSuggestion: parsed.alternativeSuggestion,
      errorCode: actionType === 'unsupported_device_action' ? 'UNSUPPORTED_DEVICE_CAPABILITY' : undefined,
      errorStage: actionType === 'unsupported_device_action' ? 'Capability Verification' : undefined,
    });
  } catch (error: any) {
    console.error('Error in /api/work/execute:', error);
    const parsedErr = parseGeminiApiError(error);
    return res.status(200).json({
      success: false,
      error: parsedErr.message || 'Failed to execute WORK Agent command.',
      errorCode: parsedErr.code || 'INTERNAL_SERVER_ERROR',
      errorStage: 'Execution Pipeline',
      httpStatus: parsedErr.httpStatus,
      technicalDetail: parsedErr.technicalDetail,
      suggestion: parsedErr.suggestion,
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NOVA server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

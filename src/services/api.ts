import { Message, GroundingSource } from '../types.ts';

export interface ChatResponse {
  success: boolean;
  text?: string;
  error?: string;
  model?: string;
  groundingSources?: GroundingSource[];
}

/**
 * Sends conversation messages to the Gemini-backed server endpoint.
 */
export async function sendChatMessage(
  messages: Message[],
  useSearchGrounding: boolean = false,
  requestedModel: string = 'gemini-4-hydrogen',
  reasoningMode: boolean = false
): Promise<ChatResponse> {
  return sendChatMessageViaServer(messages, useSearchGrounding, requestedModel, reasoningMode);
}

/**
 * Client-to-server call via /api/chat proxy endpoint
 */
async function sendChatMessageViaServer(
  messages: Message[],
  useSearchGrounding: boolean = false,
  requestedModel: string = 'gemini-4-hydrogen',
  reasoningMode: boolean = false
): Promise<ChatResponse> {
  try {
    const validMessages = messages
      .filter(
        (m) =>
          m &&
          !m.isError &&
          ((typeof m.content === 'string' && m.content.trim().length > 0) || Boolean(m.attachment))
      )
      .map((m) => ({
        role: m.role,
        content: (m.content || '').trim(),
        attachment: m.attachment,
      }));

    if (validMessages.length === 0) {
      return {
        success: false,
        error: 'Please enter a message to begin chatting.',
      };
    }

    const payload = {
      messages: validMessages,
      useSearchGrounding,
      requestedModel,
      reasoningMode,
    };

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = 'Server responded with an error.';
      try {
        const errorJson = JSON.parse(errorText);
        errorMsg = errorJson.error || errorMsg;
      } catch {
        // use default
      }
      return {
        success: false,
        error: errorMsg,
      };
    }

    const data = await response.json();
    return {
      success: Boolean(data.success),
      text: data.text,
      error: data.error,
      model: data.model,
      groundingSources: data.groundingSources,
    };
  } catch (err: any) {
    console.error('Network error communicating with NOVA server:', err);
    return {
      success: false,
      error: 'Could not connect to NOVA server. Please check your network and click "Try Again".',
    };
  }
}

/**
 * Audio transcription using gemini-3.5-transcribe
 */
export async function transcribeAudio(
  audioBase64: string,
  mimeType: string = 'audio/webm'
): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const res = await fetch('/api/transcribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ audioBase64, mimeType }),
    });

    if (!res.ok) {
      const errText = await res.text();
      let msg = 'Transcription failed';
      try {
        msg = JSON.parse(errText).error || msg;
      } catch {
        // ignore
      }
      return { success: false, error: msg };
    }

    const data = await res.json();
    return {
      success: Boolean(data.success),
      text: data.text,
      error: data.error,
    };
  } catch (e: any) {
    return {
      success: false,
      error: e?.message || 'Failed to send audio for transcription',
    };
  }
}

/**
 * Summarize conversation history using the current selected model
 */
export async function summarizeConversation(
  messages: Message[],
  requestedModel: string = 'gemini-4-hydrogen'
): Promise<{ success: boolean; summary?: string; model?: string; error?: string }> {
  try {
    const validMessages = messages
      .filter(
        (m) =>
          m &&
          !m.isError &&
          ((typeof m.content === 'string' && m.content.trim().length > 0) || Boolean(m.attachment))
      )
      .map((m) => ({
        role: m.role,
        content: (m.content || '').trim(),
        attachment: m.attachment ? { name: m.attachment.name, kind: m.attachment.kind } : undefined,
      }));

    if (validMessages.length === 0) {
      return {
        success: false,
        error: 'Start a conversation before summarizing.',
      };
    }

    const res = await fetch('/api/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: validMessages, requestedModel }),
    });

    if (!res.ok) {
      return {
        success: false,
        error: 'Failed to reach summarization service.',
      };
    }

    const data = await res.json();
    return {
      success: Boolean(data.success),
      summary: data.summary,
      model: data.model,
      error: data.error,
    };
  } catch (e: any) {
    return {
      success: false,
      error: e?.message || 'Network error while generating summary.',
    };
  }
}

/**
 * Health check for server status and Gemini configuration
 */
export async function checkServerHealth(): Promise<{ status: string; hasApiKey: boolean; model: string }> {
  try {
    const res = await fetch('/api/health');
    return await res.json();
  } catch (e) {
    return { status: 'offline', hasApiKey: false, model: 'gemini-4-hydrogen' };
  }
}

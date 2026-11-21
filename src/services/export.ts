import { Conversation } from '../types';

export type ExportFormat = 'txt' | 'md';

function formatModelDisplay(model?: string): string {
  if (!model) return '';
  if (model === 'gemini-4-hydrogen') return 'Gemini 4 Hydrogen';
  if (model === 'gemini-3.1-flash-lite') return 'Gemini 3.1 Flash-Lite';
  return model.replace('gemini-', 'Gemini ');
}

export function sanitizeFilename(title: string): string {
  const cleaned = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return cleaned || 'nova-conversation';
}

export function formatConversationAsMarkdown(conversation: Conversation): string {
  const title = conversation.title?.trim() || 'NOVA Conversation';
  const exportedAt = new Date().toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const lines: string[] = [
    `# ${title}`,
    '',
    `Exported from NOVA on ${exportedAt} · ${conversation.messages.length} messages`,
    '',
    '---',
    '',
  ];

  for (const msg of conversation.messages) {
    const time = new Date(msg.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const speaker = msg.role === 'user' ? 'You' : 'NOVA';
    const modelLabel = !msg.isError && msg.role === 'model' ? formatModelDisplay(msg.model) : '';
    const meta = [time, modelLabel].filter(Boolean).join(' · ');

    lines.push(`## ${speaker} (${meta})`);
    lines.push('');

    if (msg.isError) {
      lines.push(`> Error: ${msg.content}`);
    } else {
      lines.push(msg.content);
    }

    if (msg.groundingSources && msg.groundingSources.length > 0) {
      lines.push('');
      lines.push('**Sources:**');
      for (const source of msg.groundingSources) {
        lines.push(`- [${source.title}](${source.url})`);
      }
    }

    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

export function formatConversationAsText(conversation: Conversation): string {
  const title = conversation.title?.trim() || 'NOVA Conversation';
  const exportedAt = new Date().toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const divider = '='.repeat(48);
  const subDivider = '-'.repeat(48);

  const lines: string[] = [
    title,
    `Exported from NOVA on ${exportedAt} (${conversation.messages.length} messages)`,
    divider,
    '',
  ];

  for (const msg of conversation.messages) {
    const time = new Date(msg.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const speaker = msg.role === 'user' ? 'You' : 'NOVA';
    const modelLabel = !msg.isError && msg.role === 'model' ? formatModelDisplay(msg.model) : '';
    const header = modelLabel ? `[${time}] ${speaker} (${modelLabel}):` : `[${time}] ${speaker}:`;

    lines.push(header);
    if (msg.isError) {
      lines.push(`[Error] ${msg.content}`);
    } else {
      lines.push(msg.content);
    }

    if (msg.groundingSources && msg.groundingSources.length > 0) {
      lines.push('');
      lines.push('Sources:');
      for (const source of msg.groundingSources) {
        lines.push(`- ${source.title}: ${source.url}`);
      }
    }

    lines.push('');
    lines.push(subDivider);
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

export function downloadConversationFile(conversation: Conversation, format: ExportFormat): void {
  const content =
    format === 'md'
      ? formatConversationAsMarkdown(conversation)
      : formatConversationAsText(conversation);

  const mimeType = format === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8';
  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = `${sanitizeFilename(conversation.title || 'nova-conversation')}-${dateStamp}.${format}`;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

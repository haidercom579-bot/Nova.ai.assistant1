import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Split content by code blocks first
  const blocks = parseBlocks(content);

  return (
    <div className="space-y-3 leading-relaxed text-[15px] break-words">
      {blocks.map((block, idx) => {
        if (block.type === 'code') {
          return <CodeBlock key={idx} language={block.language} code={block.content} />;
        }
        if (block.type === 'quote') {
          return (
            <blockquote
              key={idx}
              className="border-l-4 border-indigo-500/50 pl-3.5 my-2 italic text-slate-700 dark:text-zinc-300"
            >
              {renderInline(block.content)}
            </blockquote>
          );
        }
        if (block.type === 'list') {
          return (
            <ul key={idx} className="space-y-1.5 my-2 pl-5 list-disc marker:text-indigo-500">
              {(block.items || []).map((item, itemIdx) => (
                <li key={itemIdx}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === 'ordered-list') {
          return (
            <ol key={idx} className="space-y-1.5 my-2 pl-5 list-decimal marker:text-indigo-500 marker:font-medium">
              {(block.items || []).map((item, itemIdx) => (
                <li key={itemIdx}>{renderInline(item)}</li>
              ))}
            </ol>
          );
        }
        if (block.type === 'heading') {
          if (block.level === 1) {
            return (
              <h1 key={idx} className="text-xl font-bold mt-4 mb-2 text-slate-900 dark:text-zinc-50 tracking-tight">
                {renderInline(block.content)}
              </h1>
            );
          }
          if (block.level === 2) {
            return (
              <h2 key={idx} className="text-lg font-semibold mt-3 mb-1.5 text-slate-900 dark:text-zinc-100 tracking-tight">
                {renderInline(block.content)}
              </h2>
            );
          }
          return (
            <h3 key={idx} className="text-base font-semibold mt-2.5 mb-1 text-slate-800 dark:text-zinc-200">
              {renderInline(block.content)}
            </h3>
          );
        }
        return (
          <p key={idx} className="whitespace-pre-line text-slate-800 dark:text-zinc-200">
            {renderInline(block.content)}
          </p>
        );
      })}
    </div>
  );
};

interface Block {
  type: 'code' | 'paragraph' | 'quote' | 'list' | 'ordered-list' | 'heading';
  content: string;
  language?: string;
  level?: number;
  items?: string[];
}

function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  const lines = markdown.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Check for fenced code blocks
    if (line.trim().startsWith('```')) {
      const language = line.trim().slice(3).trim() || 'code';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({
        type: 'code',
        language,
        content: codeLines.join('\n'),
      });
      i++;
      continue;
    }

    // Headings
    if (line.startsWith('#')) {
      const match = line.match(/^(#{1,3})\s+(.*)$/);
      if (match) {
        blocks.push({
          type: 'heading',
          level: match[1].length,
          content: match[2],
        });
        i++;
        continue;
      }
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      blocks.push({
        type: 'quote',
        content: quoteLines.join('\n'),
      });
      continue;
    }

    // Unordered lists
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      blocks.push({
        type: 'list',
        content: '',
        items,
      });
      continue;
    }

    // Ordered lists
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push({
        type: 'ordered-list',
        content: '',
        items,
      });
      continue;
    }

    // Empty lines
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph: collect lines until an empty line or block token
    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('> ') &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }

    if (paragraphLines.length > 0) {
      blocks.push({
        type: 'paragraph',
        content: paragraphLines.join('\n'),
      });
    }
  }

  return blocks;
}

// Inline token rendering (bold, italic, inline code, links)
function renderInline(text: string): React.ReactNode[] {
  // Regex to match code `...`, bold **...**, italic *...*, links [text](url)
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Inline code
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 mx-0.5 text-[13px] font-mono rounded bg-slate-200/70 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-300 border border-slate-300/50 dark:border-zinc-700/50"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={index} className="font-semibold text-slate-900 dark:text-zinc-50">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={index} className="italic text-slate-800 dark:text-zinc-200">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Link
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, url] = linkMatch;
      return (
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2 hover:text-indigo-500"
        >
          {label}
        </a>
      );
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

const CodeBlock: React.FC<{ language?: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-900 text-slate-100 shadow-sm">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-950/70 border-b border-slate-800/80 text-xs text-slate-400">
        <span className="font-mono text-[11px] uppercase tracking-wider">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-[13px] font-mono leading-relaxed text-slate-100 selection:bg-indigo-600">
        <code>{code}</code>
      </pre>
    </div>
  );
};

'use client';
import React, { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import { Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import 'highlight.js/styles/github-dark.min.css';

interface MarkdownRendererProps {
  content: string;
  fontSize: 'sm' | 'md' | 'lg';
}

// ── SVG icon strings (lucide v0.577.0 paths) ──────────────────────────────────

function makeSvg(paths: string, color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top:2px;flex-shrink:0">${paths}</svg>`;
}

const CALLOUT_CONFIG: Record<string, { color: string; label: string; svgPaths: string }> = {
  info: {
    color: '#3B82F6',
    label: 'Info',
    svgPaths: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  },
  warning: {
    color: '#EAB308',
    label: 'Attention',
    svgPaths:
      '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  },
  danger: {
    color: '#EF4444',
    label: 'Danger',
    svgPaths:
      '<path d="M12 16h.01"/><path d="M12 8v4"/><path d="M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z"/>',
  },
  tip: {
    color: '#22C55E',
    label: 'Conseil',
    svgPaths:
      '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  },
  note: {
    color: '#A855F7',
    label: 'Note',
    svgPaths:
      '<path d="M21 9a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"/><path d="M15 3v5a1 1 0 0 0 1 1h5"/>',
  },
};

// ── MDAST node type (minimal, avoids @types/mdast import) ─────────────────────

type MdastNode = {
  type: string;
  children?: MdastNode[];
  value?: string;
  url?: string;
  lang?: string;
  ordered?: boolean;
};

// ── Serialize MDAST phrasing content to HTML ──────────────────────────────────

function phrasingToHtml(nodes: MdastNode[]): string {
  return nodes
    .map((n) => {
      switch (n.type) {
        case 'text':
          return (n.value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        case 'break':
          return '<br>';
        case 'strong':
          return `<strong>${phrasingToHtml(n.children ?? [])}</strong>`;
        case 'emphasis':
          return `<em>${phrasingToHtml(n.children ?? [])}</em>`;
        case 'inlineCode':
          return `<code style="background:var(--surface);color:var(--accent);font-family:monospace;font-size:0.85em;padding:1px 4px;border-radius:3px">${n.value ?? ''}</code>`;
        case 'link':
          return `<a href="${n.url ?? ''}" style="color:var(--accent);text-decoration:underline">${phrasingToHtml(n.children ?? [])}</a>`;
        default:
          return phrasingToHtml(n.children ?? []);
      }
    })
    .join('');
}

function blockNodesToHtml(nodes: MdastNode[]): string {
  return nodes
    .map((n) => {
      switch (n.type) {
        case 'paragraph':
          return `<p style="margin-bottom:0.5rem">${phrasingToHtml(n.children ?? [])}</p>`;
        case 'list': {
          const tag = n.ordered ? 'ol' : 'ul';
          const style = n.ordered ? 'list-style:decimal' : 'list-style:disc';
          const items = (n.children ?? [])
            .map((li) => `<li>${blockNodesToHtml(li.children ?? [])}</li>`)
            .join('');
          return `<${tag} style="${style};padding-left:1.5rem;margin-bottom:0.5rem">${items}</${tag}>`;
        }
        case 'code':
          return `<pre style="background:#0D0F1A;border-radius:4px;padding:8px;overflow-x:auto;font-family:monospace;font-size:0.85em;margin-bottom:0.5rem"><code>${n.value ?? ''}</code></pre>`;
        default:
          return phrasingToHtml(n.children ?? []);
      }
    })
    .join('');
}

// ── remarkCallouts — remark plugin ───────────────────────────────────────────

type RootNode = { type: 'root'; children: MdastNode[] };

function remarkCallouts() {
  return (tree: RootNode) => {
    walkAndTransform(tree);
  };
}

function walkAndTransform(node: MdastNode | RootNode): void {
  if (!node.children) return;
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child.type === 'blockquote') {
      const replacement = tryConvertCallout(child);
      if (replacement) {
        node.children[i] = replacement;
        continue;
      }
    }
    walkAndTransform(child);
  }
}

function tryConvertCallout(node: MdastNode): MdastNode | null {
  const children = node.children ?? [];
  if (children.length === 0) return null;

  const firstPara = children[0];
  if (firstPara.type !== 'paragraph') return null;

  const paraChildren = firstPara.children ?? [];
  if (paraChildren.length === 0) return null;

  // First text node in the paragraph
  const firstTextNode = paraChildren[0];
  if (firstTextNode.type !== 'text') return null;

  const fullText = firstTextNode.value ?? '';
  const firstLine = fullText.split('\n')[0];
  const match = firstLine.match(/^\[!(info|warning|danger|tip|note)\]\s*(.*)/);
  if (!match) return null;

  const type = match[1];
  const customTitle = match[2].trim();
  const cfg = CALLOUT_CONFIG[type];
  const title = customTitle || cfg.label;

  // Build content HTML from remaining text in first paragraph + subsequent children
  const restOfFirstLine = fullText.split('\n').slice(1).join('\n').trim();
  const restOfParaNodes = paraChildren.slice(1); // nodes after the first text node (breaks, etc.)
  const remainingBlockChildren = children.slice(1); // paragraphs 2+

  let contentHtml = '';

  if (restOfFirstLine) {
    contentHtml += `<p style="margin-bottom:0.5rem">${restOfFirstLine}</p>`;
  }

  // Handle remaining phrasing nodes in same paragraph (after first text node)
  if (restOfParaNodes.length > 0) {
    const phraseHtml = phrasingToHtml(restOfParaNodes);
    if (phraseHtml.trim()) {
      contentHtml += `<p style="margin-bottom:0.5rem">${phraseHtml}</p>`;
    }
  }

  if (remainingBlockChildren.length > 0) {
    contentHtml += blockNodesToHtml(remainingBlockChildren);
  }

  const iconSvg = makeSvg(cfg.svgPaths, cfg.color);

  const html = `<div class="callout-${type} rounded-r-xl p-4 mb-4 flex gap-3">${iconSvg}<div style="flex:1"><p style="font-weight:600;font-size:0.875rem;color:${cfg.color};margin-bottom:4px">${title}</p><div style="font-size:0.875rem">${contentHtml}</div></div></div>`;

  return { type: 'html', value: html };
}

// ── Highlight preprocessor (Obsidian marks + ==text==) ────────────────────────

const COLOR_MAP: Record<string, { bg: string; fg: string }> = {
  red:    { bg: 'rgba(239,68,68,0.2)',   fg: '#EF4444' },
  green:  { bg: 'rgba(34,197,94,0.2)',   fg: '#22C55E' },
  blue:   { bg: 'rgba(59,130,246,0.2)',  fg: '#3B82F6' },
  yellow: { bg: 'rgba(234,179,8,0.2)',   fg: '#EAB308' },
  orange: { bg: 'rgba(249,115,22,0.2)',  fg: '#F97316' },
  purple: { bg: 'rgba(168,85,247,0.2)',  fg: '#A855F7' },
};

function preprocessMarkdown(md: string): string {
  return md
    // Obsidian Highlightr mark tags → CSS classes
    .replace(/<mark\s+style="background:\s*#FF5582[^"]*">/gi, '<span class="highlight-red">')
    .replace(/<mark\s+style="background:\s*#ADCCFF[^"]*">/gi, '<span class="highlight-blue">')
    .replace(/<mark\s+style="background:\s*#BBFABB[^"]*">/gi, '<span class="highlight-green">')
    .replace(/<mark\s+style="background:\s*#FFF3A3[^"]*">/gi, '<span class="highlight-yellow">')
    .replace(/<\/mark>/gi, '</span>')
    // ==color:text== colored highlight
    .replace(/==(red|green|blue|yellow|orange|purple):([^=\n]+)==/g, (_, color, text) => {
      const c = COLOR_MAP[color];
      return `<mark style="background:${c.bg};color:${c.fg};border-radius:0.25rem;padding:0 2px">${text}</mark>`;
    })
    // ==text== accent highlight
    .replace(/==([^=\n]+)==/g, '<mark style="background:rgba(99,102,241,0.3);color:#6366F1;border-radius:0.25rem;padding:0 2px">$1</mark>');
}

// ── CodeBlock component ───────────────────────────────────────────────────────

function CodeBlock({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  const handleCopy = async () => {
    if (!preRef.current) return;
    await navigator.clipboard.writeText(preRef.current.innerText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <pre
      ref={preRef}
      className="relative bg-[#0D0F1A] rounded-lg p-4 overflow-x-auto font-mono text-sm mb-4 group"
      {...props}
    >
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-surface border border-border rounded px-2 py-1 text-xs text-muted hover:text-foreground transition-opacity duration-150 flex items-center gap-1 cursor-pointer"
        aria-label="Copier le code"
      >
        {copied ? 'Copié !' : <Copy size={14} />}
      </button>
      {children}
    </pre>
  );
}

// ── Font size map ──────────────────────────────────────────────────────────────

const fontSizeMap = { sm: 'text-sm', md: 'text-base', lg: 'text-lg' };

// ── MarkdownRenderer ───────────────────────────────────────────────────────────

export default function MarkdownRenderer({ content, fontSize }: MarkdownRendererProps) {
  const processed = preprocessMarkdown(content);

  return (
    <div className={cn('prose prose-invert max-w-none', fontSizeMap[fontSize])}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkCallouts]}
        rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeSlug]}
        components={{
          h2({ children, ...props }) {
            return (
              <h2 className="text-xl font-bold mt-8 mb-3 text-text" {...props}>
                {children}
              </h2>
            );
          },
          h3({ children, ...props }) {
            return (
              <h3 className="text-lg font-semibold mt-6 mb-2 text-text" {...props}>
                {children}
              </h3>
            );
          },
          p({ children }) {
            return <p className="mb-4 leading-relaxed">{children}</p>;
          },
          code({ children, className, ...props }) {
            const isBlock =
              className?.includes('language-') || className?.includes('hljs');
            if (isBlock) {
              return (
                <code className={cn('font-mono text-sm', className)} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code
                className="bg-surface text-accent font-mono text-sm px-1.5 py-0.5 rounded"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre({ children, ...props }) {
            return <CodeBlock {...props}>{children}</CodeBlock>;
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto max-w-full">
                <table className="w-full border-collapse mb-4">{children}</table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="bg-surface border border-border p-2 text-left font-semibold text-sm">
                {children}
              </th>
            );
          },
          td({ children }) {
            return <td className="border border-border p-2 text-sm">{children}</td>;
          },
          ul({ children }) {
            return <ul className="mb-4 pl-6 list-disc">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="mb-4 pl-6 list-decimal">{children}</ol>;
          },
          li({ children }) {
            return <li className="mb-1">{children}</li>;
          },
          strong({ children }) {
            return <strong className="font-semibold text-text">{children}</strong>;
          },
          hr() {
            return <hr className="border-border my-6" />;
          },
          a({ children, href, ...props }) {
            return (
              <a className="text-accent hover:underline" href={href} {...props}>
                {children}
              </a>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-border pl-4 italic text-muted my-4">
                {children}
              </blockquote>
            );
          },
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}

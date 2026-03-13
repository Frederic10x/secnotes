'use client';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import { Info, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import 'highlight.js/styles/github-dark.min.css';

interface MarkdownRendererProps {
  content: string;
  fontSize: 'sm' | 'md' | 'lg';
}

function preprocessHighlights(md: string): string {
  return md
    .replace(/<mark\s+style="background:\s*#FF5582[^"]*">/gi, '<span class="highlight-red">')
    .replace(/<mark\s+style="background:\s*#ADCCFF[^"]*">/gi, '<span class="highlight-blue">')
    .replace(/<mark\s+style="background:\s*#BBFABB[^"]*">/gi, '<span class="highlight-green">')
    .replace(/<mark\s+style="background:\s*#FFF3A3[^"]*">/gi, '<span class="highlight-yellow">')
    .replace(/<\/mark>/gi, '</span>');
}

const fontSizeMap = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export default function MarkdownRenderer({ content, fontSize }: MarkdownRendererProps) {
  const processed = preprocessHighlights(content);

  return (
    <div className={cn('prose prose-invert max-w-none', fontSizeMap[fontSize])}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
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
            return (
              <pre
                className="bg-[#0D0F1A] rounded-lg p-4 overflow-x-auto font-mono text-sm mb-4"
                {...props}
              >
                {children}
              </pre>
            );
          },
          table({ children }) {
            return <table className="w-full border-collapse mb-4">{children}</table>;
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
            const childArray = React.Children.toArray(children);
            const firstChild = childArray[0];
            let firstText = '';
            if (React.isValidElement(firstChild)) {
              const pChildren = React.Children.toArray(
                (firstChild.props as { children?: React.ReactNode }).children ?? [],
              );
              firstText = pChildren.filter((c) => typeof c === 'string').join('');
            }
            const match = firstText.match(/^\[!(info|warning|danger)\]\s*(.*)/);
            if (match) {
              const type = match[1] as 'info' | 'warning' | 'danger';
              const title =
                match[2].trim() || type.charAt(0).toUpperCase() + type.slice(1);
              const bodyChildren = childArray.slice(1);
              const icons = {
                info: <Info size={16} />,
                warning: <AlertTriangle size={16} />,
                danger: <XCircle size={16} />,
              };
              return (
                <div className={`callout callout-${type}`}>
                  <div className="callout-header">
                    {icons[type]}
                    <span className="callout-title">{title}</span>
                  </div>
                  <div className="callout-body">{bodyChildren}</div>
                </div>
              );
            }
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

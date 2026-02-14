'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  if (!content || !content.trim()) {
    return <p className="text-slate-400 italic text-sm">Not specified</p>;
  }

  return (
    <div
      className={[
        'prose prose-slate prose-sm max-w-none',
        // Headings
        'prose-headings:text-slate-900',
        'prose-h2:text-lg prose-h2:font-semibold prose-h2:mt-6 prose-h2:mb-3 prose-h2:pb-2 prose-h2:border-b prose-h2:border-slate-200 first:prose-h2:mt-0',
        'prose-h3:text-base prose-h3:font-semibold prose-h3:mt-4 prose-h3:mb-2',
        // Body
        'prose-p:text-slate-700 prose-p:leading-relaxed',
        'prose-strong:text-slate-900 prose-strong:font-semibold',
        'prose-em:text-slate-600',
        // Lists
        'prose-li:text-slate-700',
        // Links
        'prose-a:text-violet-600 hover:prose-a:text-violet-800 prose-a:underline-offset-2',
        // Code
        'prose-code:bg-slate-100 prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono prose-code:text-slate-800 prose-code:before:content-none prose-code:after:content-none',
        'prose-pre:bg-slate-100 prose-pre:rounded-lg',
        // Dividers
        'prose-hr:border-slate-200',
        className,
      ].filter(Boolean).join(' ')}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

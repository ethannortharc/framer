'use client';

import React from 'react';
import { Frame } from '@/types';
import { MarkdownContent } from './MarkdownContent';

interface FrameDocumentViewProps {
  frame: Frame;
}

/**
 * Combine all frame sections into a single markdown document.
 * Section headings become ## headers within the flowing content.
 */
function buildDocument(frame: Frame): string {
  const parts: string[] = [];

  if (frame.problemStatement.trim()) {
    parts.push(`## Problem Statement\n\n${frame.problemStatement.trim()}`);
  }

  if (frame.rootCause && frame.rootCause.trim()) {
    parts.push(`## Root Cause\n\n${frame.rootCause.trim()}`);
  }

  if (frame.userPerspective.trim()) {
    parts.push(`## User Perspective\n\n${frame.userPerspective.trim()}`);
  }

  if (frame.engineeringFraming.trim()) {
    parts.push(`## Engineering Framing\n\n${frame.engineeringFraming.trim()}`);
  }

  if (frame.validationThinking.trim()) {
    parts.push(`## Validation Thinking\n\n${frame.validationThinking.trim()}`);
  }

  return parts.join('\n\n---\n\n');
}

export function FrameDocumentView({ frame }: FrameDocumentViewProps) {
  const document = buildDocument(frame);

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="px-10 py-8">
        {document ? (
          <MarkdownContent content={document} />
        ) : (
          <p className="text-slate-400 italic text-sm">No content yet</p>
        )}
      </div>
    </div>
  );
}

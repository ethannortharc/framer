'use client';

import React from 'react';
import { Frame } from '@/types';
import { MarkdownContent } from './MarkdownContent';
import { useFrameStore } from '@/store';
import { pickLang } from '@/lib/api/transforms';
import { useT, type Lang } from '@/lib/i18n';
import { t as tFn } from '@/lib/i18n';

interface FrameDocumentViewProps {
  frame: Frame;
}

/**
 * Combine all frame sections into a single markdown document.
 * Section headings become ## headers within the flowing content.
 */
function buildDocument(frame: Frame, lang: Lang): string {
  const parts: string[] = [];

  const ps = pickLang(frame.problemStatement, frame.problemStatementEn, frame.problemStatementZh, lang);
  if (ps.trim()) {
    parts.push(`## ${tFn('section.problemStatement', lang)}\n\n${ps.trim()}`);
  }

  const rc = pickLang(frame.rootCause || '', frame.rootCauseEn, frame.rootCauseZh, lang);
  if (rc && rc.trim()) {
    parts.push(`## ${tFn('section.rootCause', lang)}\n\n${rc.trim()}`);
  }

  const up = pickLang(frame.userPerspective, frame.userPerspectiveEn, frame.userPerspectiveZh, lang);
  if (up.trim()) {
    parts.push(`## ${tFn('section.userPerspective', lang)}\n\n${up.trim()}`);
  }

  const ef = pickLang(frame.engineeringFraming, frame.engineeringFramingEn, frame.engineeringFramingZh, lang);
  if (ef.trim()) {
    parts.push(`## ${tFn('section.engineeringFraming', lang)}\n\n${ef.trim()}`);
  }

  const vt = pickLang(frame.validationThinking, frame.validationThinkingEn, frame.validationThinkingZh, lang);
  if (vt.trim()) {
    parts.push(`## ${tFn('section.validationThinking', lang)}\n\n${vt.trim()}`);
  }

  return parts.join('\n\n---\n\n');
}

export function FrameDocumentView({ frame }: FrameDocumentViewProps) {
  const contentLanguage = useFrameStore((s) => s.contentLanguage);
  const t = useT();
  const document = buildDocument(frame, contentLanguage);

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="px-10 py-8">
        {document ? (
          <MarkdownContent content={document} />
        ) : (
          <p className="text-slate-400 italic text-sm">{t('frame.noContent')}</p>
        )}
      </div>
    </div>
  );
}

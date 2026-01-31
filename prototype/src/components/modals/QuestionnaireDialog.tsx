'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Check,
  RefreshCw,
  ClipboardList,
  FileText,
} from 'lucide-react';
import { FrameSection, FrameType, Frame } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface QuestionnaireDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: FrameSection | null;
  frameType: FrameType;
  frame: Frame;
  onApply: (section: FrameSection, data: any) => void;
}

const sectionLabels: Record<FrameSection, string> = {
  header: 'Problem Statement',
  user: 'User Perspective',
  engineering: 'Engineering Framing',
  validation: 'Validation Thinking',
};

// Markdown templates for each section and frame type
const getSectionTemplate = (section: FrameSection, frameType: FrameType): string => {
  const templates: Record<FrameSection, Record<FrameType, string>> = {
    header: {
      bug: `# Problem Statement

**What is broken or not working?**
<!-- Describe the symptom or error you observed -->


**What should happen instead?**
<!-- Describe the expected behavior -->


**When does this happen?**
<!-- Under what conditions or triggers -->


**Impact Level:**
<!-- Choose one: Critical / High / Medium / Low -->

`,
      feature: `# Problem Statement

**What capability is missing?**
<!-- What should users be able to do that they can't today? -->


**Why is this needed now?**
<!-- What triggered this need? Business context? -->


**Value this provides:**
<!-- Choose or describe: Enables new use case / Improves efficiency / Reduces errors / Better UX -->

`,
      exploration: `# Problem Statement

**What question are you trying to answer?**
<!-- The key uncertainty to resolve -->


**Why does this matter now?**
<!-- What decisions depend on this? -->


**Scope of exploration:**
<!-- Choose: Narrow (specific technical) / Medium (design alternatives) / Broad (strategic) -->

`,
    },
    user: {
      bug: `# User Perspective

**Who encounters this bug?**
<!-- Role or persona, e.g., "Network Administrator" -->


**What are they trying to do when this happens?**
<!-- Their task or goal when the bug occurs -->


**How do they discover the problem?**
<!-- What makes them realize something is wrong? -->


**Is there a workaround?**
<!-- No workaround / Manual workaround / Alternative approach exists -->


**Main pain point:**
<!-- The biggest frustration or impact on their work -->

`,
      feature: `# User Perspective

**Who will use this feature?**
<!-- Primary user role -->


**What is their current workflow?**
<!-- How do they work today without this feature? -->


**What can't they do today?**
<!-- The gap this feature fills -->


**How often would they use this?**
<!-- Daily / Weekly / Monthly / Occasionally -->


**How does this improve their work?**
<!-- The concrete benefit they get -->

`,
      exploration: `# User Perspective

**Who benefits from this exploration?**
<!-- Stakeholder or decision maker who needs the answer -->


**What decision will this inform?**
<!-- The specific choice to be made with findings -->


**What do they know or believe today?**
<!-- Current understanding or assumptions -->


**What's at risk without this exploration?**
<!-- Wrong technical choice / Wasted investment / Missed opportunity -->

`,
    },
    engineering: {
      bug: `# Engineering Framing

**What behavior must ALWAYS hold after the fix?**
<!-- The core invariant or guarantee - this defines correctness -->


**Constraints on the solution:**
<!-- Check all that apply and add details -->
- [ ] Must be backward compatible
- [ ] Cannot change API
- [ ] Performance sensitive
- [ ] Security critical


**What is explicitly OUT of scope?**
<!-- What you won't fix as part of this work -->


**What risks does the fix introduce?**
<!-- Potential side effects or regressions to watch for -->

`,
      feature: `# Engineering Framing

**Most important design principle:**
<!-- The one thing that must not be compromised -->


**Trade-off you're willing to make:**
<!-- Choose: Simplicity over features / Performance over flexibility / Correctness over speed / UX over elegance -->


**What are you NOT building?**
<!-- Explicit exclusions - features for later, out of scope -->


**Technical constraints:**
<!-- Check all that apply -->
- [ ] Must use existing infrastructure
- [ ] New database schema OK
- [ ] Can add dependencies
- [ ] Must be backwards compatible

`,
      exploration: `# Engineering Framing

**Constraints guiding the exploration:**
<!-- Boundaries you must stay within -->


**Approaches explicitly excluded:**
<!-- What you're not considering and why -->


**Expected deliverable:**
<!-- Choose: Recommendation doc / Proof of concept / Technical analysis / Decision matrix -->


**Time budget:**
<!-- Choose: 1-2 days / 1 week / 2 weeks / Ongoing -->

`,
    },
    validation: {
      bug: `# Validation Thinking

**How will you verify the fix works?**
<!-- Observable behavior or specific test -->


**How will you prevent regression?**
<!-- Choose: Automated test / Manual test checklist / Integration test / Monitoring -->


**What would indicate the fix is wrong?**
<!-- Failure signals - how will you know if the fix doesn't work? -->


**What would suggest the problem is bigger than thought?**
<!-- Signs of deeper issues that would require escalation -->

`,
      feature: `# Validation Thinking

**What signals that this feature works?**
<!-- User behavior or metrics to observe -->


**How will you measure success?**
<!-- Choose: User feedback / Usage metrics / Performance metrics / Error rates / Time saved -->


**What would prove the approach is wrong?**
<!-- Disconfirming evidence that would indicate a pivot is needed -->


**What would make you reconsider the feature?**
<!-- Signals that suggest stopping or major changes -->

`,
      exploration: `# Validation Thinking

**What does "exploration complete" look like?**
<!-- Definition of done - when can you stop exploring? -->


**What decision can you make after this?**
<!-- Choose: Build vs buy / Go vs no-go / Approach A vs B / Invest vs defer -->


**What would invalidate your assumptions?**
<!-- Discovery that would change everything -->


**What would suggest it's not worth continuing?**
<!-- Signs to stop exploring and take a different approach -->

`,
    },
  };

  return templates[section]?.[frameType] || '';
};

export function QuestionnaireDialog({
  open,
  onOpenChange,
  section,
  frameType,
  frame,
  onApply,
}: QuestionnaireDialogProps) {
  const [content, setContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState('');

  // Initialize template when dialog opens
  useEffect(() => {
    if (open && section) {
      setContent(getSectionTemplate(section, frameType));
      setShowPreview(false);
      setGeneratedDraft('');
    }
  }, [open, section, frameType]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setShowPreview(true);

    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 1200));

    const draft = generateDraftFromTemplate(section!, frameType, content);
    setGeneratedDraft(draft);
    setIsGenerating(false);
  };

  const handleApply = () => {
    if (section && generatedDraft) {
      onApply(section, { raw: generatedDraft });
    }
    onOpenChange(false);
  };

  const handleBack = () => {
    setShowPreview(false);
  };

  if (!section) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-violet-500" />
            <div>
              <span>{sectionLabels[section]} Questionnaire</span>
              <span className="block text-sm font-normal text-slate-500">
                {showPreview ? 'Review generated content' : 'Fill out the template below'}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {!showPreview ? (
          // Template Editor View
          <div className="flex-1 flex flex-col min-h-0 py-4">
            <div className="flex items-center gap-2 mb-3 text-sm text-slate-500">
              <FileText className="h-4 w-4" />
              <span>Fill in what you know. Skip sections you're unsure about.</span>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="h-full min-h-[300px] font-mono text-sm resize-none"
                placeholder="Template will load..."
              />
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerate}>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Content
              </Button>
            </div>
          </div>
        ) : (
          // Preview View
          <div className="flex-1 overflow-y-auto py-4">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 text-violet-500 animate-spin mb-4" />
                <p className="text-slate-600">AI is analyzing your input...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-emerald-700 font-medium">
                    <Check className="h-5 w-5" />
                    Content Generated
                  </div>
                  <p className="text-sm text-emerald-600 mt-1">
                    Review and edit the generated content below.
                  </p>
                </div>

                <Textarea
                  value={generatedDraft}
                  onChange={(e) => setGeneratedDraft(e.target.value)}
                  className="min-h-[250px] font-mono text-sm"
                />

                <p className="text-xs text-slate-500">
                  Edit the content above as needed before applying.
                </p>

                <div className="flex items-center justify-between pt-4 border-t">
                  <Button variant="ghost" onClick={handleBack}>
                    ← Back to Edit
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleApply}>
                      <Check className="h-4 w-4 mr-1" />
                      Apply to Section
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Generate draft content from filled template
function generateDraftFromTemplate(
  section: FrameSection,
  frameType: FrameType,
  content: string
): string {
  // Helper to extract content after a heading
  const extractAfter = (pattern: RegExp): string => {
    const match = content.match(pattern);
    if (match && match[1]) {
      return match[1]
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/- \[[ x]\]/g, '')
        .trim()
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .join(' ')
        .trim();
    }
    return '';
  };

  switch (section) {
    case 'header':
      if (frameType === 'bug') {
        const what = extractAfter(/\*\*What is broken[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n$)/);
        const expected = extractAfter(/\*\*What should happen[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n$)/);
        const when = extractAfter(/\*\*When does this happen[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n$)/);
        const impact = extractAfter(/\*\*Impact Level[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n|\n$)/);
        return [
          what ? `When ${when || 'triggered'}, ${what}.` : '',
          expected ? `Expected: ${expected}.` : '',
          impact ? `Impact: ${impact}.` : '',
        ].filter(Boolean).join(' ');
      } else if (frameType === 'feature') {
        const capability = extractAfter(/\*\*What capability[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n$)/);
        const why = extractAfter(/\*\*Why is this needed[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n$)/);
        const value = extractAfter(/\*\*Value[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n|\n$)/);
        return [
          capability || '',
          why ? `This is needed because ${why}.` : '',
          value ? `Value: ${value}.` : '',
        ].filter(Boolean).join(' ');
      } else {
        const question = extractAfter(/\*\*What question[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n$)/);
        const why = extractAfter(/\*\*Why does this matter[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n$)/);
        const scope = extractAfter(/\*\*Scope[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n|\n$)/);
        return [
          question || '',
          why ? `This matters because ${why}.` : '',
          scope ? `Scope: ${scope}.` : '',
        ].filter(Boolean).join(' ');
      }

    case 'user':
      const who = extractAfter(/\*\*Who (?:encounters|will use|benefits)[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n$)/);
      const context = extractAfter(/\*\*What (?:are they trying|is their current|decision)[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n$)/);
      const pain = extractAfter(/\*\*(?:Main pain|How does this improve|What's at risk)[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n|\n$)/);

      let journey = '';
      if (frameType === 'bug') {
        const discovery = extractAfter(/\*\*How do they discover[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n$)/);
        const workaround = extractAfter(/\*\*Is there a workaround[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n$)/);
        journey = [
          `1. User is ${context || 'working'}`,
          discovery ? `2. ${discovery}` : '2. Problem is encountered',
          workaround ? `3. Workaround: ${workaround}` : '3. User is blocked',
          pain ? `4. Impact: ${pain}` : '',
        ].filter(Boolean).join('\n');
      } else if (frameType === 'feature') {
        const limitation = extractAfter(/\*\*What can't they do[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n$)/);
        const frequency = extractAfter(/\*\*How often[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n$)/);
        journey = [
          context ? `1. Currently: ${context}` : '1. Current workflow',
          limitation ? `2. Cannot: ${limitation}` : '2. Limitation exists',
          frequency ? `3. Frequency: ${frequency}` : '',
          pain ? `4. Improvement: ${pain}` : '',
        ].filter(Boolean).join('\n');
      } else {
        const current = extractAfter(/\*\*What do they know[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n$)/);
        journey = [
          who ? `1. ${who} needs answer` : '1. Stakeholder needs answer',
          context ? `2. Decision: ${context}` : '2. Decision pending',
          current ? `3. Current belief: ${current}` : '',
          pain ? `4. Risk: ${pain}` : '',
        ].filter(Boolean).join('\n');
      }

      return `User: ${who || '[User role]'}

Context: ${context || '[Context]'}

Journey:
${journey}

Pain Points:
• ${pain || '[Pain point]'}`;

    case 'engineering':
      let principles = '';
      let nonGoals = '';

      if (frameType === 'bug') {
        const invariant = extractAfter(/\*\*What behavior must ALWAYS[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n$)/);
        const outOfScope = extractAfter(/\*\*What is explicitly OUT[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n$)/);
        const risks = extractAfter(/\*\*What risks[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n|\n$)/);
        principles = [
          invariant ? `1. ${invariant}` : '',
        ].filter(Boolean).join('\n');
        nonGoals = [
          outOfScope ? `• ${outOfScope}` : '',
          risks ? `• Risk to monitor: ${risks}` : '',
        ].filter(Boolean).join('\n');
      } else if (frameType === 'feature') {
        const principle = extractAfter(/\*\*Most important design principle[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n$)/);
        const tradeoff = extractAfter(/\*\*Trade-off[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n$)/);
        const notBuilding = extractAfter(/\*\*What are you NOT building[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n$)/);
        principles = [
          principle ? `1. ${principle}` : '',
          tradeoff ? `2. Trade-off: ${tradeoff}` : '',
        ].filter(Boolean).join('\n');
        nonGoals = notBuilding ? `• ${notBuilding}` : '';
      } else {
        const constraints = extractAfter(/\*\*Constraints guiding[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n$)/);
        const deliverable = extractAfter(/\*\*Expected deliverable[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n$)/);
        const timeline = extractAfter(/\*\*Time budget[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n|\n$)/);
        const excluded = extractAfter(/\*\*Approaches explicitly excluded[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n$)/);
        principles = [
          constraints ? `1. Constraint: ${constraints}` : '',
          deliverable ? `2. Deliverable: ${deliverable}` : '',
          timeline ? `3. Timeline: ${timeline}` : '',
        ].filter(Boolean).join('\n');
        nonGoals = excluded ? `• Excluded: ${excluded}` : '';
      }

      return `Principles:
${principles || '1. [Principle]'}

Non-goals:
${nonGoals || '• [Non-goal]'}`;

    case 'validation':
      let success = '';
      let disconfirm = '';

      if (frameType === 'bug') {
        const verify = extractAfter(/\*\*How will you verify[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n$)/);
        const regression = extractAfter(/\*\*How will you prevent regression[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n$)/);
        const wrong = extractAfter(/\*\*What would indicate the fix is wrong[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n$)/);
        const bigger = extractAfter(/\*\*What would suggest the problem is bigger[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n|\n$)/);
        success = [
          verify ? `• ${verify}` : '',
          regression ? `• Regression prevention: ${regression}` : '',
        ].filter(Boolean).join('\n');
        disconfirm = [
          wrong ? `• ${wrong}` : '',
          bigger ? `• Bigger problem signal: ${bigger}` : '',
        ].filter(Boolean).join('\n');
      } else if (frameType === 'feature') {
        const signals = extractAfter(/\*\*What signals that this feature works[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n$)/);
        const measure = extractAfter(/\*\*How will you measure success[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n$)/);
        const wrong = extractAfter(/\*\*What would prove the approach is wrong[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n$)/);
        const reconsider = extractAfter(/\*\*What would make you reconsider[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n|\n$)/);
        success = [
          signals ? `• ${signals}` : '',
          measure ? `• Measured by: ${measure}` : '',
        ].filter(Boolean).join('\n');
        disconfirm = [
          wrong ? `• ${wrong}` : '',
          reconsider ? `• Reconsider if: ${reconsider}` : '',
        ].filter(Boolean).join('\n');
      } else {
        const complete = extractAfter(/\*\*What does "exploration complete" look like[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n$)/);
        const decision = extractAfter(/\*\*What decision can you make[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n$)/);
        const invalidate = extractAfter(/\*\*What would invalidate[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n$)/);
        const notWorth = extractAfter(/\*\*What would suggest it's not worth[^*]*\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n|\n$)/);
        success = [
          complete ? `• ${complete}` : '',
          decision ? `• Enables decision: ${decision}` : '',
        ].filter(Boolean).join('\n');
        disconfirm = [
          invalidate ? `• ${invalidate}` : '',
          notWorth ? `• Stop if: ${notWorth}` : '',
        ].filter(Boolean).join('\n');
      }

      return `Success Signals:
${success || '• [Success signal]'}

Disconfirming Evidence:
${disconfirm || '• [Disconfirming evidence]'}`;

    default:
      return '';
  }
}

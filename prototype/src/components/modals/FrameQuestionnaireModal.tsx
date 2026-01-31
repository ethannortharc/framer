'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Check,
  RefreshCw,
  ClipboardList,
  Bug,
  Rocket,
  Compass,
  FileText,
} from 'lucide-react';
import { FrameType, Frame } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface FrameQuestionnaireModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frameType: FrameType | null;
  onApply: (data: Partial<Frame>) => void;
}

const frameTypeInfo = {
  bug: { icon: Bug, color: 'text-rose-600', bgColor: 'bg-rose-50', label: 'Bug Fix' },
  feature: { icon: Rocket, color: 'text-emerald-600', bgColor: 'bg-emerald-50', label: 'Feature' },
  exploration: { icon: Compass, color: 'text-blue-600', bgColor: 'bg-blue-50', label: 'Exploration' },
};

// Markdown templates for each frame type
const getTemplate = (frameType: FrameType): string => {
  const templates: Record<FrameType, string> = {
    bug: `# Bug Fix Frame

## Problem Statement
**What is broken?**
<!-- Describe the symptom or error you observed -->


**What should happen instead?**
<!-- Describe the expected behavior -->


**Impact Level:**
<!-- Choose one: Critical / High / Medium / Low -->


---

## User Perspective
**Who encounters this bug?**
<!-- Role or persona, e.g., "Network Administrator" -->


**What are they trying to do?**
<!-- Their task or goal when the bug occurs -->


**Main pain point:**
<!-- The biggest frustration or impact -->


---

## Engineering Framing
**What must ALWAYS work after the fix?**
<!-- The core invariant or guarantee -->


**What is OUT of scope?**
<!-- What you explicitly won't address -->


---

## Validation Thinking
**How will you verify the fix?**
<!-- Test criteria or observable behavior -->


**What would indicate the fix is wrong?**
<!-- Failure signals to watch for -->

`,
    feature: `# Feature Development Frame

## Problem Statement
**What capability is missing?**
<!-- What should users be able to do that they can't today? -->


**Why is this needed now?**
<!-- What triggered this need? -->


**Value provided:**
<!-- Choose one or more: Enables new use case / Improves efficiency / Reduces errors / Better UX / Technical improvement -->


---

## User Perspective
**Who will use this feature?**
<!-- Primary user role -->


**Current workflow:**
<!-- How do they work today without this feature? -->


**How does this improve their work?**
<!-- The benefit they will experience -->


---

## Engineering Framing
**Most important design principle:**
<!-- The core constraint or guideline -->


**Trade-off you're willing to make:**
<!-- Choose one: Simplicity over features / Performance over flexibility / Correctness over speed / UX over engineering elegance -->


**What are you NOT building?**
<!-- Explicit exclusions from scope -->


---

## Validation Thinking
**Success signals:**
<!-- User behavior or metrics that indicate success -->


**What would prove this approach is wrong?**
<!-- Disconfirming evidence to watch for -->

`,
    exploration: `# Exploration Frame

## Problem Statement
**What question are you trying to answer?**
<!-- The key uncertainty to resolve -->


**Why does this matter now?**
<!-- What decisions depend on this exploration? -->


**Scope:**
<!-- Choose one: Narrow (specific technical question) / Medium (design alternatives) / Broad (strategic direction) -->


---

## User Perspective
**Who benefits from this exploration?**
<!-- Stakeholder or decision maker -->


**What decision will this inform?**
<!-- The choice to be made with findings -->


**Current understanding/beliefs:**
<!-- What do they know or assume today? -->


---

## Engineering Framing
**Constraints guiding exploration:**
<!-- Boundaries to stay within -->


**Expected deliverable:**
<!-- Choose one: Recommendation document / Proof of concept / Technical analysis / Decision matrix / Go/no-go assessment -->


**Time budget:**
<!-- Choose one: 1-2 days / 1 week / 2 weeks / Ongoing -->


---

## Validation Thinking
**What does "exploration complete" look like?**
<!-- Definition of done for this exploration -->


**What would invalidate your assumptions?**
<!-- Discovery that would change everything -->

`,
  };

  return templates[frameType] || '';
};

export function FrameQuestionnaireModal({
  open,
  onOpenChange,
  frameType,
  onApply,
}: FrameQuestionnaireModalProps) {
  const [content, setContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedData, setGeneratedData] = useState<Partial<Frame> | null>(null);

  const typeInfo = frameType ? frameTypeInfo[frameType] : null;

  // Initialize template when dialog opens
  useEffect(() => {
    if (open && frameType) {
      setContent(getTemplate(frameType));
      setShowPreview(false);
      setGeneratedData(null);
    }
  }, [open, frameType]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setShowPreview(true);

    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 1500));

    const data = parseTemplateContent(frameType!, content);
    setGeneratedData(data);
    setIsGenerating(false);
  };

  const handleApply = () => {
    if (generatedData) {
      onApply(generatedData);
    }
    onOpenChange(false);
  };

  const handleBack = () => {
    setShowPreview(false);
  };

  if (!frameType || !typeInfo) return null;

  const TypeIcon = typeInfo.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', typeInfo.bgColor, typeInfo.color)}>
              <TypeIcon className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg">{typeInfo.label} Frame Questionnaire</span>
              <span className="block text-sm font-normal text-slate-500">
                {showPreview ? 'Review Generated Frame' : 'Fill out the template below'}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {!showPreview ? (
          // Template Editor View
          <div className="flex-1 flex flex-col min-h-0 py-4">
            <div className="flex items-center gap-2 mb-3 text-sm text-slate-500">
              <FileText className="h-4 w-4" />
              <span>Fill in the sections below. You can skip any parts that don't apply.</span>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="h-full min-h-[400px] font-mono text-sm resize-none"
                placeholder="Template will load..."
              />
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerate}>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Frame
              </Button>
            </div>
          </div>
        ) : (
          // Preview View
          <div className="flex-1 overflow-y-auto py-4">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 text-violet-500 animate-spin mb-4" />
                <p className="text-slate-600">AI is analyzing your input and generating the frame...</p>
              </div>
            ) : generatedData ? (
              <div className="space-y-6">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-emerald-700 font-medium">
                    <Check className="h-5 w-5" />
                    Frame Generated Successfully
                  </div>
                  <p className="text-sm text-emerald-600 mt-1">
                    Review the generated content below. You can edit it after creating the frame.
                  </p>
                </div>

                {/* Preview sections */}
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Problem Statement
                    </h4>
                    <p className="text-slate-700 whitespace-pre-wrap">
                      {generatedData.problemStatement || <span className="text-slate-400 italic">Not specified</span>}
                    </p>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      User Perspective
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-slate-500">User:</span> {generatedData.userPerspective?.user || <span className="text-slate-400 italic">Not specified</span>}</p>
                      <p><span className="text-slate-500">Context:</span> {generatedData.userPerspective?.context || <span className="text-slate-400 italic">Not specified</span>}</p>
                      {generatedData.userPerspective?.painPoints && generatedData.userPerspective.painPoints.length > 0 && (
                        <div>
                          <span className="text-slate-500">Pain Points:</span>
                          <ul className="list-disc list-inside ml-2">
                            {generatedData.userPerspective.painPoints.map((p, i) => (
                              <li key={i} className="text-slate-700">{p}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Engineering Framing
                    </h4>
                    <div className="space-y-2 text-sm">
                      {generatedData.engineeringFraming?.principles && generatedData.engineeringFraming.principles.length > 0 && (
                        <div>
                          <span className="text-slate-500">Principles:</span>
                          <ol className="list-decimal list-inside ml-2">
                            {generatedData.engineeringFraming.principles.map((p, i) => (
                              <li key={i} className="text-slate-700">{p}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                      {generatedData.engineeringFraming?.nonGoals && generatedData.engineeringFraming.nonGoals.length > 0 && (
                        <div>
                          <span className="text-slate-500">Non-goals:</span>
                          <ul className="list-disc list-inside ml-2">
                            {generatedData.engineeringFraming.nonGoals.map((p, i) => (
                              <li key={i} className="text-slate-700">{p}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Validation Thinking
                    </h4>
                    <div className="space-y-2 text-sm">
                      {generatedData.validationThinking?.successSignals && generatedData.validationThinking.successSignals.length > 0 && (
                        <div>
                          <span className="text-slate-500">Success Signals:</span>
                          <ul className="list-disc list-inside ml-2">
                            {generatedData.validationThinking.successSignals.map((p, i) => (
                              <li key={i} className="text-slate-700">{p}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {generatedData.validationThinking?.disconfirmingEvidence && generatedData.validationThinking.disconfirmingEvidence.length > 0 && (
                        <div>
                          <span className="text-slate-500">Disconfirming Evidence:</span>
                          <ul className="list-disc list-inside ml-2">
                            {generatedData.validationThinking.disconfirmingEvidence.map((p, i) => (
                              <li key={i} className="text-slate-700">{p}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

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
                      Create Frame
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Parse template content to extract frame data
function parseTemplateContent(frameType: FrameType, content: string): Partial<Frame> {
  // Helper to extract content after a heading/label
  const extractAfter = (pattern: RegExp): string => {
    const match = content.match(pattern);
    if (match && match[1]) {
      // Clean up: remove HTML comments and extra whitespace
      return match[1]
        .replace(/<!--[\s\S]*?-->/g, '')
        .trim()
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .join(' ')
        .trim();
    }
    return '';
  };

  // Extract multi-line content (until next section marker)
  const extractSection = (startMarker: string, endMarkers: string[] = ['---', '##']): string => {
    const startIdx = content.indexOf(startMarker);
    if (startIdx === -1) return '';

    let endIdx = content.length;
    for (const marker of endMarkers) {
      const markerIdx = content.indexOf(marker, startIdx + startMarker.length);
      if (markerIdx !== -1 && markerIdx < endIdx) {
        endIdx = markerIdx;
      }
    }

    const section = content.slice(startIdx + startMarker.length, endIdx);
    return section
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\*\*.*?\*\*/g, '')  // Remove bold markers
      .trim()
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .join('\n')
      .trim();
  };

  let problemStatement = '';
  let user = '';
  let context = '';
  let painPoints: string[] = [];
  let journeySteps: string[] = [];
  let principles: string[] = [];
  let nonGoals: string[] = [];
  let successSignals: string[] = [];
  let disconfirmingEvidence: string[] = [];

  if (frameType === 'bug') {
    // Problem Statement
    const whatBroken = extractAfter(/\*\*What is broken\?\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n---)/);
    const expected = extractAfter(/\*\*What should happen instead\?\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n---)/);
    const impact = extractAfter(/\*\*Impact Level:\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n|\n---)/);
    problemStatement = [whatBroken, expected ? `Expected: ${expected}` : '', impact ? `Impact: ${impact}` : '']
      .filter(Boolean).join('. ').trim();

    // User Perspective
    user = extractAfter(/\*\*Who encounters this bug\?\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n---)/);
    context = extractAfter(/\*\*What are they trying to do\?\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n---)/);
    const pain = extractAfter(/\*\*Main pain point:\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n|\n---)/);
    if (pain) painPoints = [pain];

    // Engineering
    const invariant = extractAfter(/\*\*What must ALWAYS work after the fix\?\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n---)/);
    if (invariant) principles = [invariant];
    const outOfScope = extractAfter(/\*\*What is OUT of scope\?\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n|\n---)/);
    if (outOfScope) nonGoals = [outOfScope];

    // Validation
    const verify = extractAfter(/\*\*How will you verify the fix\?\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n---)/);
    if (verify) successSignals = [verify];
    const wrong = extractAfter(/\*\*What would indicate the fix is wrong\?\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n|\n---|\n$)/);
    if (wrong) disconfirmingEvidence = [wrong];

  } else if (frameType === 'feature') {
    // Problem Statement
    const capability = extractAfter(/\*\*What capability is missing\?\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n---)/);
    const why = extractAfter(/\*\*Why is this needed now\?\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n---)/);
    const value = extractAfter(/\*\*Value provided:\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n|\n---)/);
    problemStatement = [capability, why ? `Needed because: ${why}` : '', value ? `Value: ${value}` : '']
      .filter(Boolean).join('. ').trim();

    // User Perspective
    user = extractAfter(/\*\*Who will use this feature\?\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n---)/);
    context = extractAfter(/\*\*Current workflow:\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n---)/);
    const improvement = extractAfter(/\*\*How does this improve their work\?\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n|\n---)/);
    if (improvement) painPoints = [`Improvement: ${improvement}`];

    // Engineering
    const principle = extractAfter(/\*\*Most important design principle:\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n---)/);
    const tradeoff = extractAfter(/\*\*Trade-off you're willing to make:\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n---)/);
    if (principle) principles.push(principle);
    if (tradeoff) principles.push(`Trade-off: ${tradeoff}`);
    const notBuilding = extractAfter(/\*\*What are you NOT building\?\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n|\n---)/);
    if (notBuilding) nonGoals = [notBuilding];

    // Validation
    const success = extractAfter(/\*\*Success signals:\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n---)/);
    if (success) successSignals = [success];
    const wrong = extractAfter(/\*\*What would prove this approach is wrong\?\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n|\n---|\n$)/);
    if (wrong) disconfirmingEvidence = [wrong];

  } else {
    // exploration
    // Problem Statement
    const question = extractAfter(/\*\*What question are you trying to answer\?\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n---)/);
    const why = extractAfter(/\*\*Why does this matter now\?\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n---)/);
    const scope = extractAfter(/\*\*Scope:\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n|\n---)/);
    problemStatement = [question, why ? `Matters because: ${why}` : '', scope ? `Scope: ${scope}` : '']
      .filter(Boolean).join('. ').trim();

    // User Perspective
    user = extractAfter(/\*\*Who benefits from this exploration\?\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n---)/);
    const decision = extractAfter(/\*\*What decision will this inform\?\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n---)/);
    context = decision ? `Decision to inform: ${decision}` : '';
    const current = extractAfter(/\*\*Current understanding\/beliefs:\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n|\n---)/);
    if (current) painPoints = [`Current belief: ${current}`];

    // Engineering
    const constraints = extractAfter(/\*\*Constraints guiding exploration:\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n---)/);
    const deliverable = extractAfter(/\*\*Expected deliverable:\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n---)/);
    const timeline = extractAfter(/\*\*Time budget:\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n|\n---)/);
    if (constraints) principles.push(`Constraint: ${constraints}`);
    if (deliverable) principles.push(`Deliverable: ${deliverable}`);
    if (timeline) principles.push(`Timeline: ${timeline}`);

    // Validation
    const complete = extractAfter(/\*\*What does "exploration complete" look like\?\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n\*\*|\n---)/);
    if (complete) successSignals = [`Complete when: ${complete}`];
    const invalidate = extractAfter(/\*\*What would invalidate your assumptions\?\*\*\s*\n(?:<!--.*?-->\s*)?\n?([\s\S]*?)(?=\n\n|\n---|\n$)/);
    if (invalidate) disconfirmingEvidence = [invalidate];
  }

  // Generate journey steps from available info
  if (user || context) {
    journeySteps = [
      user ? `User: ${user}` : '',
      context ? `Context: ${context}` : '',
      painPoints.length > 0 ? painPoints[0] : '',
    ].filter(Boolean);
  }

  return {
    problemStatement: problemStatement || undefined,
    userPerspective: {
      user: user || '',
      context: context || '',
      journeySteps,
      painPoints,
    },
    engineeringFraming: {
      principles: principles.filter(Boolean),
      nonGoals: nonGoals.filter(Boolean),
    },
    validationThinking: {
      successSignals: successSignals.filter(Boolean),
      disconfirmingEvidence: disconfirmingEvidence.filter(Boolean),
    },
  };
}

'use client';

import React, { useState } from 'react';
import { Bug, Rocket, Compass, ChevronRight, ChevronDown, Copy, Check, FileText, Users, Wrench, Target, ClipboardList, Layers, Bot, Sparkles } from 'lucide-react';
import { FrameType, FrameSection } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const frameTypeConfig: Record<FrameType, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  lightBg: string;
  title: string;
  description: string;
}> = {
  bug: {
    icon: Bug,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    lightBg: 'bg-rose-50/50',
    title: 'Bug Fix',
    description: 'Track and resolve issues systematically with clear problem definition and verification.',
  },
  feature: {
    icon: Rocket,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    lightBg: 'bg-emerald-50/50',
    title: 'Feature Development',
    description: 'Define new capabilities with user focus, engineering principles, and success metrics.',
  },
  exploration: {
    icon: Compass,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    lightBg: 'bg-blue-50/50',
    title: 'Exploration',
    description: 'Research and investigate with clear questions, constraints, and exit criteria.',
  },
};

const sectionConfig: Record<FrameSection, {
  icon: React.ElementType;
  title: string;
  shortTitle: string;
  description: string;
}> = {
  header: { icon: FileText, title: 'Problem Statement', shortTitle: 'Problem', description: 'Define what problem you\'re solving' },
  user: { icon: Users, title: 'User Perspective', shortTitle: 'User', description: 'Understand who is affected and how' },
  engineering: { icon: Wrench, title: 'Engineering Framing', shortTitle: 'Engineering', description: 'Set principles and constraints' },
  validation: { icon: Target, title: 'Validation Thinking', shortTitle: 'Validation', description: 'Define success and failure signals' },
};

// Frame structure data for each type
const frameStructures: Record<FrameType, {
  sections: {
    section: FrameSection;
    fields: { name: string; required: boolean; hint: string }[];
  }[];
}> = {
  bug: {
    sections: [
      {
        section: 'header',
        fields: [
          { name: 'What is broken', required: true, hint: 'The symptom or error observed' },
          { name: 'What should happen', required: true, hint: 'Expected behavior' },
          { name: 'Impact level', required: false, hint: 'Critical / High / Medium / Low' },
        ],
      },
      {
        section: 'user',
        fields: [
          { name: 'User / Persona', required: true, hint: 'Who encounters this bug' },
          { name: 'Context', required: false, hint: 'Their task when bug occurs' },
          { name: 'User Journey', required: true, hint: 'Steps to reproduce (min 3)' },
          { name: 'Pain Points', required: false, hint: 'Impact on their work' },
        ],
      },
      {
        section: 'engineering',
        fields: [
          { name: 'Invariants', required: true, hint: 'What must ALWAYS work after fix' },
          { name: 'Constraints', required: false, hint: 'Backward compatibility, API changes' },
          { name: 'Non-goals', required: false, hint: 'What you won\'t fix' },
        ],
      },
      {
        section: 'validation',
        fields: [
          { name: 'Success Signals', required: true, hint: 'How to verify the fix works' },
          { name: 'Regression Prevention', required: false, hint: 'Test strategy' },
          { name: 'Disconfirming Evidence', required: false, hint: 'Signs the fix failed' },
        ],
      },
    ],
  },
  feature: {
    sections: [
      {
        section: 'header',
        fields: [
          { name: 'Missing capability', required: true, hint: 'What users should be able to do' },
          { name: 'Why now', required: false, hint: 'Business trigger or context' },
          { name: 'Value provided', required: true, hint: 'New use case / Efficiency / UX' },
        ],
      },
      {
        section: 'user',
        fields: [
          { name: 'User / Persona', required: true, hint: 'Primary user role' },
          { name: 'Current Workflow', required: false, hint: 'How they work today' },
          { name: 'User Journey', required: true, hint: 'Expected new workflow (min 3 steps)' },
          { name: 'Benefits', required: false, hint: 'How this improves their work' },
        ],
      },
      {
        section: 'engineering',
        fields: [
          { name: 'Design Principle', required: true, hint: 'Core constraint or guideline' },
          { name: 'Trade-offs', required: false, hint: 'Simplicity vs features, etc.' },
          { name: 'Non-goals', required: true, hint: 'What you\'re NOT building' },
        ],
      },
      {
        section: 'validation',
        fields: [
          { name: 'Success Signals', required: true, hint: 'User behavior or metrics' },
          { name: 'Measurement', required: false, hint: 'How to measure success' },
          { name: 'Disconfirming Evidence', required: false, hint: 'Signs approach is wrong' },
        ],
      },
    ],
  },
  exploration: {
    sections: [
      {
        section: 'header',
        fields: [
          { name: 'Question to answer', required: true, hint: 'Key uncertainty to resolve' },
          { name: 'Why this matters', required: false, hint: 'Decisions that depend on this' },
          { name: 'Scope', required: true, hint: 'Narrow / Medium / Broad' },
        ],
      },
      {
        section: 'user',
        fields: [
          { name: 'Beneficiary', required: true, hint: 'Who needs this answer' },
          { name: 'Decision to inform', required: true, hint: 'The choice to be made' },
          { name: 'Current beliefs', required: false, hint: 'What they assume today' },
          { name: 'Risk without exploration', required: false, hint: 'What could go wrong' },
        ],
      },
      {
        section: 'engineering',
        fields: [
          { name: 'Constraints', required: true, hint: 'Boundaries to stay within' },
          { name: 'Excluded approaches', required: false, hint: 'What you\'re not considering' },
          { name: 'Deliverable', required: true, hint: 'Doc / POC / Analysis / Matrix' },
          { name: 'Time budget', required: false, hint: '1-2 days / 1 week / 2 weeks' },
        ],
      },
      {
        section: 'validation',
        fields: [
          { name: 'Completion criteria', required: true, hint: 'When exploration is done' },
          { name: 'Decision enabled', required: false, hint: 'Build vs buy, Go vs no-go' },
          { name: 'Invalidating discovery', required: false, hint: 'What would change everything' },
        ],
      },
    ],
  },
};

// Frame questionnaire templates
const frameQuestionnaireTemplates: Record<FrameType, string> = {
  bug: `# Bug Fix Frame Questionnaire

## Problem Statement
**What is broken?**
<!-- Describe the symptom or error you observed -->

**What should happen instead?**
<!-- Describe the expected behavior -->

**Impact Level:** Critical / High / Medium / Low

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
  feature: `# Feature Development Frame Questionnaire

## Problem Statement
**What capability is missing?**
<!-- What should users be able to do that they can't today? -->

**Why is this needed now?**
<!-- What triggered this need? -->

**Value provided:** Enables new use case / Improves efficiency / Reduces errors / Better UX

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
Simplicity over features / Performance over flexibility / Correctness over speed / UX over elegance

**What are you NOT building?**
<!-- Explicit exclusions from scope -->

---

## Validation Thinking
**Success signals:**
<!-- User behavior or metrics that indicate success -->

**What would prove this approach is wrong?**
<!-- Disconfirming evidence to watch for -->
`,
  exploration: `# Exploration Frame Questionnaire

## Problem Statement
**What question are you trying to answer?**
<!-- The key uncertainty to resolve -->

**Why does this matter now?**
<!-- What decisions depend on this exploration? -->

**Scope:** Narrow (specific technical) / Medium (design alternatives) / Broad (strategic)

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
Recommendation doc / Proof of concept / Technical analysis / Decision matrix

**Time budget:** 1-2 days / 1 week / 2 weeks / Ongoing

---

## Validation Thinking
**What does "exploration complete" look like?**
<!-- Definition of done for this exploration -->

**What would invalidate your assumptions?**
<!-- Discovery that would change everything -->
`,
};

// Section questionnaire templates
const sectionQuestionnaireTemplates: Record<FrameType, Record<FrameSection, string>> = {
  bug: {
    header: `**What is broken or not working?**
<!-- Describe the symptom or error you observed -->

**What should happen instead?**
<!-- Describe the expected behavior -->

**When does this happen?**
<!-- Under what conditions or triggers -->

**Impact Level:** Critical / High / Medium / Low`,
    user: `**Who encounters this bug?**
<!-- Role or persona, e.g., "Network Administrator" -->

**What are they trying to do when this happens?**
<!-- Their task or goal when the bug occurs -->

**How do they discover the problem?**
<!-- What makes them realize something is wrong? -->

**Is there a workaround?**
No workaround / Manual workaround / Alternative approach exists

**Main pain point:**
<!-- The biggest frustration or impact on their work -->`,
    engineering: `**What behavior must ALWAYS hold after the fix?**
<!-- The core invariant or guarantee - this defines correctness -->

**Constraints on the solution:**
- [ ] Must be backward compatible
- [ ] Cannot change API
- [ ] Performance sensitive
- [ ] Security critical

**What is explicitly OUT of scope?**
<!-- What you won't fix as part of this work -->

**What risks does the fix introduce?**
<!-- Potential side effects or regressions to watch for -->`,
    validation: `**How will you verify the fix works?**
<!-- Observable behavior or specific test -->

**How will you prevent regression?**
Automated test / Manual test checklist / Integration test / Monitoring

**What would indicate the fix is wrong?**
<!-- Failure signals - how will you know if the fix doesn't work? -->

**What would suggest the problem is bigger than thought?**
<!-- Signs of deeper issues that would require escalation -->`,
  },
  feature: {
    header: `**What capability is missing?**
<!-- What should users be able to do that they can't today? -->

**Why is this needed now?**
<!-- What triggered this need? Business context? -->

**Value this provides:**
Enables new use case / Improves efficiency / Reduces errors / Better UX`,
    user: `**Who will use this feature?**
<!-- Primary user role -->

**What is their current workflow?**
<!-- How do they work today without this feature? -->

**What can't they do today?**
<!-- The gap this feature fills -->

**How often would they use this?**
Daily / Weekly / Monthly / Occasionally

**How does this improve their work?**
<!-- The concrete benefit they get -->`,
    engineering: `**Most important design principle:**
<!-- The one thing that must not be compromised -->

**Trade-off you're willing to make:**
Simplicity over features / Performance over flexibility / Correctness over speed / UX over elegance

**What are you NOT building?**
<!-- Explicit exclusions - features for later, out of scope -->

**Technical constraints:**
- [ ] Must use existing infrastructure
- [ ] New database schema OK
- [ ] Can add dependencies
- [ ] Must be backwards compatible`,
    validation: `**What signals that this feature works?**
<!-- User behavior or metrics to observe -->

**How will you measure success?**
User feedback / Usage metrics / Performance metrics / Error rates / Time saved

**What would prove the approach is wrong?**
<!-- Disconfirming evidence that would indicate a pivot is needed -->

**What would make you reconsider the feature?**
<!-- Signals that suggest stopping or major changes -->`,
  },
  exploration: {
    header: `**What question are you trying to answer?**
<!-- The key uncertainty to resolve -->

**Why does this matter now?**
<!-- What decisions depend on this? -->

**Scope of exploration:**
Narrow (specific technical) / Medium (design alternatives) / Broad (strategic)`,
    user: `**Who benefits from this exploration?**
<!-- Stakeholder or decision maker who needs the answer -->

**What decision will this inform?**
<!-- The specific choice to be made with findings -->

**What do they know or believe today?**
<!-- Current understanding or assumptions -->

**What's at risk without this exploration?**
Wrong technical choice / Wasted investment / Missed opportunity`,
    engineering: `**Constraints guiding the exploration:**
<!-- Boundaries you must stay within -->

**Approaches explicitly excluded:**
<!-- What you're not considering and why -->

**Expected deliverable:**
Recommendation doc / Proof of concept / Technical analysis / Decision matrix

**Time budget:**
1-2 days / 1 week / 2 weeks / Ongoing`,
    validation: `**What does "exploration complete" look like?**
<!-- Definition of done - when can you stop exploring? -->

**What decision can you make after this?**
Build vs buy / Go vs no-go / Approach A vs B / Invest vs defer

**What would invalidate your assumptions?**
<!-- Discovery that would change everything -->

**What would suggest it's not worth continuing?**
<!-- Signs to stop exploring and take a different approach -->`,
  },
};

// AI Evaluation Prompts for each frame type
const aiEvaluationPrompts: Record<FrameType, {
  systemPrompt: string;
  scoringCriteria: { name: string; weight: number; description: string }[];
}> = {
  bug: {
    systemPrompt: `You are an expert software engineering reviewer evaluating a Bug Fix Frame. Your task is to assess how well the frame captures the problem and sets up the developer for success.

## Evaluation Context
A good bug fix frame should:
- Clearly describe what is broken vs expected behavior
- Identify who is affected and the impact
- Define what "fixed" means (invariants)
- Specify how to verify the fix works

## Scoring Guidelines
- Score each section from 0-100
- Provide specific, actionable feedback
- Highlight gaps that could lead to incomplete fixes
- Suggest improvements where needed

## Output Format
Return a JSON object with:
{
  "overallScore": number (0-100),
  "sectionScores": {
    "problemStatement": { "score": number, "feedback": string },
    "userPerspective": { "score": number, "feedback": string },
    "engineeringFraming": { "score": number, "feedback": string },
    "validationThinking": { "score": number, "feedback": string }
  },
  "strengths": string[],
  "improvements": string[],
  "readyForImplementation": boolean,
  "summary": string
}`,
    scoringCriteria: [
      { name: 'Problem Clarity', weight: 25, description: 'Is the bug clearly described with expected vs actual behavior?' },
      { name: 'User Impact', weight: 20, description: 'Is the affected user and impact well understood?' },
      { name: 'Fix Definition', weight: 25, description: 'Are invariants defined? Is scope clear?' },
      { name: 'Verification Plan', weight: 20, description: 'Is there a concrete way to verify the fix?' },
      { name: 'Completeness', weight: 10, description: 'Are all required fields filled with meaningful content?' },
    ],
  },
  feature: {
    systemPrompt: `You are an expert product and engineering reviewer evaluating a Feature Development Frame. Your task is to assess how well the frame defines the feature and prepares for implementation.

## Evaluation Context
A good feature frame should:
- Clearly articulate the missing capability and its value
- Define the target user and their workflow
- Set design principles and explicit non-goals
- Specify measurable success criteria

## Scoring Guidelines
- Score each section from 0-100
- Provide specific, actionable feedback
- Identify scope creep risks or unclear boundaries
- Suggest improvements where needed

## Output Format
Return a JSON object with:
{
  "overallScore": number (0-100),
  "sectionScores": {
    "problemStatement": { "score": number, "feedback": string },
    "userPerspective": { "score": number, "feedback": string },
    "engineeringFraming": { "score": number, "feedback": string },
    "validationThinking": { "score": number, "feedback": string }
  },
  "strengths": string[],
  "improvements": string[],
  "readyForImplementation": boolean,
  "summary": string
}`,
    scoringCriteria: [
      { name: 'Value Proposition', weight: 25, description: 'Is the missing capability and its value clearly articulated?' },
      { name: 'User Understanding', weight: 20, description: 'Is the target user and workflow well defined?' },
      { name: 'Scope Definition', weight: 25, description: 'Are design principles clear? Are non-goals explicit?' },
      { name: 'Success Metrics', weight: 20, description: 'Are success signals measurable and specific?' },
      { name: 'Completeness', weight: 10, description: 'Are all required fields filled with meaningful content?' },
    ],
  },
  exploration: {
    systemPrompt: `You are an expert technical reviewer evaluating an Exploration Frame. Your task is to assess how well the frame sets up a focused investigation with clear exit criteria.

## Evaluation Context
A good exploration frame should:
- Define a clear, answerable question
- Identify who needs the answer and what decision it informs
- Set constraints and time boundaries
- Specify what "done" looks like

## Scoring Guidelines
- Score each section from 0-100
- Provide specific, actionable feedback
- Identify open-ended risks or unclear boundaries
- Suggest improvements where needed

## Output Format
Return a JSON object with:
{
  "overallScore": number (0-100),
  "sectionScores": {
    "problemStatement": { "score": number, "feedback": string },
    "userPerspective": { "score": number, "feedback": string },
    "engineeringFraming": { "score": number, "feedback": string },
    "validationThinking": { "score": number, "feedback": string }
  },
  "strengths": string[],
  "improvements": string[],
  "readyForExploration": boolean,
  "summary": string
}`,
    scoringCriteria: [
      { name: 'Question Clarity', weight: 25, description: 'Is the question specific and answerable?' },
      { name: 'Decision Context', weight: 20, description: 'Is the decision this informs clearly identified?' },
      { name: 'Boundaries', weight: 25, description: 'Are constraints, deliverables, and time budget defined?' },
      { name: 'Exit Criteria', weight: 20, description: 'Is "exploration complete" clearly defined?' },
      { name: 'Completeness', weight: 10, description: 'Are all required fields filled with meaningful content?' },
    ],
  },
};

export function TemplateSpace() {
  const [selectedType, setSelectedType] = useState<FrameType>('bug');
  const [copiedContent, setCopiedContent] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['structure', 'questionnaire']));

  const typeConfig = frameTypeConfig[selectedType];
  const Icon = typeConfig.icon;
  const structure = frameStructures[selectedType];

  const handleCopy = async (content: string, label: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedContent(label);
    setTimeout(() => setCopiedContent(null), 2000);
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const CopyButton = ({ content, label }: { content: string; label: string }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        handleCopy(content, label);
      }}
      className="h-7 gap-1.5 text-slate-500 hover:text-slate-700"
    >
      {copiedContent === label ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-xs text-emerald-600">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          <span className="text-xs">Copy</span>
        </>
      )}
    </Button>
  );

  return (
    <div className="h-full overflow-hidden flex flex-col bg-slate-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-slate-900">Frame Templates</h1>
        <p className="text-sm text-slate-500 mt-1">
          Reference templates, structure guides, and questionnaires for each frame type
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Type selector sidebar */}
        <div className="w-56 flex-shrink-0 bg-white border-r border-slate-200 p-4">
          <div className="mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Frame Type
            </span>
          </div>
          <div className="space-y-1.5">
            {(Object.keys(frameTypeConfig) as FrameType[]).map((type) => {
              const t = frameTypeConfig[type];
              const TypeIcon = t.icon;
              const isActive = selectedType === type;

              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left',
                    isActive
                      ? `${t.bgColor} border ${t.borderColor}`
                      : 'hover:bg-slate-50 border border-transparent'
                  )}
                >
                  <TypeIcon className={cn('h-4.5 w-4.5', isActive ? t.color : 'text-slate-400')} />
                  <span className={cn(
                    'font-medium text-sm',
                    isActive ? 'text-slate-900' : 'text-slate-600'
                  )}>
                    {t.title}
                  </span>
                  {isActive && (
                    <ChevronRight className={cn('h-4 w-4 ml-auto', t.color)} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main content area - All views organized */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6 space-y-6">

            {/* Frame Overview Header */}
            <div className={cn('rounded-xl border-2 p-5', typeConfig.borderColor, typeConfig.bgColor)}>
              <div className="flex items-start gap-4">
                <div className={cn('p-3 rounded-xl bg-white shadow-sm', typeConfig.color)}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-slate-900">{typeConfig.title} Frame Template</h2>
                  <p className="text-slate-600 mt-1">{typeConfig.description}</p>
                </div>
              </div>
            </div>

            {/* Section 1: Frame Structure */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggleSection('structure')}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Layers className={cn('h-5 w-5', typeConfig.color)} />
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-900">Frame Structure</h3>
                    <p className="text-xs text-slate-500">Sections and fields overview</p>
                  </div>
                </div>
                {expandedSections.has('structure') ? (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                )}
              </button>

              {expandedSections.has('structure') && (
                <div className="border-t border-slate-100 p-5">
                  <div className="grid md:grid-cols-2 gap-4">
                    {structure.sections.map((section, idx) => {
                      const secConfig = sectionConfig[section.section];
                      const SecIcon = secConfig.icon;

                      return (
                        <div key={section.section} className={cn('rounded-lg border p-4', typeConfig.lightBg, typeConfig.borderColor)}>
                          <div className="flex items-center gap-2 mb-3">
                            <div className={cn('flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold', typeConfig.bgColor, typeConfig.color)}>
                              {idx + 1}
                            </div>
                            <SecIcon className={cn('h-4 w-4', typeConfig.color)} />
                            <span className="font-medium text-slate-800 text-sm">{secConfig.title}</span>
                          </div>
                          <div className="space-y-1.5">
                            {section.fields.map((field, fieldIdx) => (
                              <div key={fieldIdx} className="flex items-center gap-2 text-xs">
                                <div className={cn(
                                  'w-1.5 h-1.5 rounded-full flex-shrink-0',
                                  field.required ? 'bg-violet-500' : 'bg-slate-300'
                                )} />
                                <span className={cn('text-slate-700', field.required && 'font-medium')}>
                                  {field.name}
                                </span>
                                {field.required && (
                                  <span className="text-[9px] text-violet-600 bg-violet-100 px-1 rounded">req</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Full Frame Questionnaire */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggleSection('questionnaire')}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ClipboardList className={cn('h-5 w-5', typeConfig.color)} />
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-900">Full Frame Questionnaire</h3>
                    <p className="text-xs text-slate-500">Complete template for creating a new frame</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CopyButton content={frameQuestionnaireTemplates[selectedType]} label="full-frame" />
                  {expandedSections.has('questionnaire') ? (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  )}
                </div>
              </button>

              {expandedSections.has('questionnaire') && (
                <div className="border-t border-slate-100 p-5">
                  <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed bg-slate-50 p-4 rounded-lg overflow-x-auto max-h-[400px] overflow-y-auto">
                    {frameQuestionnaireTemplates[selectedType]}
                  </pre>
                </div>
              )}
            </div>

            {/* Section 3: Section-by-Section Questionnaires */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggleSection('sections')}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className={cn('h-5 w-5', typeConfig.color)} />
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-900">Section Questionnaires</h3>
                    <p className="text-xs text-slate-500">Individual templates for each section</p>
                  </div>
                </div>
                {expandedSections.has('sections') ? (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                )}
              </button>

              {expandedSections.has('sections') && (
                <div className="border-t border-slate-100">
                  {(['header', 'user', 'engineering', 'validation'] as FrameSection[]).map((section, idx) => {
                    const secConfig = sectionConfig[section];
                    const SecIcon = secConfig.icon;
                    const isExpanded = expandedSections.has(`section-${section}`);

                    return (
                      <div key={section} className={cn('border-b border-slate-100 last:border-b-0')}>
                        <button
                          onClick={() => toggleSection(`section-${section}`)}
                          className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn('flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium', typeConfig.lightBg, typeConfig.color)}>
                              {idx + 1}
                            </div>
                            <SecIcon className="h-4 w-4 text-slate-500" />
                            <span className="font-medium text-slate-700 text-sm">{secConfig.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CopyButton
                              content={sectionQuestionnaireTemplates[selectedType][section]}
                              label={`section-${section}`}
                            />
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-5 pb-4">
                            <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed bg-slate-50 p-4 rounded-lg overflow-x-auto">
                              {sectionQuestionnaireTemplates[selectedType][section]}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 4: AI Evaluation Prompt */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggleSection('ai-evaluation')}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Bot className="h-5 w-5 text-violet-500" />
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-900">AI Evaluation Prompt</h3>
                    <p className="text-xs text-slate-500">System prompt and scoring criteria for AI review</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CopyButton content={aiEvaluationPrompts[selectedType].systemPrompt} label="ai-prompt" />
                  {expandedSections.has('ai-evaluation') ? (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  )}
                </div>
              </button>

              {expandedSections.has('ai-evaluation') && (
                <div className="border-t border-slate-100">
                  {/* Scoring Criteria */}
                  <div className="p-5 border-b border-slate-100">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      Scoring Criteria
                    </h4>
                    <div className="space-y-2">
                      {aiEvaluationPrompts[selectedType].scoringCriteria.map((criteria, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center justify-center w-10 h-6 rounded bg-violet-100 text-violet-700 text-xs font-bold flex-shrink-0">
                            {criteria.weight}%
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-800 text-sm">{criteria.name}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{criteria.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex">
                        {aiEvaluationPrompts[selectedType].scoringCriteria.map((criteria, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              'h-full',
                              idx === 0 ? 'bg-violet-500' :
                              idx === 1 ? 'bg-blue-500' :
                              idx === 2 ? 'bg-emerald-500' :
                              idx === 3 ? 'bg-amber-500' : 'bg-slate-400'
                            )}
                            style={{ width: `${criteria.weight}%` }}
                          />
                        ))}
                      </div>
                      <span className="flex-shrink-0">100%</span>
                    </div>
                  </div>

                  {/* System Prompt */}
                  <div className="p-5">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <Bot className="h-4 w-4 text-violet-500" />
                      System Prompt
                    </h4>
                    <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed bg-slate-50 p-4 rounded-lg overflow-x-auto max-h-[400px] overflow-y-auto">
                      {aiEvaluationPrompts[selectedType].systemPrompt}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Reference Card */}
            <div className={cn('rounded-xl border p-5', typeConfig.borderColor, typeConfig.lightBg)}>
              <h4 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
                <Target className={cn('h-4 w-4', typeConfig.color)} />
                Quick Reference: Key Questions
              </h4>
              <div className="grid md:grid-cols-2 gap-3">
                {structure.sections.map((section) => {
                  const secConfig = sectionConfig[section.section];
                  const requiredField = section.fields.find(f => f.required);

                  return (
                    <div key={section.section} className="flex items-start gap-2">
                      <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0',
                        section.section === 'header' ? 'bg-slate-500' :
                        section.section === 'user' ? 'bg-blue-500' :
                        section.section === 'engineering' ? 'bg-amber-500' : 'bg-emerald-500'
                      )} />
                      <div>
                        <span className="text-xs font-medium text-slate-700">{secConfig.shortTitle}:</span>
                        <span className="text-xs text-slate-600 ml-1">
                          {requiredField?.name || section.fields[0]?.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
